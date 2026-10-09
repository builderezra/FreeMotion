(async function(){ const out={fails:[],n:0,ops:{}}; try{
 if(FM.home.isOpen()) FM.home.close();
 const seed0=+(window.__seed||1); let s=seed0*2654435761>>>0; const rnd=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
 const me=await FM.projects.create({name:'au18 fuzz',width:320,height:240}); await new Promise(r=>setTimeout(r,300)); const P=FM.scene.project; P.width=320;P.height=240;P.duration=8;
 FM.scene.layers.length=0; FM.history.reset(); FM.selectLayer(null);
 const png=async(col,w,h)=>{ const c=document.createElement('canvas'); c.width=w;c.height=h; const g=c.getContext('2d'); g.fillStyle=col; g.fillRect(0,0,w,h); g.fillStyle='#fff'; g.fillRect(w/4,h/4,w/2,h/2); const b=await new Promise(r=>c.toBlob(r,'image/png')); return await FM.loadImageFile(new File([b],'i'+col.slice(1)+'.png',{type:'image/png'})); };
 const wav=(sec,hz)=>{const rate=8000,n=Math.floor(rate*sec),buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);const put=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i));};put(0,'RIFF');dv.setUint32(4,36+n*2,true);put(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,rate,true);dv.setUint32(28,rate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);put(36,'data');dv.setUint32(40,n*2,true);for(let i=0;i<n;i++)dv.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*hz*i/rate)*12000),true);return new File([buf],'t'+hz+'.wav',{type:'audio/wav'});};
 const webm=async()=>{ const cv=document.createElement('canvas'); cv.width=160;cv.height=120; const g=cv.getContext('2d'); const rec=new MediaRecorder(cv.captureStream(15),{mimeType:'video/webm;codecs=vp9'}); const ch=[]; rec.ondataavailable=e=>ch.push(e.data); const done=new Promise(r=>rec.onstop=r); rec.start(100); for(let i=0;i<12;i++){ g.fillStyle='hsl('+(i*25)+',70%,50%)'; g.fillRect(0,0,160,120); g.fillStyle='#fff'; g.fillRect(i*8,30,30,30); await new Promise(r=>setTimeout(r,66)); } rec.stop(); await done; return new File([new Blob(ch,{type:'video/webm'})],'v.webm',{type:'video/webm'}); };
 const addImg=async(col)=>{ const r=await png(col,200,150); const had=new Set(FM.scene.layers.map(l=>l.id)); FM.addMediaLayer(r); return FM.scene.layers.find(l=>!had.has(l.id)); };
 const addAud=async(hz)=>{ const r=await FM.loadVideoFile(wav(3,hz)); const had=new Set(FM.scene.layers.map(l=>l.id)); FM.addMediaLayer(r); return FM.scene.layers.find(l=>!had.has(l.id)); };
 const vf=await webm(); const addVid=async()=>{ const r=await FM.loadVideoFile(vf); const had=new Set(FM.scene.layers.map(l=>l.id)); FM.addMediaLayer(r); return FM.scene.layers.find(l=>!had.has(l.id)); };
 await addImg('#e8553a'); await addAud(300); await addVid();
 const mediaLayers=()=>FM.scene.layers.filter(l=>l.type==='image'||l.type==='video');
 const inv=async(tag)=>{ const L=FM.scene.layers, ids=new Set(); for(const l of L){ if(ids.has(l.id)) return tag+': duplicate id'; ids.add(l.id);} 
   for(const l of L){ if(l.parent&&!ids.has(l.parent)) return tag+': dangling parent'; }
   for(const l of mediaLayers()){ const m=FM.media.get(l.id); if(!m) return tag+': media layer '+l.name+' ('+l.id+') has no media record'; if(l.type==='image'&&!(m.el&&(m.el.naturalWidth||m.width))) return tag+': image layer has an undecoded record'; }
   // two layers must not share one element unless the registry deliberately shares a record (then it must be flagged)
   return null; };
 const pick=()=>{const L=FM.scene.layers; return L.length?L[Math.floor(rnd()*L.length)]:null;};
 const ops=['addimg','addaud','addvid','del','dup','copypaste','undo','redo','replace','group','ungroup','dupsel'];
 for(let i=0;i<60;i++){
  const op=ops[Math.floor(rnd()*ops.length)]; const tag=i+':'+op; out.ops[op]=(out.ops[op]||0)+1;
  try{
   if(op==='addimg') await addImg('#'+Math.floor(rnd()*0xffffff).toString(16).padStart(6,'0'));
   else if(op==='addaud') await addAud(200+Math.floor(rnd()*400));
   else if(op==='addvid') await addVid();
   else if(op==='del'){ const l=pick(); if(l) FM.deleteLayer(l.id); }
   else if(op==='dup'){ const l=pick(); if(l) await FM.duplicateLayer(l.id); }
   else if(op==='dupsel'){ const a=pick(),b=pick(); if(a){ FM.scene.selectedIds=[a.id].concat(b&&b!==a?[b.id]:[]); FM.scene.selectedId=a.id; await FM.duplicateSelection(); } }
   else if(op==='copypaste'){ const a=pick(),b=pick(); if(a){ FM.scene.selectedIds=[a.id].concat(b&&b!==a?[b.id]:[]); FM.scene.selectedId=a.id; FM.copySelection(); await FM.pasteClipboard(); } }
   else if(op==='undo'){ FM.history.undo(); await new Promise(r=>setTimeout(r,60)); await FM.restoreReplacedMedia(); }
   else if(op==='redo'){ FM.history.redo(); await new Promise(r=>setTimeout(r,60)); await FM.restoreReplacedMedia(); }
   else if(op==='replace'){ const layer=mediaLayers().find(x=>x.type==='image'); if(layer){ const id=layer.id; const nrec=await png('#'+Math.floor(rnd()*0xffffff).toString(16).padStart(6,'0'),100,200); const outgoing=FM.media.get(id);
       if(outgoing&&outgoing.file&&FM.storage&&FM.storage.stashPrevMedia){ try{ await FM.storage.stashPrevMedia(id,outgoing,layer.mediaRev||0); }catch(e){} }
       FM.replaceMediaWith(id,nrec); FM._fitReplacedMedia(FM.layerById(FM.scene,id),outgoing,nrec); layer.mediaRev=(layer.mediaRev||0)+1; { const r=FM.media.get(id); if(r) r.rev=layer.mediaRev; }
       FM.refreshAll(); FM.seekVideosToTime(); FM.history.commit(); FM.storage.save(); } }
   else if(op==='group'){ const a=pick(),b=pick(); if(a&&b&&a!==b){ FM.scene.selectedIds=[a.id,b.id]; FM.scene.selectedId=a.id; FM.groupSelection(); } }
   else if(op==='ungroup'){ const g=FM.scene.layers.find(l=>l.type==='group'); if(g) FM.ungroup(g.id); }
  }catch(e){ out.fails.push(tag+': THREW '+e.message+' '+(e.stack||'').split('\n')[1]); break; }
  out.n++; await new Promise(r=>setTimeout(r,20));
  const e=await inv(tag); if(e){ out.fails.push(e); break; }
 }
 // persistence: save, wait, then every media layer must have a record on disk under its own id
 await FM.storage.save(); await new Promise(r=>setTimeout(r,800));
 const miss=[]; for(const l of mediaLayers()){ const r=await FM.storage.readMedia(l.id); if(!r||!r.file) miss.push(l.name+':'+l.id); }
 if(miss.length) out.fails.push('no stored file for '+miss.length+' media layer(s): '+miss.slice(0,4).join(', '));
 // reopen round trip
 const before=mediaLayers().map(l=>{ const m=FM.media.get(l.id); return [l.id,l.type,m&&m.file?m.file.size:-1,m&&m.width]; });
 const orig=FM.projects.currentId(); const other=await FM.projects.create({name:'au18 other',width:200,height:200}); await FM.projects.open(other); await new Promise(r=>setTimeout(r,500));
 await FM.projects.open(orig); await new Promise(r=>setTimeout(r,2500));
 const bad=[]; for(const b of before){ const l=FM.layerById(FM.scene,b[0]); if(!l){ bad.push(b[0]+': layer gone'); continue; } const m=FM.media.get(b[0]); if(!m){ bad.push(b[0]+': no record after reopen'); continue; } const sz=m.file?m.file.size:-1; if(sz!==b[2]) bad.push(b[0]+': file size '+b[2]+' -> '+sz); if(l.type==='image'&&!(m.el&&m.el.naturalWidth)) bad.push(b[0]+': image not decoded'); }
 if(bad.length) out.fails.push('after reopen: '+bad.length+' problem(s): '+bad.slice(0,5).join('; '));
 try{ await FM.projects.remove(other); await FM.projects.remove(me);}catch(e){}
 out.layers=FM.scene.layers.length; out.media=mediaLayers().length;
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
