/* FreeMotion — "What's slow": a ten-second sample of the preview, written as text he can send me.
 *
 * WHY THIS EXISTS (queue 202, and #125 and #95 are both waiting on it).
 * Three separate lag reports have died the same death: he says it is slow, I measure on this Mac,
 * the numbers come back fine, and nothing changes. #125 names the pattern in his own entry — "every
 * time lag comes up I have measured on THIS machine, found acceptable numbers, and moved on" — and
 * #202's measurement ends by saying the only useful next step is the same measurement running on HIS
 * PHONE. The numbers already existed (FM._perfState, FM.playbackQualityInfo). What did not exist was
 * any way for him to see them on the device that is actually struggling.
 *
 * So this is deliberately not a graph or a live overlay. It is a block of plain text with a Copy
 * button, because the job is getting the numbers off his phone and into a message.
 *
 * It measures the REAL frame interval via rAF rather than asking the app how long it thinks it took.
 * That distinction is the whole reason #125 stayed open so long: the quality ladder used to watch
 * only main-thread render time, and canvas filter work (GPU) and video decode (off-thread) never
 * land on that clock — six blurs plus six glows reported 1.1ms a frame while the app stuttered. The
 * gap between frames sees all of it, so that is what is reported first.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function pct(sorted, p) {
    if (!sorted.length) return 0;
    const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
    return sorted[i];
  }

  function device() {
    const n = navigator || {};
    const bits = [];
    bits.push('screen ' + window.innerWidth + '×' + window.innerHeight + ' @dpr' + (window.devicePixelRatio || 1));
    if (n.hardwareConcurrency) bits.push(n.hardwareConcurrency + ' cores');
    if (n.deviceMemory) bits.push(n.deviceMemory + 'GB');
    // The UA string is long and mostly noise; the useful part is which engine, because HEVC support
    // and audio routing both differ by it (see #129, #195).
    const ua = String(n.userAgent || '');
    const eng = /CriOS|Chrome/.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'unknown';
    bits.push(eng);
    if (/iPhone|iPad|iPod/.test(ua)) bits.push('iOS');
    else if (/Android/.test(ua)) bits.push('Android');
    else if (/Mac/.test(ua)) bits.push('macOS');
    else if (/Win/.test(ua)) bits.push('Windows');
    return bits.join(' · ');
  }

  function scene() {
    const s = FM.scene;
    if (!s || !s.layers) return 'no project open';
    const L = s.layers;
    const kinds = {};
    L.forEach(l => { kinds[l.type] = (kinds[l.type] || 0) + 1; });
    let fx = 0;
    L.forEach(l => { fx += ((l.effects || []).length); });
    const P = s.project || {};
    return P.width + '×' + P.height + ' @' + P.fps + 'fps · ' +
      L.length + ' layer' + (L.length === 1 ? '' : 's') +
      ' (' + (Object.keys(kinds).map(k => kinds[k] + ' ' + k).join(', ') || 'none') + ') · ' +
      fx + ' effect' + (fx === 1 ? '' : 's');
  }

  FM.perfProbe = {
    running: false,

    /* Sample frame intervals for `ms`, then hand back a finished report string.
     * Bounded by construction: it stops at the deadline whatever happens, so it cannot be left
     * running by a navigation or an error mid-sample. */
    run(ms, done) {
      if (this.running) return false;
      this.running = true;
      const dur = Math.max(1000, Math.min(60000, ms || 10000));
      const gaps = [];
      const t0 = performance.now();
      let last = t0, frames = 0;
      let tierLow = 99, tierHigh = -1;
      let wasHidden = document.hidden;
      const self = this;

      /* A WALL-CLOCK DEADLINE, not just the rAF check below. Found by running this for real with the
       * browser pane hidden: rAF does not fire in a background tab, so the sample never reached its
       * end condition, `running` stayed true forever and the Measure button was disabled for good.
       * He would hit that the first time he pressed Measure and then switched away to think. So the
       * timer always finishes the run, whatever happened to the frame loop. */
      const onHide = () => { if (document.hidden) wasHidden = true; };
      document.addEventListener('visibilitychange', onHide);
      let deadline = setTimeout(() => {
        if (!self.running) return;
        self.running = false;
        finish(performance.now() - t0);
      }, dur + 500);

      const tick = (now) => {
        if (!self.running) return;
        const gap = now - last; last = now;
        if (gap > 0 && gap < 2000) gaps.push(gap);      // a tab-switch gap is not a frame
        frames++;
        try {
          const st = FM._perfState ? FM._perfState() : null;
          if (st) { if (st.tier < tierLow) tierLow = st.tier; if (st.tier > tierHigh) tierHigh = st.tier; }
        } catch (e) {}
        if (now - t0 >= dur) { self.running = false; clearTimeout(deadline); deadline = null; finish(now - t0); return; }
        requestAnimationFrame(tick);
      };

      function finish(elapsed) {
        if (deadline) { clearTimeout(deadline); deadline = null; }
        document.removeEventListener('visibilitychange', onHide);
        const sorted = gaps.slice().sort((a, b) => a - b);
        const med = pct(sorted, 50), p95 = pct(sorted, 95), worst = sorted.length ? sorted[sorted.length - 1] : 0;
        const fps = elapsed > 0 ? (frames / (elapsed / 1000)) : 0;
        // How many frames took longer than 2.5 display intervals — the same "is this actually late"
        // threshold the quality ladder uses (LATE_FACTOR in app.js), so the report and the app agree
        // about what counts as a dropped frame instead of quoting two different numbers.
        const budget = 1000 / 60;
        const late = sorted.filter(g => g > budget * 2.5).length;
        let st = null, qi = null;
        try { st = FM._perfState ? FM._perfState() : null; } catch (e) {}
        try { qi = FM.playbackQualityInfo ? FM.playbackQualityInfo() : null; } catch (e) {}

        const lines = [];
        lines.push('FreeMotion "what’s slow" — ' + Math.round(elapsed / 100) / 10 + 's sample');
        lines.push('');
        /* Say it plainly rather than quoting junk. A backgrounded tab stops painting, so the sample
         * would read as a catastrophic frame rate and send us chasing a problem that is not there —
         * which is precisely the kind of confident wrong number this whole feature exists to end. */
        const unusable = wasHidden || sorted.length < 5;
        if (unusable) {
          lines.push('⚠ THIS SAMPLE IS NOT USABLE — the app was in the background or hidden for some');
          lines.push('  of it, so the browser stopped drawing. Run it again and keep the app on screen.');
          lines.push('');
        }
        lines.push('FRAMES   ' + fps.toFixed(1) + ' fps average');
        lines.push('         median gap ' + med.toFixed(1) + 'ms · p95 ' + p95.toFixed(1) + 'ms · worst ' + worst.toFixed(1) + 'ms');
        lines.push('         ' + late + ' of ' + sorted.length + ' frames were late (over ' + (budget * 2.5).toFixed(0) + 'ms)');
        if (qi) {
          lines.push('QUALITY  tier ' + qi.tier + ' (' + (st ? st.tiers : '?') + ' available) · mode ' + qi.mode);
          lines.push('         app-measured render ' + qi.avgFrameMs + 'ms · app-measured gap ' + qi.avgGapMs + 'ms');
        }
        if (st) {
          lines.push('CANVAS   ' + (st.canvasPx ? Math.round(st.canvasPx / 1000) + 'k pixels' : 'unknown') +
                     (st.locked ? ' · ladder LOCKED (probing stopped)' : ''));
        }
        lines.push('PROJECT  ' + scene());
        lines.push('DEVICE   ' + device());
        lines.push('');
        /* The interpretation matters as much as the numbers, because the whole failure mode here has
         * been numbers that look fine. If the real frame gap is bad while the app's own render time
         * is small, the cost is GPU or decode — invisible to the ladder's original clock, and the
         * single most useful thing this report can tell us. */
        const appMs = qi ? qi.avgFrameMs : 0;
        if (unusable) {
          /* Do NOT reach a verdict on a sample that has already been declared junk. The first
             version printed "⚠ NOT USABLE" at the top and "this sample looks healthy" at the
             bottom of the same report — caught by reading a real run rather than by a test. A
             report that contradicts itself is worse than one that says nothing, and "looks
             healthy" is the exact wrong conclusion this whole feature exists to stop us drawing. */
          lines.push('READ: nothing can be concluded from this run — measure again with the app on');
          lines.push('screen the whole time.');
        } else if (med > budget * 1.5 && appMs < budget * 0.5) {
          lines.push('READ: frames are slow but our own drawing is fast — the cost is GPU effects or');
          lines.push('video decode, NOT the render loop. That is the case every earlier pass missed.');
        } else if (med > budget * 1.5) {
          lines.push('READ: our own drawing is genuinely slow — the render loop is the cost.');
        } else {
          lines.push('READ: this sample looks healthy. If it felt slow WHILE measuring, say so — that');
          lines.push('would mean the slowness is somewhere this does not yet look.');
        }
        if (typeof done === 'function') done(lines.join('\n'));
      }

      requestAnimationFrame(tick);
      return true;
    },

    stop() { this.running = false; },
    // Exposed so the suite can assert the deadline exists without waiting out a real hidden-tab run.
    _hasDeadline() { return this.running; },
  };
})(window.FM);
