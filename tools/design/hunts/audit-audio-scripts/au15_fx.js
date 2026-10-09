(async function(){ const out={rows:{}}; try{
 const SR=48000, DUR=2.5, N=Math.floor(SR*DUR);
 const defs=FM.audioFxRegistry.all();
 const mkSrc=(ctx)=>{ const b=ctx.createBuffer(2,N,SR); let s=12345; for(let c=0;c<2;c++){ const d=b.getChannelData(c); for(let i=0;i<N;i++){ s=(s*1103515245+12345)&0x7fffffff; const nz=(s/0x7fffffff-0.5)*0.2; d[i]=0.3*Math.sin(2*Math.PI*(220+c*110)*i/SR)+0.15*Math.sin(2*Math.PI*1760*i/SR*(1+i/N))+nz; } } return b; };
 const render=async(layer,mode)=>{ const ctx=new OfflineAudioContext(2,N,SR); const src=ctx.createBufferSource(); src.buffer=mkSrc(ctx);
   const chain=FM.buildAudioFxChain(ctx,layer,0); if(!chain) return null; src.connect(chain.input); chain.output.connect(ctx.destination); src.start(0);
   if(mode==='export'){ chain.schedule(0,DUR); }
   else { const step=1/60; chain.applyAt(0); for(let t=step;t<DUR;t+=step){ ctx.suspend(t).then(()=>{ chain.applyAt(t); ctx.resume(); }); } }
   const buf=await ctx.startRendering(); try{chain.dispose&&chain.dispose();}catch(e){} return buf; };
 const rms=(a)=>{let s=0,n=0;for(let c=0;c<a.numberOfChannels;c++){const d=a.getChannelData(c);for(let i=0;i<d.length;i++){s+=d[i]*d[i];n++;}}return Math.sqrt(s/n);};
 const diff=(a,b)=>{let s=0,n=0;for(let c=0;c<a.numberOfChannels;c++){const x=a.getChannelData(c),y=b.getChannelData(c);for(let i=0;i<x.length;i++){const e=x[i]-y[i];s+=e*e;n++;}}return Math.sqrt(s/n);};
 for(const d of defs){ const row={};
   for(const variant of ['default','animated']){
     try{ const inst=FM.audioFxRegistry.makeInstance(d.type);
       if(variant==='animated'){ const p=d.params.find(p=>p.keyframable!==false&&typeof p.min==='number'&&typeof p.max==='number'&&p.type!=='select'); if(!p){ row.animated='no animatable param'; continue; } inst.params[p.key]={kf:[{t:0,v:p.min,e:'linear'},{t:DUR,v:p.max,e:'linear'}]}; row.animKey=p.key; }
       const layer={id:'x',type:'video',start:0,duration:DUR,audioFx:[inst]};
       const a=await render(layer,'export'), b=await render(layer,'live'); if(!a||!b){row[variant]='no chain';continue;}
       const ra=rms(a); row[variant]={rms:+ra.toFixed(4),rel:+(diff(a,b)/(ra||1)).toFixed(4)};
     }catch(e){ row[variant]='err '+e.message; } }
   out.rows[d.type]=row; }
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
