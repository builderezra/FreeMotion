(function(){ const out={}; const T=FM._FX_TABLES.CANVAS_FX.popart;
 const mkA=(W,H)=>{ const c=document.createElement('canvas'); c.width=W;c.height=H; const g=c.getContext('2d'); g.fillStyle='#c46a2a'; g.fillRect(W*0.1875,H*0.125,W*0.625,H*0.75); g.fillStyle='#f4f0e0'; g.font='bold '+(70*W/320)+'px sans-serif'; g.textAlign='center'; g.fillText('Abc',W/2,H*0.6); return c; };
 const run=(W,H,ps)=>{ const A=mkA(W,H), B=document.createElement('canvas'); B.width=W;B.height=H; const bb={x:Math.round(W*0.1875),y:Math.round(H*0.125),w:Math.round(W*0.625),h:Math.round(H*0.75)}; T(A,B.getContext('2d',{willReadFrequently:true}),W,H,bb,Object.assign(FM.fxRegistry.makeInstance('popart').params),0.5,1,null,ps); return B; };
 const Big=run(320,240,1), Small=run(160,120,0.5);
 const h=document.createElement('canvas'); h.width=160;h.height=120; const hg=h.getContext('2d'); hg.imageSmoothingQuality='high'; hg.drawImage(Big,0,0,160,120);
 const a=hg.getImageData(0,0,160,120).data,b=Small.getContext('2d').getImageData(0,0,160,120).data; let s=0,n30=0; for(let i=0;i<a.length;i++){ const d=Math.abs(a[i]-b[i]); s+=d; if(i%4!==3&&d>30)n30++; }
 out.mad=s/a.length; out.over30=n30; return JSON.stringify(out); })()
