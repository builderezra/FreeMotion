/* #482 polish batch 2 (rhythm) — before/after pictures for Ezra (#545: he sees every visual change before it ships).
   Runs INSIDE the app (tools/design/482/polish2/render.py injects it with SHEET set). Every tile is the app's own renderer:
   FM.renderScene on a real image layer carrying a real effect from FM.fxRegistry.makeInstance, only the named params set.
   The traces under the flash and stutter rows are MEASURED from those same renders (brightness, or where the card is), not
   drawn by hand. Left/top = today's default; below it = the new control doing something he would use. */
return (async function () {
  var SHEET = window.__sheet482b;
  // The moving sheets use a smaller frame so the car card reads at tile size; the flash sheets fill it with a photo.
  var PW = SHEET.indexOf('flashdark') === 0 ? 480 : 320, PH = PW * 9 / 16, BG = '#15171c';
  function photo(name) {
    return new Promise(function (ok, bad) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { bad(new Error('no photo ' + name)); }; i.src = 'fx-art/' + name + '.jpg?v=1'; });
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  var mediaIds = [];
  async function media(name, w, h) {
    var im = await photo(name), c = canvas(w, h), g = c.getContext('2d');
    var s = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / s, sh = h / s;
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
    var id = '_482b_' + name + '_' + w + 'x' + h;
    FM.media.set(id, { kind: 'image', el: c, width: w, height: h, duration: 0 }); if (FM.media.pin) FM.media.pin(id);
    mediaIds.push(id);
    return id;
  }
  function layer(mid, w, h, x, y, fx, xkf) {
    var l = FM.makeLayer('image', { x: x, y: y, start: 0, duration: 2 }); l.id = mid; l.start = 0; l.duration = 2;
    if (xkf) l.transform.x = { kf: xkf.map(function (k) { return { t: k[0], v: k[1], ease: 'linear' }; }) };
    l.effects = fx ? [fx] : [];
    return l;
  }
  function fx(type, params) { if (!type) return null; var e = FM.fxRegistry.makeInstance(type); Object.assign(e.params, params || {}); return e; }
  function scene(l) { return { project: { width: PW, height: PH, fps: 30, duration: 2, background: BG }, layers: [l], selectedId: null, selectedIds: [] }; }
  function render(l, t, w, h) { var c = canvas(w || PW, h || PH); FM.renderScene(c.getContext('2d', { willReadFrequently: true }), scene(l), t); return c; }
  function luma(c) { var d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data, s = 0; for (var i = 0; i < d.length; i += 4) s += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; return s / (d.length / 4); }
  /* A stateful effect (Frame Stutter) has to be PLAYED: every frame in order from a cleared hold, as an export plays it. */
  function play(l, frames, keep) {
    if (FM.resetMotionFlowCache) FM.resetMotionFlowCache();
    var out = {}, xs = [];
    for (var n = 0; n <= frames; n++) {
      var c = render(l, n / 30);
      if (keep.indexOf(n) >= 0) out[n] = c;
      var sw = PW / 2, sh = PH / 2, small = canvas(sw, sh); small.getContext('2d').drawImage(c, 0, 0, sw, sh);
      var d = small.getContext('2d', { willReadFrequently: true }).getImageData(0, sh >> 1, sw, 1).data, left = -1;
      for (var i = 0; i < sw; i++) { if (Math.abs(d[i * 4] - 0x15) + Math.abs(d[i * 4 + 1] - 0x17) + Math.abs(d[i * 4 + 2] - 0x1c) > 60) { left = i * 2; break; } }
      xs.push(left);
    }
    return { tiles: out, xs: xs };
  }

  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f1117;color:#e9ecf3;font:14px -apple-system,system-ui,sans-serif;padding:16px 14px;box-sizing:border-box;overflow:hidden';
  document.body.appendChild(ov);
  function h(tag, css, text) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; }
  function title(t, sub) {
    ov.appendChild(h('div', 'font-weight:700;font-size:18px;letter-spacing:-.2px', t));
    ov.appendChild(h('div', 'color:#a8afbf;font-size:12px;line-height:1.4;margin:5px 0 12px', sub));
  }
  function rowHead(name, sub, rec) {
    var r = h('div', 'margin:12px 0 6px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap');
    r.appendChild(h('div', 'font-weight:650;font-size:14px' + (rec ? ';color:#4fd1a5' : ''), name));
    if (sub) r.appendChild(h('div', 'color:#a8afbf;font-size:11.5px', sub));
    ov.appendChild(r);
  }
  function tiles(list, marks) {   // list: [{ c: canvas, cap: 'label' }]
    var g = h('div', 'display:grid;grid-template-columns:repeat(' + list.length + ',1fr);gap:6px');
    list.forEach(function (it, i) {
      var cell = h('div', ''), pic = h('div', 'position:relative');
      it.c.style.cssText = 'width:100%;display:block;border-radius:6px';
      pic.appendChild(it.c); cell.appendChild(pic);
      if (marks && marks[i] != null) {   // a thin line where the layer really is at this moment, over the picture only
        pic.appendChild(h('div', 'position:absolute;top:0;bottom:0;width:2px;background:#ff5a5f;left:calc(' + (marks[i] / PW * 100).toFixed(2) + '% - 1px);opacity:.9'));
      }
      cell.appendChild(h('div', 'color:#c9cfdb;font-size:10.5px;text-align:center;margin-top:3px;white-space:nowrap', it.cap));
      g.appendChild(cell);
    });
    ov.appendChild(g);
  }
  /* A trace: values over time as a line, with tick marks (beats or hold changes). Values 0..1, 1 = top. */
  function trace(vals, t1, ticks, label, color) {
    var W = 362, H = 38, svgNS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(svgNS, 'svg'); s.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + 12)); s.style.cssText = 'width:100%;display:block;margin-top:5px';
    var bg = document.createElementNS(svgNS, 'rect'); bg.setAttribute('x', 0); bg.setAttribute('y', 0); bg.setAttribute('width', W); bg.setAttribute('height', H); bg.setAttribute('rx', 5); bg.setAttribute('fill', '#1b1f29'); s.appendChild(bg);
    (ticks || []).forEach(function (tk) { var l = document.createElementNS(svgNS, 'line'); var x = tk / t1 * W; l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('y1', 0); l.setAttribute('y2', H); l.setAttribute('stroke', '#3a4152'); l.setAttribute('stroke-width', 1); s.appendChild(l); });
    var p = document.createElementNS(svgNS, 'polyline');
    p.setAttribute('points', vals.map(function (v, i) { return (i / (vals.length - 1) * W).toFixed(1) + ',' + (4 + (1 - v) * (H - 8)).toFixed(1); }).join(' '));
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', color || '#ffd166'); p.setAttribute('stroke-width', 1.6); p.setAttribute('stroke-linejoin', 'round'); s.appendChild(p);
    var tx = document.createElementNS(svgNS, 'text'); tx.setAttribute('x', 0); tx.setAttribute('y', H + 10); tx.setAttribute('fill', '#8a92a3'); tx.setAttribute('font-size', 9); tx.textContent = label; s.appendChild(tx);
    ov.appendChild(s);
  }

  try {
    if (SHEET === 'flashdark-rhythm' || SHEET === 'flashdark-holddark') {
      var mid = await media('city', PW, PH);
      var bright = function (params, t1) { var v = [], l = layer(mid, PW, PH, PW / 2, PH / 2, fx('flashdark', params)); for (var i = 0; i < t1 * 120; i++) { v.push(luma(render(l, i / 120, 96, 54))); } /* < t1: at exactly 2 s the clip has ended */ var hi = luma(render(layer(mid, PW, PH, PW / 2, PH / 2, null), 0, 96, 54)); return v.map(function (x) { return Math.max(0, Math.min(1, x / hi)); }); };
      var row = function (params, times, caps) { var l = layer(mid, PW, PH, PW / 2, PH / 2, fx('flashdark', params)); tiles(times.map(function (t, i) { return { c: render(l, t), cap: caps ? caps[i] : t.toFixed(2) + ' s' }; })); };
      var beats = []; for (var b = 0; b <= 8; b++) beats.push(b * 0.25);
      if (SHEET === 'flashdark-rhythm') {
        /* AT THE DEFAULT SPEED, FRAME BY FRAME (review of the first build): the first sheet used Speed 2–4, where every rhythm
           looks right, and hid what a 30 fps export does at the Speed he actually starts on — a Double hit that was Steady at 20
           and a Build-up that stalled. Every tile here is a real 30 fps frame and the trace is every frame's brightness. */
        var fr = function (params, t1) { var v = [], l = layer(mid, PW, PH, PW / 2, PH / 2, fx('flashdark', params)); for (var i = 0; i < t1 * 30; i++) v.push(luma(render(l, i / 30, 96, 54))); var hi = luma(render(layer(mid, PW, PH, PW / 2, PH / 2, null), 0, 96, 54)); return v.map(function (x) { return Math.max(0, Math.min(1, x / hi)); }); };
        var tenths = []; for (var tt = 0; tt <= 20; tt++) tenths.push(tt / 10);
        var fcap = function (ns, words) { return ns.map(function (n, i) { return (words ? words[i] + ' · ' : '') + 'frame ' + (n + 1); }); };
        title('Flash (darken) — new: Rhythm', 'At the default Speed 10, Depth 0.6, in a 30 fps project. Pictures are real frames of the export; the yellow line is every frame’s brightness over 2 s (grey ticks every 0.1 s).');
        rowHead('Today — Random', 'the only rhythm until now: hits land anywhere');
        row({ amount: 0.6 }, [0, 1, 2, 3].map(function (n) { return n / 30; }), fcap([0, 1, 2, 3]));
        trace(fr({ amount: 0.6 }, 2), 2, tenths, 'brightness of every frame, 0 → 2 s');
        rowHead('Steady', 'a full hit every 0.1 s, the first one on the clip’s start', true);
        row({ amount: 0.6, rhythm: 1 }, [0, 1, 2, 3].map(function (n) { return n / 30; }), fcap([0, 1, 2, 3], ['hit', 'going', 'gone', 'hit']));
        trace(fr({ amount: 0.6, rhythm: 1 }, 2), 2, tenths, 'brightness of every frame, 0 → 2 s');
        rowHead('Double hit', 'hit, gap, hit, then a rest — 5 pairs a second, the most 30 fps can show', true);
        row({ amount: 0.6, rhythm: 2 }, [0, 1, 2, 4].map(function (n) { return n / 30; }), fcap([0, 1, 2, 4], ['hit', 'gap', 'hit', 'rest']));
        trace(fr({ amount: 0.6, rhythm: 2 }, 2), 2, tenths, 'brightness of every frame, 0 → 2 s');
        rowHead('Build-up', 'starts at a quarter of the Speed and speeds up to it by the clip’s end, into the drop', true);
        /* Hit k of a 2 s clip at Speed 10 lands where 10·2/ln4·(4^(t/2 − 1) − 1/4) = k; the frame it lands on. */
        var bk = [0, 3, 7, 10], bn = bk.map(function (k) { return Math.ceil(30 * 2 * (1 + Math.log(0.25 + k * Math.log(4) / 20) / Math.log(4)) - 1e-6); });
        row({ amount: 0.6, rhythm: 3 }, bn.map(function (n) { return n / 30; }), bn.map(function (n, i) { return 'hit ' + (bk[i] + 1) + ' · ' + (n / 30).toFixed(2) + ' s'; }));
        trace(fr({ amount: 0.6, rhythm: 3 }, 2), 2, tenths, 'brightness of every frame, 0 → 2 s (a 2 s clip)');
      } else {
        title('Flash (darken) — new: Hold dark', 'Rhythm Steady, Speed 4, Depth 0.6. Frames across one beat (0 → 0.25 s); the yellow line is brightness over 1 second.');
        rowHead('Default — Hold dark 0', 'a quick flash: dark for about half the beat, then back');
        row({ speed: 4, amount: 0.6, rhythm: 1 }, [0, 0.07, 0.14, 0.2]);
        trace(bright({ speed: 4, amount: 0.6, rhythm: 1 }, 1), 1, beats.slice(0, 5), 'brightness, 0 → 1 s');
        rowHead('Hold dark 0.7', 'stays dark for most of the beat — a heavier, pumping hit', true);
        row({ speed: 4, amount: 0.6, rhythm: 1, hold: 0.7 }, [0, 0.07, 0.14, 0.2]);
        trace(bright({ speed: 4, amount: 0.6, rhythm: 1, hold: 0.7 }, 1), 1, beats.slice(0, 5), 'brightness, 0 → 1 s');
      }
    }
    if (SHEET.indexOf('framestutter') === 0) {
      var car = await media('huracan', 90, 60);
      var stut = function (params, move, frames, keep) { return play(layer(car, 90, 60, move[0][1], PH / 2, fx('framestutter', params), move), frames, keep); };
      var xtrace = function (xs) { return xs.map(function (x) { return x < 0 ? 0 : x / PW; }); };
      if (SHEET === 'framestutter-trailstrength') {
        title('Frame Stutter — new: Trail strength', 'Mode Hold + Trail, 2 holds a second. The echo is the held frame before this one — the car was there half a second ago. Frames at 0.5, 0.8 and 1.0 s.');
        var keep = [15, 24, 30], mv = [[0, 55], [1.2, 265]];
        [[{}, 'Today — echo fixed at 45%', 'the only strength it had', false], [{ trail: 0.9 }, 'Trail strength 0.9', 'a strong, solid echo', true], [{ trail: 0.2 }, 'Trail strength 0.2', 'a faint ghost', true]].forEach(function (r) {
          rowHead(r[1], r[2], r[3]);
          var run = stut(Object.assign({ rate: 2, mode: 2 }, r[0]), mv, 30, keep);
          tiles(keep.map(function (n) { return { c: run.tiles[n], cap: (n / 30).toFixed(1) + ' s' }; }));
        });
      } else {
        var isPhase = SHEET === 'framestutter-phase', mv2 = [[0, 50], [1, 270]];
        title(isPhase ? 'Frame Stutter — new: Phase' : 'Frame Stutter — new: Irregular holds',
          isPhase ? 'Mode Hold, 5 holds a second. Phase moves WHEN the picture steps — to land the steps on a beat or a cut. The yellow staircase is where the car is over 1 s (grey ticks every 0.1 s).'
                  : 'Mode Hold, 5 holds a second. Today every hold is the same length; Irregular holds makes them uneven, like hand-made stop-motion — the same every time it plays. The yellow staircase is where the car is over 1 s.');
        var kp = isPhase ? [3, 5, 7, 9] : [4, 12, 20, 28], ticks = []; for (var tk = 0; tk <= 10; tk++) ticks.push(tk / 10);
        var rows = isPhase ? [[{}, 'Today — Phase 0', 'steps at 0.2, 0.4, 0.6 s…', false], [{ offset: 0.5 }, 'Phase 0.5', 'every step half a hold earlier: 0.1, 0.3, 0.5 s…', true]]
                           : [[{}, 'Today — every hold the same', 'one step every 0.2 s', false], [{ random: 100 }, 'Irregular holds 100%', 'long and short holds mixed', true]];
        rows.forEach(function (r) {
          rowHead(r[1], r[2], r[3]);
          var run = stut(Object.assign({ rate: 5 }, r[0]), mv2, 30, kp);
          tiles(kp.map(function (n) { return { c: run.tiles[n], cap: (n / 30).toFixed(2) + ' s' }; }));
          trace(xtrace(run.xs), 1, ticks, 'where the car is, 0 → 1 s');
        });
      }
    }
    /* THE FIRST FRAMES OF A CLIP AT SHUTTER PHASE −100 (review of the first build). Rendered twice by render.py — against a
       server of the first build ('-before') and of the fix ('-after') — and stacked. Each caption is how much of the car is on
       screen, the frame's brightness against the same frame with no blur. */
    if (SHEET.indexOf('objectblur-edges') === 0) {
      var car3 = await media('mclaren', 160, 106), before = /-before$/.test(SHEET);
      var mv3 = [[0, 90], [1, 330]];   // moving from its very first frame, 240 px a second
      if (before) title('Motion Blur (Object) — Shutter phase −100 at the start of a clip', 'Shutter 6, a car that moves from its very first frame. Frames 1–4 of the clip; under each, how much of the car is on screen.');
      rowHead(before ? 'Before this fix' : 'After', before ? 'frame 1 pops in sharp, then the car nearly vanishes and fades back' : 'the car is whole from frame 1 and the streak grows behind it', !before);
      var e3 = fx('objectblur', { shutter: 6, samples: 48, phase: -100 });
      var inkOf = function (c) { var d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data, s = 0; for (var i = 0; i < d.length; i += 4) s += Math.abs(d[i] - 0x15) + Math.abs(d[i + 1] - 0x17) + Math.abs(d[i + 2] - 0x1c); return s; };
      tiles([0, 1, 2, 3].map(function (n) {
        var c = render(layer(car3, 160, 106, 90, PH / 2, e3, mv3), n / 30), ref = render(layer(car3, 160, 106, 90, PH / 2, null, mv3), n / 30);
        return { c: c, cap: 'frame ' + (n + 1) + ' · ' + Math.round(100 * inkOf(c) / inkOf(ref)) + '%' };
      }));
    }
    if (SHEET === 'objectblur-shutterphase') {
      var car2 = await media('mclaren', 100, 66);
      var mv = [[0, 50], [1, 290]];   // 240 px a second
      title('Motion Blur (Object) — new: Shutter phase', 'The car moves right, Shutter 6. The red line is where the car’s front really is at that moment. Today half the smear runs AHEAD of the car.');
      var at = [0.3, 0.5, 0.7];
      var front = function (t) { return 50 + 240 * t + 50; };
      [[null, 'No blur', 'for reference', false], [{}, 'Today — centred', 'smear on both sides, half of it in front', false], [{ phase: -100 }, 'Shutter phase −100', 'trails behind only — the streak follows the car', true], [{ phase: 100 }, 'Shutter phase +100', 'runs ahead only', true]].forEach(function (r) {
        rowHead(r[1], r[2], r[3]);
        var e = r[0] ? fx('objectblur', Object.assign({ shutter: 6, samples: 48 }, r[0])) : null;
        tiles(at.map(function (t) { return { c: render(layer(car2, 100, 66, 50, PH / 2, e, mv), t), cap: t.toFixed(1) + ' s' }; }), at.map(front));
      });
    }
  } finally {
    mediaIds.forEach(function (id) { try { FM.media.remove(id); } catch (e) {} });
  }
  var last = ov.lastElementChild.getBoundingClientRect();
  return { sheet: SHEET, contentBottom: Math.ceil(last.bottom + 16) };
})();
