/* g4: Ezra's review of the preview (10 Nov). Shockwave and Cube are the OLD round-1 tiles, copied unchanged from tiles-r1.js
   (he: "the old shockwave that you had was way better", "the old cube looked better as well because it had like different stuff
   on each side"). Fisheye is pushed to the effect's real maximum, Amount 1.00 ("it could be more extreme"). Loaded last, so these win. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;
window.FX_TILES.push(
{ id:'shockwave', name:'Shockwave', section:'Warping', isNew:true, still:1.04, polished:true,
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

{ id:'cube', name:'Cube', section:'3D', isNew:true, still:2.5, polished:true,
  line:'A cube turns in space with a different picture on each of its faces.',
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
  }},

/* FISHEYE (g4). The effect's own barrel remap from js/compositor.js, WARP_FX.fisheye: inside the lens (radius = half the
   diagonal at Lens size 100 %), source = centre + d * (1 - Amount * (1 - r^2)). Here Amount runs 0 -> 1.00, the slider's real
   maximum, and holds there: the middle balloons, the towers bow round it, and the four corners stay exactly where they were.
   Checked beside truth.html's real render at Amount 1 on the same photograph: same bubble, same bent ring. */
{ id:'fisheye', name:'Fisheye', section:'Warping', isNew:true, redrawn:true, still:2.4,
  line:'Turned up to full, the middle of the frame balloons and the towers bow round it, while the four corners stay where they were.',
  make(px){
    const NAVY='#161c28', DIM='#8b96a8', TEXT='#eef2f8', YEL='#ffce4a', TEAL='#29d9bb';
    const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
    const P=4.6, N=300, LV=12, KMAX=1;
    const [S0,s0]=photoCover('towers',N); s0.setTransform(1,0,0,1,0,0);
    const s=s0.getImageData(0,0,N,N).data;
    const cx=(N-1)/2, mr=Math.hypot(N/2,N/2), fr=[];
    for(let l=0;l<=LV;l++){
      const k=KMAX*l/LV, C=document.createElement('canvas'); C.width=C.height=N;
      const x=C.getContext('2d'), im=x.createImageData(N,N), o=im.data; let j=0;
      for(let y=0;y<N;y++){
        const dy=(y-cx)/mr;
        for(let xx=0;xx<N;xx++){
          const dx=(xx-cx)/mr, r2=dx*dx+dy*dy, f=r2>=1?1:1-k*(1-r2);
          const sx=clamp(cx+(xx-cx)*f,0,N-1.001), sy=clamp(cx+(y-cx)*f,0,N-1.001);
          const ix=sx|0, iy=sy|0, ax=sx-ix, ay=sy-iy, a=(iy*N+ix)*4, b=a+4, e=a+N*4, g=e+4;
          for(let q=0;q<3;q++) o[j+q]=(s[a+q]*(1-ax)+s[b+q]*ax)*(1-ay)+(s[e+q]*(1-ax)+s[g+q]*ax)*ay;
          o[j+3]=255; j+=4;
        }
      }
      x.putImageData(im,0,0); fr.push(C);
    }
    const X=7.5, Y=2.5, W=85;
    /* Amount over the loop: the plain shot, a decisive push to 1.00, a long hold, then back */
    const amountAt=u=> u<.7?0 : u<1.45? E.out(seg(u,.7,1.45)) : u<3.6? 1 : u<4.2? 1-E.inOut(seg(u,3.6,4.2)) : 0;
    return (c,t)=>{
      const u=((t%P)+P)%P, amt=amountAt(u);
      c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      const lv=clamp(amt/KMAX,0,1)*LV, i0=Math.floor(lv), i1=Math.min(LV,i0+1), q=lv-i0;
      c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      c.drawImage(fr[i0],X,Y,W,W);
      if(q>.02){ c.globalAlpha=q; c.drawImage(fr[i1],X,Y,W,W); c.globalAlpha=1; }
      /* the effect's Centre X / Y anchor */
      c.fillStyle=TEAL; c.fillRect(X+W/2-1.1,Y+W/2-1.1,2.2,2.2);
      /* the Amount slider, -1 to 1, keyed at 0 and 1 */
      const TX0=26, TX1=92.5, ty=94, xOf=v=>lerp(TX0,TX1,(v+1)/2);
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.moveTo(TX0,ty); c.lineTo(TX1,ty); c.stroke();
      c.fillStyle=YEL; [0,1].forEach(v=>{ const k=xOf(v); c.beginPath(); c.moveTo(k,ty-2.2); c.lineTo(k+2.2,ty); c.lineTo(k,ty+2.2); c.lineTo(k-2.2,ty); c.closePath(); c.fill(); });
      const hx=Math.min(xOf(amt),TX1-1.6); c.fillStyle=TEAL; c.fillRect(hx-1.6,ty-1.6,3.2,3.2);
      c.font=MONO(7); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='middle'; c.fillText(amt.toFixed(2),4,ty+.3);
      c.globalAlpha=1; c.globalCompositeOperation='source-over';
    };
  } }
);
})();
