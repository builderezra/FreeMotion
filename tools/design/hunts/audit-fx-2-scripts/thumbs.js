(async function(){ const out={}; try{
 if(FM.home.isOpen()) FM.home.close();
 const P=FM.scene.project; P.width=320;P.height=240;P.duration=6; FM.scene.layers.length=0; FM.history.reset();
 FM.addShapeLayer('rect'); const L=FM.scene.layers[0]; L.shapeW=120;L.shapeH=120; L.start=0;L.duration=6; FM.time=1;
 const T=FM.fxThumbs; out.start=T.stats();
 const types=['blur','glow','hue','pixelate','wave','vignette','sharpen','noise','invert','posterize','tint','grayscale','brightness','contrast','saturate','threshold','mosaic','halftone','dither','edge'];
 const mkcv=()=>{ const c=document.createElement('canvas'); document.body.appendChild(c); return c; };
 const cvs=[];
 // many revisions: change the layer between rounds so every round mints new keys
 for(let round=0;round<12;round++){ L.transform.x=100+round*3; for(const t of types){ const c=mkcv(); cvs.push(c); T.mountLayerFx(c,t,L); } await new Promise(r=>setTimeout(r,400)); }
 await new Promise(r=>setTimeout(r,3000));
 out.afterMounts=T.stats(); out.queue=T.queueState();
 // leave: remove canvases and stopAll
 cvs.forEach(c=>c.remove()); T.stopAll(); await new Promise(r=>setTimeout(r,300)); out.afterStop=T.queueState(); out.statsAfterStop=T.stats();
 // deleted-layer job: mount then delete the layer before it renders
 const c2=mkcv(); T.mountLayerFx(c2,'wave',L); FM.deleteLayer(L.id); await new Promise(r=>setTimeout(r,800)); out.afterDelete=T.queueState(); c2.remove();
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,200);} return JSON.stringify(out);})()
