(async function(){ const out={steps:[]}; const sleep=ms=>new Promise(r=>setTimeout(r,ms)); try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'pt',width:1080,height:1920}); await sleep(300);
 FM.scene.layers.length=0; FM.history.reset(); FM.addShapeLayer('ellipse'); const L=FM.scene.layers[0]; L.start=0; L.duration=4; L.effects=[FM.fxRegistry.makeInstance('glow')];
 FM.selectLayer(L.id); FM.layerPresets.list().slice().forEach(p=>FM.layerPresets.remove(p.name)); FM.fxPresets.saved().forEach(p=>FM.fxPresets.remove(p.name));
 const chips=()=>[].slice.call(document.querySelectorAll('#inspector .preset-chip')).map(c=>c.textContent+(c.classList.contains('on')?'*':''));
 const rows=()=>[].slice.call(document.querySelectorAll('#inspector .insp-preset-name')).map(n=>n.textContent);
 FM.layerPresets.save('PA',L); FM.layerPresets.save('PB',L); FM.presetTags.set('lp:PA',['warm']);
 FM.inspector.openCategory('presets'); await sleep(200);
 out.steps.push({s:'start',chips:chips(),rows:rows()});
 [].slice.call(document.querySelectorAll('#inspector .preset-chip')).filter(c=>c.textContent==='warm')[0].click(); await sleep(200);
 out.steps.push({s:'filter warm on',chips:chips(),rows:rows()});
 // the user clears the tag from the hold menu (Tags... then empty)
 FM.presetTags.set('lp:PA',String('').split(',')); await sleep(250);
 out.steps.push({s:'tag cleared while filter active',chips:chips(),rows:rows(),hasSearch:!!document.querySelector('#inspector .preset-search')});
 // same via deleting the last preset that carries the tag
 FM.presetTags.set('lp:PA',['warm']); await sleep(200); [].slice.call(document.querySelectorAll('#inspector .preset-chip')).filter(c=>c.textContent.replace('*','')==='warm')[0]; 
 // fromPreset after rename
 FM.layerPresets.apply('PB',L); out.fromAfterApply=L.fromPreset;
 FM.layerPresets.rename('PB','PB2'); await sleep(200); out.fromAfterRename=L.fromPreset; out.updateBtn=!!document.querySelector('#inspector .insp-preset-update');
 out.layerPresetNames=FM.layerPresets.list().map(p=>p.name);
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out,null,1);})()
