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
  let userScrollAt = 0, scrollSettle = 0;   // user-scroll grace window: while swiping, the finger owns scrollLeft
  const TRIM_EDGE = 46;     // px from a viewport edge that triggers auto-scroll while trimming
  let trimScrollRAF = 0;
  /* The same thing for dragging a clip BODY (queue 115). Ezra: "when dragging a layer and you get to
   * the end of the screen, make it so the screen moves so you can keep dragging… like how we have the
   * selecting multiple layers tool." Separate handle from the trim one because both can never be live
   * at once but sharing a variable would silently couple two loops that stop for different reasons.
   * CLIP_SCROLL_MAX is a structural brake, not a tuning knob — see clipEdgeScroll. */
  let clipScrollRAF = 0;
  const CLIP_SCROLL_MAX = 1200;   // ~20s of continuous edge-hold at 60fps; a real drag never reaches it
  function isPhone() { return window.matchMedia('(max-width: 700px)').matches; }
  /* WHO THE PLAYHEAD BUTTONS ACT ON (queue 169). The floating nudge pair and trim/split trio used to
   * read FM.selectedLayer — the PRIMARY layer — so with three clips selected they showed themselves
   * over the playhead and then quietly edited one of the three. The inspector carried a second,
   * selection-aware copy of the same six buttons, which is the duplication Ezra asked to end: "get rid
   * of the buttons that are near the play head". Deleting the inspector copies is only safe once these
   * mean the same thing, so they read the selection now. With one clip selected the set is [that clip]
   * and every path below is the one that already shipped. */
  function clipToolTargets() {
    const ids = FM.selectionIds ? FM.selectionIds() : (FM.scene.selectedId ? [FM.scene.selectedId] : []);
    return ids.map(id => FM.layerById(FM.scene, id)).filter(Boolean);
  }
  /* 0 = the playhead is inside at least one selected clip, so trim and split can do something.
   * ±1 = it is off every one of them, and the sign says which way the block has to travel.
   * null/0-length = nothing selected. For a single clip this is exactly FM.clipPlayheadSide. */
  function clipToolSide(layers) {
    if (!layers || !layers.length || !FM.clipPlayheadSide) return 0;
    if (layers.some(l => FM.clipPlayheadSide(l) === 0)) return 0;
    const lastEnd = Math.max.apply(null, layers.map(l => l.start + l.duration));
    return FM.time >= lastEnd ? 1 : -1;
  }
  function fps() { return FM.scene.project.fps || 30; }
  function snapT(t) { const f = fps(); return Math.round(t * f) / f; }
  // The current time sits at TRUE SCREEN CENTRE (v4.97). Ezra: "i meant i want the play head and
  // button centred to the screen not the timeline."
  //
  // The complication is that the line and the content live in different coordinate spaces.
  // #tl-centerline is absolutely positioned inside #timeline-panel, and the content's x is also
  // measured from that panel — but in Studio the panel starts after the left rail and the inspector,
  // so "half the viewport" from the panel's edge is NOT half the viewport from the screen's. Neither
  // the original `innerWidth/2` (which landed at panelLeft + innerWidth/2 = 1126px on a 1440 screen)
  // nor v4.96's panel-centre (923px) was screen centre (720px).
  //
  // So panelLeft is measured once here and published as --tl-panel-left. CSS subtracts it from 50vw
  // for the line, and the same number is subtracted here for the content — one measurement, two
  // consumers, so they cannot drift apart. It is written on every recompute (init, rebuild, resize,
  // and the ResizeObserver below that catches a layout switch), never per frame during a drag: the
  // iOS URL-bar drift this file warns about came from per-frame rect reads, not from this.
  //
  // …and it is measured in the editor's OWN LAYOUT, with any ancestor transform taken back out.
  // getBoundingClientRect() reports where a box is PAINTED, and the project-open push (js/home.js)
  // makes #app position:fixed and slides it a whole viewport across the screen for PUSH_MS. Any
  // recompute landing inside that window used to store the TRANSLATED edge — and one reliably does:
  // the deferred filmstrip build below (`FM.buildClipStrip(m, 8).then(… rebuild())`) resolves a
  // couple of ms AFTER the push starts, so opening any project holding an image or video clip
  // stored `--tl-panel-left: 390px` on a 390px phone. The line is pinned at
  // calc(50vw - var(--tl-panel-left)) = 195 - 390 = -195px, i.e. a full half-screen off the left
  // edge, and nothing recomputes again once the push ends — so the playhead is simply GONE for the
  // rest of the session and only a restart brings it back. Measured on v5.93 at 390x844: 12 of 12
  // cold opens of a one-image project, 8 of 8 with four images, 0 of 8 with no media at all (no
  // media, no deferred strip, no rebuild inside the window) — which is exactly why it reads as
  // intermittent from the outside.
  //
  // Both consumers of this number — the line and the clip content — live INSIDE that transform and
  // ride it, so the transform is precisely the part that must not be counted. Subtracting it makes
  // the measurement correct at EVERY instant of the animation instead of only after it: no timer,
  // no setTimeout tuned against PUSH_MS, nothing to race. Verified against the truth (the at-rest
  // value) on every frame of a real push: raw rect drifted 0 → 1440px, this drifted 0.00px, in
  // classic and in Studio (where the honest answer is 405.59px, not 0).
  function panelLeft() {
    const p = document.getElementById('timeline-panel');
    if (!p) return 0;
    let L = p.getBoundingClientRect().left;
    for (let n = p; n && n !== document.documentElement; n = n.parentElement) {
      const t = getComputedStyle(n).transform;
      if (t && t !== 'none') L -= translateX(t);
    }
    return L;
  }
  // translateX out of a computed `transform`. Every transform this app ever puts on an ancestor of
  // the timeline is a pure translate3d — the four project-open/close keyframes (fm-push-in,
  // fm-push-out, fm-pop-in, fm-pop-out) and nothing else — so the x offset is the matrix's e/m41
  // component. Falls back to parsing the string where DOMMatrixReadOnly is missing, and to 0 (i.e.
  // today's raw behaviour) if it cannot tell, because a wrong guess here moves the playhead.
  function translateX(t) {
    try { if (window.DOMMatrixReadOnly) return new DOMMatrixReadOnly(t).m41 || 0; } catch (e) {}
    const m3 = /matrix3d\(([^)]+)\)/.exec(t);
    if (m3) return parseFloat(m3[1].split(',')[12]) || 0;
    const m2 = /matrix\(([^)]+)\)/.exec(t);
    if (m2) return parseFloat(m2[1].split(',')[4]) || 0;
    return 0;
  }
  /* HOW WIDE THE TRACK-HEAD COLUMN ACTUALLY IS.
   *
   * Every clip's x, the scrub mapping and PAD are all built on this number, and t=0 is supposed to land
   * exactly under the fixed centre line. It was read as
   *     getComputedStyle(document.body).getPropertyValue('--head-w')
   * in three places — and since v8.55 that has been the WRONG ELEMENT. The narrow head is declared as
   *     #tl-inner.tl-no-groups { --head-w: 72px; }   (it was on #tl-tracks — see the note at buildTracks)
   * and a custom property cascades DOWN, never up, so body kept reporting the :root value of 90 while
   * the column rendered at 72. A project with no groups — which is most projects — therefore drew every
   * clip 18px to the LEFT of the time the playhead said it was at, in every project, in every session,
   * and a refresh could not help because nothing was wrong with the saved file. That is exactly what he
   * reported: "the timeline is actually broken and is starting early … every project is broken the same
   * way … refreshing page didn't fix".
   *
   * So it MEASURES the column that really rendered rather than reading a constant off some element and
   * hoping the two agree. A future rule can move the variable anywhere it likes; the geometry cannot
   * drift from the layout again, because it is now taken FROM the layout. The variable is only the
   * fallback for the first call, before any head exists to measure. */
  function readHeadW() {
    const hs = document.querySelector('#tl-tracks .tl-headspace') || document.querySelector('#tl-tracks .track-head');
    if (hs) { const w = hs.getBoundingClientRect().width; if (w > 1) return Math.round(w); }
    const src = document.getElementById('tl-tracks') || document.body;
    return parseInt(getComputedStyle(src).getPropertyValue('--head-w'), 10) || HEAD_W;
  }
  FM._tlHeadW = readHeadW;   // suite seam: the measured column, to check against the clip geometry
  function recomputePad() {
    const L = panelLeft();
    document.documentElement.style.setProperty('--tl-panel-left', L + 'px');
    PAD = Math.max(0, window.innerWidth / 2 - L - HEAD_W);
  }
  // NOTE: #tl-centerline is pinned ENTIRELY in CSS (left: 50vw). JS never positions it, so it
  // physically cannot move — reading getBoundingClientRect per-frame was what let it drift on real
  // iOS (URL-bar collapse shifts the viewport mid-drag). JS only scrolls the content under the line.
  function showSnap(t) { if (snaplineEl) { snaplineEl.style.left = (HEAD_W + PAD + t * pxPerSec()) + 'px'; snaplineEl.classList.remove('hidden'); } }
  function hideSnap() { if (snaplineEl) snaplineEl.classList.add('hidden'); }
  let dragging = false;
  let kfDrag = null;
  // Press-and-hold before a keyframe becomes draggable. Was 600ms ("hold on it for a second"), which
  // in the hand felt like waiting rather than deciding; 320ms still can't be hit by a tap or by the
  // start of a timeline scrub (both move within ~100ms) but stops the deliberate press from dragging.
  const KF_HOLD_MS = 320;
  let trimDrag = null;
  let clipMove = null;   // dragging a clip body to reposition it in time

  let slipDrag = null;   // SLIP: sliding the media inside a clip while its timeline position stays put
  let cueDrag = null;    // moving / trimming one CAPTION CUE inside its track's clip
  let lpFiredAt = 0;     // when a header long-press fired — suppresses the trailing click/contextmenu
  let clipTap = null;    // touch: pending gesture on a clip (tap=select, drag=scrub, long-press=move)
  let snapping = true;   // magnet toggle: snap clip/trim edges to playhead / clip edges / 0
  let rebuildPending = false;      // a rebuild requested mid-gesture — deferred to the gesture's end
  let reorderActive = false;       // a ≡ reorder drag is in flight (its listeners live on the captured handle — a rebuild would kill it)
  /* ONE answer to "what colour is this clip", because queue 416 gives the add-row switch that colour while
     you drag a layer — and a second copy of this expression would be the switch and the clip disagreeing
     about which layer you are holding. */
  function clipColorOf(layer) {
    return (layer.clipColorSet && layer.clipColor) || shapeClipColor(layer) || layer.clipColor || '#3a5a8c';
  }
  FM._clipColorOf = clipColorOf;
  const stripCache = new Map();    // layerId -> {key, canvas}: rendered filmstrip/waveform reuse across rebuilds
  const EASE_LABELS = { linear: 'Linear', easeIn: 'Ease In', easeOut: 'Ease Out', easeInOut: 'Ease In-Out', overshoot: 'Overshoot', anticipate: 'Anticipate' };

  // Abandon any in-flight clip/trim/keyframe gesture and RESTORE its pre-gesture values. Pinch-start
  // and pointercancel must never leave a half-applied edit in the scene (a moved clip whose keyframes
  // never followed, a half-trim, a mid-drag keyframe time) — that state would ride silently into the
  // next history.commit and autosave.
  function abortGestures() {
    const had = clipMove || trimDrag || kfDrag || slipDrag || cueDrag;
    if (cueDrag) { cueDrag.cue.start = cueDrag.s0; cueDrag.cue.end = cueDrag.e0; cueDrag = null; }
    if (slipDrag) { slipDrag.layer.trimStart = slipDrag.trim0; endSlipGhost(slipDrag); slipDrag = null; }
    if (clipMove) {
      clipMove.layer.start = clipMove.origStart;
      (clipMove.group || []).forEach(g => { g.layer.start = g.origStart; });
      // Before clipMove is nulled — the restore reads the width it borrowed off the gesture. (queue 115)
      endClipEdgeScroll();
      clipMove = null;
      FM._sheetSuppressFor = null;   // the gesture is over by every route, not only the tidy one (queue 433)
    }
    if (trimDrag) {
      const L = trimDrag.layer;
      L.start = trimDrag.start; L.duration = trimDrag.dur;
      if (L.type === 'video') L.trimStart = trimDrag.trim;
      trimDrag = null;
    }
    if (kfDrag) {
      if (kfDrag.orig) kfDrag.kfs.forEach((k, i) => { k.t = kfDrag.orig[i]; });
      if (kfDrag.holdTimer) clearTimeout(kfDrag.holdTimer);
      if (kfDrag.armTimer) clearTimeout(kfDrag.armTimer);   // a stale arm timer would colour a dead diamond
      if (kfDrag.dot) kfDrag.dot.classList.remove('kf-dragging');
      kfDrag = null;
    }
    if (clipTap) { if (clipTap.holdTimer) clearTimeout(clipTap.holdTimer); clipTap = null; }   // orphaned hold timer could grab the WRONG clip later
    if (had) { hideSnap(); FM.timeline.rebuild(); FM.requestRender(); }
  }

  // Snap a proposed clip start so the clip's start OR end lands on 0 / playhead / another clip edge.
  // Returns { v: snapped start, snapped: bool, guide: alignment time for the guide line }.
  function snapStart(layer, ns, pps, excl, sup) {
    if (!snapping) return { v: ns, snapped: false, guide: 0 };   // clip start may go NEGATIVE (AM: drag past 0); floor applied by the caller
    const snapPx = 7, dur = layer.duration;   // 7 SCREEN px — the time radius scales with zoom automatically (7/pps seconds)
    const starts = [0, FM.time], ends = [FM.time];
    // sup: targets this clip was ALREADY sitting on when the drag began — the user just snapped
    // there and is dragging again, so re-offering the same magnet would fight the nudge (Ezra)
    const supHit = (c) => sup && sup.some(sv => Math.abs(sv - c) < 1e-3);
    // excl: every layer riding in the SAME drag — a co-dragged clip's edge is a moving target that
    // feeds back through the group-delta and ratchets the whole selection along in snap-sized steps
    FM.scene.layers.forEach(l => { if (l.id !== layer.id && !(excl && excl[l.id])) { starts.push(l.start, l.start + l.duration); ends.push(l.start, l.start + l.duration); } });
    (FM.scene.project.markers || []).forEach(mk => { starts.push(mk.t); ends.push(mk.t); });
    let best = ns, bestD = snapPx / pps, snapped = false, guide = 0;
    starts.forEach(c => { if (supHit(c)) return; if (Math.abs(ns - c) < bestD) { bestD = Math.abs(ns - c); best = c; snapped = true; guide = c; } });
    ends.forEach(c => { if (supHit(c)) return; const s = c - dur; if (s >= 0 && Math.abs(ns - s) < bestD) { bestD = Math.abs(ns - s); best = s; snapped = true; guide = c; } });
    return { v: best, snapped: snapped, guide: guide };   // may be negative (start before 0); caller floors it
  }
  // The snap targets a clip currently SITS on (drag-start inventory for the suppression above).
  function snappedTargetsOf(layer) {
    const eps = 1e-3, out = [], s0 = layer.start, e0 = layer.start + layer.duration;
    const cands = [0, FM.time];
    FM.scene.layers.forEach(l => { if (l.id !== layer.id) cands.push(l.start, l.start + l.duration); });
    (FM.scene.project.markers || []).forEach(mk => cands.push(mk.t));
    cands.forEach(c => { if (Math.abs(c - s0) < eps || Math.abs(c - e0) < eps) out.push(c); });
    return out;
  }

  // Snap a single edge time (a trim grip) to 0 / playhead / another clip's edge.
  function snapEdge(layer, edge, pps, sup) {
    if (!snapping) return { snapped: false, guide: edge };
    const snapPx = 7, cands = [0, FM.time];
    const supHit = (c) => sup && sup.some(sv => Math.abs(sv - c) < 1e-3);
    FM.scene.layers.forEach(l => { if (l.id !== layer.id) cands.push(l.start, l.start + l.duration); });
    (FM.scene.project.markers || []).forEach(mk => cands.push(mk.t));
    let best = edge, bestD = snapPx / pps, snapped = false;
    cands.forEach(c => { if (supHit(c)) return; if (Math.abs(edge - c) < bestD) { bestD = Math.abs(edge - c); best = c; snapped = true; } });
    return { snapped: snapped, guide: best };
  }

  // `only` (optional) restricts the delete to ONE property container. Without it this strips every
  // keyframe at `tt` across the whole layer — which was right when diamonds were merged, but wrong
  // now that each property owns its own: deleting a visible keyframe also silently destroyed the
  // dimmed ones sitting behind it at the same time, on properties you weren't even looking at.
  /* EVERY keyframable slot on a layer, as (container, key) with a stable string ADDRESS.
     ONE list, because there used to be TWO and they drifted. The timeline draws a diamond for every
     container FM.animatedProps knows — which includes trim-path, the repeater, the dash offset, mask
     paths and audio-effect params — while delete and copy each kept their own, shorter, hand-written
     list. Those diamonds could therefore be neither deleted nor copied: double-clicking one did
     nothing at all and pushed an empty undo step, and Copy returned zero entries so the Paste item
     never even appeared. Delete was patched by hand at some point; copy never was, which is exactly
     the drift a second list guarantees. Both read this now, so a slot that can draw a diamond can
     always be deleted and copied.
     It lists every slot whether animated or not, deliberately: paste has to resolve an address on a
     TARGET layer where the property is still static. */
  function keyframeSlots(layer) {
    const out = [];
    const add = (c, k, addr, fx) => { if (c) out.push({ c: c, k: k, addr: addr, fx: fx || null }); };
    Object.keys(layer.transform).forEach(k => add(layer.transform, k, 'transform.' + k));
    add(layer, 'volume', 'volume'); add(layer, 'speed', 'speed');
    add(layer, 'fill', 'fill'); add(layer, 'color', 'color');
    if (layer.fillGradient) ['ox', 'oy'].forEach(k => add(layer.fillGradient, k, 'fillGradient.' + k));
    ['fillImgX', 'fillImgY'].forEach(k => add(layer, k, k));
    if (layer.stroke) ['width', 'color'].forEach(k => add(layer.stroke, k, 'stroke.' + k));
    if (layer.crop) ['x', 'y', 'w', 'h'].forEach(k => add(layer.crop, k, 'crop.' + k));
    if (layer.shadow) ['blur', 'dx', 'dy', 'alpha', 'color'].forEach(k => add(layer.shadow, k, 'shadow.' + k));
    if (layer.trimPath) ['start', 'end', 'offset'].forEach(k => add(layer.trimPath, k, 'trimPath.' + k));
    if (layer.stroke && layer.stroke.dash) add(layer.stroke.dash, 'offset', 'dash.offset');
    if (layer.repeater) ['copies', 'offsetX', 'offsetY', 'rotation', 'scale', 'opacity'].forEach(k => add(layer.repeater, k, 'repeater.' + k));
    (layer.masks || []).forEach((m, i) => { if (m) add(m, 'path', 'mask.' + i + '.path'); });
    FM.eachFx(layer, (fx, path) => { if (fx.params) Object.keys(fx.params).forEach(k => add(fx.params, k, FM.fxAddr(path, k, 'effect', '.'), fx)); });
    (layer.audioFx || []).forEach((fx, i) => { if (fx && fx.params) Object.keys(fx.params).forEach(k => add(fx.params, k, 'audiofx.' + i + '.' + k, fx)); });
    return out;
  }
  FM._keyframeSlots = keyframeSlots;   // suite hook: the two lists must not drift again

  function deleteKeyframesAt(layer, tt, only) {
    const slots = keyframeSlots(layer);
    slots.forEach(({ c, k }) => {
      const p = c[k];
      if (!FM.isAnimated(p)) return;
      if (only && p !== only) return;   // scoped delete: leave every other property alone
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
    foundType = null;
    const hit = keyframeSlots(layer).filter(sl => sl.c[sl.k] === p)[0];
    if (!hit) return null;
    if (hit.fx && hit.fx.type) foundType = hit.fx.type;   // so paste can refuse a different effect
    return hit.addr;
  }
  /* The TYPE of the effect the last propKey() resolved into, or null. An effect keyframe's address is
     positional — "the Nth effect's `amount`" — which is fine within one layer and meaningless across
     two. Copy is an advertised cross-layer feature, so the type has to travel with the key. */
  let foundType = null;
  function lastFxType() { const v = foundType; foundType = null; return v; }
  function resolveSlot(layer, key) {
    const hit = keyframeSlots(layer).filter(sl => sl.addr === key)[0];
    return hit ? { c: hit.c, k: hit.k, fx: hit.fx } : null;   // null: the target lacks this slot → paste skips it
  }
  function copyKfAt(layer, tt) {
    FM.kfClipboard = [];
    FM.animatedProps(layer).forEach(p => {
      const k = p.kf.find(kf => Math.abs(kf.t - tt) < 1e-3);
      if (k) {
        const key = propKey(layer, p);
        if (key) {
          const en = { key: key, v: Array.isArray(k.v) ? JSON.parse(JSON.stringify(k.v)) : k.v, e: k.e, bez: k.bez ? k.bez.slice() : null };
          const ft = lastFxType(); if (ft) en.fxType = ft;   // so paste can refuse a different effect
          // spatial motion-path tangents ride along — dropping them turned a smoothed keyframe into a kink on paste
          if (typeof k.ti === 'number' && isFinite(k.ti)) en.ti = k.ti;
          if (typeof k.to === 'number' && isFinite(k.to)) en.to = k.to;
          FM.kfClipboard.push(en);
        }
      }
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
      /* AN EFFECT ADDRESS IS POSITIONAL, so "the 1st effect's amount" copied from a Twirl lands on
         whatever the target's 1st effect happens to be. Dozens of effects share the name `amount` with
         wildly different ranges — Twirl is -360..360, Grayscale is 0..1 — so pasting a Twirl keyframe
         of 140 onto a Grayscale silently drove it to fully desaturated and committed it. Worse, if the
         target effect had no such parameter at all, the line below INVENTED one and serialised the
         junk into the project, while the user saw no keyframe appear and no error. */
      if (en.fxType && (!slot.fx || slot.fx.type !== en.fxType)) return;   // a different effect entirely
      if (slot.fx && !(slot.k in slot.c)) return;         // this effect does not have that parameter
      let p = slot.c[slot.k];
      if (!FM.isAnimated(p)) { p = { kf: [] }; slot.c[slot.k] = p; }   // create container if static/missing
      const hit = p.kf.find(k => Math.abs(k.t - t) < 1e-3);
      const vv = Array.isArray(en.v) ? JSON.parse(JSON.stringify(en.v)) : en.v;
      // tangents overwrite-or-clear on the hit branch too — keeping the target's stale ti/to applied the OLD curve shape to the new value
      if (hit) {
        hit.v = vv; hit.e = en.e; if (en.bez) hit.bez = en.bez.slice(); else delete hit.bez;
        if (en.ti != null) hit.ti = en.ti; else delete hit.ti;
        if (en.to != null) hit.to = en.to; else delete hit.to;
      } else {
        const nk = { t: t, v: vv, e: en.e };
        if (en.bez) nk.bez = en.bez.slice();
        if (en.ti != null) nk.ti = en.ti;
        if (en.to != null) nk.to = en.to;
        p.kf.push(nk); p.kf.sort((a, b) => a.t - b.t);
      }
    });
    FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit();
  }
  FM.pasteKfAtPlayhead = pasteKfAtPlayhead;   // the layer ≡/⋯ menu needs it: a layer with NO keyframes has no diamond to long-press
  // …and its other half, exposed for the same reason deleteKeyframesAt is: the suite has to be able to
  // prove copy/paste addresses the slot it actually meant, without faking a long-press on a diamond.
  FM.copyKfAt = copyKfAt;

  function shade(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    const f = pct / 100;
    const ch = (v) => Math.round(Math.max(0, Math.min(255, v + 255 * f)));
    const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---- shape clips wear the shape's own colour ---- */
  // Only #rgb / #rrggbb / #rrggbbaa parse; anything else (rgb(), a named colour) returns null and
  // the caller falls back to the assigned palette colour.
  function hexToHsl(v) {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(v || '').trim());
    if (!m) return null;
    let h6 = m[1];
    if (h6.length === 3) h6 = h6[0] + h6[0] + h6[1] + h6[1] + h6[2] + h6[2];
    else if (h6.length === 8) h6 = h6.slice(0, 6);          // drop the alpha — the bar is always opaque
    const n = parseInt(h6, 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    let hue = 0, sat = 0;
    if (d > 0) {
      sat = d / (1 - Math.abs(2 * l - 1));
      hue = 60 * (mx === r ? (((g - b) / d) % 6) : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4));
      if (hue < 0) hue += 360;
    }
    return { h: hue, s: sat, l: l };
  }
  function hslToHex(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    const hx = v => Math.round(Math.max(0, Math.min(1, v + m)) * 255).toString(16).padStart(2, '0');
    return '#' + hx(r) + hx(g) + hx(b);
  }

  // WCAG relative luminance. HSL lightness is NOT perceptual: yellow at l=0.44 is roughly three
  // times as bright as blue at the same l, so clamping l alone leaves a yellow bar unreadable under
  // the white clip label. Contrast has to be measured, not assumed.
  function relLum(hex) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  }

  // A shape layer's clip is tinted with that shape's own fill so a track reads at a glance.
  // The first cut forced every bar dark enough for a WHITE label, which is fine for blues and reds
  // and turns yellow into olive mud (Ezra: "the colours are kinda ugly"). A bar can't carry a hue
  // faithfully and be guaranteed dark at the same time — so the bar keeps the colour and the LABEL
  // adapts instead (see labelInkFor). Lightness is still bounded, but only to keep the track
  // coherent: nothing washes out to near-white or sinks to near-black.
  // A grey/white shape has no hue to keep, so it stays neutral rather than being handed a red.
  // Fill is read at the clip's OWN start, not the playhead, so an animated fill doesn't make the bar
  // shimmer while you scrub. Keyframe times are absolute project seconds.
  function shapeClipColor(layer) {
    if (!layer || layer.type !== 'shape') return null;
    const t0 = layer.start || 0;
    const mode = FM.fillModeOf ? FM.fillModeOf(layer) : 'solid';
    let src = null;
    if (mode === 'gradient' && layer.fillGradient) src = layer.fillGradient.c0;
    else if (mode === 'none' || mode === 'media') src = (layer.stroke && layer.stroke.enabled) ? layer.stroke.color : null;
    if (!src) src = FM.evalProp(layer.fill, t0);            // outline-only / media shapes still carry a fill underneath
    const c = hexToHsl(src);
    if (!c) return null;
    const s = c.s < 0.08 ? c.s : Math.max(0.45, Math.min(0.82, c.s));   // stay saturated — a desaturated bar is the muddy one
    return hslToHex(c.h, s, Math.max(0.36, Math.min(0.58, c.l)));
  }

  // Which ink the clip's name should use on a given bar — the reason the bar no longer has to be
  // darkened to suit a fixed white. Bright bars (yellow, lime, cyan) take dark text, dark bars take
  // white, and the two are compared rather than split on a threshold: hues that sit in the middle
  // (a hot pink, a mid orange) are close either way, and a fixed cutoff hands those the worse of
  // the two. Measured against the MIDDLE of the bar's gradient, which is where the label actually
  // sits — it is vertically centred, not against the lightest or darkest edge.
  const INK_DARK = { color: '#0b1016', shadow: '0 1px 1px rgba(255,255,255,.45)' };
  const INK_LIGHT = { color: '#ffffff', shadow: '0 1px 2px rgba(0,0,0,.9), 0 0 3px rgba(0,0,0,.65)' };
  function labelInkFor(hex) {
    const mid = /^#[0-9a-f]{6}$/i.test(hex) ? shade(hex, -6) : '#3a5a8c';   // the gradient runs +8 → -20
    const L = relLum(mid);
    const vsLight = 1.05 / (L + 0.05);
    const vsDark = (L + 0.05) / (relLum(INK_DARK.color) + 0.05);
    return vsDark > vsLight ? INK_DARK : INK_LIGHT;
  }

  // Which slice of the SOURCE file a clip actually plays, as fractions of the whole file. A trimmed
  // clip used to draw the ENTIRE song inside its bar, so the peaks under the playhead were not the
  // audio you were hearing. Anything unknown — no source duration, a speed ramp that reports nothing
  // finite — falls back to the whole file, i.e. the old behaviour, never to an empty strip.
  function waveWindow(m, layer, srcSpan) {
    const out = { a: 0, b: 1, reversed: !!layer.reversed };
    const D = m && m.duration;
    if (!isFinite(D) || D <= 0 || !isFinite(srcSpan) || srcSpan <= 0) return out;
    const t0 = Math.max(0, Math.min(D, layer.trimStart || 0));
    const t1 = Math.max(t0, Math.min(D, t0 + srcSpan));
    if (t1 - t0 < 1e-6) return out;
    out.a = t0 / D; out.b = t1 / D;
    return out;
  }

  // Bar pitch in BACKING pixels. 1.25 is what a clip has always drawn at (600 peaks across a 10 s
  // clip's 750 px bar at zoom 1) — chosen so short clips look byte-for-byte as they did.
  const WAVE_BAR_PITCH = 1.25;

  // The clip waveform. `win` is the source-time window from waveWindow (optional; omitted = whole
  // file). `cssW` is the width the canvas is DISPLAYED at, which is not its backing width — see below.
  //
  // Bars come from the CANVAS WIDTH, not from the peak count, and each bar is the MAX of every peak
  // inside it. That aggregation is the half of the gap fix that lives here. Peaks now arrive at a
  // fixed rate per second, so a 5-minute song hands this thousands of them; drawing one bar per peak
  // would overdraw them into a solid slab in a 380 px phone lane. Taking a max over a contiguous run
  // instead keeps the envelope honest at every zoom — and since a max can only read too HIGH, this
  // step can never invent a hole, which is exactly what the old decimated sampling did.
  //
  // The gap between bars is capped in SCREEN pixels rather than left at a flat 30% of the pitch. The
  // backing buffer is clamped to 8192 px (iOS renders wider canvases blank) while the CSS width is
  // not, so a 5-minute clip is stretched 2.33x at zoom 1 and 7x at zoom 3 — and the stretch applies
  // to the gaps as much as the bars. A 30% gap became 9.3, then 28, CSS pixels of genuine blank: a
  // comb, on screen, in a song with no silence in it. Dividing the cap by the stretch keeps the gap
  // at most ~1.5 px of the timeline the eye actually sees, at any zoom and any clip length.
  function drawWaveform(canvas, peaks, win, cssW) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const total = peaks ? peaks.length : 0;
    if (!total || !(W >= 1) || !(H >= 1)) return;
    let a = (win && isFinite(win.a)) ? Math.max(0, Math.min(1, win.a)) : 0;
    let b = (win && isFinite(win.b)) ? Math.max(0, Math.min(1, win.b)) : 1;
    if (!(b > a)) { a = 0; b = 1; }
    const i0 = Math.min(total - 1, Math.floor(a * total));
    const i1 = Math.max(i0 + 1, Math.min(total, Math.ceil(b * total)));
    const span = i1 - i0;
    const bars = Math.max(1, Math.min(span, Math.round(W / WAVE_BAR_PITCH)));
    const bw = W / bars;
    const stretch = (isFinite(cssW) && cssW > 0) ? Math.max(1, cssW / W) : 1;
    const barW = Math.max(0.6, bw - Math.min(bw * 0.3, 1.5 / stretch));
    const rev = !!(win && win.reversed);   // a reversed clip plays that same source window backwards
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    for (let i = 0; i < bars; i++) {
      const s = i0 + Math.floor(i * span / bars);
      const e = (i === bars - 1) ? i1 : Math.max(s + 1, i0 + Math.floor((i + 1) * span / bars));
      let mx = 0;
      for (let j = s; j < e; j++) { const v = peaks[j]; if (v > mx) mx = v; }
      const h = Math.max(1, mx * H * 0.9);
      ctx.fillRect(rev ? W - (i + 1) * bw : i * bw, (H - h) / 2, barW, h);
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

  // ---- SLIP ghost (premium slip): while sliding the media inside a clip, the WHOLE source shows
  // on that row — dimmed monochrome outside the clip, full colour inside the fixed clip window —
  // so you can see exactly how much footage remains on each side and watch the film slide under
  // the window. Time-accurate: each strip frame sits at its true source-time slot.
  function beginSlipGhost(sd, clipEl) {
    const m = sd.m;
    const lane = clipEl.parentNode; if (!lane) return;
    const srcW = Math.max(8, Math.round((m.duration / sd.rate) * sd.pps));
    const bw = Math.min(8192, srcW), H = 32;   // same iOS backing-width cap as the clip filmstrips
    const cv = document.createElement('canvas');
    cv.className = 'slip-ghost';
    cv.width = bw; cv.height = H;
    cv.style.width = srcW + 'px'; cv.style.height = H + 'px';
    lane.appendChild(cv);
    sd.ghost = cv; sd.gW = srcW; sd.gBW = bw; sd.gH = H;
    if (!m.stripFrames && !m._stripPending && FM.buildClipStrip) {
      m._stripPending = true;   // frames arrive async → repaint the ghost mid-drag when they land
      FM.buildClipStrip(m, 8).then(() => { m._stripPending = false; if (slipDrag === sd) renderSlipGhost(sd); });
    }
    renderSlipGhost(sd);
  }
  function renderSlipGhost(sd) {
    const cv = sd.ghost; if (!cv) return;
    const m = sd.m, L = sd.layer, pps = sd.pps, bw = sd.gBW, H = sd.gH, k = bw / sd.gW;
    const trim = L.trimStart || 0;
    cv.style.left = (PAD + (L.start - trim / sd.rate) * pps) + 'px';   // source t=0 anchored so the window stays put while the film slides
    cv.style.top = '5px';
    const g = cv.getContext('2d');
    g.clearRect(0, 0, bw, H);
    const frames = m.stripFrames || [];
    const N = Math.max(1, frames.length);
    const aspect = (m.width || 16) / (m.height || 9);
    const tileW = Math.max(18, Math.round(H * aspect));
    const drawStrip = () => {
      for (let x = 0; x < bw; x += tileW) {
        const f = frames.length ? frames[Math.min(N - 1, Math.floor(x / bw * N))] : null;   // frame chosen by SOURCE TIME at this x
        if (f) { try { g.drawImage(f, x, 0, tileW, H); } catch (e) {} }
        else { g.fillStyle = 'rgba(120,130,150,.22)'; g.fillRect(x, 0, tileW - 1, H); }
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + tileW - 1, 0, 1, H);
      }
    };
    g.save(); g.filter = 'grayscale(1) brightness(.45)'; drawStrip(); g.restore();   // the unused footage, B&W
    const wx = (trim / sd.rate) * pps * k, ww = Math.max(2, L.duration * pps * k);
    g.save(); g.beginPath(); g.rect(wx, 0, ww, H); g.clip(); g.filter = 'none'; drawStrip(); g.restore();   // the clip's window, colour
    const atEnd = trim <= 1e-4 || trim >= sd.max - 1e-4;
    g.strokeStyle = atEnd ? '#ff9042' : 'rgba(47,208,181,.95)';   // orange = jammed against a source end
    g.lineWidth = 2; g.strokeRect(wx + 1, 1, ww - 2, H - 2);
    // slack readouts: seconds of unused footage beyond each side of the window (timeline seconds)
    const lSec = trim / sd.rate, rSec = (sd.max - trim) / sd.rate;
    g.font = '600 10px -apple-system, system-ui, sans-serif'; g.textBaseline = 'middle';
    const label = (txt, x, align) => {
      g.textAlign = align;
      const w = g.measureText(txt).width;
      const bx = align === 'left' ? x - 3 : x - w - 3;
      g.fillStyle = 'rgba(6,9,14,.72)'; g.fillRect(bx, H / 2 - 8, w + 6, 16);
      g.fillStyle = '#e8ecf4'; g.fillText(txt, x, H / 2 + 0.5);
    };
    if (lSec > 0.05 && wx > 52 * k) label('◂ ' + lSec.toFixed(1) + 's', wx - 6, 'right');
    if (rSec > 0.05 && bw - wx - ww > 52 * k) label(rSec.toFixed(1) + 's ▸', wx + ww + 6, 'left');
    // the ⇄ handle, redrawn at the window centre so it stays visible above the ghost
    const cx = wx + ww / 2;
    g.fillStyle = 'rgba(8,12,18,.82)'; g.strokeStyle = 'rgba(47,208,181,.9)'; g.lineWidth = 1;
    g.beginPath(); g.roundRect(cx - 20, H / 2 - 9, 40, 18, 9); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.font = '600 12px -apple-system, system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('⇄', cx, H / 2 + 0.5);
  }
  function endSlipGhost(sd) { if (sd && sd.ghost) { sd.ghost.remove(); sd.ghost = null; } }

  // Pixels per second within the clip LANE. Fit-to-viewport at zoom 1; scaled by `zoom`.
  /* clientWidth is a GEOMETRY READ, so asking for it while buildTracks is appending rows forces a
   * synchronous layout — one PER CLIP, inside a single task. Measured with Chrome's LayoutCount over
   * 12 taps: 24.1 forced layouts per tap at 5 layers, 61.4 at 20, 111.4 at 40, 211.4 at 80, costing
   * 14.7 ms of layout alone at 80. The lane width cannot change during a rebuild, so cache it for the
   * duration of one and let every clip read the same number.
   * `_laneW` is seeded by the FIRST call inside the rebuild — which is applyInnerWidth(), exactly the
   * value the ruler is already drawn with — so the ruler is unchanged and the clips now agree with it
   * instead of possibly re-measuring after a scrollbar appeared. Cleared in rebuild()'s finally, so a
   * genuine resize between rebuilds is still measured fresh. */
  let _laneW = 0, _laneFrozen = 0;
  function laneViewW() {
    if (_laneFrozen && _laneW) return _laneW;
    const w = Math.max(1, ((timelineEl ? timelineEl.clientWidth : (tracksEl ? tracksEl.clientWidth : 800)) || 800) - HEAD_W);
    if (_laneFrozen) _laneW = w;
    return w;
  }
  // The REAL project duration drives the ruler extent + scrollable width. 0 = a genuinely empty,
  // zero-length timeline (no phantom scaffold, nothing to scroll).
  function viewDur() { return Math.max(0, FM.scene.project.duration || 0); }
  // FIXED pixels-per-second — the time scale does NOT depend on the project length. So a 1-second clip
  // is always physically 1 second wide (and STAYS that width when you trim it), a 5s clip is 5× wider,
  // and an empty project has zero width. No fit-to-viewport rescaling (which sprang trimmed clips back
  // to full width) and no divide-by-zero. ~SPAN_AT_ZOOM1 seconds fill the lane at zoom 1; zoom scales it.
  const SPAN_AT_ZOOM1 = 5;
  function pxPerSec() { return (laneViewW() / SPAN_AT_ZOOM1) * zoom; }
  FM._tlPxPerSec = pxPerSec;   // suite seam, same as FM._tlHeadW: lets a test derive the content width
  // Widen the inner area so the lanes overflow + scroll (heads are sticky-pinned). viewport + content
  // pads both sides so t=0 AND t=duration can each scroll under the fixed centre line (50vw).
  function applyInnerWidth() {
    // re-read --head-w every rebuild so a state-driven head width (overview eye-only vs edit pill)
    // keeps PAD / clip-x / scrub math in sync (was only re-read on init + resize).
    HEAD_W = readHeadW();
    recomputePad();
    if (!innerEl) return;
    const content = viewDur() * pxPerSec();
    /* THE TIMELINE'S OWN WIDTH, NOT THE WINDOW'S (queue 396). Ezra: "An issue where the ui thinks it should
       be the size based on the timeline and not itself" — the same fault from the other side.
       The pad exists so t=0 AND t=duration can each scroll under the fixed centre line, and the amount
       needed for that is the SCROLLPORT's width: lead pad + content + trail pad = PAD + content +
       (scrollport − PAD − HEAD_W) + HEAD_W = content + scrollport. Using `window.innerWidth` is only the
       same number when the timeline fills the window, which is true on a phone and false on a desktop,
       where the inspector column sits beside it. Measured at 1440: the scroll range ran **346px too long
       — exactly the inspector's width** — so the end of the project scrolled well past the centre line and
       left a screenful of dead space no clip could ever reach.
       `laneViewW() + HEAD_W` is the scrollport, and it is read through laneViewW deliberately: that helper
       already freezes its value during a gesture, so a drag cannot make the extent flicker mid-move. */
    innerEl.style.width = ((laneViewW() + HEAD_W) + content) + 'px';
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
  /* WHAT PART OF THE RULER IS ACTUALLY ON SCREEN, in project seconds, plus a screen of margin either
   * side so ordinary scrolling never reaches bare ruler before the next repaint. Derived from the two
   * elements' real rects rather than from scrollLeft, so it cannot drift out of step with whatever the
   * head width and padding happen to be. */
  function rulerWindow() {
    const dur = viewDur(), pps = pxPerSec();
    if (!rulerEl || !timelineEl || !pps) return { a: 0, b: dur, all: true };
    const rr = rulerEl.getBoundingClientRect(), tr = timelineEl.getBoundingClientRect();
    if (!tr.width || !rr.width) return { a: 0, b: dur, all: true };
    const x0 = tr.left - rr.left, x1 = x0 + tr.width;
    const m = tr.width;                                   // one screen of margin on each side
    return {
      a: Math.max(0, (x0 - m - PAD) / pps),
      b: Math.min(dur, (x1 + m - PAD) / pps),
      all: false,
    };
  }
  let _rulerAt = null, _rulerRAF = 0;   // the window the ruler was last drawn for

  function buildRuler() {
    const dur = viewDur(), pps = pxPerSec(), f = fps();
    // FRAME NOTCHES: a fine tick per frame (thinned so they stay >=5px apart; denser as you zoom in).
    const frameW = pps / f;
    let frameStep = 1; while (frameW * frameStep < 5) frameStep *= (frameStep < 5 ? 5 : 2);
    // MAJOR timecode ticks ~every 88px.
    const nice = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const majStep = nice.find(s => s * pps >= 88) || nice[nice.length - 1];
    let html = '';
    const totalFrames = Math.ceil(dur * f);
    /* ONLY THE VISIBLE STRETCH (queue 101, and the rebuild cost in queue 95).
     * This used to emit a notch for the WHOLE project and then thin them to keep the node count under
     * 1500 — which is why "the little notches are missing… not at fully zoomed in": the thinning was
     * computed from the project's length, so a long project started coarse and zooming IN multiplied
     * that step's pixel gap without ever adding a notch back. Measured on a 380px lane: a 1800s project
     * showed ONE notch, 1577px apart, at 12x zoom, and 300s showed one 197px apart.
     * It also made every rebuild cost the whole timeline: 901 notch + 151 tick divs at 300s, ~14.8ms
     * per rebuild, on a path that runs on every tap.
     * Windowing fixes both at once — the step now follows the ZOOM alone, and the node count follows
     * the screen rather than the project. */
    const win = rulerWindow();
    _rulerAt = win;
    const winFrames = Math.max(1, (win.b - win.a) * f);
    while (winFrames / frameStep > 2000) frameStep *= 2;   // a backstop, not the thinning rule
    const fr0 = Math.max(0, Math.floor((win.a * f) / frameStep) * frameStep);
    const fr1 = Math.min(totalFrames, Math.ceil(win.b * f));
    for (let fr = fr0; fr <= fr1; fr += frameStep) { const t = fr / f; html += '<div class="notch" style="left:' + (PAD + t * pps) + 'px"></div>'; }
    // Major ticks are LINES only — no numbers. The single centred timecode pill is the only readout
    // (Ezra: "I only want the numbers on the little counter in the middle").
    let tickStep = majStep;
    while ((win.b - win.a) / tickStep > 800) tickStep *= 2;
    const t0 = Math.max(0, Math.floor(win.a / tickStep) * tickStep);
    for (let t = t0; t <= Math.min(dur, win.b) + 1e-6; t += tickStep) { html += '<div class="tick" style="left:' + (PAD + t * pps) + 'px"></div>'; }
    rulerEl.innerHTML = html;
    (FM.scene.project.markers || []).forEach(mk => {
      const el = document.createElement('div');
      el.className = 'tl-marker' + (mk.thumb ? ' thumb' : '');   // the pinned thumbnail-frame marker is a smaller distinct pin
      el.style.left = (PAD + mk.t * pps) + 'px';
      el.title = mk.thumb ? ('Thumbnail frame @ ' + mk.t.toFixed(2) + 's') : ((mk.label || 'Marker') + ' @ ' + mk.t.toFixed(2) + 's  (double-click to rename)');
      // Hovering a benchmark lights the timecode chip yellow. The marker's own glow is pure CSS
      // (:hover); only the chip needs JS, because CSS can't reach across to it. Separate class from
      // the parked-on-a-marker state so updateReadout's toggle can't clobber a live hover. (#61)
      el.addEventListener('pointerenter', () => markHover(true));
      el.addEventListener('pointerleave', () => markHover(false));
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
    // A rebuild replaces the marker elements, so a pointerleave for the old one never arrives and
    // the chip would be stranded yellow. Re-derive from the browser's own hit-testing instead of
    // remembering: :hover is accurate for wherever the cursor actually is now. (#61)
    markHover(!!rulerEl.querySelector('.tl-marker:hover'));
  }

  /* The hover half — and since queue 364 it lights the PLAYHEAD as well as the chip. His words:
     "when you're hovering over a bookmark it just makes the play head yellow instead".
     "Instead" is the operative word: the chip used to be the only thing that answered, and the chip has
     since become the play/pause control, so pointing at a bookmark to make the PLAY button flash yellow
     would say the wrong thing entirely. The playhead is where bookmarks live now — you tap its head to
     add or remove one — so the playhead is what should answer.
     Both are toggled together rather than moving it, because the chip's version is also what reports
     "you are parked ON one" on a phone, where there is no hover at all (#61). */
  function markHover(on) {
    const ro = document.getElementById('time-readout');
    if (ro) ro.classList.toggle('mark-hover', on);
    const cl = document.getElementById('tl-centerline');
    if (cl) cl.classList.toggle('mark-hover', on);
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

    // #117 — a locked layer wears a red padlock on its preview. Ezra: "When you lock a layer put a
    // red lock icon on the layer's preview image." The badge is a DOM overlay inside a wrapper, NOT
    // painted into the 38x24 bitmap: renderThumb also feeds the parent-picker rows and the ⋯ menus,
    // and a lock baked into the canvas would leak into every one of them.
    const thumbWrap = document.createElement('span');
    thumbWrap.className = 'th-thumb-wrap' + (layer.locked ? ' locked' : '');
    const thumb = document.createElement('canvas');
    thumb.className = 'th-thumb'; thumb.width = 38; thumb.height = 24;
    FM.renderThumb(layer, thumb);
    thumbWrap.appendChild(thumb);
    if (layer.locked) {
      const lock = document.createElement('span');
      lock.className = 'th-lock';
      lock.title = 'Layer is locked';
      // Drawn TWICE: a dark halo underneath, then the red on top. A drop-shadow filter was the first
      // attempt and it muddied the glyph — at 13px the blur bleeds into a shape only 13px wide, so
      // #ff4d4d photographed as a dull brick. A hard second copy keeps the red exactly the red.
      lock.innerHTML = '<svg viewBox="0 0 24 24">' +
        '<g fill="#080c11" stroke="#080c11" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M7.7 10.6V7.5a4.3 4.3 0 0 1 8.6 0v3.1"/><rect x="3.6" y="10.4" width="16.8" height="10.6" rx="2.8"/></g>' +
        '<path d="M7.7 10.6V7.5a4.3 4.3 0 0 1 8.6 0v3.1" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round"/>' +
        '<rect x="3.6" y="10.4" width="16.8" height="10.6" rx="2.8" fill="currentColor"/></svg>';
      thumbWrap.appendChild(lock);
    }

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

    /* THE CHEVRON'S SLOT EXISTS ON EVERY ROW (queue 191). Ezra: "an arrow next to the hide button, idk
     * what that does and it pushes the ui over making it ugly."
     * It is the group's expand/collapse toggle, and only group rows had one — so a group's eye, thumb
     * and name all started 16px further right than every other row's, and the whole head read as
     * shunted sideways next to its neighbours. A control that only some rows carry must not move the
     * ones that do not, so the slot is always there and merely EMPTY on a normal layer: same width,
     * nothing drawn, nothing to tap.
     * The title also now says what it is in words rather than expecting a triangle to explain itself. */
    // (Solo "S" button removed per Ezra — was the per-layer "isolate this layer" toggle.)
    if (layer.type === 'group') {   // collapsible group row
      const chev = document.createElement('button');
      chev.className = 'th-chevron';
      chev.textContent = layer.collapsed ? '▸' : '▾';
      chev.title = layer.collapsed ? 'Show what is inside this group' : 'Hide what is inside this group';
      chev.setAttribute('aria-label', chev.title);
      chev.addEventListener('click', (e) => { e.stopPropagation(); layer.collapsed = !layer.collapsed; FM.timeline.rebuild(); });
      head.appendChild(chev);
      head.classList.add('group-head');
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'th-chevron th-chevron--empty';
      spacer.setAttribute('aria-hidden', 'true');
      head.appendChild(spacer);
    }
    if (inGroup(layer)) head.classList.add('in-group');
    const stripe = document.createElement('span');
    stripe.className = 'th-stripe';
    stripe.style.background = layer.labelColor || 'transparent';
    stripe.style.opacity = layer.labelColor ? '1' : '0';
    head.append(stripe, eye, thumbWrap, name);
    head.addEventListener('click', (e) => {
      if (Date.now() - lpFiredAt < 800) return;                 // the long-press that just fired isn't a tap (survives the DOM rebuild)
      if (FM.selectMode) { FM.toggleSelect(layer.id); FM.refreshAll(); return; }   // select-mode: taps toggle membership
      if (e.shiftKey || e.metaKey || e.ctrlKey) FM.toggleSelect(layer.id); else FM.selectLayer(layer.id);
    });
    // AM: HOLD the header cell (mouse OR touch) → multi-select mode; keep holding and DRAG up/down
    // to paint more rows into the selection. Reordering lives on the right-edge ≡ handle now, so a
    // mouse hold no longer conflicts with anything. Android's synthetic long-press contextmenu is
    // suppressed via the shared lpFiredAt window (see contextmenu handler).
    // A drag on the header also PANS the list. #timeline sets touch-action:none so JS owns every
    // gesture, and the scroller's own pan handler deliberately skips .track-head — so before this,
    // putting a finger on a layer name and dragging did nothing at all: the hold timer cancelled on
    // movement and no other handler picked the gesture up. On a phone the header column is most of
    // what you can reach, so that read as "the layers don't scroll".
    let lpTimer = null, lpStart = null, panning = false, panFrom = 0, panMoved = false, lpFired = false;
    head.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('.th-eye') || e.target.closest('.th-chevron')) return;   // buttons stay buttons
      lpStart = { x: e.clientX, y: e.clientY };
      panning = false; panMoved = false; lpFired = false;
      panFrom = timelineEl ? timelineEl.scrollTop : 0;
      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => { lpTimer = null; if (!head.isConnected) return; lpFired = true; beginPaintSelect(layer); }, 380);   // a mid-press rebuild detaches the head — its up/cancel can then never clear this timer (phantom select-mode)
    });
    head.addEventListener('pointermove', (e) => {
      if (!lpStart) return;
      const dx = e.clientX - lpStart.x, dy = e.clientY - lpStart.y;
      if (lpTimer && Math.hypot(dx, dy) > 10) { clearTimeout(lpTimer); lpTimer = null; }
      if (lpTimer) return;                       // still inside the hold window — not a pan yet
      if (lpFired) return;                       // the hold fired — paint-select owns this gesture
      // Commit to panning only once the gesture is clearly vertical, so a sideways smudge on a
      // header can't hijack it, and a tap never turns into a 1px scroll.
      if (!panning && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        panning = true;
        try { head.setPointerCapture(e.pointerId); } catch (_) {}
      }
      if (panning && timelineEl) {
        e.preventDefault();
        panMoved = true;
        const max = Math.max(0, timelineEl.scrollHeight - timelineEl.clientHeight);
        timelineEl.scrollTop = Math.max(0, Math.min(max, panFrom - dy));
      }
    });
    // A pan must not also select the layer it started on — the click fires after pointerup.
    head.addEventListener('click', (e) => { if (panMoved) { e.stopPropagation(); panMoved = false; } }, true);
    head.addEventListener('pointerup', () => { clearTimeout(lpTimer); lpTimer = null; lpStart = null; panning = false; lpFired = false; });
    head.addEventListener('pointercancel', () => { clearTimeout(lpTimer); lpTimer = null; lpStart = null; panning = false; panMoved = false; });
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
    syncPaintClasses();   // sets sel-mode + sel-multi through the one owner (app.js syncSelectionChrome)
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} }
    // RANGE painting: the selection made by this gesture is always the span anchor→current row.
    // Drag down to add rows; drag BACK the way you came and the rows you passed unselect again
    // (all the way back to just the anchor) — no manual deselecting. Rows selected BEFORE the
    // gesture are never touched.
    const anchorIdx = FM.scene.layers.indexOf(layer);
    const preSel = new Set(FM.selectionIds ? FM.selectionIds() : []);   // includes the anchor (added above)
    let gestureAdded = new Set();
    let lastEv = null, autoRAF = 0, scrollAcc = 0, lastT = 0;
    const EDGE = 44;   // px zone at the list's top/bottom that arms auto-scroll while painting
    const stopScroll = ev => ev.preventDefault();   // keep the browser from panning instead of painting

    // Which layer row sits at this viewport Y? DRIFT-TOLERANT: uses the row whose vertical band
    // contains Y (not elementFromPoint), so sliding sideways onto a clip lane keeps painting; and
    // when the finger is past the top/bottom of the list it CLAMPS to the nearest row so an
    // auto-scroll drag keeps extending the range instead of stalling.
    function rowIdxAtY(clientY) {
      const heads = tracksEl.querySelectorAll('.track-head');
      if (!heads.length) return null;
      let bestIdx = null, bestDist = Infinity;
      for (const hd of heads) {
        const idx = parseInt(hd.dataset.idx, 10);
        if (isNaN(idx)) continue;
        const r = hd.getBoundingClientRect();
        if (clientY >= r.top && clientY <= r.bottom) return idx;   // direct hit
        const d = clientY < r.top ? r.top - clientY : clientY - r.bottom;
        if (d < bestDist) { bestDist = d; bestIdx = idx; }
      }
      return bestIdx;
    }
    function paintAt(clientY) {
      const curIdx = rowIdxAtY(clientY);
      if (curIdx == null || anchorIdx < 0) return;
      const lo = Math.min(anchorIdx, curIdx), hi = Math.max(anchorIdx, curIdx);
      const want = new Set();
      for (let i = lo; i <= hi; i++) { const L = FM.scene.layers[i]; if (L && !preSel.has(L.id)) want.add(L.id); }
      let changed = false;
      gestureAdded.forEach(id => { if (!want.has(id)) { if (isSelected(id)) FM.toggleSelect(id, true); changed = true; } });   // backtracked past → unselect (true = SILENT: no mid-gesture rebuild storm)
      want.forEach(id => { if (!gestureAdded.has(id)) { if (!isSelected(id)) FM.toggleSelect(id, true); changed = true; } });
      if (!changed) return;
      gestureAdded = want;
      syncPaintClasses();
      if (navigator.vibrate) { try { navigator.vibrate(5); } catch (_) {} }
    }
    // The list scrolls WITH you when you keep dragging into the top/bottom edge — same eased,
    // time-based, capped feel as the reorder handle. As rows scroll under the finger we re-paint,
    // so the selection keeps extending to whatever's newly on screen.
    function edgeScroll(now) {
      autoRAF = 0;
      if (!lastEv || !timelineEl) return;
      const vr = timelineEl.getBoundingClientRect(), y = lastEv.clientY;
      let dir = 0, depth = 0;
      if (y < vr.top + EDGE) { dir = -1; depth = (vr.top + EDGE - y) / EDGE; }
      else if (y > vr.bottom - EDGE) { dir = 1; depth = (y - (vr.bottom - EDGE)) / EDGE; }
      if (!dir) { lastT = 0; scrollAcc = 0; return; }   // finger left the edge zone → stop (move() re-arms it)
      depth = Math.min(1, depth); depth *= depth;                       // ease-in
      const t = now || performance.now();
      const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;    // seconds this frame (clamped for stalls)
      lastT = t;
      scrollAcc += dir * 520 * depth * dt;                             // 520 px/SECOND top speed
      const step = Math.trunc(scrollAcc);
      if (step) {
        scrollAcc -= step;
        const max = Math.max(0, timelineEl.scrollHeight - timelineEl.clientHeight);
        const b = timelineEl.scrollTop;
        timelineEl.scrollTop = Math.max(0, Math.min(max, b + step));
        if (timelineEl.scrollTop !== b) paintAt(y);   // new rows scrolled under the finger → paint them
      }
      autoRAF = requestAnimationFrame(edgeScroll);
    }
    const move = (ev) => {
      lastEv = ev;
      paintAt(ev.clientY);
      const vr = timelineEl ? timelineEl.getBoundingClientRect() : null;
      if (vr && (ev.clientY < vr.top + EDGE || ev.clientY > vr.bottom - EDGE) && !autoRAF) { lastT = 0; autoRAF = requestAnimationFrame(edgeScroll); }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('touchmove', stopScroll);
      if (autoRAF) { cancelAnimationFrame(autoRAF); autoRAF = 0; }
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
    if (FM.syncSelectionChrome) FM.syncSelectionChrome();   // one owner for sel-multi/sel-mode (see app.js)
  }

  // ≡ drag handle at each row's RIGHT edge (AM): press + drag vertically to reorder layers.
  // Pointer-based (mouse AND touch). iOS-style reorder:
  //  • rows PART to open a real gap where the drop will land (animated), instead of just a line
  //  • a multi-selection stacks into one tight block under the finger and drops as a unit
  //  • auto-scrolls (time-based, eased, capped) when you drag to the top/bottom edge
  //  • drop target + row shifts are computed from NATURAL geometry snapshotted at grab time,
  //    so the parting transforms can never feed back into the hit-testing and oscillate
  //  • survives a mid-drag rebuild (autosave/playback): re-acquires its rows by layer id
  function buildDragHandle(row, layer, index) {
    const h = document.createElement('button');
    h.className = 'row-drag';
    h.title = 'Drag to reorder (multiple if selected)';
    h.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    h.addEventListener('contextmenu', e => e.preventDefault());
    h.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (layer.locked) return;   // locked layers keep their z-order too
      if (reorderActive) return;  // a prior drop is still settling (150ms) — its deferred moveLayers would otherwise wipe this one
      e.preventDefault(); e.stopPropagation();
      try { h.setPointerCapture(e.pointerId); } catch (_) {}
      reorderActive = true;   // defers rebuilds (a rebuild would destroy this captured handle → dead drag + zombie autoscroll) and blocks pinch-start
      /* …and say WHICH layer, for queue 416. Ezra: "when you're dragging a layer the toggle button will
         change colour to the colour of that layer then when you press the toggle button while dragging a
         layer it will jump that layer to the top or bottom." Published rather than passed, because the
         switch lives in app.js and has no other way to know a drag is happening. */
      FM.dragLayerId = layer.id;
      if (FM.syncAddSwitch) FM.syncAddSwitch();

      // if the grabbed layer is inside the current multi-selection, move the whole set together
      const sel = FM.selectionIds ? FM.selectionIds() : [];
      let groupIds = (sel.length > 1 && sel.indexOf(layer.id) >= 0) ? sel.slice() : [layer.id];
      // a GROUP row carries its members with it — the members' array slots are what actually
      // renders (the unit draws at the bottom-most member), so moving only the group layer was a lie
      if (FM.groupDescendants) {
        const expand = [];
        groupIds.forEach(id => {
          expand.push(id);
          const l = FM.layerById(FM.scene, id);
          if (l && l.type === 'group') FM.groupDescendants(id).forEach(m => { if (expand.indexOf(m.id) < 0) expand.push(m.id); });
        });
        groupIds = expand;
      }
      const groupSet = {}; groupIds.forEach(id => { groupSet[id] = 1; });

      const startY = e.clientY, startScroll = timelineEl ? timelineEl.scrollTop : 0;
      const EDGE = 44;   // px zone at the list's top/bottom that arms auto-scroll during a reorder drag
      let moved = false, dropBeforeId, autoRAF = 0, lastEv = e, scrollAcc = 0, lastT = 0;

      // NATURAL geometry model — snapshotted at grab (no transforms exist yet), in CONTENT coordinates
      // (viewport top + scrollTop), so it stays valid through auto-scroll and row transforms.
      let statics = [], dragged = [], slotH = 43, blockH = 43, listTop = 0, grabOffset = 0, lastGap = -1;
      function acquire() {
        const sc = timelineEl.scrollTop;
        /* THE ADD ROW IS A SLOT TOO (queue 357). Ezra: "currently you can't drag a layer on top of the
           add layer, it's like they don't think it's there or something."
           He is describing the model exactly. This mapped `.track-row` only, and the add row is
           deliberately not one — it has no layer and no index. But it OCCUPIES a row's worth of the
           stack, and every position below is resolved from `listTop + j * slotH`, i.e. from an
           assumption that the rows are evenly spaced. So the add row's 42px shifted every layer beneath
           it out of step with the model by a whole slot, and nothing opened a gap where it sits — a drop
           there did nothing and a drop below it landed one row off.
           It joins the list as a static with no id. It can never be dragged (it is not a layer, so it is
           never in groupSet) and it is never a drop TARGET in its own right — `beforeId` below resolves
           it to whatever real row follows it, which is the same boundary its own position means. */
        const all = [].slice.call(tracksEl.querySelectorAll('.track-row, .tl-addrow')).map(r => {
          const isAdd = r.classList.contains('tl-addrow');
          const hd = isAdd ? null : r.querySelector('.track-head');
          const L = hd && FM.scene.layers[parseInt(hd.dataset.idx, 10)];
          return { id: (!isAdd && L) ? L.id : null, isAdd: isAdd, el: r, top: r.getBoundingClientRect().top + sc };
        });
        if (!all.length) { statics = []; dragged = []; return; }
        slotH = all.length > 1 ? (all[1].top - all[0].top) : (all[0].el.getBoundingClientRect().height + 1);
        listTop = all[0].top;
        statics = all.filter(r => r.isAdd || !groupSet[r.id]);
        dragged = all.filter(r => !r.isAdd && groupSet[r.id]);
        blockH = Math.max(1, dragged.length) * slotH;
        const prim = dragged.find(d => d.id === layer.id) || dragged[0];
        grabOffset = prim ? (startY + startScroll) - prim.top : 0;   // where in the primary row the finger grabbed
        dragged.forEach(d => d.el.classList.add('row-dragging'));
        statics.forEach(s => s.el.classList.add('row-part'));        // transitioned: rows glide apart/together (the add row included — see acquire)
      }
      function layout() {   // position the block under the finger, open the gap, resolve the drop target
        if (!dragged.length || !dragged[0].el.isConnected) { acquire(); if (!dragged.length) return; }   // mid-drag rebuild → re-grab fresh rows
        // phone SOLO view: the selected layer is the only visible row — there is nowhere to drop, and
        // resolving against zero statics used to silently send the layer to the BOTTOM of the stack
        if (!statics.length) { dropBeforeId = undefined; return; }
        const sc = timelineEl.scrollTop;
        const pi = Math.max(0, dragged.findIndex(d => d.id === layer.id));
        // the grabbed layer stays under the finger; the rest of the selection stacks tight around it
        let blockTop = (lastEv.clientY + sc) - grabOffset - pi * slotH;
        const maxTop = listTop + (statics.length + dragged.length) * slotH - blockH;
        blockTop = Math.max(listTop - slotH * 0.4, Math.min(maxTop + slotH * 0.4, blockTop));   // soft clamp to the list
        // gap index from the block's position on GAPLESS coordinates — independent of the gap itself, so no feedback
        const g = Math.max(0, Math.min(statics.length, Math.round((blockTop - listTop) / slotH)));
        // bottom slot: inside Edit Group the view shows ONLY the group's members, so "very bottom"
        // must mean the bottom of the GROUP (before whatever follows its last member in the full
        // stack) — a raw null sent the member to the bottom of the entire project.
        let bottomBefore = null;
        if (FM.groupContext && statics.length) {
          const idx = FM.scene.layers.findIndex(l => l.id === statics[statics.length - 1].id);
          for (let i2 = idx + 1; i2 < FM.scene.layers.length; i2++) { if (!groupSet[FM.scene.layers[i2].id]) { bottomBefore = FM.scene.layers[i2].id; break; } }
        }
        /* LAND ON THE ADD ROW AND YOU MEAN THE BOUNDARY IT MARKS — the next real row below it. That was
           already the rule for the DROP, and the gap the finger could see did not obey it (queue 443).
           Ezra: "the add layer is still not acting like a layer in the sense when I try to drag a layer
           below it it doesn't let me and stuff, just a bit buggy."
           MEASURED at 380px with the add row at index 2 (tests/_adddrop.html): dropping ON it and
           dropping just BELOW it both produced L0,L1,L4,L2,L3 — which is correct and unavoidable, since
           six gap positions have to map to five real boundaries. What was NOT correct is what you saw
           while deciding: at the gap ON the add row the rows opened ABOVE it and the layer then landed
           BELOW it. The preview and the result disagreed for a whole row's height, which is exactly what
           "it doesn't let me" feels like — you aim at the gap you can see and get somewhere else.
           So the add row is not a slot for the GAP either: a gap that lands on it is pushed one past it,
           and the same number then drives both the layout and the target. What you see is where it goes,
           and the unavoidable collapse now happens with both positions showing the identical preview. */
        const addIdx = statics.findIndex(sr => sr.isAdd);
        const ge = (addIdx >= 0 && g === addIdx) ? g + 1 : g;
        dropBeforeId = statics[ge] ? statics[ge].id : bottomBefore;
        /* THE SWITCH FOLLOWS THE DRAG, NOT THE DROP (queue 438). Ezra: "The switch doesn't update live
           when dragging layers or the main create layer. Make it update as ur dragging."
           He is right and the reason is structural: the switch reads `FM.addAt`, and a reorder is
           DEFERRED — `reorderActive` holds off every rebuild and the real `moveLayers` does not run
           until the drop — so `addAt` cannot change while your finger is down. Meanwhile the add row is
           one of the `statics` above and is visibly sliding, so the row moved and the control that
           reports where it is did not.
           `addAt` itself must NOT be written here: the drag can still be cancelled, and a half-applied
           index would survive it. So the live value is published beside `FM.dragLayerId` — same
           lifetime, same reason, cleared by the same line — and the switch prefers it while it exists.
           The arithmetic: every static before the add row is a layer row, so its index among statics IS
           its layer index; if the dragged block has opened its gap at or above it, the block is now
           above it too and its index rises by the block's size. */
        const ai = statics.findIndex(sr => sr.isAdd);
        FM.dragAddAt = ai < 0 ? null : (ai + (g <= ai ? dragged.length : 0));
        if (FM.syncAddSwitch) FM.syncAddSwitch();
        if (g !== lastGap) { lastGap = g; try { if (navigator.vibrate) navigator.vibrate(5); } catch (_) {} }   // tick on Android; iOS ignores
        dragged.forEach((d, k) => { d.el.style.transform = 'translateY(' + (blockTop + k * slotH - d.top) + 'px)'; });
        statics.forEach((s, j) => {
          const target = listTop + j * slotH + (j >= ge ? blockH : 0);   // packed layout with the gap open at ge — the SAME number the drop uses (queue 443)
          const shift = target - s.top;
          s.el.style.transform = shift ? ('translateY(' + shift + 'px)') : '';
        });
      }
      function autoScroll(now) {
        autoRAF = 0; if (!moved) return;
        const vr = timelineEl.getBoundingClientRect(), y = lastEv.clientY;
        let dir = 0, depth = 0;
        if (y < vr.top + EDGE) { dir = -1; depth = (vr.top + EDGE - y) / EDGE; }
        else if (y > vr.bottom - EDGE) { dir = 1; depth = (y - (vr.bottom - EDGE)) / EDGE; }
        if (!dir) { lastT = 0; scrollAcc = 0; return; }   // finger left the edge zone → stop (move() re-arms it)
        // TIME-based, EASED, capped: gentle creep right at the edge, quicker only as you push deeper in — and
        // the same real speed on 60Hz and 120Hz screens (was 15px/FRAME ≈ 900–1800px/s and impossible to control).
        depth = Math.min(1, depth); depth *= depth;                       // ease-in
        const t = now || performance.now();
        const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;    // seconds this frame (clamped for stalls)
        lastT = t;
        scrollAcc += dir * 520 * depth * dt;                             // 520 px/SECOND top speed
        const step = Math.trunc(scrollAcc);                              // apply whole px, keep the sub-px remainder
        if (step) {
          scrollAcc -= step;
          const b = timelineEl.scrollTop; timelineEl.scrollTop = b + step;
          if (timelineEl.scrollTop !== b) layout();
        }
        autoRAF = requestAnimationFrame(autoScroll);
      }
      const move = (ev) => {
        lastEv = ev;
        if (!moved && Math.abs(ev.clientY - startY) < 4) return;
        if (!moved) { moved = true; acquire(); }
        layout();
        const vr = timelineEl.getBoundingClientRect();
        if ((ev.clientY < vr.top + EDGE || ev.clientY > vr.bottom - EDGE) && !autoRAF) { lastT = 0; autoRAF = requestAnimationFrame(autoScroll); }
      };
      const unlisten = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', abort); if (autoRAF) cancelAnimationFrame(autoRAF); };
      const cleanup = () => {
        reorderActive = false;
        FM.dragLayerId = null;                                  // the switch goes back to its own colour (queue 416)
        FM.dragAddAt = null;                                    // …and back to the real index (queue 438)
        if (FM.syncAddSwitch) FM.syncAddSwitch();
        // clear via a fresh query too — a mid-drag rebuild can leave our stored refs detached
        // `.tl-addrow` too — it is a slot in the model now (queue 357), so it also carries row-part and
        // an inline transform, and clearing only the track rows would strand the add row where the drag
        // left it for the rest of the session.
        [].slice.call(tracksEl.querySelectorAll('.track-row, .tl-addrow')).forEach(r => { r.classList.remove('row-dragging', 'row-moving', 'row-part'); r.style.transform = ''; });
        if (rebuildPending) FM.timeline.rebuild();   // flush anything deferred while we held the DOM
      };
      const up = () => {
        unlisten();
        // SETTLE: glide the lifted block into its slot (the .row-part 150ms transition) before the
        // DOM reorders underneath — dropping used to teleport everything into place. (iOS feel)
        if (moved && dragged.length && dragged[0].el.isConnected) {
          const g = Math.max(0, lastGap);
          const targetTop = listTop + g * slotH;   // the open gap's top, in the same content coords as layout()
          dragged.forEach((d, k) => {
            d.el.classList.add('row-part');        // row-part's transition outranks row-dragging's none
            d.el.style.transform = 'translateY(' + (targetTop + k * slotH - d.top) + 'px)';
          });
          setTimeout(() => { cleanup(); if (dropBeforeId !== undefined && FM.moveLayers) FM.moveLayers(groupIds, dropBeforeId); }, 160);
          return;
        }
        cleanup();
        if (moved && dropBeforeId !== undefined && FM.moveLayers) FM.moveLayers(groupIds, dropBeforeId);
      };
      const abort = () => { unlisten(); cleanup(); };   // pointercancel (browser stole the gesture) = never apply the move
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', abort);
    });
    return h;
  }

  function buildLane(layer) {
    const pps = pxPerSec();
    const lane = document.createElement('div');
    lane.className = 'track-lane';

    const clip = document.createElement('div');
    // A hidden layer used to look EXACTLY like a visible one on the timeline — the only tell was the
    // struck-through eye way over in the track head, which you don't look at while you're wondering
    // why nothing is rendering. Ezra: "when you make a clip hidden it darkens the layer on the
    // timeline so you dont get confused and miss why its hidden."
    clip.className = 'clip' + (isSelected(layer.id) ? ' sel' : '') + (layer.reversed ? ' reversed' : '') + (layer.type === 'group' ? ' group-bar' : '') + (layer.visible === false ? ' clip-hidden' : '');
    clip.style.left = (PAD + layer.start * pps) + 'px';
    clip.style.width = Math.max(8, layer.duration * pps) + 'px';
    // A clip colour that was CHOSEN (clipColorSet) beats the shape's fill — it was set deliberately.
    // Every other clipColor is just the next entry off the spawn palette, so the fill wins over it.
    const col = clipColorOf(layer);
    clip.style.background = 'linear-gradient(180deg, ' + shade(col, 8) + ', ' + shade(col, -20) + ')';
    clip.style.borderColor = shade(col, 24);
    clip.dataset.id = layer.id;

    // AM: each clip shows its NAME on the bar (the track-head becomes eye-only in the overview).
    // Hidden on the SELECTED clip (its name lives in the edit pill + it shows the ‹ › grip caps).
    const clabel = document.createElement('span');
    clabel.className = 'clip-label';
    clabel.textContent = layer.name;
    // Ink is chosen per clip, not fixed white — that is what lets the bar above carry a genuinely
    // bright colour instead of being darkened until a white label survives on it.
    const ink = labelInkFor(col);
    clabel.style.color = ink.color;
    clabel.style.textShadow = ink.shadow;
    clip.appendChild(clabel);
    const rampSpeed = FM.isAnimated(layer.speed);   // animated speed is an OBJECT — never do arithmetic on it raw
    if (rampSpeed || (layer.speed && Math.abs(layer.speed - 1) > 1e-3)) {
      const sb = document.createElement('span');
      sb.className = 'clip-speed';
      sb.textContent = rampSpeed ? '⚡ramp' : (Number.isInteger(layer.speed) ? layer.speed : +layer.speed.toFixed(2)) + '×';
      clip.appendChild(sb);
    }
    if (layer.type === 'video') {
      const m = FM.media.get(layer.id);
      // trimmed-source indicator: a striped edge where there's more source beyond the trim
      if (m && isFinite(m.duration)) {
        const srcSpan = rampSpeed ? FM.layerSourceAdvance(layer, layer.duration) : layer.duration * (layer.speed || 1);
        if (layer.trimStart > 0.03) clip.appendChild(Object.assign(document.createElement('div'), { className: 'clip-trim l' }));
        if (layer.trimStart + srcSpan < m.duration - 0.05) clip.appendChild(Object.assign(document.createElement('div'), { className: 'clip-trim r' }));
      }
    }
    // AM: video + image clips show a FILMSTRIP of frames on the bar (distinct frames for video; the
    // photo, tiled, for an image). Built lazily + cached on the media record (m.stripFrames).
    if (layer.type === 'video' || layer.type === 'image') {
      const m = FM.media.get(layer.id);
      if (m && m.el) {
        /* `audioOnly` is set by FM.extractAudio (queue 70): the twin is a copy of a video layer, so it
           HAS a picture and was drawn a filmstrip — a strip of invisible frames identical to the clip
           it came from. Marking it audio routes it down the waveform path below, which already handles
           trim, speed and reverse; it was only ever unreachable for a layer that had a picture. */
        const hasPicture = !layer.audioOnly && (layer.type === 'image' || (m.width > 0 && m.height > 0));
        // Cap the backing width: duration*pps is unbounded (long clip × deep zoom) and a canvas wider
        // than ~16384px renders BLANK on iOS Safari. CSS keeps the clip full-width; only the off-screen
        // backing buffer is capped (slightly lower-res at extreme zoom, but actually visible). (#9)
        const stripW = Math.min(8192, Math.max(2, Math.round(Math.max(8, layer.duration * pps))));
        if (hasPicture) {
          // CACHE the rendered strip (module map, keyed by LAYER id — layers can share one media
          // record, so caching on the record would let clips steal each other's canvas). rebuild fires
          // on every tap/selection/keyframe edit, and re-allocating + re-blitting a ~1MB canvas per
          // video clip each time is what churns iOS Safari's canvas memory. During a pinch reuse the
          // cached strip at ANY width (CSS stretches it; the pinch-end rebuild re-crisps it).
          const sKey = stripW + '|' + (layer.trimStart || 0) + '|' + layer.duration + '|' + (m.stripFrames ? m.stripFrames.length : -1);
          const hit = stripCache.get(layer.id);
          let strip = (hit && (hit.key === sKey || pinch)) ? hit.canvas : null;
          if (!strip) {
            strip = document.createElement('canvas');
            strip.className = 'clip-filmstrip';
            strip.width = stripW; strip.height = 32;
            if (m.stripFrames && m.stripFrames.length) {
              drawFilmstrip(strip, m.stripFrames, m);
              stripCache.set(layer.id, { key: sKey, canvas: strip });
              if (stripCache.size > 40) stripCache.delete(stripCache.keys().next().value);   // bounded
            } else if (m.stripFrames === undefined && !m._stripPending && !FM.playing && FM.buildClipStrip) {
              m._stripPending = true;   // build ONCE; m.stripFrames is then set (even to []) so this never re-fires
              FM.buildClipStrip(m, 8).then(() => { m._stripPending = false; FM.timeline.rebuild(); });
            }
          }
          clip.appendChild(strip);
        } else if (m.file) {
          // a video with NO picture (used purely for audio) → waveform, not a black filmstrip
          if (m.waveform && m.waveform.length) {
            const wSpan = rampSpeed ? FM.layerSourceAdvance(layer, layer.duration) : layer.duration * (layer.speed || 1);
            const win = waveWindow(m, layer, wSpan);
            // The width the canvas is SHOWN at. Above ~129 s at zoom 1 this runs away from stripW,
            // which is clamped to 8192, and that ratio is what inflates every gap the strip draws.
            const wCssW = Math.max(8, layer.duration * pps);
            // The key has to name everything the picture depends on. It used to be width + peak
            // COUNT, which never mentions the peak VALUES: a rebuild after the peaks changed handed
            // back the stale canvas, and because stripW saturates at 8192 the key also stopped
            // changing across a wide band of zooms, so long clips got STRETCHED instead of redrawn.
            // m.waveformV is bumped by getWaveform on every (re)compute; the window terms cover trim,
            // speed and reverse, which the strip now honours.
            const wKey = 'w' + stripW + '|' + Math.round(wCssW) + '|' + m.waveform.length + '|' + (m.waveformV || 0)
              + '|' + win.a.toFixed(6) + '|' + win.b.toFixed(6) + '|' + (win.reversed ? 'r' : 'f');
            const whit = stripCache.get('w' + layer.id);
            let wc = (whit && (whit.key === wKey || pinch)) ? whit.canvas : null;
            if (!wc) {
              wc = document.createElement('canvas');
              wc.className = 'clip-wave';
              wc.width = stripW; wc.height = 32;
              drawWaveform(wc, m.waveform, win, wCssW);
              stripCache.set('w' + layer.id, { key: wKey, canvas: wc });
              if (stripCache.size > 40) stripCache.delete(stripCache.keys().next().value);
            }
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
      if (pinch) return;   // a pinch already owns both fingers — its second finger must not spawn a clipTap that later "taps" a random clip
      if (e.shiftKey || e.metaKey || e.ctrlKey) { FM.toggleSelect(layer.id); return; }   // multi-select, no drag
      const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (isTouch) {
        // AM model: touch-down does NOT select. A clean tap selects (pointerup); a horizontal drag
        // scrubs the playhead; an already-selected clip can be press-held to move it in time.
        clipTap = { layer: layer, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, downTime: timeFromX(e.clientX), baseTime: FM.time, moved: false, holdTimer: null, lastMoveAt: performance.now(), startScrollTop: timelineEl ? timelineEl.scrollTop : 0, axis: null };
        // ANY unlocked clip, selected or not. Ezra: "On mobile you can only drag clips on the timeline
        // if you have them selected, you should be able to drag clips by holding down on them without
        // selecting." Requiring a prior selection made moving a clip a two-gesture job — tap it, wait
        // for the sheet, then press-hold — when the hold alone is unambiguous.
        if (!layer.locked) {
          // Press-and-HOLD (finger settled) on a clip grabs it to move in time. But a finger
          // that is still travelling is a SCRUB, not a hold — a slow "drag the line over the clips to
          // find a spot" gesture emits continuous pointermoves and may cover <8px in the first 350ms.
          // So only convert to a clip move once the finger has gone still for ~150ms; otherwise leave
          // clipTap intact and let it scrub. (Fixes the phone fixed-centre playhead "moves over clips".)
          const armHold = () => {
            clipTap.holdTimer = setTimeout(() => {
              // clipTap.layer check: a pinch once orphaned this timer, and a fast follow-up tap on a
              // DIFFERENT clip then made the stale closure grab the wrong layer. Never fire cross-clip.
              if (!clipTap || clipTap.moved || clipTap.layer !== layer) return;
              if (performance.now() - clipTap.lastMoveAt > 150) {
                // carry the whole multi-selection, exactly like the desktop mouse path — a touch
                // hold-move on one selected clip must not silently break the others' relative sync
                // Grabbing a clip that was NOT selected selects it first, so what you are dragging is
                // visibly the thing you grabbed. Safe to rebuild here: the pointer capture lives on
                // innerEl, which survives a rebuild, not on the clip element which does not.
                /* Ezra, twice: "I still need it so I can drag clips on the timeline without it opening
                   up the editing panel." The select below is deliberate — you must SEE which clip you
                   grabbed — but on a phone the inspector sheet is DERIVED from the selection
                   (js/mobile.js syncSheet), so showing the grab also threw the panel over the timeline
                   you were dragging on. Grabbing STAMPS THE LAYER ID here, and the sheet
                   leaves that one selection alone.
                   Two earlier shapes of this were caught by the suite and are worth recording. A
                   "drag in progress" predicate polled the live drag state, and a clip drag can end by a
                   path that leaves that state set — the sheet then never opened again all session. A
                   bare boolean one-shot fared no better: syncSheet returns early when the viewport is
                   not a phone, so a flag set on desktop survived until some later phone-sized sync
                   consumed it and suppressed an unrelated panel. Stamping the LAYER ID bounds the
                   blast radius to the one selection it was meant for, and any other selection clears
                   it on sight. */
                FM._sheetSuppressFor = layer.id;
                /* A GRAB NO LONGER SELECTS. Third time on this one, and the earlier compromise is now
                 * overruled by the person using it — Ezra: "Dragging a clip still selects it, I want to
                 * be able to drag layers without selecting them, right now it just selects it but
                 * doesn't show the ui." The old reasoning (kept below in the sheet-suppress note) was
                 * that you must be able to SEE which clip you grabbed, so it selected and then hid the
                 * phone sheet. That produced the exact half-state he is describing: the layer IS
                 * selected, the panel is not up, and nothing on screen tells you which of the two you
                 * are in. The clip visibly moving under the finger is feedback enough; a selection is
                 * a mode, and a drag should not silently change your mode. Tapping still selects — see
                 * the pointerup handler, which is where selection now happens for taps on both phone
                 * and desktop. */
                let group = [];
                const selIds = FM.selectionIds ? FM.selectionIds() : [];
                if (selIds.length > 1 && selIds.indexOf(layer.id) >= 0) {
                  group = selIds.filter(id => id !== layer.id).map(id => { const l = FM.layerById(FM.scene, id); return l ? { layer: l, origStart: l.start } : null; }).filter(Boolean);
                }
                clipMove = { layer: layer, startX: clipTap.startX, origStart: layer.start, moved: false, downTime: clipTap.downTime, group: group, sup: snappedTargetsOf(layer) };
                /* Ezra, twice: "I still need it so I can drag clips on the timeline without it opening
                   up the editing panel." The selectLayer above is deliberate — you must be able to SEE
                   which clip you grabbed — but on a phone the inspector sheet is DERIVED from the
                   selection (js/mobile.js syncSheet), so selecting to show the grab also threw the
                   panel up over the timeline you were dragging on. This flag says "a clip drag owns
                   the screen"; the sheet consults it and stays down. Cleared on pointerup/cancel. */
                clipTap = null;
                if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
              } else {
                armHold();   // finger still moving → keep waiting for it to settle
              }
            }, 350);
          };
          armHold();
        }
        try { innerEl.setPointerCapture(e.pointerId); } catch (_) {}   // a released/synthetic pointerId throws NotFoundError; every other call site in this app already guards
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
      }
      // else: NOT selected here any more. A mouse press that turns into a drag must not change the
      // selection; a press that turns out to be a plain click selects on release, below.
      if (layer.locked) { FM.selectLayer(layer.id); return; }   // locked: selectable, never movable — so there is no drag to wait for
      clipMove = { layer: layer, startX: e.clientX, origStart: layer.start, moved: false, downTime: timeFromX(e.clientX), group: group.filter(g => !g.layer.locked), sup: snappedTargetsOf(layer) };
      try { innerEl.setPointerCapture(e.pointerId); } catch (_) {}   // a released/synthetic pointerId throws NotFoundError; every other call site in this app already guards
      if (FM.playing) FM.pause();
    });
    clip.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); FM.selectLayer(layer.id); if (FM.contextMenu && FM.layerMenuItems) FM.contextMenu.show(e.clientX, e.clientY, FM.layerMenuItems(layer)); });
    clip.addEventListener('dblclick', (e) => { e.stopPropagation(); FM.selectLayer(layer.id); if (FM.inspector && FM.inspector.openCategory) FM.inspector.openCategory('element'); });
    ['left', 'right'].forEach(edge => {
      const grip = document.createElement('div');
      grip.className = 'clip-grip ' + edge;
      grip.title = 'Trim ' + edge + ' edge';
      /* A TRIM MUST BE HELD BEFORE IT WILL DRAG (queue 336). Ezra: *"To extend out a clip you should have
         to hold down on the arrows first because currently accidentally touching for a second moves it
         but you should have to hold down for a second and to signify it can move now the colour of the
         arrow should change to the signature blue or sum"*.
         Retiming a clip is a destructive edit reachable by brushing a 13px target while scrolling, and
         nothing about the old behaviour distinguished a deliberate grab from a graze.
         TOUCH ONLY. A mouse-down on a 13px target is already deliberate — it cannot happen while
         scrolling — so forcing a desktop user to wait half a second would be an annoyance protecting
         against nothing. The guard exists for fingers, so it applies to fingers.
         550ms is not a new number: it is what the Add menu's long-press and the Presets card's hold
         already use, and a second feel for the same gesture is worse than a slightly wrong one.
         The pointer is captured only ON ARMING. Capturing at pointerdown would swallow the swipe that a
         graze actually is, so brushing a grip mid-scroll would stop the scroll dead — trading a wrong
         trim for a stuck timeline. */
      const ARM_MS = 550;
      let armTimer = null, armAt = null;
      const disarm = () => { if (armTimer) { clearTimeout(armTimer); armTimer = null; } armAt = null; grip.classList.remove('armed'); };
      const beginTrim = (e) => {
        try { grip.setPointerCapture(e.pointerId); } catch (_) {}   // keep the drag alive if the mouse leaves the window
        const m = FM.media.get(layer.id);
        trimDrag = { layer: layer, edge: edge, startX: e.clientX, lastX: e.clientX, startScroll: timelineEl ? timelineEl.scrollLeft : 0, start: layer.start, dur: layer.duration, trim: layer.trimStart, srcDur: (m && m.duration) ? m.duration : Infinity, type: layer.type, sup: snappedTargetsOf(layer) };
        FM.selectLayer(layer.id);
        if (FM.playing) FM.pause();
      };
      grip.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault();
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (layer.locked || pinch) return;   // locked: no trims; pinch fingers never start a trim
        /* Expressed as "guard FINGERS", not "exempt mice". Keyed the other way round it also caught
           every pointer whose type is unset — synthetic events, and anything a browser reports oddly —
           and silently put them behind a hold they can never satisfy. A trim that simply stops working
           for an input nobody thought about is a worse failure than the graze this guards against. */
        if (e.pointerType !== 'touch' && e.pointerType !== 'pen') { beginTrim(e); return; }
        disarm();
        armAt = { x: e.clientX, y: e.clientY };
        const at = { clientX: e.clientX, pointerId: e.pointerId };   // the event object is recycled; the two fields it needs are not
        armTimer = setTimeout(() => {
          armTimer = null;
          if (layer.locked || pinch) return;
          grip.classList.add('armed');     // the colour change IS the signal that it is live now
          beginTrim(at);
        }, ARM_MS);
      });
      // A finger that TRAVELS was scrolling, not grabbing. 8px, so a resting thumb's tremor still arms.
      grip.addEventListener('pointermove', (e) => {
        if (!armTimer || !armAt) return;
        if (Math.abs(e.clientX - armAt.x) > 8 || Math.abs(e.clientY - armAt.y) > 8) disarm();
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => grip.addEventListener(ev, disarm));
      clip.appendChild(grip);
    });
    // SLIP (Canva-style): the clip keeps its exact place and length on the timeline — dragging the
    // ⇄ pill slides the MEDIA inside it. Shown on the selected video clip when the source has slack
    // beyond the visible span (nothing to slip otherwise).
    if (layer.id === FM.scene.selectedId && layer.type === 'video' && !layer.locked) {
      const m = FM.media.get(layer.id);
      const advTotal = FM.layerSourceAdvance ? FM.layerSourceAdvance(layer, layer.duration) : layer.duration * (FM.isAnimated(layer.speed) ? 1 : (layer.speed || 1));
      if (m && isFinite(m.duration) && m.duration - advTotal > 0.05) {
        const slip = document.createElement('div');
        slip.className = 'clip-slip';
        slip.title = 'Slip — slide the media inside the clip (position & length stay put)';
        slip.textContent = '⇄';
        slip.addEventListener('pointerdown', (e) => {
          e.stopPropagation(); e.preventDefault();
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          if (pinch) return;
          try { slip.setPointerCapture(e.pointerId); } catch (_) {}
          slipDrag = { layer: layer, startX: e.clientX, trim0: layer.trimStart || 0, rate: advTotal / Math.max(1e-6, layer.duration), max: m.duration - advTotal, m: m, pps: pxPerSec() };
          FM.selectLayer(layer.id);
          if (FM.playing) FM.pause();
          beginSlipGhost(slipDrag, clip);
        });
        clip.appendChild(slip);
      }
    }
    // CAPTION CUES on the bar. Cue times are LAYER-LOCAL, so they are positioned relative to the
    // clip's own left edge and travel with it for free when the clip is moved or trimmed. Each chip
    // can be dragged (move) or grabbed by an edge (trim) — the timing work of captioning done where
    // you can see it against the waveform, instead of in a pair of number fields.
    if (FM.captions && FM.captions.isTrack(layer) && !layer.locked) {
      FM.captions.cues(layer).forEach((cue, ci) => {
        const w = Math.max(4, (cue.end - cue.start) * pps);
        const chip = document.createElement('div');
        /* WIDE ENOUGH TO HAVE ENDS (queue 441). Two grips are 20px of the chip, so on a short cue they
           cover the whole thing: you can neither trim it (the marks have nowhere to draw) nor move it
           (there is no middle left to grab). Below 46px the cue is move-only, which is the honest
           behaviour for something that small — and it is why the grips are gated on a class rather than
           always present. */
        const wide = w >= 46;
        chip.className = 'cap-cue' + (FM.captions.indexAt(layer, FM.time) === ci ? ' live' : '') + (wide ? ' cap-cue--wide' : '');
        chip.style.left = (cue.start * pps) + 'px';
        chip.style.width = w + 'px';
        chip.dataset.ci = ci;
        // textContent, never innerHTML: cue text is user data and lands in the DOM here.
        const lbl = document.createElement('span');
        lbl.className = 'cap-cue-lbl';
        lbl.textContent = (cue.text || '').trim() || '…';
        chip.appendChild(lbl);
        chip.title = (cue.text || '(empty cue)') + '  ' + cue.start.toFixed(2) + '–' + cue.end.toFixed(2) + 's\nDrag to move (press-and-hold on touch) · edges to trim · double-click to type';
        /* #136 — TOUCH must not lose the whole row to the cues. Ezra: "I can't do anything like drag
           the timeline or layer when you have a captions layer selected."
           A captions track's cues can blanket its entire bar — his screenshot showed exactly that,
           one clip spanning the timeline — and every chip used to seize the gesture on pointerdown
           with stopPropagation + preventDefault. That kept the clip's OWN handler from ever running,
           so on that one row there was no scrub, no hold-to-move, and no scroll: every finger that
           landed hit a chip. Nothing was locked; the cues had simply eaten the surface.
           The clip is the default owner now. A finger has to SETTLE on a chip to take it — the same
           press-and-hold that grabs a clip — and 300ms beats the clip's own 350ms, so which one wins
           is decided by the clock, not by a race. Move first and the clip scrubs, exactly as it does
           on every other row. A mouse still grabs a cue immediately: a desktop drag on a chip is
           unambiguous and desktop scrolling is the wheel, which none of this touches. */
        const CUE_HOLD = 300;
        const beginCue = (mode, clientX, pointerId, captureEl) => {
          // The clip's pending gesture has to be torn down, not left running: its own hold timer is
          // 50ms behind and would otherwise fire mid-cue-drag and grab the clip as well.
          if (clipTap) { if (clipTap.holdTimer) clearTimeout(clipTap.holdTimer); clipTap = null; }
          try { if (captureEl && pointerId != null) captureEl.setPointerCapture(pointerId); } catch (_) {}
          cueDrag = { layer: layer, cue: cue, ci: ci, mode: mode, startX: clientX, s0: cue.start, e0: cue.end, moved: false, chip: chip };
          /* #149 — Ezra: "when dragging the cue length for captions it should show it changing live not
           * just wait for you to let go then jump."
           * This line was the cause, and it is not obvious from reading it. selectLayer() rebuilds the
           * timeline, which THROWS AWAY the chip element captured one line above — so every pointermove
           * afterwards restyled a node that was no longer in the document. Measured
           * (tests/_cuelive.html): the cue data moved live, and the chip's rendered width sat at 0.0 for
           * the whole drag and then stepped to 462.5 the instant the release rebuilt it. That is exactly
           * the jump he is describing, and it is why "the chip already updates live" was true of the
           * code and false on screen.
           * Two halves: don't rebuild when the layer is already selected (the common case — you drag a
           * cue on the track you are working on), and re-acquire the chip from the live DOM when a
           * rebuild does happen, so the drag is never left holding a detached node. */
          if (FM.scene.selectedId !== layer.id) FM.selectLayer(layer.id);
          if (FM.playing) FM.pause();
        };
        const seekToCue = () => {
          if (FM.scrubTime) FM.scrubTime((layer.start || 0) + cue.start + Math.min(0.05, (cue.end - cue.start) / 2));
        };
        const startCue = (e, mode) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          if (pinch) return;
          const captureEl = mode === 'move' ? chip : e.currentTarget;
          if (e.pointerType === 'touch' || e.pointerType === 'pen') {
            const x0 = e.clientX, y0 = e.clientY, pid = e.pointerId;
            let armed = true, timer = 0;
            const unwatch = () => {
              armed = false; clearTimeout(timer);
              window.removeEventListener('pointermove', watch, true);
              window.removeEventListener('pointerup', release, true);
              window.removeEventListener('pointercancel', unwatch, true);
            };
            const watch = (ev) => {
              if (ev.pointerId !== pid) return;
              if (Math.abs(ev.clientX - x0) > 8 || Math.abs(ev.clientY - y0) > 8) unwatch();   // travelling → it was a scrub/scroll all along
            };
            const release = (ev) => {
              if (ev.pointerId !== pid) return;
              const clean = armed && Math.abs(ev.clientX - x0) <= 8 && Math.abs(ev.clientY - y0) <= 8;
              unwatch();
              // A clean tap on a cue still parks the playhead on it, the way it did before the hold
              // existed — that readout is how you see which cue you are about to type into.
              if (clean) seekToCue();
            };
            timer = setTimeout(() => {
              if (!armed) return;
              unwatch();
              if (pinch) return;
              beginCue(mode, x0, pid, captureEl);
              if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
            }, CUE_HOLD);
            window.addEventListener('pointermove', watch, true);
            window.addEventListener('pointerup', release, true);
            window.addEventListener('pointercancel', unwatch, true);
            return;   // deliberately NOT stopping propagation: the clip keeps the gesture unless the hold fires
          }
          e.stopPropagation(); e.preventDefault();
          beginCue(mode, e.clientX, e.pointerId, captureEl);
        };
        chip.addEventListener('pointerdown', (e) => startCue(e, 'move'));
        chip.addEventListener('dblclick', (e) => {
          e.stopPropagation(); e.preventDefault();
          FM.selectLayer(layer.id);
          if (FM.scrubTime) FM.scrubTime((layer.start || 0) + cue.start + Math.min(0.05, (cue.end - cue.start) / 2));
          if (FM.textEdit) FM.textEdit.start(layer.id, { selectAll: true });
        });
        if (wide) ['l', 'r'].forEach(side => {
          const g = document.createElement('div');
          g.className = 'cap-cue-grip ' + side;
          g.addEventListener('pointerdown', (e) => startCue(e, side === 'l' ? 'trimL' : 'trimR'));
          chip.appendChild(g);
        });
        clip.appendChild(chip);
      });
    }
    lane.appendChild(clip);

    // keyframe diamonds for the selected layer (absolute project time, lane-relative px)
    if (layer.id === FM.scene.selectedId) {
      // ONE DIAMOND PER PROPERTY, not one per time (Ezra). Keyframes used to be merged: every
      // property that had a keyframe at 1.2s shared a single diamond, and dragging it retimed all of
      // them at once. Now each animated property owns its own, so a slider's keyframes are its own.
      //
      // TWO STATES, and the default is the quiet one (v5.42). Ezra, with AM screenshots: on first
      // tapping a layer "they're clearly showing you where they are but you can't move them yet or
      // hover over them or anything at all"; then, once he opens a specific property's editor, that
      // property's keyframes "become clear and highlighted when you go over them, whilst the others
      // stay as outlines."
      // So a keyframe is LIVE — solid, draggable, and lit when the playhead reaches it — only while
      // the editor that owns it is open. Everything else is a hollow outline and completely inert.
      // This inverts what nothing-focused used to mean: it made every keyframe on the layer live and
      // draggable, so simply selecting a clip armed a dozen diamonds you had no reason to touch.
      const focus = FM.kfFocusProps ? FM.kfFocusProps(layer) : null;
      const inFocus = (prop) => !!focus && focus.indexOf(prop) >= 0;
      const entries = [];
      FM.animatedProps(layer).forEach(prop => {
        const live = inFocus(prop);
        prop.kf.forEach(kf => entries.push({ prop: prop, kf: kf, t: Math.round(kf.t * 1000) / 1000, live: live }));
      });
      // outlines first so the live ones paint over them where they share a time
      entries.sort((a, b) => (a.live === b.live) ? 0 : (a.live ? 1 : -1));
      entries.forEach(entry => {
        const tt = entry.t;
        const dot = document.createElement('div');
        // colour by THIS keyframe's own easing (it used to take the first property that happened to
        // have a keyframe at this time, which was arbitrary once several shared one)
        const dotEase = entry.kf.e || (entry.kf.bez ? 'custom' : 'linear');
        const easeClass = dotEase === 'hold' ? 'ease-hold'
          : dotEase === 'linear' ? 'ease-linear'
            : (dotEase === 'overshoot' || dotEase === 'anticipate') ? 'ease-back'
              : dotEase === 'custom' ? 'ease-custom' : 'ease-smooth';
        dot.className = 'kf-dot ' + easeClass + (entry.live ? ' kf-live' : ' kf-idle');
        dot.style.left = (PAD + tt * pps) + 'px';
        dot.dataset.t = tt;   // updatePlayhead reads this to light the one under the playhead
        // An inert diamond must not advertise a gesture it will refuse. It keeps its title as a
        // sign-post to the thing that WOULD make it draggable.
        dot.title = entry.live
          ? 'Drag to retime · double-click to delete'
          : 'Open this property\u2019s editor to move this keyframe';
        dot.addEventListener('pointerdown', (e) => {
          e.stopPropagation(); e.preventDefault();
          if (e.pointerType === 'mouse' && e.button !== 0) return;   // right-click is the MENU, never a drag
          if (layer.locked || pinch) return;
          try { dot.setPointerCapture(e.pointerId); } catch (_) {}   // survive a release outside the window
          if (!entry.live) return;   // dimmed = belongs to a property you are not editing
          // ONLY this property's keyframe moves. Retiming every property that shared the time was
          // the merged behaviour Ezra asked to end.
          const kfs = [entry.kf];
          // orig: pre-drag times, so pinch-start/pointercancel can RESTORE instead of half-applying
          // HOLD TO DRAG (Ezra). A keyframe used to retime from the very first pixel, which made it
          // far too easy to nudge one while scrubbing past. Now the gesture has to be held before it
          // arms, and the diamond changes colour the moment it does, so you can see it is live.
          //
          // The 450ms touch timer that used to open the easing menu had to move: it fired BEFORE any
          // arm delay and nulled kfDrag, so a hold-to-drag could never have armed on a phone. The two
          // now share one hold — arm at KF_HOLD_MS, and if you let go without moving, that same hold
          // opens the menu instead. One gesture, both outcomes, and touch keeps its route in.
          kfDrag = { layer: layer, kfs: kfs, dot: dot, orig: kfs.map(k => k.t), armed: false,
                     downX: e.clientX, downY: e.clientY,   // where the press landed — the arm test measures travel FROM here
                     // Carry the menu opener WITH the gesture. Release is handled by a window-level
                     // pointerup (it has to be, or letting go off the diamond strands the drag), and
                     // openKfMenu lives in this per-diamond closure — calling it from there threw
                     // "openKfMenu is not defined" every single time, which killed the hold-to-open
                     // route into easing entirely. On touch that is the ONLY route: dblclick and
                     // right-click never fire on a finger.
                     openMenu: (mx, my) => openKfMenu(mx, my) };
          kfDrag.armTimer = setTimeout(() => {
            if (!kfDrag || kfDrag.dot !== dot) return;
            kfDrag.armTimer = 0;
            kfDrag.armed = true;
            dot.classList.add('kf-dragging');
            if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
          }, KF_HOLD_MS);
          if (FM.playing) FM.pause();
        });
        dot.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          deleteKeyframesAt(layer, tt, entry.prop);   // this diamond's property only — the dimmed ones behind it survive
          FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit();
        });
        const openKfMenu = (mx, my) => {
          if (!FM.contextMenu || !FM.EASE_PRESETS) return;
          // Easing is per-KEYFRAME too. It used to sweep every animated property that happened to have
          // a keyframe at this time, so easing a scale keyframe silently re-eased position as well.
          const items = Object.keys(FM.EASE_PRESETS).map(key => ({
            label: EASE_LABELS[key] || key,
            action: () => {
              entry.kf.bez = FM.EASE_PRESETS[key].slice(); entry.kf.e = key;
              FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit();
            },
          }));
          items.push({ sep: true });
          items.push({
            label: 'Hold (step)',
            action: () => {
              entry.kf.e = 'hold'; delete entry.kf.bez;
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
          // dblclick never reaches touch (the dot's pointerdown preventDefault suppresses it), so the
          // long-press menu is also the phone's route to DELETE
          items.push({ sep: true });
          items.push({ label: 'Delete keyframe', danger: true, action: () => {
            deleteKeyframesAt(layer, tt, entry.prop);   // scoped, same as double-click
            FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit();
          } });
          FM.contextMenu.show(mx, my, items);
        };
        dot.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); openKfMenu(e.clientX, e.clientY); });
        dot.title = 'Drag to retime · hold or right-click for easing/delete · double-click to delete';
        lane.appendChild(dot);
      });
    }
    return lane;
  }

  /* ---- THE ADD LAYER (queue 294) --------------------------------------------------------------
   * Ezra: "the plus button inside the creator menu is kind of on the nose… it looks very similar to what
   * a light motion has", and his idea for replacing it — "the ad button could instead of being a button
   * like that it could be a layer now… if you just tap anywhere on that line it'll open up the same
   * admin where you can add shapes or elements".
   * It is NOT a scene layer and must never become one: it is a row this function draws, so it cannot
   * reach the export, the layer count, history, or a saved project by construction rather than by being
   * filtered out of each of them in turn.
   * What it SAYS is his too, and short is the requirement: "when you start a new project… tap here to
   * start creating", and then "once you add stuff, it would obviously change" — followed immediately by
   * "just don't overexplain it". So: one line, two states, no helper text under it. */
  function addRowLabel() {
    return FM.scene.layers.length ? 'Tap to add a layer' : 'Tap here to start creating';
  }
  /* The drag survives the row being REBUILT, which it is on every boundary the finger crosses — the
     whole track list is re-laid so the row appears in its new place. The element that was grabbed is
     therefore gone by the second move, so the "being dragged" look has to be re-applied to whatever
     replaces it, and the pointer listeners live on `window` rather than on the grip for the same
     reason. Without this the row moved correctly and never looked grabbed. */
  let addDragging = false;

  function isPhoneNow() { return !!(FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone()); }

  /* ---- THE SOLO VIEW, AND THE SCROLL POSITION IT DESTROYS (queue 312) ---------------------------
   * His words: *"every time I click off of a layer it moves my position in the timeline so the layer is
   * at the bottom, when realistically it should be putting me back in the position i was"*.
   *
   * MEASURED AT 390x800 WITH TEN LAYERS, because the cause is not where it looks. rebuild() has
   * carried a scroll-preserving line since v2.44 and it is not broken — it reads scrollTop before the
   * DOM is emptied and writes it back afterwards, which is exactly right. The problem is that by the
   * time it reads, the number is already gone:
   *   · scrolled to 76 in a list 488 tall inside a 361 viewport
   *   · tap a layer -> the phone SOLO view draws ONE row, so the content is now SHORTER than the
   *     viewport and the browser clamps scrollTop to 0 on its own. Measured: 0.
   *   · tap off -> rebuild reads 0, restores 0, faithfully. Drift: -76.
   * Nothing in the app moved the timeline. The browser did, in the gap between the two rebuilds, and
   * every later read is of a position that has already been thrown away.
   *
   * So the position is captured on the way IN to solo — the last moment it still exists — and put back
   * on the way out. Re-capture is guarded: while solo, ordinary rebuilds (the playhead, a filmstrip
   * arriving) would otherwise capture the clamped 0 over the good value and the fix would erase itself.
   *
   * `soloLayerId` is shared with buildTracks rather than the condition being written twice. It is four
   * clauses long, and two copies of it are two chances for the capture to fire in a state the drawing
   * does not agree is solo — which is a bug that would look like this one and not be this one. */
  let preSoloScroll = null;
  function soloLayerId() {
    // Never while multi-selecting: you need every row visible to build the set.
    if (FM.selectMode || (FM.scene.selectedIds && FM.scene.selectedIds.length > 1)) return null;
    if (!isPhoneNow()) return null;
    const id = FM.scene.selectedId;
    return (id && FM.scene.layers.some(l => l.id === id)) ? id : null;
  }
  FM._soloLayerId = soloLayerId;   // seam: the suite asks the real condition, not a copy of it

  /* ---- THE EMPTY-TIMELINE STATE IS A FACT ABOUT THE SCENE, NOT ABOUT THE ADD ROW ----------------
   * This lived inside buildAddRow, and that is the oldest open bug in the list: *"Playhead missing when
   * a project opens. Needs an app restart to come back."* Two earlier rounds ruled out the open path —
   * the centreline is always in the DOM and always centred (`tests/_phopen.html`) — and the answer was
   * one step past where they stopped looking.
   *
   *   empty project on a phone -> the class goes ON, the big + fills the timeline, the playhead hides
   *   (queue 354, deliberately). Tap + and add your first layer. Every creator SELECTS what it made, a
   *   selected layer on a phone triggers the solo view, and the solo branch of buildTracks does not draw
   *   an Add row — so buildAddRow never ran, so the class was never taken off, so the playhead stayed
   *   hidden with a clip on screen. Measured at 380px (`tests/_phhead.html`): layers 1, .tl-empty-start
   *   still true, `display: none`. It came back on the next rebuild that was not soloed — tapping off the
   *   layer — or on a reload, which is the restart he reported.
   *
   * A flag describing "is the scene empty" cannot be computed inside a function that only runs in some of
   * the states it describes. It is applied from buildTracks now, which runs on EVERY rebuild, so no branch
   * can skip it. buildAddRow reads the same helper rather than a second copy of the condition. */
  function isEmptyStart() { return isPhoneNow() && !FM.scene.layers.length; }
  function applyEmptyStart() {
    const tlPanel = document.getElementById('timeline-panel');
    if (tlPanel) tlPanel.classList.toggle('tl-empty-start', isEmptyStart());
  }
  FM._isEmptyStart = isEmptyStart;   // seam: the suite asks the real condition, not a copy of it

  function buildAddRow() {
    /* TWO RENDERINGS, ONE IDEA (queue 294, clause 7). On a phone it is a layer: "an actual full layer".
       On PC he asked for something smaller — "instead of being like an actual full layer and like taking
       up all that face on the timeline instead it could just be a line between layers to signify where
       you're going to add" — because the desktop timeline shows many more rows and a full one would cost
       real estate the phone can spare. Same element, same index, same drag: only the skin differs. */
    const phone = isPhoneNow();
    const row = document.createElement('div');
    /* NOT a `.track-row`, deliberately. It carried that class while it was phone-only and nothing
       noticed; the moment it appeared on the desktop too, a grouping test counting rows found one more
       than there were layers and failed — correctly, because the app was telling it there was an extra
       track. Everything that walks the timeline asks for `.track-row`, and this is not one: it has no
       layer, no clip, no index. It brings its own layout instead of borrowing that class's. */
    /* EMPTY PROJECT → the row IS the timeline (queue 326). His words: "make the tap to start creating
       button actually take up the whole timeline while the projects empty and have it so the plus button
       is big and in the middle, this should make it very apparent and obvious for beginners on how to
       start". Only while there is nothing to show: the moment a clip exists it goes back to the slim row,
       which is the state his second screenshot shows and which must not change. */
    const empty = isEmptyStart();
    /* AND THE PLAYHEAD GOES WITH IT (queue 354). Ezra, with a screenshot of exactly this: "Hide the
       player head while the add button is big". The fixed-centre line is drawn straight down through
       the + and through the label, and in an empty project it is pointing at nothing — there is no
       clip to scrub past it, so it is a ruler over a blank page sitting on top of the one control that
       matters. The flag goes on the PANEL rather than on the row because #tl-centerline is a sibling
       of #timeline, not a descendant of it, so a class on the row could never reach it — and it is
       applied from buildTracks, not from here, because this function does not run in every state the
       flag has to be right in. See isEmptyStart above. */
    row.className = 'tl-addrow' + (phone ? '' : ' tl-addrow--line') + (empty ? ' tl-addrow--empty' : '') + (addDragging ? ' tl-addrow-dragging' : '');
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.setAttribute('aria-label', phone ? addRowLabel() : 'Where new layers go — click to add, drag to move');
    const inner = document.createElement('div');
    inner.className = 'tl-addrow-inner';
    /* AN SVG CROSS, NOT THE CHARACTER "+" (queue 296). His report was that it "isn't centred inside the
       circle", and it was not: flex centring centres the LINE BOX, and where a glyph's ink sits inside
       that box is up to the font — so it can look level on one screen and high on another. Exactly the
       same finding as the × and the magnifier in queue 209, which were fixed the same way. Two strokes
       about (12,12) are symmetric by construction, so no font can move them again. */
    const plus = document.createElement('span');
    plus.className = 'tl-addrow-plus';
    plus.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.6v12.8M5.6 12h12.8"/></svg>';
    const label = document.createElement('span');
    label.className = 'tl-addrow-label'; label.textContent = phone ? addRowLabel() : 'New layers go here';
    /* THE + GETS THE HEAD COLUMN, THE TEXT GETS THE LANE (queue 417). Ezra: "Re design the add layer to
       make it cut off at the line all the others cut off at and make it so on the left over the line the
       plus button will be there and centred and on the right will be the text saying tap here to add
       layer."
       Every other row is head + lane, split by a rule at `--head-w`; this one was a single box with both
       marks huddled at the left, which is why it never lined up with anything. Wrapping the + in a box of
       exactly `--head-w` puts the divider on the same pixel as every other row's by construction rather
       than by a number copied here. */
    const head = document.createElement('span');
    head.className = 'tl-addrow-head';
    head.appendChild(plus);
    inner.append(head, label);
    row.appendChild(inner);
    const open = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      /* On a phone this is the sheet the + button used to open. On PC there is no + and no sheet — the
         add menu IS the inspector band whenever nothing is selected — so "open the add menu" is a
         deselect. Clause 9: "you would just click on them line". */
      if (phone) { if (FM.mobile && FM.mobile.openAdd) FM.mobile.openAdd(); }
      else if (FM.selectLayer) FM.selectLayer(null);
    };
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') open(e); });
    if (phone) {
      row.addEventListener('click', open);
      row.appendChild(buildAddGrip(row));      // ≡ on the right, like every other row
    } else {
      attachLineDrag(row, open);               // the line is both the button and the handle
      /* THE THREE LINES AS A HINT, NOT A HANDLE (queue 307, clauses 2 and 3). His words: *"when you're
         hovering over it the three lines of the right sho[w] up but you don't need to grab it from the
         three lines. It's just there to demonstrate that you can move it and also maybe just make it
         through the three lines extend out a bit longer and then like slowly fade out so it's like the
         whole thing is like you can drag it from anywhere"*.
         So this is deliberately NOT `buildAddGrip`, which is the phone's real handle and owns its own
         pointer listeners. Dragging from anywhere already worked on PC — `attachLineDrag` is on the row
         — and what was missing was any sign of it. A second element that also captured the pointer
         would take the gesture away from the row and make the hint the only place that worked, which is
         the opposite of what he asked for. It carries no listeners and no pointer events at all. */
      const hint = document.createElement('div');
      hint.className = 'tl-addrow-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.innerHTML = '<span></span><span></span><span></span>';
      row.appendChild(hint);
    }
    return row;
  }

  /* ON PC THE LINE IS BOTH (clauses 9 and 10): "you would just click on them line", and "then you can
   * drag it up and down". One element, two gestures, told apart by whether the pointer travelled — a
   * threshold rather than a timer, because a timer makes a deliberate click feel slow and a slow drag
   * feel like a click. Below the threshold the pointerup fires the click; past it the drag takes over
   * and the click is swallowed, or every reposition would also open the menu. */
  function attachLineDrag(row, open) {
    const SLOP = 4;
    let down = false, moved = false, y0 = 0, motion = null, wantAt = 0;
    /* THE LIST SCROLLS WITH YOU (queue 411). Ezra: "On pc trying to drag down the add layer doesn't drag
       the screen down with it so you have to let go and then swipe down then pick it up again which is
       annoying."
       Every other vertical drag in this timeline already does this — the reorder handle and paint-select
       both arm an eased, time-based edge scroll — and this one, the newest, simply never got it. Same
       shape and the same numbers as those two (44px zone, 520px/s top speed, eased by depth², clamped dt
       so a stalled frame cannot lurch), so the three feel identical under the finger.
       The drop boundary is recomputed on every scrolled frame, not just on pointermove: with a still
       finger at the edge the rows travel underneath it, and a marker that only updated on movement would
       sit frozen while the list slid past.
       ⚠️ This is the THIRD local copy of this loop in the file. Extracting one helper is the right
       follow-up; doing it here would mean rewriting two working gestures at the same time as fixing a
       third, which is a worse trade than one more copy. */
    const EDGE = 44;
    let autoRAF = 0, lastEv = null, lastT = 0, scrollAcc = 0;
    const stopAuto = () => { if (autoRAF) cancelAnimationFrame(autoRAF); autoRAF = 0; lastT = 0; scrollAcc = 0; };
    function autoScroll(now) {
      autoRAF = 0;
      if (!down || !moved || !lastEv || !timelineEl || !motion) return;
      const vr = timelineEl.getBoundingClientRect(), y = lastEv.clientY;
      let dir = 0, depth = 0;
      if (y < vr.top + EDGE) { dir = -1; depth = (vr.top + EDGE - y) / EDGE; }
      else if (y > vr.bottom - EDGE) { dir = 1; depth = (y - (vr.bottom - EDGE)) / EDGE; }
      if (!dir) { lastT = 0; scrollAcc = 0; return; }
      depth = Math.min(1, depth); depth *= depth;
      const t = now || performance.now();
      const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;
      lastT = t;
      scrollAcc += dir * 520 * depth * dt;
      const step = Math.trunc(scrollAcc);
      if (step) {
        scrollAcc -= step;
        const b = timelineEl.scrollTop; timelineEl.scrollTop = b + step;
        if (timelineEl.scrollTop !== b) { wantAt = motion.boundaryAt(y); motion.to(wantAt, y - y0); }
      }
      autoRAF = requestAnimationFrame(autoScroll);
    }
    const move = (e) => {
      if (!down) return;
      lastEv = e;
      if (!moved && Math.abs(e.clientY - y0) < SLOP) return;
      if (!moved) {
        moved = true; addDragging = true; row.classList.add('tl-addrow-dragging');
        motion = addDragMotion(row); motion.begin();     // snapshot BEFORE anything moves
      }
      e.preventDefault();
      wantAt = motion.boundaryAt(e.clientY);
      motion.to(wantAt, e.clientY - y0);
      if (timelineEl) {
        const vr = timelineEl.getBoundingClientRect();
        if ((e.clientY < vr.top + EDGE || e.clientY > vr.bottom - EDGE) && !autoRAF) { lastT = 0; autoRAF = requestAnimationFrame(autoScroll); }
      }
    };
    const finish = () => {
      addDragging = false;
      row.classList.remove('tl-addrow-dragging');
      FM.addAt = wantAt;
      if (FM.syncAddSwitch) FM.syncAddSwitch();   // the switch leans with the DRAG too (queue 373 clause 6) — these two paths set addAt directly, not through moveAddMarker
      buildTracks();          // the ONE rebuild of the whole gesture, after the marker has landed
    };
    const end = (e) => {
      if (!down) return;
      down = false;
      stopAuto();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (moved && motion) { motion.settle(wantAt, finish); motion = null; }
      else if (!moved) open(e);
      moved = false;
    };
    row.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; moved = false; y0 = e.clientY;
      e.preventDefault();
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
  }

  /* The insertion point nearest the pointer, read off the LAYER rows on screen. Each row votes for the
   * boundary above it or below it depending on which half the pointer is in, which is the same rule a
   * drag-to-reorder uses and the reason it feels like one. Shared by the phone's ≡ grip and the PC
   * line, because two copies of this would be two things to keep agreeing about where "between" is. */
  function boundaryFor(clientY) {
    const rows = [].slice.call(tracksEl.querySelectorAll('.track-row'));
    if (!rows.length) return 0;
    const idxOf = (r) => {
      const hd = r.querySelector('.track-head');
      const i = hd ? parseInt(hd.dataset.idx, 10) : NaN;
      return isFinite(i) ? i : FM.scene.layers.length;
    };
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return idxOf(rows[i]);
      if (clientY < r.bottom) return idxOf(rows[i]) + 1;
    }
    return FM.scene.layers.length;
  }

  /* DRAGGING IT (queue 294, clauses 3, 6 and 10). "you can move this layer up and down like you can
   * move every other layer like you can press the three lines on the right side drag it up and down".
   * So it gets the same ≡ grip in the same place, and the grip — not the row — is what drags: the row
   * itself is one big tap target that opens the add menu, and a control that both opens a sheet and
   * reorders on the same gesture would fire the wrong one half the time.
   * The layers' own reorder is not reused, deliberately. That code moves an entry inside
   * scene.layers and is keyed by a layer index; this row is not a layer and moves nothing — it only
   * changes a number. Borrowing it would have meant teaching it about a row that has no layer, which
   * is how the two would drift. */

  /* ---- DRAGGING THE MARKER SMOOTHLY (queue 307, clause 4) ---------------------------------------
   * His words: *"make it so on PC and on mobile that when you're actually dragging the new layers go
   * here or add new layer thing… it should drag smoothly and like show the cool animation like when
   * I'm dragging layers because currently it kind of just jumps and it's a bit shitty looking"*.
   *
   * THE JUMP WAS THE REBUILD. Both drags did `FM.addAt = at; buildTracks()` on every pointermove —
   * so the marker did not move at all, the entire track list was thrown away and re-laid with the
   * marker in a different slot. That is a teleport by construction, and no amount of easing on the row
   * could have smoothed it, because the row you were looking at no longer existed a frame later.
   *
   * So nothing is rebuilt until the finger lifts. The marker follows the pointer on a transform, the
   * rows it passes glide aside to open a gap, and on release the marker glides into that gap before the
   * single real rebuild happens underneath it. That is the same three-part shape the layer reorder uses
   * — which is what he means by "the cool animation like when I'm dragging layers" — and it reuses that
   * feature's `.row-part` transition rather than declaring a second one that could be retuned alone.
   *
   * GEOMETRY IS SNAPSHOTTED AT THE START and never re-read, because every row is under a transform for
   * the rest of the gesture and `getBoundingClientRect` reports the TRANSFORMED box. Asking the live
   * DOM where the boundaries are, mid-drag, would be asking about positions the rows only hold because
   * of the drag itself — the answer would chase its own tail. `boundaryAt` is therefore the snapshot's
   * own copy of `boundaryFor`, and takes the same rule.
   * The marker's height is re-read each move rather than captured: on PC the line GROWS from 7px to
   * 24px when the dragging class lands, on a transition, so a height read at the start of the gesture
   * is the wrong one for every frame after it, and the gap would be a third of the marker.
   */
  function addDragMotion(rowEl) {
    const rows = [].slice.call(tracksEl.querySelectorAll('.track-row')).map(r => {
      const hd = r.querySelector('.track-head');
      const i = hd ? parseInt(hd.dataset.idx, 10) : NaN;
      const b = r.getBoundingClientRect();
      return { el: r, idx: isFinite(i) ? i : FM.scene.layers.length, top: b.top, bottom: b.bottom };
    });
    const markerTop = rowEl.getBoundingClientRect().top;
    const slot0 = FM.clampAddAt ? FM.clampAddAt() : (FM.addAt || 0);
    const markerH = () => rowEl.getBoundingClientRect().height;
    const shiftFor = (at, idx, h) => {
      if (at > slot0 && idx >= slot0 && idx < at) return -h;   // it was below the marker, now it is above
      if (at < slot0 && idx >= at && idx < slot0) return h;    // …and the other way
      return 0;
    };
    const gapTop = (at, h) => {
      const below = rows.filter(r => r.idx >= at)[0];
      if (below) return below.top + shiftFor(at, below.idx, h);
      const last = rows[rows.length - 1];
      return last ? last.bottom + shiftFor(at, last.idx, h) : markerTop;
    };
    const clear = () => { rows.forEach(r => { r.el.classList.remove('row-part'); r.el.style.transform = ''; }); rowEl.style.transform = ''; };
    return {
      any: rows.length > 0,
      boundaryAt(y) {
        if (!rows.length) return 0;
        for (let k = 0; k < rows.length; k++) {
          if (y < rows[k].top + (rows[k].bottom - rows[k].top) / 2) return rows[k].idx;
          if (y < rows[k].bottom) return rows[k].idx + 1;
        }
        return FM.scene.layers.length;
      },
      begin() { rows.forEach(r => r.el.classList.add('row-part')); },
      to(at, dy) {
        const h = markerH();
        rowEl.style.transform = 'translateY(' + Math.round(dy) + 'px)';
        rows.forEach(r => { r.el.style.transform = 'translateY(' + shiftFor(at, r.idx, h) + 'px)'; });
      },
      settle(at, done) {
        rowEl.classList.add('tl-addrow-settling');
        rowEl.style.transform = 'translateY(' + Math.round(gapTop(at, markerH()) - markerTop) + 'px)';
        setTimeout(() => { clear(); rowEl.classList.remove('tl-addrow-settling'); done(); }, 165);
      },
      abort() { clear(); },
    };
  }

  function buildAddGrip(row) {
    const grip = document.createElement('div');
    grip.className = 'tl-addrow-grip';
    grip.setAttribute('aria-label', 'Drag to choose where new layers go');
    grip.innerHTML = '<span></span><span></span><span></span>';
    let dragging = false, motion = null, wantAt = 0, y0 = 0;
    const move = (e) => {
      if (!dragging) return;
      e.preventDefault();
      wantAt = motion ? motion.boundaryAt(e.clientY) : boundaryFor(e.clientY);
      if (motion) motion.to(wantAt, e.clientY - y0);
      /* AND THE SWITCH COMES WITH IT (queue 438, his second case: "or the main create layer").
         `wantAt` is already the live answer — the row is drawn at it on every move — but `FM.addAt` is
         not written until `finish`, deliberately: the drop settles with an animation and a cancelled
         drag must leave the index alone. Measured before this line: dragging the grip the length of the
         list left the switch on 0.50 for the whole gesture and then snapped it to 1.00 on release.
         Published on the same channel the layer reorder uses, so there is ONE rule for "where is the
         add row right now" rather than two that can disagree. */
      FM.dragAddAt = wantAt;
      if (FM.syncAddSwitch) FM.syncAddSwitch();
    };
    const finish = () => {
      addDragging = false;
      row.classList.remove('tl-addrow-dragging');
      FM.addAt = wantAt;
      FM.dragAddAt = null;                        // the real index is authoritative again
      if (FM.syncAddSwitch) FM.syncAddSwitch();   // the switch leans with the DRAG too (queue 373 clause 6) — these two paths set addAt directly, not through moveAddMarker
      buildTracks();          // the ONE rebuild of the whole gesture (queue 307 clause 4)
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (motion) { const m = motion; motion = null; m.settle(wantAt, finish); }
      else { addDragging = false; row.classList.remove('tl-addrow-dragging'); FM.dragAddAt = null; if (FM.syncAddSwitch) FM.syncAddSwitch(); }
    };
    grip.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();      // never let the grip's press also open the add menu
      dragging = true; addDragging = true; y0 = e.clientY;
      wantAt = FM.clampAddAt ? FM.clampAddAt() : (FM.addAt || 0);
      row.classList.add('tl-addrow-dragging');
      motion = addDragMotion(row); motion.begin();
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
    grip.addEventListener('click', (e) => { e.stopPropagation(); });
    return grip;
  }
  /* PHONE ONLY so far. His PC half is a different shape — "instead of being like an actual full layer…
     it could just be a line between layers" — and is not built yet; on a desktop the add menu is
     already a permanent panel rather than a button, so nothing there is replaced by this. */
  /* A GROUP CONTEXT WHOSE GROUP IS GONE IS NOT A GROUP CONTEXT (queue 307, clause 1). His report:
     *"Just had a glitch on PC with the ad layers here button like disappeared and had to refresh my page
     for it's like a little plus button to come back"*.
     `FM.groupContext` is a bare id held in app.js, and everything that draws the timeline gates on it:
     the Add-layer marker is hidden inside a group (see below), and `inSubtree` decides which rows are
     drawn at all. If that id ever outlives its group — the group deleted while its owner did not clear
     the context, an undo that rebuilt the layer objects, a project swapped underneath it — then
     `inSubtree` matches nothing, `addRowWanted` is false, and the marker is gone until a reload puts
     the id back to null. Which is exactly the shape of what he saw.
     So it heals rather than being trusted: one read, checked against the live scene, clearing itself if
     the group has gone. Cheap (a `some` over the layer list, once per build) and it cannot be forgotten
     by a future caller the way a note asking people to clear it could be. */
  function liveGroupCtx() {
    const id = FM.groupContext;
    if (!id) return null;
    if (FM.scene.layers.some(l => l.id === id && l.type === 'group')) return id;
    FM.groupContext = null;
    if (document.body) document.body.classList.remove('group-editing');
    return null;
  }
  FM._liveGroupCtx = liveGroupCtx;    // seam: the suite drives the stale case through the real function

  function addRowWanted() {
    /* Both platforms now — the phone as a layer, the desktop as a line (clause 7).
       NOT inside Edit Group: `FM.insertLayer` deliberately ignores the index there (a flat index means
       nothing in a subtree), so showing a marker that promises to place things would be a lie. */
    return !liveGroupCtx();
  }

  function buildTracks() {
    tracksEl.innerHTML = '';
    applyEmptyStart();   // every rebuild, every branch — see isEmptyStart
    /* RESERVE THE CHEVRON COLUMN ONLY WHEN A GROUP EXISTS (queue 295). Every childless layer carries a
     * `visibility: hidden` chevron so that a group row and a plain row at the same depth line up (#191
     * — "the arrow pushes the ui over making it ugly"). That is worth 22px in a project that HAS a
     * group, and it is 22px of dead strip down the left of every row in a project that does not — which
     * is what he photographed: "you've left a bunch of dead space on the far left side".
     * Nothing needs aligning when there is nothing to align WITH, so the column is only held open while
     * the scene actually contains a group. The alignment invariant is untouched the moment one exists. */
    /* ON #tl-inner, NOT #tl-tracks — and that one word is the whole of queue 334.
     * This class carries `--head-w: 72px`, the narrow track-head a project without groups gets. It used
     * to live on #tl-tracks, and the RULER ROW is a sibling of that element, not a child: a custom
     * property cascades DOWN, so the ruler kept the 90px default while the lanes rendered at 72. The
     * ruler — and therefore every tick and every benchmark pin on it — sat 18px to the RIGHT of the
     * clips and of the playhead line that share their origin. He reported it as "when I add benchmarks
     * they don't add where my playhead is", and he was reading it exactly right.
     * This is the SAME defect as v9.29 (queue 327), which fixed the JS side and left the CSS side: there,
     * the maths read the variable off the wrong element; here, the variable was declared on one. Putting
     * it on the shared ancestor is what makes both halves of the timeline agree by construction. The
     * class stays on #tl-tracks too, because .tl-no-groups .th-chevron--empty keys off it. */
    const noGroups = !FM.scene.layers.some(l => l.type === 'group');
    tracksEl.classList.toggle('tl-no-groups', noGroups);
    if (innerEl) innerEl.classList.toggle('tl-no-groups', noGroups);
    if (!FM.scene.layers.length) {
      /* On a phone the Add row IS the empty state — it says "tap here to start creating", which is both
         the invitation and the control, so a sentence above it explaining the same thing is the exact
         over-explaining he asked me to stop doing. */
      if (addRowWanted()) { tracksEl.appendChild(buildAddRow()); return; }
      const empty = document.createElement('div');
      empty.className = 'tl-empty'; empty.textContent = 'No layers yet — Import media, add Text, Captions, or a Sample clip.';
      tracksEl.appendChild(empty);
      return;
    }
    // AM phone-edit: when a clip is selected on a phone, show ONLY that clip's row
    // (the others hide so the property options can dock right under it).
    // Never solo during multi-select / select-mode — you need every row visible to build the set.
    const soloId = soloLayerId();
    const gctx = liveGroupCtx();
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
    /* AT ITS OWN INDEX (queue 294, clause 5). The row is drawn before the layer that currently sits at
       FM.addAt, and FM.insertLayer splices new layers at that same number — so what you add appears
       directly BELOW the row, exactly as he described, and the row stays where you left it. */
    if (addRowWanted() && !soloId) {
      const at = FM.clampAddAt ? FM.clampAddAt() : 0;
      /* Counted against the rows ON SCREEN rather than scene.layers, because a collapsed group hides
         members: the marker belongs beside what the eye can see. */
      const before = [].slice.call(tracksEl.children).filter(r => {
        const hd = r.querySelector && r.querySelector('.track-head');
        const i = hd ? parseInt(hd.dataset.idx, 10) : -1;
        return isFinite(i) && i >= at;
      })[0];
      tracksEl.insertBefore(buildAddRow(), before || null);
    }
  }

  // ---- inertial scrubbing: a flick keeps gliding after you let go, decelerating to a stop ----
  /* Named constants rather than literals, and EXPOSED, because of queue 116: the effect sliders were
   * built to share this feel, queue 103 retuned the number here from 0.9 to 0.947, and the sliders
   * were left on the old value under a comment saying they matched. Two things meant to feel the same
   * drifted apart in silence for months. The suite now asserts they are equal, which needs both sides
   * readable from outside. */
  const MOM_FRICTION = 0.947, MOM_MAX_V = 0.028, MOM_STOP = 2.2e-4;
  let momentumRAF = 0;
  function stopMomentum() { if (momentumRAF) { cancelAnimationFrame(momentumRAF); momentumRAF = 0; } }
  /* Exposed for the suite (queue 351). Whether a released swipe FLINGS is the whole difference between
     a scrub that feels smooth and one that stops dead, and it cannot be read off the playhead position
     afterwards — a glide that is legitimately tiny and a glide that never started look the same. So the
     release velocity is recorded here, at the one place both gesture paths have to come through. */
  let _lastFling = null;
  function startMomentum(vTimePerMs) {   // vTimePerMs = project-seconds per ms at release
    _lastFling = { v: vTimePerMs, at: performance.now() };
    stopMomentum();
    let v = vTimePerMs;
    if (!isFinite(v) || Math.abs(v) < 4e-5) return;     // too gentle to bother → just settle
    /* GLIDE LENGTH (queue 103). Ezra: "the glide ends too quick, it should glide a bit more … and be
     * able to get to the other side a bit quicker."
     * The distance a flick covers is v0 * 16.67 / (1 - friction), so FRICTION is the lever, not the
     * launch speed: throwing it harder would make short flicks overshoot while leaving the long tail —
     * the part he can actually feel — just as short. At 0.9/frame a full-speed flick travelled ~3.7s
     * of timeline; 0.947 takes the same flick to ~8.8s. The velocity clamp is raised only modestly,
     * from 0.022 to 0.028, so a deliberate hard flick crosses more ground without a light one
     * becoming twitchy. The stop threshold comes down with it, because at the old 5e-4 the tail was
     * being cut off while still visibly moving — which is itself part of "ends too quick". */
    v = Math.max(-MOM_MAX_V, Math.min(MOM_MAX_V, v));
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(48, now - last); last = now;
      v *= Math.pow(MOM_FRICTION, dt / 16.67);          // friction per frame — see the note above
      let t = FM.time + v * dt;
      const dur = FM.scene.project.duration;
      if (t <= 0) { t = 0; v = 0; } else if (t >= dur) { t = dur; v = 0; }
      FM.scrubTime(t, true);                            // no per-frame snap → smooth glide (coalesced render/seek)
      if (Math.abs(v) > MOM_STOP) momentumRAF = requestAnimationFrame(step);   // stop once it is imperceptible
      else { momentumRAF = 0; FM.setTime(FM.time); }    // settle onto the exact frame
    };
    momentumRAF = requestAnimationFrame(step);
  }

  /* VERTICAL GLIDE (queue 415). Ezra: "Scrolling up and down on timeline should have some glide to it
     like dragging left and right."
     "Like dragging left and right" is the specification, so this shares the horizontal fling's CONSTANTS
     rather than getting its own — `MOM_FRICTION` is the same lever queue 103 tuned by feel, and a second
     number here would drift from it exactly the way the effect sliders did (see the note above those
     constants, which exists because that already happened once).
     It has to be written at all because `#timeline` is `touch-action: none` and JS owns every gesture, so
     there is no native scroll inertia to inherit — the vertical branch panned `scrollTop` directly and
     stopped dead on release while the horizontal branch flung. */
  let scrollMomRAF = 0;
  function stopScrollMomentum() { if (scrollMomRAF) { cancelAnimationFrame(scrollMomRAF); scrollMomRAF = 0; } }
  let _lastScrollFling = null;
  FM._tlLastScrollFling = function () { return _lastScrollFling; };   // suite seam: did the release FLING?
  function startScrollMomentum(vPxPerMs) {
    _lastScrollFling = { v: vPxPerMs, at: performance.now() };
    stopScrollMomentum();
    let v = vPxPerMs;
    if (!timelineEl || !isFinite(v) || Math.abs(v) < 0.02) return;     // too gentle to bother
    v = Math.max(-4.2, Math.min(4.2, v));                             // px/ms cap ≈ a hard flick
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(48, now - last); last = now;
      v *= Math.pow(MOM_FRICTION, dt / 16.67);                        // the SAME friction as the horizontal fling
      const b = timelineEl.scrollTop;
      timelineEl.scrollTop = b + v * dt;
      if (timelineEl.scrollTop === b) { scrollMomRAF = 0; return; }   // hit an end — stop rather than spin
      if (Math.abs(v) > 0.01) scrollMomRAF = requestAnimationFrame(step);
      else scrollMomRAF = 0;
    };
    scrollMomRAF = requestAnimationFrame(step);
  }

  function beginScrub(e) {
    stopMomentum();                                     // a fresh grab kills any in-flight glide
    stopScrollMomentum();                               // …the vertical one too (queue 415)
    dragging = true;
    try { innerEl.setPointerCapture(e.pointerId); } catch (_) {}   // a released/synthetic pointerId throws NotFoundError; every other call site in this app already guards
    if (FM.playing) FM.pause();
  }

  // Apply a trim to trimDrag.layer for a pointer at clientX. SCROLL-AWARE: the delta counts both finger
  // movement AND how far the timeline has auto-scrolled since the grab, so when the view scrolls out from
  // under the finger the edge keeps tracking it (the screen-edge position stays put while the clip grows).
  function applyTrimAt(clientX) {
    if (!trimDrag) return;
    const fps = FM.scene.project.fps || 30, pps = pxPerSec();
    let dt = Math.round((((clientX - trimDrag.startX) + (timelineEl.scrollLeft - trimDrag.startScroll)) / pps) * fps) / fps;
    // CRITICAL: an animated speed prop is an OBJECT — the old `L.speed || 1` divided by it → NaN
    // durations that collapsed the whole timeline. Ramped speed goes through the integral instead.
    const L = trimDrag.layer, ramped = FM.isAnimated(L.speed), sp = ramped ? 1 : (L.speed || 1);
    const movingEdge = trimDrag.edge === 'right' ? (trimDrag.start + trimDrag.dur + dt) : (trimDrag.start + dt);
    const se = snapEdge(L, movingEdge, pps, trimDrag.sup);
    if (se.snapped) { dt += (se.guide - movingEdge); showSnap(se.guide); } else hideSnap();
    /* A REVERSED CLIP'S ENDS ARE SWAPPED, and this function did not know (BUG-HUNT: "Trim grips ignore
       layer.reversed — trimming a reversed video edits the wrong end of the source and drops footage").
       `FM.layerLocalTime` evaluates a reversed clip as `trimStart + (duration*sp - adv)`, so its FIRST
       frame is the source window's END and its LAST frame is the window's START. Every edit below was
       therefore applied to the opposite end from the one being dragged: cutting 2s off the head of a
       reversed clip threw away 2s of the TAIL and shifted every remaining frame.
       The rest of the app already branches on this — `splitLayer` does, and the inspector's Trim-start
       button refuses on a reversed clip rather than get it wrong — so this is the odd one out, not a new
       idea. */
    const rev = L.type === 'video' && !!L.reversed;
    if (trimDrag.edge === 'right') {
      let nd = Math.max(0.1, trimDrag.dur + dt);
      if (rev) {
        /* The TAIL is the window START. Lengthening the clip consumes source BELOW trimStart, so the
           window end is held and trimStart comes down — and the limit is trimStart reaching 0, not
           `srcDur - trimStart`, which is the head's limit and would have let this run off the source. */
        const extra = (nd - trimDrag.dur) * sp;
        let nt = trimDrag.trim - extra;
        if (nt < 0) { nd = Math.max(0.1, trimDrag.dur + trimDrag.trim / sp); nt = 0; }
        L.trimStart = nt;
        L.duration = nd;
      } else {
        if (L.type === 'video' && isFinite(trimDrag.srcDur)) nd = Math.min(nd, FM.maxDurForSource(L, trimDrag.srcDur - L.trimStart, nd));
        L.duration = nd;
      }
    } else {
      let delta = dt;
      if (trimDrag.start + delta < 0) delta = -trimDrag.start;
      if (trimDrag.dur - delta < 0.1) delta = trimDrag.dur - 0.1;
      if (rev) {
        /* The HEAD is the window END, and the window end IS `trimStart + duration*sp` — so shortening
           from the head is purely a duration change and `trimStart` must not move. Growing it walks the
           window end up through the source, which is what has to be clamped. */
        if (isFinite(trimDrag.srcDur)) {
          const maxDur = (trimDrag.srcDur - trimDrag.trim) / sp;
          if (trimDrag.dur - delta > maxDur) delta = trimDrag.dur - maxDur;
        }
        L.start = trimDrag.start + delta;
        L.duration = trimDrag.dur - delta;
      } else {
        const spL = ramped ? FM.speedAt(L, trimDrag.start + delta) : sp;   // local source rate at the new head
        if (L.type === 'video' && trimDrag.trim + delta * spL < 0) delta = -trimDrag.trim / spL;
        L.start = trimDrag.start + delta;
        L.duration = trimDrag.dur - delta;
        if (L.type === 'video') L.trimStart = trimDrag.trim + delta * spL;
      }
    }
    // belt-and-braces: a non-finite number must NEVER reach the scene (it cascades into every layout)
    if (!isFinite(L.duration) || L.duration < 0.1) L.duration = trimDrag.dur;
    if (!isFinite(L.start)) L.start = trimDrag.start;
    if (L.trimStart != null && !isFinite(L.trimStart)) L.trimStart = trimDrag.trim;
    const pps2 = pxPerSec();
    const clipEl = tracksEl.querySelector('.clip[data-id="' + L.id + '"]');
    if (clipEl) { clipEl.style.left = (PAD + L.start * pps2) + 'px'; clipEl.style.width = Math.max(8, L.duration * pps2) + 'px'; }
    // widen the scroller (current pps — no rescale) so the extending edge + auto-scroll have room
    if (innerEl) {
      // …and the same scrollport, for the same reason (queue 396): this widens the scroller DURING a trim,
      // so a window-sized pad here would put the 346px of dead space straight back the moment you dragged.
      const need = (laneViewW() + HEAD_W) + Math.max(FM.scene.project.duration, L.start + L.duration) * pps2 + 120;
      if ((parseFloat(innerEl.style.width) || 0) < need - 0.5) innerEl.style.width = need + 'px';
    }
    FM.requestRender();
  }

  /* The placement half of a clip-body drag, lifted out of the pointermove handler so the edge-scroll
   * loop can re-run it with the finger standing still. Same maths as before, and only one copy of it:
   * a second copy is how a clip ends up in one place while the guide says another. (queue 115)
   *
   * Deliberately NOT done by dispatching a synthetic pointermove, which is how the previous attempt
   * reused the handler. Every other drag handler in the app also listens on window, so a replayed
   * event reached edit-points and the text editor too — two of the three unrelated tests that attempt
   * turned red. A direct call reaches the timeline and nothing else. */
  /* The lowest start the PRIMARY may take so that no member of the selection goes under its own
     floor. Pure, and exported, because the drag itself needs pointer events and a live DOM — this is
     the whole of the logic that was wrong, so this is the part worth being able to test directly. */
  function groupDragFloor(primaryDuration, primaryOrigStart, group) {
    let minDelta = -(primaryDuration - 0.1) - primaryOrigStart;
    (group || []).forEach(g => {
      const d = -(g.duration - 0.1) - g.origStart;
      if (d > minDelta) minDelta = d;
    });
    return primaryOrigStart + minDelta;
  }
  FM._groupDragFloor = groupDragFloor;

  function applyClipMoveAt(x, shiftKey, quiet) {
    if (!clipMove || !tracksEl) return;
    const pps = pxPerSec();
    const dx = x - clipMove.startX;
    // AM: a clip can be dragged PAST 0 into negative start — it keeps going (you just can't scroll
    // before 0 to see the hidden part). Floor it so at least a sliver stays at/after 0 (never vanishes).
    /* ONE FLOOR FOR THE WHOLE SELECTION (BUG-HUNT). Each clip used to be floored against its OWN
       duration — the primary here, every secondary below — so the moment a SHORT clip hit its floor it
       stopped following the shared delta while the longer ones kept going. The offsets between the
       selected clips silently changed, and pointerup committed it: shiftLayerKeyframes runs per layer
       with each layer's own actual delta, autoFitDuration runs, history commits. The arrangement moved
       by an amount nobody dragged, with no warning — each bar just stopped on its own.
       The code a thousand lines up already states the invariant this broke: "a touch hold-move on one
       selected clip must not silently break the others' relative sync".
       So: find the smallest delta ANY member can take, and floor the primary by that. The selection
       then stops as a unit the instant its most-constrained member would go under.
       With nothing else selected this is exactly the old expression — origStart cancels — so a
       single-clip drag is unchanged. */
    const floor = groupDragFloor(clipMove.layer.duration, clipMove.origStart,
      (clipMove.group || []).map(g => ({ duration: g.layer.duration, origStart: g.origStart })));
    const raw = Math.max(floor, clipMove.origStart + dx / pps);
    const sr = shiftKey ? { v: raw, snapped: false, guide: 0 } : snapStart(clipMove.layer, raw, pps, clipMove._excl, clipMove.sup);   // Shift bypasses snap; co-dragged clips excluded; just-snapped targets suppressed
    clipMove.layer.start = Math.max(floor, sr.v);
    if (sr.snapped) showSnap(sr.guide); else hideSnap();
    const clipEl = tracksEl.querySelector('.clip[data-id="' + clipMove.layer.id + '"]');
    if (clipEl) clipEl.style.left = (PAD + clipMove.layer.start * pps) + 'px';
    // group move: every selected clip takes the SAME delta, unclamped — the shared floor above has
    // already guaranteed none of them can go under, so re-clamping here is what broke the sync.
    const delta = clipMove.layer.start - clipMove.origStart;
    (clipMove.group || []).forEach(g => {
      g.layer.start = g.origStart + delta;
      const ge = tracksEl.querySelector('.clip[data-id="' + g.layer.id + '"]');
      if (ge) ge.style.left = (PAD + g.layer.start * pps) + 'px';
    });
    /* `quiet` is the auto-scroll calling. It skips the canvas repaint, and that is not an
     * optimisation — it is the whole reason the previous three attempts at this feature went red.
     *
     * FM.requestRender feeds noteMotion (js/app.js), the adaptive-quality heuristic: enough renders
     * close together and the app decides it is IN MOTION and calls resizeCanvas() to drop the preview
     * to a lower resolution, snapping back a moment after you stop. That is correct behaviour and it
     * is why an editor looks softer while you drag. But a rAF loop repainting every frame while the
     * finger sits still holds the preview in that state, and three tests that measure canvas geometry
     * were then measuring a canvas that had quietly been resized underneath them — "the box is 157px
     * off the text" and "the point landed at u=0". Nothing in the scene, the scroller or the scroll
     * position was wrong, which is exactly why two attempts were spent looking at those.
     *
     * The cost is small and worth naming: while the finger is HELD at the edge the canvas does not
     * repaint, so if the playhead sits over the clip the picture lags the scroll. Every actual finger
     * movement repaints, and so does releasing — and while you are edge-scrolling you are looking at
     * the timeline, where the clip does keep moving, not at the canvas. */
    if (!quiet) FM.requestRender();
  }

  /* Drag a clip to the edge of the screen and the timeline comes to meet you (queue 115) — the
   * behaviour the paint-select drag and a trim already have.
   *
   * THREE BRAKES, and each one is a bug that actually happened rather than defensive habit:
   *  1. STOP IF THE SCROLL DID NOT MOVE. `v !== 0` only says the finger is inside the edge band.
   *     Pinned at scrollLeft 0, a leftward step is a no-op — so the loop re-armed forever, re-placing
   *     the clip and re-rendering every frame off a pointer that had not moved.
   *  2. A HARD FRAME CAP. A headless test starts a drag and never releases it; a loop that only ends
   *     on pointerup then never ends, and an earlier attempt hung the whole suite exactly that way.
   *     A cap makes an endless loop structurally impossible rather than merely unlikely.
   *  3. A BOUNDED SCROLLER. A trim cannot extend past its media, so growing the scroller to meet it
   *     terminates. A clip move has no such limit, and "grow the scroller, then scroll into the space
   *     you just made" is unbounded — one missed pointerup and the timeline runs away at 120px a
   *     frame. Capped at the end of the composition (or the dragged clip) plus half a screen. */
  /* Stop the loop wherever a gesture ends — pointerup, pointercancel, or an abort. It also stops on
   * its own the moment clipMove goes null, but a frame already queued would still run once, and a
   * feature whose failure mode is "a loop nobody is watching" should not rely on that. */
  function endClipEdgeScroll() {
    if (clipScrollRAF) { cancelAnimationFrame(clipScrollRAF); clipScrollRAF = 0; }
  }

  function clipEdgeScroll() {
    clipScrollRAF = 0;
    if (!clipMove || !clipMove.moved || !timelineEl) return;
    if (++clipMove._scrollFrames > CLIP_SCROLL_MAX) return;                    // brake 2
    const rect = timelineEl.getBoundingClientRect();
    const x = clipMove.lastX, headRight = rect.left + HEAD_W, MAX = 22;
    let v = 0;
    if (x > rect.right - TRIM_EDGE) v = Math.min(MAX, ((x - (rect.right - TRIM_EDGE)) / TRIM_EDGE) * MAX);
    else if (x < headRight + TRIM_EDGE) v = -Math.min(MAX, (((headRight + TRIM_EDGE) - x) / TRIM_EDGE) * MAX);
    if (v === 0) return;
    if (v > 0 && innerEl) {                                                    // brake 3
      /* The limit is computed from where the clip STARTED, never from where it is now. Deriving it
       * from the live position looks equivalent and is the runaway itself: the loop pushes the clip
       * right, which pushes the limit right, which makes room to scroll further, which pushes the clip
       * further. Measured — the scroller went 900px → 1904px off a single test drag, and stayed there.
       * `origStart` cannot move for the length of the drag, so this terminates by construction. */
      const pps = pxPerSec();
      const far = Math.max(FM.scene.project.duration, clipMove.origStart + clipMove.layer.duration);
      const limit = PAD + far * pps + timelineEl.clientWidth;
      const need = Math.min(limit, timelineEl.scrollLeft + timelineEl.clientWidth + v + 120);
      if ((parseFloat(innerEl.style.width) || 0) < need) innerEl.style.width = need + 'px';
    }
    const before = timelineEl.scrollLeft;
    timelineEl.scrollLeft = Math.max(0, before + v);
    const moved = timelineEl.scrollLeft - before;
    if (!moved) return;                                                        // brake 1
    /* The origin shift. The finger has not moved but the content under it has, so the clip must move
     * by the scrolled amount. Shifting the drag's ORIGIN by that amount makes the existing `dx` absorb
     * it with no second term anywhere — without this the clip stops dead at the edge while the timeline
     * slides underneath it, which feels worse than having no auto-scroll at all. */
    clipMove.startX -= moved;
    applyClipMoveAt(clipMove.lastX, clipMove.lastShift, true);   // quiet: see applyClipMoveAt
    clipScrollRAF = requestAnimationFrame(clipEdgeScroll);
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
    // Whether a trim drag is live. Read-only seam: the hold guard (queue 336) is only meaningful if a
    // test can tell "a trim started" from "nothing happened", and without this the mouse half of that
    // test can only assume it worked — which is not a test.
    _trimming: function () { return !!trimDrag; },
    // exposed for the suite (queue 364 clause 2): a real :hover cannot be synthesised, so the thing the
    // hover DRIVES is what gets driven.
    _markHover: markHover,
    /* Which timeline gesture, if any, is still live. Exposed because a drag that OUTLIVES the thing
     * that started it is invisible state: nothing on screen says so, the timeline does not complain,
     * and the next feature to key off `clipMove` inherits a drag it never started. That is not
     * hypothetical — it is what the #115 edge-scroll tripped over, and it cost a bisect to find
     * because the symptom appeared in three unrelated tests measuring canvas geometry.
     * Read-only: a snapshot of booleans, so nothing outside can steer a gesture. */
    /* One frame of the clip auto-scroll, with no gesture required (queue 115). A seam purely so the
     * suite can assert the thing that cost this feature three attempts: that a loop frame does NOT
     * repaint the canvas, because repainting every frame holds the preview in motion mode and resizes
     * it underneath anything measuring canvas geometry. Guarded on there being no live drag, so it
     * can never steer a real one. */
    _edgeScrollTick: function (quiet) {
      if (clipMove) return false;                          // never reach into a real drag
      const L = (FM.scene.layers || [])[0];
      if (!L) return false;
      /* A throwaway gesture over a real layer, because the guard at the top of applyClipMoveAt means
       * a tick without one would return before reaching the branch under test — a seam that always
       * passes is the exact kind of dead test this feature has already produced. The layer's start is
       * put back, so nothing survives the call. */
      const save = L.start;
      clipMove = { layer: L, origStart: L.start, startX: 0, moved: true, group: [], _excl: {}, sup: null };
      try { applyClipMoveAt(0, false, quiet !== false); }
      finally { L.start = save; clipMove = null; hideSnap(); }
      return true;
    },
    _dragState: function () {
      const live = [];
      if (clipMove) live.push('clipMove');
      if (trimDrag) live.push('trimDrag');
      if (kfDrag) live.push('kfDrag');
      if (slipDrag) live.push('slipDrag');
      if (cueDrag) live.push('cueDrag');
      if (clipTap) live.push('clipTap');
      return { any: live.length > 0, live: live };
    },
    // …and the way to end one. abortGestures already exists for pinches and rebuilds; the suite needs
    // it so one test's leaked drag cannot be charged to the next test that runs.
    _abortGestures: function () { abortGestures(); },
    // The scrub glide's tuning, exposed so the suite can pin the effect sliders to it — see queue 116.
    momentumTuning: { friction: MOM_FRICTION, maxV: MOM_MAX_V, stopAt: MOM_STOP },
    _lastFling: function () { return _lastFling; },
    _clearFling: function () { _lastFling = null; },
    // exposed so the suite can prove delete-parity with FM.animatedProps without faking a double-click
    deleteKeyframesAt: deleteKeyframesAt,
    // Read-only view of the magnet. The ⋯ menu could not tick 'Snapping' because this was a
    // module-local with no way out — so the one timeline toggle that DEFAULTS ON was also the one
    // that never showed its state, and tapping it looked like it did nothing.
    isSnapping: function () { return snapping; },
    init() {
      rulerEl = document.getElementById('tl-ruler');
      tracksEl = document.getElementById('tl-tracks');
      playheadEl = document.getElementById('tl-playhead');
      innerEl = document.getElementById('tl-inner');
      timelineEl = document.getElementById('timeline');
      HEAD_W = readHeadW();
      const zo = document.getElementById('btn-zoomout'), zi = document.getElementById('btn-zoomin');
      if (zo) zo.addEventListener('click', () => this.zoomBy(1 / 1.5));
      if (zi) zi.addEventListener('click', () => this.zoomBy(1.5));
      const sn = document.getElementById('btn-snap');
      // Announce the new state — see the note on btn-onion in js/app.js. Snapping is invisible until
      // the next drag, so without this the button looks like it did nothing at all. (queue 111)
      if (sn) sn.addEventListener('click', () => {
        snapping = !snapping; sn.classList.toggle('active', snapping);
        if (FM.toast) FM.toast(snapping ? 'Snapping on — clips and keyframes stick to edges' : 'Snapping off — clips move freely', 1500);
      });
      // Cmd/Ctrl + wheel zooms the timeline
      if (timelineEl) timelineEl.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, timeFromX(e.clientX)); } }, { passive: false });
      // FIXED-CENTRE CONTRACT: whatever sits under the centre line IS the current time. A plain horizontal
      // scroll (trackpad / scrollbar / wheel) therefore MOVES the playhead. Without this, scrolling left
      // scrollLeft decoupled from FM.time, so the next render (selecting/deselecting a clip) snapped the
      // view back to the playhead — the "I'm 40s in, click a clip, get sent to the start" bug.
      /* The ruler now draws only what is on screen (see buildRuler), so it has to be redrawn as the
       * view moves. Deliberately its OWN listener rather than a line inside the handler below: that one
       * drives FM.time and the playhead and has a stack of hard-won guards, and this needs none of
       * them. Repaints only when the view has left the margin the last paint covered — during a normal
       * flick that is a handful of repaints, not one per frame — and coalesces onto a rAF. */
      if (timelineEl) timelineEl.addEventListener('scroll', () => {
        if (_rulerRAF || !_rulerAt || _rulerAt.all) return;
        const w = rulerWindow();
        const covered = w.a >= _rulerAt.a && w.b <= _rulerAt.b;
        if (covered) return;
        _rulerRAF = requestAnimationFrame(() => { _rulerRAF = 0; buildRuler(); });
      }, { passive: true });
      if (timelineEl) timelineEl.addEventListener('scroll', () => {
        if (trimDrag || clipMove || kfDrag || scrub) return;            // those drive scroll/time themselves
        // A HIDDEN timeline cannot have been scrolled by a hand. While the focused text editor is
        // open, body.text-editing hides #timeline-panel, so every updatePlayhead write to scrollLeft
        // is clamped to 0 by a 0-width box — and this handler read that clamp as "the user scrolled
        // to the start" and dragged the playhead back to 0. Anything that seeks while the editor is
        // open (walking captions cue by cue, for one) was silently undone a frame later.
        if (!timelineEl.clientWidth) return;
        let sL = timelineEl.scrollLeft;
        /* STOP AT THE WALL, IN THIS EVENT (queue 104). Ezra, on PC: "when you swipe left and right on
         * the timeline and it hits the end it glitches a little bit, like it keeps going past the wall
         * but then corrects itself and pulls back."
         * The strip can scroll further than the project is long. This handler clamped the TIME to the
         * duration but left scrollLeft wherever the browser's momentum had carried it, so the view sat
         * out past the end until the 160ms settle timer below fired updatePlayhead, which writes
         * scrollLeft back to time * pps. That late correction IS the pull-back he is describing — the
         * position was always going to be fixed, just visibly and a sixth of a second afterwards.
         * Clamping here makes the end a wall the scroll stops against, with nothing left to correct.
         * lastProgScroll is updated too, so our own write is not read back as another user scroll. */
        const maxSL = Math.max(0, FM.scene.project.duration * pxPerSec());
        if (sL > maxSL + 0.5) {
          sL = maxSL;
          timelineEl.scrollLeft = maxSL;
          lastProgScroll = maxSL;
          stopMomentum();                                               // a flick that reached the end is spent
        }
        if (Math.abs(sL - lastProgScroll) < 1) return;                  // our own playhead-driven write → ignore (no feedback loop)
        lastProgScroll = sL;
        // USER gesture in progress: the finger owns scrollLeft — updatePlayhead must not yank it
        // back to the snapped-frame pixel mid-swipe (at high zoom a frame is many px, so the yank
        // made scrubbing jagged and could pin you against a frame boundary entirely). Time still
        // snaps per frame; the strip settles onto the exact notch when the gesture goes idle.
        userScrollAt = performance.now();
        clearTimeout(scrollSettle);
        scrollSettle = setTimeout(() => { userScrollAt = 0; FM.timeline.updatePlayhead(); }, 160);
        FM.scrubTime(snapT(Math.max(0, Math.min(FM.scene.project.duration, sL / pxPerSec()))));
      }, { passive: true });
      // Grabbing the timeline while it's PLAYING pauses it (AM). Detected on the raw INPUT (touch/
      // mouse down + wheel), not the scroll event — during playback the playhead's own auto-scroll
      // rewrites scrollLeft every frame, so user scrolls get swallowed by the feedback guard above.
      if (timelineEl) {
        timelineEl.addEventListener('pointerdown', () => { stopMomentum(); if (FM.playing) FM.pause(); }, true);   // any grab kills a glide + pauses
        timelineEl.addEventListener('wheel', (e) => { stopMomentum(); if (!e.ctrlKey && !e.metaKey && FM.playing) FM.pause(); }, { passive: true });
      }
      // two-finger PINCH zoom — tracked on window in CAPTURE phase so clip/ruler stopPropagation can't hide it
      const pdist = () => { const p = [...pointers.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
      const pmidX = () => { const p = [...pointers.values()]; return (p[0].x + p[1].x) / 2; };
      window.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch' || !timelineEl || !(e.target instanceof Node) || !timelineEl.contains(e.target)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        // abortGestures (not raw nulls): restore half-applied clip/trim/kf edits AND clear the
        // orphaned hold timer that could otherwise grab the WRONG clip on a later tap.
        // A ≡ reorder drag OWNS its finger: a second thumb must not convert it into a pinch.
        if (pointers.size === 2 && !reorderActive) { dragging = false; scrub = null; abortGestures(); pinch = { startDist: pdist(), startZoom: zoom, anchorTime: timeFromX(pmidX()) }; if (FM.playing) FM.pause(); }
      }, true);
      window.addEventListener('pointermove', (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pointers.size === 2) {
          if (e.cancelable) e.preventDefault();
          // rAF-throttle: setZoom triggers a FULL rebuild (ruler + tracks + filmstrips) — running it
          // per pointermove (60-120Hz) froze the pinch on phones. One zoom application per frame;
          // cached strips are stretch-reused mid-pinch and the pinch-end rebuild re-crisps them.
          pinch.targetZ = pinch.startZoom * (pdist() / Math.max(1, pinch.startDist));
          if (!pinch.raf) pinch.raf = requestAnimationFrame(() => { if (pinch) { pinch.raf = 0; FM.timeline.setZoom(pinch.targetZ, pinch.anchorTime); } });
        }
      }, true);
      const endPtr = (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.delete(e.pointerId);
        if (pointers.size < 2 && pinch) { if (pinch.raf) cancelAnimationFrame(pinch.raf); pinch = null; FM.timeline.rebuild(); }   // crisp final strips
      };
      window.addEventListener('pointerup', endPtr, true);
      window.addEventListener('pointercancel', endPtr, true);
      snaplineEl = document.createElement('div'); snaplineEl.id = 'tl-snapline'; snaplineEl.className = 'hidden';
      innerEl.appendChild(snaplineEl);
      loopRegionEl = document.createElement('div'); loopRegionEl.id = 'tl-loopregion'; loopRegionEl.className = 'hidden';
      innerEl.appendChild(loopRegionEl);

      // Fixed-centre playhead → scrub is a RELATIVE grab-and-slide for BOTH mouse and touch (the line
      // stays put, the content moves under it). A click without a drag seeks to where it was clicked.
      const onDown = (e, fromLane) => {
        if (pinch) return;   // a pinch's second finger must not spawn a scrub whose release "taps" and deselects
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
      // Marker menu — ONE builder for desktop right-click AND mobile long-press (parity: both
      // platforms see identical items, incl. Rename which used to be desktop-only via the inline input).
      const rulerMenuItems = (t) => {
        const P = FM.scene.project; if (!P.markers) P.markers = [];
        const near = P.markers.find(m => Math.abs(m.t - t) < 14 / pxPerSec());
        // Removing the thumbnail-frame marker must also UNPIN it — else P.thumbPinned stays true and the
        // card thumbnail freezes forever (auto-regen is gated on !thumbPinned).
        const unpinIf = (was) => { if (was) { P.thumbPinned = false; if (FM.projects && FM.projects.touchCurrent) FM.projects.touchCurrent(true); } };
        const items = [];
        if (near) {
          items.push({ label: 'Rename marker…', action: () => { const n = prompt('Marker name:', near.label || 'Marker'); if (n != null && n.trim()) { near.label = n.trim(); FM.timeline.rebuild(); if (FM.history) FM.history.commit(); } } });
          items.push({ label: near.thumb ? 'Remove thumbnail pin' : 'Remove marker', danger: true, action: () => { const wasThumb = !!near.thumb; P.markers = P.markers.filter(m => m !== near); unpinIf(wasThumb); FM.timeline.rebuild(); if (FM.history) FM.history.commit(); } });
        }
        /* NO "ADD MARKER HERE" (queue 337). Ezra: *"Get rid of the feature where holding down somewhere on
           the timeline gives you the option to add a benchmark"*.
           Only the ADD is gone. Rename, remove and clear stay, because they act on a marker you are already
           pointing at and taking the whole gesture away would remove those with it — the entry warned about
           exactly that, and it is why this is a one-item deletion rather than dropping the handler.
           A benchmark can still be added two other ways, checked before removing this one: tapping the
           timecode chip (js/app.js:3795) and M on a keyboard (js/app.js:4995). Worth knowing for later:
           queue 364 moves that first route onto the playhead's top, so the two changes agree rather than
           leaving the feature unreachable. */
        if (P.markers.length > 1 || (P.markers.length === 1 && !near)) items.push({ label: 'Clear all markers', danger: true, action: () => { const hadThumb = P.markers.some(m => m.thumb); P.markers = []; unpinIf(hadThumb); FM.timeline.rebuild(); if (FM.history) FM.history.commit(); } });
        return items;
      };
      rulerEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!FM.contextMenu) return;
        // With Add gone, an empty stretch of ruler has nothing to offer — and a menu that opens holding
        // nothing is worse than no menu, which is the shape of the thing being removed here.
        const it = rulerMenuItems(timeFromX(e.clientX));
        if (!it.length) return;
        FM.contextMenu.show(e.clientX, e.clientY, it);
      });
      // touch: long-press the ruler for the same marker menu (phones have no right-click)
      let rulerHold = 0, rulerHX = 0, rulerHY = 0;
      rulerEl.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        rulerHX = e.clientX; rulerHY = e.clientY;
        clearTimeout(rulerHold);
        rulerHold = setTimeout(() => {
          if (!FM.contextMenu) return;
          // Same gate as the right-click path (queue 337): nothing to offer, nothing opens — and no buzz
          // either, since a haptic for a menu that never appears is worse than silence.
          const it = rulerMenuItems(timeFromX(rulerHX));
          if (!it.length) return;
          if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} }
          FM.contextMenu.show(rulerHX, rulerHY + 10, it);
        }, 550);
      });
      rulerEl.addEventListener('pointermove', (e) => { if (rulerHold && (Math.abs(e.clientX - rulerHX) > 12 || Math.abs(e.clientY - rulerHY) > 12)) { clearTimeout(rulerHold); rulerHold = 0; } });
      ['pointerup', 'pointercancel'].forEach(ev => rulerEl.addEventListener(ev, () => { clearTimeout(rulerHold); rulerHold = 0; }));
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
        if (cueDrag) {
          const pps = pxPerSec(), f = FM.scene.project.fps || 30;
          let dt = Math.round(((e.clientX - cueDrag.startX) / pps) * f) / f;
          if (!cueDrag.moved && Math.abs(e.clientX - cueDrag.startX) < 3) return;
          cueDrag.moved = true;
          const L = cueDrag.layer, cue = cueDrag.cue;
          const MIN = (FM.captions && FM.captions.MIN_CUE) || 0.1;
          const dur = L.duration > 0 ? L.duration : Infinity;
          if (cueDrag.mode === 'move') {
            const len = cueDrag.e0 - cueDrag.s0;
            let s = cueDrag.s0 + dt;
            s = Math.max(0, s);
            if (isFinite(dur)) s = Math.min(s, Math.max(0, dur - len));
            cue.start = s; cue.end = s + len;
          } else if (cueDrag.mode === 'trimL') {
            let s = Math.max(0, cueDrag.s0 + dt);
            s = Math.min(s, cueDrag.e0 - MIN);
            cue.start = s;
          } else {
            let en = cueDrag.e0 + dt;
            if (isFinite(dur)) en = Math.min(en, dur);
            en = Math.max(en, cueDrag.s0 + MIN);
            cue.end = en;
          }
          /* Re-acquire the chip if a rebuild took it (#149). Styling a DETACHED node is silent — it
           * throws nothing and shows nothing — so the drag looked live in the code and was frozen on
           * screen until the release rebuilt everything. Anything that rebuilds the timeline mid-drag
           * orphans it, so this asks the live DOM rather than trusting the reference from pointerdown.
           * data-ci is stamped on every chip when it is built, which is what makes the lookup exact. */
          if (!cueDrag.chip || !cueDrag.chip.isConnected) {
            const liveClip = tracksEl && tracksEl.querySelector('.clip[data-id="' + cueDrag.layer.id + '"]');
            cueDrag.chip = liveClip ? liveClip.querySelector('.cap-cue[data-ci="' + cueDrag.ci + '"]') : null;
          }
          if (cueDrag.chip) {
            cueDrag.chip.style.left = (cue.start * pps) + 'px';
            cueDrag.chip.style.width = Math.max(4, (cue.end - cue.start) * pps) + 'px';
          }
          FM.requestRender();
          return;
        }
        if (clipTap) {
          const dx = e.clientX - clipTap.startX, dy = e.clientY - clipTap.startY;
          const adx = Math.abs(dx), ady = Math.abs(dy);
          clipTap.lastMoveAt = performance.now();   // finger is travelling → not a settled hold (see armHold)
          // Tap vs scrub vs hold-to-move. A horizontal-dominant drag past a low threshold is a SCRUB:
          // commit early (and kill the long-press timer) so a slow deliberate "drag the line over the
          // clips" gesture — which can travel <8px in the first 350ms — isn't hijacked into a clip move.
          /* 4px, matching the empty-lane path's own commit threshold as closely as tap discrimination
             allows (it commits at 3). At 6 the first six pixels of a swipe did nothing and then the
             playhead took all six at once — a small jump, but the second half of the same complaint. */
          const scrubIntent = adx > 4 && adx > ady;
          if (!clipTap.moved && !scrubIntent && adx < 8 && ady < 8) return;   // still a potential tap / hold
          clipTap.moved = true;
          if (clipTap.holdTimer) { clearTimeout(clipTap.holdTimer); clipTap.holdTimer = null; }
          /* A VERTICAL drag that STARTED ON A CLIP scrolls the layer list (queue 166). Ezra: "I simply
           * can't swipe up and down on the timeline… actually it's any layer not just free hand drawing
           * layers." Every pixel of movement here used to fall through to the scrub below, whatever
           * direction it went, so the only place a vertical swipe could begin was empty lane — and once
           * you have enough layers there is no empty lane left. Queue 167 removed the thing that was
           * MAKING nine rows out of one drawing, which hid this; it did not fix it.
           * It has to be done by hand: #timeline carries touch-action:none, so the browser will never
           * scroll it natively. Same axis lock the empty-lane path uses 90 lines below — commit at 5px,
           * and horizontal needs only to tie because scrubbing is the primary action here. */
          if (!clipTap.axis && (adx > 5 || ady > 5)) clipTap.axis = (ady > adx + 4) ? 'y' : 'x';
          if (clipTap.axis === 'y') {
            if (timelineEl) timelineEl.scrollTop = clipTap.startScrollTop - dy;
            return;
          }
          /* SAMPLE THE VELOCITY, because this gesture has to end the same way the other one does
             (queue 351). Ezra: "Timeline doesn't scrub smoothly when you press on a layer when swiping,
             this is annoying".
             It is not the frame cost — that has been measured repeatedly and is fine. It is that a swipe
             beginning ON A CLIP and the identical swipe beginning on empty lane ran down two different
             paths, and only the empty-lane one sampled a release velocity and flung. So the same flick
             glided or stopped dead depending purely on where your finger happened to land — and on a
             timeline with layers in it there is barely any empty lane, so the version that stops dead is
             the one you almost always get. Same smoothing constants as the path 90 lines below, on
             purpose: two flings that feel different are worse than one that is slightly wrong. */
          const cNow = e.timeStamp || performance.now(), cDt = cNow - (clipTap.lastT || cNow);
          if (cDt > 0) { const cvx = (e.clientX - (clipTap.lastX != null ? clipTap.lastX : e.clientX)) / cDt; clipTap.vTime = (clipTap.vTime || 0) * 0.35 + (-cvx / pxPerSec()) * 0.65; }
          clipTap.lastX = e.clientX; clipTap.lastT = cNow;
          FM.scrubTime(snapT(clipTap.baseTime - (e.clientX - clipTap.startX) / pxPerSec()));   // relative drag-scrub (scrollLeft-independent)
          return;
        }
        if (clipMove) {
          const dx = e.clientX - clipMove.startX;
          if (!clipMove.moved && Math.abs(dx) < 4) return;   // movement threshold: distinguish click from drag
          clipMove.moved = true;
          // dragging a GROUP bar drags its members' time too — the primary's AND any group riding
          // in the multi-selection (a secondary group used to move its bar and abandon its members)
          if (!clipMove._grpInit) {
            clipMove._grpInit = true;
            if (!clipMove.group) clipMove.group = [];
            const have = new Set(clipMove.group.map(g => g.layer.id)); have.add(clipMove.layer.id);
            const expandGrp = (gid) => (FM.groupDescendants ? FM.groupDescendants(gid) : []).forEach(l => { if (!have.has(l.id)) { have.add(l.id); clipMove.group.push({ layer: l, origStart: l.start }); } });
            if (clipMove.layer.type === 'group') expandGrp(clipMove.layer.id);
            clipMove.group.slice().forEach(g => { if (g.layer.type === 'group') expandGrp(g.layer.id); });
            clipMove._excl = {}; clipMove._excl[clipMove.layer.id] = 1; clipMove.group.forEach(g => { clipMove._excl[g.layer.id] = 1; });
          }
          clipMove.lastX = e.clientX; clipMove.lastShift = !!e.shiftKey;
          applyClipMoveAt(e.clientX, e.shiftKey);
          // Near a viewport edge? Bring the timeline to meet the finger so the drag can keep going
          // past the screen, the same way a trim already does. (queue 115)
          const trect = timelineEl ? timelineEl.getBoundingClientRect() : null;
          if (trect && !clipScrollRAF &&
              (e.clientX > trect.right - TRIM_EDGE || e.clientX < trect.left + HEAD_W + TRIM_EDGE)) {
            // Reset per edge-hold, not per drag: leaving the edge and coming back is a fresh gesture,
            // and a cap that only ever counted down would stop working part-way through a long edit.
            clipMove._scrollFrames = 0;
            clipScrollRAF = requestAnimationFrame(clipEdgeScroll);
          }
          return;
        }
        if (slipDrag) {
          const dt = (e.clientX - slipDrag.startX) / pxPerSec();
          // drag right → the media slides right → EARLIER source shows (trimStart decreases), like Canva
          slipDrag.layer.trimStart = Math.max(0, Math.min(slipDrag.max, slipDrag.trim0 - dt * slipDrag.rate));
          renderSlipGhost(slipDrag);   // the film visibly slides under the fixed window
          FM.seekVideosToTime(); FM.requestRender();
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
          // Moving BEFORE the hold arms is a scrub past the diamond, not a retime — abandon the
          // gesture rather than starting one, so brushing a keyframe can never shift it.
          if (!kfDrag.armed) {
            // Measure how far the finger has MOVED from where it went down — not how far the press
            // landed from the diamond's centre. Comparing against the keyframe's own time meant a
            // press anywhere but dead-centre already exceeded the threshold, and since the diamond
            // carries a deliberate ~35px touch pad around an 11px shape, most legitimate presses
            // aborted on the first speck of finger drift: no arm, no colour, no easing menu.
            const moved = Math.hypot(e.clientX - kfDrag.downX, e.clientY - kfDrag.downY);
            if (moved > 10) {
              if (kfDrag.armTimer) clearTimeout(kfDrag.armTimer);
              kfDrag.dot.classList.remove('kf-dragging');
              kfDrag = null;
            }
            return;
          }
          kfDrag.moved = true;   // armed and tracking — every pixel from here retimes
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
            scrub.moved = true;   // a vertical PAN is not a tap — releasing it must never deselect (it wiped painted multi-selections)
            // sample the release velocity, same smoothing as the horizontal branch below (queue 415)
            {
              const nowY = e.timeStamp || performance.now(), ddy = nowY - (scrub.lastTY || nowY);
              if (ddy > 0) { const vy = (e.clientY - (scrub.lastY != null ? scrub.lastY : e.clientY)) / ddy; scrub.vY = (scrub.vY || 0) * 0.35 + (-vy) * 0.65; }
              scrub.lastY = e.clientY; scrub.lastTY = nowY;
            }
            timelineEl.scrollTop = scrub.startScrollTop - dy;                                  // vertical pan
          } else if (Math.abs(dx) > 3) {
            scrub.moved = true;
            // sample velocity for the release fling (event timeStamp = true input time). time moves
            // at −1/pps per screen-px, so timeVel = −(px/ms)/pps.
            const now = e.timeStamp || performance.now(), ddt = now - (scrub.lastT || now);
            if (ddt > 0) { const vx = (e.clientX - (scrub.lastX != null ? scrub.lastX : e.clientX)) / ddt; scrub.vTime = (scrub.vTime || 0) * 0.35 + (-vx / pxPerSec()) * 0.65; }
            scrub.lastX = e.clientX; scrub.lastT = now;
            FM.scrubTime(snapT(scrub.baseTime - dx / pxPerSec()));                             // horizontal grab-and-slide
          }
        }
      });
      window.addEventListener('pointerup', (e) => {
        if (trimScrollRAF) { cancelAnimationFrame(trimScrollRAF); trimScrollRAF = 0; }
        endClipEdgeScroll();
        if (cueDrag) {
          const cd = cueDrag; cueDrag = null;
          if (cd.moved) {
            if (FM.captions) FM.captions.normalize(cd.layer);
            FM.timeline.rebuild();
            if (FM.inspector) FM.inspector.refresh();
            if (FM.history) FM.history.commit();
          } else {
            // a plain tap on a cue puts the playhead on it (so you can see what you're about to edit)
            if (FM.scrubTime) FM.scrubTime((cd.layer.start || 0) + cd.cue.start + Math.min(0.05, (cd.cue.end - cd.cue.start) / 2));
          }
          FM.requestRender();
          return;
        }
        if (dragging && scrub && !scrub.moved) {
          // A TAP on the timeline (ruler OR empty lane) NEVER seeks — only a horizontal DRAG scrubs.
          // Tapping off any clip just deselects (revealing the Add menu / dropping the phone sheet).
          if (FM.scene.selectedId || (FM.scene.selectedIds && FM.scene.selectedIds.length)) FM.selectLayer(null);
        } else if (dragging && scrub && scrub.axis === 'y' && scrub.moved) {
          // released a vertical pan → keep gliding, on the same "did the finger stop first" rule as the
          // horizontal fling: a deliberate settle (>90ms since the last move) must not throw the list.
          const upY = (e && e.timeStamp) || performance.now();
          startScrollMomentum(((upY - (scrub.lastTY || 0)) < 90) ? (scrub.vY || 0) : 0);
        } else if (dragging && scrub && scrub.axis === 'x' && scrub.moved && !FM.playing) {
          // released a horizontal grab → keep gliding with the release velocity (momentum), unless the
          // finger had already STOPPED before lifting (last move >90ms ago = a deliberate settle, no fling).
          const upT = (e && e.timeStamp) || performance.now();
          const fresh = (upT - (scrub.lastT || 0)) < 90;
          startMomentum(fresh ? (scrub.vTime || 0) : 0);
        }
        dragging = false; scrub = null;
        if (clipTap) {
          const ct = clipTap; clipTap = null;
          if (ct.holdTimer) clearTimeout(ct.holdTimer);
          // a deliberate tap selects (opens the property menu); in select-mode it TOGGLES membership
          // like head taps do — the big clip bar collapsing a painted multi-selection was maddening
          if (!ct.moved) { if (FM.selectMode && FM.toggleSelect) { FM.toggleSelect(ct.layer.id); FM.refreshAll(); } else FM.selectLayer(ct.layer.id); }
          // …and a horizontal one that WAS a scrub keeps gliding, on the same terms as the empty-lane
          // release below: only if the finger was still travelling when it lifted, so a deliberate
          // settle-then-release still lands exactly where you put it. (queue 351)
          else if (ct.axis === 'x' && !FM.playing) {
            const cUp = (e && e.timeStamp) || performance.now();
            startMomentum(((cUp - (ct.lastT || 0)) < 90) ? (ct.vTime || 0) : 0);
          }
          return;
        }
        if (clipMove) {
          const cm = clipMove; clipMove = null; hideSnap();
          /* THE GRAB IS OVER, SO THE SUPPRESSION IS OVER (queue 433 clause 2). The note where this is
             stamped has always said "Cleared on pointerup/cancel" and nothing ever cleared it — the
             sheet consumed it instead, and turned it into a latch that shut that layer's panel for the
             rest of the session. Its lifetime is the gesture, and this is where the gesture ends. */
          FM._sheetSuppressFor = null;
          if (cm.moved) {
            // Moving a clip in time carries its whole animation with it: retime every keyframe by the
            // same delta (keyframe times are absolute project time, so they'd otherwise be left behind).
            if (FM.shiftLayerKeyframes) {
              FM.shiftLayerKeyframes(cm.layer, cm.layer.start - cm.origStart);
              (cm.group || []).forEach(g => FM.shiftLayerKeyframes(g.layer, g.layer.start - g.origStart));
            }
            if (FM.autoFitDuration) FM.autoFitDuration();   // fit comp to clips (grows or shrinks)
            FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
          }
          /* A grab that never MOVED was a plain click, so it selects here instead of on pointerdown.
             Doing it on release is what lets a drag leave the selection alone: at press time there is
             no way to know yet which of the two this is. Never seeks or scrolls the timeline. */
          else {
            if (FM.selectMode && FM.toggleSelect) { FM.toggleSelect(cm.layer.id); FM.refreshAll(); }
            else if (FM.scene.selectedId !== cm.layer.id) FM.selectLayer(cm.layer.id);
            else if (rebuildPending) FM.timeline.rebuild();   // already selected: just flush the deferred rebuild
          }
          return;
        }
        if (slipDrag) {
          const changed = Math.abs((slipDrag.layer.trimStart || 0) - slipDrag.trim0) > 1e-4;
          endSlipGhost(slipDrag);
          slipDrag = null;
          FM.timeline.rebuild();   // refresh the filmstrip to the new source window
          if (changed) { if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit(); }
          return;
        }
        if (trimDrag) {
          if (FM.autoFitDuration) FM.autoFitDuration();   // fit comp to clips after a trim
          trimDrag = null; hideSnap();
          FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
          return;
        }
        if (kfDrag) {
          if (kfDrag.armTimer) clearTimeout(kfDrag.armTimer);
          const layer = kfDrag.layer, armed = kfDrag.armed, moved = kfDrag.moved, dot = kfDrag.dot;
          const openMenu = kfDrag.openMenu;   // grab it before kfDrag is nulled below
          if (dot) dot.classList.remove('kf-dragging');
          if (moved) {
            // Re-sort every animated prop (transform AND effect params) so evalProp stays correct
            // after a keyframe is dragged past a neighbour in time, dropping any keyframe the drag
            // landed exactly on top of so two don't stack at one time.
            FM.dedupDraggedKfs(layer, kfDrag.kfs);
            kfDrag = null;
            FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
          } else if (armed) {
            // Held long enough to arm, then released without moving → that same hold is the way into
            // the easing menu. This is where the old 450ms touch timer's job went.
            kfDrag = null;
            const r = dot.getBoundingClientRect();
            if (openMenu) openMenu(r.left + r.width / 2, r.top - 8);
          } else {
            // A plain tap. It used to rebuild the timeline and push an empty undo entry every time.
            kfDrag = null;
          }
        }
      });
      window.addEventListener('pointercancel', () => {
        if (trimScrollRAF) { cancelAnimationFrame(trimScrollRAF); trimScrollRAF = 0; }
        endClipEdgeScroll();
        abortGestures();   // RESTORE half-applied clip/trim/kf edits — never leave them in the scene
        dragging = false; scrub = null; pinch = null; pointers.clear(); hideSnap();
      });
      // A LAYOUT switch (classic ⇄ Studio, or drawing mode collapsing the inspector column) moves the
      // panel sideways without firing a window resize, which would leave --tl-panel-left stale and put
      // the playhead back off-centre. Observing the panel catches every one of those. Writing the var
      // can't change the panel's own size, so this cannot feed back into itself.
      const panelEl = document.getElementById('timeline-panel');
      if (panelEl && window.ResizeObserver) {
        let t0 = 0;
        new ResizeObserver(() => {
          clearTimeout(t0);
          t0 = setTimeout(() => { applyInnerWidth(); FM.timeline.updatePlayhead(); }, 60);
        }).observe(panelEl);
      }
      /* The clip-nudge pair beside the playhead (v5.01). Same two actions the inspector used to
         carry — slide the clip to the playhead, or stretch its near edge out to meet it — moved to
         where your hand already is. They straddle #tl-centerline, so the gap between them is the
         playhead itself, and each one's icon points the way the clip will actually travel. */
      const nudge = document.getElementById('tl-nudge');
      if (nudge) {
        const L = document.getElementById('tl-nudge-l'), R = document.getElementById('tl-nudge-r');
        const act = (one, many) => () => {
          const targets = clipToolTargets();
          if (!targets.length) return;
          if (targets.length === 1 ? one(targets[0], FM.time) : many(targets, FM.time)) {
            FM.requestRender(); FM.timeline.rebuild();
            if (FM.inspector) FM.inspector.refresh();
            if (FM.history) FM.history.commit();
          } else if (FM.toast) FM.toast('No more source to extend into', 1500);
        };
        /* MOVE takes the selection as a BLOCK: the near edge of the whole group lands on the playhead
           and every clip keeps its offset from it. Snapping them all to one start would destroy the
           timing between them, which is the opposite of what a multi-select is for. Copied from the
           inspector row this replaces (inspector.js alignRow) rather than re-derived, so the two can
           never disagree about what the button means. */
        L.addEventListener('click', act(
          (l, t) => FM.moveClipTo(l, t),
          (ls, t) => {
            const firstStart = Math.min.apply(null, ls.map(l => l.start));
            const lastEnd = Math.max.apply(null, ls.map(l => l.start + l.duration));
            const d = t - (t >= lastEnd ? lastEnd : firstStart);
            if (!d) return false;
            ls.forEach(l => { l.start += d; if (FM.shiftLayerKeyframes) FM.shiftLayerKeyframes(l, d); });
            return true;
          }));
        // EXTEND stays per-clip: each one's nearest edge reaches the playhead, so clips either side of
        // it grow toward it from their own direction and all meet there.
        R.addEventListener('click', act(
          (l, t) => FM.extendClipTo(l, t),
          (ls, t) => ls.reduce((moved, l) => (FM.extendClipTo(l, t) ? true : moved), false)));
      }
      // re-read --head-w on resize so the slimmer phone track-head keeps clip-x / scrub math correct
      let resizeRebuildTimer = 0;
      window.addEventListener('resize', () => {
        HEAD_W = readHeadW();   // cheap, keep synchronous so scrub math stays correct mid-resize
        // iOS fires a resize STORM as the address bar / keyboard slides (dozens of events/sec); each
        // rebuild() re-rasterizes up-to-8192px filmstrips. Collapse the storm to one trailing rebuild.
        clearTimeout(resizeRebuildTimer);
        resizeRebuildTimer = setTimeout(() => FM.timeline.rebuild(), 150);
      });
    },

    rebuild() {
      if (!tracksEl) return;
      // A rebuild mid-gesture rips the DOM out from under an active drag (frozen kf-dot, wiped
      // marker-rename input) — an async filmstrip/waveform arrival or resize can fire one at any
      // moment. Defer it; the gesture's own release path (or the marker's commit) flushes it.
      const ae = document.activeElement;
      if (clipMove || trimDrag || kfDrag || slipDrag || reorderActive || (ae && ae.classList && ae.classList.contains('marker-edit'))) { rebuildPending = true; return; }   // slipDrag too — a mid-slip rebuild tore down the lane holding the ghost
      rebuildPending = false;
      /* THE SWITCH IS A READOUT OF WHERE THE ADD ROW IS, so it has to be re-read whenever the STACK
         changes — not only when the row MOVES (queue 373 clause 6, reopened by him at v10.20). His
         words: "Toggle switch doesn't update properly when you are adding layers, it should always be
         accurate to where the add layer is." The lean is `addAt / layers.length`, so adding or deleting
         a layer changes it even though addAt itself never moved — and every call site the sync had was
         a MOVE: moveAddMarker, the toggle, the two drag paths and boot. His screenshot showed three
         layers above the row and five below, i.e. 0.375, with the knob still hard up from when the
         project had none.
         Syncing from HERE rather than from each mutation is the structural version of the fix: rebuild()
         is what runs whenever the rows on screen reflect a new stack, so add, delete, duplicate, undo,
         redo, project-open and group enter/exit are all covered by construction instead of by remembering
         to add a call to each. */
      if (FM.syncAddSwitch) FM.syncAddSwitch();
      // Preserve the vertical scroll across the DOM rebuild — buildTracks empties the container, which
      // otherwise snaps the layer list back to the TOP every time you tap a layer (the "jumps to top"
      // glitch). The browser clamps if the content is now shorter (mobile solo / collapsed group).
      const sTop = timelineEl ? timelineEl.scrollTop : 0;
      /* …and hold it across the SOLO view, which the line above cannot do on its own (queue 312). See
         soloLayerId: the one-row view is shorter than the viewport, so the browser clamps scrollTop to
         0 while it is up and every subsequent read is of a position that no longer exists. Captured
         here, on the rebuild that ENTERS solo, while the old full-height list is still on screen and
         the number is still true. */
      const soloNow = !!soloLayerId();
      if (soloNow) { if (preSoloScroll === null) preSoloScroll = sTop; }   // guarded: a rebuild WHILE solo would capture the clamped 0 over the good value
      // Newly-keyframed props (loopMode still undefined) INHERIT the layer's loopMode so they don't
      // freeze at their last keyframe — but initialize-only: an explicit per-prop loop set in the graph
      // editor must NOT be clobbered back to the layer value on every rebuild. (The clip-menu Loop toggle
      // still writes all props explicitly, so it keeps working.)
      FM.scene.layers.forEach(l => { if (l.loopMode && l.loopMode !== 'none') FM.animatedProps(l).forEach(p => { if (p.loopMode == null) p.loopMode = l.loopMode; }); });
      // Recompute the project length from the clips on EVERY rebuild — the timeline is drawn right
      // afterwards, so its length can never be stale no matter which edit triggered the rebuild.
      if (FM.autoFitDuration) FM.autoFitDuration();
      // Freeze the lane width for this pass — see laneViewW. try/finally so a throw inside buildTracks
      // cannot leave a stale width latched for the rest of the session.
      _laneFrozen = 1; _laneW = 0;
      try {
        applyInnerWidth();
        buildRuler();
        buildTracks();
        this.updateLoopRegion();
        this.updatePlayhead();
      } finally { _laneFrozen = 0; _laneW = 0; }
      /* Coming OUT of solo, the remembered position wins — it is the only copy of where he was. The
         browser clamps it for us if the list is shorter than it was (a layer deleted while selected). */
      let want = sTop;
      if (!soloNow && preSoloScroll !== null) { want = preSoloScroll; preSoloScroll = null; }
      if (timelineEl && timelineEl.scrollTop !== want) timelineEl.scrollTop = want;
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

    // Shown only while a clip is selected AND the playhead sits off it — the same condition that used
    // to decide whether the inspector row offered these. Off the clip, "trim" and "split" can't do
    // anything; these two can, which is the whole reason the pair swaps in.
    syncNudge() {
      const box = document.getElementById('tl-nudge');
      if (!box) return;
      const targets = clipToolTargets();
      const side = clipToolSide(targets);
      box.classList.toggle('hidden', !side);
      if (!side) return;
      const layer = targets[0];
      const n = targets.length;
      const right = side > 0;   // playhead is PAST the clip → everything moves/grows rightwards
      const L = document.getElementById('tl-nudge-l'), R = document.getElementById('tl-nudge-r');
      const ico = (inner) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
      /* TWO ICONS THAT ARE ACTUALLY DIFFERENT (queue 235). Ezra: "those two buttons are very similar…
       * right now, honestly, at first glance, I cannot tell a fucking difference."
       * He is right, and the old pair is a good lesson in what does not survive being small: they were
       * the same drawing except that MOVE's box was closed (`h9v8H4z`) and EXTEND's was open at one end
       * (`M12 8H4v8h8`). That is about four pixels of difference at 15px, and the two are never on
       * screen together for you to compare.
       * So the difference is now carried by the strongest cue available at this size — FILL versus
       * OUTLINE — with the arrowheads reinforcing it:
       *   MOVE   a SOLID block and a DOUBLE chevron: the whole clip picks up and travels to the line.
       *   EXTEND an OUTLINED block whose near edge is open, a DASHED span, one arrow: the edge is being
       *          pulled out to the line and the dashes are the new material. */
      L.innerHTML = ico(right
        ? '<path d="M3.5 8.5h8.5v7H3.5z" fill="currentColor" stroke="none"/><path d="M14 10l2 2-2 2M17 10l2 2-2 2"/><path d="M21 4.5v15"/>'
        : '<path d="M12 8.5h8.5v7H12z" fill="currentColor" stroke="none"/><path d="M10 10l-2 2 2 2M7 10l-2 2 2 2"/><path d="M3 4.5v15"/>');
      R.innerHTML = ico(right
        ? '<path d="M12 8.5H3.5v7H12"/><path d="M12.5 12h6" stroke-dasharray="2 2"/><path d="M17 10l2 2-2 2"/><path d="M21 4.5v15"/>'
        : '<path d="M12 8.5h8.5v7H12"/><path d="M11.5 12h-6" stroke-dasharray="2 2"/><path d="M7 10l-2 2 2 2"/><path d="M3 4.5v15"/>');
      // The count is in the words because the buttons look identical either way, and "move 3 clips" is
      // a very different press from "move clip" to have made by accident.
      const many = n > 1 ? 'all ' + n + ' clips' : 'clip';
      L.title = right ? 'Move ' + many + ' right to the playhead' : 'Move ' + many + ' left to the playhead';
      R.title = n > 1
        ? 'Extend all ' + n + ' clips to the playhead'
        : (right ? 'Extend the end of the clip to the playhead' : 'Extend the start of the clip to the playhead');
      L.setAttribute('aria-label', L.title); R.setAttribute('aria-label', R.title);
    },

    // The trim/split trio. Mirrors syncNudge, and is its complement: this shows only while the
    // playhead sits INSIDE the selected clip (side === 0), which is precisely when trimming or
    // splitting there is meaningful — and precisely when the nudge pair is hidden, so exactly one of
    // the two groups is ever on screen.
    syncTrim() {
      const box = document.getElementById('tl-trim');
      if (!box) return;
      const targets = clipToolTargets();
      // "inside" now means inside ANY selected clip, which is the same question the inspector's copy
      // asked (`layers.some(inside)`) and, for one clip, the same answer as before.
      const inside = targets.length > 0 && clipToolSide(targets) === 0;
      box.classList.toggle('hidden', !inside);
      if (!inside) return;
      const L = document.getElementById('tl-trim-l'), R = document.getElementById('tl-trim-r'), S = document.getElementById('tl-trim-s');
      if (!L || !R || !S) return;
      // The titles carry the count, so they are refreshed every sync even though the icons are static.
      const n = targets.length;
      if (n > 1) {
        L.title = 'Trim ' + n + ' clip starts to playhead (drop everything before it)';
        R.title = 'Trim ' + n + ' clip ends to playhead (drop everything after it)';
        S.title = 'Split all ' + n + ' at playhead';
      } else {
        L.title = 'Trim start to playhead (drop everything before it)';
        R.title = 'Trim end to playhead (drop everything after it)';
        S.title = 'Split at playhead';
      }
      [L, R, S].forEach(b => b.setAttribute('aria-label', b.title));
      if (L.innerHTML) return;   // icons and handlers are static — build once, not every frame
      const ico = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
      L.innerHTML = ico('M6 4v16M6 4h4M6 20h4M14 4v16');    // drop everything BEFORE the playhead
      R.innerHTML = ico('M18 4v16M18 4h-4M18 20h-4M10 4v16'); // drop everything AFTER the playhead
      S.innerHTML = ico('M12 3v18M16 8l4 4-4 4M8 8l-4 4 4 4'); // split at the playhead
      const after = () => { FM.refreshAll(); if (FM.history) FM.history.commit(); };
      // Every clip the playhead is actually inside — the ones it is off are skipped rather than
      // silently mangled, exactly as the inspector row did.
      const cutTargets = () => clipToolTargets().filter(l => FM.time > l.start + 1e-4 && FM.time < l.start + l.duration - 1e-4);
      L.addEventListener('click', () => {
        const ls = cutTargets(); if (!ls.length) return;
        ls.forEach(l => {
          const cut = FM.time - l.start;
          l.start = FM.time; l.duration -= cut;
          // Same source-trim rule the inspector used: forward clips advance trimStart by the dropped
          // wall-time × speed; a reversed clip anchors its trim to the source tail and keeps it.
          if (l.type === 'video' && !l.reversed) l.trimStart = (l.trimStart || 0) + (FM.layerSourceAdvance ? FM.layerSourceAdvance(l, cut) : cut * (l.speed || 1));
        });
        after();
      });
      R.addEventListener('click', () => {
        const ls = cutTargets(); if (!ls.length) return;
        ls.forEach(l => { l.duration = FM.time - l.start; });
        after();
      });
      S.addEventListener('click', async () => {
        // Sequential, not Promise.all: splitLayer clones media, and doing several at once is the one
        // way this can hand two clips the same backing record.
        for (const l of cutTargets()) await FM.splitLayer(l.id);
      });
    },

    updatePlayhead() {
      if (!tracksEl) return;
      FM.timeline.syncNudge();
      FM.timeline.syncTrim();
      const pps = pxPerSec();
      // UNIVERSAL fixed-centre (phone + desktop): #tl-centerline is a CSS-pinned static line at 50vw
      // that NEVER moves and JS never touches it — we only scroll the CONTENT so the current time sits
      // under it. (Relative drag-scrub also drives FM.time, which re-enters here to set scrollLeft.)
      const targetScroll = Math.max(0, FM.time * pps);
      /* READ THE GEOMETRY BEFORE WRITING scrollLeft, not after (queue 387).
         This function runs on EVERY animation frame of playback — 60 times a second, twice per drawn
         frame of a 30fps project (measured: 180 calls to 90 renders, tests/_playcost.html). It used to
         write scrollLeft and then read scrollLeft and clientWidth back, and a layout-dependent read
         after a layout-dirtying write forces the browser to flush layout synchronously, there and then,
         inside the frame. Reading first costs nothing — the values are the ones the last painted frame
         left behind — and `sL` after our own write is simply the value we wrote, which we know.
         This is an efficiency fix with a measured size (~0.3ms a frame at 6x CPU throttle with 8 clips),
         NOT the answer to his report: that is still open, and the probe does not reproduce it. */
      const t = FM.time;
      let sL = timelineEl ? timelineEl.scrollLeft : 0;
      const visW = timelineEl ? timelineEl.clientWidth : 0;
      /* CLAMPED THE WAY THE BROWSER WOULD. `scrollLeft = x` silently pins x to the scrollable range, so
         taking the written value on trust overstates sL at the very end of the timeline — and sL is what
         the label's right-hand cap is measured from, which is the IMG_2445 defect the comment below
         exists to fix. scrollWidth is read up here with the others, and a scrollLeft write cannot change
         it, so this stays one read pass. */
      const maxScroll = timelineEl ? Math.max(0, timelineEl.scrollWidth - visW) : 0;
      if (timelineEl && !trimDrag && !clipMove && !kfDrag && (!userScrollAt || performance.now() - userScrollAt > 150)) {
        if (Math.abs(sL - targetScroll) > 0.5) { timelineEl.scrollLeft = targetScroll; sL = Math.min(targetScroll, maxScroll); }
        lastProgScroll = targetScroll;   // remember our own write so the resulting 'scroll' event is ignored
      }
      // Light the live keyframe the playhead is sitting on. Half a frame of tolerance, because a
      // keyframe's time and FM.time are both floats and an exact compare would flicker.
      const kfTol = 0.5 / Math.max(1, (FM.scene.project && FM.scene.project.fps) || 30);
      tracksEl.querySelectorAll('.kf-dot.kf-live').forEach(d => {
        d.classList.toggle('kf-here', Math.abs(parseFloat(d.dataset.t) - t) <= kfTol);
      });
      tracksEl.querySelectorAll('.clip').forEach(clipEl => {
        const l = FM.layerById(FM.scene, clipEl.dataset.id);
        clipEl.classList.toggle('under-playhead', !!l && t >= l.start && t < l.start + l.duration);
        // Light the caption cue that is actually on screen right now — the same "which cue is
        // showing" answer the compositor uses, so the bar never disagrees with the picture.
        if (l && FM.captions && FM.captions.isTrack(l)) {
          const liveI = FM.captions.indexAt(l, t);
          clipEl.querySelectorAll('.cap-cue').forEach(ch => ch.classList.toggle('live', +ch.dataset.ci === liveI));
        }
        /* The clip NAME stays at the clip's START (v6.21). It used to track the clip's VISIBLE left
         * edge as you scrolled, so the name slid along the bar and stayed on screen even once the
         * clip's beginning had gone past the left edge. Ezra: "currently the names of layers follow
         * and stay on screen, I want them to just stay at the start of the layer and not move along
         * with you." He is right about what it cost: a name that moves is a name you cannot use as a
         * landmark — you lose the one fixed mark that tells you where a clip actually begins, and on a
         * timeline of several long clips every label ends up crowded against the same left edge,
         * which is where they all look identical.
         * The RIGHT-hand cap below stays. That half fixed a different, real defect (IMG_2445): the
         * label box is sized off the CLIP, so on a clip wider than the screen a long name had the
         * whole clip to run in, never reached its own ellipsis, and ran out past the ≡ reorder handle
         * off the edge of the view. It still needs a viewport-relative edge to bite on. */
        const label = clipEl.querySelector('.clip-label');
        if (label) {
          const base = clipEl.classList.contains('sel') ? 17 : 9;
          const clipLeft = parseFloat(clipEl.style.left) || 0;
          const lLeft = base;
          label.style.left = lLeft + 'px';
          // …and the mirror of that on the RIGHT. The label box is sized off the CLIP (left:9/right:9),
          // so on a clip wider than the screen a long layer name had the whole clip to run in: it
          // never hit its own ellipsis, it just kept going past the ≡ reorder handle and off the
          // right edge (IMG_2445, "Black hshshsh…"). Cap it at the visible viewport instead, minus the
          // handle's 30px + its 5px inset + 4px of clearance, and text-overflow finally has an edge
          // to bite on. Same coordinate space as the sticky-left above, so it holds at any scroll,
          // any zoom, any head width — and on desktop, where the scroller is narrower than the window.
          if (visW > 0) {
            const vx = HEAD_W + clipLeft + lLeft - sL;                    // label's x within the scroller viewport
            label.style.maxWidth = Math.max(0, visW - 39 - vx) + 'px';
          }
        }
      });
    },

    setZoom(z, anchorTime) {
      // The floor used to be 0.25, which showed 20 seconds across the lane — a two-minute edit could
      // never be seen end to end, so you scrolled blind. 0.02 puts ~250 seconds on screen (Ezra: "you
      // should be able to zoom out of the timeline way more"). Nothing gets more expensive out there:
      // the ruler thins its notches to stay >=5px apart, so a wider view draws FEWER of them.
      zoom = Math.max(0.02, Math.min(12, z));
      const at = (anchorTime != null) ? anchorTime : FM.time;
      this.rebuild();
      if (timelineEl) timelineEl.scrollLeft = Math.max(0, at * pxPerSec());
      this.updatePlayhead();
      const zl = document.getElementById('tl-zoom-label');
      // 2 decimals below 1x — "0.1x / 0.0x / 0.0x" made every zoomed-out step look identical
      if (zl) zl.textContent = (zoom < 1 ? (Math.round(zoom * 100) / 100) : (Math.round(zoom * 10) / 10)) + '×';
    },
    zoomBy(f, anchorTime) { this.setZoom(zoom * f, anchorTime); },
    // exposed so the view bar can dim its arrows at the ends of the range (setZoom clamps to 0.02–12)
    getZoom() { return zoom; },
    stopMomentum() { stopMomentum(); },
  };
})(window.FM);
