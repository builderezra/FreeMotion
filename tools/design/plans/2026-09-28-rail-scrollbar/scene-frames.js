// PICTURE RUN: one Chrome, every option on the SAME row (Cinematic), shot with --frames at the offsets below.
// Returns the crop box (CSS px) before the timeline starts. `.proto-hover` stands in for the mouse being over the row.
// Frames (2.5 s apart — a 2x capture can take ~1 s, so tight offsets land late):
// 300 NOW · 3000 A hover · 5500 A after one › · 8000 A at the end · 10500 B hover · 13000 C · 15500 A2 · 18000 D
await openFilters();
const cin = () => visibleGrids().filter(g => g.scrollWidth > g.clientWidth + 4)[0];
const g0 = cin(), head = g0.previousElementSibling, dots0 = g0.nextElementSibling;
const panel = document.getElementById('inspector').getBoundingClientRect();
const box = { x: Math.max(0, Math.round(panel.left)), y: Math.round(head.getBoundingClientRect().top - 10),
  w: Math.round(panel.width), h: Math.round(dots0.getBoundingClientRect().bottom + 14 - head.getBoundingClientRect().top + 10) };
const at = (ms, fn) => setTimeout(() => { try { fn(); } catch (e) { console.error(e); } }, ms);
at(1500, () => { PROTO.applyA(); cin().closest('.flt-rail').classList.add('proto-hover'); });
at(4000, () => cin().closest('.flt-rail').querySelector('.fm-rail-arrow--next').click());
at(6500, () => cin().closest('.flt-rail').querySelector('.fm-rail-arrow--next').click());
at(9000, () => { const g = cin(); PROTO.removeA(); g.scrollLeft = 0; PROTO.applyB(); g.classList.add('proto-hover'); });
at(11500, () => { const g = cin(); g.classList.remove('proto-hover'); PROTO.removeB(); PROTO.applyC(); });
at(14000, () => { PROTO.removeC(); PROTO.applyA2(); });
at(16500, () => { PROTO.removeA2(); PROTO.applyD(); });
return { box, dpr: devicePixelRatio, viewport: [innerWidth, innerHeight] };
