(function(){ const out={};
 try{
  const S=FM.spine; const mk=(over)=>Object.assign({id:'L'+(mk.n=(mk.n||0)+1),type:'video',name:'c.mp4',start:0,duration:2,visible:true,transform:{x:540,y:960,opacity:1,scale:1,rotation:0},effects:[],masks:[],srcW:1080,srcH:1920,srcRev:0,mediaRev:0},over||{});
  const P={width:1080,height:1920,fps:30,duration:3000};
  const t=(name,layers)=>{ const t0=performance.now(); let r; try{ r=S.classify({project:P,layers}); }catch(e){ out[name]='THROW '+e.message; return; } out[name]={ms:Math.round(performance.now()-t0),main:r.main.length,anom:r.anomalies.length}; };
  const N=[500,1500];
  N.forEach(n=>{
   t('tiled'+n, Array.from({length:n},(_,i)=>mk({start:i,duration:1})));
   t('allSameRange'+n, Array.from({length:n},()=>mk({start:0,duration:5})));
   t('stillUnderTiled'+n, [mk({type:'image',start:0,duration:n,name:'bg.jpg'})].concat(Array.from({length:n},(_,i)=>mk({start:i,duration:1}))));
   t('overlapChain'+n, Array.from({length:n},(_,i)=>mk({start:i*0.6,duration:1})));
   t('manyText'+n, Array.from({length:n},(_,i)=>mk({type:'text',text:'t',start:i*0.1,duration:3})));
   t('hiddenFull'+n, Array.from({length:n},(_,i)=>mk({start:i%3,duration:3,visible:i%2===0})));
  });
 }catch(e){ out.err=e.message+' '+(e.stack||'').slice(0,300); }
 return JSON.stringify(out); })()
