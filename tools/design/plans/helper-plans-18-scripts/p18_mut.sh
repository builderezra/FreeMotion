#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-p18; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
m A1_flat_mean js/compositor.js "var moWt=moS[moI+3];" "var moWt=255;" "P18 #1056" "P18 #1056"
m A2_alpha_sum js/compositor.js "moAa=moSa/moN; }   /* #1056" "moAa=moSa; }   /* #1056" "P18 #1056" "P18 #1056"
m B1_noaudio_rethrown js/captions.js "if (derr && derr.noAudio) { silent++; continue; } throw derr;" "throw derr;" "P18 #1059" "P18 #1059"
m B2_known_silent_decoded js/captions.js "if (FM.hasAudioTrack && FM.hasAudioTrack(cand) === false) { silent++; continue; }" "if (false) { silent++; continue; }" "P18 #1059" "P18 #1059"
m B3_all_silent_line js/captions.js "if (!r) {   // every clip tried had no sound" "if (false) {   // every clip tried had no sound" "P18 #1059" "P18 #1059"
m C1_sw_deletes_all sw.js "k === CACHE || k.indexOf('freemotion-') !== 0 ? null" "k === CACHE ? null" "P18 #1060" "P18 #1060"
m C2_regs_all index.html "return rs.filter(function (r) { return r && r.scope === own; });" "return rs.filter(function (r) { return r; });" "P18 #1060" "P18 #1060"
m C3_caches_all index.html "return String(k).indexOf('freemotion-') === 0;" "return true;" "P18 #1060" "P18 #1060"
m C4_chip_ignores_helper index.html "Promise.all(fmOwnRegs(rs).map(" "Promise.all(rs.map(" "P18 #1060" "P18 #1060"
m D1_no_split js/scene.js "while (ki < keyTs.length && keyTs[ki] < t1 - 1e-9) {" "while (false) {" "P18 #1061" "P18 #1061"
m D2_no_left_limit js/scene.js "evalProp(sp, kt - 1e-9)" "evalProp(sp, kt)" "P18 #1061" "P18 #1061"
echo ALLDONE
