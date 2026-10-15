/* render-probe.js — the #545 before / after sheet for LAND-LIST §3 Q9, "Overdrive filter's sun turns lavender" (hunt/pile-overdrive,
   ported from the ChatGPT pile's b5ed0efb), rendered through the APP'S OWN compositor (FM.renderScene, the very kernels the export
   runs), so what he looks at is what the app draws. For tools/shot.py --js-file, in the next browser slot. Nothing in the app is
   changed: the shots are throwaway media records and layers, removed at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmPileOverdrive as data URLs and only the summary returns.

   A FRESH Image is loaded for every render: FM.media.remove() empties the element it was given, so an image used twice renders black.

   BEFORE is Overdrive as v17.50 builds it (its Unsharp Mask at Protect colour 0 — also what every SAVED Overdrive keeps); AFTER is
   this branch's recipe (Protect colour 100). Same photo, same moment (t = 0.5, so the same flash), side by side.
   Pages — two tiles across, at most three down, so each is under 2x as tall as wide and reaches his phone (the tall-images lesson):
     overdrive-sun.jpg  sunpath.jpg (a low sun in an orange sky): the whole frame; the sun close up in the export's own pixels; and
                        the same patch on a phone's preview plate (380 wide), its pixels blown up — where the lavender showed.
     overdrive-fixture.jpg  the tests' own picture (a white sun the vignette dims and a near-white one, in a yellow glare): whole, and
                        each sun close up. ⚠️ On sunpath the sun sits at ~0.40 of the half-diagonal, just past where Overdrive's
                        vignette starts (0.38), so by the arithmetic it is dimmed ~1% and its lavender there may be FAINT — this page
                        shows the mechanism at full strength; the summary's numbers say how much sunpath really shows.
     overdrive-car.jpg  the car the Overdrive tile previews on: the whole frame, and its middle at 3x — the "everything else" check:
                        colour edges lose their coloured fringe (the only other thing that moves), flat colour does not change.
   Recommended: AFTER (★). It is the fix; the picture is for him to see before it ships. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.filters && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.filters && FM.filters.makeInstance)) return { ok: false, error: 'FM never came up' };
const umOf = box => ((box && box.effects) || []).filter(e => e.type === 'unsharpmask')[0];
const probeBox = FM.filters.makeInstance('overdrive');
if (!umOf(probeBox)) return { ok: false, error: 'this tree has no Overdrive filter with an Unsharp Mask' };
if (umOf(probeBox).params.coloursafe !== 100) return { ok: false, error: 'this tree builds Overdrive with Protect colour ' + umOf(probeBox).params.coloursafe + ', not 100 — serve hunt/pile-overdrive' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.88, T = 0.5, errors = [], timing = {}, made = [], numbers = {};
const S = 340, COLS = 2, SL = 48, SP = 10, PHONE_W = 380;
const SUN = { x: 0.5, y: 0.22, w: 0.16 };   // where the sun sits in sunpath.jpg, as shares of the frame, and the zoom's width

const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function label(g, text, x, y, size, colour, weight) { g.font = (weight || '600') + ' ' + (size || 15) + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(text, x, y); }
/* a name, and ★ RECOMMENDED under it in gold when the name ends with it; long names wrap at `maxW` (two lines at most) */
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
// a FRESH Image every call — never cached (see the header)
function loadPhoto(key) {
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1&n=' + made.length + '_' + Date.now(); });
}
/* Overdrive, BEFORE (old: Protect colour 0, as v17.50 and every saved Overdrive) or AFTER (this branch) */
function overdrive(old) { const box = FM.filters.makeInstance('overdrive'); if (old) umOf(box).params.coloursafe = 0; return box; }
/* the photo as a full-frame image layer in a project of the photo's own size, through `box`, drawn `outW` wide (the photo's
   width = the export; PHONE_W = a phone's preview plate). Returns the canvas. */
async function render(key, box, outW) {
  const im = typeof key === 'string' ? await loadPhoto(key) : key();
  const W = im.naturalWidth || im.width, H = im.naturalHeight || im.height;
  const mid = '_pileoverdrive_' + made.length;
  FM.media.set(mid, { kind: 'image', el: im, width: W, height: H, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: W / 2, y: H / 2, start: 0, duration: 4 }); L.id = mid; L.start = 0; L.duration = 4; L.transform.scale = 1;
  L.effects = [box];
  const w = outW || W, o = canvas(w, Math.round(w * H / W));
  FM.renderScene(o.getContext('2d', { willReadFrequently: true }), { project: { width: W, height: H, fps: 30, duration: 4, background: '#000000' }, layers: [L], selectedId: null, selectedIds: [] }, T);
  return o;
}
function fit(c) { const k = S / Math.max(c.width, c.height), o = canvas(S, S), g = o.getContext('2d'); g.fillStyle = '#05070c'; g.fillRect(0, 0, S, S); g.drawImage(c, (S - c.width * k) / 2, (S - c.height * k) / 2, c.width * k, c.height * k); return o; }
/* a crop of `c` centred on shares (fx, fy), `fw` of its width across, blown up to the tile with hard pixels */
function zoom(c, fx, fy, fw) {
  const w = Math.max(8, Math.round(c.width * fw)), x = Math.round(c.width * fx - w / 2), y = Math.round(c.height * fy - w / 2);
  const o = canvas(S, S), g = o.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#05070c'; g.fillRect(0, 0, S, S); g.drawImage(c, x, y, w, w, 0, 0, S, S);
  return o;
}
/* THE TESTS' OWN FIXTURE (tests.js '690 Q9', od9SunTex): a 240 x 180 yellow glare (255, 255, 170) with a pure-white sun at
   (40, 40), in the vignette's band, and a near-white (232) one at the centre, each 11 px across. A fresh canvas per render. By the
   arithmetic in NOTES.md both rims go lavender BEFORE and stay white AFTER; this page shows it without the photo's own luck. */
function fixtureTex() {
  const W = 240, H = 180, c = canvas(W, H), g = c.getContext('2d'), im = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, sun = Math.hypot(x - 40, y - 40) <= 5, near = Math.hypot(x - 120, y - 90) <= 5;
    const v = sun ? [255, 255, 255] : (near ? [232, 232, 232] : [255, 255, 170]);
    im.data[i] = v[0]; im.data[i + 1] = v[1]; im.data[i + 2] = v[2]; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return c;
}
/* the numbers for the summary: the worst lavender, B − max(R, G), over a box round the sun (shares of the frame, default the
   sunpath sun), and how many pixels pass 8 */
function lavender(c, at) {
  const s = at || SUN;
  const g = c.getContext('2d', { willReadFrequently: true }), w = Math.max(4, Math.round(c.width * s.w)), x0 = Math.round(c.width * s.x - w / 2), y0 = Math.round(c.height * s.y - w / 2);
  const d = g.getImageData(x0, y0, w, w).data; let worst = -999, at = '', over8 = 0;
  for (let i = 0; i < d.length; i += 4) { const e = d[i + 2] - Math.max(d[i], d[i + 1]); if (e > 8) over8++; if (e > worst) { worst = e; at = 'rgb(' + d[i] + ',' + d[i + 1] + ',' + d[i + 2] + ')'; } }
  return { worst: worst, at: at, over8: over8 };
}

async function sheet(name, title, rows) {
  const sh = canvas(SP + COLS * (S + SP), 46 + rows.length * (S + SL + SP)), g = sh.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sh.width, sh.height);
  label(g, title, SP, 12, 17, '#ffffff');
  for (let r = 0; r < rows.length; r++) {
    for (let k = 0; k < 2; k++) {
      const [text, make] = rows[r][k], x = SP + k * (S + SP), y = 46 + r * (S + SL + SP), ts = Date.now();
      try { g.drawImage(await make(), x, y + SL); }
      catch (e) { errors.push(name + ' ' + text + ': ' + (e && e.message)); }
      timing[name + ': ' + text] = Date.now() - ts;
      nameLabel(g, text, x, y + 2, 13, S);
      await sleep(0);
    }
  }
  return sh;
}

const posted = {}, sheets = {};
try {
  const sunB = await render('sunpath', overdrive(true)), sunA = await render('sunpath', overdrive(false));
  const sunPB = await render('sunpath', overdrive(true), PHONE_W), sunPA = await render('sunpath', overdrive(false), PHONE_W);
  numbers.sun = { before: lavender(sunB), after: lavender(sunA), phoneBefore: lavender(sunPB), phoneAfter: lavender(sunPA), size: sunB.width + 'x' + sunB.height };
  sheets['overdrive-sun.jpg'] = await sheet('overdrive-sun.jpg', 'Overdrive (LAND-LIST Q9): the sun. BEFORE (today) | AFTER', [
    [['BEFORE: today’s Overdrive', async () => fit(sunB)], ['AFTER: the sun stays white RECOMMENDED', async () => fit(sunA)]],
    [['BEFORE: the sun close up (export pixels)', async () => zoom(sunB, SUN.x, SUN.y, SUN.w)], ['AFTER: the sun close up (export pixels)', async () => zoom(sunA, SUN.x, SUN.y, SUN.w)]],
    [['BEFORE: the sun on a phone’s preview (' + PHONE_W + ' wide)', async () => zoom(sunPB, SUN.x, SUN.y, SUN.w)], ['AFTER: the sun on a phone’s preview', async () => zoom(sunPA, SUN.x, SUN.y, SUN.w)]],
  ]);
  const FW = { x: 40 / 240, y: 40 / 180, w: 30 / 240 }, FN = { x: 0.5, y: 0.5, w: 30 / 240 };
  const fxB = await render(fixtureTex, overdrive(true)), fxA = await render(fixtureTex, overdrive(false));
  numbers.fixture = { whiteBefore: lavender(fxB, FW), whiteAfter: lavender(fxA, FW), nearBefore: lavender(fxB, FN), nearAfter: lavender(fxA, FN) };
  sheets['overdrive-fixture.jpg'] = await sheet('overdrive-fixture.jpg', 'Overdrive (LAND-LIST Q9): the tests’ sun in a yellow glare. BEFORE | AFTER', [
    [['BEFORE: the whole test picture', async () => fit(fxB)], ['AFTER RECOMMENDED', async () => fit(fxA)]],
    [['BEFORE: the white sun the vignette dims, close up', async () => zoom(fxB, FW.x, FW.y, FW.w)], ['AFTER: the white sun, close up', async () => zoom(fxA, FW.x, FW.y, FW.w)]],
    [['BEFORE: the near-white sun, close up', async () => zoom(fxB, FN.x, FN.y, FN.w)], ['AFTER: the near-white sun, close up', async () => zoom(fxA, FN.x, FN.y, FN.w)]],
  ]);
  const car = (FM.fxThumbs && FM.fxThumbs._filterSubject && FM.fxThumbs._filterSubject('overdrive')) || 'mclaren';
  const carB = await render(car, overdrive(true)), carA = await render(car, overdrive(false));
  numbers.car = car;
  sheets['overdrive-car.jpg'] = await sheet('overdrive-car.jpg', 'Overdrive (LAND-LIST Q9): everything else, on ' + car + '. BEFORE | AFTER', [
    [['BEFORE: today’s Overdrive', async () => fit(carB)], ['AFTER: Protect colour on its sharpen RECOMMENDED', async () => fit(carA)]],
    [['BEFORE: the middle at 3x (export pixels: colour edges)', async () => zoom(carB, 0.5, 0.5, S / 3 / carB.width)], ['AFTER: the middle at 3x', async () => zoom(carA, 0.5, 0.5, S / 3 / carA.width)]],
  ]);
  for (const name of Object.keys(sheets)) posted[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmPileOverdrive = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors, numbers: numbers };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the lavender numbers, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 4).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: posted, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  numbers: numbers, slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
