from t11lib import *
import t11lib as L
L.URL='http://localhost:8913/index.html'
w=L.start(port=9571); L.w=w
for i in range(40):
    if w.ev('!!(window.FM&&FM.home&&FM.home.isOpen&&FM.home.isOpen())'): break
    time.sleep(.5)
time.sleep(1.5)
w.ev('document.querySelector(".hm-tab[data-tab=tutorials]").click()'); time.sleep(1.0)
shot('p21-1082-now')
LES=[('1','Make your first video','Add clips, trim, add a title','3 min'),('2','Trim and split','Cut a clip where you want','2 min'),('3','Glow and shadow','Make a title pop','2 min'),('4','Animate with keyframes','Move and fade things','4 min'),('5','Add a title','Words on the picture','2 min'),('6','Add music','A song under the video','2 min')]
def inject(html,name):
    w.ev('(function(){var e=document.querySelector(".hm-empty"); var g=e?e.parentElement:document.querySelector(".hm-grid"); g.innerHTML=%s; return 1})()'%json.dumps(html)); time.sleep(.6); shot(name)
card='background:rgba(255,255,255,.78);border:1px solid rgba(15,42,51,.12);border-radius:16px;color:#0f2a33;font-family:-apple-system,system-ui,sans-serif;box-shadow:0 4px 14px rgba(15,60,80,.08);'
A=''.join('<div style="%sdisplay:flex;align-items:center;gap:12px;padding:12px 14px;margin:0 0 10px"><div style="width:30px;height:30px;border-radius:15px;background:rgba(14,159,138,.16);color:#0b8a77;font-weight:700;display:flex;align-items:center;justify-content:center">%s</div><div style="flex:1"><div style="font-weight:600;font-size:15px">%s</div><div style="opacity:.62;font-size:12.5px;margin-top:2px">%s</div></div><div style="opacity:.55;font-size:12px">%s</div></div>'%(card,n,t,s,d) for n,t,s,d in LES)
inject('<div style="padding:4px 2px 0">'+A+'</div>','p21-1082-A')
hero='<div style="%spadding:16px;margin:0 0 14px;background:linear-gradient(135deg,rgba(47,208,181,.35),rgba(120,150,255,.28))"><div style="font-size:11px;letter-spacing:.08em;opacity:.7;font-weight:700">START HERE</div><div style="font-size:19px;font-weight:700;margin:6px 0 4px">Make your first video</div><div style="opacity:.75;font-size:13px">Add clips, trim, add a title. 3 minutes.</div><div style="margin-top:12px;display:inline-block;padding:9px 18px;border-radius:20px;background:#0e9f8a;color:#fff;font-weight:700;font-size:14px">Start</div></div>'%card
rest=''.join('<div style="%sdisplay:flex;align-items:center;gap:12px;padding:11px 14px;margin:0 0 8px"><div style="width:22px;height:22px;border-radius:11px;border:2px solid rgba(15,42,51,.28);%s"></div><div style="flex:1;font-weight:600;font-size:14.5px">%s</div><div style="opacity:.55;font-size:12px">%s</div></div>'%(card,'background:#0e9f8a;border-color:#0e9f8a' if n=='2' else '',t,d) for n,t,s,d in LES[1:])
inject('<div style="padding:4px 2px 0">'+hero+'<div style="font-size:12px;opacity:.6;font-weight:700;margin:2px 4px 8px">MORE LESSONS</div>'+rest+'</div>','p21-1082-B')
tiles=''.join('<div style="%soverflow:hidden"><div style="height:92px;background:linear-gradient(135deg,rgba(47,208,181,.38),rgba(130,110,255,.3));display:flex;align-items:center;justify-content:center;font-size:30px;opacity:.9">▷</div><div style="padding:9px 11px 11px"><div style="font-weight:600;font-size:13.5px">%s</div><div style="opacity:.55;font-size:11.5px;margin-top:3px">%s</div></div></div>'%(card,t,d) for n,t,s,d in LES)
inject('<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:4px 2px 0">'+tiles+'</div>','p21-1082-C')
w.close()
