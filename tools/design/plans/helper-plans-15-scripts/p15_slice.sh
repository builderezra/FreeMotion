#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-p15m; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
ONLY='group%0AGroup%0Afont%0Aimport%0Adownload%0Aundo%0Apreset%0APreset%0Atemplate'
for w in 1280 380; do
  python3 tests/_cdp_h52.py --port 8843 --width $w --names --timeout 3000 --url "http://localhost:8843/tests/run.html?only=$ONLY" > $SP/p15_slice_$w.json 2>&1
done
echo done > $SP/p15_slice.done
