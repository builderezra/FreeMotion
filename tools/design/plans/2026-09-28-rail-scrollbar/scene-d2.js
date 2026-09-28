// D follow-up: the exact before/after of the only elements whose computed colours change, and the full list of
// top-level surfaces outside #app that scroll.
const KEYS = ['color', 'backgroundColor', 'borderTopColor', 'outlineColor', 'caretColor', 'accentColor'];
const RULE = 'body:not(.home-open) { color-scheme: dark; }';
const detail = async (sel) => { const e = document.querySelector(sel); if (!e) return sel + ' missing';
  const a = KEYS.map(k => getComputedStyle(e)[k]); PROTO.style('proto-d', RULE); await sleep(80);
  const b = KEYS.map(k => getComputedStyle(e)[k]); PROTO.unstyle('proto-d'); await sleep(40);
  return KEYS.map((k, i) => a[i] !== b[i] ? k + ': ' + a[i] + ' → ' + b[i] : null).filter(Boolean); };
await openFilters();
const r = { tlHeadtap: await detail('#tl-headtap'), tlHeadtapVisible: (() => { const e = document.querySelector('#tl-headtap'); const rr = e.getBoundingClientRect(); return [rr.width, rr.height, getComputedStyle(e).opacity, e.textContent.trim().slice(0, 20)]; })() };
const T = FM.makeLayer('text', { name: 'T', text: 'Hello', x: 100, y: 100, start: 0, duration: 5 });
FM.scene.layers.push(T); FM.selectLayer(T.id); FM.refreshAll(); await sleep(500);
r.catCard = await detail('#inspector .cat-card');
const appEl = document.getElementById('app');
r.outsideApp = [].slice.call(document.body.children).filter(c => c !== appEl && !c.contains(appEl)).map(c => c.id || c.className).filter(Boolean);
return r;
