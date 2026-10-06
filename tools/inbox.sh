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
MODE="${1:-}"
. tools/_platform.sh || { echo "⛔ tools/_platform.sh is missing — the inbox is UNCHECKED (it says where iCloud is on this machine)"; exit 2; }
# READ ON ANY BRANCH, DRAIN ON main ONLY (6 Oct, the WSL port). Two steps here WRITE to the branch that is checked out:
# the `git pull --rebase ssh main` below, and --done's rewrite of INBOX.md (whose iCloud drain markers say "logged" — true
# only once REQUESTS.md on main has his words). On any other branch — the WSL laptop's port branch, or a work branch on the
# Mac, which does sit on them (wip/…, 980-*, fu-lock-*) — the pull would drag main INTO that branch on every tick, and
# --done would clear his notes on a branch that may never ship. But NOT READING there would hide his phone notes for as long
# as a work branch is checked out (tick.sh runs this every tick). So off main: fetch, show INBOX.md AS IT IS ON ssh/main
# (the working-tree copy is that branch's, i.e. stale — "inbox empty" while his note sits on the remote, the failure this
# file's header exists to prevent) and the iCloud files, write NOTHING (not even .inbox-seen), refuse --done, and say
# "shown, NOT drained".
_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
ON_MAIN=0
if [ "$_BRANCH" = main ]; then ON_MAIN=1; fi
if [ "$ON_MAIN" = 0 ] && [ "$MODE" = "--done" ]; then
  echo "⛔ inbox.sh --done drains on main only — this checkout is on ${_BRANCH:-a detached HEAD}. Nothing marked, nothing cleared."
  echo "   Log his notes VERBATIM into REQUESTS.md on main, then run tools/inbox.sh and tools/inbox.sh --done there."
  exit 2
fi
git fetch ssh --prune -q
if [ "$ON_MAIN" = 1 ]; then
  if [ -n "$(git log --oneline HEAD..ssh/main)" ]; then
    git pull --rebase ssh main -q
    echo "↓ pulled $(git log --oneline HEAD@{1}..HEAD 2>/dev/null | wc -l | tr -d ' ') new commit(s)"
  fi
  INBOX_NAME="INBOX.md"
else
  MAIN_INBOX="$(git show ssh/main:INBOX.md)" || { echo "⛔ could not read INBOX.md on ssh/main (the reason is above) — the inbox is UNCHECKED on this branch (${_BRANCH:-a detached HEAD})."; exit 2; }
  INBOX_NAME="INBOX.md on ssh/main"
fi
# the inbox text: the file itself on main (pulled just above), ssh/main's copy anywhere else
inbox_text() { if [ "$ON_MAIN" = 1 ]; then cat INBOX.md; else printf '%s\n' "$MAIN_INBOX"; fi; }
BODY="$(inbox_text | sed -n '/^---$/,$p' | sed '1d' | sed '/^[[:space:]]*$/d')"
# A MISSING DIVIDER HIDES EVERYTHING. From 20 Sep to 26 Sep INBOX.md had no line of three dashes — the
# --done below split on the FIRST "---" in the file, which was the one inside the header's own sentence,
# and cut the divider off. Every sed above then printed nothing, so anything appended read as "inbox
# empty". Say so instead of reporting a clean inbox.
inbox_text | grep -q '^---$' || { echo "⛔ $INBOX_NAME HAS NO --- DIVIDER LINE — anything in it is invisible to this script and to next.sh. Put a line of exactly --- under the header."; exit 2; }
# WHAT WAS SHOWN is what --done may remove — nothing else. Since 26 Sep a second chat (the logging one)
# appends here while this session works, so anything written between reading the inbox and running
# --done would have been wiped unlogged by the old "clear everything". The display writes a snapshot;
# --done removes only lines in it. The --done run itself does not refresh it, or it would bless lines
# nobody has read yet. Off main nothing is written: --done cannot run there, and a snapshot of ssh/main's copy would
# outlive a branch switch and let a later --done on main clear lines nobody logged.
if [ "$ON_MAIN" = 1 ] && [ "$MODE" != "--done" ]; then sed -n '/^---$/,$p' INBOX.md | sed '1d' > .inbox-seen; fi

# SECOND CHANNEL: a plain text file in iCloud Drive. His phone can append to it in one tap and it is
# NOT a git repo, so none of the reasons not to put the project in iCloud apply — no .git to corrupt,
# no conflict copies that matter, nothing to merge. Read from the Mac, which has iCloud mounted.
# SCAN EVERY PLACE A SHORTCUT MIGHT PUT IT, not just the one it was told to use. His first real note
# landed in the SHORTCUTS app's own iCloud container as "FreeMotion-shots..txt" — the Append action was
# still pointing at the shots name and at its default folder, and the note simply vanished as far as
# this script was concerned. Making him get a path exactly right from a phone is not a system; looking
# in the obvious places is. Every candidate uses the same drain-marker rule, so reading a file twice
# cannot re-log anything.
# ⚠️ A MACHINE WITH NO iCLOUD MUST SAY SO, NOT REPORT IT EMPTY (6 Oct, the WSL port). The paths were ~/Library/Mobile
# Documents, which does not exist on Linux, so `[ -f ]` was false and this whole channel was skipped without a word —
# "inbox empty" while his phone notes sat in iCloud, the exact failure the header above forbids. The folders now come
# from tools/_platform.sh (the same paths on the Mac; FM_ICLOUD_DRIVE / FM_SHORTCUTS_DOCS elsewhere), and when either
# is missing the rest still runs and a banner says, LAST (tick.sh shows only the tail), which one went unread. BOTH
# folders, each on its own: the Shortcuts one is where his first real note landed, so FM_ICLOUD_DRIVE alone set is not
# "iCloud checked" — that read as "inbox empty" with the Shortcuts folder never opened. And the Shortcuts files are read
# even when FreeMotion-requests.txt is absent (they used to be skipped with it), with a warning that it is.
ICLOUD_SEEN=1; SC_SEEN=1
CANDS=()
if ICLOUD_DIR="$(fm_icloud_drive 2>/dev/null)"; then CANDS+=("$ICLOUD_DIR/FreeMotion-requests.txt"); else ICLOUD_DIR=""; ICLOUD_SEEN=0; fi
if SC_DIR="$(fm_shortcuts_docs 2>/dev/null)"; then CANDS+=("$SC_DIR/"*.txt); else SC_SEEN=0; fi
if [ ${#CANDS[@]} -gt 0 ]; then
  # NEVER TRUNCATE THIS FILE. Emptying it from the Mac looked like it worked and then iCloud synced the
  # phone's copy back over the top, so already-logged requests reappeared as if they were new. Deleting
  # a line here is a WRITE, and a write races the phone; appending a marker does not, because the phone
  # only ever appends too. So the file grows, and everything above the last marker is already logged.
  # `index($0, MARK)` not `/^### drained/`: his phone appends without a trailing newline, so the marker
  # can land on the END of his last line rather than on one of its own. Anchoring to the start of a line
  # missed it, and every already-logged request came back a second time.
  # ONE awk, BOTH cases. The version before this cut at the last drain marker and then piped through a
  # sed range that skipped the header line of dashes -- but that header exists once, at the top of the
  # file. After the first drain, everything new sits BELOW the marker with no dashes above it, so the
  # range never opened and every fresh request was invisible. It printed "inbox empty" while holding a
  # line I had just written to prove it worked. Keep what follows the last marker; only when there is no
  # marker at all does the header need skipping, handled in the same pass.
  DROP="$(for f in "${CANDS[@]}"; do
            [ -f "$f" ] || continue
            awk 'index($0, "### drained"){buf=""; seen=1; next}
                 {buf = buf $0 ORS}
                 END{ if (seen) { printf "%s", buf }
                      else { n=split(buf, L, ORS); go=0
                             for (i=1; i<=n; i++) { if (go) print L[i]; else if (L[i] ~ /^----*$/) go=1 } } }' "$f" \
              | sed '/^[[:space:]]*$/d'
          done)"
  [ -n "$DROP" ] && BODY="$BODY
--- from iCloud (FreeMotion-requests.txt) ---
$DROP"
fi

ALL_SEEN=1
if [ "$ICLOUD_SEEN" = 0 ] || [ "$SC_SEEN" = 0 ]; then ALL_SEEN=0; fi
if [ -z "$(printf '%s' "$BODY" | tr -d '[:space:]')" ]; then
  if [ "$ALL_SEEN" = 0 ]; then echo "$INBOX_NAME is empty — but part of iCloud was NOT checked (see the end)"
  elif [ "$ON_MAIN" = 1 ]; then echo "inbox empty"
  else echo "inbox empty — $INBOX_NAME and iCloud, read without pulling (this checkout is on ${_BRANCH:-a detached HEAD})"; fi
else
  if [ "$ON_MAIN" = 1 ]; then echo "=== UNLOGGED — move these into REQUESTS.md, then run: tools/inbox.sh --done ==="
  else echo "=== UNLOGGED — SHOWN, NOT DRAINED (this checkout is on ${_BRANCH:-a detached HEAD}; see the end) ==="; fi
  # ALREADY-LOGGED DETECTION, and it exists because it happened: a drained file came back with its old
  # lines still in it (iCloud re-synced an older copy over the drain marker), so nine requests already
  # written into REQUESTS.md were presented as new. They were caught by reading, which is exactly the
  # kind of catching that fails on the day someone is tired. A line is flagged if a distinctive run of
  # its words is already in REQUESTS.md — the file quotes him verbatim, so that is a reliable signal.
  printf '%s\n' "$BODY" | while IFS= read -r line; do
    key="$(printf '%s' "$line" | tr -d '\r' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
    # ${key:0:40}, not `cut -c1-40`: GNU/uutils cut counts BYTES, so on Linux a curly quote or emoji was split and the
    # prefix came out shorter (a looser match) than the Mac's character-counting BSD cut. bash counts characters on both.
    # Off main, REQUESTS.md here is that branch's copy and misses whatever main logged since, so ssh/main's is asked too.
    if [ ${#key} -gt 24 ] && { grep -Fq "${key:0:40}" REQUESTS.md 2>/dev/null ||
         { [ "$ON_MAIN" = 0 ] && git grep -Fq -e "${key:0:40}" ssh/main -- REQUESTS.md 2>/dev/null; }; }; then
      printf '  ⚠️ ALREADY LOGGED — do not add again: %s\n' "$key"
    else
      printf '%s\n' "$line"
    fi
  done
fi
# --done draws a line under everything above it. Append-only, so it cannot race the phone.
if [ "$MODE" = "--done" ]; then
  # Leading newline: his last line may have none, and a marker glued to the end of his text is a marker
  # on a line that also carries a request — which then gets swallowed with it.
  for f in "${CANDS[@]}"; do
    [ -f "$f" ] && printf '\n### drained %s\n' "$(date '+%Y-%m-%d %H:%M')" >> "$f"
  done
  # Split on the divider LINE, never on the first "---" anywhere: the header's own prose contained one,
  # and split('---')[0] cut the divider off (20 Sep), making the inbox invisible for six days.
  # Remove only the lines that were SHOWN (.inbox-seen, written by the last plain run or next.sh), so a
  # request appended while this session was logging survives to the next drain instead of vanishing.
  python3 - <<'PYX'
import os, re, sys
from collections import Counter
p = 'INBOX.md'; s = open(p, encoding='utf-8').read()
m = re.search(r'^---$', s, re.M)
if not m:
    print('⛔ NOTHING CLEARED: INBOX.md has no line of exactly --- ; put one under the header.'); sys.exit(1)
head, body = s[:m.end()], s[m.end():]
if not os.path.exists('.inbox-seen'):
    print('⛔ NOTHING CLEARED: no record of what you were shown. Run tools/inbox.sh, log what it lists, then --done.'); sys.exit(1)
shown = Counter(l for l in open('.inbox-seen', encoding='utf-8').read().split('\n') if l.strip())
kept = []
for l in body.split('\n'):
    if l.strip() and shown[l] > 0: shown[l] -= 1
    else: kept.append(l)
rest = re.sub(r'\n{3,}', '\n\n', '\n'.join(kept)).strip('\n')
open(p + '.tmp', 'w', encoding='utf-8').write(head + '\n\n' + (rest + '\n' if rest else ''))
os.replace(p + '.tmp', p); os.remove('.inbox-seen')
if rest:
    print('⚠️ KEPT — these arrived AFTER you read the inbox, so they are NOT logged yet. Log them next:')
    print(rest)
PYX
  if [ "$ALL_SEEN" = 1 ]; then echo "marked drained"; else echo "marked drained — only what was read; part of iCloud was NOT seen (below)"; fi
fi
# THE BANNERS GO LAST — tick.sh shows only the tail of this script.
if [ -n "$ICLOUD_DIR" ] && [ ! -f "$ICLOUD_DIR/FreeMotion-requests.txt" ]; then
  echo "⚠️ no FreeMotion-requests.txt in $ICLOUD_DIR — that file had nothing to read. Wrong folder, renamed, or not yet synced down?"
fi
if [ "$ON_MAIN" = 0 ]; then
  echo "⚠️ SHOWN, NOT DRAINED — this checkout is on ${_BRANCH:-a detached HEAD}, not main, so nothing was pulled, written or marked."
  echo "   His notes are logged and drained on main only: there, log them VERBATIM into REQUESTS.md, then tools/inbox.sh --done."
  echo "   Until then they are listed again on every run (until the PM's switch-over, the Mac is the machine on main)."
fi
if [ "$ALL_SEEN" = 0 ]; then
  if [ "$ICLOUD_SEEN" = 0 ]; then
    echo "⛔ THE iCLOUD CHANNEL IS NOT READABLE ON THIS $(fm_machine_noun) — FreeMotion-requests.txt (his one-tap phone notes) was NOT checked."
    fm_icloud_drive 2>&1 >/dev/null | sed 's/^/   /'
  fi
  if [ "$SC_SEEN" = 0 ]; then
    echo "⛔ THE SHORTCUTS iCLOUD FOLDER IS NOT READABLE ON THIS $(fm_machine_noun) — a phone note mis-aimed there (where his first one landed) was NOT checked."
    fm_shortcuts_docs 2>&1 >/dev/null | sed 's/^/   /'
  fi
  echo "   Only what is listed above was read. Drain the inbox on the Mac, or set FM_ICLOUD_DRIVE and FM_SHORTCUTS_DOCS to synced copies of both folders."
  exit 3
fi
