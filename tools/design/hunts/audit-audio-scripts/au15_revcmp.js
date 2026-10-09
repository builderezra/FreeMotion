(async function(){ const out={rows:[]}; try{
 if(FM.home.isOpen()) FM.home.close();
 const P=FM.scene.project; P.width=320;P.height=240;P.duration=10; FM.scene.layers.length=0; FM.history.reset();
 const SR=48000;
 const wav=(sec)=>{const n=Math.floor(SR*sec),buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);const put=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i));};put(0,'RIFF');dv.setUint32(4,36+n*2,true);put(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,SR,true);dv.setUint32(28,SR*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);put(36,'data');dv.setUint32(40,n*2,true);for(let i=0;i<n;i++){ const t=i/SR; dv.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*(200+60*t)*t)*0.5*32767*(0.3+0.7*(t/sec))),true);} return new File([buf],'chirp.wav',{type:'audio/wav'});};
 const cases=[['plain, audio 8s clip 8s',8,l=>{}],['trimStart 1.5',8,l=>{l.trimStart=1.5;l.duration=5;}],['speed 1.5',8,l=>{l.speed=1.5;l.duration=4;}],['clip 3s of 8s audio',8,l=>{l.duration=3;}],['clip 6s but audio 4s',4,l=>{l.duration=6;}],['ramped speed 1->2',8,l=>{l.speed={kf:[{t:0,v:1,e:'linear'},{t:4,v:2,e:'linear'}]};l.duration=4;}]];
 for(const [name,sec,setup] of cases){
   FM.pause(); FM.scene.layers.length=0; const rec=await FM.loadVideoFile(wav(sec)); FM.addMediaLayer(rec); const L=FM.scene.layers[0]; L.start=0; L.duration=Math.min(sec,8); L.reversed=true; setup(L);
   const m=FM.media.get(L.id); if(!m.audioBuffer){ if(FM.decodeAudio){ m.audioBuffer=await FM.decodeAudio(m.file);} }
   // preview: start the reversed voice then read the synthesised buffer
   FM.setTime(0); m._revBuf=null; await FM.requestPlay(); await new Promise(r=>setTimeout(r,300)); FM.pause(); const pb=m._revBuf;
   // export
   const scene={project:P,layers:FM.scene.layers,selectedId:null,selectedIds:[]};
   const mix=await FM.exporter.buildAudioMix(scene,0,L.duration); const eb=mix&&mix.audioBuffer;
   const row={name};
   if(!pb) row.err='no preview buffer'; else if(!eb) row.err='no export mix'; else {
     const a=pb.getChannelData(0), b=eb.getChannelData(0); const n=Math.min(a.length,b.length); row.len=[a.length,b.length]; row.sr=[pb.sampleRate,eb.sampleRate];
     let s=0,e=0,cnt=0, maxd=0; const lo=Math.floor(0.08*SR), hi=n-Math.floor(0.08*SR);
     for(let i=lo;i<hi;i++){ const d=a[i]-b[i]; s+=a[i]*a[i]; e+=d*d; cnt++; if(Math.abs(d)>maxd)maxd=Math.abs(d); }
     row.rel=+(Math.sqrt(e/cnt)/Math.sqrt(s/cnt||1)).toFixed(4); row.maxd=+maxd.toFixed(4);
     // best lag
     let best=0,bl=0; for(let lag=-200;lag<=200;lag+=1){ let ee=0,c=0; for(let i=lo;i<hi;i+=7){ const j=i+lag; if(j<0||j>=b.length) continue; const d=a[i]-b[j]; ee+=d*d; c++; } if(best===0||ee/c<best){best=ee/c;bl=lag;} } row.bestLag=bl;
   }
   out.rows.push(row); }
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
