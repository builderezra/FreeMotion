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

  // Seek to t and capture as soon as the seek completes. (Avoid post-'seeked' timers:
  // backgrounded tabs clamp setTimeout to ~1s, which would make decoding crawl.)
  function seekAndPaint(el, t) {
    return new Promise(res => {
      let tries = 0;
      const attempt = () => {
        let done = false;
        const fin = () => {
          if (done) return;
          done = true;
          el.removeEventListener('seeked', fin);
          // A stale 'seeked' (another consumer's seek landing) or the 500ms cap can leave the
          // element on the WRONG frame — verify we actually arrived, one re-seek per miss.
          if (Math.abs((el.currentTime || 0) - t) > 0.2 && tries < 2) { tries++; attempt(); return; }
          res();
        };
        el.addEventListener('seeked', fin);
        try { el.currentTime = t; } catch (e) { fin(); }
        setTimeout(fin, 500); // fallback cap if 'seeked' never fires
      };
      attempt();
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
      if (el && el.readyState < 2) await new Promise(r => { const on = () => { el.removeEventListener('loadeddata', on); r(); }; el.addEventListener('loadeddata', on); setTimeout(r, 3000); });
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
        if (shouldAbort && shouldAbort()) return giveUp();
        await seekAndPaint(el, Math.min((i * dur) / count, Math.max(0, dur - 0.001)));
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
    count = count || 8;
    m._stripBuilding = true;
    try {
      if (m.kind === 'image') {
        const opt = stripSize(m.el, m);
        try { m.stripFrames = [opt ? await createImageBitmap(m.el, opt) : await createImageBitmap(m.el)]; } catch (e) { m.stripFrames = []; }
      } else {
        const el = m.el;
        if (el.readyState < 2) {   // wait for it to become decodable (don't spin / retry forever)
          await new Promise(res => { const on = () => { el.removeEventListener('loadeddata', on); res(); }; el.addEventListener('loadeddata', on); setTimeout(res, 3000); });
        }
        const frames = [];
        if (el.readyState >= 2) {
          const dur = (isFinite(m.duration) && m.duration > 0) ? m.duration : (el.duration || 1);
          const wasTime = el.currentTime, wasMuted = el.muted; el.muted = true;
          const opt = stripSize(el, m);
          for (let i = 0; i < count; i++) {
            await seekAndPaint(el, Math.min((i + 0.5) * dur / count, Math.max(0, dur - 0.001)));
            try { frames.push(opt ? await createImageBitmap(el, opt) : await createImageBitmap(el)); } catch (e) {}
          }
          try { el.currentTime = wasTime; } catch (e) {}
          el.muted = wasMuted;
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
