import subprocess,sys,os
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad'
os.chdir(SP+'/'+sys.argv[1])
def sh(*a): return subprocess.run(list(a),capture_output=True,text=True)
for c in sys.argv[2:]:
    subj=sh('git','log','-1','--format=%s',c).stdout.strip()[:70]
    r=sh('git','cherry-pick','-n',c)
    U=sh('git','diff','--name-only','--diff-filter=U').stdout.split()
    bad=[f for f in U if f not in ('tests/tests.js','index.html')]
    if bad: sh('git','reset','-q','--hard','HEAD'); print(c,'SOURCE CONFLICT',subj,'::',' '.join(bad)); continue
    if 'index.html' in U: subprocess.run(['python3',SP+'/p27/ours_html.py'])
    if 'tests/tests.js' in sh('git','show','--format=','--name-only',c).stdout.split():
        sh('git','checkout','-q','HEAD','--','tests/tests.js'); subprocess.run(['python3',SP+'/p27/addtests.py',c],capture_output=True)
    sh('git','add','-A','.'); sh('git','reset','-q','--','outside')
    sh('git','-c','user.email=a@b','-c','user.name=dry','commit','-qm','dry '+c,'--no-verify')
    print(c,'applied'+(' (index/tests by rule)' if U else ''),subj)
