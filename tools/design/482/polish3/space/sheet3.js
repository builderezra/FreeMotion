/* #482 polish batch 3 (sound: Echo / Delay and Reverb) — what each new control DOES, drawn for his phone (his rule #545:
   he sees every change; a sound cannot be shown, so the picture shows what the control does to it). Runs INSIDE the app
   (tools/design/482/polish3/space/render3.py injects it and calls window.__482c(id) once per picture). Every curve is
   measured from the app's own audio chain — FM.buildAudioFxChain in an OfflineAudioContext, the builder the export and the
   preview both use — with only the named controls set. Nothing is sketched. */
return (async function () {
  var SR = 48000;
  var BG = '#0f1117', INK = '#e9ecf3', SUB = '#a8afbf', MUTED = '#8b93a5', GRID = '#262c3a', NEW = '#4fd1a5';
  var TODAY = '#9aa1b0', C1 = '#3987e5', C2 = '#d95926', C3 = '#199e70';   // today in grey; the dataviz dark slots 1-3

  function render(fx, sig, secs) {
    var n = Math.round(SR * secs), oac = new OfflineAudioContext(2, n, SR), b = oac.createBuffer(1, n, SR), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = sig(i / SR, i);
    var src = oac.createBufferSource(); src.buffer = b;
    var chain = FM.buildAudioFxChain(oac, { audioFx: fx }, 0);
    chain.schedule(0, secs);
    src.connect(chain.input); chain.output.connect(oac.destination); src.start(0);
    return oac.startRendering().then(function (r) { chain.dispose(); return [r.getChannelData(0), r.getChannelData(1)]; });
  }
  var NOISE = (function () { var a = 0x2468ace, out = new Float32Array(SR * 4); for (var i = 0; i < out.length; i++) { a = (a + 0x6d2b79f5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; out[i] = 0.5 * ((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1); } return out; })();
  var noise = function (t, i) { return NOISE[i] || 0; };
  var click = function (t, i) { return i === 0 ? 1 : 0; };
  function fft(re, im) {
    var n = re.length, i, j, bit, len, k;
    for (i = 1, j = 0; i < n; i++) { bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (len = 2; len <= n; len <<= 1) {
      var ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (i = 0; i < n; i += len) { var cr = 1, ci = 0; for (k = 0; k < len / 2; k++) { var q = i + k + len / 2, br = re[q] * cr - im[q] * ci, bi = re[q] * ci + im[q] * cr; re[q] = re[i + k] - br; im[q] = im[i + k] - bi; re[i + k] += br; im[i + k] += bi; var tt = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = tt; } }
    }
  }
  /* A smoothed spectrum: [Hz, dB] at a sixth of an octave from 40 Hz to 20 kHz, of d[from … from+N). */
  function spectrum(d, from, N) {
    var re = new Float64Array(N), im = new Float64Array(N);
    for (var i = 0; i < N; i++) re[i] = d[from + i] || 0;
    fft(re, im);
    var pw = new Float64Array(N / 2 + 1); for (var k = 0; k <= N / 2; k++) pw[k] = re[k] * re[k] + im[k] * im[k];
    var out = [];
    for (var f = 40; f <= 20000; f *= Math.pow(2, 1 / 6)) {
      var lo = Math.floor(f / Math.pow(2, 1 / 12) * N / SR), hi = Math.ceil(f * Math.pow(2, 1 / 12) * N / SR), s = 0, c = 0;
      for (k = Math.max(1, lo); k <= Math.min(N / 2, hi); k++) { s += pw[k]; c++; }
      if (!c) { s = pw[Math.max(1, Math.round(f * N / SR))]; c = 1; }
      out.push([f, 10 * Math.log10(Math.max(1e-30, s / c))]);
    }
    return out;
  }
  /* The same, for a steady sound: Hann-windowed and averaged over `count` half-overlapping windows (Welch), so the curve
     is the room's colour and not the noise's own jitter. */
  function spectrumAvg(d, from, N, count) {
    var acc = null, win = new Float32Array(N);
    for (var i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    for (var w = 0; w < count; w++) {
      var seg = new Float32Array(N), o = from + w * N / 2;
      for (i = 0; i < N; i++) seg[i] = (d[o + i] || 0) * win[i];
      var sp = spectrum(seg, 0, N);
      if (!acc) acc = sp.map(function (p) { return [p[0], 0]; });
      sp.forEach(function (p, k) { acc[k][1] += Math.pow(10, p[1] / 10) / count; });
    }
    return acc.map(function (p) { return [p[0], 10 * Math.log10(p[1])]; });
  }

  /* ---- drawing ---- */
  var W = 370;
  function canvas(h) { var c = document.createElement('canvas'); c.width = W * 2; c.height = h * 2; c.style.cssText = 'width:' + W + 'px;height:' + h + 'px;display:block'; var g = c.getContext('2d'); g.scale(2, 2); return [c, g]; }
  /* A line chart. o: { h, x:[lo,hi], y:[lo,hi], logx, xticks:[[v,label]], yticks:[[v,label]], ylab, xlab, lines:[{pts, color, w, dash, label, fill}] } */
  function chart(o) {
    var cg = canvas(o.h), c = cg[0], g = cg[1];
    var L = o.left || 40, R = 8, T = 8, B = 30, pw = W - L - R, ph = o.h - T - B;
    var X = function (v) { var a = o.logx ? Math.log(v) : v, lo = o.logx ? Math.log(o.x[0]) : o.x[0], hi = o.logx ? Math.log(o.x[1]) : o.x[1]; return L + (a - lo) / (hi - lo) * pw; };
    var Y = function (v) { return T + (1 - (v - o.y[0]) / (o.y[1] - o.y[0])) * ph; };
    g.font = '10.5px -apple-system, system-ui, sans-serif'; g.textBaseline = 'middle';
    g.strokeStyle = GRID; g.lineWidth = 1; g.fillStyle = MUTED;
    (o.yticks || []).forEach(function (t) { var y = Math.round(Y(t[0])) + 0.5; g.beginPath(); g.moveTo(L, y); g.lineTo(L + pw, y); g.stroke(); g.textAlign = 'right'; g.fillText(t[1], L - 5, y); });
    g.textBaseline = 'top';
    (o.xticks || []).forEach(function (t) { var x = Math.round(X(t[0])) + 0.5; g.beginPath(); g.moveTo(x, T); g.lineTo(x, T + ph); g.stroke(); g.textAlign = 'center'; g.fillText(t[1], x, T + ph + 5); });
    if (o.xlab) { g.textAlign = 'center'; g.fillStyle = SUB; g.fillText(o.xlab, L + pw / 2, T + ph + 17); }
    if (o.ylab) { g.save(); g.translate(10, T + ph / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = SUB; g.fillText(o.ylab, 0, 0); g.restore(); }
    g.save(); g.beginPath(); g.rect(L, T - 1, pw, ph + 2); g.clip();
    (o.lines || []).forEach(function (ln) {
      var pts = ln.pts.filter(function (p) { return isFinite(p[1]); });
      if (!pts.length) return;
      g.beginPath();
      pts.forEach(function (p, i) { var x = X(p[0]), y = Y(Math.max(o.y[0] - 5, Math.min(o.y[1] + 5, p[1]))); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      if (ln.fill) { var last = pts[pts.length - 1], first = pts[0]; g.lineTo(X(last[0]), Y(o.y[0])); g.lineTo(X(first[0]), Y(o.y[0])); g.closePath(); g.fillStyle = ln.fill; g.fill(); }
      else { g.strokeStyle = ln.color; g.lineWidth = ln.w || 2; g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash(ln.dash || []); g.stroke(); g.setLineDash([]); }
    });
    (o.marks || []).forEach(function (m) { m(g, X, Y, L, T, pw, ph); });
    g.restore();
    return c;
  }
  function legend(items) {
    var d = document.createElement('div'); d.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11.5px;color:' + INK + ';margin:2px 0 4px 40px';
    items.forEach(function (it) { var s = document.createElement('span'); s.style.cssText = 'display:inline-flex;align-items:center;gap:5px'; s.innerHTML = '<i style="display:inline-block;width:14px;height:3px;border-radius:2px;background:' + it[1] + '"></i>'; s.appendChild(document.createTextNode(it[0])); d.appendChild(s); });
    return d;
  }
  function label(text, isNew) { var d = document.createElement('div'); d.style.cssText = 'font-weight:650;font-size:12.5px;margin:10px 0 3px;color:' + (isNew ? NEW : INK); d.textContent = text; return d; }
  var FREQ = { logx: true, x: [40, 20000], xticks: [[100, '100'], [1000, '1k'], [10000, '10k Hz']], xlab: '← deep          pitch          high →', ylab: 'louder ↑' };

  /* ---- the pictures ---- */
  async function echoRepeats(p) {
    var r = await render([{ type: 'delay', enabled: true, params: Object.assign({ time: 0.35, feedback: 0.6, mix: 1 }, p) }], click, 1.3);
    return [1, 2, 3].map(function (k) { return spectrum(r[0], Math.round(0.35 * k * SR) - 64, 8192); });
  }
  function repeatsChart(sp) {
    return chart(Object.assign({ h: 175, y: [-42, 6], yticks: [[-30, ''], [-15, ''], [0, '']], lines: sp.map(function (s, i) { return { pts: s, color: [C1, C2, C3][i] }; }) }, FREQ));
  }
  /* Today last and dashed, so it shows on top wherever a new setting leaves the room as it was. */
  function roomChart(data, sets) {
    var top = -Infinity; data.forEach(function (d) { d.forEach(function (p) { top = Math.max(top, p[1]); }); });
    top = Math.ceil(top / 5) * 5 + 5;
    var lines = data.map(function (d, i) { return { pts: d, color: sets[i][1], w: i ? 2 : 2.5, dash: i ? null : [5, 4] }; });
    lines.push(lines.shift());
    return chart(Object.assign({ h: 230, y: [top - 50, top], yticks: [[top - 40, ''], [top - 25, ''], [top - 10, '']], lines: lines }, FREQ));
  }
  var SPECS = {
    'echo-tone': {
      title: 'Echo / Delay — Tone (new)',
      sub: 'Turn Tone down and every echo comes back darker than the one before it, like an old tape echo. Today every echo is a perfect copy, so long echoes pile up into a bright, tinny smear.',
      foot: 'Measured from the app’s own Echo: one click, Time 0.35 s, Feedback 0.6. Each line is one echo’s sound, from deep (left) to high (right). Tone 20000 Hz is today’s echo exactly.',
      build: async function (ov) {
        ov.appendChild(legend([['1st echo', C1], ['2nd echo', C2], ['3rd echo', C3]]));
        ov.appendChild(label('Today — each echo is the same shape, only quieter'));
        ov.appendChild(repeatsChart(await echoRepeats({})));
        ov.appendChild(label('New: Tone 2000 Hz — each echo loses more of its top end', true));
        ov.appendChild(repeatsChart(await echoRepeats({ tone: 2000 })));
      },
    },
    'echo-lowcut': {
      title: 'Echo / Delay — Low cut (new)',
      sub: 'Turn Low cut up and every echo loses more of its boom than the one before, so a long echo on a voice or a bass-heavy song stays clean instead of turning to mud.',
      foot: 'Measured from the app’s own Echo: one click, Time 0.35 s, Feedback 0.6. Each line is one echo’s sound, from deep (left) to high (right). Low cut 20 Hz is today’s echo exactly.',
      build: async function (ov) {
        ov.appendChild(legend([['1st echo', C1], ['2nd echo', C2], ['3rd echo', C3]]));
        ov.appendChild(label('Today — each echo is the same shape, only quieter'));
        ov.appendChild(repeatsChart(await echoRepeats({})));
        ov.appendChild(label('New: Low cut 500 Hz — each echo loses more of its bottom end', true));
        ov.appendChild(repeatsChart(await echoRepeats({ lowcut: 500 })));
      },
    },
    'echo-tapewobble': {
      title: 'Echo / Delay — Tape wobble (new)',
      sub: 'Tape wobble slowly swings the echo time by up to 2 thousandths of a second, so the pitch of the echo drifts up and down a little — the warble of a worn tape machine. It follows the timeline, so the export wobbles exactly where the preview did.',
      foot: 'Measured from the app’s own Echo (Time 0.35 s, Feedback 0): a click every 0.05 s, and where each echo actually lands. The pitch is what that timing does to a steady 1000 Hz note. Tape wobble 0 is today’s echo exactly.',
      build: async function (ov) {
        var clicksAt = []; for (var c = 0; c <= 3.0001; c += 0.05) clicksAt.push(Math.round(c * SR));
        var sig = function (t, i) { return clicksAt.indexOf(i) >= 0 ? 1 : 0; };
        var shifts = async function (w) {
          var r = (await render([{ type: 'delay', enabled: true, params: { time: 0.35, feedback: 0, mix: 1, wobble: w } }], sig, 3.5))[0];
          return clicksAt.map(function (ci) { var want = ci + 0.35 * SR, s = 0, m = 0; for (var i = Math.floor(want - 240); i <= Math.ceil(want + 240); i++) { var v = r[i] || 0; s += v; m += v * i; } return [want / SR, (m / s - want) / SR * 1000]; });
        };
        var sets = [[0, TODAY, 'Today (0)'], [0.5, C2, 'Tape wobble 0.5'], [1, C1, 'Tape wobble 1']];
        var data = [];
        for (var k = 0; k < sets.length; k++) data.push(await shifts(sets[k][0]));
        ov.appendChild(legend(sets.map(function (s) { return [s[2], s[1]]; })));
        ov.appendChild(label('When each echo lands, against 0.35 s after its sound'));
        ov.appendChild(chart({ h: 160, x: [0.35, 3.35], y: [-2.6, 2.6], left: 70, xticks: [[1, '1 s'], [2, '2 s'], [3, '3 s']], yticks: [[-2, '2 ms early'], [0, 'on time'], [2, '2 ms late']], xlab: 'time on the timeline',
          lines: data.map(function (d, i) { return { pts: d, color: sets[i][1], w: i ? 2 : 2.5 }; }) }));
        ov.appendChild(label('So the pitch of a held 1000 Hz note in the echo drifts', true));
        var pitch = data.map(function (d) { var out = []; for (var i = 1; i < d.length - 1; i++) { var dt = d[i + 1][0] - d[i - 1][0], dtau = (d[i + 1][1] - d[i - 1][1]) / 1000; out.push([d[i][0], 1000 * (1 - dtau / dt)]); } return out; });
        ov.appendChild(chart({ h: 160, x: [0.35, 3.35], y: [988, 1012], left: 70, xticks: [[1, '1 s'], [2, '2 s'], [3, '3 s']], yticks: [[990, '990 Hz'], [1000, '1000 Hz'], [1010, '1010 Hz']], xlab: 'time on the timeline',
          lines: pitch.map(function (d, i) { return { pts: d, color: sets[i][1], w: i ? 2 : 2.5 }; }) }));
      },
    },
    'reverb-predelay': {
      title: 'Reverb — Pre-delay (new)',
      sub: 'Pre-delay holds the room back after the sound. The voice stays clear up front and the room answers a moment later — the way a big hall does. Today the room starts at the very same instant as the sound.',
      foot: 'Measured from the app’s own Reverb: one click, Size 0.5, Decay 1 s, the room alone (Mix 100 %). The white tick is your sound; the filled shape is the room. Pre-delay 0 is today’s reverb exactly.',
      build: async function (ov) {
        var env = async function (pd) {
          var r = (await render([{ type: 'reverb', enabled: true, params: { size: 0.5, decay: 1, mix: 1, predelay: pd } }], click, 0.8))[0];
          var out = [], bin = Math.round(0.004 * SR);
          for (var i = 0; i + bin <= r.length; i += bin) { var s = 0; for (var j = 0; j < bin; j++) s += r[i + j] * r[i + j]; out.push([(i + bin / 2) / SR * 1000, Math.sqrt(s / bin)]); }
          out.unshift([0, out[0][1]]);
          return out;
        };
        var peak = 0, sets = [[0, 'Today — the room starts with the sound', false], [0.1, 'New: Pre-delay 0.10 s — 100 ms of quiet, then the room', true], [0.25, 'New: Pre-delay 0.25 s (the most) — 250 ms of quiet', true]], data = [];
        for (var k = 0; k < sets.length; k++) { var e = await env(sets[k][0]); e.forEach(function (p) { peak = Math.max(peak, p[1]); }); data.push(e); }
        data.forEach(function (d, i) {
          ov.appendChild(label(sets[i][1], sets[i][2]));
          var pd = sets[i][0] * 1000;
          ov.appendChild(chart({ h: 120, x: [-20, 750], y: [0, peak * 1.08], xticks: [[0, '0'], [250, '250 ms'], [500, '500 ms'], [750, '']], yticks: [], xlab: i === data.length - 1 ? 'time after your sound' : '', ylab: 'room ↑',
            lines: [{ pts: d.map(function (p) { return [p[0] + 0, p[1]]; }), fill: i ? 'rgba(79,209,165,.55)' : 'rgba(154,161,176,.55)' }],
            marks: [function (g, X, Y, L, T, pw, ph) {
              g.fillStyle = '#ffffff'; g.fillRect(X(0) - 1.5, T, 3, ph);
              if (pd > 0) { g.strokeStyle = NEW; g.lineWidth = 1.5; var y = T + ph - 8, x0 = X(0) + 4, x1 = X(pd) - 3; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.moveTo(x0 + 5, y - 4); g.lineTo(x0, y); g.lineTo(x0 + 5, y + 4); g.moveTo(x1 - 5, y - 4); g.lineTo(x1, y); g.lineTo(x1 - 5, y + 4); g.stroke(); }
            }] }));
        });
      },
    },
    'reverb-tone': {
      title: 'Reverb — Tone (new)',
      sub: 'Tone takes the hiss and sizzle off the reverb only — your sound itself is not touched. Lower it for a darker, softer room that sits behind a voice instead of spraying over it.',
      foot: 'Measured from the app’s own Reverb on steady noise: Size 0.5, Decay 1 s, the room alone (Mix 100 %), from deep (left) to high (right). Tone 20000 Hz is today’s reverb exactly.',
      build: async function (ov) {
        var sets = [[20000, TODAY, 'Today'], [6000, C2, 'Tone 6000 Hz'], [2000, C1, 'Tone 2000 Hz']], data = [];
        for (var k = 0; k < sets.length; k++) data.push(spectrumAvg((await render([{ type: 'reverb', enabled: true, params: { size: 0.5, decay: 1, mix: 1, highcut: sets[k][0] } }], noise, 2))[0], 38400, 8192, 8));
        ov.appendChild(legend(sets.map(function (s) { return [s[2], s[1]]; })));
        ov.appendChild(label('The sound of the reverb — lower Tone, less top end', true));
        ov.appendChild(roomChart(data, sets));
      },
    },
    'reverb-lowcut': {
      title: 'Reverb — Low cut (new)',
      sub: 'Low cut takes the boom out of the reverb only — your sound itself keeps all its bass. Turn it up when the room makes a voice or a beat sound muddy.',
      foot: 'Measured from the app’s own Reverb on steady noise: Size 0.5, Decay 1 s, the room alone (Mix 100 %), from deep (left) to high (right). Low cut 20 Hz is today’s reverb exactly.',
      build: async function (ov) {
        var sets = [[20, TODAY, 'Today'], [150, C2, 'Low cut 150 Hz'], [500, C1, 'Low cut 500 Hz']], data = [];
        for (var k = 0; k < sets.length; k++) data.push(spectrumAvg((await render([{ type: 'reverb', enabled: true, params: { size: 0.5, decay: 1, mix: 1, lowcut: sets[k][0] } }], noise, 2))[0], 38400, 8192, 8));
        ov.appendChild(legend(sets.map(function (s) { return [s[2], s[1]]; })));
        ov.appendChild(label('The sound of the reverb — higher Low cut, less boom', true));
        ov.appendChild(roomChart(data, sets));
      },
    },
    'reverb-width': {
      title: 'Reverb — Width (new)',
      sub: 'Width folds the reverb from full stereo (today) toward the middle. At 0 both ears hear the same reverb — handy when a wide room swamps a voice, or for a clip that will play on one phone speaker.',
      foot: 'Measured from the app’s own Reverb on noise (Size 0.5, Decay 1 s, the room alone). Each dot is one moment of the reverb, placed by how much more of it is in the left ear or the right. Width only changes the reverb, never your sound. Width 1 is today’s reverb exactly.',
      build: async function (ov) {
        var sets = [[1, 'Today', 'wide'], [0.5, 'Width 0.5', 'narrower'], [0, 'Width 0', 'in the middle']];
        ov.appendChild(label('Where the reverb sits between your ears'));
        var S = 112, gap = (W - 3 * S) / 2, cg = canvas(S + 48), c = cg[0], g = cg[1], a = Math.round(0.8 * SR), n = 6000, scale = 0;
        var runs = [];
        for (var k = 0; k < sets.length; k++) runs.push(await render([{ type: 'reverb', enabled: true, params: { size: 0.5, decay: 1, mix: 1, width: sets[k][0] } }], noise, 1.0));
        for (var i = 0; i < n; i++) scale = Math.max(scale, Math.abs(runs[0][0][a + i] + runs[0][1][a + i]), Math.abs(runs[0][0][a + i] - runs[0][1][a + i]));
        runs.forEach(function (r, k) {
          var x0 = k * (S + gap), cx = x0 + S / 2, cy = S / 2;
          g.fillStyle = '#161b26'; g.beginPath(); g.roundRect(x0, 0, S, S, 8); g.fill();
          g.strokeStyle = GRID; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + 0.5, 6); g.lineTo(cx + 0.5, S - 6); g.moveTo(x0 + 6, cy + 0.5); g.lineTo(x0 + S - 6, cy + 0.5); g.stroke();
          g.fillStyle = k ? 'rgba(79,209,165,.35)' : 'rgba(154,161,176,.35)';
          for (var i = 0; i < n; i++) {
            var L = r[0][a + i], R = r[1][a + i];
            var x = cx + (R - L) / scale * (S / 2 - 6), y = cy - (L + R) / scale * (S / 2 - 6);
            g.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
          }
          g.font = '10px -apple-system, system-ui, sans-serif'; g.fillStyle = MUTED; g.textBaseline = 'top';
          g.textAlign = 'left'; g.fillText('L', x0 + 5, cy + 3); g.textAlign = 'right'; g.fillText('R', x0 + S - 5, cy + 3);
          g.textAlign = 'center'; g.font = '650 12px -apple-system, system-ui, sans-serif'; g.fillStyle = k ? NEW : INK; g.fillText(sets[k][1], cx, S + 8);
          g.font = '11px -apple-system, system-ui, sans-serif'; g.fillStyle = SUB; g.fillText(sets[k][2], cx, S + 25);
        });
        ov.appendChild(c);
      },
    },
  };
  window.__482c = async function (id) {
    var sp = SPECS[id]; if (!sp) throw new Error('no picture ' + id);
    var old = document.getElementById('ov482c'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'ov482c';
    ov.style.cssText = 'position:fixed;left:0;top:0;width:390px;z-index:2147483647;background:' + BG + ';color:' + INK + ';font:14px -apple-system,system-ui,sans-serif;padding:14px 10px;box-sizing:border-box;min-height:100vh';
    var h = document.createElement('div'); h.style.cssText = 'font-weight:700;font-size:18px;letter-spacing:-.2px'; h.textContent = sp.title; ov.appendChild(h);
    var s = document.createElement('div'); s.style.cssText = 'color:' + SUB + ';font-size:12px;line-height:1.35;margin:4px 0 8px'; s.textContent = sp.sub; ov.appendChild(s);
    document.body.appendChild(ov);
    await sp.build(ov);
    var foot = document.createElement('div'); foot.style.cssText = 'color:' + MUTED + ';font-size:10.5px;margin-top:10px;line-height:1.35'; foot.textContent = sp.foot; ov.appendChild(foot);
    return { contentBottom: Math.ceil(foot.getBoundingClientRect().bottom + 12) };
  };
  return Object.keys(SPECS);
})();
