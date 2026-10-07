import sys,json
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import cdp_eval as C
js=r"""(async function(){ try {
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 FM.scene={project:{width:1080,height:1920,fps:30,duration:6,background:'#101418'},layers:[],selectedId:null,selectedIds:[]};
 if(FM.storage&&FM.storage.touchCurrent) FM.storage.touchCurrent(true);
 await sleep(500);
 FM.home.open(); await sleep(800);
 const imgs=[].slice.call(document.querySelectorAll('#home img, .hm-card img, .hm-thumb img, [class*=thumb] img'));
 const out=imgs.slice(0,6).map(i=>({cls:i.className,p:i.parentElement&&i.parentElement.className,w:Math.round(i.getBoundingClientRect().width),h:Math.round(i.getBoundingClientRect().height),nw:i.naturalWidth,nh:i.naturalHeight}));
 const cards=[].slice.call(document.querySelectorAll('[class*=card]')).slice(0,5).map(c=>({cls:String(c.className).slice(0,40),w:Math.round(c.getBoundingClientRect().width),h:Math.round(c.getBoundingClientRect().height)}));
 return JSON.stringify({imgs:out,cards:cards,iw:innerWidth});
} catch(e){ return 'ERR '+e; } })()"""
for w in (380,1280):
    print(w, C.run('http://localhost:8796/index.html',[js],port=9415,timeout=120,width=w,height=800)[0][:900])
