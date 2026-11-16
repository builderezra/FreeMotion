/* FreeMotion effect pictures, artist 7 (c7): the Keying tail. No photographs: every subject here is drawn by the tile itself,
   and every change is the effect's own maths from js/compositor.js, at an ordinary setting. Notes per tile. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const poly=(c,p)=>{ c.beginPath(); for(let i=0;i<p.length;i+=2){ i?c.lineTo(p[i],p[i+1]):c.moveTo(p[i],p[i+1]); } c.closePath(); };
const diamond=(c,x,y,r,f)=>{ c.fillStyle=f; c.beginPath(); c.moveTo(x,y-r); c.lineTo(x+r,y); c.lineTo(x,y+r); c.lineTo(x-r,y); c.closePath(); c.fill(); };
const rgbS=(r,g,b)=>'rgb('+Math.round(clamp(r,0,255))+','+Math.round(clamp(g,0,255))+','+Math.round(clamp(b,0,255))+')';
/* a Gaussian of standard deviation s px, as three box passes each way (what ctx.filter blur() is); outside the plate reads as 0
   when `zero`, as the edge pixel otherwise */
function gauss(a,W,H,s,zero){
  const out=Float32Array.from(a); if(!(s>.25)) return out;
  const r=Math.max(1,Math.round((Math.sqrt(4*s*s+1)-1)/2)), k=1/(2*r+1), t=new Float32Array(W*H);
  for(let pass=0;pass<3;pass++){
    for(let y=0;y<H;y++){ const o=y*W; let sum=0; for(let i=-r;i<=r;i++){ const q=i<0?(zero?-1:0):(i>=W?(zero?-1:W-1):i); if(q>=0) sum+=out[o+q]; }
      for(let x=0;x<W;x++){ t[o+x]=sum*k; const ad=x+r+1, su=x-r; if(ad<W) sum+=out[o+ad]; else if(!zero) sum+=out[o+W-1]; if(su>=0) sum-=out[o+su]; else if(!zero) sum-=out[o]; } }
    for(let x=0;x<W;x++){ let sum=0; for(let i=-r;i<=r;i++){ const q=i<0?(zero?-1:0):(i>=H?(zero?-1:H-1):i); if(q>=0) sum+=t[q*W+x]; }
      for(let y=0;y<H;y++){ out[y*W+x]=sum*k; const ad=y+r+1, su=y-r; if(ad<H) sum+=t[ad*W+x]; else if(!zero) sum+=t[(H-1)*W+x]; if(su>=0) sum-=t[su*W+x]; else if(!zero) sum-=t[x]; } }
  }
  return out;
}

window.FX_TILES.push(

/* LIGHT WRAP. Cut paper: a vermilion hand keyed over a plate of bright sky and dark ground, the horizon slanting across the palm.
   The wrap is CANVAS_FX.lightwrap's own recipe, computed once here: band = subject x (1 - subject blurred by Reach), the backdrop
   blurred by Softness, cut to that band, laid on with Screen at Intensity. Intensity 1.2, Reach 36 px, Softness 24 px on a 1080 frame.
   The fingers against the sky take its pale light; the wrist against the dark ground takes almost none. */
{ id:'lightwrap', name:'Light Wrap', section:'Keying', isNew:true, still:2.2,
  line:'Light from the shot behind soaks softly into the edge of the cut-out, in the colour of whatever is behind it.',
  make(px){
    const P=4.4, N=Math.min(320,px), INT=1.2, REACH=36, SOFT=24;   /* checker k1: Reach 20 read as nothing at menu size; 36 of 80 still a middling setting */
    /* an open hand, palm out, fingers a little apart; scissor-cut, so every edge is a straight snip */
    const HAND=[36.6,103, 35.4,86, 31.4,76.6, 25,69.4, 19.2,61.8, 15.6,56.2, 15.2,52.6, 17.6,51.4, 21.4,53.6, 26.6,58.8, 31.6,63.4, 34.4,63,
      33.6,47, 32.4,31.6, 33.2,27.6, 36.4,26.4, 39.2,28.4, 40.6,44.2, 42,43.6, 41.8,24.6, 43.2,20.6, 46.6,20, 48.8,23.2, 49,43.2,
      50.4,43.4, 51.8,27.4, 53.8,24.2, 56.8,24.8, 57.8,28.6, 56.8,45.4, 58.2,47, 61.8,36.4, 64.2,33.8, 66.8,35, 67,38.6, 63.2,52.6,
      62.6,62.8, 59.6,72.4, 57.8,85, 58.6,103];
    const back=x=>{ x.fillStyle=INK; x.fillRect(0,0,100,100); x.fillStyle=BONE; poly(x,[-1,-1, 101,-1, 101,49.4, -1,61.4]); x.fill(); };
    const subj=x=>{ x.save(); x.translate(47,101); x.rotate(.1); x.translate(-41,-101); x.fillStyle=VERM; poly(x,HAND); x.fill(); x.restore(); };
    /* the one read: backdrop on the left (clipped to its half), subject on the right */
    const [Q,q]=sheet(2*N,N); q.save(); q.beginPath(); q.rect(0,0,N,N); q.clip(); q.setTransform(N/100,0,0,N/100,0,0); back(q); q.restore(); q.setTransform(N/100,0,0,N/100,N,0); subj(q);
    const d=q.getImageData(0,0,2*N,N).data, n=N*N, A=new Float32Array(n), R=new Float32Array(n), G=new Float32Array(n), B=new Float32Array(n);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const i=y*N+x, j=(y*2*N+x)*4; R[i]=d[j]; G[i]=d[j+1]; B[i]=d[j+2]; A[i]=d[(y*2*N+N+x)*4+3]/255; }
    const sr=REACH/1080*N, ss=SOFT/1080*N, bA=gauss(A,N,N,sr,true), bR=gauss(R,N,N,ss,false), bG=gauss(G,N,N,ss,false), bB=gauss(B,N,N,ss,false);
    const [WR,wr]=sheet(N), im=wr.createImageData(N,N), o=im.data;
    for(let i=0;i<n;i++){ const j=i*4; o[j]=bR[i]; o[j+1]=bG[i]; o[j+2]=bB[i]; o[j+3]=255*clamp(A[i]*(1-bA[i])); }
    wr.putImageData(im,0,0);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      back(c); subj(c);
      /* Intensity keyed 0 to 1.2 and back, stepped on threes (8 fps) */
      const f=Math.floor(u*8)/8, k=INT*(f<.75?0:f<1.25?E.out(seg(f,.75,1.25)):f<3.5?1:f<3.85?1-seg(f,3.5,3.85):0);
      if(k>0){ c.globalCompositeOperation='screen'; c.globalAlpha=Math.min(1,k); c.drawImage(WR,0,0,100,100); if(k>1){ c.globalAlpha=k-1; c.drawImage(WR,0,0,100,100); } }
      reset(c,px);
    };
  } },

/* LUMA MATTE. A grey step wedge is the matte: four steps at 235, 170, 105 and 40. Each opening shows the yellow layer at
   (grey - Black point) / (White point - Black point), the real alpha line in drawLumaMatte. White point stays at its default 200;
   Black point steps 10, 60, 110, 160, so the darker steps drop out one by one. The ink band runs through all four, because it is
   one layer seen through four greys. The squares under the steps are the matte's own greys. */
{ id:'lumamatte', name:'Luma Matte', section:'Keying', isNew:true, still:1.2,
  line:'Another layer’s brightness decides how much of this one shows: white keeps it, grey keeps some, black hides it.',
  make(px){
    const P=4.4, GREYS=[235,170,105,40], WHITE=200, BX=[6,29.5,53,76.5], BW=17.5, Y0=6, Y1=68;
    const [F,fx]=sheet(px); fx.setTransform(px/100,0,0,px/100,0,0); fx.fillStyle=YEL; fx.fillRect(0,0,100,100);
    fx.fillStyle=INK; poly(fx,[-5,52, 105,30, 105,38, -5,60]); fx.fill();
    return (c,t)=>{
      const u=mod(t,P), blk=u<.9?10:u<1.5?60:u<2.1?110:u<3.5?160:10, span=WHITE-blk;
      reset(c,px); c.fillStyle=COAL; c.fillRect(0,0,100,100);
      for(let i=0;i<4;i++){ const a=clamp((GREYS[i]-blk)/span), x=BX[i], s=px/100;
        if(a>0){ c.globalAlpha=a; c.drawImage(F,x*s,Y0*s,BW*s,(Y1-Y0)*s,x,Y0,BW,Y1-Y0); c.globalAlpha=1; }
        const g=GREYS[i]; c.fillStyle=rgbS(g,g,g); c.fillRect(x,Y1+2.6,BW,5.6);
      }
      /* Black and White point on the 0..255 scale */
      const SX0=6, SX1=94, sy=84.6, xo=v=>lerp(SX0,SX1,v/255);
      c.fillStyle='#3d3f44'; c.fillRect(SX0,sy-.3,SX1-SX0,.6);
      const bx=xo(blk); c.fillStyle=BONE; c.beginPath(); c.moveTo(bx,sy-.6); c.lineTo(bx+2.2,sy-3.8); c.lineTo(bx-2.2,sy-3.8); c.closePath(); c.fill();
      const wx=xo(WHITE); c.fillStyle=DIM; c.beginPath(); c.moveTo(wx,sy-.6); c.lineTo(wx+2.2,sy-3.8); c.lineTo(wx-2.2,sy-3.8); c.closePath(); c.fill();
      c.font=MONO(5.4); c.textBaseline='middle'; c.textAlign='left'; c.fillStyle=BONE; c.fillText('BLACK '+blk,SX0,sy+7.4);
      c.textAlign='right'; c.fillStyle=DIM; c.fillText('WHITE '+WHITE,SX1,sy+7.4);
    };
  } },

/* MATTE CHOKER. The viewer zoomed right in on a keyed edge, 20 x 15 real pixels, with the two-pixel green rim the key left behind.
   Choke steps 0, -1, -2, -3, -4 px (the default) and the kernel's own erosion runs on every step: the alpha takes the minimum over a
   square window 2r+1 wide, first along the row, then down the column. Two pixels in, the green is gone; the edge has moved four. */
{ id:'mattechoker', name:'Matte Choker', section:'Keying', isNew:true, still:2.4,
  line:'Pulls the edge of a cut-out in by a few pixels, shaving off the dirty rim a key leaves behind.',
  make(px){
    const P=4.2, GX=20, GY=15, CELL=4.6, X0=4, Y0=4, PAD=6, W=GX+2*PAD, H=GY+2*PAD, CX=-8+PAD, CY=23+PAD, RAD=26;
    const n=W*H, A=new Float32Array(n), FR=new Float32Array(n), FG=new Float32Array(n), FB=new Float32Array(n), BR=new Float32Array(n), BG=new Float32Array(n), BB=new Float32Array(n);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const i=y*W+x; let cov=0, rim=0;
      for(let sy=0;sy<4;sy++) for(let sx=0;sx<4;sx++){ const dd=Math.hypot(x+(sx+.5)/4-CX,y+(sy+.5)/4-CY); if(dd<=RAD){ cov++; if(dd>RAD-2) rim++; } }
      A[i]=cov/16; const g=rim/Math.max(1,cov), nz=(hash(i,3)-.5)*10, nb=(hash(i,7)-.5)*8;
      /* the subject: warm grey, a little grain; the rim: the green it was shot against */
      FR[i]=lerp(186+nz,74,g*.85); FG[i]=lerp(150+nz,184,g*.85); FB[i]=lerp(118+nz,82,g*.85);
      BR[i]=40+nb; BG[i]=49+nb; BB[i]=66+nb; }
    const choke=r=>{ if(!r) return A; const h=new Float32Array(n), v=new Float32Array(n);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){ let m=1; for(let k=Math.max(0,x-r);k<=Math.min(W-1,x+r);k++) m=Math.min(m,A[y*W+k]); h[y*W+x]=m; }
      for(let x=0;x<W;x++) for(let y=0;y<H;y++){ let m=1; for(let k=Math.max(0,y-r);k<=Math.min(H-1,y+r);k++) m=Math.min(m,h[k*W+x]); v[y*W+x]=m; }
      return v; };
    const LV=[0,1,2,3,4].map(r=>{ const a=choke(r), out=[]; for(let y=PAD;y<PAD+GY;y++) for(let x=PAD;x<PAD+GX;x++){ const i=y*W+x, q=a[i]; out.push(rgbS(lerp(BR[i],FR[i],q),lerp(BG[i],FG[i],q),lerp(BB[i],FB[i],q))); } return out; });
    return (c,t)=>{
      const u=mod(t,P), lv=u<.8?0:u<3.4?Math.min(4,1+Math.floor((u-.8)/.2)):0;
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.fillStyle='#0f141d'; c.fillRect(X0,Y0,GX*CELL,GY*CELL);
      const L=LV[lv]; let k=0;
      for(let y=0;y<GY;y++) for(let x=0;x<GX;x++){ c.fillStyle=L[k++]; c.fillRect(X0+x*CELL+.14,Y0+y*CELL+.14,CELL-.28,CELL-.28); }
      /* the control: Choke, -20 to 20 px, keyed at -4 */
      const TX0=36, TX1=95, ty=88, xo=v=>lerp(TX0,TX1,(v+20)/40);
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.moveTo(TX0,ty); c.lineTo(TX1,ty); c.moveTo(xo(0),ty-1.6); c.lineTo(xo(0),ty+1.6); c.stroke();
      diamond(c,xo(-4),ty,2.2,YEL);
      c.fillStyle=TEAL; c.fillRect(xo(-lv)-1.5,ty-1.5,3,3);
      c.font=MONO(6.6); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='middle'; c.fillText((lv?'-':' ')+lv+' PX',5,ty+.3);
      c.font=MONO(4.2); c.fillStyle=DIM; c.fillText('CHOKE',5,ty-6.4);
    };
  } },

/* EDGE HALO. Low key: a black desk telephone keyed over a dark ground, all but lost. Width 10 px, Strength 1, Blend Screen, in keyframe yellow.
   Rim on: Top first (fringe966: a pixel of the layer with a clear pixel within Width straight above it), then All round (the layer less
   its square erosion), each a hard band inside the edge, as the kernel paints it. The band is 10 px of a 1080 frame: it is thin. */
{ id:'mattefringe', name:'Edge Halo', section:'Keying', isNew:true, still:3.2,
  line:'A thin band of colour is painted just inside the cut-out’s edge, all the way round or only on the side the light comes from.',
  make(px){
    const P=4.4, WIDTH=10, w=Math.max(1,Math.round(WIDTH*px/1080)), K=[255,206,74];
    /* a desk telephone, front on: handset on its cradle, the body, a coiled cord running off to the right */
    const COIL=[]; for(let k=0;k<=11;k++){ const f=k/11, bx=77.8+f*24, by=78+f*f*13+Math.sin(f*3)*1.2; COIL.push([bx,by]); }
    const phone=(x,st)=>{
      x.beginPath(); x.moveTo(13.4,88.6); x.lineTo(13.4,85.6); x.quadraticCurveTo(13.4,84,15.4,84); x.lineTo(76.6,84); x.quadraticCurveTo(78.6,84,78.6,85.6); x.lineTo(78.6,88.6); x.closePath(); x.fill();   /* foot */
      x.beginPath(); x.moveTo(16.4,84.4); x.bezierCurveTo(18.4,72,20.4,62,24.6,56.6); x.quadraticCurveTo(27.4,51.4,33.4,51.2); x.lineTo(58.6,51.2); x.quadraticCurveTo(64.6,51.4,67.4,56.6);
        x.bezierCurveTo(71.6,62,73.6,72,75.6,84.4); x.closePath(); x.fill();                                                          /* body */
      x.beginPath(); x.moveTo(27.6,52); x.lineTo(28.6,44.8); x.lineTo(33.6,44.8); x.lineTo(34.6,52); x.closePath(); x.fill();          /* cradle */
      x.beginPath(); x.moveTo(57.4,52); x.lineTo(58.4,44.8); x.lineTo(63.4,44.8); x.lineTo(64.4,52); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(9.4,36.6); x.quadraticCurveTo(46,30.6,82.6,36.6); x.lineTo(84.6,38); x.bezierCurveTo(87.8,40.4,88.4,46,86.8,49.4); x.lineTo(70.4,49.4);
        x.bezierCurveTo(69.4,46.4,68.4,43.4,64.6,42.4); x.quadraticCurveTo(46,39.6,27.4,42.4); x.bezierCurveTo(23.6,43.4,22.6,46.4,21.6,49.4); x.lineTo(5.2,49.4);
        x.bezierCurveTo(3.6,46,4.2,40.4,7.4,38); x.closePath(); x.fill();                                                          /* handset */
      x.strokeStyle=st; x.lineWidth=.95; x.beginPath(); for(let k=0;k<COIL.length;k++){ const q=COIL[k]; x.moveTo(q[0]+Math.cos(.25)*1.7,q[1]+Math.sin(.25)*1.7); x.ellipse(q[0],q[1],1.7,2.9,.25,0,TAU); } x.stroke();   /* cord */
    };
    const [S,sx]=sheet(px); sx.setTransform(px/100,0,0,px/100,0,0); sx.fillStyle='#000'; phone(sx,'#000');
    const d=sx.getImageData(0,0,px,px).data, n=px*px, M=new Uint8Array(n);
    for(let i=0;i<n;i++) M[i]=d[i*4+3]>0?1:0;
    /* All round: the layer less its square erosion, rows then columns, the plate edge held */
    const e1=new Uint8Array(n), e2=new Uint8Array(n);
    for(let y=0;y<px;y++) for(let x=0;x<px;x++){ let m=1; for(let k=-w;k<=w;k++){ const q=clamp(x+k,0,px-1); if(!M[y*px+q]){ m=0; break; } } e1[y*px+x]=m; }
    for(let x=0;x<px;x++) for(let y=0;y<px;y++){ let m=1; for(let k=-w;k<=w;k++){ const q=clamp(y+k,0,px-1); if(!e1[q*px+x]){ m=0; break; } } e2[y*px+x]=m; }
    const band=top=>{ const [C,x]=sheet(px), im=x.createImageData(px,px), o=im.data;
      for(let y=0;y<px;y++) for(let xx=0;xx<px;xx++){ const i=y*px+xx; if(!M[i]) continue; let on=0;
        if(top){ for(let k=1;k<=w;k++){ const q=Math.max(0,y-k); if(!M[q*px+xx]){ on=1; break; } } } else on=e2[i]?0:1;
        if(on){ const j=i*4; o[j]=K[0]; o[j+1]=K[1]; o[j+2]=K[2]; o[j+3]=255; } }
      x.putImageData(im,0,0); return C; };
    const TOP=band(true), ALL=band(false);
    return (c,t)=>{
      const u=mod(t,P), mode=u<.6?0:u<2.7?1:u<3.75?2:0;
      reset(c,px); c.fillStyle=COAL; c.fillRect(0,0,100,100); c.fillStyle='#111112'; c.fillRect(0,88.6,100,11.4);
      c.fillStyle='#232120'; phone(c,'#232120');
      /* barely there: the dial, its ten finger holes and the centre card */
      c.strokeStyle='#302c28'; c.lineWidth=.6; c.beginPath(); c.arc(46,68.4,11.4,0,TAU); c.stroke();
      c.fillStyle='#1a1817'; for(let k=0;k<10;k++){ const a=(330-k*30)*Math.PI/180; c.beginPath(); c.arc(46+Math.cos(a)*8,68.4+Math.sin(a)*8,2.1,0,TAU); c.fill(); }
      c.strokeStyle='#36322d'; c.lineWidth=.8; c.beginPath(); c.arc(46,68.4,12.6,.38,.72); c.stroke();   /* the finger stop */
      c.fillStyle='#2e2a26'; c.beginPath(); c.arc(46,68.4,3.6,0,TAU); c.fill();
      if(mode){ c.setTransform(1,0,0,1,0,0); c.globalCompositeOperation='screen'; c.drawImage(mode===1?TOP:ALL,0,0); reset(c,px); }
      c.font=MONO(4.4); c.textAlign='right'; c.textBaseline='alphabetic'; c.fillStyle=mode?'#a29a88':'#4a463f';
      c.fillText(mode===2?'ALL ROUND':mode===1?'RIM ON TOP':'OFF',96,9);
    };
  } },

/* SHAPE WIPE. Two-ink print: the layer is the vermilion plate, the one under it the ink plate. Progress grows the shape from
   Centre 40 %, 56 % by b966WipeSize's rule (nothing at 0, the smallest shape that covers the frame at 1), and Shape is cut from
   Circle to Rectangle to Diamond at the same Progress (b966Sdf's own circle, box and rhombus; on a square frame the box is square).
   Border 24 px in the paper colour runs inside the opening's edge and slides off as the wipe finishes, as borderSlide966 does.
   The vermilion plate sits 0.6 units out of register, which is the print, not the effect. The Star is left out on purpose: a red
   five-point star with a white rim reads as a political emblem. */
{ id:'shapewipe', name:'Shape Wipe', section:'Keying', isNew:true, still:2.6,
  line:'The layer opens through a shape that grows from a point: a circle, an oval, a box, a diamond, a star or a heart.',
  make(px){
    const P=4.6, FX=6, FY=5, FS=82, CXF=.40, CYF=.56, BORDER=24, OFF=[.6,-.45];
    const sdf=(s,x,y)=>{ if(s===2){ const qx=Math.abs(x)-1, qy=Math.abs(y)-1; return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0); } if(s===3){ const ax=Math.abs(x), ay=Math.abs(y); const h=clamp(ay-ax,-1,1), dx=ax-.5*(1-h), dy=ay-.5*(1+h); return Math.hypot(dx,dy)*Math.sign(ax+ay-1); } return Math.hypot(x,y)-1; };
    const sizeOf=s=>{ const loc=[], Nn=96; const add=(X,Y)=>loc.push(X-CXF,Y-CYF); for(let i=0;i<=Nn;i++){ const f=i/Nn; add(f,0); add(f,1); add(0,f); add(1,f); }
      const fits=z=>{ for(let i=0;i<loc.length;i+=2) if(z*sdf(s,loc[i]/z,loc[i+1]/z)>0) return false; return true; };
      let lo=0, hi=Math.SQRT2; for(let k=0;k<40&&!fits(hi);k++){ lo=hi; hi*=2; } for(let k=0;k<40;k++){ const m=(lo+hi)/2; if(fits(m)) hi=m; else lo=m; } return hi; };
    const SIZE={0:sizeOf(0),2:sizeOf(2),3:sizeOf(3)};
    const path=(c,s,rho,ox,oy)=>{ const cx=FX+FS*CXF+ox, cy=FY+FS*CYF+oy, r=rho*FS; c.beginPath();
      if(s===0){ c.arc(cx,cy,r,0,TAU); }
      else if(s===2){ c.rect(cx-r,cy-r,2*r,2*r); }
      else { c.moveTo(cx,cy-r); c.lineTo(cx+r,cy); c.lineTo(cx,cy+r); c.lineTo(cx-r,cy); c.closePath(); } };
    /* paper and ink speckle, made once */
    const R=rng(707), [SP,sp]=sheet(px); sp.setTransform(px/100,0,0,px/100,0,0);
    for(let i=0;i<900;i++){ const x=R()*100, y=R()*100, r=.12+R()*.22; sp.fillStyle=R()<.5?'rgba(22,19,15,.22)':'rgba(231,226,213,.30)'; sp.fillRect(x,y,r,r); }
    const shapeAt=u=>u<1.75?0:u<2.25?2:3;
    const progAt=u=>u<.5?0:u<2.55?.42*settle(seg(u,.5,1.35)):u<3.3?lerp(.42,1,E.inOut(seg(u,2.55,3.3))):u<3.75?1:u<4.35?1-E.inOut(seg(u,3.75,4.35)):0;
    return (c,t)=>{
      const u=mod(t,P), s=shapeAt(u), pr=progAt(u), rho=pr*SIZE[s];
      reset(c,px); c.fillStyle=BONE; c.fillRect(0,0,100,100);
      /* the ink plate (the layer underneath), knocked out where the shape shows */
      c.save(); c.beginPath(); c.rect(FX,FY,FS,FS); c.clip();
      c.fillStyle=INK; c.fillRect(FX,FY,FS,FS);
      if(pr>=1){ c.fillStyle=BONE; c.fillRect(FX,FY,FS,FS); }
      else if(pr>0){ c.fillStyle=BONE; path(c,s,rho,0,0); c.fill(); }
      /* the vermilion plate: the shape, less the Border band in the paper colour */
      if(pr>0){ c.globalCompositeOperation='multiply'; c.fillStyle=VERM;
        if(pr>=1) c.fillRect(FX+OFF[0],FY+OFF[1],FS,FS);
        else { path(c,s,rho,OFF[0],OFF[1]); c.fill();
          const rem=1-pr, sl=rem<.1?(rem/.1)*(rem/.1)*(3-2*rem/.1):1, bd=BORDER/1080*FS*sl;
          c.globalCompositeOperation='source-over'; c.save(); path(c,s,rho,OFF[0],OFF[1]); c.clip(); c.strokeStyle=BONE; c.lineWidth=2*bd; c.lineJoin='miter'; c.miterLimit=10; path(c,s,rho,OFF[0],OFF[1]); c.stroke(); c.restore(); }
        c.globalCompositeOperation='source-over'; }
      c.restore();
      c.setTransform(1,0,0,1,0,0); c.drawImage(SP,0,0); reset(c,px);
      c.font=SANS(6.4); c.fillStyle=INK; c.textAlign='left'; c.textBaseline='alphabetic';
      c.fillText(s===0?'CIRCLE':s===2?'RECTANGLE':'DIAMOND',FX,97);
    };
  } },

/* FILL SILHOUETTE. A bonsai, drawn in full, on a grey sweep. PIXEL_FX.solidmatte mixes every pixel the layer covers toward the
   Fill colour by Amount and leaves the alpha alone, so the soft edge survives. Fill Ink; Amount steps 0, .25, .5, .75, 1. */
{ id:'solidmatte', name:'Fill Silhouette', section:'Keying', isNew:true, still:2.4,
  line:'Everything inside the layer’s outline is flooded with one colour, leaving a clean silhouette with the same edge.',
  make(px){
    const P=4.2, FILL=INK, R=rng(1207);
    const [D,dx]=sheet(px); dx.setTransform(px/100,0,0,px/100,0,0);
    /* pot */
    dx.fillStyle='#3d4d5c'; dx.fillRect(25,89,5,3.4); dx.fillRect(62,89,5,3.4);
    const pg=dx.createLinearGradient(20,0,72,0); pg.addColorStop(0,'#6b8396'); pg.addColorStop(.55,'#4d6578'); pg.addColorStop(1,'#33434f');
    dx.fillStyle=pg; poly(dx,[19,80.6, 73,80.6, 70.6,89.6, 21.4,89.6]); dx.fill();
    dx.fillStyle='#84a0b3'; dx.fillRect(17.4,78.2,57.2,2.8); dx.fillStyle='#2a3640'; dx.fillRect(19,81,54,.9);
    /* soil and moss */
    dx.fillStyle='#4a3a2c'; poly(dx,[19,78.4, 73,78.4, 70,76.8, 22,76.8]); dx.fill();
    dx.fillStyle='#5f7a35'; dx.beginPath(); dx.ellipse(46,77.2,21,2.3,0,Math.PI,TAU); dx.fill();
    /* trunk: a tapering stroke along its spine, then bark */
    const SP=[[45,78],[41.6,70.6],[43.4,63.6],[51,57.4],[57.4,50.6],[55.2,42.4],[48.6,36.6],[47.4,29.4],[50.6,23.4]], WD=[10.4,9.6,8.6,7.6,6.6,5.6,4.6,3.6,2.8];
    const trunk=(col,sh,ox)=>{ dx.strokeStyle=col; dx.lineCap='round'; dx.lineJoin='round'; for(let i=1;i<SP.length;i++){ const o=ox*WD[i]; dx.lineWidth=WD[i]*sh; dx.beginPath(); dx.moveTo(SP[i-1][0]+o,SP[i-1][1]); dx.lineTo(SP[i][0]+o,SP[i][1]); dx.stroke(); } };
    trunk('#4b3a2e',1,0); trunk('#6e5644',.55,-.16); trunk('#86694f',.16,-.3);
    dx.strokeStyle='#4b3a2e'; dx.lineWidth=2.6; dx.beginPath(); dx.moveTo(51,57.4); dx.quadraticCurveTo(62,55,71,51); dx.stroke();
    dx.lineWidth=2.2; dx.beginPath(); dx.moveTo(55.2,42.4); dx.quadraticCurveTo(42,41,29,39.6); dx.stroke();
    dx.lineWidth=1.8; dx.beginPath(); dx.moveTo(48.6,36.6); dx.quadraticCurveTo(58,33,66,31.6); dx.stroke();
    dx.strokeStyle='#8a7059'; dx.lineWidth=.45; for(let i=0;i<14;i++){ const k=1+Math.floor(R()*5), a=SP[k], b=SP[k+1], f=R(); dx.beginPath(); dx.moveTo(lerp(a[0],b[0],f)-1,lerp(a[1],b[1],f)); dx.lineTo(lerp(a[0],b[0],f+.25)-.6,lerp(a[1],b[1],f+.25)); dx.stroke(); }
    /* foliage pads: a cloud of discs, dark beneath, lit on top, then leaf stipple */
    const pad=(x,y,w,h)=>{ const discs=[]; for(let i=0;i<26;i++){ const a=R()*TAU, r=Math.sqrt(R()); discs.push([x+Math.cos(a)*r*w*.5,y+Math.sin(a)*r*h*.42,h*(.32+R()*.22)]); }
      dx.fillStyle='#2e4220'; for(const q of discs){ dx.beginPath(); dx.arc(q[0],q[1]+h*.12,q[2],0,TAU); dx.fill(); }
      dx.fillStyle='#4d6b2c'; for(const q of discs){ dx.beginPath(); dx.arc(q[0],q[1],q[2]*.92,0,TAU); dx.fill(); }
      for(let i=0;i<120;i++){ const q=discs[Math.floor(R()*discs.length)], a=R()*TAU, r=R()*q[2]; const yy=q[1]+Math.sin(a)*r; const lit=(q[1]-yy)/q[2];
        dx.fillStyle=lit>.2?(R()<.5?'#97b257':'#7c9a44'):(R()<.5?'#5b7a33':'#3b5526'); dx.beginPath(); dx.arc(q[0]+Math.cos(a)*r,yy,.45+R()*.5,0,TAU); dx.fill(); } };
    pad(73,49,24,9.5); pad(27,37.6,24,9); pad(65,29.4,17,7); pad(50,20.6,27,11.5);
    /* the fill, mixed in by Amount over the layer's own alpha (source-atop keeps it) */
    const LV=[0,.25,.5,.75,1].map(a=>{ const [C,x]=sheet(px); x.drawImage(D,0,0); if(a>0){ x.globalCompositeOperation='source-atop'; x.globalAlpha=a; x.fillStyle=FILL; x.fillRect(0,0,px,px); } return C; });
    return (c,t)=>{
      const u=mod(t,P), k=u<.8?0:u<1.7?Math.min(4,1+Math.floor((u-.8)/.3)):u<3.6?4:0;
      reset(c,px); c.fillStyle='#c9c3b6'; c.fillRect(0,0,100,100); c.fillStyle='#bdb6a7'; c.fillRect(0,92.4,100,7.6);
      c.setTransform(1,0,0,1,0,0); c.drawImage(LV[k],0,0); reset(c,px);
      c.fillStyle=FILL; c.fillRect(80,4,4.6,4.6); c.font=MONO(4.6); c.fillStyle=INK; c.textAlign='right'; c.textBaseline='middle'; c.fillText((k/4).toFixed(2),96,6.5);
    };
  } },

/* SPILL SUPPRESSOR. Broadcast bench: a pair of cream studio headphones shot on green and keyed over black, their outer edges green
   from the screen behind them. Gentle method, Amount 0 then 100 %: PIXEL_FX.spillsuppressor caps green at the larger of red and blue,
   pixel by pixel, and nothing else moves. The sampler reads one pixel on the left cup's edge: its R and B never change, its G drops
   to R. (A scope was left out: the set already has a vectorscope and two RGB parades.) */
{ id:'spillsuppressor', name:'Spill Suppressor', section:'Keying', isNew:true, still:2.0,
  line:'Takes the green a green screen throws onto a keyed subject’s edges back out, without touching the cut-out.',
  make(px){
    const P=4.2, N=Math.min(400,px), AMT=1, ROT=-.12, SCL=1.16, OX=50, OY=56;
    const [V,v]=sheet(N); v.setTransform(N/100,0,0,N/100,0,0); v.translate(OX,OY); v.scale(SCL,SCL); v.rotate(ROT); v.translate(-OX,-OY);
    const cream=(y0,y1)=>{ const g=v.createLinearGradient(0,y0,0,y1); g.addColorStop(0,'#f1ece1'); g.addColorStop(.5,'#d8d1c2'); g.addColorStop(1,'#9b9486'); return g; };
    const rr=(x,y,w,h,r)=>{ v.beginPath(); v.moveTo(x+r,y); v.arcTo(x+w,y,x+w,y+h,r); v.arcTo(x+w,y+h,x,y+h,r); v.arcTo(x,y+h,x,y,r); v.arcTo(x,y,x+w,y,r); v.closePath(); };
    /* the cable, from the right cup off the bottom edge */
    v.strokeStyle='#2b2927'; v.lineWidth=1.5; v.lineCap='round'; v.beginPath(); v.moveTo(82,79.6); v.bezierCurveTo(83,91,90,93,94,106); v.stroke();
    /* headband and its pad */
    v.fillStyle=cream(20,50); v.beginPath(); v.arc(50,56,35,Math.PI+.28,TAU-.28); v.arc(50,56,29.5,TAU-.28,Math.PI+.28,true); v.closePath(); v.fill();
    v.fillStyle='#3a3734'; v.beginPath(); v.arc(50,56,29.6,Math.PI+.62,TAU-.62); v.arc(50,56,26.6,TAU-.62,Math.PI+.62,true); v.closePath(); v.fill();
    v.strokeStyle='rgba(120,112,98,.55)'; v.lineWidth=.35; v.beginPath(); v.arc(50,56,32.3,Math.PI+.34,TAU-.34); v.stroke();
    /* sliders, yokes, cups and ear pads */
    v.fillStyle='#8f8b84'; v.fillRect(17.2,45.6,2.4,9); v.fillRect(80.4,45.6,2.4,9);
    v.fillStyle='#5a5752'; rr(12.4,53,14,3,1.4); v.fill(); rr(73.6,53,14,3,1.4); v.fill();
    v.fillStyle=cream(55,80); rr(10.6,55,15.4,25,6.6); v.fill(); rr(74,55,15.4,25,6.6); v.fill();
    v.fillStyle='#2f2d2b'; rr(24.4,57,5.4,21,2.6); v.fill(); rr(70.2,57,5.4,21,2.6); v.fill();
    v.strokeStyle='rgba(110,102,90,.6)'; v.lineWidth=.35; rr(13.2,58.6,10.2,17.8,4.6); v.stroke(); rr(76.6,58.6,10.2,17.8,4.6); v.stroke();
    const d=v.getImageData(0,0,N,N).data, n=N*N, A=new Float32Array(n);
    for(let i=0;i<n;i++) A[i]=d[i*4+3]/255;
    /* the spill: strongest within a few units of an edge, plus a little everywhere */
    const bA=gauss(A,N,N,N*.022,true), L=new Float32Array(n);
    for(let i=0;i<n;i++){ if(A[i]<=0) continue; const e=clamp((1-bA[i])*2.2); L[i]=.12+.88*e*e; }
    const before=new Uint8ClampedArray(n*4), after=new Uint8ClampedArray(n*4);
    /* green light added on top of the subject's own colour: a lot of green, a touch of the rest */
    for(let i=0;i<n;i++){ const j=i*4; if(A[i]<=0) continue;
      const s=L[i], r=Math.min(255,d[j]+8*s), g=Math.min(255,d[j+1]+78*s), b=Math.min(255,d[j+2]+10*s);
      before[j]=r; before[j+1]=g; before[j+2]=b; before[j+3]=d[j+3];
      const lim=Math.max(r,b), g2=g>lim?g-(g-lim)*AMT:g; after[j]=r; after[j+1]=g2; after[j+2]=b; after[j+3]=d[j+3]; }
    const toC=a=>{ const [C,x]=sheet(N), im=x.createImageData(N,N); im.data.set(a); x.putImageData(im,0,0); return C; };
    const BEF=toC(before), AFT=toC(after);
    /* the sampled pixel: on the left cup's outer edge, where the spill is heaviest */
    const cs=Math.cos(ROT), sn=Math.sin(ROT), at=(x,y)=>[OX+SCL*(cs*(x-OX)-sn*(y-OY)), OY+SCL*(sn*(x-OX)+cs*(y-OY))];
    const s0=at(11.9,67), sx0=Math.round(s0[0]*N/100), sy0=Math.round(s0[1]*N/100); let si=sy0*N+sx0;
    for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){ const i=(sy0+dy)*N+sx0+dx; if(A[i]>=1&&L[i]>L[si]) si=i; }
    const SP=[(si%N+.5)*100/N,(Math.floor(si/N)+.5)*100/N], SB=[before[si*4],before[si*4+1],before[si*4+2]], SA=[after[si*4],after[si*4+1],after[si*4+2]];
    const p3=v=>String(Math.round(v)).padStart(3,' ');
    return (c,t)=>{
      const u=mod(t,P), f=Math.floor(u*25)/25, a=f<1?0:f<1.32?seg(f,1,1.32):f<3.5?1:0;
      reset(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100);
      c.drawImage(BEF,0,0,100,100); if(a>0){ c.globalAlpha=a; c.drawImage(AFT,0,0,100,100); c.globalAlpha=1; }
      /* the sampler: a square on the pixel, its colour and its values */
      const r=lerp(SB[0],SA[0],a), g=lerp(SB[1],SA[1],a), b=lerp(SB[2],SA[2],a);
      c.strokeStyle=TEXT; c.lineWidth=.45; c.strokeRect(SP[0]-1.6,SP[1]-1.6,3.2,3.2);
      c.beginPath(); c.moveTo(SP[0]-1.6,SP[1]); c.lineTo(SP[0]-4.4,SP[1]); c.moveTo(SP[0],SP[1]+1.6); c.lineTo(SP[0],SP[1]+4.4); c.stroke();
      c.fillStyle=rgbS(r,g,b); c.fillRect(4,88.4,7,7); c.strokeStyle='#5d6470'; c.lineWidth=.35; c.strokeRect(4,88.4,7,7);
      c.font=MONO(4.9); c.textAlign='left'; c.textBaseline='middle'; c.fillStyle=DIM; c.fillText('R'+p3(r)+' G'+p3(g)+' B'+p3(b),13.4,92.2);
      c.textAlign='left'; c.fillStyle=TEXT; c.fillText('SPILL '+Math.round(a*100)+'%',4,6.4);
    };
  } }

);
})();
