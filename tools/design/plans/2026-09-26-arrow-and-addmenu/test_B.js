  /* ═══ QUEUE 958 — THE ADD MENU DRAGS RIGHT UP TO THE TOP, WHEREVER THE TIMELINE IS ══════════════════════════════════
     Ezra, 26 Sep: *"there's an issue with the draggable add menu on PC that goes up and down separate to the timeline layer.
     And basically, the issue is that it doesn't go as far up as it should be able to go up. unless you drag up the timeline.
     So it's like kind of still bound to how high the timeline is. You should be able to drag it like up to like the top of
     the screen, honestly. So it covers up the whole side of the screen. But you know, it, no matter where the timeline is."*
     The ceiling was max(0.62·vh, the timeline's own 0.72·vh ceiling) — #512 tied it to the timeline's clamp. Measured with
     this same drag before the fix: 576 of an 800px window (top at y=224) at 900 and 1280 wide, 778 of 1080 (y=302) at 1920,
     identically with the timeline at its min, default and max; in the suite's 900x760 frame it stops at y=213.
     Driven through the REAL handlers with PointerEvents dispatched on both handles (the way the #244 tests drive them), with
     the timeline at its MIN and at its MAX, at three PC widths. "The top" = the handle (which hangs 9px above the panel's
     top edge) at y=0: any higher and it is off screen and the menu could never be pulled back down. Every #244 behaviour
     that this touches is re-asserted: the timeline does not move, and the menu's bottom stays on the band's line. */
  test('the add menu drags right up to the top of the window, wherever the timeline is (queue 958)', { item: '958', budgetMs: 60000 }, async function () {
    const frame = () => new Promise(r => setTimeout(r, 60));
    const root = document.documentElement, body = document.body;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    const tl0 = root.style.getPropertyValue('--tl-h');
    let ls0 = null; try { ls0 = localStorage.getItem('fm_tl_h'); } catch (e) {}
    const savedSel = FM.scene.selectedId;
    const run = async (w) => {
      const am = document.getElementById('am-resizer'), tlr = document.getElementById('tl-resizer');
      const panel = document.getElementById('inspector-panel'), tlp = document.getElementById('timeline-panel');
      if (!am || !tlr || !panel || !tlp) throw new Error('need #am-resizer, #tl-resizer, #inspector-panel and #timeline-panel');
      const drag = async (el, toY) => {
        const r = el.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y0 = Math.round(r.top + r.height / 2);
        const pe = (t, y) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: t === 'pointerup' ? 0 : 1 }));
        pe('pointerdown', y0);
        for (let i = 1; i <= 8; i++) { pe('pointermove', Math.round(y0 + (toY - y0) * i / 8)); await frame(); }
        pe('pointerup', toY); await frame();
      };
      for (const at of ['min', 'max']) {
        if (FM.dropAddMenuFloat) FM.dropAddMenuFloat();
        root.style.removeProperty('--tl-h'); await frame();
        FM.selectLayer(null); if (FM.inspector) FM.inspector.refresh(); await frame();
        await drag(tlr, at === 'max' ? 0 : window.innerHeight - 2);
        const tlH = FM._bandH(), wantTl = FM.clampTimelineH(at === 'max' ? 999999 : 0);
        // CONTROL: the timeline drag engaged and reached the end asked for, so "min" and "max" really are two cases
        if (Math.abs(tlH - wantTl) > 2) throw new Error('control: at ' + w + 'px wide the timeline drag did not reach its ' + at + ' (' + tlH + 'px, wanted ' + wantTl + ') — the gesture never engaged, so nothing below would mean anything');
        const tlBox = tlp.getBoundingClientRect();
        await drag(am, 0);
        const p = panel.getBoundingClientRect(), h = am.getBoundingClientRect(), t2 = tlp.getBoundingClientRect();
        // CONTROL: the add-menu drag engaged (it left the grid and grew)
        if (!body.classList.contains('am-floating')) throw new Error('control: at ' + w + 'px wide (timeline at its ' + at + ') the add-menu drag never raised the menu');
        if (h.top < -0.5) throw new Error('at ' + w + 'px wide the add menu\'s handle ended at y=' + Math.round(h.top) + ' — off the top of the window, so the menu could never be pulled back down');
        if (h.top > 3) throw new Error('at ' + w + 'x' + window.innerHeight + ' with the timeline at its ' + at + ' (' + tlH + 'px) the add menu stops with its top at y=' + Math.round(p.top) + ' (handle at y=' + Math.round(h.top) + ') — he wants it "up to like the top of the screen … no matter where the timeline is"');
        // #244 kept: it floats OVER the canvas, so the timeline has not moved, and its bottom is still the band's line
        if (Math.abs(t2.top - tlBox.top) > 1 || Math.abs(t2.height - tlBox.height) > 1) throw new Error('raising the add menu moved the timeline (' + Math.round(tlBox.top) + ' → ' + Math.round(t2.top) + ') — it must go over the canvas, not push');
        if (Math.abs(p.bottom - t2.bottom) > 2) throw new Error('the raised add menu\'s bottom left the band: ' + Math.round(p.bottom) + ' against the timeline\'s ' + Math.round(t2.bottom));
      }
    };
    try {
      if (hadHome) FM.home.close();
      await frame();
      if (matchMedia('(min-width: 701px)').matches) await run(window.innerWidth);
      else await atWideWidth(() => run(900), 900);   // the 380 pass: the gesture is PC-only, so force the runner's PC width
      await atWideWidth(() => run(1280), 1280);
      await atWideWidth(() => run(1920), 1920);
    } finally {
      if (FM.dropAddMenuFloat) FM.dropAddMenuFloat();
      body.classList.remove('am-floating', 'am-resizing', 'tl-resizing');
      if (tl0) root.style.setProperty('--tl-h', tl0); else root.style.removeProperty('--tl-h');
      try { if (ls0 == null) localStorage.removeItem('fm_tl_h'); else localStorage.setItem('fm_tl_h', ls0); } catch (e) {}   // the drags persisted a height
      FM.selectLayer(savedSel || null); if (FM.inspector) FM.inspector.refresh();
      if (hadHome && FM.home && FM.home.open) FM.home.open();
      await frame();
    }
  });
