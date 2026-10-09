(async function(){ const out={rows:{}}; try{
 if(FM.home.isOpen()) FM.home.close();
 const W=320,H=240; const P=FM.scene.project; P.width=W;P.height=H;P.duration=4;P.background='#202830';
 const sc=document.createElement('canvas'); sc.width=W; sc.height=H; const g=sc.getContext('2d');
 const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,'#e8553a'); gr.addColorStop(.5,'#3ab0e8'); gr.addColorStop(1,'#f2e04a'); g.fillStyle=gr; g.fillRect(0,0,W,H);
 g.fillStyle='#111'; g.fillRect(40,40,90,60); g.fillStyle='#fff'; g.beginPath(); g.arc(220,150,50,0,7); g.fill(); g.strokeStyle='#000'; g.lineWidth=4; for(let i=0;i<8;i++){g.beginPath();g.moveTo(10+i*38,0);g.lineTo(30+i*38,H);g.stroke();} g.fillStyle='#fff'; g.font='bold 40px sans-serif'; g.fillText('AB12',50,200);
 const blob=await new Promise(r=>sc.toBlob(r,'image/png')); const rec=await FM.loadImageFile(new File([blob],'t.png',{type:'image/png'}));
 const T=(window.__types||'').split(' ').filter(Boolean);
 const mk=(type)=>{ const L=FM.makeLayer('image',{name:'src',x:W/2,y:H/2,start:0,duration:4}); L.transform.scale=1; FM.media.set(L.id,rec); const e=FM.fxRegistry.makeInstance(type); if(!e) return null; L.effects=[e]; return {project:P,layers:[L],selectedId:null,selectedIds:[]}; };
 const draw=(scene,t,rs)=>{ const w=Math.round(W*rs),h=Math.round(H*rs); const c=document.createElement('canvas'); c.width=w;c.height=h; c.__fmRS=rs; c.__fmOX=0; c.__fmOY=0; FM._exporting=false; FM.renderScene(c.getContext('2d'),scene,t); return c; };
 const down=(c,w,h)=>{const d=document.createElement('canvas');d.width=w;d.height=h;const x=d.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(c,0,0,w,h);return d;};
 const data=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const lum=d=>{const n=d.length/4,o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2];return o;};
 const box=(L,w,h,k)=>{const o=new Float32Array((w/k|0)*(h/k|0)),bw=w/k|0,bh=h/k|0;for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){let s=0;for(let y=0;y<k;y++)for(let x=0;x<k;x++)s+=L[(by*k+y)*w+bx*k+x];o[by*bw+bx]=s/(k*k);}return o;};
 const grad=(L,w,h)=>{let s=0;for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){const i=y*w+x;s+=Math.abs(L[i+1]-L[i])+Math.abs(L[i+w]-L[i]);}return s/((w-1)*(h-1));};
 const mad=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/a.length;};
 const t=0.5;
 for(const type of T){ try{ const sc2=mk(type); if(!sc2){out.rows[type]='none';continue;} draw(sc2,t,1); const p1=draw(sc2,t,1); const r={};
   for(const rs of [0.5,0.25]){ const w=Math.round(W*rs),h=Math.round(H*rs); const ref=data(down(p1,w,h)), pre=data(draw(sc2,t,rs)); const a=lum(ref),b=lum(pre);
     const k=rs===0.5?8:4; const bm=mad(box(a,w,h,k),box(b,w,h,k)); const ga=grad(a,w,h),gb=grad(b,w,h);
     r['rs'+rs]={full:+mad(a,b).toFixed(2),lowfreq:+bm.toFixed(2),energy:+(gb/(ga||1)).toFixed(2),meanShift:+(box(b,w,h,w)[0]-box(a,w,h,w)[0]).toFixed(2)}; }
   out.rows[type]=r; }catch(e){out.rows[type]='err '+e.message;} }
 }catch(e){out.err=e.message;} return JSON.stringify(out);})()
