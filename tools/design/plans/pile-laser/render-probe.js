/* render-probe.js — the #545 options sheet for #966 B37 Laser Beam (ported from ChatGPT's pile 44b15c57, its keyed-Pulse fix 8efc6234
   finished), rendered through the APP'S OWN compositor (FM.renderScene), so what he picks from is what the app draws. For
   tools/shot.py --js-file, in the next browser slot (serve hunt/pile-laser with tools/serve.sh, start the receiver
   tools/design/plans/fxnew-looks/recv.py, then shot.py). Nothing in the app is changed: the subjects are throwaway layers and media
   records, removed again at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY. shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to — cut at 4000 characters — so the pictures do not come back that way. Each sheet is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the page
   address works too. Without a receiver the sheets stay on window.__fmLaserSheets as data URLs and only the summary returns.

   Every tile is a 1080 x 1080 project drawn at a quarter (270 x 270 — the phone's own reduced-plate path, so it is the export shrunk):
   the Width numbers mean what they mean on his real 1080-wide projects. Sheets (each under 3x as tall as wide, so they reach his
   phone — the tall-images lesson):
     laserbeam-looks.jpg   Width, Glow, colour and Intensity, each row over three subjects: a dark frame, his clouds photo, a round
                           'logo' the beam crosses — on the clip's first frame
     laserbeam-pulse.jpg   Pulse, each row a strip of five moments; then THE FIX: a Pulse keyed 1 → 2.5 at 1 s as built (no jump),
                           beside the pile's first formula (Pulse now x time — drawn by the app itself, as a plain Pulse equal to the
                           keyed value at each moment, which is exactly that formula), and a Pulse keyed down to 0 (it stops where it
                           is; the pile's 8efc6234 snapped to full — its jump drawn on this build's beat)
   The variants are the effect's own options, so his pick sets DEFAULTS: no rebuild. "RECOMMENDED" marks the builder's pick.
   A FRESH Image is loaded for every photo tile (never one decoded image shared across renders). */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('laserbeam')) return { ok: false, error: 'this tree has no laserbeam — serve hunt/pile-laser' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];

const P = 1080, RS = 0.25, TILE = Math.round(P * RS);
const fx = over => { const e = FM.fxRegistry.makeInstance('laserbeam'); Object.assign(e.params, over || {}); return e; };
const hold = (a, when, b) => ({ kf: [{ t: 0, v: a, e: 'linear' }, { t: when, v: b, e: 'hold' }] });
const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function render(layers, t) {
  const c = canvas(TILE, TILE);
  // the reduced plate: the 1080 project drawn at a quarter, as on his phone
  c.__fmRS = RS; c.__fmOX = 0; c.__fmOY = 0;
  FM.renderScene(c.getContext('2d'), { project: { width: P, height: P, fps: 30, duration: 4, background: '#05070c' }, layers: layers, selectedId: null, selectedIds: [] }, t);
  return c;
}
function label(g, text, x, y, size, colour) { g.font = '600 ' + (size || 15) + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(text, x, y); }
/* a name, and RECOMMENDED under it in gold when the name ends with it; long names wrap at `maxW` (four lines at most) */
function nameLabel(g, text, x, y, size, maxW) {
  const rec = / RECOMMENDED$/.test(text), name = rec ? text.replace(/ RECOMMENDED$/, '') : text;
  g.font = '600 ' + size + 'px system-ui, sans-serif';
  const words = name.split(' '), lines = [''];
  words.forEach(w => { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (g.measureText(tryL).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tryL; });
  lines.slice(0, 4).forEach((l, i) => label(g, l, x, y + i * (size + 3), size));
  if (rec) label(g, '★ RECOMMENDED', x, y + Math.min(4, lines.length) * (size + 3), size, '#ffd24a');
}
async function post(name, sheet) {
  const blob = await new Promise(r => sheet.toBlob(r, 'image/jpeg', Q));
  if (!RECV) return 'kept on window (no receiver)';
  try { const res = await fetch(RECV + '/' + name, { method: 'POST', body: blob }); return res.ok ? 'posted ' + blob.size + ' B' : 'POST HTTP ' + res.status; }
  catch (e) { return 'POST failed: ' + (e && e.message); }
}

/* the subjects: a dark navy layer filling the frame; a round white 'logo' in the middle of the dark frame (the beam is the logo
   layer's effect, so it crosses the logo); his clouds photo */
function dark(effect) {
  const L = FM.makeLayer('shape', { shape: 'rect', x: P / 2, y: P / 2, shapeW: P, shapeH: P, fill: '#0d1626' });
  L.start = 0; L.duration = 4; L.effects = effect ? [effect] : [];
  return [L];
}
function logo(effect) {
  const L = FM.makeLayer('shape', { shape: 'ellipse', x: P / 2, y: P / 2, shapeW: 360, shapeH: 360, fill: '#f4f1e8' });
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
  const mid = '_pilelaser_' + key + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: P, height: P, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: P / 2, y: P / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = effect ? [effect] : [];
  return [L];
}
async function subject(kind, effect) { return kind === 'photo' ? photo('clouds', effect) : (kind === 'logo' ? logo(effect) : dark(effect)); }

// a row whose name ends with this is drawn with it on its own line, in gold
const REC = 'RECOMMENDED';
/* each row: [name, settings — an object, or a function of the moment t for a row that redraws a formula by hand — and its columns,
   each [heading, subject, moment]] */
const LOOK_COLS = [['Dark frame', 'dark', 0], ['His clouds photo', 'photo', 0], ['A round logo it crosses', 'logo', 0]];
const strip = (times, kind) => times.map(t => [t.toFixed(2) + ' s', kind || 'dark', t]);
const SHEETS = {
  'laserbeam-looks.jpg': ['Laser Beam (#966 B37) — the look: each row one setting, over three subjects, a 1080 frame', [
    ['Defaults: Width 6 px, Glow 70 %, Intensity 100 %, red #ff4055 ' + REC, {}, LOOK_COLS],
    ['Hairline: Width 2', { width: 2 }, LOOK_COLS],
    ['Thick: Width 24', { width: 24 }, LOOK_COLS],
    ['No glow (Glow 0): just the beam and its core', { glow: 0 }, LOOK_COLS],
    ['Big glow (Glow 100)', { glow: 100 }, LOOK_COLS],
    ['Green #39ff6a', { color: '#39ff6a' }, LOOK_COLS],
    ['Sky blue #39c6ff', { color: '#39c6ff' }, LOOK_COLS],
    ['White #ffffff', { color: '#ffffff' }, LOOK_COLS],
    ['Intensity 50 %', { intensity: 50 }, LOOK_COLS],
    ['Corner to corner (Start 10 %, 85 % to End 90 %, 15 %)', { x1: 10, y1: 85, x2: 90, y2: 15 }, LOOK_COLS],
  ]],
  'laserbeam-pulse.jpg': ['Laser Beam (#966 B37) — Pulse: each row one setting at five moments, a 1080 frame', [
    ['Pulse 0: steady ' + REC, { pulse: 0 }, strip([0, 0.2, 0.4, 0.6, 0.8])],
    ['Pulse 1 a second: full, 0.7, 0.4, 0.7, full', { pulse: 1 }, strip([0, 0.25, 0.5, 0.75, 1])],
    ['Pulse 2.5 a second', { pulse: 2.5 }, strip([0, 0.1, 0.2, 0.3, 0.4])],
    ['Pulse 8 a second (a fast flicker)', { pulse: 8 }, strip([0, 0.03, 0.06, 0.09, 0.12])],
    ['THE FIX: Pulse keyed 1 → 2.5 at 1 s, as built — no jump at the key', { pulse: hold(1, 1, 2.5) }, strip([0.9, 0.95, 1, 1.05, 1.1])],
    ['…the same key with the pile’s first formula (Pulse now × time) — it jumps at the key', t => ({ pulse: t < 1 ? 1 : 2.5 }), strip([0.9, 0.95, 1, 1.05, 1.1])],
    ['Pulse keyed 1 → 0 at 1.5 s, as built — the beat stops where it is', { pulse: hold(1, 1.5, 0) }, strip([1.3, 1.4, 1.5, 1.6, 1.7])],
    // the pile's 8efc6234 drew a Pulse of 0 as steady and full, which a plain Pulse 0 is on this build
    ['…the same key with the pile’s 8efc6234 — snaps to full at the key (its jump, drawn on this beat)', t => ({ pulse: t < 1.5 ? 1 : 0 }), strip([1.3, 1.4, 1.5, 1.6, 1.7])],
  ]],
};
const LABEL_W = 300, PAD = 8, HEAD = 44, COLHEAD = 22;
async function sheetOf(file) {
  const [title, rows] = SHEETS[file];
  const ncol = Math.max.apply(null, rows.map(r => r[2].length));
  const sheet = canvas(LABEL_W + ncol * (TILE + PAD) + PAD, HEAD + rows.length * (TILE + PAD + COLHEAD) + PAD);
  const g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, title, PAD, 12, 18, '#ffffff');
  for (let r = 0; r < rows.length; r++) {
    const [name, over, cols] = rows[r], y = HEAD + r * (TILE + PAD + COLHEAD);
    nameLabel(g, name, PAD, y + COLHEAD + TILE / 2 - 40, 15, LABEL_W - 2 * PAD);
    const ts = Date.now();
    for (let k = 0; k < cols.length; k++) {
      const [head, kind, t] = cols[k], x = LABEL_W + k * (TILE + PAD);
      label(g, head, x, y + 2, 13, '#9aa6bd');
      try {
        const layers = await subject(kind, fx(typeof over === 'function' ? over(t) : over));
        g.drawImage(render(layers, t), x, y + COLHEAD);
        // a 1080 x 1080 photo record is 4.6 MB: let each one go as soon as its tile is drawn
        if (kind === 'photo') { const id = made.pop(); try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }
      } catch (e) { errors.push(file + ' ' + name + ' @' + t + ': ' + (e && e.message)); }
    }
    timing[file + ': ' + name] = Math.round((Date.now() - ts) / cols.length);
    await sleep(0);
  }
  return sheet;
}

const out = {}, sheets = {};
try {
  for (const file of Object.keys(SHEETS)) sheets[file] = await sheetOf(file);
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmLaserSheets = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest settings (ms per frame at a quarter
   of 1080), the beat (0.4 to 1) of THE FIX row as built and by the pile's first formula at its five moments (FM._laserBeamBeat), any
   errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
const FIX_T = [0.9, 0.95, 1, 1.05, 1.1], r2 = v => Math.round(v * 100) / 100;
const fixBuilt = FM._laserBeamBeat ? FIX_T.map(t => r2(FM._laserBeamBeat({ pulse: hold(1, 1, 2.5) }, t, 0))) : null;
const fixPile = FIX_T.map(t => r2(0.7 + 0.3 * Math.cos(2 * Math.PI * (t < 1 ? 1 : 2.5) * t)));
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, fixBeatBuilt: fixBuilt, fixBeatPileFormula: fixPile, errors: errors.slice(0, 6), ms: Date.now() - t0 };
