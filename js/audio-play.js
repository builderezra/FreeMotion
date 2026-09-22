/* FreeMotion — Reversed-audio preview playback.
 * HTML video can't play its own audio backward, so for reversed clips we synthesize a
 * reversed AudioBuffer and play it through Web Audio, synced to the playhead. Forward
 * clips keep using their <video> element's own audio. (Export reverses audio separately.)
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let active = [];   // live AudioBufferSourceNodes
  let chains = [];   // audio-effect chains built for this playback pass
  let voices = [];   // { layer, gain, buf } for each started source — what retune() re-schedules (queue 894)
  let limiters = []; // the output limiter of each BOOSTED voice (queue 916) — disconnected on stop()

  // iOS caps live AudioContexts (~4) — audio-fx.js owns THE one; never construct another here.
  // Guarded like every other audio-fx entry point: without that file, preview stays silent, not broken.
  function ctx() { return FM.audioCtx ? FM.audioCtx() : null; }

  // Everything that decides whether a clip makes sound, minus the context — so start() can answer
  // "does this project need audio at all?" without creating one.
  function audible(layer) {
    if (layer.type !== 'video' || !layer.reversed || layer.visible === false) return false;
    if (FM.groupHidden && FM.groupHidden(layer)) return false;   // a clip inside a hidden group is silent in preview too (matches picture + export)
    if (FM.soloSilenced(layer)) return false;   // solo suppresses reversed-clip audio too (matches picture + export)
    const m = FM.media.get(layer.id);
    if (!m || !m.audioBuffer) return false;     // decoded ahead of time in requestPlay
    return FM.time < layer.start + layer.duration;   // already past this clip
  }

  // Build a reversed buffer for the trimmed clip region, honoring clip speed
  // (same resample as the exporter so preview matches output). lenSamples spans the
  // clip's timeline duration; source is read at speed× rate from the end backward.
  /* ⚠️ queue 823: MEMOISED, because this walks every sample by hand on the main thread. It is called from
     start(), and start() re-runs on a loop wrap, a volume change, a delete and a preview-rate change — so a
     looping project with a reversed clip rebuilt the WHOLE clip's backwards audio every lap (measured: about
     40–50ms of stall and roughly 11MB thrown away each time, even when the loop region is one second).
     The key is everything the output depends on, so nothing has to remember to invalidate it: a trim, a
     length change, a speed edit or a different source all change the key by themselves. Stored on the media
     record, which is where the frame cache already lives. */
  function reversedKey(ab, layer) {
    const sp = layer.speed;
    const spSig = (FM.isAnimated && FM.isAnimated(sp)) ? JSON.stringify(sp.kf || sp) : String(sp == null ? 1 : sp);
    return [ab.sampleRate, ab.length, layer.trimStart || 0, layer.duration || 0, spSig, !!layer.reversed].join('|');
  }
  function reversedBuffer(audioCtx, ab, layer) {
    const m = FM.media.get(layer.id);
    const key = reversedKey(ab, layer);
    if (m && m._revBuf && m._revKey === key) return m._revBuf;
    const out = buildReversedBuffer(audioCtx, ab, layer);
    if (m) { m._revKey = key; m._revBuf = out; }
    return out;
  }
  FM._reversedKey = reversedKey;   // suite seam: the key is what makes the cache honest
  function buildReversedBuffer(audioCtx, ab, layer) {
    const sr = ab.sampleRate;
    const startSample = Math.floor(layer.trimStart * sr);
    const availSec = Math.max(0, ab.duration - layer.trimStart);
    const ramped = FM.isAnimated && FM.isAnimated(layer.speed);
    if (ramped) {
      // Resample along the SAME FM.layerSourceAdvance integral the exporter's makeClipBuffer uses — the
      // old average-rate shortcut made a reversed+ramped clip PREVIEW different pitch/timing mid-clip
      // than it exported (only the endpoints lined up).
      const totalAdv = FM.layerSourceAdvance(layer, layer.duration);
      const lenSamples = Math.max(1, Math.floor(layer.duration * sr));
      const out = audioCtx.createBuffer(ab.numberOfChannels, lenSamples, sr);
      for (let ch = 0; ch < ab.numberOfChannels; ch++) {
        const src = ab.getChannelData(ch), dst = out.getChannelData(ch);
        for (let i = 0; i < lenSamples; i++) {
          const adv = FM.layerSourceAdvance(layer, i / sr);
          const posSec = totalAdv - adv;                        // reversed reads the integral from the far end
          if (posSec < 0 || posSec > availSec) continue;        // ran past the source → silence
          const pos = startSample + posSec * sr;
          const i0 = Math.floor(pos), frac = pos - i0;
          const a = src[i0] || 0, b = src[i0 + 1] || 0;
          dst[i] = a + (b - a) * frac;
        }
      }
      return out;
    }
    // Static branch (the ramped one returned above). THROUGH speedAt (queue 451): `sp || 1` returns
    // an OBJECT for a malformed speed prop, and `availSec / sp` is then NaN — a reversed clip that
    // renders as silence, in the preview mix, with nothing said.
    const sp = FM.speedAt(layer, layer.start);
    /* THE WHOLE CLIP, NOT JUST THE PART THE AUDIO COVERS (queue 916, clause 4). This was
     * `min(duration, availSec / sp)`, and reading backwards from the end of THAT span lines the sound
     * up with the end of the AUDIO — while the picture (FM.layerLocalTime) reads
     * `trimStart + (duration - t) * sp`, lined up with the end of the CLIP. On a clip whose audio track
     * is shorter than its video (common for phone and screen recordings) the backwards sound ran ahead
     * of the backwards picture by the difference, then went quiet before the clip ended. Spanning the
     * clip puts both on the picture's mapping: a read past the audio's end falls off the source array
     * (`src[i0] || 0`) and is silence, at the START — exactly what the ramped branch above does.
     * When the audio covers the clip — every ordinary case — lenSamples is the same number as before,
     * so those clips sound exactly as they did. */
    const lenSamples = Math.max(1, Math.floor(layer.duration * sr));
    const out = audioCtx.createBuffer(ab.numberOfChannels, lenSamples, sr);
    for (let ch = 0; ch < ab.numberOfChannels; ch++) {
      const src = ab.getChannelData(ch), dst = out.getChannelData(ch);
      for (let i = 0; i < lenSamples; i++) {
        const pos = startSample + (lenSamples - 1 - i) * sp;
        const i0 = Math.floor(pos), frac = pos - i0;
        const a = src[i0] || 0, b = src[i0 + 1] || 0;
        dst[i] = a + (b - a) * frac;
      }
    }
    return out;
  }

  /* THE FADE / VOLUME ENVELOPE FOR ONE REVERSED VOICE, scheduled onto its gain from context time `when`, with
   * the playhead `into` seconds into the clip. Lifted out of start() UNCHANGED (queue 894) so that retune() can
   * run the very same schedule on the LIVE node when only a fade has moved — rather than start() tearing every
   * voice down and splicing a fresh buffer in, which is what dragging a fade slider used to do 60 times a second. */
  function scheduleGain(gain, layer, buf, when, into) {
    const vol = FM.layerVolume(layer, FM.time);   // static level for non-animated clips
    const clipDur = layer.duration;
    const win = FM.fadeWindows(layer, clipDur), fi = win.fi, fo = win.fo;   // scaled so fades never overlap
    const animVol = FM.isAnimated(layer.volume);
    if (animVol) {
      // Keyframed volume: schedule the volume×fade envelope along the reversed buffer's scaled
      // timeline so the reversed PREVIEW matches the now-animated export. Buffer position b (= clip
      // -local time b) is reached at real time base + b/pr; volume there = level(start+b)×fade(b).
      const pr = FM.previewRate || 1;
      const base = when - into / pr;
      const audibleDur = Math.min(clipDur, buf.duration);
      const startB = Math.max(0, into);
      if (audibleDur <= startB + 1e-3) {
        gain.gain.value = Math.max(0, FM.layerVolume(layer, layer.start + startB) * FM.fadeMul(layer, startB, clipDur));
      } else {
        const steps = Math.max(2, Math.ceil((audibleDur - startB) * 30));
        for (let i = 0; i <= steps; i++) {
          const b = startB + (audibleDur - startB) * (i / steps);
          const g = Math.max(0, FM.layerVolume(layer, layer.start + b) * FM.fadeMul(layer, b, clipDur));
          const rt = Math.max(when, base + b / pr);
          if (i === 0) gain.gain.setValueAtTime(g, rt); else gain.gain.linearRampToValueAtTime(g, rt);
        }
      }
    } else if (fi > 0 || fo > 0) {
      // Reversed audio plays at previewRate (pr): buffer position b is reached at real time
      // when + (b - into)/pr. Schedule every fade point in that scaled timeline so fades land ON the
      // audio at any preview speed (at 2x the old 1x offsets fired after the audio had already ended).
      const pr = FM.previewRate || 1;
      const base = when - into / pr;   // real context time at buffer position 0
      // The reversed buffer is only buf.duration long; anchor the fade-out to the AUDIBLE end so
      // it completes instead of being cut off mid-ramp when source audio is shorter than the clip.
      const audibleDur = Math.min(clipDur, buf.duration);
      gain.gain.setValueAtTime(FM.fadeMul(layer, Math.max(0, into), clipDur) * vol, when);
      /* Re-anchor at the audio's REAL start when the clip begins in the future. `into` is negative
       * there, so `base` (buffer position 0) is LATER than `when`, and a single ramp from `when` to
       * `base + fi/pr` spans the silent gap AND the fade window as one straight line. By the time
       * the audio actually starts at `base`, the gain has already climbed to
       * vol * |into| / (|into| + fi) — so a fade-in begins part-way up, which is a pop.
       * The keyframed-volume branch directly above gets this right by clamping every point with
       * `Math.max(when, base + b/pr)`; this branch just never did, which is what makes it an
       * oversight rather than a decision. At into >= 0, base <= when and this is a no-op. */
      const fadeT0 = Math.max(when, base);
      if (fadeT0 > when) gain.gain.setValueAtTime(FM.fadeMul(layer, 0, clipDur) * vol, fadeT0);
      if (fi > 0 && base + fi / pr > fadeT0) gain.gain.linearRampToValueAtTime(vol, base + fi / pr);
      if (fo > 0) { const fs = base + (audibleDur - fo) / pr; if (fs > when) gain.gain.setValueAtTime(vol, fs); gain.gain.linearRampToValueAtTime(0, base + audibleDur / pr); }
    } else {
      gain.gain.value = vol;
    }
  }

  FM.audioPlay = {
    // Start reversed-audio for every reversed clip, aligned to the current playhead.
    start() {
      this.stop();
      const due = FM.scene.layers.filter(audible);
      if (!due.length) return;          // nothing to play: don't spend a context on it
      const audioCtx = ctx();
      if (!audioCtx) return;
      const when = audioCtx.currentTime;
      due.forEach(layer => {
        const m = FM.media.get(layer.id);
        const into = FM.time - layer.start;          // seconds into the clip at the playhead
        const buf = reversedBuffer(audioCtx, m.audioBuffer, layer);
        const node = audioCtx.createBufferSource();
        node.buffer = buf;
        const pr = FM.previewRate || 1;
        node.playbackRate.value = pr;   // reversed audio must follow the preview speed (start() is re-run on rate change)
        const gain = audioCtx.createGain();
        scheduleGain(gain, layer, buf, when, into);
        // Audio effects sit AFTER the volume/fade envelope, matching the exporter's clip mix order.
        const chain = FM.buildAudioFxChain ? FM.buildAudioFxChain(audioCtx, layer) : null;
        /* THE LIMITER, LAST, WHEN THE CLIP IS BOOSTED (queue 916, clause 5). The gain above carries the
           whole volume — up to 1000% — and the forward preview and the export both end a boosted clip
           in a -1.5 dBFS limiter so "preview and file agree above unity" (queue 195). This path had
           none: a reversed song at 400% reached the speakers at 4x and hard-clipped into a crackle the
           exported file does not have. Only when boosted, exactly like the other two paths, so a clip
           at or below 100% keeps its old, unshaped route. */
        const boosted = FM.audioFxLive && FM.audioFxLive.needsBoost && FM.audioFxLive.needsBoost(layer);
        let lim = null;
        if (boosted && FM.audioFxLive.makeLimiter) {
          try { lim = FM.audioFxLive.makeLimiter(audioCtx); lim.connect(audioCtx.destination); limiters.push(lim); }
          catch (e) { lim = null; }
        }
        const sink = lim || audioCtx.destination;
        node.connect(gain);
        if (chain) {
          gain.connect(chain.input);
          chain.output.connect(sink);
          chain.applyAt(FM.time);
          chains.push(chain);
        } else {
          gain.connect(sink);
        }
        if (into <= 0) { node.start(when - into / pr, 0); active.push(node); voices.push({ layer, gain, buf }); }     // clip starts later — delay is REAL time, so scale the scene-second gap by the preview rate (was 2s late at 2×)
        else if (into < buf.duration) { node.start(when, into); active.push(node); voices.push({ layer, gain, buf }); } // mid-clip
        else {                                                                       // source exhausted → silence
          try { node.disconnect(); } catch (e) {}
          if (chain) { const i = chains.indexOf(chain); if (i >= 0) chains.splice(i, 1); try { chain.dispose(); } catch (e) {} }
        }
      });
    },
    stop() {
      active.forEach(n => { try { n.stop(); n.disconnect(); } catch (e) {} });
      active = [];
      voices = [];
      chains.forEach(c => { try { c.dispose(); } catch (e) {} });
      chains = [];
      limiters.forEach(l => { try { l.disconnect(); } catch (e) {} });   // queue 916 — never leave one wired to the speakers
      limiters = [];
    },
    /* A FADE MOVED: RE-SCHEDULE THE LIVE VOICES, DO NOT RESTART THEM (queue 894). The fade strips used to reach
     * start() on every pointermove while playing, and start() begins with stop(): every reversed clip's source was
     * cut mid-sample and a new one spliced in at a non-zero crossing, and its effect chain — a reverb's Convolver
     * and its impulse response included — was thrown away and rebuilt, ~60 times a second on a phone. Heard as a
     * buzz instead of a fade, with the main thread stalling under the rebuilds. A fade changes neither which
     * buffer plays nor where it is, only the envelope on its gain, so that is all this touches: hold the value
     * where it is right now, and lay the new schedule down from here. You hear the fade change as you drag.
     * Returns false when there is no live voice, so a caller knows nothing was retuned. */
    retune() {
      if (!voices.length) return false;
      const audioCtx = ctx();
      if (!audioCtx) return false;
      const now = audioCtx.currentTime;
      voices.forEach(v => {
        try {
          const p = v.gain.gain;
          if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now); else p.cancelScheduledValues(now);
          scheduleGain(v.gain, v.layer, v.buf, now, FM.time - v.layer.start);
        } catch (e) {}
      });
      return true;
    },
    // Keyframed audio-effect params on a reversed clip animate from the rAF tick, like forward clips.
    applyAt(sceneTime) {
      for (let i = 0; i < chains.length; i++) chains[i].applyAt(sceneTime);
    },
  };
})(window.FM);
