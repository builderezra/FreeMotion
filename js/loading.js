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
  /* ⚠️ AND A POINT AT WHICH IT GIVES UP (queue 704). Without one, a layer whose media never arrives is
   * "loading" FOREVER: `pending()` counts a video/image/audio layer with no record at all, `tick()` only
   * stops when that list empties, and nothing else ever removes it. MEASURED: a video layer with no
   * media record leaves the pill reading "Loading lost clip" and the 120ms poll running indefinitely —
   * on a phone, a spinner that never stops and a timer that never lets the app go idle.
   * It is reachable without anything exotic: a project whose media was lost (a cleared store, a failed
   * import, queue 129's clip with no picture) is exactly this shape on disk.
   * 25s is deliberately generous. The no-record window is the EARLIEST part of loading and normally
   * closes in well under a second; the slowest legitimate case is a large 4K file being decoded on a
   * phone, and this has to sit clearly past that. Giving up only stops CLAIMING it is loading — the
   * layer is untouched, and the honest reporting of a clip with no picture already lives in queue 129's
   * "A clip with no picture" panel rather than here. */
  var GIVE_UP_MS = 25000;
  var timer = 0, el = null, since = Object.create(null);

  function pending() {
    var sc = FM.scene, out = [], now = Date.now(), live = Object.create(null);
    if (!sc || !sc.layers || !FM.media) { since = Object.create(null); return out; }
    sc.layers.forEach(function (l) {
      if (!l || (l.type !== 'video' && l.type !== 'image')) return;   // queue 759: there is no 'audio' layer type — a song is a video layer
      var m = FM.media.get(l.id);
      var waiting;
      // No record at all means the media is still being decoded into one — that is loading too, and it
      // is the earliest part of the window.
      if (!m) waiting = true;
      else if (!m.el) waiting = false;                 // canvas-backed records (elements, drawings) are ready by construction
      else waiting = (typeof m.el.readyState === 'number' && m.el.readyState < 2);
      if (!waiting) return;                            // ready: its clock is dropped below, so a re-load starts fresh
      live[l.id] = 1;
      if (since[l.id] == null) since[l.id] = now;
      // STOP CLAIMING, do not stop trying: the layer is untouched and will still light up if it ever
      // arrives — this only ends the spinner and the poll behind it.
      if (now - since[l.id] < GIVE_UP_MS) out.push(l);
    });
    // forget layers that are ready or gone, so a clip re-added later gets its full grace again
    Object.keys(since).forEach(function (k) { if (!live[k]) delete since[k]; });
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
