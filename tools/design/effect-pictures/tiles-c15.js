/* FreeMotion effect pictures, artist 15 (c15): seven Warping tiles, no photographs.
   Every source picture is drawn here; what happens to it is the effect's own maths from js/compositor.js, at the settings named on each tile. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E}=window.FXK;   /* no photographs in this file */

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const stepT=(u,fps)=>Math.floor(u*fps)/fps;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h,read)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d',read?{willReadFrequently:true}:undefined)]; };
/* damped settle: 0 to 1 with one small overshoot, for something that lands */
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; };
const hexRGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const F=100/1080;   /* one project pixel of a 1080 frame, in tile units */
/* a closed polygon cut into short steps, so a warp can bend its edges */
const dice=(pts,step)=>{ const out=[]; for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length], n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/step)); for(let k=0;k<n;k++){ const q=k/n; out.push(a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q); } } return new Float32Array(out); };
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];

window.FX_TILES.push(

/* CURL. Pen plotter, white pen on coal: nine concentric squares, each started with a dot. WARP_FX.curl turns every point about the
   centre by Amount*0.6*sin(r/Spacing - Phase), so neighbouring rings twist opposite ways. Amount 0.5 and Spacing 40 px are the defaults
   (40 px of a 1080 frame); Phase is then keyframed through one full turn, which rolls the rings outward by one ring and lands on the
   same picture. The squares are drawn bent by the exact inverse (a rotation the other way at the same radius), so lines stay crisp. */
{ id:'curl', name:'Curl', section:'Warping', isNew:true, still:1.75,
  line:'Rings round a centre twist one way and then the other, so straight lines snake; moving the Phase rolls the rings outward.',
  make(px){
    const P=4.8, CX=46, CY=48, WL=40*F, AMP=.5*.6;
    const HS=[]; for(let k=0;k<9;k++) HS.push(3.6+k*4.6);
    const polys=HS.map(h=>dice([[-h,-h],[h,-h],[h,h],[-h,h]],.7));
    const amtAt=u=> u<.5?0 : u<1.45? settle(seg(u,.5,1.45)) : u<3.75?1 : u<4.35? 1-E.inOut(seg(u,3.75,4.35)) : 0;
    const phAt=u=> TAU*E.inOut(seg(u,1.95,3.4));
    return (c,t)=>{
      const u=stepT(mod(t,P),15); reset(c,px);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      const A=AMP*amtAt(u), ph=phAt(u);
      const at=(x,y)=>{ const r=Math.hypot(x,y), a=-A*Math.sin(r/WL-ph), co=Math.cos(a), si=Math.sin(a); return [CX+x*co-y*si, CY+x*si+y*co]; };
      c.lineJoin='round'; c.lineCap='round';
      polys.forEach((pts,k)=>{
        c.beginPath();
        for(let i=0;i<pts.length;i+=2){ const q=at(pts[i],pts[i+1]); i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]); }
        c.closePath(); c.strokeStyle=TEXT; c.lineWidth=.9; c.stroke();
        const s=at(pts[0],pts[1]); c.fillStyle=TEXT; c.beginPath(); c.arc(s[0],s[1],.95,0,TAU); c.fill();
      });
    };
  } },

/* DISPLACEMENT MAP. Comp sheets. A grey MAP sheet (mid-grey = no push, a soft white patch) drops onto the LAYER sheet and becomes its
   Map layer; Channel: Luminance, Amount 60 px. displaceResample pulls each pixel from (x + (L-0.5)*2*Amount, y + the same), so the
   stripes under the bright patch are pulled up to 60 px and bend round it. Every amount below is that gather, done once per level. */
{ id:'displacemap', name:'Displacement Map', section:'Warping', isNew:true, still:2.1,
  line:'A second layer works as a map: where it is lighter than mid-grey the picture is pushed one way, so the stripes bend round its shape.',
  make(px){
    const P=4.6, X=5, Y=15, S=80, T=8.4, AMT=60, LV=5, HX=9, HY=-10.5;
    /* the map: mid-grey with one white disc running off its right edge, its rim softened over 9 units */
    const disc=(x,y,cx,cy,r)=>{ const d=Math.hypot(x-cx,y-cy); const q=clamp((r+4.5-d)/9); return q*q*(3-2*q); };
    const mapAt=(x,y)=>.5+.5*disc(x,y,X+S*.7,Y+S*.44,S*.3);
    const sc=px/100, w=Math.round(S*sc), x0=X*sc, y0=Y*sc, pw=1/sc;
    const B=hexRGB(BONE), V=hexRGB(VERM);
    const cover=yy=>{ let f=((yy-Y)/T)%1; if(f<0) f+=1; const d=f<.5?Math.min(f,.5-f)*T:-Math.min(f-.5,1-f)*T; return clamp(.5+d/pw); };
    const M=new Float32Array(w*w); for(let j=0;j<w;j++){ const uy=(y0+j+.5)/sc; for(let i=0;i<w;i++) M[j*w+i]=mapAt((x0+i+.5)/sc,uy); }
    const level=a=>{ const [C,x]=sheet(w), im=x.createImageData(w,w), o=im.data;
      for(let j=0;j<w;j++){ const uy=(y0+j+.5)/sc; for(let i=0;i<w;i++){ const s=(M[j*w+i]-.5)*2*a*F*S/100, k=cover(uy+s), q=(j*w+i)*4;   /* the sheet is the whole 1080 layer */
        o[q]=B[0]+(V[0]-B[0])*k; o[q+1]=B[1]+(V[1]-B[1])*k; o[q+2]=B[2]+(V[2]-B[2])*k; o[q+3]=255; } }
      x.putImageData(im,0,0); return C; };
    const LVL=[]; for(let l=0;l<=LV;l++) LVL.push(level(AMT*l/LV));
    const [MAP,mx]=sheet(w), mi=mx.createImageData(w,w);
    /* drawn as plain greys, so its brightness IS the push the gather above used */
    for(let i=0;i<w*w;i++){ const v=Math.round(255*M[i]), q=i*4; mi.data[q]=mi.data[q+1]=mi.data[q+2]=v; mi.data[q+3]=255; }
    mx.putImageData(mi,0,0);
    return (c,t)=>{
      const u=stepT(mod(t,P),12); reset(c,px);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      /* where the map sheet is: hovering, dropping (lands with a small overshoot), gone into the comp, lifting off */
      let mapOn=true, off=1;
      if(u<.45) off=1; else if(u<.95) off=1-settle(seg(u,.45,.95)); else if(u<3.2){ mapOn=false; off=0; } else if(u<3.75) off=E.out(seg(u,3.2,3.75)); else off=1;
      const a = !mapOn? Math.round(LV*E.out(seg(u,.95,1.35))) : 0;
      c.drawImage(LVL[a],X,Y,S,S);
      tab(c,X,Y+S+.9,'LAYER',4.4,BONE,INK);
      if(mapOn){ const mxp=X+HX*off, myp=Y+HY*off; c.fillStyle=COAL; c.fillRect(mxp-.9,myp-.9,S+1.8,S+1.8); c.drawImage(MAP,mxp,myp,S,S); tab(c,mxp,myp-6.6,'MAP',4.4,BONE,INK); }
      else tab(c,X,Y-6.6,'MAP',4.4,INK,BONE);
    };
  } },

/* NOISE WARP. Type poster, Ink on vermilion. WARP_FX.fractalwarp at Strength 40, Feature size 100 %, Octaves 3, Churn 1.5: three
   octaves of crossed sines push every pixel by up to 31 px of a 1080 frame, and Churn moves their phase so the letters boil. The
   outlines are bent by the inverse of that field (four fixed-point steps), cut in and out on hard cuts, on twos. */
{ id:'fractalwarp', name:'Noise Warp', section:'Warping', isNew:true, still:1.6,
  line:'A smooth noise field pushes the picture about; with Churn up it keeps moving, like heat haze over the letters.',
  make(px){
    const P=4.4, AMT=40*.4, EV=1.5;
    const LET=[rect(4,4,13,45),rect(35,4,13,45),rect(4,21.5,44,11),
      rect(53,4,13,45),rect(53,4,52,11.5),rect(53,21.5,44,11),rect(53,37.5,52,11.5),
      [[3,97],[17.5,53],[35.5,53],[50,97],[37,97],[34.2,88],[18.8,88],[16,97]],[[21.2,79],[31.8,79],[26.5,62]],
      rect(53,53,52,12),rect(72.5,53,13,44)].map(p=>dice(p,.6));
    const field=(x,y,ph)=>{ const X=x/F, Y=y/F;
      const nx=Math.sin(X/57+Y/40+ph)+Math.sin(X/29-Y/53+ph*1.7)*.6+Math.sin(X/15+Y/19+ph*2.9)*.35;
      const ny=Math.cos(X/47-Y/61+ph)+Math.sin(X/35+Y/27+ph*1.7)*.6+Math.cos(X/13-Y/21+ph*2.9)*.35;
      return [nx*AMT*F, ny*AMT*F]; };
    return (c,t)=>{
      const u=stepT(mod(t,P),12); reset(c,px);
      c.fillStyle=VERM; c.fillRect(0,0,100,100);
      const on=u>=.55&&u<3.55, ph=u*EV;
      c.fillStyle=INK; c.beginPath();
      for(const pts of LET){
        for(let i=0;i<pts.length;i+=2){ let x=pts[i], y=pts[i+1];
          if(on){ let ox=x, oy=y; for(let k=0;k<4;k++){ const d=field(ox,oy,ph); ox=x-d[0]; oy=y-d[1]; } x=ox; y=oy; }
          i?c.lineTo(x,y):c.moveTo(x,y); }
        c.closePath(); }
      c.fill('nonzero');
    };
  } },

/* GLASS. Cut paper: a man in a hat against a lit window. WARP_FX.glass at Distortion 24 px: each pixel (Facet size 1) or each 12 px
   facet takes its colour from up to 24 px away, chosen by the effect's own integer hash, so the edges frost and then break into
   pebbles. Both states are that gather, run once here on the painted picture. */
{ id:'glass', name:'Glass', section:'Warping', isNew:true, still:2.6,
  line:'The picture looks as if it is behind textured glass: fine frosting at small facets, chunky pebbles at bigger ones.',
  make(px){
    const P=4.4, AMT=24;
    const [S,sx]=sheet(px,px,true); sx.setTransform(px/100,0,0,px/100,0,0);
    sx.fillStyle=YEL; sx.fillRect(0,0,100,100);
    /* the door's other leaf, in shadow: one straight, slightly leaning edge for the glass to break up */
    sx.fillStyle=VERM; sx.beginPath(); sx.moveTo(71,0); sx.lineTo(100,0); sx.lineTo(100,100); sx.lineTo(74.5,100); sx.closePath(); sx.fill();
    const MAN=[[4,100],[8,86.5],[16.5,79.5],[30,74.5],[37,70.5],[38.5,64.5],[34,60],[32.2,52.5],[32.5,44.5],[24,43.6],[21.5,41.8],[33,38.8],[33.4,30],[36.2,23.4],[44,25.8],[52.5,22.6],[56.2,29.4],[56.4,37.6],[67.5,39.6],[66.4,41.8],[57.2,42.6],[58.4,48],[61.4,52.2],[58.4,54.2],[58.6,58.2],[56.2,61.2],[51.2,63.2],[50.6,68.4],[60,73.2],[72.5,78.4],[80.5,86.5],[84,100]];
    sx.fillStyle=INK; sx.beginPath(); MAN.forEach((p,i)=>i?sx.lineTo(p[0],p[1]):sx.moveTo(p[0],p[1])); sx.closePath(); sx.fill();
    sx.setTransform(1,0,0,1,0,0); const src=sx.getImageData(0,0,px,px).data;
    const state=(scale,seed)=>{ const [C,x]=sheet(px), im=x.createImageData(px,px), o=im.data, ps=px/1080, g=AMT*ps;
      const gsc=scale>1?Math.max(1,Math.round(scale*ps)):1;
      for(let y=0;y<px;y++) for(let xx=0;xx<px;xx++){ const gcx=gsc===1?xx:Math.floor(xx/gsc), gcy=gsc===1?y:Math.floor(y/gsc);
        let h=(gcx*374761393+gcy*668265263+seed*2246822519)|0; h=(h^(h>>13))*1274126177; h=h^(h>>16);
        const dx=((h&255)/255-.5)*2*g, dy=(((h>>8)&255)/255-.5)*2*g;
        let sxp=(xx+dx)|0, syp=(y+dy)|0; if(sxp<0) sxp=0; else if(sxp>=px) sxp=px-1; if(syp<0) syp=0; else if(syp>=px) syp=px-1;
        const si=(syp*px+sxp)*4, di=(y*px+xx)*4; o[di]=src[si]; o[di+1]=src[si+1]; o[di+2]=src[si+2]; o[di+3]=255; }
      x.putImageData(im,0,0); return C; };
    const FROST=state(1,0), PEB=state(12,0), [PLAIN,pl]=sheet(px); pl.drawImage(S,0,0);
    return (c,t)=>{
      const u=mod(t,P); c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(u<.5||u>=3.45?PLAIN:u<1.95?FROST:PEB,0,0);
    };
  } },

/* HEXAGON TILES. Two-ink print, the kind of map a results night uses: Australia on bare paper, Western Australia in the yellow plate
   and the rest in teal, the plates 0.7 out of register along the 129th meridian. PIXEL_FX.hextiles' own lattice (rows 0.75 of a tile
   apart, odd rows shifted half a tile, each tile the colour at its centre) at Tile size 40 and 64 px of a 1080 frame, then Grout 16 %
   with the Grout colour set to the paper. Every state is that gather, run once here. */
{ id:'hextiles', name:'Hexagon Tiles', section:'Warping', isNew:true, still:3.0,
  line:'The picture is rebuilt from hexagons, each one the colour at its centre; Grout draws a gap between them.',
  make(px){
    const P=4.8, RT='#1f7f70', RY='#f6c544', K=2.5, X0=4, Y0=6;
    const [S,sx]=sheet(px); sx.setTransform(px/100,0,0,px/100,0,0);
    /* the coastline in degrees (longitude, south latitude), drawn on a plain plate carree squeezed to cos 26 degrees */
    const geo=a=>a.map(q=>[X0+(q[0]-113)*.9*K, Y0+(q[1]-10.5)*K]);
    const MAIN=geo([[122.2,17.9],[122.9,16.4],[123.6,16.6],[124.4,15.6],[125.2,14.6],[126.1,14.1],[127,13.8],[127.9,14.6],[128.4,15.4],[129.2,14.9],[129.7,14.2],[130.3,12.9],[130.9,12.4],[131.6,12.1],[132.6,11.4],[133.9,11.8],[135.2,12.1],[136.6,11.9],[136.9,12.4],[136.2,13.4],[135.6,14.6],[135.8,15.3],[137,16],[138.3,16.8],[139.4,17.5],[140.7,17.5],[141.4,16.4],[141.6,14.8],[141.5,13],[141.9,11.9],[142.5,10.7],
      [143.2,11.9],[143.6,14.1],[144.6,14.4],[145.4,15.9],[145.9,17.2],[146.3,18.9],[147.6,19.6],[148.8,20.4],[149.6,22.2],[150.8,22.6],[151.4,23.8],[152.7,25.3],[153.1,26.4],[153.6,28.6],[153.1,30.3],[152.6,32.2],[151.3,33.8],[150.6,35.2],[150,37.4],
      [148.8,37.8],[147.6,38],[146.4,39.1],[145.5,38.6],[144.9,38],[144,38.6],[142.4,38.4],[141,38.1],[140,37.6],[139.7,36.9],[138.9,35.6],[138.5,34.8],[138.2,34.2],[137.4,35.2],[137.8,32.6],[135.8,34.9],[135.2,34.5],[134.2,33.1],[133,32.2],[131.2,31.5],[129,31.7],[127,32.2],[125,32.9],[123.8,33.9],[121.8,33.9],[119.9,34.3],[118,35.1],[116.6,35],[115.1,34.4],
      [115,33.5],[115.6,33.3],[115.7,32],[115.1,30.5],[114.9,29],[114.2,27.7],[113.5,26.5],[113.6,24.8],[113.9,22.8],[114.1,21.8],[115.5,21.4],[116.8,20.6],[118.6,20.3],[120.3,19.8],[121.4,19.2]]);
    const TAS=geo([[144.6,40.7],[146,41.1],[148.3,40.9],[148.3,42],[147.9,43.2],[146.9,43.6],[145.9,43.4],[145.2,42.2],[144.7,41.4]]);
    const BX=X0+(129-113)*.9*K;   /* the WA border */
    const land=(dx,dy)=>{ sx.beginPath(); [MAIN,TAS].forEach(p=>{ p.forEach((q,i)=>i?sx.lineTo(q[0]+dx,q[1]+dy):sx.moveTo(q[0]+dx,q[1]+dy)); sx.closePath(); }); };
    sx.fillStyle=BONE; sx.fillRect(0,0,100,100);
    sx.globalCompositeOperation='multiply'; sx.lineJoin='round';
    /* yellow plate: the land west of the border */
    sx.save(); sx.beginPath(); sx.rect(0,0,BX+.3,100); sx.clip(); sx.fillStyle=RY; land(-.35,-.3); sx.fill(); sx.restore();
    /* teal plate: the land east of it (the two overlap a hair at the border, so it overprints rather than showing paper) */
    sx.save(); sx.beginPath(); sx.rect(BX-.3,0,100,100); sx.clip(); sx.fillStyle=RT; land(.35,.3); sx.fill(); sx.restore();
    sx.globalCompositeOperation='source-over';
    /* the gather runs on a copy of at most 400 px (a 64 px tile is still 24 px across there) */
    const N=Math.min(px,400), [SN,sn]=sheet(N,N,true); sn.drawImage(S,0,0,N,N); const src=sn.getImageData(0,0,N,N).data;
    const GC=hexRGB(BONE);   /* Grout colour set to the paper, so the land falls apart into cells and the sea stays clean */
    /* one pass per Tile size; with Grout, the same cells again with the band along every border painted in the grout colour */
    const tiles=(size,gap)=>{ const [C,x]=sheet(N), im=x.createImageData(N,N), o=im.data, s=Math.max(2,size*N/1080), rh=s*.75, hf=s*.5, g2=gap/100*s/2;
      const [CG,xg]=sheet(N), ig=g2>0?xg.createImageData(N,N):null, og=ig?ig.data:null;
      for(let y=0;y<N;y++){ const row=Math.floor(y/rh), sh=(row&1)?hf:0;
        for(let xx=0;xx<N;xx++){ const col=Math.floor((xx-sh)/s); let best=1e9, bx=xx, by=y, bcx=0, bcy=0;
          for(let ro=-1;ro<=1;ro++){ const r2=row+ro, cy=r2*rh+rh*.5, s2=(r2&1)?hf:0; for(let co=-1;co<=1;co++){ const cx=(col+co)*s+s2+hf, dx=xx-cx, dy=y-cy, d=dx*dx+dy*dy; if(d<best){ best=d; bx=Math.round(cx); by=Math.round(cy); bcx=cx; bcy=cy; } } }
          bx=bx<0?0:bx>=N?N-1:bx; by=by<0?0:by>=N?N-1:by;
          const si=(by*N+bx)*4, di=(y*N+xx)*4; o[di]=src[si]; o[di+1]=src[si+1]; o[di+2]=src[si+2]; o[di+3]=255;
          if(og){ let e=1e9; for(let ro=-2;ro<=2;ro++){ const r3=row+ro, cy=r3*rh+rh*.5, s3=(r3&1)?hf:0; for(let co=-2;co<=2;co++){ const cx=(col+co)*s+s3+hf; if(cx===bcx&&cy===bcy) continue; const L=Math.hypot(cx-bcx,cy-bcy); if(!(L>0)) continue; const dx=xx-cx, dy=y-cy, ek=(dx*dx+dy*dy-best)/(2*L); if(ek<e) e=ek; } }
            const G=e<g2; og[di]=G?GC[0]:o[di]; og[di+1]=G?GC[1]:o[di+1]; og[di+2]=G?GC[2]:o[di+2]; og[di+3]=255; }
        } }
      x.putImageData(im,0,0); if(ig) xg.putImageData(ig,0,0); return ig?[C,CG]:[C]; };
    const T40=tiles(40,0)[0], T64=tiles(64,16), ST=[T40,T64[0],T64[1]];
    return (c,t)=>{
      const u=mod(t,P); c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      const k = u<.7?-1 : u<1.35?0 : u<2.0?1 : u<3.95?2 : -1;
      c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      c.drawImage(k<0?S:ST[k],0,0,px,px);
    };
  } },

/* CENTRE SQUEEZE. Viewer overlay on cross-print cloth, ink crosses on bone. WARP_FX.innerpinch: inside a disc of Size 60 %
   (of the half-diagonal) each pixel reads from 1 + Amount*(1 - (r/R)^2)*0.8 times further out, so the middle shrinks, the rim
   stretches and the edge of the disc stays put. Amount 0.5 (the default) settles in, then Centre X is keyframed from 38 to 60 %.
   Each cross is drawn bent by the exact inverse (that radius map is monotonic inside the disc, so a few Newton steps find where each
   point of a cross lands). (Cloth changed by checker 3: polka dots repeated the Dots tile's dotted mug and Halftone's dots.) */
{ id:'innerpinch', name:'Centre Squeeze', section:'Warping', isNew:true, still:1.6,
  line:'Everything inside a circle is drawn in towards its centre, smallest in the middle; the circle can be moved anywhere.',
  make(px){
    const P=4.8, R=.6*Math.hypot(50,50), CY=47, X0=38, X1=60;
    /* cross-print cloth: ink crosses on two square lattices, the second half a step across and down; each cross a closed outline
       cut into short steps so the warp can bend it. Only the cloth in the frame is drawn: a warp has nothing beyond it to pull in. */
    const D=15.2, AL=3.7, AW=1.25, BANDS=[];
    const cross=(x,y)=>[[x-AW,y-AL],[x+AW,y-AL],[x+AW,y-AW],[x+AL,y-AW],[x+AL,y+AW],[x+AW,y+AW],[x+AW,y+AL],[x-AW,y+AL],[x-AW,y+AW],[x-AL,y+AW],[x-AL,y-AW],[x-AW,y-AW]];
    for(let j=-1;j<=8;j++) for(let i=-1;i<=8;i++) for(const h of [0,.5]){ const x=(i+h)*D+3.2, y=(j+h)*D+2.6;
      if(x<-AL||x>100+AL||y<-AL||y>100+AL) continue; BANDS.push(dice(cross(x,y),.75)); }
    /* where source radius rs lands: solve r*(1 + 0.8a(1 - r^2/R^2)) = rs */
    const land=(rs,a)=>{ if(a===0||rs>=R) return rs; let r=rs/(1+.8*a); for(let i=0;i<6;i++){ const q=r/R, g=r*(1+.8*a*(1-q*q))-rs, dg=1+.8*a-2.4*a*q*q; r-=g/dg; } return r; };
    const state=u=>{
      const a = u<.5?0 : u<1.3? .5*settle(seg(u,.5,1.3)) : u<3.6? .5 : u<4.2? .5*(1-E.inOut(seg(u,3.6,4.2))) : 0;
      const cx = u<1.9?X0 : u<2.9? lerp(X0,X1,E.inOut(seg(u,1.9,2.9))) : u<4.25?X1 : lerp(X1,X0,E.inOut(seg(u,4.25,4.75)));   /* at Amount 0 the handle goes home and the picture does not move */
      return {a,cx}; };
    return (c,t)=>{
      const u=mod(t,P), s=state(u); reset(c,px);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      c.fillStyle=INK; c.beginPath();
      for(const pts of BANDS){
        for(let i=0;i<pts.length;i+=2){ const x=pts[i], y=pts[i+1], dx=x-s.cx, dy=y-CY, rs=Math.hypot(dx,dy); let X=x, Y=y;
          if(s.a!==0&&rs<R&&rs>1e-6){ const ro=land(rs,s.a); X=s.cx+dx/rs*ro; Y=CY+dy/rs*ro; }
          i?c.lineTo(X,Y):c.moveTo(X,Y); }
        c.closePath(); }
      c.fill();
      /* the gizmo: Size circle, centre anchor, and Centre X's two keyframes on its path */
      c.strokeStyle=NAVY; c.lineWidth=1.5; c.beginPath(); c.arc(s.cx,CY,R,0,TAU); c.stroke();
      c.strokeStyle=TEAL; c.lineWidth=.7; c.stroke();
      const kf=(x)=>{ c.fillStyle=YEL; c.beginPath(); c.moveTo(x,CY-2); c.lineTo(x+2,CY); c.lineTo(x,CY+2); c.lineTo(x-2,CY); c.closePath(); c.fill(); };
      const su=stepT(u,12); if(su>=1.6&&su<3.3){ c.strokeStyle=YEL; c.lineWidth=.5; c.beginPath(); c.moveTo(X0,CY); c.lineTo(X1,CY); c.stroke(); kf(X0); kf(X1); }
      c.fillStyle=TEAL; c.fillRect(s.cx-1.4,CY-1.4,2.8,2.8); c.fillStyle=NAVY; c.fillRect(s.cx-.5,CY-.5,1,1);
      tab(c,3,3,'AMT '+s.a.toFixed(2),4.6,NAVY,TEXT);
    };
  } },

/* LENS DISTORTION. Broadcast bench: a framing chart in white on true black. PIXEL_FX.lensdistort reads each channel from
   c + d/Zoom * (1 + k1 r^2) * (1 +- Fringing*0.045*r), green unshifted: the defaults (Barrel 0.18, Zoom 118 %, Fringing 0.3), then
   Barrel -0.18 at Zoom 100 % (pincushion). The chart's lines are bent by solving that per channel, and the three channels add. */
{ id:'lensdistort', name:'Lens Distortion', section:'Warping', isNew:true, still:1.6,
  line:'Straight lines bow out like a wide lens (or in, below zero), with a little colour fringing toward the corners.',
  make(px){
    const P=4.4, MR=Math.hypot(50,50);
    const lines=[];
    const poly=(pts,w,col)=>lines.push({pts:dice(pts,.8),closed:true,w,col});
    for(let k=1;k<8;k++){ const v=k*12.5; lines.push({pts:seq([[v,0],[v,100]]),closed:false,w:.45,col:.62}); lines.push({pts:seq([[0,v],[100,v]]),closed:false,w:.45,col:.62}); }
    function seq(p){ const a=p[0], b=p[1], n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.1), o=[]; for(let i=0;i<=n;i++){ const q=i/n; o.push(a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q); } return new Float32Array(o); }
    poly(rect(5,5,90,90),.8,1); poly(rect(10,10,80,80),.6,1);   /* the action-safe and title-safe boxes */
    { const o=[]; for(let i=0;i<120;i++){ const a=i/120*TAU; o.push([50+Math.cos(a)*24,50+Math.sin(a)*24]); } poly(o,.8,1); }
    lines.push({pts:seq([[44,50],[56,50]]),closed:false,w:.8,col:1}); lines.push({pts:seq([[50,44],[50,56]]),closed:false,w:.8,col:1});
    /* one channel's forward map: the output point whose sample lands on source point (x,y) */
    const solve=(rho,k1,g)=>{ let u=rho/(1+k1*rho*rho+g*rho); for(let i=0;i<4;i++){ const u2=u*u, f=1+k1*u2, h=u*f*(1+g*u)-rho, dh=(1+3*k1*u2)*(1+g*u)+u*f*g; u-=h/dh; } return u; };
    const state=u=>{ if(u<.6||u>=3.7) return {k1:0,zoom:1,ch:0};
      if(u<1.0){ const q=seg(u,.6,1.0); return {k1:.18*q,zoom:1+.18*q,ch:.3*q}; }
      if(u<2.3) return {k1:.18,zoom:1.18,ch:.3};
      if(u<2.7){ const q=seg(u,2.3,2.7); return {k1:lerp(.18,-.18,q),zoom:lerp(1.18,1,q),ch:.3}; }
      return {k1:-.18,zoom:1,ch:.3}; };
    const CH=[[238,0,0,1],[0,242,0,0],[0,0,248,-1]];
    return (c,t)=>{
      const u=stepT(mod(t,P),25), s=state(u); reset(c,px);
      c.fillStyle='#000'; c.fillRect(0,0,100,100);
      c.save(); c.beginPath(); c.rect(0,0,100,100); c.clip();
      c.globalCompositeOperation='lighter'; c.lineJoin='round';
      for(const ch of CH){ const g=ch[3]*s.ch*.045;
        for(const L of lines){ c.strokeStyle='rgb('+Math.round(ch[0]*L.col)+','+Math.round(ch[1]*L.col)+','+Math.round(ch[2]*L.col)+')'; c.lineWidth=L.w; c.beginPath(); let pen=false;
          const n=L.pts.length;
          for(let i=0;i<=n;i+=2){ if(i===n&&!L.closed) break; const j=i%n, dx=L.pts[j]-50, dy=L.pts[j+1]-50, r=Math.hypot(dx,dy), rho=r/MR;
            let X=50, Y=50; if(r>1e-6){ const uo=solve(rho,s.k1,g), res=uo*(1+s.k1*uo*uo)*(1+g*uo)-rho;
              if(!(uo>0)||Math.abs(res)>1e-4||(s.k1<0&&uo>=1/Math.sqrt(-3*s.k1))){ pen=false; continue; }   /* past the fold: that part of the chart is not in the picture */
              const ro=uo*s.zoom*MR; X=50+dx/r*ro; Y=50+dy/r*ro; }
            pen?c.lineTo(X,Y):c.moveTo(X,Y); pen=true; }
          c.stroke(); } }
      c.restore();
      c.globalCompositeOperation='source-over';
      const v=s.k1; tab(c,2.5,90.5,'BARREL '+(v<0?'-':'+')+Math.abs(v).toFixed(2),4.4,'#000',TEXT);
    };
  } }

);
})();
