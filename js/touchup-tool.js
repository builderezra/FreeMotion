/* FreeMotion — Touch-up region picker (Remove Object).
 * Drag a box right on the playback area instead of nudging four x/y/w/h sliders. The effect's params
 * are PERCENT of the composition (top-left anchored) and the preview canvas displays the comp edge to
 * edge, so the mapping is just pointer-offset ÷ overlay-size × 100 — no transform math needed.
 * Writes params live while dragging: an animated param auto-keys at the playhead via FM.setProp
 * (same as every other editor); a static one stays a plain number. Done commits history; Cancel
 * restores the values snapshotted at open. A rAF loop keeps the overlay glued to the preview and
 * self-closes if the layer/effect/project disappears underneath it.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let active = null;              // { layerId, fx, snap }
  let overlay = null, bar = null, raf = 0;
  let box = null;                 // region in comp PERCENT { x, y, w, h }
  let drag = null;                // { mode, startPt, startBox }
  let lastSig = '';               // repaint only when the box or overlay size changed

  const KEYS = ['x', 'y', 'w', 'h'];
  const MIN = 2;                  // smallest box (percent) — keeps handles grabbable on a phone
  const preview = () => document.getElementById('preview');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cp = v => (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;   // deep-copy {kf:[…]} containers, pass numbers through
  function layer() { return active ? FM.scene.layers.find(l => l.id === active.layerId) : null; }

  // styles.css's .cb-* rules are scoped under #crop-bar, so mirror them for our own ids (styles.css untouched)
  function injectCSS() {
    if (document.getElementById('touchup-tool-css')) return;
    const st = document.createElement('style'); st.id = 'touchup-tool-css';
    st.textContent =
      '#touchup-overlay { position: absolute; z-index: 44; touch-action: none; cursor: crosshair; }' +
      '#touchup-bar { position: fixed; left: 50%; transform: translateX(-50%); bottom: max(18px, env(safe-area-inset-bottom)); z-index: 60; display: flex; align-items: center; gap: 8px; background: var(--panel); border: 1px solid var(--line); border-radius: 999px; padding: 8px 10px 8px 16px; box-shadow: 0 6px 24px rgba(0,0,0,.5); max-width: 94vw; }' +
      '#touchup-bar .cb-hint { font-size: 12px; line-height: 1.25; color: var(--text-faint); margin-right: 4px; flex: 1; min-width: 0; }' +   // long hint wraps inside the pill at 380px
      '#touchup-bar button { border: 1px solid var(--line); background: var(--panel-2); color: var(--text); border-radius: 999px; padding: 6px 14px; font-size: 12.5px; cursor: pointer; white-space: nowrap; }' +
      '#touchup-bar .cb-done { background: var(--accent); border-color: var(--accent); color: #06231d; font-weight: 700; }' +
      '#touchup-bar .cb-cancel { color: var(--text-dim); }' +
      // phones: the long hint can't share a row with two buttons — stack it above them
      '@media (max-width: 480px) { #touchup-bar { flex-wrap: wrap; justify-content: flex-end; border-radius: 16px; padding: 10px 12px; width: 94vw; } #touchup-bar .cb-hint { flex-basis: 100%; margin: 0; } }';
    document.head.appendChild(st);
  }

  function readBox() {
    const p = active.fx.params, t = FM.time;
    return { x: FM.evalProp(p.x, t) || 0, y: FM.evalProp(p.y, t) || 0, w: FM.evalProp(p.w, t) || 0, h: FM.evalProp(p.h, t) || 0 };
  }
  function writeBox() {
    const p = active.fx.params;
    KEYS.forEach(k => {
      const v = Math.round(box[k] * 10) / 10;
      if (FM.isAnimated(p[k])) FM.setProp(p, k, v, FM.time);   // auto-keys at the playhead
      else p[k] = v;
    });
    FM.requestRender();
  }

  // pointer event → comp percent (the overlay sits exactly over the preview canvas: comp (0,0) →
  // rect top-left, comp (W,H) → rect bottom-right)
  function evtPct(e) {
    const r = preview().getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / (r.width || 1) * 100, 0, 100), y: clamp((e.clientY - r.top) / (r.height || 1) * 100, 0, 100) };
  }

  const HANDLES = [['nw', 0, 0], ['n', .5, 0], ['ne', 1, 0], ['e', 1, .5], ['se', 1, 1], ['s', .5, 1], ['sw', 0, 1], ['w', 0, .5]];

  function draw() {
    const l = layer(), cv = preview();
    if (!active || !l || !cv || !overlay || (l.effects || []).indexOf(active.fx) < 0) { FM.touchupTool.close(); return; }
    const r = cv.getBoundingClientRect(), wr = overlay.parentElement.getBoundingClientRect();
    overlay.style.left = (r.left - wr.left) + 'px'; overlay.style.top = (r.top - wr.top) + 'px';
    overlay.style.width = r.width + 'px'; overlay.style.height = r.height + 'px';
    const sig = [box.x, box.y, box.w, box.h, r.width, r.height].join(',');
    if (sig === lastSig) return;   // rAF loop only needs to reposition unless something moved
    lastSig = sig;
    const dpr = window.devicePixelRatio || 1, W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (overlay.width !== W || overlay.height !== H) { overlay.width = W; overlay.height = H; }
    const g = overlay.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, r.width, r.height);
    const bx = box.x / 100 * r.width, by = box.y / 100 * r.height, bw = box.w / 100 * r.width, bh = box.h / 100 * r.height;
    // dim everything, then punch a hole where the box is
    g.fillStyle = 'rgba(6,9,14,.62)'; g.fillRect(0, 0, r.width, r.height);
    g.save(); g.globalCompositeOperation = 'destination-out';
    g.fillRect(bx, by, bw, bh);
    g.restore();
    // outline + handles
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.strokeRect(bx, by, bw, bh);
    g.fillStyle = '#fff';
    HANDLES.forEach(h => { const rr = (h[0].length === 2) ? 6 : 5; g.beginPath(); g.arc(bx + h[1] * bw, by + h[2] * bh, rr, 0, 6.2832); g.fill(); });
  }
  function tick() { if (!active) return; draw(); if (active) raf = requestAnimationFrame(tick); }   // draw() may have self-closed

  function hitHandle(e) {
    const cv = preview(), r = cv.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const bx = box.x / 100 * r.width, by = box.y / 100 * r.height, bw = box.w / 100 * r.width, bh = box.h / 100 * r.height;
    let best = null, bd = 18;   // generous touch threshold (display px)
    HANDLES.forEach(h => { const d = Math.hypot(bx + h[1] * bw - px, by + h[2] * bh - py); if (d < bd) { bd = d; best = h[0]; } });
    return best;
  }
  function insideBox(p) { return p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h; }

  function onDown(e) {
    if (!active) return;
    e.preventDefault(); e.stopPropagation();
    const id = hitHandle(e), p = evtPct(e);
    // On a handle → resize. Inside the box → move it. Otherwise → draw a fresh box from here.
    if (id) drag = { mode: id };
    else if (insideBox(p)) drag = { mode: 'move', startPt: p, startBox: Object.assign({}, box) };
    else drag = { mode: 'new', startPt: p };
    try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (!active || !drag) return;
    e.preventDefault();
    const p = evtPct(e);
    if (drag.mode === 'move') {
      box.x = clamp(drag.startBox.x + (p.x - drag.startPt.x), 0, 100 - box.w);
      box.y = clamp(drag.startBox.y + (p.y - drag.startPt.y), 0, 100 - box.h);
    } else if (drag.mode === 'new') {
      const s = drag.startPt;
      box.x = Math.min(s.x, p.x); box.y = Math.min(s.y, p.y);
      box.w = Math.max(MIN, Math.abs(p.x - s.x)); box.h = Math.max(MIN, Math.abs(p.y - s.y));
    } else {
      let lft = box.x, top = box.y, rgt = box.x + box.w, bot = box.y + box.h;
      if (drag.mode.indexOf('w') >= 0) lft = Math.min(p.x, rgt - MIN);
      if (drag.mode.indexOf('e') >= 0) rgt = Math.max(p.x, lft + MIN);
      if (drag.mode.indexOf('n') >= 0) top = Math.min(p.y, bot - MIN);
      if (drag.mode.indexOf('s') >= 0) bot = Math.max(p.y, top + MIN);
      box.x = lft; box.y = top; box.w = rgt - lft; box.h = bot - top;
    }
    writeBox();   // live preview — requestRender coalesces via rAF
  }
  function onUp(e) { if (drag) { drag = null; try { overlay.releasePointerCapture(e.pointerId); } catch (_) {} } }

  function done() {
    teardown();
    if (FM.history) FM.history.commit();
    if (FM.inspector) FM.inspector.refresh();
  }
  function cancel() {
    const a = active; teardown();
    if (a) { KEYS.forEach(k => { a.fx.params[k] = a.snap[k]; }); }   // restore static AND animated containers as snapshotted
    FM.requestRender();
    if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();   // drop any auto-keyed dots the drag inserted
    if (FM.inspector) FM.inspector.refresh();
  }
  function teardown() {
    active = null; drag = null; lastSig = '';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay); overlay = null;
    if (bar && bar.parentElement) bar.parentElement.removeChild(bar); bar = null;
  }

  FM.touchupTool = {
    isOpen() { return !!active; },
    open(layerId, fxRef) {
      if (active) FM.touchupTool.close();
      const l = FM.scene.layers.find(x => x.id === layerId);
      if (!l || !fxRef || !fxRef.params) return;
      injectCSS();
      if (FM.selectLayer) FM.selectLayer(l.id);
      active = { layerId: layerId, fx: fxRef, snap: { x: cp(fxRef.params.x), y: cp(fxRef.params.y), w: cp(fxRef.params.w), h: cp(fxRef.params.h) } };
      box = readBox();   // animated region shows its value at the playhead
      const seeded = box.w < MIN || box.h < MIN;
      if (seeded) box = { x: 35, y: 35, w: 30, h: 30 };   // degenerate params → seed a visible centre box
      const wrap = document.getElementById('canvas-wrap');
      overlay = document.createElement('canvas'); overlay.id = 'touchup-overlay';
      wrap.appendChild(overlay);
      overlay.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      bar = document.createElement('div'); bar.id = 'touchup-bar';
      bar.innerHTML = '<span class="cb-hint">Drag the box over what you want removed</span><button class="cb-cancel" type="button">Cancel</button><button class="cb-done" type="button">Done</button>';
      document.body.appendChild(bar);
      bar.querySelector('.cb-cancel').addEventListener('click', cancel);
      bar.querySelector('.cb-done').addEventListener('click', done);
      if (seeded) writeBox();   // only push the seed back — opening then Done must not touch clean params
      tick();       // keeps the overlay anchored + self-closes if layer/effect/project vanishes
    },
    close() { if (active) cancel(); },
  };
})(window.FM);
