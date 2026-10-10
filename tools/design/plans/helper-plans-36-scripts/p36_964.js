(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'p36',width:540,height:960}); await new Promise(r=>setTimeout(r,500));
 FM.scene.layers.length=0; FM.refreshAll(); await new Promise(r=>setTimeout(r,400));
 const panel=document.getElementById('timeline-panel'), tl=document.getElementById('timeline');
 out.panelCls=panel&&panel.className; out.empty=!!(panel&&panel.classList.contains('tl-empty-start'));
 const r=tl.getBoundingClientRect(); out.tl=[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];
 const cs=getComputedStyle(tl); out.shadowRest=cs.boxShadow.slice(0,80); out.overflow=cs.overflow+'/'+cs.overflowY;
 const row=tl.querySelector('.tl-addrow,.tl-add-row,[class*=addrow]')||tl.querySelector('[tabindex="0"]'); out.row=row?(row.className+' tab='+row.tabIndex):null;
 // what sits over the top 3px of #timeline?
 const probes=[]; for(const dy of [0.5,1.5,2.5]){ const e=document.elementFromPoint(r.left+r.width/2, r.top+dy); probes.push(e?((e.id?'#'+e.id:'')+'.'+String(e.className).split(' ')[0]):null); } out.topProbe=probes;
 // focus the add row (what a tap does), then blur by tapping elsewhere: does focus-within / hover outline remain?
 if(row){ row.focus(); await new Promise(r=>setTimeout(r,100)); out.afterFocus=getComputedStyle(tl).boxShadow.slice(0,60); out.focusWithin=tl.matches(':focus-within'); document.body.focus&&document.body.click(); await new Promise(r=>setTimeout(r,100)); out.afterBodyClickFocusWithin=tl.matches(':focus-within'); out.activeAfter=(document.activeElement&&document.activeElement.className)||document.activeElement.tagName; }
 try{await FM.projects.remove(me);}catch(e){}
}catch(e){out.err=String(e&&e.stack||e).slice(0,300)} return JSON.stringify(out);})()
