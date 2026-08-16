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

python3 - "$FILE" "$OLD" "$NEW" << 'PY' || { echo "mutate: the old string was not found — the mutation did NOT apply, so a green run here proves nothing"; exit 3; }
import sys
p, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p, encoding='utf-8').read()
if old not in s: sys.exit(1)
open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
PY

OUT="$(python3 tests/_cdp.py --port 8777 2>&1)"
FAILS="$(printf '%s' "$OUT" | grep -o 'FAIL[^"]*' | grep -v 'version on screen' || true)"
if [ -z "$FAILS" ]; then
  echo "❌ SURVIVED — the mutation broke the code and every test still passed."
  echo "   The assertion is DEAD: it cannot see the defect it was written for."
  exit 1
fi
echo "✅ CAUGHT:"; printf '%s\n' "$FAILS" | head -4
if [ -n "$EXPECT" ] && ! printf '%s' "$FAILS" | grep -q "$EXPECT"; then
  echo "⚠️  but not by the test you expected (\"$EXPECT\") — check which assertion actually fired."
  exit 4
fi
