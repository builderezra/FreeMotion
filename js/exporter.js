/* FreeMotion — Export pipeline.
 * Deterministic, frame-by-frame render -> H.264 (WebCodecs) -> MP4 (mp4-muxer).
 * Not real-time: we seek each source video to the exact frame, composite, and encode,
 * so output is correct regardless of machine speed. Reverse + reversed audio handled here.
 * This same frame-stepping path is the foundation for slow-mo/interpolation later.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  /* Where the project's frame lands inside a differently-shaped output (queue 141). Pure, and exposed,
   * so the arithmetic can be tested without running an encoder — an export is the one operation you
   * cannot casually re-run to check, so its maths should not need one.
   * CONTAIN: the whole frame always fits, centred, with bars on the two spare sides. Never cover/crop —
   * cropping an export silently discards part of what someone made. */
  FM.exportFitRect = function (pw, ph, ow, oh) {
    pw = Math.max(1, pw || 1); ph = Math.max(1, ph || 1);
    ow = Math.max(1, ow || 1); oh = Math.max(1, oh || 1);
    const k = Math.min(ow / pw, oh / ph);
    const dw = pw * k, dh = ph * k;
    return {
      dx: (ow - dw) / 2, dy: (oh - dh) / 2, dw: dw, dh: dh,
      letterboxed: Math.abs(dw - ow) > 0.5 || Math.abs(dh - oh) > 0.5,
    };
  };


  /* DON'T LOSE A RENDER TO A STRAY GESTURE (queue 47, the cheap half).
   *
   * An export holds everything in page memory and only becomes a file at the very end, so a refresh, a
   * back swipe or a closed tab mid-render destroys minutes of work with no warning at all. Real
   * crash-RESUME is a much larger job — the muxer's sample tables cannot be rehydrated, so it needs a
   * segmented redesign — but the commonest way a render dies is not a crash, it is a hand.
   *
   * Registered ONCE and gated on FM._exporting rather than added and removed around each export: an
   * arm/disarm pair has a failure mode where a thrown export leaves the guard armed forever, and a
   * browser that questions every single reload would be a far worse bug than the one being fixed.
   * The message is ignored by modern browsers (they show their own wording) — setting returnValue is
   * what actually triggers the prompt. */
  window.addEventListener('beforeunload', function (e) {
    if (!FM._exporting) return;
    e.preventDefault();
    e.returnValue = 'An export is still rendering. Leaving now loses it.';
    return e.returnValue;
  });

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Hand the finished MP4 to the OS share sheet where we can (Save to Photos / AirDrop / send straight
  // to an app) — on a phone an <a download> lands the file somewhere awkward, and this IS a mobile-first
  // PWA. Falls back to the plain download whenever sharing isn't available or isn't permitted:
  //   • no Web Share for files (desktop Firefox/Chrome, older Safari) → canShare() is false
  //   • navigator.share needs TRANSIENT ACTIVATION, and a long export can outlive the tap that started
  //     it → share() rejects with NotAllowedError, so we quietly download instead
  // AbortError is the one case we do NOT fall back on: the user saw the sheet and dismissed it, so
  // silently downloading anyway would be the opposite of what they asked for.
  // Takes the finished file as a BLOB (see createMp4Sink). It used to take the muxer's ArrayBuffer and
  // do `new Blob([buffer])` here, which meant that at the moment of delivery the whole movie existed
  // TWICE — once on the JS heap, once in blob storage. A blob in, a blob out: no copy. (#47)
  async function deliver(blob, name) {
    let file = null;
    try { file = new File([blob], name, { type: 'video/mp4' }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    }
    download(blob, name);
    return 'downloaded';
  }

  /* ---- streaming MP4 sink: keep the finished file OFF the JS heap ---------------------------- (#47)
   *
   * The muxer used to write into an ArrayBufferTarget with fastStart:'in-memory', which by definition
   * holds the ENTIRE movie in one JS ArrayBuffer so the moov atom can be placed at the front. At the
   * exporter's own bitrate (min(80 Mb/s, W*H*fps*0.12)) a 1080p30 export costs ~0.9 MB per second of
   * footage, so 20 min = ~1.07 GB and 60 min = ~3.2 GB against a mobile tab ceiling of roughly 1-2 GB.
   *
   * With fastStart:false the moov goes at the END, so the writes become essentially sequential and we
   * can hand them off as they are produced. This sink is what mp4-muxer's StreamTarget calls:
   *
   *   onData(data, position)  — position is NOT decoration. The muxer says out loud that ignoring it
   *                             breaks the output, and it really does patch earlier bytes: at finalize
   *                             it rewrites the mdat box header at the front of the file once the
   *                             payload length is known, long after those bytes were streamed out.
   *
   * So writes are kept WITH their offsets. The common case (an append at the current end) goes into a
   * small RAM buffer that is folded into a Blob every few MB — Blob storage is disk-backed, so the
   * finished file lives on disk, not on the heap, and peak JS memory is bounded by FOLD_BYTES rather
   * than by the length of the export. Anything that lands before the end is recorded as a patch in
   * ARRIVAL order and spliced in at finish() with Blob.slice(), which is a cheap view, not a copy.
   * Later writes win, so a byte written twice ends up with the value written last.
   *
   * COST: no fastStart means the file is not "progressive" — a player must read the tail before it can
   * start. For a file you download and open locally that is a non-issue; for one streamed from a URL it
   * would mean no play-while-loading.
   */
  const FOLD_BYTES = 4 << 20;   // heap held between folds; 4 MB is far below any chunk the muxer emits

  function createMp4Sink(type, foldBytes) {
    const FOLD = foldBytes || FOLD_BYTES;
    const parts = [];          // Blobs already folded off the heap, in file order
    let pending = [];          // Uint8Arrays not yet folded — this is the only heap-resident part
    let pendingBytes = 0;
    let length = 0;            // length of the contiguous region we have written so far
    const patches = [];        // { pos, data } in ARRIVAL order — a later write must overwrite an earlier one
    let peakPending = 0, patchesSeen = 0;   // patchesSeen survives finish(); patches[] does not

    function fold() {
      if (!pending.length) return;
      parts.push(new Blob(pending));   // copies into blob storage; the Uint8Arrays are then garbage
      pending = []; pendingBytes = 0;
    }
    function append(u8) {
      if (!u8.byteLength) return;
      pending.push(u8); pendingBytes += u8.byteLength; length += u8.byteLength;
      if (pendingBytes > peakPending) peakPending = pendingBytes;
      if (pendingBytes >= FOLD) fold();
    }

    return {
      // Bound to `this`-free so it can be handed straight to StreamTarget. Declared with two named
      // params because StreamTarget rejects an onData of arity < 2 (its way of catching code that
      // silently drops `position`).
      onData(data, position) {
        const u8 = data.slice();   // own our copy: the muxer reuses its scratch buffers
        if (position === length) { append(u8); return; }                       // the overwhelmingly common case
        if (position > length) { append(new Uint8Array(position - length)); append(u8); return; }  // hole → zero-fill so offsets stay true
        const end = position + u8.byteLength;
        if (end <= length) { patches.push({ pos: position, data: u8 }); patchesSeen++; return; }   // wholly behind the end (the mdat header patch)
        // straddles the end: patch the part that overlaps, append the part that extends
        patches.push({ pos: position, data: u8.subarray(0, length - position) }); patchesSeen++;
        append(u8.subarray(length - position));
      },
      finish() {
        fold();
        let blob = new Blob(parts, { type: type });
        parts.length = 0;
        for (const p of patches) {
          const end = p.pos + p.data.byteLength;
          blob = new Blob([blob.slice(0, p.pos), p.data, blob.slice(Math.min(end, blob.size))], { type: type });
        }
        patches.length = 0;
        return blob;
      },
      get length() { return length; },
      get patchCount() { return patchesSeen; },     // NOT patches.length — finish() empties that, which
                                                    // would make any "it took the patch path" assertion
                                                    // read 0 and pass for the wrong reason
      get peakHeapBytes() { return peakPending; },
    };
  }
  // exposed for tests/_mp4sink.html, which checks the assembly against a dense reference buffer
  FM._createMp4Sink = createMp4Sink;

  /* WHEN A SEEK DOES NOT LAND, THE EXPORT SHIPS THE WRONG FOOTAGE AND USED TO SAY NOTHING (queue 47,
   * v11.68). The 1500ms below is a safety net, and when it fires this resolves anyway — so the
   * compositor draws whatever frame the element still happens to be showing. That is a DUPLICATE of a
   * frame you already have, sitting in the file as if it were the real one.
   * This is not hypothetical: the net was raised from 250ms to 1500ms precisely because it "dropped
   * frames on big 4K seeks" (#15), which is this failure, observed, and fixed by making the window
   * wider rather than by noticing when it is still missed. A wider window lowers the odds; it cannot
   * reach zero, and a slow phone or a long 4K clip is exactly where it will not.
   * So the misses are COUNTED and named, on the same terms as the audio drops: it cannot make a seek
   * land, but it can stop the export quietly claiming footage it never rendered. */
  let _staleSeeks = [];

  function seekVideo(m, time, label) {
    return new Promise(res => {
      const el = m.el;
      if (!el || el.error || el.readyState === 0) { res(); return; }   // undecodable / not ready → seek can never fire; don't burn 1500ms × every frame (export looked hung for 20+ min)
      // inside the frame, not on its edge — on the edge a third of a 30 fps clip's frames showed the
      // one before (queue 690, see FM.frameSeekTarget in js/frames.js)
      const target = FM.frameSeekTarget ? FM.frameSeekTarget(time, m.duration)
        : Math.min(Math.max(time, 0), Math.max(0, (m.duration || 0) - 0.001));
      /* Already on the frame (a no-op seek to a clamped-frozen last frame emits no 'seeked') — but only
         if the frame is actually THERE. currentTime reports a seek's target the moment it is written,
         so an element still seeking, or with no frame decoded, read as "already there" and the frame
         was drawn from nothing: black in the file (queue 690 — the filmstrip's last write puts the
         element back where it was, and that write is still landing when the export takes over). */
      if (Math.abs(el.currentTime - target) < 1e-4 && !el.seeking && el.readyState >= 2) { res(); return; }
      let done = false, netTimer = 0;
      /* THE NET IS CANCELLED WHEN THE SEEK LANDS, which it never used to be. Found by a mutation run,
         not by reading: a landed seek left its 1500ms timer alive, so on a long export every frame
         parked a live timer, and — the part that actually bites — a timer from one export could fire
         during the NEXT one and report a repeated frame on a render that was perfectly clean. A
         diagnostic that cries wolf stops being read, which is how the last one died. */
      const finish = () => { if (done) return; done = true; clearTimeout(netTimer); el.removeEventListener('seeked', onSeeked); res(); };
      /* A 'seeked' that arrives while the element is STILL seeking is somebody else's — an earlier seek
         whose event was already queued when this one was written (queue 690). Taking it resolved this
         frame mid-seek, and the compositor skips a video at readyState 1 in an export: a black frame.
         Ours has not landed until `seeking` is false. The 1500 ms net below still bounds the wait. */
      const onSeeked = () => { if (el.seeking) return; finish(); };
      el.addEventListener('seeked', onSeeked);
      try { el.currentTime = target; } catch (e) { finish(); }
      // safety net only — export is offline, so give a slow/large seek time to land the right frame
      // before giving up (was 250ms, which dropped frames on big 4K seeks) (#15)
      netTimer = setTimeout(() => {
        _staleSeeks.push((label || 'a video layer') + ' at ' + target.toFixed(2) + 's');
        finish();
      }, 1500);
    });
  }

  // Seam for the suite (queue 690): the two conditions above only bite in a race the export cannot be made to lose
  // on cue, so the test drives this function directly — a seek still under way, and a stray 'seeked' — and checks
  // what the element is doing at the moment it answers.
  FM._exportSeekVideo = seekVideo;

  function resetSeekWatch() { _staleSeeks = []; FM._lastStaleSeeks = null; }

  /* Said once at the end, not per frame — a 4K export that misses half its seeks would otherwise
     produce hundreds of identical toasts. The console gets the full list; the toast gets the count,
     because the count is the part that changes what he does about it. */
  function reportSeekWatch() {
    FM._lastStaleSeeks = _staleSeeks.slice();   // the suite reads this rather than scraping toasts
    if (!_staleSeeks.length) return;
    console.warn('[export] ' + _staleSeeks.length + ' frame(s) were rendered before the video reached the '
      + 'right position, so they repeat the frame before them:\n  · ' + _staleSeeks.join('\n  · '));
    if (FM.toast) FM.toast(_staleSeeks.length + ' frame' + (_staleSeeks.length === 1 ? '' : 's')
      + ' could not be read from the video in time and repeat the frame before — see the console', 6000);
  }

  /* THE EXPORT OWNS EVERY CLIP'S ELEMENT FROM ITS FIRST FRAME TO ITS LAST (queue 690).
   * The timeline draws each clip's filmstrip by seeking the clip's OWN <video> eight times, and that
   * happens after every import, duplicate, paste or replace — and for every clip, one after another,
   * each time a project is opened. frames.js queues its own users on the element's seek lock, and
   * the preview stands down for them; the exporter took no part, so pressing Export while strips were
   * still being drawn made the two fight over the element. Measured: the first 16-22 frames of a 3 s
   * file came out BLACK, with nothing said — the 1500 ms net never fired, because a 'seeked' did
   * arrive; it was just the strip's. There is a built-in route straight into it, too: Home → a
   * project's menu → Export video… opens the project (queueing every strip) and the dialog 260 ms later.
   * So the export joins the queue: it waits for whatever is using each element to finish, then holds
   * every element until the file is done. A strip that asks in between is drawn afterwards — nothing
   * is lost, it is just late, behind a screen that is covering the timeline anyway.
   * Returns the release; call it in a finally. A Cancel while waiting is honoured here. */
  async function holdVideoElements(scene, onStatus) {
    const recs = [];
    scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (m && m.el && recs.indexOf(m) < 0) recs.push(m);   // one record can back several layers — hold it once
    });
    if (!FM.holdSeekLock || !recs.length) return function () {};
    const holds = recs.map(m => FM.holdSeekLock(m));
    const release = function () { holds.forEach(h => h.release()); };
    let got = false, said = false;
    const all = Promise.all(holds.map(h => h.ready)).then(() => { got = true; });
    while (!got) {
      if (FM._exportCancel) { release(); throw new Error('CANCELLED'); }
      await Promise.race([all, new Promise(r => setTimeout(r, 100))]);
      // said only if it is really waiting — the ordinary case, nothing drawing, never shows it
      if (!got && !said && onStatus) { said = true; onStatus('Finishing the timeline thumbnails…'); }
    }
    return release;
  }

  async function seekAllVideos(scene, t) {
    const ps = [];
    scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const local = FM.layerLocalTime(layer, t);
      if (local == null) return;
      const m = FM.media.get(layer.id);
      if (m) ps.push(seekVideo(m, local, layer.name || layer.type || layer.id));
    });
    /* Simple 2.7 (#1122, DESIGN §12.1): a clip in a transition, outside its own window, is seeked for its picture (its handle; a held
       edge frame past the source). The paused preview reads the SAME list (FM.transitionSeeks), so the two cannot disagree. It is []
       on every project without a transition, and until Simple 2.7 ships it does not exist, so this adds nothing to any other export. */
    if (FM.transitionSeeks) FM.transitionSeeks(scene, t).forEach(s => { const m = FM.media.get(s.layer.id); if (m) ps.push(seekVideo(m, s.local, s.layer.name || s.layer.type || s.layer.id)); });
    await Promise.all(ps);
  }

  // ---- audio: render the timeline's audio (with reverse/trim) to one buffer ----
  /* THE SHAPE OF A CLIP'S RENDERED AUDIO, without rendering it (queue 916, clause 8). Split out of
   * makeClipBuffer so the mixer can know how long the clip's sound is — and so which of its samples
   * an export range actually needs — BEFORE paying for any of them. */
  function clipGeom(ab, layer) {
    const sr = ab.sampleRate;
    const startSample = Math.floor(layer.trimStart * sr);
    const availSec = Math.max(0, ab.duration - layer.trimStart);
    if (FM.isAnimated && FM.isAnimated(layer.speed)) {
      return { sr: sr, startSample: startSample, availSec: availSec, ramped: true,
               totalAdv: FM.layerSourceAdvance(layer, layer.duration),
               lenSamples: Math.max(1, Math.floor(layer.duration * sr)) };
    }
    // THROUGH speedAt (queue 451): a malformed prop is an object → NaN length → a clip silently dropped from the export mix
    const sp = FM.speedAt(layer, layer.start);
    /* A REVERSED clip spans the WHOLE clip (queue 916, clause 4). `min(duration, availSec / sp)` is
     * right for a forward clip — its sound simply ends when the audio does — but reading a reversed
     * clip backwards from the end of that span lined the sound up with the end of the AUDIO, while the
     * picture (FM.layerLocalTime: `trimStart + (duration - t) * sp`) lines up with the end of the CLIP.
     * With an audio track shorter than the video the backwards sound ran a full second early in the
     * measurement (0-1s played what the picture shows at 1-2s) and went quiet before the clip ended —
     * while the ramped branch, which already reads `totalAdv - adv`, was right. Spanning the clip puts
     * the static branch on the picture's mapping: a read past the audio's end falls off the source
     * array (`src[i0] || 0`) and is silence, at the START of the reversed clip. When the audio covers
     * the clip — every ordinary case — this is the same length as before, so those files are unchanged. */
    const lenSec = layer.reversed ? layer.duration : Math.min(layer.duration, availSec / sp); // timeline seconds this clip fills
    return { sr: sr, startSample: startSample, availSec: availSec, ramped: false, sp: sp,
             lenSamples: Math.max(1, Math.floor(lenSec * sr)) };
  }
  /* Output samples [k0, k1) of the clip's rendered audio — the whole clip when they are left out.
   * ONLY THE PART AN EXPORT USES (queue 916, clause 8): this used to build the clip end to end whatever
   * range was being exported, and then play one slice of it — so exporting one second of a project
   * with a four-minute song in it resampled all four minutes (measured 138 ms against 3 ms, and a
   * ~46 MB Float32 buffer per channel held for a one-second file, which is a real out-of-memory risk
   * on a phone). Each output sample is computed by the same formula as before, at the same index, so a
   * window is sample-for-sample the same as the matching stretch of the whole clip. */
  function makeClipBuffer(oac, ab, layer, g, k0, k1) {
    g = g || clipGeom(ab, layer);
    const sr = g.sr, startSample = g.startSample, availSec = g.availSec, lenSamples = g.lenSamples;
    const a0 = Math.max(0, Math.min(lenSamples - 1, k0 || 0));
    const a1 = Math.max(a0 + 1, Math.min(lenSamples, k1 == null ? lenSamples : k1));
    const out = oac.createBuffer(ab.numberOfChannels, a1 - a0, sr);
    if (g.ramped) {
      // SPEED RAMP: resample along the SAME integral the video frames use (FM.layerSourceAdvance),
      // so pitch/tempo follow the curve and audio stays sample-locked to the picture.
      const totalAdv = g.totalAdv;
      for (let ch = 0; ch < ab.numberOfChannels; ch++) {
        const src = ab.getChannelData(ch);
        const dst = out.getChannelData(ch);
        for (let i = a0; i < a1; i++) {
          const adv = FM.layerSourceAdvance(layer, i / sr);
          const posSec = layer.reversed ? (totalAdv - adv) : adv;
          if (posSec < 0 || posSec > availSec) continue;   // ran past the source → silence
          const pos = startSample + posSec * sr;
          const i0 = Math.floor(pos), frac = pos - i0;
          const a = src[i0] || 0, b = src[i0 + 1] || 0;
          dst[i - a0] = a + (b - a) * frac;
        }
      }
      return out;
    }
    // source advances sp× per output sample.
    /* Which SOURCE sample output sample `i` reads from — pulled out as a pure function so the suite
     * can assert it (the loop it came from is inside an async export nothing can call). It was the
     * only part of the reversed-audio path with no coverage at all: the one reversed test in the suite
     * checks the WAVEFORM DRAWING, not a single exported sample. Fractional on purpose — the caller
     * interpolates, which is what keeps a non-1x rate smooth.
     * Reversed reads from the end of the clip's span, so output 0 is the clip's LAST source sample
     * (or silence, when the audio ends before the clip does — see clipGeom). */
    const sp = g.sp;
    for (let ch = 0; ch < ab.numberOfChannels; ch++) {
      const src = ab.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = a0; i < a1; i++) {
        const pos = FM.srcSampleAt(startSample, i, lenSamples, sp, layer.reversed);
        const i0 = Math.floor(pos), frac = pos - i0;
        const a = src[i0] || 0, b = src[i0 + 1] || 0;
        dst[i - a0] = a + (b - a) * frac;                  // linear interp (smooth at non-1× rates)
      }
    }
    return out;
  }

  /* Exported so the suite can reach it — see the note at its call site above. Pure arithmetic:
   * forward output 0 is the clip's first source sample, reversed output 0 is its last. */
  FM.srcSampleAt = function (startSample, i, lenSamples, speed, reversed) {
    return reversed ? (startSample + (lenSamples - 1 - i) * speed) : (startSample + i * speed);
  };

  /* ═══ SAY IT WHERE HE IS LOOKING (queue 215) ═════════════════════════════════════════════════════
   * Every audio-loss report in this file used `FM.toast` alone — and `#toast` is z-index 60 against
   * `#export-overlay`'s 100, a full-screen dimmed and blurred panel that app.js raises BEFORE run() is
   * called and holds up for the entire export. **So all five warnings were painted behind the export.**
   * That is what Ezra's *"I don't think I got a message saying no audio"* actually was, and #215 read
   * it as proof of a sixth SILENT path and blamed the muxer — which #604 later measured, with the moov
   * and a decoded round-trip, and found healthy.
   * ⚠️ RAISING THE TOAST IS THE WRONG FIX, and the suite says so: a test from v5.11 requires every piece
   * of phone chrome to stay BELOW the modal layer, because it once measured a dialog whose Export and
   * Cancel both returned the sheet — a modal with no reachable buttons. A toast over a modal is that bug.
   * So the message goes INSIDE the card instead, where nothing can cover it. The toast stays too: it is
   * the right surface when no overlay is up (a background export, a re-render), and it costs nothing. */
  /* ⚠️ v14.35 — THE REASONING ABOVE WAS RIGHT AND THE TARGET WAS WRONG, AND THAT IS WHY #215 NEVER
   * MOVED. "The message goes INSIDE the card, where nothing can cover it" is correct. But it went into
   * `#export-status`, and `#export-status` IS THE PROGRESS LINE: js/app.js's onProgress does
   * `status.textContent = 'Encoding …'` on that same node, and the frame loop calls it once per frame.
   * Every one of these warnings is written BEFORE the frame loop starts, so FRAME 1 ERASES IT.
   * `export-status-warn` is never removed either, so what he has actually been seeing is ordinary
   * progress text, tinted amber, with none of the words. v13.92 believed it had fixed this; measured,
   * it moved the message from a toast painted UNDER the overlay to a line overwritten a sixtieth of a
   * second later. Both are invisible, for different reasons, and the second looks fixed.
   * `#export-note` (index.html, added v14.34 for the crash-resume message) is the surface that
   * actually persists — the frame loop never touches it.
   * APPENDS rather than replaces: several of these can fire in one export (a dropped clip AND no AAC),
   * and "the last one wins" is how you lose the first. De-duplicated, because the mixer can report the
   * same thing twice. */
  function exportSay(msg) {
    try {
      const el = document.getElementById('export-note');
      if (!el) return;
      const have = el.textContent ? el.textContent.split('\n').filter(Boolean) : [];
      if (have.indexOf(msg) < 0) have.push(msg);
      el.textContent = have.join('\n');
      el.classList.remove('hidden');
      el.classList.add('export-note-warn');
    } catch (e) {}
  }
  FM._exportSay = exportSay;   // suite seam

  /* THE SAME CARD HAS A SECOND WRITER, AND IT MUST FOLLOW THE SAME RULE (queue 891). exportSay above
   * APPENDS, because #export-note is the one surface in the overlay the frame loop never touches and
   * several audio-loss lines can land in it. But the crash-resume sentence reached the same node through
   * app.js's onNote, which did `noteEl.textContent = text` — a flat REPLACE. Every exportSay call in run()
   * happens before the resume block, so on the one export where both fired, the resume erased the only
   * on-screen explanation for a silent file, and was then drawn in the amber warning style that
   * exportSay had left on the node — as if resuming were the problem.
   * Kept here, beside exportSay, so the two writers of that node cannot drift apart again: same append,
   * same de-duplication, and the one difference that matters — news is not a warning, so this never
   * adds export-note-warn. If a warning IS present the card stays amber, because something is wrong. */
  function exportInfo(msg) {
    try {
      const el = document.getElementById('export-note');
      if (!el || !msg) return;
      const have = el.textContent ? el.textContent.split('\n').filter(Boolean) : [];
      if (have.indexOf(msg) < 0) have.push(msg);
      el.textContent = have.join('\n');
      el.classList.remove('hidden');
    } catch (e) {}
  }
  FM._exportInfo = exportInfo;   // the writer app.js's onNote hands the resume sentence to

  /* ═══ THE MIX LIMITER (queue 690) — turn down only the moments that would clip ═══════════════════════════
   * A look-ahead peak limiter over the rendered mix, in place. For every sample the gain it NEEDS is
   * ceiling / |loudest channel| (both channels share one gain, so the stereo image cannot wander). The gain
   * actually applied is the lowest of those needs, with two slopes around each one:
   *   · ATTACK, read backwards: the gain starts falling up to 5 ms BEFORE an over, so it is already down
   *     when the over arrives — no sample is ever cut to the ceiling, which is what a clip sounds like;
   *   · RELEASE, read forwards: after the last over it climbs back to 1 at 1/250 ms per sample, so a dip
   *     to 0.57 recovers in about 0.1 s. Slow enough that it does not follow the waveform (distortion),
   *     quick enough that a sound effect does not duck the song for seconds after it.
   * A linear gain slope rather than a curve, because it makes the bound provable: every applied gain is
   * <= the gain its own sample needed, so nothing can come out above the ceiling.
   * WHY NOT A DynamicsCompressorNode inside the OfflineAudioContext (the boost stage's limiter): the spec's
   * compressor adds its own make-up gain (about +0.9 dB at these settings) to EVERYTHING, and a fixed
   * look-ahead delay — it would turn the quiet parts UP and shift the whole soundtrack, which is the same
   * whole-file change this replaces, just the other way.
   * In blocks, so a long export does not need a second full-length array beside the mix on a phone: an
   * over can only reach back one attack length, so each block needs just that much of the next. */
  function limitMix(buf, ceiling) {
    const n = buf.length, nc = buf.numberOfChannels, sr = buf.sampleRate || 48000;
    const ch = []; for (let c = 0; c < nc; c++) ch.push(buf.getChannelData(c));
    const A = Math.max(1, Math.round(0.005 * sr)), fall = 1 / A;         // attack: 5 ms per unit of gain
    const rise = 1 / Math.max(1, Math.round(0.25 * sr));                 // release: 250 ms per unit of gain
    const B = Math.max(A * 8, 1 << 15);
    const g = new Float32Array(B + A);
    let rel = 1, low = 1, out = 0;
    for (let b0 = 0; b0 < n; b0 += B) {
      const b1 = Math.min(n, b0 + B), e = Math.min(n, b1 + A), len = e - b0;
      /* The release pass, forwards. `rel` carries across blocks; the look-ahead tail is recomputed by the
         next block from the same carried state, so it is never counted twice. */
      let r = rel;
      for (let i = 0; i < len; i++) {
        let a = 0; for (let c = 0; c < nc; c++) { const v = ch[c][b0 + i]; const x = v < 0 ? -v : v; if (x > a) a = x; }
        const need = a > ceiling ? ceiling / a : 1;
        r = Math.min(need, r + rise);
        g[i] = r;
        if (b0 + i === b1 - 1) rel = r;
      }
      // …the attack pass, backwards, from the end of the look-ahead.
      for (let i = len - 2; i >= 0; i--) { const v = g[i + 1] + fall; if (v < g[i]) g[i] = v; }
      for (let i = 0; i < b1 - b0; i++) {
        const k = g[i];
        if (k < low) low = k;
        for (let c = 0; c < nc; c++) {
          const d = ch[c]; const y = k < 1 ? (d[b0 + i] *= k) : d[b0 + i];
          const ay = y < 0 ? -y : y; if (ay > out) out = ay;
        }
      }
    }
    return { low: low, peak: out };
  }
  FM._limitMix = limitMix;   // suite seam: the limiter is pure arithmetic, so it can be driven on a buffer directly

  /* ═══ THE MIX HEARS EVERY CLIP DECODED AT ITS OWN 48 kHz (queue 1172) ════════════════════════════════════════════════
   * The mix below runs at 48 kHz, fixed. Every clip's sound reached it through FM.decodeAudio(m.file) with no rate, which
   * decodes in a LIVE AudioContext, and decodeAudioData hands the audio back resampled to THAT context's rate: the device's
   * own. makeClipBuffer keeps the buffer's rate (its createBuffer takes the buffer's `sr`), so on a 44.1 kHz device (this
   * laptop) a 44.1 kHz buffer was played into the 48 kHz OfflineAudioContext, and an AudioBufferSourceNode converts a rate by
   * LINEAR INTERPOLATION, which is a low-pass on the top octave. MEASURED on white noise (16 Oct): -2.3 dB at 10-15 kHz and
   * -5.3 dB at 15-20 kHz in the mix, while tones dropped only 0.002-0.047 dB, so nothing measured with a tone could see it.
   * It is the DEVICE's rate that decides it, not the file's: on a 48 kHz device (an iPhone, usually) the decoder itself did
   * the one conversion, with a proper filter, whatever the file's rate; on a 44.1 kHz device every clip was interpolated,
   * even a 48 kHz video (decoded down to 44.1 kHz, then interpolated back up).
   * So when the device is not at the mix's rate, the export decodes the file AT THE MIX'S RATE (FM.decodeAudio's `rate`, an
   * OfflineAudioContext), and the browser's decoder does the one conversion with its own filter. Every sound in an export
   * comes through here: a video's or a song's track, a sound effect and a voice recording (files on the video path), Reduce
   * noise's cleaned copy and Remove vocals' instrumental (WAVs written at the device's rate, loaded the same way), and a
   * resumed export, which mixes afresh (js/export-resume.js persists no audio).
   * THE PREVIEW IS LEFT ALONE. m.audioBuffer stays the device-rate decode that reversed playback, the visualiser and Audio ->
   * keyframes use in the live context, so the 48 kHz copy has its own slot, m._mixAudio, holding the rate and the file it
   * was made from (a record's file can be relinked); media.js's release() drops it with the rest, and a second export reuses it.
   * MEMORY: off 48 kHz the export no longer decodes at the device rate at all (FM.deviceAudioRate says so up front), so a
   * clip only the export has decoded holds ONE full copy, as before (48/44.1 of the old size). Only a clip the preview has
   * decoded for itself holds two. AT 48 kHz NOTHING CHANGES: today's decode, into today's slot, and no second copy. */
  async function mixAudioOf(m, rate, deviceRate) {
    const have = m.audioBuffer;
    if (have === null) return null;                                   // decoded before, and there is no sound track
    if (have && have.sampleRate === rate) return have;                // the device runs at the mix's rate: today's buffer
    const c = m._mixAudio;
    if (c && c.rate === rate && c.file === m.file) return c.buf || have || null;
    if (have === undefined && deviceRate() === rate) {
      m.audioBuffer = await FM.decodeAudio(m.file);                   // today's decode, exactly; a throw reaches the caller as before
      if (!m.audioBuffer || m.audioBuffer.sampleRate === rate) return m.audioBuffer;
    }
    let buf = null;
    try { buf = (await FM.decodeAudio(m.file, { rate: rate })) || null; }
    catch (e) { if (!m.audioBuffer) throw e; buf = null; }            // with a device-rate decode in hand, fall back to it
    m._mixAudio = { rate: rate, file: m.file, buf: buf };
    if (buf) return buf;
    if (m.audioBuffer === undefined) m.audioBuffer = null;            // no sound track: remembered in the slot it always was
    return m.audioBuffer || null;
  }

  async function buildAudioMix(scene, from, to, onStatus) {
    const P = scene.project;
    const sampleRate = 48000, channels = 2;
    from = from || 0; to = (to == null) ? P.duration : to;
    const dur = Math.max(0.01, to - from);
    const length = Math.ceil(dur * sampleRate);
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return null;
    /* bughunt3 #2: a clip still loading back from Home has no record yet, and the loop below would drop its sound from the whole
       file. Cancel counts only inside an export, as in the loop: the WAV / M4A path never resets the flag. `onStatus` is
       optional (the WAV / M4A path passes a toast); run() has already waited in prepareCaches, so this is a no-op there. */
    const back = mediaBack(scene, onStatus, () => FM._exporting && FM._exportCancel);
    if (back) await back;
    const oac = new OAC(channels, length, sampleRate);
    const soloActive = scene.layers.some(l => l.solo);   // mirror the compositor's solo gate so the exported soundtrack matches the soloed picture (#14)
    let any = false;
    const chains = [];   // disposed only AFTER startRendering() resolves — dispose() stops the LFO oscillators, and an offline render that hasn't run yet would lose them
    // The rate a plain decode would come back at (queue 1172, mixAudioOf): asked once per mix, and only if a clip needs it.
    let devRate = null;
    const deviceRate = () => {
      if (devRate === null) { try { devRate = FM.deviceAudioRate ? (+FM.deviceAudioRate() || 0) : 0; } catch (e) { devRate = 0; } }
      return devRate;
    };
    /* WHY THE SKIPS ARE COUNTED (queue 215). Every `continue` below is silent, and a silent skip in a
     * mix builder is how you get Ezra's report: "I made a fresh project, added some sound effects,
     * pressed export with some pretty normal export settings and got an audioless clip." Nothing warned,
     * nothing failed, the file was simply mute. This entry has been open and unreproducible for weeks
     * partly because the failure leaves no trace anywhere to look at.
     * So the reasons are recorded as we go and reported at the end. This does not fix the drop — it
     * makes the drop SAY something, which is what turns an unreproducible report into a one-line
     * answer next time it happens. `deliberate` skips (hidden, solo-suppressed, silent by choice) are
     * kept apart from `dropped` ones, because a hidden layer being silent is correct and saying so
     * would be noise. */
    const dropped = [];
    const suppressed = [];   // has audio, but hidden or solo-suppressed — see the skip below
    const suppressedHere = [];   // …and would have been IN this export: its window overlaps [from, to] (queue 892)
    const nameOf = l => l.name || l.type || l.id;
    /* bughunt3 #7 (found while fixing #2): A PHOTO IS NOT A LOST SOUND. Both skips below asked "could this layer carry sound?"
     * as `file || audioBuffer`, and a photo's record has a file too: FM.loadImageFile keeps it (js/media.js), and every route
     * that loads one back (Home, a paste, a Replace, a friend's edit) goes through it again. So every photo was filed as a
     * dropped audio clip, "the mixer only takes "video" layers": with a song, "1 clip had no usable audio — the rest are in
     * the file" on a file with every sound in it; with photos and no sound, "Exporting with NO SOUND — 1 audio clip could not
     * be read" and `all-unreadable` on a file that is exactly right; and a hidden photo, or the photos a solo leaves out, were
     * counted as audio clips "hidden or muted by solo". `drops` and `dropped` are the lines the silent-export hunt (#604)
     * reads, so every false one sends it after a picture.
     * A record can carry sound if it holds decoded audio, or a file that is not a picture. A picture is the record's own
     * kind ('image', every photo and GIF, from loadImageFile) or an image/* file. Anything else with a file is reported
     * exactly as before, a typeless Blob included: a MIME type is often empty, and a lost sound must not go quiet to spare
     * a photo. */
    const couldSound = r => !!r && (!!r.audioBuffer || (!!r.file && r.kind !== 'image' && !/^image\//i.test(r.file.type || '')));
    // Is this the whole project, or a sub-range the user deliberately chose? Decides whether a clip
    // outside the range is a surprise worth reporting or the user's own instruction. See below.
    const wholeProject = (from <= 0.001) && (to >= (P.duration || 0) - 0.001);
    for (const layer of scene.layers) {
      /* Cancel lands between clips too (queue 916, clause 3) — a decode and a resample per clip is where
         the time goes. Only inside an export: the audio-only WAV path shares this mixer and never resets
         the flag, so a stale Cancel from an earlier export must not empty its soundtrack. run() turns
         the null into CANCELLED on the very next line. */
      if (FM._exporting && FM._exportCancel) return null;
      const hiddenOrSolo = layer.visible === false || (FM.groupHidden && FM.groupHidden(layer)) || (soloActive && !layer.solo);
      if (hiddenOrSolo) {
        /* SUPPRESSED IS NOT THE SAME AS SILENT, and this `continue` was the last one in the mixer with
         * no witness (queue 215, 25 Aug). Hiding a layer should silence it — that part is correct and
         * saying so every time would be noise, which is why it was left bare. But SOLO is the trap:
         * `soloActive` is true if ANY layer is soloed, including a SHAPE, which has no sound at all.
         * Solo a shape to look at it on its own, forget, export — and every soundtrack in the project
         * vanishes with nothing said anywhere. MEASURED (tests/_q215mux.html): soloing the shape next
         * to a healthy audio clip produced a file with no audio track, no flag and no toast.
         * So the audio-bearing ones are remembered, and reported ONLY if they turn out to be the reason
         * the whole export is silent — see the report block below. A warning that fires while the file
         * still has sound would be exactly the noise this was avoiding. */
        const sm = FM.media.get(layer.id);
        if (couldSound(sm)) {   /* not a photo: bughunt3 #7, above */
          suppressed.push(nameOf(layer) + (layer.visible === false ? ' (hidden)'
                          : (soloActive && !layer.solo) ? ' (another layer is soloed)' : ' (inside a hidden group)'));
          /* Would it have been in THIS export? A suppressed clip is never decoded, so its real audio length is
           * unknown here; its timeline window is the honest stand-in, and the same overlap rule the decoded
           * path uses below. Without this, a sub-range export would blame a solo for a clip the range had
           * already left out (queue 892). */
          const _sEnd = layer.start + (layer.duration || 0);
          if (Math.min(_sEnd, to) > Math.max(layer.start, from)) suppressedHere.push(suppressed[suppressed.length - 1]);
        }
        continue;
      }
      if (layer.type !== 'video') {
        // Imported audio rides the video path (an mp3 is a 'video' layer with a 0x0 picture), so a
        // NON-video layer here either genuinely has no sound, or is an audio layer built by some other
        // route that this mixer has never handled. Only the second is worth saying out loud, and the
        // honest test for it is whether it has decodable media attached — and a photo's file is not (bughunt3 #7, above).
        const mm = FM.media.get(layer.id);
        if (couldSound(mm)) dropped.push(nameOf(layer) + ' (type "' + layer.type + '" — the mixer only takes "video" layers)');
        continue;
      }
      const m = FM.media.get(layer.id);
      if (!m || !m.file) {
        if (m) dropped.push(nameOf(layer) + ' (no file on its media record — a bundled or URL-backed clip?)');
        else dropped.push(nameOf(layer) + ' (no media record at all)');
        continue;
      }
      /* A DECODE THAT REJECTS USED TO TAKE THE WHOLE SOUNDTRACK WITH IT (queue 47, v11.67). The line
       * below has always handled a decode that RESOLVES to nothing — but a genuinely corrupt or
       * unsupported file does not resolve, it THROWS, and nothing here caught it. That threw straight
       * out of the mixer, where the caller's `catch` set the mix to null and logged to a console nobody
       * has open. MEASURED: two audio clips, one good song and one file that will not decode, and the
       * mix came back null — so the corrupt clip did not lose ITS sound, it lost EVERY layer's sound,
       * and the export was silent with not one word said about why.
       * One bad clip is now exactly as expensive as it should be: that clip, and it is reported by name
       * through the same `dropped` list as every other reason a layer contributes nothing.
       * The decode is mixAudioOf's (queue 1172): today's on a 48 kHz device, one at the mix's own rate on any other. */
      let ab;
      try { ab = await mixAudioOf(m, sampleRate, deviceRate); }
      catch (e) { if (m.audioBuffer === undefined) m.audioBuffer = null; dropped.push(nameOf(layer) + ' (its audio would not decode: ' + (e && e.message ? e.message : e) + ')'); continue; }
      if (!ab) {
        /* ⚠️ NO SOUND TRACK IS NOT A LOST SOUND TRACK (queue 690). decodeAudio answers null both for a
         * track that will not decode and for a clip that never had one — an iPhone time-lapse, a screen
         * recording with the sound off — and this filed the second as the first. With nothing else making
         * sound that became 'all-unreadable', so every export of a time-lapse ended on "NO SOUND — none of
         * the audio clips could be read" in the warning colour, on a file that was exactly right; with a
         * song under it, "1 clip had no usable audio". After four real silent-export reports (#215) a
         * false alarm sends him hunting a fifth. So the FILE is asked whether it lists a sound track at
         * all, and only a definite no is skipped in silence — the card then reads "no soundtrack", the
         * words it already has for a project with no audio in it. Anything the container cannot answer
         * is still reported exactly as before. Asked on every export rather than cached on the record: it
         * reads a few kilobytes, and a cache would have to know when the record's file is swapped. */
        if (FM.soundTrackInFile && (await FM.soundTrackInFile(m.file)) === false) continue;
        dropped.push(nameOf(layer) + ' (its audio would not decode)'); continue;
      }
      /* LOUDNESS MATCH IS MEASURED BEFORE ITS CHAIN IS BUILT (#966 B43): its gain IS the clip's measured loudness, so the export
         waits for it — taken from the record's device-rate decode when the preview had not measured this file already, or, on
         a device not at 48 kHz where the export keeps none (queue 1172), from the measurement's own 24 kHz decode. */
      if (FM.loudness && FM.loudness.uses(layer)) {
        try { await FM.loudness.prepare(layer, m); } catch (e) { console.warn('loudness measurement failed', layer.id, e); }
      }
      const geom = clipGeom(ab, layer);
      const clipEnd = layer.start + Math.min(layer.duration, geom.lenSamples / geom.sr);   // = the old buf.duration, without building buf
      const oStart = Math.max(layer.start, from), oEnd = Math.min(clipEnd, to);   // overlap with [from,to]
      /* THE FOURTH SILENT LOSS (queue 215, v11.21) — and the only one of the four that survived a
       * layer having everything right. v7.90 made "the mixer could not read this clip" speak, v7.91
       * made "the browser cannot encode AAC" speak, and the encode-before-mux change made "the
       * soundtrack failed to encode" speak. This one skipped a layer whose file, media record and
       * decoded buffer were all PERFECT, purely because its window did not overlap the exported range
       * — and said nothing, because a bare `continue` here never reached the `dropped` list.
       * MEASURED: one good audio layer moved to start=10s and exported 0-2s returns mix = null with
       * dropped = [], i.e. a file with no soundtrack and not one word anywhere about why.
       * Reported ONLY when the export covers the whole project. Exporting a chosen sub-range and
       * leaving out a clip outside it is exactly what the user asked for, and warning about that
       * would be noise — and a diagnostic that cries wolf stops being read, which is how the last one
       * died. A clip outside the WHOLE project is a genuine surprise: it is the shape of #394, where a
       * layer dragged too far right ends up past the end of the timeline. */
      if (oEnd <= oStart) {
        if (wholeProject) {
          dropped.push(nameOf(layer) + ' (sits at ' + layer.start.toFixed(2) + '\u2013' + clipEnd.toFixed(2) +
                       's, outside the exported ' + from.toFixed(2) + '\u2013' + to.toFixed(2) + 's)');
        }
        continue;
      }
      any = true;
      /* Build only the stretch of the clip this export plays (queue 916, clause 8) — from the sample at
         or before the overlap's start to a couple past its end (the interpolation reads one ahead). The
         sub-sample remainder rides the node's offset, so the samples heard are the ones the whole-clip
         buffer would have played. A whole-project export starts at the clip's own start: k0 is 0, the
         offset is 0, and the buffer is the one it always was. */
      const k0 = Math.max(0, Math.floor((oStart - layer.start) * geom.sr));
      const k1 = Math.ceil((oEnd - layer.start) * geom.sr) + 2;
      const buf = makeClipBuffer(oac, ab, layer, geom, k0, k1);
      const node = oac.createBufferSource(); node.buffer = buf;
      const gain = oac.createGain();
      const animVol = FM.isAnimated(layer.volume);
      const vol = FM.layerVolume(layer, layer.start);   // static level (non-animated clips)
      const clipDur = layer.duration;                     // fade timing uses VISUAL duration (matches preview), not audio-limited
      const win = FM.fadeWindows(layer, clipDur);         // scaled so fades never overlap (no pop)
      const fi = win.fi, fo = win.fo;
      /* bughunt3 #3: a half of a split measures its fades over the clip it came from: the fade-in began `fLead` before this clip's
         start and the fade-out ends `fTail` after its end (FM.fadeWindows, js/scene.js), so the ramps below are laid from there, as
         FM.fadeMul reads them. With neither, `csOut - 0` and `ceOut + 0` are the old times exactly. */
      const fLead = win.lead || 0, fTail = win.tail || 0;
      if (animVol) {
        // Keyframed volume: schedule the combined volume×fade envelope sampled across the clip in
        // output time (30 Hz, linear-ramped) so the export matches the animated preview. (#6,#14)
        const steps = Math.max(2, Math.ceil((oEnd - oStart) * 30));
        for (let i = 0; i <= steps; i++) {
          const sceneT = oStart + (oEnd - oStart) * (i / steps);
          const g = Math.max(0, FM.layerVolume(layer, sceneT) * FM.fadeMul(layer, sceneT - layer.start, clipDur));
          const ot = Math.max(0, sceneT - from);
          if (i === 0) gain.gain.setValueAtTime(g, ot); else gain.gain.linearRampToValueAtTime(g, ot);
        }
      } else if (fi > 0 || fo > 0) {
        // Schedule the fade envelope in OUTPUT time, anchored to the clip's visual start/end.
        const startOut = oStart - from;                 // when this source begins in the mix
        const csOut = layer.start - from, ceOut = (layer.start + layer.duration) - from;
        const at = tm => Math.max(0, tm);
        gain.gain.setValueAtTime(FM.fadeMul(layer, oStart - layer.start, clipDur) * vol, at(startOut));
        if (fi > 0 && csOut - fLead + fi > startOut) gain.gain.linearRampToValueAtTime(vol, at(csOut - fLead + fi));
        if (fo > 0) {
          const foEnd = ceOut + fTail, foStart = foEnd - fo;
          if (foStart > startOut) gain.gain.setValueAtTime(vol, at(foStart));
          gain.gain.linearRampToValueAtTime(0, at(foEnd));
        }
      } else {
        gain.gain.value = vol;
      }
      /* ═══ THE SAME EDGE DE-CLICK THE PREVIEW PLAYS (queue 690, audio hunt) ═══════════════════════════════
       * His words for the hunt: "go re audit, find some bugs coz theres a shit load".
       * The preview has faded every clip's two edges over 45 ms since #148 (his "scratchy popping noise
       * that hurts my ears" — and on #663, "Seems fixed for the scratchy popping"): js/app.js declickGain.
       * The file never got it. The clip's buffer started on whatever sample the trim landed on and stopped
       * dead at its end, so a trimmed song stepped from silence to full level in ONE sample and back —
       * measured 0.00 to 0.50 and 0.50 to 0.00, 31 times the steepest step in the song itself. A pop at
       * every trim, every cut between two clips and every song that stops before the video does, in the
       * exported file only, where he could not hear it while editing.
       * So the export builds the preview's envelope: 0 to 1 over the first 45 ms of the clip's own start,
       * 1 to 0 over the last 45 ms before its own end, the two meeting in the middle on a clip too short
       * for both — exactly declickGain's min() of the two. It MULTIPLIES the volume and fades below, as the
       * preview's does. Two edges are left alone, for the preview's reasons:
       *   - one that touches the other half of a SPLIT (the same seamAt rule), because the halves are one
       *     continuous recording and ramping both made a notch of silence at the cut (21 Aug);
       *   - one the export RANGE cuts through, because the clip is not really starting or ending there —
       *     the sound goes on, the file simply stops recording it. */
      const DS = FM.DECLICK_S || 0.045;
      const seamAt = FM.declickSeamAt || (() => false);
      const visEnd = layer.start + layer.duration;         // the edge the preview fades at, like the fades above
      const rampIn = !(oStart > layer.start + 1e-6) && !seamAt(layer, layer.start, scene.layers);
      const rampOut = !(to < visEnd - 1e-6) && !seamAt(layer, visEnd, scene.layers);
      let edge = null;
      if (rampIn || rampOut) {
        edge = oac.createGain();
        const a = layer.start - from, b = visEnd - from;   // the clip's own edges, in output time
        const k = t => { let v = 1; if (rampIn) v = Math.min(v, (t - a) / DS); if (rampOut) v = Math.min(v, (b - t) / DS); return Math.max(0, Math.min(1, v)); };
        // The envelope is straight lines between these points, so ramping from each to the next IS it.
        const pts = [0, a, a + DS, (a + b) / 2, b - DS, b].filter(t => t >= 0).sort((x, y) => x - y);
        pts.forEach((t, i) => {
          if (i === 0) edge.gain.setValueAtTime(k(t), t);
          else if (t > pts[i - 1]) edge.gain.linearRampToValueAtTime(k(t), t);
        });
        edge.connect(gain);
      }
      // Audio effects: node -> (edge) -> gain -> chain -> destination. Each clip gets its OWN chain (they are
      // stateful node graphs). Best-effort like the rest of export audio: a chain that throws falls back
      // to the dry gain -> destination path for this clip rather than aborting the whole export.
      let chain = null;
      try { chain = FM.buildAudioFxChain ? FM.buildAudioFxChain(oac, layer, from) : null; }
      catch (e) { console.warn('audio fx chain failed', layer.id, e); chain = null; }
      if (chain) {
        try {
          // schedule() computes ctxTime = sceneTime − fromScene, and OUTPUT time 0 is `from` (the export
          // range start, NOT this clip's start) — so passing the EXPORT range makes ctxTime === output
          // time. Passing oStart would shift every clip's automation later by (oStart − from).
          chain.schedule(from, to);
          gain.connect(chain.input);
          chain.output.connect(oac.destination);
          chains.push(chain);
        } catch (e) {
          console.warn('audio fx chain failed', layer.id, e);
          try { gain.disconnect(); } catch (e2) {}
          try { chain.dispose(); } catch (e2) {}
          chain = null;
        }
      }
      /* THE SAME LIMITER THE PREVIEW USES (queue 195). Volume can now reach 1000%, and this GainNode
       * has always been willing to amplify — it was the PREVIEW that could not, because `el.volume`
       * refuses anything above 1. Now that both can, they have to agree, and the disagreement this
       * entry was opened for would otherwise just move: preview limited, export clipping.
       * Only when the clip is actually boosted. A limiter on every export would re-shape mixes that
       * have never gone near full scale, which is a silent change to every file he has already made.
       * Placed LAST, after any audio effects — a limiter that is not the final stage can be pushed
       * back over the ceiling by whatever follows it. */
      const boosted = FM.audioFxLive && FM.audioFxLive.needsBoost && FM.audioFxLive.needsBoost(layer);
      let limiter = null;
      if (boosted) {
        /* THE PREVIEW'S OWN LIMITER, not a copy of its five numbers (queue 986, hunt C2): the copy that sat here
           matched the preview, and so both carried the node's hidden +0.86 dB makeup. makeLimiter now cancels it,
           and building it in one place is what keeps preview and file agreeing about that. { input, output }. */
        try {
          limiter = FM.audioFxLive.makeLimiter(oac);
          limiter.output.connect(oac.destination);
        } catch (e) { limiter = null; }
      }
      const sink = limiter ? limiter.input : oac.destination;
      if (chain) {
        // re-point the chain's output at the limiter rather than straight at the destination
        if (limiter) { try { chain.output.disconnect(); chain.output.connect(limiter.input); } catch (e) {} }
      } else {
        gain.connect(sink);
      }
      node.connect(edge || gain);   // …through the edge de-click first, when the clip has an edge to fade
      // when-in-range, offset-into-THIS-BUFFER (it begins at clip sample k0), play-len. Clamped at 0: a
      // float can put k0/sr one ulp past the true offset, and a negative offset throws.
      node.start(oStart - from, Math.max(0, (oStart - layer.start) - k0 / geom.sr), oEnd - oStart);
    }
    /* Report before returning, whichever way it went (queue 215). The `!any` case is the one he hit —
     * an export with no soundtrack at all — and until now it returned null in silence. A layer that was
     * dropped while OTHERS made it through is just as worth saying: that is the case where the file has
     * sound, so nothing looks wrong, and one of your clips is quietly missing from it. */
    if (dropped.length) {
      console.warn('[export] ' + dropped.length + ' layer(s) contributed no audio:\n  · ' + dropped.join('\n  · '));
      const _msg = any
        ? dropped.length + ' clip' + (dropped.length === 1 ? '' : 's') + ' had no usable audio — the rest are in the file'
        : 'Exporting with NO SOUND — ' + dropped.length + ' audio clip' + (dropped.length === 1 ? '' : 's') + ' could not be read';
      /* ⚠️ v14.35 — THIS WAS THE LAST PATH THAT REACHED THE END SAYING NOTHING, and it is the worst of
       * the six because it is indistinguishable from normal. Every audio clip failed to decode, so no
       * flag was set anywhere: the ready card fell through to "no soundtrack", which is the exact
       * wording a project with NO AUDIO IN IT gets, and the report said `dropped no`. From his side an
       * export whose entire soundtrack failed looked identical to one that never had sound — which is
       * a very good candidate for what he actually saw, and it is why this entry could not be closed.
       * The reasons only ever survived in the console, which is not a place a phone has. */
      if (!any) FM._audioTrackDropped = 'all-unreadable';
      exportSay(_msg);
      if (FM.toast) FM.toast(_msg + (any ? ' — see the console' : ' (see the console)'), 5200);
    }
    /* AND THE LAST SILENT REASON OF ALL: nothing was dropped, nothing was broken, and every clip that
     * could contribute was hidden or solo-suppressed. Reported only when the export ends up with NO
     * sound at all: suppressing a clip you can see is suppressed is not a surprise, but a completely
     * silent export whose only cause is a solo you forgot about very much is.
     * ⚠️ IT USED TO ALSO REQUIRE THE WHOLE PROJECT, AND THAT WAS BORROWED FROM THE WRONG RULE (queue 892).
     * The out-of-range report above needs `wholeProject`, because leaving out a clip by choosing a range is
     * the user's own instruction. Suppression has nothing to do with the range. So "Selected clip only" or
     * "Loop region" with a forgotten solo made an MP4 with no audio track, no line on the card, and a ready
     * card reading "no soundtrack" — the wording a project with no audio in it gets — while the same scene
     * exported whole said exactly what was wrong. It now counts the suppressed clips that fall INSIDE the
     * range, which is the question that was always being asked: would this clip have been in the file?
     * The card line no longer waits on FM.toast either. The toast is drawn BEHIND the export overlay
     * (#47), so the card is the one of the two anyone can actually read. */
    if (!any && suppressedHere.length) {
      console.warn('[export] the soundtrack is empty because these layers are hidden or solo-suppressed:\n  · ' + suppressedHere.join('\n  · '));
      FM._audioTrackDropped = 'all-suppressed';
      const _sup = 'Exporting with NO SOUND — ' + suppressedHere.length + ' audio clip' + (suppressedHere.length === 1 ? ' is' : 's are') + ' hidden or muted by solo';
      exportSay(_sup);
      if (FM.toast) FM.toast(_sup, 5600);
    }
    FM._lastAudioDrops = dropped;   // the suite reads this rather than scraping toasts
    FM._lastAudioSuppressed = suppressed;
    if (!any) return null;
    const rendered = await oac.startRendering();
    chains.forEach(c => { try { c.dispose(); } catch (e) {} });
    /* ⚠️ SAMPLES ARE NOT SOUND — the fifth silent loss, and the only one that survives everything above
     * (queue 215, 25 Aug). Every check in this file so far asks whether a clip reached the mix. None
     * asks whether the mix makes a NOISE. A layer that is `muted`, or whose volume sits at 0, sails
     * through all of them: it is not hidden, its file decodes, its window overlaps, so `any` is true, a
     * real buffer renders, AAC encodes it, the muxer writes a full set of samples — and every one of
     * them is zero. The file has a perfectly good audio track containing silence. Nothing fails,
     * nothing is dropped, nothing is flagged, NOTHING IS SAID.
     * That is his report word for word: "I exported and got no audio even tho the video had audio",
     * with no toast. MEASURED (tests/_q215mux.html): muted → 22 samples, decoded peak 0.0000; volume 0
     * → identical. The control at normal volume peaks 0.4038, so the probe can tell them apart.
     * The entry itself pointed here two rounds ago — "check `layer.muted`, since Extract Audio
     * deliberately mutes the original" — and nothing ever measured it.
     * Peak-scan the rendered buffer. It is one pass over audio that is already in memory, costs a few
     * ms against a render measured in minutes, and it is the difference between a mute report and an
     * answer. The track is still written: a silent track is honest here, because the clips really are
     * in the project and really are silent. What changes is that it SAYS SO. */
    let peak = 0;
    for (let c = 0; c < rendered.numberOfChannels; c++) {
      const d = rendered.getChannelData(c);
      for (let i = 0; i < d.length; i++) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > peak) peak = v; }
    }
    FM._lastMixPeak = peak;
    /* ═══ AND THE MIX MUST NOT CLIP — measured on his own scenario (queue 604) ═════════════════════
     * `buildAudioMix` sums every layer through its own gain node and nothing ever limits the total.
     * 📐 MEASURED while proving the export DOES carry sound: two ordinary layers at volume 1 — a video
     * clip plus one built-in sound effect, added through the real path — mixed to **peak 1.52-1.61**,
     * and the decoded MP4 carried that same peak. Everything above 1.0 hard-clips going through AAC,
     * so overlapping sounds buzz, and the more layers overlap the worse it gets.
     * 🛑 **THIS IS NOT THE "NO AUDIO" BUG AND MUST NEVER BE SOLD AS ONE.** Every link from mix to file
     * was measured for #604 and all of them are sound. This is a separate, genuine defect found in the
     * same function, and it fits the half of his report that says the sound *"would cut in and out"*
     * and *"was inconsistent"* better than anything else found.
     * ⚠️ HOW IT IS HELD DOWN CHANGED IN QUEUE 690 (audio hunt). This used to divide the WHOLE mix by its
     * single loudest sample — "the only correction that leaves every layer's balance exactly as mixed",
     * and a knee "would be the first thing in this file capable of altering how a mix sounds relative to
     * the preview". Measured, the flat divide does exactly that, everywhere: one 0.2 s sound effect over
     * a song made the WHOLE song 4.8 dB quieter in the file, minutes away from the overlap where nothing
     * else plays (his own #604 setup came out 3.7-4.1 dB down, #677 1.4 dB). The preview has no master
     * gain at all, so the file sounded quieter than what he mixed for its entire length, to fix a problem
     * that lasted a fifth of a second.
     * So now only the moments that would clip are turned down (limitMix, below): the gain dips just
     * before an over, holds it at the ceiling, and comes back up over a fraction of a second. Everything
     * that never went over — the song before and after the sound effect — keeps exactly the level heard
     * in the preview. Within an overlap the balance between the layers is still one gain, so it is kept.
     * The 0.995 is real headroom, not superstition: AAC is lossy and the decoded waveform overshoots
     * its input slightly — the round-trip above came back at 0.8224 from a 0.8000 source. Landing
     * exactly on 1.0 would clip on the way out of the decoder instead of on the way in. */
    FM._lastMixGain = 1;
    FM._lastMixRawPeak = peak;
    if (peak > 1) {
      const lim = limitMix(rendered, 0.995);
      FM._lastMixGain = lim.low;     // the deepest the gain went, at the loudest overlap — not a whole-file figure any more
      peak = lim.peak;
      FM._lastMixPeak = peak;
      console.info('[export] the mix summed to ' + FM._lastMixRawPeak.toFixed(2) + ' — held down by up to ' +
                   (-20 * Math.log10(lim.low)).toFixed(1) + ' dB where it overlapped, so it does not clip through AAC; the rest is untouched');
    }
    if (peak <= 0.0001) {
      console.warn('[export] the mix rendered but is pure silence — every contributing clip is muted or at zero volume');
      FM._audioTrackDropped = 'mix-silent';
      exportSay('Exporting with NO SOUND — every audio clip is muted or at zero volume');
      if (FM.toast) FM.toast('Exporting with NO SOUND — every audio clip is muted or at zero volume', 5600);
    }
    return { audioBuffer: rendered, sampleRate, channels };
  }

  /* ═══ THE ENCODER'S WARM-UP IS NOT PART OF THE SOUND (queue 690, audio hunt) ═══════════════════════
   * His words for the hunt: "go re audit, find some bugs coz theres a shit load".
   * An AAC encoder starts every stream with a warm-up (priming) that is not meant to be heard — 2112
   * samples, 44 ms at 48 kHz, on the encoder Chrome uses on a Mac. A file is supposed to tell a player to
   * skip it with an edit list; vendor/mp4-muxer.js cannot write one, so every player played it first and
   * the whole soundtrack came out 44 ms BEHIND the picture in every export. MEASURED: a click at 1.000 s
   * on the timeline decoded back out of the MP4 at 1.044 s, and a 3.000 s video carried a 3.072 s audio
   * track. Cuts on the beat landed late, and a clip exported and imported again slipped another 44 ms.
   * So the warm-up is taken OUT of the file rather than described in it: a little silence is fed ahead of
   * the mix so that, once the whole warm-up frames are dropped, the first frame kept begins EXACTLY on
   * the mix's first sample; what is left is re-timed from 0; and the last frame is cut to the mix's own
   * length, so the track ends where the video does.
   * MEASURED, NOT ASSUMED: the length of the warm-up belongs to the ENCODER, and an iPhone, a Mac and an
   * Android phone need not share one. So a click is encoded and decoded back once per encoder and the
   * delay is read off where it lands (aacPriming). Anything that cannot be measured — no AudioDecoder, two
   * clicks that disagree — leaves the file exactly as the encoder made it: late is the old, known fault,
   * and a wrong guess would put the sound EARLY and cut off its start.
   * THE ONE COST, stated: a decoder that starts on a kept frame has no dropped frame to overlap it with,
   * so the first ~11 ms of the file fade in (measured on a steady tone: silent to ~9 ms, exact from
   * ~12 ms, and no step anywhere in between). A clip's own start already fades over 45 ms (the de-click
   * in buildAudioMix), so on a clip that starts with the export there is nothing to lose. */
  const AAC_FRAME = 1024;   // AAC-LC ('mp4a.40.2') codes 1024 samples a frame, by the standard
  const _primingByEncoder = new WeakMap();   // encoder constructor → { 'rate/channels': samples }; a stand-in encoder is measured afresh
  async function aacPriming(sampleRate, channels) {
    const Enc = window.AudioEncoder, Dec = window.AudioDecoder;
    if (typeof Enc !== 'function' || typeof Dec !== 'function' || typeof AudioData !== 'function') return 0;
    const key = sampleRate + '/' + channels;
    const known = _primingByEncoder.get(Enc);
    if (known && known[key] != null) return known[key];
    try {
      const F = AAC_FRAME, N = 12 * F, WIN = 4 * F;
      const AT = [1500, 1500 + 5 * F + 517];   // two clicks, neither on a frame boundary, further apart than WIN
      const sig = new Float32Array(N); AT.forEach(a => { sig[a] = 0.9; });
      const chunks = []; let cfg = null, err = null;
      const enc = new Enc({ output: (c, m) => { chunks.push(c); if (!cfg && m && m.decoderConfig) cfg = aacMeta(m, sampleRate, channels).decoderConfig; }, error: e => { err = e; } });   // #215: the decoder is handed a bare ASC too (aacMeta)
      enc.configure({ codec: 'mp4a.40.2', sampleRate, numberOfChannels: channels, bitrate: 160000 });
      for (let off = 0; off < N; off += F) {   // framed exactly as encodeAudio frames the mix
        const planar = new Float32Array(F * channels);
        for (let c = 0; c < channels; c++) planar.set(sig.subarray(off, off + F), c * F);
        const ad = new AudioData({ format: 'f32-planar', sampleRate, numberOfFrames: F, numberOfChannels: channels, timestamp: Math.round(off / sampleRate * 1e6), data: planar });
        enc.encode(ad); ad.close();
      }
      await enc.flush(); enc.close();
      if (err || !cfg || !chunks.length) return 0;
      const heard = []; let derr = null;
      const dec = new Dec({ output: ad => { try { const d = new Float32Array(ad.numberOfFrames); ad.copyTo(d, { planeIndex: 0, format: 'f32-planar' }); heard.push(d); } finally { ad.close(); } }, error: e => { derr = e; } });
      dec.configure(cfg);
      chunks.forEach(c => dec.decode(c));
      await dec.flush(); dec.close();
      if (derr) return 0;
      let len = 0; heard.forEach(d => { len += d.length; });
      const all = new Float32Array(len); let at = 0; heard.forEach(d => { all.set(d, at); at += d.length; });
      const lands = AT.map(a => {
        let pk = 0, pi = -1;
        for (let i = a; i < Math.min(all.length, a + WIN); i++) { const v = Math.abs(all[i]); if (v > pk) { pk = v; pi = i; } }
        return pk > 0.3 ? pi - a : -1;
      });
      if (lands[0] < 0 || lands[0] !== lands[1]) return 0;   // unheard, or the two clicks disagree: not a number to act on
      const k = known || {}; k[key] = lands[0]; _primingByEncoder.set(Enc, k);
      return lands[0];
    } catch (e) { return 0; }
  }
  /* Drops the `skip` warm-up frames, re-times what is left from 0, keeps only the frames the mix fills,
     and cuts the last one's duration to the mix's own end. The decoder description rides the first frame
     KEPT — the muxer takes it from whichever chunk carries it, and the one that did has been dropped. */
  function dropPriming(got, skip, total, sampleRate) {
    const cfgFrom = got.find(g => g.meta && g.meta.decoderConfig);
    const want = Math.ceil(total / AAC_FRAME);
    const kept = got.slice(skip, skip + want);
    if (!kept.length) return null;
    const t0 = kept[0].chunk.timestamp;
    return kept.map((g, i) => {
      const c = g.chunk;
      const data = new Uint8Array(c.byteLength); c.copyTo(data);
      const init = { type: c.type, timestamp: c.timestamp - t0, data: data };
      if (i === want - 1) init.duration = Math.round((total - i * AAC_FRAME) / sampleRate * 1e6);   // the track stops with the mix
      else if (c.duration != null) init.duration = c.duration;
      const meta = (i === 0 && cfgFrom) ? Object.assign({}, g.meta || {}, { decoderConfig: cfgFrom.meta.decoderConfig }) : g.meta;
      return { chunk: new EncodedAudioChunk(init), meta: meta };
    });
  }

  /* AX2 (#215/#604/#677, his words 11 Oct: "Export has no audio"): WHAT THE ENCODER ACTUALLY MADE, read back.
     Everything the export report said about sound was a fact from BEFORE the encode (the mix's peak, "TRACK WRITTEN" because a
     mix existed), so it printed the same for a file with 97 AAC frames and one with none, and his paste could not say which.
     This decodes the written chunks with the platform's own AudioDecoder (as aacPriming does) and reports the loudest sample.
     null = it could not be measured here (no AudioDecoder, no decoder config on the chunks, a decode error, or 15 s passed):
     that is "unknown", never "silent", and it never delays or fails an export. */
  async function decodedPeak(chunks) {
    const Dec = window.AudioDecoder;
    if (typeof Dec !== 'function' || !chunks || !chunks.length) return null;
    const first = chunks.find(g => g.meta && g.meta.decoderConfig);
    if (!first) return null;
    let peak = 0, err = null, dec = null;
    try {
      dec = new Dec({ output: ad => { try { const n = ad.numberOfFrames; for (let c = 0; c < ad.numberOfChannels; c++) { const d = new Float32Array(n); ad.copyTo(d, { planeIndex: c, format: 'f32-planar' }); for (let i = 0; i < n; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; } } } finally { ad.close(); } }, error: e => { err = e; } });
      dec.configure(first.meta.decoderConfig);
      chunks.forEach(g => dec.decode(g.chunk));
      await Promise.race([dec.flush(), new Promise((_, no) => setTimeout(() => no(new Error('decode timeout')), 15000))]);
      return err ? null : peak;
    } catch (e) { return null; }
    finally { try { if (dec && dec.state !== 'closed') dec.close(); } catch (e) {} }
  }

  /* ═══ #215 / #604 / #677 / #1134: SAFARI'S AAC ENCODER DESCRIBES ITS SOUND WRONGLY, AND EVERY IPHONE FILE WAS MUTE FOR IT ═══
     WebCodecs requires an AAC encoder's decoderConfig.description to be the bare AudioSpecificConfig (ASC): 2 bytes, 11 90
     for 48 kHz stereo AAC-LC. Safari 26 and 27 hand back Apple's whole magic cookie instead, a 39-byte MPEG-4 ES_Descriptor
     (03 … 04 … 05 <the ASC> 06 …): WebKit bug 302253, filed Nov 2025 and still NEW; its fix (PR #77282) is in no shipped
     Safari. mp4-muxer copies the description over its own correct ASC and writes it verbatim into the file's esds, so every
     iPhone export said "object type 0, 22050 Hz, 0 channels": a track no player can set a decoder up for, which Photos
     shows as a clip locked on mute. Every witness said Sound ✓, because each was measured before the mux.
     So the description becomes a bare ASC at the encoder's own output (encodeAudio, and aacPriming's probe):
       · already an ASC (2+ bytes, an object type other than 0: Chrome's 11 90, a 5-byte explicit-rate one) → untouched,
         byte for byte, so nothing changes anywhere else, and this goes quiet by itself once WebKit's fix ships;
       · an ES_Descriptor → WALKED as one, its sizes read, never fixed offsets: 03 (size, ES_ID, the flags and the fields
         they announce), 04 (size, its 13 fixed bytes), 05 (size): that payload is the ASC;
       · anything else, or a walk that does not end on a real ASC → the AAC-LC ASC built from the encoder's rate and
         channels, the one mp4-muxer itself writes. The raw bytes are NEVER passed on.
     What was done is kept for the report's aac desc line (FM._lastAacDesc). */
  const ASC_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
  function lcAsc(sampleRate, channels) {
    const fi = ASC_RATES.indexOf(sampleRate);
    const rateBits = fi < 0 ? '1111' + (sampleRate >>> 0).toString(2).padStart(24, '0') : fi.toString(2).padStart(4, '0');
    let bits = '00010' + rateBits + (channels & 15).toString(2).padStart(4, '0');
    bits = bits.padEnd(Math.ceil(bits.length / 8) * 8, '0');
    const out = new Uint8Array(bits.length / 8);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    return out;
  }
  // A copy of the description's bytes (ArrayBuffer or a view), so nothing that reuses the encoder's buffer can change them.
  function bytesOf(d) {
    if (d instanceof ArrayBuffer) return new Uint8Array(d.slice(0));
    if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength));
    return new Uint8Array(0);
  }
  // A real ASC has an audio object type other than 0 ("null object"), and 0 is exactly what an ES_Descriptor's 03 reads as.
  function ascPlausible(b) { return !!b && b.length >= 2 && (b[0] >> 3) !== 0; }
  /* The DecoderSpecificInfo inside the ES_Descriptor that starts at b[at] (ISO/IEC 14496-1), or null. A descriptor is a tag,
     a size in 1 to 4 bytes of 7 bits each (0x80 = another byte follows), then that many bytes. Every read is checked against
     the end of the descriptor holding it, so a short or lying cookie gives null, never garbage. */
  function dsiOfEsDescriptor(b, at, end) {
    let i = at;
    const size = lim => {
      let n = 0;
      for (let k = 0; k < 4; k++) { if (i >= lim) return -1; const x = b[i++]; n = n * 128 + (x & 0x7f); if (!(x & 0x80)) return n; }
      return -1;
    };
    if (!(i < end) || b[i++] !== 0x03) return null;
    let n = size(end);
    if (n < 0 || i + n > end) return null;
    const esEnd = i + n;
    if (i + 3 > esEnd) return null;
    i += 2;
    const flags = b[i++];
    if (flags & 0x80) i += 2;
    if (flags & 0x40) { if (i >= esEnd) return null; i += 1 + b[i]; }
    if (flags & 0x20) i += 2;
    if (!(i < esEnd) || b[i++] !== 0x04) return null;
    n = size(esEnd);
    if (n < 0 || i + n > esEnd) return null;
    const dcEnd = i + n;
    i += 13;
    if (!(i < dcEnd) || b[i++] !== 0x05) return null;
    n = size(dcEnd);
    if (n < 0 || i + n > dcEnd) return null;
    return b.slice(i, i + n);
  }
  /* (Above: ES_ID is 2 bytes; the flags announce dependsOn_ES_ID 0x80 = 2 bytes, a URL 0x40 = its length + itself, and
     OCR_ES_Id 0x20 = 2 bytes; the DecoderConfigDescriptor's 13 fixed bytes are objectTypeIndication, streamType,
     bufferSizeDB 3, maxBitrate 4 and avgBitrate 4.) → { how: 'as-is' | 'repaired' | 'fallback', from, to }, or null when
     the encoder gave no description at all (mp4-muxer then keeps its own). */
  function aacAscFor(desc, sampleRate, channels) {
    if (desc == null) return null;
    const b = bytesOf(desc);
    if (ascPlausible(b)) return { how: 'as-is', from: b, to: b };
    const at = (b.length > 4 && !b[0] && !b[1] && !b[2] && !b[3] && b[4] === 0x03) ? 4 : 0;   // an esds payload still carrying its version and flags
    const dsi = dsiOfEsDescriptor(b, at, b.length);
    if (dsi && ascPlausible(dsi)) return { how: 'repaired', from: b, to: dsi };
    return { how: 'fallback', from: b, to: lcAsc(sampleRate, channels) };
  }
  // The meta with a bare ASC as its description: the encoder's own object when it already is one, otherwise a copy.
  function aacMeta(meta, sampleRate, channels, note) {
    const dc = meta && meta.decoderConfig;
    const r = dc ? aacAscFor(dc.description, sampleRate, channels) : null;
    if (!r) return meta;
    if (note) note(r);
    if (r.how === 'as-is') return meta;
    return Object.assign({}, meta, { decoderConfig: Object.assign({}, dc, { description: r.to.slice().buffer }) });
  }
  function hexOf(b, max) { return Array.from(b.subarray(0, max || b.length), x => ' ' + x.toString(16).padStart(2, '0')).join(''); }
  // The report's aac desc line: what the encoder gave, and what the file was given.
  function aacDescLine(d) {
    if (!d) return '- (the encoder gave no description: the muxer wrote its own AAC-LC one)';
    if (d.how === 'as-is') return d.to.length + ' B' + hexOf(d.to, 8) + ' (as the encoder gave it)';
    return 'encoder ' + d.from.length + ' B' + hexOf(d.from, 4) + ' → file ' + d.to.length + ' B' + hexOf(d.to, 8) +
      (d.how === 'repaired' ? ' (Safari\'s AAC encoder, WebKit bug 302253: repaired)'
                            : ' (not an AudioSpecificConfig: fallback ASC from ' + d.rate + ' Hz / ' + d.ch + ' ch)');
  }

  /* …AND THE FINISHED FILE IS READ BACK, so it can never again be mute while every witness says Sound ✓ (#215). The repair
     above trusts the muxer to write what it is given; this does not. After finalize() the file's top-level boxes are walked
     (ftyp → mdat → moov on the video path, honouring a 64-bit mdat size; moov first on the M4A path) and ONLY the moov is
     read: a few KB however long the export, never its mdat. In it: the audio track (hdlr soun), its mp4a sample entry, its
     esds and the DecoderSpecificInfo there, which must be 2 to 5 bytes, an AAC object type, and the mix's own rate and
     channel count. Anything else is a track no player can decode.
     → { ok: true | false | null, dsi, read, why }. ok null = it could not be checked (no moov found, or a track that is not
     AAC): "unknown", never a verdict, and it never marks an export. */
  const AAC_TYPES = { 1: 'AAC Main', 2: 'AAC-LC', 3: 'AAC SSR', 4: 'AAC LTP', 5: 'HE-AAC', 29: 'HE-AAC v2' };
  function ascRead(d) {
    if (!d || d.length < 2) return null;
    const bits = (s, n) => { let v = 0; for (let k = s; k < s + n; k++) v = v * 2 + (((d[k >> 3] || 0) >> (7 - (k & 7))) & 1); return v; };
    const aot = bits(0, 5), fi = bits(5, 4);
    if (fi !== 15) return { aot: aot, rate: ASC_RATES[fi] || 0, ch: bits(9, 4) };
    if (d.length * 8 < 37) return null;
    return { aot: aot, rate: bits(9, 24), ch: bits(33, 4) };
  }
  function ascName(r) { return r ? (AAC_TYPES[r.aot] || 'object type ' + r.aot) + ', ' + r.rate + ' Hz, ' + r.ch + ' ch' : 'unreadable'; }
  function boxesIn(b, s, e) {
    const out = [], dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let i = s;
    while (i + 8 <= e) {
      let n = dv.getUint32(i), h = 8;
      if (n === 1) { if (i + 16 > e) break; n = dv.getUint32(i + 8) * 4294967296 + dv.getUint32(i + 12); h = 16; }
      else if (n === 0) n = e - i;
      if (n < h || i + n > e) break;
      out.push({ type: String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]), s: i + h, e: i + n });
      i += n;
    }
    return out;
  }
  async function fileAacCheck(blob, sampleRate, channels) {
    const size = blob.size;
    let off = 0, moov = null;
    while (off + 8 <= size) {
      const h = new Uint8Array(await blob.slice(off, Math.min(size, off + 16)).arrayBuffer());
      const dv = new DataView(h.buffer);
      let n = dv.getUint32(0), hl = 8;
      if (n === 1) { if (h.length < 16) break; n = dv.getUint32(8) * 4294967296 + dv.getUint32(12); hl = 16; }
      else if (n === 0) n = size - off;
      if (n < hl || off + n > size) break;
      if (String.fromCharCode(h[4], h[5], h[6], h[7]) === 'moov') { moov = new Uint8Array(await blob.slice(off + hl, off + n).arrayBuffer()); break; }
      off += n;
    }
    if (!moov) return { ok: null, why: 'no moov box found in the file' };
    const kids = (box, skip) => boxesIn(moov, box.s + (skip || 0), box.e);
    const one = (box, type) => box ? kids(box).find(k => k.type === type) : null;
    const four = at => String.fromCharCode(moov[at], moov[at + 1], moov[at + 2], moov[at + 3]);
    for (const trak of kids({ s: 0, e: moov.length }).filter(k => k.type === 'trak')) {
      const mdia = one(trak, 'mdia'), hdlr = one(mdia, 'hdlr');
      if (!hdlr || hdlr.s + 12 > hdlr.e || four(hdlr.s + 8) !== 'soun') continue;
      const stsd = one(one(one(mdia, 'minf'), 'stbl'), 'stsd');
      const entry = stsd ? kids(stsd, 8)[0] : null;
      if (!entry) return { ok: false, dsi: null, read: null, why: 'its audio track has no sample description' };
      if (entry.type !== 'mp4a') return { ok: null, why: 'the audio track is ' + entry.type + ', not AAC: not checked' };
      const ver = entry.s + 10 <= entry.e ? ((moov[entry.s + 8] << 8) | moov[entry.s + 9]) : 0;
      const esds = kids(entry, ver === 1 ? 44 : ver === 2 ? 64 : 28).find(k => k.type === 'esds');
      const dsi = esds ? dsiOfEsDescriptor(moov, esds.s + 4, esds.e) : null;
      if (!dsi) return { ok: false, dsi: null, read: null, why: esds ? 'its esds does not parse' : 'its mp4a carries no esds' };
      const r = ascRead(dsi);
      const rateOk = !!r && (r.rate === sampleRate || ((r.aot === 5 || r.aot === 29) && r.rate * 2 === sampleRate));
      const ok = dsi.length >= 2 && dsi.length <= 5 && !!r && !!AAC_TYPES[r.aot] && rateOk && r.ch === (channels === 8 ? 7 : channels);
      return { ok: ok, dsi: dsi, read: r, why: ok ? '' : 'the mix is ' + sampleRate + ' Hz, ' + channels + ' ch: no player can decode this track' };
    }
    return { ok: false, dsi: null, read: null, why: 'the file has no audio track' };
  }
  // The report's file audio line.
  function fileAacLine(f) {
    if (!f) return '-';
    if (f.ok == null) return '- (' + f.why + ')';
    return (f.dsi ? 'esds ' + f.dsi.length + ' B' + hexOf(f.dsi, 8) + ' = ' + ascName(f.read) : 'no AAC description') + (f.ok ? ' ✓' : ' ✗ ' + f.why);
  }

  /* `out` is where the encoded chunks go — the muxer, or an array. Taking a sink instead of the muxer
     is what lets the soundtrack be encoded BEFORE the muxer exists; see the call site for why that
     matters. */
  async function encodeAudio(out, mix) {
    const { audioBuffer, sampleRate, channels } = mix;
    const push = (chunk, meta) => { if (typeof out === 'function') out(chunk, meta); else out.addAudioChunk(chunk, meta); };
    const total = audioBuffer.length;
    FM._lastAacDesc = null;   // #215: this encode's own record, never the last one's
    // The warm-up, and what it takes to cut it out cleanly (queue 690) — see aacPriming above.
    const prime = total > 0 ? await aacPriming(sampleRate, channels) : 0;
    const skip = prime > 0 ? Math.ceil(prime / AAC_FRAME) : 0;   // whole warm-up frames to drop
    const lead = skip * AAC_FRAME - prime;                         // silence fed first, so the first frame kept starts ON the mix
    const got = [];
    let encErr = null;
    const enc = new AudioEncoder({
      /* #215: every meta passes aacMeta first, so both branches below (and decodedPeak, which reads these metas) carry a bare
         AudioSpecificConfig and never Safari's cookie; what was done is kept for the report's aac desc line. */
      output: (chunk, meta) => {
        meta = aacMeta(meta, sampleRate, channels, r => { FM._lastAacDesc = { how: r.how, from: r.from, to: r.to, rate: sampleRate, ch: channels }; });
        if (skip) got.push({ chunk: chunk, meta: meta }); else push(chunk, meta);
      },
      /* An encoder error arrives on this callback, NOT as a rejection from flush() on every browser —
         so a soundtrack could fail here and the export carry on believing it had succeeded. Held and
         rethrown after the flush, where the caller can see it. */
      error: e => { encErr = e; console.error('audio encode', e); },
    });
    enc.configure({ codec: 'mp4a.40.2', sampleRate, numberOfChannels: channels, bitrate: 160000 });
    const chData = [];
    for (let c = 0; c < channels; c++) {
      chData.push(audioBuffer.numberOfChannels > c ? audioBuffer.getChannelData(c) : audioBuffer.getChannelData(0));
    }
    const frameSize = 1024, fed = lead + total;
    let ts = 0;
    for (let off = 0; off < fed; off += frameSize) {
      const n = Math.min(frameSize, fed - off);
      const planar = new Float32Array(n * channels);   // starts as zeros — which is what the lead is
      const a = Math.max(off, lead);                     // the part of this frame the mix itself fills
      if (off + n > a) for (let c = 0; c < channels; c++) planar.set(chData[c].subarray(a - lead, off + n - lead), c * n + (a - off));
      const ad = new AudioData({ format: 'f32-planar', sampleRate, numberOfFrames: n, numberOfChannels: channels, timestamp: Math.round(ts), data: planar });
      enc.encode(ad); ad.close();
      ts += (n / sampleRate) * 1e6;
    }
    await enc.flush();
    enc.close();
    if (encErr) throw encErr;
    if (skip) {
      let kept = null;
      try { kept = dropPriming(got, skip, total, sampleRate); } catch (e) { console.warn('[export] could not cut the AAC warm-up out — the sound stays as the encoder made it', e); kept = null; }
      (kept || got).forEach(g => push(g.chunk, g.meta));
    }
  }

  FM._encodeAudio = encodeAudio;   // suite seam: the contract the muxer-ordering fix rests on

  async function pickVideoCodec(w, h, fps, bitrate) {
    const candidates = ['avc1.640034', 'avc1.640028', 'avc1.4d0028', 'avc1.42e01e'];
    for (const c of candidates) {
      try {
        const s = await VideoEncoder.isConfigSupported({ codec: c, width: w, height: h, bitrate, framerate: fps });
        if (s && s.supported) return c;
      } catch (e) {}
    }
    /* ⚠️ WAS `return 'avc1.42e01e'` — ONE OF THE FOUR THAT JUST FAILED (queue 671).
     * When every candidate probes false this used to hand back the last one anyway, and that codec is
     * Baseline level 3.0, capped near 720x576. So on a browser that supports none of them the export
     * proceeded with something guaranteed to throw at configure(), and what the user got was a second,
     * misleading alert about a closed codec — pointing at the symptom, one step removed from the cause.
     * The AUDIO path three functions up already does the right thing: probe, and report a NAMED reason
     * the caller can turn into a real sentence. This is that pattern, not a new one.
     * ⚠️ Not urgent for HIS devices — iOS Safari and Android Chrome pass the first or second candidate —
     * but it is exactly the kind of failure that arrives as "export just doesn't work" with a message
     * that sends you looking in the wrong place. */
    throw new Error('NO_VIDEO_CODEC');
  }

  /* bughunt6 #3: A FRAME TOO BIG FOR THE ENCODER IS REFUSED BY ITS SIZE, AT ONCE, WITH A SIZE THAT WORKS. An H.264 level caps
   * the frame's area: High 5.2, the best candidate above, stops near 9.4 MP (36,864 macroblocks), and Chrome refuses a bigger
   * frame outright. A panorama's 7680×1440 canvas, a typed 3840×3840 one or an Exact size up to 7680 came out as NO_VIDEO_CODEC,
   * after the decode and the mix, under an alert saying the browser had no H.264 at all. run() now picks the codec before
   * either, and when the frame is refused this asks the same probe for the size list's own rungs (short side 2160, 1440, 1080,
   * 720, 480, 360, below this frame's, same shape) and hands back the largest one the encoder takes. None at all is a browser
   * with no usable H.264, which keeps its own message. Only a refused frame reaches this. */
  const MP4_RUNGS = [2160, 1440, 1080, 720, 480, 360];
  async function largestMp4Size(w, h, fps, bitrate) {
    const short = Math.min(w, h);
    for (const t of MP4_RUNGS) {
      if (!(t < short - 1)) continue;
      const s = t / short;
      const fw = Math.max(2, Math.round(w * s / 2) * 2), fh = Math.max(2, Math.round(h * s / 2) * 2);
      const br = Math.max(1, Math.round(bitrate * (fw * fh) / (w * h)));
      try { await pickVideoCodec(fw, fh, fps, br); return { w: fw, h: fh }; } catch (e) { /* refused as well: the next rung down */ }
    }
    return null;
  }

  // Reverse + frame-blend slow-mo render from the frame cache; the preview cache (if any)
  // may be at a lower fps, so (re)build at the EXACT export fps before the frame loop so the
  // exported file actually contains the smooth/reversed motion seen in preview.
  // Event-loop yield that background-tab throttling can't clamp: setTimeout(0) is floored to >=1s in a
  // backgrounded tab (worse under intensive throttling), which turned a 2s GIF export into minutes when
  // the user switched apps mid-export. MessageChannel posts are not timer-throttled.
  const _tickCh = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
  let _tickQ = [];
  if (_tickCh) _tickCh.port1.onmessage = () => { const q = _tickQ; _tickQ = []; q.forEach(r => r()); };
  function nextTick() {
    if (!_tickCh) return new Promise(r => setTimeout(r, 0));
    return new Promise(r => { _tickQ.push(r); _tickCh.port2.postMessage(0); });
  }

  /* NO AUDITION SURVIVES INTO AN EXPORT (queue 916, clause 2). The audio-effect audition (the Hear
   * button, queue 653) plays a clip's element on its own frame loop with FM.playing false, so pausing
   * the transport does not reach it — and that loop jumps the element back to its start every 2.5s,
   * undoing the exporter's per-frame seeks. Measured: export frames past that point rendered from
   * currentTime 0, and the clip was still looping after the export finished. Every export entry point
   * calls this first; audio-fx-live.js's own tick also stands down while FM._exporting is set. */
  function endAudition() {
    try { if (FM.audioFxLive && FM.audioFxLive.stopAudition) FM.audioFxLive.stopAudition(); } catch (e) {}
  }

  /* ═══ bughunt3 #2: THE EXPORT WAITS FOR THE CLIPS HOME LET GO OF ═══════════════════════════════════════════════════════
   * WHAT WAS WRONG. Home frees the open project's media once its card is drawn (FM.storage.releaseSceneMedia). Going back into
   * the SAME project loads nothing up front: openProject's same-project branch and close() (js/home.js) start
   * FM.storage.hydrateSceneMedia({ onlyMissing: true }) and do not wait for it, so the editor is there at once and the clips
   * come back one by one behind it. Nothing in the export waited for that. Export pressed straight away (Home's ⋯ → Export
   * video… opens the dialog 260 ms after the tap; Simple's one tap has no dialog at all) read FM.media while a clip still had
   * no record: the mixer filed it "(no media record at all)" and left its sound out of the WHOLE file, decided once before
   * frame 1, and the frame loop drew nothing for it until the record landed partway through. On a phone with songs in the
   * project (each one is decoded at 8 kHz again on the way back, js/media.js) that window can outlast his tap.
   * WHY HERE. Every export reads FM.media first in one of two places: prepareCaches, the pre-flight of the MP4, the GIF and the
   * PNG frames, and buildAudioMix, the mixer of the MP4 and of the WAV / M4A. Both wait through this, and so does
   * FM.snapshotPNG (js/app.js), the still. It waits on the re-load's own shared promise (FM.storage.hydrateRun), so with
   * nothing re-loading it returns null and the caller does not await at all: an ordinary export gets no delay and no new words.
   * BOUNDED BY PROGRESS, NOT BY A TOTAL. The loader's own limit is 20 s per file (loadVideoFile's metadata timer, js/media.js;
   * it then rejects and the re-load goes on to the next clip), and the loading pill stops claiming "loading" at 25 s
   * (js/loading.js). So the wait gives up once NO clip has come back for 30 s, past both: by then the re-load is stuck in a
   * step with no timeout of its own (the 8 kHz decode, a GIF's frames). Every clip that does come back restarts that clock, so
   * a long project that is still arriving is waited for in full. Giving up exports as before, with the mixer's drop line
   * naming any clip still missing, and that run is not waited on again. Cancel ends the wait at the next 100 ms poll. */
  const MEDIA_BACK_STALL_MS = 30000;
  let _mediaBackGaveUp = null;
  function mediaBack(scene, onStatus, cancelled) {
    const run = (FM.storage && FM.storage.hydrateRun) ? FM.storage.hydrateRun() : null;
    if (!run || run === _mediaBackGaveUp) return null;
    return (async function () {
      const settled = Promise.resolve(run).then(() => true, () => true);
      const seen = new Map();
      const moved = () => {
        let any = false;
        for (const l of ((scene && scene.layers) || [])) {
          if (!l || l.type === 'text') continue;
          const m = FM.media.get(l.id) || null;
          if (seen.get(l.id) !== m) { seen.set(l.id, m); any = true; }
        }
        return any;
      };
      moved();
      let quietSince = Date.now(), said = false;
      for (;;) {
        if (cancelled && cancelled()) return;
        const back = await Promise.race([settled, new Promise(r => setTimeout(() => r(false), 100))]);
        if (back) return;
        if (cancelled && cancelled()) return;
        // said only once it is really waiting: a run that settles inside the first poll shows nothing
        if (!said && onStatus) { said = true; onStatus('Loading clips…'); }
        if (moved()) quietSince = Date.now();
        else if (Date.now() - quietSince >= MEDIA_BACK_STALL_MS) {
          _mediaBackGaveUp = run;
          console.warn('[export] no clip came back from the device in ' + (MEDIA_BACK_STALL_MS / 1000) + ' s — exporting with the clips that are here');
          return;
        }
      }
    })();
  }

  async function prepareCaches(scene, fps, onStatus) {
    const back = mediaBack(scene, onStatus, () => FM._exportCancel);   // bughunt3 #2 — see mediaBack
    if (back) await back;
    const built = [];   // media whose full-res export cache we (re)built — freed after export so it doesn't sit in memory (#3)
    const mgFrames = FM.matchGradeFrameLayers ? FM.matchGradeFrameLayers(scene) : {};   // #482 15.6: clips a Match Grade measures at other moments
    for (const layer of scene.layers) {
      if (FM._exportCancel) break;   // Cancel during the (potentially minutes-long) decode phase — was only checked in the encode loop, so Cancel did nothing here
      if (layer.type !== 'video') continue;
      const needs = layer.visible !== false && (layer.reversed || (layer.frameBlend && (FM.isAnimated(layer.speed) || (layer.speed || 1) < 1)));   // animated speed is an object — else a ramped frame-blend clip bakes in the stutter on export
      if (!needs) {
        /* #482 15.6: a Match Grade's Hold at time / Smoothing reads this clip at other moments, and the element only holds the
           frame being exported — so its frames are decoded first. Only MEASURED, never drawn, so any cache will do (a preview
           one is kept), and a new one is built at the preview's size. A hidden clip can still be a reference. */
        if (!mgFrames[layer.id]) continue;
        const mm = FM.media.get(layer.id);
        if (!mm || !mm.el) continue;
        if (mm._building) { try { await mm._building; } catch (e) {} }
        if (!mm.frameCache) {
          if (onStatus) onStatus('Decoding frames…');
          await FM.buildFrameCache(mm, fps, p => { if (onStatus) onStatus('Decoding frames… ' + Math.round(p * 100) + '%'); },
            Object.assign({}, FM.frameCacheLimits ? FM.frameCacheLimits() : { maxDim: 640, maxBytes: 128 * 1024 * 1024 }, { shouldAbort: () => FM._exportCancel }));
          if (FM._exportCancel) break;
          built.push(mm);
        }
        continue;
      }
      const m = FM.media.get(layer.id);
      if (!m || !m.el) continue;
      // Export must be pixel-exact: discard a downscaled PREVIEW cache (scaled) and rebuild at full res.
      if (m.frameCache && (m.frameCache.fps !== fps || m.frameCache.scaled)) FM.clearFrameCache(m);
      // …and again AFTER any in-flight build settles. Belt and braces to the key-aware dedupe in
      // frames.js: this clear is a no-op while a preview build is still running, because frameCache
      // is only assigned when that build finishes. (See the note at buildFrameCache.)
      if (m._building) { try { await m._building; } catch (e) {} if (m.frameCache && (m.frameCache.fps !== fps || m.frameCache.scaled)) FM.clearFrameCache(m); }
      // maxBytes ceiling: a monolithic full-res cache (up to 900 × ~8MB = several GB for a long 1080p/4K
      // reverse clip) OOM-killed mobile Safari. Cap total bytes → long clips lose temporal resolution
      // (frames spread across the clip via effFps) instead of crashing; resolution stays full. (#13)
      if (!m.frameCache) {
        if (onStatus) onStatus('Decoding frames…');
        await FM.buildFrameCache(m, fps, p => { if (onStatus) onStatus('Decoding frames… ' + Math.round(p * 100) + '%'); },
          { maxBytes: 1610612736, shouldAbort: () => FM._exportCancel });
        // …and stop HERE. Without this the decode gives up but the export carries on into the audio
        // mix, the AAC probe, the muxer and the codec pick before the frame loop's first cancel check
        // finally throws — so Cancel still looked ignored for seconds after the decode had stopped.
        if (FM._exportCancel) break;
      }
      built.push(m);
    }
    // Every export path awaits this before its frame loop, so it doubles as the pre-flight step:
    // (a) drop motionflow's temporal plates — they hold PREVIEW history, and the first exported frame
    //     must not blur against (or inherit an echo trail from) whatever was previewed beforehand;
    // (b) prewarm audio-drive behavior envelopes — audioEnvelopeSync is fire-and-forget, so without
    //     this the drive is inert for the first frames of a fresh-session export and pops in mid-file.
    if (FM.resetMotionFlowCache) FM.resetMotionFlowCache();
    /* bughunt2 (Audio Drive export): EVERY HALF OF A SPLIT SOURCE IS WARMED, not just the one holding the stored id.
     * audioDelta resolves the source per frame with FM.clipAt, which hands back whichever half of a split song covers t, and
     * each half keys its own envelope (its own start / trim / duration are in the signature). This loop looked the id up with
     * FM.layerById alone, and a split keeps the stored id on the HEAD half, so only the head was ever prewarmed. In an export
     * from a fresh session the tail half's envelope was cold: the driven layer sat still from the cut onward until the
     * fire-and-forget compute landed, and then popped in partway through the file, the very symptom (b) exists to prevent,
     * moved to the cut. Test `bughunt2 #10` records the pre-flight's calls: on 2eb86dba, for a song split at 2 s, every call
     * names the head's id and none the tail's. The set warmed now is exactly the one FM.clipAt picks from (scene.js): the
     * stored half, plus every layer sharing its `splitOf`. A source never split warms exactly as before, one call on the same
     * layer. `warmed` drops a repeat of the same half with the same opts when several behaviours read one song; different
     * settings still get their own envelope. */
    if (FM.audioEnvelopePrewarm) {
      const warmed = new Set();
      for (const layer of scene.layers) {
        for (const bh of (layer.behaviors || [])) {
          if (!bh || bh.type !== 'audio' || bh.enabled === false || !bh.params) continue;
          const src = bh.params.sourceId ? FM.layerById(scene, bh.params.sourceId) : null;
          if (!src) continue;
          const sRaw = +bh.params.smooth;   // ||-defaulting would turn smooth=0 into 0.4 and miss the cache key
          const smooth = Math.max(0, Math.min(1, isFinite(sRaw) && bh.params.smooth != null ? sRaw : 0.4));
          // EXACTLY the opts audioDelta derives (behaviors.js) — a different key would miss the cache
          const opts = {
            band: bh.params.band, gain: (bh.params.gain != null) ? +bh.params.gain : 1,
            attack: 0.005 + smooth * 0.055, release: 0.03 + smooth * 0.37,
          };
          const halves = src.splitOf ? [src].concat(scene.layers.filter(l => l && l !== src && l.splitOf === src.splitOf)) : [src];
          const optKey = JSON.stringify(opts);
          for (const half of halves) {
            const k = half.id + '\n' + optKey;
            if (warmed.has(k)) continue;
            warmed.add(k);
            try {
              await FM.audioEnvelopePrewarm(half, opts);
            } catch (e) { /* best-effort — a failed decode just leaves the behavior inert, as before */ }
          }
        }
      }
    }
    // (c) decode every clip a Music Visualiser listens to (#966 B11) — the preview decodes on first sight, in the background,
    //     so without this a fresh session's export would draw resting bars until that decode landed, partway into the file.
    if (FM.audioSpectrum && FM.audioSpectrum.prewarm) {
      try { await FM.audioSpectrum.prewarm(scene); } catch (e) { /* best-effort, like the envelopes: a clip that will not decode is silent */ }
    }
    return built;
  }

  /* ---- AUDIO-ONLY M4A (queue 395) --------------------------------------------------------------
   * His words: *"I want more export options like mp3 or whatever"*. MP3 is the ONE format no browser
   * will produce — measured, not assumed (tests/_audiocodecs.html: MP3 unsupported by both WebCodecs
   * AudioEncoder and MediaRecorder, AAC and Opus both supported) — so it would need a CDN library.
   * M4A/AAC costs almost nothing here because every piece already exists for the video path: the same
   * `buildAudioMix`, the same `encodeAudio`, and mp4-muxer, which takes an audio track with no video.
   * WAV stays the default and is untouched: it needs no codec at all, and #215 is the record of what
   * happens when an export depends on one — a browser refused AAC and handed him a silent file.
   *
   * SO THIS PROBES BEFORE IT PROMISES, and reports the reason rather than writing a broken file. Three
   * distinct failures are separated, because #215's whole lesson is that they are different and only
   * one of them was ever visible: no encoder in this browser at all; the encoder rejects THIS mix's
   * shape; the encode itself throws part-way. Each returns a named reason, and the caller offers WAV.
   * Nothing half-written is ever saved — the muxer is finalized only after every chunk is in. */
  async function aacSupported(mix) {
    if (typeof AudioEncoder === 'undefined') return false;
    try {
      const s = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: mix.sampleRate, numberOfChannels: mix.channels, bitrate: 160000 });
      return !!(s && s.supported);
    } catch (e) { return false; }
  }
  async function encodeM4A(mix) {
    if (typeof window.Mp4Muxer === 'undefined') return { blob: null, reason: 'no-muxer' };
    if (!(await aacSupported(mix))) return { blob: null, reason: 'aac-unavailable' };
    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      audio: { codec: 'aac', numberOfChannels: mix.channels, sampleRate: mix.sampleRate },
      // 'in-memory' rather than the video path's streamed false: a soundtrack is ~1.2MB a minute, and
      // an in-memory moov means the file plays from the first byte instead of needing the whole thing.
      fastStart: 'in-memory',
    });
    let n = 0;
    try {
      await encodeAudio((chunk, meta) => { n++; muxer.addAudioChunk(chunk, meta); }, mix);
    } catch (e) {
      console.warn('[export] audio-only AAC encode failed', e);
      return { blob: null, reason: 'encode-failed' };
    }
    // An empty track is the "broken/silent track strict players reject" from queue 215, reached by a
    // route the support probe cannot see. A file with nothing in it is not a file worth saving.
    if (!n) return { blob: null, reason: 'no-chunks' };
    muxer.finalize();
    const buf = muxer.target.buffer;
    if (!buf || !buf.byteLength) return { blob: null, reason: 'empty' };
    const blob = new Blob([buf], { type: 'audio/mp4' });
    /* #215: the file is read back here too (fileAacCheck). An M4A no player can decode is not worth saving: the caller
       writes the WAV instead and says so, as for every other M4A failure. */
    let chk = null;
    try { chk = await fileAacCheck(blob, mix.sampleRate, mix.channels); } catch (e) { chk = null; }
    if (chk && chk.ok === false) {
      console.warn('[export] the M4A’s audio track cannot be decoded: ' + fileAacLine(chk));
      return { blob: null, reason: 'track-undecodable' };
    }
    return { blob: blob, reason: '' };
  }

  /* ═══ ONE BLIT, THREE PATHS — AND IT WAS ONLY EVER IN SCOPE FOR ONE (queue 669) ═══════════════
   * `blit` used to be a `const` declared inside `run()`, and `runGif` and `runFrames` — sibling
   * methods on the same object literal, not nested inside it — called it anyway. It is not in their
   * scope. So BOTH of those formats threw `ReferenceError: blit is not defined` on their first frame
   * and produced no file, and what the user saw was an alert reading "Export failed: blit is not
   * defined". Two of the three export formats were dead.
   * ⚠️ THE INTENT WAS WRITTEN DOWN AND THE CODE NEVER MATCHED IT: the comment above the old
   * declaration says, in as many words, that blit "is shared by the MP4, GIF and frame paths".
   * It cannot simply be hoisted — it closes over six locals of run() — so it becomes a factory each
   * path builds with its own. `fit` may be null: without a custom size the GIF and PNG paths derive
   * their size from the project's own aspect, so they never letterbox, and passing null says that
   * rather than making them compute an identity rectangle to satisfy a signature. With one they
   * letterbox like the MP4 (queue 690). */
  /* ⚠️ EVERY FRAME STARTS FROM AN EMPTY CANVAS (queue 690, fifth hunt). Only the letterboxed case used to clear:
   * without bars the frame was drawn straight OVER the previous one, and drawImage leaves whatever is under a
   * transparent pixel. The GIF and PNG paths clear before calling this; the MP4 path never did, so any frame with
   * a transparent pixel in it — a clipping mask's cut, a project whose background is transparent — kept an earlier
   * frame there, and a moving shape left a trail of every place it had been, in the file only (the preview clears
   * its canvas every frame). Measured: a clipping-mask circle sliding across a photo still showed the photo where
   * it started in the last 6 of 30 frames. Clearing here puts the rule in the one blit all three paths share. */
  function makeBlit(projCanvas, outW, outH, fit, barFillNow) {
    return function (ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const barFill = (fit && fit.letterboxed && barFillNow) ? barFillNow() : null;
      if (barFill) { ctx.fillStyle = barFill; ctx.fillRect(0, 0, outW, outH); }
      else ctx.clearRect(0, 0, outW, outH);   // no bars, or a transparent export's bars: nothing of the last frame survives
      if (fit) ctx.drawImage(projCanvas, fit.dx, fit.dy, fit.dw, fit.dh);
      else ctx.drawImage(projCanvas, 0, 0, outW, outH);
      ctx.restore();
    };
  }

  // The letterbox bars' colour for the GIF and PNG paths, asked for per frame for the reason run() gives
  // at its own barFillNow: a transparent export sets its flag after the blit is built, and keeps clear bars.
  function stillBarFill(P) {
    return function () { return (FM._exportTransparent || P.background == null) ? null : P.background; };
  }

  /* bughunt6 #12: THE MOST FRAMES A PNG SEQUENCE HOLDS. runFrames refuses more (every frame is zipped in memory); the Export
     card (js/export-card.js) reads the same number to say so, and grey Export, before he taps it. */
  const FRAMES_MAX = 900;

  FM.exporter = {
    prepareCaches,
    /* suite seam (Simple 2.7): the frame path's own seek, so a test can run it without encoding */
    seekAllVideos,
    buildAudioMix,
    mediaBack,   // bughunt3 #2: FM.snapshotPNG (js/app.js) waits through it too
    encodeM4A,
    aacSupported,
    FRAMES_MAX,
    async run(opts) {
      endAudition();   // queue 916 — see endAudition
      if (typeof VideoEncoder === 'undefined' || typeof window.Mp4Muxer === 'undefined') {
        throw new Error('NO_WEBCODECS');
      }
      const scene = FM.scene, P = scene.project;
      const scale = opts.scale || 1, fps = opts.fps || P.fps || 30;
      /* CUSTOM OUTPUT SIZE (queue 141). Ezra: "there's no way to do custom export ratios, or fps."
       * Everything here used to derive the output from ONE uniform scale, so the export could only ever
       * have the project's own aspect. opts.outW/outH let it differ; when they are absent this is the
       * old arithmetic exactly, so the ordinary path is untouched.
       * Even numbers because H.264 chroma subsampling needs them and an odd dimension is rejected by
       * some encoders outright. */
      const custom = opts.outW > 0 && opts.outH > 0;
      const outW = Math.max(2, Math.round((custom ? opts.outW : P.width * scale) / 2) * 2);
      const outH = Math.max(2, Math.round((custom ? opts.outH : P.height * scale) / 2) * 2);
      /* CONTAIN, never crop. Exporting 9:16 work as 1:1 has to letterbox: cropping would silently throw
       * away part of the frame, and a video editor must never quietly delete what you made. The bars
       * take the project's own background colour so they read as the frame, not as damage. */
      const fit = FM.exportFitRect(P.width, P.height, outW, outH);
      /* READ AT DRAW TIME, not here. This used to be computed once at setup, which worked only because
         a transparent export blanked P.background before rendering — the very mutation that could be
         autosaved and lose your background for good. With that gone, a setup-time read would give
         transparent GIFs COLOURED letterbox bars. `blit` is shared by the MP4, GIF and frame paths and
         all three set the flag after this line, so the fill has to be asked for per frame. */
      const barFillNow = () => (FM._exportTransparent || P.background == null) ? null : P.background;
      const bitrate = Math.min(80e6, opts.bitrate || Math.round(outW * outH * fps * 0.12));   // cap so 4K60 doesn't choke the encoder
      const start = (opts.from != null) ? Math.max(0, opts.from) : 0;
      const end = (opts.to != null) ? Math.min(P.duration, opts.to) : P.duration;
      const totalFrames = Math.max(1, Math.round((end - start) * fps));
      FM._exportCancel = false;
      resetSeekWatch();
      /* ⚠️ v14.35 — AND THE REPORT COULD LIE, WHICH MATTERS MORE THAN ANY OF THE MESSAGES, BECAUSE THE
       * REPORT IS THE ARTIFACT THIS ENTRY SAYS DECIDES THE CASE. `FM._audioTrackDropped` had no
       * per-run reset. Its only clear is inside `if (mix)` and is guarded `!== 'mix-silent'`, so:
       *   · after ONE muted export, every later export in the same session — including a perfectly
       *     healthy one — reported "NO SOUND — every audio clip is muted or at zero volume", on the
       *     ready card AND in the report he is asked to paste;
       *   · and after any other reason, a later export of a project with NO audio at all takes the
       *     `mix === null` route, skips that whole block, and inherits the previous reason.
       * So the one piece of evidence this entry has waited three months for could be a stale copy of an
       * earlier export's verdict, with nothing on screen saying so. `_lastAudioDrops` and
       * `_lastAudioSuppressed` carry over the same way — worse, they are assigned AFTER the mixer's
       * OfflineAudioContext is constructed, so an OOM there (the phone theory in this very entry)
       * throws first and the report ships the PREVIOUS export's drop list as if it were this one's.
       * Only run() resets these: runGif and runFrames build no soundtrack, so they have no verdict to
       * clear and clearing one there would only discard the last real answer. */
      FM._audioTrackDropped = null;
      FM._lastAudioDrops = [];
      FM._lastAudioSuppressed = [];
      /* …AND THE MIX'S OWN NUMBERS, which the list above missed (queue 893). The report prints `mix peak` from
       * these, and buildAudioMix only writes them AFTER `if (!any) return null` — so an export that builds no
       * mix (the audio layers deleted, or the OfflineAudioContext throwing on a long project) printed the
       * PREVIOUS export's peak and gain beside `audio NO TRACK`, describing a mix that was never built.
       * The same carry-over this block was written to end, in three fields nobody added to it. The suite now
       * checks that every FM global the report reads is reset here, so a new report line cannot drift the same way. */
      FM._lastMixRawPeak = null;
      FM._lastMixGain = null;
      FM._lastMixPeak = null;
      FM._lastAacDesc = null;   // #215: the report's aac desc line, written by encodeAudio
      /* ⚠️ AND THE NOTE IS CLEARED HERE, IN run(), NOT ONLY IN THE CALLER. js/app.js clears it too, but
       * that is the click handler — so every other entry point (the suite, a re-render, anything added
       * later) would carry the LAST export's warning onto this one's card. That is the same defect as
       * the stale flag directly above, in a different medium, and it would be read the same way: a
       * warning about an export that already finished, sitting on the screen of one that is fine.
       * Safe here: the crash-resume note is written much later in run(), long after this. */
      try {
        const _n = document.getElementById('export-note');
        if (_n) { _n.textContent = ''; _n.classList.add('hidden'); _n.classList.remove('export-note-warn'); }
      } catch (e) {}

      /* bughunt6 #3: THE CODEC IS PICKED HERE, before the decode and the mix, so a frame the encoder refuses stops the export
       * at once and says its size (largestMp4Size). It used to be picked after both. The same single probe as before, moved:
       * `codec` below is this one. */
      let codec = null;
      try { codec = await pickVideoCodec(outW, outH, fps, bitrate); }
      catch (e) {
        if (!e || e.message !== 'NO_VIDEO_CODEC') throw e;
        const fits = await largestMp4Size(outW, outH, fps, bitrate);
        if (!fits) throw e;
        const big = new Error('VIDEO_TOO_BIG');
        big.fmSize = { w: outW, h: outH, fitW: fits.w, fitH: fits.h, custom: custom };
        throw big;
      }

      const projCanvas = document.createElement('canvas');
      projCanvas.width = P.width; projCanvas.height = P.height;
      const projCtx = projCanvas.getContext('2d');
      /* ⚠️ BUILT HERE, NOT WHERE THE OLD `blit` SAT. The original was a closure and read `projCanvas`
         lazily at call time, so its position above the declaration was harmless. A factory takes the
         canvas as a VALUE, so constructing it early threw "Cannot access 'projCanvas' before
         initialization" — caught by the suite on the first run after the change, in eight tests. */
      const blit = makeBlit(projCanvas, outW, outH, fit, barFillNow);
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW; outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d');

      // smooth slow-mo / reverse: build frame caches at the export fps so the output matches preview
      let exportCaches = [];
      try { exportCaches = (await prepareCaches(scene, fps, s => opts.onProgress && opts.onProgress(0, s, true))) || []; } catch (e) { console.warn('cache prep failed', e); }

      FM._exporting = true;   // tells the compositor to skip the preview-only hold-frame capture/substitution (#13,#22)
      // Hoisted out of the try so the finally can shut the recorder down before deciding what to keep.
      let delivered = false, recorder = null, poster = null, releaseVideos = null;
      try {
      /* CANCEL DURING "Decoding frames…" STOPS HERE (queue 916, clause 3). prepareCaches breaks out of its
       * loop on the flag, and its own comment says that stops the export going on into "the audio mix,
       * the AAC probe, the muxer and the codec pick" — but nothing here ever looked, so it went on into
       * all four and only threw at the frame loop's first check. Measured: a 3-minute song, Cancel during
       * the prepare phase, 5120 ms (desktop) of mixing and AAC-encoding a soundtrack that was about to
       * be thrown away before the overlay came down, with Cancel looking ignored the whole time.
       * Thrown INSIDE the try so the finally still frees the caches and bins the resume data. The same
       * question is asked again after the two long awaits below (the mix and the AAC encode), which
       * are the other places a Cancel tap can land and then wait. */
      if (FM._exportCancel) throw new Error('CANCELLED');
      // queue 690: no timeline filmstrip seeks these elements while this export is stepping them
      releaseVideos = await holdVideoElements(scene, s => opts.onProgress && opts.onProgress(0, s, true));
      // audio (best-effort: never let it sink the whole export)
      let mix = null;
      /* THE FIFTH SILENT LOSS, and the last one left in this file (queue 47, v11.67). The other four
       * were each made to speak in v7.90-v11.21; this one stayed a bare console.warn, and it is the
       * BROADEST of them — anything at all that throws out of the mixer lands here and ships a mute
       * file. A phone running out of memory building the offline buffer for a long project reaches
       * exactly this line, and a long project is precisely the export Ezra has not tried yet.
       * It cannot prevent the loss — it makes the loss say something, which is the difference between
       * an unreproducible report and a one-line answer. */
      try { mix = await buildAudioMix(scene, start, end); }
      catch (e) {
        console.warn('[export] the soundtrack could not be built — exporting video only', e);
        FM._audioTrackDropped = 'mix-failed';
        exportSay('The soundtrack could not be built — exporting WITHOUT SOUND');
        if (FM.toast) FM.toast('The soundtrack could not be built — exporting WITHOUT SOUND', 6000);
        mix = null;
      }
      if (FM._exportCancel) throw new Error('CANCELLED');   // queue 916 — tapped while the mix rendered

      // Only declare an audio track if AAC encoding will actually work (it's unavailable on some iOS
      // Safari versions). Otherwise the muxer commits an empty audio track to the moov → a broken/silent
      // track that strict players reject. Probe with the SAME config encodeAudio() uses.
      if (mix) {
        let audioOK = false;
        try {
          if (typeof AudioEncoder !== 'undefined') {
            const s = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: mix.sampleRate, numberOfChannels: mix.channels, bitrate: 160000 });
            audioOK = !!(s && s.supported);
          }
        } catch (e) { audioOK = false; }
        /* THIS IS A SILENT AUDIO LOSS AND IT NOW SPEAKS (queue 215, v7.91). Until this release the whole
         * of it was a console.warn: if the AAC probe failed the export quietly became video-only, with
         * nothing on screen to say so. That is Ezra's report word for word — "pressed export with some
         * pretty normal export settings and got an audioless clip" — and it is a DIFFERENT failure from
         * the one v7.90 made visible: there the mixer could not read a clip, here the mix was built
         * perfectly and is then thrown away wholesale because the encoder cannot take it. v7.90's
         * reporting stays quiet in this case, which is exactly what he described.
         * Worth being precise about the cause, because the comment above is easy to misread as "old
         * iOS": AudioEncoder support is a property of the BROWSER, so the same project exports with
         * sound in one and without it in another, on the same machine, with no setting changed. That is
         * why this has been so hard to pin down from a description. */
        if (!audioOK) {
          console.warn('AAC audio encoding unavailable in this browser — exporting video only');
          FM._audioTrackDropped = 'aac-unavailable';
          exportSay('This browser cannot encode AAC — exporting WITHOUT SOUND');
          if (FM.toast) FM.toast('This browser cannot encode AAC — exporting WITHOUT SOUND', 6000);
          mix = null;
        /* ⚠️ …but do NOT wipe a loss the MIXER already reported. This line clears the flag on the happy
           path, and it runs AFTER buildAudioMix — so a mix that rendered pure silence (`mix-silent`,
           set at the end of buildAudioMix) had its flag cleared here one line before anyone could read
           it. The toast still fired, which is what makes it nasty: the screen said one thing and the
           flag the suite and the caller key off said another. */
        } else if (FM._audioTrackDropped !== 'mix-silent') FM._audioTrackDropped = null;
      }

      /* CRASH-RESUME (#47, the second half). The codec has to be picked BEFORE the muxer now, because
       * it is part of the signature that decides whether a saved job belongs to THIS export. Nothing
       * else about the move matters — pickVideoCodec only probes the encoder. */
      // bughunt6 #3: `codec` was picked at the top of run(), before the decode and the mix: the same probe, made once
      const frameDurUs = 1e6 / fps;
      const XR = FM.exportResume;
      let sig = null, saved = null;
      if (XR) {
        try {
          sig = XR.signature({ project: P, layers: scene.layers, w: outW, h: outH, fps: fps,
                               bitrate: bitrate, codec: codec, from: start, to: end,
                               frames: totalFrames, audio: !!mix });
          saved = await XR.load(sig);
        } catch (e) { console.warn('resume lookup failed', e); sig = sig || null; saved = null; }
      }

      /* ENCODE THE SOUNDTRACK BEFORE THE MUXER EXISTS — so the file can never promise a track it does
       * not have (queue 215).
       *
       * The audio track used to be DECLARED at muxer construction and encoded at the very end. If that
       * encode threw, the swallow that caught it shipped a file whose moov advertises an audio track
       * that was never fed — the exact "broken/silent track that strict players reject" the AAC probe
       * upstream exists to prevent, arriving by a route the probe cannot see: the probe answers "can
       * this browser encode AAC at all", not "did THIS encode survive". Such a file plays silently in
       * one player and is refused outright by another, which is the worst of the three ways a
       * soundtrack was being lost, because it is the one that produces a file that looks fine.
       * Encoding first turns that into an ordinary, honest, silent video: if it throws, `mix` is
       * dropped BEFORE the muxer is built, so no audio track is declared at all.
       * The cost is holding the encoded audio in memory for the render — AAC at 160kbps is about
       * 1.2MB a minute, which is nothing beside the video, and it is freed as soon as it is muxed. */
      let audioChunks = null, audioStats = null;   // AX2: what the encoder really produced (frames, bytes, seconds, decoded peak)
      if (mix) {
        audioChunks = [];
        try {
          await encodeAudio((chunk, meta) => audioChunks.push({ chunk: chunk, meta: meta }), mix);
        } catch (e) {
          console.warn('[export] the soundtrack failed to encode — exporting video only', e);
          FM._audioTrackDropped = 'encode-failed';
          // v14.35: toast-only until now, so on a phone this one was painted under the overlay and
          // never seen — the very failure #215 is about, on one of the six paths that can cause it.
          exportSay('The soundtrack failed to encode — exporting WITHOUT SOUND');
          if (FM.toast) FM.toast('The soundtrack failed to encode — exporting WITHOUT SOUND', 6000);
          mix = null; audioChunks = null;
        }
        /* AX2: AN ENCODER THAT SAYS NOTHING IS NOT A SOUNDTRACK. The throw above is the only way this path knew it had failed; an
           encoder that accepts the whole mix and never calls `output` (and never errors) left an EMPTY chunk list, the muxer
           still declared an audio track for it, and the report, the ready card and the paste all said "TRACK WRITTEN" / "Sound ✓"
           for a file that was mute (the audio-only M4A path has refused exactly this since v9.x: `no-chunks`). Same treatment as
           a throw: no track is declared at all. Whether his iPhone's encoder ever does this is unproven; the count below is how
           the next paste will say. */
        if (mix && audioChunks && !audioChunks.length) {
          console.warn('[export] the audio encoder produced no chunks at all — exporting video only');
          FM._audioTrackDropped = 'encode-empty';
          exportSay('The soundtrack came out empty — exporting WITHOUT SOUND');
          if (FM.toast) FM.toast('The soundtrack came out empty — exporting WITHOUT SOUND', 6000);
          mix = null; audioChunks = null;
        }
        if (mix && audioChunks) {
          let bytes = 0; audioChunks.forEach(g => { bytes += g.chunk.byteLength || 0; });
          const lastC = audioChunks[audioChunks.length - 1].chunk;
          audioStats = { frames: audioChunks.length, bytes: bytes, seconds: ((lastC.timestamp || 0) + (lastC.duration != null ? lastC.duration : AAC_FRAME / mix.sampleRate * 1e6)) / 1e6, peak: await decodedPeak(audioChunks) };
        }
        if (FM._exportCancel) throw new Error('CANCELLED');   // queue 916 — tapped while the soundtrack encoded
      }

      // Stream the file out to disk-backed blob storage instead of holding it whole on the JS heap.
      // fastStart:false is what makes that possible — see createMp4Sink for the mechanism and the
      // one cost (the output is no longer progressive-play). (#47)
      const sink = createMp4Sink('video/mp4');
      const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.StreamTarget({ onData: sink.onData }),
        video: { codec: 'avc', width: outW, height: outH },
        audio: mix ? { codec: 'aac', numberOfChannels: mix.channels, sampleRate: mix.sampleRate } : undefined,
        fastStart: false,
      });

      /* Replay whatever survived the crash into the fresh muxer, then start the frame loop where it
       * left off. Re-muxing is a byte copy, not an encode, so this is milliseconds however long the
       * saved run was, and replayInto streams it one batch at a time so the heap never holds more
       * than one.
       *
       * The authority on where to pick up is what was ACTUALLY fed, not what the job record claimed —
       * a torn write makes those two different, and trusting the claim would leave a gap.
       *
       * A throw here can only come from the muxer rejecting a chunk, and by then chunks are already in
       * it, so there is no clean way to carry on. Bin the saved render and fail this one export: the
       * next attempt then starts from zero and works, which beats a resume that fails forever. */
      let resumeFrom = 0, replayed = null, resumedPct = 0, resumedParts = 0;
      if (saved) {
        try {
          replayed = await XR.replayInto(muxer, saved);
        } catch (e) {
          console.warn('resume replay failed — discarding the saved render', e);
          try { await XR.clear(); } catch (e2) {}
          throw e;
        }
        if (replayed.chunks > 0) resumeFrom = Math.max(0, Math.min(totalFrames, XR.nextFrameForTs(replayed.lastTs, frameDurUs)));
        else { saved = null; replayed = null; }
      }
      if (resumeFrom > 0) {
        /* ⚠️ `true` = SHOW THIS VERBATIM, and without it the caller mangles it. js/app.js renders every
           status as `'Encoding ' + what + '… ' + pct + '%'`, so this arrived on screen as
           "Encoding picking up where the last render stopped… 60%" — for one frame, before the next
           frame's "Encoding audio + video… 61%" wiped it. Same for the preroll line below and for
           prepareCaches, which sends whole sentences like "Decoding frames… 42%" and so has been
           reading "Encoding Decoding frames… 42%… 0%" on EVERY export with a video layer. */
        resumedPct = Math.round(resumeFrom / totalFrames * 100);
        resumedParts = replayed ? replayed.parts : 0;
        if (opts.onProgress) opts.onProgress(resumeFrom / totalFrames, 'Picking up where the last render stopped…', true);
        /* THE NOTE, not a toast. The toast stays for any caller with no overlay, but it is invisible
           behind this one — see the comment in index.html. */
        /* The verb agrees too. The first cut pluralised the NOUN and not the VERB and produced "The 1
           part already rendered were kept" — measured, in a real resumed export, not spotted by eye. */
        if (opts.onNote) opts.onNote('Picking up an interrupted export at ' + resumedPct + '%. ' +
          (resumedParts === 1 ? 'The part already rendered was kept'
                              : 'The ' + resumedParts + ' parts already rendered were kept') +
          ', so that time is not being spent again.');
        if (FM.toast) FM.toast('Picking up the interrupted export at ' + resumedPct + '%', 3000);
      } else if (XR && sig) {
        // Starting fresh: sweep any older job's parts so two exports' leftovers never share the store.
        try { await XR.clear(); } catch (e) {}
      }

      recorder = (XR && sig)
        ? XR.createRecorder(sig, { parts: replayed ? replayed.parts : 0, bytes: replayed ? replayed.bytes : 0,
                                   lastTs: replayed ? replayed.lastTs : -1,
                                   config: saved ? saved.config : null })
        : null;

      /* ⚠️ THE ERROR IS HELD AND RETHROWN, NOT JUST LOGGED (queue 671). This used to be
       * `error: e => console.error('video encode', e)` — so a hardware encoder failure mid-render went
       * to the console, the frame loop carried on, and the export FINISHED and handed over a file built
       * from whatever chunks happened to arrive. A silently truncated or corrupt video is worse than a
       * failed export, because nothing tells you to do it again.
       * The AUDIO encoder eleven hundred lines up already does exactly this — `encErr = e` and
       * `if (encErr) throw encErr` after its flush. Same shape, and the asymmetry was the whole of the
       * QA report's point. Thrown after flush() so the encoder is drained first. */
      let vidErr = null;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => { muxer.addVideoChunk(chunk, meta); if (recorder) recorder.add(chunk, meta); },
        error: e => { vidErr = e; console.error('video encode', e); },
      });
      encoder.configure({ codec, width: outW, height: outH, bitrate, framerate: fps });

      /* WARM THE TEMPORAL EFFECTS BACK UP BEFORE RECORDING AGAIN.
       *
       * Motion Blur (Content), Frame Stutter, the temporal denoiser and the time warp each render
       * frame N from frame N-1 — and the echo-trail style from the whole preceding run. prepareCaches
       * wipes that state before every export, which is right (an export must not inherit whatever was
       * on screen during preview). But a resume then starts the loop in the MIDDLE with the state
       * cleared, so the frame at the seam renders cold: a built-up echo trail vanishes for a frame and
       * ramps back in over the next second. That is a visible flash in the middle of the finished file,
       * and it would only ever appear in a resumed export — the hardest kind of bug to be told about.
       *
       * So re-render the frames leading up to the seam WITHOUT encoding them, purely to rebuild the
       * history. Nothing is emitted, so the output is unaffected; it just costs a few frames of render
       * time, and only for a project that actually carries one of those effects. */
      // fps + the seam's project time: Time Warp Scan's pre-roll is its own elapsed sweep, not a constant (queue 839)
      const preroll = XR ? XR.prerollFrames(scene, fps, start + resumeFrom / fps) : 0;
      if (resumeFrom > 0 && preroll > 0) {
        const warmFrom = Math.max(0, resumeFrom - preroll);
        if (opts.onProgress) opts.onProgress(resumeFrom / totalFrames, 'Warming the effects back up at the join…', true);
        for (let f = warmFrom; f < resumeFrom; f++) {
          if (FM._exportCancel) { encoder.close(); throw new Error('CANCELLED'); }
          const t = start + f / fps;
          await seekAllVideos(scene, t);
          FM.renderScene(projCtx, scene, t);   // rendered for its side effect on the temporal caches only
          await nextTick();
        }
      }

      for (let f = resumeFrom; f < totalFrames; f++) {
        if (FM._exportCancel) { encoder.close(); throw new Error('CANCELLED'); }
        const t = start + f / fps;
        await seekAllVideos(scene, t);
        FM.renderScene(projCtx, scene, t);
        blit(outCtx);
        /* A small still of the first frame we encode, for the "export ready" card (queue 141 part 4).
         * Taken from the FIRST frame rather than the last, because the last frame of a video is very
         * often black — a fade-out, or simply the end — and a card whose picture is a black rectangle
         * tells you nothing about what you just made. Capped at 320px: it is a thumbnail on a card. */
        if (!poster && opts.onReady) {
          try {
            poster = document.createElement('canvas');
            const pk = Math.min(1, 320 / Math.max(outW, outH));
            poster.width = Math.max(1, Math.round(outW * pk));
            poster.height = Math.max(1, Math.round(outH * pk));
            poster.getContext('2d').drawImage(outCanvas, 0, 0, poster.width, poster.height);
          } catch (e) { poster = null; }
        }
        const frame = new VideoFrame(outCanvas, { timestamp: Math.round(f * frameDurUs), duration: Math.round(frameDurUs) });
        // `f === resumeFrom` forces the seam to be an IDR. A fresh encoder would almost certainly open
        // with one anyway, but "almost certainly" is not a thing to hang a file's decodability on.
        encoder.encode(frame, { keyFrame: f % (fps * 2) === 0 || f === resumeFrom });
        frame.close();
        while (encoder.encodeQueueSize > 8) await nextTick();
        // ONE unconditional yield per frame. Without it this loop only ever returned to the event
        // loop when the encoder fell behind — so on a machine whose encoder keeps up, the whole
        // export was a single unbroken task: measured at 763ms for 360 frames, four progress widths
        // painted, and Cancel NEVER honoured (the export ran to completion). One await drops the
        // longest task to 54ms and lands Cancel in 148ms. nextTick, not setTimeout, because a
        // backgrounded tab clamps setTimeout ~84x (211 ticks/s -> 2.5/s) and turns a 60-frame MP4
        // from 239ms into 3900ms; MessageChannel is not throttled. runGif already did this. (#47)
        await nextTick();
        if (opts.onProgress) opts.onProgress((f + 1) / totalFrames, mix ? 'audio + video' : 'video');
      }

      await encoder.flush();
      /* Rethrown here rather than inside the callback: a throw from the encoder's own error handler
         does not reach this async function, it becomes an unhandled rejection and the export keeps
         going — which is the same silence in a different costume. */
      if (vidErr) throw vidErr;
      encoder.close();
      reportSeekWatch();   // every frame is in the encoder now, so the tally is final
      // …and the elements are free again (queue 690): the ready card can sit open for as long as he likes,
      // and the timeline's thumbnails need not wait for it. The finally releases too, for every other exit.
      if (releaseVideos) { releaseVideos(); releaseVideos = null; }
      // Save the last partial batch. The export is about to finalize, but finalizing is exactly where a
      // long render is most likely to be OOM-killed, and a resume should not have to redo the tail.
      if (recorder) { try { await recorder.settle(); } catch (e) {} }
      /* THE THIRD SILENT WAY TO LOSE THE SOUND (queue 215, v7.92), and the worst of the three, because
       * by this point the muxer has ALREADY declared an audio track: `audio: mix ? {...} : undefined`
       * is decided far above, when the mix still existed. So if the encode throws here, the swallow
       * below does not merely drop the sound — it ships a file whose moov promises an audio track that
       * was never fed. That is the exact "broken/silent track that strict players reject" the AAC probe
       * upstream was written to prevent, arriving by a route the probe cannot see: the probe answers
       * "can this browser encode AAC at all", not "did this particular encode survive".
       * Kept as a swallow on purpose — a failed soundtrack must not throw away a render that may have
       * taken minutes — but it says so now, and it distinguishes itself from the other two paths so the
       * toast alone tells you which half of the pipeline broke. */
      /* Nothing can fail here any more: these chunks were produced before the muxer was built, and the
         muxer only declared an audio track BECAUSE they exist. Adding a chunk is a byte copy. */
      if (audioChunks) { for (const a of audioChunks) muxer.addAudioChunk(a.chunk, a.meta); audioChunks = null; }
      muxer.finalize();
      /* HAND THE FILE OVER, or hand it to whoever asked to present it (queue 141 part 4).
       * `onReady` lets the caller put its own card in front of the OS save sheet — which is the whole
       * of what "our own pop up" can honestly mean, since navigator.share needs a real user gesture and
       * nothing on the web can write to a camera roll without the sheet. `save` is the same deliver()
       * this line always called, handed over as a closure so the caller does not need the blob's
       * plumbing and cannot deliver something else by mistake.
       * Absent, the behaviour is exactly what it was, which is what keeps the GIF and PNG paths and
       * every existing test on the old road. */
      const outBlob = sink.finish();
      const outName = (opts.name || 'freemotion-export') + '.mp4';
      /* #215: THE FILE IS READ BACK, NOT TRUSTED (fileAacCheck, beside the repair it checks). A track no player can decode
         is no sound at all, so it is named like every other loss: the flag, the card's NO SOUND, the report, never Sound ✓.
         Only the moov is read, so a long export pays a few KB for it, not a second pass over the file. */
      let fileAac = null;
      if (mix) {
        try { fileAac = await fileAacCheck(outBlob, mix.sampleRate, mix.channels); }
        catch (e) { fileAac = { ok: null, why: 'could not be read: ' + ((e && e.message) || e) }; }
        if (fileAac.ok === false) {
          console.warn('[export] the finished file’s audio track cannot be decoded: ' + fileAacLine(fileAac));
          FM._audioTrackDropped = 'track-undecodable';
          exportSay('The audio track in the file cannot be played — this file has NO SOUND');
          if (FM.toast) FM.toast('The audio track in the file cannot be played — this file has NO SOUND', 6000);
        }
      }
      const trackBad = !!(fileAac && fileAac.ok === false);
      if (typeof opts.onReady === 'function') {
        /* ═══ THE CARD MUST SAY WHETHER IT HAS SOUND (queue 215) ══════════════════════════════════
         * This file has FIVE separate audio-loss reports — all-suppressed, mix-silent, mix-failed,
         * aac-unavailable, encode-failed — and every one of them speaks through `FM.toast`.
         * 🚨 **EVERY ONE OF THEM IS PAINTED BEHIND THE EXPORT OVERLAY.** `#toast` is z-index 60 and
         * `#export-overlay` is 100, `position: fixed; inset: 0`, `rgba(0,0,0,.65)` with a 3px blur —
         * siblings in the root stacking context, and app.js raises the overlay before `run()` is even
         * called, for the whole export. So Ezra's *"I don't think I got a message saying no audio"* is
         * explained by the MESSAGING, not by a sixth silent path — and #215's inference from it
         * ("no toast + a silent file ⇒ the muxer") never held. #604 later measured the muxer, the moov
         * and a decoded round-trip and found all three healthy, which is the same conclusion arrived at
         * the expensive way.
         * The answer travels with the file now, onto the one card he is looking at when he presses
         * Save. It cannot be missed, cannot time out, and cannot be painted behind anything. */
        /* ═══ AND IT IS WRITTEN DOWN, so his next report is a FACT rather than a description ═════════
         * Queue 604/215/662. He has reported a silent export four times, and every round has ended the
         * same way: everything measurable on a desktop is healthy, and the one device it happens on
         * cannot be inspected. On 28 Aug he settled the biggest unknown himself — *"The export issues I
         * have were on mobile, I don't got my pc rn but I've exported pc before just fine"* — which
         * retires the "both devices" premise both entries were built on and points the whole search at
         * iOS Safari.
         * Every one of these values already existed and had NO READERS outside the suite. Stored, they
         * turn "no audio" into a block of text he can paste from the device where it happens — the same
         * thing `fm.lastPerfReport` did for the lag reports, which is the only reason those ever moved.
         * ⚠️ Wrapped in try/catch and never awaited: a full storage quota or a private-mode throw must
         * not be able to fail an export that has otherwise just succeeded. */
        try {
          const rep = [
            'FreeMotion export report',
            'when       ' + new Date().toISOString(),
            'file       ' + outName + '  ' + Math.round(outBlob.size / 1024) + ' KB',
            'video      ' + outW + 'x' + outH + ' @' + fps + 'fps, ' + Math.max(0, end - start).toFixed(2) + 's',
            'audio      ' + (mix ? 'TRACK WRITTEN' + (audioStats ? ' · ' + audioStats.frames + ' frames · ' + (audioStats.bytes / 1024).toFixed(1) + ' KB · ' + audioStats.seconds.toFixed(2) + 's' : '') : 'NO TRACK'),
            'decoded peak ' + (audioStats ? (audioStats.peak == null ? '- (could not be measured on this browser)' : audioStats.peak.toFixed(3)) : '-'),
            // #215: what the AAC encoder described its sound as, what the file was given, and what the finished file says
            'aac desc   ' + (mix ? aacDescLine(FM._lastAacDesc) : '-'),
            'file audio ' + (mix ? fileAacLine(fileAac) : '-'),
            'dropped    ' + (FM._audioTrackDropped || 'no'),
            'mix peak   ' + (FM._lastMixRawPeak == null ? '-' : FM._lastMixRawPeak.toFixed(3)) +
              (FM._lastMixGain != null && FM._lastMixGain < 1 ? '  (limited: x' + FM._lastMixGain.toFixed(3) + ' at the loudest overlap only)' : ''),
            'drops      ' + JSON.stringify(FM._lastAudioDrops || []),
            'suppressed ' + JSON.stringify(FM._lastAudioSuppressed || []),
            'AAC encode ' + (typeof AudioEncoder === 'undefined' ? 'AudioEncoder MISSING in this browser' : 'AudioEncoder present'),
            // v14.33: was `ctxFilterOK() ? 'OK' : 'THIS DEVICE CANNOT RUN CANVAS FILTERS'`, which had
            // been false on his own phone since v14.02 — see FM.fxHealth in js/compositor.js.
            'canvas fx  ' + (FM.fxHealth ? FM.fxHealth().line : '?'),
            /* ⚠️ #47, v14.34. Crash-resume has worked since v7.53 and NOTHING recorded that it fired —
               so there has never been a way to know whether it has ever run on his phone, which is the
               one fact four releases of work cannot establish from here. It is written down now, and
               `no` is as much of an answer as a percentage. */
            'resumed    ' + (resumedPct > 0 ? 'YES — picked up at ' + resumedPct + '% from ' + resumedParts + ' saved part' + (resumedParts === 1 ? '' : 's') : 'no (rendered start to finish)'),
            /* AND WHETHER THE SAFETY NET WAS EVEN UP. XR.createRecorder gives up silently on a quota
               error or a torn write (js/export-resume.js sets `dead = true` in two places and says
               nothing), and `recorder.recording` was exposed for this and never read by anyone. A
               crash during an export whose protection had already died looks identical, from here, to
               a crash during one that was protected — and that is the difference between "resume is
               broken" and "there was nothing to resume from". */
            /* ⚠️ `capped` IS NOT A FAULT and must not be reported as one. The recorder stops at 512MB
               ON PURPOSE (js/export-resume.js MAX_BYTES), so `recording` — which is `!dead && !capped`
               — goes false on a long, perfectly healthy export. Lumping the two together would make
               this line cry wolf on exactly the big renders where crash protection matters most, which
               is the same wrong-warning defect v14.33 just removed from the other reports.
               Read at this point on purpose: settle() (line ~1039) only flushes, and stop() — which
               sets dead deliberately — does not run until the finally at ~1148. So `dead` here means
               something genuinely failed. */
            'protected  ' + (!recorder ? 'NO — crash-resume is not available in this browser'
                            : recorder.recording ? 'yes, the whole way'
                            : recorder.capped ? 'up to the 512MB cap, then stopped saving on purpose (the render itself was never at risk)'
                            : 'NO — protection stopped part-way: the store refused a write (out of space, or private browsing)'),
            'device     ' + (navigator.userAgent || '').slice(0, 120),
          ].join('\n');
          localStorage.setItem('fm.lastExportReport', rep);
        } catch (e) {}
        await opts.onReady({
          blob: outBlob, name: outName, poster: poster,
          width: outW, height: outH, fps: fps, seconds: Math.max(0, end - start),
          hasAudio: !!mix && !trackBad, audioDropped: FM._audioTrackDropped || null,
          resumedPct: resumedPct, resumedParts: resumedParts,
          protected: !recorder ? null : (recorder.recording ? true : recorder.capped ? 'capped' : false),
          save: () => deliver(outBlob, outName),
        });
      } else {
        await deliver(outBlob, outName);
      }
      delivered = true;
      } finally {
        // Free the full-res export frame caches (built by prepareCaches) on success, cancel, OR error so
        // a heavy reversed/slow clip doesn't keep multiple GB resident and OOM mobile Safari. Preview
        // re-decodes a lightweight downscaled cache on the next scrub/play. (#3)
        exportCaches.forEach(m => { try { FM.clearFrameCache(m); } catch (e) {} });
        if (releaseVideos) releaseVideos();   // queue 690 — any strip that waited on the export is drawn now
        FM._exporting = false;
        if (FM.releaseTiltPools) FM.releaseTiltPools();   // bughunt8 #9: the export-sized tilt plates go back (compositor.js)
        /* Throw the saved chunks away on a finished file and on Cancel — the first has nothing left to
         * resume, and the second is someone saying they no longer want it. Any OTHER exit keeps them:
         * an exception on the way out is precisely the case this whole file exists for, and deleting
         * the render on the way past would be the bug, not the tidy-up. (A real crash never reaches
         * this block at all, which is the point.) */
        if (FM.exportResume && (delivered || FM._exportCancel)) {
          // Drain the recorder BEFORE the delete, or a write still in flight re-creates what we erase.
          if (recorder) { try { await recorder.stop(); } catch (e) {} }
          try { await FM.exportResume.clear(); } catch (e) {}
        }
      }
    },

    // Animated GIF via FM.gifEncoder (from-scratch encoder). Same deterministic frame-stepping as run(),
    // but no audio (GIF has none) and no muxer. GIFs balloon fast, so the longest side is capped at
    // maxWidth (default 640) unless scale asks for smaller. Transparent = null the project background so
    // the encoder's per-frame transparent index shows through (renderScene clears to transparent first).
    async runGif(opts) {
      endAudition();   // queue 916 — see endAudition
      if (!FM.gifEncoder) throw new Error('NO_GIF_ENCODER');
      const scene = FM.scene, P = scene.project;
      /* 50 FPS IS AS FAST AS A GIF CAN HONESTLY PLAY (queue 690). A GIF's frame delay is whole
       * hundredths of a second, and browsers play a delay under 2 (1 or 0) as 10 — so 2 cs is the
       * shortest real frame. At 60 fps every frame was written as 2 cs and a 2 s project played for
       * 2.40 s; at 120 fps, 4.80 s. So above 50 the GIF is sampled at 50 fps: fewer frames, each at its
       * true moment, and the animation lasts exactly as long as the project. (The dialog's GIF note says so.) */
      const scale = opts.scale || 1, fps = Math.min(50, opts.fps || P.fps || 30);
      /* CUSTOM SIZE (queue 690, the rest of queue 141). The dialog offers Custom size… for a GIF and PNG
       * frames exactly as it does for an MP4, and runExport read the boxes — then handed them to the MP4
       * path only, so 200 x 200 on a 320 x 180 project came out 320 x 180 with the boxes still on
       * screen, and a square GIF could not be made. Now they are the output size here too, the project
       * CONTAINED in it the same way (FM.exportFitRect) — bars in the project's background, or clear on
       * a transparent GIF. The 640 cap below still applies, keeping the custom shape. No even-number
       * rounding: that is an H.264 rule, and a GIF has no such limit. */
      const custom = opts.outW > 0 && opts.outH > 0;
      let outW = Math.max(1, Math.round(custom ? opts.outW : P.width * scale));
      let outH = Math.max(1, Math.round(custom ? opts.outH : P.height * scale));
      const cap = opts.maxWidth || 640;                 // longest-side ceiling — GIF size/colors are expensive
      const longest = Math.max(outW, outH);
      if (longest > cap) {
        const k = cap / longest;
        outW = Math.max(1, Math.round(outW * k));
        outH = Math.max(1, Math.round(outH * k));
      }
      const start = (opts.from != null) ? Math.max(0, opts.from) : 0;
      const end = (opts.to != null) ? Math.min(P.duration, opts.to) : P.duration;
      const totalFrames = Math.max(1, Math.round((end - start) * fps));
      FM._exportCancel = false;
      resetSeekWatch();

      const projCanvas = document.createElement('canvas');
      projCanvas.width = P.width; projCanvas.height = P.height;
      const projCtx = projCanvas.getContext('2d');
      /* queue 669: this path's own blit. Without a custom size outW/outH come straight off the project's
         aspect, so `fit` is null and the draw is a plain scale — byte-for-byte what it always was. With
         one (queue 690) the frame is contained and letterboxed exactly as run() does it. */
      const fit = custom ? FM.exportFitRect(P.width, P.height, outW, outH) : null;
      const blit = makeBlit(projCanvas, outW, outH, fit, stillBarFill(P));
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW; outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });

      // smooth slow-mo / reverse: build frame caches at the export fps so the GIF matches preview
      let exportCaches = [];
      try { exportCaches = (await prepareCaches(scene, fps, s => opts.onProgress && opts.onProgress(0, s, true))) || []; } catch (e) { console.warn('cache prep failed', e); }

      const transparent = !!opts.transparent;
      FM._exporting = true;   // skip the compositor's preview-only hold-frame capture (#13,#22)
      let releaseVideos = null;
      try {
        if (FM._exportCancel) throw new Error('CANCELLED');   // queue 916 — a Cancel during "Decoding frames…" stops here, not a frame later
        releaseVideos = await holdVideoElements(scene, s => opts.onProgress && opts.onProgress(0, s, true));   // queue 690
        if (transparent) FM._exportTransparent = true;   // a FLAG, not a write to the saved project (BUG-HUNT)
        const gif = FM.gifEncoder.create(outW, outH, { transparent, dither: !!opts.dither, loop: true });
        /* EACH FRAME'S DELAY ON THE EXACT CLOCK, NOT ROUNDED ON ITS OWN (queue 690). 1000 / fps went to the
         * encoder, which rounds every frame to whole hundredths by itself: 33.3 ms became 3 cs, every
         * frame, so a 30 fps GIF — the default project rate — played 10 percent fast (a 2 s project
         * lasted 1.80 s). Frame f is given the hundredths from ITS start to the NEXT frame's start, both
         * rounded on the same clock, so the error never builds up: at 30 fps that is 3, 4, 3, 3, 4, 3 …
         * and 60 frames last exactly 2.00 s. At 25 or 50 fps it is 4 or 2 every frame, as before. */
        const csAt = k => Math.round(k * 100 / fps);
        for (let f = 0; f < totalFrames; f++) {
          if (FM._exportCancel) throw new Error('CANCELLED');
          const t = start + f / fps;
          await seekAllVideos(scene, t);
          FM.renderScene(projCtx, scene, t);
          outCtx.clearRect(0, 0, outW, outH);
          blit(outCtx);
          const data = outCtx.getImageData(0, 0, outW, outH).data;
          gif.addFrame(data, (csAt(f + 1) - csAt(f)) * 10);   // streaming: encoder appends this frame now, retains no pixels
          if (opts.onProgress) opts.onProgress((f + 1) / totalFrames, 'gif');
          await nextTick();   // yield so the Cancel tap can land between frames (throttle-proof — see nextTick)
        }
        const blob = gif.finish();
        download(blob, (opts.name || 'freemotion-export') + '.gif');
      } finally {
        if (releaseVideos) releaseVideos();   // queue 690
        FM._exportTransparent = false;
        exportCaches.forEach(m => { try { FM.clearFrameCache(m); } catch (e) {} });
        FM._exporting = false;
        if (FM.releaseTiltPools) FM.releaseTiltPools();   // bughunt8 #9: as the video export's finally
      }
    },

    // PNG image sequence zipped via FM.zipWrite (store-only). Same frame loop; each frame is a PNG (with
    // alpha when transparent) added to the zip as name_NNNN.png. No audio. Honors cancel + FM._exporting.
    async runFrames(opts) {
      endAudition();   // queue 916 — see endAudition
      if (!FM.zipWrite) throw new Error('NO_ZIP_WRITER');
      const scene = FM.scene, P = scene.project;
      const scale = opts.scale || 1, fps = opts.fps || P.fps || 30;
      // Custom size, contained — the same as the GIF above and the MP4 (queue 690, see runGif)
      const custom = opts.outW > 0 && opts.outH > 0;
      const outW = Math.max(1, Math.round(custom ? opts.outW : P.width * scale));
      const outH = Math.max(1, Math.round(custom ? opts.outH : P.height * scale));
      const start = (opts.from != null) ? Math.max(0, opts.from) : 0;
      const end = (opts.to != null) ? Math.min(P.duration, opts.to) : P.duration;
      const totalFrames = Math.max(1, Math.round((end - start) * fps));
      // A PNG sequence is store-only zipped in memory (every frame's bytes are held until finish()), so a
      // long/high-res run can reach GBs and OOM the tab — especially mobile Safari. Fail fast with a clear
      // message instead of crashing: cap the frame count AND the projected uncompressed pixel budget.
      const estBytesPerFrame = outW * outH * 4;   // upper bound (real PNG is smaller, but photographic frames get close)
      if (totalFrames > FRAMES_MAX || totalFrames * estBytesPerFrame > 2 * 1024 * 1024 * 1024) {
        /* bughunt6 #12: SAY WHICH LIMIT. A lower resolution cannot help a sequence over FRAMES_MAX frames, and the one
           message told him to try it; the caller (js/app.js runExport) now words each limit for itself. */
        const err = new Error('FRAMES_TOO_BIG');
        err.fmFrames = totalFrames; err.fmMax = FRAMES_MAX; err.fmOver = totalFrames > FRAMES_MAX ? 'frames' : 'memory';
        throw err;
      }
      FM._exportCancel = false;
      resetSeekWatch();

      const projCanvas = document.createElement('canvas');
      projCanvas.width = P.width; projCanvas.height = P.height;
      const projCtx = projCanvas.getContext('2d');
      /* queue 669: this path's own blit — a plain scale without a custom size, contained and
         letterboxed with one (queue 690), exactly as in runGif. */
      const fit = custom ? FM.exportFitRect(P.width, P.height, outW, outH) : null;
      const blit = makeBlit(projCanvas, outW, outH, fit, stillBarFill(P));
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW; outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d');

      let exportCaches = [];
      try { exportCaches = (await prepareCaches(scene, fps, s => opts.onProgress && opts.onProgress(0, s, true))) || []; } catch (e) { console.warn('cache prep failed', e); }

      const transparent = !!opts.transparent;
      FM._exporting = true;
      let releaseVideos = null;
      try {
        if (FM._exportCancel) throw new Error('CANCELLED');   // queue 916 — a Cancel during "Decoding frames…" stops here, not a frame later
        releaseVideos = await holdVideoElements(scene, s => opts.onProgress && opts.onProgress(0, s, true));   // queue 690
        if (transparent) FM._exportTransparent = true;   // so exported PNGs carry alpha, without touching saved state
        const zip = FM.zipWrite.create();
        const base = opts.name || 'freemotion-export';
        for (let f = 0; f < totalFrames; f++) {
          if (FM._exportCancel) throw new Error('CANCELLED');
          const t = start + f / fps;
          await seekAllVideos(scene, t);
          FM.renderScene(projCtx, scene, t);
          outCtx.clearRect(0, 0, outW, outH);
          blit(outCtx);
          const blob = await new Promise(res => outCanvas.toBlob(res, 'image/png'));
          const buf = new Uint8Array(await blob.arrayBuffer());
          const idx = String(f).padStart(4, '0');
          zip.add(base + '_' + idx + '.png', buf);
          if (opts.onProgress) opts.onProgress((f + 1) / totalFrames, 'frames');
        }
        const zipBlob = zip.finish();
        download(zipBlob, base + '_frames.zip');
      } finally {
        if (releaseVideos) releaseVideos();   // queue 690
        FM._exportTransparent = false;
        exportCaches.forEach(m => { try { FM.clearFrameCache(m); } catch (e) {} });
        FM._exporting = false;
        if (FM.releaseTiltPools) FM.releaseTiltPools();   // bughunt8 #9: as the video export's finally
      }
    },
  };
})(window.FM);
