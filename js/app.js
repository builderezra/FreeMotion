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
      if (m && m.el && !layer.reversed) { try { m.el.playbackRate = Math.min(16, Math.max(0.0625, (FM.evalProp(layer.speed, FM.time) || 1) * FM.previewRate)); } catch (e) {} }
    });
    // reversed clips play synthesized Web Audio (not the <video>); re-anchor it to the current playhead so
    // a mid-play rate change re-syncs at the new speed (start() rebuilds nodes with playbackRate=previewRate).
    if (FM.playing && FM.audioPlay && FM.scene.layers.some(l => l.type === 'video' && l.reversed && l.visible !== false)) FM.audioPlay.start();
  };

  function updateDropHint() {
    dropHint.classList.toggle('hidden', FM.scene.layers.length > 0);
  }

  // Keep the composition EXACTLY as long as its clips — grows when a clip extends past the end,
  // shrinks when the furthest clip ends earlier. Runs on every refresh so the timeline never has
  // trailing empty space. Empty project keeps its configured length.
  FM.autoFitDuration = function () {
    if (!FM.scene.layers.length) return;
    let end = 0;
    FM.scene.layers.forEach(l => { const e = (l.start || 0) + (l.duration || 0); if (e > end) end = e; });
    end = Math.max(0.5, Math.round(end * 1000) / 1000);
    if (FM.scene.project.duration !== end) FM.scene.project.duration = end;
    if (FM.time > end) FM.time = end;   // clamp the playhead to the new end
  };

  function refreshAll() {
    if (FM.autoFitDuration) FM.autoFitDuration();   // timeline length always tracks the clips
    FM.inspector.refresh();
    FM.timeline.rebuild();
    updateDropHint();
    updateReadout();
    render();
    syncTopBar();
    // multi-selection state drives the Group button; select-mode ends when the selection empties
    const multi = FM.selectionIds ? FM.selectionIds().length : 0;
    if (multi === 0 && FM.selectMode) FM.selectMode = false;
    document.body.classList.toggle('sel-multi', multi >= 2);
    document.body.classList.toggle('sel-mode', !!FM.selectMode);
  }
  FM.refreshAll = refreshAll;

  // Desktop top bar: the name field shows the SELECTED LAYER's name (rename it there, AM-style) and
  // reverts to the project name when nothing is selected; the delete button appears only with a
  // selection. Called from refreshAll AND selectLayer so it tracks every selection change.
  function syncTopBar() {
    const sel = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    const pn = document.getElementById('proj-name');
    if (pn && document.activeElement !== pn) { pn.value = sel ? (sel.name || '') : (FM.scene.project.name || 'Untitled'); pn.title = sel ? 'Layer name' : 'Project name'; }
    const delBtn = document.getElementById('btn-del-layer');
    if (delBtn) delBtn.style.display = sel ? '' : 'none';
  }
  FM.syncTopBar = syncTopBar;

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

  // Small status toast. AUTO-HIDES by default (omitting ms used to mean sticky — which left every
  // duration-less caller, e.g. "Grouped 3 layers", on screen forever). Pass ms=0 for a sticky
  // progress toast paired with FM.hideToast(). The seq guard stops an old timer from hiding a newer toast.
  let toastSeq = 0;
  FM.toast = function (msg, ms) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.remove('hidden');
    const my = ++toastSeq;
    if (ms === undefined) ms = 2200;
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
    else { P.markers.push({ t: FM.snapFrame(t), label: 'Benchmark' }); if (FM.toast) FM.toast('Benchmark added', 1000); }   // markers live on exact frames
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
    if (sel) {
      pts.push(Math.max(0, sel.start)); pts.push(Math.min(P.duration, sel.start + sel.duration));
      // Playhead ON the selected clip → its KEYFRAMES join the skip stops (off the clip they don't).
      if (FM.time >= sel.start - 1e-6 && FM.time <= sel.start + sel.duration + 1e-6 && FM.animatedProps) {
        FM.animatedProps(sel).forEach(pr => pr.kf.forEach(k => { if (k.t >= 0 && k.t <= P.duration) pts.push(k.t); }));
      }
    }
    return pts.sort((a, b) => a - b);
  };

  // Decode a clip's frames once so reverse / frame-blend slow-mo plays + scrubs smoothly.
  FM.ensureReverseCache = async function (layer) {
    if (!layer || layer.type !== 'video') return;
    const m = FM.media.get(layer.id);
    if (!m || m.frameCache) return;
    const fps = Math.min(FM.scene.project.fps || 30, 24);
    FM.toast('Preparing frames…', 0);   // sticky progress toast — hidden by the finally below
    // Preview: downscale + byte-cap so a long reversed/slow clip can't OOM-kill mobile Safari.
    try { await FM.buildFrameCache(m, fps, p => FM.toast('Preparing frames… ' + Math.round(p * 100) + '%', 0), { maxDim: 960, maxBytes: 384 * 1024 * 1024 }); }
    finally { FM.hideToast(); }
    render();
  };

  // Quantize to the project frame grid — EVERYTHING user-placed (playhead, keyframes, markers,
  // splits) lives on an exact frame, like AM. Playback itself stays smooth (tick bypasses setTime).
  FM.snapFrame = function (t) { const f = FM.scene.project.fps || 30; return Math.round(t * f) / f; };
  FM.setTime = function (t) {
    if (!FM.playing) t = FM.snapFrame(t);
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
          // speed RAMP: follow the keyframed curve live (drift-resync above catches any residue)
          if (FM.isAnimated(layer.speed)) m.el.playbackRate = Math.min(16, Math.max(0.0625, (FM.evalProp(layer.speed, FM.time) || 1) * (FM.previewRate || 1)));
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
        try { m.el.playbackRate = Math.min(16, Math.max(0.0625, (FM.evalProp(layer.speed, FM.time) || 1) * (FM.previewRate || 1))); } catch (e) {}
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
    FM.time = FM.snapFrame ? FM.snapFrame(FM.time) : FM.time;   // land ON a frame, never between two
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
      x: P.width / 2, y: P.height / 2, start: first ? 0 : FM.time, duration: dur,   // import AT THE PLAYHEAD (first clip anchors at 0)
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
    const layer = FM.makeLayer('text', { name: 'Text', x: P.width / 2, y: P.height / 2, fontSize: Math.round(P.height / 12), start: FM.time, duration: 5 });
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
  // Natural default aspect (w×h multipliers) per shape kind — a Rectangle spawns landscape, an
  // arrow/line elongated, a semicircle as half a CIRCLE… instead of everything being an identical square.
  const SHAPE_ASPECT = {
    rect: [1.5, 1], line: [1.6, 0.4], arrow: [1.6, 0.8], semicircle: [1.3, 0.65],
    trapezoid: [1.4, 0.9], parallelogram: [1.5, 0.9],
    banner: [1.6, 0.7], envelope: [1.4, 1], car: [1.5, 1], check: [1.25, 1], cloud: [1.4, 0.95], boat: [1.1, 1.1],
  };
  FM.addShapeLayer = function (shape, opts) {
    opts = opts || {};
    const P = FM.scene.project;
    // Base size off the SHORTER project side so a shape is IDENTICAL in every format (9:16 / 16:9 /
    // 1:1 — never stretched by the canvas aspect), then apply the shape's own natural aspect so it
    // actually looks like what it's called (a circle stays a circle, a rectangle isn't a square).
    const d = Math.round(Math.min(P.width, P.height) / 3);
    const asp = SHAPE_ASPECT[shape || 'rect'] || [1, 1];
    const layer = FM.makeLayer('shape', {
      name: opts.name || (shape ? shape.charAt(0).toUpperCase() + shape.slice(1) : 'Shape'),
      shape: shape || 'rect', x: P.width / 2, y: P.height / 2,
      shapeW: Math.round(d * asp[0]), shapeH: Math.round(d * asp[1]),
      start: FM.time, duration: 5,   // add AT THE PLAYHEAD (was start 0); a fixed 5s clip that extends the comp
      extra: opts.extra,
    });
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // Path shape layer from drawn points (freehand brush stroke / vector polygon). projPts are in
  // project pixels; stored normalized [0,1] inside a box fitted to their bounds so they scale/rotate
  // like any shape. opt: { closed, name, color, fill, stroke }.
  FM.addPathLayer = function (projPts, opt) {
    opt = opt || {};
    if (!projPts || projPts.length < 2) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    projPts.forEach(p => { if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; });
    const w = Math.max(4, maxX - minX), h = Math.max(4, maxY - minY);
    const pts = projPts.map(p => [(p[0] - minX) / w, (p[1] - minY) / h]);
    const P = FM.scene.project;
    const layer = FM.makeLayer('shape', {
      name: opt.name || 'Drawing', shape: 'path',
      x: minX + w / 2, y: minY + h / 2,
      shapeW: Math.round(w), shapeH: Math.round(h),
      start: FM.time, duration: 5,   // appears at the playhead
      extra: { points: pts, closed: !!opt.closed },
    });
    if (opt.closed) {
      layer.fill = opt.fill || '#3a7bd5';
      layer.stroke = { enabled: false, width: 8, color: '#ffffff' };
    } else {
      layer.fill = opt.color || '#ffffff';   // open path is stroked with fill-as-colour (matches 'line')
      layer.stroke = { enabled: true, width: opt.stroke || 6, color: opt.color || '#ffffff' };
    }
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
    return layer;
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
    FM.selectMode = false;   // single-select anywhere (canvas/clip/head) exits multi-select mode (#r8)
    FM.scene.selectedId = id;
    FM.scene.selectedIds = id ? [id] : [];
    FM.layersPanel.refresh();
    FM.inspector.refresh();
    FM.timeline.rebuild();
    if (FM.syncTopBar) FM.syncTopBar();   // name field ↔ layer name + delete button
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
  FM.toggleSelect = function (id, silent) {
    let ids = FM.selectionIds().slice();
    if (ids.includes(id)) { ids = ids.filter(x => x !== id); FM.scene.selectedId = ids.length ? ids[ids.length - 1] : null; }
    else { ids.push(id); FM.scene.selectedId = id; }
    FM.scene.selectedIds = ids;
    if (silent) return;   // paint-select updates mid-gesture — a rebuild here would detach the pointer's target
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

  FM.deleteLayer = function (id, _nested) {
    if (FM.groupContext === id && FM.exitGroup) FM.exitGroup(true);   // deleting the group you're inside
    // Deleting a GROUP deletes its members too (AM). Recurse first so nested groups cascade and
    // each member's media/audio teardown runs through this same path — but refresh/undo commit
    // only once, at the outermost call (one Ctrl+Z restores the whole group). (#r7)
    const target = FM.scene.layers.find(l => l.id === id);
    if (target && target.type === 'group') {
      FM.scene.layers.filter(l => l.parent === id).forEach(child => FM.deleteLayer(child.id, true));
    }
    const m = FM.media.get(id);
    if (m) { if (m.el) { try { m.el.pause(); m.el.muted = true; } catch (e) {} } FM.clearFrameCache(m); }   // stop a deleted forward clip's native audio (#6)
    FM.scene.layers = FM.scene.layers.filter(l => l.id !== id);
    FM.media.remove(id);
    if (FM.storage && FM.storage.removeMedia) FM.storage.removeMedia(id);   // drop its blob from IndexedDB
    if (_nested) return;   // outermost call finishes the teardown below exactly once (#r7)
    // A deleted clip's synthesized (reversed) audio plays from a flat node list not keyed by layer, so
    // it keeps sounding after the clip is gone. Rebuild the active nodes from the post-delete layer set.
    if (FM.playing && FM.audioPlay) { FM.audioPlay.stop(); FM.audioPlay.start(); }
    if (FM.scene.selectedId === id) FM.scene.selectedId = FM.scene.layers[0] ? FM.scene.layers[0].id : null;
    FM.refreshAll();   // FM.* (not the local) so the mobile wrapper runs → deleting the last layer drops the sheet (#13)
    if (FM.history) FM.history.commit();
  };

  // ---- AM-style grouping: a 'group' layer is an invisible transform parent; members follow it
  // via the existing parent chain. Timeline shows the group as a collapsible row.
  // opts.mask → MASKING group: the top member clips the rest (composited as one unit in renderScene).
  FM.groupSelection = function (opts) {
    opts = opts || {};
    const ids = FM.selectionIds();
    const members = FM.scene.layers.filter(l => ids.includes(l.id) && l.type !== 'camera');
    if (members.length < 2) return;
    const start = Math.min.apply(null, members.map(l => l.start));
    const end = Math.max.apply(null, members.map(l => l.start + l.duration));
    // NEUTRAL transform (0,0) — the group becomes the members' PARENT, so any x/y here would
    // instantly displace every member by that amount the moment they're grouped.
    const g = FM.makeLayer('group', { name: opts.mask ? 'Mask Group' : 'Group', x: 0, y: 0, start: start, duration: end - start });
    if (opts.mask) g.maskGroup = true;
    if (FM.groupContext) g.parent = FM.groupContext;   // grouping while editing a group nests inside it
    // Re-parent only top-level members — a child whose parent is also being grouped keeps it.
    members.forEach(l => { if (!l.parent || !ids.includes(l.parent)) l.parent = g.id; });
    // Pull members contiguous directly under the group row (top-most member's slot).
    const topIdx = FM.scene.layers.findIndex(l => members.includes(l));
    FM.scene.layers = FM.scene.layers.filter(l => !members.includes(l));
    FM.scene.layers.splice(Math.max(0, Math.min(topIdx, FM.scene.layers.length)), 0, g);
    Array.prototype.splice.apply(FM.scene.layers, [FM.scene.layers.indexOf(g) + 1, 0].concat(members));
    FM.selectMode = false;
    FM.selectLayer(g.id);
    if (FM.toast) FM.toast(opts.mask ? 'Masking group — its top layer clips the rest' : 'Grouped ' + members.length + ' layers');
    if (FM.history) FM.history.commit();
  };
  FM.ungroup = function (id) {
    const g = FM.scene.layers.find(l => l.id === id);
    if (!g || g.type !== 'group') return;
    if (FM.groupContext === id) FM.exitGroup(true);
    FM.scene.layers.forEach(l => { if (l.parent === id) l.parent = g.parent || null; });   // members lift into the parent context
    FM.scene.layers = FM.scene.layers.filter(l => l !== g);
    FM.selectLayer(null);
    FM.refreshAll();
    if (FM.history) FM.history.commit();
  };

  // ---- Edit Group (AM): open a group in its own timeline view — only its members show, edit them
  // individually, then back out (‹ back / the crumb pill). Purely a view scope; time stays global.
  FM.groupContext = null;
  function updateGroupCrumb() {
    const c = document.getElementById('group-crumb'); if (!c) return;
    const g = FM.groupContext ? FM.scene.layers.find(l => l.id === FM.groupContext) : null;
    if (g) { c.querySelector('.gc-name').textContent = g.name || 'Group'; c.classList.remove('hidden'); document.body.classList.add('group-editing'); }
    else { c.classList.add('hidden'); document.body.classList.remove('group-editing'); }
  }
  FM.enterGroup = function (id) {
    const g = FM.scene.layers.find(l => l.id === id && l.type === 'group');
    if (!g) return;
    FM.selectMode = false;
    FM.groupContext = id;
    FM.selectLayer(null);
    updateGroupCrumb();
    FM.refreshAll();
  };
  FM.exitGroup = function (silent) {
    const id = FM.groupContext;
    FM.groupContext = null;
    updateGroupCrumb();
    if (!silent && id && FM.scene.layers.some(l => l.id === id)) FM.selectLayer(id);
    else FM.refreshAll();
  };
  FM.groupDescendants = function (id) {
    const out = [];
    const walk = gid => FM.scene.layers.forEach(l => { if (l.parent === gid) { out.push(l); if (l.type === 'group') walk(l.id); } });
    walk(id);
    return out;
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
    const origTrim = layer.trimStart, origDur = layer.duration;
    // trimStart is SOURCE time — advance through the (possibly RAMPED) speed curve, not a flat multiply
    const advInto = FM.layerSourceAdvance ? FM.layerSourceAdvance(layer, into) : into * (layer.speed || 1);
    const advTotal = FM.layerSourceAdvance ? FM.layerSourceAdvance(layer, origDur) : origDur * (layer.speed || 1);
    const B = FM.cloneLayer(layer, true);                       // identical copy (new id)
    B.start = t;
    B.duration = end - t;
    if (layer.reversed) {
      // reversed plays source end→start: A keeps the END span, B keeps the START span
      B.trimStart = origTrim;
      layer.trimStart = origTrim + (advTotal - advInto);
    } else {
      B.trimStart = origTrim + advInto;                          // B resumes where A left off in the source (ramp-aware)
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
    // grouping + reusable saves
    const selCount = FM.selectionIds ? FM.selectionIds().length : 0;
    items.push({ sep: true });
    if (layer.type === 'group') {
      items.push({ label: 'Edit group', action: () => FM.enterGroup(layer.id) });
      items.push({ label: layer.maskGroup ? 'Masking: ON — make normal group' : 'Use as masking group', action: () => { layer.maskGroup = !layer.maskGroup; FM.requestRender(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit(); } });
      items.push({ label: 'Ungroup', action: () => FM.ungroup(layer.id) });
    }
    if (selCount >= 2) {
      items.push({ label: 'Group selection', action: () => FM.groupSelection() });
      items.push({ label: 'Masking group', action: () => FM.groupSelection({ mask: true }) });
    }
    items.push({ label: 'Save as preset…', action: () => FM.savePresetPrompt && FM.savePresetPrompt(layer) });
    items.push({ label: 'Save selection as element…', action: () => FM.saveElementPrompt && FM.saveElementPrompt() });
    items.push({ sep: true }, { label: 'Delete', danger: true, action: () => FM.deleteLayer(layer.id) });
    return items;
  };

  // Save the selected layer's LOOK + ANIMATIONS as a reusable preset (see inspector.js FM.layerPresets).
  FM.savePresetPrompt = function (layer) {
    layer = layer || FM.selectedLayer(FM.scene);
    if (!layer) { if (FM.toast) FM.toast('Select a layer first'); return; }
    const name = prompt('Preset name:', layer.name + ' look');
    if (!name || !name.trim()) return;
    FM.layerPresets.save(name.trim(), layer);
    if (FM.toast) FM.toast('Preset saved — apply it from any layer’s Presets section');
  };
  // Save the current selection as a reusable ELEMENT (insertable from Add → Object/Element).
  FM.saveElementPrompt = async function () {
    const ids = FM.selectionIds();
    const layers = FM.scene.layers.filter(l => ids.includes(l.id));
    if (!layers.length) { if (FM.toast) FM.toast('Select the layers to save first'); return; }
    const name = prompt('Element name:', layers.length === 1 ? layers[0].name : layers.length + ' layers');
    if (!name || !name.trim()) return;
    const ok = await FM.elements.save(name.trim(), layers);
    if (FM.toast) FM.toast(ok ? 'Element saved — find it under Add → Object / Element' : 'Could not save element');
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
    if (FM.drawTools) FM.drawTools.init();   // freehand / vector drawing overlay + toolbar
    refreshAll();
    if (FM.history) FM.history.reset();
    if (FM.storage) FM.storage.load().then(restored => {
      if (restored && FM.history) FM.history.reset();
      // Land on the AM-style home screen (project browser); the restored project sits behind it.
      if (FM.home) { FM.home.init(); FM.home.open(); }
      if (FM.projects) FM.projects.pruneOrphans();   // boot sweep of orphaned media blobs
    });
    // ‹ crumb pill exits the Edit Group view
    const gcBack = document.getElementById('group-crumb');
    if (gcBack) gcBack.addEventListener('click', () => { if (FM.exitGroup) FM.exitGroup(); });
    // desktop: clicking the brand goes Home (mobile uses the ‹ back arrow)
    const brandEl = document.querySelector('#topbar .brand');
    if (brandEl) brandEl.addEventListener('click', (e) => { if (e.target.classList.contains('ver')) return; if (FM.home) FM.home.open(); });

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
      const sel = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
      const items = [];
      if (sel && sel.type === 'group') items.push({ label: 'Ungroup', action: () => FM.ungroup(sel.id) }, { sep: true });
      items.push(
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
        { label: 'Keyboard shortcuts', action: () => clickHidden('btn-help') }
      );
      if (FM.contextMenu) FM.contextMenu.show(Math.max(8, r.right - 200), r.bottom + 4, items);
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
      const selN = FM.selectionIds ? FM.selectionIds().length : 0;
      FM.contextMenu.show(Math.max(8, r.right - 200), r.bottom + 4, [
        { label: 'Select All Layers', action: () => { if (FM.selectAll) FM.selectAll(); } },
        { label: 'Group Selection', disabled: selN < 2, action: () => FM.groupSelection() },
        { label: 'Masking Group', disabled: selN < 2, action: () => FM.groupSelection({ mask: true }) },
        { label: 'Duplicate Layer', disabled: !hasSel, action: () => { if (FM.scene.selectedId) FM.duplicateLayer(FM.scene.selectedId); } },
        { label: 'Copy Layer', disabled: !hasSel, action: () => { if (FM.copySelection) FM.copySelection(); } },
        { label: 'Save Preset', disabled: !hasSel, action: () => FM.savePresetPrompt() },
        { label: 'Save Selection as Element…', disabled: !hasSel, action: () => FM.saveElementPrompt() },
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
      pn.addEventListener('input', () => {
        const sel = FM.selectedLayer(FM.scene);   // typing renames the SELECTED layer, else the project
        if (sel) { sel.name = pn.value; if (FM.timeline) FM.timeline.rebuild(); }
        else FM.scene.project.name = pn.value;
      });
      pn.addEventListener('change', () => { if (FM.history) FM.history.commit(); });
    }
    // Top-bar delete: removes the selected layer(s). Sits next to ⋯ / Export (the inspector's own
    // delete/duplicate/thumbnail header row was removed — those live on the timeline / top bar now).
    const btnDelLayer = document.getElementById('btn-del-layer');
    if (btnDelLayer) btnDelLayer.addEventListener('click', () => {
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      if (ids.length > 1 && FM.deleteSelected) FM.deleteSelected();
      else if (FM.scene.selectedId) FM.deleteLayer(FM.scene.selectedId);
    });

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
