  test('P26 #1105 glide (#715) on the pointer’s own timestamps: a flick that stalls just before release glides at any CPU speed, a parked pointer does not fling, fine mode never glides', { item: '1105', budgetMs: 60000 }, async function () {
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var T = FM.glideTuning;
    if (!T || typeof T.minFlickMouse !== 'number') throw new Error('FM.glideTuning.minFlickMouse is not exposed — the mouse bar cannot be checked');
    if (!(T.minFlickMouse <= 0.3)) throw new Error('the mouse flick bar is ' + T.minFlickMouse + ' px/ms — a desk-speed flick (0.3–0.5) will not glide; that is the "tedious"');
    if (!(T.minFlick >= 0.5)) throw new Error('the TOUCH flick bar dropped to ' + T.minFlick + ' — a thumb\'s positioning drag will fling');
    if (!(T.rest >= 40 && T.rest <= 200)) throw new Error('the rest cutoff is ' + T.rest + 'ms — a parked pointer must not fling, and a real flick must not be read as parked');
    var saved = FM.scene, savedSel = FM.scene.selectedId;
    try {
      var L = FM.makeLayer('shape', { name: 'G', shape: 'rect', x: 60, y: 60, shapeW: 40, shapeH: 40, fill: '#f00', start: 0, duration: 2 });
      var inst = FM.fxRegistry.makeInstance('blur'), def = FM.fxRegistry.get('blur');
      if (!inst || !def) throw new Error('could not build a blur instance to scrub');
      // Mid-range, and re-centred before every case: a glide must be able to travel either way without
      // meeting a wall, or "did not move after release" would be true for the wrong reason.
      var centre = function () {
        var P = FM.scene.layers[0].effects[0].params;
        def.params.forEach(function (p) { if (typeof p.min === 'number' && typeof p.max === 'number') P[p.key] = (p.min + p.max) / 2; });
      };
      L.effects = [inst];
      FM.scene = scene([L]); centre();
      FM.selectLayer(L.id); FM.refreshAll(); await sleep(120);
      var cat = [].slice.call(document.querySelectorAll('#inspector button')).filter(function (b) { return /Effects/.test(b.textContent); })[0];
      if (cat) { cat.click(); await sleep(160); }
      var strip = document.querySelector('#inspector .fx-scrub');
      if (!strip) {
        var head = document.querySelector('#inspector .fx-head');
        if (head) { head.click(); await sleep(160); strip = document.querySelector('#inspector .fx-scrub'); }
      }
      if (!strip) throw new Error('no .fx-scrub on screen — nothing to test');
      var read = function () { return JSON.stringify(FM.scene.layers[0].effects[0].params); };
      var r = strip.getBoundingClientRect(), cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
      var opts = function (x, y, type, up) { return { bubbles: true, cancelable: true, pointerId: 9, pointerType: type, isPrimary: true, clientX: x, clientY: y, button: 0, buttons: up ? 0 : 1 }; };
      // moves: dx per ~8ms sample; restMs: still time before the up; yOff: vertical offset of the moves (90 = fine mode)
      /* THE EVENTS CARRY THEIR OWN CLOCK. The #715 test paces its samples with sleep(8), so under a CPU throttle the whole flick is
         stretched with the machine: at 4x its samples are 40 ms apart, the 'flick' is 0.25 px/ms and the two stall samples fill 80 of
         the 100 ms window. A real pointer's timeStamp is the input device's, not the page's, so a busy page does not slow a hand down.
         The stamps here are set on the event itself (8 ms apart, as a 125 Hz mouse sends them) and every event is dispatched at
         once, so the verdict is the same at any CPU speed. */
      var STEP = 8;
      var stamp = function (ev, t) { Object.defineProperty(ev, 'timeStamp', { value: t, configurable: true }); return ev; };
      var drive = async function (moves, restMs, type, yOff) {
        centre();
        var x = cx, y = cy + (yOff || 0), t = 1000;
        strip.dispatchEvent(stamp(new PointerEvent('pointerdown', opts(x, cy, type)), t));
        for (var i = 0; i < moves.length; i++) { t += STEP; x += moves[i]; strip.dispatchEvent(stamp(new PointerEvent('pointermove', opts(x, y, type)), t)); }
        t += restMs;
        var atUp = read();
        strip.dispatchEvent(stamp(new PointerEvent('pointerup', opts(x, y, type, true)), t + 1));
        await sleep(280);
        return { moved: read() !== atUp, atUp: atUp, after: read() };
      };
      var rep = function (n, dx) { var a = []; for (var i = 0; i < n; i++) a.push(dx); return a; };

      var A = await drive(rep(8, -10).concat([0, 0]), 0, 'mouse', 0);
      if (!A.moved) throw new Error('A: a mouse flick that stalled for two samples before the click released did NOT glide (' + A.atUp + ' stayed) — the release velocity is still the last sample, not the last ' + T.window + 'ms; this is the "not always"');
      var B = await drive(rep(8, 10), 160, 'mouse', 0);
      if (B.moved) throw new Error('B: a mouse held STILL for 160ms before release glided (' + B.atUp + ' → ' + B.after + ') — a parked value was flung by stale velocity');
      var C = await drive(rep(8, -10).concat([0, 0]), 0, 'mouse', 90);
      if (C.moved) throw new Error('C: a drag ended in FINE mode glided after release (' + C.atUp + ' → ' + C.after + ') — "no momentum out of fine mode" is dead again; cancelDrag must stop a glide already in flight');
      var D = await drive(rep(10, -3), 0, 'touch', 0);
      if (D.moved) throw new Error('D: a slow TOUCH drag (~0.37 px/ms) glided (' + D.atUp + ' → ' + D.after + ') — the touch bar must stay at 0.6; a thumb\'s positioning drag would fling');
    } finally {
      FM.scene = saved; FM.scene.selectedId = savedSel;
      try { FM.refreshAll(); } catch (e) {}
      await sleep(60);
    }
  });

