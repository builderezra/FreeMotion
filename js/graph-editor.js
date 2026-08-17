/* FreeMotion — Easing Curve editor (Alight Motion's graph editor).
 * Rendered INLINE as a sub-view of the Move & Transform panel (same bottom sheet, NOT a separate
 * full-screen screen — AM doesn't do that). Opened from the panel's left-rail easing button. Edits
 * the easing of the active mode's animated properties at the playhead together: drag the two
 * cubic-bezier handles, pick a preset, set Hold, or loop the property. Writes kf.bez / kf.e /
 * p.loopMode; evalProp uses them immediately.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const MODE_PROPS = {
    move: ['x', 'y', 'z'],
    /* ALL THREE ROTATION CHANNELS. This listed only 'rotation', while the Move & Transform panel's
     * own MT_PROPS.rotate is ['rotation','rotationX','rotationY'] and its ◆ keyframes all three the
     * moment a tilt is in use. So picking an easing preset eased the flat spin and silently left the
     * 3D tilt linear: measured after Ease In-Out, at t=0.25 rotation was 11.25° (eased) while
     * rotationX was 37.5° (linear — it should have been 33.75°). The two halves of one rotation drift
     * apart for the whole segment, in preview and in export, with nothing on screen saying half of it
     * was skipped. The timeline even highlights all three as the keyframes you are editing, because
     * kfFocusProps reads the FULL list. move/scale/skew already matched; rotate was the odd one. */
    rotate: ['rotation', 'rotationX', 'rotationY'],
    scale: ['scale', 'scaleX', 'scaleY'], skew: ['skewX', 'skewY'],
    // anchor keyframes nothing (see MT_PROPS in inspector.js). Present so the `|| MODE_PROPS.all`
    // fallback below can't quietly re-ease every transform channel if this ever gets opened.
    anchor: [],
    all: ['x', 'y', 'z', 'rotation', 'scale', 'scaleX', 'scaleY', 'skewX', 'skewY', 'opacity'],
  };
  // The BEZIER rail carries only the curves a cubic bezier can actually BE — these are exactly the six
  // in FM.EASE_PRESETS. bounce and elastic are sampled functions (they belong to the Bounce family)
  // and 'hold' is a step, not a curve (it belongs to the Steps family), so listing them here made the
  // rail eight tall for the sake of three entries that were lying about what they are.
  const PRESETS = [
    { key: 'linear', label: 'Linear' },
    { key: 'easeIn', label: 'Ease In' },
    { key: 'easeOut', label: 'Ease Out' },
    { key: 'easeInOut', label: 'Ease In-Out' },
    { key: 'overshoot', label: 'Overshoot' },
    { key: 'anticipate', label: 'Anticipate' },
  ];
  // Named eases a keyframe can legitimately still carry that are NOT on the bezier rail: 'hold' is
  // offered by the Steps rail, and bounce/elastic only arrive from an older project, an import, or
  // FM.ai's ops layer. Every one of them must still READ correctly, or an old file looks like it lost
  // its easing the moment you open the graph.
  const LEGACY_LABELS = { hold: 'Hold (step)', bounce: 'Bounce', elastic: 'Elastic' };
  // Non-bezier named eases (bounce/elastic) — drawn by sampling FM.EASES, not as a draggable bezier.
  const CURVE_EASES = ['bounce', 'elastic'];
  const PAD = 26;
  let canvas = null, presetWrap = null, hint = null, loopBtn = null, carLabel = null, famWrap = null;
  let cur = { layer: null, mode: 'all', keys: [], kfs: [] };   // kfs = end-keyframes to edit together
  let dragHandle = null;

  function bezOf(kf) { if (kf.bez) return kf.bez.slice(); const p = FM.EASE_PRESETS[kf.e] || FM.EASE_PRESETS.easeInOut; return p.slice(); }

  // lo/hi are the VALUE range the box maps to; they default to the plain 0..1 the bezier editor has
  // always used, so every existing caller is unchanged.
  function grid(ctx, W, H, lo, hi) {
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi - lo < 1e-6) { lo = 0; hi = 1; }
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c1016'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    const gx = x => PAD + x * (W - 2 * PAD);
    const gy = y => (H - PAD) - ((y - lo) / (hi - lo)) * (H - 2 * PAD);
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(gx(i / 4), gy(lo)); ctx.lineTo(gx(i / 4), gy(hi)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx(0), gy(lo + (hi - lo) * i / 4)); ctx.lineTo(gx(1), gy(lo + (hi - lo) * i / 4)); ctx.stroke();
    }
    // The keyframe band — where 0 and 1 actually are — stays marked even when the view is zoomed out
    // to hold an overshoot, or there is no way to read how far past the ends the curve goes.
    if (lo < -0.02 || hi > 1.02) {
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,255,255,.18)';
      [0, 1].forEach(v => { ctx.beginPath(); ctx.moveTo(gx(0), gy(v)); ctx.lineTo(gx(1), gy(v)); ctx.stroke(); });
      ctx.restore();
    }
    return { gx: gx, gy: gy, lo: lo, hi: hi };
  }
  function drawBez(ctx, W, H, bez) {
    const g = grid(ctx, W, H), gx = g.gx, gy = g.gy;
    ctx.strokeStyle = 'rgba(41,217,187,.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(bez[0]), gy(bez[1])); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx(1), gy(1)); ctx.lineTo(gx(bez[2]), gy(bez[3])); ctx.stroke();
    ctx.strokeStyle = '#29d9bb'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 64; i++) { const x = i / 64, y = FM.bezierAt(bez[0], bez[1], bez[2], bez[3], x); const px = gx(x), py = gy(y); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.stroke();
    ctx.fillStyle = '#29d9bb';
    [[0, 0], [1, 1]].forEach(p => { ctx.beginPath(); ctx.arc(gx(p[0]), gy(p[1]), 4, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#fff';
    [[bez[0], bez[1]], [bez[2], bez[3]]].forEach(p => { ctx.beginPath(); ctx.arc(gx(p[0]), gy(p[1]), 9, 0, 7); ctx.fill(); });
  }
  function drawHold(ctx, W, H) {
    const g = grid(ctx, W, H), gx = g.gx, gy = g.gy;
    ctx.strokeStyle = '#7d8ca5'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(1), gy(0)); ctx.lineTo(gx(1), gy(1)); ctx.stroke();
    ctx.fillStyle = '#fff'; [[0, 0], [1, 1]].forEach(p => { ctx.beginPath(); ctx.arc(gx(p[0]), gy(p[1]), 4, 0, 7); ctx.fill(); });
  }
  // Sample a non-bezier ease (bounce/elastic) straight from FM.EASES — no draggable handles, just the curve.
  function drawEaseCurve(ctx, W, H, fn) {
    const g = grid(ctx, W, H), gx = g.gx, gy = g.gy;
    ctx.strokeStyle = '#29d9bb'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 96; i++) { const x = i / 96, y = Math.max(-0.3, Math.min(1.45, fn(x))); const px = gx(x), py = gy(y); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.stroke();
    ctx.fillStyle = '#29d9bb'; [[0, 0], [1, 1]].forEach(p => { ctx.beginPath(); ctx.arc(gx(p[0]), gy(p[1]), 4, 0, 7); ctx.fill(); });
  }
  // Mini preview for a PARAMETERISED preset's button — the same fn the graph uses, at its defaults,
  // so a preset's icon is always a true miniature of what picking it will give you.
  function drawEzGlyph(cv, P) {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pd = 4;
    ctx.clearRect(0, 0, W, H);
    const gx = x => pd + x * (W - 2 * pd), gy = y => (H - pd) - y * (H - 2 * pd);
    ctx.strokeStyle = '#c2cee0'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const x = i / 48, y = Math.max(-0.25, Math.min(1.25, P.fn(x, P.defaults)));
      const px = gx(x), py = gy(y);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Mini preview for a preset glyph button.
  function drawGlyph(cv, key) {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, p = 4;
    ctx.clearRect(0, 0, W, H);
    const gx = x => p + x * (W - 2 * p), gy = y => (H - p) - y * (H - 2 * p);
    ctx.strokeStyle = '#c2cee0'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    if (key === 'hold') { ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(1), gy(0)); ctx.lineTo(gx(1), gy(1)); }
    else if (CURVE_EASES.indexOf(key) >= 0 && FM.EASES && FM.EASES[key]) { const fn = FM.EASES[key]; for (let i = 0; i <= 32; i++) { const x = i / 32, y = Math.max(-0.2, Math.min(1.2, fn(x))); const px = gx(x), py = gy(y); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } }
    else { const b = FM.EASE_PRESETS[key]; for (let i = 0; i <= 24; i++) { const x = i / 24, y = FM.bezierAt(b[0], b[1], b[2], b[3], x); const px = gx(x), py = gy(Math.max(-0.2, Math.min(1.2, y))); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } }
    ctx.stroke();
  }

  // getProp(k) returns the animatable prop object for key k (layer.transform[k] for transform modes,
  // or e.g. () => layer.volume for the audio panel). Lets this editor drive ANY keyframed prop.
  /* WHICH SEGMENT OF WHICH CHANNEL AN EASING PRESET LANDS ON.
   *
   * One keyframe per animated channel of the mode — the segment the playhead is inside. The catch is
   * the fallback for a playhead that is PAST a channel's last keyframe: it clamps to that channel's
   * final segment. For a single-property editor that is exactly right ("edit the last segment"). This
   * editor edits every channel of a mode TOGETHER, so a channel whose animation finished long before
   * the playhead was having an old, already-played segment rewritten — and the canvas only ever draws
   * kfs[0], so nothing on screen showed it happening.
   * Measured: with x keyed at 0/1/2s and y keyed at 0/0.5s, the playhead at 1.5s and Bounce picked,
   * y's 0→0.5s move became Bounce as well. The layer's vertical motion changed shape in preview and
   * export without being asked for or shown.
   *
   * So a channel that has already ENDED is dropped — unless every channel has, in which case there is
   * no live segment anywhere and "the last one" is the only sensible reading, which is what the
   * single-property case has always relied on. That guard matters more since MODE_PROPS.rotate grew
   * to three channels: more channels means more chances one of them finished early. */
  function pickKfs(getProp, propKeys) {
    const props = propKeys.filter(k => { const p = getProp(k); return FM.isAnimated(p) && p.kf.length >= 2; });
    const t = FM.time, picked = [];
    props.forEach(k => {
      const kf = getProp(k).kf;
      let idx = kf.findIndex(x => x.t >= t - 1e-3);
      const ended = idx < 0;                                          // playhead is past this channel's last key
      if (idx < 1) idx = (t <= kf[0].t + 1e-3) ? 1 : kf.length - 1;   // epsilon on the fallback too — a playhead a hair past kf[0] used to select the LAST segment
      if (idx > kf.length - 1) idx = kf.length - 1;
      picked.push({ k: k, kf: kf[idx], ended: ended });
    });
    const live = picked.filter(p => !p.ended);
    const use = live.length ? live : picked;
    return { keys: use.map(p => p.k), kfs: use.map(p => p.kf) };
  }
  // Suite seams: the mode→channel table and the segment picker are where both of these bugs lived.
  FM._easeModeProps = MODE_PROPS;
  FM._pickEaseKfs = pickKfs;

  /* ---- parameterised families (v5.47) --------------------------------------------------------
   * A keyframe carrying `ez` belongs to the Bounce or Steps family; anything else is the Bezier
   * family, which keeps its two draggable handles exactly as before. The editor knows nothing about
   * any individual preset: it asks the preset where its points SIT and hands a drag straight back to
   * it (see js/eases.js), so adding a preset never touches this file. */
  let ezPts = [];        // control points in screen px, rebuilt every draw, used for hit-testing
  let ezDrag = -1;       // index into ezPts while one is held

  function curEz() { return cur.kfs.length ? cur.kfs[0].ez : null; }
  function curFamKey() {
    const z = curEz();
    const F = z && FM.easeFamily ? FM.easeFamily(z.fam) : null;
    if (F && !F.bez) return z.fam;
    // A plain kf.e === 'hold' is a STEP. It is not stored as `ez` (and must not be — every older
    // project and evalProp already read the string), but the rail it belongs on is Steps, so that is
    // the family the editor reports for it.
    return curIsHold() ? 'steps' : 'bezier';
  }
  function curPresetDef() { const z = curEz(); return z && FM.easePreset ? FM.easePreset(z.fam, z.preset) : null; }
  function curParams() { const z = curEz(), P = curPresetDef(); return P ? Object.assign({}, P.defaults, z.p || {}) : null; }

  function applyEzPreset(famKey, presetKey) {
    const P = FM.easePreset(famKey, presetKey); if (!P) return;
    cur.kfs.forEach(kf => {
      kf.ez = { fam: famKey, preset: presetKey, p: Object.assign({}, P.defaults) };
      delete kf.bez;
      // Leave a plain named ease behind as well. A build that predates `ez` — or any reader that
      // ignores it — then gets a sane curve instead of a linear one, rather than the project quietly
      // losing its easing on a round trip.
      kf.e = 'easeInOut';
    });
    FM.requestRender(); redraw(); if (FM.history) FM.history.commit();
  }
  function applyFamily(famKey) {
    const F = FM.easeFamily(famKey); if (!F) return;
    if (F.bez) { cur.kfs.forEach(kf => { delete kf.ez; }); applyPreset('easeInOut'); return; }
    applyEzPreset(famKey, F.presets[0].key);
  }
  function setEzParams(np) {
    cur.kfs.forEach(kf => { if (kf.ez) kf.ez.p = Object.assign({}, np); });
    FM.requestRender(); redraw();
  }

  // Draw a parameterised curve and its grab points. Rails and stalks are drawn first so the circles
  // sit on top of them, and every point's position comes from the preset's own `at`, so what you see
  // and what a drag reads can never disagree.
  function drawEzCurve(ctx, W, H, P, prm) {
    // AUTO-FIT the vertical range to the curve AND its handles. These families overshoot hard on
    // purpose — a bounce at its defaults peaks near 1.9, elastic near 3.7 — so a graph pinned to 0..1
    // draws a line that leaves the top of the box and takes its grab points with it, which is exactly
    // what the first build of this did. The 0..1 band still gets its gridlines, so you can see how far
    // past the keyframes the curve is actually going.
    let lo = 0, hi = 1;
    for (let i = 0; i <= 160; i++) { const y = P.fn(i / 160, prm); if (Number.isFinite(y)) { if (y < lo) lo = y; if (y > hi) hi = y; } }
    (P.points || []).forEach(pt => { const a = pt.at(prm); if (Number.isFinite(a.y)) { if (a.y < lo) lo = a.y; if (a.y > hi) hi = a.y; } });
    const pad = (hi - lo) * 0.08 || 0.08;
    lo -= pad; hi += pad;
    const g = grid(ctx, W, H, lo, hi), gx = g.gx, gy = g.gy;
    ctx.strokeStyle = '#29d9bb'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const x = i / 160, y = P.fn(x, prm);
      const px = gx(x), py = gy(y);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#29d9bb';
    [[0, 0], [1, 1]].forEach(q => { ctx.beginPath(); ctx.arc(gx(q[0]), gy(q[1]), 4, 0, 7); ctx.fill(); });

    ezPts = [];
    (P.points || []).forEach((pt, i) => {
      const at = pt.at(prm);
      const px = gx(Math.max(0, Math.min(1, at.x))), py = gy(at.y);
      ctx.save();
      if (pt.rail) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,205,84,.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (pt.rail === 'h') { ctx.moveTo(gx(0), py); ctx.lineTo(gx(1), py); }
        else { ctx.moveTo(px, gy(0)); ctx.lineTo(px, gy(1.3)); }
        ctx.stroke();
      } else if (pt.stalk) {
        // a short leader back to the curve, so a point floating off it still reads as attached
        const onY = gy(P.fn(Math.max(0, Math.min(1, at.x)), prm));
        ctx.strokeStyle = 'rgba(255,205,84,.75)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, onY); ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath(); ctx.arc(px, py, 9, 0, 7);
      ctx.fillStyle = (ezDrag === i) ? '#fff' : '#ffcd54';
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,14,20,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      ezPts.push({ px: px, py: py });
    });
  }

  // Fill the inner rail with the ACTIVE family's presets. Rebuilt rather than shown/hidden, because
  // the two families hold different numbers of presets and a stale button would still be clickable.
  let _railFam = null;
  function buildPresetRail(famKey) {
    if (!presetWrap || _railFam === famKey) return;
    _railFam = famKey;
    presetWrap.innerHTML = '';
    const F = FM.easeFamily(famKey);
    if (!F || F.bez) {
      PRESETS.forEach(pr => {
        const b = document.createElement('button'); b.className = 'es-preset'; b._key = pr.key; b.title = pr.label;
        const cv = document.createElement('canvas'); cv.width = 30; cv.height = 22; b.appendChild(cv); drawGlyph(cv, pr.key);
        b.addEventListener('click', () => applyPreset(pr.key));
        presetWrap.appendChild(b);
      });
      return;
    }
    F.presets.forEach(P => {
      const b = document.createElement('button'); b.className = 'es-preset'; b._key = P.key; b.title = P.label;
      const cv = document.createElement('canvas'); cv.width = 30; cv.height = 22; b.appendChild(cv); drawEzGlyph(cv, P);
      b.addEventListener('click', () => applyEzPreset(famKey, P.key));
      presetWrap.appendChild(b);
    });
    // HOLD lives at the end of the Steps rail. It is the one step this app had before the families
    // existed, it is still written as the plain string kf.e = 'hold' that every older project uses,
    // and it is the reason the Steps rail is where curFamKey() sends a held keyframe.
    if (famKey === 'steps') {
      const b = document.createElement('button'); b.className = 'es-preset'; b._key = 'hold'; b.title = LEGACY_LABELS.hold;
      const cv = document.createElement('canvas'); cv.width = 30; cv.height = 22; b.appendChild(cv); drawGlyph(cv, 'hold');
      b.addEventListener('click', () => applyPreset('hold'));
      presetWrap.appendChild(b);
    }
  }

  function applyBez(bez) { cur.kfs.forEach(kf => { kf.bez = bez.slice(); kf.e = 'custom'; }); FM.requestRender(); redraw(); }
  function applyPreset(key) {
    // Store only the named easing (delete any custom bez). evalProp + bezOf both resolve a named
    // ease from kf.e, and every "is a preset active?" read site checks for the ABSENCE of kf.bez —
    // so writing bez here was what stopped presets highlighting and broke the label/carousel. (#4,#5)
    // `ez` goes too: picking Hold off the Steps rail while a Steps preset is live has to actually
    // land on Hold, and curPresetDef() reads `ez` first — leaving it behind meant the click drew
    // the old parameterised curve back over the step.
    cur.kfs.forEach(kf => { kf.e = key; delete kf.bez; delete kf.ez; });
    FM.requestRender(); redraw(); if (FM.history) FM.history.commit();
  }
  function curIsHold() { return cur.kfs.length && cur.kfs[0].e === 'hold'; }
  function curIsCurve() { return cur.kfs.length && !cur.kfs[0].bez && CURVE_EASES.indexOf(cur.kfs[0].e) >= 0; }

  function redraw() {
    if (!canvas) return;
    if (!cur.kfs.length) { hint.style.display = ''; canvas.style.display = 'none'; presetWrap.style.opacity = '.4'; if (carLabel) carLabel.textContent = '—'; return; }
    hint.style.display = 'none'; canvas.style.display = ''; presetWrap.style.opacity = '1';
    const Pdef = curPresetDef(), prm = curParams();
    if (Pdef && prm) drawEzCurve(canvas.getContext('2d'), canvas.width, canvas.height, Pdef, prm);
    else if (curIsHold()) { ezPts = []; drawHold(canvas.getContext('2d'), canvas.width, canvas.height); }
    else if (curIsCurve()) { ezPts = []; drawEaseCurve(canvas.getContext('2d'), canvas.width, canvas.height, FM.EASES[cur.kfs[0].e]); }
    else { ezPts = []; drawBez(canvas.getContext('2d'), canvas.width, canvas.height, bezOf(cur.kfs[0])); }

    // the two rails: which FAMILY is on, and which of its presets
    const famKey = curFamKey();
    if (famWrap) [].forEach.call(famWrap.children, b => b.classList.toggle('on', b._key === famKey));
    buildPresetRail(famKey);
    const activeKey = Pdef ? Pdef.key : (curIsHold() ? 'hold' : (cur.kfs[0].bez ? null : cur.kfs[0].e));
    [].forEach.call(presetWrap.children, b => b.classList.toggle('on', b._key === activeKey));
    // LEGACY_LABELS before PRESETS: hold/bounce/elastic are no longer on the bezier rail, so without
    // it a keyframe carrying one of those strings read "Cubic Bezier Easing" — a plain lie about a
    // curve the editor was drawing correctly right beside the label.
    if (carLabel) carLabel.textContent = Pdef ? Pdef.label
      : (cur.kfs[0].bez ? 'Cubic Bezier Easing'
        : (LEGACY_LABELS[cur.kfs[0].e] || (PRESETS.find(p => p.key === cur.kfs[0].e) || {}).label || 'Cubic Bezier Easing'));
    if (loopBtn) { const fp = cur.get && cur.keys.length ? cur.get(cur.keys[0]) : null; const lm = fp && fp.loopMode; loopBtn.classList.toggle('on', !!lm && lm !== 'none'); loopBtn.title = 'Loop: ' + (lm || 'none'); }
  }

  function toGraph(e) {
    const r = canvas.getBoundingClientRect(), W = canvas.width, H = canvas.height;
    const px = (e.clientX - r.left) * (W / r.width), py = (e.clientY - r.top) * (H / r.height);
    return { x: Math.max(0, Math.min(1, (px - PAD) / (W - 2 * PAD))), y: Math.max(-0.4, Math.min(1.4, ((H - PAD) - py) / (H - 2 * PAD))) };   // clamp to the DRAWABLE band — a handle at y≈1.8 vanished off-canvas and became ungrabbable
  }
  window.addEventListener('pointermove', e => {
    if (ezDrag >= 0) {
      const P = curPresetDef(), prm = curParams();
      if (!P || !prm) { ezDrag = -1; return; }
      const g = toGraph(e);
      const np = P.points[ezDrag].drag(prm, g.x, g.y);
      setEzParams(Object.assign({}, prm, np));
      return;
    }
    if (dragHandle === null || !cur.kfs.length || !canvas) return;
    const g = toGraph(e); const bez = bezOf(cur.kfs[0]); bez[dragHandle * 2] = g.x; bez[dragHandle * 2 + 1] = g.y; applyBez(bez);
  });
  function endDrag() {
    if (ezDrag >= 0) { ezDrag = -1; redraw(); if (FM.history) FM.history.commit(); }
    if (dragHandle !== null) { dragHandle = null; if (FM.history) FM.history.commit(); }
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);   // an OS-cancelled touch must not leave the NEXT touch silently rewriting the curve

  // Build the editor as an INLINE element (no full-screen overlay) so it sits in the same Move &
  // Transform bottom-sheet, exactly like Alight Motion. The inspector renders this as a sub-view and
  // owns the "‹ Position / Scale" back button.
  function buildEditorDom() {
    const wrap = document.createElement('div'); wrap.className = 'es-inline';

    const main = document.createElement('div'); main.className = 'es-main';
    const gwrap = document.createElement('div'); gwrap.className = 'es-graph';
    canvas = document.createElement('canvas'); canvas.className = 'es-canvas'; canvas.width = 320; canvas.height = 320;
    hint = document.createElement('div'); hint.className = 'es-hint'; hint.textContent = 'Animate this property (tap ◆), add a second keyframe, then shape its easing here.'; hint.style.display = 'none';
    canvas.addEventListener('pointerdown', e => {
      if (!cur.kfs.length) return;
      // A parameterised preset owns the canvas: grab the nearest of ITS points, within a real finger
      // radius. Falling through to the bezier branch here would rewrite kf.bez on a bounce keyframe
      // and silently drop it back to the Bezier family mid-drag.
      if (curPresetDef()) {
        if (!ezPts.length) return;
        const r = canvas.getBoundingClientRect(), sx = canvas.width / r.width, sy = canvas.height / r.height;
        const mx = (e.clientX - r.left) * sx, my = (e.clientY - r.top) * sy;
        let best = -1, bd = 34 * Math.max(sx, sy);
        ezPts.forEach((q, i) => { const d = Math.hypot(q.px - mx, q.py - my); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { ezDrag = best; redraw(); e.preventDefault(); }
        return;
      }
      if (curIsHold() || curIsCurve()) return;
      const g = toGraph(e); const bez = bezOf(cur.kfs[0]);
      dragHandle = Math.hypot(g.x - bez[0], g.y - bez[1]) <= Math.hypot(g.x - bez[2], g.y - bez[3]) ? 0 : 1;
      e.preventDefault();
    });
    gwrap.append(canvas, hint);

    presetWrap = document.createElement('div'); presetWrap.className = 'es-presets';
    // _railFam caches which family the rail was last FILLED for, so redraw() doesn't rebuild eight
    // buttons on every pointermove. It has to be cleared here: this is a brand-new, empty presetWrap,
    // and a stale cache made buildPresetRail return early and leave it that way. Measured — any
    // inspector.refresh() with the family unchanged (a keyframe toggle, the mobile sheet re-syncing)
    // came back with NO preset buttons at all.
    _railFam = null;
    // The FAMILY rail sits ABOVE the presets, the way AM nests them: pick the kind of graph first,
    // then which of its presets.
    famWrap = document.createElement('div'); famWrap.className = 'es-fams';
    (FM.EASE_FAMILIES || []).forEach(F => {
      const b = document.createElement('button'); b.className = 'es-fam'; b._key = F.key; b.title = F.label;
      const cv = document.createElement('canvas'); cv.width = 30; cv.height = 22; b.appendChild(cv);
      if (F.bez) drawGlyph(cv, 'easeInOut'); else drawEzGlyph(cv, F.presets[0]);
      b.appendChild(Object.assign(document.createElement('span'), { className: 'es-fam-lbl', textContent: F.label }));
      b.addEventListener('click', () => { if (curFamKey() !== F.key) applyFamily(F.key); });
      famWrap.appendChild(b);
    });
    // The pager arrows are gone: every preset of the active family is on screen at once now, so a
    // one-at-a-time stepper was a second, slower way to do what the rail already does.
    // The name and the loop toggle sit BESIDE the graph, not in a row under it. Measured: as their own
    // row they cost 37px of panel height, and at Studio 1280x720 — a 231px band — that was more than
    // half of everything the graph had left (31px). Beside it they cost nothing: the graph is square,
    // so on every panel this app has there is spare WIDTH next to it and never spare height.
    const side = document.createElement('div'); side.className = 'es-side';
    carLabel = document.createElement('div'); carLabel.className = 'es-car-label'; carLabel.textContent = 'Cubic Bezier Easing';
    loopBtn = document.createElement('button'); loopBtn.className = 'es-loop'; loopBtn.innerHTML = '&#8635;'; loopBtn.title = 'Loop';
    loopBtn.addEventListener('click', () => {
      // Compute the next loop mode ONCE from the button's source-of-truth (keys[0], which redraw
      // also reads) and apply that same mode to every animated prop, so they stay in lockstep with
      // the highlight instead of drifting apart when they started mismatched. (#18)
      const order = ['none', 'cycle', 'pingpong'];
      const first = cur.get(cur.keys[0]);
      const next = order[(order.indexOf((first && first.loopMode) || 'none') + 1) % order.length];
      cur.keys.forEach(k => { const p = cur.get(k); if (FM.isAnimated(p)) p.loopMode = next; });
      FM.requestRender(); redraw(); if (FM.history) FM.history.commit();
    });
    side.append(carLabel, loopBtn);
    main.append(gwrap, side);
    // The two rails now sit UNDER the graph as single rows (see .es-fams/.es-presets in styles.css).
    // Beside it they were a 351px-tall column in a panel that is 290px on a phone, which is why every
    // attempt to shrink this editor by trimming buttons ended with one parked below the fold.
    wrap.append(main, famWrap, presetWrap);
    return wrap;
  }

  // Returns the inline editor DOM for `layer`'s active transform mode, ready to drop into the inspector.
  FM.buildEasingEditor = function (layer, mode) {
    cur.layer = layer; cur.mode = mode || 'all';
    cur.get = k => layer.transform[k];
    cur._propKeys = MODE_PROPS[cur.mode] || MODE_PROPS.all;
    const picked = pickKfs(cur.get, cur._propKeys); cur.keys = picked.keys; cur.kfs = picked.kfs;
    const dom = buildEditorDom();
    redraw();
    return dom;
  };

  // Re-pick the keyframe segment active at the (now moved) playhead and redraw — called when the
  // timeline is scrubbed while the editor is open, so it edits the CURRENT segment, not a stale one.
  FM.refreshEasing = function () {
    if (!canvas || !cur.get || !cur._propKeys || !document.contains(canvas)) return;
    const picked = pickKfs(cur.get, cur._propKeys); cur.keys = picked.keys; cur.kfs = picked.kfs;
    redraw();
  };

  // Generic variant: edit the easing of ANY animatable prop (e.g. layer.volume). getProp(k) returns
  // the prop object for each key in propKeys.
  FM.buildEasingEditorFor = function (layer, getProp, propKeys, label) {
    cur.layer = layer; cur.mode = label || 'prop';
    cur.get = getProp;
    cur._propKeys = propKeys;
    const picked = pickKfs(getProp, propKeys); cur.keys = picked.keys; cur.kfs = picked.kfs;
    const dom = buildEditorDom();
    redraw();
    return dom;
  };

  // Open/close is now just an inspector sub-view flag — no separate screen. The Move & Transform
  // easing button calls openEasingCurve; the inspector renders buildEasingEditor inline in the sheet.
  FM.openEasingCurve = function (layer, mode) { FM._mtEasing = true; if (mode) FM._mtMode = mode; if (FM.inspector) FM.inspector.refresh(); };
  FM.closeEasingCurve = function () { FM._mtEasing = false; if (FM.inspector) FM.inspector.refresh(); };
})(window.FM);
