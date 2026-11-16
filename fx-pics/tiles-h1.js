/* FreeMotion effect pictures, round 5 slot 1: Venetian Blinds (#1246 U1), redrawn on the upgraded kernel (the effects branch).
   Look Solid slats paints the closed strip of every slat in the Slat colour times
     f = 1 - Shading x (0.2 + 0.45 q + 0.35 across)
   where q is how far the slats have opened (Progress, with Stagger 0) and across runs 0..1 down each slat's own band (Angle 90,
   Opens from Side: the open strip is the top q of the band, the slat is the rest). f is linear in across, so one linear gradient
   per band, drawn over the closed strip only, is the kernel exactly; Progress 1 returns early and leaves the picture untouched.
   Everything but Look is at its default: 10 slats, Slat colour #e8e2d6, Shading 45 %. The tab is furniture, not the effect. */
(function(){
'use strict';
const {clamp,lerp,seg,E,photoCover}=window.FXK;

const INK='#16130f', BONE='#e7e2d5';
const MONO='"Courier Prime","Courier New",Courier,monospace';
const begin=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
/* a damped settle: 0 to 1 with one small overshoot */
const settle=p=>{ p=clamp(p); return p>=1?1:1-Math.exp(-7*p)*Math.cos(p*12); };
function tab(c,x,y,txt,bg,fg,size){ c.font='700 '+size+'px '+MONO; const w=c.measureText(txt).width+size*.9, h=size*1.45; c.fillStyle=bg; c.fillRect(x,y,w,h); c.fillStyle=fg; c.textBaseline='middle'; c.fillText(txt,x+size*.45,y+h*.54); c.textBaseline='alphabetic'; }

window.FX_TILES.push(

{ id:'blinds', name:'Venetian Blinds', section:'Keying', isNew:true, redrawn:true, still:3.4,
  line:'Look Solid slats, every other setting at its default (10 slats, Shading 45 %): as Progress opens the blind, each painted slat narrows and darkens, and the picture shows between them.',
  make(px){
    const [pic]=photoCover('huracan',px);
    const N=10, SW=100/N, SC=[232,226,214], SHADE=.45, P=5;
    /* Progress, keyframed: the photograph (1), the blind tilts shut (0) and holds, opens half way (0.5) with one small
       overshoot, holds, and opens out to the photograph again */
    const OPEN=.5;
    const prog=m=>{
      if(m<.6) return 1;
      if(m<1.3) return 1-E.inOut(seg(m,.6,1.3));
      if(m<1.8) return 0;
      if(m<4.3) return OPEN*settle(seg(m,1.8,2.7));
      if(m<4.8) return lerp(OPEN,1,E.inOut(seg(m,4.3,4.8)));
      return 1;
    };
    const rgb=f=>'rgb('+(SC[0]*f).toFixed(2)+','+(SC[1]*f).toFixed(2)+','+(SC[2]*f).toFixed(2)+')';
    const draw=(c,t)=>{ begin(c,px); const p=prog(((t%P)+P)%P);
      c.drawImage(pic,0,0,100,100);
      if(p<1){
        const q=clamp(p), a=1-SHADE*(.2+.45*q), b=a-SHADE*.35, shut=q<=0;
        for(let k=0;k<N;k++){ const y0=k*SW, yc=y0+q*SW, y1=y0+SW; if(y1-yc<1e-3) continue;
          const g=c.createLinearGradient(0,y0,0,y1); g.addColorStop(0,rgb(a)); g.addColorStop(1,rgb(b));
          /* shut, every slat meets the next: run each one a little under its neighbour so no hairline of photo shows between them */
          c.fillStyle=g; c.fillRect(0,yc,100,y1-yc+(shut&&k<N-1?.4:0));
        }
      }
      tab(c,3,3,'SOLID SLATS',INK,BONE,4.4);
    };
    draw.progressAt=t=>prog(((t%P)+P)%P);
    return draw;
  } }

);
})();
