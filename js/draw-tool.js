/* FreeMotion — Freehand & Vector drawing tools (Alight-Motion-style).
 * Freehand: press-drag on the canvas → a brush-stroke path layer (open, stroked).
 * Vector:   tap anchor points → tap Done (or tap near the first point) → a filled polygon layer.
 * Both create a shape:'path' layer (see FM.addPathLayer / traceShapePath).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  var overlay = null, octx = null, bar = null, drawing = false, erasing = false;
  var userPickedColor = false;   // set once he moves the swatch himself — see the listener and startDraw
  // cursor: where the NEXT vector point will land (project coords). The trackpad moves it, "Add point"
  // commits it. snapX/snapY hold the co-ordinate it locked onto, so the guides can be drawn.
  FM.drawTool = { active: false, mode: null, points: [], stroke: 8, color: '#ffffff', cursor: null, snapX: null, snapY: null };

  function preview() { return document.getElementById('preview'); }
  function wrap() { return document.getElementById('canvas-wrap'); }

  /* The preview canvas is NOT 1:1 with the project. It is supersampled when you zoom in, it may hold
   * only the visible crop, and since the preview-resolution work it is usually SMALLER than the comp
   * (a 1080-wide project painted into ~530 canvas pixels). The project extent it covers is
   * canvas.width / __fmRS starting at __fmOX — never canvas.width starting at 0.
   * These two functions used the raw backing size, so every point a stroke recorded was scaled by the
   * render scale: at rs 0.49 a tap at the middle of the comp was stored at a quarter of the way in.
   * Same maths as canvas-edit.js eventToProject/projSpan — points are project units everywhere. */
  function projSpan() { var c = preview(); return (c.width / (c.__fmRS || 1)) || (FM.scene.project.width || 1); }
  function toProject(cx, cy) {
    var c = preview(), r = c.getBoundingClientRect(), sc = c.__fmRS || 1;
    return [
      (c.__fmOX || 0) + ((cx - r.left) / r.width) * (c.width / sc),
      (c.__fmOY || 0) + ((cy - r.top) / r.height) * (c.height / sc),
    ];
  }
  // CSS px per PROJECT px.
  function dispScale() { var c = preview(), r = c.getBoundingClientRect(); return (r.width / projSpan()) || 1; }
  // The overlay covers the CANVAS, which may start part-way into the comp — so a project point has to
  // have the crop origin taken back off before it is drawn. Zero on an uncropped preview.
  function ox() { var c = preview(); return c.__fmOX || 0; }
  function oy() { var c = preview(); return c.__fmOY || 0; }

  function syncOverlay() {
    var c = preview(), w = wrap();
    if (!c || !w || !overlay) return;
    var cr = c.getBoundingClientRect(), wr = w.getBoundingClientRect();
    /* THE OVERLAY IS PLACED IN THE WRAPPER'S OWN SPACE, NOT IN SCREEN SPACE (v8.00, queue 165.3).
     * #draw-overlay lives inside #canvas-wrap, which is the element the viewport transform is applied
     * to — so its CSS box is in the wrapper's LOCAL coordinates while getBoundingClientRect() answers in
     * SCREEN coordinates. Feeding one into the other applied the zoom twice, which is the "overlay lays
     * out in screen px — a zoomed viewport double-scales it" that startDraw's reset was written to dodge.
     * Measured at 2x before this: overlay 984x1501 against a 492x751 canvas — exactly double.
     * `k` is read off the WRAPPER (its rendered width against its layout width) rather than from
     * FM.viewport.scale, so it stays right whatever applies the transform and cannot drift from a second
     * source of truth.
     * Nothing else needs touching, and that is worth stating because it is not obvious: the backing
     * store stays at cr.width * dpr (SCREEN resolution, so it is sharp when zoomed in), and a CSS box of
     * cr.width/k renders back to exactly cr.width on screen — so one unit under the dpr transform below
     * is still one SCREEN css pixel, which is the unit dispScale() and redraw() already work in. */
    var k = (w.offsetWidth && wr.width) ? (wr.width / w.offsetWidth) : 1;
    if (!(k > 0) || !isFinite(k)) k = 1;
    overlay.style.left = ((cr.left - wr.left) / k) + 'px';
    overlay.style.top = ((cr.top - wr.top) / k) + 'px';
    overlay.style.width = (cr.width / k) + 'px';
    overlay.style.height = (cr.height / k) + 'px';
    var dpr = window.devicePixelRatio || 1;
    overlay.width = Math.max(1, Math.round(cr.width * dpr));
    overlay.height = Math.max(1, Math.round(cr.height * dpr));
    octx = overlay.getContext('2d');
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* WHERE THE TOOLBAR SHOULD SIT (queue 513). Ezra: "The sketching menu on PC looks really bad and,
       like, bugged." Measured at 1440x860: the canvas ended at y=524 and the bar was pinned to the
       window bottom at y=792 — **268px of empty black between the tools and the thing they act on**,
       which is the "bugged" he means; it reads as a broken layout rather than a design.
       (Also checked and found FINE, so nobody re-derives it: the drawing SURFACE is not mis-sized. The
       overlay measured 289x514 against a 289x514 canvas — exactly right.)
       The canvas's own bottom edge is published here because this function already measures it and
       already runs on every layout change the overlay has to follow. The phone keeps the window-bottom
       pin: there the canvas nearly fills the screen, so the two are the same place anyway. */
    try { document.documentElement.style.setProperty('--fm-canvas-bottom', Math.round(cr.bottom) + 'px'); } catch (e) {}
  }

  function redraw() {
    if (!octx) return;
    var s = dispScale(), OX = ox(), OY = oy();   // project point -> overlay CSS px: (p - crop origin) * scale
    octx.clearRect(0, 0, overlay.width, overlay.height);
    var pts = FM.drawTool.points;
    if (!pts.length) { drawCursor(s); return; }   // the cursor exists BEFORE the first point — that is the point of it
    octx.lineJoin = 'round'; octx.lineCap = 'round';
    octx.strokeStyle = FM.drawTool.color;
    octx.lineWidth = Math.max(1.5, FM.drawTool.stroke * s);
    octx.beginPath();
    pts.forEach(function (p, i) { var x = (p[0] - OX) * s, y = (p[1] - OY) * s; if (i === 0) octx.moveTo(x, y); else octx.lineTo(x, y); });
    if (FM.drawTool.mode === 'vector' && pts.length > 2) { octx.save(); octx.setLineDash([6, 5]); octx.lineWidth = 2; octx.strokeStyle = 'rgba(255,255,255,.55)'; octx.lineTo((pts[0][0] - OX) * s, (pts[0][1] - OY) * s); octx.stroke(); octx.restore(); octx.beginPath(); pts.forEach(function (p, i) { var x = (p[0] - OX) * s, y = (p[1] - OY) * s; if (i === 0) octx.moveTo(x, y); else octx.lineTo(x, y); }); }
    octx.stroke();
    if (FM.drawTool.mode === 'vector') {   // anchor dots
      octx.fillStyle = FM.drawTool.color;
      pts.forEach(function (p, i) { octx.beginPath(); octx.arc((p[0] - OX) * s, (p[1] - OY) * s, i === 0 ? 6 : 4.5, 0, 6.2832); octx.fill(); if (i === 0) { octx.strokeStyle = '#fff'; octx.lineWidth = 2; octx.stroke(); } });
    }
    drawCursor(s);
  }

  // The cursor is where "Add point" will drop an anchor: a ring with a crosshair, plus a dashed rubber
  // band back to the last point so you can see the segment you are about to commit. When it locks onto
  // another point's row or column, that alignment is drawn right across the frame — the whole reason
  // for snapping is to build square corners and level edges, and you have to SEE the line to trust it.
  function drawCursor(s) {
    var t = FM.drawTool;
    if (t.mode !== 'vector' || !t.cursor || !octx) return;
    var OX = ox(), OY = oy();
    var cx = (t.cursor[0] - OX) * s, cy = (t.cursor[1] - OY) * s, W = overlay.width, H = overlay.height;
    octx.save();
    if (t.snapX != null || t.snapY != null) {
      octx.strokeStyle = 'rgba(41,217,187,.85)'; octx.lineWidth = 1; octx.setLineDash([5, 4]);
      if (t.snapX != null) { octx.beginPath(); octx.moveTo(cx, 0); octx.lineTo(cx, H); octx.stroke(); }
      if (t.snapY != null) { octx.beginPath(); octx.moveTo(0, cy); octx.lineTo(W, cy); octx.stroke(); }
      octx.setLineDash([]);
    }
    var pts = t.points;
    if (pts.length) {   // rubber band from the last anchor to the cursor
      octx.strokeStyle = 'rgba(255,255,255,.5)'; octx.lineWidth = 1.5; octx.setLineDash([4, 4]);
      octx.beginPath(); octx.moveTo((pts[pts.length - 1][0] - OX) * s, (pts[pts.length - 1][1] - OY) * s); octx.lineTo(cx, cy); octx.stroke();
      octx.setLineDash([]);
    }
    var locked = t.snapX != null || t.snapY != null;
    octx.strokeStyle = locked ? '#29d9bb' : '#ffffff'; octx.lineWidth = 2;
    octx.beginPath(); octx.arc(cx, cy, 9, 0, 6.2832); octx.stroke();
    octx.beginPath(); octx.moveTo(cx - 14, cy); octx.lineTo(cx - 4, cy); octx.moveTo(cx + 4, cy); octx.lineTo(cx + 14, cy);
    octx.moveTo(cx, cy - 14); octx.lineTo(cx, cy - 4); octx.moveTo(cx, cy + 4); octx.lineTo(cx, cy + 14); octx.stroke();
    octx.restore();
  }

  // Snap the cursor to the ROW or COLUMN of any point already placed — independently, so a corner can
  // line up with one neighbour horizontally and a different one vertically (Ezra: "grid snapping to
  // the other points"). Threshold is expressed in finger pixels and converted, so it feels the same
  // however far the preview is zoomed.
  function snapCursor() {
    var t = FM.drawTool, c = t.cursor;
    t.snapX = t.snapY = null;
    if (!c || !t.points.length) return;
    var thr = 9 / Math.max(1e-6, dispScale());   // ~9 screen px of stickiness, in project units
    var bx = thr, by = thr;
    t.points.forEach(function (p) {
      var dx = Math.abs(c[0] - p[0]); if (dx < bx) { bx = dx; t.snapX = p[0]; }
      var dy = Math.abs(c[1] - p[1]); if (dy < by) { by = dy; t.snapY = p[1]; }
    });
    if (t.snapX != null) c[0] = t.snapX;
    if (t.snapY != null) c[1] = t.snapY;
  }

  function setCursor(x, y) {
    var P = FM.scene.project;
    FM.drawTool.cursor = [Math.max(0, Math.min(P.width, x)), Math.max(0, Math.min(P.height, y))];
    snapCursor();
  }

  /* KEEP THE CANVAS ON SCREEN — one copy, used by BOTH the wheel pan and the two-finger gesture.
     Lifted out of the wheel handler when the pinch arrived (queue 165.3) rather than copied into it: a
     second copy of a clamp is the exact shape of three separate bugs found this week (a stale frame-rate
     mirror, a duplicated default, a dead preset block). Its reasoning is unchanged from v8.03 — without
     it, twenty-five flicks put the canvas at top -5025 with no way back, because the ⛶ view bar that
     owns zoom and fit is hidden while drawing. */
  function keepCanvasOnScreen(c) {
    var KEEP = 90, r = c.getBoundingClientRect(), fx = 0, fy = 0;
    if (r.right < KEEP) fx = KEEP - r.right;
    else if (r.left > window.innerWidth - KEEP) fx = (window.innerWidth - KEEP) - r.left;
    if (r.bottom < KEEP) fy = KEEP - r.bottom;
    else if (r.top > window.innerHeight - KEEP) fy = (window.innerHeight - KEEP) - r.top;
    if (fx || fy) { FM.viewport.x += fx; FM.viewport.y += fy; FM.viewport.apply(); }
  }

  /* ---- TWO FINGERS PAN AND ZOOM WHILE DRAWING (queue 165.3) --------------------------------------
   * Ezra: *"another option that lets you grab the screen and zoom in or out so you can do more detailed
   * drawing."* v8.00 kept the zoom you already had and v8.01 stopped the tool resetting it, but the
   * GESTURE was never built — the wheel was the only way to pan, which is no way at all on a phone.
   * WORSE THAN MISSING, AND THIS IS THE REAL BUG: measured before this, a two-finger pinch on the
   * overlay did not merely fail to zoom — the second finger ran through the ordinary drawing path and
   * COMMITTED A STROKE. Pinching to zoom left ink on the drawing. `FM.viewport` came back unchanged and
   * `FM.scene.layers` went 0 -> 1.
   * The maths is canvas-edit's `startPinch`, anchored on the finger midpoint so the canvas stays under
   * the fingers, minus its layer-resize branch — nothing is selected in drawing mode. */
  var dPtrs = new Map(), dPinch = null;
  function drawOriginScreen() {
    var w = wrap() || document.getElementById('canvas-wrap');
    var r = w.getBoundingClientRect();
    return { x: r.left + r.width / 2 - FM.viewport.x, y: r.top + r.height / 2 - FM.viewport.y };
  }
  function beginDrawPinch() {
    var q = [];
    dPtrs.forEach(function (v) { q.push(v); });
    if (q.length < 2) return;
    /* THROW THE IN-FLIGHT STROKE AWAY — do not commit it. The first finger has already started drawing
       by the time the second lands, and treating that as a stroke is what put ink on the canvas every
       time he tried to zoom. */
    drawing = false; erasing = false;
    FM.drawTool.points = [];
    redraw();
    dPinch = {
      dist: Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y) || 1,
      midX: (q[0].x + q[1].x) / 2, midY: (q[0].y + q[1].y) / 2,
      scale: FM.viewport.scale, x: FM.viewport.x, y: FM.viewport.y,
      u: drawOriginScreen(),
    };
  }
  function moveDrawPinch() {
    if (!dPinch) return;
    var q = [];
    dPtrs.forEach(function (v) { q.push(v); });
    if (q.length < 2) return;
    var d = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y);
    var mx = (q[0].x + q[1].x) / 2, my = (q[0].y + q[1].y) / 2;
    var s1 = Math.max(0.2, Math.min(8, dPinch.scale * (d / dPinch.dist)));
    // screen(Q) = u + t + s·(Q − u)  ⇒  t' = mid − u − (s'/s0)·(mid0 − u − t0)
    var k = s1 / dPinch.scale;
    FM.viewport.scale = s1;
    FM.viewport.x = mx - dPinch.u.x - k * (dPinch.midX - dPinch.u.x - dPinch.x);
    FM.viewport.y = my - dPinch.u.y - k * (dPinch.midY - dPinch.u.y - dPinch.y);
    FM.viewport.apply();
    var c = preview();
    if (c) keepCanvasOnScreen(c);
    syncOverlay(); redraw();
  }

  function onDown(e) {
    if (!FM.drawTool.active) return;
    if (e.target !== overlay && e.target !== preview()) return;
    e.preventDefault(); e.stopPropagation();
    /* Track TOUCH pointers only. A mouse or pen never makes a second one, and treating them as
       gesture fingers would arm a pinch that can never be released. */
    if (e.pointerType === 'touch') {
      if (dPtrs.size >= 2 && !dPtrs.has(e.pointerId)) return;   // a third finger must not join
      dPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dPtrs.size === 2) { beginDrawPinch(); return; }
    }
    var p = toProject(e.clientX, e.clientY);
    if (FM.drawTool.mode === 'freehand') {
      // ERASE (queue 165.2) takes the same gesture the brush does — press, and drag over anything else
      // you want gone. It is a MODE, not a second meaning for one finger, which is the same reason the
      // pan/zoom point in that entry has to be one too.
      if (FM.drawTool.erasing) {
        erasing = true; eraseAt(p);
        try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
        return;
      }
      drawing = true; FM.drawTool.points = [p]; redraw();
      try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
    } else {   // vector: tap adds an anchor; tapping near the first anchor closes
      var pts = FM.drawTool.points, s = dispScale();
      if (pts.length > 2) {
        var d = Math.hypot((p[0] - pts[0][0]) * s, (p[1] - pts[0][1]) * s);
        if (d < 14) { finish(); return; }
      }
      // Tapping still drops a point straight away — the trackpad is the PRECISE route, not a
      // replacement for the quick one. The tap runs through the same snapping, and parks the cursor
      // on what it just placed, so you can carry straight on nudging from there.
      setCursor(p[0], p[1]);
      pts.push(FM.drawTool.cursor.slice()); redraw(); updateBar();
    }
  }
  function onMove(e) {
    if (e.pointerType === 'touch' && dPtrs.has(e.pointerId)) {
      dPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dPinch) { moveDrawPinch(); return; }
    }
    if (FM.drawTool.active && erasing && FM.drawTool.mode === 'freehand') { eraseAt(toProject(e.clientX, e.clientY)); return; }
    if (!FM.drawTool.active || !drawing || FM.drawTool.mode !== 'freehand') return;
    var p = toProject(e.clientX, e.clientY), pts = FM.drawTool.points, last = pts[pts.length - 1], s = dispScale();
    if (Math.hypot((p[0] - last[0]) * s, (p[1] - last[1]) * s) < 2.5) return;   // min spacing
    pts.push(p); redraw();
  }
  // Lifting the finger ends a STROKE, not the session. Ezra, four times: "free hand drawing is still
  // fucked." This was the whole of it — onUp called finish(), and finish() calls stop(), which tears
  // the drawing mode down: overlay hidden, bar hidden, stage shrunk back. So you got exactly ONE
  // stroke per visit to the tool, and because committing a layer selects it, the phone then threw a
  // full-screen inspector sheet over the canvas so you could not even see what you had drawn. Now a
  // stroke is committed and the tool stays armed for the next one; Done is how you leave.
  function onUp(e) {
    if (e && e.pointerType === 'touch' && dPtrs.has(e.pointerId)) {
      dPtrs.delete(e.pointerId);
      /* The gesture ends when a finger leaves, and the REMAINING finger must not carry on drawing —
         lifting one of two fingers should not start a stroke from wherever the other one happens to be. */
      if (dPinch && dPtrs.size < 2) { dPinch = null; drawing = false; FM.drawTool.points = []; redraw(); return; }
    }
    if (erasing) { erasing = false; return; }
    if (!FM.drawTool.active || FM.drawTool.mode !== 'freehand' || !drawing) return;
    drawing = false;
    commitStroke();
  }

  // Commit the current freehand stroke as its own layer and clear the buffer, staying in draw mode.
  function commitStroke() {
    var t = FM.drawTool;
    if (t.mode !== 'freehand' || t.points.length < 2) { redraw(); return false; }
    /* ONE LAYER PER DRAWING, not per stroke (queue 167). Ezra: "when you draw with free hand drawing it
     * creates multiple layers, it should all be inside the one drawing you just made not keep creating
     * more." Nine strokes made nine timeline rows — which is also what left him unable to scroll the
     * timeline at all (#166), since every row was a clip and there was no empty lane to swipe on.
     * The first stroke of a session creates the layer; every stroke after it is appended and the layer
     * is re-fitted around the union of them all. The renderer already supported this — layer.subs has
     * been a multi-subpath field all along; nothing was ever writing more than one into it. */
    var sub = smoothFreehand(t.points);
    pushHistory();            // snapshot BEFORE the change, and drawing ends the branch you undid away from
    sessionSubs = sessionSubs.concat([sub]);
    var layer = sessionLayerId ? FM.layerById(FM.scene, sessionLayerId) : null;
    if (!layer) {
      layer = FM.addPathLayer(sub, { closed: false, name: 'Sketch', color: t.color, stroke: t.stroke });
      if (layer) { sessionLayerId = layer.id; strokes.push(layer.id); }
    } else if (FM.refitPathLayer) {
      FM.refitPathLayer(layer, sessionSubs);
      if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();   // the thumbnail has to follow the drawing
      /* ⚠️ AND THE CANVAS. THIS LINE IS THE WHOLE OF QUEUE 514 (queue 514). Ezra, twice: "when you draw a
         second stroke, it just doesn't show up until you actually finish the drawing so you can't see
         what you're drawing, and it's just really bugging, broken, and bad".
         The asymmetry is the bug. The FIRST stroke of a session goes through `FM.addPathLayer`, which
         ends with `refreshAll()` and therefore repaints — so stroke one appears. Every stroke after it
         takes this branch, and `refitPathLayer` is pure data mutation: it rewrites `layer.subs` and
         returns. The timeline was told; the canvas never was. And the line below clears the overlay the
         live stroke was being drawn on, so the moment you lift the pen the stroke vanishes from the
         overlay and has not yet been painted anywhere else — invisible until something unrelated forced
         a render, which is what "until you actually finish" was.
         The undo path at the bottom of this file already did both (`refreshAll` + `requestRender`), which
         is why undoing a stroke redrew correctly while drawing one did not. */
      if (FM.requestRender) FM.requestRender();
      /* ⚠️ AND THE APP'S HISTORY HAS TO HEAR ABOUT IT TOO (queue 684) — the same asymmetry as queue 514
       * one layer down. The FIRST stroke goes through `FM.addPathLayer`, which ends with
       * `refreshAll()` AND `FM.history.commit()`. Every stroke after it takes this branch, and
       * `refitPathLayer` is pure data mutation: it rewrites layer.subs and returns.
       * 514 fixed the half of that which stopped the canvas repainting. The other half was never
       * noticed: nothing committed, so the app's most recent snapshot stayed the one taken when stroke
       * ONE was added. Draw a five-stroke sketch, press Done, then undo anything at all, and he lands
       * on a sketch with only its first stroke — the other four gone, with no way back.
       * The draw tool's own stroke-undo (histPast above) is unaffected; that is a separate, local
       * stack for undoing WHILE drawing, and it was never the thing at risk. */
      if (FM.history) FM.history.commit();
    }
    t.points = [];
    // Committing a layer SELECTS it, and on a phone a selection opens the inspector sheet over the
    // whole screen — which is the thing that made this unusable. Stay deselected while drawing; the
    // last stroke is selected on the way out (see finish()).
    if (FM.selectLayer) FM.selectLayer(null);
    if (octx) octx.clearRect(0, 0, overlay.width, overlay.height);
    redraw(); updateBar();
    return true;
  }

  /* A freehand stroke was committed as its RAW samples, every one of them a hard corner, so the
     result was a faceted polyline that read as a plotter line rather than a drawn one — Ezra, three
     times: "Free hand draw is still buggy and looks like shit."
     Two passes fix that. First simplify (Ramer-Douglas-Peucker): a stroke samples every 2.5 device
     pixels, so a quick arc arrives as a few hundred points whose jitter IS the wobble you can see.
     Then mark the survivors smooth — the path format already supports [u,v,1] for "curve through
     this point", and nothing was ever setting it. The two ENDS stay hard so the stroke starts and
     stops crisply instead of hooking. */
  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    var first = 0, last = pts.length - 1, keep = new Array(pts.length).fill(false);
    keep[first] = keep[last] = true;
    var stack = [[first, last]];
    while (stack.length) {
      var seg = stack.pop(), a = seg[0], b = seg[1];
      var ax = pts[a][0], ay = pts[a][1], bx = pts[b][0], by = pts[b][1];
      var dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      var far = -1, fi = -1;
      for (var i = a + 1; i < b; i++) {
        // perpendicular distance to the chord (a degenerate chord falls back to plain distance)
        var d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
        if (d > far) { far = d; fi = i; }
      }
      if (far > eps && fi > 0) { keep[fi] = true; stack.push([a, fi], [fi, b]); }
    }
    return pts.filter(function (_, i) { return keep[i]; });
  }
  /* A weighted moving average along the polyline. Endpoints are pinned so the stroke still starts and
     stops exactly where the finger did. The 1-2-3-2-1 kernel is wide enough to swallow hand tremor
     (a few px of high-frequency wobble) while barely touching the low-frequency shape underneath —
     which is the whole distinction between "shaky" and "curved". */
  function lowpass(pts, passes) {
    var out = pts;
    for (var n = 0; n < passes; n++) {
      if (out.length < 5) return out;
      var next = [out[0]];
      for (var i = 1; i < out.length - 1; i++) {
        var a = out[Math.max(0, i - 2)], b = out[i - 1], c = out[i],
            e = out[i + 1], g = out[Math.min(out.length - 1, i + 2)];
        next.push([(a[0] + 2 * b[0] + 3 * c[0] + 2 * e[0] + g[0]) / 9,
                   (a[1] + 2 * b[1] + 3 * c[1] + 2 * e[1] + g[1]) / 9]);
      }
      next.push(out[out.length - 1]);
      out = next;
    }
    return out;
  }

  /* Ezra, four times, on the LOOK: "free hand drawing… looks like shit."
     The previous pass ran RDP alone, and that is the wrong tool used first. RDP is a SIMPLIFIER: it
     keeps the points that deviate MOST from a chord and throws away the ones that lie close to it.
     Hand tremor is precisely the deviating points — so RDP was preserving the wobble and discarding
     the smooth parts, which is why raising its epsilon never helped and just started clipping the
     corners off deliberate shapes.
     Filter FIRST, then simplify. Two low-pass passes remove the tremor, RDP then reduces what is
     left to a manageable number of anchors, and the survivors are marked [u,v,1] so the renderer
     curves through them instead of joining them with straight segments. */
  /* IT DOES NOT RESHAPE WHAT YOU DREW ANY MORE (queue 315, clause 2). Ezra, for at least the second
   * time: *"it still has the issue where it will change what you drew to look different, which I don't
   * want"*.
   *
   * TWO OF THE THREE PASSES HERE MOVED HIS POINTS, and that is the whole complaint. `lowpass` slid
   * every sample toward its neighbours' average, and `rdp` deleted samples outright and drew straight
   * lines between the survivors — at eps 1.6 a deliberate small kink is inside the tolerance and simply
   * disappears. Between them, what came back was a tidier line than the one he made, which is exactly
   * what he keeps saying he does not want.
   *
   * THE THIRD PASS IS THE ONE WORTH KEEPING, and it is the answer to his OTHER complaint about this
   * tool ("looks like shit", when strokes rendered as faceted polylines). Marking a point [u,v,1] means
   * "curve through this point" — the renderer runs a smooth curve THROUGH the sample rather than a
   * corner AT it. It does not move anything. So the stroke reads as drawn rather than plotted, and
   * every point is still where he put it. Those two complaints only looked contradictory because the
   * first fix reached for simplification when the fault was the corners.
   * The ends stay hard so a stroke starts and stops crisply instead of hooking.
   *
   * COST: the sampler already enforces 2.5 device px between samples (see onMove), so a stroke across a
   * whole phone screen is a few hundred points rather than thousands — kept deliberately rather than
   * discovered, because "keep every point" without that floor would be a different decision. */
  function smoothFreehand(src) {
    if (src.length < 3) return src.slice();
    return src.map(function (p, i) {
      return (i === 0 || i === src.length - 1) ? [p[0], p[1]] : [p[0], p[1], 1];
    });
  }

  var strokes = [];                              // layer ids committed during THIS freehand session, for Undo and for the exit selection
  // Queue 167: the ONE layer a freehand session is building, and every stroke that has gone into it
  // (kept in PROJECT pixels, because the layer's box is re-fitted around their union on every stroke).
  var sessionLayerId = null, sessionSubs = [];
  /* History is SNAPSHOTS of the whole stroke list, not a stack of individual strokes (queue 165.4,
   * generalised for 165.2). The first version pushed and popped the TAIL, which is fine while the only
   * edit is "add a stroke at the end" — and stops being fine the moment the eraser can take one out of
   * the MIDDLE, because putting it back on the end would silently change the order the strokes paint
   * in. A snapshot costs a few small arrays in a session that holds tens of strokes, and it makes every
   * edit undoable by the same code rather than each one needing its own inverse. */
  var histPast = [], histFuture = [];
  function snap() { return sessionSubs.map(function (s) { return s; }); }   // strokes are never mutated in place, so a shallow copy is a real snapshot
  function pushHistory() { histPast.push(snap()); histFuture.length = 0; }

  /* UNDO IS A STROKE, AND SO IS REDO (queue 165.4). Ezra asked for the transport row's two glyphs
   * "so you can go back or forwards"; going forwards needed building, and going BACK turned out to be
   * broken in a way worth naming.
   * Queue 167 made a freehand session build ONE layer out of many strokes ("it should all be inside
   * the one drawing you just made"). Undo was never updated: it still popped an id off `strokes` and
   * spliced that LAYER out of the scene — and since only the FIRST stroke ever pushes an id, one press
   * of Undo deleted the entire drawing, every stroke of it. It also left sessionLayerId pointing at a
   * layer that no longer existed, so the next stroke re-fitted a ghost.
   * The unit of work is the stroke, so both directions move one subpath between sessionSubs and
   * a snapshot of the list and re-fit. The layer itself is only removed when the last stroke leaves it, and
   * recreated when the first one comes back. */
  function applySubs() {
    var layer = sessionLayerId ? FM.layerById(FM.scene, sessionLayerId) : null;
    if (!sessionSubs.length) {
      if (layer) {
        var i = FM.scene.layers.indexOf(layer);
        if (i >= 0) FM.scene.layers.splice(i, 1);
      }
      sessionLayerId = null;
      strokes.length = 0;
    } else if (!layer) {
      // Every stroke was undone and now one is coming back: the layer has to be built again, with the
      // FIRST surviving stroke, and the rest re-fitted on top of it.
      layer = FM.addPathLayer(sessionSubs[0], { closed: false, name: 'Sketch', color: FM.drawTool.color, stroke: FM.drawTool.stroke });
      if (layer) {
        sessionLayerId = layer.id; strokes.length = 0; strokes.push(layer.id);
        if (sessionSubs.length > 1 && FM.refitPathLayer) FM.refitPathLayer(layer, sessionSubs);
      }
    } else if (FM.refitPathLayer) {
      FM.refitPathLayer(layer, sessionSubs);
    }
    if (FM.selectLayer) FM.selectLayer(null);   // same rule as commitStroke: no inspector sheet mid-drawing
    if (FM.refreshAll) FM.refreshAll();
    if (FM.history) FM.history.commit();
    if (octx) octx.clearRect(0, 0, overlay.width, overlay.height);
    redraw(); updateBar(); FM.requestRender && FM.requestRender();
  }
  function undoStep() {
    var t = FM.drawTool;
    if (t.mode !== 'freehand') { t.points.pop(); redraw(); updateBar(); return; }
    // A half-drawn stroke under the finger goes first — it is the most recent thing you did, and
    // throwing it away is not something to put on the redo stack.
    if (t.points.length) { t.points = []; if (octx) octx.clearRect(0, 0, overlay.width, overlay.height); redraw(); updateBar(); return; }
    if (!histPast.length) return;
    histFuture.push(snap());
    sessionSubs = histPast.pop();
    applySubs();
  }
  function redoStep() {
    var t = FM.drawTool;
    if (t.mode !== 'freehand' || !histFuture.length) return;
    histPast.push(snap());
    sessionSubs = histFuture.pop();
    applySubs();
  }
  FM.drawTool._undo = undoStep;   // the suite drives the real handlers, not copies of them
  FM.drawTool._redo = redoStep;
  FM.drawTool._counts = function () { return { subs: sessionSubs.length, redo: histFuture.length, undo: histPast.length }; };

  /* ---- The eraser (queue 165.2) ----------------------------------------------------------------
   * Ezra: "you should add an option to switch from drawing to erasing."
   * WHOLE STROKES, not part of one, and that was a deliberate call rather than the lazy option: rubbing
   * out the middle of a stroke means splitting a path in two and re-fitting both, while removing the
   * stroke you touch is what most simple drawing tools do and is what "switch from drawing to erasing"
   * most naturally means on a tool whose unit of work is already the stroke. Recorded in REQUESTS #165
   * so he can say otherwise.
   * The hit test is distance to the nearest SEGMENT, in project units, which is the only honest way to
   * hit a line: a bounding box would catch every stroke that merely passes near, and a distance to the
   * sample POINTS would miss a long straight run between two far-apart samples. */
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    var t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function strokeIndexAt(p) {
    // Reach: half the brush plus a finger's worth of slack, expressed in SCREEN px and converted, so
    // the eraser feels the same however far the preview is zoomed.
    var reach = FM.drawTool.stroke / 2 + 14 / Math.max(1e-6, dispScale());
    var best = -1, bestD = reach;
    for (var i = sessionSubs.length - 1; i >= 0; i--) {   // topmost first: later subpaths paint over earlier ones
      var sub = sessionSubs[i];
      for (var j = 1; j < sub.length; j++) {
        var d = segDist(p[0], p[1], sub[j - 1][0], sub[j - 1][1], sub[j][0], sub[j][1]);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (sub.length === 1) { var d0 = Math.hypot(p[0] - sub[0][0], p[1] - sub[0][1]); if (d0 < bestD) { bestD = d0; best = i; } }
    }
    return best;
  }
  /* A REAL ERASER (queue 322, clause 4). Ezra: *"erase should work like an eraser not just delete the
   * whole drawing"*. It did exactly that — strokeIndexAt found the stroke nearest the finger and the
   * whole subpath was spliced out, so touching the tail of a long line took the line.
   * Now it takes the PART under the finger: points inside the reach are dropped and each surviving run
   * of two or more becomes its own subpath, so rubbing through the middle of a stroke leaves two. The
   * layer is already a multi-subpath field, so nothing downstream needed teaching.
   *
   * SUBPATHS THE ERASER DID NOT TOUCH ARE KEPT BY REFERENCE, not rebuilt. Undo here is snapshots of
   * the subpath LIST (`snap()` is a shallow copy, on the stated grounds that strokes are never mutated
   * in place), so handing back a fresh array for an untouched stroke would still be correct but would
   * quietly make every snapshot a deep copy of the whole drawing. Rebuilding only what changed keeps
   * that invariant true rather than merely satisfied.
   *
   * A run of ONE point is dropped rather than kept: a single point has no length, renders as nothing,
   * and would sit in the list forever as an invisible stroke that the eraser could never find again. */
  function eraseAt(p) {
    var i = strokeIndexAt(p);
    if (i < 0) return false;
    var reach = FM.drawTool.stroke / 2 + 14 / Math.max(1e-6, dispScale());
    var sub = sessionSubs[i], runs = [], run = [], j, hit = false;
    for (j = 0; j < sub.length; j++) {
      var pt = sub[j];
      if (Math.hypot(pt[0] - p[0], pt[1] - p[1]) <= reach) {
        hit = true;
        if (run.length >= 2) runs.push(run);
        run = [];
      } else run.push(pt);
    }
    if (run.length >= 2) runs.push(run);
    /* NOTHING WITHIN REACH OF A VERTEX, but strokeIndexAt still matched — it measures to the SEGMENT,
       so a finger over the middle of a long straight span is "on" the stroke while being far from
       every point of it. Falling through to the old behaviour there would delete the whole line, which
       is the bug. Splitting the nearest segment is what a rubber actually does. */
    if (!hit) {
      var bestJ = -1, bestD = Infinity;
      for (j = 1; j < sub.length; j++) {
        var d = segDist(p[0], p[1], sub[j - 1][0], sub[j - 1][1], sub[j][0], sub[j][1]);
        if (d < bestD) { bestD = d; bestJ = j; }
      }
      if (bestJ < 0) return false;
      runs = [];
      if (bestJ >= 2) runs.push(sub.slice(0, bestJ));
      if (sub.length - bestJ >= 2) runs.push(sub.slice(bestJ));
    }
    pushHistory();
    sessionSubs = sessionSubs.slice(0, i).concat(runs, sessionSubs.slice(i + 1));
    applySubs();
    return true;
  }
  FM.drawTool._eraseAt = eraseAt;   // the suite erases at a real project coordinate, not through a synthetic drag

  // Exposed so the suite can measure the smoothing directly. Driving the whole tool just to check
  // the shape of a curve makes the test about the UI instead of about the maths.
  FM._smoothFreehand = function (pts) { return smoothFreehand(pts); };

  function finish() {
    var t = FM.drawTool;
    if (t.mode === 'freehand') {
      commitStroke();                                  // whatever is still under the finger
      var last = strokes.length ? strokes[strokes.length - 1] : null;
      stop();
      if (last && FM.selectLayer) FM.selectLayer(last);   // hand back the drawing, selected
      return;
    }
    if (t.mode === 'vector' && t.points.length >= 3) {
      /* STOP FIRST, THEN ADD (queue 179). Ezra: "When you finish adding a vector drawing it does this
       * and you have to swipe down" — a phone shot of the nine-category inspector filling the whole
       * screen with no canvas and no timeline under it.
       * The order was the bug. `body.drawing` carries `#inspector-panel { display: none }`, so adding
       * the layer here selected it and opened the inspector while that panel was still HIDDEN — it
       * docked and measured itself against a layout that was not on screen, and by the time stop()
       * took the class off, the geometry it had settled on was full-height with the stage collapsed.
       * A swipe down was the only way to make it re-measure.
       * The freehand branch above has always done it this way round, which is exactly why freehand
       * never showed this. Points are copied out because stop() clears them. */
      var pts = t.points.slice(), fill = t.color;
      stop();
      FM.addPathLayer(pts, { closed: true, name: 'Drawing', fill: fill });
      return;
    }
    if (t.mode === 'vector') {
      if (FM.toast) FM.toast('Tap at least 3 points, then Done');
      return;
    }
    stop();
  }

  function stop() {
    strokes = [];
    sessionLayerId = null; sessionSubs = []; histPast = []; histFuture = [];   // a new drawing starts a new layer (queue 167) and a fresh history
    FM.drawTool.active = false; FM.drawTool.mode = null; FM.drawTool.points = []; drawing = false; erasing = false; FM.drawTool.erasing = false;
    FM.drawTool.cursor = null; FM.drawTool.snapX = FM.drawTool.snapY = null;
    if (octx) octx.clearRect(0, 0, overlay.width, overlay.height);
    if (overlay) overlay.style.display = 'none';
    if (bar) bar.classList.add('hidden');
    document.body.classList.remove('drawing');
    document.body.classList.remove('draw-vector');
    if (FM.resizeCanvas) FM.resizeCanvas();   // the stage shrinks back to its normal share of the window
  }


  function updateBar() {
    if (!bar) return;
    var vec = FM.drawTool.mode === 'vector';
    // Undo and Done belong to BOTH modes. Hiding them for freehand left that mode with no way out
    // and no way back — the only exit was the pointerup that ended the whole session by accident.
    ['.db-pad', '.db-add'].forEach(function (sel) {          // pad + add point are vector-only
      var elx = bar.querySelector(sel); if (elx) elx.style.display = vec ? '' : 'none';
    });
    ['.db-undo', '.db-done'].forEach(function (sel) {
      var elx = bar.querySelector(sel); if (elx) elx.style.display = '';
    });
    // Redo is FREEHAND ONLY: in vector mode a "step" is a point on a shape you have not committed yet,
    // and offering a forward arrow that does nothing is worse than not offering one.
    var rd = bar.querySelector('.db-redo');
    if (rd) {
      rd.style.display = vec ? 'none' : '';
      rd.classList.toggle('db-dim', !histFuture.length);
    }
    var ud = bar.querySelector('.db-undo');
    if (ud) ud.classList.toggle('db-dim', vec ? !FM.drawTool.points.length : !(FM.drawTool.points.length || histPast.length));
    var er = bar.querySelector('.db-erase');
    if (er) {
      er.style.display = vec ? 'none' : '';   // a vector shape is not committed yet — there is nothing to erase
      er.classList.toggle('db-on', !!FM.drawTool.erasing);
      er.setAttribute('aria-pressed', FM.drawTool.erasing ? 'true' : 'false');
    }
    bar.classList.toggle('db-vector', vec);
    var n = FM.drawTool.points.length;
    var hint = bar.querySelector('.db-hint');
    // sessionSubs, not `strokes` — since queue 167 the whole session is ONE layer, so `strokes` holds
    // exactly one id however much you draw and this counter was frozen at "1 stroke".
    var ns = sessionSubs.length;
    if (hint) hint.textContent = FM.drawTool.mode === 'freehand'
      /* ⚠️ NO "DRAW ON THE CANVAS" INSTRUCTION (queue 535). Ezra: "get rid of the pop up saying that
         you can sketch on the canvas like no shit." He is right — you have just tapped the pencil, and
         the bar sits over the canvas with a colour and a brush size on it. The COUNT is kept, because
         that is information rather than instruction: it tells you how many strokes are in the drawing
         you are building, which is the one thing the bar knows and you cannot see. */
      ? (ns ? (ns + ' stroke' + (ns === 1 ? '' : 's')) : '')
      : (n < 3 ? 'Tap the canvas or use the pad, then + Add point (' + n + ')' : 'Done / Enter to finish, or land on the first point (' + n + ')');
  }

  function buildBar() {
    bar = document.createElement('div');
    bar.id = 'draw-bar'; bar.className = 'hidden';
    bar.innerHTML =
      '<div class="db-pad"><span class="db-pad-hint">Swipe here to move the point · snaps to the others</span></div>' +
      '<button class="db-add" type="button">+ Add point</button>' +
      '<span class="db-hint"></span>' +
      '<label class="db-color" title="Colour"><input type="color" value="#ffffff"></label>' +
      '<label class="db-width" title="Brush width"><input type="range" min="1" max="40" value="8"></label>' +
      /* Draw / erase (queue 165.2). A MODE, not a second meaning for one finger — the same reason the
         pan/zoom point in that entry has to be one. Pressed state is the toggle's own answer to "which
         one am I in", so the brush and the eraser never both look available. */
      '<button class="db-erase" type="button" title="Erase strokes" aria-label="Erase strokes" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 20.5H20"/><path d="M15.4 4.6 4.6 15.4a2 2 0 0 0 0 2.8l2.2 2.2a2 2 0 0 0 2.8 0L20.4 9.6a2 2 0 0 0 0-2.8l-2.2-2.2a2 2 0 0 0-2.8 0z"/><path d="m10 10 4.5 4.5"/></svg></button>' +
      /* The two glyphs from the transport row, not the word "Undo" (queue 165.4). Ezra: "instead of an
         undo button just add the undo and redo icons that we have in the normal menu so you can go back
         or forwards." Same paths as #btn-undo / #btn-redo in index.html, so one mark means one thing
         wherever you meet it. */
      '<button class="db-undo" type="button" title="Undo" aria-label="Undo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 0 1 0 10h-3"/></svg></button>' +
      '<button class="db-redo" type="button" title="Redo" aria-label="Redo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l4-4-4-4"/><path d="M19 10h-9a5 5 0 0 0 0 10h3"/></svg></button>' +
      '<button class="db-done" type="button">Done</button>' +
      '<button class="db-cancel" type="button">Cancel</button>';
    document.body.appendChild(bar);
    bar.querySelector('.db-color input').addEventListener('input', function (e) {
      FM.drawTool.color = e.target.value;
      /* A HAND-PICKED COLOUR OUTLIVES THE DEFAULT (queue 142). The setting supplies the STARTING colour;
         once he has chosen one himself, reopening the tool must not overwrite it with the preference. */
      userPickedColor = true;
      redraw();
    });
    bar.querySelector('.db-width input').addEventListener('input', function (e) { FM.drawTool.stroke = +e.target.value; redraw(); });
    bar.querySelector('.db-undo').addEventListener('click', undoStep);
    bar.querySelector('.db-redo').addEventListener('click', redoStep);
    bar.querySelector('.db-erase').addEventListener('click', function () {
      FM.drawTool.erasing = !FM.drawTool.erasing;
      FM.drawTool.points = [];   // a half-drawn stroke does not survive the switch
      if (octx) octx.clearRect(0, 0, overlay.width, overlay.height);
      redraw(); updateBar();
    });
    bar.querySelector('.db-done').addEventListener('click', finish);
    bar.querySelector('.db-cancel').addEventListener('click', stop);
    bar.querySelector('.db-add').addEventListener('click', function () {
      var t = FM.drawTool;
      if (!t.cursor) return;
      // Landing on the FIRST point is how you close the shape, exactly as tapping it on the canvas is.
      if (t.points.length > 2 && Math.hypot(t.cursor[0] - t.points[0][0], t.cursor[1] - t.points[0][1]) * dispScale() < 14) { finish(); return; }
      t.points.push(t.cursor.slice());
      snapCursor();   // the new point becomes a snap target for the next one
      redraw(); updateBar();
    });

    // The pad, from the shared helper (queue 321). See FM.nudgePad below for why it is shared.
    FM.nudgePad(bar.querySelector('.db-pad'), {
      enabled: function () { return FM.drawTool.mode === 'vector'; },
      get: function () {
        var t = FM.drawTool;
        if (!t.cursor) setCursor(FM.scene.project.width / 2, FM.scene.project.height / 2);
        return t.cursor;
      },
      set: function (x, y) { setCursor(x, y); redraw(); updateBar(); },
    });
  }

  /* ---- THE PRECISION PAD, SHARED (queue 321) ----------------------------------------------------
   * Ezra: *"make it when editing the mask and where it actually masks, you can use the touch pad thing
   * like when editing points on a shape"*.
   * The gain is the point of the control and is why it is worth having twice: it is Move & Transform's
   * (project width / 640), which is FINER than touching the canvas — on a phone a finger pixel on the
   * canvas is about 3.5 project px and here it is about 1.7 — so a point can be put somewhere a
   * fingertip physically cannot reach.
   * IT IS ONE FUNCTION RATHER THAN A SECOND COPY IN THE MASK TOOL, and that is not tidiness: #116 is
   * this project's standing note about what happens when two surfaces meant to feel identical get
   * their own copies — the timeline's glide was retuned and the sliders' was not, and it took him
   * asking twice to notice. The number above is exactly the kind of thing that gets retuned in one
   * place. The caller supplies where the point IS and what to do when it moves; everything about how
   * the gesture feels lives here. */
  FM.nudgePad = function (el, opts) {
    if (!el || !opts) return;
    var pd = null;
    el.addEventListener('pointerdown', function (e) {
      if (opts.enabled && !opts.enabled()) return;
      var at = opts.get(); if (!at) return;
      pd = { x: e.clientX, y: e.clientY, cx: at[0], cy: at[1] };
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault(); e.stopPropagation();
    });
    el.addEventListener('pointermove', function (e) {
      if (!pd) return;
      // A mouse that was released outside the pad never sends pointerup here; buttons===0 is the only
      // honest signal that the drag is over, and without it the cursor follows the mouse forever.
      if (e.pointerType === 'mouse' && e.buttons === 0) { pd = null; return; }
      var sens = (FM.scene.project.width || 1080) / 640;
      opts.set(pd.cx + (e.clientX - pd.x) * sens, pd.cy + (e.clientY - pd.y) * sens);
      e.preventDefault();
    });
    function end(e) { if (!pd) return; pd = null; try { el.releasePointerCapture(e.pointerId); } catch (_) {} }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  };

  // Exposed for the suite (queue 179): the Done BUTTON is the only other door, and driving a click on
  // a bar that may be mid-layout tests the bar, not the finish path this covers.
  FM.drawTool.finish = finish;
  // …and the same argument for the commit path (queue 165.4): the undo/redo test is about what one
  // stroke does to the session, and synthesising a pointer drag to produce one would be testing the
  // event plumbing instead. This is the function the finger really calls.
  FM.drawTool._commit = commitStroke;
  // …and the way OUT, which the test needs in a finally. Without it a test that starts the tool leaves
  // body.drawing on for the rest of the run, and the collapsed layout it causes fails eight unrelated
  // tests downstream — which is how this hook came to exist.
  /* A PRODUCTION SEAM NOW, NOT ONLY A TEST ONE (queue 453, v11.22). This export already existed and
   * the suite used it; what did not exist was anyone CALLING it when you leave a project. FM.drawTool
   * is one module-level object, not per-project state, so an unfinished sketch outlived the project it
   * started in — Ezra: "when you leave a project mid drawing it still has you in the drawing menu
   * sketching menu when you load back in and if you load another project it's also doing the drawing
   * thing still". Both halves are that one cause. See home.js's openProject. */
  FM.drawTool._stop = stop;
  /* Suite seam (queue 514). The defect lived in what commitStroke does AFTER the points are in — it
     updated the model and the timeline and never repainted the canvas — so the test has to reach this
     function directly. Synthesising pointer events over a canvas the suite cannot see would exercise
     the input plumbing rather than the thing that was broken. */
  FM._drawCommitStroke = commitStroke;
  FM.startDraw = function (mode, opts) {
    /* THE RESET IS GONE (v8.01, queue 165.3). Ezra: "another option that lets you grab the screen and
     * zoom in or out so you can do more detailed drawing."
     * This line used to throw your zoom away the moment you picked up the pencil, and it was RIGHT to
     * while it stood: the overlay laid out in screen pixels inside a wrapper the viewport scales, so a
     * zoomed canvas doubled it — measured at 2x, an overlay of 984x1501 over a 492x751 canvas. v8.00
     * places the overlay in the wrapper's own space, so the overlay now tracks the canvas exactly
     * (492x751 against 492x751) and there is nothing left to protect you from.
     * What this buys immediately: the zoom you already set is kept, and the ⛶ view bar's zoom controls
     * keep working while you draw — which is the "zoom in or out" half of his request, using the
     * controls that were already there rather than a second set inside the drawing bar.
     * The "grab the screen" half — panning — still needs its gesture chosen; see REQUESTS #165. */
    if (!overlay) FM.drawTools && FM.drawTools.init();
    if (!overlay) return;
    FM.drawTool.active = true; FM.drawTool.mode = mode; FM.drawTool.points = []; drawing = false; erasing = false; FM.drawTool.erasing = false;
    FM.drawTool.snapX = FM.drawTool.snapY = null;
    /* START FROM HIS DEFAULT SHAPE COLOUR (queue 142). The entry claimed this already worked — *"It
       reaches every route that spawns a shape, including freehand and vector drawing"* — and it did not.
       The setting only ever reached layers born through FM.makeLayer without an explicit fill (the add
       menu); this tool began life at the literal '#ffffff' and handed that straight to the committed
       layer. Measured before the fix: with the setting on #cc22cc an add-menu rectangle came out #cc22cc
       and a drawing came out #ffffff.
       READ THE SETTING, NOT FM.defaultShapeFill() — that helper rolls a fresh random hue when the
       preference is 'random', and 'random' is documented as "what the app has always done", which for
       this tool means white. So only a real colour seeds; 'random' leaves the old behaviour untouched.
       Skipped once he has picked a colour by hand, and the adopt branch below still wins, so re-editing
       an existing drawing keeps that drawing's own colour. */
    if (!userPickedColor) {
      var prefCol = null;
      try { prefCol = FM.settings && FM.settings.get ? FM.settings.get('shapeColor') : null; } catch (e) {}
      if (typeof prefCol === 'string' && /^#[0-9a-f]{6}$/i.test(prefCol)) {
        FM.drawTool.color = prefCol.toLowerCase();
        if (bar) { var swEl = bar.querySelector('.db-color input'); if (swEl) swEl.value = FM.drawTool.color; }
      }
    }
    /* A NEW drawing starts a new layer (queue 167). stop() clears these too, but not every exit runs
       through it — and without the reset here a second drawing would silently append its strokes to
       the layer the FIRST one built, which is a worse bug than the one being fixed. */
    sessionLayerId = null; sessionSubs = []; histPast = []; histFuture = [];
    /* RE-ENTERING AN EXISTING DRAWING (queue 322, clause 3). Ezra: *"there should be a button to re edit
       the drawing so you can draw more or erase"*.
       The session is ADOPTED rather than restarted: its layer id and its strokes are seeded from the
       layer, so a new stroke re-fits that drawing instead of building a second one beside it, the
       eraser can reach what is already there, and the existing strokes show under your finger because
       redraw() paints sessionSubs.
       THE SUBS COME BACK THROUGH evalShapeSubs, not straight off the layer. They are stored normalised
       to the layer's box, they may be keyframed, and a single-stroke drawing keeps them in `points`
       rather than `subs` — three ways to get this wrong, all of which that one function already knows
       about. They are then put back into PROJECT pixels, which is what a session works in and what the
       re-fit on the way out expects. */
    if (opts && opts.layerId) {
      var adopt = FM.layerById(FM.scene, opts.layerId);
      if (adopt && adopt.type === 'shape' && adopt.shape === 'path' && !adopt.closed) {
        var norm = FM.evalShapeSubs ? FM.evalShapeSubs(adopt, FM.time || 0) : (adopt.subs || (adopt.points ? [adopt.points] : []));
        var ev = function (v) { return (FM.evalProp ? FM.evalProp(v, FM.time || 0) : v) || 0; };
        var bw = adopt.shapeW || 1, bh = adopt.shapeH || 1;
        var ox = ev(adopt.transform && adopt.transform.x) - bw / 2;
        var oy = ev(adopt.transform && adopt.transform.y) - bh / 2;
        sessionSubs = norm.map(function (sub) {
          return sub.map(function (q) {
            return q.length > 2 ? [ox + q[0] * bw, oy + q[1] * bh, q[2]] : [ox + q[0] * bw, oy + q[1] * bh];
          });
        });
        if (sessionSubs.length) {
          sessionLayerId = adopt.id;
          strokes.length = 0; strokes.push(adopt.id);
          FM.drawTool.color = adopt.fill || FM.drawTool.color;
          // The brush width lives on the (disabled) border, which is where addPathLayer parks it.
          if (adopt.stroke && adopt.stroke.width) FM.drawTool.stroke = adopt.stroke.width;
        }
      }
    }
    // Vector starts with the cursor parked in the middle of the frame, so the pad has something to
    // move from the moment the tool opens rather than only after a first tap.
    FM.drawTool.cursor = mode === 'vector' ? [FM.scene.project.width / 2, FM.scene.project.height / 2] : null;
    if (FM.selectLayer) FM.selectLayer(null);
    document.body.classList.add('drawing');
    document.body.classList.toggle('draw-vector', mode === 'vector');   // taller bar → deeper stage margin
    // The class above hands the whole window to the stage, which changes the preview's box — so the
    // canvas backing store AND the overlay both have to be re-measured before anything is drawn, or
    // the strokes land at the old scale. getBoundingClientRect inside these forces the layout flush.
    if (FM.resizeCanvas) FM.resizeCanvas();
    syncOverlay();
    overlay.style.display = 'block';
    redraw();
    bar.classList.remove('hidden');
    bar.querySelector('.db-width').style.display = mode === 'freehand' ? '' : 'none';
    updateBar();
    if (FM.toast) FM.toast(mode === 'freehand' ? 'Sketching: draw on the canvas' : 'Custom shape: tap the canvas, or nudge with the pad and + Add point', 2800);
  };

  FM.drawTools = {
    init: function () {
      if (overlay) return;
      var w = wrap(); if (!w) return;
      overlay = document.createElement('canvas');
      overlay.id = 'draw-overlay'; overlay.style.display = 'none';
      w.appendChild(overlay);
      buildBar();
      // capture phase so we intercept before canvas-edit's select/move handlers
      var c = preview();
      c.addEventListener('pointerdown', onDown, true);
      overlay.addEventListener('pointerdown', onDown, true);
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);   // OS-cancelled stroke finalizes like a normal release instead of being silently lost
      /* PANNING, WITH NO BUTTON (v8.02, queue 165.3). Ezra: "another option that lets you grab the
       * screen and zoom in or out so you can do more detailed drawing."
       * The gesture chose itself once the constraints were written down: one finger already means DRAW
       * and cannot be reassigned; the drawing bar is already full at 380px (measured 347px of content in
       * a 355px box, so an eighth toggle overflows it); and a mode you have to switch into is a worse
       * answer than one you simply do. A two-finger scroll — the trackpad and mouse-wheel gesture people
       * already use to move a canvas around in every other tool — needs no control at all and cannot
       * collide with drawing, because a wheel event is not a pointer.
       * Shift+wheel pans horizontally, which is the convention everywhere else, so a mouse with one
       * wheel is not stuck on one axis.
       * `passive: false` because it must preventDefault — otherwise the page scrolls underneath and the
       * canvas appears to fight you. */
      window.addEventListener('wheel', function (e) {
        if (!FM.drawTool.active || !FM.viewport) return;
        if (!overlay || overlay.style.display === 'none') return;
        e.preventDefault();
        var c2 = preview();
        if (!c2) return;
        var dx = e.shiftKey ? -e.deltaY : -e.deltaX;
        var dy = e.shiftKey ? 0 : -e.deltaY;
        FM.viewport.x += dx;
        FM.viewport.y += dy;
        FM.viewport.apply();
        /* KEEP THE CANVAS ON SCREEN (v8.03). The first version of this pan shipped without a clamp and
         * it was a trap: twenty-five flicks put the canvas at top -5025, bottom -4377 — entirely gone —
         * and while drawing there is no way to bring it back, because the ⛶ view bar that owns the zoom
         * and fit controls is hidden in that mode. The only escape was Done or Cancel, i.e. commit or
         * lose your drawing blind. Found by measuring after the fact rather than by anyone hitting it.
         * The clamp is expressed as "a corner of the canvas must stay within KEEP px of the viewport"
         * and applied by CORRECTION rather than by pre-computing limits — the canvas rect already knows
         * where it ended up, whatever the zoom and crop are doing, so there is no second model of the
         * geometry to keep in step with the first. */
        keepCanvasOnScreen(c2);
        /* Kept for a SCALE change, not for the pan: the overlay is a child of the wrapper the viewport
         * transforms, so a pure translate carries it along with no JavaScript at all — verified by
         * mutation, which removed this line and changed nothing. A zoom does change the wrapper's scale
         * and therefore the local box, and that is what this is here for. */
        syncOverlay(); redraw();
      }, { passive: false });
      window.addEventListener('resize', function () { if (FM.drawTool.active) syncOverlay(), redraw(); });
      // The preview canvas can also be re-sized WITHOUT a window resize — the adaptive quality tier
      // re-allocates it the moment a drag starts, which is exactly when you are drawing. The overlay
      // is positioned and scaled off that canvas, so it has to follow or the stroke drifts mid-line.
      FM.drawTool.sync = function () { if (FM.drawTool.active) { syncOverlay(); redraw(); } };
      // Enter finishes the drawing (same as Done); Escape cancels. Capture phase + stopPropagation
      // so the app's own Enter/Escape shortcuts don't also fire while you're mid-draw.
      window.addEventListener('keydown', function (e) {
        if (!FM.drawTool.active) return;
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(); }
      }, true);
    },
  };
})(window.FM);
