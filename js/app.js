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
    const ds = Math.round(FM.scene.project.duration), mm = Math.floor(ds / 60), ss = ds % 60;   // round to whole seconds FIRST, else 119.7s → 1:60 instead of 2:00
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
    // SINGLE SOURCE OF TRUTH for project length: the timeline is only ever as long as its clips —
    // the furthest clip end, or exactly 0 when there are no clips. No minimum/floor, so a 1s clip
    // makes a 1s timeline and an empty project is a true 0s timeline.
    let end = 0;
    FM.scene.layers.forEach(l => { const e = (l.start || 0) + (l.duration || 0); if (e > end) end = e; });
    end = Math.max(0, Math.round(end * 1000) / 1000);
    if (FM.scene.project.duration !== end) FM.scene.project.duration = end;
    if (FM.time > end) FM.time = end;   // never leave the playhead past the (possibly shorter) end
    // Clamp/clear a now-stale loop region: a loopIn past the new end made the playback tick wrap to a
    // point beyond the timeline every frame → a frozen infinite-wrap loop (100% CPU, no progress).
    const P = FM.scene.project;
    if (P.loopOut != null && P.loopOut > end) P.loopOut = end;
    if (P.loopIn != null && P.loopIn >= end - 0.01) { P.loopIn = null; P.loopOut = null; }
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
  // ===== AM layer actions (top-bar ⋯ menu when a clip is selected) =====
  FM.fitLayer = function (layer, mode) {   // 'fit' | 'fill' | 'stretch' to the composition area
    const P = FM.scene.project;
    const sz = FM.layerSize ? FM.layerSize(layer) : { w: 100, h: 100 };
    if (!sz.w || !sz.h) return;
    const t = FM.time;
    FM.setTransform(layer, 'x', Math.round(P.width / 2), t);
    FM.setTransform(layer, 'y', Math.round(P.height / 2), t);
    layer.transform.anchorX = 0.5; layer.transform.anchorY = 0.5;
    if (mode === 'stretch') {
      FM.setTransform(layer, 'scale', 1, t);
      layer.transform.scaleX = Math.round(P.width / sz.w * 1000) / 1000;
      layer.transform.scaleY = Math.round(P.height / sz.h * 1000) / 1000;
    } else {
      const s = (mode === 'fill' ? Math.max : Math.min)(P.width / sz.w, P.height / sz.h);
      FM.setTransform(layer, 'scale', Math.round(s * 1000) / 1000, t);
      layer.transform.scaleX = 1; layer.transform.scaleY = 1;
    }
    FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.inspector) FM.inspector.refresh();
    if (FM.history) FM.history.commit();
  };
  FM.flipLayer = function (layer, axis) {   // mirror without touching scale keyframes
    if (axis === 'h') layer.flipH = !layer.flipH; else layer.flipV = !layer.flipV;
    FM.requestRender(); if (FM.history) FM.history.commit();
  };
  FM.extractAudio = async function (layer) {   // audio-only twin of a video clip
    const before = new Set(FM.scene.layers.map(l => l.id));
    await FM.duplicateLayer(layer.id, true);
    const dup = FM.scene.layers.find(l => !before.has(l.id));
    if (!dup) return;
    dup.name = (layer.name || 'Clip') + ' (audio)';
    dup.transform.opacity = 0;      // picture invisible; the tick still plays its sound
    layer.muted = true;             // the original keeps the picture, the twin keeps the voice
    FM.refreshAll(); if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Audio extracted to its own layer — original muted');
  };
  FM.mediaInfoToast = function (layer) {
    const m = FM.media.get(layer.id);
    const parts = [];
    if (m) {
      if (m.width || m.height) parts.push(m.width + '×' + m.height);
      if (m.duration) parts.push(m.duration.toFixed(2) + 's');
      if (m.file && m.file.size) parts.push((m.file.size / 1048576).toFixed(1) + ' MB');
      if (m.file && m.file.name) parts.push(m.file.name);
    } else if (layer.type === 'shape') parts.push('Shape ' + (layer.shape || 'rect'), (layer.shapeW || 0) + '×' + (layer.shapeH || 0));
    parts.push('clip ' + (layer.duration || 0).toFixed(2) + 's @ ' + (FM.scene.project.fps || 30) + 'fps');
    if (FM.toast) FM.toast(parts.join('  ·  '), 5000);
  };
  FM.convertToOutline = function (layer) {   // shape → editable path drawn as a stroke
    if (layer.type !== 'shape') return;
    const cv = FM.shapeToPoints(layer);
    layer.shape = 'path'; layer.subs = cv.subs; delete layer.points; layer.closed = cv.closed;
    layer.fillMode = 'none';
    if (!layer.stroke) layer.stroke = { enabled: true, width: 6, color: '#ffffff' };
    layer.stroke.enabled = true; if (!layer.stroke.width) layer.stroke.width = 6;
    FM.requestRender(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Converted to outline — Edit points to reshape it');
  };
  FM.toggleClippingMask = function (layer) {   // this layer clips everything below to its silhouette
    layer.blendMode = layer.blendMode === 'mask-include' ? 'normal' : 'mask-include';
    FM.requestRender(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast(layer.blendMode === 'mask-include' ? 'Clipping mask ON — layers below show only inside this layer' : 'Clipping mask off');
  };
  FM.setLayerLabel = function (layer, hex) {   // ⋯ menu swatch strip: a colour TAG on the layer header (not the fill). null clears it.
    if (hex == null) delete layer.labelColor; else layer.labelColor = hex;
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast(hex ? 'Layer tagged' : 'Tag cleared', 900);
  };
  FM.openParentPicker = function (layer, x, y) {
    const cands = FM.scene.layers.filter(l => l.id !== layer.id && l.type !== 'camera' && !(FM.isAncestor && FM.isAncestor(FM.scene, layer.id, l.id)));
    const items = [{ label: (!layer.parent ? '✓ ' : '') + 'None', action: () => { layer.parent = null; FM.refreshAll(); if (FM.history) FM.history.commit(); } }, { sep: true }];
    cands.forEach(c => items.push({ label: (layer.parent === c.id ? '✓ ' : '') + (c.name || c.type), action: () => { layer.parent = c.id; if (!layer.parentMode) layer.parentMode = 'normal'; FM.refreshAll(); if (FM.history) FM.history.commit(); } }));
    if (FM.contextMenu) FM.contextMenu.show(x, y, items);
  };

  function syncTopBar() {
    const sel = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    const pn = document.getElementById('proj-name');
    if (pn && document.activeElement !== pn) { pn.value = sel ? (sel.name || '') : (FM.scene.project.name || 'Untitled'); pn.title = sel ? 'Layer name' : 'Project name'; }
    const delBtn = document.getElementById('btn-del-layer');
    if (delBtn) delBtn.style.display = sel ? '' : 'none';
    const parBtn = document.getElementById('btn-parent');
    if (parBtn) { parBtn.style.display = sel ? '' : 'none'; parBtn.classList.toggle('active', !!(sel && sel.parent)); }
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

  // ===== Canvas (preview) zoom — view-only, never affects export. FM.viewport (canvas-edit.js) is
  // the single owner of the #canvas-wrap transform (zoom + pan); this is just the stepped-zoom API
  // the view-bar buttons use. Writing the transform here too would clobber the viewport's pan. =====
  FM.canvasZoom = 1;   // mirror of FM.viewport.scale, kept in step by viewport.apply()
  const CZOOMS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];
  FM.setCanvasZoom = function (z) {
    z = Math.max(0.25, Math.min(8, z));
    if (FM.viewport) { FM.viewport.scale = z; FM.viewport.apply(); }
    else FM.canvasZoom = z;
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
    // "already here?" = SAME FRAME only (was 0.12s ≈ 3-4 frames — adding a benchmark on the very
    // next frame used to delete the previous one instead)
    const near = P.markers.find(m => !m.thumb && Math.abs(m.t - t) < 0.5 / (P.fps || 30));   // never let a benchmark tap eat the thumbnail-frame marker (they can share a frame)
    if (near) { P.markers = P.markers.filter(m => m !== near); if (FM.toast) FM.toast('Benchmark removed', 1000); }
    else { P.markers.push({ t: FM.snapFrame(t), label: 'Benchmark' }); if (FM.toast) FM.toast('Benchmark added', 1000); }   // markers live on exact frames
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
  };

  // Hold the timecode → pin the CURRENT frame as the project's card thumbnail (captured now, while the
  // video is correctly seeked here), and drop a distinct smaller "thumbnail" marker. Persisted + pinned
  // so the periodic autosave thumbnail no longer overwrites it with a random frame.
  FM.setThumbnailFrame = function () {
    if (FM.playing) FM.pause();
    if (!FM.projects || !FM.projects.pinThumbnail) { if (FM.toast) FM.toast('Thumbnail not available here'); return; }
    const P = FM.scene.project; if (!P.markers) P.markers = [];
    const t = FM.snapFrame(FM.time);
    // Hold again ON the already-pinned frame → UNPIN (back to the automatic thumbnail).
    const existing = P.markers.find(m => m.thumb);
    if (existing && Math.abs(existing.t - t) < 0.5 / (P.fps || 30)) {
      P.markers = P.markers.filter(m => !m.thumb);
      P.thumbPinned = false;
      if (FM.projects.touchCurrent) FM.projects.touchCurrent(true);   // regenerate an auto thumbnail now
      if (FM.timeline) FM.timeline.rebuild();
      if (FM.history) FM.history.commit();
      if (FM.toast) FM.toast('Thumbnail unpinned — back to automatic', 1500);
      return;
    }
    if (!FM.projects.pinThumbnail()) { if (FM.toast) FM.toast('Could not capture this frame'); return; }
    P.markers = P.markers.filter(m => !m.thumb);   // only one thumbnail marker at a time
    P.markers.push({ t: t, label: 'Thumbnail', thumb: true });
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    if (FM.toast) FM.toast('★ This frame is now the project thumbnail', 1600);
  };

  // Ordered snap points the skip buttons step between: project start/end, every benchmark, and — when a
  // layer is selected — that clip's start & end edges. (So skip-left from past a clip lands on its right
  // edge; skip-right from before it lands on its start.)
  FM.timelineSnapPoints = function () {
    const P = FM.scene.project;
    const pts = [0, P.duration];
    (P.markers || []).forEach(m => { if (!m.thumb && m.t >= 0 && m.t <= P.duration) pts.push(m.t); });   // the thumbnail-frame pin is not a benchmark — skip buttons never land on it
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
  FM.setTime = function (t, noSnap) {
    if (!FM.playing && !noSnap) t = FM.snapFrame(t);   // momentum glide passes noSnap for a smooth ride; it snaps on settle
    FM.time = Math.max(0, Math.min(FM.scene.project.duration, t));
    if (!FM.playing) FM.seekVideosToTime();
    render();
    FM.timeline.updatePlayhead();
    updateReadout();
  };
  // Scrub variant of setTime for high-frequency pointer drags (timeline grab-scrub, scroll-scrub,
  // momentum). A finger fires pointermove at 60–120Hz; setTime's synchronous render() + video seek
  // per event is the main scrub lag. Here the heavy work is COALESCED to ≤1 per animation frame:
  // requestRender() already de-dupes compositor renders, and the video seek is rAF-throttled. Both
  // read the LATEST FM.time when they fire, so the final frame is always correct. Playhead + readout
  // stay synchronous (cheap DOM) so the line tracks the finger. Same pattern as the inspector sliders.
  let videoSeekQueued = false;
  FM.scrubTime = function (t, noSnap) {
    if (!FM.playing && !noSnap) t = FM.snapFrame(t);
    FM.time = Math.max(0, Math.min(FM.scene.project.duration, t));
    if (!FM.playing && !videoSeekQueued) {
      videoSeekQueued = true;
      requestAnimationFrame(() => { videoSeekQueued = false; if (!FM.playing) FM.seekVideosToTime(); });
    }
    FM.requestRender();
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
    // loop-region wrap (takes priority over end-of-timeline when looping). Guard the wrap TARGET:
    // a stale loopIn at/after the end would re-fire this branch every frame with no progress (hang).
    if (FM.loop && FM.hasLoopRegion() && nt >= FM.scene.project.loopOut && FM.scene.project.loopIn < FM.scene.project.duration) {
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
          // A soloed layer silences the others' AUDIO too, matching the picture (compositor) and the
          // exported soundtrack (exporter buildAudioMix). Mute rather than pause so un-soloing resumes
          // instantly without a re-seek.
          if (FM.soloSilenced(layer)) { m.el.muted = true; }
          else { m.el.muted = false; m.el.volume = Math.max(0, Math.min(1, vol)); }
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
    if (FM.timeline && FM.timeline.stopMomentum) FM.timeline.stopMomentum();   // don't fight a timeline glide
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
        m.el.muted = FM.soloSilenced(layer);   // solo silences the others' audio, not just their picture
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
      (l.reversed || (l.frameBlend && (FM.isAnimated(l.speed) || (l.speed || 1) < 1))));   // animated speed is an OBJECT — (obj||1)<1 is NaN<1=false, so a ramped frame-blend clip was never cached
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
    // Review play: any stop (button, space, end-of-timeline) returns the playhead to where review
    // started, so previewing never loses your working position.
    if (FM._reviewing) {
      FM._reviewing = false;
      const back = FM._reviewFrom; FM._reviewFrom = null;
      if (back != null && FM.setTime) FM.setTime(back);
    }
    if (FM.syncReviewButton) FM.syncReviewButton();   // revert the far-right button from ■ Stop back to the view icon
  };

  FM.togglePlay = function () { FM.playing ? FM.pause() : FM.requestPlay(); };

  // Review play (▶ at the far right of the transport): preview from the current frame, then snap back
  // to it when you stop — "play without moving the playhead". A second press stops + restores.
  FM.reviewPlay = function () {
    if (FM.playing) { FM.pause(); return; }
    FM._reviewFrom = FM.snapFrame ? FM.snapFrame(FM.time) : FM.time;
    FM._reviewing = true;
    // if playback never actually starts (a cache decode rejects), clear the flags so a later unrelated
    // pause() can't apply this stale review-origin and yank the playhead.
    Promise.resolve(FM.requestPlay()).catch(() => { FM._reviewing = false; FM._reviewFrom = null; });
  };

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
    scene.selectedIds = [layer.id];
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
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
    // Jump straight into the AM-style focused text editor with the placeholder pre-selected, so the
    // first keystroke replaces it (matches AM: add text → keyboard up → type).
    if (FM.textEdit) FM.textEdit.start(layer.id, { selectAll: true });
  };

  // Null object: an invisible transform controller. Parent real layers to it and animate the
  // null to drive the whole rig (AM-style). Drawn as nothing; selectable via the timeline/canvas.
  FM.addNullLayer = function () {
    const P = FM.scene.project;
    const layer = FM.makeLayer('null', { name: 'Null', x: P.width / 2, y: P.height / 2, duration: P.duration || 5 });   // empty project (dur 0) → a usable 5s so the layer actually renders
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
    const layer = FM.makeLayer('camera', { name: 'Camera', x: P.width / 2, y: P.height / 2, duration: P.duration || 5 });
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // Adjustment layer: an effect layer that grades/filters everything beneath it (AM-style).
  FM.addAdjustmentLayer = function () {
    const P = FM.scene.project;
    const layer = FM.makeLayer('adjustment', { name: 'Adjustment', x: P.width / 2, y: P.height / 2, duration: P.duration || 5 });
    layer.effects = [{ type: 'brightness', enabled: true, params: { amount: 1.15 } }, { type: 'saturate', enabled: true, params: { amount: 1.35 } }];
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  FM.addCaptionLayer = function () {
    const P = FM.scene.project;
    const dur = P.duration || 5;   // empty project → a usable 5s track (was duration 0 = invisible)
    const layer = FM.makeLayer('text', { name: 'Captions', x: P.width / 2, y: Math.round(P.height * 0.82), fontSize: Math.round(P.height / 22), duration: dur });
    const seg = Math.max(0.5, Math.min(2.5, dur / 2));
    layer.captions = [{ start: 0, end: Math.min(seg, dur), text: 'First caption' }];
    if (dur > seg + 0.3) layer.captions.push({ start: seg, end: Math.min(dur, seg * 2), text: 'Second caption' });   // only if there's room (no zero-length segment on tiny projects)
    layer.text = '';
    layer.captionBg = true;
    FM.scene.layers.unshift(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
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
    // Selecting a DIFFERENT layer must close the crop tool — it has no rAF loop and never self-closes,
    // so it stayed bound to the old layer (composited uncropped) while the inspector showed the new one.
    if (FM.cropTool && FM.cropTool.isActive() && FM.cropTool.layerId && FM.cropTool.layerId() !== id) FM.cropTool.stop();
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
    FM.refreshAll();   // FM.* so the multi-select chrome (Group button, sel-multi class, top bar) syncs
  };

  // Shift/Cmd-click: add or remove a layer from the selection set.
  FM.toggleSelect = function (id, silent) {
    let ids = FM.selectionIds().slice();
    if (ids.includes(id)) { ids = ids.filter(x => x !== id); FM.scene.selectedId = ids.length ? ids[ids.length - 1] : null; }
    else { ids.push(id); FM.scene.selectedId = id; }
    FM.scene.selectedIds = ids;
    if (silent) return;   // paint-select updates mid-gesture — a rebuild here would detach the pointer's target
    FM.refreshAll();   // sync the multi-select chrome (was inspector+timeline only → Group button/sel-multi never appeared)
  };

  // Delete every layer in the selection set (one history step).
  FM.deleteSelected = function () {
    const sel = FM.selectionIds(); if (!sel.length) return;
    // Tear down any open overlay tool first (deleteLayer already does) — Delete during crop/point-edit
    // otherwise orphaned the overlay and left its "Done" button dead over a deleted layer.
    if (FM.cropTool && FM.cropTool.isActive && FM.cropTool.isActive()) FM.cropTool.stop();
    if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive()) FM.pointEdit.stop();
    if (FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive()) FM.textEdit.stop();
    if (FM.touchupTool && FM.touchupTool.isOpen && FM.touchupTool.isOpen()) FM.touchupTool.close();
    // Cascade groups → their members (mirror deleteLayer) — deleting a group row must not leave its
    // members behind pointing at a dead parent id.
    const set = new Set(sel);
    sel.forEach(id => { const l = FM.layerById(FM.scene, id); if (l && l.type === 'group' && FM.groupDescendants) FM.groupDescendants(id).forEach(m => set.add(m.id)); });
    // Stop native/synth audio + drop the (rebuildable) frame cache — but DON'T destroy the media
    // registry entry or its IDB blob: undo restores the layer JSON, and a wiped blob = permanently
    // blank clip + lost footage (same fix as deleteLayer). Orphans are reaped by the boot sweep.
    set.forEach(id => { const m = FM.media.get(id); if (m) { if (m.el) { try { m.el.pause(); m.el.muted = true; } catch (e) {} } FM.clearFrameCache(m); } });
    FM.scene.layers = FM.scene.layers.filter(l => !set.has(l.id));
    FM.scene.selectedId = FM.scene.layers[0] ? FM.scene.layers[0].id : null;
    FM.scene.selectedIds = FM.scene.selectedId ? [FM.scene.selectedId] : [];
    // Keyboard Delete/Backspace routes here; mirror deleteLayer's reversed-audio rebuild so a deleted
    // reversed clip's synthesized audio stops (forward elements were just paused above). (#6)
    if (FM.playing && FM.audioPlay) { FM.audioPlay.stop(); FM.audioPlay.start(); }
    FM.refreshAll();   // FM.* (not the local) so the mobile wrapper runs → deleting the last layer drops the sheet (#13)
    if (FM.history) FM.history.commit();
  };

  FM.deleteLayer = function (id, _nested) {
    if (FM.tracker && FM.tracker.isPicking && FM.tracker.isPicking()) FM.tracker.cancel();   // don't leave a dead tracking overlay
    if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive()) FM.pointEdit.stop();
    if (FM.cropTool && FM.cropTool.isActive && FM.cropTool.isActive()) FM.cropTool.stop();
    if (FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive() && FM.textEdit.layerId() === id) FM.textEdit.stop();   // don't leave a dead text editor over a deleted layer
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
    // Deliberately KEEP the media registry entry and its IndexedDB blob: undo restores the layer's
    // JSON only, so destroying media here made an undone delete come back permanently BLANK (the
    // worst kind of data loss). Truly orphaned blobs are reaped by the boot-time pruneOrphans sweep.
    if (_nested) return;   // outermost call finishes the teardown below exactly once (#r7)
    // A deleted clip's synthesized (reversed) audio plays from a flat node list not keyed by layer, so
    // it keeps sounding after the clip is gone. Rebuild the active nodes from the post-delete layer set.
    if (FM.playing && FM.audioPlay) { FM.audioPlay.stop(); FM.audioPlay.start(); }
    // VALIDATE, don't just compare to id: deleting a group cascades to its members, so selectedId may
    // point at a now-deleted DESCENDANT (not id itself) — a phone zombie edit-mode on a dead layer.
    if (!FM.layerById(FM.scene, FM.scene.selectedId)) FM.scene.selectedId = FM.scene.layers[0] ? FM.scene.layers[0].id : null;
    FM.scene.selectedIds = (FM.scene.selectedIds || []).filter(sid => FM.layerById(FM.scene, sid));
    if (!FM.scene.selectedIds.length && FM.scene.selectedId) FM.scene.selectedIds = [FM.scene.selectedId];
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
    if (m && !layer.reversed && !(layer.frameBlend && (FM.isAnimated(layer.speed) || (layer.speed || 1) < 1))) FM.clearFrameCache(m);   // keep the cache a ramped frame-blend clip still needs (animated speed is an object)
  };

  // Give a cloned layer its OWN fresh media element (never alias the source's — a shared <video>
  // would double-seek). Shared by duplicate / split.
  async function reloadMediaTo(srcId, dstId) {
    const rec = FM.media.get(srcId);
    if (!rec || !rec.file || (rec.kind !== 'video' && rec.kind !== 'image')) return;
    let nrec = null;
    try { nrec = rec.kind === 'video' ? await FM.loadVideoFile(rec.file) : await FM.loadImageFile(rec.file); } catch (e) { nrec = null; }
    if (nrec && nrec !== rec) {
      FM.media.set(dstId, nrec);
      if (nrec.kind === 'video') nrec.el.addEventListener('seeked', () => { if (!FM.playing) render(); });
    }
  }

  FM.duplicateLayer = async function (id, inPlace) {
    const src = FM.layerById(FM.scene, id);
    if (!src) return;
    const copy = FM.cloneLayer(src, !!inPlace);   // inPlace → exact copy at same position (no offset/" copy")
    await reloadMediaTo(id, copy.id);
    const inserts = [copy];
    if (src.type === 'group' && FM.groupDescendants) {
      // a group is just a parent link — duplicating ONLY the group row made an empty invisible group.
      // Clone its whole subtree with fresh ids and remap parents through an idMap (like pasteClipboard).
      const idMap = {}; idMap[src.id] = copy.id;
      for (const d of FM.groupDescendants(id)) {
        const dc = FM.cloneLayer(d, true);   // plain copy — the group offset already moved the block
        idMap[d.id] = dc.id;
        await reloadMediaTo(d.id, dc.id);
        inserts.push(dc);
      }
      inserts.forEach(l => { if (l.parent && idMap[l.parent]) l.parent = idMap[l.parent]; });
    }
    const idx = FM.scene.layers.findIndex(l => l.id === id);
    FM.scene.layers.splice(Math.max(0, idx), 0, ...inserts);
    FM.scene.selectedId = copy.id;
    FM.scene.selectedIds = [copy.id];   // keep the selection SET in sync — a stale selectedIds made Delete hit the original
    FM.refreshAll();
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
  // insertIndex: z-position to drop the pasted layers at (0 = top, layers.length = bottom).
  // Omitted → top, matching duplicate/add. The ⧉ Paste-Layer split-button's arrow passes a chosen index.
  FM.pasteClipboard = async function (insertIndex) {
    if (!FM.clipboard || !FM.clipboard.length) return;
    const idMap = {};
    const copies = FM.clipboard.map(entry => {
      const copy = FM.cloneLayer(entry.snapshot);   // fresh id + offset +30 + " copy"
      idMap[entry.snapshot.id] = copy.id;
      return { copy, entry };
    });
    // Paste at the PLAYHEAD (like AM) instead of back on the source clip's original time.
    // Anchor the earliest copied clip to the playhead and keep the relative offsets between
    // clips that were copied together. autoFitDuration (via refreshAll) grows the timeline if
    // a pasted clip now runs past the end.
    const base = (typeof FM.snapFrame === 'function') ? FM.snapFrame(FM.time) : FM.time;
    const minStart = FM.clipboard.reduce((m, e) => Math.min(m, e.snapshot.start || 0), Infinity);
    const anchor = isFinite(minStart) ? minStart : 0;
    copies.forEach(({ copy, entry }) => {
      const orig = entry.snapshot.start || 0;
      copy.start = Math.max(0, base + (orig - anchor));
      if (FM.shiftLayerKeyframes) FM.shiftLayerKeyframes(copy, copy.start - orig);   // keyframes are absolute time — pasted animation must ride to the playhead
    });
    let insertAt = (typeof insertIndex === 'number' && insertIndex >= 0) ? Math.min(insertIndex, FM.scene.layers.length) : 0;   // TOP of the z-stack by default (layers[0] = top)
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
      // FM.maxDurForSource, not raw division: an animated speed prop is an object (÷object = NaN)
      const avail = FM.maxDurForSource ? FM.maxDurForSource(layer, nrec.duration - layer.trimStart) : (nrec.duration - layer.trimStart) / (layer.speed || 1);
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
    // DIVIDE keyframes at the split (times are absolute): A keeps t ≤ split, B keeps t ≥ split, each
    // getting a boundary keyframe holding the interpolated value so the ENDPOINT value is seamless
    // (the interior easing of a split segment is a close approximation, not bit-exact). Without this
    // both halves owned the FULL set → stray diamonds drawn outside each clip's window.
    const splitAnimated = (lyr, keepLeft) => {
      FM.animatedProps(lyr).forEach(p => {
        // A looping prop (cycle/ping-pong) intentionally keeps its keyframes in a short span and
        // repeats them across the whole clip — dividing it kills the loop. Leave looping props whole.
        if (p.loopMode && p.loopMode !== 'none' && p.kf.length >= 2) return;
        const v = FM.evalProp(p, t);
        const b = p.kf.find(k => k.t >= t - 1e-9);   // segment-END keyframe bracketing the split: its ease governs the segment we're cutting
        p.kf = p.kf.filter(k => keepLeft ? k.t <= t + 1e-4 : k.t >= t - 1e-4);
        if (!p.kf.some(k => Math.abs(k.t - t) < 1e-3)) {
          const nk = { t: t, v: v, e: (b && b.e) || 'linear' };   // inherit the cut segment's easing, not hardcoded linear
          if (b && b.bez) nk.bez = b.bez.slice();
          p.kf.push(nk);
        }
        p.kf.sort((k1, k2) => k1.t - k2.t);
      });
    };
    splitAnimated(layer, true); splitAnimated(B, false);
    if (layer.type !== 'text') await reloadMediaTo(id, B.id);
    const idx = FM.scene.layers.findIndex(l => l.id === id);
    if (idx < 0) return;   // A was deleted/undone during the await — never insert an orphaned half
    FM.scene.layers.splice(idx + 1, 0, B);
    FM.scene.selectedId = B.id;
    FM.scene.selectedIds = [B.id];
    FM.refreshAll();
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
      if (FM.isAnimated(layer.speed) || Math.abs((layer.speed || 1) - 1) > 1e-3) {   // ramped speed is an object — offer reset for it too
        items.push({ label: 'Reset speed (1×)', action: () => {
          const span = FM.isAnimated(layer.speed) ? FM.layerSourceAdvance(layer, layer.duration) : layer.duration * (layer.speed || 1);
          layer.speed = 1; layer.duration = span;
          const end = layer.start + layer.duration;
          if (end > FM.scene.project.duration) FM.scene.project.duration = end;
          FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit();
        } });
      }
    }
    // (Save audio as WAV / Remove vocals moved into the Volume section — discoverable there, and the
    //  ⋯ menu path was easy to miss on PC.)
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
  // (the old index-based FM.reorderLayer is gone — FM.moveLayers below is the one reorder entry
  // point: id-based, group-aware, no-op-guarded, used by the ≡ drag and the multi-select bar)

  // Alignment snap targets for one axis, shared by canvas dragging AND the Move & Transform scrubbers:
  // the composition centre + both edges, PLUS every value this layer already holds at its OTHER
  // keyframes — so you can re-align it to a position it was at earlier (AM behaviour). De-duped.
  FM.alignTargets = function (layer, axis) {
    const P = FM.scene.project;
    const out = axis === 'x' ? [P.width / 2, 0, P.width] : [P.height / 2, 0, P.height];
    const p = layer && layer.transform && layer.transform[axis];
    if (p && p.kf) p.kf.forEach(k => { if (out.indexOf(k.v) < 0) out.push(k.v); });
    return out;
  };
  // Snap a value to the nearest align target within `thr` (project px). Returns {v,hit,target}.
  FM.snapAxis = function (layer, axis, v, thr) {
    const targets = FM.alignTargets(layer, axis);
    let best = null, bd = (thr == null ? 8 : thr);
    for (let i = 0; i < targets.length; i++) { const d = Math.abs(v - targets[i]); if (d <= bd) { bd = d; best = targets[i]; } }
    return best == null ? { v: v, hit: false } : { v: best, hit: true, target: best };
  };

  // Move one OR several layers (by id) so they sit, as a contiguous block in their existing top-to-
  // bottom order, immediately BEFORE beforeId (or at the very bottom when beforeId is null). Used by
  // the timeline reorder drag — handles single- and multi-layer drags through one path.
  FM.moveLayers = function (ids, beforeId) {
    const arr = FM.scene.layers;
    const set = {}; ids.forEach(id => { set[id] = 1; });
    const moving = arr.filter(l => set[l.id]);          // preserves current order
    if (!moving.length) return;
    let rest = arr.filter(l => !set[l.id]);
    // if the drop target is itself a moving layer, slide down to the next layer that's staying put
    let at = rest.length;
    if (beforeId && !set[beforeId]) { const i = rest.findIndex(l => l.id === beforeId); if (i >= 0) at = i; }
    else if (beforeId && set[beforeId]) {
      const origIdx = arr.findIndex(l => l.id === beforeId);
      for (let j = origIdx; j < arr.length; j++) { if (!set[arr[j].id]) { const i = rest.findIndex(l => l.id === arr[j].id); if (i >= 0) { at = i; } break; } }
    }
    const result = rest.slice(0, at).concat(moving, rest.slice(at));
    if (result.length !== arr.length) return;           // safety: never drop/duplicate a layer
    if (result.every((l, i) => l === arr[i])) return;   // dropped back where it was → no-op, no undo entry
    arr.length = 0; Array.prototype.push.apply(arr, result);
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
  function showExportDialog() {
    // Build resolution presets from THIS project's size. "p" = the shorter side (1080p portrait =
    // 1080 wide); value stays a SCALE factor so the exporter math is unchanged. Full first, then
    // each standard rung below the native short side (downscale only — no blurry upscales), each
    // labelled with its exact output pixels.
    const P = FM.scene.project, W = P.width, H = P.height, shortSide = Math.min(W, H);
    const sel = document.getElementById('exp-res');
    if (sel) {
      const prev = sel.value;
      sel.innerHTML = '';
      const add = (val, label) => { const o = document.createElement('option'); o.value = val; o.textContent = label; sel.appendChild(o); };
      add(1, 'Full — ' + W + '×' + H);
      [2160, 1440, 1080, 720, 480, 360].forEach(t => {
        if (t < shortSide - 1) { const s = t / shortSide; add(s, t + 'p — ' + Math.round(W * s) + '×' + Math.round(H * s)); }
      });
      // keep the previous choice if it still exists, else default to Full
      if (prev && [].some.call(sel.options, o => o.value === prev)) sel.value = prev;
    }
    // 'Selected clip only' and the solo checkbox need a selection — grey them out otherwise
    const selLayer = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    const rangeSel = document.getElementById('exp-range');
    if (rangeSel) {
      const clipOpt = [].find.call(rangeSel.options, o => o.value === 'clip');
      if (clipOpt) clipOpt.disabled = !selLayer;
      if (!selLayer && rangeSel.value === 'clip') rangeSel.value = 'whole';
    }
    const soloCb = document.getElementById('exp-solo-clip');
    if (soloCb) { if (!selLayer) soloCb.checked = false; soloCb.disabled = !selLayer; }
    document.getElementById('export-dialog').classList.remove('hidden');
  }
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
    // Resolve the range BEFORE showing the overlay so early exits can bounce back to the dialog.
    const rangeEl = document.getElementById('exp-range');
    const selLayer = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    let from = null, to = null;
    if (rangeEl && rangeEl.value === 'clip') {
      if (!selLayer) { if (FM.toast) FM.toast('Select a clip first, then export', 2200); showExportDialog(); return; }
      from = Math.max(0, selLayer.start);
      to = Math.min(P.duration, selLayer.start + selLayer.duration);
      if (!(to > from)) { if (FM.toast) FM.toast('That clip sits outside the project — nothing to export', 2200); showExportDialog(); return; }
    } else if (rangeEl && rangeEl.value === 'loop') {
      if (FM.hasLoopRegion && FM.hasLoopRegion()) { from = P.loopIn; to = P.loopOut; }
      else if (FM.toast) FM.toast('No region marked — press [ and ] or use the ⋯ menu to mark one; exporting whole project', 2600);
    }
    const overlay = document.getElementById('export-overlay');
    const bar = document.getElementById('export-bar');
    const status = document.getElementById('export-status');
    overlay.classList.remove('hidden');
    if (FM.playing) FM.pause();
    // 'Hide other layers' — temporarily solo the selected clip (solo already isolates picture AND
    // audio at render/export/preview). Restored in finally even on error/cancel; no history commit.
    const soloCb = document.getElementById('exp-solo-clip');
    let soloRestore = null;
    if (soloCb && soloCb.checked && selLayer) {
      soloRestore = FM.scene.layers.map(l => [l, l.solo]);
      selLayer.solo = true;
      if (selLayer.type === 'group' && FM.groupDescendants) FM.groupDescendants(selLayer.id).forEach(l => { l.solo = true; });
    }
    try {
      const expName = (FM.scene.project.name || 'freemotion-export').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim() || 'freemotion-export';
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
      if (soloRestore) { soloRestore.forEach(([l, v]) => { l.solo = v; }); FM.requestRender(); }
      bar.style.width = '0%';
      FM.seekVideosToTime();
    }
  }

  /* ---------- init ---------- */
  // Desktop timeline resizer: drag the top edge of #timeline-panel to trade height between the stage
  // and the timeline. Writes --tl-h on <html> (inline wins over the responsive stylesheet default),
  // clamped so neither the stage nor the timeline can collapse, and persisted across sessions.
  function setupTimelineResizer() {
    const rez = document.getElementById('tl-resizer');
    if (!rez) return;
    const root = document.documentElement;
    const isPhone = () => window.matchMedia('(max-width: 700px)').matches;
    const clampH = (h) => Math.max(160, Math.min(Math.round(window.innerHeight * 0.72), h));
    let saved = 0;
    try { saved = parseInt(localStorage.getItem('fm_tl_h') || '', 10) || 0; } catch (_) {}
    if (saved && !isPhone()) root.style.setProperty('--tl-h', clampH(saved) + 'px');
    let dragging = false, startY = 0, startH = 0;
    rez.addEventListener('pointerdown', (e) => {
      if (isPhone()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; startY = e.clientY;
      const panel = document.getElementById('timeline-panel');
      startH = panel ? panel.getBoundingClientRect().height : 232;
      document.body.classList.add('tl-resizing');
      try { rez.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    rez.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const h = clampH(startH + (startY - e.clientY));   // drag UP → taller timeline
      root.style.setProperty('--tl-h', h + 'px');         // pure CSS-grid resize — no timeline reflow needed (height doesn't touch clip-x / pps math)
    });
    const end = () => {
      if (!dragging) return;
      dragging = false; document.body.classList.remove('tl-resizing');
      const cur = getComputedStyle(root).getPropertyValue('--tl-h').trim();
      try { if (cur) localStorage.setItem('fm_tl_h', parseInt(cur, 10) || 232); } catch (_) {}
    };
    rez.addEventListener('pointerup', end);
    rez.addEventListener('pointercancel', end);
    // window shrank below a stored height → re-clamp so the timeline can't exceed the viewport
    window.addEventListener('resize', () => {
      if (isPhone()) return;
      const cur = parseInt(getComputedStyle(root).getPropertyValue('--tl-h'), 10);
      if (cur) { const c = clampH(cur); if (c !== cur) root.style.setProperty('--tl-h', c + 'px'); }
    });
  }

  function init() {
    canvas = document.getElementById('preview');
    ctx = canvas.getContext('2d');
    readoutEl = document.getElementById('time-readout');
    dropHint = document.getElementById('drop-hint');
    setupTimelineResizer();
    // Tap the timecode → drop / remove a benchmark at the playhead. Double-tap → type an exact time.
    // (A short timer distinguishes the two so a double-tap doesn't also leave a stray benchmark.)
    readoutEl.style.cursor = 'pointer';
    readoutEl.title = 'Tap: benchmark · double-click: type a time · hold: set this frame as the project thumbnail';
    let tcTapTimer = null;
    // HOLD the timecode → pin the current frame as the project thumbnail (suppresses the trailing tap so
    // it doesn't also drop a benchmark).
    let tcLp = null, tcLpFired = false, tcDown = null;
    readoutEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      tcDown = { x: e.clientX, y: e.clientY }; tcLpFired = false;
      clearTimeout(tcLp);
      tcLp = setTimeout(() => { tcLp = null; tcLpFired = true; if (tcTapTimer) { clearTimeout(tcTapTimer); tcTapTimer = null; } if (FM.setThumbnailFrame) FM.setThumbnailFrame(); }, 550);
    });
    readoutEl.addEventListener('pointermove', (e) => { if (tcDown && Math.hypot(e.clientX - tcDown.x, e.clientY - tcDown.y) > 8) { clearTimeout(tcLp); tcLp = null; } });
    const tcLpEnd = () => { clearTimeout(tcLp); tcLp = null; tcDown = null; };
    readoutEl.addEventListener('pointerup', tcLpEnd);
    readoutEl.addEventListener('pointercancel', tcLpEnd);
    readoutEl.addEventListener('click', () => {
      if (tcLpFired) { tcLpFired = false; return; }   // the hold already handled this press
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
      if (FM.home) {
        FM.home.init();
        // Land on the home screen ONLY if that's where the user last was. A refresh (or the
        // version-label force-update, which reloads on a fresh URL) drops them straight back into
        // the project they were editing — home.js writes 'fm.view' on every open/close. The
        // restored-project guard keeps a deleted/first-boot project from opening an empty editor.
        let lastView = null; try { lastView = localStorage.getItem('fm.view'); } catch (e) {}
        if (!(restored && lastView === 'editor')) FM.home.open();
      }
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
    const parentBtn = document.getElementById('btn-parent');
    if (parentBtn) parentBtn.addEventListener('click', () => {
      const sel = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null; if (!sel) return;
      const r = parentBtn.getBoundingClientRect();
      FM.openParentPicker(sel, Math.max(8, r.right - 220), r.bottom + 4);
    });
    // Mark / clear the export-loop region at the playhead — shared by the [ ] \ keys and the
    // ⋯ menu (mobile has no bracket keys, so the menu is the touch path).
    const markRegionIn = () => { const P = FM.scene.project; P.loopIn = FM.time; if (P.loopOut != null && P.loopOut <= P.loopIn) P.loopOut = null; FM.timeline.rebuild(); if (FM.history) FM.history.commit(); };
    const markRegionOut = () => { const P = FM.scene.project; P.loopOut = FM.time; if (P.loopIn != null && P.loopIn >= P.loopOut) P.loopIn = null; FM.timeline.rebuild(); if (FM.history) FM.history.commit(); };
    const clearRegion = () => { FM.scene.project.loopIn = null; FM.scene.project.loopOut = null; FM.timeline.rebuild(); };
    const moreBtn = document.getElementById('btn-more');
    if (moreBtn) moreBtn.addEventListener('click', () => {
      const clickHidden = (id) => { const b = document.getElementById(id); if (b) b.click(); };
      const r = moreBtn.getBoundingClientRect();
      const rates = [0.25, 0.5, 1, 2, 4], cur = FM.previewRate || 1;
      const nextRate = rates[(rates.indexOf(cur) + 1) % rates.length];
      const sel = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
      const items = [];
      if (sel) {
        // AM's layer menu — a clip is selected, so ⋯ is about THIS layer (deselect for project options).
        const isMedia = sel.type === 'video' || sel.type === 'image';
        const selLayers = (FM.selectionIds ? FM.selectionIds() : [sel.id]).map(id => FM.layerById(FM.scene, id)).filter(Boolean);
        items.push({ label: 'Save to My Elements', action: async () => {
          const name = prompt('Element name:', sel.name || 'My element'); if (!name || !name.trim()) return;
          const ok = await FM.elements.save(name.trim(), selLayers.length ? selLayers : [sel]);
          if (FM.toast) FM.toast(ok ? 'Saved to My Elements' : 'Could not save element');
        } });
        items.push({ label: (sel.flipH ? '✓ ' : '') + 'Flip Horizontally', action: () => FM.flipLayer(sel, 'h') });
        items.push({ label: (sel.flipV ? '✓ ' : '') + 'Flip Vertically', action: () => FM.flipLayer(sel, 'v') });
        if (sel.type !== 'group' && sel.type !== 'null') {
          items.push({ label: 'Fit Composition Area', action: () => FM.fitLayer(sel, 'fit') });
          items.push({ label: 'Fill Composition Area', action: () => FM.fitLayer(sel, 'fill') });
          items.push({ label: 'Stretch to Composition Area', action: () => FM.fitLayer(sel, 'stretch') });
        }
        items.push({ sep: true });
        items.push({ label: (sel.blendMode === 'mask-include' ? '✓ ' : '') + 'Create Clipping Mask', action: () => FM.toggleClippingMask(sel) });
        if (sel.type === 'shape' && sel.shape !== 'path') items.push({ label: 'Convert to Outline', action: () => FM.convertToOutline(sel) });
        if (sel.type === 'video') items.push({ label: 'Extract Audio', action: () => FM.extractAudio(sel) });
        items.push({ label: 'Media Info', action: () => FM.mediaInfoToast(sel) });
        if (sel.type === 'group') items.push({ label: 'Ungroup', action: () => FM.ungroup(sel.id) });
        items.push({ sep: true });
        items.push({ swatchLabel: 'Layer colour tag', swatches: ['#ff2d1e', '#e0245e', '#ff8b3d', '#ffd93d', '#2bd9c7', '#3d7bff', '#9b5cff'], onPick: (hex) => FM.setLayerLabel(sel, hex) });
        items.push({ sep: true });
        items.push({ label: 'Project options…', action: () => { FM.selectLayer(null); setTimeout(() => moreBtn.click(), 0); } });
        if (FM.contextMenu) FM.contextMenu.show(Math.max(8, r.right - 230), r.bottom + 4, items);
        return;
      }
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
        { label: 'Mark export start', action: markRegionIn },
        { label: 'Mark export end', action: markRegionOut },
        { label: 'Clear export marks', action: clearRegion },
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
      // The ▸ arrow on Paste Layer opens a position picker so you can drop the copy ABOVE a chosen
      // layer (or top / bottom) instead of always on top. (Ezra)
      const openPastePos = () => {
        const mkThumb = (L) => { const cv = document.createElement('canvas'); cv.className = 'ctx-thumb'; cv.width = 38; cv.height = 24; if (FM.renderThumb) { try { FM.renderThumb(L, cv); } catch (e) {} } return cv; };
        const mkGlyph = (g) => { const s = document.createElement('span'); s.className = 'ctx-thumb ctx-thumb-glyph'; s.textContent = g; return s; };
        const items = [{ label: 'On top', iconEl: mkGlyph('⤒'), action: () => FM.pasteClipboard(0) }];
        // each layer shows its own thumbnail (same preview as the timeline row's far-left), so you can
        // SEE which layer you're pasting above, not just read a name
        FM.scene.layers.forEach((L, i) => items.push({ label: 'Above: ' + (L.name || L.type || 'layer'), iconEl: mkThumb(L), action: () => FM.pasteClipboard(i) }));
        items.push({ label: 'At the bottom', iconEl: mkGlyph('⤓'), action: () => FM.pasteClipboard(FM.scene.layers.length) });
        FM.contextMenu.show(Math.max(8, r.right - 240), r.bottom + 4, items);
      };
      FM.contextMenu.show(Math.max(8, r.right - 200), r.bottom + 4, [
        { label: 'Select All Layers', action: () => { if (FM.selectAll) FM.selectAll(); } },
        { label: 'Group Selection', disabled: selN < 2, action: () => FM.groupSelection() },
        { label: 'Masking Group', disabled: selN < 2, action: () => FM.groupSelection({ mask: true }) },
        { label: 'Duplicate Layer', disabled: !hasSel, action: () => { if (FM.scene.selectedId) FM.duplicateLayer(FM.scene.selectedId); } },
        { label: 'Copy Layer', disabled: !hasSel, action: () => { if (FM.copySelection) FM.copySelection(); } },
        { label: 'Save Preset', disabled: !hasSel, action: () => FM.savePresetPrompt() },
        { label: 'Save Selection as Element…', disabled: !hasSel, action: () => FM.saveElementPrompt() },
        { label: 'Paste Layer', disabled: !hasClip, action: () => { if (FM.pasteClipboard) FM.pasteClipboard(); }, arrow: hasClip, arrowTitle: 'Choose where to paste', arrowAction: openPastePos },
        { label: 'Paste Style…', disabled: !(hasSel && hasStyle), action: () => { if (FM.openPasteStyle) FM.openPasteStyle(); } },
      ]);
    });
    // ⛶ → toggle AM's right-side VIEW toolbar (fit · grid · layers · camera · canvas zoom).
    const amFitBtn = document.getElementById('btn-amfit');
    const viewBar = document.getElementById('view-bar');
    if (amFitBtn && viewBar) {
      // TAP = toggle the view popup (grid · camera · zoom %). HOLD = review play (preview from here,
      // playhead snaps back on stop). While review IS running the button becomes a ■ STOP icon and a
      // single TAP stops it (no need to hold again). (Ezra: review play lives on this far-right button.)
      const AMFIT_VIEW_SVG = amFitBtn.innerHTML;
      const AMFIT_STOP_SVG = '<svg viewBox="0 0 24 24" class="tco" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/></svg>';
      const setReviewIcon = (active) => {
        if (amFitBtn.classList.contains('reviewing') === !!active) return;   // idempotent: only touch the DOM on a real state change
        amFitBtn.classList.toggle('reviewing', !!active);
        amFitBtn.innerHTML = active ? AMFIT_STOP_SVG : AMFIT_VIEW_SVG;
        amFitBtn.title = active ? 'Stop review play' : 'View options (grid · camera · zoom) · hold to review-play';
      };
      FM.syncReviewButton = () => setReviewIcon(!!FM._reviewing);   // called from FM.pause when review ends (end-of-timeline, spacebar, project switch…)
      let vbLp = null, vbLpFired = false, vbDown = null;
      amFitBtn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        vbDown = { x: e.clientX, y: e.clientY }; vbLpFired = false;
        clearTimeout(vbLp);
        vbLp = setTimeout(() => {
          vbLp = null; vbLpFired = true;
          if (navigator.vibrate) { try { navigator.vibrate(12); } catch (er) {} }
          const wasReviewing = FM._reviewing;
          FM.reviewPlay();                                    // toggles: starts review, or stops if already reviewing
          FM.syncReviewButton();
          if (FM.toast) FM.toast(FM._reviewing ? 'Review play — playhead returns here on stop' : (wasReviewing ? 'Review stopped' : ''), 1400);
        }, 550);
      });
      amFitBtn.addEventListener('pointermove', (e) => { if (vbDown && Math.hypot(e.clientX - vbDown.x, e.clientY - vbDown.y) > 8) { clearTimeout(vbLp); vbLp = null; } });
      const vbLpEnd = () => { clearTimeout(vbLp); vbLp = null; vbDown = null; };
      amFitBtn.addEventListener('pointerup', vbLpEnd);
      amFitBtn.addEventListener('pointercancel', vbLpEnd);
      amFitBtn.addEventListener('click', () => {
        if (vbLpFired) { vbLpFired = false; return; }   // the hold already handled it (started/stopped review)
        if (FM._reviewing) { FM.pause(); return; }       // reviewing → a plain TAP stops it (no popup); FM.pause reverts the icon
        const open = viewBar.classList.toggle('hidden') === false;
        amFitBtn.classList.toggle('active', open);
        const g = document.getElementById('vb-grid'); if (g) g.classList.toggle('on', !!FM.showGuides);   // sync state on open
      });
    }
    const vbFit = document.getElementById('vb-fit');
    if (vbFit) vbFit.addEventListener('click', () => { if (FM.viewport) FM.viewport.reset(); else FM.setCanvasZoom(1); });   // fit = 100% AND re-centred (clears the pan too)
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
    // Play button: tap = play/pause · HOLD = toggle loop mode (whole-timeline repeat). The long-press
    // sets a flag so the trailing click doesn't also toggle playback.
    const playBtn = document.getElementById('btn-play');
    const syncLoopUI = () => {
      const lb = document.getElementById('btn-loop'); if (lb) lb.classList.toggle('active', !!FM.loop);
      if (playBtn) playBtn.classList.toggle('loop-on', !!FM.loop);
    };
    let playLp = null, playLpFired = false, playDown = null;
    playBtn.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      playDown = { x: e.clientX, y: e.clientY }; playLpFired = false;
      clearTimeout(playLp);
      playLp = setTimeout(() => {
        playLp = null; playLpFired = true;
        FM.loop = !FM.loop; syncLoopUI();
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (er) {} }
        if (FM.toast) FM.toast(FM.loop ? 'Loop ON — playback repeats start-to-end' : 'Loop off', 1500);
      }, 550);
    });
    playBtn.addEventListener('pointermove', (e) => { if (playDown && Math.hypot(e.clientX - playDown.x, e.clientY - playDown.y) > 8) { clearTimeout(playLp); playLp = null; } });
    const playLpEnd = () => { clearTimeout(playLp); playLp = null; playDown = null; };
    playBtn.addEventListener('pointerup', playLpEnd);
    playBtn.addEventListener('pointercancel', playLpEnd);
    playBtn.addEventListener('click', () => { if (playLpFired) { playLpFired = false; return; } FM.togglePlay(); });
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
    if (loopBtn) loopBtn.addEventListener('click', () => { FM.loop = !FM.loop; syncLoopUI(); });
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
    const cvClampDim = v => Math.max(16, Math.min(7680, Math.round((parseInt(v, 10) || 16) / 2) * 2));   // even, sane bounds (matches import clamp)
    function cvCompute() {
      if (cvAspect === 'custom') return { w: cvClampDim(document.getElementById('cv-cw').value), h: cvClampDim(document.getElementById('cv-ch').value) };
      const base = parseInt(document.getElementById('cv-res').value, 10) || 1080;
      const pr = cvAspect.split(':').map(Number), a = pr[0], b = pr[1];
      let w, h;
      if (a >= b) { h = base; w = base * a / b; } else { w = base; h = base * b / a; }
      return { w: Math.round(w / 2) * 2, h: Math.round(h / 2) * 2 };
    }
    function cvUpdate() {
      const custom = cvAspect === 'custom';
      const resRow = document.getElementById('cv-res-row'); if (resRow) resRow.classList.toggle('hidden', custom);
      const csRow = document.getElementById('cv-custom-size'); if (csRow) csRow.classList.toggle('hidden', !custom);
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
      const fpsSel = document.getElementById('cv-fps');
      const fpsNum = document.getElementById('cv-fps-num');
      const fpsCustomRow = document.getElementById('cv-custom-fps');
      const FPS_PRESETS = ['24', '25', '30', '50', '60'];
      canvasBtn.addEventListener('click', () => {
        cvDetect();
        // seed the custom W/H inputs from the live project so switching to Custom starts sensible
        const cw = document.getElementById('cv-cw'), ch = document.getElementById('cv-ch');
        if (cw) cw.value = FM.scene.project.width; if (ch) ch.value = FM.scene.project.height;
        // sync the fps control to the live project (a non-preset fps opens as Custom)
        const cur = String(FM.scene.project.fps || 30);
        if (fpsSel) {
          if (FPS_PRESETS.indexOf(cur) >= 0) { fpsSel.value = cur; if (fpsCustomRow) fpsCustomRow.classList.add('hidden'); }
          else { fpsSel.value = 'custom'; if (fpsNum) fpsNum.value = cur; if (fpsCustomRow) fpsCustomRow.classList.remove('hidden'); }
        }
        cvUpdate();
        cvDialog.classList.remove('hidden');
      });
      document.querySelectorAll('.aspect-chip').forEach(chip => chip.addEventListener('click', () => { cvAspect = chip.dataset.aspect; cvUpdate(); }));
      document.getElementById('cv-res').addEventListener('change', cvUpdate);
      ['cv-cw', 'cv-ch'].forEach(id => { const inp = document.getElementById(id); if (inp) inp.addEventListener('input', cvUpdate); });
      if (fpsSel) fpsSel.addEventListener('change', () => { if (fpsCustomRow) fpsCustomRow.classList.toggle('hidden', fpsSel.value !== 'custom'); });
      document.getElementById('cv-cancel').addEventListener('click', () => cvDialog.classList.add('hidden'));
      document.getElementById('cv-go').addEventListener('click', () => {
        const s = cvCompute();
        FM.scene.project.width = s.w; FM.scene.project.height = s.h;
        const rawFps = (fpsSel && fpsSel.value === 'custom') ? (fpsNum ? fpsNum.value : 30) : (fpsSel ? fpsSel.value : 30);
        FM.scene.project.fps = Math.max(1, Math.min(120, parseInt(rawFps, 10) || 30));
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
      // Any OTHER modifier combo is the browser's / OS's (⌘S save, ⌘M minimise, ⌘←/→): the handled
      // combos above all return, so reaching here with a modifier held means we must NOT hijack the
      // bare-key chain below (⌘S was silently splitting the clip, ⌘M dropping a marker).
      if (mod) return;
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
      else if (e.code === 'BracketLeft') { e.preventDefault(); markRegionIn(); }
      else if (e.code === 'BracketRight') { e.preventDefault(); markRegionOut(); }
      else if (e.code === 'Backslash') { e.preventDefault(); clearRegion(); }
      else if (e.code === 'KeyM') { e.preventDefault(); if (e.repeat) return; if (FM.toggleMarkerAtPlayhead) FM.toggleMarkerAtPlayhead(); }   // toggle (dedups within 0.12s) + ignore OS autorepeat → no stacked duplicates / undo spam
      else if (e.code === 'Tab') { e.preventDefault(); const ls = FM.scene.layers; if (ls.length) { const i = ls.findIndex(l => l.id === FM.scene.selectedId); const n = ((i < 0 ? 0 : i + (e.shiftKey ? -1 : 1)) + ls.length) % ls.length; FM.selectLayer(ls[n].id); } }
      else if ((e.code === 'Equal' || e.code === 'NumpadAdd') && FM.timeline.zoomBy) { e.preventDefault(); FM.timeline.zoomBy(1.5); }
      else if ((e.code === 'Minus' || e.code === 'NumpadSubtract') && FM.timeline.zoomBy) { e.preventDefault(); FM.timeline.zoomBy(1 / 1.5); }
      // Number keys. With a layer SELECTED: 1..N open its category cards (Color & Fill, Border,
      // Blending, Move & Transform, …) — the badge on each card shows its key. With NOTHING selected:
      // 1-5 open the Add-menu tabs. Shift+1/2/3 always add Text / Freehand / Vector.
      else if (/^Digit[1-9]$/.test(e.code) && !mod) {
        const n = parseInt(e.code.slice(5), 10);
        if (e.shiftKey) { if (n <= 3 && FM.addMenu && FM.addMenu.instant) { e.preventDefault(); FM.addMenu.instant(n - 1); } }
        else if (FM.scene.selectedId && FM.inspector && FM.inspector.openCategoryByIndex) {
          if (FM.inspector.openCategoryByIndex(n)) e.preventDefault();
        }
        else if (n <= 5 && FM.addMenu && FM.addMenu.openTab) { e.preventDefault(); FM.addMenu.openTab(FM.addMenu.TAB_KEYS[n - 1]); }
      }
      // Esc: step BACK a page (effects → grid → deselect), not straight to closed. Also bails out of
      // any modal overlay / point-edit / tracking pick first.
      else if (e.code === 'Escape') {
        e.preventDefault();
        if (FM.shortcuts && FM.shortcuts.isOpen()) { FM.shortcuts.hide(); return; }
        if (FM.eyedropper && FM.eyedropper.isActive && FM.eyedropper.isActive()) { FM.eyedropper.stop(); return; }
        if (FM.cropTool && FM.cropTool.isActive && FM.cropTool.isActive()) { FM.cropTool.stop(); return; }
        if (FM.touchupTool && FM.touchupTool.isOpen && FM.touchupTool.isOpen()) { FM.touchupTool.close(); return; }
        if (FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive()) { FM.textEdit.stop(); return; }
        // standalone point-edit closes on Esc; EMBEDDED Edit Points is a view — inspector.back()
        // steps out of it (the refresh guard tears the overlay down with the view)
        if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive() && !FM.pointEdit.isEmbedded()) { FM.pointEdit.stop(); return; }
        if (FM.tracker && FM.tracker.isPicking && FM.tracker.isPicking()) { FM.tracker.cancel(); return; }
        if (FM.inspector && FM.inspector.back) FM.inspector.back();
      }
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
        ' #topbar, #topbar-m, .sb-handle, button, input, select, textarea, label, a, option, [contenteditable],' +
        // full-screen TOOL overlays: the eyedropper's sample tap and the crop/touch-up box drags land on
        // these, and without them here that tap read as "empty background" → deselect → the open colour
        // picker / effect panel vanished mid-pick (the "colour picker closes my menu" bug)
        ' #ed-overlay, #ed-bar, #crop-overlay, #crop-bar, #touchup-overlay, #touchup-bar';
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
        // Clicking anywhere off the inspector CLOSES it — deselect straight back to the Add menu so the
        // panel visibly clears (no matter how deep you were, e.g. the Effects sub-menu). Esc is the
        // gentler step-back (effects → grid → deselect).
        FM.selectLayer(null);
      }, true);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.FM);
