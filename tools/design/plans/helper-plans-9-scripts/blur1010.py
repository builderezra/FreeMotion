import sys,json,time
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
p,call=S.session(9998)
try:
    call('Page.enable'); call('Runtime.enable')
    call('Page.addScriptToEvaluateOnNewDocument',{'source':"""
      (function(){ var d=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'filter'); if(d&&d.set){ Object.defineProperty(CanvasRenderingContext2D.prototype,'filter',{get:function(){return 'none'},set:function(v){},configurable:true}); }
       var F=window.Float32Array; window.__f32={n:0,bytes:0,big:0}; window.Float32Array=new Proxy(F,{construct:function(t,a,nt){ var o=Reflect.construct(t,a,nt); if(typeof a[0]==='number'){ __f32.n++; __f32.bytes+=a[0]*4; if(a[0]>1e6) __f32.big++; } return o; }}); })();"""})
    call('Emulation.setDeviceMetricsOverride',{'width':1280,'height':800,'deviceScaleFactor':1,'mobile':False})
    call('Page.navigate',{'url':sys.argv[1]+'/index.html'}); time.sleep(6)
    r=S.ev(call,r"""(async function(){ try{
      const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      if(FM.glColor){ FM.glColor.blur=function(){return null}; FM.glColor.apply=function(){return null}; }
      const ok=FM.ctxFilterOK&&FM.ctxFilterOK();
      const out={ctxFilterOK:ok, seam: typeof FM._drawBlurredNoFilter};
      for(const [w,h,r] of [[270,480,6],[540,960,6],[1080,1920,6],[1080,1920,40]]){
        const src=document.createElement('canvas'); src.width=w; src.height=h; const sg=src.getContext('2d'); sg.fillStyle='#ff4d6d'; sg.fillRect(w*.25,h*.25,w*.5,h*.5);
        const dst=document.createElement('canvas'); dst.width=w; dst.height=h; const dg=dst.getContext('2d');
        const key=w+'x'+h+' r='+r; out[key]={};
        for(let k=0;k<3;k++){ __f32.n=0; __f32.bytes=0; const t0=performance.now(); FM._drawBlurredNoFilter(dg,src,r,0,0,w,h); dg.getImageData(0,0,1,1); out[key]['call'+(k+1)]={f32:__f32.n,MB:Math.round(__f32.bytes/1048576),ms:Math.round(performance.now()-t0)}; }
      }
      return JSON.stringify(out,null,1); }catch(e){return 'ERR '+e+e.stack} })()""")
    print(r)
finally: p.kill()
