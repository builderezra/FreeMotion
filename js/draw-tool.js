/* FreeMotion — Freehand & Vector drawing tools (Alight-Motion-style).
 * Freehand: press-drag on the canvas → a brush-stroke path layer (open, stroked).
 * Vector:   tap anchor points → tap Done (or tap near the first point) → a filled polygon layer.
 * Both create a shape:'path' layer (see FM.addPathLayer / traceShapePath).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  var overlay = null, octx = null, bar = null, drawing = false;
  FM.drawTool = { active: false, mode: null, points: [], stroke: 8, color: '#ffffff' };

  function preview() { return document.getElementById('preview'); }
  function wrap() { return document.getElementById('canvas-wrap'); }

  function toProject(cx, cy) {
    var c = preview(), r = c.getBoundingClientRect();
    return [(cx - r.left) * (c.width / r.width), (cy - r.top) * (c.height / r.height)];
  }
  function dispScale() { var c = preview(), r = c.getBoundingClientRect(); return (r.width / c.width) || 1; }

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
    var s = dispScale();
    octx.clearRect(0, 0, overlay.width, overlay.height);
    var pts = FM.drawTool.points;
    if (!pts.length) return;
    octx.lineJoin = 'round'; octx.lineCap = 'round';
    octx.strokeStyle = FM.drawTool.color;
    octx.lineWidth = Math.max(1.5, FM.drawTool.stroke * s);
    octx.beginPath();
    pts.forEach(function (p, i) { var x = p[0] * s, y = p[1] * s; if (i === 0) octx.moveTo(x, y); else octx.lineTo(x, y); });
    if (FM.drawTool.mode === 'vector' && pts.length > 2) { octx.save(); octx.setLineDash([6, 5]); octx.lineWidth = 2; octx.strokeStyle = 'rgba(255,255,255,.55)'; octx.lineTo(pts[0][0] * s, pts[0][1] * s); octx.stroke(); octx.restore(); octx.beginPath(); pts.forEach(function (p, i) { var x = p[0] * s, y = p[1] * s; if (i === 0) octx.moveTo(x, y); else octx.lineTo(x, y); }); }
    octx.stroke();
    if (FM.drawTool.mode === 'vector') {   // anchor dots
      octx.fillStyle = FM.drawTool.color;
      pts.forEach(function (p, i) { octx.beginPath(); octx.arc(p[0] * s, p[1] * s, i === 0 ? 6 : 4.5, 0, 6.2832); octx.fill(); if (i === 0) { octx.strokeStyle = '#fff'; octx.lineWidth = 2; octx.stroke(); } });
    }
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
      pts.push(p); redraw(); updateBar();
    }
  }
  function onMove(e) {
    if (!FM.drawTool.active || !drawing || FM.drawTool.mode !== 'freehand') return;
    var p = toProject(e.clientX, e.clientY), pts = FM.drawTool.points, last = pts[pts.length - 1], s = dispScale();
    if (Math.hypot((p[0] - last[0]) * s, (p[1] - last[1]) * s) < 2.5) return;   // min spacing
    pts.push(p); redraw();
  }
  function onUp(e) {
    if (!FM.drawTool.active || FM.drawTool.mode !== 'freehand' || !drawing) return;
    drawing = false;
    if (FM.drawTool.points.length >= 2) finish(); else redraw();
  }

  function finish() {
    var t = FM.drawTool;
    if (t.mode === 'freehand' && t.points.length >= 2) {
      FM.addPathLayer(t.points, { closed: false, name: 'Freehand', color: t.color, stroke: t.stroke });
    } else if (t.mode === 'vector' && t.points.length >= 3) {
      FM.addPathLayer(t.points, { closed: true, name: 'Drawing', fill: t.color });
    } else if (t.mode === 'vector') {
      if (FM.toast) FM.toast('Tap at least 3 points, then Done');
      return;
    }
    stop();
  }

  function stop() {
    FM.drawTool.active = false; FM.drawTool.mode = null; FM.drawTool.points = []; drawing = false;
    if (octx) octx.clearRect(0, 0, overlay.width, overlay.height);
    if (overlay) overlay.style.display = 'none';
    if (bar) bar.classList.add('hidden');
    document.body.classList.remove('drawing');
  }

  function updateBar() {
    if (!bar) return;
    var undo = bar.querySelector('.db-undo'), done = bar.querySelector('.db-done');
    var n = FM.drawTool.points.length;
    if (undo) undo.style.display = FM.drawTool.mode === 'vector' ? '' : 'none';
    if (done) done.style.display = FM.drawTool.mode === 'vector' ? '' : 'none';
    var hint = bar.querySelector('.db-hint');
    if (hint) hint.textContent = FM.drawTool.mode === 'freehand'
      ? 'Draw on the canvas'
      : (n < 3 ? 'Tap points to build a shape (' + n + ')' : 'Tap Done / press Enter, or tap the first point (' + n + ')');
  }

  function buildBar() {
    bar = document.createElement('div');
    bar.id = 'draw-bar'; bar.className = 'hidden';
    bar.innerHTML =
      '<span class="db-hint"></span>' +
      '<label class="db-color" title="Colour"><input type="color" value="#ffffff"></label>' +
      '<label class="db-width" title="Brush width"><input type="range" min="1" max="40" value="8"></label>' +
      '<button class="db-undo" type="button">Undo</button>' +
      '<button class="db-done" type="button">Done</button>' +
      '<button class="db-cancel" type="button">Cancel</button>';
    document.body.appendChild(bar);
    bar.querySelector('.db-color input').addEventListener('input', function (e) { FM.drawTool.color = e.target.value; redraw(); });
    bar.querySelector('.db-width input').addEventListener('input', function (e) { FM.drawTool.stroke = +e.target.value; redraw(); });
    bar.querySelector('.db-undo').addEventListener('click', function () { FM.drawTool.points.pop(); redraw(); updateBar(); });
    bar.querySelector('.db-done').addEventListener('click', finish);
    bar.querySelector('.db-cancel').addEventListener('click', stop);
  }

  FM.startDraw = function (mode) {
    if (!overlay) FM.drawTools && FM.drawTools.init();
    if (!overlay) return;
    FM.drawTool.active = true; FM.drawTool.mode = mode; FM.drawTool.points = []; drawing = false;
    if (FM.selectLayer) FM.selectLayer(null);
    document.body.classList.add('drawing');
    syncOverlay();
    overlay.style.display = 'block';
    redraw();
    bar.classList.remove('hidden');
    bar.querySelector('.db-width').style.display = mode === 'freehand' ? '' : 'none';
    updateBar();
    if (FM.toast) FM.toast(mode === 'freehand' ? 'Freehand: draw on the canvas' : 'Vector: tap points, then Done', 2600);
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
      window.addEventListener('resize', function () { if (FM.drawTool.active) syncOverlay(), redraw(); });
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
