  /* ═══ NNN — THE EMPTY PROJECT'S CLAPPER CLAPS ════════════════════════════════════════════════════════════
     His words, 26 Sep (dictated): "get rid of the text and just make it make a little animation for like the film
     real thing where it's like open and then it slams down with like a little effect with like some lines coming out
     of it to show that it's like slap down and like clapped".
     ⚠️ MEASURED ON THE DRAWING, NOT READ OFF THE CSS. The clap is paused and SEEKED through its first 1.2 s, and every
     10 ms the bar's hinge and tip are mapped through its live CTM into the board's coordinates: open at the start,
     hinge on the board's corner the whole way, shut flat on the board, and quick about it. A keyframe that exists but
     turns the stick about the wrong point — the transform-origin trap on SVG children — moves the hinge and fails
     here, where a check of the CSS text would pass.
     ⚠️ "IT STOPS" HAS ITS CONTROL: the same query that must find nothing behind Home and with a layer on the stage
     must first find the clap running on the empty stage, and must find it again when each of those goes away. */
  test('NNN the empty project clapper opens, slams shut on the board with lines out of the tip, and stops when it cannot be seen', { item: 'NNN' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const homeWasOpen = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const d = document.getElementById('drop-hint');
    const claps = () => d.getAnimations({ subtree: true }).filter(a => /^dh-/.test(a.animationName || ''));
    try {
      if (homeWasOpen) FM.home.close();
      FM.scene.layers.length = 0; FM.selectLayer(null); FM.refreshAll(); await sleep(80);
      if (d.classList.contains('hidden') || !(d.getBoundingClientRect().width > 0)) throw new Error('the empty-canvas hint is not on screen with no layers, so there is nothing to watch');
      const stick = d.querySelector('.dh-stick');
      const bar = stick && stick.querySelectorAll('path')[1], board = d.querySelector('.dh-body > path');
      const lines = [].slice.call(d.querySelectorAll('.dh-whack path'));
      if (!stick || !bar || !board) throw new Error('the clapper is still one still drawing: no hinged stick (.dh-stick) to open and slam onto a board (.dh-body > path)');
      if (lines.length < 3) throw new Error('the slam has ' + lines.length + ' impact lines; he asked for "some lines coming out of it"');

      // reduced motion: the still v5.92 drawing, no clap — asserted on the stylesheet so it holds on every machine,
      // not only on one with the OS setting on (the runner does not emulate it)
      const rmRules = [];
      [].slice.call(document.styleSheets).forEach(ss => {
        let rules; try { rules = ss.cssRules; } catch (e) { return; }
        [].slice.call(rules || []).forEach(r => {
          if (!r.media || !/prefers-reduced-motion:\s*reduce/.test(r.media.mediaText)) return;
          [].slice.call(r.cssRules).forEach(c => { if (c.selectorText && /\.dh-stick/.test(c.selectorText) && c.style.animationName === 'none') rmRules.push(c.selectorText); });
        });
      });
      if (!rmRules.length) throw new Error('no prefers-reduced-motion rule stops the clap (.dh-stick { animation: none }) — someone who has asked for less motion gets a slamming icon');
      if (reduced) {
        if (claps().length) throw new Error('under prefers-reduced-motion the clapper still runs ' + claps().map(a => a.animationName).join(', '));
        return;
      }

      const running = claps();
      const clap = running.filter(a => a.animationName === 'dh-clap')[0];
      if (!clap) throw new Error('nothing animates the stick (running on the empty stage: ' + (running.map(a => a.animationName).join(', ') || 'none') + ')');
      const tm = clap.effect.getComputedTiming();
      // his pick (variant A): it claps as the empty project opens and again every ~6 s while it stays empty
      if (tm.iterations !== Infinity) throw new Error('the clap plays ' + tm.iterations + ' time(s); it is meant to come back every few seconds while the project is empty');
      if (!(tm.duration >= 4000 && tm.duration <= 8000)) throw new Error('one clap cycle is ' + tm.duration + 'ms — meant to be a clap every ~6 s, not constant flapping nor a rare one');

      // ⚠️ Points, not boxes: getBoundingClientRect on a rotated SVG path is the box of its ROTATED BOUNDING BOX
      // (measured: the shut bar reads 8.4 units tall, not 3.6), which cannot tell shut from ajar. So the bar's own
      // hinge and tip are mapped through its live CTM into the BOARD's coordinates, where the board's top is y = 9.
      const inBoard = (el, x, y) => new DOMPoint(x, y).matrixTransform(el.getScreenCTM()).matrixTransform(board.getScreenCTM().inverse());
      const S = [];
      for (let ms = 0; ms <= 1200; ms += 10) {
        running.forEach(a => { a.pause(); a.currentTime = tm.delay + ms; });
        const H = inBoard(bar, 3.2, 8.9), R = inBoard(bar, 21, 6.5);          // the bar's bottom edge: hinge → tip
        S.push({ ms: ms, deg: Math.atan2(H.y - R.y, R.x - H.x) * 180 / Math.PI,  // how far OPEN, in degrees (0 = flat)
                 hinge: Math.hypot(H.x - 3.2, H.y - 8.9), tipY: R.y,
                 ink: Math.max.apply(null, lines.map(p => +getComputedStyle(p).opacity)),
                 out: Math.min.apply(null, lines.map(p => { const b = p.getBBox(); return inBoard(p, b.x, b.y).x - 21; })) });
      }
      running.forEach(a => a.play());
      const s0 = S[0];
      // 1. it starts OPEN — "it's like open and then it slams down"
      if (!(s0.deg > 20)) throw new Error('at the start the stick is ' + s0.deg.toFixed(1) + '° open — it does not start open');
      if (s0.ink > 0.05) throw new Error('the impact lines are showing before the slam (opacity ' + s0.ink + ')');
      // 2. the hinge stays on the board's top-left corner through the whole clap — a wrong rotation centre moves it
      const off = S.filter(s => s.hinge > 0.3)[0];
      if (off) throw new Error('at ' + off.ms + 'ms the stick\'s hinge has moved ' + off.hinge.toFixed(2) + ' units off the board\'s corner — it is swinging about the wrong point');
      // 3. it SHUTS: flat on the board, its tip down on the board's top edge
      const hit = S.filter(s => s.deg < 1)[0];
      if (!hit) throw new Error('the stick never shuts: it is never less than ' + Math.min.apply(null, S.map(s => s.deg)).toFixed(1) + '° open in the first 1.2 s');
      if (Math.abs(hit.tipY - 8.9) > 0.4) throw new Error('shut, the stick\'s tip is at y=' + hit.tipY.toFixed(2) + ' — not down on the board\'s top edge');
      // 4. it SLAMS: from mostly open to shut in a blink, not a gentle close
      const lastOpen = S.filter(s => s.ms < hit.ms && s.deg > 0.8 * s0.deg).pop();
      if (!lastOpen) throw new Error('the stick was never mostly open before it shut');
      if (hit.ms - lastOpen.ms > 150) throw new Error('the stick takes ' + (hit.ms - lastOpen.ms) + 'ms from open to shut — that is a close, not a slam');
      // 5. the lines burst AT the impact, out past the tip, and are gone again
      const burst = S.filter(s => s.ms >= hit.ms - 10 && s.ms <= hit.ms + 80 && s.ink > 0.5)[0];
      if (!burst) throw new Error('no impact lines within 80ms of the slam at ' + hit.ms + 'ms');
      if (burst.out < -0.5) throw new Error('the impact lines start ' + (-burst.out).toFixed(1) + ' units inside the board — they are meant to fly out of the tip');
      const late = S.filter(s => s.ms >= hit.ms + 400 && s.ink > 0.05)[0];
      if (late) throw new Error('the impact lines still show at ' + late.ms + 'ms, 400ms after the slam — a burst, not a decoration');

      // 6. nothing animates where it cannot be seen — and it comes back when it can (the "running" above is the control)
      FM.home.open(); await sleep(150);
      const behindHome = claps().length;
      FM.home.close(); await sleep(150);
      if (behindHome) throw new Error('the clapper keeps animating behind Home (' + behindHome + ' animations), repainting under a screen that covers it');
      if (!claps().length) throw new Error('back from Home the clap did not start again');
      FM.scene.layers.push(FM.makeLayer('shape', { shape: 'rect', name: 'NNN', x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#f00' }));
      FM.refreshAll(); await sleep(80);
      if (!d.classList.contains('hidden')) throw new Error('with a layer on the stage the empty-canvas hint is still shown');
      if (claps().length) throw new Error('with a layer on the stage the hidden clapper still animates (' + claps().length + ')');
      FM.scene.layers.length = 0; FM.refreshAll(); await sleep(80);
      if (!claps().length) throw new Error('with the stage empty again the clap did not come back');
    } finally {
      FM.scene.layers = layers0;
      if (FM.selectLayer) FM.selectLayer(sel0 || null);
      if (FM.refreshAll) FM.refreshAll();
      if (homeWasOpen && FM.home && FM.home.open) { try { FM.home.open(); } catch (e) {} }
    }
  });
