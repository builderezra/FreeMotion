#!/bin/bash
# restart-proof H52: each pass = 4 slices (H13 bounds); a slice whose result file already holds a summary, or is already pushed, is skipped
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
BR=hunt/memory-stack; P=$SP/wt-stack; DIR=tools/design/hunts/memory-stack-suite
cd $SP/wt-stackrun
python3 - > $SP/h51_slices.txt <<'PY'
import json,urllib.parse
b=json.load(open('/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/h13_bounds.json'))
q=urllib.parse.quote
sl=[('', 'upto='+q(b[0])),('after='+q(b[0]),'upto='+q(b[1])),('after='+q(b[1]),'upto='+q(b[2])),('after='+q(b[2]),'')]
for i,(a,u) in enumerate(sl): print(i,'&'.join(x for x in (a,u) if x))
PY

for spec in "S 1280 1 0" "S 380 1 0"; do set -- $spec
  tag=$1$2
  while read i Q; do
    F=h51_pass_${tag}_s$i.txt
    if [ -s $SP/$F ] && grep -q '"summary"' $SP/$F; then continue; fi
    
    curl -sf -o /dev/null http://localhost:8813/tests/run.html || { (setsid nohup tools/serve.sh 8813 >$SP/h51_serve.log 2>&1 </dev/null &); sleep 3; }
    rm -f /tmp/h51_stop
    if [ "$4" = "1" ]; then (setsid nohup $SP/h52_load.sh >/dev/null 2>&1 </dev/null &); fi
    echo "$tag s$i start $(date +%H:%M)" >> $SP/h51_chain.log
    python3 tests/_cdp.py --port 8813 --width $2 --names --timeout 20000 --progress $SP/h51_prog.json --url "http://localhost:8813/tests/run.html?$Q" > $SP/$F.tmp 2>&1
    touch /tmp/h51_stop; sleep 3
    if grep -q '"summary"' $SP/$F.tmp; then mv $SP/$F.tmp $SP/$F; else mv $SP/$F.tmp $SP/$F.incomplete; continue; fi
    mkdir -p $P/$DIR; cp $SP/$F $P/$DIR/
    (cd $P && git add -A tools/design/hunts/memory-stack-suite && git -c user.name=h -c user.email=h@h commit -qm "H52: $tag slice $i finished

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TnKnDxL9jETj2CCp8XMAQx" && for t in 1 2 3 4; do git push -q origin HEAD:$BR && break; sleep $((t*3)); done) >> $SP/h52_push.log 2>&1
    echo "$tag s$i done $(date +%H:%M)" >> $SP/h51_chain.log
  done < $SP/h51_slices.txt
done
echo all-done >> $SP/h51_chain.log
