/* FreeMotion — Motion path: on-canvas trajectory editor for position keyframes.
 * Draws the layer's REAL evaluated (x,y) trajectory (evalProp sampled over the union keyframe span,
 * so spatial-tangent curves show live), a draggable dot at each keyframe time in the UNION of the
 * x/y keyframe times, and — for the selected dot — its bezier tangent handles.
 * Tangent convention (must match scene.js evalProp + smoothPathTangents): k.ti / k.to are ×3 Hermite
 * tangents — the VELOCITY at the keyframe, /3. Bezier↔Hermite (m = 3(c1−c0) at the start, 3(c3−c2) at
 * the end) puts the outgoing control point at P1 = v + to but the incoming one at P2 = v − ti, so the
 * in-handle draws/drags at v − ti (a smooth keyframe, ti === to, then shows its two handles COLLINEAR
 * on opposite sides of the dot, as it must). A zero-length handle sits under its dot and is NOT
 * hit-testable (the dot wins, so a fresh path is still draggable) — "Smooth path" is the entry point
 * that pulls tangents out for adjusting.
 * Unparented layers only: their x/y are project px, the same space the preview canvas draws in, so
 * screen<->project mapping is just the display scale (a parented layer's x/y live in parent space).
 * The overlay covers #canvas-wrap, which the preview canvas fills exactly — so a keyframe positioned
 * outside the composition frame is off-overlay and not grabbable; move it via Move & Transform instead.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const EPS = 1e-3;           // keyframe-time tolerance — same as scene.js upsert/hasKeyframeAt
  let activeId = null;        // layer id being edited
  let overlay = null, bar = null, raf = 0;
  let selT = null;            // selected dot's keyframe TIME (identity survives external kf edits)
  let drag = null;            // { kind: 'dot'|'in'|'out', t, did }

  const preview = () => document.getElementById('preview');
  function layer() { return activeId ? FM.scene.layers.find(l => l.id === activeId) : null; }

  // screen px ↔ project(canvas) px — the preview canvas is sized to project px (app.js resizeCanvas),
  // so the only mapping is the on-screen display scale (same trick as mask-tool.js).
  function dispScale() { const cv = preview(), r = cv.getBoundingClientRect(); return r.width / cv.width || 1; }
  function evtToProj(e) {
    const cv = preview(), r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
  }
  function clampN(v) { v = +v; return isFinite(v) ? Math.max(-32768, Math.min(32768, v)) : 0; }
  function r2(v) { return Math.round(v * 100) / 100; }

  function axisKf(l, key) { const p = l.transform[key]; return (FM.isAnimated(p) && p.kf.length) ? p.kf : null; }
  function unionTimes(l) {
    const out = [];
    ['x', 'y'].forEach(key => {
      const kf = axisKf(l, key);
      if (kf) kf.forEach(k => { const t = +k.t; if (isFinite(t) && !out.some(u => Math.abs(u - t) < EPS)) out.push(t); });
    });
    return out.sort((a, b) => a - b);
  }
  function kfAt(l, key, t) { const kf = axisKf(l, key); return kf ? kf.find(k => Math.abs(k.t - t) < EPS) : null; }
  function posAt(l, t) { return { x: clampN(FM.evalProp(l.transform.x, t)), y: clampN(FM.evalProp(l.transform.y, t)) }; }
  function tanAt(l, t) {
    // Number.isFinite semantics, same as evalProp's guard — the coercing global isFinite accepted a
    // crafted string tangent ("500"), so the editor drew a handle the renderer ignores.
    const kx = kfAt(l, 'x', t), ky = kfAt(l, 'y', t), n = v => (typeof v === 'number' && isFinite(v)) ? v : 0;
    return { ix: n(kx && kx.ti), iy: n(ky && ky.ti), ox: n(kx && kx.to), oy: n(ky && ky.to) };
  }

  // A tangent needs a keyframe to live on. Animated axis missing a kf at this union time → upsert its
  // current evaluated value (setProp). Fully static axis → seed a single-kf animated prop with the
  // static value (identical render; a lone kf evaluates to a constant).
  function ensureKf(l, key, t) {
    const tr = l.transform, p = tr[key];
    if (FM.isAnimated(p)) {
      let k = kfAt(l, key, t);
      if (!k) { FM.setProp(tr, key, clampN(FM.evalProp(p, t)), t); k = kfAt(l, key, t); }
      return k;
    }
    tr[key] = { kf: [{ t: t, v: (typeof p === 'number' && isFinite(p)) ? p : 0, e: 'linear' }] };
    if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
    return tr[key].kf[0];
  }

  /* ---------- drawing ---------- */
  function draw() {
    const l = layer(), cv = preview();
    if (!l || l.parent || !cv || !overlay) { FM.motionPath.stop(); return; }
    const times = unionTimes(l);
    if (!times.length) { FM.motionPath.stop(); return; }
    const r = cv.getBoundingClientRect(), wr = overlay.parentElement.getBoundingClientRect();
    overlay.style.left = '0px'; overlay.style.top = '0px';
    overlay.style.width = wr.width + 'px'; overlay.style.height = wr.height + 'px';
    const dpr = window.devicePixelRatio || 1, W = Math.max(1, Math.round(wr.width * dpr)), H = Math.max(1, Math.round(wr.height * dpr));
    if (overlay.width !== W || overlay.height !== H) { overlay.width = W; overlay.height = H; }
    const g = overlay.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, wr.width, wr.height);
    const k = dispScale(), ox = r.left - wr.left, oy = r.top - wr.top;
    const map = p => [ox + p.x * k, oy + p.y * k];
    // trajectory — sample the REAL evaluated path so Hermite curves (and eases) show live
    const t0 = times[0], t1 = times[times.length - 1], span = t1 - t0;
    if (span > 0) {
      const N = Math.max(48, Math.min(240, Math.round(span * 90)));
      g.beginPath();
      for (let i = 0; i <= N; i++) {
        const q = map(posAt(l, t0 + span * i / N));
        if (i === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]);
      }
      g.strokeStyle = 'rgba(41,217,187,.95)'; g.lineWidth = 1.5; g.stroke();
    }
    // tangent handles for the selected dot (under the dots so dots stay tappable)
    const selLive = selT != null && times.some(t => Math.abs(t - selT) < EPS);
    if (!selLive) selT = null;
    if (selT != null) {
      const p = posAt(l, selT), tn = tanAt(l, selT), q = map(p);
      const hi = map({ x: p.x - tn.ix, y: p.y - tn.iy });   // incoming control point is v − ti (see header)
      const ho = map({ x: p.x + tn.ox, y: p.y + tn.oy });
      g.strokeStyle = 'rgba(224,145,63,.9)'; g.lineWidth = 1.25;
      g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(hi[0], hi[1]); g.moveTo(q[0], q[1]); g.lineTo(ho[0], ho[1]); g.stroke();
      g.beginPath(); g.arc(ho[0], ho[1], 5, 0, 6.2832); g.fillStyle = '#e0913f'; g.fill(); g.strokeStyle = '#3a2408'; g.stroke();   // out = filled
      g.beginPath(); g.arc(hi[0], hi[1], 5, 0, 6.2832); g.fillStyle = 'rgba(10,14,20,.85)'; g.fill(); g.strokeStyle = '#e0913f'; g.stroke();   // in = hollow
    }
    // keyframe dots — the one at the playhead gets a ring
    const now = FM.time || 0;
    times.forEach(t => {
      const q = map(posAt(l, t)), isSel = selT != null && Math.abs(t - selT) < EPS;
      g.beginPath(); g.arc(q[0], q[1], isSel ? 7 : 6, 0, 6.2832);
      g.fillStyle = isSel ? '#29d9bb' : '#c7d2e2'; g.fill();
      g.strokeStyle = '#06231d'; g.lineWidth = 1.5; g.stroke();
      if (Math.abs(t - now) < EPS) { g.beginPath(); g.arc(q[0], q[1], 10.5, 0, 6.2832); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.5; g.stroke(); }
    });
  }
  function loop() { if (!activeId) return; draw(); raf = requestAnimationFrame(loop); }

  /* ---------- hit testing (project px; nearest of dots + the selected dot's handles wins) ---------- */
  function pick(pp) {
    const l = layer(), k = dispScale(), times = unionTimes(l);
    let best = null, bd = 20 / k;   // 20 CSS px radius = a 40px effective touch target
    times.forEach(t => { const p = posAt(l, t), d = Math.hypot(p.x - pp.x, p.y - pp.y); if (d < bd) { bd = d; best = { kind: 'dot', t: t }; } });
    if (selT != null && times.some(t => Math.abs(t - selT) < EPS)) {
      const p = posAt(l, selT), tn = tanAt(l, selT), thr = 20 / k, minOff = 8 / k;
      [['out', p.x + tn.ox, p.y + tn.oy, Math.hypot(tn.ox, tn.oy)],
       ['in', p.x - tn.ix, p.y - tn.iy, Math.hypot(tn.ix, tn.iy)]].forEach(h => {
        if (h[3] < minOff) return;   // zero-length handle hides under its dot — the dot must stay draggable
        const d = Math.hypot(h[1] - pp.x, h[2] - pp.y);
        if (d < thr && d < bd) { bd = d; best = { kind: h[0], t: selT }; }
      });
    }
    return best;
  }

  /* ---------- pointer ---------- */
  function onDown(e) {
    if (!activeId) return;
    e.preventDefault(); e.stopPropagation();
    const l = layer(); if (!l) return;
    const hit = pick(evtToProj(e));
    if (!hit) { if (selT != null) { selT = null; draw(); } return; }
    if (hit.kind === 'dot') selT = hit.t;
    drag = { kind: hit.kind, t: hit.t, did: false };
    draw();
    try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (!activeId || !drag) return;
    e.preventDefault();
    const l = layer(); if (!l) return;
    const pp = evtToProj(e), px = clampN(pp.x), py = clampN(pp.y);
    if (drag.kind === 'dot') {
      // moves the keyframes, never the playhead — FM.time is untouched by design.
      // ensureKf first: on an axis that is still a STATIC number, setProp would overwrite the static
      // value — every dot would move together on that axis. Seeding it as animated gives each dot its
      // own keyframe, which is the whole point of a path editor.
      ensureKf(l, 'x', drag.t); ensureKf(l, 'y', drag.t);
      FM.setProp(l.transform, 'x', Math.round(px), drag.t);
      FM.setProp(l.transform, 'y', Math.round(py), drag.t);
    } else {
      const kx = ensureKf(l, 'x', drag.t), ky = ensureKf(l, 'y', drag.t);
      if (!kx || !ky) return;
      if (drag.kind === 'out') { kx.to = r2(clampN(px - kx.v)); ky.to = r2(clampN(py - ky.v)); }
      else { kx.ti = r2(clampN(kx.v - px)); ky.ti = r2(clampN(ky.v - py)); }   // handle sits at v − ti
    }
    drag.did = true;
    FM.requestRender();
  }
  function onUp(e) {
    if (!drag) return;
    const did = drag.did; drag = null;
    if (did && FM.history) FM.history.commit();
    try { if (overlay) overlay.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  function onResize() { if (activeId) draw(); }

  /* ---------- bottom bar ---------- */
  function mkBtn(label, cls) {
    const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label;
    b.style.cssText = 'min-height:40px;min-width:40px;flex:0 0 auto;white-space:nowrap;border:1px solid var(--line);background:var(--panel-2);color:var(--text);border-radius:999px;padding:8px 16px;font-size:13px;cursor:pointer;';
    return b;
  }
  function buildBar() {
    if (!bar) return;
    bar.innerHTML = '';
    if (FM.smoothPathTangents) {
      const sm = mkBtn('Smooth path', 'mp-smooth');
      sm.addEventListener('click', () => { const l = layer(); if (!l) return; FM.smoothPathTangents(l); if (FM.history) FM.history.commit(); FM.requestRender(); draw(); });
      bar.appendChild(sm);
    }
    if (FM.clearPathTangents) {
      const st = mkBtn('Straighten', 'mp-straight');
      st.addEventListener('click', () => { const l = layer(); if (!l) return; FM.clearPathTangents(l); if (FM.history) FM.history.commit(); FM.requestRender(); draw(); });
      bar.appendChild(st);
    }
    const done = mkBtn('Done', 'mp-done');
    done.style.cssText += 'background:var(--accent);border-color:var(--accent);color:#06231d;font-weight:700;';
    done.addEventListener('click', () => FM.motionPath.stop());
    bar.appendChild(done);
  }

  function teardown() {
    activeId = null; drag = null; selT = null;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onUp, true);
    window.removeEventListener('resize', onResize);
    if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay); overlay = null;
    if (bar && bar.parentElement) bar.parentElement.removeChild(bar); bar = null;
    const fab = document.getElementById('add-fab');
    if (fab && fab._mpDisp !== undefined) { fab.style.display = fab._mpDisp; delete fab._mpDisp; }
  }

  FM.motionPath = {
    isActive() { return !!activeId; },
    open(layerId) {
      if (activeId) this.stop();
      if (FM.viewport && FM.viewport.isDefault && !FM.viewport.isDefault()) FM.viewport.reset();   // overlay lays out in screen px — a zoomed viewport double-scales it
      const l = FM.scene.layers.find(x => x.id === layerId);
      if (!l) { if (FM.toast) FM.toast('Layer not found'); return; }
      if (l.parent) { if (FM.toast) FM.toast('Motion path works on unparented layers'); return; }
      if (!(FM.isAnimated(l.transform.x) || FM.isAnimated(l.transform.y))) { if (FM.toast) FM.toast('Add position keyframes first'); return; }
      if (FM.playing && FM.pause) FM.pause();
      if (FM.selectLayer) FM.selectLayer(l.id);
      activeId = layerId; selT = null; drag = null;
      const wrap = document.getElementById('canvas-wrap');
      overlay = document.createElement('canvas'); overlay.id = 'mpath-overlay';
      overlay.style.cssText = 'position:absolute;z-index:44;touch-action:none;cursor:crosshair;';
      wrap.appendChild(overlay);
      overlay.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
      window.addEventListener('resize', onResize);
      bar = document.createElement('div'); bar.id = 'mpath-bar';
      bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:max(18px,env(safe-area-inset-bottom));z-index:60;display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:8px 10px;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:94vw;';
      document.body.appendChild(bar);
      // The green add-FAB shares the bottom strip and overlapped the Done pill at 380px — park it while
      // the editor owns the bottom of the screen (adding a layer mid-path-edit is not a flow anyway).
      const fab = document.getElementById('add-fab');
      if (fab) { fab._mpDisp = fab.style.display; fab.style.display = 'none'; }
      buildBar();
      loop();
      FM.requestRender();
      if (FM.toast) FM.toast('Drag dots to move keyframes · tap a dot for its handles', 2200);
    },
    stop() {
      if (!activeId) return;
      teardown();
      FM.requestRender();
      if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();   // flips the rail button's active state off
    },
    redraw() { if (activeId) draw(); },
  };
})(window.FM);
