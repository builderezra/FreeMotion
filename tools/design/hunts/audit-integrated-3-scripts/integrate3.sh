#!/bin/bash
# INT2: the 19 INT1 branches PLUS hunt/new-effects-1, hunt/fuzz-seeds, hunt/audit-spine and hunt/audit-unread-1, on origin/main.
#   bash integrate3.sh <worktree-dir> [branch-name]
# E1 and FZ1 EDIT existing tests (E1 freezes a fixture, FZ1 turns the fuzz into a function), so those two are merged by git first (their one overlapping line
# is resolved to FZ1's); every other branch only ADDS tests, and those are appended to the CURRENT tests.js (merge_tests3.py).
set -e
W=$1; NAME=${2:-hunt/audit-integrated-3}; HERE="$(cd "$(dirname "$0")" && pwd)"
FIRST="new-effects-1 fuzz-seeds"
BR="audit-spine audit-unread-1 audit-storage audit-timeline audit-inspector audit-scene audit-collab audit-exporter audit-mobile audit-home audit-app-1 audit-app-2 audit-app-3 audit-compositor audit-fx-2 audit-filmstrip perf-freeze perf-glow param-aliases audit-fx-3 audit-collab-media"
git worktree add -q -B "$NAME" "$W" origin/main
cd "$W"; git config user.email h@x; git config user.name h
resolve() { for f in $(git status --short | grep -E '^(UU|AA)' | awk '{print $2}'); do
    if [ "$f" = index.html ]; then python3 "$HERE/resolve_index.py" "$f" max
    elif [ "$f" = tests/tests.js ]; then if [ "$2" = first ] && [ "$1" = fuzz-seeds ]; then python3 "$HERE/theirs.py" "$f"; elif [ "$2" = first ]; then python3 "$HERE/union.py" "$f"; else git checkout -q --ours "$f"; fi
    else echo "REAL CONFLICT in $f ($1)"; git checkout -q --ours "$f"; fi
    git add "$f"; done; }
for b in $FIRST; do git merge --no-edit -q origin/hunt/$b >/dev/null 2>&1 || true; resolve $b first; git diff --cached --quiet || git commit -q --no-edit; done
for b in $BR; do git merge --no-edit -q origin/hunt/$b >/dev/null 2>&1 || true; resolve $b rest; git diff --cached --quiet || git commit -q --no-edit; done
python3 "$HERE/merge_tests3.py" $BR
node --check tests/tests.js && echo "tests.js parses"
