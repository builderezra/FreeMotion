/* FreeMotion effect pictures, redraws by artist 4 (f4). Every picture shows what the effect really produces; see each tile's note. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); };
const plate=(key,n)=>{ const [C,x]=photoCover(key,n); x.setTransform(1,0,0,1,0,0); return {C,x}; };
/* number plates never read: blanked on the source photograph, in its 0..100 units */
const PLATE_BLANK={ mclaren:[['#b4553a',[[77.6,54.4],[92.9,51.4],[94,57.8],[78.9,61]]]],
  tesla:[['#8ea2a8',[[72.4,58.2],[84.2,58.2],[84.2,63.8],[72.4,63.8]]]],
  revuelto:[['#18181b',[[19.6,63.1],[29.3,63.1],[29.3,66.7],[19.6,66.7]]],['#7f92a4',[[78.2,57.2],[86.6,57.2],[86.6,60],[78.2,60]]]] };
const noPlate=(key,n)=>{ const r=photoCover(key,n), x=r[1]; for(const pl of PLATE_BLANK[key]||[]){ x.fillStyle=pl[0]; x.beginPath(); pl[1].forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])); x.closePath(); x.fill(); } return r; };
const canvasN=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h; return [C,C.getContext('2d')]; };
/* damped settle, for a sheet or handle that overshoots and lands */
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
/* the integer row hash the real effects use, so a row's jitter is a hash of (row, frame) and nothing else */
const rowHash=(yy,frame)=>{ let h=Math.imul(yy*7919+frame*104729,374761393); h=Math.imul(h^(h>>13),1274126177); h=h^(h>>16); return (h&0xffff)/65536-.5; };
const lineHash=L=>{ let h=(Math.imul(L,374761393)^0x5bf03635)|0; h=Math.imul(h^(h>>13),1274126177); h=h^(h>>16); return (h&0xffff)/65536; };
const pHash=n=>{ n=Math.imul(n^(n>>>16),0x45d9f3b); n=Math.imul(n^(n>>>16),0x45d9f3b); n=n^(n>>>16); return (n>>>0)/4294967296; };

window.FX_TILES.push(

/* LIGHT LEAK. The real screen-blend formula, g=(1-d/R)^2*Amount in the default orange, drawn live as a screen gradient on his Tesla.
   Amount .9, Spread 170, Drift 300, Wander 200: the wander path is the effect's own sin/cos. */
{ id:'lightleak', name:'Light Leak', section:'Colouring', isNew:true, redrawn:true, still:2.3,
  line:'A soft orange glow washes over part of the shot and slowly drifts.',
  make(px){
    const P=4.4, [S]=noPlate('tesla',px);
    const AMT=.85, SPREAD=170, WANDER=2, SPEED=3, FALL=1.8*100/SPREAD, R=Math.hypot(100,100)/FALL, K=[255,122,60];
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.drawImage(S,0,0,100,100);
      const a=AMT*E.inOut(seg(u,.5,1.3))*(1-E.inOut(seg(u,3.4,4.15)));
      if(a<.004) return;
      const ph=1.7+(u-.5)*.15*SPEED;
      const lx=100*(.74+.12*WANDER*Math.sin(ph)), ly=100*(.66+.10*WANDER*Math.cos(ph*1.3));
      const g=c.createRadialGradient(lx,ly,0,lx,ly,R);
      for(let i=0;i<=14;i++){ const s=i/14, q=(1-s)*(1-s)*a; g.addColorStop(s,'rgb('+Math.round(K[0]*q)+','+Math.round(K[1]*q)+','+Math.round(K[2]*q)+')'); }
      c.globalCompositeOperation='screen'; c.fillStyle=g; c.fillRect(0,0,100,100);
      c.globalCompositeOperation='source-over';
    };
  } },

/* WIPE. Two sheets of a comp. A straight edge at 16 degrees with the effect's own Border in vermilion; Progress settles half way, holds, finishes, and comes back. */
{ id:'wipe', name:'Wipe', section:'Keying', isNew:true, redrawn:true, still:1.5,
  line:'A straight edge sweeps across and swaps one clip for the clip underneath it.',
  make(px){
    const P=4.4, X=4, Y=17, W=79, ax=16*TAU/360, dx=Math.cos(ax), dy=Math.sin(ax), den=Math.abs(W*dx)+Math.abs(W*dy), DX=9, DY=-9;
    const [A]=noPlate('revuelto',px), [B]=photoCover('bush',px);
    const cx=X+W/2, cy=Y+W/2;
    const clip=prog=>{ /* the part of the front sheet where ((p-c).d)/den+.5 <= Progress */
      const pts=[[X,Y],[X+W,Y],[X+W,Y+W],[X,Y+W]], out=[], f=p=>((p[0]-cx)*dx+(p[1]-cy)*dy)/den+.5-prog, cut=[];
      for(let i=0;i<4;i++){ const a=pts[i], b=pts[(i+1)%4], fa=f(a), fb=f(b); if(fa<=0) out.push(a); if((fa<0)!==(fb<0)){ const q=fa/(fa-fb), m=[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q]; out.push(m); cut.push(m); } }
      return {out,cut};
    };
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const prog = u<.5?1 : u<1.8? 1-.46*settle(seg(u,.5,1.25)) : u<2.5? .54-.54*E.inOut(seg(u,1.8,2.4)) : u<3.2?0 : E.inOut(seg(u,3.2,3.95));
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      /* the clip underneath */
      c.drawImage(A,X+DX,Y+DY,W,W);
      c.fillStyle=BONE; c.fillRect(X+DX+W-.0,Y+DY,.9,W); c.fillRect(X+DX,Y+DY-.9,W+.9,.9);
      /* the clip with the Wipe on it */
      if(prog>.001){
        const {out,cut}=clip(prog);
        c.save(); c.beginPath(); out.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath(); c.clip();
        c.drawImage(B,X,Y,W,W); c.fillStyle=BONE; c.fillRect(X,Y,W,.9); c.fillRect(X,Y,.9,W); c.restore();
        if(cut.length===2){ c.strokeStyle=VERM; c.lineWidth=1.5; c.lineCap='butt'; c.beginPath(); c.moveTo(cut[0][0],cut[0][1]); c.lineTo(cut[1][0],cut[1][1]); c.stroke(); }
      }
      tab(c,X,Y-7.8,'CLIP 01',5.2,BONE,INK);
      tab(c,X+DX+W-25.6,Y+DY-7.8,'CLIP 02',5.2,BONE,INK);
    };
  } },

/* DIRECTIONAL BLUR. 60 px on a 1080 frame, which is the slider's limit: 5.6 units end to end. Taps are drawn live, the effect's own 'lighter' mean. */
{ id:'motionblur', name:'Directional Blur', section:'Blur', isNew:true, redrawn:true, still:1.6,
  line:'The photograph smears along one direction by a fixed distance; turn the Angle and the smear turns with it.',
  make(px){
    const P=4.4, PAD=1.12, n=Math.round(px*PAD), [S]=noPlate('mclaren',n), o=(px-n)/2, N=14;
    /* every state of the smear is rendered once here, at half size (nothing this soft needs more), with the effect's own 'lighter' mean */
    const B=Math.round(px/2), nb=Math.round(B*PAD), ob=(B-nb)/2, [SB,sb]=canvasN(nb,nb); sb.drawImage(S,0,0,nb,nb);
    const smear=(dist,deg)=>{ const [C,x]=canvasN(B,B), a=deg*TAU/360, dx=Math.cos(a), dy=Math.sin(a), half=(N-1)/2, step=(B*dist/1080)/(N-1);
      x.fillStyle='#000'; x.fillRect(0,0,B,B); x.globalCompositeOperation='lighter'; x.globalAlpha=1/N;
      for(let k=0;k<N;k++){ const q=(k-half)*step; x.drawImage(SB,ob+dx*q,ob+dy*q); }
      return C; };
    const UP=[20,40,60].map(d=>smear(d,0)), TURN=[12,24,36,48,60,72].map(a=>smear(60,a)), DOWN=[40,20].map(d=>smear(d,72));
    return (c,t)=>{
      const u=mod(t,P), turn=Math.floor(E.inOut(seg(u,2.0,2.45))*6);
      let F=null;
      if(u>=.55&&u<.75) F=UP[Math.min(2,Math.floor(seg(u,.55,.75)*3))];
      else if(u>=.75&&u<2.0) F=UP[2];
      else if(u>=2.0&&u<2.45) F=turn?TURN[turn-1]:UP[2];
      else if(u>=2.45&&u<3.75) F=TURN[5];
      else if(u>=3.75&&u<3.95) F=DOWN[Math.min(1,Math.floor(seg(u,3.75,3.95)*2))];
      const deg = u<3.95? 12*Math.min(6,turn) : 72*(1-E.inOut(seg(u,3.95,4.25)));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      if(F) c.drawImage(F,0,0,px,px); else c.drawImage(S,o,o);
      reset(c,px);
      /* one tab: the Angle, with a tick that lies along the smear */
      const on=!!F; const r=3.6, cx=9.5, cy=90.5, a=deg*TAU/360;
      c.fillStyle=INK; c.fillRect(3,84,29,13);
      c.strokeStyle=on?BONE:'#6d685c'; c.lineWidth=.9; c.beginPath(); c.moveTo(cx-Math.cos(a)*r,cy-Math.sin(a)*r); c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); c.stroke();
      c.font=MONO(7.4); c.fillStyle=on?BONE:'#6d685c'; c.textAlign='left'; c.textBaseline='middle'; c.fillText(Math.round(deg)+'°',15,90.9);
    };
  } },

/* VHS TAPE. The real tape maths on a 4:3 crop of his dog on the beach: chroma lag and luma ringing precomputed per row, then each row is
   pushed sideways by a hash of (row, frame) at 25 fps; the tracking band and head switch use the real amounts. Timecode sits outside the picture. */
{ id:'vhstape', name:'VHS Tape', section:'Stylize', redrawn:true, still:1.7,
  line:'Colours smear sideways, the lines wobble and a tracking band rolls down the picture.',
  make(px){
    const P=4, NW=266, NH=200, M=70;   /* 4 s is 100 frames, so the frame count rolls straight over the seam */
    const X=4, Y=5, W=92, H=69;
    const {x:cx0}=plate('dog',NW); const im0=cx0.getImageData(0,(NW-NH)/2|0,NW,NH), d0=im0.data;
    const AMT=.9, s=NW/1080, k=Math.max(1,Math.round(40*s*AMT)), halo=.5*AMT, n5=2, WASH=.85*AMT;
    const [BA,ba]=canvasN(NW+2*M,NH), [WA,wa]=canvasN(NW+2*M,NH);
    const ia=ba.createImageData(NW+2*M,NH), ib=wa.createImageData(NW+2*M,NH), a=ia.data, b=ib.data, Yr=new Float32Array(NW), Cb=new Float32Array(NW), Cr=new Float32Array(NW);
    const put=(t,o,r,g,bl)=>{ t[o]=r; t[o+1]=g; t[o+2]=bl; t[o+3]=255; };
    for(let y=0;y<NH;y++){
      for(let x=0;x<NW;x++){ const i=(y*NW+x)*4, r=d0[i], g=d0[i+1], bl=d0[i+2]; Yr[x]=.299*r+.587*g+.114*bl; Cb[x]=-.169*r-.331*g+.5*bl; Cr[x]=.5*r-.419*g-.081*bl; }
      let sb=0, sr=0, sy=0;
      for(let x=0;x<NW;x++){
        sb+=Cb[x]; sr+=Cr[x]; if(x>=k){ sb-=Cb[x-k]; sr-=Cr[x-k]; } const nk=x+1<k?x+1:k;
        sy+=Yr[x]; if(x>=n5) sy-=Yr[x-n5]; const m5=x+1<n5?x+1:n5;
        const yy=Yr[x]+(Yr[x]-sy/m5)*halo*1.6, cb=sb/nk, cr=sr/nk;
        const o=(y*(NW+2*M)+x+M)*4;
        put(a,o,yy+1.402*cr,yy-.344*cb-.714*cr,yy+1.772*cb);
        const y2=yy+(235-yy)*WASH*.35, cb2=cb*(1-WASH*.8), cr2=cr*(1-WASH*.8);
        put(b,o,y2+1.402*cr2,y2-.344*cb2-.714*cr2,y2+1.772*cb2);
      }
      for(let q=0;q<M;q++){ for(let z=0;z<4;z++){ const l=(y*(NW+2*M)+M)*4+z, r=(y*(NW+2*M)+M+NW-1)*4+z, ol=(y*(NW+2*M)+q)*4+z, or=(y*(NW+2*M)+M+NW+q)*4+z; a[ol]=a[l]; a[or]=a[r]; b[ol]=b[l]; b[or]=b[r]; } }
    }
    ba.putImageData(ia,0,0); wa.putImageData(ib,0,0);
    const [CL,cl]=canvasN(NW,NH); cl.putImageData(im0,0,0);
    const WOB=8*s*AMT, TRK=.8*AMT, HEAD=.6*AMT, bandH=Math.max(2,NH*.055), headY=NH-Math.max(2,NH*.028), cycle=NH*1.9;
    const sc=px/100, DX=Math.round(X*sc), DY=Math.round(Y*sc), DW=Math.round(W*sc), DH=Math.round(H*sc), unit=DW/NW;
    return (c,t)=>{
      const u=mod(t,P), frame=Math.floor(u*25);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.fillStyle='#000'; c.fillRect(0,0,px,px);
      const on=u>=.55&&u<3.55;
      c.save(); c.beginPath(); c.rect(DX,DY,DW,DH); c.clip();
      if(!on){ c.drawImage(CL,DX,DY,DW,DH); }
      else{
        const bandC=(((u-.55)*.4*cycle)%cycle)-NH*.45+NH*.3;
        for(let y=0;y<NH;y++){
          const y0=DY+Math.round(y*DH/NH), y1=DY+Math.round((y+1)*DH/NH); if(y1<=y0) continue;
          let shift=WOB*rowHash(y,frame)*2, w=0; const bd=Math.abs(y-bandC);
          if(bd<bandH){ w=1-bd/bandH; shift+=TRK*w*NW*.09*(rowHash(y+5000,frame)+.35); }
          if(y>=headY) shift+=HEAD*NW*.16*(rowHash(y+9000,frame)+.4);
          const sx=M-shift;
          c.globalAlpha=1; c.drawImage(BA,sx,y,NW,1,DX,y0,DW,y1-y0);
          if(w>0){ c.globalAlpha=w; c.drawImage(WA,sx,y,NW,1,DX,y0,DW,y1-y0); c.globalAlpha=1; }
        }
      }
      c.restore();
      reset(c,px);
      const tc=4*25*60+11*25+3+frame, ss=Math.floor(tc/25)%60, ff=tc%25, mm=Math.floor(tc/1500)%60, p2=v=>(v<10?'0':'')+v;
      c.font=MONO(9.6); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='middle'; c.fillText('00:'+p2(mm)+':'+p2(ss)+':'+p2(ff),4,85);
    };
  } },

/* PIXEL SORT. The real run sort on his photo: vertical, Density .85, Dark cut .12, Bright cut .95, Max run 380 px of 1080. Density is what moves.
   Right-hand strip: the photo's real luma histogram with the two cuts marked. */
{ id:'pixelsort', name:'Pixel Sort', section:'Stylize', isNew:true, redrawn:true, still:2.3,
  line:'Runs of pixels between a dark and a bright cut get sorted by brightness, so the picture falls into streaks.',
  make(px){
    const P=4.2, N=200, NW=180, W=90, DENS=.85, LO=.12*255, HI=.95*255, RUN=Math.round(380*N/1080);
    const {x:x0}=plate('towers',N); const im=x0.getImageData(0,0,NW,N), d=im.data;
    const [BASE,bx]=canvasN(NW,N); bx.putImageData(im,0,0);
    const so=bx.createImageData(NW,N), o=so.data, lum=c=>.299*d[c]+.587*d[c+1]+.114*d[c+2], keys=new Uint32Array(N);
    const hist=new Float32Array(32);
    o.set(d);
    for(let i=0;i<NW*N;i++){ hist[Math.min(31,lum(i*4)/8|0)]++; }
    let hmax=0; for(let i=1;i<31;i++) hmax=Math.max(hmax,hist[i]);
    for(let L=0;L<NW;L++){
      let i=0;
      while(i<N){
        let a=i; while(a<N){ const l=lum((a*NW+L)*4); if(l>=LO&&l<=HI) break; a++; }
        if(a>=N) break;
        let b=a; while(b<N&&b-a<RUN){ const l=lum((b*NW+L)*4); if(l<LO||l>HI) break; b++; }
        const n=b-a;
        if(n>2){ for(let j=0;j<n;j++){ keys[j]=(lum(((a+j)*NW+L)*4)|0)<<20|j; } const r=keys.subarray(0,n); r.sort(); for(let j=0;j<n;j++){ const f=((a+(r[j]&0xfffff))*NW+L)*4, to=((a+j)*NW+L)*4; o[to]=d[f]; o[to+1]=d[f+1]; o[to+2]=d[f+2]; o[to+3]=255; } }
        i=b+1;
      }
    }
    const [SORT,sx]=canvasN(NW,N); sx.putImageData(so,0,0);
    /* Density is what travels: each step is built once here, 2 px to a column so the sorted lines stay crisp */
    const LW=NW*2, LH=N*2, STEPS=8, lines=new Float32Array(NW), LVL=[]; for(let L=0;L<NW;L++) lines[L]=lineHash(L);
    for(let l=1;l<=STEPS;l++){ const dn=DENS*l/STEPS, [C,x]=canvasN(LW,LH); x.drawImage(BASE,0,0,LW,LH); for(let L=0;L<NW;L++){ if(lines[L]<=dn) x.drawImage(SORT,L,0,1,N,L*2,0,2,LH); } LVL.push(C); }
    const sc=px/100, DW=Math.round(W*sc);
    return (c,t)=>{
      const u=mod(t,P), f=Math.floor(u*25)/25;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.fillStyle='#000'; c.fillRect(0,0,px,px);
      const step = (f<.6||f>=3.5)?0 : Math.ceil(Math.min(1,(f-.6)/.72)*STEPS);
      c.drawImage(step?LVL[step-1]:BASE,0,0,DW,px);
      reset(c,px);
      /* histogram: y is luma, the bright end at the top; the two cuts are the real Dark and Bright cut */
      const X0=W+1.4, X1=99, hh=92, top=4;
      for(let i=0;i<32;i++){ const y=top+hh-(i+1)/32*hh, len=(X1-X0)*Math.min(1,hist[i]/hmax), inside=(i*8+4)>=LO&&(i*8+4)<=HI; c.fillStyle=inside?DIM:'#3a4150'; c.fillRect(X1-len,y+.2,len,hh/32-.4); }
      c.fillStyle=YEL; const yL=top+hh-LO/255*hh, yH=top+hh-HI/255*hh; c.fillRect(X0-.6,yL-.4,X1-X0+.6,.8); c.fillRect(X0-.6,yH-.4,X1-X0+.6,.8);
    };
  } },

/* CROSSHATCH. The real three-tier hatch at Spacing 26, Weight 4, in the real diagonals. Ink density steps up, and Paper takes the picture away between the strokes. */
{ id:'crosshatch', name:'Crosshatch', section:'Drawing / Edge', isNew:true, redrawn:true, still:3.2,
  line:'Crossed ink lines build up where the picture is dark, over the photo or on a clean sheet.',
  make(px){
    const P=4.8, SP=22, WT=4, N=px, [S,sx]=noPlate('tesla',N); sx.setTransform(1,0,0,1,0,0); const src=sx.getImageData(0,0,N,N).data;
    const ps=N/1080, K=Math.min(4,Math.ceil(1/ps)), KK=K*K, inv=1/ps;
    const n=N*N, L=new Float32Array(n), c1=new Uint8Array(n), c2=new Uint8Array(n), c3=new Uint8Array(n);
    for(let y=0;y<N;y++){ for(let x=0;x<N;x++){ const i=y*N+x, j=i*4; L[i]=(.299*src[j]+.587*src[j+1]+.114*src[j+2])/255; let a=0,b=0,e=0;
      for(let sy=0;sy<K;sy++){ const EY=Math.floor((y+(sy+.5)/K)*inv); for(let sxx=0;sxx<K;sxx++){ const EX=Math.floor((x+(sxx+.5)/K)*inv); let q=(EX+EY)%SP; if(q<WT){ a++;b++;e++; continue; } q=(EX-EY)%SP; if(q<0) q+=SP; if(q<WT){ b++;e++; continue; } if(EY%SP<WT) e++; } }
      c1[i]=a; c2[i]=b; c3[i]=e; } }
    const R=[0x16,0x13,0x0f];
    const level=F=>{ const [C,x]=canvasN(N,N), im=x.createImageData(N,N), o=im.data, t1=.75*F, t2=.5*F, t3=.25*F; for(let i=0;i<n;i++){ const l=L[i], h=l<t3?c3[i]:l<t2?c2[i]:l<t1?c1[i]:0; if(h){ const j=i*4; o[j]=R[0]; o[j+1]=R[1]; o[j+2]=R[2]; o[j+3]=255*h/KK; } } x.putImageData(im,0,0); return C; };
    const LV=[.34,.52,.7].map(level);   /* Ink density 17, 26, 35 */
    return (c,t)=>{
      const u=mod(t,P);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(S,0,0);
      const lv = u<.5?-1 : u<.9?0 : u<1.3?1 : u<4.4?2 : -1;
      const pp = u<1.7?0 : u<2.4? E.inOut(seg(u,1.7,2.4)) : u<4.4?1 : 0;
      if(pp>0){ c.globalAlpha=pp; c.fillStyle=BONE; c.fillRect(0,0,px,px); c.globalAlpha=1; }
      if(lv>=0) c.drawImage(LV[lv],0,0);
    };
  } },

/* FISHEYE. The real barrel remap, source = c + d*(1-k*(1-r^2)), over the whole rectangle at Amount .5 (the default). The Amount slider below is the app's control. */
{ id:'fisheye', name:'Fisheye', section:'Warping', isNew:true, redrawn:true, still:2.0,
  line:'The middle of the frame swells and everything around it bends, across the whole rectangle.',
  make(px){
    const P=4.2, N=280, LV=12, KMAX=.56; const {x:x0}=plate('towers',N); const s=x0.getImageData(0,0,N,N).data;
    const cx=(N-1)/2, mr=Math.hypot(N/2,N/2), fr=[];
    for(let l=0;l<=LV;l++){ const k=KMAX*l/LV, [C,x]=canvasN(N,N), im=x.createImageData(N,N), o=im.data; let j=0;
      for(let y=0;y<N;y++){ const dy=(y-cx)/mr; for(let xx=0;xx<N;xx++){ const dx=(xx-cx)/mr, r2=dx*dx+dy*dy, f=r2>=1?1:1-k*(1-r2), sx=clamp(cx+(xx-cx)*f,0,N-1.001), sy=clamp(cx+(y-cx)*f,0,N-1.001), ix=sx|0, iy=sy|0, ax=sx-ix, ay=sy-iy, a=(iy*N+ix)*4, b=a+4, e=a+N*4, g=e+4;
        for(let q=0;q<3;q++){ o[j+q]=(s[a+q]*(1-ax)+s[b+q]*ax)*(1-ay)+(s[e+q]*(1-ax)+s[g+q]*ax)*ay; } o[j+3]=255; j+=4; } }
      x.putImageData(im,0,0); fr.push(C); }
    const X=9.5, Y=3, W=81;
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const amt = u<.55?0 : u<3.1? .5*settle(seg(u,.55,1.5)) : .5*(1-E.inOut(seg(u,3.1,3.75)));
      const lv=clamp(amt/KMAX,0,1)*LV, i0=Math.floor(lv), i1=Math.min(LV,i0+1), q=lv-i0;
      c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.drawImage(fr[i0],X,Y,W,W);
      if(q>.02){ c.globalAlpha=q; c.drawImage(fr[i1],X,Y,W,W); c.globalAlpha=1; }
      /* centre anchor, the effect's Centre X/Y */
      c.fillStyle=TEAL; c.fillRect(X+W/2-1.1,Y+W/2-1.1,2.2,2.2);
      /* Amount slider, -1 to 1 */
      const TX0=24, TX1=90, ty=92.5, xOf=v=>lerp(TX0,TX1,(v+1)/2);
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.moveTo(TX0,ty); c.lineTo(TX1,ty); c.stroke();
      c.fillStyle=YEL; [0,.5].forEach(v=>{ const k=xOf(v); c.beginPath(); c.moveTo(k,ty-2.2); c.lineTo(k+2.2,ty); c.lineTo(k,ty+2.2); c.lineTo(k-2.2,ty); c.closePath(); c.fill(); });
      const hx=xOf(amt); c.fillStyle=TEAL; c.fillRect(hx-1.6,ty-1.6,3.2,3.2);
      c.font=MONO(7); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='middle'; c.fillText(amt.toFixed(2),5,ty+.3);
    };
  } },

/* PULSE. Wave: Heartbeat, Amount .2 (the default): the real curve, exp bumps at .12 and .3 of the beat, only ever growing. Cut paper, on twos. */
{ id:'pulse', name:'Pulse', section:'Shakes / Movement', isNew:true, redrawn:true, still:.26,
  line:'The whole layer swells and settles in time, here on the Heartbeat wave: two beats and a rest.',
  make(px){
    const P=2.2;
    const bump=(f,c,w)=>{ const z=(f-c)/w; return Math.exp(-z*z); };
    const wave=f=>Math.min(1,bump(f,.12,.045)+.6*bump(f,.3,.05));
    const poly=(c,p)=>{ c.beginPath(); for(let i=0;i<p.length;i+=2){ i?c.lineTo(p[i],p[i+1]):c.moveTo(p[i],p[i+1]); } c.closePath(); c.fill(); };
    /* one Saul Bass eye, scissor cut: straight edges, nothing quite true */
    const LID=[-2,46, 18,30, 40,21, 63,20, 84,29, 102,46, 102,50, 82,36.5, 62,28, 41,28.5, 20,37, -2,52];
    const WHITE=[3,55, 20,43, 40,35.5, 61,35, 80,41, 97,53, 82,61.5, 61,68, 40,68.5, 19,63];
    const IRIS=[53,27, 67,30, 75,40, 77,53, 71,66, 58,74, 44,73, 33,65, 29,52, 32,39, 41,30];
    const PUP=[53,41, 60,43, 64,50, 62,58, 54,62, 46,60, 42,53, 44,45];
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*12)/12; reset(c,px);
      c.fillStyle=INK; c.fillRect(0,0,100,100);
      const s=1+.2*wave(u/P), PX=50, PY=50;
      c.translate(PX,PY); c.scale(s,s); c.translate(-PX,-PY);
      c.fillStyle=VERM; poly(c,LID);
      c.fillStyle=BONE; poly(c,WHITE);
      c.save(); c.beginPath(); for(let i=0;i<WHITE.length;i+=2){ i?c.lineTo(WHITE[i],WHITE[i+1]):c.moveTo(WHITE[i],WHITE[i+1]); } c.closePath(); c.clip();
      c.fillStyle=VERM; poly(c,IRIS); c.restore();
      c.fillStyle=INK; poly(c,PUP);
      reset(c,px);
    };
  } },

/* PARTICLES. The real emitter maths, closed form per particle, at Rate 140, Lifetime 1.6, Direction 300, Spread 14, Speed 900, Gravity 900, Size 14 to 4. Round dots only. */
{ id:'particles', name:'Particles', section:'Generative', isNew:true, redrawn:true, still:1.5,
  line:'Small dots leave one point, fly up, fall under gravity and fade out.',
  make(px){
    const P=4.6, RATE=130, LIFE=2.0, WIN=1.8, DIR=302*TAU/360, SPR=11*TAU/360, SP=860/10.8, G=760/10.8, S0=26/10.8, S1=10/10.8, O1=.5, OX=10, OY=90;
    const M=Math.round(RATE*WIN), V=[];
    for(let i=0;i<M;i++){ const a=DIR+(pHash(i*4)-.5)*SPR, s=SP*(.6+.8*pHash(i*4+1)); V.push({b:i/RATE,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:LIFE*(.7+.6*pHash(i*4+2))}); }
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.fillStyle=TEXT;
      for(let i=0;i<M;i++){ const p=V[i], age=u-p.b-.1; if(age<0||age>p.l) continue; const f=age/p.l, r=(S0+(S1-S0)*f)*.5, x=OX+p.vx*age, y=OY+p.vy*age+.5*G*age*age; c.globalAlpha=1+(O1-1)*f; c.beginPath(); c.arc(x,y,r,0,TAU); c.fill(); }
      c.globalAlpha=1;
      /* the emitter's mark */
      c.strokeStyle=TEXT; c.lineWidth=.5; c.beginPath(); c.moveTo(OX-3,OY); c.lineTo(OX+3,OY); c.moveTo(OX,OY-3); c.lineTo(OX,OY+3); c.stroke();
      c.font=MONO(5.4); c.textAlign='right'; c.textBaseline='alphabetic'; c.fillStyle=DIM; c.fillText('FIG. 3',96,96);
    };
  } },

/* MUSIC VISUALISER. Style: Line, 32 bands from 40 Hz to 16 kHz, with the effect's 20 ms rise and 250 ms fall. The waveform strip is the soundtrack under the playhead. */
{ id:'audiospectrum', name:'Music Visualiser', section:'Generative', isNew:true, redrawn:true, still:.1,
  line:'A line follows the soundtrack: lows on the left, highs on the right, jumping on every hit.',
  make(px){
    const P=2.4, BEAT=.6, B=32;
    const env=(u,at,amp)=>{ let a=mod(u-at,P); return (a<.02?a/.02:Math.exp(-(a-.02)/.125))*amp; };
    const kicks=[0,BEAT*2,BEAT*2.5], snares=[BEAT,BEAT*3], stabs=[BEAT*.5,BEAT*1.5,BEAT*3.5], hats=[]; for(let i=0;i<8;i++) hats.push(i*BEAT/2);
    const gauss=(x,c,w)=>Math.exp(-(x-c)*(x-c)/(2*w*w));
    const sumAt=(u,list,amp)=>{ let m=0; for(const a of list) m=Math.max(m,env(u,a,amp)); return m; };
    /* the strip: one bar of the soundtrack */
    const STRIP=84, wav=new Float32Array(STRIP);
    for(let i=0;i<STRIP;i++){ const u=i/STRIP*P; wav[i]=Math.max(sumAt(u,kicks,1),sumAt(u,snares,.72),sumAt(u,hats,.3),.08+.05*hash(i,3)); }
    const pts=new Float32Array(B+2);
    return (c,t)=>{
      const u=mod(t,P), fr=Math.floor(u*30); reset(c,px);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      const k=sumAt(u,kicks,1), s=sumAt(u,snares,1), h=sumAt(u,hats,1), st=sumAt(u,stabs,1), ph=u/BEAT, bt=Math.floor(ph)%4, was=(bt+3)%4, w=seg(ph-Math.floor(ph),0,.16);
      const X0=6, X1=94, Y0=6, Y1=66, H=Y1-Y0;
      const CHD=[[.27,.37,.5,.6],[.3,.4,.53,.64],[.25,.35,.47,.58],[.3,.42,.55,.66]], BNS=[.15,.19,.13,.17];   /* notes change on the beat, through the bands' own rise and fall */
      for(let b=0;b<B;b++){ const p=(b+.5)/B, n=hash(b*7+fr*13,5);
        let L=.05+.2*Math.exp(-p*2.4)+.045*n+.46*(gauss(p,BNS[was],.03)*(1-w)+gauss(p,BNS[bt],.03)*w)+k*.86*gauss(p,.075,.06)+s*.56*gauss(p,.46,.13)+s*.2*gauss(p,.74,.12)+h*.42*gauss(p,.86,.075);
        for(let q=0;q<4;q++) L+=(.2+.46*st)*(gauss(p,CHD[was][q],.017)*(1-w)+gauss(p,CHD[bt][q],.017)*w);
        pts[b]=Y1-H*(.03+.97*clamp(L)); }
      const xOf=i=>X0+(X1-X0)*(i+.5)/B;
      const P2=[[X0,pts[0]]]; for(let b=0;b<B;b++) P2.push([xOf(b),pts[b]]); P2.push([X1,pts[B-1]]);
      c.strokeStyle=INK; c.lineWidth=1.25; c.lineJoin='round'; c.lineCap='round'; c.beginPath(); c.moveTo(P2[0][0],P2[0][1]);
      for(let i=0;i<P2.length-1;i++){ const a=P2[Math.max(0,i-1)], b=P2[i], d=P2[i+1], e=P2[Math.min(P2.length-1,i+2)]; c.bezierCurveTo(b[0]+(d[0]-a[0])/6,b[1]+(d[1]-a[1])/6,d[0]-(e[0]-b[0])/6,d[1]-(e[1]-b[1])/6,d[0],d[1]); }
      c.stroke();
      c.fillStyle=INK; c.beginPath(); c.arc(P2[0][0],P2[0][1],1.2,0,TAU); c.fill();
      /* baseline + frequency ends */
      c.strokeStyle=INK; c.lineWidth=.5; c.beginPath(); c.moveTo(X0,Y1+1.5); c.lineTo(X1,Y1+1.5); c.moveTo(X0,Y1+1.5); c.lineTo(X0,Y1+3.4); c.moveTo(X1,Y1+1.5); c.lineTo(X1,Y1+3.4); c.stroke();
      c.font=MONO(4.6); c.fillStyle=INK; c.textBaseline='top'; c.textAlign='left'; c.fillText('40 HZ',X0,Y1+4); c.textAlign='right'; c.fillText('16 KHZ',X1,Y1+4);
      /* the soundtrack, scrolling under a fixed playhead */
      const SX=8, SW=STRIP, CY=87, PLAY=.28;
      c.save(); c.beginPath(); c.rect(SX,76,SW,22); c.clip();
      c.fillStyle=INK; for(let i=0;i<STRIP;i++){ const x=SX+mod(i/STRIP-u/P+PLAY,1)*SW, a=wav[i]*9.5; c.fillRect(x,CY-a,.62,a*2); }
      c.restore();
      const PXX=SX+PLAY*SW; c.fillStyle=VERM; c.fillRect(PXX-.45,75,.9,24);
    };
  } },

/* NUMBER ROLL. Plain numerals, From 0 To 100, Ease Out, in the layer's font: the real effect only changes the digits. */
{ id:'counter', name:'Number Roll', section:'Text', isNew:true, redrawn:true, still:3.0,
  line:'Plain numbers count up from one value to another and land on the last one.',
  make(px){
    const P=3.8, FS=66;
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*15)/15; reset(c,px);
      c.fillStyle=VERM; c.fillRect(0,0,100,100);
      const p=u<3.2?seg(u,.25,2.1):1-seg(u,3.2,3.55), e=u<3.2?1-(1-p)*(1-p)*(1-p):p, n=Math.round(100*e), s=String(n);   /* Progress eased out on the way up, a straight keyframe back */
      c.font=SANS(FS); c.fillStyle=INK; c.textAlign='left'; c.textBaseline='alphabetic';
      const adv=c.measureText('0').width*.96;
      for(let i=0;i<s.length;i++) c.fillText(s[i],-4,90), c.translate(adv,0);
      c.setTransform(px/100,0,0,px/100,0,0);
    };
  } }

);
})();


/* ART DIRECTOR'S PASS. Tiles that still read as a kids' app, or as the old centred-prop recipe, rebuilt on his photographs with the effect's own maths.
   Each replaces the tile of the same id. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,photoCover}=window.FXK;
const BONE='#e7e2d5', INK='#16130f', NAVY='#161c28', TEXT='#eef2f8', DIM='#8b96a8', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
/* number plates never read: blanked on the source photograph, in its 0..100 units */
const PLATES={ mclaren:[['#b4553a',[[77.6,54.4],[92.9,51.4],[94,57.8],[78.9,61]]]],
  tesla:[['#8ea2a8',[[72.4,58.2],[84.2,58.2],[84.2,63.8],[72.4,63.8]]]],
  revuelto:[['#18181b',[[19.6,63.1],[29.3,63.1],[29.3,66.7],[19.6,66.7]]],['#7f92a4',[[78.2,57.2],[86.6,57.2],[86.6,60],[78.2,60]]]] };
function cover(key,n){ const r=photoCover(key,n), x=r[1]; for(const pl of PLATES[key]||[]){ x.fillStyle=pl[0]; x.beginPath(); pl[1].forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])); x.closePath(); x.fill(); } return r; }
function pixels(key,n){ const [C,x]=cover(key,n); x.setTransform(1,0,0,1,0,0); return {C,im:x.getImageData(0,0,n,n)}; }
function tab(c,x,y,txt,s,bg,fg){ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); }

window.FX_TILES.push(

/* LUMA KEY. Broadcast bench. lumaKeyPx at Removes: Bright, Softness 28: his skyline over his shoreline. The strip is the plate's real luma waveform; the yellow line is the Threshold. */
{ id:'lumakey', name:'Luma Key', section:'Keying', isNew:true, redrawn:true, still:2.0,
  line:'Everything brighter than the level you set drops out, and the layer underneath shows through.',
  make(px){
    const P=4.6, N=240, H=Math.round(N*.76), Y0=Math.round(N*.1), LO=.45*255, SOFT=28, S=14, WW=180, WH=54, TX0=3, TX1=75, TY0=79.5, TY1=97;
    const {im}=pixels('city',N), d=im.data, [BK]=cover('shore',N), L=new Float32Array(N*H), [FG,fg]=sheet(N,H), src=fg.createImageData(N,H), wf=new Float32Array(WW*WH);
    for(let y=0;y<H;y++) for(let x=0;x<N;x++){ const i=((y+Y0)*N+x)*4, j=(y*N+x)*4, l=.299*d[i]+.587*d[i+1]+.114*d[i+2]; L[y*N+x]=l; src.data[j]=d[i]; src.data[j+1]=d[i+1]; src.data[j+2]=d[i+2]; src.data[j+3]=255; wf[Math.round((255-l)/255*(WH-1))*WW+Math.floor(x*WW/N)]++; }
    let mx=0; for(let i=0;i<wf.length;i++) if(wf[i]>mx) mx=wf[i];
    const [WF,wx]=sheet(WW,WH), wi=wx.createImageData(WW,WH); for(let i=0;i<wf.length;i++){ const j=i*4; wi.data[j]=238; wi.data[j+1]=242; wi.data[j+2]=248; wi.data[j+3]=255*Math.pow(wf[i]/mx,.42); } wx.putImageData(wi,0,0);
    const FR=new Array(S+1), TOF=k=>k?lerp(255+SOFT,LO,k/S):1e9;
    const level=k=>{ if(FR[k]) return FR[k]; const [C,x]=sheet(N,H), o=fg.createImageData(N,H), q=o.data, T=TOF(k); q.set(src.data);
      for(let i=0;i<N*H;i++){ const l=L[i]; if(l>=T) q[i*4+3]=0; else if(l>T-SOFT) q[i*4+3]=255*(T-l)/SOFT; }
      x.drawImage(BK,0,-Y0); const [K,kx]=sheet(N,H); kx.putImageData(o,0,0); x.drawImage(K,0,0); return FR[k]=C; };
    return (c,t)=>{
      const u=mod(t,P), f=Math.floor(u*25)/25;
      const k=f<.6?0:f<1.3?Math.ceil(E.out(seg(f,.6,1.3))*S):f<3.3?S:f<3.9?Math.round((1-E.inOut(seg(f,3.3,3.9)))*S):0;
      reset(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100);
      c.drawImage(level(k),0,0,100,76);
      const v=clamp(k?TOF(k)/255:1), Y=TY1-v*(TY1-TY0);
      /* the trace above the line is what has been removed */
      c.save(); c.beginPath(); c.rect(TX0,TY0,TX1-TX0,Y-TY0); c.clip(); c.globalAlpha=.26; c.drawImage(WF,TX0,TY0,TX1-TX0,TY1-TY0); c.restore();
      c.save(); c.beginPath(); c.rect(TX0,Y,TX1-TX0,TY1-Y); c.clip(); c.globalAlpha=1; c.drawImage(WF,TX0,TY0,TX1-TX0,TY1-TY0); c.restore();
      c.fillStyle=YEL; c.fillRect(TX0,Y-.45,TX1-TX0,.9);
      c.font=MONO(4.6); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='middle'; c.fillText('LEVEL',79,83);
      c.font=MONO(9); c.fillStyle=TEXT; c.fillText(v.toFixed(2).slice(0,4),78,91.5);
    };
  } },

/* KALEIDOSCOPE. Graded still. WARP_FX.kaleidoscope's fold on his bush photograph: Segments steps 2, 4, 8 on hard cuts, then Source X/Y travels so the wedge reads new ground. */
{ id:'kaleidoscope', name:'Kaleidoscope', section:'Warping', isNew:true, redrawn:true, still:2.9,
  line:'One wedge of the picture is mirrored round the centre; move what it looks at and the pattern folds and opens.',
  make(px){
    const P=5.2, N=Math.min(260,px), W=320, {C:SRC,im}=pixels('bush',W), s=im.data, R=new Float32Array(N*N), A=new Float32Array(N*N), k=W/N, mid=(N-1)/2;
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const dx=(x-mid)*k, dy=(y-mid)*k; R[y*N+x]=Math.hypot(dx,dy); A[y*N+x]=Math.atan2(dy,dx); }
    const [C,x]=sheet(N), o=x.createImageData(N,N), q=o.data;
    const fold=v=>{ v=((v%(2*W))+2*W)%(2*W); return Math.min(W-1,(v<W?v:2*W-v)|0); };
    let last='';
    const paint=(n,ox,oy)=>{ const key=n+'|'+ox+'|'+oy; if(key===last) return; last=key; const slice=TAU/n, half=slice/2;
      for(let i=0,j=0;i<N*N;i++,j+=4){ let a=A[i]%slice; if(a<0) a+=slice; a=Math.abs(a-half); const r=R[i], g=(fold(oy+Math.sin(a)*r)*W+fold(ox+Math.cos(a)*r))*4; q[j]=s[g]; q[j+1]=s[g+1]; q[j+2]=s[g+2]; q[j+3]=255; }
      x.putImageData(o,0,0); };
    return (c,t)=>{
      const u=mod(t,P), f=Math.floor(u*12)/12, n=u<.7?0:u<.95?2:u<1.2?4:u<4.35?8:u<4.6?4:u<4.85?2:0;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      if(!n){ c.drawImage(SRC,0,0,px,px); return; }
      const m=E.inOut(seg(f,1.55,3.9)); paint(n,W/2+m*64,W/2-m*40); c.drawImage(C,0,0,px,px);
    };
  } },

/* TIME ECHO. Comp sheet. echoMoments' own numbers: Count 4, Spacing .1 s, Start 100, Decay 60, so copy k has opacity .6^k and shows the layer k tenths of a second ago. The trail catches up when the card stops. */
{ id:'timeecho', name:'Time Echo', section:'Repetition', redrawn:true, still:.95,
  line:'Fading copies trail a moving layer, and catch up with it when it stops.',
  make(px){
    const P=4.6, SZ=48, [pic]=cover('revuelto',Math.round(px*.52)), COUNT=4, GAP=.1, DK=.6, AX=27, AY=71, BX=73, BY=29;
    const fly=m=>m<.35?0:m<1.25?E.inOut(seg(m,.35,1.25)):m<2.7?1:m<3.6?1-E.inOut(seg(m,2.7,3.6)):0;
    const at=m=>{ const f=fly(mod(m,P)); return [lerp(AX,BX,f),lerp(AY,BY,f)-15*Math.sin(Math.PI*f)]; };
    return (c,t)=>{
      const m=mod(t,P); reset(c,px); c.fillStyle=BONE; c.fillRect(0,0,100,100);
      for(let k=COUNT;k>=0;k--){ const q=at(m-k*GAP); c.globalAlpha=k?Math.pow(DK,k):1; c.drawImage(pic,q[0]-SZ/2,q[1]-SZ/2,SZ,SZ); }
      c.globalAlpha=1; tab(c,76,91,'COUNT 4',4.4,INK,BONE);
    };
  } },

/* MIRROR TILE. Graded still. WARP_FX.mirrortile: Tile size 1080, 540, 270 on a 1080 frame, anchored top left, odd rows and columns flipped. */
{ id:'mirrortile', name:'Mirror Tile', section:'Repetition', isNew:true, redrawn:true, still:1.6,
  line:'The picture shrinks into a tile and repeats, with every other copy flipped so the edges meet.',
  make(px){
    const P=5, [pic]=cover('huracan',px);
    const size=m=>m<.5?1:m<1.05?lerp(1,.5,E.inOut(seg(m,.5,1.05))):m<2.1?.5:m<2.65?lerp(.5,.25,E.inOut(seg(m,2.1,2.65))):m<4?.25:m<4.6?lerp(.25,1,E.inOut(seg(m,4,4.6))):1;
    return (c,t)=>{
      const v=size(mod(t,P)), s=v*px, n=Math.ceil(px/s);
      c.globalAlpha=1; c.globalCompositeOperation='source-over';
      for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const fx=i&1, fy=j&1; c.setTransform(fx?-1:1,0,0,fy?-1:1,(i+fx)*s,(j+fy)*s); c.drawImage(pic,0,0,s+.75,s+.75); }
      reset(c,px); tab(c,3,91,'TILE '+Math.round(v*1080),4.4,INK,BONE);
    };
  } },

/* BOLTS. Graded still. CANVAS_FX.lightning's own paths: Count 3, Forks 3, the integer hash, seeded per strike, channel tapering to a quarter. Flicker 6 and Thickness 1.6 are ordinary settings. */
{ id:'bolts', name:'Bolts', section:'Generative', redrawn:true, still:1.3,
  line:'Forked bolts strike down the layer and jump to a new path on every strike.',
  make(px){
    const P=3.6, RATE=6, COUNT=3, FORKS=3, SEGN=20, TH=1.6, [pic]=cover('clouds',px), [OV,ov]=sheet(px);
    const rnd=(a,b)=>{ let h=(a*374761393+b*668265263)|0; h=(h^(h>>13))*1274126177; h=(h^(h>>16)); return ((h>>>0)%100000)/100000; };
    const geo=ph=>{ const out=[]; for(let b=0;b<COUNT;b++){ const sd=(b*131+ph*977)|0, x0=12+76*rnd(sd,1), lean=(rnd(sd,2)-.5)*40, main=[];
        for(let s=0;s<=SEGN;s++){ const f=s/SEGN; main.push([x0+lean*f+(rnd(sd,10+s)-.5)*10,100*f]); }
        out.push([main,1,1]);
        for(let k=0;k<FORKS;k++){ const at=2+((rnd(sd,40+k)*(SEGN-5))|0), dir=rnd(sd,60+k)<.5?-1:1, len=3+((rnd(sd,80+k)*5)|0), fp=[main[at]];
          for(let s=1;s<=len;s++){ const q=fp[s-1]; fp.push([q[0]+dir*100*(.025+rnd(sd,100+k*9+s)*.05),q[1]+5*(.6+rnd(sd,200+k*9+s)*.7)]); }
          out.push([fp,.45,.6]); } }
      return out; };
    let last=-1;
    const overlay=ph=>{ if(ph===last) return; last=ph; ov.setTransform(1,0,0,1,0,0); ov.clearRect(0,0,px,px); ov.setTransform(px/100,0,0,px/100,0,0);
      const pass=(col,wid,al,cap)=>{ ov.strokeStyle=col; ov.lineCap=cap; for(const [p,ws,as] of geo(ph)) for(let s=1;s<p.length;s++){ const tp=1-(s-.5)/(p.length-1)*.75; ov.globalAlpha=Math.min(1,al*as*tp); ov.lineWidth=wid*ws*TH*tp; ov.beginPath(); ov.moveTo(p[s-1][0],p[s-1][1]); ov.lineTo(p[s][0],p[s][1]); ov.stroke(); } };
      pass('#96c8ff',3.4,.2,'butt'); pass('#96c8ff',1.7,.36,'butt'); pass('#eaf4ff',.8,1,'round'); ov.globalAlpha=1; };
    return (c,t)=>{
      const m=mod(t,P); reset(c,px); c.drawImage(pic,0,0,100,100);
      if(m>=.45&&m<3.05){ overlay(Math.floor(m*RATE)); c.setTransform(1,0,0,1,0,0); c.globalCompositeOperation='screen'; c.drawImage(OV,0,0); c.globalCompositeOperation='source-over'; }
    };
  } },

/* SPHERIZE. Viewer overlay. sphere3d's own mapping (lon=(u-.5)*2pi, lat=(v-.5)*pi), X Rotation 15, Shading .55, on a Coal-free navy viewer: no halo, no stars. Y Rotation keyed to +-42 so the seam stays round the back. */
{ id:'sphere3d', name:'Spherize', section:'3D', isNew:true, redrawn:true, still:1.9,
  line:'Wraps the layer round a sphere you can turn.',
  make(px){
    const P=4.8, N=Math.min(280,px), W=320, {C:SRC,im}=pixels('clouds',W), s=im.data, RU=38, CX=50, CY=44, Rp=RU/100*N, ox=CX/100*N, oy=CY/100*N, rx=15*Math.PI/180, cX=Math.cos(rx), sX=Math.sin(rx), SHD=.55;
    const idx=[], lon=[], row=[], sh=[], al=[];
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const dx=(x+.5-ox)/Rp, dy=(y+.5-oy)/Rp, rr=dx*dx+dy*dy; if(rr>=1) continue; const z=Math.sqrt(1-rr), y2=dy*cX+z*sX, z2=-dy*sX+z*cX, lam=Math.abs(dx*.42-dy*.55+z*.72); idx.push((y*N+x)*4); lon.push(Math.atan2(dx,z2)); row.push(Math.min(W-1,((Math.asin(clamp(y2,-1,1))/Math.PI+.5)*W)|0)); sh.push((1-SHD)+SHD*(.25+.75*lam)); al.push(255*clamp((1-Math.sqrt(rr))*Rp)); }
    const [C,x]=sheet(N), o=x.createImageData(N,N), q=o.data, n=idx.length; let last=1e9;
    const paint=deg=>{ if(deg===last) return; last=deg; const a=deg*Math.PI/180; for(let i=0;i<n;i++){ let U=(lon[i]+a)/TAU+.5; U-=Math.floor(U); const g=(row[i]*W+Math.min(W-1,(U*W)|0))*4, j=idx[i], k=sh[i]; q[j]=s[g]*k; q[j+1]=s[g+1]*k; q[j+2]=s[g+2]*k; q[j+3]=al[i]; } x.putImageData(o,0,0); };
    const DX=86.5, DY=86.5, DR=8, KEYS=[318,0,42];
    return (c,t)=>{
      const u=mod(t,P), f=Math.floor(u*15)/15, flat=u<.5||u>=4.4;
      const deg=flat||f<.8?0:f<1.75?42*settle(seg(f,.8,1.75)):f<2.3?42:f<3.2?lerp(42,-42,E.inOut(seg(f,2.3,3.2))):f<3.7?-42:f<4.3?lerp(-42,0,E.inOut(seg(f,3.7,4.3))):0;
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      if(flat) c.drawImage(SRC,CX-RU,CY-RU,2*RU,2*RU); else { paint(deg); c.drawImage(C,0,0,100,100); }
      c.fillStyle=TEAL; c.fillRect(CX-1.3,CY-1.3,2.6,2.6);
      const show=((deg%360)+360)%360;
      c.font=MONO(7); c.textAlign='left'; c.textBaseline='middle'; c.fillStyle=TEXT; c.fillText('ROT Y '+String(Math.round(show)).padStart(3,'0'),5,92.5);
      const dialA=a=>(a-90)*Math.PI/180;
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.arc(DX,DY,DR,0,TAU); c.stroke();
      c.fillStyle=YEL; for(const a of KEYS){ const r=dialA(a), X=DX+Math.cos(r)*DR, Y=DY+Math.sin(r)*DR; c.beginPath(); c.moveTo(X,Y-2); c.lineTo(X+2,Y); c.lineTo(X,Y+2); c.lineTo(X-2,Y); c.closePath(); c.fill(); }
      const r=dialA(show); c.strokeStyle=TEAL; c.lineWidth=.6; c.beginPath(); c.moveTo(DX,DY); c.lineTo(DX+Math.cos(r)*DR,DY+Math.sin(r)*DR); c.stroke(); c.fillStyle=TEAL; c.fillRect(DX+Math.cos(r)*DR-1.1,DY+Math.sin(r)*DR-1.1,2.2,2.2);
    };
  } },

/* WORD HIGHLIGHT. A caption over a photograph. Style: Box behind, Box colour vermilion, Unit: Word, Past: Return. The box cuts from word to word; every word keeps the text's own colour, because Box behind does not recolour the word (measured: white stays white). */
{ id:'wordhighlight', name:'Word Highlight', section:'Text', isNew:true, redrawn:true, still:1.5,
  line:'A box jumps from word to word along a caption, in time with the speech.',
  make(px){
    const P=3.7, [pic]=cover('bay',px), FS=17.5, X=6, Y1=72, Y2=92, PAD=1.4, m=sheet(8)[1]; m.font=SANS(FS);
    const w=s=>m.measureText(s).width, W=[{t:'WORD',x:X,y:Y1},{t:'BY',x:X+w('WORD ')+0,y:Y1},{t:'WORD',x:X,y:Y2}];
    return (c,t)=>{
      const u=mod(t,P), on=u<.45?-1:u<1.15?0:u<1.85?1:u<2.55?2:-1;
      reset(c,px); c.drawImage(pic,0,0,100,100);
      c.font=SANS(FS); c.textAlign='left'; c.textBaseline='alphabetic';
      W.forEach((q,i)=>{ if(i===on){ c.fillStyle='#e4471d'; c.beginPath(); c.roundRect(q.x-PAD,q.y-FS*.82,w(q.t)+2*PAD,FS*.98,1.3); c.fill(); } c.fillStyle=TEXT; c.fillText(q.t,q.x,q.y); });
    };
  } }

);
})();
