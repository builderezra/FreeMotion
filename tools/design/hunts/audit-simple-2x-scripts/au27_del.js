(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au27c',width:540,height:960}); await new Promise(r=>setTimeout(r,400));
 const setup=async()=>{ FM.scene.layers.length=0; const mk=(n,s,d)=>{const l=FM.makeLayer('video',{name:n,x:270,y:480,start:s,duration:d}); l.srcW=540;l.srcH=960;l.srcRev=0;l.muted=true; return l;};
   [mk('A',0,4),mk('B',4,4)].forEach(l=>FM.scene.layers.push(l)); FM.scene.project.duration=8; FM.history.reset(); FM.editor.set('simple'); FM.refreshAll(); await new Promise(r=>setTimeout(r,150)); };
 const say=()=>{const s=document.getElementById('sm-say'), ln=s&&s.querySelector('.sm-line'); return (ln&&ln.textContent)||''};
 const names=()=>FM.scene.layers.map(l=>l.name);
 await setup(); const B=FM.scene.layers[1].id; const a=await FM.spine.cmd.del(B); out.singleDelB={ret:a,names:names(),say:say()};
 await setup(); const A=FM.scene.layers[0].id; const b=await FM.spine.cmd.del(A); out.singleDelA={ret:b,names:names(),say:say()};
 await setup(); FM.selectLayer(FM.scene.layers[1].id); const c=await FM.spine.cmd.del(FM.scene.layers[1].id); out.selDelB={ret:c,names:names(),say:say()};
 try{FM.editor.set('full');await FM.projects.remove(me);}catch(e){}
}catch(e){out.err=String(e&&e.stack||e).slice(0,400)} return JSON.stringify(out);})()
