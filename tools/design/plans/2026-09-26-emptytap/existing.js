  test('571: the empty timeline draws no stray dashed bar, and a tap anywhere in it works', { item: '571' }, async function () {
    /* Queue 571, clauses 1 and 2, from one phone screenshot of an empty project.
     * CLAUSE 1 — "Weird glitch here with the blue line". MEASURED at 380px: a dashed, tinted box
     *   **124px wide** down the LEFT of a 380px row, with the + (x158) and the caption (x104) centred
     *   OUTSIDE it. `--ar-x1` is `headW + PAD + duration * pxPerSec()` — the project's END (queue 551) —
     *   and **an empty project has duration 0**, so that end collapses onto the head column.
     *   It showed at all because queue 356 had removed the outline here by zeroing the ROW's
     *   border-color, and queue 550/551 then moved the outline onto `::before` without carrying that
     *   instruction across. The row obeyed him; the pseudo-element that took over its job never heard.
     * CLAUSE 2 — "make it so when you tap anywhere on the timeline it works, currently the bottom of
     *   the screen has a cut off". Two gaps, not one: the row ends at y=744, #tl-tracks at 797 (it
     *   carries 52px of bottom padding), and the panel at 820. 76px that looks like timeline and is not
     *   the row. The listener moved to #timeline, which already runs to the panel bottom.
     * ⚠️ BOTH controls matter. Clause 1 could be "fixed" by deleting the decoration everywhere, and
     * clause 2 by opening the add sheet on every tap in the app. The controls below fail either. */
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const homeWasOpen = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    const layers0 = FM.scene.layers.slice();
    const realAdd = FM.mobile ? FM.mobile.openAdd : null;
    try {
      if (homeWasOpen) FM.home.close();
      await sleep(100);
      return await atPhoneWidth(async function () {
        FM.scene.layers.length = 0;
        FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
        await sleep(260);
        const panel = document.getElementById('timeline-panel');
        if (!panel || !panel.classList.contains('tl-empty-start')) throw new Error('the empty-start state did not apply, so this test is measuring the wrong screen');
        const row = document.querySelector('.tl-addrow');
        if (!row) throw new Error('no .tl-addrow on an empty project');

        // --- clause 1: no stray bar ---
        const deco = getComputedStyle(row, '::before');
        if (deco.content !== 'none') {
          throw new Error('the empty timeline still draws its dashed decoration (' + deco.width + ' wide) — queue 356 asked for no lines here, and on an empty project --ar-x1 collapses to the head width so it lands as a stray bar down the left (queue 571 clause 1)');
        }

        // --- clause 2: a tap in the dead strip opens the add sheet ---
        let opened = 0;
        if (FM.mobile) FM.mobile.openAdd = function () { opened++; };
        const pb = panel.getBoundingClientRect();
        const deadY = Math.round(pb.bottom - 20);
        const rowBottom = Math.round(row.getBoundingClientRect().bottom);
        if (deadY <= rowBottom) throw new Error('the probe point (' + deadY + ') is not below the add row (' + rowBottom + '), so it cannot be testing the dead strip at all');
        const hit = document.elementFromPoint(190, deadY);
        if (hit) hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 190, clientY: deadY }));
        await sleep(90);
        if (opened !== 1) throw new Error('a tap ' + (deadY - rowBottom) + 'px below the add row, still inside the timeline panel, opened the add sheet ' + opened + ' times instead of once — that is the "cut off" at the bottom of the screen (queue 571 clause 2)');

        // --- CONTROL A: with a layer present, the SAME tap must do nothing ---
        const L = FM.makeLayer('shape', { name: 'X', shape: 'rect', x: 540, y: 960, shapeW: 200, shapeH: 200, fill: '#3a7bd5' });
        L.start = 0; L.duration = 3; FM.scene.layers.push(L);
        FM.refreshAll(); FM.timeline.rebuild();
        await sleep(260);
        opened = 0;
        const hit2 = document.elementFromPoint(190, deadY);
        if (hit2) hit2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 190, clientY: deadY }));
        await sleep(90);
        if (opened !== 0) throw new Error('CONTROL FAILED — the empty-state tap fires on a project that HAS layers, so it is not gated on the empty state and every tap in the timeline now opens the add sheet');

        // --- CONTROL B: the slim row must KEEP its decoration (queue 550/551 are still his) ---
        const slim = document.querySelector('.tl-addrow');
        const d2 = getComputedStyle(slim, '::before');
        if (d2.content === 'none' || d2.borderTopStyle !== 'dashed') {
          throw new Error('CONTROL FAILED — the NORMAL add row lost its dashed decoration too. Queue 571 clause 1 is about the empty state only; queue 550/551 built that bar and he kept it ("the right side being cut off is good")');
        }
      });
    } finally {
      if (FM.mobile && realAdd) FM.mobile.openAdd = realAdd;
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.refreshAll(); if (FM.timeline) FM.timeline.rebuild();
      if (homeWasOpen && FM.home && FM.home.open) FM.home.open();
    }
  });
  test('timeline: an empty project is one surface to the bottom of the screen, with no line across it', { item: '424' }, async function () {
    /* Queue 424, from a phone screenshot with a line drawn across the bottom of the empty state:
       "get rid of that line and continue the pattern all the way down". Two separate things made it,
       both measured at 380px before anything was changed (see the note in styles.css):
         - the hairline was the big row's own background, repeated into its 1px transparent border ring
           because `background-origin` is the padding box while `background-clip` is the border box;
         - the different shade below it was simply where the row's box stopped, ~76px short.
       So the wash moved onto #timeline, which already reaches the bottom of the panel. This test is
       about that shape, not about which gradient is used: nothing that ENDS mid-screen may paint, and
       whatever does paint has to reach the bottom. */
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const layers0 = FM.scene.layers.slice();
    try {
      return await atPhoneWidth(async function () {
        FM.scene.layers.length = 0; FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
        await sleep(90);
        const panel = document.getElementById('timeline-panel');
        const tl = document.getElementById('timeline');
        const row = document.querySelector('.tl-addrow');
        if (!panel || !tl || !row) throw new Error('missing the panel, the timeline or the add row');
        // Control first: without the big state this would be measuring the ordinary slim row.
        if (!row.classList.contains('tl-addrow--empty')) throw new Error('the add row is not in its big empty state (' + row.className + ')');
        if (!panel.classList.contains('tl-empty-start')) throw new Error('the panel is missing tl-empty-start, so the empty-state rules are not the ones being measured');

        const rs = getComputedStyle(row);
        if (rs.backgroundImage !== 'none') throw new Error('the big empty row still paints a background of its own (' + rs.backgroundImage.slice(0, 60) + ') — that is the surface whose bottom edge drew the line');
        if (rs.boxShadow !== 'none') throw new Error('the big empty row still casts a glow (' + rs.boxShadow + '), which draws the same edge a second time');

        const ts = getComputedStyle(tl);
        if (ts.backgroundImage === 'none') throw new Error('nothing paints the empty timeline at all now — the wash was removed rather than moved');
        const tr = tl.getBoundingClientRect(), pr = panel.getBoundingClientRect();
        if (tr.bottom < pr.bottom - 1) throw new Error('the painted surface stops ' + (pr.bottom - tr.bottom).toFixed(1) + 'px above the bottom of the panel, so a second shade shows below it');

        /* AND THE SLIM ROW IS UNTOUCHED (his clause 3: empty state only). Without this, deleting the
           row's background everywhere would pass everything above. */
        const L = FM.makeLayer('shape', { name: 'x', shape: 'rect', x: 540, y: 960, shapeW: 200, shapeH: 200, fill: '#fff' });
        L.start = 0; L.duration = 3; FM.scene.layers.push(L);
        FM.refreshAll(); FM.timeline.rebuild();
        await sleep(90);
        const slim = document.querySelector('.tl-addrow');
        if (!slim || slim.classList.contains('tl-addrow--empty')) throw new Error('the row did not go back to its slim state with a clip present');
        /* ⚠️ THE WASH MOVED TO ::before (queue 550/551), it did not go away — updated rather than deleted,
           because what this line is FOR is still exactly right: the empty-state change must not strip the
           slim row's colour. Ezra asked for the tint to stop at the head divider and end with the project,
           and a full-width background on the row itself cannot do either, so the paint is on a bounded
           pseudo-element now and the row's own background is deliberately `none`. Reading the row would
           report a loss that has not happened. */
        if (getComputedStyle(slim, '::before').backgroundImage === 'none') throw new Error('the slim add row lost its own wash — this was meant to change the empty state only');
      }, 380);
    } finally {
      FM.scene.layers = layers0;
      if (FM.refreshAll) FM.refreshAll();
      if (FM.timeline) FM.timeline.rebuild();
    }
  });
