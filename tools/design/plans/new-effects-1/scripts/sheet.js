(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'sheet',width:300,height:300}); await new Promise(r=>setTimeout(r,300));
 const P=FM.scene.project; P.width=300;P.height=300;P.duration=4;P.background='#222b3a'; FM.scene.layers.length=0; FM.history.reset();
 const file=await fetch('fx-art/dog.jpg').then(r=>r.blob()).then(b=>new File([b],'dog.jpg',{type:'image/jpeg'}));
 const photo=await FM.loadImageFile(file); FM.addMediaLayer(photo); const PH=FM.scene.layers[0]; PH.start=0;PH.duration=4; PH.transform.scale=300/Math.min(photo.width,photo.height); PH.transform.x=150; PH.transform.y=150;
 FM.addTextLayer(); FM.textEdit&&FM.textEdit.stop&&FM.textEdit.stop(); const TX=FM.scene.layers[0]; TX.text='Hello'; TX.fontSize=96; TX.bold=true; TX.color='#f4ecd8'; TX.start=0;TX.duration=4; TX.transform.x=150; TX.transform.y=150;
 FM.addShapeLayer('ellipse'); const SH=FM.scene.layers[0]; SH.shapeW=190; SH.shapeH=190; SH.fill='#e8895a'; SH.start=0; SH.duration=4; SH.transform.x=150; SH.transform.y=150;
 FM.addShapeLayer('rect'); const SH2=FM.scene.layers[0]; SH2.shapeW=120; SH2.shapeH=70; SH2.fill='#2fb8a8'; SH2.start=0; SH2.duration=4; SH2.transform.x=200; SH2.transform.y=210;
 const subjects=[['Photo',[PH]],['Text',[TX]],['Shape',[SH,SH2]]];
 const all=[PH,TX,SH,SH2];
 const SET={
  huecycle:[['Start 40°, still',{speed:0,phase:40,boost:0.2},0.5],['Defaults, 1 s in',{},1.0],['Stepped, boost 0.6',{style:1,steps:6,speed:120,boost:0.6},1.3]],
  softskin:[['Amount 0.35, size 4',{amount:0.35,radius:4},0.5],['Defaults',{},0.5],['Amount 1, size 14',{amount:1,radius:14,keep:20},0.5]],
  oilpaint:[['Brush 2',{radius:2},0.5],['Defaults (brush 3)',{},0.5],['Brush 6, colour 0.6',{radius:6,detail:0.1,punch:0.6},0.5]],
  glitter:[['Sparse, small',{spacing:50,size:10,threshold:60},1.1],['Defaults',{},1.1],['Dense, 8 points',{spacing:28,size:22,threshold:40,points:2},1.1]],
  censor:[['Pixelate, box',{style:0,shape:0,x:45,y:42,w:28,h:30,strength:12},0.5],['Blur, oval, soft',{style:1,shape:1,x:45,y:42,w:28,h:30,strength:26,feather:6},0.5],['Black bar',{style:2,shape:0,x:45,y:42,w:28,h:14},0.5]],
  popart:[['2x2, hue shifts',{layout:0,style:0},0.5],['2x2, duotone pairs',{layout:0,style:1,gap:6},0.5],['3x3, posterised',{layout:1,style:2,gap:4},0.5]]
 };
 const order=['huecycle','softskin','oilpaint','glitter','censor','popart'];
 const R=360; const cells={};
 for(const ty of order){ for(const [sn,lays] of subjects){ all.forEach(l=>{ l.visible=lays.indexOf(l)>=0; }); for(let k=0;k<3;k++){ const [lab,prm,tt]=SET[ty][k]; const inst=FM.fxRegistry.makeInstance(ty); Object.assign(inst.params,prm); lays.forEach(l=>{ l.effects=[]; }); lays[0].effects=[inst]; const c=document.createElement('canvas');c.width=R;c.height=R;c.__fmRS=R/300;c.__fmOX=0;c.__fmOY=0; const g=c.getContext('2d',{willReadFrequently:true}); FM.renderScene(g,FM.scene,tt); cells[ty+'|'+sn+'|'+k]=c; } lays.forEach(l=>{ l.effects=[]; }); } }
 // compose
 const CS=190, PADX=8, LAB=44, HEAD=46, FOOT=20, BW=LAB+3*CS+4*PADX, BH=HEAD+3*CS+4*PADX+FOOT;
 const sheet=document.createElement('canvas'); sheet.width=BW*2+PADX*3; sheet.height=BH*3+PADX*4+34; const g=sheet.getContext('2d'); g.fillStyle='#141a24'; g.fillRect(0,0,sheet.width,sheet.height);
 g.fillStyle='#eef2f8'; g.font='bold 20px sans-serif'; g.fillText('FreeMotion: six new effects (E1)  |  rows: photo, text, shape  |  columns: three settings each', 12, 24);
 order.forEach((ty,bi)=>{ const bx=PADX+(bi%2)*(BW+PADX), by=34+PADX+Math.floor(bi/2)*(BH+PADX); g.fillStyle='#1d2636'; g.fillRect(bx,by,BW,BH); g.fillStyle='#ffffff'; g.font='bold 18px sans-serif'; g.fillText(FM.fxRegistry.get(ty).label,bx+10,by+22); g.fillStyle='#9fb0c8'; g.font='12px sans-serif'; const sets=SET[ty].map(s=>s[0]).join('  |  '); g.fillText(sets,bx+LAB+PADX,by+HEAD-8);
  subjects.forEach(([sn],ri)=>{ g.fillStyle='#9fb0c8'; g.font='12px sans-serif'; g.save(); g.translate(bx+14,by+HEAD+PADX+ri*(CS+PADX)+CS/2+14); g.fillText(sn,-14,0); g.restore(); for(let k=0;k<3;k++){ const x=bx+LAB+PADX+k*(CS+PADX), y=by+HEAD+PADX+ri*(CS+PADX); g.imageSmoothingQuality='high'; g.drawImage(cells[ty+'|'+sn+'|'+k],x,y,CS,CS); } }); });
 out.w=sheet.width; out.h=sheet.height; out.ratio=+(sheet.height/sheet.width).toFixed(2); out.jpg=sheet.toDataURL('image/jpeg',0.88);
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
