#!/bin/bash
# Rebuilds the P26 integration trial: the seven audit branches on origin/main, in a throwaway worktree. Nothing is pushed.
#   bash integrate.sh <worktree-dir> [branch-name]
set -e
W=$1; NAME=${2:-p26-integration}; HERE="$(cd "$(dirname "$0")" && pwd)"
BASE=7125ecff       # every audit branch forked from this commit
BR="audit-storage audit-timeline audit-inspector audit-scene audit-collab audit-exporter audit-mobile"
git worktree add -q -B "$NAME" "$W" origin/main
cd "$W"; git config user.email h@x; git config user.name h
for b in $BR; do
  git merge --no-edit -q origin/hunt/$b >/dev/null 2>&1 || true
  for f in $(git status --short | grep -E '^(UU|AA)' | awk '{print $2}'); do
    if [ "$f" = index.html ]; then python3 "$HERE/resolve_index.py" "$f" max; else git checkout -q --ours "$f"; fi
    git add "$f"
  done
  git diff --cached --quiet || git commit -q --no-edit
done
python3 "$HERE/merge_tests.py" $BASE $BR
# the three files whose ?v= the branches set to the number main already holds (see results/buster_table.txt): one more than main
sed -i 's|js/app.js?v=469|js/app.js?v=470|; s|js/scene.js?v=119|js/scene.js?v=120|; s|js/storage.js?v=59|js/storage.js?v=60|' index.html
node --check tests/tests.js && echo "tests.js parses"; git add -A; git commit -qm "integration trial" && git log --oneline -1
