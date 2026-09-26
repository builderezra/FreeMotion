// For the builder, AFTER the change: python3 tools/shot.py --width 380 --height 800 --js-file <this> --out /tmp/car-380.png
// Adds a Car big on the stage, opens Add > Shape on the Car's page (phone sheet, or the PC inspector), outlines the tile,
// and returns the tile's icon size, its page, the car's point count and SHAPE_ASPECT.car (the 34px numbers are the test's job).
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PC = !(FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone());
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(700);
FM.addShapeLayer('car', { name: 'Car' });
const L = FM.scene.layers.filter(l => l.shape === 'car').slice(-1)[0];
const P = FM.scene.project, side = Math.round(Math.min(P.width, P.height) * 0.9);
L.shapeW = side; L.shapeH = side;
FM.selectLayer(null);
if (FM.refreshAll) FM.refreshAll();
if (PC) FM.addMenu.openTab('shape');
else {
  FM.mobile.openAdd(); await sleep(450);
  const tab = document.querySelector('#add-sheet .addmenu-tab[data-key="shape"]');
  if (tab && !tab.classList.contains('active')) tab.click();
}
await sleep(400);
const root = PC ? document.querySelector('#inspector-panel') : document.querySelector('#add-sheet');
const tile = root && root.querySelector('.addmenu-card[title="Car"]');
if (!tile) return 'no Car tile';
const page = tile.closest('.addmenu-page'), pager = tile.closest('.addmenu-pager');
const pages = Array.from(page.parentNode.children).filter(e => e.classList.contains('addmenu-page'));
pager.scrollLeft = pages.indexOf(page) * pager.clientWidth;
await sleep(250);
tile.style.outline = '2px solid #ffeb3b'; tile.style.outlineOffset = '1px';
const r = tile.querySelector('svg').getBoundingClientRect();
return { iconCss: [Math.round(r.width), Math.round(r.height)], page: pages.indexOf(page) + 1, pages: pages.length,
         carPoints: FM.SHAPE_POLYS.car.reduce((n, s) => n + s.length, 0), aspect: FM.SHAPE_ASPECT.car };
