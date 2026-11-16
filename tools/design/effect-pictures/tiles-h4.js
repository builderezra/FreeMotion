/* FreeMotion effect pictures, round 5 slot 4: Lens Blur after #1246 U4 (Radius up to 120 px; past 30 px every point of the aperture).
   The picture runs the effects branch's own kernel (c5a05df8) on dusk on a 320 px plate (byte for byte against FM._pixelFx.lensblur at
   every radius it uses), so every step of the rack is the real maths; frames between steps cross-fade. */
(function(){
'use strict';
const {seg,E,photoCover}=window.FXK;

const MONO='"Courier Prime","Courier New",Courier,monospace';
const INK='#16130f', TXT='#eef2f8';
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const blank=S=>{ const C=document.createElement('canvas'); C.width=C.height=S; return C; };
function tab(c,x,y,txt,bg,fg,fs){ c.font='700 '+fs+'px '+MONO; c.textAlign='left'; c.textBaseline='middle'; const w=txt.length*fs*.6+fs*.9, h=fs*1.5; c.fillStyle=bg; c.fillRect(x,y,w,h); c.fillStyle=fg; c.fillText(txt,x+fs*.45,y+h*.55); return w; }

/* lensBlurDense, ported for a round aperture (Anamorphic 100): the plate summed down by k = ceil(r/12), each pixel weighted by its
   bloom weight grown by Sg; every small pixel inside the aperture, the rim by coverage; the edge repeated, as the app clamps (here by
   padding, which reads the same pixels); then read back up bilinearly. The same sum, gathered faster: each row of the aperture is a
   solid run (prefix sums along the padded row) plus its few rim pixels one by one. Checked against FM._pixelFx.lensblur. */
function dense(s,W,H,r,wt,Sg){
  const k=Math.max(1,Math.ceil(r/12)), rs=r/k, sw=Math.ceil(W/k), sh=Math.ceil(H/k), n=sw*sh;
  const SR=new Float32Array(n), SG=new Float32Array(n), SB=new Float32Array(n), SA=new Float32Array(n), SW=new Float32Array(n);
  for(let y=0;y<H;y++){ const by=((y/k)|0)*sw;
    for(let x=0;x<W;x++){ const i=(y*W+x)*4, b=by+((x/k)|0), w=wt?1+(wt[i>>2]-1)*Sg:1;
      SR[b]+=s[i]*w; SG[b]+=s[i+1]*w; SB[b]+=s[i+2]*w; SA[b]+=s[i+3]*w; SW[b]+=w; } }
  const Rr=Math.ceil(rs)+1, pw=sw+2*Rr, ph=sh+2*Rr, qw=pw+1;
  /* padded grid (edge repeated) and its running sums along each row: Q[y*qw+x] = sum of P[y][0..x-1] */
  const P=[SR,SG,SB,SA,SW].map(()=>new Float32Array(pw*ph)), Q=[0,1,2,3,4].map(()=>new Float64Array(qw*ph)), SRC=[SR,SG,SB,SA,SW];
  for(let y=0;y<ph;y++){ let yy=y-Rr; if(yy<0)yy=0; else if(yy>=sh)yy=sh-1;
    for(let x=0;x<pw;x++){ let xx=x-Rr; if(xx<0)xx=0; else if(xx>=sw)xx=sw-1; const j=yy*sw+xx, o=y*pw+x; for(let c=0;c<5;c++) P[c][o]=SRC[c][j]; }
    for(let c=0;c<5;c++){ const p=P[c], q=Q[c]; let acc=0; q[y*qw]=0; for(let x=0;x<pw;x++){ acc+=p[y*pw+x]; q[y*qw+x+1]=acc; } } }
  /* per aperture row: the solid run [a,b] (coverage 1) and the rim pixels (0 < coverage < 1) */
  const rows=[];
  for(let dy=-Rr;dy<=Rr;dy++){ let a=1e9,b=-1e9; const rim=[];
    for(let dx=-Rr;dx<=Rr;dx++){ const cov=rs-Math.hypot(dx,dy)+.5; if(cov<=0) continue; if(cov>=1){ if(dx<a)a=dx; if(dx>b)b=dx; } else rim.push(dx,cov); }
    if(a<=b||rim.length) rows.push({dy,a,b,rim}); }
  const [PR,PG,PB,PA,PW]=P, [QR,QG,QB,QA,QW]=Q;
  const OR=new Float32Array(n), OG=new Float32Array(n), OB=new Float32Array(n), OA=new Float32Array(n);
  for(let y=0;y<sh;y++) for(let x=0;x<sw;x++){
    let sr=0,sg=0,sb=0,sa=0,ws=0;
    for(const R of rows){ const ry=y+Rr+R.dy, cx=x+Rr;
      if(R.a<=R.b){ const q0=ry*qw+cx+R.a, q1=ry*qw+cx+R.b+1; sr+=QR[q1]-QR[q0]; sg+=QG[q1]-QG[q0]; sb+=QB[q1]-QB[q0]; sa+=QA[q1]-QA[q0]; ws+=QW[q1]-QW[q0]; }
      const rim=R.rim; for(let e=0;e<rim.length;e+=2){ const j=ry*pw+cx+rim[e], c=rim[e+1]; sr+=PR[j]*c; sg+=PG[j]*c; sb+=PB[j]*c; sa+=PA[j]*c; ws+=PW[j]*c; } }
    const o=y*sw+x; if(ws>0){ OR[o]=sr/ws; OG[o]=sg/ws; OB[o]=sb/ws; OA[o]=sa/ws; } }
  const out=new Uint8ClampedArray(W*H*4);
  for(let y=0;y<H;y++){
    let fy=(y+.5)/k-.5; if(fy<0)fy=0; else if(fy>sh-1)fy=sh-1;
    const y0=fy|0, y1=y0+1<sh?y0+1:y0, ty=fy-y0, r0=y0*sw, r1=y1*sw;
    for(let x=0;x<W;x++){
      let fx=(x+.5)/k-.5; if(fx<0)fx=0; else if(fx>sw-1)fx=sw-1;
      const x0=fx|0, x1=x0+1<sw?x0+1:x0, tx=fx-x0, a=r0+x0, b=r0+x1, c=r1+x0, e=r1+x1, w00=(1-tx)*(1-ty), w10=tx*(1-ty), w01=(1-tx)*ty, w11=tx*ty, i=(y*W+x)*4;
      out[i]=OR[a]*w00+OR[b]*w10+OR[c]*w01+OR[e]*w11;
      out[i+1]=OG[a]*w00+OG[b]*w10+OG[c]*w01+OG[e]*w11;
      out[i+2]=OB[a]*w00+OB[b]*w10+OB[c]*w01+OB[e]*w11;
      out[i+3]=OA[a]*w00+OA[b]*w10+OA[c]*w01+OA[e]*w11; } }
  return out;
}

/* PIXEL_FX.lensblur for a full-frame layer, Aperture Circle, Quality 16, Bloom threshold 60: R is the PROJECT radius (px of a 1080
   frame) and the plate is S px, so the kernel sees R*S/1080, as the app's reduced preview does. Bloom weights 1+bloom*h*h (h ramps from
   luma 0.6 to white); up to 30 px the 16 golden-angle taps; past 30 lensBlurDense, its weights grown by Sg (1 at 30, (R/10)^2 from 60);
   from 30 to 34 px the two blend. */
function lensBlur(src,S,R,bloomP){
  const N=S*S, r=R*S/1080, out=new Uint8ClampedArray(src.length);
  if(r<1){ out.set(src); return out; }
  const bloom=bloomP/100, glow=bloomP>0;
  let wt=null;
  if(glow){ wt=new Float32Array(N); for(let q=0,i=0;i<N;q+=4,i++){ const l=(src[q]*.299+src[q+1]*.587+src[q+2]*.114)/255, h=l>.6?(l-.6)*2.5:0; wt[i]=1+bloom*h*h; } }
  let dn=null, f=0;
  const Sg=R>=60?R*R/100:1+(R*R/100-1)*Math.max(0,(R-30)/30);
  if(R>30){ dn=dense(src,S,S,r,glow?wt:null,Sg); if(R>=34) return dn; f=(R-30)/4; }
  /* The taps: (x+ox)|0 then clamped to the frame. For an integer x that is x+floor(ox) read from a copy padded with the edge repeated
     (a truncation toward zero only differs from floor below 0, where both land on the edge), so each tap is one fixed offset. */
  const n=16, ox=new Float64Array(n), oy=new Float64Array(n);
  for(let k=0;k<n;k++){ const a=k*2.399963, rd=r*Math.sqrt((k+.5)/n); ox[k]=Math.cos(a)*rd; oy[k]=Math.sin(a)*rd; }
  const pad=Math.ceil(r)+2, pw=S+2*pad, off=new Int32Array(n), PS=new Uint8ClampedArray(pw*pw*4), PWt=new Float32Array(pw*pw);
  for(let k=0;k<n;k++) off[k]=Math.floor(oy[k])*pw+Math.floor(ox[k]);
  for(let y=0;y<pw;y++){ let yy=y-pad; if(yy<0)yy=0; else if(yy>=S)yy=S-1;
    for(let x=0;x<pw;x++){ let xx=x-pad; if(xx<0)xx=0; else if(xx>=S)xx=S-1; const si=yy*S+xx, o=y*pw+x;
      PS[o*4]=src[si*4]; PS[o*4+1]=src[si*4+1]; PS[o*4+2]=src[si*4+2]; PS[o*4+3]=src[si*4+3]; PWt[o]=glow?wt[si]:1; } }
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    const base=(y+pad)*pw+x+pad; let sr=0,sg=0,sb=0,sa=0,ws=0;
    if(glow){ for(let k=0;k<n;k++){ const j=base+off[k], w=PWt[j], q=j*4; sr+=PS[q]*w; sg+=PS[q+1]*w; sb+=PS[q+2]*w; sa+=PS[q+3]*w; ws+=w; } }
    else { for(let k=0;k<n;k++){ const q=(base+off[k])*4; sr+=PS[q]; sg+=PS[q+1]; sb+=PS[q+2]; sa+=PS[q+3]; } }
    const di=(y*S+x)*4, dv=glow?ws:n; out[di]=sr/dv; out[di+1]=sg/dv; out[di+2]=sb/dv; out[di+3]=sa/dv; }
  if(dn) for(let q=0;q<out.length;q++) out[q]=out[q]+(dn[q]-out[q])*f;
  return out;
}

window.FX_TILES.push(

/* ── LENS BLUR ── Graded still. A rack focus on dusk: Radius eases 0 to 90 px of a 1080 frame with Highlight bloom 200% (threshold 60),
   holds, then cuts back sharp. Each step of the rack is the real kernel at that radius; the frames between steps cross-fade. */
{ id:'lensblur', name:'Lens Blur', section:'Blur', isNew:true, redrawn:true, still:2.8, _kernel:lensBlur,
  line:'Radius goes from 0 to 90 px with Highlight bloom at 200%, and the city lights open into round discs.',
  make(px){
    const P=4.4, S=320, RMAX=90, BLOOM=200, RADII=[0,10,20,30,42,56,72,90];
    /* the photo reaches the plate the way the app's layer gets it in a 1080 comp (stretched up, then sampled at the plate), which
       softens its small lights a touch: measured, the bloom weights then match the real plate's within 1% (native 320 px is 13% hotter) */
    const SRC=blank(S), sx=SRC.getContext('2d'); sx.drawImage(photoCover('dusk',640)[0],0,0,S,S);
    const src=sx.getImageData(0,0,S,S).data;
    const L=RADII.map(R=>{ if(!R) return SRC; const C=blank(S), x=C.getContext('2d'), o=x.createImageData(S,S); o.data.set(lensBlur(src,S,R,BLOOM)); x.putImageData(o,0,0); return C; });
    const last=RADII.length-1;
    return (c,t)=>{
      const u=t%P, R=u<3.9?RMAX*E.inOut(seg(u,.7,1.7)):0;
      let i=0; while(i<last-1&&R>RADII[i+1]) i++;
      const f=Math.min(1,(R-RADII[i])/(RADII[i+1]-RADII[i]));
      reset(c,px); c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      if(f>=1) c.drawImage(L[i+1],0,0,100,100);
      else{ c.drawImage(L[i],0,0,100,100); if(f>0){ c.globalAlpha=f; c.drawImage(L[i+1],0,0,100,100); c.globalAlpha=1; } }
      tab(c,0,0,'RADIUS '+String(Math.round(R)).padStart(2,'0'),INK,TXT,5.2);
    };
  }
}

);
})();
