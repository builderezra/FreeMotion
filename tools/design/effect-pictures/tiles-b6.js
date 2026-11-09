/* Batch 6: Scatter Array, Particles, Snow & Rain, Starfield, Lens Flare, Music Visualiser, Page Curl. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

const backOut=p=>{ const s=1.70158, q=p-1; return q*q*((s+1)*q+s)+1; };
const frac=v=>v-Math.floor(v);
/* a square sprite drawn in -50..50 units about its centre */
function spr(S,fn){ const C=document.createElement('canvas'); C.width=C.height=S; const x=C.getContext('2d'); x.setTransform(S/100,0,0,S/100,S/2,S/2); fn(x); return C; }
function glowOf(S,rgb,mid,midA){ return spr(S,x=>{ const g=x.createRadialGradient(0,0,0,0,0,50); g.addColorStop(0,'rgba('+rgb+',1)'); g.addColorStop(mid===undefined?0.3:mid,'rgba('+rgb+','+(midA===undefined?0.4:midA)+')'); g.addColorStop(1,'rgba('+rgb+',0)'); x.fillStyle=g; x.fillRect(-50,-50,100,100); }); }
function blit(c,img,x,y,r){ c.drawImage(img,x-r,y-r,r*2,r*2); }
function done(c){ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; }

window.FX_TILES.push(

/* ---------------------------------------------------------------- SCATTER ARRAY: one donut, flung into a hand-placed set of copies */
{ id:'scatterarray', name:'Scatter Array', section:'Repetition', isNew:true, still:2.3,
  line:'One glazed donut bursts into copies that land scattered around it, each its own size and angle.',
  make(px){
    const P=4.4, sc=px/100, S=Math.round(px*0.8);
    const [BG,b]=canvasOf(px);
    let g=b.createRadialGradient(50,46,6,50,50,78); g.addColorStop(0,'#35c3b9'); g.addColorStop(0.55,'#14808c'); g.addColorStop(1,'#07404f'); b.fillStyle=g; b.fillRect(0,0,100,100);
    b.fillStyle='rgba(255,255,255,0.07)'; for(let i=0;i<=10;i++) for(let j=0;j<=10;j++){ b.beginPath(); b.arc(i*10,j*10,0.55,0,TAU); b.fill(); }

    const edge=a=>37+3.2*Math.sin(a*5+0.7)+2.3*Math.sin(a*9+2.1)+1.1*Math.sin(a*14+0.3);
    const inner=a=>19.5+0.9*Math.sin(a*7+1);
    const ring=(x,fnO,fnI)=>{ x.beginPath(); const N=160; for(let i=0;i<=N;i++){ const a=i/N*TAU, r=fnO(a); if(i) x.lineTo(Math.cos(a)*r,Math.sin(a)*r); else x.moveTo(Math.cos(a)*r,Math.sin(a)*r); } x.closePath(); for(let i=N;i>=0;i--){ const a=i/N*TAU, r=fnI(a); if(i===N) x.moveTo(Math.cos(a)*r,Math.sin(a)*r); else x.lineTo(Math.cos(a)*r,Math.sin(a)*r); } x.closePath(); };
    const BODY=spr(S,x=>{
      let g=x.createRadialGradient(-6,-8,8,0,0,50); g.addColorStop(0,'#f8d8a4'); g.addColorStop(0.58,'#e6a95f'); g.addColorStop(1,'#a8622c'); x.fillStyle=g; x.beginPath(); x.arc(0,0,47,0,TAU); x.arc(0,0,14,0,TAU,true); x.fill('evenodd');
      g=x.createRadialGradient(0,0,19,0,0,44); g.addColorStop(0,'#ffb9d3'); g.addColorStop(0.5,'#ff86b5'); g.addColorStop(1,'#ec4f8d'); x.fillStyle=g; ring(x,edge,inner); x.fill('evenodd');
      x.save(); ring(x,edge,inner); x.clip('evenodd'); x.strokeStyle='rgba(165,25,85,0.35)'; x.lineWidth=2.4; ring(x,edge,inner); x.stroke(); x.restore();
      const r=rng(44), cols=['#ffe066','#ffffff','#66d9ef','#b388ff','#8ee67f'];
      x.lineCap='round'; x.lineWidth=2.5; let k=0;
      [[25.5,9],[33,14]].forEach(([rr,n],lvl)=>{ for(let i=0;i<n;i++){ const a=(i+lvl*0.5)/n*TAU+(r()-0.5)*0.16, cx=Math.cos(a)*(rr+(r()-0.5)*1.6), cy=Math.sin(a)*(rr+(r()-0.5)*1.6), d=r()*TAU, l=3.1;
        x.strokeStyle=cols[k++%5]; x.beginPath(); x.moveTo(cx-Math.cos(d)*l,cy-Math.sin(d)*l); x.lineTo(cx+Math.cos(d)*l,cy+Math.sin(d)*l); x.stroke(); } });
    });
    /* the light stays still while the donut turns */
    const GLOSS=spr(S,x=>{
      const g=x.createLinearGradient(-34,-34,34,34); g.addColorStop(0,'rgba(255,255,255,0.10)'); g.addColorStop(0.5,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(70,15,40,0.32)'); x.fillStyle=g; x.beginPath(); x.arc(0,0,47,0,TAU); x.arc(0,0,14,0,TAU,true); x.fill('evenodd');
      x.lineCap='round'; x.strokeStyle='rgba(255,255,255,0.62)'; x.lineWidth=3.4; x.beginPath(); x.arc(0,0,31,Math.PI*1.1,Math.PI*1.42); x.stroke();
      x.lineWidth=2.2; x.strokeStyle='rgba(255,255,255,0.42)'; x.beginPath(); x.arc(0,0,31,Math.PI*1.49,Math.PI*1.56); x.stroke();
      x.strokeStyle='rgba(255,226,180,0.8)'; x.lineWidth=2; x.beginPath(); x.arc(0,0,15.4,Math.PI*0.05,Math.PI*0.65); x.stroke();
      x.strokeStyle='rgba(90,45,20,0.55)'; x.lineWidth=2.2; x.beginPath(); x.arc(0,0,15.2,Math.PI*1.05,Math.PI*1.7); x.stroke();
    });
    const SH=glowOf(Math.round(S*0.4),'4,28,38',0.62,0.62);
    /* hand-placed around the middle so nothing touches: x, y, radius, final angle, fade */
    const COPIES=[[15.5,17.5,14,-0.7,0.96],[50,11.5,10,0.45,0.84],[84.5,17,13,0.95,0.92],[90,50,9.2,-0.3,0.8],[82.5,82.5,15,0.55,1],[50,89.5,10.2,-0.85,0.86],[17,83,13.4,1.25,0.94],[10,50,9.6,0.2,0.82]];
    const drawOne=(c,x,y,R,rot,a)=>{
      const sq=R*1.0638;
      c.globalAlpha=a*0.75; c.drawImage(SH,x-R*1.16+R*0.1,y-R*1.16+R*0.24,R*2.32,R*2.32);
      c.globalAlpha=a;
      c.save(); c.translate(x,y); c.rotate(rot); c.drawImage(BODY,-sq,-sq,sq*2,sq*2); c.restore();
      c.drawImage(GLOSS,x-sq,y-sq,sq*2,sq*2);
      c.globalAlpha=1;
    };
    return (c,t)=>{
      const u=t%P;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      const ret=E.inOut(seg(u,3.5,4.2));
      const open=E.inOut(seg(u,0.52,1.0))*(1-ret);
      const wind=Math.sin(Math.PI*seg(u,0.26,0.52));
      /* the release ring */
      const rw=seg(u,0.56,1.15);
      if(rw>0&&rw<1){ c.strokeStyle='rgba(255,255,255,'+(0.5*(1-rw))+')'; c.lineWidth=0.5+1.6*(1-rw); c.beginPath(); c.arc(50,50,24+rw*30,0,TAU); c.stroke(); }
      COPIES.forEach(([x,y,R,rot,a],i)=>{
        const d=i*0.04, k=backOut(seg(u,0.55+d,1.2+d))*(1-E.inOut(seg(u,3.5+(7-i)*0.02,4.15)));
        if(k<=0.002) return;
        const bob=Math.sin(TAU*2*u/P+i*1.7)*0.7*k, sway=Math.cos(TAU*u/P+i*2.3)*0.6*k;
        /* they start inside the dough, never under the hole, so nothing shows through it */
        const dl=Math.hypot(x-50,y-50), x0=50+(x-50)/dl*17, y0=50+(y-50)/dl*17;
        drawOne(c,lerp(x0,x,k)+sway,lerp(y0,y,k)+bob,R*lerp(0.4,1,clamp(k,0,1.1)),rot*k-(1-clamp(k))*3+Math.sin(TAU*u/P+i)*0.05,lerp(1,a,clamp(k)));
      });
      const R=lerp(33,24,open)*(1-0.05*wind);
      drawOne(c,50,50,R,Math.sin(TAU*u/P)*0.22,1);
      done(c);
    };
  }},

/* ---------------------------------------------------------------- PARTICLES: a firework fountain */
{ id:'particles', name:'Particles', section:'Generative', isNew:true, still:1.7,
  line:'A firework fountain throws hundreds of sparks up; they arc over, cool down and burn out.',
  make(px){
    const P=3, sc=px/100, NX=50, NY=61;
    const [BG,b]=canvasOf(px);
    let g=b.createLinearGradient(0,0,0,100); g.addColorStop(0,'#08051a'); g.addColorStop(0.62,'#1c0e30'); g.addColorStop(0.85,'#3a1a30'); g.addColorStop(1,'#120a14'); b.fillStyle=g; b.fillRect(0,0,100,100);
    g=b.createRadialGradient(50,44,4,50,44,56); g.addColorStop(0,'rgba(255,120,50,0.34)'); g.addColorStop(0.55,'rgba(190,60,70,0.14)'); g.addColorStop(1,'rgba(120,40,90,0)'); b.fillStyle=g; b.fillRect(0,0,100,100);
    g=b.createLinearGradient(0,84,0,100); g.addColorStop(0,'#2a1520'); g.addColorStop(1,'#0c070e'); b.fillStyle=g; b.beginPath(); b.moveTo(0,85.5); b.quadraticCurveTo(50,81.5,100,85.5); b.lineTo(100,100); b.lineTo(0,100); b.closePath(); b.fill();
    const [CN,n]=canvasOf(px);
    const hw=y=>lerp(6.4,14,(y-61)/28);
    const conePath=x=>{ x.beginPath(); x.moveTo(50-hw(61),61); x.lineTo(50-hw(89),89); x.quadraticCurveTo(50,94.5,50+hw(89),89); x.lineTo(50+hw(61),61); x.quadraticCurveTo(50,62.8,50-hw(61),61); x.closePath(); };
    const band=(x,y0,y1,col)=>{ x.fillStyle=col; x.beginPath(); x.moveTo(50-hw(y0),y0); x.quadraticCurveTo(50,y0+3.2,50+hw(y0),y0); x.lineTo(50+hw(y1),y1); x.quadraticCurveTo(50,y1+3.2,50-hw(y1),y1); x.closePath(); x.fill(); };
    g=n.createRadialGradient(50,92,2,50,92,22); g.addColorStop(0,'rgba(0,0,0,0.6)'); g.addColorStop(1,'rgba(0,0,0,0)'); n.fillStyle=g; n.beginPath(); n.ellipse(50,91.5,22,5,0,0,TAU); n.fill();
    n.save(); conePath(n); n.clip();
    n.fillStyle='#d62839'; n.fillRect(30,58,40,40);
    band(n,62.5,69,'#fff0d6'); band(n,76,83,'#fff0d6'); band(n,69.8,71,'#ffc23d'); band(n,74,75.2,'#ffc23d');
    g=n.createLinearGradient(35,0,65,0); g.addColorStop(0,'rgba(40,0,20,0.62)'); g.addColorStop(0.3,'rgba(255,255,255,0.22)'); g.addColorStop(0.55,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(30,0,20,0.72)'); n.fillStyle=g; n.fillRect(30,58,40,40);
    n.restore();
    n.fillStyle='#ffc23d'; n.beginPath(); n.ellipse(50,61,6.9,1.9,0,0,TAU); n.fill();
    n.fillStyle='#2a1208'; n.beginPath(); n.ellipse(50,61,5,1.2,0,0,TAU); n.fill();
    n.fillStyle='#ffe9a8'; n.beginPath(); n.ellipse(50,61,3,0.72,0,0,TAU); n.fill();

    /* the sparks run along designed arcs: each jet has a chosen height and landing point, so the fountain keeps a clean dome */
    const JETS=22, PER=18, CYC=2, jets=[], rj=rng(907);
    for(let j=0;j<JETS;j++){ const side=j%2?1:-1, i=j>>1, f=(i+0.5)/(JETS/2);
      const H=lerp(53,33,Math.pow(f,2.2)), X=side*lerp(1.2,44.5,Math.pow(f,0.85)), D=lerp(6,23,f), root=Math.sqrt(H*H+H*D), a=2*H+2*root;
      /* each spark keeps its own small offset, so a jet is a loose stream and not a ruled line */
      const jit=[]; for(let k=0;k<PER;k++) jit.push({dx:(rj()-0.5)*2.6,dy:(rj()-0.5)*2.2,ph:(rj()-0.5)*0.7/PER});
      jets.push({X,a,b:a+D,off:frac(j*0.381966),jit}); }
    const COLS=['#fff6d0','#ffc54a','#ff7a24','#d9381c'], WID=[1.2,1.0,0.78,0.55];
    const GL=[glowOf(72,'255,240,190'),glowOf(72,'255,190,70'),glowOf(72,'255,120,40'),glowOf(72,'220,60,30')];
    const CORE=glowOf(Math.round(px*0.5),'255,230,170',0.25,0.42), JET=glowOf(Math.round(px*0.4),'255,245,210',0.4,0.6);
    const GLINT=spr(96,x=>{ x.fillStyle='#fff'; x.beginPath(); for(let i=0;i<8;i++){ const a=i/8*TAU, r=i%2?7:50; x.lineTo(Math.cos(a)*r,Math.sin(a)*r);} x.closePath(); x.fill(); });
    const buckets=[[],[],[],[]], heads=[];
    return (c,t)=>{
      const u=t%P;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      const fl=0.86+0.1*Math.sin(TAU*11*u/P)+0.06*Math.sin(TAU*17*u/P+1);
      c.globalCompositeOperation='lighter';
      c.globalAlpha=0.5*fl; c.drawImage(CORE,50-30,86-8,60,16);
      c.globalCompositeOperation='source-over'; c.globalAlpha=1;
      c.setTransform(1,0,0,1,0,0); c.drawImage(CN,0,0); c.setTransform(sc,0,0,sc,0,0);
      for(let i=0;i<4;i++) buckets[i].length=0; heads.length=0;
      for(let j=0;j<JETS;j++){ const J=jets[j];
        for(let k=0;k<PER;k++){
          const jt=J.jit[k], q=frac(u/P*CYC+k/PER+J.off+jt.ph), bi=q<0.2?0:q<0.5?1:q<0.8?2:3, q0=Math.max(0,q-(bi===3?0.02:0.034)), sp=Math.min(1,q*7);
          const x=NX+J.X*q+jt.dx*sp, y=NY-J.a*q+J.b*q*q+jt.dy*sp, x0=NX+J.X*q0+jt.dx*sp, y0=NY-J.a*q0+J.b*q0*q0+jt.dy*sp;
          buckets[bi].push(x0,y0,x,y); heads.push(bi,x,y,q,(k%7===j%7)?1:0);
        }
      }
      c.globalCompositeOperation='lighter'; c.lineCap='round';
      for(let i=0;i<4;i++){ const B=buckets[i]; c.strokeStyle=COLS[i]; c.lineWidth=WID[i]; c.globalAlpha=i===3?0.5:1; c.beginPath(); for(let j=0;j<B.length;j+=4){ c.moveTo(B[j],B[j+1]); c.lineTo(B[j+2],B[j+3]); } c.stroke(); }
      for(let j=0;j<heads.length;j+=5){ const bi=heads[j], x=heads[j+1], y=heads[j+2], f=heads[j+3]; const r=lerp(3.1,1.3,f); c.globalAlpha=(1-f*f)*0.72; c.drawImage(GL[bi],x-r,y-r,r*2,r*2);
        if(heads[j+4]&&f>0.8&&f<0.97){ const q=(f-0.8)/0.17, rr=2.1*Math.sin(Math.PI*q); c.globalAlpha=0.8; c.drawImage(GLINT,x-rr,y-rr,rr*2,rr*2); } }
      c.globalAlpha=fl; c.drawImage(CORE,NX-15,NY-16,30,30);
      c.globalAlpha=0.95; c.drawImage(JET,NX-2.7,NY-22,5.4,24);
      done(c);
    };
  }},

/* ---------------------------------------------------------------- SNOW & RAIN: a cabin through the weather */
{ id:'weather', name:'Snow & Rain', section:'Generative', isNew:true, still:2.2,
  line:'Snow falls and piles up on the cabin roof, then turns to rain and washes it away.',
  make(px){
    const P=5, sc=px/100;
    const [SS,ss]=canvasOf(px), [SR,sr]=canvasOf(px);
    let g=ss.createLinearGradient(0,0,0,86); g.addColorStop(0,'#0f1d4a'); g.addColorStop(0.62,'#2c4c8e'); g.addColorStop(1,'#9dbde3'); ss.fillStyle=g; ss.fillRect(0,0,100,100);
    ss.fillStyle='#5f7fb7'; ss.beginPath(); ss.moveTo(0,68); ss.quadraticCurveTo(14,56,30,66); ss.quadraticCurveTo(50,54,72,65); ss.quadraticCurveTo(86,58,100,66); ss.lineTo(100,100); ss.lineTo(0,100); ss.closePath(); ss.fill();
    g=sr.createLinearGradient(0,0,0,86); g.addColorStop(0,'#181f2b'); g.addColorStop(0.58,'#3b4a5c'); g.addColorStop(1,'#71828f'); sr.fillStyle=g; sr.fillRect(0,0,100,100);
    for(let i=0;i<15;i++){ const x=i*7.4-2, y=7+[0,4,1.5][i%3], rr=13+[0,3,1.5][i%3]; const gg=sr.createRadialGradient(x,y,0,x,y,rr); gg.addColorStop(0,'rgba(14,18,28,0.75)'); gg.addColorStop(1,'rgba(14,18,28,0)'); sr.fillStyle=gg; sr.beginPath(); sr.arc(x,y,rr,0,TAU); sr.fill(); }
    sr.fillStyle='#3a4a58'; sr.beginPath(); sr.moveTo(0,68); sr.quadraticCurveTo(14,56,30,66); sr.quadraticCurveTo(50,54,72,65); sr.quadraticCurveTo(86,58,100,66); sr.lineTo(100,100); sr.lineTo(0,100); sr.closePath(); sr.fill();

    function pine(x,cx,base,h,hw,snow){
      const tiers=5, top=base-h;
      if(!snow){ x.fillStyle='#2e2016'; x.fillRect(cx-1.2,base-h*0.16,2.4,h*0.16); }
      for(let i=tiers-1;i>=0;i--){
        const y0=top+h*0.86*(i/tiers)-(i?h*0.07:0), y1=top+h*0.86*((i+1)/tiers)+h*0.03, w=hw*(0.3+0.7*(i+1)/tiers), H=y1-y0;
        if(!snow){ const gg=x.createLinearGradient(cx-w,0,cx+w,0); gg.addColorStop(0,'#2f7a63'); gg.addColorStop(1,'#123f38'); x.fillStyle=gg;
          x.beginPath(); x.moveTo(cx,y0); x.quadraticCurveTo(cx+w*0.42,y0+H*0.62,cx+w,y1); x.quadraticCurveTo(cx+w*0.5,y1-H*0.16,cx,y1+0.5); x.quadraticCurveTo(cx-w*0.5,y1-H*0.16,cx-w,y1); x.quadraticCurveTo(cx-w*0.42,y0+H*0.62,cx,y0); x.closePath(); x.fill();
        } else { x.fillStyle='#f4f8ff';
          x.beginPath(); x.moveTo(cx,y0-0.3); x.quadraticCurveTo(cx+w*0.42,y0+H*0.6,cx+w*0.95,y1-0.5); x.quadraticCurveTo(cx+w*0.6,y1-H*0.46,cx+w*0.36,y1-H*0.28); x.quadraticCurveTo(cx+w*0.16,y1-H*0.58,cx,y1-H*0.34); x.quadraticCurveTo(cx-w*0.16,y1-H*0.58,cx-w*0.36,y1-H*0.28); x.quadraticCurveTo(cx-w*0.6,y1-H*0.46,cx-w*0.95,y1-0.5); x.quadraticCurveTo(cx-w*0.42,y0+H*0.6,cx,y0-0.3); x.closePath(); x.fill(); }
      }
    }
    const [TR,tr]=canvasOf(px), [TS,ts]=canvasOf(px);
    [[6,86,70,15],[95,86,76,16]].forEach(([cx,bs,h,w])=>{ pine(tr,cx,bs,h,w,false); pine(ts,cx,bs,h,w,true); });

    const [CB,cb]=canvasOf(px);
    /* chimney, behind the roof */
    let gg=cb.createLinearGradient(63,0,74,0); gg.addColorStop(0,'#a4553f'); gg.addColorStop(1,'#6e3528'); cb.fillStyle=gg; cb.fillRect(64,15,9.5,24);
    cb.strokeStyle='rgba(50,20,15,0.55)'; cb.lineWidth=0.4; for(let y=17.6;y<38;y+=2.6){ cb.beginPath(); cb.moveTo(64,y); cb.lineTo(73.5,y); cb.stroke(); const o=(Math.round((y-17.6)/2.6)%2)?2.4:4.8; for(let x=64+o;x<73.5;x+=4.8){ cb.beginPath(); cb.moveTo(x,y); cb.lineTo(x,y+2.6); cb.stroke(); } }
    cb.fillStyle='#4f2a22'; cb.beginPath(); cb.roundRect(62.8,13.2,12,2.6,0.8); cb.fill();
    /* gable */
    gg=cb.createLinearGradient(0,22,0,52); gg.addColorStop(0,'#5d3a22'); gg.addColorStop(1,'#7e5230'); cb.fillStyle=gg; cb.beginPath(); cb.moveTo(21,52); cb.lineTo(50,21); cb.lineTo(79,52); cb.closePath(); cb.fill();
    cb.save(); cb.beginPath(); cb.moveTo(21,52); cb.lineTo(50,21); cb.lineTo(79,52); cb.closePath(); cb.clip(); cb.strokeStyle='rgba(30,15,6,0.42)'; cb.lineWidth=0.5; for(let x=24;x<78;x+=4.6){ cb.beginPath(); cb.moveTo(x,20); cb.lineTo(x,52); cb.stroke(); } cb.restore();
    /* logs */
    for(let i=0;i<6;i++){
      const y=50+i*5.85, h=5.5;
      gg=cb.createLinearGradient(0,y,0,y+h); gg.addColorStop(0,'#c0875a'); gg.addColorStop(0.45,'#9a6538'); gg.addColorStop(1,'#5c371c'); cb.fillStyle=gg; cb.beginPath(); cb.roundRect(20,y,60,h,2.7); cb.fill();
      [21.6,78.4].forEach(ex=>{ cb.fillStyle='#d9b083'; cb.beginPath(); cb.ellipse(ex,y+h/2,2.05,2.6,0,0,TAU); cb.fill(); cb.strokeStyle='rgba(120,75,40,0.75)'; cb.lineWidth=0.35; cb.beginPath(); cb.ellipse(ex,y+h/2,1.15,1.5,0,0,TAU); cb.stroke(); });
    }
    /* windows and door */
    const win=(x,y,w,h)=>{ cb.fillStyle='#3a2212'; cb.beginPath(); cb.roundRect(x-1.2,y-1.2,w+2.4,h+2.4,0.8); cb.fill(); gg=cb.createLinearGradient(0,y,0,y+h); gg.addColorStop(0,'#fff0b6'); gg.addColorStop(1,'#ffb040'); cb.fillStyle=gg; cb.fillRect(x,y,w,h); cb.fillStyle='#3a2212'; cb.fillRect(x+w/2-0.45,y,0.9,h); cb.fillRect(x,y+h/2-0.45,w,0.9); cb.fillStyle='#7c5230'; cb.beginPath(); cb.roundRect(x-2,y+h+1,w+4,1.7,0.6); cb.fill(); };
    win(27,59,11,10.5); win(62,59,11,10.5);
    cb.fillStyle='#3a2212'; cb.beginPath(); cb.roundRect(42.3,59.5,15.4,26,[6,6,0,0]); cb.fill();
    gg=cb.createLinearGradient(44,0,56,0); gg.addColorStop(0,'#8c3f2e'); gg.addColorStop(1,'#6a2b20'); cb.fillStyle=gg; cb.beginPath(); cb.roundRect(44,61.2,12,24.3,[5,5,0,0]); cb.fill();
    cb.strokeStyle='rgba(30,10,5,0.5)'; cb.lineWidth=0.45; [48,52].forEach(x=>{ cb.beginPath(); cb.moveTo(x,61.5); cb.lineTo(x,85.5); cb.stroke(); });
    cb.fillStyle='#ffd66b'; cb.beginPath(); cb.arc(53.8,74,0.95,0,TAU); cb.fill();
    /* round gable window */
    cb.fillStyle='#3a2212'; cb.beginPath(); cb.arc(50,38.5,6.2,0,TAU); cb.fill(); gg=cb.createRadialGradient(50,37,0,50,38.5,5); gg.addColorStop(0,'#fff0b6'); gg.addColorStop(1,'#ffb040'); cb.fillStyle=gg; cb.beginPath(); cb.arc(50,38.5,4.9,0,TAU); cb.fill(); cb.fillStyle='#3a2212'; cb.fillRect(49.55,33.6,0.9,9.8); cb.fillRect(45.1,38.05,9.8,0.9);
    /* the roof, two thick slabs */
    const slab=(x0,x1,x2,y2)=>{ gg=cb.createLinearGradient(0,13,0,58); gg.addColorStop(0,'#a33b31'); gg.addColorStop(1,'#5f201f'); cb.fillStyle=gg; cb.beginPath(); cb.moveTo(50,13); cb.lineTo(x0,55); cb.lineTo(x1,60); cb.lineTo(50,24.5); cb.closePath(); cb.fill(); };
    slab(10,14.6); slab(90,85.4);
    cb.strokeStyle='#d98a66'; cb.lineWidth=0.7; cb.lineJoin='round'; cb.beginPath(); cb.moveTo(14.6,60); cb.lineTo(50,24.5); cb.lineTo(85.4,60); cb.stroke();
    cb.strokeStyle='rgba(30,8,8,0.35)'; cb.lineWidth=0.4; for(let k=1;k<3;k++){ const f=k/3; cb.beginPath(); cb.moveTo(lerp(10,14.6,f),lerp(55,60,f)); cb.lineTo(50,lerp(13,24.5,f)); cb.lineTo(lerp(90,85.4,f),lerp(55,60,f)); cb.stroke(); }

    /* small snow pieces that sit on the cabin */
    const [CS,cs]=canvasOf(px);
    cs.fillStyle='#f6faff'; const lump=(x,y,w,h)=>{ cs.beginPath(); cs.ellipse(x,y,w,h,0,Math.PI,TAU); cs.closePath(); cs.fill(); };
    lump(68.8,13.4,6.6,2.8); lump(26.8+5.5,70.6,7.8,1.3); lump(62+5.5,70.6,7.8,1.3);

    /* wet ground, with the cabin's reflection in it */
    const [GW,gw]=canvasOf(px);
    gg=gw.createLinearGradient(0,82,0,100); gg.addColorStop(0,'#3a4552'); gg.addColorStop(1,'#141b23'); gw.fillStyle=gg; gw.beginPath(); gw.moveTo(0,82); gw.bezierCurveTo(20,80,35,84,50,83.5); gw.bezierCurveTo(68,83,82,80.5,100,82); gw.lineTo(100,100); gw.lineTo(0,100); gw.closePath(); gw.fill();
    /* the lit windows smear down the wet ground, with three puddles on a line */
    [[32.5,6.5],[67.5,6.5],[50,5.2]].forEach(([x,r])=>{ gw.save(); gw.translate(x,92); gw.scale(1,1.5); const q=gw.createRadialGradient(0,0,0,0,0,r); q.addColorStop(0,'rgba(255,178,92,0.5)'); q.addColorStop(1,'rgba(255,178,92,0)'); gw.fillStyle=q; gw.beginPath(); gw.arc(0,0,r,0,TAU); gw.fill(); gw.restore(); });
    [[17,93,10,1.7],[50,96.5,14,1.6],[83,93,10,1.7]].forEach(([x,y,w,h])=>{ const q=gw.createLinearGradient(0,y-h,0,y+h); q.addColorStop(0,'rgba(120,150,180,0.5)'); q.addColorStop(1,'rgba(70,95,125,0.5)'); gw.fillStyle=q; gw.beginPath(); gw.ellipse(x,y,w,h,0,0,TAU); gw.fill(); gw.strokeStyle='rgba(200,220,240,0.32)'; gw.lineWidth=0.35; gw.beginPath(); gw.ellipse(x,y,w,h,0,Math.PI,TAU); gw.stroke(); });
    /* snow ground */
    const [GS,gs]=canvasOf(px);
    gg=gs.createLinearGradient(0,80,0,100); gg.addColorStop(0,'#eef5ff'); gg.addColorStop(1,'#a9c2e8'); gs.fillStyle=gg; gs.beginPath(); gs.moveTo(0,81); gs.bezierCurveTo(20,78,35,84,50,83); gs.bezierCurveTo(68,82,82,79,100,81); gs.lineTo(100,100); gs.lineTo(0,100); gs.closePath(); gs.fill();
    gs.save(); gs.beginPath(); gs.rect(0,78,100,22); gs.clip(); gs.translate(50,84.6); gs.scale(1,0.13); gg=gs.createRadialGradient(0,0,18,0,0,44); gg.addColorStop(0,'rgba(60,90,170,0.55)'); gg.addColorStop(1,'rgba(60,90,170,0)'); gs.fillStyle=gg; gs.beginPath(); gs.arc(0,0,44,0,TAU); gs.fill(); gs.restore();
    [[32.5,91,13],[67.5,91,13],[50,94,10]].forEach(([x,y,r])=>{ const q=gs.createRadialGradient(x,y,0,x,y,r); q.addColorStop(0,'rgba(255,176,92,0.75)'); q.addColorStop(1,'rgba(255,176,92,0)'); gs.fillStyle=q; gs.save(); gs.translate(x,y); gs.scale(1,0.42); gs.translate(-x,-y); gs.beginPath(); gs.arc(x,y,r,0,TAU); gs.fill(); gs.restore(); });

    const WARM=glowOf(Math.round(px*0.4),'255,190,100',0.4,0.32), FL=glowOf(48,'255,255,255',0.55,0.75), SMOKE=glowOf(128,'200,210,225',0.5,0.5);
    const CRYSTAL=spr(128,x=>{ x.strokeStyle='#fff'; x.lineCap='round'; x.lineWidth=6; for(let i=0;i<6;i++){ const a=i/6*TAU, cs2=Math.cos(a), sn=Math.sin(a); x.beginPath(); x.moveTo(0,0); x.lineTo(cs2*42,sn*42); x.stroke(); for(const v of [0.55]){ const b1=a+0.7, b2=a-0.7, m=[cs2*42*v,sn*42*v]; x.beginPath(); x.moveTo(m[0],m[1]); x.lineTo(m[0]+Math.cos(b1)*15,m[1]+Math.sin(b1)*15); x.moveTo(m[0],m[1]); x.lineTo(m[0]+Math.cos(b2)*15,m[1]+Math.sin(b2)*15); x.stroke(); } } });
    /* flakes on staggered columns, so the fall reads as even snow rather than clumps */
    const r0=rng(61), layer=(n,cyc,rad,alpha,swayA)=>{ const out=[]; for(let i=0;i<n;i++) out.push({x:(i+0.5+(r0()-0.5)*0.7)/n*112-6,y:frac(i*0.61803)*116,cyc,rad:rad*(0.85+r0()*0.3),alpha,amp:swayA*(0.6+r0()*0.6),ph:r0()*TAU,k:1+Math.floor(r0()*2)}); return out; };
    const FAR=layer(46,1,0.62,0.6,1.2), MID=layer(30,1,1.05,0.85,2), NEAR=layer(7,2,2.7,0.86,3);
    const drops=[]; for(let i=0;i<120;i++){ const near=i%3===0; drops.push({x:(i+0.5)/120*128-14+Math.sin(i*5.1)*0.5,y:frac(i*0.75487)*118,cyc:near?7:5,len:near?10:6.5}); }
    const spl=[]; for(let i=0;i<16;i++) spl.push({x:(i+0.5)/16*100,y:88+((i*3)%4)*3,ph:frac(i*0.618)});
    const capPts=new Float32Array(2*(2*27));
    function cap(c,h){
      const N=26; let k=0;
      for(let i=0;i<=N;i++){ const v=i/N, bx=lerp(10,50,v), by=lerp(55,13,v), env=Math.pow(Math.sin(Math.min(1,v*1.14)*Math.PI/2),0.6), l=0.84+0.16*Math.sin(v*19+0.6), bl=clamp((v-0.84)/0.16), off=h*6.8*env*l; capPts[k++]=bx-0.724*off*(1-bl*bl); capPts[k++]=by-0.69*off-(bl*bl)*0.3*off; }
      for(let i=N;i>=0;i--){ const v=i/N, bx=lerp(90,50,v), by=lerp(55,13,v), env=Math.pow(Math.sin(Math.min(1,v*1.14)*Math.PI/2),0.6), l=0.84+0.16*Math.sin(v*23+2.1), bl=clamp((v-0.84)/0.16), off=h*6.8*env*l; capPts[k++]=bx+0.724*off*(1-bl*bl); capPts[k++]=by-0.69*off-(bl*bl)*0.3*off; }
      const q=c.createLinearGradient(0,6,0,58); q.addColorStop(0,'#ffffff'); q.addColorStop(1,'#d5e4f8'); c.fillStyle=q;
      c.beginPath(); c.moveTo(capPts[0],capPts[1]); for(let i=2;i<k;i+=2) c.lineTo(capPts[i],capPts[i+1]); c.lineTo(90,55.2); c.lineTo(50,13.2); c.lineTo(10,55.2); c.closePath(); c.fill();
      c.strokeStyle='rgba(120,150,205,0.55)'; c.lineWidth=0.7; c.lineJoin='round'; c.beginPath(); c.moveTo(10,55.3); c.lineTo(50,13.3); c.lineTo(90,55.3); c.stroke();
    }
    return (c,t)=>{
      const u=t%P;
      const h=E.inOut(seg(u,0.1,2.15))*(1-E.inOut(seg(u,2.7,3.8)));
      const gs_=E.inOut(seg(u,0.15,1.7))*(1-E.inOut(seg(u,2.9,3.9)));
      const r=E.inOut(seg(u,2.4,3))*(1-E.inOut(seg(u,4.45,5)));
      const s=1-r;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(SS,0,0);
      if(r>0.003){ c.globalAlpha=r; c.drawImage(SR,0,0); c.globalAlpha=1; }
      c.drawImage(TR,0,0);
      if(gs_>0.003){ c.globalAlpha=gs_; c.drawImage(TS,0,0); c.globalAlpha=1; }
      c.drawImage(GW,0,0);
      if(gs_>0.003){ c.globalAlpha=gs_; c.drawImage(GS,0,0); c.globalAlpha=1; }
      c.setTransform(sc,0,0,sc,0,0);
      for(let i=0;i<4;i++){ const f=frac(u/P*2+i/4), rr=1.2+f*4.6; c.globalAlpha=(1-f)*0.38*s*Math.min(1,f*5); c.drawImage(SMOKE,69+f*6+Math.sin(f*6+i)*0.7-rr,12.5-f*20-rr,rr*2,rr*2); }
      c.globalAlpha=1;
      c.setTransform(1,0,0,1,0,0); c.drawImage(CB,0,0);
      if(gs_>0.003){ c.globalAlpha=gs_; c.drawImage(CS,0,0); c.globalAlpha=1; }
      c.setTransform(sc,0,0,sc,0,0);
      if(h>0.01) cap(c,h);
      if(r>0.003){ c.fillStyle='rgba(14,22,38,'+(0.3*r)+')'; c.fillRect(0,0,100,100); }
      const fl=0.88+0.08*Math.sin(TAU*5*u/P)+0.04*Math.sin(TAU*9*u/P+1.2);
      c.globalCompositeOperation='lighter'; c.globalAlpha=0.62*fl;
      [[32.5,64.2,15],[67.5,64.2,15],[50,38.5,11]].forEach(([x,y,R])=>c.drawImage(WARM,x-R,y-R,R*2,R*2));
      c.globalCompositeOperation='source-over'; c.globalAlpha=1;
      if(s>0.01){
        const flake=(f,img)=>{ const Y=frac((f.y+f.cyc*116*u/P)/116)*116-8, X=f.x+f.amp*Math.sin(TAU*f.k*u/P+f.ph); c.globalAlpha=f.alpha*s; c.drawImage(img,X-f.rad,Y-f.rad,f.rad*2,f.rad*2); };
        for(const f of FAR) flake(f,FL); for(const f of MID) flake(f,FL); for(const f of NEAR) flake(f,CRYSTAL);
        c.globalAlpha=1;
      }
      if(r>0.01){
        c.lineCap='round'; c.strokeStyle='rgb(205,225,255)'; const slant=0.2;
        for(let pass=0;pass<2;pass++){ c.globalAlpha=(pass?0.85:0.5)*r; c.lineWidth=pass?0.72:0.44; c.beginPath();
          for(let i=0;i<drops.length;i++){ const d=drops[i]; if((i%3===0)!==!!pass) continue; const Y=frac((d.y+d.cyc*118*u/P)/118)*118-9; const X=d.x+slant*Y*-1+Y*0; c.moveTo(X,Y); c.lineTo(X+slant*d.len,Y-d.len); }
          c.stroke(); }
        c.strokeStyle='rgb(220,235,255)'; c.lineWidth=0.5;
        for(const p of spl){ const f=frac(u/P*5+p.ph), R=0.6+f*3.4; c.globalAlpha=(1-f)*0.85*r; c.beginPath(); c.ellipse(p.x,p.y,R,R*0.34,0,0,TAU); c.stroke(); }
        c.globalAlpha=1;
      }
      done(c);
    };
  }},

/* ---------------------------------------------------------------- STARFIELD: a jump to hyperspace */
{ id:'starfield', name:'Starfield', section:'Generative', isNew:true, still:2.2,
  line:'Stars drift past the ship, then stretch into long lines as it jumps to hyperspace.',
  make(px){
    const P=4.4, sc=px/100, VX=50, VY=38, N=230, TBL=480, CYC=7;
    const up=u=>E.inOut(seg(u,0.7,1.35)), down=u=>1-E.inOut(seg(u,3.05,3.75)), warpOf=u=>up(u)*down(u);
    const T=new Float32Array(TBL+1); let sum=0; for(let i=0;i<TBL;i++){ const u=(i+0.5)/TBL*P; sum+=0.16+warpOf(u); T[i+1]=sum; } for(let i=0;i<=TBL;i++) T[i]=T[i]/sum*CYC;
    const Tof=u=>{ const f=((u%P)+P)%P/P*TBL, i=Math.floor(f); return lerp(T[i],T[Math.min(TBL,i+1)],f-i); };
    const [BG,b]=canvasOf(px);
    let g=b.createRadialGradient(VX,VY,1,VX,VY,88); g.addColorStop(0,'#27399a'); g.addColorStop(0.3,'#151f61'); g.addColorStop(0.68,'#0a0c31'); g.addColorStop(1,'#04050f'); b.fillStyle=g; b.fillRect(0,0,100,100);
    [[24,22,30,'150,70,220',0.26],[80,30,30,'50,120,255',0.24],[66,88,34,'190,60,200',0.14]].forEach(([x,y,r,col,a])=>{ const q=b.createRadialGradient(x,y,0,x,y,r); q.addColorStop(0,'rgba('+col+','+a+')'); q.addColorStop(1,'rgba('+col+',0)'); b.fillStyle=q; b.fillRect(0,0,100,100); });
    const COLS=['#ffffff','#c7e2ff','#83ccff','#c6acff'];
    const groups=COLS.map(()=>[]);
    /* even round the circle, but each star's depth is its own: tying depth to angle draws a spiral */
    const rs=rng(2026);
    for(let i=0;i<N;i++){ const a=(i+rs()*0.8)/N*TAU; groups[i%4].push({ca:Math.cos(a),sa:Math.sin(a),rad:lerp(4.2,22,rs()),ph:rs(),w:lerp(0.55,1.25,rs())}); }
    const DOT=glowOf(64,'225,238,255',0.34,0.5), CORE=glowOf(Math.round(px*0.6),'150,190,255',0.2,0.42), FL=glowOf(Math.round(px*0.4),'120,220,255',0.3,0.42);
    const SHIP=spr(Math.round(px*0.62),x=>{
      x.lineJoin='round';
      /* wings first */
      [1,-1].forEach(s=>{ x.save(); x.scale(s,1);
        let g=x.createLinearGradient(0,0,44,10); g.addColorStop(0,'#c9d2e6'); g.addColorStop(1,'#5a6784'); x.fillStyle=g;
        x.beginPath(); x.moveTo(9,-8); x.lineTo(42,10); x.quadraticCurveTo(46,13,44,18); x.lineTo(30,18); x.lineTo(10,20); x.closePath(); x.fill();
        x.fillStyle='#ff7a3c'; x.beginPath(); x.moveTo(30,4); x.lineTo(42,10.4); x.quadraticCurveTo(44.5,12.2,44.4,14.6); x.lineTo(33,10); x.closePath(); x.fill();
        x.strokeStyle='rgba(20,28,50,0.45)'; x.lineWidth=0.7; x.beginPath(); x.moveTo(14,-3); x.lineTo(16,19); x.moveTo(24,3); x.lineTo(25,18.6); x.stroke();
        /* nacelle */
        g=x.createLinearGradient(10,0,26,0); g.addColorStop(0,'#eef2fb'); g.addColorStop(1,'#6a7795'); x.fillStyle=g; x.beginPath(); x.roundRect(11,6,13,21,5); x.fill();
        x.restore(); });
      /* hull */
      let g=x.createLinearGradient(-13,0,13,0); g.addColorStop(0,'#aab5cc'); g.addColorStop(0.4,'#fbfcff'); g.addColorStop(1,'#7a87a4'); x.fillStyle=g;
      x.beginPath(); x.moveTo(0,-44); x.bezierCurveTo(6,-36,12,-18,13.5,2); x.lineTo(14.5,24); x.quadraticCurveTo(0,32,-14.5,24); x.lineTo(-13.5,2); x.bezierCurveTo(-12,-18,-6,-36,0,-44); x.closePath(); x.fill();
      x.fillStyle='#ff7a3c'; x.beginPath(); x.moveTo(-3.1,-37); x.quadraticCurveTo(0,-41,3.1,-37); x.lineTo(5.5,-28); x.quadraticCurveTo(0,-30.6,-5.5,-28); x.closePath(); x.fill();
      g=x.createLinearGradient(-6,-24,7,-4); g.addColorStop(0,'#7fe6ff'); g.addColorStop(0.5,'#176a9a'); g.addColorStop(1,'#07233d'); x.fillStyle=g; x.beginPath(); x.moveTo(0,-24.5); x.bezierCurveTo(6.5,-23,8,-12,6.5,-3.5); x.quadraticCurveTo(0,-1,-6.5,-3.5); x.bezierCurveTo(-8,-12,-6.5,-23,0,-24.5); x.closePath(); x.fill();
      x.strokeStyle='rgba(255,255,255,0.6)'; x.lineWidth=1.2; x.lineCap='round'; x.beginPath(); x.moveTo(-3.6,-19); x.quadraticCurveTo(-5,-13,-4.6,-7); x.stroke();
      x.strokeStyle='rgba(30,40,70,0.4)'; x.lineWidth=0.7; x.beginPath(); x.moveTo(0,2); x.lineTo(0,24); x.stroke();
      /* nozzles */
      [-17.5,17.5].forEach(nx=>{ x.fillStyle='#1b2236'; x.beginPath(); x.ellipse(nx,26,6.6,3.2,0,0,TAU); x.fill(); });
    });
    const dz0=[];
    return (c,t)=>{
      const u=t%P, w=warpOf(u), Tn=Tof(u);
      let dz=Tof(u)-Tof(u-0.065); if(dz<0) dz+=CYC;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      c.globalCompositeOperation='lighter';
      c.globalAlpha=0.45+0.35*w; const cr=18+18*w; c.drawImage(CORE,VX-cr,VY-cr,cr*2,cr*2);
      const glowPass=w>0.02;
      for(let pass=glowPass?0:1;pass<2;pass++){
        for(let gi=0;gi<4;gi++){
          c.fillStyle=COLS[gi]; c.globalAlpha=pass?1:0.16*w; c.beginPath();
          for(const s of groups[gi]){
            const z=frac(s.ph-Tn)*0.985+0.015, r1=s.rad/z; if(s.rad/(z+dz)>112) continue;
            if(!pass&&z>0.7) continue;
            /* streaks start a little way out from the vanishing point, so the middle stays a clean glow */
            if(w>0.3&&r1<11) continue;
            const r2=Math.max(Math.min(r1-0.5,s.rad/(z+dz)),w>0.3?8:0), hw=s.w*clamp((1-z)*1.7)*(0.3+0.85*(1-z))*(pass?0.4:1.3);
            const hx=VX+s.ca*r1, hy=VY+s.sa*r1, px_=-s.sa*hw, py_=s.ca*hw;
            c.moveTo(hx+px_,hy+py_); c.lineTo(hx-px_,hy-py_); c.lineTo(VX+s.ca*r2,VY+s.sa*r2); c.closePath();
          }
          c.fill();
        }
      }
      if(w<0.7){ c.globalAlpha=(1-w/0.7); for(let gi=0;gi<4;gi++) for(const s of groups[gi]){ const z=frac(s.ph-Tn)*0.985+0.015, r1=s.rad/z; if(r1>80) continue; const q=s.w*clamp((1-z)*1.9)*(0.75+1.7*(1-z)); if(q<0.2) continue; c.drawImage(DOT,VX+s.ca*r1-q,VY+s.sa*r1-q,q*2,q*2); } }
      const fu=Math.max(0,1-Math.abs(u-1.05)/0.3), fd=Math.max(0,1-Math.abs(u-3.4)/0.3);
      if(fu+fd>0.01){ c.globalAlpha=0.35*Math.max(fu,fd); c.drawImage(CORE,VX-70,VY-70,140,140); }
      c.globalCompositeOperation='source-over'; c.globalAlpha=1;
      const roll=Math.sin(TAU*u/P)*0.05, shy=w*Math.sin(TAU*9*u/P)*0.35, shx=w*Math.sin(TAU*13*u/P+1)*0.35;
      const y=lerp(71,64,E.inOut(w)), S=lerp(1,0.8,E.inOut(w)), R=31*S;
      c.save(); c.translate(50+shx,y+shy); c.rotate(roll);
      const nozY=26/50*R, nozX=17.5/50*R, gr=lerp(4.5,13,w)*S, fl=0.9+0.1*Math.sin(TAU*13*u/P);
      c.drawImage(SHIP,-R,-R,R*2,R*2);
      c.globalCompositeOperation='lighter'; c.globalAlpha=fl*(0.7+0.3*w);
      [-nozX,nozX].forEach(nx=>{ c.drawImage(FL,nx-gr,nozY-gr,gr*2,gr*2); c.drawImage(FL,nx-gr*0.45,nozY-gr*0.45,gr*0.9,gr*0.9); });
      c.restore();
      done(c);
    };
  }},

/* ---------------------------------------------------------------- LENS FLARE: the ghosts sit on the line through the sun and the lens centre */
{ id:'lensflare', name:'Lens Flare', section:'Generative', isNew:true, still:1.05,
  line:'As the sun crosses the sky its hexagon ghosts swing the other way through the middle of the lens.',
  make(px){
    const P=5.2, sc=px/100;
    const [BG,b]=canvasOf(px);
    let g=b.createLinearGradient(0,0,0,78); g.addColorStop(0,'#040a2c'); g.addColorStop(0.42,'#10357f'); g.addColorStop(0.76,'#5c62b6'); g.addColorStop(1,'#ff9f66'); b.fillStyle=g; b.fillRect(0,0,100,100);
    /* cloud streaks on two straight rows */
    [[52,'rgba(255,190,190,0.2)',8],[63,'rgba(255,186,140,0.42)',6]].forEach(([y,col,n],k)=>{ for(let i=0;i<n;i++){ const cx=(i+0.5)/n*110-5+(k?6:0), w=(n===8?10:14)+(i%2)*5; const q=b.createRadialGradient(0,0,0,0,0,1); q.addColorStop(0,col); q.addColorStop(1,'rgba(255,200,180,0)'); b.save(); b.translate(cx,y+(i%3)*1.4); b.scale(w,1.5+(i%2)); b.fillStyle=q; b.beginPath(); b.arc(0,0,1,0,TAU); b.fill(); b.restore(); } });
    const ridge=(pts,c0,c1,base)=>{ const q=b.createLinearGradient(0,base,0,100); q.addColorStop(0,c0); q.addColorStop(1,c1); b.fillStyle=q; b.beginPath(); b.moveTo(0,100); pts.forEach(([x,y])=>b.lineTo(x,y)); b.lineTo(100,100); b.closePath(); b.fill(); };
    ridge([[0,66],[12,56],[20,61],[33,48],[46,62],[56,54],[70,64],[84,52],[100,62]],'#3a3d8a','#7a4f80',48);
    ridge([[0,77],[10,69],[22,75],[36,63],[50,76],[63,67],[76,77],[90,66],[100,73]],'#1a2160','#35275f',63);
    ridge([[0,88],[14,82],[28,88],[44,80],[60,90],[74,83],[88,89],[100,84]],'#090b2c','#04051a',80);
    /* snow caps on the far range, cut to the ridge line itself */
    b.fillStyle='rgba(235,225,255,0.5)'; [[33,48,6.5],[84,52,5.8],[12,56,4.4],[56,54,4.4]].forEach(([x,y,s])=>{ b.beginPath(); b.moveTo(x,y); b.lineTo(x+s,y+s*0.95); b.lineTo(x+s*0.45,y+s*0.72); b.lineTo(x,y+s*1.05); b.lineTo(x-s*0.45,y+s*0.72); b.lineTo(x-s,y+s*0.95); b.closePath(); b.fill(); });

    const S=Math.round(px*0.55);
    const hexPath=(x,R)=>{ x.beginPath(); for(let i=0;i<6;i++){ const a=i/6*TAU+0.26; x.lineTo(Math.cos(a)*R,Math.sin(a)*R); } x.closePath(); };
    const HEX=rgb=>spr(S,x=>{
      const gg=x.createRadialGradient(0,0,4,0,0,46); gg.addColorStop(0,'rgba('+rgb+',0.16)'); gg.addColorStop(0.75,'rgba('+rgb+',0.34)'); gg.addColorStop(1,'rgba('+rgb+',0.72)'); x.fillStyle=gg; hexPath(x,46); x.fill();
      x.strokeStyle='rgba('+rgb+',1)'; x.lineWidth=1.6; x.lineJoin='round'; hexPath(x,46); x.stroke();
      x.strokeStyle='rgba(255,255,255,0.3)'; x.lineWidth=0.6; hexPath(x,43.8); x.stroke();
    });
    const DISC=rgb=>spr(S,x=>{ const gg=x.createRadialGradient(0,0,0,0,0,48); gg.addColorStop(0,'rgba('+rgb+',0.5)'); gg.addColorStop(0.85,'rgba('+rgb+',0.56)'); gg.addColorStop(0.95,'rgba('+rgb+',0.8)'); gg.addColorStop(1,'rgba('+rgb+',0)'); x.fillStyle=gg; x.beginPath(); x.arc(0,0,48,0,TAU); x.fill(); });
    const G=[{q:-0.62,R:3.6,img:DISC('255,140,50')},{q:-0.3,R:6.5,img:HEX('40,235,150')},{q:0.2,R:10.5,img:HEX('255,50,160')},{q:0.52,R:3.4,img:DISC('70,160,255')},{q:0.86,R:15.5,img:HEX('255,160,30')},{q:1.36,R:7,img:HEX('70,110,255')}];
    const GLARE=glowOf(Math.round(px*0.5),'255,132,72',0.25,0.32);
    const SUN=spr(S,x=>{ const gg=x.createRadialGradient(0,0,0,0,0,50); gg.addColorStop(0,'rgba(255,255,255,1)'); gg.addColorStop(0.13,'rgba(255,253,240,1)'); gg.addColorStop(0.2,'rgba(255,232,180,0.72)'); gg.addColorStop(0.5,'rgba(255,176,104,0.16)'); gg.addColorStop(1,'rgba(255,140,80,0)'); x.fillStyle=gg; x.fillRect(-50,-50,100,100); });
    const RAYS=spr(px,x=>{ x.globalCompositeOperation='lighter'; for(let i=0;i<12;i++){ const a=i/12*TAU, L=i%2?26:48, W=i%2?0.75:1.15; x.save(); x.rotate(a); const gg=x.createLinearGradient(0,0,L,0); gg.addColorStop(0,'rgba(255,245,215,0.95)'); gg.addColorStop(1,'rgba(255,225,170,0)'); x.fillStyle=gg; x.beginPath(); x.moveTo(0,-W); x.lineTo(L,0); x.lineTo(0,W); x.closePath(); x.fill(); x.restore(); } });
    const RING=spr(S,x=>{ const gg=x.createRadialGradient(0,0,38,0,0,50); gg.addColorStop(0,'rgba(255,90,90,0)'); gg.addColorStop(0.42,'rgba(255,90,90,0.42)'); gg.addColorStop(0.62,'rgba(255,225,110,0.5)'); gg.addColorStop(0.8,'rgba(80,255,180,0.4)'); gg.addColorStop(1,'rgba(90,140,255,0)'); x.fillStyle=gg; x.beginPath(); x.arc(0,0,50,0,TAU); x.fill(); });
    const STREAK=spr(256,x=>{ const gg=x.createRadialGradient(0,0,0,0,0,50); gg.addColorStop(0,'rgba(215,235,255,1)'); gg.addColorStop(0.3,'rgba(160,205,255,0.5)'); gg.addColorStop(1,'rgba(120,170,255,0)'); x.fillStyle=gg; x.fillRect(-50,-50,100,100); });
    return (c,t)=>{
      const u=t%P, a=TAU*u/P;
      const sx=50+37*Math.cos(a), sy=26-9*(0.5-0.5*Math.cos(a*2))+1.5, ax=50-sx, ay=50-sy;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      c.globalCompositeOperation='lighter';
      c.globalAlpha=0.55; c.drawImage(GLARE,sx-66,sy-66,132,132);
      for(const g of G){ c.globalAlpha=1; const x=50+ax*g.q, y=50+ay*g.q; c.drawImage(g.img,x-g.R,y-g.R,g.R*2,g.R*2); }
      c.globalAlpha=0.95; c.drawImage(STREAK,sx-70,sy-1.7,140,3.4);
      c.globalAlpha=0.9; blit(c,RING,sx,sy,24);
      c.save(); c.translate(sx,sy); c.rotate(Math.cos(a)*0.32); c.globalAlpha=1; c.drawImage(RAYS,-42,-42,84,84); c.restore();
      c.globalAlpha=1; blit(c,SUN,sx,sy,32);
      done(c);
    };
  }},

/* ---------------------------------------------------------------- MUSIC VISUALISER: bars around a woofer that thumps on the beat */
{ id:'audiospectrum', name:'Music Visualiser', section:'Generative', isNew:true, still:0.08,
  line:'A woofer thumps on every beat while the bars around it leap with the bass, snare and hats.',
  make(px){
    const P=2.4, sc=px/100, BEAT=0.6, H=24, F=144, dt=1/60;
    const levelAt=(b,tt)=>{
      const bn=Math.floor(tt/BEAT), ph=tt-bn*BEAT, ph8=(tt%(BEAT/2));
      const kick=Math.exp(-ph/0.14)*(bn%2?0.84:1), sn=(bn%2)?Math.exp(-ph/0.13):0, hat=Math.exp(-ph8/0.05);
      const melC=[0.4,0.62,0.34,0.72][bn%4], mel=0.62*Math.exp(-Math.pow((b-melC)/0.1,2))*Math.exp(-ph/0.3);
      const wig=0.035*(1+Math.sin(TAU*(3+Math.floor(b*H)%3)*tt/P+b*40));
      return clamp(1.02*kick*Math.exp(-Math.pow(b/0.2,2))+0.8*sn*Math.exp(-Math.pow((b-0.46)/0.24,2))+0.6*hat*Math.exp(-Math.pow((b-0.92)/0.2,2))+mel+wig+0.05);
    };
    const V=new Float32Array((F+1)*H), PK=new Float32Array((F+1)*H);
    for(let b=0;b<H;b++){ let v=0, pk=0; for(let pass=0;pass<3;pass++) for(let f=0;f<F;f++){ const tgt=levelAt((b+0.5)/H,f*dt); v+=(tgt-v)*(1-Math.exp(-dt/(tgt>v?0.018:0.1))); pk=Math.max(v,pk-dt*0.62); if(pass===2){ V[f*H+b]=v; PK[f*H+b]=pk; } } V[F*H+b]=V[b]; PK[F*H+b]=PK[b]; }
    const barC=[]; for(let i=0;i<H;i++){ const p=i/(H-1), hue=lerp(168,332,p), lit=lerp(60,66,p); barC.push('hsl('+hue+',88%,'+lit+'%)'); }
    const tips=barC;
    const dirs=[]; for(let i=0;i<H;i++){ const a=(i+0.5)/H*Math.PI; dirs.push([Math.PI/2+a,Math.PI/2-a].map(q=>[Math.cos(q),Math.sin(q)])); }
    const [BG,b]=canvasOf(px);
    let g=b.createRadialGradient(50,50,8,50,50,76); g.addColorStop(0,'#2a1a56'); g.addColorStop(0.55,'#150d33'); g.addColorStop(1,'#07050f'); b.fillStyle=g; b.fillRect(0,0,100,100);
    const S=Math.round(px*0.75);
    const FRAME=spr(S,x=>{
      let g=x.createRadialGradient(0,0,0,0,0,50); g.addColorStop(0,'rgba(0,0,0,0.55)'); g.addColorStop(0.84,'rgba(0,0,0,0.5)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(-50,-50,100,100);
      g=x.createLinearGradient(-36,-36,36,36); g.addColorStop(0,'#868da3'); g.addColorStop(0.45,'#2c3144'); g.addColorStop(1,'#62687f'); x.fillStyle=g; x.beginPath(); x.arc(0,0,44.5,0,TAU); x.fill();
      x.strokeStyle='rgba(255,255,255,0.28)'; x.lineWidth=0.7; x.beginPath(); x.arc(0,0,44.2,0,TAU); x.stroke();
      x.fillStyle='#0b0d14'; x.beginPath(); x.arc(0,0,38.8,0,TAU); x.fill();
      for(let i=0;i<8;i++){ const a=i/8*TAU+Math.PI/8, sx=Math.cos(a)*41.6, sy=Math.sin(a)*41.6; const q=x.createRadialGradient(sx-0.4,sy-0.4,0,sx,sy,1.9); q.addColorStop(0,'#eef1f8'); q.addColorStop(1,'#5a5f73'); x.fillStyle=q; x.beginPath(); x.arc(sx,sy,1.8,0,TAU); x.fill(); x.strokeStyle='#1a1d28'; x.lineWidth=0.45; x.beginPath(); x.moveTo(sx-1.05,sy); x.lineTo(sx+1.05,sy); x.stroke(); }
    });
    const SURROUND=spr(S,x=>{
      let g=x.createRadialGradient(-6,-8,24,0,0,38); g.addColorStop(0,'#111319'); g.addColorStop(0.5,'#50566b'); g.addColorStop(0.72,'#23262f'); g.addColorStop(1,'#0c0d13'); x.fillStyle=g; x.beginPath(); x.arc(0,0,38,0,TAU); x.fill();
    });
    const CONE=spr(S,x=>{
      let g=x.createRadialGradient(0,0,5,0,0,30); g.addColorStop(0,'#0a0b10'); g.addColorStop(0.65,'#2a2d38'); g.addColorStop(1,'#464b5c'); x.fillStyle=g; x.beginPath(); x.arc(0,0,30,0,TAU); x.fill();
      x.strokeStyle='rgba(255,255,255,0.06)'; x.lineWidth=0.5; for(let r=16;r<30;r+=2.8){ x.beginPath(); x.arc(0,0,r,0,TAU); x.stroke(); }
      g=x.createLinearGradient(-20,-26,14,20); g.addColorStop(0,'rgba(255,255,255,0.22)'); g.addColorStop(0.5,'rgba(255,255,255,0)'); x.fillStyle=g; x.beginPath(); x.arc(0,0,30,0,TAU); x.fill();
    });
    /* a spun-aluminium dust cap with a thin lit ring, so it reads as a speaker and not an eye */
    const CAP=spr(S,x=>{ let g=x.createLinearGradient(-14,-14,14,14); g.addColorStop(0,'#ff5ea8'); g.addColorStop(1,'#2fd0b5'); x.strokeStyle=g; x.lineWidth=1.5; x.beginPath(); x.arc(0,0,17.4,0,TAU); x.stroke();
      g=x.createRadialGradient(-4.5,-5.5,1,0,0,16.5); g.addColorStop(0,'#fafbff'); g.addColorStop(0.42,'#bcc3d2'); g.addColorStop(1,'#4b5166'); x.fillStyle=g; x.beginPath(); x.arc(0,0,15.5,0,TAU); x.fill();
      x.strokeStyle='rgba(255,255,255,0.14)'; x.lineWidth=0.35; for(let r=3;r<15;r+=2.4){ x.beginPath(); x.arc(0,0,r,0,TAU); x.stroke(); }
      x.fillStyle='rgba(255,255,255,0.8)'; x.beginPath(); x.ellipse(-5,-6.5,4,2.3,-0.7,0,TAU); x.fill(); });
    const TEAL=glowOf(Math.round(px*0.5),'47,208,181',0.3,0.35), PINK=glowOf(Math.round(px*0.5),'255,94,168',0.3,0.35);
    const R0=32, BW=2.6;
    return (c,t)=>{
      const u=t%P, fr=(u/P)*F, i0=Math.floor(fr), mix=fr-i0;
      const ph=u%BEAT, kick=Math.min(1,ph/0.02)*Math.exp(-ph/0.13);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      c.globalCompositeOperation='lighter';
      c.globalAlpha=0.3+0.5*kick; c.drawImage(TEAL,50-60,88-46,120,92);
      c.globalAlpha=0.3+0.35*kick; c.drawImage(PINK,50-60,12-46,120,92);
      c.globalCompositeOperation='source-over'; c.globalAlpha=1;
      const sw=clamp(ph/0.5);
      c.strokeStyle='rgba(255,255,255,'+(0.26*Math.min(1,ph/0.03)*(1-sw)*(1-sw))+')'; c.lineWidth=0.6+1.4*(1-sw); c.beginPath(); c.arc(50,50,30+sw*30,0,TAU); c.stroke();
      c.lineCap='round';
      const val=(arr,i)=>lerp(arr[i0*H+i],arr[(i0+1)*H+i],mix);
      c.globalCompositeOperation='lighter'; c.lineWidth=BW*2; c.globalAlpha=0.2;
      for(let i=0;i<H;i++){ const v=val(V,i), L=R0+1+16.5*v; c.strokeStyle=barC[i]; c.beginPath(); for(const d of dirs[i]){ c.moveTo(50+d[0]*R0,50+d[1]*R0); c.lineTo(50+d[0]*L,50+d[1]*L); } c.stroke(); }
      c.globalCompositeOperation='source-over'; c.lineWidth=BW; c.globalAlpha=1;
      for(let i=0;i<H;i++){ const v=val(V,i), L=R0+1+16.5*v; c.strokeStyle=barC[i]; c.beginPath(); for(const d of dirs[i]){ c.moveTo(50+d[0]*R0,50+d[1]*R0); c.lineTo(50+d[0]*L,50+d[1]*L); } c.stroke(); }
      c.fillStyle='#ffffff'; c.globalAlpha=0.9;
      for(let i=0;i<H;i++){ const pk=val(PK,i), L=R0+3.2+16.5*pk; c.beginPath(); for(const d of dirs[i]){ c.moveTo(50+d[0]*L+1.05,50+d[1]*L); c.arc(50+d[0]*L,50+d[1]*L,1.05,0,TAU); } c.fill(); }
      c.globalAlpha=1;
      const dr=30*1.0638*(1+0.01*kick), rs=30*1.0638*(1+0.02*kick), rc=30*1.0638*(1+0.075*kick), rd=30*1.0638*(1+0.14*kick);
      blit(c,FRAME,50,50,dr); blit(c,SURROUND,50,50,rs); blit(c,CONE,50,50,rc); blit(c,CAP,50,50,rd);
      done(c);
    };
  }},

/* ---------------------------------------------------------------- PAGE CURL: the page rolls round a cylinder */
{ id:'pagecurl', name:'Page Curl', section:'3D', isNew:true, still:0.8,
  line:'The corner of the page rolls up and over to reveal the next picture underneath.',
  make(px){
    const P=4.8, half=P/2, sc=px/100, M=16;
    const PX=7, PY=6, PW=86, PH=88;
    const [DESK,d]=canvasOf(px);
    let g=d.createLinearGradient(0,0,100,100); g.addColorStop(0,'#4a2f20'); g.addColorStop(1,'#1d120b'); d.fillStyle=g; d.fillRect(0,0,100,100);
    d.fillStyle='rgba(0,0,0,0.42)'; d.beginPath(); d.roundRect(4,4.5,94,94,3); d.fill();
    g=d.createLinearGradient(0,0,100,100); g.addColorStop(0,'#a12d3a'); g.addColorStop(1,'#5f1524'); d.fillStyle=g; d.beginPath(); d.roundRect(1.5,2.5,96,95.5,2.2); d.fill();
    /* the spine down the left, with its gold bands */
    g=d.createLinearGradient(1.5,0,7,0); g.addColorStop(0,'#5a1320'); g.addColorStop(0.55,'#b13a48'); g.addColorStop(1,'#4e101c'); d.fillStyle=g; d.beginPath(); d.roundRect(1.5,2.5,5.5,95.5,[2.2,0,0,2.2]); d.fill();
    d.fillStyle='#e8bd63'; [13,18,82,87].forEach(y=>d.fillRect(1.8,y,4.9,1.1));
    d.fillStyle='#ded5c0'; d.beginPath(); d.roundRect(PX+0.6,PY+0.6,PW+1,PH+1,1.4); d.fill();
    d.strokeStyle='rgba(120,100,70,0.45)'; d.lineWidth=0.25; for(let i=1;i<4;i++){ d.beginPath(); d.moveTo(PX+PW+0.3*i,PY+1); d.lineTo(PX+PW+0.3*i,PY+PH+0.3*i); d.lineTo(PX+1,PY+PH+0.3*i); d.stroke(); }

    function picA(x){
      let q=x.createLinearGradient(0,10,0,78); q.addColorStop(0,'#3ea7ec'); q.addColorStop(0.6,'#a7dcf8'); q.addColorStop(1,'#fff0c9'); x.fillStyle=q; x.fillRect(0,0,100,100);
      const cloud=(cx,cy,s)=>{ x.fillStyle='rgba(255,255,255,0.95)'; [[-11,1,5.5],[-5,-2.4,7],[3,-3.4,8.4],[11,0.4,6]].forEach(([dx,dy,r])=>{ x.beginPath(); x.arc(cx+dx*s,cy+dy*s,r*s,0,TAU); x.fill(); }); x.beginPath(); x.roundRect(cx-16*s,cy,33*s,5.8*s,2.9*s); x.fill(); };
      cloud(25,27,0.82); cloud(79,47,0.9);
      const hill=(col0,col1,pts)=>{ const g2=x.createLinearGradient(0,60,0,92); g2.addColorStop(0,col0); g2.addColorStop(1,col1); x.fillStyle=g2; x.beginPath(); x.moveTo(0,100); x.lineTo(0,pts[0]); x.bezierCurveTo(22,pts[1],32,pts[2],52,pts[3]); x.bezierCurveTo(70,pts[4],82,pts[5],100,pts[6]); x.lineTo(100,100); x.closePath(); x.fill(); };
      hill('#88cf74','#5aae5d',[70,60,72,68,62,72,62]); hill('#58ae5a','#2f7f49',[80,74,82,79,86,72,76]);
      x.save(); x.translate(50,41); x.scale(0.8,0.8);
      x.save(); x.beginPath(); x.moveTo(-7,33); x.bezierCurveTo(-14,20,-27,10,-27,-7); x.bezierCurveTo(-27,-24,-14,-33,0,-33); x.bezierCurveTo(14,-33,27,-24,27,-7); x.bezierCurveTo(27,10,14,20,7,33); x.closePath(); x.clip();
      x.fillStyle='#e83d3a'; x.fillRect(-30,-36,60,72);
      [[22,'#fff1d6'],[15.5,'#f6a623'],[9,'#e83d3a'],[3.6,'#fff1d6']].forEach(([rx,col])=>{ x.fillStyle=col; x.beginPath(); x.ellipse(0,-4,rx,38,0,0,TAU); x.fill(); });
      let g3=x.createRadialGradient(-11,-16,3,0,-4,38); g3.addColorStop(0,'rgba(255,255,255,0.42)'); g3.addColorStop(0.5,'rgba(255,255,255,0)'); g3.addColorStop(1,'rgba(40,0,30,0.42)'); x.fillStyle=g3; x.fillRect(-30,-36,60,72); x.restore();
      x.strokeStyle='#6a3f22'; x.lineWidth=0.9; x.lineCap='round'; [[-6.5,-6],[-2,-2.2],[2,2.2],[6.5,6]].forEach(([a,b])=>{ x.beginPath(); x.moveTo(a,33); x.lineTo(b,41); x.stroke(); });
      x.fillStyle='#8f5a2e'; x.beginPath(); x.roundRect(-7.2,31.5,14.4,3,1); x.fill();
      g3=x.createLinearGradient(-7,0,7,0); g3.addColorStop(0,'#b77a3e'); g3.addColorStop(1,'#7a4a24'); x.fillStyle=g3; x.beginPath(); x.roundRect(-7,41,14,9.5,1.4); x.fill();
      x.strokeStyle='rgba(60,30,10,0.45)'; x.lineWidth=0.5; for(let i=1;i<4;i++){ x.beginPath(); x.moveTo(-7+i*3.5,41.4); x.lineTo(-7+i*3.5,50.2); x.stroke(); } x.beginPath(); x.moveTo(-7,45.5); x.lineTo(7,45.5); x.stroke();
      x.restore();
    }
    function picB(x){
      let q=x.createLinearGradient(0,10,0,62); q.addColorStop(0,'#0c1446'); q.addColorStop(0.65,'#2d2476'); q.addColorStop(1,'#b0507f'); x.fillStyle=q; x.fillRect(0,0,100,100);
      const r=rng(14); x.fillStyle='#fff'; for(let i=0;i<9;i++) for(let j=0;j<5;j++){ if((i+j)%2) continue; const sx=12+i*9.2+(r()-0.5)*5, sy=13+j*8.8+(r()-0.5)*5, s=0.32+r()*0.42; x.globalAlpha=0.5+r()*0.5; x.beginPath(); x.arc(sx,sy,s,0,TAU); x.fill(); } x.globalAlpha=1;
      const mx=66, my=30;
      let g2=x.createRadialGradient(mx,my,10,mx,my,36); g2.addColorStop(0,'rgba(255,238,190,0.42)'); g2.addColorStop(1,'rgba(255,238,190,0)'); x.fillStyle=g2; x.fillRect(0,0,100,70);
      g2=x.createRadialGradient(mx-4,my-4,2,mx,my,14.5); g2.addColorStop(0,'#fffbe9'); g2.addColorStop(1,'#ffd98a'); x.fillStyle=g2; x.beginPath(); x.arc(mx,my,14,0,TAU); x.fill();
      x.fillStyle='rgba(205,155,80,0.32)'; [[-4.5,-3.5,2.9],[4.5,2.5,2.2],[-2,6.5,1.6],[6,-6,1.3]].forEach(([dx,dy,s])=>{ x.beginPath(); x.arc(mx+dx,my+dy,s,0,TAU); x.fill(); });
      g2=x.createLinearGradient(0,61,0,92); g2.addColorStop(0,'#2a60bb'); g2.addColorStop(1,'#0c1c58'); x.fillStyle=g2; x.fillRect(0,61,100,40);
      x.fillStyle='rgba(255,226,150,0.85)'; for(let i=0;i<7;i++){ const w=22-i*2.3, y=63+i*3.4; x.beginPath(); x.roundRect(mx-w/2+(i%2?1.8:-1.8),y,w,1.15,0.6); x.fill(); }
      /* the boat */
      x.save(); x.translate(40,63); x.rotate(-0.04);
      x.strokeStyle='#5c3a1f'; x.lineWidth=1.1; x.beginPath(); x.moveTo(0,0); x.lineTo(0,-37); x.stroke();
      g2=x.createLinearGradient(0,-36,0,-3); g2.addColorStop(0,'#ffffff'); g2.addColorStop(1,'#d9e3f6'); x.fillStyle=g2; x.beginPath(); x.moveTo(1.3,-36); x.quadraticCurveTo(21,-16,22,-3.2); x.lineTo(1.3,-3.2); x.closePath(); x.fill();
      g2=x.createLinearGradient(0,-30,0,-3); g2.addColorStop(0,'#ffd46a'); g2.addColorStop(1,'#f39a3a'); x.fillStyle=g2; x.beginPath(); x.moveTo(-1.3,-31); x.quadraticCurveTo(-14,-14,-15.5,-3.2); x.lineTo(-1.3,-3.2); x.closePath(); x.fill();
      g2=x.createLinearGradient(0,-1,0,9); g2.addColorStop(0,'#ee5a42'); g2.addColorStop(1,'#a82a2f'); x.fillStyle=g2; x.beginPath(); x.moveTo(-20,-1.4); x.lineTo(25,-1.4); x.quadraticCurveTo(21,8.6,13,8.6); x.lineTo(-11,8.6); x.quadraticCurveTo(-17,8.6,-20,-1.4); x.closePath(); x.fill();
      x.fillStyle='#fff3d4'; x.fillRect(-19,-1.6,43.6,1.5);
      x.restore();
      const wave=(y,amp,n,col)=>{ x.fillStyle=col; x.beginPath(); x.moveTo(0,100); x.lineTo(0,y); const w=100/n; for(let i=0;i<n;i++) x.quadraticCurveTo(i*w+w/2,y-amp,(i+1)*w,y); x.lineTo(100,100); x.closePath(); x.fill(); };
      wave(70,5,6,'#1f4ba3'); wave(76,5.5,5,'#163a8a'); wave(83,6,4,'#0e2869');
    }
    const pageCanvas=pic=>{ const [C,x]=canvasOf(px); x.fillStyle='#fbf7ec'; x.beginPath(); x.roundRect(PX,PY,PW,PH,1.4); x.fill(); x.save(); x.beginPath(); x.roundRect(PX+3.4,PY+3.4,PW-6.8,PH-6.8,1.6); x.clip(); pic(x); x.restore(); const q=x.createLinearGradient(PX,0,PX+12,0); q.addColorStop(0,'rgba(60,40,20,0.3)'); q.addColorStop(1,'rgba(60,40,20,0)'); x.fillStyle=q; x.beginPath(); x.roundRect(PX,PY,PW,PH,1.4); x.fill(); return C; };
    const backCanvas=src=>{ const [C,x]=canvasOf(px); let q=x.createLinearGradient(PX,PY,PX+PW,PY+PH); q.addColorStop(0,'#fffdf5'); q.addColorStop(1,'#eadfc6'); x.fillStyle=q; x.beginPath(); x.roundRect(PX,PY,PW,PH,1.4); x.fill(); x.setTransform(1,0,0,1,0,0); x.globalAlpha=0.13; x.drawImage(src,0,0); x.globalAlpha=1; return C; };
    const A=pageCanvas(picA), B=pageCanvas(picB), BA=backCanvas(A), BB=backCanvas(B);
    const SH=(()=>{ const C=document.createElement('canvas'); C.width=C.height=px; const x=C.getContext('2d'); x.shadowColor='#000'; x.shadowBlur=px*0.028; x.shadowOffsetX=px*2; x.fillStyle='#000'; x.fillRect(PX*sc-px*2,PY*sc,PW*sc,PH*sc); return C; })();

    function band(c,nx,ny,w0,w1){ const L=320, tx=-ny*L, ty=nx*L; c.beginPath(); c.moveTo(nx*w0+tx,ny*w0+ty); c.lineTo(nx*w0-tx,ny*w0-ty); c.lineTo(nx*w1-tx,ny*w1-ty); c.lineTo(nx*w1+tx,ny*w1+ty); c.closePath(); }
    return (c,t)=>{
      const u=t%P, first=u<half, v=first?u:u-half, F=first?A:B, U=first?B:A, Bk=first?BA:BB;
      const p=0.5-0.5*Math.cos(Math.PI*seg(v,0.1,half-0.06));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(DESK,0,0);
      if(p<=0){ c.drawImage(F,0,0); done(c); return; }
      if(p>=1){ c.drawImage(U,0,0); done(c); return; }
      c.drawImage(U,0,0);
      const a=lerp(47,33,p)*Math.PI/180, nx=Math.cos(a), ny=Math.sin(a);
      const wmax=(PX+PW)*nx+(PY+PH)*ny, wmin=PX*nx+PY*ny, R=lerp(5.5,10.5,Math.min(1,p*3.5)), PIR=Math.PI*R;
      const W=lerp(wmax+0.6,wmin-PIR-7,p);
      c.setTransform(sc,0,0,sc,0,0);
      /* shadow the curl throws on the page beneath */
      c.save(); c.beginPath(); c.rect(PX,PY,PW,PH); c.clip();
      const q=c.createLinearGradient(nx*(W+R*0.8),ny*(W+R*0.8),nx*(W+R+11),ny*(W+R+11)); q.addColorStop(0,'rgba(10,6,20,0.55)'); q.addColorStop(1,'rgba(10,6,20,0)'); c.fillStyle=q; band(c,nx,ny,W+R*0.5,W+R+11); c.fill();
      c.restore();
      /* the part of the page still lying flat */
      c.save(); band(c,nx,ny,-320,W+0.25); c.clip(); c.drawImage(F,0,0,100,100);
      const ao=c.createLinearGradient(nx*(W-9),ny*(W-9),nx*W,ny*W); ao.addColorStop(0,'rgba(10,6,20,0)'); ao.addColorStop(1,'rgba(10,6,20,0.26)');
      c.beginPath(); c.rect(PX,PY,PW,PH); c.clip(); c.fillStyle=ao; band(c,nx,ny,W-9,W+0.25); c.fill();
      c.restore();
      /* the flap's shadow, cast on what lies under it */
      const C=2*W+PIR, m2=1-2*nx*nx, m12=-2*nx*ny, m3=1-2*ny*ny;
      c.save(); c.setTransform(sc*m2,sc*m12,sc*m12,sc*m3,sc*(nx*C+1.5),sc*(ny*C+2.6)); band(c,nx,ny,W+PIR-0.3,400); c.clip(); c.globalAlpha=0.5; c.drawImage(SH,0,0,100,100); c.restore();
      /* the roll, one strip at a time, front then back */
      const ds=PIR/M;
      for(let i=0;i<M;i++){
        const s0=i*ds, s1=(i+1)*ds, th=(s0+s1)/2/R, w0=W+R*Math.sin(s0/R), w1=W+R*Math.sin(s1/R), k=(w1-w0)/ds;
        const K=k-1, Tt=w0-k*(W+s0);
        c.save();
        c.setTransform(sc*(1+K*nx*nx),sc*(K*nx*ny),sc*(K*nx*ny),sc*(1+K*ny*ny),sc*nx*Tt,sc*ny*Tt);
        band(c,nx,ny,W+s0,W+s1+0.35); c.clip();
        const front=th<Math.PI/2;
        c.drawImage(front?F:Bk,0,0,100,100);
        c.beginPath(); c.rect(PX,PY,PW,PH); c.clip();
        const cs=Math.abs(Math.cos(th)), dark=front?0.42*(1-cs):0.46*Math.pow(1-cs,1.3), hi=front?0:0.3*Math.exp(-Math.pow((th-2.2)/0.34,2));
        if(dark>0.005){ c.fillStyle='rgba(16,10,26,'+dark+')'; band(c,nx,ny,W+s0,W+s1+0.35); c.fill(); }
        if(hi>0.005){ c.fillStyle='rgba(255,255,255,'+hi+')'; band(c,nx,ny,W+s0,W+s1+0.35); c.fill(); }
        c.restore();
      }
      /* the flat flap lying back over the page, showing the paper's reverse */
      c.save(); c.setTransform(sc*m2,sc*m12,sc*m12,sc*m3,sc*nx*C,sc*ny*C); band(c,nx,ny,W+PIR-0.3,400); c.clip(); c.drawImage(Bk,0,0,100,100); c.restore();
      done(c);
    };
  }}
);
})();
