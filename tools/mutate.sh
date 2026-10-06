#!/bin/bash
# Mutation-check a fix, structurally — you cannot leave the tree mutated.
#
#   tools/mutate.sh <file> <old-string> <new-string> [expected-substring-of-the-failing-test]
#   tools/mutate.sh --only '<title>[<newline><title>…]' <file> <old-string> <new-string> '<expected title or item>'
#   tools/mutate.sh --restore         # put back a file that a KILLED mutation left mutated (also checked on every start)
#
# FULL mode runs the whole suite — the baseline (unless cached) and the mutated tree — which is far longer than any
# harness timeout, so it LAUNCHES ITSELF DETACHED (exit 11) and the verdict is the end of .claude/mutate/mutate.log
# ("MUTATE EXIT <rc>"). A harness kill skips every trap, and the trap is what puts the file back.
# --only mode runs just the named tests (substrings, one per line, the way ?only= matches them) through the same slice
# machinery prove.sh uses (tests/_cdp.py --timeout 600, judged per title by tools/_spotjudge.py), in the FOREGROUND
# (Bash timeout 600000), on the tree that holds <file>, served on its own free port. WIDTH=380 runs it at phone width.
#
# Exit codes. ONLY 0 and 1 are verdicts; everything else means nothing was proven either way.
#   0 CAUGHT · 1 SURVIVED · 2 usage · 3 old string not found · 4 old string ambiguous, or caught by a test you did not
#   expect · 5 the tree was already red · 6 the suite registered too few tests · 7 the mutation changed nothing ·
#   8 TIMED OUT, or the run did not happen · 9 a named title did not run · 10 refused: a ship, a spot-check or another
#   mutation is running (or a killed mutation could not be safely restored) · 11 LAUNCHED (full mode, no verdict yet)
#
# Why this exists: doing it by hand went wrong twice in one session. A run that timed out mid-way
# left the mutation sitting in js/compositor.js, and a browser measurement taken while a mutation
# was live reported the MUTATION's behaviour as if it were the code's. Both are impossible here:
# the restore is on a trap (it runs on success, failure, Ctrl-C or TERM) and a lockfile is held for
# the duration so nothing else reads a mutated tree by accident. A KILL runs no trap — so the lock
# records the backup, and the next run (or --restore) puts the file back before doing anything else.
set -uo pipefail
TOOLS="$(cd "$(dirname "$0")" && pwd -P)"
SELF="$TOOLS/$(basename "$0")"
. "$TOOLS/_shiplock.sh"
usage() { sed -n '3,6p' "$SELF" | sed 's/^#//'; exit 2; }

MODE=full; TITLES=""
case "${1:-}" in
  --only)    [ $# -ge 2 ] || usage; MODE=only; TITLES="$2"; shift 2 ;;
  --restore) MODE=restore; shift ;;
esac
if [ "$MODE" = restore ]; then
  ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
else
  [ $# -ge 3 ] || usage
  FILE="$1"; OLD="$2"; NEW="$3"; EXPECT="${4:-}"
  [ -f "$FILE" ] || { echo "mutate: no such file: $FILE"; exit 2; }
  if [ "$MODE" = only ]; then
    [ -n "$(printf '%s' "$TITLES" | tr -d '[:space:]')" ] || { echo "mutate --only: name at least one test title"; exit 2; }
    [ -n "$EXPECT" ] || { echo "mutate --only: the 4th argument is required — the title (or item) of the test you expect to CATCH it"; exit 2; }
  fi
  ABS="$(cd "$(dirname "$FILE")" && pwd -P)/$(basename "$FILE")"
  ROOT="$(cd "$(dirname "$ABS")" && git rev-parse --show-toplevel 2>/dev/null)"
fi
[ -n "${ROOT:-}" ] || { echo "mutate: not inside a git checkout"; exit 2; }
ROOT="$(cd "$ROOT" && pwd -P)"
cd "$ROOT" || exit 2
[ "$MODE" = restore ] || FILE="${ABS#"$ROOT"/}"
LOCK=".mutation-in-progress"
WIDTH="${WIDTH:-1280}"

# ---- A KILLED MUTATION IS PUT BACK FIRST (6 Oct) --------------------------------------------------------------------
# The trap below restores on every way out EXCEPT a kill — and a kill is exactly what a harness timeout does. The old
# backup lived in mktemp and nothing recorded where, so the tree stayed mutated until someone noticed by hand. Now the
# lock names the pid, the file, the backup and the mutated file's hash: if that pid is gone and the file is still
# exactly what the mutation wrote, put it back; if the file has changed since, refuse rather than guess.
recover_killed() {
  [ -f "$LOCK" ] || return 0
  local mpid mfile mbak msha now msrv mport
  mpid="$(sed -n 's/^pid=//p' "$LOCK" | head -1)"
  mfile="$(sed -n 's/^file=//p' "$LOCK" | head -1)"; mbak="$(sed -n 's/^bak=//p' "$LOCK" | head -1)"; msha="$(sed -n 's/^sha=//p' "$LOCK" | head -1)"
  msrv="$(sed -n 's/^srv=//p' "$LOCK" | head -1)"; mport="$(sed -n 's/^port=//p' "$LOCK" | head -1)"
  if [ -n "$mpid" ] && kill -0 "$mpid" 2>/dev/null && ps -p "$mpid" -o command= 2>/dev/null | grep -q 'mutate\.sh'; then
    echo "❌ another mutation is running on this tree (pid $mpid): $(head -1 "$LOCK")"; exit 10
  fi
  # the killed run's server outlives it (a kill runs no trap) — stop it, but only if that pid is still THAT server
  if [ -n "$msrv" ] && [ -n "$mport" ] && ps -p "$msrv" -o command= 2>/dev/null | grep -qE "[Pp]ython.* - $mport\$"; then
    kill "$msrv" 2>/dev/null && echo "→ stopped the killed mutation's server (pid $msrv, port $mport)"
  fi
  [ -n "$mpid" ] && rm -f ".claude/mutate/out.$mpid" ".claude/mutate/titles.$mpid"
  if [ -z "$mpid" ] || [ -z "$mfile" ] || [ -z "$mbak" ]; then
    echo "❌ $LOCK exists but names no pid/backup (written by the old mutate.sh?): $(head -1 "$LOCK")"
    echo "   If no mutate.sh is running, check the file it names with  git diff  for a leftover mutation, then rm $LOCK."
    exit 10
  fi
  if [ ! -f "$mbak" ]; then echo "❌ a KILLED mutation (pid $mpid) left $LOCK but its backup $mbak is gone — check  git diff -- $mfile  by hand, then rm $LOCK."; exit 10; fi
  if cmp -s "$mfile" "$mbak"; then rm -f "$mbak" "$LOCK"; echo "→ a KILLED mutation (pid $mpid) had left its lock; $mfile was already back to normal — lock cleared."; return 0; fi
  now="$(shasum "$mfile" 2>/dev/null | cut -d' ' -f1)"
  if [ -n "$msha" ] && [ "$now" = "$msha" ]; then
    cp "$mbak" "$mfile" && rm -f "$mbak" "$LOCK"
    echo "⚠️  a KILLED mutation (pid $mpid) had left $mfile MUTATED — restored it from its backup."
    return 0
  fi
  echo "❌ a KILLED mutation (pid $mpid) left $LOCK, and $mfile is neither the original nor the mutation any more —"
  echo "   someone edited it since. Not guessing: compare it with the original at $mbak, keep what you meant, then rm $LOCK."
  exit 10
}
recover_killed
if [ "$MODE" = restore ]; then echo "✅ nothing mutated is left behind in $ROOT"; exit 0; fi

# ---- ONE SUITE AT A TIME (6 Oct, RULES-AUDIT B4) --------------------------------------------------------------------
# A mutation run beside a ship or a spot-check is two headless suites on an 8 GB Mac — the contention that cost ships on
# 20 and 26 Sep — and a mutation in the tree a ship is testing would be swept into the release. The ship runs in the MAIN
# checkout, so its lock is looked for there (git's common dir) as well as here.
COMMON="$(git rev-parse --git-common-dir 2>/dev/null)"; COMMON="$(cd "$COMMON" 2>/dev/null && pwd -P)"
for d in "$ROOT" "$(dirname "${COMMON:-$ROOT/.git}")"; do
  if [ -f "$d/.ship-in-progress" ]; then
    _st="$(cd "$d" && ship_lock_state .ship-in-progress)"
    case "$_st" in
      dead*) echo "❌ $d has a KILLED ship's lock ($_st) — that release never landed; re-ship it first, then mutation-check" ;;
      *)     echo "❌ a ship is in progress in $d ($_st) — not mutating beside it; wait for it to land" ;;
    esac
    exit 10
  fi
  if [ -f "$d/.spotcheck-in-progress" ]; then echo "❌ a spot-check is running in $d — not starting a second suite beside it"; exit 10; fi
done

# ---- THE STRING GATES, ASKED FIRST (they cost nothing; a full baseline used to run before the not-found check) ------
# AND IT MUST NOT BE AMBIGUOUS (22 Aug). The not-found guard has caught a lot. This is its blind twin: a string that IS
# found, more than once, and the replace lands on the WRONG one. It cost two full suite runs and very nearly a false
# conclusion that a brand-new test was dead — `<option value="30">30 fps</option>` appears in BOTH the new-project
# dialog and the export dialog, the mutation hit the first, the thing under test was never touched, and the green run
# looked exactly like a hole in the test. A green run after an ambiguous mutation proves nothing, same as after a
# missing one. Refuse both. (Asked again when the mutation is applied, in case the file changed in between.)
string_gates() {
  local hits
  hits="$(python3 - "$FILE" "$OLD" <<'PYC'
import sys
print(open(sys.argv[1], encoding='utf-8').read().count(sys.argv[2]))
PYC
)"
  if [ "${hits:-0}" -gt 1 ]; then
    echo "mutate: the old string appears $hits times in $FILE — the replace would hit the FIRST one, which"
    echo "        may not be the code under test. A green run after that proves nothing."
    echo "        Include a neighbouring line to make it unique."
    exit 4
  fi
  if [ "${hits:-0}" -lt 1 ]; then
    echo "mutate: the old string was not found — the mutation did NOT apply, so a green run here proves nothing"; exit 3
  fi
}
nochange_refusal() {
  echo "mutate: the file is BYTE-IDENTICAL after the replace - the mutation changed nothing, so a green"
  echo "        run proves nothing about the test. Usually old and new are the same text."
  echo "        If either string contains a NUL, a tab or a newline, \$(cat ...) will have mangled it -"
  echo "        pass the strings as literals, or make the edit in python and diff instead."
  exit 7
}
string_gates
[ "$OLD" != "$NEW" ] || nochange_refusal

# --only: the test you expect to catch it must be one of the tests you named, or it could never be the one that does.
resolve_item_title() {   # an ITEM name → the title of the test that declares it (FAIL lines print titles)
  python3 - "$1" <<'PYX'
import re, sys
# Scoped to the ONE line that declares the item. A whole-file search with DOTALL looked right and was
# not: `.*?` simply grew from the first test() in the file until the item matched, so the "title" came
# back thousands of lines long and grep died with "Argument list too long".
want = "item: '" + sys.argv[1] + "'"
for line in open('tests/tests.js', encoding='utf-8'):
    if want in line:
        m = re.search(r"test\(\s*'([^']*)'", line) or re.search(r'test\(\s*"([^"]*)"', line)
        if m: print(m.group(1)); break
PYX
}
if [ "$MODE" = only ]; then
  EXPECT_TITLE="$(resolve_item_title "$EXPECT")"
  if ! printf '%s\n' "$TITLES" | python3 -c '
import sys
exp, et = sys.argv[1], sys.argv[2]
ts = [t for t in sys.stdin.read().split("\n") if t.strip()]
ok = any(exp in t or t in exp or (et and (et in t or t in et)) for t in ts)
sys.exit(0 if ok else 1)' "$EXPECT" "$EXPECT_TITLE"; then
    echo "mutate --only: the test you expect to catch it (\"$EXPECT\") is not among the titles you named — it cannot be"
    echo "               the one that catches it. Name it in --only too."
    exit 2
  fi
fi

# ---- FULL MODE LAUNCHES ITSELF DETACHED (6 Oct, RULES-AUDIT B4) ------------------------------------------------------
# The same way ship.sh is launched (tools/ship-bg.sh): nohup + disown, a log, and an exit code that is never 0.
if [ "$MODE" = full ] && [ -z "${FM_MUTATE_DETACHED:-}" ]; then
  mkdir -p .claude/mutate
  : > .claude/mutate/mutate.log     # emptied NOW, so a previous run's verdict can never be read as this one's
  FM_MUTATE_DETACHED=1 nohup bash -c '"$0" "$@" > .claude/mutate/mutate.log 2>&1; echo "MUTATE EXIT $?" >> .claude/mutate/mutate.log' \
    "$SELF" "$FILE" "$OLD" "$NEW" "$EXPECT" </dev/null >/dev/null 2>&1 & disown
  mpid=""
  for _ in $(seq 1 40); do
    mpid="$(sed -n 's/^pid=//p' "$LOCK" 2>/dev/null | head -1)"
    [ -n "$mpid" ] && kill -0 "$mpid" 2>/dev/null && break
    mpid=""; grep -q '^MUTATE EXIT' .claude/mutate/mutate.log 2>/dev/null && break; sleep 0.25
  done
  if [ -z "$mpid" ] && grep -q '^MUTATE EXIT' .claude/mutate/mutate.log 2>/dev/null; then
    echo "❌ the mutation run ended straight away — nothing proven:"; tail -8 .claude/mutate/mutate.log | sed 's/^/   /'; exit 10
  fi
  echo "LAUNCHED - NO verdict yet; the verdict is the last lines of .claude/mutate/mutate.log (MUTATE EXIT 0 = CAUGHT, 1 = SURVIVED, anything else proves nothing)"
  echo "   pid ${mpid:-?}. Watch it: until grep -q '^MUTATE EXIT' .claude/mutate/mutate.log; do sleep 30; done; tail -15 .claude/mutate/mutate.log"
  exit 11
fi

# ---- THE RESTORE MUST NOT EAT SOMEBODY ELSE'S WORK ---------------------------------------------
# Added 1 Sep, after it did exactly that. `restore` was a blind `cp "$BAK" "$FILE"`, so ANY edit made
# to the target while this script held the backup was silently discarded on exit — and a mutation run
# takes a whole suite pass, which is plenty of time to keep working in the same file. It happened while two
# plate-scaling fixes sat in js/compositor.js: the trap would have thrown both away with no message,
# and the only trace would have been the fixes "not working" later.
# The lockfile warned about BROWSER checks and said nothing about EDITS, which is the same shape as
# every other bug this repo has found lately — a guard whose stated scope was narrower than its reach.
# So: remember what this script last WROTE, and if the file on disk is not that, the difference came
# from somewhere else. Rescue it beside the file and say so loudly rather than restoring over it.
mkdir -p .claude/mutate
BAK="$ROOT/.claude/mutate/bak.$$"; OUTF="$ROOT/.claude/mutate/out.$$"; TF="$ROOT/.claude/mutate/titles.$$"
cp "$FILE" "$BAK"
EXPECTED_SHA="$(shasum "$FILE" | cut -d' ' -f1)"
SRV=""
restore() {
  local now; now="$(shasum "$FILE" 2>/dev/null | cut -d' ' -f1)"
  if [ -n "$now" ] && [ "$now" != "$EXPECTED_SHA" ]; then
    cp "$FILE" "$FILE.rescued"
    echo ""
    echo "⚠️  $FILE CHANGED WHILE THIS MUTATION HELD IT — those edits are NOT the mutation."
    echo "   Saved them to $FILE.rescued before restoring. Diff it against $FILE and re-apply"
    echo "   anything you meant to keep; then delete the .rescued copy."
  fi
  cp "$BAK" "$FILE"; rm -f "$BAK" "$LOCK" "$OUTF" "$TF"
  [ -n "$SRV" ] && kill "$SRV" 2>/dev/null
  return 0
}
trap restore EXIT
trap 'exit 130' INT     # a signal ENDS the run (the EXIT trap restores); the old INT/TERM trap restored and carried on
trap 'exit 143' TERM
P=""
write_lock() {   # line 1 for people (tick.sh prints it); the rest is what recover_killed() needs after a KILL
  printf 'MUTATION IN PROGRESS on %s — do not run a browser check OR EDIT THIS FILE now\npid=%s\nfile=%s\nbak=%s\nsha=%s\nsrv=%s\nport=%s\n' \
    "$FILE" "$$" "$FILE" "$BAK" "${1:-}" "$SRV" "$P" > "$LOCK.tmp" && mv -f "$LOCK.tmp" "$LOCK"
}
write_lock ""

# Its OWN server on a free port, serving the tree that holds the file — so a mutation made in a worktree is never
# judged by a suite that loaded some other checkout (port 8777 serves whatever started it). localhost, not 127.0.0.1,
# so the collaboration tests' *.localhost frames keep working.
P="${MUTATE_PORT:-$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')}"   # MUTATE_PORT pins it
( exec "$TOOLS/serve.sh" "$P" "$ROOT" ) >/dev/null 2>&1 & SRV=$!
write_lock ""   # …so a KILL leaves enough behind to stop this server too
for _ in $(seq 1 20); do curl -s -o /dev/null "http://127.0.0.1:$P/tests/run.html" && break; sleep 0.5; done
curl -sf -o /dev/null "http://127.0.0.1:$P/tests/run.html" || { echo "⚠️  could not serve $ROOT on port $P - nothing proven either way"; exit 8; }
URL="http://localhost:$P/tests/run.html"
cdp() { python3 "$TOOLS/../tests/_cdp.py" --url "$1" --width "$WIDTH" --timeout "$2" "${@:3}" > "$OUTF" 2>&1; cat "$OUTF"; }

# ---- A RUN THAT DID NOT FINISH IS NOT A RESULT (6 Oct, RULES-AUDIT B4) ------------------------------------------------
# Checked FIRST, before anything reads FAIL lines: a timed-out run has none, so it used to read as "SURVIVED — the
# assertion is DEAD" (an accusation against a good test) or, on the baseline, as "the suite registered no tests". The cap
# was 1800 s while a full pass had grown to 2697 s, so every full-mode run ended that way and nobody had used it since 8 Sep.
no_verdict() {   # $1 = output, $2 = which run
  if printf '%s' "$1" | grep -q 'did not finish within'; then
    echo "⏱  TIMED OUT - nothing proven either way ($2 ran out of time; $(printf '%s' "$1" | grep -o '"lastTest": "[^"]*"' | head -1))"
    exit 8
  fi
  if ! printf '%s' "$1" | grep -q '"summary": "[^"]*Regression'; then
    echo "⚠️  $2 DID NOT RUN - nothing proven either way: $(printf '%s' "$1" | grep -o '"error": "[^"]*"\|"summary": "[^"]*"' | head -1 | cut -c1-300)"
    exit 8
  fi
}
ran_total() { printf '%s' "$1" | grep -o '"summary": "Regression [0-9]*/[0-9]*' | head -1 | sed 's|.*/||'; }

# ---- THE BASELINE GATE -------------------------------------------------------------------------
# A mutation result is MEANINGLESS unless the suite was green before it. If the test you are checking
# is already failing for its own reason — an anchored regex against text that carries a prefix, a
# container selector that matches nothing — then the run comes back "CAUGHT" and proves exactly
# nothing. That happened three times in one session on queue 366 before anyone checked.
#
# So the tree must be PROVEN GREEN before the mutation is applied. It is cached by a hash of the
# sources, so the cost is one extra suite run per EDIT, not per mutation — and a session that checks
# three mutations against one change pays it once.
# theme-glass.css joined this list on 20 Aug: it is a real stylesheet the app ships, and leaving it out
# meant an edit there did NOT invalidate the cached green baseline — so a mutation could be run against a
# tree whose last proven-green state predated the change being tested. Exactly the hole this gate exists
# to close, one file wide.
SRC_HASH() { cat index.html styles.css theme-glass.css js/*.js tests/tests.js 2>/dev/null | shasum | cut -d' ' -f1; }
if [ "$MODE" = full ]; then
  # THE CAP GROWS WITH THE SUITE, the same rule as ship.sh: 1.6x the last green pass, never below an hour.
  _last=$(cat tools/.suite-seconds 2>/dev/null | tr -dc '0-9'); _last=${_last:-0}
  CAP=$(( _last * 16 / 10 )); [ "$CAP" -lt 3600 ] && CAP=3600
  BASE_HASH="$(SRC_HASH)"
  GREEN_FILE="tools/.mutate-green"
  if [ "$(cat "$GREEN_FILE" 2>/dev/null)" != "$BASE_HASH" ]; then
    echo "→ baseline: proving the suite is green BEFORE mutating (once per edit; cached after; cap ${CAP}s)…"
    BASE_OUT="$(cdp "$URL" "$CAP")"
    no_verdict "$BASE_OUT" "the baseline"
    BASE_FAILS="$(printf '%s' "$BASE_OUT" | grep -o 'FAIL[^"]*' | grep -v 'version on screen' || true)"
    if [ -n "$BASE_FAILS" ]; then
      echo "❌ THE TREE IS ALREADY RED — a mutation check here would prove nothing."
      echo "   Whatever it 'catches' is just this, still failing:"
      printf '%s\n' "$BASE_FAILS" | head -4
      echo "   Fix these first, then mutation-check."
      exit 5
    fi
    # A baseline of ZERO tests is not a baseline. Same hole as ship.sh had, and the more dangerous half:
    # caching an empty run as "proven green" would bless every mutation checked against it afterwards.
    . "$TOOLS/_testfloor.sh"
    test_floor_check "$BASE_OUT" || { echo "   Fix that before mutation-checking anything."; exit 6; }
    printf '%s' "$BASE_HASH" > "$GREEN_FILE"
    echo "   baseline green ✅ (cached — further mutations on this tree skip it)"
  fi
else
  # --only: the NAMED tests must each PASS on the unmutated tree, every one of them must actually RUN, and the cache is
  # keyed on the sources AND the titles (and width) — never tools/.mutate-green, which means "the WHOLE suite was green".
  # No test floor here: a slice is meant to be small.
  printf '%s\n' "$TITLES" | sed '/^[[:space:]]*$/d' > "$TF"
  Q="$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(open(sys.argv[1]).read().rstrip("\n"), safe=""))' "$TF")"
  SLICE_TIMEOUT="${MUTATE_SLICE_TIMEOUT:-600}"
  KEY="$( { SRC_HASH; printf '%s\n%s\n' "$WIDTH" "$TITLES"; } | shasum | cut -d' ' -f1)"
  ONLY_CACHE="$(git rev-parse --git-path fm-mutate-only-green 2>/dev/null)"
  if [ -n "$ONLY_CACHE" ] && grep -qxF "$KEY" "$ONLY_CACHE" 2>/dev/null; then
    echo "→ baseline: these titles were proven green on this exact tree already (cached)"
  else
    echo "→ baseline: the named test(s) must PASS on the unmutated tree, at ${WIDTH}px…"
    sed 's/^/    · /' "$TF" | cut -c1-120
    BASE_OUT="$(cdp "$URL?only=$Q" "$SLICE_TIMEOUT" --names)"
    no_verdict "$BASE_OUT" "the baseline slice"
    V="$(python3 "$TOOLS/_spotjudge.py" "$OUTF" "$TF")"
    if printf '%s\n' "$V" | grep -q '^NORUN'; then
      echo "❌ A NAMED TITLE DID NOT RUN — nothing it says before or after a mutation means anything:"
      printf '%s\n' "$V" | grep '^NORUN' | cut -f2,3 | sed 's/\t/ — /; s/^/   /' | cut -c1-240
      exit 9
    fi
    if printf '%s\n' "$V" | grep -q '^FAIL'; then
      echo "❌ THE TREE IS ALREADY RED — a mutation check here would prove nothing."
      echo "   Whatever it 'catches' is just this, still failing:"
      printf '%s\n' "$V" | grep '^FAIL' | cut -f2,3 | sed 's/\t/ — /; s/^/   /' | head -4 | cut -c1-300
      echo "   Fix these first, then mutation-check."
      exit 5
    fi
    [ -n "$ONLY_CACHE" ] && printf '%s\n' "$KEY" >> "$ONLY_CACHE"
    echo "   baseline green ✅ ($(printf '%s\n' "$V" | grep -c '^PASS') named title(s) ran and passed)"
  fi
fi
# --------------------------------------------------------------------------------------------------

string_gates      # again: the file may have changed during the baseline
python3 - "$FILE" "$OLD" "$NEW" << 'PY' || { echo "mutate: the old string was not found — the mutation did NOT apply, so a green run here proves nothing"; exit 3; }
import sys
p, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p, encoding='utf-8').read()
if old not in s: sys.exit(1)
open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
PY

# ---- AND THE FILE MUST ACTUALLY HAVE CHANGED (24 Aug) ---------------------------------------------
# The two guards above are about the SEARCH string. This one is about the RESULT, and it closes the
# case they both miss: a mutation that was found, was unique, applied cleanly - and changed nothing,
# because old and new were the same text. Then the suite passes for the honest reason that the code is
# untouched, and this script announces "SURVIVED - the assertion is DEAD", which is a false accusation
# against a perfectly good test.
#
# It happened on 24 Aug and the cause is worth naming, because nothing about it looks wrong at the call
# site: js/compositor.js builds a cache key with NUL separators, the strings were passed in as
# "$(cat file)", and COMMAND SUBSTITUTION TRUNCATES AT THE FIRST NUL BYTE. Both arguments were cut down
# to the same harmless prefix, so old == new. The not-found gate was satisfied (the prefix really is
# there), the ambiguity gate was satisfied (it occurs once), and the verdict was still wrong.
# Comparing the file against its own backup catches that and every other silent no-op, whatever caused it.
# (Since 6 Oct old == new is also refused up front, before any suite runs; this stays as the backstop.)
# The mutation is a write this script MADE, so it becomes the new expected content — otherwise the
# rescue above would fire on every run and cry wolf about the mutation itself.
EXPECTED_SHA="$(shasum "$FILE" | cut -d' ' -f1)"
write_lock "$EXPECTED_SHA"
cmp -s "$FILE" "$BAK" && nochange_refusal

if [ "$MODE" = full ]; then
  OUT="$(cdp "$URL" "$CAP")"
  no_verdict "$OUT" "the mutated run"
  [ "$(ran_total "$OUT")" -gt 0 ] 2>/dev/null || { echo "⚠️  the mutated tree registered NO tests — the mutation may have broken the app outright, which is not a test catching it. Nothing proven either way."; exit 8; }
  FAILS="$(printf '%s' "$OUT" | grep -o 'FAIL[^"]*' | grep -v 'version on screen' || true)"
  if [ -z "$FAILS" ]; then
    echo "❌ SURVIVED — the mutation broke the code and every test still passed."
    echo "   The assertion is DEAD: it cannot see the defect it was written for."
    exit 1
  fi
else
  OUT="$(cdp "$URL?only=$Q" "$SLICE_TIMEOUT" --names)"
  no_verdict "$OUT" "the mutated slice"
  V="$(python3 "$TOOLS/_spotjudge.py" "$OUTF" "$TF")"
  if printf '%s\n' "$V" | grep -q '^NORUN'; then
    echo "❌ A NAMED TITLE DID NOT RUN against the mutation — nothing proven either way:"
    printf '%s\n' "$V" | grep '^NORUN' | cut -f2,3 | sed 's/\t/ — /; s/^/   /' | cut -c1-240
    exit 9
  fi
  # A FAIL row here is "FAIL<title> — <why>", the shape the EXPECT check below reads.
  FAILS="$(printf '%s\n' "$V" | awk -F'\t' '$1 == "FAIL" { print "FAIL" $2 " — " $3 }')"
  if [ -z "$FAILS" ]; then
    echo "❌ SURVIVED — the mutation broke the code and every named test ran and still passed."
    echo "   The assertion is DEAD (or the named tests do not cover this code)."
    exit 1
  fi
fi
echo "✅ CAUGHT:"; printf '%s\n' "$FAILS" | head -4 | cut -c1-400
if [ -n "$EXPECT" ] && ! printf '%s' "$FAILS" | grep -qF "$EXPECT"; then
  # A FAIL line prints the test's TITLE, but every other tool here addresses a test by its ITEM name —
  # so passing the item, which is the natural thing to do, could never match and always warned "not the
  # test you expected" after a mutation the test had in fact caught. A warning that fires on success
  # teaches you to ignore warnings, so resolve item -> title and match that too before complaining.
  TITLE="$(resolve_item_title "$EXPECT")"
  if [ -z "$TITLE" ] || ! printf '%s' "$FAILS" | grep -qF "$TITLE"; then
    echo "⚠️  but not by the test you expected (\"$EXPECT\") — check which assertion actually fired."
    exit 4
  fi
fi
exit 0
