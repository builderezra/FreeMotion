  /* ================= QUEUE 963 — the Add menu and the layer inspector shrink as ONE system (PC) =================
     Ezra, 26 Sep: *"When you shrink the add layer or like the layer inspect layer inspector on PC, it should just lose the
     text when it gets too small. Because it just looks really bunched up when it gets really small. Or just make or just
     figure out a way for it to shrink and still look good when it's small. And have the text and the picture and just so
     it's dynamic in a way that actually looks really good. Because right now, the dynamics of the add layer and the
     inspector layer are both very different. from each other and honestly they both are shit in their own ways and
     they're also both good in their own ways so just maybe have a big look through that"*
     Measured on v17.03 (tools/design/plans/2026-09-26-panels/plan.md §3), 1280 wide:
       · inspector, 232–300px band: 12px icons under 11.5px names in 87x48–68 cards — the bunched look, as numbers;
       · inspector, 190px band: the third row needs 23px of scrolling, "Outline &" and "Customise" lose their second line;
       · Add menu, 190px band: the solver gives up and the body is a 56px scroller over 133px of tiles; at 150, 16px.
     Helpers for the five tests below. */
  function q963Lines(lab, card) {   // every painted line of a label: whole, and inside its card?
    const lr = lab.getBoundingClientRect(), cr = card.getBoundingClientRect();
    const clip = getComputedStyle(lab).overflow !== 'visible';
    const rg = document.createRange(); rg.selectNodeContents(lab);
    let shown = 0;
    for (const q of rg.getClientRects()) {
      if (q.width < 0.5) continue;
      const top = clip ? Math.max(q.top, lr.top) : q.top, bot = clip ? Math.min(q.bottom, lr.bottom) : q.bottom;
      if (bot - top < 0.5) continue;                       // a line the row's two-line clamp hid whole (its ellipsis says so)
      if (bot - top < q.height - 1) return 'a part-line (' + (bot - top).toFixed(1) + ' of ' + q.height.toFixed(1) + 'px)';
      // vertically exact; sideways a word may spill up to half the 8px gutter — the add menu's stacked rule since v5.69
      // ("far more readable spilling a few px into the gutter than cut to 'Capti…'"), which a 48px tile needs for "Adjustment"
      if (bot > cr.bottom + 0.5 || top < cr.top - 0.5 || q.left < cr.left - 4 || q.right > cr.right + 4) return 'a line outside its card';
      shown++;
    }
    return shown ? '' : 'no line at all';
  }
  /* One card, either panel. Returns 'named' or 'icon', or throws with what is wrong. */
  function q963Card(c, icoSel, lblSel, where) {
    const cr = c.getBoundingClientRect();
    if (cr.width < 27.5 || cr.height < 27.5) throw new Error('a card is ' + cr.width.toFixed(1) + 'x' + cr.height.toFixed(1) + ' — under a 28px target' + where);
    const ic = c.querySelector(icoSel), lab = c.querySelector(lblSel);
    if (!ic || !lab) throw new Error('a card has no icon or no label element' + where);
    const ico = ic.getBoundingClientRect().width, name = (lab.textContent || '').trim();
    if (getComputedStyle(lab).display === 'none' || lab.getBoundingClientRect().height < 1) {
      const said = (c.getAttribute('aria-label') || c.title || '').trim();
      if (said !== name) throw new Error('"' + name + '" shows its picture alone and carries "' + said + '" as its name — nothing to hover or read' + where);
      if (ico < 17.5) throw new Error('"' + name + '" shows its picture alone at ' + ico.toFixed(1) + 'px' + where);
      return 'icon';
    }
    const fs = parseFloat(getComputedStyle(lab).fontSize);
    if (ico < fs * 1.5 - 0.1) throw new Error('"' + name + '" draws a ' + ico.toFixed(1) + 'px icon beside ' + fs + 'px words — the bunched look' + where);
    const bad = q963Lines(lab, c);
    if (bad) throw new Error('"' + name + '" shows ' + bad + where);
    return 'named';
  }
  const Q963_BANDS = [150, 165, 180, 200, 232, 264, 300, 360, 420];

  test('963 — the PC layer inspector shrinks without bunching: at every band the cards fit, a shown name is whole, and the icon is never smaller than its words', { item: '963' }, async function () {
    return await atWideWidth(async function () {
      const root = document.documentElement, prev = root.style.getPropertyValue('--tl-h');
      const keep = FM.scene.layers.slice();
      try {
        FM.scene.layers.length = 0;
        const L = FM.makeLayer('shape', { shape: 'star', x: 200, y: 200, shapeW: 200, shapeH: 200 });
        L.start = 0; L.duration = 3; FM.scene.layers.push(L);
        FM.refreshAll(); FM.selectLayer(L.id);
        await sleep(250);
        const panel = document.getElementById('inspector-panel'), insp = document.getElementById('inspector');
        const seen = {};
        for (const h of Q963_BANDS) {
          root.style.setProperty('--tl-h', h + 'px');
          await sleep(150);                                  // the ResizeObserver re-plans on the next frame
          const cards = [].slice.call(panel.querySelectorAll('#inspector .cat-card'));
          if (cards.length < 8) throw new Error('at a ' + h + 'px band only ' + cards.length + ' category cards — the grid this test guards is not showing');
          const wrap = document.querySelector('#inspector > .cat-wrap');
          const where = ' (band ' + h + 'px, plan "' + ((wrap && wrap.dataset.tf) || 'none') + '")';
          const scroll = insp.scrollHeight - insp.clientHeight;
          if (scroll > 1) throw new Error('the cards need ' + scroll + 'px of scrolling' + where);
          const pb = panel.getBoundingClientRect().bottom;
          for (const c of cards) {
            if (c.getBoundingClientRect().bottom > pb + 0.5) throw new Error('a card hangs ' + Math.round(c.getBoundingClientRect().bottom - pb) + 'px below the panel' + where);
            const kind = q963Card(c, '.cat-ico svg', '.cat-label', where);
            seen[kind] = (seen[kind] || 0) + 1;
          }
        }
        // CONTROL: the sweep reached the roomy end (names) and at least one smaller shape, or it proved nothing about shrinking
        if (!seen.named) throw new Error('CONTROL: no band showed the names — the sweep never reached the roomy end');
        const rungs = new Set();
        for (const h of [150, 420]) { root.style.setProperty('--tl-h', h + 'px'); await sleep(150); const w = document.querySelector('#inspector > .cat-wrap'); rungs.add(w && w.dataset.rung); }
        if (rungs.size < 2) throw new Error('CONTROL: 150px and 420px bands drew the same tile shape (' + [...rungs].join() + ') — nothing changed shape, so the small end was never exercised');
      } finally {
        if (prev) root.style.setProperty('--tl-h', prev); else root.style.removeProperty('--tl-h');
        FM.scene.layers.length = 0; keep.forEach(l => FM.scene.layers.push(l));
        FM.selectLayer(null); FM.refreshAll();
        await sleep(80);
      }
    }, 1280);
  });

  test('963 — the PC Add menu shrinks without a sliver: at every band its tiles sit whole inside the panel and nothing scrolls', { item: '963' }, async function () {
    return await atWideWidth(async function () {
      const root = document.documentElement, prev = root.style.getPropertyValue('--tl-h');
      const sel0 = FM.scene.selectedId;
      try {
        FM.selectLayer(null);
        if (FM.addMenu && FM.addMenu.openTab) FM.addMenu.openTab('object');   // Elements: nine fixed tiles, the tab that opens first
        await sleep(200);
        const panel = document.getElementById('inspector-panel');
        let sawNamed = 0;
        for (const h of Q963_BANDS) {
          root.style.setProperty('--tl-h', h + 'px');
          await sleep(200);                                  // addmenu.js's own observer redraws the tab
          const am = panel.querySelector('.addmenu');
          if (!am) throw new Error('deselecting did not put the Add menu in the panel — this test measured nothing');
          const where = ' (band ' + h + 'px, plan "' + (am.dataset.tf || 'none') + '")';
          const body = am.querySelector('.addmenu-body'), pager = am.querySelector('.addmenu-pager');
          if (!body || !pager) throw new Error('no .addmenu-body / .addmenu-pager' + where);
          const sc = body.scrollHeight - body.clientHeight;
          if (sc > 1) throw new Error('the Add menu body is a ' + body.clientHeight + 'px scroller over ' + body.scrollHeight + 'px of tiles — the sliver' + where);
          const pr = pager.getBoundingClientRect(), pb = panel.getBoundingClientRect().bottom;
          const cards = [].slice.call(am.querySelectorAll('.addmenu-body .addmenu-card')).filter(c => { const r = c.getBoundingClientRect(); return r.width > 0 && r.left >= pr.left - 1 && r.right <= pr.right + 1; });
          if (!cards.length) throw new Error('no tile on the page showing' + where);
          for (const c of cards) {
            if (c.getBoundingClientRect().bottom > pb + 0.5) throw new Error('a tile hangs ' + Math.round(c.getBoundingClientRect().bottom - pb) + 'px below the panel' + where);
            if (q963Card(c, '.addmenu-ic svg, .addmenu-ic .add-emoji', '.addmenu-lbl', where) === 'named') sawNamed++;
          }
          const dots = am.querySelector('.addmenu-dots');
          if (dots && dots.getBoundingClientRect().height > 0 && dots.getBoundingClientRect().bottom > pb + 0.5) throw new Error('the page dots sit ' + Math.round(dots.getBoundingClientRect().bottom - pb) + 'px below the panel — the pages cannot be turned' + where);
          for (const t of am.querySelectorAll('.addmenu-tab')) {
            const tr = t.getBoundingClientRect(), tl = t.querySelector('.addmenu-lbl');
            if (tr.height < 27.5) throw new Error('a tab is ' + tr.height.toFixed(1) + 'px tall' + where);
            const shows = tl && getComputedStyle(tl).display !== 'none' && tl.getBoundingClientRect().height > 1;
            if (shows && tl.getBoundingClientRect().bottom > tr.bottom + 0.5) throw new Error('the "' + tl.textContent + '" tab label is cut by its tab' + where);
            if (!shows && (t.title || '').trim() !== (tl ? tl.textContent.trim() : '')) throw new Error('a tab shows its icon alone with no name to hover' + where);
          }
        }
        // CONTROL: at 420 the nine Elements are all on one page with their names — the roomy end is intact
        root.style.setProperty('--tl-h', '420px'); await sleep(200);
        const am = panel.querySelector('.addmenu');
        if (am.querySelectorAll('.addmenu-page').length !== 1) throw new Error('CONTROL: at a 420px band the Elements tab still pages (' + am.querySelectorAll('.addmenu-page').length + ' pages)');
        if (!sawNamed) throw new Error('CONTROL: no band showed a named tile');
      } finally {
        if (prev) root.style.setProperty('--tl-h', prev); else root.style.removeProperty('--tl-h');
        FM.selectLayer(sel0 || null); FM.refreshAll();
        await sleep(80);
      }
    }, 1280);
  });

  test('963 — one planner for both panels: each grid carries its plan, and every tile is drawn at the size the plan wrote', { item: '963' }, async function () {
    /* "the dynamics of the add layer and the inspector layer are both very different" — the structural half of the fix is
       that they are no longer two mechanisms. Both grids are planned by FM.tileFit and drawn by the same [data-rung] rules,
       so each must carry a plan, and what is on screen must be exactly what that plan says. On v17.03 the inspector carries
       no plan at all (it was CSS arithmetic on --tl-h), which is the "two different systems" he described. */
    return await atWideWidth(async function () {
      if (!FM.tileFit || typeof FM.tileFit.plan !== 'function') throw new Error('FM.tileFit is not loaded — there is no shared planner');
      const root = document.documentElement, prev = root.style.getPropertyValue('--tl-h');
      const keep = FM.scene.layers.slice();
      const px = (el, v) => parseFloat(el.style.getPropertyValue(v));
      const check = function (grid, cards, icoSel, lblSel, what, h) {
        const where = ' (' + what + ', band ' + h + 'px, plan "' + (grid && grid.dataset.tf) + '")';
        if (!grid || !grid.dataset.rung) throw new Error(what + ' carries no plan at a ' + h + 'px band — it is not laid out by the shared planner');
        const cw = px(grid, '--tf-cw'), rh = px(grid, '--tf-row'), ico = px(grid, '--tf-ico');
        for (const c of cards) {
          const r = c.getBoundingClientRect();
          if (Math.abs(r.width - cw) > 1 || Math.abs(r.height - rh) > 1) throw new Error('a tile is ' + r.width.toFixed(1) + 'x' + r.height.toFixed(1) + ', the plan says ' + cw + 'x' + rh + where);
          const i = c.querySelector(icoSel).getBoundingClientRect().width;
          if (Math.abs(i - ico) > 1) throw new Error('an icon is ' + i.toFixed(1) + 'px, the plan says ' + ico + where);
          const lab = c.querySelector(lblSel), hidden = getComputedStyle(lab).display === 'none';
          if (hidden !== (grid.dataset.rung === 'icon')) throw new Error('the label is ' + (hidden ? 'hidden' : 'shown') + ' on the "' + grid.dataset.rung + '" rung' + where);
          const dir = getComputedStyle(c).flexDirection;
          if ((grid.dataset.rung === 'row') !== (dir === 'row')) throw new Error('a tile lays out as ' + dir + ' on the "' + grid.dataset.rung + '" rung' + where);
        }
      };
      try {
        FM.scene.layers.length = 0;
        const L = FM.makeLayer('shape', { shape: 'rect', x: 200, y: 200, shapeW: 200, shapeH: 200 });
        L.start = 0; L.duration = 3; FM.scene.layers.push(L);
        FM.refreshAll();
        const kinds = new Set();
        for (const h of [150, 190, 264, 420]) {
          root.style.setProperty('--tl-h', h + 'px');
          FM.selectLayer(L.id); await sleep(180);
          const wrap = document.querySelector('#inspector > .cat-wrap');
          check(wrap, [].slice.call(document.querySelectorAll('#inspector .cat-card')), '.cat-ico svg', '.cat-label', 'the inspector', h);
          kinds.add(wrap.dataset.rung);
          FM.selectLayer(null); await sleep(200);
          const am = document.querySelector('#inspector-panel .addmenu');
          const pr = am.querySelector('.addmenu-pager').getBoundingClientRect();
          check(am, [].slice.call(am.querySelectorAll('.addmenu-body .addmenu-card')).filter(c => { const r = c.getBoundingClientRect(); return r.width > 0 && r.left >= pr.left - 1 && r.right <= pr.right + 1; }), '.addmenu-ic svg, .addmenu-ic .add-emoji', '.addmenu-lbl', 'the Add menu', h);
          kinds.add(am.dataset.rung);
        }
        if (kinds.size < 2) throw new Error('CONTROL: every band drew the same tile shape (' + [...kinds].join() + ') — the rung switch was never exercised');
      } finally {
        if (prev) root.style.setProperty('--tl-h', prev); else root.style.removeProperty('--tl-h');
        FM.scene.layers.length = 0; keep.forEach(l => FM.scene.layers.push(l));
        FM.selectLayer(null); FM.refreshAll();
        await sleep(80);
      }
    }, 1280);
  });

  test('963 — FM.tileFit: a bigger box never shows fewer words, more pages, or a smaller icon', { item: '963' }, function () {
    /* The property that makes the shrink feel deliberate rather than jumpy: drag the band UP and the tiles only ever gain —
       a name comes back, never goes; a page folds away, never appears; inside one shape the icon only grows. Checked on the
       real planner over every box both panels can be (widths 272–372, the panel's 300–400 less its padding; heights from a
       squeezed 30px to a raised panel's 560) for the counts the two panels actually show. */
    const T = FM.tileFit;
    if (!T || typeof T.plan !== 'function') throw new Error('FM.tileFit.plan is missing — the one planner both panels share is not loaded');
    let checked = 0;
    for (const n of [3, 5, 8, 9]) for (let W = 272; W <= 372; W += 10) for (const fill of [false, true]) {
      let last = null;
      for (let H = 30; H <= 560; H++) {
        const p = T.plan(n, W, H, { fill: fill });
        if (last && !p) throw new Error(n + ' items, ' + W + 'x' + H + ': the plan vanished as the box grew');
        if (!p) continue;
        if (last) {
          const at = n + ' items in ' + W + 'x' + H + ' (' + last.kind + ' ' + last.cols + 'x' + last.rows + ' → ' + p.kind + ' ' + p.cols + 'x' + p.rows + ')';
          if (p.pages > last.pages) throw new Error('more pages in a bigger box: ' + at);
          if (p.pages === last.pages && (p.comfy || !last.comfy) && T.ORDER[p.kind] > T.ORDER[last.kind]) throw new Error('fewer words in a bigger box: ' + at);
          if (p.kind === last.kind && p.pages === last.pages && p.ico < last.ico - 0.01) throw new Error('a smaller icon in a bigger box: ' + at + ', ' + last.ico.toFixed(2) + ' → ' + p.ico.toFixed(2));
        }
        last = p; checked++;
      }
    }
    if (checked < 5000) throw new Error('CONTROL: only ' + checked + ' boxes were planned — the sweep did not run');
  });

  test('963 — at his 1440 window the nine Elements are on ONE page: no pager for a tab that fits', { item: '963' }, async function () {
    /* Found while measuring for 963: the Add menu planned against the box MINUS the pager's row first, and only tried the
       whole box if that had already fitted on one page. So a tab that needed those 26px to fit on one page never got them:
       at 1440x900 (panel 345.6 wide, band 270) the nine Elements were drawn five and four over two pages, with page
       arrows, while 5x2 fits the whole box. */
    return await atWideWidth(async function () {
      const root = document.documentElement, prev = root.style.getPropertyValue('--tl-h');
      const sel0 = FM.scene.selectedId;
      try {
        root.style.setProperty('--tl-h', '270px');           // 30vh of a 900px-tall window: his default band
        FM.selectLayer(null);
        if (FM.addMenu && FM.addMenu.openTab) FM.addMenu.openTab('object');
        await sleep(250);
        const am = document.querySelector('#inspector-panel .addmenu');
        if (!am) throw new Error('the Add menu is not in the panel');
        const all = am.querySelectorAll('.addmenu-body .addmenu-card').length;
        if (all < 9) throw new Error('CONTROL: the Elements tab has ' + all + ' tiles, not the nine this is about');
        const pages = am.querySelectorAll('.addmenu-page').length;
        if (pages !== 1) throw new Error('the nine Elements are drawn over ' + pages + ' pages at 1440x900 (plan "' + (am.dataset.amFit || am.dataset.tf) + '") — they fit on one');
        const named = [].slice.call(am.querySelectorAll('.addmenu-body .addmenu-lbl')).filter(l => getComputedStyle(l).display !== 'none' && l.getBoundingClientRect().height > 1).length;
        if (named < 9) throw new Error('only ' + named + ' of the nine show their names — one page was bought by dropping the words');
      } finally {
        if (prev) root.style.setProperty('--tl-h', prev); else root.style.removeProperty('--tl-h');
        FM.selectLayer(sel0 || null); FM.refreshAll();
        await sleep(80);
      }
    }, 1440);
  });
