(async function(){ const out={steps:[]}; try{
 if(FM.home.isOpen()) FM.home.close();
 const mk=async(hue)=>{ const cv=document.createElement('canvas'); cv.width=160;cv.height=120; const g=cv.getContext('2d'); const rec=new MediaRecorder(cv.captureStream(15),{mimeType:'video/webm;codecs=vp9'}); const ch=[]; rec.ondataavailable=e=>ch.push(e.data); const done=new Promise(r=>rec.onstop=r); rec.start(100); for(let i=0;i<14;i++){ g.fillStyle='hsl('+hue+',80%,'+(35+i)+'%)'; g.fillRect(0,0,160,120); await new Promise(r=>setTimeout(r,66)); } rec.stop(); await done; return new File([new Blob(ch,{type:'video/webm'})],'v'+hue+'.webm',{type:'video/webm'}); };
 const red=await mk(0), blue=await mk(230);
 const me=await FM.projects.create({name:'au19 R',width:320,height:240}); await new Promise(r=>setTimeout(r,300)); FM.scene.layers.length=0; FM.history.reset();
 const r0=await FM.loadVideoFile(red); FM.addMediaLayer(r0); const L=FM.scene.layers[0]; const id=L.id;
 const who=()=>{ const m=FM.media.get(id); return (m&&m.file?m.file.name:'?')+' rev='+(m&&m.rev)+' layerRev='+FM.layerById(FM.scene,id).mediaRev; };
 const px=(c)=>{ const d=c.getContext('2d').getImageData(4,16,1,1).data; return [d[0],d[1],d[2],d[3]]; };
 const bmColor=()=>{ const m=FM.media.get(id); const f=m&&m.stripFrames&&m.stripFrames[0]; if(!f) return m&&m.stripFrames===undefined?'unbuilt':'none'; const c=document.createElement('canvas'); c.width=f.width; c.height=f.height; c.getContext('2d').drawImage(f,0,0); const d=c.getContext('2d').getImageData(4,4,1,1).data; return [d[0],d[1],d[2]]; };
 const stripColor=()=>({dom:[].map.call(document.querySelectorAll('.clip-filmstrip'),px), model:bmColor()});
 const waitStrip=async()=>{ for(let i=0;i<60;i++){ await new Promise(r=>setTimeout(r,100)); FM.timeline.rebuild(); const c=stripColor(); if(c.dom.length&&c.dom.every(p=>p[3]>0)&&c.model!=='unbuilt') return c; } return stripColor(); };
 out.steps.push(['red clip strip',await waitStrip(),who()]);
 // the real replace sequence with the blue clip
 const nrec=await FM.loadVideoFile(blue); const outgoing=FM.media.get(id); await FM.storage.stashPrevMedia(id,outgoing,L.mediaRev||0); FM.replaceMediaWith(id,nrec); L.mediaRev=(L.mediaRev||0)+1; FM.media.get(id).rev=L.mediaRev; FM.refreshAll(); FM.history.commit(); FM.storage.save();
 out.steps.push(['after replace with blue',await waitStrip(),who()]);
 FM.history.undo(); await new Promise(r=>setTimeout(r,200)); await FM.restoreReplacedMedia(); out.steps.push(['after undo (should be red again)',await waitStrip(),who()]);
 FM.history.redo(); await new Promise(r=>setTimeout(r,200)); await FM.restoreReplacedMedia(); out.steps.push(['after redo (blue)',await waitStrip(),who()]);
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
