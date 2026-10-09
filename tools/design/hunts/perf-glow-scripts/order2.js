(function(){ const W=300,H=300; const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
 const F='drop-shadow(0 0 6px #fff) drop-shadow(0 0 6px #fff)'; const al=0.6;
 const px=c=>c.getContext('2d').getImageData(0,0,W,H).data;
 const cmp=(x,y)=>{let m=0,n=0;for(let i=0;i<x.length;i++){const d=Math.abs(x[i]-y[i]);if(d>m)m=d;if(d>8)n++;}return m+'/'+n;};
 const A=mk(),ga=A.getContext('2d'); ga.globalAlpha=al; ga.filter=F; ga.fillStyle='#3cf'; ga.fillRect(100,100,80,80);
 // B: plate opaque, filter, blit at alpha
 const P=mk(),gp=P.getContext('2d'); gp.filter=F; gp.fillStyle='#3cf'; gp.fillRect(100,100,80,80);
 const B=mk(),gb=B.getContext('2d'); gb.globalAlpha=al; gb.drawImage(P,0,0);
 // C: content at alpha in the plate, filter there, blit opaque
 const Q=mk(),gq=Q.getContext('2d'); gq.globalAlpha=al; gq.filter=F; gq.fillStyle='#3cf'; gq.fillRect(100,100,80,80);
 const C=mk(),gc=C.getContext('2d'); gc.drawImage(Q,0,0);
 // D: content at alpha in plate WITHOUT filter, filter in a draw to the target at alpha 1 (stage by stage separately)
 const R=mk(),gr=R.getContext('2d'); gr.globalAlpha=al; gr.fillStyle='#3cf'; gr.fillRect(100,100,80,80);
 const S1=mk(),g1=S1.getContext('2d'); g1.filter='drop-shadow(0 0 6px #fff)'; g1.drawImage(R,0,0);
 const D=mk(),gd=D.getContext('2d'); gd.filter='drop-shadow(0 0 6px #fff)'; gd.drawImage(S1,0,0);
 const a=px(A); return JSON.stringify({B:cmp(a,px(B)),C:cmp(a,px(C)),D:cmp(a,px(D))}); })()
