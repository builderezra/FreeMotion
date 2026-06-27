/* FreeMotion — Reversed-audio preview playback.
 * HTML video can't play its own audio backward, so for reversed clips we synthesize a
 * reversed AudioBuffer and play it through Web Audio, synced to the playhead. Forward
 * clips keep using their <video> element's own audio. (Export reverses audio separately.)
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let ac = null;
  let active = [];   // live AudioBufferSourceNodes

  function ctx() {
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  // Build a reversed buffer for the trimmed clip region, honoring clip speed
  // (same resample as the exporter so preview matches output). lenSamples spans the
  // clip's timeline duration; source is read at speed× rate from the end backward.
  function reversedBuffer(audioCtx, ab, layer) {
    const sr = ab.sampleRate;
    const sp = layer.speed || 1;
    const startSample = Math.floor(layer.trimStart * sr);
    const availSec = Math.max(0, ab.duration - layer.trimStart);
    const lenSec = Math.min(layer.duration, availSec / sp);
    const lenSamples = Math.max(1, Math.floor(lenSec * sr));
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

  FM.audioPlay = {
    // Start reversed-audio for every reversed clip, aligned to the current playhead.
    start() {
      this.stop();
      const audioCtx = ctx();
      const when = audioCtx.currentTime;
      FM.scene.layers.forEach(layer => {
        if (layer.type !== 'video' || !layer.reversed || layer.visible === false) return;
        const m = FM.media.get(layer.id);
        if (!m || !m.audioBuffer) return;            // decoded ahead of time in requestPlay
        const clipEnd = layer.start + layer.duration;
        if (FM.time >= clipEnd) return;              // already past this clip
        const into = FM.time - layer.start;          // seconds into the clip at the playhead
        const buf = reversedBuffer(audioCtx, m.audioBuffer, layer);
        const node = audioCtx.createBufferSource();
        node.buffer = buf;
        node.playbackRate.value = FM.previewRate || 1;   // reversed audio must follow the preview speed (start() is re-run on rate change)
        const gain = audioCtx.createGain();
        const vol = (layer.volume != null ? layer.volume : 1);
        const clipDur = layer.duration;
        const win = FM.fadeWindows(layer, clipDur), fi = win.fi, fo = win.fo;   // scaled so fades never overlap
        if (fi > 0 || fo > 0) {
          const base = when - into;   // context time aligned to clip timeline-local 0
          // The reversed buffer is only buf.duration long; anchor the fade-out to the AUDIBLE end so
          // it completes instead of being cut off mid-ramp when source audio is shorter than the clip.
          const audibleDur = Math.min(clipDur, buf.duration);
          gain.gain.setValueAtTime(FM.fadeMul(layer, Math.max(0, into), clipDur) * vol, when);
          if (fi > 0 && base + fi > when) gain.gain.linearRampToValueAtTime(vol, base + fi);
          if (fo > 0) { const fs = base + (audibleDur - fo); if (fs > when) gain.gain.setValueAtTime(vol, fs); gain.gain.linearRampToValueAtTime(0, base + audibleDur); }
        } else {
          gain.gain.value = vol;
        }
        node.connect(gain).connect(audioCtx.destination);
        if (into <= 0) { node.start(when - into, 0); active.push(node); }          // clip starts later
        else if (into < buf.duration) { node.start(when, into); active.push(node); } // mid-clip
        else { try { node.disconnect(); } catch (e) {} }                            // source exhausted → silence
      });
    },
    stop() {
      active.forEach(n => { try { n.stop(); n.disconnect(); } catch (e) {} });
      active = [];
    },
  };
})(window.FM);
