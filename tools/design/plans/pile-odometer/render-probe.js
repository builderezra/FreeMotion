/* render-probe.js — the #545 sheet for #966 B41 Odometer Roll (hunt/pile-odometer, ported from the ChatGPT pile 93dceac1), rendered
   through the APP'S OWN compositor (FM.renderScene), so what he looks at is what the app draws. For tools/shot.py --js-file, in the
   next browser slot. Nothing in the app is changed: the subjects are throwaway text layers.

   THIS FILE IS AN ASYNC FUNCTION BODY. shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what it
   resolves to — cut at 4000 characters — so the pictures do not come back that way. Each sheet is POSTed as a JPEG to the local
   receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the page
   address works too. Without a receiver the sheets stay on window.__fmOdometer as data URLs and only the summary returns.

   Every tile is a 1080 x 540 project drawn at a quarter (270 x 135 — the phone's own reduced-plate path, so it is the export shrunk),
   white text on near-black. Sheets (each well under 3x as tall as wide, so they reach his phone — the tall-images lesson):
     odometer-rows.jpg   one row per setting, a strip of five moments across a count, so the roll reads on a still sheet: the
                         defaults with Progress keyed across the clip, a carry (0099 → 0100), Keep with a label, Decimals and a $,
                         commas across a carry, below zero, two lines (the fix), a number wrapped at the border, right-aligned
                         with an outline
     odometer-fix.jpg    THE FIX, half way through a carry: as built (the app) beside ChatGPT's pile — its painter replicated here
                         from 93dceac1 (drawOdometerText: one row at the layer's middle, fixed columns, the label's newline lost) —
                         on a two-line label, a number wrapped at the border, and left / right alignment
   There is no style choice on the effect to pick between; the questions for him are in NOTES.md. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.makeLayer && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
if (!FM.fxRegistry.get('odometer')) return { ok: false, error: 'this tree has no odometer — serve hunt/pile-odometer' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.86, errors = [], timing = {};

const PW = 1080, PH = 540, RS = 0.25, TW = Math.round(PW * RS), TH = Math.round(PH * RS), PAD = 12, HEAD = 46, LABEL_W = 250, BG = '#07090e';
const KF = (a, b, t1) => ({ kf: [{ t: 0, v: a, e: 'linear' }, { t: t1, v: b, e: 'linear' }] });
const fx = over => { const e = FM.fxRegistry.makeInstance('odometer'); Object.assign(e.params, over || {}); return e; };
const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function textLayer(o) {
  const L = FM.makeLayer('text', { text: o.text, fontSize: o.fontSize || 120, color: '#f4f1e8', x: o.x == null ? PW / 2 : o.x, y: PH / 2, start: 0, duration: 4 });
  L.letterSpacing = 0;
  if (o.align) L.align = o.align;
  if (o.wrapDigits) { const c = canvas(4, 4).getContext('2d'); c.font = (o.fontSize || 120) + 'px ' + (L.fontFamily || 'sans-serif'); if ('letterSpacing' in c) c.letterSpacing = '0px'; L.wrapWidth = c.measureText('0'.repeat(o.wrapDigits)).width + 1; }
  if (o.stroke) L.stroke = { enabled: true, width: 6, color: '#ff3366' };
  L.effects = o.effect ? [fx(o.effect)] : [];
  return L;
}
function render(layers, t, tw, th, rs) {
  const c = canvas(tw || TW, th || TH);
  c.__fmRS = rs || RS; c.__fmOX = 0; c.__fmOY = 0;
  FM.renderScene(c.getContext('2d'), { project: { width: PW, height: PH, fps: 30, duration: 4, background: BG }, layers: layers, selectedId: null, selectedIds: [] }, t);
  return c;
}
function label(g, text, x, y, size, colour) { g.font = '600 ' + (size || 15) + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(text, x, y); }
/* a name; long names wrap at `maxW` (four lines at most) */
function nameLabel(g, text, x, y, size, maxW, colour) {
  g.font = '600 ' + size + 'px system-ui, sans-serif';
  const words = String(text).split(' '), lines = [''];
  words.forEach(w => { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (g.measureText(tryL).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tryL; });
  lines.slice(0, 4).forEach((l, i) => label(g, l, x, y + i * (size + 3), size, colour));
}
async function post(name, sheet) {
  const blob = await new Promise(r => sheet.toBlob(r, 'image/jpeg', Q));
  if (!RECV) return 'kept on window (no receiver)';
  try { const res = await fetch(RECV + '/' + name, { method: 'POST', body: blob }); return res.ok ? 'posted ' + blob.size + ' B' : 'POST HTTP ' + res.status; }
  catch (e) { return 'POST failed: ' + (e && e.message); }
}

/* ── SHEET 1: one row per setting, five moments each ── [name, layer options, moments] */
const CARRY = [0, 0.4, 0.8, 1.2, 1.6];
const ROWS = [
  ['Defaults, Progress keyed 0 → 1 across the clip (0000 → 0100)', { text: '0', effect: { progress: KF(0, 1, 4) } }, [0.5, 1.13, 2.02, 2.95, 3.9]],
  ['A carry: 0099 → 0100, three wheels turning together', { text: '0', effect: { from: 99, to: 100, progress: KF(0, 1, 1.6) } }, CARRY],
  ['Keep your text: "Score: 0 pts"', { text: 'Score: 0 pts', fontSize: 96, effect: { from: 7, to: 13, progress: KF(0, 1, 1.6), digits: 2 } }, CARRY],
  ['Decimals 2 and a $: "$0.00", 9.98 → 10.02', { text: '$0.00', effect: { from: 9.98, to: 10.02, progress: KF(0, 1, 1.6), decimals: 2, digits: 2 } }, CARRY],
  ['Thousands: commas, 999,990 → 1,000,010', { text: '0', fontSize: 96, effect: { from: 999990, to: 1000010, progress: KF(0, 1, 1.6), group: 1 } }, CARRY],
  ['Below zero: \u22125 → 5 (the sign keeps its place)', { text: '0', effect: { from: -5, to: 5, progress: KF(0, 1, 1.6), digits: 2 } }, CARRY],
  ['Two lines — THE FIX: "Visitors" over "0 today", 99 → 100', { text: 'Visitors\n0 today', fontSize: 84, effect: { from: 99, to: 100, progress: KF(0, 1, 1.6) } }, CARRY],
  ['Wrapped at the border: 9999 → 10000 over 8 digits', { text: '0', fontSize: 84, wrapDigits: 4, effect: { from: 9999, to: 10000, progress: KF(0, 1, 1.6), digits: 8, wrap: 0 } }, CARRY],
  ['Right-aligned, outlined', { text: 'Score 0', align: 'right', x: PW - 60, stroke: true, effect: { from: 99, to: 100, progress: KF(0, 1, 1.6) } }, CARRY],
];
async function rowsSheet() {
  const sheet = canvas(LABEL_W + 5 * (TW + PAD) + PAD, HEAD + ROWS.length * (TH + PAD) + PAD), g = sheet.getContext('2d');
  g.fillStyle = BG; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'Odometer Roll (#966 B41) — five moments per row, a 1080 x 540 project at a quarter', PAD, 12, 18, '#ffffff');
  for (let r = 0; r < ROWS.length; r++) {
    const [name, o, times] = ROWS[r], y = HEAD + r * (TH + PAD), ts = Date.now();
    nameLabel(g, name, PAD, y + 8, 15, LABEL_W - 2 * PAD);
    for (let k = 0; k < times.length; k++) {
      try {
        g.drawImage(render([textLayer(o)], times[k]), LABEL_W + k * (TW + PAD), y);
        label(g, times[k].toFixed(2) + ' s', LABEL_W + k * (TW + PAD) + 4, y + TH - 16, 11, '#7f8899');
      } catch (e) { errors.push('rows ' + name + ' @' + times[k] + ': ' + (e && e.message)); }
    }
    timing[name] = Math.round((Date.now() - ts) / times.length);
    await sleep(0);
  }
  return sheet;
}

/* ── SHEET 2: THE FIX — as built beside ChatGPT's pile, half way through a carry ──
   The pile's painter, replicated from 93dceac1 (drawOdometerText + odometerMetrics), drawn onto the tile the way the compositor
   draws a text layer (scaled to the plate, moved to the layer's x / y). Its own roll rule too: a higher column turns over the last
   tenth of its own cycle. */
function pileState(p, src) {
  const from = p.from, to = p.to, progress = p.progress, decimals = p.decimals || 0, wanted = p.digits == null ? 4 : p.digits;
  const digits = Math.max(wanted, String(Math.floor(Math.max(Math.abs(from), Math.abs(to)))).length);
  const value = from + (to - from) * progress, keep = p.wrap == null ? true : p.wrap === 1;
  const match = keep ? /-?\d[\d,.\u202f ]*\d|-?\d/.exec(src) : null;
  return { value: value, digits: digits, decimals: decimals, signSlot: from < 0 || to < 0, grouped: p.group === 1,
           prefix: match ? src.slice(0, match.index) : '', suffix: match ? src.slice(match.index + match[0].length) : '' };
}
function drawPile(c, L, p, rs) {
  const g = c.getContext('2d'), st = pileState(p, L.text), fs = L.fontSize || 96, al = L.align || 'center';
  g.fillStyle = BG; g.fillRect(0, 0, c.width, c.height);
  g.save(); g.scale(rs, rs); g.translate(FM.evalProp(L.transform.x, 0), FM.evalProp(L.transform.y, 0));
  g.font = fs + 'px ' + (L.fontFamily || 'sans-serif'); g.fillStyle = '#f4f1e8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let col = 1; for (let n = 0; n < 10; n++) col = Math.max(col, g.measureText(String(n)).width);
  const pre = st.prefix ? g.measureText(st.prefix).width : 0, suf = st.suffix ? g.measureText(st.suffix).width : 0, sign = st.signSlot ? g.measureText('\u2212').width : 0;
  const width = (st.digits + st.decimals) * col + sign + pre + suf;
  let x = al === 'right' ? -width : al === 'center' ? -width / 2 : 0;
  const glyph = (ch, px, py) => g.fillText(ch, px, py);
  if (st.prefix) { glyph(st.prefix, x + pre / 2, 0); x += pre; }
  if (st.signSlot) { if (st.value < 0) glyph('\u2212', x + sign / 2, 0); x += sign; }
  const scaled = Math.abs(st.value) * Math.pow(10, st.decimals), count = st.digits + st.decimals;
  for (let j = 0; j < count; j++) {
    const place = Math.pow(10, count - j - 1), v = scaled / place, whole = Math.floor(v + 1e-9), frac = Math.max(0, Math.min(1, v - whole));
    const digit = whole % 10, roll = place === 1 ? frac : Math.max(0, Math.min(1, (frac - 0.9) * 10)), center = x + col / 2;
    if (roll <= 0.001) glyph(String(digit), center, 0);
    else {
      const step = fs * 1.16;
      g.save(); g.beginPath(); g.rect(x, -fs * 0.58, col, fs * 1.16); g.clip();
      glyph(String(digit), center, -roll * step); glyph(String((digit + 1) % 10), center, (1 - roll) * step);
      g.restore();
    }
    x += col;
  }
  if (st.suffix) glyph(st.suffix, x + suf / 2, 0);
  g.restore();
  return c;
}
const FIX_RS = 1 / 3, FW = Math.round(PW * FIX_RS), FH = Math.round(PH * FIX_RS);
const FIXES = [
  ['Two lines, centred: "Visitors" over "0 today", 99.5', { text: 'Visitors\n0 today', fontSize: 84 }, { from: 99, to: 100, progress: 0.5 }],
  ['Wrapped at the border, centred: 9999.5 over 8 digits', { text: '0', fontSize: 84, wrapDigits: 4 }, { from: 9999, to: 10000, progress: 0.5, digits: 8, wrap: 0 }],
  ['Two lines, left-aligned', { text: 'Visitors\n0 today', fontSize: 84, align: 'left', x: 60 }, { from: 99, to: 100, progress: 0.5 }],
  ['Two lines, right-aligned', { text: 'Visitors\n0 today', fontSize: 84, align: 'right', x: PW - 60 }, { from: 99, to: 100, progress: 0.5 }],
];
async function fixSheet() {
  const sheet = canvas(LABEL_W + 2 * (FW + PAD) + PAD, HEAD + 22 + FIXES.length * (FH + PAD) + PAD), g = sheet.getContext('2d');
  g.fillStyle = BG; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, 'The fix — half way through a carry: as built, and ChatGPT’s pile (its painter replicated)', PAD, 12, 18, '#ffffff');
  label(g, 'AS BUILT (the app)', LABEL_W, HEAD, 14, '#ffd24a');
  label(g, 'CHATGPT’S PILE, 93dceac1', LABEL_W + FW + PAD, HEAD, 14, '#ff8a8a');
  for (let r = 0; r < FIXES.length; r++) {
    const [name, o, p] = FIXES[r], y = HEAD + 22 + r * (FH + PAD);
    nameLabel(g, name, PAD, y + 8, 15, LABEL_W - 2 * PAD);
    try {
      const L = textLayer(Object.assign({}, o, { effect: p }));
      g.drawImage(render([L], 1, FW, FH, FIX_RS), LABEL_W, y);
      g.drawImage(drawPile(canvas(FW, FH), L, p, FIX_RS), LABEL_W + FW + PAD, y);
    } catch (e) { errors.push('fix ' + name + ': ' + (e && e.message)); }
    await sleep(0);
  }
  return sheet;
}

const out = {}, sheets = {};
sheets['odometer-rows.jpg'] = await rowsSheet();
sheets['odometer-fix.jpg'] = await fixSheet();
for (const name of Object.keys(sheets)) out[name] = await post(name, sheets[name]);
window.__fmOdometer = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), timing: timing, errors: errors };

/* the summary shot.py prints (well under its 4000 characters): what was posted, sizes, the slowest rows (ms per frame at a quarter of
   1080 x 540), and what the counter reads on the carry row's moments (FM._odometerState) */
const slow = Object.keys(timing).sort((a, b) => timing[b] - timing[a]).slice(0, 4).map(k => k + ' ' + timing[k] + ' ms');
const carry = CARRY.map(t => { const s = FM._odometerState({ from: 99, to: 100, progress: KF(0, 1, 1.6) }, t, '0'); return s.text + ' ' + s.wheels.filter(w => w.roll > 0).length + '@' + s.roll.toFixed(2); });
return { ok: !errors.length, recv: RECV, posted: out, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  slowest: slow, carry: carry, errors: errors.slice(0, 6), ms: Date.now() - t0 };
