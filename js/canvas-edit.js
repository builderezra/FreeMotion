/* FreeMotion — On-canvas direct manipulation (Alight-Motion-style).
 * Click a layer to select; drag the body to move, drag a corner handle to scale (uniform,
 * around centre), drag the top knob to rotate. A selection box tracks position/scale/rotation.
 * All edits write to the same scene document the inspector uses, keyframing animated props.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let canvas, wrap, box;
  let drag = null;
  let guideV = null, guideH = null;

  // Snap a value to the nearest target within threshold (canvas centre / edges).
  function snapTo(v, targets, thr) {
    let best = null, bd = thr;
    for (const t of targets) { const d = Math.abs(v - t); if (d <= bd) { bd = d; best = t; } }
    return best == null ? { v: v, hit: false } : { v: best, hit: true, target: best };
  }
  function showGuides(gx, gy) {
    if (!guideV || !guideH) return;
    const ds = dispScale();
    if (gx == null) { guideV.style.display = 'none'; } else { guideV.style.display = 'block'; guideV.style.left = (gx * ds) + 'px'; }
    if (gy == null) { guideH.style.display = 'none'; } else { guideH.style.display = 'block'; guideH.style.top = (gy * ds) + 'px'; }
  }

  function dispScale() {
    const r = canvas.getBoundingClientRect();
    return r.width / canvas.width || 1;
  }

  function eventToProject(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  // Use the canonical size (handles text / shape / null / media) so shapes get a correct,
  // correctly-sized selection box and hit region instead of a fixed 100×100.
  function layerSize(layer) {
    if (FM.layerSize) return FM.layerSize(layer);
    const m = FM.media.get(layer.id);
    return { w: m ? m.width : 100, h: m ? m.height : 100 };
  }

  function hitTest(layer, px, py, t) {
    const tr = layer.transform;
    const cx = FM.evalProp(tr.x, t), cy = FM.evalProp(tr.y, t);
    const sc = FM.evalProp(tr.scale, t) || 1e-6;
    const rot = -FM.evalProp(tr.rotation, t) * Math.PI / 180;
    const dx = px - cx, dy = py - cy;
    const rx = (dx * Math.cos(rot) - dy * Math.sin(rot)) / sc;
    const ry = (dx * Math.sin(rot) + dy * Math.cos(rot)) / sc;
    const s = layerSize(layer), ax = tr.anchorX, ay = tr.anchorY;
    return rx >= -s.w * ax && rx <= s.w * (1 - ax) && ry >= -s.h * ay && ry <= s.h * (1 - ay);
  }

  function topHit(px, py) {
    const t = FM.time;
    for (let i = 0; i < FM.scene.layers.length; i++) {
      const l = FM.scene.layers[i];
      if (l.type === 'camera' || l.type === 'adjustment') continue;   // non-visual — select via the layer list
      if (l.visible && !l.locked && FM.isLayerVisibleAt(l, t) && hitTest(l, px, py, t)) return l;
    }
    return null;
  }

  // ---- drag start ----
  function startMove(e) {
    if (e.button !== 0) return;
    const p = eventToProject(e);
    const sel = FM.selectedLayer(FM.scene);
    if (sel && sel.type === 'camera') {   // camera selected → dragging anywhere pans the view (grab-the-scene)
      e.preventDefault();
      drag = { mode: 'campan', layer: sel, startP: p, zoom: FM.evalProp(sel.transform.scale, FM.time) || 1, startX: FM.evalProp(sel.transform.x, FM.time), startY: FM.evalProp(sel.transform.y, FM.time) };
      return;
    }
    const layer = topHit(p.x, p.y);
    if (!layer) return;
    e.preventDefault();
    if (FM.scene.selectedId !== layer.id) FM.selectLayer(layer.id);
    drag = { mode: 'move', layer: layer, startP: p, startX: FM.evalProp(layer.transform.x, FM.time), startY: FM.evalProp(layer.transform.y, FM.time) };
  }

  function startHandle(role) {
    return function (e) {
      e.preventDefault(); e.stopPropagation();
      const layer = FM.selectedLayer(FM.scene);
      if (!layer) return;
      const p = eventToProject(e);
      const cx = FM.evalProp(layer.transform.x, FM.time), cy = FM.evalProp(layer.transform.y, FM.time);
      if (role === 'scale') {
        drag = { mode: 'scale', layer: layer, cx: cx, cy: cy, startScale: FM.evalProp(layer.transform.scale, FM.time) || 0.0001, startDist: Math.hypot(p.x - cx, p.y - cy) || 1 };
      } else {
        drag = { mode: 'rotate', layer: layer, cx: cx, cy: cy, startRot: FM.evalProp(layer.transform.rotation, FM.time), startAngle: Math.atan2(p.y - cy, p.x - cx) };
      }
    };
  }

  // ---- drag move / end ----
  function onMove(e) {
    if (!drag) return;
    const p = eventToProject(e);
    const L = drag.layer;
    if (drag.mode === 'campan') {   // pan the camera so the grabbed scene point follows the cursor
      const nx = drag.startX - (p.x - drag.startP.x) / drag.zoom;
      const ny = drag.startY - (p.y - drag.startP.y) / drag.zoom;
      FM.setTransform(L, 'x', Math.round(nx), FM.time);
      FM.setTransform(L, 'y', Math.round(ny), FM.time);
      FM.requestRender(); update(); return;
    }
    if (drag.mode === 'move') {
      let nx = drag.startX + (p.x - drag.startP.x);
      let ny = drag.startY + (p.y - drag.startP.y);
      const P = FM.scene.project, thr = 14 / dispScale();
      const sx = snapTo(nx, [P.width / 2, 0, P.width], thr);
      const sy = snapTo(ny, [P.height / 2, 0, P.height], thr);
      nx = sx.v; ny = sy.v;
      showGuides(sx.hit ? sx.target : null, sy.hit ? sy.target : null);
      FM.setTransform(L, 'x', Math.round(nx), FM.time);
      FM.setTransform(L, 'y', Math.round(ny), FM.time);
    } else if (drag.mode === 'scale') {
      const s = drag.startScale * (Math.hypot(p.x - drag.cx, p.y - drag.cy) / drag.startDist);
      FM.setTransform(L, 'scale', Math.max(0.02, Math.round(s * 1000) / 1000), FM.time);
    } else if (drag.mode === 'rotate') {
      const deg = drag.startRot + (Math.atan2(p.y - drag.cy, p.x - drag.cx) - drag.startAngle) * 180 / Math.PI;
      FM.setTransform(L, 'rotation', Math.round(deg * 10) / 10, FM.time);
    }
    FM.requestRender();
    update();
  }

  function onUp() {
    if (!drag) return;
    drag = null;
    showGuides(null, null);
    if (FM.inspector) FM.inspector.refresh();  // sync number fields once, after the drag
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
  }

  // Scroll to zoom the camera around the cursor (the scene point under the pointer stays put).
  let wheelCommit = null;
  function onWheel(e) {
    const sel = FM.selectedLayer(FM.scene);
    if (!sel || sel.type !== 'camera') return;   // only steers the camera, otherwise leave the page alone
    e.preventDefault();
    const P = FM.scene.project, cx = P.width / 2, cy = P.height / 2, pc = eventToProject(e);
    const zoom = FM.evalProp(sel.transform.scale, FM.time) || 1;
    const nz = Math.max(0.1, Math.min(8, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    if (nz === zoom) return;
    const camX = FM.evalProp(sel.transform.x, FM.time), camY = FM.evalProp(sel.transform.y, FM.time), k = 1 / zoom - 1 / nz;
    FM.setTransform(sel, 'x', Math.round(camX + (pc.x - cx) * k), FM.time);
    FM.setTransform(sel, 'y', Math.round(camY + (pc.y - cy) * k), FM.time);
    FM.setTransform(sel, 'scale', Math.round(nz * 1000) / 1000, FM.time);
    FM.requestRender(); update();
    if (FM.inspector) FM.inspector.refresh();
    if (wheelCommit) clearTimeout(wheelCommit);
    wheelCommit = setTimeout(() => { if (FM.history) FM.history.commit(); wheelCommit = null; }, 400);   // one undo step per gesture
  }

  // ---- selection box ----
  function update() {
    if (!box) return;
    const layer = FM.selectedLayer(FM.scene);
    const t = FM.time;
    if (!layer || layer.type === 'camera' || !FM.isLayerVisibleAt(layer, t)) { box.style.display = 'none'; return; }   // camera pans globally — no box
    const tr = layer.transform;
    const sc = FM.evalProp(tr.scale, t);
    const cx = FM.evalProp(tr.x, t), cy = FM.evalProp(tr.y, t);
    const rot = FM.evalProp(tr.rotation, t);
    const s = layerSize(layer), ds = dispScale();
    const bw = s.w * sc * ds, bh = s.h * sc * ds;
    box.style.display = 'block';
    box.style.width = bw + 'px';
    box.style.height = bh + 'px';
    box.style.left = (cx * ds - bw / 2) + 'px';   // anchor is centred (0.5, 0.5)
    box.style.top = (cy * ds - bh / 2) + 'px';
    box.style.transform = 'rotate(' + rot + 'deg)';
  }

  FM.canvasEdit = {
    init() {
      canvas = document.getElementById('preview');
      wrap = document.getElementById('canvas-wrap');
      box = document.createElement('div');
      box.id = 'select-box';
      box.style.display = 'none';
      ['nw', 'ne', 'se', 'sw'].forEach(pos => {
        const h = document.createElement('div');
        h.className = 'sb-handle sb-' + pos;
        h.addEventListener('pointerdown', startHandle('scale'));
        box.appendChild(h);
      });
      const rotH = document.createElement('div');
      rotH.className = 'sb-handle sb-rot';
      rotH.addEventListener('pointerdown', startHandle('rotate'));
      box.appendChild(rotH);
      wrap.appendChild(box);
      guideV = document.createElement('div'); guideV.className = 'snap-guide v'; guideV.style.display = 'none';
      guideH = document.createElement('div'); guideH.className = 'snap-guide h'; guideH.style.display = 'none';
      wrap.appendChild(guideV); wrap.appendChild(guideH);
      canvas.addEventListener('pointerdown', startMove);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('resize', update);
    },
    update: update,
  };
})(window.FM);
