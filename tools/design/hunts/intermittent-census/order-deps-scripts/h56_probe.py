#!/usr/bin/env python3
"""h56_probe.py <label> <red-test-line-prefix> <probe-js-body> <only-fragments newline-joined>
Inserts ONE probe test (named 'ZZ H56 probe') into tests/tests.js of wt-h56 immediately before the red test's definition,
runs ?only=<fragments + probe name> and prints the probe's text (the probe throws it, so it lands in the failures) and the red test's verdict."""
import sys,subprocess,json,urllib.parse,os
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'
T=SP+'wt-h56/'
label,redprefix,body,frags=sys.argv[1:5]
w=sys.argv[5] if len(sys.argv)>5 else '1280'
s=open(T+'tests/tests.js').read()
i=s.index("  test('"+redprefix)
probe="  test('ZZ H56 probe', { item: 'h56' }, async function () {\n"+body+"\n  });\n\n"
open(T+'tests/tests.js','w').write(s[:i]+probe+s[i:])
try:
    only='\n'.join(frags.split('|'))+'\nZZ H56 probe'
    url='http://localhost:8844/tests/run.html?only='+urllib.parse.quote(only)
    env=dict(os.environ,FM_CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    out=subprocess.run(['python3','tests/_cdp_h52.py','--port','8844','--width',w,'--names','--timeout','900','--url',url],cwd=T,capture_output=True,text=True,env=env).stdout
    open(SP+'h56_probe_%s.json'%label,'w').write(out)
    j=json.loads(out[out.index('{'):])
    print(label,j.get('summary'))
    for r in j.get('ran',[]): print(('  ok  ' if r['ok'] else '  RED ')+r['name'][:90])
    for f in j.get('failures',[]): print('  F:',str(f)[:900])
finally:
    open(T+'tests/tests.js','w').write(s)
