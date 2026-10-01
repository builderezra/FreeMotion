/* #482 polish batch 3 (tone: 3.5 Pitch Shift, 3.6 Bass & Treble / 3-Band EQ corners) — the SAMPLE-EXACT proof.
 * Audio has no `legacy`: storage.js's sanitizeAudioFx fills a missing key with its def, so every new key's def has to
 * reproduce the sound a saved project already makes, sample for sample. This renders every effect this batch touches
 * through the app's own FM.buildAudioFxChain in an OfflineAudioContext — the export path (schedule) AND the preview's
 * per-frame path (applyAt) — on noise, a sine sweep and an impulse, with the params a project saved BEFORE the new
 * keys existed would carry. Run it against a server of the old tree and of the new one (samecheck.py) and compare:
 * identical means every Float32 sample is bit-for-bit the same, not close.
 * Returns { name: { h: '<fnv hash of both channels>', b64: '<the raw float32 samples>' } }. */
(async () => {
  const SR = 48000, SECS = 1.5, N = Math.round(SR * SECS);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const SIG = {
    noise: (ch) => { const r = rng(17 + ch * 101); return () => (r() * 2 - 1) * 0.7; },
    sweep: (ch) => { let i = 0; return () => { const t = i++ / SR; const f0 = 20, f1 = 20000, T = SECS; const k = Math.log(f1 / f0) / T; return 0.8 * Math.sin(2 * Math.PI * f0 * (Math.exp(k * t) - 1) / k + ch * 0.3); }; },
    impulse: (ch) => { let i = 0; return () => (i++ === 200 + ch * 7 ? 1 : 0); },
  };
  const kfUp = { kf: [{ t: 0, v: 0 }, { t: SECS, v: 12 }] };
  // Params a project saved on v17.19 carries — no new key anywhere.
  const CASES = {
    bt_default: [{ type: 'bassTreble', enabled: true, params: { bass: 0, treble: 0 } }],
    bt_set: [{ type: 'bassTreble', enabled: true, params: { bass: 9, treble: -6 } }],
    bt_kf: [{ type: 'bassTreble', enabled: true, params: { bass: { kf: [{ t: 0, v: -12 }, { t: SECS, v: 12 }] }, treble: 4 } }],
    eq_default: [{ type: 'eq3', enabled: true, params: { low: 0, mid: 0, high: 0, midFreq: 1000 } }],
    eq_set: [{ type: 'eq3', enabled: true, params: { low: 6, mid: -8, high: 5, midFreq: 2500 } }],
    eq_kf: [{ type: 'eq3', enabled: true, params: { low: -3, mid: { kf: [{ t: 0, v: -12 }, { t: SECS, v: 12 }] }, high: 3, midFreq: { kf: [{ t: 0, v: 300 }, { t: SECS, v: 5000 }] } } }],
    pitch_default: [{ type: 'pitch', enabled: true, params: { semitones: 0, mix: 1 } }],
    pitch_up7: [{ type: 'pitch', enabled: true, params: { semitones: 7, mix: 1 } }],
    pitch_up12: [{ type: 'pitch', enabled: true, params: { semitones: 12, mix: 1 } }],
    pitch_dn5_mix: [{ type: 'pitch', enabled: true, params: { semitones: -5, mix: 0.5 } }],
    pitch_dn12: [{ type: 'pitch', enabled: true, params: { semitones: -12, mix: 1 } }],
    pitch_kf: [{ type: 'pitch', enabled: true, params: { semitones: kfUp, mix: 1 } }],
    // a chain of all three, as a clip would carry them
    chain: [{ type: 'bassTreble', enabled: true, params: { bass: 4, treble: 2 } }, { type: 'pitch', enabled: true, params: { semitones: 3, mix: 0.8 } }, { type: 'eq3', enabled: true, params: { low: -2, mid: 3, high: 1, midFreq: 800 } }],
  };
  function hash(f32s) {
    let h = 0x811c9dc5 >>> 0;
    f32s.forEach(f => { const u = new Uint32Array(f.buffer, f.byteOffset, f.length); for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619) >>> 0; } });
    return h.toString(16);
  }
  function b64(f32s) {
    const tot = f32s.reduce((a, f) => a + f.byteLength, 0), u8 = new Uint8Array(tot);
    let o = 0; f32s.forEach(f => { u8.set(new Uint8Array(f.buffer, f.byteOffset, f.byteLength), o); o += f.byteLength; });
    let s = ''; const CH = 0x8000; for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return btoa(s);
  }
  async function render(fx, sigName, live) {
    const oac = new OfflineAudioContext(2, N, SR);
    const b = oac.createBuffer(2, N, SR);
    for (let ch = 0; ch < 2; ch++) { const g = SIG[sigName](ch), d = b.getChannelData(ch); for (let i = 0; i < N; i++) d[i] = g(); }
    const src = oac.createBufferSource(); src.buffer = b;
    // the params go through the sanitiser exactly as a loaded project's would
    const layers = [{ type: 'video', audioFx: JSON.parse(JSON.stringify(fx)) }];
    FM.storage._sanitizeLayers(layers);
    const chain = FM.buildAudioFxChain(oac, { audioFx: layers[0].audioFx }, 0);
    if (live) chain.applyAt(0); else chain.schedule(0, SECS);
    src.connect(chain.input); chain.output.connect(oac.destination); src.start(0);
    const r = await oac.startRendering();
    try { chain.dispose(); } catch (e) {}
    return [r.getChannelData(0), r.getChannelData(1)];
  }
  const out = {};
  for (const name of Object.keys(CASES)) {
    for (const sig of Object.keys(SIG)) {
      for (const live of [false, true]) {
        const f = await render(CASES[name], sig, live);
        out[name + '|' + sig + '|' + (live ? 'live' : 'export')] = { h: hash(f), b64: b64(f) };
      }
    }
  }
  return out;
})()
