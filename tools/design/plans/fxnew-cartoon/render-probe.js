/* render-probe.js — the #545 options sheets for #966 B31 Cartoon, rendered through the APP'S OWN compositor (FM.renderScene, the
   very kernel the export runs), so what he picks from is what the app draws. For tools/shot.py --js-file, in the next browser slot.
   Nothing in the app is changed: the photos are throwaway media records and layers, removed at the end.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmNewCartoon as data URLs and only the summary returns.

   A FRESH Image is loaded for every tile: FM.media.remove() empties the element it was given, so an image used twice renders black.
   (Each tile also gets its own canvas as the media element, so removing one never touches another.)

   Pages — two tiles across, three down, so each is under 2x as tall as wide and reaches his phone (the tall-images lesson):
     cartoon-looks-cat.jpg / -dog.jpg / -shore.jpg   the photo, the default as built, and the four LOOKS (documented starting
                                                     settings, NOTES.md): Soft comic, Bold ink, Flat cel, Sketchy.
     cartoon-controls-cat-p1..p2.jpg                 each control swept on the cat, one setting per tile, named under it.
   "RECOMMENDED" marks the builder's pick. Every tile is a setting of the effect as built, so his pick sets DEFAULTS (or becomes a
   look) — no rebuild. The tiles are 340-px projects and Edge width / Smoothing are project px, so a 3-px line here is about a
   hundredth of the frame — the share 10 px is on a 1080-px export (said on the sheet). */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('cartoon')) return { ok: false, error: 'this tree has no Cartoon (cartoon) — serve hunt/fxnew-cartoon' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {}, made = [];
const REC = 'RECOMMENDED';   // a tile whose name ends with this gets it on its own line, in gold

const fx = over => { const e = FM.fxRegistry.makeInstance('cartoon'); Object.assign(e.params, over || {}); return e; };
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
  const mid = '_fxnewcartoon_' + key + '_' + made.length;
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
async function photoPages(base, title, key, tiles) {
  const per = COLS * ROWS, pages = [], many = tiles.length > per;
  for (let p = 0; p * per < tiles.length; p++) {
    const part = tiles.slice(p * per, (p + 1) * per), rows = Math.ceil(part.length / COLS);
    const sheet = canvas(SP + COLS * (S + SP), 46 + rows * (S + SL + SP) + 26);
    const g = sheet.getContext('2d');
    g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
    label(g, title + ' on ' + key + '.jpg' + (many ? ' (' + (p + 1) + '/' + Math.ceil(tiles.length / per) + ')' : ''), SP, 12, 17, '#ffffff');
    for (let i = 0; i < part.length; i++) {
      const [name, over] = part[i], x = SP + (i % COLS) * (S + SP), y = 46 + Math.floor(i / COLS) * (S + SL + SP);
      const ts = Date.now();
      try { g.drawImage(await photoTile(key, over ? fx(over) : null, S), x, y + SL); }
      catch (e) { errors.push(base + ' ' + name + ': ' + (e && e.message)); }
      timing[base + ': ' + name] = Date.now() - ts;
      nameLabel(g, name, x, y + 2, 13, S);
      await sleep(0);
    }
    label(g, 'Tiles are 340 px: a 3 px Edge width here is about what 10 px is on a 1080 px export.', SP, sheet.height - 22, 12, '#9aa4b6', '500');
    pages.push([base + (many ? '-p' + (p + 1) : '') + '.jpg', sheet]);
  }
  return pages;
}

/* ───────────────────────── the looks (NOTES.md has them as numbers) and each control swept ───────────────────────── */
const LOOKS = [
  ['The photo, no effect', null],
  ['Default as built: Smoothing 3, 4 steps, Edge width 3, threshold 15, black, Saturation 120 ' + REC, {}],
  ['Soft comic: Smoothing 4, 6 steps, width 2, threshold 20, dark grey lines, Saturation 115', { smooth: 4, steps: 6, width: 2, threshold: 20, color: '#2b2b2b', saturation: 115 }],
  ['Bold ink: Smoothing 3, 4 steps, width 5, threshold 10, black, Saturation 135', { smooth: 3, steps: 4, width: 5, threshold: 10, color: '#000000', saturation: 135 }],
  ['Flat cel: Smoothing 6, 3 steps, width 3, threshold 15, Saturation 140', { smooth: 6, steps: 3, width: 3, threshold: 15, saturation: 140 }],
  ['Sketchy: Smoothing 1, 8 steps, width 1.5, threshold 5, brown-grey lines, Saturation 60', { smooth: 1, steps: 8, width: 1.5, threshold: 5, color: '#3b2f2a', saturation: 60 }],
];
const CONTROLS = [
  ['Shading steps 2 (light and shadow only)', { steps: 2 }],
  ['Shading steps 8 (smoother shading)', { steps: 8 }],
  ['Edge width 1.5 (fine lines)', { width: 1.5 }],
  ['Edge width 6 (heavy lines)', { width: 6 }],
  ['Edge threshold 5 (lines on every edge)', { threshold: 5 }],
  ['Edge threshold 40 (only the strongest edges)', { threshold: 40 }],
  ['Smoothing 0 (texture kept)', { smooth: 0 }],
  ['Smoothing 8 (flat, painterly patches)', { smooth: 8 }],
  ['Saturation 60 (muted)', { saturation: 60 }],
  ['Saturation 180 (loud)', { saturation: 180 }],
  ['Edge colour deep blue', { color: '#1b2a6b' }],
  ['Mix 60 (part cartoon, part photo)', { mix: 60 }],
];

const out = {}, sheets = {};
try {
  for (const [base, title, key, tiles] of [
    ['cartoon-looks-cat', 'Cartoon (#966 B31): the looks', 'cat', LOOKS],
    ['cartoon-looks-dog', 'Cartoon (#966 B31): the looks', 'dog', LOOKS],
    ['cartoon-looks-shore', 'Cartoon (#966 B31): the looks', 'shore', LOOKS],
    ['cartoon-controls-cat', 'Cartoon (#966 B31): each control from the default', 'cat', CONTROLS],
  ]) for (const [name, sheet] of await photoPages(base, title, key, tiles)) sheets[name] = sheet;
  for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }
window.__fmNewCartoon = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest settings, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
