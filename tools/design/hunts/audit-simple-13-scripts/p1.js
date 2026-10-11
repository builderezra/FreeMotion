(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au24',width:540,height:960}); await new Promise(r=>setTimeout(r,400));
 FM.scene.project.duration=120; FM.scene.layers.length=0; FM.history.reset();
 out.hasEditor=!!FM.editor&&!!FM.simpleTimeline; out.mode0=FM.editor&&FM.editor.mode();
 const mk=(i,type)=>{ const l=type==='text'?FM.makeLayer('text',{text:'t'+i,x:270,y:480,start:(i%100)*1.1,duration:2}):FM.makeLayer('shape',{shape:'rect',x:270,y:480,shapeW:540,shapeH:960,fill:'#336699',start:(i%100)*1.1,duration:1.2}); return l; };
 const N=[0,20,300,1500]; out.rebuild={};
 for(const n of N){ FM.scene.layers.length=0; for(let i=0;i<n;i++) FM.scene.layers.push(mk(i,i%3===0?'text':'shape')); await FM.editor.request('simple'); const t0=performance.now(); FM.simpleTimeline.rebuild(); const ms=Math.round(performance.now()-t0); out.rebuild[n]={ms:ms,items:document.querySelectorAll('#sm-timeline .sm-item').length,innerW:Math.round(parseFloat(document.getElementById('sm-inner').style.width)||0)}; await FM.editor.request('full'); }
 // switching leaves the document and undo stack alone
 FM.scene.layers.length=0; for(let i=0;i<5;i++) FM.scene.layers.push(mk(i,'shape')); FM.history.reset(); FM.history.commit(); const before=JSON.stringify(FM.scene.layers.map(l=>l.id)); const steps0=FM.history._steps&&FM.history._steps().len;
 await FM.editor.request('simple'); await FM.editor.request('full'); out.sameDoc=before===JSON.stringify(FM.scene.layers.map(l=>l.id)); out.stepsSame=(FM.history._steps&&FM.history._steps().len)===steps0;
 // switching while playing
 FM.play&&FM.play(); await new Promise(r=>setTimeout(r,200)); out.playingDuringSwitch=!!FM.playing; const ok=await FM.editor.request('simple'); out.switchWhilePlaying=ok; out.stillPlaying=!!FM.playing; FM.pause&&FM.pause(); await FM.editor.request('full');
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){ out.err=(e&&e.message||String(e))+' '+((e&&e.stack)||'').slice(0,300); } return JSON.stringify(out); })()
