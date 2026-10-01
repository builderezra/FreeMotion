/* #482 batch 4 — put the app in the state the options are drawn over: a real photo on an image layer, the inspector's
   Filters tab open, and one filter PICKED (tapped, not added) so today's commit bar is up and the canvas shows the pick
   through the app's own preview path (FM._fxPreview). Runs inside the app; changes nothing on disk.
   window.__b4photo picks the photo (default 'mclaren'), window.__b4pick the filter (default Teal & Orange). */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PHOTO = window.__b4photo || 'mclaren', PICK = window.__b4pick || 'tealorange';
const P = FM.scene.project, PW = P.width, PH = P.height;
const im = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('no photo')); i.src = 'fx-art/' + PHOTO + '.jpg?v=1'; });
// Cover-crop the square photo into the project frame, so the layer fills the canvas like a real clip would.
const plate = document.createElement('canvas'); plate.width = PW; plate.height = PH;
const g = plate.getContext('2d'); g.imageSmoothingQuality = 'high';
const s = Math.max(PW / im.naturalWidth, PH / im.naturalHeight);
const sw = PW / s, sh = PH / s, sx = (im.naturalWidth - sw) / 2 + (window.__b4dx || 0) * im.naturalWidth, sy = (im.naturalHeight - sh) / 2;
g.drawImage(im, Math.max(0, Math.min(im.naturalWidth - sw, sx)), sy, sw, sh, 0, 0, PW, PH);
FM.scene.layers.length = 0;
const L = FM.makeLayer('image', { name: PHOTO + '.jpg', x: PW / 2, y: PH / 2 });
L.start = 0; L.duration = 5;
FM.media.set(L.id, { kind: 'image', el: plate, width: PW, height: PH, duration: 0 });
if (FM.media.pin) FM.media.pin(L.id);
FM.scene.layers.push(L);
if (window.__b4extra) {   // more clips for the Add-to-all picture (other photos, same treatment)
  for (const nm of window.__b4extra) {
    const im2 = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = 'fx-art/' + nm + '.jpg?v=1'; });
    const c2 = document.createElement('canvas'); c2.width = PW; c2.height = PH;
    c2.getContext('2d').drawImage(im2, (im2.naturalWidth - sw) / 2, sy, sw, sh, 0, 0, PW, PH);
    const L2 = FM.makeLayer('image', { name: nm + '.jpg', x: PW / 2, y: PH / 2 }); L2.start = 0; L2.duration = 5;
    FM.media.set(L2.id, { kind: 'image', el: c2, width: PW, height: PH, duration: 0 });
    FM.scene.layers.push(L2);
  }
}
if (FM.scene.project.duration < 5) FM.scene.project.duration = 5;
FM.time = 1;
FM.selectLayer(L.id); FM.refreshAll();
FM.inspector.openCategory('filters'); FM.inspector.refresh();
await sleep(500);
// Pick the filter the way he does — a tap on its tile — so the bar, the badge and the canvas preview are the app's own.
const tile = document.querySelector('#inspector-panel .flt-tile[data-fltid="' + PICK + '"]');
if (tile && !window.__b4nopick) tile.click();
await sleep(300);
if (tile && !window.__b4nopick) { tile.scrollIntoView({ block: 'center' }); }
FM.requestRender && FM.requestRender();
await sleep(2900);   // any toast clears
const panel = document.getElementById('inspector-panel');
const pr = panel ? panel.getBoundingClientRect() : null;
const bar = document.querySelector('#inspector-panel .flt-commit');
const br = bar ? bar.getBoundingClientRect() : null;
const cv = document.querySelector('#stage canvas, canvas#stage, .stage canvas, #preview canvas, canvas');
const cr = cv ? cv.getBoundingClientRect() : null;
return {
  vw: innerWidth, vh: innerHeight,
  panel: pr && { top: pr.top, bottom: pr.bottom, left: pr.left, right: pr.right, h: pr.height },
  bar: br && { top: br.top, bottom: br.bottom, h: br.height, w: br.width, hidden: bar.classList.contains('hidden') },
  canvas: cr && { top: cr.top, bottom: cr.bottom, left: cr.left, right: cr.right, id: cv.id, cls: cv.className },
  picked: !!(tile && tile.classList.contains('is-picked')),
  preview: !!FM._fxPreview,
};
