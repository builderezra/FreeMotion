(async function(){ const out={rows:[]};
 try{ if(FM.home.isOpen()) FM.home.close();
 const P=FM.scene.project; P.width=320;P.height=240;P.duration=6; FM.scene.layers.length=0; FM.history.reset();
 const mk=[['shape rect',()=>FM.addShapeLayer('rect')],['shape ellipse',()=>FM.addShapeLayer('ellipse')],['shape star',()=>FM.addShapeLayer('star')],['shape poly',()=>FM.addShapeLayer('polygon')],['shape line',()=>FM.addShapeLayer('line')],['text',()=>{FM.addTextLayer();FM.textEdit.stop();}],['null',()=>FM.addNullLayer()],['camera',()=>FM.addCameraLayer()],['adjustment',()=>FM.addAdjustmentLayer()],['caption',()=>FM.addCaptionLayer&&FM.addCaptionLayer()],['group',()=>FM.addEmptyGroup()],['path',()=>FM.addPathLayer([[10,10],[100,20],[60,90]],{})]];
 for(const [n,f] of mk){ const before=FM.scene.layers.length; try{ await f(); }catch(e){ out.rows.push([n,'THREW '+e.message]); continue; }
   const L=FM.scene.layers; if(L.length!==before+1){ out.rows.push([n,'added '+(L.length-before)+' layers']); }
   const l=L.find(x=>!x._seen)||L[L.length-1];
   L.forEach(x=>x._seen=1);
   const c=JSON.parse(JSON.stringify(l)); delete c._seen; const sc=JSON.parse(JSON.stringify(c)); FM.storage._sanitizeLayers([sc]);
   const diffs=[]; const walk=(a,b,p)=>{ if(JSON.stringify(a)===JSON.stringify(b)) return; if(a&&b&&typeof a==='object'&&typeof b==='object'){ for(const k of new Set(Object.keys(a).concat(Object.keys(b)))) walk(a[k],b[k],p+'.'+k); } else diffs.push(p+': '+JSON.stringify(a)+' -> '+JSON.stringify(b)); };
   walk(c,sc,'');
   out.rows.push([n, diffs.slice(0,6)]);
 }
 // undo every creator in turn
 let g=0,n0=FM.scene.layers.length; while(FM.history.canUndo()&&g++<100) FM.history.undo(); out.afterUndoAll=FM.scene.layers.length; out.created=n0;
 }catch(e){out.err=e.message;} return JSON.stringify(out);})()
