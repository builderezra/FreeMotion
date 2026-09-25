/* FreeMotion — Frame cache.
 * Decodes a video clip's frames into an array of ImageBitmaps so we can render any frame
 * synchronously and in any order. This is what makes REVERSE playback smooth (HTML video
 * can't play backward, and per-frame seeking can't keep up at playback speed). It's also
 * the groundwork for frame interpolation / smooth slow-mo later.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // ONE seek queue per media element. The frame cache and the timeline filmstrip both seek the
  // SAME <video>; on a page reload they ran interleaved, so each 'seeked' could belong to the
  // OTHER build and the cache captured wrong/duplicated frames — smooth slow-mo looked different
  // after every refresh. Serializing every seek-consumer through the element's lock fixes it.
  function seekLock(rec, fn) {
    const prev = rec._seekLock || Promise.resolve();
    const p = prev.then(fn, fn);
    rec._seekLock = p.catch(() => {});
    return p;
  }

  /* HOLD THE ELEMENT FOR AS LONG AS YOU NEED IT, not just for one seek (queue 690). The exporter
   * steps every clip's OWN <video> frame by frame, and took no part in the queue above — so an export
   * started while the timeline was still drawing a clip's filmstrip fought it for the element. The
   * export's frame landed mid-seek (readyState 1, which the compositor skips in an export) and came
   * out BLACK: measured, the first 16-22 frames of a 3 s file, with nothing said. On his phone, with
   * several 4K clips, the strips take seconds to draw after a project opens — about as long as it
   * takes to tap Export and Export MP4.
   * A per-seek lock is not enough: a strip queued behind another clip could start between the
   * export's seek landing and the compositor drawing that frame. So the exporter takes the lock
   * ONCE, before its first frame, and gives it back when the file is done; anything that asks in
   * between (a strip, a preview cache build) simply waits its turn.
   * `ready` resolves when every earlier user has finished; `release` may be called before that too
   * (a Cancel while waiting), in which case the lock is passed straight on the moment it arrives. */
  FM.holdSeekLock = function (rec) {
    let give = null, released = false, onReady = null;
    const ready = new Promise(function (r) { onReady = r; });
    seekLock(rec, function () {
      return new Promise(function (done) {
        if (released) { done(); onReady(); return; }
        give = done; onReady();
      });
    });
    return { ready: ready, release: function () { released = true; if (give) { const g = give; give = null; g(); } } };
  };

  /* SEEK INSIDE THE FRAME, NOT ONTO ITS EDGE (queue 690). A clip's frame k starts at k/fps, and the
   * browser holds that in whole microseconds — a phone's 30 fps clip has frames at 33333, 66667,
   * 100000 µs … — while a seek to 2/30 = 0.0666666… is held as 66666 µs: one microsecond BEFORE
   * frame 2 starts, so the element shows frame 1. Every export frame is taken at exactly f / fps, so
   * it hit that edge on a third of them: the file read 0,1,1,3,4,4,6,7,7 … — source frames 2, 5, 8 …
   * never in it and the one before each played twice. A plain 30 fps phone clip juddered in the
   * export while the preview (which plays the clip natively) was smooth.
   * Half a millisecond is far below one frame at any real rate (4 ms at 240 fps), and lands every
   * seek unambiguously inside the frame that starts at that moment. Measured on a bare element:
   * k/30 showed 1,1,3,4,4,6 …, k/30 + 0.5 ms showed 1,2,3,4,5,6. Clamped short of the clip's end,
   * the same as the old targets were. */
  const INSIDE_FRAME = 0.0005;
  FM.frameSeekTarget = function (time, dur) {
    return Math.min(Math.max(time || 0, 0) + INSIDE_FRAME, Math.max(0, (dur || 0) - 0.001));
  };

  // Seek to t and capture as soon as the seek completes. (Avoid post-'seeked' timers:
  // backgrounded tabs clamp setTimeout to ~1s, which would make decoding crawl.)
  function seekAndPaint(el, t) {
    return new Promise(res => {
      let tries = 0, emptied = false;
      const attempt = () => {
        let done = false;
        const fin = () => {
          if (done) return;
          done = true;
          el.removeEventListener('seeked', fin);
          el.removeEventListener('emptied', onEmptied);
          // A stale 'seeked' (another consumer's seek landing) or the 500ms cap can leave the
          // element on the WRONG frame — verify we actually arrived, one re-seek per miss.
          // Not on an element that was just EMPTIED: there is no frame left to arrive at.
          if (!emptied && Math.abs((el.currentTime || 0) - t) > 0.2 && tries < 2) { tries++; attempt(); return; }
          res();
        };
        /* The clip was released under this seek (queue 690, hunt f) — its project was left and its src taken
           away. 'seeked' will never come, so stop now rather than sit out the 500 ms cap (and its re-seeks). */
        const onEmptied = () => { emptied = true; fin(); };
        el.addEventListener('seeked', fin);
        el.addEventListener('emptied', onEmptied);
        try { el.currentTime = t; } catch (e) { fin(); }
        setTimeout(fin, 500); // fallback cap if 'seeked' never fires
      };
      attempt();
    });
  }

  /* Wait for an element to become decodable — but never for one that has been RELEASED (queue 690, hunt f).
   * Both builders below waited up to 3 s for 'loadeddata'. When he leaves a project, js/media.js release()
   * takes the src away and marks the record `_released`; 'loadeddata' can then never fire, and every strip
   * build still queued for that project's clips sat out the full 3 s, one after another, in the app's ONE
   * strip queue — so the clips of the project he had just opened stayed blank bars behind them (measured
   * 0.6 s to a filmstrip opened directly, 9 s after looking into three other projects on the way). Taking
   * the src away fires 'emptied', so a wait already in progress ends then too. */
  function waitDecodable(el) {
    return new Promise(r => {
      let t = 0;
      const on = () => { el.removeEventListener('loadeddata', on); el.removeEventListener('emptied', on); clearTimeout(t); r(); };
      el.addEventListener('loadeddata', on);
      el.addEventListener('emptied', on);
      t = setTimeout(on, 3000);
    });
  }

  /* Decode the clip at `fps` into ImageBitmaps. Capped so very long clips stay bounded.
   * De-duplicated: concurrent calls for the same clip share one in-flight build, so rapidly
   * toggling reverse on/off can't kick off competing decodes (the source of the glitching). */
  // opts (preview only): { maxDim } downscales the longest side at decode so each cached ImageBitmap is
  // bytes-bounded, and { maxBytes } caps total cache size by deriving the frame count from a byte budget.
  // Export passes NO opts → full source resolution + only the 900-frame count cap (quality preserved).
  FM.buildFrameCache = function (rec, fps, onProgress, opts) {
    opts = opts || {};
    var maxDim = opts.maxDim || 0;        // 0 = full source resolution
    var maxBytes = opts.maxBytes || 0;    // 0 = no byte budget
    var scaled = maxDim > 0;
    // Reuse only a cache of the SAME fps AND scaled-ness, so a downscaled preview cache is never silently
    // reused for a full-res export (exporter.js force-clears a scaled cache before exporting).
    if (rec.frameCache && rec.frameCache.fps === fps && !!rec.frameCache.scaled === scaled) return Promise.resolve(rec.frameCache);
    /* The IN-FLIGHT dedupe has to be key-aware too, and this is the whole bug. The reuse check above
     * correctly compares fps AND scaled-ness — but the next line used to hand back ANY running build.
     * prepareCaches exists precisely to guarantee a full-resolution export cache: it force-clears a
     * `scaled` one, then calls here with no maxDim. While a PREVIEW build is still running,
     * rec.frameCache is still null (it is only assigned when the build finishes), so that clear is a
     * no-op and the export was handed the preview promise instead.
     *
     * What that delivered: a reversed or frame-blend clip encoded from 640px (mobile) or 960px
     * (desktop) bitmaps upscaled to the layer's full frame box, so it is visibly soft and blocky in
     * the MP4/GIF/PNG sequence while every other layer is sharp — and at the preview cache's fps cap
     * of 24 inside a 30 or 60 fps export. The trigger is the ordinary one: open a project with a
     * reversed clip, which fires ensureReverseCache on load, and press Export while "Preparing
     * frames…" is still showing. No warning; re-exporting a minute later silently gives a different,
     * sharper file. */
    var key = fps + '|' + scaled;
    if (rec._building) {
      if (rec._buildKey === key) return rec._building;
      // A build of the WRONG shape is running. Wait it out (a rejection is not ours to handle), then
      // build the one that was actually asked for.
      return rec._building.catch(function () {}).then(function () { return FM.buildFrameCache(rec, fps, onProgress, opts); });
    }
    rec._buildKey = key;
    rec._building = seekLock(rec, async function () {
      try {
      const el = rec.el, dur = rec.duration || 0;
      // metadata alone isn't decodable frames — on a fresh reload the blob may still be warming up
      if (el && el.readyState < 2 && !rec._released) await waitDecodable(el);
      // A full 1080x1920 bitmap is ~8MB; a reversed/slow clip can need hundreds of frames → multiple GB,
      // which OOM-kills mobile Safari. On the preview path, downscale the longest side to maxDim and cap
      // the frame COUNT by a byte budget. The compositor draws frames scaled to display size anyway, so a
      // softer preview cache is invisible; export (no opts) stays pixel-exact.
      var sw = (el && (el.videoWidth || el.naturalWidth)) || 0;
      var sh = (el && (el.videoHeight || el.naturalHeight)) || 0;
      var tw = sw, th = sh, useResize = false;
      if (scaled && sw > 0 && sh > 0) {
        var longest = Math.max(sw, sh);
        if (longest > maxDim) { var k = maxDim / longest; tw = Math.max(1, Math.round(sw * k)); th = Math.max(1, Math.round(sh * k)); useResize = true; }
      }
      var count = Math.min(900, Math.max(1, Math.round(dur * fps)));
      if (maxBytes > 0 && tw > 0 && th > 0) count = Math.min(count, Math.max(1, Math.floor(maxBytes / (tw * th * 4))));
      // Spread the (capped) frames across the WHOLE clip, and store the EFFECTIVE fps (count/dur). The
      // compositor maps source time → frame via this effFps, so a clip longer than the cap no longer
      // freezes the picture while the (uncapped) audio keeps running — it just loses temporal resolution.
      const effFps = count / Math.max(1e-6, dur);
      const frames = new Array(count);
      const wasMuted = el.muted, wasTime = el.currentTime;
      el.muted = true; try { el.pause(); } catch (e) {}
      let ok = 0;
      /* ABORTABLE, PER FRAME — opt-in, so nothing that does not pass a signal changes behaviour.
       *
       * This loop is up to 900 sequential seek-and-capture operations and it had no cancellation hook
       * of any kind. The exporter checked its cancel flag only BETWEEN layers, so Cancel pressed during
       * "Decoding frames… 12%" set a flag nothing read: the app went on seeking and decoding for the
       * whole remaining clip — tens of seconds at 1080p, minutes at 4K, since seekAndPaint waits up to
       * 500ms a frame — while allocating up to 1.5GB of ImageBitmaps the user had just said they did
       * not want. On a phone that is an unresponsive app and a real out-of-memory risk, and Cancel was
       * simply a dead button for that whole stretch.
       * On abort the partial frames are CLOSED and no cache is stored: a half-length cache is worse
       * than none, because the compositor would then play the clip from it as though it were complete. */
      const shouldAbort = (opts && typeof opts.shouldAbort === 'function') ? opts.shouldAbort : null;
      const giveUp = () => {
        for (let j = 0; j < count; j++) { const b = frames[j]; if (b && b.close) { try { b.close(); } catch (e) {} } }
        el.muted = wasMuted;
        try { el.currentTime = wasTime; } catch (e) {}
        return null;
      };
      for (let i = 0; i < count; i++) {
        // A released clip (its project was left — see waitDecodable) is abandoned like a cancelled one.
        if ((shouldAbort && shouldAbort()) || rec._released) return giveUp();
        // inside frame i, not on its edge — on the edge a third of a 30 fps clip's cache held the
        // frame BEFORE, so a reversed or frame-blend clip repeated one and skipped the next (see FM.frameSeekTarget)
        await seekAndPaint(el, FM.frameSeekTarget((i * dur) / count, dur));
        try {
          frames[i] = useResize
            ? await createImageBitmap(el, { resizeWidth: tw, resizeHeight: th, resizeQuality: 'medium' })
            : await createImageBitmap(el);
          ok++;
        } catch (e) { frames[i] = null; }
        if (onProgress) onProgress((i + 1) / count);
      }
      el.muted = wasMuted;
      try { el.currentTime = wasTime; } catch (e) {}
      rec.frameCache = { fps, effFps, frames, count, decoded: ok, duration: dur, scaled: scaled, w: tw, h: th };
      return rec.frameCache;
      } finally { rec._building = null; }   // clear on THROW too — a mid-build media swap left this a permanently-rejected promise, so reverse/slow-mo never got a cache again
    });
    return rec._building;
  };

  /* IS A BUILD CURRENTLY DRIVING THIS ELEMENT'S SEEKS?
   *
   * buildFrameCache and the filmstrip builder both step the clip's OWN <video> — not a clone — capturing
   * whatever frame it happens to be sitting on. Meanwhile the PREVIEW writes `el.currentTime` on that
   * same element from three places, every animation frame. Nothing connected the two, so scrubbing (or
   * simply leaving playback running) while a reversed or frame-blended clip built its cache baked the
   * PLAYHEAD's frames into the cache instead of the grid's: the clip then plays back showing the wrong
   * pictures, permanently, with nothing to say so. seekAndPaint only tolerates 0.2s of disagreement and
   * retries twice, so a 60Hz stream of competing seeks burns both retries and resolves anyway.
   * Exported so the preview can stand down for the second or two a build takes. Both flags are cleared
   * in `finally` blocks (below, and in the strip builder), so a throwing build cannot wedge the preview
   * into never seeking again — which is the one way this guard could do harm. */
  FM.seekBusy = function (rec) { return !!(rec && (rec._building || rec._stripBuilding)); };

  FM.clearFrameCache = function (rec) {
    if (rec && rec.frameCache) {
      rec.frameCache.frames.forEach(f => { if (f && f.close) try { f.close(); } catch (e) {} });
      rec.frameCache = null;
    }
  };

  // Small filmstrip of DISTINCT frames for a clip's timeline bar (AM-style). Cheap + cached on the
  // media record (m.stripFrames). Video: seek to `count` evenly-spaced times. Image: a single frame.
  // SERIALIZED through one global queue so a project with many video clips doesn't seek N <video>s at
  // once (that storm spikes CPU/memory + fights the preview compositor for each element).
  let _stripQueue = Promise.resolve();
  FM.buildClipStrip = function (m, count) {
    if (!m || !m.el || m._stripBuilding || m.stripFrames !== undefined) return Promise.resolve(m && m.stripFrames);
    // global queue (one strip at a time across clips) + the per-element seek lock (never interleave
    // with a frame-cache build seeking the same <video> — that corrupted reload-time caches)
    const p = _stripQueue.then(function () { return seekLock(m, function () { return _extractStrip(m, count); }); });
    _stripQueue = p.catch(function () {});   // keep the chain alive even if one build throws
    return p;
  };

  // Decode strip frames at FILMSTRIP size, not source size. Every consumer of m.stripFrames draws
  // into a 32px-tall canvas (drawFilmstrip and the slip ghost, both H = 32), so a full-resolution
  // decode was throwing away ~99.9% of the pixels it paid for: 8 frames of 1080p is ~66MB of native
  // ImageBitmap surface per clip, ~265MB for 4K. 64px is 2x the tile, so the downscale into 32px is
  // still supersampled. Falls back to an uncapped decode if the element has not reported its size.
  const STRIP_H = 64;
  function stripSize(el, m) {
    const w = el.videoWidth || el.naturalWidth || m.width || 0;
    const h = el.videoHeight || el.naturalHeight || m.height || 0;
    if (!w || !h || h <= STRIP_H) return null;
    return { resizeHeight: STRIP_H, resizeWidth: Math.max(1, Math.round(w * STRIP_H / h)), resizeQuality: 'medium' };
  }

  async function _extractStrip(m, count) {
    if (!m || !m.el || m._stripBuilding || m.stripFrames !== undefined) return m && m.stripFrames;
    // Released while it waited in the queue — nobody can draw it now, so hand the queue straight on (queue 690).
    if (m._released) return undefined;
    count = count || 8;
    m._stripBuilding = true;
    try {
      if (m.kind === 'image') {
        const opt = stripSize(m.el, m);
        try { m.stripFrames = [opt ? await createImageBitmap(m.el, opt) : await createImageBitmap(m.el)]; } catch (e) { m.stripFrames = []; }
      } else {
        const el = m.el;
        if (el.readyState < 2) await waitDecodable(el);   // wait for it to become decodable (don't spin / retry forever)
        const frames = [];
        if (el.readyState >= 2 && !m._released) {
          const dur = (isFinite(m.duration) && m.duration > 0) ? m.duration : (el.duration || 1);
          const wasTime = el.currentTime, wasMuted = el.muted; el.muted = true;
          const opt = stripSize(el, m);
          for (let i = 0; i < count; i++) {
            if (m._released) break;   // released mid-strip (queue 690): every seek left would wait on nothing
            await seekAndPaint(el, Math.min((i + 0.5) * dur / count, Math.max(0, dur - 0.001)));
            try { frames.push(opt ? await createImageBitmap(el, opt) : await createImageBitmap(el)); } catch (e) {}
          }
          if (!m._released) { try { el.currentTime = wasTime; } catch (e) {} }
          el.muted = wasMuted;
        }
        if (m._released) {   // a strip of a clip nobody can see any more — give its bitmaps straight back
          frames.forEach(f => { if (f && f.close) try { f.close(); } catch (e) {} });
          return undefined;
        }
        m.stripFrames = frames;   // ALWAYS set (even [] on failure) so the timeline never retries forever
      }
    } finally { m._stripBuilding = false; }
    return m.stripFrames;
  };

  FM.clearClipStrip = function (m) {
    if (!m || !m.stripFrames) return;
    m.stripFrames.forEach(f => { if (f && f.close) try { f.close(); } catch (e) {} });
    // UNDEFINED, not null. Both the build guard above and the timeline's own "should I build?" test
    // are `stripFrames === undefined` — the sentinel for "never built" — while null means "built and
    // came back empty, do not retry". Deleting a clip keeps its media record alive for undo, so
    // parking it at null would release the bitmaps and then permanently refuse to rebuild them: the
    // restored clip would show a blank bar forever. undefined releases the memory AND allows a rebuild.
    delete m.stripFrames;
  };
})(window.FM);
