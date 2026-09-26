#!/bin/zsh
# sweep.sh <W> <H> <P-json> <out.png> [css-file]
D=/Users/ezrasmith/Claude/FreeMotion/tools/design/plans/2026-09-26-panels
cd /Users/ezrasmith/Claude/FreeMotion
until [ ! -f .ship-in-progress ] && [ ! -f .mutation-in-progress ] && [ ! -f .spotcheck-in-progress ] && [ "$(sysctl -n vm.loadavg | awk '{print int($2)}')" -lt 8 ]; do sleep 20; done
F=$D/tmp/s-$RANDOM$RANDOM.js
if [ -n "$5" ]; then
  python3 -c "import json,sys; print('const __CSS = ' + json.dumps(open(sys.argv[1]).read()) + ';')" "$5" > $F
else
  echo "const __CSS = '';" > $F
fi
echo "const P = Object.assign({css: __CSS}, $3);" >> $F
cat $D/probe-lib.js $D/probe-sweep.js >> $F
python3 tools/shot.py --port ${PORT:-8777} --width $1 --height $2 --js-file $F --wait 500 --out $4 | python3 -c "
import sys, json
for line in sys.stdin:
    line=line.strip()
    try:
        o=json.loads(line); v=o.get('js', o)
        print(v if isinstance(v,str) else json.dumps(v))
    except Exception: print(line)
"
rm -f $F
