/* probe-cube.js: the REAL Cube (cube3d) with a layer per face, for the Cube tile (#1246 U11). Loaded by truth.html with
   &extra=probe-cube.js. Builds real multi-layer scenes through window.__h: the hero layer carries the Cube, and each face
   layer is its own image layer, hidden by its eye (as the builder's own test does), picked in that face's picker.
   Nothing here writes to the repo; sheets go to shots/ through __h.save. */
(function(){
'use strict';
const H=window.__h;
let seq=0;
const FACE_KEYS=['faceback','faceright','faceleft','facetop','facebottom'];
const elOf=v=>(typeof v==='string')?H.photoEl(v):v;
/* o: {P, bg, hero (photo key or canvas), heroSize, faces:{faceback:key|canvas,...}, params:{...}, D}; returns {scene, plain} */
function cubeScene(o){
  const P=o.P||1080, C=P/2, D=o.D||12, tag='_cube'+(++seq)+'_';
  const hero=H.imageLayer(tag+'hero',elOf(o.hero),o.heroSize||P,C,C,D);
  const layers=[hero];
  const inst=FM.fxRegistry.makeInstance('cube3d');
  const known=new Set(FM.fxRegistry.get('cube3d').params.map(p=>p.key)), warn=[];
  for(const k of Object.keys(o.params||{})){ if(!known.has(k)) warn.push(k+' is not a cube3d param'); inst.params[k]=o.params[k]; }
  for(const k of FACE_KEYS){
    const v=o.faces&&o.faces[k]; if(!v) continue;
    const L=H.imageLayer(tag+k,elOf(v),o.faceSize||P,C,C,D);
    L.visible=false;   /* hidden by its eye: it shows only on the cube */
    layers.push(L); inst.params[k]=L.id;
  }
  hero.effects=[inst];
  const project={width:P,height:P,fps:30,duration:D,background:o.bg||'#151a24'};
  const scene={project,layers};
  const plain={project,layers:[Object.assign({},hero,{effects:[]})]};
  return {scene,plain,warn,inst};
}
/* rows: [{label, hero, faces, params, bg}] -> one row per entry, one 180 px cell per t, rendered by whichever renderer the page loaded */
async function rows(list,ts,name,opts){
  opts=opts||{};
  ts=(ts&&ts.length)?ts:[0.5,1.5,2.5];
  const px=opts.px||360, C=180, G=10, L=24;
  const W=G+ts.length*(C+G), Hh=G+list.length*(L+C+G);
  const sh=document.createElement('canvas'); sh.width=Math.max(W,560); sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,Hh); x.imageSmoothingQuality='high';
  const [work,wg]=H.surface(px), errors=[], timing=[];
  for(let r=0;r<list.length;r++){
    const row=list[r], y0=G+r*(L+C+G);
    let sc=null;
    try{ sc=cubeScene(row); sc.warn.forEach(w=>errors.push(w)); H.paintReal(wg,sc.scene,0); }catch(e){ errors.push((row.label||r)+': '+e.message); }
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText(row.label||('row '+r),G,y0+16);
    for(let k=0;k<ts.length;k++){
      const xa=G+k*(C+G), y=y0+L, t=ts[k];
      if(sc){ try{ const t0=performance.now(); H.paintReal(wg,sc.scene,t); timing.push(performance.now()-t0); x.drawImage(work,xa,y,C,C); }catch(e){ errors.push(t+': '+e.message); H.badCell(x,xa,y,C,e.message); } }
      else H.badCell(x,xa,y,C,'no render');
      H.caption(x,'t='+t,xa+3,y+C-3);
    }
    await H.yieldNow();
  }
  const ms=timing.length?timing.reduce((a,b)=>a+b,0)/timing.length:0;
  return {saved:await H.save(sh,name||'r5-cube-rows'),errors,msPerFrame:+ms.toFixed(2)};
}
/* time one real frame (ms), n times, at px */
async function timeIt(row,t,n,px){
  const sc=cubeScene(row); const [c,g]=H.surface(px||1080); H.paintReal(g,sc.scene,0);
  const out=[]; for(let i=0;i<(n||10);i++){ const t0=performance.now(); H.paintReal(g,sc.scene,t+i*0.033); out.push(performance.now()-t0); }
  out.sort((a,b)=>a-b); return {median:+out[Math.floor(out.length/2)].toFixed(2),min:+out[0].toFixed(2),max:+out[out.length-1].toFixed(2)};
}
/* OUR TILE beside the REAL Cube built from the tile's own six face pictures (T.faceArt) and its own keyframed params (T.cubeParams).
   change: mean difference from the plain hero layer (0..255), ours and real against the same plain; vsReal: ours against real. */
async function truth(ts,name,opts){
  opts=opts||{};
  const T=(window.FX_TILES||[]).filter(t=>t.id==='cube').pop();
  if(!T||!T.faceArt||!T.cubeParams) throw new Error('the cube tile has no faceArt / cubeParams');
  ts=(ts&&ts.length)?ts:[0.6,1.4,2.4];
  const px=opts.px||360, C=180, P2=4, GG=16, M=10, L=24;
  const art=T.faceArt(T.TEX), P=opts.project||1080;
  const row={hero:art.front,faces:{faceback:art.back,faceright:art.right,faceleft:art.left,facetop:art.top,facebottom:art.bottom},params:T.cubeParams,bg:T.cubeBg||'#161c28',P};
  const sc=cubeScene(row);
  const W=M*2+ts.length*(C*2+P2)+(ts.length-1)*GG, Hh=M+L+C+M+40;
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Hh); x.imageSmoothingQuality='high';
  const [work,wg]=H.surface(px), [tc,tg]=H.surface(px);
  H.paintReal(wg,sc.plain,0); const plainPx=H.pixels(wg).slice();
  H.paintReal(wg,sc.scene,0);
  const draw=T.make(px), res=[];
  x.fillStyle='#eef1f7'; x.font='600 14px system-ui, sans-serif';
  x.fillText('Cube (cube = cube3d)  ours beside the REAL effect ['+(H.base==='/ss/'?'effects branch':'main')+'], six layers, one per face',M,M+16);
  for(let k=0;k<ts.length;k++){
    const t=ts[k], xa=M+k*(C*2+P2+GG), xb=xa+C+P2, y=M+L;
    tg.setTransform(1,0,0,1,0,0); tg.clearRect(0,0,px,px); draw(tg,t); x.drawImage(tc,xa,y,C,C); const ours=H.pixels(tg).slice();
    H.paintReal(wg,sc.scene,t); x.drawImage(work,xb,y,C,C); const real=H.pixels(wg).slice();
    const a=H.diff(ours,plainPx), b=H.diff(real,plainPx), d=H.diff(ours,real);
    res.push({t,ours:a.mean,real:b.mean,vsReal:d.mean,vsRealShare:+d.share.toFixed(3)});
    H.caption(x,'ours t='+t,xa+3,y+C-3); H.caption(x,'REAL t='+t,xb+3,y+C-3);
    x.fillStyle='#9aa3b5'; x.font='12px ui-monospace, monospace';
    x.fillText('change ours '+a.mean.toFixed(1)+' / real '+b.mean.toFixed(1)+'  ours-real '+d.mean.toFixed(1),xa,y+C+16);
  }
  return {saved:await H.save(sh,name||'r5-cube-truth'),rows:res,warn:sc.warn};
}
/* A CULLED reference: renderMesh's geometry, rotation order, projection, shading and affine mapping, but drawing only the
   triangles that face the viewer. Where the real render differs from this, the real one drew a hidden face over a seen one. */
const MESH=(()=>{ const w=.72, sub=3, V=[], T=[];
  const face=(ox,oy,oz,ux,uy,uz,vx,vy,vz)=>{ const b=V.length; for(let j=0;j<=sub;j++) for(let i=0;i<=sub;i++){ const fu=i/sub, fv=j/sub; V.push([ox+ux*fu+vx*fv,oy+uy*fu+vy*fv,oz+uz*fu+vz*fv,fu,fv]); } for(let j=0;j<sub;j++) for(let i=0;i<sub;i++){ const k=b+j*(sub+1)+i; T.push([k,k+1,k+sub+2],[k,k+sub+2,k+sub+1]); } };
  face(-w,-w,w,2*w,0,0,0,2*w,0); face(w,-w,-w,-2*w,0,0,0,2*w,0); face(w,-w,w,0,0,-2*w,0,2*w,0); face(-w,-w,-w,0,0,2*w,0,2*w,0); face(-w,-w,-w,2*w,0,0,0,0,2*w); face(-w,w,w,2*w,0,0,0,0,-2*w);
  return {V,T}; })();
function solidFof(v){ v=Math.max(0,Math.min(100,v)); if(v===50) return 3.2; if(v<=0) return Infinity; return 1/(v<50?(v/50)/3.2:1/3.2+(v-50)/50*(1/2-1/3.2)); }
function refDraw(g,px,o,tex){   /* o: {rx,ry,rz (deg), size (%), shading, persp, light}, tex: 6 canvases (front, back, right, left, top, bottom) */
  const rx=o.rx*Math.PI/180, ry=o.ry*Math.PI/180, rz=(o.rz||0)*Math.PI/180, cX=Math.cos(rx), sX=Math.sin(rx), cY=Math.cos(ry), sY=Math.sin(ry), cZ=Math.cos(rz), sZ=Math.sin(rz);
  const F=solidFof(o.persp==null?50:o.persp), R=px/2*(o.size==null?70:o.size)/100, cx=px/2, cy=px/2, sh=o.shading==null?.6:o.shading;
  let Lx=.42, Ly=-.55; const Lz=.72; if(o.light!=null&&o.light!==53){ const lm=Math.hypot(.42,.55), la=o.light*Math.PI/180; Lx=lm*Math.cos(la); Ly=-lm*Math.sin(la); }
  const n=MESH.V.length, P=[], X3=[], Y3=[], Z3=[];
  for(let i=0;i<n;i++){ const v=MESH.V[i]; let x=v[0],y=v[1],z=v[2],w; w=y*cX-z*sX; z=y*sX+z*cX; y=w; w=x*cY+z*sY; z=-x*sY+z*cY; x=w; w=x*cZ-y*sZ; y=x*sZ+y*cZ; x=w; X3.push(x); Y3.push(y); Z3.push(z); const f=F===Infinity?1:F/Math.max(.2,F-z); P.push([cx+x*f*R,cy+y*f*R]); }
  for(let k=0;k<MESH.T.length;k++){
    const tr=MESH.T[k], a=P[tr[0]], b=P[tr[1]], c=P[tr[2]];
    if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<=0) continue;   /* facing away: not drawn */
    const T=tex[Math.floor(k/18)], TW=T.width, TH=T.height;
    const gx=(a[0]+b[0]+c[0])/3, gy=(a[1]+b[1]+c[1])/3, pts=[a,b,c].map(p=>{ const dx=p[0]-gx, dy=p[1]-gy, l=Math.hypot(dx,dy)||1; return [p[0]+dx/l*.4,p[1]+dy/l*.4]; });
    const va=MESH.V[tr[0]], vb=MESH.V[tr[1]], vc=MESH.V[tr[2]], u0=va[3]*TW, v0=va[4]*TH, u1=vb[3]*TW, v1=vb[4]*TH, u2=vc[3]*TW, v2=vc[4]*TH;
    const den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1); if(Math.abs(den)<1e-6) continue;
    const x0=pts[0][0],y0=pts[0][1],x1=pts[1][0],y1=pts[1][1],x2=pts[2][0],y2=pts[2][1];
    const ma=(x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/den, mb=(y0*(v1-v2)+y1*(v2-v0)+y2*(v0-v1))/den, mc=(x0*(u2-u1)+x1*(u0-u2)+x2*(u1-u0))/den, md=(y0*(u2-u1)+y1*(u0-u2)+y2*(u1-u0))/den, me=x0-ma*u0-mc*v0, mf=y0-mb*u0-md*v0;
    const e1x=X3[tr[1]]-X3[tr[0]], e1y=Y3[tr[1]]-Y3[tr[0]], e1z=Z3[tr[1]]-Z3[tr[0]], e2x=X3[tr[2]]-X3[tr[0]], e2y=Y3[tr[2]]-Y3[tr[0]], e2z=Z3[tr[2]]-Z3[tr[0]];
    let nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x; const nl=Math.hypot(nx,ny,nz)||1;
    const lam=Math.abs((nx*Lx+ny*Ly+nz*Lz)/nl), shade=(1-sh)+sh*(.25+.75*lam);
    g.save(); g.beginPath(); g.moveTo(pts[0][0],pts[0][1]); g.lineTo(pts[1][0],pts[1][1]); g.lineTo(pts[2][0],pts[2][1]); g.closePath(); g.clip();
    g.transform(ma,mb,mc,md,me,mf); g.drawImage(T,0,0); if(shade<.999){ g.fillStyle='rgba(0,0,0,'+(1-shade).toFixed(4)+')'; g.fillRect(0,0,TW,TH); } g.restore();
  }
}
/* The real render against the culled reference over a sweep of angles: where they differ, a hidden face showed through. */
async function sweep(list,name,opts){
  opts=opts||{}; const px=opts.px||360, C=150, G=6, L=16;
  const faces=opts.faces, texOf=v=>(typeof v==='string')?H.photoEl(v):v;
  const tex=[texOf(opts.hero),texOf(faces.faceback),texOf(faces.faceright),texOf(faces.faceleft),texOf(faces.facetop),texOf(faces.facebottom)];
  const cols=opts.cols||8, rowsN=Math.ceil(list.length/cols);
  const sh=document.createElement('canvas'); sh.width=G+cols*(C*2+G*3); sh.height=G+rowsN*(C+L+G); const x=sh.getContext('2d'); x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,sh.height);
  const [w,wg]=H.surface(px), [r,rg]=H.surface(px), out=[];
  for(let i=0;i<list.length;i++){
    const o=list[i], params={rotx:o.rx,roty:o.ry,rotz:o.rz||0,size:o.size==null?70:o.size,shading:o.shading==null?.6:o.shading,persp:o.persp==null?50:o.persp};
    const sc=cubeScene({hero:opts.hero,faces,params,bg:opts.bg||'#161c28'}); H.paintReal(wg,sc.scene,0);
    rg.setTransform(1,0,0,1,0,0); rg.fillStyle=opts.bg||'#161c28'; rg.fillRect(0,0,px,px); refDraw(rg,px,o,tex);
    const a=H.pixels(wg), b=H.pixels(rg), N=px*px, D=new Uint8Array(N); let bad=0, sum=0;
    for(let k=0,q=0;k<a.length;k+=4,q++){ const d=Math.abs(a[k]-b[k])+Math.abs(a[k+1]-b[k+1])+Math.abs(a[k+2]-b[k+2]); sum+=d; if(d>90){ bad++; D[q]=1; } }
    /* blob: a differing pixel with at least 7 of its 8 neighbours differing too - a filled patch (a hidden face drawn over a seen one), not an anti-aliased edge */
    let blob=0; for(let y=1;y<px-1;y++) for(let xx=1;xx<px-1;xx++){ const q=y*px+xx; if(!D[q]) continue; const s=D[q-1]+D[q+1]+D[q-px]+D[q+px]+D[q-px-1]+D[q-px+1]+D[q+px-1]+D[q+px+1]; if(s>=7) blob++; }
    const res={rx:o.rx,ry:o.ry,persp:params.persp,mean:+(sum/(a.length/4*3)).toFixed(2),badPx:bad,blob}; out.push(res);
    const cx=G+(i%cols)*(C*2+G*3), cy=G+Math.floor(i/cols)*(C+L+G);
    x.fillStyle=blob>20?'#ff8a8a':'#eef1f7'; x.font='11px ui-monospace, monospace'; x.fillText('rx'+o.rx+' ry'+o.ry+' bad '+bad+' blob '+blob,cx,cy+11);
    x.drawImage(w,cx,cy+L,C,C); x.drawImage(r,cx+C+G,cy+L,C,C);
    if(i%8===7) await H.yieldNow();
  }
  return {saved:await H.save(sh,name||'r5-cube-sweep'),rows:out};
}
/* the tile's six face layers side by side, labelled, to judge the pictures themselves */
async function facesSheet(name,size){
  const T=(window.FX_TILES||[]).filter(t=>t.id==='cube').pop(), art=T.faceArt(T.TEX), C=size||256, G=8, L=18, ks=['front','left','back','right','top','bottom'];
  const sh=document.createElement('canvas'); sh.width=G+3*(C+G); sh.height=G+2*(C+L+G); const x=sh.getContext('2d'); x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,sh.height); x.imageSmoothingQuality='high';
  ks.forEach((k,i)=>{ const cx=G+(i%3)*(C+G), cy=G+Math.floor(i/3)*(C+L+G); x.fillStyle='#eef1f7'; x.font='600 13px system-ui'; x.fillText(k,cx,cy+13); x.drawImage(art[k],cx,cy+L,C,C); });
  return await H.save(sh,name||'r5-cube-faces');
}
window.__cube={scene:cubeScene,rows,timeIt,truth,sweep,refDraw,solidFof,facesSheet,FACE_KEYS};
})();
