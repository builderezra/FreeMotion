/* render-probe.js — the #545 options sheets for #966 B29 Lens Magnifier, rendered through the APP'S OWN compositor (FM.renderScene,
   the very kernel the export runs), so what he picks from is what the app draws. For tools/shot.py --js-file, in the next browser
   slot. Nothing in the app is changed: the photos are throwaway media records and layers, removed at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmNewLensmag as data URLs and only the summary returns.

   A FRESH Image is loaded for every tile: FM.media.remove() empties the element it was given, so an image used twice renders black.
   (Each tile also gets its own canvas as the media element, so removing one never touches another.)

   The run, from the worktree that holds this file (never beside a ship or a mutation — a browser beside ship.sh turned 921 red):
     P=<free port>; R=<free port>
     tools/serve.sh $P . &   python3 tools/design/plans/fxnew-looks/recv.py $R /tmp/fm-lensmag &
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
         --js-file tools/design/plans/fxnew-lensmag/render-probe.js --out /tmp/fm-lensmag/page.png

   Every tile is the towers photo (a detail-packed aerial — something to see blown up) with Lens Magnifier on it, in a 9:16 frame.
   Pages — each under 2x as tall as wide, so it reaches his phone whole (the tall-images lesson):
     lensmag-big.jpg      three big tiles at the defaults but the Shape: Circle (the default), Rounded square, Square
     lensmag-zoom.jpg     a row of Zoom 1.5, 2, 3, 5, 8 — and a row of Size 20, 30, 40, 60, 90 %
     lensmag-look.jpg     a row of rims and shadows (none, the default white rim, a black ring, a thin gold rim, a thick dark ring)
                          — and a row of Feather 0, 15, 40, 100 % and a soft lens with no rim and no shadow
     lensmag-move.jpg     the lens moving across the frame (Centre X / Y keyframed, five moments), and Zoom keyframed 1 → 6
   "RECOMMENDED" marks the builder's pick. Every tile is an option of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('lensmag')) return { ok: false, error: 'this tree has no Lens Magnifier (lensmag) — serve hunt/fxnew-lensmag' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];
const REC = 'RECOMMENDED';   // a row or tile whose name ends with this gets it in gold
const PHOTO = 'towers';

const fx = over => { const e = FM.fxRegistry.makeInstance('lensmag'); Object.assign(e.params, over || {}); return e; };
const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function label(g, text, x, y, size, colour, weight) { g.font = (weight || '600') + ' ' + (size || 15) + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(text, x, y); }
// a line of grey text wrapped at `maxW`, two lines at most (the page headers leave room for two)
function wrapLabel(g, text, x, y, size, maxW) {
  g.font = '500 ' + size + 'px system-ui, sans-serif';
  const lines = [''];
  String(text).split(' ').forEach(w => { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (g.measureText(tryL).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tryL; });
  lines.slice(0, 2).forEach((l, i) => label(g, l, x, y + i * (size + 4), size, '#9aa4b6', '500'));
}
// a tile caption, with ★ RECOMMENDED under it in gold when the name ends with it
function caption(g, text, x, y, size) {
  const rec = / RECOMMENDED$/.test(text);
  label(g, text.replace(/ RECOMMENDED$/, ''), x, y, size);
  if (rec) label(g, '★ RECOMMENDED', x, y + size + 3, size - 1, '#ffd24a');
}
async function post(name, sheet) {
  const blob = await new Promise(r => sheet.toBlob(r, 'image/jpeg', Q));
  if (!RECV) return 'kept on window (no receiver)';
  try { const res = await fetch(RECV + '/' + name, { method: 'POST', body: blob }); return res.ok ? 'posted ' + blob.size + ' B' : 'POST HTTP ' + res.status; }
  catch (e) { return 'POST failed: ' + (e && e.message); }
}

/* ───────────────────────── a photo layer, through FM.renderScene ───────────────────────── */
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
  const mid = '_fxnewlensmag_' + key + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: w, height: h, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: x, y: y, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  return L;
}
/* one tile: the photo with the lens on it, W x H, at time t. The tile is drawn at the size it is shown, so Border width (project
   px) is scaled to the tile: a 6 px rim on a 1080-wide export is 6 x W / 1080 here — the tile shows the EXPORT's proportions. */
const EXPORT_W = 1080;
async function tile(over, W, H, t) {
  const L = await photoLayer(PHOTO, W, H, W / 2, H / 2);
  const o = Object.assign({}, over || {});
  const bw = o.border == null ? 6 : o.border;
  o.border = bw * W / EXPORT_W;
  L.effects = [fx(o)];
  const c = canvas(W, H);
  FM.renderScene(c.getContext('2d'), { project: { width: W, height: H, fps: 30, duration: 4, background: '#0b0e14' }, layers: [L], selectedId: null, selectedIds: [] }, t == null ? 0.5 : t);
  return c;
}

/* ───────────────────────── the big page: the three shapes at the defaults ───────────────────────── */
async function bigPage() {
  const TW = 300, TH = 533, M = 24, G = 18, HD = 96, LB = 46;
  const tiles = [['Circle (the default) ' + REC, {}], ['Rounded square', { shape: 1 }], ['Square', { shape: 2 }]];
  const sheet = canvas(M * 2 + 3 * TW + 2 * G, HD + TH + LB + M), g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Lens Magnifier (#966 B29) — the three shapes', M, 16, 22, '#ffffff');
  wrapLabel(g, 'Your aerial photo with the effect at its defaults: Zoom 2, Size 40 % of the width, a 6 px white rim and a soft shadow (a 9:16 frame, drawn as the export).', M, 50, 14, sheet.width - 2 * M);
  for (let i = 0; i < tiles.length; i++) {
    const x = M + i * (TW + G), ts = Date.now();
    try { g.drawImage(await tile(tiles[i][1], TW, TH), x, HD); } catch (e) { errors.push('big ' + tiles[i][0] + ': ' + (e && e.message)); }
    timing['big: ' + tiles[i][0]] = Date.now() - ts;
    caption(g, tiles[i][0], x, HD + TH + 8, 14);
    await sleep(0);
  }
  return sheet;
}

/* ───────────────────────── grid pages: each row one family, five tiles across ───────────────────────── */
async function gridPage(base, title, sub, rows) {
  const TW = 150, TH = 267, M = 24, G = 8, HD = 96, LB = 28, CB = 40, RG = 10, N = 5;
  const sheet = canvas(M * 2 + N * TW + (N - 1) * G, HD + rows.length * (LB + TH + CB + RG) + M), g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, title, M, 16, 22, '#ffffff');
  wrapLabel(g, sub, M, 50, 14, sheet.width - 2 * M);
  for (let r = 0; r < rows.length; r++) {
    const [name, cells] = rows[r], y = HD + r * (LB + TH + CB + RG);
    label(g, name, M, y + 4, 15);
    const ts = Date.now();
    for (let k = 0; k < cells.length && k < N; k++) {
      const [cap, over, t] = cells[k], x = M + k * (TW + G);
      try { g.drawImage(await tile(over, TW, TH, t), x, y + LB); }
      catch (e) { errors.push(base + ' ' + name + ' / ' + cap + ': ' + (e && e.message)); }
      caption(g, cap, x, y + LB + TH + 5, 12);
    }
    timing[base + ': ' + name] = Date.now() - ts;
    await sleep(0);
  }
  return sheet;
}
const kf = (a, b) => ({ kf: [{ t: 0, v: a, e: 'linear' }, { t: 2.5, v: b, e: 'linear' }] });
const PAGES = [
  ['lensmag-zoom', 'Lens Magnifier — Zoom and Size', 'Zoom is how much the lens blows the picture up (1–8×). Size is across the lens, as a share of the frame’s shorter side (2–150 %).', [
    ['Zoom', [['1.5×', { zoom: 1.5 }], ['2× (default) ' + REC, { zoom: 2 }], ['3×', { zoom: 3 }], ['5×', { zoom: 5 }], ['8×', { zoom: 8 }]]],
    ['Size', [['20 %', { size: 20 }], ['30 %', { size: 30 }], ['40 % (default) ' + REC, { size: 40 }], ['60 %', { size: 60 }], ['90 %', { size: 90 }]]]]],
  ['lensmag-look', 'Lens Magnifier — rim, shadow and feather', 'Border width is in project pixels (shown here as on a 1080-wide export) with its own colour; the shadow drops down and to the right. Feather fades the lens into the picture inside its edge.', [
    ['Rim and shadow', [['None — just the glass', { border: 0, shadow: 0 }], ['White 6 px + shadow (default) ' + REC, {}], ['Black ring 14 px', { border: 14, color: '#111111' }],
      ['Thin gold 4 px, deep shadow', { border: 4, color: '#d4af37', shadowamt: 85 }], ['Dark loupe ring 26 px', { border: 26, color: '#2b2118', shadowamt: 70 }]]],
    ['Feather', [['0 % — a hard edge (default) ' + REC, { feather: 0 }], ['15 %', { feather: 15 }], ['40 %', { feather: 40 }], ['100 % — all soft', { feather: 100 }],
      ['40 %, no rim, no shadow', { feather: 40, border: 0, shadow: 0 }]]]]],
  ['lensmag-move', 'Lens Magnifier — keyframed across the frame', 'Centre X and Y keyframed corner to corner over 2.5 s, at five moments — what its tile in the Add Effect sheet does (across, not corner to corner). Zoom keyframes the same way.', [
    ['Moving lens, Zoom 2.5', [['0 s', { x: kf(25, 75), y: kf(25, 75), zoom: 2.5 }, 0], ['0.6 s', { x: kf(25, 75), y: kf(25, 75), zoom: 2.5 }, 0.6], ['1.2 s', { x: kf(25, 75), y: kf(25, 75), zoom: 2.5 }, 1.2],
      ['1.8 s', { x: kf(25, 75), y: kf(25, 75), zoom: 2.5 }, 1.8], ['2.5 s', { x: kf(25, 75), y: kf(25, 75), zoom: 2.5 }, 2.5]]],
    ['Zooming in where it stands (Zoom 1 → 6)', [['0 s', { zoom: kf(1, 6) }, 0], ['0.6 s', { zoom: kf(1, 6) }, 0.6], ['1.2 s', { zoom: kf(1, 6) }, 1.2], ['1.8 s', { zoom: kf(1, 6) }, 1.8], ['2.5 s', { zoom: kf(1, 6) }, 2.5]]]]],
];

const out = {}, sheets = {};
try {
  sheets['lensmag-big.jpg'] = await bigPage();
  for (const [base, title, sub, rows] of PAGES) sheets[base + '.jpg'] = await gridPage(base, title, sub, rows);
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.unpin) FM.media.unpin(id); } catch (e) {} try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewLensmag = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest rows, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
