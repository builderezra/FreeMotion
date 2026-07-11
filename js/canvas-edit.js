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
    const ds = localScale();
    if (gx == null) { guideV.style.display = 'none'; } else { guideV.style.display = 'block'; guideV.style.left = (gx * ds) + 'px'; }
    if (gy == null) { guideH.style.display = 'none'; } else { guideH.style.display = 'block'; guideH.style.top = (gy * ds) + 'px'; }
  }

  function dispScale() {
    const r = canvas.getBoundingClientRect();
    return r.width / canvas.width || 1;
  }
  // wrap-LOCAL px per project px: the selection box / guides are children of #canvas-wrap, which the
  // viewport CSS-scales — their style.left/width lay out in UNscaled space, so the viewport scale in
  // the bounding rect must be divided back out (using dispScale() raw would double-apply the zoom).
  function localScale() {
    return dispScale() / ((FM.viewport && FM.viewport.scale) || 1);
  }

  // ---- viewport: pan/zoom of the PREVIEW itself ("grab the whole player" when nothing is selected).
  // Pure runtime view state — never written to FM.scene, never in history, never persisted. Reset from
  // the canvas dialog (cv-resetview), the view bar's fit button, Home, and on project switch.
  FM.viewport = {
    x: 0, y: 0, scale: 1,
    apply() {
      const w = wrap || document.getElementById('canvas-wrap');
      if (!w) return;
      w.style.transformOrigin = 'center center';
      w.style.transform = this.isDefault() ? '' : 'translate(' + this.x + 'px,' + this.y + 'px) scale(' + this.scale + ')';
      FM.canvasZoom = this.scale;   // keep the legacy zoom readers (vb-zoom +/− steps) in step
      const lbl = document.getElementById('vb-zlabel'); if (lbl) lbl.textContent = Math.round(this.scale * 100) + '%';
      const cz = document.getElementById('cv-zoom'); if (cz) cz.textContent = Math.round(this.scale * 100) + '%';
      update();
    },
    reset() { this.x = 0; this.y = 0; this.scale = 1; this.apply(); },
    isDefault() { return !this.x && !this.y && Math.abs(this.scale - 1) < 1e-3; },
  };

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
    // Invert the compositor's full transform (translate → rotate → non-uniform scale → skew) so a
    // click on a stretched / skewed layer hits its REAL footprint, not the uniform-scale box. (#11,#13)
    const scX = (sc * (tr.scaleX != null ? FM.evalProp(tr.scaleX, t) : 1)) || 1e-6;
    const scY = (sc * (tr.scaleY != null ? FM.evalProp(tr.scaleY, t) : 1)) || 1e-6;
    const tanX = Math.tan((tr.skewX != null ? FM.evalProp(tr.skewX, t) : 0) * Math.PI / 180);
    const tanY = Math.tan((tr.skewY != null ? FM.evalProp(tr.skewY, t) : 0) * Math.PI / 180);
    const rot = -FM.evalProp(tr.rotation, t) * Math.PI / 180;
    const dx = px - cx, dy = py - cy;
    // un-rotate, then un-scale → this is Skew·local
    const sx = (dx * Math.cos(rot) - dy * Math.sin(rot)) / scX;
    const sy = (dx * Math.sin(rot) + dy * Math.cos(rot)) / scY;
    // un-skew: invert [[1,tanX],[tanY,1]]
    const det = (1 - tanX * tanY) || 1e-6;
    const rx = (sx - tanX * sy) / det;
    const ry = (sy - tanY * sx) / det;
    const s = layerSize(layer);
    const ax = (typeof tr.anchorX === 'number') ? tr.anchorX : 0.5;
    const ay = (typeof tr.anchorY === 'number') ? tr.anchorY : 0.5;
    return rx >= -s.w * ax && rx <= s.w * (1 - ax) && ry >= -s.h * ay && ry <= s.h * (1 - ay);
  }

  function topHit(px, py) {
    const t = FM.time;
    for (let i = 0; i < FM.scene.layers.length; i++) {
      const l = FM.scene.layers[i];
      if (l.type === 'camera' || l.type === 'adjustment') continue;   // non-visual — select via the layer list
      if (l.type === 'group') {
        if (FM.groupContext === l.id) continue;   // inside Edit Group, taps pick MEMBERS, not the open group
        if (l.visible && !l.locked && FM.groupBounds) {
          const gb = FM.groupBounds(l, FM.scene, t);
          if (gb && px >= gb.x - gb.w / 2 && px <= gb.x + gb.w / 2 && py >= gb.y - gb.h / 2 && py <= gb.y + gb.h / 2) return l;
        }
        continue;   // a group acts as ONE object on canvas (AM); its members sit below it in z-order
      }
      if (l.visible && !l.locked && FM.isLayerVisibleAt(l, t) && hitTest(l, px, py, t)) return l;
    }
    return null;
  }

  // Does the tap point hit the SELECTED layer (its member bounds if it's a group)? Used only for
  // tap-off-to-deselect — never for picking a different layer.
  function hitSelected(l, px, py) {
    const t = FM.time;
    if (l.type === 'group') {
      if (!FM.groupBounds) return false;
      const gb = FM.groupBounds(l, FM.scene, t);
      return !!gb && px >= gb.x - gb.w / 2 && px <= gb.x + gb.w / 2 && py >= gb.y - gb.h / 2 && py <= gb.y + gb.h / 2;
    }
    if (!l.visible || !FM.isLayerVisibleAt(l, t)) return false;   // not on screen right now → a tap can't be "on" it
    return hitTest(l, px, py, t);
  }

  // ---- drag start ----
  // Two-finger pinch state (phones): pointer cache on #preview, same pattern as the timeline's pinch.
  const vpPtrs = new Map();
  let vpPinch = null;
  function finishDrag() {   // commit an in-flight drag (second finger landed / pointer lost)
    if (!drag) return;
    const d = drag; drag = null;
    showGuides(null, null);
    if (!d.moved || d.mode === 'viewpan') return;   // viewport pan is view-only — never in history
    if (FM.inspector) FM.inspector.refresh();
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
  }

  function startMove(e) {
    if (e.button !== 0) return;
    if (e.pointerType === 'touch') {
      vpPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (vpPtrs.size === 2) {
        // second finger → pinch the VIEWPORT (zoom + pan) and cancel the single-finger drag so the
        // two never fight (a real layer move commits first, so undo still captures it).
        e.preventDefault();
        finishDrag();
        const q = [...vpPtrs.values()];
        vpPinch = {
          dist: Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y) || 1,
          midX: (q[0].x + q[1].x) / 2, midY: (q[0].y + q[1].y) / 2,
          scale: FM.viewport.scale, x: FM.viewport.x, y: FM.viewport.y,
        };
        return;
      }
      if (vpPtrs.size > 2) return;   // ignore extra fingers
    }
    const p = eventToProject(e);
    const sel = FM.selectedLayer(FM.scene);
    if (sel && sel.type === 'camera') {   // camera selected → dragging anywhere pans the view (grab-the-scene)
      e.preventDefault();
      drag = { mode: 'campan', layer: sel, startP: p, zoom: FM.evalProp(sel.transform.scale, FM.time) || 1, startX: FM.evalProp(sel.transform.x, FM.time), startY: FM.evalProp(sel.transform.y, FM.time) };
      return;
    }
    if (sel) {
      // A layer is selected: the press NEVER re-selects via topHit — wherever the finger lands, a drag
      // moves the SELECTED layer only. A stationary tap resolves on release (onUp): tap OFF the layer
      // deselects; re-tap ON it reopens the phone inspector sheet.
      e.preventDefault();
      drag = { mode: 'move', layer: sel, startP: p, startX: FM.evalProp(sel.transform.x, FM.time), startY: FM.evalProp(sel.transform.y, FM.time), fromSelected: true };
      return;
    }
    // NOTHING selected: a tap selects what's under it (resolved on release, so a drag never selects);
    // a DRAG grabs the whole player — pans FM.viewport (view-only; reset via canvas dialog / home).
    e.preventDefault();
    drag = { mode: 'viewpan', startP: p, sx: e.clientX, sy: e.clientY, vx: FM.viewport.x, vy: FM.viewport.y };
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
    if (e.pointerType === 'touch' && vpPtrs.has(e.pointerId)) {
      vpPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (vpPinch && vpPtrs.size === 2) {   // pinch: distance ratio → zoom, midpoint delta → pan
        if (e.cancelable) e.preventDefault();
        const q = [...vpPtrs.values()];
        const d = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y);
        FM.viewport.scale = Math.max(0.2, Math.min(8, vpPinch.scale * (d / vpPinch.dist)));
        FM.viewport.x = vpPinch.x + ((q[0].x + q[1].x) / 2 - vpPinch.midX);
        FM.viewport.y = vpPinch.y + ((q[0].y + q[1].y) / 2 - vpPinch.midY);
        FM.viewport.apply();
        return;
      }
    }
    if (!drag) return;
    if (drag.mode === 'viewpan') {   // grab the whole player: screen-px pan (translate sits before scale)
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved) { if (Math.hypot(dx, dy) < 4) return; drag.moved = true; }
      FM.viewport.x = drag.vx + dx; FM.viewport.y = drag.vy + dy;
      FM.viewport.apply();
      return;
    }
    if (drag.mode === 'move' && drag.layer.locked) return;   // locked layer: press may tap-deselect, never move
    const p = eventToProject(e);
    const L = drag.layer;
    if (!drag.moved) {
      // ignore sub-threshold jitter so a tap isn't treated as a move (no no-op undo spam).
      // move/campan have startP; scale/rotate (handle grabs) don't and are always intentional.
      if (drag.startP) {
        const ds = dispScale(), dpx = Math.hypot((p.x - drag.startP.x) * ds, (p.y - drag.startP.y) * ds);
        if (dpx < 4) return;
      }
      drag.moved = true;
    }
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

  function onUp(e) {
    if (e && vpPtrs.has(e.pointerId)) { vpPtrs.delete(e.pointerId); if (vpPtrs.size < 2) vpPinch = null; }
    if (!drag) return;
    const d = drag;
    drag = null;
    showGuides(null, null);
    if (!d.moved) {
      // stationary tap (≤ threshold) — resolve the selection intent now that we know it wasn't a drag
      if (d.mode === 'viewpan') {
        const hit = topHit(d.startP.x, d.startP.y);
        if (hit) FM.selectLayer(hit.id);   // tap-to-select, exactly as before (drags never select)
        else if (FM.scene.selectedId || (FM.scene.selectedIds && FM.scene.selectedIds.length)) FM.selectLayer(null);
      } else if (d.mode === 'move' && d.fromSelected) {
        if (hitSelected(d.layer, d.startP.x, d.startP.y)) {
          // Re-tapping the ALREADY-selected layer must still reopen the phone inspector sheet if it
          // was swiped/grab-closed (selection unchanged, so the mobile open() wrapper never fires).
          if (FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone() && FM.mobile.open) FM.mobile.open();
        } else FM.selectLayer(null);   // tap OFF the selected layer → deselect (nothing moved)
      }
      return;   // no undo snapshot — nothing changed
    }
    if (d.mode === 'viewpan') return;   // view-only — never touches the scene or history
    if (FM.inspector) FM.inspector.refresh();  // sync number fields once, after the drag
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
  }

  // Scroll to zoom the camera around the cursor (the scene point under the pointer stays put).
  let wheelCommit = null;
  function onWheel(e) {
    const sel = FM.selectedLayer(FM.scene);
    if (!sel) {
      // nothing selected → the wheel zooms the VIEWPORT about the canvas centre (view-only, no undo)
      e.preventDefault();
      const v = FM.viewport;
      v.scale = Math.max(0.2, Math.min(8, v.scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
      v.apply();
      return;
    }
    if (sel.type !== 'camera') return;   // a layer is selected → only the camera steers, leave the page alone
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
    // grab cursor = "you're holding the player" (nothing selected → viewport pan; camera → scene pan)
    const cur = (!layer || layer.type === 'camera') ? 'grab' : 'default';
    if (canvas && canvas.style.cursor !== cur) canvas.style.cursor = cur;
    if (!layer || layer.type === 'camera' || !FM.isLayerVisibleAt(layer, t)) { box.style.display = 'none'; return; }   // camera pans globally — no box
    const tr = layer.transform;
    const sc = FM.evalProp(tr.scale, t);
    const cx = FM.evalProp(tr.x, t), cy = FM.evalProp(tr.y, t);
    const rot = FM.evalProp(tr.rotation, t);
    const s = layerSize(layer), ds = localScale();
    // Match the compositor's effective non-uniform scale + skew so the box and its corner handles hug
    // the rendered layer (was a uniform-scale, skew-less box that drifted off stretched/skewed layers). (#9,#12)
    const scX = sc * (tr.scaleX != null ? FM.evalProp(tr.scaleX, t) : 1);
    const scY = sc * (tr.scaleY != null ? FM.evalProp(tr.scaleY, t) : 1);
    const skX = tr.skewX != null ? FM.evalProp(tr.skewX, t) : 0;
    const skY = tr.skewY != null ? FM.evalProp(tr.skewY, t) : 0;
    // GROUPS: box hugs the members' world bounds (bounds already include the group's own offset/scale)
    // instead of a meaningless 100px square at the group's 0,0 origin. Centre-anchored by construction.
    let bw = s.w * scX * ds, bh = s.h * scY * ds, bcx = cx, bcy = cy;
    let ax = (typeof tr.anchorX === 'number') ? tr.anchorX : 0.5;
    let ay = (typeof tr.anchorY === 'number') ? tr.anchorY : 0.5;
    if (layer.type === 'group' && FM.groupBounds) {
      const gb = FM.groupBounds(layer, FM.scene, t);
      if (gb) { bw = gb.w * ds; bh = gb.h * ds; bcx = gb.x; bcy = gb.y; ax = 0.5; ay = 0.5; }
    }
    box.style.display = 'block';
    box.style.width = bw + 'px';
    box.style.height = bh + 'px';
    // transform.x/y is the ANCHOR point; the compositor draws content at -w*anchorX / -h*anchorY from it
    // and rotates around the anchor. Mirror that here so the box + handles stay glued to the layer once
    // the anchor is moved off-centre (was hardcoded to a centred 0.5/0.5 anchor).
    box.style.left = (bcx * ds - bw * ax) + 'px';
    box.style.top = (bcy * ds - bh * ay) + 'px';
    box.style.transformOrigin = (bw * ax) + 'px ' + (bh * ay) + 'px';
    // rotate, then a shear K' = S·K·S⁻¹ applied to the already-scaled box reproduces the compositor's
    // R·S·K exactly — and because K' has a unit diagonal, the handles shear but don't blow up in size.
    let tf = 'rotate(' + rot + 'deg)';
    if (skX || skY) {
      const tanX = Math.tan(skX * Math.PI / 180), tanY = Math.tan(skY * Math.PI / 180);
      const sX = scX || 1e-6, sY = scY || 1e-6;
      tf += ' matrix(1,' + (sY * tanY / sX) + ',' + (sX * tanX / sY) + ',1,0,0)';
    }
    box.style.transform = tf;
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
      window.addEventListener('pointercancel', onUp);   // lost touches must release pinch fingers + drags
      window.addEventListener('resize', update);
    },
    update: update,
  };
})(window.FM);
