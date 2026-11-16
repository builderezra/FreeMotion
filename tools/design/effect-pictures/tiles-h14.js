/* round 5 slot 14: SNOW & RAIN (#1248, shipped in v18.38: "The snow and rain effect should stay inside of the layer you add it to,
   not cover the whole screen."). Graded still on a dark frame. The photograph is ONE layer, a card in the frame, and the weather is
   CANVAS_FX.weather ported call for call (its murmur3 hash, depth, wind, sway, the soft 32 px sprite, rain's three depth bands), laid
   out over the whole 1080 frame and then kept only where the card's pixels are: the kernel's destination-in with the layer's own
   alpha, Area: Inside the layer, the new default. So the card gets exactly the flakes that fall over its part of the frame, and the
   frame around it gets none. Loop: the plain card, Snow on (a hard cut), cut to Rain, back to the plain card.
   Checked against the real renderer with probe-weather.js (the same card, the same settings): mean change inside the card within
   0.15 of real at every t, 0 outside. */
(function(){
'use strict';
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };

window.FX_TILES=window.FX_TILES||[];
window.FX_TILES.push(
{ id:'weather', name:'Snow & Rain', section:'Generative', isNew:true, redrawn:true, still:1.8,
  line:'Snow, then rain (Amount 450, Size 18 px, Streak 120 px) falls only on the photo layer it is added to (Area: Inside the layer, the default), never on the frame around it.',
  make(px){
    /* the frame (a new project's own background, black) and the card layer, in 0..100 units of a 1080 square frame; probe-weather.js
       builds the same scene for the real renderer */
    const BG='#000000', CX=7, CY=13, CW=86, CH=66, CROP=[18,76,284,218];
    const P=5, ON=.5, RAIN=2.9, OFF=4.7;
    /* the effect: Type Snow, then Rain; Area Inside the layer; Amount 450, Size 18 px, Streak 120 px; the rest at a new instance's
       defaults (Speed 1, Wind 20%, Depth 0.6, Opacity 0.85, Sway 1, Pattern 0, white). 1 unit = 10.8 px of the 1080 frame. */
    const AMT=450, SIZE=18, LEN=120, SPEED=1, WIND=.2, DEPTH=.6, OP=.85, SWAY=1, PXU=10.8;
    /* the card: tesla (the photograph this tile already used), its plate painted out as every tile does */
    const cw=Math.max(2,Math.round(CW*px/100)), ch=Math.max(2,Math.round(CH*px/100));
    const CARD=document.createElement('canvas'); CARD.width=cw; CARD.height=ch;
    { const g=CARD.getContext('2d'), im=window.FXK.photo('tesla'), [sx,sy,sw,sh]=CROP; g.imageSmoothingQuality='high';
      if(im) g.drawImage(im,sx,sy,sw,sh,0,0,cw,ch);
      const k=cw/sw, q=ch/sh; g.fillStyle='#b9cdd3'; g.fillRect((236-sx)*k,(190-sy)*q,24*k,17*q); }
    /* the kernel's flake sprite: 32 px, white, alpha 1 at the centre, 0.85 at 0.45, 0 at the rim */
    const SP=document.createElement('canvas'); SP.width=SP.height=32;
    { const g=SP.getContext('2d'), gr=g.createRadialGradient(16,16,0,16,16,16); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.45,'rgba(255,255,255,0.85)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,32,32); }
    /* the kernel's hash (murmur3's finaliser) on i*4+k, Pattern 0: deterministic, the same flakes as the app */
    const hs=k=>{ k=Math.imul(k+1,0x9e3779b1); k^=k>>>16; k=Math.imul(k,0x85ebca6b); k^=k>>>13; k=Math.imul(k,0xc2b2ae35); k^=k>>>16; return (k>>>0)/4294967296; };
    const h1=new Float64Array(AMT), h2=new Float64Array(AMT), h3=new Float64Array(AMT), h4=new Float64Array(AMT);
    for(let i=0;i<AMT;i++){ h1[i]=hs(i*4+1); h2[i]=hs(i*4+2); h3[i]=hs(i*4+3); h4[i]=hs(i*4+4); }
    const wrap=(v,lo,hi)=>{ const r=hi-lo; return lo+(((v-lo)%r)+r)%r; };
    const size=SIZE/PXU, len=LEN/PXU, swayK=.012*SWAY;
    /* SNOW: fall 0.12 frame heights a second at the nearest depth; far flakes smaller, slower, fainter */
    function snow(c,time){
      const fall=.12*SPEED, mY=SIZE*2/1080+.02, mX=.08;
      for(let i=0;i<AMT;i++){
        const near=1-DEPTH*h3[i]*.8, dy=fall*near*(.8+.4*h4[i])*time, sway=swayK*Math.sin(time*(.7+h4[i])*1.6+h1[i]*6.283);
        const y=wrap(h2[i]+dy,-mY,1+mY)*100, x=wrap(h1[i]+WIND*dy*.6+sway,-mX,1+mX)*100, d=size*2*near*(.7+.6*h4[i]);
        if(x+d<CX||x-d>CX+CW||y+d<CY||y-d>CY+CH) continue;   /* off the card: the kernel's destination-in removes it anyway */
        c.globalAlpha=OP*(.4+.6*near); c.drawImage(SP,x-d/2,y-d/2,d,d);
      }
    }
    /* RAIN: three depth bands, one path each; a streak along its velocity, so Wind slants it */
    function rain(c,time){
      const fall=1.4*SPEED, mY=LEN/1080+.02, mX=.08, dl=Math.hypot(WIND,1)||1;
      c.lineCap='round'; c.strokeStyle='#ffffff';
      for(let band=0;band<3;band++){
        const near=1-DEPTH*(band/2)*.8; c.globalAlpha=OP*(.35+.65*near); c.lineWidth=Math.max(.6/PXU,size*.35*near); c.beginPath();
        for(let i=band;i<AMT;i+=3){
          const v=near*(.85+.3*h3[i]), dy=fall*v*time, y=wrap(h2[i]+dy,-mY,1+mY)*100, x=wrap(h1[i]+WIND*dy,-mX,1+mX)*100, L=len*near*(.7+.6*h3[i]);
          c.moveTo(x,y); c.lineTo(x-WIND/dl*L,y-1/dl*L);
        }
        c.stroke();
      }
    }
    return (c,t)=>{
      const u=((t%P)+P)%P;
      reset(c,px); c.fillStyle=BG; c.fillRect(0,0,100,100);
      c.drawImage(CARD,CX,CY,CW,CH);
      if(u>=ON&&u<OFF){
        /* the effect's clock is the loop's, so the tile at u is the app's frame at t = u */
        c.save(); c.beginPath(); c.rect(CX,CY,CW,CH); c.clip();
        if(u<RAIN) snow(c,u); else rain(c,u);
        c.restore(); c.globalAlpha=1;
      }
    };
  }
}
);
})();
