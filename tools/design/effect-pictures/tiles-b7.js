/* Batch 7: 3D, Text and Opacity / Visibility pictures. */
(function(){
'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;
const PI=Math.PI;
const mk=(w,h)=>{ const C=document.createElement('canvas'); C.width=Math.max(1,Math.round(w)); C.height=Math.max(1,Math.round(h)); return [C,C.getContext('2d')]; };
const sstep=(a,b,x)=>{ const p=clamp((x-a)/(b-a)); return p*p*(3-2*p); };
const backOut=p=>{ const s=1.70158, q=p-1; return q*q*((s+1)*q+s)+1; };
const mix=(a,b,p)=>[lerp(a[0],b[0],p),lerp(a[1],b[1],p),lerp(a[2],b[2],p)];
const reset=c=>{ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.shadowBlur=0; c.shadowOffsetX=0; c.shadowOffsetY=0; c.shadowColor='rgba(0,0,0,0)'; c.imageSmoothingEnabled=true; };
function noise3(seed){
  const r=rng(seed), V=new Float32Array(256), T=new Uint8Array(512), a=[];
  for(let i=0;i<256;i++) a.push(i);
  for(let i=255;i>0;i--){ const j=Math.floor(r()*(i+1)), k=a[i]; a[i]=a[j]; a[j]=k; }
  for(let i=0;i<512;i++) T[i]=a[i&255];
  for(let i=0;i<256;i++) V[i]=r()*2-1;
  return (x,y,z)=>{
    const xi=Math.floor(x), yi=Math.floor(y), zi=Math.floor(z);
    let fx=x-xi, fy=y-yi, fz=z-zi;
    fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy); fz=fz*fz*(3-2*fz);
    const X=xi&255, Y=yi&255, Z=zi&255;
    const A=T[X]+Y, B=T[X+1]+Y, AA=T[A]+Z, AB=T[A+1]+Z, BA=T[B]+Z, BB=T[B+1]+Z;
    const c0=lerp(V[T[AA]],V[T[BA]],fx), c1=lerp(V[T[AB]],V[T[BB]],fx), c2=lerp(V[T[AA+1]],V[T[BA+1]],fx), c3=lerp(V[T[AB+1]],V[T[BB+1]],fx);
    return lerp(lerp(c0,c1,fy),lerp(c2,c3,fy),fz);
  };
}
const fbm=(f,x,y,z,o)=>{ let s=0,a=1,w=0; for(let i=0;i<o;i++){ s+=a*f(x,y,z); w+=a; a*=0.5; x=x*2.03+11.3; y=y*2.03+7.1; z=z*2.03+3.7; } return s/w; };

window.FX_TILES.push(

{ id:'sphere3d', name:'Spherize', section:'3D', isNew:true, still:1.2,
  line:'A flat map wrapped round a globe that turns in the light.',
  make(px){
    const P=5, sc=px/100, R=41, CX=50, CY=50, tilt=-0.36, ct=Math.cos(tilt), st=Math.sin(tilt);
    const TW=Math.min(720,Math.round(px*1.3))&~1, TH=TW>>1;
    const n=noise3(41), m=noise3(97), cn=noise3(13);
    const [T,tx]=mk(TW*2,TH);
    const im=tx.createImageData(TW,TH), d=im.data;
    const DEEP=[10,38,128], MID=[20,104,205], SHAL=[64,205,216], GREEN=[104,186,84], FOREST=[42,134,74], SAND=[236,204,132], ROCK=[166,146,116], ICE=[242,248,252], CLOUD=[255,255,255];
    let q=0;
    for(let j=0;j<TH;j++){
      const la=(0.5-(j+0.5)/TH)*PI, sl=Math.sin(la), cl=Math.cos(la), al=Math.abs(la);
      for(let i=0;i<TW;i++){
        const lo=(i+0.5)/TW*TAU, x=cl*Math.cos(lo), y=sl, z=cl*Math.sin(lo);
        const h=fbm(n,x*1.55+3.1,y*1.55+1.2,z*1.55+7.7,5);
        let col;
        if(h<0.03){ const k=clamp((0.03-h)/0.34); col=k<0.22?mix(SHAL,MID,k/0.22):mix(MID,DEEP,(k-0.22)/0.78); }
        else {
          const e=clamp((h-0.03)/0.36), wet=fbm(m,x*2.2,y*2.2,z*2.2,3)*0.9+0.5;
          const belt=Math.exp(-Math.pow((al-0.42)/0.26,2));
          col=mix(GREEN,FOREST,clamp(wet));
          col=mix(col,SAND,clamp((0.5-wet)*3)*belt);
          col=mix(col,ROCK,sstep(0.72,1.05,e));
        }
        col=mix(col,ICE,sstep(1.12,1.28,al+0.16*n(x*4,y*4,z*4)));
        const cv=fbm(cn,x*2.6+1,y*4.2+2,z*2.6+3,5);
        col=mix(col,CLOUD,sstep(0.13,0.44,cv)*0.86);
        d[q++]=col[0]; d[q++]=col[1]; d[q++]=col[2]; d[q++]=255;
      }
    }
    tx.putImageData(im,0,0); tx.putImageData(im,TW,0);
    /* a grid fixed to the screen: each cell is one sheared piece of the map, only its source slides */
    const NLo=30, NLa=22, cells=[], dLo=PI/NLo, dLa=PI/NLa, ov=0.8;
    const S3=(lo,la)=>[R*Math.cos(la)*Math.sin(lo), -R*Math.sin(la)];
    for(let i=0;i<NLo;i++) for(let j=0;j<NLa;j++){
      const lo0=-PI/2+i*dLo, lo1=lo0+dLo, la0=PI/2-j*dLa, la1=la0-dLa;
      const A=S3(lo0,la0), B=S3(lo1,la0), C=S3(lo1,la1), D=S3(lo0,la1);
      const ux=(B[0]-A[0]+C[0]-D[0])/2, uy=(B[1]-A[1]+C[1]-D[1])/2, vx=(D[0]-A[0]+C[0]-B[0])/2, vy=(D[1]-A[1]+C[1]-B[1])/2;
      const mx=(A[0]+B[0]+C[0]+D[0])/4, my=(A[1]+B[1]+C[1]+D[1])/4, ox=mx-ux/2-vx/2, oy=my-uy/2-vy/2;
      const sw=dLo/TAU*TW, sh=dLa/PI*TH, sy=(PI/2-la0)/PI*TH;
      const a=ux/sw, b=uy/sw, cc=vx/sh, dd=vy/sh;
      const sy0=Math.max(0,sy-ov), h0=Math.min(TH-sy0,sh+ov*2);
      cells.push({u:lo0/TAU,sy0,h0,w:sw+ov*2,dy:sy0-sy,
        a:(ct*a-st*b)*sc,b:(st*a+ct*b)*sc,c:(ct*cc-st*dd)*sc,d:(st*cc+ct*dd)*sc,
        e:(CX+ct*ox-st*oy)*sc,f:(CY+st*ox+ct*oy)*sc});
    }
    const base=tx.createLinearGradient((CX+st*R)*sc,(CY-ct*R)*sc,(CX-st*R)*sc,(CY+ct*R)*sc);
    base.addColorStop(0,'#f2f8fc'); base.addColorStop(0.1,'#1a68c8'); base.addColorStop(0.9,'#1a68c8'); base.addColorStop(1,'#f2f8fc');
    const [BG,b]=canvasOf(px);
    let g=b.createRadialGradient(34,30,4,50,50,92); g.addColorStop(0,'#131f4a'); g.addColorStop(0.55,'#090d26'); g.addColorStop(1,'#03040c'); b.fillStyle=g; b.fillRect(0,0,100,100);
    const sr=rng(19);
    for(let i=0;i<9;i++) for(let j=0;j<9;j++){
      const x=(i+sr())*100/9, y=(j+sr())*100/9, s=0.14+sr()*sr()*0.42, a=0.35+sr()*0.6;
      b.fillStyle='rgba(225,235,255,'+a+')'; b.beginPath(); b.arc(x,y,s,0,TAU); b.fill();
    }
    g=b.createRadialGradient(CX-1.4,CY-1.6,R*0.94,CX-1.4,CY-1.6,R*1.24); g.addColorStop(0,'rgba(92,176,255,0.85)'); g.addColorStop(0.4,'rgba(60,130,255,0.26)'); g.addColorStop(1,'rgba(40,90,255,0)'); b.fillStyle=g; b.beginPath(); b.arc(CX,CY,R*1.3,0,TAU); b.fill();
    const [L,l]=canvasOf(px);
    l.save(); l.beginPath(); l.arc(CX,CY,R+0.05,0,TAU); l.clip();
    g=l.createRadialGradient(CX,CY,R*0.78,CX,CY,R); g.addColorStop(0,'rgba(130,200,255,0)'); g.addColorStop(0.8,'rgba(130,200,255,0.22)'); g.addColorStop(1,'rgba(175,225,255,0.72)'); l.fillStyle=g; l.fillRect(0,0,100,100);
    g=l.createRadialGradient(CX-17,CY-19,2,CX-17,CY-19,R*1.72); g.addColorStop(0,'rgba(255,255,255,0.12)'); g.addColorStop(0.3,'rgba(0,0,0,0)'); g.addColorStop(0.6,'rgba(2,6,34,0.34)'); g.addColorStop(0.82,'rgba(2,5,28,0.82)'); g.addColorStop(1,'rgba(1,3,18,0.97)'); l.fillStyle=g; l.fillRect(0,0,100,100);
    l.globalCompositeOperation='screen'; g=l.createRadialGradient(CX-16,CY-18,0,CX-16,CY-18,15); g.addColorStop(0,'rgba(255,250,235,0.55)'); g.addColorStop(0.4,'rgba(255,245,225,0.16)'); g.addColorStop(1,'rgba(255,245,225,0)'); l.fillStyle=g; l.fillRect(0,0,100,100);
    l.restore();
    return (c,t)=>{
      const u=(t%P)/P;
      c.save(); reset(c);
      c.drawImage(BG,0,0);
      c.save();
      c.beginPath(); c.arc(CX*sc,CY*sc,R*sc,0,TAU); c.clip();
      c.fillStyle=base; c.fillRect(0,0,px,px);
      for(let i=0;i<cells.length;i++){
        const k=cells[i]; let s=k.u-u; s-=Math.floor(s);
        let sx=s*TW; if(sx<2) sx+=TW;
        c.setTransform(k.a,k.b,k.c,k.d,k.e,k.f);
        c.drawImage(T,sx-ov,k.sy0,k.w,k.h0,-ov,k.dy,k.w,k.h0);
      }
      c.restore();
      c.setTransform(1,0,0,1,0,0);
      c.drawImage(L,0,0);
      c.restore();
    };
  }},

{ id:'fliplayer', name:'Card Flip', section:'3D', isNew:true, still:1.0,
  line:'A playing card swings over in perspective to show its back.',
  make(px){
    const P=4.2, sc=px/100, CW=58, CH=82, BL=3, hw=CW/2, hh=CH/2, CX=50, CY=48.5, D=190, TS=sc*1.2;
    const heart=(x,cx,cy,s)=>{ x.beginPath(); x.moveTo(cx,cy+0.92*s); x.bezierCurveTo(cx-0.22*s,cy+0.6*s,cx-s,cy+0.16*s,cx-s,cy-0.34*s); x.bezierCurveTo(cx-s,cy-0.74*s,cx-0.68*s,cy-0.98*s,cx-0.42*s,cy-0.98*s); x.bezierCurveTo(cx-0.2*s,cy-0.98*s,cx-0.06*s,cy-0.84*s,cx,cy-0.6*s); x.bezierCurveTo(cx+0.06*s,cy-0.84*s,cx+0.2*s,cy-0.98*s,cx+0.42*s,cy-0.98*s); x.bezierCurveTo(cx+0.68*s,cy-0.98*s,cx+s,cy-0.74*s,cx+s,cy-0.34*s); x.bezierCurveTo(cx+s,cy+0.16*s,cx+0.22*s,cy+0.6*s,cx,cy+0.92*s); x.closePath(); };
    const [F,f]=mk((CW+2*BL)*TS,(CH+2*BL)*TS); f.setTransform(TS,0,0,TS,BL*TS,BL*TS);
    let g=f.createLinearGradient(0,0,CW,CH); g.addColorStop(0,'#fffef9'); g.addColorStop(1,'#f1e9d8'); f.fillStyle=g; f.fillRect(-BL,-BL,CW+2*BL,CH+2*BL);
    f.strokeStyle='rgba(205,40,75,0.3)'; f.lineWidth=0.5; f.beginPath(); f.roundRect(3,3,CW-6,CH-6,3.2); f.stroke();
    const RED='#d81e4a';
    const index=()=>{ f.fillStyle=RED; f.font='800 15px system-ui, sans-serif'; f.textAlign='center'; f.textBaseline='alphabetic'; f.fillText('A',9.6,17); heart(f,9.6,23.4,4.4); f.fill(); };
    index();
    f.save(); f.translate(CW,CH); f.rotate(PI); index(); f.restore();
    g=f.createLinearGradient(0,24,0,66); g.addColorStop(0,'#ff4b6e'); g.addColorStop(1,'#bd0f3c');
    f.save(); f.shadowColor='rgba(120,10,40,0.45)'; f.shadowBlur=2.6*TS; f.shadowOffsetY=1.2*TS; f.fillStyle=g; heart(f,29,44,19.5); f.fill(); f.restore();
    f.save(); heart(f,29,44,19.5); f.clip();
    g=f.createRadialGradient(20,33,1,20,33,16); g.addColorStop(0,'rgba(255,255,255,0.62)'); g.addColorStop(0.55,'rgba(255,255,255,0.12)'); g.addColorStop(1,'rgba(255,255,255,0)'); f.fillStyle=g; f.fillRect(0,0,CW,CH);
    f.restore();
    const [Bk,b]=mk((CW+2*BL)*TS,(CH+2*BL)*TS); b.setTransform(TS,0,0,TS,BL*TS,BL*TS);
    g=b.createLinearGradient(0,0,CW,CH); g.addColorStop(0,'#2148ad'); g.addColorStop(1,'#0e1f5e'); b.fillStyle=g; b.fillRect(-BL,-BL,CW+2*BL,CH+2*BL);
    b.strokeStyle='#e9c46a'; b.lineWidth=0.9; b.beginPath(); b.roundRect(3.4,3.4,CW-6.8,CH-6.8,3); b.stroke();
    b.save(); b.beginPath(); b.roundRect(5.6,5.6,CW-11.2,CH-11.2,2); b.clip();
    b.strokeStyle='rgba(233,196,106,0.6)'; b.lineWidth=0.55;
    for(let k=-90;k<160;k+=7){ b.beginPath(); b.moveTo(k,0); b.lineTo(k+CH,CH); b.moveTo(k+CH,0); b.lineTo(k,CH); b.stroke(); }
    b.restore();
    const mx=CW/2, my=CH/2;
    b.fillStyle='#10245f'; b.beginPath(); b.arc(mx,my,15.5,0,TAU); b.fill();
    b.strokeStyle='#e9c46a'; b.lineWidth=1.2; b.beginPath(); b.arc(mx,my,15.5,0,TAU); b.stroke();
    b.lineWidth=0.5; b.beginPath(); b.arc(mx,my,13.4,0,TAU); b.stroke();
    g=b.createLinearGradient(mx-11,my-11,mx+11,my+11); g.addColorStop(0,'#fff0bd'); g.addColorStop(1,'#d59a2b'); b.fillStyle=g;
    b.beginPath(); for(let i=0;i<16;i++){ const a=-PI/2+i*TAU/16, r=i%2?4.6:11.4; if(i) b.lineTo(mx+Math.cos(a)*r,my+Math.sin(a)*r); else b.moveTo(mx+Math.cos(a)*r,my+Math.sin(a)*r); } b.closePath(); b.fill();
    const [BG,bg]=canvasOf(px);
    g=bg.createRadialGradient(50,40,6,50,50,82); g.addColorStop(0,'#27a06c'); g.addColorStop(0.6,'#0f6a47'); g.addColorStop(1,'#063524'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    const nr=rng(4); for(let i=0;i<1500;i++){ bg.fillStyle=nr()<0.5?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.07)'; bg.fillRect(nr()*100,nr()*100,0.5,0.5); }
    const shadow=bg.createRadialGradient(0,0,0,0,0,1); shadow.addColorStop(0,'rgba(0,14,8,0.62)'); shadow.addColorStop(0.65,'rgba(0,14,8,0.36)'); shadow.addColorStop(1,'rgba(0,14,8,0)');
    const pts=[], r0=4.2;
    const arc=(ax,ay,a0)=>{ for(let k=0;k<=6;k++){ const a=a0+k/6*PI/2; pts.push([ax+Math.cos(a)*r0,ay+Math.sin(a)*r0]); } };
    arc(hw-r0,-hh+r0,-PI/2); arc(hw-r0,hh-r0,0); arc(-hw+r0,hh-r0,PI/2); arc(-hw+r0,-hh+r0,PI);
    const N=56, dx=CW/N, tw=CW*TS/N, th0=(CH+2*BL)*TS;
    return (c,t)=>{
      const u=t%P;
      const f1=E.inOut(seg(u,0.55,1.5)), f2=E.inOut(seg(u,2.6,3.55));
      const th=-0.46+(f1+f2)*PI+0.09*Math.sin(u/P*TAU*2);
      const co=Math.cos(th), si=Math.sin(th), front=co>0, tex=front?F:Bk;
      const cy=CY-2.2*(Math.sin(f1*PI)+Math.sin(f2*PI));
      c.save(); reset(c);
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      c.save(); c.translate(CX+2,92.5); c.scale(Math.abs(co)*30+6,4.6); c.fillStyle=shadow; c.beginPath(); c.arc(0,0,1,0,TAU); c.fill(); c.restore();
      c.beginPath();
      for(let i=0;i<pts.length;i++){ const s=D/(D+pts[i][0]*si), X=CX+pts[i][0]*co*s, Y=cy+pts[i][1]*s; if(i) c.lineTo(X,Y); else c.moveTo(X,Y); }
      c.closePath();
      c.save(); c.clip();
      c.setTransform(1,0,0,1,0,0);
      for(let i=0;i<N;i++){
        const a=-hw+i*dx, e=a+dx, sa=D/(D+a*si), sb=D/(D+e*si), xa=CX+a*co*sa, xb=CX+e*co*sb, sm=(sa+sb)/2, h=(CH+2*BL)*sm;
        const si2=front?i:N-1-i, x0=Math.min(xa,xb), w=Math.abs(xb-xa);
        c.drawImage(tex,BL*TS+si2*tw,0,tw,th0,x0*sc,(cy-h/2)*sc,w*sc+1,h*sc);
      }
      c.setTransform(sc,0,0,sc,0,0);
      const sL=D/(D-hw*si), sR=D/(D+hw*si), xL=CX-hw*co*sL, xR=CX+hw*co*sR, flat=1-Math.abs(co);
      const dA=clamp(-si)*0.42+flat*0.2, dB=clamp(si)*0.42+flat*0.2;
      let g2=c.createLinearGradient(xL,0,xR,0); g2.addColorStop(0,'rgba(8,10,30,'+dA+')'); g2.addColorStop(1,'rgba(8,10,30,'+dB+')'); c.fillStyle=g2; c.fillRect(0,0,100,100);
      const fr=((th+0.46)/PI)%1, pow=Math.sin(fr*PI);
      if(pow>0.02){ const sx=lerp(-10,110,fr); g2=c.createLinearGradient(sx-16,0,sx+16,8); g2.addColorStop(0,'rgba(255,255,255,0)'); g2.addColorStop(0.5,'rgba(255,255,255,'+(0.5*pow)+')'); g2.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=g2; c.fillRect(0,0,100,100); }
      c.restore();
      c.strokeStyle=front?'rgba(255,255,255,0.85)':'rgba(246,216,140,0.9)'; c.lineWidth=0.55; c.lineJoin='round'; c.stroke();
      c.restore();
    };
  }},

{ id:'counter', name:'Number Roll', section:'Text', isNew:true, still:3.05,
  line:'The reels race up from nothing and ease to a stop on 100.',
  make(px){
    const P=4.6, sc=px/100, RW=26.8, RH=70, YR=15, X0=[8.5,36.6,64.7];
    function dp(x,d){
      x.beginPath();
      switch(d){
        case 0: x.moveTo(0,10); x.arc(10,10,10,PI,0); x.lineTo(20,38); x.arc(10,38,10,0,PI); x.closePath(); break;
        case 1: x.moveTo(3.5,9); x.lineTo(12.5,0); x.lineTo(12.5,48); break;
        case 2: x.arc(10,11,10,PI,PI*2.25); x.lineTo(0,48); x.lineTo(20,48); break;
        case 3: x.arc(10,11,10,PI*1.12,PI*2.5); x.ellipse(10,35,10,13,0,-PI/2,PI*0.86); break;
        case 4: x.moveTo(15,48); x.lineTo(15,0); x.lineTo(0,33); x.lineTo(20,33); break;
        case 5: x.moveTo(18,0); x.lineTo(3,0); x.lineTo(1.5,19); x.ellipse(9.5,33,10.5,15,0,-PI*0.75,PI*0.85); break;
        case 6: x.moveTo(15,0); x.bezierCurveTo(6,8,0,22,0,35); x.ellipse(10,35,10,13,0,PI,PI+TAU); break;
        case 7: x.moveTo(0,0); x.lineTo(20,0); x.lineTo(6,48); break;
        case 8: x.ellipse(10,11,9,11,0,0,TAU); x.closePath(); x.moveTo(20,35); x.ellipse(10,35,10,13,0,0,TAU); x.closePath(); break;
        case 9: x.save(); x.translate(20,48); x.scale(-1,-1); x.moveTo(15,0); x.bezierCurveTo(6,8,0,22,0,35); x.ellipse(10,35,10,13,0,PI,PI+TAU); x.restore(); break;
      }
    }
    const dig=[], FX=0.78, FY=1.05;
    for(let d=0;d<10;d++){
      const [C,x]=mk(RW*sc,RH*sc); x.setTransform(sc,0,0,sc,0,0);
      const g=x.createLinearGradient(0,0,RW,0); g.addColorStop(0,'#f2e4c4'); g.addColorStop(0.5,'#fff9ea'); g.addColorStop(1,'#efdfbc'); x.fillStyle=g; x.fillRect(0,0,RW,RH);
      x.save(); x.translate(RW/2-10*FX,RH/2-24*FY); x.scale(FX,FY); dp(x,d); x.restore();
      x.strokeStyle='#172452'; x.lineWidth=6.2; x.lineCap='round'; x.lineJoin='round'; x.stroke();
      dig.push(C);
    }
    /* every digit averaged over the whole reel: what a reel looks like when it is spinning too fast to read */
    const [MN,mn]=mk(RW*sc,RH*sc);
    let nm=0; for(let d=0;d<10;d++) for(let s=0;s<6;s++){ nm++; mn.globalAlpha=1/nm; const off=s/6*RH*sc; mn.drawImage(dig[d],0,-off); mn.drawImage(dig[(d+1)%10],0,RH*sc-off); }
    mn.globalAlpha=1;
    const [BG,bg]=canvasOf(px);
    let g=bg.createRadialGradient(50,50,8,50,50,78); g.addColorStop(0,'#a81a44'); g.addColorStop(0.65,'#5a0c28'); g.addColorStop(1,'#25040f'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    const [RY,ry]=canvasOf(px);
    ry.translate(50,50);
    for(let i=0;i<12;i++){ const a=i*TAU/12; ry.fillStyle='rgba(255,214,120,0.17)'; ry.beginPath(); ry.moveTo(0,0); ry.lineTo(Math.cos(a-0.13)*90,Math.sin(a-0.13)*90); ry.lineTo(Math.cos(a+0.13)*90,Math.sin(a+0.13)*90); ry.closePath(); ry.fill(); }
    const [BZ,bz]=canvasOf(px);
    g=bz.createLinearGradient(0,10,0,90); g.addColorStop(0,'#fff0bb'); g.addColorStop(0.3,'#e6ac36'); g.addColorStop(0.55,'#b87714'); g.addColorStop(0.75,'#f0c155'); g.addColorStop(1,'#a2650f');
    bz.save(); bz.shadowColor='rgba(0,0,0,0.55)'; bz.shadowBlur=2.6*sc; bz.shadowOffsetY=1*sc; bz.fillStyle=g; bz.beginPath(); bz.roundRect(3.5,10,93,80,8); bz.fill(); bz.restore();
    bz.fillStyle='#140a16'; bz.beginPath(); bz.roundRect(6.5,13,87,74,5.5); bz.fill();
    const [GL,gl]=canvasOf(px);
    X0.forEach(x=>{
      g=gl.createLinearGradient(0,YR,0,YR+RH); g.addColorStop(0,'rgba(10,6,16,0.78)'); g.addColorStop(0.2,'rgba(10,6,16,0.2)'); g.addColorStop(0.36,'rgba(10,6,16,0)'); g.addColorStop(0.66,'rgba(10,6,16,0)'); g.addColorStop(0.82,'rgba(10,6,16,0.24)'); g.addColorStop(1,'rgba(10,6,16,0.82)'); gl.fillStyle=g; gl.fillRect(x,YR,RW,RH);
      gl.fillStyle='rgba(255,255,255,0.28)'; gl.fillRect(x+2,YR+18,RW-4,1.1);
    });
    const [SP,sp]=canvasOf(120);
    sp.translate(50,50); sp.shadowColor='#ffd76a'; sp.shadowBlur=12; sp.fillStyle='#fffbe9';
    sp.beginPath(); sp.moveTo(0,-44); sp.quadraticCurveTo(3.5,-3.5,44,0); sp.quadraticCurveTo(3.5,3.5,0,44); sp.quadraticCurveTo(-3.5,3.5,-44,0); sp.quadraticCurveTo(-3.5,-3.5,0,-44); sp.closePath(); sp.fill();
    const STARS=[[9,11,8,0],[91,11,8,0.06],[9,89,6.5,0.12],[91,89,6.5,0.18],[50,7.5,6.5,0.09]];
    const carry=x=>x>9?sstep(0,1,x-9):0;
    const LAND=2.75;
    const vAt=u=>u<0.35?0:Math.min(100,100*E.out(seg(u,0.35,LAND)));
    function pos(k,u){
      if(u>=3.95) return k<2?0:1-E.inOut(seg(u,3.95,4.4));
      const v=vAt(u), o=v%10, c1=carry(o);
      if(k===0) return o;
      if(k===1) return Math.floor(v/10)%10+c1;
      return Math.floor(v/100)+((Math.floor(v/10)%10)===9?c1:0);
    }
    return (c,t)=>{
      const u=t%P;
      const fl=u<LAND?0:1-seg(u,LAND,3.6);
      c.save(); reset(c);
      c.drawImage(BG,0,0);
      c.save(); c.translate(px/2,px/2); c.rotate(u/P*TAU/12); c.globalAlpha=0.5+fl*0.5; c.translate(-px/2,-px/2); c.drawImage(RY,0,0); c.restore();
      c.drawImage(BZ,0,0);
      const W=RW*sc, H=RH*sc;
      for(let k=0;k<3;k++){
        /* k counts from the ones reel, which sits on the right */
        const x=X0[2-k]*sc, y0=YR*sc;
        c.save(); c.beginPath(); c.rect(x,y0,W,H); c.clip();
        let dp=pos(k,u)-pos(k,u-0.01); dp-=10*Math.round(dp/10);
        const speed=Math.abs(dp)/0.01, smear=sstep(9,34,speed), S=speed>1.5?8:1;
        if(smear<1){
          for(let s=0;s<S;s++){
            const p=pos(k,u-s*0.0035), f=p-Math.floor(p), d0=((Math.floor(p)%10)+10)%10, d1=(d0+1)%10;
            c.globalAlpha=1/(s+1);
            c.drawImage(dig[d0],x,y0-f*H,W,H); c.drawImage(dig[d1],x,y0-f*H+H,W,H);
          }
        }
        if(smear>0){ c.globalAlpha=smear; c.drawImage(MN,x,y0,W,H); }
        c.restore();
      }
      c.drawImage(GL,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      if(fl>0){
        const q=seg(u,LAND,LAND+0.55);
        if(q<1){ c.save(); c.beginPath(); c.rect(8.5,YR,83,RH); c.clip(); const xx=lerp(-30,130,q); const g2=c.createLinearGradient(xx-14,0,xx+14,10); g2.addColorStop(0,'rgba(255,255,255,0)'); g2.addColorStop(0.5,'rgba(255,255,255,0.7)'); g2.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=g2; c.fillRect(0,0,100,100); c.restore(); }
        STARS.forEach(([x,y,s,d])=>{ const k=seg(u,LAND+d,LAND+d+0.42), pop=Math.sin(k*PI); if(pop<=0) return; const z=s*(0.5+pop*0.9); c.globalAlpha=pop; c.drawImage(SP,x-z,y-z,2*z,2*z); });
        c.globalAlpha=1;
      }
      c.restore();
    };
  }},

{ id:'textrandomizer', name:'Scramble Text', section:'Text', isNew:true, still:1.55,
  line:'Random letters settle one at a time until the word is there.',
  make(px){
    const P=3.9, sc=px/100, WORD='CODE', POOL='ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&$@?';
    const CELL=23.2, X0=50-CELL*1.5, FS=37, SX=0.98, SY=1.5, BASE=0.365*FS;
    const FONT='800 '+FS+'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    const lockAt=[0.7,1.05,1.4,1.75], freeAt=[3.5,3.34,3.18,3.02];
    const SPW=40, SPH=78;
    const locked=[...WORD].map(ch=>{
      const [C,x]=mk(SPW*sc,SPH*sc); x.setTransform(sc,0,0,sc,SPW/2*sc,SPH/2*sc);
      x.save(); x.scale(SX,SY); x.font=FONT; x.textAlign='center'; x.textBaseline='alphabetic';
      x.shadowColor='#23ffae'; x.shadowBlur=7*sc; x.fillStyle='#d9fff0'; x.fillText(ch,0,BASE); x.fillText(ch,0,BASE);
      x.shadowBlur=0; x.fillStyle='#ffffff'; x.fillText(ch,0,BASE);
      x.restore();
      return C;
    });
    const [BG,bg]=canvasOf(px);
    let g=bg.createRadialGradient(50,50,6,50,50,76); g.addColorStop(0,'#0e3a30'); g.addColorStop(0.6,'#061c18'); g.addColorStop(1,'#020a08'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    bg.fillStyle='rgba(120,255,210,0.035)'; for(let y=0;y<100;y+=1.6) bg.fillRect(0,y,100,0.55);
    bg.strokeStyle='rgba(90,255,190,0.55)'; bg.lineWidth=0.9; bg.lineCap='round';
    [[3.5,3.5,1,1],[96.5,3.5,-1,1],[3.5,96.5,1,-1],[96.5,96.5,-1,-1]].forEach(([x,y,a,b])=>{ bg.beginPath(); bg.moveTo(x+a*5,y); bg.lineTo(x,y); bg.lineTo(x,y+b*5); bg.stroke(); });
    const [BM,bm]=canvasOf(px);
    g=bm.createLinearGradient(0,0,0,100); g.addColorStop(0,'rgba(60,255,180,0)'); g.addColorStop(0.5,'rgba(90,255,200,0.7)'); g.addColorStop(1,'rgba(60,255,180,0)'); bm.fillStyle=g; bm.fillRect(50-CELL/2,0,CELL,100);
    return (c,t)=>{
      const u=t%P, st=Math.floor(u*16);
      c.save(); reset(c);
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      c.font=FONT; c.textAlign='center'; c.textBaseline='alphabetic';
      for(let i=0;i<4;i++){
        const x=X0+i*CELL, isLocked=u>=lockAt[i]&&u<freeAt[i], age=isLocked?u-lockAt[i]:9;
        if(age<0.45){ c.globalAlpha=(1-age/0.45)*0.8; c.drawImage(BM,x-50,0,100,100); c.globalAlpha=1; }
        const pick=(row)=>POOL[Math.floor(hash(st+i*17+row*31,3+row)*POOL.length)];
        const fade=isLocked?1-seg(age,0,0.2):1;
        if(fade>0){
          c.fillStyle='#37e6a8';
          c.globalAlpha=0.34*fade;
          [-35.5,35.5].forEach((dy,r)=>{ c.save(); c.translate(x,50+dy); c.scale(SX*0.54,SY*0.54); c.fillText(pick(r+1),0,BASE); c.restore(); });
          c.globalAlpha=1;
        }
        if(isLocked){
          const z=1+0.18*(1-E.out(seg(age,0,0.28)));
          c.save(); c.translate(x,50); c.scale(z,z); c.drawImage(locked[i],-SPW/2,-SPH/2,SPW,SPH); c.restore();
        } else {
          const ch=pick(0);
          c.save(); c.globalCompositeOperation='lighter'; c.translate(x,50); c.scale(SX,SY);
          c.fillStyle='rgba(255,40,140,0.75)'; c.fillText(ch,0.9,BASE);
          c.fillStyle='rgba(30,230,170,0.95)'; c.fillText(ch,-0.5,BASE);
          c.restore();
        }
      }
      c.restore();
    };
  }},

{ id:'wordhighlight', name:'Word Highlight', section:'Text', isNew:true, still:1.45,
  line:'Each word lights up in turn, the way karaoke captions follow the singer.',
  make(px){
    const P=3.8, sc=px/100, WORDS=['SING','EVERY','WORD'], RY=[23.5,50,76.5];
    const [,mx]=mk(10,10); const FAM='system-ui, -apple-system, "Segoe UI", sans-serif';
    let FS=30; mx.font='800 '+FS+'px '+FAM;
    const widest=Math.max(...WORDS.map(w=>mx.measureText(w).width));
    FS=Math.min(30,FS*84/widest);
    const FONT='800 '+FS.toFixed(2)+'px '+FAM; mx.font=FONT;
    const W=WORDS.map(w=>mx.measureText(w).width);
    const [BG,bg]=canvasOf(px);
    let g=bg.createLinearGradient(0,0,0,100); g.addColorStop(0,'#3a1582'); g.addColorStop(0.6,'#1d0c4f'); g.addColorStop(1,'#0e0628'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    /* one spotlight straight down the middle, and the stage floor glowing under it */
    g=bg.createLinearGradient(0,0,0,100); g.addColorStop(0,'rgba(255,92,190,0.15)'); g.addColorStop(1,'rgba(255,92,190,0.012)'); bg.fillStyle=g;
    for(let k=0;k<5;k++){ const s=k*3.4; bg.beginPath(); bg.moveTo(35+s,-4); bg.lineTo(65-s,-4); bg.lineTo(112-s*3,104); bg.lineTo(-12+s*3,104); bg.closePath(); bg.fill(); }
    g=bg.createRadialGradient(50,104,4,50,104,62); g.addColorStop(0,'rgba(120,120,255,0.55)'); g.addColorStop(1,'rgba(120,120,255,0)'); bg.fillStyle=g; bg.fillRect(0,40,100,60);
    return (c,t)=>{
      const u=t%P;
      const enter=backOut(seg(u,0.16,0.44)), leave=E.in(seg(u,2.5,2.72)), vis=seg(u,0.16,0.2)*(1-seg(u,2.66,2.72));
      const m1=backOut(seg(u,1.0,1.26)), m2=backOut(seg(u,1.75,2.01));
      const r=m1+m2;
      const rr=clamp(r,0,2), i0=Math.floor(Math.min(rr,1.999)), f=rr-i0;
      const py=lerp(RY[0],RY[1],m1)+(RY[2]-RY[1])*m2;
      const pw=lerp(W[i0],W[i0+1],f)+9;
      const zz=(u<1?enter:1)*(1-leave);
      c.save(); reset(c);
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      if(zz>0.01&&vis>0){
        c.save(); c.translate(50,py); c.scale(zz,zz);
        c.shadowColor='rgba(255,200,60,0.7)'; c.shadowBlur=3.4*sc;
        const gr=c.createLinearGradient(0,-12,0,12); gr.addColorStop(0,'#ffe680'); gr.addColorStop(1,'#ffbe1a'); c.fillStyle=gr;
        c.beginPath(); c.roundRect(-pw/2,-12.2,pw,24.4,7); c.fill();
        c.restore();
      }
      c.font=FONT; c.textAlign='center'; c.textBaseline='alphabetic';
      const yb=FS*0.36, TT=[1.0,1.75,2.5];
      for(let i=0;i<3;i++){
        const near=clamp(1-Math.abs(r-i)*1.6)*vis*(u>0.2?1:0);
        const said=seg(u,TT[i]-0.05,TT[i]+0.12)*(1-seg(u,3.2,3.65));
        const z=1+0.07*near;
        c.save(); c.translate(50,RY[i]); c.scale(z,z);
        c.globalAlpha=(0.36+0.64*said)*(1-near); c.fillStyle='#ffffff'; c.fillText(WORDS[i],0,yb);
        c.globalAlpha=near; c.fillStyle='#1c1147'; c.fillText(WORDS[i],0,yb);
        c.restore();
      }
      c.restore();
    };
  }},

{ id:'dissolve', name:'Dissolve', section:'Opacity / Visibility', isNew:true, still:1.0,
  line:'A butterfly burns away grain by grain from the left, then comes back the same way.',
  make(px){
    const P=4.4, sc=px/100, CX=50, CY=49.5;
    const upper=x=>{ x.beginPath(); x.moveTo(1.5,-6); x.bezierCurveTo(8,-22,24,-39,43,-37.5); x.bezierCurveTo(48.5,-37,50,-31,47.5,-26); x.bezierCurveTo(44,-14,38,-4,30,0.5); x.bezierCurveTo(20,4.5,8,3.5,1.5,0.5); x.closePath(); };
    const lower=x=>{ x.beginPath(); x.moveTo(1.5,1); x.bezierCurveTo(12,2,28,0,36,7); x.bezierCurveTo(42.5,13,40,24,34,30.5); x.bezierCurveTo(27,38,16,41,11,36.5); x.bezierCurveTo(6,31,2,14,1.5,7); x.closePath(); };
    const [Wg,w]=mk(px/2+2,px); w.setTransform(sc,0,0,sc,0,CY*sc);
    const paint=(path,veins,dots)=>{
      const g=w.createRadialGradient(0,-2,2,0,-2,54); g.addColorStop(0,'#0a1aa8'); g.addColorStop(0.32,'#1150ee'); g.addColorStop(0.62,'#16a4ff'); g.addColorStop(0.86,'#63e6ff'); g.addColorStop(1,'#b8f5ff');
      w.save(); path(w); w.fillStyle=g; w.fill(); w.clip();
      w.strokeStyle='rgba(6,10,40,0.6)'; w.lineWidth=0.55; veins.forEach(([a,b,e,f])=>{ w.beginPath(); w.moveTo(1.5,-1); w.quadraticCurveTo(a,b,e,f); w.stroke(); });
      const s=w.createRadialGradient(22,-16,0,22,-16,22); s.addColorStop(0,'rgba(255,255,255,0.3)'); s.addColorStop(1,'rgba(255,255,255,0)'); w.fillStyle=s; w.fillRect(0,-45,52,92);
      path(w); w.strokeStyle='#070b22'; w.lineWidth=8.5; w.stroke();
      w.restore();
      w.fillStyle='#f4fbff'; dots.forEach(([x,y,r])=>{ w.beginPath(); w.arc(x,y,r,0,TAU); w.fill(); });
    };
    paint(lower,[[16,6,35,12],[16,10,33,24],[12,14,24,34],[8,14,14,34]],[[37.6,12,0.9],[37.4,19.5,1],[33.6,26.5,1],[27.8,32.2,1],[21,35.8,0.95],[14.4,35.6,0.85]]);
    paint(upper,[[14,-14,41,-33],[18,-10,44,-24],[20,-6,40,-13],[18,-3,33,-5],[12,0,22,0]],[[39,-35.2,0.9],[44.6,-33.4,1],[45.4,-27.2,1],[43,-20.6,1],[40,-14.4,0.95],[35.8,-8.6,0.9]]);
    const [Bd,bd]=canvasOf(px); bd.translate(CX,CY);
    bd.strokeStyle='#0a0d24'; bd.lineWidth=0.75; bd.lineCap='round';
    bd.beginPath(); bd.moveTo(-0.7,-13); bd.bezierCurveTo(-3,-24,-8,-31,-11,-35); bd.moveTo(0.7,-13); bd.bezierCurveTo(3,-24,8,-31,11,-35); bd.stroke();
    bd.fillStyle='#0a0d24'; bd.beginPath(); bd.arc(-11.2,-35.2,1.1,0,TAU); bd.arc(11.2,-35.2,1.1,0,TAU); bd.fill();
    let g=bd.createLinearGradient(-3,0,3,0); g.addColorStop(0,'#141a44'); g.addColorStop(0.45,'#4a5284'); g.addColorStop(1,'#0c1030'); bd.fillStyle=g;
    bd.beginPath(); bd.ellipse(0,13,2.2,13,0,0,TAU); bd.fill();
    bd.beginPath(); bd.ellipse(0,-3.5,3,8.2,0,0,TAU); bd.fill();
    bd.beginPath(); bd.arc(0,-12.4,2.7,0,TAU); bd.fill();
    bd.strokeStyle='rgba(255,255,255,0.14)'; bd.lineWidth=0.4; for(let i=0;i<5;i++){ bd.beginPath(); bd.moveTo(-1.9,6+i*3.6); bd.quadraticCurveTo(0,7+i*3.6,1.9,6+i*3.6); bd.stroke(); }
    const [BG,bg]=canvasOf(px);
    g=bg.createRadialGradient(50,44,4,50,50,78); g.addColorStop(0,'#5a2a42'); g.addColorStop(0.6,'#2b1426'); g.addColorStop(1,'#120811'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    /* a warm pool of light behind it, mirrored left and right like the butterfly */
    g=bg.createRadialGradient(50,46,6,50,46,46); g.addColorStop(0,'rgba(255,176,128,0.34)'); g.addColorStop(1,'rgba(255,176,128,0)'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    [[11,17,8],[89,17,8],[6,58,6],[94,58,6],[22,91,7],[78,91,7]].forEach(([x,y,r])=>{ const gr=bg.createRadialGradient(x,y,r*0.55,x,y,r); gr.addColorStop(0,'rgba(255,186,140,0.13)'); gr.addColorStop(0.88,'rgba(255,186,140,0.1)'); gr.addColorStop(1,'rgba(255,186,140,0)'); bg.fillStyle=gr; bg.beginPath(); bg.arc(x,y,r,0,TAU); bg.fill(); });
    const G=110, N=56, thr=new Float32Array(G*G), nn=noise3(5), gr=rng(8);
    for(let j=0;j<G;j++) for(let i=0;i<G;i++){ const x=(i+0.5)/G, y=(j+0.5)/G; thr[j*G+i]=clamp(clamp((x-0.03)/0.94)*0.6+(fbm(nn,x*6,y*6,1.5,3)*0.8+0.5)*0.24+gr()*0.16); }
    const MK=[], EB=[];
    for(let k=0;k<=N;k++){
      const a=k/N*1.02;
      const [M,mc]=mk(G,G), [Q,qc]=mk(G,G), mi=mc.createImageData(G,G), qi=qc.createImageData(G,G);
      for(let n=0;n<G*G;n++){
        const v=thr[n]-a, o=n*4;
        mi.data[o+3]=v>=0?255:0;
        if(v>=0&&v<0.055){ const h=v/0.055; qi.data[o]=255; qi.data[o+1]=lerp(232,122,h); qi.data[o+2]=lerp(150,26,h); qi.data[o+3]=255; }
        else if(v>=0.055&&v<0.11){ qi.data[o]=46; qi.data[o+1]=14; qi.data[o+2]=4; qi.data[o+3]=Math.round(180*(1-(v-0.055)/0.055)); }
      }
      mc.putImageData(mi,0,0); qc.putImageData(qi,0,0); MK.push(M); EB.push(Q);
    }
    const [O,o]=mk(px,px);
    return (c,t)=>{
      const u=t%P;
      const s0=sstep(0.35,1.75,u)-sstep(2.0,3.85,u), a=s0>0?0.06+0.8*s0:0;
      const fl=0.5+0.5*Math.cos(u/P*TAU*3), f=1-0.2*fl, sh=0.09*fl, cx=CX*sc;
      reset(o); o.clearRect(0,0,px,px);
      o.setTransform(f,-sh,0,1,cx,0);
      o.drawImage(Wg,0,0);
      o.setTransform(-f,-sh,0,1,cx,0);
      o.drawImage(Wg,0,0);
      o.setTransform(1,0,0,1,0,0);
      o.drawImage(Bd,0,0);
      if(a>0){
        const k=Math.min(N,Math.floor(a*N+0.5));
        o.imageSmoothingEnabled=false;
        o.globalCompositeOperation='source-atop'; o.drawImage(EB[k],0,0,px,px);
        o.globalCompositeOperation='destination-in'; o.drawImage(MK[k],0,0,px,px);
        o.globalCompositeOperation='source-over'; o.imageSmoothingEnabled=true;
      }
      c.save(); reset(c);
      c.drawImage(BG,0,0);
      c.drawImage(O,0,0);
      c.restore();
    };
  }},

{ id:'flicker', name:'Flicker', section:'Opacity / Visibility', isNew:true, still:2.6,
  line:'A neon OPEN sign stutters on tube by tube, then holds.',
  make(px){
    const P=4.2, sc=px/100, Y0=27, Y1=73;
    const parts=[
      {col:'#2bd4ff',hot:'#eafcff',dark:'#2f4a58',box:[0,0,100,100],w:2.4,path:x=>{ x.beginPath(); x.roundRect(5.5,13,89,74,11); }},
      {col:'#ff3d81',hot:'#fff0f6',dark:'#5b3a46',box:[0,12,42,76],w:3.4,path:x=>{ x.beginPath(); x.roundRect(11,Y0,18,Y1-Y0,9); }},
      {col:'#ff3d81',hot:'#fff0f6',dark:'#5b3a46',box:[22,12,42,76],w:3.4,path:x=>{ x.beginPath(); x.moveTo(34.5,Y1); x.lineTo(34.5,Y0); x.lineTo(42,Y0); x.arc(42,Y0+9.5,9.5,-PI/2,PI/2); x.lineTo(34.5,Y0+19); }},
      {col:'#ff3d81',hot:'#fff0f6',dark:'#5b3a46',box:[42,12,42,76],w:3.4,path:x=>{ x.beginPath(); x.moveTo(70,Y0); x.lineTo(60,Y0); x.arcTo(56.5,Y0,56.5,Y0+3.5,3.5); x.lineTo(56.5,Y1-3.5); x.arcTo(56.5,Y1,60,Y1,3.5); x.lineTo(70,Y1); x.moveTo(56.5,50); x.lineTo(67.5,50); }},
      {col:'#ff3d81',hot:'#fff0f6',dark:'#5b3a46',box:[60,12,40,76],w:3.4,path:x=>{ x.beginPath(); x.moveTo(74.5,Y1); x.lineTo(74.5,Y0); x.lineTo(89,Y1); x.lineTo(89,Y0); }}
    ];
    parts.forEach(p=>{
      const [bx,by,bw,bh]=p.box, [C,x]=mk(bw*sc,bh*sc); x.setTransform(sc,0,0,sc,-bx*sc,-by*sc);
      x.lineCap='round'; x.lineJoin='round'; x.strokeStyle=p.col; x.shadowColor=p.col;
      x.globalAlpha=0.55; x.lineWidth=p.w*1.6; x.shadowBlur=9*sc; p.path(x); x.stroke();
      x.globalAlpha=0.9; x.lineWidth=p.w*1.05; x.shadowBlur=3.4*sc; p.path(x); x.stroke();
      x.globalAlpha=1; x.shadowBlur=0; x.strokeStyle=p.hot; x.lineWidth=p.w*0.48; p.path(x); x.stroke();
      p.img=C;
    });
    function wall(x,lit){
      const BW=15.6, BH=7.4;
      for(let r=0;r<15;r++){
        const off=r%2?-BW/2:0;
        for(let i=0;i<9;i++){
          const h=hash(r*17+i,12), bx=off+i*BW, by=r*BH-1;
          const v=(lit?0.8:0.36)*(0.72+h*0.34);
          x.fillStyle='rgb('+Math.round(150*v)+','+Math.round(64*v)+','+Math.round(70*v)+')';
          x.fillRect(bx+0.4,by+0.4,BW-0.8,BH-0.8);
          x.fillStyle='rgba(255,255,255,'+(lit?0.09:0.04)+')'; x.fillRect(bx+0.4,by+0.4,BW-0.8,0.6);
        }
      }
    }
    const [W0,w0]=canvasOf(px); w0.fillStyle='#120b10'; w0.fillRect(0,0,100,100); wall(w0,false);
    let g=w0.createRadialGradient(50,50,20,50,50,80); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.65)'); w0.fillStyle=g; w0.fillRect(0,0,100,100);
    const [W1,w1]=canvasOf(px); w1.fillStyle='#2a1420'; w1.fillRect(0,0,100,100); wall(w1,true);
    g=w1.createRadialGradient(50,50,14,50,50,74); g.addColorStop(0,'rgba(255,60,130,0.5)'); g.addColorStop(0.6,'rgba(180,50,140,0.28)'); g.addColorStop(1,'rgba(30,20,60,0)'); w1.globalCompositeOperation='screen'; w1.fillStyle=g; w1.fillRect(0,0,100,100); w1.globalCompositeOperation='source-over';
    g=w1.createRadialGradient(50,50,34,50,50,86); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.75)'); w1.fillStyle=g; w1.fillRect(0,0,100,100);
    const [DK,dk]=canvasOf(px);
    parts.forEach(p=>{ dk.lineCap='round'; dk.lineJoin='round'; dk.strokeStyle=p.dark; dk.lineWidth=p.w; p.path(dk); dk.stroke(); dk.strokeStyle='rgba(255,255,255,0.2)'; dk.lineWidth=p.w*0.24; p.path(dk); dk.stroke(); });
    const FR=30, NS=Math.ceil(P*FR), BR=parts.map((p,i)=>{
      const a=new Float32Array(NS), st=[0.15,0.42,0.68,0.95,1.2][i], en=[0.55,0.72,0.98,1.18,2.0][i];
      for(let s=0;s<NS;s++){
        const u=s/FR; let b;
        if(u<st) b=0;
        else if(u<en){ const q=(u-st)/(en-st); b=hash(s+i*13,77+i)<0.28+0.62*q?0.55+0.45*hash(s*3+i,5):0.04; }
        else b=1;
        if(i===4&&u>2.75&&u<2.95) b=hash(s,3)<0.5?0.25:1;
        if(u>=P-0.38){ const q=(u-(P-0.38))/0.38; b*=(hash(s+i*7,9)>q?1:0)*(1-q*0.5); }
        a[s]=b;
      }
      a[NS-1]=0;
      return a;
    });
    return (c,t)=>{
      const u=t%P, s=Math.min(NS-1,Math.floor(u*FR));
      const hum=0.95+0.05*Math.sin(u/P*TAU*38);
      let tot=0; BR.forEach((a,i)=>{ tot+=a[s]*(i?1.1:0.6); }); tot=clamp(tot/5);
      c.save(); reset(c);
      c.drawImage(W0,0,0);
      c.globalAlpha=tot*hum; c.drawImage(W1,0,0); c.globalAlpha=1;
      c.drawImage(DK,0,0);
      parts.forEach((p,i)=>{ const b=BR[i][s]*hum; if(b<=0.01) return; c.globalAlpha=b; c.drawImage(p.img,p.box[0]*sc,p.box[1]*sc,p.box[2]*sc,p.box[3]*sc); });
      c.restore();
    };
  }},

{ id:'dispersion', name:'Dispersion', section:'Opacity / Visibility', isNew:true, still:1.3,
  line:'A hooded figure tears apart at a glowing edge and blows away on the wind.',
  make(px){
    const P=5, sc=px/100, LIFE=0.38;
    const [BG,bg]=canvasOf(px);
    let g=bg.createLinearGradient(0,0,0,86); g.addColorStop(0,'#2a2466'); g.addColorStop(0.45,'#9a3e80'); g.addColorStop(0.74,'#f27a5c'); g.addColorStop(1,'#ffc47c'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    g=bg.createRadialGradient(74,60,8,74,60,42); g.addColorStop(0,'rgba(255,240,200,0.75)'); g.addColorStop(1,'rgba(255,220,160,0)'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    g=bg.createLinearGradient(0,46,0,76); g.addColorStop(0,'#fffbe6'); g.addColorStop(1,'#ffd88f'); bg.fillStyle=g; bg.beginPath(); bg.arc(74,60,15,0,TAU); bg.fill();
    bg.fillStyle='#7a2f66'; bg.beginPath(); bg.moveTo(0,76); bg.bezierCurveTo(24,68,42,80,62,73); bg.bezierCurveTo(78,68,90,72,100,70); bg.lineTo(100,100); bg.lineTo(0,100); bg.closePath(); bg.fill();
    bg.fillStyle='#431c50'; bg.beginPath(); bg.moveTo(0,88); bg.bezierCurveTo(30,80,58,92,100,82); bg.lineTo(100,100); bg.lineTo(0,100); bg.closePath(); bg.fill();
    const sil=x=>{ x.beginPath(); x.moveTo(38.5,3.5); x.bezierCurveTo(47,7,57.5,14,57,27); x.bezierCurveTo(56.8,33,54.5,38.5,52,41.5); x.bezierCurveTo(60,44.5,68,50,71,60); x.bezierCurveTo(74,72,77,88,79,104); x.lineTo(-3,104); x.bezierCurveTo(-1,88,2,72,5,60); x.bezierCurveTo(8,50,16,44.5,24,41.5); x.bezierCurveTo(21.5,38.5,19.2,33,19,27); x.bezierCurveTo(18.5,14,30,7,38.5,3.5); x.closePath(); };
    const hood=x=>{ x.beginPath(); x.moveTo(38.5,3.5); x.bezierCurveTo(47,7,57.5,14,57,27); x.bezierCurveTo(56.8,36,53,43,47,48); x.quadraticCurveTo(38,54,29,48); x.bezierCurveTo(23,43,19.2,36,19,27); x.bezierCurveTo(18.5,14,30,7,38.5,3.5); x.closePath(); };
    const face=x=>{ x.beginPath(); x.moveTo(38,14.5); x.bezierCurveTo(46,14.5,49.5,24,48.5,31.5); x.bezierCurveTo(47.8,38,42.5,42.5,38,43.5); x.bezierCurveTo(33.5,42.5,28.2,38,27.5,31.5); x.bezierCurveTo(26.5,24,30,14.5,38,14.5); x.closePath(); };
    const [F,f]=canvasOf(px);
    g=f.createLinearGradient(14,30,62,104); g.addColorStop(0,'#2f7f9e'); g.addColorStop(0.5,'#1c3d6e'); g.addColorStop(1,'#141c4a'); f.fillStyle=g; sil(f); f.fill();
    f.save(); sil(f); f.clip();
    [[24,46,10,104],[30,50,24,104],[38,54,38,104],[46,50,52,104],[52,46,66,104]].forEach(([a,b,e,h])=>{
      f.strokeStyle='rgba(6,10,34,0.42)'; f.lineWidth=3.2; f.beginPath(); f.moveTo(a,b); f.quadraticCurveTo((a+e)/2+(a<38?-3:3),(b+h)/2,e,h); f.stroke();
      f.strokeStyle='rgba(130,210,235,0.18)'; f.lineWidth=1.2; f.beginPath(); f.moveTo(a+2,b+1); f.quadraticCurveTo((a+e)/2+(a<38?-1:5),(b+h)/2,e+2.2,h); f.stroke();
    });
    f.restore();
    g=f.createLinearGradient(20,8,56,48); g.addColorStop(0,'#3a93b0'); g.addColorStop(1,'#1a4670'); f.fillStyle=g; hood(f); f.fill();
    g=f.createRadialGradient(38,31,2,38,31,17); g.addColorStop(0,'#1b1420'); g.addColorStop(1,'#04050c'); f.fillStyle=g; face(f); f.fill();
    g=f.createLinearGradient(27,14,49,44); g.addColorStop(0,'#ffe9ae'); g.addColorStop(1,'#c98a24'); f.strokeStyle=g; f.lineWidth=1.25; face(f); f.stroke();
    f.save(); f.shadowColor='#ffb24d'; f.shadowBlur=3.6*sc; f.fillStyle='#ffd27a';
    [33.2,42.8].forEach(x=>{ f.beginPath(); f.moveTo(x-2.5,29.6); f.quadraticCurveTo(x,27.6,x+2.5,29.6); f.quadraticCurveTo(x,31.2,x-2.5,29.6); f.closePath(); f.fill(); f.fill(); });
    f.restore();
    g=f.createLinearGradient(30,46,46,52); g.addColorStop(0,'#fff0b8'); g.addColorStop(1,'#d9962a'); f.fillStyle=g; f.beginPath(); f.arc(38,50.5,2.7,0,TAU); f.fill();
    f.save(); sil(f); f.clip(); g=f.createLinearGradient(30,0,80,0); g.addColorStop(0,'rgba(255,150,90,0)'); g.addColorStop(0.55,'rgba(255,170,90,0.55)'); g.addColorStop(1,'rgba(255,214,140,1)'); f.strokeStyle=g; f.lineWidth=2.6; sil(f); f.stroke(); f.restore();
    const G=124, N=40, cell=100/G, thr=new Float32Array(G*G), nn=noise3(31), gr=rng(44), ps=[];
    const data=f.getImageData(0,0,F.width,F.height).data, W=F.width;
    for(let j=0;j<G;j++) for(let i=0;i<G;i++){
      const fx=(i+0.5)*cell, fy=(j+0.5)*cell, n=j*G+i;
      const nv=fbm(nn,fx*0.075,fy*0.075,2.5,3)*0.8+0.5;
      thr[n]=clamp((1-clamp((fx-2)/78))*0.74+nv*0.18+gr()*0.08);
      const px0=Math.min(W-1,Math.floor(fx*sc)), py0=Math.min(F.height-1,Math.floor(fy*sc)), o=(py0*W+px0)*4;
      if(data[o+3]>128&&gr()<0.6){
        const emb=gr()<0.2;
        const col=emb?['#ffd27a','#ff9a3c','#ff7a2f'][Math.floor(gr()*3)]:'rgb('+((data[o]>>4)*16+8)+','+((data[o+1]>>4)*16+8)+','+((data[o+2]>>4)*16+8)+')';
        ps.push({x:fx,y:fy,t:thr[n],d:68+gr()*30,l:6+gr()*16,w:3+gr()*4,ph:fy*0.11+gr()*1.2,s:(emb?0.55:0.7)+gr()*0.55,col});
      }
    }
    ps.sort((a,b)=>a.col<b.col?-1:a.col>b.col?1:0);
    const MK=[], EB=[];
    for(let k=0;k<=N;k++){
      const a=k/N;
      const [M,mc]=mk(G,G), [Q,qc]=mk(G,G), mi=mc.createImageData(G,G), qi=qc.createImageData(G,G);
      for(let n=0;n<G*G;n++){
        const v=thr[n]-a, o=n*4;
        mi.data[o+3]=v>=0?255:0;
        if(v>=0&&v<0.05){ const h=v/0.05; qi.data[o]=255; qi.data[o+1]=lerp(226,120,h); qi.data[o+2]=lerp(140,30,h); qi.data[o+3]=255; }
      }
      mc.putImageData(mi,0,0); qc.putImageData(qi,0,0); MK.push(M); EB.push(Q);
    }
    const [O,o]=mk(px,px);
    return (c,t)=>{
      const u=t%P;
      /* part linear so the last grains are still moving when the blow ends: no long empty hold */
      const q1=seg(u,0.5,2.5), q2=seg(u,2.65,4.35);
      const p=(1+LIFE)*(q1*0.55+q1*q1*(3-2*q1)*0.45-(q2*0.4+q2*q2*(3-2*q2)*0.6));
      c.save(); reset(c);
      c.drawImage(BG,0,0);
      if(p<=0.0005) c.drawImage(F,0,0);
      else if(p<1){
        const k=Math.floor(p*N);
        reset(o); o.clearRect(0,0,px,px); o.drawImage(F,0,0);
        o.imageSmoothingEnabled=false;
        o.globalCompositeOperation='source-atop'; o.drawImage(EB[k],0,0,px,px);
        o.globalCompositeOperation='destination-in'; o.drawImage(MK[k],0,0,px,px);
        o.globalCompositeOperation='source-over'; o.imageSmoothingEnabled=true;
        c.drawImage(O,0,0);
      }
      if(p>0.0005){
        c.setTransform(sc,0,0,sc,0,0);
        let last='';
        for(let i=0;i<ps.length;i++){
          const q=ps[i], a=(p-q.t)/LIFE;
          if(a<=0||a>=1) continue;
          if(q.col!==last){ c.fillStyle=q.col; last=q.col; }
          const X=q.x+q.d*a*Math.sqrt(Math.sqrt(a)), Y=q.y-q.l*a+q.w*Math.sin(a*4.2+q.ph)*a, S=q.s*(1-0.55*a);
          c.globalAlpha=Math.min(1,(1-a)*1.4);
          c.fillRect(X-S/2,Y-S/2,S,S);
        }
      }
      c.restore();
    };
  }}
);
})();
