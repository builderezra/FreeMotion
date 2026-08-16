/* FreeMotion — sound effects (queue 196).
 *
 * Ezra: "in the audio tab we will add a button that is sound effects and you will be able to use that
 * to add sound effects to the project, we will have a sound effects menu with a bunch of our own sound
 * effects and some royalty free ones we find online, that we can legally use for free." — and then, of
 * the plan below: "Good ideas btw for the sound effects menu."
 *
 * THESE ARE SYNTHESISED, NOT SAMPLED, and that is the whole design decision:
 *   · Licence. "Royalty free ones we find online" needs sources whose terms are explicit, and a wrong
 *     guess is the kind of mistake that follows an app around. Sound built out of oscillators and noise
 *     has no licence question at all — it is ours by construction.
 *   · Weight. This is a local-only, no-build app that everyone downloads whole and the service worker
 *     then caches. A folder of WAVs is megabytes on every first load; this file is a few kilobytes and
 *     renders on demand.
 *   · They are OURS. A pack of stock whooshes is what every other editor ships. These are tuned to this
 *     app, and any of them can be re-tuned by changing a number here rather than by finding a new file.
 * The menu takes real files later without changing: everything below produces a WAV Blob, and the add
 * path is the same one the voice recorder already uses (File → FM.loadVideoFile → FM.addMediaLayer),
 * so an effect arrives in the timeline as an ordinary audio clip that trims, fades and exports like any
 * other. Nothing downstream knows it was generated.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const SR = 44100;

  // ---- little DSP helpers -----------------------------------------------------------------------
  // Every recipe below is written against these, so the catalogue reads as sound design rather than
  // as Web Audio boilerplate.
  function noiseBuffer(ctx, secs, colour) {
    const n = Math.max(1, Math.floor(secs * ctx.sampleRate));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      // 'brown' integrates white noise: far more low end, which is what makes a whoosh feel like air
      // rather than like static.
      if (colour === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }
  function env(param, t0, pts) {           // [[timeOffset, value], …] with the first set flat
    param.setValueAtTime(pts[0][1], t0 + pts[0][0]);
    for (let i = 1; i < pts.length; i++) param.linearRampToValueAtTime(pts[i][1], t0 + pts[i][0]);
  }
  function expTo(param, t0, from, to, secs) {
    param.setValueAtTime(from, t0);
    param.exponentialRampToValueAtTime(Math.max(1e-4, to), t0 + secs);
  }

  /* ---- the catalogue ---------------------------------------------------------------------------
   * Each entry renders itself into an OfflineAudioContext. `dur` is the whole tail, so a clip lands in
   * the timeline at its real length — a whoosh cut off by its own clip length is the first thing that
   * would get reported. */
  const SFX = [
    // ---------- movement ----------
    {
      id: 'whoosh', name: 'Whoosh', cat: 'Movement', dur: 0.9,
      render(ctx, t0, d, out) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, d, 'brown');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
        // the sweep IS the movement: low → high → low reads as something passing you
        env(bp.frequency, t0, [[0, 320], [d * 0.45, 2600], [d, 420]]);
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [d * 0.28, 0.9], [d * 0.55, 0.55], [d, 0]]);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(t0); src.stop(t0 + d);
      },
    },
    {
      id: 'swish', name: 'Swish', cat: 'Movement', dur: 0.34,
      render(ctx, t0, d, out) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, d, 'white');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.4;
        env(bp.frequency, t0, [[0, 1200], [d, 5200]]);
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [0.02, 0.85], [d, 0]]);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(t0); src.stop(t0 + d);
      },
    },
    {
      id: 'reverse-whoosh', name: 'Reverse whoosh', cat: 'Movement', dur: 1.1,
      render(ctx, t0, d, out) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, d, 'brown');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.3;
        env(bp.frequency, t0, [[0, 300], [d, 4200]]);
        const g = ctx.createGain();
        // swells INTO the cut instead of decaying away from it — the point of a reverse
        env(g.gain, t0, [[0, 0], [d * 0.85, 0.95], [d, 0]]);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(t0); src.stop(t0 + d);
      },
    },
    // ---------- impact ----------
    {
      id: 'impact', name: 'Impact', cat: 'Impact', dur: 1.4,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sine';
        expTo(o.frequency, t0, 150, 32, d * 0.8);       // the drop is what makes it hit
        const og = ctx.createGain(); env(og.gain, t0, [[0, 0.95], [d * 0.9, 0.06], [d, 0]]);
        o.connect(og); og.connect(out);
        o.start(t0); o.stop(t0 + d);
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.14, 'white');
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
        const ng = ctx.createGain(); env(ng.gain, t0, [[0, 0.5], [0.13, 0]]);
        n.connect(lp); lp.connect(ng); ng.connect(out);
        n.start(t0); n.stop(t0 + 0.14);
      },
    },
    {
      id: 'thud', name: 'Thud', cat: 'Impact', dur: 0.5,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sine';
        expTo(o.frequency, t0, 190, 55, d * 0.5);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.9], [d * 0.6, 0.05], [d, 0]]);
        o.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    {
      id: 'sub-drop', name: 'Sub drop', cat: 'Impact', dur: 1.9,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sine';
        expTo(o.frequency, t0, 90, 24, d * 0.85);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [0.05, 0.95], [d * 0.8, 0.5], [d, 0]]);
        o.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    // ---------- build ----------
    {
      id: 'riser', name: 'Riser', cat: 'Build', dur: 2.2,
      render(ctx, t0, d, out) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, d, 'white');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.2;
        expTo(bp.frequency, t0, 400, 8000, d);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.05], [d * 0.92, 0.85], [d, 0]]);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(t0); src.stop(t0 + d);
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        expTo(o.frequency, t0, 110, 1500, d);
        const og = ctx.createGain(); env(og.gain, t0, [[0, 0], [d * 0.9, 0.22], [d, 0]]);
        o.connect(og); og.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    {
      id: 'build-tick', name: 'Ticking build', cat: 'Build', dur: 2.0,
      render(ctx, t0, d, out) {
        /* Ticks accelerate toward the end — tension without a pitch sweep.
         * THE GAP NEEDS A FLOOR. Written as `gap *= 0.82` with no lower bound it is a geometric series:
         * the intervals sum to 0.24/(1−0.82) = 1.33s and `t` can never reach a 2s duration, so the loop
         * never ends. It hung the render outright — sixteen effects, no output, no error. A floor makes
         * it terminate AND is the better sound: below about 45ms apart, ticks stop being countable and
         * turn into a buzz. */
        let t = 0, gap = 0.24;
        while (t < d - 0.02) {
          const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.03, 'white');
          const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
          const g = ctx.createGain();
          env(g.gain, t0 + t, [[0, 0.5 * (0.4 + 0.6 * (t / d))], [0.028, 0]]);
          n.connect(hp); hp.connect(g); g.connect(out);
          n.start(t0 + t); n.stop(t0 + t + 0.03);
          t += gap; gap = Math.max(0.045, gap * 0.82);
        }
      },
    },
    // ---------- interface ----------
    {
      id: 'click', level: 0.55, name: 'Click', cat: 'Interface', dur: 0.09,
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.75], [0.05, 0]]);
        n.connect(hp); hp.connect(g); g.connect(out);
        n.start(t0); n.stop(t0 + d);
      },
    },
    {
      id: 'pop', level: 0.7, name: 'Pop', cat: 'Interface', dur: 0.22,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sine';
        expTo(o.frequency, t0, 520, 180, 0.12);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [0.008, 0.9], [0.16, 0]]);
        o.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    {
      id: 'ding', name: 'Ding', cat: 'Interface', dur: 1.5,
      render(ctx, t0, d, out) {
        // two partials a fifth apart, the upper decaying faster — a bell rather than a beep
        [[880, 0.55, 1.0], [1320, 0.3, 0.55]].forEach(([f, a, dec]) => {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(a, t0 + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + d * dec);
          o.connect(g); g.connect(out);
          o.start(t0); o.stop(t0 + d);
        });
      },
    },
    {
      id: 'typewriter', level: 0.6, name: 'Typewriter key', cat: 'Interface', dur: 0.14,
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 1.6;
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.8], [0.03, 0.12], [0.1, 0]]);
        n.connect(bp); bp.connect(g); g.connect(out);
        n.start(t0); n.stop(t0 + d);
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 190;
        const og = ctx.createGain(); env(og.gain, t0, [[0, 0.35], [0.05, 0]]);
        o.connect(og); og.connect(out);
        o.start(t0); o.stop(t0 + 0.06);
      },
    },
    {
      id: 'shutter', level: 0.7, name: 'Camera shutter', cat: 'Interface', dur: 0.26,
      render(ctx, t0, d, out) {
        [0, 0.11].forEach((off, i) => {
          const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.05, 'white');
          const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
          bp.frequency.value = i ? 1500 : 2600; bp.Q.value = 1.1;
          const g = ctx.createGain(); env(g.gain, t0 + off, [[0, i ? 0.7 : 0.85], [0.045, 0]]);
          n.connect(bp); bp.connect(g); g.connect(out);
          n.start(t0 + off); n.stop(t0 + off + 0.05);
        });
      },
    },
    // ---------- texture ----------
    {
      id: 'sparkle', level: 0.75, name: 'Sparkle', cat: 'Texture', dur: 1.2,
      render(ctx, t0, d, out) {
        for (let i = 0; i < 14; i++) {
          const at = t0 + Math.random() * d * 0.7;
          const o = ctx.createOscillator(); o.type = 'sine';
          o.frequency.value = 1800 + Math.random() * 3600;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, at);
          g.gain.linearRampToValueAtTime(0.16, at + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22 + Math.random() * 0.2);
          o.connect(g); g.connect(out);
          o.start(at); o.stop(Math.min(t0 + d, at + 0.5));
        }
      },
    },
    {
      id: 'zap', name: 'Zap', cat: 'Texture', dur: 0.4,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        expTo(o.frequency, t0, 2400, 120, d * 0.7);
        const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 5200;
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.7], [d * 0.7, 0.08], [d, 0]]);
        o.connect(bp); bp.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    {
      id: 'bubble', level: 0.7, name: 'Bubble', cat: 'Texture', dur: 0.3,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sine';
        expTo(o.frequency, t0, 240, 900, 0.16);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [0.01, 0.6], [0.2, 0]]);
        o.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
  ];

  // ---- render + encode --------------------------------------------------------------------------
  /* A little headroom, applied to EVERY effect through one node rather than by hand-tuning sixteen
   * recipes: the pieces above are written to sound right relative to each other, and a master trim is
   * the one place to keep the set clear of 0 dBFS.
   * Every recipe is handed its OUTPUT NODE rather than reaching for ctx.destination. The first cut
   * passed a proxy context with `destination` overridden — which throws "Illegal invocation" on the
   * first createGain(), because a native method called with a plain object as `this` is refused. All
   * sixteen failed identically; the probe caught it before any of this was wired to a button. */
  const MASTER = 0.82;

  function offlineCtx(secs) {
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AC) return null;
    return new AC(1, Math.max(1, Math.ceil(secs * SR)), SR);
  }

  /* NORMALISED AFTER RENDERING, not tuned by hand. Measured across the set as first written, peaks ran
   * from 0.08 (Reverse whoosh) to 0.90 (Impact) — an eleven-fold spread, because a bandpassed noise
   * sweep and a sine drop simply do not arrive at the same level from similar-looking gain envelopes.
   * Left alone, adding a whoosh after an impact sounds like nothing happened.
   * So each effect is scaled to a common peak, and `level` is how a recipe asks to sit deliberately
   * below it — a click SHOULD be quieter than a boom. That makes relative loudness a decision in the
   * catalogue rather than a side effect of the synthesis. */
  const TARGET_PEAK = 0.89;

  function normalise(buf, level) {
    const d = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
    if (peak < 1e-5) return buf;                       // silent: nothing to scale, and the probe reports it
    const k = (TARGET_PEAK * (level == null ? 1 : level)) / peak;
    for (let i = 0; i < d.length; i++) d[i] *= k;
    return buf;
  }

  function renderBuffer(def) {
    const ctx = offlineCtx(def.dur + 0.05);
    if (!ctx) return Promise.reject(new Error('no OfflineAudioContext'));
    // Everything the recipes connect to goes through the trim first.
    const trim = ctx.createGain(); trim.gain.value = MASTER;
    trim.connect(ctx.destination);
    def.render(ctx, 0, def.dur, trim);
    return ctx.startRendering().then(buf => normalise(buf, def.level));
  }

  /* WAV, not WebM: this is decoded again immediately by FM.loadVideoFile, and 16-bit PCM is the one
   * container every engine reads without a codec question. A 2-second mono effect is ~176 KB, which
   * never touches disk — it goes straight into the media pipeline. */
  /* WAV writer. Sound effects are mono, and this used to hard-code that: it read getChannelData(0)
   * and declared 1 channel in the header. Correct for its original job, and silently WRONG the
   * moment the audio-only export (queue 216) handed it the project mix, which is stereo — the whole
   * right channel went in the bin and nothing said a word. Measured, not guessed: a 2-second stereo
   * mix came out as a 192KB file where 384KB was expected.
   * It follows the buffer's own channel count now and interleaves. A mono buffer produces byte-for-
   * byte what it always did, so nothing the sound effects do changes. */
  function encodeWav(buf) {
    const n = buf.length;
    const nch = Math.max(1, buf.numberOfChannels || 1);
    const chans = [];
    for (let c = 0; c < nch; c++) chans.push(buf.getChannelData(c));
    const blockAlign = nch * 2;                     // 16-bit samples
    const bytes = 44 + n * blockAlign;
    const dv = new DataView(new ArrayBuffer(bytes));
    const str = (off, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); str(8, 'WAVE');
    str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, nch, true);
    dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * blockAlign, true);
    dv.setUint16(32, blockAlign, true); dv.setUint16(34, 16, true);
    str(36, 'data'); dv.setUint32(40, n * blockAlign, true);
    let off = 44;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < nch; c++) {
        const v = Math.max(-1, Math.min(1, chans[c][i]));
        dv.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
        off += 2;
      }
    }
    return new Blob([dv.buffer], { type: 'audio/wav' });
  }

  function byId(id) { return SFX.find(s => s.id === id) || null; }

  // ---- preview (live) ---------------------------------------------------------------------------
  let liveCtx = null, liveStop = null;
  function preview(def) {
    stopPreview();
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      liveCtx = liveCtx && liveCtx.state !== 'closed' ? liveCtx : new AC();
      if (liveCtx.state === 'suspended') liveCtx.resume();
      const trim = liveCtx.createGain(); trim.gain.value = MASTER;
      trim.connect(liveCtx.destination);
      const proxy = Object.create(liveCtx);
      Object.defineProperty(proxy, 'destination', { get() { return trim; } });
      const t0 = liveCtx.currentTime + 0.01;
      def.render(proxy, t0, def.dur);
      liveStop = () => { try { trim.disconnect(); } catch (e) {} };
    } catch (e) {}
  }
  function stopPreview() { if (liveStop) { liveStop(); liveStop = null; } }

  // ---- add to the project -----------------------------------------------------------------------
  async function add(def) {
    const buf = await renderBuffer(def);
    const blob = encodeWav(buf);
    const name = def.name + '.wav';
    let file;
    try { file = new File([blob], name, { type: 'audio/wav' }); }
    catch (e) { file = blob; file.name = name; }   // very old Safari has no File constructor
    const rec = await FM.loadVideoFile(file);
    FM.addMediaLayer(rec);
    if (FM.toast) FM.toast('Added ' + def.name);
  }

  /* ---- the panel -------------------------------------------------------------------------------
   * Deliberately the notepad's shape (a scrim + a card), not a full-screen browser: this is a short
   * list you pick one thing from, and the effects browser's machinery — search, favourites, live
   * thumbnails — would be scaffolding around sixteen rows. Every row previews on tap and adds with a
   * button, because the whole difficulty with sound effects is that you cannot tell what one is from
   * its name. */
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function close() { stopPreview(); document.querySelectorAll('.sfx-scrim').forEach(n => n.remove()); }

  function open() {
    close();
    const scrim = el('div', 'sfx-scrim');
    const card = el('div', 'sfx-card');
    /* The signature travelling edge-light (queue 291). Same element shape and same CSS as the open
       project card and the add-menu tab wear — see .hm-glint / .am-glint in styles.css — so the three
       cannot drift apart into three slightly different signatures. */
    (function () { const g = el('span', 'sfx-glint'); g.appendChild(document.createElement('i')); card.appendChild(g); })();
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Sound effects');
    const head = el('div', 'sfx-head');
    head.appendChild(el('div', 'sfx-title', 'Sound effects'));
    card.appendChild(head);
    card.appendChild(el('div', 'sfx-hint', 'Tap a name to hear it. These are generated in the app, so they cost nothing to download.'));

    const body = el('div', 'sfx-list');
    categoriesOf().forEach(cat => {
      body.appendChild(el('div', 'sfx-cat', cat));
      SFX.filter(s => s.cat === cat).forEach(def => {
        const row = el('div', 'sfx-row');
        const play = el('button', 'sfx-play');
        play.type = 'button';
        play.title = 'Hear ' + def.name;
        play.setAttribute('aria-label', 'Hear ' + def.name);
        play.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        const name = el('button', 'sfx-name', def.name);
        name.type = 'button';
        const secs = el('span', 'sfx-dur', def.dur.toFixed(2).replace(/0$/, '') + 's');
        const hear = () => { preview(def); row.classList.add('playing'); setTimeout(() => row.classList.remove('playing'), Math.round(def.dur * 1000) + 60); };
        play.addEventListener('click', hear);
        name.addEventListener('click', hear);
        const addBtn = el('button', 'btn sfx-add', 'Add');
        addBtn.type = 'button';
        addBtn.addEventListener('click', async () => {
          addBtn.disabled = true; addBtn.textContent = '…';
          try { await add(def); close(); }
          catch (e) { addBtn.disabled = false; addBtn.textContent = 'Add'; if (FM.toast) FM.toast('Could not add that sound'); }
        });
        row.append(play, name, secs, addBtn);
        body.appendChild(row);
      });
    });
    card.appendChild(body);

    const actions = el('div', 'sfx-actions');
    const done = el('button', 'btn sfx-done', 'Close');
    done.addEventListener('click', close);
    actions.appendChild(done);
    card.appendChild(actions);

    scrim.appendChild(card);
    document.body.appendChild(scrim);
    scrim.addEventListener('pointerdown', e => { if (e.target === scrim) close(); });
  }
  function categoriesOf() { return SFX.reduce((a, s) => (a.indexOf(s.cat) < 0 ? a.concat(s.cat) : a), []); }

  FM.sfx = {
    open: open,
    close: close,
    list: () => SFX.slice(),
    categories: categoriesOf,
    byId: byId,
    renderBuffer: renderBuffer,   // exposed so the suite can measure what each recipe actually makes
    encodeWav: encodeWav,
    preview: preview,
    stopPreview: stopPreview,
    add: add,
  };
})(window.FM);
