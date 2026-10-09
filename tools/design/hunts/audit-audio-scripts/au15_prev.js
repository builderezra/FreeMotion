(async function(){ const out={rows:[]}; try{
 if(FM.home.isOpen()) FM.home.close();
 const P=FM.scene.project; P.width=320;P.height=240;P.duration=6; FM.scene.layers.length=0; FM.history.reset();
 const wav=(sec,hz)=>{const rate=8000,n=Math.floor(rate*sec),buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);const put=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i));};put(0,'RIFF');dv.setUint32(4,36+n*2,true);put(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,rate,true);dv.setUint32(28,rate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);put(36,'data');dv.setUint32(40,n*2,true);for(let i=0;i<n;i++)dv.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*hz*i/rate)*12000),true);return new File([buf],'t.wav',{type:'audio/wav'});};
 const rec=await FM.loadVideoFile(wav(8,440));
 const run=async(name,setup,secs)=>{ FM.pause(); FM.scene.layers.length=0; const had=new Set(); FM.addMediaLayer(rec); const L=FM.scene.layers[0]; L.start=0; L.duration=6; setup(L); FM.setTime(0); await FM.requestPlay(); const m=FM.media.get(L.id); const pts=[]; const t0=performance.now();
   while((performance.now()-t0)<secs*1000){ await new Promise(r=>setTimeout(r,250)); const t=FM.time; const exp=FM.layerVolume(L,t)*FM.fadeMul(L,t-L.start,L.duration); pts.push([+t.toFixed(2),+(m.el.muted?0:Math.min(1,m.el.volume)).toFixed(3),+Math.min(1,exp).toFixed(3),m.el.paused]); }
   FM.pause(); out.rows.push({name,pts}); };
 await run('kf 0->1 over 4s',L=>{L.volume={kf:[{t:0,v:0.2,e:'linear'},{t:4,v:1,e:'linear'}]};},3);
 await run('fade in 2s + vol .6',L=>{L.volume=0.6;L.fadeIn=2;},2.5);
 await run('muted',L=>{L.muted=true;},1);
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
