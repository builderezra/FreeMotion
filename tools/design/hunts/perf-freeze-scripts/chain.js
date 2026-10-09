(async function(){ const out={rows:[]}; try{
 const W=605,H=1075;
 const mk=()=>{ const c=document.createElement('canvas'); c.width=W;c.height=H; return c; };
 const src=mk(); { const g=src.getContext('2d'); g.fillStyle='#e8553a'; g.fillRect(150,300,170,170); }
 const srcEdge=mk(); { const g=srcEdge.getContext('2d'); g.fillStyle='#e8553a'; g.fillRect(-60,300,170,170); g.fillRect(480,-50,200,120); }
 const flush=c=>c.getContext('2d').getImageData(0,0,1,1);
 const chain=(s,N,r)=>{ const out=mk(),g=out.getContext('2d'); g.filter=Array(N).fill('drop-shadow(0 0 '+r+'px #ffffff)').join(' '); const t=performance.now(); g.drawImage(s,0,0); flush(out); return [out,Math.round(performance.now()-t)]; };
 const steps=(s,N,r)=>{ let cur=s; const t=performance.now(); for(let i=0;i<N;i++){ const o=mk(),g=o.getContext('2d'); g.filter='drop-shadow(0 0 '+r+'px #ffffff)'; g.drawImage(cur,0,0); cur=o; } flush(cur); return [cur,Math.round(performance.now()-t)]; };
 const diff=(a,b)=>{ const x=a.getContext('2d').getImageData(0,0,W,H).data,y=b.getContext('2d').getImageData(0,0,W,H).data; let n=0,m=0,s=0; for(let i=0;i<x.length;i++){ const d=Math.abs(x[i]-y[i]); if(d){n++; s+=d; if(d>m)m=d;} } return {diffBytes:n,max:m}; };
 for(const [name,s] of [['interior',src],['edge',srcEdge]]) for(const N of [4,8,12,16]){ const [a,ta]=chain(s,N,9.6),[b,tb]=steps(s,N,9.6); out.rows.push([name,N,'chain ms',ta,'steps ms',tb,diff(a,b)]); }
 }catch(e){out.err=e.message;} return JSON.stringify(out);})()
