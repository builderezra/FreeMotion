/* render-probe.js — the #545 picture for #980 Phase 3, THE SWITCH MORPH (D11 B, his pick 1 Oct: "D11 B", then "Just do the one clip
   on the far left, morph i think it was"), drawn from the APP'S OWN morph (js/editor-morph.js) as it really plays — never a mock-up.
   A throwaway project is switched Full → Simple and back through the very door the ⚙ uses (FM.editor.request(…, { from: 'cog' })
   and FM.editor.afterCogClose, which the cog's close runs); the morph is held (FM.editorMorph._hold) and seeked to 0 / 25 / 50 / 75 /
   100 % of its 320 ms; and at each instant every box, panel, fade and flight is read off the page (getBoundingClientRect and the
   computed opacity / visibility / clip-path, which carry the running animations) and painted to a canvas: the real geometry, the
   real colours and names, the preview canvas itself. Icons and glyphs inside buttons are not drawn (a box stands for each).

   THIS FILE IS AN ASYNC FUNCTION BODY for tools/shot.py --js-file (it wraps any --js that contains "return" as `(async () => { … })()`
   and prints what it resolves to, cut at 4000 characters). Each strip is POSTed as a JPEG to the local receiver whose port is
   window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port> on the page address works too.
   Without a receiver the strips stay on window.__fmMorphSheet as data URLs and only the summary returns.

   One run per width (the page's own innerWidth names the files), from the worktree that holds this file — never beside a ship or a
   mutation (a browser beside ship.sh turned 921 red):
     P=<free port>; R=<free port>   (R: the local POST receiver the other plans/*/render-probe.js sheets use — recv.py from
                                    fxnew-looks, which is not on this tree — writing each body to /tmp/fm-morph/<name>)
     tools/serve.sh $P . &   python3 <recv.py> $R /tmp/fm-morph &
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 380 --height 800 --wait 300 \
         --js-file tools/design/plans/sm3-morph/render-probe.js --out /tmp/fm-morph/page-380.png
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
         --js-file tools/design/plans/sm3-morph/render-probe.js --out /tmp/fm-morph/page-1280.png
   Strips (each under 2x as tall as wide, so it reaches his phone whole — the tall-images lesson):
     morph-<w>-to-simple.jpg   Full → Simple: 0, 80, 160, 240, 320 ms
     morph-<w>-to-full.jpg     Simple → Full: the same instants

   REAL PIXELS TOO (optional): with &fmhold=400 in --path the probe, after posting, plays both switches again and HOLDS each instant
   for 400 ms, so shot.py's own screenshots catch them: add --frames 200,600,1000,1400,1800,2600,3000,3400,3800,4200 (approximate:
   the schedule starts as the probe returns). Those PNGs are the app's real pixels at the same five instants each way. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.editor && FM.projects && FM.storage && FM.makeLayer && FM.timeline); i++) await sleep(50);
if (!(window.FM && FM.editor && FM.storage)) return { ok: false, error: 'FM never came up' };
if (!FM.editorMorph || !FM.editorMorph._hold) return { ok: false, error: 'this tree has no FM.editorMorph (js/editor-morph.js) — serve hunt/sm3-morph' };
const qs = new URLSearchParams(location.search);
const qPort = qs.get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const HOLD = /^\d{2,4}$/.test(qs.get('fmhold') || '') ? +qs.get('fmhold') : 0;
const Q = 0.86, errors = [], posted = {}, sheets = {};
const W = window.innerWidth, H = window.innerHeight, TAG = String(W), PHONE = W <= 700;
const FR = [0, 0.25, 0.5, 0.75, 1], T = FM.editorMorph.MS || 320;

/* ───────────────────────── reading the page ───────────────────────── */
const TRANSPARENT = /^(transparent|rgba\([^)]*,\s*0\))$/;
function colourOf(cs) {
  if (cs.backgroundColor && !TRANSPARENT.test(cs.backgroundColor)) return cs.backgroundColor;
  const m = String(cs.backgroundImage || '').match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/i);
  return m ? m[0] : null;
}
/* what an element shows now: its opacity through every ancestor (running animations included), 0 if not visible or not drawn */
function shows(el) {
  if (!el || !el.isConnected || !el.getClientRects().length) return 0;
  if (getComputedStyle(el).visibility !== 'visible') return 0;
  let o = 1;
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const v = parseFloat(getComputedStyle(n).opacity); if (!isNaN(v)) o *= v; }
  return o;
}
const R = r => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
const isect = (a, b) => { const l = Math.max(a.left, b.left), t = Math.max(a.top, b.top), r = Math.min(a.right, b.right), bt = Math.min(a.bottom, b.bottom); return { left: l, top: t, right: r, bottom: bt, width: Math.max(0, r - l), height: Math.max(0, bt - t) }; };
/* the part of the screen an element can show in: every ancestor that clips (overflow other than visible) */
function clipOf(el) {
  let c = { left: 0, top: 0, right: W, bottom: H, width: W, height: H };
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') c = isect(c, R(n.getBoundingClientRect()));
  }
  return c;
}
function radius(cs, r) { const v = parseFloat(cs.borderTopLeftRadius) || 0; return Math.min(v, r.height / 2, r.width / 2); }
function rr(g, x, y, w, h, rad) {
  g.beginPath();
  if (!rad) { g.rect(x, y, w, h); return; }
  g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad); g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath();
}
function text(g, s, x, y, size, colour, weight, maxW) {
  if (!s) return;
  g.font = (weight || '600') + ' ' + size + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'middle';
  let t = String(s);
  if (maxW > 0) { while (t.length > 1 && g.measureText(t).width > maxW) t = t.slice(0, -2) + '…'; if (g.measureText(t).width > maxW) return; }
  g.fillText(t, x, y);
}
/* one element as a box: its fill, border, corners and words, at its opacity, inside its clip */
function drawEl(g, el, o) {
  const a = (o && o.alpha != null) ? o.alpha : shows(el);
  if (a < 0.01) return;
  const r = (o && o.rect) || R(el.getBoundingClientRect());
  if (r.width < 0.5 || r.height < 0.5) return;
  const cs = getComputedStyle(el), clip = (o && o.clip) || clipOf(el);
  if (clip.width <= 0 || clip.height <= 0) return;
  g.save();
  g.globalAlpha = Math.min(1, a);
  g.beginPath(); g.rect(clip.left, clip.top, clip.width, clip.height); g.clip();
  const fill = (o && o.fill) || colourOf(cs), rad = radius(cs, r);
  if (fill) { rr(g, r.left, r.top, r.width, r.height, rad); g.fillStyle = fill; g.fill(); }
  const bw = parseFloat(cs.borderTopWidth) || 0;
  if (bw > 0 && cs.borderTopStyle !== 'none' && !TRANSPARENT.test(cs.borderTopColor)) { rr(g, r.left + 0.5, r.top + 0.5, r.width - 1, r.height - 1, rad); g.strokeStyle = cs.borderTopColor; g.lineWidth = 1; g.stroke(); }
  const words = o && o.words != null ? o.words : '';
  if (words) text(g, words, r.left + 6, r.top + r.height / 2, Math.max(9, Math.min(12, r.height * 0.45)), cs.color, '600', r.width - 10);
  g.restore();
}
const wordsOf = el => { const n = el.querySelector('.clip-label, .sm-name, .sm-tool-l'); return n ? n.textContent : ''; };
const all = sel => Array.prototype.slice.call(document.querySelectorAll(sel));

/* ONE INSTANT, painted at scale s: the chrome, both timelines with their fades, the real boxes, the flights, the playhead line */
function paint(s) {
  const c = document.createElement('canvas');
  c.width = Math.round(W * s); c.height = Math.round(H * s);
  const g = c.getContext('2d');
  g.scale(s, s);
  g.fillStyle = colourOf(getComputedStyle(document.body)) || '#0b0e14'; g.fillRect(0, 0, W, H);
  ['#topbar', '#topbar-m', '#stage'].forEach(sel => all(sel).forEach(el => drawEl(g, el)));
  const pv = document.getElementById('preview');
  if (pv && shows(pv) > 0.01) { const r = pv.getBoundingClientRect(); try { g.save(); g.globalAlpha = shows(pv); g.drawImage(pv, r.left, r.top, r.width, r.height); g.restore(); } catch (e) { errors.push('preview: ' + e.message); } }
  ['#inspector-panel', '#timeline-panel', '#transport'].forEach(sel => all(sel).forEach(el => drawEl(g, el)));
  all('#transport .tbtn, #time-readout').forEach(el => drawEl(g, el, { fill: colourOf(getComputedStyle(el)) || 'rgba(255,255,255,.08)', words: el.id === 'time-readout' ? el.textContent : '' }));
  /* Full: its rows, clip boxes, then the sticky heads and ruler over them (their stacking in the app) */
  all('#tl-tracks .track-row').forEach(el => drawEl(g, el));
  all('#tl-tracks .clip[data-id]').forEach(el => drawEl(g, el, { words: wordsOf(el) }));
  all('#tl-tracks .track-head, #tl-rulerrow, #tl-rulerrow .tl-headspace').forEach(el => drawEl(g, el));
  /* Simple, over Full (z 11): its ground, rows, glyphs, the +, chips, the boxes, the tray and the tools */
  all('#sm-timeline').forEach(el => drawEl(g, el));
  all('#sm-ruler, #sm-main, #sm-sound, #sm-sections .sm-glyph, #sm-main .sm-add, #sm-main .sm-chip').forEach(el => drawEl(g, el, { fill: colourOf(getComputedStyle(el)) || (el.classList.contains('sm-add') ? 'rgba(255,255,255,.06)' : null), words: el.classList.contains('sm-glyph') || el.classList.contains('sm-chip') ? el.textContent : (el.classList.contains('sm-add') ? '+' : '') }));
  all('#sm-timeline .sm-item[data-id]').forEach(el => drawEl(g, el, { words: wordsOf(el) }));
  all('#sm-say, #sm-tools').forEach(el => drawEl(g, el, { fill: colourOf(getComputedStyle(el)) || 'rgba(20,24,32,1)' }));
  all('#sm-tools .sm-tool, #sm-tray .sm-tool').forEach(el => drawEl(g, el, { fill: 'rgba(255,255,255,.05)', words: wordsOf(el) }));
  /* the flights: each wrapper's box, opacity and clip-path as they are at this instant, and inside it the old and the new look */
  all('#ed-morph .edm-fly').forEach(w => {
    const wa = shows(w), r = R(w.getBoundingClientRect());
    if (wa < 0.01) return;
    const cp = String(getComputedStyle(w).clipPath || ''), m = cp.match(/inset\(([^)]*)\)/);
    let clip = { left: 0, top: 0, right: W, bottom: H, width: W, height: H };
    if (m) {
      const v = m[1].trim().split(/\s+/).map(parseFloat), t = v[0] || 0, rt = v.length > 1 ? v[1] : t, b = v.length > 2 ? v[2] : t, l = v.length > 3 ? v[3] : rt;
      clip = { left: r.left + l, top: r.top + t, right: r.right - rt, bottom: r.bottom - b }; clip.width = clip.right - clip.left; clip.height = clip.bottom - clip.top;
    }
    Array.prototype.forEach.call(w.children, k => drawEl(g, k, { rect: r, clip: clip, alpha: wa * (parseFloat(getComputedStyle(k).opacity) || 0), words: wordsOf(k) }));
  });
  const cl = document.getElementById('tl-centerline');
  if (cl && shows(cl) > 0.01) { const r = cl.getBoundingClientRect(); g.save(); g.globalAlpha = shows(cl); g.fillStyle = '#ffffff'; g.fillRect(r.left - 1, r.top, 2, r.height); g.restore(); }
  return c;
}

/* ───────────────────────── the project: a throwaway Beach day, in Full ───────────────────────── */
async function setUp() {
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) { FM.home.close(); await sleep(500); }
  const PW = 1080, PH = 1920;
  await FM.projects.create({ name: 'Morph sheet', width: PW, height: PH });
  const vid = (name, start, dur) => { const l = FM.makeLayer('video', { name: name, x: PW / 2, y: PH / 2, start: start, duration: dur }); l.srcW = PW; l.srcH = PH; l.srcRev = 0; l.muted = true; return l; };
  const title = FM.makeLayer('text', { name: 'Title', text: 'Beach day', x: PW / 2, y: PH * 0.2, start: 0.5, duration: 4 });
  const song = vid('Song', 0, 6); song.audioOnly = true; song.sm = { stay: true };
  await FM.storage.applyScene({ project: { name: 'Morph sheet', width: PW, height: PH, fps: 30, duration: 0, background: '#000000' },
    layers: [title, song, vid('Sunset', 4, 2), vid('Waves', 2, 2), vid('Arriving', 0, 2)], selectedId: null, selectedIds: [] });
  if (FM.history && FM.history.reset) FM.history.reset();
  FM.selectLayer(null); FM.time = 2.5;
  if (FM.editor.mode() !== 'full') FM.editor.apply('full', { force: true, quiet: true });
  FM.refreshAll(); await sleep(600);
}

/* ───────────────────────── one switch, five instants ───────────────────────── */
const SCALE = PHONE ? 0.8 : 0.5;
async function shoot(to) {
  const ok = await FM.editor.request(to, { from: 'cog' });
  if (!ok) throw new Error('the switch to ' + to + ' was refused');
  FM.editor.afterCogClose();
  const anims = FM.editorMorph._hold();
  if (!anims) throw new Error('no morph played on the switch to ' + to + ' (reduced motion on? a playing project?)');
  const st = FM.editorMorph._state ? FM.editorMorph._state() : null;
  const frames = FR.map(f => {
    const t = f === 1 ? T - 0.5 : f * T;
    anims.forEach(a => { try { a.currentTime = t; } catch (e) {} });
    return { f: f, ms: Math.round(f * T), c: paint(SCALE) };
  });
  FM.editorMorph.stop();
  return { frames: frames, flights: st ? st.flights.map(x => x.k).reduce((o, k) => { o[k] = (o[k] || 0) + 1; return o; }, {}) : null };
}
function label(g, s, x, y, size, colour, weight) { g.font = (weight || '600') + ' ' + size + 'px system-ui, sans-serif'; g.fillStyle = colour || '#e9edf5'; g.textBaseline = 'top'; g.fillText(s, x, y); }
/* a strip: the five instants side by side on a phone (one row), three and two on a PC (two rows), each named by its time */
function strip(title, sub, shot) {
  const fw = shot.frames[0].c.width, fh = shot.frames[0].c.height, M = 24, G = 14, HD = 92, LB = 26;
  const cols = PHONE ? 5 : 3, rows = Math.ceil(shot.frames.length / cols);
  const sheet = document.createElement('canvas');
  sheet.width = M * 2 + cols * fw + (cols - 1) * G; sheet.height = HD + rows * (LB + fh + G) + M;
  const g = sheet.getContext('2d');
  g.fillStyle = '#05070c'; g.fillRect(0, 0, sheet.width, sheet.height);
  label(g, title, M, 16, 22, '#ffffff');
  label(g, sub, M, 50, 14, '#9aa4b6', '500');
  shot.frames.forEach((fr, i) => {
    const x = M + (i % cols) * (fw + G), y = HD + Math.floor(i / cols) * (LB + fh + G);
    label(g, fr.ms + ' ms (' + Math.round(fr.f * 100) + ' %)', x, y + 4, 14, '#cfd6e4');
    g.drawImage(fr.c, x, y + LB);
    g.strokeStyle = '#2a3242'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + LB + 0.5, fw - 1, fh - 1);
  });
  return sheet;
}
async function post(name, sheet) {
  const blob = await new Promise(r => sheet.toBlob(r, 'image/jpeg', Q));
  if (!RECV) return 'kept on window (no receiver)';
  try { const res = await fetch(RECV + '/' + name, { method: 'POST', body: blob }); return res.ok ? 'posted ' + blob.size + ' B' : 'POST HTTP ' + res.status; }
  catch (e) { return 'POST failed: ' + (e && e.message); }
}

const kinds = {};
try {
  await setUp();
  const where = W + '×' + H + (PHONE ? ' (phone)' : ' (PC)');
  const a = await shoot('simple');
  kinds['to-simple'] = a.flights;
  sheets['morph-' + TAG + '-to-simple.jpg'] = strip('The switch morph, Full → Simple — ' + where,
    'D11 B, his pick. Each box flies from its Full row to its place in Simple (320 ms); Full’s heads fade out, Simple’s labels and tools come in; the panel’s top glides with the stage.', a);
  await sleep(700);
  const b = await shoot('full');
  kinds['to-full'] = b.flights;
  sheets['morph-' + TAG + '-to-full.jpg'] = strip('The switch morph, Simple → Full — ' + where,
    'The same flight played back: Simple’s labels, tray and tools fade out, each box returns to its Full row, Full’s heads come in, and Full ends exactly as it was.', b);
  for (const name of Object.keys(sheets)) posted[name] = await post(name, sheets[name]);
} catch (e) { errors.push(String(e && e.message || e)); }
window.__fmMorphSheet = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), errors: errors };

/* the optional real-pixels pass (see the header): both switches again, each instant held HOLD ms for shot.py --frames */
if (HOLD > 0 && !errors.length) {
  (async () => {
    for (const to of ['simple', 'full']) {
      try {
        await FM.editor.request(to, { from: 'cog' });
        FM.editor.afterCogClose();
        const an = FM.editorMorph._hold();
        if (!an) continue;
        for (const f of FR) { an.forEach(a => { try { a.currentTime = f === 1 ? T - 0.5 : f * T; } catch (e) {} }); await sleep(HOLD); }
        FM.editorMorph.stop();
        await sleep(HOLD);
      } catch (e) {}
    }
  })();
}

return { ok: !errors.length, recv: RECV, width: W, height: H, posted: posted, flights: kinds,
  sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height), errors: errors.slice(0, 6), hold: HOLD, ms: Date.now() - t0 };
