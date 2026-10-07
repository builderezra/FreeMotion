import sys,json,time
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
p,call=S.session(9997)
def metrics():
    call('HeapProfiler.collectGarbage'); call('HeapProfiler.collectGarbage')
    m={x['name']:x['value'] for x in call('Performance.getMetrics')['result']['metrics']}
    r=call('Runtime.evaluate',{'expression':'HTMLImageElement.prototype'})['result']['result']
    q=call('Runtime.queryObjects',{'prototypeObjectId':r['objectId']})['result']['objects']
    v=call('Runtime.callFunctionOn',{'objectId':q['objectId'],'functionDeclaration':"function(){var big=0,dec=0;for(var i=0;i<this.length;i++){var im=this[i]; if(im.naturalWidth>=512)big++; if(im.complete&&im.naturalWidth>0)dec++} return {imgs:this.length,decoded:dec,big:big}}",'returnByValue':True})['result']['result']['value']
    call('Runtime.releaseObject',{'objectId':q['objectId']}); call('Runtime.releaseObject',{'objectId':r['objectId']})
    v['jsHeapMB']=round(m['JSHeapUsedSize']/1048576,1)
    import subprocess
    out=subprocess.run("ps -eo rss,args | grep 'type=renderer' | grep 'remote-debugging-pipe\\|--user-data-dir\\|crashpad' | grep -v grep | sort -rn | head -1 | awk '{print int($1/1024)}'",shell=True,capture_output=True,text=True).stdout.strip()
    v['rendererRSS_MB']=out; return v
try:
    call('Page.enable'); call('Runtime.enable'); call('HeapProfiler.enable'); call('Performance.enable')
    call('Emulation.setDeviceMetricsOverride',{'width':1280,'height':800,'deviceScaleFactor':1,'mobile':False})
    call('Page.navigate',{'url':sys.argv[1]+'/index.html'}); time.sleep(6)
    print('start                         ',metrics())
    r=S.ev(call,r"""(async function(){ try{
      const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      window.__mkfill=function(n){ const c=document.createElement('canvas'); c.width=c.height=1024; const g=c.getContext('2d'); let seed=n*7919+1; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
        const gr=g.createLinearGradient(0,0,1024,1024); gr.addColorStop(0,'hsl('+(n*37%360)+',70%,40%)'); gr.addColorStop(1,'hsl('+(n*91%360)+',70%,60%)'); g.fillStyle=gr; g.fillRect(0,0,1024,1024);
        for(let i=0;i<400;i++){ g.fillStyle='rgba('+(rnd()*255|0)+','+(rnd()*255|0)+','+(rnd()*255|0)+',.5)'; g.fillRect(rnd()*1024,rnd()*1024,rnd()*60,rnd()*60); }
        return c.toDataURL('image/jpeg',0.85); };
      const P={width:1080,height:1920,fps:30,duration:3,background:'#000'};
      const layers=[]; let bytes=0;
      for(let i=0;i<100;i++){ const L=FM.makeLayer('shape',{shape:'rect',x:100+(i%10)*80,y:100+Math.floor(i/10)*80,shapeW:70,shapeH:70,fill:'#fff',start:0,duration:3}); L.fillMode='media'; L.fillImage=__mkfill(i); bytes+=L.fillImage.length; layers.push(L); }
      FM.scene={project:P,layers:layers,selectedId:null,selectedIds:[]};
      const c=document.createElement('canvas'); c.width=270; c.height=480; c.__fmRS=.25;
      for(let k=0;k<4;k++){ FM.renderScene(c.getContext('2d'),FM.scene,0.5); await sleep(700); }
      window.__bytes=bytes; return 'built 100 fills, total data-URL chars '+bytes;
    }catch(e){return 'ERR '+e} })()""")
    print(r)
    print('project A with 100 fills      ',metrics())
    S.ev(call,r"""(async function(){ const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      const P={width:1080,height:1920,fps:30,duration:3,background:'#000'};
      const L=FM.makeLayer('shape',{shape:'rect',x:300,y:300,shapeW:200,shapeH:200,fill:'#fff',start:0,duration:3}); L.fillMode='media'; L.fillImage=__mkfill(500);
      FM.scene={project:P,layers:[L],selectedId:null,selectedIds:[]}; window.__A=null;
      const c=document.createElement('canvas'); c.width=270; c.height=480; c.__fmRS=.25;
      for(let k=0;k<3;k++){ FM.renderScene(c.getContext('2d'),FM.scene,0.5); await sleep(600); } return 1;})()""")
    print('switched: project B, 1 fill  ',metrics())
    # a second round of switches: 5 more tiny projects, each one fill, rendered
    S.ev(call,r"""(async function(){ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const P={width:1080,height:1920,fps:30,duration:3,background:'#000'};
      for(let j=0;j<5;j++){ const L=FM.makeLayer('shape',{shape:'rect',x:300,y:300,shapeW:200,shapeH:200,fill:'#fff',start:0,duration:3}); L.fillMode='media'; L.fillImage=__mkfill(600+j);
        FM.scene={project:P,layers:[L],selectedId:null,selectedIds:[]}; const c=document.createElement('canvas'); c.width=270; c.height=480; c.__fmRS=.25; for(let k=0;k<2;k++){ FM.renderScene(c.getContext('2d'),FM.scene,0.5); await sleep(500);} } return 1;})()""")
    print('after 5 more one-fill projects',metrics())
finally: p.kill()
