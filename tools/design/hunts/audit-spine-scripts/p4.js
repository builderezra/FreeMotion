(async function(){ const out={};
 try{
  if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
  const me=await FM.projects.create({name:'au22',width:540,height:960}); await new Promise(r=>setTimeout(r,300));
  FM.scene.layers.length=0; FM.history.reset();
  const mk=(o)=>Object.assign(FM.makeLayer('shape',{shape:'rect',x:270,y:480,shapeW:540,shapeH:960,fill:'#336699',start:0,duration:3}),o||{});
  const a=mk({}); a.sm={main:true,stay:false}; delete a.sm.stay; a.sm.tail=true; a.pick={b:'bx',i:0}; FM.scene.layers.push(a);
  FM.scene.project.sm={v:1,adopted:true};
  FM.scene.selectedId=a.id; FM.scene.selectedIds=[a.id];
  await FM.duplicateLayer(a.id,true);
  const dup=FM.scene.layers.find(l=>l.id!==a.id);
  out.duplicate={sm:dup.sm||null,pick:dup.pick||null};
  // paste
  if(FM.copySelection&&FM.pasteSelection){ FM.scene.selectedId=a.id; FM.scene.selectedIds=[a.id]; FM.copySelection(); const n0=FM.scene.layers.length; await FM.pasteSelection(); const ps=FM.scene.layers.filter(l=>l.id!==a.id&&l.id!==dup.id); out.paste={n:ps.length,sm:ps.map(l=>l.sm||null),pick:ps.map(l=>l.pick||null)}; } else out.paste='no copy/paste api';
  // split keeps
  FM.time=1.5; FM.scene.selectedId=a.id; await FM.splitLayer(a.id); const halves=FM.scene.layers.filter(l=>l.start===1.5); out.split=halves.map(l=>l.sm||null); out.head=a.sm||null; out.sm_in_splitLayer=String(FM.splitLayer).indexOf('sm')>=0;
  try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){ out.err=e.message+' '+(e.stack||'').slice(0,300); } return JSON.stringify(out); })()
