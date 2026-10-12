import sys,subprocess,glob,json,re
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/s1')
import hunks as H
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'
W=SP+'wt-s1/'
def git(*a): return subprocess.run(['git']+list(a),cwd=W,capture_output=True,text=True).stdout
def rd(p): return open(p).read()
def fence(t,lang='js'):
    assert '```' not in t, 'triple backtick inside a hunk'
    return '```'+lang+'\n'+t+'\n```'
FILES=[('js/scene.js','shared: `FM.shiftProp`'),('js/inspector.js','shared with Full: the Speed slider\'s flat branch becomes `FM.setClipSpeed`'),
       ('js/app.js','shared with Full: `FM.replaceMedia` split into `pickReplacement` + `swapInMedia`'),('js/spine.js','Simple\'s read model: a twin leaves the Sound row'),
       ('js/spine-words.js','every new word'),('js/spine-edit.js','the 2.3 block, the commands, and the Mute clip sound hooks'),
       ('js/simple-tools.js','the tray, the rows, the icons'),('js/simple-timeline.js','the 🔈, the twin band, the Speed preview'),
       ('index.html','the `?v=` bumps'),('styles.css','the 2.3 styles and the two-row padding')]
out=[]; n=0; allhunks={}
for f,why in FILES:
    base=git('show','HEAD:'+f); new=rd(W+f)
    hs=H.hunks(base,new,f); assert H.apply(base,hs,f)==new
    allhunks[f]=hs
    out.append('\n### `%s` — %s\n'%(f,why))
    for find,rep in hs:
        n+=1
        out.append('#### 2.3.%d `%s`\n\nFind (exactly once):\n\n%s\n\nReplace with:\n\n%s\n'%(n,f,fence(find,'html' if f=='index.html' else ('css' if f.endswith('.css') else 'js')),fence(rep,'html' if f=='index.html' else ('css' if f.endswith('.css') else 'js'))))
hunks_md='\n'.join(out)
json.dump({f:[list(x) for x in hs] for f,hs in allhunks.items()},open(SP+'s1/doc_hunks.json','w'))
# tests: edits to earlier tests + the new ones
tbase=git('show','HEAD:tests/tests.js'); tnew=rd(W+'tests/tests.js')
marker='\n  /* ═══ SIMPLE MODE RELEASE 2.3: speed, sound and replacing'
tmid=tnew[:tnew.index(marker)].rstrip('\n')+'\n})();\n'
thunks=H.hunks(tbase,tmid,'tests/tests.js'); assert H.apply(tbase,thunks,'tests')==tmid
newtests=tnew[tnew.index(marker)+1:tnew.rindex('\n})();')]
open(SP+'s1/doc_n.txt','w').write(str(n))
tedits=[]
for i,(find,rep) in enumerate(thunks):
    tedits.append('#### 2.3.T%d `tests/tests.js`\n\nFind (exactly once):\n\n%s\n\nReplace with:\n\n%s\n'%(i+1,fence(find),fence(rep)))
tests_md='\n'.join(tedits)
open(SP+'s1/doc_hunks.md','w').write(hunks_md)
open(SP+'s1/doc_testedits.md','w').write(tests_md)
open(SP+'s1/doc_newtests.md','w').write(fence(newtests))
print('hunks',n,'test edit hunks',len(thunks),'new test chars',len(newtests))
