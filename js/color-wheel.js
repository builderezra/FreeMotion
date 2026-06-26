/* FreeMotion — Color Tune wheel (Alight Motion Color & Fill look).
 * HSV wheel: angle = hue shift, radius = saturation boost. Writes layer.colorGrade
 * {hue, sat} which the compositor applies as hue-rotate + saturate (so it also exports).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const SZ = 176, R = SZ / 2 - 8;
  let state = { layer: null, canvas: null, knob: null };
  let dragging = false;

  function drawWheel(ctx) {
    const cx = SZ / 2, cy = SZ / 2;
    for (let a = 0; a < 360; a += 1) {
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, (a - 1) * Math.PI / 180, (a + 1.5) * Math.PI / 180);
      ctx.closePath(); ctx.fillStyle = 'hsl(' + a + ',100%,50%)'; ctx.fill();
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill();
  }

  function placeKnob() {
    if (!state.knob || !state.layer) return;
    const g = state.layer.colorGrade || { hue: 0, sat: 1 };
    const ang = g.hue * Math.PI / 180;
    const rad = Math.min(1, Math.max(0, g.sat - 1)) * R;   // sat 1..2 -> radius 0..R
    state.knob.style.left = (SZ / 2 + Math.cos(ang) * rad) + 'px';
    state.knob.style.top = (SZ / 2 + Math.sin(ang) * rad) + 'px';
  }

  function fromEvent(e) {
    if (!state.canvas || !state.layer) return;
    const r = state.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (SZ / r.width) - SZ / 2;
    const y = (e.clientY - r.top) * (SZ / r.height) - SZ / 2;
    let ang = Math.atan2(y, x) * 180 / Math.PI; if (ang < 0) ang += 360;
    const rad = Math.min(1, Math.hypot(x, y) / R);
    const cg = state.layer.colorGrade || (state.layer.colorGrade = {});   // merge — keep lift/gamma/gain
    cg.hue = Math.round(ang); cg.sat = Math.round((1 + rad) * 100) / 100;
    placeKnob(); FM.requestRender();
  }

  // window listeners registered once (avoid per-mount leaks)
  window.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
  window.addEventListener('pointerup', () => { if (dragging) { dragging = false; if (FM.history) FM.history.commit(); } });

  FM.colorWheel = {
    mount(container, layer) {
      container.innerHTML = '';
      if (!layer.colorGrade) layer.colorGrade = { hue: 0, sat: 1 };
      const wrap = document.createElement('div'); wrap.className = 'cw-wrap';
      const canvas = document.createElement('canvas'); canvas.width = SZ; canvas.height = SZ; canvas.className = 'cw-canvas';
      drawWheel(canvas.getContext('2d'));
      const knob = document.createElement('div'); knob.className = 'cw-knob';
      wrap.appendChild(canvas); wrap.appendChild(knob);
      container.appendChild(wrap);
      state.layer = layer; state.canvas = canvas; state.knob = knob;
      placeKnob();
      canvas.addEventListener('pointerdown', e => { e.preventDefault(); dragging = true; fromEvent(e); });
      const reset = document.createElement('button'); reset.className = 'btn'; reset.textContent = 'Reset color'; reset.style.marginTop = '10px';
      reset.addEventListener('click', () => { layer.colorGrade.hue = 0; layer.colorGrade.sat = 1; placeKnob(); FM.requestRender(); if (FM.history) FM.history.commit(); });
      container.appendChild(reset);
    },
  };
})(window.FM);
