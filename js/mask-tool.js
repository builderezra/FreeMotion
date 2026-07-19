/* FreeMotion — Pen mask editor (draws layer.masks[].path — the new pen-mask system).
 * A mask path is a list of points in PROJECT/CANVAS pixel space (0..P.width, 0..P.height) — the same
 * space the preview canvas draws in — so screen<->project mapping is just the display scale (no layer
 * transform, unlike the point editor which lives in a layer's local space).
 * PEN mode (empty path): tap to drop points in sequence; tap the first point (or Close) to close it.
 * EDIT mode (closed path): drag a point to reshape, tap an edge ring to insert, double-tap a point to
 * delete, select + Smooth to toggle curve/corner. Points are [x,y] corners or [x,y,1] smooth.
 * If the mask's path is animated ({kf}), edits write into the keyframe at the playhead (AE-style roto).
 * Overlay lays out in screen px over #preview (viewport reset first); commits via FM.history.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let active = null;          // { layerId, maskId }
  let overlay = null, bar = null, raf = 0;
  let pts = null;             // working point list (project px) — the array we mutate
  let closed = false;         // false → PEN mode (drawing); true → EDIT mode (closed fill)
  let drag = null;            // { pi } index of the point being dragged
  let sel = -1;               // selected point index (drives Delete / Smooth)
  let dirty = false;          // did anything actually change since open()? gates the flush on Done so
                              // just opening + closing the editor on an ANIMATED path can't inject a
                              // spurious keyframe at the playhead (a no-op roto inspection must not mutate)
  let lastTap = { t: 0, pi: -1 };

  const preview = () => document.getElementById('preview');
  function layer() { return active ? FM.scene.layers.find(l => l.id === active.layerId) : null; }
  function mask() { const l = layer(); return l && l.masks ? l.masks.find(m => m && m.id === active.maskId) : null; }
  function proj() { return (FM.scene && FM.scene.project) || { width: 1920, height: 1080 }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clonePts(a) { return a.map(p => p.slice()); }

  // screen px ↔ project(canvas) px. The preview canvas is sized to project px (app.js resizeCanvas),
  // so canvas px === project px and the only mapping is the on-screen display scale.
  function dispScale() { const cv = preview(), r = cv.getBoundingClientRect(); return r.width / cv.width || 1; }
  function evtToProj(e) {
    const cv = preview(), r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
  }

  function isAnim() { const m = mask(); return !!(m && FM.isAnimated && FM.isAnimated(m.path)); }

  // Read the path this mask should show at the current playhead (for seeding the editor).
  function seedPts(m) {
    if (!m) return [];
    if (FM.evalMaskPath) { const p = FM.evalMaskPath(m, FM.time); return Array.isArray(p) ? clonePts(p) : []; }
    // Fallback (masks.js not loaded): static array as-is, animated → snap to kf at/just before t.
    if (Array.isArray(m.path)) return m.path;
    if (m.path && Array.isArray(m.path.kf) && m.path.kf.length) {
      const kf = m.path.kf, t = FM.time;
      let v = kf[0].v;
      for (let i = 0; i < kf.length; i++) { if (kf[i].t <= t + 1e-6) v = kf[i].v; }
      return Array.isArray(v) ? clonePts(v) : [];
    }
    return [];
  }

  // Write the working points back into the model. Animated path → upsert the keyframe at the playhead
  // (new roto key when none sits there); static path → the array is already the live reference.
  function flush() {
    const m = mask(); if (!m) return;
    m.closed = closed;
    if (isAnim()) {
      const t = FM.time, p = m.path, v = clonePts(pts);
      const hit = p.kf.find(k => Math.abs(k.t - t) < 1e-3);
      if (hit) hit.v = v;
      else { p.kf.push({ t: t, v: v, e: 'linear' }); p.kf.sort((a, b) => a.t - b.t); if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild(); }
    } else {
      m.path = pts;
    }
  }
  function commit() { dirty = true; flush(); if (FM.history) FM.history.commit(); FM.requestRender(); }

  /* ---------- drawing ---------- */
  function draw() {
    const l = layer(), m = mask(), cv = preview();
    if (!l || !m || !cv || !overlay) { FM.maskTool.stop(); return; }
    const r = cv.getBoundingClientRect(), wr = overlay.parentElement.getBoundingClientRect();
    overlay.style.left = (r.left - wr.left) + 'px'; overlay.style.top = (r.top - wr.top) + 'px';
    overlay.style.width = r.width + 'px'; overlay.style.height = r.height + 'px';
    const dpr = window.devicePixelRatio || 1, W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (overlay.width !== W || overlay.height !== H) { overlay.width = W; overlay.height = H; }
    const g = overlay.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, r.width, r.height);
    const k = dispScale();
    const map = p => [p[0] * k, p[1] * k];
    if (!pts.length) return;
    // filled preview of the reveal region (real curve, smooth flags honoured)
    g.beginPath();
    FM.buildSubPath(g, pts, closed, map);
    g.fillStyle = 'rgba(41,217,187,.14)';
    if (closed) g.fill();
    g.strokeStyle = 'rgba(41,217,187,.95)'; g.lineWidth = 1.5; g.stroke();
    // edge insert rings (edit mode only) — sit ON the curve
    if (closed) {
      g.lineWidth = 1.25;
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const mp = FM.subPathMidpoint(pts, i, true), q = map(mp);
        g.beginPath(); g.arc(q[0], q[1], 3.5, 0, 6.2832);
        g.fillStyle = 'rgba(10,14,20,.85)'; g.fill(); g.stroke();
      }
    }
    // vertices: smooth → round, corner → square; selected → green; in pen mode the first point is a
    // hollow ring you tap to close.
    pts.forEach((p, pi) => {
      const q = map(p), isSel = pi === sel, smooth = p[2] === 1;
      const closeTarget = !closed && pi === 0 && pts.length >= 3;
      g.beginPath();
      if (closeTarget) { g.arc(q[0], q[1], 8, 0, 6.2832); g.fillStyle = 'rgba(10,14,20,.6)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#29d9bb'; g.stroke(); return; }
      if (smooth) g.arc(q[0], q[1], isSel ? 6 : 5, 0, 6.2832);
      else g.rect(q[0] - (isSel ? 5.5 : 4.5), q[1] - (isSel ? 5.5 : 4.5), isSel ? 11 : 9, isSel ? 11 : 9);
      g.fillStyle = isSel ? '#29d9bb' : '#c7d2e2'; g.fill();
      g.strokeStyle = '#06231d'; g.lineWidth = 1.5; g.stroke();
    });
  }
  function loop() { if (!active) return; draw(); raf = requestAnimationFrame(loop); }

  /* ---------- hit testing (project px) ---------- */
  function nearestPoint(pp) {
    const thr = 16 / dispScale(); let best = -1, bd = thr;
    pts.forEach((p, pi) => { const d = Math.hypot(p[0] - pp.x, p[1] - pp.y); if (d < bd) { bd = d; best = pi; } });
    return best;
  }
  function nearestMid(pp) {
    if (!closed) return -1;
    const thr = 16 / dispScale(); let best = -1, bd = thr, n = pts.length;
    for (let i = 0; i < n; i++) {
      const mp = FM.subPathMidpoint(pts, i, true), d = Math.hypot(mp[0] - pp.x, mp[1] - pp.y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /* ---------- point ops ---------- */
  function delPoint(pi) {
    const min = closed ? 3 : 1;
    if (pts.length <= min) { if (FM.toast) FM.toast(closed ? 'A mask needs at least 3 points' : 'Tap the canvas to start drawing'); return; }
    pts.splice(pi, 1);
    if (sel === pi) sel = Math.max(0, pi - 1); else if (sel > pi) sel--;
    commit(); updateBar();
  }
  function toggleSmooth(pi) {
    const p = pts[pi]; if (!p) return;
    if (p[2] === 1) p.length = 2; else { p[2] = 1; p.length = 3; }
    commit();
  }
  function closePath() {
    if (pts.length < 3) { if (FM.toast) FM.toast('Add at least 3 points first'); return; }
    closed = true; sel = -1; commit(); updateBar();
    if (FM.toast) FM.toast('Mask closed — drag points to reshape');
  }

  /* ---------- pointer ---------- */
  function onDown(e) {
    if (!active) return;
    e.preventDefault(); e.stopPropagation();
    const pp = evtToProj(e);
    const P = proj(), cp = { x: clamp(pp.x, 0, P.width), y: clamp(pp.y, 0, P.height) };
    if (!closed) {
      // PEN: tap the first point to close, otherwise drop a new point and let the finger fine-tune it.
      if (pts.length >= 3) { const q = pts[0], d = Math.hypot(q[0] - pp.x, q[1] - pp.y); if (d <= 16 / dispScale()) { closePath(); return; } }
      const hit = nearestPoint(pp);
      if (hit >= 0) { drag = { pi: hit }; sel = hit; }
      else { pts.push([cp.x, cp.y]); sel = pts.length - 1; drag = { pi: sel }; dirty = true; flush(); FM.requestRender(); updateBar(); }
      draw();
      try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
      return;
    }
    // EDIT
    const hp = nearestPoint(pp);
    if (hp >= 0) {
      const now = performance.now();
      if (now - lastTap.t < 350 && lastTap.pi === hp) { lastTap = { t: 0, pi: -1 }; delPoint(hp); return; }
      lastTap = { t: now, pi: hp };
      sel = hp; drag = { pi: hp }; updateBar(); draw();
      try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
      return;
    }
    const hm = nearestMid(pp);
    if (hm >= 0) {
      const a = pts[hm], b = pts[(hm + 1) % pts.length];
      const mp = FM.subPathMidpoint(pts, hm, true);
      const np = (a[2] === 1 || b[2] === 1) ? [mp[0], mp[1], 1] : [mp[0], mp[1]];
      pts.splice(hm + 1, 0, np); sel = hm + 1; drag = { pi: sel };
      dirty = true; flush(); FM.requestRender(); updateBar(); draw();
      try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
      return;
    }
    sel = -1; updateBar(); draw();
  }
  function onMove(e) {
    if (!active || !drag) return;
    e.preventDefault();
    const P = proj(), pp = evtToProj(e), p = pts[drag.pi];
    if (!p) return;
    p[0] = clamp(pp.x, 0, P.width); p[1] = clamp(pp.y, 0, P.height);
    dirty = true; flush(); FM.requestRender();
  }
  function onUp(e) {
    if (drag) { drag = null; if (FM.history) FM.history.commit(); try { overlay.releasePointerCapture(e.pointerId); } catch (_) {} }
  }
  function onResize() { if (active) draw(); }

  /* ---------- bottom bar ---------- */
  function mkBtn(label, cls) {
    const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label;
    b.style.cssText = 'min-height:40px;min-width:40px;border:1px solid var(--line);background:var(--panel-2);color:var(--text);border-radius:999px;padding:8px 16px;font-size:13px;cursor:pointer;';
    return b;
  }
  function updateBar() {
    if (!bar) return;
    bar.innerHTML = '';
    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:12px;color:var(--text-faint);max-width:44vw;';
    if (!closed) {
      hint.textContent = pts.length < 3 ? 'Tap to add mask points' : 'Tap the first point to close';
      bar.appendChild(hint);
      if (sel >= 0 && pts.length) { const del = mkBtn('Delete', 'mk-del'); del.addEventListener('click', () => delPoint(sel)); bar.appendChild(del); }
      const close = mkBtn('Close path', 'mk-close');
      if (pts.length < 3) close.disabled = true, close.style.opacity = '.45';
      close.addEventListener('click', closePath); bar.appendChild(close);
    } else {
      hint.textContent = 'Drag points · tap an edge to add · double-tap to delete';
      bar.appendChild(hint);
      if (sel >= 0) {
        const sm = mkBtn(pts[sel] && pts[sel][2] === 1 ? 'Corner' : 'Smooth', 'mk-smooth');
        sm.addEventListener('click', () => { toggleSmooth(sel); updateBar(); });
        const del = mkBtn('Delete', 'mk-del');
        del.addEventListener('click', () => delPoint(sel));
        bar.appendChild(sm); bar.appendChild(del);
      }
    }
    const done = mkBtn('Done', 'mk-done');
    done.style.cssText += 'background:var(--accent);border-color:var(--accent);color:#06231d;font-weight:700;';
    done.addEventListener('click', () => FM.maskTool.stop());
    bar.appendChild(done);
  }

  function teardown() {
    active = null; drag = null; pts = null; sel = -1;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onUp, true);
    window.removeEventListener('resize', onResize);
    if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay); overlay = null;
    if (bar && bar.parentElement) bar.parentElement.removeChild(bar); bar = null;
  }

  FM.maskTool = {
    isActive() { return !!active; },
    layerId() { return active ? active.layerId : null; },
    maskId() { return active ? active.maskId : null; },
    open(layerId, maskId) {
      if (active) this.stop();
      if (FM.viewport && !FM.viewport.isDefault && FM.viewport.reset) { /* older builds */ }
      if (FM.viewport && FM.viewport.isDefault && !FM.viewport.isDefault()) FM.viewport.reset();   // overlay lays out in screen px — a zoomed viewport double-scales it
      const l = FM.scene.layers.find(x => x.id === layerId);
      const m = l && l.masks ? l.masks.find(mm => mm && mm.id === maskId) : null;
      if (!l || !m) { if (FM.toast) FM.toast('Mask not found'); return; }
      if (FM.playing && FM.pause) FM.pause();
      if (FM.selectLayer) FM.selectLayer(l.id);
      active = { layerId, maskId };
      dirty = false;
      pts = seedPts(m);
      // Empty → PEN. Existing points that the mask marks closed → EDIT. (A lone <3-point path stays pen.)
      closed = pts.length >= 3 && m.closed !== false;
      if (!isAnim() && !Array.isArray(m.path)) m.path = pts;   // seed a static path so pen edits are live
      sel = -1;
      const wrap = document.getElementById('canvas-wrap');
      overlay = document.createElement('canvas'); overlay.id = 'mask-overlay';
      overlay.style.cssText = 'position:absolute;z-index:44;touch-action:none;cursor:crosshair;';
      wrap.appendChild(overlay);
      overlay.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
      window.addEventListener('resize', onResize);
      bar = document.createElement('div'); bar.id = 'mask-bar';
      bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:max(18px,env(safe-area-inset-bottom));z-index:60;display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:8px 10px 8px 16px;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:94vw;';
      document.body.appendChild(bar);
      updateBar();
      loop();
      FM.requestRender();
      if (FM.toast) FM.toast(closed ? 'Editing mask path' : 'Tap on the canvas to draw a mask', 2200);
    },
    stop() {
      if (!active) return;
      // Only persist if something actually changed — live edits already flushed + committed as they
      // happened, so an unconditional flush here just re-upserts, and on an untouched animated path it
      // would inject a keyframe at the playhead the user never asked for.
      if (dirty) { flush(); if (FM.history) FM.history.commit(); }
      teardown();
      FM.requestRender();
      if (FM.canvasEdit && FM.canvasEdit.update) FM.canvasEdit.update();
      if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
    },
    redraw() { if (active) draw(); },
  };
})(window.FM);
