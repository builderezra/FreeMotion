#!/bin/bash
# ═══ THE CLOUD PRE-FLIGHT CHECK — was THIS release given to the helper first? (his #1124, 10 Oct) ═══════════════
#
#   tools/preflight.sh     # 0 = wip/<version>-tree on GitHub holds exactly this release's app files
#                          # 4 = it does not (missing, or different files) — a WARNING for now: tools/ship-bg.sh prints it
#                          #     and launches anyway. Nothing here can change the tree or the remote.
#
# WHY. His words, 10 Oct: "Before each release, push the version to a branch so the helper can test it in the cloud
# first." The first time it was done (11 Oct) the cloud's suite found a 2.1 tree whose index.html had lost two <script>
# tags — Simple would have shipped dead — before a 2-hour laptop lock run was spent on it. But "push it first" was a
# step to remember, and the rule in CLAUDE.md is that anything that can be forgotten is made structural. So the
# launcher asks: is there a wip/<version>-tree, and is it THIS release — not an older build of it? A tree re-chained
# after the push (as 2.1 was, twice) is a different release, and the cloud's verdict on the old one says nothing.
#
# What counts: every path the release changes against HEAD (tracked edits and new files) and every path the wip tree
# changes against HEAD, minus the docs (REQUESTS.md, POLISH-LOG.md, INBOX.md, tools/design/), each compared by content.
# index.html is compared with its version label blanked: the wip tree is pushed before the bump.
# Pushed is not TESTED: whether the helper ran it is in its report (INBOX / the PM), which this cannot read.
set -uo pipefail
cd "$(dirname "$0")/.."
V="$(grep -o '>v[0-9][0-9.]*<' index.html 2>/dev/null | head -1 | tr -d '<>')"
[ -n "$V" ] || { echo "ℹ︎ preflight: no version label in index.html — nothing to check"; exit 0; }
REMOTE="${FM_PREFLIGHT_REMOTE:-ssh}"
BR="wip/$V-tree"
git remote get-url "$REMOTE" >/dev/null 2>&1 || { echo "ℹ︎ preflight: no '$REMOTE' remote here — $BR not checked"; exit 0; }
LREF="refs/preflight/$V"
git update-ref -d "$LREF" 2>/dev/null
if ! timeout 60 git fetch -q --no-tags "$REMOTE" "+refs/heads/$BR:$LREF" 2>/dev/null; then
  if timeout 30 git ls-remote --exit-code "$REMOTE" "refs/heads/$BR" >/dev/null 2>&1; then
    echo "⚠️  PREFLIGHT (#1124): $BR exists on $REMOTE but could not be fetched — not compared."
  else
    echo "⚠️  PREFLIGHT (#1124): there is no $BR on $REMOTE — the cloud helper was never given $V before this ship."
    echo "   Push it first: git push --force $REMOTE <the release's branch>:refs/heads/$BR"
  fi
  exit 4
fi
docs() { grep -vE '^(REQUESTS\.md|POLISH-LOG\.md|INBOX\.md|tools/design/)'; }
blank() { sed -E 's/>v[0-9][0-9.]*</>v</'; }
PATHS="$( { git diff --name-only --no-renames HEAD; git ls-files -o --exclude-standard; git diff --name-only --no-renames HEAD "$LREF"; } | docs | sort -u)"
DIFF=()
while IFS= read -r p; do
  [ -n "$p" ] || continue
  if [ -f "$p" ]; then
    if [ "$p" = index.html ]; then a="$(blank < "$p" | git hash-object --stdin)"; else a="$(git hash-object "$p")"; fi
  else a=gone; fi
  if git cat-file -e "$LREF:$p" 2>/dev/null; then
    if [ "$p" = index.html ]; then b="$(git show "$LREF:$p" | blank | git hash-object --stdin)"; else b="$(git rev-parse "$LREF:$p")"; fi
  else b=gone; fi
  [ "$a" = "$b" ] || DIFF+=("$p$( [ "$a" = gone ] && echo ' (not in this release)' )$( [ "$b" = gone ] && echo ' (not in the wip tree)' )")
done <<< "$PATHS"
SHA="$(git rev-parse --short "$LREF")"
N="$(printf '%s\n' "$PATHS" | grep -c .)"
if [ "${#DIFF[@]}" = 0 ]; then
  echo "✅ preflight: $BR ($SHA) is this release — the same $N app file(s). Pushed is not tested: the helper's report says that."
  exit 0
fi
echo "⚠️  PREFLIGHT (#1124): $BR ($SHA) is NOT this release — ${#DIFF[@]} of $N app file(s) differ, so the cloud tested something else:"
printf '   %s\n' "${DIFF[@]:0:8}"
[ "${#DIFF[@]}" -gt 8 ] && echo "   … and $(( ${#DIFF[@]} - 8 )) more"
echo "   Re-push the release's branch to $BR and let the helper run it before trusting its verdict."
exit 4
