/* probe-moshbloom.js (round 5, #1250). Datamosh Bloom only exists in motion and BUILDS FRAME BY FRAME: any jump of more than
   0.35 s shows the plain clip again. So __truth (which samples a few far-apart t) cannot show it. This plays a layer whose picture
   is repainted every 30th of a second (shot 1, then at the cut shot 2 moving), IN ORDER from 0, through the REAL compositor
   (FM.renderScene via __h.paintReal), and keeps the frames asked for. Load: truth.html?app=/ss/&extra=probe-moshbloom.js */
(function(){
'use strict';
const H=window.__h;
const FPS=30;
let seq=0;

/* a photo drawn cover-fit through a camera: zoom s about the frame centre, pan dx/dy (fractions of the frame), roll r (radians) */
function photoCam(key,cam){
  return (g,t,S)=>{
    const im=FXK.photo(key); const c=cam(t)||{};
    g.setTransform(1,0,0,1,0,0); g.globalAlpha=1; g.fillStyle='#000'; g.fillRect(0,0,S,S);
    g.save(); g.translate(S/2+(c.dx||0)*S,S/2+(c.dy||0)*S); if(c.r) g.rotate(c.r); const s=c.s||1; g.scale(s,s);
    const w=im.naturalWidth, h=im.naturalHeight, k=Math.max(S/w,S/h);
    g.imageSmoothingQuality='high'; g.drawImage(im,-w*k/2,-h*k/2,w*k,h*k); g.restore();
  };
}
/* shot a until the cut, then shot b (b's clock starts at the cut) */
function cutClip(a,b,cut){ return (g,t,S)=>(t<cut-1e-6?a(g,t,S):b(g,t-cut,S)); }
/* several cuts: list of [startTime, painter] */
function seqClip(list){ return (g,t,S)=>{ let k=0; for(let i=0;i<list.length;i++) if(t>=list[i][0]-1e-6) k=i; return list[k][1](g,t-list[k][0],S); }; }

/* Play `clip` (a painter (g,t,S)) as an image layer filling a P x P project, Datamosh Bloom on it with `params`, rendered at
   `px`, every frame from 0 to max(ts) in order. Returns {frames:{t:canvas}, plain:{t:canvas}, ms: mean ms per frame}. */
async function play(clip,params,ts,o){
  o=o||{};
  /* a square project by default; o.project [w,h] and o.plate [w,h] for a frame of another shape (the clip canvas is the plate's size) */
  const P=o.project?(Array.isArray(o.project)?o.project[0]:o.project):1080, Ph=Array.isArray(o.project)?o.project[1]:P;
  const px=o.plate?o.plate[0]:(o.px||360), pxh=o.plate?o.plate[1]:px, tMax=Math.max(...ts);
  const S=o.clipPx||px, Sh=o.plate?pxh:S;
  const N=Math.round(tMax*FPS);
  const clipCv=document.createElement('canvas'); clipCv.width=S; clipCv.height=Sh; const cg=clipCv.getContext('2d');
  const id='_mb'+(++seq)+'_h';
  const D=tMax+2;
  FM.media.set(id,{kind:'image',el:clipCv,width:P,height:Ph,duration:0}); FM.media.pin(id);
  const hero=FM.makeLayer('image',{x:P/2,y:Ph/2,start:0,duration:D}); hero.id=id;
  const inst=FM.fxRegistry.makeInstance('moshbloom'); const known=new Set(FM.fxRegistry.get('moshbloom').params.map(p=>p.key)); const warn=[];
  for(const k of Object.keys(params||{})){ if(!known.has(k)){ warn.push(k+' is not a param here'); continue; } inst.params[k]=params[k]; }
  hero.effects=o.noFx?[]:[inst];
  const scene={project:{width:P,height:Ph,fps:FPS,duration:D,background:'#151a24'},layers:[hero]};
  const work=document.createElement('canvas'); work.width=px; work.height=pxh; const wg=work.getContext('2d',{willReadFrequently:true});
  const want=new Map(ts.map(t=>[Math.round(t*FPS),t]));
  const grab=()=>{ const c=document.createElement('canvas'); c.width=px; c.height=pxh; c.getContext('2d').drawImage(work,0,0); return c; };
  const frames={}; let ms=0, nms=0; const errors=[];
  for(let f=0;f<=N;f++){
    const t=f/FPS;
    cg.setTransform(1,0,0,1,0,0); cg.clearRect(0,0,S,Sh); clip(cg,t,S,Sh);
    const t0=performance.now();
    try{ H.paintReal(wg,scene,t); }catch(e){ errors.push(t.toFixed(3)+': '+e.message); }
    const dt=performance.now()-t0; if(f>4){ ms+=dt; nms++; }
    if(want.has(f)) frames[want.get(f)]=grab();
    if(f%6===5) await H.yieldNow();
  }
  /* the plain clip at the same instants, with no effect (for the change numbers) */
  const plain={};
  const pscene={project:scene.project,layers:[Object.assign({},hero,{effects:[]})]};
  for(const t of ts){ const tf=Math.round(t*FPS)/FPS; cg.setTransform(1,0,0,1,0,0); cg.clearRect(0,0,S,Sh); clip(cg,tf,S,Sh); H.paintReal(wg,pscene,tf); plain[t]=grab(); }
  return {frames,plain,ms:nms?ms/nms:0,warn,errors,hero,scene};
}
const pxOf=c=>c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
/* mean change (0..255 per channel) and the share of pixels moved by more than 16 */
function change(a,b){ return H.diff(pxOf(a),pxOf(b)); }

/* rows: [{label, params, clip, o}] ; one row per param set, one cell per t (180 px), the plain clip as a first row if asked */
async function sheet(rows,ts,name,opt){
  opt=opt||{};
  const MINI=opt.mini?77:0;
  const C=opt.cell||180, G=10, L=24, W=G+ts.length*(C+G)+(MINI?ts.length*(MINI+4)+G:0), Hh=G+rows.length*(L+C+G);
  const sh=document.createElement('canvas'); sh.width=Math.max(W,560); sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,Hh); x.imageSmoothingQuality='high';
  const out=[];
  for(let r=0;r<rows.length;r++){
    const R=rows[r], y0=G+r*(L+C+G);
    const res=await play(R.clip,R.params||{},ts,R.o);
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText(R.label+'   ['+res.ms.toFixed(1)+' ms/frame]',G,y0+16);
    const ch=[];
    ts.forEach((t,k)=>{ const xa=G+k*(C+G), y=y0+L; const fr=(R.o&&R.o.noFx)?res.plain[t]:res.frames[t]; if(fr) x.drawImage(fr,xa,y,C,C); const d=change(res.frames[t],res.plain[t]); ch.push(d.mean); H.caption(x,'t='+t+(R.o&&R.o.noFx?'':'  d='+d.mean.toFixed(1)),xa+3,y+C-3);
      if(MINI&&fr){ const xm=G+ts.length*(C+G)+k*(MINI+4); x.drawImage(fr,xm,y,MINI,MINI); } });
    out.push({label:R.label,ms:+res.ms.toFixed(2),change:ch,warn:res.warn,errors:res.errors});
    await H.yieldNow();
  }
  return {saved:await H.save(sh,name),rows:out};
}

/* how a cut reads to the effect: _mfField's df, averaged over its blocks (the kernel calls it a cut above 0.2) */
function cutScore(paintA,paintB,S){
  S=S||360; const FW=160, FH=160, BS=8;
  const grey=paint=>{ const c=document.createElement('canvas'); c.width=c.height=S; paint(c.getContext('2d'),0,S); const s=document.createElement('canvas'); s.width=FW; s.height=FH; const g=s.getContext('2d',{willReadFrequently:true}); g.drawImage(c,0,0,FW,FH); const d=g.getImageData(0,0,FW,FH).data, o=new Float32Array(FW*FH); for(let i=0,j=0;j<o.length;i+=4,j++) o[j]=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])*(d[i+3]/255); return o; };
  const a=grey(paintA), b=grey(paintB); const gw=FW/BS, gh=FH/BS; let sum=0;
  for(let by=0;by<gh;by++) for(let bx=0;bx<gw;bx++){ let s=0; for(let y=0;y<BS;y++) for(let x=0;x<BS;x++){ const i=(by*BS+y)*FW+bx*BS+x; s+=Math.abs(a[i]-b[i]); } sum+=s/(255*BS*BS); }
  return sum/(gw*gh);
}

/* a photo card (a fraction `k` of the frame) orbiting on a TRANSPARENT layer, as the harness's Orbit leaves it */
function cardOrbit(key,k,rad,speed){
  return (g,t,S)=>{
    const im=FXK.photo(key); g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,S,S);
    const a=t*speed*Math.PI*2, cx=S/2+Math.cos(a)*rad*S, cy=S/2+Math.sin(a)*rad*S, w=S*k;
    g.imageSmoothingQuality='high'; g.drawImage(im,cx-w/2,cy-w/2,w,w);
  };
}
/* ms per frame with and without the effect, same clip, same plate, in order (the first 5 frames not counted) */
async function timing(clip,params,px,n){
  const ts=[n/FPS];
  const a=await play(clip,params,ts,{px}), b=await play(clip,params,ts,{px,noFx:true});
  return {withFx:+a.ms.toFixed(2),without:+b.ms.toFixed(2),fxCost:+(a.ms-b.ms).toFixed(2)};
}

/* THE TRUTH SHEET for the menu picture. The tile exposes its own clip (T.truth.clip), settings and frame; the REAL renderer plays
   that very clip, in order, at the tile's plate size, and each t shows OURS (the tile) beside REAL (the same tile furniture with the
   real render in the viewer). Numbers: the mean change each makes against the plain clip, and OURS against REAL directly. */
async function moshTruth(ts,name){
  const T=(window.FX_TILES||[]).filter(x=>x.id==='moshbloom').pop(); const tr=T.truth;
  const t0=performance.now(); const draw=T.make(360); const makeMs=performance.now()-t0;
  const res=await play((g,t,S,Sh)=>tr.clip(g,t,S,Sh),tr.params,ts,{project:tr.project,plate:[tr.W,tr.H]});
  const C=180, P2=4, GG=16, M=10, L=24;
  const W=M*2+ts.length*(C*2+P2)+(ts.length-1)*GG, Hh=M+L+C+M+40;
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Hh); x.imageSmoothingQuality='high';
  x.fillStyle='#eef1f7'; x.font='600 14px system-ui, sans-serif';
  x.fillText('Datamosh Bloom (moshbloom): OURS beside REAL ('+H.base+' renderer) on the tile\'s own clip, '+JSON.stringify(tr.params),M,M+16);
  const tile=document.createElement('canvas'); tile.width=tile.height=360; const tg=tile.getContext('2d');
  const rows=[];
  ts.forEach((t,k)=>{
    const xa=M+k*(C*2+P2+GG), xb=xa+C+P2, y=M+L;
    draw(tg,t); x.drawImage(tile,xa,y,C,C); H.caption(x,'ours t='+t,xa+3,y+C-3);
    // REAL: the same furniture, the real frame in the viewer (0..100 x 0..80 units)
    draw(tg,t); tg.setTransform(3.6,0,0,3.6,0,0); tg.imageSmoothingEnabled=true; tg.drawImage(res.frames[t],0,0,100,100*tr.H/tr.W);
    tg.setTransform(1,0,0,1,0,0); x.drawImage(tile,xb,y,C,C); H.caption(x,'REAL t='+t,xb+3,y+C-3);
    const ours=draw.frameAt(t), real=res.frames[t], plainC=res.plain[t];
    const dOurs=change(ours,plainC), dReal=change(real,plainC), dOR=change(ours,real);
    rows.push({t,oursChange:dOurs.mean,realChange:dReal.mean,oursVsReal:dOR.mean,oursVsRealShare:+(100*dOR.share).toFixed(1)});
    x.fillStyle='#9aa3b5'; x.font='12px ui-monospace, monospace';
    x.fillText('change: ours '+dOurs.mean.toFixed(1)+' real '+dReal.mean.toFixed(1)+' | ours-real '+dOR.mean.toFixed(1),xa,y+C+16);
  });
  return {saved:await H.save(sh,name),makeMs:+makeMs.toFixed(0),realMsPerFrame:+res.ms.toFixed(1),rows,warn:res.warn,errors:res.errors};
}

/* The REAL kernel (CANVAS_FX.moshbloom, called as the suite calls it) fed the tile's own clip frame by frame, against the tile's port
   run with the same settings: the largest difference (levels) at each frame from the cut to fEnd. */
function kernelVsPort(over,fEnd){
  const T=(window.FX_TILES||[]).filter(x=>x.id==='moshbloom').pop(), tr=T.truth, K=FM._FX_TABLES.CANVAS_FX.moshbloom;
  const W=tr.W, Hh=tr.H, ps=W/tr.project[0], fCut=Math.round(tr.params.hold*FPS);
  const p=JSON.parse(JSON.stringify(Object.assign({},FM.fxRegistry.makeInstance('moshbloom').params,tr.params,over||{})));
  const port=tr.run(over||{},fEnd,1);
  const A=document.createElement('canvas'); A.width=W; A.height=Hh; const ag=A.getContext('2d');
  const B=document.createElement('canvas'); B.width=W; B.height=Hh; const bg=B.getContext('2d',{willReadFrequently:true});
  const lay={id:'kvp-'+(++seq)}; const rows=[];
  for(let f=fCut-1;f<=fEnd;f++){
    const t=f/FPS; ag.setTransform(1,0,0,1,0,0); ag.clearRect(0,0,W,Hh); tr.clip(ag,t,W,Hh); bg.setTransform(1,0,0,1,0,0); bg.clearRect(0,0,W,Hh);
    K(A,bg,W,Hh,{x:0,y:0,w:W,h:Hh},p,t,t,lay,ps,null,{project:{width:tr.project[0],height:tr.project[1]}});
    if(f<fCut) continue;
    const kd=bg.getImageData(0,0,W,Hh).data, od=port[f-fCut].getContext('2d').getImageData(0,0,W,Hh).data;
    let mx=0, sum=0; for(let i=0;i<kd.length;i++){ const d=Math.abs(kd[i]-od[i]); if(d>mx) mx=d; sum+=d; }
    rows.push(f+':'+mx+'/'+(sum/kd.length).toFixed(2));
  }
  return rows.join(' ');
}

window.__mb={photoCam,cutClip,seqClip,cardOrbit,play,sheet,change,cutScore,timing,moshTruth,kernelVsPort,FPS};
})();
