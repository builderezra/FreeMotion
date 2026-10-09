(async function(){ const out={}; try{
 if(FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'card compare',width:1080,height:1920}); await new Promise(r=>setTimeout(r,300));
 const P=FM.scene.project; P.width=1080;P.height=1920;P.duration=6; FM.scene.layers.length=0; FM.history.reset();
 const photoFile=await fetch('fx-art/'+window.__photo).then(r=>r.blob()).then(b=>new File([b],window.__photo,{type:'image/jpeg'}));
 const photo=await FM.loadImageFile(photoFile); FM.addMediaLayer(photo); const pl=FM.scene.layers[0]; pl.start=0; pl.duration=6; pl.transform.scale=Math.max(1080/photo.width,1920/photo.height);
 // a video frame: recorded WebM
 const cv=document.createElement('canvas'); cv.width=320;cv.height=240; const g=cv.getContext('2d'); const rec=new MediaRecorder(cv.captureStream(15),{mimeType:'video/webm;codecs=vp9'}); const ch=[]; rec.ondataavailable=e=>ch.push(e.data); const done=new Promise(r=>rec.onstop=r); rec.start(100); for(let i=0;i<14;i++){ const gr=g.createLinearGradient(0,0,320,240); gr.addColorStop(0,'hsl('+(i*20)+',80%,50%)'); gr.addColorStop(1,'hsl('+(i*20+90)+',70%,35%)'); g.fillStyle=gr; g.fillRect(0,0,320,240); g.fillStyle='#fff'; g.fillRect(20+i*10,90,60,60); for(let k=0;k<12;k++){ g.fillStyle='rgba(0,0,0,.5)'; g.fillRect(k*28,0,2,240);} await new Promise(r=>setTimeout(r,66)); } rec.stop(); await done;
 const vrec=await FM.loadVideoFile(new File([new Blob(ch,{type:'video/webm'})],'v.webm',{type:'video/webm'})); FM.addMediaLayer(vrec); const vl=FM.scene.layers[0]; vl.start=0; vl.duration=0.8; vl.transform.scale=1.6; vl.transform.y=1400;
 FM.addTextLayer(); FM.textEdit.stop(); const tl=FM.scene.layers[0]; tl.text='Small text on a card, 28 px'; tl.fontSize=28; tl.transform.y=300; tl.start=0; tl.duration=6;
 FM.addShapeLayer('ellipse'); const sl=FM.scene.layers[0]; sl.shapeW=240; sl.shapeH=240; sl.transform.x=800; sl.transform.y=800; sl.start=0; sl.duration=6; sl.effects=[FM.fxRegistry.makeInstance('glow'),FM.fxRegistry.makeInstance('dropshadow')];
 FM.setTime(0.3); await new Promise(r=>setTimeout(r,1200)); const vm=FM.media.get(vl.id); if(vm&&vm.el) { vm.el.currentTime=0.3; await new Promise(r=>setTimeout(r,500)); }
 const tw=203,th=360;
 const halve=(src)=>{ while(src.width>=tw*2){ const h=document.createElement('canvas'); h.width=Math.max(tw,Math.round(src.width/2)); h.height=Math.max(th,Math.round(src.height/2)); const g2=h.getContext('2d'); g2.imageSmoothingQuality='high'; g2.drawImage(src,0,0,h.width,h.height); src=h; } const c=document.createElement('canvas'); c.width=tw;c.height=th; const g3=c.getContext('2d'); g3.imageSmoothingQuality='high'; g3.drawImage(src,0,0,tw,th); return c; };
 const jpegRound=async(c)=>{ const url=c.toDataURL('image/jpeg',0.8); const img=new Image(); img.src=url; await img.decode(); const o=document.createElement('canvas'); o.width=c.width;o.height=c.height; o.getContext('2d').drawImage(img,0,0); return o; };
 const t=FM.time; const oldC=(()=>{ const s=document.createElement('canvas'); s.width=1080;s.height=1920; FM.renderScene(s.getContext('2d'),FM.scene,t); return halve(s); })();
 const newC=(()=>{ const s=document.createElement('canvas'); s.width=tw*2; s.height=th*2; s.__fmRS=s.width/1080; s.__fmOX=0; s.__fmOY=0; FM.renderScene(s.getContext('2d'),FM.scene,t); return halve(s); })();
 const o=await jpegRound(oldC), n=await jpegRound(newC);
 const a=o.getContext('2d').getImageData(0,0,tw,th).data,b=n.getContext('2d').getImageData(0,0,tw,th).data; let s2=0,hi=0,N=0; const dif=document.createElement('canvas'); dif.width=tw;dif.height=th; const dg=dif.getContext('2d'); const di=dg.createImageData(tw,th);
 for(let i=0;i<a.length;i+=4){ let m=0; for(let k=0;k<3;k++){ const d=Math.abs(a[i+k]-b[i+k]); s2+=d; if(d>m)m=d; } if(m>16)hi++; N++; const v=Math.min(255,m*8); di.data[i]=v;di.data[i+1]=v;di.data[i+2]=v;di.data[i+3]=255; }
 dg.putImageData(di,0,0); out.mad=+(s2/(N*3)).toFixed(3); out.pctOver16=+(hi*100/N).toFixed(2);
 const sheet=document.createElement('canvas'); sheet.width=tw*3*2+40; sheet.height=th*2+30; const sg=sheet.getContext('2d'); sg.fillStyle='#222'; sg.fillRect(0,0,sheet.width,sheet.height); sg.imageSmoothingEnabled=false; [o,n,dif].forEach((c,i)=>sg.drawImage(c,10+i*(tw*2+10),10,tw*2,th*2)); out.png=sheet.toDataURL('image/png');
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
