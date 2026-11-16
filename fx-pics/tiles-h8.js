/* FreeMotion effect pictures, round 5 slot 8: CRT (#1246 U9), redrawn on the upgraded kernel (effects branch), H broadcast bench.
   The screen is the kernel's own arithmetic on his photograph (crt13: Tube curvature, the scanline, the stripe mask, Bloom when it is
   above 0, the tube vignette), worked once in make(). POWER is crtPower to the letter, per frame:
     1 .. 0.45  the picture squashed toward the middle line, sy = (Power - 0.45) / 0.55 of its height, brightened by 1 + (1 - sy) x 0.8
                (a second copy added with 'lighter' at alpha 0.8 x (1 - sy) is exactly that multiply, clipped at white);
     0.45 .. 0.12  a flat rgb(235,240,255) line 0.8 % of the height tall, shrinking from full width to the dot's width;
     0.12 .. 0  a dot of radius 2.2 line-heights, brightness Power / 0.12 x (1 - d / r): one linear radial gradient over black;
     0  black.
   Power is keyframed (linear) at the KF times below and the clock ticks at 25 fps, so every frame is a real frame of that keyframed
   CRT. The layer is 86 of the photograph's 100 rows (a 1080 x 929 layer in a 1080-wide comp); the strip under it is furniture. */
(function(){
'use strict';
const {clamp,photoCover}=window.FXK;
const TXT='#eef2f8', DIM='#8b96a8', KEY='#ffce4a', HAIR='#2b3547';
const MONO='"Courier Prime","Courier New",Courier,monospace';
const begin=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
/* revuelto's two number plates, blanked on the source (tiles-fix-2.js's coordinates, 0..100 of the square photograph) */
const PLATES=[['#18181b',[[19.6,63.1],[29.3,63.1],[29.3,66.7],[19.6,66.7]]],['#7f92a4',[[78.2,57.2],[86.6,57.2],[86.6,60],[78.2,60]]]];
/* a box blur of radius r on a 3-channel float plane, in place, replicating the edge (crtBox13) */
function box3(a,W,H,r){ const k=1/(2*r+1), t=new Float32Array(Math.max(W,H));
  for(let y=0;y<H;y++) for(let ch=0;ch<3;ch++){ const o=y*W*3+ch; let sum=0; for(let i=-r;i<=r;i++) sum+=a[o+clamp(i,0,W-1)*3]; for(let x=0;x<W;x++){ t[x]=sum*k; sum+=a[o+Math.min(W-1,x+r+1)*3]-a[o+Math.max(0,x-r)*3]; } for(let x=0;x<W;x++) a[o+x*3]=t[x]; }
  for(let x=0;x<W;x++) for(let ch=0;ch<3;ch++){ const o=x*3+ch, st=W*3; let sum=0; for(let i=-r;i<=r;i++) sum+=a[o+clamp(i,0,H-1)*st]; for(let y=0;y<H;y++){ t[y]=sum*k; sum+=a[o+Math.min(H-1,y+r+1)*st]-a[o+Math.max(0,y-r)*st]; } for(let y=0;y<H;y++) a[o+y*st]=t[y]; }
}

/* The settings the line names; every other control at its default (Amount 0.7, Scanlines 0.45, Phosphor mask 0.18, Vignette 0.55,
   Mask type Stripes, Bloom 0, Flicker 0, Roll bar 0). */
const AMT=.7, SL=.45, MK=.18, VG=.55, CELL=16, CURVE=50, BLOOM=0, CROP=.4;
/* Power's keyframes, [seconds into the loop, value], linear between: on; off (a line, a dot, black); on again. */
const P=5.2, KF=[[0,1],[1.5,1],[1.78,.45],[2.12,.12],[2.72,0],[3.3,0],[3.5,.12],[3.75,.45],[4.1,1],[P,1]];
const powerAt=m=>{ for(let i=1;i<KF.length;i++){ const a=KF[i-1], b=KF[i]; if(m<=b[0]) return a[1]+(b[1]-a[1])*((m-a[0])/((b[0]-a[0])||1)); } return 1; };

window.FX_TILES=window.FX_TILES||[];
window.FX_TILES.push(

{ id:'crt', name:'CRT', section:'Stylize', isNew:true, redrawn:true, still:1.68, KF:KF.map(k=>k.slice()), CROP,
  line:'Power keyframed from 1 to 0 and back: the picture squashes to a bright line, the line shrinks to a dot, the dot fades to black, then the TV comes back on (Tube curvature 50 %, Cell size 16 px).',
  make(px){
    const W=px, H=Math.round(px*.86), HU=86, y0=Math.round((px-H)*CROP), N=W*H;
    const [,sx]=photoCover('revuelto',px);
    for(const pl of PLATES){ sx.fillStyle=pl[0]; sx.beginPath(); pl[1].forEach((q,i)=>i?sx.lineTo(q[0],q[1]):sx.moveTo(q[0],q[1])); sx.closePath(); sx.fill(); }
    sx.setTransform(1,0,0,1,0,0);
    const s=sx.getImageData(0,y0,W,H).data;
    /* Tube curvature (crt13's first loop): each pixel reads the picture at nx(1 + k ny^2), ny(1 + k nx^2); past the glass, black */
    const rgb=new Float32Array(N*3), k=CURVE/100*.3;
    for(let y=0;y<H;y++){ const ny=(y+.5)/H*2-1;
      for(let x=0;x<W;x++){ const nx=(x+.5)/W*2-1, ux=nx*(1+k*ny*ny), uy=ny*(1+k*nx*nx), j=(y*W+x)*3;
        if(ux<-1||ux>1||uy<-1||uy>1) continue;
        const fx=(ux+1)*.5*W-.5, fy=(uy+1)*.5*H-.5; let xa=Math.floor(fx), ya=Math.floor(fy); const tx=fx-xa, ty=fy-ya; let xb=xa+1, yb=ya+1;
        if(xa<0)xa=0; if(ya<0)ya=0; if(xb>=W)xb=W-1; if(yb>=H)yb=H-1;
        const a=(ya*W+xa)*4, b=(ya*W+xb)*4, e=(yb*W+xa)*4, f=(yb*W+xb)*4;
        for(let ch=0;ch<3;ch++) rgb[j+ch]=(s[a+ch]*(1-tx)+s[b+ch]*tx)*(1-ty)+(s[e+ch]*(1-tx)+s[f+ch]*tx)*ty; } }
    /* Bloom's halo (when Bloom is above 0): the squared brightness, two box passes of 1.5 % of the short side */
    const halo=new Float32Array(N*3);
    if(BLOOM>0){ for(let i=0;i<N*3;i++) halo[i]=rgb[i]*rgb[i]/255; const br=Math.max(1,Math.round(Math.min(W,H)*.015)); box3(halo,W,H,br); box3(halo,W,H,br); }
    /* the scanline, the stripe mask, Bloom's fill, the tube vignette and the halo screened back (crt13's second loop).
       Cell size is in comp pixels: 16 of 1080 across, the way the app scales it to a plate. */
    const cell=Math.max(1,Math.round(CELL*px/1080)), m1=1-AMT*MK, hk=BLOOM*.8/255, cx=W/2, cy=H/2, maxR=Math.hypot(cx,cy);
    const out=new ImageData(W,H), d=out.data;
    for(let y=0;y<H;y++){ const scan=(Math.floor(y/cell)&1)?(1-AMT*SL):1;
      for(let x=0;x<W;x++){ const j=y*W+x, i=j*4, q=j*3, ph=Math.floor(x/cell)%3, R0=rgb[q], G0=rgb[q+1], B0=rgb[q+2];
        let kr=scan, kg=scan, kb=scan;
        if(ph===0){ kg*=m1; kb*=m1; } else if(ph===1){ kr*=m1; kb*=m1; } else { kr*=m1; kg*=m1; }
        const fill=BLOOM*.85*(.299*R0+.587*G0+.114*B0)/255; kr+=(1-kr)*fill; kg+=(1-kg)*fill; kb+=(1-kb)*fill;
        const r=Math.hypot(x-cx,y-cy)/maxR, vg=1-AMT*VG*Math.max(0,r-.4);
        let RR=R0*kr*vg, GG=G0*kg*vg, BB=B0*kb*vg;
        RR+=(255-RR)*halo[q]*hk; GG+=(255-GG)*halo[q+1]*hk; BB+=(255-BB)*halo[q+2]*hk;
        d[i]=RR; d[i+1]=GG; d[i+2]=BB; d[i+3]=255; } }
    const ON=document.createElement('canvas'); ON.width=W; ON.height=H; ON.getContext('2d').putImageData(out,0,0);
    const CY=HU/2, TH=.008*HU, RD=TH*2.2, BX=70, BW=27;
    const draw=(c,t)=>{ begin(c,px);
      const fr=Math.floor((((t%P)+P)%P)*25+1e-6), m=fr/25, pw=powerAt(m);
      c.fillStyle='#000'; c.fillRect(0,0,100,100);
      if(pw>=1) c.drawImage(ON,0,0,100,HU);
      else if(pw>.45){ const sy=(pw-.45)/.55, half=Math.max(TH/2,sy*HU/2), g=(1-sy)*.8;
        c.imageSmoothingEnabled=false;   /* the kernel takes the nearest row, it does not average them */
        c.drawImage(ON,0,CY-half,100,2*half);
        if(g>0){ c.globalCompositeOperation='lighter'; c.globalAlpha=g; c.drawImage(ON,0,CY-half,100,2*half); c.globalAlpha=1; c.globalCompositeOperation='source-over'; }
        c.imageSmoothingEnabled=true; }
      else if(pw>.12){ const f=(pw-.12)/.33, hw=RD+f*Math.max(0,50-RD); c.fillStyle='rgb(235,240,255)'; c.fillRect(50-hw,CY-TH/2,2*hw,TH); }
      else if(pw>0){ const g=c.createRadialGradient(50,CY,0,50,CY,RD); g.addColorStop(0,'rgba(255,255,255,'+(pw/.12).toFixed(4)+')'); g.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=g; c.fillRect(50-RD,CY-RD,2*RD,2*RD); }
      /* the bench under the picture: timecode, and Power's keyframed value on a meter */
      c.font='700 5.4px '+MONO; c.textBaseline='middle';
      c.fillStyle=DIM; c.fillText('00:04:'+String(12+Math.floor(fr/25)).padStart(2,'0')+':'+String(fr%25).padStart(2,'0'),3,93.4);
      c.font='700 4.6px '+MONO; c.fillStyle=DIM; c.fillText('PWR',BX-9.4,93.5);
      c.fillStyle=HAIR; c.fillRect(BX,92.6,BW,1.6);
      c.fillStyle=TXT; c.fillRect(BX,92.6,BW*clamp(pw),1.6);
      const kx=BX+BW*clamp(pw); c.fillStyle=KEY; c.beginPath(); c.moveTo(kx,91.1); c.lineTo(kx+1.5,93.4); c.lineTo(kx,95.7); c.lineTo(kx-1.5,93.4); c.closePath(); c.fill();
      c.textBaseline='alphabetic';
    };
    draw.powerAt=t=>powerAt(Math.floor((((t%P)+P)%P)*25+1e-6)/25);
    return draw;
  } }

);
})();
