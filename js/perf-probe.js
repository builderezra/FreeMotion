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

  /* THE VERDICT, as a pure function — because this judgement has already been wrong once, on the
   * very first real measurement, and a wrong verdict is worse than no verdict in a tool built to
   * stop us drawing wrong conclusions. Pure so the suite can put his actual numbers in and read the
   * sentence out, with no rAF stubbing and nothing to leak into the next test.
   *
   * JUDGE THE TAIL, NOT JUST THE MIDDLE. The first version looked only at the median and told him
   * "this sample looks healthy" about a run containing a 494ms freeze and 14 late frames of 446. A
   * median is exactly the statistic that cannot see a stutter — half a second of freeze every few
   * seconds leaves the middle untouched — and a stutter is what "laggy" actually means. */
  function verdictLines(lines, m) {
    const latePct = m.total ? (m.late / m.total) * 100 : 0;
    const hitching = m.late > 0 && (latePct >= 1 || m.worst > 250);
    if (hitching) {
      lines.push('READ: the average is fine but this STUTTERS — ' + m.late + ' of ' + m.total +
                 ' frames were late and the worst took ' + Math.round(m.worst) + 'ms.');
      lines.push('A median cannot see a freeze; that is what "laggy" actually feels like.');
      if (m.appMs < m.budget * 0.5) {
        lines.push('Our own drawing averaged ' + m.appMs + 'ms, so the hitches are GPU work, video');
        lines.push('decode or garbage collection — not the render loop.');
      }
    } else if (m.med > m.budget * 1.5 && m.appMs < m.budget * 0.5) {
      lines.push('READ: frames are slow but our own drawing is fast — the cost is GPU effects or');
      lines.push('video decode, NOT the render loop. That is the case every earlier pass missed.');
    } else if (m.med > m.budget * 1.5) {
      lines.push('READ: our own drawing is genuinely slow — the render loop is the cost.');
    } else {
      lines.push('READ: this sample looks healthy — steady frames and no hitching. If it felt slow');
      lines.push('WHILE measuring, say so; that means the slowness is somewhere this cannot see.');
    }
    /* A canvas far larger than anything that will ever be shown or exported is worth saying whatever
     * the frame numbers did, because it is the one cause a person can actually fix — and his own
     * first sample was a 3024x4032 project on a phone. */
    const P = FM.scene && FM.scene.project;
    const mp = P ? (P.width * P.height) / 1e6 : 0;
    if (mp >= 8) {
      lines.push('');
      lines.push('NOTE: this project is ' + P.width + '×' + P.height + ' (' + mp.toFixed(1) + ' megapixels).');
      lines.push('That is photo-sized, and every frame composites all of it. Almost certainly the');
      lines.push('biggest single cost here, and the easiest to fix — see Canvas settings.');
    }
    return lines;
  }

  FM.perfProbe = {
    _verdict: function (m) { return verdictLines([], m).join('\n'); },

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
      /* WAS THE LADDER EVEN ALLOWED TO ACT? notePlaybackCost returns immediately unless the app is
         PLAYING or in motion (a drag/scrub) — so on a sample taken while sitting still, "tier 0 of 6"
         does not mean the ladder decided to stay put, it means the ladder never ran. Ezra's third
         reading (queue 202) is exactly that shape, and without this line it cannot be told apart from
         a ladder that is genuinely stuck. */
      let everEligible = false;
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
        // the one thing the tier number cannot tell you on its own — see everEligible above
        if (FM.playing || (FM.playbackQualityInfo && FM.playbackQualityInfo().inMotion)) everEligible = true;
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
          /* REPORT THE EFFECTIVE FACTOR, not just the tier (queue 202). In 'smooth' mode previewScale()
             floors the factor at tier 2 whatever _playTier says, so a report reading "tier 0" does NOT
             mean full resolution — and reading it that way is how his third measurement looked like a
             ladder frozen at the top when it may simply never have been asked. */
          lines.push('QUALITY  tier ' + qi.tier + ' of ' + (st ? st.tiers : '?') + ' · mode ' + qi.mode +
                     (qi.effective != null ? ' · rendering at ' + Math.round(qi.effective * 100) + '% scale' : ''));
          lines.push('         app-measured render ' + qi.avgFrameMs + 'ms · app-measured gap ' + qi.avgGapMs + 'ms');
          /* And whether the ladder was allowed to act at all. Without this, a tier that never moved
             reads as "the ladder is broken" when the honest answer may be "nothing asked it". */
          if (!everEligible) {
            lines.push('         ⚠ the quality ladder never ran during this sample — it only adapts while');
            lines.push('           PLAYING or dragging, and neither happened here. The tier above means');
            lines.push('           "untouched", not "decided to stay".');
          }
        }
        if (st) {
          lines.push('CANVAS   ' + (st.canvasPx ? Math.round(st.canvasPx / 1000) + 'k pixels' : 'unknown') +
                     (st.locked ? ' · ladder LOCKED (probing stopped)' : ''));
        }
        /* ═══ AUDIO (queue 148, and 95 / 96 / 72 with it).
         * THREE of his open reports are about sound — scratchy popping, "the audios don't play
         * smoothly", a song that will not play — and this report said nothing whatsoever about audio.
         * #148 ends by asking HIS EARS a question the app can answer from numbers it already keeps:
         * is the scratchiness OUR sync controller, or the browser's decoder under load?
         * The number that settles it is WRITES TO playbackRate, not trims: `preservesPitch` makes a
         * rate write a PITCH change, so a churning controller is audibly a warble. v6.91 took it from
         * 21/s to 1.5/s and v11.70 to zero on a normal start — if his device reports it high again,
         * the regression is ours and it is measurable; if it reports ~0 while he can hear it, the
         * sync loop is exonerated and the decoder is next, which is exactly the fork #148 is stuck on. */
        const ps = FM.playbackStats;
        if (ps && (ps.syncs || ps.rateWrites)) {
          const secs = Math.max(0.001, elapsed / 1000);
          const errs = (ps.errs || []).slice().sort((a, b) => a - b);
          const emed = errs.length ? errs[Math.floor(errs.length / 2)] : null;
          const eworst = errs.length ? errs[errs.length - 1] : null;
          lines.push('AUDIO    ' + (ps.rateWrites / secs).toFixed(1) + ' rate writes/s · ' + ps.seeks + ' seeks · ' + ps.syncs + ' sync ticks');
          if (emed != null) {
            lines.push('         sync error ' + Math.round(emed * 1000) + 'ms median · ' + Math.round(eworst * 1000) + 'ms worst' +
                       ' (dead band ' + Math.round((FM.syncTuning ? FM.syncTuning.dead : 0.045) * 1000) + 'ms)');
          }
          /* Say what it MEANS, because a bare rate is not something he should have to interpret —
           * and because the two readings point at completely different next steps. */
          if (ps.rateWrites / secs > 4) {
            lines.push('         ⚠ the rate is being rewritten often. preservesPitch turns that into a');
            lines.push('           PITCH change, which is heard as a scratchy warble — this is ours.');
          } else if (ps.syncs > 20) {
            lines.push('         the sync controller is quiet, so scratchiness heard here is NOT our');
            lines.push('           rate correction — the decoder under load is the next suspect.');
          }
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
        } else {
          verdictLines(lines, { med: med, worst: worst, late: late, total: sorted.length, appMs: appMs, budget: budget });
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
