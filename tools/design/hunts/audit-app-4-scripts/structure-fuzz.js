(async function(){ const out={fails:[],n:0};
 try{
 if(FM.home.isOpen()) FM.home.close();
 const seed0=+(window.__seed||1); let s=seed0*2654435761>>>0; const rnd=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
 const P=FM.scene.project; P.width=320;P.height=240;P.duration=6;
 FM.scene.layers.length=0; FM.history.reset(); FM.selectLayer(null);
 const canon=()=>JSON.stringify(FM.scene.layers.map(l=>l));
 const inv=(tag)=>{ const L=FM.scene.layers, ids=new Set(); for(const l of L){ if(ids.has(l.id)) return tag+': duplicate id '+l.id; ids.add(l.id);} 
   for(const l of L){ if(l.parent){ if(!ids.has(l.parent)) return tag+': dangling parent '+l.name+'->'+l.parent; let p=l,n=0; while(p&&p.parent&&n++<50) p=L.find(x=>x.id===p.parent); if(n>=50) return tag+': parent cycle at '+l.name; } }
   for(const id of (FM.scene.selectedIds||[])) if(!ids.has(id)) return tag+': selectedIds has dead '+id;
   if(FM.scene.selectedId && !ids.has(FM.scene.selectedId)) return tag+': selectedId dead';
   if(FM.groupContext && !ids.has(FM.groupContext)) return tag+': groupContext dead';
   const g=FM.normalizeGroupOrder?FM.normalizeGroupOrder(JSON.parse(JSON.stringify(L))):null; if(g) return tag+': group order not normalised';
   return null; };
 const pick=()=>{const L=FM.scene.layers; return L.length?L[Math.floor(rnd()*L.length)]:null;};
 const ops=['shape','shape','text','del','delsel','dup','copypaste','group','ungroup','undo','redo','parent','sel2','nudge'];
 for(let i=0;i<120;i++){
  const op=ops[Math.floor(rnd()*ops.length)]; const L=FM.scene.layers; let tag=i+':'+op; const before=canon(); let isHist=false;
  try{
   if(op==='shape') FM.addShapeLayer('rect');
   else if(op==='text'){ FM.addTextLayer(); FM.textEdit.stop(); }
   else if(op==='del'){ const l=pick(); if(l) FM.deleteLayer(l.id); }
   else if(op==='delsel'){ const a=pick(),b=pick(); if(a){ FM.scene.selectedIds=[a.id].concat(b&&b!==a?[b.id]:[]); FM.scene.selectedId=a.id; FM.deleteSelected(); } }
   else if(op==='dup'){ const l=pick(); if(l) await FM.duplicateLayer(l.id); }
   else if(op==='copypaste'){ const a=pick(),b=pick(); if(a){ FM.scene.selectedIds=[a.id].concat(b&&b!==a?[b.id]:[]); FM.scene.selectedId=a.id; FM.copySelection(); await FM.pasteClipboard(); } }
   else if(op==='group'){ const a=pick(),b=pick(); if(a&&b&&a!==b){ FM.scene.selectedIds=[a.id,b.id]; FM.scene.selectedId=a.id; FM.groupSelection(); } }
   else if(op==='ungroup'){ const g=L.find(l=>l.type==='group'); if(g) FM.ungroup(g.id); }
   else if(op==='undo'){ isHist=true; FM.history.undo(); }
   else if(op==='redo'){ isHist=true; FM.history.redo(); }
   else if(op==='parent'){ const a=pick(),b=pick(); const isDesc=(x,y)=>{let p=y,n=0;while(p&&n++<60){if(p.id===x.id)return true;p=FM.scene.layers.find(z=>z.id===p.parent);}return false;}; if(a&&b&&a!==b&&FM.relinkParent&&!isDesc(a,b)){ try{FM.relinkParent(a,b.id); FM.history.commit();}catch(e){} } }
   else if(op==='sel2'){ const a=pick(); if(a){ FM.selectLayer(a.id);} }
   else if(op==='nudge'){ const a=pick(); if(a&&a.transform){ a.transform.x+= (rnd()-.5)*20; FM.history.commit(); } }
  }catch(e){ out.fails.push(tag+': THREW '+e.message); break; }
  out.n++;
  if(!isHist && FM.history.canUndo()){ const c0=canon(); FM.history.undo(); FM.history.redo(); if(canon()!==c0){ out.fails.push(tag+': undo+redo does not round-trip (len '+c0.length+' -> '+canon().length+')'); break; } }
  const e=inv(tag); if(e){ out.fails.push(e); break; }
 }
 // undo all the way then redo all the way: must land on the same document
 let guard=0; while(FM.history.canRedo()&&guard++<400) FM.history.redo(); const end=canon(); guard=0; while(FM.history.canUndo()&&guard++<400) FM.history.undo();
 const e1=inv('after-undo-all'); if(e1) out.fails.push(e1);
 guard=0; while(FM.history.canRedo()&&guard++<400) FM.history.redo();
 const e2=inv('after-redo-all'); if(e2) out.fails.push(e2);
 if(canon()!==end) out.fails.push('redo-all did not return to the end state (len '+canon().length+' vs '+end.length+')');
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
