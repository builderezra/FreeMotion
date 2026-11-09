/* Batch 3: Glitch, CRT, Film Grain, Pixel Sort, Oil Paint, Halftone Dots, Live Wire. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

function tintOf(S,px,col){ const C=document.createElement('canvas'); C.width=C.height=px; const x=C.getContext('2d'); x.drawImage(S,0,0); x.globalCompositeOperation='multiply'; x.fillStyle=col; x.fillRect(0,0,px,px); return C; }
/* A feathered shape without ctx.filter (Safari has none): the shape sits off-canvas and only its blurred shadow lands here. */
function soft(c,sc,path,color,blur){ c.save(); c.shadowColor=color; c.shadowBlur=blur*sc; c.shadowOffsetX=4000; c.shadowOffsetY=0; c.translate(-4000/sc,0); c.fillStyle='#000'; path(c); c.fill(); c.restore(); }
function rrect(c,x,y,w,h,r){ c.beginPath(); c.roundRect(x,y,w,h,r); }

window.FX_TILES.push(

/* ------------------------------------------------------------------ GLITCH */
{ id:'glitch', name:'Glitch', section:'Stylize', isNew:true, still:1.63,
  line:'A clean cat logo tears into sliding slices and splits into red, green and blue in sudden bursts.',
  make(px){
    const P=3.2, FPS=15, N=Math.round(P*FPS), sc=px/100;
    function headPath(c){
      c.beginPath(); c.moveTo(50,25.5);
      c.bezierCurveTo(43,25.5,37,26.6,32,29); c.lineTo(20.5,10.5); c.quadraticCurveTo(16.5,5.2,14.6,11.6);
      c.bezierCurveTo(11.4,23,9.6,34,10.3,45); c.bezierCurveTo(5.4,57,9,74,22,83); c.bezierCurveTo(31,89.5,41,92.5,50,92.5);
      c.bezierCurveTo(59,92.5,69,89.5,78,83); c.bezierCurveTo(91,74,94.6,57,89.7,45); c.bezierCurveTo(90.4,34,88.6,23,85.4,11.6);
      c.quadraticCurveTo(83.5,5.2,79.5,10.5); c.lineTo(68,29); c.bezierCurveTo(63,26.6,57,25.5,50,25.5); c.closePath();
    }
    function eye(c,cx,cy,dir,blink){
      c.save(); c.translate(cx,cy); c.rotate(dir*0.16);
      if(blink){ c.strokeStyle='#15132e'; c.lineWidth=2.8; c.lineCap='round'; c.beginPath(); c.moveTo(-12.5,0); c.quadraticCurveTo(0,6.5,12.5,0); c.stroke(); c.restore(); return; }
      c.beginPath(); c.moveTo(-13.5,0); c.quadraticCurveTo(-1,-17,13.5,0); c.quadraticCurveTo(1,17,-13.5,0); c.closePath(); c.fillStyle='#15132e'; c.fill();
      c.save(); c.clip();
      const g=c.createRadialGradient(0,1,0.5,0,0,10.5); g.addColorStop(0,'#fff58a'); g.addColorStop(0.5,'#a8f23a'); g.addColorStop(1,'#16a27a');
      c.fillStyle=g; c.beginPath(); c.arc(0,0,9.7,0,TAU); c.fill();
      c.fillStyle='#0b0a1c'; c.beginPath(); c.ellipse(0,0,2.7,8.8,0,0,TAU); c.fill();
      c.restore();
      c.fillStyle='#fff'; c.beginPath(); c.ellipse(-3.9,-3.5,1.9,1.5,-0.5,0,TAU); c.fill();
      c.restore();
    }
    function art(c,blink){
      let g=c.createRadialGradient(50,44,4,50,52,80); g.addColorStop(0,'#4a22a0'); g.addColorStop(0.5,'#1e1358'); g.addColorStop(1,'#07061a'); c.fillStyle=g; c.fillRect(0,0,100,100);
      c.save(); c.shadowColor='rgba(0,0,0,0.6)'; c.shadowBlur=5*sc; c.shadowOffsetY=2.4*sc; c.fillStyle='#fff'; headPath(c); c.fill(); c.restore();
      g=c.createLinearGradient(0,10,0,92); g.addColorStop(0,'#ffffff'); g.addColorStop(0.62,'#f1efff'); g.addColorStop(1,'#bdb7f2'); c.fillStyle=g; headPath(c); c.fill();
      c.save(); headPath(c); c.clip();
      g=c.createRadialGradient(50,62,18,50,56,50); g.addColorStop(0,'rgba(120,105,230,0)'); g.addColorStop(1,'rgba(120,105,230,0.3)'); c.fillStyle=g; c.fillRect(0,0,100,100);
      c.restore();
      [[1,0],[-1,100]].forEach(([k,o])=>{
        g=c.createLinearGradient(0,14,0,36); g.addColorStop(0,'#ff3f93'); g.addColorStop(1,'#ff9fca'); c.fillStyle=g;
        c.beginPath(); c.moveTo(o+k*19.9,16); c.quadraticCurveTo(o+k*18,15.6,o+k*17.6,19); c.lineTo(o+k*15.4,37); c.quadraticCurveTo(o+k*22,31,o+k*30.2,30); c.closePath(); c.fill();
      });
      c.fillStyle='#8478dd';
      [-8,0,8].forEach((dx,i)=>{ const h=i===1?13.5:10.5, w=i===1?2.7:2.3, top=i===1?25:26.6, xx=50+dx; c.beginPath(); c.moveTo(xx-w*0.15,top); c.quadraticCurveTo(xx-w,top+h*0.45,xx,top+h); c.quadraticCurveTo(xx+w,top+h*0.45,xx+w*0.15,top); c.closePath(); c.fill(); });
      eye(c,31.5,54.5,1,blink); eye(c,68.5,54.5,-1,blink);
      c.fillStyle='#ff4f9a'; c.beginPath(); c.moveTo(46.5,66.5); c.quadraticCurveTo(50,65.3,53.5,66.5); c.quadraticCurveTo(54.5,67.3,53.4,68.5); c.lineTo(50.9,71); c.quadraticCurveTo(50,71.8,49.1,71); c.lineTo(46.6,68.5); c.quadraticCurveTo(45.5,67.3,46.5,66.5); c.closePath(); c.fill();
      c.strokeStyle='#3c3580'; c.lineWidth=1.5; c.lineCap='round'; c.lineJoin='round';
      c.beginPath(); c.moveTo(50,71.4); c.lineTo(50,74.6); c.moveTo(39.8,76); c.quadraticCurveTo(46,80.8,50,74.6); c.quadraticCurveTo(54,80.8,60.2,76); c.stroke();
      c.strokeStyle='#8a82d9'; c.lineWidth=0.95;
      [[28.5,69.5,21,67,14,67.6],[28.5,73.2,21,73.4,13.8,74.6],[29.5,76.8,23,79.4,16.8,81.6]].forEach(([a,b,cx,cy,x,y])=>{ c.beginPath(); c.moveTo(a,b); c.quadraticCurveTo(cx,cy,x,y); c.stroke(); c.beginPath(); c.moveTo(100-a,b); c.quadraticCurveTo(100-cx,cy,100-x,y); c.stroke(); });
    }
    const [S,s]=canvasOf(px); art(s,false);
    const [B,b]=canvasOf(px); art(b,true);
    const Rc=tintOf(S,px,'#ff0000'), Gc=tintOf(S,px,'#00ff00'), Bc=tintOf(S,px,'#0000ff');
    const L=document.createElement('canvas'); L.width=L.height=px; const l=L.getContext('2d');
    l.fillStyle='rgba(0,0,0,0.11)'; { const per=Math.max(2,Math.round(sc*2)), th=Math.max(1,Math.round(sc*0.9)); for(let y=0;y<px;y+=per) l.fillRect(0,y,px,th); }
    const ENV={};
    [[7,[.55,.9,.7,.95,.6,.35]],[20,[.5,.9,1,.8,1,.95,.6,.85,1,.9,.7,.4,.75,.3]],[38,[.6,.9,.4]]].forEach(([from,list])=>list.forEach((e,i)=>{ ENV[from+i]=e; }));
    const frames=[];
    for(let f=0;f<N;f++){
      const env=ENV[f]||0; if(!env){ frames.push(null); continue; }
      const R=rng(1000+f*17), H=[2,3,4,4,6,6,8,10,14], bands=[], blocks=[], zc=18+R()*64, spread=24+R()*14;
      let y=0,i=0;
      while(y<100){
        let h=H[Math.floor(R()*H.length)]; if(y+h>100) h=100-y;
        const yc=y+h/2, w=Math.exp(-Math.pow((yc-zc)/spread,2)), big=R()<0.62;
        const dx=Math.round((i%2?1:-1)*env*(big?(8+R()*18):(2+R()*4))*(0.2+0.8*w));
        const sp=env*(1.6+R()*3.2)*(0.5+0.5*w);
        bands.push({y0:Math.round(y*sc),y1:Math.round((y+h)*sc),dx:Math.round(dx*sc),sp:Math.round(sp*sc)});
        y+=h; i++;
      }
      if(env>0.5){
        const n=1+Math.floor(R()*3), gx=6.25, gy=4;
        for(let k=0;k<n;k++){
          const bw=(2+Math.floor(R()*5))*gx, bh=(1+Math.floor(R()*2))*gy;
          const bx=Math.floor(R()*((100-bw)/gx+1))*gx, by=Math.floor(R()*((100-bh)/gy+1))*gy;
          const sx=clamp(bx+(R()<.5?-1:1)*gx*(2+Math.floor(R()*4)),0,100-bw);
          blocks.push({x:Math.round(bx*sc),y:Math.round(by*sc),w:Math.round(bw*sc),h:Math.round(bh*sc),sx:Math.round(sx*sc),col:k%2?'rgba(255,40,160,0.34)':'rgba(0,240,255,0.34)'});
        }
      }
      frames.push({env,bands,blocks,bar:bands[Math.floor(R()*bands.length)].y0});
    }
    const wrap=(c,img,dx,y,h)=>{ const x=((dx%px)+px)%px; c.drawImage(img,0,y,px,h,x,y,px,h); if(x>0) c.drawImage(img,0,y,px,h,x-px,y,px,h); };
    return (c,t)=>{
      const u=t%P, F=frames[Math.min(N-1,Math.floor(u*FPS))];
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      if(!F){ c.drawImage((u>2.62&&u<2.78)?B:S,0,0); return; }
      c.fillStyle='#000'; c.fillRect(0,0,px,px);
      c.globalCompositeOperation='lighter';
      for(const k of F.bands){ const h=k.y1-k.y0; if(h<=0) continue; wrap(c,Rc,k.dx+k.sp,k.y0,h); wrap(c,Gc,k.dx,k.y0,h); wrap(c,Bc,k.dx-k.sp,k.y0,h); }
      c.globalCompositeOperation='source-over';
      for(const k of F.blocks){ c.drawImage(S,k.sx,k.y,k.w,k.h,k.x,k.y,k.w,k.h); c.fillStyle=k.col; c.fillRect(k.x,k.y,k.w,k.h); }
      c.globalAlpha=0.5+0.5*F.env; c.drawImage(L,0,0); c.globalAlpha=1;
    };
  }},

/* ------------------------------------------------------------------ CRT */
{ id:'crt', name:'CRT', section:'Stylize', isNew:true, still:2.3,
  line:'An old TV clicks on: a line of light opens into a curved picture with scanlines, then snaps off to a dot.',
  make(px){
    const P=4.8, sc=px/100, SX0=12, SX1=72, SY0=25.5, SY1=82, SW=SX1-SX0, SH=SY1-SY0, CX=(SX0+SX1)/2, CY=(SY0+SY1)/2, B=1.5, RAD=7;
    function tube(c){
      c.beginPath(); c.moveTo(SX0+RAD,SY0);
      c.quadraticCurveTo(CX,SY0-2*B,SX1-RAD,SY0); c.quadraticCurveTo(SX1,SY0,SX1,SY0+RAD);
      c.quadraticCurveTo(SX1+2*B,CY,SX1,SY1-RAD); c.quadraticCurveTo(SX1,SY1,SX1-RAD,SY1);
      c.quadraticCurveTo(CX,SY1+2*B,SX0+RAD,SY1); c.quadraticCurveTo(SX0,SY1,SX0,SY1-RAD);
      c.quadraticCurveTo(SX0-2*B,CY,SX0,SY0+RAD); c.quadraticCurveTo(SX0,SY0,SX0+RAD,SY0); c.closePath();
    }
    /* the flat picture: colour bars with the channel badge */
    const PW=Math.round((SW+4)*sc), PH=Math.round((SH+4)*sc);
    const FL=document.createElement('canvas'); FL.width=PW; FL.height=PH; const fl=FL.getContext('2d',{willReadFrequently:true}); fl.setTransform(PW/100,0,0,PH/100,0,0);
    ['#e4e4e4','#e6e000','#00d8e0','#00d840','#e000d0','#e80a12','#1414e8'].forEach((col,i)=>{ fl.fillStyle=col; fl.fillRect(i*100/7,0,100/7+0.3,66); });
    ['#1414e8','#141418','#e000d0','#141418','#00d8e0','#141418','#e4e4e4'].forEach((col,i)=>{ fl.fillStyle=col; fl.fillRect(i*100/7,66,100/7+0.3,10); });
    ['#08265e','#f4f4f4','#2c0a72','#101014','#101014','#2a2a30','#101014'].forEach((col,i)=>{ fl.fillStyle=col; fl.fillRect(i*100/7,76,100/7+0.3,24); });
    fl.save(); fl.translate(50,38); fl.scale(1,PW/PH);
    fl.fillStyle='rgba(8,10,28,0.92)'; fl.beginPath(); fl.arc(0,0,24,0,TAU); fl.fill();
    fl.strokeStyle='#fff'; fl.lineWidth=2.2; fl.beginPath(); fl.arc(0,0,24,0,TAU); fl.stroke();
    fl.fillStyle='#fff'; fl.textAlign='center'; fl.textBaseline='middle'; fl.font='700 26px system-ui, sans-serif'; fl.fillText('FM',0,1);
    fl.restore();
    /* warp it onto the bulging tube; scanlines and the phosphor stripes follow the bulge */
    const src=fl.getImageData(0,0,PW,PH).data;
    const PIC=document.createElement('canvas'); PIC.width=PW; PIC.height=PH; const pc=PIC.getContext('2d');
    const dstI=pc.createImageData(PW,PH), dst=dstI.data, K=0.1, LINES=21, stripe=Math.max(1,Math.round(sc*0.55));
    const samp=(x,y,o)=>{ const i=clamp(Math.floor(x),0,PW-2), j=clamp(Math.floor(y),0,PH-2), fx=clamp(x-i), fy=clamp(y-j), p=(j*PW+i)*4, a=src[p+o], b=src[p+4+o], cc=src[p+PW*4+o], d=src[p+PW*4+4+o]; return lerp(lerp(a,b,fx),lerp(cc,d,fx),fy); };
    for(let j=0;j<PH;j++) for(let i=0;i<PW;i++){
      const nu=(i+0.5)/PW*2-1, nv=(j+0.5)/PH*2-1, r2=nu*nu+nv*nv, m=(1+K*r2)/(1+K), su=nu*m, sv=nv*m, p=(j*PW+i)*4;
      const x=(su+1)/2*PW-0.5, y=(sv+1)/2*PH-0.5;
      const cs=Math.cos(Math.PI*((sv+1)/2)*LINES), scan=0.66+0.46*(1-cs*cs);
      const vig=clamp(1-0.26*r2*r2*0.5,0,1), st=Math.floor(i/stripe)%3;
      for(let o=0;o<3;o++){ const mask=(o===st)?1.06:0.86; dst[p+o]=clamp(samp(x,y,o)*scan*vig*mask,0,255); }
      dst[p+3]=255;
    }
    pc.putImageData(dstI,0,0);
    const CAB=(x)=>{
      let g=x.createRadialGradient(40,34,6,50,52,92); g.addColorStop(0,'#4d5a70'); g.addColorStop(0.6,'#262e40'); g.addColorStop(1,'#10131e'); x.fillStyle=g; x.fillRect(0,0,100,100);
      g=x.createLinearGradient(0,91,0,100); g.addColorStop(0,'#3a2c24'); g.addColorStop(1,'#1c1512'); x.fillStyle=g; x.fillRect(0,91,100,9);
      x.fillStyle='#57433a'; x.fillRect(0,91,100,0.7);
      x.fillStyle='rgba(0,0,0,0.5)'; x.beginPath(); x.ellipse(50,93.5,48,3.2,0,0,TAU); x.fill();
      x.fillStyle='#17110e'; x.beginPath(); x.roundRect(14,89,12,5,1.5); x.roundRect(74,89,12,5,1.5); x.fill();
      /* rabbit ears */
      x.lineCap='round';
      [[50,15,22,2.5],[50,15,80,3.4]].forEach(([a,b,ex,ey])=>{ const gg=x.createLinearGradient(a,b,ex,ey); gg.addColorStop(0,'#c7ccd8'); gg.addColorStop(1,'#eef1f6'); x.strokeStyle=gg; x.lineWidth=1.1; x.beginPath(); x.moveTo(a,b); x.lineTo(ex,ey); x.stroke(); x.fillStyle='#f5f7fb'; x.beginPath(); x.arc(ex,ey,1.5,0,TAU); x.fill(); });
      g=x.createLinearGradient(44,12,56,18); g.addColorStop(0,'#4a4f5c'); g.addColorStop(1,'#21242c'); x.fillStyle=g; x.beginPath(); x.ellipse(50,17,7,4,0,Math.PI,TAU); x.closePath(); x.fill();
      /* wood cabinet */
      x.save(); x.shadowColor='rgba(0,0,0,0.55)'; x.shadowBlur=4*sc; x.shadowOffsetY=1.6*sc; x.fillStyle='#000'; x.beginPath(); x.roundRect(3,17,94,73,7.5); x.fill(); x.restore();
      g=x.createLinearGradient(0,17,0,90); g.addColorStop(0,'#c98a52'); g.addColorStop(0.5,'#9c5f30'); g.addColorStop(1,'#633516'); x.fillStyle=g; x.beginPath(); x.roundRect(3,17,94,73,7.5); x.fill();
      x.save(); x.beginPath(); x.roundRect(3,17,94,73,7.5); x.clip();
      const r=rng(33); x.lineWidth=0.35;
      for(let y=18;y<90;y+=1.7){ x.strokeStyle='rgba(50,22,6,'+(0.1+r()*0.16)+')'; const a=r()*2-1, b=r()*2-1; x.beginPath(); x.moveTo(0,y+a); x.bezierCurveTo(30,y+b,60,y-b,100,y+a*0.6); x.stroke(); }
      x.restore();
      x.strokeStyle='rgba(255,226,180,0.5)'; x.lineWidth=0.7; x.beginPath(); x.moveTo(9,17.9); x.lineTo(91,17.9); x.stroke();
      /* bezel */
      g=x.createLinearGradient(0,20,0,88); g.addColorStop(0,'#3a3a40'); g.addColorStop(1,'#151518'); x.fillStyle=g; x.beginPath(); x.roundRect(7.5,20.5,69,67,8.5); x.fill();
      x.strokeStyle='rgba(255,255,255,0.14)'; x.lineWidth=0.5; x.beginPath(); x.roundRect(8,21,68,66,8); x.stroke();
      /* control plate */
      g=x.createLinearGradient(79,0,94,0); g.addColorStop(0,'#d9bd82'); g.addColorStop(0.5,'#efd9a7'); g.addColorStop(1,'#b3965c'); x.fillStyle=g; x.beginPath(); x.roundRect(79,21,14.5,66,3); x.fill();
      x.strokeStyle='rgba(60,40,10,0.55)'; x.lineWidth=0.4; x.beginPath(); x.roundRect(79,21,14.5,66,3); x.stroke();
      [[86.2,33,6],[86.2,52,5]].forEach(([kx,ky,kr])=>{ x.fillStyle='rgba(50,30,6,0.45)'; x.beginPath(); x.arc(kx,ky+0.8,kr+1.1,0,TAU); x.fill(); let gg=x.createLinearGradient(kx-kr,ky-kr,kx+kr,ky+kr); gg.addColorStop(0,'#f6f6f4'); gg.addColorStop(1,'#8b8f98'); x.fillStyle=gg; x.beginPath(); x.arc(kx,ky,kr+0.8,0,TAU); x.fill(); gg=x.createRadialGradient(kx-1.6,ky-2,0.5,kx,ky,kr); gg.addColorStop(0,'#55565f'); gg.addColorStop(1,'#16171c'); x.fillStyle=gg; x.beginPath(); x.arc(kx,ky,kr,0,TAU); x.fill(); });
      x.fillStyle='rgba(40,26,8,0.85)'; for(let i=0;i<7;i++){ x.beginPath(); x.roundRect(81.2,62.5+i*3.2,10,1.5,0.75); x.fill(); }
    };
    const [BG,bg]=canvasOf(px); CAB(bg);
    const [GL,gl]=canvasOf(px);
    gl.save(); tube(gl); gl.clip();
    let gg=gl.createLinearGradient(SX0,SY0,SX1,SY1); gg.addColorStop(0,'rgba(255,255,255,0.2)'); gg.addColorStop(0.28,'rgba(255,255,255,0.05)'); gg.addColorStop(0.3,'rgba(255,255,255,0)'); gl.fillStyle=gg; gl.fillRect(0,0,100,100);
    gl.fillStyle='rgba(255,255,255,0.13)'; gl.beginPath(); gl.moveTo(16,27); gl.quadraticCurveTo(42,23,68,28); gl.quadraticCurveTo(44,32,18,41); gl.quadraticCurveTo(14,34,16,27); gl.closePath(); gl.fill();
    gg=gl.createRadialGradient(CX,CY,22,CX,CY,44); gg.addColorStop(0,'rgba(0,0,0,0)'); gg.addColorStop(1,'rgba(0,0,0,0.5)'); gl.fillStyle=gg; gl.fillRect(0,0,100,100);
    gl.restore();
    gl.strokeStyle='rgba(0,0,0,0.75)'; gl.lineWidth=1.1; tube(gl); gl.stroke();
    return (c,t)=>{
      const u=t%P, ON=0.42, OFF=4.0;
      const wOpen=E.out(seg(u,ON,ON+0.16)), hOpen=E.out(seg(u,ON+0.14,ON+0.6));
      const hClose=E.in(seg(u,OFF,OFF+0.22)), wClose=E.in(seg(u,OFF+0.18,OFF+0.4));
      const power=u>=ON-0.06&&u<OFF+0.4;
      const vis=hOpen*(1-hClose), H=Math.max(0.01,SH*vis);
      const over=clamp(Math.max(1-seg(u,ON+0.14,ON+1.05),hClose));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      c.save(); tube(c); c.clip();
      let g=c.createRadialGradient(CX-8,CY-10,4,CX,CY,46); g.addColorStop(0,'#2b3530'); g.addColorStop(1,'#0a0e0d'); c.fillStyle=g; c.fillRect(SX0-3,SY0-3,SW+6,SH+6);
      if(power&&vis>0.004){
        c.globalAlpha=1-0.04*hash(Math.floor(u*24),4);
        c.drawImage(PIC,0,0,PW,PH,SX0-2,CY-(H*(SH+4)/SH)/2,SW+4,H*(SH+4)/SH); c.globalAlpha=1;
        if(over>0.003){ c.fillStyle='rgba(235,245,255,'+(0.92*over)+')'; c.fillRect(SX0-3,CY-H/2,SW+6,H); }
        const roll=SY0-14+((u-ON)/(OFF-ON))*(SH+28)*2%(SH+28);
        g=c.createLinearGradient(0,roll,0,roll+14); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(0.5,'rgba(255,255,255,0.13)'); g.addColorStop(1,'rgba(255,255,255,0)');
        c.fillStyle=g; c.fillRect(SX0-3,Math.max(CY-H/2,roll),SW+6,Math.min(14,H));
      }
      const lineA=power?Math.max(1-hOpen,hClose):0;
      const half=(SW/2)*wOpen*(1-wClose);
      c.globalCompositeOperation='lighter';
      if(lineA>0.01&&half>0.2){
        g=c.createLinearGradient(0,CY-5,0,CY+5); g.addColorStop(0,'rgba(120,190,255,0)'); g.addColorStop(0.5,'rgba(170,215,255,'+(0.75*lineA)+')'); g.addColorStop(1,'rgba(120,190,255,0)');
        c.fillStyle=g; c.fillRect(CX-half,CY-5,half*2,10);
        c.fillStyle='rgba(255,255,255,'+lineA+')'; c.fillRect(CX-half,CY-0.55,half*2,1.1);
      }
      const dot=(u>=OFF+0.36&&u<OFF+0.72)?1-seg(u,OFF+0.36,OFF+0.72):0;
      if(dot>0){ g=c.createRadialGradient(CX,CY,0,CX,CY,5); g.addColorStop(0,'rgba(255,255,255,'+dot+')'); g.addColorStop(0.3,'rgba(190,225,255,'+(0.8*dot)+')'); g.addColorStop(1,'rgba(120,190,255,0)'); c.fillStyle=g; c.fillRect(CX-5,CY-5,10,10); }
      c.globalCompositeOperation='source-over';
      c.restore();
      c.setTransform(1,0,0,1,0,0); c.drawImage(GL,0,0); c.setTransform(sc,0,0,sc,0,0);
      /* the picture lights the room */
      if(power&&vis>0.05){ c.globalCompositeOperation='lighter'; g=c.createRadialGradient(CX,CY,26,CX,CY,62); g.addColorStop(0,'rgba(120,170,255,'+(0.2*vis)+')'); g.addColorStop(1,'rgba(120,170,255,0)'); c.fillStyle=g; c.fillRect(0,0,100,100); c.globalCompositeOperation='source-over'; }
      /* dials: the top one clicks round as it switches */
      const dial=-2.2+1.1*E.inOut(seg(u,0.12,0.4))*(1-E.inOut(seg(u,OFF-0.2,OFF+0.05)));
      c.strokeStyle='#f3efe4'; c.lineWidth=1.3; c.lineCap='round';
      c.beginPath(); c.moveTo(86.2+Math.cos(dial)*1.5,33+Math.sin(dial)*1.5); c.lineTo(86.2+Math.cos(dial)*5.1,33+Math.sin(dial)*5.1); c.stroke();
      c.beginPath(); c.moveTo(86.2+Math.cos(-0.9)*1.3,52+Math.sin(-0.9)*1.3); c.lineTo(86.2+Math.cos(-0.9)*4.2,52+Math.sin(-0.9)*4.2); c.stroke();
      c.fillStyle=power?'#ff4a3a':'#4b1a14'; c.beginPath(); c.arc(86.2,42.6,1.05,0,TAU); c.fill();
      if(power){ g=c.createRadialGradient(86.2,42.6,0,86.2,42.6,4); g.addColorStop(0,'rgba(255,90,60,0.7)'); g.addColorStop(1,'rgba(255,90,60,0)'); c.fillStyle=g; c.fillRect(82,38.5,8.4,8.4); }
    };
  }},

/* ------------------------------------------------------------------ FILM GRAIN */
{ id:'filmgrain', name:'Film Grain', section:'Stylize', isNew:true, still:1.2,
  line:'A black-and-white noir portrait alive with dancing grain, scratches, dust and projector flicker.',
  make(px){
    const P=4, FPS=18, N=Math.round(P*FPS), sc=px/100, GU=132;
    function facePath(c){ c.beginPath(); c.moveTo(32.6,40); c.bezierCurveTo(32,54,33,64,38,71); c.bezierCurveTo(41.5,76,46,80,50,80); c.bezierCurveTo(54,80,58.5,76,62,71); c.bezierCurveTo(67,64,68,54,67.4,40); c.closePath(); }
    function eye(c,x,y,lit,blink){
      c.save(); c.translate(x,y);
      if(blink){ c.strokeStyle=lit?'#2c2c2c':'#0c0c0c'; c.lineWidth=1.1; c.lineCap='round'; c.beginPath(); c.moveTo(-5.4,0.4); c.quadraticCurveTo(0,1.8,5.4,0.4); c.stroke(); c.restore(); return; }
      c.beginPath(); c.moveTo(-5.4,0.3); c.quadraticCurveTo(0,-4.6,5.4,0.3); c.quadraticCurveTo(0,3.2,-5.4,0.3); c.closePath(); c.fillStyle=lit?'#ededed':'#8b8b8b'; c.fill();
      c.save(); c.clip(); c.fillStyle='#2a2a2a'; c.beginPath(); c.arc(0,-0.5,3,0,TAU); c.fill(); c.fillStyle='#050505'; c.beginPath(); c.arc(0,-0.5,1.5,0,TAU); c.fill(); c.restore();
      c.fillStyle='#fff'; c.beginPath(); c.arc(-1,-1.5,0.72,0,TAU); c.fill();
      c.strokeStyle='#0d0d0d'; c.lineWidth=1.25; c.lineCap='round'; c.beginPath(); c.moveTo(-5.8,0.4); c.quadraticCurveTo(0,-5,5.8,0.4); c.stroke();
      c.restore();
    }
    function portrait(c,blink){
      let g=c.createRadialGradient(46,26,4,50,44,86); g.addColorStop(0,'#e2e2e2'); g.addColorStop(0.45,'#a2a2a2'); g.addColorStop(1,'#232323'); c.fillStyle=g; c.fillRect(0,0,100,100);
      c.save(); c.translate(50,50); c.rotate(-0.16); c.fillStyle='rgba(0,0,0,0.13)'; for(let y=-90;y<90;y+=12.5) c.fillRect(-90,y,180,5.5); c.restore();
      /* coat */
      g=c.createLinearGradient(8,78,92,100); g.addColorStop(0,'#4e4e4e'); g.addColorStop(0.5,'#242424'); g.addColorStop(1,'#0a0a0a'); c.fillStyle=g;
      c.beginPath(); c.moveTo(0,100); c.lineTo(0,91); c.bezierCurveTo(10,85,24,83,36,79); c.lineTo(64,79); c.bezierCurveTo(76,83,90,85,100,91); c.lineTo(100,100); c.closePath(); c.fill();
      /* neck */
      g=c.createLinearGradient(40,0,60,0); g.addColorStop(0,'#c9c9c9'); g.addColorStop(0.5,'#8c8c8c'); g.addColorStop(1,'#2e2e2e'); c.fillStyle=g; c.beginPath(); c.moveTo(40.5,70); c.lineTo(40,88); c.lineTo(60,88); c.lineTo(59.5,70); c.closePath(); c.fill();
      soft(c,sc,x=>{ x.beginPath(); x.moveTo(38,76); x.quadraticCurveTo(50,88,62,76); x.lineTo(62,80); x.quadraticCurveTo(50,91,38,80); x.closePath(); },'rgba(0,0,0,0.75)',2.2);
      /* shirt, tie */
      c.fillStyle='#dcdcdc'; c.beginPath(); c.moveTo(39.5,84); c.lineTo(50,101); c.lineTo(60.5,84); c.closePath(); c.fill();
      g=c.createLinearGradient(46,0,54,0); g.addColorStop(0,'#3b3b3b'); g.addColorStop(1,'#0e0e0e'); c.fillStyle=g; c.beginPath(); c.moveTo(47.2,88.5); c.lineTo(50,86.4); c.lineTo(52.8,88.5); c.lineTo(51.8,91.5); c.lineTo(54.2,101); c.lineTo(45.8,101); c.lineTo(48.2,91.5); c.closePath(); c.fill();
      c.fillStyle='#f4f4f4'; c.beginPath(); c.moveTo(39.5,83.5); c.lineTo(49.6,88.5); c.lineTo(44,95); c.closePath(); c.fill();
      c.fillStyle='#8e8e8e'; c.beginPath(); c.moveTo(60.5,83.5); c.lineTo(50.4,88.5); c.lineTo(56,95); c.closePath(); c.fill();
      /* lapels turned up */
      g=c.createLinearGradient(20,0,48,0); g.addColorStop(0,'#7c7c7c'); g.addColorStop(1,'#3b3b3b'); c.fillStyle=g; c.beginPath(); c.moveTo(35.5,78); c.lineTo(17,101); c.lineTo(46,101); c.lineTo(38.6,84.5); c.closePath(); c.fill();
      g=c.createLinearGradient(52,0,82,0); g.addColorStop(0,'#2a2a2a'); g.addColorStop(1,'#0f0f0f'); c.fillStyle=g; c.beginPath(); c.moveTo(64.5,78); c.lineTo(83,101); c.lineTo(54,101); c.lineTo(61.4,84.5); c.closePath(); c.fill();
      /* ears */
      c.fillStyle='#c4c4c4'; c.beginPath(); c.ellipse(32.4,56,2.6,5.6,-0.1,0,TAU); c.fill(); c.fillStyle='#222'; c.beginPath(); c.ellipse(67.6,56,2.6,5.6,0.1,0,TAU); c.fill();
      /* face */
      g=c.createLinearGradient(32,0,68,0); g.addColorStop(0,'#f6f6f6'); g.addColorStop(0.42,'#dcdcdc'); g.addColorStop(0.62,'#a4a4a4'); g.addColorStop(1,'#5a5a5a'); c.fillStyle=g; facePath(c); c.fill();
      c.save(); facePath(c); c.clip();
      /* split lighting: the far side of the face falls into shadow, its edge down the nose */
      soft(c,sc,x=>{ x.beginPath(); x.moveTo(53,34); x.bezierCurveTo(52,46,53,54,55.5,62); x.quadraticCurveTo(56,65.4,52.5,66.4); x.bezierCurveTo(54.5,70,54.5,74,52,82); x.lineTo(72,82); x.lineTo(72,34); x.closePath(); },'rgba(12,12,12,0.9)',1.3);
      /* cheek hollow, temple */
      soft(c,sc,x=>{ x.beginPath(); x.moveTo(33,58); x.quadraticCurveTo(38,66,42,73); x.quadraticCurveTo(36,72,32,63); x.closePath(); },'rgba(0,0,0,0.3)',1.8);
      /* the shadow of the hat brim */
      g=c.createLinearGradient(0,38,0,51); g.addColorStop(0,'rgba(0,0,0,0.85)'); g.addColorStop(0.75,'rgba(0,0,0,0.45)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(30,36,40,16);
      c.restore();
      /* brows */
      c.strokeStyle='#121212'; c.lineCap='round'; c.lineWidth=2.1; c.beginPath(); c.moveTo(37,48.4); c.quadraticCurveTo(42.5,45.2,48,47.6); c.moveTo(52,47.6); c.quadraticCurveTo(57.5,45.2,63,48.4); c.stroke();
      eye(c,42.6,53.2,true,blink); eye(c,57.4,53.2,false,blink);
      /* nose */
      c.strokeStyle='rgba(255,255,255,0.5)'; c.lineWidth=1.2; c.beginPath(); c.moveTo(48.7,52); c.quadraticCurveTo(48.2,58,48.8,62); c.stroke();
      soft(c,sc,x=>{ x.beginPath(); x.ellipse(50.4,66.2,5,1.7,0,0,TAU); },'rgba(0,0,0,0.55)',1);
      c.strokeStyle='#202020'; c.lineWidth=1; c.beginPath(); c.moveTo(45.8,64.2); c.quadraticCurveTo(46.4,66,48.2,65.6); c.quadraticCurveTo(50,67,51.8,65.6); c.quadraticCurveTo(53.6,66,54.2,64.2); c.stroke();
      /* mouth */
      c.fillStyle='#4e4e4e'; c.beginPath(); c.moveTo(42.5,71.4); c.quadraticCurveTo(46.5,69,50,70.2); c.quadraticCurveTo(53.5,69,57.5,71); c.quadraticCurveTo(53,72.2,50,72.2); c.quadraticCurveTo(47,72.2,42.5,71.4); c.closePath(); c.fill();
      c.fillStyle='#8a8a8a'; c.beginPath(); c.moveTo(44,72); c.quadraticCurveTo(50,77.4,56.4,71.8); c.quadraticCurveTo(50,73.2,44,72); c.closePath(); c.fill();
      c.strokeStyle='#161616'; c.lineWidth=0.85; c.beginPath(); c.moveTo(42,71.4); c.quadraticCurveTo(50,72.8,58,70.6); c.stroke();
      soft(c,sc,x=>{ x.beginPath(); x.ellipse(50,75.8,4.5,1,0,0,TAU); },'rgba(0,0,0,0.3)',0.9);
      /* the fedora */
      c.save(); c.translate(50,38); c.rotate(-0.045); c.translate(-50,-38);
      const crown=x=>{ x.beginPath(); x.moveTo(27,37); x.bezierCurveTo(26.5,22,30,10,40,8.4); x.bezierCurveTo(45.5,7.6,47.5,12.5,50,12.5); x.bezierCurveTo(52.5,12.5,54.5,7.6,60,8.4); x.bezierCurveTo(70,10,73.5,22,73,37); x.closePath(); };
      g=c.createLinearGradient(26,0,74,0); g.addColorStop(0,'#555555'); g.addColorStop(0.42,'#333333'); g.addColorStop(1,'#0c0c0c'); c.fillStyle=g; crown(c); c.fill();
      c.save(); crown(c); c.clip();
      c.fillStyle='#040404'; c.beginPath(); c.moveTo(20,28.4); c.quadraticCurveTo(50,33.2,80,28.4); c.lineTo(80,40); c.lineTo(20,40); c.closePath(); c.fill();
      c.strokeStyle='rgba(255,255,255,0.32)'; c.lineWidth=0.6; c.beginPath(); c.moveTo(20,28.4); c.quadraticCurveTo(50,33.2,80,28.4); c.stroke();
      c.strokeStyle='rgba(0,0,0,0.6)'; c.lineWidth=1.6; c.beginPath(); c.moveTo(50,13); c.quadraticCurveTo(48.5,20,50.5,27); c.stroke();
      c.strokeStyle='rgba(255,255,255,0.22)'; c.lineWidth=1.8; c.beginPath(); c.moveTo(35,13.5); c.quadraticCurveTo(31,20,31,26.5); c.stroke();
      c.restore();
      const brim=x=>{ x.beginPath(); x.moveTo(7,41.5); x.bezierCurveTo(17,33.5,31,34.5,50,35); x.bezierCurveTo(69,34.5,83,33.5,93,41.5); x.bezierCurveTo(82,44.6,66,47.4,50,47.4); x.bezierCurveTo(34,47.4,18,44.6,7,41.5); x.closePath(); };
      g=c.createLinearGradient(7,0,93,0); g.addColorStop(0,'#6e6e6e'); g.addColorStop(0.5,'#3a3a3a'); g.addColorStop(1,'#0c0c0c'); c.fillStyle=g; brim(c); c.fill();
      c.strokeStyle='rgba(255,255,255,0.5)'; c.lineWidth=0.7; c.beginPath(); c.moveTo(9,41.6); c.bezierCurveTo(20,44.6,34,46.9,50,46.9); c.stroke();
      c.restore();
    }
    const [A,a]=canvasOf(px); portrait(a,false);
    const [B,b]=canvasOf(px); portrait(b,true);
    function noise(n,seed,amp){ const C=document.createElement('canvas'); C.width=C.height=n; const x=C.getContext('2d'), im=x.createImageData(n,n), d=im.data, r=rng(seed); for(let i=0;i<n*n;i++){ const on=r()>0.5, w=r(); d[i*4]=d[i*4+1]=d[i*4+2]=on?255:0; d[i*4+3]=Math.round(255*amp*Math.pow(w,1.3)); } x.putImageData(im,0,0); return C; }
    const N1=Math.round(GU/1.05), N2=Math.round(GU/0.58), G1=noise(N1,55,0.2), G2=noise(N2,56,0.25);
    const [V,v]=canvasOf(px);
    let g=v.createRadialGradient(50,48,34,50,50,76); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.72)'); v.fillStyle=g; v.fillRect(0,0,100,100);
    v.fillStyle='#000'; v.beginPath(); v.rect(0,0,100,100); v.roundRect(1.2,1.2,97.6,97.6,7); v.fill('evenodd');
    const R=rng(99), frames=[];
    const SCR=[{x:27,from:6,len:26},{x:73,from:30,len:20},{x:44.5,from:53,len:14}];
    for(let f=0;f<N;f++){
      const specks=[]; for(let i=0;i<7;i++) specks.push({x:R()*100,y:R()*100,r:0.35+R()*0.75,w:i<4});
      const lines=[]; SCR.forEach((s,i)=>{ if(f>=s.from&&f<s.from+s.len) lines.push({x:s.x+1.1*vnoise(f*0.4,i+3),a:0.5+0.45*hash(f,i+8),w:0.85}); });
      if(f%5===2) lines.push({x:8+R()*84,a:0.3+R()*0.3,w:0.5});
      const hair=(f===15||f===16||f===47)?{x:18+R()*64,y:16+R()*60,r:4.5+R()*2.5,a:R()*TAU}:null;
      frames.push({g1x:R()*(GU-101),g1y:R()*(GU-101),g2x:R()*(GU-101),g2y:R()*(GU-101),wx:(R()-0.5)*0.55,wy:(R()-0.5)*0.85,fl:R()*0.1,specks,lines,hair,blink:f>=46&&f<49});
    }
    return (c,t)=>{
      const u=t%P, F=frames[Math.min(N-1,Math.floor(u*FPS))], z=1.03+0.012*Math.sin(u/P*TAU);
      c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.setTransform(z,0,0,z,px/2-px/2*z+F.wx*sc,px/2-px/2*z+F.wy*sc);
      c.drawImage(F.blink?B:A,0,0);
      c.setTransform(1,0,0,1,0,0);
      c.drawImage(G1,0,0,N1,N1,-F.g1x*sc,-F.g1y*sc,GU*sc,GU*sc);
      c.drawImage(G2,0,0,N2,N2,-F.g2x*sc,-F.g2y*sc,GU*sc,GU*sc);
      c.fillStyle='rgba(0,0,0,'+F.fl+')'; c.fillRect(0,0,px,px);
      c.setTransform(sc,0,0,sc,0,0);
      c.lineCap='round';
      for(const L of F.lines){ c.strokeStyle='rgba(255,255,255,'+L.a+')'; c.lineWidth=L.w; c.beginPath(); c.moveTo(L.x,-2); c.quadraticCurveTo(L.x+0.8,50,L.x-0.4,102); c.stroke(); }
      for(const s of F.specks){ c.fillStyle=s.w?'rgba(255,255,255,0.8)':'rgba(0,0,0,0.85)'; c.beginPath(); c.arc(s.x,s.y,s.r,0,TAU); c.fill(); }
      if(F.hair){ c.strokeStyle='rgba(0,0,0,0.8)'; c.lineWidth=0.5; c.beginPath(); c.arc(F.hair.x,F.hair.y,F.hair.r,F.hair.a,F.hair.a+2.4); c.stroke(); }
      c.setTransform(1,0,0,1,0,0); c.drawImage(V,0,0);
    };
  }},

/* ------------------------------------------------------------------ PIXEL SORT */
{ id:'pixelsort', name:'Pixel Sort', section:'Stylize', isNew:true, still:2.75,
  line:'The sun melts: each column of pixels sorts by brightness and pours down over the mountains in long streaks.',
  make(px){
    const P=4.4, C=100, R=200, NK=50, SUNX=50, SUNY=44, SUNR=25;
    const W=document.createElement('canvas'); W.width=C; W.height=R; const w=W.getContext('2d',{willReadFrequently:true}); w.setTransform(C/100,0,0,R/100,0,0);
    let g=w.createLinearGradient(0,0,0,74); g.addColorStop(0,'#160f4a'); g.addColorStop(0.32,'#4d2590'); g.addColorStop(0.6,'#d63a84'); g.addColorStop(0.82,'#ff8a3a'); g.addColorStop(1,'#ffd066'); w.fillStyle=g; w.fillRect(0,0,100,100);
    g=w.createRadialGradient(SUNX,SUNY,SUNR*0.8,SUNX,SUNY,SUNR*1.9); g.addColorStop(0,'rgba(255,190,110,0.55)'); g.addColorStop(1,'rgba(255,190,110,0)'); w.fillStyle=g; w.fillRect(0,0,100,100);
    g=w.createLinearGradient(0,SUNY-SUNR,0,SUNY+SUNR); g.addColorStop(0,'#fffbd0'); g.addColorStop(0.5,'#ffd25a'); g.addColorStop(1,'#ff7a3a'); w.fillStyle=g; w.beginPath(); w.arc(SUNX,SUNY,SUNR,0,TAU); w.fill();
    const ridge=(pts,col)=>{ w.fillStyle=col; w.beginPath(); w.moveTo(0,100); pts.forEach(([x,y])=>w.lineTo(x,y)); w.lineTo(100,100); w.closePath(); w.fill(); };
    ridge([[0,64],[10,58],[20,63],[33,54],[44,61],[54,57],[66,63],[78,53],[90,60],[100,56]],'#5d2a7c');
    ridge([[0,72],[12,66],[24,73],[38,64],[52,72],[64,66],[80,74],[92,67],[100,71]],'#301658');
    ridge([[0,84],[16,77],[34,84],[50,78],[70,85],[86,78],[100,83]],'#120a2e');
    const D=w.getImageData(0,0,C,R).data;
    const lum=(p)=>(0.3*D[p]+0.59*D[p+1]+0.11*D[p+2])/255;
    const r=rng(77), cols=[];
    let grp=0,gL=0,gD=0,gO=false;
    for(let x=0;x<C;x++){
      if(grp<=0){ grp=1+Math.floor(r()*4); gL=r(); gD=r(); gO=r()<0.24; }
      grp--;
      let ry=R-1, end=R-1; for(let y=Math.round(R*0.5);y<R;y++){ if(lum((y*C+x)*4)<0.27){ ry=y; break; } } for(let y=ry;y<R;y++){ if(lum((y*C+x)*4)<0.1){ end=y; break; } }
      const dx=(x+0.5)-SUNX, inSun=Math.abs(dx)<SUNR-1;
      const s=inSun?Math.round((SUNY-Math.sqrt(SUNR*SUNR-dx*dx))*2+3+r()*7):Math.round(ry-(14+r()*22));
      const Q=[]; for(let y=s;y<end;y+=(y<ry?1:(inSun?3:2))){ const p=(y*C+x)*4; Q.push([D[p],D[p+1],D[p+2],lum(p)]); }
      const maxEnd=inSun?lerp(R*0.84,R,gL):Math.min(R,ry+10+gL*44);
      if(!inSun&&gO) continue; cols.push({x,s,Q,maxEnd,delay:(inSun?0:0.14)+gD*0.2,bright:0.92+r()*0.16});
    }
    const KF=[];
    for(let k=0;k<NK;k++){
      const p=k/(NK-1), K=document.createElement('canvas'); K.width=C; K.height=R; const x=K.getContext('2d'), im=x.createImageData(C,R); im.data.set(D);
      for(const col of cols){
        const q=clamp((p-col.delay)/0.66); if(q<=0||!col.Q.length) continue;
        const n=Math.floor(col.Q.length*clamp(q/0.5)), head=col.Q.slice(0,n).sort((a,b)=>b[3]-a[3]), list=head.concat(col.Q.slice(n));
        const len=lerp(col.Q.length,col.maxEnd-col.s,E.inOut(clamp((q-0.3)/0.7)));
        const br=lerp(1,col.bright,clamp(q*2));
        for(let y=0;y<len;y++){
          const yy=col.s+y; if(yy<0||yy>=R) continue;
          const v=list[Math.min(list.length-1,Math.floor(y/len*list.length))], o=(yy*C+col.x)*4;
          im.data[o]=clamp(v[0]*br,0,255); im.data[o+1]=clamp(v[1]*br,0,255); im.data[o+2]=clamp(v[2]*br,0,255);
        }
      }
      x.putImageData(im,0,0); KF.push(K);
    }
    return (c,t)=>{
      const u=t%P, p=E.inOut(seg(u,0.45,2.45))*(1-E.inOut(seg(u,3.0,4.2))), k=Math.round(p*(NK-1));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      const was=c.imageSmoothingEnabled; c.imageSmoothingEnabled=false; c.drawImage(KF[k],0,0,px,px); c.imageSmoothingEnabled=was;
    };
  }},

/* ------------------------------------------------------------------ OIL PAINT */
{ id:'oilpaint', name:'Oil Paint', section:'Stylize', isNew:true, still:4.0,
  line:'A sunlit valley goes on stroke by thick stroke, sky first, until the whole canvas is wet paint.',
  make(px){
    const P=5, sc=px/100, T0=0.25, PAINT=3.1, DUR=0.16, R=rng(41);
    const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
    const mix=(a,b,p)=>[lerp(a[0],b[0],p),lerp(a[1],b[1],p),lerp(a[2],b[2],p)];
    const css=(v,k)=>'rgb('+Math.round(clamp(v[0]*k,0,255))+','+Math.round(clamp(v[1]*k,0,255))+','+Math.round(clamp(v[2]*k,0,255))+')';
    const ramp=(stops,y)=>{ for(let i=1;i<stops.length;i++){ if(y<=stops[i][0]){ const a=stops[i-1], b=stops[i]; return mix(hex(a[1]),hex(b[1]),clamp((y-a[0])/(b[0]-a[0]))); } } return hex(stops[stops.length-1][1]); };
    const SKY=[[0,'#143692'],[14,'#2160c6'],[30,'#49a4dc'],[42,'#a8dcd8'],[54,'#f8e8a6']];
    const r1=x=>47+5*Math.sin(x*0.08+1)+2.4*Math.sin(x*0.19);
    const r2=x=>61+5.5*Math.sin(x*0.05+2.4);
    const r3=x=>79+5*Math.sin(x*0.06+0.5);
    const strokes=[];
    function add(x,y,a,len,w,col,k){
      const pts=[], n=8, curve=k||0;
      for(let i=0;i<=n;i++){ const f=i/n-0.5, b=a+curve*f, l=f*len; pts.push([x+Math.cos(b)*l,y+Math.sin(b)*l,-Math.sin(b),Math.cos(b)]); }
      const B=Math.max(4,Math.round(w/0.85)), br=[];
      for(let i=0;i<B;i++){ const o=lerp(-w/2+0.4,w/2-0.4,B>1?i/(B-1):0.5), edge=-(o/(w/2)); const dv=1+edge*0.14+(R()-0.5)*0.2; br.push({o,c:css(col,dv),lw:Math.max(0.5,w/B*1.3),a:R()*0.08,b:0.9+R()*0.1}); }
      strokes.push({pts,w,base:css(col,0.95),br,cx:x,cy:y,col:css(col,1)});
    }
    function row(yf,dir,step,len,w,colf,af){
      const xs=[]; for(let x=-3;x<=103;x+=step) xs.push(x); if(dir<0) xs.reverse();
      xs.forEach(x=>{ const xx=x+(R()-0.5)*step*0.3, y=yf(xx)+(R()-0.5)*1.4; const v=(R()-0.5)*0.1; add(xx,y,af(xx,y)+(R()-0.5)*0.12,len,w,colf(xx,y).map(c=>c*(1+v)),(R()-0.5)*0.7); });
    }
    /* sky, top down, swirling */
    let dir=1; const sw=(x,y)=>0.24*Math.sin(x*0.07+y*0.14);
    for(let y=3;y<52;y+=6.4){ row(()=>y,dir,9.6,15.5,8.2,(x,yy)=>ramp(SKY,yy),sw); dir=-dir; }
    /* far hills */
    for(let k=0;k<2;k++){ row(x=>r1(x)+2.8+k*6,dir,9.2,14,7,(x,y)=>mix(hex('#3e58ae'),hex('#7a8bc8'),k*0.7+(R()*0.2)),x=>0.08*Math.cos(x*0.08+1)*5); dir=-dir; }
    /* wheat fields */
    for(let k=0;k<3;k++){ row(x=>r2(x)+3+k*6.6,dir,9,14.5,7.2,(x,y)=>mix(hex('#f2c548'),hex('#d7932a'),k*0.42+R()*0.2),x=>Math.atan(0.275*Math.cos(x*0.05+2.4))); dir=-dir; }
    /* near meadow */
    for(let k=0;k<5;k++){ row(x=>r3(x)+2.5+k*6.6,dir,9,14,7.8,(x,y)=>mix(hex('#58a046'),hex('#1d4e2e'),k*0.25+R()*0.2),x=>Math.atan(0.3*Math.cos(x*0.06+0.5))); dir=-dir; }
    /* wheat catching the light */
    for(let k=0;k<2;k++){ const xs=[]; for(let x=4;x<100;x+=8.4) xs.push(x); if(dir<0) xs.reverse(); xs.forEach(x=>{ const xx=x+(R()-0.5)*3, y=r2(xx)+6+k*9+(R()-0.5)*2; add(xx,y,Math.atan(0.275*Math.cos(xx*0.05+2.4))+(R()-0.5)*0.2,7.5,3.2,hex(R()<.5?'#ffe48a':'#ffd35e'),0.4); }); dir=-dir; }
    /* the sun: rings of curved strokes round a hot centre */
    const SX=71, SY=21;
    [[17,9,'#cfe8c4',5,17],[12.2,8,'#ffd14f',5.2,14],[7.2,6,'#ffe27a',5.2,10.5]].forEach(([rr,n,col,w,len])=>{ for(let i=0;i<n;i++){ const a=i/n*TAU+rr; add(SX+Math.cos(a)*rr,SY+Math.sin(a)*rr,a+Math.PI/2,len,w,hex(col).map(v=>v*(0.97+R()*0.06)),len/rr); } });
    for(let i=0;i<3;i++){ const a=i/3*TAU+0.5; add(SX+Math.cos(a)*1.8,SY+Math.sin(a)*1.8,a+Math.PI/2,6,4.8,hex('#fff7cc'),1.4); }
    /* one cumulus cloud, built in rows from its shaded base up to its bright crown */
    [[39.5,18.5,4,5.2,'#b9d7ee'],[40,14.4,3,5.6,'#e4f0fb'],[39.5,10.6,2,5.4,'#ffffff']].forEach(([cx,cy,n,gap,col])=>{ for(let i=0;i<n;i++){ const x=cx+(i-(n-1)/2)*gap; add(x,cy+Math.sin(i*2.1)*0.7,(i%2?-1:1)*0.1,9.5,4.6,hex(col),(i%2?-1:1)*0.7); } });
    /* the cypress, bottom up: long overlapping licks of paint, dark on the shaded side */
    const CYX=21, flame=y=>{ const f=clamp((y-11)/73); return 8.6*Math.pow(Math.sin(Math.pow(f,0.7)*Math.PI*0.94),0.8)+0.8; };
    for(let y=84;y>11;y-=7.6){ const W=flame(y), n=Math.max(1,Math.round(W/3)); for(let i=0;i<=n;i++){ const f=n?i/n:0.5, xx=CYX-W+f*2*W+(R()-0.5)*1.4, lean=(xx-CYX)*0.045+(R()-0.5)*0.1; add(xx,y+(R()-0.5)*3.4,-Math.PI/2+lean,12+R()*5,4.3,mix(hex('#468a4b'),hex('#0e3126'),clamp(f*0.86+(R()-0.5)*0.26)),(f-0.5)*0.8+(R()-0.5)*0.3); } }
    /* poppies in the near meadow, on a loose grid */
    for(let i=0;i<13;i++){ const x=8+i*7+(R()-0.5)*3.2, y=86+((i%3)-1)*5+(R()-0.5)*2; add(x,y,R()*TAU,3,3.4,hex(i%4===3?'#fff0d8':'#e8352c'),2.4); }
    const NS=strokes.length, ST=PAINT/NS;
    function paint(x,S,f){
      const n=S.pts.length-1, lim=f*n;
      const at=(s,o)=>{ const i=Math.min(n-1,Math.floor(s)), fr=s-i, p=S.pts[i], q=S.pts[i+1]; return [lerp(p[0],q[0],fr)+lerp(p[2],q[2],fr)*o,lerp(p[1],q[1],fr)+lerp(p[3],q[3],fr)*o]; };
      const trace=(o,a,b)=>{ const st=a*n, en=Math.min(lim,b*n); if(en<=st) return; x.beginPath(); const s0=at(st,o); x.moveTo(s0[0],s0[1]); for(let i=Math.ceil(st);i<en;i++){ const p=S.pts[i]; x.lineTo(p[0]+p[2]*o,p[1]+p[3]*o); } const e=at(en,o); x.lineTo(e[0],e[1]); x.stroke(); };
      x.lineCap='round'; x.lineJoin='round';
      x.save(); x.translate(0.42,0.6); x.strokeStyle='rgba(22,14,6,0.34)'; x.lineWidth=S.w*0.98; trace(0,0,1); x.restore();
      x.strokeStyle=S.base; x.lineWidth=S.w*0.9; trace(0,0.02,0.98);
      for(const b of S.br){ x.strokeStyle=b.c; x.lineWidth=b.lw; trace(b.o,b.a,b.b); }
    }
    /* bare primed canvas */
    const [BL,bl]=canvasOf(px);
    let g=bl.createRadialGradient(50,46,10,50,50,78); g.addColorStop(0,'#f4ecd9'); g.addColorStop(1,'#d9cfb8'); bl.fillStyle=g; bl.fillRect(0,0,100,100);
    const [WV,wv]=canvasOf(px);
    wv.lineWidth=0.14; for(let i=0;i<100;i+=0.72){ wv.strokeStyle='rgba(50,36,18,0.1)'; wv.beginPath(); wv.moveTo(i,0); wv.lineTo(i,100); wv.moveTo(0,i); wv.lineTo(100,i); wv.stroke(); }
    wv.lineWidth=0.14; for(let i=0.36;i<100;i+=0.72){ wv.strokeStyle='rgba(255,250,235,0.08)'; wv.beginPath(); wv.moveTo(i,0); wv.lineTo(i,100); wv.moveTo(0,i); wv.lineTo(100,i); wv.stroke(); }
    const [A,a]=canvasOf(px); let done=0; const STEP=70, MS=[];
    const stamp=()=>{ const [M,m]=canvasOf(px); m.setTransform(1,0,0,1,0,0); m.drawImage(A,0,0); return M; };
    a.setTransform(1,0,0,1,0,0); a.drawImage(BL,0,0); a.setTransform(sc,0,0,sc,0,0); MS.push(stamp());
    for(let i=0;i<NS;i++){ paint(a,strokes[i],1); if((i+1)%STEP===0) MS.push(stamp()); }
    done=NS;
    function seek(n){ if(n<done){ const m=Math.floor(n/STEP); a.setTransform(1,0,0,1,0,0); a.globalCompositeOperation='source-over'; a.drawImage(MS[m],0,0); a.setTransform(sc,0,0,sc,0,0); done=m*STEP; } while(done<n){ paint(a,strokes[done],1); done++; } }
    /* the brush rides a smoothed version of the stroke order */
    const WIN=6, path=strokes.map((_,i)=>{ let x=0,y=0,k=0; for(let j=Math.max(0,i-WIN);j<=Math.min(NS-1,i+WIN);j++){ x+=strokes[j].cx; y+=strokes[j].cy; k++; } return [x/k,y/k]; });
    function brush(c,x,y,col){
      c.save(); c.translate(x,y); c.rotate(0.62);
      c.fillStyle='rgba(0,0,0,0.25)'; c.beginPath(); c.roundRect(-1.2,-78,8,76,3); c.fill();
      let g=c.createLinearGradient(-3,0,3,0); g.addColorStop(0,'#d24b34'); g.addColorStop(0.45,'#f07a54'); g.addColorStop(1,'#a02f22'); c.fillStyle=g; c.beginPath(); c.moveTo(-2,-19); c.lineTo(-3.2,-80); c.lineTo(3.2,-80); c.lineTo(2,-19); c.closePath(); c.fill();
      g=c.createLinearGradient(-4,0,4,0); g.addColorStop(0,'#9aa0ab'); g.addColorStop(0.45,'#f2f4f8'); g.addColorStop(1,'#70757f'); c.fillStyle=g; c.beginPath(); c.moveTo(-3.8,-9.5); c.lineTo(-2.2,-20); c.lineTo(2.2,-20); c.lineTo(3.8,-9.5); c.closePath(); c.fill();
      c.fillStyle=col; c.beginPath(); c.moveTo(-3.8,-9.5); c.bezierCurveTo(-5,-5,-1.6,-2,0,0); c.bezierCurveTo(1.6,-2,5,-5,3.8,-9.5); c.closePath(); c.fill();
      c.strokeStyle='rgba(0,0,0,0.3)'; c.lineWidth=0.35; c.beginPath(); c.moveTo(-1.6,-9); c.quadraticCurveTo(-1.5,-4,-0.3,-1); c.moveTo(1.6,-9); c.quadraticCurveTo(1.5,-4,0.3,-1); c.stroke();
      c.restore();
    }
    return (c,t)=>{
      const u=t%P, n=clamp(Math.floor((u-T0-DUR)/ST)+1,0,NS);
      seek(n);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(A,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      for(let i=n;i<NS;i++){ const st=T0+i*ST; if(st>=u) break; paint(c,strokes[i],E.out(clamp((u-st)/DUR))); }
      c.setTransform(1,0,0,1,0,0); c.drawImage(WV,0,0); c.setTransform(sc,0,0,sc,0,0);
      /* a sheen rolls across the wet paint when it is finished */
      const sh=seg(u,3.7,4.5);
      if(sh>0&&sh<1){ const X=lerp(-40,140,E.inOut(sh)); const g=c.createLinearGradient(X-22,0,X+22,30); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(0.5,'rgba(255,255,255,0.3)'); g.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=g; c.fillRect(0,0,100,100); }
      const idx=clamp((u-T0)/ST,0,NS-1), i0=Math.floor(idx), i1=Math.min(NS-1,i0+1), f=idx-i0;
      const inB=E.out(seg(u,0,T0+0.1)), outB=E.inOut(seg(u,T0+PAINT+0.02,T0+PAINT+0.42));
      if(inB>0&&outB<1){ const x=lerp(path[i0][0],path[i1][0],f), y=lerp(path[i0][1],path[i1][1],f); brush(c,lerp(100,x,inB)+outB*44,lerp(-30,y,inB)-outB*44,strokes[i0].col); }
      const fade=E.inOut(seg(u,4.5,4.95));
      if(fade>0){ c.setTransform(1,0,0,1,0,0); c.globalAlpha=fade; c.drawImage(BL,0,0); c.drawImage(WV,0,0); c.globalAlpha=1; }
      c.setTransform(1,0,0,1,0,0);
    };
  }},

/* ------------------------------------------------------------------ HALFTONE */
{ id:'halftone', name:'Halftone Dots', section:'Drawing / Edge', isNew:true, still:2.2,
  line:'A glazed donut prints itself like a comic: a sweep turns smooth colour into dots, big in the shade and small in the light.',
  make(px){
    const P=4.4, sc=px/100, pitch=5.2, CX=50, CY=51, RO=41, RI=13.5, HOLE=RI+2.4, WID=0.3;
    const gr=a=>36.2+2.3*Math.sin(a*7+0.6)+1.1*Math.sin(a*13+2);
    function glaze(c){ c.beginPath(); for(let i=0;i<=200;i++){ const a=i/200*TAU, r=gr(a), x=CX+Math.cos(a)*r, y=CY+Math.sin(a)*r; if(i) c.lineTo(x,y); else c.moveTo(x,y); } c.closePath(); c.moveTo(CX+HOLE,CY); c.arc(CX,CY,HOLE,0,TAU,true); c.closePath(); }
    function ring(c,cx,cy){ c.beginPath(); c.arc(cx,cy,RO,0,TAU); c.closePath(); c.moveTo(cx+RI,cy); c.arc(cx,cy,RI,0,TAU,true); c.closePath(); }
    const [ART,a]=canvasOf(px);
    let g=a.createLinearGradient(0,0,100,100); g.addColorStop(0,'#8ae6f0'); g.addColorStop(0.55,'#3a9ee8'); g.addColorStop(1,'#1c56c4'); a.fillStyle=g; a.fillRect(0,0,100,100);
    a.fillStyle='rgba(10,30,110,0.6)'; ring(a,CX+4.5,CY+5); a.fill();
    g=a.createRadialGradient(42,40,10,50,51,46); g.addColorStop(0,'#ffd694'); g.addColorStop(0.62,'#f2a648'); g.addColorStop(1,'#b0601a'); a.fillStyle=g; ring(a,CX,CY); a.fill();
    g=a.createRadialGradient(38,32,2,50,51,47); g.addColorStop(0,'#ffcfe3'); g.addColorStop(0.38,'#ff78ae'); g.addColorStop(0.8,'#f03b86'); g.addColorStop(1,'#b21761'); a.fillStyle=g; glaze(a); a.fill();
    const [LN,l]=canvasOf(px);
    const INK='#17112e';
    /* sprinkles sit on two rings, evenly spaced, each one turned its own way */
    const r=rng(12), sprCols=['#fff7cf','#ffd63a','#58e1ff','#b6ff74','#ffffff'];
    let idx=0;
    [[23,10,0.25],[30.4,15,0.0]].forEach(([rad,n,off])=>{ for(let i=0;i<n;i++){ const ang=off+i/n*TAU+(r()-0.5)*0.12, deg=((ang%TAU)+TAU)%TAU; if(deg>3.3&&deg<4.55&&rad>25) continue; const rr=rad+(r()-0.5)*2.2, x=CX+Math.cos(ang)*rr, y=CY+Math.sin(ang)*rr, rot=r()*Math.PI; l.save(); l.translate(x,y); l.rotate(rot); l.fillStyle=INK; l.beginPath(); l.roundRect(-3.3,-1.45,6.6,2.9,1.45); l.fill(); l.fillStyle=sprCols[idx++%5]; l.beginPath(); l.roundRect(-2.7,-0.85,5.4,1.7,0.85); l.fill(); l.restore(); } });
    l.lineCap='round'; l.lineJoin='round'; l.strokeStyle=INK;
    l.lineWidth=1.25; { l.beginPath(); for(let i=0;i<=200;i++){ const b=i/200*TAU, rr=gr(b), x=CX+Math.cos(b)*rr, y=CY+Math.sin(b)*rr; if(i) l.lineTo(x,y); else l.moveTo(x,y); } l.closePath(); l.stroke(); }
    l.lineWidth=1.05; l.beginPath(); l.arc(CX,CY,HOLE,0,TAU); l.stroke();
    l.lineWidth=1.9; l.beginPath(); l.arc(CX,CY,RO,0,TAU); l.stroke(); l.beginPath(); l.arc(CX,CY,RI,0,TAU); l.stroke();
    /* comic gloss */
    l.strokeStyle='#ffffff'; l.lineWidth=3.2; l.beginPath(); l.arc(CX,CY,29.5,3.42,4.28); l.stroke(); l.lineWidth=2.6; l.beginPath(); l.arc(CX,CY,29.5,4.5,4.55); l.stroke();
    /* the dots: a 45 degree screen, each dot's size from how much ink that spot of the picture needs */
    const T=document.createElement('canvas'); T.width=T.height=200; const tc=T.getContext('2d',{willReadFrequently:true}); tc.drawImage(ART,0,0,200,200); const TD=tc.getImageData(0,0,200,200).data;
    const dots=[], c45=Math.SQRT1_2, FULL=pitch*0.82;
    for(let i=-34;i<=34;i++) for(let j=-34;j<=34;j++){
      const u=i*pitch, v=j*pitch, x=50+(u-v)*c45, y=50+(u+v)*c45; if(x<-pitch||x>100+pitch||y<-pitch||y>100+pitch) continue;
      const ix=clamp(Math.round(x*2),0,199), iy=clamp(Math.round(y*2),0,199), o=(iy*200+ix)*4, ink=1-Math.min(TD[o],TD[o+1],TD[o+2])/255, cov=clamp(Math.pow(ink,1.7)*1.02);
      dots.push({x,y,rt:Math.max(0.3,pitch*0.71*Math.sqrt(cov)),d:(x+y)/200});
    }
    return (c,t)=>{
      const u=t%P, inP=E.inOut(seg(u,0.35,1.55)), outP=E.inOut(seg(u,3.05,4.2));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      if(inP<=0||outP>=1){ c.drawImage(ART,0,0); c.drawImage(LN,0,0); return; }
      c.setTransform(sc,0,0,sc,0,0);
      c.fillStyle='#fff7e6'; c.fillRect(0,0,100,100);
      const pulse=u/P*TAU*2;
      c.beginPath();
      for(const D of dots){
        const q=E.inOut(clamp((inP*(1+WID)-D.d)/WID))*(1-E.inOut(clamp((outP*(1+WID)-D.d)/WID)));
        const rad=lerp(FULL,D.rt*(1+0.06*Math.sin(pulse-D.d*11)),q);
        c.moveTo(D.x+rad,D.y); c.arc(D.x,D.y,rad,0,TAU);
      }
      c.save(); c.clip(); c.setTransform(1,0,0,1,0,0); c.drawImage(ART,0,0); c.restore();
      c.setTransform(1,0,0,1,0,0); c.drawImage(LN,0,0);
    };
  }},

/* ------------------------------------------------------------------ LIVE WIRE */
{ id:'electricedges', name:'Live Wire', section:'Drawing / Edge', isNew:true, still:0.72,
  line:'A dark robot with live current crawling along every edge, surging until its eyes flare.',
  make(px){
    const P=3, FPS=20, N=Math.round(P*FPS), sc=px/100, SP=0.8;
    function build(cmds,closed){
      const out=[]; let cur=null;
      for(const m of cmds){
        if(m[0]==='M'){ cur=[m[1],m[2]]; out.push([cur[0],cur[1]]); }
        else if(m[0]==='L'){ const x=m[1], y=m[2], d=Math.hypot(x-cur[0],y-cur[1]), n=Math.max(1,Math.round(d/SP)); for(let i=1;i<=n;i++) out.push([lerp(cur[0],x,i/n),lerp(cur[1],y,i/n)]); cur=[x,y]; }
        else { const cx=m[1], cy=m[2], rr=m[3], a0=m[4], a1=m[5], n=Math.max(2,Math.round(Math.abs(a1-a0)*rr/SP)); for(let i=1;i<=n;i++){ const a=lerp(a0,a1,i/n); out.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]); } cur=out[out.length-1].slice(); }
      }
      if(closed) out.pop();
      const n=out.length, pts=out.map((p,i)=>{ const a=out[closed?(i+n-1)%n:Math.max(0,i-1)], b=out[closed?(i+1)%n:Math.min(n-1,i+1)], dx=b[0]-a[0], dy=b[1]-a[1], l=Math.hypot(dx,dy)||1; return [p[0],p[1],dy/l,-dx/l]; });
      return {pts,closed};
    }
    const H=Math.PI/2;
    const rrc=(x,y,w,h,r)=>build([['M',x+r,y],['L',x+w-r,y],['A',x+w-r,y+r,r,-H,0],['L',x+w,y+h-r],['A',x+w-r,y+h-r,r,0,H],['L',x+r,y+h],['A',x+r,y+h-r,r,H,2*H],['L',x,y+r],['A',x+r,y+r,r,2*H,3*H],['L',x+r,y]],true);
    const stalkR=Math.hypot(3,5.6), a0=Math.atan2(5.6,-3);
    const CON=[
      Object.assign(rrc(15,25,70,60,15),{amp:1,k:4,seed:1}),
      Object.assign(build([['M',15,46],['L',11,46],['A',11,50,4,-H,-2*H],['L',7,62],['A',11,62,4,-2*H,-3*H],['L',15,66]],false),{amp:0.75,k:1,seed:2}),
      Object.assign(build([['M',85,46],['L',89,46],['A',89,50,4,-H,0],['L',93,62],['A',89,62,4,0,H],['L',85,66]],false),{amp:0.75,k:1,seed:3}),
      Object.assign(build([['M',47,25],['L',47,13.6],['A',50,8,stalkR,a0,a0+TAU-2*(a0-H)],['L',53,25]],false),{amp:0.75,k:1,seed:4}),
      Object.assign(rrc(24,38,52,25,11.5),{amp:0.55,k:2,seed:5}),
      Object.assign(rrc(35,69.5,30,9,4.5),{amp:0.4,k:1,seed:6})
    ];
    CON.forEach(C=>{ let s=0; C.s=C.pts.map((p,i)=>{ if(i){ s+=Math.hypot(p[0]-C.pts[i-1][0],p[1]-C.pts[i-1][1]); } return s; }); });
    const SURGE=f=>{ const a=seg(f,9,12)*(1-seg(f,17,22)), b=seg(f,36,38)*(1-seg(f,43,49)); return Math.max(a,b); };
    const frames=[];
    for(let f=0;f<N;f++){
      const sg=SURGE(f), base=new Path2D(), hot=new Path2D(), sparks=new Path2D(), R=rng(4000+f*11);
      for(const C of CON){
        const pts=C.pts, n=pts.length;
        const dsp=(i,A)=>A*(vnoise(C.s[i]*0.5+f*3.31,C.seed)*0.7+vnoise(C.s[i]*1.5+f*5.13,C.seed+7)*0.3);
        const bA=(0.34+0.34*sg)*C.amp;
        /* the resting wire: fine, stays on the edge */
        for(let i=0;i<n;i+=2){ const p=pts[i], d=dsp(i,bA), x=p[0]+p[2]*d, y=p[1]+p[3]*d; if(i) base.lineTo(x,y); else base.moveTo(x,y); }
        if(C.closed) base.closePath();
        const runs=C.k, span=Math.round(n*(C.closed?0.15:0.5));
        for(let r=0;r<runs;r++){
          const head=Math.floor(((r/runs+2*f/N)%1)*n);
          /* a run: straight jagged legs, pinned to the wire at both ends */
          for(let j=0,sgn=1,jr=f*13+C.seed*5+r*3;j<=span;j+=2+Math.floor(hash(j+jr,C.seed+3)*4),sgn=(hash(j+jr,C.seed+5)<0.82)?-sgn:sgn){
            let i=head-j; if(C.closed) i=(i+n*2)%n; else if(i<0) break;
            const p=pts[i], g=Math.pow(Math.sin(j/span*Math.PI),0.7), d=sgn*(0.35+0.85*hash(j+jr,C.seed))*(1.3+0.95*sg)*C.amp*g, x=p[0]+p[2]*d, y=p[1]+p[3]*d;
            if(j) hot.lineTo(x,y); else hot.moveTo(x,y);
          }
          /* a fork leaps off the front of each run */
          if(C.amp>=0.75&&(f+r)%2===0){
            const p=pts[Math.min(n-1,head)], forks=sg>0.3?2:1;
            for(let q=0;q<forks;q++){
              let ang=Math.atan2(p[3],p[2])+(q?-1:1)*(0.35+R()*0.5), x=p[0], y=p[1]; sparks.moveTo(x,y);
              const L=(3+R()*3)*(1+sg*0.9), seg_=4;
              for(let s=0;s<seg_;s++){ ang+=(R()-0.5)*1.5; x+=Math.cos(ang)*L/2; y+=Math.sin(ang)*L/2; sparks.lineTo(x,y); }
            }
          }
        }
      }
      frames.push({sg,base,hot,sparks,flick:0.7+0.3*hash(f,31)});
    }
    const [BG,b]=canvasOf(px);
    let g=b.createRadialGradient(50,48,8,50,50,82); g.addColorStop(0,'#1f2a55'); g.addColorStop(0.55,'#0c1130'); g.addColorStop(1,'#03040c'); b.fillStyle=g; b.fillRect(0,0,100,100);
    b.save(); b.shadowColor='rgba(70,140,255,0.3)'; b.shadowBlur=8*sc; b.fillStyle='#000'; b.beginPath(); b.roundRect(15,25,70,60,15); b.fill(); b.restore();
    /* shoulders and neck */
    g=b.createLinearGradient(0,85,0,100); g.addColorStop(0,'#232a3d'); g.addColorStop(1,'#0e111b'); b.fillStyle=g; b.beginPath(); b.moveTo(18,100); b.quadraticCurveTo(20,92,33,91); b.lineTo(67,91); b.quadraticCurveTo(80,92,82,100); b.closePath(); b.fill();
    b.fillStyle='#161a28'; b.fillRect(38,84,24,8);
    b.fillStyle='rgba(255,255,255,0.05)'; for(let i=0;i<4;i++) b.fillRect(39,85.2+i*1.8,22,0.6);
    /* antenna */
    g=b.createLinearGradient(47,0,53,0); g.addColorStop(0,'#3a4258'); g.addColorStop(1,'#141826'); b.fillStyle=g; b.fillRect(47,12,6,14);
    g=b.createRadialGradient(47.8,5.8,0.6,50,8,7); g.addColorStop(0,'#3e4663'); g.addColorStop(1,'#10131f'); b.fillStyle=g; b.beginPath(); b.arc(50,8,6.6,0,TAU); b.fill();
    /* ears */
    g=b.createLinearGradient(7,0,15,0); g.addColorStop(0,'#2b3248'); g.addColorStop(1,'#141826'); b.fillStyle=g; b.beginPath(); b.roundRect(7,46,12,20,4); b.fill();
    g=b.createLinearGradient(85,0,93,0); g.addColorStop(0,'#141826'); g.addColorStop(1,'#0c0f1a'); b.fillStyle=g; b.beginPath(); b.roundRect(81,46,12,20,4); b.fill();
    /* head */
    g=b.createLinearGradient(15,25,85,85); g.addColorStop(0,'#3a435f'); g.addColorStop(0.5,'#1d2336'); g.addColorStop(1,'#0c0f1a'); b.fillStyle=g; b.beginPath(); b.roundRect(15,25,70,60,15); b.fill();
    b.strokeStyle='rgba(255,255,255,0.12)'; b.lineWidth=0.7; b.beginPath(); b.moveTo(30,26.2); b.lineTo(70,26.2); b.stroke();
    /* rivets */
    [[22,32],[78,32],[22,78],[78,78]].forEach(([x,y])=>{ const gg=b.createRadialGradient(x-0.6,y-0.7,0.1,x,y,2); gg.addColorStop(0,'#59627d'); gg.addColorStop(1,'#141826'); b.fillStyle=gg; b.beginPath(); b.arc(x,y,2,0,TAU); b.fill(); });
    /* visor */
    g=b.createLinearGradient(0,38,0,63); g.addColorStop(0,'#02030a'); g.addColorStop(1,'#0a1026'); b.fillStyle=g; b.beginPath(); b.roundRect(24,38,52,25,11.5); b.fill();
    b.fillStyle='rgba(120,160,255,0.09)'; b.beginPath(); b.moveTo(30,41); b.quadraticCurveTo(50,38.6,70,41); b.quadraticCurveTo(50,45,31,49); b.quadraticCurveTo(27,44,30,41); b.closePath(); b.fill();
    /* mouth grille */
    b.fillStyle='#04060e'; b.beginPath(); b.roundRect(35,69.5,30,9,4.5); b.fill();
    b.fillStyle='#232b43'; for(let i=0;i<5;i++) b.fillRect(41+i*4.1,70.5,1,7);
    const EY=document.createElement('canvas'); EY.width=EY.height=px; const e=EY.getContext('2d'); e.setTransform(sc,0,0,sc,0,0);
    [[38.5,50.5],[61.5,50.5]].forEach(([x,y])=>{ const gg=e.createRadialGradient(x,y,1,x,y,12); gg.addColorStop(0,'rgba(190,250,255,1)'); gg.addColorStop(0.32,'rgba(125,249,255,0.75)'); gg.addColorStop(1,'rgba(60,130,255,0)'); e.fillStyle=gg; e.beginPath(); e.arc(x,y,12,0,TAU); e.fill(); e.fillStyle='#f4feff'; e.beginPath(); e.arc(x,y,4.6,0,TAU); e.fill(); });
    return (c,t)=>{
      const u=t%P, F=frames[Math.min(N-1,Math.floor(u*FPS))], sg=F.sg;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.globalCompositeOperation='lighter';
      c.globalAlpha=(0.55+0.45*F.flick)*(0.75+0.25*sg); c.drawImage(EY,0,0); c.globalAlpha=1;
      c.setTransform(sc,0,0,sc,0,0);
      if(sg>0.01){ const g=c.createRadialGradient(50,55,10,50,55,62); g.addColorStop(0,'rgba(80,150,255,'+(0.24*sg)+')'); g.addColorStop(1,'rgba(80,150,255,0)'); c.fillStyle=g; c.fillRect(0,0,100,100); }
      c.lineJoin='round'; c.lineCap='round';
      const w=1+sg*0.22;
      c.strokeStyle='rgba(60,130,255,0.16)'; c.lineWidth=2.8*w; c.stroke(F.base);
      c.strokeStyle='rgba(125,249,255,0.55)'; c.lineWidth=0.95*w; c.stroke(F.base);
      c.strokeStyle='rgba(230,255,255,0.8)'; c.lineWidth=0.34; c.stroke(F.base);
      c.strokeStyle='rgba(90,120,255,0.22)'; c.lineWidth=5.6*w; c.stroke(F.hot);
      c.strokeStyle='rgba(125,249,255,0.75)'; c.lineWidth=1.9*w; c.stroke(F.hot);
      c.strokeStyle='#ffffff'; c.lineWidth=0.72; c.stroke(F.hot);
      c.strokeStyle='rgba(125,249,255,0.75)'; c.lineWidth=1.2; c.stroke(F.sparks);
      c.strokeStyle='#ffffff'; c.lineWidth=0.45; c.stroke(F.sparks);
      c.globalCompositeOperation='source-over';
      c.setTransform(1,0,0,1,0,0);
    };
  }}
);
})();
