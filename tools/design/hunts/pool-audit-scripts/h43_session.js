window.__poolBytes=function(){
  var names=['_pmPool','_mbPool','_fcPool','_sqPool','_t3Pool','_dfPool','_miPool','_pxPool','_fbPool','_olPool','_adjFcPool','_ckCanvases','_lkCanvases','_pfPool','_wpPool','_cfPool','_expPool','_mgPool','_dspPool'];
  var out={};
  Object.keys(FM.__audit||{}).forEach(function(k){
    var nm=k.split(':')[2]; if(names.indexOf(nm)<0)return;
    var v=FM.__audit[k](),b=0,n=0;
    function cv(c){return c&&c.nodeName==='CANVAS'?c.width*c.height*4:0;}
    (v||[]).forEach(function(e){ if(!e)return; n++; if(e.nodeName==='CANVAS')b+=cv(e); else for(var p in e)b+=cv(e[p]); });
    out[nm]=[n,b];
  });
  return out;
};
window.__h43=async function(stage,types){
  var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
  var R=FM.fxRegistry;
  if(stage==='setup'){
    var pid=await FM.projects.create({name:'H43',width:1080,height:1920}); await FM.projects.open(pid);
    FM.scene.layers.length=0;
    var f=await __img(900,1200,200); var rec=await FM.loadImageFile(f); FM.addMediaLayer(rec); FM.scene.project.width=1080; FM.scene.project.height=1920;
    var s=FM.makeLayer('shape',{shape:'rect',x:540,y:900,shapeW:400,shapeH:400,fill:'#c05030',start:0,duration:6}); FM.scene.layers.unshift(s);
    FM.refreshAll(); await sleep(500); return 'setup';
  }
  if(stage==='effects'){   // types: array of effect types, one at a time on the image layer
    var L=FM.scene.layers.filter(function(l){return l.type==='image'||l.type==='video'})[0]||FM.scene.layers[0];
    FM.selectLayer(L.id);
    for(var i=0;i<types.length;i++){
      var inst=R.makeInstance(types[i]); if(!inst)continue; if(R.supportsLayer&&!R.supportsLayer(types[i],L))continue;
      L.effects=[inst]; FM.setTime(0.3+(i%5)*0.4); FM.requestRender&&FM.requestRender(); await sleep(120);
    }
    L.effects=[]; return 'effects '+types.length;
  }
  if(stage==='tilt'){ var L2=FM.scene.layers[0]; L2.transform.rotationX=25; L2.transform.rotationY=15; FM.requestRender(); await sleep(400); L2.transform.rotationX=0; L2.transform.rotationY=0; return 'tilt'; }
  if(stage==='export'){
    FM.scene.project.duration=0.6; FM.scene.layers.forEach(function(l){l.duration=Math.min(l.duration,0.6)});
    FM.scene.layers[0].effects=[R.makeInstance('motionblur')].filter(Boolean);
    document.getElementById('exp-format').value='gif'; document.getElementById('exp-range').value='whole'; FM._setExportSoloId(null);
    try{ await FM._runExport(); }catch(e){ return 'export threw '+e; } return 'exported';
  }
  if(stage==='preview'){ for(var k=0;k<6;k++){FM.setTime(0.1*k); FM.requestRender&&FM.requestRender(); await sleep(150);} return 'preview'; }
  return 'unknown';
};
'ok'
