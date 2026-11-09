/* FreeMotion effect pictures, artist 2: twelve redraws, each built on what the effect really computes (js/compositor.js). */
(function(){
'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const INK='#16130f', COAL='#0c0c0d', BONE='#e7e2d5', VERM='#e4471d', KEY='#ffce4a', TEAL='#29d9bb', NAVY='#161c28', HAIR='#2b3547', TXT='#eef2f8', DIM='#8b96a8', PAPER='#d9d4c6', CHINA='#d8321f';
const MONO='"Courier Prime","Courier New",Courier,monospace';

/* every frame starts from a known canvas state */
const begin=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
/* a damped settle: 0 to 1 with one small overshoot */
const settle=p=>{ p=clamp(p); return p>=1?1:1-Math.exp(-7*p)*Math.cos(p*12); };
/* number plates never read: blanked on the source photograph, in its 0..100 units */
const PLATES={ mclaren:[['#b4553a',[[77.6,54.4],[92.9,51.4],[94,57.8],[78.9,61]]]],
  tesla:[['#8ea2a8',[[72.4,58.2],[84.2,58.2],[84.2,63.8],[72.4,63.8]]]],
  revuelto:[['#18181b',[[19.6,63.1],[29.3,63.1],[29.3,66.7],[19.6,66.7]]],['#7f92a4',[[78.2,57.2],[86.6,57.2],[86.6,60],[78.2,60]]]] };
function cover(key,W){ const r=photoCover(key,W), x=r[1]; for(const pl of PLATES[key]||[]){ x.fillStyle=pl[0]; x.beginPath(); pl[1].forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])); x.closePath(); x.fill(); } return r; }
/* the one read of a tile: the photograph as a canvas and its pixels */
function pixels(key,W){ const [C,x]=cover(key,W); x.setTransform(1,0,0,1,0,0); return {C,im:x.getImageData(0,0,W,W)}; }
function plate(W,H,data){ const C=document.createElement('canvas'); C.width=W; C.height=H; C.getContext('2d').putImageData(data,0,0); return C; }
function blank(W,H){ const C=document.createElement('canvas'); C.width=W; C.height=H; return [C,C.getContext('2d')]; }
function tab(c,x,y,txt,bg,fg,size){ size=size||4.6; c.font='700 '+size+'px '+MONO; const w=c.measureText(txt).width+size*.9, h=size*1.45; c.fillStyle=bg; c.fillRect(x,y,w,h); c.fillStyle=fg; c.textBaseline='middle'; c.fillText(txt,x+size*.45,y+h*.54); c.textBaseline='alphabetic'; return w; }
function box3(a,W,H,r){ const k=1/(2*r+1), t=new Float32Array(Math.max(W,H));
  for(let y=0;y<H;y++) for(let ch=0;ch<3;ch++){ const o=y*W*3+ch; let sum=0; for(let i=-r;i<=r;i++) sum+=a[o+clamp(i,0,W-1)*3]; for(let x=0;x<W;x++){ t[x]=sum*k; sum+=a[o+Math.min(W-1,x+r+1)*3]-a[o+Math.max(0,x-r)*3]; } for(let x=0;x<W;x++) a[o+x*3]=t[x]; }
  for(let x=0;x<W;x++) for(let ch=0;ch<3;ch++){ const o=x*3+ch, st=W*3; let sum=0; for(let i=-r;i<=r;i++) sum+=a[o+clamp(i,0,H-1)*st]; for(let y=0;y<H;y++){ t[y]=sum*k; sum+=a[o+Math.min(H-1,y+r+1)*st]-a[o+Math.max(0,y-r)*st]; } for(let y=0;y<H;y++) a[o+y*st]=t[y]; }
}
function diamond(c,x,y,r,fill){ c.fillStyle=fill; c.beginPath(); c.moveTo(x,y-r); c.lineTo(x+r,y); c.lineTo(x,y+r); c.lineTo(x-r,y); c.closePath(); c.fill(); }

window.FX_TILES.push(

/* ---- Vignette: A, graded still. The kernel's own gradient on his photograph, Amount travels. ---- */
{ id:'vignette', name:'Vignette', section:'Colouring', isNew:true, redrawn:true, still:2.6,
  line:'The corners of the frame sink into shadow while the middle stays as it was.',
  make(px){
    const [pic]=cover('dog',px), P=4.2, R=Math.hypot(50,50), SIZE=.2, AMT=.85;
    return (c,t)=>{ begin(c,px); const m=t%P;
      const a=AMT*E.inOut(seg(m,.7,1.6))*(1-E.inOut(seg(m,3.5,3.95)));
      c.drawImage(pic,0,0,100,100);
      if(a>.002){ const g=c.createRadialGradient(50,50,R*SIZE,50,50,R); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,'+a.toFixed(3)+')'); c.fillStyle=g; c.fillRect(0,0,100,100); }
    };
  } },

/* ---- Invert: A, a colourist's split that stops on the subject. Every pixel 255 minus itself. ---- */
{ id:'invert', name:'Invert', section:'Colouring', isNew:true, redrawn:true, still:1.5,
  line:'Every colour in the picture flips to its exact opposite.',
  make(px){
    const P=4.4, {C,im}=pixels('cat',px), d=im.data;
    for(let i=0;i<d.length;i+=4){ d[i]=255-d[i]; d[i+1]=255-d[i+1]; d[i+2]=255-d[i+2]; }
    const neg=plate(px,px,im), STOP=61;
    return (c,t)=>{ begin(c,px); const m=t%P;
      let x=0, leftNeg=true;
      if(m<.7) x=0;
      else if(m<1.9) x=settle(seg(m,.7,1.3))*STOP;
      else if(m<2.35) x=lerp(STOP,100,E.inOut(seg(m,1.9,2.35)));
      else if(m<3.3) x=100;
      else if(m<3.9){ x=lerp(0,100,E.inOut(seg(m,3.3,3.9))); leftNeg=false; }
      else { x=100; leftNeg=false; }
      c.drawImage(leftNeg?C:neg,0,0,100,100);
      if(x>0){ const w=Math.min(100,x); c.drawImage(leftNeg?neg:C,0,0,w/100*px,px,0,0,w,100); }
      if(x>0&&x<100){ c.fillStyle=BONE; c.fillRect(x-.35,0,.7,100); }
    };
  } },

/* ---- Blinds: B, what the kernel does today: flat cuts in the layer, nothing behind them, Stagger on. ---- */
{ id:'blinds', name:'Venetian Blinds', section:'Keying', isNew:true, redrawn:true, still:1.9,
  line:'Flat strips open across the layer, and the gaps show whatever is underneath.',
  make(px){
    const [pic]=cover('huracan',px), P=4.4, n=10, ST=.35, sw=100/n, win=1-ST*(1-1/n), lag=(1-win)/(n-1);
    const prog=m=>{
      if(m<.6) return 1;
      if(m<2.4) return lerp(1,.55,settle(seg(m,.6,1.4)));
      if(m<3.0) return lerp(.55,.36,E.inOut(seg(m,2.4,3.0)));
      if(m<3.4) return .36;
      if(m<4.2) return lerp(.36,1,E.inOut(seg(m,3.4,4.2)));
      return 1;
    };
    return (c,t)=>{ begin(c,px); const m=t%P, p=prog(m);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      if(p>=1){ c.drawImage(pic,0,0,100,100); }
      else for(let k=0;k<n;k++){
        const v=clamp((p-k*lag)/win), h=v*sw; if(h<=.01) continue;
        const y=k*sw; c.drawImage(pic,0,y/100*px,px,h/100*px,0,y,100,h);
      }
      tab(c,3,92,'SLATS 10',BONE,INK,4.2);
    };
  } },

/* ---- Spin Blur: F, viewer overlay. The kernel's 9 rotated taps on the wheel, precomputed at six Amounts. ---- */
{ id:'spinblur', name:'Spin Blur', section:'Blur', isNew:true, redrawn:true, still:2.0,
  line:'Smears the picture round a centre you place, here the front wheel.',
  make(px){
    const P=4.2, W=Math.min(px,340), CXP=33, CYP=61, AMT=.5, {C,im}=pixels('mclaren',W), s=im.data;
    const LEVELS=[0,.1,.2,.3,.4,.5], cv=[C], cx=W*CXP/100, cy=W*CYP/100, N=15, H2=(N-1)/2, W4=W*4;
    const out=new ImageData(W,W);
    for(let L=1;L<LEVELS.length;L++){
      const span=LEVELS[L]*.4, co=new Float64Array(N), si=new Float64Array(N);
      for(let k=0;k<N;k++){ const a=(k-H2)/H2*span; co[k]=Math.cos(a); si[k]=Math.sin(a); }
      const d=out.data;
      for(let y=0;y<W;y++){ const dy=y-cy; for(let x=0;x<W;x++){ const dx=x-cx; let r=0,g=0,b=0;
        for(let j=0;j<N;j++){ const sx=cx+dx*co[j]-dy*si[j], sy=cy+dx*si[j]+dy*co[j];
          const ix=sx<0?0:(sx>W-1?W-1:(sx+.5)|0), iy=sy<0?0:(sy>W-1?W-1:(sy+.5)|0), i=iy*W4+ix*4; r+=s[i]; g+=s[i+1]; b+=s[i+2]; }
        const o=y*W4+x*4; d[o]=r/N; d[o+1]=g/N; d[o+2]=b/N; d[o+3]=255; } }
      cv.push(plate(W,W,out));
    }
    const amount=m=>AMT*E.inOut(seg(m,.6,1.5))*(1-E.inOut(seg(m,3.2,3.9)));
    return (c,t)=>{ begin(c,px); const m=t%P, a=amount(m), q=a/.1, i=Math.min(LEVELS.length-1,Math.floor(q)), f=q-i;
      c.drawImage(cv[i],0,0,100,100);
      if(f>.01&&i<LEVELS.length-1){ c.globalAlpha=f; c.drawImage(cv[i+1],0,0,100,100); c.globalAlpha=1; }
      /* the gizmo: anchor on Centre X/Y, the real arc of the blur, its keyframe diamond */
      const span=a*.4, base=-1.15, r=18, ox=CXP, oy=CYP;
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.arc(ox,oy,r,0,TAU); c.stroke();
      if(span>.002){ c.strokeStyle=KEY; c.lineWidth=1.3; c.beginPath(); c.arc(ox,oy,r,base-span,base+span); c.stroke(); }
      diamond(c,ox+Math.cos(base+span)*r,oy+Math.sin(base+span)*r,2.4,KEY);
      c.fillStyle=TEAL; c.fillRect(ox-1.7,oy-1.7,3.4,3.4); c.fillStyle=NAVY; c.fillRect(ox-.6,oy-.6,1.2,1.2);
      tab(c,3,3,'±'+(span*180/Math.PI).toFixed(1).padStart(4,'0')+'°',NAVY,TXT,5);
    };
  } },

/* ---- CRT: H, broadcast bench. The kernel's curve, scanlines, mask and tube vignette on the pixels; Roll is the real dark bar. ---- */
{ id:'crt', name:'CRT', section:'Stylize', isNew:true, redrawn:true, still:2.2,
  line:'Scanlines, a colour mask and a curved tube edge laid over your picture.',
  make(px){
    const P=4, H=Math.round(px*.86), Hu=86, {C,im}=pixels('revuelto',px), s=im.data, y0=Math.round((px-H)*.55), cell=Math.max(2,Math.round(px*.0148));
    const N=px*H, rgb=new Float32Array(N*3), cx=px/2, cy=H/2, maxR=Math.hypot(cx,cy), amt=.8, sl=.45, mk=.22, vgS=.55, BL=.35, m1=1-amt*mk, kCurve=.4*.3, hk=BL*.8/255;
    /* Tube curvature (crt13's first loop) */
    for(let y=0;y<H;y++){ const ny=(y+.5)/H*2-1;
      for(let x=0;x<px;x++){ const nx=(x+.5)/px*2-1, j=(y*px+x)*3, ux=nx*(1+kCurve*ny*ny), uy=ny*(1+kCurve*nx*nx);
        if(ux<-1||ux>1||uy<-1||uy>1) continue;
        const fx=(ux+1)*.5*px-.5, fy=(uy+1)*.5*H-.5+y0; let xa=Math.floor(fx), ya=Math.floor(fy); const tx=fx-xa, ty=fy-ya; let xb=xa+1, yb=ya+1;
        if(xa<0)xa=0; if(ya<0)ya=0; if(xb>=px)xb=px-1; if(yb>=px)yb=px-1;
        const a=(ya*px+xa)*4, b=(ya*px+xb)*4, e=(yb*px+xa)*4, f=(yb*px+xb)*4;
        for(let ch=0;ch<3;ch++) rgb[j+ch]=(s[a+ch]*(1-tx)+s[b+ch]*tx)*(1-ty)+(s[e+ch]*(1-tx)+s[f+ch]*tx)*ty; } }
    /* Bloom's halo: squared brightness, two box blurs of 1.5% of the short side */
    const halo=new Float32Array(N*3); for(let i=0;i<N*3;i++) halo[i]=rgb[i]*rgb[i]/255;
    const br=Math.max(1,Math.round(H*.015)); box3(halo,px,H,br); box3(halo,px,H,br);
    /* scanline, mask, Bloom's fill, tube vignette: the second loop */
    const out=new ImageData(px,H), d=out.data;
    for(let y=0;y<H;y++){ const gy=Math.floor(y/cell), scan=(gy&1)?(1-amt*sl):1;
      for(let x=0;x<px;x++){ const j=y*px+x, i=j*4, q=j*3; d[i+3]=255;
        const R0=rgb[q], G0=rgb[q+1], B0=rgb[q+2], ph=Math.floor(x/cell)%3; let kr=scan,kg=scan,kb=scan;
        if(ph===0){kg*=m1;kb*=m1;} else if(ph===1){kr*=m1;kb*=m1;} else {kr*=m1;kg*=m1;}
        const fill=BL*.85*(.299*R0+.587*G0+.114*B0)/255; kr+=(1-kr)*fill; kg+=(1-kg)*fill; kb+=(1-kb)*fill;
        const r=Math.hypot(x-cx,y-cy)/maxR, vg=1-amt*vgS*Math.max(0,r-.4); let RR=R0*kr*vg, GG=G0*kg*vg, BB=B0*kb*vg;
        RR+=(255-RR)*halo[q]*hk; GG+=(255-GG)*halo[q+1]*hk; BB+=(255-BB)*halo[q+2]*hk;
        d[i]=RR; d[i+1]=GG; d[i+2]=BB; } }
    const tube=plate(px,H,out), [bar,bx]=blank(1,256), k=.7*.6;
    for(let j=0;j<256;j++){ const dy=(j+.5)/128-1; bx.fillStyle='rgba(0,0,0,'+(k*.5*(1+Math.cos(Math.PI*dy))).toFixed(3)+')'; bx.fillRect(0,j,1,1); }
    const flick=f=>{ let h=Math.imul(f,2654435761); h=Math.imul(h^(h>>>15),2246822519); h^=h>>>13; return .35*.3*(((h>>>0)%1000)/1000); };
    return (c,t)=>{ begin(c,px); const m=t%P, fr=Math.floor(m*25), on=m>=.72&&m<3.6;
      c.fillStyle='#000'; c.fillRect(0,0,100,100);
      if(on){ c.drawImage(tube,0,0,100,Hu);
        c.save(); c.beginPath(); c.rect(0,0,100,Hu); c.clip();
        const yc=Hu*(1-((m*.25)%1)), hb=Hu/6;
        for(const w of [-Hu,0,Hu]) c.drawImage(bar,0,yc+w-hb,100,hb*2);
        c.globalAlpha=flick(Math.floor(m*30)); c.fillStyle='#000'; c.fillRect(0,0,100,Hu); c.globalAlpha=1; c.restore();
      } else c.drawImage(C,0,y0,px,H,0,0,100,Hu);
      c.font='700 6px '+MONO; c.textBaseline='middle';
      const ss=String(11+Math.floor(m)).padStart(2,'0'), ff=String(fr%25).padStart(2,'0');
      c.fillStyle=TXT; c.fillText('00:04:'+ss+':'+ff,3,93.4);
      c.fillStyle=on?TXT:DIM; c.textAlign='right'; c.fillText(on?'CRT':'BYPASS',97,93.4); c.textAlign='left'; c.textBaseline='alphabetic';
    };
  } },

/* ---- Pencil Sketch: J, plotter. The kernel's Sobel on the pixels, Pencil and Paper colours are its own controls. ---- */
{ id:'sketch', name:'Pencil Sketch', section:'Drawing / Edge', redrawn:true, still:2.9,
  line:'Finds the edges in your picture and redraws them as thin grey pencil on paper.',
  make(px){
    const P=4.8, W=Math.min(px,420), Hband=91, {C,im}=pixels('huracan',W), s=im.data, DARK=480, THR=.03, PA=[231,226,213], PC=[22,19,15];
    const out=new ImageData(W,W), d=out.data, lum=new Float32Array(W*W);
    for(let i=0,j=0;i<W*W;i++,j+=4) lum[i]=s[j]*.299+s[j+1]*.587+s[j+2]*.114;
    for(let y=0;y<W;y++){ const ym=(y>0?y-1:0)*W, y0=y*W, yp=(y<W-1?y+1:W-1)*W;
      for(let x=0;x<W;x++){ const xm=x>0?x-1:0, xp=x<W-1?x+1:W-1;
        const gx=(lum[ym+xp]+2*lum[y0+xp]+lum[yp+xp])-(lum[ym+xm]+2*lum[y0+xm]+lum[yp+xm]), gy=(lum[yp+xm]+2*lum[yp+x]+lum[yp+xp])-(lum[ym+xm]+2*lum[ym+x]+lum[ym+xp]);
        let mag=Math.sqrt(gx*gx+gy*gy)/1442; if(mag>1)mag=1; if(mag<THR)mag=0;
        let v=255-mag*DARK; if(v<0)v=0; const f=v/255, i=(y*W+x)*4;
        d[i]=PC[0]+(PA[0]-PC[0])*f; d[i+1]=PC[1]+(PA[1]-PC[1])*f; d[i+2]=PC[2]+(PA[2]-PC[2])*f; d[i+3]=255; } }
    const sk=plate(W,W,out), cut=Hband/100*W;
    return (c,t)=>{ begin(c,px); const m=t%P;
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      const y=m<.7?0:(m<2.0?Hband*seg(m,.7,2.0):(m<4.2?Hband:0));
      if(y<Hband) c.drawImage(C,0,0,W,cut,0,0,100,Hband);
      if(y>0) c.drawImage(sk,0,0,W,y/100*W,0,0,100,y);
      if(y>0&&y<Hband){ c.fillStyle=VERM; c.fillRect(0,y-.25,100,.5); c.fillStyle=INK; c.beginPath(); c.arc(28+y*.62,y,1.1,0,TAU); c.fill(); }
      c.fillStyle=INK; c.font='700 4.8px '+MONO; c.textBaseline='middle'; c.fillText('FIG. 3',3,95.6); c.textBaseline='alphabetic';
    };
  } },

/* ---- Shockwave: F, viewer overlay. The kernel's ring run for real on a small plate every frame. ---- */
{ id:'shockwave', name:'Shockwave', section:'Warping', redrawn:true, still:1.4,
  line:'One pressure ring travels out from a point and bends the picture as it passes.',
  make(px){
    const P=3.6, W=Math.min(px,280), {im}=pixels('towers',W), src=im.data, out=new ImageData(W,W), d=out.data;
    const [cv,x2]=blank(W,W), CXP=40, CYP=56, cx=W*CXP/100, cy=W*CYP/100, maxR=Math.hypot(W,W)/2, st=130*W/1080, wid=14/100*maxR, rim=.4, chroma=.35, kR=1+chroma*.28, kB=1-chroma*.28;
    const radius=m=>{
      if(m<.5) return -1;
      if(m<1.05) return 54*E.out(seg(m,.5,1.05));
      if(m<1.85) return 54;
      if(m<2.5) return lerp(54,150,E.in(seg(m,1.85,2.5)));
      return -1;
    };
    return (c,t)=>{ begin(c,px); const m=t%P, Rp=radius(m);
      d.set(src);
      if(Rp>=0){ const rad=Rp/100*maxR, R0=Math.max(0,rad-wid), R1=rad+wid, R0s=R0*R0, R1s=R1*R1;
        const xa=Math.max(0,Math.floor(cx-R1)), xb=Math.min(W,Math.ceil(cx+R1)+1), ya=Math.max(0,Math.floor(cy-R1)), yb=Math.min(W,Math.ceil(cy+R1)+1);
        for(let y=ya;y<yb;y++){ const dy=y-cy, dy2=dy*dy; for(let x=xa;x<xb;x++){ const dx=x-cx, r2=dx*dx+dy2; if(r2<R0s||r2>R1s) continue;
          const r=Math.sqrt(r2), dr=(r-rad)/wid, g=Math.exp(-dr*dr*2.2)*(1-dr)*.5, ir=1/(r||1), ux=dx*ir, uy=dy*ir, off=g*st, di=(y*W+x)*4;
          for(let ch=0;ch<3;ch++){ const k=ch===0?kR:(ch===2?kB:1); let sx=Math.round(x-ux*off*k), sy=Math.round(y-uy*off*k); if(sx<0)sx=0; else if(sx>=W)sx=W-1; if(sy<0)sy=0; else if(sy>=W)sy=W-1; d[di+ch]=src[(sy*W+sx)*4+ch]; }
          const lift=rim*Math.exp(-dr*dr*6)*255; d[di]+=lift; d[di+1]+=lift; d[di+2]+=lift;
        } } }
      x2.putImageData(out,0,0); c.drawImage(cv,0,0,100,100);
      const ox=CXP, oy=CYP;
      c.fillStyle=TEAL; c.fillRect(ox-1.7,oy-1.7,3.4,3.4); c.fillStyle=NAVY; c.fillRect(ox-.6,oy-.6,1.2,1.2);
      if(Rp>0){ const rr=Rp/100*70.71, ang=-.5, hx=ox+Math.cos(ang)*rr, hy=oy+Math.sin(ang)*rr; c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.moveTo(ox,oy); c.lineTo(hx,hy); c.stroke(); diamond(c,hx,hy,2.2,KEY); }
      tab(c,3,3,'R '+String(Math.max(0,Math.round(Rp))).padStart(3,'0')+'%',NAVY,TXT,5);
    };
  } },

/* ---- Shake: I, chronophotograph. Real noise, Amount and Twist; exposures pile up, then the single layer moves alone. ---- */
{ id:'shake', name:'Shake', section:'Shakes / Movement', redrawn:true, still:2.0,
  line:'Jolts the whole layer with hard random hits of move, twist and zoom.',
  make(px){
    const P=4.4, S=Math.round(px*.6), {C,im}=pixels('cat',S), d=im.data, side=60, n4=d.length, gh=new ImageData(S,S), g=gh.data;
    /* silver print for the live layer, and a harder print whose ground goes to black so exposures only add where the subject is */
    for(let i=0;i<n4;i+=4){ const v=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255, w=255*(.05+.95*Math.pow(clamp(v*1.5),.85)), z=255*clamp((v-.2)/.5); d[i]=w*.98; d[i+1]=w; d[i+2]=w*1.02; g[i]=z*.98; g[i+1]=z; g[i+2]=z*1.02; g[i+3]=255; }
    const card=plate(S,S,im), ghost=plate(S,S,gh), AMT=120/1080*100, TW=10*Math.PI/180, ZO=.12, JIT=.65, SPD=14, N=9, DT=.18;
    const wn=u=>Math.sin(u*6.283)*.5+Math.sin(u*14.77+1.3)*.3+Math.sin(u*28.6+2.7)*.2;
    const ih=n=>{ n=Math.imul(n^(n>>>16),0x45d9f3b); n=Math.imul(n^(n>>>16),0x45d9f3b); return (((n^(n>>>16))>>>0)/4294967296)*2-1; };
    const nz=(u,off)=>(1-JIT)*wn(u+off)+JIT*ih((Math.floor(u*2)+((off*131)|0))|0);
    const pose=T=>{ const u=T*SPD+1e-9; return [AMT*nz(u,0),AMT*nz(u,55),TW*nz(u,200),1+ZO*Math.abs(nz(u,313))]; };
    const poses=[]; for(let i=0;i<N;i++) poses.push(pose(i*DT+.02));
    const put=(c,q,alpha,im2)=>{ c.save(); c.translate(50+q[0],50+q[1]); c.rotate(q[2]); c.scale(q[3],q[3]); c.globalAlpha=alpha; c.drawImage(im2||card,-side/2,-side/2,side,side); c.restore(); };
    const edge=(c,q,alpha)=>{ c.save(); c.translate(50+q[0],50+q[1]); c.rotate(q[2]); c.scale(q[3],q[3]); c.globalAlpha=alpha; c.strokeStyle='#f2f2f2'; c.lineWidth=.5/q[3]; c.strokeRect(-side/2,-side/2,side,side); c.restore(); };
    const rules=(c)=>{ c.fillStyle='#000'; c.fillRect(0,0,100,100); c.fillStyle='rgba(235,235,235,.2)'; for(let k=-4;k<=4;k++){ const v=50+k*AMT; c.fillRect(v-.15,0,.3,100); c.fillRect(0,v-.15,100,.3); }
      c.fillStyle='rgba(235,235,235,.75)'; c.fillRect(50,96,AMT,.5); c.fillRect(50,94.8,.5,2.9); c.fillRect(50+AMT-.5,94.8,.5,2.9); c.font='700 4.2px '+MONO; c.textBaseline='middle'; c.fillStyle='rgba(235,235,235,.8)'; c.fillText('120 PX',50+AMT+1.6,96.4); c.textBaseline='alphabetic'; };
    return (c,t)=>{ begin(c,px); const m=t%P; rules(c);
      if(m<2.4){ const n=m<.1?0:Math.min(N,Math.floor((m-.1)/DT)+1); c.globalCompositeOperation='lighter'; for(let i=0;i<n;i++){ put(c,poses[i],.42,ghost); edge(c,poses[i],.5); } c.globalCompositeOperation='source-over'; }
      else if(m<4.1){ put(c,pose(m),1); }
    };
  } },

/* ---- Tile Grid: C, contact sheet. Columns stepped 1, 2, 3; each cell is the whole layer, Gap on. ---- */
{ id:'gridrepeat', name:'Tile Grid', section:'Repetition', isNew:true, redrawn:true, still:2.3,
  line:'Repeats the whole layer in a grid of as many columns and rows as you ask for.',
  make(px){
    const P=4, [pic]=cover('tesla',Math.round(px*.6)), X0=9, Y0=9, S=82, GAP=.07, R=rng(12);
    const pts=[]; for(let i=0;i<=26;i++){ const a=-1.2+i/26*(TAU+.5), w=1+.08*vnoise(i*.55,3); pts.push([Math.cos(a)*w,Math.sin(a)*w]); }
    const count=m=>m<.75?1:(m<1.25?2:(m<3.4?3:1));
    return (c,t)=>{ begin(c,px); const m=t%P, n=count(m), cell=S/n, ins=cell*GAP/2;
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.fillStyle=PAPER; for(let k=0;k<7;k++){ const y=4.5+k*14; c.fillRect(1.8,y,3.4,6); c.fillRect(94.8,y,3.4,6); }
      c.save(); c.imageSmoothingQuality='high';
      for(let j=0;j<n;j++) for(let i=0;i<n;i++) c.drawImage(pic,X0+i*cell+ins,Y0+j*cell+ins,cell-2*ins,cell-2*ins);
      c.restore();
      c.font='700 4.6px '+MONO; c.fillStyle=PAPER; c.textBaseline='middle'; c.fillText('12A',9,4.6); c.fillText(n+' COL',9,95.4); c.textBaseline='alphabetic';
      if(n===3&&m>1.5){ const f=Math.floor(seg(m,1.5,2.0)*26)+1, cx=X0+cell*1.5+.0, cy=Y0+cell*1.5, r=cell*.46; c.strokeStyle=CHINA; c.lineWidth=1.3; c.lineJoin='round'; c.lineCap='round'; c.beginPath(); for(let i=0;i<Math.min(f,pts.length);i++){ const q=pts[i], x=cx+q[0]*r, y=cy+q[1]*r; if(i) c.lineTo(x,y); else c.moveTo(x,y); } c.stroke(); }
    };
  } },

/* ---- Starfield: J, Coal with white pen. Square stars, Fly-through: each grows from 1x to 2x as it leaves the focus. ---- */
{ id:'starfield', name:'Starfield', section:'Generative', isNew:true, redrawn:true, still:2.2,
  line:'Square star dots; Fly-through streams them out from a focus point.',
  make(px){
    /* a 720 px comp: Star size 6 is .83 units, Density .7 is 300 stars, Glint .6 on one in eight */
    const P=4.2, R=rng(77), FX=63, FY=41, SZ=600/720, GL=.6, TH=100/720, stars=[];
    for(let i=0;i<300;i++) stars.push({x:R()*100,y:R()*100,L:i%3,b:1-.5*R()*.9,g:R()<.125});
    const fly=m=>E.inOut(seg(m,.6,3.6));
    return (c,t)=>{ begin(c,px); const m=t%P, Fy=fly(m);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.fillStyle='#fff';
      for(const q of stars){ const ph=Fy+q.L/3, f=ph-Math.floor(ph), s=Math.pow(2,f), w=Math.sin(Math.PI*f); if(w<=.01) continue;
        const side=SZ*s, x=FX+(q.x-FX)*s-side/2, y=FY+(q.y-FY)*s-side/2; if(x>100||y>100||x+side<0||y+side<0) continue;
        c.globalAlpha=w*q.b; c.fillRect(x,y,side,side);
        if(q.g){ const L=GL*8*side, len=L/4, cx=x+side/2, cy=y+side/2; for(let k=0;k<4;k++){ c.globalAlpha=GL*w*.9*(1-(k+.5)/4)*q.b; const s0=side/2+k*len; c.fillRect(cx+s0,cy-TH/2,len,TH); c.fillRect(cx-s0-len,cy-TH/2,len,TH); c.fillRect(cx-TH/2,cy+s0,TH,len); c.fillRect(cx-TH/2,cy-s0-len,TH,len); } } }
      c.globalAlpha=1; c.strokeStyle='#fff'; c.lineWidth=.5; c.beginPath(); c.moveTo(FX-4,FY); c.lineTo(FX+4,FY); c.moveTo(FX,FY-4); c.lineTo(FX,FY+4); c.moveTo(FX,0); c.lineTo(FX,3.4); c.moveTo(100,FY); c.lineTo(96.6,FY); c.stroke();
      c.fillStyle='#fff'; c.beginPath(); c.arc(FX+4,FY,.6,0,TAU); c.fill();
      c.font='700 4.4px '+MONO; c.fillStyle='#fff'; c.fillText('FIG. 3',3.5,96.2); c.fillText('X 63',FX+1.8,5.4); c.textAlign='right'; c.fillText('Y 41',95.2,FY-1.4); c.textAlign='left';
    };
  } },

/* ---- Page Curl: B, comp sheets. The kernel's cylinder and its Lambert shade; Back is set to a solid colour, a real option. ---- */
{ id:'pagecurl', name:'Page Curl', section:'3D', isNew:true, redrawn:true, still:1.5,
  line:'Rolls a corner of the layer back; the underside is mirror, a colour or nothing.',
  make(px){
    const AM=.32, P=4.2, X=10, Y=9, SIDE=76, R=SIDE/2, CX=X+R, CY=Y+R, ang=Math.PI/4, dx=Math.cos(ang), dy=Math.sin(ang), rad=.2, m0=Math.abs(dx)+Math.abs(dy), F=3.2, SH=.5, Lx=.42, Ly=-.55, Lz=.72;
    const Tp=Math.round(px*.38), HH=Math.SQRT2+.02, D=Math.ceil(2*HH*Tp);
    const [pic]=cover('tesla',2*Tp);
    const dia=(fill)=>{ const [C,x]=blank(D,D); x.translate(D/2,D/2); x.rotate(-ang); if(typeof fill==='string'){ x.fillStyle=fill; x.fillRect(-Tp,-Tp,2*Tp,2*Tp); } else x.drawImage(fill,-Tp,-Tp,2*Tp,2*Tp); return C; };
    const texF=dia(pic), texB=dia(VERM), texK=dia('#000');
    const shade=(a)=>{ const nx=-Math.sin(a)*dx, ny=-Math.sin(a)*dy, nz=Math.cos(a), lam=Math.abs(nx*Lx+ny*Ly+nz*Lz); return (1-SH)+SH*(.25+.75*lam); };
    const amtAt=m=>{ if(m<.5) return 0; if(m<2.9) return AM*settle(seg(m,.5,1.5)); if(m<3.6) return AM*(1-E.inOut(seg(m,2.9,3.55))); return 0; };
    const Du=2*HH;
    return (c,t)=>{ begin(c,px); const m=t%P, amount=amtAt(m);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      c.fillStyle=INK; c.fillRect(X+3,Y+3,SIDE,SIDE);
      tab(c,X+SIDE-21,Y+SIDE-8.4,'CLIP 02',BONE,INK,4.2);
      /* the sheet: flat part, curve, then the flap, in the mesh's own order */
      const front=m0*(1-2*amount);
      c.save(); c.translate(CX,CY); c.scale(R,R); c.rotate(ang);
      const xFlat=Math.min(front,HH);
      c.drawImage(texF,0,0,(xFlat+HH)/Du*D,D,-HH,-HH,xFlat+HH,Du);
      c.globalAlpha=1-shade(0); c.drawImage(texK,0,0,(xFlat+HH)/Du*D,D,-HH,-HH,xFlat+HH,Du); c.globalAlpha=1;
      if(amount>.002){ const du=.04, end=m0, piEnd=front+Math.PI*rad, al=v=>v<=Math.PI?front+rad*Math.sin(v):front-(v-Math.PI)*rad, zz=v=>v<=Math.PI?rad*(1-Math.cos(v)):2*rad;
        const strip=(s0,s1,am)=>{ const a0=s0/rad, a1=s1/rad, P0=F/(F-zz(a0)), P1=F/(F-zz(a1)), Pm=F/(F-zz(am)), X0=al(a0)*P0, X1=al(a1)*P1, wd=X1-X0, dw=Math.abs(wd)+.012, sx=(front+s0+HH)/Du*D, sw=Math.max(.5,(s1-s0)/Du*D), hh=HH*Pm, back=am>Math.PI/2;
          c.save(); c.translate(X0,0); c.scale(wd>=0?1:-1,1); c.drawImage(back?texB:texF,sx,0,sw,D,0,-hh,dw,2*hh);
          if(!back){ c.globalAlpha=1-shade(am); c.drawImage(texK,sx,0,sw,D,0,-hh,dw,2*hh); c.globalAlpha=1; }
          c.restore(); };
        const stop=Math.min(piEnd,end);
        for(let u=front;u<stop-1e-4;u+=du){ const s0=u-front, s1=Math.min(u+du,stop)-front; strip(s0,s1,(s0+s1)/2/rad); }
        if(end>piEnd) strip(piEnd-front,end-front,Math.PI+1);
      }
      c.restore();
      tab(c,X,Y-5,'CLIP 01',INK,BONE,4.2);
    };
  } },

/* ---- Flicker: C, contact sheet. Real step hash at 12 Hz with Stays lit; opacity over nothing, the strip is the frames going past. ---- */
{ id:'flicker', name:'Flicker', section:'Opacity / Visibility', isNew:true, redrawn:true, still:2.6,
  line:'The whole layer drops in opacity on random frames.',
  make(px){
    const P=4, [pic]=cover('mclaren',px), Ms=Math.round(px*.35), [mini]=cover('mclaren',Ms), HZ=12, AM=.85, ST=.5, SEED=3;
    const lev=step=>{ let s=(step+Math.imul(SEED,7919))|0, h=(s^0x9e3779b9)>>>0; h=Math.imul(h^(h>>>16),0x45d9f3b)>>>0; h=Math.imul(h^(h>>>16),0x45d9f3b)>>>0; h=(h^(h>>>16))>>>0; let n=h/4294967295; n=n<=ST?0:(n-ST)/(1-ST); return 1-AM*n; };
    const Y1=70, S0=75, FH=17.5, FW=26, FG=1.6, N=48, cr=FH/FW;
    return (c,t)=>{ begin(c,px); const m=t%P, step=Math.floor(m*HZ)%N, k=lev(step);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      /* the output: the layer's opacity over nothing */
      c.globalAlpha=k; c.drawImage(pic,0,(100-Y1)/2/100*px,px,Y1/100*px,0,0,100,Y1); c.globalAlpha=1;
      /* the strip: the same frames going past at 12 fps, the red gate is the one on screen */
      c.fillStyle=PAPER; for(let i=0;i<14;i++){ const x=1.4+i*7.3; c.fillRect(x,Y1+1.4,3.4,1.6); c.fillRect(x,96.6,3.4,1.6); }
      for(let i=-2;i<=3;i++){ const f=((step+i)%N+N)%N, x=37+i*(FW+FG), v=lev(f); c.globalAlpha=v; c.drawImage(mini,0,Ms*(1-cr)/2,Ms,Ms*cr,x,S0,FW,FH); c.globalAlpha=1;
        if(v<.6){ c.strokeStyle=CHINA; c.lineWidth=1; c.lineCap='round'; c.beginPath(); c.moveTo(x+7,S0+3.2); c.lineTo(x+FW-7,S0+FH-3.2); c.moveTo(x+FW-7,S0+3.2); c.lineTo(x+7,S0+FH-3.2); c.stroke(); } }
      c.strokeStyle=CHINA; c.lineWidth=1.1; c.strokeRect(36.2,S0-.8,FW+1.6,FH+1.6);
    };
  } }
);
})();
