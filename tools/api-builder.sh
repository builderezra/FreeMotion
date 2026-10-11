#!/usr/bin/env bash
# The FreeMotion builder, run HEADLESS on Ezra's monthly API credits (11 Oct 2026).
#
# WHY THIS EXISTS. Max 20x comes with ~US$200 a month of API credits that expire at the end of each billing cycle and
# cannot pay for interactive Claude Code, the desktop app, cloud sessions or Remote Control. The one thing they do pay
# for is `claude -p` run with an API key. So while the subscription is out of usage, this script keeps the builder
# working on those credits: it runs `claude -p` in a loop, the way the cron loop runs the interactive builder.
#
# HOW TO START IT (WSL / Ubuntu terminal on the laptop, one paste):
#   curl -fsSL https://raw.githubusercontent.com/builderezra/FreeMotion/refs/heads/claude/laughing-euler-5lq4ml/tools/api-builder.sh -o ~/fm-api-builder.sh && bash ~/fm-api-builder.sh
# It asks for the API key once (console.anthropic.com > API keys; they start sk-ant-api) and keeps it in
# ~/.fm-api-builder/key (chmod 600). Keep the laptop PLUGGED IN with the LID OPEN; minimise the window. Closing the
# window or pressing Ctrl-C stops it: the run in progress is told to stop, is counted, and nothing new starts.
# Watch it from another terminal: tail -f ~/.fm-api-builder/progress.log
#
# MONEY, HONESTLY
# - The one HARD limit is in the Console: if you have never added a card or bought credits there, nothing beyond the
#   monthly credits can be charged (the API just refuses and this script stops). If you HAVE, set a monthly spend
#   limit on the key's workspace and turn auto-reload off before starting.
# - This script's counter is an estimate. Claude's own cost figure (and --max-budget-usd) leaves out the auto-mode
#   safety classifier, which bills the same key, so every reported cost is multiplied by FM_OVERHEAD (default 1.3).
#   Each run is capped (FM_RUN_CAP, default $20 before the overhead) and PRE-CHARGED before it starts. The counter
#   stops it at FM_TOTAL_CAP (default $160), keeping FM_RESERVE ($6) for the wind-down turn that writes the handover.
#   A resumed session reports a running total, so only the rise is counted. The Console's Usage page is the real number.
#
# WHAT ELSE KEEPS IT SAFE
# - The key reaches `claude` only, as an environment variable set for that one command (never in a command line, and
#   never exported into your shell: an exported ANTHROPIC_API_KEY knocks the Remote Control builder/logger offline).
# - Auto mode, never "skip all permissions": every action still goes through Claude Code's safety classifier. Two runs
#   in a row ended by the classifier (refusals, or the classifier being unavailable) stop the script.
# - It stops at FM_STOP_AT (default 15:45 AWST 12 Oct, 15 minutes before the subscription is back). From FM_WIND_DOWN
#   (30 min earlier), or when the money is nearly used, the builder starts nothing new and writes a handover to the
#   repo's gitignored .claude/api-handover.md, which is printed when the script stops.
# - It stops at once on a key error, a billing error, the Console spend limit, or an answer from the subscription.
#   Network trouble, rate limits and overloads cost nothing and are retried with a growing wait, never given up on.
# - One copy at a time: the lock names this script AND its running claude, and a new start refuses while either lives.
# - An idle builder (a turn that changed no branch, worktree or file) is asked again after a growing wait (1, 2, 4...
#   up to 15 minutes), and while a ship runs only every 15 minutes, so idle hours do not burn money.
# - Every file it writes lives in ~/.fm-api-builder, OUTSIDE the repo (ship.sh ends with `git add -A`).
# - Windows is asked not to sleep while it runs (best effort, via powershell.exe); closing the lid can still sleep it.
#
# Settings (environment variables, all optional): FM_REPO (default ~/FreeMotion), FM_STOP_AT, FM_WIND_DOWN,
# FM_TOTAL_CAP, FM_RUN_CAP, FM_RESERVE, FM_OVERHEAD, FM_MODEL (default claude-opus-5-5), FM_EFFORT (default xhigh),
# FM_ROTATE_USD (a fresh session once one has cost this much; default 35), FM_SHIP_POLL (default 900 s).
set -u
# ANTHROPIC_AUTH_TOKEN outranks ANTHROPIC_API_KEY. Unsetting it here affects this script and its children only.
unset ANTHROPIC_AUTH_TOKEN

STATE="$HOME/.fm-api-builder"
REPO="${FM_REPO:-$HOME/FreeMotion}"
STOP_AT="${FM_STOP_AT:-2026-10-12 15:45 +0800}"
TOTAL_CAP="${FM_TOTAL_CAP:-160}"
RUN_CAP="${FM_RUN_CAP:-20}"
RESERVE="${FM_RESERVE:-6}"
OVERHEAD="${FM_OVERHEAD:-1.3}"
MODEL="${FM_MODEL:-claude-opus-5-5}"
EFFORT="${FM_EFFORT:-xhigh}"
ROTATE_USD="${FM_ROTATE_USD:-35}"
SHIP_POLL="${FM_SHIP_POLL:-900}"
IDLE_SLEEP="${FM_IDLE_SLEEP:-60}"     # (tests shorten these) the first pause after an idle turn; doubles up to MAX_WAIT
FAIL_SLEEP="${FM_FAIL_SLEEP:-30}"
TR_SLEEP="${FM_TR_SLEEP:-60}"         # the first wait after a network error, rate limit or overload; doubles up to MAX_WAIT
MAX_WAIT="${FM_MAX_WAIT:-900}"
mkdir -p "$STATE"
chmod 700 "$STATE"
PROGRESS="$STATE/progress.log"
STARTED_AT="$(date +%s)"

# the log file first, then the screen (a closed window must not stop the logging)
say() { local l; l="$(TZ=Australia/Perth date '+%a %H:%M:%S')  $*"; printf '%s\n' "$l" >> "$PROGRESS"; printf '%s\n' "$l" 2>/dev/null || true; }
die() { printf '❌ %s\n' "$*" >&2; exit 1; }
# The helpers ignore Ctrl-C and hang-up: the wrapper's own trap handles those, and a helper killed halfway would hand
# back an empty number that then got written into the spend counter.
calc() { ( trap '' INT HUP; exec python3 -c "import sys; print(round(float(eval(sys.argv[1], {'__builtins__': {}}, {})), 6))" "$1" ); }
ge() { ( trap '' INT HUP; exec python3 -c "import sys; sys.exit(0 if float(sys.argv[1]) >= float(sys.argv[2]) else 1)" "$1" "$2" ); }
putspent() { printf '%s\n' "$1" > "$STATE/spent.tmp" && mv -f "$STATE/spent.tmp" "$STATE/spent"; }
isnum() { case "${1:-}" in ''|*[!0-9.eE+-]*) return 1 ;; *) return 0 ;; esac; }
mn() { if ge "$1" "$2"; then printf '%s' "$2"; else printf '%s' "$1"; fi; }
# sleep, but wake for a stop request; ends early at the stop time
nap() { local s="$1" n=0; while [ "$n" -lt "$s" ] && [ "$STOPPING" = 0 ] && [ "$(date +%s)" -lt "$STOP_EPOCH" ]; do sleep 5; n=$((n + 5)); done; }

# ---------- checks before anything runs ----------
command -v python3 >/dev/null || die "python3 is missing (the repo's tools need it too)"
[ -x "$REPO/tools/tick.sh" ] || die "no FreeMotion repo at $REPO (set FM_REPO=/path/to/FreeMotion)"
STOP_EPOCH="$(date -d "$STOP_AT" +%s 2>/dev/null)" || die "FM_STOP_AT is not a date: $STOP_AT"
if [ -n "${FM_WIND_DOWN:-}" ]; then
  WIND_EPOCH="$(date -d "$FM_WIND_DOWN" +%s 2>/dev/null)" || die "FM_WIND_DOWN is not a date: $FM_WIND_DOWN"
else
  WIND_EPOCH=$((STOP_EPOCH - 1800))
fi
STOP_HUMAN="$(TZ=Australia/Perth date -d "@$STOP_EPOCH" '+%a %d %b %H:%M AWST')"
WIND_HUMAN="$(TZ=Australia/Perth date -d "@$WIND_EPOCH" '+%a %d %b %H:%M AWST')"
[ "$(date +%s)" -lt "$((STOP_EPOCH - 600))" ] || die "the stop time ($STOP_HUMAN) is less than 10 minutes away; set FM_STOP_AT to run later"
for v in "$TOTAL_CAP" "$RUN_CAP" "$RESERVE" "$OVERHEAD" "$ROTATE_USD"; do isnum "$v" || die "not a number: $v"; done

if ! command -v claude >/dev/null && [ -x "$HOME/.local/bin/claude" ]; then export PATH="$HOME/.local/bin:$PATH"; fi
if ! command -v claude >/dev/null; then
  echo "Claude Code is not installed inside WSL. Install it now with the official installer"
  printf "(curl -fsSL https://claude.ai/install.sh | bash)? [y/N] "
  read -r yn
  [ "$yn" = "y" ] || [ "$yn" = "Y" ] || die "not installed; nothing was started"
  curl -fsSL https://claude.ai/install.sh | bash || die "the installer failed"
  export PATH="$HOME/.local/bin:$PATH"
  command -v claude >/dev/null || die "claude still not found after installing"
fi

# ---------- one copy at a time: the lock names this script and its running claude ----------
LOCK="$STATE/lock"
lock_held() {
  local p
  [ -f "$LOCK" ] || return 1
  for p in $(cat "$LOCK" 2>/dev/null); do
    case "$p" in *[!0-9]*|'') continue ;; esac
    [ "$p" = "$$" ] && continue
    kill -0 "$p" 2>/dev/null || continue
    # after a reboot an old pid can belong to anything: only a live wrapper, timeout or claude holds the lock
    tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -qE 'api-builder|claude|timeout' && return 0
  done
  return 1
}
if lock_held; then
  die "another copy, or the claude its last run started, is still running (pids: $(cat "$LOCK")). Wait for it to finish, or stop it (Ctrl-C in its window). If you are sure nothing is running, delete $LOCK."
fi
echo "$$" > "$LOCK"

CHILD=""; STOPPING=0; AWAKE_PID=""
cleanup() {
  local i
  if [ -n "$CHILD" ] && kill -0 "$CHILD" 2>/dev/null; then
    kill -TERM "$CHILD" 2>/dev/null
    for i in $(seq 1 90); do kill -0 "$CHILD" 2>/dev/null || break; sleep 1; done
  fi
  [ -n "$AWAKE_PID" ] && kill "$AWAKE_PID" 2>/dev/null
  rm -f "$LOCK"
  if [ -f "$REPO/.claude/api-handover.md" ] && [ "$(stat -c %Y "$REPO/.claude/api-handover.md")" -ge "$STARTED_AT" ]; then
    printf '\n----- the builder'"'"'s handover (%s) -----\n' "$REPO/.claude/api-handover.md" 2>/dev/null
    cat "$REPO/.claude/api-handover.md" 2>/dev/null
  fi
  say "stopped (counted spend ≈ \$$(cat "$STATE/spent" 2>/dev/null || echo 0), including the classifier estimate)"
}
trap cleanup EXIT
# a signal never exits before the run in progress is stopped and counted: it is passed on, and the loop ends after
trap 'STOPPING=1; [ -n "$CHILD" ] && kill -TERM "$CHILD" 2>/dev/null' INT TERM HUP

# ---------- the key: kept in a 600 file, never exported, never on a command line ----------
KEYFILE="$STATE/key"
if [ ! -s "$KEYFILE" ]; then
  echo "Paste your Anthropic API key (console.anthropic.com > API keys). It is stored only in $KEYFILE."
  printf "API key: "
  read -rs KEY; echo
  case "$KEY" in sk-ant-api*) ;; *) die "that is not a Console API key (they start with sk-ant-api; a setup-token or admin key will not work)";; esac
  ( umask 077; printf '%s' "$KEY" > "$KEYFILE" )
fi
chmod 600 "$KEYFILE"
KEY="$(cat "$KEYFILE")"

# ---------- a run belongs to its stop time: a new stop time starts a fresh conversation ----------
rm -f "$STATE/STOP"
[ -f "$STATE/spent" ] || putspent 0
SPENT="$(cat "$STATE/spent" 2>/dev/null)"
# fail closed: an unreadable counter must never quietly become $0
isnum "$SPENT" || die "the spend counter $STATE/spent is unreadable (${SPENT:-empty}), so nothing was started. Look up this cycle's spend on the Console's Usage page, write it in (for example: echo 120 > $STATE/spent) and start again."
if [ "$(cat "$STATE/run_id" 2>/dev/null)" != "$STOP_EPOCH" ]; then
  rm -f "$STATE/session"; echo 0 > "$STATE/session_spent"
  if ! ge 0 "$SPENT"; then
    printf 'An earlier run counted $%s of spend. Reset the count to $0? Only say y if your monthly API credits have renewed since. [y/N] ' "$SPENT"
    read -r yn; case "$yn" in y|Y) SPENT=0; putspent 0;; esac
  fi
  echo "$STOP_EPOCH" > "$STATE/run_id"
fi

echo
echo "FreeMotion headless builder"
echo "  repo:        $REPO"
echo "  model:       $MODEL (effort $EFFORT)"
echo "  stops at:    $STOP_HUMAN (winds down from $WIND_HUMAN)"
echo "  spend cap:   \$$TOTAL_CAP counted (already: \$$SPENT), \$$RUN_CAP per run, ×$OVERHEAD for the safety classifier"
echo "               (the counter is an estimate; the hard limit is the Console's, see the top of this script)"
echo "  log:         $PROGRESS   (watch with: tail -f $PROGRESS)"
echo "  stop early:  Ctrl-C here, or close this window"
echo "  keep the laptop plugged in with the lid open"
echo
echo "  overnight, Windows Update can restart the laptop and nothing here can stop that: Settings > Windows Update >"
echo "  Pause updates (1 week), or set Active hours to cover tonight, before you start"
echo
if [ -t 0 ]; then
  printf "Start? [y/N] "; read -r yn
  [ "$yn" = "y" ] || [ "$yn" = "Y" ] || die "not started"
fi

# ---------- keep Windows awake (best effort): WSL places no power request on Windows ----------
if command -v powershell.exe >/dev/null 2>&1; then
  AWAKE_SECS=$((STOP_EPOCH - $(date +%s) + 300))
  PS_B64="$(python3 - "$AWAKE_SECS" <<'PY'
import base64, sys
ps = ("$t = Add-Type -PassThru -Name P -Namespace W -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint f);'; "
      "[void]$t::SetThreadExecutionState([uint32]2147483649); "   # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
      "$end = (Get-Date).AddSeconds(%d); while ((Get-Date) -lt $end) { Start-Sleep -Seconds 60 }" % int(sys.argv[1]))
print(base64.b64encode(ps.encode("utf-16-le")).decode())
PY
)"
  powershell.exe -NoProfile -NonInteractive -EncodedCommand "$PS_B64" </dev/null >/dev/null 2>&1 &
  AWAKE_PID=$!
fi

# ---------- what the builder is told ----------
mkdir -p "$REPO/.claude"
HANDOVER="$REPO/.claude/api-handover.md"
RULES="You are the FreeMotion BUILDER, running headless (claude -p) on Ezra's monthly API credits, started by ~/fm-api-builder.sh on his Windows laptop (WSL). Nobody is watching live; Ezra reads the log later. The wrapper calls you again after each turn ends, until $STOP_HUMAN, when the subscription builder takes over.
- Do NOT arm a loop (no CronCreate, no ScheduleWakeup): the wrapper is the loop. That is the only change to CLAUDE.md's first-message steps; tick.sh and the unshipped-release check still apply.
- Nobody can answer a question in real time. Decide the way LOOP.md says to when he is silent, and log any question in REQUESTS.md the way the rules say.
- Work exactly as CLAUDE.md and LOOP.md say: ./tools/tick.sh first, the oldest actionable item, prove before claiming, ship only with tools/ship-bg.sh (on this laptop with FM_SHIP_ALLOW_NON_MAC=1, as SWITCHOVER.md says), judge a ship only by its log. Never force-push, never rewrite history, never start a ship beside a running one. While a ship runs, build in a worktree as LOOP.md says; never edit this tree.
- The next releases are already built on GitHub: wip/v17.39-tree (Simple 2.2) to wip/v17.44-tree, and the Full batch (hunt/land-b1, hunt/labs-on, hunt/land-b3). A cloud helper pre-flights them in the cloud: before you ship a tree, fetch and read the newest hunt/preflight-* report for it and helper/done (tools/design/helper/DONE.md), and fix what they found first.
- End your turn when the current step is done or you are waiting on a ship or a suite; the wrapper calls you back. Finish each turn with at most 3 short lines: what you did, what is running, what is next.
- If an action is refused by the permission classifier, do not retry it in another form: note it in your 3 lines and move to work that does not need it.
- From $WIND_HUMAN, or when told to wind down: start nothing new, finish or park the current step, never leave a ship half-launched, and write a short dated handover (what shipped, what is in flight, the next item) to the file $HANDOVER (that exact path, even from a worktree). It is gitignored, so no ship sweeps it in; edit no tracked file during the wind-down, because a ship may be running."
RULES_TAG="$(printf '%s' "$RULES" | sha256sum | cut -c1-16)"
if [ "$(cat "$STATE/session_rules" 2>/dev/null)" != "$RULES_TAG" ]; then
  # a resumed conversation keeps the rules it started with (--system-prompt-snapshot), so new rules mean a new one
  rm -f "$STATE/session"; echo 0 > "$STATE/session_spent"
fi
echo "$RULES_TAG" > "$STATE/session_rules"

FIRST_PROMPT="Start: run ./tools/tick.sh, follow the rules at the top of LOOP.md, then work the oldest actionable item."
NEXT_PROMPT="Continue the FreeMotion loop: run ./tools/tick.sh, follow the rules at the top of LOOP.md, then work the oldest actionable item."
WIND_PROMPT="WIND DOWN NOW (the stop time is near, the money is nearly used, or Ezra asked you to stop): start nothing new, finish or park the current step, and write the handover to $HANDOVER as your rules say. Then end your turn."

# What a turn changed: every local branch, each worktree's checkout and edits. A turn that changed none of it was idle,
# however long it took (an idle turn at xhigh effort can easily run past two minutes).
fp() { ( trap '' INT HUP
  cd "$REPO" 2>/dev/null || exit 0
  { git for-each-ref --format='%(refname) %(objectname)' refs/heads 2>/dev/null
    git worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p' | while IFS= read -r w; do
      printf '%s %s\n' "$w" "$(git -C "$w" rev-parse HEAD 2>/dev/null)"
      git -C "$w" status --porcelain=v1 2>/dev/null
      git -C "$w" diff HEAD 2>/dev/null | sha256sum
    done
  } | sha256sum | cut -c1-16 ); }

# ---------- the loop ----------
SID="$(cat "$STATE/session" 2>/dev/null || true)"
SESSION_SPENT="$(cat "$STATE/session_spent" 2>/dev/null || echo 0)"; isnum "$SESSION_SPENT" || SESSION_SPENT=0
FAILS=0; TR=0; BLOCKS=0; IDLE_STREAK=0; LAST_IDLE=0; LAST_CALL=0; WIND_TRIES=0
cd "$REPO" || die "cannot cd to $REPO"
HAVE_SHIPLOCK=""
if [ -f tools/_shiplock.sh ] && . tools/_shiplock.sh 2>/dev/null; then HAVE_SHIPLOCK=1; fi
ship_live() { [ -n "$HAVE_SHIPLOCK" ] && case "$(ship_lock_state .ship-in-progress 2>/dev/null)" in live*) return 0 ;; esac; return 1; }
say "started: $MODEL, stops $STOP_HUMAN, cap \$$TOTAL_CAP (×$OVERHEAD), counted so far \$$SPENT${SID:+, resuming session $SID}"

while :; do
  [ "$STOPPING" = 1 ] && { say "stopping: asked to (Ctrl-C or the window closed)"; break; }
  NOW="$(date +%s)"
  [ "$NOW" -lt "$STOP_EPOCH" ] || { say "stop time reached"; break; }
  LEFT="$(calc "$TOTAL_CAP - $SPENT")"; isnum "$LEFT" || LEFT=0

  # a fresh session once this one has cost ROTATE_USD: a long transcript makes every call dearer, and the repo is
  # built for a session with no memory (tick.sh, LOOP.md, REQUESTS.md). Only between turns, never mid-step.
  if [ -n "$SID" ] && [ ! -f "$STATE/STOP" ] && [ "$NOW" -lt "$WIND_EPOCH" ] && ge "$LEFT" "$(calc "$RESERVE + 2")" && ge "$SESSION_SPENT" "$ROTATE_USD"; then
    say "session $SID has cost ≈ \$$SESSION_SPENT; starting a fresh one"
    SID=""; SESSION_SPENT=0; rm -f "$STATE/session"; echo 0 > "$STATE/session_spent"
  fi

  WINDING=0; WHY=""
  if [ -f "$STATE/STOP" ]; then WINDING=1; WHY="asked to stop"
  elif [ "$NOW" -ge "$WIND_EPOCH" ]; then WINDING=1; WHY="the wind-down time"
  elif ! ge "$LEFT" "$(calc "$RESERVE + 2")"; then WINDING=1; WHY="the money is nearly used"
  fi
  if [ "$WINDING" = 1 ]; then
    CAP="$(mn "$RUN_CAP" "$(calc "$LEFT / $OVERHEAD")")"
    ge "$CAP" 0.5 || { say "spend cap reached (≈ \$$SPENT of \$$TOTAL_CAP), no room left for a wind-down turn"; break; }
    PROMPT="$WIND_PROMPT"
  else
    CAP="$(mn "$RUN_CAP" "$(calc "($LEFT - $RESERVE) / $OVERHEAD")")"
    if [ -n "$SID" ]; then PROMPT="$NEXT_PROMPT"; else PROMPT="$FIRST_PROMPT"; fi
    # while a ship runs, an idle builder is asked again only every SHIP_POLL seconds (each call costs money)
    if [ "$LAST_IDLE" = 1 ] && [ "$((NOW - LAST_CALL))" -lt "$SHIP_POLL" ] && ship_live; then nap 60; continue; fi
  fi

  NEW_ID=""; RESUMED=0; BASE=0
  if [ -n "$SID" ]; then SESSION_ARGS=(--resume "$SID"); RESUMED=1; BASE="$SESSION_SPENT"
  else NEW_ID="$(python3 -c 'import uuid; print(uuid.uuid4())')"; SESSION_ARGS=(--session-id "$NEW_ID")
  fi
  FP0="$(fp)"
  [ "$STOPPING" = 1 ] && continue
  T0="$(date +%s)"
  [ "$T0" -lt "$STOP_EPOCH" ] || { say "stop time reached"; break; }
  # an ordinary turn ends 15 minutes into the wind-down, so the wind-down turn always has room before the stop
  END="$STOP_EPOCH"
  if [ "$WINDING" = 0 ] && [ "$((WIND_EPOCH + 900))" -lt "$END" ]; then END=$((WIND_EPOCH + 900)); fi
  LIMIT=$((END - T0)); [ "$LIMIT" -ge 1 ] || LIMIT=1

  PRE="$(calc "$SPENT + $CAP * $OVERHEAD")"; isnum "$PRE" && putspent "$PRE"   # nothing that kills this run can undercount
  [ "$WINDING" = 1 ] && say "winding down ($WHY)"
  ANTHROPIC_API_KEY="$KEY" timeout --signal=TERM --kill-after=60 "$LIMIT" \
    claude -p "$PROMPT" "${SESSION_ARGS[@]}" \
      --append-system-prompt "$RULES" \
      --model "$MODEL" --effort "$EFFORT" \
      --permission-mode auto \
      --max-budget-usd "$CAP" \
      --output-format json \
      </dev/null > "$STATE/last.json" 2> "$STATE/last.err" &
  CHILD=$!
  echo "$$ $CHILD" > "$LOCK"
  [ "$STOPPING" = 1 ] && kill -TERM "$CHILD" 2>/dev/null   # a stop that arrived between the checks and the start
  RC=0
  # `wait` returns early when a signal arrives; keep waiting until claude has really finished
  while kill -0 "$CHILD" 2>/dev/null; do wait "$CHILD"; RC=$?; done
  CHILD=""
  echo "$$" > "$LOCK"
  T1="$(date +%s)"

  # claude's own report. On --resume, total_cost_usd is the session's running total, so only the rise is this run's.
  # An estimate never becomes the base the next rise is measured from.
  read -r COST STOTAL NEWSID ISERR NDENY SUMMARY < <( trap '' INT HUP; exec python3 - "$STATE/last.json" "$CAP" "$BASE" "$RESUMED" <<'PY'
import json, sys
path, cap, base, resumed = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4] == "1"
try:
    d = json.load(open(path))
    if isinstance(d, list):   # with verbose on, json output is every message; the result is the last one
        d = next((m for m in reversed(d) if isinstance(m, dict) and m.get("type") == "result"), None)
        if d is None:
            raise ValueError("no result message")
        json.dump(d, open(path, "w"))
    tot = d.get("total_cost_usd")
    if tot is None:
        cost, stot = cap, base
    else:
        tot = float(tot)
        # a total below the base means the counter restarted (nothing was saved), so all of it is new;
        # a zeroed error result (0) counts nothing and leaves the base alone
        cost = tot - base if (resumed and tot >= base) else tot
        stot = tot if tot > 0 else base
    den = d.get("permission_denials") or []
    text = d.get("result") or " ".join([str(d.get("subtype") or "")] + [str(e) for e in (d.get("errors") or [])])
    if den:
        text = str(text) + " | refused %d: %s" % (len(den), "; ".join(str(x.get("tool_name")) for x in den[:5]))
    text = " ".join(str(text).split())[:300] or "-"
    print("%.6f" % cost, "%.6f" % stot, d.get("session_id") or "-", "1" if d.get("is_error") else "0", len(den), text)
except Exception:
    print("NA", "NA", "-", "1", 0, "(no readable result)")
PY
)
  if ! isnum "$COST"; then
    # no readable report: a run that died within a minute cannot have spent much (claude did not start: a flag, the
    # mode, the key); one that ran longer is counted at its whole cap, so the count never runs under the real spend
    if [ "$((T1 - T0))" -lt 60 ]; then COST=0; else COST="$CAP"; fi
    STOTAL="$BASE"
  fi
  CHARGE="$(calc "$COST * $OVERHEAD")"; isnum "$CHARGE" || CHARGE="$(calc "$CAP * $OVERHEAD")"
  NEWSPENT="$(calc "$SPENT + $CHARGE")"; isnum "$NEWSPENT" && SPENT="$NEWSPENT"; putspent "$SPENT"
  if [ "$NEWSID" != "-" ]; then SID="$NEWSID"
  elif [ -n "$NEW_ID" ] && [ "$((T1 - T0))" -ge 60 ]; then SID="$NEW_ID"   # a killed fresh session may still be resumable
  fi
  if [ -n "$SID" ] && isnum "$STOTAL"; then SESSION_SPENT="$STOTAL"; echo "$SID" > "$STATE/session"; echo "$SESSION_SPENT" > "$STATE/session_spent"; fi
  say "run: $((T1 - T0))s, rc $RC, ≈ \$$CHARGE with the classifier estimate (total ≈ \$$SPENT) | $SUMMARY"

  # errors are looked for only on a run that failed, and only in stderr and the report's error fields
  ERRTEXT=""
  if [ "$RC" != 0 ] || [ "$ISERR" = 1 ]; then
    ERRTEXT="$( { cat "$STATE/last.err"; ( trap '' INT HUP; exec python3 - "$STATE/last.json" <<'PY'
import json, sys
raw = open(sys.argv[1], errors="replace").read()
try:
    d = json.loads(raw)
except Exception:
    print(raw); sys.exit()
if isinstance(d, dict):
    print(d.get("subtype") or "", d.get("result") or "", json.dumps(d.get("errors") or ""), d.get("api_error_status") or "")
PY
    ); } 2>/dev/null | tr '[:upper:]' '[:lower:]')"
  fi
  if printf '%s' "$ERRTEXT" | grep -qE 'invalid x-api-key|authentication_error|invalid api key|api key.*(invalid|revoked)'; then
    mv -f "$KEYFILE" "$KEYFILE.rejected"
    say "STOPPED: the API key was refused. It was moved to $KEYFILE.rejected; run the script again and it will ask for a new key (Console > API keys)."
    break
  fi
  if printf '%s' "$ERRTEXT" | grep -qE 'specified api usage limit|workspace.*limit|spend limit'; then
    say "STOPPED: the Console's spend limit was reached. See $STATE/last.err."
    break
  fi
  if printf '%s' "$ERRTEXT" | grep -qE 'credit balance|insufficient (credit|fund)|payment required|billing'; then
    say "STOPPED: a billing error. The monthly credits may not apply to this key, or they have run out. See $STATE/last.err and the Console's Billing page."
    break
  fi
  if printf '%s' "$ERRTEXT" | grep -qE 'weekly limit|hit your [a-z -]*limit|claude\.ai subscription'; then
    say "STOPPED: Claude answered as if it were using your subscription, not the API key. See $STATE/last.err."
    break
  fi
  # when auto mode is unavailable at start, claude falls back SILENTLY to default mode, which in -p refuses every command
  # and edit with rc 0; so a run that had actions refused and changed nothing counts like a classifier stop
  FP1="$(fp)"; DENIED_IDLE=0
  case "$NDENY" in ''|*[!0-9]*|0) ;; *) [ "$FP0" = "$FP1" ] && DENIED_IDLE=1 ;; esac
  if [ "$DENIED_IDLE" = 1 ] || printf '%s' "$ERRTEXT" | grep -qE 'too many classifier denials|no safety verdict|auto mode (is )?unavailable'; then
    BLOCKS=$((BLOCKS + 1))
    say "actions were refused and nothing changed, or the safety classifier ended this run ($BLOCKS in a row)"
    [ "$BLOCKS" -ge 2 ] && { say "STOPPED: two runs in a row had their actions refused (auto mode may be off: it falls back silently to default mode, which refuses every command and edit) or were ended by the safety classifier. See $STATE/last.json."; break; }
  else
    BLOCKS=0
  fi
  if { [ "$RC" = 124 ] || [ "$RC" = 137 ]; } && [ "$T1" -ge "$((STOP_EPOCH - 5))" ]; then say "the run hit the stop time"; break; fi
  [ "$RC" = 137 ] && say "claude was killed (rc 137) before the stop time, probably out of memory; carrying on"
  if [ "$NEWSID" = "-" ] && [ "$RESUMED" = 1 ] && printf '%s' "$ERRTEXT" | grep -qE 'no conversation found|session.*not found'; then
    say "the saved session could not be resumed; starting a fresh one"
    SID=""; SESSION_SPENT=0; rm -f "$STATE/session"; echo 0 > "$STATE/session_spent"
  fi
  TRHIT=0
  printf '%s' "$ERRTEXT" | grep -qE 'rate.?limit|overloaded|\b429\b|\b5[0-9][0-9]\b|econnreset|etimedout|enotfound|eai_again|econnrefused|socket hang up|fetch failed|network|connection (error|reset|refused)|can.t reach the api|no internet route|connection (dropped|lost|closed before|to the api was lost)|unable to connect to api([ .(]|$)|request timed out|no response from api|etimeout|failedtoopensocket|connectionclosed|enetunreach|enetdown|ehostunreach|ehostdown|epipe|econnaborted|err_socket_closed|und_err_socket' && TRHIT=1
  # a run that failed without starting work counts toward the three-strikes stop; network trouble, rate limits and
  # overloads cost nothing and pass by themselves, so they get a growing wait instead
  if [ "$RC" != 0 ] && [ "$ISERR" = 1 ] && [ "$TRHIT" = 0 ] && ! ge "$COST" 0.01; then
    FAILS=$((FAILS + 1))
    if [ "$RESUMED" = 1 ] && [ -n "$SID" ]; then
      say "the resumed session failed before doing any work; the next run starts a fresh one"
      SID=""; SESSION_SPENT=0; rm -f "$STATE/session"; echo 0 > "$STATE/session_spent"
    fi
  else FAILS=0; fi
  if [ "$FAILS" -ge 3 ]; then
    say "STOPPED: three runs in a row failed before doing any work. Last error: $SUMMARY $(head -c 200 "$STATE/last.err" | tr '\n' ' ')"
    break
  fi
  [ "$STOPPING" = 1 ] && { say "stopping: asked to (Ctrl-C or the window closed)"; break; }
  if [ "$WINDING" = 1 ]; then
    if [ "$RC" = 0 ] && [ "$ISERR" = 0 ]; then say "wind-down turn done; stopping"; break; fi
    WIND_TRIES=$((WIND_TRIES + 1))
    [ "$WIND_TRIES" -ge 3 ] && { say "STOPPED: the wind-down turn failed three times; no handover was written"; break; }
    say "the wind-down turn failed; trying again"
  fi
  if [ "$TRHIT" = 1 ]; then
    TR=$((TR + 1)); W="$TR_SLEEP"; i=1; while [ "$i" -lt "$TR" ] && [ "$W" -lt "$MAX_WAIT" ]; do W=$((W * 2)); i=$((i + 1)); done
    [ "$W" -gt "$MAX_WAIT" ] && W="$MAX_WAIT"
    say "network trouble, a rate limit or an overload ($TR in a row); waiting $W s"; nap "$W"; continue
  fi
  TR=0
  LAST_CALL="$T0"
  if [ "$FP0" = "$FP1" ]; then LAST_IDLE=1; IDLE_STREAK=$((IDLE_STREAK + 1)); else LAST_IDLE=0; IDLE_STREAK=0; fi
  if [ "$RC" != 0 ] && [ "$ISERR" = 1 ]; then nap "$FAIL_SLEEP"
  elif [ "$LAST_IDLE" = 1 ]; then
    # an idle turn comes back after a growing wait: 1, 2, 4, 8 minutes... up to MAX_WAIT; any real work resets it
    W="$IDLE_SLEEP"; i=1; while [ "$i" -lt "$IDLE_STREAK" ] && [ "$W" -lt "$MAX_WAIT" ]; do W=$((W * 2)); i=$((i + 1)); done
    [ "$W" -gt "$MAX_WAIT" ] && W="$MAX_WAIT"
    nap "$W"
  fi
done
