/* FreeMotion effect pictures, round 5 slot 9: CARD FLIP (#1246 U10, Back: Another layer). Direction: comp sheets.
   Two layers, as the builder's note says to use it: CLIP 01 (his McLaren, plate painted out) carries the Card Flip, and its Back
   names CLIP 02, a title card with its eye off, so that card shows nowhere but on the far side. The card is the effect's own
   maths: turned about the upright through its middle (Flips Horizontal, Hinge 50/50), weak perspective with the solids' focal
   length (Perspective 50 = F 3.2 radii, R = half the longer side), no shading, and past edge-on the far side is CLIP 02 read
   the right way round. Furniture (the tab, the Flip readout, the Back line) sits off the card. */
(function(){
'use strict';
const {clamp,seg,photo}=window.FXK;

const INK='#16130f',BONE='#e7e2d5',DIM='#8b96a8';
const MONO='"Courier Prime","Courier New",Courier,monospace';
const SANS='system-ui,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif';
const mk=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=(h===undefined?w:h); return C; };
const loopT=(t,P)=>((t%P)+P)%P;

/* The clip, in tile units: CW x CH about its middle (CX, CY), which is also the hinge. R and F are renderMesh's. */
const GEO={CW:80,CH:52,CX:50,CY:52,F:3.2};
GEO.R=Math.max(GEO.CW,GEO.CH)/2;

/* FLIP, keyframed: 0 to 180 with an overshoot ease (a quick turn, about 9 degrees past, settles), held; then on to 360. */
const P=4.6, T1=.75, T2=2.75, DM=1.0;
const backOut=q=>{ const r=q-1; return 1+2.2*r*r*r+1.2*r*r; };
const turn=u=>u<=0?0:(u>=1?1:backOut(Math.pow(u,1.6)));
const angleAt=t=>{ const T=loopT(t,P); return 180*turn((T-T1)/DM)+180*turn((T-T2)/DM); };

/* CLIP 01: the photograph, full width, cropped to the clip's shape; the number plate painted out in the body colour. */
function frontArt(W,H){
  const C=mk(W,H), g=C.getContext('2d'), im=photo('mclaren');
  g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
  const kx=0, ky=.12, kw=1, kh=kw*H/W;
  g.fillStyle='#3a3d40'; g.fillRect(0,0,W,H);
  if(im){ const nw=im.naturalWidth, nh=im.naturalHeight; g.drawImage(im,kx*nw,ky*nh,kw*nw,kh*nh,0,0,W,H); }
  const plate=[[.772,.55],[.942,.512],[.942,.592],[.786,.62]];
  g.fillStyle='#c94f2c'; g.beginPath();
  plate.forEach((p,i)=>{ const x=(p[0]-kx)/kw*W, y=(p[1]-ky)/kh*H; if(i) g.lineTo(x,y); else g.moveTo(x,y); });
  g.closePath(); g.fill();
  return C;
}

/* CLIP 02: a title card (Bone, heavy Ink figures flush left, a Courier slug). Lettering is what shows the far side is the right
   way round: Mirror would print it backwards. */
function backArt(W,H){
  const C=mk(W,H), g=C.getContext('2d'), s=W/GEO.CW, cw=GEO.CW, ch=GEO.CH;
  g.setTransform(s,0,0,s,0,0);
  g.fillStyle=BONE; g.fillRect(0,0,cw,ch);
  g.fillStyle=INK; g.textAlign='left'; g.textBaseline='alphabetic';
  g.font='700 4.2px '+MONO; g.fillText('SCENE',5.2,9.6);
  g.fillRect(5.2,11.6,cw-10.4,.55);
  g.font='900 40px '+SANS; g.fillText('02',3.4,ch-5.2);
  return C;
}

function tab(c,x,y,text,size,fg,bg){
  c.font='700 '+size+'px '+MONO; c.textBaseline='alphabetic'; c.textAlign='left';
  const w=c.measureText(text).width, pad=size*.45;
  c.fillStyle=bg; c.fillRect(x,y,w+pad*2,size*1.5);
  c.fillStyle=fg; c.fillText(text,x+pad,y+size*1.12);
}

window.FX_TILES=window.FX_TILES||[];
window.FX_TILES.push({ id:'fliplayer', name:'Card Flip', section:'3D', redrawn:true, still:1.2,
  line:'Flip keyframed 0° to 180° and on to 360° (Horizontal, Perspective 50) with Back: Another layer, the Back layer a title card with its eye off: the photo turns over to that card, the right way round.',
  /* for probe-fliplayer.js: the two layers this picture turns over, its geometry and its Flip at t */
  art(W){ const H=Math.round(W*GEO.CH/GEO.CW); return {front:frontArt(W,H),back:backArt(W,H),geo:GEO,angleAt}; },
  make(px){
    const {CW,CH,CX,CY,F,R}=GEO, TW=Math.min(720,Math.round(px*CW/100*1.25)), TH=Math.round(TW*CH/CW);
    const FRONT=frontArt(TW,TH), BACK=backArt(TW,TH), hy=CH/2/R;
    return (c,t)=>{
      c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      c.fillStyle=INK; c.fillRect(0,0,100,100);
      const deg=angleAt(t), a=deg*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
      /* a point x (in R) across the card: where it lands and its perspective scale (z toward the viewer is -x sin a) */
      const proj=x=>{ const z=-x*sa, f=F/Math.max(.2,F-z); return [CX+x*ca*f*R,f]; };
      if(Math.abs(ca)>.004){
        const back=ca<0, img=back?BACK:FRONT, xs=CW/2/R;
        const [XL,fL]=proj(-xs), [XR,fR]=proj(xs);
        c.save();
        c.beginPath(); c.moveTo(XL,CY-hy*R*fL); c.lineTo(XR,CY-hy*R*fR); c.lineTo(XR,CY+hy*R*fR); c.lineTo(XL,CY+hy*R*fL); c.closePath();
        c.clip();
        /* columns of the layer, each at its own depth; on the far side CLIP 02 runs the other way across the card, which is
           what reading it the right way round means once the card has turned */
        const N=clamp(Math.ceil(Math.abs(XR-XL)*px/100/4),6,110), sw=img.width/N;
        for(let i=0;i<N;i++){
          const u0=i/N, u1=(i+1)/N, x0=(back?1-2*u0:2*u0-1)*xs, x1=(back?1-2*u1:2*u1-1)*xs;
          const [X0,f0]=proj(x0), [X1,f1]=proj(x1), h=2*hy*R*Math.max(f0,f1)+.6;
          c.drawImage(img,i*sw,0,sw,img.height,Math.min(X0,X1)-.12,CY-h/2,Math.abs(X1-X0)+.24,h);
        }
        c.restore();
      }
      tab(c,5,4.5,'CLIP 01',4.4,INK,BONE);
      const val=((Math.round(deg)%360)+360)%360;
      c.fillStyle=DIM; c.font='700 4.4px '+MONO; c.textAlign='right'; c.fillText('FLIP '+val+'°',95,9.9);
      c.textAlign='left'; c.fillText('BACK LAYER  CLIP 02',5,95.5);
    };
  }
});
})();
