#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au10; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_never_by_drawn_box js/app.js "      if (alignByDrawnBox(layer, mode, P)) return;" "" "AU10-1" "AU10-1"
m A2_pivot_not_pinned js/app.js "    if (layer.parent && FM.settleGroupPivotsAbove) FM.settleGroupPivotsAbove(layer.id);
" "" "AU10-1" "AU10-1"
m A3_parent_axes_ignored js/app.js "      lx = (M.d * dx - M.c * dy) / det; ly = (-M.b * dx + M.a * dy) / det;" "      lx = dx; ly = dy;" "AU10-1" "AU10-1"
m A4_right_edge_wrong js/app.js "else if (mode === 'right') dx = P.width - bb.x1;" "else if (mode === 'right') dx = P.width - bb.x0;" "AU10-1" "AU10-1"
m A5_plain_layer_takes_new_path js/app.js "    if (!layer.parent && !turned) return false;" "    if (false) return false;" "AU10-1" "AU10-1"
echo ALLDONE
