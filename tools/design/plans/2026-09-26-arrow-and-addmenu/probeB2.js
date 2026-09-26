/* B2 prototype (geometry only): the raised add menu flush with the window's top, its drag handle tucked INSIDE the panel's
   top edge (it normally hangs 9px above it). Also hit-tests the handle in B1 and B2, so both are known to stay grabbable. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
await sleep(500);
FM.selectLayer(null); if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
await sleep(250);
const root = document.documentElement, body = document.body, am = document.getElementById('am-resizer'), p = document.getElementById('inspector-panel');
const r0 = am.getBoundingClientRect(), x = Math.round(r0.left + r0.width / 2), y0 = Math.round(r0.top + r0.height / 2);
const send = (t, y) => am.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: t === 'pointerup' ? 0 : 1 }));
send('pointerdown', y0); for (let i = 1; i <= 10; i++) { send('pointermove', Math.round(y0 * (1 - i / 10))); await sleep(16); } send('pointerup', 0); await sleep(200);
const out = { headTop: Math.round(p.getBoundingClientRect().top) };
const hit = () => { const h = document.elementFromPoint(x, 4); return h ? (h.id || h.className) : null; };
// B1: the panel's top 9px below the window's top, handle above it (0..9)
root.style.setProperty('--am-h', (innerHeight - 9) + 'px'); await sleep(150);
out.B1 = { panelTop: Math.round(p.getBoundingClientRect().top), handle: [Math.round(am.getBoundingClientRect().top), Math.round(am.getBoundingClientRect().bottom)], hitAtY4: hit() };
// B2: flush — the panel reaches y=0 and the handle sits inside its top edge while it is there
const st = document.createElement('style');
st.textContent = 'body.am-floating #inspector-panel > #am-resizer { top: 0 !important; }';
document.head.appendChild(st);
root.style.setProperty('--am-h', innerHeight + 'px'); await sleep(150);
out.B2 = { panelTop: Math.round(p.getBoundingClientRect().top), handle: [Math.round(am.getBoundingClientRect().top), Math.round(am.getBoundingClientRect().bottom)], hitAtY4: hit() };
const lab = document.createElement('div');
lab.style.cssText = 'position:fixed;right:8px;top:8px;z-index:99999;font:700 15px/1.2 system-ui,sans-serif;color:#fff;background:rgba(200,0,60,.9);padding:4px 9px;border-radius:6px;pointer-events:none';
lab.textContent = 'B2: flush to the top, handle tucked inside'; document.body.appendChild(lab);
return out;
