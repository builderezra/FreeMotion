(async function(){ const out={}; try{
 if(FM.home.isOpen()) FM.home.close();
 const P=FM.scene.project; P.width=1080;P.height=1920;P.duration=6; FM.scene.layers.length=0; FM.history.reset();
 FM.addShapeLayer('rect'); FM.addShapeLayer('ellipse'); FM.addTextLayer(); FM.textEdit.stop(); FM.addShapeLayer('star');
 FM.scene.layers.forEach((l,i)=>{ l.start=0; l.duration=6; l.transform.x=300+i*180; l.transform.y=500+i*300; });
 FM.scene.layers[0].effects=[FM.fxRegistry.makeInstance('glow'),FM.fxRegistry.makeInstance('dropshadow')];
 const old=()=>{ let src=document.createElement('canvas'); src.width=1080; src.height=1920; FM.renderScene(src.getContext('2d'),FM.scene,1); const tw=202,th=360; while(src.width>=tw*2){ const h=document.createElement('canvas'); h.width=Math.max(tw,Math.round(src.width/2)); h.height=Math.max(th,Math.round(src.height/2)); const g=h.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(src,0,0,h.width,h.height); src=h; } const c=document.createElement('canvas'); c.width=tw; c.height=th; const g=c.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(src,0,0,tw,th); return c.getContext('2d').getImageData(0,0,tw,th).data; };
 const neu=()=>{ const tw=202,th=360; let src=document.createElement('canvas'); src.width=tw*2; src.height=th*2; src.__fmRS=src.width/1080; src.__fmOX=0; src.__fmOY=0; FM.renderScene(src.getContext('2d'),FM.scene,1); const c=document.createElement('canvas'); c.width=tw; c.height=th; const g=c.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(src,0,0,tw,th); return c.getContext('2d').getImageData(0,0,tw,th).data; };
 const a=old(), b=neu(); let s=0,hi=0,n=0; for(let i=0;i<a.length;i+=4){ let m=0; for(let k=0;k<3;k++){ const d=Math.abs(a[i+k]-b[i+k]); s+=d; if(d>m)m=d; } if(m>16) hi++; n++; } out.mad=+(s/(n*3)).toFixed(3); out.pctOver16=+(hi*100/n).toFixed(2);
 }catch(e){out.err=e.message;} return JSON.stringify(out);})()
