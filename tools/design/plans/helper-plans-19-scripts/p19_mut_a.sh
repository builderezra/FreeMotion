#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-p19; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
m A1_back_to_480_in_preview js/compositor.js "(FM._exporting || !FM.playing) ? 720 : 480" "FM._exporting ? 720 : 480" "P19 #1062" "P19 #1062"
m A2_export_480 js/compositor.js "(FM._exporting || !FM.playing) ? 720 : 480" "480" "P19 #1062" "P19 #1062"
m A3_playback_720 js/compositor.js "(FM._exporting || !FM.playing) ? 720 : 480" "720" "P19 #1062" "P19 #1062"
echo ALLDONE
