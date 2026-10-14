/* render-probe.js — the listen sheet for #966 B36 (Everyday Foley, hunt/pile-foley).
   Every take worth hearing, rendered exactly as Add makes it (FM.sfx.renderBuffer: 44.1 kHz mono, normalised to 0.89 × its
   level), plus the older sounds each new one sits beside, each POSTed as a WAV to the local receiver. His #545 rule: he hears
   them before anything ships, and picks.
   ⚠️ NOT RUN YET — written while the API builder ran (no browser). For the next browser slot, through tools/shot.py --js-file.
   THIS FILE IS AN ASYNC FUNCTION BODY: shot.py wraps any --js containing "return" in `(async () => { … })()` and prints what
   it resolves to, cut to 4000 characters, so the WAVs go to the receiver: window.__recv is its port (a NUMBER) and each file
   is fetch('http://127.0.0.1:' + window.__recv + '/<name>.wav', { method: 'POST', body: FM.audioBufferToWav(buffer) })
   (FM.audioBufferToWav returns a Blob). Last it POSTs listen.json (the order, the names, why each is on the sheet, lengths,
   levels and peaks) for whoever builds the page he listens on. Modelled on tools/design/plans/pile-ambience/render-probe.js. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.sfx && FM.sfx.renderBuffer && FM.audioBufferToWav); i++) await sleep(50);
if (!(window.FM && FM.sfx && FM.sfx.renderBuffer && FM.audioBufferToWav)) return { ok: false, error: 'FM.sfx / FM.audioBufferToWav never came up' };
if (typeof FM.sfx.variant !== 'function' || !FM.sfx.byId('foley-knock') || !FM.sfx.byId('foley-kaching')) return { ok: false, error: 'this build has no Everyday Foley - it is not hunt/pile-foley' };
if (typeof window.__recv !== 'number') return { ok: false, error: 'window.__recv is not the receiver port as a number (it is ' + typeof window.__recv + ')' };
const RECV = 'http://127.0.0.1:' + window.__recv;

// [id, options or null, why it is on the sheet]. No options is the row as it lands in the list.
const SHEET = [
  ['foley-knock', null, 'Door knock: the row (3 firm knocks)'], ['foley-knock', { variation: 2 }, 'Door knock, Variation 2 (another hand)'],
  ['foley-knock', { force: 'soft' }, 'Door knock, soft (duller, quieter)'], ['foley-knock', { force: 'pound' }, 'Door knock, pound (a fist, louder)'],
  ['foley-knock', { knocks: 5 }, 'Door knock, 5 knocks'], ['foley-knock', { knocks: 2, variation: 3 }, 'Door knock, 2 knocks, Variation 3 (the classic knock-knock)'],
  ['foley-footsteps', null, 'Footsteps: the row (6 steps walking, hard floor)'], ['foley-footsteps', { variation: 2 }, 'Footsteps, Variation 2'],
  ['foley-footsteps', { pace: 'run' }, 'Footsteps, running'], ['foley-footsteps', { floor: 'soft' }, 'Footsteps, soft floor (carpet, grass)'],
  ['foley-footsteps', { steps: 12, pace: 'run', floor: 'soft' }, 'Footsteps, 12 running on a soft floor'],
  ['foley-clock', null, 'Tick-tock: the row (4 s, once a second)'], ['foley-clock', { rate: 2 }, 'Tick-tock, twice a second'],
  ['foley-clock', { variation: 2 }, 'Tick-tock, Variation 2 (another clock: the pitches move)'], ['foley-clock', { length: 10 }, 'Tick-tock, 10 s'],
  ['foley-vibrate', null, 'Phone vibrate: the row (3 buzzes on a table)'], ['foley-vibrate', { surface: 'pocket' }, 'Phone vibrate, in a pocket'],
  ['foley-vibrate', { buzzes: 1 }, 'Phone vibrate, one buzz (a notification)'], ['foley-vibrate', { variation: 2 }, 'Phone vibrate, Variation 2 (another phone)'],
  ['foley-typing', null, 'Typing: the row (3 s, steady, laptop)'], ['foley-typing', { speed: 'fast' }, 'Typing, fast'],
  ['foley-typing', { keyboard: 'mechanical' }, 'Typing, mechanical keys'], ['foley-typing', { variation: 2 }, 'Typing, Variation 2 (other words)'],
  ['foley-typing', { length: 10, speed: 'fast', keyboard: 'mechanical' }, 'Typing, 10 s fast on mechanical keys'],
  ['foley-kaching', null, 'Ka-ching: the row'], ['foley-kaching', { variation: 2 }, 'Ka-ching, Variation 2 (another register)'],
  ['foley-kaching', { pitch: -4 }, 'Ka-ching, -4 st (a bigger bell)'], ['foley-kaching', { length: 2 }, 'Ka-ching, rings twice as long'],
  // the older sounds a new one sits beside - so he can say whether each new one earns its row
  ['typewriter', null, 'existing (Interface), beside Typing - one key'], ['build-tick', null, 'existing (Build), beside Tick-tock - ticks that speed up'],
  ['bonk', null, 'existing (Cartoon), beside Door knock - a wood-block bonk'], ['bell', null, 'existing (Interface), beside Ka-ching - a bell alone'],
  ['ding', null, 'existing (Interface), beside Ka-ching'], ['heartbeat', null, 'existing (Build), beside Footsteps - a steady low pulse'],
];
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const list = [], errors = [];
let n = 0;
for (const [id, opts, why] of SHEET) {
  n++;
  const def = FM.sfx.byId(id);
  if (!def) { errors.push(id + ': not in this build'); continue; }
  const s = opts ? FM.sfx.variant(def, opts) : def;
  if (opts && s === def) { errors.push(id + ' ' + JSON.stringify(opts) + ': the options changed nothing'); continue; }
  try {
    const buf = await FM.sfx.renderBuffer(s), d = buf.getChannelData(0);
    let pk = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; }
    const file = String(n).padStart(2, '0') + '-' + slug(s.name) + '.wav';
    const res = await fetch(RECV + '/' + file, { method: 'POST', body: FM.audioBufferToWav(buf) });
    if (!res.ok) errors.push(file + ': the receiver said ' + res.status);
    list.push({ file: file, id: id, name: s.name, cat: s.cat, options: opts, why: why, level: s.level == null ? 1 : s.level, secs: +buf.duration.toFixed(3), peak: +pk.toFixed(4) });
    if (!(pk > 0.05)) errors.push(file + ': nearly silent (peak ' + pk.toFixed(4) + ')');
  } catch (e) { errors.push(id + ': ' + (e && e.message)); }
}
const sheet = { ok: !errors.length, made: new Date().toISOString(), version: (document.querySelector('.brand .ver') || {}).textContent || null, sounds: list, errors: errors, ms: Date.now() - t0 };
let posted = null;
try { posted = (await fetch(RECV + '/listen.json', { method: 'POST', body: JSON.stringify(sheet, null, 1) })).status; }
catch (e) { posted = 'POST failed: ' + (e && e.message); errors.push('listen.json: ' + posted); }
return { ok: !errors.length, wavs: list.length, of: SHEET.length, posted: posted, ms: sheet.ms, errors: errors.slice(0, 8) };
