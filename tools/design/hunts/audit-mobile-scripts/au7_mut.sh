#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au7; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_stale_speed_kept js/mobile.js "        if (e && e.timeStamp - lastT > 80) vy = 0;" "" "AU7-1" "AU7-1 touch"
m A2_window_too_long js/mobile.js "if (e && e.timeStamp - lastT > 80) vy = 0;" "if (e && e.timeStamp - lastT > 8000) vy = 0;" "AU7-1" "AU7-1 touch"
m A3_flick_lost js/mobile.js "if (e && e.timeStamp - lastT > 80) vy = 0;" "if (e) vy = 0;" "AU7-1" "AU7-1 touch"
m B1_no_ghost_takeover js/mobile.js "if (!claimed && e.pointerId !== pid && e.timeStamp - downT > 2000) active = false;" "if (false) active = false;" "AU7-2" "AU7-2 touch"
m B2_takeover_at_once js/mobile.js "if (!claimed && e.pointerId !== pid && e.timeStamp - downT > 2000) active = false;" "if (!claimed && e.pointerId !== pid && e.timeStamp - downT > 0) active = false;" "AU7-2" "AU7-2 touch"
echo ALLDONE
