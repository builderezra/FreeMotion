/* FreeMotion — drag a GRADIENT or IMAGE fill around on the canvas (queue 33).
 * Ezra: "when it's on the gradient option or on the image option, you should be able to drag on the
 * canvas to change where the image is positioned."
 *
 * Opened by Colour & Fill's Gradient / Media tab and torn down with it. It CLAIMS THE CANVAS the way
 * crop-tool and point-edit do — an overlay canvas over the preview that swallows pointerdown — rather
 * than special-casing canvas-edit.js, so it can never end up in a race with the move gesture.
 * The one difference from those two: this overlay sits at z-index 2, UNDER #select-box (3). Crop and
 * Edit Points are modal — nothing else on the canvas means anything while they are open — but you
 * very much still want to scale the layer, or drag a text-wrap handle, while nudging its fill. So the
 * selection handles stay on top and keep their taps; everything else on the canvas is ours.
 *
 * What it writes (both NORMALISED to the fill box — 1.0 = one box width; see FM.fillBoxOf):
 *   gradient → layer.fillGradient.ox / .oy   (moves the radial core / conic pivot / linear midpoint)
 *   media    → layer.fillImgX / layer.fillImgY (pans the picture inside its cover-fit clip)
 * Both go through FM.setProp/FM.evalProp, so each is a plain number until the ◆ in the panel turns it
 * into a {kf:[…]} — after which dragging upserts a keyframe at the playhead like any animated prop.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let active = null;          // { layerId, mode }
  let overlay = null, raf = 0;
  let drag = null;            // { u, v, ox, oy, moved }

  const GRAD_LIMIT = 1.5;     // a gradient centre may leave its box — but not far enough to be lost
  const preview = () => document.getElementById('preview');
  function layer() { return active ? FM.scene.layers.find(l => l.id === active.layerId) : null; }
  function cl(v, m) { return v > m ? m : (v < -m ? -m : v); }

  /* Same forward/inverse transform as crop-tool and point-edit (skew → scale → rotate → translate;
   * parent chain and Z ignored, exactly like the canvas-edit gizmo) — but the content box is the FILL
   * box, straight from the compositor, so u/v here are the very units the offsets are stored in.
   * A flattened group's fill is painted over the whole project frame, so it gets identity. */
  function xform(l) {
    const t = FM.time, tr = l.transform, b = FM.fillBoxOf(l, t);
    if (b.world) return { x: 0, y: 0, sx: 1, sy: 1, rot: 0, tanX: 0, tanY: 0, ax: 0, ay: 0, w: b.w || 1, h: b.h || 1 };
    const sc = FM.evalProp(tr.scale, t) || 1e-6;
    return {
      x: FM.evalProp(tr.x, t), y: FM.evalProp(tr.y, t),
      sx: (sc * (tr.scaleX != null ? FM.evalProp(tr.scaleX, t) : 1)) || 1e-6,
      sy: (sc * (tr.scaleY != null ? FM.evalProp(tr.scaleY, t) : 1)) || 1e-6,
      rot: FM.evalProp(tr.rotation, t) * Math.PI / 180,
      tanX: Math.tan((tr.skewX != null ? FM.evalProp(tr.skewX, t) : 0) * Math.PI / 180),
      tanY: Math.tan((tr.skewY != null ? FM.evalProp(tr.skewY, t) : 0) * Math.PI / 180),
      ax: (typeof tr.anchorX === 'number') ? tr.anchorX : 0.5,
      ay: (typeof tr.anchorY === 'number') ? tr.anchorY : 0.5,
      w: b.w || 1, h: b.h || 1,
    };
  }
  function toCanvas(l, u, v) {   // box-normalized (u,v) → PROJECT px
    const m = xform(l);
    let px = (u - m.ax) * m.w, py = (v - m.ay) * m.h;
    let qx = px + m.tanX * py, qy = m.tanY * px + py;
    qx *= m.sx; qy *= m.sy;
    const c = Math.cos(m.rot), s = Math.sin(m.rot);
    return { x: m.x + qx * c - qy * s, y: m.y + qx * s + qy * c };
  }
  function toLocal(l, cx, cy) {   // PROJECT px → box-normalized (u,v)
    const m = xform(l);
    const dx = cx - m.x, dy = cy - m.y, c = Math.cos(-m.rot), s = Math.sin(-m.rot);
    const sx = (dx * c - dy * s) / m.sx, sy = (dx * s + dy * c) / m.sy;
    const det = (1 - m.tanX * m.tanY) || 1e-6;
    const rx = (sx - m.tanX * sy) / det, ry = (sy - m.tanY * sx) / det;
    return { u: rx / m.w + m.ax, v: ry / m.h + m.ay };
  }
  /* WRAP-local px per PROJECT px. Not previewDispScale() on its own: the overlay is a child of
   * #canvas-wrap, which the viewport CSS-scales, so style/backing coordinates lay out in UNscaled
   * space and the zoom in the bounding rect has to be divided back out or it double-applies. This is
   * the same correction #select-box makes — and it is why this overlay, unlike crop/point-edit,
   * doesn't have to slam the viewport back to 1:1 just to draw itself. */
  function localScale() {
    const k = FM.previewDispScale ? FM.previewDispScale() : 1;
    return k / ((FM.viewport && FM.viewport.scale) || 1);
  }
  function toDisp(l, u, v) { const q = toCanvas(l, u, v), k = localScale(); return { x: q.x * k, y: q.y * k }; }

  // ---- the two offsets, read/written through the keyframe-aware accessors -------------------------
  function offGet(l) {
    const t = FM.time;
    if (active.mode === 'gradient') { const g = l.fillGradient || {}; return { x: FM.evalProp(g.ox, t) || 0, y: FM.evalProp(g.oy, t) || 0 }; }
    return { x: FM.evalProp(l.fillImgX, t) || 0, y: FM.evalProp(l.fillImgY, t) || 0 };
  }
  function offSet(l, x, y) {
    const t = FM.time;
    if (active.mode === 'gradient') { const g = l.fillGradient; if (!g) return; FM.setProp(g, 'ox', x, t); FM.setProp(g, 'oy', y, t); }
    else { FM.setProp(l, 'fillImgX', x, t); FM.setProp(l, 'fillImgY', y, t); }
  }
  // Clamp in the TOOL as well as the renderer. The renderer clamps so a hand-edited value can't paint
  // an empty shape; the tool clamps so the stored number never runs past what is drawn — otherwise
  // dragging back does nothing until you have unwound the invisible excess.
  function clampOff(l, x, y) {
    if (active.mode === 'gradient') return { x: cl(x, GRAD_LIMIT), y: cl(y, GRAD_LIMIT) };
    const lim = FM.fillPanLimit ? FM.fillPanLimit(l, FM.time) : null;
    return lim ? { x: cl(x, lim.x), y: cl(y, lim.y) } : { x: x, y: y };
  }

  // ---- overlay ----------------------------------------------------------------------------------
  function draw() {
    const l = layer(), cv = preview();
    // Layer deleted, project swapped, or the tab changed under us → let go of the canvas. The rAF
    // loop is what makes that self-healing: no event has to fire for the overlay to notice.
    if (!l || !cv || !overlay) { FM.fillDrag.stop(); return; }
    if (FM.fillModeOf(l) !== active.mode) { FM.fillDrag.stop(); return; }
    // The overlay fills the WRAP (CSS inset:0), not the canvas's rect. #canvas-wrap keeps its full
    // comp-sized box even when the preview canvas is cropped and repositioned for a zoomed viewport,
    // so wrap-local space is the one place project coordinates map to a stable rectangle.
    const wrap = overlay.parentElement;
    const cwd = Math.max(1, wrap.clientWidth), chd = Math.max(1, wrap.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.round(cwd * dpr)), H = Math.max(1, Math.round(chd * dpr));
    if (overlay.width !== W || overlay.height !== H) { overlay.width = W; overlay.height = H; }
    const g = overlay.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cwd, chd);
    const o = offGet(l);
    const home = toDisp(l, 0.5, 0.5);                    // the fill box's centre
    const now = toDisp(l, 0.5 + o.x, 0.5 + o.y);         // where the drag has put it
    // a leash back to the untouched position, so "how far have I moved this" is answerable at a glance
    if (Math.abs(o.x) > 1e-4 || Math.abs(o.y) > 1e-4) {
      g.save(); g.setLineDash([4, 4]); g.strokeStyle = 'rgba(41,217,187,.55)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(home.x, home.y); g.lineTo(now.x, now.y); g.stroke(); g.restore();
    }
    g.lineWidth = 1.8; g.strokeStyle = '#0b1016';
    g.beginPath(); g.arc(now.x, now.y, 11, 0, 6.2832);
    g.fillStyle = 'rgba(10,16,24,.42)'; g.fill(); g.stroke();
    g.strokeStyle = '#29d9bb'; g.lineWidth = 1.6;
    g.beginPath(); g.arc(now.x, now.y, 11, 0, 6.2832); g.stroke();
    // four little arrows = "drag me"; a ring alone reads as a handle you are meant to grab precisely
    g.beginPath();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
      g.moveTo(now.x + d[0] * 3.5, now.y + d[1] * 3.5);
      g.lineTo(now.x + d[0] * 7.5, now.y + d[1] * 7.5);
    });
    g.stroke();
  }
  function loop() { if (!active) return; draw(); if (active) raf = requestAnimationFrame(loop); }

  // ---- gesture ----------------------------------------------------------------------------------
  function onDown(e) {
    const l = layer(); if (!l) { FM.fillDrag.stop(); return; }
    // The canvas is ours while this is open, locked layer or not: swallow the event either way, or a
    // miss falls through to canvas-edit and reads as "deselect", closing the panel under the finger
    // (the same bug point-edit had to fix).
    e.preventDefault(); e.stopPropagation();
    if (l.locked) return;
    const p = FM.eventToProject(e), loc = toLocal(l, p.x, p.y), o = offGet(l);
    drag = { u: loc.u, v: loc.v, ox: o.x, oy: o.y, moved: false };
    try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (!drag) return;
    const l = layer(); if (!l) { drag = null; return; }
    e.preventDefault();
    const p = FM.eventToProject(e), loc = toLocal(l, p.x, p.y);
    // The gesture is measured as a difference of two toLocal() readings, so the translation cancels
    // and what is left is exactly the normalised box delta — the same unit the renderer consumes.
    // That is what makes it survive preview render scale, viewport zoom, layer scale and rotation.
    const n = clampOff(l, drag.ox + (loc.u - drag.u), drag.oy + (loc.v - drag.v));
    offSet(l, n.x, n.y);
    drag.moved = true;
    FM.requestRender();
  }
  function onUp(e) {
    if (!drag) return;
    const moved = drag.moved; drag = null;
    if (overlay) { try { overlay.releasePointerCapture(e.pointerId); } catch (_) {} }
    if (moved) { if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit(); }
  }

  FM.fillDrag = {
    isActive() { return !!active; },
    layerId() { return active ? active.layerId : null; },
    mode() { return active ? active.mode : null; },

    start(layerId, mode) {
      if (active && active.layerId === layerId && active.mode === mode) return;   // idempotent: the inspector re-runs this on every refresh
      if (active) this.stop();
      const l = FM.scene.layers.find(x => x.id === layerId);
      if (!l || (mode !== 'gradient' && mode !== 'media')) return;
      const wrap = document.getElementById('canvas-wrap');
      if (!wrap) return;
      active = { layerId: layerId, mode: mode };
      overlay = document.createElement('canvas'); overlay.id = 'fd-overlay';
      overlay.title = mode === 'gradient' ? 'Drag to move the gradient' : 'Drag to reposition the picture';
      /* Geometry set INLINE as well as in styles.css. Not belt-and-braces for its own sake: a canvas
       * with no CSS box falls back to its intrinsic BACKING size at its static position, so a browser
       * holding a cached styles.css would get an overlay of the wrong size, in the wrong place, still
       * eating every tap on the canvas — measured exactly that at devicePixelRatio 2, where the marker
       * landed a full backing-width down and right of the comp. Inline wins over both stylesheets
       * (including theme-glass, which loads last), so the gesture surface can never be the thing that
       * a stale cache breaks. */
      overlay.style.position = 'absolute'; overlay.style.inset = '0';
      overlay.style.width = '100%'; overlay.style.height = '100%';   // inset alone leaves a canvas at its intrinsic size in some layouts
      overlay.style.zIndex = '2';                                    // above #preview, BELOW #select-box (3) so the handles keep their taps
      overlay.style.touchAction = 'none'; overlay.style.cursor = 'move';
      wrap.appendChild(overlay);
      overlay.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
      loop();
    },
    stop() {
      if (!active) return;
      active = null; drag = null;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
      overlay = null;
      // Deliberately no inspector.refresh() here: fillPanel() is what calls start(), so refreshing
      // from stop() would immediately re-open the tool it just closed.
      FM.requestRender();
    },
    // Reset button in the panel — back to a centred gradient / centred picture.
    reset() {
      const l = layer(); if (!l) return;
      const o = clampOff(l, 0, 0);
      offSet(l, o.x, o.y);
      FM.requestRender();
      if (FM.history) FM.history.commit();
    },
    // exposed for the panel's ◆ and for tests: which object+keys hold this fill's position
    propRef(l, mode) {
      if (mode === 'gradient') return { obj: l.fillGradient, keys: ['ox', 'oy'] };
      return { obj: l, keys: ['fillImgX', 'fillImgY'] };
    },
  };
})(window.FM);
