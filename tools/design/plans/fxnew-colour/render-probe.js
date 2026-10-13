/* render-probe.js — the #545 options sheets for #966 B18 Colour Wheels, B19 Tone Curve and B20 HSL Mixer, rendered through the APP'S
   OWN compositor (FM.renderScene, the very kernels the export runs), so what he picks from is what the app draws. For tools/shot.py
   --js-file, in the next browser slot. Nothing in the app is changed: the photos are throwaway media records and layers, removed
   again at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY. shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to — cut at 4000 characters — so the pictures do not come back that way. Each sheet is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the sheets stay on window.__fmNewColour as data URLs and only the summary returns.

   Sheets (each under 3x as tall as wide, so they reach his phone — the tall-images lesson):
     colourwheels-clouds.jpg  Colour Wheels on his clouds photo (fx-art/clouds.jpg): the photo, the default, and each control
                              swept — every tile is one setting, named under it.
     colourwheels-pair.jpg    the same on fx-art/pair.jpg (a sunset with figures — fx-art/ holds no portrait, so skin cannot be judged).
     tonecurve-clouds.jpg     Tone Curve on clouds; each tile carries the curve it draws (RGB white, red/green/blue when set),
                              measured from the kernel on a grey ramp, not drawn from the numbers.
     hslmixer-clouds.jpg      HSL Mixer on clouds.
     hslmixer-shore.jpg       HSL Mixer on fx-art/shore.jpg (the one photo with a vivid red band, so Red and Orange have work).
     layouts.jpg              THE CONTROL LAYOUT QUESTION: for each effect the layout that is built (A) beside the alternatives
                              (B, C), drawn as phone-width panel mock-ups — row for row what the panel would list. MOCK-UPS, not
                              screenshots of the app: the real rows are the app's own slider and option-row controls.
   "RECOMMENDED" marks the builder's pick. Every tile is an option of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('colorwheels') || !FM.fxRegistry.get('tonecurve') || !FM.fxRegistry.get('hslmixer')) return { ok: false, error: 'this tree has no colorwheels / tonecurve / hslmixer — serve hunt/fxnew-colour' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];
const REC = 'RECOMMENDED';   // a tile whose name ends with this gets it on its own line, in gold

const fx = (type, over) => { const e = FM.fxRegistry.makeInstance(type); Object.assign(e.params, over || {}); return e; };
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
const photos = {};
function loadPhoto(key) {
  if (!photos[key]) photos[key] = new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1'; });
  return photos[key];
}
async function photoTile(key, effect, S) {
  const im = await loadPhoto(key), side = Math.min(im.naturalWidth, im.naturalHeight);
  const c = canvas(S, S);
  c.getContext('2d').drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, S, S);
  if (!effect) return c;
  const mid = '_fxnewcolour_' + key + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: S, height: S, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: S / 2, y: S / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = [effect];
  const o = canvas(S, S);
  FM.renderScene(o.getContext('2d'), { project: { width: S, height: S, fps: 30, duration: 4, background: '#000000' }, layers: [L], selectedId: null, selectedIds: [] }, 0.5);
  return o;
}
/* the curve an instance actually draws, per channel: the kernel itself on a grey ramp (FM._applyPixelFx, the adjustment path's seam) */
function measuredCurve(type, params) {
  const d = new Uint8ClampedArray(256 * 4);
  for (let v = 0; v < 256; v++) { d[v * 4] = d[v * 4 + 1] = d[v * 4 + 2] = v; d[v * 4 + 3] = 255; }
  FM._applyPixelFx(d, { type: type, enabled: true, params: params }, 0.5, 256, 1, 1);
  return [0, 1, 2].map(c => Array.from({ length: 256 }, (_, v) => d[v * 4 + c]));
}
function drawCurve(g, curves, x, y, s) {
  g.fillStyle = 'rgba(5,7,12,0.78)'; g.fillRect(x, y, s, s);
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
  for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + s * k / 4, y); g.lineTo(x + s * k / 4, y + s); g.moveTo(x, y + s * k / 4); g.lineTo(x + s, y + s * k / 4); g.stroke(); }
  g.beginPath(); g.moveTo(x, y + s); g.lineTo(x + s, y); g.stroke();   // the straight line, for reference
  const same = curves[0].join() === curves[1].join() && curves[1].join() === curves[2].join();
  const draw = (cv, colour) => { g.strokeStyle = colour; g.lineWidth = 2; g.beginPath(); cv.forEach((o, v) => { const px = x + s * v / 255, py = y + s - s * o / 255; if (v) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); };
  if (same) draw(curves[0], '#ffffff');
  else { draw(curves[0], '#ff5a5a'); draw(curves[1], '#5aff7a'); draw(curves[2], '#5aa8ff'); }
}
const S = 300, COLS = 4, SL = 48, SP = 10;   // SL: room for a two-line name and the RECOMMENDED line above each tile
async function photoSheet(title, key, type, tiles, withCurve) {
  const rows = Math.ceil(tiles.length / COLS);
  const sheet = canvas(SP + COLS * (S + SP), 46 + rows * (S + SL + SP));
  const g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, title + ' on ' + key + '.jpg', SP, 12, 18, '#ffffff');
  for (let i = 0; i < tiles.length; i++) {
    const [name, over] = tiles[i], x = SP + (i % COLS) * (S + SP), y = 46 + Math.floor(i / COLS) * (S + SL + SP);
    const ts = Date.now();
    try {
      const inst = over ? fx(type, over) : null;
      g.drawImage(await photoTile(key, inst, S), x, y + SL);
      if (withCurve) drawCurve(g, measuredCurve(type, inst ? inst.params : fx(type, { amount: 0 }).params), x + S - 92, y + SL + 6, 86);
    } catch (e) { errors.push(type + ' ' + key + ' ' + name + ': ' + (e && e.message)); }
    timing[type + ' ' + key + ': ' + name] = Date.now() - ts;
    nameLabel(g, name, x, y + 2, 13, S);
    await sleep(0);
  }
  return sheet;
}

/* ───────────────────────── the tiles: each control swept, plus candidate default looks ───────────────────────── */
const NW = { sh_amt: 0, mid_amt: 0, hi_amt: 0, sh_lum: 0, mid_lum: 0, hi_lum: 0 };   // every wheel neutral
const WHEEL_TILES = [
  ['The photo, no effect', null],
  ['Default: teal shadows 30, warm highlights 25 ' + REC, {}],
  ['Shadows only: teal 60', Object.assign({}, NW, { sh_amt: 60, sh_hue: 190 })],
  ['Highlights only: orange 60', Object.assign({}, NW, { hi_amt: 60, hi_hue: 35 })],
  ['Midtones only: warm 60', Object.assign({}, NW, { mid_amt: 60, mid_hue: 40 })],
  ['Shadows Brightness +40 (lifted, faded blacks)', Object.assign({}, NW, { sh_lum: 40 })],
  ['Midtones Brightness −40 (moodier)', Object.assign({}, NW, { mid_lum: -40 })],
  ['Highlights Brightness −40 (calmer sky)', Object.assign({}, NW, { hi_lum: -40 })],
  ['Default look, Keep brightness 0', { keep: 0 }],
  ['Default look, Balance +100 (highlights reach further)', { balance: 100 }],
  ['Default look, Balance −100 (shadows reach further)', { balance: -100 }],
  ['Default look, Blending 0 (each wheel stays in its tones)', { blend: 0 }],
  ['Default look, Blending 100 (the wheels overlap)', { blend: 100 }],
  ['Alt default: warm shadows, cool highlights', Object.assign({}, NW, { sh_amt: 30, sh_hue: 30, hi_amt: 25, hi_hue: 210 })],
  ['Alt default: green-cyan film (shadows 160, mids 50)', Object.assign({}, NW, { sh_amt: 35, sh_hue: 160, mid_amt: 15, mid_hue: 50, hi_amt: 15, hi_hue: 45 })],
  ['Strong: everything at 100', { sh_amt: 100, mid_amt: 100, hi_amt: 100 }],
];
const ST = { shadows: 25, highs: 75 };   // RGB straight (its default is a gentle S)
const CURVE_TILES = [
  ['The photo, no effect', null],
  ['Default: gentle S (Shadows 20, Highlights 80) ' + REC, {}],
  ['Strong S (Shadows 12, Highlights 88)', { shadows: 12, highs: 88 }],
  ['Flatten (Shadows 32, Highlights 68)', { shadows: 32, highs: 68 }],
  ['Matte: Blacks 12, Shadows 26', Object.assign({}, ST, { blacks: 12, shadows: 26 })],
  ['Fade: Blacks 15, Whites 90', Object.assign({}, ST, { blacks: 15, whites: 90 })],
  ['Brighter mids: Midtones 62', Object.assign({}, ST, { mids: 62 })],
  ['Darker mids: Midtones 38', Object.assign({}, ST, { mids: 38 })],
  ['Red: Shadows 32, Highlights 72 (warm darks, cooler lights)', Object.assign({}, ST, { shadows_r: 32, highs_r: 72 })],
  ['Blue: Shadows 34, Highlights 66 (teal-orange by curves)', Object.assign({}, ST, { shadows_b: 34, highs_b: 66 })],
  ['Green: Midtones 56 (green cast)', Object.assign({}, ST, { mids_g: 56 })],
  ['Cross-process: R S-curve, B flattened', Object.assign({}, ST, { shadows_r: 18, highs_r: 84, blacks_b: 18, whites_b: 82 })],
  ['Default S at Amount 50', { amount: 50 }],
  ['Crossing points pool: Shadows 90, Midtones 10', Object.assign({}, ST, { shadows: 90, mids: 10 })],
  ['Alt default: matte S (Blacks 8, Shadows 22, Highlights 80)', { blacks: 8, shadows: 22 }],
  ['Alt default: straight (starts doing nothing — would need KNOWN_THIN in the 482 test)', ST],
];
const HZ = {}; ['hue', 'sat', 'lum'].forEach(s => ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'].forEach(b => { HZ[s + '_' + b] = 0; }));
const hz = o => Object.assign({}, HZ, o);
const HSL_TILES = [
  ['The photo, no effect', null],
  ['Default: Saturation Blue 40, Aqua 30, Green 20 ' + REC, {}],
  ['Deeper sky: Blue Sat +60, Brightness −30', hz({ sat_blue: 60, lum_blue: -30 })],
  ['Pinker clouds: Red and Orange Sat +60', hz({ sat_red: 60, sat_orange: 60 })],
  ['Orange to gold: Orange Hue +100', hz({ hue_orange: 100 })],
  ['Blue toward aqua: Blue Hue −100', hz({ hue_blue: -100 })],
  ['Greener trees: Green Hue −100, Sat +50', hz({ hue_green: -100, sat_green: 50 })],
  ['Muted greens: Green and Yellow Sat −70', hz({ sat_green: -70, sat_yellow: -70 })],
  ['Only the warm colours (others Sat −100)', hz({ sat_yellow: -100, sat_green: -100, sat_aqua: -100, sat_blue: -100, sat_purple: -100 })],
  ['Only the blues (others Sat −100)', hz({ sat_red: -100, sat_orange: -100, sat_yellow: -100, sat_green: -100, sat_magenta: -100 })],
  ['Brighter warm sky: Orange and Red Brightness +60', hz({ lum_orange: 60, lum_red: 60 })],
  ['Darker blues: Blue and Aqua Brightness −60', hz({ lum_blue: -60, lum_aqua: -60 })],
  ['Teal & orange: Aqua Hue −60, Blue Hue −60, Orange Sat +40', hz({ hue_aqua: -60, hue_blue: -60, sat_orange: 40 })],
  ['Every Hue +100 (the most it can turn)', hz({ hue_red: 100, hue_orange: 100, hue_yellow: 100, hue_green: 100, hue_aqua: 100, hue_blue: 100, hue_purple: 100, hue_magenta: 100 })],
  ['Alt default: Saturation Orange −20 (calmer skin), Blue +40', hz({ sat_orange: -20, sat_blue: 40 })],
  ['Alt default: zeros (starts doing nothing — would need KNOWN_THIN)', hz({})],
];

/* ───────────────────────── the control-layout question, as phone-width panel mock-ups ───────────────────────── */
function mockPanel(g, x, y, w, title, rows) {
  const RH = 34;
  g.fillStyle = '#141a26'; g.fillRect(x, y, w, 40 + rows.length * RH + 10);
  label(g, title, x + 12, y + 12, 15, '#ffffff');
  rows.forEach((r, i) => {
    const ry = y + 40 + i * RH;
    if (r.seg) {
      label(g, r.label, x + 12, ry + 9, 13, '#cfd6e4', '500');
      const bw = (w - 120) / r.seg.length;
      r.seg.forEach((o, k) => { g.fillStyle = k === (r.on || 0) ? '#3a7bd5' : '#232b3b'; g.fillRect(x + 108 + k * bw, ry + 4, bw - 4, 24); label(g, o, x + 112 + k * bw, ry + 9, 11, '#ffffff', '500'); });
    } else {
      label(g, r.label, x + 12, ry + 9, 13, r.grey ? '#5d6678' : '#cfd6e4', '500');
      const sx = x + 140, sw = w - 200;
      g.fillStyle = '#232b3b'; g.fillRect(sx, ry + 15, sw, 4);
      g.fillStyle = r.grey ? '#4a5263' : '#9ec3ff'; g.fillRect(sx + sw * (r.at == null ? 0.5 : r.at) - 6, ry + 9, 12, 16);
      label(g, r.value || '', x + w - 52, ry + 9, 12, '#9aa4b6', '500');
    }
  });
  return 40 + rows.length * RH + 10;
}
function layoutSheet() {
  const PW = 380, GAP = 16, cols = 3;
  const sets = [
    ['Colour Wheels', [
      ['A — built ' + REC, [{ label: 'Wheel', seg: ['Shadows', 'Mids', 'Lights'] }, { label: 'Hue', value: '190°', at: 0.53 }, { label: 'Amount', value: '30%', at: 0.3 }, { label: 'Brightness', value: '0', at: 0.5 }, { label: 'Balance', value: '0', at: 0.5 }, { label: 'Blending', value: '50%', at: 0.5 }, { label: 'Keep brightness', value: '100%', at: 1 }]],
      ['B — Red / Green / Blue offsets per wheel', [{ label: 'Wheel', seg: ['Shadows', 'Mids', 'Lights'] }, { label: 'Red', value: '−6', at: 0.47 }, { label: 'Green', value: '+2', at: 0.51 }, { label: 'Blue', value: '+4', at: 0.52 }, { label: 'Brightness', value: '0', at: 0.5 }, { label: 'Balance', value: '0', at: 0.5 }, { label: 'Blending', value: '50%', at: 0.5 }]],
      ['C — no Wheel row: all twelve at once', [{ label: 'Shadows hue', value: '190°', at: 0.53 }, { label: 'Shadows amount', value: '30%', at: 0.3 }, { label: 'Shadows bright.', value: '0', at: 0.5 }, { label: 'Midtones hue', value: '40°', at: 0.11, grey: true }, { label: 'Midtones amount', value: '0%', at: 0 }, { label: 'Midtones bright.', value: '0', at: 0.5 }, { label: 'Highlights hue', value: '35°', at: 0.1 }, { label: 'Highlights amount', value: '25%', at: 0.25 }, { label: 'Highlights bright.', value: '0', at: 0.5 }, { label: 'Balance', value: '0', at: 0.5 }, { label: 'Blending', value: '50%', at: 0.5 }, { label: 'Keep brightness', value: '100%', at: 1 }]],
    ]],
    ['Tone Curve', [
      ['A — built ' + REC, [{ label: 'Channel', seg: ['RGB', 'Red', 'Green', 'Blue'] }, { label: 'Blacks', value: '0%', at: 0 }, { label: 'Shadows', value: '20%', at: 0.2 }, { label: 'Midtones', value: '50%', at: 0.5 }, { label: 'Highlights', value: '80%', at: 0.8 }, { label: 'Whites', value: '100%', at: 1 }, { label: 'Amount', value: '100%', at: 1 }]],
      ['B — a curve you drag (NEW control: a day or more)', [{ label: 'Channel', seg: ['RGB', 'Red', 'Green', 'Blue'] }, { label: '[ a square graph — drag the points ]', value: '', at: 0.5, grey: true }, { label: 'Amount', value: '100%', at: 1 }]],
      ['C — offsets −100..100 instead of levels', [{ label: 'Channel', seg: ['RGB', 'Red', 'Green', 'Blue'] }, { label: 'Blacks', value: '0', at: 0.5 }, { label: 'Shadows', value: '−20', at: 0.4 }, { label: 'Midtones', value: '0', at: 0.5 }, { label: 'Highlights', value: '+20', at: 0.6 }, { label: 'Whites', value: '0', at: 0.5 }, { label: 'Amount', value: '100%', at: 1 }]],
    ]],
    ['HSL Mixer', [
      ['A — built: Adjust picks the eight ' + REC, [{ label: 'Adjust', seg: ['Hue', 'Sat', 'Bright'], on: 1 }, { label: 'Red', value: '0', at: 0.5 }, { label: 'Orange', value: '0', at: 0.5 }, { label: 'Yellow', value: '0', at: 0.5 }, { label: 'Green', value: '+20', at: 0.6 }, { label: 'Aqua', value: '+30', at: 0.65 }, { label: 'Blue', value: '+40', at: 0.7 }, { label: 'Purple', value: '0', at: 0.5 }, { label: 'Magenta', value: '0', at: 0.5 }]],
      ['B — Colour picks one, three sliders', [{ label: 'Colour', seg: ['R', 'O', 'Y', 'G', 'A', 'B', 'P', 'M'], on: 5 }, { label: 'Hue', value: '0', at: 0.5 }, { label: 'Saturation', value: '+40', at: 0.7 }, { label: 'Brightness', value: '0', at: 0.5 }]],
      ['C — all 24 at once (first 9 of 24 shown)', [{ label: 'Red hue', value: '0', at: 0.5 }, { label: 'Red saturation', value: '0', at: 0.5 }, { label: 'Red brightness', value: '0', at: 0.5 }, { label: 'Orange hue', value: '0', at: 0.5 }, { label: 'Orange saturation', value: '0', at: 0.5 }, { label: 'Orange brightness', value: '0', at: 0.5 }, { label: 'Yellow hue', value: '0', at: 0.5 }, { label: 'Yellow saturation', value: '0', at: 0.5 }, { label: '… and 16 more rows', value: '', at: 0.5, grey: true }]],
    ]],
  ];
  const BLOCK = 540;   // the tallest mock (Colour Wheels C, twelve rows) is 458 px under its 64 px of headings
  const sheet = canvas(GAP + cols * (PW + GAP), 46 + sets.length * (BLOCK + 40));
  const g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'How the panel lays out each effect on a phone (380 px) — MOCK-UPS, row for row; A is what is built', GAP, 12, 18, '#ffffff');
  sets.forEach(([name, panels], si) => {
    const y0 = 46 + si * (BLOCK + 40);
    label(g, name, GAP, y0, 17, '#ffd9a0');
    panels.forEach(([pname, rows], pi) => {
      const x = GAP + pi * (PW + GAP);
      nameLabel(g, pname, x, y0 + 24, 13, PW);
      mockPanel(g, x, y0 + 64, PW, name, rows);
    });
  });
  return sheet;
}

const out = {}, sheets = {};
try {
  sheets['colourwheels-clouds.jpg'] = await photoSheet('Colour Wheels (#966 B18)', 'clouds', 'colorwheels', WHEEL_TILES, false);
  sheets['colourwheels-pair.jpg'] = await photoSheet('Colour Wheels (#966 B18)', 'pair', 'colorwheels', WHEEL_TILES, false);
  sheets['tonecurve-clouds.jpg'] = await photoSheet('Tone Curve (#966 B19) — the inset is the curve each tile draws', 'clouds', 'tonecurve', CURVE_TILES, true);
  sheets['hslmixer-clouds.jpg'] = await photoSheet('HSL Mixer (#966 B20)', 'clouds', 'hslmixer', HSL_TILES, false);
  sheets['hslmixer-shore.jpg'] = await photoSheet('HSL Mixer (#966 B20)', 'shore', 'hslmixer', HSL_TILES, false);
  sheets['layouts.jpg'] = layoutSheet();
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewColour = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest settings, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
