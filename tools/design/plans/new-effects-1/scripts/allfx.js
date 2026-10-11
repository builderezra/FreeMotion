(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'allfx',width:540,height:960}); await new Promise(r=>setTimeout(r,300));
 const P=FM.scene.project; P.width=540;P.height=960;P.duration=4; FM.scene.layers.length=0; FM.history.reset();
 const file=await fetch('fx-art/bay.jpg').then(r=>r.blob()).then(b=>new File([b],'bay.jpg',{type:'image/jpeg'}));
 const photo=await FM.loadImageFile(file); FM.addMediaLayer(photo); const L=FM.scene.layers[0]; L.start=0;L.duration=4; L.transform.scale=Math.max(540/photo.width,960/photo.height);
 FM.addTextLayer(); FM.textEdit&&FM.textEdit.stop&&FM.textEdit.stop(); const T=FM.scene.layers[0]; T.text='Abc'; T.fontSize=160; T.start=0;T.duration=4;
 const CW=135,CH=240; const hash=(d)=>{ let h=2166136261; for(let i=0;i<d.length;i++){ h^=d[i]; h=Math.imul(h,16777619);} return (h>>>0).toString(16); };
 const types=FM.fxRegistry.all().map(e=>e.type).slice(0,205);
 for(const ty of types){ for(const [name,lay] of [['photo',L],['text',T]]){ const other=lay===L?T:L; other.visible=false; lay.visible=true; const inst=FM.fxRegistry.makeInstance(ty); lay.effects=[inst]; const c=document.createElement('canvas');c.width=CW;c.height=CH;c.__fmRS=CW/540;c.__fmOX=0;c.__fmOY=0; const g=c.getContext('2d',{willReadFrequently:true}); try{ FM.renderScene(g,FM.scene,1.2); out[ty+':'+name]=hash(g.getImageData(0,0,CW,CH).data); }catch(e){ out[ty+':'+name]='ERR '+e.message.slice(0,40); } lay.effects=[]; } }
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
