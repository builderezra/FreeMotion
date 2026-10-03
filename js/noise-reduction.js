/* FreeMotion — local spectral noise reduction for audio clips. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const N = 1024, H = 256;
  const yieldUI = () => new Promise(resolve => setTimeout(resolve, 0));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+v) ? +v : lo));
  const defaults = { amount: 0.6, reduction: 12, sensitivity: 0.5, keepVoice: true };
  const windowFn = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));

  // Radix-2 complex FFT. Reuse the same two arrays for every analysis and synthesis frame.
  function fft(re, im, inverse) {
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= N; len <<= 1) {
      const angle = (inverse ? 2 : -2) * Math.PI / len;
      const wr = Math.cos(angle), wi = Math.sin(angle);
      for (let start = 0; start < N; start += len) {
        let cr = 1, ci = 0;
        for (let j = 0; j < len / 2; j++) {
          const a = start + j, b = a + len / 2;
          const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
          const next = cr * wr - ci * wi;
          ci = cr * wi + ci * wr; cr = next;
        }
      }
    }
    if (inverse) for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
  }

  function frame(input, start, re, im) {
    for (let i = 0; i < N; i++) {
      const pos = start + i;
      re[i] = (pos >= 0 && pos < input.length ? input[pos] : 0) * windowFn[i];
      im[i] = 0;
    }
    fft(re, im, false);
  }

  FM.reduceNoiseBuffer = async function (input, options) {
    if (!input || !input.length || !input.getChannelData || !FM.detectSpeech) throw new Error('Audio unavailable');
    if (input.duration > 120 || input.numberOfChannels > 2) throw new Error('Reduce Noise supports up to two minutes of mono or stereo audio');
    const opts = Object.assign({}, defaults, options || {});
    opts.amount = clamp(opts.amount, 0, 1);
    opts.reduction = clamp(opts.reduction, 0, 30);
    opts.sensitivity = clamp(opts.sensitivity, 0, 1);
    const speech = await FM.detectSpeech(input);
    const regions = (speech && speech.segments) || [];
    const isSpeech = t => regions.some(s => t >= s.start && t < s.end);
    const frames = Math.ceil(input.length / H) + 3;
    const context = FM.audioCtx ? FM.audioCtx() : null;
    if (!context) throw new Error('Audio context unavailable');
    const output = context.createBuffer(input.numberOfChannels, input.length, input.sampleRate);
    const weights = new Float32Array(input.length);
    for (let f = 0; f < frames; f++) {
      const start = f * H - N / 2;
      for (let i = 0; i < N; i++) {
        const pos = start + i;
        if (pos >= 0 && pos < weights.length) weights[pos] += windowFn[i] * windowFn[i];
      }
    }
    const floor = Math.pow(10, -opts.reduction / 20);
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let ch = 0; ch < input.numberOfChannels; ch++) {
      const src = input.getChannelData(ch), dst = output.getChannelData(ch);
      const candidates = [];
      for (let f = 0; f < frames; f++) {
        const start = f * H - N / 2;
        if (isSpeech((start + N / 2) / input.sampleRate)) continue;
        let power = 0;
        for (let i = 0; i < N; i++) { const p = start + i; if (p >= 0 && p < src.length) power += src[p] * src[p]; }
        candidates.push([power, f]);
      }
      // If VAD labels the whole file as speech, use its quietest frames as a conservative fallback.
      if (!candidates.length) {
        for (let f = 0; f < frames; f++) {
          const start = f * H - N / 2;
          let power = 0;
          for (let i = 0; i < N; i++) { const p = start + i; if (p >= 0 && p < src.length) power += src[p] * src[p]; }
          candidates.push([power, f]);
        }
      }
      candidates.sort((a, b) => a[0] - b[0]);
      const profile = new Float32Array(N / 2 + 1);
      const count = Math.min(candidates.length, Math.max(1, Math.min(128, Math.ceil(candidates.length * 0.2))));
      for (let n = 0; n < count; n++) {
        frame(src, candidates[n][1] * H - N / 2, re, im);
        for (let k = 0; k < profile.length; k++) profile[k] += Math.hypot(re[k], im[k]) / count;
      }
      for (let f = 0; f < frames; f++) {
        const start = f * H - N / 2;
        frame(src, start, re, im);
        const protect = !!opts.keepVoice && isSpeech((start + N / 2) / input.sampleRate);
        for (let k = 0; k <= N / 2; k++) {
          const magnitude = Math.hypot(re[k], im[k]);
          const threshold = profile[k] * (1 + 3 * opts.sensitivity);
          const raw = magnitude > threshold ? 1 : Math.max(floor, magnitude / (threshold + 1e-9));
          const gain = 1 - opts.amount * (1 - (protect ? Math.max(raw, 0.75) : raw));
          re[k] *= gain; im[k] *= gain;
          if (k > 0 && k < N / 2) { re[N - k] *= gain; im[N - k] *= gain; }
        }
        fft(re, im, true);
        for (let i = 0; i < N; i++) {
          const pos = start + i;
          if (pos >= 0 && pos < dst.length) dst[pos] += re[i] * windowFn[i];
        }
        if (f % 128 === 127) await yieldUI();
      }
      for (let i = 0; i < dst.length; i++) {
        const clean = dst[i] / Math.max(weights[i], 1e-8);
        dst[i] = opts.listenRemoved ? src[i] - clean : clean;
      }
    }
    return output;
  };

  FM.noiseTwinOf = layer => layer && FM.scene && FM.scene.layers.find(l => l.noiseReducedOf === layer.id);
  FM.noiseState = layer => !layer ? 'off' : layer.noiseReducedOf ? 'twin' : FM.noiseTwinOf(layer) ? 'on' : 'off';

  FM.toggleNoiseReduction = async function (layer, options) {
    if (!layer || !FM.scene) return;
    const sourceId = layer.noiseReducedOf || layer.id;
    const twins = FM.scene.layers.filter(l => l.noiseReducedOf === sourceId);
    if (twins.length) {
      const source = FM.layerById(FM.scene, sourceId);
      if (source) source.muted = !!twins[0].noiseSourceWasMuted;
      for (const twin of twins) FM.deleteLayer(twin.id);
      if (source) { FM.scene.selectedId = source.id; FM.scene.selectedIds = [source.id]; }
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.commit();
      if (FM.toast) FM.toast('Original audio restored');
      return;
    }
    const media = FM.media && FM.media.get(layer.id);
    if (!media || media._noiseBusy) { if (FM.toast) FM.toast('Noise reduction is already running'); return; }
    media._noiseBusy = true;
    const pressedIn = FM.startedIn ? FM.startedIn() : null;
    try {
      if (FM.toast) FM.toast('Reducing noise…', 0);
      const original = await FM.layerAudioBuffer(layer);
      if (!original) throw new Error('This clip has no decodable audio');
      const cleaned = await FM.reduceNoiseBuffer(original, options);
      const name = String(layer.name || 'Audio').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 70);
      const file = new File([FM.audioBufferToWav(cleaned)], name + ' (reduced noise).wav', { type: 'audio/wav' });
      const rec = await FM.loadVideoFile(file);
      if (FM.stillIn && !FM.stillIn(pressedIn)) {
        if (FM.letGoMedia) FM.letGoMedia(rec);
        throw new Error('Project changed while reducing noise');
      }
      if (!FM.layerById(FM.scene, layer.id)) {
        if (FM.letGoMedia) FM.letGoMedia(rec);
        throw new Error('Source clip was removed while reducing noise');
      }
      FM.addMediaLayer(rec);
      const twin = FM.selectedLayer(FM.scene);
      if (!twin) throw new Error('Could not add processed audio');
      twin.name = name + ' (reduced noise)';
      twin.noiseReducedOf = layer.id;
      twin.noiseSourceWasMuted = !!layer.muted;
      twin.muted = !!layer.muted;
      twin.hidden = !!layer.hidden;
      twin.start = layer.start; twin.duration = layer.duration;
      twin.trimStart = layer.trimStart || 0; twin.reversed = !!layer.reversed;
      twin.speed = FM.isAnimated(layer.speed) ? JSON.parse(JSON.stringify(layer.speed)) : layer.speed;
      twin.volume = FM.isAnimated(layer.volume) ? JSON.parse(JSON.stringify(layer.volume)) : (layer.volume == null ? 1 : layer.volume);
      twin.fadeIn = layer.fadeIn || 0; twin.fadeOut = layer.fadeOut || 0;
      if (Array.isArray(layer.audioFx) && layer.audioFx.length) twin.audioFx = JSON.parse(JSON.stringify(layer.audioFx, FM.jsonReplacer));
      if (twin.transform) twin.transform.opacity = 0;
      layer.muted = true;
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.commit();
      if (FM.toast) FM.toast('Noise reduced — press again to restore');
    } catch (e) {
      if (FM.toast) FM.toast(e && e.message || 'Could not reduce noise', 4000);
    } finally { media._noiseBusy = false; }
  };

  let removedSource = null;
  FM.stopRemovedNoisePreview = function () {
    if (removedSource) { try { removedSource.stop(); } catch (e) {} removedSource = null; }
  };
  FM.previewRemovedNoise = async function (layer, options) {
    FM.stopRemovedNoisePreview();
    // Create/resume while the click gesture is active on iOS, before decoding and DSP yields.
    const context = FM.audioCtx();
    const original = await FM.layerAudioBuffer(layer);
    if (!original) throw new Error('This clip has no decodable audio');
    const removed = await FM.reduceNoiseBuffer(original, Object.assign({}, options, { listenRemoved: true }));
    const source = context.createBufferSource(); source.buffer = removed;
    source.connect(context.destination);
    source.onended = () => { if (removedSource === source) removedSource = null; };
    const offset = Math.max(0, Math.min(removed.duration - 0.1, (FM.time || 0) - (layer.start || 0) + (layer.trimStart || 0)));
    source.start(0, offset, Math.min(10, removed.duration - offset));
    removedSource = source;
  };
})(window.FM);
