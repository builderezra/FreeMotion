#!/bin/bash
# Ship a release, structurally — every gate is checked here so none can be skipped.
#
#   tools/ship.sh "<commit message>"
#
# Refuses to push unless: the tree is not mid-mutation, the suite is fully green, the version label
# and the newest POLISH-LOG entry agree, and the push actually landed. That last one matters —
# `origin` is an HTTPS URL with no stored credentials and fails with "could not read Username", so
# success is confirmed by comparing HEAD to ssh/main rather than by trusting the push output.
# A red suite was pushed once by running the tests and the commit in the same breath; not possible now.
set -uo pipefail
MSG="${1:-}"
[ -n "$MSG" ] || { echo "ship: needs a commit message"; exit 2; }
# Backticks in a double-quoted shell argument are COMMAND SUBSTITUTION, not code quotes. A message
# written with `void ic.offsetWidth` in it silently executed that and committed the gap where the
# code should have been — the explanation was gone from the log and nobody would have noticed.
case "$MSG" in
  *'`'*) echo "❌ the commit message contains a backtick, which the shell will execute and delete."
         echo "   Use plain quotes for code, or pass the message via: git commit -F -"; exit 2;;
esac
[ -f .mutation-in-progress ] && { echo "❌ a mutation check is still in progress — refusing to ship a mutated tree"; exit 1; }

# Anchored to the LABEL element, not the first version-shaped string in the file — a bare grep
# matched "v5.49" in a comment on line 5 and would have blocked every release.
VER="$(grep -o 'class="ver"[^>]*>v[0-9]\+\.[0-9]\+' index.html | grep -o 'v[0-9]\+\.[0-9]\+' | head -1)"
LOG="$(grep -o '^- v[0-9]\+\.[0-9]\+' POLISH-LOG.md | tail -1 | sed 's/^- //')"
[ -n "$VER" ] || { echo "❌ could not read the version label out of index.html — fix this gate before shipping"; exit 1; }
[ "$VER" = "$LOG" ] || { echo "❌ index.html says $VER but the newest POLISH-LOG entry is $LOG — write the log entry first"; exit 1; }

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
# Refresh REQUESTS.md's STATUS labels first, so they can never be stale in a commit (queue 352).
# A label written by hand is true the day it is written and misleading a week later.
./tools/status.sh >/dev/null 2>&1 || true

echo "→ running the suite (3-4 minutes)…"
OUT="$(python3 tests/_cdp.py --port 8777 2>&1)"
SUM="$(printf '%s' "$OUT" | grep -o '"summary": "[^"]*"' | head -1)"
if ! printf '%s' "$OUT" | grep -q '"ok": true'; then
  echo "❌ SUITE IS RED — not committing, not pushing."
  printf '%s' "$OUT" | grep -o 'FAIL[^"]*' | head -6
  exit 1
fi
# …and that it actually RAN. `"ok": true` is only "nothing failed", which a suite of zero tests also is.
. tools/_testfloor.sh
test_floor_check "$OUT" || { echo "   Not committing, not pushing."; exit 1; }
echo "✅ $SUM"

git add -A
git commit -q -m "$MSG" || { echo "ship: nothing to commit"; exit 1; }
git push -q ssh main 2>&1 | tail -2
H="$(git rev-parse HEAD)"; R="$(git rev-parse ssh/main 2>/dev/null || echo none)"
if [ "$H" != "$R" ]; then echo "❌ PUSH DID NOT LAND — HEAD $H vs ssh/main $R"; exit 1; fi
echo "✅ pushed and verified: HEAD == ssh/main ($H)"
