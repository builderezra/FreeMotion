#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-p19; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
m N1_always_select js/app.js "if (!(first && window.matchMedia && window.matchMedia('(max-width: 700px)').matches)) {" "if (true) {" "P19 #1074" "P19 #1074"
m N2_never_select_on_phone js/app.js "if (!(first && window.matchMedia" "if (!(window.matchMedia" "P19 #1074" "P19 #1074"
m N3_pc_not_selected js/app.js "(first && window.matchMedia && window.matchMedia('(max-width: 700px)').matches)) {" "(first)) {" "P19 #1074" "P19 #1074"
echo ALLDONE
