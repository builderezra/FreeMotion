(async function(){ const out={}; try{
 if(FM.home.isOpen()) FM.home.close();
 const P=FM.scene.project; P.width=320;P.height=240;P.duration=8; FM.scene.layers.length=0; FM.history.reset();
 const wav=(sec,hz)=>{const rate=8000,n=Math.floor(rate*sec),buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);const put=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i));};put(0,'RIFF');dv.setUint32(4,36+n*2,true);put(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,rate,true);dv.setUint32(28,rate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);put(36,'data');dv.setUint32(40,n*2,true);for(let i=0;i<n;i++)dv.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*hz*i/rate)*20000),true);return new File([buf],'t'+hz+'.wav',{type:'audio/wav'});};
 const mkLayer=async(hz)=>{ const rec=await FM.loadVideoFile(wav(6,hz)); const had=new Set(FM.scene.layers.map(l=>l.id)); FM.addMediaLayer(rec); return FM.scene.layers.find(l=>!had.has(l.id)); };
 const a=await mkLayer(300), b=await mkLayer(500);
 out.layers=FM.scene.layers.map(l=>[l.type,l.start,l.duration]);
 const st=(l)=>{const m=FM.media.get(l.id); return m&&m.el?{paused:m.el.paused,muted:m.el.muted,vol:+m.el.volume.toFixed(2),t:+m.el.currentTime.toFixed(2),rate:m.el.playbackRate}:null;};
 FM.setTime(0.5); await FM.requestPlay(); await new Promise(r=>setTimeout(r,700));
 out.playing=[FM.playing,st(a),st(b)];
 // solo a, b must be silenced
 a.solo=true; await new Promise(r=>setTimeout(r,300)); out.solo=[st(a),st(b)];
 a.solo=false; b.muted=true; b.volume=0; await new Promise(r=>setTimeout(r,300)); out.vol0=[st(a),st(b)];
 // delete b while playing
 const bm=FM.media.get(b.id); FM.deleteLayer(b.id); await new Promise(r=>setTimeout(r,200)); out.afterDelete=bm.el.paused;
 FM.pause(); await new Promise(r=>setTimeout(r,200)); out.afterPause=[FM.playing,st(a),bm.el.paused, FM.time];
 // everything paused in the document?
 out.anyPlaying=Object.values(FM.media.all()).filter(m=>m&&m.el&&!m.el.paused).length;
 // end of timeline stop
 FM.setTime(7.9); await FM.requestPlay(); await new Promise(r=>setTimeout(r,600)); out.atEnd=[FM.playing, FM.time, Object.values(FM.media.all()).filter(m=>m&&m.el&&!m.el.paused).length];
 FM.pause();
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,200);} return JSON.stringify(out);})()
