"""gen2.py — harness whose frames carry a stamp of the seek they show (pixel at css 4,4), so capture lag cannot mislabel them."""
import json
D = '/Users/ezrasmith/Claude/FreeMotion/tools/design/plans/2026-09-26-emptytap/'
setup = open(D + 'setup.js').read()
fx = open(D + 'fx.js').read()
GAP = 2500
def make(name, opt, times, fx_=0.5, fy=0.36, pulse=True, sheet=None, head=False):
    js = setup + '\n' + (fx if not head else '') + '\n' + f'''
const stamp = document.createElement('div');
stamp.style.cssText = 'position:fixed;left:0;top:0;width:10px;height:10px;z-index:99999;background:rgb(0,0,0)';
document.body.appendChild(stamp);
const setStamp = k => {{ stamp.style.background = 'rgb(' + (20 + k * 30) + ',0,255)'; }};
'''
    if not head:
        js += f'''
window.__fxHold = true;
const a = __fx.area();
const X = a.left + a.width * {fx_}, Y = a.top + a.height * {fy};
{"__fx.pulse();" if pulse else ""}
{f"__fx.press.{opt}(X, Y);" if opt else ""}
{"FM.mobile.openAdd();" if sheet is not None else ""}
await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const doSeek = (t, k) => {{ __fx.seek(t, {json.dumps(sheet)}); setStamp(k); }};
'''
    else:
        js += f'''
const tl = document.getElementById('timeline'); const row = document.querySelector('.tl-addrow');
const rr = tl.getBoundingClientRect(); const ruler = document.getElementById('tl-rulerrow').getBoundingClientRect();
const X = rr.left + rr.width * {fx_}, Y = ruler.bottom + (rr.bottom - ruler.bottom) * {fy};
row.focus();
const st = window.setTimeout; window.setTimeout = (f, ms) => st(f, (ms || 0) + 60000);
row.dispatchEvent(new PointerEvent('pointerdown', {{ bubbles: true, cancelable: true, clientX: X, clientY: Y, pointerId: 9, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1 }}));
window.setTimeout = st;
await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const doSeek = (t, k) => {{ document.getAnimations().forEach(an => {{ an.pause(); an.currentTime = t; }}); setStamp(k); }};
'''
    js += f'''
const times = {json.dumps(times)};
doSeek(times[0], 0);
times.forEach((t, k) => {{ if (k) setTimeout(() => doSeek(t, k), {GAP} * k); }});
return {{ X: X, Y: Y }};
'''
    open(D + name + '.js', 'w').write(js)
    n = len(times) * GAP // 300 + 2
    return ','.join(str(300 * i + 150) for i in range(n))
jobs = {}
T = [0, 150, 300, 450, 620, 850]
jobs['wP'] = make('wP', None, [0, 120, 250, 400, 560, 700, 900, 1100])
jobs['wA'] = make('wA', 'A', T)
jobs['wB'] = make('wB', 'B', T)
jobs['wC'] = make('wC', 'C', T)
jobs['wAl'] = make('wAl', 'A', T, fx_=0.30, fy=0.62)
jobs['wQ100'] = make('wQ100', 'A', [0, 100, 150, 200, 280, 400], sheet=100)
jobs['wQ300'] = make('wQ300', 'A', [0, 150, 250, 300, 400, 550], sheet=300)
jobs['wH'] = make('wH', None, [0, 100, 200, 350, 500, 2000], fx_=0.30, fy=0.62, head=True)
json.dump(jobs, open(D + 'jobs.json', 'w'))
print('\n'.join(f'{k} {len(v.split(","))}' for k, v in jobs.items()))
jobs['w440'] = make('w440', 'A', [0, 150, 300, 450, 620, 850])
json.dump(jobs, open(D + 'jobs.json', 'w'))
