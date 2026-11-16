/* Round 5, slot 12: CLOUDS, redrawn for the upgraded effect (#1246 clause 5, builder commits 6b052383 and 7f25fc46).
   A made still, no photograph. Two layers of a 1080 frame: a flat sky-blue layer carrying the effect, and above it a land layer
   (a far ridge blued by distance, a near ridge in shadow) that the effect never touches.
   The clouds are the effect's own maths, ported line for line from js/compositor.js on the effects branch (cloudG, cloudNoise,
   CLOUD_ROT, cloudField, cloudsSky): gradient noise with a quintic fade and eight directions, five octaves (Octaves 3, plus 2),
   each turned 37 degrees more than the last, offset, 2.03 times finer at half the weight, the largest 160 px x Scale. Cover sets
   the threshold the field must pass to be cloud, Edge softness how wide that edge is, and Shading darkens (and cools) a point by
   how much denser the field is just above it, so the undersides go grey-blue. Where it is not cloud the sky is untouched.
   Settings: Look Clouds, Scale 130 %, Amount .9, Edge softness 40 %, Shading 70 %, Drift 40 px/s, Octaves 3, Contrast 100 %,
   Boil 0, Cloud white. Cover is keyframed 0 to 40 % and back, in 5 % steps: each step is the kernel's exact frame. Cover 0 is
   not an empty sky (the field's highest peaks still pass), so the loop starts and ends on the plain layer (Amount 0) and the
   effect cuts on at Cover 0. The tile hands its layers and settings to the truth probe (draw.__real, probe-clouds.js), which runs
   the real renderer on the very same layers: a mean gap of 0.04 to 0.3 levels in 255 (shots/r5-clouds-truth.png). */
(function(){ 'use strict';
const {clamp,seg,E,vnoise}=window.FXK;
const mod=(t,P)=>((t%P)+P)%P;
const begin=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
function blank(W,H){ const C=document.createElement('canvas'); C.width=W; C.height=H||W; return [C,C.getContext('2d')]; }

/* ---- the effect's maths (effects branch js/compositor.js, cloudG / cloudNoise / CLOUD_ROT / cloudField), unchanged ---- */
const GX=[1,-1,0,0,0.7071,-0.7071,0.7071,-0.7071], GY=[0,0,1,-1,0.7071,0.7071,-0.7071,-0.7071];
const gi=(ix,iy,s)=>{ let h=(ix*374761393+iy*668265263+s*1103515245)|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return h&7; };
function cnoise(x,y,s){
  const x0=Math.floor(x), y0=Math.floor(y), fx=x-x0, fy=y-y0;
  const u=fx*fx*fx*(fx*(fx*6-15)+10), v=fy*fy*fy*(fy*(fy*6-15)+10);
  const a=gi(x0,y0,s), b=gi(x0+1,y0,s), c=gi(x0,y0+1,s), d=gi(x0+1,y0+1,s);
  const n00=GX[a]*fx+GY[a]*fy, n10=GX[b]*(fx-1)+GY[b]*fy, n01=GX[c]*fx+GY[c]*(fy-1), n11=GX[d]*(fx-1)+GY[d]*(fy-1);
  const p=n00+(n10-n00)*u, q=n01+(n11-n01)*u;
  return p+(q-p)*v;
}
const RC=[], RS=[]; for(let o=0;o<10;o++){ RC.push(Math.cos(o*0.6458)); RS.push(Math.sin(o*0.6458)); }
function cfield(X,Y,oct){
  let sum=0, amp=0.5, f=1, norm=0;
  for(let o=0;o<oct;o++){ const xr=(X*RC[o]-Y*RS[o])*f+o*17.13, yr=(X*RS[o]+Y*RC[o])*f-o*31.71; sum+=cnoise(xr,yr,o*101)*amp; norm+=amp; amp*=0.5; f*=2.03; }
  return 0.5+sum/norm;
}

/* ---- the land layer (not the effect): a far ridge blued by distance, a near ridge in shadow ---- */
const FAR='#2c435c', NEAR='#121715';
const farY=x=>79.6-2.4*Math.exp(-((x-21)/13)*((x-21)/13))+.85*vnoise(x/10,7)+.22*vnoise(x/3.1,8);
const nearY=x=>85.6-8.8*E.inOut(clamp((x-26)/64))+1.0*vnoise(x/7.5,3)+.38*vnoise(x/2.3,4);
function paintGround(g,S){
  g.save(); g.setTransform(S/100,0,0,S/100,0,0);
  for(const [fill,fy] of [[FAR,farY],[NEAR,nearY]]){
    g.fillStyle=fill; g.beginPath(); g.moveTo(-1,101);
    for(let x=-1;x<=101.01;x+=.5) g.lineTo(x,fy(x));
    g.lineTo(101,101); g.closePath(); g.fill();
  }
  g.restore();
}

window.FX_TILES=window.FX_TILES||[];
FX_TILES.push({ id:'clouds', name:'Clouds', section:'Generative', isNew:true, redrawn:true, still:2.7,
  line:'As Cover climbs 0 to 40 %, white clouds form on the sky layer with clear sky between and shaded undersides, and Drift 40 px/s carries them along (Look Clouds, Amount .9, Scale 130 %, Shading 70 %).',
  make(px){
    const P=5.4, PROJ=1080, SKY='#2f5b8c';
    const SC=130, AMT=.9, SOFT=.4, SHADE=.7, OCT=5, DR=40, CMAX=40, STEP=5;   /* Scale %, Amount, Edge softness, Shading, octaves (Octaves 3 + 2), Drift px/s, Cover % */
    const ON=.4, OFF=5.0;   /* the effect is on (Amount .9) from ON to OFF; before and after, the plain sky layer */
    const cell=160*SC/100, wd=0.015+SOFT*0.2, UP=0.06;
    /* the field over a strip as wide as the frame plus a whole loop of Drift, sampled at pixel centres in project px */
    const R=Math.max(64,Math.min(360,Math.round(px))), s=PROJ/R, SW=Math.ceil(R+DR*P/s)+2, N=SW*R;
    const F=new Float32Array(N), K=new Float32Array(N);
    const fMin=0.5+(0.5-CMAX/100)*0.5-wd/2;   /* below this no level here is cloud, so its shading is never seen */
    for(let j=0;j<R;j++){ const Y=((j+0.5)*s-0.5)/cell;
      for(let i=0;i<SW;i++){ const X=((i+0.5)*s-0.5)/cell, k=j*SW+i, f=cfield(X,Y,OCT); F[k]=f;
        if(f>fMin){ const kk=(cfield(X,Y-UP,Math.min(OCT,4))-f)*12; K[k]=kk<=0?0:(kk>=1?1:kk); } } }
    /* one canvas per Cover step: the cloud colour (white, shaded) at alpha = edge * Amount, so source-over on the sky is the kernel's mix */
    const LV=[];
    for(let q=0;q*STEP<=CMAX;q++){ const cover=q*STEP/100, th=0.5+(0.5-cover)*0.5, lo=th-wd/2;
      const [C,x]=blank(SW,R), im=x.createImageData(SW,R), d=im.data; let any=false;
      for(let k=0;k<N;k++){ const e=(F[k]-lo)/wd; if(e<=0) continue; const dn=e>=1?1:e*e*(3-2*e), sh=SHADE*K[k], o=k*4;
        d[o]=255*(1-0.42*sh); d[o+1]=255*(1-0.38*sh); d[o+2]=255*(1-0.26*sh); d[o+3]=dn*AMT*255; any=true; }
      if(any) x.putImageData(im,0,0);
      LV.push(any?C:null); }
    const [GR,gx]=blank(px); paintGround(gx,px);
    /* The plain sky; the effect cuts on at Cover 0 (only the field's highest peaks pass); Cover climbs to 40 % (eased, in 5 % steps);
       a long hold while Drift runs; Cover back down; the effect cuts off. */
    const coverAt=m=>CMAX*E.inOut(seg(m,ON,ON+1.05))*(1-E.inOut(seg(m,OFF-.68,OFF)));
    const levelAt=m=>Math.round(coverAt(m)/STEP);
    const isOn=m=>m>=ON&&m<OFF;
    const draw=(c,t)=>{ begin(c,px); const m=mod(t,P), L=isOn(m)?LV[levelAt(m)]:null;
      c.fillStyle=SKY; c.fillRect(0,0,100,100);
      if(L) c.drawImage(L,DR*m/s,0,R,R,0,0,100,100);
      c.drawImage(GR,0,0,100,100);
    };
    draw.__real={ sky:SKY, paintGround, local:t=>mod(t,P),
      paramsAt:t=>{ const m=mod(t,P); return {look:1,cover:levelAt(m)*STEP,soft:SOFT*100,shade:SHADE*100,amount:isOn(m)?AMT:0,scale:SC,drift:DR,detail:OCT-2,contrast:100,evolve:0,drifty:0}; } };
    return draw;
  } });
})();
