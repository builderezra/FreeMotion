/* FreeMotion effect pictures, artist 12 (c12): seven Stylize tiles, no photographs. Every subject is made here, and every change
   is the effect's own arithmetic (js/compositor.js) at an ordinary setting. Each tile's note says which settings and why. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
const canvasN=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; };
const diamond=(c,x,y,r,fill)=>{ c.fillStyle=fill; c.beginPath(); c.moveTo(x,y-r); c.lineTo(x+r,y); c.lineTo(x,y+r); c.lineTo(x-r,y); c.closePath(); c.fill(); };
/* a smooth closed (or open) curve through points: Catmull-Rom as cubic Beziers */
const spline=(c,p,closed)=>{ const n=p.length, at=i=>closed?p[(i+n)%n]:p[Math.max(0,Math.min(n-1,i))];
  c.moveTo(p[0][0],p[0][1]);
  for(let i=0;i<(closed?n:n-1);i++){ const a=at(i-1), b=at(i), d=at(i+1), e=at(i+2);
    c.bezierCurveTo(b[0]+(d[0]-a[0])/6,b[1]+(d[1]-a[1])/6,d[0]-(e[0]-b[0])/6,d[1]-(e[1]-b[1])/6,d[0],d[1]); }
  if(closed) c.closePath(); };

window.FX_TILES.push(

/* DATAMOSH BLOOM. CANVAS_FX.moshbloom run frame by frame at 30 fps on two shots made here (a 1080 x 830 frame, held as 5 px cells):
   Amount .7 and Colour bleed .5 (defaults), Start at on the cut, Block size 50 and Heal .05 (16 px blocks are finer than the menu
   can show; Heal .05 keeps the bloom on screen long enough to read). Shot 2 is a push-in on a building at night. Its motion field is
   made the way _mfField makes one: 160 flow px across in 8 px blocks, whole-flow-px vectors, then the 3 x 3 pass (direction from
   the average, size from the largest). On the cut frame itself the field is the real block search run between the last frame of
   shot 1 and the first of shot 2 (shots that share nothing, so blocks jump); after it, each block's vector is the push-in's true
   motion rounded to whole flow px, which is what the search finds on that texture. Every 50 px block of the frozen picture moves whole
   by its vector (dmbVec's bilinear read, the edge repeating), heals toward shot 2 (brightness 2.5 % a frame, colour 1.25 %), and
   70 % of that is shown over 30 % of the live clip. */
{ id:'moshbloom', name:'Datamosh Bloom', section:'Stylize', isNew:true, still:1.3,
  line:'At the cut the old shot stops refreshing; the new shot\'s movement drags it about in blocks until it heals into the new shot.',
  make(px){
    const P=3.8, CUT=.9, FPS=30, NF=84, GW=216, GH=166, N=GW*GH, BS=10, AMT=.7, KL=.025, KC=.0125;
    const AR=GW/GH, FXc=GW*.645, FYc=GH*.4;
    const zoom=tau=>1+1.5*(1-Math.exp(-tau/.65));
    /* shot 1: a brick wall in hard sun with a deep window. Coordinates: x 0..AR, y 0..1 */
    const BR=[[214,66,30],[196,58,27],[226,80,38]], MO=[206,196,178], BN=[231,226,213], IK=[22,19,15], SHF=.62;
    const shot1=(x,y)=>{
      const inRect=(x0,y0,x1,y1)=>x>=x0&&x<x1&&y>=y0&&y<y1;
      let col;
      if(inRect(.66,.17,1.02,.6)){ if(inRect(.685,.195,.995,.6)) return x<.73||y<.24?[48,38,30]:IK; col=BN; }
      else if(inRect(.64,.6,1.04,.65)) col=BN;
      else { const ys=y+.03, row=Math.floor(ys/.0625), yy=ys-row*.0625, xs=x+.05+(row&1)*.06, k=Math.floor(xs/.12), xx=xs-k*.12;
        col=(yy<.009||xx<.009)?MO:BR[Math.floor(hash(k*13+row*5,9)*3)]; }
      if(y<(x-.95)*1.1+.02||(x>1.04&&y>.65&&y<.72)) return [col[0]*SHF,col[1]*SHF,col[2]*SHF];
      return col;
    };
    const A=new Float32Array(N*3);
    for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){ let r=0,g=0,b=0; for(let s=0;s<4;s++){ const q=shot1((x+.25+.5*(s&1))/GH,(y+.25+.5*(s>>1))/GH); r+=q[0]; g+=q[1]; b+=q[2]; } const i=(y*GW+x)*3; A[i]=r/4; A[i+1]=g/4; A[i+2]=b/4; }
    /* shot 2: a building at night, the camera pushing in toward the spot where shot 1's window was. Window coverage is integrated
       exactly per cell. */
    const TX=.118, WX=.07, OX=.02, TY=.15, WY=.085, OY=.03;
    const F=(v,T,w,o)=>{ const z=v-o, k=Math.floor(z/T), r=z-k*T; return k*w+(r<w?r:w); };
    const WALL=[22,25,32], WIN=[[36,41,52],[236,180,92],[196,208,222]], LIT=new Uint8Array(64*64);
    for(let i=0;i<64;i++) for(let j=0;j<64;j++){ const h=hash(i*31+j*7,3); LIT[i*64+j]=h<.6?0:h<.88?1:2; }
    const cxs=new Float32Array(GW), ixs=new Int32Array(GW);
    const shot2=(s,out)=>{
      const cw=1/GH/s, fx=FXc/GH, fy=FYc/GH;
      for(let x=0;x<GW;x++){ const x0=fx+(x/GH-fx)/s, x1=x0+cw; cxs[x]=(F(x1,TX,WX,OX)-F(x0,TX,WX,OX))/cw; ixs[x]=(Math.floor((x0+cw/2-OX)/TX)+640)&63; }
      for(let y=0;y<GH;y++){ const y0=fy+(y/GH-fy)/s, y1=y0+cw, cy=(F(y1,TY,WY,OY)-F(y0,TY,WY,OY))/cw, j=(Math.floor((y0+cw/2-OY)/TY)+640)&63;
        for(let x=0,o=y*GW*3;x<GW;x++,o+=3){ const k=cxs[x]*cy; if(k<=0){ out[o]=WALL[0]; out[o+1]=WALL[1]; out[o+2]=WALL[2]; continue; } const w=WIN[LIT[ixs[x]*64+j]];
          out[o]=WALL[0]+(w[0]-WALL[0])*k; out[o+1]=WALL[1]+(w[1]-WALL[1])*k; out[o+2]=WALL[2]+(w[2]-WALL[2])*k; } }
    };
    /* the motion field, laid out as _mfField lays it out */
    const FW=160, FH=Math.round(GH*FW/GW), FB=8, gw=Math.floor(FW/FB), gh=Math.floor(FH/FB), CPF=GW/FW, NG=gw*gh;
    const rvx=new Float32Array(NG), rvy=new Float32Array(NG), vx=new Float32Array(NG), vy=new Float32Array(NG);
    const smooth=()=>{ for(let by=0;by<gh;by++) for(let bx=0;bx<gw;bx++){ let ax=0, ay=0, mm=0;
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const nx=bx+dx, ny=by+dy; if(nx<0||ny<0||nx>=gw||ny>=gh) continue; const j=ny*gw+nx, m=Math.hypot(rvx[j],rvy[j]); ax+=rvx[j]; ay+=rvy[j]; if(m>mm) mm=m; }
        const i=by*gw+bx, al=Math.hypot(ax,ay); vx[i]=0; vy[i]=0; if(al>1e-3&&mm>.3){ vx[i]=ax/al*mm; vy[i]=ay/al*mm; } } };
    const gray=a=>{ const g=new Float32Array(FW*FH); for(let y=0;y<FH;y++){ const cy=Math.min(GH-1,Math.floor((y+.5)*CPF)); for(let x=0;x<FW;x++){ const i=(cy*GW+Math.min(GW-1,Math.floor((x+.5)*CPF)))*3; g[y*FW+x]=.299*a[i]+.587*a[i+1]+.114*a[i+2]; } } return g; };
    const matchField=(gp,gc)=>{   /* _mfField's block search, as written there */
      const sad=(ox,oy,qx,qy)=>{ let s=0; for(let y=0;y<FB;y++){ const cy=oy+y, py=qy+y; if(py<0||py>=FH){ s+=FB*40; continue; } const cR=cy*FW, pR=py*FW; for(let x=0;x<FB;x++){ const qx2=qx+x; s+=(qx2<0||qx2>=FW)?40:Math.abs(gc[cR+ox+x]-gp[pR+qx2]); } } return s; };
      const thr=.03*255*FB*FB; rvx.fill(0); rvy.fill(0);
      for(let by=0;by<gh;by++) for(let bx=0;bx<gw;bx++){ const i=by*gw+bx, ox=bx*FB, oy=by*FB, d0=sad(ox,oy,ox,oy); if(d0<=thr) continue;
        let mean=0, dev=0; for(let y=0;y<FB;y++) for(let x=0;x<FB;x++) mean+=gc[(oy+y)*FW+ox+x]; mean/=FB*FB; for(let y=0;y<FB;y++) for(let x=0;x<FB;x++) dev+=Math.abs(gc[(oy+y)*FW+ox+x]-mean); if(dev/(FB*FB)<5) continue;
        let best=d0, bdx=0, bdy=0; for(let dy=-24;dy<=24;dy+=3) for(let dx=-24;dx<=24;dx+=3){ if(!dx&&!dy) continue; const s=sad(ox,oy,ox+dx,oy+dy); if(s<best){ best=s; bdx=dx; bdy=dy; } }
        const cbx=bdx, cby=bdy; for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){ if(!dx&&!dy) continue; const s=sad(ox,oy,ox+cbx+dx,oy+cby+dy); if(s<best){ best=s; bdx=cbx+dx; bdy=cby+dy; } }
        if(best<d0*.75){ rvx[i]=-bdx; rvy[i]=-bdy; } }
      smooth(); };
    const zoomField=k=>{ for(let by=0;by<gh;by++) for(let bx=0;bx<gw;bx++){ const i=by*gw+bx, cx=(bx+.5)*FB*CPF, cy=(by+.5)*FB*CPF; rvx[i]=Math.round((cx-FXc)*k/CPF); rvy[i]=Math.round((cy-FYc)*k/CPF); } smooth(); };
    const vecAt=(X,Y,out)=>{ let fx=X/(CPF*FB)-.5, fy=Y/(CPF*FB)-.5; fx=fx<0?0:fx>gw-1?gw-1:fx; fy=fy<0?0:fy>gh-1?gh-1:fy;
      const x0=fx|0, y0=fy|0, x1=x0+1<gw?x0+1:x0, y1=y0+1<gh?y0+1:y0, ax=fx-x0, ay=fy-y0, r0=y0*gw, r1=y1*gw;
      out[0]=Math.round(((vx[r0+x0]*(1-ax)+vx[r0+x1]*ax)*(1-ay)+(vx[r1+x0]*(1-ax)+vx[r1+x1]*ax)*ay)*CPF);
      out[1]=Math.round(((vy[r0+x0]*(1-ax)+vy[r0+x1]*ax)*(1-ay)+(vy[r1+x0]*(1-ax)+vy[r1+x1]*ax)*ay)*CPF); };
    const shown=(m,b)=>{ const [C,x]=canvasN(GW,GH), im=x.createImageData(GW,GH), o=im.data; for(let i=0,j=0;i<N*3;i+=3,j+=4){ o[j]=b[i]*(1-AMT)+m[i]*AMT; o[j+1]=b[i+1]*(1-AMT)+m[i+1]*AMT; o[j+2]=b[i+2]*(1-AMT)+m[i+2]*AMT; o[j+3]=255; } x.putImageData(im,0,0); return C; };
    const plain=a=>{ const [C,x]=canvasN(GW,GH), im=x.createImageData(GW,GH), o=im.data; for(let i=0,j=0;i<N*3;i+=3,j+=4){ o[j]=a[i]; o[j+1]=a[i+1]; o[j+2]=a[i+2]; o[j+3]=255; } x.putImageData(im,0,0); return C; };
    const SHOT1=plain(A);
    let h=new Float32Array(A), n=new Float32Array(N*3); const B=new Float32Array(N*3), FR=[], v=[0,0];
    for(let f=1;f<=NF;f++){
      const tau=(f-1)/FPS; shot2(zoom(tau),B);
      if(f===1) matchField(gray(A),gray(B)); else zoomField(zoom(tau)/zoom(tau-1/FPS)-1);
      for(let by=0;by<GH;by+=BS){ const ye=Math.min(GH,by+BS);
        for(let bx=0;bx<GW;bx+=BS){ const xe=Math.min(GW,bx+BS); vecAt((bx+xe)/2,(by+ye)/2,v); const dx=v[0], dy=v[1];
          for(let y=by;y<ye;y++){ let sy=y-dy; sy=sy<0?0:sy>=GH?GH-1:sy; const sr=sy*GW, dr=y*GW;
            if(bx-dx>=0&&xe-dx<=GW){ n.set(h.subarray((sr+bx-dx)*3,(sr+xe-dx)*3),(dr+bx)*3); continue; }   /* the whole run is inside the frame: one copy */
            for(let x=bx;x<xe;x++){ let sx=x-dx; sx=sx<0?0:sx>=GW?GW-1:sx; const si=(sr+sx)*3, di=(dr+x)*3; n[di]=h[si]; n[di+1]=h[si+1]; n[di+2]=h[si+2]; } } } }
      for(let i=0;i<N*3;i+=3){ const y0=.299*n[i]+.587*n[i+1]+.114*n[i+2], y1=.299*B[i]+.587*B[i+1]+.114*B[i+2], yn=y0+(y1-y0)*KL;
        n[i]=(n[i]-y0)+((B[i]-y1)-(n[i]-y0))*KC+yn; n[i+1]=(n[i+1]-y0)+((B[i+1]-y1)-(n[i+1]-y0))*KC+yn; n[i+2]=(n[i+2]-y0)+((B[i+2]-y1)-(n[i+2]-y0))*KC+yn; }
      if(f%2===1) FR.push(shown(n,B));
      const sw=h; h=n; n=sw;
    }
    const PH=100/AR, X0=4, X1=96, xc=X0+(X1-X0)*CUT/P;
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=INK; c.fillRect(0,0,100,100);
      const f=Math.floor((u-CUT)*FPS/2);
      c.imageSmoothingEnabled=false; c.drawImage(u<CUT?SHOT1:FR[Math.min(FR.length-1,f)],0,0,100,PH); c.imageSmoothingEnabled=true;
      /* the timeline under the viewer: shot 1, the cut with Start at on it, shot 2, and the playhead */
      const ty=PH+6.2, th=6.4;
      c.fillStyle='#8f2f15'; c.fillRect(X0,ty,xc-X0-.4,th);
      c.fillStyle='#232836'; c.fillRect(xc+.4,ty,X1-xc-.4,th);
      c.fillStyle='#b58a4c'; for(let i=0;i<9;i++){ c.fillRect(xc+3.2+i*6.3,ty+1.6,2.4,1.2); c.fillRect(xc+3.2+i*6.3,ty+3.8,2.4,1.2); }
      diamond(c,xc,ty-2.2,1.9,YEL);
      const hx=X0+(X1-X0)*u/P;
      c.fillStyle=BONE; c.fillRect(hx-.35,PH+2.4,.7,th+6.4);
      c.font=MONO(4.2); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText('BLOCK 50',X0,98);
    };
  } },

/* NIGHT VISION. PIXEL_FX.nightvision on a field edge at night drawn here (a 1080 frame): Amount .85, Scope Green, Sensor grain 60,
   Viewer None, Intensifier 2.5 (1.3 is the default; on a picture this dark it gives a dim olive, so the tile uses a stronger, still
   ordinary setting below the 3x top). L = luma x 2.5 + 30 + grain, every third project row x .7, tinted (.2, 1, .2), mixed 85 %.
   At this size the rows and the grain are drawn as the export looks shrunk to it (the kernel's own reduced-plate rule): the rows
   average to x .9 and the grain to a faint shimmer. A bone hairline wipes between the plain shot and the effect. */
{ id:'nightvision', name:'Night Vision', section:'Stylize', isNew:true, still:2.6,
  line:'A dark shot is lifted and turned green with fine sensor grain, so you can see into the night.',
  make(px){
    const P=4.6, N=Math.min(300,px), [S,sx]=canvasN(N);
    sx.setTransform(N/100,0,0,N/100,0,0);
    const R=rng(41);
    /* a field edge at night: sky, a far tree line, a fence with a gate, a track, a car on the track, a near tree */
    let g=sx.createLinearGradient(0,0,0,50); g.addColorStop(0,'#0e121a'); g.addColorStop(1,'#2a2f3c'); sx.fillStyle=g; sx.fillRect(0,0,100,52);
    sx.fillStyle='#121419'; sx.beginPath(); sx.moveTo(0,54); for(let i=0;i<=50;i++){ const x=i*2; sx.lineTo(x,45.5-3.5*R()-(i%5===2?4.5*R():0)-(x>60&&x<80?3:0)); } sx.lineTo(100,54); sx.closePath(); sx.fill();
    g=sx.createLinearGradient(0,48,0,100); g.addColorStop(0,'#1e1f1c'); g.addColorStop(1,'#2e2f28'); sx.fillStyle=g; sx.fillRect(0,48,100,52);
    /* the track, lighter dirt, from the gate to the near edge */
    sx.fillStyle='#45433a'; sx.beginPath(); sx.moveTo(55,55.5); sx.lineTo(61,55.5); sx.bezierCurveTo(66,66,80,78,96,100); sx.lineTo(44,100); sx.bezierCurveTo(52,80,52,66,55,55.5); sx.closePath(); sx.fill();
    /* fence: rails and posts, moonlit on their left */
    sx.fillStyle='#302f2a'; sx.fillRect(14,50.2,40,.7); sx.fillRect(14,53.4,40,.7); sx.fillRect(62,50.2,38,.7); sx.fillRect(62,53.4,38,.7);
    for(let x=14;x<100;x+=6.2){ if(x>53&&x<62) continue; sx.fillStyle='#24231f'; sx.fillRect(x,48.4,1,8.4); sx.fillStyle='#45433b'; sx.fillRect(x,48.4,.4,8.4); }
    sx.fillStyle='#4a473e'; sx.fillRect(53.6,47.6,1.3,9.4); sx.fillRect(61.2,47.6,1.3,9.4);
    /* a four-wheel drive stopped on the track, nose to us, dipped headlights on (checker k2: this was a lone figure on the path,
       the same picture as Letterbox's figure at the end of its jetty) */
    const CX=60.5, GY=79, fq=(pts,col)=>{ sx.fillStyle=col; sx.beginPath(); pts.forEach((p,i)=>i?sx.lineTo(p[0],p[1]):sx.moveTo(p[0],p[1])); sx.closePath(); sx.fill(); };
    fq([[CX-6.2,GY-5],[CX+6.2,GY-5],[CX+19,101],[CX-19,101]],'rgba(120,112,92,.28)');
    fq([[CX-4.5,GY-4.6],[CX+4.5,GY-4.6],[CX+10,101],[CX-10,101]],'rgba(150,140,112,.22)');
    sx.fillStyle='#0f0f0e'; sx.fillRect(CX-9.4,GY-3.4,3.4,3.6); sx.fillRect(CX+6,GY-3.4,3.4,3.6);
    fq([[CX-9.8,GY-9.4],[CX+9.8,GY-9.4],[CX+10,GY-2],[CX-10,GY-2]],'#2a2925');
    fq([[CX-8.2,GY-9.4],[CX+8.2,GY-9.4],[CX+6.6,GY-16.2],[CX-6.6,GY-16.2]],'#1a1a18');
    fq([[CX-7,GY-10.2],[CX+7,GY-10.2],[CX+5.8,GY-15],[CX-5.8,GY-15]],'#3a4048');
    sx.fillStyle='#121210'; sx.fillRect(CX-3.8,GY-7.6,7.6,2.4); sx.fillRect(CX-10,GY-3.2,20,1.2);
    sx.fillStyle='#fff3d0'; for(const s of [-1,1]){ sx.beginPath(); sx.ellipse(CX+s*6.7,GY-6.4,1.9,1.05,0,0,TAU); sx.fill(); }
    /* grass along the near edge */
    sx.strokeStyle='#121310'; sx.lineWidth=.5; sx.beginPath(); for(let i=0;i<90;i++){ const x=R()*100, y=86+R()*16, h=2+R()*4; sx.moveTo(x,y); sx.lineTo(x+(R()-.5)*2,y-h); } sx.stroke();
    /* the near tree, cropped by the left edge, and its branches over the top */
    sx.fillStyle='#0b0b0a'; sx.beginPath(); sx.moveTo(-1,-1); sx.lineTo(13,-1); sx.bezierCurveTo(12,30,11,60,15,101); sx.lineTo(-1,101); sx.closePath(); sx.fill();
    sx.fillStyle='#2e2c27'; sx.beginPath(); sx.moveTo(13,-1); sx.lineTo(13.9,-1); sx.bezierCurveTo(12.9,30,12,60,16,101); sx.lineTo(15,101); sx.bezierCurveTo(11,60,12,30,13,-1); sx.closePath(); sx.fill();
    sx.strokeStyle='#0b0b0a'; sx.lineCap='round'; [[12,14,40,4,1.6],[12,26,30,17,1.1],[30,10,52,-1,.8],[38,6,47,12,.5]].forEach(b=>{ sx.lineWidth=b[4]; sx.beginPath(); sx.moveTo(b[0],b[1]); sx.quadraticCurveTo((b[0]+b[2])/2,b[1]-3,b[2],b[3]); sx.stroke(); });
    /* a second tree, mid-distance on the right */
    sx.fillStyle='#14140f'; sx.beginPath(); sx.moveTo(84,20); sx.lineTo(86.6,20); sx.lineTo(87.4,58); sx.lineTo(83.2,58); sx.closePath(); sx.fill();
    sx.fillStyle='#34322b'; sx.beginPath(); sx.moveTo(84,20); sx.lineTo(84.7,20); sx.lineTo(84.4,58); sx.lineTo(83.2,58); sx.closePath(); sx.fill();
    sx.fillStyle='#101210'; sx.beginPath(); sx.ellipse(85,18,13,10,0,0,TAU); sx.fill(); sx.beginPath(); sx.ellipse(78,24,8,6,0,0,TAU); sx.fill(); sx.beginPath(); sx.ellipse(92,26,8,7,0,0,TAU); sx.fill();
    sx.setTransform(1,0,0,1,0,0);
    const src=sx.getImageData(0,0,N,N).data;
    const AMT=.85, GAIN=2.5, NOI=60, k=1080/N, amp=NOI/k, VAR=6, NV=[];
    for(let v=0;v<VAR;v++){ const [C,x]=canvasN(N), im=x.createImageData(N,N), o=im.data, rr=rng(900+v);
      for(let i=0;i<o.length;i+=4){ let L=(.299*src[i]+.587*src[i+1]+.114*src[i+2])*GAIN+30+(rr()-.5)*amp;
        const Lc=clamp(L,0,255), Ld=clamp(L*.7,0,255); L=Lc+(Ld-Lc)/3;
        o[i]=src[i]+(L*.2-src[i])*AMT; o[i+1]=src[i+1]+(L-src[i+1])*AMT; o[i+2]=src[i+2]+(L*.2-src[i+2])*AMT; o[i+3]=255; }
      x.putImageData(im,0,0); NV.push(C); }
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const sp=u<.6?0:u<1.55?E.inOut(seg(u,.6,1.55)):u<3.6?1:u<4.4?1-E.inOut(seg(u,3.6,4.4)):0;
      c.drawImage(S,0,0,100,100);
      if(sp>0){ const X=sp*100, F=NV[Math.floor(u*15)%VAR]; c.drawImage(F,0,0,Math.max(1,sp*N),N,0,0,X,100);
        if(sp<1){ c.fillStyle=BONE; c.fillRect(X-.3,0,.6,100); } }
    };
  } },

/* SQUIRCLE CORNERS. CANVAS_FX.roundcorners in the layer's own space, on a 1080 x 824 layer of nested rectangles drawn here.
   Continuous curve (the default) is the superellipse with exponent 5 across the whole layer; then the curve is turned off and
   Corner shape is stepped through Cut and Scoop at Radius 160. The hairline and the anchors are the layer's box in the viewer. */
{ id:'roundcorners', name:'Squircle Corners', section:'Stylize', isNew:true, still:1.6,
  line:'The layer\'s square corners become one smooth squircle; turn the curve off and the corners can be cut or scooped instead.',
  make(px){
    const P=4.8, X=12, Y=13, W=76, H=58, CX=X+W/2, CY=Y+H/2, RR=160*W/1080, U=W/20;
    const sq=c=>{ const n=200; for(let i=0;i<=n;i++){ const a=i/n*TAU, co=Math.cos(a), si=Math.sin(a), x=CX+W/2*Math.sign(co)*Math.pow(Math.abs(co),.4), y=CY+H/2*Math.sign(si)*Math.pow(Math.abs(si),.4); i?c.lineTo(x,y):c.moveTo(x,y); } c.closePath(); };
    const cut=(c,shape)=>{ const x1=X+W, y1=Y+H, r=RR, Pi=Math.PI; c.moveTo(X+r,Y); c.lineTo(x1-r,Y);
      if(shape===1) c.lineTo(x1,Y+r); else c.arc(x1,Y,r,Pi,Pi/2,true);
      c.lineTo(x1,y1-r); if(shape===1) c.lineTo(x1-r,y1); else c.arc(x1,y1,r,1.5*Pi,Pi,true);
      c.lineTo(X+r,y1); if(shape===1) c.lineTo(X,y1-r); else c.arc(X,y1,r,0,-Pi/2,true);
      c.lineTo(X,Y+r); if(shape===1) c.lineTo(X+r,Y); else c.arc(X,Y,r,Pi/2,0,true); c.closePath(); };
    const art=c=>{ c.fillStyle=BONE; c.fillRect(X,Y,W,H); c.fillStyle='#9aaab8'; c.fillRect(X+2.2*U,Y+3.4*U,W-4.4*U,H-4.6*U); c.fillStyle='#3d5266'; c.fillRect(X+4.4*U,Y+6.8*U,W-8.8*U,H-9.2*U); };
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const st=u<.6?0:u<2.5?1:u<3.4?2:u<4.3?3:0;
      c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.save(); c.beginPath(); if(st===0) c.rect(X,Y,W,H); else if(st===1) sq(c); else cut(c,st===2?1:2); c.clip(); art(c); c.restore();
      c.strokeStyle=DIM; c.lineWidth=.45; c.strokeRect(X,Y,W,H);
      c.fillStyle=TEAL; for(const [x,y] of [[X,Y],[X+W,Y],[X,Y+H],[X+W,Y+H]]) c.fillRect(x-1.3,y-1.3,2.6,2.6);
      tab(c,X,84,['OFF','CURVE ON','CUT 160','SCOOP 160'][st],5,'#232b3b',TEXT);
    };
  } },

/* SCANLINES. PIXEL_FX.scanlines on a 1080 frame, drawn here in cut paper: a satellite dish on its mount against a vermilion sky.
   Amount .6, Pitch 36, Line weight 14, Roll 12 px/s: every row whose phase is past Pitch - Weight is multiplied by .4, so the lines
   are grey on bone, brown on vermilion and all but gone on the ink ground. Roll crawls them down the frame.
   (Checker k2: this was a profile head, which Mirror and Soften Skin already show; Pitch 36 on a 720 frame is now on a 1080 one.) */
{ id:'scanlines', name:'Scanlines', section:'Stylize', isNew:true, still:2.2,
  line:'Thin dark lines darken every few rows of the picture, like a monitor, and can crawl slowly down it.',
  make(px){
    const P=4.4, U=100/1080, SP=36*U, TH=14*U, LO=SP-TH, ROLL=12*U, AMT=.6;
    const [S,sx]=canvasN(px); sx.setTransform(px/100,0,0,px/100,0,0);
    sx.fillStyle=VERM; sx.fillRect(0,0,100,100);
    sx.fillStyle=INK; sx.fillRect(0,79,100,21);
    /* the mount: a pedestal, a yoke and the elevation arm, in ink */
    const fp=(pts,col)=>{ sx.fillStyle=col; sx.beginPath(); pts.forEach((p,i)=>i?sx.lineTo(p[0],p[1]):sx.moveTo(p[0],p[1])); sx.closePath(); sx.fill(); };
    fp([[47.5,58],[56.5,58],[60.5,80],[43.5,80]],INK);
    fp([[41,79],[63,79],[63,81],[41,81]],INK);
    fp([[44.5,52],[59.5,52],[57.5,60],[46.5,60]],INK);
    /* the dish, tilted up and to the right: its rim in Bone, the bowl in shadow on the near side, the feed on three struts */
    sx.save(); sx.translate(45,43); sx.rotate(36*TAU/360);
    sx.fillStyle=BONE; sx.beginPath(); sx.ellipse(0,0,33,13.5,0,0,TAU); sx.fill();
    sx.fillStyle='#c4bba8'; sx.beginPath(); sx.ellipse(0,1.6,29.5,10.4,0,Math.PI*1.04,Math.PI*1.96,false); sx.ellipse(0,-1.2,29.5,7.6,0,Math.PI*1.96,Math.PI*1.04,true); sx.closePath(); sx.fill();
    sx.fillStyle=INK; sx.beginPath(); sx.ellipse(0,0,2.2,1.4,0,0,TAU); sx.fill();
    sx.strokeStyle=INK; sx.lineWidth=1; sx.lineCap='butt';
    const F=[2,-24]; for(const q of [[-27,4.5],[27,4.5],[0,-12.6]]){ sx.beginPath(); sx.moveTo(q[0],q[1]); sx.lineTo(F[0],F[1]); sx.stroke(); }
    fp([[F[0]-2.4,F[1]-3],[F[0]+2.4,F[1]-3],[F[0]+1.6,F[1]+2],[F[0]-1.6,F[1]+2]],INK);
    sx.restore();
    return (c,t)=>{
      const u=mod(t,P); c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(S,0,0); reset(c,px);
      if(u<.6||u>=4.0) return;
      const off=ROLL*Math.max(0,u-1.4);
      c.globalCompositeOperation='multiply'; c.fillStyle='rgb(102,102,102)';
      for(let k=-2;k<100/SP+2;k++){ const y=off+k*SP+LO; if(y>100||y+TH<0) continue; c.fillRect(0,y,100,TH); }
      c.globalCompositeOperation='source-over';
    };
  } },

/* SOLARIZE. PIXEL_FX.solarize, per channel (Flips on: Each colour), Softness 0, Mix 1, on a lighting reference shot made here: a
   grey ball on a stand and a 24-patch colour chart (the standard chart's sRGB values), lit from the upper left. Flips above travels
   from 1 (nothing flips) to .5, the default: every channel brighter than the cut becomes 255 minus itself. The white patch and the
   ball's lit side go dark, with a bright ring where the ball's shading crosses the cut; a yellow patch flips its red and green but not
   its blue, which is why it turns dark green. The inset is the transfer curve the kernel applies, with the cut marked. */
{ id:'solarize', name:'Solarize', section:'Stylize', isNew:true, still:2.4,
  line:'Every tone brighter than the cut flips to its negative, so highlights turn dark and colours turn strange.',
  make(px){
    const P=4.4, N=Math.min(280,px), sc=N/100;
    const [S,sx]=canvasN(N); sx.setTransform(sc,0,0,sc,0,0);
    let g=sx.createLinearGradient(0,0,100,100); g.addColorStop(0,'#3a3631'); g.addColorStop(1,'#1b1a18'); sx.fillStyle=g; sx.fillRect(0,0,100,100);
    /* the stand under the ball */
    sx.fillStyle='#262626'; sx.fillRect(72.7,51,2.6,50); sx.fillStyle='#4a4a48'; sx.fillRect(72.7,51,.7,50);
    /* the chart: 6 x 4 patches in a black frame, turned a few degrees */
    const CH=[[115,82,68],[194,150,130],[98,122,157],[87,108,67],[133,128,177],[103,189,170],[214,126,44],[80,91,166],[193,90,99],[94,60,108],[157,188,64],[224,163,46],
      [56,61,150],[70,148,73],[175,54,60],[231,199,31],[187,86,149],[8,133,161],[243,243,242],[200,200,200],[160,160,160],[122,122,121],[85,85,85],[52,52,52]];
    sx.save(); sx.translate(3,55); sx.rotate(-.07);
    sx.fillStyle='#0f0f0f'; sx.fillRect(0,0,62,43);
    for(let r=0;r<4;r++) for(let k=0;k<6;k++){ const q=CH[r*6+k], f=1.06-.05*k-.03*r; sx.fillStyle='rgb('+Math.min(255,Math.round(q[0]*f))+','+Math.min(255,Math.round(q[1]*f))+','+Math.min(255,Math.round(q[2]*f))+')'; sx.fillRect(2.2+k*9.8,2.2+r*9.8,8.4,8.4); }
    sx.restore();
    sx.setTransform(1,0,0,1,0,0);
    const im=sx.getImageData(0,0,N,N), d=im.data;
    /* the ball: lambert plus a small specular, from the upper left, its edge anti-aliased */
    const BX=74, BY=32, BR=20, lx=-.55, ly=-.62, lz=.56, ln=Math.hypot(lx,ly,lz), hx=lx/ln, hy=ly/ln, hz=lz/ln+1, hn=Math.hypot(hx,hy,hz);
    for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const x=(i+.5)/sc, y=(j+.5)/sc, nx=(x-BX)/BR, ny=(y-BY)/BR, q=nx*nx+ny*ny; if(q>=1) continue;
      const nz=Math.sqrt(1-q), dif=Math.max(0,(nx*lx+ny*ly+nz*lz)/ln), sp=Math.pow(Math.max(0,(nx*hx+ny*hy+nz*hz)/hn),40), k=.1+.9*dif, a=clamp((1-Math.sqrt(q))*BR*sc*1.4,0,1), o=(j*N+i)*4;
      const v=Math.min(255,214*k+70*sp+8*Math.max(0,ny)); for(let ch=0;ch<3;ch++) d[o+ch]=d[o+ch]+(v-d[o+ch])*a; }
    const base=new Uint8ClampedArray(d);
    const LV=[1,.95,.9,.85,.8,.75,.7,.65,.6,.55,.5].map(th=>{ const T=th*255, [C,x]=canvasN(N), o=x.createImageData(N,N), q=o.data;
      for(let p=0;p<base.length;p+=4){ for(let ch=0;ch<3;ch++){ const v=base[p+ch]; q[p+ch]=v>T?255-v:v; } q[p+3]=255; }
      x.putImageData(o,0,0); return {C,th}; });
    const BX0=5, BY0=5, BW=22, BH=18;
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const p=u<.6?0:u<1.6?E.inOut(seg(u,.6,1.6)):u<3.8?1:0, lv=LV[Math.round(p*10)];
      c.drawImage(lv.C,0,0,100,100);
      /* the transfer curve: out = in up to the cut, 1 - in above it */
      c.fillStyle='rgba(12,12,13,.86)'; c.fillRect(BX0-2,BY0-2,BW+4,BH+9.5);
      c.strokeStyle=HAIR; c.lineWidth=.4; c.strokeRect(BX0,BY0,BW,BH);
      const th=lv.th; c.strokeStyle=BONE; c.lineWidth=.6; c.lineJoin='round'; c.beginPath(); c.moveTo(BX0,BY0+BH); c.lineTo(BX0+BW*th,BY0+BH*(1-th));
      if(th<1){ c.moveTo(BX0+BW*th,BY0+BH*th); c.lineTo(BX0+BW,BY0+BH); } c.stroke();
      c.fillStyle=YEL; c.fillRect(BX0+BW*th-.3,BY0,.6,BH);
      c.font=MONO(4.4); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText(th.toFixed(2),BX0,BY0+BH+5.8);
    };
  } },

/* STRIPES. Cut paper: a windsock on an airfield, a 1080 frame. The sock is one layer, cut from vermilion with its ink mouth ring; the
   pole, the sky and the ground are a backdrop layer under it. PIXEL_FX.stripes: Width 64 (the period, counted along x + y), Diag
   (x + y), Bar/gap .5, Strength .6, Colour black, then Scroll speed 48 px/s. The kernel only paints pixels the layer covers (alpha > 0),
   so the bars stay inside the sock and go dark red there, and the pole, sky and ground are untouched.
   (Checker k2: this was a yellow arrow, which Brick Slide already is; a shoe was tried and dropped, because Checker has one.) */
{ id:'stripes', name:'Stripes', section:'Stylize', isNew:true, still:2.1,
  line:'Diagonal bars are laid over the layer, only where the layer is, and can scroll along like a barber pole.',
  make(px){
    const P=4.4, U=100/1080, PER=64*U, HALF=PER/2, K=.6, SPD=48*U;
    /* the sock: a cone from the mouth ring at the pole, tapering to the right and sagging a little in a steady breeze */
    const sock=new Path2D(); sock.moveTo(20.4,19.4); sock.quadraticCurveTo(57,21.6,93.2,30.2); sock.lineTo(92.4,42.2); sock.quadraticCurveTo(57,47.4,20.4,47.8); sock.closePath();
    const xf=c=>{ c.translate(20,34); c.rotate(-2*TAU/360); c.translate(-20,-34); };
    /* the layer, drawn once */
    const [L,lx]=canvasN(px); lx.setTransform(px/100,0,0,px/100,0,0);
    lx.save(); xf(lx);
    lx.fillStyle=VERM; lx.fill(sock);
    lx.strokeStyle=INK; lx.lineWidth=1.5; lx.beginPath(); lx.ellipse(20.6,33.6,2.4,14.6,0,0,TAU); lx.stroke();
    lx.restore();
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      /* the backdrop layer: ground, the mast and its top */
      c.fillStyle=INK; c.fillRect(0,86,100,14); c.fillRect(15.2,22,2.6,66); c.fillRect(13.6,84,5.8,2.6); c.fillRect(14.6,19.6,3.8,2.6);
      c.fillStyle=BONE; c.fillRect(56,91.6,16,1.2); c.fillRect(80,91.6,16,1.2);
      c.drawImage(L,0,0,100,100);
      if(u<.6||u>=4.1) return;
      const off=SPD*clamp(u-1.3,0,2.4);
      /* the bars, clipped to the layer (its outline turned with it), straight in frame space as the kernel lays them */
      c.save(); xf(c); c.clip(sock); c.setTransform(px/100,0,0,px/100,0,0);
      c.globalAlpha=K; c.fillStyle='#000';
      c.beginPath(); for(let n=-1;n<=Math.ceil(200/PER)+1;n++){ const a=off%PER+n*PER-PER, b=a+HALF; c.moveTo(a,0); c.lineTo(b,0); c.lineTo(b-200,200); c.lineTo(a-200,200); c.closePath(); } c.fill();
      c.restore(); c.globalAlpha=1;
      tab(c,4,4,(u<1.3||u>=3.7)?'WIDTH 64':'SCROLL 48 PX/S',4.2,INK,BONE);
    };
  } },

/* TIME WARP SCAN. CANVAS_FX.timewarp, Mode Freeze, Direction Down, Sweep time 2.5 s, Bar width 12, Bar glow .6, default bar colour,
   Repeat Once, over a two-bladed propeller turning at a steady half turn a second. Behind the bar each row is the moment the bar
   crossed it (built row by row once here), in front of it the propeller is live; once the bar lands the whole frame is held. */
{ id:'timewarp', name:'Time Warp Scan', section:'Stylize', isNew:true, still:2.55,
  line:'A bar sweeps down and freezes each row at the moment it passes, so the spinning propeller is caught in bent shapes.',
  make(px){
    const P=4.4, T0=.6, DUR=2.5, HX=45, HY=50, RB=41, OM=3.1, TH0=.35, BW=12*100/1080, GW=BW*(1+.6*7);
    const ang=u=>TH0+OM*u;
    const blade=(c,a)=>{ c.save(); c.translate(HX,HY); c.rotate(a);
      c.beginPath(); c.moveTo(4,-2.4); c.quadraticCurveTo(RB*.42,-5.2,RB-2.6,-2.6); c.quadraticCurveTo(RB+.6,-1.4,RB-.6,1.4); c.quadraticCurveTo(RB*.55,4.2,4,2.6); c.closePath(); c.fillStyle='#c9cdd3'; c.fill();
      c.beginPath(); c.moveTo(4,.2); c.quadraticCurveTo(RB*.55,.9,RB-1.6,.6); c.quadraticCurveTo(RB*.55,3.9,4,2.6); c.closePath(); c.fillStyle='#9097a0'; c.fill();
      c.restore(); };
    const prop=(c,a)=>{ blade(c,a); blade(c,a+Math.PI); c.fillStyle='#6f757e'; c.beginPath(); c.arc(HX,HY,5.4,0,TAU); c.fill(); c.fillStyle='#b9bec5'; c.beginPath(); c.arc(HX-.9,HY-.9,2.6,0,TAU); c.fill(); };
    const [FZ,fz]=canvasN(px);
    for(let j=0;j<px;j++){ const y=(j+.5)*100/px; fz.save(); fz.setTransform(1,0,0,1,0,0); fz.beginPath(); fz.rect(0,j,px,1); fz.clip(); fz.setTransform(px/100,0,0,px/100,0,0); prop(fz,ang(T0+y/100*DUR)); fz.restore(); }
    const ruler=c=>{ c.fillStyle='#4a4f57'; c.fillRect(94,4,.4,92); for(let k=0;k<=9;k++){ const y=4+k*92/9; c.fillRect(k%3===0?91.6:92.8,y-.2,k%3===0?2.8:1.6,.4); } };
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle='#000'; c.fillRect(0,0,100,100); ruler(c);
      const by=u<T0?0:u<T0+DUR?(u-T0)/DUR*100:100;
      if(by<100){ c.save(); c.beginPath(); c.rect(0,by,100,100-by); c.clip(); prop(c,ang(u)); c.restore(); }
      if(by>0){ c.save(); c.setTransform(1,0,0,1,0,0); const d=Math.round(by*px/100); if(d>0) c.drawImage(FZ,0,0,px,d,0,0,px,d); c.restore(); reset(c,px); }
      if(by>0&&by<100){ const gr=c.createLinearGradient(0,by-GW/2,0,by+GW/2); gr.addColorStop(0,'rgba(234,244,255,0)'); gr.addColorStop(.5,'rgba(234,244,255,.33)'); gr.addColorStop(1,'rgba(234,244,255,0)');
        c.globalCompositeOperation='lighter'; c.fillStyle=gr; c.fillRect(0,by-GW/2,100,GW); c.globalCompositeOperation='source-over';
        c.fillStyle='#eaf4ff'; c.fillRect(0,by-BW/2,100,BW); }
    };
  } }

);
})();
