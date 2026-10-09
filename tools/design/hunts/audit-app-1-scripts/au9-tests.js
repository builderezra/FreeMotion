  /* ════════ AU9: audit of js/app.js, lines 1 to 3050. Append before `async function run()`; `?only=AU9` runs them. ════════ */
  test('AU9-1 setTime and scrubTime ignore a time that is not a number instead of making the playhead NaN', { item: 'AU9', budgetMs: 30000 }, async function () {
    const P = FM.scene.project, keep = FM.scene.layers.slice(), d0 = P.duration, t0 = FM.time, wasPlaying = FM.playing;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    try {
      FM.scene.layers.length = 0;
      const L = FM.makeLayer('shape', { shape: 'rect', x: 50, y: 50, shapeW: 40, shapeH: 40, fill: '#fff' }); L.start = 0; L.duration = 4; FM.scene.layers.push(L); FM.autoFitDuration();
      FM.playing = false;
      FM.setTime(2);
      // CONTROL: ordinary values still move it, and the ends still clamp
      if (Math.abs(FM.time - 2) > 1e-6) throw new Error('CONTROL: setTime(2) left the playhead at ' + FM.time);
      FM.setTime(99); if (FM.time !== 4) throw new Error('CONTROL: past the end did not clamp (' + FM.time + ')');
      FM.setTime(-3); if (FM.time !== 0) throw new Error('CONTROL: before the start did not clamp (' + FM.time + ')');
      FM.setTime(Infinity); if (FM.time !== 4) throw new Error('CONTROL: Infinity did not clamp to the end (' + FM.time + ')');
      for (const bad of [NaN, undefined, null, 'x']) {
        FM.setTime(2);
        FM.setTime(bad);
        if (!isFinite(FM.time) || Math.abs(FM.time - 2) > 1e-6) throw new Error('setTime(' + String(bad) + ') left the playhead at ' + FM.time + ', not where it was (2)');
        FM.scrubTime(bad);
        if (!isFinite(FM.time) || Math.abs(FM.time - 2) > 1e-6) throw new Error('scrubTime(' + String(bad) + ') left the playhead at ' + FM.time + ', not where it was (2)');
      }
      // a poisoned playhead is repaired by the next call rather than kept
      FM.time = NaN; FM.setTime(NaN);
      if (!isFinite(FM.time)) throw new Error('a NaN playhead stayed NaN after setTime(NaN)');
    } finally {
      FM.scene.layers = keep; P.duration = d0; FM.time = t0; FM.playing = wasPlaying; try { FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });
