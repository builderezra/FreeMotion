#!/bin/bash
# ═══ THE FAILSAFE'S OWN TEST ═══════════════════════════════════════════════════════════════════════
#
#   tools/test-rollback.sh        # ~15 seconds, touches nothing outside a temp clone
#
# WHY THIS EXISTS. `tools/rollback.sh` is the answer to his question "whats the fail safe if an ai
# fucks up all the code?" — and on the day it was written it broke TWICE, in opposite directions:
#   · it was UNTRACKED, so `git clean -fd` (the usual reflex while clearing up an AI's mess) deleted
#     it, and its own `git stash push -u` would have swept it into a stash on first real use;
#   · then the fix that made the restore exact removed it from the other side — every release predates
#     the commit that added it, so "delete files added since the target" deleted the tool you are
#     standing in. `./tools/rollback.sh` afterwards said "no such file or directory".
# Both were found by ad-hoc probing, not by anything in the repo. By this project's own doctrine
# (CLAUDE.md: "when something important goes wrong, do not write a reminder — remove the possibility")
# the disaster-recovery tool being the one script with no test was the real defect.
#
# ⚠️ IT CANNOT TOUCH THE LIVE SITE. Everything happens in a throwaway clone whose `ssh` and `origin`
# remotes are re-pointed at a local bare repo, so the push inside rollback.sh is real — which is the
# point, it is the step that has to be exercised — and goes nowhere near GitHub.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD"
TMP="$(mktemp -d -t fm-rollback-test)"
trap 'rm -rf "$TMP"' EXIT
FAILED=0
ok()   { printf '  ✅ %s\n' "$1"; }
bad()  { printf '  ❌ %s\n' "$1"; FAILED=1; }

echo "── setting up a throwaway clone (the live site cannot be reached from it) ──"
git init -q --bare "$TMP/fake.git"
git clone -q "$REPO" "$TMP/work" 2>/dev/null || { echo "❌ could not clone"; exit 1; }
cd "$TMP/work"
# the script under test is the WORKING COPY's, not HEAD's — this must catch a fault before it ships
cp "$REPO/tools/rollback.sh" tools/rollback.sh
git add tools/rollback.sh && git commit -q -m "fixture: the rollback.sh under test"
git remote remove ssh 2>/dev/null; git remote remove origin 2>/dev/null
git remote add ssh "$TMP/fake.git"; git push -q ssh HEAD:main; git fetch -q ssh

TARGET="$(git log --format='%s' -60 | grep -oE '^v[0-9]+\.[0-9]+' | sed -n '6p')"
[ -n "$TARGET" ] || { echo "❌ could not find a release to roll back to"; exit 1; }
BEFORE="$(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')"
echo "── rolling $BEFORE back to $TARGET ──"
./tools/rollback.sh "$TARGET" -y > "$TMP/out.txt" 2>&1 || bad "rollback.sh exited non-zero: $(tail -2 "$TMP/out.txt")"

# 1. the app really is that release
NOW="$(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')"
[ "$NOW" = "$TARGET" ] && ok "the app is back to $TARGET" || bad "the app says $NOW, expected $TARGET"

# 2. THE FAILSAFE SURVIVED ITS OWN USE — the bug that shipped on 12 Sep
[ -x tools/rollback.sh ] && ok "tools/rollback.sh still exists and is executable" \
                         || bad "tools/rollback.sh DELETED ITSELF — the failsafe does not survive one use"
./tools/rollback.sh >/dev/null 2>&1 && ok "it can be run again immediately" \
                                    || bad "it cannot be run a second time"
[ -f README.md ] && ok "README.md survived" || bad "README.md was deleted by the rollback"

# 3. …AND SO DID ITS INSTRUCTIONS. CLAUDE.md exists in every old release, so a plain restore
#    OVERWRITES it and strips the paragraph that tells the next session the tool exists.
if grep -q 'rollback.sh' CLAUDE.md; then ok "CLAUDE.md kept its rollback section"
else bad "CLAUDE.md was rewound — the docs telling the next AI the failsafe exists are gone"; fi

# 4. his record did not travel backwards
if [ "$(git show "$(git rev-parse HEAD~1)":REQUESTS.md 2>/dev/null | wc -l)" -le "$(wc -l < REQUESTS.md)" ]; then
  ok "REQUESTS.md did not shrink"
else bad "REQUESTS.md travelled backwards — logged requests were lost"; fi

# 5. ship.sh is not jammed afterwards — the version label, the newest log line and the stamp agree
LOG="$(grep -o '^- v[0-9]\+\.[0-9]\+' POLISH-LOG.md | tail -1 | sed 's/^- //')"
REQ="$(grep -o 'at v[0-9][0-9.]*' REQUESTS.md | head -1 | sed 's/^at //')"
[ "$LOG" = "$TARGET" ] && ok "POLISH-LOG's newest line is $TARGET (ship.sh's gate passes)" \
                       || bad "POLISH-LOG's newest line is $LOG but the app is $TARGET — ship.sh will refuse to release"
[ "$REQ" = "$TARGET" ] && ok "REQUESTS.md's stamp is $TARGET (ship.sh's gate passes)" \
                       || bad "REQUESTS.md is stamped $REQ but the app is $TARGET — ship.sh will refuse to release"

# 6. orphan removal still works on an APP file
echo "// added after the target" > js/rollback-test-orphan.js
git add js/rollback-test-orphan.js && git commit -q -m "v99.99 — fixture that must be removed"
./tools/rollback.sh "$TARGET" -y >/dev/null 2>&1
[ -f js/rollback-test-orphan.js ] && bad "a file added after the target survived the rollback" \
                                  || ok "a file added after the target was removed"

# 7. history intact, and the rollback is reversible
git cat-file -e "$(git rev-list --all | tail -1)" 2>/dev/null && ok "history is intact — nothing was destroyed"
./tools/rollback.sh "$BEFORE" -y >/dev/null 2>&1
BACK="$(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')"
[ "$BACK" = "$BEFORE" ] && ok "rolling forward again restores $BEFORE — the rollback is reversible" \
                        || bad "could not roll forward again (got $BACK)"

# 8. it refuses to publish when nothing can answer a yes/no
if ./tools/rollback.sh "$TARGET" < /dev/null >"$TMP/noty.txt" 2>&1; then
  bad "it published with no tty and no -y — an agent can pull the failsafe silently"
else ok "it refuses to publish when there is no one to ask (and no -y)"; fi

echo
[ "$FAILED" = 0 ] && echo "✅ rollback.sh holds up." || echo "❌ rollback.sh is BROKEN — do not rely on it until this passes."
exit $FAILED
