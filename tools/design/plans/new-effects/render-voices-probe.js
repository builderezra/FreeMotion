/* render-voices-probe.js — every voice in voices.js rendered over a real voice clip (tests/_fixtures/vad/clean.wav) through the
   app's own audio chain, offline: FM.buildAudioFxChain on an OfflineAudioContext, chain.schedule(0, secs) — the export path.
   5 s, mono, 44.1 kHz, each peak-normalised to −1 dBFS so the comparison is about character, not level (a voice tile would
   land at whatever level its stack makes; the Output controls do the rest). Plus the dry clip, normalised the same way.
   Modelled on the batch-7 sounds probe. For tools/shot.py --js-file.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js containing "return" in `(async () => { … })()` and prints what it
   resolves to, cut to 4000 characters). Sixteen WAVs do not fit in that, so with ?fmrecv=<port> on the page address the probe
   POSTs its one JSON object — { ok, sampleRate, secs, voices: { <id>: <base64 WAV> }, names, stacks, peaks, ms } — to
   recv.py on 127.0.0.1:<port> as voices.json and returns a short summary (run-probes.sh then writes each WAV out).
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
         --js-file tools/design/plans/new-effects/render-voices-probe.js --out /tmp/fm-new-voices-page.png */
const SR = 44100, SECS = 5, PEAK = 0.891;   // −1 dBFS
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.buildAudioFxChain && FM.audioFxRegistry && FM.audioBufferToWav); i++) await sleep(50);
if (!(window.FM && FM.buildAudioFxChain && FM.audioBufferToWav)) return { ok: false, error: 'FM audio never came up' };
const recvPort = (new URLSearchParams(location.search)).get('fmrecv');
const RECV = recvPort && /^\d{2,5}$/.test(recvPort) ? 'http://127.0.0.1:' + recvPort : null;

const srcText = await (await fetch('tools/design/plans/new-effects/voices.js?t=' + Date.now(), { cache: 'no-store' })).text();
const mod = { exports: {} };
new Function('module', 'exports', 'window', srcText)(mod, mod.exports, undefined);
const VOICES = mod.exports && mod.exports.VOICES;
if (!Array.isArray(VOICES)) return { ok: false, error: 'voices.js did not load' };

const reg = FM.audioFxRegistry;
const make = m => { const i = reg.makeInstance(m.type); if (!i) throw new Error('no audio effect ' + m.type); i.params = Object.assign({}, i.params || {}, JSON.parse(JSON.stringify(m.params || {}))); return i; };
const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const toB64 = async blobOrBuf => b64(blobOrBuf instanceof Blob ? await blobOrBuf.arrayBuffer() : blobOrBuf);
const ab = await (await fetch('tests/_fixtures/vad/clean.wav')).arrayBuffer();
const voice = await new OfflineAudioContext(1, SR, SR).decodeAudioData(ab);

async function render(stack) {
  const n = SECS * SR;                                   // the full 5 s even past the clip, so reverb and echo tails ring out
  const oac = new OfflineAudioContext(1, n, SR);
  const s = oac.createBufferSource(); s.buffer = voice;
  const chain = stack && stack.length ? FM.buildAudioFxChain(oac, { audioFx: stack.map(make) }, 0) : null;
  if (chain) { s.connect(chain.input); chain.output.connect(oac.destination); chain.schedule(0, SECS); } else s.connect(oac.destination);
  s.start(0);
  const out = await oac.startRendering();
  const d = out.getChannelData(0); let pk = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; }
  if (pk > 0) { const g = PEAK / pk; for (let i = 0; i < d.length; i++) d[i] *= g; }
  return { wav: await toB64(FM.audioBufferToWav(out)), peak: pk };
}

const voices = {}, names = { original: 'As recorded' }, stacks = {}, peaks = {}, errors = [];
const dry = await render(null);
voices.original = dry.wav; peaks.original = +dry.peak.toFixed(4);
for (const v of VOICES) {
  try {
    const r = await render(v.stack);
    voices[v.id] = r.wav; names[v.id] = v.name; stacks[v.id] = v.stack.map(m => m.type).join(' + '); peaks[v.id] = +r.peak.toFixed(4);
    if (!(r.peak > 1e-4)) errors.push(v.id + ': silent (peak ' + r.peak + ')');
  } catch (e) { errors.push(v.id + ': ' + (e && e.message)); }
}
const full = { ok: !errors.length, sampleRate: SR, secs: SECS, voices: voices, names: names, stacks: stacks, peaks: peaks, errors: errors, ms: Date.now() - t0 };
window.__fmNewVoices = full;
let posted = null;
if (RECV) {
  try { posted = await (await fetch(RECV + '/voices.json', { method: 'POST', body: JSON.stringify(full) })).text(); }
  catch (e) { posted = 'POST failed: ' + (e && e.message); }
}
return { ok: full.ok, posted: posted, recv: RECV, voices: Object.keys(voices).length, ms: full.ms, errors: errors.slice(0, 6), peaks: peaks };
