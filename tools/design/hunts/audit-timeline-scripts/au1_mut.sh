#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au1; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_rev_fx_clock js/timeline.js "        if (Math.abs(delta) > 1e-9) L.fxTimeOffset = (trimDrag.fx0 || 0) + delta;
      } else {" "      } else {" "AU1-1" "AU1-1"
m B1_grip_cap_old js/timeline.js "delta = atGrab(() => FM.revHeadGrowLimit(L, delta, trimDrag.srcDur, trimDrag.trim));" "{ const maxDur = (trimDrag.srcDur - trimDrag.trim) / sp; if (trimDrag.dur - delta > maxDur) delta = trimDrag.dur - maxDur; }" "AU1-2" "AU1-2"
m B2_extend_cap_old js/app.js "delta = FM.revHeadGrowLimit(layer, delta, srcDur, tr0);" "{ const maxDur = (srcDur - (tr0 || 0)) / sp; if (d0 - delta > maxDur) delta = d0 - maxDur; }" "AU1-2" "AU1-2"
m B3_limit_ignores_curve js/scene.js "if (FM.speedAdvanceOver(layer, delta, 0) <= avail + 1e-9) return delta;" "return delta;" "AU1-2" "AU1-2"
echo ALLDONE
