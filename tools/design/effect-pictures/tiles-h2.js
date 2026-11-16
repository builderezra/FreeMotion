/* FreeMotion effect pictures, h2 (round 5): DISPERSION, redrawn for the builder's Sweep (#1246 U2, his clause 7; commit b421556e
   on the effects branch, not shipped yet). Kept from the tile it replaces: his 'figures' photograph dispersing over his 'shore'
   (the two photographs that tile already used, no new ones) and direction A, a graded still with one parameter travelling.

   The picture is PIXEL_FX.dispersion from that branch, run here on the photograph's own pixels, line for line: the kernel's value
   noise (its hash on a Grain-px lattice, bilinear with a smoothstep; gw is the same count of cells at any size, so the pattern is
   the app's own), SWEEP From left (the noise a pixel is compared with becomes 35 % noise + 65 % x / W), the front at
   Progress x (1 + Edge), e = (front - n) / Edge, a piece drawn from Travel x e^2 back along Direction and faded by 1 - e, gone at
   e >= 1. EMBERS 0: no pixel is mixed toward the Ember colour, so there are no orange borders (his note on the last picture).
   Settings, on a 1080 frame: Sweep From left, Grain 12 px, Travel 500 px, Edge 0.3, Direction 200 deg (the pieces go left and a
   little up, into the part already cleared), Embers 0, Pattern 0, Scatter 0. Fine Grain is what makes it read as dust rather than
   torn blobs: at 70-140 px the pieces smear like wet paint. Progress is keyed 0 to 1 and stepped at 12 fps: the layer, up to
   0.4 (the front just reaching the two figures, the tree to their left already dust) and held, on to 1, the layer below held,
   cut back. Every frame is worked out once in make() (the only putImageData), so a draw is two drawImage calls.
   Checked against the effects-branch renderer (truth.html ?app=/ss/, Progress keyed to this loop, shots/r5-dispersion-truth.png):
   mean change from the plain photo, ours / real: 1.63 / 1.64 at Progress 0.15, 23.84 / 23.87 at 0.34, 35.14 / 35.15 at 0.4,
   57.95 / 57.98 at 0.55, 84.49 / 84.23 at 0.9; ours against the real frame 0.8 to 3.0 levels (the plain photos alone: 1.2). */
(function(){ 'use strict';
const {E,seg,photo}=window.FXK;
const mod=(t,P)=>((t%P)+P)%P;
const sheet=(N,read)=>{ const C=document.createElement('canvas'); C.width=C.height=N; return [C,C.getContext('2d',read?{willReadFrequently:true}:undefined)]; };
/* one of his photographs, cover-fit into an N px square (read = its pixels will be read back once) */
function cover(key,N,read){ const [C,x]=sheet(N,read); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'; const im=photo(key);
  if(im){ const s=Math.max(N/im.naturalWidth,N/im.naturalHeight), w=im.naturalWidth*s, h=im.naturalHeight*s; x.drawImage(im,(N-w)/2,(N-h)/2,w,h); }
  return [C,x]; }

/* the settings the picture shows (the line names them) */
const SET={ sweep:1, grain:12, travel:500, edge:.3, dir:200, mid:.4 };

window.FX_TILES=window.FX_TILES||[];
window.FX_TILES.push(
{ id:'dispersion', name:'Dispersion', section:'Opacity / Visibility', isNew:true, redrawn:true, still:2.5,
  line:'Sweep From left: as Progress runs 0 to 1, a ragged front crosses the layer and its pieces stream off behind it and fade, leaving the layer below (Grain 12 px, Travel 500 px, Edge 0.3, Direction 200°, Embers 0).',
  make(px){
    const S=Math.min(px,300), N=S*S, K=S/1080;   /* his photographs are 320 px: past 300 there is nothing more to show */
    const scale=Math.max(2,SET.grain*K), dist=Math.max(0,SET.travel*K), soft=Math.max(.05,SET.edge), ang=SET.dir*Math.PI/180, ux=Math.cos(ang), uy=Math.sin(ang);
    const [,sx]=cover('figures',S,true), src=sx.getImageData(0,0,S,S).data;
    const [BG]=cover('shore',Math.min(px,600));
    /* the kernel's noise, with Sweep laid in (From left: x / W) */
    const inv=1/scale, gw=Math.ceil(S*inv)+2;
    const cellN=(cx,cy)=>{ let h=((cy*gw+cx)*374761393)|0; h=(h^(h>>13))*1274126177; h=(h^(h>>16)); return (h&0xffff)/65536; };
    const NZ=new Float32Array(N);
    for(let y=0,p=0;y<S;y++){ const fy=y*inv, y0=fy|0, ty=fy-y0, sy2=ty*ty*(3-2*ty);
      for(let x=0;x<S;x++,p++){ const fx=x*inv, x0=fx|0, tx=fx-x0, sx2=tx*tx*(3-2*tx);
        const n00=cellN(x0,y0), n10=cellN(x0+1,y0), n01=cellN(x0,y0+1), n11=cellN(x0+1,y0+1);
        const n0=(n00+(n10-n00)*sx2)+((n01+(n11-n01)*sx2)-(n00+(n10-n00)*sx2))*sy2;
        NZ[p]=SET.sweep?n0*.35+(x/S)*.65:n0; } }
    /* one frame of the layer at Progress pr: the kernel's loop, Embers 0 */
    const frame=pr=>{
      const [C,x]=sheet(S), im=x.createImageData(S,S), d=im.data; d.set(src);
      if(pr>0){ const front=pr*(1+soft);
        for(let y=0,p=0;y<S;y++) for(let xx=0;xx<S;xx++,p++){
          const e=(front-NZ[p])/soft; if(e<=0) continue;
          const i=p<<2; if(e>=1){ d[i+3]=0; continue; }
          const off=e*e*dist; let ax=Math.round(xx-ux*off), ay=Math.round(y-uy*off);
          if(ax<0) ax=0; else if(ax>=S) ax=S-1;
          if(ay<0) ay=0; else if(ay>=S) ay=S-1;
          const si=(ay*S+ax)<<2;
          d[i]=src[si]; d[i+1]=src[si+1]; d[i+2]=src[si+2]; d[i+3]=src[si+3]*(1-e);
        } }
      x.putImageData(im,0,0); return C; };
    /* the loop: the layer, Progress 0 -> mid, held, mid -> 1, the layer below held, cut back */
    const P=5, FPS=12, M=SET.mid;
    const progAt=q=>q<.7?0:q<1.9?M*E.inOut(seg(q,.7,1.9)):q<3.1?M:q<4.1?M+(1-M)*E.inOut(seg(q,3.1,4.1)):q<4.8?1:0;
    const frames=new Map();
    for(let i=0;i<P*FPS;i++){ const pr=progAt(i/FPS), k=pr.toFixed(4); if(pr<1&&!frames.has(k)) frames.set(k,frame(pr)); }
    return (c,t)=>{
      c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      const pr=progAt(Math.floor(mod(t,P)*FPS)/FPS);
      c.drawImage(BG,0,0,100,100);
      const f=frames.get(pr.toFixed(4)); if(f) c.drawImage(f,0,0,100,100);
    };
  } }
);
})();
