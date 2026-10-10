#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
R=$SP/e1/results
bash $SP/au_run.sh wt-m 8947 1280 filter > $R/main_filter.txt 2>&1
bash $SP/au_run.sh wt-m 8947 1280 thumb > $R/main_thumb.txt 2>&1
for s in "effects%3A" "921%20S1" "thumb" "registry" "featured" "filter" "482%20every" "AI" "745" "913.8"; do n=${s//%/_}; n=${n// /_}; bash $SP/au_run.sh wt-e1 8946 1280 "$s" > "$R/fin_$n.txt" 2>&1; done
echo ALLDONE > $R/fin_done.txt
