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
  const EASES = {
    linear:    t => t,
    easeIn:    t => t * t,
    easeOut:   t => 1 - (1 - t) * (1 - t),
    easeInOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    hold:      t => 0,
  };
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
        if (b.e === 'hold') return a.v;
        const span = b.t - a.t;
        let f = span <= 0 ? 1 : (t - a.t) / span;
        // Resolve the easing: a custom bez, then a named EASES function, then a named EASE_PRESETS
        // bezier (overshoot/anticipate live ONLY in EASE_PRESETS — without this they fell back to
        // linear, so the graph editor's Overshoot preset produced straight-line motion).
        if (b.bez) f = bezierAt(b.bez[0], b.bez[1], b.bez[2], b.bez[3], f);
        else if (EASES[b.e]) f = EASES[b.e](f);
        else if (FM.EASE_PRESETS[b.e]) { const z = FM.EASE_PRESETS[b.e]; f = bezierAt(z[0], z[1], z[2], z[3], f); }
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

  function upsertKeyframe(p, t, v) {
    const hit = p.kf.find(k => Math.abs(k.t - t) < 1e-3);
    if (hit) { hit.v = v; }
    else { p.kf.push({ t: t, v: v, e: 'easeInOut' }); p.kf.sort((a, b) => a.t - b.t); }
    return p;
  }

  /* Set a transform value at the given time. If the prop is already keyframed, this
   * inserts/updates a keyframe at `time`; otherwise it sets the static value. */
  function setTransform(layer, key, value, time) {
    const p = layer.transform[key];
    if (isAnimated(p)) upsertKeyframe(p, time, value);
    else layer.transform[key] = value;
  }
  FM.setTransform = setTransform;

  /* Toggle a keyframe for a transform prop at `time`. Converts static<->animated. */
  function toggleKeyframe(layer, key, time) {
    let p = layer.transform[key];
    if (!isAnimated(p)) {
      const cur = (typeof p === 'number') ? p : 0;
      layer.transform[key] = { kf: [{ t: time, v: cur, e: 'easeInOut' }] };
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

  /* Every animated prop container ({kf:[…]}) on a layer — transform props plus effect params —
   * so the timeline can show/drag/delete effect-parameter keyframes alongside transform ones. */
  FM.animatedProps = function (layer) {
    const out = [];
    Object.keys(layer.transform).forEach(k => { if (isAnimated(layer.transform[k])) out.push(layer.transform[k]); });
    if (isAnimated(layer.volume)) out.push(layer.volume);   // keyframed audio shows diamonds on the clip too
    if (isAnimated(layer.speed)) out.push(layer.speed);     // speed-ramp keyframes show on the clip
    if (isAnimated(layer.fill)) out.push(layer.fill);       // colour keyframes show on the clip
    if (isAnimated(layer.color)) out.push(layer.color);
    (layer.effects || []).forEach(fx => { if (fx.params) Object.keys(fx.params).forEach(k => { if (isAnimated(fx.params[k])) out.push(fx.params[k]); }); });
    return out;
  };

  /* Generic versions of the above that target ANY container object + key (e.g. an effect's
   * params), so effect parameters / future props are keyframe-able just like transform. */
  FM.setProp = function (container, key, value, time) {
    const p = container[key];
    if (isAnimated(p)) upsertKeyframe(p, time, value);
    else container[key] = value;
  };
  FM.toggleProp = function (container, key, time, dflt) {
    let p = container[key];
    if (!isAnimated(p)) {
      // numbers AND strings (colour props like layer.fill) seed from the current static value
      const cur = (typeof p === 'number' || typeof p === 'string') ? p : (dflt != null ? dflt : 0);
      container[key] = { kf: [{ t: time, v: cur, e: 'easeInOut' }] };
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
      project: { name: 'Untitled', width: 1080, height: 1920, fps: 30, duration: 10, background: '#000000' },
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
      base.fill = props.fill || '#3a7bd5';
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
