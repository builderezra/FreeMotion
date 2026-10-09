(async function(){ const out={fails:[],errors:[],n:0}; try{
 const seed0=+(window.__seed||1); let s=seed0*2654435761>>>0; const rnd=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
 window.addEventListener('error',e=>{ if(!/ResizeObserver/.test(e.message)) out.errors.push(String(e.message).slice(0,120)); });
 window.addEventListener('unhandledrejection',e=>out.errors.push('rej '+String(e.reason&&e.reason.message||e.reason).slice(0,120)));
 if(FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'au18 keys',width:320,height:240}); await new Promise(r=>setTimeout(r,300));
 const P=FM.scene.project; P.width=320;P.height=240;P.duration=8;
 FM.scene.layers.length=0; FM.history.reset();
 for(let i=0;i<4;i++){ FM.addShapeLayer(i%2?'rect':'ellipse'); const l=FM.scene.layers[0]; l.start=i*0.5; l.duration=4; l.transform.x=60+i*50; l.transform.y=100; }
 FM.addTextLayer(); FM.textEdit.stop(); FM.scene.layers[0].duration=4;
 const sel=FM.scene.layers.slice(0,2).map(l=>l.id); FM.scene.selectedIds=sel; FM.scene.selectedId=sel[0]; FM.groupSelection(); FM.selectLayer(null);
 const inv=()=>{ const L=FM.scene.layers, ids=new Set(); for(const l of L){ if(ids.has(l.id)) return 'duplicate id'; ids.add(l.id);} for(const l of L) if(l.parent&&!ids.has(l.parent)) return 'dangling parent'; for(const id of (FM.scene.selectedIds||[])) if(!ids.has(id)) return 'selectedIds dead'; if(FM.scene.selectedId&&!ids.has(FM.scene.selectedId)) return 'selectedId dead'; if(FM.groupContext&&!ids.has(FM.groupContext)) return 'groupContext dead'; if(!isFinite(FM.time)) return 'time not finite: '+FM.time; const D=FM.scene.project.duration; if(FM.time<-1e-9||FM.time>D+1e-6) return 'time out of range: '+FM.time+' (duration '+D+')'; return null; };
 const keys=['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9','[',']','\\\\','/',',','.','-','=','?','Delete','Backspace','Escape','Enter','Tab','Home','End','PageUp','PageDown','ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '];
 const codeOf=k=>({' ':'Space','[':'BracketLeft',']':'BracketRight','\\\\':'Backslash','/':'Slash',',':'Comma','.':'Period','-':'Minus','=':'Equal','?':'Slash'}[k]||(k.length===1?(/[0-9]/.test(k)?'Digit'+k:'Key'+k.toUpperCase()):k));
 const pick=()=>{ const L=FM.scene.layers; return L[Math.floor(rnd()*L.length)]; };
 for(let i=0;i<500;i++){
   if(rnd()<0.15){ const l=pick(); if(l){ FM.selectLayer(l.id); } }
   if(rnd()<0.1) FM.setTime(rnd()*P.duration);
   const k=keys[Math.floor(rnd()*keys.length)], mods={ctrlKey:rnd()<0.2,metaKey:rnd()<0.1,shiftKey:rnd()<0.25,altKey:rnd()<0.1};
   const tgt=document.body;
   const before=FM.scene.project.width+'x'+FM.scene.project.height;
   try{ tgt.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,code:codeOf(k),bubbles:true,cancelable:true},mods))); tgt.dispatchEvent(new KeyboardEvent('keyup',Object.assign({key:k,code:codeOf(k),bubbles:true,cancelable:true},mods))); }catch(e){ out.fails.push(i+' key '+k+' threw '+e.message); break; }
   out.n++; await new Promise(r=>setTimeout(r,8));
   if(FM.playing) FM.pause();
   // dismiss anything modal a key opened
   try{ const a=document.getElementById('fm-ask'); if(a&&!a.classList.contains('hidden')){ const b=a.querySelector('.fm-ask-cancel'); if(b) b.click(); } if(FM.home.isOpen()) FM.home.close(); }catch(e){}
   const e=inv(); if(e){ out.fails.push(i+' after '+JSON.stringify([k,mods])+': '+e); break; }
   if(FM.scene.project.width+'x'+FM.scene.project.height!==before){ out.fails.push(i+' a key changed the project size'); break; }
 }
 // typing in a field must not act on the project
 const inp=document.createElement('input'); document.body.appendChild(inp); inp.focus(); const snap=JSON.stringify(FM.scene.layers.map(l=>[l.id,l.start,l.duration,l.transform&&l.transform.x])); const cnt=FM.scene.layers.length; const t0=FM.time;
 for(const k of ['s','d','Delete','Backspace','m','[',']','ArrowLeft',' ']){ inp.dispatchEvent(new KeyboardEvent('keydown',{key:k,code:codeOf(k),bubbles:true,cancelable:true})); }
 if(JSON.stringify(FM.scene.layers.map(l=>[l.id,l.start,l.duration,l.transform&&l.transform.x]))!==snap||FM.scene.layers.length!==cnt||FM.time!==t0) out.fails.push('keys typed into an input changed the project or the playhead'); inp.remove();
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
