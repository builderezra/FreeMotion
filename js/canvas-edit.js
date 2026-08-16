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
  let guideV = null, guideH = null, anchorDot = null;

  // Snap a value to the nearest target within threshold (canvas centre / edges).
  function snapTo(v, targets, thr) {
    let best = null, bd = thr;
    for (const t of targets) { const d = Math.abs(v - t); if (d <= bd) { bd = d; best = t; } }
    return best == null ? { v: v, hit: false } : { v: best, hit: true, target: best };
  }
  function showGuides(gx, gy) {
    if (!guideV || !guideH) return;
    clearTimeout(_alignHide);   // an M&T auto-hide timer must never blank the guides mid-canvas-drag
    const ds = localScale();
    if (gx == null) { guideV.style.display = 'none'; } else { guideV.style.display = 'block'; guideV.style.left = (gx * ds) + 'px'; }
    if (gy == null) { guideH.style.display = 'none'; } else { guideH.style.display = 'block'; guideH.style.top = (gy * ds) + 'px'; }
  }

  // CSS px per PROJECT px. The preview canvas is no longer 1:1 with the project — it is supersampled
  // when zoomed (sharp vectors) and may hold only the visible crop — so the project-space extent it
  // covers is canvas.width / __fmRS, not canvas.width. Everything downstream works in project units.
  function projSpan() { return (canvas.width / (canvas.__fmRS || 1)) || FM.scene.project.width || 1; }
  function dispScale() {
    const r = canvas.getBoundingClientRect();
    return r.width / projSpan() || 1;
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
      // counter-scale the selection handles: they're children of the scaled wrap, so at 0.2× zoom a
      // 10px handle (+ its touch pad) shrank to fingertip-impossible; at 8× it covered small layers
      w.style.setProperty('--vz', String(1 / (this.scale || 1)));
      FM.canvasZoom = this.scale;   // keep the legacy zoom readers (vb-zoom +/− steps) in step
      // Zoomed in = the comp covers more device pixels, so re-rasterise the preview at that
      // resolution rather than letting the browser stretch a project-sized bitmap (soft edges).
      if (FM.refreshPreviewScale) FM.refreshPreviewScale();
      const lbl = document.getElementById('vb-zlabel'); if (lbl) lbl.textContent = Math.round(this.scale * 100) + '%';
      const cz = document.getElementById('cv-zoom'); if (cz) cz.textContent = Math.round(this.scale * 100) + '%';
      update();
    },
    reset() { this.x = 0; this.y = 0; this.scale = 1; this.apply(); },
    isDefault() { return !this.x && !this.y && Math.abs(this.scale - 1) < 1e-3; },
  };

  function eventToProject(e) {
    const r = canvas.getBoundingClientRect();
    const sc = canvas.__fmRS || 1;
    // fraction across the canvas -> project units it spans -> plus the crop origin, so this stays
    // true whether the canvas holds the whole comp at 1:1, a supersampled comp, or a zoomed crop.
    return {
      x: (canvas.__fmOX || 0) + ((e.clientX - r.left) / r.width) * (canvas.width / sc),
      y: (canvas.__fmOY || 0) + ((e.clientY - r.top) / r.height) * (canvas.height / sc),
    };
  }

  // Use the canonical size (handles text / shape / null / media) so shapes get a correct,
  // correctly-sized selection box and hit region instead of a fixed 100×100.
  function layerSize(layer) {
    if (FM.layerSize) return FM.layerSize(layer);
    const m = FM.media.get(layer.id);
    return { w: m ? m.width : 100, h: m ? m.height : 100 };
  }

  // Accumulated PARENT transform of a layer (same root→leaf walk as the compositor's applyParentChain):
  // world = T + R(rot)·s·(parent-local). Without this, a parented layer's hit region / selection box /
  // drag mapping all sat at its raw local coords — detached from where the compositor actually drew it.
  function parentXform(layer, t) {
    const out = { x: 0, y: 0, rot: 0, s: 1 };
    if (!layer.parent) return out;
    const chain = [], seen = new Set([layer.id]);
    let pid = layer.parent;
    while (pid && !seen.has(pid)) { seen.add(pid); const pl = FM.scene.layers.find(l => l.id === pid); if (!pl) break; chain.push(pl); pid = pl.parent; }
    for (let i = chain.length - 1; i >= 0; i--) {
      const tr = chain[i].transform;
      const px = FM.evalProp(tr.x, t) || 0, py = FM.evalProp(tr.y, t) || 0;
      const pr = (FM.evalProp(tr.rotation, t) || 0) * Math.PI / 180;
      const ps = FM.evalProp(tr.scale, t) || 1;
      const c = Math.cos(out.rot), si = Math.sin(out.rot);
      out.x += out.s * (c * px - si * py);
      out.y += out.s * (si * px + c * py);
      out.rot += pr; out.s *= ps;
    }
    return out;
  }
  function worldToParentLocal(pt, px, py) {   // invert parentXform for a point
    const dx = px - pt.x, dy = py - pt.y, c = Math.cos(-pt.rot), si = Math.sin(-pt.rot);
    return { x: (dx * c - dy * si) / pt.s, y: (dx * si + dy * c) / pt.s };
  }

  function hitTest(layer, px, py, t) {
    const tr = layer.transform;
    if (layer.parent) { const q = worldToParentLocal(parentXform(layer, t), px, py); px = q.x; py = q.y; }
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

  // Screen position of the wrap's transform-origin ('center center') with NO transform applied:
  // current rect centre minus the current translate. Anchor for finger-fixed pinch/wheel zoom math.
  function vpOriginScreen() {
    const w = wrap || document.getElementById('canvas-wrap');
    const r = w.getBoundingClientRect();
    return { x: r.left + r.width / 2 - FM.viewport.x, y: r.top + r.height / 2 - FM.viewport.y };
  }

  function startPinch() {
    const q = [...vpPtrs.values()];
    vpPinch = {
      dist: Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y) || 1,
      midX: (q[0].x + q[1].x) / 2, midY: (q[0].y + q[1].y) / 2,
      scale: FM.viewport.scale, x: FM.viewport.x, y: FM.viewport.y,
      u: vpOriginScreen(),   // transform-origin in screen space → keeps the content UNDER the fingers
      // TWIST (Ezra: "when pinching to zoom you should be able to pitch and twist to change the angle
      // as well"). The angle of the line between the two fingers, so its CHANGE is the rotation.
      // vpPtrs is a Map and iterates in insertion order, so q[0]/q[1] mean the same finger here and
      // in every move — swap them and the angle would flip by 180° mid-gesture.
      ang0: Math.atan2(q[1].y - q[0].y, q[1].x - q[0].x),
      twisting: false,
    };
    // WITH A LAYER SELECTED the pinch resizes THAT LAYER instead of zooming the view (Ezra: "dragging
    // or pinching on the canvas won't affect the size or position of the canvas but the layer you have
    // selected"). Nothing selected — or a camera, which owns the view by design — keeps the old
    // view-zoom. Snapshot the starting scale once here, exactly as the corner-handle drag does, so
    // every move is an absolute write and the multiplicative shiftTransform converges.
    const sel = FM.selectedLayer(FM.scene);
    if (sel && sel.type !== 'camera' && !sel.locked) {
      vpPinch.layer = sel;
      vpPinch.startScale = FM.evalProp(sel.transform.scale, FM.time) || 0.0001;
      vpPinch.startRot = FM.evalProp(sel.transform.rotation, FM.time) || 0;
      // a group scales about its visible bounds centre, so its members don't fly off-frame —
      // same pivot the corner handle builds in startHandle
      if (sel.type === 'group' && FM.groupBounds) {
        // groupBounds is (layer, scene, t) — passing the id string made group.transform undefined and
        // threw, which left vpPinch live but pivot-less, so a group pinch scaled about the project's
        // top-left and flung it off-frame. It also returns a CENTRE-anchored box, so b.x IS the centre
        // (adding w/2 would land on the right edge) — same convention startHandle already relies on.
        const b = FM.groupBounds(sel, FM.scene, FM.time);
        if (b) vpPinch.pivot = { cx: b.x, cy: b.y,
                                 g0x: FM.evalProp(sel.transform.x, FM.time), g0y: FM.evalProp(sel.transform.y, FM.time) };
      }
    }
  }

  function startMove(e) {
    if (e.button !== 0) return;
    if (e.pointerType === 'touch') {
      if (vpPtrs.size >= 2 && !vpPtrs.has(e.pointerId)) return;   // a THIRD finger must not join (it froze the pinch and made zoom jump on lift)
      vpPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (vpPtrs.size === 2) {
        // second finger → pinch the VIEWPORT (zoom + pan) and cancel the single-finger drag so the
        // two never fight (a real layer move commits first, so undo still captures it).
        e.preventDefault();
        finishDrag();
        startPinch();
        return;
      }
    }
    if (drag) return;   // a drag from ANOTHER pointer is in flight — a stray finger must not hijack it
    if (FM.playing) FM.pause();   // editing while playing shifted animated layers by their own motion
    const p = eventToProject(e);
    const sel = FM.selectedLayer(FM.scene);
    if (sel && sel.type === 'camera') {   // camera selected → dragging anywhere pans the view (grab-the-scene)
      e.preventDefault();
      drag = { mode: 'campan', pointerId: e.pointerId, layer: sel, startP: p, zoom: FM.evalProp(sel.transform.scale, FM.time) || 1, rot: (FM.evalProp(sel.transform.rotation, FM.time) || 0) * Math.PI / 180, startX: FM.evalProp(sel.transform.x, FM.time), startY: FM.evalProp(sel.transform.y, FM.time) };
      return;
    }
    if (sel) {
      // A layer is selected: the press NEVER re-selects via topHit — wherever the finger lands, a drag
      // moves the SELECTED layer only. A stationary tap resolves on release (onUp): tap OFF the layer
      // deselects; re-tap ON it reopens the phone inspector sheet.
      e.preventDefault();
      // snapshot the align targets at GRAB time: recomputing per move fed the layer's own live-shifting
      // keyframe values back in as targets, so slow drags ratcheted in ~14px steps (self-snap)
      drag = { mode: 'move', pointerId: e.pointerId, layer: sel, startP: p, startX: FM.evalProp(sel.transform.x, FM.time), startY: FM.evalProp(sel.transform.y, FM.time), fromSelected: true,
               tx: FM.alignTargets ? FM.alignTargets(sel, 'x') : [FM.scene.project.width / 2, 0, FM.scene.project.width],
               ty: FM.alignTargets ? FM.alignTargets(sel, 'y') : [FM.scene.project.height / 2, 0, FM.scene.project.height] };
      if (sel.parent) { drag.pxf = parentXform(sel, FM.time); drag.tx = []; drag.ty = []; }   // parented: deltas map through the parent frame; world snap targets don't apply to local coords
      if (sel.type === 'group' && FM.groupBounds) {
        // a group's x/y is an OFFSET, not a position — snap its visible BOUNDS CENTRE to the
        // composition targets instead (offset 0 snapping to "centre 540" was meaningless)
        const gb = FM.groupBounds(sel, FM.scene, FM.time);
        if (gb) {
          drag.boundsOffX = gb.x - drag.startX; drag.boundsOffY = gb.y - drag.startY;
          const P2 = FM.scene.project;
          const kx = (sel.transform.x && sel.transform.x.kf) ? sel.transform.x.kf.map(k => k.v + drag.boundsOffX) : [];
          const ky = (sel.transform.y && sel.transform.y.kf) ? sel.transform.y.kf.map(k => k.v + drag.boundsOffY) : [];
          drag.tx = [P2.width / 2, 0, P2.width].concat(kx);    // kf OFFSETS shifted into bounds-centre space
          drag.ty = [P2.height / 2, 0, P2.height].concat(ky);
        }
      }
      return;
    }
    // NOTHING selected: a tap selects what's under it (resolved on release, so a drag never selects);
    // a DRAG grabs the whole player — pans FM.viewport (view-only; reset via canvas dialog / home).
    e.preventDefault();
    drag = { mode: 'viewpan', pointerId: e.pointerId, startP: p, sx: e.clientX, sy: e.clientY, vx: FM.viewport.x, vy: FM.viewport.y };
  }

  function startHandle(role) {
    return function (e) {
      e.preventDefault(); e.stopPropagation();
      const layer = FM.selectedLayer(FM.scene);
      if (!layer || layer.locked) return;   // lock means LOCKED — scale/rotate too, not just move
      if (drag) return;                     // another pointer's drag is live — don't overwrite it
      if (e.pointerType === 'touch') {
        // register in the pinch pointer cache like body touches — otherwise handle-finger + canvas-finger
        // silently became two independent drags instead of a pinch
        if (vpPtrs.size >= 2 && !vpPtrs.has(e.pointerId)) return;
        vpPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (vpPtrs.size === 2) { finishDrag(); startPinch(); return; }
      }
      if (FM.playing) FM.pause();   // scale/rotate during playback used a stale centre + drifted keyframes
      const p = eventToProject(e);
      let cx = FM.evalProp(layer.transform.x, FM.time), cy = FM.evalProp(layer.transform.y, FM.time);
      let pivot = null;
      if (layer.parent) { const w = parentXform(layer, FM.time); const c = Math.cos(w.rot), si = Math.sin(w.rot); const wx = w.x + w.s * (c * cx - si * cy), wy = w.y + w.s * (si * cx + c * cy); cx = wx; cy = wy; }   // measure the gesture about the layer's WORLD position
      if (layer.type === 'group' && FM.groupBounds) {
        // GROUPS: pivot about the visible BOUNDS CENTRE, not the group's transform origin — the
        // origin is (0,0) = the project's top-left corner, so rotating/scaling about it flung the
        // members clear off-frame. Each move compensates x/y so the box turns/scales in place.
        const gb = FM.groupBounds(layer, FM.scene, FM.time);
        if (gb) {
          pivot = { cx: gb.x, cy: gb.y,
                    g0x: FM.evalProp(layer.transform.x, FM.time) || 0,
                    g0y: FM.evalProp(layer.transform.y, FM.time) || 0 };
          cx = gb.x; cy = gb.y;   // finger distance/angle are measured from what the user SEES
        }
      }
      if (role === 'wrap') {
        // Measured along the layer's OWN x axis, so the column still tracks the finger on a rotated
        // layer. The distance is halved on the way in and doubled on the way out because the text is
        // laid out about its centre — one side handle moves both borders, which is what keeps the
        // column centred under the anchor instead of walking sideways as you drag.
        const rad = (FM.evalProp(layer.transform.rotation, FM.time) || 0) * Math.PI / 180;
        const sc0 = (FM.evalProp(layer.transform.scale, FM.time) || 1) *
                    (layer.transform.scaleX != null ? FM.evalProp(layer.transform.scaleX, FM.time) : 1) || 1;
        const cur = Number(layer.wrapWidth);
        drag = {
          mode: 'wrap', pointerId: e.pointerId, layer: layer, cx: cx, cy: cy, rad: rad, sc: sc0
        };
        // The handle already SITS on the border, so the column simply follows the finger — no offset
        // to carry. With no wrap set yet the handle sits at the text's natural width, so the first
        // drag starts from the border you can already see instead of jumping to some default.
        void cur;
      } else if (role === 'scale') {
        drag = { mode: 'scale', pointerId: e.pointerId, layer: layer, cx: cx, cy: cy, pivot: pivot, startScale: FM.evalProp(layer.transform.scale, FM.time) || 0.0001, startDist: Math.hypot(p.x - cx, p.y - cy) || 1 };
      } else {
        drag = { mode: 'rotate', pointerId: e.pointerId, layer: layer, cx: cx, cy: cy, pivot: pivot, startRot: FM.evalProp(layer.transform.rotation, FM.time), startAngle: Math.atan2(p.y - cy, p.x - cx) };
      }
    };
  }

  // ---- drag move / end ----
  function onMove(e) {
    if (e.pointerType === 'touch' && vpPtrs.has(e.pointerId)) {
      vpPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (vpPinch && vpPtrs.size === 2) {
        if (e.cancelable) e.preventDefault();
        const q = [...vpPtrs.values()];
        const d = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y);
        const s1 = Math.max(0.2, Math.min(8, vpPinch.scale * (d / vpPinch.dist)));
        // FINGER-ANCHORED zoom: keep the scene point that was under the finger midpoint UNDER the
        // midpoint (zooming about the canvas centre made content slide out from under the fingers).
        // screen(Q) = u + t + s·(Q − u)  ⇒  t' = mid − u − (s'/s0)·(mid0 − u − t0)
        if (vpPinch.layer) {
          // LAYER pinch: the finger separation ratio drives the layer's own scale. The view is left
          // completely alone, which also means none of the preview re-rasterising fires.
          const L = vpPinch.layer;
          const ratio = d / vpPinch.dist;
          const sc = Math.max(0.02, Math.round(vpPinch.startScale * ratio * 1000) / 1000);
          if (vpPinch.pivot) {   // keep a group's visible centre put while its members scale
            const k = sc / vpPinch.startScale, P = vpPinch.pivot;
            FM.shiftTransform(L, 'x', Math.round(P.cx + (P.g0x - P.cx) * k), FM.time);
            FM.shiftTransform(L, 'y', Math.round(P.cy + (P.g0y - P.cy) * k), FM.time);
          }
          FM.shiftTransform(L, 'scale', sc, FM.time);
          // …and the twist. Fingers always rotate a little while they pinch, so without a dead zone
          // every resize would also skew the layer a few degrees. Past 7° the twist LATCHES and the
          // threshold is subtracted from then on, so the angle starts moving from zero rather than
          // jumping by 7 the moment it engages.
          const ang = Math.atan2(q[1].y - q[0].y, q[1].x - q[0].x);
          let dDeg = ((((ang - vpPinch.ang0) * 180 / Math.PI) + 180) % 360 + 360) % 360 - 180;
          const DEAD = 7;
          if (!vpPinch.twisting && Math.abs(dDeg) > DEAD) vpPinch.twisting = true;
          if (vpPinch.twisting) {
            const eff = dDeg - Math.sign(dDeg) * DEAD;
            FM.shiftTransform(L, 'rotation', Math.round((vpPinch.startRot + eff) * 10) / 10, FM.time);
          }
          vpPinch.moved = true;
          FM.requestRender();
          if (FM.canvasEdit) FM.canvasEdit.update();
          return;
        }
        const midX = (q[0].x + q[1].x) / 2, midY = (q[0].y + q[1].y) / 2, u = vpPinch.u;
        FM.viewport.scale = s1;
        FM.viewport.x = midX - u.x - (s1 / vpPinch.scale) * (vpPinch.midX - u.x - vpPinch.x);
        FM.viewport.y = midY - u.y - (s1 / vpPinch.scale) * (vpPinch.midY - u.y - vpPinch.y);
        FM.viewport.apply();
        return;
      }
    }
    if (!drag) return;
    if (drag.pointerId != null && e.pointerId != null && e.pointerId !== drag.pointerId) return;   // only the OWNING pointer drives a drag
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
      // UN-ROTATE the finger delta, not just un-zoom it. The composite applies ctx.rotate(rot) to the
      // whole scene, so a screen-space drag has to come back through the camera's inverse rotation
      // before it can be written as camera x/y. Without it the scene moved off by exactly the camera
      // angle: measured with a 281px rightward drag, rot=0 gave (+281, 0) correctly, rot=45 gave
      // (+198, +198), rot=90 sent the scene straight DOWN, and rot=180 sent it BACKWARDS. The
      // parented-layer branch a few lines below already does this correctly; the camera never did.
      let fx = (p.x - drag.startP.x) / drag.zoom, fy = (p.y - drag.startP.y) / drag.zoom;
      if (drag.rot) {
        const c = Math.cos(-drag.rot), si = Math.sin(-drag.rot);
        const rx = fx * c - fy * si, ry = fx * si + fy * c;
        fx = rx; fy = ry;
      }
      const nx = drag.startX - fx;
      const ny = drag.startY - fy;
      FM.shiftTransform(L, 'x', Math.round(nx), FM.time);
      FM.shiftTransform(L, 'y', Math.round(ny), FM.time);
      FM.requestRender(); update(); return;
    }
    if (drag.mode === 'move') {
      let ddx = p.x - drag.startP.x, ddy = p.y - drag.startP.y;
      if (drag.pxf) {   // parented layer: a world-space finger delta lands in the PARENT's frame (un-rotate, un-scale)
        const c = Math.cos(-drag.pxf.rot), si = Math.sin(-drag.pxf.rot);
        const rx = (ddx * c - ddy * si) / drag.pxf.s, ry = (ddx * si + ddy * c) / drag.pxf.s;
        ddx = rx; ddy = ry;
      }
      let nx = drag.startX + ddx;
      let ny = drag.startY + ddy;
      const thr = 14 / dispScale();
      // snap to centre / edges AND this layer's keyframe positions — from the GRAB-time snapshot
      // (live targets tracked the drag itself and ratcheted it in ~14px steps). Groups snap their
      // visible bounds centre (offX/offY translate between the offset and what the user sees).
      // NO SNAPPING ON THE CANVAS (Ezra: "the canvas has snapping when you touch to drag stuff, while
      // the touch pad thing to move stuff does not, it should be the other way around"). A finger drag
      // is the coarse gesture — it should go exactly where you put it. The snap targets this used to
      // apply (centre, edges, and this layer's own earlier keyframe positions) have moved to the Move &
      // Transform trackpad, which is the precision control. drag.tx/ty are still snapshotted at grab
      // time because the trackpad reads the same helper.
      showGuides(null, null);
      // shiftTransform (not setTransform): a canvas drag moves the WHOLE animation, never adds a keyframe
      FM.shiftTransform(L, 'x', Math.round(nx), FM.time);
      FM.shiftTransform(L, 'y', Math.round(ny), FM.time);
    } else if (drag.mode === 'wrap') {
      // Project the finger onto the layer's own x axis, undo the layer's scale so the number stored is
      // in the same project px the renderer measures in, and double it (the handle is one border of a
      // centred column). Not a keyframable transform — wrapWidth is layout, so it is set directly and
      // committed on pointer-up like any other one-shot edit.
      const dx = p.x - drag.cx, dy = p.y - drag.cy;
      const local = Math.abs(dx * Math.cos(drag.rad) + dy * Math.sin(drag.rad)) / (Math.abs(drag.sc) || 1);
      L.wrapWidth = Math.max(20, Math.round(local * 2));
    } else if (drag.mode === 'scale') {
      const s = Math.max(0.02, Math.round(drag.startScale * (Math.hypot(p.x - drag.cx, p.y - drag.cy) / drag.startDist) * 1000) / 1000);
      if (drag.pivot) {
        // scale about the bounds centre C: members sit at G + s·m, so G' = C + (s/s0)·(G0 − C)
        const k = s / drag.startScale, pv = drag.pivot;
        FM.shiftTransform(L, 'x', Math.round(pv.cx + k * (pv.g0x - pv.cx)), FM.time);
        FM.shiftTransform(L, 'y', Math.round(pv.cy + k * (pv.g0y - pv.cy)), FM.time);
      }
      FM.shiftTransform(L, 'scale', s, FM.time);
    } else if (drag.mode === 'rotate') {
      const deg = drag.startRot + (Math.atan2(p.y - drag.cy, p.x - drag.cx) - drag.startAngle) * 180 / Math.PI;
      if (drag.pivot) {
        // rotate about the bounds centre C: G' = C + R(Δ)·(G0 − C), so the visible box turns in place
        const d = (deg - drag.startRot) * Math.PI / 180, pv = drag.pivot;
        const c = Math.cos(d), si = Math.sin(d), vx = pv.g0x - pv.cx, vy = pv.g0y - pv.cy;
        FM.shiftTransform(L, 'x', Math.round(pv.cx + c * vx - si * vy), FM.time);
        FM.shiftTransform(L, 'y', Math.round(pv.cy + si * vx + c * vy), FM.time);
      }
      FM.shiftTransform(L, 'rotation', Math.round(deg * 10) / 10, FM.time);
    }
    FM.requestRender();
    update();
    // keep the Move & Transform value boxes tracking the canvas drag LIVE (they used to only catch up
    // on release, so a canvas drag looked like it wasn't touching the M&T numbers). (Ezra)
    if (FM.inspector && FM.inspector.syncTransform) FM.inspector.syncTransform();
  }

  function onUp(e) {
    if (e && vpPtrs.has(e.pointerId)) {
      vpPtrs.delete(e.pointerId);
      if (vpPtrs.size < 2) {
        // A view zoom is runtime-only and deliberately uncommitted; a LAYER pinch changed the scene
        // and has to be undoable like any other transform edit.
        if (vpPinch && vpPinch.layer && vpPinch.moved) {
          if (FM.inspector) FM.inspector.refresh();
          if (FM.timeline) FM.timeline.rebuild();
          if (FM.history) FM.history.commit();
        }
        vpPinch = null;
      }
    }
    if (!drag) return;
    if (drag.pointerId != null && e && e.pointerId != null && e.pointerId !== drag.pointerId) return;   // another finger lifting must not end this drag
    const d = drag;
    drag = null;
    showGuides(null, null);
    if (!d.moved) {
      // stationary tap (≤ threshold) — resolve the selection intent now that we know it wasn't a drag
      if (d.mode === 'viewpan') {
        // Nothing selected → the canvas NEVER selects (Ezra): it's purely the player surface —
        // tap does nothing, drag pans, pinch/wheel zooms. Layers are picked from the timeline.
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
  // history.undo/redo call this first: a camera zoom's trailing 400ms commit hadn't landed yet, so a
  // quick Cmd+Z stepped over BOTH the zoom and the previous edit. Flushing commits the zoom first.
  FM.flushPendingCommit = function () {
    if (wheelCommit) { clearTimeout(wheelCommit); wheelCommit = null; if (FM.history) FM.history.commit(); }
  };
  function onWheel(e) {
    const sel = FM.selectedLayer(FM.scene);
    if (!sel) {
      // nothing selected → the wheel zooms the VIEWPORT about the CURSOR (the point under the pointer
      // stays put — same anchored math as the pinch; view-only, no undo)
      e.preventDefault();
      const v = FM.viewport;
      const s0 = v.scale, s1 = Math.max(0.2, Math.min(8, s0 * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
      if (s1 !== s0) {
        const u = vpOriginScreen();
        v.x = e.clientX - u.x - (s1 / s0) * (e.clientX - u.x - v.x);
        v.y = e.clientY - u.y - (s1 / s0) * (e.clientY - u.y - v.y);
        v.scale = s1;
        v.apply();
      }
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
    if (!layer || layer.type === 'camera' || !FM.isLayerVisibleAt(layer, t)) { box.style.display = 'none'; if (anchorDot) anchorDot.style.display = 'none'; return; }   // camera pans globally — no box
    const tr = layer.transform;
    let sc = FM.evalProp(tr.scale, t);
    let cx = FM.evalProp(tr.x, t), cy = FM.evalProp(tr.y, t);
    let rot = FM.evalProp(tr.rotation, t);
    if (layer.parent) {   // parented: the box must sit where the COMPOSITOR draws the layer (world), not at its raw local coords
      const w = parentXform(layer, t);
      const c = Math.cos(w.rot), si = Math.sin(w.rot);
      const wx = w.x + w.s * (c * cx - si * cy), wy = w.y + w.s * (si * cx + c * cy);
      cx = wx; cy = wy; rot += w.rot * 180 / Math.PI; sc *= w.s;
    }
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
    // The wrap handles are text-only — on a shape or a video there is no column for them to set.
    box.classList.toggle('sb-has-wrap', layer.type === 'text');
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
    /* THE SECTION THAT OWNS THE CANVAS TAKES THE BOX DOWN (queue 205). Move & Transform shows the
     * anchor instead — the thing everything rotates and scales around, and previously invisible
     * unless you happened to be in the anchor sub-mode — and Edit Points already draws its own
     * handles, so the outline on top of them is pure clutter. One rule, asked once, rather than two
     * conditions that drift apart. Applied AFTER the transform above so the box keeps its position
     * for the moment it comes back. */
    const owns = (FM.inspector && FM.inspector.ownsCanvas) ? FM.inspector.ownsCanvas() : null;
    if (owns) box.style.display = 'none';
    // ANCHOR MODE: show the pivot on the canvas (Ezra: "when placing the anchor for movement it should
    // show you where it is on the canvas"). Placing it blind was the whole problem — you nudged a pad,
    // the layer did not move, and the only way to find out where the pivot had landed was to scale the
    // layer and watch which way it went. transform.x/y IS the anchor, so this is the box's own
    // transform-origin in wrap pixels; nothing new to compute and nothing that can disagree with it.
    if (anchorDot) {
      /* Shown for the WHOLE of Move & Transform now, not just its anchor sub-mode (queue 205) — it
       * replaces the outline he asked to hide, so it has to be there the moment the section opens.
       * Groups still opt out: a group has no pivot of its own to show. */
      const showA = (FM._mtMode === 'anchor' || owns === 'transform') && layer.type !== 'group';
      anchorDot.style.display = showA ? 'block' : 'none';
      if (showA) { anchorDot.style.left = (cx * ds) + 'px'; anchorDot.style.top = (cy * ds) + 'px'; }
    }
  }

  // Show the alignment guide lines from OUTSIDE a canvas drag (used by Move & Transform when its X/Y
  // scrub snaps to an align target). Auto-hides shortly after the last snap so it never lingers.
  let _alignHide = 0;
  FM.showAlignGuide = function (gx, gy) {
    showGuides(gx, gy);
    clearTimeout(_alignHide);
    if (gx != null || gy != null) _alignHide = setTimeout(() => showGuides(null, null), 650);
  };

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
      // TEXT ONLY: the two side handles set where the text wraps (v5.40). Ezra: "you should be able to
      // drag the border of the text to decide when the text wraps and stops going on to the right."
      // Deliberately NOT scale handles — the corners already scale, and a side handle that stretched
      // the glyphs is the thing every editor gets shouted at for.
      ['w', 'e'].forEach(pos => {
        const h = document.createElement('div');
        h.className = 'sb-handle sb-wrap sb-' + pos;
        h.title = 'Drag to set where the text wraps — double-click to turn wrapping off';
        h.addEventListener('pointerdown', startHandle('wrap'));
        // A wrap you can only ever tighten is a trap: once you have dragged one and made a few more
        // edits, undo is no longer a way back to "no wrapping at all".
        h.addEventListener('dblclick', ev => {
          ev.preventDefault(); ev.stopPropagation();
          const L = FM.selectedLayer(FM.scene);
          if (!L || L.type !== 'text' || L.locked) return;
          L.wrapWidth = 0;
          FM.requestRender();
          if (FM.inspector) FM.inspector.refresh();
          if (FM.history) FM.history.commit();
        });
        box.appendChild(h);
      });
      const rotH = document.createElement('div');
      rotH.className = 'sb-handle sb-rot';
      rotH.addEventListener('pointerdown', startHandle('rotate'));
      box.appendChild(rotH);
      wrap.appendChild(box);
      guideV = document.createElement('div'); guideV.className = 'snap-guide v'; guideV.style.display = 'none';
      guideH = document.createElement('div'); guideH.className = 'snap-guide h'; guideH.style.display = 'none';
      // The pivot marker for Anchor mode. transform.x/y IS the anchor point, so it needs no maths of
      // its own — it goes exactly where the box's transform-origin already is.
      anchorDot = document.createElement('div'); anchorDot.className = 'anchor-dot'; anchorDot.style.display = 'none';
      wrap.appendChild(guideV); wrap.appendChild(guideH); wrap.appendChild(anchorDot);
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
