/* render-probe.js — the #545 options sheets for #966 B40 Title Warp (ported from the pile's 01d2f034), rendered through the APP'S
   OWN compositor (FM.renderScene, the very warp the export runs), so what he picks from is what the app draws. For tools/shot.py
   --js-file, in the next browser slot. Nothing in the app is changed: the layers are throwaway and never enter a project.

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the
   page address works too. Without a receiver the pages stay on window.__fmPileTitlewarp as data URLs and only the summary returns.

   The run, from the worktree that holds this file (never beside a ship or a mutation — a browser beside ship.sh turned 921 red):
     P=<free port>; R=<free port>
     tools/serve.sh $P . &   python3 tools/design/plans/fxnew-looks/recv.py $R /tmp/fm-titlewarp &
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
         --js-file tools/design/plans/pile-titlewarp/render-probe.js --out /tmp/fm-titlewarp/page.png

   Every tile is a bold gold title on a navy 16:9 frame with Title Warp on it, drawn at the size it is shown (the warp lives in the
   title's own box, so the look does not depend on the size). Pages — each under 2x as tall as wide, so it reaches his phone whole:
     titlewarp-shapes.jpg   all ten shapes at the defaults (Bend 35), two rows of five
     titlewarp-bend.jpg     Bend along Arc and Flag, Twist both ways, five shapes at Bend 70, and Flag waving with Wave speed
     titlewarp-smooth.jpg   Smooth sampling Off (every warp's default) against On, big, on Arc and Twist — his question 1
   "RECOMMENDED" marks the builder's pick. Every tile is an option of the effect as built, so his pick sets DEFAULTS — no rebuild. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('titlewarp')) return { ok: false, error: 'this tree has no Title Warp (titlewarp) — serve hunt/pile-titlewarp' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {};
const REC = 'RECOMMENDED';   // a tile whose name ends with this gets it in gold
const TITLE = 'SUMMER SALE';

const fx = over => { const e = FM.fxRegistry.makeInstance('titlewarp'); Object.assign(e.params, over || {}); return e; };
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

/* one tile: the title with Title Warp `over` (the rest its defaults), W x H, at time t, through FM.renderScene */
function tile(over, W, H, t) {
  const L = FM.makeLayer('text', { text: TITLE, fontSize: Math.round(W * 0.13), color: '#ffd166', bold: true, x: W / 2, y: H / 2, start: 0, duration: 4 });
  L.start = 0; L.duration = 4;
  L.effects = [fx(over)];
  const c = canvas(W, H);
  FM.renderScene(c.getContext('2d'), { project: { width: W, height: H, fps: 30, duration: 4, background: '#14213d' }, layers: [L], selectedId: null, selectedIds: [] }, t == null ? 0.5 : t);
  return c;
}

/* a page: rows of up to five tiles, each row one family */
async function gridPage(base, title, sub, rows, TW, TH) {
  const M = 24, G = 8, HD = 96, LB = 28, CB = 40, RG = 10, N = Math.max.apply(null, rows.map(r => r[1].length));
  const sheet = canvas(M * 2 + N * TW + (N - 1) * G, HD + rows.length * (LB + TH + CB + RG) + M), g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, title, M, 16, 22, '#ffffff');
  wrapLabel(g, sub, M, 50, 14, sheet.width - 2 * M);
  for (let r = 0; r < rows.length; r++) {
    const [name, cells] = rows[r], y = HD + r * (LB + TH + CB + RG);
    label(g, name, M, y + 4, 15);
    const ts = Date.now();
    for (let k = 0; k < cells.length; k++) {
      const [cap, over, t] = cells[k], x = M + k * (TW + G);
      try { g.drawImage(tile(over, TW, TH, t), x, y + LB); }
      catch (e) { errors.push(base + ' ' + name + ' / ' + cap + ': ' + (e && e.message)); }
      caption(g, cap, x, y + LB + TH + 5, 12);
    }
    timing[base + ': ' + name] = Date.now() - ts;
    await sleep(0);
  }
  return sheet;
}
const S = ['Arc', 'Arch', 'Bulge', 'Flag', 'Wave', 'Fish', 'Rise', 'Inflate', 'Squeeze', 'Twist'];
const shape = i => [S[i] + (i === 0 ? ' (default) ' + REC : ''), { style: i }];
const PAGES = [
  ['titlewarp-shapes', 'Title Warp (#966 B40) — the ten shapes', 'Each at the defaults: Bend 35 %, Wave phase 0. The bend lives in the title’s own box, so a small title bends the same as a big one.', [
    ['Arc to Fish', [0, 1, 2, 3, 4].map(shape)], ['Rise to Twist', [5, 6, 7, 8, 9].map(shape)]], 150, 84],
  ['titlewarp-bend', 'Title Warp — how far it bends', 'Bend runs −100 to 100 % (below 0 the shape turns over). Wave speed turns Wave phase on the clip’s own clock, so a flag waves without keyframes.', [
    ['Arc', [['−60 %', { style: 0, amount: -60 }], ['−30 %', { style: 0, amount: -30 }], ['35 % (default) ' + REC, { style: 0 }], ['70 %', { style: 0, amount: 70 }], ['100 %', { style: 0, amount: 100 }]]],
    ['Flag', [['20 %', { style: 3, amount: 20 }], ['50 %', { style: 3, amount: 50 }], ['80 %', { style: 3, amount: 80 }], ['100 %', { style: 3, amount: 100 }], ['80 %, phase 180°', { style: 3, amount: 80, phase: 180 }]]],
    ['Twist', [['−70 %', { style: 9, amount: -70 }], ['35 %', { style: 9 }], ['60 %', { style: 9, amount: 60 }], ['80 %', { style: 9, amount: 80 }], ['100 %', { style: 9, amount: 100 }]]],
    ['At 70 %', [['Bulge', { style: 2, amount: 70 }], ['Fish', { style: 5, amount: 70 }], ['Rise', { style: 6, amount: 70 }], ['Inflate', { style: 7, amount: 70 }], ['Squeeze', { style: 8, amount: 70 }]]],
    ['Flag waving (Wave speed 180°/s)', [0, 0.4, 0.8, 1.2, 1.6].map(t => [t + ' s', { style: 3, amount: 60, speed: 180 }, t])]], 150, 84],
  ['titlewarp-smooth', 'Title Warp — Smooth sampling Off or On', 'Every warp starts with Smooth sampling Off (the old sampler). On a bent title Off leaves stair-steps along the curves; On blends them. Should Title Warp start On?', [
    ['Arc 70 %', [['Off (every warp’s default)', { style: 0, amount: 70 }], ['On ' + REC, { style: 0, amount: 70, smooth: 1 }]]],
    ['Twist 70 %', [['Off', { style: 9, amount: 70 }], ['On ' + REC, { style: 9, amount: 70, smooth: 1 }]]]], 380, 214],
];

const out = {}, sheets = {};
for (const [base, title, sub, rows, TW, TH] of PAGES) sheets[base + '.jpg'] = await gridPage(base, title, sub, rows, TW, TH);
for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
window.__fmPileTitlewarp = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest rows, any errors */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 6).map(k => k + ' ' + timing[k] + ' ms');
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, errors: errors.slice(0, 6), ms: Date.now() - t0 };
