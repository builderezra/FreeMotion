import sys,json; sys.path.insert(0,'.')
from cdp_eval import run
E='''(async()=>{ const out={};
 const L = FM.makeLayer('shape',{name:'p',shape:'rect',x:FM.scene.project.width/2,y:FM.scene.project.height/2,shapeW:300,shapeH:160,fill:'#405060',start:1,duration:10}); L.start=1; L.duration=10;
 const saved=FM.scene.layers.slice(); FM.scene.layers.length=0; FM.scene.layers.push(L);
 const put=s=>{const e=FM.fxRegistry.makeInstance('glowscan'); Object.assign(e.params,s); L.effects=[e]; FM.time=L.start;};
 const res=[];
 for (const s of [{pause:5},{loop:1},{loop:1,pause:2,span:1},{amount:0,loop:1}]) { put(s);
   const ts=FM.fxThumbs.noopTimes(L); const row={set:s,times:ts,moments:FM.fxNoopMoments(L),proj:{w:FM.scene.project.width,h:FM.scene.project.height},verd:[],ms:[]};
   for (const t of ts){ const a=performance.now(); row.verd.push(FM.fxThumbs.effectDoesNothing(L,0,t)); row.ms.push(Math.round(performance.now()-a)); }
   res.push(row);}
 FM.scene.layers.length=0; saved.forEach(l=>FM.scene.layers.push(l));
 return res; })()'''
for r in run(sys.argv[1],[E],port=9421,width=int(sys.argv[2]))[0]: print(json.dumps(r))
