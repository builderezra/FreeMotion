(function(){ const out={outOfRange:[],badOption:[],notNum:[],kfOut:[],counts:{}}; let n=0;
 const types=FM.fxRegistry.allIncludingHidden().filter(Boolean).map(d=>d.type);
 for(const t of types){ const sc=FM.fxThumbs.previewScene(t); const hero=sc.layers.find(l=>l.effects&&l.effects.some(e=>e.type===t)); const e=hero.effects.find(e=>e.type===t); const base=FM.fxRegistry.makeInstance(t);
  const pds=FM.fxRegistry.paramsOf(t);
  pds.forEach(pd=>{ const v=e.params[pd.key]; const b=base.params[pd.key]; if(v===undefined) return; if(JSON.stringify(v)===JSON.stringify(b)) return; n++;
   if(pd.type==='range'){ const chk=(x,w)=>{ if(typeof x!=='number'||!isFinite(x)){ out.notNum.push(t+'.'+pd.key+' '+w+'='+JSON.stringify(x)); return;} if(pd.min!=null&&x<pd.min-1e-9||pd.max!=null&&x>pd.max+1e-9) out.outOfRange.push(t+'.'+pd.key+'='+x+' ['+pd.min+','+pd.max+']'+w); };
     if(v&&typeof v==='object'&&Array.isArray(v.kf)) v.kf.forEach(k=>chk(k.v,' (kf)')); else chk(v,''); }
   else if(pd.type==='segment'){ const ok=(pd.options||[]).some(o=>Array.isArray(o)&&(o[0]===v||+o[0]===+v)); if(!ok) out.badOption.push(t+'.'+pd.key+'='+JSON.stringify(v)); }
  }); }
 out.counts.overriddenParams=n; out.counts.types=types.length; return JSON.stringify(out); })()
