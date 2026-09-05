#!/bin/bash
# Ship a release, structurally — every gate is checked here so none can be skipped.
#
#   tools/ship.sh "<commit message>"
#   tools/ship.sh -F <file>          # …or read the message from a file / from - for stdin
#
# Refuses to push unless: the tree is not mid-mutation, the suite is fully green, the version label
# and the newest POLISH-LOG entry agree, and the push actually landed. That last one matters —
# `origin` is an HTTPS URL with no stored credentials and fails with "could not read Username", so
# success is confirmed by comparing HEAD to ssh/main rather than by trusting the push output.
# A red suite was pushed once by running the tests and the commit in the same breath; not possible now.
set -uo pipefail
# ⚠️ THE MESSAGE CAN COME FROM A FILE, AND FOR ANYTHING WITH CODE IN IT, IT SHOULD (25 Aug).
# Backticks inside a double-quoted shell argument are COMMAND SUBSTITUTION, not code quotes. The gate
# below has guarded that since a message containing `void ic.offsetWidth` executed it and committed the
# hole where the explanation should have been.
# ⚠️ **BUT THAT GATE CANNOT FIRE IN THE CASE THAT ACTUALLY HAPPENS, and it took v12.53 to notice.**
# The CALLER's shell performs the substitution BEFORE this script is invoked, so by the time `$1` gets
# here the backticks and the text between them are already gone — there is nothing left to detect. The
# gate only ever catches backticks that survived quoting, e.g. inside single quotes. v12.53 shipped with
# "reasons about , which" in its log: the word `statics` was executed as a command and deleted, the
# terminal said "command not found: statics", and this gate stayed silent because it was structurally
# incapable of speaking. A safeguard that reads like protection and cannot fire is worse than none,
# because it stops you being careful.
# The only real fix is to stop passing prose through a shell argument at all, so: -F <file> (or -F - for
# stdin) reads the message as bytes and nothing interprets it.
FROM_FILE=0
if [ "${1:-}" = "-F" ]; then
  FROM_FILE=1
  [ -n "${2:-}" ] || { echo "ship: -F needs a file (or - for stdin)"; exit 2; }
  if [ "$2" = "-" ]; then MSG="$(cat)"; else
    [ -f "$2" ] || { echo "ship: no such message file: $2"; exit 2; }
    MSG="$(cat "$2")"
  fi
else
  MSG="${1:-}"
fi
[ -n "$MSG" ] || { echo "ship: needs a commit message"; exit 2; }
# …and the gate applies ONLY to the argument form. On the -F path nothing interprets the bytes, so a
# backtick there is an ordinary code quote and refusing it would break the very route that is safe.
if [ "$FROM_FILE" = "0" ]; then
  case "$MSG" in
    *'`'*) echo "❌ the commit message contains a backtick, which the shell will execute and delete."
           echo "   Pass the message with: tools/ship.sh -F <file>   (nothing interprets it then)"; exit 2;;
  esac
fi
[ -f .mutation-in-progress ] && { echo "❌ a mutation check is still in progress — refusing to ship a mutated tree"; exit 1; }

# ─── NO NUL BYTES IN SOURCE (28 Aug) ────────────────────────────────────────────────────────────────
# A NUL byte in a text file makes grep treat the WHOLE FILE as binary and print NOTHING for it — not an
# error, not "binary file matches", just silence. `grep -n "function program" js/gl-warp.js` returned
# nothing on a file that plainly contained it, which reads exactly like "that code does not exist".
# This repo is navigated by grep; CLAUDE.md tells every session to use it.
# It has cost something once already, in a different direction: js/compositor.js built a cache key with
# NUL separators, `"$(cat file)"` truncates at the first NUL, so both arguments to a mutation collapsed
# to the same prefix and mutate.sh announced "SURVIVED — the assertion is DEAD" against a perfectly good
# test. A gate was added to catch that symptom; this removes the cause.
# \u001f (unit separator) does every job a NUL was doing in those cache keys and is invisible to none of
# the tools. So: no NUL in shipped source, ever, and the check refuses rather than reminds.
# ⚠️ THE FIRST VERSION OF THIS CHECK FELL INTO THE VERY TRAP IT GUARDS. It searched with
# `grep -qU "$(printf '\000')"` — and command substitution truncates at the first NUL, so the pattern
# was the EMPTY STRING, which matches every file and therefore flags none of them usefully. Measured on
# a file built to contain one: "DETECTOR DOES NOT WORK". Python reads bytes and cannot be fooled.
NULBAD="$(git ls-files -m -o --exclude-standard | python3 -c '
import sys, os
for f in sys.stdin.read().split(chr(10)):
    if not f or not os.path.isfile(f): continue
    if not f.endswith((".js", ".html", ".css", ".md", ".py", ".sh")): continue
    try:
        if b"\x00" in open(f, "rb").read(): print(f)
    except OSError: pass
')"
if [ -n "$NULBAD" ]; then
  echo "❌ these files contain a NUL byte, which makes grep go SILENT on the whole file:"
  printf '   %s\n' $NULBAD
  echo "   Replace it with '\u001f' (unit separator) — same separator job, and grep can still read the file."
  exit 1
fi

# ⏱️ BATCH GATE — the biggest drain on his TIME, measured 27 Aug and hard to argue with: 99 commits in
# 20 hours, 51 of them touching NO app code, 38 version releases. Every one ran the suite (~8-9 min for
# a code change, which runs it twice; ~4 for docs). That is roughly TEN of those twenty hours spent
# watching a progress bar instead of working.
# His words: "you are barely using my usage up and seemingly doing updates very slow ... I leave you on
# even more than I used to and the usage is less". He was right, and this is the reason.
# LOOP.md rule 15 already said work 3-5 items then ship ONCE. Remembering it failed, so it is a gate:
# a DOCS-ONLY ship within 12 minutes of the last commit is refused, forcing notes to accumulate into
# one release rather than one suite run per sentence. CODE ships are never blocked -- a real fix must
# always be able to go out. Override with BATCH=0 for a genuine one-off.
if [ "${BATCH:-1}" = "1" ]; then
  _changed="$(git status --porcelain | awk '{print $2}')"
  if ! echo "$_changed" | grep -qE '^(js/|styles[.]css|index[.]html|tests/)'; then
    _last=$(git log -1 --format=%ct 2>/dev/null || echo 0)
    _age=$(( $(date +%s) - _last ))
    if [ "$_age" -lt 720 ]; then
      echo "⏱️  DOCS-ONLY SHIP REFUSED — last commit was $((_age/60))m ago, needs 12m."
      echo "   Every ship runs the suite. On 27 Aug, 51 of 99 commits were docs-only: hours of waiting"
      echo "   for nothing. Keep writing notes and let them ride out with the next real change."
      echo "   Nothing is lost -- the working tree keeps them. (BATCH=0 tools/ship.sh ... to override.)"
      exit 1
    fi
  fi
fi

# An edit that did not apply must not be able to ship. tools/apply.py leaves this marker when an
# anchor fails to match, because edits chained with `;` fail INVISIBLY — v13.25 announced a
# measurement table in the summary, in the commit and to Ezra, and it was never in the tree.
if [ -f .edit-failed ]; then
  echo "❌ an edit FAILED TO APPLY and was never resolved — refusing to ship a release that claims it:"
  sed "s/^/   /" .edit-failed
  echo "   → fix the edit (or rm .edit-failed if it is genuinely stale), then ship again"
  exit 1
fi

# Anchored to the LABEL element, not the first version-shaped string in the file — a bare grep
# matched "v5.49" in a comment on line 5 and would have blocked every release.
VER="$(grep -o 'class="ver"[^>]*>v[0-9]\+\.[0-9]\+' index.html | grep -o 'v[0-9]\+\.[0-9]\+' | head -1)"
LOG="$(grep -o '^- v[0-9]\+\.[0-9]\+' POLISH-LOG.md | tail -1 | sed 's/^- //')"
[ -n "$VER" ] || { echo "❌ could not read the version label out of index.html — fix this gate before shipping"; exit 1; }
[ "$VER" = "$LOG" ] || { echo "❌ index.html says $VER but the newest POLISH-LOG entry is $LOG — write the log entry first"; exit 1; }

# ---- THE COMMIT MESSAGE MUST NAME THE VERSION IT IS ACTUALLY SHIPPING (27 Aug) ----------------
# This gate exists because the history lied once. A release was started, and while its suite was
# running — four to eight minutes — the tree was edited again for the NEXT release. ship.sh commits
# with `git add -A` AFTER the suite passes, so the newer work was swept into the older commit: the
# message said v13.64 and described thumbnails, while the files inside it said v13.65 and carried a
# wordmark fix and an intro fix. Nothing was broken in the app and everything was pushed; what took
# the damage was the record, which is the thing both of us read to work out what changed and why.
# The version label in index.html is the truth about what a commit CONTAINS. If the subject line
# names a version at all, it has to agree with it.
# ⚠️ Only the SUBJECT (first line) is checked, and only when it names a version. Prose in the body
# legitimately cites old versions ("shipped at v12.31"), and a docs-only commit ("notes: …") names
# none — neither is a mismatch.
SUBJ="$(printf '%s' "$MSG" | head -1)"
MSGVER="$(printf '%s' "$SUBJ" | grep -o 'v[0-9]\+\.[0-9]\+' | head -1)"
if [ -n "$MSGVER" ] && [ "$MSGVER" != "$VER" ]; then
  echo "❌ the commit subject says $MSGVER but index.html says $VER."
  echo "   These must agree, or the history describes a release it does not contain."
  echo "   The usual cause: the tree was edited while an earlier ship's suite was still running,"
  echo "   so this commit is about to sweep up work that belongs to a later version."
  echo "   Fix the subject, or finish the in-flight release first."
  exit 1
fi

# The newest POLISH-LOG entry names the queue items it closes, e.g. "(queue 209)". If any of them is
# still an OPEN checkbox in REQUESTS.md, the release is about to go out with the item untick — which
# is the exact failure REQUESTS.md exists to prevent, and it happened on v8.19 when a tick script
# threw before writing and the push went ahead anyway.
LOGLINE="$(grep -n '^- v[0-9]' POLISH-LOG.md | tail -1 | cut -d: -f2-)"
# A release often ADVANCES an entry without closing it. That is legitimate and must not be silently
# waved through either, so it has to be declared: write "queue 202 (partial)" and the gate skips that
# number. Anything written as a plain "queue N" is a claim that N is finished, and is checked.
# tr, because the membership test below is ` $PARTIALS ` against `*" $q "*` — a SPACE-separated
# match. sort -u emits NEWLINES, so " 125\n202\n95 " contained " 95 " and nothing else: every declared
# partial except the last one in sort order was ignored and the gate blocked a correctly-declared
# release. Found by it refusing v9.26 three times over an entry that had declared all three properly.
PARTIALS="$(printf '%s' "$LOGLINE" | grep -o 'queue [0-9]\+ (partial)' | grep -o '[0-9]\+' | sort -u | tr '\n' ' ')"
for q in $(printf '%s' "$LOGLINE" | grep -o 'queue [0-9]\+' | grep -o '[0-9]\+' | sort -u); do
  case " $PARTIALS " in *" $q "*) continue;; esac
  if grep -q "^- \[ \] \*\*$q " REQUESTS.md || grep -q "^- \[ \] \*\*$q —" REQUESTS.md; then
    echo "❌ POLISH-LOG says this release closes queue $q, but #$q is still OPEN in REQUESTS.md."
    echo "   Tick it before shipping, or drop it from the log entry if it is not actually done."
    exit 1
  fi
done
# ---- OLDEST FIRST, ENFORCED (26 Aug) ------------------------------------------------------------
# WHY. CLAUDE.md has said "work the list oldest first" for weeks, in its own section, with his words in
# it: "Remember I want the oldest things in the list done first, not what I just told you, make sure you
# figure out a way to remember if you keep forgetting." On 26 Aug v12.69 shipped #556, #557 and #558
# while #474, #524, #539, #545, #548 and #550 sat ACTIONABLE and untouched — six items jumped, by the
# session that had just re-read the rule, and then v12.70 jumped #474 again while writing this gate.
# NOTHING WAS WRONG WITH THE TOOLING. next.sh printed the right answer both times. The answer was simply
# not obeyed, because obeying it was a thing to REMEMBER — and "figure out a way to remember" is, by his
# own later instruction, the wrong shape of fix: "every safe guard needs to be structural."
# It is easy to get wrong for two reasons that do not go away: an item parked on a decision FEELS blocked
# even when the tool says READY, and a request he typed yesterday feels more urgent than one from three
# weeks ago. So the check refuses rather than reminds.
# `next_up` lives in tools/_classify.py beside classify(), because next.sh, status.sh and this gate are
# three readers of ONE rule — and this file's own history says a rule in two places is the most expensive
# bug shape in the project. It has self-tests, and the run above refuses if any of them break.
# ⚠️ AND THE LIST OF WHAT THIS RELEASE CLOSES IS READ FROM THE DIFF, NOT FROM THE LOG LINE (29 Aug).
# The line below used to be the ONLY source, and it greps for the words "queue 651". That is a rule
# about PHRASING. Five releases in a row wrote "#651" instead — v14.31, v14.34, v14.35, v14.36,
# v14.37 — so CLOSES came back EMPTY and this gate, added on 26 Aug precisely because obeying the
# order was "a thing to remember", matched nothing and passed everything. It fired on v14.32 and
# v14.33 only because those log lines happened to quote a code comment containing "queue 650", which
# is worse than not firing: it looked alive.
# This file's own header already names the shape — "a safeguard that reads like protection and cannot
# fire is worse than none, because it stops you being careful" — about the backtick check. Same bug,
# second instance, so the fix is the same one: ask the question of something that cannot be phrased
# around. An item is closed by this release exactly when its checkbox goes `- [ ]` -> `- [x]` in
# REQUESTS.md. `closed_in_diff` lives in tools/_classify.py beside the rest, and is self-tested there,
# so this cannot quietly stop working either.
# The prose list is still unioned in: it is what the "log says it closes q but q is still open" gate
# above needs, and a release may legitimately name an item it only partly closed.
CLOSES="$(printf '%s' "$LOGLINE" | grep -o 'queue [0-9]\+' | grep -o '[0-9]\+' | sort -u | tr '\n' ' ')"
ORDER_MSG="$(CLOSES="$CLOSES" PARTIALS="$PARTIALS" python3 - <<'PYORDER'
import io, os, subprocess, sys
sys.path.insert(0, 'tools')
import _classify as C
md = io.open('REQUESTS.md', encoding='utf-8').read()
partials = set(os.environ.get('PARTIALS', '').split())
closes = set(int(n) for n in os.environ.get('CLOSES', '').split() if n not in partials)
try:
    diff = subprocess.check_output(['git', 'diff', 'HEAD', '--', 'REQUESTS.md'],
                                   stderr=subprocess.DEVNULL).decode('utf-8', 'replace')
except Exception:
    diff = ''
for num, suf in C.closed_in_diff(diff):
    if num is None:
        closes.add(-1)            # an unnumbered entry — older than every number
    elif str(num) not in partials:
        closes.add(num)
closes = sorted(closes)
nxt = C.next_up(md)
if nxt and closes:
    num, suf, head = nxt
    # key_of, not sort_key: the tier (his words before my audit findings, 2 Sep) is read from the entry
    late = [n for n in closes if C.key_of(md, n) > C.key_of(md, num, suf)]
    if late:
        name = 'an UNNUMBERED entry — those predate the numbering, so they are the oldest in the file' \
               if num is None else '#%d%s' % (num, suf)
        print('%s|%s|%s' % (','.join('#%d' % n for n in late), name, head.strip()[:130]))
PYORDER
)"
if [ -n "$ORDER_MSG" ]; then
  LATE="${ORDER_MSG%%|*}"; REST="${ORDER_MSG#*|}"; NEXTUP="${REST%%|*}"; NEXTHEAD="${REST#*|}"
  echo "❌ QUEUE ORDER — this release closes $LATE, but $NEXTUP is open and workable and comes first."
  echo "   $NEXTHEAD"
  echo
  echo "   He asked for this explicitly: \"I want the oldest things in the list done first, not what I"
  echo "   just told you.\" Nothing rots at the bottom is the whole point of the list."
  echo "   Either do $NEXTUP first, or — if he told you to do this now, or the build was broken —"
  echo "   write \"JUMPED: <reason>\" into $NEXTUP's entry and it will stop holding the queue."
  exit 1
fi

# ---- A CHANGED FILE MUST HAVE ITS CACHE-BUSTER BUMPED (22 Aug) ----------------------------------
# WHY. CLAUDE.md has carried this warning for a long time — "a missed buster reads as 'the fix does not
# work' — it has" — and the only thing enforcing it was remembering. That is exactly what this project
# treats as no safeguard at all. The failure is silent and it is the WORST kind of silent: the code is
# correct, the tests are green, the push lands, and Ezra opens the app on his phone and sees the old
# build. Every symptom points at the fix being wrong when the fix is fine.
# Forty commits were scanned when this gate was written and none had missed one — so this is not a fix
# for a present mess, it is a lock on a door that has been left open the whole time.
# NEW files are exempt: they have no previous ?v= to differ from, and being referenced at all is enough.
BUSTER_MISS="$(python3 - <<'PYEOF'
import subprocess, re, sys
def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True).stdout
changed = set()
for line in sh("git status --porcelain").splitlines():
    parts = line[3:].split(" -> ")
    changed.add(parts[-1].strip())
watched = [f for f in changed if re.match(r'^(js/.*\.js|styles\.css|theme-glass\.css)$', f)]   # theme-glass.css joined 5 Sep: it ships too (queue 553)
if not watched: sys.exit(0)
now = open('index.html', encoding='utf-8').read()
was = sh("git show HEAD:index.html")
def buster(txt, f):
    m = re.search(re.escape(f) + r'\?v=([0-9.]+)', txt)
    return m.group(1) if m else None
for f in sorted(watched):
    b_now = buster(now, f)
    if b_now is None: continue          # not referenced by index.html (a tool, a test helper) — not cached
    b_was = buster(was, f)
    if b_was is None: continue          # brand new reference — nothing to bump
    if b_now == b_was:
        print("%s (still ?v=%s)" % (f, b_now))
PYEOF
)"
if [ -n "$BUSTER_MISS" ]; then
  echo "❌ A FILE CHANGED BUT ITS CACHE-BUSTER DID NOT — not committing, not pushing."
  echo "$BUSTER_MISS" | sed 's/^/   /'
  echo "   Bump the ?v= for each of those in index.html. Without it the phone keeps serving the OLD file,"
  echo "   the app looks unchanged, and the fix reads as broken when it is fine."
  exit 1
fi

# ---- THE SUMMARY EZRA READS MUST NOT BE STALE (22 Aug) -------------------------------------------
# WHY. The block at the top of REQUESTS.md is the first thing he sees, and it is written for HIM. One sat
# there from 18 Aug for four days quoting v9.94, "659 tests green", "70 items open" and a "next actionable
# item" that had long since shipped — while the app was on v11.50 with 816 tests. Nothing noticed, because
# nothing was watching: it is prose, and prose has no test.
# So the stamp is checked against the version being shipped. It costs one line to update and it stops the
# one file he actually opens from lying to him about where things stand.
# `class="ver"` contains a literal v, so a loose grep matches that too — anchor on the delimiters.
REQ_VER="$(grep -o 'at v[0-9][0-9.]*' REQUESTS.md | head -1 | sed 's/^at //')"
APP_VER="$(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')"
if [ -n "$REQ_VER" ] && [ "$REQ_VER" != "$APP_VER" ]; then
  echo "❌ THE SUMMARY AT THE TOP OF REQUESTS.md IS STALE — not committing, not pushing."
  echo "   It says $REQ_VER; this build is $APP_VER."
  echo "   That block is the first thing Ezra reads. Update its state line (version, test count, what is"
  echo "   waiting on him) and the stamp, then ship again. A previous one misled him for four days."
  exit 1
fi

# THE CLASSIFIER MUST PROVE ITSELF BEFORE IT LABELS ANYTHING (22 Aug). tools/_classify.py decides what
# the loop picks up next AND what STATUS Ezra reads in REQUESTS.md, and every rule in it was written to
# cure a real bug — an answered item that had become unreachable, a hold that would not lift, five real
# items hidden by a phrase in a note about them. Nothing else in this repo would notice if one of those
# rules stopped working; the symptom is silence, which is the worst kind. So it self-tests, here, before
# it is allowed to write a label or hand out work.
if ! python3 tools/_classify.py; then
  echo "❌ THE QUEUE CLASSIFIER IS BROKEN — not committing, not pushing."
  echo "   Each failing case above is a bug that already happened once. Fix tools/_classify.py first."
  exit 1
fi
# Refresh REQUESTS.md's STATUS labels first, so they can never be stale in a commit (queue 352).
# A label written by hand is true the day it is written and misleading a week later.
./tools/status.sh >/dev/null 2>&1 || true

# ⚠️ A SUITE THAT RAN OUT OF TIME IS NOT A SUITE THAT FAILED, and this gate could not tell them apart
# (25 Aug). `_cdp.py` gives up after `--timeout` seconds and prints `"ok": false` with an `error` and
# NO failures — so a slow-but-healthy run arrived here as "SUITE IS RED", followed by an empty list of
# what broke. That reads as "the tests failed and I cannot tell you which", which sends the next hour
# looking for a fault that does not exist; it cost one this morning. The runner's default is 600s and
# the suite is over 900 tests now, so the margin only shrinks from here.
# Two changes, both structural: ask for real headroom, and SAY which of the two things happened.
# ---- EVERY FIX SHIPS WITH A TEST THAT FAILS WITHOUT IT (5 Sep) --------------------------------------
# Ezra, coming back to a fortnight of autonomous releases: "dont assume fixes will work". mutate.sh was the
# proof, and it was voluntary — a log line saying "mutation caught" is a claim, not a measurement. So the
# proof is now taken here, automatically, with the one mutation that always applies: the fix, reverted.
# tools/prove.sh serves HEAD's source with the working tree's tests and requires every test this release
# added or changed to FAIL there and PASS here. About a minute; it runs BEFORE the suite so a dead test
# costs one minute rather than ten. The escape hatch is a visible declaration — "UNPROVABLE: <why>" in
# the newest POLISH-LOG line — because he reads that file and a flag he cannot see is not a safeguard.
echo "→ proving the release (its changed tests must fail without the fix)…"
tools/prove.sh || { echo "   Not committing, not pushing."; exit 1; }

SUITE_TIMEOUT=1800
echo "→ running the suite (4-5 minutes)…"
OUT="$(python3 tests/_cdp.py --port 8777 --timeout $SUITE_TIMEOUT 2>&1)"
SUM="$(printf '%s' "$OUT" | grep -o '"summary": "[^"]*"' | head -1)"
if printf '%s' "$OUT" | grep -q 'did not finish within'; then
  echo "⏱  THE SUITE RAN OUT OF TIME after ${SUITE_TIMEOUT}s — it did NOT fail. Nothing is committed or pushed."
  printf '%s' "$OUT" | grep -o '"lastTest": "[^"]*"' | head -1
  echo "   Nothing here says a test is broken. Either the machine is loaded or the suite has outgrown"
  echo "   ${SUITE_TIMEOUT}s — check the last test above before assuming a regression."
  exit 1
fi
if ! printf '%s' "$OUT" | grep -q '"ok": true'; then
  # ⚠️ "not green" is not the same as "a test failed", and this branch used to assert the second.
  # It printed "SUITE IS RED" followed by the FAIL lines — and when the cause was anything OTHER than
  # a failing test (wrong port, no server, a crashed browser) there were no FAIL lines to print, so it
  # announced a red suite and then listed nothing. That is the most misleading output this script can
  # produce. If nothing actually failed, say what DID happen instead of implying a regression.
  if printf '%s' "$OUT" | grep -q 'FAIL'; then
    echo "❌ SUITE IS RED — not committing, not pushing."
    printf '%s' "$OUT" | grep -o 'FAIL[^"]*' | head -6
  else
    echo "⚠️  THE SUITE DID NOT RUN — no test failed. Nothing is committed or pushed."
    printf '%s' "$OUT" | grep -o '"error": "[^"]*"' | head -1
    echo "   Nothing above says a test is broken. Fix the run, then ship."
  fi
  exit 1
fi
# …and that it actually RAN. `"ok": true` is only "nothing failed", which a suite of zero tests also is.
. tools/_testfloor.sh
test_floor_check "$OUT" || { echo "   Not committing, not pushing."; exit 1; }
echo "✅ $SUM"

# ── THE PHONE PASS (queue 353 clause 3, added 22 Aug) ────────────────────────────────────────────
# "make sure everything is quality tested as good as possible" — and this app is MOBILE-FIRST, while
# every gate here had only ever run the suite at 1280px. `tests/_cdp.py --width 380` has been in the
# runner's own usage header for months and NOTHING has ever called it.
# That is not theoretical: queue 431 (the Media/Audio library crushing the tab row and clipping its
# labels) is a phone-layout bug that shipped, survived THREE passes that each measured a healthy row at
# desktop width, and was only found when he sent a screenshot and said "nothings happened".
# Skipped when no shipped source changed — a tests-only or docs-only commit cannot move a layout, and
# paying five minutes to prove that on every one of them is how a gate gets switched off. Deliberately
# NOT an allowlist of "UI files": such a list is right the day it is written and stale by the next
# module, which is the failure mode this file exists to remove.
# ─── NO TEST MAY VANISH WITHOUT SAYING SO (28 Aug) ──────────────────────────────────────────────
# A DELETED TEST IS INDISTINGUISHABLE FROM A PASSING ONE. On 28 Aug a text edit meant to REPLACE one
# test spliced away four — #649, both #664s and #666 — and the suite went green on 1047 where it had
# been 1051. Green is exactly what that looks like. It was found only by diffing the test NAMES against
# the last commit, by hand, because it happened to occur to me.
# ⚠️ THE TEST-FLOOR CHECK ABOVE IS NOT THIS. It compares a COUNT, so four deletions and four additions
# net to zero and it says nothing — and the floor is a number a session edits by hand, so the honest
# way to silence it is the same keystroke as the honest way to update it.
# This compares the NAMES. Deleting a test is a legitimate thing to do — a fixture dies, a feature goes
# — so it is not forbidden, it is DECLARED: put "DROPS TEST:" in the commit message and it passes. That
# turns a silent deletion into a line in the log, which is the whole pattern this file is built on.
GONE="$(git show HEAD:tests/tests.js 2>/dev/null | grep -o "^  test('[^']*'" | sed "s/^  test('//;s/'\$//" | sort > /tmp/fm_tests_before.txt
grep -o "^  test('[^']*'" tests/tests.js | sed "s/^  test('//;s/'\$//" | sort > /tmp/fm_tests_after.txt
comm -23 /tmp/fm_tests_before.txt /tmp/fm_tests_after.txt)"
if [ -n "$GONE" ] && ! printf '%s' "$MSG" | grep -q 'DROPS TEST:'; then
  echo "❌ these tests exist in HEAD and are GONE from the working tree:"
  printf '   · %s\n' $(printf '%s' "$GONE" | tr ' ' '_') 2>/dev/null || printf '%s\n' "$GONE"
  echo
  echo "   A deleted test is indistinguishable from a passing one — the suite goes GREEN."
  echo "   If the deletion is deliberate, say so: put \"DROPS TEST: <why>\" in the commit message."
  exit 1
fi

# ─── NO REQUEST MAY VANISH WITHOUT SAYING SO (2 Sep) ────────────────────────────────────────────
# The twin of the gate above, and it exists because the thing it prevents ALREADY HAPPENED. On 1 Sep,
# v14.89 — a release about the camera's motion-blur shutter — deleted queue 703 from REQUESTS.md. That
# entry held one of HIS OWN VERBATIM INSTRUCTIONS: "Dont stop looping, keep it going, have a failsafe
# incase the loop fails". Nothing in that commit mentioned it. Nothing went red. The file is prose, and
# prose has no test.
# CLAUDE.md already names this as the worst thing that can happen here — "quietly dropping a request is
# the exact failure this file exists to prevent" — and until today the only thing enforcing it was care,
# which is exactly what this repo has learned not to rely on.
# It was caught a day later by tools/next.sh, and only indirectly: that script flags a NUMBER with no
# entry, so it saw a hole at 703 rather than a deletion. That is luck dressed as detection — it would
# have said nothing at all had the entry been the highest-numbered one, or unnumbered.
# Deleting an entry is occasionally legitimate (a renumber, a merge into a neighbour — three such have
# happened and all three came back). So this is not forbidden, it is DECLARED, the same shape as the
# test gate: put "DROPS REQUEST:" in the commit message and it passes, which turns a silent deletion
# into a line in the log.
REQ_GONE="$(git show HEAD:REQUESTS.md 2>/dev/null | grep -oE '^- \[[ x]\] \*\*[0-9]+[a-z]?' | grep -oE '[0-9]+[a-z]?$' | sort -u > /tmp/fm_req_before.txt
grep -oE '^- \[[ x]\] \*\*[0-9]+[a-z]?' REQUESTS.md | grep -oE '[0-9]+[a-z]?$' | sort -u > /tmp/fm_req_after.txt
comm -23 /tmp/fm_req_before.txt /tmp/fm_req_after.txt)"
# ⚠️ AND THE GATE MUST PROVE IT CAN SEE. A pattern that matches NOTHING reports no losses and waves
# every deletion through — the failure is silence, which is the one thing no one notices. If the entry
# header format in REQUESTS.md ever drifts from this regex, that is what happens, so count first.
REQ_SEEN="$(wc -l < /tmp/fm_req_before.txt | tr -d ' ')"
if [ "${REQ_SEEN:-0}" -lt 100 ]; then
  echo "❌ the REQUESTS.md entry gate matched only $REQ_SEEN entries in HEAD — it expects hundreds."
  echo "   The header format has drifted from the pattern, so this gate is blind and would pass"
  echo "   ANY deletion silently. Fix the regex in tools/ship.sh before shipping."
  exit 1
fi
if [ -n "$REQ_GONE" ] && ! printf '%s' "$MSG" | grep -q 'DROPS REQUEST:'; then
  echo "❌ these REQUESTS.md entries exist in HEAD and are GONE from the working tree:"
  printf '%s\n' "$REQ_GONE" | sed 's/^/   · #/'
  echo
  echo "   A request that vanishes is not deprioritised, it is UNREACHABLE — and he cannot see that it"
  echo "   went. This is how #703 lost his own words: \"Dont stop looping… have a failsafe\"."
  echo "   If the removal is deliberate, say so: put \"DROPS REQUEST: <why>\" in the commit message."
  exit 1
fi

PHONE_RELEVANT="$(git diff --cached --name-only; git diff --name-only)"
if printf '%s' "$PHONE_RELEVANT" | grep -qE '^(styles\.css|index\.html|js/)'; then
  echo "→ running the suite again at PHONE width (380px)…"
  POUT="$(python3 tests/_cdp.py --port 8777 --width 380 --timeout $SUITE_TIMEOUT 2>&1)"
  PSUM="$(printf '%s' "$POUT" | grep -o '"summary": "[^"]*"' | head -1)"
  if printf '%s' "$POUT" | grep -q 'did not finish within'; then
    echo "⏱  THE PHONE PASS RAN OUT OF TIME after ${SUITE_TIMEOUT}s — it did NOT fail. Nothing committed or pushed."
    printf '%s' "$POUT" | grep -o '"lastTest": "[^"]*"' | head -1
    exit 1
  fi
  if ! printf '%s' "$POUT" | grep -q '"ok": true' && ! printf '%s' "$POUT" | grep -q 'FAIL'; then
    echo "⚠️  THE PHONE PASS DID NOT RUN — no test failed. Nothing is committed or pushed."
    printf '%s' "$POUT" | grep -o '"error": "[^"]*"' | head -1
    exit 1
  fi
  if ! printf '%s' "$POUT" | grep -q '"ok": true'; then
    echo "❌ SUITE IS RED AT PHONE WIDTH — not committing, not pushing."
    echo "   It is GREEN at 1280px, so this is a layout that only breaks on a phone — which is the"
    echo "   one shape of bug this app can least afford, and exactly how queue 431 shipped."
    printf '%s' "$POUT" | grep -o 'FAIL[^"]*' | head -6
    exit 1
  fi
  test_floor_check "$POUT" || { echo "   Not committing, not pushing."; exit 1; }
  echo "✅ phone $PSUM"
else
  echo "· no shipped source changed — skipping the phone pass"
fi

git add -A
git commit -q -m "$MSG" || { echo "ship: nothing to commit"; exit 1; }
git push -q ssh main 2>&1 | tail -2
H="$(git rev-parse HEAD)"; R="$(git rev-parse ssh/main 2>/dev/null || echo none)"
if [ "$H" != "$R" ]; then echo "❌ PUSH DID NOT LAND — HEAD $H vs ssh/main $R"; exit 1; fi
echo "✅ pushed and verified: HEAD == ssh/main ($H)"
