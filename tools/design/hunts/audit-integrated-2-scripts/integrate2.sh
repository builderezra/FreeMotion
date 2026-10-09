#!/bin/bash
# Rebuilds the INT1 integration: the 19 code-changing audit / perf / alias branches on origin/main in a throwaway worktree. Nothing is pushed.
#   bash integrate2.sh <worktree-dir> [branch-name]
set -e
W=$1; NAME=${2:-hunt/audit-integrated-2}; HERE="$(cd "$(dirname "$0")" && pwd)"
BR="audit-storage audit-timeline audit-inspector audit-scene audit-collab audit-exporter audit-mobile audit-home audit-app-1 audit-app-2 audit-app-3 audit-compositor audit-fx-2 audit-filmstrip perf-freeze perf-glow param-aliases audit-fx-3 audit-collab-media"
git worktree add -q -B "$NAME" "$W" origin/main
cd "$W"; git config user.email h@x; git config user.name h
for b in $BR; do
  git merge --no-edit -q origin/hunt/$b >/dev/null 2>&1 || true
  for f in $(git status --short | grep -E '^(UU|AA)' | awk '{print $2}'); do
    if [ "$f" = index.html ]; then python3 "$HERE/resolve_index.py" "$f" max
    elif [ "$f" = tests/tests.js ]; then git checkout -q --ours "$f"
    else echo "REAL CONFLICT in $f ($b)"; git checkout -q --ours "$f"; fi
    git add "$f"
  done
  git diff --cached --quiet || git commit -q --no-edit
done
python3 "$HERE/merge_tests2.py" $BR
python3 "$HERE/fix_busters.py" | tee /tmp/claude-0/int2_busters.txt
node --check tests/tests.js && echo "tests.js parses"; for f in js/*.js; do node --check $f || echo "BAD $f"; done
git add -A; git commit -qm "INT1 integration on v17.34"; git log --oneline -1
