// probe-lib.js — measurement helpers, concatenated in front of a driver. Needs `P` defined before it.
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const r1 = (x) => Math.round(x * 10) / 10;
const ROOT = document.documentElement;
const PANEL = () => document.getElementById('inspector-panel');
async function leaveHome() {
  try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
  await sleep(700);
}
function injectCss(css) {
  let st = document.getElementById('probe-css');
  if (!st) { st = document.createElement('style'); st.id = 'probe-css'; document.head.appendChild(st); }
  st.textContent = css || '';
}
function ensureLayer(type) {
  let L = FM.scene.layers.find(l => l.type === (type || 'shape'));
  if (!L) {
    L = FM.makeLayer(type || 'shape', type === 'text' ? { text: 'Hello', x: 540, y: 960 } : { name: 'Star', shape: 'star', x: 540, y: 960, shapeW: 400, shapeH: 400, fill: '#3a7bd5' });
    L.start = 0; L.duration = 3; FM.scene.layers.push(L);
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.requestRender) FM.requestRender();
  }
  return L;
}
async function setState(st) {
  if (st.tlh) ROOT.style.setProperty('--tl-h', st.tlh + 'px'); else ROOT.style.removeProperty('--tl-h');
  if (st.amh) { ROOT.style.setProperty('--am-h', st.amh + 'px'); document.body.classList.add('am-floating'); if (FM._amRepin) FM._amRepin(); }
  else { ROOT.style.removeProperty('--am-h'); document.body.classList.remove('am-floating'); }
  if (st.mode === 'insp') { const L = ensureLayer(st.ltype); FM.selectLayer(L.id); }
  else FM.selectLayer(null);
  await sleep(350);
  if (st.mode === 'add' && st.tab) {
    const t = [...PANEL().querySelectorAll('.addmenu-tab')].find(b => (b.textContent || '').trim().toLowerCase().startsWith(st.tab));
    if (t && !t.classList.contains('active')) { t.click(); await sleep(250); }
  }
  window.dispatchEvent(new Event('resize'));
  await sleep(450);
}
function lineTops(el) {
  const rg = document.createRange(); rg.selectNodeContents(el);
  const m = new Map(); [...rg.getClientRects()].forEach(q => { if (q.width > 0.5) m.set(Math.round(q.top), q); });
  return [...m.values()];
}
function measureTiles(sel, lblSel, icoSel) {
  const panel = PANEL(), pr = panel.getBoundingClientRect();
  const cards = [...panel.querySelectorAll(sel)].filter(c => {
    const r = c.getBoundingClientRect(); const pg = c.closest('.addmenu-pager'); const b = pg ? pg.getBoundingClientRect() : pr;
    return r.width > 0 && r.height > 0 && r.left >= b.left - 1 && r.right <= b.right + 1 && r.bottom > pr.top && r.top < pr.bottom;
  });
  const o = { n: cards.length, size: {}, ico: {}, fs: {}, lines: {}, bad: [] };
  const rs = cards.map(c => c.getBoundingClientRect());
  cards.forEach((c, i) => {
    const r = rs[i];
    const k = r1(r.width) + 'x' + r1(r.height); o.size[k] = (o.size[k] || 0) + 1;
    const ic = c.querySelector(icoSel); if (ic) { const w = r1(ic.getBoundingClientRect().width); o.ico[w] = (o.ico[w] || 0) + 1; }
    const lb = c.querySelector(lblSel); if (!lb) return;
    const cs = getComputedStyle(lb), fs = parseFloat(cs.fontSize);
    const name = (lb.textContent || '').trim().slice(0, 14);
    if (cs.display === 'none' || cs.visibility === 'hidden' || lb.getBoundingClientRect().height < 1) { o.fs['hidden'] = (o.fs['hidden'] || 0) + 1; return; }
    o.fs[fs] = (o.fs[fs] || 0) + 1;
    const lr = lb.getBoundingClientRect(), clipV = cs.overflow !== 'visible';
    const tops = lineTops(lb);
    let full = 0, part = 0, out = 0;
    tops.forEach(q => {
      const top = clipV ? Math.max(q.top, lr.top) : q.top, bot = clipV ? Math.min(q.bottom, lr.bottom) : q.bottom;
      const vis = bot - top;
      if (vis >= q.height - 1) full++; else if (vis > 0.5) part++;
      if (vis > 0.5 && (bot > r.bottom + 0.5 || top < r.top - 0.5 || q.left < r.left - 0.5 || q.right > r.right + 0.5)) out++;
    });
    o.lines[full] = (o.lines[full] || 0) + 1;
    if (part) o.bad.push('part:' + name);
    if (out) o.bad.push('out:' + name);
    if (full < tops.length && !part) o.bad.push('lost:' + name);   // whole lines that were cut away
    if (lb.scrollWidth > lb.clientWidth + 1 && cs.textOverflow === 'ellipsis') o.bad.push('ell:' + name);
    // label vs icon overlap
    const ic2 = c.querySelector(icoSel);
    if (ic2) { const ir = ic2.getBoundingClientRect(); if (tops.some(q => q.top < ir.bottom - 1 && q.bottom > ir.top + 1 && q.left < ir.right - 1 && q.right > ir.left + 1)) o.bad.push('overlap:' + name); }
  });
  if (rs.length > 1) {
    const row0 = rs.filter(q => Math.abs(q.top - rs[0].top) < 1);
    o.cols = row0.length; o.rows = new Set(rs.map(q => Math.round(q.top))).size;
    if (row0.length > 1) o.gx = r1(row0[1].left - row0[0].right);
    const nx = rs.find(q => q.top > rs[0].bottom - 1); if (nx) o.gy = r1(nx.top - rs[0].bottom);
    o.top = r1(Math.min(...rs.map(q => q.top)) - pr.top); o.bot = r1(Math.max(...rs.map(q => q.bottom)) - pr.top);
    o.minTap = r1(Math.min(...rs.map(q => Math.min(q.width, q.height))));
  }
  return o;
}
function fmt(o) {
  const kv = (m) => Object.entries(m).map(([k, v]) => k + (v > 1 ? '×' + v : '')).join(',');
  return `n${o.n} ${o.cols || 1}c${o.rows || 1}r sz[${kv(o.size)}] ico[${kv(o.ico)}] fs[${kv(o.fs)}] ln[${kv(o.lines)}] g${o.gx ?? '-'}/${o.gy ?? '-'} top${o.top} bot${o.bot}` + (o.bad.length ? ' BAD{' + o.bad.join(' ') + '}' : '');
}
function measureNow() {
  const panel = PANEL(), pr = panel.getBoundingClientRect();
  const isAdd = !!panel.querySelector('.addmenu');
  let s = `${isAdd ? 'ADD' : 'INS'} p${r1(pr.width)}x${r1(pr.height)} sc${panel.scrollHeight - panel.clientHeight}`;
  if (isAdd) {
    const am = panel.querySelector('.addmenu');
    const tab = panel.querySelector('.addmenu-tab.active');
    s += ` tab:${tab ? tab.textContent.trim().slice(0, 4) : '?'} fit:${am.classList.contains('addmenu--fit') ? 1 : 0} pg${panel.querySelectorAll('.addmenu-page').length}`;
    s += '\n   TABS ' + fmt(measureTiles('.addmenu-tab', '.addmenu-lbl', '.addmenu-ic svg'));
    s += '\n   CARDS ' + fmt(measureTiles('.addmenu-pinned .addmenu-card, .addmenu-body .addmenu-card', '.addmenu-lbl', '.addmenu-ic svg, .addmenu-ic .add-emoji'));
  } else {
    s += '\n   CARDS ' + fmt(measureTiles('#inspector .cat-card', '.cat-label', '.cat-ico svg'));
  }
  return s;
}
