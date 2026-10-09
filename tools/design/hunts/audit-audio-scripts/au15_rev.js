(async function(){ const out={steps:[]}; try{
 if(FM.home.isOpen()) FM.home.close();
 const live=new Set(); const proto=[OscillatorNode.prototype,AudioBufferSourceNode.prototype,ConstantSourceNode.prototype];
 proto.forEach(p=>{ const s=p.start,t=p.stop; p.start=function(){ live.add(this); this.addEventListener('ended',()=>live.delete(this)); return s.apply(this,arguments); }; p.stop=function(){ const r=t.apply(this,arguments); return r; }; });
 const count=()=>live.size; const kinds=()=>{const o={};live.forEach(n=>{const k=n.constructor.name;o[k]=(o[k]||0)+1;});return o;};
 const P=FM.scene.project; P.width=320;P.height=240;P.duration=6; FM.scene.layers.length=0; FM.history.reset();
 const wav=(sec,hz)=>{const rate=8000,n=Math.floor(rate*sec),buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);const put=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i));};put(0,'RIFF');dv.setUint32(4,36+n*2,true);put(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,rate,true);dv.setUint32(28,rate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);put(36,'data');dv.setUint32(40,n*2,true);for(let i=0;i<n;i++)dv.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*hz*i/rate)*12000),true);return new File([buf],'t'+hz+'.wav',{type:'audio/wav'});};
 const step=(n)=>out.steps.push([n,count(),JSON.stringify(kinds())]);
 const mk=async(hz,rev)=>{ const had=new Set(FM.scene.layers.map(l=>l.id)); FM.addMediaLayer(await FM.loadVideoFile(wav(6,hz))); const l=FM.scene.layers.find(x=>!had.has(x.id)); l.start=0; l.duration=5; l.reversed=!!rev; return l; };
 const playFor=async(n)=>{ FM.setTime(0.3); await FM.requestPlay(); await new Promise(r=>setTimeout(r,600)); step(n); FM.pause(); await new Promise(r=>setTimeout(r,250)); };
 const R=await mk(300,true);
 await playFor('reversed plain');
 R.muted=true; await playFor('reversed muted'); R.muted=false;
 R.volume=0; await playFor('reversed volume 0'); R.volume=1;
 R.visible=false; await playFor('reversed hidden'); R.visible=true;
 const O=await mk(500,false); O.solo=true; await playFor('reversed + another layer soloed'); O.solo=false;
 R.solo=true; await playFor('reversed itself soloed'); R.solo=false;
 // inside a hidden group
 FM.scene.selectedIds=[R.id,O.id]; FM.scene.selectedId=R.id; FM.groupSelection(); const G=FM.scene.layers.find(l=>l.type==='group'); G.visible=false; await playFor('reversed in hidden group (and forward too)'); G.visible=true;
 R.volume={kf:[{t:0,v:0,e:'linear'},{t:5,v:0,e:'linear'}]}; await playFor('reversed keyframed volume 0'); 
 R.volume=1; R.fadeIn=4; R.fadeOut=0; await playFor('reversed with fade in 4s (starts at 0.3 into a reversed clip)');
 const el=FM.media.get(O.id)&&FM.media.get(O.id).el; out.forwardEl=el?{paused:el.paused,muted:el.muted}:null;
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
