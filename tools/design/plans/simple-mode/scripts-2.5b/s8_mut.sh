#!/bin/bash
# the 2.5b mutations (from a checkout of hunt/simple-2.5b). The two mouse tests per mutation use tools/mutate.sh --only; the finger test needs FM_TOUCH_PAGE=1, so it is run by hand (see s8_touch.sh)
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd ${S8TREE:-$SP/wt-s8}; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
T=$'simple P2.5b · '
m B1_no_limit js/simple-timeline.js "const need = Math.min(limit, scroller.scrollLeft + scroller.clientWidth + v + 120);" "const need = scroller.scrollLeft + scroller.clientWidth + v + 120;" "${T}S8b brake 3"
m B2_far_live js/simple-timeline.js "const far = Math.max(G.projDur0, G.start0 + G.dur0, R.trackEnd + G.dur0), limit" "const far = Math.max(G.projDur0, G.start0 + G.dur0, R.trackEnd + G.dur0) + scroller.scrollLeft / pps(), limit" "${T}S8b brake 3"
m B3_no_pin js/simple-timeline.js "const pinned = v > 0 && ((G.kind === 'move'" "const pinned = false && ((G.kind === 'move'" "${T}S8b brake 4"
m A1_item_gate js/simple-timeline.js "    if (hardGate(gateOf(id, !me))) return;
    const node = me" "    const node = me" "${T}S8a the item grips follow the gate"
m A2_item_look js/simple-timeline.js "if (hardGate(gateOf(id, !me))) return;" "if (hardGate(gateOf(id))) return;" "${T}S8a the item grips follow the gate"
m A3_head_start js/spine-edit.js "if (side === 'head') { L.start = r.start; if (FM.shiftLayerFxClock)" "if (side === 'head') { if (FM.shiftLayerFxClock)" "${T}S8a a selected text"
m A4_item_trim_cmd js/simple-timeline.js "ran = !R2.isMain(id) ? FM.spine.cmd.trimItem(id, o.side, o.edge) :" "ran = false ? 0 :" "${T}S8a a selected text"
echo ALLDONE
