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
      const target = Math.min(Math.max(time, 0), Math.max(0, (m.duration || 0) - 0.001));
      if (Math.abs(el.currentTime - target) < 1e-4) { res(); return; }  // already on the frame (a no-op seek to a clamped-frozen last frame emits no 'seeked')
      let done = false, netTimer = 0;
      /* THE NET IS CANCELLED WHEN THE SEEK LANDS, which it never used to be. Found by a mutation run,
         not by reading: a landed seek left its 1500ms timer alive, so on a long export every frame
         parked a live timer, and — the part that actually bites — a timer from one export could fire
         during the NEXT one and report a repeated frame on a render that was perfectly clean. A
         diagnostic that cries wolf stops being read, which is how the last one died. */
      const finish = () => { if (done) return; done = true; clearTimeout(netTimer); el.removeEventListener('seeked', finish); res(); };
      el.addEventListener('seeked', finish);
      try { el.currentTime = target; } catch (e) { finish(); }
      // safety net only — export is offline, so give a slow/large seek time to land the right frame
      // before giving up (was 250ms, which dropped frames on big 4K seeks) (#15)
      netTimer = setTimeout(() => {
        _staleSeeks.push((label || 'a video layer') + ' at ' + target.toFixed(2) + 's');
        finish();
      }, 1500);
    });
  }

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

  async function seekAllVideos(scene, t) {
    const ps = [];
    scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const local = FM.layerLocalTime(layer, t);
      if (local == null) return;
      const m = FM.media.get(layer.id);
      if (m) ps.push(seekVideo(m, local, layer.name || layer.type || layer.id));
    });
    await Promise.all(ps);
  }

  // ---- audio: render the timeline's audio (with reverse/trim) to one buffer ----
  function makeClipBuffer(oac, ab, layer) {
    const sr = ab.sampleRate;
    const startSample = Math.floor(layer.trimStart * sr);
    const availSec = Math.max(0, ab.duration - layer.trimStart);
    const ramped = FM.isAnimated && FM.isAnimated(layer.speed);
    if (ramped) {
      // SPEED RAMP: resample along the SAME integral the video frames use (FM.layerSourceAdvance),
      // so pitch/tempo follow the curve and audio stays sample-locked to the picture.
      const totalAdv = FM.layerSourceAdvance(layer, layer.duration);
      const lenSamples = Math.max(1, Math.floor(layer.duration * sr));
      const out = oac.createBuffer(ab.numberOfChannels, lenSamples, sr);
      for (let ch = 0; ch < ab.numberOfChannels; ch++) {
        const src = ab.getChannelData(ch);
        const dst = out.getChannelData(ch);
        for (let i = 0; i < lenSamples; i++) {
          const adv = FM.layerSourceAdvance(layer, i / sr);
          const posSec = layer.reversed ? (totalAdv - adv) : adv;
          if (posSec < 0 || posSec > availSec) continue;   // ran past the source → silence
          const pos = startSample + posSec * sr;
          const i0 = Math.floor(pos), frac = pos - i0;
          const a = src[i0] || 0, b = src[i0 + 1] || 0;
          dst[i] = a + (b - a) * frac;
        }
      }
      return out;
    }
    // source advances sp× per output sample. A RAMPED speed prop is an object (raw arithmetic = NaN
    // = broken export audio); approximate it with the clip's average rate so audio spans the clip and
    // stays synced at the endpoints (per-sample ramp resampling isn't worth the complexity here).
    /* Which SOURCE sample output sample `i` reads from — pulled out as a pure function so the suite
     * can assert it (the loop it came from is inside an async export nothing can call). It was the
     * only part of the reversed-audio path with no coverage at all: the one reversed test in the suite
     * checks the WAVEFORM DRAWING, not a single exported sample. Fractional on purpose — the caller
     * interpolates, which is what keeps a non-1x rate smooth.
     * Reversed reads from the end of the covered span, so output 0 is the clip's LAST source sample. */
    const sp = FM.isAnimated && FM.isAnimated(layer.speed)
      ? FM.layerSourceAdvance(layer, layer.duration) / Math.max(0.01, layer.duration)
      : FM.speedAt(layer, layer.start);   // THROUGH speedAt (queue 451): a malformed prop is an object → NaN length → a clip silently dropped from the export mix
    const lenSec = Math.min(layer.duration, availSec / sp); // timeline seconds this clip fills
    const lenSamples = Math.max(1, Math.floor(lenSec * sr));
    const out = oac.createBuffer(ab.numberOfChannels, lenSamples, sr);
    for (let ch = 0; ch < ab.numberOfChannels; ch++) {
      const src = ab.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < lenSamples; i++) {
        const pos = FM.srcSampleAt(startSample, i, lenSamples, sp, layer.reversed);
        const i0 = Math.floor(pos), frac = pos - i0;
        const a = src[i0] || 0, b = src[i0 + 1] || 0;
        dst[i] = a + (b - a) * frac;                       // linear interp (smooth at non-1× rates)
      }
    }
    return out;
  }

  /* Exported so the suite can reach it — see the note at its call site above. Pure arithmetic:
   * forward output 0 is the clip's first source sample, reversed output 0 is its last. */
  FM.srcSampleAt = function (startSample, i, lenSamples, speed, reversed) {
    return reversed ? (startSample + (lenSamples - 1 - i) * speed) : (startSample + i * speed);
  };

  async function buildAudioMix(scene, from, to) {
    const P = scene.project;
    const sampleRate = 48000, channels = 2;
    from = from || 0; to = (to == null) ? P.duration : to;
    const dur = Math.max(0.01, to - from);
    const length = Math.ceil(dur * sampleRate);
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return null;
    const oac = new OAC(channels, length, sampleRate);
    const soloActive = scene.layers.some(l => l.solo);   // mirror the compositor's solo gate so the exported soundtrack matches the soloed picture (#14)
    let any = false;
    const chains = [];   // disposed only AFTER startRendering() resolves — dispose() stops the LFO oscillators, and an offline render that hasn't run yet would lose them
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
    const nameOf = l => l.name || l.type || l.id;
    // Is this the whole project, or a sub-range the user deliberately chose? Decides whether a clip
    // outside the range is a surprise worth reporting or the user's own instruction. See below.
    const wholeProject = (from <= 0.001) && (to >= (P.duration || 0) - 0.001);
    for (const layer of scene.layers) {
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
        if (sm && (sm.file || sm.audioBuffer)) {
          suppressed.push(nameOf(layer) + (layer.visible === false ? ' (hidden)'
                          : (soloActive && !layer.solo) ? ' (another layer is soloed)' : ' (inside a hidden group)'));
        }
        continue;
      }
      if (layer.type !== 'video') {
        // Imported audio rides the video path (an mp3 is a 'video' layer with a 0x0 picture), so a
        // NON-video layer here either genuinely has no sound, or is an audio layer built by some other
        // route that this mixer has never handled. Only the second is worth saying out loud, and the
        // honest test for it is whether it has decodable media attached.
        const mm = FM.media.get(layer.id);
        if (mm && (mm.file || mm.audioBuffer)) dropped.push(nameOf(layer) + ' (type "' + layer.type + '" — the mixer only takes "video" layers)');
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
       * through the same `dropped` list as every other reason a layer contributes nothing. */
      if (m.audioBuffer === undefined) {
        try { m.audioBuffer = await FM.decodeAudio(m.file); }
        catch (e) { m.audioBuffer = null; dropped.push(nameOf(layer) + ' (its audio would not decode: ' + (e && e.message ? e.message : e) + ')'); continue; }
      }
      if (!m.audioBuffer) { dropped.push(nameOf(layer) + ' (its audio would not decode)'); continue; }
      const buf = makeClipBuffer(oac, m.audioBuffer, layer);
      const clipEnd = layer.start + Math.min(layer.duration, buf.duration);
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
      const node = oac.createBufferSource(); node.buffer = buf;
      const gain = oac.createGain();
      const animVol = FM.isAnimated(layer.volume);
      const vol = FM.layerVolume(layer, layer.start);   // static level (non-animated clips)
      const clipDur = layer.duration;                     // fade timing uses VISUAL duration (matches preview), not audio-limited
      const win = FM.fadeWindows(layer, clipDur);         // scaled so fades never overlap (no pop)
      const fi = win.fi, fo = win.fo;
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
        if (fi > 0 && csOut + fi > startOut) gain.gain.linearRampToValueAtTime(vol, at(csOut + fi));
        if (fo > 0) {
          const foStart = ceOut - fo;
          if (foStart > startOut) gain.gain.setValueAtTime(vol, at(foStart));
          gain.gain.linearRampToValueAtTime(0, at(ceOut));
        }
      } else {
        gain.gain.value = vol;
      }
      // Audio effects: node -> gain -> chain -> destination. Each clip gets its OWN chain (they are
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
        try {
          limiter = oac.createDynamicsCompressor();
          limiter.threshold.value = -1.5; limiter.knee.value = 0;
          limiter.ratio.value = 20; limiter.attack.value = 0.003; limiter.release.value = 0.12;
          limiter.connect(oac.destination);
        } catch (e) { limiter = null; }
      }
      const sink = limiter || oac.destination;
      if (chain) {
        // re-point the chain's output at the limiter rather than straight at the destination
        if (limiter) { try { chain.output.disconnect(); chain.output.connect(limiter); } catch (e) {} }
      } else {
        gain.connect(sink);
      }
      node.connect(gain);
      node.start(oStart - from, oStart - layer.start, oEnd - oStart);   // when-in-range, offset-into-clip, play-len
    }
    /* Report before returning, whichever way it went (queue 215). The `!any` case is the one he hit —
     * an export with no soundtrack at all — and until now it returned null in silence. A layer that was
     * dropped while OTHERS made it through is just as worth saying: that is the case where the file has
     * sound, so nothing looks wrong, and one of your clips is quietly missing from it. */
    if (dropped.length) {
      console.warn('[export] ' + dropped.length + ' layer(s) contributed no audio:\n  · ' + dropped.join('\n  · '));
      if (FM.toast) {
        FM.toast(any
          ? dropped.length + ' clip' + (dropped.length === 1 ? '' : 's') + ' had no usable audio — see the console'
          : 'Exporting with NO SOUND — ' + dropped.length + ' audio clip' + (dropped.length === 1 ? '' : 's') + ' could not be read (see the console)', 5200);
      }
    }
    /* AND THE LAST SILENT REASON OF ALL: nothing was dropped, nothing was broken, and every clip that
     * could contribute was hidden or solo-suppressed. Reported only when the export ends up with NO
     * sound at all AND covers the whole project — the same rule the out-of-range report uses, and for
     * the same reason: suppressing a clip you can see is suppressed is not a surprise, but a completely
     * silent export whose only cause is a solo you forgot about very much is. */
    if (!any && suppressed.length && wholeProject) {
      console.warn('[export] the soundtrack is empty because these layers are hidden or solo-suppressed:\n  · ' + suppressed.join('\n  · '));
      FM._audioTrackDropped = 'all-suppressed';
      if (FM.toast) {
        FM.toast('Exporting with NO SOUND — ' + suppressed.length + ' audio clip' + (suppressed.length === 1 ? ' is' : 's are') +
                 ' hidden or muted by solo', 5600);
      }
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
     * WHY A FLAT NORMALISE RATHER THAN A SOFT-KNEE LIMITER: dividing by the peak is the only correction
     * that leaves every layer's balance EXACTLY as mixed — it changes one number, not the shape of the
     * waveform. A knee would keep more loudness and would also be the first thing in this file capable
     * of altering how a mix sounds relative to the preview in a way nobody asked for. Losing 4 dB on a
     * 1.6 peak is inaudible next to the buzz it replaces.
     * The 0.995 is real headroom, not superstition: AAC is lossy and the decoded waveform overshoots
     * its input slightly — the round-trip above came back at 0.8224 from a 0.8000 source. Landing
     * exactly on 1.0 would clip on the way out of the decoder instead of on the way in. */
    FM._lastMixGain = 1;
    FM._lastMixRawPeak = peak;
    if (peak > 1) {
      const g = 0.995 / peak;
      for (let c = 0; c < rendered.numberOfChannels; c++) {
        const d = rendered.getChannelData(c);
        for (let i = 0; i < d.length; i++) d[i] *= g;
      }
      FM._lastMixGain = g;
      peak *= g;
      FM._lastMixPeak = peak;
      console.info('[export] the mix summed to ' + FM._lastMixRawPeak.toFixed(2) + ' — turned down by ' +
                   (20 * Math.log10(g)).toFixed(1) + ' dB so it does not clip through AAC');
    }
    if (peak <= 0.0001) {
      console.warn('[export] the mix rendered but is pure silence — every contributing clip is muted or at zero volume');
      FM._audioTrackDropped = 'mix-silent';
      if (FM.toast) FM.toast('Exporting with NO SOUND — every audio clip is muted or at zero volume', 5600);
    }
    return { audioBuffer: rendered, sampleRate, channels };
  }

  /* `out` is where the encoded chunks go — the muxer, or an array. Taking a sink instead of the muxer
     is what lets the soundtrack be encoded BEFORE the muxer exists; see the call site for why that
     matters. */
  async function encodeAudio(out, mix) {
    const { audioBuffer, sampleRate, channels } = mix;
    const push = (chunk, meta) => { if (typeof out === 'function') out(chunk, meta); else out.addAudioChunk(chunk, meta); };
    let encErr = null;
    const enc = new AudioEncoder({
      output: (chunk, meta) => push(chunk, meta),
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
    const frameSize = 1024, total = audioBuffer.length;
    let ts = 0;
    for (let off = 0; off < total; off += frameSize) {
      const n = Math.min(frameSize, total - off);
      const planar = new Float32Array(n * channels);
      for (let c = 0; c < channels; c++) planar.set(chData[c].subarray(off, off + n), c * n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate, numberOfFrames: n, numberOfChannels: channels, timestamp: Math.round(ts), data: planar });
      enc.encode(ad); ad.close();
      ts += (n / sampleRate) * 1e6;
    }
    await enc.flush();
    enc.close();
    if (encErr) throw encErr;
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
    return 'avc1.42e01e';
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

  async function prepareCaches(scene, fps, onStatus) {
    const built = [];   // media whose full-res export cache we (re)built — freed after export so it doesn't sit in memory (#3)
    for (const layer of scene.layers) {
      if (FM._exportCancel) break;   // Cancel during the (potentially minutes-long) decode phase — was only checked in the encode loop, so Cancel did nothing here
      if (layer.type !== 'video' || layer.visible === false) continue;
      const needs = layer.reversed || (layer.frameBlend && (FM.isAnimated(layer.speed) || (layer.speed || 1) < 1));   // animated speed is an object — else a ramped frame-blend clip bakes in the stutter on export
      if (!needs) continue;
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
    if (FM.audioEnvelopePrewarm) {
      for (const layer of scene.layers) {
        for (const bh of (layer.behaviors || [])) {
          if (!bh || bh.type !== 'audio' || bh.enabled === false || !bh.params) continue;
          const src = bh.params.sourceId ? FM.layerById(scene, bh.params.sourceId) : null;
          if (!src) continue;
          const sRaw = +bh.params.smooth;   // ||-defaulting would turn smooth=0 into 0.4 and miss the cache key
          const smooth = Math.max(0, Math.min(1, isFinite(sRaw) && bh.params.smooth != null ? sRaw : 0.4));
          // EXACTLY the opts audioDelta derives (behaviors.js) — a different key would miss the cache
          try {
            await FM.audioEnvelopePrewarm(src, {
              band: bh.params.band, gain: (bh.params.gain != null) ? +bh.params.gain : 1,
              attack: 0.005 + smooth * 0.055, release: 0.03 + smooth * 0.37,
            });
          } catch (e) { /* best-effort — a failed decode just leaves the behavior inert, as before */ }
        }
      }
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
    return { blob: new Blob([buf], { type: 'audio/mp4' }), reason: '' };
  }

  FM.exporter = {
    prepareCaches,
    buildAudioMix,
    encodeM4A,
    aacSupported,
    async run(opts) {
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
      const blit = (ctx) => {
        ctx.save();
        if (fit.letterboxed) {
          ctx.globalCompositeOperation = 'source-over';
          const barFill = barFillNow();
          if (barFill) { ctx.fillStyle = barFill; ctx.fillRect(0, 0, outW, outH); }
          else ctx.clearRect(0, 0, outW, outH);   // transparent export keeps the bars transparent
        }
        ctx.drawImage(projCanvas, fit.dx, fit.dy, fit.dw, fit.dh);
        ctx.restore();
      };
      const bitrate = Math.min(80e6, opts.bitrate || Math.round(outW * outH * fps * 0.12));   // cap so 4K60 doesn't choke the encoder
      const start = (opts.from != null) ? Math.max(0, opts.from) : 0;
      const end = (opts.to != null) ? Math.min(P.duration, opts.to) : P.duration;
      const totalFrames = Math.max(1, Math.round((end - start) * fps));
      FM._exportCancel = false;
      resetSeekWatch();

      const projCanvas = document.createElement('canvas');
      projCanvas.width = P.width; projCanvas.height = P.height;
      const projCtx = projCanvas.getContext('2d');
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW; outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d');

      // smooth slow-mo / reverse: build frame caches at the export fps so the output matches preview
      let exportCaches = [];
      try { exportCaches = (await prepareCaches(scene, fps, s => opts.onProgress && opts.onProgress(0, s))) || []; } catch (e) { console.warn('cache prep failed', e); }

      FM._exporting = true;   // tells the compositor to skip the preview-only hold-frame capture/substitution (#13,#22)
      // Hoisted out of the try so the finally can shut the recorder down before deciding what to keep.
      let delivered = false, recorder = null, poster = null;
      try {
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
        if (FM.toast) FM.toast('The soundtrack could not be built — exporting WITHOUT SOUND', 6000);
        mix = null;
      }

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
      const codec = await pickVideoCodec(outW, outH, fps, bitrate);
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
      let audioChunks = null;
      if (mix) {
        audioChunks = [];
        try {
          await encodeAudio((chunk, meta) => audioChunks.push({ chunk: chunk, meta: meta }), mix);
        } catch (e) {
          console.warn('[export] the soundtrack failed to encode — exporting video only', e);
          FM._audioTrackDropped = 'encode-failed';
          if (FM.toast) FM.toast('The soundtrack failed to encode — exporting WITHOUT SOUND', 6000);
          mix = null; audioChunks = null;
        }
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
      let resumeFrom = 0, replayed = null;
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
        if (opts.onProgress) opts.onProgress(resumeFrom / totalFrames, 'picking up where the last render stopped');
        if (FM.toast) FM.toast('Picking up the interrupted export at ' + Math.round(resumeFrom / totalFrames * 100) + '%', 3000);
      } else if (XR && sig) {
        // Starting fresh: sweep any older job's parts so two exports' leftovers never share the store.
        try { await XR.clear(); } catch (e) {}
      }

      recorder = (XR && sig)
        ? XR.createRecorder(sig, { parts: replayed ? replayed.parts : 0, bytes: replayed ? replayed.bytes : 0,
                                   lastTs: replayed ? replayed.lastTs : -1,
                                   config: saved ? saved.config : null })
        : null;

      const encoder = new VideoEncoder({
        output: (chunk, meta) => { muxer.addVideoChunk(chunk, meta); if (recorder) recorder.add(chunk, meta); },
        error: e => console.error('video encode', e),
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
      const preroll = XR ? XR.prerollFrames(scene) : 0;
      if (resumeFrom > 0 && preroll > 0) {
        const warmFrom = Math.max(0, resumeFrom - preroll);
        if (opts.onProgress) opts.onProgress(resumeFrom / totalFrames, 'warming up the effects at the join');
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
      encoder.close();
      reportSeekWatch();   // every frame is in the encoder now, so the tally is final
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
      if (typeof opts.onReady === 'function') {
        await opts.onReady({
          blob: outBlob, name: outName, poster: poster,
          width: outW, height: outH, fps: fps, seconds: Math.max(0, end - start),
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
        FM._exporting = false;
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
      if (!FM.gifEncoder) throw new Error('NO_GIF_ENCODER');
      const scene = FM.scene, P = scene.project;
      const scale = opts.scale || 1, fps = opts.fps || P.fps || 30;
      let outW = Math.max(1, Math.round(P.width * scale));
      let outH = Math.max(1, Math.round(P.height * scale));
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
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW; outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });

      // smooth slow-mo / reverse: build frame caches at the export fps so the GIF matches preview
      let exportCaches = [];
      try { exportCaches = (await prepareCaches(scene, fps, s => opts.onProgress && opts.onProgress(0, s))) || []; } catch (e) { console.warn('cache prep failed', e); }

      const transparent = !!opts.transparent;
      FM._exporting = true;   // skip the compositor's preview-only hold-frame capture (#13,#22)
      try {
        if (transparent) FM._exportTransparent = true;   // a FLAG, not a write to the saved project (BUG-HUNT)
        const gif = FM.gifEncoder.create(outW, outH, { transparent, dither: !!opts.dither, loop: true });
        const delayMs = 1000 / fps;
        for (let f = 0; f < totalFrames; f++) {
          if (FM._exportCancel) throw new Error('CANCELLED');
          const t = start + f / fps;
          await seekAllVideos(scene, t);
          FM.renderScene(projCtx, scene, t);
          outCtx.clearRect(0, 0, outW, outH);
          blit(outCtx);
          const data = outCtx.getImageData(0, 0, outW, outH).data;
          gif.addFrame(data, delayMs);   // streaming: encoder appends this frame now, retains no pixels
          if (opts.onProgress) opts.onProgress((f + 1) / totalFrames, 'gif');
          await nextTick();   // yield so the Cancel tap can land between frames (throttle-proof — see nextTick)
        }
        const blob = gif.finish();
        download(blob, (opts.name || 'freemotion-export') + '.gif');
      } finally {
        FM._exportTransparent = false;
        exportCaches.forEach(m => { try { FM.clearFrameCache(m); } catch (e) {} });
        FM._exporting = false;
      }
    },

    // PNG image sequence zipped via FM.zipWrite (store-only). Same frame loop; each frame is a PNG (with
    // alpha when transparent) added to the zip as name_NNNN.png. No audio. Honors cancel + FM._exporting.
    async runFrames(opts) {
      if (!FM.zipWrite) throw new Error('NO_ZIP_WRITER');
      const scene = FM.scene, P = scene.project;
      const scale = opts.scale || 1, fps = opts.fps || P.fps || 30;
      const outW = Math.max(1, Math.round(P.width * scale));
      const outH = Math.max(1, Math.round(P.height * scale));
      const start = (opts.from != null) ? Math.max(0, opts.from) : 0;
      const end = (opts.to != null) ? Math.min(P.duration, opts.to) : P.duration;
      const totalFrames = Math.max(1, Math.round((end - start) * fps));
      // A PNG sequence is store-only zipped in memory (every frame's bytes are held until finish()), so a
      // long/high-res run can reach GBs and OOM the tab — especially mobile Safari. Fail fast with a clear
      // message instead of crashing: cap the frame count AND the projected uncompressed pixel budget.
      const estBytesPerFrame = outW * outH * 4;   // upper bound (real PNG is smaller, but photographic frames get close)
      if (totalFrames > 900 || totalFrames * estBytesPerFrame > 2 * 1024 * 1024 * 1024) {
        throw new Error('FRAMES_TOO_BIG');   // caller message: shorten the range, drop the fps, or lower the resolution
      }
      FM._exportCancel = false;
      resetSeekWatch();

      const projCanvas = document.createElement('canvas');
      projCanvas.width = P.width; projCanvas.height = P.height;
      const projCtx = projCanvas.getContext('2d');
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW; outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d');

      let exportCaches = [];
      try { exportCaches = (await prepareCaches(scene, fps, s => opts.onProgress && opts.onProgress(0, s))) || []; } catch (e) { console.warn('cache prep failed', e); }

      const transparent = !!opts.transparent;
      FM._exporting = true;
      try {
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
        FM._exportTransparent = false;
        exportCaches.forEach(m => { try { FM.clearFrameCache(m); } catch (e) {} });
        FM._exporting = false;
      }
    },
  };
})(window.FM);
