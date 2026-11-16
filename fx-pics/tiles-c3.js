/* FreeMotion effect pictures, artist 3 (c3): seven Colouring tiles, none of them on a photograph.
   Every subject is painted here; every change is the effect's own maths, ported from js/compositor.js and checked
   against the app's renderer on the same pixels (truth.html). */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const unitSheet=n=>{ const [C,x]=sheet(n); x.setTransform(n/100,0,0,n/100,0,0); return [C,x]; };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const css=c=>'rgb('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+')';
function fromData(n,data){ const [C,x]=sheet(n), im=x.createImageData(n,n); im.data.set(data); x.putImageData(im,0,0); return C; }
function poly(c,p){ c.beginPath(); for(let i=0;i<p.length;i+=2){ if(i) c.lineTo(p[i],p[i+1]); else c.moveTo(p[i],p[i+1]); } c.closePath(); }
function quad(c,pts,fill){ c.fillStyle=fill; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath(); c.fill(); }
/* crossfade through precomputed states: list[0] is the plain picture, v runs 0..1 over the rest */
function blend(c,list,v){ const n=list.length-1, q=clamp(v)*n, i=Math.min(n-1,Math.floor(q)), f=q-i; c.drawImage(list[i],0,0,100,100); if(f>.004){ c.globalAlpha=f; c.drawImage(list[i+1],0,0,100,100); c.globalAlpha=1; } }
/* one gaussian, as three box passes, zero outside the plate (what ctx.filter blur does at an edge) */
function boxPass(s,d,W,H,r,hz){ const k=1/(2*r+1);
  if(hz){ for(let y=0;y<H;y++){ const o=y*W; let a=0; for(let i=0;i<=r&&i<W;i++) a+=s[o+i]; for(let x=0;x<W;x++){ d[o+x]=a*k; const p=x+r+1, q=x-r; if(p<W) a+=s[o+p]; if(q>=0) a-=s[o+q]; } } }
  else { for(let x=0;x<W;x++){ let a=0; for(let i=0;i<=r&&i<H;i++) a+=s[i*W+x]; for(let y=0;y<H;y++){ d[y*W+x]=a*k; const p=y+r+1, q=y-r; if(p<H) a+=s[p*W+x]; if(q>=0) a-=s[q*W+x]; } } } }
function gauss(a,W,H,sig){ const r=Math.max(1,Math.round((Math.sqrt(4*sig*sig+1)-1)/2)), t=new Float32Array(a.length); for(let i=0;i<3;i++){ boxPass(a,t,W,H,r,true); boxPass(t,a,W,H,r,false); } return a; }
/* HSL as the kernels write it */
function toHSL(r,g,b){ r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b), dl=mx-mn; if(dl===0) return null;
  let h=mx===r?60*(((g-b)/dl)%6):mx===g?60*((b-r)/dl+2):60*((r-g)/dl+4); if(h<0) h+=360; if(!(h<360)) h=0;
  const L=(mx+mn)/2, S=L>.5?dl/(2-mx-mn):dl/(mx+mn); return [h,S,L]; }
function fromHSL(nh,ns,nl,o,j){ const c2=(1-Math.abs(2*nl-1))*ns, x2=c2*(1-Math.abs(((nh/60)%2)-1)), m2=nl-c2/2, sg=(nh/60)|0; let rr,gg,bb;
  if(sg===0){ rr=c2; gg=x2; bb=0; } else if(sg===1){ rr=x2; gg=c2; bb=0; } else if(sg===2){ rr=0; gg=c2; bb=x2; } else if(sg===3){ rr=0; gg=x2; bb=c2; } else if(sg===4){ rr=x2; gg=0; bb=c2; } else { rr=c2; gg=0; bb=x2; }
  o[j]=(rr+m2)*255; o[j+1]=(gg+m2)*255; o[j+2]=(bb+m2)*255; }
/* a little neutral noise, put straight into pixel data */
function grain(d,seed,amp){ const r=rng(seed); for(let i=0;i<d.length;i+=4){ const n=(r()+r()-1)*amp; d[i]+=n; d[i+1]+=n; d[i+2]+=n; } }

/* ---------------------------------------------------------------- HALATION: an underground car park at night */
function paintCarPark(x){
  /* one deck of a multi-storey car park: the right-hand side is open to a blown-out day, columns stand against it */
  const VX=27, VY=50, F=42, P=(X,Y,Z)=>[VX+F*X/Z,VY-F*Y/Z], CY=1.05, FY=-1.3, WL=-3.3, WE=3.4, ZF=40, TOP=CY-.1, PAR=-.5;
  let g=x.createLinearGradient(0,0,0,VY); g.addColorStop(0,'#2e2d2b'); g.addColorStop(1,'#1b1a19'); x.fillStyle=g; x.fillRect(0,0,100,VY);
  g=x.createLinearGradient(0,VY,0,100); g.addColorStop(0,'#1c1b1a'); g.addColorStop(1,'#2f2d2b'); x.fillStyle=g; x.fillRect(0,VY,100,100-VY);
  quad(x,[P(WL,CY,.4),P(WL,CY,ZF),P(WL,FY,ZF),P(WL,FY,.4)],'#22201f');
  quad(x,[P(WL,CY,ZF),P(WE,CY,ZF),P(WE,FY,ZF),P(WL,FY,ZF)],'#161515');
  /* the open side: daylight between the parapet and the slab above, a far roofline in the haze */
  quad(x,[P(WE,TOP,.6),P(WE,TOP,ZF),P(WE,PAR,ZF),P(WE,PAR,.6)],'#f7f5ef');
  quad(x,[P(WE,PAR+.22,.6),P(WE,PAR+.22,ZF),P(WE,PAR,ZF),P(WE,PAR,.6)],'#e3e0d7');
  quad(x,[P(WE,CY,.6),P(WE,CY,ZF),P(WE,TOP,ZF),P(WE,TOP,.6)],'#2b2a28');
  quad(x,[P(WE,PAR,.6),P(WE,PAR,ZF),P(WE,FY,ZF),P(WE,FY,.6)],'#383634');
  quad(x,[P(WE,PAR,.6),P(WE,PAR,ZF),P(WE,PAR-.05,ZF),P(WE,PAR-.05,.6)],'#8a867e');
  /* daylight lying on the deck by the open side, bay lines */
  quad(x,[P(1.7,FY,.8),P(WE,FY,.8),P(WE,FY,ZF),P(1.7,FY,ZF)],'rgba(150,146,138,.16)');
  for(let Z=2.6;Z<ZF;Z+=2.4) quad(x,[P(.7,FY,Z),P(3.2,FY,Z),P(3.2,FY,Z+.06),P(.7,FY,Z+.06)],'rgba(178,176,168,.72)');
  /* downstand beams, and one row of strip lights */
  for(let Z=4;Z<ZF;Z+=4){ quad(x,[P(WL,CY,Z),P(WE,CY,Z),P(WE,CY-.28,Z+.22),P(WL,CY-.28,Z+.22)],'#141313'); quad(x,[P(WL,CY-.28,Z+.22),P(WE,CY-.28,Z+.22),P(WE,CY-.28,Z+.36),P(WL,CY-.28,Z+.36)],'#353331'); }
  for(let Z=1.5;Z<ZF-2;Z+=2.6){ quad(x,[P(.55,CY,Z-.1),P(.85,CY,Z-.1),P(.85,CY,Z+1.35),P(.55,CY,Z+1.35)],'#4d4b47'); quad(x,[P(.64,CY-.05,Z),P(.76,CY-.05,Z),P(.76,CY-.05,Z+1.25),P(.64,CY-.05,Z+1.25)],'#f8faf4');
    quad(x,[P(.6,2*FY-CY,Z),P(.8,2*FY-CY,Z),P(.8,2*FY-CY,Z+1.25),P(.6,2*FY-CY,Z+1.25)],'rgba(205,208,200,.2)'); }
  /* columns on the open edge, backlit, far to near; a second row inside */
  for(let Z=33.6;Z>1;Z-=3.4){ const X0=2.9, W=.5;
    quad(x,[P(X0,CY,Z),P(X0,CY,Z+W),P(X0,FY,Z+W),P(X0,FY,Z)],'#3a3835');
    quad(x,[P(X0,CY,Z),P(X0+W,CY,Z),P(X0+W,FY,Z),P(X0,FY,Z)],'#1f1e1c');
    quad(x,[P(X0,FY+.5,Z),P(X0+W,FY+.5,Z),P(X0+W,FY,Z),P(X0,FY,Z)],'#77746d'); }
  for(let Z=30.6;Z>2;Z-=8){ const X0=-2.7, W=.45;
    quad(x,[P(X0+W,CY,Z),P(X0+W,CY,Z+W),P(X0+W,FY,Z+W),P(X0+W,FY,Z)],'#2a2826');
    quad(x,[P(X0,CY,Z),P(X0+W,CY,Z),P(X0+W,FY,Z),P(X0,FY,Z)],'#3d3b38');
    quad(x,[P(X0,FY+.5,Z),P(X0+W,FY+.5,Z),P(X0+W,FY,Z),P(X0,FY,Z)],'#8e8b83'); }
}

/* ---------------------------------------------------------------- HIGHLIGHTS & SHADOWS: under a steel bridge */
function paintBridge(x){
  /* standing on the bank under a steel bridge, looking out past its edge at a bright river */
  const EDGE=51, r=rng(23);
  let g=x.createLinearGradient(0,EDGE-4,0,60); g.addColorStop(0,'#c4d9ea'); g.addColorStop(1,'#e9f0f2'); x.fillStyle=g; x.fillRect(0,0,100,60);
  /* the far bank in sun: trees, a few houses */
  x.fillStyle='#7f9a62'; x.fillRect(0,57.6,100,4.6);
  x.fillStyle='#6a8650'; for(let i=0;i<30;i++){ const bx=r()*100, bw=1.6+r()*4.4, bh=1+r()*3; x.beginPath(); x.ellipse(bx,58.2,bw,bh,0,Math.PI,TAU); x.fill(); }
  for(const [hx,hw,hh] of [[24,4.2,2.6],[30,3,2.2],[61,5,3],[67.5,3.4,2.4],[86,4.4,2.8]]){ x.fillStyle='#e6dccb'; x.fillRect(hx,61-hh,hw,hh); x.fillStyle='#b8603f'; poly(x,[hx-.4,61-hh, hx+hw+.4,61-hh, hx+hw*.5,61-hh-1.6]); x.fill(); }
  g=x.createLinearGradient(0,62,0,100); g.addColorStop(0,'#dbe7ee'); g.addColorStop(1,'#b9cfdc'); x.fillStyle=g; x.fillRect(0,62,100,38);
  for(let i=0;i<190;i++){ const y=62.4+Math.pow(r(),1.3)*37, s=.4+(y-62)/24, w=(1.4+r()*4.6)*s, xx=r()*100; x.fillStyle=r()<.5?'rgba(248,251,252,.9)':'rgba(140,166,184,.6)'; x.fillRect(xx,y,w,.3+(y-62)*.014); }
  /* the bridge's own shadow on the water, close in */
  x.fillStyle='#22292d'; x.beginPath(); x.moveTo(0,100); for(let i=0;i<=100;i+=5) x.lineTo(i,82+1.4*Math.sin(i*.31)+.6*r()); x.lineTo(100,100); x.closePath(); x.fill();
  for(let i=0;i<90;i++){ const y=83.5+r()*16.5, xx=r()*100, w=1.5+r()*5; x.fillStyle=r()<.5?'rgba(52,62,68,.95)':'rgba(14,18,20,.95)'; x.fillRect(xx,y,w,.45); }
  /* overhead: green-painted steel, the deck plate, then big girders running across, nearer ones higher and deeper */
  x.fillStyle='#0f1512'; x.fillRect(0,0,100,EDGE);
  for(const z of [4.4,2.9,1.95,1.32,.92]){ const y=EDGE-2-32/z, web=8/z, fl=2.1/z;
    x.fillStyle='#16201b'; x.fillRect(0,y-web,100,web);
    for(let sx=(z*13)%6;sx<100;sx+=11/z){ x.fillStyle='#1f2c25'; x.fillRect(sx,y-web,.6/z+.2,web); }
    x.fillStyle='#2a3d33'; x.fillRect(0,y,100,fl); x.fillStyle='#3a5446'; x.fillRect(0,y+fl-.35,100,.35);
    x.fillStyle='#26362e'; for(let rx=1;rx<100;rx+=3.4/z+.5) x.fillRect(rx,y-web*.2,.5,.5); }
  /* the outer edge of the deck, catching a line of sun */
  x.fillStyle='#24211e'; x.fillRect(0,EDGE-1.4,100,1.4); x.fillStyle='#9a958b'; x.fillRect(0,EDGE,100,.45);
  /* the abutment, in shade, its stone courses */
  x.fillStyle='#1d1a17'; x.fillRect(0,0,13,100);
  x.fillStyle='#302b26'; for(let y=2,k=0;y<100;y+=4.4,k++){ x.fillRect(0,y,13,.45); x.fillRect(k%2?3.4:8.6,y,.45,4.4); }
  x.fillStyle='#3d3730'; x.fillRect(12.6,0,.45,100);
  /* a river-level gauge screwed to it, red and white, in the same shade: hard to read until the shadows come up */
  x.fillStyle='#0d0c0b'; x.fillRect(3.4,46,6.6,54);
  for(let i=0;i<13;i++){ const y=47+i*4.2; x.fillStyle=i%2?'#521a14':'#4e4b46'; x.fillRect(4,y,5.4,4.2); x.fillStyle=i%2?'#4e4b46':'#521a14'; x.fillRect(4,y+1.9,2.2,.45); x.fillRect(4,y+3.95,3.2,.25); }
  x.fillStyle='#4e4b46'; x.font=MONO(2.4); x.textAlign='right'; x.textBaseline='middle'; for(let i=1;i<13;i+=2) x.fillText(String(9-((i-1)>>1)),9.2,47+i*4.2+2.1);
}

/* ---------------------------------------------------------------- HSL BANDS: the Blue band, its own maths */
function bandMap(c,k,o){ const q=toHSL(c[0],c[1],c[2]); if(!q||k<=0){ o[0]=c[0]; o[1]=c[1]; o[2]=c[2]; return o; }
  const [h,S,L]=q; let dh=Math.abs(h-240); if(dh>180) dh=360-dh;
  const u=dh>=40?0:1-dh/40, w=u*u*(3-2*u)*Math.min(1,S*3);
  if(dh>64||w<=.002){ o[0]=c[0]; o[1]=c[1]; o[2]=c[2]; return o; }
  let nh=h+45*k*w; nh=((nh%360)+360)%360; fromHSL(nh,clamp(S*(1+.4*k*w)),L,o,0); return o; }
/* a studio patch bay, front on: two rows of jacks, cords plugged in and hanging out of frame */
function patchBay(c,k){
  const o=[0,0,0], col=(rgb,f,l)=>css(bandMap([Math.min(255,rgb[0]*f+l),Math.min(255,rgb[1]*f+l),Math.min(255,rgb[2]*f+l)],k,o));
  c.fillStyle='#1a1816'; c.fillRect(0,0,100,100);
  c.fillStyle='#24211e'; c.fillRect(0,0,4.2,100); c.fillRect(95.8,0,4.2,100);
  c.fillStyle='#0f0e0d'; for(let y=3;y<100;y+=4.45){ c.fillRect(1.4,y,1.4,1.4); c.fillRect(97.2,y,1.4,1.4); }
  const ANG=-.035, CX=50, CY=33, ca=Math.cos(ANG), sa=Math.sin(ANG), at=(u,v)=>[CX+u*ca-v*sa,CY+u*sa+v*ca];
  c.save(); c.translate(CX,CY); c.rotate(ANG);
  c.fillStyle='#2e2e30'; c.fillRect(-62,-15.5,124,31); c.fillStyle='#46464a'; c.fillRect(-62,-15.5,124,.5); c.fillStyle='#161617'; c.fillRect(-62,15,124,.5);
  c.fillStyle='#d6d0c0'; c.fillRect(-62,-12.6,124,2.6); c.fillRect(-62,.6,124,2.6);
  c.fillStyle='#2a2622'; c.font=MONO(2); c.textAlign='center'; c.textBaseline='middle';
  for(let i=0;i<12;i++){ const u=-46.2+i*8.4; c.fillText(String(i+1),u,-11.3); c.fillText(String(i+13),u,1.9); c.fillRect(u+4.1,-12.6,.25,2.6); c.fillRect(u+4.1,.6,.25,2.6); }
  for(const v of [-5.2,8]) for(let i=0;i<12;i++){ const u=-46.2+i*8.4; c.fillStyle='#8f8f93'; c.beginPath(); c.arc(u,v,2.2,0,TAU); c.fill(); c.fillStyle='#c9c9cc'; c.beginPath(); c.arc(u-.3,v-.3,1.7,0,TAU); c.fill(); c.fillStyle='#070707'; c.beginPath(); c.arc(u,v,1.15,0,TAU); c.fill(); }
  c.restore();
  const RED=[198,46,40], DEEP=[42,60,192], DEEP2=[54,76,206], CORN=[98,138,216], YEL=[230,190,44], GRN=[46,148,84], BLK=[34,33,32], WHT=[226,224,218], ORA=[226,112,34];
  const CORDS=[ [1,0,BLK,3,-4],[1,2,DEEP,19,3],[1,5,WHT,50,-3],[1,7,ORA,62,4],[1,9,DEEP2,77,-2],[1,11,RED,97,2],
                [0,1,RED,12,3],[0,3,DEEP,31,-3],[0,4,YEL,40,4],[0,6,DEEP2,47,-5],[0,8,GRN,66,3],[0,10,CORN,86,-4] ];
  c.lineCap='round';
  for(const [row,i,rgb,ex,sw] of CORDS){ const [jx,jy]=at(-46.2+i*8.4,row?8:-5.2);
    c.strokeStyle=col(rgb,.62,0); c.lineWidth=3.1; c.beginPath(); c.moveTo(jx,jy); c.bezierCurveTo(jx+sw,jy+22,ex-sw*.6,80,ex,106); c.stroke();
    c.strokeStyle=col(rgb,1,0); c.lineWidth=2.3; c.stroke();
    c.strokeStyle=col(rgb,1.05,40); c.lineWidth=.55; c.beginPath(); c.moveTo(jx-.7,jy+2); c.bezierCurveTo(jx+sw-.7,jy+22,ex-sw*.6-.7,80,ex-.7,106); c.stroke();
    c.fillStyle=col(rgb,.62,0); c.beginPath(); c.arc(jx,jy,2.75,0,TAU); c.fill(); c.fillStyle=col(rgb,1,0); c.beginPath(); c.arc(jx-.25,jy-.25,2.3,0,TAU); c.fill(); c.fillStyle=col(rgb,1.05,46); c.beginPath(); c.arc(jx-1,jy-1,.7,0,TAU); c.fill(); }
}

/* ---------------------------------------------------------------- HSL MIXER: the kernel's tables */
const HMB=[[0,15],[30,15],[60,15],[120,30],[180,30],[240,20],[280,20],[320,20]];
function hmTables(vals){ const T=[new Float64Array(361),new Float64Array(361),new Float64Array(361)];
  for(let s=0;s<3;s++){ for(let k=0;k<8;k++){ const k2=(k+1)%8, c0=HMB[k][0], c1=k2?HMB[k2][0]:360, gap=c1-c0, v0=vals[s*8+k]*(s?1:HMB[k][1]), v1=vals[s*8+k2]*(s?1:HMB[k2][1]); for(let h=c0;h<c1;h++) T[s][h]=v0+(v1-v0)*(h-c0)/gap; } T[s][360]=T[s][0]; }
  return T; }
function hmApply(d,o,T){ const TH=T[0], TS=T[1], TL=T[2]; o.set(d);
  for(let i=0;i<d.length;i+=4){ const q=toHSL(d[i],d[i+1],d[i+2]); if(!q) continue; const [h,S,L]=q, hi=h|0, f=h-hi;
    const dh=TH[hi]+(TH[hi+1]-TH[hi])*f, ds=TS[hi]+(TS[hi+1]-TS[hi])*f, dv=TL[hi]+(TL[hi+1]-TL[hi])*f; if(dh===0&&ds===0&&dv===0) continue;
    const w=S*3>1?1:S*3; let nh=h+dh*w; nh=((nh%360)+360)%360; fromHSL(nh,clamp(S*(1+ds*w)),clamp(L+dv*w*.35),o,i); } }
/* a faded wool tartan, 2/2 twill, thread by thread */
function tartan(d,N,H){
  const NAV=[58,60,120], GRN=[64,118,66], RUS=[172,102,58], BLK=[33,32,35], CRM=[204,196,168];
  const HALF=[[NAV,12],[BLK,2],[NAV,2],[BLK,2],[NAV,2],[BLK,9],[GRN,14],[RUS,3],[GRN,14],[BLK,9],[CRM,1]];
  const sett=[]; for(const [c,n] of HALF) for(let i=0;i<n;i++) sett.push(c); for(let i=HALF.reduce((a,b)=>a+b[1],0)-2;i>0;i--) sett.push(sett[i]);
  const S=sett.length, T=.82, a=-.12, ca=Math.cos(a), sa=Math.sin(a), r=rng(31), Q=[[.25,.25],[.75,.25],[.25,.75],[.75,.75]];
  for(let y=0;y<H;y++) for(let x=0;x<N;x++){ let R=0, G=0, B=0;
    for(const [ox,oy] of Q){ const X=(x+ox)*100/N, Y=(y+oy)*100/N, u=X*ca-Y*sa+40, v=X*sa+Y*ca+40, tu=Math.floor(u/T), tv=Math.floor(v/T), fu=u/T-tu, fv=v/T-tv;
      const warp=((tu+tv)&3)<2, cc=warp?sett[((tu%S)+S)%S]:sett[((tv%S)+S)%S], f=warp?fu:fv;
      const fold=1+.07*Math.sin(X*.045+Y*.03)-.06*Math.max(0,Math.sin(Y*.06-X*.02-.5)), sh=(.8+.2*Math.sin(Math.PI*f))*fold;
      R+=cc[0]*sh; G+=cc[1]*sh; B+=cc[2]*sh; }
    const n=(r()-.5)*8, j=(y*N+x)*4; d[j]=R/4+n; d[j+1]=G/4+n; d[j+2]=B/4+n; d[j+3]=255; }
}

/* ---------------------------------------------------------------- HUE SHIFT: pool balls on the cloth, from above */
const e1HueM=deg=>{ const a=Math.cos(deg*Math.PI/180), b=Math.sin(deg*Math.PI/180);
  return [.213+.787*a-.213*b, .715-.715*a-.715*b, .072-.072*a+.928*b,
          .213-.213*a+.143*b, .715+.285*a+.140*b, .072-.072*a-.283*b,
          .213-.213*a-.787*b, .715-.715*a+.715*b, .072+.928*a+.072*b]; };
function paintBalls(x){
  let g=x.createRadialGradient(30,24,4,40,40,95); g.addColorStop(0,'#2f8a5c'); g.addColorStop(1,'#165236'); x.fillStyle=g; x.fillRect(0,0,100,100);
  const R=14, BALLS=[[23,31,[20,20,22],0,'8',.5],[56,50,[236,182,24],0,'1',-.2],[84,19,[198,28,36],0,'3',.9],[90,77,[34,72,196],1,'10',.35],[34,83,[240,236,226],-1,'',0],[-3,66,[234,108,26],1,'13',-.7]];
  for(const [bx,by] of BALLS){ const q=x.createRadialGradient(bx+3.4,by+4.2,R*.4,bx+3.4,by+4.2,R*1.25); q.addColorStop(0,'rgba(0,0,0,.5)'); q.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=q; x.beginPath(); x.arc(bx+3.4,by+4.2,R*1.25,0,TAU); x.fill(); }
  for(const [bx,by,col,stripe,num,rot] of BALLS){
    x.save(); x.beginPath(); x.arc(bx,by,R,0,TAU); x.clip();
    x.fillStyle=stripe>0?'#f1ede2':css(col); x.fillRect(bx-R,by-R,2*R,2*R);
    if(stripe>0){ x.save(); x.translate(bx,by); x.rotate(rot); x.fillStyle=css(col); x.fillRect(-R,-R*.52,2*R,R*1.04); x.restore(); }
    if(num){ const nx=bx+Math.cos(rot)*R*.18, ny=by-R*.12; x.fillStyle='#f3efe4'; x.beginPath(); x.ellipse(nx,ny,R*.4,R*.36,rot,0,TAU); x.fill(); x.fillStyle='#15130f'; x.font='800 '+(R*.46).toFixed(2)+'px "Helvetica Neue",Helvetica,Arial,sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.save(); x.translate(nx,ny+.3); x.rotate(rot*.5); x.fillText(num,0,0); x.restore(); }
    const sh=x.createRadialGradient(bx-R*.38,by-R*.42,R*.05,bx-R*.1,by-R*.12,R*1.18); sh.addColorStop(0,'#ffffff'); sh.addColorStop(.45,'#d6d6d6'); sh.addColorStop(1,'#3a3a3a');
    x.globalCompositeOperation='multiply'; x.fillStyle=sh; x.fillRect(bx-R,by-R,2*R,2*R);
    x.globalCompositeOperation='source-over';
    const sp=x.createRadialGradient(bx-R*.42,by-R*.46,0,bx-R*.42,by-R*.46,R*.3); sp.addColorStop(0,'rgba(255,255,255,.95)'); sp.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=sp; x.fillRect(bx-R,by-R,2*R,2*R);
    x.restore(); }
}

/* ---------------------------------------------------------------- OIL SLICK: a silk scarf, black and white */
const pih=(a,b,s)=>{ let h=(Math.imul(a|0,374761393)+Math.imul(b|0,668265263)+Math.imul(s|0,1442695041))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; };
/* a crumpled silk scarf in black and white, its corner lying on a dark table: a rolled hem and a fringe of loose threads past it */
const SILK=[[.085,.035,5.2,0],[.06,-.05,6.5,1.3],[.045,.07,7.4,2.1],[.13,.06,2.1,.4],[.028,.1,6,3.3],[.17,-.09,1.3,1.7],[.1,-.13,1.8,4.4]];
function silkL(X,Y){
  /* where the cloth ends: a soft-edged hem across the lower right, a dark table beyond it */
  const hem=X+Y*.9-148+3.5*Math.sin(Y*.12)+2.2*Math.sin(X*.2);
  let gx=0, gy=0; for(const [kx,ky,a,p] of SILK){ const c=Math.cos(kx*X+ky*Y+p)*a; gx+=c*kx; gy+=c*ky; }
  gx*=1.25; gy*=1.25;
  const n=1/Math.hypot(gx,gy,1), nx=-gx*n, ny=-gy*n, nz=n, lx=-.48, ly=-.58, lz=.66, d=Math.max(0,nx*lx+ny*ly+nz*lz);
  const hx=lx, hy=ly, hz=lz+1, hn=Math.hypot(hx,hy,hz), sp=Math.pow(Math.max(0,(nx*hx+ny*hy+nz*hz)/hn),22);
  let L=.06+.78*d*d+.32*sp;
  L*=1-.18*(X+Y)/200;
  L=clamp(L,.03,.97);
  const table=.04+.012*Math.sin(X*.05);
  if(hem<-3.6) return L;
  if(hem<-1.4) return L*(.62+.25*Math.sin((hem+3.6)/2.2*Math.PI));   /* the rolled hem, a raised cord along the edge */
  /* the fringe: loose threads running on past the hem, each a little longer or shorter */
  const along=(Y-X*.9+.9*Math.sin(hem*.35))/1.346, k=Math.floor(along/1.8), th=along/1.8-k, len=7+6*pih(k,0,12);
  if(hem<len&&Math.abs(th-.5)<.17) return lerp(.5,.16,clamp((hem-1.4)/len))*(1-.35*Math.abs(th-.5)/.17);
  return table*(hem<9?.55+.45*clamp((hem-1.4)/7.6):1);
}

/* ---------------------------------------------------------------- LEVELS: a faded lens drawing */
function paintLens(x){
  x.fillStyle='#fff'; x.fillRect(0,0,100,100);
  x.strokeStyle='#000'; x.fillStyle='#000'; x.lineWidth=.7; x.lineCap='round'; x.lineJoin='round';
  const AX=38;
  x.setLineDash([5,1.4,.6,1.4]); x.beginPath(); x.moveTo(3,AX); x.lineTo(97,AX); x.stroke(); x.setLineDash([]);
  const EL=[[17,24,4.2,-1,1],[29,21,2.6,-1,-1],[45,15,2.2,1,-1],[58,18,4,-1,1]];
  const shape=(cx,hh,ht,c1,c2)=>{ x.beginPath(); x.moveTo(cx-ht,AX-hh); x.quadraticCurveTo(cx-ht+c1*7,AX,cx-ht,AX+hh); x.lineTo(cx+ht,AX+hh); x.quadraticCurveTo(cx+ht+c2*7,AX,cx+ht,AX-hh); x.closePath(); };
  for(const [cx,hh,ht,c1,c2] of EL){
    shape(cx,hh,ht,c1,c2); x.save(); x.clip(); x.lineWidth=.45; x.beginPath(); for(let k=-60;k<60;k+=1.5){ x.moveTo(cx+k-30,AX-30); x.lineTo(cx+k+30,AX+30); } x.stroke(); x.restore();
    x.lineWidth=.7; shape(cx,hh,ht,c1,c2); x.stroke(); }
  x.lineWidth=.9; x.beginPath(); x.moveTo(38,AX-19); x.lineTo(38,AX-8); x.moveTo(38,AX+8); x.lineTo(38,AX+19); x.stroke();
  x.lineWidth=.45; const FX=84;
  for(const hy of [-16,-9,9,16]){ x.beginPath(); x.moveTo(3,AX+hy); x.lineTo(12.6,AX+hy); x.lineTo(62,AX+hy*.45); x.lineTo(FX,AX); x.lineTo(95,AX-hy*.22); x.stroke(); }
  x.lineWidth=.8; x.beginPath(); x.moveTo(FX,AX-14); x.lineTo(FX,AX+14); x.stroke();
  x.lineWidth=.45; x.beginPath(); x.moveTo(62,AX+22); x.lineTo(62,AX+30); x.moveTo(FX,AX+16); x.lineTo(FX,AX+30); x.moveTo(62,AX+27); x.lineTo(FX,AX+27); x.stroke();
  for(const [px_,d] of [[62,1],[FX,-1]]){ x.beginPath(); x.moveTo(px_,AX+27); x.lineTo(px_+d*2.2,AX+26.1); x.lineTo(px_+d*2.2,AX+27.9); x.closePath(); x.fill(); }
  x.font=MONO(3.6); x.textAlign='center'; x.textBaseline='alphabetic'; x.fillText('f = 50',73,AX+25.6);
  x.textAlign='left'; x.font=MONO(4.2); x.fillText('FIG. 12',4,AX+33);
}

/* the eight faders of the mixer, on the app's navy */
const FADER_CH=[[226,60,50],[236,140,40],[232,206,62],[70,170,80],[40,188,190],[52,92,220],[140,72,210],[208,60,160]];
function faders(c,val,label){
  c.fillStyle=NAVY; c.fillRect(0,80,100,20); c.fillStyle=HAIR; c.fillRect(0,80,100,.5);
  for(let i=0;i<8;i++){ const fx=6.5+i*11.2, mid=88.2, hy=mid-val[i]*6.4, on=Math.abs(val[i])>.01;
    c.fillStyle=DIM; c.fillRect(fx-.25,82.6,.5,11.2); c.fillRect(fx-1.3,mid-.25,2.6,.5);
    c.fillStyle=on?TEAL:'#4a566b'; c.fillRect(fx-1.9,hy-1,3.8,2);
    c.fillStyle=css(FADER_CH[i]); c.fillRect(fx-1.5,95.6,3,3); }
  c.font=MONO(3.4); c.fillStyle=DIM; c.textAlign='right'; c.textBaseline='middle'; c.fillText(label,99.4,83.4);
}

window.FX_TILES.push(

/* HALATION. Graded still, painted here: one deck of a multi-storey car park, its open side blown out by daylight, the columns
   against it. CANVAS_FX.halation's two-radius bloom at Amount 1.5 and Spread 8% (both mid-slider; Threshold .5, Core .5,
   Falloff 1.8 and the #ff3a14 halo are the defaults): the highlight mask is built on a quarter plate, blurred tight and wide,
   and ADDED ('lighter') at Amount x .65 and x .35. At the defaults (1.1, 5%) the red rim is the same shape but under a pixel
   wide at menu size, so the tile turns it up as far as an ordinary film look would. */
{ id:'halation', name:'Halation', section:'Colouring', isNew:true, still:2.2,
  line:'The brightest parts of the shot bleed a red-orange glow into the dark around them, the way film does.',
  make(px){
    const P=4.4, [S,sx]=unitSheet(px); paintCarPark(sx);
    const Q=150, [M,mx]=sheet(Q); mx.imageSmoothingEnabled=true; mx.imageSmoothingQuality='high'; mx.drawImage(S,0,0,Q,Q);
    const md=mx.getImageData(0,0,Q,Q).data, A=new Float32Array(Q*Q), THR=.5, KNEE=1.8;
    for(let i=0;i<Q*Q;i++){ const j=i*4, l=(.299*md[j]+.587*md[j+1]+.114*md[j+2])/255*(md[j+3]/255); const e=(l-THR)/(1-THR); A[i]=e<=0?0:e>=1?1:Math.pow(e,KNEE); }
    const bloom=sig=>{ const a=gauss(Float32Array.from(A),Q,Q,sig), [C,x]=sheet(Q), im=x.createImageData(Q,Q), d=im.data; for(let i=0;i<Q*Q;i++){ const j=i*4; d[j]=255; d[j+1]=58; d[j+2]=20; d[j+3]=Math.round(255*a[i]); } x.putImageData(im,0,0); return C; };
    const SPREAD=8, CORE=.5, AMT=1.5, WIDE=bloom(SPREAD*Q/100), TIGHT=bloom(SPREAD*(.06+.24*(1-CORE))*Q/100);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.drawImage(S,0,0,100,100);
      const a=AMT*E.inOut(seg(u,.6,1.35))*(1-E.inOut(seg(u,3.45,4.1)));
      if(a>.002){ c.globalCompositeOperation='lighter'; c.globalAlpha=Math.min(1,a*.65); c.drawImage(TIGHT,0,0,100,100); c.globalAlpha=Math.min(1,a*.35); c.drawImage(WIDE,0,0,100,100); }
      reset(c,px);
    };
  } },

/* HIGHLIGHTS & SHADOWS. Graded still: standing under a steel bridge on a bright day. The whole-picture curve at its defaults
   (Shadows +50, Highlights -40): every channel gets 60(1-L)^2 - 48L^2 levels, L the pixel's own luma, so the girders,
   rivets and stonework in the shade come up and the sky and the river come down. */
{ id:'highlightsshadows', name:'Highlights & Shadows', section:'Colouring', isNew:true, still:2.3,
  line:'Dark areas lift and bright areas come down: the steel and the gauge in the shade show up, and the bright river calms.',
  make(px){
    const P=4.4, N=Math.min(px,420), [S,sx]=unitSheet(N); paintBridge(sx);
    sx.setTransform(1,0,0,1,0,0); const d=sx.getImageData(0,0,N,N).data; grain(d,9,4.5);
    const add=new Float32Array(N*N), SH=.5*120, HI=-.4*120;
    for(let i=0;i<N*N;i++){ const j=i*4, L=clamp((.299*d[j]+.587*d[j+1]+.114*d[j+2])/255); add[i]=SH*(1-L)*(1-L)+HI*L*L; }
    const LV=[fromData(N,d)], STEPS=5;
    for(let s=1;s<=STEPS;s++){ const k=s/STEPS, o=new Uint8ClampedArray(d.length); for(let i=0;i<N*N;i++){ const j=i*4, a=k*add[i]; o[j]=d[j]+a; o[j+1]=d[j+1]+a; o[j+2]=d[j+2]+a; o[j+3]=255; } LV.push(fromData(N,o)); }
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      blend(c,LV,E.inOut(seg(u,.6,1.4))*(1-E.inOut(seg(u,3.35,3.95))));
    };
  } },

/* HSL BANDS. Flat, cut-paper colour: a studio patch bay with its cords. Band: Blue at its defaults (Hue +45, Saturation +40),
   every flat colour and shade through the kernel's own sums: the deep blue cords sit in the middle of the band and turn violet,
   the paler blue sits near its edge and moves about half as far, and red, orange, yellow, green, black and white do not move.
   On threes. */
{ id:'hslbands', name:'HSL Bands', section:'Colouring', isNew:true, still:2.3,
  line:'Only one colour band is retuned, here the blues; every other colour stays exactly as it was.',
  make(px){
    const P=4.2, key=[0,0,0];
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*8)/8; reset(c,px);
      const k=u<.6?0:u<3.1?E.out(seg(u,.6,1.4)):1-E.inOut(seg(u,3.1,3.6));
      patchBay(c,k);
      bandMap([42,60,192],k,key); c.fillStyle='#0f0e0d'; c.fillRect(6,3,38.6,7.4); c.fillStyle=css(key); c.fillRect(7.4,4.4,4.6,4.6);
      c.font=MONO(4.2); c.fillStyle=BONE; c.textAlign='left'; c.textBaseline='middle'; c.fillText('BLUE  +'+String(Math.round(45*k)).padStart(2,'0')+'°',14,6.9);
    };
  } },

/* HSL MIXER. Viewer overlay: a faded wool tartan, woven here thread by thread, and the mixer's eight Saturation faders.
   Green +80, then Blue +80, then Orange -70, through the kernel's own 361-step tables (each fader reaches to its neighbours'
   colours and fades out there, weighted by each thread's own saturation): the green and the navy come back up one after
   the other, the rust goes dull; black and cream do not move. */
{ id:'hslmixer', name:'HSL Mixer', section:'Colouring', isNew:true, still:3.0,
  line:'Each of eight colours gets its own fader: here the green and the blue get richer and the orange gets duller, one at a time.',
  make(px){
    const P=4.8, N=Math.min(px,360), H=Math.ceil(N*.8)+1, d=new Uint8ClampedArray(N*N*4); tartan(d,N,H);
    const vals=new Array(24).fill(0), SET=[[8+3,.8],[8+5,.8],[8+1,-.7]], STEPS=3, LV=[fromData(N,d)], o=new Uint8ClampedArray(d.length);
    for(let s=0;s<3;s++) for(let q=1;q<=STEPS;q++){ vals[SET[s][0]]=SET[s][1]*q/STEPS; hmApply(d,o,hmTables(vals)); LV.push(fromData(N,o)); }
    const STAGE=[[.55,1.15],[1.4,2.0],[2.25,2.85]], val=new Array(8).fill(0);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      let p=0; for(let s=0;s<3;s++) p+=E.inOut(seg(u,STAGE[s][0],STAGE[s][1]));
      const back=E.inOut(seg(u,3.7,4.25));
      if(back>0){ c.drawImage(LV[LV.length-1],0,0,100,100); c.globalAlpha=back; c.drawImage(LV[0],0,0,100,100); c.globalAlpha=1; }
      else { const q=p*STEPS, i=Math.min(LV.length-2,Math.floor(q)), f=q-i; c.drawImage(LV[i],0,0,100,100); if(f>.004){ c.globalAlpha=f; c.drawImage(LV[i+1],0,0,100,100); c.globalAlpha=1; } }
      val.fill(0); val[3]=.8*clamp(p)*(1-back); val[5]=.8*clamp(p-1)*(1-back); val[1]=-.7*clamp(p-2)*(1-back);
      faders(c,val,'SAT');
    };
  } },

/* HUE SHIFT. Graded still: pool balls on the cloth, from above. The CSS hue-rotate matrix the app uses, on every pixel:
   90 (the default), 180, 270, held and cut. Every colour turns by the same angle, the cloth with it; the cue ball, the
   black and the white number discs have no hue and stay as they are. */
{ id:'hue', name:'Hue Shift', section:'Colouring', isNew:true, still:1.3,
  line:'Every colour in the picture turns round the colour wheel by the same angle; whites, greys and blacks stay put.',
  make(px){
    const P=3.6, N=Math.min(px,600), [S,sx]=unitSheet(N); paintBalls(sx);
    sx.setTransform(1,0,0,1,0,0); const d=sx.getImageData(0,0,N,N).data; grain(d,4,5);
    const FR=[fromData(N,d)];
    for(const deg of [90,180,270]){ const m=e1HueM(deg), o=new Uint8ClampedArray(d.length); for(let i=0;i<d.length;i+=4){ const r=d[i], g=d[i+1], b=d[i+2]; o[i]=m[0]*r+m[1]*g+m[2]*b; o[i+1]=m[3]*r+m[4]*g+m[5]*b; o[i+2]=m[6]*r+m[7]*g+m[8]*b; o[i+3]=255; } FR.push(fromData(N,o)); }
    return (c,t)=>{
      const u=mod(t,P), k=Math.min(3,Math.floor(u/.9)); reset(c,px);
      c.drawImage(FR[k],0,0,100,100);
      c.fillStyle='rgba(12,12,13,.82)'; c.fillRect(39,3,30.5,8);
      c.font=MONO(4.8); c.textAlign='left'; c.textBaseline='middle'; c.fillStyle=TEXT; c.fillText('HUE',41,7.3);
      c.fillStyle=k?TEXT:'#8e8e92'; c.fillText(String(k*90).padStart(3,'0')+'°',53.5,7.3);
    };
  } },

/* OIL SLICK. A crumpled silk scarf in black and white, so every colour you see is the effect's; its rolled hem and fringe make it a
   scarf rather than a swatch of satin (Glitter is satin). PIXEL_FX.iridescence at its defaults (Amount .7, Bands 3, Scale 100,
   Motion 25%): hue = luma x 3 + (x+y)/120 px + .25 sin(t pi/2), laid over the luma at .7. Motion's own 4 s swing is the loop.
   Tried and dropped: pipes, a puddle, foil, marbled paper and a sea surface. Wherever a picture is flat this effect is mostly its
   diagonal (x+y) stripes, which read as garish; deep folds are what bend the bands into a sheen, so folded cloth is the honest subject. */
{ id:'iridescence', name:'Oil Slick', section:'Colouring', isNew:true, still:1.9,
  line:'A rainbow sheen, like oil on water, follows the light and dark of the picture and slowly slides across it.',
  make(px){
    const P=4, N=Math.min(px,320), U=100/N, L=new Float32Array(N*N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ let s=0; for(const [ox,oy] of [[.25,.25],[.75,.25],[.25,.75],[.75,.75]]) s+=silkL((x+ox)*U,(y+oy)*U); L[y*N+x]=s/4; }
    const src=new Uint8ClampedArray(N*N*4); for(let i=0;i<N*N;i++){ const v=L[i]*255; src[i*4]=v; src[i*4+1]=v*.995; src[i*4+2]=v*.985; src[i*4+3]=255; }
    const BASE=fromData(N,src), AMT=.7, BANDS=3, SC=120, K=13, FR=[];
    for(let f=0;f<K;f++){ const ph=-.25+.5*f/(K-1), o=new Uint8ClampedArray(src.length);
      for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const i=y*N+x, j=i*4, l=(.299*src[j]+.587*src[j+1]+.114*src[j+2])/255;
        let h=l*BANDS+((x+.5)*U*10.8+(y+.5)*U*10.8)/SC+ph; h-=Math.floor(h); const h6=h*6;
        const cr=clamp(Math.abs(h6-3)-1), cg=clamp(2-Math.abs(h6-2)), cb=clamp(2-Math.abs(h6-4));
        o[j]=src[j]+(cr*l*255-src[j])*AMT; o[j+1]=src[j+1]+(cg*l*255-src[j+1])*AMT; o[j+2]=src[j+2]+(cb*l*255-src[j+2])*AMT; o[j+3]=255; }
      FR.push(fromData(N,o)); }
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const on=E.inOut(seg(u,.45,1.0))*(1-E.inOut(seg(u,3.3,3.85)));
      c.drawImage(BASE,0,0,100,100);
      if(on>.004){ const ph=.25*Math.sin(u*Math.PI/2), q=(ph+.25)/.5*(K-1), i=Math.min(K-2,Math.floor(q)), f=q-i;
        c.globalAlpha=on; c.drawImage(FR[i],0,0,100,100); if(f>.004){ c.globalAlpha=on*f; c.drawImage(FR[i+1],0,0,100,100); } c.globalAlpha=1; }
    };
  } },

/* LEVELS. Pen plotter: a faded scan of a lens drawing, and under it the scan's own histogram, plotted. Input black slides
   0 to 96 and input white 255 to 176 (gamma 1, output 0..255) through levelsFill's own table, so the grey paper goes white
   and the grey ink goes black; the red hatching is what each point clips. */
{ id:'levels', name:'Levels', section:'Colouring', isNew:true, still:2.4,
  line:'Sets where black and white really fall: pull the two points in and a flat, faded picture gets its full range back.',
  make(px){
    const P=4.6, N=Math.min(px,480), X0=4, Y0=3.5, SW=92, SH=71;
    const [D,dx]=unitSheet(N); paintLens(dx); dx.setTransform(1,0,0,1,0,0); const d=dx.getImageData(0,0,N,N).data, r=rng(12);
    const src=new Uint8ClampedArray(d.length), hist=new Float32Array(64);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const j=(y*N+x)*4, a=d[j]/255, fade=1-.05*(x/N)-.04*(y/N), n=(r()+r()-1)*5;
      const pr=176*fade, pg=173*fade, pb=166*fade, ir=101, ig=98, ib=94;
      src[j]=ir+(pr-ir)*a+n; src[j+1]=ig+(pg-ig)*a+n; src[j+2]=ib+(pb-ib)*a+n; src[j+3]=255;
      const X=x*100/N, Y=y*100/N; if(X>=X0&&X<X0+SW&&Y>=Y0&&Y<Y0+SH) hist[Math.min(63,(.299*src[j]+.587*src[j+1]+.114*src[j+2])/4|0)]++; }
    let hm=0; for(let i=0;i<64;i++) hm=Math.max(hm,hist[i]);
    const lut=(inB,inW)=>{ const L=new Uint8Array(256), span=(inW-inB)>=1?inW-inB:1; for(let v=0;v<256;v++){ let n=(v-inB)/span; n=n<=0?0:n>=1?1:n; L[v]=Math.round(n*255); } return L; };
    const STEPS=6, LV=[];
    for(let s=0;s<=STEPS;s++){ const k=s/STEPS, T=lut(96*k,255-79*k), o=new Uint8ClampedArray(src.length); for(let i=0;i<src.length;i+=4){ o[i]=T[src[i]]; o[i+1]=T[src[i+1]]; o[i+2]=T[src[i+2]]; o[i+3]=255; } LV.push(fromData(N,o)); }
    const hx=v=>12+v/255*76, BY=89.6;
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const k=u<.6?0:u<3.7?settle(seg(u,.6,1.6)):1-E.inOut(seg(u,3.7,4.3)), inB=96*k, inW=255-79*k;
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      c.fillStyle='rgba(22,19,15,.28)'; c.fillRect(X0+.8,Y0+.9,SW,SH);
      c.save(); c.beginPath(); c.rect(X0,Y0,SW,SH); c.clip(); blend(c,LV,k); c.restore();
      c.strokeStyle=INK; c.lineWidth=.5; c.lineCap='butt'; c.beginPath();
      for(let b=0;b<64;b++){ const h=Math.sqrt(hist[b]/hm)*9.6; if(h<.15) continue; const x=hx(b*4+2); c.moveTo(x,BY); c.lineTo(x,BY-h); }
      c.stroke();
      c.strokeStyle=VERM; c.lineWidth=.45; c.beginPath();
      const hatch=(a,b)=>{ for(let x=a-12;x<b;x+=1.6){ const x0=Math.max(a,x), x1=Math.min(b,x+10); if(x1<=x0) continue; c.moveTo(x0,BY-(x0-x)); c.lineTo(x1,BY-(x1-x)); } };
      if(inB>1) hatch(hx(0),hx(inB)); if(inW<254) hatch(hx(inW),hx(255));
      c.stroke();
      c.strokeStyle=INK; c.lineWidth=.5; c.beginPath(); c.moveTo(hx(0),BY+.2); c.lineTo(hx(255),BY+.2); c.stroke();
      const tri=(x,fill)=>{ c.beginPath(); c.moveTo(x,BY+1.2); c.lineTo(x+2,BY+4.6); c.lineTo(x-2,BY+4.6); c.closePath(); c.fillStyle=fill; c.fill(); c.stroke(); };
      tri(hx(inB),INK); tri(hx((inB+inW)/2),'#8d877a'); tri(hx(inW),'#f6f3ea');
      c.fillStyle=INK; c.beginPath(); c.arc(hx(0),BY+.2,.6,0,TAU); c.fill();
      c.font=MONO(3.6); c.textBaseline='alphabetic'; c.textAlign='center'; c.fillStyle=INK;
      c.fillText(String(Math.round(inB)),hx(inB),BY+8.6); c.fillText(String(Math.round(inW)),hx(inW),BY+8.6);
    };
  } }

);
})();
