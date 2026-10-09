#!/bin/bash
# runnames.sh <worktree dir name> <port> <width> <tag> <names file>  — runs each test name (one per line) alone, one line of result each
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
WTD=$1; PORTD=$2; W=$3; TAG=$4; NAMES=$5; OUT=$SP/p27/names_${TAG}_$W.txt; : > $OUT
while IFS= read -r n; do q=$(python3 -c "import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=''))" "$n"); r=$(bash $SP/au_run.sh $WTD $PORTD $W "$q" </dev/null 2>&1 | grep -E "^ *(ok|RED|FAIL)|NOT RUN" | head -3 | cut -c1-260); echo "$r" >> $OUT; done < "$NAMES"
echo END >> $OUT
