(async function(){ const out={clicks:0,errors:[],skipped:0,hit:{}}; try{
 const seed0=+(window.__seed||1); let s=seed0*2654435761>>>0; const rnd=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
 window.addEventListener('error',e=>{ if(!/ResizeObserver/.test(e.message)) out.errors.push('E '+String(e.message).slice(0,140)); });
 window.addEventListener('unhandledrejection',e=>out.errors.push('R '+String(e.reason&&e.reason.message||e.reason).slice(0,140)));
 const realAlert=window.alert, realConfirm=window.confirm, realPrompt=window.prompt; window.alert=()=>{}; window.confirm=()=>false; window.prompt=()=>null; window.open=()=>null;
 if(FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au18 monkey',width:320,height:240}); await new Promise(r=>setTimeout(r,300));
 FM.scene.layers.length=0; FM.history.reset(); for(let i=0;i<3;i++){ FM.addShapeLayer(i%2?'rect':'ellipse'); } FM.addTextLayer(); FM.textEdit.stop(); FM.selectLayer(FM.scene.layers[0].id);
 const SKIP=/export|share|delete project|reset project|sign|log ?out|clear all|new project|home|backup|restore|reload|install|update|feedback|download|save as|import|upload|file|record|camera|mic/i;
 const dismiss=()=>{ try{ const a=document.getElementById('fm-ask'); if(a&&!a.classList.contains('hidden')){ const b=a.querySelector('.fm-ask-cancel'); if(b) b.click(); } }catch(e){} try{ if(FM.home.isOpen()) FM.home.close(); }catch(e){} try{ if(FM.settings&&FM.settings.isOpen()) FM.settings.close(); }catch(e){} document.querySelectorAll('input[type=file]').forEach(x=>x.remove()); };
 const vis=el=>{ const r=el.getBoundingClientRect(); const cs=getComputedStyle(el); return r.width>2&&r.height>2&&cs.visibility!=='hidden'&&cs.display!=='none'&&!el.disabled&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth; };
 for(let i=0;i<(+window.__n||400);i++){
   dismiss();
   const els=[].filter.call(document.querySelectorAll('button, [role=button], .tbtn, .tool, [data-act]'),el=>vis(el));
   if(!els.length) break; const el=els[Math.floor(rnd()*els.length)];
   const label=(el.getAttribute('aria-label')||el.title||el.textContent||el.id||el.className||'').trim().slice(0,40);
   if(SKIP.test(label)||SKIP.test(el.id||'')){ out.skipped++; continue; }
   const before=out.errors.length; try{ el.click(); }catch(e){ out.errors.push('threw clicking '+label+': '+e.message); }
   out.clicks++; out.hit[label]=(out.hit[label]||0)+1; await new Promise(r=>setTimeout(r,25)); if(FM.playing) FM.pause();
   if(out.errors.length>before) out.errors[out.errors.length-1]+=' [after clicking: '+label+' #'+(el.id||'')+']';
   if(!FM.scene||!FM.scene.layers){ out.errors.push('scene broken after '+label); break; }
 }
 dismiss(); try{ await FM.projects.remove(me);}catch(e){}
 out.distinct=Object.keys(out.hit).length;
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} delete out.hit; return JSON.stringify(out);})()
