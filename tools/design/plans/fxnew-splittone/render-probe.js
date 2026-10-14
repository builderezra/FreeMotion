/* render-probe.js — the #545 options sheets for #966 B49 Split Toning, rendered through the APP'S OWN compositor (FM.renderScene,
   the very kernel the export runs), so what he picks from is what the app draws. For tools/shot.py --js-file, in the next browser
   slot. Nothing in the app is changed: the photos are throwaway media records and layers, removed at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmNewSplittone as data URLs and only the summary returns.

   A FRESH Image is loaded for every tile: FM.media.remove() empties the element it was given, so an image used twice renders black.
   (Each tile also gets its own canvas as the media element, so removing one never touches another.)

   Pages — two tiles across, three down, so each is under 2x as tall as wide and reaches his phone (the tall-images lesson):
     st-looks-dog-p1..p2.jpg   the looks on dog.jpg (the effect's tile photo: the strongest tonal structure of the set), then today's
                               three neighbours at their defaults for comparison — Teal & Orange, Colour Wheels, Duotone (Colour).
     st-looks-cat-p1..p2.jpg   the same on cat.jpg (near-colourless: the tint is all there is to see).
     st-looks-bay-p1..p2.jpg   the same on bay.jpg (warm sky over cool water: does it fight a picture that is already split?).
     st-defaults-dog.jpg       the starting strength and two other teal / orange pairs — his pick sets the defaults.
     layouts.jpg               THE PANEL QUESTION, as phone-width mock-ups: A (built) the amounts first and both colours at the
                               bottom (where the registry puts colour rows today); B each colour right above its amount.
   "RECOMMENDED" marks the builder's pick. Every tile is a setting of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('splittone')) return { ok: false, error: 'this tree has no Split Toning (splittone) — serve hunt/fxnew-splittone' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];
const REC = 'RECOMMENDED';   // a tile whose name ends with this gets it on its own line, in gold

const fx = (over, type) => { const e = FM.fxRegistry.makeInstance(type || 'splittone'); Object.assign(e.params, over || {}); return e; };
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
  const mid = '_fxnewsplittone_' + key + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: S, height: S, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: S / 2, y: S / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = [effect];
  const o = canvas(S, S);
  FM.renderScene(o.getContext('2d'), { project: { width: S, height: S, fps: 30, duration: 4, background: '#000000' }, layers: [L], selectedId: null, selectedIds: [] }, 0.5);
  return o;
}
const S = 340, COLS = 2, ROWS = 3, SL = 48, SP = 10;   // SL: room for a two-line name and the RECOMMENDED line above each tile
// a tile is [name, over] (a Split Toning with those settings), [name, null] (the photo) or [name, over, type] (another effect)
async function photoPages(base, title, key, tiles) {
  const per = COLS * ROWS, pages = [], n = Math.ceil(tiles.length / per);
  for (let p = 0; p * per < tiles.length; p++) {
    const part = tiles.slice(p * per, (p + 1) * per), rows = Math.ceil(part.length / COLS);
    const sheet = canvas(SP + COLS * (S + SP), 46 + rows * (S + SL + SP));
    const g = sheet.getContext('2d');
    g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
    label(g, title + ' on ' + key + '.jpg' + (n > 1 ? ' (' + (p + 1) + '/' + n + ')' : ''), SP, 12, 17, '#ffffff');
    for (let i = 0; i < part.length; i++) {
      const [name, over, type] = part[i], x = SP + (i % COLS) * (S + SP), y = 46 + Math.floor(i / COLS) * (S + SL + SP);
      const ts = Date.now();
      try { g.drawImage(await photoTile(key, over ? fx(over, type) : null, S), x, y + SL); }
      catch (e) { errors.push(base + ' ' + name + ': ' + (e && e.message)); }
      timing[base + ': ' + name] = Date.now() - ts;
      nameLabel(g, name, x, y + 2, 13, S);
      await sleep(0);
    }
    pages.push([base + (n > 1 ? '-p' + (p + 1) : '') + '.jpg', sheet]);
  }
  return pages;
}

/* ───────────────────────── the tiles ───────────────────────── */
// the looks for his sheet — each is only settings, so any of them can become a one-tap filter later
const LOOKS = {
  tealOrange: {},
  warmCool: { color: '#3a64d8', color2: '#ffc65a', shadows: 45, highlights: 45 },
  sepia: { color: '#7a4a1e', color2: '#fff0c8', shadows: 70, highlights: 30, balance: -20 },
  cross: { color: '#1f9e6e', color2: '#f2dc3a', shadows: 60, highlights: 60, balance: 20 },
};
const LOOK_TILES = [
  ['The photo, no effect', null],
  ['Teal & orange — the default (teal #1e90a0, orange #ffa04a, 50 / 50) ' + REC, LOOKS.tealOrange],
  ['Warm / cool (blue shadows #3a64d8, gold highlights #ffc65a, 45 / 45)', LOOKS.warmCool],
  ['Sepia shadows (#7a4a1e at 70, cream #fff0c8 at 30, Balance −20)', LOOKS.sepia],
  ['Cross-process (green #1f9e6e, yellow #f2dc3a, 60 / 60, Balance +20)', LOOKS.cross],
  ['Teal & orange at full strength (100 / 100)', { shadows: 100, highlights: 100 }],
  ['Faded film: teal & orange, Keep brightness 0 (blacks lift toward teal)', { keep: 0 }],
  ['Balance −60 (more of the picture counts as shadow)', { balance: -60 }],
  ['Balance +60 (more of the picture counts as highlight)', { balance: 60 }],
  // today's neighbours at their own defaults, so he can see what this adds (NOTES.md: is it different enough?)
  ['Today: Teal & Orange effect, its defaults (colours fixed)', {}, 'tealorange'],
  ['Today: Colour Wheels, its defaults (lift / gain — black and white move too)', {}, 'colorwheels'],
  ['Today: Duotone with Blend = Colour (the picture’s own colours are replaced)', { blend: 3 }, 'duotone'],
];
const DEFAULT_TILES = [
  ['Strength 30 / 30', { shadows: 30, highlights: 30 }],
  ['Strength 50 / 50 — built ' + REC, {}],
  ['Strength 70 / 70', { shadows: 70, highlights: 70 }],
  ['Pure teal #008080 and dark orange #ff8c00, 50 / 50', { color: '#008080', color2: '#ff8c00' }],
  ['Blue-teal #2a7fb8 and amber #ffb347, 50 / 50', { color: '#2a7fb8', color2: '#ffb347' }],
  ['Built colours, Balance +20 (orange reaches lower)', { balance: 20 }],
];

/* ───────────────────────── the panel question, as phone-width mock-ups ───────────────────────── */
function mockPanel(g, x, y, w, title, rows) {
  const RH = 34;
  let yy = y + 40;
  g.fillStyle = '#141a26';
  const h = 40 + rows.length * RH + 10;
  g.fillRect(x, y, w, h);
  label(g, title, x + 12, y + 12, 15, '#ffffff');
  rows.forEach(r => {
    if (r.swatch) {
      label(g, r.label, x + 12, yy + 9, 13, '#cfd6e4', '500');
      g.fillStyle = r.swatch; g.fillRect(x + w - 64, yy + 6, 40, 22);
    } else {
      label(g, r.label, x + 12, yy + 9, 13, '#cfd6e4', '500');
      const sx = x + 128, sw = w - 188;
      g.fillStyle = '#232b3b'; g.fillRect(sx, yy + 15, sw, 4);
      g.fillStyle = '#9ec3ff'; g.fillRect(sx + sw * (r.at == null ? 0.5 : r.at) - 6, yy + 9, 12, 16);
      label(g, r.value || '', x + w - 52, yy + 9, 12, '#9aa4b6', '500');
    }
    yy += RH;
  });
  return h;
}
function layoutSheet() {
  const PW = 380, GAP = 16;
  const R = {
    sh: { label: 'Shadows', value: '50%', at: 0.5 }, hi: { label: 'Highlights', value: '50%', at: 0.5 }, bal: { label: 'Balance', value: '0', at: 0.5 },
    keep: { label: 'Keep brightness', value: '100%', at: 1 }, mix: { label: 'Mix', value: '100%', at: 1 },
    shc: { label: 'Shadows colour', swatch: '#1e90a0' }, hic: { label: 'Highlights colour', swatch: '#ffa04a' },
  };
  const A = [R.sh, R.hi, R.bal, R.keep, R.mix, R.shc, R.hic];
  const B = [R.shc, R.sh, R.hic, R.hi, R.bal, R.keep, R.mix];
  const sheet = canvas(GAP + 2 * (PW + GAP), 46 + 64 + 300 + 30);
  const g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Split Toning on a phone (380 px) — MOCK-UPS, row for row', GAP, 12, 18, '#ffffff');
  nameLabel(g, 'A — built: the amounts first, both colours at the bottom (where colour rows go today)', GAP, 52, 13, PW);
  mockPanel(g, GAP, 52 + 52, PW, 'Split Toning', A);
  nameLabel(g, 'B — each colour right above its amount (a small registry change: colour rows placed among the sliders) ' + REC, GAP + PW + GAP, 52, 13, PW);
  mockPanel(g, GAP + PW + GAP, 52 + 52, PW, 'Split Toning', B);
  return sheet;
}

const out = {}, sheets = {};
try {
  for (const [base, title, key, tiles] of [
    ['st-looks-dog', 'Split Toning (#966 B49): the looks', 'dog', LOOK_TILES],
    ['st-looks-cat', 'Split Toning (#966 B49): the looks', 'cat', LOOK_TILES],
    ['st-looks-bay', 'Split Toning (#966 B49): the looks', 'bay', LOOK_TILES],
    ['st-defaults-dog', 'Split Toning (#966 B49): the starting look', 'dog', DEFAULT_TILES],
  ]) for (const [name, sheet] of await photoPages(base, title, key, tiles)) sheets[name] = sheet;
  sheets['layouts.jpg'] = layoutSheet();
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewSplittone = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest settings, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
