/* FreeMotion — Timeline UI (AM-style): each layer is a row with a HEAD (eye/thumb/name/lock,
 * drag-to-reorder) + a clip LANE (colored bar, keyframes, trim grips, waveform). The timeline
 * IS the layer manager — there is no separate layers panel. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let rulerEl, tracksEl, playheadEl, innerEl, snaplineEl, loopRegionEl, timelineEl;
  let HEAD_W = 172;
  let zoom = 1;          // 1 = fit-to-width; >1 zooms in (lanes scroll horizontally, heads stay pinned)
  // AM-style fixed-centre playhead — now UNIVERSAL (phone AND desktop): the line (#tl-centerline) is
  // CSS-pinned at TRUE screen centre (left: 50vw) and NEVER moves; the content scrolls under it. PAD
  // shifts the ruler/clips/keyframes right so the current time lands exactly under that line —
  // PAD = (half the viewport) − head column. Left pad lets t=0 reach centre; the trailing pad in
  // applyInnerWidth() lets t=duration reach it too. (isPhone() below is kept only for TOUCH-input
  // behaviours like pinch-zoom and clip long-press — it no longer gates the playhead mechanic.)
  let PAD = 0, scrub = null, pinch = null; const pointers = new Map();
  // The scrollLeft value the playhead itself last wrote. A native 'scroll' whose scrollLeft matches this
  // was caused by us (time→scroll) and must be ignored; anything else is a real user scroll that should
  // DRIVE the playhead (so the view + FM.time can never decouple → no "click sends me to the start").
  let lastProgScroll = -1;
  const TRIM_EDGE = 46;     // px from a viewport edge that triggers auto-scroll while trimming
  let trimScrollRAF = 0;
  function isPhone() { return window.matchMedia('(max-width: 700px)').matches; }
  function fps() { return FM.scene.project.fps || 30; }
  function snapT(t) { const f = fps(); return Math.round(t * f) / f; }
  function recomputePad() { PAD = Math.max(0, window.innerWidth / 2 - HEAD_W); }
  function centreX() { return window.innerWidth / 2; }   // viewport-x the current time always sits at
  // NOTE: #tl-centerline is pinned ENTIRELY in CSS (left: 50vw). JS never positions it, so it
  // physically cannot move — reading getBoundingClientRect per-frame was what let it drift on real
  // iOS (URL-bar collapse shifts the viewport mid-drag). JS only scrolls the content under the line.
  function showSnap(t) { if (snaplineEl) { snaplineEl.style.left = (HEAD_W + PAD + t * pxPerSec()) + 'px'; snaplineEl.classList.remove('hidden'); } }
  function hideSnap() { if (snaplineEl) snaplineEl.classList.add('hidden'); }
  let dragging = false;
  let kfDrag = null;
  let trimDrag = null;
  let clipMove = null;   // dragging a clip body to reposition it in time
  let lpFiredAt = 0;     // when a header long-press fired — suppresses the trailing click/contextmenu
  let clipTap = null;    // touch: pending gesture on a clip (tap=select, drag=scrub, long-press=move)
  let snapping = true;   // magnet toggle: snap clip/trim edges to playhead / clip edges / 0
  const EASE_LABELS = { linear: 'Linear', easeIn: 'Ease In', easeOut: 'Ease Out', easeInOut: 'Ease In-Out', overshoot: 'Overshoot', anticipate: 'Anticipate' };

  // Snap a proposed clip start so the clip's start OR end lands on 0 / playhead / another clip edge.
  // Returns { v: snapped start, snapped: bool, guide: alignment time for the guide line }.
  function snapStart(layer, ns, pps) {
    if (!snapping) return { v: ns, snapped: false, guide: 0 };   // clip start may go NEGATIVE (AM: drag past 0); floor applied by the caller
    const snapPx = 7, dur = layer.duration;
    const starts = [0, FM.time], ends = [FM.time];
    FM.scene.layers.forEach(l => { if (l.id !== layer.id) { starts.push(l.start, l.start + l.duration); ends.push(l.start, l.start + l.duration); } });
    (FM.scene.project.markers || []).forEach(mk => { starts.push(mk.t); ends.push(mk.t); });
    let best = ns, bestD = snapPx / pps, snapped = false, guide = 0;
    starts.forEach(c => { if (Math.abs(ns - c) < bestD) { bestD = Math.abs(ns - c); best = c; snapped = true; guide = c; } });
    ends.forEach(c => { const s = c - dur; if (s >= 0 && Math.abs(ns - s) < bestD) { bestD = Math.abs(ns - s); best = s; snapped = true; guide = c; } });
    return { v: best, snapped: snapped, guide: guide };   // may be negative (start before 0); caller floors it
  }

  // Snap a single edge time (a trim grip) to 0 / playhead / another clip's edge.
  function snapEdge(layer, edge, pps) {
    if (!snapping) return { snapped: false, guide: edge };
    const snapPx = 7, cands = [0, FM.time];
    FM.scene.layers.forEach(l => { if (l.id !== layer.id) cands.push(l.start, l.start + l.duration); });
    (FM.scene.project.markers || []).forEach(mk => cands.push(mk.t));
    let best = edge, bestD = snapPx / pps, snapped = false;
    cands.forEach(c => { if (Math.abs(edge - c) < bestD) { bestD = Math.abs(edge - c); best = c; snapped = true; } });
    return { snapped: snapped, guide: best };
  }

  function deleteKeyframesAt(layer, tt) {
    const slots = [];
    Object.keys(layer.transform).forEach(k => slots.push({ c: layer.transform, k: k }));
    if (FM.isAnimated(layer.volume)) slots.push({ c: layer, k: 'volume' });   // keyframed audio level draws diamonds too
    (layer.effects || []).forEach(fx => { if (fx.params) Object.keys(fx.params).forEach(k => slots.push({ c: fx.params, k: k })); });
    slots.forEach(({ c, k }) => {
      const p = c[k];
      if (!FM.isAnimated(p)) return;
      const removed = p.kf.filter(kf => Math.abs(kf.t - tt) < 1e-3);
      if (!removed.length) return;
      p.kf = p.kf.filter(kf => Math.abs(kf.t - tt) >= 1e-3);
      if (p.kf.length === 0) c[k] = removed[0].v;   // last keyframe gone → revert to static
    });
  }

  // Copy/paste keyframes: snapshot value+easing of every animated prop with a keyframe at `tt`,
  // keyed by an ADDRESSING PATH (not a live object ref), then re-drop at the playhead onto the
  // CURRENTLY SELECTED layer. Path-keying survives the source prop reverting to static and lets
  // you copy on one layer and paste onto another.
  function propKey(layer, p) {
    if (layer.volume === p) return 'volume';
    for (const k of Object.keys(layer.transform)) if (layer.transform[k] === p) return 'transform.' + k;
    const fx = layer.effects || [];
    for (let i = 0; i < fx.length; i++) { const params = fx[i].params || {}; for (const k of Object.keys(params)) if (params[k] === p) return 'effect.' + i + '.' + k; }
    return null;
  }
  function resolveSlot(layer, key) {
    if (key === 'volume') return { c: layer, k: 'volume' };
    if (key.indexOf('transform.') === 0) return { c: layer.transform, k: key.slice(10) };
    const m = key.match(/^effect\.(\d+)\.(.+)$/);
    if (m) { const fx = (layer.effects || [])[parseInt(m[1], 10)]; if (fx && fx.params) return { c: fx.params, k: m[2] }; }
    return null;
  }
  function copyKfAt(layer, tt) {
    FM.kfClipboard = [];
    FM.animatedProps(layer).forEach(p => {
      const k = p.kf.find(kf => Math.abs(kf.t - tt) < 1e-3);
      if (k) { const key = propKey(layer, p); if (key) FM.kfClipboard.push({ key: key, v: k.v, e: k.e, bez: k.bez ? k.bez.slice() : null }); }
    });
    return FM.kfClipboard.length;
  }
  function pasteKfAtPlayhead() {
    if (!FM.kfClipboard || !FM.kfClipboard.length) return;
    const layer = FM.selectedLayer(FM.scene);
    if (!layer) return;
    const t = Math.round(FM.time * 1000) / 1000;
    FM.kfClipboard.forEach(en => {
      const slot = resolveSlot(layer, en.key);
      if (!slot) return;                                  // target lacks this effect/param → skip
      let p = slot.c[slot.k];
      if (!FM.isAnimated(p)) { p = { kf: [] }; slot.c[slot.k] = p; }   // create container if static/missing
      const hit = p.kf.find(k => Math.abs(k.t - t) < 1e-3);
      if (hit) { hit.v = en.v; hit.e = en.e; if (en.bez) hit.bez = en.bez.slice(); else delete hit.bez; }
      else { const nk = { t: t, v: en.v, e: en.e }; if (en.bez) nk.bez = en.bez.slice(); p.kf.push(nk); p.kf.sort((a, b) => a.t - b.t); }
    });
    FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit();
  }

  function shade(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    const f = pct / 100;
    const ch = (v) => Math.round(Math.max(0, Math.min(255, v + 255 * f)));
    const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function drawWaveform(canvas, peaks) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    const n = peaks.length, bw = W / n;
    for (let i = 0; i < n; i++) {
      const h = Math.max(1, peaks[i] * H * 0.9);
      ctx.fillRect(i * bw, (H - h) / 2, Math.max(0.6, bw * 0.7), h);
    }
  }

  // AM: a row of frame thumbnails along the clip bar. `frames` are ImageBitmaps; for an image clip it's
  // one frame (tiled); for video a handful of distinct frames cycled across the width.
  function drawFilmstrip(canvas, frames, m) {
    const ctx = canvas.getContext('2d'), H = canvas.height;
    ctx.clearRect(0, 0, canvas.width, H);
    const aspect = (m.width || 16) / (m.height || 9);
    const tileW = Math.max(18, Math.round(H * aspect));
    for (let x = 0, i = 0; x < canvas.width; x += tileW, i++) {
      const f = frames[i % frames.length];
      if (f) { try { ctx.drawImage(f, x, 0, tileW, H); } catch (e) {} }
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x + tileW - 1, 0, 1, H);   // frame divider
    }
  }

  // Pixels per second within the clip LANE. Fit-to-viewport at zoom 1; scaled by `zoom`.
  function laneViewW() { return Math.max(1, ((timelineEl ? timelineEl.clientWidth : (tracksEl ? tracksEl.clientWidth : 800)) || 800) - HEAD_W); }
  function pxPerSec() { return (laneViewW() / FM.scene.project.duration) * zoom; }
  // Widen the inner area so the lanes overflow + scroll (heads are sticky-pinned). viewport + content
  // pads both sides so t=0 AND t=duration can each scroll under the fixed centre line (50vw).
  function applyInnerWidth() {
    // re-read --head-w every rebuild so a state-driven head width (overview eye-only vs edit pill)
    // keeps PAD / clip-x / scrub math in sync (was only re-read on init + resize).
    HEAD_W = parseInt(getComputedStyle(document.body).getPropertyValue('--head-w'), 10) || HEAD_W;
    recomputePad();
    if (!innerEl) return;
    const content = FM.scene.project.duration * pxPerSec();
    innerEl.style.width = (window.innerWidth + content) + 'px';
  }

  // Map a clientX to project time, accounting for the head column + the PAD origin shift.
  function timeFromX(clientX) {
    const rect = innerEl.getBoundingClientRect();
    const x = clientX - rect.left - HEAD_W - PAD;
    const t = x / pxPerSec();
    return Math.max(0, Math.min(FM.scene.project.duration, t));
  }

  // timecode MM:SS:FF for a given time (frame-accurate)
  function tc(t) { const f = fps(); const tot = Math.round(t * f); const ff = tot % f; const s = Math.floor(tot / f); const mm = Math.floor(s / 60); const ss = s % 60; const p2 = n => (n < 10 ? '0' : '') + n; return p2(mm) + ':' + p2(ss) + ':' + p2(ff); }
  function buildRuler() {
    const dur = FM.scene.project.duration, pps = pxPerSec(), f = fps();
    // FRAME NOTCHES: a fine tick per frame (thinned so they stay >=5px apart; denser as you zoom in).
    const frameW = pps / f;
    let frameStep = 1; while (frameW * frameStep < 5) frameStep *= (frameStep < 5 ? 5 : 2);
    // MAJOR timecode ticks ~every 88px.
    const nice = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const majStep = nice.find(s => s * pps >= 88) || nice[nice.length - 1];
    let html = '';
    const totalFrames = Math.ceil(dur * f);
    for (let fr = 0; fr <= totalFrames; fr += frameStep) { const t = fr / f; html += '<div class="notch" style="left:' + (PAD + t * pps) + 'px"></div>'; }
    // Major ticks are LINES only — no numbers. The single centred timecode pill is the only readout
    // (Ezra: "I only want the numbers on the little counter in the middle").
    for (let t = 0; t <= dur + 1e-6; t += majStep) { html += '<div class="tick" style="left:' + (PAD + t * pps) + 'px"></div>'; }
    rulerEl.innerHTML = html;
    (FM.scene.project.markers || []).forEach(mk => {
      const el = document.createElement('div');
      el.className = 'tl-marker'; el.style.left = (PAD + mk.t * pps) + 'px'; el.title = (mk.label || 'Marker') + ' @ ' + mk.t.toFixed(2) + 's  (double-click to rename)';
      el.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        const input = document.createElement('input');
        input.className = 'marker-edit'; input.value = mk.label || ''; input.style.left = (PAD + mk.t * pps) + 'px';
        const commit = () => { if (!input.parentNode) return; mk.label = input.value.trim() || 'Marker'; input.remove(); FM.timeline.rebuild(); if (FM.history) FM.history.commit(); };
        input.addEventListener('pointerdown', (pv) => pv.stopPropagation());
        input.addEventListener('keydown', (kv) => { kv.stopPropagation(); if (kv.key === 'Enter') commit(); else if (kv.key === 'Escape') { input.remove(); FM.timeline.rebuild(); } });
        input.addEventListener('blur', commit);
        rulerEl.appendChild(input); input.focus(); input.select();
      });
      rulerEl.appendChild(el);
    });
  }

  function isSelected(id) { return id === FM.scene.selectedId || !!(FM.scene.selectedIds && FM.scene.selectedIds.indexOf(id) >= 0); }

  // group-membership helpers (cycle-safe parent walks)
  function inGroup(layer) {
    let pid = layer.parent, hops = 0;
    while (pid && hops++ < 64) { const p = FM.scene.layers.find(l => l.id === pid); if (!p) return false; if (p.type === 'group') return true; pid = p.parent; }
    return false;
  }
  function inSubtree(layer, gid) {
    let pid = layer.parent, hops = 0;
    while (pid && hops++ < 64) { if (pid === gid) return true; const p = FM.scene.layers.find(l => l.id === pid); if (!p) return false; pid = p.parent; }
    return false;
  }
  function hiddenByCollapse(layer) {
    let pid = layer.parent, hops = 0;
    while (pid && hops++ < 64) { const p = FM.scene.layers.find(l => l.id === pid); if (!p) return false; if (p.type === 'group' && p.collapsed) return true; pid = p.parent; }
    return false;
  }

  function buildHead(layer, index) {
    const head = document.createElement('div');
    head.className = 'track-head' + (isSelected(layer.id) ? ' sel' : '') + (layer.id === FM.scene.selectedId ? ' primary' : '');
    head.dataset.idx = index;   // reorder moved to the right-edge ≡ handle (pointer-based)

    const eye = document.createElement('span');
    eye.className = 'th-eye' + (layer.visible ? '' : ' off');
    eye.innerHTML = layer.visible
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 1 12s4 8 11 8a9 9 0 0 0 5.4-1.6"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';
    eye.title = layer.visible ? 'Hide layer' : 'Show layer';
    eye.addEventListener('click', (e) => { e.stopPropagation(); layer.visible = !layer.visible; FM.requestRender(); FM.timeline.rebuild(); if (FM.reconcileAudio) FM.reconcileAudio(); if (FM.history) FM.history.commit(); });

    const thumb = document.createElement('canvas');
    thumb.className = 'th-thumb'; thumb.width = 38; thumb.height = 24;
    FM.renderThumb(layer, thumb);

    const name = document.createElement('span');
    name.className = 'th-name'; name.textContent = layer.name; name.title = layer.name + '  (double-click to rename)';
    name.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.className = 'th-name-edit'; input.value = layer.name;
      input.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      input.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') input.blur(); else if (ev.key === 'Escape') { input.value = layer.name; input.blur(); } });
      input.addEventListener('blur', () => { const v = input.value.trim(); if (v && v !== layer.name) { layer.name = v; if (FM.history) FM.history.commit(); } FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); });
      name.replaceWith(input); input.focus(); input.select();
    });

    // (Solo "S" button removed per Ezra — was the per-layer "isolate this layer" toggle.)
    if (layer.type === 'group') {   // collapsible group row
      const chev = document.createElement('button');
      chev.className = 'th-chevron';
      chev.textContent = layer.collapsed ? '▸' : '▾';
      chev.title = layer.collapsed ? 'Expand group' : 'Collapse group';
      chev.addEventListener('click', (e) => { e.stopPropagation(); layer.collapsed = !layer.collapsed; FM.timeline.rebuild(); });
      head.appendChild(chev);
      head.classList.add('group-head');
    }
    if (inGroup(layer)) head.classList.add('in-group');
    head.append(eye, thumb, name);
    head.addEventListener('click', (e) => {
      if (Date.now() - lpFiredAt < 800) return;                 // the long-press that just fired isn't a tap (survives the DOM rebuild)
      if (FM.selectMode) { FM.toggleSelect(layer.id); FM.refreshAll(); return; }   // select-mode: taps toggle membership
      if (e.shiftKey || e.metaKey || e.ctrlKey) FM.toggleSelect(layer.id); else FM.selectLayer(layer.id);
    });
    // AM: HOLD the header cell (mouse OR touch) → multi-select mode; keep holding and DRAG up/down
    // to paint more rows into the selection. Reordering lives on the right-edge ≡ handle now, so a
    // mouse hold no longer conflicts with anything. Android's synthetic long-press contextmenu is
    // suppressed via the shared lpFiredAt window (see contextmenu handler).
    let lpTimer = null, lpStart = null;
    head.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('.th-eye') || e.target.closest('.th-chevron')) return;   // buttons stay buttons
      lpStart = { x: e.clientX, y: e.clientY };
      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => { lpTimer = null; beginPaintSelect(layer); }, 380);
    });
    head.addEventListener('pointermove', (e) => {
      if (lpTimer && lpStart && Math.hypot(e.clientX - lpStart.x, e.clientY - lpStart.y) > 10) { clearTimeout(lpTimer); lpTimer = null; }
    });
    head.addEventListener('pointerup', () => { clearTimeout(lpTimer); lpTimer = null; });
    head.addEventListener('pointercancel', () => { clearTimeout(lpTimer); lpTimer = null; });
    head.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); if (Date.now() - lpFiredAt < 800) return; FM.selectLayer(layer.id); if (FM.contextMenu && FM.layerMenuItems) FM.contextMenu.show(e.clientX, e.clientY, FM.layerMenuItems(layer)); });
    return head;
  }

  // Long-press fired on a header: enter select mode and PAINT-SELECT — every row the pointer passes
  // while held joins the selection (AM). No timeline rebuild mid-gesture (it would detach the node
  // under the pointer); highlights are applied directly and the full refresh runs on release.
  function beginPaintSelect(layer) {
    lpFiredAt = Date.now();
    FM.selectMode = true;
    if (!isSelected(layer.id)) FM.toggleSelect(layer.id, true);
    document.body.classList.add('sel-mode');
    syncPaintClasses();
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} }
    const seen = new Set([layer.id]);
    const stopScroll = ev => ev.preventDefault();   // keep the browser from panning instead of painting
    const move = (ev) => {
      const el2 = document.elementFromPoint(ev.clientX, ev.clientY);
      const hd = el2 && el2.closest ? el2.closest('.track-head') : null;
      if (!hd) return;
      const L = FM.scene.layers[parseInt(hd.dataset.idx, 10)];
      if (!L || seen.has(L.id)) return;
      seen.add(L.id);
      if (!isSelected(L.id)) FM.toggleSelect(L.id, true);
      syncPaintClasses();
      if (navigator.vibrate) { try { navigator.vibrate(5); } catch (_) {} }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('touchmove', stopScroll);
      lpFiredAt = Date.now();   // swallow the trailing click wherever it lands
      FM.refreshAll();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('touchmove', stopScroll, { passive: false });
  }
  function syncPaintClasses() {
    const sel = new Set(FM.selectionIds ? FM.selectionIds() : []);
    tracksEl.querySelectorAll('.track-head').forEach(h => {
      const L = FM.scene.layers[parseInt(h.dataset.idx, 10)];
      h.classList.toggle('sel', !!(L && sel.has(L.id)));
    });
    document.body.classList.toggle('sel-multi', sel.size >= 2);
  }

  // ≡ drag handle at each row's RIGHT edge (AM): press + drag vertically to reorder layers.
  // Pointer-based, so it works with mouse AND touch (the old HTML5 head-drag was desktop-only).
  function buildDragHandle(row, layer, index) {
    const h = document.createElement('button');
    h.className = 'row-drag';
    h.title = 'Drag to reorder';
    h.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    h.addEventListener('contextmenu', e => e.preventDefault());
    h.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      try { h.setPointerCapture(e.pointerId); } catch (_) {}
      const startY = e.clientY;
      let over = null, moved = false;
      const move = (ev) => {
        if (!moved && Math.abs(ev.clientY - startY) < 4) return;
        moved = true;
        row.classList.add('row-dragging');
        row.style.transform = 'translateY(' + (ev.clientY - startY) + 'px)';
        if (over) over.classList.remove('drop-target');
        row.style.pointerEvents = 'none';   // let elementFromPoint see the row underneath
        const el2 = document.elementFromPoint(ev.clientX, ev.clientY);
        row.style.pointerEvents = '';
        const r2 = el2 && el2.closest ? el2.closest('.track-row') : null;
        over = (r2 && r2 !== row) ? r2 : null;
        if (over) over.classList.add('drop-target');
      };
      const up = () => {
        h.removeEventListener('pointermove', move);
        h.removeEventListener('pointerup', up);
        h.removeEventListener('pointercancel', up);
        row.classList.remove('row-dragging');
        row.style.transform = '';
        if (over) {
          const hd = over.querySelector('.track-head');
          over.classList.remove('drop-target');
          const to = hd ? parseInt(hd.dataset.idx, 10) : NaN;
          if (moved && !isNaN(to) && FM.reorderLayer) FM.reorderLayer(index, to);
        }
      };
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
      h.addEventListener('pointercancel', up);
    });
    return h;
  }

  function buildLane(layer) {
    const pps = pxPerSec();
    const lane = document.createElement('div');
    lane.className = 'track-lane';

    const clip = document.createElement('div');
    clip.className = 'clip' + (isSelected(layer.id) ? ' sel' : '') + (layer.reversed ? ' reversed' : '') + (layer.type === 'group' ? ' group-bar' : '');
    clip.style.left = (PAD + layer.start * pps) + 'px';
    clip.style.width = Math.max(8, layer.duration * pps) + 'px';
    const col = layer.clipColor || '#3a5a8c';
    clip.style.background = 'linear-gradient(180deg, ' + shade(col, 8) + ', ' + shade(col, -20) + ')';
    clip.style.borderColor = shade(col, 24);
    clip.dataset.id = layer.id;

    // AM: each clip shows its NAME on the bar (the track-head becomes eye-only in the overview).
    // Hidden on the SELECTED clip (its name lives in the edit pill + it shows the ‹ › grip caps).
    const clabel = document.createElement('span');
    clabel.className = 'clip-label';
    clabel.textContent = layer.name;
    clip.appendChild(clabel);
    if (layer.speed && Math.abs(layer.speed - 1) > 1e-3) {
      const sb = document.createElement('span');
      sb.className = 'clip-speed';
      sb.textContent = (Number.isInteger(layer.speed) ? layer.speed : +layer.speed.toFixed(2)) + '×';
      clip.appendChild(sb);
    }
    if (layer.type === 'video') {
      const m = FM.media.get(layer.id);
      // trimmed-source indicator: a striped edge where there's more source beyond the trim
      if (m && isFinite(m.duration)) {
        const sp = layer.speed || 1;
        if (layer.trimStart > 0.03) clip.appendChild(Object.assign(document.createElement('div'), { className: 'clip-trim l' }));
        if (layer.trimStart + layer.duration * sp < m.duration - 0.05) clip.appendChild(Object.assign(document.createElement('div'), { className: 'clip-trim r' }));
      }
    }
    // AM: video + image clips show a FILMSTRIP of frames on the bar (distinct frames for video; the
    // photo, tiled, for an image). Built lazily + cached on the media record (m.stripFrames).
    if (layer.type === 'video' || layer.type === 'image') {
      const m = FM.media.get(layer.id);
      if (m && m.el) {
        const hasPicture = layer.type === 'image' || (m.width > 0 && m.height > 0);
        if (hasPicture) {
          const strip = document.createElement('canvas');
          strip.className = 'clip-filmstrip';
          // Cap the backing width: duration*pps is unbounded (long clip × deep zoom) and a canvas wider
          // than ~16384px renders BLANK on iOS Safari. CSS keeps the clip full-width; only the off-screen
          // backing buffer is capped (slightly lower-res at extreme zoom, but actually visible). (#9)
          strip.width = Math.min(8192, Math.max(2, Math.round(Math.max(8, layer.duration * pps))));
          strip.height = 32;
          if (m.stripFrames && m.stripFrames.length) {
            drawFilmstrip(strip, m.stripFrames, m);
          } else if (m.stripFrames === undefined && !m._stripPending && !FM.playing && FM.buildClipStrip) {
            m._stripPending = true;   // build ONCE; m.stripFrames is then set (even to []) so this never re-fires
            FM.buildClipStrip(m, 8).then(() => { m._stripPending = false; FM.timeline.rebuild(); });
          }
          clip.appendChild(strip);
        } else if (m.file) {
          // a video with NO picture (used purely for audio) → waveform, not a black filmstrip
          if (m.waveform && m.waveform.length) {
            const wc = document.createElement('canvas');
            wc.className = 'clip-wave';
            wc.width = Math.min(8192, Math.max(2, Math.round(Math.max(8, layer.duration * pps))));   // cap backing width — iOS blanks canvases wider than ~16384px (#9)
            wc.height = 32;
            drawWaveform(wc, m.waveform);
            clip.appendChild(wc);
          } else if (!m._wfPending && !m.waveform) {
            FM.getWaveform(m).then(() => { FM.timeline.rebuild(); });
          }
        }
      }
    }
    clip.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      if (e.shiftKey || e.metaKey || e.ctrlKey) { FM.toggleSelect(layer.id); return; }   // multi-select, no drag
      const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (isTouch) {
        // AM model: touch-down does NOT select. A clean tap selects (pointerup); a horizontal drag
        // scrubs the playhead; an already-selected clip can be press-held to move it in time.
        clipTap = { layer: layer, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, downTime: timeFromX(e.clientX), baseTime: FM.time, moved: false, holdTimer: null, lastMoveAt: performance.now() };
        if (FM.scene.selectedId === layer.id) {
          // Press-and-HOLD (finger settled) on a selected clip grabs it to move in time. But a finger
          // that is still travelling is a SCRUB, not a hold — a slow "drag the line over the clips to
          // find a spot" gesture emits continuous pointermoves and may cover <8px in the first 350ms.
          // So only convert to a clip move once the finger has gone still for ~150ms; otherwise leave
          // clipTap intact and let it scrub. (Fixes the phone fixed-centre playhead "moves over clips".)
          const armHold = () => {
            clipTap.holdTimer = setTimeout(() => {
              if (!clipTap || clipTap.moved) return;
              if (performance.now() - clipTap.lastMoveAt > 150) {
                clipMove = { layer: layer, startX: clipTap.startX, origStart: layer.start, moved: false, downTime: clipTap.downTime, group: [] };
                clipTap = null;
                if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
              } else {
                armHold();   // finger still moving → keep waiting for it to settle
              }
            }, 350);
          };
          armHold();
        }
        innerEl.setPointerCapture && innerEl.setPointerCapture(e.pointerId);
        if (FM.playing) FM.pause();
        return;
      }
      // --- desktop (mouse): select immediately + set up clip-move (unchanged) ---
      const selIds = FM.selectionIds ? FM.selectionIds() : [];
      let group = [];
      if (selIds.length > 1 && selIds.indexOf(layer.id) >= 0) {
        // dragging part of a multi-selection → keep the set, make this clip primary, move them together
        if (FM.scene.selectedId !== layer.id) { FM.scene.selectedId = layer.id; if (FM.inspector) FM.inspector.refresh(); FM.timeline.rebuild(); }
        group = selIds.filter(id => id !== layer.id).map(id => { const l = FM.layerById(FM.scene, id); return l ? { layer: l, origStart: l.start } : null; }).filter(Boolean);
      } else {
        FM.selectLayer(layer.id);
      }
      clipMove = { layer: layer, startX: e.clientX, origStart: layer.start, moved: false, downTime: timeFromX(e.clientX), group: group };
      innerEl.setPointerCapture && innerEl.setPointerCapture(e.pointerId);
      if (FM.playing) FM.pause();
    });
    clip.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); FM.selectLayer(layer.id); if (FM.contextMenu && FM.layerMenuItems) FM.contextMenu.show(e.clientX, e.clientY, FM.layerMenuItems(layer)); });
    clip.addEventListener('dblclick', (e) => { e.stopPropagation(); FM.selectLayer(layer.id); if (FM.inspector && FM.inspector.openCategory) FM.inspector.openCategory('element'); });
    ['left', 'right'].forEach(edge => {
      const grip = document.createElement('div');
      grip.className = 'clip-grip ' + edge;
      grip.title = 'Trim ' + edge + ' edge';
      grip.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault();
        const m = FM.media.get(layer.id);
        trimDrag = { layer: layer, edge: edge, startX: e.clientX, lastX: e.clientX, startScroll: timelineEl ? timelineEl.scrollLeft : 0, start: layer.start, dur: layer.duration, trim: layer.trimStart, srcDur: (m && m.duration) ? m.duration : Infinity, type: layer.type };
        FM.selectLayer(layer.id);
        if (FM.playing) FM.pause();
      });
      clip.appendChild(grip);
    });
    lane.appendChild(clip);

    // keyframe diamonds for the selected layer (absolute project time, lane-relative px)
    if (layer.id === FM.scene.selectedId) {
      const times = new Set();
      FM.animatedProps(layer).forEach(p => p.kf.forEach(kf => times.add(Math.round(kf.t * 1000) / 1000)));
      times.forEach(tt => {
        const dot = document.createElement('div');
        // colour the diamond by the easing of the keyframe(s) at this time
        let dotEase = null;
        for (const p of FM.animatedProps(layer)) {
          const hit = p.kf.find(kf => Math.abs(kf.t - tt) < 1e-3); if (hit) { dotEase = hit.e || (hit.bez ? 'custom' : 'linear'); break; }
        }
        const easeClass = dotEase === 'hold' ? 'ease-hold'
          : dotEase === 'linear' ? 'ease-linear'
            : (dotEase === 'overshoot' || dotEase === 'anticipate') ? 'ease-back'
              : dotEase === 'custom' ? 'ease-custom' : 'ease-smooth';
        dot.className = 'kf-dot ' + easeClass;
        dot.style.left = (PAD + tt * pps) + 'px';
        dot.title = 'Drag to retime · double-click to delete';
        dot.addEventListener('pointerdown', (e) => {
          e.stopPropagation(); e.preventDefault();
          const kfs = [];
          FM.animatedProps(layer).forEach(p => p.kf.forEach(kf => { if (Math.abs(kf.t - tt) < 1e-3) kfs.push(kf); }));
          kfDrag = { layer: layer, kfs: kfs, dot: dot };
          if (FM.playing) FM.pause();
        });
        dot.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          deleteKeyframesAt(layer, tt);
          FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit();
        });
        dot.addEventListener('contextmenu', (e) => {
          e.preventDefault(); e.stopPropagation();
          if (!FM.contextMenu || !FM.EASE_PRESETS) return;
          const items = Object.keys(FM.EASE_PRESETS).map(key => ({
            label: EASE_LABELS[key] || key,
            action: () => {
              FM.animatedProps(layer).forEach(p => p.kf.forEach(kf => { if (Math.abs(kf.t - tt) < 1e-3) { kf.bez = FM.EASE_PRESETS[key].slice(); kf.e = key; } }));
              FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit();
            },
          }));
          items.push({ sep: true });
          items.push({
            label: 'Hold (step)',
            action: () => {
              FM.animatedProps(layer).forEach(p => p.kf.forEach(kf => { if (Math.abs(kf.t - tt) < 1e-3) { kf.e = 'hold'; delete kf.bez; } }));
              FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit();
            },
          });
          // Loop the whole layer's keyframed animation past its last keyframe (applies to all animated props).
          items.push({ sep: true });
          const curLoop = layer.loopMode || 'none';   // layer-level source of truth (props synced in rebuild)
          [['none', 'Loop: off'], ['cycle', 'Loop: cycle'], ['pingpong', 'Loop: ping-pong']].forEach(pair => {
            items.push({
              label: (curLoop === pair[0] ? '✓ ' : '') + pair[1],
              action: () => {
                layer.loopMode = pair[0];
                FM.animatedProps(layer).forEach(p => { p.loopMode = pair[0]; });
                FM.requestRender(); if (FM.history) FM.history.commit();
              },
            });
          });
          items.push({ sep: true });
          items.push({ label: 'Copy keyframe', action: () => copyKfAt(layer, tt) });
          if (FM.kfClipboard && FM.kfClipboard.length) items.push({ label: 'Paste keyframe at playhead', action: () => pasteKfAtPlayhead() });
          FM.contextMenu.show(e.clientX, e.clientY, items);
        });
        dot.title = 'Drag to retime · right-click for easing · double-click to delete';
        lane.appendChild(dot);
      });
    }
    return lane;
  }

  function buildTracks() {
    tracksEl.innerHTML = '';
    if (!FM.scene.layers.length) {
      const empty = document.createElement('div');
      empty.className = 'tl-empty'; empty.textContent = 'No layers yet — Import media, add Text, Captions, or a Sample clip.';
      tracksEl.appendChild(empty);
      return;
    }
    // AM phone-edit: when a clip is selected on a phone, show ONLY that clip's row
    // (the others hide so the property options can dock right under it).
    // Never solo during multi-select / select-mode — you need every row visible to build the set.
    const multiSel = FM.selectMode || (FM.scene.selectedIds && FM.scene.selectedIds.length > 1);
    const soloId = (!multiSel && FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone() && FM.scene.selectedId
      && FM.scene.layers.some(l => l.id === FM.scene.selectedId)) ? FM.scene.selectedId : null;
    const gctx = FM.groupContext;
    FM.scene.layers.forEach((layer, index) => {
      if (soloId && layer.id !== soloId) return;
      if (gctx) { if (!inSubtree(layer, gctx)) return; }   // Edit Group: only the group's members, fully expanded
      else if (hiddenByCollapse(layer) && layer.id !== soloId) return;   // members of a collapsed group stay off-screen (except the phone-solo row itself)
      const row = document.createElement('div');
      row.className = 'track-row';
      row.append(buildHead(layer, index), buildLane(layer));
      row.appendChild(buildDragHandle(row, layer, index));   // ≡ right-edge reorder (AM)
      tracksEl.appendChild(row);
    });
  }

  function beginScrub(e) {
    dragging = true;
    innerEl.setPointerCapture && innerEl.setPointerCapture(e.pointerId);
    if (FM.playing) FM.pause();
  }

  // Apply a trim to trimDrag.layer for a pointer at clientX. SCROLL-AWARE: the delta counts both finger
  // movement AND how far the timeline has auto-scrolled since the grab, so when the view scrolls out from
  // under the finger the edge keeps tracking it (the screen-edge position stays put while the clip grows).
  function applyTrimAt(clientX) {
    if (!trimDrag) return;
    const fps = FM.scene.project.fps || 30, pps = pxPerSec();
    let dt = Math.round((((clientX - trimDrag.startX) + (timelineEl.scrollLeft - trimDrag.startScroll)) / pps) * fps) / fps;
    const L = trimDrag.layer, sp = L.speed || 1;
    const movingEdge = trimDrag.edge === 'right' ? (trimDrag.start + trimDrag.dur + dt) : (trimDrag.start + dt);
    const se = snapEdge(L, movingEdge, pps);
    if (se.snapped) { dt += (se.guide - movingEdge); showSnap(se.guide); } else hideSnap();
    if (trimDrag.edge === 'right') {
      let nd = Math.max(0.1, trimDrag.dur + dt);
      if (L.type === 'video' && isFinite(trimDrag.srcDur)) nd = Math.min(nd, (trimDrag.srcDur - L.trimStart) / sp);
      L.duration = nd;
    } else {
      let delta = dt;
      if (trimDrag.start + delta < 0) delta = -trimDrag.start;
      if (trimDrag.dur - delta < 0.1) delta = trimDrag.dur - 0.1;
      if (L.type === 'video' && trimDrag.trim + delta * sp < 0) delta = -trimDrag.trim / sp;
      L.start = trimDrag.start + delta;
      L.duration = trimDrag.dur - delta;
      if (L.type === 'video') L.trimStart = trimDrag.trim + delta * sp;
    }
    const pps2 = pxPerSec();
    const clipEl = tracksEl.querySelector('.clip[data-id="' + L.id + '"]');
    if (clipEl) { clipEl.style.left = (PAD + L.start * pps2) + 'px'; clipEl.style.width = Math.max(8, L.duration * pps2) + 'px'; }
    // widen the scroller (current pps — no rescale) so the extending edge + auto-scroll have room
    if (innerEl) {
      const need = window.innerWidth + Math.max(FM.scene.project.duration, L.start + L.duration) * pps2 + 120;
      if ((parseFloat(innerEl.style.width) || 0) < need - 0.5) innerEl.style.width = need + 'px';
    }
    FM.requestRender();
  }

  // While a trim finger sits near a viewport edge, scroll the timeline so the clip can keep extending past
  // the screen (AM behaviour). Re-arms via rAF until the finger leaves the edge or the drag ends.
  function trimEdgeScroll() {
    trimScrollRAF = 0;
    if (!trimDrag || !timelineEl) return;
    const rect = timelineEl.getBoundingClientRect();
    const x = trimDrag.lastX, headRight = rect.left + HEAD_W, MAX = 22;
    let v = 0;
    if (x > rect.right - TRIM_EDGE) v = Math.min(MAX, ((x - (rect.right - TRIM_EDGE)) / TRIM_EDGE) * MAX);
    else if (x < headRight + TRIM_EDGE) v = -Math.min(MAX, (((headRight + TRIM_EDGE) - x) / TRIM_EDGE) * MAX);
    if (v === 0) return;
    if (v > 0 && innerEl) {   // ensure room to the right before scrolling into it
      const need = timelineEl.scrollLeft + timelineEl.clientWidth + v + 120;
      if ((parseFloat(innerEl.style.width) || 0) < need) innerEl.style.width = need + 'px';
    }
    timelineEl.scrollLeft = Math.max(0, timelineEl.scrollLeft + v);
    applyTrimAt(trimDrag.lastX);
    trimScrollRAF = requestAnimationFrame(trimEdgeScroll);
  }

  FM.timeline = {
    init() {
      rulerEl = document.getElementById('tl-ruler');
      tracksEl = document.getElementById('tl-tracks');
      playheadEl = document.getElementById('tl-playhead');
      innerEl = document.getElementById('tl-inner');
      timelineEl = document.getElementById('timeline');
      HEAD_W = parseInt(getComputedStyle(document.body).getPropertyValue('--head-w'), 10) || 172;
      const zo = document.getElementById('btn-zoomout'), zi = document.getElementById('btn-zoomin');
      if (zo) zo.addEventListener('click', () => this.zoomBy(1 / 1.5));
      if (zi) zi.addEventListener('click', () => this.zoomBy(1.5));
      const sn = document.getElementById('btn-snap');
      if (sn) sn.addEventListener('click', () => { snapping = !snapping; sn.classList.toggle('active', snapping); });
      // Cmd/Ctrl + wheel zooms the timeline
      if (timelineEl) timelineEl.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, timeFromX(e.clientX)); } }, { passive: false });
      // FIXED-CENTRE CONTRACT: whatever sits under the centre line IS the current time. A plain horizontal
      // scroll (trackpad / scrollbar / wheel) therefore MOVES the playhead. Without this, scrolling left
      // scrollLeft decoupled from FM.time, so the next render (selecting/deselecting a clip) snapped the
      // view back to the playhead — the "I'm 40s in, click a clip, get sent to the start" bug.
      if (timelineEl) timelineEl.addEventListener('scroll', () => {
        if (trimDrag || clipMove || kfDrag || scrub) return;            // those drive scroll/time themselves
        const sL = timelineEl.scrollLeft;
        if (Math.abs(sL - lastProgScroll) < 1) return;                  // our own playhead-driven write → ignore (no feedback loop)
        lastProgScroll = sL;
        FM.setTime(snapT(Math.max(0, Math.min(FM.scene.project.duration, sL / pxPerSec()))));
      }, { passive: true });
      // two-finger PINCH zoom — tracked on window in CAPTURE phase so clip/ruler stopPropagation can't hide it
      const pdist = () => { const p = [...pointers.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
      const pmidX = () => { const p = [...pointers.values()]; return (p[0].x + p[1].x) / 2; };
      window.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch' || !timelineEl || !(e.target instanceof Node) || !timelineEl.contains(e.target)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) { dragging = false; scrub = null; clipTap = null; clipMove = null; trimDrag = null; kfDrag = null; hideSnap(); pinch = { startDist: pdist(), startZoom: zoom, anchorTime: timeFromX(pmidX()) }; if (FM.playing) FM.pause(); }
      }, true);
      window.addEventListener('pointermove', (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pointers.size === 2) { if (e.cancelable) e.preventDefault(); FM.timeline.setZoom(pinch.startZoom * (pdist() / Math.max(1, pinch.startDist)), pinch.anchorTime); }
      }, true);
      const endPtr = (e) => { if (!pointers.has(e.pointerId)) return; pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; };
      window.addEventListener('pointerup', endPtr, true);
      window.addEventListener('pointercancel', endPtr, true);
      snaplineEl = document.createElement('div'); snaplineEl.id = 'tl-snapline'; snaplineEl.className = 'hidden';
      innerEl.appendChild(snaplineEl);
      loopRegionEl = document.createElement('div'); loopRegionEl.id = 'tl-loopregion'; loopRegionEl.className = 'hidden';
      innerEl.appendChild(loopRegionEl);

      // Fixed-centre playhead → scrub is a RELATIVE grab-and-slide for BOTH mouse and touch (the line
      // stays put, the content moves under it). A click without a drag seeks to where it was clicked.
      const onDown = (e, fromLane) => {
        // baseTime = the playhead time RIGHT NOW. The scrub slides relative to it, so it never depends
        // on timelineEl.scrollLeft (which can decouple from the playhead after a manual horizontal scroll
        // or a resize-clamp — and a tiny tap-jitter then computed (0 - dx)/pps → 0 = jump to START).
        scrub = { startX: e.clientX, startY: e.clientY, baseTime: FM.time, startScrollTop: timelineEl.scrollTop, axis: null, moved: false, downTime: snapT(timeFromX(e.clientX)), fromLane: !!fromLane };
        beginScrub(e);
      };
      // Grab ANYWHERE the timeline could be — the ruler, the lanes, AND the empty space above/below the
      // clips (the whole scroller) — to scrub on drag / deselect on tap (AM behaviour). Clips, trim grips,
      // keyframes, track heads and markers own their own pointers, so let those through untouched.
      timelineEl.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
        if (e.target.closest('.clip, .clip-grip, .kf-dot, .track-head, .tl-marker, .marker-edit, input, button, select, textarea')) return;
        onDown(e);
      });
      // right-click ruler → add / remove a marker
      rulerEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!FM.contextMenu) return;
        const P = FM.scene.project; if (!P.markers) P.markers = [];
        const t = timeFromX(e.clientX);
        const near = P.markers.find(m => Math.abs(m.t - t) < 10 / pxPerSec());
        const items = near
          ? [{ label: 'Remove marker', danger: true, action: () => { P.markers = P.markers.filter(m => m !== near); FM.timeline.rebuild(); if (FM.history) FM.history.commit(); } }]
          : [{ label: 'Add marker here', action: () => { P.markers.push({ t: Math.round(t * 100) / 100, label: 'Marker' }); FM.timeline.rebuild(); if (FM.history) FM.history.commit(); } }];
        if (P.markers.length > 1 || (P.markers.length === 1 && !near)) items.push({ label: 'Clear all markers', danger: true, action: () => { P.markers = []; FM.timeline.rebuild(); if (FM.history) FM.history.commit(); } });
        FM.contextMenu.show(e.clientX, e.clientY, items);
      });
      // (scrub/deselect on the lanes is handled by the #timeline pointerdown above)
      // right-click empty timeline → quick Add menu
      tracksEl.addEventListener('contextmenu', (e) => {
        if (!(e.target.classList.contains('track-lane') || e.target === tracksEl || e.target.classList.contains('tl-empty'))) return;
        e.preventDefault();
        if (!FM.contextMenu) return;
        const menu = [
          { label: 'Add text', action: () => FM.addTextLayer && FM.addTextLayer() },
          { label: 'Add rectangle', action: () => FM.addShapeLayer && FM.addShapeLayer('rect') },
          { label: 'Add ellipse', action: () => FM.addShapeLayer && FM.addShapeLayer('ellipse') },
          { label: 'Add caption track', action: () => FM.addCaptionLayer && FM.addCaptionLayer() },
          { label: 'Add null (rig control)', action: () => FM.addNullLayer && FM.addNullLayer() },
          { label: 'Add adjustment layer', action: () => FM.addAdjustmentLayer && FM.addAdjustmentLayer() },
          { label: 'Add camera', action: () => FM.addCameraLayer && FM.addCameraLayer() },
          { label: 'Add sample clip', action: () => FM.addSampleClip && FM.addSampleClip() },
        ];
        if (FM.clipboard && FM.clipboard.length) menu.push({ label: 'Paste (' + FM.clipboard.length + ')', action: () => FM.pasteClipboard && FM.pasteClipboard() });
        if (FM.kfClipboard && FM.kfClipboard.length) menu.push({ label: 'Paste keyframe(s) at playhead', action: () => pasteKfAtPlayhead() });
        menu.push({ sep: true });
        menu.push({ label: 'Import media…', action: () => { const fi = document.getElementById('file-input'); if (fi) fi.click(); } });
        FM.contextMenu.show(e.clientX, e.clientY, menu);
      });
      window.addEventListener('pointermove', (e) => {
        if (pinch) return;   // a 2-finger pinch is in progress → ignore any in-flight 1-finger drag math
        if (clipTap) {
          const dx = e.clientX - clipTap.startX, dy = e.clientY - clipTap.startY;
          const adx = Math.abs(dx), ady = Math.abs(dy);
          clipTap.lastMoveAt = performance.now();   // finger is travelling → not a settled hold (see armHold)
          // Tap vs scrub vs hold-to-move. A horizontal-dominant drag past a low threshold is a SCRUB:
          // commit early (and kill the long-press timer) so a slow deliberate "drag the line over the
          // clips" gesture — which can travel <8px in the first 350ms — isn't hijacked into a clip move.
          const scrubIntent = adx > 6 && adx > ady;
          if (!clipTap.moved && !scrubIntent && adx < 8 && ady < 8) return;   // still a potential tap / hold
          clipTap.moved = true;
          if (clipTap.holdTimer) { clearTimeout(clipTap.holdTimer); clipTap.holdTimer = null; }
          FM.setTime(snapT(clipTap.baseTime - (e.clientX - clipTap.startX) / pxPerSec()));   // relative drag-scrub (scrollLeft-independent)
          return;
        }
        if (clipMove) {
          const dx = e.clientX - clipMove.startX;
          if (!clipMove.moved && Math.abs(dx) < 4) return;   // movement threshold: distinguish click from drag
          clipMove.moved = true;
          // dragging a GROUP bar drags its members' time too (attach descendants once, lazily —
          // they then ride the existing multi-selection move mechanism below)
          if (clipMove.layer.type === 'group' && !clipMove._grpInit) {
            clipMove._grpInit = true;
            if (!clipMove.group) clipMove.group = [];
            const have = new Set(clipMove.group.map(g => g.layer.id));
            (FM.groupDescendants ? FM.groupDescendants(clipMove.layer.id) : []).forEach(l => { if (!have.has(l.id)) clipMove.group.push({ layer: l, origStart: l.start }); });
          }
          const pps = pxPerSec();
          // AM: a clip can be dragged PAST 0 into negative start — it keeps going (you just can't scroll
          // before 0 to see the hidden part). Floor it so at least a sliver stays at/after 0 (never vanishes).
          const floor = -(clipMove.layer.duration - 0.1);
          const raw = Math.max(floor, clipMove.origStart + dx / pps);
          const sr = e.shiftKey ? { v: raw, snapped: false, guide: 0 } : snapStart(clipMove.layer, raw, pps);   // Shift bypasses snap
          clipMove.layer.start = Math.max(floor, sr.v);
          if (sr.snapped) showSnap(sr.guide); else hideSnap();
          const clipEl = tracksEl.querySelector('.clip[data-id="' + clipMove.layer.id + '"]');
          if (clipEl) clipEl.style.left = (PAD + clipMove.layer.start * pps) + 'px';
          // group move: shift the other selected clips by the same delta (each floored to its own duration)
          const delta = clipMove.layer.start - clipMove.origStart;
          (clipMove.group || []).forEach(g => {
            g.layer.start = Math.max(-(g.layer.duration - 0.1), g.origStart + delta);
            const ge = tracksEl.querySelector('.clip[data-id="' + g.layer.id + '"]');
            if (ge) ge.style.left = (PAD + g.layer.start * pps) + 'px';
          });
          FM.requestRender();
          return;
        }
        if (trimDrag) {
          trimDrag.lastX = e.clientX;
          applyTrimAt(e.clientX);
          // Near a viewport edge? Start the auto-scroll loop so the clip can keep extending past the screen.
          const rect = timelineEl.getBoundingClientRect();
          if ((e.clientX > rect.right - TRIM_EDGE || e.clientX < rect.left + HEAD_W + TRIM_EDGE) && !trimScrollRAF) {
            trimScrollRAF = requestAnimationFrame(trimEdgeScroll);
          }
          return;
        }
        if (kfDrag) {
          const fps = FM.scene.project.fps || 30;
          let nt = Math.round(timeFromX(e.clientX) * fps) / fps;
          nt = Math.max(0, Math.min(FM.scene.project.duration, nt));
          kfDrag.kfs.forEach(kf => { kf.t = nt; });
          kfDrag.dot.style.left = (PAD + nt * pxPerSec()) + 'px';
          FM.requestRender();
          return;
        }
        if (dragging && scrub) {
          const dx = e.clientX - scrub.startX, dy = e.clientY - scrub.startY;
          // lock to an axis once the finger commits: a clearly-vertical drag pans the layer list,
          // otherwise it's a horizontal grab-scrub (the primary action, so it wins ties).
          if (!scrub.axis && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) scrub.axis = (Math.abs(dy) > Math.abs(dx) + 4) ? 'y' : 'x';
          if (scrub.axis === 'y') {
            timelineEl.scrollTop = scrub.startScrollTop - dy;                                  // vertical pan
          } else if (Math.abs(dx) > 3) {
            scrub.moved = true;
            FM.setTime(snapT(scrub.baseTime - dx / pxPerSec()));                               // horizontal grab-and-slide
          }
        }
      });
      window.addEventListener('pointerup', () => {
        if (trimScrollRAF) { cancelAnimationFrame(trimScrollRAF); trimScrollRAF = 0; }
        if (dragging && scrub && !scrub.moved) {
          // A TAP on the timeline (ruler OR empty lane) NEVER seeks — only a horizontal DRAG scrubs.
          // Tapping off any clip just deselects (revealing the Add menu / dropping the phone sheet).
          if (FM.scene.selectedId || (FM.scene.selectedIds && FM.scene.selectedIds.length)) FM.selectLayer(null);
        }
        dragging = false; scrub = null;
        if (clipTap) {
          const ct = clipTap; clipTap = null;
          if (ct.holdTimer) clearTimeout(ct.holdTimer);
          if (!ct.moved) FM.selectLayer(ct.layer.id);   // a deliberate tap selects (opens the property menu)
          return;
        }
        if (clipMove) {
          const cm = clipMove; clipMove = null; hideSnap();
          if (cm.moved) {
            if (FM.autoFitDuration) FM.autoFitDuration();   // fit comp to clips (grows or shrinks)
            FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
          }
          // else: a plain click already SELECTED the clip on pointerdown — never seek/scroll the timeline.
          return;
        }
        if (trimDrag) {
          if (FM.autoFitDuration) FM.autoFitDuration();   // fit comp to clips after a trim
          trimDrag = null; hideSnap();
          FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
          return;
        }
        if (kfDrag) {
          const layer = kfDrag.layer;
          // Re-sort every animated prop (transform AND effect params) so evalProp stays correct
          // after a keyframe is dragged past a neighbour in time, dropping any keyframe the drag
          // landed exactly on top of so two don't stack at one time.
          FM.dedupDraggedKfs(layer, kfDrag.kfs);
          kfDrag = null;
          FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
        }
      });
      window.addEventListener('pointercancel', () => {
        if (trimScrollRAF) { cancelAnimationFrame(trimScrollRAF); trimScrollRAF = 0; }
        if (clipTap && clipTap.holdTimer) clearTimeout(clipTap.holdTimer);
        clipTap = null; clipMove = null; trimDrag = null; kfDrag = null; dragging = false; scrub = null; pinch = null; pointers.clear(); hideSnap();
      });
      // re-read --head-w on resize so the slimmer phone track-head keeps clip-x / scrub math correct
      window.addEventListener('resize', () => { HEAD_W = parseInt(getComputedStyle(document.body).getPropertyValue('--head-w'), 10) || 172; this.rebuild(); });
    },

    rebuild() {
      if (!tracksEl) return;
      // Keep every animated prop in sync with its layer's loopMode so newly-keyframed props inherit
      // the loop setting instead of silently freezing at their last keyframe.
      FM.scene.layers.forEach(l => { if (l.loopMode && l.loopMode !== 'none') FM.animatedProps(l).forEach(p => { p.loopMode = l.loopMode; }); });
      applyInnerWidth();
      buildRuler();
      buildTracks();
      this.updateLoopRegion();
      this.updatePlayhead();
    },

    updateLoopRegion() {
      if (!loopRegionEl) return;
      const P = FM.scene.project, pps = pxPerSec();
      if (P.loopIn != null && P.loopOut != null && P.loopOut > P.loopIn) {
        loopRegionEl.style.left = (HEAD_W + PAD + P.loopIn * pps) + 'px';
        loopRegionEl.style.width = ((P.loopOut - P.loopIn) * pps) + 'px';
        loopRegionEl.classList.remove('hidden');
      } else loopRegionEl.classList.add('hidden');
    },

    updatePlayhead() {
      if (!tracksEl) return;
      const pps = pxPerSec();
      // UNIVERSAL fixed-centre (phone + desktop): #tl-centerline is a CSS-pinned static line at 50vw
      // that NEVER moves and JS never touches it — we only scroll the CONTENT so the current time sits
      // under it. (Relative drag-scrub also drives FM.time, which re-enters here to set scrollLeft.)
      const targetScroll = Math.max(0, FM.time * pps);
      if (timelineEl && !trimDrag && !clipMove && !kfDrag) {
        if (Math.abs(timelineEl.scrollLeft - targetScroll) > 0.5) timelineEl.scrollLeft = targetScroll;
        lastProgScroll = targetScroll;   // remember our own write so the resulting 'scroll' event is ignored
      }
      const t = FM.time;
      const sL = timelineEl ? timelineEl.scrollLeft : 0;
      tracksEl.querySelectorAll('.clip').forEach(clipEl => {
        const l = FM.layerById(FM.scene, clipEl.dataset.id);
        clipEl.classList.toggle('under-playhead', !!l && t >= l.start && t < l.start + l.duration);
        // AM: keep the clip NAME pinned to the clip's VISIBLE left edge as the timeline scrolls, so the
        // name stays readable even when the clip's start has scrolled off-screen. Pure math (no reflow).
        const label = clipEl.querySelector('.clip-label');
        if (label) {
          const base = clipEl.classList.contains('sel') ? 17 : 9;
          const off = sL - (parseFloat(clipEl.style.left) || 0);          // >0 → clip start is left of view
          const maxLeft = Math.max(base, (parseFloat(clipEl.style.width) || 0) - 34);
          label.style.left = Math.min(Math.max(base, off + base), maxLeft) + 'px';
        }
      });
    },

    setZoom(z, anchorTime) {
      zoom = Math.max(0.25, Math.min(12, z));
      const at = (anchorTime != null) ? anchorTime : FM.time;
      this.rebuild();
      if (timelineEl) timelineEl.scrollLeft = Math.max(0, at * pxPerSec());
      this.updatePlayhead();
      const zl = document.getElementById('tl-zoom-label');
      if (zl) zl.textContent = (Math.round(zoom * 10) / 10) + '×';
    },
    zoomBy(f, anchorTime) { this.setZoom(zoom * f, anchorTime); },
  };
})(window.FM);
