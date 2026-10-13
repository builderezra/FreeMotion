/* render-probe.js — the listen sheet for #966 B4 / B5 / B12 / B13 (the four new sound packs on hunt/fxnew-sfx).
   Every new sound, rendered exactly as Add makes it (FM.sfx.renderBuffer: 44.1 kHz mono, normalised to 0.89 × its level),
   plus the options worth hearing and the older sounds each new one sits closest to, each POSTed as a WAV to the local
   receiver. His #545 rule: he hears them before anything ships, and picks.
   ⚠️ NOT RUN YET — written while a ship ran (no browser). For the next browser slot, through tools/shot.py --js-file.
   THIS FILE IS AN ASYNC FUNCTION BODY: shot.py wraps any --js containing "return" in `(async () => { … })()` and prints what
   it resolves to, cut to 4000 characters, so the WAVs go to the receiver: window.__recv is its port (a NUMBER) and each file
   is fetch('http://127.0.0.1:' + window.__recv + '/<name>.wav', { method: 'POST', body: FM.audioBufferToWav(buffer) })
   (FM.audioBufferToWav returns a Blob). Last it POSTs listen.json (the order, the names, why each is on the sheet, lengths
   and peaks) for whoever builds the page he listens on. Modelled on hunt/new-prep's
   tools/design/plans/new-effects/render-voices-probe.js. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.sfx && FM.sfx.renderBuffer && FM.audioBufferToWav); i++) await sleep(50);
if (!(window.FM && FM.sfx && FM.sfx.renderBuffer && FM.audioBufferToWav)) return { ok: false, error: 'FM.sfx / FM.audioBufferToWav never came up' };
if (typeof FM.sfx.variant !== 'function') return { ok: false, error: 'this build has no FM.sfx.variant - it is not hunt/fxnew-sfx' };
if (typeof window.__recv !== 'number') return { ok: false, error: 'window.__recv is not the receiver port as a number (it is ' + typeof window.__recv + ')' };
const RECV = 'http://127.0.0.1:' + window.__recv;

// [id, options or null, why it is on the sheet]. A pack sound with no options is the row as it lands in the list.
const SHEET = [
  // B4 — Cartoon
  ['boing', null, 'Cartoon: the row'], ['boing', { variation: 2 }, 'Variation 2'], ['boing', { pitch: -5 }, 'Pitch -5'],
  ['bonk', null, 'Cartoon: the row'], ['bonk', { pitch: 5 }, 'Pitch +5'],
  ['slide-whistle-up', null, 'Cartoon: the row'], ['slide-whistle-down', null, 'Cartoon: the row'], ['slide-whistle-up', { length: 2 }, 'Length 2x'],
  ['sad-trombone', null, 'Cartoon: the row'], ['sad-trombone', { variation: 2 }, 'Variation 2'],
  ['air-horn', null, 'Cartoon: the row'], ['air-horn', { pitch: 3 }, 'Pitch +3'],
  ['wobble', null, 'Cartoon: the row'], ['wobble', { variation: 3 }, 'Variation 3'],
  // B5 — Beeps (under Interface)
  ['censor-bleep', null, 'Beeps: the row'], ['censor-bleep', { length: 2, tone: 1500 }, 'Length 2 s, Tone 1500 Hz'],
  ['countdown', null, 'Beeps: the row'], ['countdown', { gap: 0.5 }, 'half a second apart'],
  ['message-ping', null, 'Beeps: the row'], ['message-ping', { variation: 2 }, 'Variation 2 (the second ping a fourth up)'],
  ['heart-monitor', null, 'Beeps: the row'], ['heart-monitor', { flatline: true }, 'the flatline'],
  // B12 — Transitions & glitch (under Texture)
  ['record-scratch', null, 'Transitions: the row'], ['record-scratch', { variation: 2 }, 'Variation 2'],
  ['tape-stop', null, 'Transitions: the row'], ['tape-stop', { length: 2 }, 'Length 2x'],
  ['radio-tuning', null, 'Transitions: the row'], ['radio-tuning', { variation: 2 }, 'Variation 2'],
  ['digital-glitch', null, 'Transitions: the row'], ['digital-glitch', { variation: 2 }, 'Variation 2'],
  // B13 — 8-bit Game
  ['coin', null, 'Game: the row'], ['coin', { variation: 2 }, 'Variation 2 (a fifth up)'],
  ['jump', null, 'Game: the row'], ['power-up', null, 'Game: the row'], ['power-up', { variation: 3 }, 'Variation 3 (minor)'],
  ['laser', null, 'Game: the row'], ['game-over', null, 'Game: the row'], ['extra-life', null, 'Game: the row'],
  // the older sounds a new one sits closest to — so he can say whether a new one earns its row
  ['zap', null, 'existing, beside Laser'], ['slide-up', null, 'existing, beside Slide whistle up'], ['vinyl', null, 'existing, beside Record scratch'],
  ['heartbeat', null, 'existing, beside Heart monitor'], ['ding', null, 'existing, beside Message ping'], ['error', null, 'existing, beside Game over'],
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
    list.push({ file: file, id: id, name: s.name, cat: s.cat, options: opts, why: why, secs: +buf.duration.toFixed(3), peak: +pk.toFixed(4) });
    if (!(pk > 0.05)) errors.push(file + ': nearly silent (peak ' + pk.toFixed(4) + ')');
  } catch (e) { errors.push(id + ': ' + (e && e.message)); }
}
const sheet = { ok: !errors.length, made: new Date().toISOString(), version: (document.querySelector('.brand .ver') || {}).textContent || null, sounds: list, errors: errors, ms: Date.now() - t0 };
let posted = null;
try { posted = (await fetch(RECV + '/listen.json', { method: 'POST', body: JSON.stringify(sheet, null, 1) })).status; }
catch (e) { posted = 'POST failed: ' + (e && e.message); errors.push('listen.json: ' + posted); }
return { ok: !errors.length, wavs: list.length, of: SHEET.length, posted: posted, ms: sheet.ms, errors: errors.slice(0, 8) };
