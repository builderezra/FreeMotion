/* #482 polish batch 5 looks (5.3 Teal & Orange, 5.4 Tint, 5.5 Duotone) - the byte-identity capture. Run INSIDE the app on the
   build BEFORE the change (v17.20, 1403309a) and on this one: every hash must match. These are the numbers pinned in the test
   '482 5.3 Teal & Orange, 5.4 Tint and 5.5 Duotone - every new control is in the catalogue...' (same fixture as polish 1).
   Usage: python3 tools/design/482/polish5/looks/probe5.py PORT tools/design/482/polish5/looks/defaults5.js */
const tex = (() => { const c = document.createElement('canvas'); c.width = 200; c.height = 150; const tc = c.getContext('2d'), ti = tc.createImageData(200, 150);
  for (let y = 0; y < 150; y++) for (let x = 0; x < 200; x++) { const i = (y * 200 + x) * 4; ti.data[i] = (x * 255 / 199) | 0; ti.data[i + 1] = (y * 255 / 149) | 0; ti.data[i + 2] = ((x * 7 + y * 13) % 256); ti.data[i + 3] = 255; }
  tc.putImageData(ti, 0, 0); return c; })();
const hash = (x, cv) => { const d = x.getImageData(0, 0, cv.width, cv.height).data; let h = 0x811c9dc5 >>> 0; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; } return ('00000000' + h.toString(16)).slice(-8); };
const shots = layers => [[240, 0.7], [120, 1.3]].map(([w, t]) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = w * 3 / 4; const x = cv.getContext('2d', { willReadFrequently: true });
  FM.renderScene(x, { project: { width: 240, height: 180, fps: 30, duration: 4, background: '#102030' }, layers: layers, selectedId: null, selectedIds: [] }, t); return hash(x, cv); }).join('/');
const ids = [];
const clip = () => { const L = FM.makeLayer('image', { name: 'b5 clip', x: 120, y: 90, start: 0, duration: 4 }); L.start = 0; L.duration = 4; FM.media.set(L.id, { kind: 'image', el: tex, width: 200, height: 150 }); ids.push(L.id); return L; };
const shape = () => { const L = FM.makeLayer('shape', { shape: 'ellipse', x: 110, y: 95, shapeW: 120, shapeH: 80, fill: '#c06040', start: 0, duration: 4 }); L.start = 0; L.duration = 4; return L; };
const SAVED = {
  tealorange: [{ amount: 0.6 }, { amount: 0.8, pivot: 35, spread: 60 }],
  tint: [{ amount: 1, color: '#ff3366' }, { amount: 0.7, color: '#3080ff', range: 2, preserve: 1 }, { amount: 0.5, color: '#20c080', range: 1 }],
  duotone: [{ amount: 1, color: '#241a52', color2: '#ff9e5e' }, { amount: 0.8, color: '#102040', color2: '#ffd080', balance: 30, contrast: 140 }],
};
const out = {};
try {
  Object.keys(SAVED).forEach(type => {
    ['image', 'shape'].forEach(kind => { const L = kind === 'image' ? clip() : shape(); L.effects = [FM.fxRegistry.makeInstance(type)]; out[type + '/new/' + kind] = shots([L]); });
    SAVED[type].forEach((p, i) => { const L = clip(); L.effects = [{ type: type, enabled: true, params: Object.assign({}, p) }]; out[type + '/saved' + i] = shots([L]); });
    if (type !== 'tealorange') SAVED[type].forEach((p, i) => { const L = clip(); const A = FM.makeLayer('adjustment', { name: 'grade' }); A.start = 0; A.duration = 4; A.effects = [{ type: type, enabled: true, params: Object.assign({}, p) }]; out[type + '/adj' + i] = shots([A, L]); });
  });
  const all = FM.filters.all(); out.nfilters = all.length;
  const f = {}; all.forEach(fl => { const L = clip(); L.effects = [FM.filters.makeInstance(fl.id)]; f[fl.id] = shots([L]); });
  out.filters = f;
  out.inst = { tealorange: FM.fxRegistry.makeInstance('tealorange').params, tint: FM.fxRegistry.makeInstance('tint').params, duotone: FM.fxRegistry.makeInstance('duotone').params };
} finally { ids.forEach(id => FM.media.remove(id)); }
return out;
