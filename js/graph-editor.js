/* FreeMotion — Velocity / easing curve editor (Alight Motion's signature feature).
 * Pick an animated property + a keyframe segment, then drag the two bezier handles to
 * shape the easing curve (slow-in, fast-out, overshoot, bounce-ish). Writes a custom
 * cubic-bezier onto the segment's end keyframe (kf.bez); evalProp uses it immediately.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const PROPS = ['x', 'y', 'scale', 'rotation', 'opacity'];
  const PAD = 20;
  let state = { layerId: null, prop: null, seg: 0 };
  let dragHandle = null;     // 0 or 1
  let curCanvas = null, curKf = null;

  function animProps(layer) { return PROPS.filter(k => FM.isAnimated(layer.transform[k])); }

  function bezOf(kf) {
    if (kf.bez) return kf.bez.slice();
    const p = FM.EASE_PRESETS[kf.e] || FM.EASE_PRESETS.easeInOut;
    return p.slice();
  }

  function draw(canvas, bez) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    const gx = x => PAD + x * (W - 2 * PAD);
    const gy = y => (H - PAD) - y * (H - 2 * PAD);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0c10'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = gx(i / 4), y = gy(i / 4);
      ctx.beginPath(); ctx.moveTo(x, gy(0)); ctx.lineTo(x, gy(1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx(0), y); ctx.lineTo(gx(1), y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(41,217,187,.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(bez[0]), gy(bez[1])); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx(1), gy(1)); ctx.lineTo(gx(bez[2]), gy(bez[3])); ctx.stroke();
    ctx.strokeStyle = '#29d9bb'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const x = i / 48, y = FM.bezierAt(bez[0], bez[1], bez[2], bez[3], x);
      const px = gx(x), py = gy(y); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#fff';
    [[0, 0], [1, 1]].forEach(p => { ctx.beginPath(); ctx.arc(gx(p[0]), gy(p[1]), 3, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#29d9bb';
    [[bez[0], bez[1]], [bez[2], bez[3]]].forEach(p => { ctx.beginPath(); ctx.arc(gx(p[0]), gy(p[1]), 6, 0, 7); ctx.fill(); });
  }

  function drawHold(canvas) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    const gx = x => PAD + x * (W - 2 * PAD);
    const gy = y => (H - PAD) - y * (H - 2 * PAD);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0c10'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = gx(i / 4), y = gy(i / 4);
      ctx.beginPath(); ctx.moveTo(x, gy(0)); ctx.lineTo(x, gy(1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx(0), y); ctx.lineTo(gx(1), y); ctx.stroke();
    }
    // step: value frozen at the start value (0) until the very end, then jumps to 1
    ctx.strokeStyle = '#7d8ca5'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(1), gy(0)); ctx.lineTo(gx(1), gy(1)); ctx.stroke();
    ctx.fillStyle = '#fff';
    [[0, 0], [1, 1]].forEach(p => { ctx.beginPath(); ctx.arc(gx(p[0]), gy(p[1]), 3, 0, 7); ctx.fill(); });
  }

  function setBez(bez) {
    if (!curKf) return;
    curKf.bez = bez.slice();
    curKf.e = 'custom';
    draw(curCanvas, bez);
    FM.requestRender();
  }

  function setHold() {
    if (!curKf) return;
    curKf.e = 'hold';
    delete curKf.bez;
    if (curCanvas) drawHold(curCanvas);
    FM.requestRender();
  }

  function canvasToGraph(canvas, e) {
    const r = canvas.getBoundingClientRect();
    const W = canvas.width, H = canvas.height;
    const px = (e.clientX - r.left) * (W / r.width);
    const py = (e.clientY - r.top) * (H / r.height);
    let x = (px - PAD) / (W - 2 * PAD);
    let y = ((H - PAD) - py) / (H - 2 * PAD);
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(-1, Math.min(2, y)) };
  }

  // Registered once (not per-mount) so inspector refreshes don't leak listeners.
  window.addEventListener('pointermove', e => {
    if (dragHandle === null || !curKf || !curCanvas) return;
    const g = canvasToGraph(curCanvas, e);
    const bez = bezOf(curKf);
    bez[dragHandle * 2] = g.x; bez[dragHandle * 2 + 1] = g.y;
    setBez(bez);
  });
  window.addEventListener('pointerup', () => { if (dragHandle !== null) { dragHandle = null; if (FM.history) FM.history.commit(); } });

  FM.graphEditor = {
    // Build the editor UI into `container` for the given layer (no-op if nothing animated).
    mount(container, layer) {
      container.innerHTML = '';
      curCanvas = null; curKf = null;
      const props = animProps(layer);
      if (!props.length) {
        const hint = document.createElement('div');
        hint.className = 'insp-hint';
        hint.textContent = 'Animate a property (◆) to shape its easing curve here.';
        container.appendChild(hint);
        return;
      }
      if (state.layerId !== layer.id || props.indexOf(state.prop) < 0) { state.layerId = layer.id; state.prop = props[0]; state.seg = 0; }

      // property + segment selectors
      const ctrls = document.createElement('div'); ctrls.className = 'ge-ctrls';
      const propSel = document.createElement('select');
      props.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; if (p === state.prop) o.selected = true; propSel.appendChild(o); });
      propSel.addEventListener('change', () => { state.prop = propSel.value; state.seg = 0; this.mount(container, layer); });
      ctrls.appendChild(propSel);

      const kf = layer.transform[state.prop].kf;
      const segCount = Math.max(1, kf.length - 1);
      if (state.seg > segCount - 1) state.seg = segCount - 1;
      const segSel = document.createElement('select');
      for (let i = 0; i < segCount; i++) { const o = document.createElement('option'); o.value = i; o.textContent = 'KF' + (i + 1) + ' → KF' + (i + 2); if (i === state.seg) o.selected = true; segSel.appendChild(o); }
      segSel.addEventListener('change', () => { state.seg = parseInt(segSel.value, 10); this.mount(container, layer); });
      ctrls.appendChild(segSel);
      container.appendChild(ctrls);

      if (kf.length < 2) {
        const hint = document.createElement('div'); hint.className = 'insp-hint';
        hint.textContent = 'Add a second keyframe to this property to shape a curve.';
        container.appendChild(hint);
        return;
      }

      curKf = kf[state.seg + 1];
      const canvas = document.createElement('canvas');
      canvas.className = 'ge-canvas'; canvas.width = 220; canvas.height = 220;
      container.appendChild(canvas);
      curCanvas = canvas;
      if (curKf.e === 'hold') drawHold(canvas); else draw(canvas, bezOf(curKf));

      // Precise numeric value entry for the segment's two keyframes.
      const valRow = document.createElement('div'); valRow.className = 'ge-vals';
      const r3 = v => Math.round(v * 1000) / 1000;
      [['From', kf[state.seg]], ['To', curKf]].forEach(pair => {
        const lab = document.createElement('label'); lab.className = 'ge-val'; lab.appendChild(document.createTextNode(pair[0]));
        const inp = document.createElement('input'); inp.type = 'number'; inp.step = 'any'; inp.value = r3(pair[1].v);
        inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (!isNaN(v)) { pair[1].v = v; FM.requestRender(); if (FM.timeline) FM.timeline.rebuild(); if (FM.history) FM.history.commit(); } });
        lab.appendChild(inp); valRow.appendChild(lab);
      });
      container.appendChild(valRow);

      canvas.addEventListener('pointerdown', e => {
        const g = canvasToGraph(canvas, e);
        const bez = bezOf(curKf);
        const d0 = Math.hypot(g.x - bez[0], g.y - bez[1]);
        const d1 = Math.hypot(g.x - bez[2], g.y - bez[3]);
        dragHandle = d0 <= d1 ? 0 : 1;
        e.preventDefault();
      });

      // presets
      const presets = document.createElement('div'); presets.className = 'ge-presets';
      [['Linear', 'linear'], ['In', 'easeIn'], ['Out', 'easeOut'], ['In-Out', 'easeInOut'], ['Overshoot', 'overshoot'], ['Anticipate', 'anticipate']].forEach(([label, key]) => {
        const b = document.createElement('button'); b.className = 'ge-preset'; b.textContent = label;
        b.addEventListener('click', () => { setBez(FM.EASE_PRESETS[key].slice()); if (FM.history) FM.history.commit(); });
        presets.appendChild(b);
      });
      const holdBtn = document.createElement('button'); holdBtn.className = 'ge-preset hold'; holdBtn.textContent = 'Hold';
      holdBtn.title = 'Stepped / hold — freeze the value until this keyframe, then jump';
      holdBtn.addEventListener('click', () => { setHold(); if (FM.history) FM.history.commit(); });
      presets.appendChild(holdBtn);
      container.appendChild(presets);
    },
  };
})(window.FM);
