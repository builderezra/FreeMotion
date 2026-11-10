/* FreeMotion effect pictures, artist 0 (c0): seven Colouring effects, and not one photograph. Every subject is made here, and every
   effect is the kernel's own arithmetic from js/compositor.js run on that subject's pixels once, in make(). See each tile's note. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const frac=v=>v-Math.floor(v);
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; };
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; };
const canvasN=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
/* deterministic integer hash and value noise, so every subject is the same on every device */
const ih=(x,y,s)=>{ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; };
const n2=(x,y,s)=>{ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, a=xf*xf*(3-2*xf), b=yf*yf*(3-2*yf); return lerp(lerp(ih(xi,yi,s),ih(xi+1,yi,s),a),lerp(ih(xi,yi+1,s),ih(xi+1,yi+1,s),a),b); };
const fbm=(x,y,s,o)=>{ let f=0,a=1,t=0; for(let i=0;i<o;i++){ f+=a*n2(x,y,s+i*31); t+=a; x*=2.07; y*=2.07; a*=.5; } return f/t; };
/* an RGBA byte array as a canvas (written, never read back) */
const toCanvas=(W,H,d)=>{ const [C,x]=canvasN(W,H), im=x.createImageData(W,H); im.data.set(d); x.putImageData(im,0,0); return C; };
const smooth=(e0,e1,v)=>{ const s=v<=e0?0:v>=e1?1:(v-e0)/(e1-e0); return s*s*(3-2*s); };
/* a sheet that travels and lands a touch past its mark, then settles back (ease-out-back) */
const backOut=p=>{ p=clamp(p); const c1=1.5, c3=c1+1; return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2); };

/* AUTO GRADE, PIXEL_FX.autograde with Correct: Levels, Clip ends 1 %: the frame cut into 48 x 48 cells, each channel's 1 % and 99 %
   points (agQuantiles, interpolated over the cells) stretched to 0 and 255, with the 4x cap (agLut). Ported line for line. */
function agLUT(raw,W,H,clip){
  const GX=Math.min(48,W), GY=Math.min(48,H), NC=GX*GY;
  const split=(n,cells)=>{ const c=new Int32Array(n), f=new Float64Array(n); for(let i=0;i<n;i++){ let k=Math.floor(i*cells/n); if(k>cells-1) k=cells-1; const edge=(k+1)*n/cells; c[i]=k; f[i]=(k<cells-1&&i+1>edge+1e-9)?edge-i:1; } return {c,f}; };
  const sx=split(W,GX), sy=split(H,GY), S=new Float64Array(NC*4), row=new Float64Array(GX*4+4);
  for(let y=0;y<H;y++){
    for(let x=0,i=y*W*3;x<W;x++,i+=3){ const k=sx.c[x]*4, f=sx.f[x], r=raw[i], g=raw[i+1], b=raw[i+2], a=255;
      if(f===1){ row[k]+=r*a; row[k+1]+=g*a; row[k+2]+=b*a; row[k+3]+=a; }
      else { const wa=a*f, wb=a-wa; row[k]+=r*wa; row[k+1]+=g*wa; row[k+2]+=b*wa; row[k+3]+=wa; row[k+4]+=r*wb; row[k+5]+=g*wb; row[k+6]+=b*wb; row[k+7]+=wb; } }
    const fy=sy.f[y], o=sy.c[y]*GX*4, o2=o+GX*4;
    for(let j=0;j<GX*4;j++){ const v=row[j]; if(!v) continue; if(fy===1) S[o+j]+=v; else { S[o+j]+=v*fy; S[o2+j]+=v*(1-fy); } row[j]=0; }
  }
  const area=255*(W/GX)*(H/GY), R=new Float64Array(NC), G=new Float64Array(NC), B=new Float64Array(NC), w=new Float64Array(NC), list=[]; let total=0;
  for(let c=0;c<NC;c++){ const s=S[c*4+3]; if(!(s>0)) continue; R[c]=S[c*4]/s; G[c]=S[c*4+1]/s; B[c]=S[c*4+2]/s; w[c]=s/area; total+=w[c]; list.push(c); }
  const quant=v=>{ const L=list.slice().sort((a,b)=>(v[a]-v[b])||(a-b));
    const at=target=>{ let run=0,pv=0,pc=-1; for(const k of L){ const c=run+w[k]/2; if(c>=target) return pc<0?v[k]:pv+(v[k]-pv)*(target-pc)/(c-pc); pv=v[k]; pc=c; run+=w[k]; } return pv; };
    return [at(clip*total),at((1-clip)*total)]; };
  const conf=Math.min(1,(total-1)/3);
  return [R,G,B].map(v=>{ const q=quant(v), lo=q[0], r=Math.max(0,q[1]-lo), L=new Uint8ClampedArray(256); let m,b;
    if(r*4>=255){ m=255/r; b=-lo*m; } else { m=4; b=-3*255*lo/(255-r); }
    for(let x=0;x<256;x++){ let f=m*x+b; f=f<0?0:(f>255?255:f); L[x]=x+(f-x)*conf; }
    return L; });
}

/* PIXEL_FX.bumpmap's loop with Light colour white and Shine 0 (the plain loop): normal (-gx, -gy, k) from the neighbours' Rec.601 luma,
   one Lambert term, times the pixel. k is 4 x 100 / Relief, and the 225 degree light is the literal (-.5, -.5, 1) the kernel keeps. */
function bumpRun(s,W,H,amt,relief,ambient,ang){
  const k=relief===100?4:4*(100/relief), amb=ambient===50?.5:ambient/100;
  let Lx,Ly; if(ang===225){ Lx=-.5; Ly=-.5; } else { const r=ang*Math.PI/180; Lx=Math.cos(r)*Math.SQRT1_2; Ly=Math.sin(r)*Math.SQRT1_2; }
  const ll=Math.sqrt(Lx*Lx+Ly*Ly+1); Lx/=ll; Ly/=ll; const Lz=1/ll;
  const d=new Uint8ClampedArray(W*H*4), lum=i=>.299*s[i]+.587*s[i+1]+.114*s[i+2];
  for(let y=0;y<H;y++){ const yu=y>0?y-1:0, yd=y<H-1?y+1:H-1;
    for(let x=0;x<W;x++){ const i=(y*W+x)*4, xl=x>0?x-1:0, xr=x<W-1?x+1:W-1;
      const gx=(lum((y*W+xr)*4)-lum((y*W+xl)*4))/255, gy=(lum((yd*W+x)*4)-lum((yu*W+x)*4))/255;
      let nx=-gx, ny=-gy, nz=k; let nl=Math.sqrt(nx*nx+ny*ny+nz*nz); if(nl<1e-6) nl=1e-6; nx/=nl; ny/=nl; nz/=nl;
      let df=nx*Lx+ny*Ly+nz*Lz; if(df<0) df=0; const F=amb+amt*.6*df;
      d[i]=s[i]*F; d[i+1]=s[i+1]*F; d[i+2]=s[i+2]*F; d[i+3]=255; } }
  return d;
}

/* PIXEL_FX.bwmixer's grey: of the three channels the smallest stays, the step to the middle is weighted by the secondary the two biggest
   make, the step to the biggest by the primary. w = [Reds, Yellows, Greens, Cyans, Blues, Magentas] as fractions. */
function bwGrey(r,g,b,w){ const [wR,wY,wG,wC,wB,wM]=w; let mx,md,mn,wp,ws;
  if(r>=g){ if(g>=b){ mx=r; md=g; mn=b; wp=wR; ws=wY; } else if(r>=b){ mx=r; md=b; mn=g; wp=wR; ws=wM; } else { mx=b; md=r; mn=g; wp=wB; ws=wM; } }
  else if(r>=b){ mx=g; md=r; mn=b; wp=wG; ws=wY; } else if(g>=b){ mx=g; md=b; mn=r; wp=wG; ws=wC; } else { mx=b; md=g; mn=r; wp=wB; ws=wC; }
  const v=mn+(md-mn)*ws+(mx-md)*wp; return v<0?0:(v>255?255:v); }

/* the two box passes Highlights & Shadows and Clarity share (hsBox): half-width b, zero past the ends, unnormalised */
function hsBox(a,W,H,b,alongRows,line){ const n=alongRows?W:H, m=alongRows?H:W, step=alongRows?1:W, top=b<n-1?b:n-1;
  for(let q=0;q<m;q++){ const o=alongRows?q*W:q; for(let k=0,i=o;k<n;k++,i+=step) line[k]=a[i]; let acc=0; for(let k=0;k<=top;k++) acc+=line[k];
    for(let k=0,i=o;k<n;k++,i+=step){ a[i]=acc; const ki=k+b+1, ko=k-b; if(ki<n) acc+=line[ki]; if(ko>=0) acc-=line[ko]; } } }
function hsTent(a,W,H,b,line){ hsBox(a,W,H,b,true,line); hsBox(a,W,H,b,true,line); hsBox(a,W,H,b,false,line); hsBox(a,W,H,b,false,line); }
/* PIXEL_FX.clarity on an opaque plate, Texture 0, Keep blacks & whites 100, Haze colour White: Clarity's soft-clipped local push, then
   Dehaze's dark-channel veil (held at or below the pixel's own darkest channel, Protect sky ramping in from 60 % to 90 %) taken out. */
function clarityRun(s,W,H,ps,cl,dh,radius,sky){
  const N=W*H, R=radius*ps, bC=Math.max(1,Math.min(300,Math.round(R/2))), A=255, ga=cl>0?1.5*cl:cl;
  const line=new Float64Array(Math.max(W,H)), YC=new Float64Array(N), KD=new Float64Array(N);
  for(let j=0,i=0;j<N;j++,i+=4){ YC[j]=((299*s[i]+587*s[i+1]+114*s[i+2]+500)/1000)|0; const q=Math.min(s[i],s[i+1],s[i+2]); KD[j]=q>=255?255:Math.round(q); }
  if(ga) hsTent(YC,W,H,bC,line); if(dh>0) hsTent(KD,W,H,bC,line);
  const cx=new Float64Array(W).fill(1), cy=new Float64Array(H).fill(1); hsBox(cx,W,1,bC,true,line); hsBox(cx,W,1,bC,true,line); hsBox(cy,H,1,bC,true,line); hsBox(cy,H,1,bC,true,line);
  const d=new Uint8ClampedArray(N*4);
  for(let y=0,j=0;y<H;y++) for(let x=0;x<W;x++,j++){ const i=j*4; let r=s[i], g=s[i+1], u=s[i+2]; const den=cx[x]*cy[y];
    if(ga){ const Y=((299*r+587*g+114*u+500)/1000)|0; let push=ga*(Y-YC[j]/den); const L=Y/255; push=push*(4*L*(1-L))/255;
      if(push<0){ const Lf=(.299*r+.587*g+.114*u)/255; if(Lf>0){ const k=Lf/(Lf-push); r*=k; g*=k; u*=k; } }
      else if(push>0){ const v=1-(.299*r+.587*g+.114*u)/255; if(v>0){ const m=v/(v+push); r=255-(255-r)*m; g=255-(255-g)*m; u=255-(255-u)*m; } } }
    if(dh>0){ const vb=KD[j]/den/255, own=Math.min(r/A,g/A,u/A), v=vb<own?vb:own;
      if(v>0){ const om=.9*dh*(sky>0?1-sky*smooth(.6,.9,vb):1), xv=om*v, inv=1/(1-xv); r=(r-A*xv)*inv; g=(g-A*xv)*inv; u=(u-A*xv)*inv; } }
    d[i]=r; d[i+1]=g; d[i+2]=u; d[i+3]=255; }
  return d;
}

window.FX_TILES.push(

/* AUTO GRADE. Broadcast bench. An old anchor and its chain on the seabed, made here and filmed underwater: the water eats red with
   distance and lays a green veil, and the camera recorded it flat. Levels runs on every frame of the moving caustics (agLUT above); the
   RGB parade under it is that frame's own pixels, so its traces really do stretch to the black and white lines when the grade comes on.
   Hard cut on, hold, hard cut off. Checked against the real renderer on these very pixels: identical, byte for byte. */
{ id:'autograde', name:'Auto Grade', section:'Colouring', isNew:true, still:2.2,
  line:'A flat, tinted shot gets its black, white and colour set from the picture itself.',
  make(px){
    const P=4, W=256, H=144, N=W*H, NF=12, vh=-.2, K=1.9;
    const VEIL=[18,104,112], BETA=[.72,.3,.38];
    const J=new Float32Array(N*3), SA=new Float32Array(N), SB=new Float32Array(N), TR=new Float32Array(N*3), CW=new Float32Array(N);
    /* the anchor lies flat on the sand: shapes as distance fields in floor units (X across, Z away from the camera) */
    const ANG=1.2, L=.95, CR=[-.42,1.0], DIR=[Math.cos(ANG),Math.sin(ANG)], NRM=[-Math.sin(ANG),Math.cos(ANG)];
    const at=(s,t)=>[CR[0]+DIR[0]*s+NRM[0]*t,CR[1]+DIR[1]*s+NRM[1]*t];
    const capD=(p,a,b,r)=>{ const bx=b[0]-a[0], by=b[1]-a[1], h=clamp(((p[0]-a[0])*bx+(p[1]-a[1])*by)/(bx*bx+by*by)); return Math.hypot(p[0]-a[0]-bx*h,p[1]-a[1]-by*h)-r; };
    const triD=(p,T)=>{ let m=-1e9; for(let i=0;i<3;i++){ const a=T[i], b=T[(i+1)%3], ex=b[0]-a[0], ey=b[1]-a[1], l=Math.hypot(ex,ey); m=Math.max(m,((p[0]-a[0])*ey-(p[1]-a[1])*ex)/l); } return m; };
    const SH0=at(0,0), SH1=at(L,0), RING=at(L+.075,0), ST0=at(L*.82,-.38), ST1=at(L*.82,.38), AC=at(.32,0), AR=.32, DOWN=Math.atan2(-DIR[1],-DIR[0]), SPAN=1.25;
    const armEnd=sg=>{ const a=DOWN+sg*SPAN; return [AC[0]+Math.cos(a)*AR,AC[1]+Math.sin(a)*AR]; };
    const FLK=[1,-1].map(sg=>{ const e=armEnd(sg), o=[(e[0]-AC[0])/AR,(e[1]-AC[1])/AR], tip=[e[0]+DIR[0]*.17+o[0]*.03,e[1]+DIR[1]*.17+o[1]*.03];
      const T=[[e[0]-o[0]*.075-DIR[0]*.03,e[1]-o[1]*.075-DIR[1]*.03],[e[0]+o[0]*.075-DIR[0]*.03,e[1]+o[1]*.075-DIR[1]*.03],tip];
      const cw=(T[1][0]-T[0][0])*(T[2][1]-T[0][1])-(T[1][1]-T[0][1])*(T[2][0]-T[0][0]); return cw<0?T:[T[0],T[2],T[1]]; });
    const anchorD=p=>{ let d=Math.min(capD(p,SH0,SH1,.045),capD(p,ST0,ST1,.03),Math.abs(Math.hypot(p[0]-RING[0],p[1]-RING[1])-.07)-.017);
      d=Math.min(d,Math.hypot(p[0]-ST0[0],p[1]-ST0[1])-.045,Math.hypot(p[0]-ST1[0],p[1]-ST1[1])-.045);
      const q=[p[0]-AC[0],p[1]-AC[1]]; let a=Math.atan2(q[1],q[0])-DOWN; a=Math.atan2(Math.sin(a),Math.cos(a));
      d=Math.min(d,Math.abs(a)<=SPAN?Math.abs(Math.hypot(q[0],q[1])-AR)-.04:Math.min(...[1,-1].map(sg=>{ const e=armEnd(sg); return Math.hypot(p[0]-e[0],p[1]-e[1])-.04; })));
      for(const T of FLK) d=Math.min(d,triD(p,T)-.004);
      return d; };
    /* the chain: links along a lazy curve from the ring away into the murk, every other one seen edge on */
    const LINKS=[]; { let q=RING.slice(), h=ANG-.25; for(let k=0;k<46;k++){ h+=.06*Math.sin(k*.21)-.004; const s=[Math.cos(h),Math.sin(h)]; const c=[q[0]+s[0]*.04,q[1]+s[1]*.04]; LINKS.push([c,s,k&1]); q=[q[0]+s[0]*.075,q[1]+s[1]*.075]; } }
    const chainD=p=>{ let d=1e9; for(const [c,s,odd] of LINKS){ if(Math.abs(p[0]-c[0])>.12||Math.abs(p[1]-c[1])>.12) continue; const a=[c[0]-s[0]*.03,c[1]-s[1]*.03], b=[c[0]+s[0]*.03,c[1]+s[1]*.03];
      d=Math.min(d,odd?capD(p,a,b,.011):Math.abs(capD(p,a,b,.022))-.009); } return d; };
    for(let y=0;y<H;y++){ const v=(y+.5)/H, Z=1/(v-vh), pxu=W/(Z*K), pyu=H/(Z*Z), sc=Math.sqrt(pxu*pyu);
      for(let x=0;x<W;x++){ const u=(x+.5)/W, j=y*W+x, X=(u-.5)*Z*K, p=[X,Z];
        /* sand: current-laid ripples and darker patches */
        const rp=Math.sin((X*.42+Z*.91)*44+2.4*n2(X*4,Z*4,5)); let f=(.9+.1*rp)*(.86+.26*fbm(X*2,Z*2,6,3));
        let r=190*f, g=176*f, bl=146*f;
        const da=anchorD(p), dc=chainD(p), dm=Math.min(da,dc);
        /* contact shadow and the anchor's own shadow on the sand */
        const sh=Math.min(da,dc,anchorD([X-.035,Z+.03])+.01,chainD([X-.03,Z+.02])+.006), shade=1-.5*(1-smooth(0,.07,sh));
        r*=shade; g*=shade; bl*=shade;
        const cv=clamp(.5-dm*sc);
        if(cv>0){ const iron=dc<da, w=iron?.02:.04, cyl=clamp(-dm/w), rust=.78+.4*n2(X*30,Z*30,14), k=(.55+.55*Math.sqrt(cyl))*rust, ac=iron?[80,64,54]:[108,68,48];
          r=lerp(r,ac[0]*k,cv); g=lerp(g,ac[1]*k,cv); bl=lerp(bl,ac[2]*k,cv); }
        J[j*3]=r; J[j*3+1]=g; J[j*3+2]=bl; SA[j]=X; SB[j]=Z; CW[j]=1;
        for(let c=0;c<3;c++) TR[j*3+c]=Math.exp(-BETA[c]*Z*1.15*1.1);
      } }
    /* caustics: the bright net the surface throws on the floor; the phase only ever turns whole multiples, so 12 steps make a seamless cycle */
    const caus=(a,b,ph)=>{ const s=Math.sin(a*27+2*Math.sin(b*21+ph)+ph)+.9*Math.sin(b*25-1.7*Math.sin(a*23-2*ph)-ph), q=clamp(1-Math.abs(s)*.8); return q*q*q*q; };
    const PW=80, PH=60;
    const parade=px8=>{ const cnt=new Float32Array(3*PW*PH), o=new Uint8ClampedArray(3*PW*PH*4);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const j=(y*W+x)*4, col=(x*PW/W)|0; for(let ch=0;ch<3;ch++){ const row=Math.round((255-px8[j+ch])/255*(PH-1)); cnt[row*3*PW+ch*PW+col]++; } }
      for(let i=0;i<cnt.length;i++){ const a=1-Math.exp(-cnt[i]/14); o[i*4]=238; o[i*4+1]=242; o[i*4+2]=248; o[i*4+3]=255*a; }
      return toCanvas(3*PW,PH,o); };
    const frames=[];
    for(let f=0;f<NF;f++){ const ph=f/NF*TAU, raw=new Uint8ClampedArray(N*3);
      for(let j=0;j<N;j++){ const L=Math.min(1.34,.74+.62*caus(SA[j],SB[j],ph)*CW[j]+(1-CW[j])*.3);
        for(let k=0;k<3;k++){ const t=TR[j*3+k], val=J[j*3+k]*L*t+VEIL[k]*(1-t); raw[j*3+k]=val*.72+38+(ih(j,k,f)-.5)*3; } }
      const lut=agLUT(raw,W,H,.01), a8=new Uint8ClampedArray(N*4), g8=new Uint8ClampedArray(N*4);
      for(let j=0;j<N;j++){ for(let k=0;k<3;k++){ a8[j*4+k]=raw[j*3+k]; g8[j*4+k]=lut[k][raw[j*3+k]]; } a8[j*4+3]=255; g8[j*4+3]=255; }
      frames.push({raw:toCanvas(W,H,a8),gr:toCanvas(W,H,g8),pr:parade(a8),pg:parade(g8)}); }
    const PY=60.5, PHU=28, PWU=29.34, GAP=3;
    return (c,t)=>{
      const u=mod(t,P), fr=Math.floor(u*25), on=u>=1.28&&u<3.4, F=frames[Math.floor(u*12)%NF];
      reset(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100);
      c.drawImage(on?F.gr:F.raw,3,3,94,53);
      for(let ch=0;ch<3;ch++){ const x0=3+ch*(PWU+GAP);
        c.fillStyle='#1c212a'; c.fillRect(x0,PY+PHU/2-.15,PWU,.3);
        c.fillStyle='#4a5262'; c.fillRect(x0,PY-.2,PWU,.4); c.fillRect(x0,PY+PHU-.2,PWU,.4);
        c.drawImage(on?F.pg:F.pr,ch*PW,0,PW,PH,x0,PY,PWU,PHU); }
      const p2=v=>(v<10?'0':'')+v, tc=41*25+12+fr;
      c.font=MONO(4.6); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='middle'; c.fillText('00:00:'+p2(Math.floor(tc/25)%60)+':'+p2(tc%25),3,95.2);
      if(on) tab(c,83.6,91.7,'AUTO',4.6,YEL,INK); else { c.font=MONO(4.6); c.fillStyle=DIM; c.textAlign='right'; c.fillText('BYPASS',97,95.2); }
    };
  } },

/* BLEACH BYPASS. Graded still. A terrace of painted stucco houses made here, sun from the left: pink, primrose, mint and powder blue,
   white trim, glossy front doors, black railings. The kernel at its defaults, Amount .7, Colour loss 60, Harshness 100: each colour pulled
   60 % of the way to its own grey, then overlaid with that grey. Output is linear in Amount, so the full process is built once and laid
   over the picture at Amount, which steps up on twos and holds. Checked against the real renderer on these pixels (within 1 level). */
{ id:'bleachbypass', name:'Bleach Bypass', section:'Colouring', isNew:true, still:2.4,
  line:'Colour drains and contrast gets harsher, the look of film developed without its bleach.',
  make(px){
    const P=4.2, N=300, U=N/100, n=N*N, src=new Uint8ClampedArray(n*4), blc=new Uint8ClampedArray(n*4);
    /* [x0, x1, stucco, door, door on the right?] in 0..100 units */
    const HOUSES=[[-12,22,[214,142,150],[150,28,36],1],[22,56,[234,208,130],[26,28,34],0],[56,90,[148,194,170],[32,48,90],1],[90,124,[146,172,208],[122,32,40],0]];
    const TRIM=[236,233,224], IRON=[24,24,27];
    const ov=(b,o)=>b<128?(2*b*o/255):(255-2*(255-b)*(255-o)/255);
    /* a sash window: white frame, dark glass with the sky in its top, glazing bars, the reveal's shadow on its left and under its head */
    const pane=(lx,v,x0,y0,ww,hh,bars)=>{ const a=lx-x0, b=v-y0; if(a<0||b<0||a>ww||b>hh) return null;
      if(a<.9||b<.9||a>ww-.9||b>hh-.9) return TRIM.map(q=>q*(a<.9?1.04:b<.9?1.06:.9));
      const gx=a-.9, gy=b-.9, gw=ww-1.8, gh=hh-1.8;
      if(Math.abs(gy-gh/2)<.3||bars&&(Math.abs(gx-gw/3)<.22||Math.abs(gx-2*gw/3)<.22)||Math.abs(gy-gh/4)<.22&&bars||Math.abs(gy-3*gh/4)<.22&&bars) return TRIM.map(q=>q*.92);
      const sky=Math.pow(1-gy/gh,2), sheen=Math.exp(-Math.pow((gx-gy*.5-gw*.2)/1.6,2))*.5;
      let k=1; if(gx<1.4) k*=.55; if(gy<1.1) k*=.6;
      return [ (34+60*sky+50*sheen)*k, (40+66*sky+50*sheen)*k, (50+80*sky+52*sheen)*k ]; };
    for(let y=0;y<N;y++){ const v=(y+.5)/U;
      for(let x=0;x<N;x++){ const u=(x+.5)/U, i=(y*N+x)*4; let r,g,b;
        const H=HOUSES.find(h=>u>=h[0]&&u<h[1]), lx=u-H[0], w=H[1]-H[0], right=H[4];
        let c=H[2], f=(.95+.08*fbm(u*.25,v*.25,7,3))*(1.05-.08*u/100);
        if(v>58.6&&frac((v-58.6)/3.4)<.09) f*=.84;                                   /* rusticated ground floor */
        if(lx<1.3||lx>w-1.3) c=TRIM;                                                  /* the party-wall pilasters */
        if(v>=20.5&&v<22.6||v>=56.6&&v<58.6){ c=TRIM; f=(v<21.1||v>=56.6&&v<57.2)?1.06:.93; }   /* cornices */
        else if(v>=22.6&&v<24.2||v>=58.6&&v<60.2) f*=.7;                               /* their shadow */
        let q=null;
        const DX=right?w-14:5, WX=right?5:w-17;
        q=q||pane(lx,v,5.5,6,7,12,true)||pane(lx,v,w-12.5,6,7,12,true);
        q=q||pane(lx,v,5,28,8.5,22,true)||pane(lx,v,w-13.5,28,8.5,22,true);
        q=q||pane(lx,v,WX,64,12,20,true);
        /* balconettes in front of the first-floor windows */
        for(const bx of [5,w-13.5]){ const a=lx-bx; if(a>=-.4&&a<=8.9&&v>=43.5&&v<50.6&&(v<44.2||frac(a/1.3)<.27)) q=IRON.map(z=>z*(frac(a/1.3)<.09?2.4:1)); }
        /* the front door: frame, fanlight, panels, knob and letterbox */
        { const a=lx-DX, b=v-63;
          if(a>=-1&&a<=10&&b>=-5.6&&v<90){ const fl=Math.hypot(a-4.5,b), inDoor=a>=0&&a<=9&&b>=0;
            if(inDoor){ const dc=H[3]; let k=1; if(a<1.4) k*=.55; const pa=frac(a/4.5), pb=(b-1.5)/12.5;
              if((Math.abs(pa-.5)>.36||Math.abs(frac(pb)-.5)>.42)&&b>1.5) k*=1.12; else if(b>1.5) k*=.86;
              k*=1+.35*Math.exp(-Math.pow((a-2.6)/.7,2));
              q=dc.map(z=>z*k); if(Math.hypot(a-7.4,b-13.5)<.75) q=[206,172,92]; if(Math.abs(b-9.5)<.4&&a>3&&a<6) q=[30,26,22]; }
            else if(b<0&&fl<4.5){ const ang=Math.atan2(-b,a-4.5); q=(fl<.7||Math.abs(frac(ang/(Math.PI/5))-.5)>.44)?TRIM.map(z=>z*.92):[44,52,62]; }
            else if(b<0&&fl<5.6||b>=0&&(a<0||a>9)) q=TRIM.map(z=>z*(a<0?1.03:.9)); } }
        if(!q&&v>=90&&v<92&&lx>DX-1.5&&lx<DX+10.5) q=[222,218,208].map(z=>z*(v<90.5?1.05:.88));   /* the step */
        if(q){ r=q[0]; g=q[1]; b=q[2]; } else { r=c[0]*f; g=c[1]*f; b=c[2]*f; }
        if(v>=92){ const s=.86+.2*fbm(u*.6,v*1.5,11,3); r=152*s; g=149*s; b=143*s; if(frac(u/9)<.03||Math.abs(v-96)<.18) { r*=.7; g*=.7; b*=.7; } }
        /* railings at the pavement's edge, open where the steps come down */
        if(v>=83&&v<97&&!(lx>DX-1.6&&lx<DX+10.6)){ const ph=frac(u/1.9); if(v<83.8||ph<.3&&v>83.8){ const hl=ph<.08?2.6:1; r=IRON[0]*hl; g=IRON[1]*hl; b=IRON[2]*hl; } else if(v<84.8&&ph<.3) { r=IRON[0]; g=IRON[1]; b=IRON[2]; } }
        const nz=(ih(x,y,5)-.5)*7; r+=nz; g+=nz; b+=nz;
        src[i]=r; src[i+1]=g; src[i+2]=b; src[i+3]=255;
        r=src[i]; g=src[i+1]; b=src[i+2];
        const l=r*.299+g*.587+b*.114, dr=r+(l-r)*.6, dg=g+(l-g)*.6, db=b+(l-b)*.6;
        blc[i]=ov(dr,l); blc[i+1]=ov(dg,l); blc[i+2]=ov(db,l); blc[i+3]=255;
      } }
    const S=toCanvas(N,N,src), T=toCanvas(N,N,blc);
    const amt=u=>u<1.2?0:u<1.37?.24:u<1.54?.48:u<3.62?.7:0;
    return (c,t)=>{
      const u=mod(t,P), a=amt(u); reset(c,px);
      c.drawImage(S,0,0,100,100);
      if(a>0){ c.globalAlpha=a; c.drawImage(T,0,0,100,100); c.globalAlpha=1; }
      tab(c,3,92,'AMOUNT '+a.toFixed(2),4.2,INK,BONE);
    };
  } },

/* BRIGHTNESS. Type and a grey scale card. The effect is the CSS brightness() multiply (d *= v, then held to 255): a card of nine
   patches and its printed band, multiplied at 1.00, 1.30 (the default) and 1.70 on hard cuts. Light patches run together into white;
   the black band and the darkest patch barely move, because nothing times black is anything but black. */
{ id:'brightness', name:'Brightness', section:'Colouring', isNew:true, still:2.6,
  line:'Every tone is multiplied brighter: light greys run together into white while black stays black.',
  make(px){
    const P=4.2, V=[244,216,188,160,132,104,76,48,18], PW=11.4, PHH=31, AN=-3.2*Math.PI/180;
    const val=u=>u<1.05?1:u<1.95?1.3:u<3.6?1.7:1;
    const g=(x,v)=>{ const q=Math.min(255,Math.round(x*v)); return 'rgb('+q+','+q+','+q+')'; };
    return (c,t)=>{
      const u=mod(t,P), v=val(u); reset(c,px);
      c.fillStyle=INK; c.fillRect(0,0,100,100);
      c.font=MONO(4.4); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText('BRIGHTNESS',5.5,9.5);
      c.font=SANS(17); c.fillStyle=DIM; c.fillText('×',4.5,33.5);
      c.font=SANS(27); c.fillStyle=BONE; c.fillText(v.toFixed(2),15,35);
      /* the card: the layer. It bleeds off the right edge on purpose. */
      c.save(); c.translate(7,44); c.rotate(AN);
      for(let i=0;i<V.length;i++){ c.fillStyle=g(V[i],v); c.fillRect(i*PW,0,PW+.35,PHH); }
      c.fillStyle=g(14,v); c.fillRect(0,PHH,V.length*PW,9.5);
      c.font=MONO(4.6); c.textAlign='center'; c.textBaseline='middle'; c.fillStyle=g(226,v);
      for(let i=0;i<V.length;i++) c.fillText(String(i),i*PW+PW/2,PHH+4.9);
      c.restore();
    };
  } },

/* BUMP MAP. Viewer overlay at pixel scale, because that is the scale this effect works at: its normal comes from each pixel's left/right
   and up/down neighbours, so on a full frame the relief is a one-pixel rim (honestly faint: at a normal zoom it mostly brightens).
   Here 31 x 25 pixels of a letter cut in stone, each pixel a 3-unit block, run through the kernel at Strength 1.2 (default), Relief
   300 % and Ambient 30 %. The Light angle travels 225 -> 45 and back, and the highlight and shadow walk round the stroke with it.
   Checked against the real renderer on these very pixels: identical, byte for byte. */
{ id:'bumpmap', name:'Bump Map', section:'Colouring', isNew:true, still:1.3,
  line:'Treats brightness as height and lights it from one side, so every edge gets a thin highlight and a thin shadow.',
  make(px){
    const P=4.6, W=31, H=25, X=3.5, Y=3, SC=3, RELIEF=300, AMB=30;
    /* the letter as a hard pixel mask (a cut, not a soft render), then stone colours and a little grain */
    const [L,lx]=canvasN(W,H);
    lx.fillStyle='#000'; lx.fillRect(0,0,W,H);
    lx.fillStyle='#fff'; lx.font='800 36px "Helvetica Neue",Helvetica,Arial,sans-serif'; lx.textBaseline='alphabetic'; lx.fillText('R',3,29);
    const s=lx.getImageData(0,0,W,H).data;
    for(let j=0;j<W*H;j++){ const m=s[j*4]>127, x0=j%W, y0=(j/W)|0, q=(ih(x0+y0*999,3,1)-.5)*16+(n2(x0*.35,y0*.35,9)-.5)*14, c=m?[204,191,166]:[84,79,71]; for(let k=0;k<3;k++) s[j*4+k]=c[k]+q; s[j*4+3]=255; }
    const PLAIN=toCanvas(W,H,s), STEP=15, LIT={};
    const lit=a=>{ a=((Math.round(a/STEP)*STEP)%360+360)%360; return LIT[a]||(LIT[a]=toCanvas(W,H,bumpRun(s,W,H,1.2,RELIEF,AMB,a))); };
    for(let a=0;a<360;a+=STEP) lit(a);
    const angle=u=>u<1.7?225:u<2.5?lerp(225,405,E.inOut(seg(u,1.7,2.5))):u<3.4?405:lerp(405,225,E.inOut(seg(u,3.4,4.0)));
    return (c,t)=>{
      const u=mod(t,P), on=u>=.6&&u<4.25, a=angle(u), show=((Math.round(a)%360)+360)%360;
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.imageSmoothingEnabled=false; c.drawImage(on?lit(a):PLAIN,X,Y,W*SC,H*SC); c.imageSmoothingEnabled=true;
      /* a 5-pixel scale bar under the picture */
      c.fillStyle=DIM; c.fillRect(X,81.6,5*SC,.45); c.fillRect(X,80.4,.45,2.4); c.fillRect(X+5*SC-.45,80.4,.45,2.4);
      c.font=MONO(4); c.textAlign='left'; c.textBaseline='middle'; c.fillText('5 PX',X+5*SC+2,81.9);
      /* Light angle: the readout and its dial, keyframes at 225 and 45 */
      c.font=MONO(5.6); c.fillStyle=on?TEXT:DIM; c.fillText(on?'LIGHT '+String(show).padStart(3,'0')+'°':'BUMP OFF',X,92.2);
      const DX=88.5, DY=90, DR=6.2, at=d=>d*Math.PI/180;
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.arc(DX,DY,DR,0,TAU); c.stroke();
      c.fillStyle=YEL; for(const k of [225,45]){ const r=at(k), kx=DX+Math.cos(r)*DR, ky=DY+Math.sin(r)*DR; c.beginPath(); c.moveTo(kx,ky-1.8); c.lineTo(kx+1.8,ky); c.lineTo(kx,ky+1.8); c.lineTo(kx-1.8,ky); c.closePath(); c.fill(); }
      if(on){ const r=at(a), hx=DX+Math.cos(r)*DR, hy=DY+Math.sin(r)*DR; c.strokeStyle=TEAL; c.lineWidth=.6; c.beginPath(); c.moveTo(DX,DY); c.lineTo(hx,hy); c.stroke(); c.fillStyle=TEAL; c.fillRect(hx-1.2,hy-1.2,2.4,2.4); }
    };
  } },

/* BLACK & WHITE MIXER. Cut paper. Vermilion, yellow and a blue on bone, run through the mixer's own grey (bwGrey) with the Colour filter
   presets as the row writes them: Neutral, Red, Blue. The red filter lifts the red square into the paper and drops the blue circle to
   black; the blue filter does the opposite. Hard cuts, a held beat on each; the tab is the control, so it keeps its colour. */
{ id:'bwmixer', name:'Black & White Mixer', section:'Colouring', isNew:true, still:3.2,
  line:'Turns the picture black and white and lets you choose how bright each colour goes, the way a lens filter does.',
  make(px){
    const P=4.6;
    const SRC={ paper:[231,226,213], red:[228,71,29], yel:[255,206,74], blue:[36,83,166], ink:[22,19,15] };
    const F=[['OFF',null,null],['NEUTRAL',[40,60,40,60,20,80],null],['RED',[120,110,-10,-50,-50,120],'#c0262c'],['BLUE',[-30,-20,30,110,120,60],'#2a5fc4']];
    const PAL=F.map(f=>{ const o={}; for(const k in SRC){ const q=SRC[k]; if(!f[1]) o[k]='rgb('+q.join(',')+')'; else { const v=Math.round(bwGrey(q[0],q[1],q[2],f[1].map(x=>x/100))); o[k]='rgb('+v+','+v+','+v+')'; } } return o; });
    const state=u=>u<1.0?0:u<1.6?1:u<2.75?2:u<3.9?3:0;
    const poly=(c,p)=>{ c.beginPath(); for(let i=0;i<p.length;i+=2) i?c.lineTo(p[i],p[i+1]):c.moveTo(p[i],p[i+1]); c.closePath(); c.fill(); };
    /* scissor-straight, nothing quite true */
    const SQ=[11.5,40.5, 55.6,35.2, 61.6,79.3, 17.2,84.4];
    const TRI=[52,104, 106,104, 86.5,49.5];
    const BAR=[5,17.4, 49,11.6, 49.5,14.8, 5.4,20.8];
    return (c,t)=>{
      const u=mod(t,P), k=state(u), q=PAL[k]; reset(c,px);
      c.fillStyle=q.paper; c.fillRect(0,0,100,100);
      c.fillStyle=q.blue; c.beginPath(); c.arc(67,33.5,24.5,0,TAU); c.fill();
      c.fillStyle=q.red; poly(c,SQ);
      c.fillStyle=q.yel; poly(c,TRI);
      c.fillStyle=q.ink; poly(c,BAR);
      /* the control */
      const w=tab(c,3,90.6,F[k][0],4.6,INK,BONE);
      if(F[k][2]){ c.fillStyle=F[k][2]; c.fillRect(3+w+.8,90.6,6.9,6.9); }
    };
  } },

/* CHANNEL REMAP. Comp sheets. Three glass bottles made here, and beside them the picture's own red, green and blue plates. Swap R/B (the
   default) is the R and B plates trading slots, so that is what the sheets do: they travel, land, and the picture cuts to the swap. Green
   glass stays green, red glass turns blue, blue glass turns red, and the warm grey wall goes a cool grey. Checked against the real
   renderer on these very pixels: identical, byte for byte. */
{ id:'channelremap', name:'Channel Remap', section:'Colouring', isNew:true, still:2.4,
  line:'Swaps the red and blue channels, so red turns blue and blue turns red while green stays green.',
  make(px){
    const P=4.6, W=180, H=228, n=W*H, d=new Uint8ClampedArray(n*4);
    const BOT=[
      { cx:40, base:196, T:[.9,.1,.12], hw:y=>y>92?19:y>70?6+13*(.5-.5*Math.cos(Math.PI*(y-70)/22)):y>30?6:y>25.5?7.4:-1 },
      { cx:95, base:196, T:[.2,.62,.3], hw:y=>y>128?24:y>114?8+16*(.5-.5*Math.cos(Math.PI*(y-114)/14)):y>100?8:y>86?9.4:-1, cork:[86,100] },
      { cx:147, base:196, T:[.14,.3,.86], hw:y=>{ const dy=y-169; if(dy>-27&&y<=196){ const q=Math.sqrt(Math.max(0,27*27-dy*dy)); if(q>=6) return q; } return y>76?6:y>71.5?7.4:-1; } } ];
    const wall=(x,y)=>{ const q=(1.08-.26*x/W)*(.92+.1*y/H)*(.97+.06*fbm(x*.04,y*.04,3,3)); return [198*q,193*q,184*q]; };
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const i=(y*W+x)*4; let r,g,b;
      if(y>=186){ const q=(.86+.18*(y-186)/42)*(.94+.1*fbm(x*.12,y*.5,5,3)); r=166*q; g=157*q; b=143*q; if(y<187.5){ r*=.72; g*=.72; b*=.72; }
        for(const o of BOT){ const ex=(x-(o.cx+o.hw(150)*1.55))/(o.hw(150)*1.7), ey=(y-200.5)/5.2, e=ex*ex+ey*ey; if(e<1){ const s=1-e*e; r*=lerp(1,.42+.7*o.T[0],s); g*=lerp(1,.42+.7*o.T[1],s); b*=lerp(1,.42+.7*o.T[2],s); } } }
      else [r,g,b]=wall(x,y);
      for(const o of BOT){ if(y>o.base) continue; const hw=o.hw(y); if(hw<=0) continue; const sx=(x+.5-o.cx)/hw; if(Math.abs(sx)>=1) continue;
        if(o.cork&&y>=o.cork[0]&&y<o.cork[1]){ const q=(.72+.32*(1-sx*sx))*(.9+.2*n2(x*.5,y*.5,12)); r=148*q; g=110*q; b=74*q; break; }
        const back=wall(x,Math.min(y,185)), p=Math.min(4,1+1.2*(1/Math.sqrt(Math.max(.06,1-sx*sx))-1)+(y>o.base-5?1.4:0));
        r=back[0]*Math.pow(o.T[0],p); g=back[1]*Math.pow(o.T[1],p); b=back[2]*Math.pow(o.T[2],p);
        const hl=.85*Math.exp(-Math.pow((sx+.55)/.09,2))+.14*Math.exp(-Math.pow((sx-.68)/.12,2));
        r+=(255-r)*hl; g+=(255-g)*hl; b+=(255-b)*hl;
        if(Math.abs(sx)>.93){ r*=.62; g*=.62; b*=.62; }
        break; }
      const nz=(ih(x,y,8)-.5)*5; d[i]=r+nz; d[i+1]=g+nz; d[i+2]=b+nz; d[i+3]=255; }
    const sw=new Uint8ClampedArray(n*4), pl=[0,1,2].map(()=>new Uint8ClampedArray(n*4));
    for(let i=0;i<n*4;i+=4){ sw[i]=d[i+2]; sw[i+1]=d[i+1]; sw[i+2]=d[i]; sw[i+3]=255; for(let c=0;c<3;c++){ const q=pl[c]; q[i]=q[i+1]=q[i+2]=d[i+c]; q[i+3]=255; } }
    const IN=toCanvas(W,H,d), OUT=toCanvas(W,H,sw), PL=pl.map(q=>toCanvas(W,H,q));
    const CX=4, CY=12, CW=60, CH=76, SX=74.5, SW=21, SH=26.6, SY=[12,40.7,69.4];
    /* where each source plate sits: 0..1 of the way through the swap */
    const swapAt=u=>u<1.0?0:u<1.6?backOut(seg(u,1.0,1.6)):u<3.0?1:u<3.6?1-backOut(seg(u,3.0,3.6)):0;
    const sheet=(c,img,x,y,w,h,label)=>{ c.fillStyle=BONE; c.fillRect(x-.6,y-.6,w+1.2,h+1.2); c.drawImage(img,x,y,w,h); if(label) tab(c,x,y,label,3.8,INK,BONE); };
    return (c,t)=>{
      const u=mod(t,P), s=swapAt(u), swapped=u>=1.6&&u<3.6; reset(c,px);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      sheet(c,swapped?OUT:IN,CX,CY,CW,CH,null); tab(c,CX-.6,CY-7.6,'OUT',4.4,BONE,INK);
      /* the output slots, red, green and blue, top to bottom */
      ['#c4392f','#3e9a52','#3b62c4'].forEach((col,i)=>{ c.fillStyle=col; c.fillRect(SX-3.6,SY[i],1.3,SH); });
      /* G stays; R travels from the top slot to the bottom one and B the other way, R passing in front */
      const yR=lerp(SY[0],SY[2],s), yB=lerp(SY[2],SY[0],s), lift=Math.sin(Math.PI*clamp(s));
      sheet(c,PL[1],SX,SY[1],SW,SH,'G');
      const kB=1-.06*lift; c.save(); c.translate(SX+SW/2,yB+SH/2); c.scale(kB,kB); sheet(c,PL[2],-SW/2,-SH/2,SW,SH,'B'); c.restore();
      const kR=1+.08*lift; c.save(); c.translate(SX+SW/2+2.2*lift,yR+SH/2); c.scale(kR,kR); if(lift>.02){ c.globalAlpha=.55*lift; c.fillStyle='#000'; c.fillRect(-SW/2+1.2,-SH/2+1.4,SW+1.2,SH+1.2); c.globalAlpha=1; } sheet(c,PL[0],-SW/2,-SH/2,SW,SH,'R'); c.restore();
    };
  } },

/* CLARITY & DEHAZE. Graded still. A line of pylons walking into fog, made here: each thing is its clear colour pulled toward the fog by
   how far away it is (the haze is real arithmetic, not a white wash painted on). PIXEL_FX.clarity at Clarity 30 and Radius 60 px on a
   1080 frame (defaults) and Protect sky 20, with Dehaze stepping 0 -> 70: the far pylons and the field get their contrast and colour
   back. Checked against the real renderer on these very pixels: identical, byte for byte. */
{ id:'clarity', name:'Clarity & Dehaze', section:'Colouring', isNew:true, still:2.4,
  line:'Lifts local detail and cuts through haze, so the distance gets its contrast and colour back.',
  make(px){
    const P=4.6, N=240, U=N/100, FOG=[232,234,236], HOR=66;
    const [C,x]=canvasN(N,N), im=x.createImageData(N,N), d=im.data;
    const haze=(j,t)=>[j[0]*t+FOG[0]*(1-t),j[1]*t+FOG[1]*(1-t),j[2]*t+FOG[2]*(1-t)];
    for(let yy=0;yy<N;yy++){ const v=(yy+.5)/U;
      for(let xx=0;xx<N;xx++){ const u=(xx+.5)/U, i=(yy*N+xx)*4, hz=HOR+.8*Math.sin(u*.06+1), hedge=hz-1-1.8*fbm(u*.35,3,31,3); let q;
        if(v<hedge){ const k=v/hedge, w=(fbm(u*.05,v*.09,41,4)-.5)*14; q=haze([140+w+k*36,164+w+k*28,192+w*.6+k*16],.3); }
        else if(v<hz+.6){ const w=fbm(u*.6,v*.6,43,3); q=haze([40+14*w,54+14*w,38+10*w],.14); }
        else { const z=clamp((v-hz)/(100-hz)), t=.13+.74*Math.pow(z,.75), fx=(u-62)/(v-hz+1.5), fur=.5+.5*Math.sin(fx*34), p=fbm(u*.12,v*.3,47,4);
          const j=[lerp(86,70,fur)+(p-.5)*30,lerp(92,76,fur)+(p-.5)*26+(p>.6?10:0),lerp(60,50,fur)+(p-.5)*18];
          q=haze(j,t); }
        const nz=(ih(xx,yy,13)-.5)*4; d[i]=q[0]+nz; d[i+1]=q[1]+nz; d[i+2]=q[2]+nz; d[i+3]=255; } }
    x.putImageData(im,0,0);
    /* the pylons, drawn as lattice at their own haze */
    x.setTransform(U,0,0,U,0,0); x.lineCap='round'; x.lineJoin='round';
    const PY=[[13,113,1.16,.9],[55,80,.32,.5],[73.5,71,.14,.3],[84.5,67.6,.065,.18]];
    const ARMS=[[.6,.28],[.72,.33],[.84,.24]];
    const tips=PY.map(([bx,by,s])=>{ const h=95*s, o=[]; for(const [ay,L] of ARMS){ o.push([bx-L*h,by-ay*h+.05*h],[bx+L*h,by-ay*h+.05*h]); } return o; });
    const colAt=t=>{ const q=haze([36,38,40],t); return 'rgb('+q.map(Math.round).join(',')+')'; };
    /* cables first, from each pylon's insulators to the next one's, sagging */
    for(let p=0;p<PY.length-1;p++){ const t=(PY[p][3]+PY[p+1][3])/2; x.strokeStyle=colAt(t); x.lineWidth=.22;
      for(let k=0;k<tips[p].length;k++){ const a=tips[p][k], b=tips[p+1][k]; x.beginPath(); x.moveTo(a[0],a[1]); x.quadraticCurveTo((a[0]+b[0])/2,(a[1]+b[1])/2+3*PY[p][2]+1,b[0],b[1]); x.stroke(); } }
    for(const [bx,by,s,t] of PY){ const h=95*s, lw=Math.max(.16,.9*s), col=colAt(t), legX=f=>f<.62?lerp(.17,.05,f/.62):lerp(.05,.035,(f-.62)/.28), P2=(fx,fy)=>[bx+fx*h,by-fy*h];
      x.strokeStyle=col; x.fillStyle=col;
      const seg2=(a,b,w)=>{ x.lineWidth=w; x.beginPath(); x.moveTo(a[0],a[1]); x.lineTo(b[0],b[1]); x.stroke(); };
      for(const sd of [-1,1]){ seg2(P2(sd*.17,0),P2(sd*.05,.62),lw*1.5); seg2(P2(sd*.05,.62),P2(sd*.035,.9),lw*1.3); seg2(P2(sd*.035,.9),P2(0,1),lw*1.1); }
      const LV=[0,.1,.19,.27,.35,.42,.49,.56,.62,.7,.78,.86,.9];
      for(let k=0;k<LV.length-1;k++){ const a=LV[k], b=LV[k+1]; seg2(P2(-legX(a),a),P2(legX(b),b),lw*.6); seg2(P2(legX(a),a),P2(-legX(b),b),lw*.6); seg2(P2(-legX(b),b),P2(legX(b),b),lw*.45); }
      for(const [ay,L] of ARMS){ seg2(P2(-L,ay),P2(L,ay),lw*.9); seg2(P2(-L,ay),P2(-legX(ay+.06),ay+.06),lw*.7); seg2(P2(L,ay),P2(legX(ay+.06),ay+.06),lw*.7);
        for(let q=1;q<4;q++){ const f=q/4; seg2(P2(-L*f,ay),P2(-L*(f-.12),ay+.06*(1-f)),lw*.4); seg2(P2(L*f,ay),P2(L*(f-.12),ay+.06*(1-f)),lw*.4); }
        for(const sd of [-1,1]) seg2(P2(sd*L*.97,ay),P2(sd*L*.97,ay-.05),lw*.8); } }
    x.setTransform(1,0,0,1,0,0);
    const s=x.getImageData(0,0,N,N).data, ps=N/1080, LV=[0,14,28,42,56,70];
    const FR=LV.map(dh=>toCanvas(N,N,clarityRun(s,N,N,ps,.3,dh/100,60,.2)));
    const lev=u=>{ if(u<1.0||u>=4.25) return 0; if(u<1.5) return 1+Math.min(4,Math.floor(seg(u,1.0,1.5)*5)); if(u<3.8) return 5; return Math.max(0,4-Math.floor(seg(u,3.8,4.25)*5)); };
    return (c,t)=>{
      const u=mod(t,P), k=lev(u); reset(c,px);
      c.drawImage(FR[k],0,0,100,100);
      const lab='DEHAZE +'+String(LV[k]).padStart(2,'0'); c.font=MONO(4.4); const w=c.measureText(lab).width+4.4*.9;
      tab(c,97-w,92,lab,4.4,INK,BONE);
    };
  } }

);
})();
