#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-tr; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
T=$'simple P2.7 · '
m Y1_no_drop_rule js/spine-edit.js "if (!plan.keepsTransitions) {" "if (false) {" "${T}T6" "${T}T6"
m Y2_no_clamp js/spine-edit.js "Math.min(FM.TR_MAX, d == null" "Math.min(99, d == null" "${T}T5" "${T}T5"
m Y3_gap_allowed js/spine-edit.js "e.seam.kind !== 'join') return null;
    return { inc" "false) return null;
    return { inc" "${T}T5" "${T}T5"
m Y4_chip_on_every_join js/simple-timeline.js "|| !l.trIn || !e.seam" "|| !e.seam" "${T}T8" "${T}T8"
m Y5_tool_everywhere js/simple-tools.js "...(S.joinInto && S.joinInto(R, id) ? [{ id: 'transition'" "...(true ? [{ id: 'transition'" "${T}T7" "${T}T7"
m Y6_no_stamp js/spine-edit.js "if (P.sm && !(P.sm.v >= FM.SM_V)) P.sm.v = FM.SM_V;" "" "${T}T9" "${T}T9"
m Y7_copy_keeps js/spine.js "delete c.pick; delete c.trIn;" "delete c.pick;" "${T}T9" "${T}T9"
m Y8_all_hits_gap js/spine-edit.js "if (i > 0 && !e.slot && e.id !== id && S.joinInto(R, e.id))" "if (i > 0 && !e.slot && e.id !== id)" "${T}T7" "${T}T7"
echo ALLDONE
