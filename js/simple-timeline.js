/* FreeMotion — FM.simpleTimeline: the Simple editor's timeline, READ-ONLY (Simple mode Phase 1, DESIGN.md §8.1–§8.2, §15.1).
 *
 * WHAT HE HOLDS IN PHASE 1: any project drawn as clips. The main track as one filmstrip row, text / captions / overlays /
 * effects in their own sections above it (higher on screen = in front, Behind just above the clips), sound in one row
 * below, seam chips where the clips do not meet, and a + at the end that lays picked files end to end. Tapping anything
 * selects it and opens TODAY's panel for it, which edits it exactly as Full does. Nothing here moves a clip.
 *
 * GEOMETRY IS FULL'S, BY CONSTRUCTION. Full's #timeline stays laid out underneath (visibility: hidden), so
 * FM.timeline.pxPerSec() is the same number both views draw with, and a time t sits at the same screen x in both:
 * x = 50vw + (t − FM.time) · pps. That is the whole of "every clip keeps its x" across the switch (T8).
 *
 * NOT IN PHASE 1 (BUILD-PLAN.md): folding sections, lane caps and the +N badge, pinch, trim grips, drags, the link line,
 * the black band, the stage clamp and tight-height classes, and Simple's own key scope. Each is a Phase 2 row.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const W = () => FM.spineWords || {};
  const SECTIONS = ['captions', 'text', 'overlay', 'behind'];   // top → bottom inside the sections box (stacking order)
  const GLYPH = { captions: 'Cc', text: 'Aa', overlay: '◧', behind: '▤' };
  const RULER = 18, MAIN_H = 56, SOUND_H = 32, LANE = 32;
  let root = null, scroller = null, inner = null, rulerEl = null, secEl = null, mainEl = null, soundEl = null, sayEl = null, liveEl = null;
  let lastProg = -1, userScrollAt = 0, settleT = 0, R = null, strips = new Map();

  const pps = () => (FM.timeline && FM.timeline.pxPerSec) ? FM.timeline.pxPerSec() : 100;
  function origin() {   // screen-centre in #sm-inner coordinates at scrollLeft 0 (Full's HEAD_W + PAD)
    const panel = document.getElementById('timeline-panel');
    const left = panel ? panel.getBoundingClientRect().left : 0;
    return Math.max(0, window.innerWidth / 2 - left);
  }
  function el(tag, cls, text) { const d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }

  function ensureDom() {
    if (root) return true;
    root = document.getElementById('sm-timeline');
    if (!root) return false;
    scroller = root.querySelector('#sm-scroll'); inner = root.querySelector('#sm-inner');
    rulerEl = root.querySelector('#sm-ruler'); secEl = root.querySelector('#sm-sections');
    mainEl = root.querySelector('#sm-main'); soundEl = root.querySelector('#sm-sound');
    sayEl = document.getElementById('sm-say'); liveEl = document.getElementById('sm-live');
    // the playhead is FIXED at 50vw and the content scrolls under it, exactly as in Full
    scroller.addEventListener('scroll', () => {
      const sL = scroller.scrollLeft;
      if (Math.abs(sL - lastProg) < 1) return;   // our own write
      if (G && G.phase === 'drag') { lastProg = sL; return; }   // 2.5: an edge scroll belongs to the drag; the time is adopted on release
      lastProg = sL; userScrollAt = performance.now();
      clearTimeout(settleT); settleT = setTimeout(() => { userScrollAt = 0; FM.simpleTimeline.updatePlayhead(); }, 160);
      const dur = (FM.scene.project && FM.scene.project.duration) || 0;
      const t = Math.max(0, Math.min(dur, sL / pps()));
      if (FM.scrubTime) FM.scrubTime(FM.snapFrame ? FM.snapFrame(t) : t);
    }, { passive: true });
    scroller.addEventListener('pointerdown', () => { if (FM.playing && FM.pause) FM.pause(); }, { capture: true });
    scroller.addEventListener('wheel', e => {   // ⌘/Ctrl + wheel zooms, as in Full (one zoom for both views)
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const f = FM.wheelZoomFactor ? FM.wheelZoomFactor(e, 1.15) : (e.deltaY < 0 ? 1.15 : 1 / 1.15);
      if (f !== 1 && FM.timeline && FM.timeline.zoomBy) FM.timeline.zoomBy(f);
    }, { passive: false });
    inner.addEventListener('click', e => {   // a tap on empty timeline clears the selection, like Full's background
      if (e.target === inner || e.target === secEl || e.target === mainEl || e.target === soundEl || e.target.classList.contains('sm-lane')) {
        if (FM.selectLayer && FM.scene.selectedId) FM.selectLayer(null);
      }
    });
    inner.addEventListener('pointerdown', onItemDown);
    scroller.addEventListener('pointerdown', onTouchPtr, true); scroller.addEventListener('pointermove', onTouchPtr, true);
    scroller.addEventListener('pointerup', onTouchPtr, true); scroller.addEventListener('pointercancel', onTouchPtr, true);
    /* an armed drag owns the finger: the page must not scroll under it (iOS needs a non-passive touchmove for this) */
    document.addEventListener('touchmove', e => { if (G && G.phase === 'drag' && e.cancelable) e.preventDefault(); }, { passive: false });
    root.addEventListener('click', e => { if (nowMs() < swallowUntil) { swallowUntil = 0; e.stopPropagation(); e.preventDefault(); } }, true);   // the click a drag's release makes is not a tap
    wireSay();
    return true;
  }

  /* ─────────────── #sm-say: where Simple speaks (§3.12). A line with one real button; never FM.toast. ─────────────── */
  let sayT = 0, ptrDown = false;
  function wireSay() {
    if (!sayEl || sayEl._wired) return;
    sayEl._wired = true;
    document.addEventListener('pointerdown', e => { ptrDown = true; lastPtr = performance.now(); const ln = lineOf(); if (ln && ln.textContent && !sayEl.contains(e.target)) clearSay(); }, true);
    document.addEventListener('pointerup', () => { ptrDown = false; }, true);
    document.addEventListener('pointercancel', () => { ptrDown = false; }, true);
    /* A REFUSED SWITCH IS SAID HERE WHEN THE COG IS CLOSED (Phase 1 review R1). The cog block shows its own refusal line, but an
       Open in Full hop is pressed with the cog shut, and its "wait for the export" was lost — one listener for every door. */
    window.addEventListener('fm-editor-refuse', ev => {
      const dlg = document.getElementById('canvas-dialog');
      if (dlg && !dlg.classList.contains('hidden')) return;
      if (!(FM.editor && FM.editor.isSimple())) return;
      const t = ev.detail && ev.detail.text; if (t) sayLine(t);
    });
  }
  /* Phase 2.2: #sm-say is the TRAY ROW (§8.2): its .sm-line takes the row while Simple speaks, #sm-tray shows otherwise */
  const lineOf = () => (sayEl && sayEl.querySelector('.sm-line')) || sayEl;
  /* §3.12 1b (review finding 27): a line with buttons raised from a tray tool pressed by KEYBOARD (or a screen reader) takes
     that focus on its first button, and gives it back to the tool when it goes (or to the tray's first tool if that tool is
     gone). Not after a pointer press (a pointerdown in the last half second), so a mouse click or a tap never parks focus in
     a line, which would then never time out (rule 1b: never while focus is inside it). */
  let raisedBy = null, lastPtr = -1e9;
  function clearSay() {
    clearTimeout(sayT); const ln = lineOf(); if (ln) ln.textContent = ''; if (sayEl) sayEl.classList.remove('sm-saying', 'sm-say-has-b');
    if (raisedBy != null) {
      const tr = document.getElementById('sm-tray'), ae = document.activeElement;
      if (tr && (!ae || ae === document.body || (sayEl && sayEl.contains(ae)))) {
        const t = (raisedBy && tr.querySelector('[data-tool="' + raisedBy + '"]')) || tr.querySelector('button');
        if (t) { try { t.focus({ preventScroll: true }); } catch (e) {} }
      }
      raisedBy = null;
    }
  }
  function armClear(ms) {
    clearTimeout(sayT);
    sayT = setTimeout(function again() {
      if (sayEl && (sayEl.matches(':hover') || sayEl.contains(document.activeElement))) { sayT = setTimeout(again, 1000); return; }
      clearSay();
    }, ms || 10000);
  }
  /* A pulse on the clip a button-less line is about (§3.12 rule 1a): the line itself goes to #sm-live only, so the tool
     that was pressed keeps its place and its focus. */
  function pulse(ids) {
    (ids || []).forEach(id => {
      const n = root && root.querySelector('.sm-item[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      if (!n) return;
      n.classList.remove('sm-pulse'); void n.offsetWidth; n.classList.add('sm-pulse');
      setTimeout(() => n.classList.remove('sm-pulse'), 700);
    });
  }
  /* THE LINE (§3.12). opts.live: screen readers and a pulse only, the row is not taken. Otherwise the row shows the text
     and at most two real buttons, which ignore every press until 400 ms have passed AND the press that raised the line
     has been let go (rule 5), reading aria-disabled meanwhile; a line with buttons stays 10 s, one without 4 s. */
  function sayLine(text, opts) {
    opts = opts || {};
    if (opts.live) { if (liveEl) liveEl.textContent = text; pulse(opts.pulse); return; }
    if (!sayEl) return;
    const ln = lineOf();
    const tr = document.getElementById('sm-tray'), ae = document.activeElement;
    if (tr && ae && tr.contains(ae) && !ptrDown && performance.now() - lastPtr > 500) raisedBy = (ae.dataset && ae.dataset.tool) || '';
    ln.textContent = ''; sayEl.classList.add('sm-saying');
    const tx = el('span', 'sm-say-t', text); tx.title = opts.title || text; ln.appendChild(tx);
    const btns = (opts.buttons || []).slice(0, 2);
    if (opts.full && !btns.length) btns.push({ label: (W().lines || {}).openFull || 'Open in Full', fn: () => { if (FM.editor) FM.editor.request('full', { hop: true }); } });   // a hop: the guard, no memory (R1)
    const t0 = performance.now(); let up = !ptrDown;
    if (!up) document.addEventListener('pointerup', () => { up = true; }, { once: true, capture: true });
    const armed = () => up && performance.now() - t0 >= 400;
    btns.forEach(bd => {
      const b = el('button', 'sm-say-b', bd.label); b.type = 'button'; b.setAttribute('aria-disabled', 'true');
      b.addEventListener('pointerdown', ev => { if (!armed()) { ev.preventDefault(); ev.stopPropagation(); } });
      b.addEventListener('click', ev => { ev.stopPropagation(); if (!armed()) { ev.preventDefault(); return; } const at = b.getBoundingClientRect(); clearSay(); try { bd.fn(at); } catch (e) {} });   // 2.6: the button's box, so a menu button (Options ›) can open beside itself
      ln.appendChild(b);
    });
    sayEl.classList.toggle('sm-say-has-b', btns.length > 0);
    if (raisedBy != null && btns.length) { const fb = ln.querySelector('.sm-say-b'); if (fb) { try { fb.focus({ preventScroll: true }); } catch (e) {} } }
    if (btns.length) setTimeout(function arm() { if (!sayEl.isConnected || !sayEl.querySelector('.sm-say-b')) return; if (!armed()) { setTimeout(arm, 60); return; } sayEl.querySelectorAll('.sm-say-b').forEach(b => b.setAttribute('aria-disabled', 'false')); }, 400);
    /* #sm-say is itself the polite status region (rule 1b) and reads the text with its buttons; #sm-live is for live-only lines.
       Writing the row's text there too made a screen reader read every refusal and every Undo line twice (review finding 29). */
    armClear(btns.length ? 10000 : 4000);
  }

  let laterRAF = 0;
  function later() { if (laterRAF) return; laterRAF = requestAnimationFrame(() => { laterRAF = 0; if (FM.editor && FM.editor.isSimple()) FM.timeline.rebuild(); }); }
  /* ─────────────── filmstrips and waveforms: one small bounded cache, the same frames Full builds ─────────────── */
  function stripFor(layer, m, cssW, h) {
    const bw = Math.max(8, Math.min(4096, Math.round(cssW)));   // iOS blanks very wide canvases; CSS stretches it back
    const key = bw + '|' + h + '|' + (layer.trimStart || 0) + '|' + layer.duration + '|' + (m.stripFrames ? m.stripFrames.length : -1) + '|' + (layer.mediaRev || 0);
    const hit = strips.get(layer.id);
    if (hit && hit.key === key) return hit.canvas;
    if (!(m.stripFrames && m.stripFrames.length)) {
      /* ONCE per record, and only for one that can decode (buildClipStrip answers an element-less record with an
         immediate resolve that sets nothing — re-asking on every rebuild would loop forever in microtasks). The
         rebuild it asks for is coalesced onto one frame. */
      if (m.el && m.stripFrames === undefined && !m._stripPending && !m._smAsked && !FM.playing && FM.buildClipStrip) {
        m._stripPending = true; m._smAsked = true;
        FM.buildClipStrip(m, 8).then(() => { m._stripPending = false; later(); }, () => { m._stripPending = false; });
      }
      return null;
    }
    const c = el('canvas', 'sm-strip'); c.width = bw; c.height = h;
    const g = c.getContext('2d'), aspect = (m.width || 16) / (m.height || 9), k = bw / cssW;
    const tileW = Math.max(12, Math.round(h * aspect * k));
    for (let x = 0, i = 0; x < bw; x += tileW, i++) { const f = m.stripFrames[i % m.stripFrames.length]; if (f) { try { g.drawImage(f, x, 0, tileW, h); } catch (e) {} } }
    strips.set(layer.id, { key: key, canvas: c });
    if (strips.size > 60) strips.delete(strips.keys().next().value);
    return c;
  }

  /* ─────────────── drawing ─────────────── */
  function badge(node, u) {
    if (u.pro !== 'none') { const b = el('span', 'sm-pro', '✦'); b.title = (W().lines || {}).pro || 'Has moves and effects'; node.appendChild(b); }
    if (u.media === 'missing') node.appendChild(el('span', 'sm-nofoot', (W().lines || {}).noFootage || 'No footage'));
    if (u.hidden) node.classList.add('sm-hidden');
    if (u.kind === 'undecided') node.classList.add('sm-loading');
  }
  function itemNode(layer, u, x, w, cls) {
    const n = el('div', 'sm-item ' + cls);
    n.dataset.id = layer.id;
    n.setAttribute('role', 'button');
    n.tabIndex = -1;
    n.style.left = x + 'px'; n.style.width = Math.max(4, w) + 'px';
    const name = FM.spine.itemWord(layer, R);
    n.setAttribute('aria-label', name); n.title = name;
    n.appendChild(el('span', 'sm-name', name));
    badge(n, u);
    n.addEventListener('click', e => { e.stopPropagation(); FM.selectLayer(layer.id); });
    n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); FM.selectLayer(layer.id); } });
    return n;
  }
  function buildRuler(X, p, dur, width) {
    rulerEl.textContent = '';
    const step = p > 90 ? 1 : p > 40 ? 2 : p > 16 ? 5 : p > 6 ? 10 : 30;
    for (let s = 0; s <= dur + 1e-6; s += step) {
      const tick = el('div', 'sm-tick', (Math.floor(s / 60) ? Math.floor(s / 60) + ':' : '') + String(Math.round(s % 60)).padStart(Math.floor(s / 60) ? 2 : 1, '0') + (Math.floor(s / 60) ? '' : 's'));
      tick.style.left = (X + s * p) + 'px';
      rulerEl.appendChild(tick);
    }
  }

  /* ═══════════════ RELEASE 2.5: DRAGS (DESIGN §3.8, §8.2 Gestures) ═══════════════
     Hold 350 ms (touch and pen; a mouse moves at once, as in Full) and drag a main clip to reorder it, up past the row to lift it; an
     overlay, text or sound moves in time and an overlay dragged down onto the clip row goes into it; the selected clip's two grips trim
     it with a length readout; two fingers zoom. NOTHING is written until release: the preview is boxes moving in the DOM, then one
     FM.spine.cmd call, the same one its button makes, so every refusal, ask and Undo already exists. The arm gate (FM.spine.canArrange)
     is read when the gesture arms and again on release. The edge auto-scroll below is a COPY of Full's clipEdgeScroll / trimEdgeScroll
     with the same four brakes (§0.4 I9: Full's two loops are not touched). */
  const HOLD_MS = 350, SLOP = 8, MOUSE_SLOP = 4, LIFT_PX = 24, LIFT_MS = 150, EDGE_MAX = 22, SCROLL_FRAMES_MAX = 1200, GRIP_HIT = 24, GRIP_CAP = 13, SNAP_PX = 7, STALE_MS = 4000;
  let G = null, swallowUntil = 0, labelEl = null, pinch = null;
  const touches = new Map();
  const gateOf = (id, look) => (FM.spine && FM.spine.canArrange) ? FM.spine.canArrange(id, look ? { look: true } : null) : null;
  const hardGate = r => !!r && r !== 'locked';   // 'locked' does not stop a drag: the runner asks at the release, with its own Do it anyway
  const nowMs = () => performance.now();
  const clientToT = x => { const r = scroller.getBoundingClientRect(); return (x - r.left + scroller.scrollLeft - origin()) / pps(); };
  const mainNodes = () => Array.from(mainEl.querySelectorAll('.sm-clip'));
  const nodeOf = id => mainEl.querySelector('.sm-item[data-id="' + id + '"]');

  function setLabel(text, x, y) {
    if (!text) { if (labelEl) { labelEl.remove(); labelEl = null; } return; }
    if (!labelEl) { labelEl = el('div', 'sm-dragtip'); labelEl.setAttribute('role', 'status'); document.body.appendChild(labelEl); }
    labelEl.textContent = text;
    labelEl.style.left = Math.max(8, Math.min(window.innerWidth - 8, x)) + 'px'; labelEl.style.top = Math.max(8, y - 34) + 'px';
  }
  function clearPreview() {
    mainNodes().forEach(n => { n.style.transform = ''; n.classList.remove('sm-held', 'sm-ghost'); });
    root.querySelectorAll('.sm-held').forEach(n => { n.style.transform = ''; n.classList.remove('sm-held', 'sm-ghost'); });
    document.body.classList.remove('sm-dragging');
    setLabel(null);
  }
  function stopLoop() { if (G && G.raf) { cancelAnimationFrame(G.raf); G.raf = 0; } }
  function teardown() {
    if (!G) return;
    clearTimeout(G.timer); stopLoop();
    window.removeEventListener('pointermove', onMove, true); window.removeEventListener('pointerup', onUp, true); window.removeEventListener('pointercancel', onCancel, true);
    try { if (G.capEl && G.capEl.releasePointerCapture) G.capEl.releasePointerCapture(G.pid); } catch (e) {}
    G = null;
  }
  /* the stale-gesture recovery (§3.8): the boxes glide back, nothing was written, and the line says why */
  function abort(sayKind, id) {
    if (!G) return false;
    const was = G.phase === 'drag', dirty = G.dirty;
    root.classList.add('sm-gliding'); setTimeout(() => root && root.classList.remove('sm-gliding'), 260);
    clearPreview(); teardown();
    if (was && dirty && FM.timeline) FM.timeline.rebuild();
    else if (was) refreshNodes();
    if (sayKind && FM.spine && FM.spine.explain) FM.spine.explain(sayKind, id);
    return was;
  }
  function refreshNodes() { if (FM.editor && FM.editor.isSimple() && FM.timeline) FM.timeline.rebuild(); }

  /* ── arming ── */
  function onItemDown(e) {
    if (e.button > 0 || G || pinch || !R) return;
    swallowUntil = 0;   // a new press is a new gesture: the click only a drag's release makes is spent
    const t = e.target && e.target.closest ? e.target.closest('.sm-item') : null;
    if (!t || !t.dataset.id || t.closest('.sm-grip, .sm-chip, .sm-add, .sm-mute, .sm-band, .sm-more')) return;
    if (t.classList.contains('sm-loading')) return;
    const id = t.dataset.id, L = FM.layerById(FM.scene, id); if (!L) return;
    const e0 = R.main.find(x => !x.slot && x.id === id);
    G = { kind: 'move', phase: 'wait', id: id, pid: e.pointerId, ptype: e.pointerType || 'mouse', x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
          node: t, capEl: t, main: !!(R.isMain && R.isMain(id)), overlayish: !!(R.units[id] && (R.units[id].kind === 'overlay')), mode: (R.isMain && R.isMain(id)) ? 'reorder' : 'time', pend: null, pendAt: 0, j: -1, ns: null, scrollFrames: 0, edgeScrolled: false, raf: 0, timer: 0,
          start0: +L.start || 0, dur0: +L.duration || 0, entry: e0 || null, projDur0: (FM.scene.project && FM.scene.project.duration) || 0, touchAt: nowMs(), dirty: false, moved: false };
    window.addEventListener('pointermove', onMove, true); window.addEventListener('pointerup', onUp, true); window.addEventListener('pointercancel', onCancel, true);
    if (G.ptype !== 'mouse') G.timer = setTimeout(arm, HOLD_MS);
  }
  function arm() {
    if (!G || G.phase !== 'wait') return;
    clearTimeout(G.timer);
    const r = gateOf(G.id), id = G.id;
    if (hardGate(r)) { clearPreview(); teardown(); FM.spine.explain(r, id); return; }   // no preview: the finger scrubs as in Full, and the line says why
    G.phase = 'drag'; G.touchAt = nowMs(); G.armedAt = nowMs();
    try { G.capEl.setPointerCapture(G.pid); } catch (e) {}
    G.node.classList.add('sm-held', 'sm-ghost'); document.body.classList.add('sm-dragging');
    if (G.ptype !== 'mouse' && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
    loop();
  }
  function onGripDown(e) {
    if (e.button > 0 || G || pinch || !R) return;
    const gp = e.currentTarget, id = gp.dataset.id, L = FM.layerById(FM.scene, id), me = R.main.find(x => !x.slot && x.id === id);
    if (!L) return;
    const e0 = me || { start: +L.start || 0, end: (+L.start || 0) + (+L.duration || 0) };   // 2.5b: an item's span is its own
    e.stopPropagation(); e.preventDefault();
    const r = gateOf(id, !me); if (hardGate(r)) { FM.spine.explain(r, id); return; }
    G = { kind: 'trim', phase: 'drag', side: gp.dataset.side, id: id, main: !!me, pid: e.pointerId, ptype: e.pointerType || 'mouse', x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, node: root.querySelector('.sm-item[data-id="' + id + '"]'), capEl: gp,
          scrollFrames: 0, edgeScrolled: false, raf: 0, timer: 0, start0: +L.start || 0, dur0: +L.duration || 0, entry: e0, projDur0: (FM.scene.project && FM.scene.project.duration) || 0, touchAt: nowMs(), dirty: false, moved: false, edge: null };
    try { gp.setPointerCapture(e.pointerId); } catch (er) {}
    window.addEventListener('pointermove', onMove, true); window.addEventListener('pointerup', onUp, true); window.addEventListener('pointercancel', onCancel, true);
    document.body.classList.add('sm-dragging');
    loop(); render();
  }

  /* ── moving ── */
  function onMove(e) {
    if (!G || e.pointerId !== G.pid) return;
    G.x = e.clientX; G.y = e.clientY; G.touchAt = nowMs();
    if (G.phase === 'wait') {
      const dist = Math.hypot(G.x - G.x0, G.y - G.y0);
      if (G.ptype === 'mouse') { if (dist > MOUSE_SLOP) arm(); }
      else if (dist > SLOP) { clearPreview(); teardown(); return; }   // a swipe before the hold fired: the finger scrubs, nothing arms
      if (!G || G.phase !== 'drag') return;
    }
    if (e.cancelable) e.preventDefault();
    G.moved = true;
    render();
  }
  /* The pieces of the preview. Only boxes move; the scene is not touched. */
  function render() {
    if (!G || G.phase !== 'drag' || !mainEl) return;
    const p = pps(), dx = G.x - G.x0, dy = G.y - G.y0, now = nowMs();
    if (G.kind === 'trim') return renderTrim(p, dx);
    const mainTop = mainEl.getBoundingClientRect().top;
    const want = G.main ? (G.y < mainTop - LIFT_PX ? 'lift' : 'reorder') : (G.overlayish && G.y > mainTop + 6 ? 'drop' : 'time');
    if (want !== G.mode) { if (G.pend !== want) { G.pend = want; G.pendAt = now; } else if (now - G.pendAt >= LIFT_MS) { G.mode = want; G.pend = null; } }
    else G.pend = null;
    G.node.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const nodes = mainNodes(); nodes.forEach(n => { if (n !== G.node) n.style.transform = ''; });
    if (G.main && G.entry) {
      const i = R.main.findIndex(x => x.id === G.id), c = R.main[i], nx = R.main[i + 1];
      const len = (nx ? nx.start - c.start : c.end - c.start) * p;
      const slide = (from, to, by) => R.main.forEach((en, k) => { if (!en.slot && k >= from && k < to && en.id !== G.id) { const n = nodeOf(en.id); if (n) n.style.transform = 'translateX(' + by + 'px)'; } });
      if (G.mode === 'lift') { slide(i + 1, R.main.length, -len); G.j = -1; setLabel((W().tools || {}).liftLabel || 'Make overlay', G.x, G.y); }
      else {
        const tc = (c.start + c.end) / 2 + dx / p, j = FM.spine.moveTargetFor(R, G.id, tc); G.j = j;
        if (j > i + 1) slide(i + 1, j, -len); else if (j >= 0 && j < i) slide(j, i, len);
        const num = (j > i ? j : j) , count = R.main.filter(x => !x.slot).length;
        setLabel(j === i || j === i + 1 ? '' : ((W().lines || {}).moved ? W().lines.moved(FM.spine.itemWord(FM.layerById(FM.scene, G.id), R), R.main.slice(0, j > i ? j : j).filter(x => !x.slot && x.id !== G.id).length + 1, count) : ''), G.x, G.y);
      }
    } else if (G.mode === 'drop') { setLabel((W().tools || {}).dropLabel || 'Put in the clip row', G.x, G.y); }
    else {
      const raw = Math.max(0, G.start0 + dx / p), ns = snapStart(raw, G.dur0, p); G.ns = ns;
      setLabel(ns.toFixed(1) + ' s', G.x, G.y);
    }
  }
  /* BENCHMARK SNAP, within SNAP_PX screen pixels: the playhead, 0, markers, clip edges, other items' edges; start or end of the moved item */
  function snapStart(raw, dur, p) {
    const marks = ((FM.scene.project && FM.scene.project.markers) || []).map(m => m.t);
    const pts = [0, FM.time || 0].concat(marks, R.main.filter(x => !x.slot).reduce((a, x) => a.concat([x.start, x.end]), []));
    FM.scene.layers.forEach(l => { if (l.id !== G.id && l.type !== 'camera') { pts.push(+l.start || 0, (+l.start || 0) + (+l.duration || 0)); } });
    let best = null, bd = SNAP_PX / p;
    pts.forEach(t => { [[t, raw], [t - dur, raw]].forEach(c => { const d = Math.abs(c[1] - c[0]); if (d < bd) { bd = d; best = c[0]; } }); });
    return best != null ? Math.max(0, best) : (FM.snapFrame ? FM.snapFrame(raw) : raw);
  }
  function renderTrim(p, dx) {
    const e0 = G.entry, ml = (FM.spine && FM.spine.minLen) ? FM.spine.minLen((FM.scene.project && FM.scene.project.fps) || 30) : 0.1, node = G.node; if (!node) return;
    const fr = t => (FM.snapFrame ? FM.snapFrame(t) : t);
    let a = e0.start, b = e0.end;
    if (G.side === 'tail') b = Math.max(a + ml, fr(e0.end + dx / p)); else a = Math.min(b - ml, fr(e0.start + dx / p));
    G.edge = G.side === 'tail' ? b : a;
    node.style.left = (origin() + a * p) + 'px'; node.style.width = Math.max(4, (b - a) * p) + 'px';
    const grip = G.capEl; if (grip) grip.style.left = (G.side === 'tail' ? origin() + b * p - (GRIP_HIT - GRIP_CAP) : origin() + a * p - GRIP_CAP) + 'px';
    setLabel((b - a).toFixed(1) + ' s', G.x, G.y);
  }
  /* ── the edge auto-scroll: Full's four brakes, copied (frame cap, far limit frozen at the start, stop at the ceiling, origin shift) ── */
  function loop() { if (G && !G.raf) G.raf = requestAnimationFrame(tick); }
  function tick() {
    if (!G) return;
    G.raf = 0;
    if (G.phase !== 'drag') return;
    G.touchAt = nowMs();   // an edge-hold IS a live gesture: the finger stops moving and this loop does the travelling
    render();   // the hold for lift / drop mode is a clock, so a still finger still switches
    const rect = scroller.getBoundingClientRect(), zone = Math.min(46, Math.max(12, Math.round(rect.width * 0.06)));
    let v = 0;
    if (G.x > rect.right - zone) v = Math.min(EDGE_MAX, ((G.x - (rect.right - zone)) / zone) * EDGE_MAX);
    else if (G.x < rect.left + zone) v = -Math.min(EDGE_MAX, (((rect.left + zone) - G.x) / zone) * EDGE_MAX);
    if (v !== 0 && ++G.scrollFrames <= SCROLL_FRAMES_MAX) {                                     // brake 2
      const pinned = v > 0 && ((G.kind === 'move' && G.main && G.mode === 'reorder' && G.j >= R.main.length) || (G.kind === 'trim' && G.side === 'tail' && G.atCap));   // brake 4
      if (!pinned) {
        if (v > 0) {                                                                              // brake 3: the limit from where it STARTED, never from where it is
          const far = Math.max(G.projDur0, G.start0 + G.dur0, R.trackEnd + G.dur0), limit = origin() + far * pps() + scroller.clientWidth;
          const need = Math.min(limit, scroller.scrollLeft + scroller.clientWidth + v + 120);
          if ((parseFloat(inner.style.width) || 0) < need) inner.style.width = need + 'px';
        }
        const before = scroller.scrollLeft;
        scroller.scrollLeft = Math.max(0, before + v);
        const moved = scroller.scrollLeft - before;
        if (moved) { G.edgeScrolled = true; G.x0 -= moved; lastProg = scroller.scrollLeft; render(); }   // brake 1: nothing moved, nothing re-armed
      }
    }
    G.raf = requestAnimationFrame(tick);
  }

  /* ── letting go ── */
  function onUp(e) {
    if (!G || e.pointerId !== G.pid) return;
    const g = G;
    if (g.phase === 'wait') { clearPreview(); teardown(); return; }   // a tap: the click selects, nothing was armed
    G.x = e.clientX; G.y = e.clientY; render();
    const id = g.id;
    swallowUntil = nowMs() + 250;
    const out = { mode: g.mode, j: g.j, ns: g.ns, edge: g.edge, kind: g.kind, side: g.side, id: id, edgeScrolled: g.edgeScrolled, main: g.main, start0: g.start0, dur0: g.dur0, entryI: R.main.findIndex(x => x.id === id) };
    clearPreview(); teardown();
    commit(out);
  }
  function onCancel(e) { if (G && e.pointerId === G.pid) abort(null); }
  function commit(o) {
    const id = o.id, L = FM.layerById(FM.scene, id);
    const r = gateOf(id);
    if (hardGate(r)) { refreshNodes(); FM.spine.explain(r, id); return; }                          // the gate is read AGAIN on release
    const R2 = FM.spine.read(FM.scene);
    if (!L || (o.kind === 'move' && !!R2.isMain(id) !== !!o.main) || (o.kind === 'trim' && ((+L.start || 0) !== o.start0 || (+L.duration || 0) !== o.dur0))) {
      refreshNodes(); FM.spine.say(((W().lines || {}).changedWhileDragging) || 'Clips changed while you were dragging · try again'); return;
    }
    let ran;
    if (o.kind === 'trim') ran = !R2.isMain(id) ? FM.spine.cmd.trimItem(id, o.side, o.edge) : (o.side === 'tail' ? FM.spine.cmd.trimTail(id, o.edge) : FM.spine.cmd.trimHead(id, o.edge));
    else if (o.mode === 'lift') ran = FM.spine.cmd.lift(id);
    else if (o.mode === 'drop') ran = FM.spine.cmd.intoRow(id);
    else if (o.main) { const i = R2.main.findIndex(x => x.id === id); if (o.j < 0 || o.j === i || o.j === i + 1) { refreshNodes(); return; } ran = FM.spine.cmd.moveTo(id, o.j); }
    else if (o.ns != null && Math.abs(o.ns - o.start0) > 1e-6) ran = FM.spine.cmd.moveItem(id, o.ns);
    else { refreshNodes(); return; }
    if (o.edgeScrolled && FM.scrubTime) { const t = Math.max(0, scroller.scrollLeft / pps()); FM.scrubTime(FM.snapFrame ? FM.snapFrame(t) : t); }   // queue 690's adopt rule: the view follows the edit, on release only
    return ran;
  }
  /* a remote structural op, a lease refusal or the gate shutting ends the drag through the stale-gesture recovery (§3.8) */
  function abortGestures(pred) {
    if (!G) return false;
    if (typeof pred === 'function' && !pred(G.id)) return false;
    const id = G.id; return abort('gone', id);
  }
  /* ── pinch: two fingers zoom, a pinch is the same zoom as the wheel's (FM.timeline.zoomBy) ── */
  function pinchDist() { const a = Array.from(touches.values()); return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  function onTouchPtr(e) {
    if (e.pointerType !== 'touch') return;
    if (e.type === 'pointerdown') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) { if (G) abort(null); pinch = { last: pinchDist() }; if (FM.playing && FM.pause) FM.pause(); }
    } else if (e.type === 'pointermove' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size >= 2) { const d = pinchDist(); if (pinch.last > 0 && d > 0) { const f = d / pinch.last; if (Math.abs(f - 1) > 0.002 && FM.timeline && FM.timeline.zoomBy) FM.timeline.zoomBy(f); } pinch.last = d; if (e.cancelable) e.preventDefault(); }
    } else if (e.type === 'pointerup' || e.type === 'pointercancel') {
      touches.delete(e.pointerId); if (touches.size < 2) pinch = null;
    }
  }
  /* ── the selected clip's grips: 13 px caps OUTSIDE the edges, each hit ≥ 24 px; not drawn when the gate is shut or the clip is under 24 px ── */
  function drawGrips(byId, sel, xOf, p) {
    root.querySelectorAll('.sm-grip').forEach(g => g.remove());
    if (sel.size !== 1) return;
    const id = Array.from(sel)[0], me = R.main.find(x => !x.slot && x.id === id), L = byId.get(id), u = R.units[id];
    if (!L || L.type === 'group') return;
    /* 2.5b: a main clip has grips (a trim that ripples); so does a text, overlay or sound in its section or the sound row (a trim that moves nothing else, gated as a look). Not a
       caption track, a block, a Full-only thing, a clip still loading or a sound taken out of a clip (it trims with its clip). */
    if (!me && (!u || ['text', 'overlay', 'audio', 'effect'].indexOf(u.kind) < 0 || (L.sm && L.sm.twin) || L.type === 'camera')) return;
    if (hardGate(gateOf(id, !me))) return;
    const node = me ? null : root.querySelector('.sm-item[data-id="' + id + '"]');
    if (!me && !node) return;
    const start = me ? me.start : (+L.start || 0), end = me ? me.end : start + (+L.duration || 0);
    const w = (end - start) * p; if (w < GRIP_HIT) return;
    const host = me ? mainEl : node.parentNode;
    [['head', xOf(start) - GRIP_CAP, (W().tools || {}).trimStart || 'Trim the start'], ['tail', xOf(end) - (GRIP_HIT - GRIP_CAP), (W().tools || {}).trimEnd || 'Trim the end']].forEach(a => {
      const g = el('div', 'sm-grip sm-grip-' + a[0]); g.dataset.id = id; g.dataset.side = a[0]; g.style.left = a[1] + 'px'; g.style.width = GRIP_HIT + 'px';
      if (!me) { g.classList.add('sm-grip-item'); g.style.top = node.offsetTop + 'px'; g.style.height = node.offsetHeight + 'px'; }
      g.setAttribute('aria-label', a[2]); g.title = a[2]; g.setAttribute('role', 'button');
      g.addEventListener('pointerdown', onGripDown);
      host.appendChild(g);
    });
  }

  FM.simpleTimeline = {
    rebuild() {
      if (!ensureDom() || !FM.spine || !FM.scene) return;
      /* 2.5: no redraw under a live drag (Full's rule). A rebuild that arrives while the finger is down waits; one that arrives long after the last event means the
         release was lost, and the gesture is put back (§3.8 stale-gesture recovery) */
      if (G && G.phase === 'drag') { if (nowMs() - G.touchAt > STALE_MS) abort(null); else { G.dirty = true; return; } }
      const scene = FM.scene, layers = scene.layers, byId = new Map(layers.map(l => [l.id, l]));
      R = FM.spine.read(scene);
      const p = pps(), X = origin(), dur = Math.max(0, scene.project.duration || 0);
      const vw = scroller.clientWidth || window.innerWidth;
      inner.style.width = (vw + dur * p) + 'px';
      buildRuler(X, p, dur);
      const sel = new Set(FM.selectionIds ? FM.selectionIds() : []);
      const xOf = t => X + t * p;

      // ── sections box: every non-empty section's lanes, bottom-aligned (Behind lowest, right above the clips) ──
      secEl.textContent = '';
      const boxH = Math.max(LANE, (scroller.clientHeight || 170) - RULER - MAIN_H - SOUND_H);
      secEl.style.height = boxH + 'px';
      const stack = el('div', 'sm-secstack');
      SECTIONS.forEach(sec => {
        const lanes = R.lanes[sec] || [];
        if (!lanes.length) return;
        const box = el('div', 'sm-sec sm-sec-' + sec);
        box.dataset.sec = sec;
        const glyph = el('div', 'sm-glyph', GLYPH[sec]);
        glyph.setAttribute('aria-hidden', 'true');
        glyph.title = ((W().sections || {})[sec]) || sec;
        box.appendChild(glyph);
        lanes.forEach(ids => {
          const lane = el('div', 'sm-lane');
          ids.forEach(id => {
            const l = byId.get(id); if (!l) return;
            const n = itemNode(l, R.units[id], xOf(l.start), (l.duration || 0) * p, 'sm-k-' + R.units[id].kind);
            if (sel.has(id)) n.classList.add('sel');
            lane.appendChild(n);
          });
          box.appendChild(lane);
        });
        stack.appendChild(box);
      });
      secEl.appendChild(stack);

      // ── the clip row ──
      mainEl.textContent = '';
      const clips = R.main.filter(e => !e.slot);
      clips.forEach((e, i) => {
        const l = byId.get(e.id); if (!l) return;
        const u = R.units[e.id];
        const w = (e.end - e.start) * p;
        const n = itemNode(l, u, xOf(e.start), w, 'sm-clip');
        const clipC = (FM._clipColorOf ? FM._clipColorOf(l) : l.clipColor) || '#3a5a8c';
        n.style.background = clipC;
        const m = FM.media && FM.media.get(l.id);
        if (m && (m.width > 0)) { const c = stripFor(l, m, w, MAIN_H - 4); if (c) { c.style.width = w + 'px'; n.insertBefore(c, n.firstChild); } }
        const follow = (R.followers[e.id] || []).length;
        const aria = (W().a11y && W().a11y.clip) ? W().a11y.clip(i + 1, clips.length, e.end - e.start, follow) : ('Clip ' + (i + 1));
        n.setAttribute('aria-label', aria);
        if (sel.has(e.id)) n.classList.add('sel');
        /* 2.3 (§4.6): the sound taken out of this clip draws as a thin waveform band along its bottom edge, not as a row of its own */
        if ((R.followers[e.id] || []).some(f => FM.spine.isTwinOf && FM.spine.isTwinOf(byId.get(f), l, R.eps))) { const b = el('span', 'sm-twinband'); b.setAttribute('aria-hidden', 'true'); n.appendChild(b); }
        mainEl.appendChild(n);
      });
      /* 2.3: Mute clip sound — the 🔈 at the head of the clip row, its one home (§3.6). It reads the document's own key, never the clips. */
      if (clips.length && FM.spine.muteMode) {
        const off = FM.spine.muteMode(), mw = (W().tools || {});
        const mb = el('button', 'sm-mute' + (off ? ' on' : '')); mb.type = 'button';
        const ic = (FM.simpleTools && FM.simpleTools.ICON) || {};
        mb.innerHTML = '<svg viewBox="0 0 24 24" class="sm-ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (off ? ic.mute : ic.volume) + '</svg>';
        const nm = off ? (mw.muteOff || 'Clip sound is off, tap to turn it on') : (mw.muteOn || 'Mute clip sound');
        mb.setAttribute('aria-label', nm); mb.title = nm; mb.setAttribute('aria-pressed', off ? 'true' : 'false'); mb.dataset.tool = 'muteClips';
        mb.style.left = Math.max(2, xOf(0) - 46) + 'px';
        mb.addEventListener('click', ev => { ev.stopPropagation(); if (FM.spine.cmd) FM.spine.cmd.muteClips(!FM.spine.muteMode()); });
        mainEl.appendChild(mb);
      }
      R.main.filter(e => e.slot).forEach(e => {   // a filled slot: its members draw in their sections; the row marks the stretch
        const s = el('div', 'sm-slot'); s.style.left = xOf(e.start) + 'px'; s.style.width = ((e.end - e.start) * p) + 'px'; mainEl.appendChild(s);
      });
      (R.undecidedIds || []).forEach(id => {   // media still arriving: drawn in place with a loading look
        const l = byId.get(id); if (!l) return;
        mainEl.appendChild(itemNode(l, R.units[id], xOf(l.start), (l.duration || 0) * p, 'sm-clip sm-loading'));
      });
      // seam chips: a gap or an overlap (never a blend, a covered gap or a hairline), ≥ 32×32, centred on the cut
      R.main.forEach((e, i) => {
        const s = e.seam;
        if (!s || (s.kind !== 'gap' && s.kind !== 'overlap') || s.covered) return;
        const prev = i > 0 ? R.main[i - 1] : null;
        const cutT = s.kind === 'gap' ? ((prev ? prev.end : 0) + e.start) / 2 : e.start + s.amt / 2;
        const chip = el('button', 'sm-chip sm-chip-' + s.kind, (s.kind === 'overlap' ? '⚠ ' : '') + s.amt.toFixed(1) + 's');
        chip.type = 'button';
        chip.style.left = xOf(cutT) + 'px';
        const words = W().a11y || {};
        const name = s.kind === 'gap' ? (words.gap ? words.gap(s.amt) : 'Gap') : (words.overlap ? words.overlap(s.amt) : 'Overlap');
        chip.setAttribute('aria-label', name); chip.title = name;
        chip.addEventListener('click', ev => { ev.stopPropagation(); if (FM.spine.cmd) FM.spine.cmd.closeSeam(e.id); });   // Phase 2: Close gap / Fix
        mainEl.appendChild(chip);
      });
      // 2.7 (DESIGN §8.2 "Transition ◇", Phase 6 "◇ at each cut"): a ◇ above every cut that is a clean join between two pictures, filled when the cut carries a
      // transition. It sits ABOVE the clip row so it never covers a trim grip; tap it to select the incoming clip and open its Transition row.
      R.main.forEach((e, i) => {
        const l = byId.get(e.id);
        if (e.slot || i < 1 || !l || !(FM.spine.joinInto && FM.spine.joinInto(R, e.id))) return;
        const pl = byId.get(R.main[i - 1].id);
        if (!pl || !(l.type === 'video' || l.type === 'image' || l.type === 'shape') || !(pl.type === 'video' || pl.type === 'image' || pl.type === 'shape')) return;
        const chip = el('button', 'sm-chip sm-chip-tr' + (l.trIn ? ' sm-chip-tr-on' : ''), '◇');
        chip.type = 'button'; chip.dataset.tr = e.id;
        chip.style.left = xOf(e.start) + 'px';
        const kind = l.trIn ? ({ crossfade: 'crossfade', dipblack: 'dip to black', dipwhite: 'dip to white' }[l.trIn.type] || '') + ' ' + l.trIn.d.toFixed(1) + ' s' : 'none';
        const name = 'Transition: ' + kind;
        chip.setAttribute('aria-label', name); chip.title = name;
        chip.addEventListener('click', ev => { ev.stopPropagation(); FM.selectLayer(e.id); if (FM.simpleTools && FM.simpleTools.openRow) FM.simpleTools.openRow('transition', e.id); });
        mainEl.appendChild(chip);
      });
      // + at the end of the clip row: pick files, laid END TO END from the end of the main track (§15.1)
      const add = el('button', 'sm-add', '+');
      add.type = 'button';
      add.setAttribute('aria-label', (W().a11y || {}).add || 'Add clips to the end'); add.title = add.getAttribute('aria-label');
      add.style.left = (xOf(R.trackEnd) + 8) + 'px';
      add.addEventListener('click', ev => { ev.stopPropagation(); FM.simpleTimeline.pickFiles(); });
      mainEl.appendChild(add);
      /* THE BLACK BAND (DESIGN §5.4, his D17 B): when something runs past the last clip the video runs on in black there.
         The band says so; a tap names what runs past, with End with the video for pictures (a song is left as it is). */
      const P0 = scene.project, past = (P0.duration || 0) - R.trackEnd;
      if (R.trackEnd > 0 && past > 1e-9 && FM.spine.overrun) {
        const o = FM.spine.overrun(R), n = o.pictures.length + o.sounds.length + o.ends.length;
        const band = el('button', 'sm-band'); band.type = 'button';
        band.style.left = (xOf(R.trackEnd) + 52) + 'px'; band.style.width = Math.max(44, past * p - 52) + 'px';   // 44: a finger's target at its narrowest (the PM's merge-day note, 7 Oct)
        const t = ((W().lines || {}).blackBand || (s => 'Black ' + s.toFixed(1) + 's'))(past, n);
        band.appendChild(el('span', 'sm-band-t', t)); band.title = t; band.setAttribute('aria-label', t);
        band.addEventListener('click', ev => { ev.stopPropagation(); FM.simpleTimeline.explainBand(); });
        mainEl.appendChild(band);
      }

      // ── sound: lane 0 drawn, a count badge where more lanes exist ──
      soundEl.textContent = '';
      const sl = R.lanes.audio || [];
      (sl[0] || []).forEach(id => {
        const l = byId.get(id); if (!l) return;
        const n = itemNode(l, R.units[id], xOf(l.start), (l.duration || 0) * p, 'sm-snd');
        if (sel.has(id)) n.classList.add('sel');
        soundEl.appendChild(n);
      });
      if (sl.length > 1) {
        const more = el('div', 'sm-more', '+' + (sl.length - 1));
        more.title = (sl.length - 1) + ' more';
        soundEl.appendChild(more);
      }
      drawGrips(byId, sel, xOf, p);   // 2.5: the selected clip's two trim grips (2.5b: and an item's: after the sound row is drawn, which an item's grips sit in)
      // selected items first for the roving tab stop (§8.10 item 3)
      const first = root.querySelector('.sm-item.sel') || mainEl.querySelector('.sm-item');
      if (first) first.tabIndex = 0;
      // the selected item's section scrolled into view inside the box (its own scrollTop, never scrollIntoView)
      const s = root.querySelector('#sm-sections .sm-item.sel');
      if (s) { const r = s.getBoundingClientRect(), b = secEl.getBoundingClientRect(); if (r.top < b.top || r.bottom > b.bottom) secEl.scrollTop += (r.top - b.top) - 4; }
      else secEl.scrollTop = secEl.scrollHeight;   // bottom-aligned: the sections nearest the clips show first
      this.updatePlayhead();
      if (FM.simpleTools && FM.simpleTools.sync) FM.simpleTools.sync();   // Phase 2.2: the tray follows what it shows
    },
    /* the black band's line: what runs past, by name; End with the video when a picture does */
    explainBand() {
      const L = W().lines || {}, R0 = R || FM.spine.read(FM.scene), o = FM.spine.overrun(R0), P = FM.scene.project;
      const past = l => (+l.start || 0) + (+l.duration || 0) - R0.trackEnd;
      const all = o.pictures.concat(o.ends, o.sounds);
      if (!all.length) return;
      let text;
      if (all.length === 1) { const l = all[0]; text = (o.sounds.length ? L.songRuns : L.runsPast)(FM.spine.itemWord(l, R0), past(l)); if (o.ends.length) text += ' · ' + L.keptEnd; }
      else text = L.morePast(all.length);
      sayLine(text, { buttons: o.pictures.length ? [{ label: L.endWith || 'End with the video', fn: () => FM.spine.cmd.endWithVideo() }] : [] });
    },
    updatePlayhead() {
      if (!scroller) return;
      const target = Math.max(0, (FM.time || 0) * pps());
      if (userScrollAt && performance.now() - userScrollAt < 150) return;   // a finger owns the strip mid-swipe
      if (Math.abs(scroller.scrollLeft - target) > 0.5) scroller.scrollLeft = target;
      lastProg = scroller.scrollLeft;
    },
    /* The phone sheet docks UNDER #sm-say in Simple (§14.2 mobile row, T19): the sections, the clips, the sound row and any
       line Simple is saying all stay in view, and none of them moves when the sheet appears. */
    dockBottom() { const e = sayEl || mainEl; return e ? e.getBoundingClientRect().bottom : 0; },
    /* Phase 2.2: the + is Append (§3.6): one step that lays the clips end to end BEFORE an end card, which moves along.
       `given` lets the suite hand it files (a picker cannot be driven). */
    pickFiles(given) {
      if (given && given.length) return FM.spine.cmd.append(Array.from(given));
      const inp = el('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'video/*,image/*,audio/*';
      inp.addEventListener('change', () => { const files = Array.from(inp.files || []); if (files.length) FM.spine.cmd.append(files); });
      inp.click();
    },
    xOf(t) { return origin() + t * pps(); },   // #sm-inner coordinates, for the suite's x-invariance check
    /* 2.3: THE SPEED SLIDER'S PREVIEW. While the thumb moves, only the clip row's boxes and the element's playback rate change — the
       scene is untouched (the commit on release is the one history step). The clip's box stretches, everything after it slides by the
       difference; `sp == null` puts every box back and the rate right. */
    previewSpeed(id, sp) {
      if (!mainEl) return;
      const nodes = Array.from(mainEl.children), m = FM.media && FM.media.get(id), L = FM.layerById(FM.scene, id);
      nodes.forEach(n => { if (n.dataset.l0 != null) { n.style.left = n.dataset.l0; n.style.width = n.dataset.w0; delete n.dataset.l0; delete n.dataset.w0; } });
      const rate = v => { if (m && m.el) { try { m.el.playbackRate = Math.min(16, Math.max(0.0625, v || 1)); } catch (e) {} } };
      if (sp == null || !L || !R) { if (L) rate(FM.speedAt(L, FM.time)); return; }
      const k = FM.speedAt(L, +L.start || 0) / sp, dx = (+L.duration || 0) * (k - 1) * pps();   // a clip's length goes as old speed / new speed
      const hit = mainEl.querySelector('.sm-item[data-id="' + id + '"]'); if (!hit) return;
      const x0 = parseFloat(hit.style.left);
      nodes.forEach(n => {
        const l = parseFloat(n.style.left); if (!isFinite(l)) return;
        if (n === hit) { n.dataset.l0 = n.style.left; n.dataset.w0 = n.style.width; n.style.width = Math.max(4, parseFloat(n.style.width) * k) + 'px'; }
        else if (l > x0 + 1e-6 && !n.classList.contains('sm-mute')) { n.dataset.l0 = n.style.left; n.dataset.w0 = n.style.width; n.style.left = (l + dx) + 'px'; }
      });
      rate(sp);
    },
    read: () => R,
    abortGestures: abortGestures,
    /* presence's feed (§3.8): which arrange gesture is live, for the stale-gesture recovery now and `act: 'arrange'` from Phase 4 */
    gesture() { return G && G.phase === 'drag' ? { k: G.kind === 'trim' ? 'trim' : 'move', ids: [G.id] } : null; },
    _tick: tick, _g() { return G; },
    clearSay: clearSay,   // Phase 2.2: a selection change dismisses a line (§3.12 rule 1b)
    _say: sayLine
  };
  if (FM.spine && FM.spine._setSink) FM.spine._setSink(sayLine);
})(window.FM);
