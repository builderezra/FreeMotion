/* FreeMotion effect pictures, artist 13 (c13): Drawing / Edge, Border Frame to Engraving. No photographs: every subject is drawn
   here, and every effect is its own kernel from js/compositor.js run on that subject (see each tile's note for the settings). */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const raw=c=>{ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
/* a smooth closed (or open) curve through points, Catmull-Rom as cubic beziers */
function spline(x,pts,closed){ const n=pts.length; x.moveTo(pts[0][0],pts[0][1]); const lim=closed?n:n-1;
  for(let i=0;i<lim;i++){ const p1=pts[i], p2=pts[(i+1)%n], p0=closed?pts[(i-1+n)%n]:(i?pts[i-1]:p1), p3=closed?pts[(i+2)%n]:(i+2<n?pts[i+2]:p2);
    x.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,p2[0],p2[1]); }
  if(closed) x.closePath(); }
function poly(x,pts,col){ x.fillStyle=col; x.beginPath(); pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])); x.closePath(); x.fill(); }
/* the integer hash Neon Outline's Flicker rolls (llHash in compositor.js) */
function llHash(i){ let h=(i*374761393+668265263)|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967295; }

/* ---------- the subjects, all drawn here in 0..100 units ---------- */

/* a road bike against a pale wall, side on, the front wheel cropped by the edge */
function paintBike(x){
  /* flat wall and floor: a gradient's 8-bit steps come back from a Sobel as faint stripes */
  x.fillStyle='#d3cec3'; x.fillRect(0,0,100,71);
  x.fillStyle='#9a9285'; x.fillRect(0,71,100,29);
  for(const wx of [24,82]){ x.save(); x.translate(wx,80.6); x.scale(1,.2); const sg=x.createRadialGradient(0,0,0,0,0,12); sg.addColorStop(0,'rgba(38,32,26,.5)'); sg.addColorStop(1,'rgba(38,32,26,0)'); x.fillStyle=sg; x.fillRect(-12,-12,24,24); x.restore(); }
  const ring=(cx,cy,ro,ri,col)=>{ x.fillStyle=col; x.beginPath(); x.arc(cx,cy,ro,0,TAU); x.arc(cx,cy,ri,0,TAU,true); x.fill(); };
  const disc=(cx,cy,r,col)=>{ x.fillStyle=col; x.beginPath(); x.arc(cx,cy,r,0,TAU); x.fill(); };
  const wheel=(cx,cy)=>{ ring(cx,cy,19,15.7,'#17171a'); ring(cx,cy,15.7,12.4,'#2e2f33');
    x.strokeStyle='#5d5e62'; x.lineWidth=.32; x.beginPath(); for(let k=0;k<16;k++){ const a=k*TAU/16+.1; x.moveTo(cx+Math.cos(a)*1.7,cy+Math.sin(a)*1.7); x.lineTo(cx+Math.cos(a)*12.5,cy+Math.sin(a)*12.5); } x.stroke();
    disc(cx,cy,1.7,'#a3a6aa'); };
  const tube=(pts,w,col)=>{ x.strokeStyle=col; x.lineWidth=w; x.lineCap='round'; x.lineJoin='round'; x.beginPath(); pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])); x.stroke(); };
  wheel(24,61); wheel(82,61);
  disc(24,61,2.9,'#6a6d70');
  x.strokeStyle='#45464a'; x.lineWidth=.5; x.beginPath(); x.moveTo(49,59.6); x.lineTo(24,58.2); x.moveTo(49,70.4); x.lineTo(24,63.8); x.stroke();
  const FR='#b4432b';
  tube([[49,65],[24,61]],1.6,FR);
  tube([[44.6,38.4],[24,61]],1.5,FR);
  tube([[49,65],[44,35.5]],2.6,FR);
  tube([[44.2,36.8],[71.6,38.2]],2.2,FR);
  tube([[49.4,64.6],[72.9,45.6]],3.0,FR);
  x.strokeStyle=FR; x.lineWidth=2.0; x.lineCap='round'; x.beginPath(); x.moveTo(73.2,46); x.quadraticCurveTo(76.4,52.5,82,61); x.stroke();
  tube([[71.4,36.4],[73.4,46.8]],3.3,FR);
  tube([[44,35.5],[42.6,28.6]],1.5,'#9a9ea3');
  poly(x,[[35.2,27.4],[48.2,27.0],[48.8,28.3],[44,29.4],[36.4,29.0]],'#1c1c1e');
  tube([[71.5,36.6],[76.6,35.2]],1.6,'#2a2a2d');
  x.strokeStyle='#1c1c1e'; x.lineWidth=1.7; x.beginPath(); x.moveTo(76.6,35.2); x.lineTo(79.6,35.4); x.bezierCurveTo(83.6,35.6,84.4,39.6,82.6,42.6); x.bezierCurveTo(81.6,44.2,80,44.4,78.6,44.2); x.stroke();
  ring(49,65,5.4,3.4,'#55585c'); disc(49,65,1.5,'#2b2c2f');
  tube([[49,65],[54.6,72.4]],1.6,'#26272a'); x.fillStyle='#26272a'; x.fillRect(52.4,72,4.6,1.4);
}

/* three river pebbles on linen, lit from the top left: smooth tone everywhere, which is what contours need */
function pebbles(R){
  const LIT=(()=>{ const a=-.34,b=-.42,c=.84, m=Math.hypot(a,b,c); return [a/m,b/m,c/m]; })();
  const PEB=[{x:31,y:68,a:31,b:21,r:-.22,c:[132,124,112]},{x:73,y:31,a:19.5,b:13.5,r:.42,c:[158,149,134]},{x:81,y:77,a:11.5,b:8.5,r:.12,c:[104,103,104]}];
  for(const p of PEB){ p.cs=Math.cos(p.r); p.sn=Math.sin(p.r); p.h=.46*p.b; p.ox=-LIT[0]/LIT[2]*p.h*.55; p.oy=-LIT[1]/LIT[2]*p.h*.55; }
  const ss=(a,b,v)=>{ const q=clamp((v-a)/(b-a)); return q*q*(3-2*q); };
  const [C,x]=sheet(R), im=x.createImageData(R,R), o=im.data, Y=new Float32Array(R*R);
  for(let j=0;j<R;j++) for(let i=0;i<R;i++){
    const X=(i+.5)*100/R, Yy=(j+.5)*100/R;
    const g=.95-.0026*(X*.45+Yy*.9);
    let r=228*g, gg=221*g, b=208*g, sh=1;
    for(const p of PEB){
      let dx=X-p.x-p.ox, dy=Yy-p.y-p.oy, u=dx*p.cs+dy*p.sn, v=-dx*p.sn+dy*p.cs; const q=Math.sqrt((u/p.a)**2+(v/p.b)**2);
      sh*=1-.34*ss(1.22,.72,q);
      dx=X-p.x; dy=Yy-p.y; u=dx*p.cs+dy*p.sn; v=-dx*p.sn+dy*p.cs; const q0=Math.sqrt((u/p.a)**2+(v/p.b)**2);
      sh*=1-.22*ss(1.16,1,q0);
    }
    r*=sh; gg*=sh; b*=sh;
    for(const p of PEB){
      const dx=X-p.x, dy=Yy-p.y, u=dx*p.cs+dy*p.sn, v=-dx*p.sn+dy*p.cs, r2=(u/p.a)**2+(v/p.b)**2;
      if(r2>=1) continue;
      const z=Math.sqrt(1-r2), nu=u/(p.a*p.a), nv=v/(p.b*p.b), nz=z/p.h, nx=nu*p.cs-nv*p.sn, ny=nu*p.sn+nv*p.cs, m=Math.hypot(nx,ny,nz);
      const lam=Math.max(0,(nx*LIT[0]+ny*LIT[1]+nz*LIT[2])/m);
      const k=.12+.98*lam*lam, cov=clamp((1-Math.sqrt(r2))*Math.min(p.a,p.b)*R/100*1.2);
      r=lerp(r,p.c[0]*k,cov); gg=lerp(gg,p.c[1]*k,cov); b=lerp(b,p.c[2]*k,cov);
    }
    const q=(j*R+i)*4; o[q]=r; o[q+1]=gg; o[q+2]=b; o[q+3]=255; Y[j*R+i]=.299*o[q]+.587*o[q+1]+.114*o[q+2];
  }
  x.putImageData(im,0,0);
  return {C,Y};
}

/* a two-tier aqueduct in silhouette against a pale evening sky, cropped by both edges */
function paintArcade(x){
  let g=x.createLinearGradient(0,0,0,100); g.addColorStop(0,'#6c7892'); g.addColorStop(.8,'#c1c5cc'); g.addColorStop(1,'#cfd0d1');
  x.fillStyle=g; x.fillRect(0,0,100,100);
  const body=new Path2D(); body.rect(0,13,100,90);
  const PITCH=29.5, X0=6, SP=51, AR=10, BOT=89;
  for(let k=-1;k<4;k++){ const cx=X0+k*PITCH; body.moveTo(cx+AR,BOT); body.lineTo(cx+AR,SP); body.arc(cx,SP,AR,0,Math.PI,true); body.lineTo(cx-AR,BOT); body.closePath(); }
  for(let k=-2;k<12;k++){ const cx=X0+k*PITCH/3, r=2.9; body.moveTo(cx+r,32.5); body.lineTo(cx+r,24.5); body.arc(cx,24.5,r,0,Math.PI,true); body.lineTo(cx-r,32.5); body.closePath(); }
  x.fillStyle='#252932'; x.fill(body,'evenodd');
  x.fillStyle='#30353f'; x.fillRect(0,13,100,2.6); x.fillRect(0,35,100,2);
  g=x.createLinearGradient(0,89,0,100); g.addColorStop(0,'#1e2026'); g.addColorStop(1,'#141519');
  x.fillStyle=g; x.fillRect(0,89,100,11);
}

/* an old brass key on slate, lying corner to corner (its holes cut on a sheet of its own, so the slate shows through them) */
function paintKey(x){
  let g=x.createLinearGradient(0,0,100,100); g.addColorStop(0,'#4a535c'); g.addColorStop(1,'#2c333a');
  x.fillStyle=g; x.fillRect(0,0,100,100);
  const S=x.canvas.width, [K,k]=sheet(S); k.setTransform(S/100,0,0,S/100,0,0);
  k.translate(17,80); k.rotate(-.7); k.scale(1.15,1.15);
  const LOBE=[Math.PI/2,Math.PI*7/6,Math.PI*11/6];
  g=k.createRadialGradient(-3,-4,1,0,0,14); g.addColorStop(0,'#f0d58f'); g.addColorStop(.5,'#c9a04a'); g.addColorStop(1,'#7d5a1f');
  k.fillStyle=g; k.beginPath(); k.arc(0,0,8.4,0,TAU); k.fill();
  for(const a of LOBE){ k.beginPath(); k.arc(Math.cos(a)*6.6,Math.sin(a)*6.6,6.2,0,TAU); k.fill(); }
  const cyl=r=>{ const c=k.createLinearGradient(0,-r,0,r); c.addColorStop(0,'#7d5a1f'); c.addColorStop(.28,'#f0d58f'); c.addColorStop(.55,'#c9a04a'); c.addColorStop(1,'#6e4f1a'); return c; };
  k.fillStyle=cyl(2.3); k.fillRect(10,-2.3,58,4.6); k.beginPath(); k.arc(68,0,2.3,-Math.PI/2,Math.PI/2); k.fill();
  k.fillStyle=cyl(3.4); k.fillRect(11,-3.4,2.4,6.8); k.fillRect(15.4,-3.4,2.4,6.8);
  g=k.createLinearGradient(52,0,66,12); g.addColorStop(0,'#e3c477'); g.addColorStop(1,'#9c7429');
  poly(k,[[51.5,1.8],[66,1.8],[66,12.6],[63.4,12.6],[63.4,9.4],[60.6,9.4],[60.6,12.6],[57.6,12.6],[57.6,7.8],[54.6,7.8],[54.6,11],[51.5,11]],g);
  k.globalCompositeOperation='destination-out';
  for(const a of LOBE){ k.beginPath(); k.arc(Math.cos(a)*7.4,Math.sin(a)*7.4,2.5,0,TAU); k.fill(); }
  k.beginPath(); k.arc(0,0,1.6,0,TAU); k.fill();
  k.globalCompositeOperation='source-over';
  x.save(); x.setTransform(1,0,0,1,0,0); x.drawImage(K,0,0); x.restore();
}

/* a fountain pen, cut out (transparent round it), nib in the frame and the barrel running off the top right */
const PEN={X:13,Y:85,A:-.6,S:1.35};
function paintPen(x){
  x.save(); x.translate(PEN.X,PEN.Y); x.rotate(PEN.A); x.scale(PEN.S,PEN.S);
  const cyl=(r,c0,c1,c2,c3)=>{ const g=x.createLinearGradient(0,-r,0,r); g.addColorStop(0,c0); g.addColorStop(.26,c1); g.addColorStop(.55,c2); g.addColorStop(1,c3); return g; };
  const lac=r=>cyl(r,'#0b0b0e','#55555f','#1a1a1f','#050506'), gold=r=>cyl(r,'#7a5b1c','#f6e19c','#c9a04a','#5e4413');
  x.fillStyle=lac(4.8); x.beginPath(); x.moveTo(29,-4.5); x.lineTo(150,-4.8); x.lineTo(150,4.8); x.lineTo(29,4.5); x.closePath(); x.fill();
  x.fillStyle=lac(4); x.beginPath(); x.moveTo(13.5,-2.9); x.lineTo(28,-3.9); x.lineTo(28,3.9); x.lineTo(13.5,2.9); x.closePath(); x.fill();
  x.fillStyle=gold(4.6); x.fillRect(27.4,-4.6,2.4,9.2); x.fillRect(64,-4.9,1.4,9.8); x.fillRect(66.6,-4.9,1.4,9.8);
  x.fillStyle=gold(3.2); x.beginPath(); x.moveTo(0,0); x.quadraticCurveTo(6,-1.4,9.5,-2.6); x.lineTo(14.5,-3.1); x.lineTo(14.5,3.1); x.lineTo(9.5,2.6); x.quadraticCurveTo(6,1.4,0,0); x.closePath(); x.fill();
  x.strokeStyle='#3a2a0c'; x.lineWidth=.3; x.beginPath(); x.moveTo(.4,0); x.lineTo(8.2,0); x.stroke();
  x.fillStyle='#3a2a0c'; x.beginPath(); x.arc(8.8,0,.65,0,TAU); x.fill();
  x.restore();
}
/* the ground under the pen, with its soft shadow (a layer of its own: the sweep never touches it) */
function paintDesk(x){
  const g=x.createLinearGradient(0,0,100,100); g.addColorStop(0,'#231f1b'); g.addColorStop(1,'#110f0e'); x.fillStyle=g; x.fillRect(0,0,100,100);
  x.save(); x.translate(PEN.X+2.2,PEN.Y+3.4); x.rotate(PEN.A); x.scale(PEN.S,PEN.S);
  for(const [w,a] of [[7.6,.1],[6.4,.14],[5.2,.2]]){ x.fillStyle='rgba(0,0,0,'+a+')'; x.beginPath(); x.moveTo(2,0); x.lineTo(14,-w*.62); x.lineTo(150,-w); x.lineTo(150,w); x.lineTo(14,w*.62); x.closePath(); x.fill(); }
  x.restore();
}

/* an alpine peak in the morning, its summit right of centre: a lit west face of snow, a north face in shadow, a pale range
   behind, a dark band of forest in front and an empty sky top left (the quiet fifth). Drawn in greys like a photograph. */
function paintPeak(x){
  let g=x.createLinearGradient(0,0,0,64); g.addColorStop(0,'#77838f'); g.addColorStop(1,'#dfe1df'); x.fillStyle=g; x.fillRect(0,0,100,100);
  /* the far range, pale with distance */
  poly(x,[[-1,60],[7,52],[14,55],[22,47.5],[31,53],[38,50.5],[46,57],[100,62],[100,101],[-1,101]],'#aeb5ba');
  const S=[63,13], RIDGE=[[63.2,22],[64.4,33],[63.4,44],[66,56],[68.5,76]];
  const WEST=[[59.5,18],[57.6,21.6],[55.2,22.8],[52.4,27.6],[49.2,29.4],[45.6,35.2],[42.2,37],[38,43.6],[32.4,49.8],[25.6,58.2],[16,68.6],[9,76]];
  const EAST=[[66.8,17.6],[69.4,22.4],[72.2,23.4],[74.8,27.4],[79,28.8],[83,34],[87.2,35.4],[91.5,39],[101,43.4]];
  /* the lit west face: snow, greying toward its foot */
  g=x.createLinearGradient(0,14,0,76); g.addColorStop(0,'#f7f5ef'); g.addColorStop(.6,'#dcddd8'); g.addColorStop(1,'#a9adab'); x.fillStyle=g;
  x.beginPath(); x.moveTo(S[0],S[1]); WEST.forEach(p=>x.lineTo(p[0],p[1])); x.lineTo(68.5,76); for(let i=RIDGE.length-2;i>=0;i--) x.lineTo(RIDGE[i][0],RIDGE[i][1]); x.closePath(); x.fill();
  /* rock ribs breaking through the snow, falling from the ridge */
  x.fillStyle='#8d9396';
  for(const [x0,y0,x1,y1,w] of [[60.6,24,47,47,1.1],[62.2,36,52.5,57,1.5],[57,23,43.5,40,.7],[63.5,48,58.5,70,2],[55.2,44,46,60,.9],[49,30.5,38,49,.8],[45,37,33,55,1.2],[59,54,50,70,1.4],[38.5,46,27,62,.9]]){
    const dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy), nx=-dy/L*w, ny=dx/L*w; poly(x,[[x0,y0],[x0+dx*.5+nx,y0+dy*.5+ny],[x1,y1],[x0+dx*.5-nx*.3,y0+dy*.5-ny*.3]],'#8d9396'); }
  /* the north face in shadow, with a few pale gullies of old snow */
  g=x.createLinearGradient(64,14,90,70); g.addColorStop(0,'#525d67'); g.addColorStop(1,'#323a42'); x.fillStyle=g;
  x.beginPath(); x.moveTo(S[0],S[1]); EAST.forEach(p=>x.lineTo(p[0],p[1])); x.lineTo(101,76); x.lineTo(68.5,76); for(let i=RIDGE.length-2;i>=0;i--) x.lineTo(RIDGE[i][0],RIDGE[i][1]); x.closePath(); x.fill();
  for(const [x0,y0,x1,y1,w] of [[67,24,71,46,.9],[73.5,27.5,78,52,1.2],[82,35,84.5,56,.8],[66.6,40,69.4,62,.7]]){
    const dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy), nx=-dy/L*w, ny=dx/L*w; poly(x,[[x0,y0],[x0+dx*.45+nx,y0+dy*.45+ny],[x1,y1],[x0+dx*.45-nx*.4,y0+dy*.45-ny*.4]],'#6c7781'); }
  /* a lower, nearer peak on the left, so the skyline is a ridge of two summits and not one clean triangle: its sunlit flank, then
     its shaded east side falling into the col */
  g=x.createLinearGradient(0,30,0,76); g.addColorStop(0,'#e9e8e2'); g.addColorStop(1,'#9fa4a3'); x.fillStyle=g;
  x.beginPath(); x.moveTo(-1,52); x.lineTo(9,44.6); x.lineTo(15.4,40.8); x.lineTo(21,34.6); x.lineTo(25.4,31.2); x.lineTo(27.6,32.6); x.lineTo(30,36.8); x.lineTo(31,54); x.lineTo(28,76); x.lineTo(-1,76); x.closePath(); x.fill();
  x.fillStyle='#5b656d'; x.beginPath(); x.moveTo(27.6,32.6); x.lineTo(30.6,36.4); x.lineTo(34.4,39.4); x.lineTo(39.6,46); x.lineTo(46,50.4); x.lineTo(52,57); x.lineTo(56,76); x.lineTo(28,76); x.lineTo(31,54); x.lineTo(30,36.8); x.closePath(); x.fill();
  poly(x,[[25.6,32],[20.4,42],[22.6,52],[24.2,41]],'#8d9396'); poly(x,[[18.8,37.6],[11,50],[14.4,56],[16.6,45]],'#8d9396');
  /* the near forest, nearly black, a ragged line of tree tops along it */
  x.fillStyle='#1c2122'; x.beginPath(); x.moveTo(-1,101); x.lineTo(-1,77);
  const R=rng(23); for(let X=-1;X<=101;X+=2.2){ const base=78.5-4.5*Math.sin(X*.045+.6)-1.6*Math.sin(X*.17), h=2.2+R()*3.4; x.lineTo(X,base); x.lineTo(X+1.1,base-h); }
  x.lineTo(101,101); x.closePath(); x.fill();
}

window.FX_TILES.push(

/* BORDER FRAME. Comp sheet: the layer is a cut-paper card that does not fill the frame, and the frame hugs the LAYER's box, inside
   its edge. Width 27 px on a 1080 frame (2.5 units), colour Bone. Draw on keyframed 0 to 100: border12 measures round the band's centre
   line clockwise from the top edge's left end, so the top-left corner square closes last. Then Style: Dotted (Gap 20 px), dots as
   wide as the band, and Draw on back to 0, a dot whole or not at all. */
{ id:'border', name:'Border Frame', section:'Drawing / Edge', isNew:true, still:2.3,
  line:'A frame draws itself round the edge of the layer, solid or as dashes or dots.',
  make(px){
    const P=4.6, X=9, Y=8, W=61, H=79, BW=2.5, GAP=1.9, h=BW/2;
    const L=X+h, T=Y+h, Rr=X+W-h, B=Y+H-h, lt=Rr-L, lr=B-T, PER=2*(lt+lr), CN=[lt,lt+lr,2*lt+lr];
    const at=s=>{ if(s<=lt) return [L+s,T]; s-=lt; if(s<=lr) return [Rr,T+s]; s-=lr; if(s<=lt) return [Rr-s,B]; s-=lt; return [L,B-Math.min(s,lr)]; };
    const [CARD,cx]=sheet(px); cx.setTransform(px/100,0,0,px/100,0,0);
    const U=p=>[X+p[0]*W,Y+p[1]*H];
    /* the card: a cut-paper dusk, a saguaro against a flat vermilion sky and a far mesa (art director, ad: it was a lit window
       behind a cypress, which repeated the lit windows of Tiles' façade) */
    cx.fillStyle='#e4471d'; cx.fillRect(X,Y,W,H);
    poly(cx,[[0,.6],[.07,.53],[.3,.535],[.36,.6],[.43,.66],[.47,.74],[.47,.86],[0,.86]].map(U),'#9b2c12');
    poly(cx,[[.47,.8],[.6,.785],[.78,.79],[1,.775],[1,.86],[.47,.86]].map(U),'#b5351a');
    poly(cx,[[0,.86],[1,.86],[1,1],[0,1]].map(U),INK);
    cx.save(); cx.strokeStyle=INK; cx.lineCap='round'; cx.lineJoin='round';
    const SU=p=>[X+p[0]*W,Y+p[1]*H], arm=(pts,w)=>{ cx.lineWidth=w*W; cx.beginPath(); pts.map(SU).forEach((q,i)=>i?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1])); cx.stroke(); };
    arm([[.63,.95],[.63,.17]],.135);
    arm([[.63,.6],[.5,.6],[.47,.57],[.47,.37]],.1);
    arm([[.63,.5],[.76,.5],[.79,.47],[.79,.3]],.095);
    cx.restore();
    cx.strokeStyle='rgba(231,226,213,.16)'; cx.lineWidth=.35; for(const dx of [-.025,.025]){ cx.beginPath(); const a=SU([.63+dx,.2]), b=SU([.63+dx,.86]); cx.moveTo(a[0],a[1]); cx.lineTo(b[0],b[1]); cx.stroke(); }
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      let d=0, dots=false;
      if(u<.45) d=0;
      else if(u<1.75) d=E.inOut(seg(u,.45,1.75));
      else if(u<2.75) d=1;
      else if(u<3.7){ d=1; dots=true; }
      else if(u<4.35){ d=1-E.inOut(seg(u,3.7,4.35)); dots=true; }
      else dots=true;
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      raw(c); c.drawImage(CARD,0,0); reset(c,px);
      if(d>0){
        const lim=d*PER;
        if(!dots){
          c.strokeStyle=BONE; c.lineWidth=BW; c.lineCap='butt'; c.lineJoin='miter'; c.beginPath(); c.moveTo(L,T);
          if(d>=1){ c.lineTo(Rr,T); c.lineTo(Rr,B); c.lineTo(L,B); c.closePath(); }
          else { for(const k of CN){ if(k<lim){ const q=at(k); c.lineTo(q[0],q[1]); } } const q=at(lim); c.lineTo(q[0],q[1]); }
          c.stroke();
        } else {
          c.fillStyle=BONE; const per=BW+GAP;
          for(let k=0;k*per+h<Math.min(lim,PER+h);k++){ const q=at(k*per+h); c.beginPath(); c.arc(q[0],q[1],h,0,TAU); c.fill(); }
        }
      }
      c.textAlign='left'; c.textBaseline='alphabetic';
      c.font=MONO(4.2); c.fillStyle=DIM; c.fillText('DRAW ON',75,80);
      c.font=MONO(8); c.fillStyle=TEXT; c.fillText(String(Math.round(d*100)).padStart(3,'0'),75,89);
      c.font=MONO(4.2); c.fillStyle=DIM; c.fillText(dots&&u<4.35?'DOTTED':'SOLID',75,95.5);
    };
  } },

/* TOPO LINES. Pen plotter on Bone. The kernel's own banding on the pebbles' luminance: Levels 10, and on a 1080 frame Smooth first 6 px
   and Line weight 5 (the kernel counts both in plate pixels, so here they are 2 and 3 px of a 360 plate), a line wherever the band
   differs from the pixel to the right or below, thickened by the kernel's square. Over the image, then Draws: Lines only (Lines Ink,
   Paper Bone), then Flow speed 0.42 a second: topoLines966 slides every boundary up one band, from the darks toward the lights, which
   is the same map again one band on, so the walk loops. Matched against the real render on the same pebbles. */
{ id:'contourlines', name:'Topo Lines', section:'Drawing / Edge', isNew:true, still:2.7,
  line:'Lines follow the brightness of the picture like contours on a map, and can flow slowly through its tones.',
  make(px){
    const P=5.2, R=Math.max(100,Math.min(360,Math.round(px))), LV=10, SM=2, F=24, scl=LV/255;
    const rq=Math.max(0,Math.round((.78*R/100-1)/2));
    const {C:SRC,Y}=pebbles(R), n=R*R;
    /* Smooth first: the kernel's separable box, edges held */
    const T1=new Float32Array(n), LS=new Float32Array(n), win=SM*2+1;
    for(let y=0;y<R;y++){ const row=y*R; let s=0; for(let k=-SM;k<=SM;k++) s+=Y[row+clamp(k,0,R-1)]; for(let x=0;x<R;x++){ T1[row+x]=s/win; s+=Y[row+Math.min(R-1,x+SM+1)]-Y[row+Math.max(0,x-SM)]; } }
    for(let x=0;x<R;x++){ let s=0; for(let k=-SM;k<=SM;k++) s+=T1[clamp(k,0,R-1)*R+x]; for(let y=0;y<R;y++){ LS[y*R+x]=s/win; s+=T1[Math.min(R-1,y+SM+1)*R+x]-T1[Math.max(0,y-SM)*R+x]; } }
    const band=new Int16Array(n), hit=new Uint8Array(n), MASKS=[];
    for(let f=0;f<F;f++){
      const sf=f/F;
      for(let j=0;j<n;j++){ let b; if(sf===0){ b=Math.floor(LS[j]*scl); if(b>=LV) b=LV-1; if(b<0) b=0; } else b=Math.floor(LS[j]*scl-sf); band[j]=b; }
      hit.fill(0);
      for(let y=0;y<R;y++) for(let x=0;x<R;x++){ const q=y*R+x, bc=band[q]; if(bc!==band[y*R+(x+1<R?x+1:x)]||bc!==band[(y+1<R?y+1:y)*R+x]) hit[q]=1; }
      const m=new Uint8Array(n);
      for(let y=0;y<R;y++) for(let x=0;x<R;x++){ let on=0; for(let dy=-rq;dy<=rq&&!on;dy++){ const yy=y+dy; if(yy<0||yy>=R) continue; for(let dx=-rq;dx<=rq;dx++){ const xx=x+dx; if(xx<0||xx>=R) continue; if(hit[yy*R+xx]){ on=1; break; } } } m[y*R+x]=on; }
      MASKS.push(m);
    }
    const [MC,mx]=sheet(R), mi=mx.createImageData(R,R), m32=new Uint32Array(mi.data.buffer), INKW=new Uint32Array(new Uint8Array([0x16,0x13,0x0f,255]).buffer)[0]; let last=-1;
    const paint=f=>{ if(f===last) return; last=f; const m=MASKS[f]; for(let j=0;j<n;j++) m32[j]=m[j]?INKW:0; mx.putImageData(mi,0,0); };
    return (c,t)=>{
      const u=mod(t,P), st=u<.7?0:u<1.5?1:u<4.7?2:0;
      let f=0; if(st===2&&u>=1.9&&u<4.3) f=Math.floor(seg(u,1.9,4.3)*F)%F;
      raw(c);
      if(st===2){ c.fillStyle=BONE; c.fillRect(0,0,px,px); } else c.drawImage(SRC,0,0,px,px);
      if(st){ paint(f); c.drawImage(MC,0,0,px,px); }
    };
  } },

/* FIND EDGES. A colourist's split on a drawn road bike: the kernel's Sobel on luma, Amount 1.5 (the default), White on black (the
   default), Line width 5 px on a 1080 frame, so the taps sit 5 export px out, read between pixels as the kernel reads them. The Bone
   hairline is the split, not part of either picture. */
{ id:'edge', name:'Find Edges', section:'Drawing / Edge', isNew:true, still:2.0,
  line:'The picture is replaced by its outlines: white lines wherever the brightness changes, black everywhere else.',
  make(px){
    const P=4.4, R=Math.max(100,Math.min(480,Math.round(px))), ps=R/1080, LW=5, K=1.5, ST=Math.max(1,LW*ps);
    const [SRC,sx]=sheet(R); sx.setTransform(R/100,0,0,R/100,0,0); paintBike(sx);
    const s=sx.getImageData(0,0,R,R).data, n=R*R, Yl=new Float32Array(n);
    for(let i=0;i<n;i++){ const j=i*4; Yl[i]=s[j]*.299+s[j+1]*.587+s[j+2]*.114; }
    const ay=(fx,fy)=>{ fx=fx<0?0:(fx>R-1?R-1:fx); fy=fy<0?0:(fy>R-1?R-1:fy); const x0=Math.floor(fx), y0=Math.floor(fy), x1=x0<R-1?x0+1:x0, y1=y0<R-1?y0+1:y0, tx=fx-x0, ty=fy-y0;
      return (Yl[y0*R+x0]*(1-tx)+Yl[y0*R+x1]*tx)*(1-ty)+(Yl[y1*R+x0]*(1-tx)+Yl[y1*R+x1]*tx)*ty; };
    const [EDG,ex]=sheet(R), oi=ex.createImageData(R,R), o=oi.data;
    /* (the kernel leaves its outermost pixel ring as it was: one pixel of a 1080 export, nothing at this size, so it is read like the rest) */
    for(let y=0;y<R;y++) for(let x=0;x<R;x++){ const i=(y*R+x)*4;
      const tl=ay(x-ST,y-ST), tc=ay(x,y-ST), tr=ay(x+ST,y-ST), ml=ay(x-ST,y), mr=ay(x+ST,y), bl=ay(x-ST,y+ST), bc=ay(x,y+ST), br=ay(x+ST,y+ST);
      const gx=(tr+2*mr+br)-(tl+2*ml+bl), gy=(bl+2*bc+br)-(tl+2*tc+tr), m=Math.min(255,Math.hypot(gx,gy)*K);
      o[i]=o[i+1]=o[i+2]=m; o[i+3]=255; }
    ex.putImageData(oi,0,0);
    return (c,t)=>{
      const u=mod(t,P); raw(c);
      let left=null, right=SRC, sp=-1;
      if(u<.5){ right=SRC; }
      else if(u<1.2){ sp=E.inOut(seg(u,.5,1.2)); left=EDG; right=SRC; }
      else if(u<3.0){ right=EDG; }
      else if(u<3.7){ sp=E.inOut(seg(u,3.0,3.7)); left=SRC; right=EDG; }
      c.drawImage(right,0,0,px,px);
      if(left&&sp>0){ const w=sp*px; c.save(); c.beginPath(); c.rect(0,0,w,px); c.clip(); c.drawImage(left,0,0,px,px); c.restore();
        if(sp<1){ reset(c,px); c.fillStyle=BONE; c.fillRect(sp*100-.3,0,.6,100); } }
    };
  } },

/* NEON OUTLINE. Graded still on a drawn aqueduct against the evening sky. The kernel: Sobel of luma, blurred by three box passes that
   together reach Radius 20 px of a 1080 frame, times Amount 3.4 times the plate scale, screened over the picture in keyframe yellow.
   Amount is keyed up and down; Flicker 40 % (Pattern 3) rolls the kernel's own hash 24 times a second. */
{ id:'edgeglow', name:'Neon Outline', section:'Drawing / Edge', isNew:true, still:2.13,
  line:'A soft coloured glow is laid along every edge in the picture, and can buzz like a neon tube.',
  make(px){
    const P=4.8, R=Math.max(100,Math.min(360,Math.round(px))), ps=R/1080, AMT=3.4, RAD=20, COL=[255,206,74], FLK=.4, SEED=3;
    const [SRC,sx]=sheet(R); sx.setTransform(R/100,0,0,R/100,0,0); paintArcade(sx);
    const d=sx.getImageData(0,0,R,R).data, n=R*R, FL=new Float32Array(n), EM=new Float32Array(n);
    for(let i=0;i<n;i++){ const p=i*4; FL[i]=.299*d[p]+.587*d[p+1]+.114*d[p+2]; }
    for(let y=0;y<R;y++){ const r0=(y>0?y-1:0)*R, r1=y*R, r2=(y<R-1?y+1:R-1)*R;
      for(let x=0;x<R;x++){ const xm=x>0?x-1:0, xp=x<R-1?x+1:R-1;
        const gx=(FL[r0+xp]+2*FL[r1+xp]+FL[r2+xp])-(FL[r0+xm]+2*FL[r1+xm]+FL[r2+xm]), gy=(FL[r2+xm]+2*FL[r2+x]+FL[r2+xp])-(FL[r0+xm]+2*FL[r0+x]+FL[r0+xp]);
        EM[r1+x]=Math.sqrt(gx*gx+gy*gy); } }
    const rad=Math.max(1,Math.round(RAD*ps)), base=Math.floor(rad/3), rem=rad-base*3, RP=[0,1,2].map(i=>Math.max(1,base+(i<rem?1:0)));
    for(const r of RP){ const div=r*2+1;
      for(let y=0;y<R;y++){ const row=y*R; let acc=0; for(let k=-r;k<=r;k++) acc+=EM[row+clamp(k,0,R-1)];
        for(let x=0;x<R;x++){ FL[row+x]=acc/div; acc+=EM[row+Math.min(R-1,x+r+1)]-EM[row+Math.max(0,x-r)]; } }
      for(let x=0;x<R;x++){ let acc=0; for(let k=-r;k<=r;k++) acc+=FL[clamp(k,0,R-1)*R+x];
        for(let y=0;y<R;y++){ EM[y*R+x]=acc/div; acc+=FL[Math.min(R-1,y+r+1)*R+x]-FL[Math.max(0,y-r)*R+x]; } } }
    const [GLW,gx2]=sheet(R), gi=gx2.createImageData(R,R), go=gi.data;
    for(let i=0;i<n;i++){ const p=i*4, g=EM[i]/255*AMT*ps; for(let ch=0;ch<3;ch++){ const a=Math.min(255,COL[ch]*g); go[p+ch]=255-(255-d[p+ch])*(255-a)/255; } go[p+3]=255; }
    gx2.putImageData(gi,0,0);
    return (c,t)=>{
      const u=mod(t,P); raw(c); c.drawImage(SRC,0,0,px,px);
      let a=0; if(u>=.6&&u<1.1) a=E.out(seg(u,.6,1.1)); else if(u>=1.1&&u<4.0) a=1; else if(u>=4.0&&u<4.4) a=1-E.inOut(seg(u,4.0,4.4));
      if(a<=0) return;
      const fi=Math.floor(u*24), b=fi*3+SEED*7919, fl=llHash(b)<.25?1-FLK*(.6+.4*llHash(b+1)):1-FLK*(llHash(b+2)/6);
      c.globalAlpha=clamp(a*fl); c.drawImage(GLW,0,0,px,px); c.globalAlpha=1;
    };
  } },

/* EMBOSS. Graded still on a drawn brass key. The kernel's relief, weights dx*Lx + dy*Ly with L turned by Light angle, Output: Grey
   (the kernel once over luma; Colour, the default, puts saturated fringes on brass against slate), Depth 1, Height 8 px of a 1080
   frame. The light is keyed once round the dial in 15-degree steps. The tab is the app's control, not part of the picture. */
{ id:'emboss', name:'Emboss', section:'Drawing / Edge', isNew:true, still:1.2,
  line:'The picture turns into a grey relief, its edges raised and lit from the angle you choose.',
  make(px){
    const P=5, R=Math.max(100,Math.min(360,Math.round(px))), ps=R/1080, HT=8, EMr=Math.max(1,HT*ps), K=1;
    const [SRC,sx]=sheet(R); sx.setTransform(R/100,0,0,R/100,0,0); paintKey(sx);
    const s=sx.getImageData(0,0,R,R).data, n=R*R, LU=new Float32Array(n), GX=new Float32Array(n), GY=new Float32Array(n);
    for(let i=0;i<n;i++){ const p=i*4; LU[i]=s[p]*.299+s[p+1]*.587+s[p+2]*.114; }
    /* Output: Grey runs the kernel once over luma; the eight taps EMr plate px out, read between pixels with the plate's edge held (at12) */
    const at=(fx,fy)=>{ fx=fx<0?0:(fx>R-1?R-1:fx); fy=fy<0?0:(fy>R-1?R-1:fy); const x0=Math.floor(fx), y0=Math.floor(fy), x1=x0<R-1?x0+1:x0, y1=y0<R-1?y0+1:y0, tx=fx-x0, ty=fy-y0;
      return (LU[y0*R+x0]*(1-tx)+LU[y0*R+x1]*tx)*(1-ty)+(LU[y1*R+x0]*(1-tx)+LU[y1*R+x1]*tx)*ty; };
    for(let y=0;y<R;y++) for(let x=0;x<R;x++){ let gx=0, gy=0;
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue; const v=at(x+dx*EMr,y+dy*EMr); gx+=dx*v; gy+=dy*v; }
      GX[y*R+x]=gx; GY[y*R+x]=gy; }
    const [OUT,ox]=sheet(R), oi=ox.createImageData(R,R), o32=new Uint32Array(oi.data.buffer), GREY=new Uint32Array(256); let lastA=null;
    for(let v=0;v<256;v++) GREY[v]=new Uint32Array(new Uint8Array([v,v,v,255]).buffer)[0];
    const relief=ang=>{ if(ang===lastA) return; lastA=ang; const th=(ang-90)*Math.PI/180, Lx=Math.SQRT2*Math.cos(th)*K, Ly=Math.SQRT2*Math.sin(th)*K;
      for(let i=0;i<n;i++){ let v=Math.round(128+Lx*GX[i]+Ly*GY[i]); o32[i]=GREY[v<0?0:v>255?255:v]; }
      ox.putImageData(oi,0,0); };
    return (c,t)=>{
      const u=mod(t,P); raw(c);
      if(u<.6||u>=4.4){ c.drawImage(SRC,0,0,px,px); return; }
      let ang=135; if(u>=1.5&&u<3.5) ang=(135+15*Math.floor(seg(u,1.5,3.5)*24))%360;
      relief(ang); c.drawImage(OUT,0,0,px,px);
      reset(c,px);
      c.fillStyle=NAVY; c.beginPath(); c.roundRect(72.5,84,24.5,12.5,1.2); c.fill();
      const th=(ang-90)*Math.PI/180, DX=79, DY=90.25, DR=3.6;
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.arc(DX,DY,DR,0,TAU); c.stroke();
      c.fillStyle=YEL; c.beginPath(); c.arc(DX-Math.cos(th)*DR,DY-Math.sin(th)*DR,1.25,0,TAU); c.fill();
      c.font=MONO(5.6); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='middle'; c.fillText(String(ang).padStart(3,'0')+'°',84.2,90.6);
    };
  } },

/* LIGHT SWEEP. A product shot: a cut-out pen layer over a desk layer. The kernel's band, a Gaussian of Width 60 px of a 1080 frame
   (sigma 30 px), screened in white at Strength 1, only where the layer has alpha. Sweeps: Angle -25, Sweeps across: Layer, Speed 1.2,
   Wait between sweeps 1.6 s: wait, then one sweep across the layer's box from 3.6 sigma before it to 3.6 sigma past it. */
{ id:'glowscan', name:'Light Sweep', section:'Drawing / Edge', isNew:true, still:2.0,
  line:'A band of light runs across the layer, here a pen, lighting only the layer itself, then waits and comes round again.',
  make(px){
    const SPD=1.2, WAIT=1.6, P=WAIT+1/SPD, SIG=30/10.8, A=-25*Math.PI/180, ux=Math.cos(A), uy=Math.sin(A), MG=3.6*SIG;
    const [WT,wx]=sheet(px); wx.setTransform(px/100,0,0,px/100,0,0); paintPen(wx);
    const [DSK,dx]=sheet(px); dx.setTransform(px/100,0,0,px/100,0,0); paintDesk(dx);
    /* Sweeps across: Layer is the box of every pixel the layer covers on the frame, read here once */
    const al=wx.getImageData(0,0,px,px).data; let x0=px, y0=px, x1=-1, y1=-1;
    for(let y=0;y<px;y++) for(let x=0;x<px;x++) if(al[(y*px+x)*4+3]>0){ if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; if(y>y1) y1=y; }
    const BX0=x0*100/px, BX1=(x1+1)*100/px, BY0=y0*100/px, BY1=(y1+1)*100/px;
    const pr=[[BX0,BY0],[BX1,BY0],[BX0,BY1],[BX1,BY1]].map(p=>p[0]*ux+p[1]*uy), S0=Math.min(...pr), S1=Math.max(...pr), LB=S1-S0;
    const [OV,ov]=sheet(px);
    return (c,t)=>{
      const u=mod(t,P); raw(c); c.drawImage(DSK,0,0); c.drawImage(WT,0,0);
      if(u<WAIT) return;
      const k=Math.min(1,(u-WAIT)*SPD), mid=S0-MG+k*(LB+2*MG);
      ov.setTransform(1,0,0,1,0,0); ov.globalCompositeOperation='source-over'; ov.globalAlpha=1; ov.clearRect(0,0,px,px); ov.drawImage(WT,0,0);
      ov.globalCompositeOperation='source-in'; ov.setTransform(px/100,0,0,px/100,0,0);
      const gr=ov.createLinearGradient(ux*(mid-MG),uy*(mid-MG),ux*(mid+MG),uy*(mid+MG));
      for(let i=0;i<=18;i++){ const dd=(i/18*2-1)*MG; gr.addColorStop(i/18,'rgba(255,255,255,'+Math.exp(-dd*dd/(2*SIG*SIG)).toFixed(4)+')'); }
      ov.fillStyle=gr; ov.fillRect(0,0,100,100); ov.globalCompositeOperation='source-over';
      raw(c); c.globalCompositeOperation='screen'; c.drawImage(OV,0,0); c.globalCompositeOperation='source-over';
    };
  } },

/* ENGRAVING. Two-ink print: a drawn alpine peak through the kernel's line screen, Line pitch 26 px of a 1080 frame, Ink weight 1,
   Ink #1f7f70 on Paper Bone (its colour controls). Each line is inked as thick as the picture is dark, (1 - luma) x pitch, drawn the
   way the kernel draws a reduced plate: export pixels averaged into each plate pixel. Screen angle is keyed from 0 to 45 on twos.
   (Checker k2: the subject was a nautilus shell, which Gradient Map already uses; it is now a mountain no other tile has.) */
{ id:'halftonelines', name:'Engraving', section:'Drawing / Edge', isNew:true, still:3.2,
  line:'The picture is redrawn as parallel lines that swell where it is dark and thin out where it is light, like an old engraved plate.',
  make(px){
    const P=4.8, R=Math.max(100,Math.min(400,Math.round(px))), ps=R/1080, S0=26, KK=Math.min(4,Math.ceil(1/ps)), inv=1/ps, KN=KK*KK;
    const INKC=[0x1f,0x7f,0x70], PAP=[0xe7,0xe2,0xd5];
    const [SRC,sx]=sheet(R); sx.setTransform(R/100,0,0,R/100,0,0); paintPeak(sx);
    const s=sx.getImageData(0,0,R,R).data, n=R*R, T0=new Float32Array(n);
    for(let i=0;i<n;i++){ const p=i*4; T0[i]=(1-clamp((.299*s[p]+.587*s[p+1]+.114*s[p+2])/255))*S0; }
    const ANG=[0,7.5,15,22.5,30,37.5,45], cache=[];
    const plate=ai=>{ if(cache[ai]) return cache[ai]; const a=ANG[ai]*Math.PI/180, cs=Math.cos(a), sn=Math.sin(a), rot=ai>0;
      const [C,x]=sheet(R), im=x.createImageData(R,R), o=im.data;
      for(let py=0;py<R;py++) for(let pxx=0;pxx<R;pxx++){ const i=py*R+pxx, th=T0[i]; let acc=0;
        for(let sy=0;sy<KK;sy++){ const EY=Math.floor((py+(sy+.5)/KK)*inv);
          for(let sxx=0;sxx<KK;sxx++){ let m; if(rot){ const EX=Math.floor((pxx+(sxx+.5)/KK)*inv); m=(-EX*sn+EY*cs)%S0; if(m<0) m+=S0; } else m=EY%S0; if(m>=th) acc+=255; } }
        const f=Math.round(acc/KN)/255, p=i*4; o[p]=INKC[0]+(PAP[0]-INKC[0])*f; o[p+1]=INKC[1]+(PAP[1]-INKC[1])*f; o[p+2]=INKC[2]+(PAP[2]-INKC[2])*f; o[p+3]=255; }
      x.putImageData(im,0,0); return cache[ai]=C; };
    for(let i=0;i<ANG.length;i++) plate(i);
    return (c,t)=>{
      const u=mod(t,P); raw(c);
      if(u<.6||u>=4.2){ c.drawImage(SRC,0,0,px,px); return; }
      const ai=u<2.2?0:u<2.7?Math.min(6,1+Math.floor((u-2.2)*12)):6;
      c.drawImage(plate(ai),0,0,px,px);
    };
  } }

);
})();
