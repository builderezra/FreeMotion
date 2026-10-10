(async function(){ const out={}; try{
 if(FM.home.isOpen()) FM.home.close();
 const NL=+(window.__nl||10), NF=+(window.__nf||20); const P=FM.scene.project; P.width=1080;P.height=1920;P.duration=6;
 FM.scene.layers.length=0; FM.history.reset();
 for(let i=0;i<NL;i++){ FM.addShapeLayer('rect'); const l=FM.scene.layers[0]; l.shapeW=300;l.shapeH=300; l.transform.x=200+(i%5)*160; l.transform.y=300+Math.floor(i/5)*160; l.start=0; l.duration=6; l.effects=[]; for(let k=0;k<NF;k++) l.effects.push(FM.fxRegistry.makeInstance(window.__fx||'glow')); }
 const layers=JSON.parse(JSON.stringify(FM.scene.layers)); const obj={app:'freemotion',project:Object.assign({},P,{name:'pf1 probe'}),layers:layers};
 FM.scene.layers.length=0; FM.history.reset();
 let lt=[]; try{ new PerformanceObserver(l=>l.getEntries().forEach(e=>lt.push(Math.round(e.duration)))).observe({entryTypes:['longtask']}); }catch(e){}
 let rs=0,rt=0; const orig=FM.renderScene; FM.renderScene=function(){ const t=performance.now(); const r=orig.apply(this,arguments); rs++; rt+=performance.now()-t; return r; };
 const t0=performance.now(); const ok=await FM.storage.importObject(obj); const t1=performance.now();
 await new Promise(r=>setTimeout(r,2500)); const t2=performance.now(); FM.renderScene=orig;
 out.ok=ok; out.layers=FM.scene.layers.length; out.importMs=Math.round(t1-t0); out.renderCalls=rs; out.renderMs=Math.round(rt); out.long=lt; out.settle=Math.round(t2-t1);
 try{ for(const p of FM.projects.list().filter(p=>/pf1 probe/.test(p.name))) await FM.projects.remove(p.id);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,200);} return JSON.stringify(out);})()
