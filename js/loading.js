/* FreeMotion — "this layer is still loading" indicator (queue 201).
 *
 * Ezra: "I think the issue with layers I add being invisible is because they're just loading, so make
 * the app identify this loading and put a nice smooth loading circle that moves in the bottom left
 * corner."
 *
 * HE DIAGNOSED IT CORRECTLY, and it is measured (tests/_onevideo.html). Importing a 1280x720 clip and
 * sampling the media element every 250ms from the moment the layer is added:
 *      t=0ms    readyState 1   drawImage → BLANK
 *      t=250ms  readyState 1   drawImage → first pixels
 *      t=500ms  readyState 4   fine from here on
 * So there is a real window in which the layer exists, the timeline shows its clip, and the canvas can
 * only draw nothing — because the decoder has not produced a frame yet. On this machine that is about
 * half a second; on a phone with a real 4K clip off the camera roll it is far longer, which is exactly
 * "layers I add being invisible" and the "seemingly broken and not loading properly" half of #202.
 * Nothing was wrong with the import. The app just never said it was working.
 *
 * WHAT COUNTS AS READY: readyState >= 2 (HAVE_CURRENT_DATA) is the first state in which drawImage is
 * guaranteed to produce a frame for the current position. Deliberately not >= 4 — waiting for
 * "can play through" would keep the spinner up long after the picture is on screen, which would make
 * the app look slower than it is.
 *
 * The poll only runs while something is actually pending, and stops itself the moment nothing is. An
 * always-on interval on the app's heaviest screen is the sort of thing this project has had to hunt
 * down before.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  var POLL_MS = 120;
  var timer = 0, el = null;

  function pending() {
    var sc = FM.scene, out = [];
    if (!sc || !sc.layers || !FM.media) return out;
    sc.layers.forEach(function (l) {
      if (!l || (l.type !== 'video' && l.type !== 'image' && l.type !== 'audio')) return;
      var m = FM.media.get(l.id);
      // No record at all means the media is still being decoded into one — that is loading too, and it
      // is the earliest part of the window.
      if (!m) { out.push(l); return; }
      var e = m.el;
      if (!e) return;                                  // canvas-backed records (elements, drawings) are ready by construction
      if (typeof e.readyState === 'number' && e.readyState < 2) out.push(l);
    });
    return out;
  }

  function node() {
    if (el && el.isConnected) return el;
    el = document.createElement('div');
    el.id = 'loading-dot';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="ld-track" cx="12" cy="12" r="9"/>' +
      '<circle class="ld-arc" cx="12" cy="12" r="9"/></svg>' +
      '<span class="ld-label"></span>';
    document.body.appendChild(el);
    return el;
  }

  function paint(list) {
    var n = node();
    if (!list.length) { n.classList.remove('on'); return; }
    n.classList.add('on');
    var lbl = n.querySelector('.ld-label');
    // Name the layer when there is one, count them when there are several — "Loading" on its own does
    // not tell you WHICH of your clips is the one you cannot see.
    if (lbl) lbl.textContent = list.length === 1 ? ('Loading ' + (list[0].name || 'clip')) : ('Loading ' + list.length + ' clips');
  }

  function tick() {
    var list = pending();
    paint(list);
    if (!list.length) { stop(); return; }
  }

  function start() {
    if (timer) return;
    tick();
    timer = setInterval(tick, POLL_MS);
  }
  function stop() { if (timer) { clearInterval(timer); timer = 0; } }

  FM.loadingDot = {
    /* Called when something has just been added, and safe to call at any time — it starts a poll only
     * if there is genuinely something not ready, and the poll stops itself when there isn't. */
    check: function () {
      if (pending().length) start(); else { paint([]); stop(); }
    },
    pending: pending,        // exposed so the suite can assert on the real condition, not on the DOM
    _stop: stop,
  };
})(window.FM);
