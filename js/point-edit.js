/* FreeMotion — Point editor.
 * "Edit points" for ANY shape: parametric kinds convert to an editable path (FM.shapeToPoints),
 * then this overlay shows draggable handles on every vertex — drag to reshape, drag a hollow
 * midpoint to add a point, double-tap a point to delete it. Matches AM's freeform vector editing.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let active = null;        // { layerId }
  let overlay = null, bar = null, raf = 0;
  let drag = null;          // { si, pi } current dragged point
  let lastTap = { t: 0, si: -1, pi: -1 };

  const preview = () => document.getElementById('preview');

  function layer() { return active ? FM.scene.layers.find(l => l.id === active.layerId) : null; }

  // Forward: normalized (u,v) → preview-canvas pixels (mirrors applyLayerTransform: skew → scale →
  // rotate → translate; parent chain + Z ignored, same as the canvas-edit gizmo).
  function xform(l) {
    const t = FM.time, tr = l.transform;
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
      w: l.shapeW || 400, h: l.shapeH || 300,
    };
  }
  function toCanvas(l, u, v) {
    const m = xform(l);
    let px = (u - m.ax) * m.w, py = (v - m.ay) * m.h;
    let qx = px + m.tanX * py, qy = m.tanY * px + py;   // skew
    qx *= m.sx; qy *= m.sy;                              // scale
    const c = Math.cos(m.rot), s = Math.sin(m.rot);
    return { x: m.x + qx * c - qy * s, y: m.y + qx * s + qy * c };
  }
  function toLocal(l, cx, cy) {
    const m = xform(l);
    const dx = cx - m.x, dy = cy - m.y;
    const c = Math.cos(-m.rot), s = Math.sin(-m.rot);
    let sx = (dx * c - dy * s) / m.sx, sy = (dx * s + dy * c) / m.sy;
    const det = (1 - m.tanX * m.tanY) || 1e-6;
    const rx = (sx - m.tanX * sy) / det, ry = (sy - m.tanY * sx) / det;
    return { u: rx / m.w + m.ax, v: ry / m.h + m.ay };
  }
  // preview-canvas px ↔ overlay display px
  function dispScale() { const cv = preview(), r = cv.getBoundingClientRect(); return r.width / cv.width || 1; }
  function evtToCanvas(e) {
    const r = preview().getBoundingClientRect();
    return { x: (e.clientX - r.left) * (preview().width / r.width), y: (e.clientY - r.top) * (preview().height / r.height) };
  }

  function subsOf(l) { return l.subs || (l.points ? [l.points] : []); }

  function draw() {
    const l = layer(), cv = preview();
    if (!l || !overlay || !cv) return;
    const r = cv.getBoundingClientRect(), wr = overlay.parentElement.getBoundingClientRect();
    overlay.style.left = (r.left - wr.left) + 'px';
    overlay.style.top = (r.top - wr.top) + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (overlay.width !== W || overlay.height !== H) { overlay.width = W; overlay.height = H; }
    const g = overlay.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, r.width, r.height);
    const k = dispScale();
    const subs = subsOf(l);
    g.lineWidth = 1.25; g.strokeStyle = 'rgba(41,217,187,.9)';
    subs.forEach(pts => {
      g.beginPath();
      pts.forEach((p, i) => { const q = toCanvas(l, p[0], p[1]); const X = q.x * k, Y = q.y * k; if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y); });
      if (l.closed !== false) g.closePath();
      g.stroke();
      // midpoints (hollow) — drag to insert a vertex
      const n = pts.length, last = (l.closed !== false) ? n : n - 1;
      for (let i = 0; i < last; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        const q = toCanvas(l, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        g.beginPath(); g.arc(q.x * k, q.y * k, 3.5, 0, 6.2832);
        g.fillStyle = 'rgba(10,14,20,.85)'; g.fill(); g.stroke();
      }
      // vertices (solid)
      pts.forEach(p => {
        const q = toCanvas(l, p[0], p[1]);
        g.beginPath(); g.arc(q.x * k, q.y * k, 5, 0, 6.2832);
        g.fillStyle = '#29d9bb'; g.fill();
        g.strokeStyle = '#06231d'; g.lineWidth = 1.5; g.stroke();
        g.strokeStyle = 'rgba(41,217,187,.9)'; g.lineWidth = 1.25;
      });
    });
  }

  function nearest(e) {
    const l = layer(); if (!l) return null;
    const pt = evtToCanvas(e), k = 1;   // compare in canvas px
    const thr = 14 / dispScale();       // ~14 display px
    const subs = subsOf(l);
    let best = null, bestD = thr;
    subs.forEach((pts, si) => pts.forEach((p, pi) => {
      const q = toCanvas(l, p[0], p[1]);
      const d = Math.hypot(q.x - pt.x, q.y - pt.y);
      if (d < bestD) { bestD = d; best = { si, pi, kind: 'pt' }; }
    }));
    if (best) return best;
    // midpoints (insert)
    bestD = thr;
    subs.forEach((pts, si) => {
      const n = pts.length, last = (l.closed !== false) ? n : n - 1;
      for (let i = 0; i < last; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        const q = toCanvas(l, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        const d = Math.hypot(q.x - pt.x, q.y - pt.y);
        if (d < bestD) { bestD = d; best = { si, pi: i, kind: 'mid' }; }
      }
    });
    return best;
  }

  function onDown(e) {
    const l = layer(); if (!l) return;
    const hit = nearest(e);
    if (!hit) return;
    e.preventDefault(); e.stopPropagation();
    const subs = subsOf(l);
    if (hit.kind === 'mid') {   // insert a vertex at the midpoint, then drag it
      const pts = subs[hit.si], a = pts[hit.pi], b = pts[(hit.pi + 1) % pts.length];
      pts.splice(hit.pi + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      drag = { si: hit.si, pi: hit.pi + 1 };
    } else {
      // double-tap deletes (min 3 points closed / 2 open)
      const now = performance.now();
      if (now - lastTap.t < 350 && lastTap.si === hit.si && lastTap.pi === hit.pi) {
        const pts = subs[hit.si], min = (l.closed !== false) ? 3 : 2;
        if (pts.length > min) { pts.splice(hit.pi, 1); FM.requestRender(); draw(); if (FM.history) FM.history.commit(); }
        lastTap = { t: 0, si: -1, pi: -1 };
        return;
      }
      lastTap = { t: now, si: hit.si, pi: hit.pi };
      drag = { si: hit.si, pi: hit.pi };
    }
    overlay.setPointerCapture && overlay.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (!drag) return;
    const l = layer(); if (!l) return;
    e.preventDefault();
    const pt = evtToCanvas(e);
    const loc = toLocal(l, pt.x, pt.y);
    const pts = subsOf(l)[drag.si];
    if (pts && pts[drag.pi]) { pts[drag.pi][0] = loc.u; pts[drag.pi][1] = loc.v; FM.requestRender(); }
  }
  function onUp() { if (drag) { drag = null; if (FM.history) FM.history.commit(); } }

  FM.pointEdit = {
    isActive() { return !!active; },
    start(layerId) {
      const l = FM.scene.layers.find(x => x.id === layerId);
      if (!l || l.type !== 'shape') return;
      if (l.shape !== 'path') {
        const cv = FM.shapeToPoints(l);
        l.shape = 'path'; l.subs = cv.subs; delete l.points; l.closed = cv.closed;
      } else if (l.points && !l.subs) { l.subs = [l.points]; delete l.points; }
      active = { layerId };
      const wrap = document.getElementById('canvas-wrap');
      overlay = document.createElement('canvas'); overlay.id = 'pe-overlay';
      wrap.appendChild(overlay);
      bar = document.createElement('div'); bar.id = 'pe-bar';
      bar.innerHTML = '<span>Edit points — drag to move · tap a ring to add · double-tap to delete</span>';
      const done = document.createElement('button'); done.className = 'btn btn-accent'; done.textContent = 'Done';
      done.addEventListener('click', () => FM.pointEdit.stop());
      bar.appendChild(done);
      document.body.appendChild(bar);
      overlay.addEventListener('pointerdown', onDown);
      overlay.addEventListener('pointermove', onMove);
      overlay.addEventListener('pointerup', onUp);
      overlay.addEventListener('pointercancel', onUp);
      const loop = () => { if (!active) return; draw(); raf = requestAnimationFrame(loop); };
      loop();
      if (FM.canvasEdit && FM.canvasEdit.update) FM.canvasEdit.update();
      FM.requestRender();
      if (FM.inspector) FM.inspector.refresh();
    },
    stop() {
      if (!active) return;
      active = null; drag = null;
      cancelAnimationFrame(raf);
      if (overlay) { overlay.remove(); overlay = null; }
      if (bar) { bar.remove(); bar = null; }
      if (FM.history) FM.history.commit();
      if (FM.inspector) FM.inspector.refresh();
      FM.requestRender();
    },
  };
})(window.FM);
