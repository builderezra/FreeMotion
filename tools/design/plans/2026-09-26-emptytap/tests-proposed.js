  /* 964 — the empty project's add area, from one dictated message (26 Sep). His clauses, numbered in REQUESTS.md:
     1 the blue outline does not reach the TOP; 2 it stays there (stuck); 3 the tap animation looks bad; 4 play it across
     the WHOLE area, much more colourful; 5 the lines must look good and GO AWAY; 6 they PULSE all the way round, not all
     lines at once. Shared setup: an empty project at phone width, then put everything back. */
  async function onEmptyArea964(fn) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const layers0 = FM.scene.layers.slice();
    const homeWasOpen = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    try {
      if (homeWasOpen) FM.home.close();
      return await atPhoneWidth(async function () {
        FM.scene.layers.length = 0;
        FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
        await sleep(260);
        const panel = document.getElementById('timeline-panel');
        const tl = document.getElementById('timeline');
        const row = document.querySelector('.tl-addrow');
        if (!panel || !panel.classList.contains('tl-empty-start') || !row || !row.classList.contains('tl-addrow--empty')) {
          throw new Error('not on the empty-project screen (.tl-empty-start + .tl-addrow--empty), so this would measure the wrong thing');
        }
        [].slice.call(panel.querySelectorAll('.tl-areafx')).forEach(function (n) { n.remove(); });
        const ruler = document.getElementById('tl-rulerrow').getBoundingClientRect();
        const tr = tl.getBoundingClientRect();
        // THE AREA, measured here rather than asked of the code under test: #timeline below the sticky ruler row.
        const area = { left: tr.left, right: tr.left + tl.clientWidth, top: ruler.bottom, bottom: tr.bottom };
        area.width = area.right - area.left; area.height = area.bottom - area.top;
        /* ⚠️ EVERY pointerdown IS CLOSED WITH A pointerup — the 571 lesson: an unfinished synthetic gesture left the
           timeline mid-gesture and turned three unrelated tests red. pointerup does not synthesise a click, so this
           cannot open the add sheet. */
        const press = function (x, y, on) {
          const t = on || tl;
          const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 9, pointerType: 'touch', isPrimary: true, button: 0 };
          t.dispatchEvent(new PointerEvent('pointerdown', Object.assign({}, o, { buttons: 1 })));
          t.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, { buttons: 0 })));
        };
        return await fn({ panel: panel, tl: tl, row: row, area: area, press: press, sleep: sleep });
      });
    } finally {
      const p = document.getElementById('timeline-panel');
      if (p) [].slice.call(p.querySelectorAll('.tl-areafx')).forEach(function (n) { n.remove(); });
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.selectLayer(null); FM.refreshAll(); if (FM.timeline) FM.timeline.rebuild();
      if (homeWasOpen && FM.home && FM.home.open) FM.home.open();
    }
  }

  test('964 clause 2: after a tap the empty area keeps no outline - not on focus, not on hover', { item: '964' }, async function () {
    /* MEASURED 26 Sep at 380x800 and 440x956: a tap focuses the row (tabIndex 0), focus SURVIVES openAdd() and
       closeAdd(), so `#timeline:focus-within` stayed true and the inset box stayed painted after the menu closed —
       "it just stays there". row.focus() is that state. Measured too: in this runner a script focus does NOT match
       :focus-visible, so it stands for a finger, not a keyboard (asserted below as a control). */
    return onEmptyArea964(async function (c) {
      /* The app sits in run.html's frame, and Chrome matches :focus / :focus-within only in a FOCUSED document - so
         give the frame the keyboard first (the 690c helpers do the same), or the control below fails for the runner's
         reason, not the app's. */
      window.focus();
      await c.sleep(60);
      c.row.focus();
      if (!c.tl.matches(':focus-within')) throw new Error('CONTROL: focusing the row did not put #timeline in :focus-within, so the stuck state was never reproduced');
      if (c.row.matches(':focus-visible')) throw new Error('CONTROL: this focus reads as a KEYBOARD focus in this runner, so it cannot stand in for a tap');
      const cs = getComputedStyle(c.tl);
      if (cs.boxShadow !== 'none') throw new Error('the empty area still draws a box while the tapped row keeps focus (' + cs.boxShadow + ') - the outline that "just stays there" (queue 964 clause 2)');
      /* :hover CANNOT BE SYNTHESISED - script pointer events do not move the hover state, and iOS leaves :hover on the
         last thing tapped. So the RULES are what is checked: nothing may paint the empty timeline on :hover/:focus-within. */
      const bad = [];
      const walk = function (list) {
        for (const ru of list) {
          if (ru.cssRules && !ru.selectorText) { walk(ru.cssRules); continue; }
          const sel = ru.selectorText || '';
          if (!/tl-empty-start/.test(sel) || !/#timeline:(hover|focus-within)/.test(sel)) continue;
          const st = ru.style;
          if ((st.boxShadow && st.boxShadow !== 'none') || (st.outlineStyle && st.outlineStyle !== 'none') || (st.borderColor && !/transparent/.test(st.borderColor))) bad.push(sel);
        }
      };
      for (const sh of document.styleSheets) { let rs = null; try { rs = sh.cssRules; } catch (e) { continue; } walk(rs); }
      if (bad.length) throw new Error('a rule still paints the empty area on :hover/:focus-within, which iOS keeps on after a tap: ' + bad.join(' | '));
      // POSITIVE CONTROL: the same read DOES see a box when one is there - otherwise a broken read passes the check above.
      c.tl.style.boxShadow = 'inset 0 0 0 1px rgb(255, 0, 0)';
      const seen = getComputedStyle(c.tl).boxShadow;
      c.tl.style.boxShadow = '';
      if (seen === 'none') throw new Error('CONTROL: getComputedStyle did not see an inline box-shadow, so the check above proves nothing');
    });
  });

  test('964 clauses 1 5 6: a press sends the outline all the way round incl. the top, one side after another, then it is gone', { item: '964', budgetMs: 8000 }, async function () {
    return onEmptyArea964(async function (c) {
      c.press(c.area.left + c.area.width / 2, c.area.top + c.area.height * 0.36);   // on the +
      const host = c.panel.querySelector('.tl-areafx--pulse');
      if (!host) throw new Error('pressing the empty area drew no travelling outline (queue 964 clause 6)');
      /* CLAUSE 1 - THE TOP. The old box was an inset shadow on #timeline, and #tl-rulerrow (its sticky, opaque
         descendant, z-index 7) painted over its top 22px, so the top line never showed. The pulse must start at or below
         the ruler's bottom AND be stacked above it. */
      const hr = host.getBoundingClientRect();
      if (hr.top < c.area.top - 1) throw new Error('the pulse box starts ' + Math.round(c.area.top - hr.top) + 'px up under the ruler row, where its top line cannot be seen (clause 1)');
      if (Math.abs(hr.bottom - c.area.bottom) > 1 || Math.abs(hr.left - c.area.left) > 1 || Math.abs(hr.right - c.area.right) > 1) throw new Error('the pulse box ' + JSON.stringify([hr.left, hr.top, hr.right, hr.bottom]) + ' is not the area ' + JSON.stringify(c.area));
      const zr = +getComputedStyle(document.getElementById('tl-rulerrow')).zIndex, zp = +getComputedStyle(host).zIndex;
      if (!(zp > zr)) throw new Error('the pulse (z ' + zp + ') is not stacked above the ruler row (z ' + zr + ')');
      /* SEEK, DON'T WAIT. A paused Web Animation reports its style at any currentTime, with or without frames - the
         571/616 notes: this runner can fire 0 rAF when it is not fronted, so timing the real motion would be flaky. */
      const cores = [].slice.call(host.querySelectorAll('path.fx-core'));
      if (cores.length !== 2) throw new Error('expected two travelling lights (one per side), found ' + cores.length);
      const T = FM._areaFx.PULSE_TRAVEL;
      const at = function (p, t) {
        p.getAnimations().forEach(function (an) { an.pause(); an.currentTime = t; });
        const len = parseFloat(p.style.strokeDasharray);
        const off = parseFloat(getComputedStyle(p).strokeDashoffset);
        const L = p.getTotalLength();
        const pt = p.getPointAtLength(Math.max(0, Math.min(L, len - off)));
        return { x: hr.left + pt.x, y: hr.top + pt.y };
      };
      const seen = { left: 0, right: 0, top: 0, bottom: 0 };
      for (let k = 0; k <= 24; k++) {
        cores.forEach(function (p) {
          const q = at(p, T * k / 24);
          if (q.x <= hr.left + 8) seen.left++;
          if (q.x >= hr.right - 8) seen.right++;
          if (q.y <= hr.top + 8) seen.top++;
          if (q.y >= hr.bottom - 40) seen.bottom++;
        });
      }
      const miss = Object.keys(seen).filter(function (k) { return !seen[k]; });
      if (miss.length) throw new Error('the lights never reached the ' + miss.join(', ') + ' edge - "all the way around it" (queue 964 clauses 1 and 6): ' + JSON.stringify(seen));
      // CLAUSE 6 - ONE AFTER ANOTHER. A quarter of the way in, neither light may be in the top 40% yet ...
      const q1 = cores.map(function (p) { return at(p, T * 0.25); });
      if (q1.some(function (q) { return q.y < hr.top + hr.height * 0.4; })) throw new Error('a quarter of the way through, a light is already near the top ' + JSON.stringify(q1) + ' - the lines are appearing at once, not travelling (clause 6)');
      // ... and the drawn line is still growing then (the old #616 band lit a whole side and the top together).
      const tr = host.querySelector('path.fx-trail');
      tr.getAnimations().forEach(function (an) { an.pause(); an.currentTime = T * 0.25; });
      const drawn = 1 - parseFloat(getComputedStyle(tr).strokeDashoffset) / tr.getTotalLength();
      if (!(drawn > 0.05 && drawn < 0.6)) throw new Error('a quarter of the way in, the trail has drawn ' + Math.round(drawn * 100) + '% of its side - it must grow, not appear');
      // POSITIVE CONTROL for the two negatives above: the same read DOES report the top - both finish at the top-centre.
      const qe = cores.map(function (p) { return at(p, T); });
      if (qe.some(function (q) { return Math.abs(q.x - (hr.left + hr.width / 2)) > 6 || q.y > hr.top + 8; })) throw new Error('the two lights do not meet at the top-centre: ' + JSON.stringify(qe));
      // CLAUSE 5 - IT GOES AWAY. Real time, because the teardown is a setTimeout by design (it must not wait on frames).
      await c.sleep(FM._areaFx.PULSE_MS + 400);
      if (c.panel.querySelector('.tl-areafx--pulse')) throw new Error('the outline is still in the page ' + (FM._areaFx.PULSE_MS + 400) + 'ms after the press - it has to GO AWAY (clause 5)');
      if (getComputedStyle(c.tl).boxShadow !== 'none') throw new Error('after the pulse, #timeline still paints a box (' + getComputedStyle(c.tl).boxShadow + ')');
    });
  });

  test('964 clauses 3 4: a press floods the WHOLE area with colour from the finger, coloured by the spot, and cleans up', { item: '964', budgetMs: 8000 }, async function () {
    return onEmptyArea964(async function (c) {
      const a = c.area;
      c.press(a.left + 40, a.top + 60);
      const host = c.panel.querySelector('.tl-areafx--press');
      if (!host) {
        const old = c.tl.querySelector('.tl-tapburst');
        throw new Error('pressing the empty area made no whole-area colour layer' + (old ? ' - only the old ' + Math.round(old.getBoundingClientRect().width || 104) + 'px .tl-tapburst, the "small little touch thing" he asked to replace' : '') + ' (queue 964 clause 4)');
      }
      // FROM THE FINGER (#571's first half): the layer records the press point, and its white-hot core is centred there.
      if (Math.abs(+host.dataset.x - 40) > 1.5 || Math.abs(+host.dataset.y - 60) > 1.5) throw new Error('the colour layer recorded the press at ' + host.dataset.x + ',' + host.dataset.y + ', not 40,60');
      const core = host.querySelector('.fx-core');
      core.getAnimations().forEach(function (an) { an.pause(); an.currentTime = 1; });
      const cr = core.getBoundingClientRect();
      if (Math.abs(cr.left + cr.width / 2 - (a.left + 40)) > 2 || Math.abs(cr.top + cr.height / 2 - (a.top + 60)) > 2) throw new Error('the flash does not start under the finger');
      /* THE WHOLE AREA (clause 4). Geometric, from the live boxes: a sample point is lit when it lies inside a colour
         curtain's visible ellipse (80% of its radial gradient's closest-side) while that curtain is at least 35%
         opaque. Best moment over the first half of the animation; >= 90% of a 12x12 grid. The old burst was one
         104px bloom - about 6% of the area at 380px. */
      const curtains = [].slice.call(host.querySelectorAll('.fx-curtain'));
      if (curtains.length < 3) throw new Error('the colour layer has ' + curtains.length + ' colour curtains - not enough to fill anything');
      let best = 0, bestT = 0;
      for (let t = 60; t <= FM._areaFx.PRESS_MS * 0.5; t += 30) {
        host.getAnimations({ subtree: true }).forEach(function (an) { an.pause(); an.currentTime = t; });
        const shapes = curtains.map(function (el) {
          const r = el.getBoundingClientRect();
          return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, rx: r.width / 2 * 0.8, ry: r.height / 2 * 0.8, op: +getComputedStyle(el).opacity };
        }).filter(function (s) { return s.op >= 0.35 && s.rx > 0 && s.ry > 0; });
        let lit = 0;
        for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
          const px = a.left + a.width * (i + 0.5) / 12, py = a.top + a.height * (j + 0.5) / 12;
          if (shapes.some(function (s) { const dx = (px - s.cx) / s.rx, dy = (py - s.cy) / s.ry; return dx * dx + dy * dy <= 1; })) lit++;
        }
        if (lit / 144 > best) { best = lit / 144; bestT = t; }
      }
      if (best < 0.9) throw new Error('at its fullest (' + bestT + 'ms) the colour reaches ' + Math.round(best * 100) + '% of the area - he asked for it to "cook up the whole area" (clause 4)');
      host.getAnimations({ subtree: true }).forEach(function (an) { an.play(); });
      // COLOUR BY THE SPOT (#571's keyboard): a press at the far corner answers in a different colour.
      c.press(a.right - 40, a.bottom - 40);
      const hosts = c.panel.querySelectorAll('.tl-areafx--press');
      const hB = +hosts[hosts.length - 1].dataset.h, hA = +host.dataset.h;
      const dh = Math.min(Math.abs(hA - hB), 360 - Math.abs(hA - hB));
      if (dh < 30) throw new Error('two presses at opposite corners came out hue ' + hA + ' and ' + hB + ' - the colour must follow the position (#571: "based on what button you press")');
      // CAPPED, and TORN DOWN - a drum-roll must not pile up nodes, and nothing may outlive the animation.
      for (let i = 0; i < 25; i++) c.press(a.left + 100 + i, a.top + 100 + i);
      const live = c.panel.querySelectorAll('.tl-areafx--press').length, laps = c.panel.querySelectorAll('.tl-areafx--pulse').length;
      if (live > FM._areaFx.MAX) throw new Error(live + ' colour layers live at once (cap ' + FM._areaFx.MAX + ')');
      if (laps > 1) throw new Error(laps + ' outline laps live at once - a second tap must not stack another');
      await c.sleep(Math.max(FM._areaFx.PRESS_MS, FM._areaFx.PULSE_MS) + 450);
      const left = c.panel.querySelectorAll('.tl-areafx').length;
      if (left) throw new Error(left + ' press layers survived their animation - they must be torn down on a timer');
      // CONTROL: with a layer in the project the same press does nothing (the empty screen only).
      const L = FM.makeLayer('shape', { name: 'X', shape: 'rect', x: 540, y: 960, shapeW: 200, shapeH: 200, fill: '#3a7bd5' });
      L.start = 0; L.duration = 3; FM.scene.layers.push(L);
      FM.refreshAll(); FM.timeline.rebuild();
      await c.sleep(260);
      c.press(a.left + 190, a.top + 200);
      await c.sleep(40);
      if (c.panel.querySelectorAll('.tl-areafx').length) throw new Error('CONTROL FAILED - a press on a timeline WITH layers also floods it with colour; this is for the empty screen only');
    });
  });

  test('964: asked for less motion, a press is acknowledged by one short still fade - nothing travels or grows', { item: '964', budgetMs: 6000 }, async function () {
    return onEmptyArea964(async function (c) {
      const realMM = window.matchMedia;
      window.matchMedia = function (q) {
        if (/prefers-reduced-motion:\s*reduce/.test(q)) return { matches: true, media: q, onchange: null, addListener: function () {}, removeListener: function () {}, addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () { return false; } };
        return realMM.call(window, q);
      };
      try {
        c.press(c.area.left + c.area.width / 2, c.area.top + c.area.height / 2);
      } finally { window.matchMedia = realMM; }
      if (c.panel.querySelector('.tl-areafx--pulse, .tl-areafx--press')) throw new Error('with reduced motion asked for, the press still sends the travelling outline or the colour flood');
      const calm = c.panel.querySelector('.tl-areafx--calm');
      if (!calm) throw new Error('with reduced motion asked for, the press shows nothing at all - it must still be acknowledged, just without motion');
      const anims = calm.getAnimations({ subtree: true });
      if (!anims.length) throw new Error('the reduced-motion acknowledgement never fades - it would stay on screen');
      anims.forEach(function (an) {
        const d = an.effect.getTiming().duration;
        if (d > 300) throw new Error('the reduced-motion fade runs ' + d + 'ms - keep it short');
        an.effect.getKeyframes().forEach(function (k) { if (k.transform && k.transform !== 'none') throw new Error('the reduced-motion fade moves or scales (' + k.transform + ')'); });
      });
      await c.sleep(FM._areaFx.CALM_MS + 300);
      if (c.panel.querySelector('.tl-areafx')) throw new Error('the reduced-motion fade is still in the page after it finished');
    });
  });

  test('964 clause 6: on the empty screen the old row-sized pulse no longer fires - the area pulse replaces it; the slim row keeps #616', { item: '964' }, async function () {
    /* The #616 pulse is a band that climbs the ROW's box and lights both sides and the whole top line at once. In
       the empty state the row is a 300px box in the middle of the area, so a tap there drew a SECOND outline, not
       the area's - one that does exactly "all the lines appear at once". */
    return onEmptyArea964(async function (c) {
      const p = c.row.querySelector('.tl-addrow-pulse');
      c.press(c.area.left + c.area.width / 2, c.area.top + c.area.height * 0.36, c.row);
      const firing = p && p.classList.contains('is-pulsing') && getComputedStyle(p).display !== 'none';
      if (firing) throw new Error('pressing the empty area still fires the row-sized #616 pulse - a second box whose lines all light at once (clause 6)');
      if (!c.panel.querySelector('.tl-areafx--pulse')) throw new Error('CONTROL: the same press drew no area pulse either, so this is not testing the replacement');
      // CONTROL: the slim row (a project with layers) keeps #616 exactly as he approved it.
      FM.addShapeLayer('rect');
      FM.scene.layers.forEach(function (l) { l.start = 0; l.duration = 6; });
      FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
      await c.sleep(300);
      const slim = document.querySelector('.tl-addrow');
      const sp = slim && slim.querySelector('.tl-addrow-pulse');
      if (!sp) throw new Error('CONTROL FAILED - the slim add row lost its #616 pulse');
      slim.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      slim.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      if (!sp.classList.contains('is-pulsing') || getComputedStyle(sp).display === 'none') throw new Error('CONTROL FAILED - pressing the slim add row no longer plays its #616 pulse');
      sp.classList.remove('is-pulsing');
    });
  });

  /* ONLY IF HE PICKS A HOLD (ASK 2). With SHEET_HOLD_MS = 0 this test is deleted, not skipped. */
  test('964: the add menu waits a beat after a press on the empty area, counted from the press - never after a bare click', { item: '964', budgetMs: 6000 }, async function () {
    return onEmptyArea964(async function (c) {
      if (!FM._areaFx || !(FM._areaFx.HOLD_MS >= 0)) throw new Error('FM._areaFx.HOLD_MS is missing - there is no hold, so the menu covers the press animation within ~100ms of the finger lifting (measured: 59% at 50ms, 98% at 100ms)');
      const real = FM.mobile.openAdd;
      const calls = [];
      FM.mobile.openAdd = function () { calls.push(performance.now()); };
      try {
        const HOLD = FM._areaFx.HOLD_MS;
        if (!(HOLD > 0)) throw new Error('HOLD_MS is ' + HOLD + ' - with no hold this test should have been removed');
        const t0 = performance.now();
        c.press(c.area.left + c.area.width / 2, c.area.top + c.area.height * 0.36, c.row);
        c.row.click();
        if (calls.length) throw new Error('the add menu opened ' + Math.round(calls[0] - t0) + 'ms after the press - the colour is covered before it is seen (measured: the sheet covers 59% of the area 50ms into its swing, 98% at 100ms)');
        await c.sleep(HOLD + 120);
        if (calls.length !== 1) throw new Error('after the hold the add menu opened ' + calls.length + ' times, not once');
        if (calls[0] - t0 < HOLD - 25) throw new Error('the menu opened ' + Math.round(calls[0] - t0) + 'ms after the press, short of the ' + HOLD + 'ms hold');
        // CONTROL: a click with no press before it (the keyboard's Enter path, and every older test) is NOT delayed.
        calls.length = 0;
        c.row.click();
        if (calls.length !== 1) throw new Error('CONTROL FAILED - a bare click (no press) was delayed too; the hold must count from a press');
      } finally { FM.mobile.openAdd = real; }
    });
  });
