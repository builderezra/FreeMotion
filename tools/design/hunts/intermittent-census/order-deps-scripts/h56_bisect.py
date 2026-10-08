#!/usr/bin/env python3
"""h56_bisect.py <red-name> <width> <cand-file.json: list of names> [<fix-patch>]
Delta-style bisection: runs ?only=<cands subset + red>, red means the subset contains a leaker; narrows to ONE leaker (assumes a single one).
Prints each step so the log is the evidence."""
import sys,subprocess,json,urllib.parse,os
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'
T=SP+'wt-h56/'
red,width,cf=sys.argv[1],sys.argv[2],sys.argv[3]
cands=json.load(open(cf))
env=dict(os.environ,FM_CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
def run(sub):
    only='\n'.join(sub+[red])
    url='http://localhost:8844/tests/run.html?only='+urllib.parse.quote(only)
    out=subprocess.run(['python3','tests/_cdp_h52.py','--port','8844','--width',width,'--names','--timeout','1500','--url',url],cwd=T,capture_output=True,text=True,env=env).stdout
    j=json.loads(out[out.index('{'):])
    ran=j.get('ran',[]); r=[x for x in ran if x['name'].startswith(red[:40])]
    ok = bool(r) and r[0]['ok']
    return ok, len(ran)
ok,n=run(cands); print('ALL %d cands -> red test %s (ran %d)'%(len(cands),'green' if ok else 'RED',n),flush=True)
if ok: print('no leaker among the candidates'); sys.exit(0)
cur=cands
while len(cur)>1:
    h=len(cur)//2; a,b=cur[:h],cur[h:]
    okb,n=run(b)   # later half first: closer to the red test
    print('  half of %d: later %d -> %s (ran %d)'%(len(cur),len(b),'green' if okb else 'RED',n),flush=True)
    if not okb: cur=b; continue
    oka,n=run(a)
    print('  half of %d: earlier %d -> %s (ran %d)'%(len(cur),len(a),'green' if oka else 'RED',n),flush=True)
    if not oka: cur=a; continue
    print('  neither half alone is red: needs two (or more) tests together:',[c[:60] for c in cur]); break
print('LEAKER CANDIDATE:',cur)
