(async function(){ const out={}; try{
 if(FM.home.isOpen()) FM.home.close();
 out.mr=MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
 const W=320,H=240; const P=FM.scene.project; P.width=W;P.height=H;P.duration=3;P.background='#202830';
 const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
 const stream=cv.captureStream(15); const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:4000000}); const chunks=[]; rec.ondataavailable=e=>chunks.push(e.data);
 const done=new Promise(r=>rec.onstop=r); rec.start(100);
 const N=30; for(let f=0;f<N;f++){ const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,'hsl('+(f*12)+',80%,55%)'); gr.addColorStop(1,'hsl('+(f*12+120)+',70%,40%)'); g.fillStyle=gr; g.fillRect(0,0,W,H); g.fillStyle='#fff'; g.fillRect(10+f*8,40,50,50); g.fillStyle='#000'; g.font='bold 36px sans-serif'; g.fillText(''+f,20,200); for(let i=0;i<6;i++){g.strokeStyle='#000';g.lineWidth=3;g.beginPath();g.moveTo(i*55,0);g.lineTo(i*55+25,H);g.stroke();} await new Promise(r=>setTimeout(r,66)); }
 rec.stop(); await done; const blob=new Blob(chunks,{type:'video/webm'}); out.bytes=blob.size;
 const vrec=await FM.loadVideoFile(new File([blob],'v.webm',{type:'video/webm'})); out.dur=vrec.duration; out.w=vrec.width;

 const L=FM.makeLayer('video',{name:'v',x:W/2,y:H/2,start:0,duration:1.9}); L.transform.scale=1; FM.media.set(L.id,vrec); FM.scene.layers.length=0; FM.scene.layers.push(L);
 const el=vrec.el; out.fps=P.fps;
 const seek=(tt)=>new Promise(res=>{ let done=false; const f=()=>{ if(done) return; done=true; el.removeEventListener('seeked',f); setTimeout(res,30); }; el.addEventListener('seeked',f); el.currentTime=tt; setTimeout(f,1500); });
 const px=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const draw=(scene,t,exporting)=>{ const c=document.createElement('canvas'); c.width=W;c.height=H; c.__fmRS=1; c.__fmOX=0; c.__fmOY=0; FM._exporting=!!exporting; try{FM.renderScene(c.getContext('2d'),scene,t);}finally{FM._exporting=false;} return c; };
 const cmp=(a,b)=>{let s=0,n=0,hi=0;for(let i=0;i<a.length;i+=4){let m=0;for(let k=0;k<3;k++){const d=Math.abs(a[i+k]-b[i+k]);s+=d;if(d>m)m=d;} if(m>8)hi++; n++;} return [+(s/(n*3)).toFixed(3),+(hi*100/n).toFixed(2)];};
 const types=['none','blur','glow','dropshadow','vignette','brightness','contrast','saturate','hue','grayscale','invert','rgbsplit','pixelate','filmgrain','sharpen','wave','glitch','zoomblur','tiltshift','chromaticaberration','tint'];
 { L.effects=[]; const sc={project:P,layers:[L],selectedId:null,selectedIds:[]}; const fr=[]; for(const t of [0.2,0.9,1.4]){ FM.setTime(t); await seek(FM.frameSeekTarget(FM.layerLocalTime(L,t),vrec.duration)); const d=px(draw(sc,t,false)); let s=0; for(let k=0;k<d.length;k+=4) s+=d[k]+d[k+1]+d[k+2]; fr.push([+(s/(d.length/4)/3).toFixed(1), el.currentTime.toFixed(3), d[4*(120*W+30)]+','+d[4*(120*W+30)+1]]); } out.sanity=fr; }
 out.rows={};
 for(const type of types){ const row=[]; L.effects=[]; if(type!=='none'){ const e=FM.fxRegistry.makeInstance(type); L.effects=[e]; }
   const scene={project:P,layers:[L],selectedId:null,selectedIds:[]};
   for(const t of [0.2,0.9,1.4]){
     FM.setTime(t); await seek(FM.frameSeekTarget?FM.frameSeekTarget(FM.layerLocalTime(L,t),vrec.duration):t);
     const a=px(draw(scene,t,false)); const a2=px(draw(scene,t,false));
     // export-like: reseek a different time first so the seek is genuine
     await seek(1.7); await seek(FM.frameSeekTarget(FM.layerLocalTime(L,t),vrec.duration));
     const b=px(draw(scene,t,true));
     row.push([cmp(a,a2)[0],cmp(a,b)[0],cmp(a,b)[1]]);
   }
   out.rows[type]=row; }
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,200);} return JSON.stringify(out);})()
