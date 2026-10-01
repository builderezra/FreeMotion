/* #482 batch 4 — choosing the demo photo + filter: which pairing shows original / 40 % / 100 % clearly apart.
   Draws a contact grid over the page (FM.renderScene on a real image layer, the real filter container at a given
   strength) and returns the mean difference per tile. A working probe, not part of the sheet. */
const PH = ['mclaren', 'run', 'pair', 'figures', 'dog', 'huracan'];
const FL = ['tealorange', 'coldsteel', 'nightdrive', 'bleach', 'moonlight', 'lowkey'];
const R = 180;
const ims = {};
for (const p of PH) ims[p] = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = 'fx-art/' + p + '.jpg?v=1'; });
function render(p, fid, s) {
  const id = '_b4p_' + p;
  if (!FM.media.get(id)) { const c = document.createElement('canvas'); c.width = R; c.height = R; c.getContext('2d').drawImage(ims[p], 0, 0, R, R); FM.media.set(id, { kind: 'image', el: c, width: R, height: R, duration: 0 }); }
  const l = FM.makeLayer('image', { x: R / 2, y: R / 2, start: 0, duration: 2 }); l.id = id;
  if (fid) { const b = FM.fxRegistry.fitToLayer(FM.filters.makeInstance(fid), l); b.params.strength = s; l.effects = [b]; }
  const c = document.createElement('canvas'); c.width = R; c.height = R;
  FM.renderScene(c.getContext('2d', { willReadFrequently: true }), { project: { width: R, height: R, fps: 30, duration: 2, background: '#000' }, layers: [l] }, 0.5);
  return c;
}
const ov = document.createElement('div');
ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#111;display:grid;grid-template-columns:repeat(6,1fr);gap:2px;overflow:hidden';
document.body.appendChild(ov);
const out = [];
for (const fid of FL.slice(0, 3)) for (const p of PH.slice(0, 4)) {
  const a = render(p, null), b = render(p, fid, 0.4), c = render(p, fid, 1);
  [a, b, c].forEach(cv => { cv.style.cssText = 'width:100%;display:block'; });
  const da = a.getContext('2d').getImageData(0, 0, R, R).data, dc = c.getContext('2d').getImageData(0, 0, R, R).data;
  let sum = 0; for (let i = 0; i < da.length; i += 4) sum += Math.abs(da[i] - dc[i]) + Math.abs(da[i + 1] - dc[i + 1]) + Math.abs(da[i + 2] - dc[i + 2]);
  out.push(fid + '/' + p + ':' + (sum / (R * R * 3)).toFixed(1));
  ov.appendChild(a); ov.appendChild(b); ov.appendChild(c);
}
return { out, clip: { x: 0, y: 0, width: innerWidth, height: innerHeight } };
