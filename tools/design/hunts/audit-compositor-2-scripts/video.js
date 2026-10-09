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
 window.__vrec=vrec; 
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,200);} return JSON.stringify(out);})()
