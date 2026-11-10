/* FreeMotion effect pictures, artist 9 (c9): seven Blur tiles. No photographs: every subject is drawn here, and every effect is the
   effect's own maths from js/compositor.js run on that drawing. Scale: a tile is a 1080 px frame unless its note says otherwise. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const unitSheet=(n)=>{ const [C,x]=sheet(n); x.setTransform(n/100,0,0,n/100,0,0); return [C,x]; };
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const poly=(c,pts)=>{ c.beginPath(); for(let i=0;i<pts.length;i+=2){ i?c.lineTo(pts[i],pts[i+1]):c.moveTo(pts[i],pts[i+1]); } c.closePath(); };
const diamond=(c,x,y,r,fill)=>{ c.fillStyle=fill; c.beginPath(); c.moveTo(x,y-r); c.lineTo(x+r,y); c.lineTo(x,y+r); c.lineTo(x-r,y); c.closePath(); c.fill(); };
const lum=(d,i)=>.299*d[i]+.587*d[i+1]+.114*d[i+2];
/* the app's three-box Gaussian (boxesForGauss, Kovesi), edge pixels repeat: what Soften Skin blurs with */
function boxesForGauss(sigma){ const n=3, wI=Math.sqrt(12*sigma*sigma/n+1); let wl=Math.floor(wI); if(wl%2===0) wl--; const m=Math.round((12*sigma*sigma-n*wl*wl-4*n*wl-3*n)/(-4*wl-4)); const out=[]; for(let i=0;i<n;i++) out.push(Math.max(0,((i<m?wl:wl+2)-1)/2)); return out; }
function gaussRGB(src,W,H,sigma){ let a=Float32Array.from(src), b=new Float32Array(src.length);
  const pass=(from,to,r,horiz)=>{ const len=horiz?W:H, lines=horiz?H:W, step=horiz?4:W*4, w=2*r+1;
    for(let l=0;l<lines;l++){ const base=horiz?l*W*4:l*4; for(let ch=0;ch<3;ch++){ let acc=0; for(let k=-r;k<=r;k++) acc+=from[base+Math.min(len-1,Math.max(0,k))*step+ch];
      for(let x=0;x<len;x++){ to[base+x*step+ch]=acc/w; acc+=from[base+Math.min(len-1,x+r+1)*step+ch]-from[base+Math.max(0,x-r)*step+ch]; } } } };
  boxesForGauss(Math.max(.5,sigma)).forEach(r=>{ r=Math.round(r); if(r<1) return; pass(a,b,r,true); pass(b,a,r,false); });
  return a; }
const toCanvas=(W,H,data)=>{ const [C,x]=sheet(W,H); const im=x.createImageData(W,H); im.data.set(data); x.putImageData(im,0,0); return C; };

/* ---------------------------------------------------------------------------------------------------------------------------- */
/* LIGHT STREAKS, graded still: two floodlight masts at night, drawn here. linstreaks' own loop: Length in px of a 1080 frame, Quality
   24 taps, Streaks: Both ways, Angle 0. Each tap weighs (luma)^2 x (1 - k/(Q+1)), the sum over Q/2, screened over the picture. */
function paintFloods(x){
  x.fillStyle='#0a0c11'; x.fillRect(0,0,100,100);
  const mast=(bx,by,tx,ty,bw,tw)=>{ x.strokeStyle='#2a2f39'; x.lineWidth=.55; x.lineCap='butt';
    x.beginPath(); x.moveTo(bx-bw,by); x.lineTo(tx-tw,ty); x.moveTo(bx+bw,by); x.lineTo(tx+tw,ty); x.stroke();
    const n=Math.round((by-ty)/3.2); x.beginPath(); for(let i=0;i<n;i++){ const f0=i/n, f1=(i+1)/n, w0=lerp(bw,tw,f0), w1=lerp(bw,tw,f1), c0=lerp(bx,tx,f0), c1=lerp(bx,tx,f1), y0=lerp(by,ty,f0), y1=lerp(by,ty,f1); const s=i%2?1:-1; x.moveTo(c0-s*w0,y0); x.lineTo(c1+s*w1,y1); } x.stroke(); };
  const head=(cx,cy,w,h,deg,cols,rows,r)=>{ x.save(); x.translate(cx,cy); x.rotate(deg*Math.PI/180);
    x.fillStyle='#161a21'; x.fillRect(-w/2,-h/2,w,h); x.strokeStyle='#2e333d'; x.lineWidth=.5; x.strokeRect(-w/2,-h/2,w,h);
    const gx=w/cols, gy=h/rows;
    for(let j=0;j<rows;j++) for(let i=0;i<cols;i++){ const lx=-w/2+gx*(i+.5), ly=-h/2+gy*(j+.5);
      x.fillStyle='#3b3d3f'; x.beginPath(); x.arc(lx,ly,r*1.18,0,TAU); x.fill();
      x.fillStyle=((i*7+j*3)%5===0)?'#fff1cc':'#fffbee'; x.beginPath(); x.arc(lx,ly,r,0,TAU); x.fill(); }
    x.restore(); };
  mast(83,100,81,50,1.5,.8); head(81,45.5,15.5,8.6,-5,4,2,1.25);
  mast(30,100,37,34,3.4,1.4); head(37,21,39,21.5,4,6,3,2.35);
  /* the stand: a roof edge with its row of lamps, the only thing on the ground */
  x.fillStyle='#12151b'; poly(x,[0,87,100,78.5,100,100,0,100]); x.fill();
  x.strokeStyle='#262b34'; x.lineWidth=.6; x.beginPath(); x.moveTo(0,87); x.lineTo(100,78.5); x.stroke();
  x.fillStyle='#fff6dc'; for(let i=0;i<17;i++){ const px=2.5+i*6.1, py=lerp(87,78.5,px/100)+1.5; x.beginPath(); x.arc(px,py,.6,0,TAU); x.fill(); }
}

/* MOSAIC, two-ink print: a black-figure amphora, the clay in the vermilion plate and the glaze in the ink plate, on bone, drawn here.
   mosaic's own blocks: Block size in px of a 1080 frame, anchored top left, each the mean of its block; Gap 24 % with Gap shows: Colour,
   the colour set to bone, so it reads as grout. (Checker k1: this was a chess knight, the subject Shadow Bloom and Checker also use.) */
const AMX=63;
function amphoraPath(x){
  const c=AMX; x.beginPath();
  x.moveTo(c-8.6,7); x.lineTo(c+8.6,7); x.lineTo(c+8,10.6); x.lineTo(c+5.4,12.4);
  x.bezierCurveTo(c+5,17,c+5.2,21,c+6.2,24.4);
  x.bezierCurveTo(c+15,27.6,c+23.6,35,c+23.4,47);
  x.bezierCurveTo(c+23,60,c+14,70.6,c+6,76.6);
  x.lineTo(c+5.2,80.4); x.lineTo(c+10,85.6); x.lineTo(c+10,88); x.lineTo(c-10,88); x.lineTo(c-10,85.6); x.lineTo(c-5.2,80.4); x.lineTo(c-6,76.6);
  x.bezierCurveTo(c-14,70.6,c-23,60,c-23.4,47);
  x.bezierCurveTo(c-23.6,35,c-15,27.6,c-6.2,24.4);
  x.bezierCurveTo(c-5.2,21,c-5,17,c-5.4,12.4);
  x.lineTo(c-8,10.6); x.closePath();
}
function paintAmphora(x){
  const c=AMX;
  x.fillStyle=BONE; x.fillRect(0,0,100,100);
  /* the vermilion plate: the clay body, and the long shelf it stands on, run off both edges */
  x.fillStyle=VERM; amphoraPath(x); x.fill(); x.fillRect(0,88,100,12);
  /* the ink plate, 0.7 out of register, overprinted: neck and handles, the black glaze below the frieze, the foot, two bands */
  x.save(); x.globalCompositeOperation='multiply'; x.translate(.7,-.5); x.fillStyle=INK; x.strokeStyle=INK;
  x.save(); amphoraPath(x); x.clip();
  /* the glaze: neck, lower body, two bands round the plain clay belly; no figures, the belly stays one flat colour */
  x.fillRect(c-30,0,60,25.6); x.fillRect(c-30,58.6,60,40); x.fillRect(c-30,30.2,60,1.8); x.fillRect(c-30,53.4,60,1.8);
  x.restore();
  x.lineWidth=2.6; x.lineCap='butt';
  for(const s of [-1,1]){ x.beginPath(); x.moveTo(c+s*5,13.6); x.bezierCurveTo(c+s*17,12.6,c+s*19.4,18,c+s*16.6,29.4); x.stroke(); }
  /* the shelf's front edge */
  x.fillRect(0,92.6,100,7.4);
  x.restore();
  /* paper showing through the glaze: two fine reserved lines on the neck */
  x.save(); x.translate(.7,-.5); x.fillStyle=BONE; x.fillRect(c-5.6,16.6,11.2,.7); x.fillRect(c-5.8,20.2,11.6,.7); x.restore();
  /* speckle: paper through the ink, ink on the paper */
  const R=rng(41);
  for(let i=0;i<520;i++){ const sx=R()*100, sy=R()*100, r=.12+R()*.22; x.fillStyle=R()<.5?'rgba(231,226,213,.55)':'rgba(22,19,15,.25)'; x.fillRect(sx,sy,r,r); }
}

/* MOTION BLUR (FOOTAGE), overhead footage of a curling stone sliding past the house, the camera locked off. Style Smear, Shutter 3: the sharp
   frame, then ten copies of the part that changed since the last frame, spread along that frame's own motion at 0.16 each. The stone
   is granite, and the real effect tracks movement by texture: measured on this footage, its vector is the stone's own travel. */
const ICE='#e2e5e4';
function paintSheet(x){
  x.fillStyle=ICE; x.fillRect(0,0,100,100);
  /* the house, static, cut off by the frame */
  const cx=90, cy=96; [[34,'#22324a'],[25,ICE],[16,VERM],[7,ICE]].forEach(([r,c])=>{ x.fillStyle=c; x.beginPath(); x.arc(cx,cy,r,0,TAU); x.fill(); });
  x.fillStyle='#22324a'; x.fillRect(0,cy-.35,100,.7); x.fillRect(cx-.35,62,.7,cy-62);
}
/* the stone's centre, in units: in from the left at 80 units a second, slowing to 55 on the ice, out to the right, then the empty
   sheet holds before the next one; the footage is 30 fps */
const stoneX=u=>u<2.2? -24+80*u-5.68*u*u : 400;
const STONE_Y=38, STONE_R=19.5;
function stoneSprite(n){
  const k=n/100, D=Math.ceil(2*STONE_R*k)+2, [C,x]=sheet(D), R=rng(31);
  x.setTransform(k,0,0,k,0,0); x.translate(D/k/2,D/k/2);
  x.save(); x.beginPath(); x.arc(0,0,STONE_R,0,TAU); x.clip();
  x.fillStyle='#8a8d92'; x.fillRect(-STONE_R,-STONE_R,2*STONE_R,2*STONE_R);
  for(let i=0;i<3400;i++){ const a=R()*TAU, r=Math.sqrt(R())*STONE_R, s=.2+R()*.6, v=R(); x.fillStyle=v<.35?'#3b3e43':v<.7?'#c6c9cd':'#66696f'; x.beginPath(); x.arc(Math.cos(a)*r,Math.sin(a)*r,s,0,TAU); x.fill(); }
  x.restore();
  /* the running band, then the handle */
  x.strokeStyle='#4a4d52'; x.lineWidth=1.8; x.beginPath(); x.arc(0,0,STONE_R-.9,0,TAU); x.stroke();
  x.fillStyle='#55585d'; x.beginPath(); x.arc(0,0,4.4,0,TAU); x.fill();
  x.fillStyle=VERM; poly(x,[-11,-2.6, 5.8,-2.6, 7.2,-1.5, 7.2,1.5, 5.8,2.6, -11,2.6]); x.fill();
  return {C, s:D/k};
}

/* MOTION BLUR (OBJECT), viewer overlay: a layer, an ace of spades, is dealt between two keyframes. drawMotionBlur's own average: 16
   copies of the layer at midpoint sub-times across the shutter window (Shutter 2 at 30 fps is 1/15 s), summed at 1/16. Still, it stays
   sharp. (Checker k1: the layer was an arrow, and Stripes, Brick Slide and Depth Push already show arrows.) */
const CARD_W=21, CARD_H=29.5, CARD_ROT=-.2;
function spadePath(x,s){ x.beginPath(); x.moveTo(0,-s);
  x.bezierCurveTo(s*.22,-s*.55,s*1.05,-s*.28,s*.96,s*.24); x.bezierCurveTo(s*.88,s*.7,s*.32,s*.78,s*.07,s*.42);
  x.lineTo(s*.34,s*1.02); x.lineTo(-s*.34,s*1.02); x.lineTo(-s*.07,s*.42);
  x.bezierCurveTo(-s*.32,s*.78,-s*.88,s*.7,-s*.96,s*.24); x.bezierCurveTo(-s*1.05,-s*.28,-s*.22,-s*.55,0,-s); x.closePath(); }
/* the card drawn once, centred on its own canvas, in tile units scaled by k */
function cardSprite(k){
  const W=Math.ceil((CARD_W+2)*k), H=Math.ceil((CARD_H+2)*k), [C,x]=sheet(W,H);
  x.setTransform(k,0,0,k,W/2,H/2);
  const w=CARD_W/2, h=CARD_H/2, r=1.8;
  x.beginPath(); x.moveTo(-w+r,-h); x.arcTo(w,-h,w,h,r); x.arcTo(w,h,-w,h,r); x.arcTo(-w,h,-w,-h,r); x.arcTo(-w,-h,w,-h,r); x.closePath();
  x.fillStyle='#f3efe6'; x.fill(); x.strokeStyle='#b9b2a4'; x.lineWidth=.35; x.stroke();
  x.fillStyle=INK; spadePath(x,5.4); x.fill();
  for(const s of [1,-1]){ x.save(); x.scale(s,s); x.font='700 4.6px "Helvetica Neue",Helvetica,Arial,sans-serif'; x.textAlign='center'; x.textBaseline='alphabetic'; x.fillText('A',-w+2.6,-h+5.4); x.translate(-w+2.6,-h+8); spadePath(x,1.3); x.fill(); x.restore(); }
  return C;
}

/* SHARPEN, white pen on coal: a slightly soft macro shot of a circuit board, 80 x 80 of its pixels at 1.25 units each, so the
   pixels show. sharpen's own sum: s x (1 + 4a) - a x (the four pixels R away), Amount 1.5 (the default), Radius 2. */
function paintBoard(x){
  x.fillStyle='#131417'; x.fillRect(0,0,80,80);
  const CU='#d9d1bf';
  /* the chip: body, pin 1, legs */
  x.fillStyle='#2b2d31'; x.fillRect(46,8,30,22); x.strokeStyle='#3d3f44'; x.lineWidth=.8; x.strokeRect(46.4,8.4,29.2,21.2);
  x.fillStyle='#45474c'; x.beginPath(); x.arc(50,12,1.3,0,TAU); x.fill();
  x.fillStyle=CU; for(let i=0;i<5;i++) x.fillRect(41.5,11.2+4*i,4.5,1.6); for(let i=0;i<7;i++) x.fillRect(48.2+4*i,30,1.6,4.5);
  /* the bus: four traces leaving the chip, a 45 degree bend, down to their pads */
  x.strokeStyle=CU; x.lineWidth=2; x.lineJoin='miter'; x.lineCap='butt';
  const bus=[[12,12,26,60],[16,17,31,70],[20,22,36,60],[24,27,41,70]];
  for(const [y,vx,hx,py] of bus){ x.beginPath(); x.moveTo(42,y); x.lineTo(hx,y); x.lineTo(vx,y+hx-vx); x.lineTo(vx,py); x.stroke(); }
  /* traces from the bottom legs */
  x.lineWidth=1.4;
  x.beginPath(); x.moveTo(49,34); x.lineTo(49,44); x.stroke();
  x.beginPath(); x.moveTo(53,34); x.lineTo(53,47); x.lineTo(62,56); x.lineTo(81,56); x.stroke();
  x.beginPath(); x.moveTo(57,34); x.lineTo(57,43); x.lineTo(64,50); x.lineTo(81,50); x.stroke();
  x.beginPath(); x.moveTo(69,34); x.lineTo(69,40); x.lineTo(73,44); x.lineTo(81,44); x.stroke();
  x.lineWidth=2; x.beginPath(); x.moveTo(49,48); x.lineTo(49,62); x.lineTo(57,70); x.lineTo(61,70); x.stroke();
  /* pads and vias: copper rings round a drilled hole */
  const ring=(cx,cy,r,h)=>{ x.fillStyle=CU; x.beginPath(); x.arc(cx,cy,r,0,TAU); x.fill(); x.fillStyle='#131417'; x.beginPath(); x.arc(cx,cy,h,0,TAU); x.fill(); };
  for(const [,vx,,py] of bus) ring(vx,py,3.4,1.3);
  ring(49,46,2.4,1); ring(66,70,5.4,2.4);
  /* a small resistor, and the silkscreen */
  x.fillStyle=CU; x.fillRect(29,41,3.2,4.4); x.fillRect(37.8,41,3.2,4.4); x.fillStyle='#5b544a'; x.fillRect(32.2,41.3,5.6,3.8);
  x.fillStyle='#ecebe6'; x.font='700 4.6px "Helvetica Neue",Helvetica,Arial,sans-serif'; x.textBaseline='alphabetic'; x.textAlign='left';
  x.fillText('U3',46,6); x.fillText('R7',30.5,39.4); x.fillText('J2',70,79);
}

/* SOFTEN SKIN, graded still: a profile portrait painted here, with its skin's own mottling, freckles and blemishes. softskin's own
   steps: a Gaussian of Smoothing size / 2, and each pixel moves toward it by Amount x (1 - smoothstep(0, 4 + (100 - Keep) x 0.9, its
   difference in brightness)). Amount 0.85, Keep detail 50 (the defaults), Smoothing size 14 px of a 1080 frame. */
function facePath(x){
  x.beginPath();
  x.moveTo(50,-2);
  x.bezierCurveTo(53,4,56,12,56.8,20);
  x.bezierCurveTo(57.4,25,58.6,28,58.4,31);
  x.bezierCurveTo(58.2,33,56.8,34,57.0,35.5);
  x.bezierCurveTo(58.6,40,62.5,47,66.8,52.5);
  x.bezierCurveTo(68.2,54.3,67.6,56.4,65.4,56.8);
  x.bezierCurveTo(64.2,57.0,63.2,56.6,62.4,57.2);
  x.bezierCurveTo(61.8,58.2,62.0,59.8,62.6,61.0);
  x.bezierCurveTo(63.6,61.8,63.4,63.0,62.0,63.6);
  x.bezierCurveTo(61.4,63.9,61.4,64.3,62.0,64.6);
  x.bezierCurveTo(63.2,65.4,63.0,67.2,61.4,68.0);
  x.bezierCurveTo(60.0,68.7,59.6,69.6,59.9,71.0);
  x.bezierCurveTo(60.4,73.5,62.0,76.0,60.8,78.6);
  x.bezierCurveTo(59.8,80.6,56.0,81.8,52.0,82.4);
  x.bezierCurveTo(49.5,82.8,48.5,85,48.6,88);
  x.lineTo(48.8,102); x.lineTo(0,102); x.lineTo(0,-2); x.closePath();
}
function hairPath(x){
  x.beginPath();
  x.moveTo(51.5,-8);
  x.bezierCurveTo(50.8,2,48.6,9.5,45,13);
  x.bezierCurveTo(41.6,16.4,40.2,22,41.0,29);
  x.bezierCurveTo(41.8,37,40.6,45,37.6,52);
  x.bezierCurveTo(35.4,57,34.6,63,35.2,69);
  x.bezierCurveTo(35.8,77,33.6,90,31.5,108);
  x.lineTo(-20,108); x.lineTo(-20,-8); x.closePath();
}
/* the crop: a close portrait, forehead and shoulder off the frame, seen in the viewer at FZ x the old framing (checker k1: at the
   old framing the effect changed the picture by 1.4 levels on average, too fine to see at menu size). Everything that has a size,
   the skin's marks and the effect's own Smoothing size, is scaled by FZ with it, so this is the same picture magnified. */
const FZ=1.6;
const faceCrop=x=>{ x.translate(50,50); x.scale(1.32*FZ,1.32*FZ); x.translate(-55.5,-48); };
function paintFace(sx,mk){
  sx.fillStyle='#17130f'; sx.fillRect(0,0,100,100);
  mk.fillStyle='#000'; mk.fillRect(0,0,100,100);
  sx.save(); mk.save(); faceCrop(sx); faceCrop(mk);
  sx.save(); facePath(sx); sx.clip();
  sx.fillStyle='#c4896b'; sx.fillRect(-20,-10,120,120);
  let g=sx.createLinearGradient(39,0,52,0); g.addColorStop(0,'rgba(86,45,31,.62)'); g.addColorStop(1,'rgba(86,45,31,0)'); sx.fillStyle=g; sx.fillRect(-20,-10,120,120);
  g=sx.createRadialGradient(58.5,44,1,58.5,44,15); g.addColorStop(0,'rgba(240,196,166,.55)'); g.addColorStop(1,'rgba(240,196,166,0)'); sx.fillStyle=g; sx.fillRect(-20,-10,120,120);
  g=sx.createRadialGradient(56,18,1,56,18,11); g.addColorStop(0,'rgba(236,192,160,.35)'); g.addColorStop(1,'rgba(236,192,160,0)'); sx.fillStyle=g; sx.fillRect(-20,-10,120,120);
  g=sx.createRadialGradient(62.4,57.6,.2,62.4,57.6,2.6); g.addColorStop(0,'rgba(90,45,32,.45)'); g.addColorStop(1,'rgba(90,45,32,0)'); sx.fillStyle=g; sx.fillRect(55,52,14,12);
  g=sx.createRadialGradient(59.8,75,1,59.8,75,5); g.addColorStop(0,'rgba(236,190,158,.35)'); g.addColorStop(1,'rgba(236,190,158,0)'); sx.fillStyle=g; sx.fillRect(50,66,20,18);
  /* the neck, turned away from the light, under the jaw */
  sx.beginPath(); sx.moveTo(40.5,56); sx.bezierCurveTo(44,67,48,76.5,52.6,82.2); sx.lineTo(48.6,88); sx.lineTo(48.8,108); sx.lineTo(20,108); sx.closePath();
  g=sx.createLinearGradient(49,72,42,80); g.addColorStop(0,'rgba(66,34,24,.0)'); g.addColorStop(.18,'rgba(66,34,24,.5)'); g.addColorStop(1,'rgba(52,26,18,.66)'); sx.fillStyle=g; sx.fill();
  sx.restore();
  mk.fillStyle='#fff'; facePath(mk); mk.fill(); mk.fillStyle='#000'; hairPath(mk); mk.fill();
  /* lips, nostril, brow, eye */
  sx.fillStyle='#a65c4c'; sx.beginPath(); sx.moveTo(62.2,61.0); sx.bezierCurveTo(63.6,61.8,63.4,63.0,62.0,63.6); sx.lineTo(61.5,64.3); sx.bezierCurveTo(63.2,65.4,63.0,67.2,61.4,68.0); sx.bezierCurveTo(60.4,68.2,59.7,67.2,59.8,66.2); sx.bezierCurveTo(59.7,65.1,59.6,64.0,60.0,63.0); sx.bezierCurveTo(60.6,62.0,61.4,61.2,62.2,61.0); sx.closePath(); sx.fill();
  sx.fillStyle='rgba(236,170,150,.5)'; sx.beginPath(); sx.ellipse(62.0,66.0,.7,.35,-.5,0,TAU); sx.fill();
  sx.strokeStyle='#4e251e'; sx.lineWidth=.42; sx.lineCap='round'; sx.beginPath(); sx.moveTo(59.6,64.2); sx.quadraticCurveTo(60.8,64.5,61.9,64.3); sx.stroke();
  sx.strokeStyle='#76402f'; sx.lineWidth=.5; sx.beginPath(); sx.moveTo(61.0,53.2); sx.bezierCurveTo(60.3,55.0,61.2,56.6,63.0,56.8); sx.stroke();
  sx.fillStyle='#2b1c15'; sx.beginPath(); sx.moveTo(49.0,32.2); sx.bezierCurveTo(51.8,30.5,55,30.2,57.1,31.3); sx.bezierCurveTo(55,31.5,52,32.1,49.2,33.6); sx.closePath(); sx.fill();
  sx.strokeStyle='rgba(110,64,46,.6)'; sx.lineWidth=.3; sx.beginPath(); sx.moveTo(51.4,35.7); sx.bezierCurveTo(53,35.0,54.6,35.4,55.6,36.6); sx.stroke();
  sx.fillStyle='#efe4d8'; sx.beginPath(); sx.moveTo(51.6,37.0); sx.bezierCurveTo(53.2,36.4,54.6,37.0,55.6,38.3); sx.bezierCurveTo(54.4,38.9,53.0,39.0,51.8,38.6); sx.closePath(); sx.fill();
  sx.fillStyle='#3b2a1f'; sx.beginPath(); sx.moveTo(53.6,36.7); sx.bezierCurveTo(54.8,37.0,55.3,37.6,55.6,38.3); sx.bezierCurveTo(54.9,38.7,54.2,38.8,53.5,38.8); sx.closePath(); sx.fill();
  sx.strokeStyle='#1e130d'; sx.lineWidth=.55; sx.beginPath(); sx.moveTo(51.0,37.2); sx.bezierCurveTo(52.8,36.0,54.8,36.6,56.0,38.4); sx.stroke();
  sx.lineWidth=.3; sx.strokeStyle='rgba(60,32,22,.8)'; sx.beginPath(); sx.moveTo(51.6,38.7); sx.bezierCurveTo(53.0,39.3,54.4,39.1,55.6,38.4); sx.stroke();
  sx.strokeStyle='#1e130d'; sx.lineWidth=.26; for(let i=0;i<5;i++){ const a=52.4+i*.75; sx.beginPath(); sx.moveTo(a,36.55+i*.06); sx.quadraticCurveTo(a+.5,35.7,a+1.0,35.6+i*.14); sx.stroke(); }
  /* hair: the mass, then strands that follow it down */
  sx.fillStyle='#261a13'; hairPath(sx); sx.fill();
  /* strands follow the hair's own front edge, set back from it */
  sx.save(); hairPath(sx); sx.clip(); const RH=rng(7), edge=[];
  const segs=[[51.5,-8,50.8,2,48.6,9.5,45,13],[45,13,41.6,16.4,40.2,22,41.0,29],[41.0,29,41.8,37,40.6,45,37.6,52],[37.6,52,35.4,57,34.6,63,35.2,69],[35.2,69,35.8,77,33.6,90,31.5,108]];
  for(const s of segs) for(let i=0;i<12;i++){ const q=i/12, a=1-q; edge.push([a*a*a*s[0]+3*a*a*q*s[2]+3*a*q*q*s[4]+q*q*q*s[6], a*a*a*s[1]+3*a*a*q*s[3]+3*a*q*q*s[5]+q*q*q*s[7]]); }
  for(let i=0;i<46;i++){ const d=1.2+RH()*30, i0=Math.floor(RH()*40), n=8+Math.floor(RH()*18), al=.18+RH()*.3, lt=RH()<.3;
    sx.strokeStyle=lt?'rgba(124,90,62,'+(al*.8).toFixed(2)+')':'rgba(64,44,32,'+al.toFixed(2)+')'; sx.lineWidth=.25+RH()*.35;
    sx.beginPath(); for(let k=i0;k<Math.min(edge.length,i0+n);k++){ const p=edge[k], dd=d*(1+.25*(k-i0)/n); k===i0?sx.moveTo(p[0]-dd,p[1]):sx.lineTo(p[0]-dd,p[1]); } sx.stroke(); }
  sx.restore();
  sx.restore(); mk.restore();
}

/* ORBIT STREAKS, type poster: bone on ink. spinstreaks' own taps: each pixel reads the picture turned back by up to Amount x 0.5 rad
   about the Centre, weighed 1/(1 + k x 9/(Q-1) x 0.6), Quality 24. Centre at the bottom left corner of the word. */

window.FX_TILES.push(

{ id:'linstreaks', name:'Light Streaks', section:'Blur', isNew:true, still:2.2,
  line:'Bright lights stretch into straight streaks along one angle; here both ways, sideways, and the dark stays dark.',
  make(px){
    const P=4.2, Q=24, LV=[16,32,48,64];
    const [S,sx]=unitSheet(px); paintFloods(sx);
    /* the streak is soft along its angle, so it is worked at a lower size and screened over the full picture */
    const N=Math.min(px,320), [SN,sn]=unitSheet(N); paintFloods(sn); sn.setTransform(1,0,0,1,0,0);
    const d=sn.getImageData(0,0,N,N).data, n=N*N, wr=new Float32Array(n), wg=new Float32Array(n), wb=new Float32Array(n);
    for(let i=0,j=0;i<n;i++,j+=4){ const b=lum(d,j)/255, w=b*b; wr[i]=d[j]*w; wg[i]=d[j+1]*w; wb[i]=d[j+2]*w; }
    const level=L=>{ const len=L*N/1080, step=len/Q, norm=Q*.5, [C,x]=sheet(N), im=x.createImageData(N,N), o=im.data;
      for(let y=0;y<N;y++){ const row=y*N; for(let X=0;X<N;X++){ let ar=0,ag=0,ab=0;
        for(let k=1;k<=Q;k++){ const dec=1-k/(Q+1), off=k*step; let xi=Math.round(X-off); if(xi<0) xi=0; let i=row+xi; ar+=wr[i]*dec; ag+=wg[i]*dec; ab+=wb[i]*dec;
          xi=Math.round(X+off); if(xi>N-1) xi=N-1; i=row+xi; ar+=wr[i]*dec; ag+=wg[i]*dec; ab+=wb[i]*dec; }
        const j=(row+X)*4; o[j]=Math.min(255,ar/norm); o[j+1]=Math.min(255,ag/norm); o[j+2]=Math.min(255,ab/norm); o[j+3]=255; } }
      x.putImageData(im,0,0); return C; };
    const LVC=LV.map(level);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const k=u<.7?-1:u<.85?0:u<1.0?1:u<1.15?2:u<3.5?3:-1;
      c.drawImage(S,0,0,100,100);
      if(k>=0){ c.globalCompositeOperation='screen'; c.drawImage(LVC[k],0,0,100,100); c.globalCompositeOperation='source-over'; }
      tab(c,3,92.4,'LENGTH '+(k<0?0:LV[k]),4.2,INK,k<0?DIM:BONE);
    };
  } },

{ id:'mosaic', name:'Mosaic', section:'Blur', isNew:true, still:2.4,
  line:'The picture is rebuilt from square blocks, each one the average colour of what it covers; a gap between them can show a colour, like grout.',
  make(px){
    const P=4.4, N=Math.min(px,600), GAP=24, BS=[20,36,52];
    const [S,sx]=unitSheet(N); paintAmphora(sx); sx.setTransform(1,0,0,1,0,0); const s=sx.getImageData(0,0,N,N).data;
    const g=[231,226,213], k=N/1080, at=v=>Math.round(v*k);
    /* block edges and the grout inset are worked in the 1080 frame's own pixels, then placed on this canvas */
    const build=bs=>{ const ins=Math.round(bs*(GAP/100)*.5), o=new Uint8ClampedArray(s.length);
      for(let BY=0;BY<1080;BY+=bs){ const by=at(BY), y1=at(Math.min(BY+bs,1080)), iy0=at(BY+ins), iy1=at(Math.min(BY+bs,1080)-ins);
        for(let BX=0;BX<1080;BX+=bs){ const bx=at(BX), x1=at(Math.min(BX+bs,1080)), ix0=at(BX+ins), ix1=at(Math.min(BX+bs,1080)-ins); let r=0,gg=0,bl=0,m=0;
        for(let y=by;y<y1;y++) for(let X=bx;X<x1;X++){ const i=(y*N+X)*4; r+=s[i]; gg+=s[i+1]; bl+=s[i+2]; m++; }
        if(!m) continue; r/=m; gg/=m; bl/=m;
        for(let y=by;y<y1;y++) for(let X=bx;X<x1;X++){ const i=(y*N+X)*4, inside=y>=iy0&&y<iy1&&X>=ix0&&X<ix1; o[i]=inside?r:g[0]; o[i+1]=inside?gg:g[1]; o[i+2]=inside?bl:g[2]; o[i+3]=255; } } }
      return toCanvas(N,N,o); };
    const LVC=BS.map(build);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const k=u<.6?-1:u<.85?0:u<1.1?1:u<3.6?2:u<3.75?1:u<3.9?0:-1;
      c.drawImage(k<0?S:LVC[k],0,0,100,100);
      tab(c,3,92.4,(k<0?'OFF':BS[k]+' PX'),4.2,INK,BONE);
    };
  } },

{ id:'motionflow', name:'Motion Blur (Footage)', section:'Blur', isNew:true, still:.9,
  line:'Whatever moves inside the shot smears along its own motion, more the faster it goes; whatever stays still stays sharp.',
  /* the footage with no effect, for checking against the real renderer */
  plain(px){ const P=3.0, ST=stoneSprite(px); return (c,t)=>{ const u=Math.floor(mod(t,P)*30+1e-6)/30; reset(c,px); paintSheet(c); c.drawImage(ST.C,stoneX(u)-ST.s/2,STONE_Y-ST.s/2,ST.s,ST.s); }; },
  make(px){
    const P=3.0, AMT=3, NS=10, A=Math.min(.5,1.6/NS), ST=stoneSprite(px), BL=100/20;
    const [F,fx]=unitSheet(px), [M,mx]=unitSheet(px), [K,kx]=unitSheet(px);
    return (c,t)=>{
      const f30=Math.floor(mod(t,P)*30+1e-6), u=f30/30, xn=stoneX(u), xp=f30?stoneX((f30-1)/30):xn, g=(xn-xp)*AMT;
      fx.setTransform(px/100,0,0,px/100,0,0); paintSheet(fx); fx.drawImage(ST.C,xn-ST.s/2,STONE_Y-ST.s/2,ST.s,ST.s);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.drawImage(F,0,0);
      if(Math.abs(g)>.11&&xn<200){
        /* the moving part: the effect's 20 x 20 blocks that changed since the last frame (where the stone is and was), feathered */
        const x0=Math.floor((Math.min(xn,xp)-STONE_R)/BL)*BL, x1=Math.ceil((Math.max(xn,xp)+STONE_R)/BL)*BL, y0=Math.floor((STONE_Y-STONE_R)/BL)*BL, y1=Math.ceil((STONE_Y+STONE_R)/BL)*BL;
        kx.setTransform(1,0,0,1,0,0); kx.clearRect(0,0,px,px); kx.setTransform(px/100,0,0,px/100,0,0);
        let gr=kx.createLinearGradient(x0-1,0,x1+1,0); const fe=1.2/(x1-x0+2); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(fe,'#000'); gr.addColorStop(1-fe,'#000'); gr.addColorStop(1,'rgba(0,0,0,0)');
        kx.fillStyle=gr; kx.fillRect(x0-1,y0-1,x1-x0+2,y1-y0+2);
        kx.globalCompositeOperation='destination-in'; gr=kx.createLinearGradient(0,y0-1,0,y1+1); const fy=1.2/(y1-y0+2); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(fy,'#000'); gr.addColorStop(1-fy,'#000'); gr.addColorStop(1,'rgba(0,0,0,0)');
        kx.fillStyle=gr; kx.fillRect(x0-1,y0-1,x1-x0+2,y1-y0+2); kx.globalCompositeOperation='source-over';
        mx.setTransform(1,0,0,1,0,0); mx.clearRect(0,0,px,px); mx.globalCompositeOperation='source-over'; mx.drawImage(F,0,0);
        mx.globalCompositeOperation='destination-in'; mx.drawImage(K,0,0); mx.globalCompositeOperation='source-over';
        c.globalAlpha=A; for(let k=0;k<NS;k++){ const f=k/(NS-1)-.5; c.drawImage(M,g*f*px/100,0); } c.globalAlpha=1;
      }
    };
  } },

{ id:'objectblur', name:'Motion Blur (Object)', section:'Blur', isNew:true, still:.78,
  line:'A layer that moves is smeared along its own path, more the faster it goes; standing still it stays sharp.',
  make(px){
    const P=3.6, AX=24, AY=64, BX=73, BY=35, SH=2, FPS=30, NS=16;
    const pos=u=>{ const f=u<.6?0:u<1.06?E.inOut(seg(u,.6,1.06)):u<2.2?1:u<2.66?1-E.inOut(seg(u,2.2,2.66)):0; return [lerp(AX,BX,f),lerp(AY,BY,f)]; };
    const K=px/100, CS=cardSprite(K), CW=CS.width/K, CH=CS.height/K;
    const [L,lx]=sheet(px);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      /* the motion path and its two keyframes, under the layer */
      c.strokeStyle=DIM; c.lineWidth=.5; c.setLineDash([1.2,1.2]); c.beginPath(); c.moveTo(AX,AY); c.lineTo(BX,BY); c.stroke(); c.setLineDash([]);
      diamond(c,AX,AY,2.2,YEL); diamond(c,BX,BY,2.2,YEL);
      /* the layer: 16 sub-frames across the shutter, averaged */
      lx.setTransform(1,0,0,1,0,0); lx.globalCompositeOperation='source-over'; lx.globalAlpha=1; lx.clearRect(0,0,px,px);
      lx.globalCompositeOperation='lighter'; lx.globalAlpha=1/NS;
      const dt=SH/FPS;
      for(let k=0;k<NS;k++){ const q=pos(mod(u+((k+.5)/NS-.5)*dt,P)); lx.setTransform(px/100,0,0,px/100,0,0); lx.translate(q[0],q[1]); lx.rotate(CARD_ROT); lx.drawImage(CS,-CW/2,-CH/2,CW,CH); }
      lx.globalCompositeOperation='source-over'; lx.globalAlpha=1;
      c.drawImage(L,0,0,100,100);
      /* the layer's box, where it is now */
      const q=pos(u), bw=CARD_W/2+1.4, bh=CARD_H/2+1.4; c.save(); c.translate(q[0],q[1]); c.rotate(CARD_ROT); c.strokeStyle=TEAL; c.lineWidth=.45; c.strokeRect(-bw,-bh,2*bw,2*bh);
      c.fillStyle=TEAL; for(const [hx,hy] of [[-bw,-bh],[bw,-bh],[bw,bh],[-bw,bh]]) c.fillRect(hx-1.1,hy-1.1,2.2,2.2); c.restore();
      c.font=MONO(5.2); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='middle'; c.fillText('SHUTTER '+SH.toFixed(1),4,93);
    };
  } },

{ id:'sharpen', name:'Sharpen', section:'Blur', isNew:true, still:2.6,
  line:'Soft edges get steep again and fine detail comes back, with a thin light rim and dark rim along each edge.',
  make(px){
    const P=4.4, W=80, H=80, U=100/W, AMT=1.5, R=2;
    /* the soft frame: drawn sharp at 4x, brought down to its own pixels, then a touch out of focus */
    const [HI,hx]=sheet(W*4,H*4); hx.scale(4,4); paintBoard(hx);
    const [LO,lo]=sheet(W,H); lo.imageSmoothingQuality='high'; lo.drawImage(HI,0,0,W,H);
    const soft=gaussRGB(lo.getImageData(0,0,W,H).data,W,H,1.25), so=new Uint8ClampedArray(soft.length); for(let i=0;i<soft.length;i++) so[i]=i%4===3?255:soft[i];
    const sh=new Uint8ClampedArray(so.length);
    for(let y=0;y<H;y++) for(let X=0;X<W;X++){ const i=(y*W+X)*4, iu=(Math.max(0,y-R)*W+X)*4, id=(Math.min(H-1,y+R)*W+X)*4, il=(y*W+Math.max(0,X-R))*4, ir=(y*W+Math.min(W-1,X+R))*4;
      for(let ch=0;ch<3;ch++) sh[i+ch]=so[i+ch]*(1+4*AMT)-(so[iu+ch]+so[id+ch]+so[il+ch]+so[ir+ch])*AMT; sh[i+3]=255; }
    const SOFT=toCanvas(W,H,so), SHARP=toCanvas(W,H,sh);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const sp = u<.6?0 : u<1.7? E.inOut(seg(u,.6,1.7))*W : u<3.8? W : 0;   /* the column the sharpening has reached, in pixels */
      c.imageSmoothingEnabled=false;
      c.drawImage(SOFT,0,0,100,100);
      const cut=Math.floor(sp); if(cut>0) c.drawImage(SHARP,0,0,cut,H,0,0,cut*U,100);
      c.imageSmoothingEnabled=true;
      if(sp>0&&sp<W){ c.fillStyle='#f4f2ec'; c.fillRect(cut*U-.25,0,.5,100); }
    };
  } },

{ id:'softskin', name:'Soften Skin', section:'Blur', isNew:true, still:1.3,
  line:'Small blotches and texture on skin even out, while the edges, the eye and the brow stay sharp.',
  make(px){
    const P=4.6, N=Math.min(px,600), RADIUS=14, AMT=.85, KEEP=50, thr=4+(100-KEEP)*.9;
    const [S,sx]=unitSheet(N), [MK,mk]=unitSheet(N);
    paintFace(sx,mk);
    /* the skin's own texture: blotches, freckles and a few blemishes, only where the mask says skin (placed in frame units) */
    sx.setTransform(1,0,0,1,0,0); mk.setTransform(1,0,0,1,0,0);
    /* the portrait and its skin mask side by side, read back in one go */
    const [BOTH,bx]=sheet(2*N,N); bx.drawImage(S,0,0); bx.drawImage(MK,N,0);
    const all=bx.getImageData(0,0,2*N,N).data, im=sx.createImageData(N,N), d=im.data, m=new Uint8ClampedArray(N*N*4), k=N/100;
    for(let y=0;y<N;y++){ d.set(all.subarray(y*8*N,y*8*N+4*N),y*4*N); m.set(all.subarray(y*8*N+4*N,(y+1)*8*N),y*4*N); }
    const n2=(X,Y)=>{ const xi=Math.floor(X), yi=Math.floor(Y), fx=X-xi, fy=Y-yi, ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy), h=(a,b)=>hash(a*157+b*311,3); return lerp(lerp(h(xi,yi),h(xi+1,yi),ux),lerp(h(xi,yi+1),h(xi+1,yi+1),ux),uy)*2-1; };
    const R=rng(23), spots=[];
    for(let i=0;i<130;i++) spots.push([14+R()*72,R()*100,(.38+R()*.34)*FZ,11+R()*10,0]);
    for(let i=0;i<18;i++) spots.push([18+R()*60,R()*100,(.75+R()*.55)*FZ,17+R()*10,1]);
    for(let y=0;y<N;y++) for(let X=0;X<N;X++){ const i=(y*N+X)*4; if(m[i]<128) continue; const ux=X/k, uy=y/k;
      let dl=7*n2(ux*.9/FZ,uy*.9/FZ)+5*n2(ux*2.1/FZ+40,uy*2.1/FZ)+3*(hash(X*13+y*7919,9)-.5)*2, red=0;
      for(const s of spots){ const dx=ux-s[0], dy=uy-s[1], rr=dx*dx+dy*dy, r2=s[2]*s[2]; if(rr<r2*2.2){ const f=Math.exp(-rr/r2*1.6); dl-=s[3]*f; if(s[4]) red+=f; } }
      d[i]=clamp(d[i]+dl+red*6,0,255); d[i+1]=clamp(d[i+1]+dl*1.08-red*7,0,255); d[i+2]=clamp(d[i+2]+dl*1.1-red*6,0,255); }
    sx.putImageData(im,0,0);
    /* the effect */
    const bl=gaussRGB(d,N,N,RADIUS*N/1080/2*FZ), o=new Uint8ClampedArray(d.length);
    for(let i=0;i<d.length;i+=4){ const dlum=Math.abs(lum(d,i)-(.299*bl[i]+.587*bl[i+1]+.114*bl[i+2])), u=clamp(dlum/thr), w=AMT*(1-u*u*(3-2*u));
      o[i]=d[i]+(bl[i]-d[i])*w; o[i+1]=d[i+1]+(bl[i+1]-d[i+1])*w; o[i+2]=d[i+2]+(bl[i+2]-d[i+2])*w; o[i+3]=255; }
    const SOFT=toCanvas(N,N,o);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const sp = u<.6?0 : u<1.6? 100*settle(seg(u,.6,1.35))*.62 : u<2.1? lerp(62,100,E.inOut(seg(u,1.6,2.1))) : u<3.9? 100 : 100*(1-E.inOut(seg(u,3.9,4.4)));
      c.drawImage(S,0,0,100,100);
      if(sp>0){ const w=Math.min(100,sp); c.drawImage(SOFT,0,0,w/100*N,N,0,0,w,100); if(w<100){ c.fillStyle=BONE; c.fillRect(w-.3,0,.6,100); } }
    };
  } },

{ id:'spinstreaks', name:'Orbit Streaks', section:'Blur', isNew:true, still:2.0,
  line:'The picture is swept round a centre you place, leaving a trail that fades behind everything, longer the further out it is.',
  make(px){
    const P=4.2, N=Math.min(px,480), Q=24, DEC=.6, CX=.04, CY=.97, LV=[.17,.34,.5];
    const paint=(x)=>{ x.fillStyle=BONE; x.fillRect(0,0,100,100); x.fillStyle=INK; x.font=SANS(48); x.textAlign='left'; x.textBaseline='alphabetic'; x.fillText('TU',-1.8,46.5); x.fillText('RN',-1.8,92.5); };
    const [S,sx]=unitSheet(px); paint(sx);
    const [SN,sn]=unitSheet(N); paint(sn); sn.setTransform(1,0,0,1,0,0); const s=sn.getImageData(0,0,N,N).data;
    const cx=CX*N, cy=CY*N, wts=[]; let wt=0; for(let k=0;k<Q;k++){ wts.push(1/(1+k*(9/(Q-1))*DEC)); wt+=wts[k]; }
    const level=amt=>{ const span=amt*.5, da=span/(Q-1), co=[], si=[]; for(let k=0;k<Q;k++){ co.push(Math.cos(k*da)); si.push(Math.sin(k*da)); }
      const [C,x]=sheet(N), im=x.createImageData(N,N), o=im.data;
      for(let y=0;y<N;y++) for(let X=0;X<N;X++){ const dx=X-cx, dy=y-cy; let r=0,g=0,b=0;
        for(let k=0;k<Q;k++){ const sx2=cx+dx*co[k]+dy*si[k], sy2=cy+dy*co[k]-dx*si[k]; const xi=sx2<0?0:sx2>N-1?N-1:(sx2|0), yi=sy2<0?0:sy2>N-1?N-1:(sy2|0), j=(yi*N+xi)*4, w=wts[k]; r+=s[j]*w; g+=s[j+1]*w; b+=s[j+2]*w; }
        const j=(y*N+X)*4; o[j]=r/wt; o[j+1]=g/wt; o[j+2]=b/wt; o[j+3]=255; }
      x.putImageData(im,0,0); return C; };
    const LVC=LV.map(level);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const k=u<.7?-1:u<.95?0:u<1.2?1:u<3.5?2:-1;
      c.drawImage(k<0?S:LVC[k],0,0,100,100);
      /* the Centre, where the sweep turns */
      const ox=CX*100, oy=CY*100; c.strokeStyle=VERM; c.lineWidth=.6; c.beginPath(); c.moveTo(ox-2.6,oy); c.lineTo(ox+2.6,oy); c.moveTo(ox,oy-2.6); c.lineTo(ox,oy+2.6); c.stroke();
    };
  } }

);
})();
