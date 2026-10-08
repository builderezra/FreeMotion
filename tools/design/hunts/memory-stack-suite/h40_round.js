window.__rseed=window.__rseed||1;
window.__rnd=function(){window.__rseed=(window.__rseed*1664525+1013904223)>>>0;return window.__rseed/4294967296;};
window.__img=async function(w,h,hue){
  var c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d');
  var gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'hsl('+hue+',70%,50%)');gr.addColorStop(1,'hsl('+(hue+90)+',70%,30%)');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='#fff';g.fillRect(w*0.3,h*0.3,w*0.4,h*0.4);
  var b=await new Promise(function(r){c.toBlob(r,'image/png');});
  return new File([b],'a'+hue+'.png',{type:'image/png'});
};
window.__round=async function(tag,opts){
  opts=opts||{};
  var R=FM.fxRegistry, types=R.all().map(function(f){return f.type});
  var log={tag:tag,ops:0,errs:[]};
  function er(e,where){ if(log.errs.length<5) log.errs.push(where+': '+String(e).slice(0,80)); }
  // a project per round, with media + text + shape
  var pid=await FM.projects.create({name:'Audit '+tag,width:1080,height:1920}); log.pid=pid;
  if(pid&&FM.projects.open) { try{await FM.projects.open(pid);}catch(e){er(e,'open');} }
  var layers=[];
  try{ var t1=FM.makeLayer('text',{text:'Round '+tag,x:540,y:400,start:0,duration:6}); FM.scene.layers.unshift(t1); layers.push(t1);}catch(e){er(e,'text');}
  try{ var s1=FM.makeLayer('shape',{shape:'rect',x:540,y:900,shapeW:500,shapeH:500,fill:'#c05030',start:0,duration:6}); FM.scene.layers.unshift(s1); layers.push(s1);}catch(e){er(e,'shape');}
  for(var k=0;k<2;k++){ try{ var f=await __img(900,1200,(k*120+ (opts.hue||0))%360); var rec=await FM.loadImageFile(f); FM.addMediaLayer(rec); }catch(e){er(e,'img');} }
  FM.refreshAll&&FM.refreshAll();
  var cv=document.createElement('canvas');cv.width=270;cv.height=480;var g=cv.getContext('2d');cv.__fmRS=0.25;cv.__fmOX=0;cv.__fmOY=0;
  var n=opts.fx||40;
  for(var i=0;i<n;i++){
    var L=FM.scene.layers[Math.floor(__rnd()*FM.scene.layers.length)]; if(!L)continue;
    var ty=types[Math.floor(__rnd()*types.length)];
    try{
      var inst=R.makeInstance(ty); if(!inst)continue;
      if(R.supportsLayer&&!R.supportsLayer(ty,L))continue;
      L.effects=(L.effects||[]).concat([inst]);
      var t=__rnd()*5;
      FM.setTime&&FM.setTime(t);
      FM.renderScene(g,{project:FM.scene.project,layers:FM.scene.layers,selectedId:null,selectedIds:[]},t);
      FM.history&&FM.history.commit&&FM.history.commit();
      if(__rnd()<0.5)L.effects=L.effects.slice(0,-1);
      log.ops++;
    }catch(e){er(e,'fx '+ty);}
  }
  // scrub
  for(var s=0;s<30;s++){ try{ var tt=__rnd()*5; FM.setTime(tt); FM.renderScene(g,{project:FM.scene.project,layers:FM.scene.layers,selectedId:null,selectedIds:[]},tt);}catch(e){er(e,'scrub');} }
  // undo/redo
  for(var u=0;u<12;u++){ try{FM.history.undo();}catch(e){er(e,'undo');} }
  for(var u2=0;u2<12;u2++){ try{FM.history.redo();}catch(e){er(e,'redo');} }
  // fx browser open/close
  try{ var L0=FM.scene.layers[0]; FM.selectLayer(L0.id); FM.inspector.openCategory('effects'); await new Promise(function(r){setTimeout(r,200)}); if(FM.fxBrowser&&FM.fxBrowser.open){FM.fxBrowser.open(FM.scene.layers[0]); await new Promise(function(r){setTimeout(r,600)}); FM.fxBrowser.close&&FM.fxBrowser.close();} }catch(e){er(e,'fxb');}
  try{ await FM.storage.save(); }catch(e){er(e,'save');}
  return JSON.stringify(log);
};
'round defined'
