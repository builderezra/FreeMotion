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
    const tx = el('span', 'sm-say-t', text); tx.title = text; ln.appendChild(tx);
    const btns = (opts.buttons || []).slice(0, 2);
    if (opts.full && !btns.length) btns.push({ label: (W().lines || {}).openFull || 'Open in Full', fn: () => { if (FM.editor) FM.editor.request('full', { hop: true }); } });   // a hop: the guard, no memory (R1)
    const t0 = performance.now(); let up = !ptrDown;
    if (!up) document.addEventListener('pointerup', () => { up = true; }, { once: true, capture: true });
    const armed = () => up && performance.now() - t0 >= 400;
    btns.forEach(bd => {
      const b = el('button', 'sm-say-b', bd.label); b.type = 'button'; b.setAttribute('aria-disabled', 'true');
      b.addEventListener('pointerdown', ev => { if (!armed()) { ev.preventDefault(); ev.stopPropagation(); } });
      b.addEventListener('click', ev => { ev.stopPropagation(); if (!armed()) { ev.preventDefault(); return; } clearSay(); try { bd.fn(); } catch (e) {} });
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

  FM.simpleTimeline = {
    rebuild() {
      if (!ensureDom() || !FM.spine || !FM.scene) return;
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
        mainEl.appendChild(n);
      });
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
    read: () => R,
    clearSay: clearSay,   // Phase 2.2: a selection change dismisses a line (§3.12 rule 1b)
    _say: sayLine
  };
  if (FM.spine && FM.spine._setSink) FM.spine._setSink(sayLine);
})(window.FM);
