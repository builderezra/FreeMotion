/* render-probe.js — the #545 options sheets for #966 B39 Gradient Wipe (ported from the pile's 3e591a41), rendered through the APP'S
   OWN compositor (FM.renderScene, the very path the export runs), so what he picks from is what the app draws. For tools/shot.py
   --js-file, in the next browser slot. Nothing in the app is changed: the photos are throwaway media records and layers, removed at
   the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmNewGradWipe as data URLs and only the summary returns.

   A FRESH Image is loaded for every tile: FM.media.remove() empties the element it was given, so an image used twice renders black.
   (Each tile also gets its own canvas as the media element, so removing one never touches another.)

   The run, from the worktree that holds this file (never beside a ship or a mutation — a browser beside ship.sh turned 921 red):
     P=<free port>; R=<free port>
     tools/serve.sh $P . &   python3 tools/design/plans/fxnew-looks/recv.py $R /tmp/fm-gradwipe &
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
         --js-file tools/design/plans/pile-gradientwipe/render-probe.js --out /tmp/fm-gradwipe/page.png

   Every tile is the clouds photo with Gradient Wipe on it, opening onto the city shot underneath (a 9:16 frame, as the other wipes'
   sheets). A Wipe map, when there is one, is a layer at Opacity 0 in the same frame (out of the picture, still driving the wipe).
   Pages — each under 2x as tall as wide, so it reaches his phone whole (the tall-images lesson):
     gradwipe-big.jpg     three big tiles half done: no map (the clouds' own brightness — the default), a radial map, a photo map
     gradwipe-maps.jpg    STRIPS OVER PROGRESS (0.1 → 0.9 across each row): no map; a left-to-right ramp; radial; angular; a photo
                          (the bush shot); no map with Invert
     gradwipe-soft.jpg    strips, on the radial map: Softness 0, 10 (the default), 30, 60, 100 %
     gradwipe-read.jpg    strips, on a colour photo map (the shore shot): Read Luma, Alpha, Red, Green, Blue
     gradwipe-ends.jpg    THE FIX, at Progress 0 · 0.005 · 0.02 · 0.5 · 0.98 · 0.995 · 1, Softness 30 %: as built (no pop) and
                          ChatGPT's formula (edge = 1 − progress), which is exactly the built effect at Progress (p + s/2) / (1 + s) —
                          so its pop is drawn by the app itself, one notch from each end
   "RECOMMENDED" marks the builder's pick. Every tile is an option of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('gradientwipe')) return { ok: false, error: 'this tree has no Gradient Wipe (gradientwipe) — serve hunt/pile-gradientwipe' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];
const REC = 'RECOMMENDED';

const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function label(g, text, x, y, size, colour, weight) { g.font = (weight || '600') + ' ' + (size || 15) + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(text, x, y); }
// a line of grey text wrapped at `maxW`, two lines at most (the page headers leave room for two)
function wrapLabel(g, text, x, y, size, maxW) {
  g.font = '500 ' + size + 'px system-ui, sans-serif';
  const lines = [''];
  String(text).split(' ').forEach(w => { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (g.measureText(tryL).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tryL; });
  lines.slice(0, 2).forEach((l, i) => label(g, l, x, y + i * (size + 4), size, '#9aa4b6', '500'));
}
// a name, with ★ RECOMMENDED after it in gold when the name ends with it
function nameLabel(g, text, x, y, size) {
  const rec = / RECOMMENDED$/.test(text), name = rec ? text.replace(/ RECOMMENDED$/, '') : text;
  label(g, name, x, y, size);
  if (rec) { g.font = '600 ' + size + 'px system-ui, sans-serif'; label(g, '★ RECOMMENDED', x + g.measureText(name + '   ').width, y, size, '#ffd24a'); }
}
async function post(name, sheet) {
  const blob = await new Promise(r => sheet.toBlob(r, 'image/jpeg', Q));
  if (!RECV) return 'kept on window (no receiver)';
  try { const res = await fetch(RECV + '/' + name, { method: 'POST', body: blob }); return res.ok ? 'posted ' + blob.size + ' B' : 'POST HTTP ' + res.status; }
  catch (e) { return 'POST failed: ' + (e && e.message); }
}

/* ───────────────────────── photo layers and map layers, through FM.renderScene ───────────────────────── */
// a FRESH Image every call — never cached (see the header)
function loadPhoto(key) {
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1&n=' + made.length + '_' + Date.now(); });
}
// the photo centre-cropped to w x h as image media on its own canvas, and a fresh layer on it centred at (x, y) of the frame
async function photoLayer(key, w, h, x, y) {
  const im = await loadPhoto(key), ar = w / h;
  let sw = im.naturalWidth, sh = im.naturalHeight; if (sw / sh > ar) sw = sh * ar; else sh = sw / ar;
  const c = canvas(w, h), g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
  const mid = '_fxgradwipe_' + key + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: w, height: h, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: x, y: y, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  return L;
}
/* a Wipe map filling the W x H frame, at Opacity 0: 'linear' white at the left to black at the right (the left opens first),
   'radial' white in the middle to black at the corners (an iris), 'angular' a fan around the middle, or a photo by its fx-art key */
async function mapLayer(kind, W, H) {
  let L;
  if (kind === 'linear' || kind === 'radial' || kind === 'angular') {
    L = FM.makeLayer('shape', { shape: 'rect', x: W / 2, y: H / 2, shapeW: W, shapeH: H, fill: '#808080' });
    L.start = 0; L.duration = 4;
    L.fillGradient = { enabled: true, type: kind, angle: kind === 'angular' ? 270 : 0, c0: '#ffffff', c1: '#000000' };
  } else L = await photoLayer(kind, W, H, W / 2, H / 2);
  L.transform.opacity = 0;
  return L;
}
// one tile: the clouds wearing a Gradient Wipe (`over`), read from the map `map` (a kind above, or none: their own brightness)
async function tile(over, W, H, map) {
  const top = await photoLayer('clouds', W, H, W / 2, H / 2), under = await photoLayer('city', W, H, W / 2, H / 2);
  const e = FM.fxRegistry.makeInstance('gradientwipe');
  Object.assign(e.params, over || {});
  const layers = [top, under];
  if (map) { const M = await mapLayer(map, W, H); e.params.source = M.id; layers.push(M); }
  top.effects = [e];
  const o = canvas(W, H);
  FM.renderScene(o.getContext('2d'), { project: { width: W, height: H, fps: 30, duration: 4, background: '#0b0e14' }, layers: layers, selectedId: null, selectedIds: [] }, 0.5);
  return o;
}

/* ───────────────────────── the big page: three looks half done ───────────────────────── */
async function bigPage() {
  const TW = 300, TH = 533, M = 24, G = 18, HD = 96, LB = 40;
  const tiles = [['No map: the clouds’ own brightness ' + REC, { progress: 0.5 }, null], ['A radial map (an iris), Softness 20 %', { progress: 0.5, softness: 20 }, 'radial'], ['A photo map (the bush shot)', { progress: 0.5, softness: 15 }, 'bush']];
  const sheet = canvas(M * 2 + 3 * TW + 2 * G, HD + TH + LB + M), g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Gradient Wipe (#966 B39) — half done (Progress 0.5)', M, 16, 22, '#ffffff');
  wrapLabel(g, 'Your clouds photo with the effect on it, opening onto the city shot underneath (9:16). The brightest parts of the map open first; keyframe Progress 0 → 1 to run it.', M, 50, 14, sheet.width - 2 * M);
  for (let i = 0; i < tiles.length; i++) {
    const x = M + i * (TW + G), ts = Date.now();
    try { g.drawImage(await tile(tiles[i][1], TW, TH, tiles[i][2]), x, HD); } catch (e) { errors.push('big ' + tiles[i][0] + ': ' + (e && e.message)); }
    timing['big: ' + tiles[i][0]] = Date.now() - ts;
    const rec = / RECOMMENDED$/.test(tiles[i][0]);
    label(g, tiles[i][0].replace(/ RECOMMENDED$/, ''), x, HD + TH + 8, 14);
    if (rec) label(g, '★ RECOMMENDED', x, HD + TH + 24, 13, '#ffd24a');
    await sleep(0);
  }
  return sheet;
}

/* ───────────────────────── strips over Progress: each row one setting, left to right over `steps` ───────────────────────── */
const STEPS = [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9];
// rows are [name, over, map, progressOf] — progressOf (optional) turns a column's Progress into the one drawn (the ends page)
async function stripPage(base, title, sub, rows, steps) {
  const S = steps || STEPS, TW = 120, TH = 213, M = 24, G = 6, HD = 118, LB = 28, RG = 10;
  const sheet = canvas(M * 2 + S.length * TW + (S.length - 1) * G, HD + rows.length * (LB + TH + RG) + M), g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, title, M, 16, 22, '#ffffff');
  wrapLabel(g, sub, M, 50, 14, sheet.width - 2 * M);
  S.forEach((p, k) => label(g, 'Progress ' + p, M + k * (TW + G), HD - 26, 13, '#cfd6e4', '500'));
  for (let r = 0; r < rows.length; r++) {
    const [name, over, map, progressOf] = rows[r], y = HD + r * (LB + TH + RG);
    nameLabel(g, name, M, y + 4, 15);
    const ts = Date.now();
    for (let k = 0; k < S.length; k++) {
      const p = progressOf ? progressOf(S[k], over) : S[k];
      try { g.drawImage(await tile(Object.assign({}, over, { progress: p }), TW, TH, map), M + k * (TW + G), y + LB); }
      catch (e) { errors.push(base + ' ' + name + ' @' + S[k] + ': ' + (e && e.message)); }
    }
    timing[base + ': ' + name] = Date.now() - ts;
    await sleep(0);
  }
  return sheet;
}
/* ChatGPT's formula (edge = 1 − progress) is the built one (edge = (1 + s/2) − progress × (1 + s)) at Progress (p + s/2) / (1 + s)
   for 0 < p < 1 — the two edges are equal then — and the same early returns at 0 and 1. So the pile's look is drawn by the app. */
const pileProgress = (p, over) => { const s = (over.softness == null ? 10 : over.softness) / 100; return p <= 0 || p >= 1 ? p : (p + s / 2) / (1 + s); };
const PAGES = [
  ['gradwipe-maps', 'Gradient Wipe — the Wipe map', 'Each row runs Progress 0.1 → 0.9 left to right, Softness 10 %. No map wipes by the photo’s own brightness; a map is another layer, hidden (Opacity 0), that only drives the wipe.', [
    ['No map: the clouds’ own brightness (the default) ' + REC, {}, null], ['A ramp, left to right', {}, 'linear'], ['Radial (an iris from the middle)', {}, 'radial'],
    ['Angular (a fan)', {}, 'angular'], ['A photo (the bush shot): an organic wipe', {}, 'bush'], ['No map, Invert (the dark parts first)', { invert: 1 }, null]]],
  ['gradwipe-soft', 'Gradient Wipe — Softness', 'A share of the map’s range, not pixels: 0 a hard edge, 100 % at Progress 0.5 the map itself as a fade. On the radial map.', [
    ['Softness 0 — a hard edge', { softness: 0 }, 'radial'], ['Softness 10 % (the default) ' + REC, { softness: 10 }, 'radial'], ['Softness 30 %', { softness: 30 }, 'radial'],
    ['Softness 60 %', { softness: 60 }, 'radial'], ['Softness 100 %', { softness: 100 }, 'radial']]],
  ['gradwipe-read', 'Gradient Wipe — Read (what of the map counts)', 'On a colour photo map (the shore shot): its brightness, its alpha (an opaque photo opens all at once), or one colour channel.', [
    ['Read Luma (the default) ' + REC, { channel: 0 }, 'shore'], ['Read Alpha', { channel: 1 }, 'shore'], ['Read Red', { channel: 2 }, 'shore'],
    ['Read Green', { channel: 3 }, 'shore'], ['Read Blue', { channel: 4 }, 'shore']]],
];
const ENDS = [0, 0.005, 0.02, 0.5, 0.98, 0.995, 1];

const out = {}, sheets = {};
try {
  sheets['gradwipe-big.jpg'] = await bigPage();
  for (const [base, title, sub, rows] of PAGES) sheets[base + '.jpg'] = await stripPage(base, title, sub, rows);
  sheets['gradwipe-ends.jpg'] = await stripPage('gradwipe-ends', 'Gradient Wipe — the fix: no pop at either end', 'Softness 30 %, no map. As built, one notch from 0 almost nothing shows and one notch from 1 almost everything. ChatGPT’s version jumped to about half at both.', [
    ['As built (edge = (1 + s/2) − progress × (1 + s)) ' + REC, { softness: 30 }, null], ['ChatGPT’s formula (edge = 1 − progress): pops', { softness: 30 }, null, pileProgress],
    ['As built, on the radial map', { softness: 30 }, 'radial'], ['ChatGPT’s formula, on the radial map', { softness: 30 }, 'radial', pileProgress]], ENDS);
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.unpin) FM.media.unpin(id); } catch (e) {} try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewGradWipe = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest rows, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
