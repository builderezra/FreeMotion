/* FreeMotion effect pictures, artist 24 (c24): the Text effects Text Pad, Type-On, Text Repeat, Text Reverse, Letter Spread,
   Change Case and Timecode. No photographs. Each of these effects only rewrites a text layer's STRING (or its spacing), so every
   picture is a text layer whose words come from the effect's own string maths, ported from TEXT_FX in js/compositor.js.
   Type is sized at make() time by measuring it, so the heavy sans fits the same on a phone (Helvetica) as on a PC (Arial). */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; };
const M=document.createElement('canvas').getContext('2d');
/* em widths of a string in a font, measured once at 100 px */
const em=(f,s)=>{ M.font=f(100); return M.measureText(s).width/100; };
/* the font size that makes the widest of these strings exactly w units wide, never above cap */
const fit=(f,list,w,cap)=>Math.min(cap,w/Math.max(...list.map(s=>em(f,s))));

/* ---- the effects' own string maths (TEXT_FX in js/compositor.js), reduced to the settings each picture uses ---- */
/* textpad: every LINE shorter than Width is filled with the pad character; Before puts it in front */
const padText=(s,len,ch,side)=>s.split('\n').map(ln=>{ if(ln.length>=len) return ln; const pad=new Array(len-ln.length+1).join(ch);
  if(side===2){ const half=Math.floor((len-ln.length)/2); return pad.slice(0,half)+ln+pad.slice(half); } return side===1?ln+pad:pad+ln; }).join('\n');
/* textrepeat: Copies joined by the separator (New line here) */
const repeatText=(one,n,sep)=>{ let out=one; for(let i=1;i<n;i++) out+=sep+one; return out; };
/* textreverse, Characters: each line's characters in the opposite order */
const reverseText=s=>s.split('\n').map(ln=>ln.split('').reverse().join('')).join('\n');
/* texttransform: 0 UPPERCASE, 2 Capitalize Words (ASCII words here), 4 aLtErNaTiNg (counts letters only) */
const caseText=(s,m)=>{
  if(m===0) return s.toUpperCase();
  if(m===1) return s.toLowerCase();
  if(m===2){ let o='', p1=''; for(const ch of s.toLowerCase()){ const L=/[a-z]/.test(ch), LN=/[a-z0-9]/.test(p1); o+=(L&&!LN)?ch.toUpperCase():ch; p1=ch; } return o; }
  if(m===4){ let o='', k=0; for(const ch of s){ const lo=ch.toLowerCase(), up=ch.toUpperCase(); if(lo===up){ o+=ch; continue; } o+=(k&1)?up:lo; k++; } return o; }
  return s; };
/* timecode: MM:SS:FF of the clip clock */
const tp=v=>(v<10?'0':'')+v;
const mmssff=(lt,fps)=>{ const ff=Math.floor(lt*fps+1e-6)%fps, S=Math.floor(lt+1e-6); return tp(Math.floor(S/60)%60)+':'+tp(S%60)+':'+tp(ff); };

window.FX_TILES.push(

/* TEXT PAD. Type poster, Bone on Coal. textpad at Pad with Zeros, Side Before; Width is keyed 0, 3, 4 and back on hard cuts.
   One text layer of three lines: a line already as wide as Width (108 at 3) is left alone, exactly as the effect does. */
{ id:'textpad', name:'Text Pad', section:'Text', isNew:true, still:1.6,
  line:'Short lines are filled out to a set width, here with zeros in front, so 7 and 42 line up with 108.',
  make(px){
    const P=4.4, SRC='7\n42\n108', X=7, FS=fit(SANS,['0000'],85,31), CAP=FS*.73, B0=14.5+CAP, LH=(93.5-B0)/2;
    const width=u=>u<.8?0:u<2.3?3:u<3.6?4:0;
    return (c,t)=>{
      const u=mod(t,P), W=width(u); reset(c,px);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      const lines=padText(SRC,W,'0',0).split('\n');
      c.font=SANS(FS); c.fillStyle=BONE; c.textAlign='left'; c.textBaseline='alphabetic';
      lines.forEach((ln,i)=>c.fillText(ln,X,B0+i*LH));
      tab(c,X,3,'WIDTH '+W,4.8,VERM,INK);
    };
  } },

/* TYPE-ON. A location card, knocked out of one flat green ink: the place and time typed on in the lower left, the way a thriller
   opens. textprogress at Reveal by Letter, From Start, Caret the block, Caret blink 2 Hz, Caret when idle Show: the caret is lit
   on the first half of each beat and stands there before the first letter and after the last. Progress is keyed 0 to 1, held,
   and keyed back to 0, which takes the letters off from the end. Nothing else moves: only the letters perform. */
{ id:'textprogress', name:'Type-On', section:'Text', isNew:true, still:1.55,
  line:'The text appears one letter at a time behind a blinking caret as Progress runs from 0 to 1.',
  make(px){
    const P=4.5, SRC='PERTH\n06:04', GREEN='#1f7f70', X=7, FS=fit(MONO,['06:04'],78,30), cw=em(MONO,'M')*FS, LH=FS*1.0, B1=89, B0=B1-LH, KEYS=[[.5,0],[2.3,1],[3.6,1],[4.1,0]];
    const prog=u=>{ if(u<=KEYS[0][0]) return 0; for(let i=1;i<KEYS.length;i++){ if(u<=KEYS[i][0]){ const a=KEYS[i-1], b=KEYS[i]; return lerp(a[1],b[1],(u-a[0])/(b[0]-a[0])); } } return 0; };
    return (c,t)=>{
      const u=mod(t,P), pr=clamp(prog(u)), n=Math.round(SRC.length*pr), lit=Math.floor(u*2*2)%2===0;
      reset(c,px); c.fillStyle=GREEN; c.fillRect(0,0,100,100);
      const shown=SRC.slice(0,n).split('\n');
      c.font=MONO(FS); c.fillStyle=BONE; c.textAlign='left'; c.textBaseline='alphabetic';
      shown.forEach((ln,i)=>c.fillText(ln,X,B0+i*LH));
      if(lit){ const li=shown.length-1, cx=X+shown[li].length*cw, by=B0+li*LH; c.fillRect(cx,by-FS*.74,cw*.5,FS*.96); }
    };
  } },

/* TEXT REPEAT. Two-ink print: Bone, vermilion and Ink, the type overprinting the vermilion block. textrepeat at Separated by
   New line, Copies keyed 1 to 5 in steps, held, and cut back to 1. */
{ id:'textrepeat', name:'Text Repeat', section:'Text', isNew:true, still:2.6,
  line:'The words are written out again, one copy under the other, as many times as Copies says.',
  make(px){
    const P=4.6, ONE='AGAIN', X=5, FS=fit(SANS,[ONE],76,24), CAP=FS*.73, LH=(97-3-CAP)/4, B0=3+CAP, BX=56;
    const copies=u=>u<.7?1:u<3.9?Math.min(5,2+Math.floor((u-.7)/.32)):1;
    /* the print's own speckle: ink flecks on the paper, paper showing through the vermilion */
    const SP=document.createElement('canvas'); SP.width=SP.height=px; const sp=SP.getContext('2d'); sp.setTransform(px/100,0,0,px/100,0,0);
    const R=rng(2417);
    for(let i=0;i<520;i++){ const x=R()*100, y=R()*100, r=.12+R()*.28; sp.fillStyle=x>BX?'rgba(231,226,213,.5)':'rgba(22,19,15,.34)'; sp.beginPath(); sp.arc(x,y,r,0,TAU); sp.fill(); }
    return (c,t)=>{
      const u=mod(t,P), n=copies(u); reset(c,px);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      c.fillStyle=VERM; c.fillRect(BX,0,100-BX,100);
      const lines=repeatText(ONE,n,'\n').split('\n');
      c.globalCompositeOperation='multiply'; c.font=SANS(FS); c.fillStyle=INK; c.textAlign='left'; c.textBaseline='alphabetic';
      lines.forEach((ln,i)=>c.fillText(ln,X,B0+i*LH));
      c.globalCompositeOperation='source-over';
      c.drawImage(SP,0,0,100,100);
      /* the copy count, set up the margin */
      c.save(); c.translate(96.6,97); c.rotate(-Math.PI/2); c.font=MONO(4.4); c.fillStyle=INK; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText('COPIES '+n,0,0); c.restore();
    };
  } },

/* TEXT REVERSE. Cut paper: keyframe yellow, Ink, a scissor-cut vermilion strip. textreverse at Characters: the same letters in
   the opposite order, each glyph still the right way round (it is not a mirror). On, held, off, on hard cuts. */
{ id:'textreverse', name:'Text Reverse', section:'Text', isNew:true, still:2.2,
  line:'The letters of each line are written in the opposite order; the letters themselves are not flipped.',
  make(px){
    const P=4.2, SRC='CLIP', X=5, FS=fit(SANS,[SRC,reverseText(SRC)],88,40), BASE=22+FS*.73;
    const on=u=>u>=1.2&&u<3.4;
    return (c,t)=>{
      const u=mod(t,P), r=on(u); reset(c,px);
      c.fillStyle=YEL; c.fillRect(0,0,100,100);
      c.fillStyle=VERM; c.beginPath(); c.moveTo(0,BASE+8.5); c.lineTo(100,BASE+5.4); c.lineTo(100,BASE+16.2); c.lineTo(0,BASE+20.6); c.closePath(); c.fill();
      c.font=SANS(FS); c.fillStyle=INK; c.textAlign='left'; c.textBaseline='alphabetic';
      c.fillText(r?reverseText(SRC):SRC,X,BASE);
      c.font=MONO(4.6); c.fillStyle=INK; c.textBaseline='alphabetic'; c.fillText(r?'REVERSE: CHARACTERS':'REVERSE: OFF',X,92);
    };
  } },

/* LETTER SPREAD. Chronophotograph: black and silver, a ruled scale in px of the 1080 frame. textspacing with Letter spacing 0
   and Spread speed keyed +40 px/s, 0, then -50 px/s (below 0 the letters close up), so the tracking opens from 0 to 90 px at a
   steady rate, holds, and closes. Letters spaced by hand, advance plus spacing, as the layer does; the ticks mark each letter. */
{ id:'textspacing', name:'Letter Spread', section:'Text', isNew:true, still:2.8,
  line:'Space opens between the letters at a steady rate, the slow tracking-out of a film title, then closes again.',
  make(px){
    const P=5, WORD='DUSK', U=100/1080, MAXPX=90, X=5, FS=fit(SANS,[WORD],90-(WORD.length-1)*MAXPX*U,26), BASE=26+FS*.73, SIL='#c9ccd1', SDIM='#6e7178';
    const adv=WORD.split('').map(ch=>em(SANS,ch)*FS);
    const spread=u=>u<.3?0:u<2.55?40*(u-.3):u<3.0?MAXPX:u<4.8?MAXPX-50*(u-3.0):0;
    const SY=BASE+12;
    return (c,t)=>{
      const u=mod(t,P), spx=Math.max(0,spread(u)), s=spx*U; reset(c,px);
      c.fillStyle='#000'; c.fillRect(0,0,100,100);
      /* the scale: 0 to 1080 px across the frame */
      c.strokeStyle=SDIM; c.lineWidth=.4; c.beginPath(); c.moveTo(0,SY); c.lineTo(100,SY);
      for(let k=0;k<=20;k++){ const x=k*5, h=k%5===0?3.2:1.6; c.moveTo(x,SY); c.lineTo(x,SY+h); } c.stroke();
      c.font=MONO(3.6); c.fillStyle=SDIM; c.textAlign='center'; c.textBaseline='top'; [270,540,810].forEach(v=>c.fillText(String(v),v*U,SY+4.5));
      c.font=SANS(FS); c.fillStyle=SIL; c.textAlign='left'; c.textBaseline='alphabetic';
      let x=X; c.strokeStyle=SIL; c.lineWidth=.5;
      for(let i=0;i<WORD.length;i++){ c.fillText(WORD[i],x,BASE); c.beginPath(); c.moveTo(x,SY-4.5); c.lineTo(x,SY); c.stroke(); x+=adv[i]+s; }
      c.font=MONO(5); c.fillStyle=SIL; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText('SPACING '+Math.round(spx)+' PX',X,90);
    };
  } },

/* CHANGE CASE. Comp sheet: one Bone sheet on Coal with its layer tab. texttransform rewrites the typed "the end" as UPPERCASE,
   Capitalize Words and aLtErNaTiNg (lower, upper, counting letters only, so the line break does not break the beat). */
{ id:'texttransform', name:'Change Case', section:'Text', isNew:true, still:1.4,
  line:'The same words rewritten in capitals, title case or alternating case; the letters change, nothing else does.',
  make(px){
    const P=4.8, SRC='the\nend', SX=7, SY=13, SW=86, SH=70, FS=fit(SANS,['END','THE','EnD'],72,32), LH=FS*.98, B0=SY+(SH-LH-FS*.73)/2+FS*.73;
    const mode=u=>u<.9?-1:u<2.0?0:u<3.1?2:u<4.2?4:-1, NAME={'-1':'OFF','0':'UPPERCASE','2':'Capitalize Words','4':'aLtErNaTiNg'};
    return (c,t)=>{
      const u=mod(t,P), md=mode(u); reset(c,px);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.fillStyle=BONE; c.fillRect(SX,SY,SW,SH);
      tab(c,SX,SY-7.6,'TEXT 01',4.8,BONE,INK);
      const lines=(md<0?SRC:caseText(SRC,md)).split('\n');
      c.font=SANS(FS); c.fillStyle=INK; c.textAlign='left'; c.textBaseline='alphabetic';
      lines.forEach((ln,i)=>c.fillText(ln,SX+6,B0+i*LH));
      c.font=MONO(5.2); c.fillStyle=md<0?DIM:VERM; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText(NAME[md],SX,93.5);
    };
  } },

/* TIMECODE. Pen plotter, Bone with an Ink pen and one red pen: a plate from a physics primer, a pendulum at rest and (dashed) at the
   end of its swing, its arc of travel ruled in red, FIG. 2. (Checker k4: it was 75 % colour bars, the set's third after Grayscale and
   Taffy Pull.) The figure is the clip and never moves; only the digits are the effect. timecode at MM:SS:FF, Start at 3 s, Counts Down,
   25 fps project: 00:03:00 runs down a frame at a time to 00:00:00, where Counts Down stops, and holds. Then Start at is keyed up from
   3.5 to 7 between 3.5 s and 3.9 s and held (lt = Start at - clip time), which winds the clock back up; the last frames count down
   00:03:02, 00:03:01 and the loop wraps on 00:03:00, with no jump (checker k4: it used to jump from 00:02:19 to 00:03:00 on the wrap). */
{ id:'timecode', name:'Timecode', section:'Text', isNew:true, still:1.3,
  line:'A running clock is written into the text, frame by frame; here it counts down from three seconds and stops at zero.',
  make(px){
    const P=4, FPS=25, START=3, X=5.5, FS=fit(SANS,['00:00:00'],89,30), BASE=94;
    const clock=f=>f<3.5?Math.max(0,START-f):lerp(3.5,7,clamp((f-3.5)/.4))-f;
    /* the plate, plotted once: one pen width throughout, a dot where each stroke starts, the pen lifted between strokes */
    const FG=document.createElement('canvas'); FG.width=FG.height=px; const g=FG.getContext('2d'); g.setTransform(px/100,0,0,px/100,0,0);
    g.fillStyle=BONE; g.fillRect(0,0,100,100);
    const PW=.75, PVX=41, PVY=11, L=44, BR=5.2, AMP=24*Math.PI/180, RED='#d8321f';
    g.lineWidth=PW; g.lineCap='round'; g.lineJoin='round';
    const stroke=(col,pts,dash)=>{ g.strokeStyle=col; g.setLineDash(dash||[]); g.beginPath(); pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])); g.stroke(); g.setLineDash([]); g.fillStyle=col; g.beginPath(); g.arc(pts[0][0],pts[0][1],PW*1.1,0,TAU); g.fill(); };
    const ring=(col,x,y,r,dash)=>{ g.strokeStyle=col; g.setLineDash(dash||[]); g.beginPath(); g.arc(x,y,r,-Math.PI/2,TAU-Math.PI/2); g.stroke(); g.setLineDash([]); g.fillStyle=col; g.beginPath(); g.arc(x,y-r,PW*1.1,0,TAU); g.fill(); };
    /* the support, hatched above */
    stroke(INK,[[PVX-15,PVY],[PVX+15,PVY]]);
    for(let hx=PVX-14;hx<=PVX+12;hx+=3.2) stroke(INK,[[hx,PVY],[hx+2.4,PVY-3.2]]);
    /* at rest, and at the end of the swing */
    stroke(INK,[[PVX,PVY],[PVX,PVY+L-BR]]); ring(INK,PVX,PVY+L,BR);
    const ex=PVX+Math.sin(AMP)*L, ey=PVY+Math.cos(AMP)*L;
    stroke(INK,[[PVX,PVY],[PVX+Math.sin(AMP)*(L-BR),PVY+Math.cos(AMP)*(L-BR)]],[2.2,1.6]); ring(INK,ex,ey,BR,[2.2,1.6]);
    /* red pen: the arc of travel with a tick every 6 degrees, and the angle at the pivot */
    const RA=L+9; g.strokeStyle=RED; g.setLineDash([]); g.beginPath(); g.arc(PVX,PVY,RA,Math.PI/2-AMP,Math.PI/2+AMP); g.stroke();
    g.fillStyle=RED; g.beginPath(); g.arc(PVX+Math.cos(Math.PI/2+AMP)*RA,PVY+Math.sin(Math.PI/2+AMP)*RA,PW*1.1,0,TAU); g.fill();
    for(let k=-4;k<=4;k++){ const a=Math.PI/2+k*AMP/4, r2=RA+(k%2?1.6:2.8); stroke(RED,[[PVX+Math.cos(a)*RA,PVY+Math.sin(a)*RA],[PVX+Math.cos(a)*r2,PVY+Math.sin(a)*r2]]); }
    g.strokeStyle=RED; g.beginPath(); g.arc(PVX,PVY,11,Math.PI/2-AMP,Math.PI/2); g.stroke();
    g.font=MONO(4.2); g.fillStyle=INK; g.textAlign='right'; g.textBaseline='alphabetic'; g.fillText('FIG. 2',95,8.5);
    g.textAlign='left'; g.fillText('MM:SS:FF  25 FPS',X,76.5);
    return (c,t)=>{
      const u=mod(t,P), f=Math.floor(u*FPS+1e-6)/FPS, lt=Math.max(0,clock(f));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.drawImage(FG,0,0,px,px); reset(c,px);
      c.font=SANS(FS); c.fillStyle=INK; c.textAlign='left'; c.textBaseline='alphabetic';
      c.fillText(mmssff(lt,FPS),X,BASE);
    };
  } }

);
})();
