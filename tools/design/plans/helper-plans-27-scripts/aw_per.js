(function(){ const out={};
 try{
 const DEF={};FM.AUDIO_EFFECTS.forEach(d=>{DEF[d.type]=d;}); const types=FM.AUDIO_EFFECTS.map(d=>d.type); out.types=types.length;
 const AP=window.AudioParam.prototype, cnt={set:0,ramp:0,cancel:0,tgt:0,val:0}; const o={set:AP.setValueAtTime,ramp:AP.linearRampToValueAtTime,cancel:AP.cancelScheduledValues,tgt:AP.setTargetAtTime};
 AP.setValueAtTime=function(){cnt.set++;return o.set.apply(this,arguments)}; AP.linearRampToValueAtTime=function(){cnt.ramp++;return o.ramp.apply(this,arguments)}; AP.cancelScheduledValues=function(){cnt.cancel++;return o.cancel.apply(this,arguments)}; AP.setTargetAtTime=function(){cnt.tgt++;return o.tgt.apply(this,arguments)};
 const OAC=window.OfflineAudioContext; const run=(list)=>{ cnt.set=cnt.ramp=cnt.cancel=cnt.tgt=0; const oac=new OAC(2,48000*2,48000); const fx=list.map(t=>{const pr={};(DEF[t].params||[]).forEach(q=>{pr[q.key]=q.def;});return {type:t,enabled:true,params:pr};}); const chain=FM.buildAudioFxChain(oac,{audioFx:fx},0); const built=cnt.set; cnt.set=cnt.ramp=cnt.cancel=cnt.tgt=0; const t0=performance.now(); for(let i=0;i<120;i++) chain.applyAt(i/60); const ms=performance.now()-t0; return {effects:list.length, buildSets:built, per120:{set:cnt.set,ramp:cnt.ramp,cancel:cnt.cancel,tgt:cnt.tgt}, setPerSecAt60:cnt.set/2, msPer120:+ms.toFixed(2)}; };
 out.per={}; types.forEach(t=>{ const r=run([t]); out.per[t]=r.per120.set; }); out.one=run([types[0]]); out.five=run(types.slice(0,5)); out.all=run(types.slice(0,12));
 out.names=types.slice(0,40).join(',');
 AP.setValueAtTime=o.set;AP.linearRampToValueAtTime=o.ramp;AP.cancelScheduledValues=o.cancel;AP.setTargetAtTime=o.tgt;
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
