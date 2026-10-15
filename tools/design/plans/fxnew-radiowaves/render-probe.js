/* render-probe.js — the #545 options sheet for #966 B28 Radio Waves, rendered through the APP'S OWN compositor (FM.renderScene), so
   what he picks from is what the app draws. For tools/shot.py --js-file, in the next browser slot. Nothing in the app is changed: the
   subjects are throwaway layers and media records, removed again at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY. shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to — cut at 4000 characters — so the pictures do not come back that way. Each sheet is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the page
   address works too. Without a receiver the sheets stay on window.__fmNewRadio as data URLs and only the summary returns.

   Every tile is a 1080 x 1080 project drawn at a quarter (270 x 270 — the phone's own reduced-plate path, so it is the export shrunk):
   the Speed and Width numbers mean what they mean on his real 1080-wide projects. Each row is ONE setting as a strip of four moments
   (0, 0.4, 0.8 and 1.2 s into the clip), so the motion reads on a still sheet. Sheets (each well under 3x as tall as wide, so they
   reach his phone — the tall-images lesson):
     radiowaves-rings.jpg    Rate, Speed, Lifetime, Width, Fade, First frame, a single wave, Filled, Rainbow, the centre moved
     radiowaves-shapes.jpg   Square, diamond, triangle, hexagon, octagon, 12 sides, Spin, Filled and Rainbow polygons
     radiowaves-layers.jpg   Draw and Blend over his clouds photo and over a round 'logo': Over / Add / Screen / Behind /
                             Instead of / Cut from the layer
   The variants are the effect's own options, so his pick sets DEFAULTS: no rebuild. "RECOMMENDED" marks the builder's pick.
   A FRESH Image is loaded for every photo tile (never one decoded image shared across renders). */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('radiowaves')) return { ok: false, error: 'this tree has no radiowaves — serve hunt/fxnew-radiowaves' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];

const P = 1080, RS = 0.25, TILE = Math.round(P * RS), TIMES = [0, 0.4, 0.8, 1.2];
const fx = over => { const e = FM.fxRegistry.makeInstance('radiowaves'); Object.assign(e.params, over || {}); return e; };
const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function render(layers, t) {
  const c = canvas(TILE, TILE);
  c.__fmRS = RS; c.__fmOX = 0; c.__fmOY = 0;   // the reduced plate: the 1080 project drawn at a quarter, as on his phone
  FM.renderScene(c.getContext('2d'), { project: { width: P, height: P, fps: 30, duration: 4, background: '#05070c' }, layers: layers, selectedId: null, selectedIds: [] }, t);
  return c;
}
function label(g, text, x, y, size, colour) { g.font = '600 ' + (size || 15) + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(text, x, y); }
/* a name, and RECOMMENDED under it in gold when the name ends with it; long names wrap at `maxW` (three lines at most) */
function nameLabel(g, text, x, y, size, maxW) {
  const rec = / RECOMMENDED$/.test(text), name = rec ? text.replace(/ RECOMMENDED$/, '') : text;
  g.font = '600 ' + size + 'px system-ui, sans-serif';
  const words = name.split(' '), lines = [''];
  words.forEach(w => { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (g.measureText(tryL).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tryL; });
  lines.slice(0, 3).forEach((l, i) => label(g, l, x, y + i * (size + 3), size));
  if (rec) label(g, '★ RECOMMENDED', x, y + Math.min(3, lines.length) * (size + 3), size, '#ffd24a');
}
async function post(name, sheet) {
  const blob = await new Promise(r => sheet.toBlob(r, 'image/jpeg', Q));
  if (!RECV) return 'kept on window (no receiver)';
  try { const res = await fetch(RECV + '/' + name, { method: 'POST', body: blob }); return res.ok ? 'posted ' + blob.size + ' B' : 'POST HTTP ' + res.status; }
  catch (e) { return 'POST failed: ' + (e && e.message); }
}

/* the subjects: a dark navy layer filling the frame; a round white 'logo' in the middle of the dark frame; his clouds photo */
function backdrop(effect) {
  const L = FM.makeLayer('shape', { shape: 'rect', x: P / 2, y: P / 2, shapeW: P, shapeH: P, fill: '#0d1626' });
  L.start = 0; L.duration = 4; L.effects = effect ? [effect] : [];
  return [L];
}
function logo(effect) {
  const L = FM.makeLayer('shape', { shape: 'ellipse', x: P / 2, y: P / 2, shapeW: 300, shapeH: 300, fill: '#f4f1e8' });
  L.start = 0; L.duration = 4; L.effects = effect ? [effect] : [];
  const bg = FM.makeLayer('shape', { shape: 'rect', x: P / 2, y: P / 2, shapeW: P, shapeH: P, fill: '#0d1626' });
  bg.start = 0; bg.duration = 4;
  return [L, bg];
}
/* a FRESH Image for every call — the photo is decoded anew for each tile and dropped with its media record at the end */
function freshPhoto(key) {
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1&fresh=' + made.length + '_' + Date.now(); });
}
async function photo(key, effect) {
  const im = await freshPhoto(key), side = Math.min(im.naturalWidth, im.naturalHeight);
  const c = canvas(P, P);
  c.getContext('2d').drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, P, P);
  const mid = '_fxnewradio_' + key + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: P, height: P, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: P / 2, y: P / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = effect ? [effect] : [];
  return [L];
}

const REC = 'RECOMMENDED';   // a row whose name ends with this is drawn with it on its own line, in gold
const SHEETS = {
  'radiowaves-rings.jpg': ['Radio Waves (#966 B28) — rings: each row is one setting at 0 / 0.4 / 0.8 / 1.2 s, a 1080 frame', [
    ['Defaults: 1.5 a second, Speed 200 px/s, Lifetime 3 s, Width 10 px, Fade 100 %, Already full ' + REC, {}],
    ['First frame Empty (the first wave leaves the centre at 0 s)', { prefill: 0 }],
    ['Slow and far apart: 0.6 a second, Speed 120, Lifetime 5 s', { rate: 0.6, speed: 120, lifetime: 5 }],
    ['Fast and close: 4 a second, Speed 300, Lifetime 2 s', { rate: 4, speed: 300, lifetime: 2 }],
    ['Thick: Width 40 px', { width: 40 }],
    ['Hairline: Width 3 px', { width: 3 }],
    ['No fade (Fade 0): full strength, then gone', { fade: 0 }],
    ['Fade 40 %: strong, fading only near the end', { fade: 40 }],
    ['A single wave (Waves per second 0)', { rate: 0, prefill: 0, speed: 400 }],
    ['Filled (discs, not outlines)', { style: 1 }],
    ['Rainbow (each ring its own colour)', { colormode: 1 }],
    ['Centre low (Y 85 %): a signal from the bottom', { y: 85, speed: 260 }],
  ], backdrop],
  'radiowaves-shapes.jpg': ['Radio Waves (#966 B28) — shapes: each row is one setting at 0 / 0.4 / 0.8 / 1.2 s, a 1080 frame', [
    ['Square', { shape: 1 }],
    ['Square turned 45° (diamonds)', { shape: 1, angle: 45 }],
    ['Square, Spin 45°/s (each wave turns as it travels)', { shape: 1, spin: 45 }],
    ['Triangle (Polygon, 3 sides)', { shape: 2, sides: 3 }],
    ['Hexagon (Polygon, 6 sides) ' + REC, { shape: 2, sides: 6 }],
    ['Octagon (Polygon, 8 sides)', { shape: 2, sides: 8 }],
    ['12 sides (nearly round, a little faceted)', { shape: 2, sides: 12 }],
    ['Hexagon, Spin 60°/s', { shape: 2, sides: 6, spin: 60 }],
    ['Triangle, Spin −90°/s, Width 24', { shape: 2, sides: 3, spin: -90, width: 24 }],
    ['Pentagon, Filled, Rainbow', { shape: 2, sides: 5, style: 1, colormode: 1 }],
    ['Square, Rainbow, fast (3 a second, 320 px/s)', { shape: 1, colormode: 1, rate: 3, speed: 320 }],
    ['Filled squares', { shape: 1, style: 1 }],
  ], backdrop],
  'radiowaves-layers.jpg': ['Radio Waves (#966 B28) — Draw and Blend: over his clouds photo and a round logo, at 0 / 0.4 / 0.8 / 1.2 s', [
    ['Photo — Over the layer, Normal ' + REC, { place: 0 }, 'photo'],
    ['Photo — Over, Add (glowing)', { place: 0, blend: 1 }, 'photo'],
    ['Photo — Over, Screen (softer glow)', { place: 0, blend: 2 }, 'photo'],
    ['Photo — white waves, Add, Width 24', { place: 0, blend: 1, color: '#ffffff', width: 24 }, 'photo'],
    ['Logo — Over the layer (waves cross it)', { place: 0, color: '#ff5e7a' }, 'logo'],
    ['Logo — Behind the layer (waves come out from behind it)', { place: 1, color: '#ff5e7a' }, 'logo'],
    ['Photo — Instead of the layer (the waves alone)', { place: 2 }, 'photo'],
    ['Photo — Cut from the layer (the photo seen through the waves)', { place: 3, width: 40 }, 'photo'],
    ['Photo — Cut from the layer, Filled', { place: 3, style: 1 }, 'photo'],
    ['Photo — Cut from the layer, hexagons, Width 60', { place: 3, shape: 2, sides: 6, width: 60 }, 'photo'],
  ], null],
};
const LABEL_W = 300, PAD = 8, HEAD = 44;
async function sheetOf(file) {
  const [title, rows, subject] = SHEETS[file];
  const sheet = canvas(LABEL_W + TIMES.length * (TILE + PAD) + PAD, HEAD + rows.length * (TILE + PAD) + PAD);
  const g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, title, PAD, 12, 18, '#ffffff');
  for (let r = 0; r < rows.length; r++) {
    const [name, over, kind] = rows[r], y = HEAD + r * (TILE + PAD);
    nameLabel(g, name, PAD, y + TILE / 2 - 34, 15, LABEL_W - 2 * PAD);
    const ts = Date.now();
    for (let k = 0; k < TIMES.length; k++) {
      try {
        const layers = kind === 'photo' ? await photo('clouds', fx(over)) : (kind === 'logo' ? logo(fx(over)) : subject(fx(over)));
        g.drawImage(render(layers, TIMES[k]), LABEL_W + k * (TILE + PAD), y);
        // a 1080 x 1080 photo record is 4.6 MB: let each one go as soon as its tile is drawn
        if (kind === 'photo') { const id = made.pop(); try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }
      } catch (e) { errors.push(file + ' ' + name + ' @' + TIMES[k] + ': ' + (e && e.message)); }
    }
    timing[file + ': ' + name] = Math.round((Date.now() - ts) / TIMES.length);
    await sleep(0);
  }
  return sheet;
}

const out = {}, sheets = {};
try {
  for (const file of Object.keys(SHEETS)) sheets[file] = await sheetOf(file);
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewRadio = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest settings (ms per frame at a quarter
   of 1080), how many rings the defaults draw at 1.2 s (FM._radioWaveRings), any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
const ringsAtDefaults = FM._radioWaveRings ? FM._radioWaveRings(FM.fxRegistry.makeInstance('radiowaves').params, 1.2, 0).map(r => Math.round(r.dist)) : null;
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, ringsAtDefaults: ringsAtDefaults, errors: errors.slice(0, 6), ms: Date.now() - t0 };
