/* FreeMotion effect pictures, batch 5: Swing, Spin, Pulse, Orbit, Tile Grid, Ring Array, Mirror Tile. */
(function(){ 'use strict'; const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

const begin=(c,sc)=>{ c.setTransform(sc,0,0,sc,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const finish=c=>{ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const back=p=>{ const q=p-1; return 1+2.4*q*q*q+1.4*q*q; };
/* A soft shadow of a shape on its own layer: the shape itself is parked off-canvas so only its blur lands. */
function softShape(px,shape,blur,col){
  const sc=px/100, [C,x]=canvasOf(px);
  x.shadowColor=col; x.shadowBlur=blur*sc; x.shadowOffsetX=300*sc; x.shadowOffsetY=0; x.fillStyle='#000';
  x.translate(-300,0); shape(x); x.fill();
  return C;
}

window.FX_TILES.push(

/* ------------------------------------------------------------------ SWING */
{ id:'swing', name:'Swing', section:'Shakes / Movement', isNew:true, still:0.65,
  line:'A shop sign rocks from side to side, hanging from one pivot at the top.',
  make(px){
    const P=2.6, sc=px/100, PX=50, PY=9.6, AMP=0.25;
    const X0=16.5, X1=83.5, Y0=31.5, Y1=85.5;
    const plaque=(x,x0,y0,x1,y1,n)=>{ x.beginPath(); x.moveTo(x0+n,y0); x.lineTo(x1-n,y0); x.quadraticCurveTo(x1-n,y0+n,x1,y0+n); x.lineTo(x1,y1-n); x.quadraticCurveTo(x1-n,y1-n,x1-n,y1); x.lineTo(x0+n,y1); x.quadraticCurveTo(x0+n,y1-n,x0,y1-n); x.lineTo(x0,y0+n); x.quadraticCurveTo(x0+n,y0+n,x0+n,y0); x.closePath(); };

    /* the wall and the porch beam: a tidy running bond, lit from above */
    const [W,w]=canvasOf(px);
    let g=w.createLinearGradient(0,0,0,100); g.addColorStop(0,'#40233f'); g.addColorStop(1,'#1b1024'); w.fillStyle=g; w.fillRect(0,0,100,100);
    const r=rng(12), BH=10, BW=20;
    for(let j=0;j<11;j++){ const off=(j%2)?-BW/2:0;
      for(let i=0;i<7;i++){ const v=r();
        w.fillStyle='rgba('+(150+v*40|0)+','+(78+v*22|0)+','+(86+v*18|0)+','+(0.17+v*0.09)+')';
        w.beginPath(); w.roundRect(off+i*BW+0.55,j*BH+0.55,BW-1.1,BH-1.1,1.2); w.fill(); } }
    g=w.createRadialGradient(50,4,0,50,4,104); g.addColorStop(0,'rgba(255,196,120,0.44)'); g.addColorStop(0.5,'rgba(255,150,90,0.13)'); g.addColorStop(1,'rgba(255,120,90,0)'); w.fillStyle=g; w.fillRect(0,0,100,100);
    g=w.createLinearGradient(0,0,0,6.8); g.addColorStop(0,'#8a5a34'); g.addColorStop(0.8,'#5b3820'); g.addColorStop(1,'#3a2314'); w.fillStyle=g; w.fillRect(0,0,100,6.8);
    w.fillStyle='rgba(255,220,170,0.25)'; w.fillRect(0,0,100,0.7);
    g=w.createLinearGradient(0,6.8,0,11); g.addColorStop(0,'rgba(0,0,0,0.42)'); g.addColorStop(1,'rgba(0,0,0,0)'); w.fillStyle=g; w.fillRect(0,6.8,100,4.2);
    w.fillStyle='#20140f'; w.beginPath(); w.roundRect(45.6,3.6,8.8,3.8,1); w.fill();
    w.fillStyle='rgba(255,230,180,0.32)'; w.fillRect(46.2,4.1,7.6,0.6);

    /* the sign and its two chains: one layer, so it can only turn about the pivot */
    const [S,s]=canvasOf(px);
    function chain(ax,ay,bx,by){
      const L=Math.hypot(bx-ax,by-ay), n=Math.round(L/3.1), ang=Math.atan2(by-ay,bx-ax);
      for(let i=0;i<n;i++){ const f=(i+0.5)/n, x=lerp(ax,bx,f), y=lerp(ay,by,f);
        s.save(); s.translate(x,y); s.rotate(ang);
        if(i%2){ s.fillStyle='#c9ccd6'; s.beginPath(); s.roundRect(-2.1,-0.55,4.2,1.1,0.55); s.fill(); }
        else { s.strokeStyle='#eceef4'; s.lineWidth=0.72; s.beginPath(); s.ellipse(0,0,2.1,1.25,0,0,TAU); s.stroke(); }
        s.restore(); }
    }
    chain(PX-1,PY+2.2,29.5,Y0-0.9); chain(PX+1,PY+2.2,70.5,Y0-0.9);
    /* the pivot: a bright ring on a hook */
    s.strokeStyle='#ffd98a'; s.lineWidth=1.5; s.beginPath(); s.arc(PX,PY,2.7,0,TAU); s.stroke();
    s.strokeStyle='rgba(255,255,255,0.75)'; s.lineWidth=0.5; s.beginPath(); s.arc(PX,PY,2.95,Math.PI*1.1,Math.PI*1.65); s.stroke();
    /* board */
    g=s.createLinearGradient(0,Y0,0,Y1); g.addColorStop(0,'#a06a3b'); g.addColorStop(1,'#5c3519'); s.fillStyle=g; plaque(s,X0,Y0,X1,Y1,5.2); s.fill();
    s.save(); plaque(s,X0,Y0,X1,Y1,5.2); s.clip(); s.strokeStyle='rgba(50,24,8,0.28)'; s.lineWidth=0.34; for(let y=Y0+1.2;y<Y1;y+=2.3){ s.beginPath(); s.moveTo(X0,y); s.bezierCurveTo(40,y+0.9,60,y-0.9,X1,y); s.stroke(); } s.restore();
    s.strokeStyle='rgba(255,226,180,0.55)'; s.lineWidth=0.55; plaque(s,X0+0.4,Y0+0.4,X1-0.4,Y1-0.4,4.9); s.stroke();
    g=s.createLinearGradient(X0,Y0,X1,Y1); g.addColorStop(0,'#17a4a0'); g.addColorStop(0.55,'#0d716f'); g.addColorStop(1,'#07474d'); s.fillStyle=g; plaque(s,X0+3,Y0+3,X1-3,Y1-3,4.5); s.fill();
    s.strokeStyle='#ffd27a'; s.lineWidth=0.7; plaque(s,X0+5.2,Y0+5.2,X1-5.2,Y1-5.2,3.8); s.stroke();
    /* the word, sized to the panel */
    const cx=(X0+X1)/2, cy=(Y0+Y1)/2;
    s.textAlign='center'; s.textBaseline='middle'; let fs=30; s.font='800 '+fs+'px system-ui, sans-serif';
    const mw=s.measureText('OPEN').width; fs=fs*Math.min(1,46/mw); s.font='800 '+fs+'px system-ui, sans-serif';
    s.fillStyle='rgba(2,30,34,0.75)'; s.fillText('OPEN',cx+0.5,cy+1.5);
    g=s.createLinearGradient(0,cy-9,0,cy+9); g.addColorStop(0,'#fff0bf'); g.addColorStop(0.5,'#ffd27a'); g.addColorStop(1,'#eba33a'); s.fillStyle=g; s.fillText('OPEN',cx,cy+0.5);
    [[Y0+9.8],[Y1-9.8]].forEach(([y])=>{ s.strokeStyle='#ffd27a'; s.lineWidth=0.55; s.lineCap='round'; s.beginPath(); s.moveTo(cx-15,y); s.lineTo(cx-3.2,y); s.moveTo(cx+3.2,y); s.lineTo(cx+15,y); s.stroke(); s.fillStyle='#ffd27a'; s.beginPath(); s.moveTo(cx,y-1.6); s.lineTo(cx+2,y); s.lineTo(cx,y+1.6); s.lineTo(cx-2,y); s.closePath(); s.fill(); });
    /* eyelets */
    [29.5,70.5].forEach(x=>{ s.fillStyle='#ffd98a'; s.beginPath(); s.arc(x,Y0+0.3,1.5,0,TAU); s.fill(); s.fillStyle='#6b4a22'; s.beginPath(); s.arc(x,Y0+0.3,0.6,0,TAU); s.fill(); });

    const SH=softShape(px,x=>plaque(x,X0,Y0,X1,Y1,5.2),3.2,'rgba(8,2,14,0.9)');
    return (c,t)=>{
      const u=t%P, a=AMP*Math.sin(TAU*u/P);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(W,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      /* the path it travels */
      c.strokeStyle='rgba(255,226,170,0.42)'; c.lineWidth=0.95; c.lineCap='round'; c.setLineDash([0.1,3.2]);
      c.beginPath(); c.arc(PX,PY,84.5,Math.PI/2-AMP-0.04,Math.PI/2+AMP+0.04); c.stroke(); c.setLineDash([]);
      const put=(ox,oy,ang,img,al)=>{ c.setTransform(sc,0,0,sc,0,0); c.translate(PX+ox,PY+oy); c.rotate(ang); c.translate(-PX,-PY); c.globalAlpha=al; c.drawImage(img,0,0,100,100); };
      put(1.8,3.6,a*0.97,SH,0.62);
      put(0,0,a,S,1);
      /* a sheen that slides over the paint as it rocks */
      c.save(); c.globalAlpha=1; plaque(c,X0+3,Y0+3,X1-3,Y1-3,4.5); c.clip();
      const gx=50-a*150, sh=c.createLinearGradient(gx-20,30,gx+20,86); sh.addColorStop(0,'rgba(255,255,255,0)'); sh.addColorStop(0.5,'rgba(255,255,255,0.17)'); sh.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=sh; c.fillRect(0,20,100,80); c.restore();
      finish(c);
    };
  }},

/* ------------------------------------------------------------------- SPIN */
{ id:'spin', name:'Spin', section:'Shakes / Movement', isNew:true, still:0.22,
  line:'A paper pinwheel catches the wind, whirls up to a blur and slows down again.',
  make(px){
    const P=4, sc=px/100, CX=50, CY=45, R=42, N=480;
    /* angle table: speed ramps up and down, and the whole loop is a whole number of turns */
    const W0=0.85, W1=27, rate=u=>W0+(W1-W0)*E.inOut(seg(u,0.4,1.75))*(1-E.inOut(seg(u,2.3,3.65)));
    const tbl=new Float64Array(N+2); let acc=0;
    for(let i=0;i<=N;i++){ tbl[i]=acc; acc+=rate(i/N*P)*P/N; }
    const norm=Math.round(tbl[N]/TAU)*TAU/tbl[N];
    for(let i=0;i<=N+1;i++) tbl[i]*=norm;
    const angle=u=>{ const f=u/P*N, i=Math.floor(f); return lerp(tbl[i],tbl[i+1],f-i); };

    const [B,b]=canvasOf(px);
    let g=b.createLinearGradient(0,0,0,100); g.addColorStop(0,'#2a8fe6'); g.addColorStop(0.62,'#83d7ff'); g.addColorStop(1,'#dcf7ff'); b.fillStyle=g; b.fillRect(0,0,100,100);
    g=b.createRadialGradient(10,8,0,10,8,60); g.addColorStop(0,'rgba(255,255,235,0.75)'); g.addColorStop(1,'rgba(255,255,235,0)'); b.fillStyle=g; b.fillRect(0,0,100,100);
    const puff=(x,y,k)=>{ b.fillStyle='rgba(255,255,255,0.95)'; b.beginPath(); b.arc(x-9*k,y,5.2*k,0,TAU); b.arc(x-2*k,y-3.4*k,7.2*k,0,TAU); b.arc(x+7*k,y-1,5.6*k,0,TAU); b.fill(); b.beginPath(); b.roundRect(x-14*k,y-1.6*k,27*k,6.6*k,3.3*k); b.fill(); };
    puff(14,78,1.05); puff(86,70,0.9);
    /* the hill the stick stands in */
    g=b.createLinearGradient(0,86,0,100); g.addColorStop(0,'#74d35f'); g.addColorStop(1,'#2f9a4a'); b.fillStyle=g; b.beginPath(); b.moveTo(0,92); b.quadraticCurveTo(30,83,58,88); b.quadraticCurveTo(82,92,100,86); b.lineTo(100,100); b.lineTo(0,100); b.closePath(); b.fill();
    /* the stick, candy striped */
    const SW=2.1;
    b.save(); b.beginPath(); b.rect(CX-SW,CY,SW*2,47); b.clip();
    b.fillStyle='#fff8ef'; b.fillRect(CX-SW,CY,SW*2,47);
    b.fillStyle='#ff6a6f'; for(let y=CY-6;y<CY+50;y+=7){ b.beginPath(); b.moveTo(CX-SW,y); b.lineTo(CX+SW,y-3); b.lineTo(CX+SW,y+0.5); b.lineTo(CX-SW,y+3.5); b.closePath(); b.fill(); }
    g=b.createLinearGradient(CX-SW,0,CX+SW,0); g.addColorStop(0,'rgba(90,40,60,0.28)'); g.addColorStop(0.45,'rgba(255,255,255,0.22)'); g.addColorStop(1,'rgba(90,40,60,0.34)'); b.fillStyle=g; b.fillRect(CX-SW,CY,SW*2,47); b.restore();

    /* the wheel: four flat vanes, then four curled sails over them */
    const HUE=[['#ff3d57','#ffb3bd','#b3122f'],['#ffb200','#ffe6a0','#d17a00'],['#12b8a6','#b6f5ea','#07776d'],['#5b51f2','#cdc8ff','#3027a8']];
    function wheel(x){
      x.save(); x.translate(50,50);
      const T=R, M=R*0.5;
      for(let i=0;i<4;i++){ const [a,,d]=HUE[i]; x.save(); x.rotate(i*TAU/4);
        const gg=x.createLinearGradient(0,-T,M*0.5,-M*0.1); gg.addColorStop(0,a); gg.addColorStop(1,d); x.fillStyle=gg;
        x.beginPath(); x.moveTo(0,0); x.lineTo(0,-T); x.lineTo(M,-M); x.closePath(); x.fill();
        x.restore(); }
      for(let i=0;i<4;i++){ const [a,l,d]=HUE[i]; x.save(); x.rotate(i*TAU/4);
        const sail=()=>{ x.beginPath(); x.moveTo(0,0); x.lineTo(M,-M); x.bezierCurveTo(M*1.42,-M*0.82,M*1.58,-M*0.14,M*1.26,-0.2); x.closePath(); };
        x.save(); x.shadowColor='rgba(20,10,40,0.42)'; x.shadowBlur=2.6*sc; x.shadowOffsetX=-0.4*sc; x.shadowOffsetY=0.3*sc; x.fillStyle=a; sail(); x.fill(); x.restore();
        const gg=x.createLinearGradient(M*1.42,-M*0.62,M*0.1,-M*0.08); gg.addColorStop(0,l); gg.addColorStop(0.5,a); gg.addColorStop(1,d); x.fillStyle=gg; sail(); x.fill();
        x.strokeStyle='rgba(255,255,255,0.55)'; x.lineWidth=0.55; x.lineCap='round'; x.beginPath(); x.moveTo(M,-M); x.bezierCurveTo(M*1.42,-M*0.82,M*1.58,-M*0.14,M*1.26,-0.2); x.stroke();
        x.restore(); }
      x.restore();
    }
    const [A,a]=canvasOf(px); wheel(a);
    const SM=Math.round(px*0.62), Lo=document.createElement('canvas'); Lo.width=Lo.height=SM; const lo=Lo.getContext('2d'); lo.imageSmoothingQuality='high'; lo.drawImage(A,0,0,SM,SM);
    const Acc=document.createElement('canvas'); Acc.width=Acc.height=SM; const ac=Acc.getContext('2d');
    /* the pin */
    const [H,h]=canvasOf(px);
    h.shadowColor='rgba(20,10,40,0.45)'; h.shadowBlur=1.8*sc; h.shadowOffsetY=0.5*sc;
    g=h.createRadialGradient(CX-1.3,CY-1.5,0.4,CX,CY,5); g.addColorStop(0,'#fff6cf'); g.addColorStop(0.55,'#ffc94a'); g.addColorStop(1,'#c47f14'); h.fillStyle=g; h.beginPath(); h.arc(CX,CY,4.6,0,TAU); h.fill();
    h.shadowColor='rgba(0,0,0,0)';
    return (c,t)=>{
      const u=t%P, ang=angle(u), w=rate(u)*norm;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(B,0,0);
      const sweep=w/28, n=clamp(Math.ceil(sweep/0.045),1,24);
      if(n===1){
        c.setTransform(sc,0,0,sc,0,0); c.translate(CX,CY); c.rotate(ang); c.translate(-50,-50); c.drawImage(A,0,0,100,100);
      } else {
        /* true motion blur: add the turning wheel up over the shutter, then lay the average down */
        const s2=SM/100;
        ac.setTransform(1,0,0,1,0,0); ac.globalCompositeOperation='source-over'; ac.globalAlpha=1; ac.clearRect(0,0,SM,SM);
        ac.globalCompositeOperation='lighter'; ac.globalAlpha=Math.min(1,1.012/n);
        for(let i=0;i<n;i++){ ac.setTransform(s2,0,0,s2,0,0); ac.translate(50,50); ac.rotate(ang-sweep*i/n); ac.translate(-50,-50); ac.drawImage(Lo,0,0,100,100); }
        c.setTransform(sc,0,0,sc,0,0); c.drawImage(Acc,CX-50,CY-50,100,100);
      }
      c.setTransform(1,0,0,1,0,0); c.drawImage(H,0,0);
      finish(c);
    };
  }},

/* ------------------------------------------------------------------ PULSE */
{ id:'pulse', name:'Pulse', section:'Shakes / Movement', isNew:true, still:0.17,
  line:'A big glossy heart swells twice with every beat, lub-dub, and rests.',
  make(px){
    const P=2.4, BEAT=1.2, sc=px/100, CX=50, CY=51;
    const heart=(x,k)=>{ k=k||1; x.beginPath(); x.moveTo(0,36*k); x.bezierCurveTo(-5*k,30*k,-40*k,9*k,-40*k,-14*k); x.bezierCurveTo(-40*k,-29*k,-28.5*k,-37*k,-18.5*k,-37*k); x.bezierCurveTo(-9.5*k,-37*k,-3*k,-32*k,0,-24.5*k); x.bezierCurveTo(3*k,-32*k,9.5*k,-37*k,18.5*k,-37*k); x.bezierCurveTo(28.5*k,-37*k,40*k,-29*k,40*k,-14*k); x.bezierCurveTo(40*k,9*k,5*k,30*k,0,36*k); x.closePath(); };
    const [BG,bg]=canvasOf(px);
    let g=bg.createRadialGradient(50,48,4,50,50,76); g.addColorStop(0,'#5b1038'); g.addColorStop(0.55,'#2d0a24'); g.addColorStop(1,'#110410'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    const [G,gl]=canvasOf(px);
    g=gl.createRadialGradient(50,50,8,50,50,62); g.addColorStop(0,'rgba(255,70,120,0.7)'); g.addColorStop(0.55,'rgba(255,50,110,0.26)'); g.addColorStop(1,'rgba(255,40,100,0)'); gl.fillStyle=g; gl.fillRect(0,0,100,100);
    const [H,h]=canvasOf(px);
    h.translate(50,50);
    h.save(); h.shadowColor='rgba(10,0,8,0.65)'; h.shadowBlur=4.5*sc; h.shadowOffsetY=2*sc; h.fillStyle='#d41540'; heart(h); h.fill(); h.restore();
    h.save(); heart(h); h.clip();
    g=h.createRadialGradient(-12,-16,2,-4,0,62); g.addColorStop(0,'#ff8197'); g.addColorStop(0.32,'#fb2f56'); g.addColorStop(0.72,'#d0123f'); g.addColorStop(1,'#7f0a2d'); h.fillStyle=g; h.fillRect(-50,-50,100,100);
    g=h.createRadialGradient(0,-8,28,0,-6,62); g.addColorStop(0,'rgba(90,0,30,0)'); g.addColorStop(1,'rgba(70,0,30,0.62)'); h.fillStyle=g; h.fillRect(-50,-50,100,100);
    g=h.createRadialGradient(24,10,0,24,10,22); g.addColorStop(0,'rgba(255,140,170,0.5)'); g.addColorStop(1,'rgba(255,140,170,0)'); h.fillStyle=g; h.fillRect(-50,-50,100,100);
    h.save(); h.translate(-22.5,-22); h.rotate(-0.78); g=h.createRadialGradient(0,0,0,0,0,13); g.addColorStop(0,'rgba(255,255,255,0.92)'); g.addColorStop(0.45,'rgba(255,240,245,0.5)'); g.addColorStop(1,'rgba(255,240,245,0)'); h.scale(1,0.5); h.fillStyle=g; h.beginPath(); h.arc(0,0,13,0,TAU); h.fill(); h.restore();
    h.fillStyle='rgba(255,255,255,0.75)'; h.beginPath(); h.ellipse(-33,-9,1.9,3.2,-0.28,0,TAU); h.fill();
    h.strokeStyle='rgba(255,190,205,0.35)'; h.lineWidth=1.5; heart(h,0.982); h.stroke();
    h.restore();
    const bump=(x,c,w)=>Math.exp(-((x-c)/w)*((x-c)/w));
    const beat=f=>bump(f,0.14,0.06)+0.74*bump(f,0.37,0.075);
    return (c,t)=>{
      const f=(t%BEAT)/BEAT, b=beat(f);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      c.globalCompositeOperation='lighter'; c.globalAlpha=0.22+0.78*b; c.drawImage(G,0,0,100,100); c.globalCompositeOperation='source-over'; c.globalAlpha=1;
      /* one clean ring leaves on the first beat and is gone before the next */
      let rp=(f-0.14)/0.72; if(rp<0) rp+=1/0.72;
      if(rp>=0&&rp<=1){ const k=lerp(1.0,1.22,E.out(rp)); c.save(); c.translate(CX,CY); c.strokeStyle='rgba(255,160,186,'+(0.6*(1-rp))+')'; c.lineWidth=1.7*(1-rp)+0.35; heart(c,k); c.stroke(); c.restore(); }
      const s=0.86+0.2*b, sx=s*(1+0.018*b), sy=s*(1-0.012*b);
      c.setTransform(sc,0,0,sc,0,0); c.translate(CX,CY); c.scale(sx,sy); c.translate(-50,-50); c.drawImage(H,0,0,100,100);
      finish(c);
    };
  }},

/* ------------------------------------------------------------------ ORBIT */
{ id:'orbit', name:'Orbit', section:'Shakes / Movement', isNew:true, still:1.4,
  line:'Three moons circle a banded planet, passing behind it and swinging back in front.',
  make(px){
    const P=4.8, sc=px/100, CX=50, CY=50, R=28, TILT=-0.34;
    const MOONS=[
      {a:44.5,b:20.5,r:8.2,rev:1,ph:0.62,name:'big'},
      {a:38.5,b:16.5,r:4.6,rev:2,ph:3.4,name:'coral'},
      {a:33.5,b:13,r:3.4,rev:3,ph:1.1,name:'ice'}];
    const [BG,bg]=canvasOf(px);
    let g=bg.createLinearGradient(0,0,100,100); g.addColorStop(0,'#141a4a'); g.addColorStop(0.6,'#0a0f30'); g.addColorStop(1,'#060717'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    g=bg.createRadialGradient(84,14,0,84,14,46); g.addColorStop(0,'rgba(150,80,220,0.34)'); g.addColorStop(1,'rgba(150,80,220,0)'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    g=bg.createRadialGradient(12,92,0,12,92,44); g.addColorStop(0,'rgba(40,140,230,0.3)'); g.addColorStop(1,'rgba(40,140,230,0)'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    /* stars on a jittered grid, so they spread evenly */
    const r=rng(41), stars=[];
    for(let i=0;i<8;i++) for(let j=0;j<8;j++){ const x=(i+0.2+r()*0.6)*12.5, y=(j+0.2+r()*0.6)*12.5, s=0.22+r()*0.42, al=0.35+r()*0.6, tw=r(); bg.fillStyle='rgba(235,240,255,'+al+')'; bg.beginPath(); bg.arc(x,y,s,0,TAU); bg.fill(); if(tw>0.85) stars.push({x,y,ph:r()*TAU}); }
    /* glow behind the planet */
    /* the glow sits on the lit side only, so the dark limb stays dark */
    g=bg.createRadialGradient(CX-4,CY-4,R-4,CX-4,CY-4,R+12); g.addColorStop(0,'rgba(255,190,130,0.32)'); g.addColorStop(1,'rgba(255,160,120,0)'); bg.fillStyle=g; bg.beginPath(); bg.arc(CX-4,CY-4,R+12,0,TAU); bg.fill();

    /* bands, drawn small and scaled up so their edges are soft */
    const LOW=72, Bn=document.createElement('canvas'); Bn.width=Bn.height=LOW; const bn=Bn.getContext('2d'); bn.setTransform(LOW/100,0,0,LOW/100,0,0);
    const STR=[['#fff0cf',0],['#f4c98e',14],['#d98a4b',26],['#fbe2b6',37],['#e7a367',47],['#b4602e',55],['#f6d3a0',64],['#fff0cf',74],['#dfa06a',85],['#b86a3b',94]];
    STR.forEach(([col,y],i)=>{ const nextY=i<STR.length-1?STR[i+1][1]:102; bn.fillStyle=col; bn.beginPath(); bn.moveTo(-2,y); bn.quadraticCurveTo(50,y+10,102,y); bn.lineTo(102,nextY+3); bn.quadraticCurveTo(50,nextY+13,-2,nextY+3); bn.closePath(); bn.fill(); });
    const [PL,pl]=canvasOf(px);
    pl.save(); pl.beginPath(); pl.arc(50,50,R,0,TAU); pl.clip(); pl.translate(50,50); pl.rotate(TILT); pl.translate(-50,-50); pl.imageSmoothingQuality='high'; pl.drawImage(Bn,50-R-5,50-R-5,(R+5)*2,(R+5)*2); pl.restore();
    const [SHD,sd]=canvasOf(px);
    sd.save(); sd.beginPath(); sd.arc(50,50,R+0.05,0,TAU); sd.clip();
    g=sd.createRadialGradient(40,38,5,48,48,R*1.42); g.addColorStop(0,'rgba(255,250,235,0.24)'); g.addColorStop(0.35,'rgba(0,0,0,0)'); g.addColorStop(0.7,'rgba(16,10,60,0.34)'); g.addColorStop(1,'rgba(6,4,40,0.9)'); sd.fillStyle=g; sd.fillRect(0,0,100,100); sd.restore();
    sd.strokeStyle='rgba(255,225,190,0.55)'; sd.lineWidth=0.7; sd.beginPath(); sd.arc(50,50,R-0.25,Math.PI*0.95,Math.PI*1.62); sd.stroke();
    /* moons, each lit from the same side as the planet */
    function moon(rad,c0,c1,c2,craters){
      const k=sc*1.25, S=Math.ceil((rad+0.7)*2*k), C=document.createElement('canvas'); C.width=C.height=S; const x=C.getContext('2d'); x.setTransform(k,0,0,k,S/2,S/2);
      let m=x.createRadialGradient(-rad*0.4,-rad*0.45,rad*0.1,0,0,rad*1.1); m.addColorStop(0,c0); m.addColorStop(0.55,c1); m.addColorStop(1,c2); x.fillStyle=m; x.beginPath(); x.arc(0,0,rad,0,TAU); x.fill();
      (craters||[]).forEach(([cx,cy,cr])=>{ x.fillStyle='rgba(90,84,110,0.32)'; x.beginPath(); x.arc(cx*rad,cy*rad,cr*rad,0,TAU); x.fill(); x.strokeStyle='rgba(255,255,255,0.32)'; x.lineWidth=rad*0.05; x.beginPath(); x.arc(cx*rad,cy*rad,cr*rad,Math.PI*0.1,Math.PI*0.95); x.stroke(); });
      return {C,rad,k};
    }
    const SPR={big:moon(8.2,'#fffaf0','#d9d3e3','#6d6688',[[-0.3,-0.25,0.24],[0.32,0.15,0.17],[-0.1,0.46,0.15],[0.42,-0.42,0.1]]),
               coral:moon(4.6,'#ffd3bf','#ff7b5e','#a02c30'), ice:moon(3.4,'#dff5ff','#66c4ff','#1f5fb0')};
    const pos=(m,th)=>{ const x=m.a*Math.cos(th), y=m.b*Math.sin(th), cT=Math.cos(TILT), sT=Math.sin(TILT); return [CX+x*cT-y*sT, CY+x*sT+y*cT]; };
    return (c,t)=>{
      const u=t%P;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      stars.forEach(s=>{ const tw=0.5+0.5*Math.sin(TAU*u/P*2+s.ph); c.globalAlpha=0.25+0.6*tw; c.fillStyle='#fff'; c.beginPath(); c.arc(s.x,s.y,0.6+tw*0.25,0,TAU); c.fill(); });
      c.globalAlpha=1;
      const state=MOONS.map(m=>{ const th=m.ph+TAU*m.rev*u/P; return {m,th,z:Math.sin(th)}; });
      const orbitHalf=(m,front)=>{ c.strokeStyle=front?'rgba(205,220,255,0.5)':'rgba(190,205,255,0.2)'; c.lineWidth=front?0.55:0.45; c.beginPath(); c.ellipse(CX,CY,m.a,m.b,TILT,front?0:Math.PI,front?Math.PI:TAU); c.stroke(); };
      const trail=(s,front)=>{ const K=16, span=0.95; c.lineCap='round'; for(let i=0;i<K;i++){ const a0=s.th-span*i/K, a1=s.th-span*(i+1)/K; if((Math.sin((a0+a1)/2)>=0)!==front) continue; const [x0,y0]=pos(s.m,a0), [x1,y1]=pos(s.m,a1); c.strokeStyle='rgba(255,240,215,'+(0.5*(1-i/K))+')'; c.lineWidth=1.25*(1-i/K)+0.3; c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.stroke(); } };
      const body=s=>{ const [x,y]=pos(s.m,s.th), sp=SPR[s.m.name], d=1+0.16*s.z, w=sp.C.width/sp.k*d; c.drawImage(sp.C,x-w/2,y-w/2,w,w); };
      MOONS.forEach(m=>orbitHalf(m,false));
      state.forEach(s=>trail(s,false));
      state.filter(s=>s.z<0).sort((a,b)=>a.z-b.z).forEach(body);
      /* the planet, with a storm carried round on its turning */
      c.drawImage(PL,0,0,100,100);
      c.save(); c.beginPath(); c.arc(50,50,R,0,TAU); c.clip(); c.translate(50,50); c.rotate(TILT);
      [[0,8.5,5.4,2.9,'#c4502a','#f0a070'],[2.6,-9.5,4.2,1.25,'rgba(255,246,225,0.8)',null],[4.5,3.2,3.6,1,'rgba(160,80,40,0.55)',null]].forEach(([lon,lat,rx,ry,col,inner])=>{ const a=lon+TAU*u/P, ca=Math.cos(a); if(ca<=0.03) return; const hw=Math.sqrt(Math.max(0,R*R-lat*lat)), x=hw*Math.sin(a), y=lat+1.8*(1-(x/R)*(x/R)); c.fillStyle=col; c.beginPath(); c.ellipse(x,y,rx*ca,ry,0,0,TAU); c.fill(); if(inner){ c.fillStyle=inner; c.beginPath(); c.ellipse(x,y,rx*0.55*ca,ry*0.5,0,0,TAU); c.fill(); } });
      c.restore();
      c.drawImage(SHD,0,0,100,100);
      MOONS.forEach(m=>orbitHalf(m,true));
      state.forEach(s=>trail(s,true));
      state.filter(s=>s.z>=0).sort((a,b)=>a.z-b.z).forEach(body);
      finish(c);
    };
  }},

/* -------------------------------------------------------------- TILE GRID */
{ id:'gridrepeat', name:'Tile Grid', section:'Repetition', isNew:true, still:2.5,
  line:'One cat steps back and the copies slide out from behind it into a tidy grid of nine.',
  make(px){
    const P=4.8, sc=px/100, G=33.6, SIZE=30.8;
    function card(x,shut){
      let g=x.createLinearGradient(0,0,100,100); g.addColorStop(0,'#35d9c9'); g.addColorStop(1,'#0f86a6'); x.fillStyle=g; x.beginPath(); x.roundRect(0,0,100,100,9); x.fill();
      g=x.createRadialGradient(50,52,6,50,52,62); g.addColorStop(0,'rgba(255,255,255,0.34)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,100,100);
      const earShape=sx=>{ const X=v=>50+sx*v; x.beginPath(); x.moveTo(X(31),45); x.quadraticCurveTo(X(38.5),25,X(37.5),12); x.quadraticCurveTo(X(36.8),7.2,X(32),9.6); x.quadraticCurveTo(X(20),16,X(9),32); x.closePath(); };
      const earIn=sx=>{ const X=v=>50+sx*v; x.beginPath(); x.moveTo(X(29),40); x.quadraticCurveTo(X(34.2),25,X(33.5),16.4); x.quadraticCurveTo(X(33.1),13.8,X(30.5),15.2); x.quadraticCurveTo(X(22),20.5,X(14),33); x.closePath(); };
      const head=()=>{ x.beginPath(); x.moveTo(50,28); x.bezierCurveTo(62,28,73,31,80,39); x.bezierCurveTo(89,49,91,61,85,71); x.bezierCurveTo(78,82,65,88,50,88); x.bezierCurveTo(35,88,22,82,15,71); x.bezierCurveTo(9,61,11,49,20,39); x.bezierCurveTo(27,31,38,28,50,28); x.closePath(); };
      x.save(); x.shadowColor='rgba(3,48,70,0.55)'; x.shadowBlur=5*sc; x.shadowOffsetY=2*sc; x.fillStyle='#f58a1f'; earShape(-1); x.fill(); earShape(1); x.fill(); head(); x.fill(); x.restore();
      const fur=x.createLinearGradient(0,8,0,88); fur.addColorStop(0,'#ffc562'); fur.addColorStop(0.55,'#fb9c30'); fur.addColorStop(1,'#ea7a18');
      x.fillStyle=fur; earShape(-1); x.fill(); earShape(1); x.fill();
      g=x.createLinearGradient(0,12,0,40); g.addColorStop(0,'#ffc0c9'); g.addColorStop(1,'#ec7f8e'); x.fillStyle=g; earIn(-1); x.fill(); earIn(1); x.fill();
      x.fillStyle=fur; head(); x.fill();
      x.save(); head(); x.clip();
      g=x.createRadialGradient(38,40,0,38,40,46); g.addColorStop(0,'rgba(255,238,195,0.5)'); g.addColorStop(1,'rgba(255,238,195,0)'); x.fillStyle=g; x.fillRect(0,0,100,100);
      g=x.createRadialGradient(50,58,26,50,58,46); g.addColorStop(0,'rgba(170,70,10,0)'); g.addColorStop(1,'rgba(150,60,10,0.34)'); x.fillStyle=g; x.fillRect(0,0,100,100);
      /* tabby marks: filled and tapered, in matched pairs */
      x.fillStyle='#c9600f';
      x.beginPath(); x.moveTo(47.8,27); x.quadraticCurveTo(49,38,50,46); x.quadraticCurveTo(51,38,52.2,27); x.closePath(); x.fill();
      [-1,1].forEach(sx=>{ const X=v=>50+sx*v;
        x.beginPath(); x.moveTo(X(9.5),28); x.quadraticCurveTo(X(8),38,X(6.5),44); x.quadraticCurveTo(X(11.5),38,X(15.5),29); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(X(21),30); x.quadraticCurveTo(X(18),39,X(15.5),43.5); x.quadraticCurveTo(X(22),40,X(27),32); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(X(44),47.5); x.quadraticCurveTo(X(36),48.6,X(30.5),50.5); x.quadraticCurveTo(X(36),51.5,X(44),53.5); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(X(44),56); x.quadraticCurveTo(X(37.5),57,X(32),59); x.quadraticCurveTo(X(37.5),60,X(44),62); x.closePath(); x.fill();
      });
      /* the white muzzle */
      g=x.createLinearGradient(0,62,0,88); g.addColorStop(0,'#fffdf7'); g.addColorStop(1,'#f6e7d4'); x.fillStyle=g;
      x.beginPath(); x.ellipse(42.2,72.4,11,8.8,0,0,TAU); x.ellipse(57.8,72.4,11,8.8,0,0,TAU); x.ellipse(50,80,10,7.5,0,0,TAU); x.fill();
      x.restore();
      /* eyes */
      [-1,1].forEach(sx=>{ const ex=50+sx*16.5, ey=57; x.save(); x.translate(ex,ey); x.rotate(-sx*0.12);
        if(shut){ x.strokeStyle='#4a2b14'; x.lineWidth=2.1; x.lineCap='round'; x.beginPath(); x.moveTo(-9,-0.5); x.quadraticCurveTo(0,6.5,9,-0.5); x.stroke(); }
        else {
          x.fillStyle='#2a1a12'; x.beginPath(); x.ellipse(0,0,10.2,9.7,0,0,TAU); x.fill();
          const ir=x.createRadialGradient(-2,-3,0.6,0,0,9.4); ir.addColorStop(0,'#eaf776'); ir.addColorStop(0.55,'#9bd63a'); ir.addColorStop(1,'#3f8f26'); x.fillStyle=ir; x.beginPath(); x.ellipse(0,0,9.2,8.8,0,0,TAU); x.fill();
          x.save(); x.beginPath(); x.ellipse(0,0,9.2,8.8,0,0,TAU); x.clip(); const lid=x.createLinearGradient(0,-9,0,-2); lid.addColorStop(0,'rgba(20,14,6,0.5)'); lid.addColorStop(1,'rgba(20,14,6,0)'); x.fillStyle=lid; x.fillRect(-10,-10,20,10); x.restore();
          x.fillStyle='#120b08'; x.beginPath(); x.ellipse(0,0.2,3.5,7.8,0,0,TAU); x.fill();
          x.fillStyle='#fff'; x.beginPath(); x.arc(-3.3,-3.8,2.35,0,TAU); x.fill(); x.globalAlpha=0.85; x.beginPath(); x.arc(3,3.6,1.05,0,TAU); x.fill(); x.globalAlpha=1;
        }
        x.restore(); });
      /* nose and mouth */
      g=x.createLinearGradient(0,63,0,69); g.addColorStop(0,'#ffa6b8'); g.addColorStop(1,'#e2627f'); x.fillStyle=g;
      x.beginPath(); x.moveTo(46,64); x.quadraticCurveTo(50,62.7,54,64); x.quadraticCurveTo(54.6,65.4,50.9,68.3); x.quadraticCurveTo(50,69,49.1,68.3); x.quadraticCurveTo(45.4,65.4,46,64); x.closePath(); x.fill();
      x.fillStyle='rgba(255,255,255,0.75)'; x.beginPath(); x.ellipse(48.6,64.6,1.2,0.6,-0.2,0,TAU); x.fill();
      x.strokeStyle='#5a3420'; x.lineWidth=1.3; x.lineCap='round'; x.lineJoin='round';
      x.beginPath(); x.moveTo(50,68.6); x.lineTo(50,71.6); x.moveTo(50,71.6); x.bezierCurveTo(49,75.2,43.8,75.4,41.6,72.4); x.moveTo(50,71.6); x.bezierCurveTo(51,75.2,56.2,75.4,58.4,72.4); x.stroke();
      /* whiskers, three a side, fanned evenly */
      x.strokeStyle='rgba(255,252,244,0.97)'; x.lineWidth=0.95;
      [-1,1].forEach(sx=>{ const X=v=>50+sx*v; [[68.4,62.6],[71.6,71.4],[74.8,80.2]].forEach(([y0,y1])=>{ x.beginPath(); x.moveTo(X(19),y0); x.quadraticCurveTo(X(34),(y0+y1)/2-1,X(48.5),y1); x.stroke(); }); });
    }
    const [CO,co]=canvasOf(px), [CS,cs]=canvasOf(px); card(co,false); card(cs,true);
    const mip=src=>{ const s=Math.round(px*0.42), C=document.createElement('canvas'); C.width=C.height=s; const x=C.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(src,0,0,s,s); return C; };
    const MO=mip(CO), MS=mip(CS);
    const SH=softShape(px,x=>{ x.beginPath(); x.roundRect(8,8,84,84,8); },3.4,'rgba(1,16,34,0.85)');
    const [BG,bg]=canvasOf(px);
    let g=bg.createRadialGradient(50,50,6,50,50,76); g.addColorStop(0,'#14506b'); g.addColorStop(1,'#07222f'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    bg.fillStyle='rgba(255,255,255,0.05)'; for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){ bg.beginPath(); bg.roundRect(50+i*G-SIZE/2,50+j*G-SIZE/2,SIZE,SIZE,2.8); bg.fill(); }
    /* corners first in the draw order, so the four edge cards lie over them as they all burst out together */
    const OUT=[[-1,-1],[1,-1],[1,1],[-1,1],[0,-1],[1,0],[0,1],[-1,0]];
    return (c,t)=>{
      const u=t%P;
      const shrink=E.inOut(seg(u,0.7,1.3))*(1-E.inOut(seg(u,4.0,4.6)));
      const size=lerp(110,SIZE,shrink);
      const shut=(u>0.34&&u<0.46)||(u>2.72&&u<2.84)||(u>2.98&&u<3.1);
      const small=size<55, img=shut?(small?MS:CS):(small?MO:CO);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      const put=(x,y,s)=>{ const b=s*100/84; c.globalAlpha=0.7; c.drawImage(SH,x-b/2,y-b/2+s*0.035,b,b); c.globalAlpha=1; c.drawImage(img,x-s/2,y-s/2,s,s); };
      OUT.forEach(([dx,dy])=>{
        const corner=dx&&dy, d=corner?0.12:0, rd=corner?0:0.1;
        const o=seg(u,1.05+d,1.7+d), ret=E.inOut(seg(u,3.72+rd,4.22+rd));
        if(o<=0||ret>=1) return;
        const p=back(o)*(1-ret);
        put(50+dx*G*p,50+dy*G*p,size*lerp(0.78,1,clamp(p)));
      });
      put(50,50,size);
      finish(c);
    };
  }},

/* ------------------------------------------------------------- RING ARRAY */
{ id:'radialrepeat', name:'Ring Array', section:'Repetition', isNew:true, still:3.0,
  line:'One petal is copied round the centre, segment by segment, until it is a full flower.',
  make(px){
    const P=5, sc=px/100, CX=50, CY=50, N=12;
    function petal(L,W,c0,c1,c2){
      const pad=4, Wd=(W+pad)*2, Ht=L+pad*2, C=document.createElement('canvas'); C.width=Math.ceil(Wd*sc); C.height=Math.ceil(Ht*sc);
      const x=C.getContext('2d'); x.setTransform(sc,0,0,sc,(W+pad)*sc,(L+pad)*sc);
      const path=()=>{ x.beginPath(); x.moveTo(0,1.5); x.bezierCurveTo(-W*0.3,-L*0.1,-W*1.06,-L*0.38,-W,-L*0.62); x.bezierCurveTo(-W*0.94,-L*0.88,-W*0.3,-L*0.99,0,-L); x.bezierCurveTo(W*0.3,-L*0.99,W*0.94,-L*0.88,W,-L*0.62); x.bezierCurveTo(W*1.06,-L*0.38,W*0.3,-L*0.1,0,1.5); x.closePath(); };
      x.save(); x.shadowColor='rgba(30,0,25,0.42)'; x.shadowBlur=2.4*sc; x.fillStyle=c1; path(); x.fill(); x.restore();
      x.save(); path(); x.clip();
      let g=x.createLinearGradient(0,0,0,-L); g.addColorStop(0,c0); g.addColorStop(0.55,c1); g.addColorStop(1,c2); x.fillStyle=g; x.fillRect(-W-1,-L-1,2*W+2,L+4);
      g=x.createLinearGradient(-W,0,W,0); g.addColorStop(0,'rgba(60,0,40,0.38)'); g.addColorStop(0.32,'rgba(60,0,40,0)'); g.addColorStop(0.68,'rgba(60,0,40,0)'); g.addColorStop(1,'rgba(60,0,40,0.38)'); x.fillStyle=g; x.fillRect(-W-1,-L-1,2*W+2,L+4);
      x.strokeStyle='rgba(255,235,245,0.42)'; x.lineWidth=0.5; x.lineCap='round';
      x.beginPath(); x.moveTo(0,0); x.lineTo(0,-L*0.86); x.stroke();
      [-1,1].forEach(s=>{ x.beginPath(); x.moveTo(0,-L*0.12); x.quadraticCurveTo(s*W*0.62,-L*0.42,s*W*0.42,-L*0.8); x.stroke(); });
      x.restore();
      return {C,W:Wd,H:Ht,ox:W+pad,oy:L+pad};
    }
    const OUTER=petal(45.5,12.6,'#8b0f55','#ff3f87','#ffc2d9');
    const [BG,bg]=canvasOf(px);
    let g=bg.createRadialGradient(50,50,6,50,50,76); g.addColorStop(0,'#14584f'); g.addColorStop(0.65,'#0b3531'); g.addColorStop(1,'#051a1a'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    bg.strokeStyle='rgba(180,255,230,0.09)'; bg.lineWidth=0.5; for(let i=0;i<N;i++){ const a=i*TAU/N-Math.PI/2; bg.beginPath(); bg.moveTo(50,50); bg.lineTo(50+Math.cos(a)*72,50+Math.sin(a)*72); bg.stroke(); }
    /* the seed head: real phyllotaxis, so even the middle has order */
    const [D,d]=canvasOf(px);
    d.save(); d.shadowColor='rgba(40,10,0,0.55)'; d.shadowBlur=2.6*sc; d.fillStyle='#e8960f'; d.beginPath(); d.arc(50,50,9.4,0,TAU); d.fill(); d.restore();
    g=d.createRadialGradient(47.6,47,1,50,50,10); g.addColorStop(0,'#ffe680'); g.addColorStop(0.6,'#ffb52e'); g.addColorStop(1,'#c26d0a'); d.fillStyle=g; d.beginPath(); d.arc(50,50,9.4,0,TAU); d.fill();
    d.fillStyle='#8a4a06'; for(let i=1;i<70;i++){ const a=i*2.39996, r=0.98*Math.sqrt(i); if(r>8.6) break; d.beginPath(); d.arc(50+Math.cos(a)*r,50+Math.sin(a)*r,0.33+r*0.02,0,TAU); d.fill(); }
    return (c,t)=>{
      const u=t%P;
      const pO=E.inOut(seg(u,0.5,1.75))*(1-E.inOut(seg(u,3.9,4.75)));
      const rot=(TAU/24)*E.inOut(seg(u,1.9,3.7))*(1-E.inOut(seg(u,3.7,4.75)));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      const put=(spr,a,s)=>{ c.setTransform(sc,0,0,sc,0,0); c.translate(CX,CY); c.rotate(a); c.scale(s,s); c.drawImage(spr.C,-spr.ox,-spr.oy,spr.W,spr.H); };
      const ring=(spr,off,p,s)=>{
        if(s<=0.01) return;
        const m=p<0.004?1:N;
        for(let i=0;i<m;i++) put(spr,off+rot+i*TAU/N*p,s);
        /* close the circle: the first petal's left half goes back over the last petal */
        if(m===N&&p>0.9){ c.save(); c.setTransform(sc,0,0,sc,0,0); c.translate(CX,CY); c.rotate(off+rot); c.scale(s,s); c.beginPath(); c.rect(-spr.ox,-spr.oy,spr.ox,spr.H); c.clip(); c.drawImage(spr.C,-spr.ox,-spr.oy,spr.W,spr.H); c.restore(); }
      };
      ring(OUTER,0,pO,1);
      const ds=lerp(0.62,1,E.inOut(seg(u,0.5,1.75))*(1-E.inOut(seg(u,3.9,4.75))));
      c.setTransform(sc,0,0,sc,0,0); c.translate(CX,CY); c.rotate(rot); c.scale(ds,ds); c.translate(-50,-50); c.drawImage(D,0,0,100,100);
      finish(c);
    };
  }},

/* ------------------------------------------------------------ MIRROR TILE */
{ id:'mirrortile', name:'Mirror Tile', section:'Repetition', isNew:true, still:2.62,
  line:'One koi tile folds out across its edges, and the mirrored copies meet into a seamless wallpaper.',
  make(px){
    const P=5, sc=px/100;
    const CC=100, RAD=61, A0=-1.70, A1=-2.76, WAG=TAU*4/P;
    function pond(x){
      let g=x.createRadialGradient(100,100,10,100,100,150); g.addColorStop(0,'#3bcdc6'); g.addColorStop(0.55,'#1496aa'); g.addColorStop(1,'#0a6280'); x.fillStyle=g; x.fillRect(0,0,100,100);
      x.lineCap='round';
      for(let r=80,i=0;r<145;r+=8.4,i++){ x.strokeStyle='rgba(225,255,250,'+(i%2?0.11:0.07)+')'; x.lineWidth=0.75; x.beginPath(); x.arc(100,100,r,Math.PI,Math.PI*1.5); x.stroke(); }
      /* lily pads sit exactly on the corners: a quarter here, a whole pad once mirrored */
      const pad=(cx,cy,r,a0,a1,c0,c1,c2,veins)=>{
        x.save(); x.shadowColor='rgba(0,40,50,0.5)'; x.shadowBlur=2.6*(px/100); x.fillStyle=c1; x.beginPath(); x.arc(cx,cy,r,0,TAU); x.fill(); x.restore();
        const gg=x.createRadialGradient(cx,cy,0,cx,cy,r); gg.addColorStop(0,c0); gg.addColorStop(0.75,c1); gg.addColorStop(1,c2); x.fillStyle=gg; x.beginPath(); x.arc(cx,cy,r,0,TAU); x.fill();
        x.strokeStyle='rgba(235,255,210,0.42)'; x.lineWidth=0.55; for(let i=1;i<veins;i++){ const a=lerp(a0,a1,i/veins); x.beginPath(); x.moveTo(cx+Math.cos(a)*r*0.12,cy+Math.sin(a)*r*0.12); x.lineTo(cx+Math.cos(a)*r*0.93,cy+Math.sin(a)*r*0.93); x.stroke(); }
        x.strokeStyle='rgba(225,255,190,0.55)'; x.lineWidth=0.7; x.beginPath(); x.arc(cx,cy,r-0.5,a0,a1); x.stroke();
      };
      pad(0,0,44,0,Math.PI/2,'#a8e063','#55b246','#2f8a3c',7);
      pad(100,0,18.5,Math.PI/2,Math.PI,'#c3ec7c','#7ccb55','#459a45',4);
      pad(0,100,18.5,-Math.PI/2,0,'#c3ec7c','#7ccb55','#459a45',4);
      /* a lotus on the far corner: a quarter here, the whole bloom at the middle of four */
      const pet=(L,W,a,c0,c1,c2)=>{ x.save(); x.translate(100,100); x.rotate(a+Math.PI/2); x.save(); x.shadowColor='rgba(120,0,70,0.38)'; x.shadowBlur=1.8*(px/100); x.fillStyle=c1; x.beginPath(); x.moveTo(0,0); x.bezierCurveTo(-W*0.5,-L*0.2,-W,-L*0.55,0,-L); x.bezierCurveTo(W,-L*0.55,W*0.5,-L*0.2,0,0); x.closePath(); x.fill(); x.restore();
        const gg=x.createLinearGradient(0,0,0,-L); gg.addColorStop(0,c0); gg.addColorStop(0.6,c1); gg.addColorStop(1,c2); x.fillStyle=gg; x.beginPath(); x.moveTo(0,0); x.bezierCurveTo(-W*0.5,-L*0.2,-W,-L*0.55,0,-L); x.bezierCurveTo(W,-L*0.55,W*0.5,-L*0.2,0,0); x.closePath(); x.fill(); x.restore(); };
      for(let i=0;i<4;i++) pet(38,13.5,Math.PI+(i+0.0)*(Math.PI/2)/3,'#e0407f','#ff86b4','#ffe0ec');
      for(let i=0;i<3;i++) pet(27,11,Math.PI+(i+0.5)*(Math.PI/2)/3,'#f25e92','#ffa6c8','#fff0f6');
      for(let i=0;i<4;i++) pet(16.5,7.5,Math.PI+i*(Math.PI/2)/3,'#ff9db8','#ffd0dd','#fff9ec');
      g=x.createRadialGradient(100,100,0,100,100,7); g.addColorStop(0,'#fff0a0'); g.addColorStop(1,'#f2a51c'); x.fillStyle=g; x.beginPath(); x.arc(100,100,6.4,0,TAU); x.fill();
    }
    const width=s=>{ const a=Math.pow(Math.min(1,s/0.17),0.5), b=1-0.8*Math.pow(s,1.55); return 13*a*b; };
    const spine=(s,u)=>{ const ang=lerp(A0,A1,s), off=4.4*s*s*Math.sin(WAG*u-4.6*s), r=RAD+off, nx=Math.cos(ang), ny=Math.sin(ang); return {x:CC+nx*r,y:CC+ny*r,nx,ny}; };
    function koi(x,u){
      const K=38, L=[], R=[], SS=[];
      for(let i=0;i<=K;i++){ const s=Math.pow(i/K,1.55), p=spine(s,u), hw=width(s); SS.push(s); L.push([p.x+p.nx*hw,p.y+p.ny*hw]); R.push([p.x-p.nx*hw,p.y-p.ny*hw]); }
      const bodyPath=()=>{ x.beginPath(); x.moveTo(L[0][0],L[0][1]); for(let i=1;i<=K;i++) x.lineTo(L[i][0],L[i][1]); for(let i=K;i>=0;i--) x.lineTo(R[i][0],R[i][1]); x.closePath(); };
      /* soft shadow on the water, drawn as the body offset */
      x.save(); x.globalAlpha=0.22; x.translate(1.4,2.2); x.fillStyle='#03303e'; bodyPath(); x.fill(); x.restore();
      /* pectoral fins */
      const fin=(sd)=>{ const s=0.26, p=spine(s,u), hw=width(s), ang=Math.atan2(sd*p.ny,sd*p.nx)+sd*(-0.5+0.26*Math.sin(WAG*u)); x.save(); x.translate(p.x+sd*p.nx*hw*0.86,p.y+sd*p.ny*hw*0.86); x.rotate(ang); x.fillStyle='#fff0d8'; x.beginPath(); x.moveTo(0,-2.4); x.bezierCurveTo(5,-6,12,-5.5,13.5,-1); x.bezierCurveTo(14,2.5,7,4.2,0,2.4); x.closePath(); x.fill(); x.strokeStyle='rgba(216,110,50,0.55)'; x.lineWidth=0.4; for(let k=-1;k<=1;k++){ x.beginPath(); x.moveTo(1,k*1.2); x.lineTo(11.5,-1.4+k*2.2); x.stroke(); } x.restore(); };
      fin(1); fin(-1);
      /* tail */
      const q=spine(1,u), q0=spine(0.94,u), dir=Math.atan2(q.y-q0.y,q.x-q0.x), wa=0.34*Math.sin(WAG*u-5.5);
      x.save(); x.translate(q.x,q.y); x.rotate(dir+wa);
      let g=x.createLinearGradient(0,0,20,0); g.addColorStop(0,'#ff7a2f'); g.addColorStop(0.55,'#ffb48a'); g.addColorStop(1,'#fff3e2'); x.fillStyle=g;
      x.beginPath(); x.moveTo(-1,-2.8); x.bezierCurveTo(5,-5,11,-11,20,-11); x.quadraticCurveTo(15,-5,12,0); x.quadraticCurveTo(15,5,20,11); x.bezierCurveTo(11,11,5,5,-1,2.8); x.closePath(); x.fill();
      x.strokeStyle='rgba(205,80,30,0.42)'; x.lineWidth=0.4; [[-8.2,-1],[-4.8,-0.6],[-1.6,-0.3],[1.6,0.3],[4.8,0.6],[8.2,1]].forEach(([y])=>{ x.beginPath(); x.moveTo(1,y*0.28); x.lineTo(15.5,y); x.stroke(); });
      x.restore();
      /* body */
      x.fillStyle='#fff6ea'; bodyPath(); x.fill();
      x.save(); bodyPath(); x.clip();
      const patch=(a,b,kw,sd)=>{ const n=14, up=[], dn=[]; for(let i=0;i<=n;i++){ const f=i/n, s=lerp(a,b,f), p=spine(s,u), hw=width(s)*(kw+0.2*vnoise(s*9,sd))*Math.pow(Math.sin(Math.PI*f),0.34); up.push([p.x+p.nx*hw,p.y+p.ny*hw]); dn.push([p.x-p.nx*hw,p.y-p.ny*hw]); } x.beginPath(); x.moveTo(up[0][0],up[0][1]); up.forEach(v=>x.lineTo(v[0],v[1])); dn.reverse().forEach(v=>x.lineTo(v[0],v[1])); x.closePath(); x.fill(); };
      x.fillStyle='#f4561d'; patch(0.03,0.2,0.98,3); patch(0.28,0.5,1.04,5); patch(0.58,0.74,0.94,8); patch(0.82,0.98,0.9,11);
      /* scales: a tidy row-and-column of little arcs */
      x.strokeStyle='rgba(140,50,20,0.16)'; x.lineWidth=0.3; x.beginPath();
      for(let i=0;i<16;i++){ const s=0.2+i*0.05, p=spine(s,u), hw=width(s); for(let k=-2;k<=2;k++){ const f=(k+(i%2?0.5:0))*0.34, mx=p.x+p.nx*hw*f, my=p.y+p.ny*hw*f; x.moveTo(mx+p.nx*1.6,my+p.ny*1.6); x.arc(mx,my,1.6,Math.atan2(p.ny,p.nx),Math.atan2(p.ny,p.nx)+Math.PI,true); } }
      x.stroke();
      x.strokeStyle='rgba(120,60,40,0.3)'; x.lineWidth=4.4; bodyPath(); x.stroke();
      x.restore();
      /* the dorsal line */
      const dn=14, dU=[], dD=[]; for(let i=0;i<=dn;i++){ const f=i/dn, s=lerp(0.3,0.8,f), p=spine(s,u), hw=0.95*Math.sin(Math.PI*f); dU.push([p.x+p.nx*hw,p.y+p.ny*hw]); dD.push([p.x-p.nx*hw,p.y-p.ny*hw]); }
      x.fillStyle='rgba(200,62,18,0.82)'; x.beginPath(); x.moveTo(dU[0][0],dU[0][1]); dU.forEach(v=>x.lineTo(v[0],v[1])); dD.reverse().forEach(v=>x.lineTo(v[0],v[1])); x.closePath(); x.fill();
      /* the face */
      [1,-1].forEach(sd=>{ const s=0.078, p=spine(s,u), hw=width(s); const ex=p.x+sd*p.nx*hw*0.68, ey=p.y+sd*p.ny*hw*0.68; x.fillStyle='#17110e'; x.beginPath(); x.arc(ex,ey,1.75,0,TAU); x.fill(); x.fillStyle='#fff'; x.beginPath(); x.arc(ex-0.5,ey-0.55,0.58,0,TAU); x.fill(); });
      const nose=spine(0.008,u), tangent=Math.atan2(nose.nx,-nose.ny);
      x.strokeStyle='#fff0d8'; x.lineWidth=0.55; x.lineCap='round'; [1,-1].forEach(sd=>{ const p=spine(0.03,u), hw=width(0.03); const ax=p.x+sd*p.nx*hw*0.7, ay=p.y+sd*p.ny*hw*0.7; x.beginPath(); x.moveTo(ax,ay); x.quadraticCurveTo(ax+Math.cos(tangent)*2+sd*p.nx*2.4,ay+Math.sin(tangent)*2+sd*p.ny*2.4,ax+Math.cos(tangent)*0.8+sd*p.nx*5,ay+Math.sin(tangent)*0.8+sd*p.ny*5); x.stroke(); });
    }
    const res=[px,Math.round(px/2)];
    const pondImg=res.map(r=>{ const C=document.createElement('canvas'); C.width=C.height=r; const x=C.getContext('2d'); x.setTransform(r/100,0,0,r/100,0,0); pond(x); return C; });
    const work=res.map(r=>{ const C=document.createElement('canvas'); C.width=C.height=r; return {C,x:C.getContext('2d'),r}; });
    const renderTile=(lvl,u)=>{ const w=work[lvl]; w.x.setTransform(1,0,0,1,0,0); w.x.globalAlpha=1; w.x.drawImage(pondImg[lvl],0,0); w.x.setTransform(w.r/100,0,0,w.r/100,0,0); koi(w.x,u); return w.C; };
    const [EM,em]=canvasOf(px);
    let g=em.createRadialGradient(50,50,8,50,50,76); g.addColorStop(0,'#0e3442'); g.addColorStop(1,'#051620'); em.fillStyle=g; em.fillRect(0,0,100,100);
    const cell=(c,T,i,j,k)=>{ const fx=i%2, fy=j%2; c.save(); c.translate(i*k+(fx?k:0),j*k+(fy?k:0)); c.scale(fx?-1:1,fy?-1:1); c.drawImage(T,-0.1,-0.1,k+0.2,k+0.2); c.restore(); };
    const slot=(c,x,y,k,a)=>{ if(a<=0) return; c.strokeStyle='rgba(180,240,255,'+a+')'; c.lineWidth=0.7; c.setLineDash([2.6,2.2]); c.strokeRect(x+1.4,y+1.4,k-2.8,k-2.8); c.setLineDash([]); };
    return (c,t)=>{
      const u=t%P;
      const z1=E.inOut(seg(u,0.6,1.1)), z2=E.inOut(seg(u,2.75,3.4)), zb=E.inOut(seg(u,4.1,5.0));
      const k=100*Math.pow(2,-(z1+z2-2*zb));
      const p1=seg(u,1.15,1.7), p2=seg(u,1.75,2.3);
      const T=renderTile(k>60?0:1,u);
      begin(c,sc);
      if(p2>=1){
        c.fillStyle='#0f7d93'; c.fillRect(0,0,100,100);
        const n=Math.ceil(100/k-1e-6);
        for(let i=0;i<n;i++) for(let j=0;j<n;j++) cell(c,T,i,j,k);
      } else {
        c.drawImage(EM,0,0,100,100);
        const ga=0.5*z1;
        if(p1<1) slot(c,k,0,k,ga);
        slot(c,0,k,k,ga); slot(c,k,k,k,ga);
        cell(c,T,0,0,k);
        if(p1>=1) cell(c,T,1,0,k);
        if(p1>0&&p1<1){ const f=Math.cos(Math.PI*E.inOut(p1)); c.save(); c.translate(k,0); c.scale(f,1); c.translate(-k,0); c.drawImage(T,0,0,k,k); c.fillStyle='rgba(0,20,30,'+(0.55*(1-Math.abs(f)))+')'; c.fillRect(0,0,k,k); c.restore(); }
        if(p2>0){ const f=Math.cos(Math.PI*E.inOut(p2)); c.save(); c.translate(0,k); c.scale(1,f); c.translate(0,-k); cell(c,T,0,0,k); cell(c,T,1,0,k); c.fillStyle='rgba(0,20,30,'+(0.55*(1-Math.abs(f)))+')'; c.fillRect(0,0,2*k,k); c.restore(); }
      }
      /* each new seam flashes as the copy lands, then disappears */
      const f1=p1>=1?1-seg(u,1.7,1.98):0, f2=p2>=1?1-seg(u,2.3,2.55):0;
      c.lineCap='butt';
      if(f1>0){ c.strokeStyle='rgba(255,255,255,'+(0.8*f1)+')'; c.lineWidth=0.8; c.beginPath(); c.moveTo(k,0); c.lineTo(k,k); c.stroke(); }
      if(f2>0){ c.strokeStyle='rgba(255,255,255,'+(0.8*f2)+')'; c.lineWidth=0.8; c.beginPath(); c.moveTo(0,k); c.lineTo(2*k,k); c.stroke(); }
      finish(c);
    };
  }}
);
})();
