// EMPIRICAL SWEEP: with classic (space-taking) scrollbars forced by shot_classic.py, walk the whole DOM in several
// states and list every element that is actually drawing a scrollbar gutter right now. A classic bar takes layout
// space, so offsetHeight - clientHeight - borders > 0 means "a horizontal bar is painted here", and the same across
// for a vertical one. scrollbar-width:none elements take 0, so they drop out on their own.
// Run: python3 shot_classic.py --width 1280 --height 900 --js-file probe-sweep.js --wait 300 --out sweep.png
const sleep = ms => new Promise(r => setTimeout(r, ms));
const name = e => {
  if (e.id) return '#' + e.id;
  const c = (typeof e.className === 'string' ? e.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
  return e.tagName.toLowerCase() + (c ? '.' + c : '');
};
const walk = () => {
  const out = [];
  document.querySelectorAll('*').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
    const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
    const h = Math.round(e.offsetHeight - e.clientHeight - bt - bb);
    const v = Math.round(e.offsetWidth - e.clientWidth - bl - br);
    if (e === document.documentElement || e === document.body) { if (h <= 0 && v <= 0) return; }
    if (h > 0 || v > 0) out.push(name(e) + ' h' + h + ' v' + v + ' sw=' + cs.scrollbarWidth + (cs.scrollbarColor !== 'auto' ? ' sc=' + cs.scrollbarColor : '') + ' @' + Math.round(r.left) + ',' + Math.round(r.top));
  });
  return out;
};
const res = {};
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(500);
const L = FM.makeLayer('shape', { name: 'sweep', shape: 'rect', x: 200, y: 200, shapeW: 300, shapeH: 200, fill: '#c05030' });
L.start = 0; L.duration = 5; L.effects = [];
FM.scene.layers.length = 0; FM.scene.layers.push(L);

// 1. nothing selected → the Add menu in the inspector panel, every tab
FM.selectLayer(null); FM.refreshAll(); await sleep(600);
res.addmenu = {};
const tabs = [].slice.call(document.querySelectorAll('#inspector-panel .addmenu-tabs button, #inspector-panel .addmenu-tabs [role=tab]'));
for (const t of tabs) {
  t.click(); await sleep(350);
  res.addmenu[(t.textContent || '').trim().slice(0, 12) || '?'] = walk();
}
// 2. a layer selected → Effects → Filters
FM.selectLayer(L.id); FM.refreshAll(); await sleep(300);
FM.inspector.openCategory('effects'); await sleep(300);
FM.inspector.openFxTab('filters'); await sleep(900);
res.filters = walk();
// 3. the effects browser (visual), top level and one category
FM.inspector.openFxTab('visual'); await sleep(300);
try { FM.fxBrowser.open(L); await sleep(700); res.fxbrowser = walk();
      const cats = FM.fxRegistry.categories(); FM.fxBrowser._openCategory(cats[0]); await sleep(500); res.fxcategory = walk();
      FM.fxBrowser.close(); } catch (e) { res.fxbrowser = 'ERR ' + e.message; }
await sleep(300);
return res;
