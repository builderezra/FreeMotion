/* render-probe.js — the #545 options sheets for #966 B33 Black & White Mixer, rendered through the APP'S OWN compositor
   (FM.renderScene, the very kernel the export runs), so what he picks from is what the app draws. For tools/shot.py --js-file, in
   the next browser slot. Nothing in the app is changed: the photos are throwaway media records and layers, removed at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmNewBwmix as data URLs and only the summary returns.

   A FRESH Image is loaded for every tile: FM.media.remove() empties the element it was given, so an image used twice renders black.
   (Each tile also gets its own canvas as the media element, so removing one never touches another.)

   Pages — two tiles across, three down, so each is under 2x as tall as wide and reaches his phone (the tall-images lesson):
     bw-filters-clouds-p1..p2.jpg  every Colour filter on his clouds photo (fx-art/clouds.jpg: blue sky over water and trees — the
                                   picture a black-and-white mix is for), beside the photo and beside today's Grayscale effect.
     bw-filters-bush-p1..p2.jpg    the same on bush.jpg (foliage: where Green and Infrared show).
     bw-filters-shore-p1..p2.jpg   the same on shore.jpg (a vivid red band: where Red and Green pull apart).
     bw-filters-dog-p1..p2.jpg     the same on dog.jpg (Grayscale's own tile photo, the strongest tonal structure of the set).
     bw-sliders-clouds-p1..p2.jpg  single sliders, Contrast and two candidate default looks on clouds.
     bw-tints-dog.jpg              Tint: the default sepia at three strengths, a cool blue (cyanotype) and a gold, on dog.
     layouts.jpg                   THE PANEL QUESTION, as phone-width mock-ups: A (built) the Colour filter row with the six sliders
                                   always shown; B the six shown only after picking Custom. MOCK-UPS, not screenshots.
   "RECOMMENDED" marks the builder's pick. Every tile is a setting of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('bwmixer')) return { ok: false, error: 'this tree has no Black & White Mixer (bwmixer) — serve hunt/fxnew-bwmix' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];
const REC = 'RECOMMENDED';   // a tile whose name ends with this gets it on its own line, in gold

// the Colour filter's six, read from the effect's own row (so the sheet shows what a tap writes, not a copy of it)
const PRE = (FM.fxRegistry.get('bwmixer').params.filter(p => p.key === 'preset')[0] || {});
const SETS = PRE.sets || {};
const NAMES = (PRE.options || []).map(o => o[1]);
const filt = (n, extra) => Object.assign({ preset: n }, SETS[n] || {}, extra || {});
const fx = (over, type) => { const e = FM.fxRegistry.makeInstance(type || 'bwmixer'); Object.assign(e.params, over || {}); return e; };
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
  const mid = '_fxnewbwmix_' + key + '_' + made.length;
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
// a tile is [name, over] (a Black & White Mixer with those settings), [name, null] (the photo) or [name, over, type] (another effect)
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
const six = n => (SETS[n] ? ' (' + ['reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas'].map(k => SETS[n][k]).join(' / ') + ')' : '');
const FILTER_TILES = [
  ['The photo, no effect', null],
  ['Grayscale — today’s effect, fixed weights (for comparison)', { amount: 1 }, 'grayscale'],
  ['Neutral, the default' + six(0) + ' ' + REC, filt(0)],
].concat([1, 2, 3, 4, 5, 6].map(n => [(NAMES[n] || ('filter ' + n)) + six(n), filt(n)]), [
  ['Neutral + Contrast 40', filt(0, { contrast: 40 })],
  ['Red + Contrast 30 (the dramatic-sky look)', filt(1, { contrast: 30 })],
  ['Neutral + Tint 40 (sepia)', filt(0, { tint: 40 })],
]);
const SLIDER_TILES = [
  ['Blues −100 (a black sky)', filt(0, { blues: -100 })],
  ['Blues 200 (a white sky)', filt(0, { blues: 200 })],
  ['Cyans −100', filt(0, { cyans: -100 })],
  ['Greens 200 (bright leaves)', filt(0, { greens: 200 })],
  ['Reds 200, Yellows 150 (warm things glow)', filt(0, { reds: 200, yellows: 150 })],
  ['Everything −200 except Blues 300 (only blue survives)', { reds: -200, yellows: -200, greens: -200, cyans: -200, blues: 300, magentas: -200 }],
  ['Contrast −60 (soft, flat)', filt(0, { contrast: -60 })],
  ['Contrast 100 (the most)', filt(0, { contrast: 100 })],
  // what today's Grayscale weights are as a mix (Rec.709 luma: 21 / 93 / 72 / 79 / 7 / 28) — the "move the mono filters" question
  ['Alt default: today’s Grayscale weights as a mix (21 / 93 / 72 / 79 / 7 / 28)', { reds: 21, yellows: 93, greens: 72, cyans: 79, blues: 7, magentas: 28 }],
  ['Alt default: Neutral + Contrast 20', filt(0, { contrast: 20 })],
  ['Alt default: Yellow (a gentle sky)', filt(3)],
  ['Neutral again, for side-by-side ' + REC, filt(0)],
];
const TINT_TILES = [
  ['Tint 20 (sepia #c09060)', filt(0, { tint: 20 })],
  ['Tint 50 (sepia)', filt(0, { tint: 50 })],
  ['Tint 100 (sepia)', filt(0, { tint: 100 })],
  ['Tint 70, blue #3060d0 (a cyanotype)', filt(0, { tint: 70, color: '#3060d0' })],
  ['Tint 60, gold #e0a040', filt(0, { tint: 60, color: '#e0a040' })],
  ['Tint 60, sepia, Contrast 30', filt(0, { tint: 60, contrast: 30 })],
];

/* ───────────────────────── the panel question, as phone-width mock-ups ───────────────────────── */
function mockPanel(g, x, y, w, title, rows) {
  const RH = 34;
  let yy = y + 40;
  g.fillStyle = '#141a26';
  const h = 40 + rows.reduce((s, r) => s + (r.seg && r.seg.length > 4 ? 2 * RH : RH), 0) + 10;
  g.fillRect(x, y, w, h);
  label(g, title, x + 12, y + 12, 15, '#ffffff');
  rows.forEach(r => {
    if (r.seg) {
      label(g, r.label, x + 12, yy + 9, 13, '#cfd6e4', '500');
      const perRow = r.seg.length > 4 ? Math.ceil(r.seg.length / 2) : r.seg.length, bw = (w - 130) / perRow;
      r.seg.forEach((o, k) => {
        const bx = x + 118 + (k % perRow) * bw, by = yy + 4 + Math.floor(k / perRow) * RH;
        g.fillStyle = k === (r.on || 0) ? '#3a7bd5' : '#232b3b'; g.fillRect(bx, by, bw - 4, 26); label(g, o, bx + 4, by + 6, 11, '#ffffff', '500');
      });
      yy += r.seg.length > 4 ? 2 * RH : RH;
    } else if (r.swatch) {
      label(g, r.label, x + 12, yy + 9, 13, r.grey ? '#5d6678' : '#cfd6e4', '500');
      g.fillStyle = r.grey ? '#4a5263' : r.swatch; g.fillRect(x + w - 64, yy + 6, 40, 22);
      yy += RH;
    } else {
      label(g, r.label, x + 12, yy + 9, 13, r.grey ? '#5d6678' : '#cfd6e4', '500');
      const sx = x + 118, sw = w - 178;
      g.fillStyle = '#232b3b'; g.fillRect(sx, yy + 15, sw, 4);
      g.fillStyle = r.grey ? '#4a5263' : '#9ec3ff'; g.fillRect(sx + sw * (r.at == null ? 0.5 : r.at) - 6, yy + 9, 12, 16);
      label(g, r.value || '', x + w - 52, yy + 9, 12, '#9aa4b6', '500');
      yy += RH;
    }
  });
  return h;
}
function layoutSheet() {
  const PW = 380, GAP = 16, at = v => (v + 200) / 500;
  const SEG = { label: 'Colour filter', seg: NAMES.length ? NAMES : ['Neutral', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Infrared'] };
  const SIX = [['Reds', 40], ['Yellows', 60], ['Greens', 40], ['Cyans', 60], ['Blues', 20], ['Magentas', 80]].map(([l, v]) => ({ label: l, value: v + '%', at: at(v) }));
  const TAIL = [{ label: 'Contrast', value: '0', at: 0.5 }, { label: 'Tint', value: '0%', at: 0 }, { label: 'Tint colour', swatch: '#c09060', grey: true }];
  const A = [SEG].concat(SIX, TAIL);
  const B = [Object.assign({}, SEG, { seg: SEG.seg.concat(['Custom']) })].concat(TAIL);
  const sheet = canvas(GAP + 2 * (PW + GAP), 46 + 64 + 560 + 40);
  const g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Black & White Mixer on a phone (380 px) — MOCK-UPS, row for row', GAP, 12, 18, '#ffffff');
  nameLabel(g, 'A — built: a tap on a filter writes the six sliders, which are always there to move ' + REC, GAP, 52, 13, PW);
  mockPanel(g, GAP, 52 + 52, PW, 'Black & White Mixer', A);
  nameLabel(g, 'B — the six only appear after picking Custom (fewer rows; a filter cannot be fine-tuned without leaving it)', GAP + PW + GAP, 52, 13, PW);
  mockPanel(g, GAP + PW + GAP, 52 + 52, PW, 'Black & White Mixer', B);
  return sheet;
}

const out = {}, sheets = {};
try {
  for (const [base, title, key, tiles] of [
    ['bw-filters-clouds', 'Black & White Mixer (#966 B33): the Colour filters', 'clouds', FILTER_TILES],
    ['bw-filters-bush', 'Black & White Mixer (#966 B33): the Colour filters', 'bush', FILTER_TILES],
    ['bw-filters-shore', 'Black & White Mixer (#966 B33): the Colour filters', 'shore', FILTER_TILES],
    ['bw-filters-dog', 'Black & White Mixer (#966 B33): the Colour filters', 'dog', FILTER_TILES],
    ['bw-sliders-clouds', 'Black & White Mixer (#966 B33): sliders and Contrast', 'clouds', SLIDER_TILES],
    ['bw-tints-dog', 'Black & White Mixer (#966 B33): Tint', 'dog', TINT_TILES],
  ]) for (const [name, sheet] of await photoPages(base, title, key, tiles)) sheets[name] = sheet;
  sheets['layouts.jpg'] = layoutSheet();
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewBwmix = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest settings, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
