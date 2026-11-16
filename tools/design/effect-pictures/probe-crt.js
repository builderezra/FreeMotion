/* probe-crt.js (round 5, slot 8): the CRT tile (tiles-h8.js) against the REAL effect on the very layer the tile shows — his photograph's
   middle 86 of 100 rows, a 1080 x 929 layer in a 1080 x 929 comp — at the same keyframed Power, frame for frame.
   Load: truth.html?app=/ss/&extra=probe-crt.js   Use: await __crtProbe(ts, 'r5-crt-probe', params)
   Rows: OURS (the tile's screen), REAL (FM.renderScene), |OURS - REAL| x 4. Numbers: Power, the mean change each makes from the plain
   layer (0..255 per channel) and the mean mismatch between them. */
(function(){
'use strict';
const PLATES=[['#18181b',[[19.6,63.1],[29.3,63.1],[29.3,66.7],[19.6,66.7]]],['#7f92a4',[[78.2,57.2],[86.6,57.2],[86.6,60],[78.2,60]]]];
const PW=1080, PH=Math.round(PW*.86);
let LAYER=null, seq=0;
function layerCanvas(){
  if(LAYER) return LAYER;
  const T=(window.FX_TILES||[]).filter(t=>t.id==='crt').pop(), Y0=Math.round((PW-PH)*((T&&T.CROP!=null)?T.CROP:.55));
  const [C,x]=FXK.photoCover('revuelto',PW);
  for(const pl of PLATES){ x.fillStyle=pl[0]; x.beginPath(); pl[1].forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])); x.closePath(); x.fill(); }
  const L=document.createElement('canvas'); L.width=PW; L.height=PH; L.getContext('2d').drawImage(C,0,Y0,PW,PH,0,0,PW,PH);
  return LAYER=L;
}
function scene(params,D){
  const id='_crtprobe'+(++seq);
  FM.media.set(id,{kind:'image',el:layerCanvas(),width:PW,height:PH,duration:0}); FM.media.pin(id);
  const l=FM.makeLayer('image',{x:PW/2,y:PH/2,start:0,duration:D}); l.id=id;
  if(params){ const inst=FM.fxRegistry.makeInstance('crt'); for(const k of Object.keys(params)) inst.params[k]=params[k]; l.effects=[inst]; } else l.effects=[];
  return {project:{width:PW,height:PH,fps:30,duration:D,background:'#000000'},layers:[l]};
}
const meanAbs=(a,b)=>{ let s=0,n=0; for(let i=0;i<a.length;i+=4){ s+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]); n+=3; } return Math.round(100*s/n)/100; };
/* the tile's keyframes as the app's own: linear keyframes at the same times and values */
window.__crtKF=function(){ const T=(window.FX_TILES||[]).filter(t=>t.id==='crt').pop(); return T&&T.KF?T.KF:null; };
window.__crtProbe=async function(ts,name,params){
  await window.__truthReady;
  const H_=window.__h, T=(window.FX_TILES||[]).filter(t=>t.id==='crt').pop();
  if(!T) throw new Error('no crt tile');
  const PX=360, W=360, H=Math.round(PX*PH/PW), D=Math.max(...ts)+1.5;
  const draw=T.make(PX), tc=document.createElement('canvas'); tc.width=tc.height=PX; const tg=tc.getContext('2d',{willReadFrequently:true});
  const fx=scene(params,D), plain=scene(null,D);
  const rc=document.createElement('canvas'); rc.width=W; rc.height=H; const rg=rc.getContext('2d',{willReadFrequently:true});
  H_.paintReal(rg,plain,0); const pl=rg.getImageData(0,0,W,H).data.slice();
  H_.paintReal(rg,fx,0);
  const C=180, CH=Math.round(C*H/W), G=10, L=22, LBL=58;
  const sh=document.createElement('canvas'); sh.width=LBL+ts.length*(C+G)+G; sh.height=G+L+3*(CH+G)+40; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,sh.height); x.imageSmoothingQuality='high';
  x.fillStyle='#ffd27a'; x.font='700 13px system-ui, sans-serif'; x.fillText('CRT tile vs real effect (?app='+H_.base+') on the same 1080x929 layer: '+JSON.stringify(params).replace(/"kf":\[[^\]]*\]/,'"kf":[..]'),G,G+13);
  ['OURS','REAL','|O-R|x4'].forEach((s,r)=>{ x.fillStyle='#eef1f7'; x.font='700 12px ui-monospace, monospace'; x.fillText(s,4,G+L+r*(CH+G)+CH/2); });
  const rows=[], dc=document.createElement('canvas'); dc.width=W; dc.height=H; const dg=dc.getContext('2d'); const dimg=dg.createImageData(W,H);
  for(let k=0;k<ts.length;k++){
    const t=ts[k], xa=LBL+k*(C+G);
    /* the tile ticks at 25 fps, so the real frame is rendered at the tile's own frame time */
    const tq=Math.floor(t*25+1e-6)/25;
    draw(tg,t); const ours=tg.getImageData(0,0,W,H).data;
    H_.paintReal(rg,fx,tq); const real=rg.getImageData(0,0,W,H).data;
    const oc=document.createElement('canvas'); oc.width=W; oc.height=H; oc.getContext('2d').drawImage(tc,0,0,W,H,0,0,W,H);
    x.drawImage(oc,xa,G+L,C,CH); x.drawImage(rc,xa,G+L+CH+G,C,CH);
    const dd=dimg.data; for(let i=0;i<dd.length;i+=4){ dd[i]=Math.min(255,4*Math.abs(ours[i]-real[i])); dd[i+1]=Math.min(255,4*Math.abs(ours[i+1]-real[i+1])); dd[i+2]=Math.min(255,4*Math.abs(ours[i+2]-real[i+2])); dd[i+3]=255; }
    dg.putImageData(dimg,0,0); x.drawImage(dc,xa,G+L+2*(CH+G),C,CH);
    const pw=draw.powerAt?draw.powerAt(t):null, row={t,power:pw==null?null:Math.round(pw*1000)/1000,realChange:meanAbs(real,pl),oursChange:meanAbs(ours,pl),mismatch:meanAbs(ours,real)};
    rows.push(row);
    x.fillStyle='#9aa3b5'; x.font='11px ui-monospace, monospace';
    x.fillText('t='+t+' P='+(row.power==null?'?':row.power.toFixed(2)),xa,G+L+3*(CH+G)+2);
    x.fillText('real '+row.realChange+' ours '+row.oursChange,xa,G+L+3*(CH+G)+16);
    x.fillText('mismatch '+row.mismatch,xa,G+L+3*(CH+G)+30);
    await H_.yieldNow();
  }
  return {saved:await H_.save(sh,name||'r5-crt-probe'),rows};
};
})();
