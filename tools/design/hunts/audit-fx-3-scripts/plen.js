(async function(){ const out={rows:[]}; const sleep=ms=>new Promise(r=>setTimeout(r,ms)); try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'pl',width:1080,height:1920}); await sleep(300);
 FM.scene.layers.length=0; FM.history.reset(); FM.addShapeLayer('ellipse'); const L=FM.scene.layers[0]; L.start=0; L.duration=4; L.effects=[FM.fxRegistry.makeInstance('glow')];
 FM.selectLayer(L.id); FM.layerPresets.list().slice().forEach(p=>FM.layerPresets.remove(p.name));
 const names=['Warm','My cinematic teal and orange look v2','Cinematic_Teal_Orange_Final_v2','Cinematic_Teal_Orange_Final_v2_FIX_new','https://example.com/a/very/long/name/path/x','日本語のとても長いプリセット名前のテスト用の名前です'];
 names.forEach(n=>FM.layerPresets.save(n,L)); FM.presetTags.set('lp:Warm',['a-very-long-tag-name-without-spaces-at-all-x','b']);
 FM.inspector.openCategory('presets'); await sleep(300);
 const ins=document.getElementById('inspector'); const r=ins.getBoundingClientRect(); out.inspectorRight=Math.round(r.right); out.scrollW=ins.scrollWidth; out.clientW=ins.clientWidth;
 [].slice.call(ins.querySelectorAll('.insp-preset-row')).forEach(row=>{ const nm=row.querySelector('.insp-preset-name'); const del=row.querySelector('.fxp-del'); const b=nm.getBoundingClientRect(), rb=row.getBoundingClientRect(), db=del?del.getBoundingClientRect():null; out.rows.push({name:nm.textContent.slice(0,40),nameRight:Math.round(b.right),rowRight:Math.round(rb.right),delLeft:db?Math.round(db.left):null,delRight:db?Math.round(db.right):null,rowH:Math.round(rb.height),clipped:b.right>rb.right+1||(db&&db.right>r.right+1)}); });
 FM.layerPresets.list().slice().forEach(p=>FM.layerPresets.remove(p.name));
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
