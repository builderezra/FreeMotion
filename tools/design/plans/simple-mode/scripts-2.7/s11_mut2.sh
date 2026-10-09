#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-tr; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
T=$'simple P2.7 · '
m Z1_dip_always_full js/transitions.js "r.dipA = 1 - Math.abs(2 * p - 1);" "r.dipA = 1;" "${T}T3" "${T}T3"
m Z2_crossfade_top_out js/transitions.js "if (top === inc) r.aInc = p; else r.aOut = 1 - p;" "r.aInc = p;" "${T}T2" "${T}T2"
m Z3_closed_end js/transitions.js "t >= cut + d / 2) continue;" "t > cut + d / 2) continue;" "${T}T1" "${T}T1"
m Z4_no_clamp js/transitions.js "return Math.max(0, Math.min(mdur, src));" "return src;" "${T}T4" "${T}T4"
m Z5_seek_inside js/transitions.js "&& FM.layerLocalTime(l, t) == null) out.push" "&& true) out.push" "${T}T4" "${T}T4"
m Z6_no_deff js/transitions.js "return Math.min(+tr.d || 0, 0.5 * Math.min(out.duration, inc.duration));" "return +tr.d || 0;" "${T}T1" "${T}T1"
m Z7_no_proxy_alpha js/behaviors.js "(layer.__trA == null ? 1 : layer.__trA)" "1" "${T}T2" "${T}T2"
echo ALLDONE
