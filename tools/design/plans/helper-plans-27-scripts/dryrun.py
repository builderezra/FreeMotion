import re,subprocess,json,sys,os
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad'
WT=SP+'/wt-b2'
os.chdir(WT)
def sh(*a,**k): return subprocess.run(list(a),capture_output=True,text=True,**k)
land=open(SP+'/wt-m/tools/design/chatgpt-tasks/pile/LAND-LIST.md').read()
def section(b):
    i=land.index('### '+b+'.'); m=re.search(r'\n### B\d\.|\n### Later',land[i+5:]); j=i+5+m.start() if m else len(land)
    return land[i:j]
batches={}
for b in ['B2','B3','B4','B5','B6','B7']:
    sec=section(b)
    order=re.split(r'\nFixes first|\n\*\*Tests',sec)[0]
    shas=re.findall(r'`([0-9a-f]{8})`',order)
    seen=[];[seen.append(x) for x in shas if x not in seen]
    batches[b]=seen
json.dump(batches,open(SP+'/p27/batches.json','w'))
res={}
applied=set()
for b,shas in batches.items():
    for c in shas:
        if c in applied: res[(b,c)]=('already applied',''); continue
        subj=sh('git','log','-1','--format=%s',c).stdout.strip()[:70]
        if sh('git','cat-file','-t',c).stdout.strip()!='commit': res[(b,c)]=('NOT A COMMIT',subj); continue
        r=sh('git','cherry-pick','-n',c)
        U=sh('git','diff','--name-only','--diff-filter=U').stdout.split()
        bad=[f for f in U if f not in ('tests/tests.js','index.html')]
        if 'merge' in (r.stderr+r.stdout).lower() and 'is a merge' in (r.stderr+r.stdout).lower():
            sh('git','reset','-q','--hard','HEAD'); res[(b,c)]=('MERGE COMMIT',subj); continue
        if bad:
            sh('git','reset','-q','--hard','HEAD'); res[(b,c)]=('SOURCE CONFLICT',subj+' :: '+' '.join(bad)); continue
        if 'index.html' in U: subprocess.run(['python3',SP+'/p27/ours_html.py'])
        if 'tests/tests.js' in sh('git','show','--format=','--name-only',c).stdout.split():
            sh('git','checkout','-q','HEAD','--','tests/tests.js'); subprocess.run(['python3',SP+'/p27/addtests.py',c],capture_output=True)
        sh('git','add','-A','.'); sh('git','reset','-q','--','outside')
        cm=sh('git','-c','user.email=a@b','-c','user.name=dry','commit','-qm','dry '+c,'--no-verify')
        res[(b,c)]=('applied' + (' (index/tests resolved by rule)' if U else ''),subj)
        applied.add(c)
for (b,c),(st,subj) in res.items(): print(b,c,st,'|',subj)
