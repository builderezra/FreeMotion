#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-gaps; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-240; }
T=$'simple P2.7 · '
m G1_track_sized_to_project js/spine-edit.js "Math.max(MINLEN(), R.trackEnd - clips[0].start)" "(+P.duration > 0 ? +P.duration : 5)" "${T}S14a" "${T}S14a"
m G2_tray_kind_not_in_sig js/simple-tools.js "one && R.units[one] && R.units[one].kind, lookOpen," "lookOpen," "${T}S14a" "${T}S14a"
m G3_silent_decoded js/spine-edit.js "if (FM.hasAudioTrack && FM.hasAudioTrack(cand) === false) continue;
        try { r = await C.detect(L, cand, null, 'project'); }" "try { r = await C.detect(L, cand, null, 'project'); }" "${T}S14b" "${T}S14b"
m G4_look_keeps_old js/spine-edit.js "e => !(prev && e && e.type === FM.FX_CONTAINER && e.fid === prev)" "e => true" "${T}S14c" "${T}S14c"
m G5_look_none_not_current js/simple-tools.js "label: w.trNone || 'None', icon: null, pressed: !cur," "label: w.trNone || 'None', icon: null, pressed: false," "${T}S14c" "${T}S14c"
m G6_look_takes_his_own js/spine-edit.js "e.type === FM.FX_CONTAINER && e.fid === prev)" "e.type === FM.FX_CONTAINER)" "${T}S14c" "${T}S14c"
echo ALLDONE
