/* FreeMotion — transitions between two main clips (Simple mode release 2.7; DESIGN.md §12.1, D13 A: a transition NEVER makes the video shorter).
 *
 * `inc.trIn = { type, d }` on the incoming main clip. Over [cut − d/2, cut + d/2] (cut = inc.start) the renderer shows the outgoing clip past its
 * out-point and the incoming clip before its in-point, blended. Clip times never change, so the main-track maths is untouched, and THE SHARED
 * GATES ARE NOT WIDENED (Q10): FM.isLayerVisibleAt and FM.layerLocalTime keep their exact windows — a transition draws through a proxy of the
 * layer (the renderer's one transition pass) and seeks its picture through FM.transitionSeeks, which the exporter and the paused preview share.
 *
 * FM.transitionAt reads STORED FLAGS ONLY (never the classifier, whose answer depends on media records and can differ on a guest before loading):
 * layers with `sm.main` and `trIn`, on a project where `project.sm.adopted` is true. It owns validity: null unless `out` and `inc` are
 * consecutive main clips whose seam is a join (never across a gap, an overlap or a card), and `d_eff = min(trIn.d, ½·min(out.duration,
 * inc.duration))` so the windows on neighbouring cuts can never overlap. The stored `d` is never rewritten by a trim, so undoing a trim brings
 * the old length back.
 *
 * Sound is picture-only here: audio hard-cuts at the cut exactly as it does today; the overhang elements are seeked for their picture and stay
 * muted. A matching audio crossfade is a Later item with its own picture for him.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  FM.TR_TYPES = ['crossfade', 'dipblack', 'dipwhite'];
  FM.TR_MIN = 0.1; FM.TR_MAX = 3; FM.TR_DEFAULT = 0.5;
  const VISUAL = { video: 1, image: 1, shape: 1 };
  const isMainPic = l => !!(l && l.sm && l.sm.main === true && VISUAL[l.type] && l.visible !== false && l.audioOnly !== true);
  const eps = scene => 0.5 / ((scene.project && scene.project.fps) || 30);

  /* the outgoing clip of `inc`: the main picture whose end is within half a frame of inc.start, the lowest in the stack if several; null unless
     the seam is a clean join (nothing else main covers the cut) */
  FM.transitionOutOf = function (scene, inc) {
    const L = scene.layers, e = eps(scene);
    let out = null;
    for (let j = 0; j < L.length; j++) {
      const o = L[j];
      if (o === inc || !isMainPic(o)) continue;
      if (Math.abs(o.start + o.duration - inc.start) <= e) out = o;
    }
    if (!out) return null;
    for (let j = 0; j < L.length; j++) {   // an overlap or a third main clip across the cut is a blend, not a join
      const o = L[j];
      if (o === inc || o === out || !isMainPic(o)) continue;
      if (o.start < inc.start - e && o.start + o.duration > inc.start + e) return null;
    }
    return out;
  };
  FM.transitionDEff = function (tr, out, inc) { return Math.min(+tr.d || 0, 0.5 * Math.min(out.duration, inc.duration)); };

  FM.transitionAt = function (scene, t) {
    if (!scene || !scene.layers || !scene.project || !scene.project.sm || scene.project.sm.adopted !== true) return null;
    const L = scene.layers;
    for (let i = 0; i < L.length; i++) {
      const inc = L[i], tr = inc.trIn;
      if (!tr || !isMainPic(inc) || FM.TR_TYPES.indexOf(tr.type) < 0 || !(+tr.d > 0)) continue;
      const out = FM.transitionOutOf(scene, inc); if (!out) continue;
      const d = FM.transitionDEff(tr, out, inc), cut = inc.start;
      if (!(d > 1e-9) || t < cut - d / 2 || t >= cut + d / 2) continue;
      const p = Math.max(0, Math.min(1, (t - (cut - d / 2)) / d));
      const top = L.indexOf(out) < L.indexOf(inc) ? out : inc;   // the loop draws from the end of the list to the start, so the lower index is drawn last, on top
      const r = { out: out, inc: inc, type: tr.type, d: d, cut: cut, p: p, top: top, aOut: 1, aInc: 1, dip: null, dipA: 0 };
      if (tr.type === 'crossfade') { if (top === inc) r.aInc = p; else r.aOut = 1 - p; }
      else { r.dip = tr.type === 'dipwhite' ? '#ffffff' : '#000000'; r.dipA = 1 - Math.abs(2 * p - 1); if (p < 0.5) r.aInc = 0; else r.aOut = 0; }
      return r;
    }
    return null;
  };

  /* the source time a clip's picture shows at project time t, extended past its own window along the same line (a held first or last frame when the
     source has no more): FM.layerLocalTime inside the clip, otherwise the extension of its first or last speed */
  FM.handleLocalTime = function (layer, t) {
    const inside = FM.layerLocalTime(layer, t);
    const m = FM.media && FM.media.get ? FM.media.get(layer.id) : null, mdur = m && m.duration > 0 ? m.duration : Infinity;
    let src;
    const dir = layer.reversed ? -1 : 1;
    if (inside != null) src = inside;
    else if (t < layer.start) src = FM.layerLocalTime(layer, layer.start) - dir * (layer.start - t) * FM.speedAt(layer, layer.start);
    else { const e = layer.start + layer.duration - 1e-9; src = FM.layerLocalTime(layer, e) + dir * (t - (layer.start + layer.duration)) * FM.speedAt(layer, e); }
    return Math.max(0, Math.min(mdur, src));
  };

  /* the picture seeks a transition asks for at time t: [{ layer, local }], only for an element OUTSIDE its own window (inside it the ordinary
     seek applies). The exporter and the paused preview both read THIS, so they cannot disagree. */
  FM.transitionSeeks = function (scene, t) {
    const tr = FM.transitionAt(scene, t); if (!tr) return [];
    const out = [];
    [tr.out, tr.inc].forEach(l => { if (l.type === 'video' && FM.layerLocalTime(l, t) == null) out.push({ layer: l, local: FM.handleLocalTime(l, t) }); });
    return out;
  };

  /* the renderer's proxy of a layer in a transition: a shallow copy whose own window reaches t (so the unwidened gate passes it), carrying the
     alpha FM.layerOpacity multiplies in */
  FM.transitionProxy = function (layer, tr, t) {
    const a = layer === tr.out ? tr.aOut : tr.aInc;
    const x = Object.assign({}, layer, { __trA: a });
    if (t < layer.start) { x.duration = layer.duration + (layer.start - t); x.start = t; }
    else if (t >= layer.start + layer.duration) x.duration = t - layer.start + 1e-6;
    return x;
  };
})(window.FM);
