import sys,time,json
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
port=int(sys.argv[1]); tag=sys.argv[2]; amt=float(sys.argv[3]) if len(sys.argv)>3 else 0.5
JS="""(function(){
  const P={width:1080,height:1080,background:'#202020',fps:30,duration:6};
  const mk=()=>{const L=FM.makeLayer('text',{name:'T',text:'MOTION',start:0,duration:6,x:540,y:540,fontSize:220,color:'#ffffff'});
    L.effects=[{type:'drift',enabled:true,params:{x:600,y:0}},{type:'motionflow',enabled:true,params:{style:0,amount:%f}}];return L;};
  const seq=[3.0,1.00,1.04,1.08], out={};
  for(const mode of [false,true]){
    const L=mk(), sc={layers:[L],project:P}, c=document.createElement('canvas'); c.width=P.width;c.height=P.height; const x=c.getContext('2d',{willReadFrequently:true});
    FM._exporting=mode; const ms=[]; let img;
    for(const t of seq){ x.clearRect(0,0,P.width,P.height); const a=performance.now(); FM.renderScene(x,sc,t); ms.push(performance.now()-a); }
    out[mode?'export':'preview']={img:Array.from(x.getImageData(0,0,P.width,P.height).data),ms:ms.slice(1)}; FM._exporting=false;
  }
  const a=out.preview.img,b=out.export.img; let mx=0,n8=0,n32=0,sum=0; for(let i=0;i<a.length;i+=4){let d=0;for(let k=0;k<3;k++)d=Math.max(d,Math.abs(a[i+k]-b[i+k])); if(d>mx)mx=d; if(d>8)n8++; if(d>32)n32++; sum+=d;}
  return JSON.stringify({max:mx,over8:n8,over32:n32,mean:sum/(a.length/4),msPreview:out.preview.ms,msExport:out.export.ms});})()"""%amt
p,call=S.session(9970+port%10)
try:
    call('Page.enable'); call('Runtime.enable')
    call('Emulation.setDeviceMetricsOverride',{'width':800,'height':600,'deviceScaleFactor':1,'mobile':False})
    call('Page.navigate',{'url':'http://localhost:%d/index.html?fmtest=1'%port}); time.sleep(4)
    print(tag,amt,S.ev(call,JS))
finally: p.kill()
