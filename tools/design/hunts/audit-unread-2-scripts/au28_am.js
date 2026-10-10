(async function(){ const out={}; const KEY='fm.medialib'; const saved0=localStorage.getItem(KEY); const realConfirm=window.confirm;
 try{
  if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
  localStorage.removeItem(KEY);
  const mid=FM.mediaLib.add({kind:'video',file:{name:'au28.mp4',type:'video/mp4',size:10,lastModified:1},width:100,height:100,duration:3},'k_au28'); out.mid=!!mid;
  let used=0; const realUse=FM.mediaLib.use; FM.mediaLib.use=function(m){ used++; };
  const host=document.createElement('div'); host.style.cssText='position:fixed;left:0;top:0;width:360px;height:420px;z-index:99999;background:#222'; document.body.appendChild(host);
  FM.addMenu.openTab && FM.addMenu.openTab('media'); FM.addMenu.render(host,{variant:'sheet'}); [...host.querySelectorAll('.addmenu-tab')].filter(t=>/Media/.test(t.textContent)).forEach(t=>t.click());
  await new Promise(r=>setTimeout(r,300));
  const card=host.querySelector('.addmenu-media'); out.card=!!card; if(!card){ out.tabs=[...host.querySelectorAll('.addmenu-tab')].map(t=>t.textContent); return JSON.stringify(out); }
  const ptr=(t)=>card.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:5,pointerType:'mouse',buttons:t==='pointerup'?0:1}));
  let asked=0; window.confirm=()=>{asked++; return false;};
  ptr('pointerdown'); await new Promise(r=>setTimeout(r,700)); out.askedAfterHold=asked;
  // the dialog swallowed the release: no pointerup, no click reaches the card. Later he taps it for real:
  await new Promise(r=>setTimeout(r,400));
  card.click(); out.usedAfterNextTap=used;
  card.click(); out.usedAfterSecondTap=used;
  FM.mediaLib.use=realUse; host.remove();
 }catch(e){out.err=String(e&&e.stack||e).slice(0,300)} finally{ window.confirm=realConfirm; try{ if(saved0===null) localStorage.removeItem(KEY); else localStorage.setItem(KEY,saved0);}catch(e){} }
 return JSON.stringify(out);})()
