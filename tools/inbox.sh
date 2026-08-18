#!/bin/bash
# Drain INBOX.md — the file Ezra writes to from his phone and nothing else writes to.
#
# WHY THIS IS A SCRIPT AND NOT A HABIT. The first time it was drained by hand, `git pull` answered
# "Already up to date" while his commit was sitting on the remote — the fetch had gone into FETCH_HEAD
# without moving the remote-tracking branch, so the local view was stale and the inbox looked empty.
# One more step down that path and he would have been told his request never arrived. A check that can
# report "nothing there" when there IS something there is worse than no check, so the fetch is forced
# and pruned here rather than left to whichever git incantation a session reaches for.
set -e
cd "$(dirname "$0")/.."
git fetch ssh --prune -q
if [ -n "$(git log --oneline HEAD..ssh/main)" ]; then
  git pull --rebase ssh main -q
  echo "↓ pulled $(git log --oneline HEAD@{1}..HEAD 2>/dev/null | wc -l | tr -d ' ') new commit(s)"
fi
BODY="$(sed -n '/^---$/,$p' INBOX.md | sed '1d' | sed '/^[[:space:]]*$/d')"

# SECOND CHANNEL: a plain text file in iCloud Drive. His phone can append to it in one tap and it is
# NOT a git repo, so none of the reasons not to put the project in iCloud apply — no .git to corrupt,
# no conflict copies that matter, nothing to merge. Read from the Mac, which has iCloud mounted.
ICLOUD="$HOME/Library/Mobile Documents/com~apple~CloudDocs/FreeMotion-requests.txt"
if [ -f "$ICLOUD" ]; then
  DROP="$(sed -n '/^----*$/,$p' "$ICLOUD" | sed '1d' | sed '/^[[:space:]]*$/d')"
  [ -n "$DROP" ] && BODY="$BODY
--- from iCloud (FreeMotion-requests.txt) ---
$DROP"
fi

if [ -z "$(printf '%s' "$BODY" | tr -d '[:space:]')" ]; then echo "inbox empty"; else
  echo "=== UNLOGGED — move these into REQUESTS.md, then clear BOTH files ==="
  printf '%s\n' "$BODY"
fi
