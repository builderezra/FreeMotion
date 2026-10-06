#!/bin/bash
# Ship a release, structurally — every gate is checked here so none can be skipped.
#
#   tools/ship.sh "<commit message>"
#   tools/ship.sh -F <file>          # …or read the message from a file / from - for stdin
#
# A ship outlasts every harness timeout, so it is LAUNCHED, not called: write the message to .claude/ship/msg.txt and run
# tools/ship-bg.sh (exit 3 = launched, NOT shipped). The verdict is .claude/ship/ship.log (a line starting
# "✅ pushed and verified: HEAD == ssh/main", then one starting "SHIP EXIT <rc>") and .last-ship (PUSHED <hash> ==
# git rev-parse --short HEAD). See CLAUDE.md, "SHIPS AND SUITES". Nothing printed before the push may carry those words:
# the self-tests below print into the same log (tools/test-ship-bg.sh checks its own output for them).
#
# Refuses to push unless: the tree is not mid-mutation, the suite is fully green, the version label
# and the newest POLISH-LOG entry agree, and the push actually landed. That last one matters —
# `origin` is an HTTPS URL with no stored credentials and fails with "could not read Username", so
# success is confirmed by comparing HEAD to ssh/main rather than by trusting the push output.
# A red suite was pushed once by running the tests and the commit in the same breath; not possible now.
set -uo pipefail
# ⚠️ A SHIP'S VERDICT IS A FILE, NOT SCROLLBACK (20 Sep). This script exits 1 on every refusal and says
# exactly why — and on 20 Sep none of that reached the session that called it. Two reasons, both
# structural rather than careless:
#   1. THE DOCUMENTED WAY TO CALL IT EATS THE EXIT CODE. CLAUDE.md's own timeout section shows
#      `tools/ship.sh "…" 2>&1 | tail -60`, and a pipeline's status is the LAST command's — so the
#      caller reads TAIL's 0, never this script's 1. `pipefail` above governs pipelines INSIDE this
#      script; it cannot reach out and fix the caller's pipe.
#   2. This script routinely lands in the BACKGROUND (same section), where its verdict is one line
#      somewhere in an output file a later session may never read.
# On 20 Sep the phone pass timed out, this script printed "Nothing committed or pushed" and exited 1,
# and the harness reported "completed (exit code 0)". A refusal that reads as a success is the worst
# way for a gate to fail, because the next session ships on top of a release that never landed.
# The EXIT trap covers EVERY path — including the ones that exit long before this line is reached by
# any future edit — so it is a gate rather than another place to remember to write.
# ⚠️ ONE EXIT HANDLER, NOT TWO. A second `trap … EXIT` REPLACES the first — it does not add to it — and
# the first version of this fix learned that the hard way: the cleanup trap further down silently threw
# this one away, so the very release that added .last-ship never wrote one. Everything that must happen
# on the way out lives in this one function.
SHIPPED=0
_WHY=""            # a refusal may be the repo working as INTENDED (see the docs-only batch gate) — say which
_verdict() {
  _rc=$?
  # only OUR lock: a refusal must never delete the lock of a ship that is still running (see the guard below)
  [ "$(ship_lock_pid .ship-in-progress)" = "$$" ] && rm -f .ship-in-progress
  { if [ "${SHIPPED:-0}" = 1 ]; then printf 'PUSHED %s\n' "$(git rev-parse --short HEAD 2>/dev/null)"
    elif [ -n "${_WHY:-}" ]; then printf 'REFUSED rc=%s %s\n' "$_rc" "$_WHY"
    else printf 'REFUSED rc=%s\n' "$_rc"; fi; } > .last-ship 2>/dev/null
}
# ⚠️ ONE SHIP AT A TIME, CHECKED BEFORE THE TRAP (6 Oct, RULES-AUDIT B1). A ship now runs for well over an hour,
# detached (tools/ship-bg.sh), so "is one already running?" is a real question — and it must be answered BEFORE the
# trap below exists, because _verdict's cleanup on a refusal would delete the running ship's lock and overwrite its
# .last-ship. A lock whose pid is gone is a KILLED ship (a kill skips every trap): said, and carried on from.
. "$(dirname "$0")/_shiplock.sh"
ship_guard || exit 1
trap _verdict EXIT
# A signal ENDS the ship. With `trap _verdict EXIT INT TERM` the handler ran on a TERM and the script then CARRIED ON —
# it had deleted its own lock and went on towards the commit and the push with nothing on disk saying a ship was
# running. Exiting runs the one EXIT handler above (see the note: one handler), which records rc=130 / rc=143.
trap 'exit 130' INT
trap 'exit 143' TERM
# The lock carries this ship's pid and phase, and .last-ship says RUNNING until a verdict replaces it — so a KILL,
# which runs no trap at all, leaves "RUNNING <pid>" behind with that pid gone, and tick.sh reads exactly that as KILLED.
ship_phase gates
printf 'RUNNING %s %s %s\n' "$$" "$(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')" "$(date +%s)" > .last-ship 2>/dev/null
# The answers that differ between the Mac and Linux/WSL (load, cores, the JS parser, which Chrome to reap) come from ONE
# sourced file, and the suite's time cap from the other (6 Oct, the WSL port). After the trap, so even this refusal is
# recorded in .last-ship. bash does not stop on a failed `.`, hence the explicit check.
. "$(dirname "$0")/_platform.sh" || { echo "❌ tools/_platform.sh is missing — the gates below cannot ask this machine anything"; exit 1; }
. "$(dirname "$0")/_testfloor.sh" || { echo "❌ tools/_testfloor.sh is missing — the suite gates cannot run"; exit 1; }
. "$(dirname "$0")/_shipgates.sh" || { echo "❌ tools/_shipgates.sh is missing — the gates below cannot run"; exit 1; }
# ⚠️ ONLY THE MAC SHIPS — UNTIL THE PM SAYS OTHERWISE (6 Oct, his words: "The Mac is STILL the only machine that ships or
# pushes to main"). The WSL laptop has this repo, a loop to run and a CLAUDE.md that says "ship an unshipped tree" on a new
# chat's first message — so the rule is a gate, not a sentence. The PM lifts it at the switch-over, once both full passes are
# green there; FM_SHIP_ALLOW_NON_MAC=1 is that decision, and a session must not set it on its own.
if [ "$(fm_os)" != Darwin ] && [ "${FM_SHIP_ALLOW_NON_MAC:-}" != 1 ]; then
  echo "❌ THIS IS NOT THE MAC — only the Mac ships or pushes main until the PM moves shipping to this $(fm_machine_noun)."
  echo "   Nothing is committed or pushed. The work stays in this tree; ship it from the Mac."
  _WHY="not the shipping machine ($(fm_os)) — only the Mac ships until the PM's switch-over"
  exit 1
fi
# ⚠️ THE MESSAGE CAN COME FROM A FILE, AND FOR ANYTHING WITH CODE IN IT, IT SHOULD (25 Aug).
# Backticks inside a double-quoted shell argument are COMMAND SUBSTITUTION, not code quotes. The gate
# below has guarded that since a message containing `void ic.offsetWidth` executed it and committed the
# hole where the explanation should have been.
# ⚠️ **BUT THAT GATE CANNOT FIRE IN THE CASE THAT ACTUALLY HAPPENS, and it took v12.53 to notice.**
# The CALLER's shell performs the substitution BEFORE this script is invoked, so by the time `$1` gets
# here the backticks and the text between them are already gone — there is nothing left to detect. The
# gate only ever catches backticks that survived quoting, e.g. inside single quotes. v12.53 shipped with
# "reasons about , which" in its log: the word `statics` was executed as a command and deleted, the
# terminal said "command not found: statics", and this gate stayed silent because it was structurally
# incapable of speaking. A safeguard that reads like protection and cannot fire is worse than none,
# because it stops you being careful.
# The only real fix is to stop passing prose through a shell argument at all, so: -F <file> (or -F - for
# stdin) reads the message as bytes and nothing interprets it.
FROM_FILE=0
if [ "${1:-}" = "-F" ]; then
  FROM_FILE=1
  [ -n "${2:-}" ] || { echo "ship: -F needs a file (or - for stdin)"; exit 2; }
  if [ "$2" = "-" ]; then MSG="$(cat)"; else
    [ -f "$2" ] || { echo "ship: no such message file: $2"; exit 2; }
    MSG="$(cat "$2")"
  fi
else
  MSG="${1:-}"
fi
[ -n "$MSG" ] || { echo "ship: needs a commit message"; exit 2; }
# …and the gate applies ONLY to the argument form. On the -F path nothing interprets the bytes, so a
# backtick there is an ordinary code quote and refusing it would break the very route that is safe.
if [ "$FROM_FILE" = "0" ]; then
  case "$MSG" in
    *'`'*) echo "❌ the commit message contains a backtick, which the shell will execute and delete."
           echo "   Pass the message with: tools/ship.sh -F <file>   (nothing interprets it then)"; exit 2;;
  esac
fi
[ -f .mutation-in-progress ] && { echo "❌ a mutation check is still in progress — refusing to ship a mutated tree"; exit 1; }
# ⚠️ A SHIP RUNS ON main (6 Oct, the PM's port review). It commits on whatever branch is checked out and then pushes `main`:
# from a work branch it would run ~90 minutes of suites, commit there, push whatever LOCAL main holds (its unpushed
# commits included) and end "PUSH DID NOT LAND". rollback.sh and inbox.sh --done already refuse off main for this reason;
# FM_SHIP_ALLOW_NON_MAC (the switch-over) makes the WSL port branch a place this could now be run from. Said in a second.
if ! on_main; then
  echo "❌ THIS CHECKOUT IS ON $(git symbolic-ref --short -q HEAD 2>/dev/null || echo 'a detached HEAD'), NOT main — a ship commits here and pushes main."
  echo "   Nothing is committed or pushed. Bring the work onto main (merge it uncommitted, so prove.sh sees it), then ship."
  _WHY="not on main — a ship commits on main and pushes main"
  exit 1
fi
# LIVE MUST NOT BE AHEAD OF THIS TREE (queue 1066, 5 Oct). Another tool pushed to ssh/main (ChatGPT's v17.22, f7716576) while
# this tree still sat on v17.21 with its own unshipped work also labelled v17.22. Nothing here looked at the remote until the
# push, so a ship would have spent ~90 minutes on two suite passes and then been rejected as non-fast-forward. So: fetch
# first and refuse in one second if live is not in this tree's history.
# ⚠️ AND IF GITHUB CANNOT BE REACHED, REFUSE TOO (6 Oct). It used to warn and carry on, on the grounds that the push verifies
# at the end. But on 6 Oct github.com dropped out from this Mac twice in one night (03:14 and 03:50, ssh and https both), and a
# ship launched into that spends ~90 minutes on two suite passes for a push that cannot land. Worse, a fetch with no time limit
# HANGS rather than fails when the network half-answers, and the ship would sit there. So the fetch gets 15 seconds to connect,
# and an unreachable remote stops the ship before anything runs. FM_SHIP_OFFLINE=1 says "commit locally anyway, I know".
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o ConnectTimeout=15 -o ServerAliveInterval=10 -o ServerAliveCountMax=3}"
if git fetch -q ssh 2>/dev/null; then
  if ! git merge-base --is-ancestor ssh/main HEAD; then
    echo "❌ LIVE HAS MOVED ON: ssh/main ($(git rev-parse --short ssh/main)) is not in this tree's history (HEAD $(git rev-parse --short HEAD))."
    echo "   Bring it in first — commit this work to a branch (no stash, no clean), fast-forward main to ssh/main, re-apply it"
    echo "   (git cherry-pick --no-commit <branch>), renumber if the versions collide. Shipping now would run the whole suite and then fail at the push."
    exit 1
  fi
elif [ "${FM_SHIP_OFFLINE:-}" = "1" ]; then
  echo "⚠️  could not reach GitHub (ssh) — FM_SHIP_OFFLINE=1, so carrying on; the push at the end will fail and the commit stays local"
else
  echo "❌ GITHUB CANNOT BE REACHED (git fetch ssh failed or took over 15 s to connect). The push at the end would fail after ~90"
  echo "   minutes of suite passes. Wait until this answers 200, then ship:  curl -s -m 8 -o /dev/null -w '%{http_code}' https://github.com"
  echo "   (FM_SHIP_OFFLINE=1 tools/ship.sh ... commits locally anyway.)"
  exit 1
fi
# A SPOT-CHECK AND A SHIP DO NOT SHARE THE MACHINE (5 Sep). Two headless suites at once starve the timing-sensitive tests: a
# two-commit spot-check running under the v15.71 ship's phone pass flaked test 699 ("the CONTROL swipe moved nothing") and cost
# the whole ship. spotcheck.sh holds .spotcheck-in-progress while it runs and refuses while this lock exists; same here.
[ -f .spotcheck-in-progress ] && { echo "❌ a spot-check is running (.spotcheck-in-progress) — its suite slices would contend with this ship's; wait for it"; exit 1; }

# ⚠️ REAP ORPHANED HEADLESS CHROMES BEFORE ANY SUITE RUN (20 Sep, and it cost two ships in one evening).
# tests/_cdp.py reaps at startup but DELIBERATELY stands down whenever another _cdp.py is alive, because
# killing a live ship's browser is worse than leaving a dead one (its own note records doing exactly that
# to 8 processes). prove.sh then fires a dozen sequential runs in seconds — which is precisely the window
# where run N's browser is still dying as run N+1 starts, so the reaper never fires and orphans pile up
# DURING THE PROOF ITSELF. The symptom is never "Chrome is broken": it is app-state nonsense inside a
# test — "FM.glintRing is not a function", "the bar would not open", "the badge cannot be observed" — on
# a tree whose FULL suite is green at both widths. It happened twice on 20 Sep, to v16.22 and then to
# v16.23, and believing either red would have meant rewriting three correct tests.
# Safe here and nowhere else: this runs before ship.sh starts anything, and the two locks above have
# already established that no other run owns this tree.
# "Another run is alive" means a PYTHON running _cdp.py (fm_driver_pattern, 6 Oct — the PM's review): `pgrep -f '_cdp\.py'`
# also matched a shell waiting on one, and THIS script when its commit message names _cdp.py, and then reaped nothing,
# silently. Standing down now names who it stood down for.
_DRV_ALIVE=""
command -v pgrep >/dev/null 2>&1 && _DRV_ALIVE="$(fm_pgrep_args "$(fm_driver_pattern)" 2>/dev/null | head -3)"
if ! command -v pgrep >/dev/null 2>&1; then
  echo "⚠️  pgrep is not installed — orphaned headless Chromes cannot be found or reaped before this run"
elif [ -n "$_DRV_ALIVE" ]; then
  echo "⚠️  not reaping orphaned test Chromes — a suite run is alive: $(printf '%s' "$_DRV_ALIVE" | cut -c1-140 | tr '\n' '|')"
else
  # ⚠️ MATCH THE CHROME BINARY, NOT THE BARE PROFILE PREFIX. `pgrep -f 'fm-cdp-'` also matches any
  # SHELL whose command line happens to carry that string — including this script if someone ever
  # ships a commit message containing it, in which case pkill would kill the ship mid-flight. That is
  # the same self-matching shape as the pgrep wait-loop that span for hours on 1 Sep (CLAUDE.md), so
  # the pattern is anchored to the thing actually being reaped: a headless Chrome on an fm-cdp profile.
  # The pattern is per-OS (fm_chrome_reap_pattern): the Mac's 'Google Chrome.*fm-cdp-' matched 0 of the 14 processes of
  # a Linux Chrome (argv[0] /opt/google/chrome/chrome), so on Linux this reaped nothing, silently (6 Oct).
  if _PAT="$(fm_chrome_reap_pattern)"; then
    _ORPH="$(pgrep -f "$_PAT" 2>/dev/null | wc -l | tr -d ' ')"
    if [ "${_ORPH:-0}" -gt 0 ]; then
      pkill -9 -f "$_PAT" 2>/dev/null || true
      echo "→ reaped $_ORPH orphaned headless Chrome process(es) left by an interrupted run (they make a green tree read RED)"
    fi
  else
    echo "⚠️  no Chrome reap pattern for this platform — orphaned headless Chromes are NOT reaped before this run"
  fi
fi
# .ship-in-progress was written at the top (ship_phase gates) and is removed by _verdict() — deliberately NOT its own trap.

# ⚠️ DO NOT START A HALF-HOUR RUN ON A MACHINE THAT CANNOT FINISH IT (21 Sep). The timeout diagnosis (_whyslow, below)
# explains a stall AFTER it has cost 30 minutes. Twice on 21 Sep the machine was already visibly unable before a single
# test ran: once a Spotlight/Photos indexing storm, once an 8GB Mac with 8GB of swap in use and a load average of 63 —
# and the suite's own headless Chrome is what tipped it over, so retrying made it worse. A 1-minute load above three
# times the core count is past anything a green ship has ever run at (they run at 4-8 on 6 cores); refuse up front, say
# why, and name the cure. FM_SHIP_IGNORE_LOAD=1 is the deliberate override.
# THE BAR IS 1.6× THE CORE COUNT, AND IT WAS SET BY MEASUREMENT (21 Sep, 6 cores). Ships that STALLED (not one test run in
# 30 minutes) started at load 13.4 and 12.1; every green ship that day started between 3 and 8. A swap-used bar was tried
# as well and DISPROVEN the same evening: a run at 9.1GB of swap and load ~4 went all the way through. Swap-used is
# history — macOS does not shrink it when the machine goes idle — while load is what is happening now.
# The number lives in fm_load_bar (tools/_platform.sh) so tick.sh quotes the same one. It is UNMEASURED on WSL's vCPUs.
# ⚠️ AND A LOAD THAT CANNOT BE READ IS A REFUSAL, NOT A PASS (6 Oct). This used to read `sysctl … 2>/dev/null` with an
# empty result skipping the check and `|| echo 4` for the cores — on Linux both sysctl keys error, so the gate switched
# itself off on every ship there, silently. If the machine cannot be measured, say so and stop; the override stays.
if [ -z "${FM_SHIP_IGNORE_LOAD:-}" ]; then
  if ! _NCPU="$(fm_ncpu)" || ! _LOAD1="$(fm_load1)" || ! _BAR="$(fm_load_bar)"; then
    echo "❌ CANNOT MEASURE THIS $(fm_machine_noun)'S LOAD (the reason is above) — refusing rather than starting a half-hour run blind."
    echo "   Nothing is wrong with the code. FM_SHIP_IGNORE_LOAD=1 tools/ship.sh … is the deliberate override."
    _WHY="cannot measure machine load — not a code fault"
    exit 1
  fi
  if LC_ALL=C awk -v l="$_LOAD1" -v b="$_BAR" 'BEGIN{exit !(l+0 > b+0)}'; then
    _SWAP="$(fm_swap_summary)"
    if [ "$(fm_os)" = Darwin ]; then
      echo "❌ THE MAC IS TOO BUSY TO RUN THE SUITE — load average ${_LOAD1} on ${_NCPU} cores (green ships start at 3-8; stalled ones at 12+)."
      echo "   swap: ${_SWAP}"
      echo "   Nothing is wrong with the code. A heavily swapping or throttling Mac stalls the suite for 30 minutes and then"
      echo "   times out; starting it anyway only adds a headless browser to the pile. Wait for the load to fall, or free memory"
      echo "   (quit apps not in use, or restart if swap is several GB), then ship again."
    else
      echo "❌ THIS $(fm_machine_noun) IS TOO BUSY TO RUN THE SUITE — load average ${_LOAD1} on ${_NCPU} cores, over the bar of ${_BAR}"
      echo "   (1.6x the cores — measured on the 6-core Mac, not yet on this machine)."
      echo "   swap: ${_SWAP}"
      echo "   Nothing is wrong with the code. Starting the suite anyway only adds a headless browser to the pile."
      fm_slow_hint | sed 's/^/   /'
    fi
    _WHY="machine overloaded (load ${_LOAD1} on ${_NCPU} cores) — not a code fault"
    exit 1
  fi
  # …and when it PASSES on WSL, say what it could not see (6 Oct, the PM's review): the load above is the VM's, and the
  # usual WSL stalls (Defender, the Search indexer, Vmmem short of memory) are on the Windows side. One line, never silent.
  fm_load_blind_note
fi

# ⚠️ EVERY CHANGED SCRIPT MUST PARSE, AND THIS IS SAID IN ONE SECOND RATHER than after the proof step (25 Sep, v16.97).
# Six hunt branches were stitched into tests/tests.js by a naive "ours then theirs" merge, which dropped one `});` per
# seam; nothing noticed until prove.sh had spent its time and every test came back "FMTests did not load". A parse costs
# a second with the JavaScriptCore that ships with macOS. Plain scripts only — this app has no modules.
# ⚠️ IT USED TO VANISH WHERE THERE IS NO jsc (6 Oct). The whole block sat inside `if [ -x jsc ]`, so on Linux a broken
# js/ file went straight on to the proof and the suite — the exact v16.97 failure. fm_js_parse asks the same question
# (`new Function(source)`) of jsc on the Mac and node elsewhere — not `node --check`, which passes `export` and top-level
# `await`, both syntax errors in a classic <script>. No parser at all is a refusal.
_BADJS=""
# (a git that cannot answer is a refusal, not "no script changed" — changed_js_files in tools/_shipgates.sh, 6 Oct review)
_JSFILES="$(changed_js_files)" || { echo "❌ git could not list the changed scripts (above) — cannot prove they parse, so not shipping them."; _WHY="git could not list the changed files"; exit 1; }
if [ -n "$_JSFILES" ] && ! fm_js_parser >/dev/null; then
  echo "❌ NO JAVASCRIPT PARSER on this machine (jsc or node) — cannot prove the changed scripts parse, so not shipping them."
  _WHY="no JavaScript parser on this machine — not a code fault"
  exit 1
fi
for _f in $_JSFILES; do
  [ -f "$_f" ] || continue
  _r="$(fm_js_parse "$_f")"
  [ "$_r" = "ok" ] || _BADJS="$_BADJS
   $_f: $_r"
done
if [ -n "$_BADJS" ]; then
  echo "❌ A CHANGED SCRIPT DOES NOT PARSE — the app or the suite would not even load:$_BADJS"
  _WHY="a changed script does not parse"
  exit 1
fi

# ⚠️ A RELEASE CANNOT RUN WITHOUT A LOCAL SERVER, AND THE OLD FAILURE WAS DISCOVERED TOO LATE (queue 814,
# 6 Sep). `tests/_cdp.py` does not start one — it expects port 8777 to be serving — and when nothing was,
# a ship spent its whole proof step and then died at the suite with "Connection refused", having proved
# five tests and shipped nothing. The proof step is the expensive half, so the check belongs BEFORE it,
# and a missing server is not a decision anybody needs to make: start one. Started detached, from the
# repo root, and left running — the suite, the probes and the browser pane all want the same thing.
#
# 🚨 AND IT MUST BE `tools/serve.sh`, NOT `python3 -m http.server` (queue 865, 20 Sep). The stdlib
# server's `request_queue_size` is **5**, and this page pulls 71 scripts while test 497 fetches every
# source file — so the accept queue overflows and the kernel refuses the surplus. MEASURED against the
# server this line used to start: **7 of 40 parallel requests failed**, all 40 succeeded serially, and
# 0 of 60 fail against serve.sh. A refused script load does not arrive as a network error: it arrives
# as `FM.loadingDot is missing`, as `no #loading-dot to check`, and as test 497 announcing that seven
# element ids "exist nowhere in the markup or the code" while all seven were on disk. Three red tests
# in one run, every one blaming the app for a dropped connection. **So every green run was luck and
# every red one had to be re-read before it could be believed** — which is the most expensive kind of
# broken instrument, and exactly the class of fault this file exists to remove.
# …AND A BROWSER, ASKED THE SAME WAY tests/_cdp.py ASKS (6 Oct): $FM_CHROME, the Mac app, google-chrome on PATH. Without
# one the proof step would come back NORUN test by test; this says it in a second.
if ! fm_chrome >/dev/null; then
  echo "❌ no Chrome to run the suite in (the reason is above). Nothing is committed or pushed."
  _WHY="no Chrome on this machine — not a code fault"
  exit 1
fi
# …and the driver's one third-party module (6 Oct, the PM's review): a fresh Ubuntu has none, and the first suite run would
# end "DID NOT RUN" half an hour into a ship instead of here, in a second.
if ! python3 -c 'import websocket' >/dev/null 2>&1; then
  echo "❌ the Python module websocket-client is not installed — tests/_cdp.py cannot talk to Chrome. Nothing is committed or pushed."
  echo "   Linux: sudo apt install python3-websocket    Mac: pip3 install websocket-client"
  _WHY="websocket-client missing on this machine — not a code fault"
  exit 1
fi
if ! curl -sf -o /dev/null "http://localhost:8777/tests/run.html"; then
  echo "→ nothing is serving port 8777 — starting one (the suite does not start its own)…"
  nohup "$(dirname "$0")/serve.sh" 8777 >/dev/null 2>&1 </dev/null &
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    sleep 0.5
    curl -sf -o /dev/null "http://localhost:8777/tests/run.html" && break
  done
  if ! curl -sf -o /dev/null "http://localhost:8777/tests/run.html"; then
    echo "❌ could not start a server on port 8777, and the suite cannot run without one. Nothing is committed or pushed."
    exit 1
  fi
  echo "   server up ✅"
fi
# A TEST TITLE WITH A DOUBLE QUOTE IS REFUSED HERE, IN A SECOND, NOT BY THE SUITE TEN MINUTES IN (5 Sep). The suite's own
# hygiene test catches it — after prove.sh and a full pass — and it caught two in one afternoon (791, then 624), each
# costing a whole ship. The rule is the suite's; this only moves it to the front of the line.
# `[^']`, not `[^'\n]` (6 Oct): inside brackets `\n` is a backslash and the letter n, not a newline — measured on GNU grep,
# `test('an "x" y'` slipped through, i.e. any title with an n in it (2264 of 2286). grep matches one line at a time, so
# excluding the newline was never needed. And ANCHORED to a declaration (the PM's review): dq_titles in tools/_shipgates.sh,
# where tools/test-port.sh runs it against a regex `.test('…"…')` line that the unanchored pattern refused every ship on.
_DQ="$(dq_titles tests/tests.js)"
[ -z "$_DQ" ] || { echo "❌ a test title contains a double quote — the FAIL line would be cut short in ship.sh and mutate.sh; use single quotes:"; echo "$_DQ" | cut -c1-160; exit 1; }

# ─── NO NUL BYTES IN SOURCE (28 Aug) ────────────────────────────────────────────────────────────────
# A NUL byte in a text file makes grep treat the WHOLE FILE as binary and print NOTHING for it — not an
# error, not "binary file matches", just silence. `grep -n "function program" js/gl-warp.js` returned
# nothing on a file that plainly contained it, which reads exactly like "that code does not exist".
# This repo is navigated by grep; CLAUDE.md tells every session to use it.
# It has cost something once already, in a different direction: js/compositor.js built a cache key with
# NUL separators, `"$(cat file)"` truncates at the first NUL, so both arguments to a mutation collapsed
# to the same prefix and mutate.sh announced "SURVIVED — the assertion is DEAD" against a perfectly good
# test. A gate was added to catch that symptom; this removes the cause.
# \u001f (unit separator) does every job a NUL was doing in those cache keys and is invisible to none of
# the tools. So: no NUL in shipped source, ever, and the check refuses rather than reminds.
# ⚠️ THE FIRST VERSION OF THIS CHECK FELL INTO THE VERY TRAP IT GUARDS. It searched with
# `grep -qU "$(printf '\000')"` — and command substitution truncates at the first NUL, so the pattern
# was the EMPTY STRING, which matches every file and therefore flags none of them usefully. Measured on
# a file built to contain one: "DETECTOR DOES NOT WORK". Python reads bytes and cannot be fooled.
NULBAD="$(git ls-files -m -o --exclude-standard | python3 -c '
import sys, os
for f in sys.stdin.read().split(chr(10)):
    if not f or not os.path.isfile(f): continue
    if not f.endswith((".js", ".html", ".css", ".md", ".py", ".sh")): continue
    try:
        if b"\x00" in open(f, "rb").read(): print(f)
    except OSError: pass
')"
if [ -n "$NULBAD" ]; then
  echo "❌ these files contain a NUL byte, which makes grep go SILENT on the whole file:"
  printf '   %s\n' $NULBAD
  echo "   Replace it with '\u001f' (unit separator) — same separator job, and grep can still read the file."
  exit 1
fi

# ⏱️ BATCH GATE — the biggest drain on his TIME, measured 27 Aug and hard to argue with: 99 commits in
# 20 hours, 51 of them touching NO app code, 38 version releases. Every one ran the suite (~8-9 min for
# a code change, which runs it twice; ~4 for docs). That is roughly TEN of those twenty hours spent
# watching a progress bar instead of working.
# His words: "you are barely using my usage up and seemingly doing updates very slow ... I leave you on
# even more than I used to and the usage is less". He was right, and this is the reason.
# LOOP.md rule 15 already said work 3-5 items then ship ONCE. Remembering it failed, so it is a gate:
# a DOCS-ONLY ship within 12 minutes of the last commit is refused, forcing notes to accumulate into
# one release rather than one suite run per sentence. CODE ships are never blocked -- a real fix must
# always be able to go out. Override with BATCH=0 for a genuine one-off.
if [ "${BATCH:-1}" = "1" ]; then
  _changed="$(git status --porcelain | awk '{print $2}')"
  if ! echo "$_changed" | grep -qE '^(js/|styles[.]css|index[.]html|tests/)'; then
    _last=$(git log -1 --format=%ct 2>/dev/null || echo 0)
    _age=$(( $(date +%s) - _last ))
    if [ "$_age" -lt 720 ]; then
      echo "⏱️  DOCS-ONLY SHIP REFUSED — last commit was $((_age/60))m ago, needs 12m."
      echo "   Every ship runs the suite. On 27 Aug, 51 of 99 commits were docs-only: hours of waiting"
      echo "   for nothing. Keep writing notes and let them ride out with the next real change."
      echo "   Nothing is lost -- the working tree keeps them. (BATCH=0 tools/ship.sh ... to override.)"
      # Tell .last-ship WHY, because "REFUSED" alone makes the next tick shout that the tree is a broken
      # unshipped release when it is nothing of the kind — this gate is the repo working as intended and
      # the right response is to carry on, not to investigate. An alarm that cries wolf gets ignored,
      # which would cost the real refusals this file exists to surface.
      _WHY="batched — docs-only, riding out with the next real change"
      exit 1
    fi
  fi
fi

# An edit that did not apply must not be able to ship. tools/apply.py leaves this marker when an
# anchor fails to match, because edits chained with `;` fail INVISIBLY — v13.25 announced a
# measurement table in the summary, in the commit and to Ezra, and it was never in the tree.
if [ -f .edit-failed ]; then
  echo "❌ an edit FAILED TO APPLY and was never resolved — refusing to ship a release that claims it:"
  sed "s/^/   /" .edit-failed
  echo "   → fix the edit (or rm .edit-failed if it is genuinely stale), then ship again"
  exit 1
fi

# Anchored to the LABEL element, not the first version-shaped string in the file — a bare grep
# matched "v5.49" in a comment on line 5 and would have blocked every release.
VER="$(grep -o 'class="ver"[^>]*>v[0-9]\+\.[0-9]\+' index.html | grep -o 'v[0-9]\+\.[0-9]\+' | head -1)"
LOG="$(grep -o '^- v[0-9]\+\.[0-9]\+' POLISH-LOG.md | tail -1 | sed 's/^- //')"
[ -n "$VER" ] || { echo "❌ could not read the version label out of index.html — fix this gate before shipping"; exit 1; }
[ "$VER" = "$LOG" ] || { echo "❌ index.html says $VER but the newest POLISH-LOG entry is $LOG — write the log entry first"; exit 1; }
# No log line may appear TWICE. On 6 Sep the log was found carrying v2.31..v15.00 twice: at v15.00 a bad append glued
# a second copy of the whole file onto its own last line, and for 79 releases nothing noticed, because every check here
# reads only the newest line. Whole lines, not version numbers: thirteen versions legitimately have two differently
# worded lines. A doubled log is a doubled record he reads; refuse it.
DUPL="$(grep '^- v' POLISH-LOG.md | sort | uniq -d | cut -c1-12 | head -3 | tr '\n' ' ')"
[ -z "$DUPL" ] || { echo "❌ POLISH-LOG.md carries the same line more than once ($DUPL…) — the log has been doubled; remove the stale copy"; exit 1; }

# ---- THE COMMIT MESSAGE MUST NAME THE VERSION IT IS ACTUALLY SHIPPING (27 Aug) ----------------
# This gate exists because the history lied once. A release was started, and while its suite was
# running — four to eight minutes — the tree was edited again for the NEXT release. ship.sh commits
# with `git add -A` AFTER the suite passes, so the newer work was swept into the older commit: the
# message said v13.64 and described thumbnails, while the files inside it said v13.65 and carried a
# wordmark fix and an intro fix. Nothing was broken in the app and everything was pushed; what took
# the damage was the record, which is the thing both of us read to work out what changed and why.
# The version label in index.html is the truth about what a commit CONTAINS. If the subject line
# names a version at all, it has to agree with it.
# ⚠️ Only the SUBJECT (first line) is checked, and only when it names a version. Prose in the body
# legitimately cites old versions ("shipped at v12.31"), and a docs-only commit ("notes: …") names
# none — neither is a mismatch.
SUBJ="$(printf '%s' "$MSG" | head -1)"
MSGVER="$(printf '%s' "$SUBJ" | grep -o 'v[0-9]\+\.[0-9]\+' | head -1)"
if [ -n "$MSGVER" ] && [ "$MSGVER" != "$VER" ]; then
  echo "❌ the commit subject says $MSGVER but index.html says $VER."
  echo "   These must agree, or the history describes a release it does not contain."
  echo "   The usual cause: the tree was edited while an earlier ship's suite was still running,"
  echo "   so this commit is about to sweep up work that belongs to a later version."
  echo "   Fix the subject, or finish the in-flight release first."
  exit 1
fi

# The newest POLISH-LOG entry names the queue items it closes, e.g. "(queue 209)". If any of them is
# still an OPEN checkbox in REQUESTS.md, the release is about to go out with the item untick — which
# is the exact failure REQUESTS.md exists to prevent, and it happened on v8.19 when a tick script
# threw before writing and the push went ahead anyway.
LOGLINE="$(grep -n '^- v[0-9]' POLISH-LOG.md | tail -1 | cut -d: -f2-)"
# A release often ADVANCES an entry without closing it. That is legitimate and must not be silently
# waved through either, so it has to be declared: write "queue 202 (partial)" and the gate skips that
# number. Anything written as a plain "queue N" is a claim that N is finished, and is checked.
# tr, because the membership test below is ` $PARTIALS ` against `*" $q "*` — a SPACE-separated
# match. sort -u emits NEWLINES, so " 125\n202\n95 " contained " 95 " and nothing else: every declared
# partial except the last one in sort order was ignored and the gate blocked a correctly-declared
# release. Found by it refusing v9.26 three times over an entry that had declared all three properly.
PARTIALS="$(printf '%s' "$LOGLINE" | grep -o 'queue [0-9]\+ (partial)' | grep -o '[0-9]\+' | sort -u | tr '\n' ' ')"
for q in $(printf '%s' "$LOGLINE" | grep -o 'queue [0-9]\+' | grep -o '[0-9]\+' | sort -u); do
  case " $PARTIALS " in *" $q "*) continue;; esac
  if grep -q "^- \[ \] \*\*$q " REQUESTS.md || grep -q "^- \[ \] \*\*$q —" REQUESTS.md; then
    echo "❌ POLISH-LOG says this release closes queue $q, but #$q is still OPEN in REQUESTS.md."
    echo "   Tick it before shipping, or drop it from the log entry if it is not actually done."
    exit 1
  fi
done
# ---- OLDEST FIRST, ENFORCED (26 Aug) ------------------------------------------------------------
# WHY. CLAUDE.md has said "work the list oldest first" for weeks, in its own section, with his words in
# it: "Remember I want the oldest things in the list done first, not what I just told you, make sure you
# figure out a way to remember if you keep forgetting." On 26 Aug v12.69 shipped #556, #557 and #558
# while #474, #524, #539, #545, #548 and #550 sat ACTIONABLE and untouched — six items jumped, by the
# session that had just re-read the rule, and then v12.70 jumped #474 again while writing this gate.
# NOTHING WAS WRONG WITH THE TOOLING. next.sh printed the right answer both times. The answer was simply
# not obeyed, because obeying it was a thing to REMEMBER — and "figure out a way to remember" is, by his
# own later instruction, the wrong shape of fix: "every safe guard needs to be structural."
# It is easy to get wrong for two reasons that do not go away: an item parked on a decision FEELS blocked
# even when the tool says READY, and a request he typed yesterday feels more urgent than one from three
# weeks ago. So the check refuses rather than reminds.
# `next_up` lives in tools/_classify.py beside classify(), because next.sh, status.sh and this gate are
# three readers of ONE rule — and this file's own history says a rule in two places is the most expensive
# bug shape in the project. It has self-tests, and the run above refuses if any of them break.
# ⚠️ AND THE LIST OF WHAT THIS RELEASE CLOSES IS READ FROM THE DIFF, NOT FROM THE LOG LINE (29 Aug).
# The line below used to be the ONLY source, and it greps for the words "queue 651". That is a rule
# about PHRASING. Five releases in a row wrote "#651" instead — v14.31, v14.34, v14.35, v14.36,
# v14.37 — so CLOSES came back EMPTY and this gate, added on 26 Aug precisely because obeying the
# order was "a thing to remember", matched nothing and passed everything. It fired on v14.32 and
# v14.33 only because those log lines happened to quote a code comment containing "queue 650", which
# is worse than not firing: it looked alive.
# This file's own header already names the shape — "a safeguard that reads like protection and cannot
# fire is worse than none, because it stops you being careful" — about the backtick check. Same bug,
# second instance, so the fix is the same one: ask the question of something that cannot be phrased
# around. An item is closed by this release exactly when its checkbox goes `- [ ]` -> `- [x]` in
# REQUESTS.md. `closed_in_diff` lives in tools/_classify.py beside the rest, and is self-tested there,
# so this cannot quietly stop working either.
# The prose list is still unioned in: it is what the "log says it closes q but q is still open" gate
# above needs, and a release may legitimately name an item it only partly closed.
CLOSES="$(printf '%s' "$LOGLINE" | grep -o 'queue [0-9]\+' | grep -o '[0-9]\+' | sort -u | tr '\n' ' ')"
ORDER_MSG="$(CLOSES="$CLOSES" PARTIALS="$PARTIALS" python3 - <<'PYORDER'
import io, os, subprocess, sys
sys.path.insert(0, 'tools')
import _classify as C
md = io.open('REQUESTS.md', encoding='utf-8').read()
partials = set(os.environ.get('PARTIALS', '').split())
closes = set(int(n) for n in os.environ.get('CLOSES', '').split() if n not in partials)
# a git that cannot answer ends this gate (exit 3, the reason on stderr) — never "nothing closed" (6 Oct, the port review)
from _shipgates import sh as _git_sh
diff = _git_sh(['git', 'diff', 'HEAD', '--', 'REQUESTS.md'])
for num, suf in C.closed_in_diff(diff):
    if num is None:
        closes.add(-1)            # an unnumbered entry — older than every number
    elif str(num) not in partials:
        closes.add(num)
closes = sorted(closes)
nxt = C.next_up(md)
if nxt and closes:
    num, suf, head = nxt
    # key_of, not sort_key: the tier (his words before my audit findings, 2 Sep) is read from the entry
    late = [n for n in closes if C.key_of(md, n) > C.key_of(md, num, suf)]
    if late:
        name = 'an UNNUMBERED entry — those predate the numbering, so they are the oldest in the file' \
               if num is None else '#%d%s' % (num, suf)
        print('%s|%s|%s' % (','.join('#%d' % n for n in late), name, head.strip()[:130]))
PYORDER
)" || { echo "❌ the oldest-first gate could not run (git or its own error, above) — not shipping on a guess."; _WHY="the queue-order gate could not run"; exit 1; }
if [ -n "$ORDER_MSG" ]; then
  LATE="${ORDER_MSG%%|*}"; REST="${ORDER_MSG#*|}"; NEXTUP="${REST%%|*}"; NEXTHEAD="${REST#*|}"
  echo "❌ QUEUE ORDER — this release closes $LATE, but $NEXTUP is open and workable and comes first."
  echo "   $NEXTHEAD"
  echo
  echo "   He asked for this explicitly: \"I want the oldest things in the list done first, not what I"
  echo "   just told you.\" Nothing rots at the bottom is the whole point of the list."
  echo "   Either do $NEXTUP first, or — if he told you to do this now, or the build was broken —"
  echo "   write \"JUMPED: <reason>\" into $NEXTUP's entry and it will stop holding the queue."
  # RULES-AUDIT B3 (6 Oct): the escape hatch above is for HIS "do this now" or a broken build — not a way to get a
  # batch of someone else's fixes past an item he asked for. Whether those land between Simple-mode releases is his call.
  echo "   Never JUMP an item in his own words (e.g. #980) just to get a land release through. Ask him."
  exit 1
fi

# ---- A CHANGED FILE MUST HAVE ITS CACHE-BUSTER BUMPED (22 Aug) ----------------------------------
# WHY. CLAUDE.md has carried this warning for a long time — "a missed buster reads as 'the fix does not
# work' — it has" — and the only thing enforcing it was remembering. That is exactly what this project
# treats as no safeguard at all. The failure is silent and it is the WORST kind of silent: the code is
# correct, the tests are green, the push lands, and Ezra opens the app on his phone and sees the old
# build. Every symptom points at the fix being wrong when the fix is fine.
# Forty commits were scanned when this gate was written and none had missed one — so this is not a fix
# for a present mess, it is a lock on a door that has been left open the whole time.
# NEW files are exempt: they have no previous ?v= to differ from, and being referenced at all is enough.
BUSTER_MISS="$(python3 - <<'PYEOF'
import subprocess, re, sys
sys.path.insert(0, 'tools'); from _shipgates import sh   # a failed git exits 3 here, never "nothing changed" (6 Oct)
changed = set()
for line in sh("git status --porcelain").splitlines():
    parts = line[3:].split(" -> ")
    changed.add(parts[-1].strip())
watched = [f for f in changed if re.match(r'^(js/.*\.js|styles\.css|theme-glass\.css)$', f)]   # theme-glass.css joined 5 Sep: it ships too (queue 553)
if not watched: sys.exit(0)
now = open('index.html', encoding='utf-8').read()
was = sh("git show HEAD:index.html")
def buster(txt, f):
    m = re.search(re.escape(f) + r'\?v=([0-9.]+)', txt)
    return m.group(1) if m else None
for f in sorted(watched):
    b_now = buster(now, f)
    if b_now is None: continue          # not referenced by index.html (a tool, a test helper) — not cached
    b_was = buster(was, f)
    if b_was is None: continue          # brand new reference — nothing to bump
    if b_now == b_was:
        print("%s (still ?v=%s)" % (f, b_now))
PYEOF
)" || { echo "❌ the cache-buster gate could not run (git or its own error, above) — not shipping on a guess."; _WHY="git could not answer the cache-buster gate"; exit 1; }
if [ -n "$BUSTER_MISS" ]; then
  # ⚠️ IT BUMPS THEM RATHER THAN REFUSING (6 Sep). This gate refused twice in one day, on two different
  # releases, for the same reason both times — and a gate that only says "you forgot" leaves the forgetting
  # possible. His rule is the one this whole file is built on: "every safe guard needs to be structural…
  # anything that could be forgotten needs to be structural." A number that must be incremented whenever a
  # file changes is exactly the kind of thing a person forgets and a script never does, so the script does
  # it. It still SAYS which ones it bumped, loudly, because a silent edit to index.html would be its own
  # kind of surprise — and it still refuses below if the bump did not take.
  echo "→ cache-busters were stale — bumping them (a changed file MUST be re-fetched by the phone):"
  echo "$BUSTER_MISS" | sed 's/^/   · /'
  python3 - <<'PYEOF'
import re
names = []
import subprocess
import sys; sys.path.insert(0, 'tools'); from _shipgates import sh
out = sh("git status --porcelain")
for line in out.splitlines():
    f = line[3:].split(" -> ")[-1].strip()
    if re.match(r'^(js/.*\.js|styles\.css|theme-glass\.css)$', f): names.append(f)
src = open('index.html', encoding='utf-8').read()
was = sh("git show HEAD:index.html")
for f in sorted(set(names)):
    m_now = re.search(re.escape(f) + r'\?v=([0-9]+)', src)
    m_was = re.search(re.escape(f) + r'\?v=([0-9]+)', was)
    if not m_now or not m_was: continue
    if m_now.group(1) != m_was.group(1): continue          # already bumped by hand
    src = src.replace(m_now.group(0), f + '?v=' + str(int(m_now.group(1)) + 1))
    print("   ✅ %s ?v=%s → ?v=%d" % (f, m_now.group(1), int(m_now.group(1)) + 1))
open('index.html', 'w', encoding='utf-8').write(src)
PYEOF
  [ $? = 0 ] || { echo "❌ the cache-buster bump could not run (git or its own error, above) — not shipping on a guess."; _WHY="git could not answer the cache-buster gate"; exit 1; }
  STILL="$(python3 - <<'PYEOF'
import subprocess, re, sys
sys.path.insert(0, 'tools'); from _shipgates import sh   # a failed git exits 3 here, never "nothing changed" (6 Oct)
changed = set()
for line in sh("git status --porcelain").splitlines():
    changed.add(line[3:].split(" -> ")[-1].strip())
watched = [f for f in changed if re.match(r'^(js/.*\.js|styles\.css|theme-glass\.css)$', f)]
now = open('index.html', encoding='utf-8').read(); was = sh("git show HEAD:index.html")
def b(t, f):
    m = re.search(re.escape(f) + r'\?v=([0-9.]+)', t); return m.group(1) if m else None
for f in sorted(watched):
    n, o = b(now, f), b(was, f)
    if n is None or o is None: continue
    if n == o: print("%s (still ?v=%s)" % (f, n))
PYEOF
)" || { echo "❌ the cache-buster re-check could not run (git or its own error, above) — not shipping on a guess."; _WHY="git could not answer the cache-buster gate"; exit 1; }
  if [ -n "$STILL" ]; then
    echo "❌ A FILE CHANGED AND ITS CACHE-BUSTER COULD NOT BE BUMPED — not committing, not pushing."
    echo "$STILL" | sed 's/^/   /'
    echo "   Without it the phone keeps serving the OLD file, the app looks unchanged, and the fix reads as broken."
    exit 1
  fi
fi

# ---- THE SUMMARY EZRA READS MUST NOT BE STALE (22 Aug) -------------------------------------------
# WHY. The block at the top of REQUESTS.md is the first thing he sees, and it is written for HIM. One sat
# there from 18 Aug for four days quoting v9.94, "659 tests green", "70 items open" and a "next actionable
# item" that had long since shipped — while the app was on v11.50 with 816 tests. Nothing noticed, because
# nothing was watching: it is prose, and prose has no test.
# So the stamp is checked against the version being shipped. It costs one line to update and it stops the
# one file he actually opens from lying to him about where things stand.
# `class="ver"` contains a literal v, so a loose grep matches that too — anchor on the delimiters.
REQ_VER="$(grep -o 'at v[0-9][0-9.]*' REQUESTS.md | head -1 | sed 's/^at //')"
APP_VER="$(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')"
if [ -n "$REQ_VER" ] && [ "$REQ_VER" != "$APP_VER" ]; then
  echo "❌ THE SUMMARY AT THE TOP OF REQUESTS.md IS STALE — not committing, not pushing."
  echo "   It says $REQ_VER; this build is $APP_VER."
  echo "   That block is the first thing Ezra reads. Update its state line (version, test count, what is"
  echo "   waiting on him) and the stamp, then ship again. A previous one misled him for four days."
  exit 1
fi

# THE CLASSIFIER MUST PROVE ITSELF BEFORE IT LABELS ANYTHING (22 Aug). tools/_classify.py decides what
# the loop picks up next AND what STATUS Ezra reads in REQUESTS.md, and every rule in it was written to
# cure a real bug — an answered item that had become unreachable, a hold that would not lift, five real
# items hidden by a phrase in a note about them. Nothing else in this repo would notice if one of those
# rules stopped working; the symptom is silence, which is the worst kind. So it self-tests, here, before
# it is allowed to write a label or hand out work.
if ! python3 tools/_classify.py; then
  echo "❌ THE QUEUE CLASSIFIER IS BROKEN — not committing, not pushing."
  echo "   Each failing case above is a bug that already happened once. Fix tools/_classify.py first."
  exit 1
fi
# THE FAILSAFE MUST PROVE ITSELF TOO (12 Sep). tools/rollback.sh is the answer to his question "whats the
# fail safe if an ai fucks up all the code?" — and on the day it was written it broke TWICE, in opposite
# directions: untracked (so `git clean -fd` and its own `git stash -u` would eat it), then, once that was
# fixed, deleting itself from inside, because every release predates the commit that added it and the
# restore removes files added since. Both were found by ad-hoc probing; nothing in the repo would have
# noticed either. A disaster-recovery tool that is broken is worse than none, because it is the thing you
# reach for when you have no attention to spare — so it runs its own test whenever it changes. ~15s, in a
# throwaway clone wired to a local bare repo, so it cannot reach the live site.
if ! git diff --cached --quiet -- tools/rollback.sh 2>/dev/null || ! git diff --quiet -- tools/rollback.sh 2>/dev/null; then
  echo "→ tools/rollback.sh changed — proving the failsafe still works before shipping"
  if ! ./tools/test-rollback.sh; then
    echo "❌ THE FAILSAFE IS BROKEN — not committing, not pushing."
    echo "   Every ❌ above is a way his undo button fails at the moment he needs it."
    exit 1
  fi
fi
# THE LAUNCHER AND THE LOCK PROVE THEMSELVES TOO (6 Oct, RULES-AUDIT B1). Every way they can be wrong is silent — a launcher
# that exits 0 reads as "shipped", a refusal that deletes a live ship's lock makes it invisible, a killed ship that reads
# as "running" waits for ever. A few seconds in a temp directory, against a stub ship.sh; nothing there reaches GitHub.
# `git status`, not `git diff`: a NEW file is untracked, and `git diff --quiet` says nothing changed.
# tools/_platform.sh and tools/_testfloor.sh count too (6 Oct, the WSL merge): ship.sh and mutate.sh both source them now.
if [ -n "$(git status --porcelain -- tools/ship-bg.sh tools/_shiplock.sh tools/test-ship-bg.sh tools/ship.sh tools/_platform.sh tools/_testfloor.sh 2>/dev/null)" ]; then
  echo "→ the ship launcher or its lock changed — proving them before shipping"
  if ! ./tools/test-ship-bg.sh; then
    echo "❌ THE SHIP LAUNCHER OR ITS LOCK IS BROKEN — not committing, not pushing."
    exit 1
  fi
fi
# …and so does mutate.sh (RULES-AUDIT B4): its timed-out, did-not-run and killed paths are the silent ones, and its full
# mode is too long for anyone to watch them happen for real. Seconds, against a stub driver, in a temp directory.
if [ -n "$(git status --porcelain -- tools/mutate.sh tools/_spotjudge.py tools/test-mutate.sh tools/_shiplock.sh tools/_platform.sh tools/_testfloor.sh 2>/dev/null)" ]; then
  echo "→ mutate.sh or its judge changed — proving it before shipping"
  if ! ./tools/test-mutate.sh; then
    echo "❌ MUTATE.SH IS BROKEN — not committing, not pushing."
    exit 1
  fi
fi
# …and so does the inbox (6 Oct, the PM's port review): "inbox empty" while his note sits in a file is the failure the
# whole inbox exists to prevent, and every way into it is silent. Seconds, in a throwaway repo with a local "ssh" remote.
if [ -n "$(git status --porcelain -- tools/inbox.sh tools/next.sh tools/tick.sh tools/test-inbox.sh tools/_platform.sh 2>/dev/null)" ]; then
  echo "→ the inbox readers changed — proving them before shipping"
  if ! ./tools/test-inbox.sh; then
    echo "❌ THE INBOX READERS ARE BROKEN — not committing, not pushing."
    exit 1
  fi
fi
# …and the port's own (6 Oct, #1071): NOT RUN HERE as the judges read it, and the review's fixes to the gates and the driver.
if [ -n "$(git status --porcelain -- tools/test-port.sh tools/_testfloor.sh tools/_spotjudge.py tools/spotcheck.sh tools/_platform.sh tools/_shipgates.sh tools/ship.sh tests/_cdp.py tests/_platform.py tests/_shot.sh tools/record-baselines.sh 2>/dev/null)" ]; then
  echo "→ the port's gates or the driver changed — proving them before shipping"
  if ! ./tools/test-port.sh; then
    echo "❌ THE PORT'S GATES OR THE DRIVER ARE BROKEN — not committing, not pushing."
    exit 1
  fi
fi

# Refresh REQUESTS.md's STATUS labels first, so they can never be stale in a commit (queue 352).
# A label written by hand is true the day it is written and misleading a week later.
./tools/status.sh >/dev/null 2>&1 || true

# ⚠️ A SUITE THAT RAN OUT OF TIME IS NOT A SUITE THAT FAILED, and this gate could not tell them apart
# (25 Aug). `_cdp.py` gives up after `--timeout` seconds and prints `"ok": false` with an `error` and
# NO failures — so a slow-but-healthy run arrived here as "SUITE IS RED", followed by an empty list of
# what broke. That reads as "the tests failed and I cannot tell you which", which sends the next hour
# looking for a fault that does not exist; it cost one this morning. The runner's default is 600s and
# the suite is over 900 tests now, so the margin only shrinks from here.
# Two changes, both structural: ask for real headroom, and SAY which of the two things happened.
# ---- EVERY FIX SHIPS WITH A TEST THAT FAILS WITHOUT IT (5 Sep) --------------------------------------
# Ezra, coming back to a fortnight of autonomous releases: "dont assume fixes will work". mutate.sh was the
# proof, and it was voluntary — a log line saying "mutation caught" is a claim, not a measurement. So the
# proof is now taken here, automatically, with the one mutation that always applies: the fix, reverted.
# tools/prove.sh serves HEAD's source with the working tree's tests and requires every test this release
# added or changed to FAIL there and PASS here. About a minute; it runs BEFORE the suite so a dead test
# costs one minute rather than ten. The escape hatch is a visible declaration — "UNPROVABLE: <why>" in
# the newest POLISH-LOG line — because he reads that file and a flag he cannot see is not a safeguard.
# ⚠️ "queue NNN" IN PROSE IS READ AS A CLAIM, AND THAT HAS COST A SHIP CYCLE THREE TIMES (7 Sep).
# prove.sh counts every `queue NNN` in the newest POLISH-LOG line and demands one catching test for each,
# which is right — but a line that mentions an OLD item while explaining the new one ("the reset #742
# removed", "queue 754's claim") was counted too, and the release was refused for a proof it never
# claimed to owe. The repo's convention is already "#NNN" for a historical reference and "queue NNN" for
# what this release closes; nothing enforced it, so it was remembered, and remembering failed.
# This names the offender in one second instead of after the proof step, and it says which form to use.
# An item that IS being closed or partially closed here is fine, by definition.
LOGLINE_Q="$(tail -n 1 POLISH-LOG.md)"
SHIP_VER="$(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')"
for q in $(printf '%s' "$LOGLINE_Q" | grep -o 'queue [0-9]\+' | grep -o '[0-9]\+' | sort -u); do
  printf '%s' "$LOGLINE_Q" | grep -q "queue $q (partial)" && continue              # declared partial: prove.sh exempts it
  grep -q "^- \[ \] \*\*$q[ —]" REQUESTS.md && continue                          # still open here: it owes a proof, prove.sh's own gate
  # …otherwise it must be an item THIS release touches, which its entry says by carrying this version.
  awk -v q="$q" -v v="$SHIP_VER" '
    $0 ~ "^- \\[[ x]\\] \\*\\*" q "[ —]" { inq = 1 }
    inq && index($0, v) { found = 1 }
    inq && /^- \[[ x]\] \*\*[0-9]/ && $0 !~ "^- \\[[ x]\\] \\*\\*" q "[ —]" { inq = 0 }
    END { exit(found ? 0 : 1) }' REQUESTS.md && continue
  echo "❌ the newest POLISH-LOG line says \"queue $q\", but #$q's entry does not mention $SHIP_VER —"
  echo "   so this release is not what closes it. prove.sh reads \"queue $q\" as a CLAIM and will demand a"
  echo "   catching test for it. If you are only REFERRING to that item, write it as #$q, which is the"
  echo "   convention this file has used for months. Not committing."
  exit 1
done

# ⚠️ THESE TWO GATES RUN BEFORE THE PROOF AND THE SUITE (26 Sep, v17.04). They read files and the commit message and
# nothing else, so they answer in a second — but they sat AFTER the half-hour desktop pass, and v17.04 lost an hour to a
# deliberate test RENAME that the gate (rightly) wanted declared, found only once 1980 tests had already gone green.
# ─── NO TEST MAY VANISH WITHOUT SAYING SO (28 Aug) ──────────────────────────────────────────────
# A DELETED TEST IS INDISTINGUISHABLE FROM A PASSING ONE. On 28 Aug a text edit meant to REPLACE one
# test spliced away four — #649, both #664s and #666 — and the suite went green on 1047 where it had
# been 1051. Green is exactly what that looks like. It was found only by diffing the test NAMES against
# the last commit, by hand, because it happened to occur to me.
# ⚠️ THE TEST-FLOOR CHECK ABOVE IS NOT THIS. It compares a COUNT, so four deletions and four additions
# net to zero and it says nothing — and the floor is a number a session edits by hand, so the honest
# way to silence it is the same keystroke as the honest way to update it.
# This compares the NAMES. Deleting a test is a legitimate thing to do — a fixture dies, a feature goes
# — so it is not forbidden, it is DECLARED: put "DROPS TEST:" in the commit message and it passes. That
# turns a silent deletion into a line in the log, which is the whole pattern this file is built on.
GONE="$(git show HEAD:tests/tests.js 2>/dev/null | grep -o "^  test('[^']*'" | sed "s/^  test('//;s/'\$//" | sort > /tmp/fm_tests_before.txt
grep -o "^  test('[^']*'" tests/tests.js | sed "s/^  test('//;s/'\$//" | sort > /tmp/fm_tests_after.txt
comm -23 /tmp/fm_tests_before.txt /tmp/fm_tests_after.txt)"
if [ -n "$GONE" ] && ! printf '%s' "$MSG" | grep -q 'DROPS TEST:'; then
  echo "❌ these tests exist in HEAD and are GONE from the working tree:"
  printf '   · %s\n' $(printf '%s' "$GONE" | tr ' ' '_') 2>/dev/null || printf '%s\n' "$GONE"
  echo
  echo "   A deleted test is indistinguishable from a passing one — the suite goes GREEN."
  echo "   If the deletion is deliberate, say so: put \"DROPS TEST: <why>\" in the commit message."
  exit 1
fi

# ─── NO REQUEST MAY VANISH WITHOUT SAYING SO (2 Sep) ────────────────────────────────────────────
# The twin of the gate above, and it exists because the thing it prevents ALREADY HAPPENED. On 1 Sep,
# v14.89 — a release about the camera's motion-blur shutter — deleted queue 703 from REQUESTS.md. That
# entry held one of HIS OWN VERBATIM INSTRUCTIONS: "Dont stop looping, keep it going, have a failsafe
# incase the loop fails". Nothing in that commit mentioned it. Nothing went red. The file is prose, and
# prose has no test.
# CLAUDE.md already names this as the worst thing that can happen here — "quietly dropping a request is
# the exact failure this file exists to prevent" — and until today the only thing enforcing it was care,
# which is exactly what this repo has learned not to rely on.
# It was caught a day later by tools/next.sh, and only indirectly: that script flags a NUMBER with no
# entry, so it saw a hole at 703 rather than a deletion. That is luck dressed as detection — it would
# have said nothing at all had the entry been the highest-numbered one, or unnumbered.
# Deleting an entry is occasionally legitimate (a renumber, a merge into a neighbour — three such have
# happened and all three came back). So this is not forbidden, it is DECLARED, the same shape as the
# test gate: put "DROPS REQUEST:" in the commit message and it passes, which turns a silent deletion
# into a line in the log.
REQ_GONE="$(git show HEAD:REQUESTS.md 2>/dev/null | grep -oE '^- \[[ x]\] \*\*[0-9]+[a-z]?' | grep -oE '[0-9]+[a-z]?$' | sort -u > /tmp/fm_req_before.txt
grep -oE '^- \[[ x]\] \*\*[0-9]+[a-z]?' REQUESTS.md | grep -oE '[0-9]+[a-z]?$' | sort -u > /tmp/fm_req_after.txt
comm -23 /tmp/fm_req_before.txt /tmp/fm_req_after.txt)"
# ⚠️ AND THE GATE MUST PROVE IT CAN SEE. A pattern that matches NOTHING reports no losses and waves
# every deletion through — the failure is silence, which is the one thing no one notices. If the entry
# header format in REQUESTS.md ever drifts from this regex, that is what happens, so count first.
REQ_SEEN="$(wc -l < /tmp/fm_req_before.txt | tr -d ' ')"
if [ "${REQ_SEEN:-0}" -lt 100 ]; then
  echo "❌ the REQUESTS.md entry gate matched only $REQ_SEEN entries in HEAD — it expects hundreds."
  echo "   The header format has drifted from the pattern, so this gate is blind and would pass"
  echo "   ANY deletion silently. Fix the regex in tools/ship.sh before shipping."
  exit 1
fi
if [ -n "$REQ_GONE" ] && ! printf '%s' "$MSG" | grep -q 'DROPS REQUEST:'; then
  echo "❌ these REQUESTS.md entries exist in HEAD and are GONE from the working tree:"
  printf '%s\n' "$REQ_GONE" | sed 's/^/   · #/'
  echo
  echo "   A request that vanishes is not deprioritised, it is UNREACHABLE — and he cannot see that it"
  echo "   went. This is how #703 lost his own words: \"Dont stop looping… have a failsafe\"."
  echo "   If the removal is deliberate, say so: put \"DROPS REQUEST: <why>\" in the commit message."
  exit 1
fi

ship_phase prove
echo "→ proving the release (its changed tests must fail without the fix)…"
tools/prove.sh || { echo "   Not committing, not pushing."; exit 1; }

# 2700, not 1800 (26 Sep): measured at v17.01 on an idle Mac (load ~2 on 6 cores) a green full pass took 1848 s — the suite
# had simply outgrown 1800 (1971 tests; the tier-3 and real-input tests are the long ones). Two ships ran out of time with the
# stall point MOVING (a hunt-7 test, then a #927 test), which is this file's own sign of "not one hung test".
# THE WHOLE FAILURE, NOT THE FIRST QUOTE OF IT (27 Sep, v17.06). This printed `grep -o 'FAIL[^"]*'`, which stops at the
# first escaped quote — and a test that reports what it collected as JSON (`… said nothing ([\"Sam left\"])`) lost exactly
# the part that said why. The red '967 7' had to be re-run by hand to learn what it had seen. Parse the runner's JSON.
_fails() { python3 -c '
import json,sys
raw=sys.stdin.read(); i=raw.find("{")
try: d=json.loads(raw[i:])
except Exception: d=None
fs=(d or {}).get("failures") or []
for f in fs[:6]: print("   " + f[:1200])
# queue 996: what earlier tests left in the shared scene — a red that only happens deep in a run is often one of these
lk=(d or {}).get("sceneLeaks") or []
if fs and lk:
    print("   ── left in the shared scene by earlier tests (tests.js records it; report only):")
    for l in lk[:8]: print("      · " + l.get("test","")[:90] + " → " + ", ".join(l.get("added") or []) + (" +%d more" % l["more"] if l.get("more") else "") + (" [effects-sheet preview left on]" if l.get("preview") else "") + (" [isolate left on]" if l.get("isolate") else ""))
if not fs:
    import re
    for m in re.findall(r"FAIL[^\n]{0,400}", raw)[:6]: print("   " + m)
'; }
SUITE_TIMEOUT=2700
# THE CAP GROWS WITH THE SUITE (30 Sep, v17.18). 2700 was right at 1971 tests; at 2186 an idle pass is ~2050 s and a
# ship takes ~90 minutes end to end (v17.16: 09:51 → 11:20; v17.17: 12:12 → 13:43), so the first busy afternoon put
# both of v17.18's attempts over the line (stall points 991, then 690 — MOVING, the load sign). A fixed number is a
# note that goes stale as tests are added, so each green pass now records its real length in tools/.suite-seconds
# (committed with the release) and the cap is 1.6x the last one, never below an hour.
# The cap is suite_timeout in tools/_testfloor.sh now (6 Oct), because mutate.sh needs the same one and had a stale 1800.
# PER MACHINE (6 Oct): this machine's own last pass, else the largest any machine has recorded (tools/_testfloor.sh)
_last_suite="$(suite_seconds_for)"; _last_suite=${_last_suite:-0}
SUITE_TIMEOUT="$(suite_timeout)"
# ⚠️ A TIMEOUT'S REAL CAUSE IS USUALLY THE MACHINE, AND NOTHING HERE MEASURED IT (21 Sep). Three ship
# cycles went on "the suite ran out of time" — first at prove's 600s, then at the suite's 1800s — before
# anyone thought to run `uptime`. The answer was a 6-core Mac in a Spotlight/Photos indexing storm
# (duetexpertd 58%, photolibraryd 41%, corespotlightd 29%) with kernel_task at 52%, which on a Mac means it
# is stealing CPU to cool the machine down. The suite is CPU-bound, so it ran at well under half speed and
# could not finish. NOTHING WAS WRONG WITH THE CODE OR THE TESTS.
# The giveaway that it is load rather than one hung test is that the STALL POINT MOVES between runs — it
# stopped at queue 294 on one pass and at 433 on the next. So print the evidence right here, where the
# timeout is announced, instead of leaving the next session to rediscover it by hand.
# Diagnostic only, so each line may say "?" or "not available" — the OS-specific halves are in tools/_platform.sh.
_whyslow() {
  echo "   ── the usual cause is the machine, not a broken test. Evidence:"
  echo "      load average:$(uptime | sed 's/.*load averages*://') across $(fm_ncpu || echo '?') cores"
  fm_top_cpu 6
  fm_slow_hint | sed 's/^/      /'
}

if [ "$_last_suite" -gt 0 ]; then echo "→ running the suite (the last green pass took $(( _last_suite / 60 )) minutes; cap ${SUITE_TIMEOUT}s)…"
else echo "→ running the suite (cap ${SUITE_TIMEOUT}s)…"; fi
ship_phase desktop
_suite_t0=$SECONDS
OUT="$(python3 tests/_cdp.py --port 8777 --timeout $SUITE_TIMEOUT 2>&1)"
_suite_secs=$(( SECONDS - _suite_t0 ))
SUM="$(printf '%s' "$OUT" | grep -o '"summary": "[^"]*"' | head -1)"
if printf '%s' "$OUT" | grep -q 'did not finish within'; then
  echo "⏱  THE SUITE RAN OUT OF TIME after ${SUITE_TIMEOUT}s — it did NOT fail. Nothing is committed or pushed."
  printf '%s' "$OUT" | grep -o '"lastTest": "[^"]*"' | head -1
  echo "   Nothing here says a test is broken. Either the machine is loaded or the suite has outgrown"
  echo "   ${SUITE_TIMEOUT}s — check the last test above before assuming a regression."
  _whyslow
  exit 1
fi
if ! printf '%s' "$OUT" | grep -q '"ok": true'; then
  # ⚠️ "not green" is not the same as "a test failed", and this branch used to assert the second.
  # It printed "SUITE IS RED" followed by the FAIL lines — and when the cause was anything OTHER than
  # a failing test (wrong port, no server, a crashed browser) there were no FAIL lines to print, so it
  # announced a red suite and then listed nothing. That is the most misleading output this script can
  # produce. If nothing actually failed, say what DID happen instead of implying a regression.
  if printf '%s' "$OUT" | grep -q 'FAIL'; then
    echo "❌ SUITE IS RED — not committing, not pushing."
    printf '%s' "$OUT" | _fails
  else
    echo "⚠️  THE SUITE DID NOT RUN — no test failed. Nothing is committed or pushed."
    printf '%s' "$OUT" | grep -o '"error": "[^"]*"' | head -1
    echo "   Nothing above says a test is broken. Fix the run, then ship."
  fi
  exit 1
fi
# …and that it actually RAN. `"ok": true` is only "nothing failed", which a suite of zero tests also is.
# (test_floor_check is tools/_testfloor.sh, sourced at the top.)
test_floor_check "$OUT" || { echo "   Not committing, not pushing."; exit 1; }
# NOT RUN HERE, by name (6 Oct, #1071): printed after every pass, and on the Mac a refusal (tools/_testfloor.sh notrun_report)
notrun_report "$OUT" desktop || { _WHY="a test is NOT RUN HERE on the Mac"; exit 1; }
NOTRUN_ALL="$(notrun_list "$OUT")"
font_report "$OUT" desktop   # a different font than the Mac's is said, never refused (tools/_testfloor.sh)
echo "✅ $SUM  (${_suite_secs}s)  $(printf "%s" "$OUT" | grep -o "\"browser\": \"[^\"]*\"" | head -1)"   # which browser ran (the PM review)
suite_seconds_record "$_suite_secs"   # this machine's line; the other machines' lines are kept (tools/_testfloor.sh)

# ── THE PHONE PASS (queue 353 clause 3, added 22 Aug) ────────────────────────────────────────────
# "make sure everything is quality tested as good as possible" — and this app is MOBILE-FIRST, while
# every gate here had only ever run the suite at 1280px. `tests/_cdp.py --width 380` has been in the
# runner's own usage header for months and NOTHING has ever called it.
# That is not theoretical: queue 431 (the Media/Audio library crushing the tab row and clipping its
# labels) is a phone-layout bug that shipped, survived THREE passes that each measured a healthy row at
# desktop width, and was only found when he sent a screenshot and said "nothings happened".
# Skipped when no shipped source changed — a tests-only or docs-only commit cannot move a layout, and
# paying five minutes to prove that on every one of them is how a gate gets switched off. Deliberately
# NOT an allowlist of "UI files": such a list is right the day it is written and stale by the next
# module, which is the failure mode this file exists to remove.
PHONE_RELEVANT="$(git diff --cached --name-only; git diff --name-only)"
if printf '%s' "$PHONE_RELEVANT" | grep -qE '^(styles\.css|index\.html|js/)'; then
  ship_phase phone
  echo "→ running the suite again at PHONE width (380px)…"
  POUT="$(python3 tests/_cdp.py --port 8777 --width 380 --timeout $SUITE_TIMEOUT 2>&1)"
  PSUM="$(printf '%s' "$POUT" | grep -o '"summary": "[^"]*"' | head -1)"
  if printf '%s' "$POUT" | grep -q 'did not finish within'; then
    echo "⏱  THE PHONE PASS RAN OUT OF TIME after ${SUITE_TIMEOUT}s — it did NOT fail. Nothing committed or pushed."
    printf '%s' "$POUT" | grep -o '"lastTest": "[^"]*"' | head -1
    _whyslow
    exit 1
  fi
  if ! printf '%s' "$POUT" | grep -q '"ok": true' && ! printf '%s' "$POUT" | grep -q 'FAIL'; then
    echo "⚠️  THE PHONE PASS DID NOT RUN — no test failed. Nothing is committed or pushed."
    printf '%s' "$POUT" | grep -o '"error": "[^"]*"' | head -1
    exit 1
  fi
  if ! printf '%s' "$POUT" | grep -q '"ok": true'; then
    echo "❌ SUITE IS RED AT PHONE WIDTH — not committing, not pushing."
    echo "   It is GREEN at 1280px, so this is a layout that only breaks on a phone — which is the"
    echo "   one shape of bug this app can least afford, and exactly how queue 431 shipped."
    printf '%s' "$POUT" | _fails
    exit 1
  fi
  test_floor_check "$POUT" || { echo "   Not committing, not pushing."; exit 1; }
  notrun_report "$POUT" phone || { _WHY="a test is NOT RUN HERE on the Mac"; exit 1; }
  NOTRUN_ALL="$(printf '%s\n%s\n' "$NOTRUN_ALL" "$(notrun_list "$POUT")" | sed '/^$/d' | sort -u)"
  font_report "$POUT" phone
  echo "✅ phone $PSUM  $(printf "%s" "$POUT" | grep -o "\"browser\": \"[^\"]*\"" | head -1)"
else
  echo "· no shipped source changed — skipping the phone pass"
fi

# ⚠️ A RELEASE THAT CHANGES WHAT A NOT-RUN TEST PROVES REFUSES (6 Oct, #1071 — his answer: the recommended plan). Elsewhere
# than the Mac a test that needs a missing feature says NOT RUN HERE and the release goes on — but not when this release
# changes the code that test is the only proof of: the AAC export audio (js/exporter.js, js/export-resume.js, js/audio-*.js,
# vendor/mp4-muxer.js) or the QR code (js/collab-qr.js, and js/collab-ui.js lines about qr/barcode/jsqr/scan). Those tests
# must have RUN, and passed, on the machine shipping this tree — the Mac. The map is FEATURES in tools/_shipgates.py.
if [ -n "${NOTRUN_ALL:-}" ]; then
  _FG="$(printf '%s\n' "$NOTRUN_ALL" | python3 tools/_shipgates.py feature-gate)"; _FGRC=$?
  if [ "$_FGRC" != 0 ]; then
    [ -n "$_FG" ] && echo "$_FG" || echo "❌ the feature gate could not run (git or its own error, above) — not shipping on a guess."
    echo "   Ship this release from a machine that runs them (the Mac). Nothing is committed or pushed."
    _WHY="changes code whose tests did not run on this machine"
    exit 1
  fi
fi

ship_phase push
git add -A
git commit -q -m "$MSG" || { echo "ship: nothing to commit"; exit 1; }
git push -q ssh main 2>&1 | tail -2
H="$(git rev-parse HEAD)"; R="$(git rev-parse ssh/main 2>/dev/null || echo none)"
if [ "$H" != "$R" ]; then echo "❌ PUSH DID NOT LAND — HEAD $H vs ssh/main $R"; exit 1; fi
SHIPPED=1   # the ONE place this is set: after the push is verified, not after it is attempted
echo "✅ pushed and verified: HEAD == ssh/main ($H)"
