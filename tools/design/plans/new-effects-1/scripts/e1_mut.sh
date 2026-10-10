#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-e1; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m M1_hue_matrix_sign js/compositor.js "return [0.213 + 0.787 * a - 0.213 * b," "return [0.213 + 0.787 * a + 0.213 * b," "E1 Colour Cycle" "E1 Colour Cycle"
m M2_skin_mask_dropped js/compositor.js "        w *= sk;" "        w *= 1;" "E1 Soften Skin" "E1 Soften Skin"
m M3_oil_transparent js/compositor.js "const out = new Uint8ClampedArray(d), STRIP" "const out = new Uint8ClampedArray(d.length), STRIP" "E1 Oil Paint" "E1 Oil Paint"
m M4_glitter_bar js/compositor.js "/ 255 < thr) continue;" "/ 255 < -1) continue;" "E1 Glitter" "E1 Glitter"
m M5_censor_mask js/compositor.js "S.globalCompositeOperation = 'destination-in'; S.drawImage(_e1Cm, 0, 0); S.globalCompositeOperation = 'source-over';" "" "E1 Censor" "E1 Censor"
m M6_popart_same_hue js/compositor.js "m = style === 0 ? e1HueM(k * 360 / (n * n)) : null" "m = style === 0 ? e1HueM(0) : null" "E1 Pop Art" "E1 Pop Art"
m M7_censor_ignores_scale js/compositor.js "const strength = Math.max(1, fparam(p, 'strength', 18, t) * ps), feather = Math.max(0, fparam(p, 'feather', 0, t) * ps);" "const strength = Math.max(1, fparam(p, 'strength', 18, t)), feather = Math.max(0, fparam(p, 'feather', 0, t));" "E1 preview equals export" "E1 preview equals export"
m M8_glitter_ignores_scale js/compositor.js "const spacing = Math.max(8, fparam(p, 'spacing', 60, t)) * ps, size = Math.max(1, fparam(p, 'size', 14, t)) * ps;" "const spacing = Math.max(8, fparam(p, 'spacing', 60, t)), size = Math.max(1, fparam(p, 'size', 14, t));" "E1 preview equals export" "E1 preview equals export"
echo ALLDONE
