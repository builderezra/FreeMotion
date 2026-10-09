import subprocess,sys
c=sys.argv[1]
d=subprocess.run(['git','show','--format=','-U0',c,'--','tests/tests.js'],capture_output=True,text=True).stdout
adds=[];rem=0
for l in d.splitlines():
    if l.startswith('+++') or l.startswith('---') or l.startswith('@@') or l.startswith('diff') or l.startswith('index'): continue
    if l.startswith('+'): adds.append(l[1:])
    elif l.startswith('-'): rem+=1
s=open('tests/tests.js').read()
m='  async function run() {'
i=s.index(m)
s=s[:i]+'\n'.join(adds)+'\n'+s[i:]
open('tests/tests.js','w').write(s)
print('added lines',len(adds),'removed lines in commit',rem)
