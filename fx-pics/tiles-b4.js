/* Batch 4: Drawing / Edge and Warping. The warps push real vector geometry through the effect's own formula, so they stay crisp. */
(function(){ 'use strict'; const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

const lin=(c,x0,y0,x1,y1,st)=>{ const g=c.createLinearGradient(x0,y0,x1,y1); for(const [o,k] of st) g.addColorStop(o,k); return g; };
const rad=(c,x0,y0,r0,x1,y1,r1,st)=>{ const g=c.createRadialGradient(x0,y0,r0,x1,y1,r1); for(const [o,k] of st) g.addColorStop(o,k); return g; };
const backOut=p=>{ if(p<=0) return 0; if(p>=1) return 1; const s=2.1, q=p-1; return 1+(s+1)*q*q*q+s*q*q; };
const base=(c,sc)=>{ c.setTransform(sc,0,0,sc,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.lineCap='round'; c.lineJoin='round'; c.setLineDash([]); c.shadowColor='rgba(0,0,0,0)'; c.shadowBlur=0; c.shadowOffsetX=0; c.shadowOffsetY=0; };
const densify=(p,step)=>{ const out=[], n=p.length/2; for(let i=0;i<n;i++){ const x0=p[i*2], y0=p[i*2+1], j=(i+1)%n, x1=p[j*2], y1=p[j*2+1], m=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/step)); for(let k=0;k<m;k++) out.push(lerp(x0,x1,k/m),lerp(y0,y1,k/m)); } return out; };
const rectP=(x,y,w,h,step)=>densify([x,y,x+w,y,x+w,y+h,x,y+h],step);
const circP=(x,y,rx,ry,n)=>{ const o=[]; for(let i=0;i<n;i++){ const a=i/n*TAU; o.push(x+Math.cos(a)*rx,y+Math.sin(a)*ry); } return o; };
const rings=(c,list,warp,o)=>{ c.beginPath(); for(const r of list){ for(let i=0;i<r.length;i+=2){ warp(r[i],r[i+1],o); if(i) c.lineTo(o[0],o[1]); else c.moveTo(o[0],o[1]); } c.closePath(); } };
/* a closed Catmull-Rom loop through flat [x,y,...] control points, returned as a dense flat list */
const smooth=(p,per)=>{ const n=p.length/2, out=[]; const g=(i,k)=>p[((i%n)+n)%n*2+k]; for(let i=0;i<n;i++) for(let s=0;s<per;s++){ const t=s/per, t2=t*t, t3=t2*t; for(let k=0;k<2;k++){ const a=g(i-1,k), b=g(i,k), d=g(i+1,k), e=g(i+2,k); out.push(0.5*((2*b)+(-a+d)*t+(2*a-5*b+4*d-e)*t2+(-a+3*b-3*d+e)*t3)); } } return out; };

window.FX_TILES.push(

/* ------------------------------------------------------------------ CROSSHATCH */
{ id:'crosshatch', name:'Crosshatch', section:'Drawing / Edge', isNew:true, still:3.3,
  line:'Ink lines cross and stack up in the shadows until the apple is fully shaded.',
  make(px){
    const P=4.8, sc=px/100, PAPER='#f8f1e2', INK='#1c1830';
    const apple=c=>{ c.beginPath(); c.moveTo(50,32); c.bezierCurveTo(55,25,73,22,83,32); c.bezierCurveTo(93,42,92,63,82,75); c.bezierCurveTo(74,86,63,91,57,88); c.bezierCurveTo(53,86.5,47,86.5,43,88); c.bezierCurveTo(37,91,26,86,18,75); c.bezierCurveTo(8,63,7,42,17,32); c.bezierCurveTo(27,22,45,25,50,32); c.closePath(); };
    const stem=c=>{ c.beginPath(); c.moveTo(48.2,34); c.bezierCurveTo(48.4,27,49.2,20,52.6,12.2); c.quadraticCurveTo(55.2,11,57.2,12.8); c.bezierCurveTo(54.2,19.5,52.6,27,52.4,34); c.quadraticCurveTo(50.2,35.5,48.2,34); c.closePath(); };
    const leaf=c=>{ c.beginPath(); c.moveTo(55,26.5); c.bezierCurveTo(59,15,72,9.5,87,12.5); c.bezierCurveTo(82,24,69,31,55,26.5); c.closePath(); };

    /* the tonal map the hatching reads, exactly as the effect reads brightness: masks drawn once, sampled once */
    const MS=400, M=document.createElement('canvas'); M.width=M.height=MS; const mc=M.getContext('2d',{willReadFrequently:true}); mc.setTransform(MS/100,0,0,MS/100,0,0);
    mc.fillStyle='#f00'; apple(mc); mc.fill(); mc.fillStyle='#0f0'; leaf(mc); mc.fill(); mc.fillStyle='#00f'; stem(mc); mc.fill();
    const D=mc.getImageData(0,0,MS,MS).data;
    const at=(x,y,k)=>(x<0||y<0||x>=100||y>=100)?0:D[((y*4|0)*MS+(x*4|0))*4+k];
    const tone=(x,y)=>{
      if(at(x,y,2)>128) return 1;
      if(at(x,y,1)>128){ const dn=(x-55)*(-14)-(y-26.5)*(-32); return dn>0?0.66:0.42; }
      if(at(x,y,0)>128){
        const nx=(x-50)/43, ny=(y-57)/34, z=Math.sqrt(Math.max(0,1-nx*nx-ny*ny)), d=nx*-0.55+ny*-0.6+z*0.58;
        let l=0.08+0.86*d;
        l+=0.2*(1-clamp(z/0.42))*(d<0.05?1:0);
        l*=0.5+0.5*clamp(Math.hypot(x-50,(y-32)*1.5)/15);
        return clamp(l);
      }
      const sx=(x-59)/36, sy=(y-91.5)/5.8, e=sx*sx+sy*sy;
      return e<1?0.44+0.3*e:1;
    };
    function hatch(ang,sp,th){
      const ca=Math.cos(ang), sa=Math.sin(ang), out=[]; let line=0;
      for(let k=-76;k<=76;k+=sp){ const ox=50-sa*k, oy=52+ca*k; let st=null, flip=line%2; line++;
        for(let s=-76;s<=76;s+=0.25){ const x=ox+ca*s, y=oy+sa*s, on=tone(x,y)<th;
          if(on&&st===null) st=s;
          if(!on&&st!==null){ if(s-st>1.6){ const a=[ox+ca*(st+0.2),oy+sa*(st+0.2)], b=[ox+ca*(s-0.2),oy+sa*(s-0.2)]; out.push(flip?[b[0],b[1],a[0],a[1],k]:[a[0],a[1],b[0],b[1],k]); } st=null; } } }
      const lo=out.reduce((m,g)=>Math.min(m,g[4]),1e3), hi=out.reduce((m,g)=>Math.max(m,g[4]),-1e3);
      for(const g of out) g[4]=(g[4]-lo)/(hi-lo||1);
      return out;
    }
    const SP=3.5;
    const layers=[{segs:hatch(-Math.PI/4,SP,0.8),a:0.75,b:1.6,w:0.74},{segs:hatch(Math.PI/4,SP,0.5),a:1.45,b:2.3,w:0.74},{segs:hatch(0,SP,0.27),a:2.15,b:2.85,w:0.78}];

    const [A,a]=canvasOf(px);
    a.fillStyle=PAPER; a.fillRect(0,0,100,100);
    a.fillStyle=rad(a,50,45,20,50,50,76,[[0,'rgba(255,250,235,0)'],[1,'rgba(180,150,100,0.32)']]); a.fillRect(0,0,100,100);
    a.save(); a.translate(59,91.5); a.scale(1,0.17); a.fillStyle=rad(a,0,0,6,0,0,38,[[0,'rgba(90,60,50,0.38)'],[1,'rgba(90,60,50,0)']]); a.beginPath(); a.arc(0,0,38,0,TAU); a.fill(); a.restore();
    a.fillStyle=rad(a,35,42,3,50,58,52,[[0,'#ff7f6a'],[0.3,'#ee3a3f'],[0.72,'#c11d33'],[1,'#7f1128']]); apple(a); a.fill();
    a.save(); apple(a); a.clip();
    a.fillStyle=rad(a,50,31,1,50,31,15,[[0,'rgba(70,10,20,0.6)'],[1,'rgba(70,10,20,0)']]); a.fillRect(30,20,40,28);
    a.fillStyle=rad(a,33,42,0,33,42,13,[[0,'rgba(255,255,255,0.75)'],[1,'rgba(255,255,255,0)']]); a.fillRect(10,25,50,40);
    a.fillStyle=rad(a,80,78,2,80,78,22,[[0,'rgba(255,190,120,0.36)'],[1,'rgba(255,190,120,0)']]); a.fillRect(55,55,40,40);
    a.restore();
    a.fillStyle=lin(a,48,34,57,12,[[0,'#3a2112'],[1,'#7a4a26']]); stem(a); a.fill();
    a.fillStyle=lin(a,55,26,87,12,[[0,'#3f9a3f'],[1,'#a6d94a']]); leaf(a); a.fill();

    return (c,t)=>{
      const u=t%P;
      base(c,1); c.drawImage(A,0,0);
      base(c,sc);
      const fade=1-E.inOut(seg(u,4.15,4.65));
      const wash=0.4*E.inOut(seg(u,0.7,2.8))*fade;
      if(wash>0.002){ c.globalAlpha=wash; c.fillStyle=PAPER; apple(c); c.fill(); leaf(c); c.fill(); c.globalAlpha=1; }
      c.strokeStyle=INK; c.globalAlpha=fade;
      for(const L of layers){
        if(u<=L.a) continue;
        const span=L.b-L.a, head=span*0.62;
        c.lineWidth=L.w; c.lineCap='butt'; c.beginPath();
        for(const g of L.segs){
          const p=E.out(seg(u,L.a+g[4]*head,L.a+g[4]*head+span*0.38));
          if(p<=0) continue;
          c.moveTo(g[0],g[1]); c.lineTo(lerp(g[0],g[2],p),lerp(g[1],g[3],p));
        }
        c.stroke();
      }
      const o=E.inOut(seg(u,0.25,1.0));
      if(o>0){ c.lineCap='round'; c.lineWidth=1.5; c.setLineDash([262*o,500]); apple(c); c.stroke(); c.setLineDash([]);
        c.lineWidth=1.05; if(o>0.75){ c.globalAlpha=fade*seg(o,0.75,1); stem(c); c.stroke(); leaf(c); c.stroke(); c.lineWidth=0.7; c.beginPath(); c.moveTo(57,26.2); c.quadraticCurveTo(70,21,84,13.5); c.stroke(); } }
      c.globalAlpha=1; c.lineCap='round';
    };
  }},

/* ------------------------------------------------------------------ STROKE */
{ id:'stroke', name:'Stroke Colour', section:'Drawing / Edge', isNew:true, still:2.7,
  line:'A bold white outline pops around the frog, then a second ring makes it a sticker.',
  make(px){
    const P=4.2, sc=px/100, S=0.84, CX=50, CY=46;
    const [B,b]=canvasOf(px);
    b.fillStyle=lin(b,0,0,100,100,[[0,'#3c1fa0'],[0.55,'#7a2bb8'],[1,'#d13a86']]); b.fillRect(0,0,100,100);
    b.fillStyle=rad(b,50,46,4,50,46,62,[[0,'rgba(255,214,140,0.42)'],[1,'rgba(255,214,140,0)']]); b.fillRect(0,0,100,100);
    const [O,o]=canvasOf(px);
    const el=(c,x,y,a,e,r)=>{ r=r||0; c.moveTo(x+a*Math.cos(r),y+a*Math.sin(r)); c.ellipse(x,y,a,e,r,0,TAU); };
    const arm=(c,ax,ay,bx,by,th)=>{ const l=Math.hypot(bx-ax,by-ay), r=Math.atan2(by-ay,bx-ax); el(c,(ax+bx)/2,(ay+by)/2,l/2+th,th,r); };
    const handOf=w=>{ const a=-0.62+0.3*Math.sin(w); return [20+19*Math.cos(a),18+19*Math.sin(a)]; };
    function sil(c,w){
      el(c,0,-6,36,25); el(c,-19.5,-27,14,14); el(c,19.5,-27,14,14);
      el(c,0,27,21,17);
      el(c,-19,42.5,12,5.6,-0.06); el(c,19,42.5,12,5.6,0.06);
      [[-30,41.5],[-27.5,46],[-22,47.8],[30,41.5],[27.5,46],[22,47.8]].forEach(([x,y])=>el(c,x,y,3,3));
      arm(c,-20,18,-33,31,3.6); el(c,-34.5,32.5,5.2,5.2);
      const h=handOf(w); arm(c,20,18,h[0],h[1],3.6); el(c,h[0]+0.6,h[1]-1,5.4,5.4);
    }
    function head(c){ el(c,0,-6,36,25); el(c,-19.5,-27,14,14); el(c,19.5,-27,14,14); }
    function art(c,w,blink,look){
      const G=lin(c,0,-42,0,50,[[0,'#c6f552'],[0.45,'#7ed63d'],[1,'#2f9e3f']]);
      c.fillStyle=G; c.beginPath(); sil(c,w); c.fill();
      c.save(); c.beginPath(); el(c,0,27,21,17); c.clip(); c.fillStyle='rgba(12,74,36,0.42)'; c.beginPath(); c.ellipse(0,15,27,11,0,0,TAU); c.fill(); c.restore();
      c.fillStyle=lin(c,0,20,0,44,[[0,'#f8fbc4'],[1,'#d9e98a']]); c.beginPath(); c.ellipse(0,32,13.5,11,0,0,TAU); c.fill();
      c.fillStyle='rgba(16,86,44,0.32)'; c.beginPath(); el(c,-19,44.8,10,2.6,-0.06); el(c,19,44.8,10,2.6,0.06); c.fill();
      c.beginPath(); head(c); c.fillStyle=G; c.fill();
      c.save(); c.beginPath(); head(c); c.clip();
      c.fillStyle=rad(c,0,-34,4,0,-6,44,[[0,'rgba(255,255,220,0.34)'],[0.7,'rgba(255,255,220,0)']]); c.fillRect(-40,-44,80,70);
      c.fillStyle='rgba(18,96,50,0.34)'; c.beginPath(); c.ellipse(0,18,40,9,0,0,TAU); c.fill();
      c.restore();
      c.fillStyle='#ff9db4'; c.beginPath(); c.ellipse(-27.5,5,5.6,3.5,0,0,TAU); c.ellipse(27.5,5,5.6,3.5,0,0,TAU); c.fill();
      c.fillStyle='rgba(20,84,44,0.75)'; c.beginPath(); c.ellipse(-4,-6.2,1.25,0.9,0.3,0,TAU); c.ellipse(4,-6.2,1.25,0.9,-0.3,0,TAU); c.fill();
      [-1,1].forEach(s=>{ const ex=s*19.5, ey=-28;
        c.save(); c.beginPath(); c.arc(ex,ey,10.8,0,TAU); c.clip();
        c.fillStyle=rad(c,ex-2,ey-3,1,ex,ey,11,[[0,'#ffffff'],[1,'#dfe7dd']]); c.fillRect(ex-12,ey-12,24,24);
        const px_=ex+look*2.2-s*1.2, py_=ey+1;
        c.fillStyle='#17201f'; c.beginPath(); c.arc(px_,py_,7,0,TAU); c.fill();
        c.fillStyle='#fff'; c.beginPath(); c.arc(px_-2.5,py_-3,2.7,0,TAU); c.fill(); c.beginPath(); c.arc(px_+2.6,py_+2.4,1.25,0,TAU); c.fill();
        if(blink>0){ const ly=ey-12+22*blink; c.fillStyle=lin(c,0,ey-12,0,ey+11,[[0,'#b4ec4c'],[1,'#7fd63e']]); c.fillRect(ex-12,ey-12,24,ly-(ey-12)); c.strokeStyle='#17602f'; c.lineWidth=1.7; c.beginPath(); c.moveTo(ex-11.5,ly-0.6); c.quadraticCurveTo(ex,ly+2.6,ex+11.5,ly-0.6); c.stroke(); }
        c.restore();
      });
      c.fillStyle='#6f1a35'; c.beginPath(); c.moveTo(-21,3.2); c.quadraticCurveTo(0,8,21,3.2); c.quadraticCurveTo(17.5,19.5,0,20); c.quadraticCurveTo(-17.5,19.5,-21,3.2); c.closePath(); c.fill();
      c.save(); c.clip(); c.fillStyle='#ff7f9c'; c.beginPath(); c.ellipse(0,19.5,11,7.2,0,0,TAU); c.fill(); c.strokeStyle='#d9496e'; c.lineWidth=0.7; c.beginPath(); c.moveTo(0,13.5); c.lineTo(0,20); c.stroke(); c.restore();
      c.strokeStyle='#17602f'; c.lineWidth=1.5; c.lineCap='round'; c.beginPath(); c.moveTo(-24,1.6); c.quadraticCurveTo(-22.4,2.8,-21,3.2); c.quadraticCurveTo(0,8,21,3.2); c.quadraticCurveTo(22.4,2.8,24,1.6); c.stroke();
      const armG=lin(c,0,0,0,40,[[0,'#92e043'],[1,'#49b23b']]);
      c.fillStyle=armG; c.strokeStyle='rgba(20,100,48,0.55)'; c.lineWidth=0.8;
      const h=handOf(w);
      c.beginPath(); arm(c,20,18,h[0],h[1],3.6); el(c,h[0]+0.6,h[1]-1,5.4,5.4); c.stroke(); c.fill();
      c.beginPath(); arm(c,-20,18,-33,31,3.6); el(c,-34.5,32.5,5.2,5.2); c.stroke(); c.fill();
    }
    return (c,t)=>{
      const u=t%P, w=u/P*TAU*3;
      base(c,1); c.drawImage(B,0,0);
      const off=1-E.inOut(seg(u,3.5,3.95));
      const w1=4.9*backOut(seg(u,0.45,0.95))*off;
      const w2=2.7*backOut(seg(u,1.3,1.8))*off, gap=2.4*seg(u,1.3,1.5)*off;
      const pop=Math.max(0,1-Math.abs(u-0.75)/0.3)*0.04+Math.max(0,1-Math.abs(u-1.6)/0.3)*0.025;
      const bob=Math.sin(u/P*TAU*2)*1.1, K=S*(1+pop);
      const blink=(u>2.9&&u<3.15)?Math.sin(seg(u,2.9,3.15)*Math.PI):0;
      const look=Math.sin(w)*0.5+0.5;
      const frame=q=>{ q.setTransform(sc*K,0,0,sc*K,sc*CX,sc*(CY+bob)); };
      c.setTransform(sc*K,0,0,sc*K,sc*CX,sc*(CY+bob+2.6)); c.lineJoin='round'; c.lineCap='round';
      const reach=w1+(w2>0.02?gap+w2:0);
      if(reach>0.05){ c.strokeStyle=c.fillStyle='rgba(20,6,60,0.3)'; c.lineWidth=2*reach+1.2; c.beginPath(); sil(c,w); c.stroke(); c.fill(); }
      if(w2>0.02){
        o.setTransform(1,0,0,1,0,0); o.clearRect(0,0,px,px); frame(o); o.lineJoin='round'; o.lineCap='round';
        o.globalCompositeOperation='source-over'; o.fillStyle=o.strokeStyle='#ffd23f'; o.lineWidth=2*(w1+gap+w2); o.beginPath(); sil(o,w); o.stroke(); o.fill();
        o.globalCompositeOperation='destination-out'; o.fillStyle=o.strokeStyle='#000'; o.lineWidth=2*(w1+gap); o.stroke(); o.fill();
        o.globalCompositeOperation='source-over';
        c.setTransform(1,0,0,1,0,0); c.drawImage(O,0,0);
      }
      frame(c);
      if(w1>0.03){ c.fillStyle=c.strokeStyle='#ffffff'; c.lineWidth=2*w1; c.beginPath(); sil(c,w); c.stroke(); c.fill(); }
      art(c,w,blink,look);
      base(c,sc);
    };
  }},

/* ------------------------------------------------------------------ TWIRL */
{ id:'twirl', name:'Twirl', section:'Warping', isNew:true, still:1.9,
  line:'The straight stripes of a lollipop twist into a spiral, then unwind.',
  make(px){
    const P=3.8, sc=px/100, CX=50, CY=44, R=40.5, N=8, ST=40, Rm=R*1.03, MAX=5.4;
    const [B,b]=canvasOf(px);
    b.fillStyle=rad(b,50,42,6,50,50,80,[[0,'#39d3c0'],[0.6,'#129a9e'],[1,'#0a5a70']]); b.fillRect(0,0,100,100);
    b.save(); b.translate(CX+2.5,CY+5.5); b.fillStyle=rad(b,0,0,R*0.7,0,0,R*1.22,[[0,'rgba(2,40,56,0.5)'],[1,'rgba(2,40,56,0)']]); b.beginPath(); b.arc(0,0,R*1.22,0,TAU); b.fill(); b.restore();
    b.fillStyle=lin(b,46,0,54,0,[[0,'#fbf6ec'],[0.55,'#fff'],[1,'#c9c0b4']]); b.beginPath(); b.roundRect(46.6,CY+R-6,6.8,60,3); b.fill();
    b.fillStyle=lin(b,0,CY+R-2,0,CY+R+12,[[0,'rgba(80,40,30,0.45)'],[1,'rgba(80,40,30,0)']]); b.fillRect(46.6,CY+R-2,6.8,14);
    const [T,g]=canvasOf(px);
    const cream=rad(g,CX-6,CY-8,2,CX,CY,R+2,[[0,'#fffdf4'],[0.75,'#fdeedb'],[1,'#f2d3bd']]);
    const red=rad(g,CX-4,CY-6,2,CX,CY,R+2,[[0,'#ff5a55'],[0.65,'#e4213b'],[1,'#b0122f']]);
    const pink=rad(g,CX-4,CY-6,2,CX,CY,R+2,[[0,'#ffb4bd'],[1,'#ff8ea2']]);
    const arms=(c,tw,half,ph)=>{
      c.beginPath();
      for(let i=0;i<N;i++){
        const a0=(i+ph)*TAU/N-half, a1=(i+ph)*TAU/N+half;
        for(let j=0;j<=ST;j++){ const r=R*j/ST, f=1-r/Rm, a=a0-tw*f*f; const x=CX+Math.cos(a)*r, y=CY+Math.sin(a)*r; if(j) c.lineTo(x,y); else c.moveTo(x,y); }
        const fR=1-R/Rm, dR=tw*fR*fR; c.arc(CX,CY,R,a0-dR,a1-dR);
        for(let j=ST;j>=0;j--){ const r=R*j/ST, f=1-r/Rm, a=a1-tw*f*f; c.lineTo(CX+Math.cos(a)*r,CY+Math.sin(a)*r); }
        c.closePath();
      }
    };
    const [H,h]=canvasOf(px);
    h.save(); h.beginPath(); h.arc(CX,CY,R,0,TAU); h.clip();
    h.fillStyle=rad(h,CX-9,CY-11,8,CX,CY,R,[[0,'rgba(255,255,255,0.18)'],[0.55,'rgba(255,255,255,0)'],[0.82,'rgba(90,10,40,0.05)'],[1,'rgba(90,10,40,0.42)']]); h.fillRect(0,0,100,100);
    h.restore();
    h.strokeStyle='rgba(255,255,255,0.88)'; h.lineWidth=3.1; h.beginPath(); h.arc(CX,CY,R-5.2,Math.PI*1.08,Math.PI*1.42); h.stroke();
    h.strokeStyle='rgba(255,255,255,0.62)'; h.lineWidth=2.2; h.beginPath(); h.arc(CX,CY,R-5.2,Math.PI*1.5,Math.PI*1.56); h.stroke();
    h.strokeStyle='rgba(120,10,50,0.32)'; h.lineWidth=1.3; h.beginPath(); h.arc(CX,CY,R-0.5,0,TAU); h.stroke();
    return (c,t)=>{
      const u=t%P, tw=MAX*E.inOut(seg(u,0.35,1.55))*(1-E.inOut(seg(u,2.25,3.45)));
      base(c,1); c.drawImage(B,0,0);
      base(c,sc);
      c.fillStyle=cream; c.beginPath(); c.arc(CX,CY,R,0,TAU); c.fill();
      arms(c,tw,TAU/N*0.25,0); c.fillStyle=red; c.fill();
      arms(c,tw,TAU/N*0.055,0.5); c.fillStyle=pink; c.fill();
      c.setTransform(1,0,0,1,0,0); c.drawImage(H,0,0); base(c,sc);
    };
  }},

/* ------------------------------------------------------------------ RIPPLE */
{ id:'ripple', name:'Pond Rings', section:'Warping', isNew:true, still:1.95,
  line:'A drop hits the pond and the rings bend the koi and the tiles below as they pass.',
  make(px){
    const P=3.9, sc=px/100, IMP=0.55, C=33, LAM=16, A0=6, CXp=50, CYp=47, TEND=3.3;
    const [B,b]=canvasOf(px);
    b.fillStyle=rad(b,50,46,5,50,50,78,[[0,'#27a5b3'],[0.6,'#127a91'],[1,'#084560']]); b.fillRect(0,0,100,100);
    const floor=[]; const CELL=12.5;
    for(let i=-2;i<10;i++) for(let j=-2;j<10;j++){ if((i+j)%2===0) floor.push(rectP(i*CELL,j*CELL,CELL,CELL,3)); }
    const T=[[0,0],[.02,3.6],[.05,6.4],[.1,9.2],[.18,12],[.3,13.8],[.45,13.2],[.6,10.9],[.75,7.8],[.9,4.6],[1,2.8]];
    const wT=new Float32Array(513);
    for(let i=0;i<=512;i++){ const s=i/512; let k=0; while(k<T.length-2&&s>T[k+1][0]) k++; const p0=T[Math.max(0,k-1)], p1=T[k], p2=T[k+1], p3=T[Math.min(T.length-1,k+2)], q=(s-p1[0])/(p2[0]-p1[0]), q2=q*q, q3=q2*q; wT[i]=Math.max(0,0.5*((2*p1[1])+(-p0[1]+p2[1])*q+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*q2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*q3)); }
    const Wd=s=>wT[Math.round(clamp(s)*512)];
    const HX=77, HY=19, DX=-0.7071, DY=0.7071, NX=0.7071, NY=0.7071, L=64;
    const blob=(s0,v0,rs,rv,seed,n)=>{ const o=[]; for(let i=0;i<n;i++){ const a=i/n*TAU, wob=1+0.13*Math.sin(a*3+seed)+0.07*Math.sin(a*5+seed*2.3); o.push(s0+Math.cos(a)*rs*wob, clamp(v0+Math.sin(a)*rv*wob,-0.97,0.97)); } return o; };
    const patches=[blob(.09,0,.058,.72,1,26),blob(.33,.08,.115,.92,2.2,30),blob(.62,-.06,.095,.9,4.1,30),blob(.86,.1,.055,.85,5.7,22)];
    const sumi=[blob(.47,.55,.042,.3,3.1,16),blob(.21,-.62,.03,.22,1.7,14),blob(.75,-.55,.03,.3,2.5,14)];
    const tailC=[.965,2.4, 1.12,7.2, 1.27,12.6, 1.37,12.6, 1.33,6.2, 1.22,1.6, 1.33,-6.2, 1.37,-12.6, 1.27,-12.6, 1.12,-7.2, .965,-2.4];
    const tail=smooth(tailC,5);
    const pecA=[.18,9, .21,18, .28,26.5, .35,27, .38,18, .31,11], pec=[smooth(pecA,5), smooth(pecA.map((v,i)=>i%2?-v:v),5)];
    const pelA=[.6,8.4, .62,13, .68,17.5, .73,15.5, .71,9], pel=[smooth(pelA,5), smooth(pelA.map((v,i)=>i%2?-v:v),5)];
    const pad=(c,x,y,R,rot,flower,u)=>{
      c.save(); c.translate(x,y); c.rotate(rot);
      c.fillStyle='rgba(2,30,44,0.34)'; c.beginPath(); c.arc(1.6,2.6,R,0.22,TAU-0.22); c.lineTo(1.6,2.6); c.closePath(); c.fill();
      c.fillStyle=rad(c,-R*0.3,-R*0.3,1,0,0,R,[[0,'#8fd65a'],[0.7,'#3f9f48'],[1,'#25793c']]); c.beginPath(); c.arc(0,0,R,0.22,TAU-0.22); c.lineTo(0,0); c.closePath(); c.fill();
      c.strokeStyle='rgba(205,245,160,0.5)'; c.lineWidth=0.5; c.beginPath(); for(let i=0;i<9;i++){ const a=0.5+i*(TAU-1)/8; c.moveTo(0,0); c.lineTo(Math.cos(a)*R*0.92,Math.sin(a)*R*0.92); } c.stroke();
      c.restore();
      if(flower){ c.save(); c.translate(x,y);
        const petal=(rr,w_,col,col2,n,ph)=>{ for(let i=0;i<n;i++){ c.save(); c.rotate(ph+i*TAU/n); c.fillStyle=lin(c,0,0,0,-rr,[[0,col2],[1,col]]); c.beginPath(); c.moveTo(0,0); c.bezierCurveTo(w_,-rr*0.45,w_*0.6,-rr*0.9,0,-rr); c.bezierCurveTo(-w_*0.6,-rr*0.9,-w_,-rr*0.45,0,0); c.fill(); c.restore(); } };
        petal(9.6,4,'#ffc2dc','#f25c9a',9,0.1); petal(6.8,3.2,'#ffe3ef','#ff7fb1',7,0.5);
        c.fillStyle='#ffd34d'; c.beginPath(); c.arc(0,0,2.2,0,TAU); c.fill(); c.restore(); }
    };
    const O=[0,0];
    const drop=(c,x,y,s)=>{ c.save(); c.translate(x,y); c.scale(s,s); c.fillStyle=lin(c,-3,-6,3,4,[[0,'#ffffff'],[1,'#8fe3f6']]); c.beginPath(); c.moveTo(0,-7); c.bezierCurveTo(1.3,-3.8,3.6,-2.2,3.6,0.8); c.arc(0,0.8,3.6,0,Math.PI); c.bezierCurveTo(-3.6,-2.2,-1.3,-3.8,0,-7); c.fill(); c.restore(); };
    return (c,t)=>{
      const u=t%P, tau=u-IMP, live=tau>0, ampT=live?Math.pow(clamp(1-tau/TEND),1.15):0, om=u/P*TAU*2;
      const disp=r=>{ if(!live) return 0; const x=C*tau-r; if(x<=0) return 0; const nr=clamp(r/20); return nr*nr*(3-2*nr)*ampT*A0*clamp(x/(LAM*0.5))*Math.exp(-x/(LAM*2.6))*Math.sin(TAU*x/LAM); };
      const warp=(x,y,o)=>{ const dx=x-CXp, dy=y-CYp, r=Math.hypot(dx,dy)||1e-6, d=disp(r); o[0]=x+dx/r*d; o[1]=y+dy/r*d; };
      const curve=s=>5*Math.sin(s*Math.PI*1.25), sway=s=>(0.6+3.4*s*s)*Math.sin(om-s*3.6);
      const pt=(s,off,o,ox,oy)=>{ const lat=curve(s)+sway(s)+off, x=HX+DX*L*s+NX*lat+(ox||0), y=HY+DY*L*s+NY*lat+(oy||0); warp(x,y,o); };
      const loopSV=(list,mode,ox,oy)=>{ for(const a of list){ for(let i=0;i<a.length;i+=2){ const s=a[i], v=mode?a[i+1]*Wd(s):a[i+1]; pt(s,v,O,ox,oy); if(i) c.lineTo(O[0],O[1]); else c.moveTo(O[0],O[1]); } c.closePath(); } };
      const bodyPath=(ox,oy)=>{ for(let i=0;i<=48;i++){ const s=i/48; pt(s,Wd(s),O,ox,oy); if(i) c.lineTo(O[0],O[1]); else c.moveTo(O[0],O[1]); } for(let i=48;i>=0;i--){ const s=i/48; pt(s,-Wd(s),O,ox,oy); c.lineTo(O[0],O[1]); } c.closePath(); };
      base(c,1); c.drawImage(B,0,0);
      base(c,sc);
      rings(c,floor,warp,O); c.fillStyle='rgba(120,235,235,0.15)'; c.fill();
      c.fillStyle='rgba(2,34,52,0.3)'; c.beginPath(); bodyPath(2.2,3.4); loopSV([tail],0,2.2,3.4); loopSV(pec,0,2.2,3.4); c.fill();
      c.fillStyle='rgba(255,226,204,0.82)'; c.beginPath(); loopSV(pec,0); loopSV(pel,0); c.fill();
      c.fillStyle=lin(c,32,64,14,83,[[0,'#f7e9d9'],[0.5,'#ffe8d2'],[1,'#ff9a5a']]); c.beginPath(); loopSV([tail],0); c.fill();
      /* fin rays, fanned from each fin's root */
      c.strokeStyle='rgba(170,92,52,0.36)'; c.lineWidth=0.42; c.beginPath();
      [-1,1].forEach(sg=>{
        for(let q=0;q<4;q++){ const k=(q+0.6)/4, ex=lerp(1.16,1.35,k), ey=sg*lerp(3.4,12.6,k); for(let i=0;i<=5;i++){ const m=i/5; pt(lerp(0.99,ex,m),lerp(sg*(0.4+k*1.4),ey,m),O); if(i) c.lineTo(O[0],O[1]); else c.moveTo(O[0],O[1]); } }
        for(let q=0;q<5;q++){ const k=(q+0.5)/5, ex=lerp(0.22,0.37,k), ey=sg*lerp(18.5,24.5,Math.sin(k*Math.PI)); for(let i=0;i<=4;i++){ const m=i/4; pt(lerp(0.25,ex,m),lerp(sg*10,ey,m),O); if(i) c.lineTo(O[0],O[1]); else c.moveTo(O[0],O[1]); } }
      });
      c.stroke();
      c.fillStyle=lin(c,62,38,38,62,[[0,'#fffdf7'],[1,'#f4e4d2']]); c.beginPath(); bodyPath(); c.fill();
      c.fillStyle='#ff5a1e'; c.beginPath(); loopSV(patches,1); c.fill();
      c.fillStyle='#22202c'; c.beginPath(); loopSV(sumi,1); c.fill();
      /* scale rows on a staggered grid along the body */
      c.strokeStyle='rgba(120,60,26,0.2)'; c.lineWidth=0.42; c.beginPath();
      for(let i=0;i<13;i++){ const s=0.2+i*0.053, w_=Wd(s); for(let j=0;j<5;j++){ const v=-0.76+j*0.38+(i%2?0.19:0); if(Math.abs(v)>0.9) continue; pt(s-0.014,(v-0.115)*w_,O); c.moveTo(O[0],O[1]); pt(s+0.012,v*w_,O); c.lineTo(O[0],O[1]); pt(s-0.014,(v+0.115)*w_,O); c.lineTo(O[0],O[1]); } }
      c.stroke();
      /* gill covers */
      c.strokeStyle='rgba(150,74,34,0.5)'; c.lineWidth=0.62; c.beginPath();
      [-1,1].forEach(sg=>{ for(let i=0;i<=8;i++){ const v=sg*lerp(0.24,0.94,i/8), s=0.175-0.022*Math.pow(i/8,2); pt(s,v*Wd(s),O); if(i) c.lineTo(O[0],O[1]); else c.moveTo(O[0],O[1]); } });
      c.stroke();
      /* form: a soft darker edge held inside the body, then a fine side line */
      const sides=()=>{ [1,-1].forEach(sg=>{ for(let i=0;i<=48;i++){ const s=i/48; pt(s,sg*Wd(s),O); if(i) c.lineTo(O[0],O[1]); else c.moveTo(O[0],O[1]); } }); };
      c.save(); c.beginPath(); bodyPath(); c.clip(); c.strokeStyle='rgba(84,40,24,0.2)'; c.lineWidth=4.2; c.beginPath(); sides(); c.stroke(); c.restore();
      c.strokeStyle='rgba(120,60,30,0.38)'; c.lineWidth=0.6; c.beginPath(); sides(); c.stroke();
      /* dorsal fin: one tapered blade down the spine */
      c.fillStyle='#c94416'; c.beginPath();
      for(let i=0;i<=20;i++){ const q=i/20; pt(lerp(0.25,0.74,q),1.25*Math.sin(Math.PI*q),O); if(i) c.lineTo(O[0],O[1]); else c.moveTo(O[0],O[1]); }
      for(let i=20;i>=0;i--){ const q=i/20; pt(lerp(0.25,0.74,q),-1.25*Math.sin(Math.PI*q),O); c.lineTo(O[0],O[1]); }
      c.closePath(); c.fill();
      [[.065,6.1],[.065,-6.1]].forEach(([s,v])=>{ pt(s,v,O); c.fillStyle='#fff'; c.beginPath(); c.arc(O[0],O[1],1.7,0,TAU); c.fill(); c.fillStyle='#17151f'; c.beginPath(); c.arc(O[0]+0.2,O[1]-0.2,1.05,0,TAU); c.fill(); });
      c.fillStyle='rgba(18,120,150,0.1)'; c.fillRect(0,0,100,100);
      if(live){
        for(let j=0;j<4;j++){ const R=C*tau-(j+0.25)*LAM; if(R<=0) continue; const a=ampT*(1-j*0.2);
          c.strokeStyle='rgba(2,36,60,'+(0.3*a)+')'; c.lineWidth=2.6; c.beginPath(); c.arc(CXp,CYp,R+2.6,0,TAU); c.stroke();
          c.strokeStyle='rgba(232,252,255,'+(0.86*a)+')'; c.lineWidth=1.25; c.beginPath(); c.arc(CXp,CYp,R,0,TAU); c.stroke(); }
      }
      const d1=disp(Math.hypot(13-CXp,15-CYp))*0.5, d2=disp(Math.hypot(87-CXp,84-CYp))*0.5;
      pad(c,13-d1*0.6,15-d1*0.7,14,2.3,false,u);
      pad(c,87+d2*0.6,84+d2*0.7,15.5,0.5,true,u);
      if(!live){ const f=E.in(seg(u,0,IMP)); drop(c,CXp,lerp(-10,CYp,f),1.2); }
      else if(tau<0.6){
        const q=tau/0.6, m=E.out(q);
        c.fillStyle='rgba(255,255,255,'+(0.95*(1-q))+')';
        for(let i=0;i<10;i++){ const a=i/10*TAU+0.31, rr=5+19*m; c.beginPath(); c.arc(CXp+Math.cos(a)*rr,CYp+Math.sin(a)*rr,lerp(1.5,0.5,q),0,TAU); c.fill(); }
        c.strokeStyle='rgba(255,255,255,'+(0.9*(1-q))+')'; c.lineWidth=2.2*(1-q)+0.4; c.beginPath(); c.arc(CXp,CYp,2+8*m,0,TAU); c.stroke();
      }
    };
  }},

/* ------------------------------------------------------------------ KALEIDOSCOPE */
{ id:'kaleidoscope', name:'Kaleidoscope', section:'Warping', isNew:true, still:2.6,
  line:'One slice of a flower picture is mirrored round the circle into a turning mandala.',
  make(px){
    const P=5, sc=px/100, W2=Math.round(px*2), HALF=Math.PI/12, RAD=76;
    const S=document.createElement('canvas'); S.width=S.height=W2; const s=S.getContext('2d'); s.setTransform(W2/200,0,0,W2/200,0,0);
    s.fillStyle=lin(s,0,0,200,200,[[0,'#26105e'],[0.5,'#5a1470'],[1,'#0f5570']]); s.fillRect(0,0,200,200);
    const flower=(x,y,R,n,tip,mid,core,rot)=>{
      s.save(); s.translate(x,y);
      for(let i=0;i<n;i++){ s.save(); s.rotate(rot+i*TAU/n); const wd=R*Math.PI/n*1.15; s.fillStyle=lin(s,0,0,0,-R,[[0,mid],[1,tip]]); s.beginPath(); s.moveTo(0,0); s.bezierCurveTo(wd,-R*0.4,wd*0.8,-R*0.95,0,-R); s.bezierCurveTo(-wd*0.8,-R*0.95,-wd,-R*0.4,0,0); s.fill(); s.strokeStyle='rgba(255,255,255,0.25)'; s.lineWidth=0.3; s.beginPath(); s.moveTo(0,-R*0.2); s.lineTo(0,-R*0.82); s.stroke(); s.restore(); }
      s.fillStyle=rad(s,-R*0.08,-R*0.08,0,0,0,R*0.3,[[0,core[0]],[1,core[1]]]); s.beginPath(); s.arc(0,0,R*0.3,0,TAU); s.fill();
      s.fillStyle=core[2]; for(let i=0;i<10;i++){ const a=i/10*TAU; s.beginPath(); s.arc(Math.cos(a)*R*0.2,Math.sin(a)*R*0.2,R*0.035,0,TAU); s.fill(); }
      s.restore();
    };
    const leaf=(x,y,R,a)=>{ s.save(); s.translate(x,y); s.rotate(a); s.fillStyle=lin(s,0,0,R,0,[[0,'#12a59a'],[1,'#6df0bf']]); s.beginPath(); s.moveTo(0,0); s.quadraticCurveTo(R*0.5,-R*0.42,R,0); s.quadraticCurveTo(R*0.5,R*0.42,0,0); s.fill(); s.restore(); };
    const sets=[['#ff5fa8','#ffd0e4',['#fff2a8','#ffae2b','#a33a00'],10],['#ffb02e','#fff0b8',['#ff6a4d','#b3182f','#ffe6a0'],8],['#7c6dff','#cdd1ff',['#ffe07a','#ff9a3d','#4a1a7a'],12]];
    const DX=21.65, DY=25, R0=[13.4,10.2,8.2];
    const lat=(fn)=>{ for(let i=-6;i<=6;i++) for(let j=-6;j<=6;j++){ const x=100+i*DX, y=100+j*DY+(i&1?DY/2:0); fn(x,y,((i%3)+3+((j%3)+3)*2)%3,i,j); } };
    lat((x,y,m,i,j)=>{ for(let k=0;k<6;k++){ const a=k*TAU/6+Math.PI/6; leaf(x,y,14.5,a); } });
    lat((x,y,m,i,j)=>{ const st=sets[m]; flower(x,y,R0[m],st[3],st[0],st[1],st[2],(i+j)*0.26); });
    /* gold beads on the lattice's empty triangles */
    lat((x,y)=>{ [[DX*2/3,0],[DX/3,DY/2]].forEach(([ax,ay])=>{ s.fillStyle='#ffe28a'; s.beginPath(); s.arc(x+ax,y+ay,1.7,0,TAU); s.fill(); s.fillStyle='#b5531a'; s.beginPath(); s.arc(x+ax,y+ay,0.7,0,TAU); s.fill(); }); });
    return (c,t)=>{
      const u=t%P;
      const sweep=E.inOut(seg(u,0.45,1.5))*TAU, out=E.inOut(seg(u,4.1,4.85))*TAU;
      const th=u/P*TAU, ox=9*Math.sin(th)+4*Math.sin(2*th), oy=9*(1-Math.cos(th))*0.6;
      const rot=(Math.PI/3)*E.inOut(seg(u,1.5,4.1));
      base(c,sc); c.translate(50,50);
      c.drawImage(S,-100-ox,-100-oy,200,200);
      const A0=-Math.PI/2-HALF;
      if(sweep>0.002&&out<TAU-0.002){
        c.save(); c.rotate(rot%(Math.PI/3));
        for(let i=0;i<12;i++){
          const aS=A0+i*2*HALF, aE=aS+2*HALF;
          const lo=Math.max(aS,A0+out), hi=Math.min(aE,A0+sweep);
          if(hi<=lo) continue;
          c.save(); c.beginPath(); c.moveTo(0,0); c.arc(0,0,RAD,lo-(lo===aS?0.006:0),hi+(hi===aE?0.006:0)); c.closePath(); c.clip();
          c.rotate(i*2*HALF); if(i%2) c.scale(-1,1);
          c.drawImage(S,-100-ox,-100-oy,200,200);
          c.restore();
        }
        c.restore();
      }
      if((sweep>0.01&&sweep<TAU-0.01)||(out>0.01&&out<TAU-0.01)){
        const a=A0+((out>0.01)?out:sweep);
        c.strokeStyle='rgba(255,255,255,0.92)'; c.lineWidth=0.9; c.beginPath(); c.moveTo(0,0); c.lineTo(Math.cos(a)*RAD,Math.sin(a)*RAD); c.stroke();
      }
      base(c,sc);
      c.fillStyle=rad(c,50,50,34,50,50,74,[[0,'rgba(5,0,30,0)'],[1,'rgba(5,0,30,0.55)']]); c.fillRect(0,0,100,100);
    };
  }},

/* ------------------------------------------------------------------ FISHEYE */
{ id:'fisheye', name:'Fisheye', section:'Warping', isNew:true, still:2.25,
  line:'Through the door peephole the whole street bulges as a taxi rolls past.',
  make(px){
    const P=4.5, sc=px/100, LX=50, LY=50, LR=43;
    const groups=[], add=(fill,ring)=>{ let g=groups[groups.length-1]; if(!g||g.fill!==fill){ g={fill,list:[]}; groups.push(g); } g.list.push(ring); };
    const R=(x,y,w,h,f,st)=>add(f,rectP(x,y,w,h,st||2));
    const BASE=46;
    /* clouds */
    add('rgba(255,255,255,0.92)',circP(22,14,10,3.4,18)); add('rgba(255,255,255,0.92)',circP(29,12,7,3.8,18)); add('rgba(255,255,255,0.92)',circP(78,11,9,3,18)); add('rgba(255,255,255,0.92)',circP(71,9.5,6,3.1,18));
    const blds=[[-2,20,26,'#c25a3f','#a0432f'],[20,37,14,'#2e96a0','#217680'],[37,63,3,'#f4dcab','#d9bb80'],[63,80,18,'#8a63b8','#6c4896'],[80,102,28,'#ec9440','#c9742a']];
    const r=rng(41);
    blds.forEach((b,bi)=>{
      const [x0,x1,top,col,dk]=b, w=x1-x0;
      R(x0,top,w,BASE-top,col);
      R(x0-0.5,top-1.2,w+1,1.8,dk,2);
      const cols=bi===2?5:Math.max(3,Math.round(w/4.6)), mx=2, ww=(w-2*mx)/cols, wh=bi===2?4.4:3.8, rows=Math.floor((BASE-top-9)/(wh+2.3));
      for(let i=0;i<cols;i++) for(let j=0;j<rows;j++){
        const lit=r()<0.42, x=x0+mx+i*ww+ww*0.17, y=top+3+j*(wh+2.3);
        R(x,y,ww*0.66,wh,lit?'#ffd873':'#274a6e',1.6);
      }
    });
    /* shop fronts */
    R(-2,BASE-7,22,7,'#3a2b3c'); R(20,BASE-7,17,7,'#123e4a'); R(63,BASE-7,17,7,'#3d2a5c'); R(80,BASE-7,22,7,'#50301c');
    [[2,16],[23,31],[66,74],[84,98]].forEach(([a,bb])=>R(a,BASE-5.6,bb-a,4.4,'#ffe6a0',2));
    for(let i=0;i<9;i++){ R(37+i*26/9,BASE-11,26/9,3.2,i%2?'#ffffff':'#e8413d',1.2); }
    R(37,BASE-7.8,26,7.8,'#5b3a26'); R(46.5,BASE-7,7,7,'#2c1c13',1.5); R(39.5,BASE-6.4,5.2,4.6,'#ffe6a0',1.5); R(55.3,BASE-6.4,5.2,4.6,'#ffe6a0',1.5);
    /* far pavement, road and crossing */
    R(-4,BASE,108,3.6,'#ded6c6'); R(-4,BASE+3.6,108,1.1,'#7f7a70');
    R(-4,BASE+4.7,108,22.3,'#454b5c');
    for(let i=0;i<7;i++) R(39.2+i*3.45,BASE+4.7,2.1,22.3,'#eeece4',1.6);
    for(let i=-1;i<13;i++){ const x=i*9+2; if(x>30&&x<62) continue; R(x,BASE+22.6,5,1.1,'#f3d15a',1.5); }
    /* near pavement: a laid grid of slabs, then its street furniture */
    R(-4,BASE+27,108,1.1,'#7f7a70'); R(-4,BASE+28.1,108,30,'#d6cfbf');
    for(let i=0;i<10;i++) R(i*12-6,BASE+28.1,0.45,30,'#bdb5a3',1.5);
    for(let j=1;j<4;j++) R(-4,BASE+28.1+j*6,108,0.45,'#bdb5a3',2);
    /* hydrant */
    R(31.4,BASE+31,3.2,7.2,'#e23b34',1.5); R(30.6,BASE+30,4.8,1.3,'#b52620',1.5); R(29.9,BASE+33,6.2,1.7,'#b52620',1.5); R(30.8,BASE+38,4.4,1.1,'#8a1c17',1.5); add('#ff7a6c',circP(33,BASE+29.4,1.4,1.4,10));
    /* a sitting cat */
    add('#1f2230',circP(50,BASE+36.2,3.6,4.6,18)); add('#1f2230',circP(50,BASE+30.6,2.7,2.5,16));
    add('#1f2230',densify([47.6,BASE+30,47.5,BASE+26.8,49.8,BASE+28.6],1)); add('#1f2230',densify([52.4,BASE+30,52.5,BASE+26.8,50.2,BASE+28.6],1));
    add('#1f2230',densify([53,BASE+40,58,BASE+39.4,59.6,BASE+36.6,58.5,BASE+36.3,57,BASE+38.2,53,BASE+38.6],1));
    add('#ffe36e',circP(48.9,BASE+30.4,0.55,0.75,8)); add('#ffe36e',circP(51.1,BASE+30.4,0.55,0.75,8));
    /* planter */
    add('#3f9e50',circP(63,BASE+30,3.4,3.2,14)); add('#52b35f',circP(68,BASE+29.2,3.8,3.6,14)); add('#3f9e50',circP(73,BASE+30,3.4,3.2,14));
    [[62.6,BASE+28.8],[66.6,BASE+27.6],[69.8,BASE+28.6],[73.4,BASE+29]].forEach(([x,y])=>add('#ff6fa8',circP(x,y,1.05,1.05,8)));
    R(60,BASE+32,16,5.6,'#a4623a',1.5); R(60,BASE+32,16,1.1,'#7d4526',1.5);
    /* street trees on the far pavement */
    [[12],[88]].forEach(([x])=>{ R(x-0.9,BASE-11,1.8,14,'#4c3423',1.5); add('#3f9e50',circP(x,BASE-15,6.6,7.2,20)); add('#62c060',circP(x-1.8,BASE-17,3.8,4,16)); });
    /* taxi, drawn about its own origin */
    const car=[], cadd=(f,ring)=>car.push({f,ring});
    cadd('rgba(8,10,20,0.42)',circP(0,5.6,19.5,2.4,30));
    cadd('#ffc928',densify([-17,1.4,-16.4,-2.6,-12,-3.6,-8,-9,7,-9,12.4,-3.6,16.6,-2.6,17.6,1.4,17,5,-17,5],1.5));
    cadd('#ff9f12',densify([-17,3,17.3,3,17,5,-17,5],1.5));
    cadd('#26354d',densify([-6.8,-7.8,-1,-7.8,-1,-3.8,-10,-3.8],1.2)); cadd('#26354d',densify([0.8,-7.8,6.2,-7.8,10.3,-3.8,0.8,-3.8],1.2));
    for(let i=0;i<14;i++){ cadd(i%2?'#ffffff':'#1c1c24',rectP(-15.2+i*2.2,-1.4,2.2,1.1,1)); cadd(i%2?'#1c1c24':'#ffffff',rectP(-15.2+i*2.2,-0.3,2.2,1.1,1)); }
    cadd('#ffffff',rectP(-3.2,-12,6.4,3,1.2)); cadd('#1c1c24',rectP(-2,-11.2,4,1.4,1));
    cadd('#fff6c8',circP(16.2,-0.6,1.3,1.5,10)); cadd('#ff4a3d',circP(-16.6,-0.4,0.8,1.3,8));
    [-10.4,10.4].forEach(x=>{ cadd('#15161e',circP(x,5,4.3,4.3,20)); cadd('#c8ccd6',circP(x,5,2.1,2.1,14)); cadd('#5c6070',circP(x,5,0.8,0.8,8)); });

    /* inverse of the kernel's r(1-k(1-r^2)): a closed-form cubic root */
    const solve=(rs,k)=>{ if(rs>=1||k<0.02) return rs; const p=(1-k)/k, q=-rs/k, D=Math.sqrt(q*q/4+p*p*p/27); return Math.cbrt(-q/2+D)+Math.cbrt(-q/2-D); };
    /* the door, its brass ring and the glass */
    const [F,f]=canvasOf(px);
    f.fillStyle=lin(f,0,0,100,100,[[0,'#1d4a50'],[1,'#0e2a32']]); f.fillRect(0,0,100,100);
    f.strokeStyle='rgba(0,0,0,0.22)'; f.lineWidth=0.5; for(let x=4;x<100;x+=8){ f.beginPath(); f.moveTo(x,0); f.lineTo(x,100); f.stroke(); }
    f.save(); f.globalCompositeOperation='destination-out'; f.beginPath(); f.arc(LX,LY,LR,0,TAU); f.fill(); f.restore();
    f.fillStyle=rad(f,LX,LY,LR*0.74,LX,LY,LR+0.5,[[0,'rgba(5,10,25,0)'],[0.8,'rgba(5,10,25,0.22)'],[1,'rgba(5,10,25,0.72)']]); f.beginPath(); f.arc(LX,LY,LR,0,TAU); f.fill();
    f.strokeStyle='rgba(255,255,255,0.46)'; f.lineWidth=2.6; f.beginPath(); f.arc(LX,LY,LR-5,Math.PI*1.08,Math.PI*1.4); f.stroke();
    f.strokeStyle='rgba(255,255,255,0.3)'; f.lineWidth=1.4; f.beginPath(); f.arc(LX,LY,LR-5,Math.PI*1.46,Math.PI*1.53); f.stroke();
    f.save(); f.shadowColor='rgba(0,0,0,0.6)'; f.shadowBlur=2.2*sc; f.shadowOffsetY=0.9*sc; f.strokeStyle='#caa24a'; f.lineWidth=6; f.beginPath(); f.arc(LX,LY,LR+3,0,TAU); f.stroke(); f.restore();
    f.strokeStyle=lin(f,14,14,86,86,[[0,'#fff3c0'],[0.28,'#e4bb5c'],[0.55,'#9d7227'],[0.8,'#e9c66e'],[1,'#7e5a1c']]); f.lineWidth=6; f.beginPath(); f.arc(LX,LY,LR+3,0,TAU); f.stroke();
    f.strokeStyle='rgba(70,44,10,0.7)'; f.lineWidth=0.7; f.beginPath(); f.arc(LX,LY,LR+0.3,0,TAU); f.stroke();
    f.strokeStyle='rgba(255,246,204,0.75)'; f.lineWidth=0.5; f.beginPath(); f.arc(LX,LY,LR+5.8,0,TAU); f.stroke();

    const O=[0,0];
    return (c,t)=>{
      const u=t%P;
      const k=lerp(0.04,0.92,E.inOut(seg(u,0.6,1.75))*(1-E.inOut(seg(u,2.75,3.9))));
      const carX=lerp(-30,130,u/P);
      const warp=(x,y,o)=>{ const dx=(x-LX)/LR, dy=(y-LY)/LR, rs=Math.hypot(dx,dy); if(rs<1e-5||rs>=1){ o[0]=x; o[1]=y; return; } const f2=solve(rs,k)/rs*LR; o[0]=LX+dx*f2; o[1]=LY+dy*f2; };
      const carW=(x,y,o)=>warp(x+carX,y+BASE+9.5,o);
      base(c,sc);
      c.save(); c.beginPath(); c.arc(LX,LY,LR+0.6,0,TAU); c.clip();
      c.fillStyle=lin(c,0,4,0,BASE,[[0,'#2f6fe0'],[0.6,'#8cc4f4'],[1,'#ffe2b6']]); c.fillRect(0,0,100,100);
      for(const g of groups){ rings(c,g.list,warp,O); c.fillStyle=g.fill; c.fill(); }
      for(const p of car){ rings(c,[p.ring],carW,O); c.fillStyle=p.f; c.fill(); }
      c.restore();
      c.setTransform(1,0,0,1,0,0); c.drawImage(F,0,0); base(c,sc);
    };
  }},

/* ------------------------------------------------------------------ LENS MAGNIFIER */
{ id:'lensmag', name:'Lens Magnifier', section:'Warping', isNew:true, still:1.35,
  line:'A magnifying glass glides over a treasure map and blows up what is under it.',
  make(px){
    const P=4.8, sc=px/100, Z=px*2, LR=27;
    const M=document.createElement('canvas'); M.width=M.height=Z; const m=M.getContext('2d'); m.setTransform(Z/100,0,0,Z/100,0,0);
    m.fillStyle=lin(m,0,0,100,100,[[0,'#3ea9c4'],[1,'#1f7ea6']]); m.fillRect(0,0,100,100);
    /* regular rows of little waves */
    m.strokeStyle='rgba(235,250,255,0.55)'; m.lineWidth=0.42; m.lineCap='round';
    for(let j=0;j<12;j++) for(let i=0;i<13;i++){ const x=i*8.4+(j%2?4.2:0)-2, y=j*8.2+4; m.beginPath(); m.moveTo(x,y); m.quadraticCurveTo(x+0.9,y-1,x+1.8,y); m.quadraticCurveTo(x+2.7,y+1,x+3.6,y); m.stroke(); }
    const ISL=smooth([46,14, 62,10, 80,15, 93,29, 96,48, 91,67, 80,82, 62,90, 49,85, 46,73, 39,65, 43,52, 37,40, 40,24],10);
    const isl=(c,k)=>{ c.beginPath(); const cx=68, cy=50; for(let i=0;i<ISL.length;i+=2){ const x=cx+(ISL[i]-cx)*k, y=cy+(ISL[i+1]-cy)*k; if(i) c.lineTo(x,y); else c.moveTo(x,y); } c.closePath(); };
    m.lineJoin='round';
    [[9,'rgba(170,232,236,0.34)'],[5,'rgba(190,240,240,0.5)']].forEach(([w,k])=>{ m.strokeStyle=k; m.lineWidth=w; isl(m,1); m.stroke(); });
    m.fillStyle='#f1dca6'; isl(m,1); m.fill();
    m.fillStyle=rad(m,66,46,4,68,50,46,[[0,'#b7d67a'],[1,'#74ad54']]); isl(m,0.9); m.fill();
    m.strokeStyle='rgba(90,60,30,0.6)'; m.lineWidth=0.5; isl(m,1); m.stroke();
    /* grass ticks on a staggered grid, inside the land only */
    m.save(); isl(m,0.9); m.clip(); m.strokeStyle='rgba(58,112,50,0.42)'; m.lineWidth=0.34; m.lineCap='round';
    for(let j=0;j<24;j++) for(let i=0;i<30;i++){ const x=i*3.7+(j%2?1.85:0), y=j*3.9+2; m.beginPath(); m.moveTo(x-0.55,y-0.75); m.lineTo(x,y); m.lineTo(x+0.55,y-0.75); m.stroke(); }
    m.restore();
    const mount=(x,y,h)=>{ const w_=h*0.72; m.fillStyle='#8c6a4c'; m.beginPath(); m.moveTo(x-w_,y); m.lineTo(x,y-h); m.lineTo(x+w_,y); m.closePath(); m.fill(); m.fillStyle='#6d4f38'; m.beginPath(); m.moveTo(x,y-h); m.lineTo(x+w_,y); m.lineTo(x+w_*0.12,y); m.closePath(); m.fill(); m.fillStyle='#ffffff'; m.beginPath(); m.moveTo(x-w_*0.32,y-h*0.56); m.lineTo(x,y-h); m.lineTo(x+w_*0.32,y-h*0.56); m.lineTo(x+w_*0.1,y-h*0.66); m.lineTo(x-w_*0.08,y-h*0.53); m.closePath(); m.fill(); };
    mount(52,29,9); mount(77,29,10); mount(64.5,28,12.5);
    const tree=(x,y)=>{ m.fillStyle='#6b4a2c'; m.fillRect(x-0.3,y-1,0.6,2); m.fillStyle='#2f7d3f'; m.beginPath(); m.moveTo(x-1.9,y); m.lineTo(x,y-3.6); m.lineTo(x+1.9,y); m.closePath(); m.fill(); m.fillStyle='#3f9a4a'; m.beginPath(); m.moveTo(x-1.5,y-1.6); m.lineTo(x,y-4.8); m.lineTo(x+1.5,y-1.6); m.closePath(); m.fill(); };
    for(let j=0;j<3;j++) for(let i=0;i<4;i++) tree(78+i*3.8+(j%2?1.9:0),46+j*4.1);
    for(let j=0;j<2;j++) for(let i=0;i<5;i++) tree(50+i*3.8+(j%2?1.9:0),71+j*4.1);
    /* castle */
    const cx=68, cy=68;
    m.fillStyle='#d8d2c4'; m.fillRect(cx-5,cy-5,10,6); m.fillRect(cx-6.6,cy-8,3.2,9); m.fillRect(cx+3.4,cy-8,3.2,9);
    m.fillStyle='#b13a3a'; [[cx-5,cy-8],[cx+5,cy-8]].forEach(([x,y])=>{ m.beginPath(); m.moveTo(x-2.2,y); m.lineTo(x,y-3.4); m.lineTo(x+2.2,y); m.closePath(); m.fill(); });
    m.fillStyle='#4a3a30'; m.beginPath(); m.arc(cx,cy+1,1.5,Math.PI,TAU); m.rect(cx-1.5,cy+1,3,0); m.fill(); m.fillRect(cx-1.5,cy-0.4,3,1.4);
    m.fillStyle='#b8b1a2'; for(let i=0;i<3;i++) m.fillRect(cx-3.4+i*2.6,cy-6.1,1.4,1.2);
    /* two palms and the buried chest, right by the X */
    const palm=(x,y,h,lean)=>{ m.strokeStyle='#7a5230'; m.lineWidth=0.72; m.beginPath(); m.moveTo(x,y); m.quadraticCurveTo(x+lean*0.3,y-h*0.6,x+lean,y-h); m.stroke(); m.strokeStyle='#2f8a3f'; m.lineWidth=0.62; [[-3.4,0.9],[-2.5,-1],[0.2,-1.7],[2.8,-0.9],[3.5,1]].forEach(([dx,dy])=>{ m.beginPath(); m.moveTo(x+lean,y-h); m.quadraticCurveTo(x+lean+dx*0.55,y-h+dy-1,x+lean+dx,y-h+dy+0.7); m.stroke(); }); };
    palm(58.2,38,6.4,-1); palm(72.4,46,6.4,1.1);
    const cst=(x,y)=>{ m.fillStyle='#8a4f24'; m.beginPath(); m.roundRect(x-2.5,y-1.4,5,3,0.4); m.fill(); m.fillStyle='#a8622e'; m.beginPath(); m.moveTo(x-2.5,y-1.4); m.quadraticCurveTo(x,y-3.8,x+2.5,y-1.4); m.closePath(); m.fill(); m.fillStyle='#f0c24a'; m.fillRect(x-2.5,y-1.2,5,0.42); m.fillRect(x-0.5,y-1.6,1,1.5); };
    cst(72.2,34.8);
    /* trail and X */
    m.strokeStyle='#d7263d'; m.lineWidth=0.95; m.setLineDash([0.05,2.1]); m.beginPath(); m.moveTo(42,66); m.bezierCurveTo(52,60,50,46,60,44); m.bezierCurveTo(66,43,62,38,65.5,37.5); m.stroke(); m.setLineDash([]);
    m.strokeStyle='#c9142c'; m.lineWidth=1.7; m.lineCap='butt'; m.beginPath(); m.moveTo(62,34.5); m.lineTo(68,40.5); m.moveTo(68,34.5); m.lineTo(62,40.5); m.stroke(); m.lineCap='round';
    /* ship */
    const sx=28, sy=68;
    m.fillStyle='#7a4a26'; m.beginPath(); m.moveTo(sx-6.5,sy); m.lineTo(sx+6.5,sy); m.lineTo(sx+4.4,sy+3); m.lineTo(sx-4.4,sy+3); m.closePath(); m.fill();
    m.strokeStyle='#4f2f18'; m.lineWidth=0.5; m.beginPath(); m.moveTo(sx,sy); m.lineTo(sx,sy-9.8); m.stroke();
    m.fillStyle='#fff8e8'; m.beginPath(); m.moveTo(sx+0.5,sy-9.2); m.quadraticCurveTo(sx+7,sy-5.5,sx+0.5,sy-1.4); m.closePath(); m.fill();
    m.fillStyle='#fff'; m.beginPath(); m.moveTo(sx-0.5,sy-8); m.quadraticCurveTo(sx-5,sy-4.8,sx-0.5,sy-1.4); m.closePath(); m.fill();
    m.fillStyle='#d7263d'; m.beginPath(); m.moveTo(sx,sy-9.8); m.lineTo(sx+2.6,sy-9); m.lineTo(sx,sy-8.2); m.closePath(); m.fill();
    /* compass */
    m.save(); m.translate(17,17);
    m.strokeStyle='rgba(255,248,226,0.85)'; m.lineWidth=0.55; m.beginPath(); m.arc(0,0,8.4,0,TAU); m.stroke();
    for(let i=0;i<8;i++){ m.save(); m.rotate(i*TAU/8); const big=i%2===0, h=big?10.5:6.4; m.fillStyle=big?'#fff5d8':'#f0c260'; m.beginPath(); m.moveTo(0,-h); m.lineTo(big?1.8:1.3,0); m.lineTo(0,big?1:0.8); m.closePath(); m.fill(); m.fillStyle=big?'#c79f4c':'#a3762e'; m.beginPath(); m.moveTo(0,-h); m.lineTo(big?-1.8:-1.3,0); m.lineTo(0,big?1:0.8); m.closePath(); m.fill(); m.restore(); }
    m.restore();
    /* aged-paper pass over everything */
    m.globalCompositeOperation='multiply'; m.fillStyle=rad(m,50,50,18,50,50,74,[[0,'#fff6df'],[0.7,'#f1dfb6'],[1,'#b99a66']]); m.fillRect(0,0,100,100); m.globalCompositeOperation='source-over';
    m.strokeStyle='rgba(70,44,20,0.17)'; m.lineWidth=0.3; [33.3,66.6].forEach(x=>{ m.beginPath(); m.moveTo(x,0); m.lineTo(x,100); m.stroke(); }); m.beginPath(); m.moveTo(0,50); m.lineTo(100,50); m.stroke();
    m.strokeStyle='rgba(255,250,235,0.17)'; [33.6,66.9].forEach(x=>{ m.beginPath(); m.moveTo(x,0); m.lineTo(x,100); m.stroke(); }); m.beginPath(); m.moveTo(0,50.3); m.lineTo(100,50.3); m.stroke();

    /* lens hardware: drawn once at a fixed place, then just moved */
    const OX=33, OY=33;
    const [G,g]=canvasOf(px);
    const hA=[OX+LR*0.72,OY+LR*0.72], hB=[OX+LR*0.72+27,OY+LR*0.72+27];
    g.save(); g.shadowColor='rgba(24,14,4,0.55)'; g.shadowBlur=3.2*sc; g.shadowOffsetX=1.8*sc; g.shadowOffsetY=2.6*sc;
    g.strokeStyle='#3a2415'; g.lineCap='round'; g.lineWidth=7.2; g.beginPath(); g.moveTo(hA[0]+6,hA[1]+6); g.lineTo(hB[0],hB[1]); g.stroke();
    g.strokeStyle='#d8ad52'; g.lineWidth=4.8; g.beginPath(); g.arc(OX,OY,LR+1.6,0,TAU); g.stroke(); g.restore();
    g.lineCap='round'; g.strokeStyle=lin(g,hA[0]+6,hA[1]+6+7,hB[0]+5,hB[1]-5,[[0,'#6e4426'],[0.5,'#8d5a30'],[1,'#3a2415']]); g.lineWidth=7.2; g.beginPath(); g.moveTo(hA[0]+6,hA[1]+6); g.lineTo(hB[0],hB[1]); g.stroke();
    g.strokeStyle='rgba(255,226,180,0.35)'; g.lineWidth=1.2; g.beginPath(); g.moveTo(hA[0]+7,hA[1]+3.5); g.lineTo(hB[0]+1,hB[1]-3.4); g.stroke();
    g.lineCap='butt'; g.strokeStyle=lin(g,hA[0],hA[1]+6,hA[0]+6,hA[1],[[0,'#fff0b8'],[0.5,'#d8ad52'],[1,'#8c6420']]); g.lineWidth=8; g.beginPath(); g.moveTo(hA[0]+1,hA[1]+1); g.lineTo(hA[0]+7,hA[1]+7); g.stroke(); g.lineCap='round';
    g.strokeStyle=lin(g,OX-26,OY-26,OX+26,OY+26,[[0,'#fff6cc'],[0.32,'#e6bd5e'],[0.58,'#a57a2c'],[0.82,'#f0cf7a'],[1,'#8a6420']]); g.lineWidth=4.8; g.beginPath(); g.arc(OX,OY,LR+1.6,0,TAU); g.stroke();
    g.strokeStyle='rgba(72,46,12,0.7)'; g.lineWidth=0.6; g.beginPath(); g.arc(OX,OY,LR-0.6,0,TAU); g.stroke();
    g.strokeStyle='rgba(255,248,214,0.8)'; g.lineWidth=0.45; g.beginPath(); g.arc(OX,OY,LR+3.8,0,TAU); g.stroke();
    /* the glass itself */
    const [V,v]=canvasOf(px);
    v.save(); v.beginPath(); v.arc(OX,OY,LR,0,TAU); v.clip();
    v.fillStyle=rad(v,OX,OY,LR*0.6,OX,OY,LR,[[0,'rgba(10,30,60,0)'],[0.8,'rgba(10,30,60,0.06)'],[1,'rgba(10,30,60,0.38)']]); v.fillRect(0,0,100,100);
    v.restore();
    v.strokeStyle='rgba(255,255,255,0.74)'; v.lineWidth=2.2; v.beginPath(); v.arc(OX,OY,LR-4.4,Math.PI*1.08,Math.PI*1.42); v.stroke();
    v.strokeStyle='rgba(255,255,255,0.5)'; v.lineWidth=1.5; v.beginPath(); v.arc(OX,OY,LR-4.4,Math.PI*1.48,Math.PI*1.55); v.stroke();

    const stops=[[33,63],[65,37.5],[66,66]], legs=3, LEG=P/legs, MOVE=0.62;
    return (c,t)=>{
      const u=t%P;
      const i=Math.floor(u/LEG)%legs, f=(u-i*LEG)/LEG;
      const a=stops[i], b=stops[(i+1)%legs];
      const q=E.inOut(clamp(f/MOVE));
      const x=lerp(a[0],b[0],q), y=lerp(a[1],b[1],q);
      const zoom=lerp(1.75,2.5,1-Math.sin(clamp(f/MOVE)*Math.PI));
      base(c,1); c.drawImage(M,0,0,px,px);
      base(c,sc);
      c.drawImage(G,x-OX,y-OY,100,100);
      c.save(); c.beginPath(); c.arc(x,y,LR+0.2,0,TAU); c.clip();
      c.fillStyle='#000'; c.fillRect(x-LR-1,y-LR-1,2*LR+2,2*LR+2);
      c.translate(x,y); c.scale(zoom,zoom); c.translate(-x,-y); c.drawImage(M,0,0,100,100);
      c.restore();
      c.drawImage(V,x-OX,y-OY,100,100);
    };
  }}

);
})();
