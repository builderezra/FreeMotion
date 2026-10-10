(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'e1',width:540,height:960}); await new Promise(r=>setTimeout(r,300));
 const P=FM.scene.project; P.width=540;P.height=960;P.duration=4; FM.scene.layers.length=0; FM.history.reset();
 const file=await fetch('fx-art/bay.jpg').then(r=>r.blob()).then(b=>new File([b],'bay.jpg',{type:'image/jpeg'}));
 const photo=await FM.loadImageFile(file); FM.addMediaLayer(photo); const L=FM.scene.layers[0]; L.start=0;L.duration=4; L.transform.scale=Math.max(540/photo.width,960/photo.height);
 const CW=270,CH=480; const render=(t)=>{const c=document.createElement('canvas');c.width=CW;c.height=CH;c.__fmRS=CW/540;c.__fmOX=0;c.__fmOY=0;const g=c.getContext('2d',{willReadFrequently:true});const t0=performance.now();FM.renderScene(g,FM.scene,t);const d=g.getImageData(0,0,CW,CH).data;return {d,ms:performance.now()-t0};};
 const base=render(1.2);
 for(const ty of ['huecycle','softskin','oilpaint','glitter','censor','popart']){
   L.effects=[FM.fxRegistry.makeInstance(ty)]; if(!L.effects[0]){ out[ty]='NO INSTANCE'; continue; }
   const a=render(1.2), a2=render(1.2), b=render(2.0);
   let n=0,mx=0; for(let i=0;i<a.d.length;i+=4){ const m=Math.max(Math.abs(a.d[i]-base.d[i]),Math.abs(a.d[i+1]-base.d[i+1]),Math.abs(a.d[i+2]-base.d[i+2])); if(m>8)n++; if(m>mx)mx=m; }
   let same=true; for(let i=0;i<a.d.length;i++) if(a.d[i]!==a2.d[i]){same=false;break;}
   let tdiff=0; for(let i=0;i<a.d.length;i+=4) if(Math.abs(a.d[i]-b.d[i])>8) tdiff++;
   out[ty]={changed:n,max:mx,deterministic:same,movesWithTime:tdiff,ms:Math.round(Math.min(a.ms,a2.ms))};
 }
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,400);} return JSON.stringify(out);})()
