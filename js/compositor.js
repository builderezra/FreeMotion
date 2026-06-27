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
    { type: 'blur', label: 'Blur', param: 'radius', min: 0, max: 50, step: 0.5, def: 6, unit: 'px' },
    { type: 'brightness', label: 'Brightness', param: 'amount', min: 0, max: 3, step: 0.02, def: 1.3 },
    { type: 'contrast', label: 'Contrast', param: 'amount', min: 0, max: 3, step: 0.02, def: 1.3 },
    { type: 'saturate', label: 'Saturation', param: 'amount', min: 0, max: 3, step: 0.02, def: 1.6 },
    { type: 'hue', label: 'Hue shift', param: 'deg', min: 0, max: 360, step: 1, def: 90, unit: '°' },
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
  ];

  // getImageData + per-pixel keying is the heaviest path, so memoize the result and skip
  // recompute when the source frame and params are unchanged (static images, paused/scrub
  // redraws, repeated renders of one frame). Stats exposed for verification.
  FM._fxStats = { ckCompute: 0, lkCompute: 0 };
  // Bumped whenever a reused offscreen canvas (grade/key/blend) is (re)computed, so srcToken varies for
  // it. Without this, a canvas's object identity is constant while its pixels change every frame, and any
  // memo downstream (e.g. key over a graded video, or grade over a frame-blend) would freeze on frame 1.
  let _gen = 0;
  function srcToken(src) {
    if (src && src.tagName === 'VIDEO') return 'v:' + Math.round((src.currentTime || 0) * 1000);
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
  const POSTFX = { rgbsplit: 1, pixelate: 1, posterize: 1, mirror: 1, tint: 1, threshold: 1, duotone: 1 };
  function applyPostFx(ctx, layer, t, scene, fx) {
    const p = fx.params || {};
    if (fx.type === 'rgbsplit') return drawRgbSplit(ctx, layer, t, scene, FM.evalProp(p.amount, t) || 0, fx);
    if (fx.type === 'pixelate') return drawPixelate(ctx, layer, t, scene, FM.evalProp(p.size, t) || 1, fx);
    if (fx.type === 'posterize') return drawPosterize(ctx, layer, t, scene, FM.evalProp(p.levels, t) || 5, fx);
    if (fx.type === 'mirror') return drawMirror(ctx, layer, t, scene, p.mode || 0, fx);
    if (fx.type === 'tint') return drawTint(ctx, layer, t, scene, FM.evalProp(p.amount, t), p.color || '#ff3366', fx);
    if (fx.type === 'threshold') return drawThreshold(ctx, layer, t, scene, FM.evalProp(p.level, t), fx);
    if (fx.type === 'duotone') return drawDuotone(ctx, layer, t, scene, FM.evalProp(p.amount, t), p.color || '#241a52', p.color2 || '#ff9e5e', fx);
  }

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
          const amt = (vig.params && vig.params.amount != null) ? vig.params.amount : 0.6;
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
