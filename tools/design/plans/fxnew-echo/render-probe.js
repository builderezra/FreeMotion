/* render-probe.js — the #545 options sheet for #966 B3 Time Echo and B6 Star Shine, rendered through the APP'S OWN compositor
   (FM.renderScene), so what he picks from is what the app draws. For tools/shot.py --js-file, in the next browser slot. Nothing in
   the app is changed: the subjects are throwaway layers and media records, removed again at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY. shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to — cut at 4000 characters — so the pictures do not come back that way. Each sheet is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the sheets stay on window.__fmNewEcho as data URLs and only the summary returns.

   Sheets (each well under 3x as tall as wide, so they reach his phone — the tall-images lesson):
     echo-strips.jpg      Time Echo: one row per variant, a strip of four moments (0.4, 0.8, 1.2, 1.6 s) of a spinning star that
                          swoops across a dark frame. Row 1 is the effect off, for comparison.
     starshine-dusk.jpg   Star Shine on fx-art/dusk.jpg (lamps on a dark street — the night-lights picture): the photo, then
                          every variant; the Sparkle variant is shown at two moments.
     starshine-clouds.jpg the same on his clouds photo (fx-art/clouds.jpg) — a bright sky, where Threshold matters most.
   The variants are the effects' own options, so his pick sets DEFAULTS: no rebuild. "RECOMMENDED" marks the builder's pick. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('timeecho') || !FM.fxRegistry.get('starglow')) return { ok: false, error: 'this tree has no timeecho / starglow — serve hunt/fxnew-echo' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];

const fx = (type, over) => { const e = FM.fxRegistry.makeInstance(type); Object.assign(e.params, over || {}); return e; };
const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function render(layers, W, H, t, bg) {
  const c = canvas(W, H);
  FM.renderScene(c.getContext('2d'), { project: { width: W, height: H, fps: 30, duration: 4, background: bg || '#0d1220' }, layers: layers, selectedId: null, selectedIds: [] }, t);
  return c;
}
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

/* ───────────────────────── Time Echo: strips of a moving star ───────────────────────── */
const EW = 240, EH = 135, TIMES = [0.4, 0.8, 1.2, 1.6];
function mover(effect) {
  const L = FM.makeLayer('shape', { shape: 'star', x: 30, y: 70, shapeW: 46, shapeH: 46, fill: '#ffd24a' });
  L.start = 0; L.duration = 4;
  const lin = (t, v) => ({ t: t, v: v, e: 'linear' });
  L.transform.x = { kf: [lin(0, 30), lin(2, 210)] };
  L.transform.y = { kf: [lin(0, 95), lin(0.5, 40), lin(1, 95), lin(1.5, 40), lin(2, 95)] };   // a swoop: up and down twice
  L.transform.rotation = { kf: [lin(0, 0), lin(2, 220)] };
  L.effects = effect ? [effect] : [];
  return L;
}
const REC = 'RECOMMENDED';   // a row/tile whose name ends with this is drawn with it on its own line, in gold
const ECHO_ROWS = [
  ['Effect off (for comparison)', null],
  ['Defaults: 4 echoes, 0.1 s, Decay 60 %, Behind ' + REC, {}],
  ['8 echoes, 0.05 s apart (a smooth smear)', { count: 8, spacing: 0.05 }],
  ['3 echoes, 0.25 s apart (separate ghosts)', { count: 3, spacing: 0.25 }],
  ['12 echoes, Decay 85 % (a long tail)', { count: 12, spacing: 0.06, decay: 85 }],
  ['Where it is going (echoes ahead)', { dir: 1 }],
  ['In front + Screen (glowing over it)', { order: 1, blend: 2 }],
  ['Add (light painting)', { count: 8, spacing: 0.05, blend: 1, decay: 75 }],
  ['Tint: Colour (cyan, oldest bluest)', { tint: 1 }],
  ['Tint: Rainbow', { count: 6, tint: 2 }],
  ['Difference (psychedelic)', { blend: 5, count: 5 }],
  ['Strength 50 % (fainter echoes)', { start: 50 }],
];
const LABEL_W = 300, PAD = 8, HEAD = 44;
const echoSheet = canvas(LABEL_W + TIMES.length * (EW + PAD) + PAD, HEAD + ECHO_ROWS.length * (EH + PAD) + PAD);
{
  const g = echoSheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, echoSheet.width, echoSheet.height);
  label(g, 'Time Echo (#966 B3) — each row is one setting, at 0.4 / 0.8 / 1.2 / 1.6 s', PAD, 12, 18, '#ffffff');
  for (let r = 0; r < ECHO_ROWS.length; r++) {
    const [name, over] = ECHO_ROWS[r], y = HEAD + r * (EH + PAD);
    nameLabel(g, name, PAD, y + EH / 2 - 26, 15, LABEL_W - 2 * PAD);
    const ts = Date.now();
    for (let k = 0; k < TIMES.length; k++) {
      try { g.drawImage(render([mover(over ? fx('timeecho', over) : null)], EW, EH, TIMES[k]), LABEL_W + k * (EW + PAD), y); }
      catch (e) { errors.push('echo ' + name + ' @' + TIMES[k] + ': ' + (e && e.message)); }
    }
    timing['echo: ' + name] = Math.round((Date.now() - ts) / TIMES.length);
    await sleep(0);
  }
}

/* ───────────────────────── Star Shine: variants on his photographs ───────────────────────── */
const photos = {};
function loadPhoto(key) {
  if (!photos[key]) photos[key] = new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1'; });
  return photos[key];
}
async function photoTile(key, effect, S, t) {
  const im = await loadPhoto(key), side = Math.min(im.naturalWidth, im.naturalHeight);
  const c = canvas(S, S);
  c.getContext('2d').drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, S, S);
  if (!effect) return c;
  const mid = '_fxnewecho_' + key + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: S, height: S, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: S / 2, y: S / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = [effect];
  return render([L], S, S, t == null ? 0.5 : t, '#000000');
}
const STAR_TILES = [
  ['The photo, no effect', null],
  ['Defaults: 4 rays at 45°, 60 px, Threshold 70 % ' + REC, {}],
  ['6 rays', { arms: 1 }],
  ['8 rays', { arms: 2 }],
  ['4 rays, Rotation 0 (a plus)', { angle: 0 }],
  ['Ray length 140 px', { length: 140 }],
  ['Ray length 25 px (tight)', { length: 25 }],
  ['Threshold 85 % (only the brightest)', { threshold: 85 }],
  ['Threshold 55 % (more of the picture)', { threshold: 55 }],
  ['Strength 0.5', { amount: 0.5 }],
  ['Strength 2', { amount: 2 }],
  ['Chosen colour (gold)', { from: 1, color: '#ffd27a' }],
  ['Spectrum (rainbow fringe)', { from: 2 }],
  ['Sparkle 100 % — 0.3 s', { twinkle: 100 }, 0.3],
  ['Sparkle 100 % — 0.6 s', { twinkle: 100 }, 0.6],
  ['Spin 45°/s — 1 s in', { spin: 45 }, 1],
];
const S = 300, COLS = 4, SL = 48, SP = 10;   // SL: room for a two-line name and the RECOMMENDED line above each tile
async function starSheet(key) {
  const rows = Math.ceil(STAR_TILES.length / COLS);
  const sheet = canvas(SP + COLS * (S + SP), 46 + rows * (S + SL + SP));
  const g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Star Shine (#966 B6) on ' + key + '.jpg', SP, 12, 18, '#ffffff');
  for (let i = 0; i < STAR_TILES.length; i++) {
    const [name, over, t] = STAR_TILES[i], x = SP + (i % COLS) * (S + SP), y = 46 + Math.floor(i / COLS) * (S + SL + SP);
    const ts = Date.now();
    try { g.drawImage(await photoTile(key, over ? fx('starglow', over) : null, S, t), x, y + SL); }
    catch (e) { errors.push('star ' + key + ' ' + name + ': ' + (e && e.message)); }
    timing['star ' + key + ': ' + name] = Date.now() - ts;
    nameLabel(g, name, x, y + 2, 13, S);
    await sleep(0);
  }
  return sheet;
}

const out = {}, sheets = {};
try {
  sheets['echo-strips.jpg'] = echoSheet;
  for (const key of ['dusk', 'clouds']) sheets['starshine-' + key + '.jpg'] = await starSheet(key);
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewEcho = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest settings, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, ctxFilterOK: FM.ctxFilterOK ? FM.ctxFilterOK() : null, errors: errors.slice(0, 6), ms: Date.now() - t0 };
