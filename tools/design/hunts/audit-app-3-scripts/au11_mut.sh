#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au11; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_parent_frame_ignored js/app.js "if (pxf && (pxf.rot !== 0 || pxf.s !== 1) && isFinite(pxf.rot)" "if (false && pxf && (pxf.rot !== 0 || pxf.s !== 1) && isFinite(pxf.rot)" "AU11-1" "AU11-1"
m A2_pivot_not_pinned js/app.js "            if (layer.parent && FM.settleGroupPivotsAbove) FM.settleGroupPivotsAbove(layer.id);   // a floating group pivot would move with the member (see alignByDrawnBox)
" "" "AU11-1" "AU11-1"
m A3_rotation_sign js/app.js "const c = Math.cos(-pxf.rot), si = Math.sin(-pxf.rot);" "const c = Math.cos(pxf.rot), si = Math.sin(pxf.rot);" "AU11-1" "AU11-1"
m A4_scale_ignored js/app.js "const lx = (dx * c - dy * si) / pxf.s, ly = (dx * si + dy * c) / pxf.s," "const lx = (dx * c - dy * si), ly = (dx * si + dy * c)," "AU11-1" "AU11-1"
m A5_plain_goes_new_way js/app.js "if (pxf && (pxf.rot !== 0 || pxf.s !== 1) && isFinite(pxf.rot)" "if (pxf && isFinite(pxf.rot)" "AU11-1" "AU11-1"
echo ALLDONE
