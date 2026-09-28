// PROTOTYPES, injected at runtime — nothing in the app is edited. run.sh puts code/rail-arrows.js (FM.railArrows) and
// code/rail.css (RAIL_CSS) in front of this file, verbatim, so option A is measured as the code the plan hands over.
// Anything marked PROTO is scaffolding: wrapping rows that already exist, and `.proto-hover` standing in for a mouse.
const PROTO = {};
PROTO.style = (id, css) => { let s = document.getElementById(id); if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); } s.textContent = css; };
PROTO.unstyle = id => { const s = document.getElementById(id); if (s) s.remove(); };

/* ---------- A: no bar anywhere; ‹ › at the row's ends on hover; a soft edge on the side that has more ----------
   The CSS is code/rail.css and the JS is code/rail-arrows.js — run.sh injects both VERBATIM (RAIL_CSS, FM.railArrows),
   so what is measured here is the code the plan hands the builder. PROTO-only: the old desktop block is neutralised by
   an override (the build deletes it), `.proto-hover` stands in for a real mouse hover in a screenshot, and existing rows
   are wrapped after the fact (the build wraps them as it creates them). */
PROTO.cssOld = `@media (hover: hover) and (pointer: fine) { .flt-grid { scrollbar-width: none; } .flt-grid::-webkit-scrollbar { display: none; } }`;
PROTO.cssHover = `@media (hover: hover) and (pointer: fine) {
  .fm-rail.can-l.proto-hover > .fm-rail-arrow--prev, .fm-rail.can-r.proto-hover > .fm-rail-arrow--next { opacity: 1; visibility: visible; transition: none; } }`;
// PROTO: the plan's new rowDots mark() — page = one arrow step (clientWidth + gap), the last dot only at the real end.
// Registered after rowDots' own listener, so it wins on every scroll; the build replaces mark() instead (plan §5.3).
function protoMark(ev) {
  const grid = ev.currentTarget, host = grid.nextElementSibling;
  if (!host || !host.classList.contains('flt-dots') || !host.children.length) return;
  const count = host.querySelectorAll('.addmenu-dot').length;
  const max = grid.scrollWidth - grid.clientWidth;
  const pageW = grid.clientWidth + (parseFloat(getComputedStyle(grid).columnGap) || 0);
  const i = grid.scrollLeft >= max - 2 ? count - 1 : Math.min(count - 2, Math.round(grid.scrollLeft / pageW));
  host.querySelectorAll('.addmenu-dot').forEach((d, k) => d.classList.toggle('on', k === i));
}
PROTO.wrap = () => {
  document.querySelectorAll('.flt-grid').forEach(grid => {
    if (grid.parentNode.classList.contains('flt-rail')) return;
    const dots = grid.nextElementSibling;
    const rail = document.createElement('div'); rail.className = 'flt-rail';
    grid.parentNode.insertBefore(rail, grid);
    rail.appendChild(grid);
    if (dots && dots.classList.contains('flt-dots')) rail.appendChild(dots);
    FM.railArrows(rail, grid, { item: '.flt-tile' });
    grid.addEventListener('scroll', protoMark, { passive: true });
  });
};
PROTO.unwrap = () => {
  document.querySelectorAll('.flt-rail').forEach(rail => {
    [].slice.call(rail.children).forEach(c => { if (c.classList.contains('fm-rail-arrow')) c.remove(); else rail.parentNode.insertBefore(c, rail); });
    rail.remove();
  });
  // PROTO: moving a scroller in the DOM resets its scrollLeft WITHOUT a scroll event, so the dots go stale
  document.querySelectorAll('.flt-grid').forEach(g => { g.classList.remove('fm-rail-sc'); g.removeEventListener('scroll', protoMark); g.dispatchEvent(new Event('scroll')); });
};
PROTO.applyA = () => { PROTO.style('proto-rail', RAIL_CSS); PROTO.style('proto-old', PROTO.cssOld); PROTO.style('proto-hover', PROTO.cssHover); PROTO.wrap(); };
PROTO.removeA = () => { PROTO.unstyle('proto-rail'); PROTO.unstyle('proto-old'); PROTO.unstyle('proto-hover'); PROTO.unwrap(); };
// the effects browser's New row (and the audio browser's Featured row): same helper, second consumer
PROTO.wrapFeatured = () => {
  document.querySelectorAll('.fxb-featured').forEach(row => {
    const sec = row.parentNode;
    if (sec.classList.contains('fm-rail')) return;
    // PROTO: the build passes `onPage: () => { autoPauseUntil = Math.max(autoPauseUntil, perfNow() + CAROUSEL_PAUSE_MS); }`;
    // from outside the closure the same pause is reached through FM.carouselPause's own wheel listener.
    FM.railArrows(sec, row, { item: '.fxb-card', onPage: () => row.dispatchEvent(new WheelEvent('wheel', { deltaX: 1 })) });
  });
};

/* ---------- B: keep a bar, but dark and thin, and only while the pointer is over the row ---------- */
PROTO.cssB = `
@media (hover: hover) and (pointer: fine) {
  @supports (scrollbar-color: red blue) {
    .flt-grid { scrollbar-width: thin; scrollbar-color: transparent transparent; }
    .flt-grid:is(:hover, .proto-hover) { scrollbar-color: color-mix(in srgb, var(--text) 32%, transparent) transparent; }
  }
  @supports not (scrollbar-color: red blue) {   /* Safari: the prefixed bar (UNMEASURED here — Chrome only) */
    .flt-grid::-webkit-scrollbar { display: block; height: 6px; background: transparent; }
    .flt-grid::-webkit-scrollbar-thumb { background: transparent; border-radius: 3px; }
    .flt-grid:hover::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--text) 32%, transparent); }
  }
}
`;
PROTO.applyB = () => PROTO.style('proto-b', PROTO.cssB);
PROTO.removeB = () => PROTO.unstyle('proto-b');

/* ---------- C: no bar; a plain vertical wheel over a row that can still move slides it sideways ---------- */
PROTO.cssC = `@media (hover: hover) and (pointer: fine) { .flt-grid { scrollbar-width: none; } .flt-grid::-webkit-scrollbar { display: none; } }`;
function wheelSideways(ev) {
  const grid = ev.currentTarget;
  if (Math.abs(ev.deltaX) >= Math.abs(ev.deltaY) || !ev.deltaY) return;   // a trackpad swipe sideways: leave it alone
  const max = grid.scrollWidth - grid.clientWidth;
  if (max <= 4) return;
  if ((ev.deltaY < 0 && grid.scrollLeft <= 0) || (ev.deltaY > 0 && grid.scrollLeft >= max - 1)) return;   // at an end: the panel scrolls
  ev.preventDefault();
  grid.scrollLeft = Math.max(0, Math.min(max, grid.scrollLeft + ev.deltaY));
}
PROTO.applyC = () => { PROTO.style('proto-c', PROTO.cssC); document.querySelectorAll('.flt-grid').forEach(g => g.addEventListener('wheel', wheelSideways, { passive: false })); };
PROTO.removeC = () => { PROTO.unstyle('proto-c'); document.querySelectorAll('.flt-grid').forEach(g => g.removeEventListener('wheel', wheelSideways)); };

/* ---------- A2: the Add menu's OWN PC pager (queue 50) under the row: ‹ • • › ---------- */
PROTO.cssA2 = `@media (hover: hover) and (pointer: fine) { .flt-grid { scrollbar-width: none; } .flt-grid::-webkit-scrollbar { display: none; }
  .flt-dots.flt-dots--pc { min-height: 24px; align-items: center; cursor: pointer; } }`;
PROTO.applyA2 = () => {
  PROTO.style('proto-a2', PROTO.cssA2);
  document.querySelectorAll('.flt-grid').forEach(grid => {
    const dots = grid.nextElementSibling;
    if (!dots || dots.classList.contains('hidden') || dots.querySelector('.addmenu-pgbtn')) return;
    dots.classList.add('flt-dots--pc');
    const mk = (dir, glyph) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'addmenu-pgbtn'; b.textContent = glyph;
      b.addEventListener('click', ev => { ev.stopPropagation(); const g = FM._railGeometry(grid, '.flt-tile'); grid.scrollTo({ left: Math.max(0, Math.min(g.max, (Math.round(grid.scrollLeft / g.stride) + dir * g.per) * g.stride)), behavior: 'smooth' }); }); return b; };
    dots.insertBefore(mk(-1, '‹'), dots.firstChild); dots.appendChild(mk(1, '›'));
  });
};
PROTO.removeA2 = () => { PROTO.unstyle('proto-a2'); document.querySelectorAll('.flt-dots--pc').forEach(d => { d.classList.remove('flt-dots--pc'); d.querySelectorAll('.addmenu-pgbtn').forEach(b => b.remove()); }); };

/* ---------- D (add-on): the OTHER native bars — the inspector's, the timeline's — painted in the dark scheme ---------- */
PROTO.cssD = `body:not(.home-open) { color-scheme: dark; }`;   // reaches #fx-browser, #add-sheet… too (they sit outside #app)
PROTO.applyD = () => PROTO.style('proto-d', PROTO.cssD);
PROTO.removeD = () => PROTO.unstyle('proto-d');

/* ---------- A on the template screen's slot rail (Insert your Media): the same white bar, on templates with 8+ slots ---------- */
PROTO.cssTfill = `.tfill-slots { scrollbar-width: none; } .tfill-slots::-webkit-scrollbar { display: none; }
@media (min-width: 701px) { .tfill-rail { width: min(680px, 94vw); } .tfill-rail > .tfill-slots { width: auto; } }
.tfill-rail { --rail-arrow-y: 42px; }`;
PROTO.wrapTfill = () => {
  const s = document.querySelector('#tpl-fill .tfill-slots');
  if (!s || s.parentNode.classList.contains('tfill-rail')) return;
  const rail = document.createElement('div'); rail.className = 'tfill-rail';
  s.parentNode.insertBefore(rail, s); rail.appendChild(s);
  FM.railArrows(rail, s, { item: '.tfill-slot' });
};
