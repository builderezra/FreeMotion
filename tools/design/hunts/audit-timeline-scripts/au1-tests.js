  /* ════════ AU1: repro tests for the js/timeline.js audit. Append before `async function run()` in tests/tests.js; `?only=AU1` runs them. ════════ */
  test('AU1-1 dragging the LEFT grip of a REVERSED clip keeps its effect clock still (Drift, Spin, Orbit do not jump), as the forward grip and the A key do', { item: 'au1' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, t0 = FM.time;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const grip = async (rev) => {
      FM.scene.layers.length = 0;
      const v = FM.makeLayer('video', { name: 'clip' });
      v.start = 2; v.duration = 6; v.trimStart = 2; v.reversed = rev; v.speed = 1;
      FM.scene.layers.push(v); FM.media.set(v.id, { kind: 'video', duration: 60, width: 2, height: 2 });
      FM.scene.project.duration = 12; FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild(); FM.setTime(0); await sleep(300);
      const g = document.querySelector('#tl-tracks .clip .clip-grip.left');
      if (!g) throw new Error('setup: no left grip');
      const r = g.getBoundingClientRect(), x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2;
      const pps = document.querySelector('#tl-tracks .clip').getBoundingClientRect().width / v.duration;
      const probe = 6, before = FM.fxLocalTime(v, probe), s0 = v.start;
      const ev = (t, cx, b) => new PointerEvent(t, { pointerId: 31, pointerType: 'mouse', isPrimary: true, bubbles: true, cancelable: true, clientX: cx, clientY: y, button: 0, buttons: b });
      g.dispatchEvent(ev('pointerdown', x, 1));
      for (let k = 1; k <= 6; k++) window.dispatchEvent(ev('pointermove', x + 40 * k / 6, 1));
      window.dispatchEvent(ev('pointerup', x + 40, 0)); await sleep(120);
      if (Math.abs(v.start - s0) < 0.2) throw new Error('setup: the grip drag did not move the head (start ' + s0 + ' to ' + v.start + ', pps ' + pps.toFixed(1) + ')');
      return Math.abs(FM.fxLocalTime(v, probe) - before);
    };
    try {
      const fwd = await grip(false);
      if (fwd > 0.02) throw new Error('CONTROL: the forward clip’s effect clock moved by ' + fwd.toFixed(3) + ' s when its head was trimmed');
      const rev = await grip(true);
      if (rev > 0.02) throw new Error('trimming the head of a REVERSED clip moved its effect clock by ' + rev.toFixed(3) + ' s at a fixed time: every Drift / Spin / Orbit on it jumps (the forward grip, the A key and Extend all carry the clock)');
    } finally {
      try { FM.timeline._abortGestures && FM.timeline._abortGestures(); } catch (e) {}
      FM.scene.layers.length = 0; layers0.forEach(l => FM.scene.layers.push(l)); FM.time = t0; FM.selectLayer(sel0 || null); FM.refreshAll(); FM.timeline.rebuild();
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

  test('AU1-2 growing the HEAD of a REVERSED clip with a speed ramp never reaches past the end of its source (grip, and the D/extend twin)', { item: 'au1' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, t0 = FM.time;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const SRC = 20, problems = [];
    const mk = (ramped) => {
      FM.scene.layers.length = 0;
      const v = FM.makeLayer('video', { name: 'clip' });
      v.start = 6; v.duration = 6; v.trimStart = 1; v.reversed = true;
      v.speed = ramped ? { kf: [{ t: 6, v: 3, e: 'linear' }, { t: 12, v: 0.5, e: 'linear' }] } : 3;
      FM.scene.layers.push(v); FM.media.set(v.id, { kind: 'video', duration: SRC, width: 2, height: 2 });
      FM.scene.project.duration = 14; FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild(); FM.setTime(0);
      return v;
    };
    const head = v => FM.layerLocalTime(v, v.start + 0.001);   // a reversed clip opens on the END of its source window
    try {
      for (const [what, ramped] of [['flat 3x (CONTROL)', false], ['ramped 3x -> 0.5x', true]]) {
        const v = mk(ramped); await sleep(200);
        FM.time = 0;
        if (!FM.extendClipTo(v, 0)) throw new Error('setup: extendClipTo(0) did nothing on the ' + what + ' clip');
        const h = head(v);
        if (h > SRC + 0.01) problems.push('extend (D key) on the ' + what + ' reversed clip: the head frame reads source ' + h.toFixed(2) + ' s of a ' + SRC + ' s file');
      }
      for (const [what, ramped] of [['flat 3x (CONTROL)', false], ['ramped 3x -> 0.5x', true]]) {
        const v = mk(ramped); await sleep(300);
        const g = document.querySelector('#tl-tracks .clip .clip-grip.left');
        if (!g) throw new Error('setup: no left grip');
        const r = g.getBoundingClientRect(), x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2;
        const ev = (t, cx, b) => new PointerEvent(t, { pointerId: 32, pointerType: 'mouse', isPrimary: true, bubbles: true, cancelable: true, clientX: cx, clientY: y, button: 0, buttons: b });
        g.dispatchEvent(ev('pointerdown', x, 1));
        for (let k = 1; k <= 4; k++) window.dispatchEvent(ev('pointermove', x - 400 * k, 1));
        window.dispatchEvent(ev('pointerup', x - 1600, 0)); await sleep(120);
        if (!(v.start < 5.9)) throw new Error('setup: the grip drag did not pull the head back (start ' + v.start + ')');
        const h = head(v);
        if (h > SRC + 0.01) problems.push('left grip on the ' + what + ' reversed clip: the head frame reads source ' + h.toFixed(2) + ' s of a ' + SRC + ' s file (start ' + v.start.toFixed(2) + ', duration ' + v.duration.toFixed(2) + ')');
      }
      if (problems.length) throw new Error(problems.join(' AND '));
    } finally {
      try { FM.timeline._abortGestures && FM.timeline._abortGestures(); } catch (e) {}
      FM.scene.layers.length = 0; layers0.forEach(l => FM.scene.layers.push(l)); FM.time = t0; FM.selectLayer(sel0 || null); FM.refreshAll(); FM.timeline.rebuild();
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

