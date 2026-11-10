/* FreeMotion effect pictures, artist c2: seven Colouring tiles. No photographs: every subject is drawn here, then the effect's own
   kernel from js/compositor.js runs on those pixels once, inside make(). Each tile's note says which settings it shows; every one was
   rendered beside the real renderer on the same drawn pixels (truth.html) and matches it. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', NAVY='#161c28', TEXT='#eef2f8', DIM='#8b96a8', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.shadowBlur=0; c.shadowColor='rgba(0,0,0,0)'; c.shadowOffsetX=0; c.shadowOffsetY=0; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
/* a canvas of n px with its 0..100 drawing done by fn, plus its pixels (the tile's one getImageData) */
function drawn(n,fn){ const [C,x]=sheet(n); x.setTransform(n/100,0,0,n/100,0,0); fn(x,n); x.setTransform(1,0,0,1,0,0); return {C,x,im:x.getImageData(0,0,n,n)}; }
function fromData(w,h,data){ const [C,x]=sheet(w,h), im=x.createImageData(w,h); im.data.set(data); x.putImageData(im,0,0); return C; }
function tab(c,x,y,txt,s,bg,fg){ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; }
const hexRGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const css=a=>'rgb('+Math.round(a[0])+','+Math.round(a[1])+','+Math.round(a[2])+')';
const circle=(x,cx,cy,r)=>{ x.beginPath(); x.arc(cx,cy,r,0,TAU); };
/* precomputed states, crossfaded: v runs 0..LV.length-1 */
function levels(c,LV,v,x,y,w,h){ v=clamp(v,0,LV.length-1); const i=Math.floor(v), f=v-i; c.globalAlpha=1; c.drawImage(LV[i],x,y,w,h); if(f>.004&&i+1<LV.length){ c.globalAlpha=f; c.drawImage(LV[i+1],x,y,w,h); c.globalAlpha=1; } }

window.FX_TILES.push(

/* FADED FILM. Graded still: a rowing boat from above on dark water, drawn here. PIXEL_FX.faded's own lines at Amount 0.8, Milky blacks
   40, Colour loss 15, Warm / cool 100 (all but Amount and Milky blacks at their defaults): the near-black water lifts to about 51, white
   drops to about 230, and a small warm cast goes over everything. Amount travels 0 to 0.8, holds, and comes back. */
{ id:'faded', name:'Faded Film', section:'Colouring', isNew:true, still:2.4,
  line:'The blacks lift to a milky grey, the whites dull a little and the whole picture takes a warm cast.',
  make(px){
    const P=4.4, AMT=.8, LIFT=40, STEPS=8;
    const src=drawn(px,(x)=>{
      /* dark water, a touch lighter toward the top left where it catches the sky */
      const wg=x.createLinearGradient(0,0,100,100); wg.addColorStop(0,'#0f262b'); wg.addColorStop(.45,'#061518'); wg.addColorStop(1,'#020809'); x.fillStyle=wg; x.fillRect(0,0,100,100);
      const R=rng(17); x.lineCap='round';
      for(let i=0;i<80;i++){ const cx=R()*110-5, cy=R()*110-5, w=2+R()*7; x.strokeStyle='rgba(150,195,200,'+(.04+R()*.08).toFixed(3)+')'; x.lineWidth=.25+R()*.35; x.beginPath(); x.moveTo(cx,cy); x.quadraticCurveTo(cx+w/2,cy-.5-R()*.6,cx+w,cy); x.stroke(); }
      x.save(); x.translate(50,51); x.rotate(-31*Math.PI/180); x.scale(1.38,1.38);
      const hull=k=>{ x.beginPath(); x.moveTo(-31*k,-7.6*k); x.bezierCurveTo(-18*k,-11.6*k,8*k,-12.2*k,31*k,0); x.bezierCurveTo(8*k,12.2*k,-18*k,11.6*k,-31*k,7.6*k); x.closePath(); };
      /* the wake behind the transom */
      x.strokeStyle='rgba(170,210,212,.16)'; x.lineWidth=.6; for(let k=1;k<=4;k++){ x.beginPath(); x.moveTo(-31-k*3.2,-7-k*2.2); x.quadraticCurveTo(-33-k*4,0,-31-k*3.2,7+k*2.2); x.stroke(); }
      /* the boat's shadow, then its painted hull, the gunwale, and the open wooden inside */
      x.save(); x.translate(1.4,2.6); hull(1.02); x.fillStyle='rgba(0,0,0,.5)'; x.fill(); x.restore();
      hull(1); x.fillStyle='#b5311c'; x.fill();
      hull(.91); x.fillStyle='#e8dfca'; x.fill();
      hull(.85); x.fillStyle='#a6713f'; x.fill();
      x.save(); hull(.85); x.clip();
      for(let k=-10;k<=10;k+=2.3){ x.fillStyle='rgba(58,30,12,.3)'; x.fillRect(-35,k,70,.28); }
      for(let s=-26;s<=26;s+=4.4){ x.fillStyle='rgba(66,36,15,.32)'; x.fillRect(s,-12,.45,24); }
      const ig=x.createLinearGradient(0,-11,0,11); ig.addColorStop(0,'rgba(0,0,0,.32)'); ig.addColorStop(.45,'rgba(0,0,0,0)'); ig.addColorStop(1,'rgba(255,236,200,.14)'); x.fillStyle=ig; x.fillRect(-35,-12,70,24);
      x.restore();
      x.save(); hull(.91); x.clip();
      for(const s of [-21,-2,15]){ x.fillStyle='rgba(0,0,0,.38)'; x.fillRect(s+.9,-12,3.7,24); x.fillStyle='#c99d65'; x.fillRect(s,-12,3.7,24); x.fillStyle='rgba(255,240,210,.4)'; x.fillRect(s,-12,.5,24); }
      x.restore();
      /* two oars: one shipped along the boat, one out over the side into the water */
      const oar=(a,b,shadow)=>{ const dx=b[0]-a[0], dy=b[1]-a[1], l=Math.hypot(dx,dy), ux=dx/l, uy=dy/l, nx=-uy, ny=ux, bl=9, bw=1.9, q=[b[0]-ux*bl,b[1]-uy*bl];
        x.fillStyle=shadow?'rgba(0,0,0,.5)':'#dcc59c';
        x.lineCap='round'; x.strokeStyle=x.fillStyle; x.lineWidth=1.05; x.beginPath(); x.moveTo(a[0],a[1]); x.lineTo(q[0],q[1]); x.stroke();
        x.beginPath(); x.moveTo(q[0]+nx*.5,q[1]+ny*.5); x.lineTo(b[0]+nx*bw,b[1]+ny*bw); x.lineTo(b[0]+ux*.8,b[1]+uy*.8); x.lineTo(b[0]-nx*bw,b[1]-ny*bw); x.lineTo(q[0]-nx*.5,q[1]-ny*.5); x.closePath(); x.fill();
        if(!shadow){ x.fillStyle='#b5311c'; x.beginPath(); x.moveTo(b[0]-ux*2.4+nx*bw,b[1]-uy*2.4+ny*bw); x.lineTo(b[0]+nx*bw,b[1]+ny*bw); x.lineTo(b[0]+ux*.8,b[1]+uy*.8); x.lineTo(b[0]-nx*bw,b[1]-ny*bw); x.lineTo(b[0]-ux*2.4-nx*bw,b[1]-uy*2.4-ny*bw); x.closePath(); x.fill(); } };
      x.save(); x.translate(2.4,2.2); oar([-9,-1],[5,31],true); x.restore();
      oar([-26,-3.5],[22,-5.5],false);
      oar([-9,-1],[5,31],false);
      x.restore();
    });
    const s=src.im.data, n=s.length, LV=[src.C];
    for(let k=1;k<=STEPS;k++){ const a=AMT*k/STEPS, lift=LIFT*a, con=1-.25*a, m=.15*a, d=new Uint8ClampedArray(n), CH=new Float64Array(256);
      for(let v=0;v<256;v++) CH[v]=128+(lift+v*(255-lift)/255-128)*con;   /* the kernel's ch(), as a table */
      for(let i=0;i<n;i+=4){ const r=s[i], g=s[i+1], b=s[i+2], L=r*.299+g*.587+b*.114, cr=CH[r], cg=CH[g], cb=CH[b];
        d[i]=cr+(L-cr)*m+8*a; d[i+1]=cg+(L-cg)*m+2*a; d[i+2]=cb+(L-cb)*m-6*a; d[i+3]=255; }
      LV.push(fromData(px,px,d)); }
    return (c,t)=>{
      const u=mod(t,P), a=u<.6?0:u<1.5?E.inOut(seg(u,.6,1.5)):u<3.6?1:u<4?1-E.inOut(seg(u,3.6,4)):0;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; levels(c,LV,a*STEPS,0,0,px,px); reset(c,px);
      tab(c,3.5,91,'AMOUNT '+(AMT*a).toFixed(2),4.4,BONE,INK);
    };
  } },

/* CORNER COLOURS. Three white paper lanterns hung at different heights against a pale plaster wall, drawn here. (Art director, ad:
   it was a white radio-telescope dish, the same subject as Scanlines' dish, and then a sloop, which sat right beside Faded Film's
   rowing boat.) Nearly everything is white or pale, so a multiply shows every tint, and each lantern takes the colour of the corner
   it hangs nearest. PIXEL_FX.fourcolor at Amount 0.85, Blend Multiply,
   Spread 100, with its own bilinear corners; Spin speed keyed to make two quarter turns (cornerSpin966: each colour slides to the next
   corner, clockwise). Multiply is linear in the gradient and the gradient is linear in the corner colours, so three precomputed turns
   crossfade to the exact frame. */
{ id:'fourcolor', name:'Corner Colours', section:'Colouring', isNew:true, still:1.4,
  line:'Each corner of the frame tints the picture a different colour, and Spin slides the colours round to the next corner.',
  make(px){
    const P=5, AMT=.85, COLS=['#e4471d','#ffce4a','#1f7f70','#3d63c9'].map(hexRGB);   /* top left, top right, bottom left, bottom right */
    const src=drawn(px,(x)=>{
      const wall=x.createLinearGradient(0,0,100,100); wall.addColorStop(0,'#f3f1ec'); wall.addColorStop(1,'#d9d6cf'); x.fillStyle=wall; x.fillRect(0,0,100,100);
      const R=rng(23); for(let i=0;i<120;i++){ x.fillStyle=R()<.5?'rgba(255,255,255,.05)':'rgba(120,112,100,.04)'; x.beginPath(); x.arc(R()*100,R()*100,1.5+R()*5,0,TAU); x.fill(); }
      /* a lantern: its cord from the top edge, a soft shadow on the wall down and right, a ribbed paper globe lit from the upper left,
         a dark wire ring at top and bottom */
      const lantern=(cx,cy,r)=>{ const rx=r, ry=r*.9;
        x.strokeStyle='#5b574f'; x.lineWidth=.35; x.beginPath(); x.moveTo(cx,-1); x.lineTo(cx,cy-ry); x.stroke();
        x.save(); x.shadowColor='rgba(70,62,50,.35)'; x.shadowBlur=r*.5*px/100; x.shadowOffsetX=(300+r*.28)*px/100; x.shadowOffsetY=r*.22*px/100; x.translate(-300,0);
        x.fillStyle='#000'; x.beginPath(); x.ellipse(cx,cy,rx,ry,0,0,TAU); x.fill(); x.restore();
        const g=x.createRadialGradient(cx-rx*.38,cy-ry*.42,r*.1,cx,cy,r*1.05); g.addColorStop(0,'#ffffff'); g.addColorStop(.55,'#f1eee6'); g.addColorStop(1,'#c8c3b8');
        x.fillStyle=g; x.beginPath(); x.ellipse(cx,cy,rx,ry,0,0,TAU); x.fill();
        x.save(); x.beginPath(); x.ellipse(cx,cy,rx,ry,0,0,TAU); x.clip(); x.strokeStyle='rgba(150,142,128,.45)'; x.lineWidth=.22;
        for(let k=-7;k<=7;k++){ const yy=cy+k*ry/7.6, w=rx*Math.sqrt(Math.max(0,1-Math.pow((yy-cy)/ry,2))); x.beginPath(); x.ellipse(cx,yy,w,w*.16,0,0,Math.PI); x.stroke(); }
        x.restore();
        x.strokeStyle='rgba(110,104,94,.7)'; x.lineWidth=.35; x.beginPath(); x.ellipse(cx,cy,rx,ry,0,0,TAU); x.stroke();
        x.fillStyle='#4a463f'; x.beginPath(); x.ellipse(cx,cy-ry+.4,rx*.24,rx*.06,0,0,TAU); x.fill(); x.beginPath(); x.ellipse(cx,cy+ry-.4,rx*.3,rx*.07,0,0,TAU); x.fill(); };
      lantern(78,24,12.5);
      lantern(22,34,15);
      lantern(52,66,22);
    });
    const s=src.im.data, N=px, n=s.length;
    const spin=(q)=>{ const ring=[COLS[0],COLS[1],COLS[3],COLS[2]], m=Math.floor(q), f=q-m, out=[];
      for(let j=0;j<4;j++){ const a=ring[(((j-m)%4)+4)%4], b=ring[(((j-m-1)%4)+4)%4]; out.push(f===0?a:[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f]); }
      return [out[0],out[1],out[3],out[2]]; };
    const turn=q=>{ const [c1,c2,c3,c4]=spin(q), d=new Uint8ClampedArray(n), iw=1/(N-1);
      for(let y=0;y<N;y++){ const v=y*iw, L=[0,1,2].map(k=>c1[k]*(1-v)+c3[k]*v), R=[0,1,2].map(k=>c2[k]*(1-v)+c4[k]*v);
        for(let x=0;x<N;x++){ const i=(y*N+x)*4, u=x*iw; for(let k=0;k<3;k++){ const gc=L[k]+(R[k]-L[k])*u, b=s[i+k], m=b*gc/255; d[i+k]=b+(m-b)*AMT; } d[i+3]=255; } }
      return fromData(N,N,d); };
    const T=[turn(0),turn(1),turn(2)];
    const q=u=>u<1.75?0:u<2.35?E.inOut(seg(u,1.75,2.35)):u<3.1?1:u<3.7?1+E.inOut(seg(u,3.1,3.7)):2;
    return (c,t)=>{
      const u=mod(t,P), a=u<.5?0:u<1.05?E.inOut(seg(u,.5,1.05)):u<4.35?1:u<4.75?1-E.inOut(seg(u,4.35,4.75)):0;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(src.C,0,0);
      if(a>0){ const qq=q(u), m=Math.min(1,Math.floor(qq)), f=qq-m;
        if(f<.004){ c.globalAlpha=a; c.drawImage(T[m],0,0); }
        else if(f>.996){ c.globalAlpha=a; c.drawImage(T[m+1],0,0); }
        else { c.globalAlpha=1; c.drawImage(T[m],0,0); c.globalAlpha=f; c.drawImage(T[m+1],0,0); }   /* turns only run at full Amount */
        c.globalAlpha=1; }
    };
  } },

/* GAMMA. Graded still: a record on a turntable from above, drawn here. The source is the same shot underexposed in the mids; the effect
   is PIXEL_FX.gamma's own table, 255 x (v/255)^(1/g), with g travelling 1 to 1.8 (the default). The grooves and the wood come up out of
   the dark while the deepest black stays 0 and the light on the tone arm stays 255. */
{ id:'gamma', name:'Gamma', section:'Colouring', isNew:true, still:2.4,
  line:'The midtones brighten and the shadows open up, while pure black and pure white stay exactly where they were.',
  make(px){
    const P=4.4, G=1.8, STEPS=8, CX=37, CY=62;
    const shot=drawn(px,(x)=>{
      /* the plinth, dark walnut */
      x.fillStyle='#5a3a22'; x.fillRect(0,0,100,100);
      const R=rng(5); for(let i=0;i<46;i++){ const y=R()*100; x.strokeStyle='rgba(30,16,6,'+(.18+R()*.25).toFixed(2)+')'; x.lineWidth=.2+R()*.5; x.beginPath(); x.moveTo(-2,y); x.bezierCurveTo(30,y+R()*3-1.5,70,y+R()*3-1.5,102,y+R()*2-1); x.stroke(); }
      /* the platter rim, brushed metal, and its shadow */
      circle(x,CX+1.2,CY+1.6,49); x.fillStyle='rgba(0,0,0,.45)'; x.fill();
      const rim=x.createLinearGradient(CX-48,CY-48,CX+48,CY+48); rim.addColorStop(0,'#d7d9db'); rim.addColorStop(.5,'#8e9093'); rim.addColorStop(1,'#5d5f62'); circle(x,CX,CY,48.6); x.fillStyle=rim; x.fill();
      /* the record: black, the grooves, the quiet bands between tracks */
      circle(x,CX,CY,46.4); x.fillStyle='#0b0b0c'; x.fill();
      for(let r=15.5;r<46;r+=.42){ circle(x,CX,CY,r); x.strokeStyle=(Math.round(r*2.4)%2)?'rgba(255,255,255,.07)':'rgba(255,255,255,.035)'; x.lineWidth=.2; x.stroke(); }
      for(const r of [45.3,38.6,31.2,24.8,17]){ circle(x,CX,CY,r); x.strokeStyle='rgba(255,255,255,.16)'; x.lineWidth=.55; x.stroke(); }
      /* the sheen: the light from the top right, mirrored in the grooves as two wedges */
      for(const [a0,al] of [[-.72,.2],[-.72+Math.PI,.08]]){ x.save(); x.beginPath(); x.moveTo(CX,CY); x.arc(CX,CY,46.3,a0-.12,a0+.12); x.closePath(); x.clip();
        const g=x.createRadialGradient(CX,CY,14,CX,CY,46); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(.6,'rgba(255,255,255,'+al+')'); g.addColorStop(1,'rgba(255,255,255,'+(al*.5)+')'); x.fillStyle=g; x.fillRect(CX-50,CY-50,100,100); x.restore(); }
      /* the label, the spindle */
      circle(x,CX,CY,14); x.fillStyle='#93281a'; x.fill();
      circle(x,CX,CY,10.6); x.strokeStyle='rgba(240,225,200,.55)'; x.lineWidth=.45; x.stroke();
      circle(x,CX,CY,5.5); x.strokeStyle='rgba(0,0,0,.35)'; x.lineWidth=.4; x.stroke();
      circle(x,CX,CY,1.25); x.fillStyle='#c4c6c8'; x.fill(); circle(x,CX-.35,CY-.35,.45); x.fillStyle='#ffffff'; x.fill();
      /* the tone arm from its pivot, top right, to the stylus in the grooves */
      const PV=[86,20], HS=[59,49];
      circle(x,PV[0]+1,PV[1]+1.5,8); x.fillStyle='rgba(0,0,0,.45)'; x.fill();
      circle(x,PV[0],PV[1],7.6); x.fillStyle='#1b1b1d'; x.fill(); circle(x,PV[0],PV[1],3.6); x.fillStyle='#a9abae'; x.fill(); circle(x,PV[0]-1,PV[1]-1,1.2); x.fillStyle='#ffffff'; x.fill();
      circle(x,95,9.5,4.4); x.fillStyle='#86888c'; x.fill(); circle(x,94,8.5,1.4); x.fillStyle='#e9eaeb'; x.fill();
      x.lineCap='round'; x.strokeStyle='rgba(0,0,0,.5)'; x.lineWidth=1.9; x.beginPath(); x.moveTo(PV[0]+1,PV[1]+1.6); x.lineTo(HS[0]+1,HS[1]+1.6); x.stroke();
      x.strokeStyle='#a7a9ac'; x.lineWidth=1.7; x.beginPath(); x.moveTo(PV[0],PV[1]); x.lineTo(HS[0],HS[1]); x.stroke();
      x.strokeStyle='#ffffff'; x.lineWidth=.4; x.beginPath(); x.moveTo(PV[0]-.5,PV[1]-.4); x.lineTo(HS[0]+1.6,HS[1]-1.7); x.stroke();
      x.save(); x.translate(HS[0],HS[1]); x.rotate(Math.atan2(HS[1]-PV[1],HS[0]-PV[0])+.35); x.fillStyle='#202022'; x.fillRect(-1.2,-2.1,6.4,4.2); x.fillStyle='#d7d8da'; x.fillRect(4.6,-.5,1.3,1); x.restore();
    });
    /* the source: the same shot, every channel pushed down by the inverse curve (what an underexposed camera hands you) */
    const r=shot.im.data, n=r.length, s=new Uint8ClampedArray(n);
    for(let i=0;i<n;i+=4){ for(let k=0;k<3;k++) s[i+k]=Math.round(255*Math.pow(r[i+k]/255,G)); s[i+3]=255; }
    const LV=[fromData(px,px,s)];
    for(let k=1;k<=STEPS;k++){ const g=1+(G-1)*k/STEPS, inv=1/g, LUT=new Uint8ClampedArray(256), d=new Uint8ClampedArray(n);
      for(let v=0;v<256;v++) LUT[v]=Math.round(255*Math.pow(v/255,inv));
      for(let i=0;i<n;i+=4){ d[i]=LUT[s[i]]; d[i+1]=LUT[s[i+1]]; d[i+2]=LUT[s[i+2]]; d[i+3]=255; }
      LV.push(fromData(px,px,d)); }
    return (c,t)=>{
      const u=mod(t,P), a=u<.6?0:u<1.5?E.inOut(seg(u,.6,1.5)):u<3.6?1:u<4?1-E.inOut(seg(u,3.6,4)):0;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; levels(c,LV,a*STEPS,0,0,px,px); reset(c,px);
      tab(c,62.5,91,'GAMMA '+(1+(G-1)*a).toFixed(2),4.4,INK,BONE);
    };
  } },

/* GLOW. Cut paper: a dancer in a grand jete, cut from black, on a slate ground; the dancer is her own layer (transparent round her), the
   ground another. Glow is CSS drop-shadow(0 0 R colour), Bloom times over: each pass shadows the one before, so the halo widens and
   thickens. Drawn with canvas shadows, measured identical (shadowBlur = 2 x Radius). Radius 30 px of a 1080 frame, Strength 100, the
   default white; Bloom steps 1, 2, 3. */
{ id:'glow', name:'Glow', section:'Colouring', isNew:true, still:2.4,
  line:'A soft halo spreads out from the edges of the layer; Bloom stacks it again, wider and brighter.',
  make(px){
    const P=4.2, R=30, COL='#ffffff', BL=2*R*px/1080;
    const [L0,l]=sheet(px); l.setTransform(px/100,0,0,px/100,0,0); l.fillStyle='#0a0a0b';
    const quad=(a,b,wa,wb)=>{ const dx=b[0]-a[0], dy=b[1]-a[1], d=Math.hypot(dx,dy)||1, nx=-dy/d, ny=dx/d; l.beginPath(); l.moveTo(a[0]+nx*wa/2,a[1]+ny*wa/2); l.lineTo(b[0]+nx*wb/2,b[1]+ny*wb/2); l.lineTo(b[0]-nx*wb/2,b[1]-ny*wb/2); l.lineTo(a[0]-nx*wa/2,a[1]-ny*wa/2); l.closePath(); l.fill(); };
    const poly=p=>{ l.beginPath(); for(let i=0;i<p.length;i+=2) i?l.lineTo(p[i],p[i+1]):l.moveTo(p[i],p[i+1]); l.closePath(); l.fill(); };
    const knot=(c,r)=>{ const p=[]; for(let i=0;i<7;i++){ const a=i/7*TAU+.3; p.push(c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r); } poly(p); };
    /* scissor cut: straight edges, nothing quite true */
    poly([59,17.6, 63.1,18.4, 64.6,22, 63.4,25.6, 59.8,27, 56.6,25.4, 55.6,21.6, 57,18.6]);          /* head */
    poly([55.4,17.4, 57.6,16.2, 58.4,19.2, 56.2,20.6, 54.4,19.6]);                                      /* bun */
    quad([60.2,25.8],[59,30.6],2.8,3.4);                                                                /* neck */
    poly([55.6,30.4, 62.4,30, 64.2,35.4, 61.4,42.6, 62,47.6, 54.2,49.2, 55.2,42.8, 53.6,35.2]);        /* torso */
    quad([59.4,46.4],[74.6,41.6],7.2,4.4); knot([74.6,41.6],2.2); quad([74.6,41.6],[88.4,37.6],4.4,2.2); quad([88.4,37.6],[95.6,36.2],2.2,.6);   /* front leg */
    quad([56.2,47.4],[40.6,52.6],7.2,4.4); knot([40.6,52.6],2.2); quad([40.6,52.6],[24.6,56.6],4.4,2.2); quad([24.6,56.6],[16.8,59.4],2.2,.6);  /* back leg */
    quad([61.8,31.6],[69.4,24.2],3.4,2.6); knot([69.4,24.2],1.3); quad([69.4,24.2],[77.2,16.8],2.6,1.7); quad([77.2,16.8],[80.6,13.4],1.7,.5);  /* front arm */
    quad([56,31.6],[47,26.6],3.4,2.6); knot([47,26.6],1.3); quad([47,26.6],[37.4,24.2],2.6,1.7); quad([37.4,24.2],[33.2,23.6],1.7,.5);            /* back arm */
    const pass=prev=>{ const [C,x]=sheet(px); x.shadowColor=COL; x.shadowBlur=BL; x.shadowOffsetX=0; x.shadowOffsetY=0; x.drawImage(prev,0,0); return C; };
    const G1=pass(L0), G2=pass(G1), G3=pass(G2), ST=[L0,G1,G2,G3];
    return (c,t)=>{
      const u=mod(t,P), b=u<.7?0:u<1.3?1:u<1.9?2:u<3.6?3:0;
      reset(c,px);
      /* the ground layer: slate, the stage floor, the dancer's shadow on it (no Glow on this layer) */
      c.fillStyle='#2b3547'; c.fillRect(0,0,100,100);
      c.fillStyle='#1e2532'; c.beginPath(); c.moveTo(0,84); c.lineTo(100,82.6); c.lineTo(100,100); c.lineTo(0,100); c.closePath(); c.fill();
      c.fillStyle='#161b25'; c.beginPath(); c.moveTo(38,89.6); c.lineTo(66,88.6); c.lineTo(70,90.4); c.lineTo(42,91.6); c.closePath(); c.fill();
      c.setTransform(1,0,0,1,0,0); c.drawImage(ST[b],0,0); reset(c,px);
      tab(c,72.5,92,b?'BLOOM '+b:'GLOW OFF',4,b?BONE:'#3a4558',b?INK:DIM);
    };
  } },

/* GRADIENT MAP. Viewer overlay round the moon two days before full, drawn here in black and white: a sphere lit from the right with
   the terminator running down the middle of the frame, darker seas, and craters whose shadows grow long toward the terminator. The disc
   runs off the top and the right; the left is empty sky. PIXEL_FX.gradientmap's own lines: each pixel's brightness 0..1 picks a colour on
   the ramp, Amount 1. Two colours (deep blue to ice, a cyanotype) come in by Amount, then Colours: Three adds gold at the 50 % Midpoint.
   The bar under the picture is the ramp: its ends the two stops, the diamond the third. */
{ id:'gradientmap', name:'Gradient Map', section:'Colouring', isNew:true, still:2.8,
  line:'Every brightness in the picture is swapped for a colour on a ramp: darks take one colour, lights another, mids a third.',
  make(px){
    const P=4.8, X=5, Y=5, W=90, H=72, NW=Math.round(px*W/100), NH=Math.round(px*H/100), sc=W/NW;
    const SH=hexRGB('#12263a'), MT=hexRGB('#d9a441'), HI=hexRGB('#eef3f1');
    const src=new Uint8ClampedArray(NW*NH*4), MX=71, MY=33, MR=45, R=rng(41);
    /* value noise for the seas */
    const ih=(a,b,s)=>{ let h=(Math.imul(a|0,374761393)+Math.imul(b|0,668265263)+Math.imul(s|0,1442695041))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; };
    const n2=(a,b,s)=>{ const i=Math.floor(a), j=Math.floor(b), f=a-i, g=b-j, u=f*f*(3-2*f), v=g*g*(3-2*g); return lerp(lerp(ih(i,j,s),ih(i+1,j,s),u),lerp(ih(i,j+1,s),ih(i+1,j+1,s),u),v); };
    const fbm=(a,b,s)=>.55*n2(a,b,s)+.3*n2(a*2.1,b*2.1,s+7)+.15*n2(a*4.3,b*4.3,s+13);
    /* craters: centre on the disc (units from the moon's centre), radius, depth; many small, a few big */
    const CR=[]; for(let i=0;i<110;i++){ const a=R()*TAU, d=Math.sqrt(R())*MR*.96, rr=.6+Math.pow(R(),3.6)*5.6; CR.push([Math.cos(a)*d,Math.sin(a)*d,rr,.45+.45*R()]); }
    /* height on the disc: each crater a bowl with a raised rim, squeezed along the radius as the surface turns away from us */
    const height=(dx,dy)=>{ let h=0;
      for(const [cx,cy,cr,dp] of CR){ const ex=dx-cx, ey=dy-cy; if(ex*ex+ey*ey>cr*cr*2.6) continue;
        const rl=Math.hypot(cx,cy)||1, ux=cx/rl, uy=cy/rl, nz=Math.sqrt(Math.max(.08,1-(rl/MR)*(rl/MR))), along=(ex*ux+ey*uy)/nz, across=-ex*uy+ey*ux, d=Math.hypot(along,across)/cr;
        h+=dp*cr*.2*((d<1?-(1-d*d):0)+.22*Math.exp(-Math.pow((d-1)/.2,2))); }
      return h; };
    const LX=.84, LY=-.18, LZ=.51, ll=Math.hypot(LX,LY,LZ), GW=NW+2, HG=new Float32Array(GW*(NH+2));
    for(let y=-1;y<=NH;y++) for(let x=-1;x<=NW;x++){ const dx=X+x*sc-MX, dy=Y+y*sc-MY; if(dx*dx+dy*dy<MR*MR*1.02) HG[(y+1)*GW+x+1]=height(dx,dy); }
    for(let y=0;y<NH;y++) for(let x=0;x<NW;x++){
      const ux=X+x*sc, uy=Y+y*sc, dx=ux-MX, dy=uy-MY, r2=(dx*dx+dy*dy)/(MR*MR), j=(y*NW+x)*4; let L;
      if(r2>=1){ L=.018+.012*R(); if(R()<.0016) L=.4+.4*R(); }   /* sky, and a few faint stars */
      else { const nz=Math.sqrt(1-r2), k=(y+1)*GW+x+1, gx=(HG[k+1]-HG[k-1])/(2*sc), gy=(HG[k+GW]-HG[k-GW])/(2*sc);
        let nx=dx/MR-gx*.9, ny=dy/MR-gy*.9, nzz=nz; const nl=Math.hypot(nx,ny,nzz); nx/=nl; ny/=nl; nzz/=nl;
        const sea=fbm(dx*.028+3,dy*.028+5,23), alb=.9-.4*clamp((sea-.47)/.12)+.06*(n2(dx*.5,dy*.5,31)-.5);
        const lam=Math.max(0,(nx*LX+ny*LY+nzz*LZ)/ll);
        L=clamp(alb*(.04+1.0*Math.pow(lam,.6))+.012+.02*(R()-.5));
        if(r2>.985) L*=(1-r2)/.015; }
      const g=Math.round(255*clamp(L)); src[j]=src[j+1]=src[j+2]=g; src[j+3]=255; }
    const mk=(three)=>{ const d=new Uint8ClampedArray(src.length);
      for(let j=0;j<src.length;j+=4){ const L=(.299*src[j]+.587*src[j+1]+.114*src[j+2])/255; let o;
        if(!three) o=[0,1,2].map(k=>SH[k]+(HI[k]-SH[k])*L);
        else if(L<=.5){ const q=L/.5; o=[0,1,2].map(k=>SH[k]+(MT[k]-SH[k])*q); } else { const q=(L-.5)/.5; o=[0,1,2].map(k=>MT[k]+(HI[k]-MT[k])*q); }
        d[j]=o[0]; d[j+1]=o[1]; d[j+2]=o[2]; d[j+3]=255; }
      return fromData(NW,NH,d); };
    const GREY=fromData(NW,NH,src), TWO=mk(false), THREE=mk(true);
    const BX0=14, BX1=86, BY=84.5, BH=3.6;
    return (c,t)=>{
      const u=mod(t,P);
      const amt=u<.5?0:u<1.1?E.inOut(seg(u,.5,1.1)):u<3.9?1:u<4.4?1-E.inOut(seg(u,3.9,4.4)):0, three=u>=2.1&&u<4.4;
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.drawImage(GREY,X,Y,W,H); if(amt>0){ c.globalAlpha=amt; c.drawImage(three?THREE:TWO,X,Y,W,H); c.globalAlpha=1; }
      c.strokeStyle=DIM; c.lineWidth=.5; c.strokeRect(X-.25,Y-.25,W+.5,H+.5);
      /* the ramp: what each brightness becomes right now */
      const g=c.createLinearGradient(BX0,0,BX1,0), mix=(a,b)=>css([0,1,2].map(k=>a[k]+(b[k]-a[k])*amt));
      if(three){ g.addColorStop(0,mix([0,0,0],SH)); g.addColorStop(.5,mix([128,128,128],MT)); g.addColorStop(1,mix([255,255,255],HI)); }
      else { g.addColorStop(0,mix([0,0,0],SH)); g.addColorStop(1,mix([255,255,255],HI)); }
      c.fillStyle=g; c.fillRect(BX0,BY,BX1-BX0,BH); c.strokeStyle=DIM; c.strokeRect(BX0,BY,BX1-BX0,BH);
      c.fillStyle=TEAL; c.fillRect(BX0-1.6,BY+BH+1.2,3.2,3.2); c.fillRect(BX1-1.6,BY+BH+1.2,3.2,3.2);
      if(three){ const drop=E.out(seg(u,2.1,2.35)), dy=BY+BH+2.8-(1-drop)*3, mx=(BX0+BX1)/2; c.globalAlpha=drop; c.fillStyle=YEL; c.beginPath(); c.moveTo(mx,dy-2.2); c.lineTo(mx+2.2,dy); c.lineTo(mx,dy+2.2); c.lineTo(mx-2.2,dy); c.closePath(); c.fill(); c.globalAlpha=1; }
    };
  } },

/* COLOUR WASH. Two-ink print: a fern in ink on bone paper. PIXEL_FX.gradientoverlay's own ramp at Blend Multiply, Amount 0.85, Start
   vermilion, End cobalt: the paper takes a split-fountain gradient and the ink stays ink. Angle turns 0 to 90 on twos. */
{ id:'gradientoverlay', name:'Colour Wash', section:'Colouring', isNew:true, still:3.0,
  line:'A two-colour gradient is laid over the whole picture; turn its Angle and the colours swing round.',
  make(px){
    const P=4.6, AMT=.85, C1=hexRGB('#e4471d'), C2=hexRGB('#2f6fb0'), STEPS=10;
    const src=drawn(px,(x)=>{
      x.fillStyle=BONE; x.fillRect(0,0,100,100);
      /* the frond: a curved stalk from off the bottom left, leaflets alternating and shrinking to the tip */
      const P0=[-8,112], P1=[12,30], P2=[90,8];
      const at=s=>[ (1-s)*(1-s)*P0[0]+2*(1-s)*s*P1[0]+s*s*P2[0], (1-s)*(1-s)*P0[1]+2*(1-s)*s*P1[1]+s*s*P2[1] ];
      const tan=s=>{ const a=at(Math.max(0,s-.002)), b=at(Math.min(1,s+.002)), l=Math.hypot(b[0]-a[0],b[1]-a[1])||1; return [(b[0]-a[0])/l,(b[1]-a[1])/l]; };
      x.fillStyle=INK;
      const NL=30;
      for(let i=0;i<NL;i++){ const s=.16+.82*i/NL, side=i%2?1:-1, p=at(s), tg=tan(s), len=(25*Math.pow(1-s,.75)+3.2)*(side>0?1:.92), wid=len*.2,
          ang=Math.atan2(tg[1],tg[0])+side*(1.05-.35*s), dx=Math.cos(ang), dy=Math.sin(ang), nx=-dy, ny=dx, bend=side*len*.12;
        const tip=[p[0]+dx*len+nx*bend*.3, p[1]+dy*len+ny*bend*.3];
        x.beginPath(); x.moveTo(p[0],p[1]);
        x.quadraticCurveTo(p[0]+dx*len*.45+nx*wid+nx*bend*.5, p[1]+dy*len*.45+ny*wid+ny*bend*.5, tip[0],tip[1]);
        x.quadraticCurveTo(p[0]+dx*len*.5-nx*wid*.8+nx*bend*.5, p[1]+dy*len*.5-ny*wid*.8+ny*bend*.5, p[0],p[1]);
        x.fill(); }
      x.strokeStyle=INK; x.lineCap='round';
      for(let i=0;i<40;i++){ const s0=i/40, s1=(i+1)/40, a=at(s0), b=at(s1); x.lineWidth=1.9*(1-s0)+.35; x.beginPath(); x.moveTo(a[0],a[1]); x.lineTo(b[0],b[1]); x.stroke(); }
      /* the paper and the stencil: a fine speckle both ways */
      const R=rng(23);
      for(let i=0;i<900;i++){ const sx=R()*100, sy=R()*100, r=.12+R()*.22; x.fillStyle=R()<.5?'rgba(22,19,15,.5)':'rgba(231,226,213,.7)'; x.fillRect(sx,sy,r,r); }
    });
    const s=src.im.data, N=px, n=s.length;
    /* the kernel's ramp g, then Multiply and Amount: b + (b*c(g)/255 - b)*AMT, which is b times a factor straight in g */
    const A=[0,1,2].map(k=>1-AMT+AMT*C1[k]/255), B=[0,1,2].map(k=>AMT*(C2[k]-C1[k])/255);
    const wash=deg=>{ const rad=deg*Math.PI/180, dx=Math.cos(rad), dy=Math.sin(rad), cx=N/2, cy=N/2, half=Math.max(1e-6,Math.abs(dx)*cx+Math.abs(dy)*cy), d=new Uint8ClampedArray(n);
      for(let y=0;y<N;y++){ const ry=y-cy; for(let x=0;x<N;x++){ const i=(y*N+x)*4, rx=x-cx; let g=((rx*dx+ry*dy)+half)/(2*half); g=g<0?0:g>1?1:g;
        d[i]=s[i]*(A[0]+B[0]*g); d[i+1]=s[i+1]*(A[1]+B[1]*g); d[i+2]=s[i+2]*(A[2]+B[2]*g); d[i+3]=255; } }
      return fromData(N,N,d); };
    const W=[]; for(let k=0;k<=STEPS;k++) W.push(wash(90*k/STEPS));
    return (c,t)=>{
      const u=mod(t,P);
      const on=u>=.6&&u<4.0, f=Math.floor(u*12)/12, k=f<1.7?0:f<2.6?Math.round(E.inOut(seg(f,1.7,2.6))*STEPS):STEPS;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(on?W[k]:src.C,0,0);
      reset(c,px); if(on) tab(c,70,91.5,('ANGLE '+Math.round(90*k/STEPS)+'°').padEnd(9,' '),4.2,INK,BONE);
    };
  } },

/* GRAYSCALE. Graded still: citrus cut in half on a pale stone counter, from above, drawn here. The effect is CSS grayscale(Amount 1,
   the default): the fixed matrix with Rec. 709 weights (.2126 R + .7152 G + .0722 B), run once on these pixels. A colourist's split,
   an Ink hairline, runs DOWN the picture, so above it every fruit shows the grey it becomes: the blood orange goes nearly black, the
   lemon stays near white, and the orange and the lime, two very different colours, land on almost the same grey. It settles part
   way, holds, finishes, and cuts back. */
{ id:'grayscale', name:'Grayscale', section:'Colouring', isNew:true, still:2.0,
  line:'The colour drains out and only brightness is left, so two different colours can end up the same grey.',
  make(px){
    const P=4.4, N=px;
    const src=drawn(N,(x)=>{
      /* the counter: pale stone, the light from the top left, a little speckle */
      const g=x.createLinearGradient(0,0,100,100); g.addColorStop(0,'#e4e1db'); g.addColorStop(1,'#c7c3bb'); x.fillStyle=g; x.fillRect(0,0,100,100);
      const R=rng(29); for(let i=0;i<700;i++){ const sx=R()*100, sy=R()*100, s=.15+R()*.3; x.fillStyle=R()<.5?'rgba(120,112,100,.18)':'rgba(255,255,255,.25)'; x.fillRect(sx,sy,s,s); }
      /* [cx, cy, r, rind, flesh, segments, turn] */
      const FR=[[17,21,25,[200,74,40],[150,30,42],10,.3],[64,16,17.5,[236,200,42],[244,222,98],9,1.1],[86,48,15,[90,138,44],[168,198,84],10,.7],[45,59,21,[238,128,28],[246,160,50],11,.2],[13,85,23,[236,150,74],[232,106,94],12,.9]];
      for(const [cx,cy,r] of FR){ const s=x.createRadialGradient(cx+2.2,cy+2.8,r*.7,cx+2.2,cy+2.8,r*1.18); s.addColorStop(0,'rgba(48,38,28,.42)'); s.addColorStop(1,'rgba(48,38,28,0)'); x.fillStyle=s; circle(x,cx+2.2,cy+2.8,r*1.18); x.fill(); }
      for(const [cx,cy,r,rind,flesh,n,turn] of FR){
        const Q=rng(Math.round(cx*7+cy));
        /* no fruit is round: each half a touch oval, turned its own way */
        x.save(); x.translate(cx,cy); x.rotate(turn*2); x.scale(1+.05*Q(),1-.03*Q());
        x.fillStyle=css(rind.map(v=>v*.78)); circle(x,0,0,r); x.fill();
        x.fillStyle=css(rind); circle(x,0,0,r*.955); x.fill();
        for(let q=0;q<60;q++){ const a=Q()*TAU, d=r*(.9+.05*Q()); x.fillStyle='rgba(0,0,0,.12)'; x.fillRect(Math.cos(a)*d,Math.sin(a)*d,r*.018+.08,r*.018+.08); }
        x.fillStyle='rgb(244,236,212)'; circle(x,0,0,r*.885); x.fill();
        for(let k=0;k<n;k++){ const w=TAU/n*(.86+.28*Q()), a0=k*TAU/n+(Q()-.5)*.06, a1=a0+w*.96, gap=.028+.012*Q(), r0=r*.11, r1=r*(.78+.05*Q()), f=.9+.14*Q();
          x.fillStyle=css(flesh.map(v=>Math.min(255,v*f)));
          x.beginPath(); x.moveTo(Math.cos(a0+gap*3)*r0,Math.sin(a0+gap*3)*r0); x.arc(0,0,r1,a0+gap,a1-gap); x.lineTo(Math.cos(a1-gap*3)*r0,Math.sin(a1-gap*3)*r0); x.closePath(); x.fill();
          /* juice cells: short strokes running out from the middle, a shade lighter and darker */
          for(let q=0;q<26;q++){ const a=a0+gap*1.6+(a1-a0-gap*3.2)*Q(), d=r0+(r1-r0)*(.1+.85*Q()), l=r*.04+r*.06*Q();
            x.strokeStyle=Q()<.5?'rgba(255,255,255,.2)':'rgba(0,0,0,.1)'; x.lineWidth=r*.018+.08; x.lineCap='round'; x.beginPath(); x.moveTo(Math.cos(a)*d,Math.sin(a)*d); x.lineTo(Math.cos(a)*(d+l),Math.sin(a)*(d+l)); x.stroke(); } }
        x.fillStyle='rgb(240,230,204)'; circle(x,0,0,r*.08); x.fill();
        x.restore();
        /* the wet cut face catches the window: one soft highlight */
        const h=x.createRadialGradient(cx-r*.35,cy-r*.4,0,cx-r*.35,cy-r*.4,r*.55); h.addColorStop(0,'rgba(255,255,255,.28)'); h.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=h; circle(x,cx,cy,r*.86); x.fill(); }
    });
    const s=src.im.data, d=new Uint8ClampedArray(s.length);
    for(let i=0;i<s.length;i+=4){ const v=.2126*s[i]+.7152*s[i+1]+.0722*s[i+2]; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255; }
    const GREY=fromData(N,N,d);
    const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
    return (c,t)=>{
      const u=mod(t,P), y=u<.6?0:u<2.3?44*settle(seg(u,.6,1.5)):u<2.9?lerp(44,100,E.inOut(seg(u,2.3,2.9))):u<3.9?100:0;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(src.C,0,0);
      if(y>0){ c.save(); c.beginPath(); c.rect(0,0,px,px*y/100); c.clip(); c.drawImage(GREY,0,0); c.restore(); }
      reset(c,px);
      if(y>0&&y<100){ c.fillStyle=INK; c.fillRect(0,y-.35,100,.7); }
    };
  } }

);
})();
