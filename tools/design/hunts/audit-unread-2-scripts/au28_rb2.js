(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const n0=FM.projects.list().length;
 const mkEntry=(name,layers,proj)=>({app:'freemotion',project:Object.assign({name:name,width:540,height:960,fps:30,duration:3},proj||{}),layers:layers,selectedId:null});
 const good=mkEntry('AU28 good',[]);
 const cases={ good:good, nullLayer:mkEntry('AU28 nullLayer',[null]), numLayer:mkEntry('AU28 numLayer',[5,'x']), noTransform:mkEntry('AU28 noTransform',[{id:'a',type:'shape'}]), badDur:mkEntry('AU28 badDur',[],{duration:'abc',width:'x'}), hugeW:mkEntry('AU28 hugeW',[],{width:1e9,height:1e9}) };
 for(const k of Object.keys(cases)){ const before=FM.projects.list().length; const r=await FM.storage.restoreBackup({app:'freemotion',backup:true,projects:[cases[k]]},null); const after=FM.projects.list().length;
   out[k]={ok:r.ok,restored:r.restored,failed:r.failed,newProjects:after-before}; }
 out.names=FM.projects.list().map(p=>p.name).filter(n=>/AU28/.test(n));
 for(const p of FM.projects.list().filter(p=>/AU28/.test(p.name))){ try{await FM.projects.remove(p.id);}catch(e){} }
 out.left=FM.projects.list().length-n0;
}catch(e){out.err=String(e&&e.stack||e).slice(0,300)} return JSON.stringify(out);})()
