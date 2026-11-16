/* round 5 slot 6: NUMBER ROLL, redrawn for #1246 U6 (Style Rolling digits). Replaces tiles-fix-4.js' plain count. */
(function(){ 'use strict';
const {clamp,seg}=window.FXK;
const VERM='#e4471d', INK='#16130f';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;

/* odometerState with trim, as TEXT_FX.counter calls it for Style Rolling digits: From 0 To 10 is two wheels (k 1 and 0). A wheel
   turns only while every wheel below it passes 9 -> 0; a leading zero at rest is no wheel at all, and while it turns it is a
   blank one rolling the 1 up into its place. Within a thousandth of a whole number the count IS that number, so nothing turns. */
function wheelsAt(value,count){
  let pos=Math.abs(value); const whole=Math.round(pos); if(Math.abs(pos-whole)<1e-3) pos=whole;
  const out=[]; let started=false;
  for(let j=0;j<count;j++){
    const k=count-1-j, P=Math.pow(10,k), q=Math.floor(pos/P), digit=q%10, r=pos-q*P, turn=r>P-1?Math.min(1,r-(P-1)):0;
    if(!started&&k>0&&digit===0){ if(turn===0) continue; out.push({digit:0,next:1,roll:turn,blank:true}); started=true; }
    else { started=true; out.push({digit,next:(digit+1)%10,roll:turn}); }
  }
  return out;
}

window.FX_TILES=window.FX_TILES||[];
window.FX_TILES.push(

/* NUMBER ROLL. Type poster, Ink on vermilion. TEXT_FX.counter with Style Rolling digits, From 0 To 10, Ease Out (1 - (1 - p)^3 laid
   on Progress), Progress keyed 0 -> 1 over 2.4 s, on a right-aligned text layer at 30 fps. drawOdometerLines' geometry: textBaseline
   middle, each turning wheel clipped to its own character box one font size tall, its digit leaving upwards by roll x size as the
   next comes up from one size below. Eased out, every digit rolls past on its own and the last count is the slowest: 9 -> 10 is
   46 % of the move, the 9 turning to 0 while a blank wheel rolls the 1 up beside it. Hold, then a hard cut back to the layer's 0. */
{ id:'counter', name:'Number Roll', section:'Text', isNew:true, redrawn:true, still:1.94,
  line:'Style Rolling digits, From 0 To 10, Ease Out: each digit rolls up into place like a counter wheel, and as the 9 turns to 0 a new wheel rolls the 1 in.',
  make(px){
    const P=4.6, T0=.45, SPAN=2.4, HOLD=4.2, FPS=30, TO=10, COLS=2, XR=96;
    const m=document.createElement('canvas').getContext('2d'); m.font=SANS(100);
    const a=m.measureText('0').width/100;            /* the font's tabular figure: its figure space is as wide */
    const FS=clamp(92/(COLS*a),50,74), A=a*FS, WIN=FS, YY=91.5-WIN/2;
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*FPS+1e-6)/FPS;
      c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.fillStyle=VERM; c.fillRect(0,0,100,100);
      /* Progress keyed 0 -> 1, eased out by the effect; then the keyframe back to 0 */
      const p=u>=HOLD?0:seg(u,T0,T0+SPAN), v=TO*(1-Math.pow(1-p,3));
      const W=wheelsAt(v,COLS), n=W.length;
      c.font=SANS(FS); c.fillStyle=INK; c.textAlign='left'; c.textBaseline='middle';
      for(let i=0;i<n;i++){
        const w=W[i], x=XR-(n-i)*A;
        if(!(w.roll>0)){ c.fillText(String(w.digit),x,YY); continue; }
        c.save(); c.beginPath(); c.rect(x,YY-WIN/2,A,WIN); c.clip();
        if(!w.blank) c.fillText(String(w.digit),x,YY-w.roll*WIN);
        c.fillText(String(w.next),x,YY+(1-w.roll)*WIN);
        c.restore();
      }
      c.font=MONO(4.6); c.fillStyle=INK; c.textBaseline='alphabetic'; c.textAlign='left';
      c.fillText('ROLLING DIGITS',5,10.5);
    };
  } }

);
})();
