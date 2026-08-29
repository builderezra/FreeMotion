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
    /* CANVAS FILTER SUPPORT (queue 645). This line exists because the answer can only come from HIS
       device: Brightness, Saturation and the black-and-white filters all render correctly on every
       desktop path that has been measured, and he reports them dead on mobile. Those nine effects are
       the only ones that go through ctx.filter, and an unsupported ctx.filter fails SILENTLY — so
       without this the report from the broken device looks identical to the report from the healthy one.
       He already runs this tool and pastes the output, so it costs no new UI and no new habit. */
    bits.push(FM.fxHealth ? FM.fxHealth().line : 'canvas filter ?');
    /* AND THE GRAPHICS CHIP (the unnumbered "Editing lags" entry, v14.33). That entry's last open
       question is literally "how fast your phone's graphics chip is — only your phone can say", and
       three releases of work (v13.81-v14.12) moved the expensive drawing onto it. This report is the
       one channel that reaches his device, and it said NOTHING about any of that: `grep -c glWarp
       js/perf-probe.js` was 0. So the report that exists to answer "why is it slow" could not see the
       single biggest thing that was done about it.
       BOTH modules, because they answer different halves and either can be absent on its own: glWarp
       is the per-pixel warps (twirl, ripple, wave…), glColor is the nine ctx.filter effects when the
       device has no ctx.filter. A device with one and not the other is a real state, not a hypothesis. */
    bits.push('webgl warp ' + (FM.glWarp && FM.glWarp.available && FM.glWarp.available() ? 'OK' : 'MISSING'));
    bits.push('webgl colour ' + (FM.glColor && FM.glColor.available && FM.glColor.available() ? 'OK' : 'MISSING'));
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
    /* ⚠️ FIRST, BEFORE ANY TIMING VERDICT (queue 645). This is not a performance fault, but this report
       is the one thing he actually runs and pastes, and a device that cannot run ctx.filter has NINE
       effects silently doing nothing — Brightness, Saturation and every black-and-white filter among
       them. He has reported that three times and every desktop measurement came back clean, because on
       a desktop it IS clean. It goes at the TOP because a reader who stops after the first READ line
       must not miss it. */
    /* ⚠️ AND THIS WARNING HAD GONE FALSE — v14.33, and it was false on HIS device specifically.
       It was gated on `FM.ctxFilterOK()` ALONE. Since v14.02 the nine effects render through a shader
       (js/gl-color.js) when ctx.filter is missing, and #675 corrected `FM.cssFxUnavailable` to ask
       ctx.filter THEN the shader (js/compositor.js:1552). This banner never got that correction, so on
       a phone with WebGL and no ctx.filter — REQUESTS.md names that as exactly his device — the one
       report he actually runs and pastes opened with a 🚨 telling him nine of his effects do nothing,
       above a screen where they had been working for eight releases.
       #661 existed because the app told him these were fine when they were dead. Leaving this would
       have been the same defect wearing the opposite sign, and #675 already wrote the rule down:
       **a wrong reassurance and a wrong warning are the same bug.**
       So it now asks the question the renderer asks, and there are THREE answers, not two — the middle
       one being both the true state of his device and the thing the "Editing lags" entry has been
       trying to find out. `m.dead` is a test seam: this branch decides what he reads, and a branch that
       can only be exercised on hardware that lacks ctx.filter is a branch no suite can check. */
    const dead = m.dead || (FM.cssFxUnavailable ? FM.cssFxUnavailable() : []);
    const ctxOK = m.ctxFilterOK != null ? m.ctxFilterOK : !!(FM.ctxFilterOK && FM.ctxFilterOK());
    if (dead.length) {
      lines.push('🚨 THIS DEVICE CANNOT RUN CANVAS FILTERS, AND HAS NO WEBGL TO STAND IN. Brightness,');
      lines.push('Saturation, Contrast, Grayscale, Sepia, Invert, Hue Shift, Blur and Glow will do');
      lines.push('NOTHING here, and they fail silently — which is why they work on the PC and not on');
      lines.push('this device. This is queue 645. Send this line; it is the answer that was missing.');
      lines.push('');
    } else if (!ctxOK) {
      lines.push('ⓘ This device has no canvas filters — but Brightness, Saturation, Contrast,');
      lines.push('Grayscale, Sepia, Invert, Hue Shift, Blur and Glow DO work here, because the app');
      lines.push('runs them on the graphics chip instead. That is what v14.02 was for, and this line');
      lines.push('is the proof it reached your phone. Nothing is broken.');
      lines.push('');
    }
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
    } else if (m.effective != null && m.effective < 0.75) {
      /* HEALTHY-BUT-PAID-FOR (queue 657). Smooth frames at a reduced raster are not the same claim as
         smooth frames, and telling him "healthy" here is how a real complaint gets filed as a clean
         bill of health. The threshold is 0.75 because tier 1 is the first step that is visible at all;
         above that the softening is not something a person would name. */
      lines.push('READ: the frames are steady, but they are BOUGHT — this is drawing at ' +
                 Math.round(m.effective * 100) + '% scale, not full size.');
      lines.push('So "smooth" here also means "softer while playing". If it looked blurry during');
      lines.push('playback, that is this, and it is the app choosing smooth over sharp on purpose.');
      lines.push('It sharpens the moment you stop. If you would rather have sharp and accept the');
      lines.push('stutter, say so — Settings → Playback quality is the switch.');
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
      /* ⚠️ THE AUDIO COUNTERS RUN FROM `play()`, NOT FROM HERE (queue 489). `FM.playbackStats.rateWrites`
         accumulates for the whole of playback and is only reset when play starts. The report divided
         that total by the probe's OWN ten-second window, so the longer he had been playing before
         pressing Measure, the bigger the number got — and past 4/s the report states flatly "this is
         ours", blaming FreeMotion's rate correction for a controller doing exactly what v11.70
         intended. It is the line the whole audio question turns on, and it is the one thing his tap on
         the toast is meant to settle, so a plausible wrong answer here is worse than no answer.
         Snapshot on the way in; everything below reports the DIFFERENCE over this sample. */
      const ps0 = (function () {
        const p = FM.playbackStats || {};
        return { rateWrites: p.rateWrites | 0, seeks: p.seeks | 0, syncs: p.syncs | 0, at: performance.now() };
      })();
      /* ⚠️ THE GPU COUNTERS ARE SNAPSHOTTED FOR THE SAME REASON THE AUDIO ONES ARE, and the note above
         is the reason this is not just `stats()` at the end. `_stats.gpu` accumulates from page load,
         so a report taken after ten minutes of editing would show a huge GPU count and a huge CPU count
         and say nothing about the ten seconds he is actually asking about — the exact shape of the
         queue-489 bug, where a total was divided by this window and the number grew with how long he
         had been playing. Everything below reports the DIFFERENCE over this sample. */
      const gl0 = (function () {
        const w = (FM.glWarp && FM.glWarp.stats) ? FM.glWarp.stats() : null;
        const c = (FM.glColor && FM.glColor.stats) ? FM.glColor.stats() : null;
        return {
          warpGpu: w ? (w.gpu | 0) : 0, warpCpu: w ? (w.cpu | 0) : 0,
          chains: w ? (w.chains | 0) : 0, chained: w ? (w.chained | 0) : 0,
          colGpu: c ? (c.gpu | 0) : 0, colCpu: c ? (c.cpu | 0) : 0,
        };
      })();
      let last = t0, frames = 0;
      const gapsPlay = [], gapsDrag = [];   // queue 387 — see the split in tick()
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
        /* ═══ SPLIT THE FRAMES BY WHAT HE WAS DOING (queue 387).
         * His most useful sentence in any performance report: *"a video will playback fine when
         * scrubbing but actually pressing play is a buggy mess"*. Both draw the same frames through
         * the same compositor, so an asymmetry between them rules out rendering cost and points at
         * something only playback does — and this report was pooling both into one median, which is
         * precisely the number that cannot see it. The entry says it needs a reading off HIS phone;
         * this is that reading, and it costs one branch per frame. */
        const playing = !!FM.playing;
        let moving = false;
        try { moving = !!(FM.playbackQualityInfo && FM.playbackQualityInfo().inMotion); } catch (e) {}
        if (gap > 0 && gap < 2000) {                    // a tab-switch gap is not a frame
          gaps.push(gap);
          if (playing) gapsPlay.push(gap);
          else if (moving) gapsDrag.push(gap);          // dragging/scrubbing, which he says is FINE
        }
        frames++;
        // the one thing the tier number cannot tell you on its own — see everEligible above
        if (playing || moving) everEligible = true;
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
        /* ═══ THE GRAPHICS CHIP (the unnumbered "Editing lags, and gets bad fast" entry, v14.33).
         * That entry is the oldest thing on his list and it ends on a question only his phone can
         * answer: three releases moved the expensive drawing off the CPU — did any of it reach HIS
         * device, and did it help? This report is the only channel that reaches that device, and it
         * had no idea any of that work existed.
         * WHAT EACH NUMBER MEANS, because a number nobody can read is not an answer:
         *  · warps  — twirl, ripple, wave and the rest. On the CPU each is a per-pixel JavaScript loop
         *             over the whole plate, which is what the entry concluded the lag actually IS.
         *  · chains — a run of warps kept on the card between passes instead of coming back through
         *             a canvas each time (v14.12). "N deep" is how many collapsed into one.
         *  · colour — the nine ctx.filter effects when this device has no ctx.filter (v14.02).
         * A run where NOTHING was drawn leaves every counter at zero, and "0 on the chip, 0 in JS" must
         * not be read as a failure — so that case says plainly that nothing was measured. */
        (function () {
          const wS = (FM.glWarp && FM.glWarp.stats) ? FM.glWarp.stats() : null;
          const cS = (FM.glColor && FM.glColor.stats) ? FM.glColor.stats() : null;
          if (!wS && !cS) return;
          const wGpu = (wS ? (wS.gpu | 0) : 0) - gl0.warpGpu, wCpu = (wS ? (wS.cpu | 0) : 0) - gl0.warpCpu;
          const cGpu = (cS ? (cS.gpu | 0) : 0) - gl0.colGpu, cCpu = (cS ? (cS.cpu | 0) : 0) - gl0.colCpu;
          const chains = (wS ? (wS.chains | 0) : 0) - gl0.chains;
          const chained = (wS ? (wS.chained | 0) : 0) - gl0.chained;
          const warpUp = !!(FM.glWarp && FM.glWarp.available && FM.glWarp.available());
          const colUp = !!(FM.glColor && FM.glColor.available && FM.glColor.available());
          lines.push('GPU      ' + (warpUp ? 'warps ON the graphics chip' : 'warps CANNOT use the graphics chip') +
                     ' · ' + (colUp ? 'colour ON it too' : 'colour CANNOT use it'));
          if (wGpu || wCpu) {
            lines.push('         warps this sample: ' + wGpu + ' on the chip, ' + wCpu + ' as JavaScript loops' +
                       (chains > 0 ? ' · ' + chains + ' chain' + (chains === 1 ? '' : 's') +
                                     ', ' + (chained / chains).toFixed(1) + ' effects deep' : ''));
          }
          if (cGpu || cCpu) lines.push('         colour this sample: ' + cGpu + ' on the chip, ' + cCpu + ' as JavaScript loops');
          if (!wGpu && !wCpu && !cGpu && !cCpu) lines.push('         nothing drew a warp or a colour effect during this sample.');
          /* The REASON string is why it fell back, straight from the module. It is the difference
             between "this phone has no WebGL" and "the plate was too small to be worth uploading", and
             guessing between those two from a distance is how three months went by on this entry. */
          const why = (wS && wS.reason) || (cS && cS.reason) || '';
          if (why && (wCpu || cCpu || !warpUp || !colUp)) lines.push('         fell back because: ' + why);
          if (!warpUp && !colUp) {
            lines.push('         ⚠ NO WEBGL ON THIS DEVICE. Every warp and every colour effect is a');
            lines.push('           per-pixel JavaScript loop here. On a stacked layer that IS the lag,');
            lines.push('           and it is the one thing the last three releases were meant to fix.');
          }
        })();
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
        /* ═══ PLAY vs SCRUB, SIDE BY SIDE (queue 387).
         * The entry's own instruction is to chase the PLAYBACK path rather than the renderer, on the
         * strength of his asymmetry. This is the only place that asymmetry can be measured on the
         * device it happens on. A bucket needs enough frames to have a meaningful median — 20 is about
         * a third of a second at 60fps — because a 3-frame median would read as a confident number and
         * be noise, and this report's whole failure mode has been confident numbers. */
        const MIN_BUCKET = 20;
        const pMed = gapsPlay.length >= MIN_BUCKET ? pct(gapsPlay.slice().sort((a, b) => a - b), 50) : null;
        const dMed = gapsDrag.length >= MIN_BUCKET ? pct(gapsDrag.slice().sort((a, b) => a - b), 50) : null;
        if (pMed != null || dMed != null) {
          lines.push('SPLIT    ' +
            (pMed != null ? 'playing ' + pMed.toFixed(1) + 'ms (' + gapsPlay.length + ' frames)' : 'playing — not sampled') + ' · ' +
            (dMed != null ? 'scrubbing ' + dMed.toFixed(1) + 'ms (' + gapsDrag.length + ' frames)' : 'scrubbing — not sampled'));
          if (pMed != null && dMed != null) {
            const ratio = pMed / dMed;
            if (ratio >= 1.5) {
              lines.push('         ⚠ PLAYING IS ' + ratio.toFixed(1) + '× SLOWER THAN SCRUBBING. Both draw the same');
              lines.push('           frames through the same compositor, so this is NOT rendering cost —');
              lines.push('           it is something only playback does (the media clock, the sync loop).');
            } else if (ratio <= 0.67) {
              lines.push('         scrubbing is the slower of the two here, which is the opposite of the');
              lines.push('           report this split was built for — worth saying plainly.');
            } else {
              lines.push('         playing and scrubbing cost about the same, so the asymmetry is not');
              lines.push('           happening in this sample.');
            }
          } else {
            lines.push('         (both are needed for the comparison — press play AND drag the playhead');
            lines.push('           during the ten seconds.)');
          }
        }
        const ps = FM.playbackStats;
        // Everything here is THIS SAMPLE's share, not the whole session's (queue 489).
        const dRate = ps ? Math.max(0, (ps.rateWrites | 0) - ps0.rateWrites) : 0;
        const dSeeks = ps ? Math.max(0, (ps.seeks | 0) - ps0.seeks) : 0;
        const dSyncs = ps ? Math.max(0, (ps.syncs | 0) - ps0.syncs) : 0;
        /* PRESENT if there is audio at all this session, but the NUMBERS are this sample's. Gating the
           section on the windowed counts instead made it vanish on a quiet sample, which the queue-148
           test caught: "0.0 rate writes/s" is a real and useful reading — silence is not the same as
           having nothing to say. */
        if (ps && (ps.syncs || ps.rateWrites)) {
          const secs = Math.max(0.001, elapsed / 1000);
          /* THIS SAMPLE'S ERRORS (queue 491). `errs` is a rolling window of the last 600 with a matching
             list of timestamps, so the report can take exactly the ones recorded while it was watching.
             Without the timestamps (a hand-built stats object in a test) fall back to all of them — but
             say which it is on the line below rather than letting a whole-session figure pass itself off
             as ten seconds. */
          const allErrs = ps.errs || [], errTimes = ps.errT || [];
          const windowed = errTimes.length === allErrs.length
            ? allErrs.filter((v, i) => errTimes[i] >= ps0.at)
            : null;
          const sampleOnly = windowed !== null;
          const errs = (sampleOnly ? windowed : allErrs).slice().sort((a, b) => a - b);
          const emed = errs.length ? errs[Math.floor(errs.length / 2)] : null;
          const eworst = errs.length ? errs[errs.length - 1] : null;
          lines.push('AUDIO    ' + (dRate / secs).toFixed(1) + ' rate writes/s · ' + dSeeks + ' seeks · ' + dSyncs + ' sync ticks');
          if (emed != null) {
            /* SAID TO BE SINCE PLAY, because it is — the error samples are capped at the first 600 and
               only cleared by play(), so unlike the line above these are NOT this sample's. Queue 491
               turns them into a rolling window; until then the label is what stops them being read as
               ten seconds' worth. */
            lines.push('         sync error ' + Math.round(emed * 1000) + 'ms median · ' + Math.round(eworst * 1000) + 'ms worst' +
                       ' (dead band ' + Math.round((FM.syncTuning ? FM.syncTuning.dead : 0.045) * 1000) + 'ms)' +
                       (sampleOnly ? '' : ' — since play, not this sample'));
          }
          /* Say what it MEANS, because a bare rate is not something he should have to interpret —
           * and because the two readings point at completely different next steps. */
          if (dRate / secs > 4) {
            lines.push('         ⚠ the rate is being rewritten often. preservesPitch turns that into a');
            lines.push('           PITCH change, which is heard as a scratchy warble — this is ours.');
          } else if (dSyncs > 20) {
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
          /* ⚠️ THE VERDICT HAS TO SEE THE PRICE (queue 657). His PC sample read HEALTHY, and that
             WAS the finding: it was rendering at 28% scale, so the steady frames were BOUGHT, not
             free — "it looks blurry while playing" is the same fact said from the other side. The
             QUALITY line above already printed the number and the READ line could not see it, so the
             report's headline said "healthy" while its own body said "28%". A report that contradicts
             itself is worse than one that says nothing. */
          verdictLines(lines, { med: med, worst: worst, late: late, total: sorted.length, appMs: appMs, budget: budget,
                                effective: qi ? qi.effective : null, tier: qi ? qi.tier : null });
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
