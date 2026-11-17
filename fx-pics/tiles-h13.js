/* round 5 slot 13 (#1250): DATAMOSH BLOOM, redrawn for the upgraded effect (effects branch 9063d06a / 7f25fc46).
   Shot 1 is a stone colonnade at noon; at the cut, shot 2 is a night train crossing close to camera. Start at sits on the cut.
   The picture is the effect's own arithmetic, ported line for line from the branch's js/compositor.js (CANVAS_FX.moshbloom,
   _mfField, dmbVec, dmbPush, dmbHeal, dmbMix) and run here frame by frame at 30 fps on a 320 x 256 plate of a 1080 x 864 project,
   exactly as an export plays it: the cut frame HOLDS the colonnade (the field across a cut is noise and the kernel skips it); from
   the next frame the old picture is pushed along the train's measured movement x Bloom 1.6, and New detail 0.85 adds the
   train's own change (the P-frame residual), so the train is drawn INTO the colonnade's stone and shadow. Heal 0.03 then pulls
   it back toward the night shot. probe-moshbloom.js plays the same clip through the real renderer (truth.html?app=/ss/): every
   frame from the cut on comes out byte for byte the same as this tile's (shots/r5-moshbloom-truth.png). On today's main the same
   clip only drags the stone sideways (no train is drawn in): this picture is the branch's look. */
(function(){ 'use strict';

const COAL='#0c0c0d', BONE='#e7e2d5', DIM='#8b96a8', YEL='#ffce4a';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
/* A picture that prepares a lot in make() prepares it as a generator instead (#1253, 17 Nov; HARNESS.md "is staged"). stage(gen) runs
   it to the end at once (finish) or a few milliseconds at a time (step(ms), true once it is done). make() hands back its draw function
   with draw.step, so the app builds it between frames; a draw before it is done finishes it there and then, which is exactly what
   make() used to do. Every yield is only a place the work may pause: no number changes. */
const stage=gen=>{ let done=false, val, last='';
  const run=ms=>{ if(done) return true; const t0=performance.now();
    for(;;){ const r=gen.next(); if(r.done){ done=true; val=r.value; return true; } last=r.value; if(performance.now()-t0>=ms) return false; } };
  return { step:ms=>run(Math.max(0,+ms||0)), finish:()=>{ run(Infinity); return val; }, done:()=>done, last:()=>last }; };
const drain=g=>{ let r; do r=g.next(); while(!r.done); return r.value; };

/* ---- the clip the effect is on: 100 x 80 units ------------------------------------------------------------------------ */
/* Every edge lands on an EVEN pixel of the 320 x 256 plate (rectangles, and the floor's slanted shadows two rows at a time), and the
   train moves exactly 6 px a frame, so each 2 x 2 cell is one colour: the same bytes on any canvas, and _mfField's half-size grey is
   exact whichever way the browser rounds a downscale. The real renderer is fed exactly what this tile works on, and finds the same
   field. */
const VW=100, VH=80, CUT=1.0, STEP_PX=6;
/* shot 1: a colonnade in hard noon sun, lit from the upper left; the right-hand column runs off the frame */
function colonnade(R,row){
  R('#5f7fa2',0,0,VW,11);                                   // a slice of sky
  R('#d9d0bc',0,11,VW,8); R('#c5bba6',0,17.2,VW,1.4); R('#9d937f',0,18.6,VW,1.6);   // cornice, its shadow
  R('#1d1a15',0,20.2,VW,48.6);                             // the deep shade inside the portico
  R('#2a251e',0,20.2,VW,3.2);
  for(let k=0;k<7;k++){
    const x=3.5+k*16.4;
    R('#e4dccb',x,20.2,8.4,48.6);                           // the lit shaft
    R('#c9bfa9',x+5.2,20.2,1.4,48.6); R('#a89e89',x+6.6,20.2,1.8,48.6);   // turning out of the light
    R('#d2c9b5',x-0.7,20.2,9.8,2.2); R('#d2c9b5',x-0.7,66.4,9.8,2.4);      // capital and base
  }
  R('#d1c6af',0,68.8,VW,11.2);                             // the floor in sun, and each column's shadow raking off to the right
  row(68.8,VH,yu=>{ const f=(yu-68.8)/11.2, out=[]; for(let k=-1;k<7;k++){ const x=3.5+k*16.4+8.4+7.5*f; out.push([x,x+8]); } return out; },'#3b3428');
}
/* shot 2: night; a commuter train crosses left to right close to camera, its front entering at the cut. k = frames after the cut;
   the front moves STEP_PX plate pixels a frame (56 units a second) */
function train(R,k,kx){
  R('#0b0e15',0,0,VW,VH);
  R('#06080c',0,62,VW,3); R('#121722',0,65,VW,15);         // the platform edge, the platform
  R('#1a2030',0,70,VW,0.9);
  const x0=(-4+STEP_PX*k)/kx, CAR=56;
  for(let j=0;j<5;j++){
    const xr=x0-j*(CAR+1.6), xl=xr-CAR;
    if(xr<-2||xl>VW+2) continue;
    R('#2c313b',xl,19,CAR,40); R('#3e4452',xl,19,CAR,2.6); R('#171a20',xl,54,CAR,5);   // body, roof, skirt
    for(let w=0;w<3;w++){ const wx=xl+5+w*17.5; R('#e9c983',wx,27,12,14); R('#fbeac0',wx,27,12,3.2); R('#c2a466',wx,38.4,12,2.6); }
    R('#1b1f27',xl+CAR*0.5-0.5,22,1,31);                    // the door seam
  }
  R('#fff4d8',x0-2.2,49.5,1.8,2.2);                         // the lead car's headlamp
}
/* the plain clip at clip time t, into a W x H context (the tile's plate is 320 x 256), every edge on an even pixel */
function clip(g,t,W,H){
  const kx=W/VW, ky=H/VH, ev=v=>2*Math.round(v/2);
  g.setTransform(1,0,0,1,0,0); g.globalAlpha=1; g.globalCompositeOperation='source-over';
  const R=(c,x,y,w,h)=>{ const x0=Math.max(0,ev(x*kx)), x1=Math.min(W,ev((x+w)*kx)), y0=Math.max(0,ev(y*ky)), y1=Math.min(H,ev((y+h)*ky)); if(x1>x0&&y1>y0){ g.fillStyle=c; g.fillRect(x0,y0,x1-x0,y1-y0); } };
  /* spans(yu) gives [x0, x1] runs (units) at unit height yu: filled two pixel rows at a time */
  const row=(ya,yb,spans,c)=>{ g.fillStyle=c; for(let py=ev(ya*ky);py<ev(yb*ky);py+=2){ for(const [a,b] of spans((py+1)/ky)){ const x0=Math.max(0,ev(a*kx)), x1=Math.min(W,ev(b*kx)); if(x1>x0) g.fillRect(x0,py,x1-x0,2); } } };
  if(t<CUT-1e-6) colonnade(R,row); else train(R,Math.round((t-CUT)*FPS),kx);
}

/* ---- the effect: effects-branch compositor.js, line for line ------------------------------------------------------------- */
const PARAMS={amount:0.9, hold:CUT, block:40, decay:0.03, chroma:0.5, detail:0.85, bloom:1.6, cuts:0};
const W=320, H=256, PROJ=[1080,864], FPS=30, ONE=256, TOP=255*256, THR=0.03;
/* _mfGrayOf: the plate drawn 160 wide, then Rec.601 grey x alpha. Every 2 x 2 cell of this clip is one colour (see above), so the
   browser's half-size draw gives exactly that cell's colour, whichever way it rounds: read here straight from the cell. */
function greyOf(d,FW,FH){
  const g=new Float32Array(FW*FH);
  for(let y=0;y<FH;y++) for(let x=0;x<FW;x++){ const i=((2*y)*W+2*x)*4; g[y*FW+x]=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])*(d[i+3]/255); }
  return g;
}
/* _mfField: 8 px blocks on the 160-wide grey, a step-3 search over +-24 then +-2, accepted only if 25 % better; then the 3 x 3 pass.
   One liberty, which changes no result: a candidate's sum stops as soon as it can no longer beat the best so far (the sums only
   grow, and a candidate is taken only when strictly lower). */
function field(gp,gc,FW,FH,thr){
  const BS=8, gw=Math.floor(FW/BS), gh=Math.floor(FH/BS), n=gw*gh;
  const vx=new Float32Array(n), vy=new Float32Array(n), df=new Float32Array(n);
  const sad=(ox,oy,px,py,lim)=>{ let s=0;
    for(let y=0;y<BS;y++){ const cy=oy+y, py2=py+y; if(py2<0||py2>=FH){ s+=BS*40; if(s>=lim) return s; continue; } const cRow=cy*FW, pRow=py2*FW;
      for(let x=0;x<BS;x++){ const px2=px+x; s+=(px2<0||px2>=FW)?40:Math.abs(gc[cRow+ox+x]-gp[pRow+px2]); }
      if(s>=lim) return s; }
    return s; };
  const thrSad=thr*255*BS*BS;
  for(let by=0;by<gh;by++) for(let bx=0;bx<gw;bx++){
    const i=by*gw+bx, ox=bx*BS, oy=by*BS, d0=sad(ox,oy,ox,oy,Infinity);
    df[i]=d0/(255*BS*BS);
    if(d0<=thrSad) continue;
    let mean=0, dev=0;
    for(let y2=0;y2<BS;y2++){ const r2=(oy+y2)*FW+ox; for(let x2=0;x2<BS;x2++) mean+=gc[r2+x2]; }
    mean/=BS*BS;
    for(let y2=0;y2<BS;y2++){ const r2=(oy+y2)*FW+ox; for(let x2=0;x2<BS;x2++) dev+=Math.abs(gc[r2+x2]-mean); }
    if(dev/(BS*BS)<5) continue;
    let best=d0, bdx=0, bdy=0;
    for(let dy=-24;dy<=24;dy+=3) for(let dx=-24;dx<=24;dx+=3){ if(!dx&&!dy) continue; const s=sad(ox,oy,ox+dx,oy+dy,best); if(s<best){ best=s; bdx=dx; bdy=dy; } }
    const cbx=bdx, cby=bdy;
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){ if(!dx&&!dy) continue; const s=sad(ox,oy,ox+cbx+dx,oy+cby+dy,best); if(s<best){ best=s; bdx=cbx+dx; bdy=cby+dy; } }
    if(best<d0*0.75){ vx[i]=-bdx; vy[i]=-bdy; }
  }
  const sx=new Float32Array(n), sy=new Float32Array(n);
  for(let by=0;by<gh;by++) for(let bx=0;bx<gw;bx++){
    let ax=0, ay=0, mmax=0;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const nx=bx+dx, ny=by+dy; if(nx<0||ny<0||nx>=gw||ny>=gh) continue; const j=ny*gw+nx, m=Math.hypot(vx[j],vy[j]); ax+=vx[j]; ay+=vy[j]; if(m>mmax) mmax=m; }
    const i=by*gw+bx, al=Math.hypot(ax,ay);
    if(al>1e-3&&mmax>0.3){ sx[i]=(ax/al)*mmax; sy[i]=(ay/al)*mmax; }
  }
  return {vx:sx,vy:sy,df,gw,gh,FW,FH,BS};
}
function vecAt(F,sx,sy,X,Y,out){   // dmbVec
  let fx=X/(sx*F.BS)-0.5, fy=Y/(sy*F.BS)-0.5;
  if(fx<0) fx=0; else if(fx>F.gw-1) fx=F.gw-1;
  if(fy<0) fy=0; else if(fy>F.gh-1) fy=F.gh-1;
  const x0=fx|0, y0=fy|0, x1=x0+1<F.gw?x0+1:x0, y1=y0+1<F.gh?y0+1:y0, ax=fx-x0, ay=fy-y0, r0=y0*F.gw, r1=y1*F.gw;
  const vx=(F.vx[r0+x0]*(1-ax)+F.vx[r0+x1]*ax)*(1-ay)+(F.vx[r1+x0]*(1-ax)+F.vx[r1+x1]*ax)*ay;
  const vy=(F.vy[r0+x0]*(1-ax)+F.vy[r0+x1]*ax)*(1-ay)+(F.vy[r1+x0]*(1-ax)+F.vy[r1+x1]*ax)*ay;
  out[0]=Math.round(vx*sx); out[1]=Math.round(vy*sy);
}
/* dmbPush: every bs x bs square moves whole by its vector, the plate's edge repeated past it. (A row whose source lies wholly inside
   the plate is copied in one go: the same bytes.) */
function push(src,dst,bs,vec){
  const v=[0,0];
  for(let by=0;by<H;by+=bs){ const yEnd=Math.min(H,by+bs);
    for(let bx=0;bx<W;bx+=bs){ const xEnd=Math.min(W,bx+bs); vec((bx+xEnd)/2,(by+yEnd)/2,v); const dx=v[0], dy=v[1], whole=bx-dx>=0&&xEnd-dx<=W;
      for(let y=by;y<yEnd;y++){ let sy=y-dy; if(sy<0) sy=0; else if(sy>=H) sy=H-1; const srow=sy*W, drow=y*W;
        if(whole){ dst.set(src.subarray((srow+bx-dx)*4,(srow+xEnd-dx)*4),(drow+bx)*4); continue; }
        for(let x=bx;x<xEnd;x++){ let sx=x-dx; if(sx<0) sx=0; else if(sx>=W) sx=W-1; const si=(srow+sx)*4, di=(drow+x)*4;
          dst[di]=src[si]; dst[di+1]=src[si+1]; dst[di+2]=src[si+2]; dst[di+3]=src[si+3]; } } } }
}
const q=v=>v<=0?0:(v>=255?TOP:(v*ONE+0.5)|0);
function heal(m,c,n,kL,kC){   // dmbHeal: toward the clip in premultiplied colour, brightness at kL, colour at kC
  for(let i=0;i<n;i+=4){
    const a1=c[i+3];
    if(m[i+3]===a1*ONE&&m[i]===c[i]*ONE&&m[i+1]===c[i+1]*ONE&&m[i+2]===c[i+2]*ONE) continue;
    if(a1===255&&m[i+3]===TOP){   // both opaque (all of this clip): the same sums, every alpha factor being exactly 1
      const r0=m[i]/ONE, g0=m[i+1]/ONE, b0=m[i+2]/ONE, r1=c[i], g1=c[i+1], b1=c[i+2];
      const y0=0.299*r0+0.587*g0+0.114*b0, y1=0.299*r1+0.587*g1+0.114*b1, yn=y0+(y1-y0)*kL;
      const r=(r0-y0)+((r1-y1)-(r0-y0))*kC+yn, g=(g0-y0)+((g1-y1)-(g0-y0))*kC+yn, b=(b0-y0)+((b1-y1)-(b0-y0))*kC+yn;
      m[i]=Math.abs(r-r1)<1?r1*ONE:q(r); m[i+1]=Math.abs(g-g1)<1?g1*ONE:q(g); m[i+2]=Math.abs(b-b1)<1?b1*ONE:q(b);
      continue;
    }
    const a0=m[i+3]/ONE, f0=a0/255, f1=a1/255;
    const r0=m[i]/ONE*f0, g0=m[i+1]/ONE*f0, b0=m[i+2]/ONE*f0, r1=c[i]*f1, g1=c[i+1]*f1, b1=c[i+2]*f1;
    const y0=0.299*r0+0.587*g0+0.114*b0, y1=0.299*r1+0.587*g1+0.114*b1, yn=y0+(y1-y0)*kL;
    let r=(r0-y0)+((r1-y1)-(r0-y0))*kC+yn, g=(g0-y0)+((g1-y1)-(g0-y0))*kC+yn, b=(b0-y0)+((b1-y1)-(b0-y0))*kC+yn;
    let a=a0+(a1-a0)*kL;
    if(Math.abs(a-a1)<1) a=a1;
    if(a<0.5/ONE){ m[i]=0; m[i+1]=0; m[i+2]=0; m[i+3]=0; continue; }
    const u=255/a; r*=u; g*=u; b*=u;
    m[i]=Math.abs(r-c[i])<1?c[i]*ONE:q(r); m[i+1]=Math.abs(g-c[i+1])<1?c[i+1]*ONE:q(g); m[i+2]=Math.abs(b-c[i+2])<1?c[i+2]*ONE:q(b);
    m[i+3]=a===a1?a1*ONE:q(a);
  }
}
function mix(o,c,m,n,amt){   // dmbMix, opaque plates
  const ra=1-amt, sm=amt/ONE;
  for(let i=0;i<n;i+=4){
    const a1=c[i+3], a0=m[i+3];
    if(a1===255&&a0===TOP){ o[i]=c[i]*ra+m[i]*sm; o[i+1]=c[i+1]*ra+m[i+1]*sm; o[i+2]=c[i+2]*ra+m[i+2]*sm; o[i+3]=255; continue; }
    const w1=a1*ra, w0=a0*sm, a=w1+w0;
    if(a<0.5){ o[i]=0; o[i+1]=0; o[i+2]=0; o[i+3]=0; continue; }
    o[i]=(c[i]*w1+m[i]/ONE*w0)/a; o[i+1]=(c[i+1]*w1+m[i+1]/ONE*w0)/a; o[i+2]=(c[i+2]*w1+m[i+2]/ONE*w0)/a; o[i+3]=a;
  }
}

/* run the clip through it at 30 fps from the frame before the cut to `fEnd`; keep every `step`th frame from the cut on */
function* runMoshG(fEnd,step,p){
  p=p||PARAMS; const n=W*H*4, FW=160, FH=Math.max(16,Math.round(H*160/W));
  const ps=W/PROJ[0], bs=Math.max(1,Math.round(p.block*ps));
  const mk=(w,h)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
  const C=mk(W,H), cx=C.getContext('2d',{willReadFrequently:true});
  /* paint the clip at t on the plate; its bytes, and its grey as _mfField reads it */
  const frameAt=t=>{ cx.setTransform(1,0,0,1,0,0); cx.clearRect(0,0,W,H); clip(cx,t,W,H); const d=cx.getImageData(0,0,W,H).data; return [d,greyOf(d,FW,FH)]; };
  const fCut=Math.round(p.hold*FPS);
  let [prev,gPrev]=frameAt((fCut-1)/FPS), tPrev=(fCut-1)/FPS, held=null;
  yield 'mosh';
  let scratch=new Uint16Array(n), spare=new Uint16Array(n);
  const pred=new Uint8ClampedArray(n), im=cx.createImageData(W,H), o=im.data, out=[];
  for(let f=fCut;f<=fEnd;f++){
    const t=f/FPS, [cur,gCur]=frameAt(t), first=!held; yield 'mosh';
    let hd=held;
    if(!hd){ hd=spare; for(let i=0;i<n;i++) hd[i]=prev[i]*ONE; }   // the first moshed frame starts from the clip's last frame
    const F=field(gPrev,gCur,FW,FH,THR), sx=W/F.FW, sy=H/F.FH; yield 'mosh';
    let dfm=0; for(let k=0;k<F.df.length;k++) dfm+=F.df[k]; dfm=F.df.length?dfm/F.df.length:0;
    const isCut=dfm>0.2, next=scratch;
    if(isCut&&p.detail>0) next.set(hd);   // a cut's field is noise: the deleted keyframe's frame HOLDS
    else if(p.bloom===1) push(hd,next,bs,(X,Y,v)=>vecAt(F,sx,sy,X,Y,v));
    else push(hd,next,bs,(X,Y,v)=>{ vecAt(F,sx,sy,X,Y,v); v[0]=Math.round(v[0]*p.bloom); v[1]=Math.round(v[1]*p.bloom); });
    if(p.detail>0&&!first&&!isCut){   // New detail: the residual, the clip's change against its last frame moved by the true field
      push(prev,pred,bs,(X,Y,v)=>vecAt(F,sx,sy,X,Y,v));
      const kd=p.detail*ONE;
      for(let i=0;i<n;i++){ const d=cur[i]-pred[i]; if(d===0) continue; const v=next[i]+d*kd; next[i]=v<=0?0:(v>=TOP?TOP:(v+0.5)|0); }   // no change: the stored value already is what the sum rounds to
    }
    yield 'mosh';
    const kL=p.decay>0?1-Math.pow(1-0.5*p.decay,(t-tPrev)*30):0;
    if(kL>0) heal(next,cur,n,kL,kL*(1-p.chroma)); yield 'mosh';
    scratch=hd; held=next;
    if((f-fCut)%step===0){
      if(p.amount>=0.998){ for(let i=0;i<n;i++) o[i]=held[i]/ONE; } else mix(o,cur,held,n,p.amount);
      const c=mk(W,H); c.getContext('2d').putImageData(im,0,0); out.push(c);
    }
    prev=cur; gPrev=gCur; tPrev=t;
  }
  return out;
}
function runMosh(fEnd,step,p){ return drain(runMoshG(fEnd,step,p)); }
let moshStage=null;
const moshSt=fEnd=>moshStage||(moshStage=stage(runMoshG(fEnd,STEP)));
let CACHE=null;   // the frames do not depend on the tile's size: worked out once a page

const STEP=2, SHOWN=1.5, P=3.4;   // 15 frames a second on screen, 1.5 s of mosh, then it holds until the loop
window.FX_TILES=window.FX_TILES||[];
window.FX_TILES.push({ id:'moshbloom', name:'Datamosh Bloom', section:'Stylize', redrawn:true, still:2.15,
  line:'With Start at on the cut, the colonnade holds and the night train\'s movement is drawn into it in sliding blocks (New detail 0.85, Bloom 1.6, Block 40, Heal 0.03, Amount 0.9).',
  truth:{clip,params:PARAMS,W,H,project:PROJ,cut:CUT,fps:FPS,step:STEP,shown:SHOWN,period:P,
    run:(over,fEnd,step)=>runMosh(fEnd,step||1,Object.assign({},PARAMS,over||{}))},   // the port with other settings, for the truth probe
  make(px){
    const fCut=Math.round(CUT*FPS), fEnd=fCut+Math.round(SHOWN*FPS);
    /* the moshed frames are built between frames (stage, above) and kept for the page; a draw that needs them before then finishes them */
    const stg=moshSt(fEnd), frs=()=>CACHE||(CACHE=stg.finish());
    const S1=(()=>{ const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); clip(g,0,W,H); return c; })();
    const PH=VH, X0=4, X1=96, xc=X0+(X1-X0)*CUT/P;
    const idx=u=>Math.min(frs().length-1,Math.floor((u-CUT)*FPS/STEP+1e-3));   // the frame on screen at u (15 a second from the cut)
    const draw=(c,t)=>{
      const u=mod(t,P);
      c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      c.drawImage(u<CUT?S1:frs()[idx(u)],0,0,100,PH);
      /* the timeline under the viewer: clip 1, the cut with Start at's key on it, clip 2, the playhead */
      const ty=PH+7.2, th=5.6;
      c.fillStyle='#857d6d'; c.fillRect(X0,ty,xc-X0-0.5,th);
      c.fillStyle='#232a3a'; c.fillRect(xc+0.5,ty,X1-xc-0.5,th);
      c.fillStyle='#c9a65a'; for(let i=0;i<10;i++) c.fillRect(xc+2.6+i*6.6,ty+1.7,3.2,2.2);
      c.fillStyle=YEL; c.beginPath(); c.moveTo(xc,ty-4.6); c.lineTo(xc+1.9,ty-2.7); c.lineTo(xc,ty-0.8); c.lineTo(xc-1.9,ty-2.7); c.closePath(); c.fill();
      const hx=X0+(X1-X0)*u/P;
      c.fillStyle=BONE; c.fillRect(hx-0.35,PH+2.2,0.7,15.4);
      const fr=Math.floor(u*FPS+1e-6), ss=Math.floor(fr/FPS), ff=fr%FPS;
      c.font=MONO(3.6); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='alphabetic';
      c.fillText('00:00:0'+ss+':'+(ff<10?'0':'')+ff,X0,98.6);
      c.fillText('START AT',xc+3,ty-1.2);
    };
    draw.frameAt=t=>{ const u=mod(t,P); return u<CUT?S1:frs()[idx(u)]; };   // for the truth sheet: the plate shown at t
    draw.step=ms=>CACHE?true:stg.step(ms); draw.stage=stg;
    return draw;
  } });
})();
