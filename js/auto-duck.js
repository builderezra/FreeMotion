/* FreeMotion — generate ordinary volume keyframes that lower music while another clip speaks. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value, FM.jsonReplacer));

  // Invert the editor's actual source-time map, including speed ramps and reverse playback.
  function sourceToProject(layer, sourceTime, total) {
    const intoSource = Math.max(0, Math.min(total, sourceTime - (layer.trimStart || 0)));
    const advance = layer.reversed ? total - intoSource : intoSource;
    let into;
    if (!FM.isAnimated(layer.speed)) {
      into = advance / Math.max(0.01, FM.speedAt(layer, layer.start));
    } else {
      let lo = 0, hi = layer.duration;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (FM.layerSourceAdvance(layer, mid) < advance) lo = mid; else hi = mid;
      }
      into = (lo + hi) / 2;
    }
    return layer.start + Math.max(0, Math.min(layer.duration, into));
  }

  FM.autoDuckTimelineSegments = function (layer, segments) {
    const total = FM.layerSourceAdvance(layer, layer.duration);
    if (!(total > 0)) return [];
    const trim = layer.trimStart || 0;
    const out = [];
    for (const segment of segments || []) {
      const lo = Math.max(trim, Number(segment.start)), hi = Math.min(trim + total, Number(segment.end));
      if (!(hi > lo)) continue;
      const a = sourceToProject(layer, lo, total), b = sourceToProject(layer, hi, total);
      out.push({ start: Math.min(a, b), end: Math.max(a, b) });
    }
    return out;
  };

  function envelopeOf(segments, opts, start, end) {
    const attack = opts.attack, release = opts.release, padding = opts.padding;
    const intervals = segments.map(s => ({ a: Math.max(start, s.start - padding), b: Math.min(end, s.end + padding) }))
      .filter(s => s.b > s.a).sort((a, b) => a.a - b.a);
    const merged = [];
    for (const item of intervals) {
      const last = merged[merged.length - 1];
      if (last && item.a - attack <= last.b + release) last.b = Math.max(last.b, item.b);
      else merged.push(item);
    }
    return merged;
  }

  // Pure keyframe builder: one shared output format for the editor and the exporter.
  FM.autoDuckKeyframes = function (base, segments, opts, start, end) {
    opts = Object.assign({ amount: 12, attack: 0.2, release: 0.6, padding: 0.15 }, opts || {});
    opts.amount = clamp(opts.amount, 0, 30, 12);
    opts.attack = clamp(opts.attack, 0.05, 1, 0.2);
    opts.release = clamp(opts.release, 0.1, 2, 0.6);
    opts.padding = clamp(opts.padding, 0, 0.5, 0.15);
    if (!(end > start)) throw new Error('The music clip has no duration');
    const intervals = envelopeOf(segments, opts, start, end);
    if (!intervals.length) return null;
    const floor = Math.pow(10, -opts.amount / 20);
    const duckAt = time => {
      let gain = 1;
      for (const item of intervals) {
        if (time < item.a - opts.attack || time > item.b + opts.release) continue;
        if (time < item.a) gain = Math.min(gain, 1 - (1 - floor) * (time - (item.a - opts.attack)) / opts.attack);
        else if (time <= item.b) gain = Math.min(gain, floor);
        else gain = Math.min(gain, floor + (1 - floor) * (time - item.b) / opts.release);
      }
      return gain;
    };
    const times = [start, end];
    const animated = FM.isAnimated(base);
    if (animated) for (const key of base.kf) if (Number.isFinite(key.t)) times.push(key.t);
    for (const item of intervals) {
      for (const t of [item.a - opts.attack, item.a, item.b, item.b + opts.release]) times.push(Math.max(start, Math.min(end, t)));
      // Multiplying two moving curves is not linear. Sample only the attack/release ramps when
      // the user's ORIGINAL volume is animated; static music needs just four keys per speech run.
      if (animated) for (const [a, b] of [[item.a - opts.attack, item.a], [item.b, item.b + opts.release]]) {
        for (let t = Math.max(start, a) + 0.1; t < Math.min(end, b); t += 0.1) times.push(t);
      }
    }
    times.sort((a, b) => a - b);
    const unique = times.filter((t, i) => i === 0 || t - times[i - 1] > 1e-5);
    if (unique.length > 5000) throw new Error('Too many ducking keyframes for this clip');
    const originals = animated ? new Map(base.kf.map(key => [Math.round(key.t * 1e5), key])) : null;
    return { kf: unique.map((t, i) => {
      const original = originals && originals.get(Math.round(t * 1e5));
      const previous = i > 0 ? unique[i - 1] : t;
      const originalPrevious = originals && originals.get(Math.round(previous * 1e5));
      const crossesDuck = intervals.some(item => previous < item.b + opts.release && t > item.a - opts.attack);
      // Keep the user's easing where consecutive original keys lie wholly outside ducking.
      const ease = original && originalPrevious && !crossesDuck ? original.e : 'linear';
      return { t: +t.toFixed(5), v: Math.max(0, FM.evalProp(base == null ? 1 : base, t) * duckAt(t)), e: ease || 'linear' };
    }) };
  };

  function refresh() {
    if (FM.reconcileAudio) FM.reconcileAudio();
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.inspector) FM.inspector.refresh();
    if (FM.requestRender) FM.requestRender();
    if (FM.history) FM.history.commit();
  }

  FM.autoDuckClear = function (layer) {
    if (!layer || !layer.autoDuck) return;
    layer.volume = clone(layer.autoDuck.base);
    delete layer.autoDuck;
    refresh();
    if (FM.toast) FM.toast('Original volume restored');
  };

  FM.autoDuckGenerate = async function (target, options) {
    if (!target || !FM.scene || target.type !== 'video') throw new Error('Choose an audio clip');
    if (!FM.decodeAudio || !FM.detectSpeech) throw new Error('Speech detection is unavailable');
    if (target._duckBusy) throw new Error('Ducking is already being generated');
    const opts = Object.assign({ sourceId: 'any', amount: 12, attack: 0.2, release: 0.6, padding: 0.15 }, options || {});
    opts.amount = clamp(opts.amount, 0, 30, 12);
    opts.attack = clamp(opts.attack, 0.05, 1, 0.2);
    opts.release = clamp(opts.release, 0.1, 2, 0.6);
    opts.padding = clamp(opts.padding, 0, 0.5, 0.15);
    const sources = (FM.captions && FM.captions.audioSources ? FM.captions.audioSources() : FM.scene.layers)
      .filter(layer => layer && layer.id !== target.id && layer.type === 'video' && !layer.muted && !layer.hidden &&
        FM.media && FM.media.get(layer.id) && FM.media.get(layer.id).file &&
        layer.start < target.start + target.duration && layer.start + layer.duration > target.start &&
        (opts.sourceId === 'any' || layer.id === opts.sourceId));
    if (!sources.length) throw new Error('Choose another audible clip that overlaps this music');
    target._duckBusy = true;
    try {
    const started = FM.startedIn ? FM.startedIn() : null;
    const segments = [];
    for (const source of sources) {
      if (FM.stillIn && !FM.stillIn(started)) throw new Error('Project changed during speech analysis');
      const media = FM.media.get(source.id);
      const buffer = await FM.decodeAudio(media.file, { rate: 8000 });
      if (!buffer) {
        if (opts.sourceId !== 'any') throw new Error('Selected clip has no decodable audio');
        continue;
      }
      const found = await FM.detectSpeech(buffer);
      if (!FM.layerById(FM.scene, source.id)) continue;
      segments.push(...FM.autoDuckTimelineSegments(source, found.segments));
    }
    if (FM.stillIn && !FM.stillIn(started)) throw new Error('Project changed during speech analysis');
    if (!FM.layerById(FM.scene, target.id)) throw new Error('Music clip was removed during speech analysis');
    const base = clone(target.autoDuck ? target.autoDuck.base : (target.volume == null ? 1 : target.volume));
    const keys = FM.autoDuckKeyframes(base, segments, opts, target.start, target.start + target.duration);
    if (!keys) throw new Error('No speech found in overlapping clips');
    target.autoDuck = { base: base, sourceId: opts.sourceId, amount: opts.amount, attack: opts.attack, release: opts.release, padding: opts.padding };
    target.volume = keys;
    refresh();
    if (FM.toast) FM.toast('Music ducking keyframes generated');
    return keys.kf.length;
    } finally { target._duckBusy = false; }
  };
})(window.FM);
