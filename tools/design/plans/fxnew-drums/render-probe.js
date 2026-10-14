/* render-probe.js — the listen sheet for #966 B22 (Drums, hunt/fxnew-drums).
   Every take worth hearing, rendered exactly as Add makes it (FM.sfx.renderBuffer: 44.1 kHz mono, normalised to 0.89 × its
   level), plus the older sounds each new one sits closest to, each POSTed as a WAV to the local receiver. His #545 rule: he
   hears them before anything ships, and picks.
   ⚠️ NOT RUN YET — written while the API builder ran (no browser). For the next browser slot, through tools/shot.py --js-file.
   THIS FILE IS AN ASYNC FUNCTION BODY: shot.py wraps any --js containing "return" in `(async () => { … })()` and prints what
   it resolves to, cut to 4000 characters, so the WAVs go to the receiver: window.__recv is its port (a NUMBER) and each file
   is fetch('http://127.0.0.1:' + window.__recv + '/<name>.wav', { method: 'POST', body: FM.audioBufferToWav(buffer) })
   (FM.audioBufferToWav returns a Blob). Last it POSTs listen.json (the order, the names, why each is on the sheet, lengths
   and peaks) for whoever builds the page he listens on. Modelled on tools/design/plans/fxnew-boom/render-probe.js. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.sfx && FM.sfx.renderBuffer && FM.audioBufferToWav); i++) await sleep(50);
if (!(window.FM && FM.sfx && FM.sfx.renderBuffer && FM.audioBufferToWav)) return { ok: false, error: 'FM.sfx / FM.audioBufferToWav never came up' };
if (typeof FM.sfx.variant !== 'function' || !FM.sfx.byId('kick') || !FM.sfx.byId('drumroll')) return { ok: false, error: 'this build has no Drums - it is not hunt/fxnew-drums' };
if (typeof window.__recv !== 'number') return { ok: false, error: 'window.__recv is not the receiver port as a number (it is ' + typeof window.__recv + ')' };
const RECV = 'http://127.0.0.1:' + window.__recv;

// [id, options or null, why it is on the sheet]. No options is the row as it lands in the list.
const SHEET = [
  ['kick', null, 'Kick: the row'], ['kick', { decay: 2 }, 'Kick at Decay 2x (a long boom)'], ['kick', { decay: 0.5 }, 'Kick at Decay 0.5x (tight)'],
  ['kick', { pitch: -5 }, 'Kick at -5 st (deeper)'], ['kick', { variation: 3 }, 'Kick, Variation 3'],
  ['snare', null, 'Snare: the row (Tone normal)'], ['snare', { tone: 'dark' }, 'Snare, Tone dark'], ['snare', { tone: 'bright' }, 'Snare, Tone bright'],
  ['snare', { decay: 1.6 }, 'Snare at Decay 1.6x'], ['snare', { variation: 2 }, 'Snare, Variation 2'],
  ['clap', null, 'Clap: the row'], ['clap', { decay: 2 }, 'Clap at Decay 2x (a bigger room)'], ['clap', { variation: 2 }, 'Clap, Variation 2'],
  ['hi-hat', null, 'Hi-hat: the row (closed)'], ['hi-hat', { hat: 'open' }, 'Hi-hat, open'], ['hi-hat', { pitch: 3 }, 'Hi-hat at +3 st'],
  ['hi-hat', { variation: 4 }, 'Hi-hat, Variation 4'],
  ['rimshot', null, 'Ba-dum-tss: the row'], ['rimshot', { variation: 2 }, 'Ba-dum-tss, Variation 2 (the timing a little looser)'],
  ['rimshot', { decay: 2 }, 'Ba-dum-tss at Decay 2x (a long ring)'], ['rimshot', { pitch: -3 }, 'Ba-dum-tss at -3 st'],
  ['drumroll', null, 'Drumroll: the row (2 s and the crash)'], ['drumroll', { crash: false }, 'Drumroll without its crash'],
  ['drumroll', { length: 1 }, 'Drumroll, 1 s'], ['drumroll', { length: 4 }, 'Drumroll, 4 s'],
  ['drumroll', { length: 6 }, 'Drumroll, 6 s - the longest (7.6 s with the crash: under batch 9 PREVIEW_MAX of 8 s)'],
  ['drumroll', { variation: 2 }, 'Drumroll, Variation 2 (other hands, a touch faster or slower)'],
  // the older sounds a new one sits closest to - so he can say whether a new one earns its row
  ['thud', null, 'existing, beside Kick (a sine 190 -> 55 Hz, no click)'], ['heartbeat', null, 'existing, beside Kick'],
  ['punch', null, 'existing, beside Snare and Clap'], ['build-tick', null, 'existing, beside Hi-hat (its ticks are high-passed noise)'],
  ['reverse-cymbal', null, 'existing (Reverse swell), beside the cymbal in Ba-dum-tss and the crash'], ['impact', null, 'existing, beside the crash'],
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
    const buf = await FM.sfx.renderBuffer(s);
    const d = buf.getChannelData(0); let pk = 0;
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
