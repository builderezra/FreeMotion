(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au27',width:540,height:960}); await new Promise(r=>setTimeout(r,400));
 FM.scene.layers.length=0;
 const mk=(n,s,d,t)=>{const l=t==='text'?FM.makeLayer('text',{name:n,text:n,x:270,y:200,start:s,duration:d}):FM.makeLayer('video',{name:n,x:270,y:480,start:s,duration:d}); if(t!=='text'){l.srcW=540;l.srcH=960;l.srcRev=0;l.muted=true;} return l;};
 [mk('A',0,3),mk('B',3,3),mk('C',6,3),mk('T',1,2,'text')].forEach(l=>FM.scene.layers.push(l)); FM.scene.project.duration=9;
 FM.editor.set('simple'); FM.refreshAll(); await new Promise(r=>setTimeout(r,200));
 const vw=innerWidth; out.vw=vw;
 const probe=async (name)=>{ const L=FM.scene.layers.find(l=>l.name===name); FM.selectLayer(L.id); FM.refreshAll(); await new Promise(r=>setTimeout(r,250));
   const tr=document.getElementById('sm-tray'), say=document.getElementById('sm-say'); const res={};
   if(tr){ const r=tr.getBoundingClientRect(); res.tray={w:Math.round(r.width),l:Math.round(r.left),r:Math.round(r.right),sw:tr.scrollWidth,cw:tr.clientWidth,shown:r.width>0};
     res.btns=[...tr.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>{const q=b.getBoundingClientRect();return {t:(b.getAttribute('aria-label')||b.textContent||'').trim().slice(0,14),w:Math.round(q.width),h:Math.round(q.height),off:q.right>vw+0.5||q.left<-0.5}}); }
   res.docOverflow=document.documentElement.scrollWidth>vw; return res; };
 out.A=await probe('A'); out.T=await probe('T');
 try{FM.editor.set('full');await FM.projects.remove(me);}catch(e){}
}catch(e){out.err=String(e&&e.stack||e).slice(0,300)} return JSON.stringify(out);})()
