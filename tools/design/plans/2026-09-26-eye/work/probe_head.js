// eye probe — injected by tools/shot.py --js-file. Nothing here touches app files: the options are put into
// FM.SHAPE_POLYS under temporary keys (eyeA/eyeB/eyeC), which is the same table the compositor and the menu read.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = { dpr: devicePixelRatio, vw: innerWidth };
for (const k of ['A', 'B', 'C']) { FM.SHAPE_POLYS['eye' + k] = O[k]; FM.SHAPE_ASPECT['eye' + k] = FM.SHAPE_ASPECT.eye; }

// ---- replica of js/addmenu.js icoPoly (fill branch), checked below against the real tile ----
function icoPoly(kind) {
  const polys = FM.SHAPE_POLYS[kind] || [], asp = FM.SHAPE_ASPECT[kind] || [1, 1];
  const k = 18 / Math.max(asp[0], asp[1]), bw = asp[0] * k, bh = asp[1] * k, ox = (24 - bw) / 2, oy = (24 - bh) / 2;
  const M = p => [ox + p[0] * bw, oy + p[1] * bh], f = q => q[0].toFixed(2) + ' ' + q[1].toFixed(2);
  const sub = pl => {
    const n = pl.length; let out = 'M' + f(M(pl[0]));
    for (let i = 0; i < n; i++) {
      const p1 = pl[i], p2 = pl[(i + 1) % n];
      if (p1[2] !== 1 && p2[2] !== 1) { out += ' L' + f(M(p2)); continue; }
      const c1 = FM.pointCtrl(pl, i, true).out, c2 = FM.pointCtrl(pl, i + 1, true).in;
      out += ' C' + f(M(c1)) + ' ' + f(M(c2)) + ' ' + f(M(p2));
    }
    return out + ' Z';
  };
  return '<svg viewBox="0 0 24 24"><path d="' + polys.map(sub).join(' ') + '" fill="currentColor" stroke="none"></path></svg>';
}

// ---- the measurement the proving test will make (dry run) ----
function eyeStats(kind, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  FM.traceShapePath(g, { shape: kind }, 0, 0, w, h); g.fillStyle = '#000'; g.fill();
  const d = g.getImageData(0, 0, w, h).data, N = w * h, m = new Uint8Array(N);
  for (let i = 0; i < N; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  const lab = new Int32Array(N), st = new Int32Array(N), comps = [];
  for (let i = 0; i < N; i++) {
    if (!m[i] || lab[i]) continue;
    const id = comps.length + 1, b = { x0: w, y0: h, x1: -1, y1: -1, n: 0 };
    let sp = 0; st[sp++] = i; lab[i] = id;
    while (sp) {
      const p = st[--sp], x = p % w, y = (p - x) / w; b.n++;
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) if (q >= 0 && m[q] && !lab[q]) { lab[q] = id; st[sp++] = q; }
    }
    comps.push(b);
  }
  // enclosed background regions (holes), as figTopo counts them
  const bg = new Uint8Array(N);
  const flood0 = (s0, marks) => { let sp = 0; st[sp++] = s0; marks[s0] = 1; while (sp) { const p = st[--sp], x = p % w, y = (p - x) / w;
    const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const q of nb) if (q >= 0 && !m[q] && !marks[q]) { marks[q] = 1; st[sp++] = q; } } };
  for (let x = 0; x < w; x++) { if (!m[x] && !bg[x]) flood0(x, bg); const q = x + (h - 1) * w; if (!m[q] && !bg[q]) flood0(q, bg); }
  for (let y = 0; y < h; y++) { const a = y * w, b2 = a + w - 1; if (!m[a] && !bg[a]) flood0(a, bg); if (!m[b2] && !bg[b2]) flood0(b2, bg); }
  let holes = 0; const hs = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (!m[i] && !bg[i] && !hs[i]) { holes++; flood0(i, hs); }
  // the pupil: the SMALLEST component whose box holds the centre of the shape's box
  const cx = w / 2, cy = h / 2;
  const holding = comps.filter(b => b.x0 <= cx && b.x1 >= cx && b.y0 <= cy && b.y1 >= cy).sort((a, b) => (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0));
  const P = holding.length > 1 ? holding[0] : null;
  let gapTop = -1, gapSide = -1, lidTop = -1;
  if (P) {
    const pcx = Math.round((P.x0 + P.x1) / 2), pcy = Math.round((P.y0 + P.y1) / 2);
    let y = P.y0 - 1; while (y >= 0 && !m[y * w + pcx]) y--; gapTop = P.y0 - 1 - y;
    let ly = y; while (ly >= 0 && m[ly * w + pcx]) ly--; lidTop = y - ly;           // ink thickness of the lid above the white
    let x = P.x1 + 1; while (x < w && !m[pcy * w + x]) x++; gapSide = x - P.x1 - 1;
  }
  return { comps: comps.length, holes, pupil: P ? [P.x1 - P.x0 + 1, P.y1 - P.y0 + 1] : null,
           pupilAsp: P ? +((P.x1 - P.x0 + 1) / (P.y1 - P.y0 + 1)).toFixed(3) : null, gapTop, gapSide,
           evenRing: (gapTop > 0) ? +(gapSide / gapTop).toFixed(2) : null, lidTop,
           ink: +(comps.reduce((s, b) => s + b.n, 0) / N).toFixed(3) };
}
