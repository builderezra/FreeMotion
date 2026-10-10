#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au3; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
echo "=== D1_idbDel_no_abort"; tools/mutate.sh --only "AU3-4" js/storage.js "tx.onabort = () => res(); /* AU3-4" "/* AU3-4" "AU3-4" 2>&1 | tail -3 | cut -c1-300
echo ALLDONE
