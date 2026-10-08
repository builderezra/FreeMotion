#!/usr/bin/env python3
"""h56_after.py <red-name> <width> [lo-index hi-index]
Largest start k such that ?after=<names[k]>&upto=<red> still has the red test RED. names[k+1] ... is then the leaker (k+1 = first included).
Prints each step. Uses suite order from h56_names.json (tests.js order)."""
import sys,subprocess,json,urllib.parse,os,time
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'
T=SP+'wt-h56/'
red,width=sys.argv[1],sys.argv[2]
names=[n for i,n in json.load(open(SP+'h56_names.json'))]
R=next(k for k,n in enumerate(names) if n.startswith(red))
env=dict(os.environ,FM_CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
def run(k):
    q='upto='+urllib.parse.quote(names[R])
    if k>=0: q='after='+urllib.parse.quote(names[k])+'&'+q
    url='http://localhost:8844/tests/run.html?'+q
    t=time.time()
    out=subprocess.run(['python3','tests/_cdp_h52.py','--port','8844','--width',width,'--names','--timeout','2400','--url',url],cwd=T,capture_output=True,text=True,env=env).stdout
    j=json.loads(out[out.index('{'):]); ran=j.get('ran',[])
    r=[x for x in ran if x['name']==names[R]]
    return (bool(r) and not r[0]['ok']), len(ran), int(time.time()-t)
lo=int(sys.argv[3]) if len(sys.argv)>3 else -1; hi=int(sys.argv[4]) if len(sys.argv)>4 else R-1
isred,n,s=run(lo); print('start k=%d: %s (ran %d, %ds)'%(lo,'RED' if isred else 'green',n,s),flush=True)
if not isred: print('NOT RED even from k=%d: the leak is not an earlier test in this range'%lo); sys.exit(0)
# invariant: run(lo) is RED; find the largest k in [lo,hi] that is RED
while lo<hi:
    mid=(lo+hi+1)//2
    isred,n,s=run(mid); print('k=%d (%s): %s (ran %d, %ds)'%(mid,names[mid][:60],'RED' if isred else 'green',n,s),flush=True)
    if isred: lo=mid
    else: hi=mid-1
print('LAST RED START k=%d -> leaker is the test AFTER it, #%d: %s'%(lo,lo+1,names[lo+1]))
print('(test #%d is: %s)'%(lo,names[lo]))
