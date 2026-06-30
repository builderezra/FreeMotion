/* FreeMotion — Easing Curve screen (Alight Motion's signature graph editor).
 * Opened from the Move & Transform left rail. Edits the easing of the active mode's animated
 * properties at the playhead together: drag the two cubic-bezier handles, pick a preset, set Hold,
 * or loop the property. Writes kf.bez / kf.e / p.loopMode; evalProp uses them immediately.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const MODE_PROPS = {
    move: ['x', 'y', 'z'], rotate: ['rotation'], scale: ['scale', 'scaleX', 'scaleY'], skew: ['skewX', 'skewY'],
    all: ['x', 'y', 'z', 'rotation', 'scale', 'scaleX', 'scaleY', 'skewX', 'skewY', 'opacity'],
  };
  const PRESETS = [
    { key: 'linear', label: 'Linear' },
    { key: 'easeOut', label: 'Ease Out' },
    { key: 'easeIn', label: 'Ease In' },
    { key: 'easeInOut', label: 'Ease In-Out' },
    { key: 'overshoot', label: 'Overshoot' },
    { key: 'hold', label: 'Hold' },
  ];
  const PAD = 26;
  let overlay = null, canvas = null, presetWrap = null, hint = null, loopBtn = null, carLabel = null;
  let cur = { layer: null, mode: 'all', keys: [], kfs: [] };   // kfs = end-keyframes to edit together
  let dragHandle = null;

  function bezOf(kf) { if (kf.bez) return kf.bez.slice(); const p = FM.EASE_PRESETS[kf.e] || FM.EASE_PRESETS.easeInOut; return p.slice(); }

  function grid(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c1016'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    const gx = x => PAD + x * (W - 2 * PAD), gy = y => (H - PAD) - y * (H - 2 * PAD);
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(gx(i / 4), gy(0)); ctx.lineTo(gx(i / 4), gy(1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx(0), gy(i / 4)); ctx.lineTo(gx(1), gy(i / 4)); ctx.stroke();
    }
    return { gx: gx, gy: gy };
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
  // Mini preview for a preset glyph button.
  function drawGlyph(cv, key) {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, p = 4;
    ctx.clearRect(0, 0, W, H);
    const gx = x => p + x * (W - 2 * p), gy = y => (H - p) - y * (H - 2 * p);
    ctx.strokeStyle = '#c2cee0'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    if (key === 'hold') { ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(1), gy(0)); ctx.lineTo(gx(1), gy(1)); }
    else { const b = FM.EASE_PRESETS[key]; for (let i = 0; i <= 24; i++) { const x = i / 24, y = FM.bezierAt(b[0], b[1], b[2], b[3], x); const px = gx(x), py = gy(Math.max(-0.2, Math.min(1.2, y))); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } }
    ctx.stroke();
  }

  function pickKfs(layer, mode) {
    const props = (MODE_PROPS[mode] || MODE_PROPS.all).filter(k => FM.isAnimated(layer.transform[k]) && layer.transform[k].kf.length >= 2);
    const t = FM.time, keys = [], kfs = [];
    props.forEach(k => {
      const kf = layer.transform[k].kf;
      let idx = kf.findIndex(x => x.t >= t - 1e-3);
      if (idx < 1) idx = (t <= kf[0].t) ? 1 : kf.length - 1;
      if (idx > kf.length - 1) idx = kf.length - 1;
      keys.push(k); kfs.push(kf[idx]);
    });
    return { keys: keys, kfs: kfs };
  }

  function applyBez(bez) { cur.kfs.forEach(kf => { kf.bez = bez.slice(); kf.e = 'custom'; }); FM.requestRender(); redraw(); }
  function applyPreset(key) {
    // Store only the named easing (delete any custom bez). evalProp + bezOf both resolve a named
    // ease from kf.e, and every "is a preset active?" read site checks for the ABSENCE of kf.bez —
    // so writing bez here was what stopped presets highlighting and broke the label/carousel. (#4,#5)
    cur.kfs.forEach(kf => { kf.e = key; delete kf.bez; });
    FM.requestRender(); redraw(); if (FM.history) FM.history.commit();
  }
  function curIsHold() { return cur.kfs.length && cur.kfs[0].e === 'hold'; }

  function redraw() {
    if (!canvas) return;
    if (!cur.kfs.length) { hint.style.display = ''; canvas.style.display = 'none'; presetWrap.style.opacity = '.4'; if (carLabel) carLabel.textContent = '—'; return; }
    hint.style.display = 'none'; canvas.style.display = ''; presetWrap.style.opacity = '1';
    if (curIsHold()) drawHold(canvas.getContext('2d'), canvas.width, canvas.height);
    else drawBez(canvas.getContext('2d'), canvas.width, canvas.height, bezOf(cur.kfs[0]));
    // active preset highlight
    const activeKey = curIsHold() ? 'hold' : (cur.kfs[0].bez ? null : cur.kfs[0].e);
    [].forEach.call(presetWrap.children, b => b.classList.toggle('on', b._key === activeKey));
    if (carLabel) carLabel.textContent = curIsHold() ? 'Hold (step)' : (cur.kfs[0].bez ? 'Cubic Bezier Easing' : (PRESETS.find(p => p.key === cur.kfs[0].e) || {}).label || 'Cubic Bezier Easing');
    if (loopBtn) { const lm = cur.layer && cur.layer.transform[cur.keys[0]] && cur.layer.transform[cur.keys[0]].loopMode; loopBtn.classList.toggle('on', !!lm && lm !== 'none'); loopBtn.title = 'Loop: ' + (lm || 'none'); }
  }

  function toGraph(e) {
    const r = canvas.getBoundingClientRect(), W = canvas.width, H = canvas.height;
    const px = (e.clientX - r.left) * (W / r.width), py = (e.clientY - r.top) * (H / r.height);
    return { x: Math.max(0, Math.min(1, (px - PAD) / (W - 2 * PAD))), y: Math.max(-1, Math.min(2, ((H - PAD) - py) / (H - 2 * PAD))) };
  }
  window.addEventListener('pointermove', e => { if (dragHandle === null || !cur.kfs.length || !canvas) return; const g = toGraph(e); const bez = bezOf(cur.kfs[0]); bez[dragHandle * 2] = g.x; bez[dragHandle * 2 + 1] = g.y; applyBez(bez); });
  window.addEventListener('pointerup', () => { if (dragHandle !== null) { dragHandle = null; if (FM.history) FM.history.commit(); } });

  function build() {
    if (overlay) return;
    overlay = document.createElement('div'); overlay.id = 'easing-screen';
    const head = document.createElement('div'); head.className = 'es-head';
    const back = document.createElement('button'); back.className = 'es-back'; back.innerHTML = '&#8249;'; back.title = 'Back'; back.addEventListener('click', FM.closeEasingCurve);
    const title = document.createElement('div'); title.className = 'es-title'; title.textContent = 'Easing Curve';
    head.append(back, title);

    const main = document.createElement('div'); main.className = 'es-main';
    const gwrap = document.createElement('div'); gwrap.className = 'es-graph';
    canvas = document.createElement('canvas'); canvas.className = 'es-canvas'; canvas.width = 320; canvas.height = 320;
    hint = document.createElement('div'); hint.className = 'es-hint'; hint.textContent = 'Animate this property (tap ◆), add a second keyframe, then shape its easing here.'; hint.style.display = 'none';
    canvas.addEventListener('pointerdown', e => { if (!cur.kfs.length || curIsHold()) return; const g = toGraph(e); const bez = bezOf(cur.kfs[0]); dragHandle = Math.hypot(g.x - bez[0], g.y - bez[1]) <= Math.hypot(g.x - bez[2], g.y - bez[3]) ? 0 : 1; e.preventDefault(); });
    gwrap.append(canvas, hint);

    presetWrap = document.createElement('div'); presetWrap.className = 'es-presets';
    PRESETS.forEach(pr => {
      const b = document.createElement('button'); b.className = 'es-preset'; b._key = pr.key; b.title = pr.label;
      const cv = document.createElement('canvas'); cv.width = 30; cv.height = 22; b.appendChild(cv); drawGlyph(cv, pr.key);
      b.addEventListener('click', () => applyPreset(pr.key));
      presetWrap.appendChild(b);
    });
    main.append(gwrap, presetWrap);

    const car = document.createElement('div'); car.className = 'es-carousel';
    const cprev = document.createElement('button'); cprev.className = 'es-car-arrow'; cprev.innerHTML = '&#8249;';
    carLabel = document.createElement('div'); carLabel.className = 'es-car-label'; carLabel.textContent = 'Cubic Bezier Easing';
    const cnext = document.createElement('button'); cnext.className = 'es-car-arrow'; cnext.innerHTML = '&#8250;';
    const step = d => { const order = PRESETS.map(p => p.key); const a = curIsHold() ? 'hold' : (cur.kfs.length && !cur.kfs[0].bez ? cur.kfs[0].e : 'easeInOut'); let i = order.indexOf(a); i = (i < 0 ? 0 : i + d + order.length) % order.length; applyPreset(order[i]); };
    cprev.addEventListener('click', () => step(-1)); cnext.addEventListener('click', () => step(1));
    car.append(cprev, carLabel, cnext);

    const foot = document.createElement('div'); foot.className = 'es-foot';
    loopBtn = document.createElement('button'); loopBtn.className = 'es-loop'; loopBtn.innerHTML = '&#8635;'; loopBtn.title = 'Loop';
    loopBtn.addEventListener('click', () => {
      // Compute the next loop mode ONCE from the button's source-of-truth (keys[0], which redraw
      // also reads) and apply that same mode to every animated prop, so they stay in lockstep with
      // the highlight instead of drifting apart when they started mismatched. (#18)
      const order = ['none', 'cycle', 'pingpong'];
      const first = cur.layer.transform[cur.keys[0]];
      const next = order[(order.indexOf((first && first.loopMode) || 'none') + 1) % order.length];
      cur.keys.forEach(k => { const p = cur.layer.transform[k]; if (FM.isAnimated(p)) p.loopMode = next; });
      FM.requestRender(); redraw(); if (FM.history) FM.history.commit();
    });
    const dots = document.createElement('button'); dots.className = 'es-dots'; dots.innerHTML = '&#8943;'; dots.title = 'More';
    foot.append(loopBtn, dots);

    overlay.append(head, main, car, foot);
    document.body.appendChild(overlay);
  }

  FM.openEasingCurve = function (layer, mode) {
    build();
    cur.layer = layer; cur.mode = mode || 'all';
    const picked = pickKfs(layer, cur.mode); cur.keys = picked.keys; cur.kfs = picked.kfs;
    redraw();
    overlay.classList.add('open');
  };
  FM.closeEasingCurve = function () { if (overlay) overlay.classList.remove('open'); };
})(window.FM);
