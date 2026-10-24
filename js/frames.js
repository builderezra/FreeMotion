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
  /* stop (optional, #663): asked before each re-seek. When it says yes the element is no longer ours (Play
     took it), so a miss is not retried: the 'seeked' was Play's, and seeking back would move his clip. */
  function seekAndPaint(el, t, stop) {
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
          if (!emptied && !(stop && stop()) && Math.abs((el.currentTime || 0) - t) > 0.2 && tries < 2) { tries++; attempt(); return; }
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
      // account: made under the preview frame account (#860 hunt #6, FM.previewFrameShare below), so the account may thin or give it back
      // ask: the maxBytes it was built under, so the export can tell a shared preview cache from a full one (#860 hunt #6, F4)
      rec.frameCache = { fps, effFps, frames, count, decoded: ok, duration: dur, scaled: scaled, w: tw, h: th, account: !!opts.account, ask: opts.maxBytes || 0 };
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

  /* #860 hunt #6: ONE BYTE ACCOUNT FOR EVERY PREVIEW FRAME CACHE (Reverse, frame-blend slow motion, a Match Grade or Time Echo
   * reference). FM.frameCacheLimits().maxBytes used to be handed to EACH clip, so five reversed clips held five times it (about
   * 1.9 GB of ImageBitmaps on his PC at 384 MB each), and nothing gave any of it back until a clip stopped being reversed or the
   * project was left. There is now one TOTAL for all of them (FM.previewFrameTotal: four of the per-clip figure on a desktop
   * with the full 384 MB, 1.5 GiB, the same total the export keeps, js/exporter.js EXPORT_BYTES; the per-clip figure itself
   * everywhere else, a phone above all, where running out of memory is a crash), and no one cache takes more than the per-clip
   * figure, as before. FM.ensureReverseCache (js/app.js) asks here how much a new cache may take. So on his PC one to four
   * reversed clips each get exactly what they always did, and only a fifth starts the sharing. The export is not in this
   * account: it builds its own full-size copies under its own total (js/exporter.js prepareCaches, #860 (1)) and frees them
   * when the file is done.
   *
   * THE RULE.
   *   1. The space is split between what is alive: every record the open scene needs a cache for (reversed, or frame-blend at a
   *      slow or ramped speed, the test FM.requestPlay uses; or measured at other moments, FM.matchGradeFrameLayers), every
   *      record holding a preview cache or building one that cannot be given back (2a says which can), and the asker.
   *      fair = total / that count, never more than the per-clip figure. A spare that 2a may give back takes no share: it is
   *      nobody's (an undone Reverse or a Match Grade turned off leaves one), so it cannot halve what a clip that needs a
   *      cache gets (review F3).
   *   2. A new cache takes fair. When the room left is short of fair:
   *      a. first give back the caches the scene no longer needs, least recently DRAWN first (the compositor stamps
   *         rec._fcDrawnAt each time it draws from a cache, and a build stamps it too), never one drawn in the last STALE_MS,
   *         one under the playhead, or one still building. Only as many as it takes to reach fair;
   *      b. then THIN the caches that hold more than fair, in place: every n-th bitmap is kept, the rest are closed (as
   *         FM.clearFrameCache closes them), and the effective fps is spread again over the clip (the compositor maps time to a
   *         frame through effFps, so the clip keeps playing, with fewer frames).
   *   3. Room nobody else is about to take is LENT: the ask gets the room left divided between itself and the other clips that
   *      need a cache and have none yet, when that is more than fair, still never more than the per-clip figure. A 10 s clip
   *      beside a 2 s one is not held to half because the short one cannot use its half (review F2).
   *   4. A floor of a quarter of fair covers the cases 2b cannot reach (another clip's build still in flight with a larger ask,
   *      or a motion track's cache), so a new clip always gets a usable cache; the total can then run over by that quarter.
   *   Only caches the account made itself (fc.account, which FM.buildFrameCache copies from the opts FM.ensureReverseCache
   *   passes) are ever thinned or given back. A motion track's cache (js/tracker.js) is counted but never touched: the tracker
   *   reads it frame by frame while it runs, and clears it itself when it is done. When a track reuses a preview cache (at 24 fps
   *   or less the two match), the tracker takes it over (account off), so the account cannot close a bitmap it is reading.
   *
   * WHY IT CANNOT THRASH. Nothing the scene still needs is ever given back, so the account never causes a decode. Giving back a
   * needed cache would: FM.requestPlay rebuilds every missing cache before it plays, so with six reversed clips and room for five,
   * each Play would rebuild the one given back last time, and that rebuild would give back the next one, every Play, for ever.
   * A clip past what the total holds makes all of them a little choppier instead, once, with no decode. What 2a gives back is
   * nobody's any more: FM.requestPlay does not build it, and a Match Grade or Time Echo reference is counted as needed in 1.
   * Thinning only ever happens when a new cache is asked for, never per frame, so it cannot loop either.
   * Returns the byte budget for FM.buildFrameCache's maxBytes: never 0, which that function reads as no limit. */
  const STALE_MS = 5000;
  function fcBytes(fc) { return (fc && fc.w > 0 && fc.h > 0 && fc.count > 0) ? fc.w * fc.h * 4 * fc.count : 0; }
  function needsFrameCache(l) {
    if (!l || l.type !== 'video') return false;
    if (l.reversed) return true;
    if (!l.frameBlend) return false;
    const ramped = (typeof FM.isAnimated === 'function') ? FM.isAnimated(l.speed) : !!(l.speed && typeof l.speed === 'object');
    return ramped || (l.speed || 1) < 1;
  }
  // Keep `keep` of the cache's frames, evenly over the clip, and close the others. Frame j of the result is the source frame
  // nearest j / keep of the way through, the same place a fresh build of `keep` frames would have taken it from.
  function thinFrameCache(fc, maxBytes) {
    const per = fc.w * fc.h * 4, n = fc.count;
    if (!(per > 0) || !(n > 1)) return;
    const keep = Math.max(1, Math.floor(maxBytes / per));
    if (keep >= n) return;
    const old = fc.frames || [], next = new Array(keep), kept = new Uint8Array(n);
    let ok = 0;
    for (let j = 0; j < keep; j++) {
      const i = Math.min(n - 1, Math.round(j * n / keep));
      next[j] = old[i] || null;
      kept[i] = 1;
      if (next[j]) ok++;
    }
    for (let i = 0; i < n; i++) { const b = old[i]; if (!kept[i] && b && b.close) { try { b.close(); } catch (e) {} } }
    fc.frames = next;
    fc.count = keep;
    fc.decoded = ok;
    fc.effFps = keep / Math.max(1e-6, fc.duration || 0);
    fc.thinned = true;
  }
  FM._thinFrameCache = thinFrameCache;   // suite seam (#860 hunt #6)
  // The one total (rule above): four of the per-clip figure on a fine-pointer machine with the full 384 MB, the figure itself elsewhere.
  FM.previewFrameTotal = function (limits) {
    const per = (limits && limits.maxBytes) || 0;
    const fine = !window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    return (fine && per >= 384 * 1024 * 1024) ? per * 4 : per;
  };
  FM.previewFrameShare = function (rec, limits) {
    const per = (limits && limits.maxBytes) || 0;
    const total = FM.previewFrameTotal(limits);
    if (!(per > 0) || !FM.media || typeof FM.media.all !== 'function') return per;
    const store = FM.media.all() || {};
    const now = performance.now();
    const layers = (FM.scene && FM.scene.layers) || [], t = FM.time;
    let mg = null;
    try { mg = FM.matchGradeFrameLayers ? FM.matchGradeFrameLayers(FM.scene) : null; } catch (e) { mg = null; }
    const needed = new Set([rec]), atHead = new Set();
    for (const l of layers) {
      if (!l || l.type !== 'video') continue;
      const m = FM.media.get(l.id);
      if (!m || m._released) continue;
      if (needsFrameCache(l) || (mg && mg[l.id])) needed.add(m);
      if (l.visible !== false && t >= l.start && t <= l.start + l.duration) atHead.add(m);
    }
    const holders = new Set();
    for (const k in store) {
      const m = store[k];
      if (!m || m === rec || m._released) continue;
      if ((m.frameCache && m.frameCache.scaled) || (!m.frameCache && m._fcAsk > 0)) holders.add(m);
    }
    const bytesOf = m => (m.frameCache ? fcBytes(m.frameCache) : (m._fcAsk || 0));
    const spareOk = m => m.frameCache && m.frameCache.account && !needed.has(m) && !atHead.has(m) && !m._building && now - (m._fcDrawnAt || 0) >= STALE_MS;
    const live = new Set(needed);
    holders.forEach(m => { if (!spareOk(m)) live.add(m); });   // 1: a spare that may be given back takes no share
    let held = 0;
    holders.forEach(m => { held += bytesOf(m); });
    const fair = Math.min(per, Math.floor(total / live.size));
    if (total - held < fair) {
      const spare = Array.from(holders).filter(spareOk).sort((a, b) => (a._fcDrawnAt || 0) - (b._fcDrawnAt || 0));
      for (const m of spare) {
        if (total - held >= fair) break;
        held -= bytesOf(m);
        FM.clearFrameCache(m);
        holders.delete(m);
      }
    }
    if (total - held < fair) {
      holders.forEach(m => {
        const fc = m.frameCache;
        if (!fc || !fc.scaled || !fc.account || m._building || fcBytes(fc) <= fair) return;
        held -= fcBytes(fc);
        thinFrameCache(fc, fair);
        held += fcBytes(fc);
      });
    }
    // 3: lend the room the other clips still waiting for a cache will not take
    let pending = 0;
    needed.forEach(m => { if (m === rec || (!m.frameCache && !m._building && !(m._fcAsk > 0))) pending++; });
    const room = total - held;
    const share = Math.min(per, Math.max(fair, Math.floor(room / Math.max(1, pending))));
    return Math.max(1, Math.floor(fair / 4), Math.min(share, room));
  };

  // Small filmstrip of DISTINCT frames for a clip's timeline bar (AM-style). Cheap + cached on the
  // media record (m.stripFrames). Video: seek to `count` evenly-spaced times. Image: a single frame.
  // SERIALIZED through one global queue so a project with many video clips doesn't seek N <video>s at
  // once (that storm spikes CPU/memory + fights the preview compositor for each element).
  let _stripQueue = Promise.resolve();
  /* #663 (the hunt's finding 1 and its refuter): A FILMSTRIP NEVER TAKES THE ELEMENT OF A CLIP THAT IS PLAYING.
     The strip steps the clip's OWN <video> eight times, and while it does FM.seekBusy is true, so every tick of playback
     pauses and mutes that element and stands down. The rows only ASK for a strip while paused, but a strip asked for then
     ran whenever its turn in the one queue came, Play or no Play: split a clip, press Play to check the cut, and the new
     tail half (a fresh record, no strip yet) went silent for the second or so its strip took, then restarted cold.
     So a strip waits for the pause in the queue, BEFORE it takes the element's seek lock (waiting inside the lock would
     hold up a reversed clip's frame cache for the whole of playback), and one already under way when Play is pressed
     stops after the frame in hand: its partial frames are closed, muted is put back, the element's time is left to the
     transport, nothing is stored, and it starts again from the first frame at the next pause. So the promise a row holds
     settles only on a finished strip (or a released clip), and no caller has to ask twice. An image has nothing to seek
     and never waits. */
  const STRIP_ABORTED = {};
  const STRIP_PLAY_POLL_MS = 250;
  // #663: the one question every guard below asks — may playback be driving this clip's element right now?
  function stripMustWait(m) { return m.kind !== 'image' && !!FM.playing && !m._released; }
  function stripWaitsForPause(m) {
    if (!stripMustWait(m)) return null;
    return new Promise(function (go) {
      (function poll() { if (!stripMustWait(m)) go(); else setTimeout(poll, STRIP_PLAY_POLL_MS); })();
    });
  }
  function stripRun(m, count) {
    return Promise.resolve(stripWaitsForPause(m))
      .then(function () { return seekLock(m, function () { return _extractStrip(m, count); }); })
      .then(function (r) {
        if (r !== STRIP_ABORTED) return r;
        // never straight round again: the next try is a timer away, so no slip in the waits can spin the page
        return new Promise(function (go) { setTimeout(go, STRIP_PLAY_POLL_MS); }).then(function () { return stripRun(m, count); });
      });
  }
  FM.buildClipStrip = function (m, count) {
    if (!m || !m.el || m._stripBuilding || m.stripFrames !== undefined) return Promise.resolve(m && m.stripFrames);
    // global queue (one strip at a time across clips) + the per-element seek lock (never interleave
    // with a frame-cache build seeking the same <video> — that corrupted reload-time caches)
    const p = _stripQueue.then(function () { return stripRun(m, count); });
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

  /* WHERE THE STRIP PUTS THE ELEMENT BACK (#202 H3, the 22 Oct hunt's refuter). A scrub that arrived while the strip held this element
     was dropped (FM.seekBusy), so the time it had before the strip is stale: the paused preview then showed the strip's last frame, or
     an old one, until the next scrub. Put it where the playhead now wants it, as the preview's own seek would (FM.frameSeekTarget),
     and only this element, inside its own seek lock, so an export (which holds the lock for the whole file) cannot be touched. While
     playing, or with no layer of this clip under the playhead, the old time stands.
     #202 S1 (the pre-ship review and its refuter, 22 Oct): where the playhead now wants it is FM.playheadSeekTarget (js/app.js), the
     ONE answer the cold-clip prime's put-back reads too, so the two cannot drift apart. It used to be worked out here a second time:
     from the first layer of this record whether or not that layer was under the playhead, and with the element's own duration as a
     fallback the preview's seek never uses. Asked only if it exists, so this file never depends on app.js having loaded. */
  function stripRestoreTarget(m, wasTime) {
    if (FM.playing || typeof FM.playheadSeekTarget !== 'function') return wasTime;
    const t = FM.playheadSeekTarget(m);
    return t == null ? wasTime : t;
  }

  async function _extractStrip(m, count) {
    if (!m || !m.el || m._stripBuilding || m.stripFrames !== undefined) return m && m.stripFrames;
    // Released while it waited in the queue — nobody can draw it now, so hand the queue straight on (queue 690).
    if (m._released) return undefined;
    count = count || 8;
    /* #202 N1 (the 22 Oct hunt's refuter): the flag that makes FM.seekBusy true is set when the strip starts DRIVING the element,
       not while it only waits for a clip to become decodable (up to 3 s on a slow phone): every scrub in that time was dropped,
       and if a seek is what loads an iPhone clip, nothing could load it. Re-entry stays shut by the queue, the element's seek lock
       and stripFrames. */
    if (m.kind === 'image') m._stripBuilding = true;
    try {
      if (m.kind === 'image') {
        const opt = stripSize(m.el, m);
        try { m.stripFrames = [opt ? await createImageBitmap(m.el, opt) : await createImageBitmap(m.el)]; } catch (e) { m.stripFrames = []; }
      } else {
        const el = m.el;
        // #663: Play may have started while this waited for the element's seek lock — back to the queue's wait for the pause
        if (stripMustWait(m)) return STRIP_ABORTED;
        if (el.readyState < 2) await waitDecodable(el);   // wait for it to become decodable (don't spin / retry forever)
        // #663: …or while it waited for the clip to decode (on an iPhone it may be Play's own seek that decodes it)
        if (stripMustWait(m)) return STRIP_ABORTED;
        m._stripBuilding = true;   // #202 N1: from here the strip drives the element's seeks
        const frames = [];
        let played = false;
        if (el.readyState >= 2 && !m._released) {
          const dur = (isFinite(m.duration) && m.duration > 0) ? m.duration : (el.duration || 1);
          const wasTime = el.currentTime, wasMuted = el.muted; el.muted = true;
          const opt = stripSize(el, m);
          for (let i = 0; i < count; i++) {
            if (m._released) break;   // released mid-strip (queue 690): every seek left would wait on nothing
            if (stripMustWait(m)) { played = true; break; }   // #663: Play was pressed — the element is playback's now
            await seekAndPaint(el, Math.min((i + 0.5) * dur / count, Math.max(0, dur - 0.001)), () => stripMustWait(m));
            if (stripMustWait(m)) { played = true; break; }   // #663: Play came during the seek, so no bitmap for a strip being thrown away
            try { frames.push(opt ? await createImageBitmap(el, opt) : await createImageBitmap(el)); } catch (e) {}
          }
          // #663: never write the time of an element that is playing — the transport owns it, and the old time is stale
          if (!m._released && !FM.playing) { try { el.currentTime = stripRestoreTarget(m, wasTime); } catch (e) {} }
          el.muted = wasMuted;
        }
        if (m._released || played) {   // a strip of a clip nobody can see any more, or one Play cut short — give its bitmaps straight back
          frames.forEach(f => { if (f && f.close) try { f.close(); } catch (e) {} });
          return m._released ? undefined : STRIP_ABORTED;   // #663: cut short, nothing is stored, so it is built again whole after the pause
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
