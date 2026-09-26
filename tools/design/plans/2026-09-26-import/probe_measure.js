// #960 probe: measure the Media "Import" tile and the Audio "Import audio" tile side by side,
// before and after the proposed patch (applied at runtime through FM.addMenu._tabs(), no file edits).
// Returns JSON; the page is left on whatever the last step drew.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LIB = window.__probeLib === false ? null : JSON.stringify([
  { mid: 'pv1', key: 'k1', name: 'Beach.mp4', kind: 'video', audio: false, w: 1080, h: 1920, dur: 6, added: 3 },
  { mid: 'pp1', key: 'k2', name: 'Sunset.jpg', kind: 'image', audio: false, w: 1080, h: 1350, dur: 0, added: 2 },
  { mid: 'pa1', key: 'k3', name: 'Song.mp3', kind: 'video', audio: true, w: 0, h: 0, dur: 95, added: 1 }
]);
if (LIB) localStorage.setItem('fm.medialib', LIB); else localStorage.removeItem('fm.medialib');
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(800);
try { FM.selectLayer(null); } catch (e) {}
await sleep(400);
const phone = innerWidth < 768;
let root;
if (phone) {
  document.getElementById('add-fab').click(); await sleep(700);
  root = document.querySelector('.addmenu--sheet');
} else {
  root = document.querySelector('#inspector-panel');
}
if (!root) return { err: 'no add menu root' };
const tab = name => [...root.querySelectorAll('.addmenu-tab')].find(t => t.textContent.trim() === name);
const cardBy = label => [...root.querySelectorAll('.addmenu-card')].find(c => ((c.querySelector('.addmenu-lbl') || {}).textContent || '').trim() === label);
function measure(c) {
  if (!c) return null;
  const cs = getComputedStyle(c), ic = c.querySelector('.addmenu-ic'), ics = getComputedStyle(ic), svg = ic.querySelector('svg');
  const lb = c.querySelector('.addmenu-lbl'), lbs = getComputedStyle(lb);
  const r = c.getBoundingClientRect(), ir = svg.getBoundingClientRect();
  const strokes = [...svg.querySelectorAll('path,circle,rect,line,polyline')].map(p => {
    const a = p.getAttribute('stroke');
    return a ? a : 'inherit→' + getComputedStyle(p).stroke;
  });
  const grads = [...svg.querySelectorAll('linearGradient')].map(g => g.id + ':' + [...g.querySelectorAll('stop')].map(s => s.getAttribute('stop-color') + '@' + (s.getAttribute('stop-opacity') || '1')).join('>'));
  return {
    cls: c.className, tint: c.style.getPropertyValue('--am-tint').trim(), grid: c.parentElement.className,
    box: Math.round(r.width * 10) / 10 + 'x' + Math.round(r.height * 10) / 10,
    bg: cs.backgroundImage, bgColor: cs.backgroundColor,
    border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, radius: cs.borderTopLeftRadius,
    shadow: cs.boxShadow, padding: cs.padding, opacity: cs.opacity, filter: cs.filter,
    icColor: ics.color, icBox: Math.round(ir.width * 10) / 10 + 'x' + Math.round(ir.height * 10) / 10, icFilter: ics.filter,
    svgStrokeAttr: svg.getAttribute('stroke'), strokeWidth: svg.getAttribute('stroke-width'), strokes, grads,
    label: lb.textContent, lblFont: lbs.fontSize + ' / ' + lbs.fontWeight + ' / ' + lbs.color + ' / ' + lbs.letterSpacing,
    lblOverflow: lbs.textOverflow + ' ' + lbs.whiteSpace, lblScrollW: lb.scrollWidth, lblClientW: lb.clientWidth,
    lblClipped: lb.scrollWidth > lb.clientWidth + 0.5,
    title: c.title
  };
}
function slim(o) { if (!o) return o; const c = Object.assign({}, o); c.bg = (c.bg || '').replace(/rgba\((\d+), (\d+), (\d+), /g, 'rgba($1,$2,$3,').slice(0, 140); delete c.icFilter; delete c.bgColor; delete c.opacity; delete c.filter; delete c.title; return c; }
function diff(a, b) {
  const out = {};
  if (!a || !b) return 'missing';
  Object.keys(a).forEach(k => { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out[k] = [a[k], b[k]]; });
  return out;
}
const W = window.__probeWait || 1200;
async function both(mediaLabel) {
  tab('Media').click(); await sleep(350);
  const m0 = measure(cardBy(mediaLabel)); await sleep(W);
  const m = measure(cardBy(mediaLabel));
  const mediaSettle = diff(m0, m);
  const mediaStrip = [...root.querySelectorAll('.addmenu-card')].slice(0, 6).map(c => (c.querySelector('.addmenu-lbl') || {}).textContent);
  tab('Audio').click(); await sleep(350);
  const a0 = measure(cardBy('Import audio')); await sleep(W);
  const a = measure(cardBy('Import audio'));
  const audioSettle = diff(a0, a);
  const audioStrip = [...root.querySelectorAll('.addmenu-card')].slice(0, 6).map(c => (c.querySelector('.addmenu-lbl') || {}).textContent);
  const sm = slim(m), sa = slim(a), d = diff(sm, sa), same = {};
  if (sm && sa) Object.keys(sm).forEach(k => { if (!(k in d)) same[k] = sm[k]; });
  return { same, diff: d, settleM: Object.keys(mediaSettle), settleA: Object.keys(audioSettle), mediaStrip: mediaStrip.slice(0, 4), audioStrip: audioStrip.slice(0, 3) };
}
const before = await both('Import');

// ---- the proposed patch, applied at runtime (Option A) ----
const AUDIO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
  + '<defs><linearGradient id="fm-ic-impau" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">'
  + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs>'
  + '<path d="M12 16V4M7 9l5-5 5 5" stroke="url(#fm-ic-impau)"/>'
  + '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="url(#fm-ic-impau)"/></svg>';
const T = FM.addMenu._tabs();
const media = T.find(t => t.key === 'media'), audio = T.find(t => t.key === 'audio');
const mOpt = media.options, aOpt = audio.options;
media.options = function () { return mOpt().map(o => o.label === 'Import' ? Object.assign({}, o, { label: 'Import media' }) : o); };
audio.options = function () { return aOpt().map(o => o.label === 'Import audio' ? Object.assign({}, o, { icon: AUDIO_ICON }) : o); };
const after = await both('Import media');
// ids in the whole document: a duplicate id steals paint
const ids = {};
document.querySelectorAll('linearGradient[id^="fm-ic-imp"]').forEach(g => { ids[g.id] = (ids[g.id] || 0) + 1; });
media.options = mOpt; audio.options = aOpt;
window.__probeOut = { w: innerWidth, h: innerHeight, theme: document.documentElement.getAttribute('data-theme'), phone, before, after, gradIds: ids };
const trim = o => { const c = JSON.parse(JSON.stringify(o)); if (c.same) { delete c.same.bg; delete c.same.shadow; } return c; };
return { w: innerWidth, theme: document.documentElement.getAttribute('data-theme'), gradIds: ids, bg: before.same.bg, shadow: before.same.shadow, before: trim(before), after: trim(after) };
