// #1068 B5 - the shallow-angle dots in a Smooth Long Shadow, measured on the KERNEL alone (no browser, no app runtime).
// It reads the longshadow kernel's source out of a compositor.js, runs it on a plain Uint8ClampedArray and prints numbers.
//
//   node tools/design/plans/1068-b5/measure-shallow.js js/compositor.js
//   node tools/design/plans/1068-b5/measure-shallow.js <(git show bf1d95a5:js/compositor.js) js/compositor.js
//
// Each file given is measured in turn, so the second line prints before and after. Nothing is written to disk.
// Written 17 Oct while a ship was running and NOT RUN then; the numbers in NOTES.md are owed from its first run.
'use strict';
const fs = require('fs');

/* ── the kernel, cut out of the file by brace matching (comments and strings skipped) ── */
function kernelFrom(path) {
  const text = fs.readFileSync(path, 'utf8'), key = 'longshadow: function(d,W,H,p,t){', at = text.indexOf(key);
  if (at < 0) throw new Error(path + ': no longshadow kernel');
  const start = at + 'longshadow: '.length;
  let depth = 0;
  for (let i = at + key.length - 1; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1];
    if (ch === '/' && nx === '*') { i = text.indexOf('*/', i + 2) + 1; continue; }
    if (ch === '/' && nx === '/') { i = text.indexOf('\n', i); continue; }
    if (ch === '\'' || ch === '"' || ch === '`') { let j = i + 1; while (text[j] !== ch) { if (text[j] === '\\') j++; j++; } i = j; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return build(text.slice(start, i + 1)); }
  }
  throw new Error(path + ': the longshadow kernel never closes');
}
function build(src) {
  const FM = { evalProp: v => (typeof v === 'number' ? v : +v) };
  const fparam = (p, key, def, t) => (p[key] == null ? def : FM.evalProp(p[key], t));
  const hexToRGB = h => { h = String(h || '#000000').replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]; };
  const fxSrc = d => d.slice();
  return new Function('fparam', 'hexToRGB', 'fxSrc', 'FM', 'return (' + src + ');')(fparam, hexToRGB, fxSrc, FM);
}

/* ── the plate, built in the THROW'S FRAME: i runs along the throw's faster axis, j across it, both in the throw's direction.
      The same box sits at the same frame place for every angle, so all four quadrants read alike. (Same as the test.) ── */
const O = { NM: 200, Nm: 120, i0: 20, i1: 59, j0: 20, j1: 59, len: 120 };
function frame(K, a, edges, o) {
  o = o || O;
  const vx = Math.cos(a * Math.PI / 180), vy = Math.sin(a * Math.PI / 180), xm = Math.abs(vx) >= Math.abs(vy);
  const W = xm ? o.NM : o.Nm, H = xm ? o.Nm : o.NM;
  const at = (i, j) => { const u = (xm ? vx : vy) >= 0 ? i : o.NM - 1 - i, w = (xm ? vy : vx) >= 0 ? j : o.Nm - 1 - j; return xm ? w * W + u : u * W + w; };
  const d = new Uint8ClampedArray(W * H * 4);
  for (let i = o.i0; i <= o.i1; i++) for (let j = o.j0; j <= o.j1; j++) d[at(i, j) * 4 + 3] = 255;
  const t0 = process.hrtime.bigint();
  K(d, W, H, { angle: a, length: o.len, color: '#000000', edges: edges }, 0);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { s: xm ? Math.abs(vy / vx) : Math.abs(vx / vy), A: (i, j) => d[at(i, j) * 4 + 3], ms: ms };
}
/* the "truth" for one frame pixel: the march averaged over KS heights inside the pixel (the kernel's own rounding) */
function truth(i, j, s, o, KS) {
  let hit = 0;
  for (let k = 0; k < KS; k++) {
    const y = j - 0.5 + (k + 0.5) / KS;
    for (let dd = 1; dd <= o.len && i - dd >= 0; dd++) {
      const r = Math.floor(y - s * dd + 0.5), c = i - dd;
      if (c >= o.i0 && c <= o.i1 && r >= o.j0 && r <= o.j1) { hit++; break; }
    }
  }
  return Math.round(255 * hit / KS);
}
function stats(v) {
  let lo = 255, hi = 0, step = 0, flips = 0, last = 0;
  for (let k = 0; k < v.length; k++) {
    if (v[k] < lo) lo = v[k]; if (v[k] > hi) hi = v[k];
    if (k) { const dv = v[k] - v[k - 1]; if (Math.abs(dv) > step) step = Math.abs(dv); if (dv) { if (last && Math.sign(dv) !== last) flips++; last = Math.sign(dv); } }
  }
  return { lo: lo, hi: hi, spread: hi - lo, step: step, flips: flips };
}
const fmt = st => st.lo + '..' + st.hi + ' (spread ' + st.spread + ', max step ' + st.step + ', flips ' + st.flips + ')';

function measure(K, a, edges) {
  const f = frame(K, a, edges), o = O, s = f.s;
  const c = o.j1 + 0.5 + s * o.len, jc = Math.floor(c + 0.5), want = Math.round(255 * (c - jc + 0.5));
  const span = []; for (let i = o.i0 + o.len + 2; i <= o.i1 + o.len - 2; i++) span.push(i);
  const rows = {}; let truthErr = 0;
  for (let j = jc - 2; j <= jc + 2; j++) {
    rows[j] = span.map(i => f.A(i, j));
    span.forEach(i => { const e = Math.abs(f.A(i, j) - truth(i, j, s, o, 64)); if (e > truthErr) truthErr = e; });
  }
  const lit = []; for (let i = 0; i < o.NM; i++) lit.push(f.A(i, o.j0 - 1));
  const face = lit.slice(o.i0, o.i1 + 1), wedge = lit.slice(o.i1 + 1, o.i1 + 8);
  let litTruthErr = 0; for (let i = 0; i < o.NM; i++) { const e = Math.abs(lit[i] - truth(i, o.j0 - 1, s, o, 64)); if (e > litTruthErr) litTruthErr = e; }
  let past = 0; for (let j = 0; j < o.j0 - 1; j++) for (let i = 0; i < o.NM; i++) if (f.A(i, j)) past++;
  let side = 0, sidePast = 0; for (let j = 0; j < o.Nm; j++) { side = Math.max(side, f.A(o.i0 - 1, j)); for (let i = 0; i < o.i0 - 1; i++) if (f.A(i, j)) sidePast++; }
  return { f: f, c: c, jc: jc, want: want, rows: rows, truthErr: truthErr, lit: lit, face: stats(face), wedge: Math.max.apply(null, wedge), litNZ: lit.filter(v => v).length, litTruthErr: litTruthErr, past: past, side: side, sidePast: sidePast };
}

/* the right-angle parity of the existing test (its b5ShadowPlate): Smooth must equal Hard, byte for byte */
function parity(K) {
  const W = 96, H = 72, plate = () => { const d = new Uint8ClampedArray(W * H * 4); for (let y = 24; y < 40; y++) for (let x = 30; x < 50; x++) d[(y * W + x) * 4 + 3] = 255; for (let i = 0; i < 10; i++) d[((10 + i) * W + 60 + i) * 4 + 3] = 90; return d; };
  return [0, 90, 135, 180, 225, 270, 315].map(a => {
    const h = plate(), m = plate(); K(h, W, H, { angle: a, length: 40, color: '#2255aa', edges: 0 }, 0); K(m, W, H, { angle: a, length: 40, color: '#2255aa', edges: 1 }, 0);
    let at = -1; for (let i = 0; i < h.length; i++) if (h[i] !== m[i]) { at = i; break; }
    return a + ':' + (at < 0 ? 'same' : 'DIFF@' + ((at >> 2) % W) + ',' + Math.floor((at >> 2) / W));
  }).join('  ');
}
/* how long one Smooth shadow takes on his project size: 1080 x 1920, a 400 x 300 box, 8 degrees, Length 300 */
function timing(K) {
  const W = 1080, H = 1920, d = new Uint8ClampedArray(W * H * 4);
  for (let y = 800; y < 1100; y++) for (let x = 300; x < 700; x++) d[(y * W + x) * 4 + 3] = 255;
  const t0 = process.hrtime.bigint(); K(d, W, H, { angle: 8, length: 300, color: '#000000', edges: 1 }, 0);
  return (Number(process.hrtime.bigint() - t0) / 1e6).toFixed(1) + ' ms';
}

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node measure-shallow.js <compositor.js> [<compositor.js> ...]'); process.exit(2); }
for (const path of files) {
  const K = kernelFrom(path);
  console.log('\n=== ' + path + ' ===');
  console.log('right angles and diagonals, Smooth vs Hard on the test plate: ' + parity(K));
  for (const base of [5, 8, 10, 23]) {
    const fam = [base, 180 - base, 180 + base, 360 - base, 90 - base, 90 + base, 270 - base, 270 + base];
    for (const a of fam) {
      const m = measure(K, a, 1), h = measure(K, a, 0);
      const endRow = stats(m.rows[m.jc]), hardEnd = Math.max.apply(null, [-2, -1, 0, 1, 2].map(k => stats(h.rows[h.jc + k]).spread));
      let bandWorst = 0; for (let k = -2; k <= 2; k++) bandWorst = Math.max(bandWorst, stats(m.rows[m.jc + k]).spread);
      console.log(('   ' + a).slice(-3) + 'deg slope ' + m.f.s.toFixed(4) + ' | END row ' + m.jc + ' (exact ' + m.want + '): ' + fmt(endRow) +
        '; worst band spread ' + bandWorst + '; off the averaged march by ' + m.truthErr + '; Hard band spread ' + hardEnd +
        ' | LIT face ' + fmt(m.face) + ', corner wedge ' + m.wedge + ', non-zero on the line ' + m.litNZ + ', off truth ' + m.litTruthErr +
        ', beyond ' + m.past + ' | lit side ' + m.side + ', beyond ' + m.sidePast + ' | ' + m.f.ms.toFixed(2) + ' ms');
      if (a === base) console.log('      end row values: ' + m.rows[m.jc].join(' ') + '\n      lit line values (face): ' + m.lit.slice(O.i0, O.i1 + 8).join(' '));
    }
  }
  console.log('timing, Smooth, 1080x1920, 8 deg, Length 300: ' + timing(K));
}
