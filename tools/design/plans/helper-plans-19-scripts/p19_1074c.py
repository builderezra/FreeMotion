from t11lib import *
import t11lib as L
L.URL='http://localhost:8908/index.html'
w=L.start(port=9551); L.w=w
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


shot('p19-1074-0')
w.ev('(async function(){var b=await (await fetch("tests/_p19_clipA.webm")).blob(); var f=new File([b],"clipA.webm",{type:"video/webm"}); FM._handleFiles([f]);})(),1')
time.sleep(4)
shot('p19-1074-1')
print(w.ev('JSON.stringify({cls:document.body.className,sel:FM.scene.selectedId,n:FM.scene.layers.length,vis:Array.from(document.querySelectorAll("#m-back,#clip-name-m,#m-dup,#m-del,#m-more,#m-export,#m-settings,#m-notes")).map(e=>e.id+":"+getComputedStyle(e).display+":"+Math.round(e.getBoundingClientRect().left)+"+"+Math.round(e.getBoundingClientRect().width)).join(" ")})'))
w.ev('(function(){var st=document.createElement("style");st.textContent="body.m-editing #m-export{display:flex !important}";document.head.appendChild(st);return 1})()'); time.sleep(.6); shot('p19-1074-A')
print(w.ev('JSON.stringify([getComputedStyle(document.getElementById("m-export")).display, Math.round(document.getElementById("m-export").getBoundingClientRect().left), Math.round(document.getElementById("clip-name-m").getBoundingClientRect().width)])'))
w.close()
