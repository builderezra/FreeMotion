(async function(){ const out={}; const sleep=ms=>new Promise(r=>setTimeout(r,ms)); try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'pl',width:1080,height:1920}); await sleep(300);
 FM.scene.layers.length=0; FM.history.reset(); FM.addShapeLayer('ellipse'); const L=FM.scene.layers[0]; L.start=0; L.duration=4; L.effects=[FM.fxRegistry.makeInstance('glow')];
 FM.selectLayer(L.id); FM.layerPresets.list().slice().forEach(p=>FM.layerPresets.remove(p.name));
 const long='W'.repeat(120), tag='T'.repeat(80);
 FM.layerPresets.save('Short',L); FM.layerPresets.save(long,L); FM.presetTags.set('lp:'+long,[tag,'a b c d e f g h i j k l m n o p']); FM.layerPresets.rename('Short','S'.repeat(300));
 FM.inspector.openCategory('presets'); await sleep(300);
 const ins=document.getElementById('inspector'); const r=ins.getBoundingClientRect();
 out.inspector={w:Math.round(r.width),sw:ins.scrollWidth,cw:ins.clientWidth};
 const over=[]; [].slice.call(ins.querySelectorAll('.insp-preset-row,.fxp-txt,.insp-preset-name,.fxp-desc,.preset-chip,.preset-chips,.preset-tools')).forEach(n=>{ const b=n.getBoundingClientRect(); if(b.right>r.right+1||n.scrollWidth>n.clientWidth+1) over.push(n.className+' right='+Math.round(b.right)+' limit='+Math.round(r.right)+' sw='+n.scrollWidth+' cw='+n.clientWidth); }); out.overflow=over.slice(0,8);
 out.docScroll=document.documentElement.scrollWidth>document.documentElement.clientWidth;
 FM.layerPresets.list().slice().forEach(p=>FM.layerPresets.remove(p.name));
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
