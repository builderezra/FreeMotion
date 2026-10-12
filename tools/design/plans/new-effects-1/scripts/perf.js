(function(){ const out={}; const W=1080,H=1920; const T=FM._FX_TABLES;
 const mk=()=>{ const d=new Uint8ClampedArray(W*H*4); let x=12345; for(let i=0;i<d.length;i+=4){ x^=x<<13;x^=x>>>17;x^=x<<5; d[i]=(x&255)*0.5+100; d[i+1]=((x>>8)&255)*0.5+60; d[i+2]=((x>>16)&255)*0.5+40; d[i+3]=255; } return d; };
 const time=(name,fn)=>{ const d=mk(); const t0=performance.now(); fn(d); out[name]=Math.round(performance.now()-t0); };
 time('huecycle',d=>T.PIXEL_FX.huecycle(d,W,H,FM.fxRegistry.makeInstance('huecycle').params,0.5,1));
 time('softskin r6',d=>T.PIXEL_FX.softskin(d,W,H,FM.fxRegistry.makeInstance('softskin').params,0.5,1));
 time('softskin r20',d=>T.PIXEL_FX.softskin(d,W,H,Object.assign(FM.fxRegistry.makeInstance('softskin').params,{radius:20}),0.5,1));
 time('oilpaint r3',d=>T.PIXEL_FX.oilpaint(d,W,H,FM.fxRegistry.makeInstance('oilpaint').params,0.5,1));
 time('oilpaint r8',d=>T.PIXEL_FX.oilpaint(d,W,H,Object.assign(FM.fxRegistry.makeInstance('oilpaint').params,{radius:8}),0.5,1));
 const A=document.createElement('canvas'); A.width=W;A.height=H; const g=A.getContext('2d'); g.fillStyle='#303840';g.fillRect(0,0,W,H); g.fillStyle='#f0ece0'; for(let i=0;i<40;i++) g.fillRect((i*97)%1000,(i*211)%1850,70,70);
 const run=(type,p)=>{ const B=document.createElement('canvas'); B.width=W;B.height=H; const t0=performance.now(); T.CANVAS_FX[type](A,B.getContext('2d',{willReadFrequently:true}),W,H,{x:0,y:0,w:W,h:H},Object.assign(FM.fxRegistry.makeInstance(type).params,p||{},{color:'#ffffff'}),0.5,1.2,null,1); B.getContext('2d').getImageData(0,0,1,1); out[type]=Math.round(performance.now()-t0); };
 run('glitter'); run('censor',{style:0}); run('censor',{style:1,strength:40}); run('popart'); run('popart',{layout:1});
 return JSON.stringify(out); })()
