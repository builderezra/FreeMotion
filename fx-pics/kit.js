/* FreeMotion effect pictures: the shared kit. Tiles: make(px) returns draw(ctx, tSeconds); draw in 0..100 units. */
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,p)=>a+(b-a)*p;
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const E={
  inOut:p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2,
  out:p=>1-Math.pow(1-p,3),
  in:p=>p*p*p
};
function rng(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function hash(n,seed){ const s=Math.sin((n+seed*57.13)*127.1)*43758.5453; return s-Math.floor(s); }
function vnoise(x,seed){ const i=Math.floor(x), f=x-i, u=f*f*(3-2*f); return lerp(hash(i,seed),hash(i+1,seed),u)*2-1; }
function canvasOf(px){ const C=document.createElement('canvas'); C.width=C.height=px; const x=C.getContext('2d'); x.setTransform(px/100,0,0,px/100,0,0); return [C,x]; }

/* Ezra's own photographs (photos/<key>.jpg, 320 px square): loaded before any tile is made.
   photo(key) is the Image; photoCover(key,px) returns [canvas,ctx] with it drawn cover-fit, ctx scaled to 0..100 units. */
const PHOTO_KEYS=['bay','bush','cat','city','clouds','dog','dusk','figures','huracan','mclaren','pair','ramp','revuelto','run','shore','sunpath','tesla','towers'];
const PH={};
const photo=k=>PH[k];
function photoCover(k,px){ const C=document.createElement('canvas'); C.width=C.height=px; const x=C.getContext('2d'); const im=PH[k]; if(im){ const s=Math.max(px/im.naturalWidth,px/im.naturalHeight), w=im.naturalWidth*s, h=im.naturalHeight*s; x.drawImage(im,(px-w)/2,(px-h)/2,w,h); } x.setTransform(px/100,0,0,px/100,0,0); return [C,x]; }
function _preload(){ return Promise.all(PHOTO_KEYS.map(k=>new Promise(res=>{ const im=new Image(); im.onload=()=>{ PH[k]=im; res(); }; im.onerror=()=>res(); im.src='photos/'+k+'.jpg'; }))); }
window.FXK={TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover,PHOTO_KEYS,_preload};
window.FX_TILES=window.FX_TILES||[];
})();
