/* FreeMotion effect pictures, round 5 slot 7: Lens Flare (#1246 U8), redrawn for its new Ghost shape and Ghost colour.
   Every bit of light is the effect's own maths (js/compositor.js PIXEL_FX.lensflare on the effects branch): the core (and
   rays, when Rays is above 0), the ghosts on the line from the light through the middle of the frame (hexagons turned with
   Rotation, tinted by Ghost colour) and the anamorphic streak are summed, then screened over the photograph once, exactly as
   the kernel does. The only motion is the light itself: Light X keyframed between two places on the horizon, with holds. */
(function(){
'use strict';
const {clamp,lerp,seg,photo}=window.FXK;
const mk=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=(h===undefined?w:h); return C; };
const loopT=(t,P)=>((t%P)+P)%P;
window.FX_TILES=window.FX_TILES||[];

FX_TILES.push({ id:'lensflare', name:'Lens Flare', section:'Generative', isNew:true, redrawn:true, still:1.0,
  line:'Seven ghosts with Ghost shape Hexagon and Ghost colour 80 (Intensity 1.4, Rays 0, Core size 40 %, Anamorphic streak 0.5), and Light X keyframed along the horizon, so the ghosts swing through the middle.',
  make(px){
    /* The settings the line names, with Light Y at 0.72 (the horizon); everything else is the effect's default (Flare and Rays
       colour #fff0d2, Rotation 0, Ring 0). Truth-checked against the effects-branch renderer with exactly these numbers. */
    const FL=[255,240,210], I=1.4, SIZE=40, RAYS=0, ROT=0, NGH=7, GCOL=80, HALO=0, STK=.5;
    const P=5.6, AX=78, BX=30, LY=72;
    const sc=px/100;
    /* CORE (gaussian, sigma 0.18 W x Core size) and RAYS (cos^32 of the angle to the nearest ray, falling off over 0.35 of the
       diagonal). With rays the sprite is 200 units so it covers the frame from anywhere; a bare core fades out by 4.2 sigma. */
    const sig=18*SIZE/100, den=2*sig*sig, step=RAYS===6?1.0471975512:(RAYS>0?2*Math.PI/RAYS:0), ex=RAYS<=6?32:32*(RAYS/6)*(RAYS/6), fallL=Math.SQRT2*100*.35;
    const SU=RAYS>0?200:Math.ceil(sig*8.4), SS=RAYS>0?Math.max(256,Math.min(720,Math.round(px*1.15))):Math.max(64,Math.ceil(SU*sc)), ku=SU/SS;
    const star=mk(SS);
    { const g=star.getContext('2d'), im=g.createImageData(SS,SS), d=im.data;
      for(let y=0;y<SS;y++){ const dy=(y+.5)*ku-SU/2;
        for(let x=0;x<SS;x++){ const dx=(x+.5)*ku-SU/2, d2=dx*dx+dy*dy, r=Math.sqrt(d2), i=(y*SS+x)*4;
          let v=I*255*Math.exp(-d2/den);
          if(RAYS>0&&r>.05){ const a=Math.atan2(dy,dx)-ROT, dA=a-Math.round(a/step)*step, b=Math.cos(dA); if(b>0) v+=I*150*Math.pow(b,ex)*Math.exp(-r/fallL); }
          d[i]=Math.min(255,FL[0]*v/255); d[i+1]=Math.min(255,FL[1]*v/255); d[i+2]=Math.min(255,FL[2]*v/255); d[i+3]=255; } }
      g.putImageData(im,0,0); }
    /* GHOSTS: the kernel's table (place along light-to-middle, radius of the short side, strength, tint). Ghost colour 80 takes
       each tint 1.6 times as far from the Flare colour as the old fixed tints (50); Hexagon is the largest of three edge
       distances over the apothem, the edge normals turned with Rotation, so the corners touch the circle a round ghost fills. */
    const GT=[[1.35,.050,.45,1,.85,.55],[1.75,.090,.34,.55,1,.70],[.62,.032,.52,.70,.80,1],[2.10,.130,.26,1,.70,.95],
              [1.12,.024,.58,.95,1,.60],[.40,.056,.34,.60,.90,1],[2.45,.170,.20,1,.80,.65],[1.95,.040,.44,.75,.65,1]];
    const gm=GCOL/50, tint=v=>GCOL===50?v:clamp(1-(1-v)*gm);
    const HC=[0,1,2].map(h=>Math.cos(ROT+h*Math.PI/3)/.8660254037844386), HS=[0,1,2].map(h=>Math.sin(ROT+h*Math.PI/3)/.8660254037844386);
    const ghosts=GT.slice(0,NGH).map(gt=>{
      const r=100*gt[1], Z=Math.max(8,Math.ceil(2*r*sc)), C=mk(Z), g=C.getContext('2d'), im=g.createImageData(Z,Z), d=im.data;
      const a=I*255*gt[2], cr=FL[0]*tint(gt[3])/255, cg=FL[1]*tint(gt[4])/255, cb=FL[2]*tint(gt[5])/255;
      for(let y=0;y<Z;y++){ const gy=((y+.5)/Z*2-1)*r;
        for(let x=0;x<Z;x++){ const gx=((x+.5)/Z*2-1)*r, i=(y*Z+x)*4; d[i+3]=255;
          const h0=Math.abs(gx*HC[0]+gy*HS[0]), h1=Math.abs(gx*HC[1]+gy*HS[1]), h2=Math.abs(gx*HC[2]+gy*HS[2]), rho=Math.max(h0,h1,h2)/r;
          if(rho>=1) continue;
          const r4=rho*rho*rho*rho; let e=(1-rho)/.18; if(e>1) e=1; const v=a*(.55+.45*r4)*e;
          d[i]=cr*v; d[i+1]=cg*v; d[i+2]=cb*v; } }
      g.putImageData(im,0,0); return {k:gt[0],r,img:C}; });
    /* RING (0 here): three gaussians at 0.3 of the short side, red outside, blue inside. */
    const RH=30*1.04+1.6*4.5, ring=HALO>0?(()=>{ const Z=Math.ceil(2*RH*sc), C=mk(Z), g=C.getContext('2d'), im=g.createImageData(Z,Z), d=im.data, R0=30, RD=2*1.6*1.6, RA=HALO*I*120;
      for(let y=0;y<Z;y++) for(let x=0;x<Z;x++){ const dx=((x+.5)/Z*2-1)*RH, dy=((y+.5)/Z*2-1)*RH, r=Math.sqrt(dx*dx+dy*dy), i=(y*Z+x)*4, e0=r-R0*1.04, e1=r-R0, e2=r-R0*.96;
        d[i]=FL[0]*RA*Math.exp(-e0*e0/RD)/255; d[i+1]=FL[1]*RA*Math.exp(-e1*e1/RD)/255; d[i+2]=FL[2]*RA*Math.exp(-e2*e2/RD)/255; d[i+3]=255; }
      g.putImageData(im,0,0); return C; })():null;
    /* STREAK: a thin bright line (sigma 0.35 % of the short side) inside a soft one (2 %), fading over 45 % of the width, always level. */
    const SH=Math.sqrt(2*2*2*9), streak=STK>0?(()=>{ const ZW=512, ZH=Math.max(24,Math.ceil(2*SH*sc)), C=mk(ZW,ZH), g=C.getContext('2d'), im=g.createImageData(ZW,ZH), d=im.data, SD1=2*.35*.35, SD2=2*2*2, SA=STK*I;
      for(let y=0;y<ZH;y++){ const dy=((y+.5)/ZH*2-1)*SH, vy=SA*(190*Math.exp(-dy*dy/SD1)+55*Math.exp(-dy*dy/SD2));
        for(let x=0;x<ZW;x++){ const dx=((x+.5)/ZW*2-1)*100, v=vy*Math.exp(-Math.abs(dx)/45), i=(y*ZW+x)*4; d[i]=FL[0]*v/255; d[i+1]=FL[1]*v/255; d[i+2]=FL[2]*v/255; d[i+3]=255; } }
      g.putImageData(im,0,0); return C; })():null;
    const acc=mk(px), ax=acc.getContext('2d');
    /* the photograph resampled once, so every frame blits the same pixels (a scaled draw each frame came out a little
       different after the first one in Chrome, which moved the picture between loops) */
    const ph=photo('ramp'), bgC=mk(px);
    { const g=bgC.getContext('2d'); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; if(ph) g.drawImage(ph,0,0,px,px); else { g.fillStyle='#16130f'; g.fillRect(0,0,px,px); } }
    /* Light X keyframes 0.78 (1.5 s) to 0.30 (2.5 s), held to 4.1 s, back to 0.78 at 5.1 s, both moves on the app's own Ease In-Out */
    const ease=f=>f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2;
    return (c,t)=>{
      const T=loopT(t,P);
      let m=0;
      if(T>=1.5&&T<2.5) m=ease(seg(T,1.5,2.5)); else if(T>=2.5&&T<4.1) m=1; else if(T>=4.1&&T<5.1) m=1-ease(seg(T,4.1,5.1));
      const lx=lerp(AX,BX,m), ly=LY;
      /* the light the kernel adds, summed first (lighter saturates at 255 where the kernel's screen does too) */
      ax.setTransform(1,0,0,1,0,0); ax.globalAlpha=1; ax.globalCompositeOperation='source-over'; ax.fillStyle='#000'; ax.fillRect(0,0,px,px);
      ax.setTransform(sc,0,0,sc,0,0); ax.globalCompositeOperation='lighter'; ax.imageSmoothingEnabled=true; ax.imageSmoothingQuality='high';
      ax.drawImage(star,lx-SU/2,ly-SU/2,SU,SU);
      if(streak) ax.drawImage(streak,lx-100,ly-SH,200,2*SH);
      if(ring) ax.drawImage(ring,lx-RH,ly-RH,2*RH,2*RH);
      for(const g of ghosts){ const gx=lx+(50-lx)*g.k, gy=ly+(50-ly)*g.k; ax.drawImage(g.img,gx-g.r,gy-g.r,2*g.r,2*g.r); }
      /* the photograph, then that light screened over it once */
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(bgC,0,0);
      c.globalCompositeOperation='screen'; c.drawImage(acc,0,0);
      c.globalCompositeOperation='source-over';
    };
  }});
})();
