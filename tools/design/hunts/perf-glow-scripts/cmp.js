(async function(){ const out={rows:[]}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'pf2',width:1080,height:1920}); await new Promise(r=>setTimeout(r,300));
 const P=FM.scene.project; P.width=1080;P.height=1920;P.duration=4;
 const photoFile=await fetch('fx-art/bay.jpg').then(r=>r.blob()).then(b=>new File([b],'bay.jpg',{type:'image/jpeg'}));
 const photo=await FM.loadImageFile(photoFile);
 const CW=window.__cw||605, CH=Math.round(CW*1920/1080);
 function render(){ const c=document.createElement('canvas'); c.width=CW;c.height=CH; c.__fmRS=CW/1080;c.__fmOX=0;c.__fmOY=0; const g=c.getContext('2d'); const t0=performance.now(); FM.renderScene(g,FM.scene,0.2); g.getImageData(0,0,1,1); return {c,ms:performance.now()-t0}; }
 const kinds=window.__kinds||['text','shape','image'], Ns=window.__ns||[1,4,8,16], places=window.__places||['center','edge'];
 for(const kind of kinds) for(const place of places) for(const N of Ns){
  FM.scene.layers.length=0; FM.history.reset();
  let L;
  if(kind==='text'){ FM.addTextLayer(); FM.textEdit&&FM.textEdit.stop&&FM.textEdit.stop(); L=FM.scene.layers[0]; L.text='GLOW'; L.fontSize=place==='center'?200:300; L.color='#ffcc33'; if(place==='bleed'){ L.transform.x=430; } if(place==='edge'){ L.transform.x=300; } }
  else if(kind==='shape'){ FM.addShapeLayer('ellipse'); L=FM.scene.layers[0]; L.shapeW=place==='edge'?1080:400; L.shapeH=place==='edge'?1920:400; L.fillColor='#33ccff'; if(place==='bleed'){ L.transform.x=450; L.transform.y=100; } if(place==='off'){ L.transform.x=window.__offx||1300; } }
  else { FM.addMediaLayer(photo); L=FM.scene.layers[0]; L.transform.scale=place==='edge'?Math.max(P.width/photo.width,P.height/photo.height):0.4; if(place==='bleed'){ L.transform.x=P.width*0.4; } }
  L.start=0; L.duration=4;
  L.effects=[]; for(let i=0;i<N;i++){ const e=FM.fxRegistry.makeInstance('glow'); e.params.radius=window.__rad||12; L.effects.push(e); }
  if(window.__extra==='shadow'){ L.shadow={enabled:true,color:'#ff0000',alpha:80,blur:12,dx:30,dy:40}; } if(window.__extra==='opacity'){ L.transform.opacity=0.6; }
  if(window.__pre){ const q=FM.fxRegistry.makeInstance('blur'); q.params.radius=window.__pre; L.effects.unshift(q); }
  window.__rev=(window.__rev||0)+1;
  FM._glowSplitOff=true; const a=render(); const a2=window.__fast?a:render();
  FM._glowSplitOff=false; const b=render(); const b2=window.__fast?b:render();
  const A=a.c.getContext('2d').getImageData(0,0,CW,CH).data,B=b.c.getContext('2d').getImageData(0,0,CW,CH).data;
  let mx=0,n0=0,n8=0,s=0; for(let i=0;i<A.length;i+=4){ let m=0; for(let k=0;k<4;k++){ const d=Math.abs(A[i+k]-B[i+k]); s+=d; if(d>m)m=d;} if(m>mx)mx=m; if(m>0)n0++; if(m>8)n8++; }
  const A2=a2.c.getContext('2d').getImageData(0,0,CW,CH).data; let jm=0,jn=0; let bx0=CW,bx1=-1,by0=CH,by1=-1; for(let i=0;i<A.length;i+=4){ let m=0; for(let k=0;k<4;k++){ const d=Math.abs(A[i+k]-A2[i+k]); if(d>m)m=d;} if(m>jm)jm=m; if(m>0)jn++; let m2=0; for(let k=0;k<4;k++){ const d=Math.abs(A[i+k]-B[i+k]); if(d>m2)m2=d;} if(m2>0){ const x=(i/4)%CW,y=Math.floor(i/4/CW); if(x<bx0)bx0=x; if(x>bx1)bx1=x; if(y<by0)by0=y; if(y>by1)by1=y; } }
  let nz=0; for(let i=3;i<A.length;i+=4) if(A[i]) nz++;
  out.rows.push({nz,jit:jm+'/'+jn,box:[bx0,by0,bx1,by1].join(','),kind,place,N,chainMs:Math.round(Math.min(a.ms,a2.ms)),splitMs:Math.round(Math.min(b.ms,b2.ms)),max:mx,diffPx:n0,over8:n8,mad:+(s/(CW*CH*4)).toFixed(4)});
 }
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
