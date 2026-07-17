/* FreeMotion — Scene data model + evaluation.
 * This is the structured project document. The UI edits it; the compositor reads it;
 * the export pipeline reads it; and (later) the AI agent will read AND edit this same
 * object. Keep it plain-JSON-serializable: no DOM nodes, no live media here — those
 * live in the media registry (media.js), keyed by layer id.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let _idc = 1;
  function uid(prefix) {
    // counter + performance.now() reset every reload, so two projects created in different sessions
    // could mint the SAME id — and media blobs live in ONE shared IndexedDB store keyed by layer id,
    // so a collision silently cross-links clips between projects (deleting one killed the other's
    // media). The random suffix makes ids globally unique for good.
    return (prefix || 'id') + '_' + (_idc++).toString(36) + Math.floor(performance.now()).toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  // Per-layer timeline colors, cycled like Alight Motion (each layer gets its own clip color).
  const CLIP_COLORS = ['#2bbfa8', '#e0913f', '#df5b5b', '#9b6dff', '#46c98a', '#4d8bf0', '#e85f9e', '#d9b13f'];
  let _colorIdx = 0;

  /* ---- animatable properties ----
   * A property is either a plain number (static) or { kf: [{t, v, e}] } (keyframed),
   * where t = seconds, v = value, e = easing name applied on the segment ENTERING this kf.
   */
  const hasOwn = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  const EASES = {
    linear:    t => t,
    easeIn:    t => t * t,
    easeOut:   t => 1 - (1 - t) * (1 - t),
    easeInOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    // Bounce & elastic can't be expressed as a cubic-bezier (they oscillate past the endpoints), so
    // they live here as real functions — evalProp resolves EASES[e] before falling back to a bezier.
    bounce:    t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) { t -= 1.5 / d; return n * t * t + 0.75; } if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + 0.9375; } t -= 2.625 / d; return n * t * t + 0.984375; },
    elastic:   t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
    hold:      t => 0,
  };
  FM.EASES = EASES;   // exposed so the graph editor can draw the exact non-bezier curves (bounce/elastic)
  FM.EASE_NAMES = Object.keys(EASES);

  function isAnimated(p) { return p && typeof p === 'object' && Array.isArray(p.kf); }
  FM.isAnimated = isAnimated;

  // Colour keyframes: evalProp lerps '#rrggbb' values channel-wise so fill/colour props animate.
  function hexRGBk(c) { c = String(c || '#000000').replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; const n = parseInt(c, 16); return isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function lerpHexKf(a, b, f) {
    const A = hexRGBk(a), B = hexRGBk(b);
    const h = i => { const x = Math.max(0, Math.min(255, Math.round(A[i] + (B[i] - A[i]) * f))); return (x < 16 ? '0' : '') + x.toString(16); };
    return '#' + h(0) + h(1) + h(2);
  }

  // Cubic-bezier easing solver (CSS timing-function style): control points P1=(x1,y1),
  // P2=(x2,y2) with endpoints (0,0)→(1,1). Returns eased y for input progress x.
  function bezierAt(x1, y1, x2, y2, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = a => 3 * a;
    const cx = t => ((A(x1, x2) * t + B(x1, x2)) * t + C(x1)) * t;
    const cy = t => ((A(y1, y2) * t + B(y1, y2)) * t + C(y1)) * t;
    const dx = t => 3 * A(x1, x2) * t * t + 2 * B(x1, x2) * t + C(x1);
    let t = x;
    for (let i = 0; i < 8; i++) { const xv = cx(t) - x; if (Math.abs(xv) < 1e-5) return cy(t); const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= xv / d; }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 24; i++) { const xv = cx(t); if (Math.abs(xv - x) < 1e-5) break; if (xv < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return cy(t);
  }
  FM.bezierAt = bezierAt;
  FM.EASE_PRESETS = { linear: [0, 0, 1, 1], easeIn: [.42, 0, 1, 1], easeOut: [0, 0, .58, 1], easeInOut: [.42, 0, .58, 1], overshoot: [.34, 1.56, .64, 1], anticipate: [.36, 0, .66, -.56] };

  function evalProp(p, t) {
    if (!isAnimated(p)) return (typeof p === 'number' || typeof p === 'string') ? p : (p || 0);
    const kf = p.kf;
    if (!kf.length) return 0;
    // Loop a keyframed property past its last keyframe (AM: cycle repeats, pingpong reverses each pass).
    if (p.loopMode && p.loopMode !== 'none' && kf.length >= 2) {
      const lo = kf[0].t, hi = kf[kf.length - 1].t, span = hi - lo;
      if (span > 0 && t > hi) {
        let off = (t - lo) % span;
        if (p.loopMode === 'pingpong' && Math.floor((t - lo) / span) % 2 === 1) off = span - off;
        t = lo + off;
      }
    }
    if (t <= kf[0].t) return kf[0].v;
    const last = kf[kf.length - 1];
    if (t >= last.t) return last.v;
    for (let i = 0; i < kf.length - 1; i++) {
      const a = kf[i], b = kf[i + 1];
      if (t >= a.t && t <= b.t) {
        if (b.e === 'hold') return (t >= b.t) ? b.v : a.v;   // AT the hold keyframe the step has happened — returning a.v made snap-to-keyframe land on the OLD value
        const span = b.t - a.t;
        let f = span <= 0 ? 1 : (t - a.t) / span;
        // Resolve the easing: a custom bez, then a named EASES function, then a named EASE_PRESETS
        // bezier (overshoot/anticipate live ONLY in EASE_PRESETS — without this they fell back to
        // linear, so the graph editor's Overshoot preset produced straight-line motion).
        // hasOwnProperty, not a bare index: a plain-object lookup walks the prototype chain, so an
        // imported keyframe easing of 'toString' resolved to Object.prototype.toString — truthy, called
        // unbound, returning a string, and the lerp below went NaN. Only audioFx keyframes are ease-
        // validated on import, so this site is the backstop for every other prop.
        if (b.bez) f = bezierAt(b.bez[0], b.bez[1], b.bez[2], b.bez[3], f);
        else if (hasOwn(EASES, b.e)) f = EASES[b.e](f);
        else if (hasOwn(FM.EASE_PRESETS, b.e)) { const z = FM.EASE_PRESETS[b.e]; f = bezierAt(z[0], z[1], z[2], z[3], f); }
        if (typeof a.v === 'string' || typeof b.v === 'string') return lerpHexKf(a.v, b.v, f);   // colour keyframes
        return a.v + (b.v - a.v) * f;
      }
    }
    return last.v;
  }
  FM.evalProp = evalProp;

  /* A layer's audio level at time t — default 1, or the keyframed/animated value. Single source of
   * truth so preview + export read keyframed volume the same way. */
  FM.layerVolume = function (layer, t) { return layer.muted ? 0 : (layer.volume == null ? 1 : evalProp(layer.volume, t)); };

  /* Random vivid fill for freshly spawned shapes: any hue, but saturation 65-90% and lightness
   * 45-62% so it always reads as a colour (never mud, near-black or washed-out white) on the dark UI.
   * Math.random is fine here — the value is chosen ONCE at creation and stored on the layer, so
   * preview and export stay identical. */
  FM.randomFill = function () {
    const h = Math.random() * 360, s = 0.65 + Math.random() * 0.25, l = 0.45 + Math.random() * 0.17;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    const hex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return '#' + hex(r) + hex(g) + hex(b);
  };

  /* Solo suppresses AUDIO, not just picture. compositor.js skips non-soloed layers when drawing, and
   * exporter.js buildAudioMix skips them in the mix — but the preview audio paths gated only on
   * `visible`. So soloing a clip left every other layer audible while editing, then the exported file
   * contained only the soloed audio: preview and export disagreed. Preview now shares this gate.
   * Preview-only helper — it reads the live FM.scene, whereas the exporter is handed the scene it
   * is rendering, so it keeps its own inline check. */
  FM.soloSilenced = function (layer) {
    const ls = FM.scene && FM.scene.layers;
    return !!(ls && !layer.solo && ls.some(l => l.solo));
  };

  // Returns true when it INSERTED a new keyframe (vs updated one already at `t`) so callers can
  // refresh the timeline once — this is what makes an auto-keyed dot appear instead of staying
  // "invisible". New keyframes default to LINEAR easing (a straight graph), not ease-in-out.
  function upsertKeyframe(p, t, v) {
    const hit = p.kf.find(k => Math.abs(k.t - t) < 1e-3);
    if (hit) { hit.v = v; return false; }
    p.kf.push({ t: t, v: v, e: 'linear' }); p.kf.sort((a, b) => a.t - b.t);
    return true;
  }
  // A keyframe was just auto-inserted on an already-animated prop (dragging/scrubbing at a new
  // playhead time) — redraw the timeline so its dot shows immediately. Only interactive setters call
  // this (tracker/AI write kf arrays directly), so it never fires inside a tight batch loop.
  function kfInserted() { if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild(); }

  /* Set a transform value at the given time. If the prop is already keyframed, this
   * inserts/updates a keyframe at `time`; otherwise it sets the static value. */
  function setTransform(layer, key, value, time) {
    // editing a value while PLAYING sprayed a keyframe per pointermove at the advancing playhead —
    // any interactive write pauses playback first (canvas drags already do; this covers the inspector).
    // pause() re-snaps FM.time to the frame grid, so re-snap the (already-captured) `time` too or the
    // keyframe lands ~half a frame off the now-snapped playhead (undeletable + duplicate on next edit).
    if (FM.playing && FM.pause) { FM.pause(); if (FM.snapFrame) time = FM.snapFrame(time); }
    const p = layer.transform[key];
    if (isAnimated(p)) { if (upsertKeyframe(p, time, value)) kfInserted(); }
    else layer.transform[key] = value;
  }
  FM.setTransform = setTransform;

  /* Set a transform prop to `value` at `time` WITHOUT adding a keyframe: for an animated prop, shift
   * EVERY keyframe by the delta so the whole animation moves as one and its timing is untouched (this
   * is what canvas dragging uses — Ezra wants a canvas drag to reposition the whole thing, never to
   * drop a stray keyframe at the playhead the way Move & Transform deliberately does). */
  FM.shiftTransform = function (layer, key, value, time) {
    const p = layer.transform[key];
    if (!isAnimated(p)) { layer.transform[key] = value; return; }
    if (key === 'scale' || key === 'scaleX' || key === 'scaleY') {
      // scale is MULTIPLICATIVE: an additive delta pushes other keyframes negative (mirrored render)
      // — e.g. kfs 0.5→2.0, drag the 2.0 end down to 0.3: additive would make the first kf −1.2.
      const cur = evalProp(p, time);
      if (Math.abs(cur) < 1e-3) {   // at ~zero (a pop-in's first keyframe) the ratio explodes → shift additively instead
        const d = value - cur;
        if (d) p.kf.forEach(k => { k.v += d; });
        return;
      }
      const ratio = value / cur;
      if (ratio !== 1 && isFinite(ratio)) p.kf.forEach(k => { k.v *= ratio; });
      return;
    }
    const delta = value - evalProp(p, time);
    if (delta) p.kf.forEach(k => { k.v += delta; });
  };

  /* Slide a layer's WHOLE animation along the timeline: shift every keyframe's TIME by `delta` seconds
   * (transform, effect params, volume/speed/fill/stroke/shadow). Keyframe times are absolute project
   * time (evalProp is fed the raw playhead), so moving a clip in time must retime its keyframes or the
   * motion is left behind at the old time. (Ezra: moving a layer must move its keyframes with it.) */
  FM.shiftLayerKeyframes = function (layer, delta) {
    if (!delta) return;
    FM.animatedProps(layer).forEach(p => p.kf.forEach(k => { k.t += delta; }));
  };

  /* Toggle a keyframe for a transform prop at `time`. Converts static<->animated. */
  function toggleKeyframe(layer, key, time) {
    let p = layer.transform[key];
    if (!isAnimated(p)) {
      const cur = (typeof p === 'number') ? p : 0;
      layer.transform[key] = { kf: [{ t: time, v: cur, e: 'linear' }] };
      return true;
    }
    const hit = p.kf.find(k => Math.abs(k.t - time) < 1e-3);
    if (hit) {
      p.kf = p.kf.filter(k => k !== hit);
      if (!p.kf.length) layer.transform[key] = hit.v; // revert to static
      return false;
    }
    upsertKeyframe(p, time, evalProp(p, time));
    return true;
  }
  FM.toggleKeyframe = toggleKeyframe;

  function hasKeyframeAt(p, time) {
    return isAnimated(p) && p.kf.some(k => Math.abs(k.t - time) < 1e-3);
  }
  FM.hasKeyframeAt = hasKeyframeAt;

  /* Every animated prop container ({kf:[…]}) on a layer — transform props plus visual/audio effect
   * params — so the timeline can show/drag/delete effect-parameter keyframes alongside transform ones. */
  FM.animatedProps = function (layer) {
    const out = [];
    Object.keys(layer.transform).forEach(k => { if (isAnimated(layer.transform[k])) out.push(layer.transform[k]); });
    if (isAnimated(layer.volume)) out.push(layer.volume);   // keyframed audio shows diamonds on the clip too
    if (isAnimated(layer.speed)) out.push(layer.speed);     // speed-ramp keyframes show on the clip
    if (isAnimated(layer.fill)) out.push(layer.fill);       // colour keyframes show on the clip
    if (isAnimated(layer.color)) out.push(layer.color);
    if (layer.stroke) { if (isAnimated(layer.stroke.width)) out.push(layer.stroke.width); if (isAnimated(layer.stroke.color)) out.push(layer.stroke.color); }   // border (keyframeable)
    if (layer.crop) ['x', 'y', 'w', 'h'].forEach(k => { if (isAnimated(layer.crop[k])) out.push(layer.crop[k]); });   // crop keyframes — omitting them left crop animation behind on clip moves and undeletable
    if (layer.shadow) ['blur', 'dx', 'dy', 'alpha', 'color'].forEach(k => { if (isAnimated(layer.shadow[k])) out.push(layer.shadow[k]); });   // shadow (keyframeable)
    if (layer.trimPath) ['start', 'end', 'offset'].forEach(k => { if (isAnimated(layer.trimPath[k])) out.push(layer.trimPath[k]); });   // stroke draw-on
    if (layer.stroke && layer.stroke.dash && isAnimated(layer.stroke.dash.offset)) out.push(layer.stroke.dash.offset);   // marching-ants
    if (layer.repeater) ['copies', 'offsetX', 'offsetY', 'rotation', 'scale', 'opacity'].forEach(k => { if (isAnimated(layer.repeater[k])) out.push(layer.repeater[k]); });   // shape repeater
    (layer.effects || []).forEach(fx => { if (fx.params) Object.keys(fx.params).forEach(k => { if (isAnimated(fx.params[k])) out.push(fx.params[k]); }); });
    (layer.audioFx || []).forEach(fx => { if (fx && fx.params) Object.keys(fx.params).forEach(k => { if (isAnimated(fx.params[k])) out.push(fx.params[k]); }); });
    return out;
  };

  /* Generic versions of the above that target ANY container object + key (e.g. an effect's
   * params), so effect parameters / future props are keyframe-able just like transform. */
  FM.setProp = function (container, key, value, time) {
    if (FM.playing && FM.pause) { FM.pause(); if (FM.snapFrame) time = FM.snapFrame(time); }   // same rule as setTransform: live edits pause + re-snap the captured time to the frame grid
    const p = container[key];
    if (isAnimated(p)) { if (upsertKeyframe(p, time, value)) kfInserted(); }
    else container[key] = value;
  };
  FM.toggleProp = function (container, key, time, dflt) {
    let p = container[key];
    if (!isAnimated(p)) {
      // numbers AND strings (colour props like layer.fill) seed from the current static value
      const cur = (typeof p === 'number' || typeof p === 'string') ? p : (dflt != null ? dflt : 0);
      container[key] = { kf: [{ t: time, v: cur, e: 'linear' }] };
      return true;
    }
    const hit = p.kf.find(k => Math.abs(k.t - time) < 1e-3);
    if (hit) {
      p.kf = p.kf.filter(k => k !== hit);
      if (!p.kf.length) container[key] = hit.v;
      return false;
    }
    upsertKeyframe(p, time, evalProp(p, time));
    return true;
  };

  // After dragging keyframes in the timeline, drop any *non-dragged* keyframe that now shares a
  // time with a dragged one (otherwise two keyframes stack at one time → degenerate interpolation),
  // then re-sort. The dragged keyframe wins the collision.
  FM.dedupDraggedKfs = function (layer, draggedKfs) {
    const dragged = new Set(draggedKfs || []);
    (FM.animatedProps ? FM.animatedProps(layer) : []).forEach(p => {
      const dts = p.kf.filter(k => dragged.has(k)).map(k => k.t);
      if (dts.length) p.kf = p.kf.filter(k => dragged.has(k) || !dts.some(dt => Math.abs(dt - k.t) < 1e-3));
      p.kf.sort((a, b) => a.t - b.t);
    });
  };

  /* ---- factories ---- */
  function newScene() {
    return {
      project: { name: 'Untitled', width: 1080, height: 1920, fps: 30, duration: 0, background: '#000000' },
      layers: [],
      selectedId: null,
      version: 1,
    };
  }
  FM.newScene = newScene;

  function makeLayer(type, props) {
    props = props || {};
    const base = {
      id: uid('layer'),
      type: type,                 // 'video' | 'image' | 'text'
      name: props.name || (type[0].toUpperCase() + type.slice(1)),
      visible: true,
      locked: false,
      blendMode: 'normal',
      // timeline placement (seconds)
      start: props.start != null ? props.start : 0,   // creators pass start: FM.time to add at the playhead
      duration: props.duration != null ? props.duration : 5,
      trimStart: 0,
      reversed: false,
      effects: [],
      clipColor: CLIP_COLORS[_colorIdx++ % CLIP_COLORS.length],
      volume: 1,
      fadeIn: 0,                  // audio fade-in seconds (ramps 0→volume over the clip's first fadeIn s)
      fadeOut: 0,                 // audio fade-out seconds (ramps volume→0 over the clip's last fadeOut s)
      speed: 1,                   // playback-rate multiplier (0.25 = slow-mo, 2 = fast)
      frameBlend: false,          // cross-dissolve adjacent frames for smooth slow-mo
      motionBlur: { enabled: false, shutter: 0.5, samples: 8 },   // shutter = fraction of a frame sampled
      wiggle: { enabled: false, amp: 12, freq: 2 },               // procedural position jitter (deterministic)
      parent: null,               // layer id this layer inherits transform from (AM parenting)
      parentMode: 'normal',       // 'normal' | 'locked' (stay upright) | 'weighted' (partial rotation)
      parentWeight: 0.5,          // weighted mode: fraction of parent rotation the child keeps
      transform: {
        x: props.x != null ? props.x : 0,
        y: props.y != null ? props.y : 0,
        scale: props.scale != null ? props.scale : 1,
        rotation: 0,
        opacity: 1,
        anchorX: 0.5,
        anchorY: 0.5,
      },
    };
    if (type === 'text') {
      base.text = props.text || 'Text';
      base.fontSize = props.fontSize || 96;
      base.color = props.color || '#ffffff';
      base.fontFamily = props.fontFamily || 'Inter, sans-serif';
      base.align = 'center';
      base.bold = false;
      base.italic = false;
      base.letterSpacing = 0;
      base.lineHeight = 1.15;
      base.stroke = { enabled: false, width: 6, color: '#000000' };
      base.textAnim = { preset: 'none', unit: 'char', durIn: 0.6, durOut: 0, stagger: 0.04 };
    }
    if (type === 'shape') {
      base.shape = props.shape || 'rect';      // rect | ellipse | line | polygon
      base.shapeW = props.shapeW || 400;
      base.shapeH = props.shapeH || 300;
      // No fill given → a random VIVID colour per spawn (random hue, sat/light kept in a range that
      // never lands on mud or near-black). Only creation-time: saved/imported/template/AI layers all
      // pass their stored fill and are untouched, and duplicates clone the source layer directly.
      base.fill = props.fill || FM.randomFill();
      base.stroke = { enabled: false, width: 8, color: '#ffffff' };
      base.cornerRadius = 0;
      base.sides = 5;
    }
    return Object.assign(base, props.extra || {});
  }
  FM.makeLayer = makeLayer;

  // Deep-clone a layer. Default = "duplicate" (new color, offset, " copy" name).
  // plain=true = identical copy with just a new id (used by split).
  // JSON replacer: DROP runtime-only fields (canvas snapshots, decode caches — keys starting with
  // '_'). A live <canvas> serialises to {} and comes back methodless, which crashed the compositor
  // (Copy Background's _bgSnap, motion-blur plates, media _lastFrame, group _canvas, …).
  FM.jsonReplacer = function (k, v) { return (typeof k === 'string' && k.charCodeAt(0) === 95) ? undefined : v; };
  FM.cloneLayer = function (layer, plain) {
    const c = JSON.parse(JSON.stringify(layer, FM.jsonReplacer));
    c.id = uid('layer');
    if (!plain) {
      c.clipColor = CLIP_COLORS[_colorIdx++ % CLIP_COLORS.length];
      c.name = (layer.name || 'Layer') + ' copy';
      ['x', 'y'].forEach(k => {   // nudge so the copy is visible — offset the whole path if animated
        const v = c.transform[k];
        if (typeof v === 'number') c.transform[k] = v + 30;
        else if (v && Array.isArray(v.kf)) v.kf.forEach(kf => { kf.v += 30; });
      });
    }
    return c;
  };

  /* ---- layer helpers ---- */
  FM.layerById = function (scene, id) {
    return scene.layers.find(l => l.id === id) || null;
  };
  FM.selectedLayer = function (scene) {
    return scene.selectedId ? FM.layerById(scene, scene.selectedId) : null;
  };

  // True if `ancestorId` appears in `layerId`'s parent chain (used to block parenting cycles).
  FM.isAncestor = function (scene, ancestorId, layerId) {
    const seen = new Set();
    let l = FM.layerById(scene, layerId);
    let p = l ? l.parent : null;
    while (p && !seen.has(p)) {
      if (p === ancestorId) return true;
      seen.add(p);
      const pl = FM.layerById(scene, p);
      p = pl ? pl.parent : null;
    }
    return false;
  };

  /* Local source time for a layer at global project time t.
   * Returns null when the layer is not on-screen at t. Accounts for reverse + trim. */
  // Source-seconds advanced after `into` clip-seconds. Static speed = plain multiply (old path,
  // byte-identical). KEYFRAMED speed = SPEED RAMPING: numerically integrate the eased curve with a
  // cached cumulative table (trapezoid @120Hz) so every lookup — scrub, playback, export — is O(1).
  const _spInt = {};   // layerId -> { sig, tab, SR } (module cache; never serialized with the layer)
  FM.layerSourceAdvance = function (layer, into) {
    const sp = layer.speed;
    if (!isAnimated(sp)) return Math.max(0, into) * (sp || 1);
    const sig = JSON.stringify(sp.kf) + '|' + (sp.loopMode || '') + '|' + layer.start + '|' + layer.duration;
    let c = _spInt[layer.id];
    if (!c || c.sig !== sig) {
      const SR = 120, n = Math.max(2, Math.ceil((layer.duration || 0) * SR) + 2);
      const tab = new Float32Array(n);
      let acc = 0, prev = Math.max(0.05, evalProp(sp, layer.start));
      for (let i = 1; i < n; i++) {
        const v = Math.max(0.05, evalProp(sp, layer.start + i / SR));
        acc += (prev + v) / (2 * SR);
        tab[i] = acc; prev = v;
      }
      c = _spInt[layer.id] = { sig: sig, tab: tab, SR: SR };
      const keys = Object.keys(_spInt);   // bounded: drop a stale entry if the cache grows
      if (keys.length > 24) delete _spInt[keys[0]];
    }
    const x = Math.max(0, Math.min(c.tab.length - 1, into * c.SR));
    const i0 = Math.floor(x), f = x - i0;
    const a = c.tab[i0], b = c.tab[Math.min(c.tab.length - 1, i0 + 1)];
    return a + (b - a) * f;
  };
  /* Numeric playback rate of a layer at project time t. An ANIMATED speed prop is an OBJECT — raw
   * `layer.speed || 1` arithmetic on it silently yields NaN (which once collapsed the whole timeline
   * via a trim). Every call site that needs a number must come through here. */
  FM.speedAt = function (layer, t) {
    const sp = layer.speed;
    if (!isAnimated(sp)) return sp || 1;
    return Math.max(0.05, evalProp(sp, t == null ? (FM.time || 0) : t) || 1);
  };
  /* Longest clip duration whose consumed source stays within availSrc source-seconds.
   * Static speed: plain division (old behaviour). Ramped: bisect the monotonic advance integral. */
  FM.maxDurForSource = function (layer, availSrc, hint) {
    if (!isAnimated(layer.speed)) return availSrc / (layer.speed || 1);
    let hi = Math.max(0.1, hint || layer.duration || 1);
    const save = layer.duration;
    layer.duration = hi;                                 // the integral table must span the probe range
    if (FM.layerSourceAdvance(layer, hi) <= availSrc) { layer.duration = save; return hi; }
    let lo = 0;
    for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (FM.layerSourceAdvance(layer, mid) > availSrc) hi = mid; else lo = mid; }
    layer.duration = save;
    return Math.max(0.1, lo);
  };
  FM.layerLocalTime = function (layer, t) {
    if (t < layer.start || t >= layer.start + layer.duration) return null;
    const into = t - layer.start;                       // seconds into the clip
    if (!isAnimated(layer.speed)) {                      // fast path — unchanged behaviour
      const sp = layer.speed || 1;                       // source advances sp× wall time
      const adv = into * sp;
      const src = layer.reversed ? (layer.duration * sp - adv) : adv;
      return layer.trimStart + src;
    }
    const adv = FM.layerSourceAdvance(layer, into);      // speed ramp: integral of the curve
    const total = FM.layerSourceAdvance(layer, layer.duration);
    return layer.trimStart + (layer.reversed ? total - adv : adv);
  };

  // Effective fade-in/out windows for a clip: when fadeIn+fadeOut exceed the clip duration they're
  // scaled down proportionally so they meet at a single peak (a triangle) instead of overlapping —
  // which would otherwise produce out-of-order Web Audio automation (a pop) on export/preview.
  FM.fadeWindows = function (layer, clipDur) {
    let fi = Math.max(0, layer.fadeIn || 0), fo = Math.max(0, layer.fadeOut || 0);
    if (clipDur > 0 && fi + fo > clipDur) { const k = clipDur / (fi + fo); fi *= k; fo *= k; }
    return { fi: fi, fo: fo };
  };

  // Audio fade multiplier (0..1): given seconds INTO the clip (timeline-local) and the clip's
  // timeline duration, ramps up over fadeIn at the head and down over fadeOut at the tail.
  FM.fadeMul = function (layer, into, clipDur) {
    const win = FM.fadeWindows(layer, clipDur), fi = win.fi, fo = win.fo;
    let g = 1;
    if (fi > 0 && into < fi) g = Math.max(0, into / fi);
    if (fo > 0 && clipDur && into > clipDur - fo) g = Math.min(g, Math.max(0, (clipDur - into) / fo));
    return Math.max(0, Math.min(1, g));
  };

  // TRUE if any group ancestor is hidden (no time-window check) — audio/export gate a clip on this
  // so a clip inside a hidden group is silent, not just invisible. Cycle-safe; only groups gate.
  FM.groupHidden = function (layer) {
    let pid = layer.parent, hops = 0;
    while (pid && hops++ < 64) {
      const p = FM.scene && FM.scene.layers.find(l => l.id === pid);
      if (!p) break;
      if (p.type === 'group' && !p.visible) return true;
      pid = p.parent;
    }
    return false;
  };
  FM.isLayerVisibleAt = function (layer, t) {
    if (!(layer.visible && t >= layer.start && t < layer.start + layer.duration)) return false;
    // A hidden GROUP hides all its descendants — render, audio and export all share this gate.
    // Cycle-safe walk; only group-type ancestors gate visibility (plain parenting never did).
    let pid = layer.parent, hops = 0;
    while (pid && hops++ < 64) {
      const p = FM.scene && FM.scene.layers.find(l => l.id === pid);
      if (!p) break;
      if (p.type === 'group' && !p.visible) return false;
      pid = p.parent;
    }
    return true;
  };

  /* Caption tracks: text of the segment active at the playhead (or null between segments).
   * Segment times are LOCAL to the clip, so captions move/trim/split with their layer. */
  FM.activeCaption = function (layer, t) {
    if (!layer.captions) return null;
    const lt = t - (layer.start || 0);
    let hit = null;
    for (const c of layer.captions) { if (lt >= c.start && lt < c.end && (!hit || c.start > hit.start)) hit = c; }
    return hit ? hit.text : null;
  };
})(window.FM);
