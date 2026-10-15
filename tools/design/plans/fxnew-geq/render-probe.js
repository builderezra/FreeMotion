/* render-probe.js — the listen sheet for #966 B34 (Graphic EQ, hunt/fxnew-geq).
   Each preset on a voice (tests/_fixtures/vad/clean.wav) and on music (music-only.wav), rendered through the app's own chain
   exactly as an export does it (FM.buildAudioFxChain(oac, { audioFx: [inst] }, 0), then chain.schedule(0, SECS)), plus each
   source untouched, every one POSTed as a WAV to the local receiver. His #545 rule: he hears them before anything ships, and
   picks or moves the numbers.
   ⚠️ NOT RUN YET — written while the API builder ran (no browser). For the next browser slot, through tools/shot.py --js-file.
   THIS FILE IS AN ASYNC FUNCTION BODY: shot.py wraps any --js containing "return" in `(async () => { … })()` and prints what it
   resolves to, cut to 4000 characters, so the WAVs go to the receiver: window.__recv is its port (a NUMBER) and each file is
   fetch('http://127.0.0.1:' + window.__recv + '/<name>.wav', { method: 'POST', body: FM.audioBufferToWav(buffer) })
   (FM.audioBufferToWav returns a Blob). Last it POSTs listen.json (the order, why each is on the sheet, its level against the
   untouched source) for whoever builds the page he listens on.
   LEVELS ARE KEPT, NOT EVENED OUT. A preset that lifts is louder (Output is never in a preset, #482 8.2), and that is part of
   what he is judging — so every render of one source is scaled by ONE factor (the loudest of them peaks at 0.89), not each
   to its own peak. listen.json says how far each sits from the untouched source in RMS dB, so a "better" that is only
   "louder" can be told apart. Flat is not a file: it must be the source sample for sample, and the probe checks that instead.
   Modelled on scratchpad/sounds-probe.js (batch 7's Telephone / Distortion sheet) and fxnew-drums/render-probe.js. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.audioFxRegistry && FM.buildAudioFxChain && FM.audioBufferToWav); i++) await sleep(50);
if (!(window.FM && FM.audioFxRegistry && FM.buildAudioFxChain && FM.audioBufferToWav)) return { ok: false, error: 'FM.audioFxRegistry / FM.buildAudioFxChain / FM.audioBufferToWav never came up' };
const reg = FM.audioFxRegistry;
if (!reg.get('graphiceq')) return { ok: false, error: 'this build has no Graphic EQ - it is not hunt/fxnew-geq' };
if (typeof window.__recv !== 'number') return { ok: false, error: 'window.__recv is not the receiver port as a number (it is ' + typeof window.__recv + ')' };
const RECV = 'http://127.0.0.1:' + window.__recv, SR = 44100, SECS = 8;

const load = async p => { const ab = await (await fetch(p)).arrayBuffer(); return await new OfflineAudioContext(1, SR, SR).decodeAudioData(ab); };
const SOURCES = [['voice', await load('tests/_fixtures/vad/clean.wav')], ['music', await load('tests/_fixtures/vad/music-only.wav')]];
// The presets as the registry has them (so the sheet is what ships), with why each is on the sheet.
const WHY = {
  'Bass boost': 'more low end: 62 Hz about +7 dB once the neighbours add in',
  'Treble boost': 'brighter: 8 kHz about +6 dB',
  'Vocal presence': 'words forward: rumble and mud down, 2-4 kHz up',
  'Loudness smile': 'the smile on the sliders: lows and highs up, mids down',
  'Telephone-ish': 'a phone line drawn with sliders (the Telephone effect is the real one, for comparison)',
  'Podcast': 'a clean voice: no rumble, a little body, less boxiness, clear',
  'Bass cut': 'wind and rumble out: 62 Hz about -16 dB',
};
const presets = reg.presetsOf('graphiceq');

async function render(src, inst) {
  const n = Math.min(src.length, SECS * src.sampleRate) | 0;
  const oac = new OfflineAudioContext(1, Math.round(n * SR / src.sampleRate), SR);
  const s = oac.createBufferSource(); s.buffer = src;
  const chain = inst ? FM.buildAudioFxChain(oac, { audioFx: [inst] }, 0) : null;
  if (chain) { s.connect(chain.input); chain.output.connect(oac.destination); chain.schedule(0, SECS); } else s.connect(oac.destination);
  s.start(0);
  const out = await oac.startRendering();
  if (chain) { try { chain.dispose(); } catch (e) {} }
  return out;
}
const peakOf = b => { const d = b.getChannelData(0); let p = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > p) p = a; } return p; };
const rmsDb = b => { const d = b.getChannelData(0); let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i]; return 10 * Math.log10(Math.max(1e-20, s / Math.max(1, d.length))); };
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const list = [], errors = [];
let n = 0;
for (const [srcName, src] of SOURCES) {
  const jobs = [['original', null, 'the ' + srcName + ' untouched']];
  presets.forEach(p => { if (p.name !== 'Flat') jobs.push([p.name, p, WHY[p.name] || '']); });
  // Flat must hand back the source itself: checked, not listened to.
  const flatP = presets.filter(p => p.name === 'Flat')[0];
  const made = [];
  for (const [name, pr, why] of jobs) {
    try {
      let inst = null;
      if (pr) { inst = reg.makeInstance('graphiceq'); if (!FM.audioFxPresets.apply(inst, pr)) { errors.push(srcName + ' ' + name + ': the preset wrote nothing'); continue; } }
      made.push({ name: name, why: why, preset: pr ? Object.assign({}, pr.params) : null, buf: await render(src, inst) });
    } catch (e) { errors.push(srcName + ' ' + name + ': ' + (e && e.message)); }
  }
  if (flatP) {
    try {
      const inst = reg.makeInstance('graphiceq'); FM.audioFxPresets.apply(inst, flatP);
      const a = (await render(src, inst)).getChannelData(0), b = (await render(src, null)).getChannelData(0);
      let diff = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) diff++;
      if (diff || a.length !== b.length) errors.push(srcName + ': Flat differs from the source in ' + diff + ' samples - it must be the source itself');
    } catch (e) { errors.push(srcName + ' Flat check: ' + (e && e.message)); }
  }
  const orig = made.filter(m => m.name === 'original')[0], ref = orig ? rmsDb(orig.buf) : 0;
  const loud = Math.max.apply(null, made.map(m => peakOf(m.buf)).concat([1e-9])), g = 0.891 / loud;
  for (const m of made) {
    n++;
    const lvl = rmsDb(m.buf) - ref, d = m.buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] *= g;
    const file = String(n).padStart(2, '0') + '-' + srcName + '-' + slug(m.name) + '.wav';
    try {
      const res = await fetch(RECV + '/' + file, { method: 'POST', body: FM.audioBufferToWav(m.buf) });
      if (!res.ok) errors.push(file + ': the receiver said ' + res.status);
      list.push({ file: file, source: srcName, preset: m.name, why: m.why, bands: m.preset, dbVsOriginal: +lvl.toFixed(2), secs: +m.buf.duration.toFixed(3) });
    } catch (e) { errors.push(file + ': ' + (e && e.message)); }
  }
}
const sheet = { ok: !errors.length, made: new Date().toISOString(), version: (document.querySelector('.brand .ver') || {}).textContent || null,
  note: 'one scale per source, so the presets keep their real levels; dbVsOriginal is RMS against the untouched source', files: list, errors: errors, ms: Date.now() - t0 };
let posted = null;
try { posted = (await fetch(RECV + '/listen.json', { method: 'POST', body: JSON.stringify(sheet, null, 1) })).status; }
catch (e) { posted = 'POST failed: ' + (e && e.message); errors.push('listen.json: ' + posted); }
return { ok: !errors.length, wavs: list.length, posted: posted, ms: sheet.ms, errors: errors.slice(0, 8) };
