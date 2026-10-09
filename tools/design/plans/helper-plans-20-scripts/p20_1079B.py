from t11lib import *
import t11lib as L
L.URL='http://localhost:8912/index.html'
w=L.start(port=9561); L.w=w
for i in range(40):
    if w.ev('!!(window.FM&&FM.home&&FM.home.isOpen&&FM.home.isOpen())'): break
    time.sleep(.5)
time.sleep(1.5)
for attempt in range(4):
    w.tap(190,714); time.sleep(1.5)
    try: TT('Create',css='button'); break
    except Exception: time.sleep(1)
time.sleep(2.5)
w.ev('try{localStorage.setItem("fm.editor.hint","1")}catch(e){}')
w.ev('FM.editor.set("full")'); time.sleep(2)
w.ev('(function(){var o=HTMLInputElement.prototype.click; HTMLInputElement.prototype.click=function(){ if(this.type==="file"){ window.__lastInp=this; } return o.apply(this,arguments); }; return 1;})()')
w.events[:]=[e for e in w.events if e.get('method')!='Page.fileChooserOpened']



def imp(name):
    w.ev('(async function(){var b=await (await fetch("tests/%s")).blob(); var f=new File([b],"%s",{type:"video/webm"}); FM._handleFiles([f]);})(),1' % (name,name)); time.sleep(4)
imp('_p20_clipA.webm'); shot('p20-1079-A1')
imp('_p20_clipB.webm'); w.ev('FM.selectLayer(null);FM.refreshAll();FM.timeline.rebuild()'); time.sleep(1.2); shot('p20-1079-B2')
print(w.ev('JSON.stringify({sel:FM.scene.selectedId,n:FM.scene.layers.length,cls:document.body.className,solo:FM._soloLayerId&&FM._soloLayerId(),addrow:!!document.querySelector(".tl-addrow"),addrowVisible:(function(){var e=document.querySelector(".tl-addrow");if(!e)return null;var r=e.getBoundingClientRect();return [r.top,r.height]})(),buttons:Array.from(document.querySelectorAll("button,[role=button]")).filter(b=>b.offsetParent&&b.getBoundingClientRect().top>0&&b.getBoundingClientRect().top<780&&b.getBoundingClientRect().height>0).map(b=>(b.id||b.getAttribute("aria-label")||b.title||b.textContent||"").toString().slice(0,26)).slice(0,40)})'))
w.close()
