// proto-glue.js — PROTOTYPE ONLY. Drives the two panels with FM.tileFit the way the real hooks in js/addmenu.js and
// js/inspector.js will (plan.md §5), by re-arranging the DOM the app already drew. Needs probe-lib.js + tilefit.js first.
function protoInspBox(wrap) {
  const sc = document.getElementById('inspector');
  const sr = sc.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
  const top = wr.top - sr.top - sc.clientTop + sc.scrollTop;
  const padB = parseFloat(getComputedStyle(sc).paddingBottom) || 0;
  const h = sc.clientHeight - top - padB - 1, w = wrap.clientWidth;
  return (w > 40 && h > 20) ? { w, h } : null;
}
function protoInsp(ladder, gate) {
  const wrap = document.querySelector('#inspector > .cat-wrap');
  if (!wrap) return 'no wrap';
  FM.tileFit.apply(wrap, null);
  const n = wrap.querySelectorAll('.cat-card').length;
  wrap.querySelectorAll('.cat-card').forEach(c => { const l = c.querySelector('.cat-label'); if (l && !c.title) { c.title = l.textContent; c.setAttribute('aria-label', l.textContent); } });
  const box = protoInspBox(wrap);
  let p = box && FM.tileFit.plan(n, box.w, box.h, { ladder, gate, fill: true });
  let b = box;
  if (p && p.pages > 1) {   // the inspector never pages: keep the tile, let the list scroll (option B's honest end)
    p = Object.assign({}, p, { rows: Math.ceil(n / p.cols), pages: 1 });
    b = { w: box.w, h: p.rows * p.h + (p.rows - 1) * FM.tileFit.GAP };
  }
  FM.tileFit.apply(wrap, p, b);
  return wrap.dataset.tf || 'none';
}
function protoAdd(ladder, compactTabs, gate) {
  const panel = PANEL(), root = panel.querySelector('.addmenu');
  if (!root) return 'no add';
  const body = root.querySelector('.addmenu-body');
  const act = root.querySelector('.addmenu-tab.active');
  const iconOnly = act && act.dataset.key === 'shape';
  const cards = [...body.querySelectorAll('.addmenu-page .addmenu-card')];
  const pictures = cards.some(c => c.classList.contains('addmenu-media') || c.querySelector('img'));
  const lad = iconOnly ? ['ico'] : (pictures ? ['stack'] : ladder);
  const container = document.getElementById('inspector');
  function fitBox(reserve) {
    const pr = panel.getBoundingClientRect(), br = body.getBoundingClientRect();
    const top = br.top - pr.top - panel.clientTop + panel.scrollTop;
    const padB = parseFloat(getComputedStyle(container).paddingBottom) || 0;
    const h = panel.clientHeight - top - padB - reserve - 2, w = body.clientWidth;
    return (w > 40 && h > 20) ? { w, h } : null;
  }
  function fit() {
    const b0 = fitBox(0), p0 = b0 && FM.tileFit.plan(cards.length, b0.w, b0.h, { ladder: lad, gate });
    if (p0 && p0.pages === 1) return [p0, b0];
    const bD = fitBox(26), pD = bD && FM.tileFit.plan(cards.length, bD.w, bD.h, { ladder: lad, gate });
    return pD ? [pD, bD] : [null, null];
  }
  root.classList.remove('addmenu--tabs-ico');
  // clear any plan so the body's natural top is measured
  let [p, box] = fit();
  // THE TAB ROW'S WORDS: decided once per panel size from the Elements tab (9 labelled items) in the box a tab with no
  // pinned strip gets — so every tab shows the same tab row at the same size (no 64↔36 jump when switching tabs).
  function tabsSettled() {
    const tabsEl = root.querySelector('.addmenu-tabs'), main = root.querySelector('.addmenu-main');
    const pr = panel.getBoundingClientRect(), tr = tabsEl.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(main).rowGap) || 0;
    const top = tr.bottom - pr.top - panel.clientTop + panel.scrollTop + gap;
    const padB = parseFloat(getComputedStyle(container).paddingBottom) || 0;
    const h = panel.clientHeight - top - padB - 2, w = body.clientWidth;
    const ref = (w > 40 && h > 20) ? FM.tileFit.plan(9, w, h, { ladder: ladder, gate }) : null;
    return FM.tileFit.settled(ref);
  }
  if (compactTabs === 'settle' ? !tabsSettled() : (compactTabs === 'null' && !p)) {
    root.classList.add('addmenu--tabs-ico');
    [p, box] = fit();
  }
  if (!p) return 'no plan';
  // rebuild the pages to the plan (the real render does this with plan.perPage from the start)
  const pager = body.querySelector('.addmenu-pager');
  pager.innerHTML = '';
  for (let i = 0; i < cards.length; i += p.perPage) {
    const page = document.createElement('div'); page.className = 'addmenu-page';
    const grid = document.createElement('div'); grid.className = 'addmenu-grid' + (iconOnly ? ' addmenu-grid--ico' : '');
    cards.slice(i, i + p.perPage).forEach(c => grid.appendChild(c));
    page.appendChild(grid); pager.appendChild(page);
  }
  // the pager row, as the real render draws it for more than one page (‹ dots ›)
  let dots = body.querySelector('.addmenu-dots');
  if (dots) dots.remove();
  if (p.pages > 1) {
    dots = document.createElement('div'); dots.className = 'addmenu-dots addmenu-dots--pc';
    const arrow = (g) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'addmenu-pgbtn'; b.textContent = g; return b; };
    dots.appendChild(arrow('\u2039'));
    for (let d = 0; d < p.pages; d++) { const sp = document.createElement('span'); sp.className = 'addmenu-dot' + (d ? '' : ' on'); dots.appendChild(sp); }
    dots.appendChild(arrow('\u203A'));
    body.appendChild(dots);
  }
  root.classList.add('addmenu--fit');
  FM.tileFit.apply(root, p, box);
  // the OLD fit CSS still reads --am-*; mirror so it agrees (the real change renames them — plan.md §5)
  const s = root.style;
  s.setProperty('--am-cols', p.cols); s.setProperty('--am-cw', p.w + 'px'); s.setProperty('--am-row', p.h + 'px');
  s.setProperty('--am-ico', p.ico + 'px'); s.setProperty('--am-fs', (p.fs || 10.5) + 'px'); s.setProperty('--am-lblh', (p.lblH || 0) + 'px');
  s.setProperty('--am-pad', p.padV + 'px ' + p.padH + 'px'); s.setProperty('--am-icogap', (p.kind === 'row' ? 5 : p.icoGap) + 'px');
  s.setProperty('--am-gap', '8px'); s.setProperty('--am-pager', box.h + 'px');
  return (root.dataset.tf || '') + (root.classList.contains('addmenu--tabs-ico') ? ' tabs-ico' : '');
}
async function protoState(st, opt) {
  await setState(st);
  // the ResizeObserver in addmenu.js re-renders on a size change; let it settle before re-arranging
  await sleep(200);
  if (!opt) return 'now';
  return st.mode === 'insp' ? protoInsp(opt.ladder, opt.gate) : protoAdd(opt.ladder, opt.tabs, opt.gate);
}
const OPTS = {
  A: { ladder: ['stack', 'icon'], gate: { stack: 22 }, tabs: 'settle' },
  B: { ladder: ['stack'], gate: {}, tabs: 'never' },
  C: { ladder: ['stack', 'row', 'icon'], gate: { stack: 22 }, tabs: 'settle' },
};
