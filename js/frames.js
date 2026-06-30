/* FreeMotion — Frame cache.
 * Decodes a video clip's frames into an array of ImageBitmaps so we can render any frame
 * synchronously and in any order. This is what makes REVERSE playback smooth (HTML video
 * can't play backward, and per-frame seeking can't keep up at playback speed). It's also
 * the groundwork for frame interpolation / smooth slow-mo later.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // Seek to t and capture as soon as the seek completes. (Avoid post-'seeked' timers:
  // backgrounded tabs clamp setTimeout to ~1s, which would make decoding crawl.)
  function seekAndPaint(el, t) {
    return new Promise(res => {
      let done = false;
      const fin = () => { if (done) return; done = true; el.removeEventListener('seeked', fin); res(); };
      el.addEventListener('seeked', fin);
      try { el.currentTime = t; } catch (e) { fin(); }
      setTimeout(fin, 500); // fallback cap if 'seeked' never fires
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
    if (rec._building) return rec._building;
    rec._building = (async function () {
      const el = rec.el, dur = rec.duration || 0;
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
      for (let i = 0; i < count; i++) {
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
      rec._building = null;
      return rec.frameCache;
    })();
    return rec._building;
  };

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
    const p = _stripQueue.then(function () { return _extractStrip(m, count); });
    _stripQueue = p.catch(function () {});   // keep the chain alive even if one build throws
    return p;
  };

  async function _extractStrip(m, count) {
    if (!m || !m.el || m._stripBuilding || m.stripFrames !== undefined) return m && m.stripFrames;
    count = count || 8;
    m._stripBuilding = true;
    try {
      if (m.kind === 'image') {
        try { m.stripFrames = [await createImageBitmap(m.el)]; } catch (e) { m.stripFrames = []; }
      } else {
        const el = m.el;
        if (el.readyState < 2) {   // wait for it to become decodable (don't spin / retry forever)
          await new Promise(res => { const on = () => { el.removeEventListener('loadeddata', on); res(); }; el.addEventListener('loadeddata', on); setTimeout(res, 3000); });
        }
        const frames = [];
        if (el.readyState >= 2) {
          const dur = (isFinite(m.duration) && m.duration > 0) ? m.duration : (el.duration || 1);
          const wasTime = el.currentTime, wasMuted = el.muted; el.muted = true;
          for (let i = 0; i < count; i++) {
            await seekAndPaint(el, Math.min((i + 0.5) * dur / count, Math.max(0, dur - 0.001)));
            try { frames.push(await createImageBitmap(el)); } catch (e) {}
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
    if (m && m.stripFrames) { m.stripFrames.forEach(f => { if (f && f.close) try { f.close(); } catch (e) {} }); m.stripFrames = null; }
  };
})(window.FM);
