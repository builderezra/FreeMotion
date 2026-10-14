/* render-probe.js — the #545 options sheets for #966 B17 Datamosh Bloom, rendered through the APP'S OWN compositor (FM.renderScene, the
   very kernel the export runs), so what he picks from is what the app draws. For tools/shot.py --js-file, in the next browser slot.
   Nothing in the app is changed: the clips are throwaway media records and layers, removed at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmNewMosh as data URLs and only the summary returns.

   THIS EFFECT HAS HISTORY, SO EVERY STRIP IS PLAYED IN ORDER. A frame of Datamosh Bloom is the frame before it, pushed on; a frame
   rendered on its own shows the clean clip. So each row is ONE layer (its own id, so its own history) rendered at every frame from 0
   to the last one shown, a 30th of a second apart, and the strip keeps the frames it shows. Never render a tile out of order, never
   skip frames, and never share a layer between rows.
   THE CLIP is made here, frame by frame: before each render the layer's own media canvas is repainted with that frame's picture. Shot
   one is the dog photo drifting slowly; at the CUT (frame 6, 0.2 s) it becomes the car photo panning left 14 px a frame and slowly
   zooming — the movement the mosh drags the dog along with. Start at is on the cut (0.2 s) in every row. A FRESH Image is loaded for
   every row and every row gets its own clip canvas: FM.media.remove() empties the element it was given.
   The project is 1080 x 1920 and every tile is that frame shrunk to the tile (the plate scale the phone preview uses), so Block size
   shows at its real share of the frame.

   The run, from the worktree that holds this file (never beside a ship or a mutation — a browser beside ship.sh turned 921 red):
     P=<free port>; R=<free port>
     tools/serve.sh $P . &   python3 tools/design/plans/fxnew-looks/recv.py $R /tmp/fm-mosh &
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
         --js-file tools/design/plans/fxnew-datamosh/render-probe.js --out /tmp/fm-mosh/page.png

   Pages — each under 2x as tall as wide, so it reaches his phone whole (the tall-images lesson). Every row is five moments: the last
   frame before the cut, then 2, 6, 12 and 24 frames after it (0.8 s):
     moshbloom-big.jpg      the defaults big (at the phone preview's own scale): the clip itself, then 4, 12 and 24 frames after the cut
     moshbloom-amount.jpg   the clip (Amount 0), Amount 0.4, 0.7 (default) and 1
     moshbloom-block.jpg    Block size 8, 16 (default), 32 and 64
     moshbloom-heal.jpg     Heal 0 (never clears), 0.05, 0.1 (default) and 0.3
     moshbloom-colour.jpg   Colour bleed 0, 0.5 (default) and 1 at Heal 0.2 — and Start at half a second after the cut
   "RECOMMENDED" marks the builder's pick. Every tile is an option of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('moshbloom')) return { ok: false, error: 'this tree has no Datamosh Bloom (moshbloom) — serve hunt/fxnew-datamosh' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [], numbers = {};
const REC = 'RECOMMENDED';   // a row or tile whose name ends with this gets it in gold
const PW = 1080, PH = 1920, FPS = 30, CUT = 6;
const SHOW = [CUT - 1, CUT + 2, CUT + 6, CUT + 12, CUT + 24];
const SHOW_CAP = ['before the cut', '+2 frames', '+6', '+12', '+24 (0.8 s)'];

const fx = over => { const e = FM.fxRegistry.makeInstance('moshbloom'); Object.assign(e.params, { hold: CUT / FPS }, over || {}); return e; };
const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function label(g, text, x, y, size, colour, weight) { g.font = (weight || '600') + ' ' + (size || 15) + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(text, x, y); }
// a line of grey text wrapped at `maxW`, two lines at most (the page headers leave room for two)
function wrapLabel(g, text, x, y, size, maxW) {
  g.font = '500 ' + size + 'px system-ui, sans-serif';
  const lines = [''];
  String(text).split(' ').forEach(w => { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (g.measureText(tryL).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tryL; });
  lines.slice(0, 2).forEach((l, i) => label(g, l, x, y + i * (size + 4), size, '#9aa4b6', '500'));
}
// a row or tile caption, with ★ RECOMMENDED after it in gold when the name ends with it
function caption(g, text, x, y, size) {
  const rec = / RECOMMENDED$/.test(text), plain = text.replace(/ RECOMMENDED$/, '');
  label(g, plain, x, y, size);
  if (rec) { g.font = '600 ' + size + 'px system-ui, sans-serif'; label(g, '  ★ RECOMMENDED', x + g.measureText(plain).width, y, size, '#ffd24a'); }
}
async function post(name, sheet) {
  const blob = await new Promise(r => sheet.toBlob(r, 'image/jpeg', Q));
  if (!RECV) return 'kept on window (no receiver)';
  try { const res = await fetch(RECV + '/' + name, { method: 'POST', body: blob }); return res.ok ? 'posted ' + blob.size + ' B' : 'POST HTTP ' + res.status; }
  catch (e) { return 'POST failed: ' + (e && e.message); }
}

/* ───────────────────────── the clip, and a row played in order ───────────────────────── */
// a FRESH Image every call — never cached (see the header)
function loadPhoto(key) {
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1&n=' + made.length + '_' + Date.now(); });
}
// the photo covering the 1080 x 1920 frame, `zoom` times bigger than cover, its middle moved by (dx, dy)
function cover(g, im, zoom, dx, dy) {
  const s = Math.max(PW / im.naturalWidth, PH / im.naturalHeight) * zoom, w = im.naturalWidth * s, h = im.naturalHeight * s;
  g.drawImage(im, (PW - w) / 2 + dx, (PH - h) / 2 + dy, w, h);
}
// frame k of the clip: the dog drifting 2 px a frame, then from the cut the car panning left 14 px a frame and zooming in slowly
function paintFrame(g, k, dog, car) {
  g.fillStyle = '#000'; g.fillRect(0, 0, PW, PH);
  if (k < CUT) cover(g, dog, 1.1, -2 * k, 0);
  else { const j = k - CUT; cover(g, car, 1.25 + 0.004 * j, 60 - 14 * j, 0); }
}
/* one row: a fresh layer on its own clip canvas, played frame by frame from 0 to the last frame shown, in order, at plate scale
   TW / 1080; returns the tiles (canvases) for SHOW */
async function playRow(over, TW, TH) {
  const dog = await loadPhoto('dog'), car = await loadPhoto('revuelto');
  const clip = canvas(PW, PH), cg = clip.getContext('2d');
  const mid = '_fxnewmosh_' + made.length + '_' + Date.now();
  FM.media.set(mid, { kind: 'image', el: clip, width: PW, height: PH, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: PW / 2, y: PH / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = [fx(over)];
  const scene = { project: { width: PW, height: PH, fps: FPS, duration: 4, background: '#0b0e14' }, layers: [L], selectedId: null, selectedIds: [] };
  const rs = TW / PW, plate = canvas(Math.round(PW * rs), Math.round(PH * rs));
  plate.__fmRS = rs; plate.__fmOX = 0; plate.__fmOY = 0;
  const pg = plate.getContext('2d', { willReadFrequently: true }), tiles = [];
  for (let k = 0; k <= SHOW[SHOW.length - 1]; k++) {
    paintFrame(cg, k, dog, car);
    FM.renderScene(pg, scene, k / FPS);
    const at = SHOW.indexOf(k);
    if (at >= 0) { const t = canvas(TW, TH); t.getContext('2d').drawImage(plate, 0, 0, TW, TH); tiles[at] = t; }
  }
  return tiles;
}
// mean level difference of two tiles (to report how moshed the defaults are)
function meanDiff(a, b) {
  const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, db = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
  let s = 0; for (let i = 0; i < da.length; i += 4) s += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
  return +(s / (da.length / 4 * 3)).toFixed(2);
}

/* ───────────────────────── the big page: the defaults at the phone preview's scale ───────────────────────── */
async function bigPage() {
  const TW = 300, TH = 533, M = 24, G = 18, HD = 96, LB = 30;
  const sheet = canvas(M * 2 + 4 * TW + 3 * G, HD + TH + LB + M), g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Datamosh Bloom (#966 B17) — the old shot dragged along by the new one', M, 16, 22, '#ffffff');
  wrapLabel(g, 'At its defaults (Amount 0.7, Block 16 px, Heal 0.1, Colour bleed 0.5), Start at on the cut from the dog to the panning car. Left: the clip as it is, 12 frames after the cut.', M, 50, 14, sheet.width - 2 * M);
  let ts = Date.now();
  const clip = await playRow({ amount: 0 }, TW, TH), def = await playRow({}, TW, TH);
  timing['big'] = Date.now() - ts;
  const cells = [['The clip, +12 (no effect)', clip[3]], ['+2 frames ' + REC, def[1]], ['+12', def[3]], ['+24 (0.8 s)', def[4]]];
  cells.forEach(([cap, tile], i) => { const x = M + i * (TW + G); if (tile) g.drawImage(tile, x, HD); else errors.push('big: no tile for ' + cap); caption(g, cap, x, HD + TH + 8, 14); });
  try { numbers['defaults vs the clip, mean levels at +2 / +6 / +12 / +24'] = [1, 2, 3, 4].map(i => meanDiff(def[i], clip[i])).join(' / '); } catch (e) { errors.push('numbers: ' + (e && e.message)); }
  return sheet;
}

/* ───────────────────────── grid pages: each row one setting, five moments across ───────────────────────── */
async function gridPage(base, title, sub, rows) {
  const TW = 150, TH = 267, M = 24, G = 8, HD = 96, LB = 28, CB = 24, RG = 10, N = 5;
  const sheet = canvas(M * 2 + N * TW + (N - 1) * G, HD + rows.length * (LB + TH + CB + RG) + M), g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, title, M, 16, 22, '#ffffff');
  wrapLabel(g, sub, M, 50, 14, sheet.width - 2 * M);
  for (let r = 0; r < rows.length; r++) {
    const [name, over] = rows[r], y = HD + r * (LB + TH + CB + RG);
    caption(g, name, M, y + 4, 15);
    const ts = Date.now();
    let tiles = [];
    try { tiles = await playRow(over, TW, TH); } catch (e) { errors.push(base + ' ' + name + ': ' + (e && e.message)); }
    for (let k = 0; k < N; k++) {
      const x = M + k * (TW + G);
      if (tiles[k]) g.drawImage(tiles[k], x, y + LB);
      label(g, SHOW_CAP[k], x, y + LB + TH + 5, 12, '#9aa4b6', '500');
    }
    timing[base + ': ' + name] = Date.now() - ts;
    await sleep(0);
  }
  return sheet;
}
const PAGES = [
  ['moshbloom-amount', 'Datamosh Bloom — Amount', 'How much of the mosh shows over the clip. The mosh builds the same underneath whatever Amount is, so a keyframed Amount reveals it.', [
    ['The clip (Amount 0)', { amount: 0 }], ['Amount 0.4', { amount: 0.4 }], ['Amount 0.7 (default) ' + REC, {}], ['Amount 1 (pure mosh)', { amount: 1 }]]],
  ['moshbloom-block', 'Datamosh Bloom — Block size', 'The squares the old picture is dragged in, in project pixels (here a 1080-wide frame). Smaller is smoother, bigger is chunkier.', [
    ['Block 8 px', { block: 8 }], ['Block 16 px (default) ' + REC, {}], ['Block 32 px', { block: 32 }], ['Block 64 px', { block: 64 }]]],
  ['moshbloom-heal', 'Datamosh Bloom — Heal', 'How fast the smear clears back to the clip. At 0 the old shot is never cleared; 1 clears it within a few frames.', [
    ['Heal 0 (never clears)', { decay: 0 }], ['Heal 0.05', { decay: 0.05 }], ['Heal 0.1 (default) ' + REC, {}], ['Heal 0.3', { decay: 0.3 }]]],
  ['moshbloom-colour', 'Datamosh Bloom — Colour bleed, and Start at', 'Colour bleed keeps the old colours longer than the old shapes as it heals (shown at Heal 0.2). Last row: Start at half a second after the cut.', [
    ['Colour bleed 0', { decay: 0.2, chroma: 0 }], ['Colour bleed 0.5 (default) ' + REC, { decay: 0.2 }], ['Colour bleed 1', { decay: 0.2, chroma: 1 }], ['Start at 0.7 s (half a second after the cut)', { hold: (CUT + 15) / FPS }]]],
];

const out = {}, sheets = {};
try {
  sheets['moshbloom-big.jpg'] = await bigPage();
  for (const [base, title, sub, rows] of PAGES) sheets[base + '.jpg'] = await gridPage(base, title, sub, rows);
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.unpin) FM.media.unpin(id); } catch (e) {} try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewMosh = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest rows, any errors, and how far the
   defaults sit from the clip after the cut (a check that the sheet is not showing an effect that did nothing) */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), numbers: numbers, ms: Date.now() - t0 };
