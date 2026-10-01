/* #482 polish 3.7 / 3.8 — PROOF THAT THE DEFAULTS ARE TODAY'S SOUND, SAMPLE FOR SAMPLE.
   Runs INSIDE the app (exact-defaults.py injects it, with the base commit's js/audio-fx.js as OLD_SRC).
   Audio has no `legacy`: the sanitiser fills a missing key with its def, so a Compressor or Limiter saved before
   Output / Mix / Input gain / Release existed opens WITH them at their defaults — and must sound exactly as it did.
   So: the base commit's audio-fx.js is evaluated into its own FM (OLD), and each effect is rendered through
   OLD.buildAudioFxChain with the instance as it was saved, and through today's FM.buildAudioFxChain with that same
   instance read back through today's sanitiser (FM.storage._sanitizeLayers) — on white noise, a sine sweep and an
   impulse train, mono and stereo, through the export path (schedule) and the preview path (applyAt) — and every
   sample is compared. Identical means === on every sample, not "close". */
return (async function (OLD_SRC) {
  const OLD = Object.create(FM);   // the old file assigns onto its own FM; reads (isAnimated, evalProp…) fall through
  new Function('OLDFM', OLD_SRC.replace(/\}\)\(window\.FM\);\s*$/, '})(OLDFM);'))(OLD);
  if (!OLD.buildAudioFxChain || OLD.buildAudioFxChain === FM.buildAudioFxChain) throw new Error('the old audio-fx.js did not load into its own FM');
  const SR = 48000, SECS = 1.5, N = Math.round(SR * SECS);
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296 * 2 - 1; };
  const SIGNALS = {
    noise: () => { seed = 777; const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = 0.9 * rnd(); return a; },
    sweep: () => { const a = new Float32Array(N); for (let i = 0; i < N; i++) { const t = i / SR; a[i] = 0.95 * Math.sin(2 * Math.PI * (20 * t + (8000 - 20) * t * t / (2 * SECS))); } return a; },
    impulses: () => { const a = new Float32Array(N); for (let i = 0; i < N; i += 4800) a[i] = 1; for (let i = 2400; i < N; i += 9600) a[i] = -0.6; return a; },
  };
  async function render(builder, inst, sig, chans, live) {
    const oac = new OfflineAudioContext(chans, N, SR);
    const b = oac.createBuffer(chans, N, SR);
    for (let c = 0; c < chans; c++) { const d = b.getChannelData(c), s = sig(); for (let i = 0; i < N; i++) d[i] = c ? s[(i + 1234) % N] * 0.7 : s[i]; }
    const src = oac.createBufferSource(); src.buffer = b;
    const chain = builder(oac, { audioFx: [inst] }, 0);
    if (live) chain.applyAt(0); else chain.schedule(0, SECS);
    src.connect(chain.input); chain.output.connect(oac.destination); src.start(0);
    const r = await oac.startRendering();
    const out = []; for (let c = 0; c < chans; c++) out.push(r.getChannelData(c)); return out;
  }
  const clone = o => JSON.parse(JSON.stringify(o));
  // What each effect looked like SAVED before this build: the old registry's own new instance, and some tuned ones.
  const CASES = [
    ['compressor', 'a new Compressor as saved', OLD.audioFxRegistry.makeInstance('compressor')],
    ['compressor', 'a squashing Compressor (-40 dB, 12:1, fast, knee 6)', { type: 'compressor', enabled: true, params: { threshold: -40, ratio: 12, attack: 0.002, release: 0.1, knee: 6 } }],
    ['compressor', 'a Compressor saved before Knee existed', { type: 'compressor', enabled: true, params: { threshold: -24, ratio: 4, attack: 0.01, release: 0.25 } }],
    ['compressor', 'a Compressor with a keyframed Threshold', { type: 'compressor', enabled: true, params: { threshold: { kf: [{ t: 0, v: -10 }, { t: 1.2, v: -50 }] }, ratio: 6, attack: 0.01, release: 0.25, knee: 30 } }],
    ['limiter', 'a new Limiter as saved', OLD.audioFxRegistry.makeInstance('limiter')],
    ['limiter', 'a Limiter at a -12 dB ceiling', { type: 'limiter', enabled: true, params: { ceiling: -12 } }],
    ['limiter', 'a Limiter with a keyframed Ceiling', { type: 'limiter', enabled: true, params: { ceiling: { kf: [{ t: 0, v: -1 }, { t: 1.4, v: -20 }] } } }],
  ];
  const rows = [];
  for (const [type, what, saved] of CASES) {
    const layers = [{ type: 'video', audioFx: [clone(saved)] }];
    FM.storage._sanitizeLayers(layers);
    const today = layers[0].audioFx[0];
    const added = Object.keys(today.params).filter(k => !(k in saved.params));
    for (const sigName of Object.keys(SIGNALS)) {
      for (const chans of [1, 2]) {
        for (const live of [false, true]) {
          const a = await render(OLD.buildAudioFxChain, clone(saved), SIGNALS[sigName], chans, live);
          const b = await render(FM.buildAudioFxChain, today, SIGNALS[sigName], chans, live);
          let diffs = 0, worst = 0, energy = 0;
          for (let c = 0; c < chans; c++) for (let i = 0; i < N; i++) { const x = a[c][i], y = b[c][i]; energy += x * x; if (x !== y) { diffs++; worst = Math.max(worst, Math.abs(x - y)); } }
          rows.push({ type, what, added: added.join(','), signal: sigName, chans, path: live ? 'preview' : 'export', samples: N * chans, differing: diffs, worst, rms: Math.sqrt(energy / (N * chans)) });
        }
      }
    }
  }
  // CONTROL: the comparison can see a difference. The same saved instances, one new key a hair off its default, must
  // NOT be identical — otherwise the rows above prove nothing (an old file that failed to load, a compare that reads
  // the same buffer twice).
  const control = [];
  for (const [type, key, v] of [['compressor', 'output', -0.5], ['compressor', 'mix', 0.98], ['limiter', 'input', 0.5], ['limiter', 'release', 0.06]]) {
    const saved = OLD.audioFxRegistry.makeInstance(type), layers = [{ type: 'video', audioFx: [clone(saved)] }];
    FM.storage._sanitizeLayers(layers);
    const nudged = layers[0].audioFx[0]; nudged.params[key] = v;
    const a = await render(OLD.buildAudioFxChain, clone(saved), SIGNALS.noise, 1, false), b = await render(FM.buildAudioFxChain, nudged, SIGNALS.noise, 1, false);
    let diffs = 0; for (let i = 0; i < N; i++) if (a[0][i] !== b[0][i]) diffs++;
    control.push({ type, key, v, differing: diffs, oldHasKey: OLD.audioFxRegistry.paramsOf(type).some(p => p.key === key) });
  }
  return { control, controlSeesIt: control.every(c => c.differing > 0 && !c.oldHasKey), rows, allIdentical: rows.every(r => r.differing === 0), newDefaults: { compressor: FM.audioFxRegistry.makeInstance('compressor').params, limiter: FM.audioFxRegistry.makeInstance('limiter').params } };
})(OLD_SRC);
