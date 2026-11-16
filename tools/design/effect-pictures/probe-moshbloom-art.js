/* probe-moshbloom-art.js: candidate painted shots for the Datamosh Bloom menu picture, run through the REAL renderer by
   probe-moshbloom.js's play(). Units: 100 across; the clip canvas is square here (prototype only). */
(function(){
'use strict';
const R=(g,c,x,y,w,h)=>{ g.fillStyle=c; g.fillRect(x,y,w,h); };
const unit=(g,S)=>{ g.setTransform(S/100,0,0,S/100,0,0); g.globalAlpha=1; };

/* A1: an ochre facade at noon with dark green shutters, a hard diagonal shadow */
function facade(g,t,S){
  unit(g,S); R(g,'#b8893c',0,0,100,100);
  for(let r=0;r<3;r++) for(let c=0;c<3;c++){
    const x=8+c*33, y=8+r*31;
    R(g,'#1b1712',x+6,y,12,22);           // the dark window
    R(g,'#2f4b3c',x,y,6,22); R(g,'#2f4b3c',x+18,y,6,22);   // shutters
    g.fillStyle='rgba(0,0,0,.18)'; for(let k=0;k<6;k++){ g.fillRect(x,y+1+k*3.6,6,1.2); g.fillRect(x+18,y+1+k*3.6,6,1.2); }
    R(g,'#d9c39a',x+4,y+22,16,2.2);        // the sill
  }
  // a hard diagonal shadow over the top left
  g.fillStyle='rgba(40,20,0,.38)'; g.beginPath(); g.moveTo(0,0); g.lineTo(62,0); g.lineTo(0,58); g.closePath(); g.fill();
}
/* B1: night, a lit train crossing left to right on a viaduct; distant city lights */
function nightTrain(g,t,S){
  unit(g,S); R(g,'#0d1119',0,0,100,100);
  R(g,'#141b28',0,58,100,42);
  const rr=FXK.rng(7); for(let i=0;i<60;i++){ const x=rr()*100, y=60+rr()*30; R(g,rr()<.7?'#6b5a35':'#c9a65a',x,y,0.9,0.7); }
  R(g,'#090c12',0,52,100,4); for(let x=6;x<100;x+=22) R(g,'#090c12',x,56,4,44);
  const x0=-20+52*t;   // the front, moving right 52 units a second
  for(let k=0;k<4;k++){ const cx=x0-k*36; R(g,'#3a404c',cx-34,36,34,15); R(g,'#22262e',cx-34,49,34,2);
    for(let w=0;w<5;w++) R(g,'#f3d58c',cx-31+w*6.4,39.5,4.4,5); }
  R(g,'#fff3c8',x0-2,46,2,2);
}
/* B2: day, a dark train crossing left to right in front of a pale platform */
function dayTrain(g,t,S){
  unit(g,S); R(g,'#c9cdd3',0,0,100,100); R(g,'#8f949c',0,0,100,14); R(g,'#a9adb4',0,62,100,38);
  for(let x=4;x<100;x+=16) R(g,'#6c7078',x,14,2.5,48);
  const x0=-20+52*t;
  for(let k=0;k<4;k++){ const cx=x0-k*36; R(g,'#262a31',cx-34,30,34,26); R(g,'#4a5260',cx-31,34,28,8); R(g,'#0f1115',cx-34,52,34,3); }
}
/* B3: night city, the camera pushing in */
function pushIn(g,t,S){
  unit(g,S); R(g,'#0d1119',0,0,100,100);
  const s=1+1.4*(1-Math.exp(-t/0.9)); g.translate(62,40); g.scale(s,s); g.translate(-62,-40);
  const rr=FXK.rng(11);
  for(let b=0;b<9;b++){ const x=b*12-4, w=10, h=40+rr()*40; R(g,'#1a2130',x,100-h,w,h); for(let yy=100-h+3;yy<98;yy+=4) for(let xx=x+1.5;xx<x+w-1;xx+=2.6){ if(rr()<.38) R(g,rr()<.8?'#e9c46e':'#cfd8e6',xx,yy,1.4,1.8); } }
}
/* a night city strip (buildings with lit windows), 300 units wide, drawn once */
let city=null;
function cityStrip(){
  if(city) return city; const c=document.createElement('canvas'); c.width=1200; c.height=400; const g=c.getContext('2d'); g.setTransform(4,0,0,4,0,0);
  R(g,'#0d1119',0,0,300,100); const rr=FXK.rng(21);
  for(let x=-4;x<300;){ const w=8+rr()*10, h=35+rr()*55; R(g,rr()<.5?'#1a2130':'#161c29',x,100-h,w,h); for(let yy=100-h+3;yy<98;yy+=4) for(let xx=x+1.5;xx<x+w-1.5;xx+=2.8){ if(rr()<.4) R(g,rr()<.8?'#e9c46e':'#cfd8e6',xx,yy,1.5,1.9); } x+=w+0.8; }
  return city=c;
}
let tower=null;
function towerStrip(){
  if(tower) return tower; const c=document.createElement('canvas'); c.width=400; c.height=1200; const g=c.getContext('2d'); g.setTransform(4,0,0,4,0,0);
  R(g,'#0b0f17',0,0,100,300); const rr=FXK.rng(5);
  R(g,'#1a2130',14,0,56,300); R(g,'#151b27',74,40,30,260);
  for(let yy=2;yy<300;yy+=4.2) for(let xx=17;xx<68;xx+=4.4){ if(rr()<.45) R(g,rr()<.8?'#e9c46e':'#cfd8e6',xx,yy,2.4,2.4); }
  for(let yy=44;yy<300;yy+=5) for(let xx=77;xx<100;xx+=4.6){ if(rr()<.3) R(g,'#c9a65a',xx,yy,2,2.2); }
  return tower=c;
}
/* B4: the camera tilts up a lit tower at night: everything moves down */
function tiltUp(g,t,S){
  unit(g,S); R(g,'#0b0f17',0,0,100,100);
  const off=-190+38*t;   // the tower slides down 38 units a second
  g.drawImage(towerStrip(),0,off,100,300);
}
/* B5: a train close up, filling the middle, crossing fast */
function closeTrain(g,t,S){
  unit(g,S); R(g,'#0d1119',0,0,100,100); R(g,'#141b28',0,70,100,30);
  const x0=-10+80*t;
  for(let k=0;k<4;k++){ const cx=x0-k*62; R(g,'#3a404c',cx-60,22,60,44); R(g,'#22262e',cx-60,60,60,6);
    for(let w=0;w<4;w++) R(g,'#f3d58c',cx-54+w*14.5,30,10,14); R(g,'#5b6372',cx-60,48,60,1.2); }
}
/* B6: a pan across the night city */
function panCity(g,t,S){
  unit(g,S); R(g,'#0b0f17',0,0,100,100);
  const off=-10-30*t; g.drawImage(cityStrip(),off,0,300,100);
}
/* A2: a stone colonnade in hard sun: bone columns, ink shadows between, a slice of blue sky, a cast shadow raking across the floor */
function colonnade(g,t,S){
  unit(g,S); R(g,'#5b7fa6',0,0,100,100);          // sky
  R(g,'#cfc6b2',0,10,100,10);                       // the entablature
  R(g,'#b4ab97',0,18,100,2);
  for(let k=0;k<7;k++){ const x=-6+k*17; R(g,'#1a1712',x+8.5,20,8.5,62); R(g,'#e3dbc8',x,20,8.5,62); R(g,'#bfb5a0',x+6.4,20,2.1,62); }
  R(g,'#d6ccb6',0,82,100,18);                       // the floor
  g.fillStyle='#2a251d'; for(let k=0;k<7;k++){ const x=-6+k*17+8.5; g.beginPath(); g.moveTo(x,82); g.lineTo(x+8.5,82); g.lineTo(x+20,100); g.lineTo(x+11.5,100); g.closePath(); g.fill(); }
}
/* B7: night; a train close up crosses left to right through the middle of the frame */
function nightTrain2(g,t,S){
  unit(g,S); R(g,'#0b0e15',0,0,100,100); R(g,'#121722',0,74,100,26); R(g,'#07090d',0,70,100,4);
  const x0=-4+70*t;
  for(let k=0;k<5;k++){ const cx=x0-k*58; R(g,'#2b303a',cx-56,24,56,44); R(g,'#3c4250',cx-56,24,56,3); R(g,'#16191f',cx-56,62,56,6);
    for(let w=0;w<3;w++){ R(g,'#f0d083',cx-50+w*17,32,12,15); R(g,'#fff1c4',cx-50+w*17,32,12,3); }
    R(g,'#0b0e15',cx-1.2,24,1.2,44); }
  R(g,'#fff6dc',x0-1.5,58,1.5,2.4);
}
window.__mbArt={facade,nightTrain,dayTrain,pushIn,tiltUp,closeTrain,panCity,colonnade,nightTrain2};
})();
