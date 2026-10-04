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

  // Frame Stutter needs two historical video pictures at once (held and, in Trail mode,
  // previous). A separate muted decoder keeps the playback element at the live output time.
  // The sampler retains only the current quantum's bounded snapshots, and one decoder per
  // active media record; a new quantum closes the old frames after its replacement is ready.
  FM.createFrameStutterSampler = function (media, opts) {
    opts = opts || {};
    const maxDim = opts.maxDim || 0, maxBytes = opts.maxBytes || 128 * 1024 * 1024;
    const decoders = new Map(), identities = new WeakMap();
    let identity = 0, active = null, pending = null, failure = null, chain = Promise.resolve(), disposed = false;
    const cancelled = () => new Error('CANCELLED');
    const closeFrames = map => {
      if (!map) return;
      const seen = new Set();
      for (const value of map.values()) for (const frame of [value.hold, value.prior]) {
        if (frame && !seen.has(frame)) { seen.add(frame); if (frame.close) try { frame.close(); } catch (e) {} }
      }
    };
    const closeDecoder = state => {
      try { state.el.pause(); state.el.removeAttribute('src'); state.el.load(); } catch (e) {}
      URL.revokeObjectURL(state.url);
    };
    const check = signal => { if (disposed || (signal && signal.aborted) || (opts.shouldCancel && opts.shouldCancel())) throw cancelled(); };
    const waitFor = (el, ready, signal, ms) => new Promise((resolve, reject) => {
      let done = false, timer, cancelTimer;
      const finish = err => {
        if (done) return;
        done = true; clearTimeout(timer); clearInterval(cancelTimer);
        ['loadeddata', 'canplay', 'seeked', 'error'].forEach(ev => el.removeEventListener(ev, onEvent));
        if (signal) signal.removeEventListener('abort', onAbort);
        if (err) reject(err); else resolve();
      };
      const onAbort = () => finish(cancelled());
      const onEvent = () => {
        if (el.error) finish(new Error('Frame Stutter video could not be decoded'));
        else if (ready()) finish();
      };
      ['loadeddata', 'canplay', 'seeked', 'error'].forEach(ev => el.addEventListener(ev, onEvent));
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => finish(new Error('Frame Stutter video seek timed out')), ms);
      if (opts.shouldCancel) cancelTimer = setInterval(() => { if (opts.shouldCancel()) onAbort(); }, 50);
      if (signal && signal.aborted) onAbort(); else onEvent();
    });
    const decoderFor = async (rec, signal) => {
      let state = decoders.get(rec);
      if (!state) {
        if (!(rec.file instanceof Blob)) throw new Error('Frame Stutter video has no reusable file');
        const url = URL.createObjectURL(rec.file), el = document.createElement('video');
        el.muted = true; el.playsInline = true; el.preload = 'auto'; el.src = url;
        state = { url, el }; decoders.set(rec, state);
        el.load();
      }
      await waitFor(state.el, () => state.el.readyState >= 2, signal, opts.timeoutMs || 10000);
      check(signal);
      return state.el;
    };
    const captureAt = async (rec, local, signal) => {
      const el = await decoderFor(rec, signal);
      const target = FM.frameSeekTarget(local, rec.duration);
      if (!(Math.abs(el.currentTime - target) < 1e-4 && !el.seeking && el.readyState >= 2)) {
        el.currentTime = target;
        await waitFor(el, () => !el.seeking && el.readyState >= 2 && Math.abs(el.currentTime - target) < 1e-3,
          signal, opts.timeoutMs || 10000);
      }
      check(signal);
      if (!maxDim && typeof VideoFrame === 'function') return new VideoFrame(el, { timestamp: Math.round(local * 1e6) });
      const w = rec.width || el.videoWidth, h = rec.height || el.videoHeight;
      if (!(w > 0 && h > 0)) throw new Error('Frame Stutter video has no decoded size');
      if (!maxDim || Math.max(w, h) <= maxDim) return createImageBitmap(el);
      const scale = maxDim / Math.max(w, h), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * scale)); cv.height = Math.max(1, Math.round(h * scale));
      cv.getContext('2d').drawImage(el, 0, 0, cv.width, cv.height);
      return createImageBitmap(cv);
    };
    const planState = (scene, t, given) => {
      const plans = given || FM.frameStutterVideoPlans(scene, t, media);
      const key = plans.map(p => {
        const rec = media.get(p.id);
        if (!identities.has(rec)) identities.set(rec, ++identity);
        return identities.get(rec) + ':' + p.key;
      }).join(';');
      return { plans, key };
    };
    const prepare = (scene, t, given) => {
      if (disposed) return Promise.reject(cancelled());
      const { plans, key } = planState(scene, t, given);
      if (active && active.key === key) return Promise.resolve(active.map);
      if (pending && pending.key === key) return pending.promise;
      if (failure && failure.key === key && Date.now() < failure.retryAt) return failure.promise;
      failure = null;
      if (pending) pending.controller.abort();
      const controller = new AbortController();
      const job = { key, controller, promise: null };
      pending = job;
      job.promise = chain = chain.catch(() => {}).then(async () => {
        check(controller.signal);
        const used = new Set(plans.map(p => media.get(p.id)));
        for (const [rec, state] of decoders) if (!used.has(rec)) { closeDecoder(state); decoders.delete(rec); }
        let estimate = 0;
        for (const p of plans) {
          const rec = media.get(p.id), w = rec.width || rec.el.videoWidth, h = rec.height || rec.el.videoHeight;
          if (!(w > 0 && h > 0)) throw new Error('Frame Stutter video has no decoded size');
          const scale = maxDim && Math.max(w, h) > maxDim ? maxDim / Math.max(w, h) : 1;
          estimate += Math.ceil(w * scale) * Math.ceil(h * scale) * 4 * (p.priorLocal == null ? 1 : 2);
        }
        if (estimate > maxBytes) throw new Error('Frame Stutter video snapshots exceed the frame memory budget');
        const map = new Map();
        try {
          for (const p of plans) {
            check(controller.signal);
            const rec = media.get(p.id);
            const hold = await captureAt(rec, p.holdLocal, controller.signal);
            map.set(p.id, { q: p.q, holdAt: p.holdAt, priorAt: p.priorAt, hold, prior: null });
            if (p.priorLocal != null) map.get(p.id).prior = await captureAt(rec, p.priorLocal, controller.signal);
          }
          check(controller.signal);
          closeFrames(active && active.map);
          active = { key, map };
          return map;
        } catch (e) { closeFrames(map); throw e; }
      }).catch(e => {
        if (!controller.signal.aborted && !disposed) {
          // A slow first decoder seek can time out once, especially after a cold load.
          // Keep the failed promise briefly to avoid a repaint storm, then permit a
          // retry at the same paused playhead. Structural errors remain cached.
          const transient = /timed out|could not be decoded/i.test(String(e && e.message));
          failure = { key, promise: job.promise,
            retryAt: transient ? Date.now() + Math.max(1, opts.retryDelayMs || 1000) : Infinity };
        }
        throw e;
      }).finally(() => { if (pending === job) pending = null; });
      return job.promise;
    };
    return { prepare, current(scene, t, plans) {
      if (!active || disposed) return null;
      return active.key === planState(scene, t, plans).key ? active.map : null;
    }, dispose() {
      if (disposed) return;
      disposed = true; if (pending) pending.controller.abort();
      closeFrames(active && active.map); active = null;
      for (const state of decoders.values()) closeDecoder(state);
      decoders.clear();
    } };
  };
  // C31: a Time Warp Scan cold seek needs every crossed video picture, but never needs to
  // retain those pictures. Decode on a separate element and accumulate only the scan plate.
  FM.createTimeWarpVideoSampler = function (media, opts) {
    opts = opts || {};
    let disposed = false, pending = null, active = null, decoder = null, chain = Promise.resolve();
    const aborted = signal => disposed || signal.aborted || (opts.shouldCancel && opts.shouldCancel());
    const cancelled = () => new Error('CANCELLED');
    const release = cv => { if (cv) { cv.width = 0; cv.height = 0; } };
    const closeDecoder = () => {
      if (!decoder) return;
      decoder.el.pause(); decoder.el.removeAttribute('src'); decoder.el.load();
      URL.revokeObjectURL(decoder.url); decoder = null;
    };
    const waitFor = (el, ready, signal) => new Promise((resolve, reject) => {
      let timer, poll, done = false;
      const finish = err => {
        if (done) return;
        done = true; clearTimeout(timer); clearInterval(poll);
        for (const ev of ['loadeddata','canplay','seeked','error']) el.removeEventListener(ev, onEvent);
        signal.removeEventListener('abort', onAbort);
        if (err) reject(err); else resolve();
      };
      const onAbort = () => finish(cancelled());
      const onEvent = () => {
        if (el.error) finish(new Error('Time Warp Scan video could not be decoded'));
        else if (ready()) finish();
      };
      for (const ev of ['loadeddata','canplay','seeked','error']) el.addEventListener(ev, onEvent);
      signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => finish(new Error('Time Warp Scan video seek timed out')), opts.timeoutMs || 10000);
      if (opts.shouldCancel) poll = setInterval(() => { if (opts.shouldCancel()) onAbort(); }, 50);
      if (aborted(signal)) onAbort(); else onEvent();
    });
    const decoderFor = async (rec, signal) => {
      if (decoder && decoder.rec !== rec) closeDecoder();
      if (!decoder) {
        const url = URL.createObjectURL(rec.file), el = document.createElement('video');
        el.muted = true; el.playsInline = true; el.preload = 'auto'; el.src = url;
        decoder = { rec, url, el }; el.load();
      }
      await waitFor(decoder.el, () => decoder.el.readyState >= 2, signal);
      if (aborted(signal)) throw cancelled();
      return decoder.el;
    };
    const seek = async (rec, local, signal) => {
      const el = await decoderFor(rec, signal);
      const target = FM.frameSeekTarget(local, rec.duration || el.duration);
      if (Math.abs(el.currentTime - target) >= 1e-4 || el.seeking || el.readyState < 2) {
        el.currentTime = target;
        await waitFor(el, () => !el.seeking && el.readyState >= 2
          && Math.abs(el.currentTime - target) < 1e-3, signal);
      }
      if (aborted(signal)) throw cancelled();
      return el;
    };
    const makeCanvas = (w, h) => {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h; return cv;
    };
    const region = (plan, from, to) => {
      if (to <= from) return null;
      const {W, H, dir} = plan;
      if (dir === 0) return [0, from, W, to - from];
      if (dir === 1) return [0, H - to, W, to - from];
      if (dir === 2) return [from, 0, to - from, H];
      return [W - to, 0, to - from, H];
    };
    const sample = async (scene, plan, rec, at, source, rg, signal) => {
      const ps = plan.ps;
      // A legacy vector mask is composited in layer-local space. A strip-sized scratch
      // viewport changes the mask edge (especially with feather), so redraw its whole
      // historical picture and copy only the crossed strip into the accumulator.
      if (plan.layer.mask && plan.layer.mask.enabled) rg = null;
      const x = rg ? Math.max(0, Math.floor(rg[0]) - 2) : 0;
      const y = rg ? Math.max(0, Math.floor(rg[1]) - 2) : 0;
      const w = rg ? Math.min(plan.W - x, Math.ceil(rg[0] + rg[2]) - x + 2) : plan.W;
      const h = rg ? Math.min(plan.H - y, Math.ceil(rg[1] + rg[3]) - y + 2) : plan.H;
      if (source.width < w || source.height < h) {
        source.width = Math.max(source.width, w); source.height = Math.max(source.height, h);
      }
      source.__fmRS = ps; source.__fmOX = x / ps; source.__fmOY = y / ps;
      const local = FM.layerLocalTime(plan.layer, at);
      if (local == null) {
        source.getContext('2d').clearRect(0, 0, source.width, source.height);
        return {x, y};
      }
      const el = await seek(rec, local, signal);
      if (aborted(signal)) throw cancelled();
      const sourceMedia = new Map([[plan.id, Object.assign({}, rec, {el})]]);
      FM.renderTimeWarpVideoSource(source.getContext('2d'), scene, plan.layer, at, sourceMedia);
      return {x, y};
    };
    const build = async (scene, plan, rec, signal) => {
      const acc = makeCanvas(plan.W, plan.H), ac = acc.getContext('2d');
      const source = makeCanvas(plan.W, plan.H);
      const span = plan.dir < 2 ? plan.H : plan.W;
      try {
        const previous = active && active.rec === rec && active.plan.baseKey === plan.baseKey
          && plan.t > active.plan.t && plan.t - active.plan.t <= 1.5 / plan.fps
          && plan.u >= active.plan.u ? active.plan : null;
        if (previous) ac.drawImage(active.canvas, 0, 0);
        if (plan.mode === 1) {
          if (!previous) {
            const firstAt = Math.min(plan.t, Math.ceil((plan.cycleStart - 1e-9) * plan.fps) / plan.fps);
            await sample(scene, plan, rec, firstAt, source, null, signal);
            ac.drawImage(source, 0, 0);
          }
        } else if (previous) {
          // Sequential export/playback adds only its new strip. A cold jump runs the loop below.
          const rg = region(plan, previous.u * span, plan.u * span);
          if (rg) {
            const origin = await sample(scene, plan, rec, plan.t, source, rg, signal);
            ac.drawImage(source, rg[0] - origin.x, rg[1] - origin.y, rg[2], rg[3], ...rg);
          }
        } else {
          let prior = 0;
          const first = Math.ceil((plan.cycleStart - 1e-9) * plan.fps);
          const through = Math.floor((Math.min(plan.t, plan.cycleStart + plan.dur) + 1e-9) * plan.fps);
          for (let frame = first; frame <= through; frame++) {
            if (aborted(signal)) throw cancelled();
            const at = Math.min(plan.t, frame / plan.fps);
            const next = Math.min(plan.u, Math.max(0, (at - plan.cycleStart) / plan.dur));
            const rg = region(plan, prior * span, next * span);
            if (rg) {
              const origin = await sample(scene, plan, rec, at, source, rg, signal);
              ac.drawImage(source, rg[0] - origin.x, rg[1] - origin.y, rg[2], rg[3], ...rg);
            }
            prior = next;
          }
          if (prior < plan.u - 1e-9) {
            const rg = region(plan, prior * span, plan.u * span);
            if (rg) {
              const origin = await sample(scene, plan, rec, plan.t, source, rg, signal);
              ac.drawImage(source, rg[0] - origin.x, rg[1] - origin.y, rg[2], rg[3], ...rg);
            }
          }
        }
        if (aborted(signal)) throw cancelled();
        return acc;
      } catch (e) { release(acc); throw e; }
      finally { release(source); }
    };
    const state = (scene, t, scale) => {
      const plans = FM.timeWarpVideoPlans(scene, t, media, scale);
      const plan = plans[0] || null, rec = plan && media.get(plan.id);
      return {plan, rec, key: plan && plan.key};
    };
    const prepare = (scene, t, scale) => {
      if (disposed) return Promise.reject(cancelled());
      const {plan, rec, key} = state(scene, t, scale);
      if (!plan) return Promise.resolve(null);
      if (active && active.key === key && active.rec === rec)
        return Promise.resolve(new Map([[plan.id, active]]));
      if (pending && pending.key === key && pending.rec === rec) return pending.promise;
      if (pending) pending.controller.abort();
      const controller = new AbortController(), job = {key, rec, controller, promise:null};
      pending = job;
      job.promise = chain = chain.catch(() => {}).then(async () => {
        if (aborted(controller.signal)) throw cancelled();
        const canvas = await build(scene, plan, rec, controller.signal);
        if (active && active.canvas !== canvas) release(active.canvas);
        active = {key, rec, plan, canvas, t:plan.t};
        return new Map([[plan.id, active]]);
      }).finally(() => { if (pending === job) pending = null; });
      return job.promise;
    };
    return {prepare, current(scene, t, scale) {
      const {key, rec, plan} = state(scene, t, scale);
      return active && plan && active.key === key && active.rec === rec
        ? new Map([[plan.id, active]]) : null;
    }, dispose() {
      if (disposed) return;
      disposed = true; if (pending) pending.controller.abort();
      if (active) release(active.canvas);
      active = null; closeDecoder();
    }};
  };
})(window.FM);
