
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OPTS = Object.assign({ now: JSON.parse(JSON.stringify(FM.SHAPE_POLYS.car)) }, {"A":[[[0.6745,0.2382],[0.8055,0.4127],[0.8927,0.4127,1,0.0484,0.0],[0.98,0.5,1,0.0,0.0484],[0.98,0.6309],[0.8927,0.6309],[0.8824,0.6819,1,-0.0066,0.0157],[0.8544,0.7235,1,-0.0178,0.0178],[0.7618,0.7618,1,-0.0361,0.0],[0.6693,0.7235,1,-0.0178,-0.0178],[0.6412,0.6819,1,-0.0066,-0.0157],[0.6309,0.6309],[0.3691,0.6309],[0.3588,0.6819,1,-0.0066,0.0157],[0.3307,0.7235,1,-0.0178,0.0178],[0.2382,0.7618,1,-0.0361,0.0],[0.1456,0.7235,1,-0.0178,-0.0178],[0.1176,0.6819,1,-0.0066,-0.0157],[0.1073,0.6309],[0.02,0.6309],[0.02,0.5,1,0.0,-0.0242],[0.0455,0.4382,1,0.0158,-0.0158],[0.1073,0.4127],[0.2382,0.2382]],[[0.4345,0.3036],[0.2709,0.3036],[0.1884,0.4127],[0.4345,0.4127]],[[0.5,0.3036],[0.5,0.4127],[0.7243,0.4127],[0.6418,0.3036]],[[0.2382,0.5655,1,-0.0361,0.0],[0.1727,0.6309,1,0.0,0.0361],[0.2382,0.6964,1,0.0361,0.0],[0.3036,0.6309,1,0.0,-0.0361]],[[0.7618,0.5655,1,-0.0361,0.0],[0.6964,0.6309,1,0.0,0.0361],[0.7618,0.6964,1,0.0361,0.0],[0.8273,0.6309,1,0.0,-0.0361]]],"B":[[[0.98,0.4699,1,0.0,0.0331],[0.98,0.6199,1,0.0,0.0331],[0.92,0.6799,1,-0.0331,0.0],[0.8562,0.6799],[0.8136,0.7449,1,-0.0205,0.0159],[0.74,0.7701,1,-0.0274,0.0],[0.6664,0.7449,1,-0.0205,-0.0159],[0.6238,0.6799],[0.3763,0.6799],[0.3336,0.7449,1,-0.0205,0.0159],[0.26,0.7701,1,-0.0274,0.0],[0.1864,0.7449,1,-0.0205,-0.0159],[0.1438,0.6799],[0.08,0.6799,1,-0.0331,0.0],[0.02,0.6199,1,0.0,-0.0331],[0.02,0.4399,1,0.0,-0.0059],[0.025,0.4232,1,0.0033,-0.0049],[0.1363,0.2566,1,0.0111,-0.0166],[0.1861,0.2299,1,0.02,0.0],[0.6076,0.2299,1,0.0159,-0.0001],[0.65,0.2475,1,0.0112,0.0113],[0.8124,0.4099],[0.92,0.4099,1,0.0331,0.0]],[[0.1063,0.4099],[0.7276,0.4099],[0.6076,0.2899],[0.1861,0.2899]],[[0.32,0.6499,1,0.0,-0.0331],[0.26,0.5899,1,-0.0331,0.0],[0.2,0.6499,1,0.0,0.0331],[0.26,0.7099,1,0.0331,0.0]],[[0.8,0.6499,1,0.0,-0.0331],[0.74,0.5899,1,-0.0331,0.0],[0.68,0.6499,1,0.0,0.0331],[0.74,0.7099,1,0.0331,0.0]]],"C":[[[0.4997,0.1024],[0.5929,0.1025],[0.7068,0.1042,1,0.043,-0.0015],[0.8096,0.1666,1,0.0229,0.05],[0.8923,0.3732],[0.9582,0.4141,1,0.0142,0.0175],[0.98,0.4694,1,0.0007,0.0179],[0.98,0.7401],[0.9007,0.7401],[0.9007,0.8312,1,0.0038,0.0868],[0.7591,0.8304,1,-0.0032,-0.0911],[0.7574,0.741],[0.2427,0.741],[0.241,0.8305,1,-0.0032,0.0911],[0.0993,0.8313,1,0.0038,-0.0868],[0.0993,0.7401],[0.02,0.7401],[0.02,0.4694,1,0.0007,-0.0179],[0.0418,0.4141,1,0.0142,-0.0175],[0.1077,0.3733],[0.1904,0.1666,1,0.0229,-0.05],[0.2933,0.1042,1,0.043,0.0015],[0.4072,0.1025]],[[0.3028,0.176],[0.2702,0.1829,1,-0.009,0.0054],[0.2496,0.2132,1,-0.0046,0.0156],[0.1908,0.3691],[0.81,0.3699],[0.7505,0.2096,1,-0.0145,-0.0323],[0.6873,0.1774,1,-0.0342,0.0008],[0.314,0.1762,1,-0.0038,-0.0002]],[[0.1057,0.5171,1,0.0,0.037],[0.1727,0.5842,1,0.037,0.0],[0.2398,0.5171,1,0.0,-0.037],[0.1727,0.4501,1,-0.037,0.0]],[[0.764,0.5171,1,0.0,0.037],[0.831,0.5842,1,0.037,0.0],[0.8981,0.5171,1,0.0,-0.037],[0.831,0.4501,1,-0.037,0.0]]]});
const NAMES = {"now": "NOW (v17.02)", "A": "A  MDI side view", "B": "B  Phosphor side view", "C": "C  AIGA front view"};
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
