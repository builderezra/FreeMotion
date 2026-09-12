#!/bin/bash
# ═══ PUT FREEMOTION BACK TO AN EARLIER RELEASE — the answer to "what if an AI wrecks the code?" ═══
#
# His question, 12 Sep: "whats the fail safe if an ai fucks up all the code? how do i undo what they did"
#
# THE SHORT ANSWER: every release is a commit, every commit is pushed to GitHub, and nothing is ever
# deleted. So any release can be put back. This script is that, as one command, because the real answer
# has to be usable at the moment it is needed — which is the moment he is annoyed and does not want a
# git tutorial.
#
#   tools/rollback.sh                 list the last releases, newest first
#   tools/rollback.sh v16.12          put the app back to exactly how it was at v16.12, and push it live
#   tools/rollback.sh 35c1fe7         …or by commit id, if a version is not what you have
#
# ⚠️ WHAT IT DOES NOT TOUCH: HIS PROJECTS. They live in localStorage and IndexedDB on the device, not in
# this repo — a rollback changes the app's code, never his work. He cannot lose a project this way.
#
# ⚠️ IT NEVER REWRITES HISTORY. It makes a NEW commit that restores the old files, so the record of what
# happened stays intact and there is no force-push. Roll back the rollback the same way if need be.
set -uo pipefail
cd "$(dirname "$0")/.."

if [ $# -eq 0 ]; then
  echo "The last releases, newest first. Roll back with:  tools/rollback.sh <version>"
  echo
  # BSD sed on macOS has no `t` branch the way GNU does — awk is the portable answer, and this script
  # has to work on HIS machine at the moment he needs it, not on a Linux box.
  git log --format='%h %s' -25 | awk '{ v=""; if ($2 ~ /^v[0-9]+\.[0-9]+$/) v=$2;
      line=""; for(i=2;i<=NF;i++) line=line $i " ";
      if (v != "") printf("  %-8s (%s)  %.60s\n", v, $1, line); else printf("  %-8s (%s)  %.60s\n", "·", $1, line); }'
  echo
  echo "The version the app is on right now: $(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')"
  exit 0
fi

WANT="$1"
# a version like v16.12 → the commit whose message starts with it; otherwise treat it as a commit id
if printf '%s' "$WANT" | grep -qE '^v?[0-9]+\.[0-9]+$'; then
  V="$(printf '%s' "$WANT" | sed 's/^v//')"
  HASH="$(git log --format='%H %s' | grep -m1 -E "^[0-9a-f]+ v$V( |—|$)" | cut -d' ' -f1)"
  [ -n "$HASH" ] || { echo "❌ no release called v$V in the history. Run tools/rollback.sh with no arguments to see the list."; exit 1; }
else
  HASH="$(git rev-parse --verify "$WANT^{commit}" 2>/dev/null)" || { echo "❌ '$WANT' is not a version or a commit id."; exit 1; }
fi

SUBJ="$(git log -1 --format='%s' "$HASH" | cut -c1-90)"
echo "→ putting the app back to:  $SUBJ"
echo "   (commit $HASH)"

# ── ASK BEFORE PUBLISHING, BECAUSE THE NEXT STEP IS PUBLIC ───────────────────────────────────────
# One argument and this commits AND pushes to the URL his installed app updates from. A mistyped version
# silently republishes the wrong build. One keystroke is not a tutorial, and it is the difference between
# a tool you can run while annoyed and a tool you can run while annoyed AND wrong. `-y` skips it for a
# script; a non-interactive shell skips it too rather than hanging forever.
if [ "${2:-}" != "-y" ] && [ -t 0 ]; then
  printf '   this will PUBLISH that version to https://builderezra.github.io/FreeMotion/\n'
  printf '   type y and press enter to go ahead (anything else stops): '
  read -r ANS
  case "$ANS" in y|Y|yes|YES) ;; *) echo "→ stopped. Nothing was changed."; exit 0;; esac
fi

if [ -n "$(git status --porcelain)" ]; then
  STASH="rollback-safety-$(date +%s)"
  echo "→ there are uncommitted changes; parking them first as a stash called $STASH (nothing is lost)"
  git stash push -u -m "$STASH" >/dev/null || { echo "❌ could not park the current changes. Nothing has been rolled back."; exit 1; }
  echo "   get them back later with:  git stash list   then   git stash pop"
fi

git checkout "$HASH" -- . || { echo "❌ could not restore those files. Nothing is committed."; exit 1; }

# ── HIS RECORD DOES NOT TRAVEL BACKWARDS ─────────────────────────────────────────────────────────
# `git checkout <hash> -- .` restores EVERY tracked file, which includes REQUESTS.md — his running list
# of everything he has asked for. Rolling the code back to v16.12 would also rewind that list to what it
# said at v16.12, silently dropping every request logged since. Losing a logged request is the precise
# failure REQUESTS.md exists to prevent, so the record files are put straight back to their current
# committed state. The CODE goes back; the notes keep going forward.
for keep in REQUESTS.md POLISH-LOG.md INBOX.md; do
  [ -f "$keep" ] && git checkout HEAD -- "$keep" 2>/dev/null
done
# ── AND THE WORKSHOP STAYS AT TODAY, WHICH IS NOT A PREFERENCE — IT IS THE FAILSAFE SURVIVING ────
# 🚨 CAUGHT BY RUNNING THIS SCRIPT FOR REAL, IN A THROWAWAY CLONE, ON 12 SEP. Rolling back to v16.12
# DELETED tools/rollback.sh. Every release in the history predates the commit that added this script,
# so "restore the files that existed then, remove the ones added since" removes the very tool you are
# standing in — the next `./tools/rollback.sh` after a rollback said "no such file or directory".
# That is the SAME fault the discoverability probes found hours earlier (the script was untracked, so
# `git clean -fd` and its own `git stash -u` would eat it) arriving from the opposite direction, which
# is worth stating plainly: the failsafe must be the one thing a rollback cannot take away.
# tools/ is the workshop, not the product. What he is putting back is the app his phone loads; the
# scripts that do the putting-back have no business travelling with it.
git checkout HEAD -- tools 2>/dev/null || true

# ── AND FILES ADDED SINCE THAT RELEASE ARE REMOVED ───────────────────────────────────────────────
# `checkout <hash> -- .` restores what existed THEN; it does not delete what was added SINCE. Without
# this the tree is a mixture — the old index.html plus newer orphaned modules — which is not "exactly
# how it was", and a leftover file is exactly the sort of thing that reads as "the rollback did not work".
git ls-tree -r --name-only HEAD | while IFS= read -r f; do
  case "$f" in REQUESTS.md|POLISH-LOG.md|INBOX.md|tools/*|README.md|CLAUDE.md) continue;; esac
  git cat-file -e "$HASH:$f" 2>/dev/null || rm -f "$f"
done

if [ -z "$(git status --porcelain)" ]; then echo "✅ already identical to that release — nothing to do."; exit 0; fi

git add -A
git commit -q -m "ROLLBACK to $SUBJ

Put the app's files back to $HASH. Nothing was deleted from the history — this is a new
commit that restores the old content, so the rollback itself can be rolled back.
His projects are untouched: they live in localStorage / IndexedDB on the device, not here." || { echo "❌ commit failed."; exit 1; }

git push ssh main -q || { echo "⚠️  rolled back locally but the PUSH FAILED — the live site is unchanged. Try: git push ssh main"; exit 1; }
if [ "$(git rev-parse HEAD)" = "$(git rev-parse ssh/main)" ]; then
  echo "✅ rolled back and pushed. The live site updates in about a minute:"
  echo "   https://builderezra.github.io/FreeMotion/"
  echo "   the app now says: $(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')"
else
  echo "⚠️  the push did not land — HEAD and ssh/main differ. The live site is unchanged."
fi
