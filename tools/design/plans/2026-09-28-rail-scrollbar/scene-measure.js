// MEASURE RUN (1280x900, classic bars): the cause, then each option's behaviour. Awaited; returns JSON.
const M = {};
// a Favourites row with ONE tile = a row that fits (the control), exactly as queue 565's test builds it
const favId = FM.filters.all()[0].id;
if (!FM.filters.isFave(favId)) FM.filters.toggleFave(favId);
let grids = await openFilters();
M.rowsNow = grids.map(rowFacts).map(r => [r.label, r.tiles + ' tiles', r.sw + '/' + r.cw, 'bar ' + r.barPx + 'px', r.scrollbarWidth, r.scrollbarColor].join(' | '));
M.htmlColorScheme = getComputedStyle(document.documentElement).colorScheme;

// ---- THE CAUSE: which rule decides the bar? Three rows, three inline overrides, same stylesheet ----
const big = grids.filter(g => g.scrollWidth > g.clientWidth + 4);
big[0].style.scrollbarWidth = 'auto';                                          // standard props back to auto
big[1].style.scrollbarWidth = 'auto'; big[1].style.scrollbarColor = 'red blue';  // a standard prop set again
await sleep(200);
M.cause = {
  asShipped: 'bar ' + (big[2].offsetHeight - big[2].clientHeight) + 'px (scrollbar-width: thin → the ::-webkit rules are ignored)',
  widthAuto: 'bar ' + (big[0].offsetHeight - big[0].clientHeight) + 'px (scrollbar-width: auto → the ::-webkit rules apply: 6px, var(--line) thumb)',
  colorSet: 'bar ' + (big[1].offsetHeight - big[1].clientHeight) + 'px (scrollbar-color set → ::-webkit ignored again)'
};
big[0].style.scrollbarWidth = ''; big[1].style.scrollbarWidth = ''; big[1].style.scrollbarColor = '';
await sleep(100);

// ---- A ----
const railRowTopsBefore = grids.map(g => Math.round(g.getBoundingClientRect().top));
PROTO.applyA();
await sleep(300);
grids = visibleGrids();
const rails = [].slice.call(document.querySelectorAll('.flt-rail'));
const A = { rails: rails.length, bars: grids.map(g => g.offsetHeight - g.clientHeight).join(','),
  computed: getComputedStyle(grids[1]).scrollbarWidth, pseudo: getComputedStyle(grids[1], '::-webkit-scrollbar').display };
A.dotsStillNextSibling = grids.every(g => g.nextElementSibling && g.nextElementSibling.classList.contains('flt-dots'));
A.states = rails.map(r => (r.classList.contains('can-l') ? 'L' : '-') + (r.classList.contains('can-r') ? 'R' : '-')).join(' ');
const favRail = rails[0];
A.fitsControl = { tiles: favRail.querySelectorAll('.flt-tile').length, classes: favRail.className };
// click › on the first overflowing row and time the smooth scroll
const r1 = rails.filter(r => r.classList.contains('can-r'))[0], g1 = r1.querySelector('.flt-grid');
const tile = g1.querySelector('.flt-tile');
A.row = { cw: g1.clientWidth, sw: g1.scrollWidth, max: g1.scrollWidth - g1.clientWidth, tileW: +tile.getBoundingClientRect().width.toFixed(2) };
const settle = async () => { const t0 = performance.now(); let last = -1, same = 0;
  while (performance.now() - t0 < 2000) { await sleep(40); if (Math.abs(g1.scrollLeft - last) < 0.5) { if (++same >= 3) break; } else same = 0; last = g1.scrollLeft; }
  return Math.round(performance.now() - t0); };
const next = r1.querySelector('.fm-rail-arrow--next'), prev = r1.querySelector('.fm-rail-arrow--prev');
A.arrowRects = { next: next.getBoundingClientRect().toJSON(), star4: g1.querySelectorAll('.flt-fave')[3].getBoundingClientRect().toJSON() };
next.click(); A.click1 = { ms: await settle(), scrollLeft: +g1.scrollLeft.toFixed(2), state: r1.className };
next.click(); A.click2 = { ms: await settle(), scrollLeft: +g1.scrollLeft.toFixed(2), state: r1.className };
prev.click(); A.back1 = { ms: await settle(), scrollLeft: +g1.scrollLeft.toFixed(2), state: r1.className };
prev.click(); A.back2 = { ms: await settle(), scrollLeft: +g1.scrollLeft.toFixed(2), state: r1.className };
// the tile's own click must not fire from an arrow click (no pick badge appears)
A.picksAfterArrowClicks = document.querySelectorAll('.flt-tile.is-picked').length;
// keyboard: focusing a tile past the edge scrolls the row to it (Tab reaches every tile)
g1.scrollLeft = 0; await sleep(100);
g1.querySelectorAll('.flt-tile')[6].focus(); await sleep(250);
A.focusTile7 = { scrollLeft: Math.round(g1.scrollLeft), state: r1.className, activeIsTile: document.activeElement.classList.contains('flt-tile') };
A.overflowX = getComputedStyle(g1).overflowX;   // native trackpad swipe / shift+wheel path intact
A.rowTopsShift = grids.map((g, i) => Math.round(g.getBoundingClientRect().top) - railRowTopsBefore[i]).join(',');
M.A = A;

// ResizeObserver on a row: does it fire when the inspector rebuilds and the row leaves the DOM?
let roCalls = 0; const ro = new ResizeObserver(() => { roCalls++; }); ro.observe(g1); await sleep(150);
const before = roCalls; FM.inspector.refresh(); await sleep(300);
M.roOnRemoval = { callsBefore: before, callsAfterRebuild: roCalls, connected: g1.isConnected };
ro.disconnect();
PROTO.removeA();

// the rebuilt panel: re-find
grids = visibleGrids();
const scroller = document.getElementById('inspector');
// ---- B ----
PROTO.applyB(); await sleep(200);
M.B = { barAtRest: grids.map(g => g.offsetHeight - g.clientHeight).join(','), colour: getComputedStyle(grids[1]).scrollbarColor };
grids[1].classList.add('proto-hover'); await sleep(100);
M.B.colourHover = getComputedStyle(grids[1]).scrollbarColor;
grids[1].classList.remove('proto-hover');
PROTO.removeB();

// ---- C: how much of the panel's own scroll would a vertical wheel over a row swallow? ----
PROTO.applyC(); await sleep(200);
const gh = grids.reduce((s, g) => s + g.getBoundingClientRect().height, 0);
const ticks = grids.map(g => Math.ceil(Math.max(0, g.scrollWidth - g.clientWidth) / 100));
const ev = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
const gC = grids.filter(g => g.scrollWidth > g.clientWidth + 4)[0]; gC.scrollLeft = 0;
gC.dispatchEvent(ev);
M.C = { panelScrollHeight: scroller.scrollHeight, panelClientHeight: scroller.clientHeight,
  rowsHeight: Math.round(gh), shareOfPanelUnderRows: +(gh / scroller.scrollHeight).toFixed(2),
  notchesSwallowedPerRow: ticks.join(','), totalNotches: ticks.reduce((a, b) => a + b, 0),
  wheelDown100: { prevented: ev.defaultPrevented, scrollLeft: gC.scrollLeft } };
PROTO.removeC();

// ---- A2: the Add menu's own ‹ • • › under each row — what it costs the panel in height ----
const h0 = scroller.scrollHeight;
PROTO.applyA2(); await sleep(200);
M.A2 = { panelScrollHeightBefore: h0, after: scroller.scrollHeight, extraPx: scroller.scrollHeight - h0 };
PROTO.removeA2();
return M;
