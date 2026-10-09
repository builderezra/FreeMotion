#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-p20; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
m A1_no_lift_class js/timeline.js "clip.classList.add('clip-grab');" "" "P20 #1075" "P20 #1075"
m A2_release_keeps_lift js/timeline.js "const cm = clipMove; clipMove = null; hideSnap(); dropGrab();" "const cm = clipMove; clipMove = null; hideSnap();" "P20 #1075" "P20 #1075"
m B1_no_covers_tag js/inspector.js "} else if (shadowFills) {" "} else if (false) {" "P20 #1078" "P20 #1078"
m B2_tag_ignores_shadowonly js/inspector.js "Math.round(FM.evalProp(fx.params.shadowonly, FM.time)) === 1 &&" "true &&" "P20 #1078" "P20 #1078"
m B3_tag_ignores_cover js/inspector.js "FM._fillBehindCovered && FM._fillBehindCovered(layer, FM.time, FM.scene);" "true;" "P20 #1078" "P20 #1078"
m C1_solo_no_addrow js/timeline.js "    if (addRowWanted()) {
      const at = FM.clampAddAt" "    if (addRowWanted() && !soloId) {
      const at = FM.clampAddAt" "P20 #1079" "P20 #1079"
echo ALLDONE
