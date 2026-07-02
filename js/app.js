/* FreeMotion — App wiring: global state, render loop, import, playback, panels, events. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  FM.scene = FM.newScene();
  FM.time = 0;
  FM.playing = false;
  FM.loop = false;

  let canvas, ctx, readoutEl, dropHint;
  let renderQueued = false;
  let layerDragIdx = null;
  let rafId = null, lastTs = 0;

  /* ---------- rendering ---------- */
  let ghostC = null;
  // Onion skin: faint tinted ghosts of the selected animated layer at t±Δ (past=cyan, future=red).
  function drawOnionSkin() {
    const sel = FM.selectedLayer(FM.scene);
    if (!sel) return;
    // Walk the parent chain so a layer driven by an animated parent/null also gets ghosts, and so
    // applyParentChain can resolve the parents (they're included as invisible clones below).
    const chain = []; const seen = new Set([sel.id]); let pid = sel.parent;
    while (pid && !seen.has(pid)) { seen.add(pid); const pl = FM.scene.layers.find(l => l.id === pid); if (!pl) break; chain.push(pl); pid = pl.parent; }
    const animated = l => Object.keys(l.transform).some(k => FM.isAnimated(l.transform[k]));
    if (!animated(sel) && !chain.some(animated)) return;  // nothing moving (self or rig) → skip
    const P = FM.scene.project;
    if (!ghostC) ghostC = document.createElement('canvas');
    ghostC.width = P.width; ghostC.height = P.height;
    const gctx = ghostC.getContext('2d');
    // Parents included as invisible clones: resolvable by applyParentChain but never drawn; only `sel` renders.
    const mini = { project: Object.assign({}, P, { background: null }), layers: chain.map(pl => Object.assign({}, pl, { visible: false })).concat([sel]) };
    [-0.2, 0.2].forEach(dt => {
      const tt = FM.time + dt;
      if (tt < sel.start || tt > sel.start + sel.duration) return;
      gctx.clearRect(0, 0, P.width, P.height);
      FM.renderScene(gctx, mini, tt);
      gctx.save();
      gctx.globalCompositeOperation = 'source-atop';
      gctx.fillStyle = dt < 0 ? 'rgba(80,200,255,0.55)' : 'rgba(255,110,110,0.55)';
      gctx.fillRect(0, 0, P.width, P.height);
      gctx.restore();
      ctx.save(); ctx.globalAlpha = 0.4; ctx.drawImage(ghostC, 0, 0); ctx.restore();
    });
  }
  // Rule-of-thirds grid + title-safe margin guides (preview only, never exported).
  function drawGuides() {
    const P = FM.scene.project, w = P.width, h = P.height, lw = Math.max(1, w / 960);
    ctx.save();
    ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(255,255,255,.22)';
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(w * i / 3, 0); ctx.lineTo(w * i / 3, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h * i / 3); ctx.lineTo(w, h * i / 3); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(41,217,187,.65)'; ctx.lineWidth = lw * 1.5;
    const mx = w * 0.05, my = h * 0.05;
    ctx.strokeRect(mx, my, w - 2 * mx, h - 2 * my);   // title-safe 90%
    ctx.restore();
  }
  function render() {
    if (!ctx) return;
    FM.renderScene(ctx, FM.scene, FM.time);
    if (FM.onionSkin && !FM.playing) drawOnionSkin();
    if (FM.showGuides) drawGuides();
    if (FM.canvasEdit) FM.canvasEdit.update();
  }
  FM.requestRender = function () {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  };

  function resizeCanvas() {
    const P = FM.scene.project;
    canvas.width = P.width;
    canvas.height = P.height;
    document.documentElement.style.setProperty('--comp-ar', P.width + ' / ' + P.height);   // canvas-wrap holds this aspect → preview always contains in the stage
    render();
  }
  FM.resizeCanvas = resizeCanvas;

  function updateReadout() {
    // AM-style timecode: MM:SS:FF for the current playhead time.
    const f = FM.scene.project.fps || 30;
    const tot = Math.round(FM.time * f), ff = tot % f, s = Math.floor(tot / f), m = Math.floor(s / 60), sec = s % 60;
    const p2 = n => (n < 10 ? '0' : '') + n;
    readoutEl.textContent = p2(m) + ':' + p2(sec) + ':' + p2(ff);
    const d = FM.scene.project.duration, mm = Math.floor(d / 60), ss = Math.round(d % 60);
    readoutEl.title = FM.scene.layers.length + (FM.scene.layers.length === 1 ? ' layer · ' : ' layers · ') + 'total ' + mm + ':' + String(ss).padStart(2, '0');
    // Keep the open Move & Transform readouts (value boxes, dial, scale strip) in step with the
    // playhead for animated props — every time-change path passes through here. (#2)
    if (FM.inspector && FM.inspector.syncTransform) FM.inspector.syncTransform();
    if (FM.refreshEasing) FM.refreshEasing();   // re-pick the easing editor's segment when scrubbing past a keyframe

  }

  // Global preview playback speed (preview only — export is unaffected). 0.5×, 1×, 2×…
  FM.previewRate = 1;
  FM.setPreviewRate = function (r) {
    FM.previewRate = r || 1;
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (m && m.el && !layer.reversed) { try { m.el.playbackRate = Math.min(16, Math.max(0.0625, (layer.speed || 1) * FM.previewRate)); } catch (e) {} }
    });
    // reversed clips play synthesized Web Audio (not the <video>); re-anchor it to the current playhead so
    // a mid-play rate change re-syncs at the new speed (start() rebuilds nodes with playbackRate=previewRate).
    if (FM.playing && FM.audioPlay && FM.scene.layers.some(l => l.type === 'video' && l.reversed && l.visible !== false)) FM.audioPlay.start();
  };

  function updateDropHint() {
    dropHint.classList.toggle('hidden', FM.scene.layers.length > 0);
  }

  function refreshAll() {
    FM.inspector.refresh();
    FM.timeline.rebuild();
    updateDropHint();
    updateReadout();
    render();
    const pn = document.getElementById('proj-name');
    if (pn && document.activeElement !== pn) pn.value = FM.scene.project.name || 'Untitled';
  }
  FM.refreshAll = refreshAll;

  // Wipe the project back to a blank composition (drops all layers, media, markers, history).
  // Destructive + not undoable, so call sites confirm first.
  FM.resetProject = function () {
    if (FM.pause) FM.pause();
    (FM.scene.layers || []).forEach(l => {
      const m = FM.media.get(l.id); if (m && FM.clearFrameCache) FM.clearFrameCache(m);
      if (FM.media.remove) FM.media.remove(l.id);
      if (FM.storage && FM.storage.removeMedia) { try { FM.storage.removeMedia(l.id); } catch (e) {} }
    });
    const blank = FM.newScene();
    FM.scene.project = blank.project;
    FM.scene.layers = blank.layers;
    FM.scene.selectedId = null;
    FM.scene.selectedIds = [];
    FM.time = 0;
    if (FM.history) FM.history.reset();
    if (FM.resizeCanvas) FM.resizeCanvas();
    refreshAll();
    if (FM.setTime) FM.setTime(0);
    const pnm = document.getElementById('proj-name-m'); if (pnm) pnm.value = FM.scene.project.name;
    if (FM.storage && FM.storage.save) FM.storage.save();
    if (FM.toast) FM.toast('Project reset', 1200);
  };

  // ===== Canvas (preview) zoom — view-only, never affects export. Scales #canvas-wrap (the selection
  // overlay lives inside it, so handles stay aligned; pointer mapping is rect-based, so it stays correct). =====
  FM.canvasZoom = 1;
  const CZOOMS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];
  FM.setCanvasZoom = function (z) {
    FM.canvasZoom = Math.max(0.25, Math.min(8, z));
    const wrap = document.getElementById('canvas-wrap');
    if (wrap) wrap.style.transform = Math.abs(FM.canvasZoom - 1) < 1e-3 ? '' : 'scale(' + FM.canvasZoom + ')';
    const lbl = document.getElementById('vb-zlabel'); if (lbl) lbl.textContent = Math.round(FM.canvasZoom * 100) + '%';
    if (FM.canvasEdit && FM.canvasEdit.update) FM.canvasEdit.update();
  };
  FM.zoomCanvasStep = function (dir) {
    let i = CZOOMS.findIndex(v => v >= FM.canvasZoom - 1e-3);
    if (i < 0) i = CZOOMS.length - 1;
    FM.setCanvasZoom(CZOOMS[Math.max(0, Math.min(CZOOMS.length - 1, i + dir))]);
  };

  /* ---------- time / scrubbing ---------- */
  FM.seekVideosToTime = function () {
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (!m) return;
      if (layer.reversed && m.frameCache) return; // the cache renders this synchronously
      const local = FM.layerLocalTime(layer, FM.time);
      if (local == null) return;
      try { m.el.currentTime = Math.min(Math.max(local, 0), Math.max(0, (m.duration || 0) - 0.001)); } catch (e) {}
    });
  };

  // Small status toast (e.g. "Preparing reverse…"). Pass `ms` for a one-shot toast that auto-hides;
  // omit it for a sticky toast paired with FM.hideToast(). The seq guard stops an old timer from
  // hiding a newer toast.
  let toastSeq = 0;
  FM.toast = function (msg, ms) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.remove('hidden');
    const my = ++toastSeq;
    if (ms) setTimeout(() => { if (my === toastSeq) FM.hideToast(); }, ms);
  };
  FM.hideToast = function () { const t = document.getElementById('toast'); if (t) t.classList.add('hidden'); };

  // Benchmarks = timeline markers. Tap the timecode to drop one at the playhead (tap again to remove it).
  // The skip buttons jump between these (and the selected clip's edges).
  FM.toggleMarkerAtPlayhead = function () {
    const P = FM.scene.project; if (!P.markers) P.markers = [];
    const t = FM.time;
    const near = P.markers.find(m => Math.abs(m.t - t) < 0.12);
    if (near) { P.markers = P.markers.filter(m => m !== near); if (FM.toast) FM.toast('Benchmark removed', 1000); }
    else { P.markers.push({ t: Math.round(t * 1000) / 1000, label: 'Benchmark' }); if (FM.toast) FM.toast('Benchmark added', 1000); }
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
  };

  // Ordered snap points the skip buttons step between: project start/end, every benchmark, and — when a
  // layer is selected — that clip's start & end edges. (So skip-left from past a clip lands on its right
  // edge; skip-right from before it lands on its start.)
  FM.timelineSnapPoints = function () {
    const P = FM.scene.project;
    const pts = [0, P.duration];
    (P.markers || []).forEach(m => { if (m.t >= 0 && m.t <= P.duration) pts.push(m.t); });
    const sel = FM.scene.selectedId ? FM.layerById(FM.scene, FM.scene.selectedId) : null;
    if (sel) { pts.push(Math.max(0, sel.start)); pts.push(Math.min(P.duration, sel.start + sel.duration)); }
    return pts.sort((a, b) => a - b);
  };

  // Decode a clip's frames once so reverse / frame-blend slow-mo plays + scrubs smoothly.
  FM.ensureReverseCache = async function (layer) {
    if (!layer || layer.type !== 'video') return;
    const m = FM.media.get(layer.id);
    if (!m || m.frameCache) return;
    const fps = Math.min(FM.scene.project.fps || 30, 24);
    FM.toast('Preparing frames…');
    // Preview: downscale + byte-cap so a long reversed/slow clip can't OOM-kill mobile Safari.
    try { await FM.buildFrameCache(m, fps, p => FM.toast('Preparing frames… ' + Math.round(p * 100) + '%'), { maxDim: 960, maxBytes: 384 * 1024 * 1024 }); }
    finally { FM.hideToast(); }
    render();
  };

  FM.setTime = function (t) {
    FM.time = Math.max(0, Math.min(FM.scene.project.duration, t));
    if (!FM.playing) FM.seekVideosToTime();
    render();
    FM.timeline.updatePlayhead();
    updateReadout();
  };

  /* ---------- playback ---------- */
  // Jump the playhead to t and resync video/audio (used by loop + loop-region wrap).
  function wrapTo(t) {
    FM.time = t;
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id); if (!m) return;
      const local = FM.layerLocalTime(layer, t);
      if (!layer.reversed && local != null) { try { m.el.currentTime = local; } catch (e) {} }
    });
    if (FM.audioPlay) FM.audioPlay.start();
    render(); FM.timeline.updatePlayhead(); updateReadout();
  }
  // Is there an active loop in/out region?
  FM.hasLoopRegion = function () { const P = FM.scene.project; return P.loopIn != null && P.loopOut != null && P.loopOut > P.loopIn + 0.01; };

  function tick(ts) {
    if (!FM.playing) return;
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    let nt = FM.time + dt * (FM.previewRate || 1);
    // loop-region wrap (takes priority over end-of-timeline when looping)
    if (FM.loop && FM.hasLoopRegion() && nt >= FM.scene.project.loopOut) {
      wrapTo(FM.scene.project.loopIn); rafId = requestAnimationFrame(tick); return;
    }
    if (nt >= FM.scene.project.duration) {
      if (FM.loop) {
        wrapTo(FM.hasLoopRegion() ? FM.scene.project.loopIn : 0);
        rafId = requestAnimationFrame(tick);
        return;
      }
      FM.time = FM.scene.project.duration;
      render(); FM.timeline.updatePlayhead(); updateReadout();
      FM.pause();
      return;
    }
    FM.time = nt;
    // Reversed clips with a frame cache render from it (smooth). Without a cache, fall
    // back to per-frame seeking (works, just choppy).
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (!m || !m.el) return;
      if (layer.reversed) {
        if (!m.frameCache) {
          const local = FM.layerLocalTime(layer, FM.time);
          if (local != null) { try { m.el.currentTime = local; } catch (e) {} }
        }
      } else {
        // Forward clips free-run their own <video> audio. Pause + mute the element the moment the
        // playhead leaves the clip window OR the layer is hidden, so a clip trimmed shorter than its
        // source (or hidden mid-play) stops dead instead of bleeding its source audio on. (#1,#8)
        const local = FM.layerLocalTime(layer, FM.time);
        if (local == null || layer.visible === false) { try { if (!m.el.paused) m.el.pause(); m.el.muted = true; } catch (e) {} return; }
        try {
          if (m.el.paused) { m.el.currentTime = local; m.el.play().catch(() => {}); }              // re-entered the window → resume
          else if (Math.abs((m.el.currentTime || 0) - local) > 0.15) { m.el.currentTime = local; } // resync drift (speed≠1)
          // Reconcile volume/mute every tick (fadeMul = 1 when there are no fades) so a volume/fade
          // edit mid-playback takes effect immediately instead of sticking.
          const vol = FM.layerVolume(layer, FM.time) * FM.fadeMul(layer, FM.time - layer.start, layer.duration);   // keyframed volume animates on forward clips
          m.el.muted = false; m.el.volume = Math.max(0, Math.min(1, vol));
        } catch (e) {}
      }
    });
    render();
    FM.timeline.updatePlayhead();
    updateReadout();
    rafId = requestAnimationFrame(tick);
  }

  FM.play = function () {
    if (FM.playing) return;
    if (FM.time >= FM.scene.project.duration - 1e-3) FM.time = 0;
    FM.playing = true;
    lastTs = 0;
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (!m) return;
      const local = FM.layerLocalTime(layer, FM.time);
      if (local == null) { try { m.el.pause(); } catch (e) {} return; }
      // Forward clips play natively; reversed clips are drawn from the frame cache by tick.
      if (!layer.reversed) {
        try { m.el.currentTime = local; } catch (e) {}
        try { m.el.playbackRate = Math.min(16, Math.max(0.0625, (layer.speed || 1) * (FM.previewRate || 1))); } catch (e) {}
        m.el.muted = false;
        m.el.volume = Math.max(0, Math.min(1, FM.layerVolume(layer, FM.time)));
        m.el.play().catch(() => {});
      }
    });
    if (FM.audioPlay) FM.audioPlay.start();   // reversed clips: play synthesized reversed audio
    document.getElementById('btn-play').innerHTML = '<svg viewBox="0 0 24 24" class="tco" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';   // pause icon
    rafId = requestAnimationFrame(tick);
  };

  // Ensure reversed + frame-blend clips are decoded before playback starts, then play.
  FM.requestPlay = async function () {
    const needCache = FM.scene.layers.filter(l => l.type === 'video' && FM.media.get(l.id) &&
      (l.reversed || (l.frameBlend && (l.speed || 1) < 1)));
    for (const l of needCache) {
      const m = FM.media.get(l.id);
      if (!m.frameCache) await FM.ensureReverseCache(l);            // frames for video
      if (l.reversed && m.audioBuffer === undefined && m.file) m.audioBuffer = await FM.decodeAudio(m.file); // audio for reverse
    }
    FM.play();
  };

  FM.pause = function () {
    FM.playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (FM.audioPlay) FM.audioPlay.stop();
    FM.scene.layers.forEach(layer => {
      const m = FM.media.get(layer.id);
      if (m && m.el && m.el.pause) { try { m.el.pause(); m.el.muted = true; } catch (e) {} }
    });
    document.getElementById('btn-play').innerHTML = '<svg viewBox="0 0 24 24" class="tco" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>';   // play icon
  };

  FM.togglePlay = function () { FM.playing ? FM.pause() : FM.requestPlay(); };

  // Re-anchor live audio to the current scene state mid-playback. Forward clips reconcile every frame
  // in tick(); reversed clips synthesize their audio once in audioPlay.start(), so a volume / mute /
  // fade / visibility / delete change needs that rebuilt to be heard. No-op unless something is playing
  // AND a reversed clip exists (so the common forward-only case stays free). (#6,#7,#8)
  FM.reconcileAudio = function () {
    if (!FM.playing || !FM.audioPlay) return;
    if (!FM.scene.layers.some(l => l.type === 'video' && l.reversed)) return;
    FM.audioPlay.start();
  };

  /* ---------- layers ---------- */
  FM.addMediaLayer = function (rec) {
    const scene = FM.scene, P = scene.project;
    const first = scene.layers.length === 0;
    if (first && rec.width && rec.height) {
      P.width = rec.width; P.height = rec.height;
      resizeCanvas();
    }
    // Use the clip's FULL length — never cap it to the existing composition.
    const dur = rec.kind === 'video' ? Math.max(0.1, rec.duration || 5) : 5;
    const layer = FM.makeLayer(rec.kind, {
      name: rec.file ? rec.file.name.replace(/\.[^.]+$/, '') : rec.kind,
      x: P.width / 2, y: P.height / 2, duration: dur,
    });
    const fit = Math.min(P.width / rec.width, P.height / rec.height);
    layer.transform.scale = (isFinite(fit) && fit > 0) ? fit : 1;
    FM.media.set(layer.id, rec);
    if (rec.kind === 'video') {
      // Always re-render when a seek completes — including during playback, so reversed
      // clips (which we drive by seeking each frame) actually update while playing.
      rec.el.addEventListener('seeked', () => render());
    }
    scene.layers.unshift(layer);
    scene.selectedId = layer.id;
    // Composition grows to fit: the first clip sets the length; later clips extend it.
    if (first) P.duration = layer.start + layer.duration;
    else P.duration = Math.max(P.duration, layer.start + layer.duration);
    refreshAll();
    FM.seekVideosToTime();
    if (FM.history) FM.history.commit();
    if (FM.storage && FM.storage.save) FM.storage.save();   // write the new media blob to IDB now, not on the 600ms debounce → survives a quick tab background/close
  }

  FM.addTextLayer = function () {
    const P = FM.scene.project;
    const layer = FM.makeLayer('text', { name: 'Text', x: P.width / 2, y: P.height / 2, fontSize: Math.round(P.height / 12), duration: Math.min(5, P.duration) });
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // Null object: an invisible transform controller. Parent real layers to it and animate the
  // null to drive the whole rig (AM-style). Drawn as nothing; selectable via the timeline/canvas.
  FM.addNullLayer = function () {
    const P = FM.scene.project;
    const layer = FM.makeLayer('null', { name: 'Null', x: P.width / 2, y: P.height / 2, duration: P.duration });
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // Vector shape layer (any FM.traceShapePath kind, fill + stroke) — first-class graphics.
  // opts: { name, extra } — extra props (e.g. { sides: 6 } for a hexagon) land on the layer.
  FM.addShapeLayer = function (shape, opts) {
    opts = opts || {};
    const P = FM.scene.project;
    const layer = FM.makeLayer('shape', {
      name: opts.name || (shape ? shape.charAt(0).toUpperCase() + shape.slice(1) : 'Shape'),
      shape: shape || 'rect', x: P.width / 2, y: P.height / 2,
      shapeW: Math.round(P.width / 3), shapeH: Math.round(P.height / 3), duration: Math.min(5, P.duration),
      extra: opts.extra,
    });
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // ---- multi-layer align & distribute (relative to the canvas; treats transform.x/y as centre) ----
  function alignTargets() {
    const ids = FM.selectionIds ? FM.selectionIds() : (FM.scene.selectedId ? [FM.scene.selectedId] : []);
    return FM.scene.layers.filter(l => ids.includes(l.id) && !l.locked);
  }
  function setAxis(layer, axis, val) {
    if (typeof layer.transform[axis] === 'number') layer.transform[axis] = val;
    else FM.setTransform(layer, axis, val, FM.time);   // animated → drop a keyframe at the playhead
  }
  FM.alignLayers = function (mode) {
    const P = FM.scene.project, layers = alignTargets();
    if (!layers.length) return;
    layers.forEach(layer => {
      const sz = FM.layerSize(layer), sc = FM.evalProp(layer.transform.scale, FM.time) || 1;
      const hw = sz.w * sc / 2, hh = sz.h * sc / 2;
      if (mode === 'left') setAxis(layer, 'x', Math.round(hw));
      else if (mode === 'hcenter') setAxis(layer, 'x', Math.round(P.width / 2));
      else if (mode === 'right') setAxis(layer, 'x', Math.round(P.width - hw));
      else if (mode === 'top') setAxis(layer, 'y', Math.round(hh));
      else if (mode === 'vcenter') setAxis(layer, 'y', Math.round(P.height / 2));
      else if (mode === 'bottom') setAxis(layer, 'y', Math.round(P.height - hh));
    });
    refreshAll(); FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.history) FM.history.commit();
  };
  FM.distributeLayers = function (axis) {
    const key = axis === 'h' ? 'x' : 'y', layers = alignTargets();
    if (layers.length < 3) return;
    const items = layers.map(l => ({ l, p: FM.evalProp(l.transform[key], FM.time) })).sort((a, b) => a.p - b.p);
    const first = items[0].p, last = items[items.length - 1].p, step = (last - first) / (items.length - 1);
    items.forEach((it, i) => { if (i === 0 || i === items.length - 1) return; setAxis(it.l, key, Math.round(first + step * i)); });
    refreshAll(); FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.history) FM.history.commit();
  };

  // Camera: a 2D camera the whole scene is viewed through — pan (x/y), zoom (scale), rotate.
  // Neutral by default (centred, zoom 1) so adding one doesn't change the frame until animated.
  FM.addCameraLayer = function () {
    const P = FM.scene.project;
    if (FM.scene.layers.some(l => l.type === 'camera')) { if (FM.toast) FM.toast('Scene already has a camera'); return; }
    const layer = FM.makeLayer('camera', { name: 'Camera', x: P.width / 2, y: P.height / 2, duration: P.duration });
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // Adjustment layer: an effect layer that grades/filters everything beneath it (AM-style).
  FM.addAdjustmentLayer = function () {
    const P = FM.scene.project;
    const layer = FM.makeLayer('adjustment', { name: 'Adjustment', x: P.width / 2, y: P.height / 2, duration: P.duration });
    layer.effects = [{ type: 'brightness', enabled: true, params: { amount: 1.15 } }, { type: 'saturate', enabled: true, params: { amount: 1.35 } }];
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  FM.addCaptionLayer = function () {
    const P = FM.scene.project;
    const layer = FM.makeLayer('text', { name: 'Captions', x: P.width / 2, y: Math.round(P.height * 0.82), fontSize: Math.round(P.height / 22), duration: P.duration });
    const seg = Math.max(0.5, Math.min(2.5, P.duration / 2));
    layer.captions = [{ start: 0, end: Math.min(seg, P.duration), text: 'First caption' }];
    if (P.duration > seg + 0.3) layer.captions.push({ start: seg, end: Math.min(P.duration, seg * 2), text: 'Second caption' });   // only if there's room (no zero-length segment on tiny projects)
    layer.text = '';
    layer.captionBg = true;
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // The current selection set (primary = FM.scene.selectedId, used by inspector/canvas-edit).
  FM.selectionIds = function () {
    const ids = FM.scene.selectedIds;
    if (ids && ids.length) return ids.filter(id => FM.layerById(FM.scene, id));
    return FM.scene.selectedId ? [FM.scene.selectedId] : [];
  };

  FM.selectLayer = function (id) {
    FM.scene.selectedId = id;
    FM.scene.selectedIds = id ? [id] : [];
    FM.layersPanel.refresh();
    FM.inspector.refresh();
    FM.timeline.rebuild();
    if (FM.canvasEdit) FM.canvasEdit.update();
  };

  FM.selectAll = function () {
    const ids = FM.scene.layers.map(l => l.id);
    FM.scene.selectedIds = ids;
    FM.scene.selectedId = ids.length ? ids[0] : null;
    FM.inspector.refresh(); FM.timeline.rebuild();
    if (FM.canvasEdit) FM.canvasEdit.update();
  };

  // Shift/Cmd-click: add or remove a layer from the selection set.
  FM.toggleSelect = function (id) {
    let ids = FM.selectionIds().slice();
    if (ids.includes(id)) { ids = ids.filter(x => x !== id); FM.scene.selectedId = ids.length ? ids[ids.length - 1] : null; }
    else { ids.push(id); FM.scene.selectedId = id; }
    FM.scene.selectedIds = ids;
    FM.inspector.refresh();
    FM.timeline.rebuild();
    if (FM.canvasEdit) FM.canvasEdit.update();
  };

  // Delete every layer in the selection set (one history step).
  FM.deleteSelected = function () {
    const ids = FM.selectionIds(); if (!ids.length) return;
    ids.forEach(id => { const m = FM.media.get(id); if (m) { if (m.el) { try { m.el.pause(); m.el.muted = true; } catch (e) {} } FM.clearFrameCache(m); } FM.media.remove(id); if (FM.storage && FM.storage.removeMedia) FM.storage.removeMedia(id); });
    FM.scene.layers = FM.scene.layers.filter(l => !ids.includes(l.id));
    FM.scene.selectedId = FM.scene.layers[0] ? FM.scene.layers[0].id : null;
    FM.scene.selectedIds = FM.scene.selectedId ? [FM.scene.selectedId] : [];
    // Keyboard Delete/Backspace routes here; mirror deleteLayer's reversed-audio rebuild so a deleted
    // reversed clip's synthesized audio stops (forward elements were just paused above). (#6)
    if (FM.playing && FM.audioPlay) { FM.audioPlay.stop(); FM.audioPlay.start(); }
    FM.refreshAll();   // FM.* (not the local) so the mobile wrapper runs → deleting the last layer drops the sheet (#13)
    if (FM.history) FM.history.commit();
  };

  FM.deleteLayer = function (id) {
    const m = FM.media.get(id);
    if (m) { if (m.el) { try { m.el.pause(); m.el.muted = true; } catch (e) {} } FM.clearFrameCache(m); }   // stop a deleted forward clip's native audio (#6)
    FM.scene.layers = FM.scene.layers.filter(l => l.id !== id);
    FM.media.remove(id);
    if (FM.storage && FM.storage.removeMedia) FM.storage.removeMedia(id);   // drop its blob from IndexedDB
    // A deleted clip's synthesized (reversed) audio plays from a flat node list not keyed by layer, so
    // it keeps sounding after the clip is gone. Rebuild the active nodes from the post-delete layer set.
    if (FM.playing && FM.audioPlay) { FM.audioPlay.stop(); FM.audioPlay.start(); }
    if (FM.scene.selectedId === id) FM.scene.selectedId = FM.scene.layers[0] ? FM.scene.layers[0].id : null;
    FM.refreshAll();   // FM.* (not the local) so the mobile wrapper runs → deleting the last layer drops the sheet (#13)
    if (FM.history) FM.history.commit();
  };

  // Export the current frame as a PNG (clean render, no onion/overlays).
  FM.snapshotPNG = function () {
    const P = FM.scene.project;
    const c = document.createElement('canvas'); c.width = P.width; c.height = P.height;
    FM.renderScene(c.getContext('2d'), FM.scene, FM.time);
    const base = (P.name || 'frame').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim() || 'frame';
    c.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = base + '-' + FM.time.toFixed(2) + 's.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  // Trim (or grow) the project duration to end exactly at the last clip.
  FM.fitToContent = function () {
    if (!FM.scene.layers.length) return;
    const end = Math.max(0.5, ...FM.scene.layers.map(l => l.start + l.duration));
    FM.scene.project.duration = Math.round(end * 1000) / 1000;
    if (FM.time > FM.scene.project.duration) FM.setTime(FM.scene.project.duration);
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // Release a clip's decoded frame cache when neither reverse nor frame-blend-slow needs it anymore.
  FM.maybeClearCache = function (layer) {
    const m = FM.media.get(layer.id);
    if (m && !layer.reversed && !(layer.frameBlend && (layer.speed || 1) < 1)) FM.clearFrameCache(m);
  };

  FM.duplicateLayer = async function (id, inPlace) {
    const src = FM.layerById(FM.scene, id);
    if (!src) return;
    const copy = FM.cloneLayer(src, !!inPlace);   // inPlace → exact copy at same position (no offset/" copy")
    if (src.type !== 'text') {
      const rec = FM.media.get(id);
      if (rec && rec.file) {
        let nrec = null;
        try {
          if (rec.kind === 'video') nrec = await FM.loadVideoFile(rec.file);
          else if (rec.kind === 'image') nrec = await FM.loadImageFile(rec.file);
        } catch (e) { nrec = null; }
        if (nrec && nrec !== rec) {                       // only use a FRESH rec — never alias the source's
          FM.media.set(copy.id, nrec);
          if (nrec.kind === 'video') nrec.el.addEventListener('seeked', () => { if (!FM.playing) render(); });
        }
      }
    }
    const idx = FM.scene.layers.findIndex(l => l.id === id);
    FM.scene.layers.splice(Math.max(0, idx), 0, copy);
    FM.scene.selectedId = copy.id;
    refreshAll();
    FM.seekVideosToTime();
    if (FM.history) FM.history.commit();
    if (FM.storage && FM.storage.save) FM.storage.save();   // persist the duplicated layer's media blob immediately
  };

  // ---- copy / paste layers (in-memory clipboard; survives across the session) ----
  FM.clipboard = [];
  FM.copySelection = function () {
    const ids = FM.selectionIds ? FM.selectionIds() : (FM.scene.selectedId ? [FM.scene.selectedId] : []);
    if (!ids.length) return 0;
    // Preserve array order so a copied parent/child keep their relative stacking.
    const ordered = FM.scene.layers.filter(l => ids.includes(l.id));
    FM.clipboard = ordered.map(layer => {
      const rec = FM.media.get(layer.id);
      return { snapshot: JSON.parse(JSON.stringify(layer)), file: (rec && rec.file) ? rec.file : null, kind: rec ? rec.kind : null };
    });
    return FM.clipboard.length;
  };
  FM.pasteClipboard = async function () {
    if (!FM.clipboard || !FM.clipboard.length) return;
    const idMap = {};
    const copies = FM.clipboard.map(entry => {
      const copy = FM.cloneLayer(entry.snapshot);   // fresh id + offset +30 + " copy"
      idMap[entry.snapshot.id] = copy.id;
      return { copy, entry };
    });
    let insertAt = 0;   // paste onto TOP of the z-stack (layers[0] = top), like duplicate/add
    for (const { copy, entry } of copies) {
      // Remap parent: a parent copied in the same batch → its new clone; else keep if still present, else drop.
      if (copy.parent) {
        if (idMap[copy.parent]) copy.parent = idMap[copy.parent];
        else if (!FM.layerById(FM.scene, copy.parent)) copy.parent = null;
      }
      if (entry.file && entry.kind && entry.kind !== 'text') {
        let nrec = null;
        try {
          if (entry.kind === 'video') nrec = await FM.loadVideoFile(entry.file);
          else if (entry.kind === 'image') nrec = await FM.loadImageFile(entry.file);
        } catch (e) { nrec = null; }
        if (nrec) {
          FM.media.set(copy.id, nrec);
          if (nrec.kind === 'video') nrec.el.addEventListener('seeked', () => { if (!FM.playing) render(); });
        }
      }
      FM.scene.layers.splice(insertAt++, 0, copy);
    }
    const newIds = copies.map(c => c.copy.id);
    FM.scene.selectedIds = newIds;
    FM.scene.selectedId = newIds[newIds.length - 1] || null;
    refreshAll();
    FM.seekVideosToTime();
    if (FM.history) FM.history.commit();
    if (FM.storage && FM.storage.save) FM.storage.save();   // persist pasted layers' media blobs immediately
  };

  // ---- replace a layer's media, keeping its transform / keyframes / timing / effects ----
  FM.replaceMediaWith = function (id, nrec) {
    const layer = FM.layerById(FM.scene, id);
    if (!layer || !nrec) return false;
    const old = FM.media.get(id);
    if (old && FM.clearFrameCache) FM.clearFrameCache(old);
    FM.media.set(id, nrec);
    layer.type = nrec.kind;                          // video ↔ image as needed
    if (nrec.kind === 'video' && nrec.el) nrec.el.addEventListener('seeked', () => { if (!FM.playing) render(); });
    // Re-clamp timing to the NEW source so a long clip doesn't freeze on the last frame (and audio
    // length doesn't diverge from the visible duration). Keeps transform/keyframes/effects/masks.
    if (nrec.kind === 'video' && nrec.duration) {
      layer.trimStart = Math.max(0, Math.min(layer.trimStart || 0, nrec.duration - 0.05));
      const avail = (nrec.duration - layer.trimStart) / (layer.speed || 1);
      layer.duration = Math.max(0.1, Math.min(layer.duration, avail));
    }
    return true;
  };
  FM.replaceMedia = function (id) {
    const layer = FM.layerById(FM.scene, id);
    if (!layer || layer.type === 'text' || layer.type === 'shape' || layer.type === 'null') return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'video/*,image/*'; input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0]; input.remove();
      if (!file) return;
      const isVideo = /^video\//.test(file.type) || /\.(mp4|mov|webm|mkv|m4v)$/i.test(file.name);
      let nrec = null;
      try { nrec = isVideo ? await FM.loadVideoFile(file) : await FM.loadImageFile(file); } catch (e) { nrec = null; }
      if (!nrec) { if (FM.toast) FM.toast('Could not load that file'); return; }
      FM.replaceMediaWith(id, nrec);
      if (layer.reversed && FM.ensureReverseCache) { try { await FM.ensureReverseCache(layer); } catch (e) {} }
      if (FM.storage && FM.storage.removeMedia) await FM.storage.removeMedia(id);   // drop old blob so save() writes the new one
      refreshAll(); FM.seekVideosToTime();
      if (FM.history) FM.history.commit();
      if (FM.storage && FM.storage.save) FM.storage.save();
    });
    document.body.appendChild(input);
    input.click();
  };

  // Split a clip into two at the current playhead time.
  FM.splitLayer = async function (id) {
    const layer = FM.layerById(FM.scene, id);
    if (!layer) return;
    const t = FM.time, end = layer.start + layer.duration;
    if (t <= layer.start + 0.02 || t >= end - 0.02) return;   // playhead must be inside the clip
    const into = t - layer.start;
    const sp = layer.speed || 1;                                // trimStart is SOURCE time → scale by speed
    const origTrim = layer.trimStart, origDur = layer.duration;
    const B = FM.cloneLayer(layer, true);                       // identical copy (new id)
    B.start = t;
    B.duration = end - t;
    if (layer.reversed) {
      // reversed plays source end→start: A keeps the END span, B keeps the START span
      B.trimStart = origTrim;
      layer.trimStart = origTrim + (origDur - into) * sp;
    } else {
      B.trimStart = origTrim + into * sp;                       // B resumes where A left off in the source
    }
    layer.duration = into;                                      // A = first half
    if (Array.isArray(layer.captions)) {
      // captions use LOCAL time (t − layer.start): re-base B's segments to its new start and trim A's to its new length
      const orig = layer.captions;
      B.captions = orig.map(c => ({ ...c, start: c.start - into, end: c.end - into })).filter(c => c.end > 0.01).map(c => ({ ...c, start: Math.max(0, c.start) }));
      layer.captions = orig.filter(c => c.start < into - 0.01).map(c => ({ ...c, end: Math.min(c.end, into) }));
    }
    if (layer.type !== 'text') {
      const rec = FM.media.get(id);
      if (rec && rec.file) {
        let nrec = null;
        try {
          if (rec.kind === 'video') nrec = await FM.loadVideoFile(rec.file);
          else if (rec.kind === 'image') nrec = await FM.loadImageFile(rec.file);
        } catch (e) { nrec = null; }
        if (nrec && nrec !== rec) {                       // fresh rec only — never alias A's media
          FM.media.set(B.id, nrec);
          if (nrec.kind === 'video') nrec.el.addEventListener('seeked', () => { if (!FM.playing) render(); });
        }
      }
    }
    const idx = FM.scene.layers.findIndex(l => l.id === id);
    FM.scene.layers.splice(idx + 1, 0, B);
    FM.scene.selectedId = B.id;
    refreshAll();
    FM.seekVideosToTime();
    if (FM.history) FM.history.commit();
  };

  FM.layerMenuItems = function (layer) {
    const items = [
      { label: 'Duplicate', action: () => FM.duplicateLayer(layer.id) },
      { label: 'Duplicate in place', action: () => FM.duplicateLayer(layer.id, true) },
      { label: 'Copy', action: () => { const ids = FM.selectionIds ? FM.selectionIds() : []; if (!ids.includes(layer.id)) { FM.scene.selectedId = layer.id; FM.scene.selectedIds = [layer.id]; } FM.copySelection(); } },
      { label: 'Paste Style…', disabled: !(FM.clipboard && FM.clipboard[0] && FM.clipboard[0].snapshot), action: () => { if (FM.openPasteStyle) FM.openPasteStyle(layer); } },
      { label: 'Split at playhead', action: () => FM.splitLayer(layer.id) },
    ];
    if (layer.type === 'video' || layer.type === 'image') {
      items.push({ label: 'Replace media…', action: () => FM.replaceMedia(layer.id) });
    }
    items.push(...[
      { label: layer.locked ? 'Unlock' : 'Lock', action: () => { layer.locked = !layer.locked; FM.layersPanel.refresh(); FM.timeline.rebuild(); if (FM.history) FM.history.commit(); } },
      { label: 'Reset transform', action: () => { const P = FM.scene.project, tr = layer.transform; tr.x = Math.round(P.width / 2); tr.y = Math.round(P.height / 2); tr.scale = 1; tr.rotation = 0; tr.opacity = 1; FM.requestRender(); if (FM.inspector) FM.inspector.refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.history) FM.history.commit(); } },
    ]);
    if (layer.type === 'video') {
      items.push({ label: layer.reversed ? 'Un-reverse' : 'Reverse', action: async () => {
        layer.reversed = !layer.reversed;
        if (layer.reversed) { if (FM.ensureReverseCache) await FM.ensureReverseCache(layer); } else if (FM.maybeClearCache) FM.maybeClearCache(layer);
        FM.timeline.rebuild(); FM.requestRender(); FM.seekVideosToTime(); if (FM.history) FM.history.commit();
      } });
      if (Math.abs((layer.speed || 1) - 1) > 1e-3) {
        items.push({ label: 'Reset speed (1×)', action: () => {
          const span = layer.duration * (layer.speed || 1);
          layer.speed = 1; layer.duration = span;
          const end = layer.start + layer.duration;
          if (end > FM.scene.project.duration) FM.scene.project.duration = end;
          FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit();
        } });
      }
    }
    items.push({ sep: true }, { label: 'Delete', danger: true, action: () => FM.deleteLayer(layer.id) });
    return items;
  };

  /* ---------- layers live in the timeline now (AM-style); this is a thin alias ---------- */
  FM.layersPanel = { refresh() { if (FM.timeline) FM.timeline.rebuild(); } };
  // Reorder layers (called by the timeline track-head drag). from/to are array indices.
  FM.reorderLayer = function (from, to) {
    if (from == null || to == null || from === to) return;
    const arr = FM.scene.layers;
    if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  /* ---------- import ---------- */
  async function handleFiles(files) {
    for (const file of files) {
      try {
        if (file.type.startsWith('video')) FM.addMediaLayer(await FM.loadVideoFile(file));
        else if (file.type.startsWith('image')) FM.addMediaLayer(await FM.loadImageFile(file));
        // Audio rides the pictureless-video path: a <video> element plays mp3/m4a/wav fine, and a
        // 0×0-picture clip already gets the waveform lane, live mix, keyframed volume and export mix.
        else if (file.type.startsWith('audio')) FM.addMediaLayer(await FM.loadVideoFile(file));
      } catch (e) { console.error(e); alert(e.message || 'Could not load ' + file.name); }
    }
  }

  /* ---------- export ---------- */
  function showExportDialog() { document.getElementById('export-dialog').classList.remove('hidden'); }
  function hideExportDialog() { document.getElementById('export-dialog').classList.add('hidden'); }

  async function runExport() {
    hideExportDialog();
    if (!FM.scene.layers.length) { alert('Add some media first.'); return; }
    const scale = parseFloat(document.getElementById('exp-res').value) || 1;
    const fps = parseInt(document.getElementById('exp-fps').value, 10) || 30;
    const qEl = document.getElementById('exp-quality');
    const qf = (qEl && parseFloat(qEl.value)) || 0.1;
    const P = FM.scene.project;
    const bitrate = Math.min(80e6, Math.round(P.width * scale * P.height * scale * fps * qf));
    const overlay = document.getElementById('export-overlay');
    const bar = document.getElementById('export-bar');
    const status = document.getElementById('export-status');
    overlay.classList.remove('hidden');
    if (FM.playing) FM.pause();
    try {
      const expName = (FM.scene.project.name || 'freemotion-export').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim() || 'freemotion-export';
      const rangeEl = document.getElementById('exp-range');
      let from = null, to = null;
      if (rangeEl && rangeEl.value === 'loop' && FM.hasLoopRegion && FM.hasLoopRegion()) { from = P.loopIn; to = P.loopOut; }
      await FM.exporter.run({
        scale, fps, bitrate, name: expName, from, to,
        onProgress(p, what) {
          bar.style.width = Math.round(p * 100) + '%';
          status.textContent = 'Encoding ' + what + '… ' + Math.round(p * 100) + '%';
        },
      });
      status.textContent = 'Done — saved to your Downloads.';
      setTimeout(() => overlay.classList.add('hidden'), 900);
    } catch (e) {
      overlay.classList.add('hidden');
      if (e.message === 'NO_WEBCODECS') alert('Export needs the WebCodecs video encoder. Please open FreeMotion in Google Chrome.');
      else if (e.message === 'CANCELLED') { /* silent */ }
      else { console.error(e); alert('Export failed: ' + e.message); }
    } finally {
      bar.style.width = '0%';
      FM.seekVideosToTime();
    }
  }

  /* ---------- init ---------- */
  function init() {
    canvas = document.getElementById('preview');
    ctx = canvas.getContext('2d');
    readoutEl = document.getElementById('time-readout');
    dropHint = document.getElementById('drop-hint');
    // Tap the timecode → drop / remove a benchmark at the playhead. Double-tap → type an exact time.
    // (A short timer distinguishes the two so a double-tap doesn't also leave a stray benchmark.)
    readoutEl.style.cursor = 'pointer';
    readoutEl.title = 'Tap to add / remove a benchmark here · double-click to type a time';
    let tcTapTimer = null;
    readoutEl.addEventListener('click', () => {
      if (tcTapTimer) return;                       // second click of a double-tap → ignore here
      tcTapTimer = setTimeout(() => { tcTapTimer = null; FM.toggleMarkerAtPlayhead(); }, 240);
    });
    // double-click the time readout to type an exact playhead time
    readoutEl.addEventListener('dblclick', () => {
      if (tcTapTimer) { clearTimeout(tcTapTimer); tcTapTimer = null; }   // cancel the pending benchmark tap
      const input = document.createElement('input');
      input.className = 'time-edit'; input.type = 'text'; input.value = FM.time.toFixed(2);
      readoutEl.style.display = 'none'; readoutEl.parentNode.insertBefore(input, readoutEl);
      const done = () => { if (!input.parentNode) return; const v = parseFloat(input.value); if (!isNaN(v)) { FM.pause(); FM.setTime(Math.max(0, Math.min(FM.scene.project.duration, v))); } input.remove(); readoutEl.style.display = ''; updateReadout(); };
      input.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') done(); else if (ev.key === 'Escape') { input.remove(); readoutEl.style.display = ''; } });
      input.addEventListener('blur', done);
      input.focus(); input.select();
    });

    resizeCanvas();
    FM.timeline.init();
    FM.inspector.init();
    FM.canvasEdit.init();
    refreshAll();
    if (FM.history) FM.history.reset();
    if (FM.storage) FM.storage.load().then(restored => { if (restored && FM.history) FM.history.reset(); });

    // top bar
    const fileInput = document.getElementById('file-input');
    document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { handleFiles(Array.from(fileInput.files)); fileInput.value = ''; });
    const txtBtn = document.getElementById('btn-add-text');   // removed from the toolbar (dup of the Add menu) — guard it
    if (txtBtn) txtBtn.addEventListener('click', () => FM.addTextLayer());
    const addBtn = document.getElementById('btn-add-layer');
    if (addBtn) addBtn.addEventListener('click', () => {
      const r = addBtn.getBoundingClientRect();
      const items = [
        { label: 'Rectangle', action: () => FM.addShapeLayer && FM.addShapeLayer('rect') },
        { label: 'Ellipse', action: () => FM.addShapeLayer && FM.addShapeLayer('ellipse') },
        { label: 'Camera', action: () => FM.addCameraLayer && FM.addCameraLayer() },
        { label: 'Adjustment layer', action: () => FM.addAdjustmentLayer && FM.addAdjustmentLayer() },
        { label: 'Null (rig control)', action: () => FM.addNullLayer && FM.addNullLayer() },
      ];
      if (FM.contextMenu) FM.contextMenu.show(r.left, r.bottom + 4, items);
    });
    const capBtn = document.getElementById('btn-captions');
    if (capBtn) capBtn.addEventListener('click', () => FM.addCaptionLayer());
    const sampleBtn = document.getElementById('btn-sample');
    if (sampleBtn) sampleBtn.addEventListener('click', async () => {
      sampleBtn.disabled = true; sampleBtn.textContent = 'Recording…';
      try { await FM.addSampleClip(); } catch (e) { console.error(e); alert('Sample clip failed: ' + e.message); }
      sampleBtn.disabled = false; sampleBtn.textContent = 'Sample clip';
    });
    document.getElementById('btn-export').addEventListener('click', showExportDialog);
    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) helpBtn.addEventListener('click', () => { if (FM.shortcuts) FM.shortcuts.toggle(); });
    const fitBtn = document.getElementById('btn-fit');
    if (fitBtn) fitBtn.addEventListener('click', () => FM.fitToContent());
    const onionBtn = document.getElementById('btn-onion');
    if (onionBtn) onionBtn.addEventListener('click', () => { FM.onionSkin = !FM.onionSkin; onionBtn.classList.toggle('active', FM.onionSkin); render(); });
    const snapBtn = document.getElementById('btn-snapshot');
    if (snapBtn) snapBtn.addEventListener('click', () => FM.snapshotPNG());
    const saveProjBtn = document.getElementById('btn-save-proj');
    if (saveProjBtn) saveProjBtn.addEventListener('click', () => { if (FM.storage && FM.storage.exportFile) FM.storage.exportFile(); });
    const openProjBtn = document.getElementById('btn-open-proj');
    if (openProjBtn) openProjBtn.addEventListener('click', () => { if (FM.storage && FM.storage.importFile) FM.storage.importFile(); });
    // ⋯ More menu — the decluttered home for canvas/guides/save-frame/open/save/shortcuts (AM keeps the top minimal)
    const moreBtn = document.getElementById('btn-more');
    if (moreBtn) moreBtn.addEventListener('click', () => {
      const clickHidden = (id) => { const b = document.getElementById(id); if (b) b.click(); };
      const r = moreBtn.getBoundingClientRect();
      const rates = [0.25, 0.5, 1, 2, 4], cur = FM.previewRate || 1;
      const nextRate = rates[(rates.indexOf(cur) + 1) % rates.length];
      if (FM.contextMenu) FM.contextMenu.show(Math.max(8, r.right - 200), r.bottom + 4, [
        { label: 'Canvas size…', action: () => clickHidden('btn-canvas') },
        { label: FM.showGuides ? 'Hide guides' : 'Show guides', action: () => clickHidden('btn-guides') },
        { label: 'Save frame (PNG)', action: () => clickHidden('btn-snapshot') },
        { sep: true },
        // Timeline controls that AM keeps off the play row — relocated here so they stay reachable.
        { label: (FM.loop ? '✓ ' : '') + 'Loop playback', action: () => clickHidden('btn-loop') },
        { label: (FM.onionSkin ? '✓ ' : '') + 'Onion skin', action: () => clickHidden('btn-onion') },
        { label: 'Snapping (magnet)', action: () => clickHidden('btn-snap') },
        { label: 'Split clip at playhead', action: () => clickHidden('btn-split') },
        { label: 'Trim project to last clip', action: () => clickHidden('btn-fit') },
        { label: 'Preview speed: ' + cur + '× → ' + nextRate + '×', action: () => { FM.setPreviewRate(nextRate); const pr = document.getElementById('preview-rate'); if (pr) pr.value = String(nextRate); } },
        { label: 'Zoom timeline in', action: () => clickHidden('btn-zoomin') },
        { label: 'Zoom timeline out', action: () => clickHidden('btn-zoomout') },
        { sep: true },
        { label: 'Open project…', action: () => clickHidden('btn-open-proj') },
        { label: 'Save project', action: () => clickHidden('btn-save-proj') },
        { label: 'Reset project…', danger: true, action: () => { if (confirm('Reset the project? This clears all layers and cannot be undone.')) FM.resetProject(); } },
        { sep: true },
        { label: 'Keyboard shortcuts', action: () => clickHidden('btn-help') },
      ]);
    });
    const prateEl = document.getElementById('preview-rate');
    if (prateEl) prateEl.addEventListener('change', () => FM.setPreviewRate(parseFloat(prateEl.value) || 1));
    const guidesBtn = document.getElementById('btn-guides');
    if (guidesBtn) guidesBtn.addEventListener('click', () => { FM.showGuides = !FM.showGuides; guidesBtn.classList.toggle('active', FM.showGuides); render(); });
    const undoBtn = document.getElementById('btn-undo'), redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.addEventListener('click', () => { if (FM.history) FM.history.undo(); });
    if (redoBtn) redoBtn.addEventListener('click', () => { if (FM.history) FM.history.redo(); });
    // ⧉ Layer-actions menu (AM): Select All / Duplicate / Copy / Save Preset / Paste / Paste Style.
    const layerMenuBtn = document.getElementById('btn-layermenu');
    if (layerMenuBtn) layerMenuBtn.addEventListener('click', () => {
      if (!FM.contextMenu) return;
      const r = layerMenuBtn.getBoundingClientRect();
      const hasSel = !!FM.scene.selectedId;
      const hasClip = !!(FM.clipboard && FM.clipboard.length);
      const hasStyle = !!(FM.clipboard && FM.clipboard[0] && FM.clipboard[0].snapshot);
      FM.contextMenu.show(Math.max(8, r.right - 200), r.bottom + 4, [
        { label: 'Select All Layers', action: () => { if (FM.selectAll) FM.selectAll(); } },
        { label: 'Duplicate Layer', disabled: !hasSel, action: () => { if (FM.scene.selectedId) FM.duplicateLayer(FM.scene.selectedId); } },
        { label: 'Copy Layer', disabled: !hasSel, action: () => { if (FM.copySelection) FM.copySelection(); } },
        { label: 'Save Preset', disabled: true, action: () => {} },          // placeholder — not built yet
        { label: 'Paste Layer', disabled: !hasClip, action: () => { if (FM.pasteClipboard) FM.pasteClipboard(); } },
        { label: 'Paste Style…', disabled: !(hasSel && hasStyle), action: () => { if (FM.openPasteStyle) FM.openPasteStyle(); } },
      ]);
    });
    // ⛶ → toggle AM's right-side VIEW toolbar (fit · grid · layers · camera · canvas zoom).
    const amFitBtn = document.getElementById('btn-amfit');
    const viewBar = document.getElementById('view-bar');
    if (amFitBtn && viewBar) amFitBtn.addEventListener('click', () => {
      const open = viewBar.classList.toggle('hidden') === false;
      amFitBtn.classList.toggle('active', open);
      const g = document.getElementById('vb-grid'); if (g) g.classList.toggle('on', !!FM.showGuides);   // sync state on open
    });
    const vbFit = document.getElementById('vb-fit');
    if (vbFit) vbFit.addEventListener('click', () => FM.setCanvasZoom(1));
    const vbGrid = document.getElementById('vb-grid');
    if (vbGrid) vbGrid.addEventListener('click', () => { FM.showGuides = !FM.showGuides; vbGrid.classList.toggle('on', FM.showGuides); render(); });
    const vbLayers = document.getElementById('vb-layers');
    if (vbLayers) vbLayers.addEventListener('click', () => { if (FM.toast) FM.toast('Layers — coming soon', 1400); });   // function TBD (matches AM placement)
    const vbCam = document.getElementById('vb-camera');
    if (vbCam) vbCam.addEventListener('click', () => { if (FM.addCameraLayer) FM.addCameraLayer(); });
    const vbZin = document.getElementById('vb-zoomin');
    if (vbZin) vbZin.addEventListener('click', () => FM.zoomCanvasStep(1));
    const vbZout = document.getElementById('vb-zoomout');
    if (vbZout) vbZout.addEventListener('click', () => FM.zoomCanvasStep(-1));

    // transport
    document.getElementById('btn-play').addEventListener('click', () => FM.togglePlay());
    // Skip ◀ / ▶| step to the PREVIOUS / NEXT snap point (benchmark or selected-clip edge), falling back
    // to the project start / end when there's nothing closer.
    document.getElementById('btn-tostart').addEventListener('click', () => {
      const t = FM.time, eps = 1e-3;
      const before = FM.timelineSnapPoints().filter(p => p < t - eps);
      FM.pause(); FM.setTime(before.length ? before[before.length - 1] : 0);
    });
    const toEnd = document.getElementById('btn-toend');
    if (toEnd) toEnd.addEventListener('click', () => {
      const t = FM.time, eps = 1e-3;
      const next = FM.timelineSnapPoints().find(p => p > t + eps);
      FM.pause(); FM.setTime(next != null ? next : FM.scene.project.duration);
    });
    const loopBtn = document.getElementById('btn-loop');
    if (loopBtn) loopBtn.addEventListener('click', () => { FM.loop = !FM.loop; loopBtn.classList.toggle('active', FM.loop); });
    const splitBtn = document.getElementById('btn-split');
    if (splitBtn) splitBtn.addEventListener('click', () => { if (FM.scene.selectedId) FM.splitLayer(FM.scene.selectedId); });
    const pn = document.getElementById('proj-name');
    if (pn) {
      pn.value = FM.scene.project.name || 'Untitled';
      pn.addEventListener('input', () => { FM.scene.project.name = pn.value; });
      pn.addEventListener('change', () => { if (FM.history) FM.history.commit(); });
    }

    // canvas-size / aspect-ratio dialog (AM-style)
    let cvAspect = '9:16';
    const cvDialog = document.getElementById('canvas-dialog');
    function cvCompute() {
      const base = parseInt(document.getElementById('cv-res').value, 10) || 1080;
      const pr = cvAspect.split(':').map(Number), a = pr[0], b = pr[1];
      let w, h;
      if (a >= b) { h = base; w = base * a / b; } else { w = base; h = base * b / a; }
      return { w: Math.round(w / 2) * 2, h: Math.round(h / 2) * 2 };
    }
    function cvUpdate() {
      const s = cvCompute();
      document.getElementById('cv-size').textContent = s.w + ' × ' + s.h;
      document.querySelectorAll('.aspect-chip').forEach(c => c.classList.toggle('on', c.dataset.aspect === cvAspect));
    }
    function cvDetect() {
      const r = FM.scene.project.width / FM.scene.project.height;
      const map = { '16:9': 16 / 9, '9:16': 9 / 16, '4:5': 4 / 5, '1:1': 1, '4:3': 4 / 3 };
      let best = '9:16', bd = 1e9;
      Object.keys(map).forEach(k => { const d = Math.abs(map[k] - r); if (d < bd) { bd = d; best = k; } });
      cvAspect = best;
    }
    const canvasBtn = document.getElementById('btn-canvas');
    if (canvasBtn && cvDialog) {
      canvasBtn.addEventListener('click', () => { cvDetect(); cvUpdate(); cvDialog.classList.remove('hidden'); });
      document.querySelectorAll('.aspect-chip').forEach(chip => chip.addEventListener('click', () => { cvAspect = chip.dataset.aspect; cvUpdate(); }));
      document.getElementById('cv-res').addEventListener('change', cvUpdate);
      document.getElementById('cv-cancel').addEventListener('click', () => cvDialog.classList.add('hidden'));
      document.getElementById('cv-go').addEventListener('click', () => {
        const s = cvCompute();
        FM.scene.project.width = s.w; FM.scene.project.height = s.h;
        FM.scene.project.fps = parseInt(document.getElementById('cv-fps').value, 10) || 30;
        resizeCanvas(); refreshAll();
        if (FM.history) FM.history.commit();
        cvDialog.classList.add('hidden');
      });
    }

    // export dialog
    document.getElementById('exp-cancel').addEventListener('click', hideExportDialog);
    document.getElementById('exp-go').addEventListener('click', runExport);
    document.getElementById('export-cancel').addEventListener('click', () => { FM._exportCancel = true; });

    // drag + drop
    const stage = document.getElementById('stage');
    ['dragenter', 'dragover'].forEach(ev => stage.addEventListener(ev, e => { e.preventDefault(); stage.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach(ev => stage.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' || e.target === stage) stage.classList.remove('dragover'); }));
    stage.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(Array.from(e.dataTransfer.files)); });

    // keyboard
    let _nudged = false;
    window.addEventListener('keydown', e => {
      const mod = e.metaKey || e.ctrlKey;
      // Editable target = native <input>/<select>/<textarea> OR any contentEditable element
      // (the Move & Transform value boxes are contentEditable <div>s). When focused there, let the
      // browser handle the key (text edit / undo / copy) instead of firing app shortcuts — otherwise
      // Backspace deletes the selected LAYER while you're trying to fix a digit. (#1)
      const tgt = e.target;
      const inEdit = !!(tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable));
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        if (inEdit) return; // let field text-undo
        e.preventDefault();
        if (e.shiftKey) { if (FM.history) FM.history.redo(); } else { if (FM.history) FM.history.undo(); }
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) { if (inEdit) return; e.preventDefault(); if (FM.history) FM.history.redo(); return; }
      if (mod && (e.key === 'd' || e.key === 'D')) {
        if (inEdit) return;
        e.preventDefault();
        if (FM.scene.selectedId) FM.duplicateLayer(FM.scene.selectedId);
        return;
      }
      if (mod && (e.key === 'c' || e.key === 'C')) {
        if (inEdit) return;
        const sel = window.getSelection && window.getSelection();
        if (sel && String(sel).length) return;   // don't hijack a real text-selection copy
        e.preventDefault();
        if (FM.copySelection) FM.copySelection();
        return;
      }
      if (mod && (e.key === 'v' || e.key === 'V')) {
        if (inEdit) return;
        e.preventDefault();
        if (FM.pasteClipboard) FM.pasteClipboard();
        return;
      }
      if (mod && (e.key === 'a' || e.key === 'A')) {
        if (inEdit) return;
        e.preventDefault();
        if (FM.selectAll) FM.selectAll();
        return;
      }
      if (inEdit) return;
      if (e.code === 'Space') { e.preventDefault(); FM.togglePlay(); }
      else if (e.key === '?') { e.preventDefault(); if (FM.shortcuts) FM.shortcuts.toggle(); }
      else if (e.code.indexOf('Arrow') === 0) {
        const nudgeable = (FM.selectionIds ? FM.selectionIds() : (FM.scene.selectedId ? [FM.scene.selectedId] : []))
          .map(id => FM.layerById(FM.scene, id)).filter(l => l && !l.locked);
        if (nudgeable.length) {                                  // nudge all selected layers
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0, dy = 0;
          if (e.code === 'ArrowLeft') dx = -step; else if (e.code === 'ArrowRight') dx = step;
          else if (e.code === 'ArrowUp') dy = -step; else if (e.code === 'ArrowDown') dy = step;
          nudgeable.forEach(layer => {
            const tr = layer.transform;
            FM.setTransform(layer, 'x', Math.round(FM.evalProp(tr.x, FM.time) + dx), FM.time);
            FM.setTransform(layer, 'y', Math.round(FM.evalProp(tr.y, FM.time) + dy), FM.time);
          });
          FM.requestRender(); if (FM.inspector) FM.inspector.refresh(); if (FM.canvasEdit) FM.canvasEdit.update();
          _nudged = true;
        } else if (e.code === 'ArrowRight') { e.preventDefault(); FM.pause(); FM.setTime(FM.time + 1 / (FM.scene.project.fps || 30)); }
        else if (e.code === 'ArrowLeft') { e.preventDefault(); FM.pause(); FM.setTime(FM.time - 1 / (FM.scene.project.fps || 30)); }
      }
      else if (e.code === 'Comma') { e.preventDefault(); FM.pause(); FM.setTime(FM.time - 1 / (FM.scene.project.fps || 30)); }
      else if (e.code === 'Period') { e.preventDefault(); FM.pause(); FM.setTime(FM.time + 1 / (FM.scene.project.fps || 30)); }
      else if (e.code === 'Home') { e.preventDefault(); FM.pause(); FM.setTime(0); }
      else if (e.code === 'End') { e.preventDefault(); FM.pause(); FM.setTime(FM.scene.project.duration); }
      else if (e.code === 'BracketLeft') { e.preventDefault(); const P = FM.scene.project; P.loopIn = FM.time; if (P.loopOut != null && P.loopOut <= P.loopIn) P.loopOut = null; FM.timeline.rebuild(); if (FM.history) FM.history.commit(); }
      else if (e.code === 'BracketRight') { e.preventDefault(); const P = FM.scene.project; P.loopOut = FM.time; if (P.loopIn != null && P.loopIn >= P.loopOut) P.loopIn = null; FM.timeline.rebuild(); if (FM.history) FM.history.commit(); }
      else if (e.code === 'Backslash') { e.preventDefault(); FM.scene.project.loopIn = null; FM.scene.project.loopOut = null; FM.timeline.rebuild(); }
      else if (e.code === 'KeyM') { e.preventDefault(); if (e.repeat) return; if (FM.toggleMarkerAtPlayhead) FM.toggleMarkerAtPlayhead(); }   // toggle (dedups within 0.12s) + ignore OS autorepeat → no stacked duplicates / undo spam
      else if (e.code === 'Tab') { e.preventDefault(); const ls = FM.scene.layers; if (ls.length) { const i = ls.findIndex(l => l.id === FM.scene.selectedId); const n = ((i < 0 ? 0 : i + (e.shiftKey ? -1 : 1)) + ls.length) % ls.length; FM.selectLayer(ls[n].id); } }
      else if ((e.code === 'Equal' || e.code === 'NumpadAdd') && FM.timeline.zoomBy) { e.preventDefault(); FM.timeline.zoomBy(1.5); }
      else if ((e.code === 'Minus' || e.code === 'NumpadSubtract') && FM.timeline.zoomBy) { e.preventDefault(); FM.timeline.zoomBy(1 / 1.5); }
      else if (e.code === 'Escape') { e.preventDefault(); if (FM.shortcuts && FM.shortcuts.isOpen()) { FM.shortcuts.hide(); } else if (FM.scene.selectedId || (FM.scene.selectedIds && FM.scene.selectedIds.length)) { FM.scene.selectedId = null; FM.scene.selectedIds = []; FM.layersPanel.refresh(); if (FM.inspector) FM.inspector.refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); } }
      else if (e.code === 'KeyS') { e.preventDefault(); if (FM.scene.selectedId) FM.splitLayer(FM.scene.selectedId); }
      else if (e.code === 'Backspace' || e.code === 'Delete') { e.preventDefault(); FM.deleteSelected(); }
    });
    window.addEventListener('keyup', e => {
      if (_nudged && e.code.indexOf('Arrow') === 0) { _nudged = false; if (FM.history) FM.history.commit(); }
    });

    // Tap ANY empty background (the stage around the comp, the gaps between panels, etc.) → deselect,
    // which reveals the Add menu (PC) / drops the inspector sheet (phone). Tap-vs-drag aware so a
    // scrub/move never deselects. The canvas (#preview) and timeline (#timeline) own their OWN
    // select/deselect (and every clip/head/ruler/lane lives inside #timeline), so the deny-list keeps
    // them plus every interactive control; everything else counts as empty space.
    (function deselectOnEmptyTap() {
      const KEEP = '#preview, #select-box, #timeline, #transport, #inspector-panel, #ai-panel,' +
        ' #ctx-menu, #shortcuts-overlay, #export-overlay, #export-dialog, #canvas-dialog, #add-sheet,' +
        ' #topbar, #topbar-m, .sb-handle, button, input, select, textarea, label, a, option, [contenteditable]';
      let dx = 0, dy = 0, keepAtDown = false, armed = false;
      document.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) { armed = false; return; }
        dx = e.clientX; dy = e.clientY; armed = true;
        // Decide NOW, while the target is still attached, whether it's a control / self-managing area.
        // Clicking a clip selects it → that calls timeline.rebuild() which DETACHES the clicked element,
        // so a closest('#timeline') check at pointerup would see a detached node (null) and wrongly
        // deselect. Capturing the decision at pointerdown survives the rebuild.
        keepAtDown = !!(e.target && e.target.closest && e.target.closest(KEEP));
      }, true);
      document.addEventListener('pointerup', (e) => {
        if (!armed) return; armed = false;
        if (keepAtDown) return;                                                             // tapped a control / self-managing area
        if (Math.abs(e.clientX - dx) > 6 || Math.abs(e.clientY - dy) > 6) return;           // a drag, not a tap
        if (!FM.scene || (!FM.scene.selectedId && !(FM.scene.selectedIds && FM.scene.selectedIds.length))) return;
        FM.selectLayer(null);                                                               // empty background → deselect
      }, true);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.FM);
