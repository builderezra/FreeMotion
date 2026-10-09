import sys,time,json,base64
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'
JS1061="""(function(){
  const mk=s=>{const l=FM.makeLayer('video',{name:'S',start:s,duration:2});l.id='p'+Math.random().toString(36).slice(2);return l;};
  const ts=0.5+0.4/120, A=mk(10); A.speed={kf:[{t:10,v:100},{t:10+ts,v:1,e:'hold'}]};
  const SPL=0.3041; const B=mk(10+SPL); B.duration=2-SPL; B.speed={kf:A.speed.kf.map(k=>Object.assign({},k))};
  const whole=FM.layerSourceAdvance(A,1.2), second=FM.layerSourceAdvance(A,SPL)+FM.layerSourceAdvance(B,1.2-SPL);
  return JSON.stringify({adv15:FM.layerSourceAdvance(A,1.5),exact15:100*ts+(1.5-ts),whole:whole,halves:second,splitDiff:second-whole});})()"""
JS1056="""(function(){
  const fn=FM._FX_TABLES.PIXEL_FX.mosaic, W=96,H=96, d=new Uint8ClampedArray(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const dx=x-48,dy=y-48;if(dx*dx+dy*dy<30*30){const i=(y*W+x)*4;d[i]=d[i+1]=d[i+2]=255;d[i+3]=255;}}
  fn(d,W,H,{size:16},0.5,1);
  const c=document.createElement('canvas');c.width=W*3;c.height=H*3;const x=c.getContext('2d');
  x.fillStyle='#808080';x.fillRect(0,0,c.width,c.height);const o=document.createElement('canvas');o.width=W;o.height=H;o.getContext('2d').putImageData(new ImageData(d,W,H),0,0);
  x.imageSmoothingEnabled=false;x.drawImage(o,0,0,W*3,H*3);return c.toDataURL('image/png');})()"""
for tag,port in (('main',8905),('patched',8904)):
    p,call=S.session(9960+port%10)
    try:
        call('Page.enable'); call('Runtime.enable')
        call('Emulation.setDeviceMetricsOverride',{'width':800,'height':600,'deviceScaleFactor':1,'mobile':False})
        call('Page.navigate',{'url':'http://localhost:%d/index.html?fmtest=1'%port}); time.sleep(4)
        print(tag,'1061',S.ev(call,JS1061))
        url=S.ev(call,JS1056)
        open(SP+'p18_1056_%s.png'%tag,'wb').write(base64.b64decode(url.split(',')[1]))
    finally: p.kill()
