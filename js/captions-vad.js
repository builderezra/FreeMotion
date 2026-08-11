/* FreeMotion — Voice Activity Detection (offline, on-device).
 *
 * Finds WHERE someone is talking in a decoded AudioBuffer and returns [{start,end}] in
 * buffer-seconds. It does not transcribe — timing is the tedious half of captioning, so this
 * lays down the cue grid and the user types into it.
 *
 * Design notes, each of them a thing that goes wrong if you skip it:
 *  • ADAPTIVE THRESHOLD. The gate is derived from the clip's OWN noise floor (10th-percentile
 *    frame energy) and its own loud level (95th), so a whispered phone recording and a loud
 *    interview both work. A hardcoded dB level only ever suits one of them.
 *  • HYSTERESIS. Separate enter/exit thresholds plus a run-length on each, so a single frame
 *    dipping under the line does not chop a sentence into confetti.
 *  • MIN GAP / MIN CUE. Silence shorter than `minGap` never splits a cue; a burst shorter than
 *    `minCue` is discarded (door clicks, lip smacks).
 *  • TONE / ROOM-TONE REJECTION. Steady sound is rejected two ways: the adaptive floor already
 *    swallows it (a constant tone IS its own noise floor, so nothing clears floor+margin), and a
 *    segment whose energy AND zero-crossing rate are both dead flat is dropped. Speech is
 *    modulated at syllable rate; a hum, a fan and a sine are not.
 *  • DETERMINISTIC. No Math.random anywhere — the same buffer always gives the same cues.
 *  • NON-BLOCKING. The feature pass runs in chunks with a real yield between them, so a 20-minute
 *    clip never freezes the tab. `opts.chunkFrames` sets the chunk size; stats report the longest
 *    synchronous block actually measured.
 *
 * Decode with FM.decodeAudio(file, { rate: 8000 }) — 8 kHz is ample for VAD and decoding at the
 * device rate costs 439 MB for 20 minutes (see js/media.js).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const DEFAULTS = {
    frame: 0.025,        // s — analysis window
    hop: 0.010,          // s — window step (100 fps of features)
    minGap: 0.30,        // s of silence needed before one cue becomes two
    minCue: 0.35,        // s — shorter bursts are noise, not a caption
    maxCue: 6.0,         // s — longer runs are split at their quietest point
    pad: 0.08,           // s — speech onsets/offsets sit below the gate; give them back
    absFloorDb: -60,     // nothing quieter than this is ever speech (digital silence, dither)
    enterRun: 3,         // frames above `enter` before a cue opens (30 ms)
    // Frames per synchronous chunk before yielding (~15 s of audio). Measured on this desktop the
    // chunk costs ~4 ms; a phone is several times slower, so this keeps the worst hitch inside a
    // frame or two there too. Smaller = smoother, at ~1 yield per 15 s of audio in overhead.
    chunkFrames: 1500,
    onProgress: null,    // fn(0..1)
  };

  // A real yield to the event loop. MessageChannel is a macrotask like setTimeout but without the
  // ~4 ms clamp, so chunking costs ~nothing on a long clip.
  function yieldToUI() {
    return new Promise(resolve => {
      if (typeof MessageChannel === 'function') {
        const ch = new MessageChannel();
        ch.port1.onmessage = () => { ch.port1.close(); resolve(); };
        ch.port2.postMessage(0);
      } else setTimeout(resolve, 0);
    });
  }

  // Percentile of a Float32Array (sorted copy). p in 0..1.
  function pct(sortedArr, p) {
    if (!sortedArr.length) return 0;
    const i = Math.max(0, Math.min(sortedArr.length - 1, Math.round(p * (sortedArr.length - 1))));
    return sortedArr[i];
  }
  function stdOf(arr, from, to) {
    let n = 0, sum = 0;
    for (let i = from; i < to; i++) { const v = arr[i]; if (isFinite(v)) { sum += v; n++; } }
    if (n < 2) return 0;
    const mean = sum / n;
    let acc = 0;
    for (let i = from; i < to; i++) { const v = arr[i]; if (isFinite(v)) { const d = v - mean; acc += d * d; } }
    return Math.sqrt(acc / n);
  }

  /* Accepts an AudioBuffer, or any { sampleRate, getChannelData(ch) }, or { sampleRate, data }.
   * Mono-sums every channel so a voice panned to one side is not missed. */
  function channelsOf(buffer) {
    if (!buffer) return null;
    const rate = buffer.sampleRate;
    if (typeof buffer.getChannelData === 'function') {
      const n = buffer.numberOfChannels || 1, chans = [];
      for (let c = 0; c < n; c++) chans.push(buffer.getChannelData(c));
      return { rate: rate, chans: chans, length: buffer.length || chans[0].length };
    }
    if (buffer.data) return { rate: rate, chans: [buffer.data], length: buffer.data.length };
    return null;
  }

  /* ---- the detector -------------------------------------------------------
   * Returns { segments: [{start,end}], stats: {...} }. Async: it yields between chunks. */
  FM.detectSpeech = async function (buffer, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const src = channelsOf(buffer);
    if (!src || !src.length) return { segments: [], stats: { reason: 'no audio' } };

    const rate = src.rate, chans = src.chans, nCh = chans.length, total = src.length;
    const N = Math.max(8, Math.round(o.frame * rate));      // samples per frame
    const H = Math.max(1, Math.round(o.hop * rate));        // hop in samples
    const nFrames = Math.max(0, Math.floor((total - N) / H) + 1);
    if (nFrames < 4) return { segments: [], stats: { reason: 'too short', frames: nFrames } };

    const db = new Float32Array(nFrames);
    const zcr = new Float32Array(nFrames);
    let maxBlockMs = 0;

    // ---- pass 1: short-time energy + zero-crossing rate, chunked so the UI keeps breathing ----
    let f = 0;
    while (f < nFrames) {
      const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const stop = Math.min(nFrames, f + o.chunkFrames);
      for (; f < stop; f++) {
        const s0 = f * H, s1 = s0 + N;
        let sq = 0, cross = 0, prev = 0;
        for (let i = s0; i < s1; i++) {
          let v = 0;
          for (let c = 0; c < nCh; c++) v += chans[c][i];
          v /= nCh;
          sq += v * v;
          if (i > s0 && ((v >= 0) !== (prev >= 0))) cross++;
          prev = v;
        }
        const rms = Math.sqrt(sq / N);
        db[f] = 20 * Math.log10(rms + 1e-12);
        zcr[f] = cross / (N - 1);
      }
      const el = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
      if (el > maxBlockMs) maxBlockMs = el;
      if (o.onProgress) { try { o.onProgress(f / nFrames); } catch (e) {} }
      if (f < nFrames) await yieldToUI();
    }

    // ---- pass 2: thresholds from the clip's OWN statistics ----
    const sorted = Float32Array.from(db).sort();
    const floorDb = pct(sorted, 0.10);
    const loudDb = pct(sorted, 0.95);
    const range = Math.max(0, loudDb - floorDb);
    // Margin above the floor scales with how much dynamic range the clip actually has: a wide clip
    // (silence + speech) gets a decisive gate, a flat clip gets a gate nothing can clear.
    let enterDb = floorDb + Math.max(6, Math.min(18, range * 0.45));
    let exitDb = floorDb + Math.max(3, (enterDb - floorDb) * 0.55);
    if (enterDb < o.absFloorDb) enterDb = o.absFloorDb;
    if (exitDb < o.absFloorDb - 6) exitDb = o.absFloorDb - 6;

    const minGapFrames = Math.max(1, Math.round(o.minGap / o.hop));

    // ---- pass 3: hysteresis state machine ----
    const raw = [];
    let state = 0, run = 0, silRun = 0, segStartF = 0;
    for (let i = 0; i < nFrames; i++) {
      const above = db[i] > enterDb;
      if (!state) {
        if (above) { run++; if (run >= o.enterRun) { state = 1; segStartF = i - run + 1; silRun = 0; } }
        else run = 0;
      } else {
        if (db[i] < exitDb) {
          silRun++;
          if (silRun >= minGapFrames) { raw.push([segStartF, i - silRun + 1]); state = 0; run = 0; silRun = 0; }
        } else silRun = 0;
      }
    }
    if (state) raw.push([segStartF, nFrames]);

    let active = 0;
    for (const r of raw) active += (r[1] - r[0]);
    const activeFraction = nFrames ? active / nFrames : 0;

    // ---- pass 4: reject steady sound (tone, hum, fan) ----
    // Clip level: essentially everything "active" AND flat in both energy and ZCR = not speech.
    const clipDbStd = stdOf(db, 0, nFrames), clipZcrStd = stdOf(zcr, 0, nFrames);
    const stats = {
      frames: nFrames, rate: rate, floorDb: +floorDb.toFixed(2), loudDb: +loudDb.toFixed(2),
      enterDb: +enterDb.toFixed(2), exitDb: +exitDb.toFixed(2),
      activeFraction: +activeFraction.toFixed(3), clipDbStd: +clipDbStd.toFixed(2),
      clipZcrStd: +clipZcrStd.toFixed(4), maxBlockMs: +maxBlockMs.toFixed(1), rejected: 0,
    };
    if (activeFraction > 0.98 && clipDbStd < 2 && clipZcrStd < 0.02) {
      stats.reason = 'steady sound (no speech-like modulation)';
      return { segments: [], stats: stats };
    }

    // Segment level: a cue that is dead flat inside is a tone burst, not a phrase.
    const kept = [];
    for (const r of raw) {
      const dStd = stdOf(db, r[0], r[1]), zStd = stdOf(zcr, r[0], r[1]);
      if ((r[1] - r[0]) >= minGapFrames && dStd < 0.8 && zStd < 0.015) { stats.rejected++; continue; }
      kept.push(r);
    }

    // ---- pass 5: frames -> seconds, pad, merge, min length, split over-long ----
    const dur = total / rate;
    let segs = kept.map(r => ({
      start: Math.max(0, r[0] * o.hop - o.pad),
      end: Math.min(dur, (r[1] - 1) * o.hop + o.frame + o.pad),
    }));
    // padding can make neighbours touch — merge those back together
    const merged = [];
    for (const s of segs) {
      const last = merged[merged.length - 1];
      if (last && s.start <= last.end) { last.end = Math.max(last.end, s.end); } else merged.push(s);
    }
    segs = merged.filter(s => (s.end - s.start) >= o.minCue);

    // Split anything longer than maxCue at its quietest interior frame — deterministic, and it lands
    // the cut in a pause rather than mid-word.
    const out = [];
    for (const s of segs) {
      const stack = [s];
      while (stack.length) {
        const cur = stack.shift();
        if (cur.end - cur.start <= o.maxCue) { out.push(cur); continue; }
        const a = Math.round(cur.start / o.hop), b = Math.round(cur.end / o.hop);
        const guard = Math.round(o.minCue / o.hop);
        let best = -1, bestDb = Infinity;
        for (let i = a + guard; i < b - guard; i++) if (db[i] < bestDb) { bestDb = db[i]; best = i; }
        if (best < 0) { out.push(cur); continue; }
        const cut = best * o.hop;
        stack.unshift({ start: cut, end: cur.end });
        out.push({ start: cur.start, end: cut });
      }
    }
    out.sort((a, b) => a.start - b.start);
    stats.segments = out.length;
    return { segments: out.map(s => ({ start: +s.start.toFixed(3), end: +s.end.toFixed(3) })), stats: stats };
  };

  FM.vadDefaults = function () { return Object.assign({}, DEFAULTS); };
})(window.FM);
