(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au27b',width:540,height:960}); await new Promise(r=>setTimeout(r,400));
 const setup=async()=>{ FM.scene.layers.length=0; const mk=(n,s,d)=>{const l=FM.makeLayer('video',{name:n,x:270,y:480,start:s,duration:d}); l.srcW=540;l.srcH=960;l.srcRev=0;l.muted=true; return l;};
   [mk('A',0,4),mk('B',4,4)].forEach(l=>FM.scene.layers.push(l)); FM.scene.project.duration=8; delete FM.scene.project.sm; FM.history.reset(); FM.editor.set('simple'); FM.refreshAll(); await new Promise(r=>setTimeout(r,150)); };
 const describe=()=>FM.scene.layers.map(l=>l.name+'@'+l.start.toFixed(3)+'+'+l.duration.toFixed(3));
 const idle=async()=>{ for(let i=0;i<300&&FM.spine.running;i++) await new Promise(r=>setTimeout(r,10)); await new Promise(r=>setTimeout(r,60)); };
 await setup(); FM.time=2; const p=[FM.spine.cmd.split(null,2),FM.spine.cmd.split(null,2)]; const r=await Promise.all(p); await idle();
 out.doubleSplit={ret:r,layers:describe(),steps:FM.history._steps().len,say:(document.getElementById('sm-say')||{}).textContent};
 await setup(); const A=FM.scene.layers[0].id; const q=[]; for(let i=0;i<6;i++) q.push(FM.spine.cmd.duplicate(A)); const rr=await Promise.all(q); await idle();
 out.sixDup={ret:rr,count:FM.scene.layers.length,say:((document.getElementById('sm-say')||{}).textContent||'').slice(0,80)};
 await setup(); const B=FM.scene.layers[1].id; const ps=[FM.spine.cmd.del(B),FM.spine.cmd.del(B)]; const r3=await Promise.all(ps); await idle();
 out.doubleDel={ret:r3,layers:describe(),steps:FM.history._steps().len};
 try{FM.editor.set('full');await FM.projects.remove(me);}catch(e){}
}catch(e){out.err=String(e&&e.stack||e).slice(0,400)} return JSON.stringify(out);})()
