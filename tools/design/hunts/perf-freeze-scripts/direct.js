(async function(){ const out={rows:[]}; try{
 if(FM.home.isOpen()) FM.home.close();
 const P=FM.scene.project; P.width=1080;P.height=1920;P.duration=6;
 const NF=+(window.__nf||8);
 FM.scene.layers.length=0; FM.history.reset(); FM.addShapeLayer('rect'); const l=FM.scene.layers[0]; l.shapeW=300;l.shapeH=300; l.start=0; l.duration=6; l.effects=[]; for(let k=0;k<NF;k++) l.effects.push(FM.fxRegistry.makeInstance('glow'));
 const draw=(rs,t,exp)=>{ const c=document.createElement('canvas'); c.width=Math.round(1080*rs); c.height=Math.round(1920*rs); c.__fmRS=rs; c.__fmOX=0;c.__fmOY=0; const a=performance.now(); FM.renderScene(c.getContext("2d"),FM.scene,t); c.getContext("2d").getImageData(0,0,1,1); return Math.round(performance.now()-a); };
 for(const rs of [1,0.56,0.33]) for(const t of [0,1,3]) out.rows.push([rs,t,draw(rs,t),draw(rs,t)]);
 const c=document.createElement('canvas'); c.width=1080;c.height=1920; const a=performance.now(); FM.renderScene(c.getContext('2d'),FM.scene,0); out.noRSset=Math.round(performance.now()-a);
 }catch(e){out.err=e.message;} return JSON.stringify(out);})()
