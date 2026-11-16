/* FreeMotion effect pictures, artist 6 (c6): Colour Temperature, Heat Map, Tint, Tone Curve, Vibrance, Chroma Key Pro, Gradient Wipe.
   No photographs. Every subject is painted here, read once, and put through the effect's own arithmetic from js/compositor.js
   at the setting each note names. Nothing is drawn as "the effect" that the kernel did not compute. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const ofData=(w,h,data)=>{ const [C,x]=sheet(w,h), im=x.createImageData(w,h); im.data.set(data); x.putImageData(im,0,0); return C; };
/* the one read of a tile's painted source */
const readAll=C=>{ const x=C.getContext('2d'); x.setTransform(1,0,0,1,0,0); return x.getImageData(0,0,C.width,C.height); };
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; };
const poly=(x,p)=>{ x.beginPath(); for(let i=0;i<p.length;i+=2){ if(i) x.lineTo(p[i],p[i+1]); else x.moveTo(p[i],p[i+1]); } x.closePath(); };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
/* integer hash and 2-D value noise, for grain that is the same on every run */
const ih=(x,y,s)=>{ let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041))|0; n=Math.imul(n^(n>>>13),1274126177); n^=n>>>16; return (n>>>0)/4294967296; };
const vn2=(x,y,s)=>{ const xi=Math.floor(x), yi=Math.floor(y), fx=x-xi, fy=y-yi, ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy), a=ih(xi,yi,s), b=ih(xi+1,yi,s), c=ih(xi,yi+1,s), d=ih(xi+1,yi+1,s); return (a+(b-a)*ux)*(1-uy)+(c+(d-c)*ux)*uy; };
const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const shade=(h,f)=>{ const c=hx(h); return 'rgb('+Math.min(255,Math.round(c[0]*f))+','+Math.min(255,Math.round(c[1]*f))+','+Math.min(255,Math.round(c[2]*f))+')'; };
const grain=(d,w,h,amp,seed)=>{ for(let y=0,i=0;y<h;y++) for(let x=0;x<w;x++,i+=4){ const n=(ih(x,y,seed)-.5)*amp; d[i]+=n; d[i+1]+=n; d[i+2]+=n; } };

window.FX_TILES.push(

/* COLOUR TEMPERATURE. Graded still. White sheets on a line against a lime-washed wall in low sun: every surface a neutral, so the cast is all
   you see. PIXEL_FX.temperature, Method Shift, Tint 0: Temperature T adds T/2 to red and takes T/2 from blue. It travels 0, +40 (the default),
   -40, 0; the frame between two holds is the plain picture blended toward the +40 or -40 render, which is the same sum. */
{ id:'temperature', name:'Colour Temperature', section:'Colouring', isNew:true, still:1.8,
  line:'The whole picture slides warmer or cooler: turn it up and it goes orange, turn it down and it goes blue.',
  make(px){
    const P=4.8, N=px, k=N/100, [S,x]=sheet(N); x.setTransform(k,0,0,k,0,0);
    let g=x.createLinearGradient(0,0,100,100); g.addColorStop(0,'#bfbbb2'); g.addColorStop(1,'#a19d94'); x.fillStyle=g; x.fillRect(0,0,100,100);
    x.fillStyle='#8c8880'; x.fillRect(0,90,100,10); x.fillStyle='rgba(255,255,255,.13)'; x.fillRect(0,90,100,.5);
    /* the line: two sheets and a charcoal towel pegged on it; the sun is up and to the left, so every shadow falls down and to the right */
    const lineY=xx=>11.5+xx*.08, SX=6, SY=8;
    const SH=[[3,45,83,.3,'#f1efea',3,'68,70,78'],[49,64,58,2.2,'#4a494b',1,'0,0,0'],[68,109,75,1.1,'#f1efea',3,'68,70,78']];
    const bot=(s,xx)=>s[2]+1.3*Math.sin(xx*.19+s[3])+.55*Math.sin(xx*.53+s[3]*2);
    const topY=(s,i)=>{ const pg=24/s[5]; return lineY(s[0]+(s[1]-s[0])*i/24)+.9*Math.sin(Math.PI*((i%pg)/pg)); };
    const path=(s,ox,oy)=>{ x.beginPath(); for(let i=0;i<=24;i++){ const xx=s[0]+(s[1]-s[0])*i/24; if(i) x.lineTo(xx+ox,topY(s,i)+oy); else x.moveTo(xx+ox,topY(s,i)+oy); } for(let i=24;i>=0;i--){ const xx=s[0]+(s[1]-s[0])*i/24; x.lineTo(xx+ox,bot(s,xx)+oy); } x.closePath(); };
    x.strokeStyle='rgba(56,54,50,.3)'; x.lineWidth=.55; x.beginPath(); x.moveTo(-2+SX,lineY(-2)+SY); x.lineTo(104+SX,lineY(104)+SY); x.stroke();
    x.fillStyle='rgba(56,54,50,.3)'; for(const s of SH){ path(s,SX,SY); x.fill(); }
    for(const s of SH){
      x.fillStyle=s[4]; path(s,0,0); x.fill();
      const f=x.createLinearGradient(s[0],0,s[1],0); for(let i=0;i<=20;i++){ const q=i/20, xs=s[0]+(s[1]-s[0])*q, a=.19*Math.pow(.5+.5*Math.sin(xs*.38+s[3]*3+.9*Math.sin(xs*.13+s[3])),1.5); f.addColorStop(q,'rgba('+s[6]+','+a.toFixed(3)+')'); }
      x.fillStyle=f; path(s,0,0); x.fill();
      const v=x.createLinearGradient(0,lineY(s[0]),0,s[2]+3); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(40,40,44,.1)'); x.fillStyle=v; path(s,0,0); x.fill();
    }
    x.strokeStyle='#4f4c47'; x.lineWidth=.5; x.beginPath(); x.moveTo(-2,lineY(-2)); x.lineTo(104,lineY(104)); x.stroke();
    for(const s of SH){ const pg=24/s[5]; for(let i=0;i<=24;i+=pg){ const xx=s[0]+(s[1]-s[0])*i/24+(i===0?1.6:i===24?-1.6:0), y=lineY(xx); x.fillStyle='#8a7a66'; x.fillRect(xx-1.1,y-2.2,2.2,4.6); x.fillStyle='rgba(0,0,0,.22)'; x.fillRect(xx+.3,y-2.2,.8,4.6); } }
    const im=readAll(S), d=im.data;
    for(let y=0,i=0;y<N;y++) for(let xx=0;xx<N;xx++,i+=4){ const n=(ih(xx,y,11)-.5)*8+(vn2(xx/(k*6),y/(k*6),5)-.5)*12; d[i]+=n; d[i+1]+=n; d[i+2]+=n; }
    const w=new Uint8ClampedArray(d), cl=new Uint8ClampedArray(d);
    for(let i=0;i<d.length;i+=4){ w[i]=d[i]+20; w[i+2]=d[i+2]-20; cl[i]=d[i]-20; cl[i+2]=d[i+2]+20; }
    const BASE=ofData(N,N,d), WARM=ofData(N,N,w), COOL=ofData(N,N,cl);
    const val=u=>u<.6?0:u<1.3?40*E.inOut(seg(u,.6,1.3)):u<2.3?40:u<3.1?lerp(40,-40,E.inOut(seg(u,2.3,3.1))):u<4?-40:u<4.5?-40*(1-E.inOut(seg(u,4,4.5))):0;
    return (c,t)=>{
      const v=val(mod(t,P)); reset(c,px);
      c.drawImage(BASE,0,0,100,100);
      if(v>.05){ c.globalAlpha=v/40; c.drawImage(WARM,0,0,100,100); } else if(v<-.05){ c.globalAlpha=-v/40; c.drawImage(COOL,0,0,100,100); }
      c.globalAlpha=1;
      const r=Math.round(v); tab(c,4,91,'TEMP '+(r>0?'+':r<0?'−':'')+Math.abs(r),5,INK,BONE);
    };
  } },

/* HEAT MAP. Broadcast bench. A white cup in a dark cafe, then PIXEL_FX.thermal at Amount 1, Low 0, High 100: each pixel's Rec.601 brightness
   looked up on the Iron ramp, then on Arctic. The strip under the picture is that ramp, dark end left. Steam is grey, so it maps purple, not hot. */
{ id:'thermal', name:'Heat Map', section:'Colouring', isNew:true, still:1.6,
  line:'Recolours the picture by brightness in heat-camera colours: the brightest parts go yellow-white, the darkest deep violet. It reads brightness, not real heat.',
  make(px){
    const P=4.4, X=4, Y=4, W=92, H=68, sc=px/100, PW=Math.round(W*sc), PH=Math.round(H*sc);
    const [S,x]=sheet(PW,PH); x.setTransform(PW/W,0,0,PH/H,0,0);
    let g=x.createLinearGradient(0,0,W,0); g.addColorStop(0,'#3b2d23'); g.addColorStop(.55,'#1f1712'); g.addColorStop(1,'#120d0a'); x.fillStyle=g; x.fillRect(0,0,W,H);
    g=x.createLinearGradient(0,50,0,H); g.addColorStop(0,'#2a1e16'); g.addColorStop(1,'#4a3622'); x.fillStyle=g; x.fillRect(0,50,W,H-50);
    x.fillStyle='rgba(255,226,196,.08)'; x.fillRect(0,50,W,.45);
    /* saucer */
    x.fillStyle='rgba(0,0,0,.55)'; x.beginPath(); x.ellipse(37,58,27,4.6,0,0,TAU); x.fill();
    x.fillStyle='#6f6a63'; x.beginPath(); x.ellipse(35,56,26,5.2,0,0,TAU); x.fill();
    g=x.createLinearGradient(9,0,61,0); g.addColorStop(0,'#cdc7be'); g.addColorStop(.25,'#f2eee7'); g.addColorStop(.7,'#a39d94'); g.addColorStop(1,'#5f5a54');
    x.fillStyle=g; x.beginPath(); x.ellipse(35,55,26,5.2,0,0,TAU); x.fill();
    g=x.createLinearGradient(20,0,50,0); g.addColorStop(0,'#bfb9b0'); g.addColorStop(.3,'#ddd8d0'); g.addColorStop(1,'#77726b');
    x.fillStyle=g; x.beginPath(); x.ellipse(35,54.6,15,3,0,0,TAU); x.fill();
    /* handle, then the cup over its two joins */
    g=x.createLinearGradient(0,34,0,47); g.addColorStop(0,'#e9e4dc'); g.addColorStop(1,'#77716a');
    x.strokeStyle=g; x.lineWidth=2.6; x.lineCap='butt'; x.beginPath(); x.arc(52.4,40.6,5.3,-2.07,2.07,false); x.stroke();
    g=x.createLinearGradient(19,0,51,0); g.addColorStop(0,'#bdb7ae'); g.addColorStop(.2,'#f6f2eb'); g.addColorStop(.42,'#e6e1d9'); g.addColorStop(.78,'#99938b'); g.addColorStop(1,'#5f5a54');
    x.fillStyle=g; x.beginPath(); x.moveTo(19,31); x.bezierCurveTo(18.6,40.5,21.8,48.6,26,53.4); x.ellipse(35,53.4,9,1.7,0,Math.PI,0,true); x.bezierCurveTo(48.2,48.6,51.4,40.5,51,31); x.ellipse(35,31,16,3.4,0,0,Math.PI,true); x.closePath(); x.fill();
    /* the coffee, its crema, the lip */
    g=x.createRadialGradient(31,30.6,.5,35,31.2,14.5); g.addColorStop(0,'#6e4a2c'); g.addColorStop(.6,'#4a2e19'); g.addColorStop(1,'#24150b');
    x.fillStyle=g; x.beginPath(); x.ellipse(35,31.3,14.7,2.85,0,0,TAU); x.fill();
    x.lineWidth=.9; x.strokeStyle='rgba(248,245,239,.95)'; x.beginPath(); x.ellipse(35,31,15.4,3.15,0,0,Math.PI,false); x.stroke();
    x.lineWidth=.6; x.strokeStyle='rgba(225,220,212,.8)'; x.beginPath(); x.ellipse(35,31,15.4,3.15,0,Math.PI,TAU,false); x.stroke();
    /* steam: soft puffs strung along three rising paths, widening and fading as they climb, screened in */
    x.globalCompositeOperation='screen';
    const wisp=(p,a,sd)=>{ const B=q=>{ const u=1-q; return [u*u*u*p[0]+3*u*u*q*p[2]+3*u*q*q*p[4]+q*q*q*p[6], u*u*u*p[1]+3*u*u*q*p[3]+3*u*q*q*p[5]+q*q*q*p[7]]; };
      for(let k=0;k<=46;k++){ const q=k/46, b=B(q), r=1.1+4.2*q, env=Math.pow(Math.sin(Math.PI*Math.min(1,.12+q*.95)),.8)*a, al=.34*env*(.75/r)*(.8+.4*hash(k,sd)), ox=1.2*vnoise(q*5,sd)*q;
        const rg=x.createRadialGradient(b[0]+ox,b[1],0,b[0]+ox,b[1],r); rg.addColorStop(0,'rgba(228,221,211,'+al.toFixed(3)+')'); rg.addColorStop(1,'rgba(228,221,211,0)'); x.fillStyle=rg; x.beginPath(); x.arc(b[0]+ox,b[1],r,0,TAU); x.fill(); } };
    wisp([29,29, 23,19, 34,11, 25,-4],1.15,3); wisp([36,28.5, 42,18, 31,8, 40,-5],1.3,5); wisp([42,29.5, 48,21, 43,12, 54,0],.95,7);
    x.globalCompositeOperation='source-over';
    const d=readAll(S).data; grain(d,PW,PH,5,23);
    const SRC=ofData(PW,PH,d);
    /* the kernel's own ramps and lookup */
    const RAMPS=[[[0,0,0],[10,0,130],[120,0,170],[230,50,40],[255,175,0],[255,255,165]],[[8,0,60],[0,90,200],[0,200,170],[200,230,60],[255,240,120]]];
    const pal=(ST,l)=>{ const s=l*(ST.length-1); let i0=Math.floor(s); if(i0>=ST.length-1) i0=ST.length-2; const f=s-i0, a=ST[i0], b=ST[i0+1]; return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f]; };
    const mapped=ST=>{ const o=new Uint8ClampedArray(d.length); for(let i=0;i<d.length;i+=4){ const q=pal(ST,(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255); o[i]=q[0]; o[i+1]=q[1]; o[i+2]=q[2]; o[i+3]=255; } return ofData(PW,PH,o); };
    const IRON=mapped(RAMPS[0]), ARC=mapped(RAMPS[1]);
    return (c,t)=>{
      const f=Math.floor(mod(t,P)*25)/25, st=f<.8?0:f<2.6?1:f<3.7?2:0;
      reset(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100);
      c.drawImage(st===1?IRON:st===2?ARC:SRC,X,Y,W,H);
      const x0=4, x1=96, y0=81.5, h=4.6;
      if(st){ const ST=RAMPS[st-1], gr=c.createLinearGradient(x0,0,x1,0); ST.forEach((s,i)=>gr.addColorStop(i/(ST.length-1),'rgb('+s[0]+','+s[1]+','+s[2]+')')); c.fillStyle=gr; c.fillRect(x0,y0,x1-x0,h); }
      else { c.strokeStyle='#3a3f4a'; c.lineWidth=.5; c.strokeRect(x0+.25,y0+.25,x1-x0-.5,h-.5); }
      c.textBaseline='alphabetic'; c.textAlign='left'; c.font=MONO(5.4); c.fillStyle=st?TEXT:DIM; c.fillText(st===1?'IRON':st===2?'ARCTIC':'OFF',x0,79);
      c.font=MONO(3.9); c.fillStyle=DIM; c.fillText('DARK',x0,92.4); c.textAlign='right'; c.fillText('BRIGHT',x1,92.4);
    };
  } },

/* TINT. Flat still life: books on an oak table. tintPixels' Colourise at Amount 1: every pixel becomes its brightness times the colour, in the
   default #FF3366, then #4A86FF. Amount fades in and out (the kernel's own linear mix, which a canvas alpha blend reproduces). */
{ id:'tint', name:'Tint', section:'Colouring', isNew:true, still:1.9,
  line:'The whole picture turns into light and dark shades of the one colour you pick.',
  make(px){
    const P=4.8, sc=px/100, PH=Math.round(86*sc), [S,x]=sheet(px,PH); x.setTransform(sc,0,0,PH/86,0,0);
    let g=x.createLinearGradient(0,0,100,0); g.addColorStop(0,'#dad4c7'); g.addColorStop(1,'#bab3a5'); x.fillStyle=g; x.fillRect(0,0,100,67);
    g=x.createLinearGradient(0,66,0,86); g.addColorStop(0,'#8d653f'); g.addColorStop(1,'#b6885b'); x.fillStyle=g; x.fillRect(0,66,100,20);
    x.lineWidth=.3; x.strokeStyle='rgba(70,42,20,.17)';
    for(let i=0;i<9;i++){ const y=67.8+i*2.15; x.beginPath(); x.moveTo(0,y); for(let q=1;q<=10;q++) x.lineTo(q*10,y+vnoise(q*.7+i*3.1,9)*.55); x.stroke(); }
    x.fillStyle='rgba(40,28,16,.25)'; x.fillRect(0,66,100,.8);
    const flat=(x0,yb,w,h,rot,col,lab,band)=>{ x.save(); x.translate(x0,yb); x.rotate(rot);
      x.fillStyle=col; x.fillRect(0,-h,w,h);
      const s=x.createLinearGradient(0,-h,0,0); s.addColorStop(0,'rgba(255,255,255,.2)'); s.addColorStop(.35,'rgba(255,255,255,.05)'); s.addColorStop(.7,'rgba(0,0,0,.06)'); s.addColorStop(1,'rgba(0,0,0,.34)'); x.fillStyle=s; x.fillRect(0,-h,w,h);
      x.fillStyle=band; x.fillRect(3,-h,.55,h); x.fillRect(w-3.55,-h,.55,h);
      x.fillStyle=lab; x.fillRect(w*.3,-h*.76,w*.25,h*.52);
      x.restore(); };
    const up=(xr,yb,T,Hh,lean,col,lab,band)=>{ x.save(); x.translate(xr,yb); x.rotate(lean);
      x.fillStyle=col; x.fillRect(-T,-Hh,T,Hh);
      const s=x.createLinearGradient(-T,0,0,0); s.addColorStop(0,'rgba(255,255,255,.18)'); s.addColorStop(.4,'rgba(255,255,255,.04)'); s.addColorStop(.75,'rgba(0,0,0,.08)'); s.addColorStop(1,'rgba(0,0,0,.34)'); x.fillStyle=s; x.fillRect(-T,-Hh,T,Hh);
      x.fillStyle=band; x.fillRect(-T,-Hh+3,T,.55); x.fillRect(-T,-3.55,T,.55);
      x.fillStyle=lab; x.fillRect(-T*.78,-Hh*.64,T*.56,Hh*.22);
      x.restore(); };
    /* contact shadows */
    x.fillStyle='rgba(35,22,10,.32)'; x.fillRect(5,65.4,27,1.3); x.fillRect(43,65.4,57,1.4);
    up(13.5,66,7.4,45,0,'#22324f','#c9a14a','#b08b3c');
    up(20.2,66,6.2,40,0,'#8a2f2a','#e3d9c3','#d1bf95');
    up(28.4,66,8,47,.14,'#3f6e6c','#e3d9c3','#1f2a2a');
    const BK=[[44,58,6.2,.006,'#2f5a43','#d9cfb3','#c9a14a'],[49,51,4.4,-.008,'#e0d6c0','#7a2b2b','#a4823c'],[42,61,7,.004,'#b5583a','#1f1f22','#1f1f22'],[52,48,3.8,-.01,'#1f2023','#c9a14a','#c9a14a'],
      [47,54,5.4,.009,'#4f6f8f','#e7e2d5','#e7e2d5'],[55,45,4.8,-.006,'#c99a2e','#2a2a2a','#2a2a2a'],[50,49,3.6,.012,'#7a2b2b','#d6c9a8','#c9a14a']];
    let yb=66; for(const b of BK){ flat(b[0],yb,b[1],b[2],b[3],b[4],b[5],b[6]); yb-=b[2]; }
    const d=readAll(S).data; grain(d,px,PH,6,31);
    const SRC=ofData(px,PH,d);
    const tinted=C=>{ const o=new Uint8ClampedArray(d.length); for(let i=0;i<d.length;i+=4){ const l=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255; o[i]=l*C[0]; o[i+1]=l*C[1]; o[i+2]=l*C[2]; o[i+3]=255; } return ofData(px,PH,o); };
    const C1='#ff3366', C2='#4a86ff', T1=tinted(hx(C1)), T2=tinted(hx(C2));
    return (c,t)=>{
      const u=mod(t,P), am=u<.8?0:u<1.2?E.inOut(seg(u,.8,1.2)):u<4?1:u<4.4?1-E.inOut(seg(u,4,4.4)):0, two=u>=2.6&&u<4.4;
      reset(c,px); c.drawImage(SRC,0,0,100,86);
      if(am>.002){ c.globalAlpha=am; c.drawImage(two?T2:T1,0,0,100,86); c.globalAlpha=1; }
      c.fillStyle=INK; c.fillRect(0,86,100,14);
      if(am>.002){ c.fillStyle=two?C2:C1; c.fillRect(4,89,8,8); }
      else { c.strokeStyle=DIM; c.lineWidth=.5; c.strokeRect(4.25,89.25,7.5,7.5); c.beginPath(); c.moveTo(4.25,96.75); c.lineTo(11.75,89.25); c.stroke(); }
      c.textBaseline='middle'; c.textAlign='left'; c.font=MONO(5.2); c.fillStyle=am>.002?TEXT:DIM; c.fillText(am>.002?(two?C2:C1).toUpperCase():'NONE',15,93.3);
      c.textAlign='right'; c.font=MONO(4.2); c.fillStyle=DIM; c.fillText(am.toFixed(2),96,93.3);
    };
  } },

/* TONE CURVE. Viewer overlay. A lighthouse on a headland under an overcast sky: flat light, low contrast. PIXEL_FX.tonecurve: the RGB set
   steps from the straight line (Shadows 25, Highlights 75) to a firm S (14/86; the default is a gentler 20/80, which barely shows at menu
   size), then Channel goes to Blue and the Blue set opens its
   blacks and closes its whites (12/33/51/71/90), the colourist's cool-shadow, warm-light move; then back. Each Blue level is run through
   the RGB curve after its own, as tcLUT does. The curve, its pooling, the monotone Hermite slopes and the hold-never-dip rule are the
   kernel's own; the graph is drawn from the same splines that built each picture. */
{ id:'tonecurve', name:'Tone Curve', section:'Colouring', isNew:true, still:3.0,
  line:'Bends the tones through five points: an S gives the picture contrast, and a curve on one channel tints the shadows and lights.',
  make(px){
    const P=4.8, PU=64, sc=px/100, PW=Math.round(PU*sc), [S,x]=sheet(PW,px); x.setTransform(PW/PU,0,0,sc,0,0);
    /* overcast sky, soft cloud bands, a slate sea */
    let g=x.createLinearGradient(0,0,0,62); g.addColorStop(0,'#aeb1b2'); g.addColorStop(1,'#c4c6c3'); x.fillStyle=g; x.fillRect(0,0,PU,62);
    for(const q of [[9,.1,'255,255,255',3.4],[21,.08,'58,64,70',2.6],[31,.08,'255,255,255',2.8],[44,.06,'58,64,70',2]]){ x.fillStyle='rgba('+q[2]+','+q[1]+')'; x.beginPath(); x.ellipse(34,q[0],52,q[3],-.05,0,TAU); x.fill(); }
    x.fillStyle='#878e8f'; x.fillRect(0,60,PU,41);
    for(let i=0;i<15;i++){ const y=61.2+i*2.6; x.fillStyle='rgba(225,230,228,'+(.07+.04*(i%3)).toFixed(2)+')'; x.fillRect(44+((i*17)%14),y,8+((i*29)%12),.35); }
    /* the headland: grass on top, a rock face dropping to the sea */
    x.fillStyle='#53524d'; poly(x,[40,57.4, 46,59, 50,65, 53,73, 58,81, 66,87, 66,101, 34,101]); x.fill();
    x.fillStyle='rgba(28,28,28,.2)'; for(let i=0;i<7;i++){ const y=62+i*4.5; x.fillRect(44+i*1.9,y,8+i*.7,.5); }
    x.fillStyle='#71755f'; poly(x,[-2,55.6, 10,55, 22,55.8, 34,56.8, 42,57.6, 46,59, 42,62, 32,64, 18,65, -2,66]); x.fill();
    x.fillStyle='#676a57'; poly(x,[-2,66, 18,65, 32,64, 42,62, 46,59, 47,68, 49,80, 45,101, -2,101]); x.fill();
    x.strokeStyle='rgba(38,42,30,.3)'; x.lineWidth=.38; for(let i=0;i<46;i++){ const bx=(i*7.3)%46, by=68+((i*13)%32); x.beginPath(); x.moveTo(bx,by); x.lineTo(bx+.6,by-2.4); x.stroke(); }
    /* the keeper's cottage, then the tower */
    x.fillStyle='#c9c8c2'; x.fillRect(31,50.6,14,7.4); x.fillStyle='#4b4f51'; poly(x,[30,50.8, 38,46, 46,50.8]); x.fill(); x.fillStyle='#3a3e40'; x.fillRect(34,53.6,2.2,4.4); x.fillRect(40,52.6,2.6,2.2);
    const TX=19, TB=58, TT=15, hw=y=>lerp(3.4,5.3,(y-TT)/(TB-TT)), band=(a,b)=>[TX-hw(a),a, TX+hw(a),a, TX+hw(b),b, TX-hw(b),b];
    g=x.createLinearGradient(TX-5.3,0,TX+5.3,0); g.addColorStop(0,'#cfcec9'); g.addColorStop(.35,'#dedcd7'); g.addColorStop(1,'#a3a29d');
    x.fillStyle=g; poly(x,band(TT,TB)); x.fill();
    x.fillStyle='#93473e'; poly(x,band(31,37.5)); x.fill();
    g=x.createLinearGradient(TX-5.3,0,TX+5.3,0); g.addColorStop(0,'rgba(255,255,255,.05)'); g.addColorStop(1,'rgba(0,0,0,.2)'); x.fillStyle=g; poly(x,band(31,37.5)); x.fill();
    x.fillStyle='#33383a'; x.fillRect(TX-4.9,TT-1.5,9.8,1.5); x.fillRect(TX-3,TT-8,6,6.5);
    x.fillStyle='#6d7578'; x.fillRect(TX-2.1,TT-7.3,1.2,5.2); x.fillRect(TX+.7,TT-7.3,1.2,5.2);
    x.strokeStyle='#33383a'; x.lineWidth=.4; x.beginPath(); x.moveTo(TX-4.7,TT-4); x.lineTo(TX+4.7,TT-4); x.stroke();
    x.fillStyle='#2b3032'; x.beginPath(); x.arc(TX,TT-8,3.2,Math.PI,TAU); x.fill(); x.fillRect(TX-.3,TT-13,.6,2);
    x.fillStyle='#3b3f41'; x.fillRect(TX-1,TB-5.4,2,5.4); x.fillRect(TX-.7,24,1.4,2.2); x.fillRect(TX-.8,44,1.6,2.4);
    const d=readAll(S).data; grain(d,PW,px,6,41);
    /* tcPool, tcSpline, tcAt and tcLUT, as written in the kernel */
    const pool=ys=>{ const v=[], n=[]; for(let i=0;i<ys.length;i++){ v.push(ys[i]); n.push(1); while(v.length>1&&v[v.length-2]>v[v.length-1]){ const b=v.pop(), nb=n.pop(), a=v.pop(), na=n.pop(); v.push((a*na+b*nb)/(na+nb)); n.push(na+nb); } } const o=[]; for(let i=0;i<v.length;i++) for(let k=0;k<n[i];k++) o.push(v[i]); return o; };
    const spline=ys=>{ const y=pool(ys), dl=[], m=[]; for(let k=0;k<4;k++) dl.push((y[k+1]-y[k])*4); m[0]=dl[0]; m[4]=dl[3]; for(let k=1;k<4;k++) m[k]=dl[k-1]>0&&dl[k]>0?2*dl[k-1]*dl[k]/(dl[k-1]+dl[k]):0; return {y,m}; };
    const at=(s,v)=>{ if(v<=0) return s.y[0]; if(v>=1) return s.y[4]; let k=(v*4)|0; if(k>3) k=3; const u=v*4-k, u2=u*u, u3=u2*u; return (2*u3-3*u2+1)*s.y[k]+(u3-2*u2+u)*.25*s.m[k]+(3*u2-2*u3)*s.y[k+1]+(u3-u2)*.25*s.m[k+1]; };
    const LINE=[0,.25,.5,.75,1], DEF=[0,.14,.5,.86,1], BLUE=[.12,.33,.51,.71,.9], mix=(a,b,q)=>a.map((v,i)=>Math.round((v+(b[i]-v)*q)*100)/100);
    /* the states the loop stops on: [RGB points, Blue points or null, channel shown] */
    const ST=[[LINE,null,0],[mix(LINE,DEF,1/3),null,0],[mix(LINE,DEF,2/3),null,0],[DEF,null,0],[DEF,mix(LINE,BLUE,1/3),1],[DEF,mix(LINE,BLUE,2/3),1],[DEF,BLUE,1]];
    const FR=ST.map(s=>{ if(s[0]===LINE) return ofData(PW,px,d);
      const M=spline(s[0]), C=s[1]&&spline(s[1]), lut=c=>{ const L=new Uint8ClampedArray(256); for(let v=0;v<256;v++){ let y=v/255; if(c) y=at(c,y); L[v]=at(M,y)*255; if(v&&L[v]<L[v-1]) L[v]=L[v-1]; } return L; };
      const LR=lut(null), LB=C?lut(C):LR, o=new Uint8ClampedArray(d.length);
      for(let i=0;i<d.length;i+=4){ o[i]=LR[d[i]]; o[i+1]=LR[d[i+1]]; o[i+2]=LB[d[i+2]]; o[i+3]=255; } return ofData(PW,px,o); });
    const SP=ST.map(s=>[spline(s[0]),s[1]?spline(s[1]):null]);
    /* 12 fps steps between holds */
    const SEQ=[[0,0],[.75,1],[.83,2],[.92,3],[2.2,4],[2.29,5],[2.38,6],[3.9,5],[3.98,4],[4.06,3],[4.14,2],[4.22,1],[4.3,0]];
    const GX=68.5, GY=33, GS=27, BL='#6f9cf2';
    return (c,t)=>{
      const u=mod(t,P); let j=0; for(const q of SEQ) if(u>=q[0]) j=q[1];
      const s=ST[j], blue=s[2]===1, pts=blue?s[1]:s[0];
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.drawImage(FR[j],0,0,PU,100);
      c.strokeStyle=HAIR; c.lineWidth=.5; c.strokeRect(GX,GY,GS,GS);
      c.strokeStyle='#3e485c'; c.beginPath(); c.moveTo(GX,GY+GS); c.lineTo(GX+GS,GY); c.stroke();
      const draw=(sp,col,w)=>{ c.strokeStyle=col; c.lineWidth=w; c.lineJoin='round'; c.beginPath(); for(let q=0;q<=48;q++){ const v=q/48, X=GX+v*GS, Y=GY+GS-at(sp,v)*GS; if(q) c.lineTo(X,Y); else c.moveTo(X,Y); } c.stroke(); };
      if(blue){ draw(SP[j][0],'#5d6880',.6); draw(SP[j][1],BL,.85); } else draw(SP[j][0],TEXT,.8);
      c.fillStyle=TEAL; pts.forEach((v,i)=>{ const X=GX+i/4*GS, Y=GY+GS-v*GS; c.fillRect(X-1.15,Y-1.15,2.3,2.3); });
      tab(c,GX,GY-8.6,blue?'BLUE':'RGB',4.4,blue?'#2c4a86':HAIR,TEXT);
      c.font=MONO(3.7); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='alphabetic';
      c.fillText('SHADOWS '+Math.round(pts[1]*100),GX,GY+GS+6.6); c.fillText('HIGHLIGHTS '+Math.round(pts[3]*100),GX,GY+GS+11.4);
    };
  } },

/* VIBRANCE. Graded still. A spice stall at eye level, the heaps lit from the upper left: sage, cumin, dried rose and lavender are dull;
   paprika and turmeric are already strong. PIXEL_FX.vibrance at Amount 2.4, Boosts: Dull colours: f = 1 + (Amount - 1) x
   (1 - (max - min)/255), pushed out from each pixel's mean. A hairline split shows it against the plain picture. */
{ id:'vibrance', name:'Vibrance', section:'Colouring', isNew:true, still:2.2,
  line:'Dull colours get much richer, while colours that are already strong change far less.',
  make(px){
    const P=4.6, N=px, k=N/100, [S,x]=sheet(N); x.setTransform(k,0,0,k,0,0);
    let g=x.createLinearGradient(0,0,0,60); g.addColorStop(0,'#16110d'); g.addColorStop(1,'#2b221b'); x.fillStyle=g; x.fillRect(0,0,100,100);
    x.fillStyle='rgba(255,230,200,.05)'; x.fillRect(0,13,100,.6); x.fillRect(0,31,100,.6);
    const R=rng(9157);
    /* a heap: straight-ish flanks, a rounded crown, lit from the left; its tray's brass lip in front */
    const heap=(cx,yb,w,h,col)=>{ const yp=yb-h, path=()=>{ x.beginPath(); x.moveTo(cx-w/2,yb); x.bezierCurveTo(cx-w*.3,yb-h*.55,cx-w*.13,yp,cx,yp); x.bezierCurveTo(cx+w*.13,yp,cx+w*.3,yb-h*.55,cx+w/2,yb); x.closePath(); };
      let q=x.createLinearGradient(cx-w/2,0,cx+w/2,0); q.addColorStop(0,shade(col,.92)); q.addColorStop(.3,shade(col,1.1)); q.addColorStop(.6,col); q.addColorStop(1,shade(col,.55)); x.fillStyle=q; path(); x.fill();
      x.save(); path(); x.clip(); const n=Math.round(w*h*3.2);
      for(let i=0;i<n;i++){ const gx=cx-w/2+R()*w, gy=yp+R()*h, s=(gx-cx)/(w/2); x.fillStyle=shade(col,(.74+R()*.44)*(1.08-.3*Math.max(0,s)-.08*Math.abs(s))); x.fillRect(gx,gy,.36+R()*.32,.36+R()*.32); }
      q=x.createLinearGradient(0,yb-3,0,yb); q.addColorStop(0,'rgba(0,0,0,0)'); q.addColorStop(1,'rgba(0,0,0,.28)'); x.fillStyle=q; x.fillRect(cx-w/2,yb-3,w,3); x.restore();
      x.fillStyle='#5e4a2e'; x.fillRect(cx-w/2-1.5,yb-.4,w+3,3.6); x.fillStyle='rgba(255,226,170,.28)'; x.fillRect(cx-w/2-1.5,yb-.4,w+3,.5); x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(cx-w/2-1.5,yb+2.6,w+3,.6); };
    heap(25,55,26,25,'#eba90c'); heap(57,55,28,23,'#b0808a'); heap(91,55,26,27,'#8a7d99');
    x.fillStyle='rgba(10,8,6,.55)'; x.fillRect(0,58.2,100,4);
    heap(5,95,36,33,'#7f8f63'); heap(42,95,36,37,'#d21f12'); heap(80,95,38,32,'#9b7b51');
    const d=readAll(S).data; grain(d,N,N,5,53);
    const K=2.4, o=new Uint8ClampedArray(d.length);
    for(let i=0;i<d.length;i+=4){ const r=d[i], gg=d[i+1], b=d[i+2], av=(r+gg+b)/3, mx=Math.max(r,gg,b), mn=Math.min(r,gg,b), f=1+(K-1)*(1-(mx-mn)/255); o[i]=av+(r-av)*f; o[i+1]=av+(gg-av)*f; o[i+2]=av+(b-av)*f; o[i+3]=255; }
    const BASE=ofData(N,N,d), VIB=ofData(N,N,o);
    const sx=u=>u<.6?0:u<1.6?60*settle(seg(u,.6,1.6)):u<2.7?60:u<3.15?lerp(60,100,E.inOut(seg(u,2.7,3.15))):u<3.9?100:u<4.4?100*(1-E.inOut(seg(u,3.9,4.4))):0;
    return (c,t)=>{
      const X=clamp(sx(mod(t,P)),0,100); reset(c,px);
      c.drawImage(BASE,0,0,100,100);
      if(X>.05){ c.save(); c.beginPath(); c.rect(0,0,X,100); c.clip(); c.drawImage(VIB,0,0,100,100); c.restore(); }
      if(X>.05&&X<99.95){ c.fillStyle=BONE; c.fillRect(X-.35,0,.7,100); }
      if(X>24) tab(c,3,92.2,'AMOUNT 2.4',4.2,INK,BONE);
    };
  } },

/* CHROMA KEY PRO. Viewer overlay. An anglepoise on a green cyc that is lit hard from the upper left and falls to under half in the far corner.
   PIXEL_FX.chromakeypro at its defaults (key #00C23C, Tolerance .3, Edge softness .28, Despill .7, Edge desaturate .35): distance from the key
   in Cb/Cr only, so the dark corner and the lamp's own shadow key out with the lit wall. The View control under the picture is the effect's
   own: it cuts Result, Matte, Result. The lamp is vermilion on purpose: the key holds a grey back only to about 86 %, a red fully. */
{ id:'chromakeypro', name:'Chroma Key Pro', section:'Keying', isNew:true, still:1.8,
  line:'Takes out a green screen even where it falls into shadow, so the layer underneath shows through cleanly.',
  make(px){
    const P=4.8, X=3, Y=3, W=94, H=69, sc=px/100, PW=Math.round(W*sc), PH=Math.round(H*sc);
    const [S,x]=sheet(PW*2,PH); x.setTransform(PW/W,0,0,PH/H,0,0);
    /* the lamp: base, two arms with their spring, a cone shade aimed down and to the left */
    const P0=[60,59.4], P1=[69,31], P2=[43,20.5], AX=[-.6,.8], NX=[.8,.6], L=15, M=[P2[0]+AX[0]*L,P2[1]+AX[1]*L];
    const shadeCone=()=>{ poly(x,[P2[0]+NX[0]*2.3,P2[1]+NX[1]*2.3, M[0]+NX[0]*8.6,M[1]+NX[1]*8.6, M[0]-NX[0]*8.6,M[1]-NX[1]*8.6, P2[0]-NX[0]*2.3,P2[1]-NX[1]*2.3]); };
    const lampShape=(fill)=>{ x.fillStyle=fill; x.strokeStyle=fill; x.lineCap='round';
      x.beginPath(); x.moveTo(51,64.6); x.lineTo(51,63.2); x.quadraticCurveTo(60,57.4,69,63.2); x.lineTo(69,64.6); x.closePath(); x.fill();
      x.lineWidth=2.2; x.beginPath(); x.moveTo(P0[0],P0[1]); x.lineTo(P1[0],P1[1]); x.lineTo(P2[0],P2[1]); x.stroke();
      shadeCone(); x.fill(); };
    /* the green cyc */
    let g=x.createRadialGradient(10,6,0,10,6,118); g.addColorStop(0,'#06e24e'); g.addColorStop(.35,'#00be3b'); g.addColorStop(.7,'#008a2c'); g.addColorStop(1,'#005e1e');
    x.fillStyle=g; x.fillRect(0,0,W,H);
    g=x.createLinearGradient(0,44,0,57); g.addColorStop(0,'rgba(0,40,10,0)'); g.addColorStop(.5,'rgba(0,40,10,.15)'); g.addColorStop(1,'rgba(0,40,10,0)'); x.fillStyle=g; x.fillRect(0,44,W,13);
    x.save(); x.translate(7,3.2); lampShape('rgba(0,36,9,.24)'); x.restore();
    /* the lamp itself */
    x.save(); x.lineCap='round';
    g=x.createLinearGradient(51,58,69,65); g.addColorStop(0,'#f26a3e'); g.addColorStop(1,'#9c2b0e'); x.fillStyle=g;
    x.beginPath(); x.moveTo(51,64.6); x.lineTo(51,63.2); x.quadraticCurveTo(60,57.4,69,63.2); x.lineTo(69,64.6); x.closePath(); x.fill();
    const rod=(a,b,w,col)=>{ x.strokeStyle=col; x.lineWidth=w; x.beginPath(); x.moveTo(a[0],a[1]); x.lineTo(b[0],b[1]); x.stroke(); };
    const off=(p,q,o)=>{ const dx=q[0]-p[0], dy=q[1]-p[1], l=Math.hypot(dx,dy); return [[p[0]-dy/l*o,p[1]+dx/l*o],[q[0]-dy/l*o,q[1]+dx/l*o]]; };
    let s2=off(P0,P1,1.9); rod(s2[0],s2[1],.75,'#8a2810');
    s2=off(P1,P2,1.7); rod(s2[0],s2[1],.7,'#8a2810');
    rod(P0,P1,2.2,'#d9401a'); rod(P1,P2,2.0,'#d9401a');
    s2=off(P0,P1,-.6); rod(s2[0],s2[1],.45,'#f47c52'); s2=off(P1,P2,-.55); rod(s2[0],s2[1],.42,'#f47c52');
    g=x.createLinearGradient(P2[0]+NX[0]*6,P2[1]+NX[1]*6,P2[0]-NX[0]*6,P2[1]-NX[1]*6); g.addColorStop(0,'#a8300f'); g.addColorStop(.55,'#e4471d'); g.addColorStop(1,'#f4774b');
    x.fillStyle=g; shadeCone(); x.fill();
    x.fillStyle='#4a1405'; x.beginPath(); x.ellipse(M[0],M[1],8.6,1.5,Math.atan2(NX[1],NX[0]),0,TAU); x.fill();
    for(const p of [P0,P1,P2]){ x.fillStyle='#7c210b'; x.beginPath(); x.arc(p[0],p[1],1.75,0,TAU); x.fill(); x.fillStyle='#f0643a'; x.beginPath(); x.arc(p[0]-.45,p[1]-.45,.6,0,TAU); x.fill(); }
    x.restore();
    /* the plate it is keyed onto: a wall with window light, a walnut desk */
    x.translate(W,0);
    x.fillStyle='#c8c0b2'; x.fillRect(0,0,W,H);
    x.fillStyle='#e7e0d2'; poly(x,[6,-2, 40,-2, 55,41, 21,41]); x.fill();
    x.fillStyle='#c8c0b2'; poly(x,[21.6,-2, 24.8,-2, 39.8,41, 36.6,41]); x.fill();
    x.fillStyle='#4a3527'; x.fillRect(0,60,W,5.5); x.fillStyle='#7b5e48'; x.fillRect(0,60,W,.6); x.fillStyle='#24190f'; x.fillRect(0,65.5,W,H-65.5);
    const D=readAll(S).data, n=PW*PH;
    for(let y=0,i=0;y<PH;y++) for(let xx=0;xx<PW*2;xx++,i+=4){ const e=(ih(xx,y,61)-.5)*5; D[i]+=e; D[i+1]+=e; D[i+2]+=e; }
    /* the kernel at its defaults, then a plain source-over onto the plate */
    const kc=[0,194,60], kcb=-.169*kc[0]-.331*kc[1]+.5*kc[2], kcr=.5*kc[0]-.419*kc[1]-.081*kc[2], tol=.3*180, hi=tol+.28*180, SPILL=.7, EDS=.35;
    const keyA=(r,gg,b)=>{ const cb=-.169*r-.331*gg+.5*b, cr=.5*r-.419*gg-.081*b, a=cb-kcb, e=cr-kcr, dist=Math.sqrt(a*a+e*e); if(dist<=tol) return 0; if(dist>=hi) return 1; const u=(dist-tol)/(hi-tol); return u*u*(3-2*u); };
    const so=new Uint8ClampedArray(n*4), ro=new Uint8ClampedArray(n*4), mo=new Uint8ClampedArray(n*4);
    for(let y=0;y<PH;y++) for(let xx=0;xx<PW;xx++){
      const s0=y*PW*8+xx*4, p0=s0+PW*4, o=(y*PW+xx)*4;
      let r=D[s0], gg=D[s0+1], b=D[s0+2];
      so[o]=r; so[o+1]=gg; so[o+2]=b; so[o+3]=255;
      const a=keyA(r,gg,b), v=a*255; mo[o]=v; mo[o+1]=v; mo[o+2]=v; mo[o+3]=255;
      if(a>0){ const mx=r>b?r:b; if(gg>mx) gg=gg-(gg-mx)*SPILL; if(a<1){ const w=EDS*(1-a), l=.299*r+.587*gg+.114*b; r+=(l-r)*w; gg+=(l-gg)*w; b+=(l-b)*w; } }
      ro[o]=D[p0]*(1-a)+r*a; ro[o+1]=D[p0+1]*(1-a)+gg*a; ro[o+2]=D[p0+2]*(1-a)+b*a; ro[o+3]=255;
    }
    const SRC=ofData(PW,PH,so), RES=ofData(PW,PH,ro), MAT=ofData(PW,PH,mo);
    return (c,t)=>{
      const f=Math.floor(mod(t,P)*15)/15, st=f<.9?0:f<2.7?1:f<3.8?2:f<4.4?1:0;
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.drawImage(st===1?RES:st===2?MAT:SRC,X,Y,W,H);
      /* View: the effect's own two-way choice, the live one filled; dim while the effect is off */
      const sy=79, sh=8, segs=[['RESULT',23,27],['MATTE',50,23]];
      c.textBaseline='middle'; c.textAlign='left'; c.font=MONO(4.2); c.fillStyle=DIM; c.fillText('VIEW',X+.6,sy+sh/2+.2);
      segs.forEach((q,i)=>{ const on=st&&((st===1&&i===0)||(st===2&&i===1)); c.fillStyle=on?HAIR:NAVY; c.fillRect(q[1],sy,q[2],sh); c.strokeStyle=st?'#3f4b62':HAIR; c.lineWidth=.5; c.strokeRect(q[1]+.25,sy+.25,q[2]-.5,sh-.5);
        if(on){ c.fillStyle=TEAL; c.fillRect(q[1]+1.2,sy+sh-1.3,q[2]-2.4,.6); }
        c.font=MONO(4.4); c.textAlign='center'; c.fillStyle=on?TEXT:st?DIM:'#4a5468'; c.fillText(q[0],q[1]+q[2]/2,sy+sh/2+.2); });
      c.fillStyle='#00c23c'; c.fillRect(84,sy+1,6,6); c.strokeStyle=st?TEXT:'#4a5468'; c.lineWidth=.45; c.strokeRect(84,sy+1,6,6);
    };
  } },

/* GRADIENT WIPE. Graded still: a two-light stained-glass window in a dark stone wall, lit from behind. With no Wipe map the map is the
   layer's own brightness (drawGradientWipe), so the palest glass opens first wherever it sits, then the golds and pale blues, then the greens,
   then the reds, deep blues and purples, the lead and the stone last. gradientWipeAlpha at Softness 10 %, Progress keyed 0 to 1, over the
   layer below (plain ink), held, then keyed back. */
{ id:'gradientwipe', name:'Gradient Wipe', section:'Keying', isNew:true, still:1.55,
  line:'The layer appears in order of its own brightness: the lightest parts first, the darkest last.',
  make(px){
    const P=4.6, N=px, k=N/100, [S,x]=sheet(N); x.setTransform(k,0,0,k,0,0);
    /* coursed stone */
    x.fillStyle='#2d2926'; x.fillRect(0,0,100,100);
    x.lineWidth=.45; x.strokeStyle='rgba(0,0,0,.4)';
    for(let r=0;r<12;r++){ const y=r*8.7+2; x.beginPath(); x.moveTo(0,y); x.lineTo(100,y); x.stroke(); for(let q=0;q<7;q++){ const xx=(r%2)*8.5+q*17+3; x.beginPath(); x.moveTo(xx,y); x.lineTo(xx,y+8.7); x.stroke(); } x.fillStyle='rgba(255,240,220,.035)'; x.fillRect(0,y+.45,100,.5); }
    /* the window: two pointed lights under one arch, the left side of the deep reveal catching light */
    const X0=31, X1=85, YS=30, YA=5, XC=(X0+X1)/2;
    const arch=(a,b,ys,ya,grow)=>{ const c=(a+b)/2; x.beginPath(); x.moveTo(a-grow,104); x.lineTo(a-grow,ys); x.quadraticCurveTo(a-grow,ya+(ys-ya)*.2-grow,c,ya-grow); x.quadraticCurveTo(b+grow,ya+(ys-ya)*.2-grow,b+grow,ys); x.lineTo(b+grow,104); x.closePath(); };
    x.fillStyle='#4a433c'; arch(X0,X1,YS,YA,3.4); x.fill();
    x.fillStyle='#3a342f'; poly(x,[X1+3.4,104, X1+3.4,YS, X1,YS, X1,104]); x.fill();
    const R=rng(3203), COLS=['#ebe8da','#f3dc94','#e0a83a','#93bbd9','#4f8a4a','#b8322a','#2a4f9a','#5b3a7c'], WT=[1,2,2,2,1.6,2,2.6,1.4], WS=WT.reduce((a,b)=>a+b,0);
    const pick=avoid=>{ for(let n=0;n<8;n++){ let r=R()*WS, i=0; while(r>WT[i]){ r-=WT[i]; i++; } if(!avoid.includes(i)) return i; } return 0; };
    const light=(a,b)=>{ const cols=3, rows=11, Vx=[], Vy=[];
      for(let j=0;j<=rows;j++){ Vx.push([]); Vy.push([]); for(let i=0;i<=cols;i++){ const edge=i===0||i===cols; Vx[j].push(a+(b-a)*i/cols+(edge?0:(R()-.5)*4.2)); Vy[j].push(YA-2+j*9.6+(j===0||j===rows?0:(R()-.5)*4.4)); } }
      const C=[]; x.save(); arch(a,b,YS+2,YA+2,0); x.clip();
      for(let j=0;j<rows;j++){ C.push([]); for(let i=0;i<cols;i++){ const ci=pick([C[j][i-1],j?C[j-1][i]:-1]); C[j].push(ci); x.fillStyle=COLS[ci]; poly(x,[Vx[j][i],Vy[j][i], Vx[j][i+1],Vy[j][i+1], Vx[j+1][i+1],Vy[j+1][i+1], Vx[j+1][i],Vy[j+1][i]]); x.fill(); } }
      const sky=x.createLinearGradient(0,YA,0,100); sky.addColorStop(0,'rgba(255,255,255,.1)'); sky.addColorStop(1,'rgba(0,0,0,.16)'); x.fillStyle=sky; x.fillRect(a-1,0,b-a+2,104);
      x.strokeStyle='#1c1917'; x.lineWidth=.95; x.lineJoin='round';
      for(let j=0;j<=rows;j++){ x.beginPath(); for(let i=0;i<=cols;i++){ if(i) x.lineTo(Vx[j][i],Vy[j][i]); else x.moveTo(Vx[j][i],Vy[j][i]); } x.stroke(); }
      for(let i=1;i<cols;i++){ x.beginPath(); for(let j=0;j<=rows;j++){ if(j) x.lineTo(Vx[j][i],Vy[j][i]); else x.moveTo(Vx[j][i],Vy[j][i]); } x.stroke(); }
      x.restore(); x.strokeStyle='#1c1917'; x.lineWidth=1.3; arch(a,b,YS+2,YA+2,0); x.stroke(); };
    light(X0,XC-1.6); light(XC+1.6,X1);
    x.fillStyle='#423b35'; x.fillRect(XC-1.6,YS-6,3.2,110);
    const d=readAll(S).data;
    /* a little grain, and the slow mottle that blown glass and old stone both have */
    for(let y=0,i=0;y<N;y++) for(let xx=0;xx<N;xx++,i+=4){ const e=(ih(xx,y,71)-.5)*6+(vn2(xx/(k*2.6),y/(k*2.6),72)-.5)*16; d[i]+=e; d[i+1]+=e; d[i+2]+=e; }
    const LAYER=ofData(N,N,d);
    /* the map: this layer's own brightness, sampled for a mask that the frame fills */
    const M=Math.min(N,600), [MK,mk]=sheet(M), mim=mk.createImageData(M,M), md=mim.data, V=new Uint8Array(M*M);
    let vmin=255;
    for(let j=0;j<M;j++) for(let i=0;i<M;i++){ const sx=Math.min(N-1,Math.floor((i+.5)*N/M)), sy=Math.min(N-1,Math.floor((j+.5)*N/M)), q=(sy*N+sx)*4, v=Math.round(.299*d[q]+.587*d[q+1]+.114*d[q+2]); V[j*M+i]=v; if(v<vmin) vmin=v; const o=(j*M+i)*4; md[o]=md[o+1]=md[o+2]=255; }
    const [WK,wk]=sheet(N), LUT=new Uint8Array(256), SOFT=.1;
    const alpha=(v,p)=>{ if(!(p>0)) return 0; if(p>=1) return 1; const e=(1+SOFT/2)-p*(1+SOFT), a=(v-e)/SOFT+.5; return a<=0?0:a>=1?1:a; };
    return (c,t)=>{
      const u=mod(t,P), p=u<.35?0:u<3?seg(u,.35,3):u<4?1:u<4.4?1-seg(u,4,4.4):0;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.fillStyle=INK; c.fillRect(0,0,px,px);
      if(p>0){
        if(alpha(vmin/255,p)>=1) c.drawImage(LAYER,0,0,px,px);
        else {
          for(let v=0;v<256;v++) LUT[v]=Math.round(255*alpha(v/255,p));
          for(let q=0,o=3;q<V.length;q++,o+=4) md[o]=LUT[V[q]];
          mk.putImageData(mim,0,0);
          wk.setTransform(1,0,0,1,0,0); wk.globalAlpha=1; wk.globalCompositeOperation='copy'; wk.drawImage(MK,0,0,N,N);
          wk.globalCompositeOperation='source-in'; wk.drawImage(LAYER,0,0); wk.globalCompositeOperation='source-over';
          c.drawImage(WK,0,0,px,px);
        }
      }
      reset(c,px); tab(c,3,91.6,'PROGRESS '+p.toFixed(2),4.2,BONE,INK);
    };
  } }

);
})();
