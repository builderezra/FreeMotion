// PHONE (380, touch, hover:none): A must change NOTHING. Frames 300 (before) and 2500 (A applied at 1200) are
// pixel-diffed afterwards; the returned facts are read after A is applied (at 2000, stored on window).
const grids = await openFilters();
const facts = () => visibleGrids().map(g => { const r = g.getBoundingClientRect(), d = g.nextElementSibling.getBoundingClientRect();
  return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), Math.round(d.top), g.offsetHeight - g.clientHeight].join(','); });
const before = facts();
setTimeout(() => PROTO.applyA(), 1200);
await sleep(2000);
const rail = document.querySelector('.flt-rail'), arrow = document.querySelector('.flt-arrow');
return { hoverNone: matchMedia('(hover: none)').matches, rails: document.querySelectorAll('.flt-rail').length,
  arrowDisplay: arrow && getComputedStyle(arrow).display, mask: getComputedStyle(rail.querySelector('.flt-grid')).maskImage,
  railClasses: [].map.call(document.querySelectorAll('.flt-rail'), r => r.className).slice(0, 3),
  rowsIdentical: JSON.stringify(before) === JSON.stringify(facts()), before: before.slice(0, 2), after: facts().slice(0, 2) };
