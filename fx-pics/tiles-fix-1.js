/* FreeMotion effect pictures: redraws, artist 1. Each picture applies the effect's real maths (from js/compositor.js) or shows what its controls really do. */
(function(){
'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const MONO='"Courier Prime","Courier New",Courier,monospace';
const SANS='system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb', NAVY='#161c28', HAIR='#2b3547', TXT='#eef2f8', DIM='#8b96a8';
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const blank=S=>{ const C=document.createElement('canvas'); C.width=C.height=S; return C; };
/* Number plates are painted out on his photographs (coordinates in the 320 px source): a plate must not read in a menu picture. */
const PLATES={
  mclaren:x=>{ x.fillStyle='#a14a28'; x.beginPath(); x.moveTo(249,175); x.lineTo(297,167); x.lineTo(299,184); x.lineTo(251,195); x.closePath(); x.fill(); },
  tesla:x=>{ x.fillStyle='#b9cdd3'; x.fillRect(236,190,24,17); },
  revuelto:x=>{ x.fillStyle='#17181c'; x.fillRect(62,202,32,12); x.fillStyle='#b6c0d2'; x.fillRect(251,183,25,9); }
};
const clean=(k,S)=>{ const [C,x]=photoCover(k,S); x.setTransform(S/320,0,0,S/320,0,0); if(PLATES[k]) PLATES[k](x); x.setTransform(1,0,0,1,0,0); return [C,x]; };
const grab=(k,S)=>{ const [C,x]=clean(k,S); return [C,x,x.getImageData(0,0,S,S)]; };
function tab(c,x,y,txt,bg,fg,fs){ c.font='700 '+fs+'px '+MONO; c.textAlign='left'; c.textBaseline='middle'; const w=txt.length*fs*.6+fs*.9, h=fs*1.5; c.fillStyle=bg; c.fillRect(x,y,w,h); c.fillStyle=fg; c.fillText(txt,x+fs*.45,y+h*.55); return w; }

window.FX_TILES.push(

/* ── TEAL & ORANGE ── Graded still. PIXEL_FX.tealorange: w=(luma-.5)*2, R+w*42a, G+w*8a, B-w*42a. A Bone hairline carries the grade across. */
{ id:'tealorange', name:'Teal & Orange', section:'Colouring', isNew:false, redrawn:true, still:1.0,
  line:'Dark areas lean teal and bright areas lean orange, gently, across the whole frame.',
  make(px){
    const P=4.4, S=320, AMT=.8, [A,,id]=grab('mclaren',S), d=id.data;
    for(let i=0;i<d.length;i+=4){ const r=d[i],g=d[i+1],b=d[i+2]; let w=((r*.299+g*.587+b*.114)/255-.5)*2; w=w<-1?-1:w>1?1:w; d[i]=r+w*42*AMT; d[i+1]=g+w*8*AMT; d[i+2]=b-w*42*AMT; }
    const G=blank(S); G.getContext('2d').putImageData(id,0,0);
    return (c,t)=>{
      const u=t%P, x=100*(u<2?E.inOut(seg(u,.35,1.35)):1-E.inOut(seg(u,3.25,4.1)));
      reset(c,px); c.drawImage(A,0,0,100,100);
      if(x>0){ c.save(); c.beginPath(); c.rect(0,0,x,100); c.clip(); c.drawImage(G,0,0,100,100); c.restore(); }
      if(x>0&&x<100){ c.fillStyle=BONE; c.fillRect(x-.35,0,.7,100); }
    };
  }
},

/* ── COLOUR CYCLE ── PIXEL_FX.huecycle at its defaults: Start colour 60 + 90 deg/s, the e1HueM matrix, Colour boost 0.2. Twelve real turns, cross-faded. */
{ id:'huecycle', name:'Colour Cycle', section:'Colouring', isNew:true, redrawn:true, still:.55,
  line:'Every colour in the frame turns round the colour wheel together, background included.',
  make(px){
    const P=4, S=320, N=12, [,,id]=grab('huracan',S), d=id.data, F=new Array(N), BOOST=.2, s=1+BOOST;
    const hueM=deg=>{ const a=Math.cos(deg*Math.PI/180), b=Math.sin(deg*Math.PI/180);
      return [.213+.787*a-.213*b,.715-.715*a-.715*b,.072-.072*a+.928*b,.213-.213*a+.143*b,.715+.285*a+.14*b,.072-.072*a-.283*b,.213-.213*a-.787*b,.715-.715*a+.715*b,.072+.928*a+.072*b]; };
    /* a turn is built the first time it is needed, so opening the menu does not pay for twelve at once */
    const turn=k=>{ if(F[k]) return F[k];
      const m=hueM(k*30), C=blank(S), x=C.getContext('2d'), o=x.createImageData(S,S), q=o.data;
      for(let i=0;i<d.length;i+=4){ const r=d[i],g=d[i+1],b=d[i+2]; let R=m[0]*r+m[1]*g+m[2]*b, G=m[3]*r+m[4]*g+m[5]*b, B=m[6]*r+m[7]*g+m[8]*b; const L=.299*R+.587*G+.114*B; q[i]=L+(R-L)*s; q[i+1]=L+(G-L)*s; q[i+2]=L+(B-L)*s; q[i+3]=255; }
      x.putImageData(o,0,0); return F[k]=C;
    };
    return (c,t)=>{
      const u=t%P, deg=(60+90*u)%360, v=deg/30, k=Math.floor(v)%N, f=v-Math.floor(v);
      reset(c,px); c.drawImage(turn(k),0,0,100,100); c.globalAlpha=f; c.drawImage(turn((k+1)%N),0,0,100,100); c.globalAlpha=1;
    };
  }
},

/* ── RADIAL WIPE ── Comp sheets. The top layer is revealed clockwise from Start 270; Border (vermilion) really draws on both edges of the wedge and slides off in the last tenth. */
{ id:'radialwipe', name:'Radial Wipe', section:'Keying', isNew:true, redrawn:true, still:1.3,
  line:'A clock-hand sweep brings one layer in over another; the line along the hand is the Border option.',
  make(px){
    const P=4.4, A=photoCover('towers',320)[0], B=photoCover('figures',320)[0];
    const RX=8, RY=14, RW=84, RH=84, CX=RX+RW/2, CY=RY+RH/2, BD=1.2;
    const slide=p=>{ const rem=1-p; if(!(rem<.1)) return 1; const v=rem>0?rem/.1:0; return v*v*(3-2*v); };
    return (c,t)=>{
      const u=t%P, pr=u<2.5?E.inOut(seg(u,.5,2.1)):1-E.inOut(seg(u,3.2,3.85));
      reset(c,px); c.fillStyle=COAL; c.fillRect(0,0,100,100);
      const on=pr>.5;
      tab(c,RX,3.2,'CLIP 01',on?HAIR:BONE,on?DIM:INK,4.9);
      tab(c,RX+27,3.2,'CLIP 02',on?BONE:HAIR,on?INK:DIM,4.9);
      c.fillStyle=BONE; c.fillRect(RX+1.6,RY-3.6,RW+2,RH+2); c.fillStyle=INK; c.fillRect(RX+2.6,RY-2.6,RW,RH);
      c.fillStyle=BONE; c.fillRect(RX-1,RY-1,RW+2,RH+2);
      c.save(); c.beginPath(); c.rect(RX,RY,RW,RH); c.clip();
      c.drawImage(A,RX,RY,RW,RH);
      if(pr>0){
        const a0=-Math.PI/2, a1=a0+TAU*pr;
        c.save(); c.beginPath(); if(pr<1){ c.moveTo(CX,CY); c.arc(CX,CY,90,a0,a1); c.closePath(); } else c.rect(RX,RY,RW,RH); c.clip();
        c.drawImage(B,RX,RY,RW,RH);
        if(pr<1){ const w=BD*slide(pr)*2; c.strokeStyle=VERM; c.lineWidth=w; c.lineCap='butt'; c.beginPath(); c.moveTo(CX+Math.cos(a0)*90,CY+Math.sin(a0)*90); c.lineTo(CX,CY); c.lineTo(CX+Math.cos(a1)*90,CY+Math.sin(a1)*90); c.stroke(); }
        c.restore();
      }
      c.restore();
    };
  }
},

/* ── LENS BLUR ── PIXEL_FX.lensblur's own disc taps with Highlight bloom 150 at threshold 60, Radius pulled 0 to 24 px of a 1080 frame (the slider stops at 30). */
{ id:'lensblur', name:'Lens Blur', section:'Blur', isNew:true, redrawn:true, still:2.4,
  line:'The whole frame drops out of focus and bright lights spread into soft pools.',
  make(px){
    const P=4.6, S=216, RMAX=24, A=photoCover('dusk',320)[0], [,x,id]=grab('dusk',S), d=id.data, N=S*S, BL=1.5, TAPS=16;
    const wt=new Float32Array(N); for(let i=0,q=0;i<N;i++,q+=4){ const l=(d[q]*.299+d[q+1]*.587+d[q+2]*.114)/255, h=l>.6?(l-.6)*2.5:0; wt[i]=1+BL*h*h; }
    const levels=[A];
    for(const R of [12,24]){
      const r=R*S/1080, ox=[], oy=[]; for(let k=0;k<TAPS;k++){ const a=k*2.399963, rd=r*Math.sqrt((k+.5)/TAPS); ox.push(Math.cos(a)*rd); oy.push(Math.sin(a)*rd); }
      const o=x.createImageData(S,S), q=o.data;
      for(let yy=0;yy<S;yy++) for(let xx=0;xx<S;xx++){ let sr=0,sg=0,sb=0,ws=0; for(let k=0;k<TAPS;k++){ let sx=xx+ox[k]|0, sy=yy+oy[k]|0; if(sx<0)sx=0; else if(sx>=S)sx=S-1; if(sy<0)sy=0; else if(sy>=S)sy=S-1; const p=sy*S+sx, w=wt[p], z=p*4; sr+=d[z]*w; sg+=d[z+1]*w; sb+=d[z+2]*w; ws+=w; } const di=(yy*S+xx)*4; q[di]=sr/ws; q[di+1]=sg/ws; q[di+2]=sb/ws; q[di+3]=255; }
      const C=blank(S); C.getContext('2d').putImageData(o,0,0); levels.push(C);
    }
    return (c,t)=>{
      const u=t%P, v=u<2?E.inOut(seg(u,.5,1.6)):1-E.inOut(seg(u,3.6,4.3)), q=v*2, k=Math.min(1,Math.floor(q)), f=q-k;
      reset(c,px); c.drawImage(levels[k],0,0,100,100); if(f>0){ c.globalAlpha=f; c.drawImage(levels[k+1],0,0,100,100); c.globalAlpha=1; }
      tab(c,0,0,'RADIUS '+String(Math.round(v*RMAX)).padStart(2,'0'),INK,TXT,5.6);
    };
  }
},

/* ── GLITCH ── Broadcast bench. glitchFx's own slices (14, Wrap around), ghash shifts, 10 Hz re-roll, RGB tear 3x; Amount cuts on and off as keyframes would. Runs at 25 fps. */
{ id:'glitch', name:'Glitch', section:'Stylize', isNew:true, redrawn:true, still:2.3,
  line:'The picture tears into sliding bands, with red, green and blue pulled apart.',
  make(px){
    const P=4, S=320, PH=Math.round(px*.82), W=px, AMT=.55, SPLIT=3, SPD=10, BANDS=14, srcH=Math.round(S*.82), sy0=Math.round((S-srcH)/2);
    const [A,,id]=grab('huracan',S), d=id.data;
    const chans=[0,1,2].map(ch=>{ const C=blank(S), x=C.getContext('2d'), o=x.createImageData(S,S); for(let i=0;i<d.length;i+=4){ o.data[i+ch]=d[i+ch]; o.data[i+3]=255; } x.putImageData(o,0,0); return C; });
    const ghash=n=>{ let h=(n^0)|0; h=(h^(h>>13))*1274126177; h=h^(h>>16); return h; };
    const [BAR,b]=canvasOf(px); b.fillStyle='#000'; b.fillRect(0,0,100,100);
    ['#bfbfbf','#bfbf00','#00bfbf','#00bf00','#bf00bf','#bf0000','#0000bf'].forEach((col,i)=>{ b.fillStyle=col; b.fillRect(68+i*4.4,87,4.45,9); });
    const burst=q=>(q>=.72&&q<1.16)||(q>=1.88&&q<3.04);
    return (c,t)=>{
      const u=t%P, tq=Math.floor(u*25)/25, amt=burst(tq)?AMT:0, fr=Math.floor(u*25);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BAR,0,0);
      if(!amt){ c.drawImage(A,0,sy0,S,srcH,0,0,W,PH); }
      else{
        const frame=Math.floor(tq*SPD), cs=Math.round(amt*9*SPLIT*px/1080), bandH=Math.floor(PH/BANDS);
        c.save(); c.beginPath(); c.rect(0,0,W,PH); c.clip(); c.fillStyle='#000'; c.fillRect(0,0,W,PH); c.globalCompositeOperation='lighter';
        for(let ch=0;ch<3;ch++){ const off=ch===0?-cs:ch===2?cs:0, im=chans[ch];
          for(let k=0;k<=BANDS;k++){
            const y0=k*bandH, y1=k<BANDS?y0+bandH:PH; if(y1<=y0) continue;
            const h=ghash((k*2654435761+frame*40503)|0), sh=k<BANDS?Math.round(((h&255)/255-.5)*amt*W*.28):0, dx=sh+off, sy=sy0+y0/PH*srcH, sh2=(y1-y0)/PH*srcH;
            c.drawImage(im,0,sy,S,sh2,dx,y0,W,y1-y0);
            if(dx>0) c.drawImage(im,0,sy,S,sh2,dx-W,y0,W,y1-y0); else if(dx<0) c.drawImage(im,0,sy,S,sh2,dx+W,y0,W,y1-y0);
          }
        }
        c.restore();
      }
      reset(c,px); c.font='700 7px '+MONO; c.textAlign='left'; c.textBaseline='middle'; c.fillStyle=TXT;
      c.fillText('00:04:11:'+String(fr%25).padStart(2,'0'),4,91.5);
    };
  }
},

/* ── OIL PAINT ── Contact sheet. PIXEL_FX.oilpaint's Kuwahara windows, Brush size 6 of 8, Richer colour 0.3, on a half-frame crop: 4 px at 360 is 6 px at the 540 px of a 1080 project it covers. Frame 12A is the source, 13A the result. */
{ id:'oilpaint', name:'Oil Paint', section:'Stylize', isNew:true, redrawn:true, still:2.2,
  line:'Fine detail flattens into small daubs of colour, while edges stay hard.',
  make(px){
    const P=4.6, S=360, R=4, PUNCH=.3;
    const SRC=blank(S), sx=SRC.getContext('2d'); sx.imageSmoothingEnabled=true; sx.imageSmoothingQuality='high'; sx.drawImage(clean('bush',320)[0],72,72,176,176,0,0,S,S);
    const id=sx.getImageData(0,0,S,S), src=id.data, PW=S+2*R, n=(R+1)*(R+1);
    const sums=[0,1,2,3,4].map(()=>new Float32Array(PW*PW));
    for(let ly=0;ly<PW;ly++){ const yy=Math.min(S-1,Math.max(0,ly-R)); for(let xp=0;xp<PW;xp++){ const xx=Math.min(S-1,Math.max(0,xp-R)), i=(yy*S+xx)*4, o=ly*PW+xp, L=Math.round(.299*src[i]+.587*src[i+1]+.114*src[i+2]); sums[0][o]=src[i]; sums[1][o]=src[i+1]; sums[2][o]=src[i+2]; sums[3][o]=L; sums[4][o]=L*L; } }
    for(let k=0;k<5;k++){ const v=sums[k], hz=new Float32Array(PW*PW);
      for(let ly=0;ly<PW;ly++){ let acc=0; const row=ly*PW; for(let xp=0;xp<PW;xp++){ acc+=v[row+xp]; if(xp-R-1>=0) acc-=v[row+xp-R-1]; hz[row+xp]=acc; } }
      for(let xp=0;xp<PW;xp++){ let acc=0; for(let ly=0;ly<PW;ly++){ acc+=hz[ly*PW+xp]; if(ly-R-1>=0) acc-=hz[(ly-R-1)*PW+xp]; v[ly*PW+xp]=acc; } }
    }
    const out=sx.createImageData(S,S), q=out.data, s=1+PUNCH*.8;
    for(let yy=0;yy<S;yy++) for(let xx=0;xx<S;xx++){ let best=1e30, bo=0; for(let w=0;w<4;w++){ const o=(yy+R+(w>>1)*R)*PW+(xx+R+(w&1)*R), mL=sums[3][o]/n, vr=sums[4][o]/n-mL*mL; if(vr<best){ best=vr; bo=o; } }
      const i=(yy*S+xx)*4; let r=sums[0][bo]/n, g=sums[1][bo]/n, b=sums[2][bo]/n; const L=.299*r+.587*g+.114*b; q[i]=L+(r-L)*s; q[i+1]=L+(g-L)*s; q[i+2]=L+(b-L)*s; q[i+3]=255; }
    const RES=blank(S); RES.getContext('2d').putImageData(out,0,0);
    const NB=photoCover('bay',160)[0];
    const FW=78, FH=78, FX=11, FY=11, PITCH=82, PAPER='#d9d4c6', RED='#d8321f';
    const wob=(i,sd)=>vnoise(i*.7,sd)*.55;
    return (c,t)=>{
      const u=t%P, st=Math.floor(u*12)/12;
      const adv=st<2.6?E.inOut(seg(st,1.0,1.4)):1-E.inOut(seg(st,3.9,4.3)), off=-adv*PITCH;
      reset(c,px); c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.save(); c.translate(off,0);
      c.fillStyle=PAPER; for(let i=-10;i<28;i++){ const x=i*PITCH/8+1; c.fillRect(x,1.4,5,4.2); c.fillRect(x,94.4,5,4.2); }
      c.font='700 4.6px '+MONO; c.textAlign='left'; c.textBaseline='middle';
      for(let f=-1;f<=2;f++){ const X=FX+f*PITCH; c.fillStyle=PAPER; c.fillText(String(12+f)+'A',X,8.3); if(f===0) c.drawImage(SRC,X,FY,FW,FH); else if(f===1) c.drawImage(RES,X,FY,FW,FH); else c.drawImage(NB,X,FY,FW,FH); }
      const X1=FX+PITCH, draw=st<3.75?seg(st,1.65,2.15):0;
      if(draw>0){ c.strokeStyle=RED; c.lineWidth=1.3; c.lineJoin='round'; c.lineCap='round'; c.beginPath();
        const L=4*78+12, G=draw*L, pts=[[X1-1.8,FY-1.4],[X1+FW+1.8,FY-1.8],[X1+FW+1.4,FY+FH+1.6],[X1-1.4,FY+FH+1.3],[X1-1.9,FY-3.2]];
        let run=0; c.moveTo(pts[0][0],pts[0][1]);
        for(let k=1;k<pts.length;k++){ const a=pts[k-1], b=pts[k], len=Math.hypot(b[0]-a[0],b[1]-a[1]); const n=Math.ceil(len/8); for(let i=1;i<=n;i++){ const f=i/n, d=run+f*len; if(d>G) break; const nx=-(b[1]-a[1])/len, ny=(b[0]-a[0])/len, w=wob(k*9+i,3); c.lineTo(a[0]+(b[0]-a[0])*f+nx*w, a[1]+(b[1]-a[1])*f+ny*w); } run+=len; }
        c.stroke(); }
      c.restore();
    };
  }
},

/* ── STROKE COLOUR ── Two-ink print. Outside + Square is a box (Chebyshev) dilation of the layer's alpha: computed for real, widths 6 to 38 px of a 1080 frame on twos. */
{ id:'stroke', name:'Stroke Colour', section:'Drawing / Edge', isNew:true, redrawn:true, still:2.4,
  line:'An outline grows round the edge of a cut-out or a text layer.',
  make(px){
    const P=3.6, S=Math.min(px,440), WIDTHS=[6,14,22,30,38], GLYPH='&', FS=128, GX=-7, GY=98;
    const put=(x,col)=>{ x.setTransform(S/100,0,0,S/100,0,0); x.font='900 '+FS+'px '+SANS; x.textAlign='left'; x.textBaseline='alphabetic'; x.fillStyle=col; x.fillText(GLYPH,GX,GY); };
    const M=blank(S), m=M.getContext('2d'); put(m,'#000');
    const id=m.getImageData(0,0,S,S), a=id.data, N=S*S, dist=new Uint16Array(N);
    for(let i=0;i<N;i++) dist[i]=a[i*4+3]>0?0:65000;
    for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const p=y*S+x; if(!dist[p]) continue; let v=dist[p]; if(x>0) v=Math.min(v,dist[p-1]+1); if(y>0){ v=Math.min(v,dist[p-S]+1); if(x>0) v=Math.min(v,dist[p-S-1]+1); if(x<S-1) v=Math.min(v,dist[p-S+1]+1); } dist[p]=v; }
    for(let y=S-1;y>=0;y--) for(let x=S-1;x>=0;x--){ const p=y*S+x; if(!dist[p]) continue; let v=dist[p]; if(x<S-1) v=Math.min(v,dist[p+1]+1); if(y<S-1){ v=Math.min(v,dist[p+S]+1); if(x<S-1) v=Math.min(v,dist[p+S+1]+1); if(x>0) v=Math.min(v,dist[p+S-1]+1); } dist[p]=v; }
    const ring=WIDTHS.map(W=>{ const w=Math.max(1,Math.round(W*S/1080)), C=blank(S), x=C.getContext('2d'), o=x.createImageData(S,S), q=o.data; for(let i=0;i<N;i++){ if(dist[i]>0&&dist[i]<=w){ const z=i*4; q[z]=228; q[z+1]=71; q[z+2]=29; q[z+3]=255; } } x.putImageData(o,0,0); return C; });
    const LET=blank(px), lx=LET.getContext('2d'); { lx.setTransform(px/100,0,0,px/100,0,0); lx.font='900 '+FS+'px '+SANS; lx.textAlign='left'; lx.textBaseline='alphabetic'; lx.fillStyle=INK; lx.fillText(GLYPH,GX,GY); }
    const [SP,sp]=canvasOf(px); { const R=rng(77); sp.fillStyle=BONE; for(let i=0;i<300;i++){ const r=.05+R()*.14; sp.beginPath(); sp.arc(R()*100,R()*100,r,0,TAU); sp.fill(); } }
    return (c,t)=>{
      const u=t%P, k=u<.55?-1:u>=3.1?-1:Math.min(4,Math.floor((u-.55)*6));
      reset(c,px); c.fillStyle=BONE; c.fillRect(0,0,100,100);
      if(k>=0) c.drawImage(ring[k],0,0,100,100);
      c.globalCompositeOperation='multiply'; c.drawImage(LET,.7,-.5,100,100); c.globalCompositeOperation='source-over';
      c.drawImage(SP,0,0,100,100);
    };
  }
},

/* ── LENS MAGNIFIER ── Viewer overlay. PIXEL_FX.lensmag: same zoom everywhere inside, thin rim, soft shadow moved 3%/5% of the size. Centre X/Y keyframed, Zoom 2. */
{ id:'lensmag', name:'Lens Magnifier', section:'Warping', isNew:true, redrawn:true, still:2.2,
  line:'A round lens with a thin rim shows what is under it, twice the size, wherever you place or keyframe it.',
  make(px){
    const P=4.8, S=320, A=clean('revuelto',S)[0];
    const RX=5, RY=5, RW=90, RH=72, srcH=S*RH/RW, sy=47, LR=20, Z=2, RIM=.75;
    const K0=[75,33], K1=[37,45];
    const D=2*LR, sox=.03*D, soy=.05*D, sb=.1*D, SR=LR+sb/2;
    const SHAD=blank(256), sh=SHAD.getContext('2d'); sh.setTransform(128/SR,0,0,128/SR,128,128);
    { const g=sh.createRadialGradient(0,0,0,0,0,SR); const inner=(LR-sb/2)/SR; g.addColorStop(0,'rgba(0,0,0,.5)'); g.addColorStop(inner,'rgba(0,0,0,.5)'); for(let i=1;i<=8;i++){ const v=i/8, a=1-v*v*(3-2*v); g.addColorStop(inner+(1-inner)*v,'rgba(0,0,0,'+(a*.5).toFixed(4)+')'); } sh.fillStyle=g; sh.beginPath(); sh.arc(0,0,SR,0,TAU); sh.fill(); }
    const pic=(c)=>c.drawImage(A,0,sy,S,srcH,RX,RY,RW,RH);
    return (c,t)=>{
      const u=t%P, m=u<2.6?E.inOut(seg(u,.5,1.5)):1-E.inOut(seg(u,3.4,4.3)), cx=lerp(K0[0],K1[0],m), cy=lerp(K0[1],K1[1],m);
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.save(); c.beginPath(); c.rect(RX,RY,RW,RH); c.clip(); pic(c);
      c.drawImage(SHAD,cx+sox-SR,cy+soy-SR,2*SR,2*SR);
      c.save(); c.beginPath(); c.arc(cx,cy,LR,0,TAU); c.clip(); c.translate(cx,cy); c.scale(Z,Z); c.translate(-cx,-cy); pic(c); c.restore();
      c.strokeStyle='#fff'; c.lineWidth=RIM; c.beginPath(); c.arc(cx,cy,LR-RIM/2,0,TAU); c.stroke();
      c.restore();
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.moveTo(K0[0],K0[1]); c.lineTo(K1[0],K1[1]); c.stroke();
      c.fillStyle=TEAL; for(const k of [K0,K1]) c.fillRect(k[0]-.9,k[1]-.9,1.8,1.8);
      c.fillRect(cx-1.4,cy-1.4,2.8,2.8);
      c.font='700 6px '+MONO; c.textAlign='left'; c.textBaseline='middle'; c.fillStyle=TXT; c.fillText('ZOOM 2.0×',RX,85.5);
      const X0=48, X1=95, Y=85.5; c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.moveTo(X0,Y); c.lineTo(X1,Y); c.stroke();
      const dia=(x)=>{ c.fillStyle=YEL; c.beginPath(); c.moveTo(x,Y-2.4); c.lineTo(x+2.4,Y); c.lineTo(x,Y+2.4); c.lineTo(x-2.4,Y); c.closePath(); c.fill(); };
      dia(X0+(X1-X0)*.5/P*1+0); dia(X0+(X1-X0)*1.5/P);
      dia(X0+(X1-X0)*3.4/P); dia(X0+(X1-X0)*4.3/P);
      c.fillStyle=TEAL; c.fillRect(X0+(X1-X0)*u/P-.3,Y-4,.6,8);
    };
  }
},

/* ── ORBIT ── Chronophotograph. Radius 270 px, 0.5 rev/s, Start angle 0: dx=R cos a, dy=R sin a, the layer never turns. Six exposures on one plate, then the single layer live. */
{ id:'orbit', name:'Orbit', section:'Shakes / Movement', isNew:true, redrawn:true, still:2.3,
  line:'One layer travels round a circle and stays upright the whole way.',
  make(px){
    const P=4.6, S=320, [,,id]=grab('cat',S), d=id.data, RAD=270/10.8, CH=36, CX=50, CY=45, CROPX=140, CROPW=122, CROPH=312;
    const CW=CH*CROPW/CROPH;
    for(let i=0;i<d.length;i+=4){ let L=.299*d[i]+.587*d[i+1]+.114*d[i+2]; L=Math.pow(clamp((L-8)/132),.62)*244; d[i]=L; d[i+1]=L; d[i+2]=L*.98; }
    const SRC=blank(S); SRC.getContext('2d').putImageData(id,0,0);
    const CARD=blank(S); { const x=CARD.getContext('2d'), kx=S/CROPW, ky=S/CROPH; x.beginPath(); [[226,0],[250,0],[248,30],[243,60],[243,78],[252,105],[256,140],[252,175],[244,205],[232,225],[226,240],[220,246],[207,246],[203,232],[197,222],[195,245],[196,270],[200,296],[192,308],[178,306],[174,290],[174,262],[170,232],[162,212],[158,190],[160,165],[163,140],[172,146],[180,118],[195,92],[215,78],[220,62],[224,35]].forEach((q,i)=>{ const X=(q[0]-CROPX)*kx, Y=q[1]*ky; if(i) x.lineTo(X,Y); else x.moveTo(X,Y); }); x.closePath(); x.fill(); x.globalCompositeOperation='source-in'; x.drawImage(SRC,CROPX,0,CROPW,CROPH,0,0,S,S); }
    const [BG,b]=canvasOf(px); b.fillStyle='#050505'; b.fillRect(0,0,100,100);
    b.strokeStyle='rgba(200,200,200,.24)'; b.lineWidth=.45; b.beginPath(); for(let x=25;x<100;x+=25){ b.moveTo(x,0); b.lineTo(x,92); } for(let y=21;y<90;y+=25){ b.moveTo(0,y); b.lineTo(100,y); } b.stroke();
    b.strokeStyle='rgba(225,225,225,.8)'; b.lineWidth=.5; b.beginPath(); b.moveTo(0,92); b.lineTo(100,92); for(let x=0;x<=100;x+=12.5){ b.moveTo(x,92); b.lineTo(x,x%25===0?95:93.6); } b.stroke();
    b.font='700 4px '+MONO; b.fillStyle='#d9d9d9'; b.textBaseline='alphabetic'; b.textAlign='left'; b.fillText('0',1,99); b.textAlign='center'; b.fillText('270',25,99); b.fillText('540',50,99); b.fillText('810',75,99); b.textAlign='right'; b.fillText('1080',99.4,99);
    b.strokeStyle='rgba(230,230,230,.7)'; b.lineWidth=.45; b.beginPath(); b.moveTo(CX-3,CY); b.lineTo(CX+3,CY); b.moveTo(CX,CY-3); b.lineTo(CX,CY+3); b.stroke();
    const at=a=>[CX+RAD*Math.cos(a),CY+RAD*Math.sin(a)];
    const card=(c,a,al)=>{ const [x,y]=at(a); c.globalAlpha=al; c.drawImage(CARD,x-CW/2,y-CH/2,CW,CH); };
    return (c,t)=>{
      const u=t%P;
      reset(c,px); c.drawImage(BG,0,0,100,100);
      c.globalCompositeOperation='lighter';
      if(u<2.6){ const K=u<2?Math.floor(u*3):5; for(let k=0;k<=K;k++){ if(u<2&&k===K) continue; card(c,k*TAU/6,.8); } if(u<2) card(c,K*TAU/6,1); }
      else card(c,TAU*(u-2.6)*.5,1);
      c.globalCompositeOperation='source-over'; c.globalAlpha=1;
    };
  }
},

/* ── SNOW & RAIN ── CANVAS_FX.weather ported: its own hash, depth bands, wind and sprite. Type cuts from Snow to Rain; nothing else in the photo changes. */
{ id:'weather', name:'Snow & Rain', section:'Generative', isNew:true, redrawn:true, still:1.5,
  line:'Snow or rain falls across the whole picture, and you pick which.',
  make(px){
    const P=5, A=clean('tesla',320)[0];
    const hs=k=>{ k=Math.imul(k+1,0x9e3779b1); k^=k>>>16; k=Math.imul(k,0x85ebca6b); k^=k>>>13; k=Math.imul(k,0xc2b2ae35); k^=k>>>16; return (k>>>0)/4294967296; };
    const SN=420, RN=760, h1=[],h2=[],h3=[],h4=[]; for(let i=0;i<Math.max(SN,RN);i++){ h1.push(hs(i*4+1)); h2.push(hs(i*4+2)); h3.push(hs(i*4+3)); h4.push(hs(i*4+4)); }
    const SP=blank(32), sg=SP.getContext('2d'), gr=sg.createRadialGradient(16,16,0,16,16,16); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.45,'rgba(255,255,255,.85)'); gr.addColorStop(1,'rgba(255,255,255,0)'); sg.fillStyle=gr; sg.fillRect(0,0,32,32);
    const wrap=(v,lo,hi)=>{ const r=hi-lo; return lo+(((v-lo)%r)+r)%r; };
    const WIND=.2, DEPTH=.6, OP=.85;
    return (c,t)=>{
      const u=t%P, rain=u>=2.5;
      reset(c,px); c.drawImage(A,0,0,100,100);
      if(!rain){
        const SIZE=11/10.8, fall=.12, swK=.012, mY=SIZE*2/100+.02, mX=.08;
        for(let i=0;i<SN;i++){ const near=1-DEPTH*h3[i]*.8, dy=fall*near*(.8+.4*h4[i])*u, sway=swK*Math.sin(u*(.7+h4[i])*1.6+h1[i]*6.283), y=wrap(h2[i]+dy,-mY,1+mY)*100, x=wrap(h1[i]+WIND*dy*.6+sway,-mX,1+mX)*100, D=SIZE*2*near*(.7+.6*h4[i]); c.globalAlpha=OP*(.4+.6*near); c.drawImage(SP,x-D/2,y-D/2,D,D); }
        c.globalAlpha=1;
      } else {
        const SIZE=12/10.8, LEN=90/10.8, fall=1.4, mY=LEN/100+.02, mX=.08, dl=Math.hypot(WIND,1)||1;
        c.lineCap='round'; c.strokeStyle='#fff';
        for(let band=0;band<3;band++){ const near=1-DEPTH*(band/2)*.8; c.globalAlpha=OP*(.35+.65*near); c.lineWidth=Math.max(.6/10.8,SIZE*.35*near); c.beginPath();
          for(let i=band;i<RN;i+=3){ const v=near*(.85+.3*h3[i]), dy=fall*v*u, y=wrap(h2[i]+dy,-mY,1+mY)*100, x=wrap(h1[i]+WIND*dy,-mX,1+mX)*100, L=LEN*near*(.7+.6*h3[i]); c.moveTo(x,y); c.lineTo(x-WIND/dl*L,y-1/dl*L); }
          c.stroke(); }
        c.globalAlpha=1;
      }
    };
  }
},

/* ── CUBE ── Viewer overlay. bBox + renderMesh's rotation order, weak perspective F=3.2, double-sided Lambert (Shading 0.6): the same layer on every face. Y Rotation keyed in quarter turns. */
{ id:'cube', name:'Cube', section:'3D', isNew:false, redrawn:true, still:.9,
  line:'The same picture is wrapped on every face of a cube that turns in space.',
  make(px){
    const P=4, S=320, TEX=clean('mclaren',S)[0], SUB=3, HW=.72, F3=3.2, SHD=.6, RU=36, CX=50, CY=44;
    const FACES=[[-HW,-HW,HW,2*HW,0,0,0,2*HW,0],[HW,-HW,-HW,-2*HW,0,0,0,2*HW,0],[HW,-HW,HW,0,0,-2*HW,0,2*HW,0],[-HW,-HW,-HW,0,0,2*HW,0,2*HW,0],[-HW,-HW,-HW,2*HW,0,0,0,0,2*HW],[-HW,HW,HW,2*HW,0,0,0,0,-2*HW]];
    const rx=25*Math.PI/180, cX=Math.cos(rx), sX=Math.sin(rx), Lx=.42, Ly=-.55, Lz=.72;
    const xf=(v,ry)=>{ const cY=Math.cos(ry), sY=Math.sin(ry); let x=v[0], y=v[1], z=v[2], w; w=y*cX-z*sX; z=y*sX+z*cX; y=w; w=x*cY+z*sY; z=-x*sY+z*cY; x=w; const f=F3/Math.max(.2,F3-z); return [x,y,z,CX+x*f*RU,CY+y*f*RU]; };
    const settle=p=>{ if(p<=0) return 0; if(p>=1) return 1; const a=1-Math.pow(1-p,3); return a+Math.sin(p*Math.PI*3)*(1-p)*(1-p)*.14; };
    const DX=86.5, DY=86.5, DR=8, KEYS=[35,125,215,305];
    return (c,t)=>{
      const u=t%P, k=Math.floor(u), f=settle(seg(u-k,0,.62)), deg=35+90*(k+f), ry=deg*Math.PI/180;
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      const sc=px/100, list=[];
      for(const fc of FACES){ const [ox,oy,oz,ux,uy,uz,vx,vy,vz]=fc;
        const a=xf([ox,oy,oz],ry), b=xf([ox+ux,oy+uy,oz+uz],ry), d=xf([ox+vx,oy+vy,oz+vz],ry);
        const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];
        let nx=e1[1]*e2[2]-e1[2]*e2[1], ny=e1[2]*e2[0]-e1[0]*e2[2], nz=e1[0]*e2[1]-e1[1]*e2[0]; const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl;
        const cc=xf([ox+(ux+vx)/2,oy+(uy+vy)/2,oz+(uz+vz)/2],ry);
        if(nx*(0-cc[0])+ny*(0-cc[1])+nz*(F3-cc[2])<=0) continue;
        const lam=Math.abs(nx*Lx+ny*Ly+nz*Lz), shade=(1-SHD)+SHD*(.25+.75*lam);
        list.push({fc,z:cc[2],shade});
      }
      list.sort((p,q)=>p.z-q.z);
      for(const it of list){ const [ox,oy,oz,ux,uy,uz,vx,vy,vz]=it.fc;
        const G=[]; for(let j=0;j<=SUB;j++){ for(let i=0;i<=SUB;i++){ const fu=i/SUB, fv=j/SUB, q=xf([ox+ux*fu+vx*fv,oy+uy*fu+vy*fv,oz+uz*fu+vz*fv],ry); G.push([q[3]*sc,q[4]*sc,fu*S,fv*S]); } }
        const tri=(a,b,d)=>{ const gx=(a[0]+b[0]+d[0])/3, gy=(a[1]+b[1]+d[1])/3, inf=p=>{ const dx=p[0]-gx, dy=p[1]-gy, l=Math.hypot(dx,dy)||1; return [p[0]+dx/l*.5,p[1]+dy/l*.5]; }, A=inf(a), B=inf(b), D=inf(d);
          const u0=a[2],v0=a[3],u1=b[2],v1=b[3],u2=d[2],v2=d[3], den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1); if(Math.abs(den)<1e-6) return;
          const x0=A[0],y0=A[1],x1=B[0],y1=B[1],x2=D[0],y2=D[1], ma=(x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/den, mb=(y0*(v1-v2)+y1*(v2-v0)+y2*(v0-v1))/den, mc=(x0*(u2-u1)+x1*(u0-u2)+x2*(u1-u0))/den, md=(y0*(u2-u1)+y1*(u0-u2)+y2*(u1-u0))/den, me=x0-ma*u0-mc*v0, mf=y0-mb*u0-md*v0;
          c.save(); c.setTransform(1,0,0,1,0,0); c.beginPath(); c.moveTo(A[0],A[1]); c.lineTo(B[0],B[1]); c.lineTo(D[0],D[1]); c.closePath(); c.clip(); c.setTransform(ma,mb,mc,md,me,mf); c.drawImage(TEX,0,0); if(it.shade<.999){ c.fillStyle='rgba(0,0,0,'+(1-it.shade).toFixed(3)+')'; c.fillRect(0,0,S,S); } c.restore(); };
        for(let j=0;j<SUB;j++) for(let i=0;i<SUB;i++){ const a=j*(SUB+1)+i, b=a+1, e=a+SUB+2, d=a+SUB+1; tri(G[a],G[b],G[e]); tri(G[a],G[e],G[d]); }
      }
      reset(c,px);
      c.fillStyle=TEAL; c.fillRect(CX-1.3,CY-1.3,2.6,2.6);
      c.font='700 7px '+MONO; c.textAlign='left'; c.textBaseline='middle'; c.fillStyle=TXT; c.fillText('ROT Y '+String(Math.round(((deg%360)+360)%360)).padStart(3,'0'),5,92.5);
      const dialA=a=>(a-90)*Math.PI/180;
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.arc(DX,DY,DR,0,TAU); c.stroke();
      c.fillStyle=YEL; for(const a of KEYS){ const r=dialA(a), x=DX+Math.cos(r)*DR, y=DY+Math.sin(r)*DR; c.beginPath(); c.moveTo(x,y-2); c.lineTo(x+2,y); c.lineTo(x,y+2); c.lineTo(x-2,y); c.closePath(); c.fill(); }
      { const r=dialA(deg); c.strokeStyle=TEAL; c.lineWidth=.6; c.beginPath(); c.moveTo(DX,DY); c.lineTo(DX+Math.cos(r)*DR,DY+Math.sin(r)*DR); c.stroke(); c.fillStyle=TEAL; c.fillRect(DX+Math.cos(r)*DR-1.1,DY+Math.sin(r)*DR-1.1,2.2,2.2); }
    };
  }
},

/* ── SCRAMBLE TEXT ── Type poster. TEXT_FX.textrandomizer: Left to right, Match the text (A-Z), 12 Hz, its own hash. One line, plain letters. */
{ id:'textrandomizer', name:'Scramble Text', section:'Text', isNew:true, redrawn:true, still:1.55,
  line:'Random letters settle one by one, left to right, until the word is there.',
  make(px){
    const P=3.4, WORD='TAKE', TS='ABCDEFGHIJKLMNOPQRSTUVWXYZ', FS=36, SY=2.35, X=3.5, BASE=40.4;
    return (c,t)=>{
      const u=t%P, pr=seg(u,.45,2.05), frame=Math.floor(u*12), n=Math.floor(WORD.length*pr); let out='';
      for(let i=0;i<WORD.length;i++){ if(i<n) out+=WORD[i]; else { let h=(i*2654435761+frame*40503)>>>0; h=(h^(h>>>13))>>>0; out+=TS[h%26]; } }
      reset(c,px); c.fillStyle=INK; c.fillRect(0,0,100,100);
      c.save(); c.scale(1,SY); c.font='900 '+FS+'px '+SANS; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillStyle=BONE; c.fillText(out,X,BASE); c.restore();
    };
  }
}
);
})();
