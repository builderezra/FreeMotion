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
  async function layerAudioBuffer(layer) {
    const m = layer && FM.media && FM.media.get(layer.id);
    if (!m || !m.file || !FM.decodeAudio) return null;
    if (m.audioBuffer === undefined) m.audioBuffer = await FM.decodeAudio(m.file);
    return m.audioBuffer || null;
  }

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
  FM.karaokeTwinOf = function (layer) {
    if (!layer || !FM.scene) return null;
    return FM.scene.layers.find(l => l.karaokeOf === layer.id) || null;
  };
  /* 'twin' = this layer IS the karaoke track · 'on' = it has one · 'off' = none. */
  FM.karaokeState = function (layer) {
    if (!layer) return 'off';
    if (layer.karaokeOf) return 'twin';
    return FM.karaokeTwinOf(layer) ? 'on' : 'off';
  };

  /* Karaoke TOGGLE — never permanent.
   *   OFF → ON : add a vocals-removed track (tagged karaokeOf) and mute the source.
   *   ON  → OFF: drop that track and unmute the source. Works pressed from EITHER layer. */
  FM.toggleKaraoke = async function (layer) {
    if (!layer) return;
    const restore = (srcId, twinId) => {
      const src = srcId ? FM.layerById(FM.scene, srcId) : null;
      if (src) src.muted = false;
      if (FM.deleteLayer) FM.deleteLayer(twinId);   // keeps the media blob (undo-safe); prune reaps it later
      if (src) { FM.scene.selectedId = src.id; FM.scene.selectedIds = [src.id]; }
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.commit();
      if (FM.toast) FM.toast('Vocals restored');
    };
    if (layer.karaokeOf) return restore(layer.karaokeOf, layer.id);        // pressed ON the karaoke track
    const existing = FM.karaokeTwinOf(layer);
    if (existing) return restore(layer.id, existing.id);                    // pressed on the source, karaoke is on

    // OFF → ON
    const ab = await layerAudioBuffer(layer);
    if (!ab) { if (FM.toast) FM.toast('This clip has no audio'); return; }
    if (ab.numberOfChannels < 2) { if (FM.toast) FM.toast('Vocal removal needs a STEREO track — this one is mono'); return; }
    if (FM.toast) FM.toast('Removing vocals…', 2000);
    let processed = null;
    try { processed = await vocalRemovedBuffer(ab); } catch (e) { processed = null; }
    if (!processed) { if (FM.toast) FM.toast('Could not process this audio'); return; }
    const file = new File([FM.audioBufferToWav(processed)], safeName(layer.name) + ' (no vocals).wav', { type: 'audio/wav' });
    let rec = null;
    try { rec = await FM.loadVideoFile(file); } catch (e) { rec = null; }
    if (!rec) { if (FM.toast) FM.toast('Could not add the karaoke track'); return; }
    FM.addMediaLayer(rec);   // selects the new layer + commits
    const nl = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    if (nl) {
      nl.name = (layer.name || 'Audio') + ' (no vocals)';
      nl.karaokeOf = layer.id;   // the link that makes this a toggle (and survives save/reload)
      nl.start = layer.start;
      nl.duration = layer.duration;
      // The WAV is the FULL source track, so the twin must share the original's source→timeline mapping
      // (trim / speed / reverse) or the instrumental drifts out of sync with the muted picture.
      nl.trimStart = layer.trimStart || 0;
      nl.reversed = !!layer.reversed;
      nl.speed = FM.isAnimated(layer.speed) ? JSON.parse(JSON.stringify(layer.speed)) : layer.speed;   // deep-clone the ramp so the two layers don't share one {kf} array
      if (nl.transform) nl.transform.opacity = 0;   // audio-only twin — no picture
    }
    layer.muted = true;   // hear the karaoke, not the original
    if (FM.refreshAll) FM.refreshAll();
    if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Vocals removed — press again to restore');
  };
  FM.removeVocals = FM.toggleKaraoke;   // back-compat alias
})(window.FM);
