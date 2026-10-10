(async function(){ const out={n:0,bad:[]}; try{
 const list=FM.sfx.list();
 const ids=(list||[]).map(s=>s.id); out.n=ids.length;
 for(const id of ids){ const def=FM.sfx.byId(id); const buf=await FM.sfx.renderBuffer(def); if(!buf){out.bad.push(id+':nobuf');continue;}
   const d=buf.getChannelData(0); let pk=0,nan=0; for(let i=0;i<d.length;i++){const a=Math.abs(d[i]); if(!(a<=1e9)) nan++; if(a>pk)pk=a;}
   const w=Math.floor(buf.sampleRate*0.003); let e=0,s=0; for(let i=0;i<w;i++){e=Math.max(e,Math.abs(d[d.length-1-i])); s=Math.max(s,Math.abs(d[i]));}
   const r={id:id,pk:+pk.toFixed(3),end:+(e/pk).toFixed(3),start:+(s/pk).toFixed(3),secs:+(d.length/buf.sampleRate).toFixed(2),nan:nan};
   if(nan||pk<0.5||pk>1||r.end>0.05||r.start>0.2) out.bad.push(r); }
}catch(e){out.err=String(e&&e.stack||e).slice(0,300)} return JSON.stringify(out);})()
