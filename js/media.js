/* FreeMotion — Media registry.
 * Holds the live, non-serializable media objects (video/image elements, decoded audio)
 * keyed by layer id, separate from the scene document. Loading a file returns the
 * intrinsic metadata the scene needs (size, duration).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const store = {};   // layerId -> { kind, el, width, height, duration, file, url, audioBuffer? }

  FM.media = {
    set(id, rec) { store[id] = rec; },
    get(id) { return store[id]; },
    remove(id) {
      const r = store[id];
      if (r && r.url) { try { URL.revokeObjectURL(r.url); } catch (e) {} }
      delete store[id];
    },
    all() { return store; },
  };

  /* Load a video file -> { kind:'video', el, width, height, duration, url } */
  FM.loadVideoFile = function (file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const el = document.createElement('video');
      el.src = url;
      el.muted = true;            // preview is muted; export decodes audio separately
      el.playsInline = true;
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve({
          kind: 'video', el, url, file,
          width: el.videoWidth, height: el.videoHeight,
          duration: (isFinite(el.duration) && el.duration > 0) ? el.duration : 0,
        });
      };
      el.addEventListener('loadedmetadata', () => {
        // MediaRecorder webm files report duration = Infinity until forced to compute it.
        if (!isFinite(el.duration) || isNaN(el.duration) || el.duration === 0) {
          const onResolve = () => {
            if (isFinite(el.duration) && el.duration > 0) { cleanup(); el.currentTime = 0; finish(); }
          };
          const cleanup = () => {
            el.removeEventListener('durationchange', onResolve);
            el.removeEventListener('timeupdate', onResolve);
            el.removeEventListener('seeked', onResolve);
          };
          el.addEventListener('durationchange', onResolve);
          el.addEventListener('timeupdate', onResolve);
          el.addEventListener('seeked', onResolve);
          try { el.currentTime = 1e7; } catch (e) {}
          setTimeout(() => { cleanup(); finish(); }, 1500); // never hang
        } else {
          finish();
        }
      }, { once: true });
      el.addEventListener('error', () => reject(new Error('Could not load video: ' + file.name)), { once: true });
    });
  };

  /* Load an image file -> { kind:'image', el, width, height, url } */
  FM.loadImageFile = function (file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const el = new Image();
      el.onload = () => resolve({ kind: 'image', el, url, file, width: el.naturalWidth, height: el.naturalHeight });
      el.onerror = () => reject(new Error('Could not load image: ' + file.name));
      el.src = url;
    });
  };

  /* Decode a file's audio track into an AudioBuffer (used by the exporter for
   * mixing / reversing). Returns null if the file has no decodable audio. */
  FM.decodeAudio = async function (file) {
    try {
      const buf = await file.arrayBuffer();
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const audio = await ctx.decodeAudioData(buf.slice(0));
      ctx.close();
      return audio;
    } catch (e) {
      return null;
    }
  };

  /* Compute (and cache on the media rec) a peak array for drawing the clip waveform. */
  FM.getWaveform = async function (rec) {
    if (rec.waveform) return rec.waveform;
    if (rec._wfPending) return null;
    rec._wfPending = true;
    try {
      if (rec.audioBuffer === undefined) rec.audioBuffer = await FM.decodeAudio(rec.file);
      const ab = rec.audioBuffer;
      if (!ab) { rec.waveform = []; rec._wfPending = false; return rec.waveform; }
      const ch = ab.getChannelData(0);
      const N = 600, block = Math.floor(ch.length / N) || 1, stride = Math.max(1, Math.floor(block / 200));
      const peaks = new Array(N);
      for (let i = 0; i < N; i++) {
        let max = 0; const s = i * block, e = Math.min(ch.length, s + block);
        for (let j = s; j < e; j += stride) { const v = Math.abs(ch[j]); if (v > max) max = v; }
        peaks[i] = max;
      }
      rec.waveform = peaks;
    } catch (e) { rec.waveform = []; }
    rec._wfPending = false;
    return rec.waveform;
  };
})(window.FM);
