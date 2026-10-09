#!/bin/bash
# replay_batch.sh <worktree at origin/main> <sha> [<sha> ...]
# Brings ChatGPT's commits in the way tools/design/chatgpt-tasks/pile/LAND-LIST.md says (never a union-merge of tests.js):
#   source: cherry-pick -n; a conflict in index.html keeps main's side (busters are set once per batch afterwards);
#   tests.js: each commit's own added lines are appended before `async function run()`, nothing else.
# Prints REAL CONFLICT and stops if a non-test, non-index file conflicts. Then: set the busters, retag item 'TBD', run the tests.
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$1"; shift
for c in "$@"; do
  echo "== $c $(git log -1 --format=%s "$c" | cut -c1-80)"
  git cherry-pick -n "$c" >/dev/null 2>&1
  for f in $(git diff --name-only --diff-filter=U); do
    case $f in tests/tests.js) ;; index.html) python3 "$HERE/ours_html.py" ;; *) echo "  REAL CONFLICT in $f"; exit 1 ;; esac
  done
  if git show --format= --name-only "$c" | grep -q "tests/tests.js"; then git checkout -q HEAD -- tests/tests.js; python3 "$HERE/addtests.py" "$c"; fi
  git add -A . >/dev/null 2>&1; git reset -q -- outside 2>/dev/null
  git -c user.email=a@b -c user.name=replay commit -qm "replay $c" --no-verify
done
