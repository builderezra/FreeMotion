#!/bin/bash
# ═══ THE SHIP IDLE READER'S OWN TEST (#1133) ═══════════════════════════════════════════════════════
# Seconds; throwaway repos only. A fresh helper worktree used to be invisible during a ship.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/fm-shipidle-test-XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
FAILED=0
ok()  { printf '  ✅ PASS %s\n' "$1"; }
bad() { printf '  ❌ FAIL %s\n' "$1"; FAILED=1; }
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
export PYTHONDONTWRITEBYTECODE=1
export FM_WORKTREE_ROOTS=""

setup() {
  S="$TMP/$1/repo"; W="$TMP/$1/registered"; ROOT="$TMP/$1/helper root"; H="$ROOT/task"
  mkdir -p "$S/tools" "$S/js"
  cp "$REPO/tools/_shipidle.sh" "$REPO/tools/_classify.py" "$S/tools/" || exit 1
  printf '# REQUESTS\n- [ ] **1 — build this item**\n' > "$S/REQUESTS.md"
  printf '// work\n' > "$S/js/work.js"
  git init -q "$S" && git -C "$S" add -A && git -C "$S" commit -qm base || exit 1
}
worktree() { git -C "$S" worktree add -q -b work "$W" || exit 1; }
old_tree() {
  local tree="$1" gd
  gd="$(git -C "$tree" rev-parse --absolute-git-dir)" || exit 1
  touch -d '30 minutes ago' "$tree/js/work.js" "$tree/tools/_shipidle.sh" "$tree/tools/_classify.py" "$gd/logs/HEAD" || exit 1
}
run_reader() {
  out="$(bash "$S/tools/_shipidle.sh" "$S" 15 2>&1)"; rc=$?
  [ "$rc" = 0 ] && printf '%s\n' "$out" | grep -q '^   next workable (oldest first): .*build this item' \
    && ! printf '%s\n' "$out" | grep -q 'Traceback\|classifier could not say' || bad "reader setup: rc=$rc — $out"
}
idle30() {
  printf '%s\n' "$out" | grep -q '^⚠️ IDLE DURING SHIP: 30 min since the last worktree edit' \
    && printf '%s\n' "$out" | grep -q '^   newest edit in a worktree: 30 min ago ('
}
active_file() {
  ! printf '%s\n' "$out" | grep -q 'IDLE DURING SHIP' \
    && printf '%s\n' "$out" | grep -qF "newest edit in a worktree: 0 min ago ($1)"
}

echo '── a. a registered worktree, all edits 30 minutes old ──'
setup a; worktree; old_tree "$W"; run_reader
idle30 && ok 'a: registered worktree is idle for 30 min' || bad "a: $out"

echo '── b. the same worktree, js touched now ──'
touch "$W/js/work.js"; run_reader
active_file "$W/js/work.js" && ok 'b: fresh js is named, never idle' || bad "b: $out"

echo '── c. a separate clone has a fresh helper worktree ──'
old_tree "$W"
git init -q "$TMP/helper" && git -C "$TMP/helper" commit -qm base --allow-empty \
  && git -C "$TMP/helper" worktree add -q -b helper "$H" || exit 1
mkdir -p "$H/js"; printf '// helper\n' > "$H/js/work.js"
old_tree_helper_log="$(git -C "$H" rev-parse --absolute-git-dir)/logs/HEAD"
touch -d '30 minutes ago' "$old_tree_helper_log" || exit 1
export FM_WORKTREE_ROOTS="$ROOT"
# Give the old reader an old legacy tree, so this is a timed idle verdict, not an empty-tree shortcut.
mkdir -p "$S/.claude/worktrees/legacy/js"
printf '// old\n' > "$S/.claude/worktrees/legacy/js/work.js"
touch -d '30 minutes ago' "$S/.claude/worktrees/legacy/js/work.js" || exit 1
run_reader
active_file "$H/js/work.js" && ok 'c: external helper js is named, never idle' || bad "c: $out"

echo '── CONTROL: the old reader must miss the SAME fresh helper ──'
# The OLD reader is pinned to v18.07 (75cacf0e), the last release that walked .claude/worktrees only. Not HEAD: once #1133
# lands, HEAD's reader IS the fixed one, and a CONTROL read from HEAD would refuse every later ship that touches tick.sh.
if git -C "$REPO" show 75cacf0e:tools/_shipidle.sh > "$TMP/old-shipidle.sh"; then
  old_out="$(bash "$TMP/old-shipidle.sh" "$S" 15 2>&1)"; old_rc=$?
  [ "$old_rc" = 0 ] && printf '%s\n' "$old_out" | grep -q '^⚠️ IDLE DURING SHIP: 30 min since' \
    && ok 'CONTROL: old reader falsely reports idle beside fresh helper js' || bad "CONTROL: old reader did not expose the bug: $old_out"
else
  bad 'CONTROL: could not read HEAD:tools/_shipidle.sh'
fi

echo '── d. a helper commit counts even when every work file is old ──'
git -C "$H" add js/work.js && git -C "$H" commit -qm helper || exit 1
touch -d '30 minutes ago' "$H/js/work.js" || exit 1
run_reader
active_file "$old_tree_helper_log" && ok 'd: helper HEAD reflog is named, never idle' || bad "d: $out"

echo '── e. a main-checkout-only edit does not count ──'
export FM_WORKTREE_ROOTS=""
setup e; worktree; old_tree "$W"
touch "$S/js/work.js"; run_reader
idle30 && ok 'e: fresh main js leaves the registered worktree idle' || bad "e: $out"

echo '── f. no worktrees ──'
setup f; run_reader
printf '%s\n' "$out" | grep -q '^⚠️ IDLE DURING SHIP: there is no worktree with a file in it — make one and build: .*build this item' \
  && ! printf '%s\n' "$out" | grep -q 'newest edit in a worktree' \
  && ok 'f: the dedicated no-worktree line survives' || bad "f: $out"

echo '── g. a missing external root is silent ──'
setup g; worktree; old_tree "$W"; run_reader; baseline="$out"
export FM_WORKTREE_ROOTS="$TMP/does-not-exist"
run_reader
[ "$out" = "$baseline" ] && idle30 && ok 'g: missing root gives the same idle output' || bad "g: $out"

echo
if [ "$FAILED" = 0 ]; then echo '✅ shipidle: every check passed'; else echo '❌ shipidle: a check FAILED (above)'; fi
exit "$FAILED"
