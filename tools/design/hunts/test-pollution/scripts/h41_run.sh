#!/bin/bash
# usage: h41_run.sh <width> <port> <dbgport>
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
W=$1; PORT=$2; export FM_DBG=$3
export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
rm -f $SP/h41c_$W.log
python3 $SP/h41_obs.py $FM_DBG $SP/h41c_$W.log 9000 &
cd $SP/wt-h41
H41_CENSUS_OUT=$SP/h41_census_$W.json python3 tests/_cdp.py --port $PORT --width $W --names --timeout 8400 --progress $SP/h41_prog_$W.json --url "http://localhost:$PORT/tests/run.html" > $SP/h41_out_$W.txt 2>&1
echo "exit $?" >> $SP/h41_out_$W.txt
