(async function(){ const out={steps:[]}; try{
 if(FM.home.isOpen()) FM.home.close();
 // count bitmaps made and closed
 let made=0, closed=0; const liveSet=new Set(); const cib=window.createImageBitmap; window.createImageBitmap=function(){ return cib.apply(this,arguments).then(b=>{ made++; liveSet.add(b); return b; }); };
 const cl=ImageBitmap.prototype.close; ImageBitmap.prototype.close=function(){ if(liveSet.delete(this)) closed++; return cl.apply(this,arguments); };
 const live=()=>liveSet.size; const step=(n,x)=>out.steps.push(Object.assign({n,live:live()},x||{}));
 const webm=async()=>{ const cv=document.createElement('canvas'); cv.width=320;cv.height=240; const g=cv.getContext('2d'); const rec=new MediaRecorder(cv.captureStream(15),{mimeType:'video/webm;codecs=vp9'}); const ch=[]; rec.ondataavailable=e=>ch.push(e.data); const done=new Promise(r=>rec.onstop=r); rec.start(100); for(let i=0;i<14;i++){ g.fillStyle='hsl('+(i*25)+',70%,50%)'; g.fillRect(0,0,320,240); g.fillStyle='#fff'; g.fillRect(i*15,60,50,50); await new Promise(r=>setTimeout(r,66)); } rec.stop(); await done; return new File([new Blob(ch,{type:'video/webm'})],'v.webm',{type:'video/webm'}); };
 const vf=await webm();
 const me=await FM.projects.create({name:'au19 A',width:320,height:240}); await new Promise(r=>setTimeout(r,300)); FM.scene.layers.length=0; FM.history.reset();
 const N=10; for(let i=0;i<N;i++){ const r=await FM.loadVideoFile(vf); FM.addMediaLayer(r); }
 step('after adding '+N+' clips');
 const t0=performance.now(); for(let i=0;i<400;i++){ await new Promise(r=>setTimeout(r,100)); const ms=FM.scene.layers.map(l=>FM.media.get(l.id)); if(ms.every(m=>m&&m.stripFrames!==undefined)) break; }
 const ms=FM.scene.layers.map(l=>FM.media.get(l.id)); step('all strips built',{secs:Math.round((performance.now()-t0)/100)/10,frames:ms.map(m=>m.stripFrames&&m.stripFrames.length),made,closed});
 // delete all
 FM.scene.layers.slice().forEach(l=>FM.deleteLayer(l.id)); await new Promise(r=>setTimeout(r,300)); step('all layers deleted (records kept for undo)');
 FM.history.undo(); await new Promise(r=>setTimeout(r,2500)); step('after undo (strips rebuilt?)',{layers:FM.scene.layers.length,built:FM.scene.layers.filter(l=>{const m=FM.media.get(l.id);return m&&m.stripFrames&&m.stripFrames.length;}).length});
 // leave the project mid-way: rebuild strips then switch away at once
 for(const l of FM.scene.layers){ const m=FM.media.get(l.id); if(m) FM.clearClipStrip(m); } FM.timeline.rebuild(); await new Promise(r=>setTimeout(r,150));
 const B=await FM.projects.create({name:'au19 B',width:320,height:240}); const tB=performance.now(); await new Promise(r=>setTimeout(r,200)); FM.scene.layers.length=0; const rb=await FM.loadVideoFile(vf); FM.addMediaLayer(rb); const mb=FM.media.get(FM.scene.layers[0].id);
 for(let i=0;i<300&&mb.stripFrames===undefined;i++) await new Promise(r=>setTimeout(r,50)); step('project B first clip strip',{ms:Math.round(performance.now()-tB),built:mb.stripFrames&&mb.stripFrames.length});
 await new Promise(r=>setTimeout(r,500)); step('after waiting, A left behind');
 for(const id of [B,me]){ try{ await FM.projects.remove(id);}catch(e){} } await new Promise(r=>setTimeout(r,500)); step('both projects removed');
 window.createImageBitmap=cib; ImageBitmap.prototype.close=cl;
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
