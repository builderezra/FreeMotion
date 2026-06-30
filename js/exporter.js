/* FreeMotion — Export pipeline.
 * Deterministic, frame-by-frame render -> H.264 (WebCodecs) -> MP4 (mp4-muxer).
 * Not real-time: we seek each source video to the exact frame, composite, and encode,
 * so output is correct regardless of machine speed. Reverse + reversed audio handled here.
 * This same frame-stepping path is the foundation for slow-mo/interpolation later.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function download(buffer, name) {
    const blob = new Blob([buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function seekVideo(m, time) {
    return new Promise(res => {
      const el = m.el;
      const target = Math.min(Math.max(time, 0), Math.max(0, (m.duration || 0) - 0.001));
      let done = false;
      const finish = () => { if (done) return; done = true; el.removeEventListener('seeked', finish); res(); };
      el.addEventListener('seeked', finish);
      try { el.currentTime = target; } catch (e) { finish(); }
      setTimeout(finish, 250); // safety: never hang on a frame
    });
  }

  async function seekAllVideos(scene, t) {
    const ps = [];
    scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const local = FM.layerLocalTime(layer, t);
      if (local == null) return;
      const m = FM.media.get(layer.id);
      if (m) ps.push(seekVideo(m, local));
    });
    await Promise.all(ps);
  }

  // ---- audio: render the timeline's audio (with reverse/trim) to one buffer ----
  function makeClipBuffer(oac, ab, layer) {
    const sr = ab.sampleRate;
    const sp = layer.speed || 1;                          // source advances sp× per output sample
    const startSample = Math.floor(layer.trimStart * sr);
    const availSec = Math.max(0, ab.duration - layer.trimStart);
    const lenSec = Math.min(layer.duration, availSec / sp); // timeline seconds this clip fills
    const lenSamples = Math.max(1, Math.floor(lenSec * sr));
    const out = oac.createBuffer(ab.numberOfChannels, lenSamples, sr);
    for (let ch = 0; ch < ab.numberOfChannels; ch++) {
      const src = ab.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < lenSamples; i++) {
        // fractional source position; reversed reads from the end of the covered span
        const pos = layer.reversed ? (startSample + (lenSamples - 1 - i) * sp) : (startSample + i * sp);
        const i0 = Math.floor(pos), frac = pos - i0;
        const a = src[i0] || 0, b = src[i0 + 1] || 0;
        dst[i] = a + (b - a) * frac;                       // linear interp (smooth at non-1× rates)
      }
    }
    return out;
  }

  async function buildAudioMix(scene, from, to) {
    const P = scene.project;
    const sampleRate = 48000, channels = 2;
    from = from || 0; to = (to == null) ? P.duration : to;
    const dur = Math.max(0.01, to - from);
    const length = Math.ceil(dur * sampleRate);
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return null;
    const oac = new OAC(channels, length, sampleRate);
    let any = false;
    for (const layer of scene.layers) {
      if (layer.type !== 'video' || layer.visible === false) continue;   // hidden layers are silent
      const m = FM.media.get(layer.id);
      if (!m || !m.file) continue;
      if (m.audioBuffer === undefined) m.audioBuffer = await FM.decodeAudio(m.file);
      if (!m.audioBuffer) continue;
      const buf = makeClipBuffer(oac, m.audioBuffer, layer);
      const clipEnd = layer.start + Math.min(layer.duration, buf.duration);
      const oStart = Math.max(layer.start, from), oEnd = Math.min(clipEnd, to);   // overlap with [from,to]
      if (oEnd <= oStart) continue;
      any = true;
      const node = oac.createBufferSource(); node.buffer = buf;
      const gain = oac.createGain();
      const vol = (layer.volume != null ? layer.volume : 1);
      const clipDur = layer.duration;                     // fade timing uses VISUAL duration (matches preview), not audio-limited
      const win = FM.fadeWindows(layer, clipDur);         // scaled so fades never overlap (no pop)
      const fi = win.fi, fo = win.fo;
      if (fi > 0 || fo > 0) {
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
      node.connect(gain).connect(oac.destination);
      node.start(oStart - from, oStart - layer.start, oEnd - oStart);   // when-in-range, offset-into-clip, play-len
    }
    if (!any) return null;
    const rendered = await oac.startRendering();
    return { audioBuffer: rendered, sampleRate, channels };
  }

  async function encodeAudio(muxer, mix) {
    const { audioBuffer, sampleRate, channels } = mix;
    const enc = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: e => console.error('audio encode', e),
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
  }

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
  async function prepareCaches(scene, fps, onStatus) {
    for (const layer of scene.layers) {
      if (layer.type !== 'video' || layer.visible === false) continue;
      const needs = layer.reversed || (layer.frameBlend && (layer.speed || 1) < 1);
      if (!needs) continue;
      const m = FM.media.get(layer.id);
      if (!m || !m.el) continue;
      // Export must be pixel-exact: discard a downscaled PREVIEW cache (scaled) and rebuild at full res.
      if (m.frameCache && (m.frameCache.fps !== fps || m.frameCache.scaled)) FM.clearFrameCache(m);
      if (!m.frameCache) { if (onStatus) onStatus('Decoding frames…'); await FM.buildFrameCache(m, fps); }
    }
  }

  FM.exporter = {
    prepareCaches,
    buildAudioMix,
    async run(opts) {
      if (typeof VideoEncoder === 'undefined' || typeof window.Mp4Muxer === 'undefined') {
        throw new Error('NO_WEBCODECS');
      }
      const scene = FM.scene, P = scene.project;
      const scale = opts.scale || 1, fps = opts.fps || P.fps || 30;
      const outW = Math.max(2, Math.round(P.width * scale / 2) * 2);
      const outH = Math.max(2, Math.round(P.height * scale / 2) * 2);
      const bitrate = Math.min(80e6, opts.bitrate || Math.round(outW * outH * fps * 0.12));   // cap so 4K60 doesn't choke the encoder
      const start = (opts.from != null) ? Math.max(0, opts.from) : 0;
      const end = (opts.to != null) ? Math.min(P.duration, opts.to) : P.duration;
      const totalFrames = Math.max(1, Math.round((end - start) * fps));
      FM._exportCancel = false;

      const projCanvas = document.createElement('canvas');
      projCanvas.width = P.width; projCanvas.height = P.height;
      const projCtx = projCanvas.getContext('2d');
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW; outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d');

      // smooth slow-mo / reverse: build frame caches at the export fps so the output matches preview
      try { await prepareCaches(scene, fps, s => opts.onProgress && opts.onProgress(0, s)); } catch (e) { console.warn('cache prep failed', e); }

      // audio (best-effort: never let it sink the whole export)
      let mix = null;
      try { mix = await buildAudioMix(scene, start, end); } catch (e) { console.warn('audio mix failed', e); mix = null; }

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
        if (!audioOK) { console.warn('AAC audio encoding unavailable — exporting video only'); mix = null; }
      }

      const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: { codec: 'avc', width: outW, height: outH },
        audio: mix ? { codec: 'aac', numberOfChannels: mix.channels, sampleRate: mix.sampleRate } : undefined,
        fastStart: 'in-memory',
      });

      const codec = await pickVideoCodec(outW, outH, fps, bitrate);
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: e => console.error('video encode', e),
      });
      encoder.configure({ codec, width: outW, height: outH, bitrate, framerate: fps });

      const frameDurUs = 1e6 / fps;
      for (let f = 0; f < totalFrames; f++) {
        if (FM._exportCancel) { encoder.close(); throw new Error('CANCELLED'); }
        const t = start + f / fps;
        await seekAllVideos(scene, t);
        FM.renderScene(projCtx, scene, t);
        outCtx.drawImage(projCanvas, 0, 0, outW, outH);
        const frame = new VideoFrame(outCanvas, { timestamp: Math.round(f * frameDurUs), duration: Math.round(frameDurUs) });
        encoder.encode(frame, { keyFrame: f % (fps * 2) === 0 });
        frame.close();
        while (encoder.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 4));
        if (opts.onProgress) opts.onProgress((f + 1) / totalFrames, mix ? 'audio + video' : 'video');
      }

      await encoder.flush();
      encoder.close();
      if (mix) { try { await encodeAudio(muxer, mix); } catch (e) { console.warn('audio encode failed', e); } }
      muxer.finalize();
      download(muxer.target.buffer, (opts.name || 'freemotion-export') + '.mp4');
    },
  };
})(window.FM);
