/* FreeMotion effect pictures, artist 5 (c5): seven Colouring tiles with no photographs. Every subject is drawn here;
   every change is the effect's own arithmetic from js/compositor.js, run on the drawn pixels (or, for flat colours, on each colour). */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng}=window.FXK;

const BONE='#e7e2d5', INK='#16130f';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const raw=c=>{ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
/* a w x h px canvas whose context draws in tile units, n px to 100 units */
const unitSheet=(w,h,n)=>{ const r=sheet(w,h); r[1].setTransform(n/100,0,0,n/100,0,0); return r; };
const hex=s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
const css=a=>'rgb('+Math.round(clamp(a[0],0,255))+','+Math.round(clamp(a[1],0,255))+','+Math.round(clamp(a[2],0,255))+')';
const mix3=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
const poly=(c,p)=>{ c.beginPath(); for(let i=0;i<p.length;i+=2){ if(i) c.lineTo(p[i],p[i+1]); else c.moveTo(p[i],p[i+1]); } c.closePath(); c.fill(); };
const path=(c,p)=>{ c.beginPath(); for(let i=0;i<p.length;i+=2){ if(i) c.lineTo(p[i],p[i+1]); else c.moveTo(p[i],p[i+1]); } c.stroke(); };
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); };
/* 2-D value noise on an integer-hash lattice */
const h2=(x,y,s)=>{ let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(s+1,1442695041); h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; };
const vn2=(x,y,s)=>{ const x0=Math.floor(x), y0=Math.floor(y), fx=x-x0, fy=y-y0, ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy); return lerp(lerp(h2(x0,y0,s),h2(x0+1,y0,s),ux),lerp(h2(x0,y0+1,s),h2(x0+1,y0+1,s),ux),uy); };
/* the glow kernels' box blur (glowBox6), verbatim arithmetic: replicate at the edge, across then down, in place */
function boxBlur(src,tmp,W,H,R){ const div=2*R+1;
  for(let y=0;y<H;y++){ const row=y*W; let sum=0; for(let x=-R;x<=R;x++) sum+=src[row+(x<0?0:(x>=W?W-1:x))];
    for(let x=0;x<W;x++){ tmp[row+x]=sum/div; const ax=x+R+1, sx=x-R; sum+=src[row+(ax>=W?W-1:ax)]-src[row+(sx<0?0:sx)]; } }
  for(let x=0;x<W;x++){ let sum=0; for(let y=-R;y<=R;y++) sum+=tmp[(y<0?0:(y>=H?H-1:y))*W+x];
    for(let y=0;y<H;y++){ src[y*W+x]=sum/div; const ay=y+R+1, sy=y-R; sum+=tmp[(ay>=H?H-1:ay)*W+x]-tmp[(sy<0?0:sy)*W+x]; } } }
/* Star Shine's ray (sgStreak), verbatim: a two-sided exponential smear along angle th through every pixel's line */
function streak(src,dst,W,H,th,Lp,perStep){
  const c=Math.cos(th), s=Math.sin(th), shallow=Math.abs(c)>=Math.abs(s);
  const m=shallow?s/c:c/s, step=Math.sqrt(1+m*m), kk=Math.exp(-3*step/Lp), sw=step*perStep;
  const len=shallow?W:H, other=shallow?H:W, ofs=new Int32Array(len);
  for(let u=0;u<len;u++) ofs[u]=Math.round(u*m);
  const lo=Math.min(ofs[0],ofs[len-1]), hi=Math.max(ofs[0],ofs[len-1]);
  for(let v0=-hi;v0<other-lo;v0++){
    let acc=0, u0=-1, u1=-1;
    for(let u=0;u<len;u++){ const v=v0+ofs[u]; if(v<0||v>=other){ if(u0>=0) break; continue; } if(u0<0) u0=u; u1=u;
      const i=shallow?v*W+u:u*W+v; acc=src[i]+kk*acc; if(acc!==0) dst[i]+=acc*sw; }
    if(u0<0) continue;
    acc=0;
    for(let u=u1;u>=u0;u--){ const i=shallow?(v0+ofs[u])*W+u:u*W+(v0+ofs[u]); const sv=src[i]; acc=sv+kk*acc; if(acc!==sv) dst[i]+=(acc-sv)*sw; }
  }
}

window.FX_TILES.push(

/* SATURATION. Graded still, stepped A/B. CSS saturate()'s own matrix (the app's GPU and CPU paths use the same one) on a drawn
   aerial of bulb fields on an overcast day: 1.00, the default 1.60, then 0.00, the slider's other end. Hard cuts, long holds. */
{ id:'saturate', name:'Saturation', section:'Colouring', isNew:true, still:1.6,
  line:'Every colour grows stronger or weaker around its own brightness; at 0 the picture is grey.',
  make(px){
    const P=4, N=Math.min(px,360), n=N*N;
    const [S,sx]=unitSheet(N,N,N);
    const ang=-24*Math.PI/180, ca=Math.cos(ang), sa=Math.sin(ang);
    const strips=(seq,a,o)=>{ sx.translate(50,50); sx.rotate(a); let v=-90+o, i=0; while(v<90){ const q=seq[i%seq.length]; sx.fillStyle=q[0]; sx.fillRect(-95,v,190,q[1]); v+=q[1]; sx.fillStyle='#5f6449'; sx.fillRect(-95,v,190,1.2); v+=1.2; i++; } };
    const block=(p,seq,a,o)=>{ sx.save(); sx.beginPath(); for(let i=0;i<p.length;i+=2){ if(i) sx.lineTo(p[i],p[i+1]); else sx.moveTo(p[i],p[i+1]); } sx.closePath(); sx.clip(); strips(seq,a,o); sx.restore(); };
    /* overcast: the bulbs' colours are there but muted */
    const FA=[['#a8524a',10],['#bfb066',8.5],['#b88a95',11],['#6e5f7c',8],['#b9814f',10],['#cfcbbd',6.5]];
    const FB=[['#bfb066',10],['#a8524a',8],['#6e5f7c',9.5],['#b88a95',9],['#6d5f4f',13],['#b9814f',8]];
    block([-1,-1, 61,-1, 67.6,55, -1,69],FA,ang,7);
    /* a fallow field below the track: the quiet part of the frame */
    sx.fillStyle='#77735a'; poly(sx,[-1,69, 67.6,55, 73,101, -1,101]);
    block([66,-1, 101,-1, 101,101, 78,101],FB,ang,2);
    sx.strokeStyle='#8d8070'; sx.lineWidth=1.5; path(sx,[-1,69.2, 67.8,55]);
    sx.fillStyle='#9a978f'; poly(sx,[60.6,-1, 63.2,-1, 75.2,101, 72.6,101]);
    sx.fillStyle='#41565f'; poly(sx,[63.2,-1, 66.6,-1, 78.6,101, 75.2,101]);
    sx.fillStyle='#6c7759'; poly(sx,[66.6,-1, 67.4,-1, 79.4,101, 78.6,101]);
    /* a farm on the far bank: yard, roofs, a windbreak of trees and their shadows */
    sx.fillStyle='#7c776a'; poly(sx,[80,64, 96,61, 99,76, 83,79]);
    sx.save(); sx.translate(88,69); sx.rotate(-.18); sx.fillStyle='#4e4540'; sx.fillRect(-7,-4.2,9,6.2); sx.fillStyle='#3a332f'; sx.fillRect(-7,-1.1,9,3.1); sx.fillStyle='#8a4f40'; sx.fillRect(3.4,-3.6,5,4.4); sx.fillStyle='#6d3d32'; sx.fillRect(3.4,-1.4,5,2.2); sx.restore();
    for(const [x,y,r] of [[81,59,2.4],[85,57.6,2.2],[89.5,56.7,2.5],[94,55.8,2.2],[98,55,2.4],[80.4,63,2],[80.8,67.5,2.3]]){ sx.fillStyle='rgba(18,22,14,0.55)'; sx.beginPath(); sx.arc(x+1.3,y+1.1,r,0,TAU); sx.fill(); sx.fillStyle='#425236'; sx.beginPath(); sx.arc(x,y,r,0,TAU); sx.fill(); }
    const d=sx.getImageData(0,0,N,N).data;
    /* rows along each strip and the overcast light's unevenness: part of the drawn source, not the effect */
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const u=(x+.5)/N*100, v=(y+.5)/N*100, j=(y*N+x)*4;
      const lowerLeft=v>69-14*u/67.6&&u<72, w=lowerLeft?-(u-50)*Math.sin(62*Math.PI/180)+(v-50)*Math.cos(62*Math.PI/180):-(u-50)*sa+(v-50)*ca;
      const k=(.9+.2*vn2(u/9,v/9,4))*(1-.09*(.5+.5*Math.cos(w/1.15*TAU)));
      d[j]*=k; d[j+1]*=k; d[j+2]*=k; }
    const LV=[1,1.6,0], pics=LV.map(v=>{
      const a=.213+.787*v, b=.715-.715*v, cc=.072-.072*v, e=.213-.213*v, f=.715+.285*v, hh=.072+.928*v;
      const [C,x]=sheet(N), im=x.createImageData(N,N), o=im.data;
      for(let i=0;i<n*4;i+=4){ const R=d[i], G=d[i+1], B=d[i+2]; o[i]=a*R+b*G+cc*B; o[i+1]=e*R+f*G+cc*B; o[i+2]=e*R+b*G+hh*B; o[i+3]=255; }
      x.putImageData(im,0,0); return C; });
    const lvAt=u=>u<1?0:u<2.4?1:u<3.3?2:0;
    return (c,t)=>{
      const k=lvAt(mod(t,P)); raw(c); c.drawImage(pics[k],0,0,px,px);
      reset(c,px); tab(c,3,3,'SAT '+LV[k].toFixed(2),5.2,INK,BONE);
    };
  } },

/* SEPIA. Cut paper. CSS sepia()'s matrix, lerped toward the identity by Amount exactly as gl-color.js does it, applied to each
   flat colour of a drawn row of striped deckchairs on a mown park lawn, seen from behind (a linear map, so a flat shape maps to a flat
   shape). Amount 0, a third, two thirds, 1 on threes. (Checker k1: this was an ocean liner, the same subject as Drift's.) */
{ id:'sepia', name:'Sepia', section:'Colouring', isNew:true, still:2.2,
  line:'Every colour turns to a warm brown at its own brightness, like an old toned print.',
  make(px){
    const P=4.2, M=[.393,.769,.189,.349,.686,.168,.272,.534,.131], I=[1,0,0,0,1,0,0,0,1];
    const tone=(col,a)=>{ const m=j=>I[j]+(M[j]-I[j])*a, [r,g,b]=col; return [clamp(m(0)*r+m(1)*g+m(2)*b,0,255),clamp(m(3)*r+m(4)*g+m(5)*b,0,255),clamp(m(6)*r+m(7)*g+m(8)*b,0,255)]; };
    const COL={ SKY:'#9fc2d6', TREE:'#2d5232', LAWN:'#6c9a42', LAWN2:'#7eab52', SHAD:'#4c7531', WOOD:'#8f5f34', LITE:'#c2935e', RED:'#c8352b', WHITE:'#ede7d8', BLUE:'#2c5aa0', YEL:'#e8b02a', GRN:'#1f6b47' };
    const PAL=[0,1/3,2/3,1].map(a=>{ const o={}; for(const k in COL) o[k]=css(tone(hex(COL[k]),a)); return o; });
    /* each chair: the sling's corners TL, TR, BR, BL, its two stripe colours and stripe count; the third runs off the frame */
    const CH=[[[6.4,40.2],[34.6,38.8],[37.8,81.6],[4.2,83.2],'RED','WHITE',5],[[47.6,42.8],[73.4,41.8],[76.6,82.6],[45.6,84],'BLUE','WHITE',5],[[87,39.2],[116,38.2],[120,81.8],[85,83.2],'YEL','GRN',6]];
    const at=(a,b,f)=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
    const scene=(c,p)=>{
      c.fillStyle=p.SKY; c.fillRect(0,0,100,34);
      c.fillStyle=p.TREE; poly(c,[-1,34, -1,19, 5,15.4, 12,17.2, 18,11.6, 27,13.8, 32,19.2, 40,15.6, 48,17.8, 55,12.4, 63,14.6, 69,20.2, 77,16.8, 85,18.6, 91,13.4, 101,15.8, 101,34]);
      c.fillStyle=p.LAWN; poly(c,[-1,33.4, 101,32.2, 101,101, -1,101]);
      /* mowing stripes, scissor-cut, a little off true */
      c.fillStyle=p.LAWN2; for(const x of [-30,6,42,78]) poly(c,[x+20,33, x+38,32.8, x+12,101, x-12,101]);
      /* flat shadows, thrown down and to the right */
      c.fillStyle=p.SHAD; for(const q of CH){ const BL=q[3], BR=q[2]; poly(c,[BL[0]+1,BL[1]+9.4, BR[0]-.6,BR[1]+9.2, BR[0]+12,BR[1]+16.4, BL[0]+9.6,BL[1]+17.2]); }
      for(const [TL,TR,BR,BL,a,b,n] of CH){
        for(let i=0;i<n;i++){ const t0=at(TL,TR,i/n), t1=at(TL,TR,(i+1)/n), b1=at(BL,BR,(i+1)/n), b0=at(BL,BR,i/n); c.fillStyle=p[i%2?b:a]; poly(c,[t0[0],t0[1], t1[0],t1[1], b1[0],b1[1], b0[0],b0[1]]); }
        /* the frame: two rails from above the sling to the sand, a crossbar along the top */
        c.fillStyle=p.WOOD;
        poly(c,[TL[0]-2,TL[1]-3.6, TL[0]+.2,TL[1]-3.6, BL[0]-.2,BL[1]+9.6, BL[0]-2.6,BL[1]+9.6]);
        poly(c,[TR[0]-.2,TR[1]-3.6, TR[0]+2,TR[1]-3.6, BR[0]+2.6,BR[1]+9.6, BR[0]+.2,BR[1]+9.6]);
        poly(c,[TL[0]-2,TL[1]-3.6, TR[0]+2,TR[1]-3.6, TR[0]+2,TR[1]-1.6, TL[0]-2,TL[1]-1.6]);
        c.fillStyle=p.LITE; poly(c,[TL[0]-2,TL[1]-3.6, TR[0]+2,TR[1]-3.6, TR[0]+2,TR[1]-3, TL[0]-2,TL[1]-3]);
      }
    };
    const step=u=>u<1?0:u<1.375?1+Math.floor((u-1)/.125):u<3.3?3:u<3.675?2-Math.floor((u-3.3)/.125):0;
    return (c,t)=>{ reset(c,px); scene(c,PAL[clamp(step(mod(t,P)),0,3)]); };
  } },

/* DREAMY BLOOM. Graded still. PIXEL_FX.softglow (its glow6 path) at Amount .6 and Threshold 35 % = level 90, the defaults, with
   Radius 250 %, Smoothness 3, run on a drawn white feather lying on slate linen: mask (L - 90) x 1.55, the kernel's box blur three
   times, then Screen in white. The linen sits just under the Threshold, so only the feather gives light. Screen is linear in the glow,
   so the glow layer laid on in Screen at alpha a is exactly Amount .6a. */
{ id:'softglow', name:'Dreamy Bloom', section:'Colouring', isNew:true, still:2.4,
  line:'The bright parts soften into a white haze that spills a little way past their edges.',
  make(px){
    const P=4.4, N=Math.min(px,300);
    /* checker k1: the feather is drawn close up, running off both edges, on a darker cloth, so there is enough bright area for the
       bloom to read at menu size (it changed the picture by 5.5 levels on average before, 9 now); the settings are unchanged */
    const B0=[8,106], C0=[50,62], T0=[97,-6];
    const at=s=>[(1-s)*(1-s)*B0[0]+2*s*(1-s)*C0[0]+s*s*T0[0],(1-s)*(1-s)*B0[1]+2*s*(1-s)*C0[1]+s*s*T0[1]];
    const tan=s=>{ const x=2*(1-s)*(C0[0]-B0[0])+2*s*(T0[0]-C0[0]), y=2*(1-s)*(C0[1]-B0[1])+2*s*(T0[1]-C0[1]), m=Math.hypot(x,y); return [x/m,y/m]; };
    const wid=s=>{ const q=clamp((s-.1)/.9); return Math.pow(Math.sin(Math.PI*q),.6)*(1-.3*q); };
    const A36=36*Math.PI/180, CA=Math.cos(A36), SA=Math.sin(A36);
    /* where a barb that leaves the shaft at s ends: leaning toward the tip by 36 degrees */
    const tip=(s,side,W,f)=>{ const p=at(s), t=tan(s), nx=-t[1]*side, ny=t[0]*side, L=W*wid(s)/CA*(f===undefined?1+.08*(vn2(s*46,side*5,9)-.5):f); return [p[0]+(nx*CA+t[0]*SA)*L+t[0]*L*.1, p[1]+(ny*CA+t[1]*SA)*L+t[1]*L*.1]; };
    const vane=(side,W)=>{ const o=[]; for(let i=0;i<=60;i++){ const p=at(.1+.9*i/60); o.push(p[0],p[1]); } for(let i=150;i>=0;i--){ const q=tip(.1+.9*i/150,side,W); o.push(q[0],q[1]); } return o; };
    const WL=22, WR=14;
    const paint=c=>{
      c.fillStyle='#38414b'; c.fillRect(0,0,100,100);
      let g=c.createLinearGradient(0,0,100,100); g.addColorStop(0,'rgba(255,250,240,0.04)'); g.addColorStop(1,'rgba(0,0,0,0.26)'); c.fillStyle=g; c.fillRect(0,0,100,100);
      c.fillStyle='rgba(255,255,255,0.035)'; for(let y=0;y<100;y+=.9) c.fillRect(0,y,100,.35);
      c.fillStyle='rgba(0,0,0,0.05)'; for(let x=0;x<100;x+=.9) c.fillRect(x,0,.35,100);
      /* its soft shadow on the cloth */
      for(const [ox,oy,al] of [[1.2,1.6,.12],[2.2,2.8,.1],[3.2,4,.08]]){ c.save(); c.translate(ox,oy); c.fillStyle='rgba(16,20,26,'+al+')'; poly(c,vane(-1,WL)); poly(c,vane(1,WR)); c.restore(); }
      /* the down at the base */
      const r=rng(5); c.strokeStyle='rgba(236,232,224,0.55)'; c.lineWidth=.3;
      for(let i=0;i<46;i++){ const s=.03+.1*r(), p=at(s), a=r()*TAU, L=3+5*r(); c.beginPath(); c.moveTo(p[0],p[1]); c.quadraticCurveTo(p[0]+Math.cos(a)*L*.6+(r()-.5)*2,p[1]+Math.sin(a)*L*.6+(r()-.5)*2,p[0]+Math.cos(a+.6)*L,p[1]+Math.sin(a+.6)*L); c.stroke(); }
      /* the vanes: the wide one faces the light; fine barbs over each, and a few splits where the barbs have parted */
      for(const [side,W,fill,seed] of [[-1,WL,'#f1eee7',11],[1,WR,'#d7d3ca',12]]){
        c.fillStyle=fill; poly(c,vane(side,W));
        const q=rng(seed); c.lineWidth=.22;
        for(let i=0;i<260;i++){ const s=.1+.9*i/260, p=at(s), e=tip(s,side,W); c.strokeStyle=i%2?'rgba(255,255,255,0.4)':'rgba(110,108,102,'+(.12+.1*q())+')'; c.beginPath(); c.moveTo(p[0],p[1]); c.lineTo(e[0],e[1]); c.stroke(); }
        /* splits: V-shaped partings, wide at the edge, closing toward the shaft along the barbs */
        c.fillStyle='#434e59';
        for(const s of side<0?[.44,.68]:[.33,.6]){ const a=tip(s,side,W), b=tip(s+.016,side,W), m=tip(s+.008,side,W,.38+.2*q()); poly(c,[a[0],a[1], b[0],b[1], m[0],m[1]]); }
      }
      /* the shaft */
      for(let i=0;i<40;i++){ const s0=i/40, s1=(i+1)/40, p0=at(s0), p1=at(s1); c.strokeStyle=s0<.09?'rgba(222,214,196,0.9)':'#cfc6b2'; c.lineWidth=lerp(1.15,.22,s0); c.beginPath(); c.moveTo(p0[0],p0[1]); c.lineTo(p1[0],p1[1]); c.stroke(); }
    };
    const [S,sx]=unitSheet(px,px,px); paint(sx);
    const [Mk,mx]=unitSheet(N,N,N); paint(mx);
    const d=mx.getImageData(0,0,N,N).data, n=N*N, B=new Float32Array(n), T=new Float32Array(n), THR=90, AMT=.6, RAD=250, PASSES=3, R=Math.max(1,Math.round(N/40*RAD/100));
    for(let i=0;i<n;i++){ const L=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2]; B[i]=L>THR?(L-THR)*1.55:0; }
    for(let k=0;k<PASSES;k++) boxBlur(B,T,N,N,R);
    const [G,gx]=sheet(N), gi=gx.createImageData(N,N), q=gi.data;
    for(let i=0;i<n;i++){ const v=Math.min(255,B[i]*AMT); q[i*4]=v; q[i*4+1]=v; q[i*4+2]=v; q[i*4+3]=255; }
    gx.putImageData(gi,0,0);
    const amt=u=>u<.9?0:u<1.5?E.out(Math.floor(seg(u,.9,1.5)*7)/7):u<3.7?1:u<3.95?1-Math.floor(seg(u,3.7,3.95)*3)/3:0;
    return (c,t)=>{
      const a=amt(mod(t,P)); raw(c); c.drawImage(S,0,0);
      if(a>0){ c.globalCompositeOperation='screen'; c.globalAlpha=a; c.drawImage(G,0,0,px,px); }
      reset(c,px);
    };
  } },

/* HUE RAMP. Chronophotograph plate, after Marey's smoke studies: silver smoke threads on black velvet, parted by a disc, with the
   rake they leave and a ruled scale. PIXEL_FX.spectralmap at its defaults (Span 260, Offset 0, Saturation 100): hue (1 - L) x 260,
   value .25 + .75L, so even the black velvet takes a colour. Amount blends linearly: the map over the plate at alpha Amount is exact. */
{ id:'spectralmap', name:'Hue Ramp', section:'Colouring', isNew:true, still:2.2,
  line:'Brightness becomes colour: black goes indigo, the middle tones green, the brightest orange-red.',
  make(px){
    const P=4.4, N=Math.min(px,320), n=N*N, U=100/N, CX=44, CY=46, A=8.5, A2=A*A, GAP=6.6;
    const [Sc,sx]=sheet(N), im=sx.createImageData(N,N), o=im.data;
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const u=(x+.5)*U, v=(y+.5)*U, j=(y*N+x)*4, dx=u-CX, dy0=v-CY, r2=dx*dx+dy0*dy0;
      let L=13-5*((u-50)*(u-50)+(v-50)*(v-50))/5000;
      if(u>4.6){
        const dd=dx/A, wake=dx>0?clamp((dd-.6)/3.2):0, env=Math.exp(-Math.pow(dy0/(2.6*A),2));
        const wob=wake*env*(3.4*Math.sin(.36*dx-.9)+2.4*(vn2(u/6,v/6,3)-.5)), dy=dy0+wob, rw=Math.max(dx*dx+dy*dy,A2);
        const psi=dy*(1-A2/rw), sig=.7+.016*u+1.3*wake*env;
        let s=0; for(let k=-6;k<=6;k++){ const q=(psi-k*GAP)/sig; s+=Math.exp(-q*q); }
        L+=242*(1-Math.exp(-2.6*s*(1-.004*u)));
      }
      const r=Math.sqrt(r2), cov=clamp((A-r)/U+.5);
      if(cov>0){ const disc=74+46*clamp(.5-(dx*.6+dy0*.8)/A*.5); L=lerp(L,disc,cov); }
      const g=clamp(Math.round(L),0,255); o[j]=g; o[j+1]=g; o[j+2]=g; o[j+3]=255; }
    sx.putImageData(im,0,0);
    sx.setTransform(N/100,0,0,N/100,0,0);
    /* the rake the threads come out of, and the plate's scale */
    sx.fillStyle='rgb(38,38,38)'; sx.fillRect(0,0,3.4,100);
    sx.fillStyle='rgb(150,150,150)'; for(let k=-6;k<=6;k++){ let yk=CY+k*GAP; for(let it=0;it<4;it++){ const dx=4-CX; yk=CY+k*GAP/(1-A2/(dx*dx+(yk-CY)*(yk-CY))); } if(yk>2&&yk<89) sx.fillRect(3.4,yk-.55,1.8,1.1); }
    sx.fillStyle='rgb(176,176,176)'; sx.fillRect(10,91,84,.5);
    for(let i=0;i<=20;i++) sx.fillRect(10+i*4.2-.2,91,.4,i%5?1.3:2.6);
    sx.font=MONO(3.8); sx.textAlign='center'; sx.textBaseline='alphabetic'; sx.fillStyle='rgb(168,168,168)'; for(let i=0;i<=20;i+=5) sx.fillText(String(i),10+i*4.2,98);
    const d=sx.getImageData(0,0,N,N).data;
    const [Cc,cx]=sheet(N), ci=cx.createImageData(N,N), co=ci.data;
    for(let i=0;i<n*4;i+=4){ const L=(.299*d[i]+.587*d[i+1]+.114*d[i+2])/255, H=(1-L)*260, V=.25+.75*L, C=V, X=C*(1-Math.abs((H/60)%2-1)); let r,g,b;
      if(H<60){r=C;g=X;b=0;} else if(H<120){r=X;g=C;b=0;} else if(H<180){r=0;g=C;b=X;} else if(H<240){r=0;g=X;b=C;} else if(H<300){r=X;g=0;b=C;} else {r=C;g=0;b=X;}
      co[i]=r*255; co[i+1]=g*255; co[i+2]=b*255; co[i+3]=255; }
    cx.putImageData(ci,0,0);
    const amount=u=>u<1.1?0:u<1.35?.5:u<3.5?1:u<3.75?.5:0;
    return (c,t)=>{
      const a=amount(mod(t,P)); raw(c); c.drawImage(Sc,0,0,px,px);
      if(a>0){ c.globalAlpha=a; c.drawImage(Cc,0,0,px,px); }
      reset(c,px);
    };
  } },

/* SPLIT TONING. A black-and-white still life drawn here: two pears on a table against a wall, window light from the left.
   PIXEL_FX.splittone at its defaults (teal #1e90a0 and orange #ffa04a at 50 %, Balance 0, Keep brightness 100, Blending 100), ported
   line for line. Mix is linear, so the graded plate over the grey one at alpha Mix is the kernel exactly. The chips are its two colours. */
{ id:'splittone', name:'Split Toning', section:'Colouring', isNew:true, still:2.3,
  line:'Shadows lean teal and highlights lean orange, while every brightness, black and white included, stays where it was.',
  make(px){
    const P=4.4, N=Math.min(px,320), n=N*N, U=100/N;
    const ln=Math.hypot(-.62,-.48,.62), lx=-.62/ln, ly=-.48/ln, lz=.62/ln;
    /* a pear as a surface of revolution: its radius along the axis, q = 0 at the stem end and 1 at the base */
    const prof=q=>{ if(q<.1) return .38*Math.sqrt(Math.max(0,1-Math.pow((q-.1)/.1,2))); if(q>.68) return Math.sqrt(Math.max(0,1-Math.pow((q-.68)/.32,2))); const t=(q-.1)/.58; return .38+.62*t*t*(3-2*t); };
    const pear=(u,v,cx,y0,y1,R,lean,L,seed)=>{
      const H=y1-y0, q=(v-y0)/H; if(q<0||q>1) return L;
      const rho=R*prof(q), ax=cx+lean*(y1-v); if(rho<=0) return L;
      const dxu=u-ax, cov=clamp((rho-Math.abs(dxu))/U+.5); if(cov<=0) return L;
      const dx=clamp(dxu/rho,-1,1), nz=Math.sqrt(1-dx*dx), dr=(R*prof(Math.min(1,q+.01))-R*prof(Math.max(0,q-.01)))/(.02*H);
      let nx=dx, ny=-dr*nz, nzz=nz; const m=Math.hypot(nx,ny,nzz); nx/=m; ny/=m; nzz/=m;
      const nd=nx*lx+ny*ly+nzz*lz, wrap=clamp((nd+.2)/1.2), bounce=Math.max(0,ny)*.1, rz=2*nd*nzz-lz, spec=Math.pow(Math.max(0,rz),28)*.22;
      const dot=h2(Math.floor(u*3.2),Math.floor(v*3.2),seed)>.94?.86:1, alb=.5*dot*(1-.12*vn2(u/3,v/3,seed));
      const B=255*Math.pow(clamp(alb*(.04+1.02*wrap*wrap+bounce)+spec),1/2.2);
      return lerp(L,B,cov);
    };
    const shadow=(u,v,cx,cy,rx,ry,k)=>{ const a=(u-cx)/rx, b=(v-cy)/ry; return 1-k*Math.exp(-(a*a+b*b)*2); };
    const lit=(u,v)=>{
      let L=v<62?158-.8*u-.12*v:(v<63.2?(118-.55*u)*.72:128-.55*u+(v-63)*.55);
      if(v>62) L*=shadow(u,v,54,80.6,18,3.2,.5)*shadow(u,v,40,79.7,11,1.3,.5)*shadow(u,v,78.5,74.5,13,2.6,.45)*shadow(u,v,68,73.9,8,1,.45);
      L=pear(u,v,68,46,74,11.5,.04,L,3);
      return pear(u,v,40,38,80,15,-.05,L,7);
    };
    /* stSplit at Balance 0: q = .5, gamma 1, h = smoothstep(level/255) */
    const TB=new Float64Array(257); for(let i=0;i<257;i++){ const x=Math.min(i,255)/255; TB[i]=x*x*(3-2*x); }
    const Sc=hex('#1e90a0'), Hc=hex('#ffa04a'), sa=.5, ha=.5, ys=.299*Sc[0]+.587*Sc[1]+.114*Sc[2], yh=.299*Hc[0]+.587*Hc[1]+.114*Hc[2];
    const sr=Sc[0]-ys, sg=Sc[1]-ys, sb=Sc[2]-ys, hr=Hc[0]-yh, hg=Hc[1]-yh, hb=Hc[2]-yh;
    const [Gc,gx]=sheet(N), gi=gx.createImageData(N,N), [Tc,tx]=sheet(N), ti=tx.createImageData(N,N);
    for(let i=0;i<n;i++){ const g=Math.round(clamp(lit((i%N+.5)*U,(Math.floor(i/N)+.5)*U),0,255)), j=i*4; gi.data[j]=g; gi.data[j+1]=g; gi.data[j+2]=g; gi.data[j+3]=255; }
    gx.putImageData(gi,0,0);
    /* the stems */
    gx.setTransform(N/100,0,0,N/100,0,0); gx.strokeStyle='rgb(42,42,42)'; gx.lineCap='round';
    gx.lineWidth=1.1; gx.beginPath(); gx.moveTo(37.9,39.4); gx.quadraticCurveTo(38.2,35,40.6,32.4); gx.stroke();
    gx.lineWidth=.9; gx.beginPath(); gx.moveTo(69.1,47.2); gx.quadraticCurveTo(68.9,43.8,67,41.9); gx.stroke();
    const sd=gx.getImageData(0,0,N,N).data;
    for(let i=0;i<n;i++){
      const j=i*4, g=sd[j];
      const r=g, gg=g, b=g, Y=.299*r+.587*gg+.114*b, yi=Y|0, h=TB[yi]+(TB[yi+1]-TB[yi])*(Y-yi), ws=(1-h)*sa, wh=h*ha;
      const dr=ws*sr+wh*hr, dg=ws*sg+wh*hg, db=ws*sb+wh*hb;
      let k=1;
      if(dr>0){ if(255-r<k*dr) k=(255-r)/dr; } else if(dr<0){ if(r<-k*dr) k=r/-dr; }
      if(dg>0){ if(255-gg<k*dg) k=(255-gg)/dg; } else if(dg<0){ if(gg<-k*dg) k=gg/-dg; }
      if(db>0){ if(255-b<k*db) k=(255-b)/db; } else if(db<0){ if(b<-k*db) k=b/-db; }
      if(!(k>0)) k=0;
      ti.data[j]=r+dr*k; ti.data[j+1]=gg+dg*k; ti.data[j+2]=b+db*k; ti.data[j+3]=255; }
    tx.putImageData(ti,0,0);
    const mixAt=u=>u<.9?0:u<1.5?E.inOut(seg(u,.9,1.5)):u<3.7?1:u<4.1?1-E.inOut(seg(u,3.7,4.1)):0;
    return (c,t)=>{
      const m=mixAt(mod(t,P)); raw(c);
      c.drawImage(Gc,0,0,px,px);
      if(m>0){ c.globalAlpha=m; c.drawImage(Tc,0,0,px,px); c.globalAlpha=1; }
      reset(c,px);
      c.fillStyle='#0c0c0d'; c.fillRect(3.4,3.4,12.4,6.4);
      c.fillStyle='#1e90a0'; c.fillRect(4.4,4.4,4.6,4.4); c.fillStyle='#ffa04a'; c.fillRect(10.2,4.4,4.6,4.4);
    };
  } },

/* COLOUR POP. A transit diagram. PIXEL_FX.spotcolor at its defaults (Keep #e03131, Hue range .2 = 24 degrees either side, Boost
   100 %), run on each flat colour; Drain the rest is linear, so travelling 0 to 100 % is a straight blend to the drained colour. */
{ id:'spotcolor', name:'Colour Pop', section:'Colouring', isNew:true, still:2.3,
  line:'One colour keeps its hue and everything else drains to grey; here only the red line survives.',
  make(px){
    const P=4.2, KH=0, WIN=.2*120;
    const drain=col=>{ const [R,G,B]=col, mx=Math.max(R,G,B), mn=Math.min(R,G,B), df=mx-mn; let keep=0;
      if(df>=8){ let h; if(mx===R) h=((G-B)/df)%6; else if(mx===G) h=(B-R)/df+2; else h=(R-G)/df+4; h*=60; if(h<0) h+=360; let dd=Math.abs(h-KH); if(dd>180) dd=360-dd; if(dd<=WIN){ const q=dd/WIN; keep=1-q*q; } }
      const L=.299*R+.587*G+.114*B, ds=1-keep; return [R+(L-R)*ds,G+(L-G)*ds,B+(L-B)*ds]; };
    const COL={ BG:BONE, RIVER:'#b3cbd6', RED:'#d8322a', BLUE:'#2c5aa0', GREEN:'#2f8a59', OCHRE:'#e3a52b', PURPLE:'#7b4c9f', WHITE:'#ffffff', INK:INK };
    const A={}, Z={}; for(const k in COL){ A[k]=hex(COL[k]); Z[k]=drain(A[k]); }
    const LINES=[['BLUE',[22,-6, 22,36, 48,62, 48,106]],['GREEN',[-6,46, 74,46, 90,30, 106,30]],['OCHRE',[84,-6, 84,52, 106,74]],['PURPLE',[-6,84, 32,84, 40,76, 106,76]],['RED',[-6,20, 38,20, 62,44, 62,106]]];
    const TICKS=[['RED',8,20,0,-1],['RED',62,60,1,0],['RED',62,92,-1,0],['BLUE',22,8,1,0],['BLUE',48,90,1,0],['GREEN',10,46,0,1],['GREEN',46,46,0,-1],['OCHRE',84,14,-1,0],['OCHRE',84,48,1,0],['PURPLE',14,84,0,1],['PURPLE',80,76,0,-1],['PURPLE',94,76,0,1]];
    const XCH=[[22,20],[32,46],[62,46],[84,36],[48,76],[62,76]];
    const desatAt=u=>u<.9?0:u<1.4?E.inOut(seg(u,.9,1.4)):u<3.4?1:u<3.8?1-E.inOut(seg(u,3.4,3.8)):0;
    return (c,t)=>{
      const k=desatAt(mod(t,P)), col=K=>css(mix3(A[K],Z[K],k)); reset(c,px);
      c.fillStyle=col('BG'); c.fillRect(0,0,100,100);
      c.lineJoin='round'; c.lineCap='butt';
      c.strokeStyle=col('RIVER'); c.lineWidth=7; path(c,[-6,66, 20,66, 30,56, 62,56, 72,66, 106,66]);
      c.lineWidth=3.4; for(const [K,p] of LINES){ c.strokeStyle=col(K); path(c,p); }
      for(const [K,x,y,dx,dy] of TICKS){ c.fillStyle=col(K); if(dx) c.fillRect(dx>0?x:x-3.5,y-.7,3.5,1.4); else c.fillRect(x-.7,dy>0?y:y-3.5,1.4,3.5); }
      for(const [x,y] of XCH){ c.beginPath(); c.arc(x,y,2.3,0,TAU); c.fillStyle=col('WHITE'); c.fill(); c.lineWidth=.9; c.strokeStyle=col('INK'); c.stroke(); }
      /* the effect's Keep colour, as the control shows it */
      c.fillStyle=INK; c.fillRect(3,91,19.5,6.4); c.font=MONO(4.2); c.fillStyle=BONE; c.textAlign='left'; c.textBaseline='middle'; c.fillText('KEEP',4.6,94.4);
      c.fillStyle='#e03131'; c.fillRect(16.4,92.2,4.4,4);
    };
  } },

/* STAR SHINE. A drawn night boulevard. PIXEL_FX.starglow ported: Threshold 70 %, weight ((L - thr) / span)^2, Ray colour From the
   light, four rays, the two-sided exponential smear per axis (sgStreak, verbatim) and 1 - e^(-Strength x sum), laid on in Screen.
   Ray length 90 px of a 1080 frame (the default is 60, the slider goes to 400). Strength rises 0 to 1, then Rotation turns
   45 to 135 degrees, which brings four rays back to where they began. The red tail lamps sit under the Threshold and get none.
   At px 300 this matches the app's own render of the same picture byte for byte. */
{ id:'starglow', name:'Star Shine', section:'Colouring', isNew:true, still:1.5,
  line:'Thin crossed rays shoot out of the brightest lights; dimmer ones, like the red tail lamps, are left alone.',
  make(px){
    const P=4.6, N=Math.min(px,300), ps=N/1080, LEN=90*ps, THR=.7*255, SPAN=255-THR, n=N*N, VX=60, VY=57, F=30, CAM=3;
    const lamps=[]; for(const z of [3.2,5,7.5,11,16,24]) lamps.push([-5.5,z,1]); for(const z of [7.5,11,16,24]) lamps.push([7,z,-1]);
    const paint=c=>{
      c.fillStyle='#19213a'; c.fillRect(0,0,100,100);
      const r=rng(41);
      c.fillStyle='#0b0e16';
      for(const [x,w,h] of [[0,9,22],[9,7,15],[16,10,27],[26,6,12],[32,8,19],[40,5,9],[45,6,13],[51,4,6],[55,3,4],[64,4,5],[68,6,10],[74,9,18],[83,6,24],[89,11,16]]) c.fillRect(x,VY-h,w+.2,h+.5);
      c.fillStyle='#5a4a33'; for(let i=0;i<40;i++){ const x=r()*98, y=VY-2-r()*22; if(y>VY-3) continue; c.fillRect(x,y,.9,.7); }
      c.fillStyle='#0e1015'; c.fillRect(0,VY,100,43);
      c.fillStyle='#1c1e24'; poly(c,[VX-2,VY, VX+2,VY, 122,100, -10,100]);
      c.fillStyle='#3a3b3f'; poly(c,[VX-2,VY, VX-1.6,VY, -6,100, -10,100]); poly(c,[VX+1.6,VY, VX+2,VY, 122,100, 118,100]);
      c.fillStyle='#45464a'; for(const z of [3.5,5,7,10,14,20]){ const y0=VY+F*CAM/z, y1=VY+F*CAM/(z+1.2), w=.9/z*3; poly(c,[VX-w,y0, VX+w,y0, VX+w*.6,y1, VX-w*.6,y1]); }
      /* sodium pools on the wet road */
      for(const [X,z] of lamps){ const x=VX+F*(X*.72)/z, y=VY+F*CAM/z, g=c.createRadialGradient(x,y,0,x,y,26/z); g.addColorStop(0,'rgba(255,170,92,0.2)'); g.addColorStop(1,'rgba(255,170,92,0)'); c.fillStyle=g; c.beginPath(); c.ellipse(x,y,26/z,9/z,0,0,TAU); c.fill(); }
      for(const [X,z,side] of lamps){
        const x=VX+F*X/z, base=VY+F*CAM/z, top=VY-F*CAM/z, rr=6/z, arm=side*9/z, lw=Math.max(.22,2.4/z);
        const rg=c.createLinearGradient(0,base,0,base+40/z); rg.addColorStop(0,'rgba(255,186,110,0.26)'); rg.addColorStop(1,'rgba(255,186,110,0)');
        c.fillStyle=rg; c.fillRect(x+arm-rr*.7,base,rr*1.4,40/z);
        c.strokeStyle='#05070a'; c.lineWidth=lw; c.lineCap='round'; path(c,[x,base, x,top, x+arm,top+.2]);
        const hx=x+arm, hy=top+rr*.55, g=c.createRadialGradient(hx,hy,0,hx,hy,rr*2.2);
        g.addColorStop(0,'rgb(255,253,244)'); g.addColorStop(.3,'rgb(255,238,204)'); g.addColorStop(.55,'rgba(255,184,104,0.85)'); g.addColorStop(1,'rgba(255,150,70,0)');
        c.fillStyle=g; c.beginPath(); c.arc(hx,hy,rr*2.2,0,TAU); c.fill();
      }
      /* an oncoming car's headlamps, and the tail lamps of one ahead */
      for(const hx of [52.4,57]){ const g=c.createRadialGradient(hx,65,0,hx,65,1.3); g.addColorStop(0,'rgb(255,255,252)'); g.addColorStop(.45,'rgb(236,242,255)'); g.addColorStop(1,'rgba(200,215,255,0)'); c.fillStyle=g; c.beginPath(); c.arc(hx,65,1.3,0,TAU); c.fill(); }
      for(const hx of [62.6,65.8]){ const g=c.createRadialGradient(hx,62.3,0,hx,62.3,1); g.addColorStop(0,'rgb(255,52,36)'); g.addColorStop(.5,'rgba(230,30,24,0.8)'); g.addColorStop(1,'rgba(200,20,20,0)'); c.fillStyle=g; c.beginPath(); c.arc(hx,62.3,1,0,TAU); c.fill(); }
    };
    const [S,sx]=unitSheet(px,px,px); paint(sx);
    const [Mk,mx]=unitSheet(N,N,N); paint(mx);
    const d=mx.getImageData(0,0,N,N).data, ch=[new Float32Array(n),new Float32Array(n),new Float32Array(n)];
    for(let i=0;i<n;i++){ const j=i*4, L=.299*d[j]+.587*d[j+1]+.114*d[j+2]; if(!(L>THR)) continue; let v=(L-THR)/SPAN; v=v*v*(d[j+3]/255); const m=Math.max(d[j],d[j+1],d[j+2]); if(m>0) for(let k=0;k<3;k++) ch[k][i]=v*d[j+k]/m; }
    const sums=deg=>{ const out=[]; for(let k=0;k<3;k++){ const s=new Float32Array(n); for(let a=0;a<2;a++) streak(ch[k],s,N,N,(deg+a*90)*Math.PI/180,LEN,1/ps); out.push(s); } return out; };
    const layer=(S3,amt)=>{ const [C,x]=sheet(N), im=x.createImageData(N,N), o=im.data; for(let i=0;i<n;i++){ const j=i*4; o[j]=255*(1-Math.exp(-amt*S3[0][i])); o[j+1]=255*(1-Math.exp(-amt*S3[1][i])); o[j+2]=255*(1-Math.exp(-amt*S3[2][i])); o[j+3]=255; } x.putImageData(im,0,0); return C; };
    const S45=sums(45), RISE=[.2,.4,.6,.8,1].map(a=>layer(S45,a)), TURN=[RISE[4]];
    for(let deg=50;deg<135;deg+=5) TURN.push(layer(sums(deg),1));
    const frame=u=>{
      if(u<.7||u>=4.3) return null;
      if(u<1.1) return RISE[Math.min(4,Math.floor((u-.7)/.08))];
      if(u<1.8) return RISE[4];
      if(u<3.6) return TURN[Math.min(TURN.length-1,Math.floor((u-1.8)/1.8*TURN.length))];
      if(u<4.0) return RISE[4];
      return RISE[Math.max(0,4-Math.floor((u-4.0)/.06)-1)];
    };
    return (c,t)=>{
      const L=frame(mod(t,P)); raw(c); c.drawImage(S,0,0);
      if(L){ c.globalCompositeOperation='screen'; c.drawImage(L,0,0,px,px); }
      reset(c,px);
    };
  } }

);
})();
