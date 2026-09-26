"""Write probe.js for tools/shot.py --js-file: renders the current car and options A/B/C THROUGH THE APP.
Frames (ms after the JS returns): 800 now, 2200 A, 3700 B, 5200 C  (stage + the real Add > Shape menu on the Car's page),
then 6600 an overlay of FM.renderScene renders: 220px on light and dark, and the 34px icon box at 1x blown up 4x."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
o = json.load(open(os.path.join(HERE, 'opts', 'options.json')))
OPTS = {k: o[k]['subs'] for k in 'ABC'}
NAMES = {'now': 'NOW (v17.02)', 'A': 'A  MDI side view', 'B': 'B  Phosphor side view', 'C': 'C  AIGA front view'}

JS = r"""
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OPTS = Object.assign({ now: JSON.parse(JSON.stringify(FM.SHAPE_POLYS.car)) }, __OPTS__);
const NAMES = __NAMES__;
const PC = !(FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone());
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(700);
FM.addShapeLayer('car', { name: 'Car' });
const L = FM.scene.layers.filter(l => l.shape === 'car').slice(-1)[0];
const P = FM.scene.project;
const side = Math.round(Math.min(P.width, P.height) * 0.9);
L.shapeW = side; L.shapeH = side;
FM.selectLayer(null);
if (FM.refreshAll) FM.refreshAll();
const badge = document.createElement('div');
badge.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;background:#ffeb3b;color:#000;font:700 15px/1.2 system-ui;padding:4px 8px;border-radius:6px;pointer-events:none';
document.body.appendChild(badge);
const measures = {};
// A copy of js/addmenu.js icoPoly (filled branch). The menu builds its icons ONCE at load (addmenu.js:351), so a runtime
// swap of FM.SHAPE_POLYS.car does not reach the tile; this redraws the tile exactly as a reload with the new data would.
// Checked below: for the current car it must reproduce the menu's own path string character for character.
function icoCar(polys) {
  var asp = (FM.SHAPE_ASPECT && FM.SHAPE_ASPECT.car) || [1, 1];
  var k = 18 / Math.max(asp[0], asp[1]);
  var bw = asp[0] * k, bh = asp[1] * k;
  var ox = (24 - bw) / 2, oy = (24 - bh) / 2;
  var M = function (p) { return [(ox + p[0] * bw), (oy + p[1] * bh)]; };
  var f = function (q) { return q[0].toFixed(2) + ' ' + q[1].toFixed(2); };
  var sub = function (pl) {
    var n = pl.length; if (!n) return '';
    var closed = true;
    var out = 'M' + f(M(pl[0]));
    var segs = closed ? n : n - 1;
    for (var i = 0; i < segs; i++) {
      var p1 = pl[i], p2 = closed ? pl[(i + 1) % n] : pl[i + 1];
      if (p1[2] !== 1 && p2[2] !== 1) { out += ' L' + f(M(p2)); continue; }
      var c1 = FM.pointCtrl(pl, i, closed).out, c2 = FM.pointCtrl(pl, i + 1, closed).in;
      out += ' C' + f(M(c1)) + ' ' + f(M(c2)) + ' ' + f(M(p2));
    }
    return out + (closed ? ' Z' : '');
  };
  var d = polys.map(sub).join(' ');
  return '<svg viewBox="0 0 24 24"><path d="' + d + '" fill="currentColor" stroke="none"/></svg>';
}
async function show(k) {
  FM.SHAPE_POLYS.car = OPTS[k];
  badge.textContent = NAMES[k];
  if (PC) {
    FM.selectLayer(null);
    FM.addMenu.openTab('shape');
  } else {
    FM.mobile.openAdd();
    await sleep(450);
    const tab = document.querySelector('#add-sheet .addmenu-tab[data-key="shape"]');
    if (tab && !tab.classList.contains('active')) tab.click();
  }
  if (FM.requestRender) FM.requestRender();
  await sleep(400);
  const root = PC ? document.querySelector('#inspector-panel') : document.querySelector('#add-sheet');
  const tile = root && root.querySelector('.addmenu-card[title="Car"]');
  if (!tile) { measures[k] = 'no Car tile'; return; }
  const page = tile.closest('.addmenu-page'), pager = tile.closest('.addmenu-pager');
  const pages = Array.from(page.parentNode.children).filter(e => e.classList.contains('addmenu-page'));
  pager.scrollLeft = pages.indexOf(page) * pager.clientWidth;
  await sleep(250);
  const ic = tile.querySelector('.addmenu-ic');
  if (k === 'now') {
    const mine = icoCar(OPTS.now).match(/d="([^"]+)"/)[1], theirs = ic.querySelector('path').getAttribute('d');
    measures.mirrorMatchesMenu = mine === theirs;
  } else {
    ic.innerHTML = icoCar(OPTS[k]);
  }
  tile.style.outline = '2px solid #ffeb3b'; tile.style.outlineOffset = '1px';
  const svg = tile.querySelector('svg');
  const r = svg.getBoundingClientRect();
  const st = document.querySelector('#stage canvas, canvas#stage, .stage canvas, canvas');
  measures[k] = { iconCss: [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10], dpr: devicePixelRatio,
                  page: pages.indexOf(page) + 1, pages: pages.length };
}
const metrics = {};
for (const k of ['now', 'A', 'B', 'C']) {
  FM.SHAPE_POLYS.car = OPTS[k];
  const car = OPTS[k];
  const area = sub => { let s = 0; for (let i = 0; i < sub.length; i++) { const a = sub[i], b = sub[(i + 1) % sub.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const bb = sub => sub.reduce((a, p) => ({ x0: Math.min(a.x0, p[0]), x1: Math.max(a.x1, p[0]), y0: Math.min(a.y0, p[1]), y1: Math.max(a.y1, p[1]) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
  const body = bb(car[0]), wind = Math.sign(area(car[0])), midY = (body.y0 + body.y1) / 2;
  const hubs = car.slice(1).filter(s => Math.sign(area(s)) !== wind).map(bb).filter(b => Math.abs((b.x1 - b.x0) - (b.y1 - b.y0)) < 0.01 && (b.y0 + b.y1) / 2 > midY)
    .map(b => ({ cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, r: (b.x1 - b.x0) / 2 })).sort((a, b) => a.cx - b.cx);
  const S = 34, bw = 25.5, ox = (S - bw) / 2;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const x = c.getContext('2d', { willReadFrequently: true });
  const Lm = FM.makeLayer('shape', { shape: 'car', name: 'Car', x: S / 2, y: S / 2, shapeW: bw, shapeH: bw, fill: '#ffffff', start: 0, duration: 5 });
  FM.renderScene(x, { project: { width: S, height: S, fps: 30, duration: 5, background: '#000000' }, layers: [Lm], selectedId: null, selectedIds: [] }, 0);
  const d = x.getImageData(0, 0, S, S).data, ink = (px, py) => d[(py * S + px) * 4] / 255;
  const bottom = col => { let b = -1; for (let py = 0; py < S; py++) if (ink(col, py) >= 0.5) b = py; return b + 1; };
  const mid = Math.floor(ox + ((hubs[0].cx + hubs[1].cx) / 2) * bw);
  let totalInk = 0; for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) totalInk += ink(px, py);
  metrics[k] = { totalInk: +totalInk.toFixed(1), hubs: hubs.map(h => {
    const cx = ox + h.cx * bw, cy = ox + h.cy * bw, r = h.r * bw;
    let open = 0, ring = 0, ringN = 0;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const dist = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
      if (dist <= r + 0.75) open += 1 - ink(px, py); else if (dist <= r + 1.4) { ring += ink(px, py); ringN++; }
    }
    return { dPx: +(2 * r).toFixed(2), openPx2: +open.toFixed(2), ringInk: +(ring / ringN).toFixed(2), hangPx: bottom(Math.floor(cx)) - bottom(mid) };
  }) };
}
FM.SHAPE_POLYS.car = OPTS.now;
await show('now');
setTimeout(() => show('A'), 1000);
setTimeout(() => show('B'), 2500);
setTimeout(() => show('C'), 4000);
setTimeout(() => {
  // the sheet: FM.renderScene of each car, big on light and dark, and the icon's 25.5px box at 1x
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#fff;overflow:hidden;padding:6px;box-sizing:border-box;font:600 13px system-ui;color:#000';
  document.body.appendChild(ov);
  badge.textContent = 'renderScene: 220px light / dark, and the 34px icon at 1x (x4)';
  const keys = ['now', 'A', 'B', 'C'];
  const big = PC ? 220 : 150;
  keys.forEach(k => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:2px 0';
    const lab = document.createElement('div'); lab.textContent = NAMES[k]; lab.style.cssText = 'width:' + (PC ? 150 : 44) + 'px;font-size:' + (PC ? 14 : 11) + 'px';
    row.appendChild(lab);
    FM.SHAPE_POLYS.car = OPTS[k];
    const draw = (S, bg, fill, box) => {
      const c = document.createElement('canvas');
      const dpr = box ? 1 : devicePixelRatio;
      c.width = S * dpr; c.height = S * dpr;
      c.style.width = (box ? S * 4 : S) + 'px'; c.style.height = (box ? S * 4 : S) + 'px';
      if (box) c.style.imageRendering = 'pixelated';
      const x = c.getContext('2d');
      const bw = (box || S * 0.96) * dpr;
      const Lr = FM.makeLayer('shape', { shape: 'car', name: 'C', x: S * dpr / 2, y: S * dpr / 2, shapeW: bw, shapeH: bw, fill: fill, start: 0, duration: 5 });
      FM.renderScene(x, { project: { width: S * dpr, height: S * dpr, fps: 30, duration: 5, background: bg }, layers: [Lr], selectedId: null, selectedIds: [] }, 0);
      return c;
    };
    row.appendChild(draw(big, '#f4f6fa', '#1c2a38'));
    row.appendChild(draw(big, '#161a21', '#e8edf2'));
    row.appendChild(draw(34, '#5a8f86', '#ffffff', 25.5));
    ov.appendChild(row);
  });
}, 5600);
return { menu: measures, metrics: metrics };
"""


def main():
    js = JS.replace('__OPTS__', json.dumps(OPTS, separators=(',', ':'))).replace('__NAMES__', json.dumps(NAMES))
    open(os.path.join(HERE, 'probe.js'), 'w').write(js)
    print('wrote probe.js', len(js))


if __name__ == '__main__':
    main()
