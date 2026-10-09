(async function(){
 const out={}; try{
 if(FM.home.isOpen()) FM.home.close();
 const W=320,H=240; const P=FM.scene.project; P.width=W;P.height=H;P.duration=4;P.background='#202830';
 // textured source image
 const sc=document.createElement('canvas'); sc.width=W; sc.height=H; const g=sc.getContext('2d');
 const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,'#e8553a'); gr.addColorStop(.5,'#3ab0e8'); gr.addColorStop(1,'#f2e04a'); g.fillStyle=gr; g.fillRect(0,0,W,H);
 g.fillStyle='#111'; g.fillRect(40,40,90,60); g.fillStyle='#fff'; g.beginPath(); g.arc(220,150,50,0,7); g.fill(); g.strokeStyle='#000'; g.lineWidth=4; for(let i=0;i<8;i++){g.beginPath();g.moveTo(10+i*38,0);g.lineTo(30+i*38,H);g.stroke();} g.fillStyle='#fff'; g.font='bold 40px sans-serif'; g.fillText('AB12',50,200);
 const blob=await new Promise(r=>sc.toBlob(r,'image/png')); const file=new File([blob],'t.png',{type:'image/png'}); const rec=await FM.loadImageFile(file);
 const ids=FM.fxRegistry.allIncludingHidden().filter(Boolean).map(e=>e.type).filter(t=>!/^(text|filter|cube3d|box3d|cylinder3d|sphere3d|ellipsoid3d|torus3d|ring3d|pyramid3d|octahedron3d|hexprism3d|starprism3d|starpoly3d|heart3d|hollowbox3d|axiscross3d|counter|timecode|particles|weather)/.test(t));
 const mkScene=(type)=>{ const L=FM.makeLayer('image',{name:'src',x:W/2,y:H/2,start:0,duration:4}); L.transform.scale=1; FM.media.set(L.id,rec); if(type){ const e=FM.fxRegistry.makeInstance(type); if(!e) return null; L.effects=[e]; } return {project:P,layers:[L],selectedId:null,selectedIds:[]}; };
 const draw=(scene,t,rs,exporting)=>{ const w=Math.round(W*rs),h=Math.round(H*rs); const c=document.createElement('canvas'); c.width=w;c.height=h; c.__fmRS=rs; c.__fmOX=0; c.__fmOY=0; FM._exporting=!!exporting; try{ FM.renderScene(c.getContext('2d'),scene,t);}finally{FM._exporting=false;} return c; };
 const px=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const down=(c,w,h)=>{const d=document.createElement('canvas');d.width=w;d.height=h;const x=d.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(c,0,0,w,h);return d;};
 const cmp=(a,b)=>{let s=0,n=0,hi=0;for(let i=0;i<a.length;i+=4){let m=0;for(let k=0;k<3;k++){const d=Math.abs(a[i+k]-b[i+k]);s+=d;if(d>m)m=d;} if(m>8)hi++; n++;} return {mad:+(s/(n*3)).toFixed(3),pctHi:+(hi*100/n).toFixed(2)};};
 const t=0.5; const rows={};
 for(const type of ids){ try{
   const scene=mkScene(type); if(!scene){continue;}
   draw(scene,t,1,false); const p1=draw(scene,t,1,false), e1=draw(scene,t,1,true);
   const pe=cmp(px(p1),px(e1));
   const r={pe:pe.mad+'/'+pe.pctHi};
   for(const rs of [0.5,0.75,0.25]){ const w=Math.round(W*rs),h=Math.round(H*rs); const r5=draw(scene,t,rs,false); const c=cmp(px(down(p1,w,h)),px(r5)); r['rs'+rs]=[c.mad,c.pctHi]; }
   rows[type]=r; }catch(e){ rows[type]='err '+e.message; } }
 out.rows=rows;
 }catch(e){out.err=e.message+' '+(e.stack||'').split('\n')[1];} return JSON.stringify(out);})()