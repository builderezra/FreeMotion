/* Round 1: the ten he loved (9 Nov), being polished. */
(function(){
'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;
window.FX_TILES.push({ id:'tealorange', name:'Teal & Orange', section:'Colouring', still:0.95, polished:true,
  line:'A flat grey shot gets its cinema grade as the line sweeps across.',
  make(px){
    const P=4.2, sc=px/100, SUN={x:68,y:47,r:13.5};
    // one palm leaf: a curved spine whose width swells and tapers, notched along its lower edge
    function frond(c,x0,y0,x1,y1,qx,qy,w){
      const N=16, up=[], low=[], mdx=x1-x0;
      const flip=mdx<0?-1:1;
      for(let i=0;i<=N;i++){
        const s=i/N, q=1-s, x=q*q*x0+2*q*s*qx+s*s*x1, y=q*q*y0+2*q*s*qy+s*s*y1;
        const dx=2*q*(qx-x0)+2*s*(x1-qx), dy=2*q*(qy-y0)+2*s*(y1-qy), l=Math.hypot(dx,dy)||1;
        const nx=-dy/l*flip, ny=dx/l*flip, env=Math.pow(Math.sin(Math.PI*Math.min(1,s*0.94+0.06)),0.75)*w;
        up.push([x-nx*env*0.4,y-ny*env*0.4]);
        const cut=i%2?1:0.42; low.push([x+nx*env*cut,y+ny*env*cut]);
      }
      c.beginPath(); up.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); low.reverse().forEach(p=>c.lineTo(p[0],p[1])); c.closePath(); c.fill();
    }
    function palm(c,col,bx,by,qx,qy,tx,ty,L){
      c.fillStyle=col; c.beginPath();
      const N=18, a=[], b=[];
      for(let i=0;i<=N;i++){ const s=i/N, q=1-s, x=q*q*bx+2*q*s*qx+s*s*tx, y=q*q*by+2*q*s*qy+s*s*ty, dx=2*q*(qx-bx)+2*s*(tx-qx), dy=2*q*(qy-by)+2*s*(ty-qy), l=Math.hypot(dx,dy)||1, hw=lerp(2.2,1,s)*L/24; a.push([x-dy/l*hw,y+dx/l*hw]); b.push([x+dy/l*hw,y-dx/l*hw]); }
      a.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); b.reverse().forEach(p=>c.lineTo(p[0],p[1])); c.closePath(); c.fill();
      [[-1,0.52,-0.6,-0.26],[-1.04,0.04,-0.52,-0.42],[-0.64,-0.38,-0.26,-0.56],[0.2,-0.56,0.08,-0.5],[0.68,-0.3,0.36,-0.55],[1.02,0.14,0.56,-0.4],[0.82,0.64,0.56,-0.2]].forEach(([ex,ey,qx2,qy2])=>frond(c,tx,ty,tx+ex*L,ty+ey*L,tx+qx2*L,ty+qy2*L,L*0.115));
      c.beginPath(); c.arc(tx,ty,L*0.075,0,TAU); c.fill();
    }
    function figure(c,k){
      const body=new Path2D('M31.5 52 C26 56 18 57 14.5 62 C11 67 10 80 9 100 L61 100 C60 80 59 67 55.5 62 C52 57 45 56 40.5 52 Z');
      const head=new Path2D(); head.ellipse(36,40.6,8.4,8.2,0,0,TAU);
      const crown=new Path2D('M26.6 35.4 C26.8 29 27.6 24.6 30.6 23.4 C33 22.4 34.6 24.2 36 24.2 C37.4 24.2 39 22.4 41.4 23.4 C44.4 24.6 45.2 29 45.4 35.4 C40 38.4 32 38.4 26.6 35.4 Z');
      const brim=new Path2D(); brim.ellipse(36,35.8,20,4.4,-0.03,0,TAU);
      const lit=(p,base,rim,dx)=>{ c.fillStyle=rim; c.fill(p); c.save(); c.clip(p); c.translate(dx,0.55); c.fillStyle=base; c.fill(p); c.restore(); };
      // neck, then hair, then the jacket over the neck's base
      c.fillStyle=k.neck; c.beginPath(); c.roundRect(31.8,44,8.4,12,2); c.fill();
      // he is turned away toward the sun: a sliver of lit cheek, then the hair sweeping round the back of the head
      lit(head,k.neck,k.rim,-0.7);
      c.fillStyle=k.hair; c.fill(new Path2D('M44.6 35 C41.4 37.6 39.9 40.6 40.1 44 C40.2 46.6 38.6 48.6 36 48.8 C31 48.8 27.6 45.2 27.6 40.6 C27.6 36 31 32 36 32 Z'));
      c.fillStyle=k.ear; c.beginPath(); c.ellipse(40.7,43.2,1.35,2.3,-0.1,0,TAU); c.fill();
      let g=c.createLinearGradient(0,52,0,100); g.addColorStop(0,k.jacket0); g.addColorStop(1,k.jacket1);
      const rg=c.createLinearGradient(0,54,0,98); rg.addColorStop(0,k.rim); rg.addColorStop(0.5,k.rim); rg.addColorStop(1,k.jacket1);
      lit(body,g,rg,-1.15);
      c.strokeStyle=k.crease; c.lineCap='round'; c.lineWidth=0.9;
      c.beginPath(); c.moveTo(20,70); c.quadraticCurveTo(18.6,86,18.6,100); c.moveTo(50.6,70); c.quadraticCurveTo(52,86,52,100); c.moveTo(35.5,62); c.lineTo(35.5,100); c.stroke();
      c.fillStyle=k.jacket1; c.beginPath(); c.moveTo(29.5,54.6); c.bezierCurveTo(33,51.6,39,51.6,42.5,54.6); c.bezierCurveTo(39,57.2,33,57.2,29.5,54.6); c.closePath(); c.fill();
      // the hat: brim, then crown standing on it, then the band
      lit(brim,k.hat0,k.brimRim,-1.4);
      g=c.createLinearGradient(27,0,45,0); g.addColorStop(0,k.hat0); g.addColorStop(1,k.hat1); c.fillStyle=g; c.fill(crown);
      c.save(); c.clip(crown); c.fillStyle=k.band; c.fillRect(20,32.4,32,8); c.restore();
    }
    function scene(c,k){
      let g=c.createLinearGradient(0,0,0,58); g.addColorStop(0,k.sky0); g.addColorStop(0.58,k.sky1); g.addColorStop(1,k.sky2); c.fillStyle=g; c.fillRect(0,0,100,58);
      [[24,14,26,2.5],[80,10,22,2],[56,23,30,2.2]].forEach(([x,y,rx,ry])=>{ c.fillStyle=k.cloud; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,TAU); c.fill(); c.fillStyle=k.cloudLit; c.beginPath(); c.ellipse(x+rx*0.12,y+ry*0.5,rx*0.8,ry*0.42,0,0,TAU); c.fill(); });
      g=c.createRadialGradient(SUN.x,SUN.y,2,SUN.x,SUN.y,46); g.addColorStop(0,k.glow); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(0,0,100,60);
      g=c.createLinearGradient(0,SUN.y-SUN.r,0,SUN.y+SUN.r); g.addColorStop(0,k.sun0); g.addColorStop(1,k.sun1); c.fillStyle=g; c.beginPath(); c.arc(SUN.x,SUN.y,SUN.r,0,TAU); c.fill();
      c.fillStyle=k.hill; c.beginPath(); c.moveTo(0,58); c.bezierCurveTo(12,51,26,52,40,57); c.bezierCurveTo(56,60,74,60,84,55.5); c.bezierCurveTo(90,53,96,54,100,56); c.lineTo(100,60); c.lineTo(0,60); c.closePath(); c.fill();
      g=c.createLinearGradient(0,58,0,100); g.addColorStop(0,k.sea0); g.addColorStop(1,k.sea1); c.fillStyle=g; c.fillRect(0,58,100,42);
      g=c.createLinearGradient(SUN.x-18,0,SUN.x+18,0); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(0.5,k.column); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(SUN.x-18,58,36,42);
      c.fillStyle=k.ink; c.beginPath(); c.moveTo(62,100); c.bezierCurveTo(74,92,88,82,100,79); c.lineTo(100,100); c.closePath(); c.fill();
      palm(c,k.ink,93,86,99,54,85,20,23);
      figure(c,k);
    }
    const flat={sky0:'#858a90',sky1:'#adaba5',sky2:'#cfc9bd',cloud:'#9a9a96',cloudLit:'#c2beb3',glow:'rgba(240,236,226,0.42)',sun0:'#f1ecdf',sun1:'#e2dccd',hill:'#7c8187',sea0:'#7f858a',sea1:'#585d63',column:'rgba(214,208,196,0.24)',ink:'#42464b',jacket0:'#73787d',jacket1:'#565b61',rim:'#b8b5ac',crease:'rgba(40,44,48,0.28)',neck:'#a3998e',ear:'#8d847a',hair:'#4c5054',hat0:'#7d7a73',hat1:'#b3afa4',band:'#55595e',brimRim:'#cfcbbf',shim:'#ddd7ca'};
    const graded={sky0:'#07384a',sky1:'#c96a55',sky2:'#ffad5c',cloud:'#1f5c6c',cloudLit:'#ff9a58',glow:'rgba(255,160,80,0.78)',sun0:'#fff4cf',sun1:'#ffc66e',hill:'#0f3f4b',sea0:'#147080',sea1:'#05222c',column:'rgba(255,170,90,0.3)',ink:'#051c25',jacket0:'#0f5a68',jacket1:'#06303c',rim:'#ffb56a',crease:'rgba(0,18,26,0.42)',neck:'#e08a50',ear:'#a85a30',hair:'#0b2f38',hat0:'#6e3f22',hat1:'#f2a75c',band:'#0a3a46',brimRim:'#ffd199',shim:'#ffbd74'};
    const [A,a]=canvasOf(px); scene(a,flat);
    const [B,b]=canvasOf(px); scene(b,graded);
    // the sun's path on the water, redrawn each frame so it shimmers in both grades
    const shimmer=(c,u,col)=>{ c.fillStyle=col; for(let i=0;i<5;i++){ const y=61+i*5.6, wv=Math.sin(TAU*u/P*3+i*1.7), w=(21-i*3.1)*(0.84+0.16*wv), o=1.1*Math.sin(TAU*u/P*2+i*2.3); c.globalAlpha=0.92-i*0.13; c.beginPath(); c.roundRect(SUN.x-w/2+o,y,w,1.5+i*0.16,0.8); c.fill(); } c.globalAlpha=1; };
    return (c,t)=>{
      const u=t%P;
      const x=100*E.inOut(seg(u,0.3,1.4))*(1-E.inOut(seg(u,2.9,3.8)));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(A,0,0);
      c.setTransform(sc,0,0,sc,0,0); shimmer(c,u,flat.shim);
      if(x>0.2){
        c.save(); c.beginPath(); c.rect(0,0,x,100); c.clip();
        c.setTransform(1,0,0,1,0,0); c.drawImage(B,0,0);
        c.setTransform(sc,0,0,sc,0,0); shimmer(c,u,graded.shim);
        c.restore();
      }
      if(x>0.5&&x<99.5){
        const g=c.createLinearGradient(x,0,x+5,0); g.addColorStop(0,'rgba(0,0,0,0.28)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(x,0,5,100);
        c.fillStyle='rgba(255,255,255,0.97)'; c.fillRect(x-0.45,0,0.9,100);
        c.fillStyle='rgba(0,0,0,0.3)'; c.beginPath(); c.arc(x+0.3,50.9,6.3,0,TAU); c.fill();
        c.fillStyle='#fff'; c.beginPath(); c.arc(x,50,5.8,0,TAU); c.fill();
        c.fillStyle='#1b1f26';
        c.beginPath(); c.moveTo(x-1.5,47.3); c.lineTo(x-3.9,50); c.lineTo(x-1.5,52.7); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(x+1.5,47.3); c.lineTo(x+3.9,50); c.lineTo(x+1.5,52.7); c.closePath(); c.fill();
      }
      c.setTransform(1,0,0,1,0,0);
    };
  }},

{ id:'chromakey', name:'Chroma Key', section:'Keying', still:1.9, polished:true,
  line:'The picker taps the green, and the screen behind him turns into a night sky.',
  make(px){
    const P=4.6, sc=px/100;
    const [BG,bg]=canvasOf(px);
    let g=bg.createLinearGradient(0,0,0,100); g.addColorStop(0,'#120f35'); g.addColorStop(0.55,'#5a2a6e'); g.addColorStop(0.8,'#ff7a7a'); g.addColorStop(1,'#ffc38a'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    const r=rng(7); bg.fillStyle='#fff'; for(let i=0;i<60;i++){ const x=r()*100, y=r()*55, s=r()*0.7+0.2; bg.globalAlpha=0.3+r()*0.7; bg.fillRect(x,y,s,s); } bg.globalAlpha=1;
    bg.fillStyle='#fff6df'; bg.beginPath(); bg.arc(22,22,6,0,TAU); bg.fill();
    bg.fillStyle='#3a1f52'; bg.beginPath(); bg.moveTo(0,78); [[12,62],[24,72],[38,55],[52,70],[66,58],[80,71],[92,63],[100,68]].forEach(([x,y])=>bg.lineTo(x,y)); bg.lineTo(100,100); bg.lineTo(0,100); bg.closePath(); bg.fill();
    bg.fillStyle='#1d1030'; bg.beginPath(); bg.moveTo(0,88); [[16,76],[30,84],[46,74],[60,86],[76,77],[100,86]].forEach(([x,y])=>bg.lineTo(x,y)); bg.lineTo(100,100); bg.lineTo(0,100); bg.closePath(); bg.fill();
    const [GR,gr]=canvasOf(px);
    g=gr.createRadialGradient(50,40,5,50,50,75); g.addColorStop(0,'#3fe07a'); g.addColorStop(1,'#14a845'); gr.fillStyle=g; gr.fillRect(0,0,100,100);
    gr.strokeStyle='rgba(0,60,20,0.18)'; gr.lineWidth=3; for(let x=8;x<100;x+=17){ gr.beginPath(); gr.moveTo(x,0); gr.quadraticCurveTo(x+5,50,x-2,100); gr.stroke(); }
    const body=c=>{ c.beginPath(); c.moveTo(-27,100); c.bezierCurveTo(-27,80,-20,70,-9,67); c.lineTo(9,67); c.bezierCurveTo(20,70,27,80,27,100); c.closePath(); };
    const face=c=>{ c.beginPath(); c.moveTo(0,36); c.bezierCurveTo(8,36,11.5,42,11.3,49); c.bezierCurveTo(11,57,6,61.5,0,61.5); c.bezierCurveTo(-6,61.5,-11,57,-11.3,49); c.bezierCurveTo(-11.5,42,-8,36,0,36); c.closePath(); };
    const hair=c=>{ c.beginPath(); c.moveTo(-11.6,47); c.bezierCurveTo(-13,37,-6,31.5,1,32); c.bezierCurveTo(9,32.3,13.5,37,12,46); c.bezierCurveTo(10.5,41.5,7,40,3,40.5); c.bezierCurveTo(-2,41,-6,39.5,-7.5,38.5); c.bezierCurveTo(-8.5,41,-10,43.5,-11.6,47); c.closePath(); };
    function person(c,t,spill){
      const sway=Math.sin(t*1.6)*1.2, tilt=Math.sin(t*1.1)*0.035;
      c.save(); c.translate(50+sway,0);
      /* the green fringe goes UNDER him, so only the part outside his outline shows */
      if(spill>0.01){
        c.strokeStyle='rgba(70,240,120,'+(0.75*spill)+')'; c.lineWidth=2.6; c.lineJoin='round';
        body(c); c.stroke();
        c.save(); c.translate(0,58); c.rotate(tilt); c.translate(0,-58); face(c); c.stroke(); hair(c); c.stroke(); c.restore();
      }
      let gg=c.createLinearGradient(-27,67,27,100); gg.addColorStop(0,'#3d6bf2'); gg.addColorStop(1,'#2346c4'); c.fillStyle=gg; body(c); c.fill();
      c.fillStyle='#2a4fd1'; c.beginPath(); c.moveTo(-12,67); c.quadraticCurveTo(0,81,12,67); c.quadraticCurveTo(0,73,-12,67); c.closePath(); c.fill();
      c.fillStyle='#e6b08f'; c.beginPath(); c.roundRect(-4.6,57,9.2,12,3); c.fill();
      c.fillStyle='rgba(120,60,40,0.28)'; c.fillRect(-4.6,57,9.2,4);
      c.strokeStyle='#eef2ff'; c.lineWidth=0.9; c.lineCap='round'; c.beginPath(); c.moveTo(-3,70); c.lineTo(-3.4,81); c.moveTo(3,70); c.lineTo(3.4,81); c.stroke();
      c.fillStyle='#eef2ff'; c.beginPath(); c.arc(-3.4,81.6,0.9,0,TAU); c.arc(3.4,81.6,0.9,0,TAU); c.fill();
      c.save(); c.translate(0,58); c.rotate(tilt); c.translate(0,-58);
      c.fillStyle='#ecb795'; c.beginPath(); c.ellipse(-11,50,2.3,3.4,0,0,TAU); c.ellipse(11,50,2.3,3.4,0,0,TAU); c.fill();
      gg=c.createLinearGradient(-11,0,11,0); gg.addColorStop(0,'#f6cfb0'); gg.addColorStop(1,'#e9b18f'); c.fillStyle=gg; face(c); c.fill();
      c.fillStyle='#3a2a22'; hair(c); c.fill();
      c.strokeStyle='rgba(255,255,255,0.2)'; c.lineWidth=0.8; c.beginPath(); c.moveTo(-5,34.5); c.quadraticCurveTo(2,33,8,36); c.stroke();
      c.strokeStyle='#3a2a22'; c.lineWidth=1.2; c.beginPath(); c.moveTo(-7,45); c.quadraticCurveTo(-4.5,43.6,-2,44.6); c.moveTo(2,44.6); c.quadraticCurveTo(4.5,43.6,7,45); c.stroke();
      const bl=((t%3.4)>3.25)?0.15:1;
      [[-4.5,49],[4.5,49]].forEach(([x,y])=>{ c.save(); c.translate(x,y); c.scale(1,bl); c.fillStyle='#fff'; c.beginPath(); c.ellipse(0,0,2.3,1.7,0,0,TAU); c.fill(); c.fillStyle='#2b1d17'; c.beginPath(); c.arc(0.3,0.1,1.25,0,TAU); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(0.8,-0.5,0.45,0,TAU); c.fill(); c.restore(); });
      c.strokeStyle='rgba(150,80,55,0.55)'; c.lineWidth=0.8; c.beginPath(); c.moveTo(0.4,50); c.quadraticCurveTo(1.6,53.5,0,54.2); c.stroke();
      c.fillStyle='rgba(255,120,120,0.22)'; c.beginPath(); c.arc(-6.5,54,2.2,0,TAU); c.arc(6.5,54,2.2,0,TAU); c.fill();
      c.save(); c.beginPath(); c.moveTo(-3.6,55.8); c.quadraticCurveTo(0,60,3.6,55.8); c.closePath(); c.fillStyle='#7a2e28'; c.fill(); c.clip(); c.fillStyle='#fff'; c.fillRect(-4,55.6,8,1.3); c.restore();
      c.restore();
      c.restore();
    }
    function dropper(c,x,y,a){
      c.save(); c.translate(x,y); c.rotate(2.36); c.globalAlpha=a;
      c.fillStyle='#f4f6fb'; c.strokeStyle='#1b2030'; c.lineWidth=0.9;
      c.beginPath(); c.roundRect(-2,-16,4,13,1.5); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-1,-3); c.lineTo(1,-3); c.lineTo(0.3,2.5); c.lineTo(-0.3,2.5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle='#ff5a6a'; c.beginPath(); c.roundRect(-3,-23,6,7.5,2.5); c.fill(); c.stroke();
      c.restore();
    }
    return (c,t)=>{
      const u=t%P, tapX=80, tapY=24;
      const rev=E.inOut(seg(u,1.35,2.25))*(1-E.inOut(seg(u,4.0,4.5)));
      const R=rev*150;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(GR,0,0);
      if(R>0.5){ c.save(); c.beginPath(); c.arc(tapX*sc,tapY*sc,R*sc,0,TAU); c.clip(); c.drawImage(BG,0,0); c.restore(); }
      c.setTransform(sc,0,0,sc,0,0);
      const rp=seg(u,1.2,1.75);
      if(rp>0&&rp<1){ c.strokeStyle='rgba(255,255,255,'+(0.9*(1-rp))+')'; c.lineWidth=1.2; c.beginPath(); c.arc(tapX,tapY,2+rp*12,0,TAU); c.stroke(); }
      person(c,t,1-rev);
      const inP=E.out(seg(u,0.5,1.15)), outP=E.inOut(seg(u,1.55,2.1));
      if(inP>0&&outP<1){
        const press=(u>1.15&&u<1.35)?1:0;
        const dx=lerp(112,tapX+3,inP)+outP*30, dy=lerp(62,tapY+2.5,inP)+outP*22;
        dropper(c,dx+press*0.6,dy+press*0.6,1-outP);
      }
    };
  }},

{ id:'zoomblur', name:'Zoom Blur', section:'Blur', still:0.74, polished:true,
  line:'Headlights rush at you as the blur pulls everything toward the middle.',
  make(px){
    const P=2.8, sc=px/100, VP=[50,50], GY=-50, ZC=[50,56], LAMPS=[32.2,67.8], LY=64.2;
    const [S,s]=canvasOf(px);
    const pj=(X,Y,z)=>[VP[0]+X/z,VP[1]-Y/z];
    const poly=pts=>{ s.beginPath(); pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1])); s.closePath(); };
    const mix=(a,b,p)=>{ const h=x=>[1,3,5].map(i=>parseInt(x.substr(i,2),16)); const A=h(a),B=h(b); return 'rgb('+A.map((v,i)=>Math.round(lerp(v,B[i],p))).join(',')+')'; };
    // dusk sky with the glow of the far city at the end of the street
    let g=s.createLinearGradient(0,0,0,50); g.addColorStop(0,'#060a22'); g.addColorStop(0.6,'#1c1752'); g.addColorStop(0.88,'#54247c'); g.addColorStop(1,'#c43f78'); s.fillStyle=g; s.fillRect(0,0,100,50);
    g=s.createLinearGradient(0,50,0,100); g.addColorStop(0,'#241a3c'); g.addColorStop(1,'#04050c'); s.fillStyle=g; s.fillRect(0,50,100,50);
    g=s.createRadialGradient(50,50,0,50,50,34); g.addColorStop(0,'rgba(255,170,130,0.85)'); g.addColorStop(1,'rgba(255,100,150,0)'); s.fillStyle=g; s.fillRect(0,0,100,100);
    // the road
    g=s.createLinearGradient(0,50,0,100); g.addColorStop(0,'#1a1830'); g.addColorStop(1,'#0a0b14'); s.fillStyle=g;
    poly([pj(-30,GY,40),pj(30,GY,40),pj(30,GY,1),pj(-30,GY,1)]); s.fill();
    s.fillStyle='rgba(235,235,255,0.5)'; [-30,29].forEach(X=>{ poly([pj(X,GY,40),pj(X+1,GY,40),pj(X+1,GY,1),pj(X,GY,1)]); s.fill(); });
    s.fillStyle='#ffd28a'; [-11,10].forEach(X=>{ for(let i=0;i<13;i++){ const z0=1.02*Math.pow(1.24,i), z1=z0*1.11; poly([pj(X,GY,z1),pj(X+1,GY,z1),pj(X+1,GY,z0),pj(X,GY,z0)]); s.fill(); } });
    // two street walls of buildings in true perspective, every window on its block's own grid
    const R=rng(23);
    const blocks=[[1.02,1.55,150,6],[1.55,2.25,108,6],[2.25,3.2,165,6],[3.2,4.6,118,5],[4.6,6.6,178,5],[6.6,9.5,130,4],[9.5,14,190,4]];
    [-1,1].forEach(sgn=>{
      for(let b=blocks.length-1;b>=0;b--){
        const [z0,z1,H,cols]=blocks[b], X=sgn*52, fog=clamp((z0-1)/10)*0.82, top=pj(X,H,z0)[1], low=pj(X,GY,z0)[1];
        s.fillStyle=mix(['#121733','#171b3e'][b%2],'#6c2f86',fog);
        poly([pj(X,GY,z0),pj(X,H,z0),pj(X+sgn*150,H,z0),pj(X+sgn*150,GY,z0)]); s.fill();
        const gg=s.createLinearGradient(0,top,0,low); gg.addColorStop(0,mix(['#1a2048','#20204f'][b%2],'#7a3390',fog)); gg.addColorStop(1,mix('#30295c','#a84386',fog)); s.fillStyle=gg;
        poly([pj(X,GY,z0),pj(X,H,z0),pj(X,H,z1),pj(X,GY,z1)]); s.fill();
        const rows=Math.floor((H-GY-16)/13);
        for(let i=0;i<cols;i++) for(let j=0;j<rows;j++){
          const za=lerp(z0,z1,(i+0.2)/cols), zb=lerp(z0,z1,(i+0.8)/cols), y0=GY+18+j*13, y1=y0+8.2, on=R()<0.56, warm=R()<0.76;
          if(!on&&b>3) continue;
          s.fillStyle=on?(warm?'#ffcb7a':'#8fd8ff'):'rgba(4,6,20,0.55)'; s.globalAlpha=on?0.84-fog*0.2:1;
          poly([pj(X,y0,za),pj(X,y1,za),pj(X,y1,zb),pj(X,y0,zb)]); s.fill();
        }
        s.globalAlpha=1;
      }
    });
    // street lamps, one every block, marching to the vanishing point
    [9.4,6.7,4.8,3.4,2.45,1.75,1.25].forEach(z=>{
      [-1,1].forEach(sgn=>{
        const X=sgn*36, a=pj(X,GY,z), b=pj(X,26,z), h=pj(X-sgn*9,26,z);
        s.strokeStyle='#080a18'; s.lineCap='round'; s.lineWidth=0.25+1.2/z; s.beginPath(); s.moveTo(a[0],a[1]); s.lineTo(b[0],b[1]); s.lineTo(h[0],h[1]); s.stroke();
        const r=1.1+7/z, gg=s.createRadialGradient(h[0],h[1],0,h[0],h[1],r); gg.addColorStop(0,'rgba(255,255,240,1)'); gg.addColorStop(0.22,'rgba(255,214,150,0.85)'); gg.addColorStop(1,'rgba(255,170,90,0)');
        s.fillStyle=gg; s.beginPath(); s.arc(h[0],h[1],r,0,TAU); s.fill();
      });
    });
    // a pool of headlight on the tarmac
    g=s.createRadialGradient(50,96,2,50,96,44); g.addColorStop(0,'rgba(255,240,205,0.55)'); g.addColorStop(1,'rgba(255,240,205,0)'); s.save(); s.translate(50,96); s.scale(1,0.3); s.translate(-50,-96); s.fillStyle=g; s.beginPath(); s.arc(50,96,44,0,TAU); s.fill(); s.restore();
    // the car, head-on and big
    s.fillStyle='rgba(0,0,0,0.65)'; s.beginPath(); s.ellipse(50,87.5,31,4.4,0,0,TAU); s.fill();
    s.fillStyle='#05060b'; s.beginPath(); s.roundRect(26,73,11,15,2.6); s.roundRect(63,73,11,15,2.6); s.fill();
    s.fillStyle='#8f1730'; s.beginPath(); s.ellipse(25.4,53.2,3.6,2.3,-0.18,0,TAU); s.ellipse(74.6,53.2,3.6,2.3,0.18,0,TAU); s.fill();
    g=s.createLinearGradient(0,40,0,58); g.addColorStop(0,'#d42f48'); g.addColorStop(1,'#7d1129'); s.fillStyle=g;
    s.beginPath(); s.moveTo(29.5,58); s.bezierCurveTo(32,50,35.5,43.6,40,41.8); s.bezierCurveTo(46,40.2,54,40.2,60,41.8); s.bezierCurveTo(64.5,43.6,68,50,70.5,58); s.closePath(); s.fill();
    g=s.createLinearGradient(0,43,0,57); g.addColorStop(0,'#2b4678'); g.addColorStop(0.55,'#111d3c'); g.addColorStop(1,'#080c1c'); s.fillStyle=g;
    s.save(); s.beginPath(); s.moveTo(33,57); s.bezierCurveTo(35,50.6,38,45.8,41.2,44.4); s.bezierCurveTo(46.5,43.2,53.5,43.2,58.8,44.4); s.bezierCurveTo(62,45.8,65,50.6,67,57); s.closePath(); s.fill(); s.clip();
    s.fillStyle='rgba(170,210,255,0.17)'; poly([[45,42],[53,42],[43,58],[35,58]]); s.fill(); s.fillStyle='rgba(170,210,255,0.09)'; poly([[56,42],[59,42],[49,58],[46,58]]); s.fill(); s.restore();
    s.strokeStyle='rgba(255,226,190,0.65)'; s.lineWidth=0.5; s.lineCap='round'; s.beginPath(); s.moveTo(40.6,41.9); s.bezierCurveTo(46,40.5,54,40.5,59.4,41.9); s.stroke();
    g=s.createLinearGradient(0,55,0,82); g.addColorStop(0,'#f0425a'); g.addColorStop(0.35,'#bd1d38'); g.addColorStop(1,'#430a1c'); s.fillStyle=g;
    s.beginPath(); s.moveTo(26.5,58.5); s.bezierCurveTo(23,60.5,22.4,67,23,73); s.bezierCurveTo(23.4,78,25.5,81.5,30,81.5); s.lineTo(70,81.5); s.bezierCurveTo(74.5,81.5,76.6,78,77,73); s.bezierCurveTo(77.6,67,77,60.5,73.5,58.5); s.bezierCurveTo(66,56,34,56,26.5,58.5); s.closePath(); s.fill();
    s.fillStyle='rgba(255,255,255,0.2)'; s.beginPath(); s.moveTo(30,58.5); s.bezierCurveTo(40,56.8,60,56.8,70,58.5); s.bezierCurveTo(60,60,40,60,30,58.5); s.closePath(); s.fill();
    s.fillStyle='#090a12'; s.beginPath(); s.roundRect(39.5,62.5,21,8.5,2.2); s.fill();
    s.strokeStyle='rgba(190,200,230,0.55)'; s.lineWidth=0.45; for(let i=0;i<3;i++){ s.beginPath(); s.moveTo(41.2,64.7+i*2.1); s.lineTo(58.8,64.7+i*2.1); s.stroke(); }
    s.fillStyle='#e8ecf6'; s.beginPath(); s.arc(50,66.8,1.55,0,TAU); s.fill();
    s.fillStyle='#090a12'; s.beginPath(); s.roundRect(35,73.6,30,5.4,2); s.fill();
    s.fillStyle='#e9edf5'; s.beginPath(); s.roundRect(43.5,74.2,13,4.2,0.7); s.fill();
    s.fillStyle='#ffb347'; s.beginPath(); s.arc(29.4,75.8,1.5,0,TAU); s.arc(70.6,75.8,1.5,0,TAU); s.fill();
    LAMPS.forEach(x=>{
      s.fillStyle='#10131f'; s.beginPath(); s.roundRect(x-6.2,LY-4,12.4,8,2.4); s.fill();
      const gg=s.createRadialGradient(x,LY,0.4,x,LY,5.6); gg.addColorStop(0,'#ffffff'); gg.addColorStop(0.55,'#fff3cf'); gg.addColorStop(1,'#d9c7a0'); s.fillStyle=gg; s.beginPath(); s.roundRect(x-5.2,LY-3,10.4,6,1.8); s.fill();
    });
    s.globalCompositeOperation='lighter';
    LAMPS.forEach(x=>{ const gg=s.createRadialGradient(x,LY,1,x,LY,15); gg.addColorStop(0,'rgba(255,245,215,0.95)'); gg.addColorStop(0.35,'rgba(255,225,170,0.35)'); gg.addColorStop(1,'rgba(255,200,130,0)'); s.fillStyle=gg; s.beginPath(); s.arc(x,LY,15,0,TAU); s.fill(); });
    s.globalCompositeOperation='source-over';
    g=s.createRadialGradient(50,56,42,50,56,84); g.addColorStop(0,'rgba(0,0,8,0)'); g.addColorStop(1,'rgba(0,0,8,0.55)'); s.fillStyle=g; s.fillRect(0,0,100,100);
    // two passes of six copies give 36 evenly spaced samples, so the streaks are smooth, not ghosted
    const HR=Math.round(px/2), mk=()=>{ const C=document.createElement('canvas'); C.width=C.height=HR; return [C,C.getContext('2d')]; };
    const [T1,a1]=mk(), [T2,a2]=mk(), N=6;
    const FL=(()=>{ const C=document.createElement('canvas'), W=Math.round(70*sc); C.width=C.height=W; const x=C.getContext('2d'); x.setTransform(sc,0,0,sc,W/2,W/2);
      let q=x.createRadialGradient(0,0,0,0,0,18); q.addColorStop(0,'rgba(255,255,255,0.95)'); q.addColorStop(0.25,'rgba(255,236,190,0.42)'); q.addColorStop(1,'rgba(255,200,130,0)'); x.fillStyle=q; x.beginPath(); x.arc(0,0,18,0,TAU); x.fill();
      x.save(); x.scale(1,0.035); q=x.createRadialGradient(0,0,0,0,0,35); q.addColorStop(0,'rgba(190,225,255,0.95)'); q.addColorStop(1,'rgba(120,180,255,0)'); x.fillStyle=q; x.beginPath(); x.arc(0,0,35,0,TAU); x.fill(); x.restore();
      return C; })();
    return (c,t)=>{
      const u=t%P;
      const k=E.inOut(seg(u,0.45,0.95))*(1-E.inOut(seg(u,1.0,2.1)));
      const push=1+0.26*E.in(seg(u,0.3,0.98))*(1-E.inOut(seg(u,1.0,2.45)));
      const cx=ZC[0]*sc, cy=ZC[1]*sc;
      c.globalCompositeOperation='source-over'; c.globalAlpha=1;
      c.setTransform(push,0,0,push,cx*(1-push),cy*(1-push));
      c.drawImage(S,0,0);
      if(k>0.004){
        const Z=1+0.46*k, hx=cx/2, hy=cy/2;
        for(let i=0;i<N;i++){ const z=Math.pow(Z,i/(N*N)); a1.globalAlpha=1/(i+1); a1.setTransform(z*0.5,0,0,z*0.5,hx*(1-z),hy*(1-z)); a1.drawImage(S,0,0); }
        for(let i=0;i<N;i++){ const z=Math.pow(Z,i/N); a2.globalAlpha=1/(i+1); a2.setTransform(z,0,0,z,hx*(1-z),hy*(1-z)); a2.drawImage(T1,0,0); }
        c.globalAlpha=clamp(k*9); c.setTransform(2*push,0,0,2*push,cx*(1-push),cy*(1-push)); c.drawImage(T2,0,0);
      }
      c.setTransform(sc,0,0,sc,0,0); c.globalCompositeOperation='lighter';
      LAMPS.forEach(x=>{ const X=ZC[0]+(x-ZC[0])*push, Y=ZC[1]+(LY-ZC[1])*push, w=70*(0.72+0.8*k); c.globalAlpha=0.42+0.3*k; c.drawImage(FL,X-w/2,Y-w/2,w,w); });
      c.globalCompositeOperation='source-over'; c.globalAlpha=1; c.setTransform(1,0,0,1,0,0);
    };
  }},

{ id:'vhstape', name:'VHS Tape', section:'Stylize', still:1.4, polished:true,
  line:'A home-video sunset with colour bleed, rolling tracking lines and the PLAY overlay.',
  make(px){
    const P=3.2, sc=px/100;
    function frond(c,x0,y0,x1,y1,qx,qy,w){
      const N=16, up=[], low=[], flip=x1-x0<0?-1:1;
      for(let i=0;i<=N;i++){
        const s=i/N, q=1-s, x=q*q*x0+2*q*s*qx+s*s*x1, y=q*q*y0+2*q*s*qy+s*s*y1;
        const dx=2*q*(qx-x0)+2*s*(x1-qx), dy=2*q*(qy-y0)+2*s*(y1-qy), l=Math.hypot(dx,dy)||1;
        const nx=-dy/l*flip, ny=dx/l*flip, env=Math.pow(Math.sin(Math.PI*Math.min(1,s*0.94+0.06)),0.75)*w;
        up.push([x-nx*env*0.4,y-ny*env*0.4]);
        const cut=i%2?1:0.42; low.push([x+nx*env*cut,y+ny*env*cut]);
      }
      c.beginPath(); up.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); low.reverse().forEach(p=>c.lineTo(p[0],p[1])); c.closePath(); c.fill();
    }
    function palm(c,col,bx,by,qx,qy,tx,ty,L){
      c.fillStyle=col; c.beginPath();
      const N=18, a=[], b=[];
      for(let i=0;i<=N;i++){ const s=i/N, q=1-s, x=q*q*bx+2*q*s*qx+s*s*tx, y=q*q*by+2*q*s*qy+s*s*ty, dx=2*q*(qx-bx)+2*s*(tx-qx), dy=2*q*(qy-by)+2*s*(ty-qy), l=Math.hypot(dx,dy)||1, hw=lerp(2.2,1,s)*L/24; a.push([x-dy/l*hw,y+dx/l*hw]); b.push([x+dy/l*hw,y-dx/l*hw]); }
      a.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); b.reverse().forEach(p=>c.lineTo(p[0],p[1])); c.closePath(); c.fill();
      [[-1,0.52,-0.6,-0.26],[-1.04,0.04,-0.52,-0.42],[-0.64,-0.38,-0.26,-0.56],[0.2,-0.56,0.08,-0.5],[0.68,-0.3,0.36,-0.55],[1.02,0.14,0.56,-0.4],[0.82,0.64,0.56,-0.2]].forEach(([ex,ey,qx2,qy2])=>frond(c,tx,ty,tx+ex*L,ty+ey*L,tx+qx2*L,ty+qy2*L,L*0.115));
      c.beginPath(); c.arc(tx,ty,L*0.075,0,TAU); c.fill();
    }
    const [S,s]=canvasOf(px);
    let g=s.createLinearGradient(0,0,0,61); g.addColorStop(0,'#170a42'); g.addColorStop(0.42,'#6a1f80'); g.addColorStop(0.76,'#e4437c'); g.addColorStop(1,'#ff9d4f'); s.fillStyle=g; s.fillRect(0,0,100,61);
    g=s.createRadialGradient(50,54,6,50,54,54); g.addColorStop(0,'rgba(255,190,110,0.75)'); g.addColorStop(1,'rgba(255,120,120,0)'); s.fillStyle=g; s.fillRect(0,0,100,61);
    // the big sun, cut by bands that widen toward the horizon
    const [U,uc]=canvasOf(px);
    g=uc.createLinearGradient(0,26,0,61); g.addColorStop(0,'#fff0a6'); g.addColorStop(0.5,'#ffb84f'); g.addColorStop(1,'#ff4f6e'); uc.fillStyle=g; uc.beginPath(); uc.arc(50,56,30,0,TAU); uc.fill();
    uc.globalCompositeOperation='destination-out'; for(let i=0;i<6;i++) uc.fillRect(0,40+i*3.5+i*i*0.12,100,0.7+i*0.38);
    s.save(); s.setTransform(1,0,0,1,0,0); s.drawImage(U,0,0); s.restore();
    s.fillStyle='#2a0e4f'; s.beginPath(); s.moveTo(0,61); s.lineTo(0,55); s.bezierCurveTo(8,52,14,53,22,58); s.bezierCurveTo(26,60,30,60.6,34,61); s.closePath(); s.fill();
    s.beginPath(); s.moveTo(100,61); s.lineTo(100,54); s.bezierCurveTo(92,51,84,53,76,58); s.bezierCurveTo(72,60,68,60.6,64,61); s.closePath(); s.fill();
    g=s.createLinearGradient(0,61,0,100); g.addColorStop(0,'#4a1c80'); g.addColorStop(1,'#0c0526'); s.fillStyle=g; s.fillRect(0,61,100,39);
    for(let i=0;i<8;i++){ const y=62.5+i*4.1+i*i*0.11, w=54-i*6, p=i/7; s.fillStyle='rgb('+Math.round(lerp(255,214,p))+','+Math.round(lerp(179,63,p))+','+Math.round(lerp(90,134,p))+')'; s.globalAlpha=0.92-p*0.55; s.beginPath(); s.roundRect(50-w/2,y,w,1.1+i*0.16,0.5); s.fill(); }
    s.globalAlpha=1;
    s.fillStyle='#100322'; s.beginPath(); s.moveTo(0,100); s.lineTo(0,84); s.bezierCurveTo(12,81,24,86,34,100); s.closePath(); s.fill();
    s.beginPath(); s.moveTo(100,100); s.lineTo(100,83); s.bezierCurveTo(90,81,78,87,70,100); s.closePath(); s.fill();
    palm(s,'#100322',8,90,4,60,21,32,27);
    palm(s,'#100322',93,88,97,62,81,42,21);
    // bake the colour damage in once: red and blue pulled apart, then the colour smeared sideways over sharp edges
    const tint=col=>{ const C=document.createElement('canvas'); C.width=C.height=px; const x=C.getContext('2d'); x.drawImage(S,0,0); x.globalCompositeOperation='multiply'; x.fillStyle=col; x.fillRect(0,0,px,px); return C; };
    const F=document.createElement('canvas'); F.width=F.height=px; const f=F.getContext('2d'), b=1.15*sc;
    f.fillStyle='#000'; f.fillRect(0,0,px,px); f.globalCompositeOperation='lighter'; f.drawImage(tint('#ff0000'),b,0); f.drawImage(tint('#00ff00'),0,0); f.drawImage(tint('#0000ff'),-b,0);
    const M=document.createElement('canvas'); M.width=M.height=px; const m=M.getContext('2d');
    for(let i=0;i<9;i++){ m.globalAlpha=1/(i+1); m.drawImage(S,(i/8-0.15)*7*sc,0); }
    f.globalCompositeOperation='color'; f.globalAlpha=0.6; f.drawImage(M,0,0); f.globalAlpha=1; f.globalCompositeOperation='source-over';
    // scanlines and a soft vignette, baked
    const L=document.createElement('canvas'); L.width=L.height=px; const l=L.getContext('2d');
    l.fillStyle='rgba(0,0,0,0.13)'; const step=Math.max(1,Math.round(px/200)); for(let y=0;y<px;y+=step*2) l.fillRect(0,y,px,step);
    l.setTransform(sc,0,0,sc,0,0); const vg=l.createRadialGradient(50,50,34,50,50,76); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.5)'); l.fillStyle=vg; l.fillRect(0,0,100,100);
    // the static inside the tracking band
    const BH=Math.round(10*sc), N=document.createElement('canvas'); N.width=px; N.height=BH; const n=N.getContext('2d'), rr=rng(41);
    for(let i=0;i<150;i++){ n.fillStyle='rgba(255,255,255,'+(0.18+rr()*0.6)+')'; const yy=Math.floor(rr()*BH/2)*2; n.fillRect(rr()*px,yy,(1.5+rr()*13)*sc,Math.max(1,sc*0.33)); }
    // the on-screen writing is a real 5x7 dot font, so it never depends on what is installed
    const GL={};
    Object.entries({P:'11110 10001 10001 11110 10000 10000 10000',L:'10000 10000 10000 10000 10000 10000 11111',A:'01110 10001 10001 11111 10001 10001 10001',Y:'10001 10001 01010 00100 00100 00100 00100',S:'01111 10000 10000 01110 00001 00001 11110','0':'01110 10001 10011 10101 11001 10001 01110','1':'00100 01100 00100 00100 00100 00100 01110','2':'01110 10001 00001 00010 00100 01000 11111','3':'11111 00010 00100 00010 00001 10001 01110','4':'00010 00110 01010 10010 11111 00010 00010','5':'11111 10000 11110 00001 00001 10001 01110','6':'00110 01000 10000 11110 10001 10001 01110','7':'11111 00001 00010 00100 01000 01000 01000','8':'01110 10001 10001 01110 10001 10001 01110','9':'01110 10001 10001 01111 00001 00010 01100',':':'00000 00100 00100 00000 00100 00100 00000'}).forEach(([k,v])=>{ GL[k]=v.split(' '); });
    function osd(c,str,x,y,d){ c.beginPath(); let cx=x; for(const ch of str){ const rows=GL[ch]; if(rows) rows.forEach((row,j)=>{ for(let i=0;i<5;i++) if(row[i]==='1') c.rect(cx+i*d,y+j*d,d,d); }); cx+=6*d; } c.fill(); }
    function writing(c,u){
      const secs=3+Math.floor(u), T='0:12:'+String(secs).padStart(2,'0');
      const pass=(dx,dy,col)=>{ c.fillStyle=col; osd(c,'PLAY',7+dx,7+dy,1.55); c.beginPath(); c.moveTo(46.5+dx,7+dy); c.lineTo(56.5+dx,12.4+dy); c.lineTo(46.5+dx,17.8+dy); c.closePath(); c.fill(); osd(c,'SP',7+dx,85+dy,1.02); osd(c,T,27+dx,85+dy,1.02); };
      pass(0.7,0.7,'rgba(0,0,0,0.75)'); pass(0,0,'#f6f6f2');
    }
    return (c,t)=>{
      const u=t%P, ph=TAU*u/P, fr=Math.floor(u*24);
      // the tape hiccups on the loop point, so the counter's reset happens inside the glitch
      const gl=Math.max(1-seg(u,0,0.14),seg(u,P-0.14,P));
      const jump=Math.round(Math.sin(gl*Math.PI)*2.8*sc);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.fillStyle='#050208'; c.fillRect(0,0,px,px);
      const H=Math.max(2,Math.round(px/75)), over=1.8*sc, by=lerp(-14,114,u/P)*sc, cy=by+BH/2;
      for(let y=0;y<px;y+=H){
        let off=sc*(0.5*Math.sin(ph*2+y/sc*0.13)+0.28*Math.sin(ph*5+y/sc*0.4));
        const d=Math.abs(y+H/2-cy)/(BH/2);
        if(d<1) off+=(hash(fr*61+y,3)-0.5)*7*sc*(1-d*d);
        if(y>px*0.955) off+=(hash(fr*17+y,5)+0.4)*3.2*sc;
        c.drawImage(F,over,y,px-2*over,H,off,y+jump,px,H);
      }
      if(by+BH>0&&by<px){ const ox=hash(fr,7)*px; c.fillStyle='rgba(255,255,255,0.08)'; c.fillRect(0,by,px,BH); c.globalAlpha=0.8; c.drawImage(N,ox,by); c.drawImage(N,ox-px,by); c.globalAlpha=1; }
      c.drawImage(L,0,0);
      if(gl<0.35){ c.setTransform(sc,0,0,sc,0,0); writing(c,u); c.setTransform(1,0,0,1,0,0); }
    };
  }},

{ id:'sketch', name:'Pencil Sketch', section:'Drawing / Edge', still:1.25, polished:true,
  line:'A pencil passes over the picture and leaves it drawn in graphite.',
  make(px){
    const P=4.4, sc=px/100;
    const TR={cx:79.5,cy:45.5,R:10.2,N:9};
    // the canopy: one scalloped outline, used by both the colour picture and the sketch
    function canopy(c,jit){
      const pt=i=>{ const a=-Math.PI/2+i*TAU/TR.N; return [TR.cx+Math.cos(a)*TR.R, TR.cy+Math.sin(a)*TR.R*0.92]; };
      c.beginPath(); const p0=pt(0); c.moveTo(p0[0],p0[1]);
      for(let i=1;i<=TR.N;i++){ const a=-Math.PI/2+(i-0.5)*TAU/TR.N, cr=TR.R*1.3, p=pt(i); c.quadraticCurveTo(TR.cx+Math.cos(a)*cr+(jit?jit():0), TR.cy+Math.sin(a)*cr*0.92+(jit?jit():0), p[0], p[1]); }
      c.closePath();
    }
    function colourScene(c){
      let g=c.createLinearGradient(0,0,0,100); g.addColorStop(0,'#8fd3ff'); g.addColorStop(0.7,'#d9f1ff'); g.addColorStop(0.7,'#7bc96f'); g.addColorStop(1,'#4fa65a'); c.fillStyle=g; c.fillRect(0,0,100,100);
      c.fillStyle='#ffd44d'; c.beginPath(); c.arc(80,16,7,0,TAU); c.fill();
      c.fillStyle='#f6ead2'; c.fillRect(24,46,40,28);
      c.fillStyle='#e0533d'; c.beginPath(); c.moveTo(20,47); c.lineTo(44,28); c.lineTo(68,47); c.closePath(); c.fill();
      c.fillStyle='#8a4b33'; c.fillRect(54,30,6,10);
      c.fillStyle='#5a7bd6'; c.fillRect(30,52,10,9); c.fillRect(48,52,10,9);
      c.fillStyle='#7a4a2f'; c.fillRect(40,60,8,14);
      c.fillStyle='#6b4528'; c.beginPath(); c.moveTo(77.8,74); c.lineTo(78.6,55); c.lineTo(80.6,55); c.lineTo(81.4,74); c.closePath(); c.fill();
      c.fillStyle='#3f9a4f'; canopy(c); c.fill();
      c.save(); canopy(c); c.clip(); c.fillStyle='rgba(30,90,45,0.55)'; c.beginPath(); c.arc(TR.cx+5,TR.cy+6,10,0,TAU); c.fill(); c.fillStyle='rgba(255,255,255,0.18)'; c.beginPath(); c.arc(TR.cx-4,TR.cy-5,5,0,TAU); c.fill(); c.restore();
      c.fillStyle='#d8c39a'; c.beginPath(); c.moveTo(40,74); c.lineTo(48,74); c.lineTo(56,100); c.lineTo(30,100); c.closePath(); c.fill();
    }
    function sketchScene(c){
      c.fillStyle='#f3f0e7'; c.fillRect(0,0,100,100);
      const pr=rng(3); for(let i=0;i<500;i++){ c.fillStyle='rgba(120,110,90,'+(pr()*0.06)+')'; c.fillRect(pr()*100,pr()*100,0.4,0.4); }
      const jr=rng(21), jit=()=>(jr()-0.5)*0.7;
      function line(pts,w,a,passes){ w=w||0.55; a=a||0.85; passes=passes||2;
        for(let p=0;p<passes;p++){ c.strokeStyle='rgba(40,40,46,'+a+')'; c.lineWidth=w; c.beginPath();
          pts.forEach(([x,y],i)=>{ const jx=x+(jr()-0.5)*0.9, jy=y+(jr()-0.5)*0.9; if(i) c.lineTo(jx,jy); else c.moveTo(jx,jy); }); c.stroke(); } }
      function hatch(shape,ang,gap,a){ c.save(); c.beginPath(); shape(); c.clip(); c.translate(50,50); c.rotate(ang); c.strokeStyle='rgba(50,50,58,'+a+')'; c.lineWidth=0.35;
        for(let k=-100;k<100;k+=gap){ c.beginPath(); c.moveTo(-100,k+(jr()-0.5)*0.4); c.lineTo(100,k+(jr()-0.5)*0.4); c.stroke(); } c.restore(); }
      line([[0,70],[30,69],[60,71],[100,69]],0.5,0.6);
      c.strokeStyle='rgba(40,40,46,0.7)'; c.lineWidth=0.5; c.beginPath(); c.arc(80,16,7,0,TAU); c.stroke();
      for(let i=0;i<8;i++){ const a=i*TAU/8; line([[80+Math.cos(a)*9,16+Math.sin(a)*9],[80+Math.cos(a)*12,16+Math.sin(a)*12]],0.45,0.6,1); }
      line([[24,46],[64,46],[64,74],[24,74],[24,46]]);
      line([[20,47],[44,28],[68,47],[20,47]]);
      hatch(()=>{ c.moveTo(20,47); c.lineTo(44,28); c.lineTo(68,47); c.closePath(); },0.9,1.6,0.55);
      line([[54,40],[54,30],[60,30],[60,35]]);
      line([[30,52],[40,52],[40,61],[30,61],[30,52]]); line([[48,52],[58,52],[58,61],[48,61],[48,52]]);
      line([[35,52],[35,61]],0.35,0.6,1); line([[53,52],[53,61]],0.35,0.6,1);
      hatch(()=>{ c.rect(40,60,8,14); },-0.8,1.2,0.6);
      line([[40,74],[40,60],[48,60],[48,74]]);
      hatch(()=>{ c.rect(56,46,8,28); },1.2,2.2,0.35);
      // the tree: trunk and two forks first, then the canopy painted over them in paper, then its outline and leaves
      line([[77.8,74],[78.6,55]],0.55,0.85); line([[81.4,74],[80.6,55]],0.55,0.85);
      line([[79.4,60],[75.5,53.5]],0.45,0.75,1); line([[80.2,58.5],[83.8,52.5]],0.45,0.75,1);
      hatch(()=>{ c.moveTo(77.8,74); c.lineTo(78.6,55); c.lineTo(80.6,55); c.lineTo(81.4,74); c.closePath(); },1.4,1.1,0.45);
      c.fillStyle='#f3f0e7'; canopy(c); c.fill();
      for(let p=0;p<2;p++){ c.strokeStyle='rgba(40,40,46,0.85)'; c.lineWidth=0.55; canopy(c,jit); c.stroke(); }
      c.save(); canopy(c); c.clip();
      c.strokeStyle='rgba(45,45,52,0.45)'; c.lineWidth=0.38;
      for(let k=0;k<46;k++){ const a=jr()*TAU, rr=Math.sqrt(jr())*9.5, x=TR.cx+Math.cos(a)*rr, y=TR.cy+Math.sin(a)*rr*0.9; c.beginPath(); c.arc(x,y,1.1+jr()*0.6,Math.PI*0.15,Math.PI*0.95); c.stroke(); }
      c.beginPath(); c.arc(TR.cx+5,TR.cy+6,9.5,0,TAU); c.clip();
      c.translate(TR.cx,TR.cy); c.rotate(0.8); c.strokeStyle='rgba(50,50,58,0.4)'; c.lineWidth=0.32;
      for(let k=-14;k<14;k+=1.25){ c.beginPath(); c.moveTo(-14,k); c.lineTo(14,k); c.stroke(); }
      c.restore();
      line([[40,74],[30,100]],0.45,0.7); line([[48,74],[56,100]],0.45,0.7);
    }
    const [A,a]=canvasOf(px); colourScene(a);
    const [B,b]=canvasOf(px); sketchScene(b);
    function pencil(c,x,y){
      c.save(); c.translate(x,y); c.rotate(0.5);
      c.strokeStyle='#2a2a30'; c.lineWidth=0.6;
      c.fillStyle='#f2c14e'; c.beginPath(); c.rect(-2.2,-26,4.4,20); c.fill(); c.stroke();
      c.fillStyle='#e9d2a8'; c.beginPath(); c.moveTo(-2.2,-6); c.lineTo(2.2,-6); c.lineTo(0,0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle='#2a2a30'; c.beginPath(); c.moveTo(-0.8,-2.2); c.lineTo(0.8,-2.2); c.lineTo(0,0); c.closePath(); c.fill();
      c.fillStyle='#b9bcc6'; c.fillRect(-2.2,-27.6,4.4,1.8);
      c.fillStyle='#ff8fa3'; c.fillRect(-2.2,-31.5,4.4,4);
      c.restore();
    }
    return (c,t)=>{
      const u=t%P;
      const p=E.inOut(seg(u,0.4,2.2)), back=E.inOut(seg(u,3.6,4.3));
      const x=lerp(-12,112,p);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(A,0,0);
      c.save(); c.setTransform(sc,0,0,sc,0,0);
      c.beginPath(); c.moveTo(-20,0); c.lineTo(x+8,0); c.lineTo(x-8,100); c.lineTo(-20,100); c.closePath(); c.clip();
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1-back; c.drawImage(B,0,0); c.globalAlpha=1;
      c.restore();
      c.setTransform(sc,0,0,sc,0,0);
      if(p>0&&p<1){ const yy=50+Math.sin(u*14)*30, xx=x+8-(yy/100)*16; pencil(c,xx,yy); }
    };
  }},

{ id:'shockwave', name:'Shockwave', section:'Warping', still:1.04, polished:true,
  line:'A pulse leaves the centre and pushes the grid outward as it passes.',
  make(px){
    const P=2.5, sc=px/100, CELL=100/7, REL=0.4, END=2.25, MAXR=88;
    const [BG,b]=canvasOf(px);
    let g=b.createRadialGradient(50,50,4,50,50,76); g.addColorStop(0,'#2a1864'); g.addColorStop(0.6,'#140b36'); g.addColorStop(1,'#05030c'); b.fillStyle=g; b.fillRect(0,0,100,100);
    const CS=Math.round(60*sc), core=document.createElement('canvas'); core.width=core.height=CS;
    const cx=core.getContext('2d'); cx.setTransform(sc,0,0,sc,CS/2,CS/2);
    g=cx.createRadialGradient(0,0,0,0,0,30); g.addColorStop(0,'#ffffff'); g.addColorStop(0.09,'#ffffff'); g.addColorStop(0.17,'rgba(170,235,255,0.95)'); g.addColorStop(0.38,'rgba(90,150,255,0.38)'); g.addColorStop(0.7,'rgba(130,80,255,0.1)'); g.addColorStop(1,'rgba(130,80,255,0)');
    cx.fillStyle=g; cx.beginPath(); cx.arc(0,0,30,0,TAU); cx.fill();
    const ax=[], samples=[], nodes=[];
    // lines run through the centre and none lie on the tile's edge, so the grid never reads as a border
    for(let i=-5;i<=5;i++) ax.push(50+i*CELL);
    for(let i=-20;i<=20;i++) samples.push(50+i*CELL/4);
    for(let i=-4;i<=4;i++) for(let j=-4;j<=4;j++){ if(i===0&&j===0) continue; const x=50+i*CELL, y=50+j*CELL; nodes.push([x,y,Math.hypot(x-50,y-50)]); }
    return (c,t)=>{
      const u=t%P;
      const w=seg(u,REL,END), R=2+MAXR*(1-Math.pow(1-w,1.25)), sig=5+7*w;
      const ramp=seg(w,0,0.07), alive=w>0&&w<1;
      const amp=alive?11*ramp*Math.pow(1-w,0.55):0;
      const env=alive?ramp*Math.pow(1-w,0.42)*(1-0.68*seg(R,56,78)):0;
      const pinch=E.inOut(seg(u,0.05,REL))*(1-seg(u,REL,REL+0.12));
      // displacement: a push at the ring, a small snap back just behind it, and a breath in before release
      const wv=(x,y)=>{
        const dx=x-50, dy=y-50, d=Math.hypot(dx,dy)||1e-3; let p=0;
        if(amp>0){ const a=(d-R)/sig, e=(d-R+1.8*sig)/(1.3*sig); p=amp*(Math.exp(-a*a)-0.42*Math.exp(-e*e)); }
        if(pinch>0){ const q=d/26; p-=pinch*2.6*Math.exp(-q*q); }
        return [x+dx/d*p,y+dy/d*p];
      };
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      c.lineCap='round'; c.lineJoin='round';
      const grid=new Path2D();
      for(const v of ax){
        samples.forEach((s,i)=>{ const q=wv(s,v); if(i) grid.lineTo(q[0],q[1]); else grid.moveTo(q[0],q[1]); });
        samples.forEach((s,i)=>{ const q=wv(v,s); if(i) grid.lineTo(q[0],q[1]); else grid.moveTo(q[0],q[1]); });
      }
      const dots=new Path2D();
      for(const [x,y,d] of nodes){ const q=wv(x,y), a=(d-R)/sig, bump=alive?Math.exp(-a*a):0, r=1.25+bump*1.5*ramp; dots.moveTo(q[0]+r,q[1]); dots.arc(q[0],q[1],r,0,TAU); }
      const col=c.createRadialGradient(50,50,0,50,50,74); col.addColorStop(0,'#42eaff'); col.addColorStop(0.4,'#5f9dff'); col.addColorStop(0.72,'#9c6cff'); col.addColorStop(1,'#ff5cd0');
      c.globalAlpha=0.72; c.strokeStyle=col; c.lineWidth=0.72; c.stroke(grid);
      c.globalAlpha=1; c.fillStyle=col; c.fill(dots);
      if(env>0.005){
        c.globalCompositeOperation='lighter';
        // the body of the wave: a soft annulus, brightest at the crest
        const r0=Math.max(0,R-18), r1=R+9, span=r1-r0, at=(R-r0)/span;
        const halo=c.createRadialGradient(50,50,r0,50,50,r1);
        halo.addColorStop(0,'rgba(90,120,255,0)'); halo.addColorStop(at*0.7,'rgba(100,140,255,'+(0.16*env)+')'); halo.addColorStop(at,'rgba(190,230,255,'+(0.5*env)+')'); halo.addColorStop(1,'rgba(120,150,255,0)');
        c.fillStyle=halo; c.fillRect(0,0,100,100);
        // the grid catches the light only where the crest is passing
        const c0=Math.max(0,R-sig*1.9), c1=R+sig*1.5, crest=c.createRadialGradient(50,50,c0,50,50,c1), mid=(R-c0)/(c1-c0);
        crest.addColorStop(0,'rgba(255,255,255,0)'); crest.addColorStop(mid,'rgba(255,255,255,'+(0.95*env)+')'); crest.addColorStop(1,'rgba(255,255,255,0)');
        c.strokeStyle=crest; c.lineWidth=2.4; c.globalAlpha=0.28; c.stroke(grid);
        c.lineWidth=0.95; c.globalAlpha=0.8; c.stroke(grid);
        c.globalAlpha=0.85; c.fillStyle=crest; c.fill(dots);
        // the leading edge splits slightly into red, green and blue, as a lens would
        [['#ff3a6a',-0.85],['#3affa0',0],['#4a7cff',0.85]].forEach(([col2,dr])=>{ c.strokeStyle=col2; c.globalAlpha=0.75*env; c.lineWidth=1.05; c.beginPath(); c.arc(50,50,Math.max(0.5,R+dr),0,TAU); c.stroke(); });
        c.globalAlpha=1; c.globalCompositeOperation='source-over';
      }
      // the core gathers, fires and slowly rebuilds to where it began
      const S=u<REL?lerp(0.55,1.2,E.in(seg(u,0,REL))):(u<REL+0.24?lerp(1.2,0.22,E.out(seg(u,REL,REL+0.24))):lerp(0.22,0.55,E.inOut(seg(u,REL+0.24,P))));
      c.globalCompositeOperation='lighter'; const W=60*S; c.drawImage(core,50-W/2,50-W/2,W,W);
      const fl=u>REL?1-seg(u,REL,REL+0.34):0;
      if(fl>0){ const f=c.createRadialGradient(50,50,0,50,50,70); f.addColorStop(0,'rgba(220,240,255,'+(0.75*fl*fl)+')'); f.addColorStop(1,'rgba(150,180,255,0)'); c.fillStyle=f; c.fillRect(0,0,100,100); }
      c.globalCompositeOperation='source-over'; c.globalAlpha=1; c.setTransform(1,0,0,1,0,0);
    };
  }},

{ id:'shake', name:'Shake', section:'Shakes / Movement', still:1.0, polished:true,
  line:'The alarm goes off and the clock shakes hard, then settles.',
  make(px){
    const P=2.8, sc=px/100;
    function clock(c,t,ring){
      c.strokeStyle='#2a2f3d'; c.lineWidth=3; c.lineCap='round';
      c.beginPath(); c.moveTo(-16,24); c.lineTo(-22,33); c.moveTo(16,24); c.lineTo(22,33); c.stroke();
      const bell=(x,rot)=>{ c.save(); c.translate(x,-25); c.rotate(rot); const g=c.createLinearGradient(-9,-7,9,7); g.addColorStop(0,'#ffe08a'); g.addColorStop(1,'#e0a420'); c.fillStyle=g; c.beginPath(); c.arc(0,0,9,Math.PI,TAU); c.closePath(); c.fill(); c.fillStyle='#c98a12'; c.fillRect(-9.5,-0.6,19,2.2); c.restore(); };
      bell(-15,-0.55); bell(15,0.55);
      const hx=ring?Math.sin(t*90)*3.5:0;
      c.strokeStyle='#2a2f3d'; c.lineWidth=1.6; c.beginPath(); c.moveTo(0,-24); c.lineTo(hx,-33); c.stroke();
      c.fillStyle='#2a2f3d'; c.beginPath(); c.arc(hx,-34,2.2,0,TAU); c.fill();
      c.strokeStyle='#d64550'; c.lineWidth=2.4; c.beginPath(); c.arc(0,-25,7,Math.PI*1.15,Math.PI*1.85); c.stroke();
      const g=c.createLinearGradient(-26,-26,26,26); g.addColorStop(0,'#ff6b6b'); g.addColorStop(1,'#d63447'); c.fillStyle=g; c.beginPath(); c.arc(0,0,27,0,TAU); c.fill();
      c.strokeStyle='rgba(255,255,255,0.4)'; c.lineWidth=2.2; c.beginPath(); c.arc(0,0,24.3,Math.PI*1.1,Math.PI*1.45); c.stroke();
      c.fillStyle='#fffaf0'; c.beginPath(); c.arc(0,0,21.5,0,TAU); c.fill();
      c.strokeStyle='#2a2f3d'; c.lineCap='round';
      for(let i=0;i<12;i++){ const a=i*TAU/12, r0=i%3===0?16.2:17.8, r1=19.5; c.lineWidth=i%3===0?1.6:0.9; c.beginPath(); c.moveTo(Math.cos(a)*r0,Math.sin(a)*r0); c.lineTo(Math.cos(a)*r1,Math.sin(a)*r1); c.stroke(); }
      const hr=-Math.PI/2+7/12*TAU, mn=-Math.PI/2;
      c.lineWidth=2.4; c.beginPath(); c.moveTo(0,0); c.lineTo(Math.cos(hr)*10,Math.sin(hr)*10); c.stroke();
      c.lineWidth=1.6; c.beginPath(); c.moveTo(0,0); c.lineTo(Math.cos(mn)*15,Math.sin(mn)*15); c.stroke();
      const sa=-Math.PI/2+Math.floor(t*2)*TAU/60;
      c.strokeStyle='#e63946'; c.lineWidth=0.7; c.beginPath(); c.moveTo(-Math.cos(sa)*3,-Math.sin(sa)*3); c.lineTo(Math.cos(sa)*17,Math.sin(sa)*17); c.stroke();
      c.fillStyle='#2a2f3d'; c.beginPath(); c.arc(0,0,1.7,0,TAU); c.fill();
    }
    return (c,t)=>{
      const u=t%P;
      const env=E.out(seg(u,0.35,0.55))*(1-E.inOut(seg(u,1.7,2.15)));
      const ring=env>0.05, A=env*4.2;
      const ox=A*vnoise(u*30,1), oy=A*0.6*vnoise(u*30,2), rot=env*0.11*vnoise(u*26,3);
      c.setTransform(sc,0,0,sc,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      const g=c.createRadialGradient(50,45,8,50,50,72); g.addColorStop(0,'#24345a'); g.addColorStop(1,'#0c1222'); c.fillStyle=g; c.fillRect(0,0,100,100);
      c.fillStyle='#3a2a1f'; c.fillRect(0,86,100,14); c.fillStyle='#4a3628'; c.fillRect(0,86,100,1.6);
      c.fillStyle='rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(50+ox*0.5,87.5,26-env*2,3,0,0,TAU); c.fill();
      const draw=(dx,dy,dr,a)=>{ c.save(); c.globalAlpha=a; c.translate(50+dx,53+dy); c.rotate(dr); clock(c,t,ring); c.restore(); };
      if(env>0.2){ draw(-ox*0.8,-oy*0.8,-rot*0.8,0.22); draw(ox*1.6,oy*1.2,rot*1.4,0.18); }
      draw(ox,oy,rot,1);
      if(ring){
        c.strokeStyle='rgb(255,230,140)'; c.lineWidth=1.6; c.lineCap='round';
        const ph=(u*6)%1;
        [-1,1].forEach(s=>{ for(let k=0;k<2;k++){ const f=(ph+k*0.5)%1, rr=8+f*10; c.globalAlpha=env*(1-f)*0.9; c.beginPath(); c.arc(50+s*15+ox,28+oy,rr,s<0?Math.PI*1.05:-Math.PI*0.45,s<0?Math.PI*1.45:-Math.PI*0.05); c.stroke(); } });
        c.globalAlpha=1;
      }
    };
  }},

{ id:'timeecho', name:'Time Echo', section:'Repetition', still:0.84, polished:true,
  line:'A bouncing ball leaves a trail of its own earlier positions.',
  make(px){
    const P=3.2, sc=px/100, R=14.5, FLOOR=87, K=7, GAP=0.078, HOP=42, BOUNCES=4;
    const SU=2*R+3, SP=Math.ceil(SU*sc);
    const mk=()=>{ const C=document.createElement('canvas'); C.width=C.height=SP; const x=C.getContext('2d'); x.setTransform(SP/SU,0,0,SP/SU,SP/2,SP/2); return [C,x]; };
    const cols=['#ff4d63','#ffd23f','#2fb4ff','#ffffff','#54d68a','#a67cff'];
    // the ball's panels: six curved gores meeting at a pole set off-centre, so it reads as a sphere
    function panels(x){
      x.save(); x.beginPath(); x.arc(0,0,R,0,TAU); x.clip();
      x.fillStyle='#fff'; x.fillRect(-R-1,-R-1,2*R+2,2*R+2);
      const p0=-0.16*R, p1=-0.2*R, rim=a=>[Math.cos(a)*(R+0.6),Math.sin(a)*(R+0.6)];
      const ctrl=a=>{ const [rx,ry]=rim(a), mx=(p0+rx)/2, my=(p1+ry)/2, nx=-(ry-p1), ny=rx-p0, l=Math.hypot(nx,ny); return [mx+nx/l*R*0.13,my+ny/l*R*0.13]; };
      for(let i=0;i<6;i++){
        const a0=0.35+i*TAU/6, a1=a0+TAU/6, [cx0,cy0]=ctrl(a0), [rx0,ry0]=rim(a0), [cx1,cy1]=ctrl(a1);
        x.fillStyle=cols[i]; x.beginPath(); x.moveTo(p0,p1); x.quadraticCurveTo(cx0,cy0,rx0,ry0); x.arc(0,0,R+0.6,a0,a1); x.quadraticCurveTo(cx1,cy1,p0,p1); x.closePath(); x.fill();
      }
      x.fillStyle='#fff'; x.beginPath(); x.arc(p0,p1,R*0.14,0,TAU); x.fill();
      x.restore();
    }
    const WALL='#2a2268';
    const [Main,mx]=mk(); panels(mx);
    // each echo is the same ball faded toward the wall colour, opaque so the stack stays crisp
    const ghosts=[]; for(let k=1;k<=K;k++){ const [C,x]=mk(); panels(x); x.globalCompositeOperation='source-atop'; x.fillStyle=WALL; x.globalAlpha=0.36+k*0.086; x.fillRect(-SU,-SU,2*SU,2*SU); x.globalAlpha=1; x.globalCompositeOperation='source-over'; x.strokeStyle='rgba(255,255,255,'+(0.3-k*0.025)+')'; x.lineWidth=0.5; x.beginPath(); x.arc(0,0,R-0.3,0,TAU); x.stroke(); ghosts.push(C); }
    const [Sh,sh]=mk();
    let g=sh.createRadialGradient(-R*0.34,-R*0.4,R*0.15,-R*0.1,-R*0.1,R*1.28); g.addColorStop(0,'rgba(20,10,70,0)'); g.addColorStop(0.55,'rgba(20,10,70,0.06)'); g.addColorStop(1,'rgba(20,10,70,0.62)'); sh.fillStyle=g; sh.beginPath(); sh.arc(0,0,R,0,TAU); sh.fill();
    g=sh.createRadialGradient(-R*0.42,-R*0.5,0,-R*0.42,-R*0.5,R*0.52); g.addColorStop(0,'rgba(255,255,255,0.8)'); g.addColorStop(1,'rgba(255,255,255,0)'); sh.fillStyle=g; sh.beginPath(); sh.arc(0,0,R,0,TAU); sh.fill();
    const [BG,b]=canvasOf(px);
    g=b.createLinearGradient(0,0,0,FLOOR); g.addColorStop(0,'#1a1656'); g.addColorStop(1,'#3a2a86'); b.fillStyle=g; b.fillRect(0,0,100,FLOOR);
    g=b.createRadialGradient(50,44,4,50,44,60); g.addColorStop(0,'rgba(120,110,255,0.34)'); g.addColorStop(1,'rgba(120,110,255,0)'); b.fillStyle=g; b.fillRect(0,0,100,FLOOR);
    g=b.createLinearGradient(0,FLOOR-30,0,FLOOR); g.addColorStop(0,'rgba(255,110,170,0)'); g.addColorStop(1,'rgba(255,110,170,0.22)'); b.fillStyle=g; b.fillRect(0,FLOOR-30,100,30);
    g=b.createLinearGradient(0,FLOOR,0,100); g.addColorStop(0,'#3e2d8e'); g.addColorStop(1,'#1a1250'); b.fillStyle=g; b.fillRect(0,FLOOR,100,13);
    b.fillStyle='rgba(255,255,255,0.3)'; b.fillRect(0,FLOOR,100,0.45);
    // the whole path is periodic, so every echo is always defined and the loop has no seam
    const st=uu=>{
      const v=((uu%P)+P)%P, x=50-27*Math.cos(TAU*v/P), ph=v/P*BOUNCES, f=ph-Math.floor(ph), h=HOP*4*f*(1-f);
      const d=Math.min(f,1-f), sq=1-seg(d,0,0.055), st2=(1-sq)*Math.abs(1-2*f)*0.09;
      const sy=1+st2-0.15*sq, sx=1-st2*0.6+0.11*sq;
      return {x,y:FLOOR-R*sy-h,sx,sy,rot:(x-50)/R,h};
    };
    const put=(c,s,img,shade)=>{ c.save(); c.translate(s.x,s.y); c.scale(s.sx,s.sy); c.save(); c.rotate(s.rot); c.drawImage(img,-SU/2,-SU/2,SU,SU); c.restore(); if(shade>0){ const a=c.globalAlpha; c.globalAlpha=a*shade; c.drawImage(Sh,-SU/2,-SU/2,SU,SU); c.globalAlpha=a; } c.restore(); };
    return (c,t)=>{
      const u=t%P;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      const m=st(u), hN=clamp(m.h/HOP);
      c.fillStyle='rgba(6,3,30,'+(0.5*(1-0.65*hN))+')'; c.beginPath(); c.ellipse(m.x,FLOOR+2.6,R*(1.08-0.45*hN),2.4*(1-0.3*hN),0,0,TAU); c.fill();
      for(let k=K;k>=1;k--){ c.globalAlpha=k>=K-1?0.62:1; put(c,st(u-k*GAP),ghosts[k-1],0.75*(1-k/(K+1))); }
      // the real ball last, with its reflection in the polished floor
      c.save(); c.beginPath(); c.rect(0,FLOOR+0.45,100,13); c.clip(); c.globalAlpha=0.3*(1-0.8*hN); c.translate(0,2*FLOOR); c.scale(1,-1); put(c,m,Main,1); c.restore();
      c.globalAlpha=1; put(c,m,Main,1);
      c.setTransform(1,0,0,1,0,0);
    };
  }},

{ id:'bolts', name:'Bolts', section:'Generative', still:0.3, polished:true,
  line:'Lightning finds a new path every strike and lights up the storm.',
  make(px){
    const P=1.8, sc=px/100;
    const [C,cc]=canvasOf(px);
    let g=cc.createLinearGradient(0,0,0,100); g.addColorStop(0,'#0b0f1e'); g.addColorStop(0.75,'#1a2238'); g.addColorStop(0.75,'#0a0c14'); g.addColorStop(1,'#05060a'); cc.fillStyle=g; cc.fillRect(0,0,100,100);
    const r=rng(5);
    for(let i=0;i<26;i++){ const x=r()*110-5, y=r()*26, rx=10+r()*18, ry=5+r()*7; const gg=cc.createRadialGradient(x,y,0,x,y,rx); gg.addColorStop(0,'rgba(70,82,120,0.55)'); gg.addColorStop(1,'rgba(70,82,120,0)'); cc.fillStyle=gg; cc.beginPath(); cc.ellipse(x,y,rx,ry,0,0,TAU); cc.fill(); }
    // the skyline: buildings first, then each building's own windows on a grid inside it
    const rr=rng(9), blds=[]; let bx=0;
    while(bx<100){ const w=4.2+rr()*6.5, h=6+rr()*15; blds.push([bx,75-h,w,h]); bx+=w+0.7; }
    cc.fillStyle='#04050a'; for(const [x,y,w,h] of blds) cc.fillRect(x,y,w,h+1);
    for(const [x,y,w,h] of blds){
      const cols=Math.max(1,Math.floor((w-1.6)/1.6)+1), rows=Math.max(1,Math.floor((h-3)/2.2)+1);
      for(let i=0;i<cols;i++) for(let j=0;j<rows;j++){
        if(rr()>0.4) continue;
        cc.fillStyle=rr()<0.82?'rgba(255,205,120,0.78)':'rgba(170,210,255,0.62)';
        cc.fillRect(x+0.8+i*1.6, y+1.4+j*2.2, 0.75, 0.9);
      }
    }
    function bolt(seed){
      const R=rng(seed);
      function build(ax,ay,ex,ey,disp,depth,list){ if(depth===0){ list.push([ax,ay,ex,ey]); return; } const mx=(ax+ex)/2+(R()-0.5)*disp, my=(ay+ey)/2+(R()-0.5)*disp*0.3; build(ax,ay,mx,my,disp/2,depth-1,list); build(mx,my,ex,ey,disp/2,depth-1,list); }
      const x0=20+R()*60, x1=x0+(R()-0.5)*30, main=[]; build(x0,0,x1,66,26,6,main);
      const branches=[]; for(let i=0;i<3;i++){ const s=main[Math.floor(R()*main.length*0.7)], lst=[]; build(s[2],s[3],s[2]+(R()-0.5)*40,s[3]+12+R()*20,12,4,lst); branches.push(lst); }
      return {main,branches};
    }
    return (c,t)=>{
      const k=Math.floor(t/P), u=t%P, b=bolt(k*7+3);
      const lead=seg(u,0.1,0.22);
      const flick=(u>0.22&&u<0.62)?(0.6+0.4*Math.abs(Math.sin(u*70))):0;
      const life=(u>=0.22&&u<0.62)?1-seg(u,0.22,0.62):0;
      const flash=u>0.22?Math.max(0,1-seg(u,0.22,0.5))*flick:0;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(C,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      if(flash>0){ c.fillStyle='rgba(170,190,255,'+(0.35*flash)+')'; c.fillRect(0,0,100,100); }
      c.lineCap='round'; c.lineJoin='round';
      const drawList=(lst,upto,w,a)=>{ const n=Math.floor(lst.length*upto); if(n<1) return; c.globalAlpha=a; c.lineWidth=w; c.beginPath(); c.moveTo(lst[0][0],lst[0][1]); for(let i=0;i<n;i++) c.lineTo(lst[i][2],lst[i][3]); c.stroke(); };
      const vis=u<0.22?lead:1, A=u<0.22?(u>=0.1?0.9:0):life*flick;
      if(A>0.01){
        c.strokeStyle='rgb(140,170,255)'; drawList(b.main,vis,3.2,0.25*A); b.branches.forEach(l=>drawList(l,vis,1.8,0.18*A));
        c.strokeStyle='#ffffff'; drawList(b.main,vis,1.0,A); b.branches.forEach(l=>drawList(l,vis,0.5,0.8*A));
        c.globalAlpha=1;
        if(u>=0.22){ const e=b.main[b.main.length-1], gg=c.createRadialGradient(e[2],e[3],0,e[2],e[3],14); gg.addColorStop(0,'rgba(190,210,255,'+(0.6*A)+')'); gg.addColorStop(1,'rgba(190,210,255,0)'); c.fillStyle=gg; c.beginPath(); c.arc(e[2],e[3],14,0,TAU); c.fill(); }
      }
      c.globalAlpha=1;
    };
  }},

{ id:'cube', name:'Cube', section:'3D', still:2.5, polished:true,
  line:'Your picture wrapped round a cube that turns in space.',
  make(px){
    const P=5, sc=px/100, TS=300;
    const art=[
      x=>{ let g=x.createLinearGradient(0,0,0,62); g.addColorStop(0,'#1a6a84'); g.addColorStop(0.62,'#ee8460'); g.addColorStop(1,'#ffbb6a'); x.fillStyle=g; x.fillRect(0,0,100,62);
        g=x.createRadialGradient(50,60,2,50,60,46); g.addColorStop(0,'rgba(255,200,120,0.85)'); g.addColorStop(1,'rgba(255,160,90,0)'); x.fillStyle=g; x.fillRect(0,0,100,62);
        g=x.createLinearGradient(0,40,0,62); g.addColorStop(0,'#fff4cc'); g.addColorStop(1,'#ffc46a'); x.fillStyle=g; x.beginPath(); x.arc(50,62,21,Math.PI,TAU); x.closePath(); x.fill();
        g=x.createLinearGradient(0,62,0,100); g.addColorStop(0,'#1a8c9c'); g.addColorStop(1,'#0b4452'); x.fillStyle=g; x.fillRect(0,62,100,38);
        x.fillStyle='#ffc27a'; for(let i=0;i<6;i++){ const w=38-i*5.4; x.globalAlpha=0.92-i*0.12; x.beginPath(); x.roundRect(50-w/2,65+i*5.6,w,2.2,1); x.fill(); } x.globalAlpha=1; },
      x=>{ let g=x.createLinearGradient(0,0,0,100); g.addColorStop(0,'#3f9bf0'); g.addColorStop(0.7,'#cfeeff'); x.fillStyle=g; x.fillRect(0,0,100,100);
        x.fillStyle='#fff6d8'; x.beginPath(); x.arc(76,22,10,0,TAU); x.fill();
        x.fillStyle='#8fb2dc'; x.beginPath(); x.moveTo(0,70); x.lineTo(20,48); x.lineTo(36,62); x.lineTo(56,40); x.lineTo(78,60); x.lineTo(100,46); x.lineTo(100,100); x.lineTo(0,100); x.closePath(); x.fill();
        x.fillStyle='#4a6fa8'; x.beginPath(); x.moveTo(0,88); x.lineTo(32,32); x.lineTo(56,72); x.lineTo(72,52); x.lineTo(100,88); x.lineTo(100,100); x.lineTo(0,100); x.closePath(); x.fill();
        x.fillStyle='#ffffff'; x.beginPath(); x.moveTo(32,32); x.lineTo(43.5,51.5); x.lineTo(37,48); x.lineTo(32,53); x.lineTo(27,48); x.lineTo(21.5,50.4); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(72,52); x.lineTo(80,62.4); x.lineTo(74,60); x.lineTo(70,64); x.lineTo(65.4,60); x.closePath(); x.fill();
        x.fillStyle='#233f6e'; x.beginPath(); x.moveTo(0,100); x.lineTo(0,90); x.bezierCurveTo(26,78,60,94,100,84); x.lineTo(100,100); x.closePath(); x.fill(); },
      x=>{ ['#ff4f64','#ff9a3d','#ffd43b','#4fd17e','#3fa8ff','#8f6bff'].forEach((col,k)=>{ const g=x.createLinearGradient(0,k*100/6,0,(k+1)*100/6); g.addColorStop(0,col); g.addColorStop(1,col); x.fillStyle=g; x.fillRect(0,k*100/6,100,100/6+0.6); });
        const s=x.createLinearGradient(0,0,100,100); s.addColorStop(0,'rgba(255,255,255,0.26)'); s.addColorStop(0.5,'rgba(255,255,255,0)'); s.addColorStop(1,'rgba(40,20,90,0.22)'); x.fillStyle=s; x.fillRect(0,0,100,100); },
      x=>{ let g=x.createLinearGradient(0,0,100,100); g.addColorStop(0,'#ff5a35'); g.addColorStop(1,'#ffcf4a'); x.fillStyle=g; x.fillRect(0,0,100,100);
        x.strokeStyle='rgba(255,255,255,0.9)'; x.lineWidth=5; x.beginPath(); x.arc(50,50,36,0,TAU); x.stroke();
        x.fillStyle='rgba(140,40,0,0.3)'; x.lineJoin='round'; x.strokeStyle='rgba(140,40,0,0.3)'; x.lineWidth=7; x.beginPath(); x.moveTo(42.5,36); x.lineTo(68,52); x.lineTo(42.5,68); x.closePath(); x.fill(); x.stroke();
        x.fillStyle='#fff'; x.strokeStyle='#fff'; x.beginPath(); x.moveTo(41,34); x.lineTo(66.5,50); x.lineTo(41,66); x.closePath(); x.fill(); x.stroke(); },
      x=>{ let g=x.createLinearGradient(0,0,100,100); g.addColorStop(0,'#14c8b4'); g.addColorStop(1,'#0a8795'); x.fillStyle=g; x.fillRect(0,0,100,100); x.fillStyle='#e8fffa';
        for(let b=-1;b<=5;b++) for(let a=-1;a<=5;a++){ x.beginPath(); x.arc(10+a*20+(b%2?10:0),10+b*20,6.2,0,TAU); x.fill(); } },
      x=>{ for(let a=0;a<5;a++) for(let b=0;b<5;b++){ x.fillStyle=(a+b)%2?'#ff5fa2':'#7c4dff'; x.fillRect(a*20,b*20,20.5,20.5); } }
    ];
    const tex=art.map(fn=>{ const C=document.createElement('canvas'); C.width=C.height=TS; const x=C.getContext('2d'); x.setTransform(TS/100,0,0,TS/100,0,0); fn(x); return C; });
    const [BG,b]=canvasOf(px);
    let g=b.createRadialGradient(50,44,4,50,50,78); g.addColorStop(0,'#33497f'); g.addColorStop(0.55,'#141c36'); g.addColorStop(1,'#070a14'); b.fillStyle=g; b.fillRect(0,0,100,100);
    const SW=Math.round(80*sc), SHH=Math.round(18*sc), SH=document.createElement('canvas'); SH.width=SW; SH.height=SHH; const sx=SH.getContext('2d'); sx.setTransform(SW/2,0,0,SHH/2,SW/2,SHH/2);
    g=sx.createRadialGradient(0,0,0,0,0,1); g.addColorStop(0,'rgba(0,0,8,0.8)'); g.addColorStop(0.55,'rgba(0,0,8,0.4)'); g.addColorStop(1,'rgba(0,0,8,0)'); sx.fillStyle=g; sx.beginPath(); sx.arc(0,0,1,0,TAU); sx.fill();
    const V=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    const F=[[0,1,2,3,[0,0,-1]],[5,4,7,6,[0,0,1]],[4,0,3,7,[-1,0,0]],[1,5,6,2,[1,0,0]],[4,5,1,0,[0,-1,0]],[3,2,6,7,[0,1,0]]];
    const norm=v=>{ const l=Math.hypot(v[0],v[1],v[2]); return [v[0]/l,v[1]/l,v[2]/l]; };
    const dot=(a,d)=>a[0]*d[0]+a[1]*d[1]+a[2]*d[2];
    const toLight=norm([-0.45,-0.75,-0.5]), half=norm([toLight[0],toLight[1],toLight[2]-1]);
    function rot(p,ry,rx){ let c=Math.cos(ry), s=Math.sin(ry); const x1=c*p[0]+s*p[2], z1=-s*p[0]+c*p[2]; c=Math.cos(rx); s=Math.sin(rx); return [x1, c*p[1]-s*z1, s*p[1]+c*z1]; }
    function tri(c,img,p0,p1,p2,t0,t1,t2){
      const cx=(p0[0]+p1[0]+p2[0])/3, cy=(p0[1]+p1[1]+p2[1])/3;
      const ex=p=>{ const dx=p[0]-cx, dy=p[1]-cy, l=Math.hypot(dx,dy)||1; return [p[0]+dx/l*0.9, p[1]+dy/l*0.9]; };
      const q0=ex(p0), q1=ex(p1), q2=ex(p2);
      const du1=t1[0]-t0[0], dv1=t1[1]-t0[1], du2=t2[0]-t0[0], dv2=t2[1]-t0[1];
      const dx1=p1[0]-p0[0], dy1=p1[1]-p0[1], dx2=p2[0]-p0[0], dy2=p2[1]-p0[1];
      const det=du1*dv2-du2*dv1; if(Math.abs(det)<1e-9) return;
      const a=(dx1*dv2-dx2*dv1)/det, cc=(dx2*du1-dx1*du2)/det, bb=(dy1*dv2-dy2*dv1)/det, d=(dy2*du1-dy1*du2)/det;
      const e=p0[0]-a*t0[0]-cc*t0[1], f=p0[1]-bb*t0[0]-d*t0[1];
      c.save(); c.setTransform(1,0,0,1,0,0); c.beginPath(); c.moveTo(q0[0],q0[1]); c.lineTo(q1[0],q1[1]); c.lineTo(q2[0],q2[1]); c.closePath(); c.clip();
      c.setTransform(a,bb,cc,d,e,f); c.drawImage(img,0,0); c.restore();
    }
    return (c,t)=>{
      const u=t%P, a=TAU*u/P;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      // one full, gently hesitating turn per loop: it lingers as each picture comes round
      const ry=0.5+a+0.13*Math.sin(4*a+0.6), rx=0.42+0.045*Math.sin(a), D=4.6, f=112, Y0=41+1.1*Math.sin(2*a);
      c.setTransform(sc,0,0,sc,0,0);
      const spread=0.8+0.35*(Math.abs(Math.cos(ry))+Math.abs(Math.sin(ry))-1)/0.414, w=78*spread;
      c.drawImage(SH,50-w/2,85.6,w,14);
      c.setTransform(1,0,0,1,0,0);
      const P3=V.map(v=>rot(v,ry,rx));
      const proj=p=>[(50+p[0]*f/(p[2]+D))*sc,(Y0+p[1]*f/(p[2]+D))*sc];
      for(let fi=0;fi<6;fi++){
        const [ia,ib,ic,id,n]=F[fi], nr=rot(n,ry,rx);
        const ctr=[(P3[ia][0]+P3[ic][0])/2,(P3[ia][1]+P3[ic][1])/2,(P3[ia][2]+P3[ic][2])/2+D];
        if(dot(nr,ctr)>=0) continue;
        const cor=[P3[ia],P3[ib],P3[ic],P3[id]];
        const bil=(s,v)=>{ const top=[0,1,2].map(k=>lerp(cor[0][k],cor[1][k],s)), bot=[0,1,2].map(k=>lerp(cor[3][k],cor[2][k],s)); return [0,1,2].map(k=>lerp(top[k],bot[k],v)); };
        const N=3;
        for(let i=0;i<N;i++) for(let j=0;j<N;j++){
          const s0=i/N, s1=(i+1)/N, v0=j/N, v1=(j+1)/N;
          const A=proj(bil(s0,v0)), B=proj(bil(s1,v0)), Cc=proj(bil(s1,v1)), Dd=proj(bil(s0,v1));
          const tA=[s0*TS,v0*TS], tB=[s1*TS,v0*TS], tC=[s1*TS,v1*TS], tD=[s0*TS,v1*TS];
          tri(c,tex[fi],A,B,Cc,tA,tB,tC); tri(c,tex[fi],A,Cc,Dd,tA,tC,tD);
        }
        const lum=Math.max(0,dot(nr,toLight)), q=cor.map(proj);
        c.setTransform(1,0,0,1,0,0);
        const outline=()=>{ c.beginPath(); c.moveTo(q[0][0],q[0][1]); for(let k=1;k<4;k++) c.lineTo(q[k][0],q[k][1]); c.closePath(); };
        let hi=q[0], lo=q[0]; q.forEach(p=>{ if(p[1]<hi[1]) hi=p; if(p[1]>lo[1]) lo=p; });
        const shade=c.createLinearGradient(hi[0],hi[1],lo[0],lo[1]), dark=0.34*(1-lum);
        shade.addColorStop(0,'rgba(6,8,30,'+(dark*0.3)+')'); shade.addColorStop(1,'rgba(6,8,30,'+(dark+0.14)+')');
        outline(); c.fillStyle=shade; c.fill();
        const spec=Math.pow(Math.max(0,dot(nr,half)),16);
        c.globalCompositeOperation='lighter';
        if(spec>0.01){ outline(); c.fillStyle='rgba(255,250,235,'+(0.3*spec)+')'; c.fill(); }
        if(fi<4){ // a glossy band that slides across each side as it turns
          const m=0.5-nr[0]*1.25;
          c.save(); outline(); c.clip();
          [[0.17,0.05],[0.12,0.05],[0.07,0.05]].forEach(([hw,al])=>{ const B=[[m-hw+0.24,0],[m+hw+0.24,0],[m+hw-0.24,1],[m-hw-0.24,1]].map(([s,v])=>proj(bil(s,v))); c.beginPath(); c.moveTo(B[0][0],B[0][1]); for(let k=1;k<4;k++) c.lineTo(B[k][0],B[k][1]); c.closePath(); c.fillStyle='rgba(255,255,255,'+al+')'; c.fill(); });
          c.restore();
        }
        c.globalCompositeOperation='source-over';
        outline(); c.strokeStyle='rgba(255,255,255,'+(0.14+0.55*lum)+')'; c.lineJoin='round'; c.lineWidth=0.55*sc; c.stroke();
      }
      c.setTransform(1,0,0,1,0,0);
    };
  }}
);
})();
