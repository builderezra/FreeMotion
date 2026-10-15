/* render-probe.js — the #545 sheets for #966 B53 Deflicker (ported from the ChatGPT pile's 0cdc6732), rendered through the APP'S OWN
   compositor (FM.renderScene, the very kernel the export runs), so what he picks from is what the app draws. For tools/shot.py
   --js-file, in the next browser slot. Nothing in the app is changed: the clips are throwaway media records and layers, removed at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmNewDeflicker as data URLs and only the summary returns.

   THIS EFFECT HAS HISTORY, SO EVERY ROW IS PLAYED IN ORDER. A frame of Deflicker is evened out against the frames before it; a frame
   rendered on its own is the clip as it is. So each row is ONE layer (its own id, so its own history) rendered at every frame from 0
   to the last, a 30th of a second apart. Never render a tile out of order, never skip frames, and never share a layer between rows.
   THE CLIP is made here, frame by frame: before each render the layer's own media canvas is repainted with that frame's picture — the
   dog photo, still, its brightness flickering irregularly by up to ±16 % (a seeded hash per frame, like a time-lapse or a mains-lit
   room), and from frame 70 to 95 a REAL fade down to 45 % that then holds: the part the effect must keep. A FRESH Image is loaded for
   every row and every row gets its own clip canvas: FM.media.remove() empties the element it was given.
   The project is 1080 x 1920 and every row renders on a plate the size of its tiles (the plate scale the phone preview uses).

   The run, from the worktree that holds this file (never beside a ship or a mutation — a browser beside ship.sh turned 921 red):
     P=<free port>; R=<free port>
     tools/serve.sh $P . &   python3 tools/design/plans/fxnew-looks/recv.py $R /tmp/fm-deflicker &
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
         --js-file tools/design/plans/pile-deflicker/render-probe.js --out /tmp/fm-deflicker/page.png

   Pages — each under 2x as tall as wide, so it reaches his phone whole (the tall-images lesson):
     deflicker-strip.jpg   before / after: six frames in a row (20 to 25, where the flicker is) — the clip, Deflicker at its
                           defaults (RECOMMENDED), Smoothing 0.2 s, Smoothing 1.5 s
     deflicker-graph.jpg   the brightness of every frame, 0 to 4 s: the clip, the defaults, Smoothing 0.2 and 1.5 s, Strength 50 % —
                           with the real fade (frames 70 to 95) shaded, where every line should follow the clip down
   "RECOMMENDED" marks the builder's pick. Every row is an option of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('deflicker')) return { ok: false, error: 'this tree has no Deflicker — serve hunt/pile-deflicker' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [], numbers = {};
const REC = 'RECOMMENDED';
const PW = 1080, PH = 1920, FPS = 30, N = 120, FADE0 = 70, FADE1 = 95;
const STRIP = [20, 21, 22, 23, 24, 25];

const fx = over => { const e = FM.fxRegistry.makeInstance('deflicker'); Object.assign(e.params, over || {}); return e; };
const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function label(g, text, x, y, size, colour, weight) { g.font = (weight || '600') + ' ' + (size || 15) + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(text, x, y); }
function wrapLabel(g, text, x, y, size, maxW) {
  g.font = '500 ' + size + 'px system-ui, sans-serif';
  const lines = [''];
  String(text).split(' ').forEach(w => { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (g.measureText(tryL).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tryL; });
  lines.slice(0, 2).forEach((l, i) => label(g, l, x, y + i * (size + 4), size, '#9aa4b6', '500'));
}
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
function loadPhoto(key) {
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1&n=' + made.length + '_' + Date.now(); });
}
function cover(g, im) {
  const s = Math.max(PW / im.naturalWidth, PH / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
  g.drawImage(im, (PW - w) / 2, (PH - h) / 2, w, h);
}
// frame k's brightness: an irregular flicker of up to ±16 % (a seeded hash, the same every run), times the real fade from FADE0 to FADE1
function hash01(k) { let x = (k + 1) * 374761393; x = (x ^ (x >>> 13)) * 1274126177; x = x ^ (x >>> 16); return ((x >>> 0) % 10007) / 10006; }
function bright(k) {
  const fade = k <= FADE0 ? 1 : (k >= FADE1 ? 0.45 : 1 - 0.55 * (k - FADE0) / (FADE1 - FADE0));
  return fade * (1 + 0.16 * (2 * hash01(k) - 1));
}
function paintFrame(g, k, photo) {
  g.filter = 'none'; g.fillStyle = '#000'; g.fillRect(0, 0, PW, PH);
  g.filter = 'brightness(' + bright(k).toFixed(4) + ')';
  cover(g, photo);
  g.filter = 'none';
}
function lumaOf(cv) {
  const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data;
  let s = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; }
  return n ? s / n : 0;
}
/* one row: a fresh layer on its own clip canvas, played frame by frame from 0 to N − 1, in order, on a TW-wide plate; returns the tiles
   for STRIP and the brightness of every frame */
async function playRow(over, TW, TH) {
  const photo = await loadPhoto('dog');
  const clip = canvas(PW, PH), cg = clip.getContext('2d');
  const mid = '_pdeflicker_' + made.length + '_' + Date.now();
  FM.media.set(mid, { kind: 'image', el: clip, width: PW, height: PH, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: PW / 2, y: PH / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = over === null ? [] : [fx(over)];
  const scene = { project: { width: PW, height: PH, fps: FPS, duration: 4, background: '#0b0e14' }, layers: [L], selectedId: null, selectedIds: [] };
  const rs = TW / PW, plate = canvas(Math.round(PW * rs), Math.round(PH * rs));
  plate.__fmRS = rs; plate.__fmOX = 0; plate.__fmOY = 0;
  const pg = plate.getContext('2d', { willReadFrequently: true }), tiles = [], luma = [];
  for (let k = 0; k < N; k++) {
    paintFrame(cg, k, photo);
    pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, plate.width, plate.height);
    FM.renderScene(pg, scene, k / FPS);
    luma.push(lumaOf(plate));
    const at = STRIP.indexOf(k);
    if (at >= 0) { const t = canvas(TW, TH); t.getContext('2d').drawImage(plate, 0, 0, TW, TH); tiles[at] = t; }
  }
  return { tiles: tiles, luma: luma };
}
const swing = (v, a, b) => { let t = 0; for (let i = a + 1; i <= b; i++) t += Math.abs(v[i] - v[i - 1]); return t / (b - a); };

/* ───────────────────────── the rows (each played once, shared by both pages) ───────────────────────── */
const ROWS = [
  ['The clip (no Deflicker)', null, '#9aa4b6'],
  ['Deflicker — defaults (Smoothing 0.5 s, Strength 100 %, up to 1 EV) ' + REC, {}, '#ffd24a'],
  ['Smoothing 0.2 s (follows faster, evens out less)', { smooth: 0.2 }, '#5ab0ff'],
  ['Smoothing 1.5 s (evens out more, settles slower)', { smooth: 1.5 }, '#5fd38a'],
  ['Strength 50 %', { strength: 50 }, '#c58bff'],
];
const TW = 120, TH = 213;
const runs = [];
try {
  for (const [name, over] of ROWS) {
    const ts = Date.now();
    try { runs.push(await playRow(over, TW, TH)); } catch (e) { errors.push(name + ': ' + (e && e.message)); runs.push(null); }
    timing[name] = Date.now() - ts;
    await sleep(0);
  }
} finally { made.forEach(id => { try { if (FM.media.unpin) FM.media.unpin(id); } catch (e) {} try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }

/* ───────────────────────── page 1: before / after, six frames in a row ───────────────────────── */
function stripPage() {
  const M = 24, G = 8, HD = 96, LB = 26, RG = 10, show = [0, 1, 2, 3];
  const sheet = canvas(M * 2 + STRIP.length * TW + (STRIP.length - 1) * G, HD + show.length * (LB + TH + RG) + M + 22), g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Deflicker (#966 B53) — frames 20 to 25, played in order', M, 16, 22, '#ffffff');
  wrapLabel(g, 'A still photo whose brightness flickers from frame to frame. Each row is the same six frames; a steady row is the effect working.', M, 50, 14, sheet.width - 2 * M);
  show.forEach((ri, r) => {
    const y = HD + r * (LB + TH + RG), run = runs[ri];
    caption(g, ROWS[ri][0], M, y, 14);
    STRIP.forEach((k, i) => { const x = M + i * (TW + G); if (run && run.tiles[i]) g.drawImage(run.tiles[i], x, y + LB); else errors.push('strip: no tile ' + k + ' in ' + ROWS[ri][0]); });
  });
  STRIP.forEach((k, i) => label(g, 'frame ' + k, M + i * (TW + G), sheet.height - M - 16, 12, '#9aa4b6', '500'));
  return sheet;
}

/* ───────────────────────── page 2: the brightness of every frame ───────────────────────── */
function graphPage() {
  const W = 1000, H = 640, M = 24, HD = 96, GL = 70, GR = 24, GT = HD + 10, GB = H - 150;
  const sheet = canvas(W, H), g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, W, H);
  label(g, 'Deflicker (#966 B53) — brightness, frame by frame', M, 16, 22, '#ffffff');
  wrapLabel(g, 'Mean brightness of every frame over 4 s. The flicker should flatten; the real fade (shaded, frames 70 to 95) should be followed down, not smoothed away.', M, 50, 14, W - 2 * M);
  const all = runs.filter(Boolean).reduce((a, r) => a.concat(r.luma), []);
  const lo = Math.floor(Math.min.apply(null, all) / 10) * 10 - 5, hi = Math.ceil(Math.max.apply(null, all) / 10) * 10 + 5;
  const X = k => GL + (W - GL - GR) * k / (N - 1), Y = v => GB - (GB - GT) * (v - lo) / (hi - lo);
  g.fillStyle = 'rgba(255,210,74,0.08)'; g.fillRect(X(FADE0), GT, X(FADE1) - X(FADE0), GB - GT);
  label(g, 'the real fade', X(FADE0) + 6, GT + 4, 12, '#c9b46a', '500');
  g.strokeStyle = '#2a3140'; g.lineWidth = 1;
  for (let v = Math.ceil(lo / 20) * 20; v <= hi; v += 20) { g.beginPath(); g.moveTo(GL, Y(v)); g.lineTo(W - GR, Y(v)); g.stroke(); label(g, String(v), 30, Y(v) - 7, 12, '#9aa4b6', '500'); }
  for (let s = 0; s <= 4; s++) { const k = Math.min(N - 1, s * FPS); label(g, s + ' s', X(k) - 8, GB + 6, 12, '#9aa4b6', '500'); }
  runs.forEach((run, ri) => {
    if (!run) return;
    g.strokeStyle = ROWS[ri][2]; g.lineWidth = ri === 1 ? 3 : (ri === 0 ? 2 : 1.5);
    g.beginPath(); run.luma.forEach((v, k) => { if (k) g.lineTo(X(k), Y(v)); else g.moveTo(X(k), Y(v)); }); g.stroke();
  });
  ROWS.forEach((row, ri) => {
    const x = M + (ri % 2) * 480, y = GB + 34 + Math.floor(ri / 2) * 24;
    g.fillStyle = row[2]; g.fillRect(x, y + 6, 22, 4);
    caption(g, row[0], x + 30, y, 13);
  });
  return sheet;
}

const out = {}, sheets = {};
try {
  sheets['deflicker-strip.jpg'] = stripPage();
  sheets['deflicker-graph.jpg'] = graphPage();
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} catch (e) { errors.push('pages: ' + (e && e.message)); }
window.__fmNewDeflicker = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints: what was posted, the flicker left before the fade (mean frame-to-frame swing, frames 1 to 69), and how
   much of the real fade each row keeps (its drop from frame 70 to 100 as a share of the clip's) — a check that the sheet is not
   showing an effect that did nothing, or one that flattened the fade */
ROWS.forEach((row, ri) => {
  const r = runs[ri]; if (!r) return;
  const clip = runs[0];
  numbers[row[0].replace(/ RECOMMENDED$/, '').slice(0, 28)] = 'swing ' + swing(r.luma, 0, FADE0 - 1).toFixed(2) +
    (clip ? ', fade kept ' + Math.round((r.luma[FADE0] - r.luma[FADE1 + 5]) / Math.max(1e-6, clip.luma[FADE0] - clip.luma[FADE1 + 5]) * 100) + ' %' : '');
});
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k.slice(0, 30) + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), numbers: numbers, ms: Date.now() - t0 };
