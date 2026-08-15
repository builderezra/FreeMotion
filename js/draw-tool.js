/* FreeMotion — Freehand & Vector drawing tools (Alight-Motion-style).
 * Freehand: press-drag on the canvas → a brush-stroke path layer (open, stroked).
 * Vector:   tap anchor points → tap Done (or tap near the first point) → a filled polygon layer.
 * Both create a shape:'path' layer (see FM.addPathLayer / traceShapePath).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  var overlay = null, octx = null, bar = null, drawing = false;
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
    overlay.style.left = (cr.left - wr.left) + 'px';
    overlay.style.top = (cr.top - wr.top) + 'px';
    overlay.style.width = cr.width + 'px';
    overlay.style.height = cr.height + 'px';
    var dpr = window.devicePixelRatio || 1;
    overlay.width = Math.max(1, Math.round(cr.width * dpr));
    overlay.height = Math.max(1, Math.round(cr.height * dpr));
    octx = overlay.getContext('2d');
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  function onDown(e) {
    if (!FM.drawTool.active) return;
    if (e.target !== overlay && e.target !== preview()) return;
    e.preventDefault(); e.stopPropagation();
    var p = toProject(e.clientX, e.clientY);
    if (FM.drawTool.mode === 'freehand') {
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
    sessionSubs.push(sub);
    sessionRedo.length = 0;   // drawing something new is the end of the branch you undid away from
    var layer = sessionLayerId ? FM.layerById(FM.scene, sessionLayerId) : null;
    if (!layer) {
      layer = FM.addPathLayer(sub, { closed: false, name: 'Freehand', color: t.color, stroke: t.stroke });
      if (layer) { sessionLayerId = layer.id; strokes.push(layer.id); }
    } else if (FM.refitPathLayer) {
      FM.refitPathLayer(layer, sessionSubs);
      if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();   // the thumbnail has to follow the drawing
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
  function smoothFreehand(src) {
    var filtered = lowpass(src, 2);
    var pts = rdp(filtered, 1.6);   // lower epsilon is safe now: there is no jitter left to preserve
    if (pts.length < 3) return pts;
    return pts.map(function (p, i) {
      return (i === 0 || i === pts.length - 1) ? [p[0], p[1]] : [p[0], p[1], 1];
    });
  }

  var strokes = [];                              // layer ids committed during THIS freehand session, for Undo and for the exit selection
  // Queue 167: the ONE layer a freehand session is building, and every stroke that has gone into it
  // (kept in PROJECT pixels, because the layer's box is re-fitted around their union on every stroke).
  var sessionLayerId = null, sessionSubs = [];
  var sessionRedo = [];                          // strokes taken back by Undo, newest last (queue 165.4)

  /* UNDO IS A STROKE, AND SO IS REDO (queue 165.4). Ezra asked for the transport row's two glyphs
   * "so you can go back or forwards"; going forwards needed building, and going BACK turned out to be
   * broken in a way worth naming.
   * Queue 167 made a freehand session build ONE layer out of many strokes ("it should all be inside
   * the one drawing you just made"). Undo was never updated: it still popped an id off `strokes` and
   * spliced that LAYER out of the scene — and since only the FIRST stroke ever pushes an id, one press
   * of Undo deleted the entire drawing, every stroke of it. It also left sessionLayerId pointing at a
   * layer that no longer existed, so the next stroke re-fitted a ghost.
   * The unit of work is the stroke, so both directions move one subpath between sessionSubs and
   * sessionRedo and re-fit. The layer itself is only removed when the last stroke leaves it, and
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
      layer = FM.addPathLayer(sessionSubs[0], { closed: false, name: 'Freehand', color: FM.drawTool.color, stroke: FM.drawTool.stroke });
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
    if (!sessionSubs.length) return;
    sessionRedo.push(sessionSubs.pop());
    applySubs();
  }
  function redoStep() {
    var t = FM.drawTool;
    if (t.mode !== 'freehand' || !sessionRedo.length) return;
    sessionSubs.push(sessionRedo.pop());
    applySubs();
  }
  FM.drawTool._undo = undoStep;   // the suite drives the real handlers, not copies of them
  FM.drawTool._redo = redoStep;
  FM.drawTool._counts = function () { return { subs: sessionSubs.length, redo: sessionRedo.length }; };

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
    sessionLayerId = null; sessionSubs = []; sessionRedo = [];   // a new drawing starts a new layer (queue 167) and a fresh redo stack
    FM.drawTool.active = false; FM.drawTool.mode = null; FM.drawTool.points = []; drawing = false;
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
      rd.classList.toggle('db-dim', !sessionRedo.length);
    }
    var ud = bar.querySelector('.db-undo');
    if (ud) ud.classList.toggle('db-dim', vec ? !FM.drawTool.points.length : !(FM.drawTool.points.length || sessionSubs.length));
    bar.classList.toggle('db-vector', vec);
    var n = FM.drawTool.points.length;
    var hint = bar.querySelector('.db-hint');
    // sessionSubs, not `strokes` — since queue 167 the whole session is ONE layer, so `strokes` holds
    // exactly one id however much you draw and this counter was frozen at "1 stroke".
    var ns = sessionSubs.length;
    if (hint) hint.textContent = FM.drawTool.mode === 'freehand'
      ? (ns ? ('Draw again, or Done (' + ns + ' stroke' + (ns === 1 ? '' : 's') + ')') : 'Draw on the canvas — keep drawing, then Done')
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
      /* The two glyphs from the transport row, not the word "Undo" (queue 165.4). Ezra: "instead of an
         undo button just add the undo and redo icons that we have in the normal menu so you can go back
         or forwards." Same paths as #btn-undo / #btn-redo in index.html, so one mark means one thing
         wherever you meet it. */
      '<button class="db-undo" type="button" title="Undo" aria-label="Undo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 0 1 0 10h-3"/></svg></button>' +
      '<button class="db-redo" type="button" title="Redo" aria-label="Redo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l4-4-4-4"/><path d="M19 10h-9a5 5 0 0 0 0 10h3"/></svg></button>' +
      '<button class="db-done" type="button">Done</button>' +
      '<button class="db-cancel" type="button">Cancel</button>';
    document.body.appendChild(bar);
    bar.querySelector('.db-color input').addEventListener('input', function (e) { FM.drawTool.color = e.target.value; redraw(); });
    bar.querySelector('.db-width input').addEventListener('input', function (e) { FM.drawTool.stroke = +e.target.value; redraw(); });
    bar.querySelector('.db-undo').addEventListener('click', undoStep);
    bar.querySelector('.db-redo').addEventListener('click', redoStep);
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

    // The pad. Same gain as Move & Transform's (project width / 640), which is finer than touching the
    // canvas directly — on a phone a finger pixel there is ~3.5 project px, here it is ~1.7 — so a
    // point can be put somewhere a fingertip simply cannot reach.
    var pad = bar.querySelector('.db-pad'), pd = null;
    pad.addEventListener('pointerdown', function (e) {
      var t = FM.drawTool; if (t.mode !== 'vector') return;
      if (!t.cursor) setCursor(FM.scene.project.width / 2, FM.scene.project.height / 2);
      pd = { x: e.clientX, y: e.clientY, cx: t.cursor[0], cy: t.cursor[1] };
      try { pad.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault(); e.stopPropagation();
    });
    pad.addEventListener('pointermove', function (e) {
      if (!pd) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) { pd = null; return; }
      var sens = (FM.scene.project.width || 1080) / 640;
      setCursor(pd.cx + (e.clientX - pd.x) * sens, pd.cy + (e.clientY - pd.y) * sens);
      redraw(); updateBar();
      e.preventDefault();
    });
    function endPad(e) { if (!pd) return; pd = null; try { pad.releasePointerCapture(e.pointerId); } catch (_) {} }
    pad.addEventListener('pointerup', endPad);
    pad.addEventListener('pointercancel', endPad);
  }

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
  FM.drawTool._stop = stop;
  FM.startDraw = function (mode) {
    if (FM.viewport && !FM.viewport.isDefault()) FM.viewport.reset();   // overlay lays out in screen px — a zoomed viewport double-scales it
    if (!overlay) FM.drawTools && FM.drawTools.init();
    if (!overlay) return;
    FM.drawTool.active = true; FM.drawTool.mode = mode; FM.drawTool.points = []; drawing = false;
    FM.drawTool.snapX = FM.drawTool.snapY = null;
    /* A NEW drawing starts a new layer (queue 167). stop() clears these too, but not every exit runs
       through it — and without the reset here a second drawing would silently append its strokes to
       the layer the FIRST one built, which is a worse bug than the one being fixed. */
    sessionLayerId = null; sessionSubs = []; sessionRedo = [];
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
    if (FM.toast) FM.toast(mode === 'freehand' ? 'Freehand: draw on the canvas' : 'Vector: tap the canvas, or nudge with the pad and + Add point', 2800);
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
