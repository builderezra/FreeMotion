#!/usr/bin/env bash
# The FreeMotion builder, run HEADLESS on Ezra's monthly API credits (11 Oct 2026).
#
# WHY THIS EXISTS. Max 20x comes with ~US$200 a month of API credits that expire at the end of each billing cycle and
# cannot pay for interactive Claude Code, the desktop app, cloud sessions or Remote Control. The one thing they do pay
# for is `claude -p` run with an API key. So when the subscription is out of usage, this script keeps the builder
# working on those credits: it runs `claude -p` in a loop, the way the cron loop runs the interactive builder.
#
# HOW TO START IT (WSL / Ubuntu terminal on the laptop, one paste):
#   curl -fsSL https://raw.githubusercontent.com/builderezra/FreeMotion/refs/heads/claude/laughing-euler-5lq4ml/tools/api-builder.sh -o ~/fm-api-builder.sh && bash ~/fm-api-builder.sh
# It asks for the API key once (console.anthropic.com > API keys) and keeps it in ~/.fm-api-builder/key (chmod 600).
# Leave the window open (minimise it): closing it stops the builder. Ctrl-C stops it too.
#
# WHAT KEEPS IT SAFE
# - The key is passed to `claude` for each run only. It is never exported into your shell, because an exported
#   ANTHROPIC_API_KEY takes over every Claude on the machine and knocks the Remote Control builder/logger offline.
# - It stops by itself at FM_STOP_AT (default 15:45 AWST 12 Oct, 15 minutes before the subscription comes back), and
#   from FM_WIND_DOWN (30 min earlier) it tells the builder to start nothing new and write a handover.
# - It stops when the spend it has counted reaches FM_TOTAL_CAP (default $185), and each run is capped at FM_RUN_CAP
#   (default $20) with --max-budget-usd. The count is an estimate from claude's own report; the Console's Usage page
#   is the real number.
# - It stops at once on a billing error ("credit balance too low" means the credits did not apply to this key).
# - Auto mode, never "skip all permissions": every action the headless builder takes still goes through Claude Code's
#   safety classifier, which refuses the risky ones (deleting what it should not, leaking secrets, and the like). If it
#   refuses something the builder needed, the builder logs it and the subscription builder picks it up at 16:00.
# - Three failed runs in a row that cost nothing (claude would not start: a flag, the mode or the key) stop it.
# - One copy at a time (a lock with its pid). `touch ~/.fm-api-builder/STOP` makes the builder wind down and stop.
# - All its files live in ~/.fm-api-builder, OUTSIDE the repo: ship.sh ends with `git add -A`, which would sweep
#   anything left in the tree into a release.
#
# Settings (environment variables, all optional): FM_REPO (default ~/FreeMotion), FM_STOP_AT, FM_WIND_DOWN,
# FM_TOTAL_CAP, FM_RUN_CAP, FM_MODEL (default claude-opus-5-5), FM_EFFORT (default xhigh),
# FM_ROTATE_USD (start a fresh session once one session has cost this much; default 35).
set -u

STATE="$HOME/.fm-api-builder"
REPO="${FM_REPO:-$HOME/FreeMotion}"
STOP_AT="${FM_STOP_AT:-2026-10-12 15:45 +0800}"
TOTAL_CAP="${FM_TOTAL_CAP:-185}"
RUN_CAP="${FM_RUN_CAP:-20}"
MODEL="${FM_MODEL:-claude-opus-5-5}"
EFFORT="${FM_EFFORT:-xhigh}"
ROTATE_USD="${FM_ROTATE_USD:-35}"
IDLE_SLEEP="${FM_IDLE_SLEEP:-60}"   # (for tests) the pause after an idle turn, like the cron loop's minute
FAIL_SLEEP="${FM_FAIL_SLEEP:-30}"
mkdir -p "$STATE"
chmod 700 "$STATE"
PROGRESS="$STATE/progress.log"

say() { printf '%s  %s\n' "$(TZ=Australia/Perth date '+%a %H:%M:%S')" "$*" | tee -a "$PROGRESS"; }
die() { echo "❌ $*" >&2; exit 1; }
# float arithmetic without bc (python3 is already a dependency of the repo's tools)
calc() { python3 -c "import sys; print(eval(sys.argv[1], {'__builtins__': {}}, {}))" "$1"; }
ge() { python3 -c "import sys; sys.exit(0 if float(sys.argv[1]) >= float(sys.argv[2]) else 1)" "$1" "$2"; }

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

if ! command -v claude >/dev/null; then
  [ -x "$HOME/.local/bin/claude" ] && export PATH="$HOME/.local/bin:$PATH"
fi
if ! command -v claude >/dev/null; then
  echo "Claude Code is not installed inside WSL. Install it now with the official installer"
  printf "(curl -fsSL https://claude.ai/install.sh | bash)? [y/N] "
  read -r yn
  [ "$yn" = "y" ] || [ "$yn" = "Y" ] || die "not installed; nothing was started"
  curl -fsSL https://claude.ai/install.sh | bash || die "the installer failed"
  export PATH="$HOME/.local/bin:$PATH"
  command -v claude >/dev/null || die "claude still not found after installing"
fi

# one copy at a time
LOCK="$STATE/lock"
if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
  die "another copy is already running (pid $(cat "$LOCK")). Stop it first (Ctrl-C in its window, or touch $STATE/STOP)."
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"; say "stopped (spent so far ≈ \$$(cat "$STATE/spent" 2>/dev/null || echo 0))"' EXIT
trap 'echo; say "Ctrl-C: stopping after this point"; exit 130' INT TERM

# the key: kept in a 600 file, never exported
KEYFILE="$STATE/key"
if [ ! -s "$KEYFILE" ]; then
  echo "Paste your Anthropic API key (console.anthropic.com > API keys). It is stored only in $KEYFILE."
  printf "API key: "
  read -rs KEY; echo
  case "$KEY" in sk-ant-*) ;; *) die "that does not look like an API key (they start with sk-ant-)";; esac
  ( umask 077; printf '%s' "$KEY" > "$KEYFILE" )
fi
chmod 600 "$KEYFILE"
KEY="$(cat "$KEYFILE")"

rm -f "$STATE/STOP"
[ -f "$STATE/spent" ] || echo 0 > "$STATE/spent"
SPENT="$(cat "$STATE/spent")"

echo
echo "FreeMotion headless builder"
echo "  repo:        $REPO"
echo "  model:       $MODEL (effort $EFFORT)"
echo "  stops at:    $STOP_HUMAN (winds down from $WIND_HUMAN)"
echo "  spend cap:   \$$TOTAL_CAP total (already counted: \$$SPENT), \$$RUN_CAP per run"
echo "  log:         $PROGRESS   (watch with: tail -f $PROGRESS)"
echo "  stop early:  Ctrl-C here, or: touch $STATE/STOP"
echo
if [ -t 0 ]; then
  printf "Start? [y/N] "; read -r yn
  [ "$yn" = "y" ] || [ "$yn" = "Y" ] || die "not started"
fi

# ---------- what the builder is told ----------
RULES="You are the FreeMotion BUILDER, running headless (claude -p) on Ezra's monthly API credits, started by ~/fm-api-builder.sh on his Windows laptop (WSL). Nobody is watching live; Ezra reads the log later. The wrapper calls you again about a minute after each turn ends, until $STOP_HUMAN, when the subscription builder takes over.
- Do NOT arm a loop (no CronCreate, no ScheduleWakeup): the wrapper is the loop. That is the only change to CLAUDE.md's first-message steps; tick.sh and the unshipped-release check still apply.
- Nobody can answer a question in real time. Decide the way LOOP.md says to when he is silent, and log any question in REQUESTS.md the way the rules say.
- Work exactly as CLAUDE.md and LOOP.md say: ./tools/tick.sh first, the oldest actionable item, prove before claiming, ship only with tools/ship-bg.sh (on this laptop with FM_SHIP_ALLOW_NON_MAC=1, as SWITCHOVER.md says), judge a ship only by its log. Never force-push, never rewrite history, never start a ship beside a running one.
- The next releases are already built on GitHub: wip/v17.39-tree (Simple 2.2) to wip/v17.44-tree, and the Full batch (hunt/land-b1, hunt/labs-on, hunt/land-b3). A cloud helper pre-flights them in the cloud: before you ship a tree, fetch and read the newest hunt/preflight-* report for it and helper/done (tools/design/helper/DONE.md), and fix what they found first.
- End your turn when the current step is done or you are waiting on a ship or a suite; the wrapper calls you back. Finish each turn with at most 3 short lines: what you did, what is running, what is next.
- From $WIND_HUMAN, or as soon as the file $STATE/STOP exists: start nothing new. Finish or park the current step, never leave a ship half-launched, and put a short dated handover at the top of HANDOVER.md (what shipped, what is in flight, the next item) for the subscription builder."

FIRST_PROMPT="Start: run ./tools/tick.sh, follow the rules at the top of LOOP.md, then work the oldest actionable item."
NEXT_PROMPT="Continue the FreeMotion loop: run ./tools/tick.sh, follow the rules at the top of LOOP.md, then work the oldest actionable item."

# ---------- the loop ----------
SID="$(cat "$STATE/session" 2>/dev/null || true)"
SESSION_SPENT="$(cat "$STATE/session_spent" 2>/dev/null || echo 0)"
FAILS=0
say "started: $MODEL, stops $STOP_HUMAN, cap \$$TOTAL_CAP, counted so far \$$SPENT${SID:+, resuming session $SID}"
cd "$REPO" || die "cannot cd to $REPO"

while :; do
  NOW="$(date +%s)"
  [ "$NOW" -lt "$STOP_EPOCH" ] || { say "stop time reached"; break; }
  LEFT="$(calc "$TOTAL_CAP - $SPENT")"
  ge "$LEFT" 2 || { say "spend cap reached (≈ \$$SPENT of \$$TOTAL_CAP)"; break; }
  CAP="$RUN_CAP"; ge "$LEFT" "$RUN_CAP" || CAP="$LEFT"

  # a fresh session once this one has cost ROTATE_USD: a long transcript makes every call dearer, and the repo is
  # built for a session with no memory (tick.sh, LOOP.md, REQUESTS.md). Only between turns, never mid-step.
  if [ -n "$SID" ] && ge "$SESSION_SPENT" "$ROTATE_USD"; then
    say "session $SID has cost ≈ \$$SESSION_SPENT; starting a fresh one"
    SID=""; SESSION_SPENT=0; rm -f "$STATE/session"; echo 0 > "$STATE/session_spent"
  fi

  if [ -f "$STATE/STOP" ] || [ "$NOW" -ge "$WIND_EPOCH" ]; then
    PROMPT="WIND DOWN NOW (it is past $WIND_HUMAN or Ezra asked you to stop): start nothing new, finish or park the current step, and write the handover at the top of HANDOVER.md as your rules say. Then end your turn."
    WINDING=1
  elif [ -n "$SID" ]; then PROMPT="$NEXT_PROMPT"; WINDING=0
  else PROMPT="$FIRST_PROMPT"; WINDING=0
  fi

  SESSION_ARGS=()
  [ -n "$SID" ] && SESSION_ARGS=(--resume "$SID")
  T0="$(date +%s)"
  # timeout: no run may outlive the stop time (TERM first, so claude saves its transcript; KILL a minute later)
  timeout --signal=TERM --kill-after=60 "$((STOP_EPOCH - T0))" \
    env -u ANTHROPIC_AUTH_TOKEN ANTHROPIC_API_KEY="$KEY" \
    claude -p "$PROMPT" "${SESSION_ARGS[@]}" \
      --append-system-prompt "$RULES" \
      --model "$MODEL" --effort "$EFFORT" \
      --permission-mode auto \
      --max-budget-usd "$CAP" \
      --output-format json \
      > "$STATE/last.json" 2> "$STATE/last.err"
  RC=$?
  T1="$(date +%s)"

  # read claude's own report: cost, session, result text. Unreadable → count the whole per-run cap (never undercount).
  read -r COST NEWSID ISERR SUMMARY < <(python3 - "$STATE/last.json" "$CAP" <<'PY'
import json, sys
cap = sys.argv[2]
try:
    d = json.load(open(sys.argv[1]))
    cost = d.get("total_cost_usd")
    cost = cap if cost is None else cost
    sid = d.get("session_id") or "-"
    err = "1" if d.get("is_error") else "0"
    text = " ".join(str(d.get("result") or d.get("subtype") or "").split())[:300] or "-"
    print(cost, sid, err, text)
except Exception:
    print("NA", "-", "1", "(no readable result)")
PY
)
  # no readable report: a run that died within a minute cannot have spent much (claude did not start: a flag, the
  # mode, the key); one that ran longer is counted at its whole cap, so the count never runs under the real spend
  UNREAD=0
  if [ "$COST" = NA ]; then
    UNREAD=1
    if [ "$((T1 - T0))" -lt 60 ]; then COST=0; else COST="$CAP"; fi
  fi
  SPENT="$(calc "$SPENT + $COST")"; echo "$SPENT" > "$STATE/spent"
  SESSION_SPENT="$(calc "$SESSION_SPENT + $COST")"; echo "$SESSION_SPENT" > "$STATE/session_spent"
  if [ "$NEWSID" != "-" ]; then SID="$NEWSID"; echo "$SID" > "$STATE/session"; fi
  say "run: $((T1 - T0))s, rc $RC, ≈ \$$COST (total ≈ \$$SPENT) | $SUMMARY"

  ERRTEXT="$(cat "$STATE/last.err" "$STATE/last.json" 2>/dev/null | tr '[:upper:]' '[:lower:]')"
  if printf '%s' "$ERRTEXT" | grep -qE 'credit balance|insufficient (credit|fund)|billing|payment required|invalid x-api-key|authentication_error|invalid api key'; then
    say "STOPPED: billing or key error. Either the key is wrong or the monthly credits do not apply to it. See $STATE/last.err and the Console's Billing page."
    break
  fi
  if [ "$RC" = 124 ] || [ "$RC" = 137 ]; then say "the run hit the stop time"; break; fi
  if [ "$NEWSID" = "-" ] && [ -n "$SID" ] && printf '%s' "$ERRTEXT" | grep -qE 'no conversation found|session.*not found'; then
    say "the saved session could not be resumed; starting a fresh one"; SID=""; rm -f "$STATE/session"
  fi
  if printf '%s' "$ERRTEXT" | grep -qE 'rate.?limit|overloaded|\b429\b|\b529\b'; then
    say "rate-limited or overloaded; waiting 3 minutes"; sleep 180; continue
  fi
  if [ "$RC" != 0 ] && [ "$ISERR" = 1 ] && ! ge "$COST" 0.01; then FAILS=$((FAILS + 1)); else FAILS=0; fi
  [ "$UNREAD" = 1 ] && [ "$COST" = 0 ] && [ "$FAILS" = 0 ] && FAILS=1
  if [ "$FAILS" -ge 3 ]; then
    say "STOPPED: three runs in a row failed before doing any work. Last error: $(head -c 300 "$STATE/last.err" | tr '\n' ' ')"
    break
  fi
  [ "$WINDING" = 1 ] && { say "wind-down turn done; stopping"; break; }
  # an idle turn (nothing to do, or waiting on a ship) comes back after a minute, like the cron loop; a crash after 30 s
  if [ "$RC" != 0 ] && [ "$ISERR" = 1 ]; then sleep "$FAIL_SLEEP"
  elif [ "$((T1 - T0))" -lt 120 ]; then sleep "$IDLE_SLEEP"
  fi
done
