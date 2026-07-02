/* FreeMotion — AI ops validator + applier (the safety boundary).
 *
 * This is the ONLY code that turns AI output into FM.scene mutations. The AI never touches the
 * scene and never emits code — it emits a closed set of JSON "ops" (see ai-manifest.js OP_NAMES).
 * applyOps() whitelists every op name, clamps every number to the engine's real ranges, snaps
 * every enum against the live registries (FM.EFFECTS / FM.BLEND_MODES / FM.EASE_NAMES /
 * FM.EASE_PRESETS), mints ids ONLY via FM.makeLayer, refuses media creation / a 2nd camera /
 * parenting cycles / media-only effects on non-media, and drops anything unknown with a logged
 * reason. No eval, no Function(), no innerHTML — all AI text lands as plain data drawn by the
 * canvas compositor. applyOps does NOT commit history or refreshAll; the orchestrator owns that.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  var HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  function isHex(s) { return typeof s === 'string' && HEX.test(s.trim()); }
  function hex(s, dflt) { return isHex(s) ? s.trim() : dflt; }
  function num(v, dflt) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : dflt; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function clampNum(v, lo, hi, dflt) { var n = num(v, dflt); return n == null ? null : clamp(n, lo, hi); }
  function bool(v, dflt) { return typeof v === 'boolean' ? v : dflt; }
  function str(v, max) { if (typeof v !== 'string') return null; return max ? v.slice(0, max) : v; }
  function snap(v, list, dflt) { return list.indexOf(v) >= 0 ? v : dflt; }
  function nearest(v, opts) { var n = num(v, opts[0]); var best = opts[0], bd = Infinity; opts.forEach(function (o) { var d = Math.abs(o - n); if (d < bd) { bd = d; best = o; } }); return best; }

  function effectDef(type) { for (var i = 0; i < FM.EFFECTS.length; i++) if (FM.EFFECTS[i].type === type) return FM.EFFECTS[i]; return null; }
  var MEDIA_ONLY_FX = { chromakey: 1, lumakey: 1, vignette: 1 };

  // transform.* sub-keys and their clamp ranges (rotation/z are unbounded). scaleX/scaleY/skewX/skewY/z
  // are first-class animatable channels since the Move & Transform rebuild — the compositor reads them
  // and the inspector writes them, so the AI must be able to see/set/keyframe them too (else its edits
  // can't touch a non-uniformly-scaled/skewed/Z layer and fight the user's transform). (#10)
  var TRANSFORM_RANGE = { x: null, y: null, scale: [0, 10], scaleX: [0, 10], scaleY: [0, 10], skewX: [-80, 80], skewY: [-80, 80], z: null, rotation: null, opacity: [0, 1], anchorX: [0, 1], anchorY: [0, 1] };

  function setNumericPath(layer, path, value) {
    if (path.indexOf('transform.') === 0) {
      var k = path.slice(10);
      if (!(k in TRANSFORM_RANGE)) return false;
      var r = TRANSFORM_RANGE[k], n = num(value, null);
      if (n == null) return false;
      layer.transform[k] = r ? clamp(n, r[0], r[1]) : n;
      return true;
    }
    return false;
  }

  // setProp path → how to coerce/clamp. Returns true if applied.
  function applySetProp(layer, path, value) {
    if (setNumericPath(layer, path, value)) return true;
    switch (path) {
      case 'fontSize': { var fs = clampNum(value, 1, 2000); if (fs == null) return false; layer.fontSize = fs; return true; }
      case 'letterSpacing': { var ls = clampNum(value, -200, 400); if (ls == null) return false; layer.letterSpacing = ls; return true; }
      case 'lineHeight': { var lh = clampNum(value, 0.5, 4); if (lh == null) return false; layer.lineHeight = lh; return true; }
      case 'color': { var c = hex(value, null); if (!c) return false; layer.color = c; return true; }
      case 'fill': { var f = hex(value, null); if (!f) return false; layer.fill = f; return true; }
      case 'clipColor': { var cc = hex(value, null); if (!cc) return false; layer.clipColor = cc; return true; }
      case 'text': { var t = str(value, 2000); if (t == null) return false; layer.text = t; return true; }
      case 'name': { var nm = str(value, 80); if (nm == null) return false; layer.name = nm; return true; }
      case 'align': { layer.align = snap(value, ['left', 'center', 'right'], layer.align || 'center'); return true; }
      case 'blendMode': { layer.blendMode = snap(value, FM.BLEND_MODES, layer.blendMode || 'normal'); return true; }
      case 'bold': { layer.bold = bool(value, !!layer.bold); return true; }
      case 'italic': { layer.italic = bool(value, !!layer.italic); return true; }
      case 'visible': { layer.visible = bool(value, true); return true; }
      case 'locked': { layer.locked = bool(value, false); return true; }
      case 'solo': { layer.solo = bool(value, false); return true; }
      case 'reversed': { if (layer.type === 'video') layer.reversed = bool(value, false); return layer.type === 'video'; }
      case 'frameBlend': { layer.frameBlend = bool(value, false); return true; }
      case 'volume': { var v = clampNum(value, 0, 1); if (v == null) return false; layer.volume = v; return true; }
      case 'fadeIn': { var fi = clampNum(value, 0, 60); if (fi == null) return false; layer.fadeIn = fi; return true; }
      case 'fadeOut': { var fo = clampNum(value, 0, 60); if (fo == null) return false; layer.fadeOut = fo; return true; }
      case 'speed': { var sp = clampNum(value, 0.0625, 16); if (sp == null) return false; layer.speed = sp; return true; }
      case 'trimStart': { var ts = clampNum(value, 0, 600); if (ts == null) return false; layer.trimStart = ts; return true; }
      case 'start': { var st = clampNum(value, 0, 600); if (st == null) return false; layer.start = st; return true; }
      case 'duration': { var du = clampNum(value, 0.05, 600); if (du == null) return false; layer.duration = du; return true; }
      default: return false;
    }
  }

  // --------- the applier ---------
  // ops: array of op objects. refMap: shared {ref -> real layer id} across a build.
  // Returns { appliedCount, dropped:[{op,ref,reason}], results:[{op,ref,applied,reason}] }.
  function applyOps(ops, refMap) {
    var scene = FM.scene, P = scene.project;
    refMap = refMap || {};
    var dropped = [], results = [], applied = 0;

    function drop(op, ref, reason) { dropped.push({ op: op, ref: ref, reason: reason }); results.push({ op: op, ref: ref, applied: false, reason: reason }); }
    function ok(op, ref) { applied++; results.push({ op: op, ref: ref, applied: true }); }

    // resolve a ref to a live layer. create=true mints a layer of `type`. mediaOnly: ref must be existing video/image.
    function resolveExisting(ref, mediaOnly) {
      if (ref == null) return null;
      var id = refMap[ref] || ref;            // a build-local handle, or a raw existing id
      var layer = FM.layerById(scene, id);
      if (!layer) return null;
      if (mediaOnly && layer.type !== 'video' && layer.type !== 'image') return null;
      return layer;
    }

    function insertAt(layer, z) {
      var idx = (z == null) ? scene.layers.length : clamp(Math.round(z), 0, scene.layers.length);
      scene.layers.splice(idx, 0, layer);
    }

    function createLayer(o, type, extraProps) {
      var props = Object.assign({
        x: o.x != null ? num(o.x, P.width / 2) : P.width / 2,
        y: o.y != null ? num(o.y, P.height / 2) : P.height / 2,
        duration: o.duration != null ? clamp(num(o.duration, 5), 0.05, 600) : Math.min(5, P.duration || 5),
      }, extraProps || {});
      var layer = FM.makeLayer(type, props);
      layer.start = o.start != null ? clamp(num(o.start, 0), 0, 600) : 0;
      if (o.name) layer.name = str(o.name, 80);
      insertAt(layer, o.z);
      if (o.ref != null) refMap[o.ref] = layer.id;
      // grow the composition to fit
      P.duration = Math.max(P.duration || 0, layer.start + layer.duration);
      return layer;
    }

    for (var i = 0; i < (ops || []).length; i++) {
      var o = ops[i];
      if (!o || typeof o !== 'object' || FM.AI_OP_NAMES.indexOf(o.op) < 0) { drop(o && o.op, o && o.ref, 'unknown op'); continue; }
      var ref = o.ref, layer;
      try {
        switch (o.op) {

          case 'setProject': {
            var changed = false;
            if (o.width != null || o.height != null) {
              var w = o.width != null ? Math.round(clamp(num(o.width, P.width), 16, 7680) / 2) * 2 : P.width;
              var h = o.height != null ? Math.round(clamp(num(o.height, P.height), 16, 7680) / 2) * 2 : P.height;
              if (w !== P.width || h !== P.height) { P.width = w; P.height = h; changed = true; }
            }
            if (o.fps != null) P.fps = nearest(o.fps, [24, 30, 60]);
            if (o.duration != null) P.duration = clamp(num(o.duration, P.duration), 0.1, 600);
            if (o.background != null) { var bg = hex(o.background, null); if (bg) P.background = bg; }
            if (o.name != null) { var pn = str(o.name, 80); if (pn != null) P.name = pn; }
            if (changed && FM.resizeCanvas) FM.resizeCanvas();
            ok(o.op, ref); break;
          }

          case 'addText': {
            layer = createLayer(o, 'text', {
              fontSize: o.fontSize != null ? clamp(num(o.fontSize, 96), 1, 2000) : Math.round((P.height || 1920) / 12),
              color: hex(o.color, '#ffffff'),
              fontFamily: str(o.fontFamily, 80) || 'Inter, sans-serif',
            });
            layer.text = str(o.text, 2000) || 'Text';
            if (!o.name && layer.text) layer.name = layer.text.replace(/\s+/g, ' ').trim().slice(0, 24) || 'Text';
            layer.align = snap(o.align, ['left', 'center', 'right'], 'center');
            layer.bold = bool(o.bold, false);
            layer.italic = bool(o.italic, false);
            if (o.letterSpacing != null) layer.letterSpacing = clamp(num(o.letterSpacing, 0), -200, 400);
            if (o.lineHeight != null) layer.lineHeight = clamp(num(o.lineHeight, 1.15), 0.5, 4);
            ok(o.op, ref); break;
          }

          case 'addShape': {
            var shp = snap(o.shape, ['rect', 'ellipse', 'line', 'arc', 'polygon', 'triangle', 'star', 'heart', 'plus', 'pie', 'semicircle', 'ring', 'arrow', 'chevron', 'trapezoid', 'parallelogram'], 'rect');
            layer = createLayer(o, 'shape', {
              shape: shp,
              shapeW: o.shapeW != null ? clamp(num(o.shapeW, 400), 1, 16000) : Math.round((P.width || 1080) / 3),
              shapeH: o.shapeH != null ? clamp(num(o.shapeH, 300), 1, 16000) : Math.round((P.height || 1920) / 3),
              fill: hex(o.fill, '#3a7bd5'),
            });
            if (o.cornerRadius != null) layer.cornerRadius = clamp(num(o.cornerRadius, 0), 0, 4000);
            if (o.sides != null) layer.sides = Math.round(clamp(num(o.sides, 5), 3, 16));
            ok(o.op, ref); break;
          }

          case 'addCaptionTrack': {
            layer = createLayer(o, 'text', { fontSize: o.fontSize != null ? clamp(num(o.fontSize, 64), 1, 2000) : Math.round((P.height || 1920) / 22), color: hex(o.color, '#ffffff') });
            layer.name = str(o.name, 80) || 'Captions';
            layer.text = '';
            layer.captionBg = bool(o.captionBg, true);
            layer.captions = (Array.isArray(o.segments) ? o.segments : []).slice(0, 60).map(function (s) {
              return { start: clamp(num(s && s.start, 0), 0, 600), end: clamp(num(s && s.end, 1), 0, 600), text: str(s && s.text, 300) || '' };
            }).filter(function (s) { return s.end > s.start; });
            ok(o.op, ref); break;
          }

          case 'addCamera': {
            if (scene.layers.some(function (l) { return l.type === 'camera'; })) { drop(o.op, ref, 'scene already has a camera'); break; }
            layer = createLayer(o, 'camera', {}); layer.duration = P.duration;
            ok(o.op, ref); break;
          }

          case 'addAdjustment': { layer = createLayer(o, 'adjustment', {}); layer.duration = P.duration; layer.effects = []; ok(o.op, ref); break; }
          case 'addNull': { layer = createLayer(o, 'null', {}); layer.duration = P.duration; ok(o.op, ref); break; }

          case 'setProp': {
            layer = resolveExisting(ref, false);
            if (!layer) { drop(o.op, ref, 'unknown ref'); break; }
            if (typeof o.path !== 'string' || !applySetProp(layer, o.path, o.value)) { drop(o.op, ref, 'bad path/value: ' + o.path); break; }
            ok(o.op, ref); break;
          }

          case 'setStroke': {
            layer = resolveExisting(ref, false);
            if (!layer) { drop(o.op, ref, 'unknown ref'); break; }
            layer.stroke = { enabled: bool(o.enabled, true), width: clamp(num(o.width, 6), 0, 200), color: hex(o.color, (layer.stroke && layer.stroke.color) || '#000000') };
            ok(o.op, ref); break;
          }

          case 'setGradientFill': {
            layer = resolveExisting(ref, false);
            if (!layer || (layer.type !== 'text' && layer.type !== 'shape')) { drop(o.op, ref, 'gradient needs text/shape ref'); break; }
            layer.fillGradient = { enabled: bool(o.enabled, true), type: snap(o.type, ['linear', 'radial'], 'linear'), angle: num(o.angle, 0), c0: hex(o.c0, '#ffffff'), c1: hex(o.c1, '#000000') };
            ok(o.op, ref); break;
          }

          case 'setTextAnim': {
            layer = resolveExisting(ref, false);
            if (!layer || layer.type !== 'text') { drop(o.op, ref, 'textAnim needs text ref'); break; }
            layer.textAnim = {
              preset: snap(o.preset, FM.AI_TEXT_PRESETS, 'fade'),
              unit: snap(o.unit, ['char', 'word', 'line'], 'char'),
              durIn: clamp(num(o.durIn, 0.6), 0, 10), durOut: clamp(num(o.durOut, 0), 0, 10), stagger: clamp(num(o.stagger, 0.04), 0, 2),
            };
            ok(o.op, ref); break;
          }

          case 'setTextCurve': {
            layer = resolveExisting(ref, false);
            if (!layer || layer.type !== 'text') { drop(o.op, ref, 'textCurve needs text ref'); break; }
            layer.textCurve = clamp(num(o.degrees, 0), -360, 360); ok(o.op, ref); break;
          }

          case 'setColorGrade': {
            layer = resolveExisting(ref, false);
            if (!layer) { drop(o.op, ref, 'unknown ref'); break; }
            layer.colorGrade = { hue: num(o.hue, 0), sat: clamp(num(o.sat, 1), 0, 3), lift: clamp(num(o.lift, 0), -0.3, 0.3), gamma: clamp(num(o.gamma, 1), 0.3, 3), gain: clamp(num(o.gain, 1), 0, 3) };
            ok(o.op, ref); break;
          }

          case 'setMask': {
            layer = resolveExisting(ref, false);
            if (!layer) { drop(o.op, ref, 'unknown ref'); break; }
            layer.mask = {
              enabled: bool(o.enabled, true), shape: snap(o.shape, ['rect', 'ellipse', 'polygon'], 'rect'),
              x: num(o.x, 0), y: num(o.y, 0), w: clamp(num(o.w, P.width / 2), 1, 32000), h: clamp(num(o.h, P.height / 2), 1, 32000),
              sides: Math.round(clamp(num(o.sides, 6), 3, 16)), feather: clamp(num(o.feather, 0), 0, 200), invert: bool(o.invert, false),
            };
            ok(o.op, ref); break;
          }

          case 'setWiggle': {
            layer = resolveExisting(ref, false);
            if (!layer) { drop(o.op, ref, 'unknown ref'); break; }
            layer.wiggle = { enabled: bool(o.enabled, true), amp: clamp(num(o.amp, 12), 0, 200), freq: clamp(num(o.freq, 2), 0.1, 12) };
            ok(o.op, ref); break;
          }

          case 'setMotionBlur': {
            layer = resolveExisting(ref, false);
            if (!layer) { drop(o.op, ref, 'unknown ref'); break; }
            layer.motionBlur = { enabled: bool(o.enabled, true), shutter: clamp(num(o.shutter, 0.5), 0.1, 2), samples: Math.round(clamp(num(o.samples, 8), 2, 32)) };
            ok(o.op, ref); break;
          }

          case 'setShadow': {
            layer = resolveExisting(ref, false);
            if (!layer) { drop(o.op, ref, 'unknown ref'); break; }
            layer.shadow = { enabled: bool(o.enabled, true), blur: clamp(num(o.blur, 12), 0, 200), dx: clamp(num(o.dx, 0), -500, 500), dy: clamp(num(o.dy, 6), -500, 500), color: hex(o.color, '#000000') };
            ok(o.op, ref); break;
          }

          case 'setCaptionBg': {
            layer = resolveExisting(ref, false);
            if (!layer) { drop(o.op, ref, 'unknown ref'); break; }
            layer.captionBg = bool(o.value != null ? o.value : o.enabled, true); ok(o.op, ref); break;
          }

          case 'addEffect': {
            layer = resolveExisting(ref, false);
            if (!layer) { drop(o.op, ref, 'unknown ref'); break; }
            var def = effectDef(o.type);
            if (!def) { drop(o.op, ref, 'unknown effect: ' + o.type); break; }
            // Use the engine's own gate (media-only, text-only, adjustment ADJ_OK) so the AI can't add an
            // effect that renders as a silent no-op on the wrong layer type. (#11)
            if (FM.fxRegistry && FM.fxRegistry.supportsLayer ? !FM.fxRegistry.supportsLayer(def.type, layer)
                : (MEDIA_ONLY_FX[def.type] && !(layer.type === 'video' || layer.type === 'image'))) {
              drop(o.op, ref, def.type + ' not valid on ' + layer.type); break;
            }
            // Build params from the FULL registry schema (not just def.param) so MULTI-param effects
            // (motionblur, colorbalance, dropshadow, …) get correctly-keyed defaults and every AI value
            // lands — the old code stored {undefined: NaN} and discarded them all. (#2)
            var inp = (o.params && typeof o.params === 'object') ? o.params : {};
            var inst = (FM.fxRegistry && FM.fxRegistry.makeInstance(def.type)) || { params: {} };
            var params = inst.params || {};
            ((FM.fxRegistry && FM.fxRegistry.paramsOf(def.type)) || []).forEach(function (p) {
              if (!(p.key in inp)) return;   // AI didn't supply this key → keep the registry default
              if (p.type === 'segment') {
                var allowed = p.options.map(function (x) { return x[0]; });
                var raw = inp[p.key], n = num(raw, p.default);
                params[p.key] = allowed.indexOf(raw) >= 0 ? raw : (allowed.indexOf(n) >= 0 ? n : p.default);
              } else if (p.type === 'color') {
                params[p.key] = hex(inp[p.key], p.default);
              } else {
                params[p.key] = clamp(num(inp[p.key], p.default), p.min, p.max);
              }
            });
            if (!Array.isArray(layer.effects)) layer.effects = [];
            layer.effects.push({ type: def.type, enabled: true, params: params });
            ok(o.op, ref); break;
          }

          case 'addKeyframe': {
            layer = resolveExisting(ref, false);
            if (!layer) { drop(o.op, ref, 'unknown ref'); break; }
            var keys = Array.isArray(o.keys) ? o.keys : null;
            if (!keys || !keys.length) { drop(o.op, ref, 'no keys'); break; }
            // resolve the target container + clamp range
            var container = null, key = null, range = null;
            if (typeof o.path === 'string' && o.path.indexOf('transform.') === 0) {
              key = o.path.slice(10);
              if (!(key in TRANSFORM_RANGE)) { drop(o.op, ref, 'bad transform path'); break; }
              container = layer.transform; range = TRANSFORM_RANGE[key];
            } else if (typeof o.path === 'string' && o.path.indexOf('effect:') === 0) {
              var pr = o.path.split(':'); var fxi = parseInt(pr[1], 10); var pkey = pr[2];
              var fx = layer.effects && layer.effects[fxi];
              if (!fx) { drop(o.op, ref, 'no effect at index'); break; }
              // Resolve the param against the registry schema (handles MULTI-param effects, which have no
              // def.param) and allow any keyframable range param — was rejecting all of them. (#2)
              var schema2 = (FM.fxRegistry && FM.fxRegistry.paramsOf(fx.type)) || [];
              var pdef = null; for (var pi = 0; pi < schema2.length; pi++) { if (schema2[pi].key === pkey) { pdef = schema2[pi]; break; } }
              if (!pdef || pdef.type !== 'range' || pdef.keyframable === false) { drop(o.op, ref, 'effect param not keyframeable'); break; }
              container = fx.params; key = pkey; range = [pdef.min, pdef.max];
            } else { drop(o.op, ref, 'bad keyframe path'); break; }
            var kf = keys.map(function (k) {
              var v = num(k && k.v, 0); if (range) v = clamp(v, range[0], range[1]);
              var o2 = { t: clamp(num(k && k.t, 0), 0, 3600), v: v, e: snap(k && k.e, FM.EASE_NAMES, 'easeInOut') };
              if (k && k.bezPreset && FM.EASE_PRESETS[k.bezPreset]) o2.bez = FM.EASE_PRESETS[k.bezPreset].slice();
              return o2;
            }).sort(function (a, b) { return a.t - b.t; });
            // dedupe equal-t
            kf = kf.filter(function (k, idx) { return idx === 0 || Math.abs(k.t - kf[idx - 1].t) > 1e-3; });
            if (!kf.length) { drop(o.op, ref, 'no valid keys'); break; }
            var propObj = { kf: kf };
            if (o.loopMode && ['cycle', 'pingpong'].indexOf(o.loopMode) >= 0 && kf.length >= 2) propObj.loopMode = o.loopMode;
            container[key] = propObj;
            ok(o.op, ref); break;
          }

          case 'setParent': {
            layer = resolveExisting(ref, false);
            var parent = resolveExisting(o.parentRef, false);
            if (!layer || !parent) { drop(o.op, ref, 'unknown ref/parentRef'); break; }
            if (layer.id === parent.id) { drop(o.op, ref, 'cannot parent to self'); break; }
            if (FM.isAncestor(scene, layer.id, parent.id)) { drop(o.op, ref, 'would create a cycle'); break; }
            layer.parent = parent.id;
            layer.parentMode = snap(o.mode, ['normal', 'locked', 'weighted'], 'normal');
            if (o.weight != null) layer.parentWeight = clamp(num(o.weight, 0.5), 0, 1);
            ok(o.op, ref); break;
          }

          default: drop(o.op, ref, 'unhandled op');
        }
      } catch (e) {
        drop(o.op, ref, 'exception: ' + (e && e.message));
      }
    }

    return { appliedCount: applied, dropped: dropped, results: results };
  }

  FM.aiOps = { applyOps: applyOps, OP_NAMES: FM.AI_OP_NAMES };
})(window.FM);
