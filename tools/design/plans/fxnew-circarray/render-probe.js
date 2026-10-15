/* render-probe.js — the #545 options sheets for #966 B30 Circle Array, rendered through the APP'S OWN compositor (FM.renderScene, the
   very kernel the export runs), so what he picks from is what the app draws. For tools/shot.py --js-file, in the next browser slot.
   Nothing in the app is changed: the photos are throwaway media records and layers, removed at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmNewCircarray as data URLs and only the summary returns.

   A FRESH Image is loaded for every tile: FM.media.remove() empties the element it was given, so an image used twice renders black.
   (Each tile also gets its own canvas as the media element, so removing one never touches another.)

   The run, from the worktree that holds this file (never beside a ship or a mutation — a browser beside ship.sh turned 921 red):
     P=<free port>; R=<free port>
     tools/serve.sh $P . &   python3 tools/design/plans/fxnew-looks/recv.py $R /tmp/fm-circarray &
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
         --js-file tools/design/plans/fxnew-circarray/render-probe.js --out /tmp/fm-circarray/page.png

   Every tile is a 9:16 frame on a dark ground, drawn at the size it is shown (Radius and Spiral are shares of the frame, so a tile
   shows the export's proportions exactly). Three subjects, each centred: a small photo card (the dog, a quarter of the width), a thin
   gold petal (a bar), and the word WOW. Pages — each under 2x as tall as wide, so it reaches his phone whole (the tall-images lesson):
     circlearray-big.jpg     three big tiles at the defaults (six copies, 30 %, facing out, the original hidden): the photo card,
                             the petal, and the photo card with Face centre Off
     circlearray-count.jpg   Copies 3 / 4 / 6 / 8 / 12 on the card — and 6 / 12 / 18 / 24 / 36 petals
     circlearray-face.jpg    Face centre Off / On, the original kept in the middle, a rosette (Radius 0), the word WOW
                             — and Spiral 0 / 25 / 50 / −30 and a spiral galaxy of petals
     circlearray-steps.jpg   Fade 0 / 30 / 60 / 100 and Fade with Scale step — and Scale step 100 / 90 / 80 / 110 / 120
     circlearray-spin.jpg    Spin 60 °/s at five moments — and a spiral of petals spinning
   "RECOMMENDED" marks the builder's pick. Every tile is an option of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('circlearray')) return { ok: false, error: 'this tree has no Circle Array (circlearray) — serve hunt/fxnew-circarray' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];
const REC = 'RECOMMENDED';   // a row or tile whose name ends with this gets it in gold
const PHOTO = 'dog';

const fx = over => { const e = FM.fxRegistry.makeInstance('circlearray'); Object.assign(e.params, over || {}); return e; };
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

/* ───────────────────────── the subjects, through FM.renderScene ───────────────────────── */
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
  const mid = '_fxnewcircarray_' + key + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: w, height: h, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: x, y: y, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  return L;
}
// the subject centred in a W x H frame: 'card' (the dog photo, a quarter of the width, 3:4), 'petal' (a thin gold bar) or 'word' (WOW)
async function subject(kind, W, H) {
  if (kind === 'petal') return FM.makeLayer('shape', { shape: 'rect', x: W / 2, y: H / 2, shapeW: Math.round(W * 0.045), shapeH: Math.round(W * 0.2), fill: '#f2c14e' });
  if (kind === 'word') return FM.makeLayer('text', { text: 'WOW', x: W / 2, y: H / 2, fontSize: Math.round(W * 0.09), color: '#ffffff', fill: '#ffffff' });
  const cw = Math.round(W * 0.25);
  return photoLayer(PHOTO, cw, Math.round(cw * 4 / 3), W / 2, H / 2);
}
// one tile: the subject with Circle Array on it, W x H, at time t
async function tile(over, W, H, t, kind) {
  const L = await subject(kind || 'card', W, H);
  L.start = 0; L.duration = 4;
  L.effects = [fx(over)];
  const c = canvas(W, H);
  FM.renderScene(c.getContext('2d'), { project: { width: W, height: H, fps: 30, duration: 4, background: '#0b0e14' }, layers: [L], selectedId: null, selectedIds: [] }, t == null ? 0.5 : t);
  return c;
}

/* ───────────────────────── the big page: the defaults on two subjects, and Face centre Off ───────────────────────── */
async function bigPage() {
  const TW = 300, TH = 533, M = 24, G = 18, HD = 96, LB = 46;
  const tiles = [['The defaults on a photo ' + REC, {}, 'card'], ['The defaults on a petal', {}, 'petal'], ['Face centre Off (all upright)', { face: 0 }, 'card']];
  const sheet = canvas(M * 2 + 3 * TW + 2 * G, HD + TH + LB + M), g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Circle Array (#966 B30) — copies of the layer round a circle', M, 16, 22, '#ffffff');
  wrapLabel(g, 'At its defaults: six copies, 30 % of the frame’s width out, each turned to face out from the middle, the original hidden (a 9:16 frame, drawn as the export).', M, 50, 14, sheet.width - 2 * M);
  for (let i = 0; i < tiles.length; i++) {
    const x = M + i * (TW + G), ts = Date.now();
    try { g.drawImage(await tile(tiles[i][1], TW, TH, 0.5, tiles[i][2]), x, HD); } catch (e) { errors.push('big ' + tiles[i][0] + ': ' + (e && e.message)); }
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
      const [cap, over, t, kind] = cells[k], x = M + k * (TW + G);
      try { g.drawImage(await tile(over, TW, TH, t, kind), x, y + LB); }
      catch (e) { errors.push(base + ' ' + name + ' / ' + cap + ': ' + (e && e.message)); }
      caption(g, cap, x, y + LB + TH + 5, 12);
    }
    timing[base + ': ' + name] = Date.now() - ts;
    await sleep(0);
  }
  return sheet;
}
const SPIN = { spin: 60 };
const PAGES = [
  ['circlearray-count', 'Circle Array — how many copies', 'Copies runs from 2 to 36, always evenly round the circle, the first straight up. Six is the default.', [
    ['On the photo', [['3', { count: 3 }], ['4', { count: 4 }], ['6 (default) ' + REC, {}], ['8', { count: 8 }], ['12', { count: 12 }]]],
    ['On a petal', [['6', {}, 0.5, 'petal'], ['12 ' + REC, { count: 12 }, 0.5, 'petal'], ['18', { count: 18 }, 0.5, 'petal'], ['24', { count: 24, radius: 20 }, 0.5, 'petal'], ['36', { count: 36, radius: 15 }, 0.5, 'petal']]]]],
  ['circlearray-face', 'Circle Array — facing, the original, and spirals', 'Face centre turns each copy to point out from the middle. Original can stay in the middle. Spiral carries each copy further out than the one before.', [
    ['Face centre and Original', [['Face centre Off', { face: 0 }], ['Face centre On (default) ' + REC, {}], ['Off, original kept', { face: 0, keep: 1 }], ['Radius 0 — a rosette', { radius: 0, count: 8 }, 0.5, 'petal'], ['The word WOW', { count: 8, radius: 28 }, 0.5, 'word']]],
    ['Spiral', [['0 (default) ' + REC, { count: 12 }, 0.5, 'petal'], ['25 %', { count: 12, spiral: 25 }, 0.5, 'petal'], ['50 %', { count: 12, spiral: 50 }, 0.5, 'petal'], ['−30 % (inward)', { count: 12, spiral: -30 }, 0.5, 'petal'],
      ['A galaxy: 36, Radius 5, Spiral 45', { count: 36, radius: 5, spiral: 45, scale: 98 }, 0.5, 'petal']]]]],
  ['circlearray-steps', 'Circle Array — each copy different from the one before', 'Fade makes each copy fainter (even at 100 % the last one is faintly there); Scale step makes each copy this size of the one before.', [
    ['Fade', [['0 (default) ' + REC, {}], ['30 %', { fade: 30 }], ['60 %', { fade: 60 }], ['100 %', { fade: 100 }], ['80 % with Scale step 90', { fade: 80, scale: 90, count: 8 }]]],
    ['Scale step (eight copies)', [['100 (default) ' + REC, { count: 8 }], ['90 %', { count: 8, scale: 90 }], ['80 %', { count: 8, scale: 80 }], ['110 %', { count: 8, scale: 110 }], ['120 %', { count: 8, scale: 120, radius: 34 }]]]]],
  ['circlearray-spin', 'Circle Array — Spin', 'Spin turns the whole ring, in degrees a second; keyframed it speeds up or slows down without the ring ever jumping. Five moments of each.', [
    ['Spin 60 °/s, facing out', [['0 s', SPIN, 0], ['0.5 s', SPIN, 0.5], ['1 s', SPIN, 1], ['1.5 s', SPIN, 1.5], ['2 s', SPIN, 2]]],
    ['A spiral of petals, Spin −90 °/s', [['0 s', { count: 18, spiral: 35, spin: -90, radius: 8 }, 0, 'petal'], ['0.5 s', { count: 18, spiral: 35, spin: -90, radius: 8 }, 0.5, 'petal'], ['1 s', { count: 18, spiral: 35, spin: -90, radius: 8 }, 1, 'petal'],
      ['1.5 s', { count: 18, spiral: 35, spin: -90, radius: 8 }, 1.5, 'petal'], ['2 s', { count: 18, spiral: 35, spin: -90, radius: 8 }, 2, 'petal']]]]],
];

const out = {}, sheets = {};
try {
  sheets['circlearray-big.jpg'] = await bigPage();
  for (const [base, title, sub, rows] of PAGES) sheets[base + '.jpg'] = await gridPage(base, title, sub, rows);
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.unpin) FM.media.unpin(id); } catch (e) {} try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewCircarray = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest rows, any errors, and where the
   defaults put the copies on a 1080 x 1920 export (FM._circleArrayCopies — the layer in the middle) */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
const ring = (FM._circleArrayCopies ? FM._circleArrayCopies({}, 0.5, 0.5, 540, 960, 1080) : []).map(q => Math.round(q.x) + ',' + Math.round(q.y));
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), defaultsOn1080x1920: ring.join(' '), ms: Date.now() - t0 };
