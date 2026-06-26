/* FreeMotion — Timeline UI (AM-style): each layer is a row with a HEAD (eye/thumb/name/lock,
 * drag-to-reorder) + a clip LANE (colored bar, keyframes, trim grips, waveform). The timeline
 * IS the layer manager — there is no separate layers panel. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let rulerEl, tracksEl, playheadEl, innerEl, snaplineEl, loopRegionEl, timelineEl;
  let HEAD_W = 172;
  let zoom = 1;          // 1 = fit-to-width; >1 zooms in (lanes scroll horizontally, heads stay pinned)
  function showSnap(t) { if (snaplineEl) { snaplineEl.style.left = (HEAD_W + t * pxPerSec()) + 'px'; snaplineEl.classList.remove('hidden'); } }
  function hideSnap() { if (snaplineEl) snaplineEl.classList.add('hidden'); }
  let dragging = false;
  let kfDrag = null;
  let trimDrag = null;
  let clipMove = null;   // dragging a clip body to reposition it in time
  let dragIdx = null;    // layer index being reordered via the track head
  let snapping = true;   // magnet toggle: snap clip/trim edges to playhead / clip edges / 0
  const EASE_LABELS = { linear: 'Linear', easeIn: 'Ease In', easeOut: 'Ease Out', easeInOut: 'Ease In-Out', overshoot: 'Overshoot', anticipate: 'Anticipate' };

  // Snap a proposed clip start so the clip's start OR end lands on 0 / playhead / another clip edge.
  // Returns { v: snapped start, snapped: bool, guide: alignment time for the guide line }.
  function snapStart(layer, ns, pps) {
    if (!snapping) return { v: Math.max(0, ns), snapped: false, guide: 0 };
    const snapPx = 7, dur = layer.duration;
    const starts = [0, FM.time], ends = [FM.time];
    FM.scene.layers.forEach(l => { if (l.id !== layer.id) { starts.push(l.start, l.start + l.duration); ends.push(l.start, l.start + l.duration); } });
    (FM.scene.project.markers || []).forEach(mk => { starts.push(mk.t); ends.push(mk.t); });
    let best = ns, bestD = snapPx / pps, snapped = false, guide = 0;
    starts.forEach(c => { if (Math.abs(ns - c) < bestD) { bestD = Math.abs(ns - c); best = c; snapped = true; guide = c; } });
    ends.forEach(c => { const s = c - dur; if (s >= 0 && Math.abs(ns - s) < bestD) { bestD = Math.abs(ns - s); best = s; snapped = true; guide = c; } });
    return { v: Math.max(0, best), snapped: snapped, guide: guide };
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
    for (const k of Object.keys(layer.transform)) if (layer.transform[k] === p) return 'transform.' + k;
    const fx = layer.effects || [];
    for (let i = 0; i < fx.length; i++) { const params = fx[i].params || {}; for (const k of Object.keys(params)) if (params[k] === p) return 'effect.' + i + '.' + k; }
    return null;
  }
  function resolveSlot(layer, key) {
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

  // Pixels per second within the clip LANE. Fit-to-viewport at zoom 1; scaled by `zoom`.
  function laneViewW() { return Math.max(1, ((timelineEl ? timelineEl.clientWidth : (tracksEl ? tracksEl.clientWidth : 800)) || 800) - HEAD_W); }
  function pxPerSec() { return (laneViewW() / FM.scene.project.duration) * zoom; }
  // Widen the inner area when zoomed so the lanes overflow + scroll (heads are sticky-pinned).
  function applyInnerWidth() { if (innerEl) innerEl.style.width = (HEAD_W + FM.scene.project.duration * pxPerSec()) + 'px'; }

  // Map a clientX to project time, accounting for the head column offset.
  function timeFromX(clientX) {
    const rect = innerEl.getBoundingClientRect();
    const x = clientX - rect.left - HEAD_W;
    const t = x / pxPerSec();
    return Math.max(0, Math.min(FM.scene.project.duration, t));
  }

  function buildRuler() {
    const dur = FM.scene.project.duration;
    const pps = pxPerSec();
    // Pick a "nice" step so ticks land ~every 88px — denser as you zoom in.
    const nice = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const step = nice.find(s => s * pps >= 88) || nice[nice.length - 1];
    let html = '';
    for (let t = 0; t <= dur + 1e-6; t += step) {
      const lbl = (step < 1 ? t.toFixed(1) : (t % 1 ? t.toFixed(1) : t.toFixed(0))) + 's';
      html += '<div class="tick" style="left:' + (t * pps) + 'px">' + lbl + '</div>';
    }
    rulerEl.innerHTML = html;
    (FM.scene.project.markers || []).forEach(mk => {
      const el = document.createElement('div');
      el.className = 'tl-marker'; el.style.left = (mk.t * pps) + 'px'; el.title = (mk.label || 'Marker') + ' @ ' + mk.t.toFixed(2) + 's  (double-click to rename)';
      el.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        const input = document.createElement('input');
        input.className = 'marker-edit'; input.value = mk.label || ''; input.style.left = (mk.t * pps) + 'px';
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

  function buildHead(layer, index) {
    const head = document.createElement('div');
    head.className = 'track-head' + (isSelected(layer.id) ? ' sel' : '') + (layer.id === FM.scene.selectedId ? ' primary' : '');
    head.draggable = true;
    head.dataset.idx = index;

    const eye = document.createElement('span');
    eye.className = 'th-eye' + (layer.visible ? '' : ' off');
    eye.textContent = layer.visible ? '👁' : '🚫';
    eye.title = layer.visible ? 'Hide layer' : 'Show layer';
    eye.addEventListener('click', (e) => { e.stopPropagation(); layer.visible = !layer.visible; FM.requestRender(); FM.timeline.rebuild(); if (FM.history) FM.history.commit(); });

    const thumb = document.createElement('canvas');
    thumb.className = 'th-thumb'; thumb.width = 38; thumb.height = 24;
    FM.renderThumb(layer, thumb);

    const name = document.createElement('span');
    name.className = 'th-name'; name.textContent = layer.name; name.title = layer.name + '  (double-click to rename)';
    name.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      head.draggable = false;
      const input = document.createElement('input');
      input.className = 'th-name-edit'; input.value = layer.name;
      input.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      input.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') input.blur(); else if (ev.key === 'Escape') { input.value = layer.name; input.blur(); } });
      input.addEventListener('blur', () => { const v = input.value.trim(); if (v && v !== layer.name) { layer.name = v; if (FM.history) FM.history.commit(); } FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); });
      name.replaceWith(input); input.focus(); input.select();
    });

    const lock = document.createElement('span');
    lock.className = 'th-lock'; lock.textContent = layer.locked ? '🔒' : '🔓';
    lock.title = layer.locked ? 'Unlock layer' : 'Lock layer';
    lock.addEventListener('click', (e) => { e.stopPropagation(); layer.locked = !layer.locked; FM.timeline.rebuild(); if (FM.history) FM.history.commit(); });

    const solo = document.createElement('span');
    solo.className = 'th-solo' + (layer.solo ? ' on' : '');
    solo.textContent = 'S'; solo.title = layer.solo ? 'Unsolo' : 'Solo (hide other layers)';
    solo.addEventListener('click', (e) => { e.stopPropagation(); layer.solo = !layer.solo; FM.requestRender(); FM.timeline.rebuild(); if (FM.history) FM.history.commit(); });
    head.append(eye, thumb, name, lock, solo);
    head.addEventListener('click', (e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) FM.toggleSelect(layer.id); else FM.selectLayer(layer.id); });
    head.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); FM.selectLayer(layer.id); if (FM.contextMenu && FM.layerMenuItems) FM.contextMenu.show(e.clientX, e.clientY, FM.layerMenuItems(layer)); });
    // drag to reorder (z-order)
    head.addEventListener('dragstart', (e) => { dragIdx = index; head.classList.add('dragging'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(index)); } catch (_) {} });
    head.addEventListener('dragend', () => { head.classList.remove('dragging'); document.querySelectorAll('.track-head.drop-target').forEach(h => h.classList.remove('drop-target')); });
    head.addEventListener('dragover', (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; head.classList.add('drop-target'); });
    head.addEventListener('dragleave', () => head.classList.remove('drop-target'));
    head.addEventListener('drop', (e) => {
      e.preventDefault(); head.classList.remove('drop-target');
      const from = dragIdx; dragIdx = null;
      if (FM.reorderLayer) FM.reorderLayer(from, index);
    });
    return head;
  }

  function buildLane(layer) {
    const pps = pxPerSec();
    const lane = document.createElement('div');
    lane.className = 'track-lane';

    const clip = document.createElement('div');
    clip.className = 'clip' + (isSelected(layer.id) ? ' sel' : '') + (layer.reversed ? ' reversed' : '');
    clip.style.left = (layer.start * pps) + 'px';
    clip.style.width = Math.max(8, layer.duration * pps) + 'px';
    const col = layer.clipColor || '#3a5a8c';
    clip.style.background = 'linear-gradient(180deg, ' + shade(col, 8) + ', ' + shade(col, -20) + ')';
    clip.style.borderColor = shade(col, 24);
    clip.dataset.id = layer.id;

    // No clip label: the track-head shows the name and stays pinned (sticky) at all zoom levels.
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
      if (m && m.file) {
        if (m.waveform && m.waveform.length) {
          const wc = document.createElement('canvas');
          wc.className = 'clip-wave';
          wc.width = Math.max(2, Math.round(Math.max(8, layer.duration * pps)));
          wc.height = 32;
          drawWaveform(wc, m.waveform);
          clip.appendChild(wc);
        } else if (!m._wfPending && !m.waveform) {
          FM.getWaveform(m).then(() => { FM.timeline.rebuild(); });
        }
      }
    }
    clip.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      if (e.shiftKey || e.metaKey || e.ctrlKey) { FM.toggleSelect(layer.id); return; }   // multi-select, no drag
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
        trimDrag = { layer: layer, edge: edge, startX: e.clientX, start: layer.start, dur: layer.duration, trim: layer.trimStart, srcDur: (m && m.duration) ? m.duration : Infinity, type: layer.type };
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
        dot.style.left = (tt * pps) + 'px';
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
    FM.scene.layers.forEach((layer, index) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      row.append(buildHead(layer, index), buildLane(layer));
      tracksEl.appendChild(row);
    });
  }

  function beginScrub(e) {
    dragging = true;
    innerEl.setPointerCapture && innerEl.setPointerCapture(e.pointerId);
    if (FM.playing) FM.pause();
  }

  FM.timeline = {
    init() {
      rulerEl = document.getElementById('tl-ruler');
      tracksEl = document.getElementById('tl-tracks');
      playheadEl = document.getElementById('tl-playhead');
      innerEl = document.getElementById('tl-inner');
      timelineEl = document.getElementById('timeline');
      HEAD_W = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--head-w'), 10) || 172;
      const zo = document.getElementById('btn-zoomout'), zi = document.getElementById('btn-zoomin');
      if (zo) zo.addEventListener('click', () => this.zoomBy(1 / 1.5));
      if (zi) zi.addEventListener('click', () => this.zoomBy(1.5));
      const sn = document.getElementById('btn-snap');
      if (sn) sn.addEventListener('click', () => { snapping = !snapping; sn.classList.toggle('active', snapping); });
      // Cmd/Ctrl + wheel zooms the timeline
      if (timelineEl) timelineEl.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); } }, { passive: false });
      snaplineEl = document.createElement('div'); snaplineEl.id = 'tl-snapline'; snaplineEl.className = 'hidden';
      innerEl.appendChild(snaplineEl);
      loopRegionEl = document.createElement('div'); loopRegionEl.id = 'tl-loopregion'; loopRegionEl.className = 'hidden';
      innerEl.appendChild(loopRegionEl);

      const onDown = (e) => { FM.setTime(timeFromX(e.clientX)); beginScrub(e); };
      rulerEl.addEventListener('pointerdown', onDown);
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
      tracksEl.addEventListener('pointerdown', (e) => {
        // clicking an empty clip lane scrubs (heads + clips handle their own pointers)
        if (e.target.classList.contains('track-lane') || e.target === tracksEl || e.target.classList.contains('tl-empty')) onDown(e);
      });
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
        if (clipMove) {
          const dx = e.clientX - clipMove.startX;
          if (!clipMove.moved && Math.abs(dx) < 4) return;   // movement threshold: distinguish click from drag
          clipMove.moved = true;
          const pps = pxPerSec();
          const raw = Math.max(0, clipMove.origStart + dx / pps);
          const sr = e.shiftKey ? { v: raw, snapped: false, guide: 0 } : snapStart(clipMove.layer, raw, pps);   // Shift bypasses snap
          clipMove.layer.start = sr.v;
          if (sr.snapped) showSnap(sr.guide); else hideSnap();
          const clipEl = tracksEl.querySelector('.clip[data-id="' + clipMove.layer.id + '"]');
          if (clipEl) clipEl.style.left = (sr.v * pps) + 'px';
          // group move: shift the other selected clips by the same delta
          const delta = sr.v - clipMove.origStart;
          (clipMove.group || []).forEach(g => {
            g.layer.start = Math.max(0, g.origStart + delta);
            const ge = tracksEl.querySelector('.clip[data-id="' + g.layer.id + '"]');
            if (ge) ge.style.left = (g.layer.start * pps) + 'px';
          });
          FM.requestRender();
          return;
        }
        if (trimDrag) {
          const fps = FM.scene.project.fps || 30, pps = pxPerSec();
          let dt = Math.round(((e.clientX - trimDrag.startX) / pps) * fps) / fps;
          const L = trimDrag.layer;
          const sp = L.speed || 1;
          // snap the moving edge to 0 / playhead / other clip edges, and show the guide
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
          if (clipEl) { clipEl.style.left = (L.start * pps2) + 'px'; clipEl.style.width = Math.max(8, L.duration * pps2) + 'px'; }
          FM.requestRender();
          return;
        }
        if (kfDrag) {
          const fps = FM.scene.project.fps || 30;
          let nt = Math.round(timeFromX(e.clientX) * fps) / fps;
          nt = Math.max(0, Math.min(FM.scene.project.duration, nt));
          kfDrag.kfs.forEach(kf => { kf.t = nt; });
          kfDrag.dot.style.left = (nt * pxPerSec()) + 'px';
          FM.requestRender();
          return;
        }
        if (dragging) FM.setTime(timeFromX(e.clientX));
      });
      window.addEventListener('pointerup', () => {
        dragging = false;
        if (clipMove) {
          const cm = clipMove; clipMove = null; hideSnap();
          if (cm.moved) {
            let end = cm.layer.start + cm.layer.duration;
            (cm.group || []).forEach(g => { end = Math.max(end, g.layer.start + g.layer.duration); });
            if (end > FM.scene.project.duration) FM.scene.project.duration = end;   // grow comp to fit
            FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
          } else {
            FM.setTime(cm.downTime);   // it was a click, not a drag → scrub to it
          }
          return;
        }
        if (trimDrag) {
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
      window.addEventListener('resize', () => this.rebuild());
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
        loopRegionEl.style.left = (HEAD_W + P.loopIn * pps) + 'px';
        loopRegionEl.style.width = ((P.loopOut - P.loopIn) * pps) + 'px';
        loopRegionEl.classList.remove('hidden');
      } else loopRegionEl.classList.add('hidden');
    },

    updatePlayhead() {
      if (!playheadEl) return;
      const px = HEAD_W + FM.time * pxPerSec();
      playheadEl.style.left = px + 'px';
      // highlight clips the playhead is currently over
      const t = FM.time;
      tracksEl.querySelectorAll('.clip').forEach(clipEl => {
        const l = FM.layerById(FM.scene, clipEl.dataset.id);
        clipEl.classList.toggle('under-playhead', !!l && t >= l.start && t < l.start + l.duration);
      });
      // When zoomed (content overflows), page the scroll so the playhead stays visible.
      if (timelineEl && !trimDrag && !clipMove && !dragging) {
        const vw = timelineEl.clientWidth, sl = timelineEl.scrollLeft;
        if (px > sl + vw - 8 || px < sl + HEAD_W) timelineEl.scrollLeft = Math.max(0, px - HEAD_W - 24);
      }
    },

    setZoom(z) {
      zoom = Math.max(1, Math.min(12, z));
      this.rebuild();
      const zl = document.getElementById('tl-zoom-label');
      if (zl) zl.textContent = (Math.round(zoom * 10) / 10) + '×';
    },
    zoomBy(f) { this.setZoom(zoom * f); },
  };
})(window.FM);
