#!/bin/bash
# Mutation-check a fix, structurally — you cannot leave the tree mutated.
#
#   tools/mutate.sh <file> <old-string> <new-string> [expected-substring-of-the-failing-test]
#
# Why this exists: doing it by hand went wrong twice in one session. A run that timed out mid-way
# left the mutation sitting in js/compositor.js, and a browser measurement taken while a mutation
# was live reported the MUTATION's behaviour as if it were the code's. Both are impossible here:
# the restore is on a trap (it runs on success, failure, Ctrl-C or kill) and a lockfile is held for
# the duration so nothing else reads a mutated tree by accident.
set -uo pipefail
FILE="$1"; OLD="$2"; NEW="$3"; EXPECT="${4:-}"
[ -f "$FILE" ] || { echo "mutate: no such file: $FILE"; exit 2; }
BAK="$(mktemp)"; LOCK=".mutation-in-progress"
cp "$FILE" "$BAK"
restore() { cp "$BAK" "$FILE"; rm -f "$BAK" "$LOCK"; }
trap restore EXIT INT TERM
echo "MUTATION IN PROGRESS on $FILE — do not run a browser check now" > "$LOCK"

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
BASE_HASH="$(cat index.html styles.css theme-glass.css js/*.js tests/tests.js 2>/dev/null | shasum | cut -d' ' -f1)"
GREEN_FILE="tools/.mutate-green"
if [ "$(cat "$GREEN_FILE" 2>/dev/null)" != "$BASE_HASH" ]; then
  echo "→ baseline: proving the suite is green BEFORE mutating (once per edit; cached after)…"
  BASE_OUT="$(python3 tests/_cdp.py --port 8777 2>&1)"
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
  . tools/_testfloor.sh
  test_floor_check "$BASE_OUT" || { echo "   Fix that before mutation-checking anything."; exit 6; }
  printf '%s' "$BASE_HASH" > "$GREEN_FILE"
  echo "   baseline green ✅ (cached — further mutations on this tree skip it)"
fi
# --------------------------------------------------------------------------------------------------

# ---- AND IT MUST NOT BE AMBIGUOUS (22 Aug) --------------------------------------------------------
# The not-found guard below has caught a lot. This is its blind twin: a string that IS found, more than
# once, and the replace lands on the WRONG one. It cost two full suite runs and very nearly a false
# conclusion that a brand-new test was dead — `<option value="30">30 fps</option>` appears in BOTH the
# new-project dialog and the export dialog, the mutation hit the first, the thing under test was never
# touched, and the green run looked exactly like a hole in the test.
# A green run after an ambiguous mutation proves nothing, same as after a missing one. Refuse both.
HITS="$(python3 - "$FILE" "$OLD" <<'PYC'
import sys
src = open(sys.argv[1], encoding='utf-8').read()
print(src.count(sys.argv[2]))
PYC
)"
if [ "$HITS" -gt 1 ]; then
  echo "mutate: the old string appears $HITS times in $FILE — the replace would hit the FIRST one, which"
  echo "        may not be the code under test. A green run after that proves nothing."
  echo "        Include a neighbouring line to make it unique."
  exit 4
fi

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
if cmp -s "$FILE" "$BAK"; then
  echo "mutate: the file is BYTE-IDENTICAL after the replace - the mutation changed nothing, so a green"
  echo "        run proves nothing about the test. Usually old and new are the same text."
  echo "        If either string contains a NUL, a tab or a newline, \$(cat ...) will have mangled it -"
  echo "        pass the strings as literals, or make the edit in python and diff instead."
  exit 7
fi

OUT="$(python3 tests/_cdp.py --port 8777 2>&1)"
FAILS="$(printf '%s' "$OUT" | grep -o 'FAIL[^"]*' | grep -v 'version on screen' || true)"
if [ -z "$FAILS" ]; then
  echo "❌ SURVIVED — the mutation broke the code and every test still passed."
  echo "   The assertion is DEAD: it cannot see the defect it was written for."
  exit 1
fi
echo "✅ CAUGHT:"; printf '%s\n' "$FAILS" | head -4
if [ -n "$EXPECT" ] && ! printf '%s' "$FAILS" | grep -qF "$EXPECT"; then
  # A FAIL line prints the test's TITLE, but every other tool here addresses a test by its ITEM name —
  # so passing the item, which is the natural thing to do, could never match and always warned "not the
  # test you expected" after a mutation the test had in fact caught. A warning that fires on success
  # teaches you to ignore warnings, so resolve item -> title and match that too before complaining.
  TITLE="$(python3 - "$EXPECT" <<'PYX'
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
)"
  if [ -z "$TITLE" ] || ! printf '%s' "$FAILS" | grep -qF "$TITLE"; then
    echo "⚠️  but not by the test you expected (\"$EXPECT\") — check which assertion actually fired."
  fi
  exit 4
fi
