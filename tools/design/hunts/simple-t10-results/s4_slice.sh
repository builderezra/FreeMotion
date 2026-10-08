#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
ONLY='simple%20P%0Aspeed%0ASpeed%0AReset%0Aback%20arrow%0Aback%20button'
for w in 1280 380; do
  (cd $SP/wt-s4; python3 tests/_cdp_h52.py --port 8846 --width $w --names --timeout 3000 --url "http://localhost:8846/tests/run.html?only=$ONLY" > $SP/s4_slice_fix_$w.json 2>&1)
  (cd $SP/wt-s1b; python3 tests/_cdp_h52.py --port 8847 --width $w --names --timeout 3000 --url "http://localhost:8847/tests/run.html?only=$ONLY" > $SP/s4_slice_base_$w.json 2>&1)
done
echo done > $SP/s4_slice.done
