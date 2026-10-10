(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au27d',width:540,height:960}); await new Promise(r=>setTimeout(r,400));
 FM.scene.layers.length=0; const mk=(n,s,d)=>{const l=FM.makeLayer('video',{name:n,x:270,y:480,start:s,duration:d}); l.srcW=540;l.srcH=960;l.srcRev=0;l.muted=true; return l;};
 [mk('A',0,4),mk('B',4,4)].forEach(l=>FM.scene.layers.push(l)); FM.scene.project.duration=8; FM.history.reset(); FM.editor.set('simple'); FM.refreshAll(); await new Promise(r=>setTimeout(r,150));
 const say=()=>{const s=document.getElementById('sm-say'), ln=s&&s.querySelector('.sm-line'); return ((ln&&ln.textContent)||'')+'|cls:'+(s&&s.className)};
 const A=FM.scene.layers[0].id; const seen=[]; const ps=[]; for(let i=0;i<6;i++){ ps.push(FM.spine.cmd.duplicate(A)); seen.push(say().slice(0,70)); }
 out.sayAfterEachCall=seen; out.queueLen=FM.spine.queue.length;
 await Promise.all(ps); for(let i=0;i<300&&FM.spine.running;i++) await new Promise(r=>setTimeout(r,10)); await new Promise(r=>setTimeout(r,80));
 out.count=FM.scene.layers.length; out.finalSay=say().slice(0,90);
 try{FM.editor.set('full');await FM.projects.remove(me);}catch(e){}
}catch(e){out.err=String(e&&e.stack||e).slice(0,400)} return JSON.stringify(out);})()
