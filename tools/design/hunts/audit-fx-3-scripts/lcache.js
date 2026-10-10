(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'lc',width:1080,height:1920}); await new Promise(r=>setTimeout(r,300));
 FM.scene.layers.length=0; FM.history.reset(); FM.addShapeLayer('ellipse'); const L=FM.scene.layers[0]; L.start=0; L.duration=4; L.shapeW=500;L.shapeH=500; FM.setTime(1);
 const types=['shake','wiggle','pulse','spin','drift','orbit','swing','blur','glow','rgbsplit','zoomblur','twirl','wave','kaleidoscope','pixelate','vhstape'].filter(t=>FM.fxRegistry.get(t));
 const N=window.__n||types.length; out.dpr=window.devicePixelRatio; out.tile=FM.fxThumbs._tileSize();
 const drain=async()=>{ for(let i=0;i<400;i++){ const q=FM.fxThumbs.queueState(); if(!q.queued&&!q.jobs) return; await new Promise(r=>setTimeout(r,50)); } };
 const mk=()=>{ const cvs=[]; for(let i=0;i<N;i++){ const cv=document.createElement('canvas'); cv.className='probe-cv'; document.body.appendChild(cv); FM.fxThumbs.mountLayerFx(cv,types[i],L); cvs.push(cv);} return cvs; };
 FM.fxThumbs.remountLive(); await new Promise(r=>setTimeout(r,200));
 let cvs=mk(); const t0=performance.now(); await drain(); out.firstMs=Math.round(performance.now()-t0); out.stats1=FM.fxThumbs.stats();
 cvs.forEach(c=>c.remove());
 cvs=mk(); out.queuedOnRemount=FM.fxThumbs.queueState().queued; out.N=N; const t1=performance.now(); await drain(); out.secondMs=Math.round(performance.now()-t1); out.stats2=FM.fxThumbs.stats();
 cvs.forEach(c=>c.remove()); try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
