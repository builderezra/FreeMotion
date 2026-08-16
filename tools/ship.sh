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
[ -f .mutation-in-progress ] && { echo "❌ a mutation check is still in progress — refusing to ship a mutated tree"; exit 1; }

# Anchored to the LABEL element, not the first version-shaped string in the file — a bare grep
# matched "v5.49" in a comment on line 5 and would have blocked every release.
VER="$(grep -o 'class="ver"[^>]*>v[0-9]\+\.[0-9]\+' index.html | grep -o 'v[0-9]\+\.[0-9]\+' | head -1)"
LOG="$(grep -o '^- v[0-9]\+\.[0-9]\+' POLISH-LOG.md | tail -1 | sed 's/^- //')"
[ -n "$VER" ] || { echo "❌ could not read the version label out of index.html — fix this gate before shipping"; exit 1; }
[ "$VER" = "$LOG" ] || { echo "❌ index.html says $VER but the newest POLISH-LOG entry is $LOG — write the log entry first"; exit 1; }

echo "→ running the suite (3-4 minutes)…"
OUT="$(python3 tests/_cdp.py --port 8777 2>&1)"
SUM="$(printf '%s' "$OUT" | grep -o '"summary": "[^"]*"' | head -1)"
if ! printf '%s' "$OUT" | grep -q '"ok": true'; then
  echo "❌ SUITE IS RED — not committing, not pushing."
  printf '%s' "$OUT" | grep -o 'FAIL[^"]*' | head -6
  exit 1
fi
echo "✅ $SUM"

git add -A
git commit -q -m "$MSG" || { echo "ship: nothing to commit"; exit 1; }
git push -q ssh main 2>&1 | tail -2
H="$(git rev-parse HEAD)"; R="$(git rev-parse ssh/main 2>/dev/null || echo none)"
if [ "$H" != "$R" ]; then echo "❌ PUSH DID NOT LAND — HEAD $H vs ssh/main $R"; exit 1; fi
echo "✅ pushed and verified: HEAD == ssh/main ($H)"
