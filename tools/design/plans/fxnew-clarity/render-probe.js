/* render-probe.js — the #545 options sheets for #966 B26 Clarity & Dehaze, rendered through the APP'S OWN compositor
   (FM.renderScene, the very kernel the export runs), so what he picks from is what the app draws. For tools/shot.py --js-file, in
   the next browser slot. Nothing in the app is changed: the photos are throwaway media records and layers, removed at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmNewClarity as data URLs and only the summary returns.

   A FRESH Image is loaded for every tile: FM.media.remove() empties the element it was given, so an image used twice renders black.
   (Each tile also gets its own canvas as the media element, so removing one never touches another.)

   Pages — two tiles across, three down, so each is under 2x as tall as wide and reaches his phone (the tall-images lesson):
     clarity-clouds-p1..p2.jpg   Clarity and Texture on his clouds photo (fx-art/clouds.jpg): the photo, the default, and each
                                 control swept — every tile is one setting of the effect as built, named under it.
     clarity-towers-p1..p2.jpg   the same on fx-art/towers.jpg (a pale, detail-packed aerial with the haze of distance).
     dehaze-clouds-p1..p3.jpg    Dehaze on clouds: + to cut haze, − to add it, Protect sky and Haze colour.
     dehaze-towers-p1..p3.jpg    the same on towers.
     layouts.jpg                 THE ONE-OR-TWO-EFFECTS QUESTION, as phone-width panel mock-ups: A (built) one effect with seven
                                 rows; B two effects, Clarity and Dehaze, each with its own rows. MOCK-UPS, not screenshots.
   "RECOMMENDED" marks the builder's pick. Every tile is an option of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('clarity')) return { ok: false, error: 'this tree has no Clarity & Dehaze (clarity) — serve hunt/fxnew-clarity' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];
const REC = 'RECOMMENDED';   // a tile whose name ends with this gets it on its own line, in gold

const fx = over => { const e = FM.fxRegistry.makeInstance('clarity'); Object.assign(e.params, over || {}); return e; };
const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
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

/* ───────────────────────── photo tiles, through FM.renderScene ───────────────────────── */
// a FRESH Image every call — never cached (see the header)
function loadPhoto(key) {
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1&n=' + made.length + '_' + Date.now(); });
}
async function photoTile(key, effect, S) {
  const im = await loadPhoto(key), side = Math.min(im.naturalWidth, im.naturalHeight);
  const c = canvas(S, S);
  c.getContext('2d').drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, S, S);
  if (!effect) return c;
  const mid = '_fxnewclarity_' + key + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: S, height: S, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: S / 2, y: S / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = [effect];
  const o = canvas(S, S);
  FM.renderScene(o.getContext('2d'), { project: { width: S, height: S, fps: 30, duration: 4, background: '#000000' }, layers: [L], selectedId: null, selectedIds: [] }, 0.5);
  return o;
}
/* Radius is in project pixels and these tiles are 340-px projects, so a Radius of 60 here is about a sixth of the frame — the same
   share as 60 on a 360-px-wide phone clip; on a 1080-px export the same look wants about three times the Radius. Said on the sheet. */
const S = 340, COLS = 2, ROWS = 3, SL = 48, SP = 10;   // SL: room for a two-line name and the RECOMMENDED line above each tile
async function photoPages(base, title, key, tiles) {
  const per = COLS * ROWS, pages = [];
  for (let p = 0; p * per < tiles.length; p++) {
    const part = tiles.slice(p * per, (p + 1) * per), rows = Math.ceil(part.length / COLS);
    const sheet = canvas(SP + COLS * (S + SP), 46 + rows * (S + SL + SP));
    const g = sheet.getContext('2d');
    g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
    label(g, title + ' on ' + key + '.jpg (' + (p + 1) + '/' + Math.ceil(tiles.length / per) + ')', SP, 12, 17, '#ffffff');
    for (let i = 0; i < part.length; i++) {
      const [name, over] = part[i], x = SP + (i % COLS) * (S + SP), y = 46 + Math.floor(i / COLS) * (S + SL + SP);
      const ts = Date.now();
      try { g.drawImage(await photoTile(key, over ? fx(over) : null, S), x, y + SL); }
      catch (e) { errors.push(base + ' ' + name + ': ' + (e && e.message)); }
      timing[base + ': ' + name] = Date.now() - ts;
      nameLabel(g, name, x, y + 2, 13, S);
      await sleep(0);
    }
    pages.push([base + '-p' + (p + 1) + '.jpg', sheet]);
  }
  return pages;
}

/* ───────────────────────── the tiles: each control swept, plus candidate default looks ───────────────────────── */
const OFF = { clarity: 0, texture: 0, dehaze: 0 };
const C = o => Object.assign({}, OFF, o);
const CLARITY_TILES = [
  ['The photo, no effect', null],
  ['Default: Clarity 30 ' + REC, {}],
  ['Clarity 60', C({ clarity: 60 })],
  ['Clarity 100 (the most)', C({ clarity: 100 })],
  ['Clarity −50 (softer, dreamy)', C({ clarity: -50 })],
  ['Clarity −100 (the softest)', C({ clarity: -100 })],
  ['Texture +60 (fine detail only)', C({ texture: 60 })],
  ['Texture −60 (smooths fine detail)', C({ texture: -60 })],
  ['Clarity 60, Radius 20 (tighter, edgier)', C({ clarity: 60, radius: 20 })],
  ['Clarity 60, Radius 150 (broad, gentle)', C({ clarity: 60, radius: 150 })],
  ['Clarity 100, Keep blacks & whites 0 (can go darker and brighter)', C({ clarity: 100, protect: 0 })],
  ['Alt default: Clarity 20, Texture 20', C({ clarity: 20, texture: 20 })],
];
const DEHAZE_TILES = [
  ['The photo, no effect', null],
  ['Dehaze 30', C({ dehaze: 30 })],
  ['Dehaze 60', C({ dehaze: 60 })],
  ['Dehaze 100 (the most)', C({ dehaze: 100 })],
  ['Dehaze 60, Protect sky 0 (the sky darkens too)', C({ dehaze: 60, sky: 0 })],
  ['Dehaze 60, Protect sky 100', C({ dehaze: 60, sky: 100 })],
  ['Dehaze 60, Haze colour Blue (takes a blue haze out)', C({ dehaze: 60, hazecol: 1 })],
  ['Dehaze 60, Haze colour Warm (takes a warm haze out)', C({ dehaze: 60, hazecol: 2 })],
  ['Dehaze −30 (a light mist)', C({ dehaze: -30 })],
  ['Dehaze −60 (fog, White)', C({ dehaze: -60 })],
  ['Dehaze −60, Haze colour Blue', C({ dehaze: -60, hazecol: 1 })],
  ['Dehaze −60, Haze colour Warm', C({ dehaze: -60, hazecol: 2 })],
  ['Alt default: Clarity 30 with Dehaze 15', { dehaze: 15 }],
  ['Alt default: Clarity 25, Dehaze 25', { clarity: 25, dehaze: 25 }],
];

/* ───────────────────────── the one-or-two-effects question, as phone-width panel mock-ups ───────────────────────── */
function mockPanel(g, x, y, w, title, rows) {
  const RH = 34;
  g.fillStyle = '#141a26'; g.fillRect(x, y, w, 40 + rows.length * RH + 10);
  label(g, title, x + 12, y + 12, 15, '#ffffff');
  rows.forEach((r, i) => {
    const ry = y + 40 + i * RH;
    if (r.seg) {
      label(g, r.label, x + 12, ry + 9, 13, '#cfd6e4', '500');
      const bw = (w - 150) / r.seg.length;
      r.seg.forEach((o, k) => { g.fillStyle = k === (r.on || 0) ? '#3a7bd5' : '#232b3b'; g.fillRect(x + 138 + k * bw, ry + 4, bw - 4, 24); label(g, o, x + 142 + k * bw, ry + 9, 11, '#ffffff', '500'); });
    } else {
      label(g, r.label, x + 12, ry + 9, 13, r.grey ? '#5d6678' : '#cfd6e4', '500');
      const sx = x + 168, sw = w - 228;
      g.fillStyle = '#232b3b'; g.fillRect(sx, ry + 15, sw, 4);
      g.fillStyle = r.grey ? '#4a5263' : '#9ec3ff'; g.fillRect(sx + sw * (r.at == null ? 0.5 : r.at) - 6, ry + 9, 12, 16);
      label(g, r.value || '', x + w - 52, ry + 9, 12, '#9aa4b6', '500');
    }
  });
  return 40 + rows.length * RH + 10;
}
function layoutSheet() {
  const PW = 380, GAP = 16;
  const A = [{ label: 'Clarity', value: '30', at: 0.65 }, { label: 'Texture', value: '0', at: 0.5 }, { label: 'Dehaze', value: '0', at: 0.5 }, { label: 'Radius', value: '60 px', at: 0.26 },
    { label: 'Keep blacks & whites', value: '100%', at: 1 }, { label: 'Protect sky', value: '50%', at: 0.5, grey: true }, { label: 'Haze colour', seg: ['White', 'Blue', 'Warm'] }];
  const B1 = [{ label: 'Clarity', value: '30', at: 0.65 }, { label: 'Texture', value: '0', at: 0.5 }, { label: 'Radius', value: '60 px', at: 0.26 }, { label: 'Keep blacks & whites', value: '100%', at: 1 }];
  const B2 = [{ label: 'Dehaze', value: '30', at: 0.65 }, { label: 'Protect sky', value: '50%', at: 0.5 }, { label: 'Haze colour', seg: ['White', 'Blue', 'Warm'] }, { label: 'Radius', value: '60 px', at: 0.26 }];
  const sheet = canvas(GAP + 2 * (PW + GAP), 46 + 64 + 300 + 64 + 470 + 40);
  const g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Clarity & Dehaze on a phone (380 px) — MOCK-UPS, row for row', GAP, 12, 18, '#ffffff');
  nameLabel(g, 'A — built: one effect, seven rows (Protect sky greys out while Dehaze is 0) ' + REC, GAP, 52, 13, 2 * PW);
  mockPanel(g, GAP, 52 + 52, PW, 'Clarity & Dehaze', A);
  const yB = 52 + 52 + 300 + 30;
  nameLabel(g, 'B — two effects, each with its own Radius (Dehaze would also be its own tile in the browser)', GAP, yB, 13, 2 * PW);
  mockPanel(g, GAP, yB + 52, PW, 'Clarity', B1);
  mockPanel(g, GAP + PW + GAP, yB + 52, PW, 'Dehaze', B2);
  return sheet;
}

const out = {}, sheets = {};
try {
  for (const [base, title, key, tiles] of [
    ['clarity-clouds', 'Clarity & Dehaze (#966 B26): Clarity and Texture', 'clouds', CLARITY_TILES],
    ['clarity-towers', 'Clarity & Dehaze (#966 B26): Clarity and Texture', 'towers', CLARITY_TILES],
    ['dehaze-clouds', 'Clarity & Dehaze (#966 B26): Dehaze', 'clouds', DEHAZE_TILES],
    ['dehaze-towers', 'Clarity & Dehaze (#966 B26): Dehaze', 'towers', DEHAZE_TILES],
  ]) for (const [name, sheet] of await photoPages(base, title, key, tiles)) sheets[name] = sheet;
  sheets['layouts.jpg'] = layoutSheet();
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewClarity = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest settings, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
