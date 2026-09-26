  /* ---- OPTION B, "RINGS + SPARKS" — replaces areaPress if he picks B ---- */
  function areaPress(a, x, y) {
    const host = fxHost(a, 'tl-areafx--press');
    if (!host) return null;
    const W = a.width, H = a.height, lx = x - a.left, ly = y - a.top, h = fxHue(a, x, y);
    host.dataset.x = String(Math.round(lx)); host.dataset.y = String(Math.round(ly)); host.dataset.h = String(h);
    const far = Math.max(Math.hypot(lx, ly), Math.hypot(W - lx, ly), Math.hypot(lx, H - ly), Math.hypot(W - lx, H - ly));
    const add = function (cls, css) { const d = document.createElement('div'); d.className = cls; d.style.cssText = css; host.appendChild(d); return d; };
    const tint = add('fx-tint', 'width:' + W + 'px;height:' + H + 'px;background:radial-gradient(circle at ' + lx + 'px ' + ly + 'px,hsla(' + h +
      ',95%,62%,.30),hsla(' + (h + 60) + ',90%,58%,.14) 45%,hsla(' + (h + 120) + ',90%,58%,.06))');
    tint.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: FX_PRESS_MS, fill: 'both' });
    const R = 160;
    for (let i = 0; i < 3; i++) {
      const hh = (h + i * 55) % 360;
      const ring = add('fx-curtain fx-ring', 'width:' + (2 * R) + 'px;height:' + (2 * R) + 'px;background:radial-gradient(closest-side,hsla(' + hh +
        ',95%,62%,0) 70%,hsla(' + hh + ',95%,66%,.85) 88%,hsla(' + (hh + 20) + ',100%,85%,.95) 93%,hsla(' + hh + ',95%,62%,0) 100%)');
      ring.animate([{ transform: 'translate(' + (lx - R) + 'px,' + (ly - R) + 'px) scale(.04)', opacity: 1 }, { opacity: 0.85, offset: 0.55 },
        { transform: 'translate(' + (lx - R) + 'px,' + (ly - R) + 'px) scale(' + (far * (1 - i * 0.18) / R) + ')', opacity: 0 }],
        { duration: 720, delay: i * 110, easing: 'cubic-bezier(.2,.75,.3,1)', fill: 'both' });
    }
    const N = 30;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2 + (i % 2) * 0.12, dist = far * (0.42 + ((i * 37) % 11) / 11 * 0.5);
      const hh = (h + i * 16) % 360, sz = 6 + (i % 4) * 3;
      const s = add('fx-spark', 'width:' + sz + 'px;height:' + sz + 'px;background:hsl(' + hh + ',100%,70%);box-shadow:0 0 ' + (sz * 1.6) + 'px hsla(' + hh + ',100%,65%,.9)');
      s.animate([{ transform: 'translate(' + (lx - sz / 2) + 'px,' + (ly - sz / 2) + 'px) scale(.4)', opacity: 1 }, { opacity: 1, offset: 0.6 },
        { transform: 'translate(' + (lx + Math.cos(ang) * dist - sz / 2) + 'px,' + (ly + Math.sin(ang) * dist - sz / 2) + 'px) scale(1)', opacity: 0 }],
        { duration: 820, delay: (i % 3) * 30, easing: 'cubic-bezier(.12,.8,.3,1)', fill: 'both' });
    }
    const core = add('fx-core', 'width:120px;height:120px;background:radial-gradient(closest-side,rgba(255,255,255,.95),hsla(' + h + ',100%,78%,.5) 40%,hsla(' + h + ',100%,70%,0))');
    core.animate([{ transform: 'translate(' + (lx - 60) + 'px,' + (ly - 60) + 'px) scale(.15)', opacity: 1 },
      { transform: 'translate(' + (lx - 60) + 'px,' + (ly - 60) + 'px) scale(1.3)', opacity: 0 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
    fxTeardown(host, FX_PRESS_MS + 200);
    return host;
  }
  /* ⚠️ T3's coverage check reads `.fx-curtain` boxes: for B the RINGS carry that class, and a ring is lit only on its
     band, not inside it — so for B, change T3's ellipse test to "inside the ring's outer 0.95 radius AND outside its
     0.65 radius" at the sampled time, OR count the tint (alpha .30 at the finger, .06 at the far edge) as lit.
     Decide by measuring, and write the chosen threshold into the test. */

  /* ---- OPTION C, "KEY RIPPLE" — replaces areaPress if he picks C. One canvas; rAF-driven. ---- */
  function areaPress(a, x, y) {
    const host = fxHost(a, 'tl-areafx--press');
    if (!host) return null;
    const W = a.width, H = a.height, lx = x - a.left, ly = y - a.top, h = fxHue(a, x, y);
    host.dataset.x = String(Math.round(lx)); host.dataset.y = String(Math.round(ly)); host.dataset.h = String(h);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.className = 'fx-keys'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;border-radius:0';
    host.appendChild(cv);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const K = 34, GAP = 6, cols = Math.ceil(W / (K + GAP)) + 1, rows = Math.ceil(H / (K + GAP)) + 1;
    const ox = (W - cols * (K + GAP) + GAP) / 2, oy = (H - rows * (K + GAP) + GAP) / 2;
    const far = Math.max(Math.hypot(lx, ly), Math.hypot(W - lx, ly), Math.hypot(lx, H - ly), Math.hypot(W - lx, H - ly));
    const SPEED = far / 480;   // the wave reaches the farthest key at 480 ms
    const rr = function (x0, y0, w, hh, r) { if (g.roundRect) { g.beginPath(); g.roundRect(x0, y0, w, hh, r); } else { g.beginPath(); g.rect(x0, y0, w, hh); } };
    const draw = function (t) {
      g.clearRect(0, 0, W, H);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const kx = ox + c * (K + GAP), ky = oy + r * (K + GAP), mx = kx + K / 2, my = ky + K / 2;
        const dt = t - Math.hypot(mx - lx, my - ly) / SPEED;
        if (dt < 0) continue;
        const v = dt < 70 ? dt / 70 : Math.exp(-(dt - 70) / 170);
        if (v < 0.02) continue;
        const hue = Math.round((mx / W) * 300 + (my / H) * 60) % 360;   // each KEY has its own colour (#571)
        g.globalAlpha = v * 0.35; g.fillStyle = 'hsl(' + hue + ',100%,62%)'; rr(kx - 5, ky - 5, K + 10, K + 10, 12); g.fill();
        const kk = K * (0.82 + 0.18 * Math.min(1, dt / 90));
        g.globalAlpha = v * 0.9; g.fillStyle = 'hsl(' + hue + ',96%,' + (60 + v * 18) + '%)'; rr(mx - kk / 2, my - kk / 2, kk, kk, 8); g.fill();
      }
      const cv0 = Math.max(0, 1 - t / 260);
      if (cv0 > 0) {
        const cg = g.createRadialGradient(lx, ly, 0, lx, ly, 64);
        cg.addColorStop(0, 'rgba(255,255,255,' + (0.9 * cv0) + ')'); cg.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalAlpha = 1; g.fillStyle = cg; g.fillRect(0, 0, W, H);
      }
    };
    host._fxDraw = draw;   // seam: T3 draws a chosen moment and reads pixels (getImageData) instead of timing frames
    const t0 = performance.now();
    const tick = function () {
      if (!host.parentNode || host._fxSeeking) return;
      const t = performance.now() - t0; draw(t);
      if (t < FX_PRESS_MS) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    fxTeardown(host, FX_PRESS_MS + 200);
    return host;
  }
  /* ⚠️ For C, T3's geometry must become pixels: set host._fxSeeking = true, call host._fxDraw(t) for t in 60..480 step
     30, and count grid points whose canvas alpha (getImageData at the point x dpr) is > 40; best moment >= 90%. The
     canvas is not animated by WAAPI, so getAnimations() is empty for it — do not seek it that way. */
