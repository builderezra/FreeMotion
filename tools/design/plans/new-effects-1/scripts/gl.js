(function(){ const out={}; 
 const mk=(type)=>{ const L=FM.makeLayer('shape',{shape:'rect',x:160,y:120,shapeW:240,shapeH:180,fill:'#e8d8b0',start:0,duration:4}); const e=FM.fxRegistry.makeInstance(type); L.effects=[e]; return [L]; };
 const render=(layers,W,H,t)=>{ FM.scene=scene(layers,{project:{width:320,height:240,fps:30,duration:4,background:'#1a2230'}}); const c=document.createElement('canvas');c.width=W;c.height=H;c.__fmRS=W/320;c.__fmOX=0;c.__fmOY=0; const g=c.getContext('2d',{willReadFrequently:true}); FM.renderScene(g,FM.scene,t); return g.getImageData(0,0,W,H).data; };
 const none=(W,H)=>{ const l=mk('glitter'); l[0].effects=[]; return render(l,W,H,1.4); };
 for(const [W,H] of [[320,240],[160,120]]){ const a=render(mk('glitter'),W,H,1.4), b=none(W,H); let n=0; for(let i=0;i<a.length;i+=4) if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>24) n++; out[W]=n; }
 return JSON.stringify(out); })()
