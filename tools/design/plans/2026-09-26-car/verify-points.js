// For the builder, AFTER the change (written by the plan review, NOT run — ship.sh held the machine):
//   python3 tools/shot.py --width 380 --height 800 --js-file <this> --wait 900 --out /tmp/car-points-380.png
// Adds a big Car, selects it and enters Edit Points (FM.pointEdit.start, the same call inspector.js makes), so the
// screenshot shows every handle on the new outline. Look for: handles ON the outline, no stray loops at the wheel bumps.
const sleep = ms => new Promise(r => setTimeout(r, ms));
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(700);
FM.addShapeLayer('car', { name: 'Car' });
const L = FM.scene.layers.filter(l => l.shape === 'car').slice(-1)[0];
const P = FM.scene.project, side = Math.round(Math.min(P.width, P.height) * 0.9);
L.shapeW = side; L.shapeH = side;
FM.selectLayer(L.id);
if (FM.refreshAll) FM.refreshAll();
await sleep(300);
if (!FM.pointEdit || !FM.pointEdit.start) return 'no FM.pointEdit.start';
FM.pointEdit.start(L.id);
await sleep(500);
return { active: FM.pointEdit.isActive && FM.pointEdit.isActive(), layer: FM.pointEdit.layerId && FM.pointEdit.layerId() === L.id,
         points: FM.SHAPE_POLYS.car.reduce((n, s) => n + s.length, 0) };
