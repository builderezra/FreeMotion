import subprocess,os,re
SP=os.environ['SP']; wt=SP+'/wt-h57'
def sh(*a,inp=None,check=True):
    r=subprocess.run(a,cwd=wt,capture_output=True,text=True,input=inp)
    if check and r.returncode: raise SystemExit('FAIL '+' '.join(a)+'\n'+r.stderr+r.stdout)
    return r.stdout
commits=sh('git','log','--reverse','--format=%h %s','origin/main..stack2-all').strip().splitlines()
byname={c.split(' ',2)[2]:c.split()[0] for c in commits}
groups={
 'A':['3-mflow-clear-after-export','4-audio-mix-frees-pcm','5-prevfiles-sweep','7-prevfiles-weak','7-test','p9-0003'],
 'B':['1-fx-thumbs-stock-cap','p9-0001','p9-0002'],
 'C':['1095-scratch-pools','1095-test','2-pool-idle-release','6-filter-container-plates','6-test']}
def hunks(diff):
    out=[]; cur=None
    for ln in diff.splitlines():
        if ln.startswith('@@'): cur=[]; out.append(cur)
        elif cur is not None and ln[:1] in ' +-' : cur.append(ln)
    return out
def apply_tests(c):
    p=wt+'/tests/tests.js'; s=open(p).read()
    for hk in hunks(sh('git','show','--format=',c,'--','tests/tests.js')):
        adds=[l[1:] for l in hk if l[0]=='+']; dels=[l[1:] for l in hk if l[0]=='-']
        if dels:   # an in-place edit: swap the deleted lines for the added ones where they sit
            old='\n'.join(dels); new='\n'.join(adds); assert s.count(old)==1,(c,old[:60]); s=s.replace(old,new); continue
        last=max(i for i,l in enumerate(hk) if l[0]=='+'); tail=[l[1:] for l in hk[last+1:]]
        anchor='\n'.join(tail[:3]); assert anchor, c
        i=s.rindex(anchor); s=s[:i]+'\n'.join(adds)+'\n'+s[i:]
    open(p,'w').write(s)
sh('git','checkout','-q','-B','hunt/memory-stack-2','origin/main')
for g in 'ABC':
    for n in groups[g]:
        c=byname[n]; d=sh('git','diff',c+'^',c,'--','js')
        if d.strip(): sh('git','apply','--3way','-',inp=d)
        apply_tests(c)
    sh('git','add','-A','js','tests/tests.js'); sh('git','commit','-qm','H57 group '+g+': '+', '.join(groups[g]))
print(sh('git','log','--oneline','origin/main..HEAD'))
