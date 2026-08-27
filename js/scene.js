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
        // A parameterised ease (v5.47: the bounce/steps families, each with its own knobs) wins over
        // everything below it. easeApply returns null for an absent or unknown `ez`, so a project
        // saved before this existed — or a hostile import naming a preset this build has never heard
        // of — falls straight through to the chain that has always been here.
        const _ez = FM.easeApply ? FM.easeApply(b.ez, f) : null;
        if (_ez != null) f = _ez;
        else if (b.bez) f = bezierAt(b.bez[0], b.bez[1], b.bez[2], b.bez[3], f);
        else if (hasOwn(EASES, b.e)) f = EASES[b.e](f);
        else if (hasOwn(FM.EASE_PRESETS, b.e)) { const z = FM.EASE_PRESETS[b.e]; f = bezierAt(z[0], z[1], z[2], z[3], f); }
        if (typeof a.v === 'string' || typeof b.v === 'string') return lerpHexKf(a.v, b.v, f);   // colour keyframes
        // Spatial tangents (motion paths): optional per-keyframe k.to (out) / k.ti (in) — value-space
        // offsets in the prop's own units, evaluated as a cubic Hermite on the EASED f so temporal
        // easing still applies. Convention (motion-path.js + smoothPathTangents must match): a tangent
        // ×3 is the f-space velocity at its keyframe, i.e. one tangent unit = one cubic-bezier
        // control-point offset (P1 = a.v + a.to, P2 = b.v + b.ti), and a keyframe is smooth when its
        // ti equals its to. Non-finite tangents are treated as absent — a hostile import must not NaN
        // the transform. With no tangents this falls through to the exact old lerp.
        const mo = a.to, mi = b.ti;
        if (mo != null || mi != null) {
          const o = Number.isFinite(mo) ? mo : null, n = Number.isFinite(mi) ? mi : null;
          if (o != null || n != null) {
            const f2 = f * f, f3 = f2 * f;
            return (2 * f3 - 3 * f2 + 1) * a.v + (f3 - 2 * f2 + f) * 3 * (o || 0)
                 + (3 * f2 - 2 * f3) * b.v + (f3 - f2) * 3 * (n || 0);
          }
        }
        return a.v + (b.v - a.v) * f;
      }
    }
    return last.v;
  }
  FM.evalProp = evalProp;

  /* Auto spatial tangents for a layer's motion path: Catmull-Rom over transform.x and transform.y
   * kf arrays (each axis independently, by index) in evalProp's ×3 convention — tangent at kf i =
   * (v[i+1] - v[i-1]) / 6, one-sided at the ends (the missing neighbour is the point itself).
   * Same value on ti and to = C1-smooth pass-through. opts.tension (default 1) scales the tangents.
   * Callers commit history + rerender. */
  FM.smoothPathTangents = function (layer, opts) {
    const tension = opts && Number.isFinite(opts.tension) ? opts.tension : 1;
    ['x', 'y'].forEach(key => {
      const p = layer && layer.transform && layer.transform[key];
      if (!isAnimated(p) || p.kf.length < 2) return;
      const kf = p.kf;
      for (let i = 0; i < kf.length; i++) {
        const prev = kf[Math.max(0, i - 1)], next = kf[Math.min(kf.length - 1, i + 1)];
        const tan = (next.v - prev.v) / 6 * tension;
        if (!Number.isFinite(tan)) continue;
        if (i > 0) kf[i].ti = tan;
        if (i < kf.length - 1) kf[i].to = tan;
      }
    });
  };
  /* Strip spatial tangents from transform.x/y — the path goes back to exact straight-line lerps. */
  FM.clearPathTangents = function (layer) {
    ['x', 'y'].forEach(key => {
      const p = layer && layer.transform && layer.transform[key];
      if (isAnimated(p)) p.kf.forEach(k => { delete k.ti; delete k.to; });
    });
  };

  /* A layer's audio level at time t — default 1, or the keyframed/animated value. Single source of
   * truth so preview + export read keyframed volume the same way. */
  FM.layerVolume = function (layer, t) { return layer.muted ? 0 : (layer.volume == null ? 1 : evalProp(layer.volume, t)); };

  /* Fill for freshly spawned shapes. The hue WALKS by the golden angle instead of being drawn fresh
   * each time: consecutive spawns land as far apart on the wheel as it is possible to be, so a stack
   * of shapes reads as a chosen palette rather than a pile of near-clashing randoms (Ezra: "the
   * colours are kinda ugly"). The starting point is still random, so a project doesn't always open
   * on the same colour, and saturation/lightness sit in a tight band so everything in one project
   * feels like it belongs to the same set.
   * Math.random is fine here — the value is chosen ONCE at creation and stored on the layer, so
   * preview and export stay identical. */
  const GOLDEN_ANGLE = 137.508;
  let _hue = Math.random() * 360;
  FM.randomFill = function () {
    _hue = (_hue + GOLDEN_ANGLE) % 360;
    const h = _hue, s = 0.70 + Math.random() * 0.12, l = 0.50 + Math.random() * 0.10;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    const hex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return '#' + hex(r) + hex(g) + hex(b);
  };

  /* The colour a NEW shape starts in (queue 142). Ezra: "In the home settings menu, make a setting to
   * change the default colour of shapes when you import them. Applied to every shape."
   * One function, called from one place — makeLayer's `props.fill || …` — so it reaches every route
   * that spawns a shape: the add menu, freehand, vector drawing, the ⋯ menus. Anything that arrives
   * WITH a fill (a saved project, a template, an element, an AI layer, a duplicate) passes it in and
   * is untouched, which is the exemption the setting needs: your preference must not repaint an
   * element somebody designed in its own colours.
   * Validated here as well as on load, because settings live in hand-editable localStorage and this
   * string goes straight to a canvas fillStyle. */
  FM.defaultShapeFill = function () {
    let pref = null;
    try { pref = FM.settings && FM.settings.get ? FM.settings.get('shapeColor') : null; } catch (e) {}
    return (typeof pref === 'string' && /^#[0-9a-f]{6}$/i.test(pref)) ? pref.toLowerCase() : FM.randomFill();
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
  /* ═══ A KEYFRAME LIVES ON A FRAME (queue 625) ════════════════════════════════════════════════════
   * Ezra: *"Sometimes I try to move key frames and it just duplicates them and sometimes I try to
   * delete them and I can't."* One mechanism, both halves, and it is a MISMATCH rather than a bug in
   * either side:
   *   · the timeline DRAG snaps to the frame grid — `Math.round(timeFromX(x) * fps) / fps`
   *   · every WRITE below took the raw playhead time, which scrubbing leaves between frames
   * MEASURED (tests/_625kf.html): a keyframe added at playhead 1.020833 stays at 1.020833, and a drag
   * onto it lands at 1.033333. **The gap is 0.0125s against a 0.001s dedup tolerance, so both survive
   * — and at a normal 60 px/s timeline that is 0.75px, far inside one diamond.** They draw on top of
   * each other, so it reads as a keyframe that duplicated itself; delete one and the other is still
   * there, unmoved, which is the second half of his report exactly.
   * SNAPPING AT THE WRITE is the choke point: every route that creates a keyframe goes through these
   * three lines, so no caller has to remember. Sub-frame precision was never observable anyway — the
   * compositor samples at frame times, and the drag has always quantised.
   * ⚠️ Falls back to the raw time when there is no sane fps, rather than dividing by zero and writing
   * NaN into a keyframe, which would be far worse than the bug being fixed. */
  // Half a frame — the widest gap at which two keyframes are still the same frame. Falls back to the
  // old fixed tolerance when there is no usable fps, so behaviour never becomes undefined.
  function HALF_FRAME() {
    const fps = (FM.scene && FM.scene.project && FM.scene.project.fps) || 0;
    return fps > 0 ? (0.5 / fps) : 1e-3;
  }
  FM._halfFrame = HALF_FRAME;

  /* ⚠️ DELEGATES TO FM.snapFrame RATHER THAN RE-IMPLEMENTING IT. The first version of this was its own
     copy of `Math.round(t * fps) / fps` — a second copy of one number, which is the exact failure this
     file warns about a few hundred lines down (the default text size was written twice and the two
     disagreed, so "Reset Text" restored a size no new layer had ever used).
     The wrapper exists only for LOAD ORDER: scene.js is parsed before app.js, so FM.snapFrame is not
     defined yet when this file runs — it always is by the time a keyframe is written, and the fallback
     covers the impossible case rather than trusting it. */
  function snapKfTime(t) {
    if (!Number.isFinite(t)) return t;
    if (typeof FM.snapFrame === 'function') return FM.snapFrame(t);
    const fps = (FM.scene && FM.scene.project && FM.scene.project.fps) || 0;
    return fps > 0 ? Math.round(t * fps) / fps : t;
  }
  FM.snapKfTime = snapKfTime;

  function upsertKeyframe(p, t, v) {
    t = snapKfTime(t);
    /* HALF A FRAME, not 1e-3. Snapping above stops NEW pairs forming, but his projects are already
       full of off-grid keyframes from before this fix, and a 1e-3 window can never match them — he
       would keep hitting the bug on every project he already has. Half a frame is the honest test for
       "these are the same keyframe", because nothing between two frames is distinguishable. */
    const hit = p.kf.find(k => Math.abs(k.t - t) < HALF_FRAME());
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

  /* STRETCH a layer's whole animation about its own start: a keyframe `d` seconds into the clip moves
   * to `d * factor` seconds in. The companion to shiftLayerKeyframes — that one slides the animation,
   * this one changes how long it takes.
   *
   * Ezra, queue 68: "if you add a bunch of effects with key frames you may want to make it go faster
   * or slower, changing all the key frames automatically to slow or speed with the layer instead of
   * manually doing it." Changing Speed already re-times the CLIP (the source span is invariant, so the
   * bar grows or shrinks) but left every keyframe at its absolute project time — so a 2x speed-up
   * halved the bar and left the animation running past the end of it, and every keyframe had to be
   * dragged by hand afterwards. This is what makes them ride along.
   *
   * The pivot is layer.start, NOT the playhead: the clip re-times about its own beginning (that is
   * where duration is measured from), so anything else would slide the animation off the clip as well
   * as stretching it.
   *
   * The SPEED track is excluded, and that is load-bearing rather than tidy. A speed ramp's keyframes
   * say "at this moment, play at this rate"; they describe the re-timing, so scaling them by the
   * re-timing they caused would compound — each edit would re-time the ramp that produced it. The
   * ramp branch of the Speed control does not resize the clip either, for the same reason.
   *
   * Guarded against nonsense factors (0, negative, NaN, Infinity) because this REWRITES times in
   * place: a bad factor does not merely look wrong, it destroys the timing and undo is the only way
   * back. */
  FM.scaleLayerKeyframes = function (layer, factor, pivot) {
    if (!layer || !isFinite(factor) || factor <= 0 || factor === 1) return 0;
    const t0 = (pivot == null) ? (layer.start || 0) : pivot;
    let n = 0;
    FM.animatedProps(layer).forEach(p => {
      if (p === layer.speed) return;   // the ramp describes the re-timing; it must not be re-timed by it
      p.kf.forEach(k => { k.t = t0 + (k.t - t0) * factor; n++; });
    });
    return n;
  };

  /* Toggle a keyframe for a transform prop at `time`. Converts static<->animated. */
  function toggleKeyframe(layer, key, time) {
    let p = layer.transform[key];
    if (!isAnimated(p)) {
      const cur = (typeof p === 'number') ? p : 0;
      layer.transform[key] = { kf: [{ t: snapKfTime(time), v: cur, e: 'linear' }] };
      return true;
    }
    const hit = p.kf.find(k => Math.abs(k.t - time) < HALF_FRAME());
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
  /* ---- THE effect-stack walker (queue 113, step 2 of the filters plan) --------------------------
   *
   * A filter is one normal effect that happens to hold other effects (FILTERS-DESIGN.md §1), so
   * `layer.effects` stays the flat array it has always been and the nesting lives on ONE entry. That
   * keeps the ~45 compositor sites and the 20 that peel an effect off the stack by object identity
   * working untouched — but it means anything that walks the stack ONE LEVEL DEEP now sees a
   * container and misses everything inside it, silently, in seven different ways: no timeline
   * diamonds, keyframes you can see and cannot delete, keyframe copy/paste landing on the wrong
   * parameter, an audio link retargeting a different effect, and a Luma Matte / Compound Blur /
   * Match Grade / Displacement Map keeping a DEAD layer id after a duplicate, import or paste.
   *
   * So there is exactly one walker and every one of those sites goes through it. Landed BEFORE any
   * filter can be created, so the whole of step 2 is assertable as "nothing changed": with no
   * containers in the data this is a plain forEach over layer.effects.
   *
   * `fn(fx, path, parent)` — path is [i] for a top-level effect and [i, j] for a child; parent is
   * null or the container. The container itself is visited too, because it owns a real param of its
   * own (strength) that keyframes like any other. */
  FM.FX_CONTAINER = 'filter';
  FM.isFxContainer = function (fx) { return !!(fx && fx.type === FM.FX_CONTAINER && Array.isArray(fx.effects)); };
  FM.eachFx = function (layer, fn) {
    const list = (layer && layer.effects) || [];
    for (let i = 0; i < list.length; i++) {
      const fx = list[i];
      if (!fx) continue;
      fn(fx, [i], null);
      // Depth is capped at 1 by the data shape itself — a child is never descended into, so even a
      // hand-edited project file claiming a filter inside a filter cannot make this recurse.
      if (FM.isFxContainer(fx)) {
        for (let j = 0; j < fx.effects.length; j++) { const ch = fx.effects[j]; if (ch) fn(ch, [i, j], fx); }
      }
    }
  };
  FM.fxAt = function (layer, path) {
    if (!path || !path.length) return null;
    let fx = ((layer && layer.effects) || [])[path[0]];
    if (path.length > 1) fx = FM.isFxContainer(fx) ? fx.effects[path[1]] : null;
    return fx || null;
  };
  /* Three independent address grammars index this stack one level deep — 'effect.<i>.<key>' (the
   * timeline's keyframe clipboard), 'fx:<i>:<key>' (audio-react) and 'effect:<i>:<key>' (arriving
   * from the AI model, never built locally). Rather than widen three regexes three different ways,
   * they share these two, which read and write BOTH the 2-part and 3-part index forms.
   * Old addresses keep working unchanged: that back-compatibility is the point, since kfClipboard
   * entries and saved audio links are both written in the short form today. */
  FM.fxAddr = function (path, key, prefix, sep) { return prefix + sep + path.join(sep) + sep + key; };
  FM.fxAddrParse = function (s, prefix, sep) {
    s = String(s == null ? '' : s);
    const head = prefix + sep;
    if (s.indexOf(head) !== 0) return null;
    const parts = s.slice(head.length).split(sep);
    const path = [];
    // Consume leading integers as indices, never the last segment (that is always the param key), and
    // never more than two — so a param key that is itself a number stays a key, not an index.
    while (parts.length > 1 && path.length < 2 && /^\d+$/.test(parts[0])) path.push(parseInt(parts.shift(), 10));
    if (!path.length || !parts.length) return null;
    return { path: path, key: parts.join(sep) };
  };

  FM.animatedProps = function (layer) {
    const out = [];
    Object.keys(layer.transform).forEach(k => { if (isAnimated(layer.transform[k])) out.push(layer.transform[k]); });
    if (isAnimated(layer.volume)) out.push(layer.volume);   // keyframed audio shows diamonds on the clip too
    if (isAnimated(layer.speed)) out.push(layer.speed);     // speed-ramp keyframes show on the clip
    if (isAnimated(layer.fill)) out.push(layer.fill);       // colour keyframes show on the clip
    if (isAnimated(layer.color)) out.push(layer.color);
    if (layer.fillGradient) ['ox', 'oy'].forEach(k => { if (isAnimated(layer.fillGradient[k])) out.push(layer.fillGradient[k]); });   // gradient centre (dragged on the canvas)
    ['fillImgX', 'fillImgY'].forEach(k => { if (isAnimated(layer[k])) out.push(layer[k]); });   // media-fill pan
    if (layer.stroke) { if (isAnimated(layer.stroke.width)) out.push(layer.stroke.width); if (isAnimated(layer.stroke.color)) out.push(layer.stroke.color); }   // border (keyframeable)
    if (layer.crop) ['x', 'y', 'w', 'h'].forEach(k => { if (isAnimated(layer.crop[k])) out.push(layer.crop[k]); });   // crop keyframes — omitting them left crop animation behind on clip moves and undeletable
    if (layer.shadow) ['blur', 'dx', 'dy', 'alpha', 'color'].forEach(k => { if (isAnimated(layer.shadow[k])) out.push(layer.shadow[k]); });   // shadow (keyframeable)
    if (layer.trimPath) ['start', 'end', 'offset'].forEach(k => { if (isAnimated(layer.trimPath[k])) out.push(layer.trimPath[k]); });   // stroke draw-on
  /* A DRAWING'S "Draw from" / "Draw to" (queue 227's draw-on, registered 22 Aug). These live on the
     layer as `trimStart` / `trimEnd`, and they were keyframable and rendered from day one — but were
     listed by NEITHER collector, so nothing else in the app knew they existed. Measured consequence:
     moving a clip carried its transform keyframes (1,4 → 3,6) and left the draw-on sitting at 1,4, so the
     drawing animated at the wrong time relative to its own clip.
     ⚠️ THE GATE IS LOAD-BEARING, NOT TIDINESS. On a VIDEO layer `trimStart` is the source trim IN
     SECONDS — read as a bare number by the exporter, the audio player, the timeline and the audio
     reactor. Registering it as a keyframable slot on anything but an open path would let the keyframe
     machinery write an object where those readers expect a number, which is a far worse bug than the one
     being fixed. Only a shape's open path has the draw-on meaning, which is exactly the condition the
     inspector uses to build the two rows. */
  if (layer.type === 'shape' && layer.shape === 'path' && !layer.closed) {
    ['trimStart', 'trimEnd'].forEach(k => { if (isAnimated(layer[k])) out.push(layer[k]); });
  }
    if (layer.stroke && layer.stroke.dash && isAnimated(layer.stroke.dash.offset)) out.push(layer.stroke.dash.offset);   // marching-ants
    if (layer.repeater) ['copies', 'offsetX', 'offsetY', 'rotation', 'scale', 'opacity'].forEach(k => { if (isAnimated(layer.repeater[k])) out.push(layer.repeater[k]); });   // shape repeater
    if (layer.masks) layer.masks.forEach(m => { if (m && isAnimated(m.path)) out.push(m.path); });   // pen-mask path (moving reveal / roto) — its keyframes show on the clip and retime with it
    FM.eachFx(layer, fx => { if (fx.params) Object.keys(fx.params).forEach(k => { if (isAnimated(fx.params[k])) out.push(fx.params[k]); }); });
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
      container[key] = { kf: [{ t: snapKfTime(time), v: cur, e: 'linear' }] };
      return true;
    }
    const hit = p.kf.find(k => Math.abs(k.t - time) < HALF_FRAME());
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
  /* Keep every animated prop SORTED. `evalProp`'s whole structure depends on ascending `t` — its two
   * early-outs and its pair scan all assume it — and a list out of order does not degrade, it goes
   * badly wrong: measured (tests/_kfhostile.html), an unsorted three-keyframe list returns the LAST
   * value at every time including at the other keyframes' own times, so the animation is simply frozen
   * on the wrong number.
   * Split out of dedupDraggedKfs so the DRAG can call it per move. The drag writes `kf.t` on every
   * pointermove and only sorted on release, so for the whole of a drag that carried a keyframe past its
   * neighbour the preview was showing that broken evaluation — you were choosing a position by watching
   * a picture that was wrong. Sorting a handful of keyframes per move costs nothing. */
  FM.sortKeyframes = function (layer) {
    (FM.animatedProps ? FM.animatedProps(layer) : []).forEach(p => { p.kf.sort((a, b) => a.t - b.t); });
  };

  FM.dedupDraggedKfs = function (layer, draggedKfs) {
    const dragged = new Set(draggedKfs || []);
    const EPS = HALF_FRAME();   // queue 625 — a drag lands ON a frame; the keyframe under it may not be
    (FM.animatedProps ? FM.animatedProps(layer) : []).forEach(p => {
      const dts = p.kf.filter(k => dragged.has(k)).map(k => k.t);
      if (dts.length) p.kf = p.kf.filter(k => dragged.has(k) || !dts.some(dt => Math.abs(dt - k.t) < EPS));
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

  /* THE DEFAULT TEXT SIZE, IN ONE PLACE (queue 98).
   * It used to be written down twice: the Add Text button computed `min(W,H)/6.75` (160 on a
   * 1080x1920 project) and this constructor fell back to a bare **96** — and the two disagreeing is
   * not theoretical. Long-pressing the Text card offers "Reset Text", which builds a pristine layer
   * with NO props and copies its text properties across, `fontSize` among them. So a reset did not
   * restore the app's default at all: it set 96 on every project regardless of size, which is 40%
   * smaller than a freshly added text layer on his 1080x1920 and under a third the size on a 2880
   * comp. Two copies of one number, and the smaller copy was the one wired to the button labelled
   * "Reset".
   * Loading a saved project does NOT go through makeLayer, so nothing existing is resized by this. */
  FM.defaultTextSize = function () {
    const P = FM.scene && FM.scene.project;
    if (!P || !P.width || !P.height) return 96;   // no project open yet — the old bare number stands
    return Math.round(Math.min(P.width, P.height) / 6.75);
  };

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
      // Motion Blur (Object) is an EFFECT now (queue 335), so nothing is seeded here any more — a dead
    // key on every layer of every type, including cameras and the synthetic '_flat' group proxy, was
    // just something for a future reader to mistake for live state. The CAMERA's own motionBlur is a
    // different feature and is set where cameras are built, not here.
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
      base.fontSize = props.fontSize || FM.defaultTextSize();
      base.color = props.color || '#ffffff';
      base.fontFamily = props.fontFamily || 'Inter, sans-serif';
      base.align = 'center';
      base.bold = false;
      base.italic = false;
      base.letterSpacing = 0;
      base.lineHeight = 1.15;
      base.wrapWidth = props.wrapWidth || 0;   // 0 = no wrapping; set by dragging the side handles on the canvas (v5.40)
      base.stroke = { enabled: false, width: 6, color: '#000000' };
      base.textAnim = { preset: 'none', unit: 'char', durIn: 0.6, durOut: 0, stagger: 0.04 };
    }
    if (type === 'shape') {
      base.shape = props.shape || 'rect';      // rect | ellipse | line | polygon
      base.shapeW = props.shapeW || 400;
      base.shapeH = props.shapeH || 300;
      // No fill given → whatever Settings says new shapes should be: a chosen colour, or (the default,
      // and what the app has always done) a random VIVID colour per spawn — random hue, sat/light kept
      // in a range that never lands on mud or near-black. Only creation-time: saved/imported/template/
      // AI layers all pass their stored fill and are untouched, and duplicates clone the source layer
      // directly. See FM.defaultShapeFill (queue 142).
      base.fill = props.fill || FM.defaultShapeFill();
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
  /* THE EFFECT-PHASE CLOCK, in ONE place (bug hunt, 21 Aug). Every time-driven canvas effect — Drift,
   * Spin, Orbit, Wiggle, Shake and the rest — is driven by "seconds since THIS CLIP began", so a split
   * handed the tail half a fresh clock and the picture SNAPPED at a cut that is meant to be invisible:
   * measured at 211px of centroid shift on a 320px-wide canvas for Drift, 162 for Shake, 160 for Orbit
   * (tests/_splitclock.html). Five of the seven time-driven effects moved.
   * `fxTimeOffset` carries the phase across the cut. It is an OFFSET, not an absolute time, for two
   * reasons: dragging the half somewhere else still takes its effects with it, and splitting an already
   * split half chains instead of overwriting.
   * NON-UNDERSCORE ON PURPOSE. The obvious fix is `_clipStart`, which already exists for group proxies —
   * but FM.jsonReplacer strips every key beginning with '_', so that version would have worked until the
   * first save or the first undo and then quietly reverted. That is a worse bug than the one it fixes.
   * Coerced exactly the way FM.speedAt and FM.fadeWindows are, and for the same reason: a saved document
   * the UI did not write can carry a string or an Infinity here, and Infinity puts every one of those
   * effects at a non-finite phase for the rest of the render. */
  /* WHICH HALF OF A SPLIT PARENT DOES A CHILD FOLLOW? (bug hunt, 21 Aug.)
   * A split divides the parent's keyframes so each half owns only its own window — correct, and the
   * reason stray diamonds stopped being drawn outside a clip. But a child resolves its parent at any
   * absolute time regardless of whether that parent is on screen, and FM.evalProp clamps to the last
   * keyframe. So the child kept following the HEAD half, which had stopped moving: measured, a child
   * froze at the cut and drifted 80px out of place by the end (tests/_splitparent.html), while the
   * tail half carried on across the screen in plain sight.
   * The halves therefore carry a shared `splitOf` lineage, and a lookup picks the half that actually
   * covers the time being asked about. Named for CLIPS rather than parents because the same question is
   * asked by anything that references a layer by id across time — an Audio Drive behavior reading from a
   * music clip hit the identical fault and is the second caller.
   * COST: `!p.splitOf` is the first thing tested, so a project that has never split a parent pays one
   * property read per lookup and never scans. That matters — this is called per parented layer per
   * frame, and slow playback is an open complaint. */
  FM.clipAt = function (scene, pid, t) {
    const p = FM.layerById(scene, pid);
    if (!p || !p.splitOf) return p;
    const covers = l => t >= (l.start || 0) - 1e-9 && t <= (l.start || 0) + (l.duration || 0) + 1e-9;
    if (covers(p)) return p;
    const ls = scene.layers;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      if (l !== p && l.splitOf === p.splitOf && covers(l)) return l;
    }
    return p;
  };

  FM.fxLocalTime = function (layer, t) {
    if (!layer) return t;
    const base = (layer._clipStart != null) ? layer._clipStart : (layer.start || 0);
    const o = layer.fxTimeOffset;
    const n = (typeof o === 'number') ? o : parseFloat(o);
    return t - base + (isFinite(n) ? n : 0);
  };

  FM.cloneLayer = function (layer, plain) {
    const c = JSON.parse(JSON.stringify(layer, FM.jsonReplacer));
    c.id = uid('layer');
    if (!plain) {
      c.clipColor = CLIP_COLORS[_colorIdx++ % CLIP_COLORS.length];
      c.name = (layer.name || 'Layer') + ' copy';
      /* NO POSITIONAL NUDGE (queue 156). Ezra: "Duplicating stuff should duplicate it in its exact
       * position, not move it slightly."
       * This used to add +30px to x and y — and to every keyframe of an animated path — "so the copy is
       * visible". That was a fair default while "Duplicate in place" sat beside it in the layer menu as
       * the other choice. It stopped being fair in v5.91, when he circled six entries including that
       * one and said "Remove the circled options in this menu": from then on the nudging version was
       * the only duplicate in the app, and there was no way to get an exact copy at all.
       * A duplicate now lands exactly on its original. It is still findable — it is selected on
       * creation, it takes the next clip colour, and it is named "… copy" on its own timeline row. */
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

  // Break any CIRCULAR parent link in a layer list, in place. A build before v5.06 could autosave
  // G.parent === G2 while G2.parent === G (see FM.groupSelection), and a document like that is not
  // merely wrong, it is unopenable: the parent walks that carry a seen-guard bail out early, the one
  // that did not recursed until the stack blew — inside FM.storage.load(), so the boot .then() never
  // ran and the user lost the route back to Home and to every OTHER project with it.
  //
  // Deliberately MINIMAL: for each loop exactly one edge is dropped — the one that closes it — so the
  // rest of the hierarchy survives and a healthy document comes out byte-for-byte identical (no field
  // is written, not even parent: null on a layer that never had a parent). A dangling parent id is
  // NOT a cycle and is left alone; the app already tolerates it. Returns the repaired layers' names
  // so the caller can say what it did, or null when there was nothing to repair — so the clean case
  // stays silent. Terminates without a hop cap: `seen` grows by one every iteration and is bounded by
  // the layer count.
  FM.repairParentCycles = function (layers) {
    if (!Array.isArray(layers) || !layers.length) return null;
    const byId = new Map();
    layers.forEach(l => { if (l && l.id) byId.set(l.id, l); });
    const fixed = [];
    for (const l of layers) {
      if (!l || !l.parent) continue;
      const seen = new Set([l.id]);
      let cur = l;
      while (cur && cur.parent) {
        const up = byId.get(cur.parent);
        if (!up) break;                  // dangling parent id — not a cycle
        if (seen.has(up.id)) {           // this edge closes the loop: drop THIS one, keep the chain
          fixed.push(cur.name || cur.id);
          cur.parent = null;
          break;
        }
        seen.add(up.id);
        cur = up;
      }
    }
    return fixed.length ? fixed : null;
  };

  /* Local source time for a layer at global project time t.
   * Returns null when the layer is not on-screen at t. Accounts for reverse + trim. */
  // Source-seconds advanced after `into` clip-seconds. Static speed = plain multiply (old path,
  // byte-identical). KEYFRAMED speed = SPEED RAMPING: numerically integrate the eased curve with a
  // cached cumulative table (trapezoid @120Hz) so every lookup — scrub, playback, export — is O(1).
  const _spInt = {};   // layerId -> { sig, tab, SR } (module cache; never serialized with the layer)
  FM.layerSourceAdvance = function (layer, into) {
    const sp = layer.speed;
    // THROUGH speedAt, for the reason written on it: `sp || 1` returns an OBJECT for a malformed
    // animated prop, and this multiply then yields NaN — the same hole, in the function that sizes the
    // clip's whole source window. Caught by the source-time sweep, which asserts this total is finite
    // BEFORE it uses it; the probe version had a fallback here and missed it entirely.
    if (!isAnimated(sp)) return Math.max(0, into) * FM.speedAt(layer, layer.start);
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
    /* …AND IT NOW ACTUALLY RETURNS A NUMBER, which the comment above has always promised and this line
       did not deliver. `sp || 1` hands back whatever truthy thing is on the layer — including an OBJECT.
       A well-formed animated prop is caught by `isAnimated`, but a MALFORMED one is not: `{ keys: [...] }`
       instead of `{ kf: [...] }` is truthy, fails `Array.isArray(p.kf)`, and sails out of here as an
       object. The caller then multiplies by it and gets NaN.
       Found by sweeping FM.layerLocalTime (tests/_srctime.html): every valid combination of reversed ×
       speed × trim × duration holds, and a malformed speed produces NaN source time at every sample —
       silently, in the function every frame read goes through. NaN in, no picture out, and the exporter
       does the same.
       Reachable, not hypothetical: `.fmotion.json` is untrusted input, the load path deliberately does
       NOT re-run most sanitisers ("anything an import once let through has been autosaved back into
       localStorage and comes in unchecked here forever after"), and this app has already been bitten by
       exactly this — the comment above records a ramped speed collapsing the whole timeline via a trim.
       Behaviour for every VALID input is unchanged: 0 and undefined still become 1, as `|| 1` did. */
    if (!isAnimated(sp)) {
      const n = (typeof sp === 'number') ? sp : parseFloat(sp);
      return (isFinite(n) && n !== 0) ? n : 1;
    }
    return Math.max(0.05, evalProp(sp, t == null ? (FM.time || 0) : t) || 1);
  };
  /* Longest clip duration whose consumed source stays within availSrc source-seconds.
   * Static speed: plain division (old behaviour). Ramped: bisect the monotonic advance integral. */
  FM.maxDurForSource = function (layer, availSrc, hint) {
    /* THROUGH speedAt, the last site that was not (bug hunt, 21 Aug). This was dividing by
     * `layer.speed || 1`, and for a malformed animated prop — an object with no `kf` array, which
     * isAnimated rejects — that divides by an OBJECT and yields NaN, which is then written straight
     * into layer.duration. Swept over twelve speed values (tests/_maxdur.html): four produced a
     * duration the scene cannot use — `{}`, an object with no kf, a non-array kf (all NaN), and
     * Infinity (0, an empty clip). Exactly the hole already closed in FM.speedAt and
     * FM.layerSourceAdvance, in the third function of the same family. */
    if (!isAnimated(layer.speed)) return availSrc / FM.speedAt(layer, layer.start);
    let hi = Math.max(0.1, hint || layer.duration || 1);
    const save = layer.duration;
    try {
      layer.duration = hi;                               // the integral table must span the probe range
      if (FM.layerSourceAdvance(layer, hi) <= availSrc) return hi;
      let lo = 0;
      for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (FM.layerSourceAdvance(layer, mid) > availSrc) hi = mid; else lo = mid; }
      return Math.max(0.1, lo);
    } finally { layer.duration = save; }                 // a throw must not leave the clip resized
  };
  /* HOW MUCH SOURCE IS CONSUMED BETWEEN TWO POINTS IN A CLIP (bug hunt, 21 Aug).
   * FM.layerSourceAdvance above answers "from the clip's start", and CLAMPS to [0, duration] — so it
   * cannot answer "past the tail" (needed when a tail is extended) or "before the head" (needed when a
   * head is pulled earlier), which is exactly what the edge editors were asking. They were using the
   * INSTANTANEOUS rate at one end times the delta instead, which is only right when the speed is flat.
   * Measured (tests/_ramptrim.html) on a 0.5x -> 2x ramp: a 1s head trim displaced the surviving picture
   * by 0.125s of source, and extending the tail of a REVERSED ramped clip displaced every frame already
   * on screen by a full second.
   * Implemented by presenting the layer as a virtual clip spanning exactly the window asked about. The
   * speed keyframes are in ABSOLUTE project time, so integrating a shifted window integrates the right
   * part of the curve; and layerSourceAdvance's own cache signature includes start and duration, so each
   * window gets its own table rather than a stale one. Restored on a finally, so a throw inside cannot
   * leave the layer resized. One-shot edit path only — never per frame. */
  FM.speedAdvanceOver = function (layer, fromInto, toInto) {
    if (!layer || !(toInto > fromInto)) return 0;
    const s0 = layer.start, d0 = layer.duration;
    try {
      layer.start = (s0 || 0) + fromInto;
      layer.duration = Math.max(0.001, toInto - fromInto);
      const v = FM.layerSourceAdvance(layer, layer.duration);
      return isFinite(v) ? v : 0;
    } finally { layer.start = s0; layer.duration = d0; }
  };

  /* HOW FAR CAN THE TAIL GROW BEFORE IT RUNS OUT OF SOURCE? (bug hunt, 21 Aug.)
   * A reversed clip's tail eats source BELOW trimStart, so the growth is capped by how much there is.
   * The old cap divided the available source by a flat rate — and for a ramp it used a rate of 1x — so
   * the source it actually consumed did not match the source it gave up, and every frame already on
   * screen slid by the difference: measured at a full second (tests/_ramptrim.html).
   * Solved against the real curve instead. Bisection rather than algebra because the ramp is an
   * arbitrary keyframed curve with easing, and this runs once per edit, not per frame. */
  FM.speedAdvanceSolve = function (layer, fromInto, maxTo, budget) {
    if (!(maxTo > fromInto) || !(budget > 0)) return fromInto;
    if (FM.speedAdvanceOver(layer, fromInto, maxTo) <= budget) return maxTo;
    let lo = fromInto, hi = maxTo;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (FM.speedAdvanceOver(layer, fromInto, mid) > budget) hi = mid; else lo = mid;
    }
    return lo;
  };

  /* The source consumed by moving a clip's HEAD by `delta` seconds — positive trims inward, negative
   * pulls it earlier and reveals source before the current window. Signed, so callers just add it. */
  FM.headSourceDelta = function (layer, delta) {
    if (!isFinite(delta) || !delta) return 0;
    return delta > 0 ? FM.speedAdvanceOver(layer, 0, delta) : -FM.speedAdvanceOver(layer, delta, 0);
  };

  FM.layerLocalTime = function (layer, t) {
    if (t < layer.start || t >= layer.start + layer.duration) return null;
    const into = t - layer.start;                       // seconds into the clip
    if (!isAnimated(layer.speed)) {                      // fast path — unchanged behaviour
      const sp = FM.speedAt(layer, t);                   // source advances sp× wall time — THROUGH speedAt, which is the only thing that guarantees a number
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
    /* FINITE, NON-NEGATIVE NUMBERS, ALWAYS — the same discipline as FM.speedAt above, and for the same
     * reason (bug hunt, 21 Aug). `Math.max(0, layer.fadeIn || 0)` returns NaN for a string or an object
     * and Infinity for Infinity, and the proportional scaling below cannot fix either: it is skipped
     * entirely when `clipDur <= 0`, and `Infinity * 0` is NaN rather than 0.
     * Swept over fadeIn x fadeOut x clipDur including hostile values (tests/_fadesweep.html): 342 of 726
     * combinations produced a non-finite window before this.
     * NaN is mostly harmless downstream — every consumer tests `fi > 0`, which NaN fails, so the fade is
     * silently LOST rather than wrong. **Infinity is not.** `js/audio-play.js` does
     * `linearRampToValueAtTime(vol, base + fi / pr)` behind exactly that `fi > 0` test, and Infinity
     * passes it: Web Audio throws on a non-finite time, which kills playback. Reachable the way all of
     * these are — a saved document the UI did not write.
     * Coerced at the source rather than guarded at each caller, because there are three of them and the
     * next one will not know. */
    const num = v => { const n = (typeof v === 'number') ? v : parseFloat(v); return (isFinite(n) && n > 0) ? n : 0; };
    let fi = num(layer.fadeIn), fo = num(layer.fadeOut);
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
  /* ⚠️ OVERLAPPING CAPTIONS ALL SHOW, STACKED — queue 574. Ezra: *"The captions currently let you put
     one on top of the other but it doesn't actually show both at the same time, make it so you can show
     both at the same time."*
     This used to keep exactly ONE cue — `(!hit || c.start > hit.start)` picks the latest-starting
     overlap and silently drops the rest — so the editor happily let him stack two and the renderer then
     threw one away. **The UI offered something the renderer refused to draw**, which is the worst of
     both: no error, no warning, just a caption that does not appear.
     Now every cue live at `t` is returned, joined by a newline, which is what "one on top of the other"
     means once it reaches the text renderer — it already splits on newlines and lays out lines, so
     stacked captions inherit alignment, line height, animation and stagger for free rather than needing
     a second layout path.
     ⚠️ **ORDER IS `start`, THEN ORIGINAL INDEX.** Sorting on start alone leaves two cues that begin at
     the same instant in whatever order the array happens to hold, so the same project could render them
     one way today and the other way after an edit reordered the list. The index tiebreak makes it
     stable and repeatable — and therefore makes the EXPORT match the preview.
     ⚠️ **EMPTY CUES ARE SKIPPED.** An empty cue overlapping a real one would otherwise contribute a
     blank line and shove the visible caption off its position for no reason he could see.
     ⚠️ **THE SINGLE-CAPTION CASE IS BYTE-IDENTICAL** — one live cue joins to exactly its own text — so
     this cannot disturb the ordinary caption track, and the test asserts that as the control. */
  FM.activeCaption = function (layer, t) {
    if (!layer.captions) return null;
    const lt = t - (layer.start || 0);
    const live = [];
    layer.captions.forEach(function (c, i) { if (c && lt >= c.start && lt < c.end) live.push({ c: c, i: i }); });
    if (!live.length) return null;
    live.sort(function (a2, b2) { return (a2.c.start - b2.c.start) || (a2.i - b2.i); });
    const parts = live.map(function (o) { return o.c.text || ''; }).filter(function (s2) { return s2 !== ''; });
    return parts.length ? parts.join('\n') : null;
  };

  /* ---------- resizing a project without wrecking what is in it ---------- */
  /* Canvas settings has always let you change a project's width and height, and it has always done
   * ONLY that: every layer kept the pixel coordinates it had, so changing 1080x1920 to 1080x1080 left
   * the work sitting wherever those old numbers happened to land. That silence is also why the cap
   * added in v9.27 could not repair the 12.2-megapixel project in queue 202 — shrinking it would have
   * scattered the layers.
   *
   * WHAT MOVES, AND WHY THE LIST IS SHORT. Almost nothing needs touching, because almost everything is
   * expressed INSIDE a layer's own transform and therefore follows its scale for free — a shape's
   * width, a font size, a stroke, the legacy vector mask, a repeater's offsets. Only three kinds of
   * value live in absolute PROJECT pixels and so have to be mapped by hand:
   *   1. A ROOT layer's position and scale. Root only: applyParentChain translates and scales by each
   *      parent before the child's own transform, so a child's numbers are already parent-local, and
   *      scaling both ends would apply the factor twice.
   *   2. Pen-mask paths (layer.masks[].path). Those are canvas-space points with no layer transform
   *      applied at all — mask-tool.js says so in its opening comment — so they must move with the
   *      frame or the mask lands somewhere else entirely.
   *   3. Drop-shadow blur and offset. ctx.shadowBlur is device pixels on the target by specification;
   *      the current transform does not touch it, which is the same rule the compositor's "uncapped
   *      companion" note is about. So a shadow does NOT follow its layer's scale and has to be mapped.
   * Effect parameters measured in pixels are mapped too, from the registry's own `unit: 'px'` rather
   * than a hand-written list, and clamped back into each parameter's declared range.
   *
   * Non-uniform changes (a different aspect ratio) use the SMALLER factor and re-centre, so the work
   * stays whole and centred instead of being stretched.
   */
  FM.rescaleProjectContents = function (layers, fromW, fromH, toW, toH) {
    fromW = +fromW; fromH = +fromH; toW = +toW; toH = +toH;
    if (!(fromW > 0 && fromH > 0 && toW > 0 && toH > 0)) return null;
    const k = Math.min(toW / fromW, toH / fromH);
    if (!isFinite(k) || k <= 0) return null;
    const mapX = v => (v - fromW / 2) * k + toW / 2;
    const mapY = v => (v - fromH / 2) * k + toH / 2;
    const stat = { k: k, layers: 0, masks: 0, points: 0, shadows: 0, params: 0, clamped: 0 };

    // Every value of a property, animated or not — a keyframed position has to move at every key or
    // the animation walks off the frame partway through.
    const each = (o, key, fn) => {
      if (!o) return;
      const v = o[key];
      if (v && Array.isArray(v.kf)) { let n = 0; v.kf.forEach(p => { if (typeof p.v === 'number') { p.v = fn(p.v); n++; } }); return n > 0; }
      if (typeof v === 'number') { o[key] = fn(v); return true; }
      return false;
    };
    const mapPts = arr => {
      if (!Array.isArray(arr)) return 0;
      let n = 0;
      arr.forEach(pt => { if (Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number') { pt[0] = mapX(pt[0]); pt[1] = mapY(pt[1]); n++; } });
      return n;
    };

    const byId = Object.create(null);
    (layers || []).forEach(l => { if (l && l.id) byId[l.id] = l; });

    (layers || []).forEach(L => {
      if (!L) return;
      const parented = !!(L.parent && byId[L.parent]);
      if (L.transform && !parented) {
        each(L.transform, 'x', mapX);
        each(L.transform, 'y', mapY);
        each(L.transform, 'z', v => v * k);
        each(L.transform, 'scale', v => v * k);
        stat.layers++;
      }
      // Pen masks are canvas-space for EVERY layer, parented or not.
      (L.masks || []).forEach(m => {
        if (!m) return;
        let moved = 0;
        if (Array.isArray(m.path)) moved += mapPts(m.path);
        else if (m.path && Array.isArray(m.path.kf)) m.path.kf.forEach(kf => { moved += mapPts(kf.v); });
        if (moved) { stat.masks++; stat.points += moved; }
      });
      if (L.shadow) {
        let t = false;
        t = each(L.shadow, 'blur', v => v * k) || t;
        t = each(L.shadow, 'dx', v => v * k) || t;
        t = each(L.shadow, 'dy', v => v * k) || t;
        if (t) stat.shadows++;
      }
      if (FM.eachFx && FM.fxRegistry) {
        FM.eachFx(L, fx => {
          if (!fx || !fx.params) return;
          FM.fxRegistry.paramsOf(fx.type).forEach(spec => {
            if (!spec || spec.unit !== 'px') return;
            const lo = (typeof spec.min === 'number') ? spec.min : -Infinity;
            const hi = (typeof spec.max === 'number') ? spec.max : Infinity;
            const done = each(fx.params, spec.key, v => {
              const want = v * k, got = Math.max(lo, Math.min(hi, want));
              if (Math.abs(got - want) > 1e-9) stat.clamped++;
              return got;
            });
            if (done) stat.params++;
          });
        });
      }
    });
    return stat;
  };
})(window.FM);
