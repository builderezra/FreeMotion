(async function(){ const out={}; try{
 const loadImg=u=>new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=u; });
 const img=await loadImg('fx-art/dog.jpg'); const mk=(W,H)=>{ const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(img,0,0,W,H); return g.getImageData(0,0,W,H); };
 const mine=FM._FX_TABLES.PIXEL_FX.oilpaint, b6=window.__b6oil, sk=FM._FX_TABLES.PIXEL_FX.softskin;
 const time=(k,W,H,p)=>{ const im=mk(W,H); const t0=performance.now(); k(im.data,W,H,p,0.5,1); const a=performance.now()-t0; const im2=mk(W,H); const t1=performance.now(); k(im2.data,W,H,p,0.5,1); return Math.round(Math.min(a,performance.now()-t1)); };
 out.mine={}; out.b6={}; out.skin={};
 [[300,300],[540,960],[1080,1920]].forEach(([W,H])=>{ out.mine[W+'x'+H]=time(mine,W,H,{}); out.b6[W+'x'+H]=time(b6,W,H,{}); out.skin[W+'x'+H]=time(sk,W,H,{}); });
 }catch(e){ out.err=(e&&e.message||String(e)); } return JSON.stringify(out); })()
