/* FreeMotion effect pictures, round 5 slot 5 (#1246 U5): Directional Blur, redrawn for the upgraded effect (Distance 60 -> 400 px,
   a dense smear past 60). Every frame is the effect's own maths on his photograph, built once in make(). */
(function(){ 'use strict';
const {seg,E,photoCover}=window.FXK;
const BONE='#e7e2d5', INK='#16130f', OFF='#6d685c';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const canvasN=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h; return [C,C.getContext('2d')]; };
/* the McLaren's number plate, blanked in photo units exactly as the tile this replaces did (tiles-fix-4.js PLATE_BLANK) */
const PLATE=['#b4553a',[[77.6,54.4],[92.9,51.4],[94,57.8],[78.9,61]]];

/* DIRECTIONAL BLUR. His McLaren, full frame. Distance climbs 0 -> 240 px of a 1080 frame (22 units), holds, and comes back;
   Angle 0, Smear Both ways, Quality 9 taps, Frame edges Repeat, so the frame stays solid to its edges.
   Each Distance shown is built the way compositor.js builds it: up to 60 px the nine taps ('lighter' at 1/9 each, from a plate
   whose outermost columns are carried outward: edgePadPlate); past 64 px dirBlurDense (halving and adding a copy shifted s, 2s,
   4s ... gives 2^m equal taps s apart across the Distance, laid back half the Distance); 60-64 px both, mixed by (D-60)/4.
   The tab reads the Distance on screen, with a bar that long. */
window.FX_TILES.push(
{ id:'motionblur', name:'Directional Blur', section:'Blur', isNew:true, redrawn:true, still:2.1,
  line:'Distance climbs from 0 to 240 px (of a 1080 frame) at Angle 0, Both ways, Frame edges Repeat: the whole photograph smears sideways into a solid streak, not a row of copies.',
  make(px){
    const P=4.4, PROJ=1080, LV=[0,6,18,36,62,96,136,178,214,240];
    const [S,sx]=photoCover('mclaren',px);
    sx.fillStyle=PLATE[0]; sx.beginPath(); PLATE[1].forEach((q,i)=>i?sx.lineTo(q[0],q[1]):sx.moveTo(q[0],q[1])); sx.closePath(); sx.fill();
    /* the photograph on a plate m px wider each side, its edge columns repeated outward (Frame edges: Repeat) */
    const padded=m=>{ const [C,x]=canvasN(px+2*m,px); x.drawImage(S,m,0); x.imageSmoothingEnabled=false;
      x.drawImage(C,m,0,1,px,0,0,m,px); x.drawImage(C,m+px-1,0,1,px,m+px,0,m,px); return C; };
    /* the effect at Distance Dp project px, Angle 0, Both ways */
    const frame=Dp=>{
      if(Dp<1) return S;
      const D=Dp*px/PROJ, fD=Dp>60?Math.min(1,(Dp-60)/4):0, [C,x]=canvasN(px,px);
      x.globalCompositeOperation='lighter';
      if(fD>0){
        const mx=Math.ceil(D)+2, PW=px+2*mx, m=Math.max(1,Math.ceil(Math.log2(D+1))), s=D/(Math.pow(2,m)-1);
        let A=padded(mx), [B]=canvasN(PW,px);
        for(let j=0,sh=s;j<m;j++,sh*=2){
          const g=B.getContext('2d'); g.globalCompositeOperation='source-over'; g.globalAlpha=1; g.clearRect(0,0,PW,px);
          g.globalCompositeOperation='lighter'; g.globalAlpha=.5; g.drawImage(A,0,0); g.drawImage(A,sh,0);
          const tmp=A; A=B; B=tmp;
        }
        x.globalAlpha=fD; x.drawImage(A,-D/2-mx,0);
      }
      if(fD<1){
        const N=9, half=4, step=D/(N-1), mx=Math.ceil(half*step)+1, T=padded(mx);
        x.globalAlpha=(1-fD)/N; for(let k=0;k<N;k++) x.drawImage(T,(k-half)*step-mx,0);
      }
      return C;
    };
    const F=LV.map(frame);
    return (c,t)=>{
      const u=mod(t,P), d=240*(E.inOut(seg(u,.55,1.05))-E.inOut(seg(u,3.3,3.8)));
      let k=0; while(k+1<LV.length&&LV[k+1]<=d+1e-6) k++;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      /* the project's background first: nine taps at 1/9 each leave the layer 252/255 opaque, as the real one is */
      c.fillStyle='#151a24'; c.fillRect(0,0,px,px); c.drawImage(F[k],0,0,px,px);
      c.setTransform(px/100,0,0,px/100,0,0);
      /* one tab, on the dark road: the Distance on screen and a bar exactly that long (Both ways: half each side of where a point was) */
      const on=LV[k]>0, col=on?BONE:OFF, L=LV[k]*100/PROJ, X=67, Y=80.5, W=29, H=15.5, x0=X+3.2, ym=Y+4.6;
      c.fillStyle=INK; c.fillRect(X,Y,W,H);
      c.strokeStyle=col; c.lineWidth=.9; c.lineCap='butt';
      c.beginPath(); c.moveTo(x0,ym-1.8); c.lineTo(x0,ym+1.8); if(L>.5){ c.moveTo(x0,ym); c.lineTo(x0+L,ym); c.moveTo(x0+L,ym-1.8); c.lineTo(x0+L,ym+1.8); } c.stroke();
      c.font=MONO(6.2); c.fillStyle=col; c.textAlign='left'; c.textBaseline='middle'; c.fillText(LV[k]+' PX',x0-.4,Y+11.2);
    };
  } }
);
})();
