/* FreeMotion — Free Crop tool (not in Alight Motion).
 * Tap "Free crop" in Edit Shape, then drag a box right on the playback area — iPhone-photo style.
 * While open, the layer shows its WHOLE frame (compositor honours layer._cropEditing) and this overlay
 * dims everything outside the crop box. Drag a corner/edge handle to resize, drag inside to move, or
 * drag on empty space to draw a fresh box. Done writes layer.crop (source-pixel rect); Cancel restores.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let active = null;              // { layerId }
  let overlay = null, bar = null, raf = 0;
  let rect = null;                // crop rect in SOURCE px { x, y, w, h }
  let MW = 0, MH = 0;
  let drag = null;                // { mode, startSp, startRect }

  const preview = () => document.getElementById('preview');
  function layer() { return active ? FM.scene.layers.find(l => l.id === active.layerId) : null; }
  function media() { const l = layer(); return l && FM.media ? FM.media.get(l.id) : null; }

  // Same transform math as the point editor, but the content box is the full media (MW×MH).
  function xform(l) {
    const t = FM.time, tr = l.transform, sc = FM.evalProp(tr.scale, t) || 1e-6;
    return {
      x: FM.evalProp(tr.x, t), y: FM.evalProp(tr.y, t),
      sx: (sc * (tr.scaleX != null ? FM.evalProp(tr.scaleX, t) : 1)) || 1e-6,
      sy: (sc * (tr.scaleY != null ? FM.evalProp(tr.scaleY, t) : 1)) || 1e-6,
      rot: FM.evalProp(tr.rotation, t) * Math.PI / 180,
      tanX: Math.tan((tr.skewX != null ? FM.evalProp(tr.skewX, t) : 0) * Math.PI / 180),
      tanY: Math.tan((tr.skewY != null ? FM.evalProp(tr.skewY, t) : 0) * Math.PI / 180),
      ax: (typeof tr.anchorX === 'number') ? tr.anchorX : 0.5,
      ay: (typeof tr.anchorY === 'number') ? tr.anchorY : 0.5,
      w: MW || 1, h: MH || 1,
    };
  }
  function toCanvas(l, u, v) {   // normalized (u,v) → preview-canvas px
    const m = xform(l);
    let px = (u - m.ax) * m.w, py = (v - m.ay) * m.h;
    let qx = px + m.tanX * py, qy = m.tanY * px + py;
    qx *= m.sx; qy *= m.sy;
    const c = Math.cos(m.rot), s = Math.sin(m.rot);
    return { x: m.x + qx * c - qy * s, y: m.y + qx * s + qy * c };
  }
  function toLocal(l, cx, cy) {   // preview-canvas px → normalized (u,v)
    const m = xform(l);
    const dx = cx - m.x, dy = cy - m.y, c = Math.cos(-m.rot), s = Math.sin(-m.rot);
    let sx = (dx * c - dy * s) / m.sx, sy = (dx * s + dy * c) / m.sy;
    const det = (1 - m.tanX * m.tanY) || 1e-6;
    const rx = (sx - m.tanX * sy) / det, ry = (sy - m.tanY * sx) / det;
    return { u: rx / m.w + m.ax, v: ry / m.h + m.ay };
  }
  function dispScale() { const cv = preview(), r = cv.getBoundingClientRect(); return r.width / cv.width || 1; }
  function evtToCanvas(e) { const r = preview().getBoundingClientRect(); return { x: (e.clientX - r.left) * (preview().width / r.width), y: (e.clientY - r.top) * (preview().height / r.height) }; }
  // source px → overlay display px (via canvas px × dispScale)
  function srcDisp(sx, sy) { const l = layer(), k = dispScale(); const q = toCanvas(l, sx / MW, sy / MH); return { x: q.x * k, y: q.y * k }; }
  // pointer → source px
  function evtSrc(e) { const l = layer(), p = evtToCanvas(e), loc = toLocal(l, p.x, p.y); return { x: loc.u * MW, y: loc.v * MH }; }

  const HANDLES = [['nw', 0, 0], ['n', .5, 0], ['ne', 1, 0], ['e', 1, .5], ['se', 1, 1], ['s', .5, 1], ['sw', 0, 1], ['w', 0, .5]];
  function handleSrc(id) { const h = HANDLES.find(x => x[0] === id); return { x: rect.x + h[1] * rect.w, y: rect.y + h[2] * rect.h }; }

  function draw() {
    const l = layer(), cv = preview();
    if (!l || !overlay || !cv) { FM.cropTool.stop(); return; }
    const r = cv.getBoundingClientRect(), wr = overlay.parentElement.getBoundingClientRect();
    overlay.style.left = (r.left - wr.left) + 'px'; overlay.style.top = (r.top - wr.top) + 'px';
    overlay.style.width = r.width + 'px'; overlay.style.height = r.height + 'px';
    const dpr = window.devicePixelRatio || 1, W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (overlay.width !== W || overlay.height !== H) { overlay.width = W; overlay.height = H; }
    const g = overlay.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, r.width, r.height);
    // corners of the crop quad in display px
    const c = {
      nw: srcDisp(rect.x, rect.y), ne: srcDisp(rect.x + rect.w, rect.y),
      se: srcDisp(rect.x + rect.w, rect.y + rect.h), sw: srcDisp(rect.x, rect.y + rect.h),
    };
    // dim everything, then punch a hole where the crop is (reveals the full frame beneath)
    g.fillStyle = 'rgba(6,9,14,.62)'; g.fillRect(0, 0, r.width, r.height);
    g.save(); g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(c.nw.x, c.nw.y); g.lineTo(c.ne.x, c.ne.y); g.lineTo(c.se.x, c.se.y); g.lineTo(c.sw.x, c.sw.y); g.closePath(); g.fill();
    g.restore();
    // rule-of-thirds grid inside the crop
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      const a = srcDisp(rect.x + rect.w * i / 3, rect.y), b = srcDisp(rect.x + rect.w * i / 3, rect.y + rect.h);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      const d = srcDisp(rect.x, rect.y + rect.h * i / 3), e = srcDisp(rect.x + rect.w, rect.y + rect.h * i / 3);
      g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(e.x, e.y); g.stroke();
    }
    // outline
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(c.nw.x, c.nw.y); g.lineTo(c.ne.x, c.ne.y); g.lineTo(c.se.x, c.se.y); g.lineTo(c.sw.x, c.sw.y); g.closePath(); g.stroke();
    // handles
    g.fillStyle = '#fff';
    HANDLES.forEach(h => { const p = srcDisp(rect.x + h[1] * rect.w, rect.y + h[2] * rect.h); const rr = (h[0].length === 2) ? 6 : 5; g.beginPath(); g.arc(p.x, p.y, rr, 0, 6.2832); g.fill(); });
  }
  function redraw() { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { raf = 0; draw(); }); }

  function hitHandle(e) {
    const p = evtToCanvas(e), k = dispScale(), thr = 16;
    let best = null, bd = thr;
    HANDLES.forEach(h => { const s = handleSrc(h[0]), q = toCanvas(layer(), s.x / MW, s.y / MH); const d = Math.hypot(q.x * k - p.x * k, q.y * k - p.y * k); if (d < bd) { bd = d; best = h[0]; } });
    return best;
  }
  function insideRect(sp) { return sp.x >= rect.x && sp.x <= rect.x + rect.w && sp.y >= rect.y && sp.y <= rect.y + rect.h; }
  function isFull() { return rect.w >= MW - 1 && rect.h >= MH - 1; }

  function onDown(e) {
    if (!active) return;
    e.preventDefault(); e.stopPropagation();
    const id = hitHandle(e), sp = evtSrc(e);
    // On a handle → resize. Inside an existing (partial) crop → move it. Otherwise (uncropped frame,
    // or a press outside the box) → DRAW a fresh box from here, iPhone-style.
    if (id) drag = { mode: id };
    else if (!isFull() && insideRect(sp)) drag = { mode: 'move', startSp: sp, startRect: Object.assign({}, rect) };
    else { drag = { mode: 'new', startSp: { x: clamp(sp.x, 0, MW), y: clamp(sp.y, 0, MH) } }; }
    try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function onMove(e) {
    if (!active || !drag) return;
    e.preventDefault();
    const sp = { x: clamp(evtSrc(e).x, 0, MW), y: clamp(evtSrc(e).y, 0, MH) };
    const MIN = 16;
    if (drag.mode === 'move') {
      let nx = drag.startRect.x + (sp.x - drag.startSp.x), ny = drag.startRect.y + (sp.y - drag.startSp.y);
      rect.x = clamp(nx, 0, MW - rect.w); rect.y = clamp(ny, 0, MH - rect.h);
    } else if (drag.mode === 'new') {
      const s = drag.startSp;
      rect.x = Math.min(s.x, sp.x); rect.y = Math.min(s.y, sp.y);
      rect.w = Math.max(MIN, Math.abs(sp.x - s.x)); rect.h = Math.max(MIN, Math.abs(sp.y - s.y));
    } else {
      let l = rect.x, t = rect.y, rgt = rect.x + rect.w, bot = rect.y + rect.h;
      if (drag.mode.indexOf('w') >= 0) l = Math.min(sp.x, rgt - MIN);
      if (drag.mode.indexOf('e') >= 0) rgt = Math.max(sp.x, l + MIN);
      if (drag.mode.indexOf('n') >= 0) t = Math.min(sp.y, bot - MIN);
      if (drag.mode.indexOf('s') >= 0) bot = Math.max(sp.y, t + MIN);
      rect.x = l; rect.y = t; rect.w = rgt - l; rect.h = bot - t;
    }
    redraw();
  }
  function onUp(e) { if (drag) { drag = null; try { overlay.releasePointerCapture(e.pointerId); } catch (_) {} } }

  function commit() {
    const l = layer(); if (!l) return;
    l._cropEditing = false;
    l.crop = { x: Math.round(clamp(rect.x, 0, MW)), y: Math.round(clamp(rect.y, 0, MH)), w: Math.round(clamp(rect.w, 1, MW)), h: Math.round(clamp(rect.h, 1, MH)) };
    teardown();
    FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Cropped');
  }
  function cancel() { const l = layer(); if (l) l._cropEditing = false; teardown(); FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.inspector) FM.inspector.refresh(); }
  function teardown() {
    active = null; drag = null;
    if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay); overlay = null;
    if (bar && bar.parentElement) bar.parentElement.removeChild(bar); bar = null;
    document.body.classList.remove('cropping');
    window.removeEventListener('resize', onResize);
  }
  function onResize() { if (active) redraw(); }

  FM.cropTool = {
    isActive() { return !!active; },
    start(layerId) {
      const l = FM.scene.layers.find(x => x.id === layerId);
      const m = l && FM.media ? FM.media.get(l.id) : null;
      if (!l || !m || !m.width || !m.height) { if (FM.toast) FM.toast('Nothing to crop'); return; }
      if (FM.selectLayer) FM.selectLayer(l.id);
      MW = m.width; MH = m.height;
      // seed from the existing crop (before _cropEditing flips the frame to full)
      const cur = FM.cropOf ? FM.cropOf(l, FM.time) : null;
      rect = (cur && !cur.full) ? { x: cur.x, y: cur.y, w: cur.w, h: cur.h } : { x: 0, y: 0, w: MW, h: MH };
      active = { layerId };
      l._cropEditing = true; FM.requestRender();
      const wrap = document.getElementById('canvas-wrap');
      overlay = document.createElement('canvas'); overlay.id = 'crop-overlay';
      wrap.appendChild(overlay);
      overlay.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('resize', onResize);
      bar = document.createElement('div'); bar.id = 'crop-bar';
      bar.innerHTML = '<span class="cb-hint">Drag to crop</span><button class="cb-reset" type="button">Reset</button><button class="cb-cancel" type="button">Cancel</button><button class="cb-done" type="button">Done</button>';
      document.body.appendChild(bar);
      bar.querySelector('.cb-reset').addEventListener('click', () => { rect = { x: 0, y: 0, w: MW, h: MH }; redraw(); });
      bar.querySelector('.cb-cancel').addEventListener('click', cancel);
      bar.querySelector('.cb-done').addEventListener('click', commit);
      document.body.classList.add('cropping');
      draw();
      if (FM.toast) FM.toast('Drag a crop box on the video', 2400);
    },
    stop() { if (active) cancel(); },
    redraw() { if (active) redraw(); },
  };
})(window.FM);
