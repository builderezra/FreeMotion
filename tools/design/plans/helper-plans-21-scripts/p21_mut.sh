#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-p21; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
m A1_footage_also_at_zero js/app.js "const noPicture = rec.kind === 'video' && !(rec.width > 0 && rec.height > 0);" "const noPicture = true;" "P21 #1080" "P21 #1080"
m A2_song_always_zero js/app.js "const atEnd = !first && (P.duration || 0) > 0 && FM.time >= (P.duration || 0) - 1e-3;" "const atEnd = true;" "P21 #1080" "P21 #1080"
m A3_old_line js/app.js "(noPicture && atEnd ? 0 : Math.min(FM.time, P.duration || 0))" "Math.min(FM.time, P.duration || 0)" "P21 #1080" "P21 #1080"
m B1_pc_shares js/exporter.js "if (coarse && file && navigator.canShare" "if (file && navigator.canShare" "P21 #1081" "P21 #1081"
m B2_phone_downloads js/exporter.js "if (coarse && file && navigator.canShare" "if (false && file && navigator.canShare" "P21 #1081" "P21 #1081"
m C1_zone_never js/app.js "e.clientX - r.left < 180 && e.clientY - r.top < 120" "false" "P21 #1083" "P21 #1083"
m C2_no_click js/app.js "pill.addEventListener('click', () => { const b = document.getElementById('btn-back'); if (b) b.click(); });" "" "P21 #1083" "P21 #1083"
m C3_always_visible styles.css "opacity: 0; transform: translateX(-6px); pointer-events: none; transition" "opacity: 1; transform: translateX(-6px); pointer-events: none; transition" "P21 #1083" "P21 #1083"
m C4_rest_blocks_clicks styles.css "opacity: 0; transform: translateX(-6px); pointer-events: none; transition" "opacity: 0; transform: translateX(-6px); pointer-events: auto; transition" "P21 #1083" "P21 #1083"
m C5_zone_leaves_stuck js/app.js "main.addEventListener('mouseleave', () => pill.classList.remove('show'));" "" "P21 #1083" "P21 #1083"
echo ALLDONE
