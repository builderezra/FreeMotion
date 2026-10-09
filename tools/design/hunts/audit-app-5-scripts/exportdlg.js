(async function(){ const out={rows:[]}; try{
 const errs=[]; window.addEventListener('error',e=>{ if(!/ResizeObserver/.test(e.message)) errs.push(e.message); });
 if(FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au18 exp',width:320,height:240}); await new Promise(r=>setTimeout(r,300));
 const g=id=>document.getElementById(id);
 const hostile=[null,'{"v":2,"format":"avi","quality":{"a":1}}','{"v":2,"format":"mp4","quality":"NaN"}','not json','[]','{"v":2}'];
 const sizes=[[16,16],[100,7],[7680,4320],[1080,1920],[1081,1921],[3840,2160]], fpss=[30,23.976,1000,0.5,NaN];
 for(const [w,h] of sizes) for(const f of fpss){ const P=FM.scene.project; P.width=w;P.height=h;P.fps=f; errs.length=0;
   try{ await FM.showExportDialog(); }catch(e){ out.rows.push([w+'x'+h,f,'THREW '+e.message]); continue; }
   await new Promise(r=>setTimeout(r,30));
   const res=[].map.call(g('exp-res').options,o=>o.textContent); const fp=g('exp-fps').options[0].textContent;
   const bad=res.concat([fp]).filter(t=>/NaN|undefined|Infinity|null/.test(t));
   if(bad.length||errs.length) out.rows.push([w+'x'+h,f,'bad labels: '+bad.join(' | ')+' errs '+errs.join(',')]);
   g('export-dialog').classList.add('hidden'); }
 for(const hp of hostile){ try{ if(hp===null) localStorage.removeItem('fm.exportPrefs'); else localStorage.setItem('fm.exportPrefs',hp); const P=FM.scene.project; P.width=1080;P.height=1920;P.fps=30; errs.length=0; await FM.showExportDialog(); await new Promise(r=>setTimeout(r,30)); out.rows.push(['prefs '+String(hp).slice(0,30),'format='+g('exp-format').value,'quality='+g('exp-quality').value,errs.length?('ERR '+errs.join(',')):'ok']); g('export-dialog').classList.add('hidden'); }catch(e){ out.rows.push(['prefs '+hp,'THREW '+e.message]); } }
 localStorage.removeItem('fm.exportPrefs'); try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
