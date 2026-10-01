#!/bin/bash
# ═══ THE "FULL UNCHANGED" LOCK (queue 980; DESIGN.md §0.4.5, §21 F9/F10; BUILD-PLAN.md §3.2) ═════════════════════════
#
#   tools/full-unchanged.sh                  # measure the tree against HEAD; prints PASS or the first differences by name
#   tools/full-unchanged.sh --measure        # re-measure the picture tolerance (HEAD against itself, and a 1 px move)
#   tools/full-unchanged.sh --selftest-gate  # the ship.sh gate's trigger rules (tools/_fu_gate.py), in a second
#   tools/full-unchanged.sh --hash           # the source hash a PASS is cached under
#
# His rule, 1 Oct: "i dont want the original editor changing in design and function … dont do that." The Simple editor
# is built beside Full, and every Simple release has to prove Full did not move — not by a session saying so, by THIS:
# HEAD (the release before) and the tree are each served and driven through tests/full-unchanged.html at 380×800 (a
# touch phone) and 1280×800, and the two records are compared — every visible element's box, words and styles (exact),
# every edit's document, undo depth, toasts, selection and frames (exact), the live session's wire, the documents'
# bytes, the cog at fourteen sizes, and a picture of every screen (within the tolerance measured below).
#
# It cannot pass on a run that did not measure: if the probe could not drive HEAD somewhere, that is a broken instrument
# and the answer is no. And it cannot pass with a blind eye: every run plants three changes Full must never get — a 1 px
# margin on #transport, one word of a toast, the split floor moved to 0.1 s (the withdrawn step 1.1.5) — and each must
# turn it red BY NAME, or it refuses to print PASS. A PASS is cached by a hash of the sources (tools/_fu_gate.py, the
# same rule ship.sh reads), so ship.sh can refuse a Simple release whose exact tree never passed.
#
# No worktree and no stash (both are shared state — memory): HEAD comes out of `git archive`. Two free ports in
# 8790–8799 (checked with lsof; never 8777, never a server it did not start). Its servers and Chromes die on a trap.
set -uo pipefail
[ -x /Library/Developer/CommandLineTools/usr/bin/git ] && export DEVELOPER_DIR=/Library/Developer/CommandLineTools

# ═══ FU_INVISIBLE — THE ONLY DOCUMENT KEYS ALLOWED TO DIFFER AFTER A FULL EDIT (DESIGN §0.4.3) ═════════════════════════
# One list, here and nowhere else. It masks the documents (FU2, FU3, FU5, FU7) AND the op payloads FU4 compares
# (DESIGN §21 F9: an `li` op carries the whole layer, so a Full add on the tree carries srcW; without this mask FU4 is red
# for an invisible field, and the temptation is to loosen FU4 by hand — which is exactly what this list exists to stop).
# Adding a line here is a claim that Full never reads that key. It needs its §0.4.3 row and a guard test, or it does not go in.
FU_INVISIBLE='
layer.srcW       # I2  the source width written at add / Replace / duplicate / paste — a plain field no Full code reads
layer.srcH       # I2  the source height, same
layer.srcRev     # I2  the source revision, same
layer.pick       # I3  {b, i} on each layer of a multi-file import — never read by Full, stripped on copy
layer.sm.twin    # I5  extractAudio marks the sound it took out of a clip — one invisible key on the new layer
meta.SCHEMA_REV  # N1  the sync schema revision: a sanitiser change must bump it (by name, FU5 only)
meta.SCHEMA_FP   # N1  the sync schema fingerprint, same
'

# ═══ THE PICTURE TOLERANCE — MEASURED, NOT CHOSEN (memory: "set float tolerances from measurement") ═══════════════════
# Measured 1 Oct 2026 on v17.21 (HEAD 28104a3e), headless Chrome + SwiftShader, every FU1 screen at 380 (touch) and 1280,
# with `tools/full-unchanged.sh --measure` (HEAD rendered twice, and the #transport 1 px margin), two separate runs that
# agreed. Swept over the per-channel threshold (px that differ, worst screen / least-changed screen):
#     chan    0: jitter   46–118 px   smallest real  67 px     ← the glints and the readout's glow breathe a few levels
#     chan    8: jitter    5–8   px   smallest real   6–8 px   ← overlap: unusable
#     chan   16: jitter    4     px   smallest real  68 px
#     chan   24: jitter    0–2   px   smallest real  58 px     ← chosen: every jitter seen was ≤ 18 levels of one channel
#                                                                 (0 in both --measure runs; 2 px in the full PASS run)
#     chan   32: jitter    0     px   smallest real  35 px
# and a 1 px line, 16 px long, moved by 1 px, counts 32 px (tools/_fu_compare.py checks that on every run, or refuses).
# The preview canvas's own pixels are not in the count (its resolution is adaptive by design — see PNG_UNSTABLE in
# tools/_fu_compare.py); its box is in the layout record and what it draws is compared exactly by FU2/FU4's frame hashes.
FU_JITTER_PX=2                     # HEAD against itself at FU_CHAN: the most pixels any one picture differed by (any run)
FU_SMALLEST_REAL_PX=58             # the smallest real change at FU_CHAN: the #transport 1 px margin, its least-changed picture
FU_CHAN=24                         # a pixel counts as changed when any channel moved by more than this
FU_TOL_PX=12                       # between the two, and under the 32 px of a 1 px line moved by 1 px
export FU_INVISIBLE FU_TOL_PX FU_CHAN

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 2
MODE=run
case "${1:-}" in
  ''|--run) MODE=run ;;
  --measure) MODE=measure ;;
  --selftest-gate) exec python3 tools/_fu_gate.py selftest ;;
  --hash) exec python3 tools/_fu_gate.py hash ;;
  -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
  *) echo "full-unchanged: unknown option $1 (see --help)"; exit 2 ;;
esac
# The tolerance is a claim about two measurements; a hand-loosened number that no longer sits between them is refused.
if ! [ "$FU_TOL_PX" -ge "$FU_JITTER_PX" ] 2>/dev/null || ! [ "$FU_TOL_PX" -lt "$FU_SMALLEST_REAL_PX" ] 2>/dev/null; then
  echo "❌ FU_TOL_PX ($FU_TOL_PX) must sit between the measured jitter ($FU_JITTER_PX) and the smallest real change ($FU_SMALLEST_REAL_PX)."
  echo "   Re-measure with tools/full-unchanged.sh --measure and write BOTH numbers, not just a looser tolerance."
  exit 2
fi

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
waited=0
while [ "$(uptime | sed -E 's/.*load averages?: ([0-9.]+).*/\1/' | cut -d. -f1)" -ge "$MAXLOAD" ]; do
  [ "$waited" = 0 ] && say "→ waiting for the load average to fall under $MAXLOAD ($(uptime | sed 's/.*load averages*://'))…"
  waited=$((waited + 20)); [ "$waited" -gt 1200 ] && { say "❌ the Mac stayed too busy for 20 minutes — timings would be the machine's, not the app's"; exit 2; }
  sleep 20
done

# ─── 2. A WORK FOLDER, AND A TRAP THAT TAKES EVERYTHING WE STARTED WITH IT ───────────────────────────────────────────
WORK="$(mktemp -d "${TMPDIR:-/tmp}/fm-full-unchanged.XXXXXX")"
SERVERS=(); CDPS=()
cleanup() {
  for p in "${CDPS[@]:-}"; do [ -n "$p" ] || continue; pkill -TERM -P "$p" 2>/dev/null; kill -INT "$p" 2>/dev/null; done
  sleep 1
  for p in "${CDPS[@]:-}"; do [ -n "$p" ] || continue; pkill -KILL -P "$p" 2>/dev/null; kill -KILL "$p" 2>/dev/null; done
  for p in "${SERVERS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done
  [ -n "${FU_KEEP:-}" ] && say "(kept $WORK)" || rm -rf "$WORK"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

HASH0="$(python3 tools/_fu_gate.py hash)"
HEADSHA="$(git rev-parse --short HEAD)"

# ─── 3. HEAD AND THE TREE, EACH FROZEN IN ITS OWN FOLDER ─────────────────────────────────────────────────────────────
python3 tools/_fu_gate.py snapshot-head "$WORK/head" >/dev/null || { say "❌ could not extract HEAD"; exit 2; }
python3 tools/_fu_gate.py snapshot-tree "$WORK/tree" >/dev/null || { say "❌ could not copy the tree"; exit 2; }

# ─── 4. PORTS AND SERVERS ────────────────────────────────────────────────────────────────────────────────────────────
free_port() {   # sets PORT to a free port in 8790–8799 (lsof first; never one we already took)
  for p in 8790 8791 8792 8793 8794 8795 8796 8797 8798 8799; do
    case " ${TAKEN:-} " in *" $p "*) continue ;; esac
    if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then TAKEN="${TAKEN:-} $p"; PORT="$p"; return 0; fi
  done
  return 1
}
serve() {   # serve <dir>: sets PORT. NOT in a $( ) — a subshell would lose the PID the trap needs to kill it
  free_port || { say "❌ no free port in 8790–8799"; return 1; }
  "$ROOT/tools/serve.sh" "$PORT" "$1" >/dev/null 2>&1 &
  SERVERS+=($!)
  for _ in $(seq 1 40); do curl -sf -o /dev/null "http://localhost:$PORT/tests/full-unchanged.html" && return 0; sleep 0.25; done
  say "❌ the server for $1 on $PORT never answered"; return 1
}
stop_servers() { for p in "${SERVERS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done; SERVERS=(); TAKEN=""; }

# ─── 5. ONE PROBE RUN ────────────────────────────────────────────────────────────────────────────────────────────────
start_probe() {   # start_probe <outdir> <port> <width> <groups>; background; the PID is appended to CDPS
  local out="$1" port="$2" w="$3" groups="$4" q
  mkdir -p "$out/shots-$w"
  q="w=$w&h=800&shots=1&groups=$groups"; [ "$w" -lt 701 ] && q="$q&phone=1"
  python3 "$ROOT/tests/_cdp.py" --port "$port" --width "$w" --height 800 --timeout 1800 \
    --dump "$out/rec-$w.json" --shots "$out/shots-$w" \
    --url "http://localhost:$port/tests/full-unchanged.html?$q" > "$out/cdp-$w.log" 2>&1 &
  CDPS+=($!)
}
wait_probes() { for p in "${CDPS[@]:-}"; do [ -n "$p" ] && wait "$p" 2>/dev/null; done; CDPS=(); }
pair() {   # pair <dirA> <portA> <dirB> <portB> <width> <groups>: two probes side by side
  start_probe "$1" "$2" "$5" "$6"; start_probe "$3" "$4" "$5" "$6"; wait_probes
}
ALL='FU1,FU2,FU6,FU3,FU4,FU5,FU7'   # FU1, FU2 first: each plant is measured with a prefix of this order

# ─── --measure: the two numbers this file carries ────────────────────────────────────────────────────────────────────
if [ "$MODE" = measure ]; then
  say "→ measuring: HEAD ($HEADSHA) twice, at 380 and 1280, FU1 screens…"
  cp -R "$WORK/head" "$WORK/head2"
  serve "$WORK/head" || exit 2; PA=$PORT; serve "$WORK/head2" || exit 2; PB=$PORT
  pair "$WORK/head" "$PA" "$WORK/head2" "$PB" 380 FU1
  pair "$WORK/head" "$PA" "$WORK/head2" "$PB" 1280 FU1
  stop_servers
  say "→ and the smallest real change: the #transport 1 px margin (the self-test's first plant)…"
  cp -R "$WORK/tree" "$WORK/margin"
  python3 tools/_fu_compare.py plant margin "$WORK/margin" || exit 2
  serve "$WORK/margin" || exit 2; PM=$PORT
  start_probe "$WORK/margin" "$PM" 380 FU1; start_probe "$WORK/margin" "$PM" 1280 FU1; wait_probes
  stop_servers
  python3 tools/_fu_compare.py measure "$WORK/head" "$WORK/head2" "$WORK/margin"
  exit $?
fi

# ─── 6. THE MEASUREMENT: HEAD against the tree, both widths, every group ─────────────────────────────────────────────
log "→ Full unchanged: the tree against HEAD ($HEADSHA), sources $HASH0"
serve "$WORK/head" || exit 2; PH=$PORT; serve "$WORK/tree" || exit 2; PT=$PORT
log "   HEAD on :$PH, the tree on :$PT — 380×800 (a touch phone) first, then 1280×800"
T0=$SECONDS
pair "$WORK/head" "$PH" "$WORK/tree" "$PT" 380 "$ALL"
pair "$WORK/head" "$PH" "$WORK/tree" "$PT" 1280 "$ALL"
log "   both sides measured in $(( SECONDS - T0 ))s"
python3 tools/_fu_compare.py "$WORK/head" "$WORK/tree" --widths 380,1280 --groups "$ALL" --json "$WORK/main.json" | tee -a "$REPORT"
RC=${PIPESTATUS[0]}
if [ "$RC" != 0 ]; then
  for w in 380 1280; do [ -s "$WORK/tree/cdp-$w.log" ] && grep -q '"ok": false' "$WORK/tree/cdp-$w.log" && { log "   the tree's probe at $w:"; head -c 600 "$WORK/tree/cdp-$w.log" | sed 's/^/     /' | tee -a "$REPORT"; }; done
  log "NOT PASS — Full differs from HEAD (or could not be measured). Nothing is cached."
  exit 1
fi

# ─── 7. THE SELF-TEST: three changes Full must never get, each must turn it red BY NAME ──────────────────────────────
log "→ self-test: planting the three changes it must catch…"
stop_servers
for m in margin toast floor; do cp -R "$WORK/tree" "$WORK/$m"; python3 tools/_fu_compare.py plant "$m" "$WORK/$m" || { log "❌ could not plant $m — the self-test cannot run, so no PASS"; exit 1; }; done
serve "$WORK/margin" || exit 2; PM=$PORT; serve "$WORK/toast" || exit 2; PS=$PORT; serve "$WORK/floor" || exit 2; PF=$PORT
start_probe "$WORK/margin" "$PM" 380 FU1; start_probe "$WORK/toast" "$PS" 380 FU1,FU2; wait_probes
start_probe "$WORK/floor" "$PF" 380 FU1,FU2; start_probe "$WORK/margin" "$PM" 1280 FU1; wait_probes
SELF_OK=1
python3 tools/_fu_compare.py judge "$WORK" || SELF_OK=0
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
log "PASS — Full is unchanged against HEAD ($HEADSHA) at 380×800 and 1280×800, and the self-test caught all three plants. Cached for sources $HASH0."
exit 0
