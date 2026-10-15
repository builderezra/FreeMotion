/* render-probe.js — the listen sheet for #966 B35 (Ambience, hunt/pile-ambience).
   Every take worth hearing, rendered exactly as Add makes it (FM.sfx.renderBuffer: 44.1 kHz mono, normalised to 0.89 × its
   level), plus the older Nature sounds each new bed sits beside, each POSTed as a WAV to the local receiver. His #545 rule: he
   hears them before anything ships, and picks. Loop-ready beds are also sent LAID END TO END three times (and the faded row
   the same way, for comparison), so the joins can be heard — the loop-ready ones should have none, the faded ones dip.
   ⚠️ NOT RUN YET — written while the API builder ran (no browser). For the next browser slot, through tools/shot.py --js-file.
   THIS FILE IS AN ASYNC FUNCTION BODY: shot.py wraps any --js containing "return" in `(async () => { … })()` and prints what
   it resolves to, cut to 4000 characters, so the WAVs go to the receiver: window.__recv is its port (a NUMBER) and each file
   is fetch('http://127.0.0.1:' + window.__recv + '/<name>.wav', { method: 'POST', body: FM.audioBufferToWav(buffer) })
   (FM.audioBufferToWav returns a Blob). Last it POSTs listen.json (the order, the names, why each is on the sheet, lengths
   and peaks) for whoever builds the page he listens on. Modelled on tools/design/plans/fxnew-drums/render-probe.js. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.sfx && FM.sfx.renderBuffer && FM.audioBufferToWav); i++) await sleep(50);
if (!(window.FM && FM.sfx && FM.sfx.renderBuffer && FM.audioBufferToWav)) return { ok: false, error: 'FM.sfx / FM.audioBufferToWav never came up' };
if (typeof FM.sfx.variant !== 'function' || !FM.sfx.byId('amb-ocean') || !FM.sfx.byId('amb-room')) return { ok: false, error: 'this build has no Ambience - it is not hunt/pile-ambience' };
if (typeof window.__recv !== 'number') return { ok: false, error: 'window.__recv is not the receiver port as a number (it is ' + typeof window.__recv + ')' };
const RECV = 'http://127.0.0.1:' + window.__recv;

// [id, options or null, why it is on the sheet, times laid end to end (1 = as it is)]. No options is the row as it lands in the list.
const SHEET = [
  ['amb-ocean', null, 'Ocean surf: the row (8 s, faded)', 1], ['amb-ocean', { variation: 2 }, 'Ocean surf, Variation 2 (other waves)', 1],
  ['amb-ocean', { variation: 5 }, 'Ocean surf, Variation 5', 1], ['amb-ocean', { length: 30 }, 'Ocean surf, 30 s (seven or eight waves)', 1],
  ['amb-ocean', { loop: true }, 'Ocean surf, loop-ready, laid three times end to end - listen at 8 and 16 s: no join', 3],
  ['amb-ocean', null, 'Ocean surf, the row (faded), laid three times end to end - the joins dip (the pile had only this)', 3],
  ['amb-crickets', null, 'Crickets at night: the row', 1], ['amb-crickets', { variation: 2 }, 'Crickets at night, Variation 2 (a slightly different rate and tone)', 1],
  ['amb-crickets', { loop: true }, 'Crickets at night, loop-ready, three times end to end', 3],
  ['amb-birds', null, 'Morning birds: the row', 1], ['amb-birds', { variation: 2 }, 'Morning birds, Variation 2 (other singers)', 1],
  ['amb-birds', { variation: 3 }, 'Morning birds, Variation 3', 1], ['amb-birds', { length: 20 }, 'Morning birds, 20 s', 1],
  ['amb-birds', { loop: true }, 'Morning birds, loop-ready, three times end to end', 3],
  ['amb-room', null, 'Room tone: the row (with its faint 50 Hz hum)', 1], ['amb-room', { hum: false }, 'Room tone, no hum', 1],
  ['amb-room', { variation: 2 }, 'Room tone, Variation 2 (the band a little brighter or darker)', 1],
  ['amb-room', { loop: true }, 'Room tone, loop-ready, three times end to end', 3],
  // the older sounds a new bed sits beside - so he can say whether each new one earns its row
  ['wind', null, 'existing (Nature), beside Ocean surf and Room tone', 1], ['rain', null, 'existing (Nature), beside Room tone', 1],
  ['fire', null, 'existing (Nature), beside the beds', 1], ['thunder', null, 'existing (Nature, #966 B23), beside Ocean surf', 1],
];
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// `times` copies of a buffer, one after another, sample for sample - what laying a clip end to end on the timeline plays
const tile = (buf, times) => {
  if (times <= 1) return buf;
  const src = buf.getChannelData(0), out = new AudioBuffer({ length: src.length * times, numberOfChannels: 1, sampleRate: buf.sampleRate }), d = out.getChannelData(0);
  for (let k = 0; k < times; k++) d.set(src, k * src.length);
  return out;
};
const list = [], errors = [];
let n = 0;
for (const [id, opts, why, times] of SHEET) {
  n++;
  const def = FM.sfx.byId(id);
  if (!def) { errors.push(id + ': not in this build'); continue; }
  const s = opts ? FM.sfx.variant(def, opts) : def;
  if (opts && s === def) { errors.push(id + ' ' + JSON.stringify(opts) + ': the options changed nothing'); continue; }
  try {
    const one = await FM.sfx.renderBuffer(s), buf = tile(one, times);
    const d = buf.getChannelData(0); let pk = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; }
    const file = String(n).padStart(2, '0') + '-' + slug(s.name) + (times > 1 ? '-x' + times : '') + '.wav';
    const res = await fetch(RECV + '/' + file, { method: 'POST', body: FM.audioBufferToWav(buf) });
    if (!res.ok) errors.push(file + ': the receiver said ' + res.status);
    list.push({ file: file, id: id, name: s.name, cat: s.cat, options: opts, why: why, times: times, loop: !!s.loop, level: s.level == null ? 1 : s.level, secs: +buf.duration.toFixed(3), peak: +pk.toFixed(4) });
    if (!(pk > 0.05)) errors.push(file + ': nearly silent (peak ' + pk.toFixed(4) + ')');
  } catch (e) { errors.push(id + ': ' + (e && e.message)); }
}
const sheet = { ok: !errors.length, made: new Date().toISOString(), version: (document.querySelector('.brand .ver') || {}).textContent || null, sounds: list, errors: errors, ms: Date.now() - t0 };
let posted = null;
try { posted = (await fetch(RECV + '/listen.json', { method: 'POST', body: JSON.stringify(sheet, null, 1) })).status; }
catch (e) { posted = 'POST failed: ' + (e && e.message); errors.push('listen.json: ' + posted); }
return { ok: !errors.length, wavs: list.length, of: SHEET.length, posted: posted, ms: sheet.ms, errors: errors.slice(0, 8) };
