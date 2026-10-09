(async function(){ const out={steps:[]}; try{
 if(FM.home.isOpen()) FM.home.close();
 const live=new Set(); const proto=[OscillatorNode.prototype,AudioBufferSourceNode.prototype,ConstantSourceNode.prototype];
 proto.forEach(p=>{ const s=p.start,t=p.stop; p.start=function(){ live.add(this); this.addEventListener('ended',()=>live.delete(this)); return s.apply(this,arguments); }; p.stop=function(){ const r=t.apply(this,arguments); return r; }; });
 const count=()=>live.size; const kinds=()=>{const o={};live.forEach(n=>{const k=n.constructor.name;o[k]=(o[k]||0)+1;});return o;};
 const P=FM.scene.project; P.width=320;P.height=240;P.duration=6; FM.scene.layers.length=0; FM.history.reset();
 const wav=(sec,hz)=>{const rate=8000,n=Math.floor(rate*sec),buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);const put=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i));};put(0,'RIFF');dv.setUint32(4,36+n*2,true);put(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,rate,true);dv.setUint32(28,rate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);put(36,'data');dv.setUint32(40,n*2,true);for(let i=0;i<n;i++)dv.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*hz*i/rate)*12000),true);return new File([buf],'t'+hz+'.wav',{type:'audio/wav'});};
 const step=(n)=>out.steps.push([n,count(),JSON.stringify(kinds())]);
 const rec=await FM.loadVideoFile(wav(8,440)); FM.addMediaLayer(rec); const L=FM.scene.layers[0]; L.start=0; L.duration=6;
 for(const t of ['tremolo','chorus','autopan','phaser']) L.audioFx=(L.audioFx||[]).concat([FM.audioFxRegistry.makeInstance(t)]);
 FM.setTime(0); await FM.requestPlay(); await new Promise(r=>setTimeout(r,600)); step('playing with 4 LFO effects'); FM.pause();
 step('paused');
 // trim removes effects: remove the effects from the layer
 L.audioFx=[]; FM.setTime(0); await FM.requestPlay(); await new Promise(r=>setTimeout(r,400)); FM.pause(); await new Promise(r=>setTimeout(r,200)); step('effects removed from layer, then play/pause');
 L.audioFx=[FM.audioFxRegistry.makeInstance('tremolo')]; FM.setTime(0); await FM.requestPlay(); await new Promise(r=>setTimeout(r,400)); FM.pause(); step('one tremolo back');
 // switch project
 const keepId=FM.projects.currentId(); const nid=await FM.projects.create({name:'AU15 other',width:320,height:240}); await FM.projects.open(nid); await new Promise(r=>setTimeout(r,600)); step('after switching to another project');
 await FM.projects.open(keepId); await new Promise(r=>setTimeout(r,800)); step('after switching back'); await FM.projects.remove(nid);
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
