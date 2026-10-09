#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au9; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_setTime_unguarded js/app.js "  FM.setTime = function (t, noSnap) {
    t = finiteTime(t);" "  FM.setTime = function (t, noSnap) {" "AU9-1" "AU9-1"
m A2_scrubTime_unguarded js/app.js "  FM.scrubTime = function (t, noSnap) {
    t = finiteTime(t);" "  FM.scrubTime = function (t, noSnap) {" "AU9-1" "AU9-1"
m A3_infinity_rejected js/app.js "(typeof t === 'number' && !isNaN(t)) ? t :" "(typeof t === 'number' && isFinite(t)) ? t :" "AU9-1" "AU9-1"
echo ALLDONE
