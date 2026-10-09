#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
R=$SP/e1/results
for s in "effects%3A" "921%20S1" "thumb" "registry" "featured" "filter" "482%20every" "AI" "browser" "search"; do n=${s//%/_}; n=${n// /_}; bash $SP/au_run.sh wt-e1 8946 1280 "$s" > "$R/pre_$n.txt" 2>&1; done
echo ALLDONE > $R/pre_done.txt
