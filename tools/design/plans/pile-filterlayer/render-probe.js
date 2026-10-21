/* render-probe.js — the #545 sheet for #966 B21, the Filter layer tile (hunt/pile-filterlayer): its three drawn icons, and the
   phone Elements tab it makes ten tiles long. For tools/shot.py --js-file at --width 380, in a browser slot. Nothing in the app
   is changed: it opens the + sheet, measures it and closes it again (and puts back Home and the selection if it moved them).

   THIS FILE IS AN ASYNC FUNCTION BODY (shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints what
   it resolves to, cut at 4000 characters — so the pictures do not come back that way). Each page is POSTed as a JPEG to the
   local receiver whose port is window.__recv (a NUMBER), at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg'; ?fmrecv=<port>
   on the page address works too. Without a receiver the pages stay on window.__fmPileFilterLayer as data URLs and only the
   summary returns. Modelled on tools/design/plans/pile-spill/render-probe.js.
   ⚠️ WRITTEN, NOT RUN (15 Oct: a release ship held the machine — no browser, not even a parse check). prove.sh parses it.

   Pages (each under 2x as tall as wide, so it reaches his phone):
     filterlayer-icons.jpg  the three options — a (RECOMMENDED), b, c — each drawn as the tile the Elements tab draws, between
                            its two neighbours on the phone (Adjustment on its left, New group on its right), at 96 px and at
                            the 24 px it ships at (drawn 1x, the harshest view of it). Colours, plates, label fonts and the
                            neighbours' icons are READ from the live sheet, so it is the app's own drawing, not a copy of it.
     filterlayer-phone.jpg  the phone Elements tab at this width, three ways, from the live sheet's measured pager, tiles,
                            colours, icons and labels:
                              1 AS BUILT (no CSS change) — two pages: the nine add-a-layer tiles, Filter layer beside
                                Adjustment, then Custom elements alone across its page, as any one-card page is drawn;
                              2 FILTER LAYER LAST — page 1 exactly as today, the Filter layer alone on page 2;
                              3 FOUR COLUMNS — all ten on one page and no dots (would need one CSS rule; tiles narrower).
                            1 is the measured layout; 2 and 3 are the same measured tiles rearranged — drawn, not rendered. */
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.addMenu && FM.mobile && FM.editor && FM.scene); i++) await sleep(50);
if (!(window.FM && FM.addMenu && FM.mobile && FM.editor)) return { ok: false, error: 'FM never came up' };
if (typeof FM.addFilterLayer !== 'function' || !FM.addMenu.FILTER_LAYER_ICONS) return { ok: false, error: 'this tree has no Filter layer (FM.addFilterLayer / FM.addMenu.FILTER_LAYER_ICONS) - serve hunt/pile-filterlayer' };
if (!(FM.mobile.isPhone && FM.mobile.isPhone())) return { ok: false, error: 'run it at a phone width (shot.py --width 380): the + sheet it measures only exists there' };
if (FM.editor.isSimple && FM.editor.isSimple()) return { ok: false, error: 'Simple is on screen - the Filter layer is a Full tile; open the project in Full first' };
const qPort = (new URLSearchParams(location.search)).get('fmrecv');
const port = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qPort && /^\d{2,5}$/.test(qPort) ? +qPort : null);
const RECV = port ? 'http://127.0.0.1:' + port : null;
const Q = 0.88, errors = [];
const ICONS = FM.addMenu.FILTER_LAYER_ICONS, PICK = FM.addMenu.filterLayerIcon ? FM.addMenu.filterLayerIcon() : 'a';
const WHAT = { a: 'three overlapping circles', b: 'a pane of tinted glass', c: 'a lens-filter ring' };
const BG = '#0f1116', INK = '#e9edf5', DIM = '#9aa3b2', GOLD = '#ffd24a';

const canvas = (W, H) => { const c = document.createElement('canvas'); c.width = Math.round(W); c.height = Math.round(H); return c; };
function text(g, s, x, y, size, colour, weight, align) {
  g.font = (weight || '600') + ' ' + (size || 14) + 'px system-ui, sans-serif'; g.fillStyle = colour || INK;
  g.textBaseline = 'top'; g.textAlign = align || 'left'; g.fillText(s, x, y); g.textAlign = 'left';
}
async function post(name, sheet) {
  const blob = await new Promise(r => sheet.toBlob(r, 'image/jpeg', Q));
  if (!RECV) return 'kept on window (no receiver)';
  try { const res = await fetch(RECV + '/' + name, { method: 'POST', body: blob }); return res.ok ? 'posted ' + blob.size + ' B' : 'POST HTTP ' + res.status; }
  catch (e) { return 'POST failed: ' + (e && e.message); }
}
/* an icon's markup as a picture: currentColor becomes the colour the tile really paints its icon, and the root gets the size */
function svgImage(markup, colour, size) {
  let s = String(markup).replace(/currentColor/g, colour);
  s = s.replace(/^<svg([^>]*)>/, (m, a) => '<svg' + a.replace(/\s(width|height|xmlns)="[^"]*"/g, '') + ' xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">');
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('an icon did not load as an image')); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); });
}
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const clear = c => !c || /rgba\([^)]*,\s*0\)$/.test(c) || c === 'transparent';
/* one tile as the sheet draws it: its plate and rim, its icon at `ico` px, its name in its own font, wrapped to two lines */
async function tile(g, t, x, y, w, h, ico, fontPx) {
  rr(g, x, y, w, h, Math.min(t.radius, h / 3));
  g.fillStyle = clear(t.plate) ? 'rgba(' + t.tint + ',0.085)' : t.plate; g.fill();
  g.lineWidth = 1; g.strokeStyle = clear(t.border) ? 'rgba(' + t.tint + ',0.3)' : t.border; g.stroke();
  const fs = fontPx || t.fontPx, lh = Math.round(fs * 1.2);
  g.font = t.fontWeight + ' ' + fs + 'px ' + t.fontFamily;
  const words = t.title.split(' '), lines = [''];
  words.forEach(wd => { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + wd : wd; if (g.measureText(tryL).width > w - 8 && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = tryL; });
  const L = lines.slice(0, 2), block = ico + 6 + L.length * lh, top = y + Math.max(2, (h - block) / 2);
  try { g.drawImage(await svgImage(t.svg, t.iconColour, ico), Math.round(x + (w - ico) / 2), Math.round(top), ico, ico); }
  catch (e) { errors.push(t.title + ': ' + e.message); }
  g.fillStyle = t.lblColour; g.textBaseline = 'top'; g.textAlign = 'center';
  L.forEach((s, i) => g.fillText(s, x + w / 2, top + ico + 6 + i * lh));
  g.textAlign = 'left';
}

/* ───────────────── read the live sheet ───────────────── */
const wasHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
if (wasHome) FM.home.close();
const sel0 = FM.scene && FM.scene.selectedId;
if (sel0 && FM.selectLayer) FM.selectLayer(null);
let M = null;
try {
  FM.mobile.openAdd();
  const sheetEl = document.getElementById('add-sheet');
  if (sheetEl && sheetEl.getAnimations) sheetEl.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} });
  await sleep(250);
  const tab = document.querySelector('.addmenu--sheet .addmenu-tab[data-key="object"]');
  if (!tab) throw new Error('no Elements tab in the + sheet');
  if (!tab.classList.contains('active')) { tab.click(); await sleep(250); }
  const am = document.querySelector('.addmenu--sheet'), pager = am.querySelector('.addmenu-pager'), body = am.querySelector('.addmenu-body');
  pager.scrollLeft = 0;
  await sleep(150);
  const pr = pager.getBoundingClientRect(), br = body.getBoundingClientRect(), grid = am.querySelector('.addmenu-page .addmenu-grid');
  const info = (c, r0) => {
    const r = c.getBoundingClientRect(), cs = getComputedStyle(c), sv = c.querySelector('.addmenu-ic svg'), lb = c.querySelector('.addmenu-lbl');
    const ls = lb ? getComputedStyle(lb) : null;
    return { title: c.title, x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height,
      tint: (c.style.getPropertyValue('--am-tint') || '150, 160, 176').trim(), plate: cs.backgroundColor, border: cs.borderTopColor,
      radius: parseFloat(cs.borderTopLeftRadius) || 10, svg: sv ? sv.outerHTML : '<svg viewBox="0 0 24 24"></svg>',
      iconColour: sv ? getComputedStyle(sv).color : INK, icoPx: sv ? sv.getBoundingClientRect().width : 24,
      fontPx: ls ? parseFloat(ls.fontSize) || 11 : 11, fontWeight: ls ? ls.fontWeight : '600', fontFamily: ls ? ls.fontFamily : 'system-ui, sans-serif',
      lblColour: ls ? ls.color : INK };
  };
  const pages = [].slice.call(am.querySelectorAll('.addmenu-page')).map(pg => { const r0 = pg.getBoundingClientRect(); return [].slice.call(pg.querySelectorAll('.addmenu-card')).map(c => info(c, r0)); });
  const sheetBg = getComputedStyle(sheetEl).backgroundColor;
  M = { W: pr.width, H: pr.height, bodyH: br.height, gap: grid ? (parseFloat(getComputedStyle(grid).rowGap) || 8) : 8, pages: pages, bg: clear(sheetBg) ? '#16181e' : sheetBg };
} catch (e) { errors.push('reading the sheet: ' + (e && e.message)); }
finally {
  try { FM.mobile.closeAdd(); } catch (e) {}
  await sleep(450);
  if (sel0 && FM.selectLayer) FM.selectLayer(sel0);
  if (wasHome && FM.home && !FM.home.isOpen()) FM.home.open();
}
if (!M || !M.pages.length) return { ok: false, error: 'could not read the + sheet', errors: errors };
const all = [].concat.apply([], M.pages), by = n => all.filter(t => t.title === n)[0];
const ADJ = by('Adjustment'), FL = by('Filter layer'), NG = by('New group');
if (!ADJ || !FL || !NG) return { ok: false, error: 'the sheet has no ' + ['Adjustment', 'Filter layer', 'New group'].filter(n => !by(n)).join(' / ') + ' tile', titles: all.map(t => t.title) };
const svgOpen = FL.svg.slice(0, FL.svg.indexOf('>') + 1);
const option = k => Object.assign({}, FL, { svg: svgOpen + ICONS[k] + '</svg>' });

/* ───────────────── page 1: the three icons ───────────────── */
const sheets = {}, posted = {};
{
  const BIG = 96, BW = 168, BH = 160, SW = Math.round(ADJ.w), SH = Math.round(ADJ.h), LEFT = 230, ROWH = Math.max(BH, SH) + 46;
  const W = LEFT + 3 * BW + 2 * 12 + 40 + 3 * SW + 2 * M.gap + 30, H = 96 + 3 * ROWH + 30;
  const c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  text(g, 'Filter layer tile (#966 B21) - which icon?', 24, 18, 22, INK, '700');
  text(g, 'Each between its neighbours on the phone: Adjustment | Filter layer | New group. Left at 96 px; right at 24 px in the real phone tile (' + SW + 'x' + SH + ').', 24, 50, 14, DIM, '500');
  let y = 96;
  for (const k of ['a', 'b', 'c']) {
    g.fillStyle = M.bg; g.fillRect(LEFT - 12, y - 8, W - LEFT, ROWH - 14);
    text(g, k.toUpperCase() + ' - ' + WHAT[k], 24, y + 20, 17, INK, '700');
    if (k === 'a') text(g, '★ RECOMMENDED', 24, y + 46, 15, GOLD, '700');
    if (k === PICK) text(g, 'wired in now (one letter to change)', 24, y + 70, 13, DIM, '500');
    const row = [ADJ, option(k), NG];
    for (let i = 0; i < 3; i++) await tile(g, row[i], LEFT + i * (BW + 12), y, BW, BH, BIG, 15);
    const sx = LEFT + 3 * BW + 2 * 12 + 40;
    for (let i = 0; i < 3; i++) await tile(g, row[i], sx + i * (SW + M.gap), y + Math.round((BH - SH) / 2), SW, SH, 24);
    y += ROWH;
  }
  sheets['filterlayer-icons.jpg'] = c;
}

/* ───────────────── page 2: the phone Elements tab, three ways ───────────────── */
{
  const PW = Math.round(M.W), PH = Math.round(M.H), COLW = PW + 40, TOP = 96, DOTS = 18;
  const W = 3 * COLW + 20, H = TOP + 2 * (PH + DOTS + 40) + 40;
  const c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  text(g, 'The phone Elements tab with the Filter layer (#966 B21) - which layout?', 24, 18, 22, INK, '700');
  text(g, 'Measured on this build at ' + Math.round(innerWidth) + ' px: the sheet holds nine tiles a page (3 x 3). 1 is the app as built; 2 and 3 are the same tiles rearranged.', 24, 50, 14, DIM, '500');
  const nine = M.pages[0], cells = nine.map(t => ({ x: t.x, y: t.y, w: t.w, h: t.h }));
  const lone = M.pages[1] && M.pages[1][0] ? { x: M.pages[1][0].x, y: M.pages[1][0].y, w: M.pages[1][0].w, h: M.pages[1][0].h } : { x: 0, y: 0, w: PW, h: PH };
  const order = all.map(t => t.title), base = order.filter(n => n !== 'Filter layer');
  const plan = [
    { name: '1  AS BUILT (no CSS change)', pages: [[order.slice(0, 9), cells], [order.slice(9), [lone]]] },
    { name: '2  Filter layer LAST', pages: [[base.slice(0, 9), cells], [['Filter layer'], [lone]]] },
  ];
  const g4 = M.gap, w4 = (PW - 3 * g4) / 4, h4 = (M.bodyH - 2 * g4) / 3, cells4 = order.map((n, i) => ({ x: (i % 4) * (w4 + g4), y: Math.floor(i / 4) * (h4 + g4), w: w4, h: h4 }));
  plan.push({ name: '3  FOUR COLUMNS, one page', pages: [[order, cells4]], tall: Math.round(M.bodyH) });
  for (let p = 0; p < plan.length; p++) {
    const X = 20 + p * COLW;
    text(g, plan[p].name, X, TOP - 30, 16, p === 0 ? GOLD : INK, '700');
    for (let q = 0; q < plan[p].pages.length; q++) {
      const pageH = plan[p].tall || PH, Y = TOP + q * (PH + DOTS + 40);
      const [names, cl] = plan[p].pages[q];
      g.fillStyle = M.bg; g.fillRect(X - 6, Y - 6, PW + 12, pageH + 12 + (plan[p].tall ? 0 : DOTS));
      for (let i = 0; i < names.length && i < cl.length; i++) { const t = by(names[i]); if (t) await tile(g, t, X + cl[i].x, Y + cl[i].y, cl[i].w, cl[i].h, Math.round(t.icoPx)); }
      if (plan[p].pages.length > 1) {
        for (let d = 0; d < plan[p].pages.length; d++) { g.beginPath(); g.arc(X + PW / 2 + (d - (plan[p].pages.length - 1) / 2) * 14, Y + pageH + 10, 3, 0, 2 * Math.PI); g.fillStyle = d === q ? INK : '#4a5160'; g.fill(); }
        text(g, 'page ' + (q + 1) + ' of ' + plan[p].pages.length, X, Y + pageH + DOTS + 2, 12, DIM, '500');
      }
    }
  }
  sheets['filterlayer-phone.jpg'] = c;
}

for (const name of Object.keys(sheets)) posted[name] = await post(name, sheets[name]);
window.__fmPileFilterLayer = { sheets: Object.keys(sheets).reduce((o, k) => { o[k] = sheets[k].toDataURL('image/jpeg', Q); return o; }, {}), errors: errors };
return { ok: !errors.length, recv: RECV, posted: posted, sizes: Object.keys(sheets).map(k => k + ' ' + sheets[k].width + 'x' + sheets[k].height),
  measured: { pager: Math.round(M.W) + 'x' + Math.round(M.H), body: Math.round(M.bodyH), pages: M.pages.map(p => p.length), tile: Math.round(ADJ.w) + 'x' + Math.round(ADJ.h), icon: Math.round(FL.icoPx), tint: FL.tint },
  pick: PICK, errors: errors.slice(0, 6), ms: Date.now() - t0 };
