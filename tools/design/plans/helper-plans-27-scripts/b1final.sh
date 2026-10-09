SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
for W in 1280 380; do
 for s in "888" "915" "1051" "306" "430" "karaoke" "Remove%20Vocals" "P27%20%231069"; do n=${s//%/_}; bash $SP/au_run.sh wt-b1 8961 $W "$s" > $SP/p27/fb_${W}_$n.txt 2>&1 </dev/null; done
 for s in "888" "915" "1051" "306" "430" "karaoke" "Remove%20Vocals"; do n=${s//%/_}; bash $SP/au_run.sh wt-m 8947 $W "$s" > $SP/p27/fm_${W}_$n.txt 2>&1 </dev/null; done
done
bash $SP/p27/b1run.sh 1280 final
bash $SP/p27/b1run.sh 380 final
echo done > $SP/p27/fb_done
