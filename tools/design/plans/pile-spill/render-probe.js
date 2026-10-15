/* render-probe.js — the #545 options sheet for #966 B54 Spill Suppressor (hunt/pile-spill), rendered through the APP'S OWN compositor
   (FM.renderScene, the very kernels the export runs: Chroma Key Pro, then Spill Suppressor), so what he picks from is what the app
   draws. For tools/shot.py --js-file, in the next browser slot. Nothing in the app is changed: the shots are throwaway media records
   and layers, removed at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmPileSpill as data URLs and only the summary returns.

   A FRESH Image is loaded for every tile: FM.media.remove() empties the element it was given, so an image used twice renders black.

   THE SHOT. There is no green-screen photo in fx-art, so one is made: the dog from dog.jpg (fur, sand and a sunset sky, so warm
   colours, which is where a spill shows as yellow-green) cut to a soft-edged oval with a ragged, hair-like rim, LIT BY THE SCREEN
   (the screen's colour added to the rim, strongest at the edge, and a faint cast over the whole subject), then laid on the screen —
   so the half-see-through edge pixels are part screen, as in a real shot. It is keyed by Chroma Key Pro with ITS OWN Despill and
   Edge desaturate at 0, over a warm grey, and Spill Suppressor goes after the key.

   Pages — two tiles across, three down, so each is under 2x as tall as wide and reaches his phone (the tall-images lesson):
     spill-green-p1.jpg / -p2.jpg  the green shot: the raw shot, keyed with no fix, the defaults (RECOMMENDED), Strong, Keep
                                   brightness 100 / 50, Soft edges only, Amount 50, today's Chroma Key Pro Despill 0.7 for comparison,
                                   Strong + Keep brightness, on an adjustment layer, and the PILE'S version (hue-weighted, simulated).
     spill-zoom.jpg                the hair edge at 3x for six of those — where the difference actually is.
     spill-blue.jpg                a blue-screen shot: Blue, Green left on (nothing happens: the control), Key colour, Strong.
   "RECOMMENDED" marks the builder's pick. Every tile is a setting of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('spillsuppressor')) return { ok: false, error: 'this tree has no Spill Suppressor (spillsuppressor) — serve hunt/pile-spill' };
if (!FM.fxRegistry.get('chromakeypro')) return { ok: false, error: 'this tree has no Chroma Key Pro' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];
const REC = 'RECOMMENDED';
const S = 340, COLS = 2, ROWS = 3, SL = 48, SP = 10;
const GREEN = '#18c454', BLUE = '#1f4fd8', BACK = '#6a6058';

const fx = (type, over) => { const e = FM.fxRegistry.makeInstance(type); Object.assign(e.params, over || {}); return e; };
const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const rgbOf = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function label(g, text, x, y, size, colour, weight) { g.font = (weight || '600') + ' ' + (size || 15) + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(text, x, y); }
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

/* ───────────────────────── the shot ───────────────────────── */
// a FRESH Image every call — never cached (see the header)
function loadPhoto(key) {
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1&n=' + made.length + '_' + Date.now(); });
}
const smooth = (a, b, v) => { const s = v <= a ? 0 : (v >= b ? 1 : (v - a) / (b - a)); return s * s * (3 - 2 * s); };
/* the dog cut to a soft oval with a ragged rim, lit by the screen, laid on the screen. Returns the shot canvas (a fresh one). */
async function makeShot(screenHex) {
  const im = await loadPhoto('dog'), W = im.naturalWidth, H = im.naturalHeight;
  const sub = canvas(S, S), g = sub.getContext('2d', { willReadFrequently: true });
  // the dog's body in dog.jpg is about x 0.34..0.70, y 0.34..0.88 of the frame; drawn into the oval's box
  g.drawImage(im, W * 0.34, H * 0.34, W * 0.36, H * 0.54, S * 0.2, S * 0.06, S * 0.6, S * 0.88);
  const img = g.getImageData(0, 0, S, S), d = img.data, sc = rgbOf(screenHex);
  const cx = S * 0.5, cy = S * 0.5, rx = S * 0.3, ry = S * 0.44;
  for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i += 4) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry, ang = Math.atan2(dy, dx);
    // a ragged, hair-like rim: the radius wobbles with the angle at two frequencies
    const rn = Math.sqrt(dx * dx + dy * dy) * (1 + 0.035 * Math.sin(ang * 41) + 0.02 * Math.sin(ang * 97 + 1.3));
    const a = 1 - smooth(0.84, 1.0, rn);
    if (a <= 0) { d[i + 3] = 0; continue; }
    // the screen's light: strongest at the rim, and a faint cast over the whole subject
    const lit = 0.06 + 0.42 * smooth(0.55, 1.0, rn);
    d[i] = Math.min(255, d[i] + sc[0] * lit); d[i + 1] = Math.min(255, d[i + 1] + sc[1] * lit); d[i + 2] = Math.min(255, d[i + 2] + sc[2] * lit);
    d[i + 3] = Math.round(255 * a);
  }
  g.putImageData(img, 0, 0);
  const shot = canvas(S, S), sg = shot.getContext('2d');
  // a screen a little brighter at the top, as screens are lit
  const grd = sg.createLinearGradient(0, 0, 0, S);
  grd.addColorStop(0, 'rgb(' + sc.map(v => Math.min(255, Math.round(v * 1.08))).join(',') + ')'); grd.addColorStop(1, 'rgb(' + sc.map(v => Math.round(v * 0.86)).join(',') + ')');
  sg.fillStyle = grd; sg.fillRect(0, 0, S, S);
  sg.drawImage(sub, 0, 0);
  return shot;
}
/* the shot as an image layer with `effects`, over a warm-grey ground; `adj` effects go on an adjustment layer above it */
async function render(screenHex, effects, adj) {
  const shot = await makeShot(screenHex);
  const mid = '_pilespill_' + made.length;
  FM.media.set(mid, { kind: 'image', el: shot, width: S, height: S, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: S / 2, y: S / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = effects;
  const B = FM.makeLayer('shape', { shape: 'rect', x: S / 2, y: S / 2, shapeW: S, shapeH: S, fill: BACK }); B.start = 0; B.duration = 4; B.effects = [];
  const layers = [L, B];
  if (adj) { const A = FM.makeLayer('adjustment', { name: 'grade' }); A.start = 0; A.duration = 4; A.effects = adj; layers.unshift(A); }
  const o = canvas(S, S);
  FM.renderScene(o.getContext('2d'), { project: { width: S, height: S, fps: 30, duration: 4, background: '#000000' }, layers: layers, selectedId: null, selectedIds: [] }, 0.5);
  return o;
}
/* THE PILE'S VERSION, for comparison only: its kernel (36039096) copied here and run on the keyed render (the ground is a warm grey
   whose green never leads, so it is untouched either way). Remove spill 60 %, Hue range 50 % — its defaults. */
function pileSpill(c, keyHex, amountPct, rangePct) {
  const g = c.getContext('2d', { willReadFrequently: true }), img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  const key = rgbOf(keyHex), kc = key[1] >= key[0] && key[1] >= key[2] ? 1 : (key[2] >= key[0] ? 2 : 0), o1 = (kc + 1) % 3, o2 = (kc + 2) % 3;
  const kCb = -0.169 * key[0] - 0.331 * key[1] + 0.5 * key[2], kCr = 0.5 * key[0] - 0.419 * key[1] - 0.081 * key[2], kL = Math.hypot(kCb, kCr);
  const amount = amountPct / 100, range = (rangePct / 100) * 0.98;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const ex = d[i + kc] - Math.max(d[i + o1], d[i + o2]);
    if (ex <= 0) continue;
    const cb = -0.169 * d[i] - 0.331 * d[i + 1] + 0.5 * d[i + 2], cr = 0.5 * d[i] - 0.419 * d[i + 1] - 0.081 * d[i + 2], L = Math.hypot(cb, cr);
    if (L < 1) continue;
    const sim = (cb * kCb + cr * kCr) / (L * kL);
    if (sim <= range) continue;
    d[i + kc] -= ex * amount * Math.min(1, (sim - range) / (1 - range));
  }
  g.putImageData(img, 0, 0);
  return c;
}

/* ───────────────────────── the tiles ───────────────────────── */
const ckp = (screenHex, over) => fx('chromakeypro', Object.assign({ color: screenHex, despill: 0, edgedesat: 0 }, over || {}));
const ss = over => fx('spillsuppressor', over);
// [name, () => a rendered canvas]; `key` caches a render so the zoom page reuses it rather than rendering again
const cache = {};
const tile = (key, name, make) => [name, async () => (cache[key] = cache[key] || await make())];
const G_TILES = [
  tile('shot', 'The shot: the dog on a green screen, its rim lit green', async () => { const c = canvas(S, S); c.getContext('2d').drawImage(await makeShot(GREEN), 0, 0); return c; }),
  tile('none', 'Keyed, no spill fix (Chroma Key Pro, its Despill at 0): the green rim', () => render(GREEN, [ckp(GREEN)])),
  tile('def', 'Spill Suppressor at its defaults: Green, Gentle, Amount 100 % ' + REC, () => render(GREEN, [ckp(GREEN), ss({})])),
  tile('strong', 'Strong (green down to the AVERAGE of red and blue)', () => render(GREEN, [ckp(GREEN), ss({ limit: 1 })])),
  tile('keep100', 'Gentle + Keep brightness 100 %', () => render(GREEN, [ckp(GREEN), ss({ restore: 100 })])),
  tile('keep50', 'Gentle + Keep brightness 50 %', () => render(GREEN, [ckp(GREEN), ss({ restore: 50 })])),
  tile('edges', 'Soft edges only (the solid middle left alone)', () => render(GREEN, [ckp(GREEN), ss({ area: 1 })])),
  tile('half', 'Amount 50 %', () => render(GREEN, [ckp(GREEN), ss({ amount: 50 })])),
  tile('today', 'TODAY: Chroma Key Pro’s own Despill 0.7, no Spill Suppressor', () => render(GREEN, [ckp(GREEN, { despill: 0.7 })])),
  tile('strongkeep', 'Strong + Keep brightness 100 %', () => render(GREEN, [ckp(GREEN), ss({ limit: 1, restore: 100 })])),
  tile('adj', 'On an adjustment layer over the keyed shot (defaults)', () => render(GREEN, [ckp(GREEN)], [ss({})])),
  tile('pile', 'The PILE’S version (hue-weighted, Remove spill 60 %, Hue range 50 %), simulated', async () => pileSpill(await render(GREEN, [ckp(GREEN)]), GREEN, 60, 50)),
];
const B_TILES = [
  tile('bshot', 'The shot on a BLUE screen, its rim lit blue', async () => { const c = canvas(S, S); c.getContext('2d').drawImage(await makeShot(BLUE), 0, 0); return c; }),
  tile('bnone', 'Keyed on the blue, no spill fix: the blue rim', () => render(BLUE, [ckp(BLUE)])),
  tile('bblue', 'Spill colour Blue (Gentle) ' + REC, () => render(BLUE, [ckp(BLUE), ss({ spill: 1 })])),
  tile('bgreen', 'Left on Green: nothing happens (the control)', () => render(BLUE, [ckp(BLUE), ss({ spill: 0 })])),
  tile('bkey', 'Key colour, the blue screen picked', () => render(BLUE, [ckp(BLUE), ss({ spill: 2, color: BLUE })])),
  tile('bstrong', 'Blue, Strong + Keep brightness 100 %', () => render(BLUE, [ckp(BLUE), ss({ spill: 1, limit: 1, restore: 100 })])),
];
// the hair edge at 3x: the top-left of the oval, where the rim is thinnest and greenest
const ZOOM = [['none', 'Keyed, no fix'], ['def', 'Defaults (Gentle) ' + REC], ['strong', 'Strong'], ['keep100', 'Gentle + Keep brightness 100 %'], ['today', 'TODAY: Chroma Key Pro Despill 0.7'], ['pile', 'The pile’s version']];
function zoomOf(c) {
  const z = canvas(S, S), g = z.getContext('2d'), w = S / 3;
  g.imageSmoothingEnabled = false;
  g.drawImage(c, S * 0.17, S * 0.1, w, w, 0, 0, S, S);
  return z;
}

async function pages(base, title, tiles) {
  const per = COLS * ROWS, out = [], n = Math.ceil(tiles.length / per);
  for (let p = 0; p * per < tiles.length; p++) {
    const part = tiles.slice(p * per, (p + 1) * per), rows = Math.ceil(part.length / COLS);
    const sheet = canvas(SP + COLS * (S + SP), 46 + rows * (S + SL + SP)), g = sheet.getContext('2d');
    g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
    label(g, title + (n > 1 ? ' (' + (p + 1) + '/' + n + ')' : ''), SP, 12, 17, '#ffffff');
    for (let i = 0; i < part.length; i++) {
      const [name, make] = part[i], x = SP + (i % COLS) * (S + SP), y = 46 + Math.floor(i / COLS) * (S + SL + SP);
      const ts = Date.now();
      try { g.drawImage(await make(), x, y + SL); }
      catch (e) { errors.push(base + ' ' + name + ': ' + (e && e.message)); }
      timing[base + ': ' + name] = Date.now() - ts;
      nameLabel(g, name, x, y + 2, 13, S);
      await sleep(0);
    }
    out.push([base + (n > 1 ? '-p' + (p + 1) : '') + '.jpg', sheet]);
  }
  return out;
}

const posted = {}, sheets = {};
try {
  for (const [name, sheet] of await pages('spill-green', 'Spill Suppressor (#966 B54): a dog keyed off a green screen', G_TILES)) sheets[name] = sheet;
  const ZT = ZOOM.map(([k, name]) => [name + ' (3x)', async () => { if (!cache[k]) throw new Error('no render for ' + k); return zoomOf(cache[k]); }]);
  for (const [name, sheet] of await pages('spill-zoom', 'Spill Suppressor (#966 B54): the hair edge, 3x', ZT)) sheets[name] = sheet;
  for (const [name, sheet] of await pages('spill-blue', 'Spill Suppressor (#966 B54): a blue screen', B_TILES)) sheets[name] = sheet;
  for (const name of Object.keys(sheets)) posted[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmPileSpill = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest settings, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: posted, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
