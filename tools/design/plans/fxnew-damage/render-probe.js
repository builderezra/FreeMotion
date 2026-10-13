/* render-probe.js — #966 B7 Film Damage and B16 Trance Gate / Stutter, rendered through the APP'S OWN code for Ezra to see and
   hear before either ships (#545: he picks the look / the sound; the code does not wait). WRITTEN, NOT RUN (13 Oct: the API
   builder was shipping, so no browser ran here) — the first run is the next browser slot's.

   THIS FILE IS AN ASYNC FUNCTION BODY (tools/shot.py wraps any --js that contains "return" as `(async () => { … })()` and
   prints what it resolves to, cut to 4000 characters), so the pictures and sounds do not come back that way: each one is
   POSTed as raw bytes to a local receiver at 'http://127.0.0.1:' + window.__recv (a port NUMBER the run script sets), or
   ?fmrecv=<port> on the page address. Without a receiver it renders nothing and says so.

   The run, in a browser slot the API builder has granted (~/.fm-browser-slot), never beside a ship — the helper scratchpad's
   recvshot.sh refuses otherwise, serves this worktree, starts hunt/new-prep's recv.py and prepends window.__recv:
     SP=/mnt/c/Users/build/AppData/Local/Temp/claude/--wsl-localhost-ubuntu-home-ezra-FreeMotion/147c579b-7df6-4fce-ad94-0bfbd1f8c93d/scratchpad
     bash $SP/recvshot.sh fxnew-damage ~/fm-helper-wt/fxnew-damage/tools/design/plans/fxnew-damage/render-probe.js $SP/agents/fxnew-damage/sheet fxnd

   WHAT IT MAKES
   Film Damage — fx-art/clouds.jpg (his photo) centre-cropped to a 720 x 480 project and rendered through FM.renderScene, six
   film frames per row (every 5th film frame at 18 fps, so the wear changes tile to tile), each tile shown at 360 x 240:
     fd-NN-<row>.jpg   one strip per row (2160 x 268, a label band on top)
     fd-sheet-1.jpg / fd-sheet-2.jpg   the rows stacked (each under 3:1 tall, so they reach his phone)
   Rows: the photo; the defaults; each part alone (Scratches, Dust, Hairs, Dirt Dark / Light, Flicker, Gate weave — a 2x crop
   of the middle with a fixed red guide so the wander shows —, Burns, Splice jumps, Colour fade Pink / Sepia / Grey); and five
   combinations offered as starting points (Light wear, Worn print, Silent era, Home movie, Trashed reel).
   Trance Gate — a held synth pad (made here, a C minor chord) and tests/_fixtures/vad/music-only.wav, 8 s, 44.1 kHz stereo,
   through FM.buildAudioFxChain + schedule (the export path), at 120 BPM with Note 1/16:
     tg-pad-original.wav, tg-music-original.wav
     tg-pad-<pattern>.wav and tg-music-<pattern>.wav for all nine patterns
     tg-pad-trance-soft.wav (Attack 12 ms, Release 40 ms), tg-pad-trance-hard.wav (0.5 / 0.5), tg-pad-trance-depth50.wav
     tg-music-stutter-x2 / -x4 / -x8.wav (the gate off, Depth 0: only the stutter) and tg-music-trance-stutter-x4.wav
   The music fixture's own tempo is not known, so on it the gate runs at 120 BPM whatever the song's beat is — the pad is
   the fair listen; set Tempo to the song's BPM in the app to hear it locked. Levels are NOT normalised (an honest A/B).

   Returns { ok, posted: n, errors: [...], ms }. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry && FM.audioFxRegistry && FM.buildAudioFxChain && FM.audioBufferToWav); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.buildAudioFxChain)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('filmdamage') || !FM.audioFxRegistry.get('trancegate')) return { ok: false, error: 'this tree has no Film Damage or no Trance Gate (#966 B7 / B16 are on hunt/fxnew-damage)' };
const qp = (new URLSearchParams(location.search)).get('fmrecv');
const port = (window.__recv && /^\d{2,5}$/.test(String(window.__recv))) ? String(window.__recv) : (qp && /^\d{2,5}$/.test(qp) ? qp : null);
if (!port) return { ok: false, error: 'no receiver: set window.__recv (a port number) or add ?fmrecv=<port> to the page address' };
const RECV = 'http://127.0.0.1:' + port;
const errors = [];
let posted = 0;
async function post(name, blob) {
  try { await (await fetch(RECV + '/' + name, { method: 'POST', body: blob })).text(); posted++; }
  catch (e) { errors.push(name + ': POST failed ' + (e && e.message)); }
}
const jpeg = c => new Promise(ok => c.toBlob(b => ok(b), 'image/jpeg', 0.88));

/* ───────────────────────────── Film Damage ───────────────────────────── */
const PW = 720, PH = 480, TW = 360, TH = 240, BAND = 28, FRAMES = [0, 5, 10, 15, 20, 25];
const photo = await new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no fx-art/clouds.jpg')); im.src = 'fx-art/clouds.jpg?v=1'; }).catch(e => { errors.push(e.message); return null; });
const made = [];
if (photo) {
  // the photo, centre-cropped to the project's 3:2
  const src = document.createElement('canvas'); src.width = PW; src.height = PH;
  { const iw = photo.naturalWidth, ih = photo.naturalHeight, s = Math.min(iw / PW, ih / PH), cw = PW * s, ch = PH * s;
    src.getContext('2d').drawImage(photo, (iw - cw) / 2, (ih - ch) / 2, cw, ch, 0, 0, PW, PH); }
  const mid = '_fxnd_clouds';
  FM.media.set(mid, { kind: 'image', el: src, width: PW, height: PH, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const OFF = { scratches: 0, dust: 0, hair: 0, flicker: 0, weave: 0, burn: 0, splice: 0, fade: 0 };
  const only = o => Object.assign({}, OFF, o);
  const ROWS = [
    ['photo', 'The photo (no effect)', null],
    ['defaults', 'Film Damage at its defaults: Scratches 0.2, Dust 0.3, Hairs 0.1, Flicker 0.2, Gate weave 1.5 px', {}],
    ['scratches', 'Scratches 0.8 (alone)', only({ scratches: 0.8 })],
    ['dust', 'Dust 0.8 (alone)', only({ dust: 0.8 })],
    ['hairs', 'Hairs 0.8 (alone)', only({ hair: 0.8 })],
    ['dirt-dark', 'Dirt: Dark (scratches 0.5, dust 0.6, hairs 0.4)', only({ scratches: 0.5, dust: 0.6, hair: 0.4, speck: 0 })],
    ['dirt-light', 'Dirt: Light (the same marks)', only({ scratches: 0.5, dust: 0.6, hair: 0.4, speck: 1 })],
    ['flicker', 'Flicker 0.8 (alone)', only({ flicker: 0.8 })],
    ['weave', 'Gate weave 8 px (alone) - the middle at 2x, the red line stays put', only({ weave: 8 }), 'zoom'],
    ['burns', 'Burns 0.8 (alone) - a new edge every 40 film frames', only({ burn: 0.8 }), [20, 50, 100, 140, 180, 220]],
    ['splices', 'Splice jumps 1 (alone) - six frames in a row', only({ splice: 1 }), [6, 7, 8, 9, 10, 11]],
    ['fade-pink', 'Colour fade 1, Fades to Pink', only({ fade: 1, fadeto: 0 })],
    ['fade-sepia', 'Colour fade 1, Fades to Sepia', only({ fade: 1, fadeto: 1 })],
    ['fade-grey', 'Colour fade 1, Fades to Grey', only({ fade: 1, fadeto: 2 })],
    ['light-wear', 'Starting point: Light wear', { scratches: 0.15, dust: 0.2, hair: 0.05, flicker: 0.1, weave: 1, burn: 0, splice: 0, fade: 0.15, fadeto: 0 }],
    ['worn-print', 'Starting point: Worn print', { scratches: 0.4, dust: 0.5, hair: 0.2, flicker: 0.3, weave: 2, burn: 0, splice: 0.1, fade: 0.5, fadeto: 0 }],
    ['silent-era', 'Starting point: Silent era (Grey, 16 fps)', { scratches: 0.6, dust: 0.6, hair: 0.3, flicker: 0.6, weave: 3, burn: 0, splice: 0.3, fade: 1, fadeto: 2, rate: 16 }],
    ['home-movie', 'Starting point: Home movie (Sepia, burns)', { scratches: 0.2, dust: 0.3, hair: 0.1, flicker: 0.3, weave: 4, burn: 0.5, splice: 0, fade: 0.6, fadeto: 1 }],
    ['trashed', 'Starting point: Trashed reel', { scratches: 1, dust: 1, hair: 0.8, flicker: 0.8, weave: 6, burn: 0.7, splice: 0.8, fade: 0.7, fadeto: 0 }],
  ];
  const frameCanvas = (params, t) => {
    const L = FM.makeLayer('image', { x: PW / 2, y: PH / 2, start: 0, duration: 30 }); L.id = mid;
    if (params) { const e = FM.fxRegistry.makeInstance('filmdamage'); Object.assign(e.params, params); L.effects = [e]; } else L.effects = [];
    const o = document.createElement('canvas'); o.width = PW; o.height = PH;
    FM.renderScene(o.getContext('2d'), { project: { width: PW, height: PH, fps: 30, duration: 30, background: '#000000' }, layers: [L], selectedId: null, selectedIds: [] }, t);
    return o;
  };
  const strips = [];
  for (let r = 0; r < ROWS.length; r++) {
    const [key, label, params, mode] = ROWS[r];
    const frames = Array.isArray(mode) ? mode : FRAMES;
    const strip = document.createElement('canvas'); strip.width = TW * frames.length; strip.height = TH + BAND;
    const g = strip.getContext('2d');
    g.fillStyle = '#16181d'; g.fillRect(0, 0, strip.width, strip.height);
    g.fillStyle = '#f2f2f2'; g.font = '600 18px system-ui, sans-serif'; g.textBaseline = 'middle';
    g.fillText((r + 1) + '. ' + label, 10, BAND / 2);
    try {
      frames.forEach((f, i) => {
        const fr = frameCanvas(params, (f + 0.5) / 18);
        if (mode === 'zoom') g.drawImage(fr, PW / 4, PH / 4, PW / 2, PH / 2, i * TW, BAND, TW, TH);
        else g.drawImage(fr, 0, 0, PW, PH, i * TW, BAND, TW, TH);
        if (mode === 'zoom') { g.fillStyle = '#ff2a2a'; g.fillRect(i * TW + TW / 2, BAND, 1, TH); }
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(i * TW + 4, BAND + 4, 74, 20); g.fillStyle = '#ffffff'; g.font = '13px system-ui, sans-serif';
        g.fillText('frame ' + f, i * TW + 9, BAND + 14);
      });
    } catch (e) { errors.push(key + ': ' + (e && e.message)); }
    strips.push(strip);
    await post('fd-' + String(r + 1).padStart(2, '0') + '-' + key + '.jpg', await jpeg(strip));
    await sleep(0);
  }
  // two sheets, each under 3:1 tall
  for (const [name, a, b] of [['fd-sheet-1.jpg', 0, 9], ['fd-sheet-2.jpg', 9, strips.length]]) {
    const part = strips.slice(a, b), W = Math.max.apply(null, part.map(s => s.width)), sheet = document.createElement('canvas');
    sheet.width = W; sheet.height = part.reduce((h, s) => h + s.height + 6, 0);
    const g = sheet.getContext('2d'); g.fillStyle = '#0d0e11'; g.fillRect(0, 0, sheet.width, sheet.height);
    let y = 0; part.forEach(s => { g.drawImage(s, 0, y); y += s.height + 6; });
    await post(name, await jpeg(sheet));
  }
}
made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} });

/* ───────────────────────────── Trance Gate / Stutter ───────────────────────────── */
const SR = 44100, SECS = 8;
// a held C minor pad: C3 E♭3 G3 C4, each a few soft partials, slightly detuned left and right, faded in over 60 ms
const pad = (function () {
  const n = SR * SECS, b = new OfflineAudioContext(2, SR, SR).createBuffer(2, n, SR), notes = [130.81, 155.56, 196.0, 261.63];
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c), det = c ? 1.003 : 0.997;
    for (let i = 0; i < n; i++) {
      const t = i / SR; let v = 0;
      for (const f of notes) for (let h = 1; h <= 4; h++) v += Math.sin(2 * Math.PI * f * det * h * t + h) / (h * h);
      d[i] = 0.09 * v * Math.min(1, t / 0.06);
    }
  }
  return b;
})();
let music = null;
try { const ab = await (await fetch('tests/_fixtures/vad/music-only.wav')).arrayBuffer(); music = await new OfflineAudioContext(2, SR, SR).decodeAudioData(ab); }
catch (e) { errors.push('music-only.wav: ' + (e && e.message)); }
const inst = p => { const i = FM.audioFxRegistry.makeInstance('trancegate'); Object.assign(i.params, { bpm: 120, note: 6 }, p || {}); return i; };
async function render(src, fx) {
  const n = Math.min(src.length, SECS * SR) | 0, oac = new OfflineAudioContext(2, n, SR);
  const s = oac.createBufferSource(); s.buffer = src;
  const chain = fx ? FM.buildAudioFxChain(oac, { audioFx: [fx] }, 0) : null;
  if (chain) { s.connect(chain.input); chain.output.connect(oac.destination); chain.schedule(0, n / SR); } else s.connect(oac.destination);
  s.start(0);
  const out = await oac.startRendering();
  if (chain) try { chain.dispose(); } catch (e) {}
  return FM.audioBufferToWav(out);
}
const NAMES = ['eighths', '16ths', 'offbeat', 'trance', 'dotted', 'long', 'triplets', 'half-time', 'random'];
const jobs = [['tg-pad-original.wav', pad, null]];
if (music) jobs.push(['tg-music-original.wav', music, null]);
NAMES.forEach((nm, k) => { jobs.push(['tg-pad-' + nm + '.wav', pad, inst({ pattern: k })]); if (music) jobs.push(['tg-music-' + nm + '.wav', music, inst({ pattern: k })]); });
jobs.push(['tg-pad-trance-soft.wav', pad, inst({ pattern: 3, attack: 12, release: 40 })]);
jobs.push(['tg-pad-trance-hard.wav', pad, inst({ pattern: 3, attack: 0.5, release: 0.5 })]);
jobs.push(['tg-pad-trance-depth50.wav', pad, inst({ pattern: 3, depth: 0.5 })]);
if (music) {
  [[1, 'x2'], [2, 'x4'], [3, 'x8']].forEach(([st, nm]) => jobs.push(['tg-music-stutter-' + nm + '.wav', music, inst({ depth: 0, stutter: st })]));
  jobs.push(['tg-music-trance-stutter-x4.wav', music, inst({ pattern: 3, stutter: 2 })]);
}
for (const [name, src, fx] of jobs) {
  try { await post(name, await render(src, fx)); } catch (e) { errors.push(name + ': ' + (e && e.message)); }
  await sleep(0);
}
return { ok: !errors.length, posted: posted, errors: errors.slice(0, 8), ms: Date.now() - t0 };
