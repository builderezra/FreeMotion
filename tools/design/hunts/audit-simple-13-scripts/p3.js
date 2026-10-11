(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au24c',width:540,height:960}); await new Promise(r=>setTimeout(r,400));
 FM.scene.project.duration=10; FM.scene.layers.length=0; FM.history.reset();
 const L=FM.makeLayer('shape',{shape:'rect',x:270,y:480,shapeW:300,shapeH:300,fill:'#336699',start:0,duration:5,name:'S'}); FM.scene.layers.push(L); FM.history.commit(); FM.selectLayer(L.id);
 const cv=document.getElementById('preview'); const r=cv.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2;
 const ev=(t,x,y)=>new PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:7,button:0,buttons:t==='pointerup'?0:1,isPrimary:true,pointerType:'mouse'});
 cv.dispatchEvent(ev('pointerdown',cx,cy)); window.dispatchEvent(ev('pointermove',cx+30,cy+10)); document.dispatchEvent(ev('pointermove',cx+40,cy+12)); await new Promise(r=>setTimeout(r,50));
 out.dragLive = FM.canvasEdit&&FM.canvasEdit.cancelDrag? 'cancelable' : 'n/a';
 const x0=L.transform.x; out.moved = typeof x0==='object'?'anim':x0;
 out.editorMode0=FM.editor.mode(); out.gestureLive=FM.timeline.gestureLive(); out.canvasGestureLive=typeof FM.canvasGestureLive;
 const ok=await FM.editor.request('simple'); out.switchedDuringCanvasDrag=ok&&FM.editor.mode()==='simple';
 window.dispatchEvent(ev('pointerup',cx+40,cy+12)); document.dispatchEvent(ev('pointerup',cx+40,cy+12)); cv.dispatchEvent(ev('pointerup',cx+40,cy+12));
 await new Promise(r=>setTimeout(r,100)); out.afterX=L.transform.x;
 await FM.editor.request('full'); try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){ out.err=(e&&e.message||String(e))+' '+((e&&e.stack)||'').slice(0,300); } return JSON.stringify(out); })()
