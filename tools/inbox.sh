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
# SCAN EVERY PLACE A SHORTCUT MIGHT PUT IT, not just the one it was told to use. His first real note
# landed in the SHORTCUTS app's own iCloud container as "FreeMotion-shots..txt" — the Append action was
# still pointing at the shots name and at its default folder, and the note simply vanished as far as
# this script was concerned. Making him get a path exactly right from a phone is not a system; looking
# in the obvious places is. Every candidate uses the same drain-marker rule, so reading a file twice
# cannot re-log anything.
ICLOUD="$HOME/Library/Mobile Documents/com~apple~CloudDocs/FreeMotion-requests.txt"
if [ -f "$ICLOUD" ]; then
  # NEVER TRUNCATE THIS FILE. Emptying it from the Mac looked like it worked and then iCloud synced the
  # phone's copy back over the top, so already-logged requests reappeared as if they were new. Deleting
  # a line here is a WRITE, and a write races the phone; appending a marker does not, because the phone
  # only ever appends too. So the file grows, and everything above the last marker is already logged.
  # `index($0, MARK)` not `/^### drained/`: his phone appends without a trailing newline, so the marker
  # can land on the END of his last line rather than on one of its own. Anchoring to the start of a line
  # missed it, and every already-logged request came back a second time.
  DROP="$(for f in "$HOME/Library/Mobile Documents/com~apple~CloudDocs/FreeMotion-requests.txt" \
                   "$HOME/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents/"*.txt; do
            [ -f "$f" ] || continue
            awk 'index($0, "### drained"){buf=""; next}{buf = buf $0 ORS} END{printf "%s", buf}' "$f" \
              | sed -n '/^----*$/,$p' | sed '1d' | sed '/^[[:space:]]*$/d'
          done)"
  [ -n "$DROP" ] && BODY="$BODY
--- from iCloud (FreeMotion-requests.txt) ---
$DROP"
fi

if [ -z "$(printf '%s' "$BODY" | tr -d '[:space:]')" ]; then echo "inbox empty"; else
  echo "=== UNLOGGED — move these into REQUESTS.md, then run: tools/inbox.sh --done ==="
  printf '%s\n' "$BODY"
fi
# --done draws a line under everything above it. Append-only, so it cannot race the phone.
if [ "$1" = "--done" ]; then
  # Leading newline: his last line may have none, and a marker glued to the end of his text is a marker
  # on a line that also carries a request — which then gets swallowed with it.
  for f in "$HOME/Library/Mobile Documents/com~apple~CloudDocs/FreeMotion-requests.txt" \
           "$HOME/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents/"*.txt; do
    [ -f "$f" ] && printf '\n### drained %s\n' "$(date '+%Y-%m-%d %H:%M')" >> "$f"
  done
  python3 - <<'PYX'
import re
p='INBOX.md'; s=open(p,encoding='utf-8').read()
open(p,'w',encoding='utf-8').write(s.split('---')[0] + '---\n\n')
PYX
  echo "marked drained"
fi
