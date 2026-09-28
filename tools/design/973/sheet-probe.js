const sleep = ms => new Promise(r => setTimeout(r, ms));
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(600);
const PHONE = !!(FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone());
const MODE = window.__mode || 'sheet';   // 'menu' = the real phone Add > Shape page holding the Car; 'sheet' = renderScene sheet; 'corners' = PC selection
const out = {};
if (MODE === 'menu') {
  FM.mobile.openAdd();
  await sleep(500);
  const tab = document.querySelector('#add-sheet .addmenu-tab[data-key="shape"]');
  if (tab && !tab.classList.contains('active')) tab.click();
  await sleep(450);
  const tile = document.querySelector('#add-sheet .addmenu-card[title="Car"]');
  if (!tile) return 'no Car tile';
  const page = tile.closest('.addmenu-page'), pager = tile.closest('.addmenu-pager');
  const pages = Array.from(page.parentNode.children).filter(e => e.classList.contains('addmenu-page'));
  pager.scrollLeft = pages.indexOf(page) * pager.clientWidth;
  await sleep(350);
  const names = Array.from(page.querySelectorAll('.addmenu-card')).map(c => c.title);
  const ic = tile.querySelector('.addmenu-ic svg').getBoundingClientRect();
  return { page: pages.indexOf(page) + 1, of: pages.length, names: names, carIcon: [Math.round(ic.width), Math.round(ic.height)] };
}
if (MODE === 'corners') {
  const A = FM.makeLayer('shape', { name: 'Rectangle', shape: 'rect', x: 540, y: 700, shapeW: 420, shapeH: 300, fill: '#e0603a', start: 0, duration: 3 });
  FM.insertLayer ? FM.insertLayer(A) : FM.scene.layers.push(A);
  FM.selectLayer(A.id); FM.refreshAll(); await sleep(500);
  const r = document.getElementById('t-sel').getBoundingClientRect();
  const cs = getComputedStyle(document.getElementById('t-sel'), '::before');
  return { rect: [r.left, r.top, r.width, r.height], dpr: devicePixelRatio, colour: cs.borderTopColor };
}
// ---- the sheet: FM.renderScene, big and at the Shape menu's 34px (1x, blown up 4x with no smoothing) ----
const KINDS = (window.__kinds || ['car', 'carfront', 'eye']).filter(k => FM.SHAPE_POLYS[k]);
const LABEL = { car: 'Car', carfront: 'Car (front)', eye: 'Eye' };
const wrap = document.createElement('div');
wrap.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#11161b;color:#e8eef2;font:600 15px/1.3 system-ui,-apple-system,sans-serif;padding:18px;display:flex;flex-direction:column;gap:14px;overflow:hidden';
const title = document.createElement('div');
title.textContent = window.__title || '';
title.style.cssText = 'font:800 20px/1.2 system-ui;color:#fff';
wrap.appendChild(title);
function render(kind, S, boxW, boxH, bg, fill) {
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const L = FM.makeLayer('shape', { shape: kind, name: kind, x: S / 2, y: S / 2, shapeW: boxW, shapeH: boxH, fill: fill, start: 0, duration: 5 });
  FM.renderScene(c.getContext('2d'), { project: { width: S, height: S, fps: 30, duration: 5, background: bg }, layers: [L], selectedId: null, selectedIds: [] }, 0);
  return c;
}
KINDS.forEach(kind => {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:16px;background:#1b232a;border-radius:14px;padding:12px';
  const asp = (FM.SHAPE_ASPECT && FM.SHAPE_ASPECT[kind]) || [1, 1];
  const name = document.createElement('div');
  name.textContent = LABEL[kind] || kind;
  name.style.cssText = 'width:92px;font:800 17px/1.2 system-ui';
  row.appendChild(name);
  // big, the spawn proportions, at 2x for the screenshot
  const B = 190, kb = B / Math.max(asp[0], asp[1]);
  const big = render(kind, B * 2, asp[0] * kb * 2, asp[1] * kb * 2, '#0b0f13', '#ffffff');
  big.style.cssText = 'width:' + B + 'px;height:' + B + 'px;border-radius:10px';
  row.appendChild(big);
  // the menu icon: 34px tile, shape in 18 of 24 units at its aspect — rendered at 1x, shown 4x
  const S = 34, k = (18 / Math.max(asp[0], asp[1])) * S / 24;
  const small = render(kind, S, asp[0] * k, asp[1] * k, '#2a343c', '#ffffff');
  small.style.cssText = 'width:' + (S * 4) + 'px;height:' + (S * 4) + 'px;image-rendering:pixelated;border-radius:8px';
  const col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px';
  col.appendChild(small);
  const cap = document.createElement('div'); cap.textContent = '34px icon, 4x'; cap.style.cssText = 'font:500 12px system-ui;color:#9fb0bc';
  col.appendChild(cap);
  row.appendChild(col);
  // and at its real size
  const real = render(kind, S * 2, asp[0] * k * 2, asp[1] * k * 2, '#2a343c', '#ffffff');
  real.style.cssText = 'width:' + S + 'px;height:' + S + 'px;border-radius:6px';
  const col2 = document.createElement('div');
  col2.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px';
  col2.appendChild(real);
  const cap2 = document.createElement('div'); cap2.textContent = 'real size'; cap2.style.cssText = 'font:500 12px system-ui;color:#9fb0bc';
  col2.appendChild(cap2);
  row.appendChild(col2);
  wrap.appendChild(row);
});
document.body.appendChild(wrap);
await sleep(200);
return { kinds: KINDS };
