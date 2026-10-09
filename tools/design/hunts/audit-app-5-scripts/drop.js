(async function(){ const out={rows:[]}; try{
 const errs=[]; window.addEventListener('error',e=>{ if(!/ResizeObserver/.test(e.message)) errs.push(e.message); }); window.addEventListener('unhandledrejection',e=>errs.push('rej '+(e.reason&&e.reason.message||e.reason)));
 const alerts=[]; window.alert=m=>alerts.push(String(m).slice(0,80)); const toasts=[]; const rt=FM.toast; FM.toast=function(m){ toasts.push(String(m).slice(0,90)); return rt&&rt.apply(this,arguments); };
 if(FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au18 drop',width:320,height:240}); await new Promise(r=>setTimeout(r,300)); FM.scene.layers.length=0; FM.history.reset();
 const png=async(col,w,h,name)=>{ const c=document.createElement('canvas'); c.width=w;c.height=h; const g=c.getContext('2d'); g.fillStyle=col; g.fillRect(0,0,w,h); const b=await new Promise(r=>c.toBlob(r,'image/png')); return new File([b],name||'i.png',{type:'image/png'}); };
 const good=await png('#e8553a',120,90,'good.png');
 const drop=async(files)=>{ const dt=new DataTransfer(); files.forEach(f=>dt.items.add(f)); const ev=new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}); window.dispatchEvent(ev); await new Promise(r=>setTimeout(r,2500)); };
 const cases=[
  ['one good png',[good]],
  ['zero-byte png',[new File([],'empty.png',{type:'image/png'})]],
  ['garbage claiming to be png',[new File([new Uint8Array(500).fill(7)],'bad.png',{type:'image/png'})]],
  ['text file',[new File(['hello'],'notes.txt',{type:'text/plain'})]],
  ['garbage claiming mp4',[new File([new Uint8Array(2000).fill(1)],'bad.mp4',{type:'video/mp4'})]],
  ['png with no type and a weird name',[new File([await good.arrayBuffer()],'IMG 0001 (copy).PNG',{type:''})]],
  ['png with a very long name',[new File([await good.arrayBuffer()],'x'.repeat(400)+'.png',{type:'image/png'})]],
  ['mixed: good, garbage, text, good',[good,new File([new Uint8Array(500).fill(7)],'bad2.png',{type:'image/png'}),new File(['x'],'a.txt',{type:'text/plain'}),good]],
  ['25 copies of one good png',Array.from({length:25},()=>good)],
 ];
 for(const [name,files] of cases){ const n0=FM.scene.layers.length; errs.length=0; alerts.length=0; toasts.length=0; const t0=performance.now(); await drop(files);
   const L=FM.scene.layers; const added=L.length-n0; const orphans=L.filter(l=>(l.type==='image'||l.type==='video')&&!FM.media.get(l.id)).length;
   out.rows.push({name,files:files.length,added,orphans,alerts:alerts.length,toasts:toasts.slice(0,2),errs:errs.slice(0,2)}); }
 FM.toast=rt; try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
