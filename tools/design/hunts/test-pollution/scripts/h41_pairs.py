import json,subprocess,urllib.parse,sys,os,concurrent.futures as cf,re
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad'
P=json.load(open(SP+'/h41_pairs.json')); W=sys.argv[1]; which=sys.argv[2:]
env=dict(os.environ,FM_CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
def run(polluter,victim):
    only=[polluter,victim] if polluter else [victim]
    q=urllib.parse.quote('\n'.join(only))
    r=subprocess.run(['python3','tests/_cdp.py','--port','8852','--width',W,'--timeout','75','--names','--url','http://localhost:8852/tests/run.html?only='+q],cwd=SP+'/wt-h41p',env=env,capture_output=True,text=True,timeout=110)
    t=r.stdout
    m=re.search(r'"ran": \[(.*?)\n \]',t,re.S)
    fails=[l for l in t.split('\n') if l.strip().startswith('"FAIL')]
    vf=[l for l in fails if victim[:40] in l]
    return ('RED' if vf else 'green', (vf[0].strip()[:300] if vf else ''), len(fails))
res={}
for k in which:
    victim=P['V'][k]; cands=[None]+[int(i) for i in P['cand'][k]]
    def job(i):
        pol=None if i is None else P['names'][str(i)]
        try: return i,run(pol,victim)
        except Exception as e: return i,('ERR',str(e)[:100],0)
    with cf.ThreadPoolExecutor(3) as ex:
        out=list(ex.map(job,cands))
    res[k]=[(i,P['names'][str(i)] if i is not None else None,P['fields'].get(str(i)),r) for i,r in out]
    json.dump(res,open(SP+'/h41_pairs_%s.json'%W,'w'),indent=1)
    red=[x for x in res[k] if x[3][0]=='RED']
    print(k,'baseline',res[k][0][3][0],'red with',len(red),'of',len(res[k])-1,flush=True)
    for x in red[:12]: print('   RED after',x[0],x[1][:70],x[2])
