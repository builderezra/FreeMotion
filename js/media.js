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
      el.addEventListener('error', () => { try { URL.revokeObjectURL(url); } catch (e2) {} reject(new Error('Could not load video: ' + file.name)); }, { once: true });   // failed imports must not pin the whole file blob for the page lifetime
    });
  };

  /* Load an image file -> { kind:'image', el, width, height, url } */
  FM.loadImageFile = function (file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const el = new Image();
      el.onload = () => resolve({ kind: 'image', el, url, file, width: el.naturalWidth, height: el.naturalHeight });
      el.onerror = () => { try { URL.revokeObjectURL(url); } catch (e2) {} reject(new Error('Could not load image: ' + file.name)); };
      el.src = url;
    });
  };

  /* Decode a file's audio track into an AudioBuffer (used by the exporter for
   * mixing / reversing). Returns null if the file has no decodable audio.
   *
   * `opts.rate` decodes into an OfflineAudioContext at that sample rate instead of at the device rate.
   * decodeAudioData resamples to the CONTEXT's rate, and the decoded buffer — not the file — is what
   * kills a phone: PCM costs rate x channels x 4 bytes per second, so its size is set by DURATION and
   * is the same for a 4K master and a phone clip of the same length. Measured (tests/_audiomem.html):
   *   10 min -> 219.7 MB      20 min -> 439.5 MB      60 min -> 1318.4 MB
   * against a mobile tab ceiling of roughly 1-2 GB. Ask for a low rate unless you need real fidelity. */
  FM.decodeAudio = async function (file, opts) {
    opts = opts || {};
    let ctx = null;
    try {
      const buf = await file.arrayBuffer();
      const AC = window.AudioContext || window.webkitAudioContext;
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      ctx = (opts.rate && OAC) ? new OAC(1, Math.ceil(opts.rate), opts.rate) : new AC();
      // No .slice() — that copy doubled the transient cost (the whole file a second time) to guard a
      // buffer nothing reads afterwards. decodeAudioData may detach `buf`; that is fine, it is local.
      return await ctx.decodeAudioData(buf);
    } catch (e) {
      return null;   // no decodable audio track (screen recordings etc.)
    } finally {
      // OfflineAudioContext has no close() on older Safari, hence the guard as well as the try.
      if (ctx && ctx.close) { try { ctx.close(); } catch (e2) {} }   // iOS caps live AudioContexts (~4) — a leak per silent video eventually kills ALL audio
    }
  };

  /* Above this, decoding the audio track to draw a waveform is not worth the risk of losing the tab:
   * file.arrayBuffer() alone has to hold the whole file in RAM before decoding even starts. A clip with
   * no waveform is a small cosmetic loss; a browser that kills the tab loses the project. */
  const WAVE_MAX_BYTES = 300 * 1024 * 1024;
  const WAVE_RATE = 8000;   // 600 peaks are drawn from this — 8kHz is ample, and 6x smaller than 48k

  /* Compute (and cache on the media rec) a peak array for drawing the clip waveform. */
  FM.getWaveform = async function (rec) {
    if (rec.waveform) return rec.waveform;
    if (rec._wfPending) return null;
    rec._wfPending = true;
    try {
      if (rec.file && rec.file.size > WAVE_MAX_BYTES) { rec.waveform = []; rec._wfPending = false; return rec.waveform; }
      // Deliberately NOT cached on rec.audioBuffer. That slot is full-fidelity PCM the exporter and the
      // audio-reactive effects want, and parking a half-gigabyte of it there for the whole session — to
      // draw 600 peaks, on import, for every clip — is what made long videos impossible to add on a
      // phone. Those callers decode for themselves when the feature is actually used.
      const ab = rec.audioBuffer !== undefined && rec.audioBuffer !== null
        ? rec.audioBuffer
        : await FM.decodeAudio(rec.file, { rate: WAVE_RATE });
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
