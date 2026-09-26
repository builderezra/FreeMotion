  'use strict';
  /* queue 957 — AIM AT WHERE THE + STANDS, NOT WHERE IT IS MID-ENTRANCE. Ezra, 26 Sep, on his phone at v17.02: *"The hour
     [arrow] is inside of the plus button"*. The tip is aimed from the +'s getBoundingClientRect(), and on the first open this
     ran ~280 ms into Home's intro — while the + was still held in its own entrance (hm-rise-fab, delay 0.545 s: opacity 0,
     translateY(18px) scale(.86)). Measured on a real first launch at 440x956: the + read 49.9 px wide with its centre 18 px
     low, so the tip landed 25.3 px from the centre of a 29 px-radius + — inside it; aimed at rest it is 41.0 (29 + 12).
     So while the + has a FINITE animation running (its entrance, or any transition) this waits for it and draws then. Its
     hue drift is infinite and is not waited for. `gen` voids a wait that Home has re-rendered past — render() calls clear()
     first — so a tab change can never receive a late arrow.
     ⚠️ AND A TIMER AS WELL AS `finished`, for the reason arrowSoon() keeps one: a page the browser is not painting (hidden,
     or an off-screen frame) need not advance its animations. Measured: waiting on `finished` alone, the suite's off-screen
     fresh-boot #936 instance never drew its arrow at all. The timer fires when the entrance should have ended; the second
     pass (`landed`) draws without waiting again. */
  var gen = 0;
  function settling(el) {
    if (!el.getAnimations) return [];
    return el.getAnimations().filter(function (an) {
      var ct = an.effect && an.effect.getComputedTiming ? an.effect.getComputedTiming() : null;
      return !!ct && isFinite(ct.endTime) && an.playState !== 'finished' && an.playState !== 'idle';
    });
  }
  function draw(opts) {
    var NS = 'http://www.w3.org/2000/svg', ID = 'hm-arrow936';
    var old = document.getElementById(ID); if (old) old.remove();
    var home = document.getElementById('home-screen'), plus = document.getElementById('hm-new');
    var title = document.querySelector('#home-screen .hm-grid .hm-empty-title');
    if (!home || !plus || !title) return null;
    var moving = opts && opts.landed ? [] : settling(plus);
    if (moving.length) {
      var mine = ++gen, left = 0;
      moving.forEach(function (an) { left = Math.max(left, an.effect.getComputedTiming().endTime - (an.currentTime || 0)); });
      var go = function () { if (mine !== gen) return; gen++; draw({ still: !!(opts && opts.still), landed: true }); };
      Promise.all(moving.map(function (an) { return an.finished.catch(function () {}); })).then(go);
      setTimeout(go, Math.min(3000, left + 150));
      return null;
    }
    var t = title.getBoundingClientRect(), p = plus.getBoundingClientRect();
