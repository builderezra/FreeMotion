/* FreeMotion effect pictures, artist 20 (c20): seven Generative tiles, no photographs. Every subject is made here.
   Bolts (type 'lightning') is the same effect as the kept 'bolts' tile (truth.html's ALIAS bolts -> lightning), so the alternative
   drawn here was taken out by the art director: six tiles remain. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; };
const canvasN=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const toCanvas=(w,h,data)=>{ const [C,x]=canvasN(w,h), im=x.createImageData(w,h); im.data.set(data); x.putImageData(im,0,0); return C; };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; };
const poly=(c,p)=>{ c.beginPath(); p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])); c.closePath(); };

window.FX_TILES.push(

/* GRUNGE. Graded still, stepped A/B. A station wall drawn here (painted plaster over bevelled white tiles, an ink liner, a green band),
   one 1080 frame. PIXEL_FX.grunge's own loop, hash for hash: Grain size 12 px, Darkness 1, Pattern 0, Boil 0. Amount steps .2, .35, .5
   (the default) on the SAME pattern (the threshold is Amount x .55, so a higher Amount only adds cells), then Dirt cuts from Black to Rust. */
{ id:'grunge', name:'Grunge', section:'Generative', isNew:true, still:2.2,
  line:'Specks of dirt settle over the picture and build up as Amount rises; Dirt can turn them rust brown.',
  make(px){
    const P=4.8, N=Math.min(px,420), GR=12, PROJ=1080;
    /* the wall, in 0..100 units */
    const [S,sx]=canvasN(N); sx.setTransform(N/100,0,0,N/100,0,0);
    sx.fillStyle='#8d877b'; sx.fillRect(0,0,100,100);
    const R=rng(14020), TW=14.6, TH=7.3, GAP=.55;
    const tile=(X,Y,W,H,kind,r)=>{
      const base=kind==='white'?[236-r*7,233-r*7,225-r*8]:kind==='green'?[30+r*5,92+r*6,78+r*5]:[27,25,22];
      const col=(k,a)=>'rgba('+Math.round(base[0]*k)+','+Math.round(base[1]*k)+','+Math.round(base[2]*k)+','+(a===undefined?1:a)+')';
      const g=sx.createLinearGradient(X,Y,X,Y+H); g.addColorStop(0,col(1.03)); g.addColorStop(.55,col(1)); g.addColorStop(1,col(.9));
      sx.fillStyle=g; sx.fillRect(X,Y,W,H);
      const b=Math.min(.6,H*.14);
      sx.fillStyle=kind==='white'?'rgba(255,255,252,.75)':'rgba(255,255,255,.18)'; sx.fillRect(X,Y,W,b); sx.fillRect(X,Y,b,H);
      sx.fillStyle='rgba(0,0,0,'+(kind==='white'?.13:.28)+')'; sx.fillRect(X,Y+H-b,W,b); sx.fillRect(X+W-b,Y,b,H);
    };
    /* painted plaster above the tiles: the plainest surface, where dirt shows first */
    const pg=sx.createLinearGradient(0,0,0,34); pg.addColorStop(0,'#d9d3c4'); pg.addColorStop(1,'#e4dfd2'); sx.fillStyle=pg; sx.fillRect(0,0,100,34);
    let y=34;
    for(let r=0;y<100;r++){
      const kind=r===0?'liner':(r===5||r===6)?'green':'white', h=kind==='liner'?3.1:TH, off=((r%2)*TW/2)-4.1;
      for(let x=off-TW;x<100;x+=TW) tile(x+GAP/2,y+GAP/2,TW-GAP,h-GAP,kind,R());
      y+=h;
    }
    /* one light, off frame to the upper left */
    const lg=sx.createLinearGradient(0,0,100,100); lg.addColorStop(0,'rgba(255,248,236,.05)'); lg.addColorStop(1,'rgba(18,14,8,.2)'); sx.fillStyle=lg; sx.fillRect(0,0,100,100);
    sx.setTransform(1,0,0,1,0,0);
    const src=sx.getImageData(0,0,N,N).data;
    /* the kernel's two hashes, per cell of the 1080 frame */
    const NC=Math.ceil(PROJ/GR), CN=new Float32Array(NC*NC), CN2=new Float32Array(NC*NC);
    for(let gy=0;gy<NC;gy++) for(let gx=0;gx<NC;gx++){
      let h=(gx*73856093)^(gy*19349663); h=h^(h>>>13); h=(h*1274126177)>>>0; CN[gy*NC+gx]=(h>>>8)/16777216;
      let h2=(gx*83492791)^(gy*2654435761); h2=h2^(h2>>>15); h2=(h2*40503)>>>0; CN2[gy*NC+gx]=(h2>>>8)/16777216;
    }
    const cellOf=new Int32Array(N*N);
    for(let yy=0;yy<N;yy++) for(let xx=0;xx<N;xx++){ const X=Math.floor((xx+.5)*PROJ/N), Y=Math.floor((yy+.5)*PROJ/N); cellOf[yy*N+xx]=Math.floor(Y/GR)*NC+Math.floor(X/GR); }
    const state=(amt,tint)=>{
      const thr=amt*.55, mot=amt*.15, o=new Uint8ClampedArray(src.length);
      for(let i=0,j=0;i<N*N;i++,j+=4){
        const cI=cellOf[i], n=CN[cI], n2=CN2[cI]; let mul=1-mot*(n-.5); const hit=n<thr;
        if(hit) mul*=.25+.6*n2; if(mul<0) mul=0;
        let r=src[j]*mul, g=src[j+1]*mul, b=src[j+2]*mul;
        if(tint&&hit){ const w=(1-mul)*.75; r+=(tint[0]-r)*w; g+=(tint[1]-g)*w; b+=(tint[2]-b)*w; }
        o[j]=r; o[j+1]=g; o[j+2]=b; o[j+3]=255;
      }
      return toCanvas(N,N,o);
    };
    const RUST=[122,60,24], ST=[state(.2,null),state(.35,null),state(.5,null),state(.5,RUST)];
    const LAB=['AMOUNT 0.2','AMOUNT 0.35','AMOUNT 0.5','DIRT RUST'];
    return (c,t)=>{
      const u=mod(t,P), k=u<.6?-1:u<1.05?0:u<1.5?1:u<2.75?2:u<4.1?3:-1;
      reset(c,px);
      c.drawImage(k<0?S:ST[k],0,0,100,100);
      tab(c,3.5,89.5,k<0?'AMOUNT 0':LAB[k],5,INK,BONE);
    };
  } },

/* HONEYCOMB. Cut paper: a match shirt cut from vermilion, an ink collar, a bone number, as its own layer over a bone ground.
   PIXEL_FX.hexarray's lattice (honeycomb966, which is the plain loop at Angle 0) runs on that layer only, because the kernel skips
   pixels the layer does not cover. Colour ink, Line weight .22, on a 1080 frame: Cell size 64, then 40, then Fill cells 55 %. */
{ id:'hexarray', name:'Honeycomb', section:'Generative', isNew:true, still:2.2,
  line:'A honeycomb of lines is drawn over the layer; Cell size sets how big, and Fill cells tints each cell by its own amount.',
  make(px){
    const P=4.6, N=Math.min(px,380), PROJ=1080, K=N/PROJ;
    const [LC,lx]=canvasN(N); lx.setTransform(N/100,0,0,N/100,0,0);
    lx.translate(57,58); lx.rotate(-4.5*TAU/360); lx.translate(-57,-58);
    const BODY=[[45,9.5],[25.5,15],[6.5,33.5],[16,46],[27.5,38.6],[29,108],[88.5,108],[88.6,38.2],[100.5,45.4],[109,31.8],[90.8,14.6],[70.6,10.2],[58.2,25.8]];
    lx.fillStyle=VERM; poly(lx,BODY); lx.fill();
    lx.fillStyle=INK;
    poly(lx,[[45,9.5],[58.2,25.8],[70.6,10.2],[66.6,10],[58.1,20.6],[49.2,9.6]]); lx.fill();
    poly(lx,[[6.5,33.5],[16,46],[19.2,43.8],[9.9,31.2]]); lx.fill();
    poly(lx,[[100.5,45.4],[109,31.8],[105.6,29.6],[97.4,43.2]]); lx.fill();
    lx.fillStyle=BONE; lx.font=SANS(40); lx.textAlign='center'; lx.textBaseline='alphabetic'; lx.fillText('21',58.5,83);
    lx.setTransform(1,0,0,1,0,0);
    const L=lx.getImageData(0,0,N,N).data, IR=0x16, IG=0x13, IB=0x0f;
    const state=(sP,tP,fill)=>{
      const s=sP*K, rh=s*.8660254, band=Math.max(1,s*tP), o=new Uint8ClampedArray(L);
      for(let y=0;y<N;y++){ const brow=Math.round(y/rh);
        for(let x=0;x<N;x++){ const idx=(y*N+x)*4; if(o[idx+3]===0) continue;
          let d1=1e20, d2=1e20, nr=0, nc=0;
          for(let dr=-1;dr<=1;dr++){ const r=brow+dr, ox=(r&1)?s*.5:0, bc=Math.round((x-ox)/s);
            for(let dc=-1;dc<=1;dc++){ const cc=bc+dc, ex=x-(cc*s+ox), ey=y-r*rh, dist=Math.sqrt(ex*ex+ey*ey);
              if(dist<d1){ d2=d1; d1=dist; nr=r; nc=cc; } else if(dist<d2) d2=dist; } }
          const diff=d2-d1; let a=0;
          if(diff<band){ a=clamp(1-diff/band); }
          if(fill>0){ let h=Math.imul(nr,73856093)^Math.imul(nc,19349663); h=Math.imul(h^(h>>>13),1274126177); h=(h^(h>>>16))>>>0; const f=fill*(h/4294967295); if(f>0) a=a>0?1-(1-f)*(1-a):f; }
          if(!(a>0)) continue; const ia=1-a;
          o[idx]=o[idx]*ia+IR*a; o[idx+1]=o[idx+1]*ia+IG*a; o[idx+2]=o[idx+2]*ia+IB*a;
        } }
      return toCanvas(N,N,o);
    };
    const PLAIN=toCanvas(N,N,L), ST=[state(64,.22,0),state(40,.22,0),state(40,.22,.55)];
    const LAB=['CELL 64','CELL 40','FILL 55%'];
    return (c,t)=>{
      const u=mod(t,P), k=u<.55?-1:u<1.65?0:u<2.7?1:u<4.05?2:-1;
      reset(c,px); c.fillStyle=BONE; c.fillRect(0,0,100,100);
      c.drawImage(k<0?PLAIN:ST[k],0,0,100,100);
      if(k>=0) tab(c,3.5,4,LAB[k],4.6,INK,BONE);
    };
  } },

/* LASER BEAM. Viewer overlay on a 1440 x 1080 frame. CANVAS_FX.laserbeam's four bands, added ('lighter'), round at both ends:
   Glow's two at 6 and 2.6 widths (x .08 and .22 of Glow 70), the beam at .8, a white core a fifth as wide. Beam width 40 px,
   Pulse 0. Draw on is keyframed 0 -> 100 (the diamonds); then the End anchor is dragged and the beam follows; Draw on 100 -> 0. */
{ id:'laserbeam', name:'Laser Beam', section:'Generative', isNew:true, still:1.7,
  line:'A glowing beam runs between two points you place; keyframe Draw on and it shoots from one to the other.',
  make(px){
    const P=4.4, FX=3, FY=3, FW=94, FH=94*3/4, S=FW/1440, W=44*S, GLOW=.7;
    const at=(xp,yp)=>[FX+FW*xp/100,FY+FH*yp/100];
    const A=at(11,72), B0=at(88,24), B1=at(90,66);
    const band=(c,x1,y1,x2,y2,w,al,fill)=>{ if(!(al>0)||!(w>0)) return; const r=w/2, a=Math.atan2(y2-y1,x2-x1), q=Math.PI/2;
      c.globalAlpha=Math.min(1,al); c.fillStyle=fill; c.beginPath(); c.arc(x2,y2,r,a-q,a+q); c.arc(x1,y1,r,a+q,a+3*q); c.closePath(); c.fill(); };
    const K=[.45,1.05,3.55,3.9];   /* Draw on keyframes: 0, 100, 100, 0 */
    const drawOn=u=>u<K[0]?0:u<K[1]?seg(u,K[0],K[1]):u<K[2]?1:u<K[3]?1-seg(u,K[2],K[3]):0;
    const endP=u=>{ const m=u<2.05?0:u<2.75?E.inOut(seg(u,2.05,2.75)):u<4.0?1:1-E.inOut(seg(u,4.0,4.35)); return [lerp(B0[0],B1[0],m),lerp(B0[1],B1[1],m)]; };
    const sq=(c,x,y,s,col)=>{ c.fillStyle=col; c.fillRect(x-s/2,y-s/2,s,s); };
    const dia=(c,x,y,s)=>{ c.beginPath(); c.moveTo(x,y-s); c.lineTo(x+s,y); c.lineTo(x,y+s); c.lineTo(x-s,y); c.closePath(); c.fill(); };
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      /* the frame */
      c.fillStyle='#0b0f17'; c.fillRect(FX,FY,FW,FH);
      c.strokeStyle=DIM; c.lineWidth=.5; c.strokeRect(FX,FY,FW,FH);
      const d=drawOn(u), B=endP(u), ex=A[0]+(B[0]-A[0])*d, ey=A[1]+(B[1]-A[1])*d;
      if(d>0){
        c.save(); c.beginPath(); c.rect(FX,FY,FW,FH); c.clip();
        c.globalCompositeOperation='lighter';
        band(c,A[0],A[1],ex,ey,W*6,GLOW*.08,VERM);
        band(c,A[0],A[1],ex,ey,W*2.6,GLOW*.22,VERM);
        band(c,A[0],A[1],ex,ey,W,.8,VERM);
        band(c,A[0],A[1],ex,ey,Math.max(1/(px/100),W*.22),.95,'#ffffff');
        c.restore(); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      }
      /* Start and End anchors */
      sq(c,A[0],A[1],2.6,TEAL); c.strokeStyle=TEAL; c.lineWidth=.5; c.strokeRect(B[0]-1.6,B[1]-1.6,3.2,3.2);
      sq(c,B[0],B[1],1.4,TEAL);
      /* the Draw on track */
      const TX0=26, TX1=95, TY=82, xOf=v=>lerp(TX0,TX1,v/P);
      c.strokeStyle=HAIR; c.lineWidth=.6; c.beginPath(); c.moveTo(TX0,TY); c.lineTo(TX1,TY); c.stroke();
      c.fillStyle=YEL; for(const k of K) dia(c,xOf(k),TY,1.9);
      c.fillStyle=TEXT; c.fillRect(xOf(u)-.3,TY-6,.6,12);
      c.font=MONO(4.4); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='middle'; c.fillText('DRAW ON',3,TY+.2);
      c.font=MONO(6.4); c.fillStyle=TEXT; c.fillText(String(Math.round(d*100)).padStart(3,' ')+'%',3,93);
    };
  } },

/* BOLTS (type 'lightning') was drawn here too and has been taken out by the art director (ad): the kept 'bolts' tile already IS this effect (truth.html ALIAS bolts -> lightning), so the menu showed two Bolts. */

/* NOISE. Broadcast bench. A 360 x 196 px piece of a 1920 x 1080 frame holding a black-to-white ramp, and under it the waveform of exactly
   those pixels. PIXEL_FX.noise's own hash on cell = row x 1920 + column, at 24 Hz (twelve frames of it are cycled). Grain size 4 px.
   Amount steps 35 % (the default) then 70 %, then Colour 60 %; the trace thickens by the same +-28 and +-56 levels the kernel adds. */
{ id:'noise', name:'Noise', section:'Generative', isNew:true, still:2.3,
  line:'Random static is added over the whole picture and changes many times a second.',
  make(px){
    const P=4.4, RW=180, RH=98, PX0=780, PY0=440, SC=2, GRAIN=4, PW=1920, NF=12;
    const X0=4, Y0=4, W=92, H=W*RH/RW;          /* the picture: 92 x 49.8 units */
    const SX0=4, SY0=59.5, SW=92, SH=31, WW=RW, WH=64;
    const ramp=new Float32Array(RW); for(let x=0;x<RW;x++){ const v=x/(RW-1); ramp[x]=255*clamp((v-.06)/.88); }
    const cellAt=new Int32Array(RW*RH);
    for(let y=0;y<RH;y++) for(let x=0;x<RW;x++){ const X=PX0+x*SC, Y=PY0+y*SC; cellAt[y*RW+x]=Math.floor(Y/GRAIN)*PW+Math.floor(X/GRAIN); }
    const frame=(amount,chroma,fr)=>{
      const amt=amount/100*160, o=new Uint8ClampedArray(RW*RH*4), cnt=new Float32Array(WW*WH);
      for(let i=0,j=0;i<RW*RH;i++,j+=4){
        const v=ramp[i%RW]; let r=v, g=v, b=v;
        if(amt>0){ const cell=cellAt[i]; let h=(cell*374761393+fr*668265263)|0; h=(h^(h>>13))*1274126177; h=(h^(h>>16));
          const n=((h&255)/255-.5)*amt;
          if(chroma<=0){ r+=n; g+=n; b+=n; }
          else { let h2=(h^0x5bf03635)*2246822519; h2=(h2^(h2>>15)); let h3=(h^0x27d4eb2f)*3266489917; h3=(h3^(h3>>15));
            r+=n+((h2&255)/255-.5)*amt*chroma; g+=n; b+=n+((h3&255)/255-.5)*amt*chroma; } }
        o[j]=r; o[j+1]=g; o[j+2]=b; o[j+3]=255;
        const L=.299*o[j]+.587*o[j+1]+.114*o[j+2], row=Math.round((1-L/255)*(WH-1)), col=Math.floor((i%RW)*WW/RW);
        cnt[row*WW+col]+=1;
      }
      /* the trace: a little vertical spread, as a scope's own beam has */
      const tr=new Uint8ClampedArray(WW*WH*4), cap=RH*RW/WW*.32;
      for(let y=0;y<WH;y++) for(let x=0;x<WW;x++){
        const v=cnt[y*WW+x]*.5+(y>0?cnt[(y-1)*WW+x]:0)*.25+(y<WH-1?cnt[(y+1)*WW+x]:0)*.25, a=Math.pow(Math.min(1,v/cap),.55), j=(y*WW+x)*4;
        tr[j]=238; tr[j+1]=242; tr[j+2]=248; tr[j+3]=255*a; }
      return [toCanvas(RW,RH,o),toCanvas(WW,WH,tr)];
    };
    const CLEAN=frame(0,0,0), ST=[[35,0],[70,0],[70,.6]].map(([a,ch])=>{ const L=[]; for(let f=0;f<NF;f++) L.push(frame(a,ch,f*7+3)); return L; });
    const LAB=['AMOUNT 35%','AMOUNT 70%','COLOUR 60%'];
    return (c,t)=>{
      const u=mod(t,P), k=u<.55?-1:u<1.6?0:u<2.75?1:u<3.85?2:-1, f=Math.floor(u*24)%NF, F=k<0?CLEAN:ST[k][f];
      reset(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100);
      c.imageSmoothingEnabled=false; c.drawImage(F[0],X0,Y0,W,H); c.imageSmoothingEnabled=true;
      /* the scope: graticule at 0, 50 and 100 % */
      c.fillStyle='#2a2f38'; for(const q of [0,.5,1]) c.fillRect(SX0,SY0+(1-q)*SH-.2,SW,.4);
      c.fillStyle='#1c2027'; for(const q of [.25,.75]) c.fillRect(SX0,SY0+(1-q)*SH-.15,SW,.3);
      c.drawImage(F[1],SX0,SY0-SH/(WH-1)*.5,SW,SH*(WH)/(WH-1));
      c.font=MONO(4.6); c.textAlign='left'; c.textBaseline='middle'; c.fillStyle=k<0?'#5d6573':TEXT;
      c.fillText(k<0?'NOISE OFF':LAB[k],4,96.2);
      c.fillStyle='#5d6573'; c.textAlign='right'; c.fillText('GRAIN 4',96,96.2);
    };
  } },

/* POSTERIZE. Graded still, stepped A/B. A midday sky with a contrail and a white wind turbine lit from the right, drawn here, so every
   gradient is smooth. PIXEL_FX.posterize's own default loop (Quantise RGB, Band spacing 1, Mix 1, Band edges 0): each channel rounded to
   Levels evenly spaced values, which is why the sky's blues break into bands of slightly different hue. Levels 8, then 5 (the default, held). */
{ id:'posterize', name:'Posterize', section:'Generative', isNew:true, still:2.2,
  line:'Smooth shading collapses into a few flat steps of colour; the fewer the levels, the bigger the steps.',
  make(px){
    const P=4.4, N=Math.min(px,380), src=new Uint8ClampedArray(N*N*4);
    const A=[52,30], B=[106,15.5], AB=[B[0]-A[0],B[1]-A[1]], LEN=Math.hypot(AB[0],AB[1]), UX=AB[0]/LEN, UY=AB[1]/LEN;
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const ux=(x+.5)*100/N, uy=(y+.5)*100/N, v=uy/100, h=ux/100, j=(y*N+x)*4;
      /* sky: deep at the zenith, paler toward the horizon and toward the sun's side (off frame, right) */
      const q=Math.pow(v,.85), lift=(1-v)*h*.16;
      let r=lerp(22,158,q)+lift*120, g=lerp(70,196,q)+lift*110, b=lerp(156,228,q)+lift*60;
      /* the contrail: thin and bright behind the plane, wider and fainter as it ages */
      const px0=ux-A[0], py0=uy-A[1], s=(px0*UX+py0*UY)/LEN, d=Math.abs(-px0*UY+py0*UX);
      if(s>-.01&&s<1.05){ const w=.4+2.4*Math.max(0,s), I=.85*(1-.5*Math.max(0,s))*Math.exp(-(d/w)*(d/w))*clamp(s/.02); r+=(246-r)*I; g+=(248-g)*I; b+=(252-b)*I; }
      src[j]=r; src[j+1]=g; src[j+2]=b; src[j+3]=255;
    }
    /* a wind turbine in the same light (sun off frame, right): a tapered white tower, the nacelle, the hub and three blades */
    const [SC,sc]=canvasN(N); { const im=sc.createImageData(N,N); im.data.set(src); sc.putImageData(im,0,0); }
    sc.setTransform(N/100,0,0,N/100,0,0);
    const HX=30, HY=40.5;
    const tg=sc.createLinearGradient(31,0,39.6,0); tg.addColorStop(0,'rgb(112,121,136)'); tg.addColorStop(.42,'rgb(190,195,203)'); tg.addColorStop(.85,'rgb(240,240,236)'); tg.addColorStop(1,'rgb(226,227,224)');
    sc.fillStyle=tg; poly(sc,[[33.7,41],[37.3,41],[39.6,104],[31,104]]); sc.fill();
    const blade=(ang)=>{ sc.save(); sc.translate(HX,HY); sc.rotate(ang*TAU/360);
      const bg=sc.createLinearGradient(0,-2,0,2); bg.addColorStop(0,'rgb(246,246,243)'); bg.addColorStop(.55,'rgb(214,218,224)'); bg.addColorStop(1,'rgb(140,148,162)');
      sc.fillStyle=bg; sc.beginPath(); sc.moveTo(1.6,-1.3); sc.quadraticCurveTo(7,-2.3,15,-1.5); sc.lineTo(47,-.25); sc.lineTo(47,.25); sc.lineTo(15,1.1); sc.quadraticCurveTo(6,1.6,1.6,1.3); sc.closePath(); sc.fill(); sc.restore(); };
    [-74,46,166].forEach(blade);
    const ng=sc.createLinearGradient(0,37.6,0,43.6); ng.addColorStop(0,'rgb(246,246,242)'); ng.addColorStop(.6,'rgb(205,209,216)'); ng.addColorStop(1,'rgb(128,136,150)');
    sc.fillStyle=ng; sc.beginPath(); sc.roundRect(31,37.8,13.2,5.6,1.6); sc.fill();
    const hg=sc.createRadialGradient(HX+.7,HY-.9,.2,HX,HY,2.6); hg.addColorStop(0,'rgb(250,250,248)'); hg.addColorStop(1,'rgb(150,157,170)');
    sc.fillStyle=hg; sc.beginPath(); sc.ellipse(HX,HY,2.1,2.5,0,0,TAU); sc.fill();
    /* the plane, a speck at the head of its trail */
    sc.save(); sc.translate(A[0],A[1]); sc.rotate(Math.atan2(UY,UX)); sc.fillStyle='rgb(70,78,92)'; sc.fillRect(-1.4,-.3,2,.6); sc.fillRect(-.6,-1,.5,2); sc.restore();
    sc.setTransform(1,0,0,1,0,0);
    src.set(sc.getImageData(0,0,N,N).data);
    const SRC=SC;
    const levels=q=>{ const step=255/(q-1), o=new Uint8ClampedArray(src.length); for(let i=0;i<src.length;i+=4){ o[i]=Math.round(Math.round(src[i]/step)*step); o[i+1]=Math.round(Math.round(src[i+1]/step)*step); o[i+2]=Math.round(Math.round(src[i+2]/step)*step); o[i+3]=255; } return toCanvas(N,N,o); };
    const Q=[8,5], ST=Q.map(levels);
    return (c,t)=>{
      const u=mod(t,P), k=u<.6?-1:u<1.35?0:u<3.6?1:-1;
      reset(c,px);
      c.drawImage(k<0?SRC:ST[k],0,0,100,100);
      if(k>=0) tab(c,72.5,89.5,'LEVELS '+Q[k],4.8,INK,BONE);
    };
  } },

/* RADIO WAVES. Chronophotograph plate: black and silver only, a ruled backdrop every 100 px of a 1080 frame, and a struck tuning fork.
   CANVAS_FX.radiowaves at Waves per second 1.5, Speed 200 px/s, Lifetime 3 s (the defaults), Width 16 px, Fade 100 %, Outlines,
   First frame Already full, colour silver, Draw: Behind the layer (the fork is a cut-out layer over the ruled backdrop layer, so the
   rings pass behind it). Each ring is the kernel's annulus, filled even-odd; the scale reads 0 to 600 px, where a ring's life ends.
   4 s is exactly six rings, so the loop has no seam. */
{ id:'radiowaves', name:'Radio Waves', section:'Generative', isNew:true, still:1.1,
  line:'Rings leave one point at a steady rate, travel outward and fade away.',
  make(px){
    const P=4, RATE=1.5, SPEED=200, LIFE=3, U=100/1080, WD=16*U, CX=27, CY=37, SIL='#d6d9de';
    /* the plate: rules and the fork, drawn once */
    const [PL,pl]=canvasN(px); pl.setTransform(px/100,0,0,px/100,0,0);
    pl.fillStyle='#000'; pl.fillRect(0,0,100,100);
    pl.fillStyle='#1b1c1f'; for(let i=-2;i<=8;i++){ const x=CX+i*100*U; if(x>0&&x<100) pl.fillRect(x-.18,0,.36,88); }
    pl.fillStyle='#2a2c30'; pl.fillRect(0,88,100,.4);
    pl.font=MONO(4.2); pl.textAlign='center'; pl.textBaseline='top';
    for(let i=0;i<=6;i++){ const x=CX+i*100*U; pl.fillStyle=i%2?'#3a3c41':'#8a8d93'; pl.fillRect(x-.25,88,.5,i%2?2:3.2); if(!(i%2)) { pl.fillStyle='#8a8d93'; pl.fillText(String(i*100),x,92.2); } }
    pl.textAlign='right'; pl.fillStyle='#55585e'; pl.fillText('PX',98.5,92.2);
    /* the fork, its own cut-out layer: a stem, a neck, two tines, lit from the left */
    const [FK,fk]=canvasN(px); fk.setTransform(px/100,0,0,px/100,0,0);
    { const pl=fk; pl.save(); pl.translate(CX,CY); pl.rotate(7*TAU/360);
    const TW=3.5, GAPF=4.4, TOPF=3.2, BEND=27.5, R0=GAPF/2, R1=GAPF/2+TW;
    pl.beginPath();
    pl.moveTo(-R1,TOPF); pl.lineTo(-R1,BEND); pl.arc(0,BEND,R1,Math.PI,0,true); pl.lineTo(R1,TOPF); pl.lineTo(R0,TOPF); pl.lineTo(R0,BEND); pl.arc(0,BEND,R0,0,Math.PI,false); pl.lineTo(-R0,TOPF); pl.closePath();
    const fg=pl.createLinearGradient(-R1,0,R1,0); fg.addColorStop(0,'#eceef1'); fg.addColorStop(.3,'#c3c6cb'); fg.addColorStop(.55,'#7d8187'); fg.addColorStop(.72,'#d0d3d8'); fg.addColorStop(1,'#8b8f95');
    pl.fillStyle=fg; pl.fill();
    const sg=pl.createLinearGradient(-1.7,0,1.7,0); sg.addColorStop(0,'#e6e8eb'); sg.addColorStop(.6,'#9a9ea4'); sg.addColorStop(1,'#6e7277');
    pl.fillStyle=sg; pl.fillRect(-1.6,BEND+R1-.6,3.2,49-(BEND+R1-.6));
    pl.beginPath(); pl.ellipse(0,49.2,2.4,1.2,0,0,TAU); pl.fill();
    pl.restore(); }
    const ring=(c,r,al)=>{ const ro=r+WD/2, ri=r-WD/2; if(ro<=.05) return; c.beginPath(); c.moveTo(CX+ro,CY); c.arc(CX,CY,ro,0,TAU); c.closePath(); if(ri>.05){ c.moveTo(CX+ri,CY); c.arc(CX,CY,ri,0,TAU); c.closePath(); } c.globalAlpha=al; c.fillStyle=SIL; c.fill('evenodd'); };
    return (c,t)=>{
      const u=mod(t,P);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.drawImage(PL,0,0);
      reset(c,px);
      c.save(); c.beginPath(); c.rect(0,0,100,88); c.clip();
      const hi=Math.floor(u*RATE+1e-9), lo=Math.floor((u-LIFE)*RATE+1e-9)+1;
      for(let n=lo;n<=hi;n++){ const age=u-n/RATE; if(!(age>=0&&age<LIFE)) continue; const al=Math.min(1,1-age/LIFE); if(al>1/510) ring(c,SPEED*age*U,al); }
      c.restore(); c.globalAlpha=1;
      /* Draw: Behind the layer, so the fork stands in front of its own rings */
      c.setTransform(1,0,0,1,0,0); c.drawImage(FK,0,0); reset(c,px);
    };
  } }

);
})();
