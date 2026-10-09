#!/bin/bash
# Self-test for tools/_livegate.sh (#1066): every answer the gate can give, against a throwaway bare remote. ship.sh runs this
# before it trusts the gate; a gate that stops refusing reads as "live is fine", which is the failure it exists to stop.
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
. "$ROOT/tools/_livegate.sh"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
fails=0
ck() { if [ "$2" = "$3" ]; then :; else echo "  ❌ $1 (wanted $3, got $2)"; fails=$((fails+1)); fi; }
has() { case "$2" in *"$3"*) :;; *) echo "  ❌ $1 (output lacks: $3)"; fails=$((fails+1));; esac; }
git init -q --bare "$T/live.git"
git clone -q "$T/live.git" "$T/a" 2>/dev/null; cd "$T/a"; git checkout -q -b main; git remote rename origin ssh
echo 1 > f; git add f; git commit -qm one; git push -q ssh main 2>/dev/null
out="$(live_gate ssh main 2>&1)"; ck "in step with live goes on" $? 0
echo 2 > f; git commit -qam two
out="$(live_gate ssh main 2>&1)"; ck "ahead of live goes on" $? 0
git clone -q "$T/live.git" "$T/b" 2>/dev/null; ( cd "$T/b"; git checkout -q main 2>/dev/null; echo other > g; git add g; git commit -qm other; git push -q origin HEAD:main 2>/dev/null )
out="$(live_gate ssh main 2>&1)"; rc=$?; ck "live moved on (diverged) is refused" $rc 1; has "the refusal says live moved on" "$out" "LIVE HAS MOVED ON"
git reset -q --hard HEAD~1; out="$(live_gate ssh main 2>&1)"; rc=$?; ck "live moved on (behind) is refused" $rc 1; has "behind: says live moved on" "$out" "LIVE HAS MOVED ON"
git pull -q ssh main 2>/dev/null; out="$(live_gate ssh main 2>&1)"; ck "after pulling live in, it goes on" $? 0
mv "$T/live.git" "$T/gone.git"
out="$(live_gate ssh main 2>&1)"; rc=$?; ck "an unreachable remote is refused" $rc 1; has "the refusal says GitHub cannot be reached" "$out" "CANNOT BE REACHED"
out="$(FM_SHIP_OFFLINE=1 live_gate ssh main 2>&1)"; rc=$?; ck "unreachable with FM_SHIP_OFFLINE=1 goes on" $rc 0; has "and says so" "$out" "FM_SHIP_OFFLINE=1"
if [ $fails = 0 ]; then echo "✅ _livegate.sh self-test passed (11 checks)"; exit 0; fi
echo "❌ _livegate.sh self-test failed ($fails)"; exit 1
