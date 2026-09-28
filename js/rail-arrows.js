/* rail-arrows.js — SIDEWAYS ROWS ON A MOUSE (queue 976, and 977 for the effects menu's New row).
 *
 * Ezra, 28 Sep: *"On pc to slide through the filter menus theres a white slider bar that looks really tacky, and it shows
 * up on mac sometimes too, i think this stemmed from the main use of sliding being trackerpad"* — and a minute later:
 * *"also on pc without trackpad there seems to be no way to slide the new section in effects menu"*.
 *
 * He was right about the cause. A sideways row answers to a HORIZONTAL scroll, which a finger and a trackpad make and a
 * wheel mouse does not. The filter rows papered over that with a native scrollbar on a desktop pointer, and it came out
 * WHITE: since Chrome 121 an element that sets the standard `scrollbar-width` has its `::-webkit-scrollbar*` rules
 * IGNORED, so the dark `var(--line)` thumb written for it never applied (measured: thin = an 11px light bar; with
 * `scrollbar-width: auto` the same element drew the intended 6px dark one). The New row had no bar and no route at all.
 *
 * So a mouse gets what a mouse can use: ‹ and › at the row's ends, shown while the pointer is over the row and only on
 * a side that has more, a soft fade on that side, and one click = one page of whole tiles. No bar anywhere. Swipe,
 * trackpad and shift+wheel are untouched — the row is still an ordinary `overflow-x: auto` scroller.
 *
 * ⚠️ MOUSE ONLY. The CSS shows the arrows inside `(hover: hover) and (pointer: fine)` and nowhere else, so the phone's
 *    DOM gains two hidden buttons per row and nothing it can see (measured at 380: every row's box identical, the fade
 *    `none`, the arrows `display: none`).
 * ⚠️ NOT IN THE TAB ORDER, on purpose — the same call js/addmenu.js made for its dots. Every tile is already a button in
 *    the tab order, and focusing one scrolls the row to it (measured: focusing the 7th tile of Cinematic moved the row
 *    to 273px). Two more stops per row would add fourteen, and an arrow that hides at the end would drop focus on the floor.
 * ⚠️ ONE PAGE = THE WHOLE TILES THAT FIT, landing on a tile's start (Cinematic at 1280: 4 tiles, 0 → 273 → 342 end;
 *    back 342 → 68 → 0). The last step is short because nine tiles are not a multiple of four; it ends at the real end.
 */
(function () {
  'use strict';
  const FM = window.FM = window.FM || {};

  const CHEV = {
    '-1': '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '1': '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  // How far one page is: the whole items that fit in the row's inner width, times one item plus its gap.
  function geometry(sc, item) {
    const cs = getComputedStyle(sc);
    const gap = parseFloat(cs.columnGap) || 0;
    const inner = sc.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const first = sc.querySelector(item);
    const stride = first ? first.getBoundingClientRect().width + gap : inner;
    const per = Math.max(1, Math.floor((inner + gap + 1) / Math.max(1, stride)));
    return { stride: stride, per: per, max: Math.max(0, sc.scrollWidth - sc.clientWidth) };
  }

  function pageTo(sc, dir, item) {
    const g = geometry(sc, item);
    /* A second click while the first page is still gliding counts from where the first one is GOING, not from the
       half-way scrollLeft — otherwise two quick clicks move about one and a half pages, not two (review, 28 Sep). */
    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    const from = (typeof sc._railTo === 'number' && now - sc._railAt < 600) ? sc._railTo : sc.scrollLeft;
    const at = Math.round(from / Math.max(1, g.stride));
    const to = Math.max(0, Math.min(g.max, (at + dir * g.per) * g.stride));
    const still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    sc._railTo = to; sc._railAt = now;
    sc.scrollTo({ left: to, behavior: still ? 'auto' : 'smooth' });
    return to;
  }

  /* rail: the box the arrows are placed in (made position:relative by .fm-rail) — any ancestor of the scroller. The filter
     rows get a wrapper of their own holding the grid AND its dots, so `grid.nextElementSibling` is still the dot host
     queue 565's test reads; the New row uses its existing .fxb-section, so the row keeps its parent (test 917.13 finds
     the title through `row.parentElement`). The arrows sit `--rail-arrow-y` below the scroller's own top, which the
     place() below writes as `--rail-sc-top` — 0 for a wrapper, the title’s height for a section.
     sc: the scroller. opts.item: selector for one tile (the step size). opts.onPage(dir): called before a page turn —
     the New row uses it to pause its auto-scroll, whose 30 ms tick would otherwise cancel the smooth scroll. */
  FM.railArrows = function (rail, sc, opts) {
    /* ONCE PER RAIL (review, 28 Sep): a second call on the same box would add a second pair of arrows and a second
       observer. Every caller builds a fresh rail today, so this is a guard, not a path. */
    if (rail._fmRailArrows) return rail._fmRailArrows;
    opts = opts || {};
    const item = opts.item || ':scope > *';
    rail.classList.add('fm-rail');
    sc.classList.add('fm-rail-sc');
    /* ⚠️ A SPENT ARROW STAYS UNDER THE POINTER (review, 29 Sep). Clicking › until it stops is what a mouse does, and the
       › used to hide the moment the row reached its end — so the NEXT click on that same spot went through to the tile
       underneath and picked it: a filter he never chose, previewed on his canvas (measured with a real mouse: Cinematic
       at 1280, whose short last step 273 → 342 looks like nothing moved, so he clicks again). An arrow he has pressed now
       holds its place — dimmed and inert (styles.css, .hold-l / .hold-r) — until the pointer leaves the row; then it goes,
       because an arrow only belongs on a side that has more. */
    const hold = (dir) => rail.classList.add(dir < 0 ? 'hold-l' : 'hold-r');
    rail.addEventListener('pointerleave', () => rail.classList.remove('hold-l', 'hold-r'));
    [-1, 1].forEach((dir) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fm-rail-arrow fm-rail-arrow--' + (dir < 0 ? 'prev' : 'next');
      b.tabIndex = -1;
      b.setAttribute('aria-hidden', 'true');
      b.title = dir < 0 ? 'Back' : 'More';
      b.innerHTML = CHEV[dir];   // a constant: no user data
      b.addEventListener('pointerdown', () => hold(dir));   // before the release: the row can reach its end mid-click
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        hold(dir);
        if (!rail.classList.contains(dir < 0 ? 'can-l' : 'can-r')) return;   // spent: it only swallows the click
        if (opts.onPage) opts.onPage(dir);
        pageTo(sc, dir, item);
      });
      rail.appendChild(b);
    });
    const place = () => { const t = sc.offsetTop + 'px'; if (rail.style.getPropertyValue('--rail-sc-top') !== t) rail.style.setProperty('--rail-sc-top', t); };
    const sync = () => {
      const max = sc.scrollWidth - sc.clientWidth;
      rail.classList.toggle('can-l', max > 4 && sc.scrollLeft > 2);
      rail.classList.toggle('can-r', max > 4 && sc.scrollLeft < max - 2);
    };
    sc.addEventListener('scroll', sync, { passive: true });
    /* The row has no width the moment it is built (the panel is still laying out), so a single sync would read "fits"
       every time — the same reason rowDots watches its row. Measured: the observer DOES fire once more when an inspector
       rebuild takes the row out of the document, which is where it lets go. */
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => { if (!sc.isConnected) { ro.disconnect(); return; } place(); sync(); });
      ro.observe(sc);
    }
    setTimeout(() => { place(); sync(); }, 0);
    rail._fmRailArrows = { sync: sync, page: (dir) => pageTo(sc, dir, item) };
    return rail._fmRailArrows;
  };
  FM._railGeometry = geometry;   // suite seam
})();
