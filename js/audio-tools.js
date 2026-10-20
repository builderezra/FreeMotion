/* FreeMotion — audio tools (extract to file · karaoke vocal remover).
 * Vanilla Web Audio, no dependencies, fully on-device. Both features share one core:
 * decode a layer's audio → AudioBuffer → 16-bit WAV. One saves it, one processes it first.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 4000);
  }
  function safeName(s) { return String(s || 'audio').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'audio'; }

  // The decoded audio for a layer (video OR audio-only clip). Cached on the media rec, same slot
  // getWaveform uses. Returns null for a clip with no decodable audio track (silent screen recording).
  /* Both callers here (Save audio as WAV, Remove vocals) use the decode ONCE. They used to park it on
   * m.audioBuffer — full-fidelity float PCM, ~90MB for four minutes of stereo — for the rest of the
   * session, one per clip ever touched, and nothing frees that slot (queue 834 clause 17). A buffer that is
   * ALREADY cached (export, reverse playback and audio-react put it there because they reuse it) is still
   * reused; a fresh decode is returned without being kept. */
  async function layerAudioBuffer(layer) {
    const m = layer && FM.media && FM.media.get(layer.id);
    if (!m || !m.file || !FM.decodeAudio) return null;
    if (m.audioBuffer !== undefined) return m.audioBuffer || null;
    return (await FM.decodeAudio(m.file)) || null;
  }
  FM.layerAudioBuffer = layerAudioBuffer;   // Reduce noise (js/noise-reduction.js, #966 B24) decodes the same way, and keeps nothing either

  /* AudioBuffer → 16-bit PCM WAV Blob (interleaved). Playable everywhere, no encoder library. */
  FM.audioBufferToWav = function (ab) {
    const numCh = Math.max(1, ab.numberOfChannels), sr = ab.sampleRate, len = ab.length;
    const blockAlign = numCh * 2, dataSize = len * blockAlign;
    const buf = new ArrayBuffer(44 + dataSize), view = new DataView(buf);
    let o = 0;
    const str = s => { for (let i = 0; i < s.length; i++) view.setUint8(o++, s.charCodeAt(i)); };
    const u32 = v => { view.setUint32(o, v, true); o += 4; };
    const u16 = v => { view.setUint16(o, v, true); o += 2; };
    str('RIFF'); u32(36 + dataSize); str('WAVE');
    str('fmt '); u32(16); u16(1); u16(numCh); u32(sr); u32(sr * blockAlign); u16(blockAlign); u16(16);
    str('data'); u32(dataSize);
    const chans = [];
    for (let c = 0; c < numCh; c++) chans.push(ab.getChannelData(c));
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < numCh; c++) {
        let s = Math.max(-1, Math.min(1, chans[c][i]));
        view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
      }
    }
    return new Blob([buf], { type: 'audio/wav' });
  };

  /* Extract a clip's audio and download it as a WAV file (the full source track). */
  FM.downloadLayerAudio = async function (layer) {
    if (!layer) return;
    /* bughunt7 #2 (#1091's doors): the export gate's own question and notice (js/app.js FM.exportTurnedOff). A watch-only copy's
       clip is not saved as a file, live or not — after the owner ends the session the inspector is no longer read-only, and
       this button would hand over a clip's whole source sound. */
    if (FM.exportTurnedOff && FM.exportTurnedOff()) { if (FM.sayExportTurnedOff) await FM.sayExportTurnedOff(); return; }
    if (FM.toast) FM.toast('Extracting audio…', 1500);
    const ab = await layerAudioBuffer(layer);
    if (!ab) { if (FM.toast) FM.toast('This clip has no audio to extract'); return; }
    const name = safeName(layer.name) + '.wav';
    saveBlob(FM.audioBufferToWav(ab), name);
    if (FM.toast) FM.toast('Saved ' + name);
  };

  // Karaoke vocal removal, purely by DSP (no ML). Lead vocals are almost always mixed dead-centre
  // (identical in L and R), so the SIDE signal (L − R) cancels them out. That alone also kills the
  // (centred) bass and kick, so we add a low-passed mono sum back below ~180 Hz to keep the low end.
  // Result: vocals gone, groove intact — crude but instant. Needs a STEREO source; mono can't cancel.
  async function vocalRemovedBuffer(ab) {
    if (!ab || ab.numberOfChannels < 2) return null;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return null;
    const octx = new OAC(2, ab.length, ab.sampleRate);
    const src = octx.createBufferSource(); src.buffer = ab;
    const split = octx.createChannelSplitter(2);
    src.connect(split);
    const invR = octx.createGain(); invR.gain.value = -1;
    const side = octx.createGain(); side.gain.value = 1;
    split.connect(side, 0);        // + L
    split.connect(invR, 1);        // R → −R
    invR.connect(side);            // side = L − R  (centred vocal cancelled)
    const monoSum = octx.createGain(); monoSum.gain.value = 0.5;
    split.connect(monoSum, 0);
    split.connect(monoSum, 1);     // (L + R) / 2
    const lp = octx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.Q.value = 0.5;
    monoSum.connect(lp);           // keep the bass/kick the centre-cancel would have eaten
    const out = octx.createGain(); out.gain.value = 1;
    side.connect(out); lp.connect(out);
    out.connect(octx.destination); // mono → both output channels (dual-mono)
    src.start(0);
    return await octx.startRendering();
  }

  // ---- Karaoke state. The instrumental rides as its own track tagged `karaokeOf: <sourceId>`, so the
  // whole thing is a reversible TOGGLE: nothing is baked into the source clip. ----
  /* THE SAME LINK CARRIES A REDUCE NOISE COPY (#966 B24, js/noise-reduction.js): `karaokeOf` plus `twinKind: 'denoise'`, so
     split, duplicate, import, the retime sync below and the magnetic timeline carry it with no second list to drift. A track
     with no twinKind is a no-vocals track — every project made before B24 reads exactly as it did. Neither toggle claims the
     other's track, and a clip has one of the two at a time. */
  const isVocalTwin = l => !!(l && l.karaokeOf && l.twinKind !== 'denoise');
  FM.karaokeTwinOf = function (layer) {
    if (!layer || !FM.scene) return null;
    return FM.scene.layers.find(l => isVocalTwin(l) && l.karaokeOf === layer.id) || null;
  };
  /* 'twin' = this layer IS the karaoke track · 'on' = it has one · 'off' = none (a Reduce noise copy is not one). */
  FM.karaokeState = function (layer) {
    if (!layer) return 'off';
    if (layer.karaokeOf) return isVocalTwin(layer) ? 'twin' : 'off';
    return FM.karaokeTwinOf(layer) ? 'on' : 'off';
  };

  /* Keep an untouched Remove Vocals track on the same source clock as its original.
   * The previous history snapshot supplies the clock BEFORE a Speed %, speed-ramp,
   * reset, trim or move edit. A twin that was retimed separately, or changed in the
   * same edit, is independent and must not be overwritten. This runs before the
   * current edit is snapshotted, so source + twin remain one undo step. */
  function karaokeClock(layer) {
    return [layer.start || 0, layer.duration || 0, layer.trimStart || 0,
      !!layer.reversed, JSON.stringify(layer.speed == null ? 1 : layer.speed)];
  }
  function sameClock(a, b) { return a.every((v, i) => v === b[i]); }
  FM.syncKaraokeTimingFrom = function (previousLayers) {
    if (!FM.scene || !Array.isArray(previousLayers) || !Array.isArray(FM.scene.layers)) return 0;
    const before = new Map(previousLayers.filter(l => l && l.id).map(l => [l.id, l]));
    const current = new Map(FM.scene.layers.filter(l => l && l.id).map(l => [l.id, l]));
    let changed = 0;
    FM.scene.layers.forEach(twin => {
      if (!twin || !twin.karaokeOf) return;
      const source = current.get(twin.karaokeOf), oldSource = before.get(twin.karaokeOf), oldTwin = before.get(twin.id);
      if (!source || source.type !== 'video' || twin.type !== 'video' || !oldSource || !oldTwin ||
          !Number.isFinite(source.start) || !Number.isFinite(source.duration) || !(source.duration > 0)) return;
      const oldClock = karaokeClock(oldSource);
      if (sameClock(karaokeClock(source), oldClock) || !sameClock(karaokeClock(oldTwin), oldClock) ||
          !sameClock(karaokeClock(twin), karaokeClock(oldTwin))) return;
      /* ⚠️ A SPLIT IS NOT A RETIME (B1, #1069 — the land list's required fix for b69c5795). Splitting the song leaves its
         head half here with a shorter clock and puts the tail in a NEW layer of the same lineage (splitOf). Following the
         head cut the instrumental down to the first half, and since the picture's own sound is muted, the song went
         SILENT after the cut. The instrumental already spans both halves, which is right; leave it whole. */
      if (source.splitOf && FM.scene.layers.some(l => l && l !== source && l.splitOf === source.splitOf && !before.has(l.id))) return;

      /* Map this track's own volume/effect keyframes onto its new window — but ONLY when the clip's clock carries them:
         a move shifts them, a speed change stretches them. A TRIM moves no keyframe (the song's own keys stay where they
         are when its edge is dragged), so neither may the instrumental's: scaling them by the trimmed length squeezed a
         fade into the part that was left. The speed track is replaced below with a CLONE of the source's new ramp. */
      const oldStart = twin.start || 0, oldDur = twin.duration || 0;
      const newStart = source.start || 0;
      const speedChanged = oldClock[3] !== !!source.reversed || oldClock[4] !== JSON.stringify(source.speed == null ? 1 : source.speed);
      const moved = !speedChanged && newStart !== oldStart && (source.duration || 0) === oldDur && (source.trimStart || 0) === (oldTwin.trimStart || 0);
      const ratio = speedChanged ? (oldDur > 0 ? source.duration / oldDur : 1) : 1;
      if ((speedChanged || moved) && FM.animatedProps && Number.isFinite(ratio) && ratio > 0) {
        FM.animatedProps(twin).forEach(prop => {
          if (prop === twin.speed) return;
          prop.kf.forEach(k => { k.t = newStart + (k.t - oldStart) * ratio; });
        });
      }
      twin.start = source.start;
      twin.duration = source.duration;
      twin.trimStart = source.trimStart || 0;
      twin.reversed = !!source.reversed;
      twin.speed = JSON.parse(JSON.stringify(source.speed == null ? 1 : source.speed));
      changed++;
    });
    return changed;
  };

  /* Karaoke TOGGLE — never permanent.
   *   OFF → ON : add a vocals-removed track (tagged karaokeOf) and mute the source.
   *   ON  → OFF: drop that track and unmute the source. Works pressed from EITHER layer. */
  FM.toggleKaraoke = async function (layer) {
    if (!layer) return;
    // One audio copy per clip (#966 B24): never claim a Reduce noise copy as this toggle's own, nor stack an instrumental on
    // a clip whose sound that copy already replaces.
    if (layer.twinKind === 'denoise' || (FM.noiseReduction && FM.noiseReduction.twinOf(layer))) {
      if (FM.toast) FM.toast('Turn Reduce noise off first — a clip can have Remove vocals or Reduce noise, not both', 4000);
      return;
    }
    const restore = (srcId, twinId) => {
      const src = srcId ? FM.layerById(FM.scene, srcId) : null;
      if (src) src.muted = false;
      // Sweep EVERY twin pointing at this source, not just the pressed/first one — Split-at-playhead and
      // Duplicate clone the karaokeOf tag, and a survivor would keep playing the instrumental OVER the
      // now-unmuted vocals.
      const twinIds = FM.scene.layers.filter(l => isVocalTwin(l) && l.karaokeOf === srcId).map(l => l.id);
      if (twinId && twinIds.indexOf(twinId) < 0) twinIds.push(twinId);
      /* bughunt3 #4: deleteLayer commits on its own, one undo step per twin, so with two twins (a split or a duplicate) one Undo
         after "Vocals restored" brought neither back, and the next brought ONE back over the unmuted song. Held, as Reduce noise
         holds its restore, so the commit below is the only step. deleteLayer keeps the media blobs (undo-safe); prune reaps them
         later. */
      if (FM.history && FM.history.mute) FM.history.mute();
      try { twinIds.forEach(tid => { if (FM.deleteLayer) FM.deleteLayer(tid); }); }
      finally { if (FM.history && FM.history.unmute) FM.history.unmute(); }
      if (src) { FM.scene.selectedId = src.id; FM.scene.selectedIds = [src.id]; }
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.commit();
      if (FM.toast) FM.toast('Vocals restored');
    };
    if (layer.karaokeOf) return restore(layer.karaokeOf, layer.id);        // pressed ON the karaoke track
    const existing = FM.karaokeTwinOf(layer);
    if (existing) return restore(layer.id, existing.id);                    // pressed on the source, karaoke is on

    /* OFF → ON — RE-ENTRANT UNTIL NOW, AND THE UI ENCOURAGED IT.
     *
     * Everything below awaits: decode the whole file, render it offline, load the result as a clip. The
     * decision to proceed is the `existing` check above, and nothing marked the job in flight — so a
     * second tap re-ran that check against a scene that still had no twin, agreed, and proceeded too.
     * Two layers then play the identical instrumental phase-locked: the backing track at roughly double
     * amplitude, clipping on loud material, plus a stray hidden layer in the timeline. It also runs two
     * full offline renders and holds two ~46MB WAVs and two <video> elements at once, which is an
     * out-of-memory risk on a phone.
     *
     * AND THE SECOND TAP WAS THE REASONABLE THING TO DO. The only feedback used to be a toast fired
     * AFTER the decode — so for the first several seconds of a multi-minute track the button did
     * nothing observable, and it auto-hid after two seconds while the render carried on. So the message
     * moves ahead of the work and stays up until the work is finished; a second tap now says so rather
     * than starting a duplicate.
     * The flag lives on the MEDIA record because that is what the work is about, and it is cleared in a
     * `finally` so a decode that throws cannot wedge the feature off for the session. */
    const km = FM.media && FM.media.get(layer.id);
    if (km && km._karaokeBusy) { if (FM.toast) FM.toast('Still removing the vocals…', 1800); return; }
    if (km) km._karaokeBusy = 1;
    /* queue 690 (hunt 5): the project he pressed it in. The decode and render below take seconds on a long track,
       and the track must not land in a project he opened meanwhile — see FM.stillIn (js/app.js). */
    const pressedIn = FM.startedIn ? FM.startedIn() : null;
    const left = () => !!FM.stillIn && !FM.stillIn(pressedIn);
    try {
    if (FM.toast) FM.toast('Removing vocals…', 0);
    const ab = await layerAudioBuffer(layer);
    if (!ab) { if (FM.hideToast) FM.hideToast(); if (FM.toast) FM.toast('This clip has no audio'); return; }
    if (ab.numberOfChannels < 2) { if (FM.hideToast) FM.hideToast(); if (FM.toast) FM.toast('Vocal removal needs a STEREO track — this one is mono'); return; }
    let processed = null;
    try { processed = await vocalRemovedBuffer(ab); } catch (e) { processed = null; }
    if (!processed) { if (FM.hideToast) FM.hideToast(); if (FM.toast) FM.toast('Could not process this audio'); return; }
    const file = new File([FM.audioBufferToWav(processed)], safeName(layer.name) + ' (no vocals).wav', { type: 'audio/wav' });
    let rec = null;
    try { rec = await FM.loadVideoFile(file); } catch (e) { rec = null; }
    if (!rec) { if (FM.hideToast) FM.hideToast(); if (FM.toast) FM.toast('Could not add the karaoke track'); return; }
    if (left()) {   // queue 690 (hunt 5): its source clip is in the project he left — nothing to add it to here
      if (FM.letGoMedia) FM.letGoMedia(rec);
      if (FM.hideToast) FM.hideToast();
      if (FM.toast) FM.toast('Not added — you switched projects while the vocals were being removed', 4000);
      return;
    }
    /* ═══ bughunt3 #4: REMOVE VOCALS IS ONE UNDO STEP, AND IT WRITES TO THE LIVE CLIP ═══════════════════════════════════════
     * FM.addMediaLayer commits on its own, so the add used to be an undo step of its own ahead of the commit below. One Undo after
     * "Vocals removed" went back to the half-made add: an UNLINKED instrumental at the playhead, its whole length at full volume,
     * beside a song that was no longer muted, so he heard the song twice, offset, and the button read Remove vocals again.
     * history.commit does not merge the two (its karaoke sync finds the source's clock unchanged and returns). The add is held
     * now, as Reduce noise holds its own (js/noise-reduction.js apply), so the commit below is the only step.
     * And the clip is looked up again by id after the awaits. An Undo while the vocals were being removed (seconds on a long
     * song) swaps the scene's layer objects (history restore), and the mute and the mix used to go to and come from the clip as
     * it was BEFORE that Undo: the live clip stayed unmuted under its new instrumental. A clip that has gone, or that has a copy
     * of its sound by now, gets no track, and he is told, as Reduce noise does. */
    const src = FM.layerById ? FM.layerById(FM.scene, layer.id) : layer;
    const drop = msg => {
      if (FM.letGoMedia) FM.letGoMedia(rec);
      if (FM.hideToast) FM.hideToast();
      if (FM.toast) FM.toast(msg, 4000);
    };
    if (!src) return drop('Not added — the clip was deleted while its vocals were being removed');
    if (FM.karaokeTwinOf(src) || (FM.noiseReduction && FM.noiseReduction.twinOf(src))) return drop('Not added — the clip changed while its vocals were being removed');
    if (FM.history && FM.history.mute) FM.history.mute();
    let nl = null;
    try { FM.addMediaLayer(rec); nl = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null; }
    finally { if (FM.history && FM.history.unmute) FM.history.unmute(); }
    if (nl && nl !== src) {
      nl.name = (src.name || 'Audio') + ' (no vocals)';
      nl.karaokeOf = src.id;   // the link that makes this a toggle (and survives save/reload)
      nl.start = src.start;
      nl.duration = src.duration;
      // The WAV is the FULL source track, so the twin must share the original's source→timeline mapping
      // (trim / speed / reverse) or the instrumental drifts out of sync with the muted picture.
      nl.trimStart = src.trimStart || 0;
      nl.reversed = !!src.reversed;
      nl.speed = FM.isAnimated(src.speed) ? JSON.parse(JSON.stringify(src.speed)) : src.speed;   // deep-clone the ramp so the two layers don't share one {kf} array
      // The toggle must be a transparent vocals-off swap, so the twin inherits the source's MIX too —
      // volume (incl. keyframed), fades, and the audio-effect chain. Without these the instrumental
      // jumped to full level, lost its fade-out, and dropped the user's EQ/reverb.
      nl.volume = FM.isAnimated(src.volume) ? JSON.parse(JSON.stringify(src.volume)) : (src.volume == null ? 1 : src.volume);
      nl.fadeIn = src.fadeIn || 0;
      nl.fadeOut = src.fadeOut || 0;
      /* bughunt3 #3: …with the span a split half's fades are measured over, or the copy's fade would start at its own edge. */
      if (src.fadeInLead != null) nl.fadeInLead = src.fadeInLead;
      if (src.fadeOutTail != null) nl.fadeOutTail = src.fadeOutTail;
      if (Array.isArray(src.audioFx) && src.audioFx.length) nl.audioFx = JSON.parse(JSON.stringify(src.audioFx, FM.jsonReplacer));
      if (nl.transform) nl.transform.opacity = 0;   // audio-only twin — no picture
    }
    src.muted = true;   // hear the karaoke, not the original
    if (FM.refreshAll) FM.refreshAll();
    if (FM.history) FM.history.commit();
    if (FM.hideToast) FM.hideToast();
    if (FM.toast) FM.toast('Vocals removed — press again to restore');
    } finally { if (km) km._karaokeBusy = 0; }   // cleared on THROW too — a failed decode must not wedge the feature off
  };
  FM.removeVocals = FM.toggleKaraoke;   // back-compat alias
})(window.FM);
