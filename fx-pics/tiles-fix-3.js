/* FreeMotion effect pictures: artist 3's redraws. Every picture is the effect's own maths on Ezra's own photographs, or a plain
   layer the effect could really be given. Furniture (tabs, handles, film rebate) sits outside the picture. */
(function(){
'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const INK='#16130f',BONE='#e7e2d5',COAL='#0c0c0d',VERM='#e4471d',YEL='#ffce4a',TEAL='#29d9bb',NAVY='#161c28',HAIR='#2b3547',DIM='#8b96a8',TXT='#eef2f8',PAPER='#d9d4c6',CHINA='#d8321f';
const MONO='"Courier Prime","Courier New",Courier,monospace';
const SANS='system-ui,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif';
const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mk=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=(h===undefined?w:h); return C; };
const toCanvas=im=>{ const C=mk(im.width,im.height); C.getContext('2d').putImageData(im,0,0); return C; };
const stage=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
const loopT=(t,P)=>((t%P)+P)%P;

/* The photograph, cropped to a square, read back once: the only getImageData each make() does. `cover` paints flat polygons over
   number plates first (fractions of the whole photograph), so their words never read. */
function read(key,S,crop,cover){
  const C=mk(S), g=C.getContext('2d',{willReadFrequently:true}), im=photo(key), k=crop||{x:0,y:0,w:1};
  g.imageSmoothingQuality='high';
  if(im) g.drawImage(im,k.x*im.naturalWidth,k.y*im.naturalHeight,k.w*im.naturalWidth,k.w*im.naturalHeight,0,0,S,S);
  if(cover) paintCover(g,S,k,cover);
  return g.getImageData(0,0,S,S);
}
function paintCover(g,S,k,cover){
  for(const v of cover){ g.fillStyle=v.col; g.beginPath(); v.pts.forEach((p,i)=>{ const x=(p[0]-k.x)/k.w*S, y=(p[1]-k.y)/k.w*S; if(i) g.lineTo(x,y); else g.moveTo(x,y); }); g.closePath(); g.fill(); }
}
const PLATE_REVUELTO={col:'#0f0f11',pts:[[.2,.626],[.298,.626],[.298,.676],[.2,.676]]};
const PLATE_TESLA={col:'#30363a',pts:[[.722,.583],[.84,.583],[.84,.64],[.722,.64]]};
const PLATE_MCLAREN={col:'#c94f2c',pts:[[.772,.55],[.942,.512],[.942,.592],[.786,.62]]};
function tab(c,x,y,text,size,fg,bg){
  c.font='700 '+size+'px '+MONO; c.textBaseline='alphabetic'; c.textAlign='left';
  const w=c.measureText(text).width, pad=size*.45;
  c.fillStyle=bg; c.fillRect(x,y,w+pad*2,size*1.5);
  c.fillStyle=fg; c.fillText(text,x+pad,y+size*1.12);
}
function vn2(x,y,seed){
  const xi=Math.floor(x), yi=Math.floor(y), u=x-xi, v=y-yi, a=u*u*(3-2*u), b=v*v*(3-2*v);
  const h=(i,j)=>hash(i*131.7+j*311.3,seed);
  const p=lerp(h(xi,yi),h(xi+1,yi),a), q=lerp(h(xi,yi+1),h(xi+1,yi+1),a);
  return lerp(p,q,b)*2-1;
}

window.FX_TILES.push(

/* ---------- DUOTONE: two inks pulled across his Revuelto. Direction: two-ink print. ---------- */
{ id:'duotone', name:'Duotone', section:'Colouring', isNew:true, redrawn:true, still:2.1,
  line:'Every dark in the photo becomes one colour and every light another, with the tones between them.',
  make(px){
    const P=4.8, S=Math.min(px,420), BH=24, K={x:.02,y:.24,w:.68};
    const im=read('revuelto',S,K,[PLATE_REVUELTO]);
    const d=im.data, n=S*S, L=new Float32Array(n);
    for(let i=0,p=0;p<n;p++,i+=4) L[p]=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255;
    const src=toCanvas(im);
    /* The real kernel: colour = shadows + (highlights - shadows) * luma, with its Balance and Contrast. */
    const inked=(a,b,bal,k)=>{ const A=rgb(a),B=rgb(b),o=new ImageData(S,S),q=o.data,G=Math.pow(2,-bal/100); for(let i=0,p=0;p<n;p++,i+=4){ let l=.5+(Math.pow(L[p],G)-.5)*k; l=l<0?0:(l>1?1:l); q[i]=A[0]+(B[0]-A[0])*l; q[i+1]=A[1]+(B[1]-A[1])*l; q[i+2]=A[2]+(B[2]-A[2])*l; q[i+3]=255; } return toCanvas(o); };
    const PAIRS=[{a:INK,b:VERM,img:inked(INK,VERM,45,1.2)},{a:'#1f7f70',b:'#f6c544',img:inked('#1f7f70','#f6c544',20,1.2)}];
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P), q=Math.floor(T*12)/12;
      let y;
      if(q<.8) y=-BH;
      else if(q<1.4) y=lerp(-BH,76,E.inOut(seg(q,.8,1.4)));
      else if(q<4){ const u=q-1.4; y=76+2.4*Math.exp(-u*8)*Math.sin(u*26); }
      else if(q<4.5) y=lerp(76,-BH,E.inOut(seg(q,4,4.5)));
      else y=-BH;
      const pr=PAIRS[q<2.7?0:1];
      c.drawImage(src,0,0,100,100);
      if(y>-BH){
        const h=Math.min(100,y+BH/2);
        if(h>0) c.drawImage(pr.img,0,0,S,S*h/100,0,0,100,h);
        c.fillStyle=pr.a; c.fillRect(0,y,62,BH+1);
        c.fillStyle=pr.b; c.fillRect(62,y,38,BH+1);
        c.font='700 4.4px '+MONO; c.textAlign='left';
        c.fillStyle=pr.b; c.fillText('DARKS',4,y+BH-5);
        c.fillStyle=pr.a; c.fillText('LIGHTS',66,y+BH-5);
      }
    };
  }},

/* ---------- CHROMA KEY: the Tesla shot on green, keyed onto a real sky. Direction: comp sheets. ---------- */
{ id:'chromakey', name:'Chroma Key', section:'Keying', isNew:false, redrawn:true, still:.45,
  line:'Picks out one colour, here a green wall, and shows the layer underneath wherever that colour was.',
  make(px){
    const P=5.2, S=Math.min(px,320);
    const TESLA=[[9,70.2],[6,68],[4.5,64],[4.2,60],[4.5,55],[5.5,49],[6.6,45.5],[9,42],[11.5,40],[13.2,38],[15.2,35],[18,32.2],[21.5,30.6],[25,29.9],[30,30],[40,30.7],[50,31.6],[57,33],[62,35.2],[66,37.6],[70,40.2],[73,41.2],[78,42.6],[82,44],[86,46],[89,49],[91,52],[92,56],[92.3,62],[92,66],[91,68],[88.6,69.6],[87,72.6],[83.5,74.8],[79.5,74.9],[76,73.2],[74.6,71],[60,71.6],[42,72.4],[39.6,75],[36.5,77.3],[33,77.6],[30,75],[28.6,70.6],[27,67.6],[14,65.2],[13.4,66.6],[12,69.6]];
    const C=mk(S), g=C.getContext('2d',{willReadFrequently:true}), ph=photo('tesla'), sc=S/100;
    g.translate(0,.25*S);
    g.beginPath(); TESLA.forEach((p,i)=>i?g.lineTo(p[0]*sc,p[1]*sc):g.moveTo(p[0]*sc,p[1]*sc)); g.closePath(); g.clip();
    g.imageSmoothingQuality='high'; if(ph) g.drawImage(ph,0,0,S,S);
    paintCover(g,S,{x:0,y:0,w:1},[PLATE_TESLA]);
    g.setTransform(1,0,0,1,0,0);
    const im=g.getImageData(0,0,S,S), d=im.data, n=S*S;
    const KEY=rgb('#18c454');
    const dist=new Float32Array(n);
    for(let y=0,p=0;y<S;y++) for(let x=0;x<S;x++,p++){
      const i=p*4, a=d[i+3]/255;
      const w=1+.17*vn2(x/S*5,y/S*4,3)+.05*vn2(x/S*17,y/S*2,8);
      const gr=KEY[0]*w, gg=KEY[1]*w, gb=KEY[2]*w;
      d[i]=d[i]*a+gr*(1-a); d[i+1]=d[i+1]*a+gg*(1-a); d[i+2]=d[i+2]*a+gb*(1-a); d[i+3]=255;
      const dr=d[i]-KEY[0],dg=d[i+1]-KEY[1],db=d[i+2]-KEY[2];
      dist[p]=Math.sqrt(dr*dr+dg*dg+db*db)/441;
    }
    const raw=toCanvas(im);
    /* The real test: inside Tolerance, alpha goes to zero. Tolerance is keyframed up to 0.12, which clears this wall and leaves the glass. */
    const keyed=(tol,spill)=>{ const o=new ImageData(S,S),q=o.data; for(let p=0,i=0;p<n;p++,i+=4){ if(dist[p]<tol){ q[i+3]=0; continue; } q[i]=d[i]; q[i+1]=d[i+1]; q[i+2]=d[i+2]; q[i+3]=255; if(spill>0){ const mx=Math.max(d[i],d[i+2]); if(d[i+1]>mx) q[i+1]=d[i+1]-(d[i+1]-mx)*spill; } } return toCanvas(o); };
    const STEPS=[.012,.026,.042,.06,.085,.12].map((v,i,a)=>keyed(v,i===a.length-1?.5:0));
    const back=(()=>{ const B=mk(S), x=B.getContext('2d'); x.imageSmoothingQuality='high'; const p=photo('city'); if(p) x.drawImage(p,0,0,S,S); return B; })();
    const place=(a,b,k)=>a+(b-a)*k;
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P), q=Math.floor(T*12)/12;
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      let img=raw, k=0;
      if(q>=1.1&&q<1.6){ img=STEPS[Math.min(STEPS.length-1,Math.floor((q-1.1)*12))]; }
      else if(q>=1.6&&q<4.9){ img=STEPS[STEPS.length-1]; }
      if(T>=1.6&&T<2.05) k=E.inOut(seg(T,1.6,2.05));
      else if(T>=2.05&&T<4.3) k=1+.035*Math.exp(-(T-2.05)*7)*Math.sin((T-2.05)*20);
      else if(T>=4.3&&T<4.75) k=1-E.inOut(seg(T,4.3,4.75));
      const fx=place(3,0,k), fy=place(3,0,k), fw=place(74,100,k);
      const bx=place(23,0,k), by=place(23,0,k), bw=place(74,100,k);
      c.drawImage(back,bx,by,bw,bw);
      c.drawImage(img,fx,fy,fw,fw);
      if(k<.5){
        c.lineWidth=.9; c.strokeStyle=BONE; c.strokeRect(bx,by,bw,bw); c.strokeRect(fx,fy,fw,fw);
        tab(c,bx+bw-23,by+bw-7.8,'CLIP 02',4.2,BONE,INK);
        tab(c,fx,fy,'CLIP 01',4.2,INK,BONE);
      }
    };
  }},

/* ---------- ZOOM BLUR: the Huracan, punched in. Direction: graded still. ---------- */
{ id:'zoomblur', name:'Zoom Blur', section:'Blur', isNew:false, redrawn:true, still:1.9,
  line:'Smears the picture outward from a centre you place, with a clear spot around that centre if you want one.',
  make(px){
    const S=Math.min(px,340), cx=S*.63, cy=S*.6, N=9, AM=[.12,.26,.42,.6,.5];
    const im=read('huracan',S), s=im.data, sharp=toCanvas(im), R=.22*Math.hypot(Math.max(cx,S-cx),Math.max(cy,S-cy)), R0=.6*R;
    const render=amt=>{
      const o=new ImageData(S,S), d=o.data;
      for(let y=0;y<S;y++) for(let x=0;x<S;x++){
        const i=(y*S+x)*4, dx=x-cx, dy=y-cy, rr=Math.sqrt(dx*dx+dy*dy);
        let w=1; if(rr<R){ if(rr<=R0) w=0; else { const q=(rr-R0)/(R-R0); w=q*q*(3-2*q); } }
        let r=0,g=0,b=0,c=0;
        if(w>0) for(let k=0;k<N;k++){ const f=1-(k/9)*amt*.35, sx=(cx+dx*f)|0, sy=(cy+dy*f)|0; if(sx<0||sx>=S||sy<0||sy>=S) continue; const si=(sy*S+sx)*4; r+=s[si]; g+=s[si+1]; b+=s[si+2]; c++; }
        if(w===0||!c){ d[i]=s[i]; d[i+1]=s[i+1]; d[i+2]=s[i+2]; d[i+3]=255; continue; }
        d[i]=s[i]+(r/c-s[i])*w; d[i+1]=s[i+1]+(g/c-s[i+1])*w; d[i+2]=s[i+2]+(b/c-s[i+2])*w; d[i+3]=255;
      }
      return toCanvas(o);
    };
    const F=[sharp].concat(AM.map(render));
    const seq=[]; const add=(i,n)=>{ for(let k=0;k<n;k++) seq.push(i); };
    add(0,12); add(1,1); add(2,1); add(3,1); add(4,2); add(5,18); add(3,1); add(2,1); add(1,1); add(0,8);
    const P=seq.length/12;
    return (c,t)=>{ stage(c,px); const T=loopT(t,P); c.drawImage(F[seq[Math.floor(T*12)%seq.length]],0,0,100,100); };
  }},

/* ---------- CENSOR: tracking the Revuelto's plate. Direction: viewer overlay. ---------- */
{ id:'censor', name:'Censor', section:'Blur', isNew:true, redrawn:true, still:2.0,
  line:'Pixelates, blurs or bars one box, and the box can be keyframed to follow what it hides.',
  make(px){
    const P=5.4, im=photo('revuelto'), W=im?im.naturalWidth:320, sc=W;
    const K0={x:0,y:.27,w:.6}, K1={x:.1,y:.3,w:.5}, PLx=.249, PLy=.651, HW=.072, HH=.036;
    const KT=[.6,1.7,3.4,4.5], B=4.3;
    const tmp=mk(64), tx=tmp.getContext('2d'); tx.imageSmoothingEnabled=true; tx.imageSmoothingQuality='high';
    const STY=[[0,2.4,'PIXELATE'],[2.4,3.6,'BLUR'],[3.6,4.6,'BAR'],[4.6,9,'PIXELATE']];
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P);
      let m=0;
      if(T>=KT[0]&&T<KT[1]) m=E.inOut(seg(T,KT[0],KT[1])); else if(T>=KT[1]&&T<KT[2]) m=1; else if(T>=KT[2]&&T<KT[3]) m=1-E.inOut(seg(T,KT[2],KT[3]));
      const cam={x:lerp(K0.x,K1.x,m),y:lerp(K0.y,K1.y,m),w:lerp(K0.w,K1.w,m)};
      if(im) c.drawImage(im,cam.x*sc,cam.y*sc,cam.w*sc,cam.w*sc,0,0,100,100);
      const fx=v=>(v-cam.x)/cam.w*100, fy=v=>(v-cam.y)/cam.w*100;
      const x0=fx(PLx-HW), x1=fx(PLx+HW), y0=fy(PLy-HH), y1=fy(PLy+HH);
      const sty=STY.find(s=>T>=s[0]&&T<s[1]);
      c.save(); c.beginPath(); c.rect(x0,y0,x1-x0,y1-y0); c.clip();
      if(sty[2]==='PIXELATE'){
        const gx=Math.floor(x0/B)*B, gy=Math.floor(y0/B)*B, cols=Math.ceil((x1-gx)/B), rows=Math.ceil((y1-gy)/B);
        tx.clearRect(0,0,64,64);
        if(im) tx.drawImage(im,(cam.x+gx/100*cam.w)*sc,(cam.y+gy/100*cam.w)*sc,cols*B/100*cam.w*sc,rows*B/100*cam.w*sc,0,0,cols,rows);
        c.imageSmoothingEnabled=false; c.drawImage(tmp,0,0,cols,rows,gx,gy,cols*B,rows*B); c.imageSmoothingEnabled=true;
      } else if(sty[2]==='BLUR'){
        const cols=5, rows=3;
        tx.clearRect(0,0,64,64);
        if(im) tx.drawImage(im,(cam.x+(x0-2)/100*cam.w)*sc,(cam.y+(y0-2)/100*cam.w)*sc,(x1-x0+4)/100*cam.w*sc,(y1-y0+4)/100*cam.w*sc,0,0,cols,rows);
        c.drawImage(tmp,0,0,cols,rows,x0-2,y0-2,x1-x0+4,y1-y0+4);
      } else { c.fillStyle='#000'; c.fillRect(x0,y0,x1-x0,y1-y0); }
      c.restore();
      c.strokeStyle=DIM; c.lineWidth=.5; c.strokeRect(x0,y0,x1-x0,y1-y0);
      c.fillStyle=TEAL; for(const [ax,ay] of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]]) c.fillRect(ax-1.3,ay-1.3,2.6,2.6);
      tab(c,3,3,'X '+Math.round((PLx-cam.x)/cam.w*100)+'  Y '+Math.round((PLy-cam.y)/cam.w*100),4.4,TXT,NAVY);
      c.fillStyle=NAVY; c.fillRect(0,85,100,15);
      c.strokeStyle=HAIR; c.lineWidth=.6; c.beginPath(); c.moveTo(5,92.5); c.lineTo(95,92.5); c.stroke();
      c.fillStyle=YEL; for(const kt of KT){ const x=5+90*kt/P; c.beginPath(); c.moveTo(x,90); c.lineTo(x+2.5,92.5); c.lineTo(x,95); c.lineTo(x-2.5,92.5); c.closePath(); c.fill(); }
      const ph=5+90*T/P; c.strokeStyle=TXT; c.lineWidth=.7; c.beginPath(); c.moveTo(ph,86.5); c.lineTo(ph,98.5); c.stroke();
    };
  }},

/* ---------- FILM GRAIN: only grain, marked up on a contact sheet. Direction: contact sheet. ---------- */
{ id:'filmgrain', name:'Film Grain', section:'Stylize', isNew:true, redrawn:true, still:2.4,
  line:'Adds moving round grain over the picture, strongest in the mid-tones, and nothing else.',
  make(px){
    const P=4.4, S=Math.min(px,420), K={x:.08,y:.2,w:.84};
    const im=read('pair',S,K), s=im.data, clean=toCanvas(im);
    /* The real curve at Amount 60, Size 6, Colour 15, Shadows 35, Highlights 35; re-rolled for each frame. */
    const amt=.6*90, chroma=.15, sh=.35, hi=.35, size=Math.max(1,6*S/1080*1.2), inv=1/size, gw=Math.ceil(S*inv)+1;
    const grained=fr=>{
      const o=new ImageData(S,S), d=o.data;
      for(let y=0;y<S;y++) for(let x=0;x<S;x++){
        const i=(y*S+x)*4, cxi=(x*inv)|0, cyi=(y*inv)|0, cell=cyi*gw+cxi;
        d[i+3]=255;
        const dxx=(x+.5)-(cxi*size+size*.5), dyy=(y+.5)-(cyi*size+size*.5), disc=1-(dxx*dxx+dyy*dyy)*4*inv*inv;
        if(disc<=0){ d[i]=s[i]; d[i+1]=s[i+1]; d[i+2]=s[i+2]; continue; }
        let h=(cell*374761393+fr*668265263)|0; h=(h^(h>>13))*1274126177; h=h^(h>>16);
        const n=((h&1023)/1023-.5)*disc*1.35, L=(.2126*s[i]+.7152*s[i+1]+.0722*s[i+2])/255, mid=4*L*(1-L), resp=mid+(1-mid)*(sh*(1-L)+hi*L), g=n*amt*resp;
        let h2=(h^0x5bf03635)*2246822519; h2=h2^(h2>>15);
        let h3=(h^0x27d4eb2f)*3266489917; h3=h3^(h3>>15);
        const cr=((h2&255)/255-.5)*chroma*amt*resp, cb=((h3&255)/255-.5)*chroma*amt*resp;
        d[i]=s[i]+g+cr; d[i+1]=s[i+1]+g-(cr+cb)*.5; d[i+2]=s[i+2]+g+cb; d[i+3]=255;
      }
      return toCanvas(o);
    };
    const G=[0,1,2,3,4].map(grained);
    /* A hand-drawn chinagraph box round the frame that is picked: it sits on the rebate, off the picture. */
    const FX=9, FW=82, FH=46, Y0=2.5, Y1=51.5;
    const R=rng(41), PEN=[]; const wob=()=>(R()-.5)*1.1;
    const corners=[[FX-1.8,Y1-1.6],[FX+FW+2.4,Y1-1.9],[FX+FW+1.8,Y1+FH+1.4],[FX-2.2,Y1+FH+1.8],[FX-1.5,Y1-2.4]];
    for(let s2=0;s2<4;s2++){ const a=corners[s2], b=corners[s2+1]; for(let i=0;i<9;i++){ const u=i/9; PEN.push([lerp(a[0],b[0],u)+wob()*.5,lerp(a[1],b[1],u)+wob()*.5]); } }
    PEN.push(corners[4]);
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P), q=Math.floor(T*12);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.fillStyle=PAPER;
      for(let i=0;i<11;i++){ const y=-1+i*9.6; c.fillRect(2.2,y,3.6,5.2); c.fillRect(94.2,y,3.6,5.2); }
      const on=T>=.9&&T<3.9, sy=S*.14, sh2=S*FH/FW;
      c.drawImage(clean,0,sy,S,sh2,FX,Y0,FW,FH);
      c.drawImage(on?G[q%5]:clean,0,sy,S,sh2,FX,Y1,FW,FH);
      if(on){
        const pen=seg(T,1.15,1.75);
        if(pen>0){
          c.strokeStyle=CHINA; c.lineWidth=1.3; c.lineCap='round'; c.lineJoin='round';
          const nP=Math.floor(pen*(PEN.length-1)); c.beginPath(); PEN.slice(0,nP+1).forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.stroke();
        }
      }
    };
  }},

/* ---------- LIVE WIRE: the real Sobel lines, crackling. Direction: pen on coal. ---------- */
{ id:'electricedges', name:'Live Wire', section:'Drawing / Edge', isNew:true, redrawn:true, still:2.1,
  line:'Lights up the edges in the picture with flickering lines and can dim everything else.',
  make(px){
    const P=4, S=Math.min(px,420), COL=rgb('#ffce4a'), GLOW=.8, SOFT=.45;
    const im=read('mclaren',S,null,[PLATE_MCLAREN]), s=im.data, src=toCanvas(im), M=new Float32Array(S*S);
    const lum=i=>s[i]*.299+s[i+1]*.587+s[i+2]*.114;
    for(let y=1;y<S-1;y++) for(let x=1;x<S-1;x++){
      const a=(y-1)*S*4, b=y*S*4, e=(y+1)*S*4, X=x*4;
      const gx=(lum(a+X+4)+2*lum(b+X+4)+lum(e+X+4))-(lum(a+X-4)+2*lum(b+X-4)+lum(e+X-4));
      const gy=(lum(e+X-4)+2*lum(e+X)+lum(e+X+4))-(lum(a+X-4)+2*lum(a+X)+lum(a+X+4));
      let m=Math.sqrt(gx*gx+gy*gy)/1442; if(m>1) m=1; M[y*S+x]=m+SOFT*(Math.sqrt(m)-m);
    }
    const crackle=fr=>{
      const o=new ImageData(S,S), d=o.data;
      for(let y=0;y<S;y++) for(let x=0;x<S;x++){
        const n=y*S+x, i=n*4; let h=(x*374761393+y*668265263+fr*2147483647)>>>0; h=(h^(h>>>13))*1274126177>>>0; h=(h^(h>>>16))>>>0;
        let add=M[n]*GLOW*(.45+h/4294967295*.55)*3.6; if(add>1) add=1;
        d[i]=COL[0]*add; d[i+1]=COL[1]*add; d[i+2]=COL[2]*add; d[i+3]=255;
      }
      return toCanvas(o);
    };
    const F=[1,2,3,4].map(crackle);
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P), q=Math.floor(T*12)/12;
      let k=0; if(q>=.9&&q<1.3) k=seg(q,.9,1.3); else if(q>=1.3&&q<3.4) k=1; else if(q>=3.4&&q<3.75) k=1-seg(q,3.4,3.75);
      c.drawImage(src,0,0,100,100);
      if(k>0){
        c.fillStyle='rgba(0,0,0,'+(.84*k)+')'; c.fillRect(0,0,100,100);
        c.globalCompositeOperation='screen'; c.globalAlpha=k;
        c.drawImage(F[Math.floor(T*8)%4],0,0,100,100);
        c.globalAlpha=1; c.globalCompositeOperation='source-over';
      }
    };
  }},

/* ---------- POND RINGS: the real radial warp on the shoreline. Direction: graded still. ---------- */
{ id:'ripple', name:'Pond Rings', section:'Warping', isNew:true, redrawn:true, still:2.2,
  line:'Bends the whole frame in rings around a centre you place, and the rings can travel outward.',
  make(px){
    const P=4.2, S=Math.min(Math.round(px*.5),260), SS=320, CX=46, CY=60, AMP=3.6, WL=3.4;
    const im=read('sunpath',SS), src=new Uint32Array(im.data.buffer);
    const buf=new ImageData(S,S), out=new Uint32Array(buf.data.buffer), n=S*S;
    const R=new Float32Array(n), UX=new Float32Array(n), UY=new Float32Array(n), BX=new Float32Array(n), BY=new Float32Array(n);
    const TB=new Float32Array(4096); for(let i=0;i<4096;i++) TB[i]=Math.sin(i/4096*TAU);
    const units=SS/100;
    for(let y=0,p=0;y<S;y++) for(let x=0;x<S;x++,p++){ const u=(x+.5)/S*100, v=(y+.5)/S*100, dx=u-CX, dy=v-CY, r=Math.hypot(dx,dy)||1e-6; R[p]=r/WL/TAU*4096; UX[p]=dx/r*units; UY[p]=dy/r*units; BX[p]=u*units; BY[p]=v*units; }
    const tmp=mk(S), tx=tmp.getContext('2d');
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P);
      let k=0; if(T>=.7&&T<1.25) k=E.inOut(seg(T,.7,1.25)); else if(T>=1.25&&T<3.4) k=1; else if(T>=3.4&&T<3.9) k=1-E.inOut(seg(T,3.4,3.9));
      const amp=AMP*k, ph=T*4.2/TAU*4096;
      for(let p=0;p<n;p++){
        const off=amp*TB[(R[p]-ph)&4095];
        let sx=(BX[p]+UX[p]*off)|0, sy=(BY[p]+UY[p]*off)|0;
        if(sx<0) sx=0; else if(sx>=SS) sx=SS-1;
        if(sy<0) sy=0; else if(sy>=SS) sy=SS-1;
        out[p]=src[sy*SS+sx];
      }
      tx.putImageData(buf,0,0);
      c.drawImage(tmp,0,0,100,100);
    };
  }},

/* ---------- SPIN: a clapperboard turning at one rate. Direction: cut paper. ---------- */
{ id:'spin', name:'Spin', section:'Shakes / Movement', isNew:true, redrawn:true, still:.62,
  line:'Turns the whole layer around one pivot, rigid and at one steady speed.',
  make(px){
    const P=4;
    const stripes=(c,x0,x1,y0,y1,skew,w)=>{ c.fillStyle=BONE; for(let x=x0-w;x<x1;x+=w*2){ c.beginPath(); c.moveTo(Math.max(x0,x),y0); c.lineTo(Math.min(x1,x+w),y0); c.lineTo(Math.min(x1,x+w-skew),y1); c.lineTo(Math.max(x0,x-skew),y1); c.closePath(); c.fill(); } };
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P), q=Math.floor(T*8)/8, a=q*Math.PI/2;
      c.fillStyle=VERM; c.fillRect(0,0,100,100);
      c.fillStyle=INK; c.beginPath(); c.moveTo(62,100); c.lineTo(100,58); c.lineTo(100,100); c.closePath(); c.fill();
      c.save(); c.translate(47,50); c.rotate(a);
      c.fillStyle=INK;
      c.beginPath(); c.moveTo(-32,-9); c.lineTo(33,-10); c.lineTo(32,29); c.lineTo(-33,28); c.closePath(); c.fill();
      c.save(); c.translate(-32,-12); c.rotate(-.1);
      c.fillStyle=INK; c.fillRect(0,-10,65,10);
      stripes(c,0,65,-10,0,4,7.5);
      c.restore();
      c.fillStyle=BONE;
      c.beginPath(); c.moveTo(-28,-4); c.lineTo(28,-5); c.lineTo(28,-3); c.lineTo(-28,-2); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-28,8); c.lineTo(28,7); c.lineTo(28,9); c.lineTo(-28,10); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-28,20); c.lineTo(8,19.2); c.lineTo(8,21.6); c.lineTo(-28,22.4); c.closePath(); c.fill();
      c.restore();
      c.fillStyle=BONE; c.beginPath(); c.arc(47,50,2.1,0,TAU); c.fill();
    };
  }},

/* ---------- SCATTER ARRAY: one heavy letter, copied by the real hash. Direction: two-ink print. ---------- */
{ id:'scatterarray', name:'Scatter Array', section:'Repetition', isNew:true, redrawn:true, still:2.4,
  line:'Throws copies of the layer around itself, each with its own size, angle and fade.',
  make(px){
    const P=5, S=Math.round(px*.6), W=36;
    const st=mk(S), g=st.getContext('2d'); g.setTransform(S/W,0,0,S/W,0,0);
    g.font='800 36px '+SANS; g.textAlign='center'; g.textBaseline='alphabetic'; g.fillStyle=VERM; g.fillText('&',18,30.5);
    const hashSeed=(k,seed)=>{ let v=Math.imul((k^(k>>>16))+seed*0x9e3779b9,0x45d9f3b); v=Math.imul(v^(v>>>16),0x45d9f3b); v=v^(v>>>16); return (v>>>0)/4294967296; };
    const OX=42, OY=54, N=8, SPREAD=1.05, SCV=.3, ROT=25*Math.PI/180, FADE=.35;
    const copies=seed=>{ const a=[]; const reach=W*SPREAD; for(let i=1;i<N;i++){ const h=(j)=>hashSeed(i*5+j,seed); a.push({x:(h(0)-.5)*2*reach,y:(h(1)-.5)*2*reach,al:1-FADE*h(2),s:1+(h(3)-.5)*2*SCV,an:(h(4)-.5)*2*ROT}); } return a; };
    const SEEDS=[copies(1),copies(4)];
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P), q=Math.floor(T*12)/12;
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      c.fillStyle=INK; c.fillRect(66,0,34,100);
      const n=q<.8?1:(q<2.0?1+Math.floor((q-.8)*6):(q<4.5?8:1));
      const set=SEEDS[q<3.2?0:1];
      c.drawImage(st,OX-W/2,OY-W/2,W,W);
      for(let i=0;i<Math.min(n-1,set.length);i++){ const m=set[i]; c.save(); c.globalAlpha=m.al; c.translate(OX+m.x,OY+m.y); c.rotate(m.an); c.scale(m.s,m.s); c.drawImage(st,-W/2,-W/2,W,W); c.restore(); }
      c.globalAlpha=1;
    };
  }},

/* ---------- LENS FLARE: the real star, ring, streak and pale ghosts. Direction: graded still. ---------- */
{ id:'lensflare', name:'Lens Flare', section:'Generative', isNew:true, redrawn:true, still:1.9,
  line:'Lays a soft star over the picture, with an optional ring, streak and pale round ghosts, and the light can be moved.',
  make(px){
    const P=4.6, SZ=256, FLARE=[255,240,210], I=1, CORE=.42;
    const bg=(()=>{ const C=mk(Math.min(px,420)), x=C.getContext('2d'); x.imageSmoothingQuality='high'; const p=photo('ramp'); if(p) x.drawImage(p,0,0,C.width,C.width); return C; })();
    /* Core and rays. Sprite covers 200 units across, so one sprite pixel is 200/SZ units; real maths in frame fractions. */
    const star=(()=>{ const o=new ImageData(SZ,SZ), d=o.data, sig=.18*CORE, den=2*sig*sig, maxR=Math.SQRT2, stp=1.0471975512;
      for(let y=0;y<SZ;y++) for(let x=0;x<SZ;x++){ const i=(y*SZ+x)*4, dx=((x+.5)/SZ-.5)*2, dy=((y+.5)/SZ-.5)*2, r2=dx*dx+dy*dy, r=Math.sqrt(r2);
        let v=I*255*Math.exp(-r2/den);
        if(r>.002){ const a=Math.atan2(dy,dx), b=Math.cos(a-Math.round(a/stp)*stp); let s=b*b; s=s*s; s=s*s; s=s*s; s=s*s; v+=I*150*s*Math.exp(-r/(maxR*.35)); }
        d[i]=Math.min(255,FLARE[0]*v/255); d[i+1]=Math.min(255,FLARE[1]*v/255); d[i+2]=Math.min(255,FLARE[2]*v/255); d[i+3]=255; }
      return toCanvas(o); })();
    /* The halo ring: red outside, blue inside, as three offset gaussians. Sprite covers 72 units. */
    const HALO=.6, ring=(()=>{ const Z=300, o=new ImageData(Z,Z), d=o.data, R0=.3, Wd=.016, den=2*Wd*Wd, A=HALO*I*120;
      for(let y=0;y<Z;y++) for(let x=0;x<Z;x++){ const i=(y*Z+x)*4, dx=((x+.5)/Z-.5)*.72, dy=((y+.5)/Z-.5)*.72, r=Math.sqrt(dx*dx+dy*dy), e0=r-R0*1.04, e1=r-R0, e2=r-R0*.96;
        d[i]=FLARE[0]*A*Math.exp(-e0*e0/den)/255; d[i+1]=FLARE[1]*A*Math.exp(-e1*e1/den)/255; d[i+2]=FLARE[2]*A*Math.exp(-e2*e2/den)/255; d[i+3]=255; }
      return toCanvas(o); })();
    /* The streak: 200 units wide, 16 tall. */
    const STK=.6, streak=(()=>{ const WW=512, HH=48, o=new ImageData(WW,HH), d=o.data, s1=.0035, s2=.02;
      for(let y=0;y<HH;y++) for(let x=0;x<WW;x++){ const i=(y*WW+x)*4, dx=((x+.5)/WW-.5)*2, dy=((y+.5)/HH-.5)*.16, v=STK*I*(190*Math.exp(-dy*dy/(2*s1*s1))+55*Math.exp(-dy*dy/(2*s2*s2)))*Math.exp(-Math.abs(dx)/.45);
        d[i]=FLARE[0]*v/255; d[i+1]=FLARE[1]*v/255; d[i+2]=FLARE[2]*v/255; d[i+3]=255; }
      return toCanvas(o); })();
    /* Ghosts, the real table: position along light-to-centre, radius, strength, tint. */
    const GT=[[1.35,.05,.45,1,.85,.55],[1.75,.09,.34,.55,1,.7],[.62,.032,.52,.7,.8,1],[2.1,.13,.26,1,.7,.95],[1.12,.024,.58,.95,1,.6]];
    const ghosts=GT.map(g=>{ const Z=96, o=new ImageData(Z,Z), d=o.data, a=I*255*g[2]; for(let y=0;y<Z;y++) for(let x=0;x<Z;x++){ const i=(y*Z+x)*4, rho=Math.hypot((x+.5)/Z*2-1,(y+.5)/Z*2-1); let v=0; if(rho<1){ const r4=rho*rho*rho*rho; let e=(1-rho)/.18; if(e>1) e=1; v=a*(.55+.45*r4)*e; } d[i]=FLARE[0]*g[3]*v/255; d[i+1]=FLARE[1]*g[4]*v/255; d[i+2]=FLARE[2]*g[5]*v/255; d[i+3]=255; } return {pos:g[0],r:g[1]*100,img:toCanvas(o)}; });
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P);
      let m=0; if(T>=.5&&T<1.5) m=E.inOut(seg(T,.5,1.5)); else if(T>=1.5&&T<3.2) m=1; else if(T>=3.2&&T<4.2) m=1-E.inOut(seg(T,3.2,4.2));
      const lx=lerp(22,70,m), ly=lerp(30,18,m);
      c.drawImage(bg,0,0,100,100);
      c.globalCompositeOperation='screen';
      c.drawImage(star,lx-100,ly-100,200,200);
      c.drawImage(ring,lx-36,ly-36,72,72);
      c.drawImage(streak,lx-100,ly-8,200,16);
      for(const g of ghosts){ const gx=lx+(50-lx)*g.pos, gy=ly+(50-ly)*g.pos; c.drawImage(g.img,gx-g.r,gy-g.r,g.r*2,g.r*2); }
      c.globalCompositeOperation='source-over';
    };
  }},

/* ---------- CARD FLIP: the sheet turns over onto its solid back. Direction: comp sheets. ---------- */
{ id:'fliplayer', name:'Card Flip', section:'3D', isNew:true, redrawn:true, still:.95,
  line:'Turns the layer over in perspective, and the back can be mirrored, a solid colour or see-through.',
  make(px){
    const P=4.4, S=Math.min(px,360), N=120, F=3.2, R=34, CX=50, CY=53;
    const im=read('mclaren',S,{x:.08,y:.04,w:.92},[PLATE_MCLAREN]);
    const front=toCanvas(im);
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P);
      let deg=0;
      if(T>=.7&&T<1.3) deg=180*E.inOut(seg(T,.7,1.3));
      else if(T>=1.3&&T<2.6){ const u=T-1.3; deg=180+9*Math.exp(-u*6)*Math.sin(u*17); }
      else if(T>=2.6&&T<3.2) deg=180+180*E.inOut(seg(T,2.6,3.2));
      else if(T>=3.2){ const u=T-3.2; deg=360+9*Math.exp(-u*6)*Math.sin(u*17); }
      const a=deg*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      const proj=x=>{ const z=-x*sa, f=F/Math.max(.2,F-z); return [CX+x*ca*f*R,f]; };
      if(ca>0){
        /* Columns scaled by perspective, then the sloped top and bottom edges trimmed clean with the ground colour. */
        for(let i=0;i<N;i++){ const x0=-1+2*i/N, x1=-1+2*(i+1)/N, [X0,f0]=proj(x0), [X1,f1]=proj(x1), fm=(f0+f1)/2, h=2*R*fm+1.4; c.drawImage(front,i/N*S,0,S/N+.5,S,X0,CY-h/2,X1-X0+.3,h); }
        const [X0,f0]=proj(-1), [X1,f1]=proj(1);
        c.fillStyle=BONE;
        c.beginPath(); c.moveTo(X0-1,CY-R*f0); c.lineTo(X1+1,CY-R*f1); c.lineTo(X1+1,-2); c.lineTo(X0-1,-2); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(X0-1,CY+R*f0); c.lineTo(X1+1,CY+R*f1); c.lineTo(X1+1,102); c.lineTo(X0-1,102); c.closePath(); c.fill();
      } else if(ca<0){
        const [X0,f0]=proj(-1), [X1,f1]=proj(1);
        c.fillStyle=VERM; c.beginPath(); c.moveTo(X0,CY-R*f0); c.lineTo(X1,CY-R*f1); c.lineTo(X1,CY+R*f1); c.lineTo(X0,CY+R*f0); c.closePath(); c.fill();
      }
      tab(c,5,4,'CLIP 01',4.6,BONE,INK);
      const val=((Math.round(deg)%360)+360)%360;
      c.fillStyle=INK; c.font='700 4.6px '+MONO; c.textAlign='right'; c.fillText('FLIP '+val+'°',95,9.4); c.textAlign='left';
    };
  }},

/* ---------- DISPERSION: the real noise front on the silhouettes. Direction: graded still. ---------- */
{ id:'dispersion', name:'Dispersion', section:'Opacity / Visibility', isNew:true, redrawn:true, still:1.9,
  line:'Eats the whole layer away in speckled holes with glowing rims, so the layer below shows through.',
  make(px){
    const P=4.8, S=Math.min(Math.round(px*.55),300), n=S*S, SCALE=46*S/1080, DIST=90*S/1080, SOFT=.35, GLOW=.6, EM=rgb('#ff9a3c');
    const im=read('figures',S), s=im.data;
    const bgC=(()=>{ const C=mk(Math.min(px,420)), x=C.getContext('2d'); x.imageSmoothingQuality='high'; const p=photo('shore'); if(p) x.drawImage(p,0,0,C.width,C.width); return C; })();
    const inv=1/SCALE, gw=Math.ceil(S*inv)+2;
    const cellN=(cx,cy)=>{ let h=((cy*gw+cx)*374761393)|0; h=(h^(h>>13))*1274126177; h=(h^(h>>16)); return (h&0xffff)/65536; };
    const N=new Float32Array(n);
    for(let y=0,p=0;y<S;y++){ const fy=y*inv, y0=fy|0, ty=fy-y0, sy=ty*ty*(3-2*ty); for(let x=0;x<S;x++,p++){ const fx=x*inv, x0=fx|0, tx=fx-x0, sx=tx*tx*(3-2*tx), a=cellN(x0,y0), b=cellN(x0+1,y0), e=cellN(x0,y0+1), f=cellN(x0+1,y0+1), top=a+(b-a)*sx; N[p]=top+((e+(f-e)*sx)-top)*sy; } }
    const buf=new ImageData(S,S), d=buf.data, tmp=mk(S), tx=tmp.getContext('2d');
    return (c,t)=>{
      stage(c,px);
      const T=loopT(t,P), q=Math.floor(T*15)/15;
      let pr=0;
      if(q>=.9&&q<1.5) pr=.55*E.inOut(seg(q,.9,1.5)); else if(q>=1.5&&q<2.7) pr=.55; else if(q>=2.7&&q<3.4) pr=.55+.45*E.inOut(seg(q,2.7,3.4)); else if(q>=3.4&&q<4.4) pr=1;
      c.drawImage(bgC,0,0,100,100);
      if(pr>=1) return;
      const front=pr*(1+SOFT);
      for(let y=0,p=0;y<S;y++) for(let x=0;x<S;x++,p++){
        const i=p*4, e=pr>0?(front-N[p])/SOFT:0;
        if(e<=0){ d[i]=s[i]; d[i+1]=s[i+1]; d[i+2]=s[i+2]; d[i+3]=255; continue; }
        if(e>=1){ d[i+3]=0; continue; }
        const off=e*e*DIST; let sx=Math.round(x-off); if(sx<0) sx=0;
        const si=(y*S+sx)*4; let r=s[si], g=s[si+1], b=s[si+2];
        const k=GLOW*4*e*(1-e); r+=(EM[0]-r)*k; g+=(EM[1]-g)*k; b+=(EM[2]-b)*k;
        d[i]=r; d[i+1]=g; d[i+2]=b; d[i+3]=255*(1-e);
      }
      tx.putImageData(buf,0,0);
      c.drawImage(tmp,0,0,100,100);
    };
  }}

);
})();
