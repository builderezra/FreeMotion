/* FreeMotion — Media registry.
 * Holds the live, non-serializable media objects (video/image elements, decoded audio)
 * keyed by layer id, separate from the scene document. Loading a file returns the
 * intrinsic metadata the scene needs (size, duration).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const store = {};   // layerId -> { kind, el, width, height, duration, file, url, audioBuffer? }

  FM.media = {
    set(id, rec) { store[id] = rec; },
    get(id) { return store[id]; },
    remove(id) {
      const r = store[id];
      if (r && r.url) { try { URL.revokeObjectURL(r.url); } catch (e) {} }
      delete store[id];
    },
    all() { return store; },
  };

  /* Load a video file -> { kind:'video', el, width, height, duration, url } */
  FM.loadVideoFile = function (file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const el = document.createElement('video');
      el.src = url;
      el.muted = true;            // preview is muted; export decodes audio separately
      el.playsInline = true;
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      let settled = false;
      // A file that fires NEITHER 'loadedmetadata' NOR 'error' leaves this promise pending for the
      // life of the page, and every importer AWAITS it — so the import does nothing at all, with no
      // layer, no error and no message. That reads as "the app is broken", which is the one thing a
      // failure must never look like. Bounded, so an unreadable file becomes a NAMED failure that
      // handleFiles() already knows how to show.
      const metaTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { URL.revokeObjectURL(url); } catch (e) {}
        reject(new Error('Could not read “' + file.name + '” — the browser never reported its size or length.'));
      }, 20000);
      const finish = (override) => {
        if (settled) return;
        settled = true;
        clearTimeout(metaTimer);
        const own = (isFinite(el.duration) && el.duration > 0) ? el.duration : 0;
        resolve({
          kind: 'video', el, url, file,
          width: el.videoWidth, height: el.videoHeight,
          duration: Math.max(own, (isFinite(override) && override > 0) ? override : 0),
        });
      };
      el.addEventListener('loadedmetadata', async () => {
        const meta = el.duration;
        const bogus = !isFinite(meta) || isNaN(meta) || meta === 0;   // MediaRecorder webm: Infinity until forced
        if (bogus) {
          let best = 0;
          const cleanup = () => {
            el.removeEventListener('durationchange', onResolve);
            el.removeEventListener('timeupdate', onResolve);
            el.removeEventListener('seeked', onResolve);
          };
          function onResolve() {
            if (isFinite(el.duration) && el.duration > best) best = el.duration;
            if (isFinite(el.duration) && el.duration > 0) {
              cleanup(); try { el.currentTime = 0; } catch (e) {} finish(best);
            }
          }
          el.addEventListener('durationchange', onResolve);
          el.addEventListener('timeupdate', onResolve);
          el.addEventListener('seeked', onResolve);
          try { el.currentTime = 1e7; } catch (e) {}
          setTimeout(() => { cleanup(); try { el.currentTime = 0; } catch (e) {} finish(best); }, 1500);   // never hang
        } else if (!el.videoWidth) {
          /* AUDIO-ONLY: TRUST THE DECODE, NOT THE CONTAINER (queue 72). A VBR mp3 whose Xing/VBRI
           * header is missing or clobbered — a stream rip, a concatenation, a tag editor that ate the
           * info frame — makes the browser ESTIMATE the length from the first frame's bitrate. That
           * estimate is finite and positive, so the old guard waved it through, addMediaLayer turned
           * it into layer.duration (js/app.js:1268), and the clip was born shorter than the song with
           * the tail simply gone. It is the only one of queue 72's two causes that really loses audio.
           *
           * I tried the seek-past-the-end trick here first, because that is what the bogus branch
           * above already does, and MEASURED it against a fixture that is 26.384s long and claims
           * 11.210s: the seek recovered only 13.453s and cost 600ms. Decoding at 8kHz returned
           * 26.384s exactly, in 25ms — right, and 24x cheaper. The decode is not extra work either;
           * getWaveform performs the same one lazily a moment later and the result is cached on the
           * record, so this mostly moves it earlier.
           *
           * Bounded three ways: only for audio, only under the waveform's own size ceiling, and inside
           * a try/catch that falls back to the container figure. Whichever is LARGER wins, so a decode
           * that learns nothing can never SHORTEN a clip. */
          let dec = 0;
          if (!(file && file.size > WAVE_MAX_BYTES)) {
            try {
              const ab = await FM.decodeAudio(file, { rate: WAVE_RATE });
              if (ab && isFinite(ab.duration) && ab.duration > 0) dec = ab.duration;
            } catch (e) {}
          }
          finish(dec);
        } else {
          finish();
        }
      }, { once: true });
      el.addEventListener('error', () => { if (settled) return; settled = true; clearTimeout(metaTimer); try { URL.revokeObjectURL(url); } catch (e2) {} reject(new Error('Could not load video: ' + file.name)); }, { once: true });   // failed imports must not pin the whole file blob for the page lifetime
    });
  };

  /* ---- Repaint the preview when a clip becomes DECODABLE -----------------------------------------
   * The preview renders on demand — there is no idle loop — and the compositor SKIPS a video whose
   * element is below HAVE_CURRENT_DATA (readyState 2). loadVideoFile resolves on 'loadedmetadata',
   * which promises the file's dimensions and NOTHING about a decoded frame, so the render that
   * follows an import can legitimately arrive too early and draw nothing. Without a listener for the
   * moment the frame arrives, nothing ever asks the canvas to try again: the clip sits in the
   * timeline at the right length, "visible" at the playhead, and the canvas stays black.
   *
   * Measured on v5.79, 390x844, with a 14s 1170x2532 clip held at HAVE_METADATA across the import:
   * preview ink 0.00% at import, 0.00% after 3s, and STILL 0.00% five seconds after readyState
   * reached 4 — renderScene frozen at 14 calls the whole time. Only a manual scrub brought it back
   * (99.94%). On a fast machine the timeline's filmstrip build happens to seek the element and its
   * 'seeked' events hide the hole; a phone decoding a big clip is exactly the case where it doesn't.
   *
   * 'seeked' cannot cover this on its own: seeking an element to the time it is ALREADY at fires no
   * event, which is precisely the first clip of a project (playhead 0, clip starts at 0).
   *
   * 'loadeddata' is the exact complement of the compositor's gate — it fires when readyState reaches
   * 2. 'canplay' is the belt to its braces. Added ALONGSIDE each call site's existing 'seeked'
   * listener rather than replacing it, so nothing that works today changes. */
  FM.wireVideoRepaint = function (rec) {
    if (!rec || rec.kind !== 'video' || !rec.el || rec._repaintWired) return;
    rec._repaintWired = true;
    const repaint = () => { if (FM.requestRender) FM.requestRender(); };
    rec.el.addEventListener('loadeddata', repaint);
    rec.el.addEventListener('canplay', repaint);
  };

  /* Load an image file -> { kind:'image', el, width, height, url } */
  FM.loadImageFile = function (file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const el = new Image();
      el.onload = () => resolve({ kind: 'image', el, url, file, width: el.naturalWidth, height: el.naturalHeight });
      el.onerror = () => { try { URL.revokeObjectURL(url); } catch (e2) {} reject(new Error('Could not load image: ' + file.name)); };
      el.src = url;
    });
  };

  /* Decode a file's audio track into an AudioBuffer (used by the exporter for
   * mixing / reversing). Returns null if the file has no decodable audio.
   *
   * `opts.rate` decodes into an OfflineAudioContext at that sample rate instead of at the device rate.
   * decodeAudioData resamples to the CONTEXT's rate, and the decoded buffer — not the file — is what
   * kills a phone: PCM costs rate x channels x 4 bytes per second, so its size is set by DURATION and
   * is the same for a 4K master and a phone clip of the same length. Measured (tests/_audiomem.html):
   *   10 min -> 219.7 MB      20 min -> 439.5 MB      60 min -> 1318.4 MB
   * against a mobile tab ceiling of roughly 1-2 GB. Ask for a low rate unless you need real fidelity. */
  FM.decodeAudio = async function (file, opts) {
    opts = opts || {};
    let ctx = null;
    try {
      const buf = await file.arrayBuffer();
      const AC = window.AudioContext || window.webkitAudioContext;
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      ctx = (opts.rate && OAC) ? new OAC(1, Math.ceil(opts.rate), opts.rate) : new AC();
      // No .slice() — that copy doubled the transient cost (the whole file a second time) to guard a
      // buffer nothing reads afterwards. decodeAudioData may detach `buf`; that is fine, it is local.
      return await ctx.decodeAudioData(buf);
    } catch (e) {
      return null;   // no decodable audio track (screen recordings etc.)
    } finally {
      // OfflineAudioContext has no close() on older Safari, hence the guard as well as the try.
      if (ctx && ctx.close) { try { ctx.close(); } catch (e2) {} }   // iOS caps live AudioContexts (~4) — a leak per silent video eventually kills ALL audio
    }
  };

  /* Above this, decoding the audio track to draw a waveform is not worth the risk of losing the tab:
   * file.arrayBuffer() alone has to hold the whole file in RAM before decoding even starts. A clip with
   * no waveform is a small cosmetic loss; a browser that kills the tab loses the project. */
  const WAVE_MAX_BYTES = 300 * 1024 * 1024;
  const WAVE_RATE = 8000;   // 600 peaks are drawn from this — 8kHz is ample, and 6x smaller than 48k

  /* ---- "Does this layer actually carry SOUND?" -------------------------------------------------
   * NOT "is it a video". Silent screen recordings are ordinary, and the audio half of the effect
   * browser greys itself on this answer — keying that off the layer TYPE would offer reverb on a clip
   * with nothing to reverberate. The truth is in the file: a decodable audio track, or none.
   *
   * Three answers, because sometimes the honest one is "not yet":
   *   hasAudioTrack(layer)  → true | false | null   synchronous, FREE. It only reads what is already
   *     known: a cached probe result, the full-fidelity buffer the exporter/reverse path decodes, or
   *     the timeline's waveform peaks (which can only exist if a track decoded). null = unknown.
   *   probeAudioTrack(layer) → Promise<true|false|null>   resolves the unknown by decoding at 8 kHz
   *     and keeping ONLY the yes/no. A probe must never pay for full-rate PCM (see decodeAudio's
   *     memory note: an hour of 48k stereo is 1.3 GB), and must never park it on the record either.
   *
   * Callers treat null as "assume yes": greying out a control that would have worked is worse than
   * offering one that turns out to do nothing, and the probe demotes it a moment later either way. */
  const PROBE_RATE = 8000;
  FM.hasAudioTrack = function (layer) {
    if (!layer || layer.type !== 'video') return false;   // only the video/audio path carries sound (mp3/wav ride it)
    const rec = store[layer.id];
    if (!rec) return null;
    if (typeof rec.hasAudioTrack === 'boolean') return rec.hasAudioTrack;
    if (rec.audioBuffer) return true;
    if (rec.audioBuffer === null) return false;                            // a full decode already came back empty
    if (Array.isArray(rec.waveform) && rec.waveform.length) return true;   // peaks exist ⇒ a track decoded
    return null;
  };
  FM.probeAudioTrack = async function (layer) {
    const known = FM.hasAudioTrack(layer);
    const rec = layer ? store[layer.id] : null;
    if (known !== null) {
      if (rec && typeof rec.hasAudioTrack !== 'boolean') rec.hasAudioTrack = known;
      return known;
    }
    if (!rec || !rec.file) return null;                                    // nothing to look at — stays unknown
    if (rec.file.size > WAVE_MAX_BYTES) return null;                       // same tab-safety ceiling as the waveform
    if (rec._audioProbe) return rec._audioProbe;                           // one decode per record, however many callers ask
    rec._audioProbe = (async () => {
      const ab = await FM.decodeAudio(rec.file, { rate: PROBE_RATE });
      // Deliberately NOT cached as rec.audioBuffer: that slot means full-fidelity PCM to the exporter
      // and the audio-reactive tools, and an 8 kHz stand-in would silently degrade both.
      rec.hasAudioTrack = !!(ab && ab.length && ab.numberOfChannels);
      return rec.hasAudioTrack;
    })();
    return rec._audioProbe;
  };

  /* Compute (and cache on the media rec) a peak array for drawing the clip waveform.
   *
   * Two rules here, both bought with a bug. Ezra imported a full song and the strip came back with
   * clean vertical holes at regular spacing — "it's missing parts". The audio was fine: the decoded
   * buffer was sample-exact against the source and the export mix correlated 1.00000. Only the
   * PICTURE was lossy. So:
   *
   * 1. SCAN EVERY SAMPLE. The old loop stepped each bin with `stride = max(1, floor(block/200))`,
   *    which at this rate is floor(duration/15): 1 up to 29 s, then 2, 4 at a minute, 20 at five
   *    minutes — i.e. a 5-minute song had each bar decided by 5% of its samples. Decimation is not
   *    a small error, it is an ALIAS: a fixed stride lands every inspected sample at nearly the same
   *    phase of any content near a multiple of the decimated rate, and when that phase sits near a
   *    zero crossing the bar reads as SILENCE. Measured against a full scan of the very same buffer
   *    (only the sampling differed), a 300 s constant-amplitude fixture — whose true envelope is a
   *    dead-flat band — drew 30 of 600 bars under half their true height, worst 5.2%, with a dip
   *    every 10 s. Broadband content aliased the same way, so it was not an artefact of a pure tone.
   *    A max over a CONTIGUOUS run cannot do that; it can only ever read too high, never too low.
   *    The stride was never worth it — a full scan of 5 minutes at 8 kHz is 2.4M compares (~4 ms).
   *
   * 2. RESOLUTION FOLLOWS DURATION. A fixed 600 peaks is one bar per 32 CSS pixels once a 5-minute
   *    clip is stretched along the timeline — a comb, not a waveform. Peaks are cheap in a way PCM
   *    is not (that is why the decode above stays at 8 kHz): the array is bounded at WAVE_MAX_PEAKS
   *    plain numbers, ~64 KB, whatever the file.
   *
   * The cap degrades HONESTLY. Past ~5.5 minutes each peak simply covers more time; it is still the
   * max of a contiguous span, so a quiet moment reads shorter — no span of the song ever vanishes. */
  const WAVE_PEAKS_PER_SEC = 25;
  const WAVE_MIN_PEAKS = 600;      // what short clips have always drawn; keeps their look identical
  const WAVE_MAX_PEAKS = 8192;     // the clip canvas is itself capped at 8192 backing px (iOS), so more can never be drawn

  FM.getWaveform = async function (rec) {
    if (rec.waveform) return rec.waveform;
    if (rec._wfPending) return null;
    rec._wfPending = true;
    try {
      if (rec.file && rec.file.size > WAVE_MAX_BYTES) { rec.waveform = []; rec._wfPending = false; return rec.waveform; }
      // Deliberately NOT cached on rec.audioBuffer. That slot is full-fidelity PCM the exporter and the
      // audio-reactive effects want, and parking a half-gigabyte of it there for the whole session — to
      // draw 600 peaks, on import, for every clip — is what made long videos impossible to add on a
      // phone. Those callers decode for themselves when the feature is actually used.
      const ab = rec.audioBuffer !== undefined && rec.audioBuffer !== null
        ? rec.audioBuffer
        : await FM.decodeAudio(rec.file, { rate: WAVE_RATE });
      if (!ab) { rec.waveform = []; rec._wfPending = false; return rec.waveform; }
      /* EVERY channel, not just the left one. This drew the peak of channel 0 alone while playback and
       * export mix the lot, so any span where the left is quiet but the right is not — a hard-panned
       * intro, a one-sided 60s/70s stereo mix, an interview whose single mic was muxed to the right,
       * a file with a dead left channel — rendered as a flat line under audio you can plainly hear.
       * That is Ezra's "you can see how it's missing parts" (queue 72), and the file was never damaged:
       * only the picture of it was. Measured on a 180s stereo file carrying full-scale tone on the
       * RIGHT throughout with the left zeroed from 60s to 120s: 120 of 360 half-second windows read
       * silent on channel 0 and ZERO read silent across both channels, drawing a 60-second hairline
       * through the middle of the clip.
       * tests/_audiogaps.html could never have caught it — its makeWav() writes `setUint16(22, 1)`,
       * i.e. MONO, so the probe that "re-verified this from scratch" cannot express the failure. */
      const chans = [];
      for (let c = 0; c < ab.numberOfChannels; c++) chans.push(ab.getChannelData(c));
      const ch = chans[0];
      const len = ch.length;
      const dur = ab.duration || (len / (ab.sampleRate || WAVE_RATE));
      // never more bins than samples — a sub-second clip would otherwise get empty bins between real ones
      const N = Math.max(1, Math.min(len || 1, Math.max(WAVE_MIN_PEAKS,
        Math.min(WAVE_MAX_PEAKS, Math.round(dur * WAVE_PEAKS_PER_SEC)))));
      const peaks = new Array(N);
      for (let i = 0; i < N; i++) {
        // Bin edges from the FULL length, so the tail can't be dropped: the old `s = i*block` with
        // block = floor(len/600) left up to 599 samples past the last bin unlooked-at.
        const s = Math.floor(i * len / N);
        const e = (i === N - 1) ? len : Math.max(s + 1, Math.floor((i + 1) * len / N));
        let max = 0;
        for (let c = 0; c < chans.length; c++) {
          const d = chans[c];
          for (let j = s; j < e; j++) { const v = d[j] < 0 ? -d[j] : d[j]; if (v > max) max = v; }
        }
        peaks[i] = max;
      }
      rec.waveform = peaks;
      // Peaks CHANGED. The timeline caches a rendered strip and used to key it on the peak COUNT
      // alone, so a recomputed waveform of the same length silently kept the old canvas on screen.
      rec.waveformV = (rec.waveformV || 0) + 1;
    } catch (e) { rec.waveform = []; rec.waveformV = (rec.waveformV || 0) + 1; }
    rec._wfPending = false;
    return rec.waveform;
  };
})(window.FM);
