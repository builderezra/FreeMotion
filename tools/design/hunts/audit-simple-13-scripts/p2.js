(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au24b',width:540,height:960}); await new Promise(r=>setTimeout(r,400));
 FM.scene.project.duration=30; FM.scene.layers.length=0; FM.history.reset();
 const mk=(i)=>FM.makeLayer('shape',{shape:'rect',x:270,y:480,shapeW:540,shapeH:960,fill:'#336699',start:i*2,duration:2,name:'S'+i});
 for(let i=0;i<4;i++) FM.scene.layers.push(mk(i)); FM.history.commit();
 const wait=ms=>new Promise(r=>setTimeout(r,ms)); const clips=()=>[...document.querySelectorAll('#sm-timeline .sm-item')];
 await FM.editor.request('simple'); await wait(100);
 out.clips0=clips().length; const x0=clips().map(c=>Math.round(parseFloat(c.style.left)));
 // zoom
 FM.timeline.zoomBy(1.5); await wait(200); const x1=clips().map(c=>Math.round(parseFloat(c.style.left))); out.zoomMoved=JSON.stringify(x0)!==JSON.stringify(x1);
 // selection
 FM.selectLayer(FM.scene.layers[1].id); await wait(100); out.selCount=document.querySelectorAll('#sm-timeline .sm-item.sel').length;
 // delete in Simple (Full's deleteSelected)
 const n0=clips().length; FM.deleteSelected&&FM.deleteSelected(); await wait(200); out.afterDelete=clips().length; out.deleteChanged=n0!==clips().length;
 // undo restores
 FM.history.undo(); await wait(200); out.afterUndo=clips().length;
 // playhead scroll follows setTime
 FM.setTime&&FM.setTime(5); await wait(200); out.scrollLeftAt5=Math.round(document.getElementById('sm-scroll').scrollLeft); out.pps=Math.round(FM.timeline.pxPerSec());
 // add layer from Full API while in Simple
 FM.scene.layers.push(mk(5)); FM.history.commit(); FM.timeline.rebuild(); await wait(150); out.afterAdd=clips().length;
 // mode round trip keeps selection
 const sel=FM.scene.selectedId; await FM.editor.request('full'); await FM.editor.request('simple'); out.selKept=FM.scene.selectedId===sel;
 // collab: is an active session blocking? (not here)
 // reload-state: card remembers
 out.card=(FM.projects.list().find(p=>p.id===FM.storage.openProjectId())||{}).editor;
 await FM.editor.request('full');
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){ out.err=(e&&e.message||String(e))+' '+((e&&e.stack)||'').slice(0,300); } return JSON.stringify(out); })()
