(async function(){ const out={}; try{
 const CS=210, PAD=8, LAB=96, HEAD=84, FOOT=34, N=300;
 const loadImg=u=>new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=u; });
 const cv=(w,h)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
 const cat=await loadImg('fx-art/cat.jpg');
 const face=(()=>{ const c=cv(N,N), g=c.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(cat,135,118,110,110,0,0,N,N); return c; })();
 // synthetic skin patch: flat skin colour, gradient light, sensor noise, a few spots; clearly NOT a photo
 const synth=(()=>{ const c=cv(N,N), g=c.getContext('2d'); const gr=g.createRadialGradient(120,110,20,150,150,220); gr.addColorStop(0,'#e7b595'); gr.addColorStop(1,'#b97d5e'); g.fillStyle=gr; g.fillRect(0,0,N,N);
   const im=g.getImageData(0,0,N,N), d=im.data; let x=12345; const rnd=()=>{ x^=x<<13; x^=x>>>17; x^=x<<5; return ((x>>>0)%1000)/1000; };
   for(let i=0;i<d.length;i+=4){ const n=(rnd()-0.5)*34; d[i]+=n; d[i+1]+=n*0.9; d[i+2]+=n*0.8; }
   g.putImageData(im,0,0); g.fillStyle='rgba(140,60,50,0.55)'; [[80,90,5],[190,140,4],[140,220,6],[230,70,3]].forEach(([a,b,r])=>{ g.beginPath(); g.arc(a,b,r,0,7); g.fill(); });
   g.strokeStyle='rgba(90,50,40,0.5)'; g.lineWidth=2; g.beginPath(); g.moveTo(60,200); g.quadraticCurveTo(150,230,250,190); g.stroke(); return c; })();
 const K=FM._FX_TABLES.PIXEL_FX.softskin;
 const run=(src,p)=>{ const w=src.width,h=src.height; const c=cv(w,h), g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(src,0,0); const im=g.getImageData(0,0,w,h); const before=new Uint8ClampedArray(im.data); const t0=performance.now(); K(im.data,w,h,p,0.5,1); const ms=performance.now()-t0; let s=0,n=0,mx=0; for(let i=0;i<before.length;i+=4){ const dd=Math.abs(before[i]-im.data[i])+Math.abs(before[i+1]-im.data[i+1])+Math.abs(before[i+2]-im.data[i+2]); s+=dd/3; n++; if(dd/3>mx)mx=dd/3; } g.putImageData(im,0,0); return {c:c,ms:ms,mean:s/n,max:mx,data:im.data}; };
 const SET=[['Original',null],['Defaults: 0.6, 6 px, keep 60, Everything',{}],['Defaults, Skin tones only',{only:1}],['Stronger A: 0.85, 10 px, keep 50, Skin tones',{amount:0.85,radius:10,keep:50,only:1}],['Stronger B: 1.0, 14 px, keep 35, Skin tones',{amount:1,radius:14,keep:35,only:1}]];
 const subj=[['Cat face (closest to a face in the repo), crop at 2.7x',face],['Synthetic skin patch with noise and spots (drawn, not a photo)',synth]];
 const BW=LAB+5*CS+7*PAD, BH=HEAD+2*CS+3*PAD+FOOT+20;
 const sheet=cv(BW,BH), g=sheet.getContext('2d'); g.fillStyle='#141a24'; g.fillRect(0,0,BW,BH);
 g.fillStyle='#eef2f8'; g.font='bold 18px sans-serif'; g.fillText('Soften Skin: today\'s defaults and two stronger settings',12,24);
 g.font='13px sans-serif'; g.fillStyle='#9fb0c8'; g.fillText('No human face exists in the repo (checked fx-art, launch art, tools/design). The cat\'s face is the closest: its ginger coat sits inside the skin-tone range.',12,44);
 const stats=[];
 subj.forEach(([lab,src],ri)=>{ const y=HEAD+PAD+ri*(CS+PAD); g.fillStyle='#9fb0c8'; g.font='12px sans-serif'; const words=lab.split(' '); let line='',yy=y+14; words.forEach(w=>{ if((line+w).length>14){ g.fillText(line,6,yy); yy+=14; line=''; } line+=w+' '; }); g.fillText(line,6,yy);
   SET.forEach(([sl,p],k)=>{ const x=LAB+PAD+k*(CS+PAD); const res=p?run(src,p):{c:src,mean:0,max:0}; g.drawImage(res.c,x,y,CS,CS); if(ri===0){ g.fillStyle='#eef2f8'; g.font='11px sans-serif'; const ws=sl.split(' '); let l2='',y2=HEAD-20; ws.forEach(w=>{ if((l2+w).length>30){ g.fillText(l2,x,y2); y2+=13; l2=''; } l2+=w+' '; }); g.fillText(l2,x,y2); }
     g.fillStyle='rgba(20,26,36,0.78)'; g.fillRect(x,y+CS-18,CS,18); g.fillStyle='#d6e2f5'; g.font='11px sans-serif'; g.fillText(p?('mean change '+res.mean.toFixed(1)+', max '+res.max.toFixed(0)):'untouched',x+6,y+CS-5); stats.push([ri,k,+res.mean.toFixed(2),+res.max.toFixed(0)]); }); });
 g.fillStyle='#9fb0c8'; g.font='12px sans-serif'; g.fillText('Levels are 0 to 255 per channel, averaged over the whole crop. Timing at 300x300: see report.',12,BH-10);
 out.w=BW; out.h=BH; out.ratio=+(BH/BW).toFixed(2); out.stats=stats; out.jpg=sheet.toDataURL('image/jpeg',0.9);
 }catch(e){ out.err=(e&&e.message||String(e))+' '+((e&&e.stack)||'').slice(0,300); } return JSON.stringify(out); })()
