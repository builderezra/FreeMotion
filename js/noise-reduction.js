/* FreeMotion — Reduce Noise: turns down the steady hiss, hum or room noise under a voice (#966 B24, refers to #545).
 *
 * PORTED BY HAND FROM THE CHATGPT PILE (d59b8cfd "Add on-device Reduce Noise audio tool") AND CORRECTED. What changed and why
 * is in tools/design/plans/pile-reducenoise/NOTES.md; the short version, each one a fault in the pile's build:
 *   · its gate was decided bin by bin and frame by frame with nothing smoothed, so the noise that stayed behind warbled
 *     ("musical noise"). Now the decision reads a neighbourhood (5 bins x 3 frames), the gain moves with an attack and a
 *     release and is smoothed across frequency, and the floor is exactly -Reduction dB;
 *   · its gate only reached the floor for noise well under the profile, so "Reduction 12 dB" took about 4 dB off at the
 *     defaults. Now the noise in the pauses drops by Amount x Reduction dB, which is what the two sliders say;
 *   · each stereo channel was gated on its own, so the noise jumped towards whichever side was talking. Now one gain per bin
 *     serves every channel (linked), and a centred sound stays centred;
 *   · Keep voice held EVERY frequency at -2.5 dB at most while anyone talked, so the noise under a voice was hardly touched.
 *     Now it protects the voice band only (80 Hz - 8 kHz) and only down to -6 dB; above the band, and in the pauses, the full
 *     reduction applies;
 *   · Reduction 0 went through the whole transform. Now Reduction 0 or Amount 0 hands the clip back sample for sample;
 *   · a clip with no speech, or nothing but speech, is now named in what he is told, and a clip whose speech could not be
 *     found at all learns from its quietest moments instead of failing;
 *   · two minutes of mono or stereo was the limit and the whole clip was transformed just to audition ten seconds. Now any
 *     channel count, five minutes, a progress line he can tap to stop, and Listen processes only what it plays;
 *   · the cleaned copy rides on Remove vocals' own link (karaokeOf), tagged twinKind 'denoise', so splitting, duplicating,
 *     importing, retiming and moving the clip carry it exactly as they carry a no-vocals track (the karaoke hardening the
 *     land list asks T05's twins for), and Apply is ONE undo step.
 *
 * HOW IT WORKS. A short-time Fourier transform: 1024-sample frames, a periodic Hann window, a hop of 256 (75 % overlap), the
 * same window again on the way back, divided by 1.5 — the sum of the squared window over four hops, which is exactly 1.5 at
 * every sample — so with every gain at 1 the clip comes back to within float rounding. The noise profile is the average power
 * per bin over the frames FM.detectSpeech (js/captions-vad.js) leaves outside speech, 50 ms clear of it. A bin whose power,
 * averaged over its neighbourhood, sits 3 + 12 x Sensitivity dB above the profile is kept; under that the gain falls over a
 * 6 dB knee to -Reduction dB. Amount scales the result in dB. Two real channels share one complex transform (left in the real
 * part, right in the imaginary), which is exact because the gain is real and the same for both.
 * Nothing here writes into the clip's own audio: every result is a new buffer.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const N = 1024, H = 256, BINS = N / 2 + 1;
  const OLA = 1.5;                       // the periodic Hann window squared, summed over the four frames on every sample
  const DEFAULTS = Object.freeze({ amount: 0.6, reduction: 12, sensitivity: 0.5, keepVoice: true });
  const KNEE_DB = 6;                     // the gate closes over 6 dB under its threshold, not at a cliff
  const VOICE_LO = 80, VOICE_HI = 8000;  // Hz: the band Keep voice protects
  const VOICE_CAP_DB = 6;                // …down to this much, and only while someone talks
  const ATTACK_S = 0.005, RELEASE_S = 0.06;
  const SPEECH_PAD_S = 0.05;             // a profile frame keeps this far from speech (the detector's edges are soft)
  const MIN_PROFILE = 16;                // frames (step 512): fewer clear of speech than this and the quietest moments are used
  const MAX_PROFILE = 400;               // frames actually transformed for the profile, spread evenly through those chosen
  const KEEP_FRACTION = 0.75;            // of the pauses, the quietest three quarters (a soft word the detector missed is out)
  const QUIET_FRACTION = 0.1;            // with no usable pauses: the quietest tenth of the whole clip
  const MAX_SECS = 300;                  // a phone holds the clip, the result and its WAV at once: five minutes of file at most
  const PREVIEW_SECS = 10, WARMUP_S = 0.5;
  const CHUNK = 128;                     // frames between pauses for the page (a progress tick, a chance to stop)

  // ---- the transform -----------------------------------------------------------------------------------------------------
  const WIN = new Float64Array(N), REV = new Uint16Array(N), COS = new Float64Array(N / 2), SIN = new Float64Array(N / 2);
  (function () {
    for (let i = 0; i < N; i++) WIN[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    const bits = Math.round(Math.log2(N));
    for (let i = 0; i < N; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); REV[i] = r; }
    for (let i = 0; i < N / 2; i++) { COS[i] = Math.cos(2 * Math.PI * i / N); SIN[i] = Math.sin(2 * Math.PI * i / N); }
  })();
  // In place, radix 2. Forward when `inv` is false; the inverse is NOT divided by N here (the overlap-add scale carries it).
  function fft(re, im, inv) {
    for (let i = 0; i < N; i++) {
      const j = REV[i];
      if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1, step = N / size;
      for (let start = 0; start < N; start += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const wr = COS[k], wi = inv ? SIN[k] : -SIN[k];
          const a = start + j, b = a + half;
          const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
  }
  function slotFor(pairs) {
    return { re: pairs.map(() => new Float64Array(N)), im: pairs.map(() => new Float64Array(N)), p5: new Float64Array(BINS) };
  }
  // Window and transform the frame starting at sample `s` of every channel (two to a transform), and leave in slot.p5 its
  // power per bin — the mean over channels (LINKED), averaged over five neighbouring bins. Outside the clip reads as silence.
  function analyse(chans, pairs, len, s, slot, scratch) {
    scratch.fill(0);
    for (let q = 0; q < pairs.length; q++) {
      const re = slot.re[q], im = slot.im[q], a = chans[pairs[q][0]], b = pairs[q][1] >= 0 ? chans[pairs[q][1]] : null;
      for (let i = 0; i < N; i++) {
        const n = s + i;
        if (n >= 0 && n < len) { re[i] = a[n] * WIN[i]; im[i] = b ? b[n] * WIN[i] : 0; }
        else { re[i] = 0; im[i] = 0; }
      }
      fft(re, im, false);
      if (b) {
        // X = (Z[k] + conj Z[N-k]) / 2 is the left's spectrum, Y = (Z[k] - conj Z[N-k]) / 2i the right's: |X|^2 + |Y|^2
        for (let k = 0; k < BINS; k++) {
          const kn = (N - k) & (N - 1);
          const xr = re[k] + re[kn], xi = im[k] - im[kn], yr = im[k] + im[kn], yi = re[kn] - re[k];
          scratch[k] += 0.25 * (xr * xr + xi * xi + yr * yr + yi * yi);
        }
      } else {
        for (let k = 0; k < BINS; k++) scratch[k] += re[k] * re[k] + im[k] * im[k];
      }
    }
    const nch = pairs.reduce((n, p) => n + (p[1] >= 0 ? 2 : 1), 0);
    for (let k = 0; k < BINS; k++) {
      let sum = 0, m = 0;
      for (let d = -2; d <= 2; d++) { const kk = k + d; if (kk >= 0 && kk < BINS) { sum += scratch[kk]; m++; } }
      slot.p5[k] = sum / m / nch;
    }
  }

  // ---- settings, buffers, speech ---------------------------------------------------------------------------------------
  function num(v, lo, hi, d) { v = +v; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
  function settle(o) {
    o = o || {};
    return {
      amount: num(o.amount, 0, 1, DEFAULTS.amount),
      reduction: num(o.reduction, 0, 30, DEFAULTS.reduction),
      sensitivity: num(o.sensitivity, 0, 1, DEFAULTS.sensitivity),
      keepVoice: o.keepVoice == null ? DEFAULTS.keepVoice : !!o.keepVoice,
    };
  }
  function makeBuffer(nch, len, sr) {
    len = Math.max(1, len | 0);
    try { if (typeof AudioBuffer === 'function') return new AudioBuffer({ numberOfChannels: nch, length: len, sampleRate: sr }); } catch (e) { /* older Safari: below */ }
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (OAC) { try { return new OAC(nch, len, sr).createBuffer(nch, len, sr); } catch (e) { /* below */ } }
    if (FM.audioCtx) return FM.audioCtx().createBuffer(nch, len, sr);
    throw new Error('this browser cannot make an audio buffer');
  }
  function abortError() { const e = new Error('Stopped'); e.name = 'AbortError'; return e; }
  function aborted(signal) { return !!(signal && signal.aborted); }
  function yieldUI() {
    return new Promise(resolve => {
      if (typeof MessageChannel === 'function') {
        const ch = new MessageChannel();
        ch.port1.onmessage = () => { ch.port1.close(); resolve(); };
        ch.port2.postMessage(0);
      } else setTimeout(resolve, 0);
    });
  }
  // FM.detectSpeech's { segments: [{start, end}] } (seconds) → sorted, merged [[s0, s1], …] in samples. null stays null: the
  // detector was not there or failed, which is not the same as "it found no speech" ([]).
  function speechSamples(speech, sr, len) {
    if (!speech || !Array.isArray(speech.segments)) return null;
    const raw = [];
    speech.segments.forEach(s => {
      if (!s) return;
      const a = Math.max(0, Math.round(+s.start * sr)), b = Math.min(len, Math.round(+s.end * sr));
      if (Number.isFinite(a) && Number.isFinite(b) && b > a) raw.push([a, b]);
    });
    raw.sort((x, y) => x[0] - y[0]);
    const out = [];
    raw.forEach(r => { const l = out[out.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else out.push(r.slice()); });
    return out;
  }
  async function detect(buffer) {
    try {
      const r = FM.detectSpeech ? await FM.detectSpeech(buffer) : null;
      return r && Array.isArray(r.segments) ? r : null;
    } catch (e) { return null; }
  }

  /* THE NOISE PROFILE: what "noise" is, per bin. From the frames clear of speech ('pauses'); with no speech found, from the
     whole clip ('no-speech') — on a clip that is all hiss that is right, on music it is not, and he is told which happened;
     with too few pauses (all speech, or a clip under a fifth of a second), or no detector, from the quietest tenth of the clip
     ('quietest'). Ranked by energy so a soft word the detector missed stays out of it. */
  function buildProfile(chans, pairs, nch, len, sr, segs) {
    const starts = [];
    for (let s = 0, last = Math.max(0, len - N); s <= last; s += N / 2) starts.push(s);
    const energy = s => {
      let e = 0;
      for (let c = 0; c < nch; c++) { const d = chans[c]; for (let i = s, z = Math.min(len, s + N); i < z; i++) e += d[i] * d[i]; }
      return e;
    };
    let from = segs === null ? 'quietest' : (segs.length ? 'pauses' : 'no-speech');
    let pool = [], keep = KEEP_FRACTION;
    if (segs !== null) {
      const pad = Math.round(SPEECH_PAD_S * sr);
      let p = 0;
      for (const s of starts) {
        const a = s - pad, b = s + N + pad;
        while (p < segs.length && segs[p][1] <= a) p++;
        if (!(p < segs.length && segs[p][0] < b)) pool.push(s);
      }
    }
    if (pool.length < MIN_PROFILE) { pool = starts; keep = QUIET_FRACTION; from = 'quietest'; }
    const ranked = pool.map(s => [energy(s), s]).sort((x, y) => x[0] - y[0]);
    const n = Math.min(ranked.length, Math.max(Math.min(MIN_PROFILE, ranked.length), Math.ceil(ranked.length * keep)));
    const chosen = ranked.slice(0, n);
    const use = chosen.length <= MAX_PROFILE ? chosen
      : Array.from({ length: MAX_PROFILE }, (_, i) => chosen[Math.floor(i * chosen.length / MAX_PROFILE)]);
    const slot = slotFor(pairs), scratch = new Float64Array(BINS), power = new Float64Array(BINS);
    for (const pick of use) {
      analyse(chans, pairs, len, pick[1], slot, scratch);
      for (let k = 0; k < BINS; k++) power[k] += slot.p5[k];
    }
    for (let k = 0; k < BINS; k++) power[k] /= Math.max(1, use.length);
    return { power: power, from: from, frames: use.length };
  }

  /* FM.reduceNoiseBuffer(buffer, options) → a NEW AudioBuffer, the cleaned sound (or, with listenRemoved, the clip minus it).
   * options: amount 0–1 (0.6) · reduction 0–30 dB (12) · sensitivity 0–1 (0.5) · keepVoice (true) · listenRemoved ·
   *   speech: FM.detectSpeech's answer (left out, it is asked here; null means "unknown" and the quietest moments are used) ·
   *   range: [from, to) in samples — only that stretch comes back (Listen), with half a second before it run to settle the
   *   gate · signal: { aborted } (an AbortSignal) — checked between chunks, rejects with an AbortError · onProgress(0..1) ·
   *   info: an object this fills — profileFrom ('pauses' | 'no-speech' | 'quietest' | 'none'), profileFrames, untouched. */
  FM.reduceNoiseBuffer = async function (input, options) {
    if (!input || !(input.length > 0) || typeof input.getChannelData !== 'function') throw new Error('This clip has no audio to clean');
    options = options || {};
    const o = settle(options);
    const info = options.info && typeof options.info === 'object' ? options.info : {};
    const signal = options.signal, onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const listenRemoved = !!options.listenRemoved;
    const sr = input.sampleRate, nch = Math.max(1, input.numberOfChannels | 0), len = input.length;
    const rg = Array.isArray(options.range) ? options.range : [0, len];
    const r0 = Math.max(0, Math.min(len, Math.floor(+rg[0] || 0)));
    const r1 = Math.max(r0, Math.min(len, Math.floor(rg[1] == null ? len : +rg[1])));
    const out = makeBuffer(nch, r1 - r0, sr);
    const chans = [], outCh = [];
    for (let c = 0; c < nch; c++) { chans.push(input.getChannelData(c)); outCh.push(out.getChannelData(c)); }
    if (aborted(signal)) throw abortError();
    /* NOTHING TO TAKE AWAY: Reduction 0 or Amount 0 is the clip itself, sample for sample — copied, never sent through the
       transform (which would hand it back only to within rounding). Listen to removed noise is then silence. */
    if (!(o.reduction > 0) || !(o.amount > 0) || r1 <= r0) {
      if (!listenRemoved) for (let c = 0; c < nch; c++) outCh[c].set(chans[c].subarray(r0, r1));
      info.profileFrom = 'none'; info.profileFrames = 0; info.untouched = true;
      if (onProgress) onProgress(1);
      return out;
    }
    const speech = ('speech' in options) ? options.speech : await detect(input);
    if (aborted(signal)) throw abortError();
    const segs = speechSamples(speech, sr, len);
    const pairs = [];
    for (let c = 0; c < nch; c += 2) pairs.push([c, c + 1 < nch ? c + 1 : -1]);
    const prof = buildProfile(chans, pairs, nch, len, sr, segs);
    info.profileFrom = prof.from; info.profileFrames = prof.frames; info.untouched = false;
    info.speechSegments = segs ? segs.length : null;

    const R = o.reduction, cap = Math.min(R, VOICE_CAP_DB), amt = o.amount;
    const thr = Math.pow(10, (3 + 12 * o.sensitivity) / 10);
    const ref = new Float64Array(BINS);
    for (let k = 0; k < BINS; k++) ref[k] = prof.power[k] * thr;
    const kLo = Math.max(0, Math.ceil(VOICE_LO * N / sr)), kHi = Math.min(N / 2, Math.floor(VOICE_HI * N / sr));
    const aA = 1 - Math.exp(-H / (sr * ATTACK_S)), aR = 1 - Math.exp(-H / (sr * RELEASE_S));
    const floorLin = Math.pow(10, -amt * R / 20);
    const gS = new Float64Array(BINS), lin = new Float64Array(BINS), scratch = new Float64Array(BINS);
    const acc = chans.map(() => new Float64Array(N));
    const ring = [slotFor(pairs), slotFor(pairs), slotFor(pairs)];
    /* The first frame starts N - H before the first sample, so every sample is under four frames. Listen's stretch starts
       half a second early ON THE SAME FRAME GRID as the whole clip, so the gate it hears is the gate Apply makes: the same
       frames decide every gain, and the smoothing has settled (to a few thousandths of a dB) by the time the stretch begins. */
    const g0 = r0 > 0 ? Math.max(0, Math.floor((r0 - Math.round(WARMUP_S * sr)) / H) * H) : 0;
    const sStart = g0 - (N - H);
    const count = Math.floor((r1 - 1 - sStart) / H) + 1;
    const scale = 1 / (N * OLA);
    let sp = 0, first = true;
    const talking = n => {
      if (!segs) return false;
      while (sp < segs.length && segs[sp][1] <= n) sp++;
      return sp < segs.length && segs[sp][0] <= n;
    };
    // One frame of look-ahead: frame t is decided once frame t + 1 has been analysed, from the three of them together.
    for (let j = 0; j <= count; j++) {
      if (j < count) analyse(chans, pairs, len, sStart + j * H, ring[j % 3], scratch);
      const t = j - 1;
      if (t < 0) continue;
      const cur = ring[t % 3], prev = t > 0 ? ring[(t - 1) % 3] : null, next = t + 1 < count ? ring[(t + 1) % 3] : null;
      const s = sStart + t * H;
      const protect = o.keepVoice && talking(s + N / 2);
      for (let k = 0; k < BINS; k++) {
        let d = cur.p5[k], m = 1;
        if (prev) { d += prev.p5[k]; m++; }
        if (next) { d += next.p5[k]; m++; }
        d /= m;
        let gt = 0;
        if (ref[k] > 0) {
          const db = 10 * Math.log10(d / ref[k] + 1e-30);
          gt = db >= 0 ? 0 : (db <= -KNEE_DB ? -R : R * db / KNEE_DB);
        }
        if (protect && k >= kLo && k <= kHi && gt < -cap) gt = -cap;
        if (first) gS[k] = gt;
        else { const g0 = gS[k]; gS[k] = g0 + (gt - g0) * (gt > g0 ? aA : aR); }
      }
      first = false;
      for (let k = 0; k < BINS; k++) {
        const g = 0.25 * gS[k > 0 ? k - 1 : k] + 0.5 * gS[k] + 0.25 * gS[k < BINS - 1 ? k + 1 : k];
        lin[k] = g === 0 ? 1 : (g === -R ? floorLin : Math.pow(10, amt * g / 20));
      }
      for (let q = 0; q < pairs.length; q++) {
        const re = cur.re[q], im = cur.im[q];
        re[0] *= lin[0]; im[0] *= lin[0];
        re[N / 2] *= lin[N / 2]; im[N / 2] *= lin[N / 2];
        for (let k = 1; k < N / 2; k++) { const g = lin[k]; re[k] *= g; im[k] *= g; re[N - k] *= g; im[N - k] *= g; }
        fft(re, im, true);
        const A = acc[pairs[q][0]], B = pairs[q][1] >= 0 ? acc[pairs[q][1]] : null;
        for (let i = 0; i < N; i++) { const w = WIN[i] * scale; A[i] += re[i] * w; if (B) B[i] += im[i] * w; }
      }
      // Samples [s, s + H) are finished: no later frame starts before s + H.
      for (let c = 0; c < nch; c++) {
        const A = acc[c], src = chans[c], dst = outCh[c];
        for (let i = 0; i < H; i++) {
          const n = s + i;
          if (n >= r0 && n < r1) dst[n - r0] = listenRemoved ? src[n] - A[i] : A[i];
        }
        A.copyWithin(0, H);
        A.fill(0, N - H);
      }
      if (t % CHUNK === CHUNK - 1 || t === count - 1) {
        if (onProgress) onProgress((t + 1) / count);
        if (t < count - 1) {
          if (aborted(signal)) throw abortError();
          await yieldUI();
          if (aborted(signal)) throw abortError();
        }
      }
    }
    return out;
  };

  // ---- the clip-level tool (the Volume card) ---------------------------------------------------------------------------
  /* ONE LINK FOR BOTH TWINS. The cleaned copy is tagged exactly like a Remove vocals track — karaokeOf: <the clip's id> — plus
     twinKind: 'denoise'. Every place that already carries a no-vocals track (split, duplicate, import, the history's retime
     sync, the magnetic timeline) carries this one too, with no second list to drift. A clip has one of the two at a time. */
  function isTwin(l) { return !!(l && l.karaokeOf && l.twinKind === 'denoise'); }
  function twinOf(layer) {
    if (!layer || !FM.scene || !Array.isArray(FM.scene.layers)) return null;
    return FM.scene.layers.find(l => isTwin(l) && l.karaokeOf === layer.id) || null;
  }
  function sourceOf(layer) { return isTwin(layer) ? (FM.layerById ? FM.layerById(FM.scene, layer.karaokeOf) : null) : layer; }
  /* 'off' · 'on' (this clip plays its cleaned copy) · 'twin' (this IS the cleaned copy) · 'blocked' (Remove vocals is on it) */
  function state(layer) {
    if (!layer) return 'off';
    if (isTwin(layer)) return 'twin';
    if (twinOf(layer)) return 'on';
    if (layer.karaokeOf || (FM.karaokeTwinOf && FM.karaokeTwinOf(layer))) return 'blocked';
    return 'off';
  }

  const settingsBy = new Map();    // clip id → what the card's sliders say, this session (nothing is written to his project until Apply)
  const openBy = new Set();        // clips whose settings are showing, so a redraw of the card keeps them open
  const listeners = new Set();
  let job = null;                  // { layerId, progress, controller } while Apply runs — one at a time, app-wide
  let preview = null;              // { layerId, node } while Listen plays (or is being made)
  function notify() {
    listeners.forEach(fn => { let keep = false; try { keep = fn() !== false; } catch (e) { keep = false; } if (!keep) listeners.delete(fn); });
  }
  function settingsFor(layer) {
    const id = layer && layer.id;
    if (!settingsBy.has(id)) settingsBy.set(id, Object.assign({}, DEFAULTS));
    return settingsBy.get(id);
  }

  /* THE SPEECH FOUND IN A FILE IS KEPT ON ITS MEDIA RECORD, for that file — so Listen and Apply learn from the same pauses —
     and ONLY A REAL ANSWER IS KEPT (the Loudness Match port's rule): a detector that failed or was missing leaves nothing
     behind, so the next press asks again. One that is running is shared, and dropped when it settles. */
  function speechFor(rec, buffer) {
    const file = rec ? rec.file : undefined;
    if (rec && rec._nrSpeech && rec._nrSpeech.file === file) return Promise.resolve(rec._nrSpeech.result);
    if (rec && rec._nrSpeechP && rec._nrSpeechP.file === file) return rec._nrSpeechP.p;
    const p = detect(buffer);
    if (!rec) return p;
    const entry = { file: file, p: p };
    rec._nrSpeechP = entry;
    p.then(r => {
      if (rec._nrSpeechP === entry) rec._nrSpeechP = null;
      if (r && rec.file === file) rec._nrSpeech = { file: file, result: r };
    });
    return p;
  }

  async function decodedOf(layer) {
    if (FM.layerAudioBuffer) return FM.layerAudioBuffer(layer);
    const m = layer && FM.media && FM.media.get(layer.id);
    if (!m) return null;
    if (m.audioBuffer !== undefined) return m.audioBuffer || null;
    return m.file && FM.decodeAudio ? ((await FM.decodeAudio(m.file)) || null) : null;
  }
  function safeName(s) { return String(s || 'audio').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'audio'; }
  function say(msg, ms, onTap) { if (FM.toast) FM.toast(msg, ms, onTap); }
  function clock(n) { n = Math.round(n); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); }

  function restore(layer) {
    if (!layer || !FM.scene) return false;
    const srcId = isTwin(layer) ? layer.karaokeOf : layer.id;
    const twins = FM.scene.layers.filter(l => isTwin(l) && l.karaokeOf === srcId);
    if (!twins.length) return false;
    stopPreview();
    const wasMuted = !!twins[0].twinSourceWasMuted;
    // deleteLayer commits on its own: held, so putting the original back is one undo step like adding the copy was
    if (FM.history && FM.history.mute) FM.history.mute();
    try { twins.forEach(t => { if (FM.deleteLayer) FM.deleteLayer(t.id); }); }
    finally { if (FM.history && FM.history.unmute) FM.history.unmute(); }
    const src = FM.layerById ? FM.layerById(FM.scene, srcId) : null;
    if (src) { src.muted = wasMuted; FM.scene.selectedId = src.id; FM.scene.selectedIds = [src.id]; }
    if (FM.refreshAll) FM.refreshAll();
    if (FM.history) FM.history.commit();
    say('Original sound back');
    return true;
  }

  async function apply(layer, settings) {
    if (!layer || !FM.scene) return false;
    const st = state(layer);
    if (st === 'on' || st === 'twin') return restore(layer);
    if (st === 'blocked') { say('Turn Remove vocals off first — a clip can have Remove vocals or Reduce noise, not both', 4000); return false; }
    if (job) { say('Still reducing noise on another clip — wait for it, or tap the message to stop it', 3000); return false; }
    const m = FM.media && FM.media.get(layer.id);
    if (!m) { say('This clip has no audio'); return false; }
    if (m.duration > MAX_SECS) { say('Reduce noise works on files up to ' + clock(MAX_SECS) + ' long — this one is ' + clock(m.duration), 4500); return false; }
    stopPreview();
    const opts = settle(settings);
    const controller = typeof AbortController === 'function' ? new AbortController()
      : { signal: { aborted: false }, abort() { this.signal.aborted = true; } };
    const me = job = { layerId: layer.id, progress: 0, controller: controller };
    notify();
    const pressedIn = FM.startedIn ? FM.startedIn() : null;
    const left = () => !!FM.stillIn && !FM.stillIn(pressedIn);
    let shown = -1;
    const stop = () => { controller.abort(); };
    const progress = f => {
      me.progress = f;
      const pct = Math.floor(f * 100);
      if (pct !== shown) { shown = pct; say('Reducing noise… ' + pct + '% — tap to stop', 0, stop); notify(); }
    };
    try {
      say('Reducing noise… — tap to stop', 0, stop);
      const ab = await decodedOf(layer);
      if (controller.signal.aborted) throw abortError();
      if (!ab) { say('This clip has no audio'); return false; }
      if (ab.duration > MAX_SECS) { say('Reduce noise works on files up to ' + clock(MAX_SECS) + ' long — this one is ' + clock(ab.duration), 4500); return false; }
      const speech = await speechFor(m, ab);
      const info = {};
      const cleaned = await FM.reduceNoiseBuffer(ab, Object.assign({}, opts, { speech: speech, signal: controller.signal, onProgress: progress, info: info }));
      const file = new File([FM.audioBufferToWav(cleaned)], safeName(layer.name) + ' (noise reduced).wav', { type: 'audio/wav' });
      let rec = null;
      try { rec = await FM.loadVideoFile(file); } catch (e) { rec = null; }
      if (!rec) { say('Could not add the cleaned sound', 4000); return false; }
      /* The project he pressed it in, the clip itself and its twins may all have changed while this ran (seconds on a long
         clip): the copy lands only where it still makes sense, and he is told when it does not. */
      const drop = msg => { if (FM.letGoMedia) FM.letGoMedia(rec); say(msg, 4500); return false; };
      if (left()) return drop('Not added — you switched projects while the noise was being reduced');
      const src = FM.layerById ? FM.layerById(FM.scene, layer.id) : layer;
      if (!src) return drop('Not added — the clip was deleted while its noise was being reduced');
      if (state(src) !== 'off') return drop('Not added — the clip changed while its noise was being reduced');
      // addMediaLayer commits on its own: held, so Apply is ONE undo step (the copy and the clip's mute together)
      if (FM.history && FM.history.mute) FM.history.mute();
      let nl = null;
      try { FM.addMediaLayer(rec); nl = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null; }
      finally { if (FM.history && FM.history.unmute) FM.history.unmute(); }
      if (!nl || nl === src || (FM.media && FM.media.get(nl.id) !== rec)) { if (FM.refreshAll) FM.refreshAll(); return drop('Could not add the cleaned sound'); }
      nl.name = (src.name || 'Audio') + ' (noise reduced)';
      nl.karaokeOf = src.id;
      nl.twinKind = 'denoise';
      nl.denoise = { amount: opts.amount, reduction: opts.reduction, sensitivity: opts.sensitivity, keepVoice: opts.keepVoice };
      nl.twinSourceWasMuted = !!src.muted;
      // The WAV is the WHOLE file, so the copy shares the clip's clock (trim, speed, reverse) and its mix (volume, fades,
      // audio effects) — the same list Remove vocals copies — and plays exactly where the clip's own sound did.
      nl.start = src.start; nl.duration = src.duration;
      nl.trimStart = src.trimStart || 0;
      nl.reversed = !!src.reversed;
      nl.speed = FM.isAnimated && FM.isAnimated(src.speed) ? JSON.parse(JSON.stringify(src.speed)) : (src.speed == null ? 1 : src.speed);
      nl.volume = FM.isAnimated && FM.isAnimated(src.volume) ? JSON.parse(JSON.stringify(src.volume)) : (src.volume == null ? 1 : src.volume);
      nl.fadeIn = src.fadeIn || 0;
      nl.fadeOut = src.fadeOut || 0;
      /* bughunt3 #3: …with the span a split half's fades are measured over, or the copy's fade would start at its own edge. */
      if (src.fadeInLead != null) nl.fadeInLead = src.fadeInLead;
      if (src.fadeOutTail != null) nl.fadeOutTail = src.fadeOutTail;
      if (Array.isArray(src.audioFx) && src.audioFx.length) nl.audioFx = JSON.parse(JSON.stringify(src.audioFx, FM.jsonReplacer));
      nl.muted = !!src.muted;
      if (src.visible === false) nl.visible = false;
      if (nl.transform) nl.transform.opacity = 0;
      src.muted = true;
      FM.scene.selectedId = src.id; FM.scene.selectedIds = [src.id];   // he stays on the clip he was working on
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.commit();
      if (FM.hideToast) FM.hideToast();
      say(info.profileFrom === 'no-speech' ? 'No voice found, so the whole clip was treated as noise — press Restore original audio if that took too much'
        : info.profileFrom === 'quietest' ? 'No clear pauses between words — the noise was learned from the quietest moments. Restore original audio undoes it'
        : 'Noise reduced — Restore original audio puts it back', 4500);
      return true;
    } catch (e) {
      if (FM.hideToast) FM.hideToast();
      if (e && e.name === 'AbortError') say('Stopped — nothing was changed');
      else say('Could not reduce the noise: ' + (e && e.message || e), 4500);
      return false;
    } finally {
      if (job === me) job = null;
      notify();
    }
  }

  function toggle(layer, settings) {
    const st = state(layer);
    return (st === 'on' || st === 'twin') ? Promise.resolve(restore(layer)) : apply(layer, settings);
  }
  function cancel() { if (job) job.controller.abort(); }

  // Where in the file the playhead is, for this clip (its trim, speed and direction); the clip's start when it is elsewhere.
  function fileSecondsAtPlayhead(layer) {
    const dur = layer.duration || 0, into = Math.max(0, Math.min(dur, (FM.time || 0) - (layer.start || 0)));
    const adv = x => { try { return FM.layerSourceAdvance ? FM.layerSourceAdvance(layer, x) : x; } catch (e) { return x; } };
    const trim = layer.trimStart || 0;
    const t = layer.reversed ? trim + adv(dur) - adv(into) : trim + adv(into);
    return Number.isFinite(t) ? t : trim;
  }

  /* LISTEN TO REMOVED NOISE: ten seconds from the playhead of exactly what Apply would take away (the clip minus the cleaned
     sound), worked out for those ten seconds only. The sound context is made inside his tap — iOS will not start it later. */
  async function previewRemoved(layer, settings) {
    const src = sourceOf(layer);
    if (!src) return;
    if (preview) { stopPreview(); return; }
    if (job) { say('Wait for the noise reduction to finish', 2500); return; }
    const ctx = FM.audioCtx ? FM.audioCtx() : null;
    if (!ctx) throw new Error('sound is not available here');
    const me = preview = { layerId: src.id, node: null };
    notify();
    try {
      const ab = await decodedOf(src);
      if (preview !== me) return;
      if (!ab) { say('This clip has no audio'); return; }
      const speech = await speechFor(FM.media && FM.media.get(src.id), ab);
      if (preview !== me) return;
      const want = Math.round(PREVIEW_SECS * ab.sampleRate);
      let from = Math.max(0, Math.min(ab.length - 1, Math.round(fileSecondsAtPlayhead(src) * ab.sampleRate)));
      if (ab.length - from < want) from = Math.max(0, ab.length - want);
      const removed = await FM.reduceNoiseBuffer(ab, Object.assign({}, settle(settings), { speech: speech, listenRemoved: true, range: [from, from + want] }));
      if (preview !== me) return;
      const node = ctx.createBufferSource();
      node.buffer = removed;
      node.connect(ctx.destination);
      node.onended = () => { if (preview === me) { preview = null; notify(); } };
      me.node = node;
      node.start();
      notify();
    } catch (e) {
      if (preview === me) { preview = null; notify(); }
      throw e;
    }
  }
  function stopPreview() {
    const p = preview;
    preview = null;
    if (p && p.node) { try { p.node.stop(); } catch (e) { /* already ended */ } }
    if (p) notify();
  }
  function previewing(layer) { const s = layer ? sourceOf(layer) : null; return !!(preview && (!layer || (s && preview.layerId === s.id))); }

  FM.noiseReduction = {
    defaults: () => Object.assign({}, DEFAULTS),
    settle: settle,
    state: state,
    twinOf: twinOf,
    isTwin: isTwin,
    sourceOf: sourceOf,
    settingsFor: settingsFor,
    isOpen: layer => !!(layer && openBy.has(layer.id)),
    setOpen: (layer, on) => { if (layer) { if (on) openBy.add(layer.id); else openBy.delete(layer.id); } },
    speechFor: speechFor,
    apply: apply,
    restore: restore,
    toggle: toggle,
    cancel: cancel,
    job: () => job,
    preview: previewRemoved,
    stopPreview: stopPreview,
    previewing: previewing,
    listen: fn => { if (typeof fn === 'function') listeners.add(fn); },
    MAX_SECS: MAX_SECS,
    VOICE_CAP_DB: VOICE_CAP_DB,
  };
})(window.FM);
