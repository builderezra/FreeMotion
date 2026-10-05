/* #482 polish batch 6 light (6.1 Vignette, 6.2 Light / Soft / Dark Glow) - the byte-identity capture. Run INSIDE the app on the
   build BEFORE the change (v17.21, 28104a3e) and on this one: every hash must match. These are the numbers pinned in the test
   '482 6.0 Vignette and the three Glows - every new control is in the catalogue ...' (batch 1's fixture, three plates: the
   export at t 0.7, a half-size preview at t 1.3 and a 0.3 phone plate at t 2.1).
   Usage: python3 tools/design/482/polish6/light/probe6.py PORT tools/design/482/polish6/light/defaults6.js */
const tex = (() => { const c = document.createElement('canvas'); c.width = 200; c.height = 150; const tc = c.getContext('2d'), ti = tc.createImageData(200, 150);
  for (let y = 0; y < 150; y++) for (let x = 0; x < 200; x++) { const i = (y * 200 + x) * 4; ti.data[i] = (x * 255 / 199) | 0; ti.data[i + 1] = (y * 255 / 149) | 0; ti.data[i + 2] = ((x * 7 + y * 13) % 256); ti.data[i + 3] = 255; }
  tc.putImageData(ti, 0, 0); return c; })();
const hash = (x, cv) => { const d = x.getImageData(0, 0, cv.width, cv.height).data; let h = 0x811c9dc5 >>> 0; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; } return ('00000000' + h.toString(16)).slice(-8); };
const shots = (layers, PW, PH) => { PW = PW || 240; PH = PH || 180; return [[1, 0.7, 0], [0.5, 1.3, 0], [0.3, 2.1, 1]].map(([rs, t, stamp]) => { const cv = document.createElement('canvas'); cv.width = Math.round(PW * rs); cv.height = Math.round(PH * rs);
  if (stamp) { cv.__fmRS = rs; cv.__fmOX = 0; cv.__fmOY = 0; }
  const x = cv.getContext('2d', { willReadFrequently: true });
  FM.renderScene(x, { project: { width: PW, height: PH, fps: 30, duration: 4, background: '#102030' }, layers: layers, selectedId: null, selectedIds: [] }, t); return hash(x, cv); }).join('/'); };
const ids = [];
const clip = (o) => { o = o || {}; const L = FM.makeLayer('image', { name: 'b6 clip', x: o.x || 120, y: o.y || 90, start: 0, duration: 4 }); L.start = 0; L.duration = 4; if (o.scale) L.transform.scale = o.scale; if (o.rot) L.transform.rotation = o.rot; FM.media.set(L.id, { kind: 'image', el: tex, width: 200, height: 150 }); ids.push(L.id); return L; };
const shape = () => { const L = FM.makeLayer('shape', { shape: 'ellipse', x: 110, y: 95, shapeW: 120, shapeH: 80, fill: '#e0d0a0', start: 0, duration: 4 }); L.start = 0; L.duration = 4; return L; };
const text = () => { const L = FM.makeLayer('text', { text: 'GLOW', x: 100, y: 70, fontSize: 64, color: '#e0b060' }); /* a warm colour, not white: a glow screened over white text is white, which would prove nothing */ L.start = 0; L.duration = 4; return L; };
const darkText = () => { const L = FM.makeLayer('text', { text: 'DARK', x: 120, y: 90, fontSize: 56, color: '#202020' }); L.start = 0; L.duration = 4; return L; };
const kf = (a, b) => ({ kf: [{ t: 0, v: a, e: 'linear' }, { t: 4, v: b, e: 'linear' }] });
const SAVED = {
  vignette: [{ amount: 0.6, size: 35 }, { amount: 0.9, size: 10 }, { amount: 0.3, size: 60 }, { amount: kf(0.2, 0.9), size: 25 }],
  lightglow: [{ amount: 0.6, radius: 6, threshold: 60, color: '#ffffff' }, { amount: 0.8, radius: 26, threshold: 45, color: '#ffd080' }, { amount: 0.4, radius: 10, threshold: 30 }],
  softglow: [{ amount: 0.6, radius: 100, threshold: 35, color: '#ffffff' }, { amount: 0.45, radius: 130, threshold: 40, color: '#80c0ff' }, { amount: 0.9, radius: 400, threshold: 22 }],
  darkglow: [{ amount: 0.6, radius: 6, threshold: 40 }, { amount: 0.9, radius: 20, threshold: 70 }],
};
const out = {};
try {
  Object.keys(SAVED).forEach(type => {
    [['image', clip], ['shape', shape], ['text', type === 'darkglow' ? darkText : text]].forEach(([kind, mk]) => { const L = mk(); L.effects = [FM.fxRegistry.makeInstance(type)]; out[type + '/new/' + kind] = shots([L]); });
    SAVED[type].forEach((p, i) => { const L = clip(); L.effects = [{ type: type, enabled: true, params: JSON.parse(JSON.stringify(p)) }]; out[type + '/saved' + i] = shots([L]); });
    SAVED[type].forEach((p, i) => { const L = type === 'darkglow' ? darkText() : text(); L.effects = [{ type: type, enabled: true, params: JSON.parse(JSON.stringify(p)) }]; out[type + '/savedtext' + i] = shots([L]); });
    { const L = clip({ scale: 0.6, rot: 15 }); L.effects = [FM.fxRegistry.makeInstance(type)]; out[type + '/turned'] = shots([L]); }
  });
  // two vignettes, a vignette under a glow, and a 9:16 frame (the shape Roundness exists for)
  { const L = clip(); L.effects = [FM.fxRegistry.makeInstance('vignette'), Object.assign(FM.fxRegistry.makeInstance('vignette'), { params: { amount: 0.5, size: 20 } })]; out['vignette/two'] = shots([L]); }
  { const L = clip(); L.effects = [FM.fxRegistry.makeInstance('lightglow'), FM.fxRegistry.makeInstance('vignette')]; out['vignette+lightglow'] = shots([L]); }
  { const S = FM.makeLayer('shape', { shape: 'rect', x: 54, y: 96, shapeW: 108, shapeH: 192, fill: '#c0c0c0' }); S.start = 0; S.duration = 4; S.effects = [FM.fxRegistry.makeInstance('vignette')]; out['vignette/916'] = shots([S], 108, 192); }
  const all = FM.filters.all(); out.nfilters = all.length;
  const f = {}; all.forEach(fl => { const L = clip(); L.effects = [FM.filters.makeInstance(fl.id)]; f[fl.id] = shots([L]); });
  out.filters = f;
  out.inst = {}; Object.keys(SAVED).forEach(type => { out.inst[type] = FM.fxRegistry.makeInstance(type).params; });
} finally { ids.forEach(id => FM.media.remove(id)); }
return out;
