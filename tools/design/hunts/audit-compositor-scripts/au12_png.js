(async function(){
 const out={}; try{
 if(FM.home.isOpen()) FM.home.close();
 const W=320,H=240; const P=FM.scene.project; P.width=W;P.height=H;P.duration=4;P.background='#202830';
 // textured source image
 const sc=document.createElement('canvas'); sc.width=W; sc.height=H; const g=sc.getContext('2d');
 const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,'#e8553a'); gr.addColorStop(.5,'#3ab0e8'); gr.addColorStop(1,'#f2e04a'); g.fillStyle=gr; g.fillRect(0,0,W,H);
 g.fillStyle='#111'; g.fillRect(40,40,90,60); g.fillStyle='#fff'; g.beginPath(); g.arc(220,150,50,0,7); g.fill(); g.strokeStyle='#000'; g.lineWidth=4; for(let i=0;i<8;i++){g.beginPath();g.moveTo(10+i*38,0);g.lineTo(30+i*38,H);g.stroke();} g.fillStyle='#fff'; g.font='bold 40px sans-serif'; g.fillText('AB12',50,200);
 const blob=await new Promise(r=>sc.toBlob(r,'image/png')); const file=new File([blob],'t.png',{type:'image/png'}); const rec=await FM.loadImageFile(file);
 const ids=['blur','glow','dropshadow','vignette','brightness','contrast','saturate','hue','grayscale','invert','rgbsplit','pixelate','filmgrain','sharpen','wave','glitch','zoomblur','tiltshift','chromaticaberration','tint'];
 const mkScene=(type)=>{ const L=FM.makeLayer('image',{name:'src',x:W/2,y:H/2,start:0,duration:4}); L.transform.scale=1; FM.media.set(L.id,rec); if(type){ const e=FM.fxRegistry.makeInstance(type); if(!e) return null; L.effects=[e]; } return {project:P,layers:[L],selectedId:null,selectedIds:[]}; };
 const draw=(scene,t,rs,exporting)=>{ const w=Math.round(W*rs),h=Math.round(H*rs); const c=document.createElement('canvas'); c.width=w;c.height=h; c.__fmRS=rs; c.__fmOX=0; c.__fmOY=0; FM._exporting=!!exporting; try{ FM.renderScene(c.getContext('2d'),scene,t);}finally{FM._exporting=false;} return c; };
 const px=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const down=(c,w,h)=>{const d=document.createElement('canvas');d.width=w;d.height=h;const x=d.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(c,0,0,w,h);return d;};
 const cmp=(a,b)=>{let s=0,n=0,hi=0;for(let i=0;i<a.length;i+=4){let m=0;for(let k=0;k<3;k++){const d=Math.abs(a[i+k]-b[i+k]);s+=d;if(d>m)m=d;} if(m>8)hi++; n++;} return {mad:+(s/(n*3)).toFixed(3),pctHi:+(hi*100/n).toFixed(2)};};
 const t=0.5; const flagged=['glitch','tiltshift','sharpen','wave','zoomblur','chromaticaberration','blur']; const sheet=document.createElement('canvas'); sheet.width=160*2*2; sheet.height=120*4; const sx=sheet.getContext('2d'); sx.fillStyle='#000'; sx.fillRect(0,0,sheet.width,sheet.height);
 flagged.slice(0,7).forEach((type,i)=>{ const scene=mkScene(type); draw(scene,t,1,false); const p1=draw(scene,t,1,false); const r5=draw(scene,t,0.5,false); const col=i%2, row=Math.floor(i/2); sx.drawImage(down(p1,160,120),col*320,row*120); sx.drawImage(r5,col*320+160,row*120); });
 out.png=sheet.toDataURL('image/png');
 }catch(e){out.err=e.message;} return JSON.stringify(out);})()