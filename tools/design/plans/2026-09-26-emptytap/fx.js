/* PROTOTYPE — injected at runtime by tools/shot.py, never written into the app.
   window.__fx = { area, pulse(x,y), press(opt,x,y), seek(ms), SEEKABLE }  */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const css = `
  .tl-areafx { position: absolute; pointer-events: none; z-index: 8; overflow: hidden; contain: strict; }
  .tl-areafx--pulse { overflow: visible; }
  .tl-areafx svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; }
  .tl-areafx .pf-blob, .tl-areafx .pf-core, .tl-areafx .pf-ring, .tl-areafx .pf-spark, .tl-areafx .pf-tint { position: absolute; left: 0; top: 0; border-radius: 50%; will-change: transform, opacity; }
  .tl-areafx canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
  #timeline-panel.tl-empty-start #timeline:focus-within, #timeline-panel.tl-empty-start #timeline:hover { box-shadow: none !important; }
  #timeline-panel.tl-empty-start .tl-addrow-pulse { display: none !important; }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function safeBottom() {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)';
    document.body.appendChild(p); const v = parseFloat(getComputedStyle(p).paddingBottom) || 0; p.remove(); return v;
  }
  function area() {
    const tl = document.getElementById('timeline');
    const r = tl.getBoundingClientRect();
    const ruler = document.getElementById('tl-rulerrow');
    const top = ruler ? Math.min(r.bottom, Math.max(r.top, ruler.getBoundingClientRect().bottom)) : r.top;
    return { left: r.left, top: top, right: r.left + tl.clientWidth, bottom: r.bottom, width: tl.clientWidth, height: r.bottom - top };
  }
  function host(a, cls) {
    const panel = document.getElementById('timeline-panel');
    const pr = panel.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'tl-areafx ' + cls; el.setAttribute('aria-hidden', 'true');
    el.style.left = (a.left - pr.left - panel.clientLeft) + 'px';
    el.style.top = (a.top - pr.top - panel.clientTop) + 'px';
    el.style.width = a.width + 'px'; el.style.height = a.height + 'px';
    panel.appendChild(el);
    return el;
  }
  const hueAt = (a, x, y) => Math.round(((x - a.left) / a.width) * 300 + ((y - a.top) / a.height) * 60) % 360;

  /* ---------- the perimeter pulse: two comets, bottom-centre -> up both sides -> meet top-centre ---------- */
  function pulse() {
    const a = area();
    const el = host(a, 'tl-areafx--pulse');
    const W = a.width, H = a.height, sb = safeBottom();
    const inset = 4, x0 = inset, x1 = W - inset, T = inset, B = H - Math.max(inset, sb * 0.6);
    const rt = 14, rb = sb > 0 ? 34 : 14, cx = W / 2;
    const half = (s) => { // s = -1 left, +1 right
      const xe = s < 0 ? x0 : x1, sw = s < 0 ? 1 : 0;
      return `M${cx},${B} L${xe - s * rb},${B} A${rb},${rb} 0 0 ${sw} ${xe},${B - rb} L${xe},${T + rt} A${rt},${rt} 0 0 ${sw} ${xe - s * rt},${T} L${cx},${T}`;
    };
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `<defs>
      <linearGradient id="fxTrail" x1="0" y1="${B}" x2="0" y2="${T}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#5ac7ed"/><stop offset=".55" stop-color="#96e8ff"/><stop offset="1" stop-color="#c9b8ff"/></linearGradient>
      <radialGradient id="fxMeet"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".35" stop-color="#b9f1ff" stop-opacity=".8"/><stop offset="1" stop-color="#96e8ff" stop-opacity="0"/></radialGradient></defs>`;
    el.appendChild(svg);
    const TRAVEL = 620, TOTAL = 1100, ease = 'cubic-bezier(.33,.0,.2,1)';
    [-1, 1].forEach((s) => {
      const mk = (stroke, w, op) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', half(s)); p.setAttribute('fill', 'none'); p.setAttribute('stroke', stroke); p.setAttribute('stroke-width', w); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-opacity', op); svg.appendChild(p); return p; };
      const trailGlow = mk('url(#fxTrail)', 6, .22);
      const trail = mk('url(#fxTrail)', 1.6, 1);
      const glow = mk('#5ac7ed', 10, .22);
      const glow2 = mk('#96e8ff', 5, .45);
      const core = mk('#f2fdff', 2.4, 1);
      const L = trail.getTotalLength();
      [trail, trailGlow].forEach((tp) => {
        tp.style.strokeDasharray = `${L} ${L}`;
        tp.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: TRAVEL, easing: ease, fill: 'forwards' });
        tp.animate([{ opacity: .95 }, { opacity: .95, offset: TRAVEL / TOTAL }, { opacity: 0 }], { duration: TOTAL, fill: 'forwards' });
      });
      [[glow, 110], [glow2, 70], [core, 40]].forEach(([p, h]) => {
        p.style.strokeDasharray = `${h} ${L * 2}`;
        p.animate([{ strokeDashoffset: h }, { strokeDashoffset: h - L }], { duration: TRAVEL, easing: ease, fill: 'forwards' });
        p.animate([{ opacity: 0 }, { opacity: 1, offset: .06 }, { opacity: 1, offset: (TRAVEL - 40) / TOTAL }, { opacity: 0, offset: (TRAVEL + 140) / TOTAL }, { opacity: 0 }], { duration: TOTAL, fill: 'forwards' });
      });
    });
    const meet = document.createElementNS(NS, 'circle');
    meet.setAttribute('cx', cx); meet.setAttribute('cy', T); meet.setAttribute('r', 30); meet.setAttribute('fill', 'url(#fxMeet)');
    meet.style.transformOrigin = `${cx}px ${T}px`; meet.style.transformBox = 'view-box';
    svg.appendChild(meet);
    meet.animate([{ opacity: 0, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(.2)', offset: (TRAVEL - 60) / TOTAL }, { opacity: 1, transform: 'scale(1)', offset: (TRAVEL + 60) / TOTAL }, { opacity: 0, transform: 'scale(1.6)' }], { duration: TOTAL, fill: 'forwards' });
    setTimeout(() => { if (!window.__fxHold) el.remove(); }, TOTAL + 150);
    return el;
  }

  /* ---------- A: aurora curtains ---------- */
  function pressA(x, y) {
    const a = area(); const el = host(a, 'tl-areafx--press'); const h = hueAt(a, x, y);
    const lx = x - a.left, ly = y - a.top, W = a.width, H = a.height, DUR = 950, N = 6;
    el.style.mixBlendMode = 'screen';
    const tint = document.createElement('div'); tint.className = 'pf-tint';
    tint.style.cssText = `width:${W}px;height:${H}px;border-radius:0;background:linear-gradient(90deg,hsla(${h},95%,55%,.20),hsla(${h + 80},95%,55%,.16),hsla(${h + 160},95%,55%,.20))`;
    el.appendChild(tint);
    tint.animate([{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 0 }], { duration: DUR, fill: 'both' });
    const CW = Math.round(W / 2.6), CH = Math.round(H * 1.5);
    for (let i = 0; i < N; i++) {
      const hh = (h + i * 42) % 360;
      const tx = W * (i + 0.5) / N, drift = (i % 2 ? 1 : -1) * 18;
      const c = document.createElement('div'); c.className = 'pf-blob';
      c.style.cssText = `width:${CW}px;height:${CH}px;background:radial-gradient(closest-side,hsla(${hh},100%,70%,.95),hsla(${hh + 18},100%,60%,.55) 45%,hsla(${hh + 30},100%,55%,0) 100%)`;
      el.appendChild(c);
      const y0 = ly - CH / 2, y1 = H / 2 - CH / 2;
      c.animate([
        { transform: `translate(${lx - CW / 2}px,${y0}px) scale(.12,.18)`, opacity: 0 },
        { transform: `translate(${tx - CW / 2}px,${y1}px) scale(.85,.9)`, opacity: .95, offset: .32 },
        { transform: `translate(${tx - CW / 2 + drift}px,${y1}px) scale(1.15,1.05) skewX(${drift / 3}deg)`, opacity: 0 }
      ], { duration: DUR, delay: Math.abs(tx - lx) / W * 90, easing: 'cubic-bezier(.2,.75,.3,1)', fill: 'both' });
    }
    const c = document.createElement('div'); c.className = 'pf-core';
    c.style.cssText = `width:160px;height:160px;background:radial-gradient(closest-side,rgba(255,255,255,.95),hsla(${h},100%,78%,.6) 38%,hsla(${h},100%,70%,0))`;
    el.appendChild(c);
    c.animate([{ transform: `translate(${lx - 80}px,${ly - 80}px) scale(.15)`, opacity: 1 }, { transform: `translate(${lx - 80}px,${ly - 80}px) scale(1.4)`, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
    setTimeout(() => { if (!window.__fxHold) el.remove(); }, DUR + 200);
    return el;
  }

  /* ---------- B: colour rings + sparks ---------- */
  function pressB(x, y) {
    const a = area(); const el = host(a, 'tl-areafx--press'); const h = hueAt(a, x, y);
    el.style.mixBlendMode = 'screen';
    const lx = x - a.left, ly = y - a.top, W = a.width, H = a.height, DUR = 950;
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([cx, cy]) => Math.hypot(cx - lx, cy - ly)));
    const tint = document.createElement('div'); tint.className = 'pf-tint';
    tint.style.cssText = `width:${W}px;height:${H}px;border-radius:0;background:radial-gradient(circle at ${lx}px ${ly}px,hsla(${h},95%,62%,.30),hsla(${h + 60},90%,58%,.14) 45%,hsla(${h + 120},90%,58%,.06))`;
    el.appendChild(tint);
    tint.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 0 }], { duration: DUR, fill: 'forwards' });
    const R = 160;
    [0, 1, 2].forEach((i) => {
      const hh = (h + i * 55) % 360;
      const ring = document.createElement('div'); ring.className = 'pf-ring';
      ring.style.cssText = `width:${2 * R}px;height:${2 * R}px;background:radial-gradient(closest-side,hsla(${hh},95%,62%,0) 70%,hsla(${hh},95%,66%,.85) 88%,hsla(${hh + 20},100%,85%,.95) 93%,hsla(${hh},95%,62%,0) 100%)`;
      el.appendChild(ring);
      ring.animate([{ transform: `translate(${lx - R}px,${ly - R}px) scale(.04)`, opacity: 1 }, { opacity: .85, offset: .55 }, { transform: `translate(${lx - R}px,${ly - R}px) scale(${(far * (1 - i * 0.18)) / R})`, opacity: 0 }], { duration: 720, delay: i * 110, easing: 'cubic-bezier(.2,.75,.3,1)', fill: 'both' });
    });
    const N = 30;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2 + (i % 2) * 0.12;
      const dist = far * (0.42 + ((i * 37) % 11) / 11 * 0.5);
      const hh = (h + i * 16) % 360, sz = 6 + (i % 4) * 3;
      const s = document.createElement('div'); s.className = 'pf-spark';
      s.style.cssText = `width:${sz}px;height:${sz}px;background:hsl(${hh},100%,70%);box-shadow:0 0 ${sz * 1.6}px hsla(${hh},100%,65%,.9)`;
      el.appendChild(s);
      const tx = lx + Math.cos(ang) * dist - sz / 2, ty = ly + Math.sin(ang) * dist - sz / 2;
      s.animate([{ transform: `translate(${lx - sz / 2}px,${ly - sz / 2}px) scale(.4)`, opacity: 1 }, { opacity: 1, offset: .6 }, { transform: `translate(${tx}px,${ty}px) scale(1)`, opacity: 0 }], { duration: 820, delay: (i % 3) * 30, easing: 'cubic-bezier(.12,.8,.3,1)', fill: 'both' });
    }
    setTimeout(() => { if (!window.__fxHold) el.remove(); }, DUR + 200);
    return el;
  }

  /* ---------- C: key ripple on one canvas (the #571 keyboard, grown to the whole area) ---------- */
  const drawers = [];
  function pressC(x, y) {
    const a = area(); const el = host(a, 'tl-areafx--press'); el.style.mixBlendMode = 'screen';
    const W = a.width, H = a.height, lx = x - a.left, ly = y - a.top, DUR = 1000;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas'); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    el.appendChild(cv); const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const K = 34, GAP = 6, cols = Math.ceil(W / (K + GAP)) + 1, rows = Math.ceil(H / (K + GAP)) + 1;
    const ox = ((W - cols * (K + GAP) + GAP) / 2), oy = ((H - rows * (K + GAP) + GAP) / 2);
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([cx, cy]) => Math.hypot(cx - lx, cy - ly)));
    const SPEED = far / 480;  // px per ms: wavefront reaches the farthest key at 520ms
    const draw = (t) => {
      g.clearRect(0, 0, W, H);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const kx = ox + c * (K + GAP), ky = oy + r * (K + GAP), mx = kx + K / 2, my = ky + K / 2;
        const d = Math.hypot(mx - lx, my - ly), dt = t - d / SPEED;
        if (dt < 0) continue;
        const v = dt < 70 ? dt / 70 : Math.exp(-(dt - 70) / 170);
        if (v < 0.02) continue;
        const hue = Math.round(((mx / W) * 300 + (my / H) * 60)) % 360;
        g.globalAlpha = v * 0.35; g.fillStyle = `hsl(${hue},100%,62%)`;
        g.beginPath(); g.roundRect(kx - 5, ky - 5, K + 10, K + 10, 12); g.fill();
        g.globalAlpha = v * 0.9; g.fillStyle = `hsl(${hue},96%,${60 + v * 18}%)`;
        const sc = 0.82 + 0.18 * Math.min(1, dt / 90);
        const kk = K * sc; g.beginPath(); g.roundRect(mx - kk / 2, my - kk / 2, kk, kk, 8); g.fill();
      }
      // white-hot centre
      const cg = g.createRadialGradient(lx, ly, 0, lx, ly, 64);
      const cv0 = Math.max(0, 1 - t / 260);
      cg.addColorStop(0, `rgba(255,255,255,${0.9 * cv0})`); cg.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = 1; g.fillStyle = cg; g.fillRect(0, 0, W, H);
    };
    const t0 = performance.now(); let live = true;
    const tick = () => { if (!live || el._seeking) return; const t = performance.now() - t0; draw(t); if (t < DUR) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    el._draw = draw; drawers.push(el);
    setTimeout(() => { live = false; if (!window.__fxHold) el.remove(); }, DUR + 200);
    return el;
  }

  // seek every live fx to an absolute time since it was fired
  function seek(ms, sheetDelay) {
    if (sheetDelay != null) { const sh = document.getElementById('add-sheet'); if (sh) sh.getAnimations().forEach((an) => { an.pause(); an.currentTime = Math.max(0, ms - sheetDelay); }); }
    document.querySelectorAll('.tl-areafx').forEach((el) => {
      el.getAnimations({ subtree: true }).forEach((an) => { an.pause(); an.currentTime = ms; });
      if (el._draw) { el._seeking = true; el._draw(ms); }
    });
  }
  window.__fx = { area, pulse, press: { A: pressA, B: pressB, C: pressC }, seek, hueAt };
})();
