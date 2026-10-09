(async function(){ const out={rows:[]}; try{
 if(FM.home.isOpen()) FM.home.close();
 const P=FM.scene.project; P.width=320;P.height=240;P.duration=6; FM.scene.layers.length=0; FM.history.reset();
 const A=0.4;
 const wav=(sec,hz)=>{const rate=48000,n=Math.floor(rate*sec),buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);const put=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i));};put(0,'RIFF');dv.setUint32(4,36+n*2,true);put(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,rate,true);dv.setUint32(28,rate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);put(36,'data');dv.setUint32(40,n*2,true);for(let i=0;i<n;i++)dv.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*hz*i/rate)*A*32767),true);return new File([buf],'t'+hz+'.wav',{type:'audio/wav'});};
 const rec=await FM.loadVideoFile(wav(8,440));
 const mk=()=>{ const had=new Set(FM.scene.layers.map(l=>l.id)); FM.addMediaLayer(rec); const l=FM.scene.layers.find(x=>!had.has(x.id)); return l; };
 const peakAt=(buf,t0,t1)=>{ const sr=buf.sampleRate,i0=Math.floor(t0*sr),i1=Math.floor(t1*sr); let p=0; for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c); for(let i=i0;i<i1&&i<d.length;i++){const v=Math.abs(d[i]); if(v>p)p=v;}} return p; };
 const run=async(name,setup,from,to,ts,expect)=>{ FM.scene.layers.length=0; const L=mk(); L.start=0; L.duration=6; const extra=setup(L)||[]; const scene={project:P,layers:FM.scene.layers,selectedId:null,selectedIds:[]};
   const rr=await FM.exporter.buildAudioMix(scene,from,to);
   // buildAudioMix returns an AudioBuffer-like or {buffer}
   const buf=rr&&rr.audioBuffer?rr.audioBuffer:rr; const row={name,from,to,pts:[]};
   if(!buf||!buf.getChannelData){ row.mix=String(rr); out.rows.push(row); return; }
   for(const t of ts){ const got=peakAt(buf,t-from-0.025,t-from+0.025); const e=expect(t,L); row.pts.push([t,+got.toFixed(3),+e.toFixed(3)]); }
   out.rows.push(row); };
 const lvl=(L,t)=>FM.layerVolume(L,t)*FM.fadeMul(L,t-L.start,L.duration)*A;
 await run('static 0.5',L=>{L.volume=0.5;},0,6,[0.5,2,4,5.5],(t,L)=>lvl(L,t));
 await run('boost 1.5',L=>{L.volume=1.5;},0,6,[0.5,2,4],(t,L)=>lvl(L,t));
 await run('fade in/out 1s',L=>{L.fadeIn=1;L.fadeOut=1;},0,6,[0.25,0.5,0.75,2,3,5.25,5.5,5.75],(t,L)=>lvl(L,t));
 await run('kf volume 0->1 over 4s',L=>{L.volume={kf:[{t:0,v:0,e:'linear'},{t:4,v:1,e:'linear'}]};},0,6,[0.5,1,2,3,4,5],(t,L)=>lvl(L,t));
 await run('kf volume + fade',L=>{L.volume={kf:[{t:0,v:1,e:'linear'},{t:3,v:0.3,e:'linear'}]};L.fadeIn=1;},0,6,[0.25,0.5,2,3,4],(t,L)=>lvl(L,t));
 await run('muted',L=>{L.muted=true;},0,6,[1,3],(t,L)=>0);
 await run('hidden',L=>{L.visible=false;},0,6,[1,3],(t,L)=>0);
 await run('range 2..4 static 0.7',L=>{L.volume=0.7;},2,4,[2.2,3,3.8],(t,L)=>lvl(L,t));
 await run('range 2..4 fadeOut 2s (clip 0..6)',L=>{L.fadeOut=2;},2,4,[2.2,3,3.8],(t,L)=>lvl(L,t));
 await run('clip starts at 1.5 dur 3',L=>{L.start=1.5;L.duration=3;},0,6,[1,2,3,4.2,5],(t,L)=>(t>=L.start&&t<L.start+L.duration)?A:0);
 await run('trim start 2',L=>{L.trimStart=2;},0,6,[1,3],(t,L)=>A);
 await run('speed 2 (clip dur 3)',L=>{L.speed=2;L.duration=3;},0,6,[1,2,4],(t,L)=>t<3?A:0);
 await run('volume 0 keyframed to 0',L=>{L.volume={kf:[{t:0,v:0,e:'linear'},{t:6,v:0,e:'linear'}]};},0,6,[1,3],(t,L)=>0);
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
