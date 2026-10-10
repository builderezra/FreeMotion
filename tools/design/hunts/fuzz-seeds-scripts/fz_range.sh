#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
OUT=$SP/fz_range_$3.txt; : > $OUT
for s in $(seq $1 $2); do r=$(bash $SP/fz_seed.sh 8980 $s | cut -c1-330); echo "$s $r" >> $OUT; done; echo END >> $OUT
