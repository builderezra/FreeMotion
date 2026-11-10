/* FreeMotion effect pictures, artist 8 (c8): Remove Object and six blurs. No photographs: every subject is drawn here, and every
   change is the effect's own maths run on those pixels (js/compositor.js, quoted per tile). */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=(h===undefined?w:h); return [C,C.getContext('2d')]; };
function tab(c,x,y,txt,s,bg,fg){ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; }
const poly=(c,p)=>{ c.beginPath(); for(let i=0;i<p.length;i++){ i?c.lineTo(p[i][0],p[i][1]):c.moveTo(p[i][0],p[i][1]); } c.closePath(); };

/* ---- pixel kit: interleaved RGBA floats, the same running-sum box the app's kernels use ---- */
/* one horizontal box pass, window 2r+1; zero = transparent outside (a CSS blur on a layer), else the edge pixel repeats (the box kernels) */
function boxH(a,W,H,r,zero){ if(r<1) return a; const o=new Float32Array(a.length), inv=1/(2*r+1);
  for(let y=0;y<H;y++){ const b=y*W*4;
    for(let ch=0;ch<4;ch++){ let s=0;
      for(let k=-r;k<=r;k++){ if(zero){ if(k>=0&&k<W) s+=a[b+k*4+ch]; } else s+=a[b+clamp(k,0,W-1)*4+ch]; }
      for(let x=0;x<W;x++){ o[b+x*4+ch]=s*inv; const xa=x+r+1, xb=x-r;
        if(zero){ if(xa<W) s+=a[b+xa*4+ch]; if(xb>=0&&xb<W) s-=a[b+xb*4+ch]; }
        else s+=a[b+(xa<W?xa:W-1)*4+ch]-a[b+(xb>0?xb:0)*4+ch]; } } }
  return o; }
function boxV(a,W,H,r,zero){ if(r<1) return a; const o=new Float32Array(a.length), inv=1/(2*r+1), st=W*4;
  for(let x=0;x<W;x++){ const b=x*4;
    for(let ch=0;ch<4;ch++){ let s=0;
      for(let k=-r;k<=r;k++){ if(zero){ if(k>=0&&k<H) s+=a[b+k*st+ch]; } else s+=a[b+clamp(k,0,H-1)*st+ch]; }
      for(let y=0;y<H;y++){ o[b+y*st+ch]=s*inv; const ya=y+r+1, yb=y-r;
        if(zero){ if(ya<H) s+=a[b+ya*st+ch]; if(yb>=0&&yb<H) s-=a[b+yb*st+ch]; }
        else s+=a[b+(ya<H?ya:H-1)*st+ch]-a[b+(yb>0?yb:0)*st+ch]; } } }
  return o; }
/* a Gaussian of standard deviation sigma (what CSS blur(sigma px) draws) as three box passes */
function gauss(a,W,H,sigma,zero){ if(sigma<.3) return a; const n=3, wI=Math.sqrt(12*sigma*sigma/n+1); let wl=Math.floor(wI); if(wl%2===0) wl--; const wu=wl+2, m=Math.round((12*sigma*sigma-n*wl*wl-4*n*wl-3*n)/(-4*wl-4));
  for(let i=0;i<n;i++){ const r=((i<m?wl:wu)-1)/2; a=boxH(a,W,H,r,zero); a=boxV(a,W,H,r,zero); } return a; }
function premul(d){ const a=new Float32Array(d.length); for(let i=0;i<d.length;i+=4){ const k=d[i+3]/255; a[i]=d[i]*k; a[i+1]=d[i+1]*k; a[i+2]=d[i+2]*k; a[i+3]=d[i+3]; } return a; }
function fromPremul(a,W,H){ const [C,x]=sheet(W,H), im=x.createImageData(W,H), o=im.data; for(let i=0;i<a.length;i+=4){ const al=a[i+3]; if(al>.5){ const k=255/al; o[i]=a[i]*k; o[i+1]=a[i+1]*k; o[i+2]=a[i+2]*k; o[i+3]=al; } } x.putImageData(im,0,0); return C; }
function fromStraight(a,W,H){ const [C,x]=sheet(W,H), im=x.createImageData(W,H); im.data.set(a); x.putImageData(im,0,0); return C; }

window.FX_TILES.push(

/* ---- REMOVE OBJECT. PIXEL_FX.touchup, Fill: Patch (the delogo border interpolation), Feather 12, run on a sea I painted: each pixel
   in the box is the 1/distance mix of the four pixels just outside it, so the horizon and the wave glints carry straight through and
   the box comes out smoother than the grain round it, as it really does. Box: X 59.4 Y 20.5 W 7.6 H 65.5. ---- */
{ id:'touchup', name:'Remove Object', section:'Keying', isNew:true, still:2.0,
  line:'A box you draw is painted over with the picture round its edges, so the marker post in the sea disappears.',
  make(px){
    const P=4.4, N=px, BX=58.2, BY=16.5, BW=10, BH=70, FEA=12;
    const [S,sx]=sheet(N); sx.setTransform(N/100,0,0,N/100,0,0);
    const R=rng(31);
    /* the plate: an overcast sea, a far headland, one north-cardinal post */
    let g=sx.createLinearGradient(0,0,0,56); g.addColorStop(0,'#a9b1b1'); g.addColorStop(1,'#d2d2ca'); sx.fillStyle=g; sx.fillRect(0,0,100,56.2);
    /* low stratus: long soft ellipses, darker on their undersides */
    for(const [cx,cy,w,h,a] of [[26,12,70,4.2,.2],[80,22,56,3,.15],[14,32,46,2.2,.12],[62,40,70,1.8,.1],[94,47,30,1.2,.08]]){ sx.save(); sx.translate(cx,cy); sx.scale(w/(2*h),1);
      const q=sx.createRadialGradient(0,h*.25,0,0,h*.25,h); q.addColorStop(0,'rgba(112,120,121,'+a+')'); q.addColorStop(1,'rgba(112,120,121,0)'); sx.fillStyle=q; sx.fillRect(-h,-h,2*h,2*h); sx.restore(); }
    sx.fillStyle='#a1a8a5'; poly(sx,[[72,56.2],[79,54.9],[86,54.4],[94,54.6],[100,54.3],[100,56.2]]); sx.fill();
    sx.fillStyle='#7c8582'; poly(sx,[[0,56.2],[0,47.6],[4.5,46.4],[10,45.7],[15.5,46.9],[21,47.7],[27,50.2],[33,53.4],[38,55.6],[40,56.2]]); sx.fill();
    g=sx.createLinearGradient(0,56,0,100); g.addColorStop(0,'#6d7876'); g.addColorStop(1,'#3a4442'); sx.fillStyle=g; sx.fillRect(0,56,100,44);
    sx.fillStyle='#9aa39f'; sx.fillRect(0,55.9,100,.45);
    for(let i=0;i<120;i++){ const f=Math.pow(R(),1.6), y=56.6+43*f, len=(3+R()*15)*(.35+f), x0=R()*110-8, th=.18+.55*f; sx.fillStyle='rgba(200,208,204,'+(.22+.33*R()).toFixed(2)+')'; sx.fillRect(x0,y,len,th); }
    /* the post: two black cones up, black over yellow, a little foam and a broken reflection */
    const PX=63.2;
    sx.fillStyle='#1b1c1a'; poly(sx,[[PX-3,30],[PX+3,30],[PX,25.2]]); sx.fill(); poly(sx,[[PX-3,24.4],[PX+3,24.4],[PX,19.6]]); sx.fill(); sx.fillRect(PX-.4,24,.8,6.4);
    sx.fillRect(PX-1.45,30.6,2.9,19.6); sx.fillStyle='#d4ad35'; sx.fillRect(PX-1.45,50.2,2.9,21.9); sx.fillStyle='rgba(255,255,255,.2)'; sx.fillRect(PX-1.45,30.6,.6,41.5);
    sx.fillStyle='rgba(222,228,224,.75)'; sx.fillRect(PX-3.2,71.8,6.4,.75);
    for(let i=0;i<9;i++){ const y=72.8+i*1.35, w=2.6+R()*1.8, o=(R()-.5)*1.6; sx.fillStyle=i<6?'rgba(126,106,40,.75)':'rgba(30,30,28,.6)'; sx.fillRect(PX-w/2+o,y,w,.7); }
    sx.setTransform(1,0,0,1,0,0);
    const im=sx.getImageData(0,0,N,N), d=im.data, RG=rng(7);
    for(let i=0;i<d.length;i+=4){ const n=(RG()+RG()-1)*7; d[i]+=n; d[i+1]+=n; d[i+2]+=n; }
    sx.putImageData(im,0,0);
    /* the real Patch, line for line */
    const out=new Uint8ClampedArray(d), rx=Math.round(BX/100*N), ry=Math.round(BY/100*N), rw=Math.round(BW/100*N), rh=Math.round(BH/100*N), x1=rx+rw, y1=ry+rh, F=Math.round(FEA*N/1080);
    const K=(x,y)=>{ if(F<=0) return 1; const de=Math.min(x-rx+1,x1-x,y-ry+1,y1-y); if(de>=F) return 1; const u=de/F; return u*u*(3-2*u); };
    const Lx=rx>0?rx-1:0, Rx=x1<N?x1:N-1, Tr=(ry>0?ry-1:0)*N, Br=(y1<N?y1:N-1)*N;
    for(let y=ry;y<y1;y++){ const row=y*N, Li=(row+Lx)*4, Ri=(row+Rx)*4, wt=1/(y-ry+1), wb=1/(y1-y);
      for(let x=rx;x<x1;x++){ const i=(row+x)*4, k=K(x,y), wl=1/(x-rx+1), wr=1/(x1-x), Ti=(Tr+x)*4, Bi=(Br+x)*4, ws=wl+wr+wt+wb;
        for(let c=0;c<4;c++){ const v=(d[Li+c]*wl+d[Ri+c]*wr+d[Ti+c]*wt+d[Bi+c]*wb)/ws; out[i+c]=k>=1?v:d[i+c]+(v-d[i+c])*k; } } }
    const PT=fromStraight(out,N,N);
    const X0=rx/N*100, Y0=ry/N*100, X1=x1/N*100, Y1=y1/N*100;
    return (c,t)=>{
      const u=mod(t,P);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      const fixed=u>=1.25&&u<3.7, box=u>=.5&&u<2.55;
      c.drawImage(fixed?PT:S,0,0);
      reset(c,px);
      if(box){
        /* the selection: marching ants on the effect's own box, corner handles, the Fill in a tab */
        const k=E.out(seg(u,.5,.72)), cx=(X0+X1)/2, cy=(Y0+Y1)/2, hw=(X1-X0)/2*lerp(.6,1,k), hh=(Y1-Y0)/2*lerp(.6,1,k);
        c.lineWidth=.5; c.setLineDash([1.3,1.3]);
        c.strokeStyle='#ffffff'; c.lineDashOffset=-(u*5)%2.6; c.strokeRect(cx-hw,cy-hh,2*hw,2*hh);
        c.strokeStyle=INK; c.lineDashOffset=-(u*5)%2.6+1.3; c.strokeRect(cx-hw,cy-hh,2*hw,2*hh); c.setLineDash([]);
        c.fillStyle='#ffffff'; c.strokeStyle=INK; c.lineWidth=.3;
        for(const [hx,hy] of [[cx-hw,cy-hh],[cx+hw,cy-hh],[cx-hw,cy+hh],[cx+hw,cy+hh]]){ c.fillRect(hx-.85,hy-.85,1.7,1.7); c.strokeRect(hx-.85,hy-.85,1.7,1.7); }
        if(k>=1) tab(c,X0-.25,Y0-7.4,'PATCH',4.4,INK,BONE);
      }
    };
  } },

/* ---- GAUSSIAN BLUR. Type: an eye chart on a card layer. The blur is what CSS blur(Radius px) draws, a Gaussian of that standard
   deviation on a 1080 frame, run on the card's own pixels with transparency round it (Repeat edges off), so the card's edge goes soft
   too. Radius steps 0, 8, 14, 20 on hard cuts: the small rows go first, the big E stays readable. ---- */
{ id:'blur', name:'Gaussian Blur', section:'Blur', isNew:true, still:2.4,
  line:'The whole layer goes soft: the finest detail disappears first and the big shapes last.',
  make(px){
    const P=4, N=Math.min(px,360), CX0=8, CX1=72, CY0=4, MID=(CX0+CX1)/2;
    const ROWS=[['E',24,33],['FP',11,56],['TOZ',7.5,69],['LPED',5.4,78.2],['PECFD',3.9,84.8],['EDFCZP',2.8,89.5],['FELOPZD',2,92.9],['DEFPOTEC',1.45,95.4]];
    const paint=x=>{ x.fillStyle=BONE; x.fillRect(CX0,CY0,CX1-CX0,120);
      x.fillStyle=INK; x.textAlign='center'; x.textBaseline='alphabetic';
      for(const [s,cap,y] of ROWS){ x.font=SANS(cap/.72); const n=s.length; for(let i=0;i<n;i++) x.fillText(s[i],MID+(i-(n-1)/2)*cap*1.78,y); }
      x.font=MONO(1.9); x.textAlign='right'; x.fillStyle='#6f6a60'; ['60','36','24','18','12','9','6','5'].forEach((v,i)=>x.fillText(v,CX1-1.8,ROWS[i][2])); };
    const [S,sx]=sheet(N); sx.setTransform(N/100,0,0,N/100,0,0); paint(sx); sx.setTransform(1,0,0,1,0,0);
    const src=premul(sx.getImageData(0,0,N,N).data), RADS=[0,8,14,20];
    const LV=RADS.map(r=>r?fromPremul(gauss(src,N,N,r*N/1080,true),N,N):null);
    return (c,t)=>{
      const u=mod(t,P), L=u<.7?0:u<1.05?1:u<1.4?2:u<3.3?3:0;
      reset(c,px); c.fillStyle=INK; c.fillRect(0,0,100,100);
      if(L===0) paint(c); else c.drawImage(LV[L],0,0,100,100);
      c.textAlign='left'; c.textBaseline='alphabetic';
      c.font=MONO(3.6); c.fillStyle='#8f897c'; c.fillText('RADIUS',76.5,83);
      c.font=MONO(11); c.fillStyle=BONE; c.fillText(String(RADS[L]),76,96.5);
    };
  } },

/* ---- BOX BLUR. Two-ink print: a curtain wall in ink on bone, a vermilion sky, the vermilion plate 0.7 out of register. PIXEL_FX.boxblur's
   own running-sum box with clamped edges, Smoothness 1: Radius 27 (a 55 px window on a 1080 frame), then Vertical amount 100 to 0. The
   mullions sit exactly one window apart, so the sideways-only box averages them out and leaves the floor slabs sharp. ---- */
{ id:'boxblur', name:'Box Blur', section:'Blur', isNew:true, still:2.9,
  line:'A square, slightly boxy blur; turn Vertical amount down and it only smears sideways.',
  make(px){
    const P=4.6, N=360, R=9, PITCH=19/N*100, FX0=38, TOP=14.5;
    const paint=x=>{
      x.fillStyle=BONE; x.fillRect(0,0,100,100);
      /* ink plate: the glass front, with floor slabs and mullions left as bare paper */
      x.fillStyle=INK; x.fillRect(FX0,TOP,64,90);
      x.fillStyle=BONE; x.fillRect(FX0,TOP,64,1.6);
      for(let k=1;k<10;k++){ const y=TOP+k*9; x.fillRect(FX0,y,64,1.7); }
      for(let m=0;m<13;m++){ const xx=FX0+1.2+m*PITCH; x.fillRect(xx,TOP,1.05,90); }
      /* the sunlit return face is bare paper; the ink plate gives it its slab lines */
      x.fillStyle=INK; for(let k=1;k<10;k++){ poly(x,[[29,19+k*9],[FX0,TOP+k*9],[FX0,TOP+k*9+.9],[29,19+k*9+.9]]); x.fill(); }
      /* vermilion plate, multiplied and 0.7 out of register: the sky */
      x.save(); x.translate(.7,-.35); x.globalCompositeOperation='multiply'; x.fillStyle=VERM;
      poly(x,[[-2,-2],[102,-2],[102,TOP],[FX0,TOP],[29,19],[29,102],[-2,102]]); x.fill();
      x.restore(); x.globalCompositeOperation='source-over';
      const Rr=rng(5); x.fillStyle='rgba(231,226,213,.7)'; for(let i=0;i<150;i++){ const sx=Rr()*100, sy=Rr()*100, r=.08+Rr()*.16; x.beginPath(); x.arc(sx,sy,r,0,TAU); x.fill(); }
    };
    const [S,sx]=sheet(N); sx.setTransform(N/100,0,0,N/100,0,0); paint(sx); sx.setTransform(1,0,0,1,0,0);
    const a=Float32Array.from(sx.getImageData(0,0,N,N).data);
    const box=(rh,rv)=>fromStraight(boxV(boxH(a,N,N,rh,false),N,N,rv,false),N,N);
    const CH=[null,box(4,4),box(R,R),box(R,6),box(R,3),box(R,0)], VAL=[[0,100],[12,100],[27,100],[27,67],[27,33],[27,0]];
    const [SP,sp]=sheet(px); sp.setTransform(px/100,0,0,px/100,0,0); paint(sp);
    const pic=i=>i?CH[i]:SP;
    return (c,t)=>{
      const u=mod(t,P);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      let s, back=0;
      if(u<.55) s=0; else if(u<1.0) s=2*E.inOut(seg(u,.55,1.0)); else if(u<1.9) s=2; else if(u<2.45) s=2+3*E.inOut(seg(u,1.9,2.45)); else if(u<3.7) s=5; else { s=0; back=1-E.inOut(seg(u,3.7,4.15)); }
      if(back>0){ c.drawImage(SP,0,0); c.globalAlpha=back; c.drawImage(CH[5],0,0,px,px); c.globalAlpha=1; }
      else { const i=Math.floor(s), f=s-i; c.drawImage(pic(i),0,0,px,px); if(f>.01&&i<5){ c.globalAlpha=f; c.drawImage(pic(i+1),0,0,px,px); c.globalAlpha=1; } }
      reset(c,px);
      const v=VAL[back>.5?5:Math.round(s)];
      tab(c,3,92,'R '+v[0]+'  V '+v[1]+'%',4.2,INK,BONE);
    };
  } },

/* ---- COMPOUND BLUR. Viewer: a tape measure on a desk, and under it the Blur map, a gradient layer whose dark band is keyed from the
   near end to the far end. drawCompoundBlur's own build: Max blur 26, Steps 5, the sharp layer first and each level laid on with its
   ramp "at least this blurry", so black stays sharp and white gets the full 26 px. ---- */
{ id:'compoundblur', name:'Compound Blur', section:'Blur', isNew:true, still:.5,
  line:'Blurs the layer by how bright a second layer is: black stays sharp and white blurs most, so moving the map pulls focus.',
  make(px){
    const P=4.8, N=Math.min(px,300), LEV=5, RAD=26, PH=78, WIDE=30, K=.9, CM0=20, CMS=16;
    /* a yellow tape measure lying across a desk, its near end on the left: 20 to 36 cm, foreshortened */
    const A=[-12,22.5], B=[106,33], C=[-12,62], D=[106,47.5];
    const f=u=>u*(1+K)/(1+K*u), on=(p,q,s)=>[lerp(p[0],q[0],s),lerp(p[1],q[1],s)];
    const paint=x=>{
      let g=x.createLinearGradient(0,0,60,100); g.addColorStop(0,'#3b342c'); g.addColorStop(1,'#1a1714'); x.fillStyle=g; x.fillRect(0,0,100,100);
      const Rr=rng(19); for(let i=0;i<90;i++){ const y=Rr()*100; x.fillStyle=Rr()<.5?'rgba(0,0,0,.28)':'rgba(255,236,200,.07)'; x.fillRect(Rr()*100-10,y,10+Rr()*30,.3+Rr()*.3); }
      /* the tape's shadow and its curl, then the tape */
      x.fillStyle='rgba(0,0,0,.45)'; poly(x,[[C[0],C[1]],[D[0],D[1]],[D[0],D[1]+1.6],[C[0],C[1]+3.4]]); x.fill();
      x.fillStyle='#c89a1c'; poly(x,[C,D,[D[0],D[1]+.6],[C[0],C[1]+1.2]]); x.fill();
      g=x.createLinearGradient(0,25,0,58); g.addColorStop(0,'#ffd84e'); g.addColorStop(.55,'#f2c230'); g.addColorStop(1,'#e2ae22'); x.fillStyle=g; poly(x,[A,B,D,C]); x.fill();
      x.lineCap='butt';
      for(let m=0;m<=CMS*10;m++){ const u=m/(CMS*10), s=f(u), T=on(A,B,s), Bt=on(C,D,s), w=1/(1+K*u), len=m%10===0?.36:m%5===0?.24:.15;
        x.strokeStyle='#141210'; x.lineWidth=(m%10===0?.55:.32)*w; x.beginPath(); x.moveTo(T[0],T[1]); x.lineTo(lerp(T[0],Bt[0],len),lerp(T[1],Bt[1],len)); x.stroke();
        if(m%10===0&&m<CMS*10){ const s2=f((m+5)/(CMS*10)), q=on(on(A,B,s2),on(C,D,s2),.64), cm=CM0+m/10; x.font=SANS(8.4*w); x.fillStyle=cm%10===0?'#c4271a':'#141210'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(String(cm),q[0],q[1]); } }
    };
    const [S0,s0]=sheet(px); s0.setTransform(px/100,0,0,px/100,0,0); paint(s0);
    const [S,sx]=sheet(N); sx.setTransform(N/100,0,0,N/100,0,0); paint(sx); sx.setTransform(1,0,0,1,0,0);
    const src=premul(sx.getImageData(0,0,N,N).data), LV=[S0];
    for(let L=1;L<=LEV;L++) LV.push(fromPremul(gauss(src,N,N,RAD*L/LEV*N/1080,false),N,N));
    const SW=Math.max(1,Math.round(px/100)), NS=Math.ceil(px/SW), ph=Math.round(px*PH/100);
    const NEAR=13, FAR=84;
    const focus=u=>u<.9?NEAR:u<1.9?lerp(NEAR,FAR,E.inOut(seg(u,.9,1.9))):u<3.3?FAR:u<4.3?lerp(FAR,NEAR,E.inOut(seg(u,3.3,4.3))):NEAR;
    const mapAt=(x,X)=>clamp(Math.abs(x-X)/WIDE);
    return (c,t)=>{
      const u=mod(t,P), X=focus(u);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.fillStyle=NAVY; c.fillRect(0,0,px,px);
      for(let i=0;i<NS;i++){ const x0=i*SW, w=Math.min(SW,px-x0), v=mapAt((x0+w/2)/px*100,X)*LEV, lb=Math.min(LEV,Math.floor(v)), fr=v-lb;
        const draw=L=>{ const cv=LV[L], k=cv.width/px; c.drawImage(cv,x0*k,0,w*k,ph*k,x0,0,w,ph); };
        draw(lb); if(fr>.01&&lb<LEV){ c.globalAlpha=fr; draw(lb+1); c.globalAlpha=1; } }
      reset(c,px);
      /* the Blur map layer, drawn to the picture's width: white blurs, black stays sharp */
      const MY=84.5, MH=7;
      for(let i=0;i<46;i++){ const x=i*100/46, v=Math.round(255*mapAt(x+50/46,X)); c.fillStyle='rgb('+v+','+v+','+v+')'; c.fillRect(x,MY,100/46+.08,MH); }
      c.strokeStyle=DIM; c.lineWidth=.5; c.strokeRect(.25,MY,99.5,MH);
      c.fillStyle=TEAL; c.fillRect(X-1.3,MY+MH/2-1.3,2.6,2.6);
      c.font=MONO(3.8); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText('BLUR MAP',1,82.6);
      c.textAlign='right'; c.fillStyle=TEXT; c.fillText('MAX 26',99,82.6);
      c.font=MONO(3.6); c.fillStyle=DIM; c.textAlign='left'; c.fillText('BLACK SHARP',1,97); c.textAlign='right'; c.fillText('WHITE SOFT',99,97);
    };
  } },

/* ---- DEFLICKER. Broadcast bench: a time-lapse of window light crossing a wall at 12 fps, its exposure jumping on every frame. The
   trace is the layer's mean brightness, frame by frame: grey is what comes in, white is what goes out. PIXEL_FX.deflicker's own
   smoother (Brown's double exponential, Smoothing 0.5 s, Maximum correction 1 EV) run over the same frames; once it is on, the jumps
   shrink to a quarter and the slow rise and fall of the light is kept. ---- */
{ id:'deflicker', name:'Deflicker', section:'Blur', isNew:true, still:3.4,
  line:'Brightness that jumps from frame to frame is evened out, while the slow change of the light is kept.',
  make(px){
    const P=4, FPS=12, NF=P*FPS, X0=4, Y0=4, W=92, H=56, FLOOR=46, ON=1.6;
    const WALL=[138,132,121], LIT=[238,232,216], FL=[72,67,60], lum=q=>.2126*q[0]+.7152*q[1]+.0722*q[2];
    const pos=k=>-16+(W+32)*k/NF;                   /* the patch's centre, in picture units, per frame */
    const evs=[]; for(let k=0;k<NF;k++) evs.push(-.42*hash(k,11)+.14*hash(k,23)-.02);
    /* mean luma of each frame, as the kernel measures it */
    const LITA=22*28-(2*28+22*2-4);
    const base=k=>{ const cx=pos(k), vis=clamp((Math.min(W,cx+11)-Math.max(0,cx-11))/22); const wallA=W*FLOOR, flA=W*(H-FLOOR), lit=LITA*vis;
      return (lum(WALL)*(wallA-lit)+lum(LIT)*lit+lum(FL)*flA)/(W*H); };
    const raw=[], gain=[]; let s1=0, s2=0, first=true; const a=1-Math.exp(-(1/FPS)/.5);
    for(let cyc=0;cyc<14;cyc++) for(let k=0;k<NF;k++){ const m=base(k)*Math.pow(2,evs[k]);
      if(first){ s1=s2=m; first=false; } else { s1+=(m-s1)*a; s2+=(s1-s2)*a; }
      raw[k]=m; gain[k]=clamp((2*s1-s2)/m,.5,2); }
    const BW=Math.round(px*W/100), BH=Math.round(px*H/100), [BUF,bx]=sheet(BW,BH);
    const rgb=q=>'rgb('+q[0]+','+q[1]+','+q[2]+')';
    const paintFrame=k=>{ bx.setTransform(BW/W,0,0,BH/H,0,0); bx.fillStyle=rgb(WALL); bx.fillRect(0,0,W,FLOOR); bx.fillStyle=rgb(FL); bx.fillRect(0,FLOOR,W,H-FLOOR);
      bx.fillStyle='rgba(0,0,0,.18)'; bx.fillRect(0,FLOOR-.8,W,.8);
      const cx=pos(k), sk=4, T=10, Bm=38; bx.fillStyle=rgb(LIT); poly(bx,[[cx-11+sk,T],[cx+11+sk,T],[cx+11-sk,Bm],[cx-11-sk,Bm]]); bx.fill();
      bx.fillStyle=rgb(WALL); const my=(T+Bm)/2, mx=cx+sk*(1-2*(my-T)/(Bm-T)); bx.fillRect(cx-11-sk,my-1,22+2*sk,2);
      poly(bx,[[cx-1+sk,T],[cx+1+sk,T],[cx+1-sk,Bm],[cx-1-sk,Bm]]); bx.fill(); void mx; };
    const live=j=>mod(j,NF)/FPS>=ON;
    const ymap=v=>lerp(96,70,clamp((v-70)/(150-70)));
    return (c,t)=>{
      const u=mod(t,P), k=Math.floor(u*FPS)%NF, onNow=u>=ON, m=Math.pow(2,evs[k])*(onNow?gain[k]:1);
      reset(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100);
      paintFrame(k);
      c.drawImage(BUF,X0,Y0,W,H);
      if(m<1){ c.globalAlpha=1-m; c.fillStyle='#000'; c.fillRect(X0,Y0,W,H); c.globalAlpha=1; }
      else if(m>1){ c.globalCompositeOperation='lighter'; c.globalAlpha=Math.min(1,m-1); c.drawImage(BUF,X0,Y0,W,H); c.globalAlpha=1; c.globalCompositeOperation='source-over'; }
      /* the scope: graticule at luma 75 and 125, the last two seconds of frames, newest on the right */
      c.fillStyle='#1f2633'; c.fillRect(X0,ymap(75)-.15,W,.3); c.fillRect(X0,ymap(125)-.15,W,.3);
      const n=24, xs=i=>X0+W*i/(n-1);
      c.lineJoin='round'; c.lineCap='round';
      c.strokeStyle='#5d6676'; c.lineWidth=.6; c.beginPath(); for(let i=0;i<n;i++){ const j=k-(n-1)+i, q=mod(j,NF); i?c.lineTo(xs(i),ymap(raw[q])):c.moveTo(xs(i),ymap(raw[q])); } c.stroke();
      c.strokeStyle=TEXT; c.lineWidth=1.05; c.beginPath(); for(let i=0;i<n;i++){ const j=k-(n-1)+i, q=mod(j,NF), v=raw[q]*(live(j)?gain[q]:1); i?c.lineTo(xs(i),ymap(v)):c.moveTo(xs(i),ymap(v)); } c.stroke();
      const vNow=raw[k]*(onNow?gain[k]:1); c.fillStyle=TEXT; c.fillRect(X0+W-1,ymap(vNow)-1,2,2);
      c.font=MONO(3.9); c.textBaseline='alphabetic'; c.textAlign='left'; c.fillStyle=DIM; c.fillText('LUMA',X0,67);
      c.textAlign='right'; c.fillStyle=onNow?TEXT:DIM; c.fillText(onNow?'DEFLICKER ON':'DEFLICKER OFF',X0+W,67);
    };
  } },

/* ---- BACKFILL. Comp sheet: a 9:16 clip (a zebra crossing shot straight down) in a square frame. paintFillBehind's defaults: the
   clip cover-scaled to the frame times Zoom 1.15, edge pixels clamped outward, a Gaussian of 60 px on a 1080 frame, then Dim 22 %. ---- */
{ id:'fillbehind', name:'Backfill', section:'Blur', isNew:true, still:2.2,
  line:'The empty frame round a narrow clip fills with a blown-up, blurred and dimmed copy of that clip.',
  make(px){
    const P=4.2, CW=56.25, CX0=(100-CW)/2, ZOOM=1.15, BLUR=60, DIMV=.22;
    const paintClip=x=>{ /* in clip units: 0..CW wide, 0..100 tall */
      x.fillStyle='#34312d'; x.fillRect(0,0,CW,100);
      const Rr=rng(41); for(let i=0;i<220;i++){ x.fillStyle=Rr()<.5?'rgba(0,0,0,.16)':'rgba(255,255,255,.05)'; x.fillRect(Rr()*CW,Rr()*100,.3+Rr()*.9,.3+Rr()*.9); }
      x.save(); x.beginPath(); x.rect(0,0,CW,100); x.clip(); x.translate(CW*.52,50); x.rotate(-.42);
      x.fillStyle=BONE; for(let i=-6;i<=6;i++) x.fillRect(-30,i*13-3.25,60,6.5);
      x.fillStyle='#34312d'; const Rw=rng(9); for(let i=0;i<160;i++){ const sy=Math.round(Rw()*12-6)*13-3.25+Rw()*6.5; x.fillRect(-30+Rw()*60,sy,.3+Rw()*1.1,.25+Rw()*.5); }
      x.fillStyle='rgba(52,49,45,.9)'; x.fillRect(29.4,-90,1.2,180); x.fillStyle=YEL; x.fillRect(31,-90,1,180); x.fillRect(32.8,-90,1,180);
      x.restore(); };
    /* the sharp clip at full size */
    const cw=Math.round(px*CW/100), [CL,cl]=sheet(cw,px); cl.setTransform(cw/CW,0,0,px/100,0,0); paintClip(cl);
    /* the fill, built at 1/3 size as the kernel builds it small */
    const N=Math.max(120,Math.round(px/3)), ncw=Math.round(N*CW/100), [SM,sm]=sheet(ncw,N); sm.setTransform(ncw/CW,0,0,N/100,0,0); paintClip(sm); sm.setTransform(1,0,0,1,0,0);
    const sd=sm.getImageData(0,0,ncw,N).data;
    const sigma=BLUR/1080*N, m=Math.ceil(sigma*3), EW=N+2*m, s=100/CW*ZOOM, ox=(100-CW*s)/2, oy=(100-100*s)/2;
    const ext=new Float32Array(EW*EW*4);
    for(let ey=0;ey<EW;ey++){ const fy=(ey-m+.5)/N*100, cy=clamp(Math.floor((fy-oy)/s/100*N),0,N-1);
      for(let ex=0;ex<EW;ex++){ const fx=(ex-m+.5)/N*100, cxp=clamp(Math.floor((fx-ox)/s/CW*ncw),0,ncw-1), si=(cy*ncw+cxp)*4, o=(ey*EW+ex)*4; ext[o]=sd[si]; ext[o+1]=sd[si+1]; ext[o+2]=sd[si+2]; ext[o+3]=255; } }
    const bl=gauss(ext,EW,EW,sigma,false), crop=new Float32Array(N*N*4);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const i=((y+m)*EW+x+m)*4, o=(y*N+x)*4; crop[o]=bl[i]*(1-DIMV); crop[o+1]=bl[i+1]*(1-DIMV); crop[o+2]=bl[i+2]*(1-DIMV); crop[o+3]=255; }
    const FILL=fromStraight(crop,N,N);
    return (c,t)=>{
      const u=mod(t,P), a=u<.8?0:u<.98?E.out(seg(u,.8,.98)):u<3.45?1:u<3.6?1-seg(u,3.45,3.6):0;
      reset(c,px); c.fillStyle=COAL; c.fillRect(0,0,100,100);
      if(a>0){ c.globalAlpha=a; c.drawImage(FILL,0,0,100,100); c.globalAlpha=1; }
      c.drawImage(CL,CX0,0,CW,100);
      tab(c,2.4,3,'9:16',4.2,VERM,BONE);
    };
  } },

/* ---- BLURRED RIM. Cut paper: a film reel cut from striped paper. PIXEL_FX.innerblur at Radius 27 (Ignore outside off, the default):
   a box blur of the colour that leaves alpha alone, so the cut edge stays sharp, the stripes melt, and the see-through black round
   every edge is averaged in as a dark rim, outside and round each hole. ---- */
{ id:'innerblur', name:'Blurred Rim', section:'Blur', isNew:true, still:2.2,
  line:'The colours inside the layer soften while its cut edge stays sharp, and a dark rim forms just inside every edge.',
  make(px){
    const P=4, N=px>=480?480:360, R=Math.round(27*N/1080), CX=44, CY=51, Rr=rng(13);
    const outer=[], holes=[];
    for(let i=0;i<15;i++){ const a=-1.6+i*TAU/15+(Rr()-.5)*.05, r=41+(Rr()-.5)*1.2; outer.push([CX+Math.cos(a)*r,CY+Math.sin(a)*r]); }
    for(let h=0;h<5;h++){ const a0=-1.1+h*TAU/5, hx=CX+Math.cos(a0)*22.8, hy=CY+Math.sin(a0)*22.8, p=[]; for(let i=0;i<7;i++){ const a=a0+i*TAU/7+(Rr()-.5)*.08, r=9+(Rr()-.5)*.9; p.push([hx+Math.cos(a)*r,hy+Math.sin(a)*r]); } holes.push(p); }
    const hub=[]; for(let i=0;i<6;i++){ const a=.3+i*TAU/6; hub.push([CX+Math.cos(a)*3.1,CY+Math.sin(a)*3.1]); }
    const path=x=>{ x.beginPath(); for(const pl of [outer,...holes,hub]){ pl.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])); x.closePath(); } };
    const PITCH=5.24*Math.sin(78*Math.PI/180);
    const paint=x=>{ x.save(); path(x); x.clip('evenodd'); x.fillStyle=YEL; x.fillRect(-10,-10,120,120);
      x.translate(CX,CY); x.rotate(-12*Math.PI/180); x.fillStyle=VERM; for(let i=-14;i<=14;i++) x.fillRect(i*PITCH,-70,PITCH*.5,140); x.restore(); };
    /* the layer alone, on transparency, then the kernel: RGB box-blurred with edges clamped, alpha untouched, transparent pixels skipped */
    const [S,sx]=sheet(N); sx.setTransform(N/100,0,0,N/100,0,0); paint(sx); sx.setTransform(1,0,0,1,0,0);
    const d=sx.getImageData(0,0,N,N).data, rgb=new Float32Array(d.length); for(let i=0;i<d.length;i+=4){ rgb[i]=d[i]; rgb[i+1]=d[i+1]; rgb[i+2]=d[i+2]; rgb[i+3]=0; }
    const level=r=>{ const b=boxV(boxH(rgb,N,N,r,false),N,N,r,false), o=new Uint8ClampedArray(d); for(let i=0;i<o.length;i+=4){ if(d[i+3]===0) continue; o[i]=b[i]; o[i+1]=b[i+1]; o[i+2]=b[i+2]; } return fromStraight(o,N,N); };
    const LV=[null,level(Math.round(R/3)),level(Math.round(2*R/3)),level(R)];
    return (c,t)=>{
      const u=mod(t,P), L=u<.75?0:u<.875?1:u<1.0?2:u<3.2?3:0;
      reset(c,px); c.fillStyle=BONE; c.fillRect(0,0,100,100);
      if(L===0) paint(c); else c.drawImage(LV[L],0,0,100,100);
    };
  } }

);
})();
