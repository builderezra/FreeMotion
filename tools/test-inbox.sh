#!/bin/bash
# ═══ inbox.sh's OWN TEST (and the inbox halves of next.sh and tick.sh) ═════════════════════════════
#
#   tools/test-inbox.sh        # seconds; a throwaway repo + a local bare "ssh" remote in a temp directory; no network
#
# WHY (6 Oct, the PM's port review, MAJOR). Off main, inbox.sh read ONLY ssh/main's committed INBOX.md. The working-tree
# INBOX.md — where the logging chat on the SAME machine appends his words, uncommitted — was never looked at, so on the
# WSL laptop's port branch (or a Mac work branch) tick.sh said "inbox empty" while his note sat in the tree; and tick's
# queue section piped next.sh through `sed -n '/^ACTIONABLE/,$p'`, which threw away next.sh's STOP banner. Both halves of
# "inbox empty while he has spoken" — the one failure the inbox exists to prevent — are run for real here.
# iCloud is pointed at temp folders (HOME on the Mac, FM_ICLOUD_DRIVE / FM_SHORTCUTS_DOCS elsewhere): his real phone
# notes are never read or marked by this test.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/fm-inbox-test-XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
FAILED=0
ok()  { printf '  ✅ %s\n' "$1"; }
bad() { printf '  ❌ %s\n' "$1"; FAILED=1; }

export HOME="$TMP/home"
mkdir -p "$HOME/Library/Mobile Documents/com~apple~CloudDocs" "$HOME/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents"
export FM_ICLOUD_DRIVE="$HOME/Library/Mobile Documents/com~apple~CloudDocs"
export FM_SHORTCUTS_DOCS="$HOME/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents"
printf 'FreeMotion requests\n-----\n' > "$FM_ICLOUD_DRIVE/FreeMotion-requests.txt"
export GIT_CONFIG_NOSYSTEM=1 GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

R="$TMP/remote.git"; S="$TMP/repo"; O="$TMP/other"
git init -q --bare "$R"
mkdir -p "$S/tools"
cp "$REPO/tools/inbox.sh" "$REPO/tools/_platform.sh" "$REPO/tools/next.sh" "$REPO/tools/tick.sh" "$REPO/tools/_shiplock.sh" "$S/tools/"
cd "$S" || exit 1
printf '# INBOX\nHis notes go below the line.\n\n---\n\n' > INBOX.md
printf '# REQUESTS\n- [ ] **1 — an old item**\n' > REQUESTS.md
echo '<span>v1.2</span>' > index.html
printf '# log\n- v1.2 — a release\n' > POLISH-LOG.md
printf '# LOOP\n' > LOOP.md
printf '.inbox-seen\n' > .gitignore
git init -q -b main . 2>/dev/null || { git init -q . && git checkout -q -b main; }
git add -A && git commit -q -m base
git remote add ssh "$R" && git push -q ssh main 2>/dev/null
git fetch -q ssh

NOTE_LOCAL="a note from his phone that only sits in THIS tree, uncommitted, logged by the other chat"
NOTE_MAIN="a note that reached main on the remote while this checkout sat on a work branch"

echo "── control: on main, a working-tree line is listed (and .inbox-seen records what was shown) ──"
printf '%s\n' "$NOTE_LOCAL" >> INBOX.md
out="$(tools/inbox.sh 2>&1)"
printf '%s' "$out" | grep -qF "$NOTE_LOCAL" && ! printf '%s' "$out" | grep -q 'inbox empty' && ok "main: the tree's line is shown, never 'inbox empty'" || bad "main control: $out"
[ -f .inbox-seen ] && grep -qF "$NOTE_LOCAL" .inbox-seen && ok "main: .inbox-seen holds what was shown" || bad "main: no .inbox-seen"
rm -f .inbox-seen
git checkout -q -- INBOX.md

echo "── off main: the WORKING TREE's INBOX.md is read as well as ssh/main's ──"
git checkout -q -b work
printf '%s\n' "$NOTE_LOCAL" >> INBOX.md          # the logging chat appends here, uncommitted
out="$(tools/inbox.sh 2>&1)"; rc=$?
printf '%s' "$out" | grep -q 'inbox empty' && bad "off main, a line in the tree's INBOX.md read as 'inbox empty': $(printf '%s' "$out" | head -3)" || ok "off main: never 'inbox empty' while the tree's INBOX.md has a line"
printf '%s' "$out" | grep -qF "$NOTE_LOCAL" && ok "off main: the tree-only line is LISTED" || bad "off main: the tree's line is not listed"
last="$(printf '%s\n' "$out" | grep -v '^[[:space:]]*$' | tail -4)"
printf '%s' "$last" | grep -q '⛔.*ONLY IN THIS TREE' && ok "off main: a ⛔ banner in the LAST lines says the line exists only in this tree (tick.sh shows the tail)" || bad "off main: no ⛔ tree-only banner at the end: $last"
[ -f .inbox-seen ] && bad "off main: inbox.sh wrote .inbox-seen" || ok "off main: inbox.sh writes no .inbox-seen"

echo "── off main: a line only on ssh/main is still listed; a line in both is listed once ──"
git clone -q "$R" "$O" 2>/dev/null && ( cd "$O" && git checkout -q main 2>/dev/null; printf '%s\n' "$NOTE_MAIN" >> INBOX.md && git commit -qam 'his note' && git push -q origin main 2>/dev/null )
out="$(tools/inbox.sh 2>&1)"
printf '%s' "$out" | grep -qF "$NOTE_MAIN" && printf '%s' "$out" | grep -qF "$NOTE_LOCAL" && ok "both: ssh/main's line AND the tree's line are listed" || bad "union: $out"
( cd "$O" && printf '%s\n' "$NOTE_LOCAL" >> INBOX.md && git commit -qam 'the same note, committed' && git push -q origin main 2>/dev/null )
out="$(tools/inbox.sh 2>&1)"
n="$(printf '%s\n' "$out" | grep -cF "$NOTE_LOCAL")"
[ "$n" = 1 ] && ok "a line in both copies is listed once" || bad "a line in both copies is listed $n times"
printf '%s\n' "$out" | grep -v '^[[:space:]]*$' | tail -4 | grep -q 'ONLY IN THIS TREE' && bad "a line that IS on ssh/main still banners as tree-only" || ok "…and once ssh/main has it, no tree-only banner"
git checkout -q -- INBOX.md
STALE="an old note this branch still carries although main drained and logged it long ago"
( cd "$O" && printf -- '- [ ] **2 — %s**\n' "$STALE" >> REQUESTS.md && git commit -qam 'logged' && git push -q origin main 2>/dev/null )
git fetch -q ssh
printf '%s\n' "$STALE" >> INBOX.md
out="$(tools/inbox.sh 2>&1)"
printf '%s' "$out" | grep -q "ALREADY LOGGED.*$STALE" && ! printf '%s' "$out" | grep -q 'ONLY IN THIS TREE.s INBOX.md —' && ok "a tree-only line already logged on ssh/main's REQUESTS.md: ALREADY LOGGED, and no ⛔ banner" || bad "stale tree line: $out"
git checkout -q -- INBOX.md

echo "── next.sh off main: it STOPs on the tree's line but writes no .inbox-seen (a snapshot --done on main would trust) ──"
printf '%s\n' "$NOTE_LOCAL" >> INBOX.md
rm -f .inbox-seen
out="$(tools/next.sh 2>&1)"; rc=$?
[ "$rc" = 2 ] && printf '%s' "$out" | grep -q 'STOP' && ok "next.sh off main: STOP (exit 2)" || bad "next.sh off main: rc=$rc"
[ -f .inbox-seen ] && bad "next.sh off main wrote .inbox-seen" || ok "next.sh off main: no .inbox-seen written"

echo "── tick.sh: next.sh's STOP banner reaches the QUEUE section (it used to be cut by sed '/^ACTIONABLE/,\$p') ──"
out="$(tools/tick.sh 2>&1)"
q="$(printf '%s\n' "$out" | sed -n '/── QUEUE/,/── PROOF DEBT/p')"
printf '%s' "$q" | grep -q 'STOP — INBOX.md IS NOT EMPTY' && ok "tick.sh's QUEUE section shows next.sh's STOP" || bad "tick.sh's QUEUE section hides the STOP: $(printf '%s' "$q" | head -4)"
git checkout -q -- INBOX.md
git checkout -q main
out="$(tools/next.sh 2>&1)"; rc=$?
[ "$rc" != 2 ] && ok "control: an empty inbox does not STOP next.sh" || bad "control: next.sh stopped on an empty inbox"

echo
if [ "$FAILED" = 0 ]; then echo "✅ inbox.sh: every check passed"; else echo "❌ inbox.sh: a check FAILED (above)"; fi
exit "$FAILED"
