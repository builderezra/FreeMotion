import sys,json,base64,os
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import cdp_eval as C
OUT='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/d6'
js=r"""(async function(){
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const res={};
 const P0={width:1080,height:1920,fps:30,duration:6,background:'#101418'};
 function oldThumb(){ const P=FM.scene.project; let src=document.createElement('canvas'); src.width=P.width; src.height=P.height;
   FM.renderScene(src.getContext('2d'),FM.scene,FM.time);
   const s=Math.min(360/P.width,360/P.height,1), tw=Math.max(2,Math.round(P.width*s)), th=Math.max(2,Math.round(P.height*s));
   while(src.width>=tw*2){const half=document.createElement('canvas');half.width=Math.max(tw,Math.round(src.width/2));half.height=Math.max(th,Math.round(src.height/2));const hg=half.getContext('2d');hg.imageSmoothingQuality='high';hg.drawImage(src,0,0,half.width,half.height);src=half;}
   const c=document.createElement('canvas');c.width=tw;c.height=th;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(src,0,0,tw,th);return c; }
 function newThumb(){ const P=FM.scene.project; const s=Math.min(360/P.width,360/P.height,1), tw=Math.max(2,Math.round(P.width*s)), th=Math.max(2,Math.round(P.height*s));
   const c=document.createElement('canvas');c.width=tw;c.height=th; FM.renderScene(c.getContext('2d'),FM.scene,FM.time); return c; }
 function bytes(c){ return c.toDataURL('image/jpeg',0.8).length; }
 function diff(a,b){ const A=a.getContext('2d').getImageData(0,0,a.width,a.height).data,B=b.getContext('2d').getImageData(0,0,b.width,b.height).data; let s=0,m=0,n=0; for(let i=0;i<A.length;i+=4){ for(let k=0;k<3;k++){const d=Math.abs(A[i+k]-B[i+k]); s+=d; if(d>m)m=d;} n+=3;} return {mean:+(s/n).toFixed(2),max:m}; }
 async function measure(name){
   FM.refreshAll&&FM.refreshAll(); await sleep(400);
   let t0=performance.now(); const o=oldThumb(); const ob=bytes(o); const tOld=Math.round(performance.now()-t0);
   t0=performance.now(); const n=newThumb(); const nb=bytes(n); const tNew=Math.round(performance.now()-t0);
   // a second timing of each, to show the first is not just a cold cache
   t0=performance.now(); const o2=oldThumb(); bytes(o2); const tOld2=Math.round(performance.now()-t0);
   t0=performance.now(); const n2=newThumb(); bytes(n2); const tNew2=Math.round(performance.now()-t0);
   res[name]={w:o.width,h:o.height,oldMs:[tOld,tOld2],newMs:[tNew,tNew2],diff:diff(o,n),oldPng:o.toDataURL('image/png'),newPng:n.toDataURL('image/png')};
 }
 function setScene(layers){ FM.scene={project:Object.assign({},P0),layers:layers,selectedId:null,selectedIds:[]}; FM.time=0.5; }
 // ---- A: a big photo (4000x3000, synthetic photo-like: gradients, noise, fine detail)
 { const c=document.createElement('canvas'); c.width=4000;c.height=3000; const g=c.getContext('2d');
   let gr=g.createLinearGradient(0,0,4000,3000); gr.addColorStop(0,'#1d3b6f'); gr.addColorStop(.5,'#e0a458'); gr.addColorStop(1,'#2a5c3b'); g.fillStyle=gr; g.fillRect(0,0,4000,3000);
   let seed=7; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
   for(let i=0;i<4000;i++){ g.fillStyle='rgba('+(rnd()*255|0)+','+(rnd()*255|0)+','+(rnd()*255|0)+',0.25)'; const r=4+rnd()*60; g.beginPath(); g.arc(rnd()*4000,rnd()*3000,r,0,7); g.fill(); }
   g.strokeStyle='rgba(255,255,255,.55)'; g.lineWidth=2; for(let x=0;x<4000;x+=7){ g.beginPath(); g.moveTo(x,1200); g.lineTo(x+40,1800); g.stroke(); }   // fine detail
   g.fillStyle='#fff'; g.font='bold 64px sans-serif'; for(let r=0;r<10;r++) g.fillText('Summer 2026  Lake Como  IMG_'+(4400+r),160,300+r*90);
   const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.92)); const file=new File([blob],'big-photo.jpg',{type:'image/jpeg'});
   const rec=await FM.loadImageFile(file); setScene([]); FM.addMediaLayer(rec); res.photoSize=rec.width+'x'+rec.height; await measure('photo');
 }
 // ---- B: a video frame (1280x720 webm, vp8; the container has no H.264)
 try { const c=document.createElement('canvas'); c.width=1280;c.height=720; const g=c.getContext('2d'); const st=c.captureStream(30); const mr=new MediaRecorder(st,{mimeType:'video/webm;codecs=vp8'}); const chunks=[]; mr.ondataavailable=e=>chunks.push(e.data);
   const done=new Promise(r=>mr.onstop=r); mr.start(); const t0=performance.now();
   while(performance.now()-t0<1500){ const t=(performance.now()-t0)/1500; g.fillStyle='#223'; g.fillRect(0,0,1280,720); for(let i=0;i<40;i++){ g.fillStyle='hsl('+(i*9+t*200)+',70%,55%)'; g.fillRect(40+i*30,100+Math.sin(t*6+i)*60+i*8,22,420-i*6);} g.fillStyle='#fff'; g.font='48px sans-serif'; g.fillText('Frame '+Math.round(t*45),60,80); await sleep(33); }
   mr.stop(); await done; const file=new File([new Blob(chunks,{type:'video/webm'})],'clip.webm',{type:'video/webm'});
   const rec=await FM.loadVideoFile(file); setScene([]); FM.addMediaLayer(rec); FM.time=0.4; res.videoDur=rec.duration; res.projAfter=FM.scene.project.width+'x'+FM.scene.project.height;
   let ok=false; for(let k=0;k<30&&!ok;k++){ rec.el.currentTime=0.4; await sleep(300); const t=document.createElement('canvas'); t.width=64; t.height=64; const g2=t.getContext('2d'); FM.renderScene(g2,FM.scene,FM.time); const d=g2.getImageData(0,0,64,64).data; let mn=255,mx=0; for(let i=0;i<d.length;i+=4){ mn=Math.min(mn,d[i+1]); mx=Math.max(mx,d[i+1]); } ok=(mx-mn)>40; res.videoTry=k; res.videoReady=rec.el.readyState+'/'+rec.el.currentTime; }
   res.videoSize=rec.width+'x'+rec.height; res.videoDrawn=ok; await measure('video');
 } catch(e){ res.videoErr=String(e); }
 // ---- C: small text
 { const T=FM.makeLayer('text',{name:'t',x:540,y:900,start:0,duration:6}); T.text='Chapter 3: the long way round\nSmall print: all prices include tax.\nOpen 9 to 5, Monday to Friday\nwww.example.com / 555 0142'; T.fontSize=26; T.fill='#ffffff';
   if(T.style) T.style.fontSize=26; setScene([T]); res.textKeys=Object.keys(T).slice(0,40).join(','); await measure('text'); }
 // ---- D: 10 glows
 { const L=FM.makeLayer('shape',{shape:'rect',name:'g',x:540,y:960,shapeW:500,shapeH:500,fill:'#ff4d6d',start:0,duration:6}); L.effects=[]; for(let i=0;i<10;i++) L.effects.push(FM.fxRegistry.makeInstance('glow')); setScene([L]); await measure('glow10'); }
 return JSON.stringify(res);
})()"""
r=C.run('http://localhost:8796/index.html',[js],port=9413,timeout=600,width=1280,height=800)[0]
try: d=json.loads(r)
except Exception: print(r); sys.exit()
for k,v in d.items():
    if isinstance(v,dict):
        for t in ('oldPng','newPng'):
            open('%s/%s_%s.png'%(OUT,k,t[:3]),'wb').write(base64.b64decode(v.pop(t).split(',')[1]))
print(json.dumps(d,indent=1))
json.dump(d,open(OUT+'/d6.json','w'),indent=1)
