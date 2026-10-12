(async function(){ const out={}; try{
 const N=300, CS=150, PAD=8, LAB=52, HEAD=62, FOOT=30;
 const loadImg=u=>new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=u; });
 const cv=(w,h)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
 const photoImg=await loadImg('fx-art/dog.jpg');
 const subj={};
 subj.Photo=(()=>{ const c=cv(N,N), g=c.getContext('2d'); const s=Math.max(N/photoImg.width,N/photoImg.height); g.drawImage(photoImg,(N-photoImg.width*s)/2,(N-photoImg.height*s)/2,photoImg.width*s,photoImg.height*s); return c; })();
 subj.Text=(()=>{ const c=cv(N,N), g=c.getContext('2d'); g.fillStyle='#f4ecd8'; g.font='bold 96px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('Hello',N/2,N/2); g.strokeStyle='#d8553a'; g.lineWidth=6; g.strokeText('Hello',N/2,N/2); return c; })();
 subj.Shape=(()=>{ const c=cv(N,N), g=c.getContext('2d'); g.fillStyle='#e8895a'; g.beginPath(); g.ellipse(150,150,95,95,0,0,Math.PI*2); g.fill(); g.fillStyle='#2fb8a8'; g.fillRect(140,175,120,70); const gr=g.createLinearGradient(60,60,200,200); gr.addColorStop(0,'rgba(255,255,255,0.5)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.beginPath(); g.ellipse(150,150,95,95,0,0,Math.PI*2); g.fill(); return c; })();
 const mine=FM._FX_TABLES.PIXEL_FX.oilpaint, b6=window.__b6oil;
 const run=(kern,src,p)=>{ const w=src.width,h=src.height; const c=cv(w,h), g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(src,0,0); const im=g.getImageData(0,0,w,h); const t0=performance.now(); kern(im.data,w,h,p,0.5,1,undefined,undefined,undefined); const ms=performance.now()-t0; g.putImageData(im,0,0); return {c:c,ms:ms}; };
 const MINE=[['Brush 2',{radius:2}],['Brush 3 (default)',{}],['Brush 6, richer',{radius:6,detail:0.1,punch:0.6}]];
 const B6=[['Brush 3',{brush:3}],['Brush 6 (default)',{}],['Brush 12, edges 100%',{brush:12,sharpness:100}]];
 const names=Object.keys(subj);
 const BW=LAB+6*CS+8*PAD, BH=HEAD+3*CS+4*PAD+FOOT;
 const sheet=cv(BW,BH), g=sheet.getContext('2d'); g.fillStyle='#141a24'; g.fillRect(0,0,BW,BH);
 g.fillStyle='#eef2f8'; g.font='bold 18px sans-serif'; g.fillText('Oil Paint: pick ONE.   Left three: mine (Kuwahara, this branch).   Right three: ChatGPT B6 3728d6f5.',12,24);
 g.font='13px sans-serif'; g.fillStyle='#9fb0c8'; g.fillText('Same layer pixels for both, project size 300, plate scale 1. Rows: photo, text, shape. Each effect shown at three of its own settings.',12,44);
 const times={mine:[],b6:[]};
 names.forEach((sn,ri)=>{ const y=HEAD+PAD+ri*(CS+PAD); g.fillStyle='#9fb0c8'; g.font='13px sans-serif'; g.fillText(sn,8,y+CS/2);
   const draw=(res,x,lab,first)=>{ g.fillStyle='#222b3a'; g.fillRect(x,y,CS,CS); g.drawImage(res.c,x,y,CS,CS); if(ri===0){ g.fillStyle='#eef2f8'; g.font='12px sans-serif'; g.fillText(lab,x,HEAD-4); } };
   MINE.forEach(([lab,p],k)=>{ const res=run(mine,subj[sn],p); times.mine.push(res.ms); draw(res,LAB+PAD+k*(CS+PAD),lab); });
   B6.forEach(([lab,p],k)=>{ const res=run(b6,subj[sn],p); times.b6.push(res.ms); draw(res,LAB+PAD+(3+k)*(CS+PAD)+PAD*2,lab); }); });
 g.fillStyle='#9fb0c8'; g.font='12px sans-serif'; const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
 g.fillText('Time at 300x300 in this container: mine '+avg(times.mine).toFixed(0)+' ms, B6 '+avg(times.b6).toFixed(0)+' ms per frame (both are per-pixel; real phones are slower).',12,BH-10);
 out.w=BW; out.h=BH; out.ratio=+(BH/BW).toFixed(2); out.msMine=+avg(times.mine).toFixed(1); out.msB6=+avg(times.b6).toFixed(1); out.jpg=sheet.toDataURL('image/jpeg',0.9);
 }catch(e){ out.err=e.message+' '+(e.stack||'').slice(0,300); } return JSON.stringify(out); })()
