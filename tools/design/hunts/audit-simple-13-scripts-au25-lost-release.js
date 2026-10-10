(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au25',width:540,height:960}); await new Promise(r=>setTimeout(r,400));
 FM.scene.layers.length=0;
 const L=FM.makeLayer('shape',{shape:'rect',x:270,y:480,shapeW:300,shapeH:300,fill:'#336699',start:0,duration:5,name:'a'}); FM.scene.layers.push(L); FM.selectLayer(L.id); FM.requestRender&&FM.requestRender();
 const cv=document.getElementById('preview'); const r=cv.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2;
 const ev=(t,x,y,b)=>new PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:1,pointerType:'mouse',button:0,buttons:b,isPrimary:true});
 cv.dispatchEvent(ev('pointerdown',cx,cy,1)); window.dispatchEvent(ev('pointermove',cx+20,cy,1));
 out.live1=FM.canvasGestureLive();
 // release lost: no pointerup ever arrives. Later moves carry buttons 0.
 window.dispatchEvent(ev('pointermove',cx+60,cy,0)); window.dispatchEvent(ev('pointermove',cx+120,cy,0));
 out.liveAfterLostRelease=FM.canvasGestureLive();
 out.x=L.transform.x;
 const ok=await FM.editor.request(FM.editor.mode()==='simple'?'full':'simple'); out.switched=ok; out.mode=FM.editor.mode();
 FM._resetVpPointers(); try{await FM.projects.remove(me);}catch(e){}
}catch(e){out.err=String(e&&e.message||e)} return JSON.stringify(out);})()
