(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'p36b',width:540,height:960}); await new Promise(r=>setTimeout(r,500));
 FM.scene.layers.length=0; FM.refreshAll(); await new Promise(r=>setTimeout(r,400));
 const tl=document.getElementById('timeline'), row=tl.querySelector('.tl-addrow');
 const snap=(el)=>{const c=getComputedStyle(el); return {bs:c.boxShadow.slice(0,70),ol:c.outline.slice(0,40),bd:c.borderColor.slice(0,30)}};
 out.rest={tl:snap(tl),row:snap(row)}; row.focus(); await new Promise(r=>setTimeout(r,150)); out.focused={tl:snap(tl),row:snap(row),fv:row.matches(':focus-visible')};
 row.blur(); await new Promise(r=>setTimeout(r,150)); out.blurred={tl:snap(tl),row:snap(row)};
 const r=tl.getBoundingClientRect(); const els=document.elementsFromPoint(r.left+r.width/2,r.top+1).slice(0,4).map(e=>(e.id?'#'+e.id:'')+'.'+String(e.className).split(' ')[0]); out.stackAtTopEdge=els;
 try{await FM.projects.remove(me);}catch(e){}
}catch(e){out.err=String(e&&e.stack||e).slice(0,300)} return JSON.stringify(out);})()
