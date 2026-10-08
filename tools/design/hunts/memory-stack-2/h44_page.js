window.__h44={mode:'mem',buf:null,seq:0};
window.__h44.mk=async function(){   // a NEW phone-size (10.3 MB) video File each call; nothing else keeps a reference
  var H=window.__h44; if(!H.buf) H.buf=await (await fetch('/h44c00.webm')).arrayBuffer();
  var u8=new Uint8Array(H.buf.slice(0)); u8[u8.length-1]=H.seq&255; var i=H.seq++;
  if(H.mode==='disk'){ var dir=await navigator.storage.getDirectory(); var h=await dir.getFileHandle('h44_'+i+'.webm',{create:true}); var w=await h.createWritable(); await w.write(u8); await w.close(); return await h.getFile(); }
  return new File([u8],'clip'+i+'.webm',{type:'video/webm'});
};
window.__h44.importN=async function(n){ for(var i=0;i<n;i++){ var rec=await FM.loadVideoFile(await window.__h44.mk()); FM.addMediaLayer(rec); } await FM.storage.save(); return FM.scene.layers.length; };
window.__h44.replace=async function(count){  // the app's own replace sequence (app.js:4750-4780)
  var vids=FM.scene.layers.filter(function(l){return l.type==='video'}); var n=0;
  for(var i=0;i<count;i++){
    var L=vids[i%vids.length]; var nrec=await FM.loadVideoFile(await window.__h44.mk()); var outgoing=FM.media.get(L.id);
    if(outgoing&&outgoing.file) await FM.storage.stashPrevMedia(L.id,outgoing,L.mediaRev||0);
    FM.replaceMediaWith(L.id,nrec); L.mediaRev=(L.mediaRev||0)+1; var r=FM.media.get(L.id); if(r) r.rev=L.mediaRev; FM.refreshAll(); FM.history.commit(); FM.storage.save(); FM.mediaLib&&FM.mediaLib.add(nrec,L.id); n++;
  }
  await FM.storage.save(); return n;
};
window.__h44.undoRedo=async function(k){ for(var i=0;i<k;i++){ FM.history.undo(); await new Promise(function(r){setTimeout(r,400)}); } for(var j=0;j<k;j++){ FM.history.redo(); await new Promise(function(r){setTimeout(r,400)}); } return 'ur'+k; };
window.__h44.pf=function(){var k=Object.keys(FM.__audit).filter(function(x){return /:_prevFiles$/.test(x)})[0]; return FM.__audit[k]();};
'ok'
