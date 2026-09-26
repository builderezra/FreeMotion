/* probe (B): how high can the PC add menu be dragged — alone, and after the timeline is at its max / min?
   Drives the REAL handlers with synthetic PointerEvents dispatched on #am-resizer / #tl-resizer (the suite's own way —
   see 'the add menu grows UPWARD only…'); pointer capture cannot be exercised this way, which does not matter here:
   both handlers read e.clientY from events dispatched straight on the handle. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
await sleep(500);
if (FM.selectLayer) FM.selectLayer(null);
if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
await sleep(250);
const root = document.documentElement, body = document.body;
const $ = id => document.getElementById(id);
const bx = e => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };   // [x, y, w, h]
const cssv = n => (root.style.getPropertyValue(n) || getComputedStyle(root).getPropertyValue(n)).trim();
const send = (el, t, y, x) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x || 200, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: t === 'pointerup' ? 0 : 1 }));
async function drag(el, toY) {
  const r = el.getBoundingClientRect(), y0 = Math.round(r.top + r.height / 2), x = Math.round(r.left + r.width / 2);
  send(el, 'pointerdown', y0, x);
  for (let i = 1; i <= 12; i++) { send(el, 'pointermove', Math.round(y0 + (toY - y0) * i / 12), x); await sleep(16); }
  send(el, 'pointerup', toY, x); await sleep(200);
}
function topbarInfo() {
  const tb = $('topbar'); const b = bx(tb);
  const kids = tb ? [].slice.call(tb.querySelectorAll('button, input, [role=button]')).filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden') : [];
  const lowest = kids.reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0);
  return { box: b, display: tb && getComputedStyle(tb).display, lowestControlBottom: Math.round(lowest), nControls: kids.length };
}
function hits() {   // is every top-bar control still the top element at its own centre?
  const tb = $('topbar'); if (!tb) return null;
  const kids = [].slice.call(tb.querySelectorAll('button, input')).filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
  const blocked = kids.filter(e => { const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(h === e || e.contains(h)); });
  return { controls: kids.length, blocked: blocked.map(e => e.id || e.className || e.tagName) };
}
function state(tag) {
  const p = $('inspector-panel'), tl = $('timeline-panel'), rez = $('am-resizer');
  const cs = p ? getComputedStyle(p) : {};
  const hb = hits();
  return { tag, fl: body.classList.contains('am-floating') ? 1 : 0, panel: bx(p), handle: bx(rez), tl: bx(tl),
    tlH: cssv('--tl-h'), amH: cssv('--am-h'), amB: cssv('--am-bottom'), maxH: cs.maxHeight, pos: cs.position,
    addMenu: document.querySelector('#inspector-panel .addmenu--panel') ? 1 : 0, blocked: hb ? hb.blocked.length : null };
}
const out = { vw: innerWidth, vh: innerHeight, topbar: topbarInfo(), clampTL: FM.clampTimelineH && FM.clampTimelineH(999999),
  clampAM_now: FM.clampAddMenuH && FM.clampAddMenuH(999999), stage: bx($('stage')), preview: bx($('preview')) };
out.s0 = state('start');
const am = $('am-resizer'), tlr = $('tl-resizer');
// (a) add menu alone, timeline at its default height
await drag(am, 0); out.a_amAloneDefaultTL = state('am->y0, tl default');
await drag(am, innerHeight - 5);   // back down (couples & shrinks tl)
if (FM.dropAddMenuFloat) FM.dropAddMenuFloat(); root.style.removeProperty('--tl-h'); await sleep(200);
out.s1 = state('reset');
// (b) timeline to its max, then the add menu
await drag(tlr, 0); out.b_tlMax = state('tl->y0');
await drag(am, 0); out.b_amAfterTlMax = state('am->y0, tl max');
if (FM.dropAddMenuFloat) FM.dropAddMenuFloat(); await sleep(150);
// (c) timeline to its min, then the add menu
await drag(tlr, innerHeight - 2); out.c_tlMin = state('tl->bottom');
await drag(am, 0); out.c_amAfterTlMin = state('am->y0, tl min');
out.clampAM_tlMin = FM.clampAddMenuH(999999);
// (d) PROTOTYPE of the fix, geometry only: --am-h set to "up to the window's top, handle still on screen"
if (FM.dropAddMenuFloat) FM.dropAddMenuFloat(); root.style.removeProperty('--tl-h'); await sleep(200);
FM.selectLayer(null); if (FM.inspector) FM.inspector.refresh(); await sleep(150);
const hh = am.offsetHeight || 9;
function protoH() { const amBot = parseInt(root.style.getPropertyValue('--am-bottom'), 10) || 0; return innerHeight - amBot - hh; }
// the frames: HEAD's max first (the real drag), then the proposed max, then a layer selected at the proposed max
await drag(am, 0); out.frameHeadMax = state('HEAD max (frame 1)');
const lab = document.createElement('div');
lab.style.cssText = 'position:fixed;right:8px;top:8px;z-index:99999;font:700 15px/1.2 system-ui,sans-serif;color:#fff;background:rgba(200,0,60,.9);padding:4px 9px;border-radius:6px;pointer-events:none';
lab.textContent = 'NOW (HEAD): add menu stops here'; document.body.appendChild(lab);
{ // what lives in the column the raised menu would cover (above the band, x within the panel's column), outside the panel
  const pr = $('inspector-panel').getBoundingClientRect(), band = $('timeline-panel').getBoundingClientRect().top;
  out.coveredByProto = [].slice.call(document.querySelectorAll('button, input, select, [role=button], canvas, #view-bar, #stage, #preview')).filter(e => {
    if (e.closest('#inspector-panel') || !e.getClientRects().length) return false;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    const r = e.getBoundingClientRect(); return r.width && r.height && r.right > pr.left && r.left < pr.right && r.top < band && r.bottom > 0;
  }).map(e => (e.id || e.className || e.tagName).toString().slice(0, 30) + '@' + bx(e).join(','));
}
out.protoCeil = { formula: 'innerHeight - (--am-bottom) - handle(' + hh + ')', value: protoH(), topbarShown: topbarInfo().display };
setTimeout(function () { root.style.setProperty('--am-h', protoH() + 'px'); lab.textContent = 'PROPOSED: up to the top'; }, 1500);
setTimeout(function () {
  if (!FM.scene.layers.length) FM.scene.layers.push(FM.makeLayer('shape', { shape: 'rect', x: 200, y: 300, shapeW: 300, shapeH: 200, fill: '#4080c0', start: 0, duration: 4 }));
  FM.selectLayer(FM.scene.layers[0].id); if (FM.inspector) FM.inspector.refresh(); lab.textContent = 'PROPOSED, a layer selected';
}, 3000);
return out;
