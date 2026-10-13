/* render-probe.js — the #545 options sheet for #966 B11, the Music Visualiser, rendered through the APP'S OWN compositor
   (FM.renderScene) over a real piece of music, so what he picks from is what the app draws. For tools/shot.py --js-file, in the
   next browser slot. Nothing in the app is changed: the subjects are throwaway layers and media records, removed again at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY. shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to — cut at 4000 characters — so the pictures do not come back that way. Each sheet is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the sheets stay on window.__fmNewSpectrum as data URLs and only the summary returns.

   The music is tests/_fixtures/vad/music-only.wav (the clip the sounds probe uses), decoded the way the app decodes a song and put on
   a picture-less 'video' layer — exactly what an imported mp3 is. The visualiser sits on a rectangle that fills most of each tile.

   Sheets (each well under 3x as tall as wide, so they reach his phone — the tall-images lesson):
     spectrum-styles.jpg   one row per Style (Bars, Mirror bars, Line, Filled wave, Circle, Dots), a strip of four moments of the
                           music across each row, at every other setting's default. Row 1 is the plain rectangle, for comparison.
     spectrum-options.jpg  the other choices at one loud moment: the four Colour modes, Bands, Bar width, Ends, Sensitivity, Treble
                           lift, Lowest / Highest pitch, Circle size, Resting height, and Fall time as a pair of moments.
   The variants are the effect's own options, so his pick sets DEFAULTS: no rebuild. "RECOMMENDED" marks the builder's pick. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('audiospectrum') || !FM.audioSpectrum) return { ok: false, error: 'this tree has no audiospectrum — serve hunt/fxnew-spectrum' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];

const fx = (over) => { const e = FM.fxRegistry.makeInstance('audiospectrum'); Object.assign(e.params, over || {}); return e; };
const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function label(g, text, x, y, size, colour) { g.font = '600 ' + (size || 15) + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(text, x, y); }
/* a name, and RECOMMENDED under it in gold when the name ends with it; long names wrap at `maxW` (two lines at most) */
function nameLabel(g, text, x, y, size, maxW) {
  const rec = / RECOMMENDED$/.test(text), name = rec ? text.replace(/ RECOMMENDED$/, '') : text;
  g.font = '600 ' + size + 'px system-ui, sans-serif';
  const words = name.split(' '), lines = [''];
  words.forEach(w => { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (g.measureText(tryL).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tryL; });
  lines.slice(0, 2).forEach((l, i) => label(g, l, x, y + i * (size + 3), size));
  if (rec) label(g, '★ RECOMMENDED', x, y + Math.min(2, lines.length) * (size + 3), size, '#ffd24a');
}
async function post(name, sheet) {
  const blob = await new Promise(r => sheet.toBlob(r, 'image/jpeg', Q));
  if (!RECV) return 'kept on window (no receiver)';
  try { const res = await fetch(RECV + '/' + name, { method: 'POST', body: blob }); return res.ok ? 'posted ' + blob.size + ' B' : 'POST HTTP ' + res.status; }
  catch (e) { return 'POST failed: ' + (e && e.message); }
}

/* ───────────────────────── the music: a song clip, decoded ───────────────────────── */
let song = null, dur = 4;
try {
  const ab = await (await fetch('tests/_fixtures/vad/music-only.wav')).arrayBuffer();
  const buf = await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(ab);   // decodeAudioData keeps the file's channels
  dur = buf.duration;
  FM.media.set('_fxnewspec_song', { kind: 'video', width: 0, height: 0, duration: buf.duration, audioBuffer: buf });
  if (FM.media.pin) FM.media.pin('_fxnewspec_song');
  made.push('_fxnewspec_song');
  song = FM.makeLayer('video', { name: 'music', start: 0, duration: buf.duration });
  song.id = '_fxnewspec_song'; song.start = 0; song.duration = buf.duration; song.trimStart = 0;
} catch (e) { return { ok: false, error: 'could not load music-only.wav: ' + (e && e.message) }; }

const TW = 240, TH = 135;   // one tile, 16:9
function host(effect, o) {
  o = o || {};
  const L = FM.makeLayer('shape', { shape: 'rect', x: TW / 2, y: TH / 2 + 4, shapeW: o.w || 208, shapeH: o.h || 104, fill: o.fill || '#2fd0b5' });
  L.start = 0; L.duration = Math.max(4, dur);
  if (o.gradient) L.fillGradient = { enabled: true, type: 'linear', angle: 90, c0: '#ff5ea8', c1: '#3d7bff' };
  L.effects = effect ? [effect] : [];
  return L;
}
function render(effect, t, o) {
  const c = canvas(TW, TH);
  FM.renderScene(c.getContext('2d'), { project: { width: TW, height: TH, fps: 30, duration: Math.max(4, dur), background: '#0d1220' }, layers: [host(effect, o), song], selectedId: null, selectedIds: [] }, t);
  return c;
}

/* ───────────────────────── sheet 1: each Style as a strip over the music ───────────────────────── */
const REC = 'RECOMMENDED';
const TIMES = [0.2, 0.4, 0.6, 0.8].map(f => +(f * dur).toFixed(2));
const STYLE_ROWS = [
  ['The rectangle, no effect', null],
  ['Bars (defaults) ' + REC, {}],
  ['Mirror bars', { style: 1 }],
  ['Line', { style: 2 }],
  ['Filled wave', { style: 3 }],
  ['Circle', { style: 4 }],
  ['Dots', { style: 5 }],
];
const LABEL_W = 260, PAD = 8, HEAD = 44;
const styleSheet = canvas(LABEL_W + TIMES.length * (TW + PAD) + PAD, HEAD + STYLE_ROWS.length * (TH + PAD) + PAD);
{
  const g = styleSheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, styleSheet.width, styleSheet.height);
  label(g, 'Music Visualiser (#966 B11) — each row is one Style, at ' + TIMES.map(t => t + ' s').join(' / ') + ' of the music', PAD, 12, 18, '#ffffff');
  for (let r = 0; r < STYLE_ROWS.length; r++) {
    const [name, over] = STYLE_ROWS[r], y = HEAD + r * (TH + PAD);
    nameLabel(g, name, PAD, y + TH / 2 - 26, 15, LABEL_W - 2 * PAD);
    for (let k = 0; k < TIMES.length; k++) {
      const ts = performance.now();
      try { g.drawImage(render(over ? fx(over) : null, TIMES[k]), LABEL_W + k * (TW + PAD), y); }
      catch (e) { errors.push('style ' + name + ' @' + TIMES[k] + ': ' + (e && e.message)); }
      timing['style ' + name + ' @' + TIMES[k]] = Math.round(performance.now() - ts);
    }
    await sleep(0);
  }
}

/* ───────────────────────── sheet 2: the other choices at one loud moment ───────────────────────── */
/* the loudest moment of the music on the defaults' own reading, so every option has something to show */
let loudT = TIMES[1], loudSum = -1;
for (let t = 0.3; t < dur - 0.3; t += 0.25) {
  const lv = FM.audioSpectrum.levels({ layers: [song] }, fx().params, t);
  const s = lv ? Array.prototype.reduce.call(lv, (a, v) => a + v, 0) : 0;
  if (s > loudSum) { loudSum = s; loudT = +t.toFixed(2); }
}
const OPT_TILES = [
  ['From the layer — a plain teal rectangle ' + REC, {}],
  ['From the layer — a rectangle with a gradient fill', {}, { gradient: true }],
  ['One colour (white)', { colormode: 1, color: '#ffffff' }],
  ['Gradient (teal to pink)', { colormode: 2 }],
  ['Rainbow', { colormode: 3 }],
  ['Rainbow, Circle', { colormode: 3, style: 4 }],
  ['16 bands', { bands: 16 }],
  ['64 bands', { bands: 64 }],
  ['128 bands, Line', { bands: 128, style: 2 }],
  ['Bar width 100 % (no gaps)', { barw: 100 }],
  ['Bar width 35 % (thin)', { barw: 35 }],
  ['Square ends', { round: 0 }],
  ['Sensitivity 50 %', { gain: 50 }],
  ['Sensitivity 200 %', { gain: 200 }],
  ['Treble lift 0 % (as recorded)', { tilt: 0 }],
  ['Treble lift 100 %', { tilt: 100 }],
  ['Pitch 40 Hz – 4 kHz (bass and voice)', { maxfreq: 4000 }],
  ['Pitch 200 Hz – 16 kHz (no deep bass)', { minfreq: 200 }],
  ['Circle size 20 %', { style: 4, inner: 20 }],
  ['Circle size 70 %', { style: 4, inner: 70 }],
  ['Resting height 12 %', { base: 12 }],
  ['Dots, square', { style: 5, round: 0 }],
  ['Fall time 0 — 0.15 s after the moment', { release: 0 }, null, 0.15],
  ['Fall time 800 ms — 0.15 s after', { release: 800 }, null, 0.15],
];
const COLS = 4, SL = 48, SP = 10;   // SL: room for a two-line name and the RECOMMENDED line above each tile
const optRows = Math.ceil(OPT_TILES.length / COLS);
const optSheet = canvas(SP + COLS * (TW + SP), 46 + optRows * (TH + SL + SP));
{
  const g = optSheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, optSheet.width, optSheet.height);
  label(g, 'Music Visualiser (#966 B11) — the other choices, at ' + loudT + ' s (Bars unless named)', SP, 12, 18, '#ffffff');
  for (let i = 0; i < OPT_TILES.length; i++) {
    const [name, over, o, dt] = OPT_TILES[i], x = SP + (i % COLS) * (TW + SP), y = 46 + Math.floor(i / COLS) * (TH + SL + SP);
    const ts = performance.now();
    try { g.drawImage(render(fx(over), loudT + (dt || 0), o || {}), x, y + SL); }
    catch (e) { errors.push('option ' + name + ': ' + (e && e.message)); }
    timing['option ' + name] = Math.round(performance.now() - ts);
    nameLabel(g, name, x, y + 2, 13, TW);
    await sleep(0);
  }
}

/* ───────────────────────── what a frame costs, on this machine ───────────────────────── */
FM.audioSpectrum.clear();
const f0 = FM.audioSpectrum.stats().ffts;
let ts = performance.now(); render(fx(), loudT); const coldMs = Math.round(performance.now() - ts);
const f1 = FM.audioSpectrum.stats().ffts;
ts = performance.now(); for (let k = 1; k <= 30; k++) render(fx(), loudT + k / 30); const warmMs = +((performance.now() - ts) / 30).toFixed(2);
const f2 = FM.audioSpectrum.stats().ffts;

const out = {}, sheets = { 'spectrum-styles.jpg': styleSheet, 'spectrum-options.jpg': optSheet };
try {
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewSpectrum = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the frame cost, the slowest tiles, errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 5).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  music: dur.toFixed(2) + ' s', loudest: loudT, cost: { coldFrameMs: coldMs, coldFfts: f1 - f0, playingFrameMs: warmMs, playingFftsPerFrame: +((f2 - f1) / 30).toFixed(2) },
  slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
