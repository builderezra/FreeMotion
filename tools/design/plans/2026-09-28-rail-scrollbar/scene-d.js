// D's FOOTPRINT: what else `color-scheme: dark` on the editor would change. Diffs every element's computed colours
// before/after, in three editor states, and lists native-appearance controls (their inner paint follows the scheme
// without any computed-style change). Also: which scrollers live OUTSIDE #app (a rule on #app would miss them).
const KEYS = ['color', 'backgroundColor', 'borderTopColor', 'outlineColor', 'caretColor', 'accentColor'];
const snap = () => { const m = new Map(); document.querySelectorAll('body *').forEach(e => { const c = getComputedStyle(e); m.set(e, KEYS.map(k => c[k]).join('|')); }); return m; };
const nm = e => e.id ? '#' + e.id : e.tagName.toLowerCase() + ((typeof e.className === 'string' && e.className.trim()) ? '.' + e.className.trim().split(/\s+/)[0] : '') + (e.type ? '[' + e.type + ']' : '');
const RULE = 'body:not(.home-open) { color-scheme: dark; }';
async function diffState(label) {
  const a = snap(); PROTO.style('proto-d', RULE); await sleep(80); const b = snap(); PROTO.unstyle('proto-d'); await sleep(40);
  const changed = {}; a.forEach((v, e) => { if (b.get(e) !== v && e.getBoundingClientRect().width > 0) { const k = nm(e); changed[k] = (changed[k] || 0) + 1; } });
  const native = {}; document.querySelectorAll('body *').forEach(e => { if (e.getBoundingClientRect().width <= 0) return; const ap = getComputedStyle(e).appearance;
    if (ap && ap !== 'none' && ap !== 'auto' || (ap === 'auto' && /^(INPUT|SELECT|TEXTAREA|BUTTON|METER|PROGRESS)$/.test(e.tagName))) { const k = nm(e) + ' ap=' + ap; native[k] = (native[k] || 0) + 1; } });
  return { state: label, changedVisible: changed, nativeControls: native };
}
const out = [];
await openFilters();
out.push(await diffState('filters tab'));
const T = FM.makeLayer('text', { name: 'T', text: 'Hello', x: 100, y: 100, start: 0, duration: 5 });
FM.scene.layers.push(T); FM.selectLayer(T.id); FM.refreshAll(); await sleep(500);
out.push(await diffState('text layer inspector home'));
FM.selectLayer(null); FM.refreshAll(); await sleep(500);
out.push(await diffState('add menu'));
const appEl = document.getElementById('app');
const outside = [].slice.call(document.body.children).filter(c => !c.contains(appEl) && c !== appEl).map(c => c.id || c.className).filter(Boolean);
return { out, bodyChildrenOutsideApp: outside.slice(0, 40) };
