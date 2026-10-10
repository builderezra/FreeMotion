(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'p35',width:540,height:960}); await new Promise(r=>setTimeout(r,400));
 FM.scene.layers.length=0; FM.scene.project.background='#000000';
 const L=FM.makeLayer('shape',{shape:'heart',x:270,y:480,shapeW:400,shapeH:400,fill:'#ffffff',start:0,duration:3,name:'h'}); L.stroke=null; L.strokeWidth=0; FM.scene.layers.push(L); FM.selectLayer(null); FM.time=1; FM.requestRender&&FM.requestRender(); await new Promise(r=>setTimeout(r,500));
 const cv=document.getElementById('preview'); const ctx=cv.getContext('2d'); const W=cv.width,H=cv.height; const img=ctx.getImageData(0,0,W,H).data;
 let x0=W,x1=0,y0=H,y1=0; const on=(i)=>img[i*4]>128; for(let y=0;y<H;y++)for(let x=0;x<W;x++){ if(on(y*W+x)){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
 out.bbox=[x0,y0,x1,y1]; out.cv=[W,H];
 const N=64; const shape=new Array(N); // half-width per normalized y row
 const bw=x1-x0+1, bh=y1-y0+1;
 const rowW=(y)=>{ let c=0; for(let x=x0;x<=x1;x++) if(on(y*W+x)) c++; return c; };
 const prof=[]; for(let k=0;k<N;k++){ const y=Math.min(y1,y0+Math.floor((k+0.5)/N*bh)); prof.push(rowW(y)/bw); }
 // icon path rasterised into same bbox aspect
 const d='M12 21.5C12 21.5 5.45 15.61 5.45 15.04C5.45 14.47 2.5 11.56 2.5 8.14C2.5 4.72 5.01 2.5 8.14 2.5C11.28 2.5 12 5.92 12 5.92C12 5.92 12.72 2.5 15.86 2.5C18.99 2.5 21.5 4.72 21.5 8.14C21.5 11.56 18.56 14.47 18.56 15.04C18.56 15.61 12 21.5 12 21.5Z';
 const c2=document.createElement('canvas'); c2.width=W; c2.height=H; const g=c2.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,W,H); g.save(); g.translate(x0,y0); g.scale(bw/19,bh/19); g.translate(-2.5,-2.5); g.fillStyle='#fff'; g.fill(new Path2D(d)); g.restore();
 const im2=g.getImageData(0,0,W,H).data; const on2=(i)=>im2[i*4]>128;
 let inter=0,uni=0; for(let i=0;i<W*H;i++){ const a=on(i), b=on2(i); if(a&&b)inter++; if(a||b)uni++; } out.iou=+(inter/uni).toFixed(4);
 const prof2=[]; for(let k=0;k<N;k++){ const y=Math.min(y1,y0+Math.floor((k+0.5)/N*bh)); let c=0; for(let x=x0;x<=x1;x++) if(on2(y*W+x)) c++; prof2.push(c/bw); }
 // below the widest row the half width must never grow going down
 const widest=prof.indexOf(Math.max(...prof)); let grow=0, maxgrow=0; for(let k=widest+1;k<N;k++){ const dd=prof[k]-prof[k-1]; if(dd>0.004){grow++; maxgrow=Math.max(maxgrow,dd);} }
 const widest2=prof2.indexOf(Math.max(...prof2)); let grow2=0; for(let k=widest2+1;k<N;k++){ if(prof2[k]-prof2[k-1]>0.004) grow2++; }
 out.shape={widestRow:widest,growsBelowWidest:grow,maxGrow:+maxgrow.toFixed(3)}; out.icon={widestRow:widest2,growsBelowWidest:grow2};
 out.maxProfileDiff=+Math.max(...prof.map((v,i)=>Math.abs(v-prof2[i]))).toFixed(3); out.rowOfMaxDiff=prof.map((v,i)=>Math.abs(v-prof2[i])).indexOf(Math.max(...prof.map((v,i)=>Math.abs(v-prof2[i]))));
 out.profShape=prof.filter((_,i)=>i%6==0).map(v=>+v.toFixed(2)); out.profIcon=prof2.filter((_,i)=>i%6==0).map(v=>+v.toFixed(2));
 try{await FM.projects.remove(me);}catch(e){}
}catch(e){out.err=String(e&&e.stack||e).slice(0,300)} return JSON.stringify(out);})()
