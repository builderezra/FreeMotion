  /* Queue 976. Ezra, 28 Sep: "On pc to slide through the filter menus theres a white slider bar that looks really tacky,
     and it shows up on mac sometimes too, i think this stemmed from the main use of sliding being trackerpad".
     The bar was `scrollbar-width: thin` under (hover: hover) and (pointer: fine), and since Chrome 121 that standard
     property switches OFF the ::-webkit-scrollbar rules written to make it dark, so it drew the browser's light bar.
     A mouse gets ‹ › instead (js/rail-arrows.js). This test is the synthetic half — the structure, the paging and the
     control; the next one drives a REAL mouse for the hover and the hit-test, which no script event can prove. */
  test('976: on a mouse a filter row has no scrollbar — ‹ › at its ends page it, one page of whole tiles at a time', { item: '976' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const homeWasOpen = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    const realMount = FM.fxThumbs && FM.fxThumbs.mountFilter;   // 30 generating canvases are not what this is about (LOOP rule 17)
    if (realMount) FM.fxThumbs.mountFilter = function () {};
    let favedForTest = null;
    // a smooth scroll's end is only observable once it stops moving
    const settle = async (g) => { let last = -1, same = 0; const t0 = Date.now();
      while (Date.now() - t0 < 2500) { await sleep(40); if (Math.abs(g.scrollLeft - last) < 0.5) { if (++same >= 3) return; } else same = 0; last = g.scrollLeft; } };
    try {
      if (homeWasOpen) FM.home.close();
      // THE ROW THAT FITS, made real the way queue 565's test makes it: one favourite = a one-tile Favourites row
      favedForTest = (FM.filters.faves && !FM.filters.faves().length) ? FM.filters.all()[0].id : null;
      if (favedForTest) FM.filters.toggleFave(favedForTest);
      await sleep(150);
      const L = FM.makeLayer('shape', { name: 'rail', shape: 'rect', x: 60, y: 60, shapeW: 60, shapeH: 60, fill: '#c05030' });
      L.start = 0; L.duration = 4; L.effects = [];
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.selectLayer(L.id); FM.refreshAll(); await sleep(250);
      FM.inspector.openCategory('effects'); await sleep(250);
      FM.inspector.openFxTab('filters'); await sleep(600);
      const grids = [].slice.call(document.getElementById('inspector-panel').querySelectorAll('.flt-grid'));
      if (grids.length < 2) throw new Error('only ' + grids.length + ' filter rows rendered');

      // 1. NO NATIVE BAR, on any pointer. On HEAD a desktop pointer reads `thin` here and an 11px gutter below.
      grids.forEach((g, i) => {
        const sw = getComputedStyle(g).scrollbarWidth, gutter = g.offsetHeight - g.clientHeight;
        if (sw !== 'none') throw new Error('filter row ' + i + ' asks for a native scrollbar (scrollbar-width: ' + sw + ') — on a PC, and on a Mac with a mouse, that is the white bar he called tacky');
        if (gutter > 0) throw new Error('filter row ' + i + ' reserves ' + gutter + 'px for a scrollbar');
      });
      // 2. every row sits in a rail with its two arrows — and its dots stay its next sibling (queue 565's contract)
      grids.forEach((g, i) => {
        const rail = g.parentElement;
        if (!rail || !rail.classList.contains('fm-rail')) throw new Error('filter row ' + i + ' is not inside a .fm-rail — nothing can put ‹ › at its ends');
        if (!g.nextElementSibling || !g.nextElementSibling.classList.contains('flt-dots')) throw new Error('filter row ' + i + ' lost its dots as its next sibling (queue 565)');
        if (rail.querySelectorAll(':scope > .fm-rail-arrow').length !== 2) throw new Error('filter row ' + i + ' has ' + rail.querySelectorAll(':scope > .fm-rail-arrow').length + ' arrows, not 2');
      });
      // …and ONCE: attaching again to a rail that has arrows must not add a second pair (review, 28 Sep)
      { const r0 = grids[0].parentElement; FM.railArrows(r0, grids[0], { item: '.flt-tile' });
        const n0 = r0.querySelectorAll(':scope > .fm-rail-arrow').length;
        if (n0 !== 2) throw new Error('attaching the arrows twice to one row gave it ' + n0 + ' arrows — a rebuild would stack them'); }
      const over = grids.filter(g => g.scrollWidth > g.clientWidth + 4), fits = grids.filter(g => g.scrollWidth <= g.clientWidth + 4);
      // CONTROL: both kinds of row must exist, or half of what follows proved nothing
      if (!over.length) throw new Error('no filter row overflows, so paging was never tested');
      if (!fits.length) throw new Error('every filter row overflows, so "a row that fits offers no arrow" was never tested');
      fits.forEach(g => { const r = g.parentElement;
        if (r.classList.contains('can-l') || r.classList.contains('can-r')) throw new Error('a row that fits (' + g.children.length + ' tile) offers an arrow: ' + r.className); });

      const g = over[0], rail = g.parentElement;
      const next = rail.querySelector('.fm-rail-arrow--next'), prev = rail.querySelector('.fm-rail-arrow--prev');
      /* THE TOUCH HALF, read from the stylesheet: both suite passes run on a desktop pointer (380 is a narrow MOUSE), so no
         pass ever sees (hover: none). What keeps the phone untouched is that the only rule drawing an arrow lives inside
         (hover: hover) and (pointer: fine), over a bare `display: none` — so check exactly that. */
      const rules = [].concat.apply([], [].slice.call(document.styleSheets).map(ss => { try { return [].slice.call(ss.cssRules); } catch (e) { return []; } }));
      const bare = rules.some(r => r.selectorText === '.fm-rail-arrow' && r.style.display === 'none');
      const gated = rules.some(r => r.media && /hover:\s*hover/.test(r.media.mediaText) && /pointer:\s*fine/.test(r.media.mediaText)
        && [].slice.call(r.cssRules).some(x => x.selectorText === '.fm-rail-arrow' && x.style.display === 'flex'));
      if (!bare || !gated) throw new Error('the arrows are not drawn ONLY for a mouse (bare display:none ' + bare + ', shown inside (hover: hover) and (pointer: fine) ' + gated + ') — the phone was to stay exactly as it was');
      if (!fine) return;   // (not reached by either suite pass; kept so a real touch run cannot misread the mouse half)
      if (next.tabIndex !== -1 || next.getAttribute('aria-hidden') !== 'true') throw new Error('the › is in the tab order / the accessibility tree — the tiles are the keyboard path');
      // 3. at rest: only "more to the right"
      g.scrollLeft = 0; await sleep(120);
      if (!rail.classList.contains('can-r') || rail.classList.contains('can-l')) throw new Error('at rest the row says ' + rail.className + ' — expected can-r only');
      // 4. › moves ONE PAGE OF WHOLE TILES: a tile plus its gap, times the tiles that fit (4 here — measured, not assumed)
      const tile = g.querySelector('.flt-tile'), gap = parseFloat(getComputedStyle(g).columnGap) || 0;
      const stride = tile.getBoundingClientRect().width + gap, per = Math.floor((g.clientWidth + gap + 1) / stride);
      const max = g.scrollWidth - g.clientWidth;
      next.click(); await settle(g);
      const want = Math.min(max, per * stride);
      if (Math.abs(g.scrollLeft - want) > 2) throw new Error('one › moved the row to ' + g.scrollLeft.toFixed(1) + ', not one page of ' + per + ' tiles (' + want.toFixed(1) + ')');
      if (!rail.classList.contains('can-l')) throw new Error('after a page the ‹ is not offered (' + rail.className + ')');
      // …and the dots agree with the arrows: not on the last dot while › still has somewhere to go
      const dots = [].slice.call(g.nextElementSibling.children), on = () => dots.findIndex(d => d.classList.contains('on'));
      if (rail.classList.contains('can-r') && on() === dots.length - 1) throw new Error('the last dot is lit while › still offers more — the dots and the arrows disagree about where the end is');
      // 5. keep going: it stops AT the real end, and › goes away there
      for (let k = 0; k < 10 && rail.classList.contains('can-r'); k++) { next.click(); await settle(g); }
      if (Math.abs(g.scrollLeft - max) > 1) throw new Error('the › stopped at ' + g.scrollLeft.toFixed(1) + ', short of the end (' + max + ')');
      if (rail.classList.contains('can-r')) throw new Error('at the end the › is still offered');
      if (on() !== dots.length - 1) throw new Error('at the end the lit dot is ' + on() + ' of ' + dots.length);
      // 6. ‹ all the way home
      for (let k = 0; k < 10 && rail.classList.contains('can-l'); k++) { prev.click(); await settle(g); }
      if (g.scrollLeft > 1) throw new Error('the ‹ did not bring the row home (scrollLeft ' + g.scrollLeft.toFixed(1) + ')');
      // 7. an arrow is not a tile: nothing got picked by all that clicking
      if (document.querySelectorAll('.flt-tile.is-picked').length) throw new Error('clicking the arrows picked a filter');
      // 8. the keyboard route: focusing a tile off to the right brings the row to it
      const far = g.querySelectorAll('.flt-tile')[per + 2];
      if (far) { far.focus(); await sleep(250);
        if (!(g.scrollLeft > 0)) throw new Error('focusing tile ' + (per + 3) + ' did not scroll the row to it — a keyboard could not reach it'); }
    } finally {
      if (favedForTest && FM.filters.isFave(favedForTest)) FM.filters.toggleFave(favedForTest);
      if (realMount) FM.fxThumbs.mountFilter = realMount;
      FM.scene.layers = layers0; FM.selectLayer(sel0 || null);
      if (FM.inspector && FM.inspector.back) { try { FM.inspector.back(); } catch (e) {} }
      if (FM.refreshAll) FM.refreshAll();
      await sleep(150);
      if (homeWasOpen && FM.home && FM.home.open) { try { FM.home.open(); } catch (e) {} }
    }
  });

  /* Queue 976, with a REAL mouse (tests/_cdp.py's __fmWantInput, see 924): the hover that shows ‹ ›, the hit-test that
     proves the arrow is on top of the tile under it, a sideways wheel that still scrolls the row natively, and a plain
     vertical wheel over the row that scrolls the PANEL — the thing option C would have broken. */
  test('976: a real mouse over a filter row shows ›, clicking it pages, a sideways wheel still slides the row and a vertical one still scrolls the panel', { item: '976', budgetMs: 60000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;   // a finger has nothing to hover
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const homeWasOpen = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    const realMount = FM.fxThumbs && FM.fxThumbs.mountFilter;
    if (realMount) FM.fxThumbs.mountFilter = function () {};
    try {
      await onScreen924(async function () {
        await atWideWidth(async function () {
          if (homeWasOpen) FM.home.close();
          const L = FM.makeLayer('shape', { name: 'rail', shape: 'rect', x: 60, y: 60, shapeW: 60, shapeH: 60, fill: '#c05030' });
          L.start = 0; L.duration = 4; L.effects = [];
          FM.scene.layers.length = 0; FM.scene.layers.push(L);
          FM.selectLayer(L.id); FM.refreshAll(); await sleep(250);
          FM.inspector.openCategory('effects'); await sleep(250);
          FM.inspector.openFxTab('filters'); await sleep(600);
          const g = [].slice.call(document.querySelectorAll('#inspector-panel .flt-grid')).filter(x => x.scrollWidth > x.clientWidth + 4)[0];
          if (!g) throw new Error('setup: no filter row overflows');
          g.scrollIntoView({ block: 'center' }); await sleep(200);
          const rail = g.parentElement, next = rail.querySelector('.fm-rail-arrow--next');
          if (!next) throw new Error('the filter row has no › — a mouse has no way along it but a native bar');
          const r = g.getBoundingClientRect(), mid = { x: r.left + r.width * 0.4, y: r.top + r.height / 2 };
          if (r.top < 0 || r.bottom > innerHeight) throw new Error('setup: the row is off screen (' + Math.round(r.top) + '..' + Math.round(r.bottom) + ')');
          // CONTROL: pointer away from the row — the › is not showing
          await realInput924([{ t: 'mouseMove', x: 5, y: 5, ms: 250 }], 'pointer away');
          if (getComputedStyle(next).visibility !== 'hidden') throw new Error('CONTROL: with the pointer away the › is showing — then the hover below proves nothing');
          await realInput924([{ t: 'mouseMove', x: mid.x, y: mid.y, ms: 250 }], 'pointer over the row');
          if (getComputedStyle(next).visibility !== 'visible' || parseFloat(getComputedStyle(next).opacity) < 0.99) throw new Error('with the pointer over a row that has more, the › is not showing');
          const b = next.getBoundingClientRect(), c = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
          if (document.elementFromPoint(c.x, c.y) !== next && !next.contains(document.elementFromPoint(c.x, c.y))) throw new Error('the › is showing but the tile under it takes the click (' + (document.elementFromPoint(c.x, c.y) || {}).className + ')');
          const s0 = g.scrollLeft;
          await realInput924([{ t: 'mouseMove', x: c.x, y: c.y, ms: 30 }, { t: 'mouseDown', x: c.x, y: c.y, ms: 40 }, { t: 'mouseUp', x: c.x, y: c.y, ms: 700 }], 'a real click on ›');
          if (!(g.scrollLeft > s0 + g.clientWidth * 0.8)) throw new Error('a real click on › moved the row ' + (g.scrollLeft - s0).toFixed(1) + 'px, not about a page (' + g.clientWidth + ')');
          if (document.querySelectorAll('.flt-tile.is-picked').length) throw new Error('the real click on › picked the filter under it');
          // a sideways wheel (a trackpad swipe, or shift+wheel on Windows) is still the browser's own
          g.scrollLeft = 0; await sleep(150);
          await realInput924([{ t: 'mouseMove', x: mid.x, y: mid.y, ms: 30 }, { t: 'wheel', x: mid.x, y: mid.y, dx: 120, dy: 0, ms: 400 }], 'a sideways wheel over the row');
          if (!(g.scrollLeft > 20)) throw new Error('a real sideways wheel no longer slides the row (scrollLeft ' + g.scrollLeft + ')');
          // a plain wheel over the row scrolls the PANEL, not the row
          g.scrollLeft = 0; await sleep(150);
          const panel = document.getElementById('inspector'), p0 = panel.scrollTop;
          await realInput924([{ t: 'wheel', x: mid.x, y: mid.y, dx: 0, dy: 120, ms: 400 }], 'a plain wheel over the row');
          if (g.scrollLeft > 1) throw new Error('a plain wheel over the row slid it sideways (' + g.scrollLeft + ') — the panel’s own scroll is being caught');
          if (!(panel.scrollTop > p0)) throw new Error('a plain wheel over the row did not scroll the panel (' + p0 + ' → ' + panel.scrollTop + ')');
        }, 1280);
      });
    } finally {
      if (realMount) FM.fxThumbs.mountFilter = realMount;
      FM.scene.layers = layers0; FM.selectLayer(sel0 || null);
      if (FM.inspector && FM.inspector.back) { try { FM.inspector.back(); } catch (e) {} }
      if (FM.refreshAll) FM.refreshAll();
      await sleep(150);
      if (homeWasOpen && FM.home && FM.home.open) { try { FM.home.open(); } catch (e) {} }
    }
  });

  /* Queue 977. Ezra, 28 Sep: "also on pc without trackpad there seems to be no way to slide the new section in effects
     menu". The same helper on the New row — and a page turn must PAUSE the auto-scroll, whose 30 ms tick would
     otherwise cancel the smooth scroll halfway and carry on as if nothing had been clicked. */
  test('977: on a mouse the effects menu’s New row has ‹ ›, and › pages it and pauses the auto-scroll', { item: '977' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const layers0 = FM.scene.layers.slice();
    try {
      const L = FM.makeLayer('shape', { shape: 'rect', x: 100, y: 100, shapeW: 80, shapeH: 80, fill: '#c04070' });
      L.start = 0; L.duration = 5;
      FM.scene.layers.push(L); FM.selectLayer(L.id); FM.refreshAll(); await sleep(160);
      FM.fxBrowser.open(L); await sleep(500);
      const row = document.querySelector('#fx-browser .fxb-featured');
      if (!row) throw new Error('the New row did not render');
      const sec = row.parentElement;
      if (!sec.classList.contains('fm-rail')) throw new Error('the New row’s section is not a .fm-rail — a mouse has no way to slide it');
      if (getComputedStyle(row).scrollbarWidth !== 'none') throw new Error('the New row asks for a native scrollbar');
      const next = sec.querySelector(':scope > .fm-rail-arrow--next');
      if (!next) throw new Error('the New row has no ›');
      if (!matchMedia('(hover: hover) and (pointer: fine)').matches) {
        if (getComputedStyle(next).display !== 'none') throw new Error('the › is drawn on a touch screen');
        return;
      }
      if (!(row.scrollWidth - row.clientWidth > 100)) throw new Error('setup: the New row does not overflow (' + row.scrollWidth + ' in ' + row.clientWidth + ')');
      row.scrollLeft = 0; row._autoLeft = 0; await sleep(100);
      if (!sec.classList.contains('can-r')) throw new Error('at the start the New row does not offer › (' + sec.className + ')');
      const card = row.querySelector('.fxb-card'), stride = card.getBoundingClientRect().width + (parseFloat(getComputedStyle(row).columnGap) || 0);
      next.click();
      if (!(FM._fxAutoPausedFor() > 1000)) throw new Error('a page turn did not pause the auto-scroll (' + Math.round(FM._fxAutoPausedFor()) + ' ms left) — its tick would cancel the smooth scroll');
      await sleep(900);
      const at = row.scrollLeft;
      if (!(at >= stride - 2)) throw new Error('one › moved the New row ' + at.toFixed(1) + 'px — not even one card (' + stride.toFixed(1) + ')');
      if (Math.abs(at / stride - Math.round(at / stride)) > 0.03) throw new Error('the › left the New row between cards (' + at.toFixed(1) + ' / ' + stride.toFixed(1) + ') — it should land on a card');
      await sleep(600);
      if (Math.abs(row.scrollLeft - at) > 1) throw new Error('after the page turn the New row carried on moving (' + at.toFixed(1) + ' → ' + row.scrollLeft.toFixed(1) + ') — the auto-scroll was not held');
      if (!sec.classList.contains('can-l')) throw new Error('after a page the New row does not offer ‹');
    } finally {
      if (FM.fxBrowser && FM.fxBrowser.close) FM.fxBrowser.close();
      FM.scene.layers.length = 0; layers0.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(null); FM.refreshAll(); await sleep(100);
    }
  });
