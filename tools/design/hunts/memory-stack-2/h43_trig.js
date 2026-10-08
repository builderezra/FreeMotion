window.__h43t=async function(){
  var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})}, R=FM.fxRegistry;
  var L=FM.scene.layers.filter(function(l){return l.type==='image'})[0];
  var S=FM.scene.layers.filter(function(l){return l.type==='shape'})[0];
  // mask on the image
  var m=FM.masks.make('add'); m.path=[[200,300],[800,300],[800,1500],[200,1500]]; L.masks=[m];
  L.effects=[{type:'penmask',maskId:m.id}, R.makeInstance('objectblur'), R.makeInstance('fillbehind')];
  L.effects[1].params=Object.assign({},L.effects[1].params,{shutter:180,samples:8});
  // animate position so objectblur has travel
  L.transform.position=L.transform.position||{x:540,y:960};
  // container with partial strength
  var box=R.makeInstance(FM.FX_CONTAINER); box.effects=[R.makeInstance('pixelate')].filter(Boolean); box.params=box.params||{}; box.params.strength=0.5; L.effects.push(box);
  L.transform.rotationX=20; L.transform.rotationY=10;
  // outline + opacity on the shape
  S.stroke={enabled:true,width:12,color:'#ffffff'}; S.transform.opacity=0.6;
  // adjustment layer with a fractional container
  var A=FM.makeLayer('adjustment',{start:0,duration:6}); var b2=R.makeInstance(FM.FX_CONTAINER); b2.effects=[R.makeInstance('pixelate')].filter(Boolean); b2.params=b2.params||{}; b2.params.strength=0.5; A.effects=[b2]; FM.scene.layers.unshift(A);
  FM.refreshAll(); 
  for(var k=0;k<8;k++){FM.setTime(0.2*k); FM.requestRender&&FM.requestRender(); await sleep(250);}
  return 'triggers';
};
'ok'
