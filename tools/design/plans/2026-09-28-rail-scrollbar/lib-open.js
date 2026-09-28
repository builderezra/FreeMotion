// Shared opener for every run in this plan (concatenated in front of a scene file by run.sh):
// close Home, one shape layer, Effects → Filters, first row's heading scrolled to the top of the inspector.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const visibleGrids = () => [].slice.call(document.querySelectorAll('.flt-grid')).filter(g => g.getBoundingClientRect().width > 0);
async function openFilters() {
  try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
  await sleep(500);
  const L = FM.makeLayer('shape', { name: 'rail probe', shape: 'rect', x: 200, y: 200, shapeW: 300, shapeH: 200, fill: '#c05030' });
  L.start = 0; L.duration = 5; L.effects = [];
  FM.scene.layers.length = 0; FM.scene.layers.push(L);
  FM.selectLayer(L.id); FM.refreshAll();
  await sleep(300);
  FM.inspector.openCategory('effects');
  await sleep(300);
  FM.inspector.openFxTab('filters');
  await sleep(1500);   // thumbnails are left ON: the picture he sees has them
  const g = visibleGrids();
  if (g[0] && g[0].previousElementSibling) g[0].previousElementSibling.scrollIntoView({ block: 'start' });
  await sleep(300);
  return visibleGrids();
}
function rowFacts(g, i) {
  const cs = getComputedStyle(g), r = g.getBoundingClientRect();
  let pseudo = 'n/a';
  try { pseudo = getComputedStyle(g, '::-webkit-scrollbar').display; } catch (e) {}
  return {
    i, label: ((g.closest('.flt-rail') || g).previousElementSibling || {}).textContent,
    tiles: g.querySelectorAll('.flt-tile').length, sw: g.scrollWidth, cw: g.clientWidth, sl: Math.round(g.scrollLeft),
    barPx: g.offsetHeight - g.clientHeight,           // classic bar = its thickness; overlay or hidden = 0
    scrollbarWidth: cs.scrollbarWidth, scrollbarColor: cs.scrollbarColor, webkitPseudoDisplay: pseudo,
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]
  };
}
