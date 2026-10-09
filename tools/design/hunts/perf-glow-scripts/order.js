(function(){ const W=300,H=300; const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
 const F='drop-shadow(0 0 6px #fff) drop-shadow(0 0 6px #fff)'; 
 const sh=g=>{g.shadowColor='rgba(255,0,0,.8)';g.shadowBlur=10;g.shadowOffsetX=30;g.shadowOffsetY=40;};
 const A=mk(),ga=A.getContext('2d'); ga.filter=F; sh(ga); ga.fillStyle='#3cf'; ga.fillRect(100,100,80,80);
 const px=c=>c.getContext('2d').getImageData(0,0,W,H).data;
 const cmp=(x,y)=>{let m=0,n=0;for(let i=0;i<x.length;i++){const d=Math.abs(x[i]-y[i]);if(d>m)m=d;if(d>8)n++;}return m+'/'+n;};
 // B1: filter first, then shadow on the blit
 const P=mk(),gp=P.getContext('2d'); gp.filter=F; gp.fillStyle='#3cf'; gp.fillRect(100,100,80,80); gp.filter='none';
 const B1=mk(),g1=B1.getContext('2d'); sh(g1); g1.drawImage(P,0,0);
 // B2: shadow in plate, filter on blit
 const Q=mk(),gq=Q.getContext('2d'); sh(gq); gq.fillStyle='#3cf'; gq.fillRect(100,100,80,80); gq.shadowColor='transparent';
 const B2=mk(),g2=B2.getContext('2d'); g2.filter=F; g2.drawImage(Q,0,0);
 // B3: shadow as separate pass UNDER, filter on content only  (content filtered, shadow of the unfiltered content)
 const B3=mk(),g3=B3.getContext('2d'); sh(g3); g3.filter='none'; g3.fillStyle='#3cf'; g3.fillRect(100,100,80,80); g3.shadowColor='transparent'; g3.filter=F; g3.fillRect(100,100,80,80);
 // B4: shadow offset by filter drawn on drawImage of unfiltered plate: filter on blit with shadow set
 const R=mk(),gr=R.getContext('2d'); gr.fillStyle='#3cf'; gr.fillRect(100,100,80,80);
 const B4=mk(),g4=B4.getContext('2d'); g4.filter=F; sh(g4); g4.drawImage(R,0,0);
 const a=px(A); return JSON.stringify({B1:cmp(a,px(B1)),B2:cmp(a,px(B2)),B3:cmp(a,px(B3)),B4:cmp(a,px(B4))}); })()
