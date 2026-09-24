#!/bin/bash
# ═══ THE FAILSAFE'S OWN TEST ═══════════════════════════════════════════════════════════════════════
#
#   tools/test-rollback.sh        # ~30 seconds, touches nothing outside a temp clone
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

# 9. THE VERDICT ON A BUILD OLDER THAN v16.80 IS RUN HERE, NOT JUST FOUND IN THE TEXT (queue 915 clause 5,
#    review round 1). An older build cannot read a clip reused from Add → Media, and its first launch can delete
#    the shared copy for good — the warning is the only thing between him and that. The browser suite can only
#    read this script's text, so a flipped version comparison, or a warning that could never fire, passed it.
#    v15.99 is here on purpose: its minor number is ABOVE 80, so a comparison that forgot the major fails on it.
label_now() { grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><'; }
H0="$(git rev-parse HEAD)"; L0="$(label_now)"
unchanged() { [ "$(git rev-parse HEAD)" = "$H0" ] && [ "$(label_now)" = "$L0" ] && [ -z "$(git status --porcelain)" ]; }
verdict() {   # $1 = target, $2 = warn | ok
  local out rc; out="$(./tools/rollback.sh "$1" --check 2>&1)"; rc=$?
  if [ "$2" = warn ]; then
    if [ $rc = 0 ] && printf '%s' "$out" | grep -q 'OLDER THAN v16.80' && printf '%s' "$out" | grep -q 'FIRST TIME IT OPENS'; then ok "$1 --check warns that it cannot read reused clips and can delete shared copies at its first launch"
    else bad "$1 --check did NOT warn (exit $rc) — a rollback there would blank every reused clip with no warning"; fi
  else
    if [ $rc = 0 ] && printf '%s' "$out" | grep -q '✅' && ! printf '%s' "$out" | grep -q 'OLDER THAN'; then ok "$1 --check says it can read reused clips"
    else bad "$1 --check warned (exit $rc) although it can read reused clips"; fi
  fi
}
verdict v16.79 warn
verdict v15.99 warn
verdict "$(git rev-list --max-parents=0 HEAD | tail -1)" warn   # no version label at all: decided by ancestry
verdict v16.80 ok
verdict "$L0" ok
unchanged && ok "--check touched nothing" || bad "--check changed the tree or made a commit"

# 10. …and publishing one takes the version TYPED BACK. A "y" is what every safe rollback takes, and -y is a
#     script saying yes — neither may be the keystroke that costs him clips for good.
if ./tools/rollback.sh v16.79 -y < /dev/null >"$TMP/y79.txt" 2>&1; then bad "-y published a release older than v16.80 from a script"
elif unchanged; then ok "-y does not publish a release older than v16.80 (nothing changed)"
else bad "-y was refused but the tree or history changed anyway"; fi
if command -v expect >/dev/null 2>&1; then
  expect -c 'set timeout 60; spawn ./tools/rollback.sh v16.79; expect "type v16.79 and press enter"; send "y\r"; expect eof' >"$TMP/t79y.txt" 2>&1
  if unchanged && grep -q 'stopped. Nothing was changed' "$TMP/t79y.txt"; then ok "at a terminal, a y does not publish a release older than v16.80"
  else bad "at a terminal, a y published (or started to publish) a release older than v16.80"; fi
  expect -c 'set timeout 180; spawn ./tools/rollback.sh v16.79; expect "type v16.79 and press enter"; send "v16.79\r"; expect eof' >"$TMP/t79v.txt" 2>&1
  [ "$(label_now)" = "v16.79" ] && ok "typing the version back does publish it" \
                                 || bad "typing v16.79 back did not roll back to it (the app says $(label_now)): $(tail -2 "$TMP/t79v.txt")"
  ./tools/rollback.sh "$L0" -y >/dev/null 2>&1
  [ "$(label_now)" = "$L0" ] && ok "and rolling forward to $L0 again works" || bad "could not roll forward to $L0 again (the app says $(label_now))"
else
  bad "expect is not installed, so the typed-back question cannot be exercised"
fi

echo
[ "$FAILED" = 0 ] && echo "✅ rollback.sh holds up." || echo "❌ rollback.sh is BROKEN — do not rely on it until this passes."
exit $FAILED
