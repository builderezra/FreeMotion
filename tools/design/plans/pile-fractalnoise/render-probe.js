/* render-probe.js — the #545 options sheet for #966 B38 Fractal Noise (hunt/pile-fractalnoise, ported from ChatGPT's pile fcda7fd2 with
   LAND-LIST §B6's fix), rendered through the APP'S OWN compositor (FM.renderScene), so what he picks from is what the app draws. For
   tools/shot.py --js-file, in the next browser slot. Nothing in the app is changed: the subjects are throwaway layers and media records,
   removed again at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY. shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to — cut at 4000 characters — so the pictures do not come back that way. Each sheet is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the page
   address works too. Without a receiver the sheets stay on window.__fmNewFractal as data URLs and only the summary returns.

   Every look tile is a 1080 x 1080 project drawn at a quarter (270 x 270 — the phone's own reduced-plate path, so it is the export
   shrunk): Scale means what it means on his real 1080-wide projects. Each row is ONE setting as a strip of four moments (0, 0.6, 1.2
   and 1.8 s into the clip), so Evolution reads on a still sheet. Sheets (each under 3x as tall as wide, so they reach his phone):
     fractalnoise-patterns.jpg  the four Patterns, Scale, Octaves, Contrast and Evolution, white on black (the defaults' colours)
     fractalnoise-looks.jpg     Blend over his clouds photo, and coloured looks (smoke, fire, marble, sky) on a dark frame
     fractalnoise-fix.jpg       THE FIX, at the export's own size (1080 x 1350, plate scale 1): the same settings drawn by this branch's
                                kernel and by the pile's (a copy of fcda7fd2's kernel, below — reference only, never in the app), a
                                270 x 270 crop at 1:1 and a 90 x 90 crop blown up 3x with no smoothing, so the pixel-level detail shows
   The variants are the effect's own options, so his pick sets DEFAULTS: no rebuild. "RECOMMENDED" marks the builder's pick.
   A FRESH Image is loaded for every photo tile (never one decoded image shared across renders). */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('fractalnoise')) return { ok: false, error: 'this tree has no fractalnoise — serve hunt/pile-fractalnoise' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];

const P = 1080, RS = 0.25, TILE = Math.round(P * RS), TIMES = [0, 0.6, 1.2, 1.8];
const fx = over => { const e = FM.fxRegistry.makeInstance('fractalnoise'); Object.assign(e.params, over || {}); return e; };
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

/* the subjects: a dark navy layer filling the frame (the noise replaces it at Normal 100 %); his clouds photo */
function dark(effect) {
  const L = FM.makeLayer('shape', { shape: 'rect', x: P / 2, y: P / 2, shapeW: P, shapeH: P, fill: '#0d1626' });
  L.start = 0; L.duration = 4; L.effects = effect ? [effect] : [];
  return [L];
}
/* a FRESH Image for every call — the photo is decoded anew for each tile and dropped with its media record at the end */
function freshPhoto(key) {
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1&fresh=' + made.length + '_' + Date.now(); });
}
async function photo(key, effect) {
  const im = await freshPhoto(key), side = Math.min(im.naturalWidth, im.naturalHeight);
  const c = canvas(P, P);
  c.getContext('2d').drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, P, P);
  const mid = '_fxnewfractal_' + key + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: P, height: P, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: P / 2, y: P / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = effect ? [effect] : [];
  return [L];
}

const REC = 'RECOMMENDED';   // a row whose name ends with this is drawn with it on its own line, in gold
const SHEETS = {
  'fractalnoise-patterns.jpg': ['Fractal Noise (#966 B38) — each row is one setting at 0 / 0.6 / 1.2 / 1.8 s, a 1080 frame', [
    ['Defaults: Basic, Scale 100 px, 4 octaves, Contrast 100 %, Evolution 0.5 /s ' + REC, {}],
    ['Turbulent (billows split by sharp dark creases)', { pattern: 1 }],
    ['Smooth (the finer layers fainter)', { pattern: 2 }],
    ['Ridged (thin bright ridges)', { pattern: 3 }],
    ['Scale 40 px (smaller shapes)', { scale: 40 }],
    ['Scale 260 px (big soft shapes)', { scale: 260 }],
    ['Octaves 1 (one soft layer)', { octaves: 1 }],
    ['Octaves 6 (the most fine detail)', { octaves: 6 }],
    ['Contrast 50 % (misty)', { contrast: 50 }],
    ['Contrast 220 % (hard-edged blobs)', { contrast: 220 }],
    ['Evolution 2 /s (fast drift)', { evolution: 2 }],
    ['Evolution −1 /s (the other way)', { evolution: -1 }],
  ], 'dark'],
  'fractalnoise-looks.jpg': ['Fractal Noise (#966 B38) — Blend over his clouds photo, and coloured looks, at 0 / 0.6 / 1.2 / 1.8 s', [
    ['Photo — Normal, Amount 100 % (the noise replaces the picture)', {}, 'photo'],
    ['Photo — Overlay, Amount 70 % (texture on the picture) ' + REC, { blend: 3, amount: 70 }, 'photo'],
    ['Photo — Multiply (darkens through the noise)', { blend: 1 }, 'photo'],
    ['Photo — Screen, Contrast 140 % (a light mist)', { blend: 2, contrast: 140 }, 'photo'],
    ['Smoke — Turbulent, pale on navy, Scale 160, Amount 80 %', { pattern: 1, color: '#0d1626', color2: '#e8eef8', amount: 80, scale: 160, evolution: 0.8 }, 'dark'],
    ['Fire — Turbulent, deep red to yellow, Contrast 160 %', { pattern: 1, color: '#2a0400', color2: '#ffd040', contrast: 160, evolution: 1.6, scale: 120 }, 'dark'],
    ['Marble — Ridged, teal veins on white, Scale 220', { pattern: 3, color: '#f4f2ec', color2: '#1d6b6b', scale: 220, evolution: 0.2 }, 'dark'],
    ['Sky — Smooth, blue to white, Scale 300, 6 octaves', { pattern: 2, color: '#3d7cc9', color2: '#ffffff', contrast: 130, scale: 300, octaves: 6, evolution: 0.3 }, 'dark'],
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
    const [name, over, kindOf] = rows[r], kind = kindOf || subject, y = HEAD + r * (TILE + PAD);
    nameLabel(g, name, PAD, y + TILE / 2 - 34, 15, LABEL_W - 2 * PAD);
    const ts = Date.now();
    for (let k = 0; k < TIMES.length; k++) {
      try {
        const layers = kind === 'photo' ? await photo('clouds', fx(over)) : dark(fx(over));
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

/* THE PILE'S KERNEL, copied from fcda7fd2 for the before/after sheet ONLY (never registered, never in the app): its grid is at most 320
   samples along the plate's long edge, stretched over the plate — the spacing LAND-LIST §B6 replaces. Its Ridged was 1 − |2v − 1|; the
   fix sheet uses Basic, where the two kernels differ only in the grid (and in reading the noise at a pixel's corner, not its centre). */
let pileScratch = null;
function pileKernel(d, W, H, p, t, ps) {
  const fparam = (q, key, def, tt) => q[key] == null ? def : FM.evalProp(q[key], tt);
  const hexToRGB = h => { h = String(h || '#000000').replace('#', ''); return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]; };
  var amt = Math.max(0, Math.min(1, fparam(p, 'amount', 100, t) / 100));
  if (!amt || !W || !H) return;
  var pattern = Math.max(0, Math.min(3, Math.round(fparam(p, 'pattern', 0, t))));
  var octaves = Math.max(1, Math.min(6, Math.round(fparam(p, 'octaves', 4, t))));
  var scale = Math.max(16, Math.min(400, fparam(p, 'scale', 100, t)));
  var contrast = Math.max(0, Math.min(3, fparam(p, 'contrast', 100, t) / 100));
  var speed = Math.max(-4, Math.min(4, fparam(p, 'evolution', 0.5, t)));
  var phase = FM.isAnimated(p.evolution) ? FM.integrateProp(p.evolution, 0, t, function (u) { return Math.max(-4, Math.min(4, FM.evalProp(p.evolution, u))); }) : speed * t;
  var seed = Math.round(fparam(p, 'seed', 0, t)) | 0;
  var blend = Math.max(0, Math.min(3, Math.round(fparam(p, 'blend', 0, t))));
  var lo = p.color ? hexToRGB(p.color) : [0, 0, 0];
  var hi = p.color2 ? hexToRGB(p.color2) : [255, 255, 255];
  var plateScale = ps > 0 ? ps : 1;
  var reduction = Math.min(1, 320 / Math.max(W, H));
  var gw = Math.max(1, Math.round(W * reduction)), gh = Math.max(1, Math.round(H * reduction));
  var n = gw * gh;
  if (!pileScratch || pileScratch.length < n) pileScratch = new Float32Array(n);
  var grid = pileScratch;
  function hash(ix, iy, octave) {
    var h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed + octave * 1013, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function noise(x, y, octave) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy, octave), b = hash(ix + 1, iy, octave);
    var c = hash(ix, iy + 1, octave), e = hash(ix + 1, iy + 1, octave);
    return (a + (b - a) * fx) * (1 - fy) + (c + (e - c) * fx) * fy;
  }
  var weightBase = pattern === 2 ? 0.25 : 0.5;
  for (var gy = 0; gy < gh; gy++) {
    var py = (gh > 1 ? gy * (H - 1) / (gh - 1) : 0) / plateScale;
    for (var gx = 0; gx < gw; gx++) {
      var px = (gw > 1 ? gx * (W - 1) / (gw - 1) : 0) / plateScale;
      var sum = 0, weight = 1, total = 0, cell = scale;
      for (var o = 0; o < octaves; o++) {
        var v = noise(px / cell + phase * (0.7 + o * 0.21), py / cell - phase * (0.9 + o * 0.17), o);
        if (pattern === 1) v = Math.abs(v * 2 - 1);
        else if (pattern === 3) v = 1 - Math.abs(v * 2 - 1);
        sum += v * weight; total += weight; weight *= weightBase; cell *= 0.5;
      }
      var value = (sum / total - 0.5) * contrast + 0.5;
      grid[gy * gw + gx] = value < 0 ? 0 : (value > 1 ? 1 : value);
    }
  }
  for (var y = 0; y < H; y++) {
    var fy2 = H > 1 ? y * (gh - 1) / (H - 1) : 0, y0 = Math.floor(fy2), y1 = Math.min(y0 + 1, gh - 1);
    fy2 -= y0;
    for (var x = 0; x < W; x++) {
      var i = (y * W + x) * 4;
      if (!d[i + 3]) continue;
      var fx2 = W > 1 ? x * (gw - 1) / (W - 1) : 0, x0 = Math.floor(fx2), x1 = Math.min(x0 + 1, gw - 1);
      fx2 -= x0;
      var top = grid[y0 * gw + x0] + (grid[y0 * gw + x1] - grid[y0 * gw + x0]) * fx2;
      var bot = grid[y1 * gw + x0] + (grid[y1 * gw + x1] - grid[y1 * gw + x0]) * fx2;
      var vv = top + (bot - top) * fy2;
      for (var ch = 0; ch < 3; ch++) {
        var source = d[i + ch], tone = lo[ch] + (hi[ch] - lo[ch]) * vv;
        if (blend === 1) tone = source * tone / 255;
        else if (blend === 2) tone = 255 - (255 - source) * (255 - tone) / 255;
        else if (blend === 3) tone = source < 128 ? 2 * source * tone / 255 : 255 - 2 * (255 - source) * (255 - tone) / 255;
        d[i + ch] = source + (tone - source) * amt;
      }
    }
  }
}
/* the fix sheet: each row one setting at the EXPORT's size (1080 x 1350, plate scale 1), 0.8 s in. Four tiles: as built and the pile's,
   a 270 x 270 crop at 1:1; then the same two as a 90 x 90 crop blown up 3x with no smoothing (one export pixel = 3 x 3) */
const FIX_ROWS = [
  ['Scale 16, 6 octaves (squares down to 0.5 px: the 5th and 6th are under a pixel, left out as built)', { scale: 16, octaves: 6 }],
  ['Scale 40, 6 octaves (finest square 1.25 px)', { scale: 40, octaves: 6 }],
  ['Scale 100, 6 octaves (finest 3.1 px — the pile drew its 5th and 6th as blotches)', { scale: 100, octaves: 6 }],
  ['Defaults: Scale 100, 4 octaves (finest 12.5 px — both grids carry it; the two should look alike)', {}],
];
async function fixSheet() {
  const EW = 1080, EH = 1350, CX = 400, CY = 520, CROP = TILE, Z = 3, ZC = Math.round(TILE / Z);
  const heads = ['as built — 1:1', 'the pile (fcda7fd2) — 1:1', 'as built — 3x', 'the pile — 3x'];
  const sheet = canvas(LABEL_W + 4 * (TILE + PAD) + PAD, HEAD + 22 + FIX_ROWS.length * (TILE + PAD) + PAD);
  const g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Fractal Noise (#966 B38) — THE FIX at the export\'s own size: this branch\'s grid against the pile\'s 320-sample grid', PAD, 12, 18, '#ffffff');
  heads.forEach((h, k) => label(g, h, LABEL_W + k * (TILE + PAD), HEAD, 14, '#9fb4d0'));
  const K = FM._FX_TABLES.PIXEL_FX.fractalnoise;
  for (let r = 0; r < FIX_ROWS.length; r++) {
    const [name, over] = FIX_ROWS[r], y = HEAD + 22 + r * (TILE + PAD);
    nameLabel(g, name, PAD, y + TILE / 2 - 34, 14, LABEL_W - 2 * PAD);
    try {
      const params = Object.assign({}, FM.fxRegistry.makeInstance('fractalnoise').params, over);
      const plates = [K, pileKernel].map(fn => {
        const im = new ImageData(EW, EH);
        for (let i = 0; i < im.data.length; i += 4) { im.data[i] = im.data[i + 1] = im.data[i + 2] = 128; im.data[i + 3] = 255; }
        const ts = Date.now();
        fn(im.data, EW, EH, params, 0.8, 1);
        timing['fix ' + (fn === K ? 'built' : 'pile') + ': ' + name.slice(0, 24)] = Date.now() - ts;
        const c = canvas(EW, EH); c.getContext('2d').putImageData(im, 0, 0);
        return c;
      });
      plates.forEach((c, k) => g.drawImage(c, CX, CY, CROP, CROP, LABEL_W + k * (TILE + PAD), y, TILE, TILE));
      g.imageSmoothingEnabled = false;
      plates.forEach((c, k) => g.drawImage(c, CX, CY, ZC, ZC, LABEL_W + (k + 2) * (TILE + PAD), y, ZC * Z, ZC * Z));
      g.imageSmoothingEnabled = true;
    } catch (e) { errors.push('fix ' + name + ': ' + (e && e.message)); }
    await sleep(0);
  }
  return sheet;
}

const out = {}, sheets = {};
try {
  for (const file of Object.keys(SHEETS)) sheets[file] = await sheetOf(file);
  sheets['fractalnoise-fix.jpg'] = await fixSheet();
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewFractal = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest settings (ms per frame), and what the
   grid does at the defaults and at Scale 16 / 6 octaves on the export (plate 1), a desktop preview (0.5) and his phone (0.28): the grid's
   step in plate px and how many octaves are drawn (FM._fractalNoisePlan) */
const plan = (over, ps) => { const q = FM._fractalNoisePlan(Object.assign({}, FM.fxRegistry.makeInstance('fractalnoise').params, over), 0, ps); return 'ps ' + ps + ': step ' + q.step.toFixed(2) + ', ' + q.cells.length + ' octaves'; };
const grids = [{}, { scale: 16, octaves: 6 }].map(o => JSON.stringify(o) + ' — ' + [1, 0.5, 0.28].map(ps => plan(o, ps)).join('; '));
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, grids: grids, errors: errors.slice(0, 6), ms: Date.now() - t0 };
