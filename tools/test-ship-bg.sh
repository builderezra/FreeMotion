#!/bin/bash
# ═══ THE SHIP LAUNCHER'S OWN TEST ═══════════════════════════════════════════════════════════════════
#
#   tools/test-ship-bg.sh        # seconds; touches nothing outside a temp directory
#
# WHY. tools/ship-bg.sh is how every ship starts (RULES-AUDIT B1, 6 Oct), and the lock it reads is the only witness a
# KILLED ship leaves. Each way it can be wrong is silent: a launcher that exits 0 reads as "shipped" (20 Sep), a second
# launch beside a live ship runs two suites on an 8 GB Mac, a refusal that deletes the live ship's lock makes it
# invisible, and a killed ship that reads as "running" waits for ever. So each is exercised here, against a STUB in
# place of ship.sh (it takes the lock exactly as ship.sh does, then sleeps instead of running suites) — and the REAL
# ship.sh is run too, as far as its guard: it refuses beside a live stub, and reports a dead one as KILLED.
# Nothing here can reach GitHub or a browser: the real ship.sh is stopped by its own message check long before either.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD"

# ── THIS SELF-TEST'S OWN OUTPUT MUST NOT READ AS A SHIP'S RESULT (6 Oct, the B1 check) ──
# ship.sh runs this with its stdout going into .claude/ship/ship.log, BEFORE any suite, whenever the launcher changes. It
# used to print "the previous ship's "pushed and verified" / "SHIP EXIT 0" are gone from the log" — so the log of every
# such ship, including one that then REFUSED, held the success words, and an unanchored grep (or the tail of an early
# refusal) read them as success. So the run is captured and searched for those words; it fails if any line has them.
if [ -z "${FM_SHIPBG_SELFTEST_INNER:-}" ]; then
  _self="$(mktemp "${TMPDIR:-/tmp}/fm-shipbg-self-XXXXXX")"
  FM_SHIPBG_SELFTEST_INNER=1 "$0" "$@" 2>&1 | tee "$_self"; _rc=${PIPESTATUS[0]}
  _hits="$(grep -nE 'pushed and verified|SHIP EXIT' "$_self" | cut -d: -f1 | head -5 | tr '\n' ' ')"
  rm -f "$_self"
  if [ -n "$_hits" ]; then
    printf '  ❌ %s\n' "this self-test printed a ship's success or exit words (output line(s) $_hits) — ship.sh writes this output into ship.log before any suite, where they read as a result"
    echo "❌ ship-bg.sh: a check failed — see above"; exit 1
  fi
  printf '  ✅ %s\n' "nothing this self-test printed reads as a ship's success or exit line"
  exit "$_rc"
fi
TMP="$(mktemp -d "${TMPDIR:-/tmp}/fm-shipbg-test-XXXXXX")"
STUBPID=""
kill_stub() { pkill -P "$1" 2>/dev/null; kill -9 "$1" 2>/dev/null; }
kill_took() {   # every stub that took the lock — only while that pid is still a ship.sh (a pid can be handed on)
  local p; for p in $(cat "$S/stub-took" 2>/dev/null); do ps -p "$p" -o command= 2>/dev/null | grep -q 'ship\.sh' && kill_stub "$p"; done; rm -f "$S/stub-took"; }
cleanup() { [ -n "$STUBPID" ] && kill_stub "$STUBPID"; kill_took; rm -rf "$TMP"; }
trap cleanup EXIT
FAILED=0
ok()  { printf '  ✅ %s\n' "$1"; }
bad() { printf '  ❌ %s\n' "$1"; FAILED=1; }
never0() { [ "$1" != 0 ] || bad "ship-bg.sh EXITED 0 — a launcher must never read as success"; }

S="$TMP/repo"; mkdir -p "$S/tools" "$S/.claude/ship"
cp "$REPO/tools/ship-bg.sh" "$REPO/tools/_shiplock.sh" "$S/tools/"
cat > "$S/tools/ship.sh" <<'STUB'
#!/bin/bash
# STUB ship.sh — the lock exactly as the real one takes it, then a sleep where the suites would be.
. "$(dirname "$0")/_shiplock.sh"
[ -n "${STUB_HOLD:-}" ] && while [ -f "$STUB_HOLD" ]; do :; done   # a starting line, for the same-moment cases
ship_guard || exit 1
trap '[ "$(ship_lock_pid .ship-in-progress)" = "$$" ] && rm -f .ship-in-progress; printf "REFUSED rc=%s\n" "$?" > .last-ship' EXIT
ship_phase gates
echo "$$" >> stub-took
printf 'RUNNING %s %s %s\n' "$$" v1.3 "$(date +%s)" > .last-ship
[ -f stub-refuse ] && { echo "stub: refusing on purpose"; exit 1; }
echo "stub: message is: $(head -1 "$2")"
ship_phase desktop
sleep 120
STUB
chmod +x "$S/tools/ship.sh" "$S/tools/ship-bg.sh"
cd "$S" || exit 1
git init -q . && git config user.email t@t && git config user.name t && git symbolic-ref HEAD refs/heads/main   # main, as in the real repo
echo '<span class="ver">v1.2</span>' > index.html
git add -A && git commit -q -m "v1.2 — the release that is live"
. tools/_shiplock.sh

echo "── 1. refusals that launch nothing ──"
out="$(tools/ship-bg.sh 2>&1)"; rc=$?; never0 $rc
[ "$rc" = 2 ] && [ ! -f .ship-in-progress ] && ok "no message file → exit 2, nothing launched" || bad "no message: rc=$rc, lock=$( [ -f .ship-in-progress ] && echo yes || echo no) — $out"
echo "v1.2 — the release that is live" > .claude/ship/msg.txt
out="$(tools/ship-bg.sh 2>&1)"; rc=$?; never0 $rc
[ "$rc" = 2 ] && [ ! -f .ship-in-progress ] && ok "a message HEAD already shipped with → exit 2, nothing launched" || bad "stale message: rc=$rc — $out"

echo "── 2. a launch: exit 3, the stub's pid in the lock, RUNNING, and the OLD log's success gone ──"
printf 'pushed and verified: HEAD == ssh/main (old)\nSHIP EXIT 0\n' > .claude/ship/ship.log
echo "v1.3 — the release being shipped" > .claude/ship/msg.txt
out="$(tools/ship-bg.sh 2>&1)"; rc=$?; never0 $rc
STUBPID="$(ship_lock_pid .ship-in-progress)"
[ "$rc" = 3 ] && ok "launched → exit 3" || bad "launch: rc=$rc — $out"
printf '%s\n' "$out" | grep -qxF 'LAUNCHED - NOT shipped yet; shipped is only a line starting "✅ pushed and verified: HEAD == ssh/main" in .claude/ship/ship.log AND .last-ship = PUSHED <the short hash of HEAD>' \
  && ok "prints the LAUNCHED line word for word" || bad "the LAUNCHED line is missing or reworded — $out"
[ -n "$STUBPID" ] && ship_pid_alive "$STUBPID" && ok "the lock names the live stub (pid $STUBPID), and the watch line names it: $(printf '%s' "$out" | grep -c "kill -0 $STUBPID") line(s)" || bad "no live pid in the lock: $(cat .ship-in-progress 2>/dev/null)"
case "$(cat .last-ship)" in "RUNNING $STUBPID v1.3 "*) ok ".last-ship says RUNNING $STUBPID v1.3 …";; *) bad ".last-ship is '$(cat .last-ship)'";; esac
grep -q 'pushed and verified\|SHIP EXIT 0' .claude/ship/ship.log && bad "the previous ship's success is still in ship.log — it would read as THIS ship's" || ok "the previous ship's success line and exit line are gone from the log"
sleep 1; grep -q 'phase=desktop' .ship-in-progress && ok "the phase moves on (phase=desktop)" || bad "phase did not move: $(cat .ship-in-progress)"

echo "── 3. a second launch while the first is alive is refused, and touches nothing ──"
LOCK0="$(cat .ship-in-progress)"; LAST0="$(cat .last-ship)"
out="$(tools/ship-bg.sh 2>&1)"; rc=$?; never0 $rc
[ "$rc" = 1 ] && printf '%s' "$out" | grep -q 'a ship is already running' && ok "ship-bg.sh refuses: \"a ship is already running\" (exit 1)" || bad "second launch: rc=$rc — $out"
[ "$(cat .ship-in-progress)" = "$LOCK0" ] && [ "$(cat .last-ship)" = "$LAST0" ] && ok "…and the live ship's lock and .last-ship are untouched" || bad "the second launch changed the live ship's lock or verdict"
# a message file that does not exist: if the guard were broken, the real ship.sh stops at its message check (exit 2)
# instead of going on towards a fetch — and the damage its trap does on the way out is what the next line looks for
out="$(bash "$REPO/tools/ship.sh" -F /nonexistent-message 2>&1)"; rc=$?
[ "$rc" = 1 ] && printf '%s' "$out" | grep -q 'a ship is already running' && ok "the REAL ship.sh refuses beside it too (exit 1, before its trap)" || bad "real ship.sh beside a live ship: rc=$rc — $(printf '%s' "$out" | head -3)"
[ "$(cat .ship-in-progress 2>/dev/null)" = "$LOCK0" ] && [ "$(cat .last-ship)" = "$LAST0" ] && ok "…and its refusal did not delete the live lock or overwrite RUNNING" || bad "the real ship.sh's refusal damaged the live ship's lock/verdict: lock='$(cat .ship-in-progress 2>/dev/null)' last='$(cat .last-ship)'"

echo "── 4. a KILLED ship (SIGKILL: no trap runs) reads as KILLED, not as running ──"
pkill -P "$STUBPID" 2>/dev/null; kill -9 "$STUBPID" 2>/dev/null; sleep 0.5
case "$(ship_lock_state .ship-in-progress)" in dead*) ok "lock state: $(ship_lock_state .ship-in-progress)";; *) bad "lock state after the kill: $(ship_lock_state .ship-in-progress)";; esac
st="$(ship_status_lines)"
printf '%s' "$st" | grep -q 'SHIP KILLED' && printf '%s' "$st" | grep -q 'THE LAST SHIP WAS KILLED' && ok "tick.sh's lines say SHIP KILLED and THE LAST SHIP WAS KILLED" || bad "tick lines after a kill: $st"
printf '%s' "$st" | grep -q 'SHIP RUNNING\|last ship: RUNNING' && bad "…but something still says RUNNING" || true
out="$(bash "$REPO/tools/ship.sh" -F /nonexistent-message 2>&1)"; rc=$?
printf '%s' "$out" | grep -q 'previous ship was KILLED' && ok "the REAL ship.sh says \"previous ship was KILLED\" and carries on" || bad "real ship.sh with a dead lock: $(printf '%s' "$out" | head -3)"
[ "$rc" = 2 ] && [ ! -f .ship-in-progress ] && case "$(cat .last-ship)" in "REFUSED rc=2"*) true;; *) false;; esac \
  && ok "…then refuses on its own message check (exit 2), removes ITS lock, and writes REFUSED rc=2" || bad "after carrying on: rc=$rc lock=$(cat .ship-in-progress 2>/dev/null) last=$(cat .last-ship)"
STUBPID=""

echo "── 4b. a dead ship's pid handed to an unrelated process still reads as dead (not \"running\" for ever) ──"
sleep 30 & OTHER=$!
printf 'pid=%s phase=desktop since=%s\n' "$OTHER" "$(date +%s)" > .ship-in-progress
case "$(ship_lock_state .ship-in-progress)" in dead*) ok "a lock naming a live NON-ship process (pid $OTHER, sleep) reads as dead";; *) bad "a reused pid reads as: $(ship_lock_state .ship-in-progress)";; esac
kill "$OTHER" 2>/dev/null; wait "$OTHER" 2>/dev/null; rm -f .ship-in-progress

echo "── 4c. launches at the SAME moment: one ship, one lock, one log (the lock is TAKEN, not checked and then written) ──"
kill_took
for trial in 1 2 3; do
  rm -f .ship-in-progress .ship-in-progress.* stub-took; : > .claude/ship/ship.log; touch go-hold
  ( while [ -f go-hold ]; do :; done; tools/ship-bg.sh > "$TMP/bg1" 2>&1; echo $? > "$TMP/bg1.rc" ) &
  ( while [ -f go-hold ]; do :; done; tools/ship-bg.sh > "$TMP/bg2" 2>&1; echo $? > "$TMP/bg2.rc" ) &
  sleep 0.5; rm -f go-hold; wait
  rcs="$(cat "$TMP/bg1.rc") $(cat "$TMP/bg2.rc")"; took="$(sort -u stub-took 2>/dev/null | wc -l | tr -d ' ')"
  if [ "$rcs" = "3 1" ] || [ "$rcs" = "1 3" ]; then
    [ "$took" = 1 ] && ! grep -q 'mv: rename\|^SHIP EXIT' .claude/ship/ship.log \
      && ok "trial $trial: two ship-bg.sh at once → one LAUNCHED (3), one refused (1); one ship.sh holds the lock; the log is that ship's alone" \
      || bad "trial $trial: exits $rcs but $took ship.sh took the lock; log: $(head -c 300 .claude/ship/ship.log)"
  else bad "trial $trial: two ship-bg.sh at once exited $rcs (want one 3 and one 1); $took ship.sh took the lock — $(head -c 200 "$TMP/bg1") / $(head -c 200 "$TMP/bg2")"; fi
  kill_took
done
rm -f .ship-in-progress .last-ship
same_moment() {   # $1 = how many ship.sh start at once; sets n = how many of them took the lock
  local i; rm -f stub-took "$TMP"/sm.*; touch stub-hold
  for i in $(seq 1 "$1"); do STUB_HOLD=stub-hold tools/ship.sh -F .claude/ship/msg.txt > "$TMP/sm.$i" 2>&1 & disown; done   # disowned: no "Killed" notices
  sleep 0.5; rm -f stub-hold; sleep 1
  n="$(sort -u stub-took 2>/dev/null | wc -l | tr -d ' ')"
}
same_moment 4
[ "$n" = 1 ] && ! cat "$TMP"/sm.* | grep -q 'mv: rename' && ok "four ship.sh at once, no lock → exactly one takes it" || bad "four ship.sh at once: $n took the lock — $(cat "$TMP"/sm.* | head -c 300)"
kill_took; rm -f .ship-in-progress
# a pid that is gone. NOT `sleep 30 & kill $!`: a signal that lands before the fork has exec'd sleep runs THIS script's
# EXIT trap in the child (bash 3.2) — which is cleanup, which deleted the temp repo halfway through the run.
GONE="$(bash -c 'echo $$')"
printf 'pid=%s phase=desktop since=1\n' "$GONE" > .ship-in-progress      # a KILLED ship's lock
same_moment 4
[ "$n" = 1 ] && [ "$(cat "$TMP"/sm.* | grep -c 'previous ship was KILLED')" -ge 1 ] && ok "four ship.sh at once over a KILLED ship's lock → exactly one takes it over" || bad "four over a dead lock: $n took it — $(cat "$TMP"/sm.* | head -c 300)"
kill_took; rm -f .ship-in-progress .last-ship
# the takeover mutex itself left behind by a kill (inside its few milliseconds): cleared after 5 s, not held for ever
mkdir .ship-in-progress.takeover; printf 'pid=%s phase=prove since=1\n' "$GONE" > .ship-in-progress
tools/ship.sh -F .claude/ship/msg.txt > "$TMP/stalemutex" 2>&1 & disown
for _ in $(seq 1 40); do [ -s stub-took ] && break; sleep 0.25; done
[ "$(sort -u stub-took 2>/dev/null | wc -l | tr -d ' ')" = 1 ] && [ ! -d .ship-in-progress.takeover ] && grep -q 'previous ship was KILLED' "$TMP/stalemutex" \
  && ok "a takeover mutex left by a kill is cleared after 5 s, and the dead lock is taken over" || bad "stale mutex: took=$(cat stub-took 2>/dev/null) dir=$( [ -d .ship-in-progress.takeover ] && echo left || echo gone) — $(head -c 200 "$TMP/stalemutex")"
kill_took; rm -rf .ship-in-progress .ship-in-progress.takeover .last-ship

echo "── 5. a ship that refuses at once is reported as refused (exit 1), not as launched ──"
touch stub-refuse
out="$(tools/ship-bg.sh 2>&1)"; rc=$?; never0 $rc
[ "$rc" = 1 ] && printf '%s' "$out" | grep -q 'REFUSED' && ok "immediate refusal → exit 1, with the log's tail" || bad "immediate refusal: rc=$rc — $out"
rm -f stub-refuse

echo "── 6. UNSHIPPED RELEASE (B5): from the version label and the lock, never from a dirty tree or .last-ship alone ──"
git update-ref refs/remotes/ssh/main HEAD            # "live" is the v1.2 commit
rm -f .ship-in-progress; echo "REFUSED rc=1" > .last-ship
mkdir -p tools/design/pm; echo "logging chat's notes" > INBOX.md; echo "plan" > tools/design/pm/PM-STATE.md; echo "// batch in progress" > half-done.js
l="$(unshipped_release_line)"; case "$l" in "UNSHIPPED RELEASE: NO"*) ok "dirty tree, no version bump, a REFUSED .last-ship → NO";; *) bad "dirty tree: $l";; esac
echo '<span class="ver">v1.3</span>' > index.html
l="$(unshipped_release_line)"; case "$l" in "UNSHIPPED RELEASE: YES"*v1.3*v1.2*) ok "label v1.3, live v1.2 → YES";; *) bad "bumped label: $l";; esac
echo "v1.3 — the release being shipped" > .claude/ship/msg.txt
tools/ship-bg.sh >/dev/null 2>&1; STUBPID="$(ship_lock_pid .ship-in-progress)"
l="$(unshipped_release_line)"; case "$l" in "UNSHIPPED RELEASE: IN FLIGHT"*"$STUBPID"*) ok "…while a ship is running it → IN FLIGHT (do not re-ship)";; *) bad "live ship: $l";; esac
pkill -P "$STUBPID" 2>/dev/null; kill -9 "$STUBPID" 2>/dev/null; sleep 0.5
echo '<span class="ver">v1.2</span>' > index.html
l="$(unshipped_release_line)"; case "$l" in "UNSHIPPED RELEASE: YES"*KILLED*) ok "a dead pid in .ship-in-progress → YES, even with the label equal to live";; *) bad "killed ship: $l";; esac
STUBPID=""; rm -f .ship-in-progress
echo '<span class="ver">v1.1</span>' > index.html
l="$(unshipped_release_line)"; case "$l" in *"live is AHEAD"*) ok "label behind live → NO, and says live is ahead";; *) bad "behind live: $l";; esac
echo '<span class="ver">v1.10</span>' > index.html
l="$(unshipped_release_line)"; case "$l" in "UNSHIPPED RELEASE: YES"*) ok "v1.10 is newer than v1.2 (numbers, not text)";; *) bad "v1.10 vs v1.2: $l";; esac
# COMMITTED BUT NEVER PUSHED (the B5 check). ship.sh commits, then pushes; GitHub dropped out twice on 6 Oct. A release
# with no version bump ("proof debt: …", "REQUESTS: …", a tools-only ship) left that way has labels equal to live's,
# and read "NO — v1.2 is live". It is not live. Re-shipping it stops at "nothing to commit", so the line says to push.
echo '<span class="ver">v1.2</span>' > index.html; echo '// a catching test' > proof-test.js
git add proof-test.js && git commit -qm "proof debt: a test-only release (no version bump)"; echo "REFUSED rc=1" > .last-ship
l="$(unshipped_release_line)"; case "$l" in "UNSHIPPED RELEASE: YES"*"1 commit"*"git push ssh main"*) ok "committed, push failed, no version bump → YES, and it says to push (re-shipping stops at \"nothing to commit\")";; *) bad "unpushed commit, same label: $l";; esac
echo '<span class="ver">v1.3</span>' > index.html; git commit -qam "v1.3 — committed, push failed"
l="$(unshipped_release_line)"; case "$l" in "UNSHIPPED RELEASE: YES"*"2 commit"*"git push ssh main"*) ok "…and with a version bump committed too: YES, push (not \"ship it\")";; *) bad "unpushed v1.3: $l";; esac
git checkout -q -b some-feature
l="$(unshipped_release_line)"; case "$l" in "UNSHIPPED RELEASE: YES"*"git push"*) bad "a feature branch's own commits read as an unpushed release: $l";; *) ok "control: on a branch that is not main, commits ahead of live are not an unpushed release";; esac
git checkout -q main
tools/ship-bg.sh >/dev/null 2>&1; STUBPID="$(ship_lock_pid .ship-in-progress)"
l="$(unshipped_release_line)"; case "$l" in "UNSHIPPED RELEASE: IN FLIGHT"*"$STUBPID"*) ok "…while a ship is running over them → IN FLIGHT (its push will carry them)";; *) bad "unpushed commits, live ship: $l";; esac
kill_stub "$STUBPID"; STUBPID=""; sleep 0.3; rm -f .ship-in-progress
git update-ref refs/remotes/ssh/main HEAD
l="$(unshipped_release_line)"; case "$l" in "UNSHIPPED RELEASE: NO"*) ok "control: once ssh/main has them → NO";; *) bad "pushed: $l";; esac

echo "── 7. every instruction that says what SHIPPED means quotes the success line whole, from the start of the line ──"
# The words alone are also in this self-test's history and in comments; only ship.sh's own line, with ✅ and
# "HEAD == ssh/main", is the result — and with .last-ship's PUSHED <hash>, the two-part rule.
for f in CLAUDE.md LOOP.md tools/tick.sh; do
  loose="$(grep -n 'pushed and verified' "$REPO/$f" | grep -v '✅ pushed and verified: HEAD == ssh/main' | cut -d: -f1 | tr '\n' ' ')"
  [ -z "$loose" ] && ok "$f: every mention is the whole line (✅ … HEAD == ssh/main)" || bad "$f line(s) $loose name the success words without the rest of the line"
done
grep -n 'Build during ships' "$REPO/LOOP.md" | grep -q 'PUSHED <hash>' \
  && ok "LOOP.md: the build-during-ships merge waits for .last-ship's PUSHED <hash> too, not the log's words alone" || bad "LOOP.md's build-during-ships merge condition does not name .last-ship's PUSHED <hash>"

echo
if [ "$FAILED" = 0 ]; then echo "✅ ship-bg.sh: every check passed"; exit 0; fi
echo "❌ ship-bg.sh: a check failed — see above"; exit 1
