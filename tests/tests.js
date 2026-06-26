/* FreeMotion — automated test suite (headless render + DOM assertions).
 *
 * Tests use SYNTHETIC scenes only — never personal media. They run in the app's
 * page context (FM already loaded). Two ways to run:
 *   • Open  /tests/run.html  in the preview for a green/red report.
 *   • Headless (agents / preview_eval):
 *       fetch('tests/tests.js').then(r=>r.text()).then(eval).then(()=>FMTests.run()).then(r=>JSON.stringify(r))
 *
 * Test tiers:
 *   regression — must ALWAYS be green; a red here blocks any commit.
 *   pending    — encodes an un-built BACKLOG gap; red is expected until that item ships,
 *                then it flips to green and graduates to regression.
 */
(function () {
  'use strict';

  function scene(layers, over) {
    return Object.assign({
      project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000000' },
      layers: layers, selectedId: null, selectedIds: []
    }, over || {});
  }
  function offscreen(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function px(ctx, x, y) { return ctx.getImageData(x, y, 1, 1).data; }

  var T = [];
  function test(name, opts, fn) {
    if (typeof opts === 'function') { fn = opts; opts = {}; }
    T.push({ name: name, pending: !!opts.pending, item: opts.item || '', fn: fn });
  }

  /* ---------------- regression (must stay green) ---------------- */

  test('render: a red shape draws red at its centre', { item: 'render-core' }, function () {
    var s = scene([FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 100, shapeH: 100, fill: '#ff0000' })]);
    var c = offscreen(320, 240); FM.renderScene(c.getContext('2d'), s, 0);
    var p = px(c.getContext('2d'), 160, 120);
    if (!(p[0] > 200 && p[1] < 60 && p[2] < 60)) throw new Error('centre pixel not red: ' + [p[0], p[1], p[2]]);
  });

  test('keyframes: ease-in x sits below the linear midpoint', { item: 'keyframes' }, function () {
    var L = FM.makeLayer('shape', { shape: 'rect', x: 0, y: 120, shapeW: 20, shapeH: 20, fill: '#fff' });
    L.transform.x = { kf: [{ t: 0, v: 0, e: 'easeIn', bez: [.42, 0, 1, 1] }, { t: 1, v: 100, e: 'easeIn', bez: [.42, 0, 1, 1] }] };
    var mid = FM.evalProp(L.transform.x, 0.5);
    if (!(mid < 45)) throw new Error('easeIn midpoint not < 45: ' + mid);
  });

  test('save/load: scene survives serialize → JSON → parse', { item: 'save-load' }, async function () {
    var s = scene([
      FM.makeLayer('text', { name: 'A', text: 'hi', x: 50, y: 50 }),
      FM.makeLayer('shape', { name: 'B', shape: 'rect', x: 100, y: 100 })
    ]);
    var obj = await FM.storage.serializeScene(s);
    var rt = JSON.parse(JSON.stringify(obj));
    var a = s.layers.map(function (l) { return l.id; }).join(',');
    var b = rt.layers.map(function (l) { return l.id; }).join(',');
    if (a !== b) throw new Error('layer ids changed across roundtrip: ' + a + ' vs ' + b);
  });

  /* ---------------- cycle 1 (mobile) — should flip to GREEN this cycle ---------------- */

  test('touch: #preview has touch-action:none', { item: 'mobile-touch', pending: true }, function () {
    var el = document.getElementById('preview');
    if (!el) throw new Error('#preview missing');
    var ta = getComputedStyle(el).touchAction;
    if (ta !== 'none') throw new Error('#preview touch-action="' + ta + '", expected none (drags would scroll the page)');
  });

  test('touch: a selection-box handle has touch-action:none', { item: 'mobile-touch', pending: true }, function () {
    var el = document.querySelector('.sb-handle');
    if (!el) throw new Error('no .sb-handle in DOM');
    var ta = getComputedStyle(el).touchAction;
    if (ta !== 'none') throw new Error('.sb-handle touch-action="' + ta + '", expected none');
  });

  test('mobile: inspector drawer toggle exists', { item: 'mobile-layout', pending: true }, function () {
    if (!document.getElementById('insp-toggle')) throw new Error('no #insp-toggle (inspector unreachable on phone)');
  });

  /* ---------------- pending — future cycles ---------------- */

  test('blend: luminosity mode actually composites (not a normal-mode fallback)', { item: 'blend-modes', pending: true }, function () {
    var blue = FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 320, shapeH: 240, fill: '#0000ff' });
    var red = FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 320, shapeH: 240, fill: '#ff0000' });
    red.blendMode = 'luminosity';
    var c = offscreen(320, 240); FM.renderScene(c.getContext('2d'), scene([blue, red]), 0);
    var p = px(c.getContext('2d'), 160, 120);
    if (p[0] > 200 && p[2] < 60) throw new Error('luminosity fell back to normal (got pure red) — mode not in BLEND map');
  });

  test('audio: file input accepts audio/*', { item: 'audio-import', pending: true }, function () {
    var fi = document.getElementById('file-input');
    if (!fi || !/audio/.test(fi.accept || '')) throw new Error('file-input accept lacks audio: "' + (fi && fi.accept) + '"');
  });

  /* ---------------- runner ---------------- */

  async function run() {
    var results = [];
    for (var i = 0; i < T.length; i++) {
      var t = T[i], ok = true, err = null;
      try { var r = t.fn(); if (r && typeof r.then === 'function') await r; }
      catch (e) { ok = false; err = String((e && e.message) || e); }
      results.push({ name: t.name, item: t.item, pending: t.pending, ok: ok, error: err });
    }
    var reg = results.filter(function (r) { return !r.pending; });
    var pend = results.filter(function (r) { return r.pending; });
    return {
      regressionPass: reg.filter(function (r) { return r.ok; }).length,
      regressionTotal: reg.length,
      regressionGreen: reg.every(function (r) { return r.ok; }),
      pendingPass: pend.filter(function (r) { return r.ok; }).length,
      pendingTotal: pend.length,
      results: results
    };
  }

  window.FMTests = { tests: T, run: run };
})();
