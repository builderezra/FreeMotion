/* FreeMotion — Pen masks (model + compositing + path interpolation).
 * A NEW, SEPARATE system from the legacy single layer.mask: layer.masks is an OPTIONAL array of vector
 * reveal regions applied to a layer's RASTERIZED plate in FRAME space. Absent/empty => the render is
 * byte-for-byte the old one (buildMaskAlpha returns null, so the compositor skips the whole branch).
 *
 * COORDINATE SPACE (v1, deliberate): mask points live in PROJECT/CANVAS pixel space (0..W, 0..H) — the
 * pen draws where you see, NOT in the layer's local transform space, so the coordinate math stays trivial.
 * A mask.path is EITHER a static pts array ([[x,y] | [x,y,1(smooth)], ...]) OR an animated prop
 * ({ kf:[{ t, v:ptsArray, e }] }) so the WHOLE path can be keyframed (a moving reveal / roto). */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // Own-property lookups ONLY (a bare TABLE[userStr] walks the prototype chain, so a hostile mode of
  // 'constructor' could resolve to a function — a real, recurring class of bug in this codebase).
  const hasOwn = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  const num = function (v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; };
  const clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  function isAnimated(p) { return p && typeof p === 'object' && Array.isArray(p.kf); }   // byte-identical to scene.js

  // Mask mode -> canvas composite op used when STAMPING a mask onto the alpha buffer: add UNIONS,
  // subtract PUNCHES OUT, intersect KEEPS-ONLY-OVERLAP. Whitelisted by own-property everywhere it is read.
  const COMPOP = { add: 'source-over', subtract: 'destination-out', intersect: 'destination-in' };
  function maskMode(m) { const md = m && m.mode; return hasOwn(COMPOP, md) ? md : 'add'; }

  // Random suffix (like scene.js uid): counter + performance.now() alone can collide across reloads.
  let _idc = 1;
  function maskId() {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return 'mask_' + (_idc++).toString(36) + Math.floor(now).toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  const masks = {};
  // A new mask: defaults + a fresh id + an EMPTY, closed path (the pen tool fills it in canvas space).
  masks.make = function (mode) {
    return {
      id: maskId(),
      enabled: true,
      mode: hasOwn(COMPOP, mode) ? mode : 'add',
      feather: 0,
      opacity: 1,
      invert: false,
      closed: true,
      path: []
    };
  };
  FM.masks = masks;

  // Resolve a keyframe's easing to an eased progress f — mirrors scene.js evalProp (custom bez, then a
  // named EASES fn, then a named EASE_PRESETS bezier) so a keyframed PATH eases like every other prop.
  function easeF(kf, f) {
    if (kf.bez && FM.bezierAt) return FM.bezierAt(kf.bez[0], kf.bez[1], kf.bez[2], kf.bez[3], f);
    if (FM.EASES && hasOwn(FM.EASES, kf.e)) return FM.EASES[kf.e](f);
    if (FM.EASE_PRESETS && hasOwn(FM.EASE_PRESETS, kf.e) && FM.bezierAt) { const z = FM.EASE_PRESETS[kf.e]; return FM.bezierAt(z[0], z[1], z[2], z[3], f); }
    return f;
  }
  function kfPts(kf) { return (kf && Array.isArray(kf.v)) ? kf.v : []; }   // a kf.v could be absent/non-array

  /* evalMaskPath(mask, t) -> pts array in canvas space.
   * Static path (plain array): returned as-is (live reference — the editor writes back into it). Animated
   * path: AE-style SAME-VERTEX-COUNT rule — interpolate vertex-by-vertex ONLY when the two surrounding
   * keyframes have matching vertex counts (lerp each [x,y], carry the smooth flag from the EARLIER kf); if
   * the counts differ, SNAP to the keyframe at/just-before t (no morph across a topology change). Empty/
   * 1-point paths are returned verbatim. */
  FM.evalMaskPath = function (mask, t) {
    const path = mask && mask.path;
    if (!path) return [];
    if (Array.isArray(path)) return path;            // static
    if (!isAnimated(path)) return [];
    const kf = path.kf;
    if (!kf.length) return [];
    if (t <= kf[0].t) return kfPts(kf[0]);
    const last = kf[kf.length - 1];
    if (t >= last.t) return kfPts(last);
    for (let i = 0; i < kf.length - 1; i++) {
      const a = kf[i], b = kf[i + 1];
      if (t >= a.t && t <= b.t) {
        const av = kfPts(a), bv = kfPts(b);
        if (b.e === 'hold') return av;                          // step: hold the earlier verts until b
        if (!av.length || av.length !== bv.length) return av;   // topology change (or empty) -> SNAP, no interp
        const span = b.t - a.t;
        let f = span <= 0 ? 1 : (t - a.t) / span;
        f = easeF(b, f);
        const out = new Array(av.length);
        for (let k = 0; k < av.length; k++) {
          const pa = av[k], pb = bv[k];
          const x = pa[0] + (pb[0] - pa[0]) * f;
          const y = pa[1] + (pb[1] - pa[1]) * f;
          out[k] = (pa[2] === 1) ? [x, y, 1] : [x, y];          // smooth flag carried from the earlier kf
        }
        return out;
      }
    }
    return kfPts(last);
  };

  // Scratch canvases, reused across frames AND across layers — JS is single-threaded, so one layer's alpha
  // is fully built and consumed by the compositor before the next layer's. Never a new W×H per mask/frame.
  let _bufCv = null, _tmpCv = null;
  function sized(cv, W, H) { if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } return cv; }

  /* buildMaskAlpha(layer, t, W, H) -> a W×H mask <canvas>: WHITE (opaque) where the layer should show,
   * transparent where hidden — the compositor uses it as a destination-in stencil on the layer's plate.
   * Returns null when there is no enabled mask, OR when no enabled mask contributes any fillable geometry
   * (both mean "render the layer normally"), so an enabled-but-still-empty mask never blanks the layer.
   *
   * Ordered compositing: SEED the buffer FULL WHITE iff the first enabled mask is subtract/intersect (so a
   * lone subtract/intersect still reveals something — AE-practical), else EMPTY. Then STAMP each enabled
   * mask's filled path (blurred by feather; inverted within-frame if set; at its opacity) onto the buffer
   * by its mode (add=source-over, subtract=destination-out, intersect=destination-in). */
  FM.buildMaskAlpha = function (layer, t, W, H) {
    if (!(W > 0) || !(H > 0)) return null;
    const list = layer && layer.masks;
    if (!Array.isArray(list) || !list.length) return null;
    const enabled = [];
    for (let i = 0; i < list.length; i++) { if (list[i] && list[i].enabled) enabled.push(list[i]); }
    if (!enabled.length) return null;

    if (!_bufCv) _bufCv = document.createElement('canvas');
    if (!_tmpCv) _tmpCv = document.createElement('canvas');
    const buf = sized(_bufCv, W, H), tmp = sized(_tmpCv, W, H);
    const bctx = buf.getContext('2d'), tctx = tmp.getContext('2d');

    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.globalAlpha = 1; bctx.globalCompositeOperation = 'source-over'; bctx.filter = 'none';
    bctx.clearRect(0, 0, W, H);
    // Evaluate each mask's path ONCE, and seed the buffer off the first mask that actually encloses an
    // area — not merely enabled[0]. An empty (just-added, undrawn) subtract/intersect placed first would
    // otherwise flip the whole buffer to white and neutralise every following add mask.
    const evald = enabled.map(m => FM.evalMaskPath(m, t));
    const seedIdx = evald.findIndex(p => p && p.length >= 3);
    if (seedIdx < 0) return null;   // nothing draws anything -> render the layer unmasked
    const seedMode = maskMode(enabled[seedIdx]);
    if (seedMode === 'subtract' || seedMode === 'intersect') { bctx.fillStyle = '#fff'; bctx.fillRect(0, 0, W, H); }

    let drew = false;
    for (let i = 0; i < enabled.length; i++) {
      const m = enabled[i];
      const pts = evald[i];
      if (!pts || pts.length < 3) continue;   // <3 verts cannot enclose a fillable area -> contributes nothing
      const feather = clamp(num(m.feather, 0), 0, 500);
      const opacity = clamp(num(m.opacity, 1), 0, 1);

      // 1) render THIS mask's coverage into the temp: a white fill of its path, blurred by feather.
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.globalAlpha = 1; tctx.globalCompositeOperation = 'source-over';
      tctx.filter = feather > 0 ? ('blur(' + feather + 'px)') : 'none';
      tctx.clearRect(0, 0, W, H);
      tctx.fillStyle = '#fff';
      tctx.beginPath();
      FM.buildSubPath(tctx, pts, m.closed !== false, null);   // identity map: pts already in canvas space
      tctx.fill();
      // 2) invert WITHIN the frame if asked: source-out draws white only where the shape did NOT cover,
      //    so temp alpha becomes 1 - coverage (the feather edge reverses). No blur on the full-frame rect.
      if (m.invert) {
        tctx.filter = 'none';
        tctx.globalCompositeOperation = 'source-out';
        tctx.fillRect(0, 0, W, H);
      }
      tctx.filter = 'none'; tctx.globalCompositeOperation = 'source-over';
      // 3) stamp the temp onto the buffer by mode, at the mask's opacity (globalAlpha modulates coverage).
      bctx.globalCompositeOperation = COMPOP[maskMode(m)];
      bctx.globalAlpha = opacity;
      bctx.filter = 'none';
      bctx.drawImage(tmp, 0, 0);
      drew = true;
    }
    if (!drew) return null;   // nothing enclosed area (incl. an empty subtract/intersect) == no mask -> render normally
    return buf;
  };

})(window.FM);
