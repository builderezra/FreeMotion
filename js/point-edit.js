/* FreeMotion — Point editor (AM's "Edit Points").
 * Every point shape (library shapes + drawn paths) is built around this: a point at every bend,
 * smooth points ([u,v,1]) where the curve flows through, corners where it kinks. Drag a point to
 * reshape, tap a hollow ring to ADD a point on the curve, double-tap a point to DELETE it.
 * Tap selects (green) — the Edit Points panel edits the selected point (X/Y, curve/corner, delete).
 * Embedded mode: opened by the inspector's Edit Points panel (no floating Done bar).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let active = null;        // { layerId, embedded }
  let overlay = null, bar = null, raf = 0;
  let drag = null;          // { si, pi } current dragged point
  let sel = null;           // { si, pi } selected point (green, drives the panel)
  let lastTap = { t: 0, si: -1, pi: -1 };
  const cbs = [];           // change listeners (panel refresh)

  const preview = () => document.getElementById('preview');

  function layer() { return active ? FM.scene.layers.find(l => l.id === active.layerId) : null; }
  function notify(kind) { cbs.forEach(fn => { try { fn(kind); } catch (e) {} }); }

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
    if (!l) { FM.pointEdit.stop(); return; }   // layer deleted / project switched mid-edit → clean exit
    if (!overlay || !cv) return;
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
    const map = p => { const q = toCanvas(l, p[0], p[1]); return [q.x * k, q.y * k]; };
    const subs = subsOf(l);
    g.lineWidth = 1.25; g.strokeStyle = 'rgba(41,217,187,.9)';
    subs.forEach((pts, si) => {
      // the REAL curve (smooth flags honoured), not a straight-line approximation
      g.beginPath();
      FM.buildSubPath(g, pts, l.closed !== false, map);
      g.stroke();
      // midpoint rings ON the curve — drag/tap to insert a point there
      const n = pts.length, last = (l.closed !== false) ? n : n - 1;
      for (let i = 0; i < last; i++) {
        const mp = FM.subPathMidpoint(pts, i, l.closed !== false);
        const q = map(mp);
        g.beginPath(); g.arc(q[0], q[1], 3.5, 0, 6.2832);
        g.fillStyle = 'rgba(10,14,20,.85)'; g.fill(); g.stroke();
      }
      // vertices: SMOOTH points draw round, CORNER points draw square (AM-style); selected = green
      pts.forEach((p, pi) => {
        const q = map(p);
        const isSel = sel && sel.si === si && sel.pi === pi;
        const smooth = p[2] === 1;
        g.beginPath();
        if (smooth) g.arc(q[0], q[1], isSel ? 6 : 5, 0, 6.2832);
        else g.rect(q[0] - (isSel ? 5.5 : 4.5), q[1] - (isSel ? 5.5 : 4.5), isSel ? 11 : 9, isSel ? 11 : 9);
        g.fillStyle = isSel ? '#29d9bb' : '#c7d2e2';
        g.fill();
        g.strokeStyle = '#06231d'; g.lineWidth = 1.5; g.stroke();
        g.strokeStyle = 'rgba(41,217,187,.9)'; g.lineWidth = 1.25;
      });
    });
  }

  function nearest(e) {
    const l = layer(); if (!l) return null;
    const pt = evtToCanvas(e);
    const thr = 14 / dispScale();       // ~14 display px
    const subs = subsOf(l);
    let best = null, bestD = thr;
    subs.forEach((pts, si) => pts.forEach((p, pi) => {
      const q = toCanvas(l, p[0], p[1]);
      const d = Math.hypot(q.x - pt.x, q.y - pt.y);
      if (d < bestD) { bestD = d; best = { si, pi, kind: 'pt' }; }
    }));
    if (best) return best;
    // midpoints (insert) — on-curve
    bestD = thr;
    subs.forEach((pts, si) => {
      const n = pts.length, last = (l.closed !== false) ? n : n - 1;
      for (let i = 0; i < last; i++) {
        const mp = FM.subPathMidpoint(pts, i, l.closed !== false);
        const q = toCanvas(l, mp[0], mp[1]);
        const d = Math.hypot(q.x - pt.x, q.y - pt.y);
        if (d < bestD) { bestD = d; best = { si, pi: i, kind: 'mid' }; }
      }
    });
    return best;
  }

  function delPoint(si, pi) {
    const l = layer(); if (!l) return false;
    const pts = subsOf(l)[si], min = (l.closed !== false) ? 3 : 2;
    if (!pts || pts.length <= min) { if (FM.toast) FM.toast('A shape needs at least ' + min + ' points'); return false; }
    pts.splice(pi, 1);
    if (sel && sel.si === si) { if (sel.pi === pi) sel.pi = Math.max(0, pi - 1); else if (sel.pi > pi) sel.pi--; }
    FM.requestRender(); draw(); if (FM.history) FM.history.commit();
    notify('points');
    return true;
  }

  function onDown(e) {
    const l = layer(); if (!l) return;
    const hit = nearest(e);
    if (!hit) return;
    e.preventDefault(); e.stopPropagation();
    const subs = subsOf(l);
    if (hit.kind === 'mid') {   // insert a vertex ON the curve, then drag it (inherits smoothness)
      const pts = subs[hit.si];
      const mp = FM.subPathMidpoint(pts, hit.pi, l.closed !== false);
      const a = pts[hit.pi], b = pts[(hit.pi + 1) % pts.length];
      const np = (a[2] === 1 || b[2] === 1) ? [mp[0], mp[1], 1] : [mp[0], mp[1]];
      pts.splice(hit.pi + 1, 0, np);
      drag = { si: hit.si, pi: hit.pi + 1 };
      sel = { si: hit.si, pi: hit.pi + 1 };
      notify('points');
    } else {
      // double-tap deletes (min 3 points closed / 2 open)
      const now = performance.now();
      if (now - lastTap.t < 350 && lastTap.si === hit.si && lastTap.pi === hit.pi) {
        delPoint(hit.si, hit.pi);
        lastTap = { t: 0, si: -1, pi: -1 };
        return;
      }
      lastTap = { t: now, si: hit.si, pi: hit.pi };
      drag = { si: hit.si, pi: hit.pi };
      sel = { si: hit.si, pi: hit.pi };
      notify('sel');
    }
    draw();
    overlay.setPointerCapture && overlay.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (!drag) return;
    const l = layer(); if (!l) return;
    e.preventDefault();
    const pt = evtToCanvas(e);
    const loc = toLocal(l, pt.x, pt.y);
    const pts = subsOf(l)[drag.si];
    if (pts && pts[drag.pi]) { pts[drag.pi][0] = loc.u; pts[drag.pi][1] = loc.v; FM.requestRender(); notify('move'); }
  }
  function onUp() { if (drag) { drag = null; if (FM.history) FM.history.commit(); notify('sel'); } }

  FM.pointEdit = {
    isActive() { return !!active; },
    isEmbedded() { return !!(active && active.embedded); },
    layerId() { return active ? active.layerId : null; },
    onChange(fn) { if (cbs.indexOf(fn) < 0) cbs.push(fn); },
    offChange(fn) { const i = cbs.indexOf(fn); if (i >= 0) cbs.splice(i, 1); },

    // ---- selected-point API (drives the Edit Points panel) ----
    getSel() {
      const l = layer(); if (!l || !sel) return null;
      const pts = subsOf(l)[sel.si]; const p = pts && pts[sel.pi];
      if (!p) return null;
      const q = toCanvas(l, p[0], p[1]);
      return { si: sel.si, pi: sel.pi, x: q.x, y: q.y, smooth: p[2] === 1, count: pts.length };
    },
    setSelPos(px, py) {   // project-canvas px
      const l = layer(); if (!l || !sel) return;
      const pts = subsOf(l)[sel.si]; const p = pts && pts[sel.pi]; if (!p) return;
      const loc = toLocal(l, px, py);
      p[0] = loc.u; p[1] = loc.v;
      FM.requestRender(); draw(); notify('move');
    },
    moveSel(dx, dy) {     // delta in project px
      const s = this.getSel(); if (!s) return;
      this.setSelPos(s.x + dx, s.y + dy);
    },
    setSelSmooth(smooth) {
      const l = layer(); if (!l || !sel) return;
      const pts = subsOf(l)[sel.si]; const p = pts && pts[sel.pi]; if (!p) return;
      if (smooth) p[2] = 1; else p.length = 2;
      FM.requestRender(); draw(); if (FM.history) FM.history.commit(); notify('sel');
    },
    delSel() { if (sel) delPoint(sel.si, sel.pi); },
    commit() { if (FM.history) FM.history.commit(); },

    start(layerId, opts) {
      if (active && active.layerId === layerId) return;   // already editing this layer
      if (active) this.stop();
      const l = FM.scene.layers.find(x => x.id === layerId);
      if (!l || l.type !== 'shape') return;
      if (l.shape !== 'path') {
        const cv = FM.shapeToPoints(l);
        l.shape = 'path'; l.subs = cv.subs; delete l.points; l.closed = cv.closed;
      } else if (l.points && !l.subs) { l.subs = [l.points]; delete l.points; }
      active = { layerId, embedded: !!(opts && opts.embedded) };
      sel = { si: 0, pi: 0 };   // a point is always selected (AM) — the panel edits it
      const wrap = document.getElementById('canvas-wrap');
      overlay = document.createElement('canvas'); overlay.id = 'pe-overlay';
      wrap.appendChild(overlay);
      if (!active.embedded) {
        bar = document.createElement('div'); bar.id = 'pe-bar';
        bar.innerHTML = '<span>Edit points — drag to move · tap a ring to add · double-tap to delete</span>';
        const done = document.createElement('button'); done.className = 'btn btn-accent'; done.textContent = 'Done';
        done.addEventListener('click', () => FM.pointEdit.stop());
        bar.appendChild(done);
        document.body.appendChild(bar);
      }
      overlay.addEventListener('pointerdown', onDown);
      overlay.addEventListener('pointermove', onMove);
      overlay.addEventListener('pointerup', onUp);
      overlay.addEventListener('pointercancel', onUp);
      const loop = () => { if (!active) return; draw(); raf = requestAnimationFrame(loop); };
      loop();
      if (FM.canvasEdit && FM.canvasEdit.update) FM.canvasEdit.update();
      FM.requestRender();
      if (!active.embedded && FM.inspector) FM.inspector.refresh();
    },
    stop() {
      if (!active) return;
      const wasEmbedded = active.embedded;
      active = null; drag = null; sel = null;
      cancelAnimationFrame(raf);
      if (overlay) { overlay.remove(); overlay = null; }
      if (bar) { bar.remove(); bar = null; }
      cbs.length = 0;
      if (FM.history) FM.history.commit();
      if (!wasEmbedded && FM.inspector) FM.inspector.refresh();
      FM.requestRender();
    },
  };
})(window.FM);
