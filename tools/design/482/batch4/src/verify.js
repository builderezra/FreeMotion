/* #482 batch 4 — proof that the canvas in the pictures is the app's own render, not a stand-in: read the live preview
   canvas with the pick at strength 0 (preview off), 0.4 and 1, and report the mean colour and the mean difference from
   the original. Run after setup.js + options.js. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cv = document.getElementById('preview');
const saved = FM._fxPreview || window.__b4saved;
async function grab(s) {
  if (s === 0) FM._fxPreview = null;
  else { FM._fxPreview = saved; saved.list.forEach(b => { b.params.strength = s; }); }
  FM.requestRender(); await sleep(700);
  const c = document.createElement('canvas'); c.width = 120; c.height = Math.round(120 * cv.height / cv.width);
  c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
  return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
}
const a = await grab(0), b = await grab(0.4), c = await grab(1);
const mean = d => { let r = 0, g = 0, bl = 0, n = d.length / 4; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; } return [r / n, g / n, bl / n].map(v => Math.round(v)); };
const diff = (x, y) => { let s = 0; for (let i = 0; i < x.length; i += 4) s += Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]); return +(s / (x.length / 4 * 3)).toFixed(2); };
await grab(0.4);
return { canvas: [cv.width, cv.height], mean0: mean(a), mean40: mean(b), mean100: mean(c), diff40: diff(a, b), diff100: diff(a, c) };
