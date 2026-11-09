/* Batch b1: Colouring (vignette, duotone, lightleak, huecycle, invert) and Keying (wipe, radialwipe). */
(function(){
'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

const smooth=s=>{ s=clamp(s); return s*s*(3-2*s); };
function reset(c){ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; }

/* a tapered limb: the convex hull of two circles */
function capsule(c,ax,ay,ar,bx,by,br){
  const a=Math.atan2(by-ay,bx-ax), d=Math.hypot(bx-ax,by-ay)||.001, o=Math.acos(clamp((ar-br)/d,-1,1));
  c.beginPath(); c.arc(ax,ay,ar,a+o,a-o+TAU); c.arc(bx,by,br,a-o,a+o); c.closePath();
}
function blob(c,x,y,rx,ry,rot,stops){
  c.save(); c.translate(x,y); c.rotate(rot); c.scale(rx,ry);
  const g=c.createRadialGradient(0,0,0,0,0,1); for(const [p,col] of stops) g.addColorStop(p,col);
  c.fillStyle=g; c.beginPath(); c.arc(0,0,1,0,TAU); c.fill(); c.restore();
}
const soft=(c,x,y,rx,ry,rot,rgb,a)=>blob(c,x,y,rx,ry,rot,[[0,'rgba('+rgb+','+a+')'],[.45,'rgba('+rgb+','+(a*.55)+')'],[.75,'rgba('+rgb+','+(a*.14)+')'],[1,'rgba('+rgb+',0)']]);
/* painted small and brought back up: out of focus without ctx.filter, which iPhones do not have */
function defocus(px,res,paint){
  const [A,a]=canvasOf(res); paint(a);
  const mid=Math.min(px,res*3), M=document.createElement('canvas'); M.width=M.height=mid; const m=M.getContext('2d'); m.imageSmoothingQuality='high'; m.drawImage(A,0,0,mid,mid);
  const O=document.createElement('canvas'); O.width=O.height=px; const o=O.getContext('2d'); o.imageSmoothingQuality='high'; o.drawImage(M,0,0,px,px);
  return O;
}
function leaf(c,x0,y0,x1,y1,w,a,b){
  const dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy);
  c.save(); c.translate(x0,y0); c.rotate(Math.atan2(dy,dx));
  const g=c.createLinearGradient(0,-w,0,w); g.addColorStop(0,a); g.addColorStop(1,b); c.fillStyle=g;
  c.beginPath(); c.moveTo(0,0); c.bezierCurveTo(L*.22,-w*1.25,L*.72,-w*.9,L,0); c.bezierCurveTo(L*.72,w*.9,L*.22,w*1.25,0,0); c.closePath(); c.fill();
  c.strokeStyle='rgba(18,66,28,.55)'; c.lineCap='round'; c.lineWidth=.6; c.beginPath(); c.moveTo(0,0); c.lineTo(L*.96,0); c.stroke();
  c.lineWidth=.32; for(let i=1;i<=5;i++){ const s=i/6.2*L, v=w*.72*(1-i/7.5); c.beginPath(); c.moveTo(s,0); c.lineTo(s+L*.11,-v); c.moveTo(s,0); c.lineTo(s+L*.11,v); c.stroke(); }
  c.restore();
}
function bz(p0,p1,p2,p3,t){ const m=1-t; return [m*m*m*p0[0]+3*m*m*t*p1[0]+3*m*t*t*p2[0]+t*t*t*p3[0], m*m*m*p0[1]+3*m*m*t*p1[1]+3*m*t*t*p2[1]+t*t*t*p3[1]]; }

window.FX_TILES.push(

/* ---------- VIGNETTE: a sunflower, and the day falls away round it ---------- */
{ id:'vignette', name:'Vignette', section:'Colouring', isNew:true, still:2.4,
  line:'The edges sink into shadow and close in round one sunlit flower.',
  make(px){
    const P=4.4, sc=px/100, HX=50, HY=42;
    const far=defocus(px,40,x=>{
      let g=x.createLinearGradient(0,0,0,100);
      g.addColorStop(0,'#1f8fe0'); g.addColorStop(.46,'#79cdf3'); g.addColorStop(.64,'#e3f5df'); g.addColorStop(.68,'#a9d463'); g.addColorStop(1,'#5f9e33');
      x.fillStyle=g; x.fillRect(0,0,100,100);
      x.fillStyle='#7db84a'; x.beginPath(); x.moveTo(0,72); x.quadraticCurveTo(28,60,58,69); x.quadraticCurveTo(82,76,100,63); x.lineTo(100,100); x.lineTo(0,100); x.closePath(); x.fill();
      x.fillStyle='#ffd23e'; for(let row=0;row<2;row++) for(let i=0;i<9;i++){ const xx=(i+.5*(row%2))*12.5-3, yy=76+row*12+Math.sin(i*1.7)*1.6; x.beginPath(); x.arc(xx,yy,3.4+row*1.2,0,TAU); x.fill(); }
    });
    const [B,b]=canvasOf(px);
    b.save(); b.setTransform(1,0,0,1,0,0); b.drawImage(far,0,0); b.restore();
    /* the stem and its two leaves */
    leaf(b,49,88,7,76,12,'#6cc24a','#2c7a35');
    leaf(b,51,93,95,84,11,'#57ae42','#23692f');
    let g=b.createLinearGradient(44,0,56,0); g.addColorStop(0,'#3f8f3a'); g.addColorStop(.45,'#79c95a'); g.addColorStop(1,'#2d7031'); b.fillStyle=g;
    b.beginPath(); b.moveTo(46.6,60); b.bezierCurveTo(46.6,76,45.4,88,44.8,100); b.lineTo(53.2,100); b.bezierCurveTo(53.6,88,53.4,76,53.4,60); b.closePath(); b.fill();

    /* the head, on its own layer so it can sway */
    const [H,h]=canvasOf(px), R=38.5, r0=15.5;
    function petal(ang,len,wid,base,cols){
      h.save(); h.translate(50,50); h.rotate(ang);
      const pg=h.createLinearGradient(base,0,base+len,0); cols.forEach(([p,col])=>pg.addColorStop(p,col)); h.fillStyle=pg;
      h.beginPath(); h.moveTo(base-3,0); h.bezierCurveTo(base+len*.22,-wid,base+len*.7,-wid*.95,base+len,0); h.bezierCurveTo(base+len*.7,wid*.95,base+len*.22,wid,base-3,0); h.closePath(); h.fill();
      h.shadowColor='rgba(0,0,0,0)';
      h.strokeStyle='rgba(176,92,0,.42)'; h.lineCap='round'; h.lineWidth=.38; h.beginPath(); h.moveTo(base+3,0); h.lineTo(base+len*.86,0); h.moveTo(base+4,-wid*.34); h.lineTo(base+len*.66,-wid*.3); h.moveTo(base+4,wid*.34); h.lineTo(base+len*.66,wid*.3); h.stroke();
      h.restore();
    }
    const N=19, step=TAU/N;
    h.save(); h.shadowColor='rgba(70,36,0,.5)'; h.shadowBlur=1.6*sc; h.shadowOffsetY=.4*sc;
    for(let i=0;i<N;i++){ h.shadowColor='rgba(70,36,0,.5)'; petal(i*step+step*.5,R-r0+2+hash(i,3)*1.2,6.8,r0,[[0,'#c9690a'],[.45,'#ee9d12'],[1,'#f9c32b']]); }
    for(let i=0;i<N;i++){ h.shadowColor='rgba(120,60,0,.55)'; petal(i*step,R-r0-1.4+hash(i,8)*1.4,6.6,r0,[[0,'#e8820a'],[.32,'#ffb51c'],[.8,'#ffdc3f'],[1,'#fff07a']]); }
    h.restore();
    /* the seed head: a true phyllotaxis spiral, nothing placed by hand */
    h.save(); h.shadowColor='rgba(60,28,0,.65)'; h.shadowBlur=2.2*sc;
    g=h.createRadialGradient(47,47,1,50,50,r0+.6); g.addColorStop(0,'#7c6a20'); g.addColorStop(.32,'#50310f'); g.addColorStop(.82,'#2b1707'); g.addColorStop(1,'#1c0e04'); h.fillStyle=g; h.beginPath(); h.arc(50,50,r0+.6,0,TAU); h.fill(); h.restore();
    const SEEDS=340, GA=TAU*(1-1/1.61803398875);
    for(let i=4;i<SEEDS;i++){ const q=i/SEEDS, rr=r0*Math.sqrt(q)*.98, a=i*GA, x=50+Math.cos(a)*rr, y=50+Math.sin(a)*rr;
      h.fillStyle=q<.2?'#c9b13e':q<.55?'#8a5a1a':q<.8?'#5d3a12':'#a2641c'; h.beginPath(); h.arc(x,y,.3+.34*Math.sqrt(q),0,TAU); h.fill(); }
    g=h.createRadialGradient(44,43,0,50,50,r0); g.addColorStop(0,'rgba(255,240,180,.24)'); g.addColorStop(.6,'rgba(255,240,180,0)'); g.addColorStop(1,'rgba(0,0,0,.18)'); h.fillStyle=g; h.beginPath(); h.arc(50,50,r0,0,TAU); h.fill();

    return (c,t)=>{
      const u=t%P, w=TAU*u/P;
      const a=E.inOut(seg(u,.35,1.7))*(1-E.inOut(seg(u,3.35,4.3)))*(1+.03*Math.sin(w*3));
      reset(c); c.drawImage(B,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      const sway=Math.sin(w)*.035;
      c.save(); c.translate(HX+Math.sin(w)*.5,HY+Math.cos(w)*.25); c.rotate(sway); c.drawImage(H,-50,-50,100,100); c.restore();
      if(a>.002){
        const R0=lerp(82,29,a), R1=lerp(120,57,a), vg=c.createRadialGradient(50,44,R0,50,44,R1);
        for(let i=0;i<=8;i++){ const s=i/8; vg.addColorStop(s,'rgba(5,4,14,'+(Math.min(1,a*1.05)*.985*smooth(s)).toFixed(4)+')'); }
        c.fillStyle=vg; c.fillRect(0,0,100,100);
      }
      reset(c);
    };
  }},

/* ---------- DUOTONE: a skater, every landing a new pair of inks ---------- */
{ id:'duotone', name:'Duotone', section:'Colouring', isNew:true, still:2.1,
  line:'Every landing re-inks the whole picture in a new pair of colours.',
  make(px){
    const P=4.5, HOP=1.5, sc=px/100;
    const PAL=[{s:[44,18,140],h:[255,156,92]},{s:[5,50,66],h:[201,255,92]},{s:[150,10,50],h:[255,236,150]}];
    let S=PAL[0].s, H=PAL[0].h;
    const tone=L=>{ L=clamp(L); return 'rgb('+Math.round(lerp(S[0],H[0],L))+','+Math.round(lerp(S[1],H[1],L))+','+Math.round(lerp(S[2],H[2],L))+')'; };
    const fil=(c,L)=>{ c.fillStyle=tone(L); c.fill(); };
    const limb=(c,a,b,ra,rb,L)=>{ capsule(c,a[0],a[1],ra,b[0],b[1],rb); fil(c,L); };
    function ik(ax,ay,bx,by,l1,l2,side){ const dx=bx-ax, dy=by-ay, D=Math.hypot(dx,dy)||1, d=Math.min(D,l1+l2-.05), ux=dx/D, uy=dy/D, a=(l1*l1-l2*l2+d*d)/(2*d), h=Math.sqrt(Math.max(0,l1*l1-a*a)); return [ax+ux*a-uy*h*side, ay+uy*a+ux*h*side]; }
    function skater(c,tuck){
      const hx=-1.2, hy=-lerp(35,27,tuck), sx=hx+2.8, sy=hy-23;
      /* board */
      c.lineCap='round'; c.lineJoin='round';
      c.fillStyle=tone(.72); [[-17.5],[17.5]].forEach(([x])=>{ c.beginPath(); c.moveTo(x-3,1); c.lineTo(x+3,1); c.lineTo(x+1.6,4.2); c.lineTo(x-1.6,4.2); c.closePath(); c.fill(); });
      c.strokeStyle=tone(.03); c.lineWidth=3; c.beginPath(); c.moveTo(-32,-4.5); c.quadraticCurveTo(-27,0,-22,0); c.lineTo(22,0); c.quadraticCurveTo(27,0,32,-4.5); c.stroke();
      c.strokeStyle=tone(.82); c.lineWidth=.7; c.beginPath(); c.moveTo(-21,.2); c.lineTo(21,.2); c.stroke();
      [-17.5,17.5].forEach(x=>{ c.beginPath(); c.arc(x,5.2,3.9,0,TAU); fil(c,.03); c.beginPath(); c.arc(x,5.2,1.7,0,TAU); fil(c,.9); });
      /* arms sit behind the hoodie */
      const shL=[sx-10.8,sy+3.2], shR=[sx+10.8,sy+3.2];
      const handL=[sx-33.5,sy-5-tuck*5], handR=[sx+33.5,sy+11-tuck*9];
      const elL=ik(shL[0],shL[1],handL[0],handL[1],13.8,13.8,-1), elR=ik(shR[0],shR[1],handR[0],handR[1],13.8,13.8,1);
      limb(c,shL,elL,4.7,3.7,.3); limb(c,elL,handL,3.7,2.5,.3); limb(c,shR,elR,4.7,3.7,.3); limb(c,elR,handR,3.7,2.5,.3);
      [[elL,handL],[elR,handR]].forEach(([e,h])=>{ const dx=h[0]-e[0], dy=h[1]-e[1], d=Math.hypot(dx,dy)||1; c.beginPath(); c.arc(h[0]+dx/d*2,h[1]+dy/d*2,3.1,0,TAU); fil(c,.9); });
      /* legs: knees bend outward over the two feet */
      const ankL=[-14,-9.2], ankR=[12,-9.2], hipL=[hx-4.6,hy+1], hipR=[hx+4.6,hy+1];
      const knL=ik(hipL[0],hipL[1],ankL[0],ankL[1],15,15.8,1), knR=ik(hipR[0],hipR[1],ankR[0],ankR[1],15,15.8,-1);
      limb(c,hipL,knL,6.3,4.7,.13); limb(c,knL,ankL,4.7,3.3,.13); limb(c,hipR,knR,6.3,4.7,.13); limb(c,knR,ankR,4.7,3.3,.13);
      c.beginPath(); c.ellipse(hx,hy+1.6,8.6,5.4,0,0,TAU); fil(c,.13);
      limb(c,[lerp(hipL[0],knL[0],.5)-.3,lerp(hipL[1],knL[1],.5)-2.3],[lerp(hipL[0],knL[0],.95),lerp(hipL[1],knL[1],.95)-2.1],1,.75,.32);
      limb(c,[lerp(hipR[0],knR[0],.5)+.3,lerp(hipR[1],knR[1],.5)-2.3],[lerp(hipR[0],knR[0],.95),lerp(hipR[1],knR[1],.95)-2.1],1,.75,.32);
      /* sneakers, side on, toes along the deck */
      [ankL,ankR].forEach(([x])=>{
        c.beginPath(); c.roundRect(x-3.5,-11,7,2.8,.8); fil(c,.94);
        c.beginPath(); c.moveTo(x-5.6,-2.2); c.lineTo(x-5.6,-7); c.quadraticCurveTo(x-5.6,-8.6,x-4,-8.6); c.lineTo(x+.4,-8.6); c.quadraticCurveTo(x+2.6,-6.8,x+4.6,-6.4); c.quadraticCurveTo(x+7.8,-5.8,x+7.8,-2.2); c.closePath(); fil(c,.12);
        c.beginPath(); c.roundRect(x-6,-3.2,14.2,1.8,.9); fil(c,.95);
        c.strokeStyle=tone(.9); c.lineWidth=.55; c.beginPath(); c.moveTo(x+.2,-7.2); c.lineTo(x+2,-5.9); c.moveTo(x+1.9,-6.9); c.lineTo(x+3.5,-5.6); c.stroke();
      });
      /* hoodie */
      const torso=()=>{ c.beginPath(); c.moveTo(sx-12.2,sy+2); c.bezierCurveTo(sx-14,sy+12,hx-11.4,hy-8,hx-9.8,hy+2.6); c.quadraticCurveTo(hx,hy+4.4,hx+9.8,hy+2.6); c.bezierCurveTo(hx+11.4,hy-8,sx+14,sy+12,sx+12.2,sy+2); c.bezierCurveTo(sx+7,sy-4.4,sx-7,sy-4.4,sx-12.2,sy+2); c.closePath(); };
      torso(); fil(c,.22);
      c.save(); torso(); c.clip(); c.fillStyle=tone(.92); c.fillRect(sx-20,sy+6.4,40,3); c.fillStyle=tone(.13); c.beginPath(); c.moveTo(hx-6.4,hy+5); c.lineTo(hx-4.2,hy-6.2); c.quadraticCurveTo(hx,hy-7.4,hx+4.2,hy-6.2); c.lineTo(hx+6.4,hy+5); c.closePath(); c.fill(); c.restore();
      /* hood behind the neck, then the head */
      c.beginPath(); c.moveTo(sx-8.6,sy+2); c.bezierCurveTo(sx-10,sy-7.4,sx+10,sy-7.4,sx+8.6,sy+2); c.quadraticCurveTo(sx,sy+5,sx-8.6,sy+2); c.closePath(); fil(c,.36);
      limb(c,[sx+.5,sy-.4],[sx+1,sy-6],3,3,.68);
      c.strokeStyle=tone(.92); c.lineWidth=.6; c.lineCap='round'; c.beginPath(); c.moveTo(sx-1.8,sy+1.6); c.lineTo(sx-2.2,sy+5.4); c.moveTo(sx+2.6,sy+1.6); c.lineTo(sx+3,sy+5.4); c.stroke();
      const hcx=sx+1.4, hcy=sy-12.6, R=8.2;
      c.save(); c.translate(hcx,hcy);
      c.beginPath(); c.ellipse(-7.4,1.4,1.8,2.5,0,0,TAU); fil(c,.74);
      c.beginPath(); c.arc(0,0,R,0,TAU); fil(c,.92);
      c.save(); c.beginPath(); c.arc(0,0,R,0,TAU); c.clip(); c.beginPath(); c.arc(4.4,-1,R+1.6,0,TAU); c.rect(R+4,-R-4,-2*R-16,2*R+8); c.fillStyle=tone(.72); c.fill('evenodd'); c.restore();
      c.beginPath(); c.moveTo(7.5,-.6); c.quadraticCurveTo(10.6,2.6,7.4,3.2); c.closePath(); fil(c,.8);
      c.beginPath(); c.ellipse(3.5,-.3,1.05,1.35,0,0,TAU); fil(c,.03);
      c.strokeStyle=tone(.05); c.lineWidth=.8; c.beginPath(); c.moveTo(1.5,-3); c.quadraticCurveTo(3.8,-4.2,6.2,-3.1); c.stroke();
      c.lineWidth=.75; c.beginPath(); c.moveTo(1.4,4.3); c.quadraticCurveTo(4,5.8,6.6,4); c.stroke();
      /* beanie */
      c.beginPath(); c.moveTo(-9.2,-1.8); c.bezierCurveTo(-9.4,-12.5,9,-12.5,9.2,-3); c.closePath(); fil(c,.07);
      c.save(); c.translate(0,-3); c.rotate(.075); c.beginPath(); c.roundRect(-9.8,-1.7,19.6,3.6,1.5); fil(c,.46); c.restore();
      c.beginPath(); c.arc(-.5,-11.2,2.6,0,TAU); fil(c,.94);
      c.restore();
    }
    return (c,t)=>{
      const u=t%P, k=Math.floor(u/HOP)%3, f=(u%HOP)/HOP;
      const a=PAL[(k+2)%3], b=PAL[k], m=E.inOut(clamp(f/.16));
      S=[0,1,2].map(i=>lerp(a.s[i],b.s[i],m)); H=[0,1,2].map(i=>lerp(a.h[i],b.h[i],m));
      reset(c); c.setTransform(sc,0,0,sc,0,0);
      c.fillStyle=tone(.42); c.fillRect(0,0,100,100);
      /* sunburst: turns exactly one wedge pair per loop */
      c.save(); c.translate(50,66); c.rotate((u/P)*TAU/8); c.fillStyle=tone(.56);
      for(let i=0;i<8;i++){ const a0=i*TAU/8, a1=a0+TAU/16; c.beginPath(); c.moveTo(0,0); c.lineTo(Math.cos(a0)*130,Math.sin(a0)*130); c.lineTo(Math.cos(a1)*130,Math.sin(a1)*130); c.closePath(); c.fill(); }
      c.restore();
      const hit=clamp(f/.035)*Math.pow(1-clamp(f/.3),3);
      const sg=c.createLinearGradient(0,30,0,92); sg.addColorStop(0,tone(1)); sg.addColorStop(1,tone(.86));
      c.strokeStyle=tone(.84); c.lineWidth=1.3; c.beginPath(); c.arc(50,66,39.5+hit*3,0,TAU); c.stroke();
      c.fillStyle=sg; c.beginPath(); c.arc(50,66,35.5+hit*2.2,0,TAU); c.fill();
      /* the skate-park floor, sliding past */
      c.fillStyle=tone(.05); c.fillRect(0,92.5,100,8); c.fillStyle=tone(.92); c.fillRect(0,92.5,100,.9);
      const off=(u/P)*100%25; c.fillStyle=tone(.42); for(let i=-1;i<5;i++) c.fillRect(i*25-off+4,96.4,13,1.5);
      const y=-11*4*f*(1-f), tuck=Math.pow(Math.sin(Math.PI*f),1.5), land=Math.pow(1-clamp(f/.14),2)+Math.pow(clamp((f-.9)/.1),2);
      const rot=-.17*Math.sin(TAU*f)*(1-.25*tuck);
      c.save(); c.translate(50,86.5+y); c.rotate(rot); c.scale(.93,.93); skater(c,clamp(tuck+land*.55)); c.restore();
      reset(c);
    };
  }},

/* ---------- LIGHT LEAK: warm light fogs the frame over a camper van ---------- */
{ id:'lightleak', name:'Light Leak', section:'Colouring', isNew:true, still:2.0,
  line:'Warm film light blooms in from the corner and drifts across the shot.',
  make(px){
    const P=4.6, sc=px/100;
    const [S,s]=canvasOf(px);
    let g=s.createLinearGradient(0,0,0,74); g.addColorStop(0,'#4f9fb6'); g.addColorStop(.6,'#a9d4cb'); g.addColorStop(1,'#f1e0bb'); s.fillStyle=g; s.fillRect(0,0,100,76);
    soft(s,24,13,30,9,0,'255,250,240',.85); soft(s,78,20,26,7,0,'255,250,240',.7);
    s.fillStyle='#2f6f7d'; s.beginPath(); s.moveTo(0,66); s.quadraticCurveTo(10,54,24,60); s.lineTo(24,80); s.lineTo(0,80); s.closePath(); s.fill();
    s.beginPath(); s.moveTo(100,62); s.quadraticCurveTo(90,52,76,62); s.lineTo(76,80); s.lineTo(100,80); s.closePath(); s.fill();
    g=s.createLinearGradient(0,76,0,100); g.addColorStop(0,'#8d8c88'); g.addColorStop(1,'#4b4a50'); s.fillStyle=g; s.fillRect(0,76,100,24);
    s.fillStyle='rgba(248,240,210,.85)'; for(let i=0;i<6;i++) s.fillRect(i*20-4,95,12,1.3);
    soft(s,50,87.5,50,6,0,'14,16,28',.8);
    /* surfboard on its rack */
    s.fillStyle='#3a3f49'; s.fillRect(34,28.5,1.8,6); s.fillRect(70,28.5,1.8,6); s.fillRect(24,29.3,58,1.5);
    g=s.createLinearGradient(0,21,0,30); g.addColorStop(0,'#ffb074'); g.addColorStop(1,'#e8603c'); s.fillStyle=g;
    const board=()=>{ s.beginPath(); s.moveTo(10,26.5); s.bezierCurveTo(26,20.5,72,20.8,92,25.2); s.bezierCurveTo(74,30.5,28,30.8,10,26.5); s.closePath(); };
    board(); s.fill(); s.save(); board(); s.clip(); s.fillStyle='#fff5e4'; s.fillRect(46,18,3.4,16); s.fillRect(51,18,1.4,16); s.restore();
    /* wheel arches come first so the body wraps over them */
    const body=c=>{ c.beginPath(); c.moveTo(14,77); c.bezierCurveTo(8.6,72,8.2,58,10.8,48); c.bezierCurveTo(13,39,19,33.5,30,33.5); c.lineTo(80,33.5); c.bezierCurveTo(88,33.5,92,38,92.5,46); c.lineTo(93,71); c.bezierCurveTo(93,75,91,77,87,77); c.closePath(); };
    s.save(); s.shadowColor='rgba(10,16,30,.5)'; s.shadowBlur=1.6*sc; s.shadowOffsetY=.5*sc; body(s); s.fillStyle='#f2e8d2'; s.fill(); s.restore();
    s.save(); body(s); s.clip();
    g=s.createLinearGradient(0,33,0,56); g.addColorStop(0,'#fff8e8'); g.addColorStop(1,'#e8dcc0'); s.fillStyle=g; s.fillRect(0,30,100,27);
    g=s.createLinearGradient(0,55,0,78); g.addColorStop(0,'#3bb2b0'); g.addColorStop(.55,'#21908f'); g.addColorStop(1,'#0f6468'); s.fillStyle=g; s.fillRect(0,55,100,24);
    s.fillStyle='rgba(255,255,255,.75)'; s.fillRect(0,54.2,100,1.1);
    s.fillStyle='rgba(255,255,255,.22)'; s.fillRect(0,58.4,100,1.4);
    g=s.createLinearGradient(8,0,100,0); g.addColorStop(0,'rgba(0,0,0,.2)'); g.addColorStop(.1,'rgba(0,0,0,0)'); g.addColorStop(.9,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.26)'); s.fillStyle=g; s.fillRect(0,30,100,50);
    s.strokeStyle='rgba(20,40,50,.42)'; s.lineWidth=.42; s.beginPath(); [24.8,43.4,60.2].forEach(x=>{ s.moveTo(x,35.5); s.lineTo(x,76); }); s.stroke();
    s.restore();
    function win(x0,y0,w,h,r,slant){
      s.save(); s.beginPath();
      if(slant){ s.moveTo(x0+w,y0); s.lineTo(x0+3.4,y0); s.quadraticCurveTo(x0+.6,y0+1,x0,y0+4); s.lineTo(x0-1.2,y0+h-1); s.quadraticCurveTo(x0-1.2,y0+h,x0,y0+h); s.lineTo(x0+w,y0+h); s.closePath(); }
      else s.roundRect(x0,y0,w,h,r);
      s.fillStyle='#d4d6d8'; s.fill(); s.lineWidth=1.3; s.strokeStyle='#c0c3c7'; s.stroke(); s.clip();
      const gg=s.createLinearGradient(x0,y0,x0+w,y0+h); gg.addColorStop(0,'#16324a'); gg.addColorStop(.55,'#32657e'); gg.addColorStop(1,'#a4dbe2'); s.fillStyle=gg; s.fillRect(x0-2,y0-1,w+4,h+2);
      s.fillStyle='rgba(255,255,255,.3)'; s.beginPath(); s.moveTo(x0+w*.22,y0-1); s.lineTo(x0+w*.5,y0-1); s.lineTo(x0+w*.26,y0+h+1); s.lineTo(x0-w*.04,y0+h+1); s.closePath(); s.fill();
      s.restore();
    }
    win(14.2,38,8.8,13,0,true); win(27,38,14.5,13,2,false); win(46,38,12.4,13,2,false); win(62.2,38,12.4,13,2,false); win(77.6,38,11.2,13,2,false);
    s.fillStyle='#aab0b6'; s.beginPath(); s.roundRect(36.6,59.4,5,1.4,.7); s.fill();
    /* headlamp and bumper */
    blob(s,10.9,62.5,2.5,4,0,[[0,'#fffbe6'],[.55,'#ffe59c'],[.8,'#c9ccd1'],[1,'#878c94']]);
    s.fillStyle='#ff8f34'; s.beginPath(); s.roundRect(10,52.4,2.4,2.8,.8); s.fill();
    g=s.createLinearGradient(0,73.5,0,78.5); g.addColorStop(0,'#f6f7f8'); g.addColorStop(.5,'#a2a7ad'); g.addColorStop(1,'#666b72'); s.fillStyle=g; s.beginPath(); s.roundRect(6.5,74,88.5,4.2,1.8); s.fill();
    /* wheels */
    [[28,79],[74,79]].forEach(([x,y])=>{
      s.fillStyle='#16343a'; s.beginPath(); s.arc(x,y-1.6,12.4,Math.PI,TAU); s.closePath(); s.fill();
      s.fillStyle='#14161c'; s.beginPath(); s.arc(x,y,10.6,0,TAU); s.fill();
      s.fillStyle='#ece8db'; s.beginPath(); s.arc(x,y,7.5,0,TAU); s.fill();
      blob(s,x,y,5.5,5.5,0,[[0,'#f8f9fa'],[.5,'#bfc4c9'],[.9,'#8a8f96'],[1,'#696e76']]);
      s.fillStyle='#50555c'; s.beginPath(); s.arc(x,y,1.5,0,TAU); s.fill();
    });
    /* a touch of lens softness, film fade and grain so it sits like a photo */
    const H=document.createElement('canvas'); H.width=H.height=Math.round(px/2); const hx=H.getContext('2d'); hx.imageSmoothingQuality='high'; hx.drawImage(S,0,0,H.width,H.height);
    s.save(); s.setTransform(1,0,0,1,0,0); s.globalAlpha=.42; s.imageSmoothingQuality='high'; s.drawImage(H,0,0,px,px); s.restore();
    s.fillStyle='rgba(40,60,80,.08)'; s.fillRect(0,0,100,100);
    const gr=rng(44); for(let i=0;i<1300;i++){ const v=gr()<.5?'255,255,255':'0,0,0'; s.fillStyle='rgba('+v+','+(gr()*.1)+')'; s.fillRect(gr()*100,gr()*100,.3,.3); }
    /* a leak is a band of fogged film: soft on the leading side, a hot core, a quicker fall-off behind it */
    const band=stops=>{ const [C,x]=canvasOf(px); const g=x.createLinearGradient(0,0,100,0); stops.forEach(([p,col])=>g.addColorStop(p,col)); x.fillStyle=g; x.fillRect(0,0,100,100); x.globalCompositeOperation='destination-in'; const v=x.createLinearGradient(0,0,0,100); v.addColorStop(0,'rgba(0,0,0,.3)'); v.addColorStop(.3,'rgba(0,0,0,1)'); v.addColorStop(.72,'rgba(0,0,0,1)'); v.addColorStop(1,'rgba(0,0,0,.2)'); x.fillStyle=v; x.fillRect(0,0,100,100); return C; };
    const WASH=band([[0,'rgba(200,40,60,0)'],[.26,'rgba(232,58,44,.5)'],[.58,'rgba(255,104,36,.74)'],[.82,'rgba(255,156,58,.46)'],[1,'rgba(255,170,70,0)']]);
    const HOT=band([[0,'rgba(255,120,40,0)'],[.3,'rgba(255,128,40,.42)'],[.55,'rgba(255,200,104,.82)'],[.64,'rgba(255,236,176,.96)'],[.76,'rgba(255,196,104,.62)'],[1,'rgba(255,120,40,0)']]);
    const MAG=band([[0,'rgba(200,20,120,0)'],[.5,'rgba(240,44,116,.8)'],[1,'rgba(255,60,90,0)']]);
    function spr(c,img,x,y,rx,ry,rot,al){ c.save(); c.translate(x,y); c.rotate(rot); c.globalAlpha=al; c.drawImage(img,-rx,-ry,rx*2,ry*2); c.restore(); }
    return (c,t)=>{
      const u=t%P, q=seg(u,.1,4.5), s0=lerp(q,E.inOut(q),.38), env=smooth(seg(u,.1,.7))*(1-smooth(seg(u,3.9,4.5)));
      const flick=.94+.06*vnoise(u*7,3), X=lerp(186,-92,s0), lean=.3;
      reset(c);
      const z=1+.035*Math.sin(Math.PI*u/P)*Math.sin(Math.PI*u/P);
      c.setTransform(z,0,0,z,(px-px*z)*.5,(px-px*z)*.55); c.drawImage(S,0,0); c.setTransform(sc,0,0,sc,0,0);
      if(env>.003){
        c.globalCompositeOperation='source-over'; c.globalAlpha=env*.08; c.fillStyle='#ff8a3c'; c.fillRect(0,0,100,100);
        spr(c,WASH,X,50,62,122,lean,env*.85*flick);
        c.globalCompositeOperation='screen';
        spr(c,MAG,X+52,50,20,122,lean,env*.8);
        spr(c,HOT,X+6,50,46,118,lean,env*flick);
      }
      reset(c);
    };
  }},

/* ---------- COLOUR CYCLE: a butterfly going round the wheel ---------- */
{ id:'huecycle', name:'Colour Cycle', section:'Colouring', isNew:true, still:0.1,
  line:'Every colour in the butterfly turns steadily round the colour wheel.',
  make(px){
    const P=4, sc=px/100;
    const fore=c=>{ c.beginPath(); c.moveTo(2.5,-9); c.bezierCurveTo(10,-30,28,-41.5,45,-40.5); c.bezierCurveTo(49,-40.2,50.8,-36.4,49.2,-32); c.bezierCurveTo(46.5,-22,42.5,-11,36,-3); c.bezierCurveTo(27,-.5,12,-2,2.5,-5); c.closePath(); };
    const hind=c=>{ c.beginPath(); c.moveTo(2.5,-5); c.bezierCurveTo(14,-5.5,30,-5,37.5,2.5); c.bezierCurveTo(41,12,36.5,23,30,29); c.bezierCurveTo(24.5,34.5,17,38.5,11,36); c.bezierCurveTo(6,33.5,4,26,3.2,16); c.bezierCurveTo(2.7,8,2.5,0,2.5,-5); c.closePath(); };
    const FE=[[49.2,-32],[46.5,-22],[42.5,-11],[36,-3]], HE1=[[37.5,2.5],[41,12],[36.5,23],[30,29]], HE2=[[30,29],[24.5,34.5],[17,38.5],[11,36]];
    const FL=[[2.5,-9],[10,-30],[28,-41.5],[45,-40.5]];
    const fv=[0,.2,.42,.64,.86,1].map(s=>bz(FE[0],FE[1],FE[2],FE[3],s));
    const hv=[.05,.42,.8].map(s=>bz(HE1[0],HE1[1],HE1[2],HE1[3],s)).concat([.3,.75].map(s=>bz(HE2[0],HE2[1],HE2[2],HE2[3],s)));
    const fd=[]; for(let i=1;i<=9;i++){ const q=bz(FE[0],FE[1],FE[2],FE[3],(i-.5)/9); fd.push([q[0]-1.9*.95,q[1]-1.9*.2]); }
    const fd2=[]; for(let i=1;i<=6;i++){ const q=bz(FL[0],FL[1],FL[2],FL[3],.55+(i-.5)/6*.42); fd2.push([q[0]+.2,q[1]+2]); }
    const hd=[]; for(let i=1;i<=8;i++){ const q=bz(HE1[0],HE1[1],HE1[2],HE1[3],(i-.5)/8); hd.push([q[0]-2,q[1]-.4]); } for(let i=1;i<=6;i++){ const q=bz(HE2[0],HE2[1],HE2[2],HE2[3],(i-.5)/6); hd.push([q[0]-.5,q[1]-2]); }
    const INK='#100d18';
    const mk=(c,cx,cy,R,h,dl)=>{ const g=c.createRadialGradient(cx,cy,2,cx,cy,R); g.addColorStop(0,'hsl('+(h+34)+',100%,'+(74+dl)+'%)'); g.addColorStop(.5,'hsl('+h+',100%,'+(58+dl)+'%)'); g.addColorStop(1,'hsl('+(h-30)+',96%,'+(42+dl)+'%)'); return g; };
    /* veins, borders, white windows and the body have no hue, so they are drawn once; each frame only repaints the wing colour under them */
    const SK=.9, [INKL,ink]=canvasOf(px); ink.translate(50,50); ink.scale(SK,SK);
    (c=>{
      c.save(); hind(c); c.clip();
      c.strokeStyle=INK; c.lineCap='round'; c.lineWidth=.95; c.beginPath(); hv.forEach(p=>{ c.moveTo(4,-2); c.quadraticCurveTo(lerp(4,p[0],.55),lerp(-2,p[1],.42),p[0],p[1]); }); c.stroke();
      c.lineWidth=7.4; hind(c); c.stroke();
      c.fillStyle='#fffdf3'; hd.forEach(([x,y],i)=>{ c.beginPath(); c.arc(x,y,i%2?.72:1,0,TAU); c.fill(); });
      c.restore();
      c.strokeStyle=INK; c.lineWidth=.8; hind(c); c.stroke();
      c.save(); c.globalCompositeOperation='destination-out'; fore(c); c.fill(); c.restore();
      c.save(); fore(c); c.clip();
      c.strokeStyle=INK; c.lineCap='round'; c.lineWidth=1; c.beginPath(); fv.forEach(p=>{ c.moveTo(4,-8); c.quadraticCurveTo(lerp(4,p[0],.55),lerp(-8,p[1],.32),p[0],p[1]); }); c.stroke();
      /* the dark wing tip with its pale windows */
      c.fillStyle=INK; c.beginPath(); c.moveTo(52,-44); c.lineTo(30,-44); c.quadraticCurveTo(34,-29,50,-20); c.closePath(); c.fill();
      c.strokeStyle=INK; c.lineWidth=7.2; fore(c); c.stroke();
      c.fillStyle='#fffdf3'; [[37.5,-33.5,1.9],[43,-32.5,1.7],[40.5,-27.8,1.5],[45.2,-26.8,1.25],[33,-36.8,1.5]].forEach(([x,y,r])=>{ c.beginPath(); c.ellipse(x,y,r,r*.82,.3,0,TAU); c.fill(); });
      fd.forEach(([x,y],i)=>{ c.beginPath(); c.arc(x,y,i%2?.72:1,0,TAU); c.fill(); });
      fd2.forEach(([x,y])=>{ c.beginPath(); c.arc(x,y,.75,0,TAU); c.fill(); });
      c.restore();
      c.strokeStyle=INK; c.lineWidth=.8; fore(c); c.stroke();
      /* the sheen along the leading edge */
      c.strokeStyle='rgba(255,255,255,.3)'; c.lineWidth=.55; c.beginPath(); c.moveTo(4.5,-12); c.bezierCurveTo(12,-29,28,-39.6,44,-38.8); c.stroke();
    })(ink);
    const [BODY,bd]=canvasOf(px); bd.translate(50,50); bd.scale(SK,SK);
    (c=>{
      c.strokeStyle=INK; c.lineCap='round'; c.lineWidth=.6;
      [1,-1].forEach(sg=>{ c.beginPath(); c.moveTo(sg*.8,-17); c.bezierCurveTo(sg*2,-26,sg*7,-34,sg*12.5,-37); c.stroke(); c.fillStyle=INK; c.beginPath(); c.ellipse(sg*13,-37.4,1,1.4,sg*.9,0,TAU); c.fill(); });
      c.fillStyle=INK; capsule(c,0,-6,2.8,0,23,1); c.fill();
      c.beginPath(); c.ellipse(0,-9,3.3,6,0,0,TAU); c.fill(); c.beginPath(); c.arc(0,-16.2,2.5,0,TAU); c.fill();
      c.fillStyle='rgba(255,255,255,.34)'; for(let i=0;i<5;i++){ c.beginPath(); c.roundRect(-2.1+i*.26,-1+i*4.5,4.2-i*.52,.75,.3); c.fill(); }
      c.fillStyle='#fffdf3'; c.beginPath(); c.arc(-1.3,-16.9,.48,0,TAU); c.arc(1.3,-16.9,.48,0,TAU); c.fill();
    })(bd);
    const SH=defocus(px,64,x=>{ x.translate(50,50); x.fillStyle='rgba(0,0,0,1)'; [1,-1].forEach(sg=>{ x.save(); x.scale(sg,1); fore(x); x.fill(); hind(x); x.fill(); x.restore(); }); });
    return (c,t)=>{
      const u=t%P, w=TAU*u/P, h=(u/P)*360+18, bob=Math.sin(w*2)*.8, fl=lerp(.84,1,.5+.5*Math.cos(w*2));
      reset(c); c.setTransform(sc,0,0,sc,0,0);
      const bg=c.createRadialGradient(50,48,4,50,50,74); bg.addColorStop(0,'hsl('+(h+172)+',58%,34%)'); bg.addColorStop(.6,'hsl('+(h+192)+',62%,17%)'); bg.addColorStop(1,'hsl('+(h+205)+',66%,8%)'); c.fillStyle=bg; c.fillRect(0,0,100,100);
      c.save(); c.translate(50,51+bob); c.scale(.935,.935);
      c.globalAlpha=.38; c.save(); c.translate(0,4.5); c.scale(fl,.98); c.drawImage(SH,-50,-50,100,100); c.restore(); c.globalAlpha=1;
      const gh=mk(c,6,0,42,h+42,0), gf=mk(c,6,-8,50,h,0), Q=50/SK;
      [1,-1].forEach(sg=>{ c.save(); c.scale(sg*fl,1); c.fillStyle=gh; hind(c); c.fill(); c.fillStyle=gf; fore(c); c.fill(); c.drawImage(INKL,-Q,-Q,Q*2,Q*2); c.restore(); });
      c.drawImage(BODY,-Q,-Q,Q*2,Q*2);
      c.restore();
      reset(c);
    };
  }},

/* ---------- INVERT: a panda and its own negative ---------- */
{ id:'invert', name:'Invert', section:'Colouring', isNew:true, still:1.5,
  line:'The line flips every colour to its opposite, so black fur turns white.',
  make(px){
    const P=4.2, sc=px/100;
    const [B,b]=canvasOf(px);
    let g=b.createLinearGradient(0,0,100,100); g.addColorStop(0,'#46d6a5'); g.addColorStop(1,'#109477'); b.fillStyle=g; b.fillRect(0,0,100,100);
    soft(b,50,12,60,30,0,'224,255,214',.55);
    /* bamboo either side */
    function stalk(x,w){ const gg=b.createLinearGradient(x-w,0,x+w,0); gg.addColorStop(0,'#97e85c'); gg.addColorStop(.5,'#c9f47f'); gg.addColorStop(1,'#5cb83b'); b.fillStyle=gg; b.fillRect(x-w,-2,w*2,104); b.fillStyle='#3f932f'; for(let y=8;y<100;y+=20){ b.fillRect(x-w-.5,y,w*2+1,1.3); } }
    stalk(8,3.4); stalk(92,3.4);
    leaf(b,8,16,36,5,4.2,'#8ee45a','#3f9e36'); leaf(b,92,16,64,5,4.2,'#8ee45a','#3f9e36');
    /* shoulders */
    b.fillStyle='#17181f'; b.beginPath(); b.moveTo(0,100); b.bezierCurveTo(1,88,14,82,30,80); b.lineTo(70,80); b.bezierCurveTo(86,82,99,88,100,100); b.closePath(); b.fill();
    const [H,h]=canvasOf(px);
    [[19.5,25],[80.5,25]].forEach(([x,y],i)=>{ h.fillStyle='#17181f'; h.beginPath(); h.arc(x,y,16,0,TAU); h.fill(); blob(h,x+(i?-1.8:1.8),y+2,9.2,9.2,0,[[0,'#454653'],[.7,'#2b2c36'],[1,'#17181f']]); });
    const head=()=>{ h.beginPath(); h.moveTo(50,16); h.bezierCurveTo(74,16,94,33,94,57); h.bezierCurveTo(94,80,73,93,50,93); h.bezierCurveTo(27,93,6,80,6,57); h.bezierCurveTo(6,33,26,16,50,16); h.closePath(); };
    h.save(); h.shadowColor='rgba(0,30,20,.55)'; h.shadowBlur=2.6*sc; h.shadowOffsetY=1*sc; g=h.createRadialGradient(50,46,8,50,56,50); g.addColorStop(0,'#ffffff'); g.addColorStop(.62,'#f6f6f8'); g.addColorStop(1,'#c5c8d4'); h.fillStyle=g; head(); h.fill(); h.restore();
    /* crown tuft, centred on the axis */
    h.fillStyle='#fff'; h.beginPath(); h.moveTo(46,18); h.quadraticCurveTo(47.2,12.6,49,14.8); h.quadraticCurveTo(50,11.2,51,14.8); h.quadraticCurveTo(52.8,12.6,54,18); h.closePath(); h.fill();
    h.save(); head(); h.clip();
    soft(h,20,72,20,17,0,'255,120,150',.62); soft(h,80,72,20,17,0,'255,120,150',.62);
    soft(h,50,88,42,12,0,'110,116,140',.32);
    h.restore();
    [[31,51,.48],[69,51,-.48]].forEach(([x,y,r])=>{ h.save(); h.translate(x,y); h.rotate(r); h.fillStyle='#17181f'; h.beginPath(); h.ellipse(0,0,12,15.5,0,0,TAU); h.fill(); h.restore(); });
    /* muzzle, nose, mouth */
    blob(h,50,68,17,13,0,[[0,'rgba(255,255,255,1)'],[.8,'rgba(255,255,255,.65)'],[1,'rgba(255,255,255,0)']]);
    h.fillStyle='#17181f'; h.beginPath(); h.moveTo(42.5,61.5); h.bezierCurveTo(43.5,57.6,56.5,57.6,57.5,61.5); h.bezierCurveTo(58.2,65,52.6,69,50,69); h.bezierCurveTo(47.4,69,41.8,65,42.5,61.5); h.closePath(); h.fill();
    soft(h,47.5,60.6,3.6,1.7,0,'255,255,255',.7);
    h.strokeStyle='#17181f'; h.lineWidth=1.5; h.lineCap='round'; h.beginPath(); h.moveTo(50,69); h.lineTo(50,73); h.moveTo(41,74); h.quadraticCurveTo(45.6,78.6,50,73); h.quadraticCurveTo(54.4,78.6,59,74); h.stroke();
    function eye(c,x,bl){ c.save(); c.translate(x,50.5); c.scale(1,bl); const ig=c.createRadialGradient(0,2.2,.5,0,0,5.8); ig.addColorStop(0,'#b07a44'); ig.addColorStop(.7,'#6a4426'); ig.addColorStop(1,'#3a2416'); c.fillStyle=ig; c.beginPath(); c.arc(0,0,5.8,0,TAU); c.fill(); c.fillStyle='#0c0c12'; c.beginPath(); c.arc(0,.2,3.6,0,TAU); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(-1.7,-1.8,2,0,TAU); c.arc(1.9,2,.9,0,TAU); c.fill(); c.restore(); }
    return (c,t)=>{
      const u=t%P, w=TAU*u/P;
      const lead=E.inOut(seg(u,.3,1.1))*.5+E.inOut(seg(u,1.65,2.25))*.5, tail=E.inOut(seg(u,2.75,3.85));
      const blink=(u>3.0&&u<3.22)?Math.abs(Math.cos((u-3.0)/.22*Math.PI)):1;
      reset(c); c.drawImage(B,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      const by=Math.round(Math.sin(w)*.5*sc)/sc;   /* whole pixels: the big head layer then copies straight across */
      c.save(); c.translate(0,by); c.drawImage(H,0,0,100,100); eye(c,33.8,Math.max(.1,blink)); eye(c,66.2,Math.max(.1,blink)); c.restore();
      const x1=lead*100, x0=tail*100;
      if(x1>x0+.01){ c.globalCompositeOperation='difference'; c.fillStyle='#fff'; c.fillRect(x0,0,x1-x0,100); }
      reset(c);
    };
  }},

/* ---------- WIPE: a soft bar turns the alps into the desert ---------- */
{ id:'wipe', name:'Wipe', section:'Keying', isNew:true, still:1.05,
  line:'A soft-edged bar slides across and replaces one landscape with another.',
  make(px){
    const P=4.2, sc=px/100, HZ=63;
    function pine(c,x,base,h,w,a,b){
      const tiers=4; const g=c.createLinearGradient(x-w,0,x+w,0); g.addColorStop(0,a); g.addColorStop(1,b);
      c.fillStyle='#2a1c14'; c.fillRect(x-w*.08,base-h*.2,w*.16,h*.2+3);
      c.fillStyle=g;
      for(let i=0;i<tiers;i++){ const q=i/tiers, top=base-h+q*h*.74, bot=top+h*.42, ww=w*(.4+q*.6); c.beginPath(); c.moveTo(x,top); c.quadraticCurveTo(x+ww*.45,top+(bot-top)*.65,x+ww,bot); c.quadraticCurveTo(x,bot-1.8,x-ww,bot); c.quadraticCurveTo(x-ww*.45,top+(bot-top)*.65,x,top); c.closePath(); c.fill(); }
    }
    function alps(c){
      let g=c.createLinearGradient(0,0,0,HZ); g.addColorStop(0,'#1a72d0'); g.addColorStop(.62,'#6cbdf0'); g.addColorStop(1,'#dcf3fb'); c.fillStyle=g; c.fillRect(0,0,100,HZ+1);
      soft(c,18,18,22,7,0,'255,255,255',.92); soft(c,86,12,18,5.5,0,'255,255,255',.8);
      c.fillStyle='#a5c5e6'; c.beginPath(); c.moveTo(0,HZ); c.lineTo(0,42); c.lineTo(12,34); c.lineTo(24,46); c.lineTo(100,46); c.lineTo(100,36); c.lineTo(90,30); c.lineTo(78,46); c.lineTo(78,HZ); c.closePath(); c.fill();
      const M=[[-8,HZ],[10,50],[17,53],[33,29],[38,32],[50,9],[61,29],[66,26],[80,47],[87,44],[108,HZ]];
      const mountain=(x,flip)=>{ x.beginPath(); M.forEach(([a,b],i)=>{ const y=flip?2*HZ-b:b; i?x.lineTo(a,y):x.moveTo(a,y); }); x.closePath(); };
      const paint=(x,flip)=>{
        const gg=x.createLinearGradient(0,0,100,0); gg.addColorStop(0,'#7fa8d8'); gg.addColorStop(.5,'#6f93c6'); gg.addColorStop(1,'#4a6ca3'); x.fillStyle=gg; mountain(x,flip); x.fill();
        const Y=b=>flip?2*HZ-b:b;
        x.fillStyle='#3e5e93'; x.beginPath(); x.moveTo(50,Y(9)); x.lineTo(61,Y(29)); x.lineTo(66,Y(26)); x.lineTo(80,Y(47)); x.lineTo(87,Y(44)); x.lineTo(108,Y(HZ)); x.lineTo(44,Y(HZ)); x.lineTo(56,Y(40)); x.lineTo(48,Y(30)); x.closePath(); x.fill();
        x.fillStyle='#ffffff'; x.beginPath(); x.moveTo(50,Y(9)); x.lineTo(61,Y(29)); x.lineTo(58,Y(33)); x.lineTo(55,Y(29)); x.lineTo(51,Y(36)); x.lineTo(46.5,Y(29)); x.lineTo(42,Y(35)); x.lineTo(38,Y(32)); x.closePath(); x.fill();
        x.fillStyle='#c4d8f0'; x.beginPath(); x.moveTo(50,Y(9)); x.lineTo(61,Y(29)); x.lineTo(58,Y(33)); x.lineTo(55,Y(29)); x.lineTo(51,Y(36)); x.lineTo(48,Y(26)); x.closePath(); x.fill();
      };
      paint(c,false);
      g=c.createLinearGradient(0,HZ,0,100); g.addColorStop(0,'#58aede'); g.addColorStop(1,'#0c4a86'); c.fillStyle=g; c.fillRect(0,HZ,100,38);
      /* the reflection comes back soft, so the lake reads as water and not as a second drawing */
      const refl=defocus(px,64,x=>{ x.translate(0,HZ); x.scale(1,.66); x.translate(0,-HZ); paint(x,true); });
      c.save(); c.beginPath(); c.rect(0,HZ,100,40); c.clip(); c.setTransform(1,0,0,1,0,0); c.globalAlpha=.5; c.drawImage(refl,0,0); c.restore(); c.globalAlpha=1;
      g=c.createLinearGradient(0,HZ+14,0,HZ+28); g.addColorStop(0,'rgba(12,74,134,0)'); g.addColorStop(1,'rgba(12,74,134,.95)'); c.fillStyle=g; c.fillRect(0,HZ+14,100,24);
      c.fillStyle='#1f5a3e'; for(let i=0;i<34;i++){ const x=i*3.1-1, h=4.2+2.4*Math.abs(Math.sin(i*.9)); c.beginPath(); c.moveTo(x-1.8,HZ+.5); c.lineTo(x,HZ-h); c.lineTo(x+1.8,HZ+.5); c.closePath(); c.fill(); }
      for(let i=0;i<8;i++){ const y=HZ+3+i*3.1, w=30-i*2.8; c.globalAlpha=.42-i*.04; const gl=c.createLinearGradient(50-w,0,50+w,0); gl.addColorStop(0,'rgba(255,255,255,0)'); gl.addColorStop(.5,'#fff'); gl.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=gl; c.fillRect(50-w,y,w*2,.42); } c.globalAlpha=1;
      g=c.createLinearGradient(0,86,0,100); g.addColorStop(0,'#2d7d4e'); g.addColorStop(1,'#123f2c'); c.fillStyle=g; c.beginPath(); c.moveTo(0,88); c.quadraticCurveTo(28,83,50,92); c.quadraticCurveTo(76,99,100,86); c.lineTo(100,100); c.lineTo(0,100); c.closePath(); c.fill();
      pine(c,11,92,62,13,'#2f8a55','#0f4530'); pine(c,90,91,54,12,'#2c8352','#0e4230');
    }
    function desert(c){
      let g=c.createLinearGradient(0,0,0,HZ); g.addColorStop(0,'#27105c'); g.addColorStop(.36,'#8b1f79'); g.addColorStop(.68,'#ff5a4e'); g.addColorStop(1,'#ffc35e'); c.fillStyle=g; c.fillRect(0,0,100,HZ+1);
      const sr=rng(19); c.fillStyle='#fff'; for(let i=0;i<34;i++){ c.globalAlpha=.3+sr()*.6; c.beginPath(); c.arc(sr()*100,sr()*22,.18+sr()*.3,0,TAU); c.fill(); } c.globalAlpha=1;
      soft(c,50,46,62,38,0,'255,190,90',.75);
      g=c.createLinearGradient(0,20,0,66); g.addColorStop(0,'#fffbd6'); g.addColorStop(.6,'#ffd35c'); g.addColorStop(1,'#ff8a34'); c.fillStyle=g; c.beginPath(); c.arc(50,43,23,0,TAU); c.fill();
      c.fillStyle='rgba(255,90,78,.62)'; for(let i=0;i<4;i++) c.fillRect(24,50+i*3.7,52,.9+i*.62);
      g=c.createLinearGradient(0,30,0,HZ); g.addColorStop(0,'#7c2a5e'); g.addColorStop(1,'#2e0f44'); c.fillStyle=g;
      c.beginPath(); c.moveTo(-2,HZ); c.lineTo(1,44); c.lineTo(5,42); c.lineTo(6,33); c.lineTo(23,33); c.lineTo(25,42); c.lineTo(29,45); c.lineTo(33,HZ); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(67,HZ); c.lineTo(71,47); c.lineTo(75,45); c.lineTo(77,28); c.lineTo(81,27); c.lineTo(83,38); c.lineTo(93,37); c.lineTo(95,45); c.lineTo(100,47); c.lineTo(102,HZ); c.closePath(); c.fill();
      c.fillStyle='rgba(255,170,100,.55)'; c.beginPath(); c.moveTo(23,33); c.lineTo(25,42); c.lineTo(29,45); c.lineTo(33,HZ); c.lineTo(31,HZ); c.lineTo(27.4,46); c.lineTo(23.4,43); c.lineTo(21.8,33); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(77,28); c.lineTo(75,45); c.lineTo(71,47); c.lineTo(67,HZ); c.lineTo(69,HZ); c.lineTo(72.6,48); c.lineTo(76.6,46); c.lineTo(78.4,28); c.closePath(); c.fill();
      g=c.createLinearGradient(0,HZ,0,100); g.addColorStop(0,'#ff9248'); g.addColorStop(.5,'#d2442f'); g.addColorStop(1,'#6a1740'); c.fillStyle=g; c.fillRect(0,HZ,100,38);
      const dune=(a,b,d,e,col0,col1)=>{ const gg=c.createLinearGradient(0,Math.min(a,b,d,e),0,100); gg.addColorStop(0,col0); gg.addColorStop(1,col1); c.fillStyle=gg; c.beginPath(); c.moveTo(0,a); c.bezierCurveTo(30,b,60,d,100,e); c.lineTo(100,100); c.lineTo(0,100); c.closePath(); c.fill(); };
      dune(71,62,82,70,'#f0703c','#8e2341'); dune(84,72,74,88,'#c23a38','#511440'); dune(90,99,84,84,'#4f143f','#2a0a30');
      const cac='#1c0a2a'; c.fillStyle=cac;
      capsule(c,88,96,3.4,88,50,2.8); c.fill();
      c.lineJoin='round'; c.lineCap='round'; c.strokeStyle=cac; c.lineWidth=4.4; c.beginPath(); c.moveTo(88,76); c.lineTo(80,76); c.quadraticCurveTo(77,76,77,73); c.lineTo(77,63); c.stroke(); c.lineWidth=3.8; c.beginPath(); c.moveTo(88,69); c.lineTo(95,69); c.quadraticCurveTo(97.4,69,97.4,66.4); c.lineTo(97.4,57); c.stroke();
      c.fillStyle=cac; capsule(c,12,98,2.5,12,70,2.1); c.fill(); c.strokeStyle=cac; c.lineWidth=3; c.beginPath(); c.moveTo(12,86); c.lineTo(18,86); c.quadraticCurveTo(20,86,20,84); c.lineTo(20,78); c.stroke();
    }
    const [A,a]=canvasOf(px); alps(a);
    const [B,b]=canvasOf(px); desert(b);
    const O=document.createElement('canvas'); O.width=O.height=px; const o=O.getContext('2d');
    const th=-.24, nx=Math.cos(th), ny=Math.sin(th), W=24, R=50*(Math.abs(nx)+Math.abs(ny))+W*.5+1;
    return (c,t)=>{
      const u=t%P;
      const p1=E.inOut(seg(u,.35,1.75)), p2=E.inOut(seg(u,2.45,3.85));
      let from=A, to=B, p=p1; if(u>=2.1){ from=B; to=A; p=p2; }
      reset(c); c.drawImage(from,0,0);
      if(p>=1){ c.drawImage(to,0,0); }
      else if(p>0){
        const d=lerp(-R,R,p), x0=(50+nx*(d-W/2))*sc, y0=(50+ny*(d-W/2))*sc, x1=(50+nx*(d+W/2))*sc, y1=(50+ny*(d+W/2))*sc;
        o.setTransform(1,0,0,1,0,0); o.globalCompositeOperation='source-over'; o.clearRect(0,0,px,px); o.drawImage(to,0,0);
        o.globalCompositeOperation='destination-in'; const g=o.createLinearGradient(x0,y0,x1,y1); for(let i=0;i<=6;i++){ const s=i/6; g.addColorStop(s,'rgba(0,0,0,'+(1-smooth(s)).toFixed(3)+')'); } o.fillStyle=g; o.fillRect(0,0,px,px);
        c.drawImage(O,0,0);
        const sh=c.createLinearGradient(x0,y0,x1,y1); sh.addColorStop(0,'rgba(255,255,255,0)'); sh.addColorStop(.3,'rgba(255,255,255,.08)'); sh.addColorStop(.5,'rgba(255,255,255,.26)'); sh.addColorStop(.7,'rgba(255,255,255,.08)'); sh.addColorStop(1,'rgba(255,255,255,0)');
        c.globalCompositeOperation='screen'; c.fillStyle=sh; c.fillRect(0,0,px,px);
      }
      reset(c);
    };
  }},

/* ---------- RADIAL WIPE: a clock hand turns day into night ---------- */
{ id:'radialwipe', name:'Radial Wipe', section:'Keying', isNew:true, still:1.25,
  line:'A clock hand sweeps round and each hour it passes turns from day to night.',
  make(px){
    const P=5, sc=px/100;
    function day(c){
      let g=c.createRadialGradient(50,50,4,50,50,74); g.addColorStop(0,'#fff0b0'); g.addColorStop(.38,'#8cdcff'); g.addColorStop(1,'#1a7fe6'); c.fillStyle=g; c.fillRect(0,0,100,100);
      c.save(); c.translate(50,50);
      for(let i=0;i<24;i++){ const long=i%2===0, a=i*TAU/24, r0=25, r1=long?47.5:37.5, w=long?5.4:3.4; c.save(); c.rotate(a);
        const gg=c.createLinearGradient(r0,0,r1,0); gg.addColorStop(0,'#ff9d14'); gg.addColorStop(.7,'#ffc72e'); gg.addColorStop(1,'#ffe36e'); c.fillStyle=gg;
        c.shadowColor='rgba(170,80,0,.35)'; c.shadowBlur=1.2*sc;
        c.beginPath(); c.moveTo(r0,-w); c.quadraticCurveTo((r0+r1)/2,-w*.45,r1,-.5); c.quadraticCurveTo(r1+1,0,r1,.5); c.quadraticCurveTo((r0+r1)/2,w*.45,r0,w); c.closePath(); c.fill(); c.restore(); }
      c.save(); c.shadowColor='rgba(160,70,0,.55)'; c.shadowBlur=3*sc;
      g=c.createRadialGradient(-7,-9,1,0,0,29); g.addColorStop(0,'#fff9cf'); g.addColorStop(.5,'#ffd23c'); g.addColorStop(1,'#ff9a14'); c.fillStyle=g; c.beginPath(); c.arc(0,0,28,0,TAU); c.fill(); c.restore();
      c.strokeStyle='rgba(255,255,255,.5)'; c.lineWidth=.8; c.beginPath(); c.arc(0,0,24.5,Math.PI*1.05,Math.PI*1.55); c.stroke();
      c.restore();
    }
    function night(c){
      let g=c.createRadialGradient(50,50,6,50,50,74); g.addColorStop(0,'#4154b4'); g.addColorStop(.45,'#1a2470'); g.addColorStop(1,'#060a2c'); c.fillStyle=g; c.fillRect(0,0,100,100);
      soft(c,50,50,46,46,0,'170,190,255',.5);
      c.save(); c.translate(50,50);
      const star=(x,y,R,col)=>{ c.fillStyle=col; c.beginPath(); for(let k=0;k<4;k++){ const a=k*TAU/4-Math.PI/2, b=a+TAU/8; c.lineTo(x+Math.cos(a)*R,y+Math.sin(a)*R); c.lineTo(x+Math.cos(b)*R*.2,y+Math.sin(b)*R*.2); } c.closePath(); c.fill(); };
      for(let i=0;i<12;i++){ const a=i*TAU/12-Math.PI/2, big=i%3===0, r=big?40:39, x=Math.cos(a)*r, y=Math.sin(a)*r; soft(c,x,y,big?10:6,big?10:6,0,'200,215,255',.55); star(x,y,big?7.6:4.4,i%2?'#ffffff':'#fff0bb'); }
      c.fillStyle='rgba(255,255,255,.8)'; for(let i=0;i<12;i++){ const a=(i+.5)*TAU/12-Math.PI/2, r=i%2?47:33; c.beginPath(); c.arc(Math.cos(a)*r,Math.sin(a)*r,.55,0,TAU); c.fill(); }
      /* full disc in earthshine, then the bright crescent cut from it */
      c.fillStyle='#29357f'; c.beginPath(); c.arc(0,0,28,0,TAU); c.fill();
      c.save(); c.beginPath(); c.arc(0,0,28,0,TAU); c.clip();
      c.beginPath(); c.rect(-40,-40,80,80); c.arc(11,-7,27,0,TAU,true); c.closePath();
      g=c.createRadialGradient(-14,-4,2,0,0,31); g.addColorStop(0,'#fffef2'); g.addColorStop(.65,'#f3ecc9'); g.addColorStop(1,'#c9c8d8'); c.fillStyle=g; c.shadowColor='rgba(255,255,230,.7)'; c.shadowBlur=2*sc; c.fill();
      c.shadowColor='rgba(0,0,0,0)';
      [[-20,-1,3.2],[-13,14,2.3],[-22,10.5,1.4],[-3,21.5,1.9]].forEach(([x,y,r])=>{ c.fillStyle='rgba(165,160,190,.7)'; c.beginPath(); c.arc(x,y,r,0,TAU); c.fill(); c.fillStyle='rgba(255,255,255,.55)'; c.beginPath(); c.arc(x+.45,y+.45,r*.76,0,TAU); c.fill(); });
      c.restore();
      c.restore();
    }
    const [A,a]=canvasOf(px); day(a);
    const [B,b]=canvasOf(px); night(b);
    return (c,t)=>{
      const u=t%P;
      const w1=seg(u,.2,2.05), w2=seg(u,2.75,4.6);
      let from=A, to=B, q=w1; if(u>=2.4){ from=B; to=A; q=w2; }
      const p=lerp(q,E.inOut(q),.72), ang=-Math.PI/2+p*TAU;
      reset(c); c.drawImage(from,0,0);
      if(p>=1) c.drawImage(to,0,0);
      else if(p>0){ c.save(); c.setTransform(sc,0,0,sc,0,0); c.beginPath(); c.moveTo(50,50); c.arc(50,50,90,-Math.PI/2,ang); c.closePath(); c.clip(); c.setTransform(1,0,0,1,0,0); c.drawImage(to,0,0); c.restore(); }
      const vis=Math.min(smooth(q/.05),smooth((1-q)/.05));
      if(vis>.01){
        c.setTransform(sc,0,0,sc,0,0); c.globalAlpha=vis;
        c.save(); c.translate(50,50); c.rotate(ang);
        const sh=c.createLinearGradient(0,0,0,10); sh.addColorStop(0,'rgba(0,0,20,.42)'); sh.addColorStop(1,'rgba(0,0,20,0)'); c.fillStyle=sh; c.fillRect(0,0,80,10);
        c.fillStyle='#ffffff'; c.beginPath(); c.moveTo(-1,-1.7); c.lineTo(80,-.5); c.lineTo(80,.5); c.lineTo(-1,1.7); c.closePath(); c.fill();
        c.restore();
        c.fillStyle='#ffffff'; c.beginPath(); c.arc(50,50,4,0,TAU); c.fill(); c.fillStyle='#ff5a5f'; c.beginPath(); c.arc(50,50,1.8,0,TAU); c.fill();
      }
      reset(c);
    };
  }}
);
})();
