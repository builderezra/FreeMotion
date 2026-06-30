/* FreeMotion — Compositor.
 * Pure function of (scene, time) -> pixels on a 2D canvas. The same routine draws the
 * live preview AND every exported frame, so what you see is what you get. This is also
 * the surface the AI agent will render to a still and "look at" for self-correction.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // Alight-Motion-style blend modes -> canvas globalCompositeOperation.
  const BLEND = {
    normal: 'source-over',
    add: 'lighter',
    screen: 'screen',
    multiply: 'multiply',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    difference: 'difference',
    exclusion: 'exclusion',
  };
  FM.BLEND_MODES = Object.keys(BLEND);

  // Effects implemented via canvas ctx.filter — covers a lot of Alight Motion's catalogue
  // cheaply, applies identically in preview and export, and is keyframe-able (evalProp).
  FM.EFFECTS = [
    { type: 'blur', label: 'Gaussian Blur', param: 'radius', min: 0, max: 50, step: 0.5, def: 6, unit: 'px' },
    { type: 'brightness', label: 'Brightness', param: 'amount', min: 0, max: 3, step: 0.02, def: 1.3 },
    { type: 'contrast', label: 'Contrast', param: 'amount', min: 0, max: 3, step: 0.02, def: 1.3 },
    { type: 'saturate', label: 'Saturation', param: 'amount', min: 0, max: 3, step: 0.02, def: 1.6 },
    { type: 'hue', label: 'Hue Shift', param: 'deg', min: 0, max: 360, step: 1, def: 90, unit: '°' },
    { type: 'grayscale', label: 'Grayscale', param: 'amount', min: 0, max: 1, step: 0.02, def: 1 },
    { type: 'sepia', label: 'Sepia', param: 'amount', min: 0, max: 1, step: 0.02, def: 1 },
    { type: 'invert', label: 'Invert', param: 'amount', min: 0, max: 1, step: 0.02, def: 1 },
    { type: 'glow', label: 'Glow', param: 'radius', min: 0, max: 60, step: 1, def: 16, unit: 'px', color: true },
    { type: 'vignette', label: 'Vignette', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'chromakey', label: 'Chroma Key', param: 'tolerance', min: 0, max: 1, step: 0.02, def: 0.3, color: true, defColor: '#00ff00' },
    { type: 'lumakey', label: 'Luma Key', param: 'threshold', min: 0, max: 1, step: 0.02, def: 0.25 },
    { type: 'rgbsplit', label: 'RGB Split', param: 'amount', min: 0, max: 40, step: 1, def: 8, unit: 'px' },
    { type: 'pixelate', label: 'Pixelate', param: 'size', min: 1, max: 80, step: 1, def: 12, unit: 'px' },
    { type: 'posterize', label: 'Posterize', param: 'levels', min: 2, max: 16, step: 1, def: 5 },
    { type: 'mirror', label: 'Mirror', param: 'mode', def: 0, options: [[0, 'Left → Right'], [1, 'Right → Left'], [2, 'Top → Bottom'], [3, 'Bottom → Top']] },
    { type: 'tint', label: 'Tint', param: 'amount', min: 0, max: 1, step: 0.02, def: 1, color: true, defColor: '#ff3366' },
    { type: 'threshold', label: 'Threshold', param: 'level', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'duotone', label: 'Duotone', param: 'amount', min: 0, max: 1, step: 0.02, def: 1, color: true, defColor: '#241a52', colorLabel: 'Shadows', color2: true, defColor2: '#ff9e5e', color2Label: 'Highlights' },
    // ---- batch 1: per-pixel colour / texture effects (routed through drawPixelEffect) ----
    { type: 'solarize', label: 'Solarize', param: 'threshold', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'gamma', label: 'Gamma', param: 'gamma', min: 0.2, max: 4, step: 0.05, def: 1.8 },
    { type: 'temperature', label: 'Color Temperature', param: 'amount', min: -100, max: 100, step: 1, def: 40 },
    { type: 'noise', label: 'Noise', param: 'amount', min: 0, max: 100, step: 1, def: 35, unit: '%' },
    { type: 'scanlines', label: 'Scanlines', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    // ---- batch 2 ----
    { type: 'vibrance', label: 'Vibrance', param: 'amount', min: 0, max: 2, step: 0.02, def: 1.6 },
    { type: 'sharpen', label: 'Sharpen', param: 'amount', min: 0, max: 3, step: 0.05, def: 1.5 },
    { type: 'thermal', label: 'Hot Color', param: 'amount', min: 0, max: 1, step: 0.02, def: 1 },
    { type: 'dither', label: 'Dither', param: 'levels', min: 2, max: 8, step: 1, def: 4 },
    { type: 'halftone', label: 'Halftone Dots', param: 'size', min: 2, max: 30, step: 1, def: 8, unit: 'px' },
    // ---- batch 3: geometric warps (routed through drawWarpEffect) ----
    { type: 'wave', label: 'Wave', param: 'amount', min: 0, max: 120, step: 1, def: 30, unit: 'px' },
    { type: 'ripple', label: 'Circular Ripple', param: 'amount', min: 0, max: 60, step: 1, def: 22, unit: 'px' },
    { type: 'twirl', label: 'Twirl', param: 'amount', min: -360, max: 360, step: 1, def: 140, unit: '°' },
    { type: 'bulge', label: 'Pinch / Bulge', param: 'amount', min: -1, max: 2, step: 0.02, def: -0.5 },
    // ---- batch 4 ----
    { type: 'edge', label: 'Find Edges', param: 'amount', min: 0.5, max: 4, step: 0.05, def: 1.5 },
    { type: 'emboss', label: 'Emboss', param: 'amount', min: 0, max: 3, step: 0.05, def: 1 },
    { type: 'exposure', label: 'Exposure', param: 'stops', min: -3, max: 3, step: 0.05, def: 0.8, unit: ' EV' },
    { type: 'fisheye', label: 'Fisheye', param: 'amount', min: -1, max: 1, step: 0.02, def: 0.5 },
    // ---- batch 5 ----
    { type: 'kaleidoscope', label: 'Kaleidoscope', param: 'segments', min: 2, max: 12, step: 1, def: 6 },
    { type: 'glitch', label: 'Glitch', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'zoomblur', label: 'Zoom Blur', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'crt', label: 'CRT', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.7 },
    // ---- batch 6 ----
    { type: 'boxblur', label: 'Box Blur', param: 'radius', min: 0, max: 40, step: 1, def: 8, unit: 'px' },
    { type: 'spinblur', label: 'Spin Blur', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'gradientmap', label: 'Gradient Map', param: 'amount', min: 0, max: 1, step: 0.02, def: 1, color: true, defColor: '#241a52', colorLabel: 'Shadows', color2: true, defColor2: '#ffb86c', color2Label: 'Highlights' },
    { type: 'colorize', label: 'Colorize', param: 'amount', min: 0, max: 1, step: 0.02, def: 1, color: true, defColor: '#3aa0ff', colorLabel: 'Color' },
    { type: 'checker', label: 'Checker', param: 'size', min: 2, max: 120, step: 1, def: 24, unit: 'px', color: true, defColor: '#000000', colorLabel: 'Color' },
    { type: 'grid', label: 'Grid', param: 'size', min: 4, max: 160, step: 1, def: 32, unit: 'px', color: true, defColor: '#ffffff', colorLabel: 'Color' },
    // ---- batch 7 ----
    { type: 'mosaic', label: 'Mosaic', param: 'size', min: 2, max: 100, step: 1, def: 16, unit: 'px' },
    { type: 'lensblur', label: 'Lens Blur', param: 'radius', min: 0, max: 30, step: 1, def: 10, unit: 'px' },
    { type: 'dots', label: 'Dots', param: 'size', min: 4, max: 80, step: 1, def: 16, unit: 'px', color: true, defColor: '#ffffff', colorLabel: 'Color' },
    { type: 'polarcoords', label: 'Polar Coordinates', param: 'amount', min: 0, max: 1, step: 0.02, def: 1 },
    { type: 'bend', label: 'Bend', param: 'amount', min: -1, max: 1, step: 0.02, def: 0.5 },
    { type: 'glass', label: 'Glass', param: 'amount', min: 0, max: 40, step: 1, def: 12, unit: 'px' },
    // ---- batch 8 ----
    { type: 'lightglow', label: 'Light Glow', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'longshadow', label: 'Long Shadow', param: 'length', min: 0, max: 80, step: 1, def: 30, unit: 'px', color: true, defColor: '#000000', colorLabel: 'Shadow' },
    { type: 'halftonelines', label: 'Halftone Lines', param: 'size', min: 3, max: 40, step: 1, def: 8, unit: 'px' },
    { type: 'clouds', label: 'Clouds', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'rays', label: 'Radial Rays', param: 'count', min: 3, max: 64, step: 1, def: 16, color: true, defColor: '#ffffff', colorLabel: 'Color' },
    { type: 'stripes', label: 'Stripes', param: 'size', min: 4, max: 80, step: 1, def: 16, unit: 'px', color: true, defColor: '#000000', colorLabel: 'Color' },
    // ---- batch 9 ----
    { type: 'darkglow', label: 'Dark Glow', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'stroke', label: 'Stroke Color', param: 'width', min: 1, max: 16, step: 1, def: 4, unit: 'px', color: true, defColor: '#ffffff', colorLabel: 'Stroke' },
    { type: 'smoothedges', label: 'Smooth Edges', param: 'radius', min: 0, max: 20, step: 1, def: 4, unit: 'px' },
    { type: 'blocknoise', label: 'Block Noise', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'starfield', label: 'Starfield', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5, color: true, defColor: '#ffffff', colorLabel: 'Star' },
    { type: 'curl', label: 'Curl', param: 'amount', min: -1, max: 1, step: 0.02, def: 0.5 },
    // ---- batch 10 ----
    { type: 'bumpmap', label: 'Bump Map', param: 'amount', min: 0, max: 3, step: 0.05, def: 1.2 },
    { type: 'edgeglow', label: 'Edge Glow', param: 'amount', min: 0, max: 4, step: 0.05, def: 1.5, color: true, defColor: '#00ffea', colorLabel: 'Glow' },
    { type: 'contourlines', label: 'Contour Lines', param: 'levels', min: 2, max: 24, step: 1, def: 8 },
    { type: 'grunge', label: 'Grunge', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'iridescence', label: 'Iridescence', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.7 },
    { type: 'fractalwarp', label: 'Fractal Warp', param: 'amount', min: 0, max: 60, step: 1, def: 24, unit: 'px' },
    // ---- batch 11 (multi-param) ----
    { type: 'motionblur', label: 'Motion Blur', params: [{ key: 'distance', label: 'Distance', min: 0, max: 60, step: 1, def: 20, unit: 'px' }, { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, def: 0, unit: '°' }] },
    { type: 'colorbalance', label: 'Color Balance', params: [{ key: 'red', label: 'Red', min: -100, max: 100, step: 1, def: 25 }, { key: 'green', label: 'Green', min: -100, max: 100, step: 1, def: 0 }, { key: 'blue', label: 'Blue', min: -100, max: 100, step: 1, def: -25 }] },
    { type: 'highlightsshadows', label: 'Highlights & Shadows', params: [{ key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1, def: -40 }, { key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1, def: 50 }] },
    { type: 'tiltshift', label: 'Tilt Shift', params: [{ key: 'center', label: 'Focus', min: 0, max: 1, step: 0.02, def: 0.5 }, { key: 'softness', label: 'Softness', min: 0, max: 1, step: 0.02, def: 0.5 }] },
  ];

  // getImageData + per-pixel keying is the heaviest path, so memoize the result and skip
  // recompute when the source frame and params are unchanged (static images, paused/scrub
  // redraws, repeated renders of one frame). Stats exposed for verification.
  FM._fxStats = { ckCompute: 0, lkCompute: 0 };
  // Bumped whenever a reused offscreen canvas (grade/key/blend) is (re)computed, so srcToken varies for
  // it. Without this, a canvas's object identity is constant while its pixels change every frame, and any
  // memo downstream (e.g. key over a graded video, or grade over a frame-blend) would freeze on frame 1.
  let _gen = 0, _idSeq = 0;
  function srcToken(src) {
    // include a stable per-element id so two distinct videos sharing the same fps/res/start (and thus the
    // same rounded currentTime bucket) can't collide in a single-slot key/grade memo (would return the
    // first video's pixels for the second).
    if (src && src.tagName === 'VIDEO') { if (src._fmId == null) src._fmId = ++_idSeq; return 'v:' + src._fmId + ':' + Math.round((src.currentTime || 0) * 1000); }
    if (src && src._fmGen != null) return 'c:' + src._fmGen;   // reused offscreen canvas → key by its generation
    return src;
  }

  // Key out a color → transparency (green/blue screen). Reuses one offscreen canvas + memo.
  let _ckCanvas = null, _ckLast = null;
  function chromaKey(src, w, h, keyHex, tol, filterStr) {
    const tok = srcToken(src);
    if (_ckLast && _ckCanvas && _ckLast.tok === tok && _ckLast.w === w && _ckLast.h === h && _ckLast.key === keyHex && _ckLast.tol === tol && _ckLast.filter === filterStr) return _ckCanvas;
    if (!_ckCanvas) _ckCanvas = document.createElement('canvas');
    const oc = _ckCanvas; oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    octx.clearRect(0, 0, w, h);
    octx.filter = filterStr || 'none';                    // filter the SOURCE before keying (AM order: FX → key)
    try { octx.drawImage(src, 0, 0, w, h); } catch (e) { octx.filter = 'none'; return src; }
    octx.filter = 'none';
    let img;
    try { img = octx.getImageData(0, 0, w, h); } catch (e) { return src; }  // tainted-canvas guard
    const d = img.data;
    const kr = parseInt(keyHex.slice(1, 3), 16), kg = parseInt(keyHex.slice(3, 5), 16), kb = parseInt(keyHex.slice(5, 7), 16);
    const thr = (tol || 0.3) * 441;
    for (let i = 0; i < d.length; i += 4) {
      const dr = d[i] - kr, dg = d[i + 1] - kg, db = d[i + 2] - kb;
      if (Math.sqrt(dr * dr + dg * dg + db * db) < thr) d[i + 3] = 0;
    }
    octx.putImageData(img, 0, 0);
    _ckLast = { tok, w, h, key: keyHex, tol, filter: filterStr }; FM._fxStats.ckCompute++;
    oc._fmGen = ++_gen;
    return oc;
  }

  // Key out by luminance → transparency (removes dark/black areas below threshold).
  let _lkCanvas = null, _lkLast = null;
  function lumaKey(src, w, h, threshold, filterStr) {
    const tok = srcToken(src);
    if (_lkLast && _lkCanvas && _lkLast.tok === tok && _lkLast.w === w && _lkLast.h === h && _lkLast.thr === threshold && _lkLast.filter === filterStr) return _lkCanvas;
    if (!_lkCanvas) _lkCanvas = document.createElement('canvas');
    const oc = _lkCanvas; oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    octx.clearRect(0, 0, w, h);
    octx.filter = filterStr || 'none';                    // filter SOURCE before keying
    try { octx.drawImage(src, 0, 0, w, h); } catch (e) { octx.filter = 'none'; return src; }
    octx.filter = 'none';
    let img;
    try { img = octx.getImageData(0, 0, w, h); } catch (e) { return src; }  // tainted-canvas guard
    const d = img.data;
    const t = (threshold == null ? 0.25 : threshold) * 255;
    const soft = 28;                                       // soft edge over `soft` luma units
    for (let i = 0; i < d.length; i += 4) {
      const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (luma <= t) d[i + 3] = 0;
      else if (luma < t + soft) d[i + 3] = Math.round(d[i + 3] * (luma - t) / soft);
    }
    octx.putImageData(img, 0, 0);
    _lkLast = { tok, w, h, thr: threshold, filter: filterStr }; FM._fxStats.lkCompute++;
    oc._fmGen = ++_gen;
    return oc;
  }

  // Lift / Gamma / Gain color grading via a 256-entry LUT: out = gain * in^(1/gamma) + lift.
  // ctx.filter can't express gamma/lift, so we do a memoized per-pixel pass (like the keys).
  let _grLUT = null, _grSig = null;
  function gradeLUT(lift, gamma, gain) {
    const sig = lift + '|' + gamma + '|' + gain;
    if (_grLUT && _grSig === sig) return _grLUT;
    const lut = new Uint8ClampedArray(256), ig = 1 / (gamma || 1);
    for (let i = 0; i < 256; i++) {
      const n = i / 255;
      lut[i] = Math.round((gain * Math.pow(n, ig) + lift) * 255);
    }
    _grLUT = lut; _grSig = sig; return lut;
  }
  let _grCanvas = null, _grLast = null;
  function gradeCanvas(src, w, h, lift, gamma, gain) {
    const tok = srcToken(src), sig = lift + '|' + gamma + '|' + gain;
    if (_grLast && _grCanvas && _grLast.tok === tok && _grLast.w === w && _grLast.h === h && _grLast.sig === sig) return _grCanvas;
    if (!_grCanvas) _grCanvas = document.createElement('canvas');
    const oc = _grCanvas; oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    octx.clearRect(0, 0, w, h);
    try { octx.drawImage(src, 0, 0, w, h); } catch (e) { return src; }
    let img;
    try { img = octx.getImageData(0, 0, w, h); } catch (e) { return src; }   // tainted guard
    const d = img.data, lut = gradeLUT(lift, gamma, gain);
    for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
    octx.putImageData(img, 0, 0);
    _grLast = { tok, w, h, sig }; FM._fxStats.gradeCompute = (FM._fxStats.gradeCompute || 0) + 1;
    oc._fmGen = ++_gen;
    return oc;
  }

  // Cross-dissolve two frames (smooth slow-mo / frame-blend). out = a*(1-frac) + b*frac.
  let _fbCanvas = null;
  function blendFrames(a, b, frac, w, h) {
    if (!_fbCanvas) _fbCanvas = document.createElement('canvas');
    const oc = _fbCanvas; oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    octx.globalAlpha = 1; octx.clearRect(0, 0, w, h);
    try {
      octx.drawImage(a, 0, 0, w, h);
      octx.globalAlpha = frac;
      octx.drawImage(b, 0, 0, w, h);
    } catch (e) { octx.globalAlpha = 1; return a; }
    octx.globalAlpha = 1;
    oc._fmGen = ++_gen;
    return oc;
  }

  function effectFilter(layer, t) {
    const parts = [];
    const fx = layer.effects;
    if (fx && fx.length) for (const e of fx) {
      if (e.enabled === false) continue;
      const p = e.params || {};
      const v = (k, d) => (p[k] == null ? d : FM.evalProp(p[k], t));
      switch (e.type) {
        case 'blur': parts.push('blur(' + v('radius', 6) + 'px)'); break;
        case 'brightness': parts.push('brightness(' + v('amount', 1) + ')'); break;
        case 'contrast': parts.push('contrast(' + v('amount', 1) + ')'); break;
        case 'saturate': parts.push('saturate(' + v('amount', 1) + ')'); break;
        case 'hue': parts.push('hue-rotate(' + v('deg', 0) + 'deg)'); break;
        case 'grayscale': parts.push('grayscale(' + v('amount', 1) + ')'); break;
        case 'sepia': parts.push('sepia(' + v('amount', 1) + ')'); break;
        case 'invert': parts.push('invert(' + v('amount', 1) + ')'); break;
        case 'glow': parts.push('drop-shadow(0 0 ' + v('radius', 12) + 'px ' + (p.color || '#ffffff') + ')'); break;
      }
    }
    if (layer.colorGrade) {
      const cg = layer.colorGrade;
      if (cg.hue) parts.push('hue-rotate(' + cg.hue + 'deg)');
      if (cg.sat != null && Math.abs(cg.sat - 1) > 1e-3) parts.push('saturate(' + cg.sat + ')');
    }
    return parts.length ? parts.join(' ') : 'none';
  }
  FM.effectFilter = effectFilter;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  // Smooth deterministic pseudo-noise in ~[-1,1] (sum of incommensurate sines) — same at a given
  // time every render, so wiggle is flicker-free and exports identically.
  function wnoise(u) { return Math.sin(u * 6.283) * 0.5 + Math.sin(u * 14.77 + 1.3) * 0.3 + Math.sin(u * 28.6 + 2.7) * 0.2; }
  FM.wiggleOffset = function (layer, t) {
    const w = layer.wiggle;
    if (!w || !w.enabled || !w.amp) return null;
    const f = w.freq || 2, a = w.amp;
    return { x: a * wnoise(t * f), y: a * wnoise(t * f + 100) };
  };

  // Apply the layer's parent-chain transform (translate/rotate/scale, root-most first) so a
  // child inherits its parent's motion (AM layer parenting). Cycle- and missing-parent-safe.
  // Composes the parent chain onto ctx (position/rotation/scale, root-first) and RETURNS the total
  // inherited rotation in radians — used to implement AM parenting rotation modes on the child.
  function applyParentChain(ctx, layer, t, scene) {
    if (!layer.parent || !scene) return 0;
    const chain = [];
    const seen = new Set([layer.id]);
    let pid = layer.parent;
    while (pid && !seen.has(pid)) {
      seen.add(pid);
      const pl = scene.layers.find(l => l.id === pid);
      if (!pl) break;
      chain.push(pl);
      pid = pl.parent;
    }
    let accumRot = 0;
    for (let i = chain.length - 1; i >= 0; i--) {
      const ptr = chain[i].transform;
      ctx.translate(FM.evalProp(ptr.x, t), FM.evalProp(ptr.y, t));
      const prot = FM.evalProp(ptr.rotation, t) * Math.PI / 180;
      if (prot) ctx.rotate(prot);
      accumRot += prot;
      const ps = FM.evalProp(ptr.scale, t);
      if (ps !== 1) ctx.scale(ps, ps);
    }
    return accumRot;
  }
  // AM parenting rotation modes: 'locked' keeps the child world-upright while it still orbits the
  // parent; 'weighted' keeps a fraction of the parent's rotation. Call after translate(x,y), before
  // the child's own rotation. (Position already inherited the full parent rotation via the chain.)
  function applyParentRotMode(ctx, layer, accumRot) {
    if (!layer.parent || !accumRot) return;
    const mode = layer.parentMode || 'normal';
    if (mode === 'normal') return;
    const wt = mode === 'weighted' ? clamp01(layer.parentWeight != null ? layer.parentWeight : 0.5) : 0;
    ctx.rotate(-accumRot * (1 - wt));
  }

  // ---- kinetic typography: per-unit (char/word/line) animated reveal ----
  function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }
  function easeOutBack(p) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
  function hexToRGB(h) { h = String(h || '#000000').replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]; }
  function lerpHex(a, b, f) { f = Math.max(0, Math.min(1, f)); const A = hexToRGB(a), B = hexToRGB(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * f) + ',' + Math.round(A[1] + (B[1] - A[1]) * f) + ',' + Math.round(A[2] + (B[2] - A[2]) * f) + ')'; }

  function drawAnimatedText(ctx, layer, t, lines, lh, total) {
    const an = layer.textAnim || {};
    const preset = an.preset || 'fade';
    const unit = an.unit || 'char';
    const durIn = an.durIn != null ? an.durIn : 0.6;
    const durOut = an.durOut || 0;
    const stagger = an.stagger != null ? an.stagger : 0.04;
    const fs = layer.fontSize || 96;
    const align = layer.align || 'center';
    const tIn = t - layer.start;                       // seconds since the layer began
    const tToEnd = (layer.start + layer.duration) - t; // seconds until the layer ends
    const baseAlpha = ctx.globalAlpha;                 // layer opacity already applied
    const stk = layer.stroke, drawStroke = stk && stk.enabled && stk.width > 0;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    const grad = FM.layerHasGradient(layer) ? layer.fillGradient : null;   // per-unit gradient sampling
    let gi = 0;
    lines.forEach((line, li) => {
      const yy = li * lh - total / 2;
      let units;
      if (unit === 'line') units = [line];
      else if (unit === 'word') units = line.split(/(\s+)/).filter(s => s.length);
      else units = Array.from(line);
      const widths = units.map(u => ctx.measureText(u).width);
      const lineW = widths.reduce((a, b) => a + b, 0);
      let x = align === 'center' ? -lineW / 2 : align === 'right' ? -lineW : 0;
      const lineLeft = x;
      units.forEach((u, ui) => {
        const w = widths[ui];
        const p = durIn > 0 ? Math.min(1, Math.max(0, (tIn - gi * stagger) / durIn)) : (tIn >= gi * stagger ? 1 : 0);
        const pe = easeOutCubic(p);
        const outA = durOut > 0 ? Math.min(1, Math.max(0, tToEnd / durOut)) : 1;
        let alpha = 1, dx = 0, dy = 0, sc = 1;
        if (preset === 'fade') alpha = p;
        else if (preset === 'fade-up') { alpha = p; dy = (1 - pe) * fs * 0.6; }
        else if (preset === 'typewriter') alpha = p > 0 ? 1 : 0;
        else if (preset === 'pop') { sc = Math.max(0, easeOutBack(p)); alpha = Math.min(1, p * 2.2); }
        else if (preset === 'slide') { alpha = p; dx = (1 - pe) * fs * 0.9; }
        ctx.save();
        ctx.globalAlpha = baseAlpha * Math.max(0, Math.min(1, alpha)) * outA;
        ctx.translate(x + w / 2 + dx, yy + dy);
        if (sc !== 1) ctx.scale(sc, sc);
        if (grad) {   // sample the gradient at this unit's position, respecting the gradient angle
          const cx = x + w / 2, dxc = cx - (lineLeft + lineW / 2), dyc = yy;
          let f;
          if (grad.type === 'radial') {
            f = Math.hypot(dxc, dyc) / (Math.max(lineW, total + fs) / 2 || 1);
          } else {
            const ang = (grad.angle || 0) * Math.PI / 180, co = Math.cos(ang), si = Math.sin(ang);
            const half = (Math.abs(co) * lineW + Math.abs(si) * (total + fs)) / 2 || 1;
            f = (dxc * co + dyc * si) / half / 2 + 0.5;
          }
          ctx.fillStyle = lerpHex(grad.c0, grad.c1, Math.max(0, Math.min(1, f)));
        }
        if (drawStroke) { ctx.lineJoin = 'round'; ctx.miterLimit = 2; ctx.lineWidth = stk.width * 2; ctx.strokeStyle = stk.color || '#000'; ctx.strokeText(u, -w / 2, 0); }
        ctx.fillText(u, -w / 2, 0);
        ctx.restore();
        x += w;
        gi++;
      });
    });
    ctx.textAlign = prevAlign;
  }
  FM.textHasAnim = function (layer) { return layer.textAnim && layer.textAnim.preset && layer.textAnim.preset !== 'none'; };

  // Text on a curve: lay characters along a circular arc, each rotated to the tangent.
  function drawArcLine(ctx, line, layer, curveDeg, drawStroke) {
    const chars = Array.from(line);
    const widths = chars.map(c => ctx.measureText(c).width);
    const tw = widths.reduce((a, b) => a + b, 0);
    if (tw <= 0) return;
    const ac = curveDeg * Math.PI / 180, R = tw / Math.abs(ac), sign = curveDeg >= 0 ? 1 : -1;
    const stk = layer.stroke;
    const prevAlign = ctx.textAlign, prevBase = ctx.textBaseline;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let s = 0;
    chars.forEach((ch, i) => {
      const w = widths[i];
      const a = ((s + w / 2) / tw - 0.5) * ac;
      ctx.save();
      ctx.translate(R * Math.sin(a), sign * (R - R * Math.cos(a)));
      ctx.rotate(a);
      if (drawStroke) { ctx.lineJoin = 'round'; ctx.miterLimit = 2; ctx.lineWidth = stk.width * 2; ctx.strokeStyle = stk.color || '#000'; ctx.strokeText(ch, 0, 0); }
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      s += w;
    });
    ctx.textAlign = prevAlign; ctx.textBaseline = prevBase;
  }

  // ---- vector mask: clip the layer to a shape (rect/ellipse/polygon), in layer-local space ----
  function addMaskShape(path, mk) {
    const mx = mk.x || 0, my = mk.y || 0, mw = mk.w || 300, mh = mk.h || 300;
    if (mk.shape === 'ellipse') {
      path.ellipse(mx, my, Math.abs(mw / 2), Math.abs(mh / 2), 0, 0, Math.PI * 2);
    } else if (mk.shape === 'polygon') {
      const n = Math.max(3, mk.sides || 5);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / n;
        const px = mx + (mw / 2) * Math.cos(a), py = my + (mh / 2) * Math.sin(a);
        if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
      }
      path.closePath();
    } else {   // rect
      path.rect(mx - mw / 2, my - mh / 2, mw, mh);
    }
  }
  function applyMaskClip(ctx, layer) {
    const mk = layer.mask;
    if (!mk || !mk.enabled) return;
    const path = new Path2D();
    if (mk.invert) path.rect(-100000, -100000, 200000, 200000);   // everything…
    addMaskShape(path, mk);                                        // …minus the shape (evenodd) = punch-out
    ctx.clip(path, mk.invert ? 'evenodd' : 'nonzero');
  }

  // Feathered mask: clip() can't soft-edge, so render the layer to an offscreen, then composite a
  // BLURRED mask shape over it (destination-in keeps inside / destination-out punches out), and blit.
  let _maskCv = null;
  function drawFeatheredMaskLayer(ctx, layer, t, scene) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height;
    if (!_maskCv) _maskCv = document.createElement('canvas');
    const off = _maskCv; off.width = W; off.height = H;
    const octx = off.getContext('2d');
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
    octx.globalAlpha = 1; octx.globalCompositeOperation = 'source-over'; octx.filter = 'none';
    // 1) draw the layer content (no mask, full opacity, normal blend) into the offscreen
    const tmp = Object.assign({}, layer, { mask: null, blendMode: 'normal', transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(octx, tmp, t, scene);
    // 2) composite the blurred mask shape in the layer's transformed local space
    octx.save();
    octx.globalCompositeOperation = layer.mask.invert ? 'destination-out' : 'destination-in';
    const accumRot = applyParentChain(octx, layer, t, scene);
    octx.translate(FM.evalProp(layer.transform.x, t), FM.evalProp(layer.transform.y, t));
    applyParentRotMode(octx, layer, accumRot);
    const rot = FM.evalProp(layer.transform.rotation, t) * Math.PI / 180; if (rot) octx.rotate(rot);
    const sc = FM.evalProp(layer.transform.scale, t); if (sc !== 1) octx.scale(sc, sc);
    octx.filter = 'blur(' + Math.max(0, layer.mask.feather || 0) + 'px)';
    octx.fillStyle = '#fff';
    const path = new Path2D(); addMaskShape(path, layer.mask); octx.fill(path);
    octx.restore();
    octx.filter = 'none'; octx.globalCompositeOperation = 'source-over';
    // 3) blit onto the main canvas with the layer's real opacity + blend
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }

  // Motion blur: average K sub-frame renders across the shutter window. A moving/rotating layer
  // smears along its motion; a static layer is unchanged. Each sample draws at 1/K opacity.
  // NOTE: this blurs the layer's TRANSFORM motion (pan/scale/rotate). It does NOT smear a video
  // clip's intrinsic subject motion — a forward video draws the same decoded frame per sub-sample
  // (per-sub-frame decode would need a full forward frame cache). Transform blur is the common use.
  let _mbCv = null;
  function drawMotionBlur(ctx, layer, t, scene) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const mb = layer.motionBlur;
    const samples = Math.max(2, Math.min(32, Math.round(mb.samples || 8)));
    const fps = (scene && scene.project && scene.project.fps) || 30;
    const dt = (mb.shutter != null ? mb.shutter : 0.5) / fps;   // shutter window in seconds
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height;
    if (!_mbCv) _mbCv = document.createElement('canvas');
    const off = _mbCv; off.width = W; off.height = H;
    const octx = off.getContext('2d');
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
    octx.globalAlpha = 1; octx.globalCompositeOperation = 'source-over'; octx.filter = 'none';
    // Sub-sample at 1/K opacity with ADDITIVE ('add'→lighter) compositing so overlapping samples
    // sum to full: a static layer stays solid, a moving one fades into a trail.
    // Collect only sub-times inside the clip's life, then renormalize opacity to that count: keeps
    // brightness constant near clip in/out WITHOUT collapsing skipped samples onto one boundary time
    // (which would reconstruct a sharp un-blurred frame — a visible seam).
    const lo = layer.start, hi = layer.start + layer.duration - 1e-4;
    const times = [];
    for (let k = 0; k < samples; k++) {
      const st = t + (k / (samples - 1) - 0.5) * dt;
      if (st >= lo && st <= hi) times.push(st);
    }
    if (!times.length) times.push(Math.max(lo, Math.min(hi, t)));
    const tmp = Object.assign({}, layer, { motionBlur: null, blendMode: 'add', transform: Object.assign({}, layer.transform, { opacity: 1 / times.length }) });
    times.forEach(st => drawLayer(octx, tmp, st, scene));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }
  FM.layerHasMotionBlur = function (layer) { return layer.motionBlur && layer.motionBlur.enabled; };

  // The per-pixel post-process effects, and a dispatcher that applies one (the outermost pass).
  // Each draw* renders a clean copy of the layer with THIS effect instance removed (recursing
  // inward through the remaining post-fx), then applies its own transform — so they compose in
  // array order regardless of type.
  const POSTFX = { rgbsplit: 1, pixelate: 1, posterize: 1, mirror: 1, tint: 1, threshold: 1, duotone: 1,
    solarize: 1, gamma: 1, temperature: 1, noise: 1, scanlines: 1,
    vibrance: 1, sharpen: 1, thermal: 1, dither: 1, halftone: 1,
    wave: 1, ripple: 1, twirl: 1, bulge: 1,
    edge: 1, emboss: 1, exposure: 1, fisheye: 1,
    kaleidoscope: 1, glitch: 1, zoomblur: 1, crt: 1,
    boxblur: 1, spinblur: 1, gradientmap: 1, colorize: 1, checker: 1, grid: 1,
    mosaic: 1, lensblur: 1, dots: 1, polarcoords: 1, bend: 1, glass: 1,
    lightglow: 1, longshadow: 1, halftonelines: 1, clouds: 1, rays: 1, stripes: 1,
    darkglow: 1, stroke: 1, smoothedges: 1, blocknoise: 1, starfield: 1, curl: 1,
    bumpmap: 1, edgeglow: 1, contourlines: 1, grunge: 1, iridescence: 1, fractalwarp: 1,
    motionblur: 1, colorbalance: 1, highlightsshadows: 1, tiltshift: 1 };
  function applyPostFx(ctx, layer, t, scene, fx) {
    const p = fx.params || {};
    if (fx.type === 'rgbsplit') return drawRgbSplit(ctx, layer, t, scene, FM.evalProp(p.amount, t) || 0, fx);
    if (fx.type === 'pixelate') return drawPixelate(ctx, layer, t, scene, FM.evalProp(p.size, t) || 1, fx);
    if (fx.type === 'posterize') return drawPosterize(ctx, layer, t, scene, FM.evalProp(p.levels, t) || 5, fx);
    if (fx.type === 'mirror') return drawMirror(ctx, layer, t, scene, p.mode || 0, fx);
    if (fx.type === 'tint') return drawTint(ctx, layer, t, scene, FM.evalProp(p.amount, t), p.color || '#ff3366', fx);
    if (fx.type === 'threshold') return drawThreshold(ctx, layer, t, scene, FM.evalProp(p.level, t), fx);
    if (fx.type === 'duotone') return drawDuotone(ctx, layer, t, scene, FM.evalProp(p.amount, t), p.color || '#241a52', p.color2 || '#ff9e5e', fx);
    // generic per-pixel colour/texture effects
    if (PIXEL_FX[fx.type]) return drawPixelEffect(ctx, layer, t, scene, fx, PIXEL_FX[fx.type]);
    // generic geometric warps
    if (WARP_FX[fx.type]) return drawWarpEffect(ctx, layer, t, scene, fx, WARP_FX[fx.type]);
  }

  // Generic per-pixel effect: render the layer clean to an offscreen (this fx removed so the rest still
  // compose), run a pixel function over the ImageData, then draw it back with the layer's opacity/blend.
  // Each pixel fn mutates `d` (RGBA bytes) in place; gets (d, W, H, P) where P = evaluated params.
  let _pfA = null, _pfB = null;
  function drawPixelEffect(ctx, layer, t, scene, fx, fn) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const proj = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = proj.width, H = proj.height;
    if (!_pfA) _pfA = document.createElement('canvas');
    if (!_pfB) _pfB = document.createElement('canvas');
    _pfA.width = W; _pfA.height = H; _pfB.width = W; _pfB.height = H;
    const actx = _pfA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => e !== fx), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const img = actx.getImageData(0, 0, W, H);
    fn(img.data, W, H, fx.params || {}, t);
    _pfB.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_pfB, 0, 0);
    ctx.restore();
  }

  // Per-pixel effect functions. Each mutates the RGBA byte array in place. Read params via FM.evalProp.
  const PIXEL_FX = {
    solarize: function (d, W, H, p, t) {
      const thr = clamp01(FM.evalProp(p.threshold, t) != null ? FM.evalProp(p.threshold, t) : 0.5) * 255;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > thr) d[i] = 255 - d[i];
        if (d[i + 1] > thr) d[i + 1] = 255 - d[i + 1];
        if (d[i + 2] > thr) d[i + 2] = 255 - d[i + 2];
      }
    },
    gamma: function (d, W, H, p, t) {
      const g = Math.max(0.05, FM.evalProp(p.gamma, t) || 1), inv = 1 / g, LUT = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) LUT[v] = Math.round(255 * Math.pow(v / 255, inv));
      for (let i = 0; i < d.length; i += 4) { d[i] = LUT[d[i]]; d[i + 1] = LUT[d[i + 1]]; d[i + 2] = LUT[d[i + 2]]; }
    },
    temperature: function (d, W, H, p, t) {
      const a = (FM.evalProp(p.amount, t) || 0) / 100, r = a * 50, b = -a * 50;   // warm: +R -B, cool: opposite
      for (let i = 0; i < d.length; i += 4) { d[i] = d[i] + r; d[i + 2] = d[i + 2] + b; }
    },
    noise: function (d, W, H, p, t) {
      const amt = (FM.evalProp(p.amount, t) || 0) / 100 * 160;   // up to ±80
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        // deterministic per-pixel hash (stable when paused), shifted slightly by frame for subtle motion
        const px = (i >> 2);
        let h = (px * 374761393 + Math.floor(t * 24) * 668265263) | 0;
        h = (h ^ (h >> 13)) * 1274126177; h = (h ^ (h >> 16));
        const n = ((h & 255) / 255 - 0.5) * amt;
        d[i] += n; d[i + 1] += n; d[i + 2] += n;
      }
    },
    scanlines: function (d, W, H, p, t) {
      const amt = clamp01(FM.evalProp(p.amount, t) != null ? FM.evalProp(p.amount, t) : 0.6);
      for (let y = 0; y < H; y++) {
        if (y % 2 === 0) continue;                 // darken every other row
        const k = 1 - amt, row = y * W * 4;
        for (let x = 0; x < W; x++) { const i = row + x * 4; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
      }
    },
    // ---- batch 2 ----
    vibrance: function (d, W, H, p, t) {
      const a = FM.evalProp(p.amount, t), k = (a == null ? 1.6 : a);
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], avg = (r + g + b) / 3;
        const f = 1 + (k - 1) * (1 - (Math.max(r, g, b) - Math.min(r, g, b)) / 255);   // unsaturated pixels boosted more
        d[i] = avg + (r - avg) * f; d[i + 1] = avg + (g - avg) * f; d[i + 2] = avg + (b - avg) * f;
      }
    },
    sharpen: function (d, W, H, p, t) {
      const a = FM.evalProp(p.amount, t), amt = (a == null ? 1.5 : a);
      if (amt <= 0) return;
      const s = d.slice();
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = (y * W + x) * 4;
          for (let c = 0; c < 3; c++) {
            const j = i + c;
            d[j] = s[j] * (1 + 4 * amt) - (s[j - W * 4] + s[j + W * 4] + s[j - 4] + s[j + 4]) * amt;
          }
        }
      }
    },
    thermal: (function () {
      const STOPS = [[0, 0, 0], [10, 0, 130], [120, 0, 170], [230, 50, 40], [255, 175, 0], [255, 255, 165]];
      function pal(l) {
        const seg = l * (STOPS.length - 1); let i0 = Math.floor(seg); if (i0 >= STOPS.length - 1) i0 = STOPS.length - 2; const f = seg - i0;
        const a = STOPS[i0], b = STOPS[i0 + 1];
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
      }
      return function (d, W, H, p, t) {
        const a = FM.evalProp(p.amount, t), am = (a == null ? 1 : clamp01(a));
        for (let i = 0; i < d.length; i += 4) {
          const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255, c = pal(l);
          d[i] += (c[0] - d[i]) * am; d[i + 1] += (c[1] - d[i + 1]) * am; d[i + 2] += (c[2] - d[i + 2]) * am;
        }
      };
    })(),
    dither: (function () {
      const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      return function (d, W, H, p, t) {
        const lv = Math.max(2, Math.round(FM.evalProp(p.levels, t) || 4)), step = 255 / (lv - 1);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4, thr = (B[y & 3][x & 3] / 16 - 0.5) * step;
            d[i] = Math.round(Math.round((d[i] + thr) / step) * step);
            d[i + 1] = Math.round(Math.round((d[i + 1] + thr) / step) * step);
            d[i + 2] = Math.round(Math.round((d[i + 2] + thr) / step) * step);
          }
        }
      };
    })(),
    halftone: function (d, W, H, p, t) {
      const size = Math.max(2, Math.round(FM.evalProp(p.size, t) || 8)), r2 = size / 2, s = d.slice();
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const ccx = Math.min(W - 1, Math.floor(x / size) * size + (size >> 1));
          const ccy = Math.min(H - 1, Math.floor(y / size) * size + (size >> 1));
          const ci = (ccy * W + ccx) * 4;
          const l = (s[ci] * 0.299 + s[ci + 1] * 0.587 + s[ci + 2] * 0.114) / 255;
          const dist = Math.hypot(x - (Math.floor(x / size) * size + r2), y - (Math.floor(y / size) * size + r2));
          const v = dist < (1 - l) * r2 * 1.45 ? 0 : 255;
          d[i] = v; d[i + 1] = v; d[i + 2] = v;
        }
      }
    },
    // ---- batch 4 ----
    edge: function (d, W, H, p, t) {
      const k = FM.evalProp(p.amount, t) || 1, s = d.slice(), w4 = W * 4;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = (y * W + x) * 4;
          const tl = s[i - w4 - 4] * 0.299 + s[i - w4 - 3] * 0.587 + s[i - w4 - 2] * 0.114;
          const tc = s[i - w4] * 0.299 + s[i - w4 + 1] * 0.587 + s[i - w4 + 2] * 0.114;
          const tr = s[i - w4 + 4] * 0.299 + s[i - w4 + 5] * 0.587 + s[i - w4 + 6] * 0.114;
          const ml = s[i - 4] * 0.299 + s[i - 3] * 0.587 + s[i - 2] * 0.114;
          const mr = s[i + 4] * 0.299 + s[i + 5] * 0.587 + s[i + 6] * 0.114;
          const bl = s[i + w4 - 4] * 0.299 + s[i + w4 - 3] * 0.587 + s[i + w4 - 2] * 0.114;
          const bc = s[i + w4] * 0.299 + s[i + w4 + 1] * 0.587 + s[i + w4 + 2] * 0.114;
          const br = s[i + w4 + 4] * 0.299 + s[i + w4 + 5] * 0.587 + s[i + w4 + 6] * 0.114;
          const gx = (tr + 2 * mr + br) - (tl + 2 * ml + bl), gy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
          const mag = Math.min(255, Math.hypot(gx, gy) * k);
          d[i] = mag; d[i + 1] = mag; d[i + 2] = mag;
        }
      }
    },
    emboss: function (d, W, H, p, t) {
      const k = (FM.evalProp(p.amount, t) == null ? 1 : FM.evalProp(p.amount, t)), s = d.slice(), w4 = W * 4;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = (y * W + x) * 4;
          for (let c = 0; c < 3; c++) { const j = i + c; d[j] = 128 + (s[j - w4 - 4] * -2 + s[j - w4] * -1 + s[j - 4] * -1 + s[j + 4] + s[j + w4] + s[j + w4 + 4] * 2) * k; }
        }
      }
    },
    exposure: function (d, W, H, p, t) {
      const m = Math.pow(2, FM.evalProp(p.stops, t) || 0);
      for (let i = 0; i < d.length; i += 4) { d[i] *= m; d[i + 1] *= m; d[i + 2] *= m; }
    },
    // ---- batch 5 ----
    glitch: function (d, W, H, p, t) {
      const amt = clamp01(FM.evalProp(p.amount, t)); if (amt <= 0) return;
      const s = d.slice(), bands = 14, bandH = Math.max(1, Math.floor(H / bands)), frame = Math.floor(t * 10);
      for (let b = 0; b < bands; b++) {
        let h = (b * 2654435761 + frame * 40503) | 0; h = (h ^ (h >> 13)) * 1274126177; h = h ^ (h >> 16);
        const shift = Math.round(((h & 255) / 255 - 0.5) * amt * W * 0.28);
        if (!shift) continue;
        const y0 = b * bandH, y1 = Math.min(H, y0 + bandH);
        for (let y = y0; y < y1; y++) {
          const row = y * W * 4;
          for (let x = 0; x < W; x++) { let sx = x - shift; if (sx < 0) sx += W; else if (sx >= W) sx -= W; const i = row + x * 4, si = row + sx * 4; d[i] = s[si]; d[i + 1] = s[si + 1]; d[i + 2] = s[si + 2]; d[i + 3] = s[si + 3]; }
        }
      }
      const cs = Math.round(amt * 9);
      if (cs > 0) { const s2 = d.slice(); for (let y = 0; y < H; y++) { const row = y * W * 4; for (let x = 0; x < W; x++) { const i = row + x * 4; d[i] = s2[row + Math.min(W - 1, x + cs) * 4]; d[i + 2] = s2[row + Math.max(0, x - cs) * 4 + 2]; } } }
    },
    zoomblur: function (d, W, H, p, t) {
      const amt = FM.evalProp(p.amount, t) || 0; if (amt <= 0) return;
      const s = d.slice(), cx = W / 2, cy = H / 2, N = 9;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4, dx = x - cx, dy = y - cy; let r = 0, g = 0, b = 0, a = 0, n = 0;
          for (let k = 0; k < N; k++) {
            const f = 1 - (k / N) * amt * 0.35, sx = (cx + dx * f) | 0, sy = (cy + dy * f) | 0;
            if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
            const si = (sy * W + sx) * 4; r += s[si]; g += s[si + 1]; b += s[si + 2]; a += s[si + 3]; n++;
          }
          if (n) { d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; d[i + 3] = a / n; }
        }
      }
    },
    crt: function (d, W, H, p, t) {
      const amt = clamp01(FM.evalProp(p.amount, t)), cx = W / 2, cy = H / 2, maxR = Math.hypot(cx, cy);
      for (let y = 0; y < H; y++) {
        const scan = (y & 1) ? (1 - amt * 0.45) : 1, row = y * W;
        for (let x = 0; x < W; x++) {
          const i = (row + x) * 4, ph = x % 3;
          let kr = scan, kg = scan, kb = scan;
          if (ph === 0) { kg *= 1 - amt * 0.18; kb *= 1 - amt * 0.18; } else if (ph === 1) { kr *= 1 - amt * 0.18; kb *= 1 - amt * 0.18; } else { kr *= 1 - amt * 0.18; kg *= 1 - amt * 0.18; }
          const r = Math.hypot(x - cx, y - cy) / maxR, vg = 1 - amt * 0.55 * Math.max(0, r - 0.4);
          d[i] *= kr * vg; d[i + 1] *= kg * vg; d[i + 2] *= kb * vg;
        }
      }
    },
    // ---- batch 6 ----
    boxblur: function(d,W,H,p,t){ var bbr=Math.round(FM.evalProp(p.radius,t)||0); if(bbr<1)return; if(bbr>40)bbr=40; var bbWin=2*bbr+1, bbInv=1/bbWin, bbSrc=d.slice(), bbX, bbY, bbCh, bbBase, bbSum, bbIdx, bbN, bbW4=W*4; for(bbY=0;bbY<H;bbY++){ bbBase=bbY*bbW4; for(bbCh=0;bbCh<4;bbCh++){ bbSum=bbSrc[bbBase+bbCh]*(bbr+1); for(bbN=1;bbN<=bbr;bbN++){ bbX=bbN<W?bbN:W-1; bbSum+=bbSrc[bbBase+bbX*4+bbCh]; } for(bbX=0;bbX<W;bbX++){ d[bbBase+bbX*4+bbCh]=bbSum*bbInv; bbN=bbX+bbr+1; bbIdx=bbN<W?bbN:W-1; bbSum+=bbSrc[bbBase+bbIdx*4+bbCh]; bbN=bbX-bbr; bbIdx=bbN>0?bbN:0; bbSum-=bbSrc[bbBase+bbIdx*4+bbCh]; } } } bbSrc=d.slice(); for(bbX=0;bbX<W;bbX++){ bbBase=bbX*4; for(bbCh=0;bbCh<4;bbCh++){ bbSum=bbSrc[bbBase+bbCh]*(bbr+1); for(bbN=1;bbN<=bbr;bbN++){ bbY=bbN<H?bbN:H-1; bbSum+=bbSrc[bbBase+bbY*bbW4+bbCh]; } for(bbY=0;bbY<H;bbY++){ d[bbBase+bbY*bbW4+bbCh]=bbSum*bbInv; bbN=bbY+bbr+1; bbIdx=bbN<H?bbN:H-1; bbSum+=bbSrc[bbBase+bbIdx*bbW4+bbCh]; bbN=bbY-bbr; bbIdx=bbN>0?bbN:0; bbSum-=bbSrc[bbBase+bbIdx*bbW4+bbCh]; } } } },
    spinblur: function(d,W,H,p,t){ var sbAmt=FM.evalProp(p.amount,t); if(sbAmt==null)sbAmt=0.5; if(sbAmt<0)sbAmt=0; if(sbAmt>1)sbAmt=1; if(sbAmt<=0)return; var sbS=d.slice(); var sbCx=W/2, sbCy=H/2, sbW4=W*4; var sbSpan=sbAmt*0.4, sbN=9, sbHalf=(sbN-1)/2; var sbCos=new Float64Array(sbN), sbSin=new Float64Array(sbN); for(var sbk=0;sbk<sbN;sbk++){ var sbOff=(sbk-sbHalf)/sbHalf*sbSpan; sbCos[sbk]=Math.cos(sbOff); sbSin[sbk]=Math.sin(sbOff); } for(var sby=0;sby<H;sby++){ var sbDy=sby-sbCy; for(var sbx=0;sbx<W;sbx++){ var sbDx=sbx-sbCx; var sbR=0,sbG=0,sbB=0,sbA=0; for(var sbj=0;sbj<sbN;sbj++){ var sbC=sbCos[sbj], sbN2=sbSin[sbj]; var sbSx=sbCx+sbDx*sbC-sbDy*sbN2; var sbSy=sbCy+sbDx*sbN2+sbDy*sbC; var sbIx=sbSx<0?0:(sbSx>W-1?W-1:(sbSx+0.5)|0); var sbIy=sbSy<0?0:(sbSy>H-1?H-1:(sbSy+0.5)|0); var sbI=sbIy*sbW4+sbIx*4; sbR+=sbS[sbI]; sbG+=sbS[sbI+1]; sbB+=sbS[sbI+2]; sbA+=sbS[sbI+3]; } var sbO=sby*sbW4+sbx*4; d[sbO]=sbR/sbN; d[sbO+1]=sbG/sbN; d[sbO+2]=sbB/sbN; d[sbO+3]=sbA/sbN; } } },
    gradientmap: function(d,W,H,p,t){ var gmAmt=FM.evalProp(p.amount,t); if(gmAmt==null)gmAmt=1; if(gmAmt<0)gmAmt=0; if(gmAmt>1)gmAmt=1; var gmSh=hexToRGB(p.color)||[36,26,82], gmHi=hexToRGB(p.color2)||[255,184,108]; var gmS0=gmSh[0],gmS1=gmSh[1],gmS2=gmSh[2], gmD0=gmHi[0]-gmS0,gmD1=gmHi[1]-gmS1,gmD2=gmHi[2]-gmS2; for(var gmI=0;gmI<d.length;gmI+=4){ var gmL=(0.299*d[gmI]+0.587*d[gmI+1]+0.114*d[gmI+2])/255; var gmO0=gmS0+gmD0*gmL, gmO1=gmS1+gmD1*gmL, gmO2=gmS2+gmD2*gmL; d[gmI]=d[gmI]+(gmO0-d[gmI])*gmAmt; d[gmI+1]=d[gmI+1]+(gmO1-d[gmI+1])*gmAmt; d[gmI+2]=d[gmI+2]+(gmO2-d[gmI+2])*gmAmt; } },
    colorize: function(d,W,H,p,t){ var czAmt=FM.evalProp(p.amount,t); czAmt=(czAmt==null?1:czAmt); if(czAmt<0)czAmt=0; if(czAmt>1)czAmt=1; var czCol=hexToRGB(p.color)||[58,160,255]; var czR=czCol[0],czG=czCol[1],czB=czCol[2]; for(var czI=0;czI<d.length;czI+=4){ var czL=(0.299*d[czI]+0.587*d[czI+1]+0.114*d[czI+2])/255; var czF=0.25+0.75*czL; var czTR=czR*czF; var czTG=czG*czF; var czTB=czB*czF; if(czTR<0)czTR=0; else if(czTR>255)czTR=255; if(czTG<0)czTG=0; else if(czTG>255)czTG=255; if(czTB<0)czTB=0; else if(czTB>255)czTB=255; d[czI]=d[czI]+(czTR-d[czI])*czAmt; d[czI+1]=d[czI+1]+(czTG-d[czI+1])*czAmt; d[czI+2]=d[czI+2]+(czTB-d[czI+2])*czAmt; } },
    checker: function(d,W,H,p,t){ var chkSz=FM.evalProp(p.size,t); chkSz=(chkSz==null?24:chkSz); chkSz=Math.max(2,Math.min(120,Math.round(chkSz))); var chkCol=hexToRGB(p.color)||[0,0,0]; var chkR=chkCol[0],chkG=chkCol[1],chkB=chkCol[2]; for(var chkY=0;chkY<H;chkY++){ var chkRow=(chkY/chkSz)|0; var chkBase=chkY*W*4; for(var chkX=0;chkX<W;chkX++){ if((((chkX/chkSz)|0)+chkRow)&1){ var chkI=chkBase+chkX*4; if(d[chkI+3]>0){ d[chkI]=(d[chkI]+chkR)*0.5; d[chkI+1]=(d[chkI+1]+chkG)*0.5; d[chkI+2]=(d[chkI+2]+chkB)*0.5; } } } } },
    grid: function(d,W,H,p,t){ var grSize=FM.evalProp(p.size,t); grSize=(grSize==null?32:grSize); grSize=Math.round(grSize); if(grSize<4)grSize=4; if(grSize>160)grSize=160; var grLW=Math.max(1,Math.round(grSize*0.06)); var grCol=hexToRGB(p.color)||[255,255,255]; var grR=grCol[0],grG=grCol[1],grB=grCol[2]; for(var grY=0;grY<H;grY++){ var grYOn=((grY%grSize)<grLW); var grRow=grY*W*4; for(var grX=0;grX<W;grX++){ if(grYOn||((grX%grSize)<grLW)){ var grI=grRow+grX*4; if(d[grI+3]>0){ d[grI]=grR; d[grI+1]=grG; d[grI+2]=grB; } } } } },
    // ---- batch 7 (pixel) ----
    mosaic: function(d,W,H,p,t){ var moBs=Math.round(FM.evalProp(p.size,t)||16); if(moBs<2)moBs=2; if(moBs>100)moBs=100; var moS=d.slice(),moW4=W*4; for(var moBy=0;moBy<H;moBy+=moBs){ var moY1=Math.min(moBy+moBs,H); for(var moBx=0;moBx<W;moBx+=moBs){ var moX1=Math.min(moBx+moBs,W),moSr=0,moSg=0,moSb=0,moSa=0,moN=0; for(var moY=moBy;moY<moY1;moY++){ var moRow=moY*moW4; for(var moX=moBx;moX<moX1;moX++){ var moI=moRow+moX*4; moSr+=moS[moI]; moSg+=moS[moI+1]; moSb+=moS[moI+2]; moSa+=moS[moI+3]; moN++; } } if(moN===0)continue; var moAr=moSr/moN,moAg=moSg/moN,moAb=moSb/moN,moAa=moSa/moN; for(var moY2=moBy;moY2<moY1;moY2++){ var moRow2=moY2*moW4; for(var moX2=moBx;moX2<moX1;moX2++){ var moJ=moRow2+moX2*4; d[moJ]=moAr; d[moJ+1]=moAg; d[moJ+2]=moAb; d[moJ+3]=moAa; } } } } },
    lensblur: function(d,W,H,p,t){ var lb_r=FM.evalProp(p.radius,t); lb_r=(lb_r==null?10:lb_r); if(lb_r<0)lb_r=0; if(lb_r>30)lb_r=30; if(lb_r<1)return; var lb_s=d.slice(),lb_w4=W*4,lb_ox=new Float64Array(16),lb_oy=new Float64Array(16),lb_k; for(lb_k=0;lb_k<16;lb_k++){var lb_a=lb_k*2.399963,lb_rd=lb_r*Math.sqrt((lb_k+0.5)/16);lb_ox[lb_k]=Math.cos(lb_a)*lb_rd;lb_oy[lb_k]=Math.sin(lb_a)*lb_rd;} for(var lb_y=0;lb_y<H;lb_y++){for(var lb_x=0;lb_x<W;lb_x++){var lb_sr=0,lb_sg=0,lb_sb=0,lb_sa=0; for(lb_k=0;lb_k<16;lb_k++){var lb_sx=lb_x+lb_ox[lb_k]|0,lb_sy=lb_y+lb_oy[lb_k]|0; if(lb_sx<0)lb_sx=0; else if(lb_sx>=W)lb_sx=W-1; if(lb_sy<0)lb_sy=0; else if(lb_sy>=H)lb_sy=H-1; var lb_si=lb_sy*lb_w4+lb_sx*4; lb_sr+=lb_s[lb_si];lb_sg+=lb_s[lb_si+1];lb_sb+=lb_s[lb_si+2];lb_sa+=lb_s[lb_si+3];} var lb_di=lb_y*lb_w4+lb_x*4; d[lb_di]=lb_sr/16;d[lb_di+1]=lb_sg/16;d[lb_di+2]=lb_sb/16;d[lb_di+3]=lb_sa/16;}} },
    dots: function(d,W,H,p,t){ var dt_sz=FM.evalProp(p.size,t); if(dt_sz==null)dt_sz=16; dt_sz=Math.max(4,Math.min(80,dt_sz)); var dt_col=hexToRGB(p.color); var dt_cr=dt_sz*0.32, dt_r2=dt_cr*dt_cr, dt_a=0.85, dt_ia=1-dt_a, dt_w4=W*4; for(var dt_y=0;dt_y<H;dt_y++){ var dt_dcy=dt_y-(Math.floor(dt_y/dt_sz)*dt_sz+dt_sz/2); var dt_row=dt_y*dt_w4; for(var dt_x=0;dt_x<W;dt_x++){ var dt_i=dt_row+dt_x*4; if(d[dt_i+3]===0)continue; var dt_dcx=dt_x-(Math.floor(dt_x/dt_sz)*dt_sz+dt_sz/2); if(dt_dcx*dt_dcx+dt_dcy*dt_dcy<=dt_r2){ d[dt_i]=d[dt_i]*dt_ia+dt_col[0]*dt_a; d[dt_i+1]=d[dt_i+1]*dt_ia+dt_col[1]*dt_a; d[dt_i+2]=d[dt_i+2]*dt_ia+dt_col[2]*dt_a; } } } },
    // ---- batch 8 (pixel) ----
    lightglow: function(d,W,H,p,t){ var lgAmt=FM.evalProp(p.amount,t); if(lgAmt==null)lgAmt=0.6; lgAmt=lgAmt<0?0:(lgAmt>1?1:lgAmt); if(lgAmt<=0)return; var lgN=W*H, lgBright=new Float32Array(lgN), lgTmp=new Float32Array(lgN), lgi, lgp4; for(lgi=0;lgi<lgN;lgi++){ lgp4=lgi*4; if(d[lgp4+3]===0){lgBright[lgi]=0;continue;} var lgL=0.299*d[lgp4]+0.587*d[lgp4+1]+0.114*d[lgp4+2]; lgBright[lgi]=lgL>153?lgL:0; } var lgR=6, lgDiv=2*lgR+1, lgx, lgy, lgRow, lgSum, lgIdx; for(lgy=0;lgy<H;lgy++){ lgRow=lgy*W; lgSum=0; for(lgx=-lgR;lgx<=lgR;lgx++){ var lgcx=lgx<0?0:(lgx>=W?W-1:lgx); lgSum+=lgBright[lgRow+lgcx]; } for(lgx=0;lgx<W;lgx++){ lgTmp[lgRow+lgx]=lgSum/lgDiv; var lgAddX=lgx+lgR+1; lgAddX=lgAddX>=W?W-1:lgAddX; var lgSubX=lgx-lgR; lgSubX=lgSubX<0?0:lgSubX; lgSum+=lgBright[lgRow+lgAddX]-lgBright[lgRow+lgSubX]; } } for(lgx=0;lgx<W;lgx++){ lgSum=0; for(lgy=-lgR;lgy<=lgR;lgy++){ var lgcy=lgy<0?0:(lgy>=H?H-1:lgy); lgSum+=lgTmp[lgcy*W+lgx]; } for(lgy=0;lgy<H;lgy++){ lgBright[lgy*W+lgx]=lgSum/lgDiv; var lgAddY=lgy+lgR+1; lgAddY=lgAddY>=H?H-1:lgAddY; var lgSubY=lgy-lgR; lgSubY=lgSubY<0?0:lgSubY; lgSum+=lgTmp[lgAddY*W+lgx]-lgTmp[lgSubY*W+lgx]; } } for(lgi=0;lgi<lgN;lgi++){ lgp4=lgi*4; if(d[lgp4+3]===0)continue; var lgGlow=lgBright[lgi]*lgAmt; if(lgGlow<=0)continue; if(lgGlow>255)lgGlow=255; var lgF=(255-lgGlow)/255; d[lgp4]=255-(255-d[lgp4])*lgF; d[lgp4+1]=255-(255-d[lgp4+1])*lgF; d[lgp4+2]=255-(255-d[lgp4+2])*lgF; } },
    longshadow: function(d,W,H,p,t){ var lsLen=FM.evalProp(p.length,t); if(lsLen==null)lsLen=30; lsLen=Math.max(0,Math.min(80,Math.round(lsLen))); if(lsLen<=0)return; var lsCol=hexToRGB(p.color)||[0,0,0]; var lsR=lsCol[0]&255,lsG=lsCol[1]&255,lsB=lsCol[2]&255; var s=d.slice(); var lsND=W+H-1, lsDiag; for(lsDiag=0;lsDiag<lsND;lsDiag++){ var lsX0,lsY0; if(lsDiag<W){lsX0=lsDiag;lsY0=0;}else{lsX0=0;lsY0=lsDiag-W+1;} var lsX=lsX0,lsY=lsY0,lsCount=0; while(lsX<W&&lsY<H){ var lsI=(lsY*W+lsX)*4; if(s[lsI+3]>0){lsCount=0;}else{ lsCount++; if(lsCount<=lsLen){ d[lsI]=lsR; d[lsI+1]=lsG; d[lsI+2]=lsB; d[lsI+3]=255; } } lsX++; lsY++; } } },
    halftonelines: function(d,W,H,p,t){ var htlSize=FM.evalProp(p.size,t); if(htlSize==null||isNaN(htlSize))htlSize=8; htlSize=Math.max(3,Math.min(40,Math.round(htlSize))); var htlW4=W*4; for(var htlY=0;htlY<H;htlY++){ var htlRowMod=((htlY%htlSize)+htlSize)%htlSize; var htlRowBase=htlY*htlW4; for(var htlX=0;htlX<W;htlX++){ var htlI=htlRowBase+htlX*4; if(d[htlI+3]===0)continue; var htlL=(0.299*d[htlI]+0.587*d[htlI+1]+0.114*d[htlI+2])/255; if(htlL<0)htlL=0; else if(htlL>1)htlL=1; var htlThresh=(1-htlL)*htlSize; var htlV=(htlRowMod<htlThresh)?0:255; d[htlI]=htlV; d[htlI+1]=htlV; d[htlI+2]=htlV; } } },
    clouds: function(d,W,H,p,t){ var cl_amt=FM.evalProp(p.amount,t); if(cl_amt==null)cl_amt=0.6; cl_amt=cl_amt<0?0:(cl_amt>1?1:cl_amt); if(cl_amt<=0)return; function cl_hash(cx,cy){ var cl_h=(cx*374761393+cy*668265263)|0; cl_h=(cl_h^(cl_h>>>13))*1274126177|0; cl_h=cl_h^(cl_h>>>16); return ((cl_h>>>0)%1000)/999; } function cl_smooth(cl_f){ return cl_f*cl_f*(3-2*cl_f); } var cl_cells=[64,32,16], cl_wts=[0.5715,0.2857,0.1428]; var cl_w4=W*4; for(var cl_y=0;cl_y<H;cl_y++){ for(var cl_x=0;cl_x<W;cl_x++){ var cl_i=cl_y*cl_w4+cl_x*4; if(d[cl_i+3]<=0)continue; var cl_sum=0; for(var cl_o=0;cl_o<3;cl_o++){ var cl_C=cl_cells[cl_o]; var cl_gx=Math.floor(cl_x/cl_C), cl_gy=Math.floor(cl_y/cl_C); var cl_fx=(cl_x-cl_gx*cl_C)/cl_C, cl_fy=(cl_y-cl_gy*cl_C)/cl_C; var cl_v00=cl_hash(cl_gx,cl_gy), cl_v10=cl_hash(cl_gx+1,cl_gy), cl_v01=cl_hash(cl_gx,cl_gy+1), cl_v11=cl_hash(cl_gx+1,cl_gy+1); var cl_sx=cl_smooth(cl_fx), cl_sy=cl_smooth(cl_fy); var cl_top=cl_v00+(cl_v10-cl_v00)*cl_sx; var cl_bot=cl_v01+(cl_v11-cl_v01)*cl_sx; cl_sum+=(cl_top+(cl_bot-cl_top)*cl_sy)*cl_wts[cl_o]; } var cl_g=cl_sum*255; if(cl_g<0)cl_g=0; if(cl_g>255)cl_g=255; d[cl_i]=d[cl_i]+(cl_g-d[cl_i])*cl_amt; d[cl_i+1]=d[cl_i+1]+(cl_g-d[cl_i+1])*cl_amt; d[cl_i+2]=d[cl_i+2]+(cl_g-d[cl_i+2])*cl_amt; } } },
    rays: function(d,W,H,p,t){ var raysCount=FM.evalProp(p.count,t); if(raysCount==null)raysCount=16; raysCount=Math.max(3,Math.min(64,Math.round(raysCount))); var raysCol=hexToRGB(p.color); if(!raysCol)raysCol=[255,255,255]; var raysCr=raysCol[0],raysCg=raysCol[1],raysCb=raysCol[2]; var raysCx=W/2,raysCy=H/2; for(var raysY=0;raysY<H;raysY++){ var raysDy=raysY-raysCy; var raysRow=raysY*W*4; for(var raysX=0;raysX<W;raysX++){ var raysI=raysRow+raysX*4; if(d[raysI+3]===0)continue; var raysA=Math.atan2(raysDy,raysX-raysCx); var raysInt=Math.cos(raysA*raysCount)*0.5+0.5; var raysAmt=raysInt*0.6; var raysInv=1-raysAmt; d[raysI]=d[raysI]*raysInv+raysCr*raysAmt; d[raysI+1]=d[raysI+1]*raysInv+raysCg*raysAmt; d[raysI+2]=d[raysI+2]*raysInv+raysCb*raysAmt; } } },
    stripes: function(d,W,H,p,t){ var stp_size=FM.evalProp(p.size,t); if(stp_size==null)stp_size=16; stp_size=Math.max(4,Math.min(80,stp_size)); var stp_period=Math.max(2,Math.round(stp_size)); var stp_half=stp_period*0.5; var stp_c=hexToRGB(p.color); var stp_r=stp_c[0],stp_g=stp_c[1],stp_b=stp_c[2]; var stp_k=0.6,stp_ik=1-stp_k; for(var stp_y=0;stp_y<H;stp_y++){ var stp_row=stp_y*W*4; for(var stp_x=0;stp_x<W;stp_x++){ var stp_i=stp_row+stp_x*4; if(d[stp_i+3]<=0)continue; var stp_m=(stp_x+stp_y)%stp_period; if(stp_m<0)stp_m+=stp_period; if(stp_m<stp_half){ d[stp_i]=d[stp_i]*stp_ik+stp_r*stp_k; d[stp_i+1]=d[stp_i+1]*stp_ik+stp_g*stp_k; d[stp_i+2]=d[stp_i+2]*stp_ik+stp_b*stp_k; } } } },
    // ---- batch 9 (pixel) ----
    darkglow: function(d,W,H,p,t){ var dgAmt=FM.evalProp(p.amount,t); if(dgAmt==null)dgAmt=0.6; dgAmt=Math.max(0,Math.min(1,dgAmt)); if(dgAmt<=0)return; var dgN=W*H; var dgDark=new Float32Array(dgN); var dgI4,dgL; for(var dgi=0;dgi<dgN;dgi++){ dgI4=dgi*4; if(d[dgI4+3]>0){ dgL=0.299*d[dgI4]+0.587*d[dgI4+1]+0.114*d[dgI4+2]; if(dgL<102)dgDark[dgi]=255-dgL; } } var dgR=6,dgWin=2*dgR+1,dgInv=1/dgWin; var dgTmp=new Float32Array(dgN); var dgx,dgy,dgsum,dgrow,dgxa; for(dgy=0;dgy<H;dgy++){ dgrow=dgy*W; dgsum=0; for(dgx=-dgR;dgx<=dgR;dgx++){ dgxa=dgx<0?0:(dgx>=W?W-1:dgx); dgsum+=dgDark[dgrow+dgxa]; } for(dgx=0;dgx<W;dgx++){ dgTmp[dgrow+dgx]=dgsum*dgInv; var dgAdd=dgx+dgR+1; dgAdd=dgAdd>=W?W-1:dgAdd; var dgSub=dgx-dgR; dgSub=dgSub<0?0:dgSub; dgsum+=dgDark[dgrow+dgAdd]-dgDark[dgrow+dgSub]; } } for(dgx=0;dgx<W;dgx++){ dgsum=0; for(dgy=-dgR;dgy<=dgR;dgy++){ var dgya=dgy<0?0:(dgy>=H?H-1:dgy); dgsum+=dgTmp[dgya*W+dgx]; } for(dgy=0;dgy<H;dgy++){ dgDark[dgy*W+dgx]=dgsum*dgInv; var dgAddY=dgy+dgR+1; dgAddY=dgAddY>=H?H-1:dgAddY; var dgSubY=dgy-dgR; dgSubY=dgSubY<0?0:dgSubY; dgsum+=dgTmp[dgAddY*W+dgx]-dgTmp[dgSubY*W+dgx]; } } for(var dgj=0;dgj<dgN;dgj++){ dgI4=dgj*4; if(d[dgI4+3]>0){ var dgF=1-(dgDark[dgj]/255)*dgAmt; if(dgF<0)dgF=0; d[dgI4]=d[dgI4]*dgF; d[dgI4+1]=d[dgI4+1]*dgF; d[dgI4+2]=d[dgI4+2]*dgF; } } },
    stroke: function(d,W,H,p,t){ var st_w=Math.round(FM.evalProp(p.width,t)); if(!(st_w>=1))st_w=4; if(st_w>16)st_w=16; var st_col=hexToRGB(p.color)||[255,255,255]; var st_N=W*H, st_w4=W*4; var st_x,st_y,st_i; var st_src=new Uint8Array(st_N); for(st_i=0;st_i<st_N;st_i++)st_src[st_i]=(d[st_i*4+3]>0)?1:0; var st_h=new Uint8Array(st_N); for(st_y=0;st_y<H;st_y++){ var st_row=st_y*W; var st_acc=0; var st_lo,st_hi; for(st_x=0;st_x<W;st_x++){ st_lo=st_x-st_w; if(st_lo<0)st_lo=0; st_hi=st_x+st_w; if(st_hi>W-1)st_hi=W-1; if(st_x===0){ st_acc=0; for(var st_k=st_lo;st_k<=st_hi;st_k++)st_acc+=st_src[st_row+st_k]; } else { var st_addH=st_x+st_w; if(st_addH<=W-1)st_acc+=st_src[st_row+st_addH]; var st_remH=st_x-st_w-1; if(st_remH>=0)st_acc-=st_src[st_row+st_remH]; } st_h[st_row+st_x]=st_acc>0?1:0; } } var st_dil=new Uint8Array(st_N); for(st_x=0;st_x<W;st_x++){ var st_accV=0; var st_loV,st_hiV; for(st_y=0;st_y<H;st_y++){ st_loV=st_y-st_w; if(st_loV<0)st_loV=0; st_hiV=st_y+st_w; if(st_hiV>H-1)st_hiV=H-1; if(st_y===0){ st_accV=0; for(var st_kv=st_loV;st_kv<=st_hiV;st_kv++)st_accV+=st_h[st_kv*W+st_x]; } else { var st_addV=st_y+st_w; if(st_addV<=H-1)st_accV+=st_h[st_addV*W+st_x]; var st_remV=st_y-st_w-1; if(st_remV>=0)st_accV-=st_h[st_remV*W+st_x]; } st_dil[st_y*W+st_x]=st_accV>0?1:0; } } for(st_i=0;st_i<st_N;st_i++){ if(st_dil[st_i]===1 && st_src[st_i]===0){ var st_o=st_i*4; d[st_o]=st_col[0]; d[st_o+1]=st_col[1]; d[st_o+2]=st_col[2]; d[st_o+3]=255; } } },
    smoothedges: function(d,W,H,p,t){ var seR=Math.round(FM.evalProp(p.radius,t)); if(seR==null||isNaN(seR))seR=4; if(seR<1)return; if(seR>20)seR=20; var seW=W,seH=H,seN=seW*seH; var seA=new Float32Array(seN),seTmp=new Float32Array(seN); var sei,sex,sey; for(sei=0;sei<seN;sei++){ seA[sei]=d[sei*4+3]; } var seWin=seR*2+1,seInv=1/seWin; for(sey=0;sey<seH;sey++){ var seRow=sey*seW,seSum=0,sek; for(sek=-seR;sek<=seR;sek++){ var seXc=sek<0?0:(sek>=seW?seW-1:sek); seSum+=seA[seRow+seXc]; } for(sex=0;sex<seW;sex++){ seTmp[seRow+sex]=seSum*seInv; var seAddX=sex+seR+1; seAddX=seAddX>=seW?seW-1:seAddX; var seSubX=sex-seR; seSubX=seSubX<0?0:seSubX; seSum+=seA[seRow+seAddX]-seA[seRow+seSubX]; } } for(sex=0;sex<seW;sex++){ var seSumV=0,sekk; for(sekk=-seR;sekk<=seR;sekk++){ var seYc=sekk<0?0:(sekk>=seH?seH-1:sekk); seSumV+=seTmp[seYc*seW+sex]; } for(sey=0;sey<seH;sey++){ var seVal=seSumV*seInv; d[(sey*seW+sex)*4+3]=seVal<0?0:(seVal>255?255:seVal); var seAddY=sey+seR+1; seAddY=seAddY>=seH?seH-1:seAddY; var seSubY=sey-seR; seSubY=seSubY<0?0:seSubY; seSumV+=seTmp[seAddY*seW+sex]-seTmp[seSubY*seW+sex]; } } },
    blocknoise: function(d,W,H,p,t){ var bnAmt=FM.evalProp(p.amount,t); if(bnAmt==null)bnAmt=0.5; bnAmt=Math.max(0,Math.min(1,bnAmt)); var bnK=bnAmt*0.6, bnInv=1-bnK; if(bnK<=0)return; var bnFrame=Math.floor(t*8)|0, bnW4=W*4; for(var bnY=0;bnY<H;bnY++){ var bnBy=(bnY/6)|0, bnRow=bnY*bnW4; for(var bnX=0;bnX<W;bnX++){ var bnI=bnRow+bnX*4; if(d[bnI+3]<=0)continue; var bnBx=(bnX/6)|0; var bnHsh=(bnBx*374761393+bnBy*668265263+bnFrame*2147483647)|0; bnHsh=(bnHsh^(bnHsh>>>13))*1274126177|0; bnHsh=bnHsh^(bnHsh>>>16); var bnG=(bnHsh>>>0)&255; d[bnI]=d[bnI]*bnInv+bnG*bnK; d[bnI+1]=d[bnI+1]*bnInv+bnG*bnK; d[bnI+2]=d[bnI+2]*bnInv+bnG*bnK; } } },
    starfield: function(sf_d,sf_W,sf_H,sf_p,sf_t){ var sf_amt=FM.evalProp(sf_p.amount,sf_t); if(sf_amt==null)sf_amt=0.5; sf_amt=Math.max(0,Math.min(1,sf_amt)); var sf_thr=sf_amt*0.03; if(sf_thr<=0)return; var sf_col=hexToRGB(sf_p.color)||[255,255,255]; var sf_w4=sf_W*4; for(var sf_y=0;sf_y<sf_H;sf_y++){ var sf_row=sf_y*sf_w4; for(var sf_x=0;sf_x<sf_W;sf_x++){ var sf_i=sf_row+sf_x*4; if(sf_d[sf_i+3]<=0)continue; var sf_h=(sf_x*374761393+sf_y*668265263)|0; sf_h=(sf_h^(sf_h>>>13))*1274126177; sf_h=sf_h^(sf_h>>>16); var sf_r=(sf_h>>>0)/4294967295; if(sf_r<sf_thr){ sf_d[sf_i]=sf_col[0]; sf_d[sf_i+1]=sf_col[1]; sf_d[sf_i+2]=sf_col[2]; sf_d[sf_i+3]=255; } } } },
    // ---- batch 10 (pixel) ----
    bumpmap: function(d,W,H,p,t){ var bmAmt=FM.evalProp(p.amount,t); if(bmAmt==null)bmAmt=1.2; bmAmt=Math.max(0,Math.min(3,bmAmt)); var bmS=d.slice(); var bmW4=W*4; var bmK=4; var bmLx=-0.5,bmLy=-0.5,bmLz=1; var bmLlen=Math.sqrt(bmLx*bmLx+bmLy*bmLy+bmLz*bmLz); bmLx/=bmLlen; bmLy/=bmLlen; bmLz/=bmLlen; for(var bmY=0;bmY<H;bmY++){ var bmYu=bmY>0?bmY-1:0; var bmYd=bmY<H-1?bmY+1:H-1; for(var bmX=0;bmX<W;bmX++){ var bmI=(bmY*W+bmX)*4; if(bmS[bmI+3]===0){ d[bmI]=bmS[bmI]; d[bmI+1]=bmS[bmI+1]; d[bmI+2]=bmS[bmI+2]; continue; } var bmXl=bmX>0?bmX-1:0; var bmXr=bmX<W-1?bmX+1:W-1; var bmIl=(bmY*W+bmXl)*4; var bmIr=(bmY*W+bmXr)*4; var bmIu=(bmYu*W+bmX)*4; var bmId=(bmYd*W+bmX)*4; var bmLumL=0.299*bmS[bmIl]+0.587*bmS[bmIl+1]+0.114*bmS[bmIl+2]; var bmLumR=0.299*bmS[bmIr]+0.587*bmS[bmIr+1]+0.114*bmS[bmIr+2]; var bmLumU=0.299*bmS[bmIu]+0.587*bmS[bmIu+1]+0.114*bmS[bmIu+2]; var bmLumD=0.299*bmS[bmId]+0.587*bmS[bmId+1]+0.114*bmS[bmId+2]; var bmGx=(bmLumR-bmLumL)/255; var bmGy=(bmLumD-bmLumU)/255; var bmNx=-bmGx, bmNy=-bmGy, bmNz=bmK; var bmNlen=Math.sqrt(bmNx*bmNx+bmNy*bmNy+bmNz*bmNz); if(bmNlen<1e-6)bmNlen=1e-6; bmNx/=bmNlen; bmNy/=bmNlen; bmNz/=bmNlen; var bmDiff=bmNx*bmLx+bmNy*bmLy+bmNz*bmLz; if(bmDiff<0)bmDiff=0; var bmF=0.5+bmAmt*0.6*bmDiff; var bmR=bmS[bmI]*bmF; var bmG=bmS[bmI+1]*bmF; var bmB=bmS[bmI+2]*bmF; d[bmI]=bmR>255?255:(bmR<0?0:bmR); d[bmI+1]=bmG>255?255:(bmG<0?0:bmG); d[bmI+2]=bmB>255?255:(bmB<0?0:bmB); } } },
    edgeglow: function(d,W,H,p,t){ var egAmt=FM.evalProp(p.amount,t); if(egAmt==null)egAmt=1.5; egAmt=Math.max(0,Math.min(4,egAmt)); if(egAmt<=0)return; var egCol=hexToRGB(p.color); if(!egCol)egCol=[0,255,234]; var egW4=W*4, egN=W*H, s=d.slice(); var egLum=new Float32Array(egN); var egi,egx,egy,egp; for(egi=0;egi<egN;egi++){ egp=egi*4; egLum[egi]=0.299*s[egp]+0.587*s[egp+1]+0.114*s[egp+2]; } var egEdge=new Float32Array(egN); for(egy=0;egy<H;egy++){ var egym=egy>0?egy-1:0, egyp=egy<H-1?egy+1:H-1; for(egx=0;egx<W;egx++){ var egxm=egx>0?egx-1:0, egxp=egx<W-1?egx+1:W-1; var egTL=egLum[egym*W+egxm], egT=egLum[egym*W+egx], egTR=egLum[egym*W+egxp], egL=egLum[egy*W+egxm], egR=egLum[egy*W+egxp], egBL=egyp*W+egxm, egB=egyp*W+egx, egBR=egyp*W+egxp; var egGx=(egTR+2*egR+egLum[egBR])-(egTL+2*egL+egLum[egBL]); var egGy=(egLum[egBL]+2*egLum[egB]+egLum[egBR])-(egTL+2*egT+egTR); egEdge[egy*W+egx]=Math.sqrt(egGx*egGx+egGy*egGy); } } var egRad=3, egDiv=egRad*2+1; var egTmp=new Float32Array(egN), egBlur=new Float32Array(egN); for(egy=0;egy<H;egy++){ var egAcc=0, egRow=egy*W, egk; for(egk=-egRad;egk<=egRad;egk++){ var egcx=egk<0?0:(egk>W-1?W-1:egk); egAcc+=egEdge[egRow+egcx]; } for(egx=0;egx<W;egx++){ egTmp[egRow+egx]=egAcc/egDiv; var egout=egx-egRad, egin=egx+egRad+1; var egoc=egout<0?0:(egout>W-1?W-1:egout); var egic=egin<0?0:(egin>W-1?W-1:egin); egAcc+=egEdge[egRow+egic]-egEdge[egRow+egoc]; } } for(egx=0;egx<W;egx++){ var egAccV=0, egj; for(egj=-egRad;egj<=egRad;egj++){ var egcy=egj<0?0:(egj>H-1?H-1:egj); egAccV+=egTmp[egcy*W+egx]; } for(egy=0;egy<H;egy++){ egBlur[egy*W+egx]=egAccV/egDiv; var egouty=egy-egRad, eginy=egy+egRad+1; var egocy=egouty<0?0:(egouty>H-1?H-1:egouty); var egicy=eginy<0?0:(eginy>H-1?H-1:eginy); egAccV+=egTmp[egicy*W+egx]-egTmp[egocy*W+egx]; } } var egcr=egCol[0], egcg=egCol[1], egcb=egCol[2]; for(egi=0;egi<egN;egi++){ egp=egi*4; if(d[egp+3]<=0)continue; var egg=(egBlur[egi]/255)*egAmt; if(egg<=0)continue; var egsr=egcr*egg, egsg=egcg*egg, egsb=egcb*egg; if(egsr>255)egsr=255; if(egsg>255)egsg=255; if(egsb>255)egsb=255; d[egp]=255-(255-d[egp])*(255-egsr)/255; d[egp+1]=255-(255-d[egp+1])*(255-egsg)/255; d[egp+2]=255-(255-d[egp+2])*(255-egsb)/255; } },
    contourlines: function(d,W,H,p,t){ var clLv=Math.round(FM.evalProp(p.levels,t)||8); if(clLv<2)clLv=2; if(clLv>24)clLv=24; var clS=d.slice(),clW4=W*4,clScl=clLv/255; var clBand=new Int16Array(W*H); for(var clI=0,clJ=0;clI<clS.length;clI+=4,clJ++){ var clLum=0.299*clS[clI]+0.587*clS[clI+1]+0.114*clS[clI+2],clB=Math.floor(clLum*clScl); if(clB>=clLv)clB=clLv-1; clBand[clJ]=clB; } for(var clY=0;clY<H;clY++){ for(var clX=0;clX<W;clX++){ var clIdx=(clY*W+clX)*4; if(clS[clIdx+3]===0)continue; var clP=clY*W+clX,clBc=clBand[clP],clXr=clX+1<W?clX+1:clX,clYb=clY+1<H?clY+1:clY,clBr=clBand[clY*W+clXr],clBb=clBand[clYb*W+clX]; if(clBc!==clBr||clBc!==clBb){ d[clIdx]=0; d[clIdx+1]=0; d[clIdx+2]=0; } } } },
    grunge: function(gr_d,gr_W,gr_H,gr_p,gr_t){ var gr_amt=FM.evalProp(gr_p.amount,gr_t); if(gr_amt==null)gr_amt=0.5; gr_amt=Math.max(0,Math.min(1,gr_amt)); var gr_thr=gr_amt*0.55, gr_mot=gr_amt*0.15; var gr_w4=gr_W*4; for(var gr_y=0;gr_y<gr_H;gr_y++){ var gr_row=gr_y*gr_w4; for(var gr_x=0;gr_x<gr_W;gr_x++){ var gr_i=gr_row+gr_x*4; if(gr_d[gr_i+3]<=0)continue; var gr_h=(gr_x*73856093)^(gr_y*19349663); gr_h=gr_h^(gr_h>>>13); gr_h=(gr_h*1274126177)>>>0; var gr_n=(gr_h>>>8)/16777216; var gr_h2=(gr_x*83492791)^(gr_y*2654435761); gr_h2=gr_h2^(gr_h2>>>15); gr_h2=(gr_h2*40503)>>>0; var gr_n2=(gr_h2>>>8)/16777216; var gr_mul=1-gr_mot*(gr_n-0.5); if(gr_n<gr_thr){ gr_mul*=(0.25+0.6*gr_n2); } if(gr_mul<0)gr_mul=0; gr_d[gr_i]=gr_d[gr_i]*gr_mul; gr_d[gr_i+1]=gr_d[gr_i+1]*gr_mul; gr_d[gr_i+2]=gr_d[gr_i+2]*gr_mul; } } },
    iridescence: function(d,W,H,p,t){ var iri_amt=FM.evalProp(p.amount,t); if(iri_amt==null)iri_amt=0.7; iri_amt=iri_amt<0?0:(iri_amt>1?1:iri_amt); if(iri_amt<=0)return; for(var iri_y=0;iri_y<H;iri_y++){ var iri_row=iri_y*W*4; for(var iri_x=0;iri_x<W;iri_x++){ var iri_i=iri_row+iri_x*4; if(d[iri_i+3]<=0)continue; var iri_r=d[iri_i],iri_g=d[iri_i+1],iri_b=d[iri_i+2]; var iri_l=(0.299*iri_r+0.587*iri_g+0.114*iri_b)/255; var iri_h=(iri_l*3+(iri_x+iri_y)/120); iri_h=iri_h-Math.floor(iri_h); var iri_h6=iri_h*6; var iri_cr=Math.abs(iri_h6-3)-1; iri_cr=iri_cr<0?0:(iri_cr>1?1:iri_cr); var iri_cg=2-Math.abs(iri_h6-2); iri_cg=iri_cg<0?0:(iri_cg>1?1:iri_cg); var iri_cb=2-Math.abs(iri_h6-4); iri_cb=iri_cb<0?0:(iri_cb>1?1:iri_cb); var iri_sr=iri_cr*iri_l*255,iri_sg=iri_cg*iri_l*255,iri_sb=iri_cb*iri_l*255; d[iri_i]=iri_r+(iri_sr-iri_r)*iri_amt; d[iri_i+1]=iri_g+(iri_sg-iri_g)*iri_amt; d[iri_i+2]=iri_b+(iri_sb-iri_b)*iri_amt; } } },
    // ---- batch 11 (multi-param pixel) ----
    motionblur: function(d,W,H,p,t){ var mbDist=FM.evalProp(p.distance,t); if(mbDist==null)mbDist=20; mbDist=Math.max(0,Math.min(60,mbDist)); if(mbDist<1)return; var mbAng=FM.evalProp(p.angle,t); if(mbAng==null)mbAng=0; mbAng=Math.max(0,Math.min(360,mbAng)); var mbRad=mbAng*Math.PI/180; var mbDx=Math.cos(mbRad); var mbDy=Math.sin(mbRad); var mbStep=mbDist/8; var mbS=d.slice(); var mbXmax=W-1, mbYmax=H-1; for(var mbY=0;mbY<H;mbY++){ for(var mbX=0;mbX<W;mbX++){ var mbI=(mbY*W+mbX)*4; if(mbS[mbI+3]===0)continue; var mbR=0,mbG=0,mbB=0,mbA=0; for(var mbK=-4;mbK<=4;mbK++){ var mbOff=mbK*mbStep; var mbSx=Math.round(mbX+mbDx*mbOff); var mbSy=Math.round(mbY+mbDy*mbOff); if(mbSx<0)mbSx=0; else if(mbSx>mbXmax)mbSx=mbXmax; if(mbSy<0)mbSy=0; else if(mbSy>mbYmax)mbSy=mbYmax; var mbJ=(mbSy*W+mbSx)*4; mbR+=mbS[mbJ]; mbG+=mbS[mbJ+1]; mbB+=mbS[mbJ+2]; mbA+=mbS[mbJ+3]; } d[mbI]=mbR/9; d[mbI+1]=mbG/9; d[mbI+2]=mbB/9; d[mbI+3]=mbA/9; } } },
    colorbalance: function(d,W,H,p,t){ var cbR=FM.evalProp(p.red,t); if(cbR==null)cbR=25; cbR=cbR<-100?-100:(cbR>100?100:cbR); var cbG=FM.evalProp(p.green,t); if(cbG==null)cbG=0; cbG=cbG<-100?-100:(cbG>100?100:cbG); var cbB=FM.evalProp(p.blue,t); if(cbB==null)cbB=-25; cbB=cbB<-100?-100:(cbB>100?100:cbB); var cbAddR=cbR/100*80, cbAddG=cbG/100*80, cbAddB=cbB/100*80; var cbN=W*H*4; for(var cbI=0;cbI<cbN;cbI+=4){ if(d[cbI+3]>0){ var cbVr=d[cbI]+cbAddR; d[cbI]=cbVr<0?0:(cbVr>255?255:cbVr); var cbVg=d[cbI+1]+cbAddG; d[cbI+1]=cbVg<0?0:(cbVg>255?255:cbVg); var cbVb=d[cbI+2]+cbAddB; d[cbI+2]=cbVb<0?0:(cbVb>255?255:cbVb); } } },
    highlightsshadows: function(d,W,H,p,t){ var hsHi=FM.evalProp(p.highlights,t); if(hsHi==null)hsHi=-40; hsHi=hsHi<-100?-100:hsHi>100?100:hsHi; var hsSh=FM.evalProp(p.shadows,t); if(hsSh==null)hsSh=50; hsSh=hsSh<-100?-100:hsSh>100?100:hsSh; var hsSA=hsSh/100*120, hsHA=hsHi/100*120; var hsN=W*H*4; for(var hsI=0;hsI<hsN;hsI+=4){ if(d[hsI+3]<=0)continue; var hsR=d[hsI], hsG=d[hsI+1], hsB=d[hsI+2]; var hsL=(0.299*hsR+0.587*hsG+0.114*hsB)/255; if(hsL<0)hsL=0; else if(hsL>1)hsL=1; var hsInv=1-hsL; var hsWS=hsInv*hsInv; var hsWH=hsL*hsL; var hsAdd=hsSA*hsWS+hsHA*hsWH; var hsO; hsO=hsR+hsAdd; d[hsI]=hsO<0?0:hsO>255?255:hsO; hsO=hsG+hsAdd; d[hsI+1]=hsO<0?0:hsO>255?255:hsO; hsO=hsB+hsAdd; d[hsI+2]=hsO<0?0:hsO>255?255:hsO; } },
    tiltshift: function(d,W,H,p,t){ var tsCenter=FM.evalProp(p.center,t); if(tsCenter==null)tsCenter=0.5; tsCenter=tsCenter<0?0:(tsCenter>1?1:tsCenter); var tsSoft=FM.evalProp(p.softness,t); if(tsSoft==null)tsSoft=0.5; tsSoft=tsSoft<0?0:(tsSoft>1?1:tsSoft); var tsW4=W*4, tsLen=d.length, tsR=8; var tsSrc=d.slice(); var tsTmp=new Float32Array(tsLen); var tsx,tsy,tsc,tsi,tsj,tsAcc,tsCnt,tsBase; for(tsy=0;tsy<H;tsy++){ var tsRow=tsy*tsW4; for(tsx=0;tsx<W;tsx++){ tsBase=tsRow+tsx*4; for(tsc=0;tsc<4;tsc++){ tsAcc=0; tsCnt=0; for(tsj=-tsR;tsj<=tsR;tsj++){ var tsnx=tsx+tsj; if(tsnx<0)tsnx=0; else if(tsnx>=W)tsnx=W-1; tsAcc+=tsSrc[tsRow+tsnx*4+tsc]; tsCnt++; } tsTmp[tsBase+tsc]=tsAcc/tsCnt; } } } var tsBlur=new Float32Array(tsLen); for(tsx=0;tsx<W;tsx++){ var tsCol=tsx*4; for(tsy=0;tsy<H;tsy++){ tsBase=tsy*tsW4+tsCol; for(tsc=0;tsc<4;tsc++){ tsAcc=0; tsCnt=0; for(tsj=-tsR;tsj<=tsR;tsj++){ var tsny=tsy+tsj; if(tsny<0)tsny=0; else if(tsny>=H)tsny=H-1; tsAcc+=tsTmp[tsny*tsW4+tsCol+tsc]; tsCnt++; } tsBlur[tsBase+tsc]=tsAcc/tsCnt; } } } var tsLine=tsCenter*H; var tsDenom=0.05+(1-tsSoft)*0.5; if(tsDenom<0.0001)tsDenom=0.0001; for(tsy=0;tsy<H;tsy++){ var tsDist=Math.abs(tsy-tsLine)/H; var tsBw=tsDist/tsDenom; if(tsBw<0)tsBw=0; else if(tsBw>1)tsBw=1; var tsInv=1-tsBw; var tsRowI=tsy*tsW4; for(tsx=0;tsx<W;tsx++){ tsi=tsRowI+tsx*4; if(d[tsi+3]>0){ d[tsi]=tsSrc[tsi]*tsInv+tsBlur[tsi]*tsBw; d[tsi+1]=tsSrc[tsi+1]*tsInv+tsBlur[tsi+1]*tsBw; d[tsi+2]=tsSrc[tsi+2]*tsInv+tsBlur[tsi+2]*tsBw; } } } },
  };

  // Geometric warp: render the layer clean, then resample each destination pixel from a mapped source
  // coordinate. mapFn(x,y,W,H,cx,cy,maxR,params,t) → [srcX, srcY]. Nearest-neighbour sampling.
  let _wpA = null, _wpB = null;
  function drawWarpEffect(ctx, layer, t, scene, fx, mapFn) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const proj = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = proj.width, H = proj.height;
    if (!_wpA) _wpA = document.createElement('canvas');
    if (!_wpB) _wpB = document.createElement('canvas');
    _wpA.width = W; _wpA.height = H; _wpB.width = W; _wpB.height = H;
    const actx = _wpA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => e !== fx), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const src = actx.getImageData(0, 0, W, H).data;
    const bctx = _wpB.getContext('2d'), outImg = bctx.createImageData(W, H), o = outImg.data;
    const cx = W / 2, cy = H / 2, maxR = Math.hypot(cx, cy), pr = fx.params || {};
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const m = mapFn(x, y, W, H, cx, cy, maxR, pr, t);
        let sx = m[0] | 0, sy = m[1] | 0;
        if (sx < 0) sx = 0; else if (sx >= W) sx = W - 1;
        if (sy < 0) sy = 0; else if (sy >= H) sy = H - 1;
        const di = (y * W + x) * 4, si = (sy * W + sx) * 4;
        o[di] = src[si]; o[di + 1] = src[si + 1]; o[di + 2] = src[si + 2]; o[di + 3] = src[si + 3];
      }
    }
    bctx.putImageData(outImg, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_wpB, 0, 0);
    ctx.restore();
  }

  const WARP_FX = {
    wave: function (x, y, W, H, cx, cy, maxR, p, t) {
      const amp = FM.evalProp(p.amount, t) || 0;
      return [x + amp * Math.sin(y / 38), y + amp * 0.4 * Math.sin(x / 46)];
    },
    ripple: function (x, y, W, H, cx, cy, maxR, p, t) {
      const amp = FM.evalProp(p.amount, t) || 0, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) || 1e-6;
      const off = amp * Math.sin(r / 20);
      return [x + (dx / r) * off, y + (dy / r) * off];
    },
    twirl: function (x, y, W, H, cx, cy, maxR, p, t) {
      const ang = (FM.evalProp(p.amount, t) || 0) * Math.PI / 180, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      const f = Math.max(0, 1 - r / maxR), a = Math.atan2(dy, dx) + ang * f * f;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    },
    bulge: function (x, y, W, H, cx, cy, maxR, p, t) {
      const k = FM.evalProp(p.amount, t) || 0, nx = (x - cx) / maxR, ny = (y - cy) / maxR, r = Math.hypot(nx, ny);
      const scale = r < 1e-4 ? 1 : Math.pow(r, 1 + k) / r;   // k>0 pinch, k<0 bulge
      return [cx + nx * scale * maxR, cy + ny * scale * maxR];
    },
    fisheye: function (x, y, W, H, cx, cy, maxR, p, t) {
      const k = FM.evalProp(p.amount, t) || 0, dx = (x - cx) / maxR, dy = (y - cy) / maxR, r = Math.hypot(dx, dy);
      if (r >= 1 || r < 1e-5) return [x, y];
      const f = (r * (1 - k * (1 - r * r))) / r;   // barrel (k>0) / pincushion (k<0)
      return [cx + dx * f * maxR, cy + dy * f * maxR];
    },
    kaleidoscope: function (x, y, W, H, cx, cy, maxR, p, t) {
      const seg = Math.max(2, Math.round(FM.evalProp(p.segments, t) || 6)), dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      const slice = Math.PI * 2 / seg;
      let a = Math.atan2(dy, dx) % slice; if (a < 0) a += slice;
      a = Math.abs(a - slice / 2);   // fold within the wedge → mirrored kaleidoscope
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    },
    // ---- batch 7 (warp) ----
    polarcoords: function(x,y,W,H,cx,cy,maxR,p,t){ var plAmt=FM.evalProp(p.amount,t); if(plAmt==null)plAmt=1; if(plAmt<0)plAmt=0; if(plAmt>1)plAmt=1; var plAng=(x/W)*Math.PI*2, plRad=(y/H)*maxR; var plSx=cx+Math.cos(plAng)*plRad, plSy=cy+Math.sin(plAng)*plRad; return [x+(plSx-x)*plAmt, y+(plSy-y)*plAmt]; },
    bend: function(x,y,W,H,cx,cy,maxR,p,t){ var bdAmt=FM.evalProp(p.amount,t); if(bdAmt==null)bdAmt=0.5; if(bdAmt>1)bdAmt=1; if(bdAmt<-1)bdAmt=-1; var bdShift=bdAmt*cx*Math.sin((y/H)*Math.PI); return [x-bdShift,y]; },
    glass: function(x,y,W,H,cx,cy,maxR,p,t){ var gam=FM.evalProp(p.amount,t); if(gam==null)gam=12; gam=gam<0?0:(gam>40?40:gam); var ghh=(x*374761393 + y*668265263)|0; ghh=(ghh^(ghh>>13))*1274126177; ghh=ghh^(ghh>>16); var gdx=((ghh & 255)/255 - 0.5)*2*gam; var gdy=(((ghh>>8) & 255)/255 - 0.5)*2*gam; return [x+gdx, y+gdy]; },
    // ---- batch 9 (warp) ----
    curl: function(x,y,W,H,cx,cy,maxR,p,t){ var cuAmt=FM.evalProp(p.amount,t); if(cuAmt==null)cuAmt=0.5; if(cuAmt<-1)cuAmt=-1; if(cuAmt>1)cuAmt=1; var cuDx=x-cx, cuDy=y-cy, cuR=Math.hypot(cuDx,cuDy); var cuSw=cuAmt*0.6*Math.sin(cuR/40); var cuA=Math.atan2(cuDy,cuDx)+cuSw; return [cx+Math.cos(cuA)*cuR, cy+Math.sin(cuA)*cuR]; },
    // ---- batch 10 (warp) ----
    fractalwarp: function(x,y,W,H,cx,cy,maxR,p,t){ var fwAmt=FM.evalProp(p.amount,t); if(fwAmt==null)fwAmt=24; if(fwAmt<0)fwAmt=0; if(fwAmt>60)fwAmt=60; var fwNx=Math.sin(x/57+y/40)+Math.sin(x/29-y/53)*0.6+Math.sin(x/15+y/19)*0.35; var fwNy=Math.cos(x/47-y/61)+Math.sin(x/35+y/27)*0.6+Math.cos(x/13-y/21)*0.35; return [x+fwNx*fwAmt*0.4, y+fwNy*fwAmt*0.4]; },
  };

  // RGB split / chromatic aberration: render the layer clean to an offscreen, then rebuild it
  // sampling the RED channel shifted +d and the BLUE channel shifted -d → coloured edge fringes.
  let _rgbA = null, _rgbB = null;
  function drawRgbSplit(ctx, layer, t, scene, d, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height, dd = Math.round(Math.max(0, d));
    if (!_rgbA) _rgbA = document.createElement('canvas');
    if (!_rgbB) _rgbB = document.createElement('canvas');
    _rgbA.width = W; _rgbA.height = H; _rgbB.width = W; _rgbB.height = H;
    const actx = _rgbA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    // render the layer with the rgbsplit effect removed (full opacity, normal blend) — keeps other fx/mask/blur
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'rgbsplit'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    if (dd <= 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = opacity; ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over'; ctx.filter = 'none'; ctx.drawImage(_rgbA, 0, 0); ctx.restore(); return; }
    const src = actx.getImageData(0, 0, W, H).data;
    const bctx = _rgbB.getContext('2d'); const out = bctx.createImageData(W, H); const o = out.data;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const i = (row + x) * 4;
        const ri = (row + Math.min(W - 1, x + dd)) * 4;   // red sampled from the right
        const bi = (row + Math.max(0, x - dd)) * 4;        // blue sampled from the left
        o[i] = src[ri]; o[i + 1] = src[i + 1]; o[i + 2] = src[bi + 2];
        o[i + 3] = Math.max(src[i + 3], src[ri + 3], src[bi + 3]);
      }
    }
    bctx.putImageData(out, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_rgbB, 0, 0);
    ctx.restore();
  }

  // Posterize: quantize each colour channel to N levels (banded / poster look).
  let _psA = null, _psB = null;
  function drawPosterize(ctx, layer, t, scene, levels, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height, q = Math.max(2, Math.round(levels));
    if (!_psA) _psA = document.createElement('canvas');
    if (!_psB) _psB = document.createElement('canvas');
    _psA.width = W; _psA.height = H; _psB.width = W; _psB.height = H;
    const actx = _psA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'posterize'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const img = actx.getImageData(0, 0, W, H), d = img.data, step = 255 / (q - 1);
    for (let i = 0; i < d.length; i += 4) { d[i] = Math.round(Math.round(d[i] / step) * step); d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step); d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step); }
    _psB.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_psB, 0, 0);
    ctx.restore();
  }

  // Tint / colorize: map each pixel's luminance onto a colour (black→black, white→tint), blended
  // with the original by `amount` — a quick duotone/colour-wash look.
  let _tiA = null, _tiB = null;
  function drawTint(ctx, layer, t, scene, amount, colorHex, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height, am = clamp01(amount), C = hexToRGB(colorHex || '#ff3366');
    if (!_tiA) _tiA = document.createElement('canvas');
    if (!_tiB) _tiB = document.createElement('canvas');
    _tiA.width = W; _tiA.height = H; _tiB.width = W; _tiB.height = H;
    const actx = _tiA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'tint'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const img = actx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;   // luma 0..1
      d[i] = d[i] + (l * C[0] - d[i]) * am;
      d[i + 1] = d[i + 1] + (l * C[1] - d[i + 1]) * am;
      d[i + 2] = d[i + 2] + (l * C[2] - d[i + 2]) * am;
    }
    _tiB.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_tiB, 0, 0);
    ctx.restore();
  }

  // Threshold: hard 2-tone cut on luminance (black below the level, white above). Pair with Tint
  // for a duotone. Alpha is preserved so only the visible shape is split.
  let _thA = null, _thB = null;
  function drawThreshold(ctx, layer, t, scene, level, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height, cut = clamp01(level) * 255;
    if (!_thA) _thA = document.createElement('canvas');
    if (!_thB) _thB = document.createElement('canvas');
    _thA.width = W; _thA.height = H; _thB.width = W; _thB.height = H;
    const actx = _thA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'threshold'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const img = actx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) >= cut ? 255 : 0;
      d[i] = v; d[i + 1] = v; d[i + 2] = v;
    }
    _thB.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_thB, 0, 0);
    ctx.restore();
  }

  // Duotone: map luminance across two colours (shadows → highlights), blended by `amount`. The
  // classic print/Spotify look — distinct from Tint (which keeps the original toward one colour).
  let _duA = null, _duB = null;
  function drawDuotone(ctx, layer, t, scene, amount, shadowHex, hiHex, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height, am = clamp01(amount), A = hexToRGB(shadowHex || '#241a52'), B = hexToRGB(hiHex || '#ff9e5e');
    if (!_duA) _duA = document.createElement('canvas');
    if (!_duB) _duB = document.createElement('canvas');
    _duA.width = W; _duA.height = H; _duB.width = W; _duB.height = H;
    const actx = _duA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'duotone'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const img = actx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;   // luma 0..1
      d[i] = d[i] + ((A[0] + (B[0] - A[0]) * l) - d[i]) * am;
      d[i + 1] = d[i + 1] + ((A[1] + (B[1] - A[1]) * l) - d[i + 1]) * am;
      d[i + 2] = d[i + 2] + ((A[2] + (B[2] - A[2]) * l) - d[i + 2]) * am;
    }
    _duB.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_duB, 0, 0);
    ctx.restore();
  }

  // Mirror / kaleidoscope: render the layer clean, then reflect one half onto the other.
  let _miA = null;
  function drawMirror(ctx, layer, t, scene, mode, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height; mode = Math.round(mode) || 0;
    if (!_miA) _miA = document.createElement('canvas');
    _miA.width = W; _miA.height = H;
    const actx = _miA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'mirror'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    const hw = W / 2, hh = H / 2;
    if (mode === 0) {           // Left → Right
      ctx.drawImage(_miA, 0, 0, hw, H, 0, 0, hw, H);
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(_miA, 0, 0, hw, H, 0, 0, hw, H); ctx.restore();
    } else if (mode === 1) {    // Right → Left
      ctx.drawImage(_miA, hw, 0, hw, H, hw, 0, hw, H);
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(_miA, hw, 0, hw, H, hw, 0, hw, H); ctx.restore();
    } else if (mode === 2) {    // Top → Bottom
      ctx.drawImage(_miA, 0, 0, W, hh, 0, 0, W, hh);
      ctx.save(); ctx.translate(0, H); ctx.scale(1, -1); ctx.drawImage(_miA, 0, 0, W, hh, 0, 0, W, hh); ctx.restore();
    } else {                    // Bottom → Top
      ctx.drawImage(_miA, 0, hh, W, hh, 0, hh, W, hh);
      ctx.save(); ctx.translate(0, H); ctx.scale(1, -1); ctx.drawImage(_miA, 0, hh, W, hh, 0, hh, W, hh); ctx.restore();
    }
    ctx.restore();
  }

  // Pixelate / mosaic: render the layer clean, downscale (averaging) then upscale with smoothing off.
  let _pxA = null, _pxS = null;
  function drawPixelate(ctx, layer, t, scene, size, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height;
    size = Math.max(1, Math.round(size));
    if (!_pxA) _pxA = document.createElement('canvas');
    if (!_pxS) _pxS = document.createElement('canvas');
    _pxA.width = W; _pxA.height = H;
    const actx = _pxA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'pixelate'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    if (size <= 1) { ctx.drawImage(_pxA, 0, 0); ctx.restore(); return; }
    const sw = Math.max(1, Math.round(W / size)), sh = Math.max(1, Math.round(H / size));
    _pxS.width = sw; _pxS.height = sh;
    const sctx = _pxS.getContext('2d');
    sctx.clearRect(0, 0, sw, sh); sctx.imageSmoothingEnabled = true;
    sctx.drawImage(_pxA, 0, 0, sw, sh);                 // downscale (block-average)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_pxS, 0, 0, sw, sh, 0, 0, W, H);      // upscale → blocky
    ctx.imageSmoothingEnabled = true;
    ctx.restore();
  }

  // Two-stop gradient (linear/radial) spanning a box {x,y,w,h} in the current transform space.
  function buildGradient(ctx, grad, box) {
    const c0 = grad.c0 || '#ffffff', c1 = grad.c1 || '#000000';
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    let g;
    if (grad.type === 'radial') {
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, Math.hypot(box.w, box.h) / 2));
    } else {
      const ang = (grad.angle || 0) * Math.PI / 180, dx = Math.cos(ang), dy = Math.sin(ang);
      const half = (Math.abs(dx) * box.w + Math.abs(dy) * box.h) / 2 || 1;
      g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    }
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    return g;
  }
  FM.layerHasGradient = function (layer) { return layer.fillGradient && layer.fillGradient.enabled; };

  function drawLayer(ctx, layer, t, scene) {
    // Null objects are invisible transform controllers — never rasterized. They still drive
    // parented children at any time because applyParentChain reads a parent's transform directly.
    if (layer.type === 'null') return;
    if (layer.type === 'adjustment') return;   // handled by renderScene (grades layers below)
    if (layer.type === 'camera') return;       // handled by renderScene (drives the composite)
    if (!FM.isLayerVisibleAt(layer, t)) return;
    // Per-pixel post-process effects compose in ARRAY ORDER: the last one in the stack is the
    // outermost pass, rendered over a clean copy of the layer with that effect removed (recursing
    // inward through the rest). So effect[0] is applied first (innermost), effect[n] last (outermost).
    if (scene && layer.effects) {
      const pp = layer.effects.filter(e => POSTFX[e.type] && e.enabled !== false);
      if (pp.length) { applyPostFx(ctx, layer, t, scene, pp[pp.length - 1]); return; }
    }
    // Motion blur wraps the whole layer (averaged sub-frames).
    if (scene && layer.motionBlur && layer.motionBlur.enabled) { drawMotionBlur(ctx, layer, t, scene); return; }
    // A feathered mask needs an offscreen pass (clip() is hard-edged only).
    if (scene && layer.mask && layer.mask.enabled && (layer.mask.feather || 0) > 0) { drawFeatheredMaskLayer(ctx, layer, t, scene); return; }

    const tr = layer.transform;
    const x = FM.evalProp(tr.x, t);
    const y = FM.evalProp(tr.y, t);
    const scale = FM.evalProp(tr.scale, t);
    const rot = FM.evalProp(tr.rotation, t) * Math.PI / 180;
    const opacity = clamp01(FM.evalProp(tr.opacity, t));
    if (opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = effectFilter(layer, t);   // reset automatically by ctx.restore()
    if (layer.shadow && layer.shadow.enabled) {
      const sh = layer.shadow;
      ctx.shadowColor = sh.color || '#000';
      ctx.shadowBlur = sh.blur || 0;
      ctx.shadowOffsetX = sh.dx || 0;
      ctx.shadowOffsetY = sh.dy || 0;
    }
    const accumRot = applyParentChain(ctx, layer, t, scene);   // inherit parent motion before the layer's own transform
    const wig = FM.wiggleOffset(layer, t);                      // procedural jitter (motion-blur path averages it per sub-frame)
    ctx.translate(x + (wig ? wig.x : 0), y + (wig ? wig.y : 0));
    applyParentRotMode(ctx, layer, accumRot);   // 'locked'/'weighted' cancel some inherited rotation
    if (rot) ctx.rotate(rot);
    if (scale !== 1) ctx.scale(scale, scale);
    applyMaskClip(ctx, layer);   // clip to the layer's vector mask (in this local, transformed space)

    if (layer.type === 'text') {
      ctx.fillStyle = layer.color || '#fff';
      ctx.textAlign = layer.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = (layer.italic ? 'italic ' : '') + (layer.bold ? '700 ' : '') + (layer.fontSize || 96) + 'px ' + (layer.fontFamily || 'sans-serif');
      if ('letterSpacing' in ctx) ctx.letterSpacing = (layer.letterSpacing || 0) + 'px';
      // Caption tracks render the segment active at time t; plain text renders layer.text.
      const textSrc = (layer.captions && layer.captions.length) ? (FM.activeCaption(layer, t) || '') : (layer.text || '');
      const lines = String(textSrc).split('\n');
      const lh = (layer.fontSize || 96) * (layer.lineHeight || 1.15);
      const total = (lines.length - 1) * lh;
      // Caption background pill: readable semi-transparent box behind the text (CapCut/AM style).
      if (layer.captionBg && String(textSrc).trim()) {
        const fs = layer.fontSize || 96;
        let maxW = 0;
        for (const ln of lines) { const w2 = ctx.measureText(ln).width; if (w2 > maxW) maxW = w2; }
        const padX = fs * 0.4, padY = fs * 0.24, align = layer.align || 'center';
        const bx0 = align === 'center' ? -maxW / 2 - padX : align === 'right' ? -maxW - padX : -padX;
        const bw = maxW + 2 * padX, bh = total + fs + 2 * padY, by0 = -bh / 2;
        // Render the pill FLAT — strip any inherited glow filter / drop-shadow so the box
        // itself doesn't get a halo (the text below keeps its effects).
        const prevFill = ctx.fillStyle, prevFilter = ctx.filter, prevShadow = ctx.shadowColor, prevBlur = ctx.shadowBlur;
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.filter = 'none'; ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
        ctx.beginPath();
        const r = Math.min(fs * 0.25, bh / 2, bw / 2);
        if (ctx.roundRect) ctx.roundRect(bx0, by0, bw, bh, r); else ctx.rect(bx0, by0, bw, bh);
        ctx.fill();
        ctx.fillStyle = prevFill; ctx.filter = prevFilter; ctx.shadowColor = prevShadow; ctx.shadowBlur = prevBlur;
      }
      if (FM.textHasAnim(layer)) {
        drawAnimatedText(ctx, layer, t, lines, lh, total);
      } else {
        const stk = layer.stroke;
        const drawStroke = stk && stk.enabled && stk.width > 0;
        if (FM.layerHasGradient(layer)) {
          const fs = layer.fontSize || 96, align = layer.align || 'center';
          let maxW = 1; lines.forEach(l => { maxW = Math.max(maxW, ctx.measureText(l).width); });
          const bx = align === 'center' ? -maxW / 2 : align === 'right' ? -maxW : 0;
          ctx.fillStyle = buildGradient(ctx, layer.fillGradient, { x: bx, y: -(total + fs) / 2, w: maxW, h: total + fs });
        }
        const curve = layer.textCurve || 0;
        if (Math.abs(curve) > 0.5) drawArcLine(ctx, lines.join(' '), layer, curve, drawStroke);   // text on a curve
        else lines.forEach((line, i) => {
          const yy = i * lh - total / 2;
          if (drawStroke) {
            // strokeText centres the line on the glyph edge (half is hidden by the fill drawn on
            // top), so double the width → the visible OUTSIDE outline ≈ stk.width, matching AM.
            ctx.save();
            ctx.lineJoin = 'round'; ctx.miterLimit = 2;
            ctx.lineWidth = stk.width * 2; ctx.strokeStyle = stk.color || '#000';
            ctx.strokeText(line, 0, yy);
            ctx.restore();
          }
          ctx.fillText(line, 0, yy);
        });
      }
    } else if (layer.type === 'shape') {
      const sw = layer.shapeW || 400, sh = layer.shapeH || 300;
      const ox = -sw * tr.anchorX, oy = -sh * tr.anchorY;   // top-left of the shape box (anchor-relative)
      const kind = layer.shape || 'rect';
      const stk = layer.stroke;
      ctx.beginPath();
      if (kind === 'ellipse') {
        ctx.ellipse(ox + sw / 2, oy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
      } else if (kind === 'line') {
        ctx.moveTo(ox, oy + sh / 2); ctx.lineTo(ox + sw, oy + sh / 2);
      } else if (kind === 'polygon') {
        const n = Math.max(3, layer.sides || 5), cx = ox + sw / 2, cy = oy + sh / 2;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + i * 2 * Math.PI / n;
          const px = cx + (sw / 2) * Math.cos(a), py = cy + (sh / 2) * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (kind === 'triangle') {
        ctx.moveTo(ox + sw / 2, oy); ctx.lineTo(ox + sw, oy + sh); ctx.lineTo(ox, oy + sh); ctx.closePath();
      } else if (kind === 'star') {
        const n = Math.max(3, layer.sides || 5), cx = ox + sw / 2, cy = oy + sh / 2, inr = 0.45;
        for (let i = 0; i < n * 2; i++) {
          const a = -Math.PI / 2 + i * Math.PI / n, rr = (i % 2 === 0) ? 1 : inr;
          const px = cx + (sw / 2) * rr * Math.cos(a), py = cy + (sh / 2) * rr * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (kind === 'heart') {
        const cx = ox + sw / 2;
        ctx.moveTo(cx, oy + sh * 0.95);
        ctx.bezierCurveTo(ox - sw * 0.02, oy + sh * 0.55, ox + sw * 0.12, oy + sh * 0.02, cx, oy + sh * 0.30);
        ctx.bezierCurveTo(ox + sw * 0.88, oy + sh * 0.02, ox + sw * 1.02, oy + sh * 0.55, cx, oy + sh * 0.95);
        ctx.closePath();
      } else {   // rect
        const r = Math.min(layer.cornerRadius || 0, sw / 2, sh / 2);
        if (r > 0 && ctx.roundRect) ctx.roundRect(ox, oy, sw, sh, r); else ctx.rect(ox, oy, sw, sh);
      }
      if (kind === 'line') {
        ctx.lineWidth = (stk && stk.width) ? stk.width : 8;
        ctx.strokeStyle = (stk && stk.enabled && stk.color) ? stk.color : (layer.fill || '#ffffff');
        ctx.lineCap = 'round'; ctx.stroke();
      } else {
        ctx.fillStyle = FM.layerHasGradient(layer) ? buildGradient(ctx, layer.fillGradient, { x: ox, y: oy, w: sw, h: sh }) : (layer.fill || '#3a7bd5');
        ctx.fill();
        if (stk && stk.enabled && stk.width > 0) { ctx.lineWidth = stk.width; ctx.strokeStyle = stk.color || '#fff'; ctx.lineJoin = 'round'; ctx.stroke(); }
      }
    } else {
      const m = FM.media.get(layer.id);
      if (m && m.el) {
        const w = m.width, h = m.height;
        let src = null;
        // Render from the pre-decoded frame cache: reversed clips always; forward clips when
        // frame-blend slow-mo is on. With frame-blend + speed<1 we cross-dissolve the two
        // nearest source frames so slow motion looks smooth instead of stuttering on dupes.
        const slow = (layer.speed || 1) < 1;
        if (m.frameCache && m.frameCache.count && (layer.reversed || (layer.frameBlend && slow))) {
          const local = FM.layerLocalTime(layer, t);
          if (local != null) {
            const fc = m.frameCache, fpos = local * (fc.effFps || fc.fps);   // effFps spans the whole clip even past the 900-frame cap
            if (layer.frameBlend && slow && fc.count > 1) {
              let i0 = Math.floor(fpos); i0 = i0 < 0 ? 0 : i0 >= fc.count ? fc.count - 1 : i0;
              const i1 = Math.min(i0 + 1, fc.count - 1);
              const frac = Math.max(0, Math.min(1, fpos - Math.floor(fpos)));
              const a = fc.frames[i0], b = fc.frames[i1];
              src = (a && b && i1 !== i0 && frac > 0.001) ? blendFrames(a, b, frac, w, h) : (a || b || null);
            } else {
              let idx = Math.round(fpos);
              idx = idx < 0 ? 0 : idx >= fc.count ? fc.count - 1 : idx;
              src = fc.frames[idx] || null;
            }
          }
        }
        if (!src) {
          // Skip a video that hasn't produced a frame yet to avoid drawing garbage.
          if (m.kind === 'video' && m.el.readyState < 2) { ctx.restore(); return; }
          src = m.el;
        }
        // Lift/Gamma/Gain grade is a per-pixel color op → apply to the source first.
        const cg = layer.colorGrade;
        if (cg && src && ((cg.lift || 0) !== 0 || (cg.gamma || 1) !== 1 || (cg.gain != null ? cg.gain : 1) !== 1)) {
          src = gradeCanvas(src, w, h, cg.lift || 0, cg.gamma || 1, cg.gain != null ? cg.gain : 1);
        }
        // Color FX (ctx.filter) must run on the SOURCE before keying, else a blur halos the
        // keyed alpha edges. So when a key is present, bake the filter into the key offscreen
        // and clear ctx.filter for the final composite.
        const ck = layer.effects && layer.effects.find(e => e.type === 'chromakey' && e.enabled !== false);
        const lk = layer.effects && layer.effects.find(e => e.type === 'lumakey' && e.enabled !== false);
        let keyed = false;
        if (ck && src) {
          const p = ck.params || {};
          src = chromaKey(src, w, h, p.color || '#00ff00', p.tolerance != null ? p.tolerance : 0.3, ctx.filter); keyed = true;
        }
        if (lk && src) {
          const p = lk.params || {};
          src = lumaKey(src, w, h, p.threshold != null ? p.threshold : 0.25, keyed ? 'none' : ctx.filter); keyed = true;
        }
        if (keyed) ctx.filter = 'none';                   // filter already applied to the keyed source
        try {
          ctx.drawImage(src, -w * tr.anchorX, -h * tr.anchorY, w, h);
        } catch (e) { /* frame not ready */ }
        // vignette: radial darkening over the clip's bounds (not a CSS filter)
        const vig = layer.effects && layer.effects.find(e => e.type === 'vignette' && e.enabled !== false);
        if (vig) {
          const amt = clamp01(vig.params && vig.params.amount != null ? FM.evalProp(vig.params.amount, t) : 0.6);
          // Darken as a flat source-over overlay regardless of the layer's blend mode/opacity.
          ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
          const gx = -w * tr.anchorX + w / 2, gy = -h * tr.anchorY + h / 2, rad = Math.hypot(w, h) / 2;
          const grad = ctx.createRadialGradient(gx, gy, rad * 0.45, gx, gy, rad);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,' + amt + ')');
          ctx.fillStyle = grad;
          ctx.fillRect(-w * tr.anchorX, -h * tr.anchorY, w, h);
        }
      }
    }
    ctx.restore();
  }

  /* Render the whole scene at time t. Layers[0] is the TOP layer (drawn last). */
  // Adjustment layer: grade/filter everything already drawn beneath it (CSS-filter effects).
  let _adjCv = null, _adjTmp = null;
  // Per-pixel post-fx that an adjustment layer can also apply to everything beneath it (matching
  // the layer-level draw* math exactly). Geometric post-fx (pixelate/mirror/rgbsplit) aren't done
  // here — they need a geometry pass, so they only apply per-layer for now.
  const PIXEL_ADJ = { posterize: 1, tint: 1, threshold: 1, duotone: 1, rgbsplit: 1 };
  function applyPixelFx(d, fx, t, W, H) {
    const p = fx.params || {};
    if (fx.type === 'rgbsplit') {
      const dd = Math.round(FM.evalProp(p.amount, t) || 0);
      if (dd > 0 && W && H) {
        const src = d.slice();   // shift the RED channel +dd and BLUE −dd, sampling the original
        for (let y = 0; y < H; y++) {
          const row = y * W;
          for (let x = 0; x < W; x++) {
            const i = (row + x) * 4;
            d[i] = src[(row + Math.min(W - 1, x + dd)) * 4];
            d[i + 2] = src[(row + Math.max(0, x - dd)) * 4 + 2];
          }
        }
      }
      return;
    }
    if (fx.type === 'posterize') {
      const q = Math.max(2, Math.round(FM.evalProp(p.levels, t) || 5)), step = 255 / (q - 1);
      for (let i = 0; i < d.length; i += 4) { d[i] = Math.round(Math.round(d[i] / step) * step); d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step); d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step); }
    } else if (fx.type === 'threshold') {
      const cut = clamp01(FM.evalProp(p.level, t)) * 255;
      for (let i = 0; i < d.length; i += 4) { const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) >= cut ? 255 : 0; d[i] = v; d[i + 1] = v; d[i + 2] = v; }
    } else if (fx.type === 'tint') {
      const am = clamp01(FM.evalProp(p.amount, t)), C = hexToRGB(p.color || '#ff3366');
      for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255; d[i] += (l * C[0] - d[i]) * am; d[i + 1] += (l * C[1] - d[i + 1]) * am; d[i + 2] += (l * C[2] - d[i + 2]) * am; }
    } else if (fx.type === 'duotone') {
      const am = clamp01(FM.evalProp(p.amount, t)), A = hexToRGB(p.color || '#241a52'), B = hexToRGB(p.color2 || '#ff9e5e');
      for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255; d[i] += ((A[0] + (B[0] - A[0]) * l) - d[i]) * am; d[i + 1] += ((A[1] + (B[1] - A[1]) * l) - d[i + 1]) * am; d[i + 2] += ((A[2] + (B[2] - A[2]) * l) - d[i + 2]) * am; }
    }
  }
  function applyAdjustment(ctx, layer, t, scene) {
    const filter = effectFilter(layer, t), hasCss = filter && filter !== 'none';
    const ppfx = (layer.effects || []).filter(e => PIXEL_ADJ[e.type] && e.enabled !== false);
    const pixFx = (layer.effects || []).find(e => e.type === 'pixelate' && e.enabled !== false);
    if (!hasCss && !ppfx.length && !pixFx) return;
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = scene.project, W = P.width, H = P.height;
    if (!_adjCv) _adjCv = document.createElement('canvas');
    _adjCv.width = W; _adjCv.height = H;
    const a = _adjCv.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W, H); a.globalAlpha = 1; a.filter = 'none';
    a.drawImage(ctx.canvas, 0, 0);                 // snapshot current frame (background + layers below)
    if (ppfx.length) {                             // per-pixel post-fx grade the whole snapshot, in stack order
      const img = a.getImageData(0, 0, W, H), d = img.data;
      ppfx.forEach(fx => applyPixelFx(d, fx, t, W, H));
      a.putImageData(img, 0, 0);
    }
    if (pixFx) {                                   // pixelate the whole scene below (down- then up-scale the snapshot)
      const size = Math.max(1, Math.round(FM.evalProp((pixFx.params || {}).size, t) || 1));
      if (size > 1) {
        const sw = Math.max(1, Math.round(W / size)), sh = Math.max(1, Math.round(H / size));
        if (!_adjTmp) _adjTmp = document.createElement('canvas');
        _adjTmp.width = sw; _adjTmp.height = sh;
        const tctx = _adjTmp.getContext('2d');
        tctx.clearRect(0, 0, sw, sh); tctx.imageSmoothingEnabled = true;
        tctx.drawImage(_adjCv, 0, 0, sw, sh);              // downscale (block-average)
        a.imageSmoothingEnabled = false; a.clearRect(0, 0, W, H);
        a.drawImage(_adjTmp, 0, 0, sw, sh, 0, 0, W, H);    // upscale → blocky
        a.imageSmoothingEnabled = true;
      }
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = hasCss ? filter : 'none';
    ctx.drawImage(_adjCv, 0, 0);                    // (optionally CSS-filtered) graded snapshot, blended by opacity
    ctx.restore();
  }
  // When a camera layer is active, the whole scene is drawn to this offscreen first, then composited
  // onto the real canvas through the camera's (inverse) transform — so EVERY layer, including
  // post-fx / motion-blur / masked ones, is panned & zoomed uniformly.
  let _camCv = null;
  FM.renderScene = function (ctx, scene, t) {
    const P = scene.project;
    const cam = scene.layers.find(l => l.type === 'camera' && l.visible !== false && FM.isLayerVisibleAt(l, t));
    let target = ctx;
    if (cam) {
      if (!_camCv) _camCv = document.createElement('canvas');
      _camCv.width = P.width; _camCv.height = P.height;
      target = _camCv.getContext('2d');
    }
    target.save();
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.clearRect(0, 0, P.width, P.height);
    if (!cam && P.background) {   // with a camera, the bg is painted on the real canvas so it stays fixed
      target.fillStyle = P.background;
      target.fillRect(0, 0, P.width, P.height);
    }
    const soloActive = scene.layers.some(l => l.solo);   // if any layer is soloed, only draw soloed ones
    for (let i = scene.layers.length - 1; i >= 0; i--) {
      const L = scene.layers[i];
      if (soloActive && !L.solo) continue;
      if (L.type === 'camera') continue;   // the camera drives the composite; it is never rasterized
      if (L.type === 'adjustment') { if (FM.isLayerVisibleAt(L, t)) applyAdjustment(target, L, t, scene); }
      else drawLayer(target, L, t, scene);
    }
    target.restore();
    if (cam) {
      const cx = P.width / 2, cy = P.height / 2, tr = cam.transform;
      const zoom = FM.evalProp(tr.scale, t) || 1;
      const camX = FM.evalProp(tr.x, t), camY = FM.evalProp(tr.y, t);
      const rot = (FM.evalProp(tr.rotation, t) || 0) * Math.PI / 180;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, P.width, P.height);
      if (P.background) { ctx.fillStyle = P.background; ctx.fillRect(0, 0, P.width, P.height); }
      ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.rotate(rot); ctx.translate(-camX, -camY);
      ctx.drawImage(_camCv, 0, 0);   // camX,camY (scene point) lands at screen centre, scaled by zoom
      ctx.restore();
    }
  };

  /* Draw a small fitted thumbnail of one layer's content into a canvas (layer list + timeline). */
  // Unscaled intrinsic size of a layer's content (text measured, media natural, null/fallback 100).
  FM.layerSize = function (layer) {
    if (layer.type === 'text') {
      const c = document.createElement('canvas').getContext('2d');
      c.font = (layer.italic ? 'italic ' : '') + (layer.bold ? '700 ' : '') + (layer.fontSize || 96) + 'px ' + (layer.fontFamily || 'sans-serif');
      const lines = String(layer.text || '').split('\n');
      let w = 10; lines.forEach(l => { w = Math.max(w, c.measureText(l).width); });
      return { w: w, h: Math.max(10, lines.length * (layer.fontSize || 96) * (layer.lineHeight || 1.15)) };
    }
    if (layer.type === 'null') return { w: 100, h: 100 };
    if (layer.type === 'shape') return { w: layer.shapeW || 400, h: layer.shapeH || 300 };
    const m = FM.media.get(layer.id);
    return { w: m ? m.width : 100, h: m ? m.height : 100 };
  };

  FM.renderThumb = function (layer, canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, W, H);
    if (layer.type === 'text') {
      ctx.fillStyle = layer.color || '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(H * 0.56) + 'px sans-serif';
      ctx.fillText('T', W / 2, H / 2 + 1);
      return;
    }
    if (layer.type === 'null') {
      ctx.strokeStyle = '#8b9bb4'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W / 2, 3); ctx.lineTo(W / 2, H - 3);
      ctx.moveTo(5, H / 2); ctx.lineTo(W - 5, H / 2);
      ctx.stroke();
      ctx.strokeRect(W / 2 - 5, H / 2 - 5, 10, 10);
      return;
    }
    if (layer.type === 'adjustment') {
      ctx.fillStyle = '#9aa7bd'; ctx.strokeStyle = '#9aa7bd'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - 4, -Math.PI / 2, Math.PI / 2); ctx.fill();   // half-filled circle
      ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - 4, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    if (layer.type === 'camera') {
      ctx.strokeStyle = '#9aa7bd'; ctx.fillStyle = '#9aa7bd'; ctx.lineWidth = 1.5;
      const bw = W * 0.42, bh = H * 0.34, bx = W / 2 - bw / 2, by = H / 2 - bh / 2;
      ctx.strokeRect(bx, by, bw, bh);                                   // camera body
      ctx.beginPath(); ctx.moveTo(bx + bw, H / 2 - bh * 0.28); ctx.lineTo(bx + bw + bw * 0.4, H / 2 - bh * 0.5); ctx.lineTo(bx + bw + bw * 0.4, H / 2 + bh * 0.5); ctx.lineTo(bx + bw, H / 2 + bh * 0.28); ctx.closePath(); ctx.fill();   // lens horn
      return;
    }
    if (layer.type === 'shape') {
      ctx.fillStyle = layer.fill || '#3a7bd5';
      const k = layer.shape || 'rect', pad = 6;
      ctx.beginPath();
      if (k === 'ellipse') ctx.ellipse(W / 2, H / 2, W / 2 - pad, H / 2 - pad, 0, 0, Math.PI * 2);
      else if (k === 'line') { ctx.strokeStyle = layer.fill || '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.moveTo(pad, H / 2); ctx.lineTo(W - pad, H / 2); ctx.stroke(); return; }
      else if (k === 'polygon') { const n = Math.max(3, layer.sides || 5); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; const px = W / 2 + (W / 2 - pad) * Math.cos(a), py = H / 2 + (H / 2 - pad) * Math.sin(a); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); }
      else ctx.rect(pad, pad, W - 2 * pad, H - 2 * pad);
      ctx.fill();
      return;
    }
    const m = FM.media.get(layer.id);
    if (m && m.el) {
      if (m.kind === 'video' && m.el.readyState < 2) return;
      const mw = m.width || 1, mh = m.height || 1;
      const fit = Math.min(W / mw, H / mh);
      const dw = mw * fit, dh = mh * fit;
      try { ctx.drawImage(m.el, (W - dw) / 2, (H - dh) / 2, dw, dh); } catch (e) {}
    }
  };
})(window.FM);
