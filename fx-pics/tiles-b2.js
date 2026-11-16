/* Round 2, batch 2: Keying and Blur. */
(function(){ 'use strict'; const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

function makeC(w,h,rf){ const C=document.createElement('canvas'); C.width=Math.max(1,Math.round(w)); C.height=Math.max(1,Math.round(h==null?w:h)); const x=C.getContext('2d',rf?{willReadFrequently:true}:undefined); return [C,x]; }
const smooth=(a,b,v)=>{ const p=clamp((v-a)/(b-a)); return p*p*(3-2*p); };
const rgb=(a,b,p)=>'rgb('+Math.round(lerp(a[0],b[0],p))+','+Math.round(lerp(a[1],b[1],p))+','+Math.round(lerp(a[2],b[2],p))+')';
function n2(x,y,s){ const i=Math.floor(x), j=Math.floor(y), u=x-i, v=y-j, f=p=>p*p*(3-2*p), a=hash(i+j*113,s), b=hash(i+1+j*113,s), c=hash(i+(j+1)*113,s), d=hash(i+1+(j+1)*113,s), U=f(u), V=f(v); return lerp(lerp(a,b,U),lerp(c,d,U),V); }
function fbm(x,y,s){ return n2(x,y,s)*.55+n2(x*2.1,y*2.1,s+1)*.3+n2(x*4.3,y*4.3,s+2)*.15; }

/* A soft copy of src, for use only inside make(). Three box passes in premultiplied alpha, at a reduced size when the radius
   allows it, so the result is returned small and drawn back up. r is in 0..100 tile units. */
function blurred(src,px,r,o){
  o=o||{};
  const rp=r*px/100, dn=Math.max(1,Math.min(8,Math.floor(rp/3.5))), dx=dn, dy=o.h?1:dn;
  const w=Math.max(4,Math.round(src.width/dx)), h=Math.max(4,Math.round(src.height/dy));
  const [T,x]=makeC(w,h,true); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'; x.drawImage(src,0,0,w,h);
  const im=x.getImageData(0,0,w,h), d=im.data, n=w*h, f=new Float32Array(n*4);
  for(let i=0;i<n;i++){ const a=d[i*4+3]/255; f[i*4]=d[i*4]*a; f[i*4+1]=d[i*4+1]*a; f[i*4+2]=d[i*4+2]*a; f[i*4+3]=d[i*4+3]; }
  const rx=Math.max(1,Math.round(rp*w/src.width)), ry=Math.max(1,Math.round(rp*h/src.height));
  const L=new Float32Array(Math.max(w,h)*4);
  function line(base,stride,len,rad,wrap){
    for(let i=0;i<len;i++){ const p=base+i*stride; L[i*4]=f[p]; L[i*4+1]=f[p+1]; L[i*4+2]=f[p+2]; L[i*4+3]=f[p+3]; }
    const at=i=>wrap?(((i%len)+len)%len):(i<0?0:(i>=len?len-1:i)), div=1/(2*rad+1); let s0=0,s1=0,s2=0,s3=0;
    for(let i=-rad;i<=rad;i++){ const q=at(i)*4; s0+=L[q]; s1+=L[q+1]; s2+=L[q+2]; s3+=L[q+3]; }
    for(let i=0;i<len;i++){ const p=base+i*stride; f[p]=s0*div; f[p+1]=s1*div; f[p+2]=s2*div; f[p+3]=s3*div; const a=at(i+rad+1)*4, b=at(i-rad)*4; s0+=L[a]-L[b]; s1+=L[a+1]-L[b+1]; s2+=L[a+2]-L[b+2]; s3+=L[a+3]-L[b+3]; }
  }
  for(let p=0;p<3;p++){
    for(let j=0;j<h;j++) line(j*w*4,4,w,rx,!!o.wrap);
    if(!o.h) for(let i=0;i<w;i++) line(i*4,w*4,h,ry,false);
  }
  for(let i=0;i<n;i++){ const a=f[i*4+3]; if(a>0.01){ const k=255/a; d[i*4]=f[i*4]*k; d[i*4+1]=f[i*4+1]*k; d[i*4+2]=f[i*4+2]*k; } d[i*4+3]=a; }
  x.putImageData(im,0,0);
  return T;
}

window.FX_TILES.push(

/* ----------------------------------------------------------------- VENETIAN BLINDS */
{ id:'blinds', name:'Venetian Blinds', section:'Keying', isNew:true, still:1.25,
  line:'Slats tip open one after another, and the beach comes through between them.',
  make(px){
    const P=4.4, sc=px/100, N=8, TOP=6, H=(100-TOP)/N;
    const [B,b]=canvasOf(px);
    let g=b.createLinearGradient(0,0,0,50); g.addColorStop(0,'#1786e4'); g.addColorStop(.62,'#62cdfb'); g.addColorStop(1,'#dcf7ff'); b.fillStyle=g; b.fillRect(0,0,100,50);
    g=b.createRadialGradient(70,20,1,70,20,36); g.addColorStop(0,'rgba(255,250,210,.95)'); g.addColorStop(.26,'rgba(255,236,170,.5)'); g.addColorStop(1,'rgba(255,236,170,0)'); b.fillStyle=g; b.fillRect(20,0,80,62);
    b.fillStyle='#fff9de'; b.beginPath(); b.arc(70,20,8.5,0,TAU); b.fill();
    function cloud(x,y,s){ b.fillStyle='rgba(255,255,255,.96)'; [[-11,2,4.6],[-5,-1.6,6.2],[2,-3,7.4],[9,-.4,5.4],[14.5,2.2,3.6]].forEach(([dx,dy,r])=>{ b.beginPath(); b.arc(x+dx*s,y+dy*s,r*s,0,TAU); b.fill(); }); b.beginPath(); b.roundRect(x-15*s,y+1.6*s,33*s,4.6*s,2.3*s); b.fill(); }
    cloud(46,12,.62); cloud(91,36,.42);
    g=b.createLinearGradient(0,47,0,76); g.addColorStop(0,'#0570c0'); g.addColorStop(.45,'#0ca6d0'); g.addColorStop(1,'#5be8d6'); b.fillStyle=g; b.fillRect(0,47,100,30);
    for(let i=0;i<6;i++){ const y=49+i*3.7, w=15-i*1.7; b.fillStyle='rgba(255,246,200,'+(.8-i*.1)+')'; b.beginPath(); b.roundRect(70-w/2+(i%2?1.2:-1.2),y,w,1.15,.55); b.fill(); }
    b.strokeStyle='rgba(255,255,255,.38)'; b.lineWidth=.6; b.lineCap='round';
    for(let j=0;j<4;j++){ const y=51.5+j*5.2, gap=19-j*1.5, off=j%2?gap/2:0; for(let x=-gap+off;x<104;x+=gap){ b.beginPath(); b.moveTo(x,y); b.quadraticCurveTo(x+2.5,y-1,x+5+j,y); b.stroke(); } }
    b.fillStyle='#f4f7fb'; b.beginPath(); b.moveTo(47,46.2); b.lineTo(47,38); b.quadraticCurveTo(51.5,41.5,53,46.2); b.closePath(); b.fill();
    b.fillStyle='#ffb347'; b.beginPath(); b.moveTo(46.2,46.2); b.lineTo(46.2,40); b.quadraticCurveTo(43.4,43,42.5,46.2); b.closePath(); b.fill();
    b.fillStyle='#17304f'; b.beginPath(); b.moveTo(42,46.8); b.lineTo(53.6,46.8); b.lineTo(51.8,49); b.lineTo(44,49); b.closePath(); b.fill();
    const shore=x=>72+2.4*Math.sin(x*.075+.8)+1.2*Math.sin(x*.19);
    const shorePath=(c,yo)=>{ c.moveTo(-2,shore(-2)+yo); for(let x=2;x<=102;x+=4) c.lineTo(x,shore(x)+yo); };
    b.beginPath(); shorePath(b,0); b.lineTo(102,102); b.lineTo(-2,102); b.closePath();
    g=b.createLinearGradient(0,70,0,100); g.addColorStop(0,'#ffe9b8'); g.addColorStop(1,'#f0bd6c'); b.fillStyle=g; b.fill();
    b.beginPath(); shorePath(b,0); b.lineTo(102,shore(102)+4.4); for(let x=98;x>=-2;x-=4) b.lineTo(x,shore(x)+4.4); b.closePath(); b.fillStyle='rgba(176,132,76,.32)'; b.fill();
    /* towel */
    b.save(); b.translate(55,90); b.transform(1,0,-.45,.5,0,0); const stripes=['#ff5a6c','#fff4e4','#27b7c9','#fff4e4','#ff5a6c']; stripes.forEach((col,i)=>{ b.fillStyle=col; b.fillRect(-14,-9+i*3.6,28,3.7); }); b.restore();
    /* umbrella */
    b.fillStyle='rgba(120,78,30,.3)'; b.beginPath(); b.ellipse(79,91,17,3.4,0,0,TAU); b.fill();
    b.save(); b.translate(75,68); b.rotate(.18);
    b.fillStyle='#f6f2e6'; b.fillRect(-.7,-1,1.4,24);
    const dome=['#ff4d5e','#fff6e8','#ff4d5e','#fff6e8','#ff4d5e'], DW=19, DH=14;
    for(let k=0;k<5;k++){ const x0=lerp(-DW,DW,k/5), x1=lerp(-DW,DW,(k+1)/5); b.beginPath(); b.moveTo(0,-DH); b.quadraticCurveTo(x0*.92,-DH,x0,0); b.quadraticCurveTo((x0+x1)/2,-1.8,x1,0); b.quadraticCurveTo(x1*.92,-DH,0,-DH); b.closePath(); b.fillStyle=dome[k]; b.fill(); }
    const sh=b.createLinearGradient(-DW,0,DW,0); sh.addColorStop(0,'rgba(120,20,40,0)'); sh.addColorStop(.6,'rgba(120,20,40,.04)'); sh.addColorStop(1,'rgba(120,20,40,.3)'); b.fillStyle=sh; b.beginPath(); b.moveTo(0,-DH); b.quadraticCurveTo(-DW*.92,-DH,-DW,0); b.lineTo(DW,0); b.quadraticCurveTo(DW*.92,-DH,0,-DH); b.closePath(); b.fill();
    b.fillStyle='#fff6e8'; b.beginPath(); b.arc(0,-DH-.3,1,0,TAU); b.fill();
    b.restore();
    /* palm */
    const tr=s=>[(1-s)*(1-s)*12+2*(1-s)*s*9+s*s*28,(1-s)*(1-s)*104+2*(1-s)*s*60+s*s*33];
    b.beginPath(); for(let i=0;i<=20;i++){ const s=i/20,p=tr(s),w=3.3-1.8*s; i?b.lineTo(p[0]-w,p[1]):b.moveTo(p[0]-w,p[1]); } for(let i=20;i>=0;i--){ const s=i/20,p=tr(s),w=3.3-1.8*s; b.lineTo(p[0]+w,p[1]); } b.closePath();
    g=b.createLinearGradient(6,0,20,0); g.addColorStop(0,'#a06a3a'); g.addColorStop(1,'#5a3a20'); b.fillStyle=g; b.fill();
    b.strokeStyle='rgba(50,28,12,.5)'; b.lineWidth=.5; for(let i=1;i<14;i++){ const s=i/14,p=tr(s),w=3.3-1.8*s; b.beginPath(); b.moveTo(p[0]-w,p[1]); b.quadraticCurveTo(p[0],p[1]+1,p[0]+w,p[1]); b.stroke(); }
    function frond(x0,y0,ang,len,droop,w,col){
      const ex=x0+Math.cos(ang)*len, ey=y0+Math.sin(ang)*len+droop, mx=x0+Math.cos(ang)*len*.55, my=y0+Math.sin(ang)*len*.55-droop*.45;
      const pt=s=>[(1-s)*(1-s)*x0+2*(1-s)*s*mx+s*s*ex,(1-s)*(1-s)*y0+2*(1-s)*s*my+s*s*ey];
      const up=s=>{ const a=pt(Math.max(0,s-.01)), d=pt(Math.min(1,s+.01)), dx=d[0]-a[0], dy=d[1]-a[1], l=Math.hypot(dx,dy)||1; let nx=-dy/l, ny=dx/l; if(ny>0){ nx=-nx; ny=-ny; } return [nx,ny]; };
      const wd=s=>w*Math.sin(Math.PI*Math.pow(s,.72))*(1-.1*s), n=22;
      b.beginPath(); b.moveTo(x0,y0);
      for(let i=1;i<=n;i++){ const s=i/n,p=pt(s),nv=up(s); b.lineTo(p[0]+nv[0]*wd(s)*.32,p[1]+nv[1]*wd(s)*.32); }
      for(let i=n;i>=0;i--){ const s=i/n,p=pt(s),nv=up(s),k=(i%2)?1.05:.38; b.lineTo(p[0]-nv[0]*wd(s)*k,p[1]-nv[1]*wd(s)*k); }
      b.closePath(); b.fillStyle=col; b.fill();
      b.strokeStyle='rgba(205,255,180,.45)'; b.lineWidth=.42; b.beginPath(); b.moveTo(x0,y0); for(let i=1;i<=n;i++){ const p=pt(i/n); b.lineTo(p[0],p[1]); } b.stroke();
    }
    const d2r=Math.PI/180;
    [[-172,24,12,'#0a7a42'],[-8,25,13,'#0a7a42'],[-140,25,9,'#0f8f4d'],[-38,25,9,'#0f8f4d'],[-112,20,5,'#18a85c'],[-66,21,5,'#18a85c'],[160,20,14,'#0d8549'],[22,21,14,'#0d8549']].forEach(([a,l,dr,col])=>frond(28,33,a*d2r,l,dr,6.2,col));
    b.fillStyle='#6a3f1e'; [[25.8,35],[29.8,35.4],[27.8,37.2]].forEach(([x,y])=>{ b.beginPath(); b.arc(x,y,1.9,0,TAU); b.fill(); });
    const lightC=[255,251,240], midC=[241,231,214], darkC=[208,195,170], lightT=[255,240,205], midT=[219,201,165], darkT=[152,136,108];
    return (c,t)=>{
      const u=t%P;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(B,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      const sw=1.5*Math.sin(u/P*TAU*2);
      c.beginPath(); shorePath(c,sw); c.lineTo(102,shore(102)+sw+1.5); for(let x=98;x>=-2;x-=4) c.lineTo(x,shore(x)+sw+1.5+.7*Math.sin(x*.5)); c.closePath(); c.fillStyle='rgba(255,255,255,.92)'; c.fill();
      let openSum=0;
      for(let i=0;i<N;i++){
        const d=i*.075, o=E.inOut(seg(u,.35+d,1.05+d))*(1-E.inOut(seg(u,3.05+d,3.7+d))); openSum+=o;
        const ang=o*1.37, vh=H*Math.cos(ang)+.6+.25*(1-o), yc=TOP+i*H+H/2, top=yc-vh/2, bot=yc+vh/2;
        const sg=c.createLinearGradient(0,bot,0,bot+2.4); sg.addColorStop(0,'rgba(30,24,14,'+(.4-.2*o)+')'); sg.addColorStop(1,'rgba(30,24,14,0)'); c.fillStyle=sg; c.fillRect(0,bot,100,2.4);
        const g2=c.createLinearGradient(0,top,0,bot); g2.addColorStop(0,rgb(lightC,lightT,o)); g2.addColorStop(.5,rgb(midC,midT,o)); g2.addColorStop(1,rgb(darkC,darkT,o)); c.fillStyle=g2; c.fillRect(0,top,100,vh);
        c.fillStyle='rgba(255,255,255,.82)'; c.fillRect(0,top,100,.32);
        c.fillStyle='rgba(84,70,48,.55)'; c.fillRect(0,bot-.34,100,.34);
        c.fillStyle='rgba(60,48,32,.75)'; [22,78].forEach(x=>{ c.beginPath(); c.ellipse(x,yc,.62,Math.min(.5,vh*.2),0,0,TAU); c.fill(); });
      }
      const avg=openSum/N;
      const warmG=c.createRadialGradient(72,16,2,72,16,84); warmG.addColorStop(0,'rgba(255,196,110,.34)'); warmG.addColorStop(.55,'rgba(255,196,110,.12)'); warmG.addColorStop(1,'rgba(255,196,110,0)'); c.fillStyle=warmG; c.fillRect(0,0,100,100);
      c.strokeStyle='rgba(96,82,60,.6)'; c.lineWidth=.42; c.beginPath(); c.moveTo(22,TOP); c.lineTo(22,100); c.moveTo(78,TOP); c.lineTo(78,100); c.stroke();
      let g3=c.createLinearGradient(0,0,0,TOP); g3.addColorStop(0,'#fffdf6'); g3.addColorStop(.7,'#e9dfca'); g3.addColorStop(1,'#beb196'); c.fillStyle=g3; c.fillRect(0,0,100,TOP);
      g3=c.createLinearGradient(0,TOP,0,TOP+2.6); g3.addColorStop(0,'rgba(30,24,14,.38)'); g3.addColorStop(1,'rgba(30,24,14,0)'); c.fillStyle=g3; c.fillRect(0,TOP,100,2.6);
      if(avg>.01){ c.globalCompositeOperation='screen'; c.globalAlpha=.34*avg; const rg=c.createRadialGradient(70,20,0,70,20,70); rg.addColorStop(0,'rgba(255,240,190,1)'); rg.addColorStop(1,'rgba(255,240,190,0)'); c.fillStyle=rg; c.fillRect(0,0,100,100); c.globalAlpha=1; c.globalCompositeOperation='source-over'; }
      c.setTransform(1,0,0,1,0,0);
    };
  }},

/* ----------------------------------------------------------------- LUMA KEY */
{ id:'lumakey', name:'Luma Key', section:'Keying', isNew:true, still:1.2,
  line:'The brightest part of the sky is removed first, and the galaxy behind spreads out from there.',
  make(px){
    const P=4.8, sc=px/100, MS=240, J=15, SX=35, SY=45;
    const LV=new Float32Array(MS*MS); let lo=9, hi=-9;
    for(let y=0;y<MS;y++) for(let x=0;x<MS;x++){ const X=(x+.5)/MS*100, Y=(y+.5)/MS*100, d=Math.hypot((X-SX)/72,(Y-SY-4)/58), ds=Math.hypot(X-SX,Y-SY); let v=.85-.5*Math.pow(clamp(d),1.1)+.12*(fbm(X*.042,Y*.1,3)-.5); v=Math.max(v,lerp(v,1,Math.exp(-ds*ds/190))); v=Math.max(v,smooth(7.8,6,ds)); v=clamp(v,0,1); LV[y*MS+x]=v; if(v<lo) lo=v; if(v>hi) hi=v; }
    const ramp=[[.25,[92,160,226]],[.5,[150,205,240]],[.68,[255,214,170]],[.85,[255,238,194]],[1,[255,255,246]]];
    const colourOf=v=>{ for(let i=1;i<ramp.length;i++){ if(v<=ramp[i][0]){ const p=clamp((v-ramp[i-1][0])/(ramp[i][0]-ramp[i-1][0])); return [lerp(ramp[i-1][1][0],ramp[i][1][0],p),lerp(ramp[i-1][1][1],ramp[i][1][1],p),lerp(ramp[i-1][1][2],ramp[i][1][2],p)]; } } return ramp[ramp.length-1][1]; };
    const [SK0,sk0]=makeC(MS,MS,true); const skI=sk0.createImageData(MS,MS);
    for(let i=0;i<MS*MS;i++){ const col=colourOf(LV[i]); skI.data[i*4]=col[0]; skI.data[i*4+1]=col[1]; skI.data[i*4+2]=col[2]; skI.data[i*4+3]=255; }
    sk0.putImageData(skI,0,0);
    const [SKY,sky]=makeC(px,px); sky.imageSmoothingQuality='high'; sky.drawImage(SK0,0,0,px,px);
    const spacing=(hi-lo+.16)/(J-1), soft=spacing*2.4, masks=[];
    for(let j=0;j<J;j++){ const th=lerp(hi+.08,lo-.08,j/(J-1)); const [MC,mc]=makeC(MS,MS,true); const im=mc.createImageData(MS,MS); for(let i=0;i<MS*MS;i++){ im.data[i*4]=255; im.data[i*4+1]=255; im.data[i*4+2]=255; im.data[i*4+3]=255*smooth(th-soft,th+soft,LV[i]); } mc.putImageData(im,0,0); masks.push(MC); }
    const GS=300, [G0,g0]=makeC(GS,GS,true), gI=g0.createImageData(GS,GS), ca=Math.cos(-.6), sa=Math.sin(-.6);
    for(let y=0;y<GS;y++) for(let x=0;x<GS;x++){
      const X=(x+.5)/GS*100, Y=(y+.5)/GS*100, dx=X-48, dy=Y-34, s=dx*ca+dy*sa, v=-dx*sa+dy*ca, n=fbm(X*.055,Y*.055,9), n3=fbm(X*.14,Y*.14,12);
      const band=Math.exp(-Math.pow(v/19,2))*(.55+n*.9), core=Math.exp(-Math.pow(v/8.5,2))*(.35+n*1.05), bulge=Math.exp(-(Math.pow(s/34,2)+Math.pow(v/9.5,2)));
      const dust=1-.72*Math.exp(-Math.pow((v+6*(n-.5)+2*Math.sin(s*.09))/3.2,2))*(.45+n3);
      const r=7+14*Y/100+58*band+118*core*dust+205*bulge*dust, gg=9+10*Y/100+46*band+84*core*dust+172*bulge*dust, b=30+34*Y/100+138*band+118*core*dust+118*bulge*dust;
      const i=(y*GS+x)*4; gI.data[i]=Math.min(255,r); gI.data[i+1]=Math.min(255,gg); gI.data[i+2]=Math.min(255,b); gI.data[i+3]=255;
    }
    g0.putImageData(gI,0,0);
    const [GAL,gal]=canvasOf(Math.ceil(px)); gal.imageSmoothingQuality='high'; gal.setTransform(1,0,0,1,0,0); gal.drawImage(G0,0,0,px,px); gal.setTransform(sc,0,0,sc,0,0);
    const r=rng(41);
    for(let i=0;i<900;i++){ const X=r()*100, Y=r()*78, dx=X-48, dy=Y-34, v=-dx*sa+dy*ca, near=Math.exp(-Math.pow(v/22,2)); if(r()>.25+near*.75) continue; const size=.1+r()*r()*.42; gal.globalAlpha=.45+r()*.55; gal.fillStyle=r()<.22?'#ffd9b8':(r()<.5?'#bcd2ff':'#ffffff'); gal.beginPath(); gal.arc(X,Y,size,0,TAU); gal.fill(); }
    gal.globalAlpha=1;
    const big=[[12,12,1.15,'#cfe0ff',1],[30,24,.9,'#ffe6c4',2],[47,9,1.2,'#ffffff',3],[71,14,1.05,'#ffd4e2',1],[88,31,1.2,'#bfe3ff',2],[20,41,.95,'#ffffff',3],[83,6,.85,'#ffffff',2],[8,28,.8,'#ffe6c4',3]];
    function starSprite(col){ const [C,x]=makeC(80,80); const g=x.createRadialGradient(40,40,0,40,40,40); g.addColorStop(0,'#fff'); g.addColorStop(.12,col); g.addColorStop(.42,col+'33'); g.addColorStop(1,col+'00'); x.fillStyle=g; x.fillRect(0,0,80,80); x.globalCompositeOperation='lighter'; x.fillStyle=col+'cc'; x.beginPath(); x.ellipse(40,40,38,1.2,0,0,TAU); x.ellipse(40,40,1.2,38,0,0,TAU); x.fill(); return C; }
    const sprites=big.map(b=>starSprite(b[3]));
    /* ridges: anchors placed by hand, then split so the edge is rough but the mountains stay where they were put */
    function ridge(anchors,rough,seed){ const R=rng(seed); let p=anchors.map(a=>a.slice()); let amp=rough; for(let it=0;it<4;it++){ const q=[]; for(let i=0;i<p.length-1;i++){ q.push(p[i]); q.push([(p[i][0]+p[i+1][0])/2+(R()-.5)*amp*.35,(p[i][1]+p[i+1][1])/2+(R()-.5)*amp]); } q.push(p[p.length-1]); p=q; amp*=.56; } return p; }
    const fill=(x,pts,col)=>{ x.beginPath(); x.moveTo(pts[0][0],pts[0][1]); pts.forEach(q=>x.lineTo(q[0],q[1])); x.lineTo(102,102); x.lineTo(-2,102); x.closePath(); x.fillStyle=col; x.fill(); };
    const far=ridge([[-2,60],[12,52],[28,60],[46,56],[74,46],[90,54],[102,48]],5,11);
    const mid=ridge([[-2,72],[14,62],[30,70],[46,50],[62,27],[78,50],[90,44],[102,62]],6.5,23);
    const near=ridge([[-2,90],[20,85.5],[42,92],[64,87.5],[84,92],[102,85.5]],2.4,5);
    const [M,mx]=canvasOf(px);
    fill(mx,far,'#2d3159'); fill(mx,mid,'#12132d');
    mx.save(); mx.beginPath(); mx.moveTo(mid[0][0],mid[0][1]); mid.forEach(q=>mx.lineTo(q[0],q[1])); mx.lineTo(102,102); mx.lineTo(-2,102); mx.closePath(); mx.clip();
    /* the left face of each peak catches the light; the edge runs down a rough spine so it never reads as a triangle */
    [[62,27,46,-3,17,31],[90,44,28,-2,10,33],[46,50,26,-2,10,47],[14,62,18,-1,8,52]].forEach(([x,y,len,lean,w,seed])=>{ const R=rng(seed); let X=x, Y=y; const pts=[[x,y]]; for(let i=1;i<=13;i++){ Y+=len/13; X+=lean/13+(R()-.5)*2.5; pts.push([X,Y]); } const fg=mx.createLinearGradient(0,y,0,y+len); fg.addColorStop(0,'rgba(150,168,238,.3)'); fg.addColorStop(.55,'rgba(150,168,238,.13)'); fg.addColorStop(1,'rgba(150,168,238,0)'); mx.fillStyle=fg; mx.beginPath(); mx.moveTo(x,y); pts.forEach(p=>mx.lineTo(p[0],p[1])); mx.lineTo(X-w*1.6,Y); mx.lineTo(x-w*.1,y); mx.closePath(); mx.fill(); });
    mx.restore();
    let mg=mx.createLinearGradient(0,68,0,92); mg.addColorStop(0,'rgba(116,128,204,0)'); mg.addColorStop(.62,'rgba(116,128,204,.34)'); mg.addColorStop(1,'rgba(116,128,204,.1)'); mx.fillStyle=mg; mx.fillRect(0,68,100,24);
    fill(mx,near,'#05060f');
    const nearY=x=>{ for(let i=1;i<near.length;i++){ if(x<=near[i][0]){ const p=clamp((x-near[i-1][0])/(near[i][0]-near[i-1][0])); return lerp(near[i-1][1],near[i][1],p); } } return near[near.length-1][1]; };
    mx.fillStyle='#05060f';
    for(let i=0;i<34;i++){ const x=i*3.1+.6, h=4.2+3*((i*7)%5)/4, y=nearY(x)+.6; for(let k=0;k<3;k++){ const yy=y-k*h*.28, w=(1.8-k*.42)*(h/5); mx.beginPath(); mx.moveTo(x-w,yy); mx.lineTo(x,yy-h*.56); mx.lineTo(x+w,yy); mx.closePath(); mx.fill(); } }
    const rimOf=col=>{ const [C,x]=canvasOf(px); x.strokeStyle=col; x.lineWidth=.55; x.lineJoin='round'; x.beginPath(); x.moveTo(mid[0][0],mid[0][1]); mid.forEach(q=>x.lineTo(q[0],q[1])); x.stroke(); return C; };
    const warm=rimOf('rgba(255,226,170,.95)'), cool=rimOf('rgba(150,170,255,.85)');
    const [T,x]=makeC(px,px);
    return (c,t)=>{
      const u=t%P, q=E.inOut(seg(u,.4,2.05))*(1-E.inOut(seg(u,3.6,4.45)));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(SKY,0,0);
      if(q>.002){
        const z=1+.07*u/P, off=-(z-1)*px/2, fj=q*(J-1), j=Math.min(J-2,Math.floor(fj)), f=fj-j;
        x.setTransform(1,0,0,1,0,0); x.globalAlpha=1; x.globalCompositeOperation='source-over'; x.clearRect(0,0,px,px);
        x.globalCompositeOperation='lighter'; x.globalAlpha=1-f; x.drawImage(masks[j],0,0,px,px); x.globalAlpha=f; x.drawImage(masks[j+1],0,0,px,px);
        x.globalAlpha=1; x.globalCompositeOperation='source-in'; x.drawImage(GAL,off,off,px*z,px*z);
        x.globalCompositeOperation='source-atop';
        x.setTransform(sc*z,0,0,sc*z,off,off);
        big.forEach((b,i)=>{ const tw=.62+.38*Math.sin(u/P*TAU*b[4]+i*1.7), s=(b[2]*6.2)*(.84+.16*tw); x.globalAlpha=tw; x.drawImage(sprites[i],b[0]-s/2,b[1]-s/2,s,s); });
        const st=seg(u,2.5,3.05);
        if(st>0&&st<1){ const hx=lerp(90,48,E.out(st)), hy=lerp(8,28,E.out(st)), dx=8+st*14, dy=-dx*(20/42); const g=x.createLinearGradient(hx,hy,hx+dx,hy+dy); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(180,210,255,0)'); x.globalAlpha=Math.sin(st*Math.PI); x.strokeStyle=g; x.lineCap='round'; x.lineWidth=.7; x.beginPath(); x.moveTo(hx,hy); x.lineTo(hx+dx,hy+dy); x.stroke(); }
        x.globalAlpha=1; x.globalCompositeOperation='source-over'; x.setTransform(1,0,0,1,0,0);
        c.drawImage(T,0,0);
      }
      c.drawImage(M,0,0);
      c.globalAlpha=1-q; c.drawImage(warm,0,0);
      c.globalAlpha=q; c.drawImage(cool,0,0);
      c.globalAlpha=1;
    };
  }},

/* ----------------------------------------------------------------- DIRECTIONAL BLUR */
{ id:'motionblur', name:'Directional Blur', section:'Blur', isNew:true, still:1.4,
  line:'The racer launches and the whole picture smears along one direction.',
  make(px){
    const P=3.6, sc=px/100, KP=6, KW=15, CS=.97, GY=84;
    const env=u=>E.inOut(seg(u,.55,1.15))*(1-E.inOut(seg(u,2.4,3.1)));
    const TN=512, cum=new Float32Array(TN+1); for(let i=0;i<TN;i++) cum[i+1]=cum[i]+env((i+.5)/TN*P);
    const prog=u=>{ const q=(u/P)*TN, i=Math.min(TN-1,Math.floor(q)); return lerp(cum[i],cum[i+1],q-i)/cum[TN]; };
    const [S,s]=canvasOf(px);
    let g=s.createLinearGradient(0,0,0,60); g.addColorStop(0,'#1a1450'); g.addColorStop(.38,'#6a2a90'); g.addColorStop(.72,'#f0527a'); g.addColorStop(1,'#ffb25e'); s.fillStyle=g; s.fillRect(0,0,100,60);
    [[8,12,34,2.6],[52,20,40,3],[24,30,30,2],[70,36,34,2.4]].forEach(([x,y,w,h])=>{ for(const o of [0,-100]){ const gg=s.createLinearGradient(x+o,0,x+o+w,0); gg.addColorStop(0,'rgba(255,160,175,0)'); gg.addColorStop(.5,'rgba(255,180,190,.6)'); gg.addColorStop(1,'rgba(255,160,175,0)'); s.fillStyle=gg; s.beginPath(); s.roundRect(x+o,y,w,h,h/2); s.fill(); } });
    [[0,9,13],[9,7,19],[16,11,9],[27,8,24],[35,10,14],[45,7,18],[52,12,10],[64,8,22],[72,9,15],[81,7,26],[88,12,12]].forEach(([x,w,h])=>{
      s.fillStyle='#2c1a62'; s.fillRect(x,58-h,w+.3,h+3);
      const cols=Math.floor((w-1.4)/1.9), rows=Math.floor((h-1.6)/2.4);
      for(let i=0;i<cols;i++) for(let j=0;j<rows;j++){ if((i*7+j*13+x)%5<2) continue; s.fillStyle='rgba(255,214,130,.85)'; s.fillRect(x+1.2+i*1.9,58-h+1.4+j*2.4,1,1.3); }
    });
    [18,68].forEach(x=>{ s.fillStyle='#160e3c'; s.fillRect(x-.55,18,1.1,42); s.beginPath(); s.roundRect(x-6.5,13,13,7,1); s.fill(); for(let i=0;i<4;i++) for(let j=0;j<2;j++){ const lx=x-4.5+i*3, ly=14.8+j*3.2; const gg=s.createRadialGradient(lx,ly,0,lx,ly,2.4); gg.addColorStop(0,'rgba(255,255,240,1)'); gg.addColorStop(.3,'rgba(255,240,190,.8)'); gg.addColorStop(1,'rgba(255,220,150,0)'); s.fillStyle=gg; s.fillRect(lx-2.4,ly-2.4,4.8,4.8); } });
    g=s.createLinearGradient(0,58,0,65.4); g.addColorStop(0,'rgba(255,255,255,.2)'); g.addColorStop(1,'rgba(0,0,0,.2)');
    for(let i=0;i<16;i++){ s.fillStyle=i%2?'#f5f1ee':'#e8334c'; s.fillRect(i*6.25,58,6.3,7.4); }
    s.fillStyle=g; s.fillRect(0,58,100,7.4);
    g=s.createLinearGradient(0,65,0,100); g.addColorStop(0,'#4a3a5e'); g.addColorStop(.3,'#2a2640'); g.addColorStop(1,'#14131e'); s.fillStyle=g; s.fillRect(0,65,100,35);
    s.fillStyle='rgba(255,255,255,.88)'; s.fillRect(0,67.4,100,.9);
    for(let i=0;i<4;i++){ s.beginPath(); s.roundRect(i*25+3,92,13,1.6,.5); s.fill(); }
    for(let i=0;i<8;i++){ s.fillStyle=i%2?'#f5f1ee':'#e8334c'; s.fillRect(i*12.5,96.6,12.6,3.4); }
    const H1=blurred(S,px,5,{h:true,wrap:true}), H2=blurred(S,px,20,{h:true,wrap:true});
    /* the racer, facing right, ground at y=0 */
    const X0=92, Y0=58, CW=152, CH=62;
    const body=(c)=>{ c.beginPath(); c.moveTo(-41,-6); c.lineTo(-42.5,-13); c.bezierCurveTo(-43,-19,-40,-23,-35,-24); c.bezierCurveTo(-30,-25,-26,-26,-23,-27.5); c.bezierCurveTo(-17,-36,-9,-40,0,-40); c.bezierCurveTo(6,-40,10,-38.5,14,-34); c.lineTo(22,-25.5); c.bezierCurveTo(30,-24.5,38,-22,42,-18.5); c.bezierCurveTo(45,-16,45.5,-11.5,44.5,-8); c.lineTo(46,-5); c.lineTo(39,-5); c.arc(26,-11.5,14.5,.465,Math.PI-.465,true); c.lineTo(-12,-5); c.arc(-25,-11.5,14.5,.465,Math.PI-.465,true); c.lineTo(-41,-5); c.closePath(); };
    const [BODY,bo]=makeC(CW*sc,CH*sc); bo.setTransform(sc,0,0,sc,0,0); bo.translate(X0,Y0); bo.scale(CS,CS);
    bo.strokeStyle='#14203f'; bo.lineWidth=1.7; bo.lineCap='round'; bo.beginPath(); bo.moveTo(-35,-24); bo.lineTo(-36.5,-34); bo.moveTo(-30,-25); bo.lineTo(-31.5,-34); bo.stroke();
    bo.fillStyle='#14203f'; bo.beginPath(); bo.roundRect(-47,-36.4,19,3.4,1.7); bo.fill();
    bo.fillStyle='#ff7a1a'; bo.beginPath(); bo.roundRect(-47,-36.4,19,1.2,.6); bo.fill();
    bo.fillStyle='#ff7a1a'; bo.beginPath(); bo.roundRect(-48,-38.6,2.4,8.4,1.1); bo.fill();
    bo.save(); bo.beginPath(); bo.rect(-60,-40,120,35); bo.clip(); bo.fillStyle='#050a1c'; [26,-25].forEach(x=>{ bo.beginPath(); bo.arc(x,-11.5,14.5,0,TAU); bo.fill(); }); bo.restore();
    let bg=bo.createLinearGradient(0,-40,0,-5); bg.addColorStop(0,'#46dcff'); bg.addColorStop(.32,'#0d94ff'); bg.addColorStop(.75,'#0a54d8'); bg.addColorStop(1,'#062f8a');
    bo.fillStyle=bg; body(bo); bo.fill();
    bo.save(); body(bo); bo.clip();
    bo.fillStyle='rgba(3,14,60,.62)'; bo.fillRect(-50,-9,100,10);
    bo.strokeStyle='rgba(255,255,255,.55)'; bo.lineWidth=1.3; bo.beginPath(); bo.moveTo(-40,-21.5); bo.bezierCurveTo(-20,-23.5,0,-25,22,-23.2); bo.bezierCurveTo(30,-22.4,38,-20.6,43,-16.6); bo.stroke();
    bo.fillStyle='#ff7a1a'; bo.beginPath(); bo.moveTo(-45,-13); bo.bezierCurveTo(-25,-13.5,-5,-12,14,-13.5); bo.bezierCurveTo(24,-14.4,36,-13.2,48,-10.5); bo.lineTo(48,-8.4); bo.bezierCurveTo(36,-10.6,24,-11.6,14,-10.8); bo.bezierCurveTo(-5,-9.4,-25,-10.8,-45,-10.4); bo.closePath(); bo.fill();
    bo.restore();
    bo.strokeStyle='rgba(3,16,60,.45)'; bo.lineWidth=.45; bo.beginPath(); bo.moveTo(-11.5,-26.5); bo.lineTo(-10.5,-9); bo.moveTo(16,-26); bo.lineTo(13.5,-9); bo.stroke();
    bo.fillStyle='#040a22'; bo.beginPath(); bo.moveTo(-14.5,-23.5); bo.lineTo(-19,-23.5); bo.lineTo(-16.6,-15.5); bo.lineTo(-13,-15.5); bo.closePath(); bo.fill();
    bo.save(); bo.beginPath(); bo.moveTo(-18.5,-26.6); bo.bezierCurveTo(-14,-34,-8,-37.5,0,-37.5); bo.bezierCurveTo(5,-37.5,9,-36.2,11.8,-33.4); bo.lineTo(18.5,-26.6); bo.closePath(); bo.clip();
    bg=bo.createLinearGradient(-18,-38,18,-26); bg.addColorStop(0,'#0a1730'); bg.addColorStop(1,'#2c5286'); bo.fillStyle=bg; bo.fillRect(-20,-40,40,16);
    bo.fillStyle='#ffffff'; bo.beginPath(); bo.arc(5,-30.4,4.5,0,TAU); bo.fill(); bo.fillStyle='#ff7a1a'; bo.beginPath(); bo.roundRect(5,-32.2,4.6,2.6,1); bo.fill();
    bo.fillStyle='rgba(255,255,255,.16)'; bo.beginPath(); bo.moveTo(-12,-40); bo.lineTo(-7,-40); bo.lineTo(-16,-24); bo.lineTo(-21,-24); bo.closePath(); bo.fill();
    bo.fillStyle='#0b6fdc'; bo.fillRect(-1.8,-40,1.8,16);
    bo.restore();
    bo.fillStyle='#ffffff'; bo.beginPath(); bo.arc(1.5,-18.6,5.2,0,TAU); bo.fill();
    bo.fillStyle='#0a1a40'; bo.font='800 8.2px system-ui, sans-serif'; bo.textAlign='center'; bo.textBaseline='middle'; bo.fillText('7',1.5,-18.3);
    bo.fillStyle='#0a54d8'; bo.beginPath(); bo.ellipse(14,-27.4,2.4,1.5,0,0,TAU); bo.fill();
    bg=bo.createRadialGradient(36,-20,0,36,-20,9); bg.addColorStop(0,'rgba(255,250,210,.9)'); bg.addColorStop(1,'rgba(255,240,180,0)'); bo.fillStyle=bg; bo.fillRect(26,-30,20,20);
    bo.fillStyle='#fffbe6'; bo.beginPath(); bo.moveTo(31,-21.8); bo.bezierCurveTo(35,-21.6,39,-20,41.6,-17.4); bo.lineTo(36.4,-17.4); bo.bezierCurveTo(34.4,-19,32.6,-20.2,31,-21.8); bo.closePath(); bo.fill();
    bo.fillStyle='#ff2b40'; bo.beginPath(); bo.roundRect(-42.6,-21.4,3.4,4.2,1.2); bo.fill();
    bo.fillStyle='#0a1430'; bo.beginPath(); bo.moveTo(31,-5); bo.lineTo(47,-5); bo.lineTo(47,-3.4); bo.lineTo(31,-3.4); bo.closePath(); bo.fill();
    function wheelOf(spin){ const WS=Math.ceil(27*sc), [C,x]=makeC(WS,WS), k=WS/27; x.setTransform(k,0,0,k,k*13.5,k*13.5);
      let g=x.createRadialGradient(0,0,6,0,0,12); g.addColorStop(0,'#3a3d4a'); g.addColorStop(1,'#0c0d13'); x.fillStyle=g; x.beginPath(); x.arc(0,0,11.5,0,TAU); x.fill();
      x.strokeStyle='rgba(255,255,255,.14)'; x.lineWidth=.5; x.beginPath(); x.arc(0,0,10.3,0,TAU); x.stroke();
      if(spin){ g=x.createRadialGradient(0,0,1,0,0,7.9); g.addColorStop(0,'#ffb800'); g.addColorStop(.26,'#6f778c'); g.addColorStop(.72,'#535b70'); g.addColorStop(1,'#b6bed0'); x.fillStyle=g; x.beginPath(); x.arc(0,0,7.9,0,TAU); x.fill(); }
      else { x.fillStyle='#10131b'; x.beginPath(); x.arc(0,0,7.9,0,TAU); x.fill(); x.strokeStyle='#eef1f8'; x.lineWidth=.9; x.beginPath(); x.arc(0,0,7.5,0,TAU); x.stroke(); x.lineCap='round'; x.lineWidth=1.9; x.beginPath(); for(let i=0;i<5;i++){ const a=i*TAU/5; x.moveTo(Math.cos(a)*1.8,Math.sin(a)*1.8); x.lineTo(Math.cos(a)*7.2,Math.sin(a)*7.2); } x.stroke(); x.fillStyle='#ffb800'; x.beginPath(); x.arc(0,0,2.4,0,TAU); x.fill(); x.fillStyle='#fff3c8'; x.beginPath(); x.arc(0,0,.9,0,TAU); x.fill(); }
      return C; }
    const W0=wheelOf(false), W1=wheelOf(true);
    /* the smear canvases are half width: the blur runs along x, so they lose nothing and cost half */
    const [CF,cf]=makeC(CW*sc,CH*sc), SW=Math.round(CF.width/2), [SA,sa]=makeC(SW,CF.height), [SB,sb]=makeC(SW,CF.height), [SC,s3]=makeC(SW,CF.height), stages=[[SA,sa],[SB,sb],[SA,sa],[SC,s3],[SA,sa],[SB,sb]];
    const reset=x=>{ x.setTransform(1,0,0,1,0,0); x.globalAlpha=1; x.globalCompositeOperation='source-over'; x.clearRect(0,0,CF.width,CF.height); };
    return (c,t)=>{
      const u=t%P, e=env(u), D=40*e, p=prog(u), pan=(p*KP*100)%100, spin=p*KW*TAU;
      const dE=(env(u+.02)-env(u-.02))/.04, pitch=clamp(-dE*.012,-.03,.03), jx=e*.3*vnoise(u*21,4), jy=e*.45*vnoise(u*26,5);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      const X=pan*sc, dr=(I,a)=>{ c.globalAlpha=a; c.drawImage(I,-X,0,px,px); c.drawImage(I,px-X,0,px,px); };
      if(e<.35){ dr(S,1); if(e>.002) dr(H1,e/.35); } else { dr(H1,1); dr(H2,(e-.35)/.65); }
      c.globalAlpha=1; c.setTransform(sc,0,0,sc,0,0);
      c.globalCompositeOperation='screen'; const sg=c.createRadialGradient(66,48,2,66,48,40); sg.addColorStop(0,'rgba(255,214,150,.95)'); sg.addColorStop(.3,'rgba(255,170,110,.5)'); sg.addColorStop(1,'rgba(255,120,90,0)'); c.fillStyle=sg; c.fillRect(0,0,100,100); c.globalCompositeOperation='source-over';
      const cx=49+7*E.out(e)+jx, gy=GY+jy;
      c.save(); c.translate(cx-D*.45,gy+.4); c.scale(1,.1); const shg=c.createRadialGradient(0,0,4,0,0,46+D*.55); shg.addColorStop(0,'rgba(6,4,18,.8)'); shg.addColorStop(.7,'rgba(6,4,18,.5)'); shg.addColorStop(1,'rgba(6,4,18,0)'); c.fillStyle=shg; c.beginPath(); c.arc(0,0,46+D*.55,0,TAU); c.fill(); c.restore();
      reset(cf); cf.translate(X0*sc,Y0*sc); cf.rotate(pitch); cf.drawImage(BODY,-X0*sc,-Y0*sc);
      const spa=clamp(e*1.4), wh=(wx)=>{ const R=13.5*sc; cf.save(); cf.translate(wx*CS*sc,-11.5*CS*sc); cf.rotate(spin); cf.scale(CS,CS); cf.drawImage(W0,-R,-R,2*R,2*R); if(spa>.01){ cf.globalAlpha=spa; cf.drawImage(W1,-R,-R,2*R,2*R); cf.globalAlpha=1; } cf.restore(); };
      wh(-25); wh(26);
      /* the smear doubles up six times, small steps first: stage four is a short smear that keeps the car solid, the last is the long trail */
      let src=CF, short=CF;
      if(D>.4){ let step=D/64; for(let k=0;k<6;k++){ const [DC,x]=stages[k]; reset(x); x.globalCompositeOperation='lighter'; x.globalAlpha=.5; x.drawImage(src,0,0,SW,CF.height); x.drawImage(src,-step*sc/2,0,SW,CF.height); src=DC; if(k===3) short=DC; step*=2; } }
      c.setTransform(1,0,0,1,0,0);
      const carX=(cx-X0)*sc, carY=(gy-Y0)*sc;
      c.drawImage(src,carX,carY,CF.width,CF.height);
      if(D>.4){ c.globalAlpha=.82; c.drawImage(short,carX,carY,CF.width,CF.height); if(D<5){ c.globalAlpha=1-D/5; c.drawImage(CF,carX,carY); } c.globalAlpha=1; }
    };
  }},

/* ----------------------------------------------------------------- LENS BLUR */
{ id:'lensblur', name:'Lens Blur', section:'Blur', isNew:true, still:.6,
  line:'Focus racks from the flower to the string lights: blurred lights open into round discs, sharp ones shrink to bulbs.',
  make(px){
    const P=4.4, sc=px/100;
    const focus=u=>E.inOut(seg(u,1.1,2.0))*(1-E.inOut(seg(u,3.2,4.1)));
    const strings=[{y:8,sag:11,r:9.2},{y:32,sag:11,r:7.6}];
    const cat=(s,x)=>s.y+s.sag*(1-Math.pow((x-50)/66,2));
    const cols=['#ffcf73','#ffcf73','#ff8fb0','#ffcf73','#8fe6ff'];
    const sizes=[1,.8,.93,.76,.98];
    const lights=[]; strings.forEach((s,k)=>{ for(let i=0;i<10;i++){ const x=-3+i*11.8+(k?5.9:0); lights.push({x,y:cat(s,x),r:s.r*sizes[(i+k*2)%5],col:i%5}); } });
    const [B0,b]=canvasOf(px);
    let g=b.createLinearGradient(0,0,0,68); g.addColorStop(0,'#101a46'); g.addColorStop(.5,'#3a2a7a'); g.addColorStop(.8,'#a44a8c'); g.addColorStop(1,'#f28d6c'); b.fillStyle=g; b.fillRect(0,0,100,70);
    for(let j=0;j<9;j++){ const y=58+j*5.4, off=j%2?4:0; for(let x=-6+off;x<108;x+=8){ const shade=j/8; b.save(); b.translate(x,y); b.rotate((((Math.round(x)+j*3)%3)-1)*.4); b.fillStyle=rgb([54,110,104],[12,38,48],shade); b.beginPath(); b.ellipse(0,0,4.8,3.2,0,0,TAU); b.fill(); b.strokeStyle='rgba(255,255,255,.08)'; b.lineWidth=.3; b.beginPath(); b.moveTo(-4,0); b.lineTo(4,0); b.stroke(); b.restore(); } }
    b.strokeStyle='#120d2c'; b.lineWidth=.55; strings.forEach(s=>{ b.beginPath(); for(let x=-4;x<=104;x+=3){ const y=cat(s,x)-1.4; x<=-3?b.moveTo(x,y):b.lineTo(x,y); } b.stroke(); });
    const BB=blurred(B0,px,6);
    function discOf(col){ const [C,x]=makeC(128,128); const g=x.createRadialGradient(64,64,0,64,64,62); g.addColorStop(0,col+'90'); g.addColorStop(.72,col+'a4'); g.addColorStop(.93,col+'cc'); g.addColorStop(.985,col+'a8'); g.addColorStop(1,col+'00'); x.fillStyle=g; x.beginPath(); x.arc(64,64,62,0,TAU); x.fill(); return C; }
    function bulbOf(col){ const [C,x]=makeC(96,96); let g=x.createRadialGradient(48,48,0,48,48,48); g.addColorStop(0,col+'ff'); g.addColorStop(.3,col+'88'); g.addColorStop(1,col+'00'); x.fillStyle=g; x.fillRect(0,0,96,96); x.fillStyle='#fffdf2'; x.beginPath(); x.arc(48,48,11,0,TAU); x.fill(); return C; }
    const dS=cols.map(discOf), bS=cols.map(bulbOf);
    function drawFlower(x,R){
      function petal(ang,rIn,len,wd,c0,c1,c2,crease){ x.save(); x.rotate(ang); const g=x.createLinearGradient(rIn,0,rIn+len,0); g.addColorStop(0,c0); g.addColorStop(.45,c1); g.addColorStop(1,c2); x.fillStyle=g; x.beginPath(); x.moveTo(rIn,0); x.bezierCurveTo(rIn+len*.25,-wd*.62,rIn+len*.78,-wd*.68,rIn+len*.97,-wd*.2); x.quadraticCurveTo(rIn+len*1.02,-wd*.05,rIn+len*.985,0); x.quadraticCurveTo(rIn+len*1.02,wd*.05,rIn+len*.97,wd*.2); x.bezierCurveTo(rIn+len*.78,wd*.68,rIn+len*.25,wd*.62,rIn,0); x.closePath(); x.fill(); x.shadowColor='rgba(0,0,0,0)'; x.strokeStyle=crease; x.lineWidth=R*.012; x.beginPath(); [-.26,0,.26].forEach(k=>{ x.moveTo(rIn+len*.12,wd*k*.3); x.quadraticCurveTo(rIn+len*.55,wd*k*.9,rIn+len*.88,wd*k*.72); }); x.stroke(); x.restore(); }
      const k=R/31, N1=14, N2=14, N3=22;
      x.shadowColor='rgba(40,0,28,.42)'; x.shadowBlur=2.6*k*sc; x.shadowOffsetX=0; x.shadowOffsetY=.4*k*sc;
      for(let i=0;i<N1;i++) petal(i*TAU/N1,3*k,28*k,14.5*k,'#a30f56','#ff3f87','#ffb4cd','rgba(120,6,60,.3)');
      for(let i=0;i<N2;i++) petal((i+.5)*TAU/N2,3*k,22.5*k,11.5*k,'#c2146a','#ff5c98','#ffd0e0','rgba(130,8,66,.26)');
      for(let i=0;i<N3;i++) petal((i+.25)*TAU/N3,4*k,10.5*k,3.9*k,'#e8751a','#ffb627','#ffe28a','rgba(150,70,0,.3)');
      x.shadowColor='rgba(0,0,0,0)'; x.shadowBlur=0; x.shadowOffsetY=0;
      let g=x.createRadialGradient(-1.2*k,-1.2*k,0,0,0,8.6*k); g.addColorStop(0,'#fff0a8'); g.addColorStop(.42,'#c98a14'); g.addColorStop(1,'#5a3006'); x.fillStyle=g; x.beginPath(); x.arc(0,0,8.2*k,0,TAU); x.fill();
      for(let n=1;n<150;n++){ const a=n*2.39996, r=.66*k*Math.sqrt(n); if(r>8*k) break; const f=r/(8*k); x.fillStyle=f>.72?'#ffe07a':(f>.4?'#c8780e':'#7a4a08'); x.beginPath(); x.arc(Math.cos(a)*r,Math.sin(a)*r,(.26+.2*f)*k,0,TAU); x.fill(); }
    }
    const [F,fx]=canvasOf(px), CXF=41, CYF=60, RF=31;
    fx.lineCap='round';
    const leaf=(x0,y0,a,l,w)=>{ fx.save(); fx.translate(x0,y0); fx.rotate(a); const gg=fx.createLinearGradient(0,-w,0,w); gg.addColorStop(0,'#49c06a'); gg.addColorStop(.5,'#2a9a55'); gg.addColorStop(1,'#14703f'); fx.fillStyle=gg; fx.beginPath(); fx.moveTo(0,0); fx.bezierCurveTo(l*.3,-w,l*.8,-w*.86,l,0); fx.bezierCurveTo(l*.8,w*.86,l*.3,w,0,0); fx.closePath(); fx.fill(); fx.strokeStyle='rgba(200,255,200,.5)'; fx.lineWidth=.45; fx.beginPath(); fx.moveTo(0,0); fx.lineTo(l*.98,0); fx.stroke(); for(let i=1;i<6;i++){ const xx=l*i/6.5; fx.lineWidth=.25; fx.beginPath(); fx.moveTo(xx,0); fx.lineTo(xx+l*.09,-w*.6*(1-i/8)); fx.moveTo(xx,0); fx.lineTo(xx+l*.09,w*.6*(1-i/8)); fx.stroke(); } fx.restore(); };
    let sg=fx.createLinearGradient(30,0,52,0); sg.addColorStop(0,'#3fae61'); sg.addColorStop(1,'#1c7a44'); fx.strokeStyle=sg; fx.lineWidth=3.2; fx.beginPath(); fx.moveTo(CXF,CYF); fx.quadraticCurveTo(46,84,47,104); fx.stroke();
    fx.lineWidth=2.1; fx.beginPath(); fx.moveTo(84,78); fx.quadraticCurveTo(76,94,64,106); fx.stroke();
    leaf(48,97,-.42,30,6.6); leaf(44,102,3.5,28,6);
    fx.save(); fx.translate(CXF,CYF); fx.rotate(-.12); fx.scale(1,.94); drawFlower(fx,RF); fx.restore();
    fx.save(); fx.translate(84,74); fx.rotate(.2); fx.scale(1,.94); drawFlower(fx,12.5); fx.restore();
    const levels=[F,blurred(F,px,1),blurred(F,px,2.4),blurred(F,px,5.2)];
    const [T,x]=makeC(px,px);
    return (c,t)=>{
      const u=t%P, f=focus(u), br=1+.035*f, ph=u/P*TAU;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      const off=-(br-1)*px/2;
      c.drawImage(BB,off,off,px*br,px*br);
      if(f>.002){ c.globalAlpha=Math.pow(f,1.5); c.drawImage(B0,off,off,px*br,px*br); c.globalAlpha=1; }
      c.setTransform(sc*br,0,0,sc*br,off,off);
      c.globalCompositeOperation='screen';
      const df=1-f, dfE=Math.pow(df,.8);
      for(const L of lights){ const rr=lerp(1.1,L.r,dfE), al=clamp(df*1.6)*(.72+.28*df); if(al>.01){ c.globalAlpha=al; c.drawImage(dS[L.col],L.x-rr,L.y-rr,2*rr,2*rr); } }
      if(f>.02){ c.globalAlpha=clamp((f-.25)/.5); for(const L of lights){ const rr=5; c.drawImage(bS[L.col],L.x-rr,L.y-rr,2*rr,2*rr); } }
      c.globalAlpha=1; c.globalCompositeOperation='source-over';
      /* four focus levels, cross-faded in pairs, so the flower softens as the lights tighten */
      const idx=f*3, i=Math.min(2,Math.floor(idx)), fr=idx-i, sway=.012*Math.sin(ph);
      x.setTransform(1,0,0,1,0,0); x.globalAlpha=1; x.globalCompositeOperation='source-over'; x.clearRect(0,0,px,px);
      x.globalCompositeOperation='lighter';
      const piv=46*sc, pivY=100*sc, cs=Math.cos(sway), sn=Math.sin(sway);
      x.setTransform(cs,sn,-sn,cs,piv-cs*piv+sn*pivY,pivY-sn*piv-cs*pivY);
      x.globalAlpha=1-fr; x.drawImage(levels[i],0,0,px,px);
      x.globalAlpha=fr; x.drawImage(levels[i+1],0,0,px,px);
      x.setTransform(1,0,0,1,0,0); x.globalAlpha=1; x.globalCompositeOperation='source-over';
      c.setTransform(1,0,0,1,0,0); c.drawImage(T,0,0);
    };
  }},

/* ----------------------------------------------------------------- TILT SHIFT */
{ id:'tiltshift', name:'Tilt Shift', section:'Blur', isNew:true, still:2.4,
  line:'Blur closes in from the top and bottom, the colour pops, and the town turns into a toy model.',
  make(px){
    const P=5, sc=px/100, CY=50;
    const [S,s]=canvasOf(px);
    let g=s.createLinearGradient(0,0,0,100); g.addColorStop(0,'#7dcc56'); g.addColorStop(1,'#4aa83b'); s.fillStyle=g; s.fillRect(0,0,100,100);
    const Wall=['#ffe2b6','#fff5e4','#ffc2ae','#bfe9e0','#ffd9c2','#d7e8ff'], Roof=['#e5532d','#cd3d3a','#19a08c','#f29a3f','#3a78c2','#c8502a'];
    const darken=(hex,k)=>{ const n=parseInt(hex.slice(1),16); return 'rgb('+Math.round((n>>16&255)*k)+','+Math.round((n>>8&255)*k)+','+Math.round((n&255)*k)+')'; };
    function house(x,y,w,h,rh,d,wall,roof,sz,i){
      const dy=d*.55, rx0=x+d/2, rx1=x+w+d/2, ry=y-h-dy/2-rh;
      s.fillStyle='rgba(20,50,20,.3)'; s.beginPath(); s.moveTo(x+w,y); s.lineTo(x+w+h*.75,y); s.lineTo(x+w+d+h*.75,y-dy); s.lineTo(x+w+d,y-dy); s.closePath(); s.fill();
      s.fillStyle=darken(wall,.72); s.beginPath(); s.moveTo(x+w,y); s.lineTo(x+w+d,y-dy); s.lineTo(x+w+d,y-dy-h); s.lineTo(x+w,y-h); s.closePath(); s.fill();
      s.fillStyle=darken(wall,.8); s.beginPath(); s.moveTo(x+w,y-h); s.lineTo(x+w+d,y-h-dy); s.lineTo(rx1,ry); s.closePath(); s.fill();
      let g=s.createLinearGradient(x,y-h,x,y); g.addColorStop(0,wall); g.addColorStop(1,darken(wall,.9)); s.fillStyle=g; s.fillRect(x,y-h,w,h);
      g=s.createLinearGradient(0,ry,0,y-h); g.addColorStop(0,darken(roof,1.08)); g.addColorStop(1,darken(roof,.86)); s.fillStyle=g; s.beginPath(); s.moveTo(x-.8*sz,y-h+.6*sz); s.lineTo(x+w+.8*sz,y-h+.6*sz); s.lineTo(rx1+.4*sz,ry); s.lineTo(rx0-.4*sz,ry); s.closePath(); s.fill();
      s.strokeStyle='rgba(255,255,255,.28)'; s.lineWidth=.3*sz; for(let k=1;k<5;k++){ const yy=lerp(y-h+.6*sz,ry,k/5), a=k/5; s.beginPath(); s.moveTo(lerp(x-.8*sz,rx0,a),yy); s.lineTo(lerp(x+w+.8*sz,rx1,a),yy); s.stroke(); }
      s.fillStyle=darken(roof,.62); const cx=rx0+(rx1-rx0)*.74; s.fillRect(cx-1.1*sz,ry-1.8*sz,2.2*sz,4*sz);
      const cols=Math.max(2,Math.floor(w/(5.6*sz))), ww=2.5*sz, hh=3*sz, gx=(w-cols*ww)/(cols+1), wy=y-h+1.8*sz;
      for(let a=0;a<cols;a++){ const wx=x+gx+a*(ww+gx); if(a===Math.floor(cols/2)) { s.fillStyle=darken(roof,.72); s.beginPath(); s.roundRect(wx,y-5.6*sz,ww,5.6*sz,[ww/2,ww/2,0,0]); s.fill(); s.fillStyle='#ffe07a'; s.beginPath(); s.arc(wx+ww*.78,y-2.8*sz,.28*sz,0,TAU); s.fill(); continue; } s.fillStyle='#fff'; s.fillRect(wx-.3*sz,wy-.3*sz,ww+.6*sz,hh+.6*sz); g=s.createLinearGradient(wx,wy,wx+ww,wy+hh); g.addColorStop(0,'#7ec9f2'); g.addColorStop(1,'#2f7db8'); s.fillStyle=g; s.fillRect(wx,wy,ww,hh); s.fillStyle='rgba(255,255,255,.75)'; s.fillRect(wx+ww/2-.1*sz,wy,.2*sz,hh); s.fillRect(wx,wy+hh/2-.1*sz,ww,.2*sz); }
      if(i%2===0){ s.fillStyle='#fff'; s.fillRect(x+w+d*.3,y-dy*.3-h*.72,d*.42,h*.3); s.fillStyle='#3b83c0'; s.fillRect(x+w+d*.36,y-dy*.34-h*.7,d*.3,h*.26); }
    }
    function tree(x,y,r){ s.fillStyle='rgba(20,50,20,.3)'; s.beginPath(); s.ellipse(x+r*.7,y+.2,r*.9,r*.3,0,0,TAU); s.fill(); s.fillStyle='#7a4e2c'; s.fillRect(x-r*.14,y-r*.9,r*.28,r*.95); let g=s.createRadialGradient(x-r*.4,y-r*1.75,r*.1,x,y-r*1.4,r*1.15); g.addColorStop(0,'#a9ec6c'); g.addColorStop(.55,'#3fa848'); g.addColorStop(1,'#1f7a3a'); s.fillStyle=g; s.beginPath(); s.arc(x,y-r*1.4,r,0,TAU); s.fill(); }
    function row(y,sz,seed){ let x=-9*sz, i=seed; while(x<104){ const k=i%Wall.length, w=(16.5+(i%3)*2.2)*sz, h=(10.5+(i%2)*3)*sz; house(x,y,w,h,7.6*sz,6*sz,Wall[k],Roof[(i*5+1)%Roof.length],sz,i); x+=w+6.6*sz; if(i%3===2){ tree(x+2.8*sz,y-.2*sz,3.4*sz); x+=8*sz; } i++; } }
    row(14,.56,3); row(30,.76,1); row(49,1,2);
    /* the road */
    s.fillStyle='#dcdbd0'; s.fillRect(0,49.4,100,1.5); s.fillRect(0,64,100,1.5);
    g=s.createLinearGradient(0,50.9,0,64); g.addColorStop(0,'#5c6370'); g.addColorStop(1,'#464c58'); s.fillStyle=g; s.fillRect(0,50.9,100,13.1);
    s.fillStyle='#fdf5d6'; for(let i=0;i<7;i++) s.fillRect(i*16+1.5,57.1,8.5,.75);
    for(let i=0;i<6;i++){ s.fillStyle='#f5f4ee'; s.fillRect(68.5+i*2.5,51.2,1.4,12.5); }
    for(let i=0;i<6;i++){ const x=7+i*18; tree(x,72.5,4.2); }
    s.fillStyle='rgba(255,255,255,.14)'; for(let i=0;i<6;i++){ s.fillRect(0,67+i*5.4,100,.5); }
    row(114,1.56,5);
    const M=blurred(S,px,.85), H=blurred(S,px,2.5);
    function sat(src){ const [C,x]=makeC(px,px); x.drawImage(src,0,0,px,px); x.globalCompositeOperation='saturation'; x.fillStyle='rgba(120,120,120,1)'; x.globalAlpha=.55; x.fillRect(0,0,px,px); return C; }
    const MUTE=sat(S);
    /* vehicles: little sprites, side on, drawn once each */
    function veh(kind,col){ const [C,x]=makeC(32*sc,18*sc); x.setTransform(sc,0,0,sc,0,0);
      x.fillStyle='rgba(10,12,20,.35)'; x.beginPath(); x.ellipse(15,14.2,kind==='bus'?13.5:9.5,1.5,0,0,TAU); x.fill();
      const wheel=wx=>{ x.fillStyle='#17181f'; x.beginPath(); x.arc(wx,13,2,0,TAU); x.fill(); x.fillStyle='#cfd5df'; x.beginPath(); x.arc(wx,13,.85,0,TAU); x.fill(); };
      if(kind==='bus'){ let g=x.createLinearGradient(0,1,0,13); g.addColorStop(0,'#ff6a55'); g.addColorStop(1,col); x.fillStyle=g; x.beginPath(); x.roundRect(2.5,2,25,11.2,2); x.fill(); x.fillStyle='rgba(255,255,255,.3)'; x.beginPath(); x.roundRect(3.3,2.4,23.4,1,.5); x.fill(); x.fillStyle='#fff'; x.fillRect(2.5,8.8,25,.8); for(let i=0;i<5;i++){ const g2=x.createLinearGradient(0,3.8,0,7.8); g2.addColorStop(0,'#c6ecff'); g2.addColorStop(1,'#3b86bd'); x.fillStyle=g2; x.beginPath(); x.roundRect(4.2+i*4.6,4,3.8,3.9,.5); x.fill(); } wheel(8); wheel(22.5); x.fillStyle='#fff3b0'; x.fillRect(26.8,10,.9,1.6); }
      else { let g=x.createLinearGradient(0,6,0,13); g.addColorStop(0,'#ffffff'); g.addColorStop(.25,col); g.addColorStop(1,col); x.fillStyle=g; x.beginPath(); x.moveTo(5.5,13); x.lineTo(5.5,9); x.quadraticCurveTo(5.5,8.1,7,8); x.lineTo(9.8,8); x.quadraticCurveTo(12,4,15,4); x.lineTo(19,4); x.quadraticCurveTo(21.2,4,22.6,8); x.lineTo(25,8.4); x.quadraticCurveTo(26.4,8.6,26.4,10); x.lineTo(26.4,13); x.closePath(); x.fill(); x.fillStyle='#d2eeff'; x.beginPath(); x.moveTo(11,8); x.quadraticCurveTo(12.6,5,15,5); x.lineTo(16.2,5); x.lineTo(16.2,8); x.closePath(); x.fill(); x.beginPath(); x.moveTo(17.2,5); x.lineTo(18.8,5); x.quadraticCurveTo(20.4,5,21.4,8); x.lineTo(17.2,8); x.closePath(); x.fill(); wheel(9.6); wheel(22); x.fillStyle='#fff3b0'; x.fillRect(25.6,9.4,.9,1.2); }
      return C; }
    const lanes=[
      {y:56.8,dir:1,items:[[veh('car','#ffc61a'),0],[veh('car','#ffffff'),68]]},
      {y:63.4,dir:-1,items:[[veh('bus','#d6252f'),0],[veh('car','#2f9de0'),58],[veh('car','#ff7ab0'),98]]}];
    const [T,x]=makeC(px,px);
    const bandMask=(hb,fe)=>{ const g=x.createLinearGradient(0,(CY+7-hb-fe)*sc,0,(CY+7+hb+fe)*sc), a=fe/(2*(hb+fe)); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(a,'rgba(0,0,0,0)'); g.addColorStop(1-a,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,1)'); return g; };
    return (c,t)=>{
      const u=t%P, a=E.inOut(seg(u,.45,1.5))*(1-E.inOut(seg(u,3.95,4.75))), hb=lerp(70,14,a);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(S,0,0);
      if(a<.999){ c.globalAlpha=(1-a)*.9; c.drawImage(MUTE,0,0); c.globalAlpha=1; }
      /* one 150-unit lap: every vehicle starts and ends fully off frame, so nothing pops in when the lap wraps */
      for(const L of lanes){ for(const it of L.items){ const q=(u/P*150+it[1])%150, X=L.dir>0?q-34:134-q; c.save(); c.setTransform(sc*L.dir,0,0,sc,X*sc,(L.y-14)*sc); c.drawImage(it[0],0,0,32,18); c.restore(); } }
      if(a>.002){
        const stage=(IMG,hbb,fe)=>{ x.setTransform(1,0,0,1,0,0); x.globalAlpha=1; x.globalCompositeOperation='source-over'; x.clearRect(0,0,px,px); x.drawImage(IMG,0,0,px,px); x.globalCompositeOperation='destination-in'; x.fillStyle=bandMask(hbb,fe); x.fillRect(0,0,px,px); x.globalCompositeOperation='source-over'; c.drawImage(T,0,0); };
        stage(M,hb,7); stage(H,hb+9,16);
      }
      c.globalAlpha=1;
    };
  }},

/* ----------------------------------------------------------------- SPIN BLUR */
{ id:'spinblur', name:'Spin Blur', section:'Blur', isNew:true, still:1.05,
  line:'The prize wheel winds up, smears round its own centre, then slows back to sharp.',
  make(px){
    const P=4.6, sc=px/100, CX=50, CY=53, R=43, NS=12, REV=7, BW=Math.max(64,Math.round(px/2)), TN=720;
    const env=u=>E.inOut(seg(u,.5,1.45))*(1-E.inOut(seg(u,2.7,4.15)));
    const cum=new Float32Array(TN+1); for(let i=0;i<TN;i++) cum[i+1]=cum[i]+env((i+.5)/TN*P);
    const prog=u=>{ const q=(u/P)*TN, i=Math.min(TN-1,Math.floor(q)); return lerp(cum[i],cum[i+1],q-i)/cum[TN]; };
    /* background */
    const [BG,bg]=canvasOf(px);
    let g=bg.createRadialGradient(50,53,20,50,53,78); g.addColorStop(0,'#3a1f68'); g.addColorStop(1,'#120a26'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    bg.save(); bg.translate(CX,CY); for(let i=0;i<16;i++){ bg.rotate(TAU/16); bg.fillStyle='rgba(255,255,255,.035)'; bg.beginPath(); bg.moveTo(0,0); bg.lineTo(90,-13); bg.lineTo(90,13); bg.closePath(); bg.fill(); } bg.restore();
    g=bg.createRadialGradient(CX,CY+2,R-5,CX,CY+2,R+8); g.addColorStop(0,'rgba(0,0,0,.55)'); g.addColorStop(1,'rgba(0,0,0,0)'); bg.fillStyle=g; bg.beginPath(); bg.arc(CX,CY+2,R+8,0,TAU); bg.fill();
    /* the wheel, in its own sprite centred at 50,50 */
    /* the segments run round the rainbow, so neighbours are close in hue and the smear stays vivid instead of averaging to grey */
    const [W,w]=canvasOf(px), A0=-Math.PI/2-Math.PI/NS, pal=[]; for(let i=0;i<NS;i++){ const h=(i*360/NS+342)%360; pal.push(['hsl('+h+',92%,55%)','hsl('+h+',96%,70%)']); }
    function star(x,cx,cy,r,rot){ x.beginPath(); for(let i=0;i<10;i++){ const a=rot+i*Math.PI/5-Math.PI/2, rr=i%2?r*.46:r, X=cx+Math.cos(a)*rr, Y=cy+Math.sin(a)*rr; i?x.lineTo(X,Y):x.moveTo(X,Y); } x.closePath(); }
    for(let i=0;i<NS;i++){ const a0=A0+i*TAU/NS, a1=a0+TAU/NS, p=pal[i]; const gg=w.createRadialGradient(50,50,6,50,50,39); gg.addColorStop(0,p[0]); gg.addColorStop(.55,p[0]); gg.addColorStop(1,p[1]); w.fillStyle=gg; w.beginPath(); w.moveTo(50,50); w.arc(50,50,R-3,a0,a1); w.closePath(); w.fill(); }
    /* a star on every second segment and a small dot between: six stars 60 degrees apart smear into separate arcs that show the turn */
    for(let i=0;i<NS;i++){ const a=A0+(i+.5)*TAU/NS; w.save(); w.fillStyle='#fff'; w.shadowColor='rgba(40,0,50,.35)'; w.shadowBlur=.8*sc; w.shadowOffsetY=.3*sc; if(i%2===0){ star(w,50+Math.cos(a)*26,50+Math.sin(a)*26,7.4,a+Math.PI/2); } else { w.beginPath(); w.arc(50+Math.cos(a)*31,50+Math.sin(a)*31,2.1,0,TAU); } w.fill(); w.restore(); }
    w.strokeStyle='rgba(255,255,255,.75)'; w.lineWidth=.55; for(let i=0;i<NS;i++){ const a=A0+i*TAU/NS; w.beginPath(); w.moveTo(50+Math.cos(a)*7,50+Math.sin(a)*7); w.lineTo(50+Math.cos(a)*(R-3),50+Math.sin(a)*(R-3)); w.stroke(); }
    g=w.createLinearGradient(10,10,90,90); g.addColorStop(0,'#fff0b0'); g.addColorStop(.35,'#e5b13a'); g.addColorStop(.7,'#fff3c0'); g.addColorStop(1,'#b47d14'); w.strokeStyle=g; w.lineWidth=6; w.beginPath(); w.arc(50,50,R-1.7,0,TAU); w.stroke();
    w.strokeStyle='rgba(90,50,0,.55)'; w.lineWidth=.5; w.beginPath(); w.arc(50,50,R-4.7,0,TAU); w.stroke(); w.beginPath(); w.arc(50,50,R+1.15,0,TAU); w.stroke();
    for(let i=0;i<NS*2;i++){ const a=A0+i*TAU/(NS*2), X=50+Math.cos(a)*(R-1.7), Y=50+Math.sin(a)*(R-1.7); const gg=w.createRadialGradient(X,Y,0,X,Y,2.7); gg.addColorStop(0,'#ffffff'); gg.addColorStop(.4,i%2?'#ffe9a0':'#ffd2e0'); gg.addColorStop(1,'rgba(255,170,60,0)'); w.fillStyle=gg; w.beginPath(); w.arc(X,Y,2.7,0,TAU); w.fill(); }
    /* the hub and pointer stay sharp on top */
    const [HUB,hb]=canvasOf(px);
    g=hb.createRadialGradient(CX-2,CY-2,0,CX,CY,8); g.addColorStop(0,'#fff6cf'); g.addColorStop(.5,'#ecb73a'); g.addColorStop(1,'#a06a10'); hb.fillStyle=g; hb.beginPath(); hb.arc(CX,CY,7.6,0,TAU); hb.fill();
    hb.strokeStyle='rgba(90,50,0,.55)'; hb.lineWidth=.45; hb.beginPath(); hb.arc(CX,CY,7.6,0,TAU); hb.stroke();
    hb.fillStyle='#fff'; star(hb,CX,CY,4.5,0); hb.fill();
    const [SA,sa]=makeC(BW), [SB,sb]=makeC(BW), hw=BW/2;
    const rot=(x,a)=>{ const c=Math.cos(a), s=Math.sin(a); x.setTransform(c,s,-s,c,hw-c*hw+s*hw,hw-s*hw-c*hw); };
    const clear=x=>{ x.setTransform(1,0,0,1,0,0); x.globalAlpha=1; x.globalCompositeOperation='source-over'; x.clearRect(0,0,BW,BW); };
    return (c,t)=>{
      const u=t%P, sp=env(u), th=prog(u)*TAU*REV, A=sp*.72;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      const k=clamp(A/.16);
      if(k<1){ c.save(); c.translate(CX*sc,CY*sc); c.rotate(th); c.translate(-50*sc,-50*sc); c.drawImage(W,0,0); c.restore(); }
      if(k>0){
        clear(sa); rot(sa,th); sa.drawImage(W,0,0,BW,BW);
        let src=SA, dst=SB, step=A;
        for(let i=0;i<6;i++){ step/=2; const x=dst===SA?sa:sb; clear(x); x.globalCompositeOperation='lighter'; x.globalAlpha=.5; x.setTransform(1,0,0,1,0,0); x.drawImage(src,0,0); rot(x,-step); x.drawImage(src,0,0); src=dst; dst=dst===SA?SB:SA; }
        sa.globalCompositeOperation='source-over'; sb.globalCompositeOperation='source-over'; sa.globalAlpha=1; sb.globalAlpha=1;
        c.globalAlpha=k; c.drawImage(src,(CX-50)*sc,(CY-50)*sc,px,px); c.globalAlpha=1;
      }
      c.setTransform(1,0,0,1,0,0); c.drawImage(HUB,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      const flick=(.5+.5*Math.sin(u*44))*.7+.15, ang=-.42*flick*clamp(sp*2);
      c.save(); c.translate(CX,CY-R-3.2); c.rotate(ang);
      c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.moveTo(-5.1,.8); c.lineTo(5.1,.8); c.lineTo(.6,14.2); c.closePath(); c.fill();
      const gg=c.createLinearGradient(-6,0,6,0); gg.addColorStop(0,'#ff8a8a'); gg.addColorStop(.5,'#ff2846'); gg.addColorStop(1,'#a80f28'); c.fillStyle=gg; c.beginPath(); c.moveTo(-5.6,0); c.quadraticCurveTo(0,-2.4,5.6,0); c.lineTo(0,13.4); c.closePath(); c.fill();
      c.strokeStyle='rgba(60,0,10,.55)'; c.lineWidth=.45; c.stroke();
      c.fillStyle='#fff3c8'; c.beginPath(); c.arc(0,.8,1.7,0,TAU); c.fill();
      c.restore();
      c.setTransform(1,0,0,1,0,0);
    };
  }},

/* ----------------------------------------------------------------- CENSOR */
{ id:'censor', name:'Censor', section:'Blur', isNew:true, still:2.2,
  line:'A mosaic box locks onto her face and keeps it hidden as she moves.',
  make(px){
    const P=4.8, sc=px/100, HX=50, HY=45;
    const [BG,bg]=canvasOf(px);
    let g=bg.createLinearGradient(0,0,0,100); g.addColorStop(0,'#ffb489'); g.addColorStop(.55,'#ff7f73'); g.addColorStop(1,'#d84a72'); bg.fillStyle=g; bg.fillRect(0,0,100,100);
    [[14,18,15,.28],[86,12,20,.2],[92,62,13,.2],[6,70,17,.16]].forEach(([x,y,r,a])=>{ const gg=bg.createRadialGradient(x,y,0,x,y,r); gg.addColorStop(0,'rgba(255,250,225,'+a+')'); gg.addColorStop(.86,'rgba(255,250,225,'+(a*.82)+')'); gg.addColorStop(1,'rgba(255,250,225,0)'); bg.fillStyle=gg; bg.beginPath(); bg.arc(x,y,r,0,TAU); bg.fill(); });
    const [BODY,bo]=canvasOf(px); bo.translate(50,45);
    /* neck, then shoulders, centred on the head position */
    bo.fillStyle='#935b39'; bo.beginPath(); bo.moveTo(-7.2,12); bo.lineTo(-7.2,27); bo.quadraticCurveTo(0,33,7.2,27); bo.lineTo(7.2,12); bo.closePath(); bo.fill();
    let bg2=bo.createLinearGradient(0,14,0,26); bg2.addColorStop(0,'rgba(50,20,12,.5)'); bg2.addColorStop(1,'rgba(50,20,12,0)'); bo.fillStyle=bg2; bo.fillRect(-7.2,14,14.4,12);
    bg2=bo.createLinearGradient(-40,27,40,60); bg2.addColorStop(0,'#2ad0c4'); bg2.addColorStop(1,'#0c8a96'); bo.fillStyle=bg2; bo.beginPath(); bo.moveTo(-7.4,25); bo.bezierCurveTo(-15,29,-31,30,-39,42); bo.lineTo(-44,58); bo.lineTo(44,58); bo.lineTo(39,42); bo.bezierCurveTo(31,30,15,29,7.4,25); bo.closePath(); bo.fill();
    bo.fillStyle='#fff7e8'; bo.beginPath(); bo.moveTo(-7,25.6); bo.quadraticCurveTo(0,28,7,25.6); bo.lineTo(2.2,57); bo.lineTo(-2.2,57); bo.closePath(); bo.fill();
    bo.fillStyle='#0a7680'; bo.beginPath(); bo.moveTo(-7.4,25); bo.lineTo(-14,31); bo.lineTo(-9,41); bo.lineTo(-2.4,57); bo.lineTo(-9,57); bo.lineTo(-19,36); bo.closePath(); bo.fill(); bo.beginPath(); bo.moveTo(7.4,25); bo.lineTo(14,31); bo.lineTo(9,41); bo.lineTo(2.4,57); bo.lineTo(9,57); bo.lineTo(19,36); bo.closePath(); bo.fill();
    bo.strokeStyle='#e8b64a'; bo.lineWidth=.55; bo.beginPath(); bo.moveTo(-6.6,27.5); bo.quadraticCurveTo(0,37,6.6,27.5); bo.stroke();
    bo.fillStyle='#ffd27a'; bo.beginPath(); bo.arc(0,33.4,1.5,0,TAU); bo.fill();
    const [HEAD,he]=canvasOf(px); he.translate(50,50);
    /* hair: a big afro built on an even ring of curls */
    const hg=he.createRadialGradient(-8,-24,4,0,-9,36); hg.addColorStop(0,'#46322f'); hg.addColorStop(1,'#1a1215'); he.fillStyle=hg;
    he.beginPath(); he.arc(0,-9,26,0,TAU); he.fill();
    /* the ring of curls stops at the jaw, so nothing shows under the chin */
    for(let i=0;i<18;i++){ const a=i*TAU/18; if(Math.sin(a)>.7) continue; he.beginPath(); he.arc(Math.cos(a)*25,-9+Math.sin(a)*25,7,0,TAU); he.fill(); }
    he.strokeStyle='rgba(255,226,206,.16)'; he.lineCap='round'; he.lineWidth=.7;
    for(let i=0;i<18;i++){ const a=i*TAU/18, cx=Math.cos(a)*25, cy=-9+Math.sin(a)*25; if(Math.sin(a)>.7) continue; he.beginPath(); he.arc(cx,cy,4.6,a-1.25,a+.55); he.stroke(); }
    for(let i=0;i<13;i++){ const a=(i+.5)*TAU/13, cx=Math.cos(a)*15, cy=-9+Math.sin(a)*15; if(Math.sin(a)>.15) continue; he.beginPath(); he.arc(cx,cy,3.6,a-1.25,a+.55); he.stroke(); }
    /* hoops, ears */
    he.strokeStyle='#ffcf5e'; he.lineWidth=1.1; [-1,1].forEach(s=>{ he.beginPath(); he.arc(s*17.2,12.4,4.8,0,TAU); he.stroke(); });
    he.fillStyle='#9b603c'; [-1,1].forEach(s=>{ he.beginPath(); he.ellipse(s*15.8,2,2.7,4.4,0,0,TAU); he.fill(); });
    he.fillStyle='rgba(60,25,12,.4)'; [-1,1].forEach(s=>{ he.beginPath(); he.ellipse(s*16.1,2,1.3,2.8,0,0,TAU); he.fill(); });
    const facePath=()=>{ he.beginPath(); he.moveTo(0,-20); he.bezierCurveTo(9,-20,15.6,-14,15.6,-4); he.bezierCurveTo(15.6,4,13.6,11,9.6,16); he.bezierCurveTo(6.6,19.6,3,21.6,0,21.6); he.bezierCurveTo(-3,21.6,-6.6,19.6,-9.6,16); he.bezierCurveTo(-13.6,11,-15.6,4,-15.6,-4); he.bezierCurveTo(-15.6,-14,-9,-20,0,-20); he.closePath(); };
    let fg=he.createRadialGradient(-4.5,-5,2,0,0,28); fg.addColorStop(0,'#cf9163'); fg.addColorStop(.62,'#ad7149'); fg.addColorStop(1,'#8a5535'); he.fillStyle=fg; facePath(); he.fill();
    he.save(); facePath(); he.clip();
    fg=he.createLinearGradient(5,0,16,0); fg.addColorStop(0,'rgba(60,24,14,0)'); fg.addColorStop(1,'rgba(60,24,14,.3)'); he.fillStyle=fg; he.fillRect(0,-22,18,46);
    [-1,1].forEach(s=>{ const gg=he.createRadialGradient(s*9.2,7.2,0,s*9.2,7.2,6.4); gg.addColorStop(0,'rgba(255,110,90,.3)'); gg.addColorStop(1,'rgba(255,110,90,0)'); he.fillStyle=gg; he.fillRect(s*9.2-7,0,14,14); });
    he.fillStyle='rgba(255,236,214,.3)'; he.beginPath(); he.ellipse(-.4,7.4,.95,1.25,0,0,TAU); he.fill();
    he.restore();
    /* fringe of curls along the hairline */
    he.fillStyle='#231719'; for(let i=0;i<9;i++){ const a=lerp(Math.PI*1.1,Math.PI*1.9,i/8), x=Math.cos(a)*14.4, y=-5.6+Math.sin(a)*13.6; he.beginPath(); he.arc(x,y,4.2,0,TAU); he.fill(); }
    he.strokeStyle='rgba(255,226,206,.14)'; he.lineWidth=.55; for(let i=0;i<9;i++){ const a=lerp(Math.PI*1.1,Math.PI*1.9,i/8), x=Math.cos(a)*14.4, y=-5.6+Math.sin(a)*13.6; he.beginPath(); he.arc(x,y,2.7,a-1.2,a+.6); he.stroke(); }
    [-1,1].forEach(s=>{
      he.save(); he.scale(s,1);
      he.fillStyle='#21151a'; he.beginPath(); he.moveTo(11.8,-5.2); he.quadraticCurveTo(7.8,-9.6,3,-8.2); he.lineTo(3.2,-6.4); he.quadraticCurveTo(7.8,-7.8,11.8,-5.2); he.closePath(); he.fill();
      he.fillStyle='#fff7ee'; he.beginPath(); he.moveTo(11,-.3); he.quadraticCurveTo(7,-4.3,2.9,-.2); he.quadraticCurveTo(7,2.3,11,-.3); he.closePath(); he.fill();
      he.save(); he.clip(); he.fillStyle='#3c2315'; he.beginPath(); he.arc(6.8,-.9,2.6,0,TAU); he.fill(); he.fillStyle='#110907'; he.beginPath(); he.arc(6.8,-.9,1.25,0,TAU); he.fill(); he.fillStyle='#fff'; he.beginPath(); he.arc(s>0?6.0:7.6,-1.8,.55,0,TAU); he.fill(); he.restore();
      he.strokeStyle='#1a1014'; he.lineWidth=1; he.lineCap='round'; he.beginPath(); he.moveTo(2.9,-.2); he.quadraticCurveTo(7,-4.4,11,-.3); he.lineTo(12.4,-1.4); he.stroke();
      he.strokeStyle='rgba(60,25,12,.55)'; he.lineWidth=.45; he.beginPath(); he.moveTo(3.5,.6); he.quadraticCurveTo(7,2.8,10.6,.5); he.stroke();
      he.restore();
    });
    he.strokeStyle='rgba(84,38,22,.75)'; he.lineWidth=.7; he.lineCap='round'; he.beginPath(); he.moveTo(-2.4,8.2); he.quadraticCurveTo(-3.3,9.8,-1.6,10.3); he.quadraticCurveTo(0,11.1,1.6,10.3); he.quadraticCurveTo(3.3,9.8,2.4,8.2); he.stroke();
    /* an open smile: corners lifted, a band of teeth between the lips */
    he.fillStyle='#fffaf2'; he.beginPath(); he.moveTo(-7,13.2); he.quadraticCurveTo(0,14.4,7,13.2); he.quadraticCurveTo(0,17.4,-7,13.2); he.closePath(); he.fill();
    he.fillStyle='#9a1a40'; he.beginPath(); he.moveTo(-7,13.2); he.quadraticCurveTo(-3.4,11.3,-1.3,11.9); he.quadraticCurveTo(0,12.5,1.3,11.9); he.quadraticCurveTo(3.4,11.3,7,13.2); he.quadraticCurveTo(0,14.5,-7,13.2); he.closePath(); he.fill();
    he.fillStyle='#c42a58'; he.beginPath(); he.moveTo(-7,13.2); he.quadraticCurveTo(0,17.3,7,13.2); he.quadraticCurveTo(0,23,-7,13.2); he.closePath(); he.fill();
    he.fillStyle='rgba(255,255,255,.36)'; he.beginPath(); he.ellipse(-.8,16.9,2.5,.7,0,0,TAU); he.fill();
    he.strokeStyle='rgba(84,38,22,.28)'; he.lineWidth=.45; [-1,1].forEach(s=>{ he.beginPath(); he.moveTo(s*7.9,12.2); he.quadraticCurveTo(s*8.5,13.2,s*7.7,14.1); he.stroke(); });
    /* soft copies, used as the source of the mosaic so the cells stay steady as she moves */
    const [SB0,sb0]=makeC(120), [SH0,sh0]=makeC(120);
    sb0.drawImage(blurred(BODY,px,2.4),0,0,120,120); sh0.drawImage(blurred(HEAD,px,2.4),0,0,120,120);
    const [MC,mc]=makeC(40,40);
    const steps=[1.8,2.2,2.8,3.6,4.5,5.4];
    return (c,t)=>{
      const u=t%P, ph=u/P*TAU, sx=11*Math.sin(ph), by=1.4*Math.sin(2*ph+.4), tilt=.1*Math.sin(ph+.5), hx=HX+sx*1.06, hy=HY+by, pivotDy=18;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(BG,0,0);
      c.setTransform(sc,0,0,sc,0,0);
      const bx=sx*.85, byy=by*.6;
      c.drawImage(BODY,bx,byy,100,100);
      c.save(); c.translate(hx,hy+pivotDy); c.rotate(tilt); c.translate(-hx,-(hy+pivotDy)); c.drawImage(HEAD,hx-50,hy-50,100,100); c.restore();
      const m=E.out(seg(u,.55,1.05))*(1-E.inOut(seg(u,3.85,4.35)));
      if(m>.02){
        const cell=steps[Math.min(steps.length-1,Math.floor(m*steps.length))], bw=44, bh=46, cx=hx+pivotDy*Math.sin(tilt), cy=hy+pivotDy-pivotDy*Math.cos(tilt)+.5, x0=cx-bw/2, y0=cy-bh/2, cols=Math.min(40,Math.round(bw/cell)), rows=Math.min(40,Math.round(bh/cell)), kx=cols/bw, ky=rows/bh;
        mc.setTransform(1,0,0,1,0,0); mc.globalAlpha=1; mc.globalCompositeOperation='source-over'; mc.imageSmoothingEnabled=true;
        mc.drawImage(BG,0,0,px,px,-x0*kx,-y0*ky,100*kx,100*ky);
        mc.setTransform(kx,0,0,ky,-x0*kx,-y0*ky);
        mc.drawImage(SB0,bx,byy,100,100);
        mc.translate(hx,hy+pivotDy); mc.rotate(tilt); mc.translate(-hx,-(hy+pivotDy)); mc.drawImage(SH0,hx-50,hy-50,100,100);
        mc.setTransform(1,0,0,1,0,0);
        c.imageSmoothingEnabled=false; c.drawImage(MC,0,0,cols,rows,x0,y0,bw,bh); c.imageSmoothingEnabled=true;
        const ga=m, L=7, ex=1.8;
        c.globalAlpha=ga; c.strokeStyle='rgba(30,10,30,.35)'; c.lineWidth=1.6; c.lineCap='round'; c.lineJoin='round';
        const brk=(st)=>{ c.strokeStyle=st; c.beginPath(); [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sxx,syy])=>{ const X=cx+sxx*(bw/2+ex), Y=cy+syy*(bh/2+ex); c.moveTo(X-sxx*L,Y); c.lineTo(X,Y); c.lineTo(X,Y-syy*L); }); c.stroke(); };
        c.save(); c.translate(.25,.35); brk('rgba(30,10,30,.35)'); c.restore();
        c.lineWidth=1.25; brk('#ffffff'); c.globalAlpha=1;
      }
      c.setTransform(1,0,0,1,0,0);
    };
  }}
);
})();
