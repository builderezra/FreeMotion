SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
for W in 1280 380; do for s in "921%20S1" "effects%3A" "thumb" "filter" "registry" "AU"; do n=${s//%/_}; bash $SP/au_run.sh wt-int2 8970 $W "$s" > $SP/int2/nb_${W}_$n.txt 2>&1 </dev/null; done; done
echo done > $SP/int2/nb_done
