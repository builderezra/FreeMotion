/* #482 batch 3 review fix — what nudging Low cut off 20 Hz WHILE IT PLAYS does to the sound, before the fix and now.
   Runs INSIDE the app (tools/design/482/polish3/space/move3.py injects it, with window.__482cOld = the build before the fix,
   and calls window.__482cMove()). Every curve is measured from the app's own chain — FM.buildAudioFxChain in an
   OfflineAudioContext, driven exactly as the preview drives it (applyAt once every 16 ms, the move landing on one of those
   frames) — against the same render left alone. Nothing is sketched. */
return (async function () {
  var SR = 48000;
  var BG = '#0f1117', INK = '#e9ecf3', SUB = '#a8afbf', MUTED = '#8b93a5', GRID = '#262c3a', NEW = '#4fd1a5', OLD = '#d95926';

  /* The change the move makes to the sound: moved − still, from 10 ms before the move to 40 ms after it, in ms. */
  async function moveDiff(M, type, t0) {
    var n = Math.round(SR * (t0 + 0.1)), step = 6 * 128 / SR, tq = Math.round(t0 / step) * step;
    async function render(move) {
      var oac = new OfflineAudioContext(2, n, SR), b = oac.createBuffer(1, n, SR), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) { var t = i / SR; d[i] = 0.4 * Math.sin(2 * Math.PI * 80 * t) + 0.2 * Math.sin(2 * Math.PI * 1200 * t); }
      var src = oac.createBufferSource(); src.buffer = b;
      var layer = { audioFx: [{ type: type, enabled: true, params: M.audioFxRegistry.makeInstance(type).params }] };
      var chain = M.buildAudioFxChain(oac, layer, 0);
      chain.applyAt(0);
      for (var f = step; f < n / SR - 0.01; f += step) (function (f) {
        var hit = Math.abs(f - tq) < 1e-9;
        oac.suspend(f).then(function () { if (move && hit) layer.audioFx[0].params.lowcut = 25; chain.applyAt(oac.currentTime); oac.resume(); });
      })(f);
      src.connect(chain.input); chain.output.connect(oac.destination); src.start(0);
      var r = await oac.startRendering(); chain.dispose();
      return r.getChannelData(0);
    }
    var a = await render(false), b = await render(true), out = [], jump = 0;
    for (var i = Math.round((tq - 0.01) * SR); i < Math.round((tq + 0.04) * SR); i++) {
      out.push([(i / SR - tq) * 1000, b[i] - a[i]]);
      if (i > 0) jump = Math.max(jump, Math.abs((b[i] - a[i]) - (b[i - 1] - a[i - 1])));
    }
    return { pts: out, jump: jump };
  }

  var W = 370;
  function canvas(h) { var c = document.createElement('canvas'); c.width = W * 2; c.height = h * 2; c.style.cssText = 'width:' + W + 'px;height:' + h + 'px;display:block'; var g = c.getContext('2d'); g.scale(2, 2); return [c, g]; }
  function chart(pts, color, ylim, xlab, band) {
    var h = 128, cg = canvas(h), c = cg[0], g = cg[1];
    var L = 54, R = 8, T = 8, B = xlab ? 30 : 18, pw = W - L - R, ph = h - T - B;
    var X = function (v) { return L + (v + 10) / 50 * pw; }, Y = function (v) { return T + (1 - (v + ylim) / (2 * ylim)) * ph; };
    g.font = '10.5px -apple-system, system-ui, sans-serif';
    g.strokeStyle = GRID; g.lineWidth = 1; g.fillStyle = MUTED; g.textBaseline = 'top'; g.textAlign = 'center';
    [[-10, '−10'], [0, 'you move it'], [20, '+20'], [40, '+40 ms']].forEach(function (t) { var x = Math.round(X(t[0])) + 0.5; g.beginPath(); g.moveTo(x, T); g.lineTo(x, T + ph); g.stroke(); g.fillText(t[1], Math.min(W - 26, Math.max(L + 14, x)), T + ph + 4); });
    var y0 = Math.round(Y(0)) + 0.5; g.beginPath(); g.moveTo(L, y0); g.lineTo(L + pw, y0); g.stroke();
    g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('none', L - 5, y0);
    if (xlab) { g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = SUB; g.fillText(xlab, L + pw / 2, T + ph + 17); }
    g.save(); g.translate(9, T + ph / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = SUB; g.fillText('change ↕', 0, 0); g.restore();
    g.save(); g.beginPath(); g.rect(L, T, pw, ph); g.clip();
    if (band) { g.fillStyle = 'rgba(79,209,165,.10)'; g.fillRect(X(0), T, X(20) - X(0), ph); }
    g.beginPath(); pts.forEach(function (p, i) { var x = X(p[0]), y = Y(p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.strokeStyle = color; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
    g.restore();
    return c;
  }
  function label(text, color) { var d = document.createElement('div'); d.style.cssText = 'font-weight:650;font-size:12.5px;margin:10px 0 3px;color:' + color; d.textContent = text; return d; }

  window.__482cMove = async function () {
    var old = document.getElementById('ov482c'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'ov482c';
    ov.style.cssText = 'position:fixed;left:0;top:0;width:390px;z-index:2147483647;background:' + BG + ';color:' + INK + ';font:14px -apple-system,system-ui,sans-serif;padding:14px 10px;box-sizing:border-box;min-height:100vh';
    var h = document.createElement('div'); h.style.cssText = 'font-weight:700;font-size:18px;letter-spacing:-.2px'; h.textContent = 'Low cut — nudging it while it plays (fix)'; ov.appendChild(h);
    var s = document.createElement('div'); s.style.cssText = 'color:' + SUB + ';font-size:12px;line-height:1.35;margin:4px 0 8px';
    s.textContent = 'Moving Low cut off 20 Hz (or back to 20) while the clip plays used to switch the filter in all at once. That jump in the sound is a click. Now the filter fades in over 20 thousandths of a second (the green band), like the export already did. Echo and Reverb both; Tone and Tape wobble the same.';
    ov.appendChild(s);
    document.body.appendChild(ov);
    var rows = [['delay', 'Echo', 0.12], ['reverb', 'Reverb', 0.03]];
    for (var k = 0; k < rows.length; k++) {
      /* The moment: of the frames from 0.40 to 0.60 s, the one where the build before the fix jumps most - its worst case,
         which the foot says. The fixed build is moved on that very frame. */
      var r = rows[k], before = null, at = 0;
      for (var t0 = 0.4; t0 <= 0.6; t0 += 0.016) { var m = await moveDiff(window.__482cOld, r[0], t0); if (!before || m.jump > before.jump) { before = m; at = t0; } }
      var now = await moveDiff(FM, r[0], at);
      ov.appendChild(label(r[1] + ', before — the sound jumps the instant you move it (a click)', OLD));
      ov.appendChild(chart(before.pts, OLD, r[2], '', false));
      ov.appendChild(label(r[1] + ', now — the same change, faded in (no click)', NEW));
      ov.appendChild(chart(now.pts, NEW, r[2], k === rows.length - 1 ? 'time around the moment you move the slider' : '', true));
      ov.appendChild(Object.assign(document.createElement('div'), { textContent: 'Biggest jump from one sample to the next: ' + before.jump.toFixed(4) + ' before, ' + now.jump.toFixed(4) + ' now.', style: 'color:' + MUTED + ';font-size:11px;margin:2px 0 0 54px' }));
    }
    var foot = document.createElement('div'); foot.style.cssText = 'color:' + MUTED + ';font-size:10.5px;margin-top:10px;line-height:1.35';
    foot.textContent = 'Measured from the app’s own Echo and Reverb (their default settings) on a bass note (80 Hz) with a 1200 Hz tone, driven the way the preview drives them — every 16 ms — with Low cut moved from 20 to 25 Hz on one frame (the frame, of a dozen tried, where the old build clicked hardest). Each line is how much the sound differs from the same clip left alone. The export and the settled sound are unchanged.';
    ov.appendChild(foot);
    return { contentBottom: Math.ceil(foot.getBoundingClientRect().bottom + 12) };
  };
  return ['echo-reverb-lowcut-move'];
})();
