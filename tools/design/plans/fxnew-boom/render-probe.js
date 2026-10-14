/* render-probe.js — the listen sheet for #966 B23 (Explosion & Thunder, hunt/fxnew-boom).
   Every variant worth hearing, rendered exactly as Add makes it (FM.sfx.renderBuffer: 44.1 kHz mono, normalised to 0.89 × its
   level — Far thunder's own level is 0.6), plus the older sounds each new one sits closest to, each POSTed as a WAV to the
   local receiver. His #545 rule: he hears them before anything ships, and picks.
   ⚠️ NOT RUN YET — written while the API builder ran (no browser). For the next browser slot, through tools/shot.py --js-file.
   THIS FILE IS AN ASYNC FUNCTION BODY: shot.py wraps any --js containing "return" in `(async () => { … })()` and prints what
   it resolves to, cut to 4000 characters, so the WAVs go to the receiver: window.__recv is its port (a NUMBER) and each file
   is fetch('http://127.0.0.1:' + window.__recv + '/<name>.wav', { method: 'POST', body: FM.audioBufferToWav(buffer) })
   (FM.audioBufferToWav returns a Blob). Last it POSTs listen.json (the order, the names, why each is on the sheet, lengths
   and peaks) for whoever builds the page he listens on. Modelled on tools/design/plans/fxnew-sfx/render-probe.js. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.sfx && FM.sfx.renderBuffer && FM.audioBufferToWav); i++) await sleep(50);
if (!(window.FM && FM.sfx && FM.sfx.renderBuffer && FM.audioBufferToWav)) return { ok: false, error: 'FM.sfx / FM.audioBufferToWav never came up' };
if (typeof FM.sfx.variant !== 'function' || !FM.sfx.byId('explosion') || !FM.sfx.byId('thunder')) return { ok: false, error: 'this build has no Explosion / Thunder - it is not hunt/fxnew-boom' };
if (typeof window.__recv !== 'number') return { ok: false, error: 'window.__recv is not the receiver port as a number (it is ' + typeof window.__recv + ')' };
const RECV = 'http://127.0.0.1:' + window.__recv;

// [id, options or null, why it is on the sheet]. No options is the row as it lands in the list.
const SHEET = [
  ['explosion', null, 'Explosion: the row (Big)'], ['explosion', { size: 'small' }, 'Size small'],
  ['explosion', { variation: 2 }, 'Big, Variation 2'], ['explosion', { variation: 5 }, 'Big, Variation 5'],
  ['explosion', { size: 'small', variation: 3 }, 'Small, Variation 3'],
  ['explosion', { length: 2 }, 'Big at Length 2x (6.4 s) - does the tail hold up stretched?'],
  ['explosion', { size: 'small', length: 0.6 }, 'Small at Length 0.6x (a short pop)'],
  ['thunder', null, 'Thunder: the row (Near)'], ['thunder', { distance: 'far' }, 'Distance far (quieter, darker, half a second later)'],
  ['thunder', { variation: 2 }, 'Near, Variation 2'], ['thunder', { variation: 6 }, 'Near, Variation 6'],
  ['thunder', { distance: 'far', variation: 2 }, 'Far, Variation 2'],
  ['thunder', { length: 1.6 }, 'Near at Length 1.6x (a longer roll)'],
  // the older sounds a new one sits closest to - so he can say whether a new one earns its row
  ['impact', null, 'existing, beside Explosion'], ['sub-drop', null, 'existing, beside Explosion'], ['thud', null, 'existing, beside Explosion (small)'],
  ['rain', null, 'existing, beside Thunder (a storm)'], ['wind', null, 'existing, beside Thunder'],
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
