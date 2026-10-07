exec(open(SP+'prelude.py').read()); exec(open(SP+'../h44_lib.py').read())
import sys
def run(mode,port):
    global w,S
    S=[]
    w=W(port,'http://localhost:8840/index.html',380,760,shots='t8/',touch=True); w.ws.settimeout(280)
    w.ev(open(SP+'../h40_sizer.js').read()); w.ev(open(SP+'../h44_page.js').read())
    snap(mode+' boot')
    pid1=w.ev('(async function(){var p=await FM.projects.create({name:"H44a",width:1080,height:1920}); await FM.projects.open(p); return p})()')
    w.ev('window.__h44.mode=%s'%json.dumps(mode))
    print(w.ev('window.__h44.importN(20)')); snap(mode+' 20 clips imported')
    print(w.ev('window.__h44.replace(30)')); snap(mode+' 30 replaces')
    print(w.ev('window.__h44.undoRedo(6)')); snap(mode+' undo/redo x6')
    pid2=w.ev('(async function(){var p=await FM.projects.create({name:"H44b",width:1080,height:1920}); return p})()')
    for k in range(5):
        w.ev('(async function(){await FM.projects.open(%s)})()'%json.dumps(pid2 if k%2==0 else pid1)); time.sleep(2)
        snap(mode+' switch %d'%(k+1))
    print(w.ev('(function(){window.__h44.pf().clear(); return window.__h44.pf().size})()')); time.sleep(4); snap(mode+' CONTROL _prevFiles cleared')
    json.dump(S,open(SP+'../h44_%s.json'%mode,'w'),indent=1)
