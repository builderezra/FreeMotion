/* FreeMotion — Eyedropper / colour sampler.
 * Native EyeDropper() isn't in Safari (Ezra's on iPhone), so this samples the PREVIEW CANVAS itself:
 * tap the rendered frame and it reads the pixel under your finger, with an iOS-style loupe that
 * magnifies the pixels + shows the hex live. FM.eyedropper.pick(cb) → cb(hex) with the chosen colour.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let overlay = null, loupe = null, lctx = null, bar = null, cb = null, at = null, raf = 0;
  const R = 14;          // half-size of the sampled source square (px in canvas space) → zoom window
  const preview = () => document.getElementById('preview');

  function hex2(n) { n = Math.max(0, Math.min(255, n | 0)); return (n < 16 ? '0' : '') + n.toString(16); }
  function canvasPos(e) {
    const cv = preview(), r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height), cx: e.clientX, cy: e.clientY };
  }
  function sampleAt(px, py) {
    const cv = preview();
    try {
      const d = cv.getContext('2d').getImageData(Math.max(0, Math.min(cv.width - 1, px | 0)), Math.max(0, Math.min(cv.height - 1, py | 0)), 1, 1).data;
      return '#' + hex2(d[0]) + hex2(d[1]) + hex2(d[2]);
    } catch (e) { return null; }   // tainted canvas (cross-origin frame) → can't read
  }

  function drawLoupe() {
    if (!at || !lctx) return;
    const cv = preview(), size = loupe.width;
    lctx.imageSmoothingEnabled = false;
    lctx.clearRect(0, 0, size, size);
    lctx.save();
    lctx.beginPath(); lctx.arc(size / 2, size / 2, size / 2 - 2, 0, 6.2832); lctx.clip();
    lctx.fillStyle = '#0c1016'; lctx.fillRect(0, 0, size, size);
    try { lctx.drawImage(cv, at.x - R, at.y - R, R * 2, R * 2, 0, 0, size, size); } catch (e) {}
    // centre pixel marker
    const cell = size / (R * 2);
    lctx.strokeStyle = 'rgba(255,255,255,.9)'; lctx.lineWidth = 1.5;
    lctx.strokeRect(size / 2 - cell / 2, size / 2 - cell / 2, cell, cell);
    lctx.restore();
    lctx.strokeStyle = '#29d9bb'; lctx.lineWidth = 3;
    lctx.beginPath(); lctx.arc(size / 2, size / 2, size / 2 - 2, 0, 6.2832); lctx.stroke();
    // position the loupe above-left of the finger, kept on-screen
    const hex = sampleAt(at.x, at.y) || '#000000';
    const lx = Math.max(8, Math.min(window.innerWidth - size - 8, at.cx - size / 2));
    const ly = Math.max(8, at.cy - size - 26);
    loupe.style.left = lx + 'px'; loupe.style.top = ly + 'px';
    if (bar) { bar.style.left = lx + 'px'; bar.style.top = (ly + size + 4) + 'px'; bar.querySelector('.ed-sw').style.background = hex; bar.querySelector('.ed-hex').textContent = hex.toUpperCase(); }
  }
  function tick() { if (!overlay) return; drawLoupe(); raf = requestAnimationFrame(tick); }

  function move(e) { at = canvasPos(e); e.preventDefault(); }
  function down(e) { at = canvasPos(e); e.preventDefault(); e.stopPropagation(); }
  function up(e) {
    if (!at) { stop(); return; }
    const hex = sampleAt(at.x, at.y);
    const fn = cb;
    stop();
    if (hex && fn) fn(hex); else if (!hex && FM.toast) FM.toast("Can't read this frame's colours");
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf), raf = 0;
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    if (overlay) overlay.remove(); overlay = null;
    if (loupe) loupe.remove(); loupe = null; lctx = null;
    if (bar) bar.remove(); bar = null;
    cb = null; at = null;
    document.body.classList.remove('sampling');
  }

  FM.eyedropper = {
    isActive() { return !!overlay; },
    stop() { stop(); },
    pick(callback) {
      if (overlay) stop();
      const cv = preview(); if (!cv) return;
      cb = callback;
      overlay = document.createElement('div'); overlay.id = 'ed-overlay';
      document.body.appendChild(overlay);
      loupe = document.createElement('canvas'); loupe.id = 'ed-loupe'; loupe.width = 108; loupe.height = 108;
      lctx = loupe.getContext('2d'); document.body.appendChild(loupe);
      bar = document.createElement('div'); bar.id = 'ed-bar';
      bar.innerHTML = '<span class="ed-sw"></span><span class="ed-hex">#—</span>';
      document.body.appendChild(bar);
      // seed the loupe at the canvas centre until the finger moves
      const r = cv.getBoundingClientRect();
      at = { x: cv.width / 2, y: cv.height / 2, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      overlay.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', up, true);
      document.body.classList.add('sampling');
      if (FM.toast) FM.toast('Tap the video to pick a colour', 2200);
      tick();
    },
  };
})(window.FM);
