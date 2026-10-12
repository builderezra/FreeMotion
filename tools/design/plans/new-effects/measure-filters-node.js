#!/usr/bin/env node
/* measure-filters-node.js — check and measure the candidate filters in filter-candidates.js WITHOUT a browser.
 *
 *   node tools/design/plans/new-effects/measure-filters-node.js                    # checks + the #675 flat-swatch table
 *   python3 tools/design/plans/new-effects/decode-photos.py /tmp/fm-photos 200     # (once) the fx-art photos as raw RGBA
 *   node tools/design/plans/new-effects/measure-filters-node.js --photos /tmp/fm-photos [--write]
 *
 * It loads the app's own js (scene, compositor, gl-color, fx-registry, filters, storage) into a vm with DOM stubs and runs the
 * REAL per-pixel kernels (FM._applyPixelFx — the same PIXEL_FX table a layer uses) on typed arrays. What a vm cannot run is
 * redone here, from the compositor's own code and named so nobody mistakes it for the browser:
 *   · the nine CSS-filter effects: the app's own colour matrices (FM._glColorMatrix, js/gl-color.js — the GPU fallback's
 *     arithmetic, which is the spec's), applied first and clamped after each one, as ctx.filter does;
 *   · Vignette (a CANVAS_FX gradient): its default path, the radial ramp from Size to the half-diagonal, applied right after the
 *     CSS effects (compositor postFxOrder: "vignette composites innermost"); a non-default Roundness/Feather/Centre/Mode refuses;
 *   · Halation (CANVAS_FX): the quarter-res mask and its two blurs as three-pass box blurs — an approximation, flagged;
 *   · Pixelate (drawPixelate, a canvas downscale): one sample per block — exact on the flat swatch, approximate on a photo.
 * Anything else that is not per-pixel is SKIPPED and printed, never silently treated as "no change".
 *
 * WHAT IT MEASURES
 *   1. Every candidate builds: real types, real keys, in range (nothing clamped by filters.js saneChild), valid options, CSS
 *      effects first, Tuff carries flashdark, FM.filters.makeInstance keeps every child, fitToLayer keeps them on an image.
 *   2. #675's distance (tests/tests.js '#675: every added filter sits somewhere the existing set does not'): a 200x200 #c05030
 *      frame at t=1, mean luma and mean colour spread in the centre box 70..129, dist = hypot(Δmean, Δcolour × 0.6). A candidate
 *      must sit > 10 from EVERY existing filter and from every other candidate, and ≥ 8 from the untouched frame.
 *   3. #858 (every ingredient changes the picture): each child alone on the test's 96x96 gradient fixture; < 0.05 is dead,
 *      < 0.3 weak.
 *   4. #579 for a Black / White candidate: colour spread ≤ 4 over the frame, centre mean ≥ 8 from every other mono filter.
 *   5. (--photos) The same render on the candidate's own fx-art photo against all 56 existing filters: mean |Δ| per channel.
 *      The three nearest are the ones the render probe shows beside it. --write puts both tables and those three into
 *      filter-candidates.js (between the DISTANCES and COMPARE markers).
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(opt('--root', path.join(__dirname, '..', '..', '..', '..')));
const PHOTOS = opt('--photos', null);
const PSZ = +opt('--photo-size', 200);
const DATA_FILE = path.resolve(opt('--data', path.join(__dirname, 'filter-candidates.js')));
const WRITE = args.indexOf('--write') >= 0;
const DATA = require(DATA_FILE);

/* ---- the app in a vm (the node harness the polish batches used, plus gl-color.js) ---------------------------------------- */
function loadApp(root) {
  const noop = function () {};
  const grad = () => ({ addColorStop: noop });
  const fakeCtx = () => new Proxy({}, { get(t, k) {
    if (k === 'canvas') return fakeEl();
    if (k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createConicGradient') return grad;
    if (k === 'createPattern') return () => ({});
    if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
    if (k === 'measureText') return () => ({ width: 0 });
    return noop; }, set() { return true; } });
  const fakeEl = () => new Proxy(function () {}, {
    get(t, k) {
      if (k === 'style' || k === 'dataset' || k === 'classList') return new Proxy({}, { get: () => noop, set: () => true });
      if (k === 'getContext') return () => fakeCtx();
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'addEventListener' || k === 'removeEventListener' || k === 'appendChild' || k === 'setAttribute') return noop;
      return undefined;
    },
    set() { return true; },
  });
  const document = { createElement: () => fakeEl(), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener: noop, removeEventListener: noop, body: fakeEl(), documentElement: fakeEl(), head: fakeEl(), createElementNS: () => fakeEl() };
  const win = { FM: {}, document, navigator: { userAgent: 'node', platform: 'Linux', hardwareConcurrency: 4 },
    addEventListener: noop, removeEventListener: noop, setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: noop, performance: { now: () => Date.now() }, location: { search: '', href: '', hostname: 'localhost' },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop }, matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
    devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800, console,
    Uint8ClampedArray, Float32Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Uint16Array, Int16Array, Int8Array,
    Math, JSON, Date, Object, Array, Number, String, Boolean, RegExp, Error, Map, Set, WeakMap, WeakSet, Symbol, Promise, Proxy, Reflect,
    OffscreenCanvas: undefined, ImageData: function (d, w, h) { this.data = d; this.width = w; this.height = h; },
    HTMLCanvasElement: function () {}, HTMLVideoElement: function () {}, HTMLImageElement: function () {}, Image: function () {},
    URLSearchParams, isFinite, isNaN, parseFloat, parseInt };
  win.window = win; win.self = win; win.globalThis = win; win.top = win;
  const ctx = vm.createContext(win);
  ['js/scene.js', 'js/eases.js', 'js/blend-modes.js', 'js/gl-color.js', 'js/compositor.js', 'js/fx-registry.js', 'js/filters.js', 'js/storage.js'].forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  });
  return win.FM;
}
const FM = loadApp(ROOT);
const reg = FM.fxRegistry, CSS = FM.CSS_FX, TAB = FM._FX_TABLES, PIX = TAB.PIXEL_FX;
for (const need of ['_applyPixelFx', '_glColorMatrix', '_fillFxParams', 'FILTERS', 'filters']) if (!FM[need]) throw new Error('the app in the vm has no FM.' + need + ' — the harness is not loading what this script needs');
const APPLY_EXTRA = { rgbsplit: 1, posterize: 1, threshold: 1, tint: 1, duotone: 1 };   // applyPixelFx's non-PIXEL_FX branches
const EXISTING = FM.FILTERS.slice();
const SECTION_KEYS = FM.filters.sections().map(s => s.key).concat(['mono', 'vivid', 'tuff', 'cinematic', 'retro', 'glow', 'stylised']);

/* ---- the render ----------------------------------------------------------------------------------------------------------- */
const num = (v, d) => { const x = v == null ? d : Number(FM.evalProp(v, 0)); return Number.isFinite(x) ? x : d; };
const clamp01 = x => x < 0 ? 0 : (x > 1 ? 1 : x);
const hexRGB = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return [0, 0, 0]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const skipped = new Set();

function cssStage(d, fx) {
  const ops = [];
  for (const e of fx) {
    if (!CSS[e.type] || e.type === 'blur' || e.type === 'glow') { if (e.type === 'blur') skipped.add('blur (CSS, spatial)'); continue; }
    const p = e.params || {};
    const v = e.type === 'hue' ? num(p.deg, 0) : Math.max(0, num(p.amount, 1));   // effectFilter: nn('amount', 1), v('deg', 0)
    const M = FM._glColorMatrix(e.type, v);
    if (M) ops.push(M);
  }
  if (!ops.length) return;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    for (const M of ops) {
      const m = M.m, o = M.o;
      const r2 = m[0] * r + m[1] * g + m[2] * b + o[0], g2 = m[3] * r + m[4] * g + m[5] * b + o[1], b2 = m[6] * r + m[7] * g + m[8] * b + o[2];
      r = clamp01(r2); g = clamp01(g2); b = clamp01(b2);
    }
    d[i] = Math.round(r * 255); d[i + 1] = Math.round(g * 255); d[i + 2] = Math.round(b * 255);
  }
}
function vignette(d, W, H, p) {
  if (FM._vignette6 && FM._vignette6(p, 0)) throw new Error('vignette with a non-default Roundness/Feather/Centre/Mode/Protect — not modelled here');
  const a = clamp01(num(p.amount, 0.6)); if (a <= 0) return;
  const vgIn = Math.max(0, Math.min(0.98, num(p.size, 35) / 100));
  const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2, r0 = R * vgIn;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let k = (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r0) / (R - r0); k = k < 0 ? 0 : (k > 1 ? 1 : k);
    const f = 1 - k * a, i = (y * W + x) * 4;
    d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
  }
}
function boxBlur3(src, w, h, sigma) {   // three box passes ≈ a gaussian of this sigma (CSS blur(σ px))
  if (!(sigma > 0.3)) return src.slice();
  const bw = Math.max(1, Math.round(Math.sqrt(12 * sigma * sigma / 3 + 1))), r = bw >> 1;
  let a = Float32Array.from(src), b = new Float32Array(a.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += a[y * w + xx]; n++; } } b[y * w + x] = s / (2 * r + 1) * (n ? 1 : 0); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) s += b[yy * w + x]; } a[y * w + x] = s / (2 * r + 1); }
  }
  return a;
}
function halation(d, W, H, p) {   // CANVAS_FX.halation, approximately (see the header)
  const amount = Math.max(0, num(p.amount, 0.8)); if (amount <= 0.001) return;
  const thr = clamp01(num(p.threshold, 0.68)), tight = clamp01(num(p.tightness, 0.5)), spread = Math.max(0.5, num(p.spread, 5)), knee = Math.max(1, num(p.knee, 2.4));
  const rgb = hexRGB(p.color || '#ff3a14'), qw = Math.max(1, Math.round(W / 4)), qh = Math.max(1, Math.round(H / 4)), span = 1 - thr;
  const m = new Float32Array(qw * qh);
  for (let y = 0; y < qh; y++) for (let x = 0; x < qw; x++) {
    let s = 0, n = 0;
    for (let yy = Math.floor(y * H / qh); yy < Math.floor((y + 1) * H / qh); yy++) for (let xx = Math.floor(x * W / qw); xx < Math.floor((x + 1) * W / qw); xx++) { const i = (yy * W + xx) * 4; s += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255 * (d[i + 3] / 255); n++; }
    const l = n ? s / n : 0; let e = span <= 0 ? (l >= 1 ? 1 : 0) : (l - thr) / span; e = e <= 0 ? 0 : (e >= 1 ? 1 : Math.pow(e, knee));
    m[y * qw + x] = e;
  }
  const minD = Math.min(W, H), rWide = Math.max(0.5, minD * spread / 100), rCore = Math.max(0.4, rWide * (0.06 + 0.24 * (1 - tight)));
  const core = boxBlur3(m, qw, qh, rCore / 4), wide = boxBlur3(m, qw, qh, rWide / 4), aC = Math.min(1, amount * 0.65), aW = Math.min(1, amount * 0.35);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const q = Math.min(qh - 1, (y * qh / H) | 0) * qw + Math.min(qw - 1, (x * qw / W) | 0), k = core[q] * aC + wide[q] * aW, i = (y * W + x) * 4;
    d[i] += rgb[0] * k; d[i + 1] += rgb[1] * k; d[i + 2] += rgb[2] * k;
  }
}
function pixelate(d, W, H, p) {
  const size = Math.max(1, num(p.size, 12)); if (size <= 1) return;
  const nX = Math.max(1, Math.round(W / size)), nY = Math.max(1, Math.round(H / size)), bw = W / nX, bh = H / nY, s = d.slice();
  for (let by = 0; by < nY; by++) for (let bx = 0; bx < nX; bx++) {
    const sx = Math.min(W - 1, Math.floor((bx + 0.5) * bw)), sy = Math.min(H - 1, Math.floor((by + 0.5) * bh)), si = (sy * W + sx) * 4;
    for (let y = Math.floor(by * bh); y < Math.min(H, Math.floor((by + 1) * bh)); y++) for (let x = Math.floor(bx * bw); x < Math.min(W, Math.floor((bx + 1) * bw)); x++) {
      const i = (y * W + x) * 4; d[i] = s[si]; d[i + 1] = s[si + 1]; d[i + 2] = s[si + 2];
    }
  }
}
function filled(e) { const fx = { type: e.type, enabled: true, params: JSON.parse(JSON.stringify(e.params || {})) }; FM._fillFxParams(fx); return fx; }
/* One layer's effects over a buffer, in the order compositor.js applies them: CSS first, then vignettes, then the rest in row order. */
function render(src, W, H, effects, t) {
  const d = new Uint8ClampedArray(src), fx = effects.filter(e => e && e.enabled !== false);
  cssStage(d, fx);
  const post = fx.filter(e => !CSS[e.type]);
  for (const e of post.filter(x => x.type === 'vignette').concat(post.filter(x => x.type !== 'vignette'))) {
    const f = filled(e);
    if (e.type === 'vignette') vignette(d, W, H, f.params);
    else if (e.type === 'halation') halation(d, W, H, f.params);
    else if (e.type === 'pixelate') pixelate(d, W, H, f.params);
    else if (PIX[e.type] || APPLY_EXTRA[e.type]) FM._applyPixelFx(d, f, t, W, H, 1);
    else skipped.add(e.type);
  }
  return d;
}

/* ---- fixtures ------------------------------------------------------------------------------------------------------------- */
function flat(W, H, rgb) { const d = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < d.length; i += 4) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; } return d; }
function fixture858() {   // tests.js queue 858: a diagonal gradient, a white highlight, a green band — 96 x 96
  const S = 96, d = new Uint8ClampedArray(S * S * 4);
  const stops = [[0, '#fdf6d8'], [0.45, '#e07a3a'], [0.8, '#2a3550'], [1, '#05070c']].map(s => [s[0], hexRGB(s[1])]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const t = (x + 0.5 + y + 0.5) / (2 * S); let k = 0; while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const a = stops[k], b = stops[k + 1], f = clamp01((t - a[0]) / (b[0] - a[0])), i = (y * S + x) * 4;
    for (let c = 0; c < 3; c++) d[i + c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
    d[i + 3] = 255;
    if (Math.hypot(x + 0.5 - S * 0.3, y + 0.5 - S * 0.28) < S * 0.11) { d[i] = d[i + 1] = d[i + 2] = 255; }
    if (y + 0.5 >= S * 0.72 && y + 0.5 < S * 0.82) { d[i] = 0x1b; d[i + 1] = 0x6f; d[i + 2] = 0x4a; }
  }
  return { d: d, S: S };
}
function stats675(d, W) {   // the centre box 70..129 of a 200 frame
  let n = 0, sum = 0, sp = 0;
  for (let y = 70; y < 130; y++) for (let x = 70; x < 130; x++) {
    const o = (y * W + x) * 4, r = d[o], g = d[o + 1], b = d[o + 2];
    sum += r * 0.299 + g * 0.587 + b * 0.114; sp += Math.max(r, g, b) - Math.min(r, g, b); n++;
  }
  return { mean: sum / n, colour: sp / n };
}
function spreadAll(d) { let sp = 0, n = 0; for (let i = 0; i < d.length; i += 4) { sp += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]); n++; } return sp / n; }
const dist675 = (a, b) => Math.hypot(a.mean - b.mean, (a.colour - b.colour) * 0.6);
function meanAbs(a, b) { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) / 3; }

/* ---- 1. does each candidate build? ----------------------------------------------------------------------------------------- */
const LABELS = new Set(reg.all().map(d => String(d.label || '').toLowerCase()));
const NAMES = new Set(EXISTING.map(f => f.name.toLowerCase()).concat(EXISTING.map(f => f.id)));
const TAKEN = new Set((DATA.TAKEN_912 || []).map(s => s.toLowerCase()));
function check(c) {
  const errs = [], warns = [];
  if (SECTION_KEYS.indexOf(c.section) < 0) errs.push('no section "' + c.section + '"');
  if (NAMES.has(c.name.toLowerCase()) || NAMES.has(c.id)) errs.push('name/id already a filter');
  if (TAKEN.has(c.name.toLowerCase())) errs.push('name is one of #912\'s ten');
  if (LABELS.has(c.name.toLowerCase())) warns.push('same name as an effect');
  let nonCss = false;
  c.effects.forEach(e => {
    const r = reg.get(e.type);
    if (!r || r.type !== e.type) { errs.push('no effect "' + e.type + '"'); return; }
    if (CSS[e.type]) { if (nonCss) errs.push(e.type + ' is a CSS effect listed after a non-CSS one (filters.js rule 1)'); } else nonCss = true;
    const schema = reg.paramsOf(e.type) || [];
    Object.keys(e.params || {}).forEach(k => {
      const pd = schema.filter(q => q && q.key === k)[0], v = e.params[k];
      if (!pd) { errs.push(e.type + '.' + k + ' is not a control'); return; }
      if (pd.options) { if (!pd.options.some(o => o[0] === v)) errs.push(e.type + '.' + k + ' = ' + v + ' is not one of its options'); }
      else if (typeof v === 'number') { if ((Number.isFinite(pd.min) && v < pd.min) || (Number.isFinite(pd.max) && v > pd.max)) errs.push(e.type + '.' + k + ' = ' + v + ' is outside ' + pd.min + '..' + pd.max); }
      else if (typeof v === 'string') { if (!/^#[0-9a-f]{6}$/i.test(v)) errs.push(e.type + '.' + k + ' = "' + v + '" is not a #rrggbb colour'); }
    });
  });
  if (c.section === 'tuff' && !c.effects.some(e => e.type === 'flashdark')) errs.push('a Tuff look without flashdark');
  FM.FILTERS.push({ id: c.id, name: c.name, section: c.section, desc: c.desc, effects: c.effects });
  let box = null;
  try { box = FM.filters.makeInstance(c.id); } finally { FM.FILTERS.pop(); }
  if (!box) errs.push('FM.filters.makeInstance returned null');
  else {
    if (box.effects.length !== c.effects.length) errs.push('makeInstance kept ' + box.effects.length + ' of ' + c.effects.length + ' children');
    box.effects.forEach((k, i) => { const want = c.effects[i] && c.effects[i].params; if (want) Object.keys(want).forEach(key => { if (JSON.stringify(k.params[key]) !== JSON.stringify(want[key])) errs.push(k.type + '.' + key + ' became ' + JSON.stringify(k.params[key]) + ' in makeInstance'); }); });
    const fit = reg.fitToLayer(box, { type: 'image', effects: [] });
    if (!fit || fit.effects.length !== box.effects.length) errs.push('fitToLayer on an image layer keeps ' + (fit ? fit.effects.length : 0) + ' of ' + box.effects.length);
  }
  return { errs: errs, warns: warns, box: box };
}

/* ---- run ------------------------------------------------------------------------------------------------------------------ */
const W = 200, SW = flat(W, W, [0xc0, 0x50, 0x30]);
const flatOf = effects => stats675(render(SW, W, W, effects, 1), W);
const plain = flatOf([]);
const exist675 = EXISTING.map(f => Object.assign({ id: f.id, name: f.name, section: f.section }, flatOf(f.effects)));
const fx858 = fixture858();
// required rather than run (a parameter scan, the probe's self-check): hand over the machinery, print nothing
if (require.main !== module) {
  module.exports = { FM: FM, render: render, flatOf: flatOf, plain: plain, exist675: exist675, dist675: dist675, stats675: stats675, check: check,
    fixture858: fixture858, meanAbs: meanAbs, spreadAll: spreadAll, flat: flat, EXISTING: EXISTING, SW: SW, W: W, skipped: skipped };
  return;
}
/* A CONTROL FOR THE BUILD CHECK: a definition with five known faults must be refused five ways, or the "builds" verdicts below are
   the checker's blindness rather than the candidates' health. */
{
  const bad = check({ id: '_ctl', name: 'Teal & Orange', section: 'nosuch', desc: '', effects: [
    { type: 'contrast', params: { amount: 9 } }, { type: 'nosuch', params: {} }, { type: 'vignette', params: { amount: 0.3 } }, { type: 'saturate', params: { amount: 1.2 } }] });
  const want = ['no section', 'already a filter', 'outside', 'no effect', 'CSS effect listed after'];
  const missed = want.filter(w => !bad.errs.some(x => x.indexOf(w) >= 0));
  if (missed.length) { console.log('THE BUILD CHECK IS BLIND — its control was not refused for: ' + missed.join(', ')); process.exit(2); }
}
const ALL = DATA.CANDIDATES.map(c => Object.assign({ reserve: false }, c)).concat((DATA.RESERVES || []).map(c => Object.assign({ reserve: true }, c)));
const out = [];
for (const c of ALL) {
  const r = { id: c.id, name: c.name, section: c.section, reserve: c.reserve, subject: c.subject };
  const ck = check(c); r.errs = ck.errs; r.warns = ck.warns;
  const s = flatOf(c.effects); r.mean = s.mean; r.colour = s.colour; r.plain = dist675(s, plain);
  r.near = exist675.map(x => ({ id: x.id, name: x.name, d: dist675(s, x) })).sort((a, b) => a.d - b.d).slice(0, 3);
  r.ingredients = (ck.box ? ck.box.effects : []).map(kid => ({ type: kid.type, d: meanAbs(fx858.d, render(fx858.d, fx858.S, fx858.S, [JSON.parse(JSON.stringify(kid))], 0.001)) }));
  r.whole858 = ck.box ? meanAbs(fx858.d, render(fx858.d, fx858.S, fx858.S, JSON.parse(JSON.stringify(ck.box.effects)), 0.001)) : 0;
  if (c.section === 'mono') r.spreadAll = spreadAll(render(SW, W, W, c.effects, 1));
  out.push(r);
}
for (const r of out) {   // candidate vs candidate (reserves included, so a swap is pre-measured)
  r.peer = out.filter(o => o !== r).map(o => ({ id: o.id, d: dist675(r, o) })).sort((a, b) => a.d - b.d)[0];
}
// #579 for the Black / White ones: against the existing mono set and the other mono candidates
const monoNow = exist675.filter(x => x.section === 'mono');
for (const r of out.filter(o => o.section === 'mono')) {
  const others = monoNow.map(x => ({ id: x.id, mean: x.mean })).concat(out.filter(o => o !== r && o.section === 'mono').map(o => ({ id: o.id, mean: o.mean })));
  r.monoNear = others.map(o => ({ id: o.id, d: Math.abs(o.mean - r.mean) })).sort((a, b) => a.d - b.d)[0];
}

/* ---- 5. on the photographs ------------------------------------------------------------------------------------------------ */
if (PHOTOS) {
  const cache = {};
  const photo = key => { const f = path.join(PHOTOS, key + '.rgba'); const b = fs.readFileSync(f); if (b.length !== PSZ * PSZ * 4) throw new Error(f + ' is not ' + PSZ + 'px — pass --photo-size'); return new Uint8ClampedArray(b.buffer, b.byteOffset, b.length); };
  for (const r of out) {
    const c = ALL.filter(x => x.id === r.id)[0], key = c.subject, src = photo(key);
    if (!cache[key]) cache[key] = EXISTING.map(f => ({ id: f.id, name: f.name, px: render(src, PSZ, PSZ, f.effects, 0.001) }));
    const mine = render(src, PSZ, PSZ, c.effects, 0.001);
    r.photoPlain = meanAbs(src, mine);
    r.photoNear = cache[key].map(x => ({ id: x.id, name: x.name, d: meanAbs(mine, x.px) })).sort((a, b) => a.d - b.d).slice(0, 3);
  }
}

/* ---- report --------------------------------------------------------------------------------------------------------------- */
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2);
const lines = [];
lines.push('Measured by measure-filters-node.js on ' + new Date().toISOString().slice(0, 10) + ' against ' + EXISTING.length + ' library filters' + (PHOTOS ? ', photos at ' + PSZ + ' px' : '') + '.');
lines.push('#675 flat swatch (#c05030, t=1, centre box): the untouched frame is mean ' + f1(plain.mean) + ' / colour ' + f1(plain.colour) + '. Pass = nearest existing > 10, nearest other candidate > 10, from the untouched frame >= 8.');
lines.push('');
lines.push('id            mean  colour  plain | nearest existing (675)                         | nearest candidate | 858 weakest ingredient | ' + (PHOTOS ? 'photo: nearest existing (mean |delta|)' : ''));
for (const r of out) {
  const weakest = r.ingredients.slice().sort((a, b) => a.d - b.d)[0];
  const pass = !r.errs.length && r.near[0].d > 10 && r.peer.d > 10 && r.plain >= 8 && weakest && weakest.d >= 0.05 && (r.section !== 'mono' || (r.spreadAll <= 4 && r.monoNear.d >= 8));
  r.pass = pass;
  lines.push((r.reserve ? '(' + r.id + ')' : r.id).padEnd(13) + ' ' + f1(r.mean).padStart(5) + ' ' + f1(r.colour).padStart(6) + ' ' + f1(r.plain).padStart(6) + ' | ' +
    r.near.map(n => n.name + ' ' + f1(n.d)).join(', ').padEnd(47) + ' | ' + (r.peer.id + ' ' + f1(r.peer.d)).padEnd(17) + ' | ' +
    (weakest ? (weakest.type + ' ' + f2(weakest.d)) : '-').padEnd(22) + ' | ' +
    (r.photoNear ? r.subject + ': ' + r.photoNear.map(n => n.name + ' ' + f1(n.d)).join(', ') + ' (vs as-shot ' + f1(r.photoPlain) + ')' : '') +
    (r.section === 'mono' ? '  [579: spread ' + f1(r.spreadAll) + ', nearest mono ' + r.monoNear.id + ' ' + f1(r.monoNear.d) + ']' : '') +
    (pass ? '  PASS' : '  FAIL') + (r.errs.length ? '  ERRORS: ' + r.errs.join('; ') : '') + (r.warns.length ? '  warn: ' + r.warns.join('; ') : ''));
}
if (skipped.size) lines.push('', 'NOT MODELLED (left unchanged in these numbers): ' + Array.from(skipped).join(', '));
/* A CONTROL: browser-measured numbers the codebase already records (tests/tests.js #675 and #579 comments, filters.js), beside
   what this model gives for the same pairs. If these disagree, every number above is the tool's, not the filters'. */
const byId = id => exist675.filter(x => x.id === id)[0];
const ctl = [['crossproc', 'super8', 1.5], ['poppy', 'sunbaked', 3.3], ['poster', 'silver', 2.3], ['lowkey', 'thermal', 18.0]];
lines.push('', 'CONTROL (browser-measured in the codebase -> this model): ' + ctl.map(c => byId(c[0]).name + '/' + byId(c[1]).name + ' ' + c[2] + ' -> ' + f1(dist675(byId(c[0]), byId(c[1])))).join(', ') +
  '; the five #675 additions vs the 33 then (all must be > 10): ' + ['midnight', 'ultraviolet', 'matte', 'ember', 'copperplate'].map(id => {
    const THEN = EXISTING.slice(0, EXISTING.findIndex(f => f.id === 'ash') + 1).map(f => f.id);
    const a = byId(id); return a.name + ' ' + f1(Math.min.apply(null, exist675.filter(x => THEN.indexOf(x.id) >= 0).map(x => dist675(a, x))));
  }).join(', '));
if (args.indexOf('--existing') >= 0) {
  lines.push('', 'THE LIBRARY ON THE SWATCH (mean / colour), darkest first:');
  exist675.slice().sort((a, b) => a.mean - b.mean).forEach(x => lines.push('  ' + x.name.padEnd(16) + ' ' + x.section.padEnd(10) + f1(x.mean).padStart(6) + f1(x.colour).padStart(7)));
}
console.log(lines.join('\n'));
fs.writeFileSync(path.join(process.env.MEASURE_OUT || require('os').tmpdir(), 'fm-new-filters-measure.json'), JSON.stringify({ plain: plain, existing: exist675, candidates: out }, null, 1));

if (WRITE) {
  let src = fs.readFileSync(DATA_FILE, 'utf8');
  const table = '/* DISTANCES:BEGIN (written by measure-filters-node.js --write; do not edit by hand)\n' + lines.map(l => ' * ' + l).join('\n').replace(/\*\//g, '* /') + '\n * DISTANCES:END */';
  src = src.replace(/\/\* DISTANCES:BEGIN[\s\S]*?DISTANCES:END \*\//, table);
  if (PHOTOS) {
    const cmp = {}; out.forEach(r => { cmp[r.id] = r.photoNear.map(n => n.id); });
    src = src.replace(/\/\* COMPARE:BEGIN \*\/[\s\S]*?\/\* COMPARE:END \*\//, '/* COMPARE:BEGIN */ ' + JSON.stringify(cmp).replace(/,"/g, ', "') + ' /* COMPARE:END */');
  }
  fs.writeFileSync(DATA_FILE, src);
  console.log('\nwrote the tables into ' + path.relative(ROOT, DATA_FILE));
}
process.exitCode = out.filter(r => !r.reserve).every(r => r.pass) ? 0 : 1;
