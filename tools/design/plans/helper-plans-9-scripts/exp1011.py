import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import cdp_eval as C
js=r"""(async function(){ try {
  const RealVE=window.VideoEncoder, RealVF=window.VideoFrame, rc=RealVF.prototype.close, realRender=FM.renderScene;
  const out={};
  async function scenario(label, failWhere){
    let frames=0, closes=0; const encs=[];
    class StubEnc { constructor(init){ this.init=init; this.state='unconfigured'; this.encodeQueueSize=0; this.calls=0; encs.push(this);} configure(){this.state='configured'} encode(f,o){ this.calls++; if(failWhere==='encode' && this.calls===3) throw new Error('boom: encode on frame 3'); } async flush(){} close(){ this.state='closed'; } static async isConfigSupported(c){ return {supported:true,config:c}; } }
    window.VideoEncoder=StubEnc;
    RealVF.prototype.close=function(){ closes++; return rc.call(this); };
    window.VideoFrame=class extends RealVF { constructor(...a){ super(...a); frames++; } };
    let n=0; if(failWhere==='render'){ FM.renderScene=function(){ n++; if(n===3) throw new Error('boom: render on frame 3'); return realRender.apply(this,arguments); }; }
    const L=FM.makeLayer('shape',{shape:'rect',x:32,y:32,shapeW:40,shapeH:40,fill:'#f44',start:0,duration:1}); L.start=0; L.duration=1;
    const saved=FM.scene; FM.scene={project:{width:64,height:64,fps:10,duration:1,background:'#000'},layers:[L],selectedId:null,selectedIds:[]};
    let err=null; try { await FM.exporter.run({scale:1,fps:10,bitrate:300000,name:'x1011',from:0,to:1,outW:64,outH:64,onReady:function(){}}); } catch(e){ err=String(e&&e.message||e); }
    window.VideoEncoder=RealVE; window.VideoFrame=RealVF; RealVF.prototype.close=rc; FM.renderScene=realRender; FM.scene=saved;
    out[label]={error:err, videoFramesCreated:frames, videoFramesClosed:closes, leakedFrames:frames-closes, encoders:encs.length, encoderStates:encs.map(e=>e.state)};
  }
  await scenario('control: no failure', null);
  await scenario('encode() throws on frame 3', 'encode');
  await scenario('renderScene throws on frame 3', 'render');
  return JSON.stringify(out,null,1);
} catch(e){ return 'ERR '+e+(e.stack||'') } })()"""
print(C.run('http://localhost:8796/index.html',[js],port=9418,timeout=120)[0])
