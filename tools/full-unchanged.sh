#!/bin/bash
# ═══ THE "FULL UNCHANGED" LOCK (queue 980; DESIGN.md §0.4.5, §21 F9/F10; BUILD-PLAN.md §3.2) ═════════════════════════
#
#   tools/full-unchanged.sh                  # measure the tree against HEAD; prints PASS or the first differences by name
#   tools/full-unchanged.sh --measure        # re-measure the tolerances (HEAD against itself, every group, and a 1 px move)
#   tools/full-unchanged.sh --selftest-gate  # the ship.sh gate's rules (tools/_fu_gate.py), in a second
#   tools/full-unchanged.sh --hash           # the source hash a PASS is cached under
#   tools/full-unchanged.sh --selftest-port  # two runs started at the same instant get two ports, each serving its own folder
#
# ⚠️ IT TAKES ~20 MINUTES — over the Bash tool's 600 s cap. Run it in the background (run_in_background) and read its
# output when it says it is done; never in the foreground, or the cap kills it half-way (its trap cleans up, but the run
# is wasted).
#
# His rule, 1 Oct: "i dont want the original editor changing in design and function … dont do that." The Simple editor
# is built beside Full, and every Simple release has to prove Full did not move — not by a session saying so, by THIS:
# HEAD (the release before) and the tree are each served and driven through tests/full-unchanged.html at 380×800 (a
# touch phone, real fingers) and 1280×800 (a mouse that hovers), and the two records are compared — every visible
# element's box, words, painted styles and attributes (exact), the preview's resolution and what it drew (exact), what
# each screen animated, every edit's document, undo depth, toasts, selection, views and frames (exact), a real export's
# file, the live session's whole wire, the documents' bytes, the cog at fourteen sizes, and two pictures of every screen
# (within the tolerances measured below).
#
# It cannot pass on a run that did not measure: if the probe could not drive HEAD somewhere — or drove the function under
# a control instead of the control, or a finger missed what it was moving — that is a broken instrument and the answer is
# no. And it cannot pass with a blind eye: every run plants 25 changes Full must never get (tools/full-unchanged-
# plants.json: DESIGN's three; ALL NINETEEN the 1 Oct review slipped past v1 in one "Simple release"; and DESIGN's B4 / B5
# guards) and each must turn it red BY NAME, or it refuses to print PASS. A PASS is cached by a hash of the sources
# (tools/_fu_gate.py, the same rule ship.sh reads), so ship.sh can refuse a Simple release whose exact tree never passed.
#
# No worktree and no stash (both are shared state — memory): HEAD comes out of `git archive`. ONE server, on a free port in
# 8790–8799 (then 8800–8849; never 8777, never a port another run holds), serves every copy as a sub-folder; it proves it
# is OURS by handing back a token only this run wrote. Its server, Chromes and work folder die on a trap — and on a
# watchdog, if this script itself is killed outright.
set -uo pipefail
[ -x /Library/Developer/CommandLineTools/usr/bin/git ] && export DEVELOPER_DIR=/Library/Developer/CommandLineTools

# ═══ FU_INVISIBLE — THE ONLY KEYS ALLOWED TO DIFFER (DESIGN §0.4.3, §0.4.4) ═══════════════════════════════════════════
# One list, here and nowhere else. WHERE each kind applies is fixed in tools/_fu_compare.py (apply_mask), not chosen here:
#   layer.*     the documents Full's edits produce: FU2, FU3, FU4's wire (an `li` op carries the whole layer — DESIGN §21
#               F9) and its guest's document, FU6's Canvas Apply / Cancel. NEVER FU5 (I1: the sanitiser byte for byte; the
#               probe strips these keys from FU5's one self-built input instead, so both sides feed it the same bytes).
#   meta.*      FU5's two schema names only (N1).
#   presence.*  FU4's presence frames only (I7).   manifest.*  FU4's media manifest entries only (I7).
# Adding a line here is a claim that Full never reads that key. It needs its §0.4.3 row and a guard test, or it does not
# go in — and in a Simple release it CANNOT go in: tools/_fu_gate.py refuses a Simple release that changes this file.
FU_INVISIBLE='
layer.srcW       # I2  the source width written at add / Replace / duplicate / paste — a plain field no Full code reads
layer.srcH       # I2  the source height, same
layer.srcRev     # I2  the source revision, same
layer.pick       # I3  {b, i} on each layer of a multi-file import — never read by Full, stripped on copy
layer.sm.twin    # I5  extractAudio marks the sound it took out of a clip — one invisible key on the new layer
meta.SCHEMA_REV  # N1  the sync schema revision: a sanitiser change must bump it (by name, FU5 only)
meta.SCHEMA_FP   # N1  the sync schema fingerprint, same
presence.ed      # I7  which editor a member is in — wire only, Full draws none of it (FU4: "presence equal except ed")
manifest.w       # I7  the width in a media manifest entry — wire only
manifest.h       # I7  its height, same
manifest.dur     # I7  its duration, same
'

# ═══ THE TOLERANCES — MEASURED, NOT CHOSEN (memory: "set float tolerances from measurement") ═══════════════════════════
# MEASURED 6 Oct 2026 on v17.23 (b46b47d3), headless Chrome + SwiftShader on this Mac, every FU1 picture (the screen, and
# the screen with the preview hidden — 64 pictures over both widths) at 380 (touch) and 1280, with
# `tools/full-unchanged.sh --measure` (HEAD rendered twice, every group, and the #transport 1 px margin). Its table:
#     chan       0    1    2    4    6    8   12   16   24   32   64
#     jitter    28   10    6    4    4    2    2    2    0    0    0     (the most px any one picture moved, HEAD vs HEAD)
#     smallest  67  311  199   94   30  105   77   68   58   35   22     (the margin's least-changed picture that moved)
# (1 Oct, v1's measurement of the same: 0–2 px of jitter at 24.) The decoded export, HEAD against HEAD: 0 levels in every
# cell at both widths. The records, HEAD against HEAD: 18 differences in v2's probe, every one a probe bug, each fixed and
# named where it was (a glint caught mid-sweep, an id inside an op path, the doc checksum, a hover's shadow mid-
# transition, the encoder's bytes) — the run that set these numbers is the one PASS below re-checks on every run, because
# the tree it compares with HEAD is, for the app, HEAD itself until a Simple release changes it.
# v1 sat at 12 px over 24 levels, which hid a 6 px line moved by 1 px (12 px) and every recolour of 24 levels or less (a
# panel border 20 levels lighter counted 0). Now: just above the jitter, a second faint threshold for wide recolours, and
# tools/_fu_compare.py proves on every run that a 4 px line moved 1 px and a 20-level border recolour are both seen.
FU_JITTER_PX=2              # HEAD against itself at FU_CHAN: 0 px measured 6 Oct, 2 on 1 Oct — the larger is written
FU_SMALLEST_REAL_PX=58      # the smallest real change at FU_CHAN: the #transport 1 px margin, its least-changed picture
FU_CHAN=24                  # a pixel counts as changed when any channel moved by more than this …
FU_TOL_PX=3                 # … and a picture may have at most this many: just above the jitter (a 4 px line moved 1 px = 8)
FU_FAINT_CHAN=8             # a pixel counts as FAINTLY changed when a channel moved by more than this …
FU_FAINT_JITTER_PX=2        # … HEAD against itself at FU_FAINT_CHAN: 2 px measured 6 Oct …
FU_FAINT_TOL_PX=8           # … and a picture may have at most this many (a 40 px panel's border recoloured 20 levels = 156)
FU_GRID_JITTER=0            # a decoded export cell, HEAD against itself: 0 levels measured 6 Oct, both widths
FU_GRID_TOL=4               # … and the most a cell may move (the saturate plant moves cells by tens of levels)
export FU_INVISIBLE FU_TOL_PX FU_CHAN FU_FAINT_TOL_PX FU_FAINT_CHAN FU_GRID_TOL

ROOT="${FU_ROOT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT" || exit 2
MODE=run
case "${1:-}" in
  ''|--run) MODE=run ;;
  --measure) MODE=measure ;;
  --selftest-gate) exec python3 tools/_fu_gate.py selftest ;;
  --hash) exec python3 tools/_fu_gate.py hash ;;
  --selftest-port) MODE=selftest-port ;;
  -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
  *) echo "full-unchanged: unknown option $1 (see --help)"; exit 2 ;;
esac
# BASH READS A SCRIPT AS IT RUNS: an edit to this file during a run — another session on the same tree, a pull — would have
# the rest of the run execute whatever bytes now sit at its read offset (6 Oct: edited mid-run while developing it). So a
# run executes a private copy, taken here; the real file is read again only by the hash at the end, which then differs,
# so a run whose instrument changed under it earns no PASS. (The copy goes on the cleanup trap.)
if [ -z "${FU_SELF_COPY:-}" ]; then
  _copy="$(mktemp "${TMPDIR:-/tmp}/fm-full-unchanged-self.XXXXXX")" || exit 2
  cp "$0" "$_copy" || exit 2
  FU_SELF_COPY="$_copy" FU_ROOT_DIR="$ROOT" exec bash "$_copy" "$@"
fi
# Each tolerance is a claim about two measurements; a hand-loosened number that no longer sits between them is refused.
# (And none of these lines can change in a Simple release at all: tools/_fu_gate.py refuses one that edits this file.)
if ! [ "$FU_TOL_PX" -gt "$FU_JITTER_PX" ] 2>/dev/null || ! [ "$FU_TOL_PX" -lt 8 ] 2>/dev/null || ! [ "$FU_TOL_PX" -lt "$FU_SMALLEST_REAL_PX" ] 2>/dev/null \
   || ! [ "$FU_FAINT_TOL_PX" -gt "$FU_FAINT_JITTER_PX" ] 2>/dev/null || ! [ "$FU_FAINT_TOL_PX" -lt 156 ] 2>/dev/null \
   || ! [ "$FU_GRID_TOL" -gt "$FU_GRID_JITTER" ] 2>/dev/null || ! [ "$FU_GRID_TOL" -le 16 ] 2>/dev/null; then
  echo "❌ a tolerance no longer sits between its measured jitter and the smallest change it must catch:"
  echo "   FU_TOL_PX $FU_TOL_PX (jitter $FU_JITTER_PX, a 4 px line moved 1 px = 8), FU_FAINT_TOL_PX $FU_FAINT_TOL_PX (jitter $FU_FAINT_JITTER_PX, a border recolour = 156), FU_GRID_TOL $FU_GRID_TOL (jitter $FU_GRID_JITTER)"
  echo "   Re-measure with tools/full-unchanged.sh --measure and write BOTH numbers, not just a looser tolerance."
  exit 2
fi
FU_INV_Q="$(printf '%s\n' "$FU_INVISIBLE" | sed 's/#.*//' | awk '$1 ~ /^layer\./ {print $1}' | paste -sd, -)"

say() { printf '%s\n' "$*"; }
REPORT="$ROOT/tools/.full-unchanged-report"
: > "$REPORT"
log() { printf '%s\n' "$*" | tee -a "$REPORT"; }

# ─── 1. THE BUILDER MUST BE IDLE, AND THE MAC NOT DROWNING ───────────────────────────────────────────────────────────
# A ship, a mutation or a spot-check running beside this would serve a mutated tree or starve both runs' timing.
waited=0
while [ -f .ship-in-progress ] || [ -f .mutation-in-progress ] || [ -f .spotcheck-in-progress ]; do
  [ "$waited" = 0 ] && say "→ waiting for the builder to be idle (a ship, mutation or spot-check is running)…"
  waited=$((waited + 20)); [ "$waited" -gt 1800 ] && { say "❌ still busy after 30 minutes — not measuring a tree that is being changed"; exit 2; }
  sleep 20
done
MAXLOAD="${FU_MAX_LOAD:-10}"
waitload() {
  local waited=0
  while [ "$(uptime | sed -E 's/.*load averages?: ([0-9.]+).*/\1/' | cut -d. -f1)" -ge "$MAXLOAD" ]; do
    [ "$waited" = 0 ] && say "→ waiting for the load average to fall under $MAXLOAD ($(uptime | sed 's/.*load averages*://'))…"
    waited=$((waited + 20)); [ "$waited" -gt 1200 ] && { say "❌ the Mac stayed too busy for 20 minutes — timings would be the machine's, not the app's"; return 1; }
    sleep 20
  done
}
waitload || exit 2

# ─── 2. A WORK FOLDER, AND A TRAP THAT TAKES EVERYTHING WE STARTED WITH IT ───────────────────────────────────────────
# SIGTERM to the drivers, not SIGINT: a backgrounded python inherits SIGINT as ignored, so v1's `kill -INT` did nothing and
# the SIGKILL after it skipped _cdp.py's finally — both Chrome profiles were left in $TMPDIR. _cdp.py turns TERM into an
# ordinary exit, so its finally closes Chrome and deletes the profile; we wait for that before anything is forced.
WORK="$(mktemp -d "${TMPDIR:-/tmp}/fm-full-unchanged.XXXXXX")"
SERVER=""; CDPS=(); WATCH=(); LOCK=""; PORT=""
cleanup() {
  local p
  for p in "${CDPS[@]:-}"; do [ -n "$p" ] && kill -TERM "$p" 2>/dev/null; done
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    local alive=0
    for p in "${CDPS[@]:-}"; do [ -n "$p" ] && kill -0 "$p" 2>/dev/null && alive=1; done
    [ "$alive" = 0 ] && break
    sleep 1
  done
  for p in "${CDPS[@]:-}"; do [ -n "$p" ] && { pkill -KILL -P "$p" 2>/dev/null; kill -KILL "$p" 2>/dev/null; }; done
  [ -n "$SERVER" ] && kill "$SERVER" 2>/dev/null
  for p in "${WATCH[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done
  [ -n "$LOCK" ] && rm -rf "$LOCK"
  rm -f "${FU_SELF_COPY:-/nonexistent}"
  [ -n "${FU_KEEP:-}" ] && say "(kept $WORK)" || rm -rf "$WORK"
}
trap cleanup EXIT
trap 'exit 130' INT TERM
# THE WATCHDOG (review of v1): a SIGKILLed script runs no trap — v1 then left both servers listening for good and two
# probes with ~22 Chromes running until _cdp.py's own 30-minute timeout. Each child gets a small loop that outlives us by at
# most two seconds: when this script's PID is gone, it TERMs the child (and the child cleans up after itself), then the
# work folder and the port's lock go too.
ME=$$
watch_child() {   # watch_child <pid>
  ( trap '' INT; while kill -0 "$ME" 2>/dev/null; do sleep 2; done
    kill -TERM "$1" 2>/dev/null; sleep 12; kill -KILL "$1" 2>/dev/null
    [ -z "${FU_KEEP:-}" ] && rm -rf "$WORK"; [ -n "$LOCK" ] && rm -rf "$LOCK" ) >/dev/null 2>&1 &
  WATCH+=($!)
}

if [ "$MODE" = run ]; then
  # ship.sh bumps a stale ?v= in index.html BEFORE its gate asks for this PASS — so a PASS measured on a stale tree is for
  # a tree that never ships, and is refused after the whole measurement. Bump first (as ship.sh would), then measure.
  if ! _stale="$(python3 tools/_fu_gate.py stale-busters)"; then
    say "❌ not measuring: index.html's cache-busters are stale for $_stale — ship.sh would bump them and so change the"
    say "   tree after this PASS. Bump each ?v= in index.html (+1), then run this again."
    exit 2
  fi
fi
HASH0="$(python3 tools/_fu_gate.py hash)"
HEADSHA="$(git rev-parse --short HEAD)"

# ─── 3. HEAD AND THE TREE, EACH FROZEN IN ITS OWN FOLDER ─────────────────────────────────────────────────────────────
if [ "$MODE" != selftest-port ]; then
  python3 tools/_fu_gate.py snapshot-head "$WORK/head" >/dev/null || { say "❌ could not extract HEAD"; exit 2; }
  python3 tools/_fu_gate.py snapshot-tree "$WORK/tree" >/dev/null || { say "❌ could not copy the tree"; exit 2; }
fi

# ─── 4. ONE SERVER FOR EVERY COPY, ON A PORT THAT IS PROVABLY OURS ───────────────────────────────────────────────────
# v1 picked "a free port" with lsof and then bound it — two runs started together picked the SAME port, one server died
# on the bind, and its run measured the OTHER run's folder through the survivor's server (the review reproduced it 3 of 3).
# Now: a lock directory per port (mkdir is atomic; a lock whose owner is dead is taken over), then the server, then a check
# that the server alive on that port is OURS — it must hand back a token only this run wrote, and its PID must be alive.
TOKEN="fu-$$-$RANDOM$RANDOM-$(date +%s)"
printf '%s' "$TOKEN" > "$WORK/fu-serve-token.txt"
start_server() {
  local p lk
  for p in $(seq "${PORT_LO:-8790}" "${PORT_HI:-8849}"); do
    lk="${TMPDIR:-/tmp}/fm-full-unchanged-port-$p.lock"
    if ! mkdir "$lk" 2>/dev/null; then
      local owner; owner="$(cat "$lk/pid" 2>/dev/null)"
      if [ -n "$owner" ] && ! kill -0 "$owner" 2>/dev/null; then rm -rf "$lk"; mkdir "$lk" 2>/dev/null || continue; else continue; fi
    fi
    echo "$$" > "$lk/pid"
    if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then rm -rf "$lk"; continue; fi
    "$ROOT/tools/serve.sh" "$p" "$WORK" >/dev/null 2>&1 &
    SERVER=$!; watch_child "$SERVER"
    local ok=0
    for _ in $(seq 1 40); do
      if [ "$(curl -sf "http://localhost:$p/fu-serve-token.txt" 2>/dev/null)" = "$TOKEN" ] && kill -0 "$SERVER" 2>/dev/null; then ok=1; break; fi
      kill -0 "$SERVER" 2>/dev/null || break
      sleep 0.25
    done
    if [ "$ok" = 1 ]; then PORT="$p"; LOCK="$lk"; return 0; fi
    kill "$SERVER" 2>/dev/null; SERVER=""; rm -rf "$lk"
  done
  say "❌ no port in ${PORT_LO:-8790}–${PORT_HI:-8849} would serve this run's folder"; return 1
}
# THE RACE, AS A TEST (review of v1: two runs started together took the same port 3 rounds of 3, and the loser measured
# the winner's folder). Two start_servers at the same instant, three rounds, on 8850–8859 (out of real runs' way): each
# must get its own port, and each port must hand back its own run's token. No Chrome, a few seconds.
if [ "$MODE" = selftest-port ]; then
  PORT_LO=8850; PORT_HI=8859; bad=0
  for round in 1 2 3; do
    for k in a b; do
      ( WORK="$WORK/r$round$k"; mkdir -p "$WORK"; TOKEN="fu-st-$round$k-$RANDOM$RANDOM"; printf '%s' "$TOKEN" > "$WORK/fu-serve-token.txt"
        SERVER=""; LOCK=""; PORT=""; WATCH=()
        start_server >/dev/null 2>&1 && echo "$PORT $TOKEN $SERVER $LOCK" > "$WORK/result" ) &
    done
    wait
    ra="$(cat "$WORK/r${round}a/result" 2>/dev/null)"; rb="$(cat "$WORK/r${round}b/result" 2>/dev/null)"
    set -- $ra; pa="${1:-}"; ta="${2:-}"; sa="${3:-}"; la="${4:-}"
    set -- $rb; pb="${1:-}"; tb="${2:-}"; sb="${3:-}"; lb="${4:-}"
    ga="$(curl -sf "http://localhost:$pa/fu-serve-token.txt" 2>/dev/null)"; gb="$(curl -sf "http://localhost:$pb/fu-serve-token.txt" 2>/dev/null)"
    if [ -z "$pa" ] || [ -z "$pb" ] || [ "$pa" = "$pb" ] || [ "$ga" != "$ta" ] || [ "$gb" != "$tb" ]; then
      say "❌ round $round: run a got :${pa:-none} (serves ${ga:-nothing}), run b got :${pb:-none} (serves ${gb:-nothing})"; bad=1
    else
      say "✅ round $round: run a on :$pa and run b on :$pb, each serving its own folder"
    fi
    for x in "$sa" "$sb"; do [ -n "$x" ] && kill "$x" 2>/dev/null; done
    for x in "$la" "$lb"; do [ -n "$x" ] && rm -rf "$x"; done
    sleep 0.5
  done
  exit "$bad"
fi
if [ "$MODE" = run ] && ! "$ROOT/tools/full-unchanged.sh" --selftest-port >/dev/null 2>&1; then
  say "❌ the port self-test failed (tools/full-unchanged.sh --selftest-port): two runs at once would not each get their own server — no PASS"; exit 2
fi
start_server || exit 2
URL="http://localhost:$PORT"

# ─── 5. ONE PROBE RUN ────────────────────────────────────────────────────────────────────────────────────────────────
start_probe() {   # start_probe <copy> <width> <groups>; background; the PID is appended to CDPS
  local copy="$1" w="$2" groups="$3" q
  mkdir -p "$WORK/$copy/shots-$w"
  q="w=$w&h=800&shots=1&groups=$groups&inv=$FU_INV_Q"; [ "$w" -lt 701 ] && q="$q&phone=1"
  python3 "$ROOT/tests/_cdp.py" --port "$PORT" --width "$w" --height 800 --timeout 2400 \
    --dump "$WORK/$copy/rec-$w.json.gz" --shots "$WORK/$copy/shots-$w" \
    --url "$URL/$copy/tests/full-unchanged.html?$q" > "$WORK/$copy/cdp-$w.log" 2>&1 &
  CDPS+=($!); watch_child "$!"
}
wait_probes() { local p; for p in "${CDPS[@]:-}"; do [ -n "$p" ] && wait "$p" 2>/dev/null; done; CDPS=(); }
# ONE CHROME AT A TIME by default (6 Oct): this Mac has 8 GB and crashed from memory pressure on 5 Oct with several
# Chromes up; v1 ran HEAD and the tree side by side and three plants at once. FU_JOBS=2 (or more) on a bigger machine.
JOBS="${FU_JOBS:-1}"
probe() {         # probe <copy> <width> <groups>: start one, and wait (and check the load) once JOBS are running
  start_probe "$@"
  if [ "${#CDPS[@]}" -ge "$JOBS" ]; then wait_probes; waitload || exit 2; fi
}
ALL='FU1,FU2,FU3,FU6,FU4,FU5,FU7'   # the probe's own order: every plant is measured with a PREFIX of it

# ─── --measure: the numbers this file carries ────────────────────────────────────────────────────────────────────────
if [ "$MODE" = measure ]; then
  say "→ measuring: HEAD ($HEADSHA) twice, at 380 and 1280, every group…"
  python3 tools/_fu_compare.py linkcopy "$WORK/head" "$WORK/head2" || exit 2
  probe head 380 "$ALL"; probe head2 380 "$ALL"; wait_probes
  probe head 1280 "$ALL"; probe head2 1280 "$ALL"; wait_probes
  say "→ and the smallest real change: the #transport 1 px margin (the self-test's first plant)…"
  python3 tools/_fu_compare.py linkcopy "$WORK/tree" "$WORK/margin" || exit 2
  python3 tools/_fu_compare.py plant margin "$WORK/margin" || exit 2
  probe margin 380 FU1; probe margin 1280 FU1; wait_probes
  python3 tools/_fu_compare.py measure "$WORK/head" "$WORK/head2" "$WORK/margin"
  exit $?
fi

# ─── 6. THE MEASUREMENT: HEAD against the tree, both widths, every group ─────────────────────────────────────────────
log "→ Full unchanged: the tree against HEAD ($HEADSHA), sources $HASH0"
log "   one server on :$PORT (its token checked) — 380×800 (a touch phone) first, then 1280×800"
T0=$SECONDS
probe head 380 "$ALL"; probe tree 380 "$ALL"; wait_probes
waitload || exit 2
probe head 1280 "$ALL"; probe tree 1280 "$ALL"; wait_probes
log "   both sides measured in $(( SECONDS - T0 ))s"
python3 tools/_fu_compare.py "$WORK/head" "$WORK/tree" --widths 380,1280 --groups "$ALL" --json "$WORK/main.json" | tee -a "$REPORT"
RC=${PIPESTATUS[0]}
if [ "$RC" != 0 ]; then
  for w in 380 1280; do [ -s "$WORK/tree/cdp-$w.log" ] && grep -q '"ok": false' "$WORK/tree/cdp-$w.log" && { log "   the tree's probe at $w:"; head -c 600 "$WORK/tree/cdp-$w.log" | sed 's/^/     /' | tee -a "$REPORT"; }; done
  log "NOT PASS — Full differs from HEAD (or could not be measured). Nothing is cached."
  exit 1
fi

# ─── 7. THE SELF-TEST: every plant in tools/full-unchanged-plants.json must turn it red BY NAME ──────────────────────
log "→ self-test: planting the changes it must catch ($(python3 tools/_fu_compare.py plants | wc -l | tr -d ' ') of them)…"
PLANTS=()
while read -r name groups widths; do
  [ -n "$name" ] || continue
  rm -rf "$WORK/plant-$name"; python3 tools/_fu_compare.py linkcopy "$WORK/tree" "$WORK/plant-$name" || { log "❌ could not copy the tree for $name"; exit 1; }
  rm -rf "$WORK/plant-$name"/shots-* "$WORK/plant-$name"/rec-*.json* "$WORK/plant-$name"/cdp-*.log
  python3 tools/_fu_compare.py plant "$name" "$WORK/plant-$name" || { log "❌ could not plant $name — the self-test cannot run, so no PASS"; exit 1; }
  for w in ${widths//,/ }; do PLANTS+=("plant-$name $w $groups"); done
done < <(python3 tools/_fu_compare.py plants)
# FU_JOBS at a time (one by default), the Mac's load checked between them
for job in "${PLANTS[@]}"; do
  set -- $job
  log "   · plant $1 at $2 ($3)"
  probe "$1" "$2" "$3"
done
wait_probes
SELF_OK=1
python3 tools/_fu_compare.py judge "$WORK" | tee -a "$REPORT"
[ "${PIPESTATUS[0]}" = 0 ] || SELF_OK=0
if [ "$SELF_OK" != 1 ]; then
  log "NOT PASS — the self-test failed: a planted change did not turn it red, so a green verdict would mean nothing."
  exit 1
fi

# ─── 8. THE VERDICT ───────────────────────────────────────────────────────────────────────────────────────────────────
HASH1="$(python3 tools/_fu_gate.py hash)"
if [ "$HASH1" != "$HASH0" ]; then
  log "NOT PASS — the tree changed while it was being measured (sources $HASH0 → $HASH1). Run it again on a still tree."
  exit 1
fi
printf '%s %s HEAD=%s\n' "$HASH0" "$(date '+%Y-%m-%dT%H:%M:%S')" "$HEADSHA" > tools/.full-unchanged-pass
log "PASS — Full is unchanged against HEAD ($HEADSHA) at 380×800 and 1280×800, and the self-test caught every plant. Cached for sources $HASH0."
exit 0
