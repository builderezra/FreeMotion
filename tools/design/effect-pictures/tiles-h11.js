/* round 5 slot 11 (#1246 clause 4): ROCK NOISE, redrawn for the upgraded effect.
   The builder's upgrade (commit 6ccd1014, effects branch) adds Look: Stone, the new default: five octaves of the kernel's own value
   noise, each turned 37 degrees from the last, every crest folded and squared and carried by the octave above (a multifractal), then
   lit from the top left by the height's own slope; new instances open in stone colours, Low #2e2a26 to High #d8cfc0.
   THE PICTURE. A made still: a mountain massif cut out as its own flat slate layer (#3d4554) over a flat night-navy sky layer, a
   1080 px square frame. Rock Noise sits on the massif layer only (the kernel is alpha-gated: the sky is never touched) at Look Stone,
   Colour Gradient in the default stone colours, Normal, Amount 0.9 and Sharpness 1.4 (the app's own Add-Effect thumbnail uses both:
   a tenth of the slate still shows through, and the hollows sink), Scale 100 px (large enough to read at 77 px, not the 120 maximum),
   Bands 1, Seed 5 (chosen from twelve for the fewest worm-like channels), Speed 0 (so the rock holds still rather than churning).
   The stone below is PIXEL_FX.fractalridges' Stone path ported line for line from js/compositor.js (same hash, same turned octaves,
   same carry, same light, same float32 stores), worked once in make() at a plate of the tile's own size with the plate scale the app
   would use (px / 1080), so it is the frame the real renderer draws at that size: measured beside the effects-branch renderer on this
   same massif and sky, 0.05 mean per channel apart at 360 px and 0.01 at 600 (the antialiased ridge edge only).
   Loop: the flat layer, a hard cut to stone, a long hold, a hard cut back. */
(function(){ 'use strict';
const {rng}=window.FXK;
const mod=(t,P)=>((t%P)+P)%P;
const SKY='#161c28', SLATE='#3d4554';

/* the massif's ridge in 0..100 units: fixed key points, then six passes of midpoint displacement from a fixed seed
   (probe-fractalridges.js draws the same ridge for the real renderer) */
function ridgePts(){
  const K=[[-2,41],[7,37],[15,31.5],[22,24],[29,14.5],[34,19],[40,25.5],[46,23],[52,20],[58,24.5],[66,29],[74,31],[80,35.5],[89,37.5],[102,42]];
  const r=rng(1243011); let pts=K.map(p=>p.slice());
  for(const a of [2.2,2.0,1.6,1.1,.7,.4]){ const out=[pts[0]]; for(let i=1;i<pts.length;i++){ const p=pts[i-1], q=pts[i]; out.push([(p[0]+q[0])/2+(r()-.5)*a*.3,(p[1]+q[1])/2+(r()-.5)*a]); out.push(q); } pts=out; }
  return pts;
}
function massifPath(){ const p=new Path2D(); ridgePts().forEach((q,i)=>i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1])); p.lineTo(102,102); p.lineTo(-2,102); p.closePath(); return p; }

/* PIXEL_FX.fractalridges, Look Stone, Colour Gradient, Overlay Normal: d is the layer's RGBA plate (W x H), changed in place.
   Speed 0 and no drift, so the churn phase and both drift offsets are 0 (they are kept in the maths, as in the kernel). */
const CLOUD_ROT=[]; for(let o=0;o<10;o++) CLOUD_ROT.push([Math.cos(o*0.6458),Math.sin(o*0.6458)]);
function stone(d,W,H,o){
  let sc=o.scale<8?8:(o.scale>120?120:o.scale); sc=sc*o.ps;
  const amt=o.amount, sh=o.sharpness, bands=o.bands, ph=0, dx=0, dy=0;
  const sk=(o.seed*1442695041)|0;
  const hash=(ix,iy)=>{ let h=(ix*374761393+iy*668265263+sk)|0; h=(h^(h>>>13))*1274126177; h=(h^(h>>>16))>>>0; return h/4294967295; };
  const sm=a=>a*a*(3-2*a);
  const n=(x,y)=>{ const x0=Math.floor(x), y0=Math.floor(y), tx=sm(x-x0), ty=sm(y-y0), h00=hash(x0,y0), h10=hash(x0+1,y0), h01=hash(x0,y0+1), h11=hash(x0+1,y0+1), a=h00+(h10-h00)*tx; return a+(h01+(h11-h01)*tx-a)*ty; };
  const C=[], Wt=[0.4,0.25,0.17,0.11,0.07], EX=[0.9,-1.3,1.7,-2.1,2.6], EY=[-1.4,0.8,1.1,1.5,-1.9];
  for(let k=0;k<5;k++) C.push(Math.max(1.5,sc/Math.pow(2,k)));
  const HT=new Float32Array(W*H);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    let h=0, carry=1;
    for(let k=0;k<5;k++){ const c=CLOUD_ROT[k], px=(x+dx)/C[k], py=(y+dy)/C[k];
      let r=1-Math.abs(2*n(px*c[0]-py*c[1]+EX[k]*ph+k*13.7,px*c[1]+py*c[0]+EY[k]*ph-k*7.3)-1);
      r*=r; h+=Wt[k]*r*carry; carry=r*1.6>1?1:r*1.6; }
    HT[y*W+x]=h; }
  const HS=new Float32Array(W*H), LT=new Float32Array(W*H), K=3+sc/10;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const i=y*W+x, v=HT[i];
    const a=HT[(y>0?y-1:0)*W+(x>0?x-1:0)], b=HT[(y<H-1?y+1:H-1)*W+(x<W-1?x+1:W-1)];
    let l=(a-b)*K; l=l<-0.45?-0.45:(l>0.45?0.45:l);
    LT[i]=0.88-l;
    let s=v*1.6; s=s<0?0:(s>1?1:s);
    if(sh!==1) s=Math.pow(s,sh);
    if(bands!==1){ let u=s*bands; u=u-Math.floor(u/2)*2; s=u<=1?u:2-u; }
    HS[i]=s; }
  const lo=o.lo, hi=o.hi, dr=hi[0]-lo[0], dg=hi[1]-lo[1], db=hi[2]-lo[2];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const i=(y*W+x)*4; if(d[i+3]<=0) continue;   /* alpha-gated, as the kernel */
    const s=HS[y*W+x], L=LT[y*W+x];
    let cr=lo[0]+dr*s, cg=lo[1]+dg*s, cb=lo[2]+db*s;
    cr*=L; cg*=L; cb*=L;
    if(cr<0) cr=0; else if(cr>255) cr=255;
    if(cg<0) cg=0; else if(cg>255) cg=255;
    if(cb<0) cb=0; else if(cb>255) cb=255;
    d[i]=d[i]+(cr-d[i])*amt; d[i+1]=d[i+1]+(cg-d[i+1])*amt; d[i+2]=d[i+2]+(cb-d[i+2])*amt; }
}

window.FX_TILES=window.FX_TILES||[];
window.FX_TILES.push(
{ id:'fractalridges', name:'Rock Noise', section:'Generative', isNew:true, redrawn:true, still:2.2,
  line:'A flat mountain shape becomes lit, ridged rock: the default Look Stone and stone colours, at Amount 0.9, Scale 100 px, Sharpness 1.4, Seed 5, Speed 0.',
  make(px){
    const P=4.4, ON=.9, OFF=4.0, PATH=massifPath();
    /* the plate: the tile's own size (capped), so the stone is the frame the real renderer draws at that size */
    const R=Math.max(64,Math.min(640,Math.round(px)));
    const PL=document.createElement('canvas'); PL.width=PL.height=R; const pg=PL.getContext('2d');
    pg.setTransform(R/100,0,0,R/100,0,0); pg.fillStyle=SLATE; pg.fill(PATH);
    const im=pg.getImageData(0,0,R,R);
    stone(im.data,R,R,{scale:100,ps:R/1080,amount:.9,sharpness:1.4,bands:1,seed:5,lo:[0x2e,0x2a,0x26],hi:[0xd8,0xcf,0xc0]});
    pg.setTransform(1,0,0,1,0,0); pg.putImageData(im,0,0);
    return (c,t)=>{
      const m=mod(t,P), on=m>=ON&&m<OFF;
      c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      c.fillStyle=SKY; c.fillRect(0,0,100,100);
      if(on) c.drawImage(PL,0,0,100,100);
      else { c.fillStyle=SLATE; c.fill(PATH); }
    };
  } }
);
})();
