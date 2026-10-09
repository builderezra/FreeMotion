#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-e1; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m M7_censor_ignores_scale js/compositor.js "const strength = Math.max(1, fparam(p, 'strength', 18, t) * ps), feather = Math.max(0, fparam(p, 'feather', 0, t) * ps);" "const strength = Math.max(1, fparam(p, 'strength', 18, t)), feather = Math.max(0, fparam(p, 'feather', 0, t));" "E1 preview equals export" "E1 preview equals export"
m M8_glitter_ignores_scale js/compositor.js "const spacing = Math.max(8, fparam(p, 'spacing', 60, t)) * ps, size = Math.max(1, fparam(p, 'size', 14, t)) * ps;" "const spacing = Math.max(8, fparam(p, 'spacing', 60, t)), size = Math.max(1, fparam(p, 'size', 14, t));" "E1 preview equals export" "E1 preview equals export"
m M9_fast_bbox js/compositor.js "else if (fx.type === 'tiles' || fx.type === 'popart' || fx.type === 'censor' || fx.type === 'glitter') {" "else if (fx.type === 'tiles') {" "E1 preview equals export" "E1 preview equals export"
echo ALLDONE
