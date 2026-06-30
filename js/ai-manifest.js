/* FreeMotion — AI capability manifest + forced-tool JSON schemas.
 *
 * Single source of truth for what the AI is ALLOWED to do. The capability digest (a compact
 * string fed to the model) and the tool input_schemas are GENERATED at load time from the live
 * engine constants (FM.EFFECTS, FM.BLEND_MODES, FM.EASE_NAMES, FM.EASE_PRESETS) so the prompt
 * vocabulary can never drift from the code. Loads AFTER scene.js + compositor.js.
 *
 * The op vocabulary (OP_NAMES + the per-op fields) is mirrored by the deterministic validator in
 * ai-ops.js — that validator is the real safety boundary. We deliberately do NOT use strict tool
 * use here: forced tool_choice already guarantees a structured tool call, and the JS validator
 * clamps/drops anything out of range, which makes API-level strictness redundant and avoids
 * strict-mode friction with the freeform `params`/`value` fields.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // The real kinetic-typography presets (compositor.js + inspector.js). The validator snaps to these.
  const TEXT_PRESETS = ['none', 'fade', 'fade-up', 'typewriter', 'pop', 'slide'];
  FM.AI_TEXT_PRESETS = TEXT_PRESETS;

  // The closed set of operation names the AI may emit. Mirrored by ai-ops.js handlers.
  const OP_NAMES = [
    'setProject', 'addText', 'addShape', 'addCaptionTrack', 'addCamera', 'addAdjustment', 'addNull',
    'setProp', 'setStroke', 'setGradientFill', 'setTextAnim', 'setTextCurve', 'setColorGrade',
    'setMask', 'setWiggle', 'setMotionBlur', 'setShadow', 'setCaptionBg',
    'addEffect', 'addKeyframe', 'setParent',
  ];
  FM.AI_OP_NAMES = OP_NAMES;

  function effectVocab() {
    return FM.EFFECTS.map(function (e) {
      var p;
      if (Array.isArray(e.params)) {   // MULTI-param effect: list every key (was emitting "undefined(undefined..undefined)") (#2)
        p = e.params.map(function (pp) { return pp.key + '(' + pp.min + '..' + pp.max + ', def ' + pp.def + ')'; }).join(', ');
      } else if (e.options) {
        p = e.param + '(modes: ' + e.options.map(function (o) { return o[0] + '=' + o[1]; }).join(', ') + ')';
      } else if (e.param) {
        p = e.param + '(' + e.min + '..' + e.max + ', def ' + e.def + ')';
      } else { p = ''; }
      var col = e.color ? (', color hex' + (e.color2 ? ' + color2 hex' : '')) : '';
      return e.type + ' [' + p + col + ']';
    }).join('; ');
  }

  // A compact, complete capability digest for the system prompt. Generated from live constants.
  function buildDigest() {
    return [
      'FREEMOTION SCENE CAPABILITIES (what you can build).',
      'COORDINATES: pixels, origin (0,0) = canvas TOP-LEFT, +x right, +y down. A layer is positioned by its ANCHOR (default centre); to centre a layer set x=width/2, y=height/2. Default canvas is 1080x1920 portrait (9:16).',
      'ROTATION is in DEGREES (clockwise). Z-ORDER: lower z = nearer the TOP/front; z 0 is frontmost. Omit z to stack in plan order.',
      'TRANSFORM channels (setProp transform.* or keyframe any of them): x, y, scale (uniform), scaleX/scaleY (non-uniform multipliers on scale, e.g. squash & stretch), rotation(deg), skewX/skewY(deg, -80..80), z (planar DEPTH: +z recedes/shrinks, -z approaches/enlarges), opacity(0..1), anchorX/anchorY(0..1).',
      'LAYER TYPES you can create: text, shape (rect|ellipse|line|polygon|triangle|star|heart), camera (one per scene; pan/zoom via its x/y/scale/rotation; neutral = centre, scale 1), adjustment (grades everything BELOW it), null (invisible rig control). You CANNOT create video/image layers — only reference existing media by id for retiming/grading.',
      'TEXT: text, fontSize, color(hex), fontFamily, align(left|center|right), bold, italic, letterSpacing, lineHeight, stroke, gradient fill, text curve, and kinetic textAnim presets: ' + TEXT_PRESETS.join(', ') + '.',
      'EFFECTS (addEffect, type + params): ' + effectVocab() + '. chromakey/lumakey/vignette work on MEDIA only; text effects (counter, timecode, textprogress, textspacing, texttransform, textrandomizer) need a TEXT layer; an adjustment layer only takes colour/blur/pixel grades (no geometry warps or text effects).',
      'BLEND MODES: ' + FM.BLEND_MODES.join(', ') + '.',
      'KEYFRAMES (addKeyframe): animate any transform channel (transform.x/y/scale/scaleX/scaleY/skewX/skewY/rotation/z/opacity) or a numeric effect param over time. keys = [{t(seconds), v(value), e(easing)}]; easings: ' + FM.EASE_NAMES.join(', ') + '; or bezPreset: ' + Object.keys(FM.EASE_PRESETS).join(', ') + '. loopMode: none|cycle|pingpong. Keys are sorted for you.',
      'RIG: setParent(ref → parentRef) so a layer inherits another\'s motion (cycles are rejected). wiggle (procedural jitter), motion blur, drop shadow, colour grade, masks are all available.',
      'TIMING: each layer has start(s) and duration(s); the project duration grows to fit. Captions are per-segment text on a text layer.',
    ].join('\n');
  }

  // ---- shared Op schema (a permissive tagged-union; the JS validator enforces per-op semantics) ----
  var KF_ITEM = {
    type: 'object', additionalProperties: false, required: ['t', 'v'],
    properties: {
      t: { type: 'number', description: 'time in seconds' },
      v: { type: ['number', 'string'], description: 'value at this keyframe' },
      e: { type: 'string', description: 'easing entering this keyframe: ' + FM.EASE_NAMES.join('|') },
      bezPreset: { type: 'string', description: 'named bezier curve overriding e: ' + Object.keys(FM.EASE_PRESETS).join('|') },
    },
  };
  var SEG_ITEM = {
    type: 'object', additionalProperties: false, required: ['start', 'end', 'text'],
    properties: { start: { type: 'number' }, end: { type: 'number' }, text: { type: 'string' } },
  };
  var OP_SCHEMA = {
    type: 'object', additionalProperties: false, required: ['op'],
    properties: {
      op: { type: 'string', enum: OP_NAMES },
      ref: { type: 'string', description: 'a local handle you choose (e.g. "title","bg","cap1"), OR an existing media layer id for retime/grade' },
      parentRef: { type: 'string' },
      // project
      width: { type: 'number' }, height: { type: 'number' }, fps: { type: 'number' }, duration: { type: 'number' },
      background: { type: 'string' }, name: { type: 'string' },
      // text
      text: { type: 'string' }, fontSize: { type: 'number' }, color: { type: 'string' }, fontFamily: { type: 'string' },
      align: { type: 'string' }, bold: { type: 'boolean' }, italic: { type: 'boolean' },
      letterSpacing: { type: 'number' }, lineHeight: { type: 'number' },
      // shape
      shape: { type: 'string' }, shapeW: { type: 'number' }, shapeH: { type: 'number' }, fill: { type: 'string' },
      cornerRadius: { type: 'number' }, sides: { type: 'number' },
      // placement / timing (also project duration) — disambiguated per-op by the validator
      x: { type: 'number' }, y: { type: 'number' }, start: { type: 'number' }, z: { type: 'number' },
      // generic prop
      path: { type: 'string' }, value: { type: ['number', 'string', 'boolean'] },
      enabled: { type: 'boolean' },
      // effect
      type: { type: 'string', description: 'effect type for addEffect' },
      params: { type: 'object', additionalProperties: true, description: 'effect params, e.g. {"radius":8} or {"amount":1,"color":"#ff3366"}' },
      // keyframes
      keys: { type: 'array', items: KF_ITEM }, loopMode: { type: 'string' },
      // captions
      segments: { type: 'array', items: SEG_ITEM }, captionBg: { type: 'boolean' },
      // text anim
      preset: { type: 'string' }, unit: { type: 'string' }, durIn: { type: 'number' }, durOut: { type: 'number' }, stagger: { type: 'number' },
      degrees: { type: 'number' },
      // grade / gradient / mask / fx
      hue: { type: 'number' }, sat: { type: 'number' }, lift: { type: 'number' }, gamma: { type: 'number' }, gain: { type: 'number' },
      angle: { type: 'number' }, c0: { type: 'string' }, c1: { type: 'string' },
      w: { type: 'number' }, h: { type: 'number' }, feather: { type: 'number' }, invert: { type: 'boolean' },
      amp: { type: 'number' }, freq: { type: 'number' }, shutter: { type: 'number' }, samples: { type: 'number' },
      blur: { type: 'number' }, dx: { type: 'number' }, dy: { type: 'number' },
      mode: { type: 'string' }, weight: { type: 'number' },
      // note: `width`/`duration` double as project canvas width / project duration and as
      // stroke width / layer duration — the validator reads them per-op, never in the same op.
    },
  };

  var OPS_INPUT = {
    type: 'object', additionalProperties: false, required: ['ops'],
    properties: { ops: { type: 'array', items: OP_SCHEMA, description: 'ordered scene operations to apply' } },
  };

  var INTENT_INPUT = {
    type: 'object', additionalProperties: false, required: ['subject', 'style', 'durationSec', 'aspect'],
    properties: {
      subject: { type: 'string', description: 'what the video is about / the hero message' },
      style: { type: 'string', description: 'visual style, e.g. "punchy product reel", "elegant real-estate", "retro VHS"' },
      palette: { type: 'array', items: { type: 'string' }, description: '2-5 hex colours that define the look' },
      pacing: { type: 'string', description: 'slow | medium | fast' },
      durationSec: { type: 'number' },
      aspect: { type: 'string', description: '9:16 | 16:9 | 1:1 | 4:5' },
      captions: { type: 'boolean' },
      mood: { type: 'string' },
      refs: { type: 'array', items: { type: 'string' } },
    },
  };

  var PLAN_INPUT = {
    type: 'object', additionalProperties: false, required: ['scaffoldOps', 'heroRef', 'tasks'],
    properties: {
      scaffoldOps: { type: 'array', items: OP_SCHEMA, description: 'a minimal COMPLETE valid scene applied immediately as the floor: setProject + a hero title + a background. Always include these.' },
      heroRef: { type: 'string', description: 'the ref of the layer to select when done (usually the hero title)' },
      tasks: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['id', 'label', 'goal', 'refs'],
          properties: {
            id: { type: 'string' },
            label: { type: 'string', description: 'short human label, e.g. "Hero title", "Captions", "Camera punch-in"' },
            goal: { type: 'string', description: 'what this builder should produce' },
            refs: { type: 'array', items: { type: 'string' }, description: 'the layer handles this task owns (no two tasks share a ref)' },
            existingMediaIds: { type: 'array', items: { type: 'string' } },
            z: { type: 'number', description: 'base z-index for this task\'s layers' },
          },
        },
      },
    },
  };

  var CRITIQUE_INPUT = {
    type: 'object', additionalProperties: false, required: ['ops'],
    properties: {
      assessment: { type: 'string', description: 'one line: what is wrong, or "looks good"' },
      ops: { type: 'array', items: OP_SCHEMA, description: 'at most 6 targeted FIX ops (same vocabulary). Empty array if the frame already looks good.' },
    },
  };

  function tool(name, description, schema) {
    return { name: name, description: description, input_schema: schema };
  }

  FM.aiManifest = {
    OP_NAMES: OP_NAMES,
    get digest() { return buildDigest(); },
    tools: {
      intent: tool('emit_intent', 'Capture the structured creative intent of the user\'s request.', INTENT_INPUT),
      plan: tool('emit_plan', 'Return the build plan: an immediate scaffold scene plus independent builder tasks.', PLAN_INPUT),
      ops: tool('emit_ops', 'Return ordered scene operations that build your assigned part of the scene.', OPS_INPUT),
      critique: tool('emit_critique', 'Return at most 6 fix operations to correct visual problems in the rendered frame.', CRITIQUE_INPUT),
    },
    systemPrompts: {
      intent: 'You are FreeMotion\'s creative interpreter. Read the user\'s request and return a tight structured intent via emit_intent. Infer sensible defaults (durationSec 6, aspect "9:16", pacing "medium") when unstated. Pick a small cohesive hex palette that matches the described mood.',
      plan:
        buildDigest() + '\n\n' +
        'You are the DIRECTOR. Plan a short motion-graphics scene from the intent. Call emit_plan with:\n' +
        '1) scaffoldOps: a MINIMAL but COMPLETE valid scene applied instantly — ALWAYS a setProject (size from aspect, a fitting background colour, duration) + a hero title text (the subject, large, centred, with a textAnim) + usually a full-frame background shape in a palette colour. This is the guaranteed floor.\n' +
        '2) tasks: 3-6 INDEPENDENT build chunks (e.g. "Hero title polish", "Captions", "Camera punch-in", "Accent shapes", "Background grade"). Give each its OWN refs — never let two tasks touch the same ref. Assign z-indices so stacking is intentional (0 = front).\n' +
        '3) heroRef: the ref to leave selected.\n' +
        'Use refs (local handles) for every new layer, never raw ids. Only reference existing media ids that were given to you. Keep it tasteful and legible: strong contrast, safe margins, not too many layers.',
      build:
        buildDigest() + '\n\n' +
        'You are a BUILDER. You own ONE task. Call emit_ops with the ordered operations that build ONLY your assigned refs (create them if they are new, or refine them). Animate with keyframes for life and motion. Respect the z-indices and palette the director gave you. Do not touch other tasks\' refs. Keep text legible and inside safe margins. Prefer a few well-animated elements over many static ones.',
      critic:
        buildDigest() + '\n\n' +
        'You are the VISION CRITIC. You are shown the ACTUAL rendered frame of the scene. Judge it like a picky art director: is the hero text legible and on-screen? Is anything cut off, overlapping badly, invisible (same colour as background), off-centre, or empty? Call emit_critique with at most 6 targeted FIX ops in the same vocabulary (e.g. shrink an overflowing title, move an overlapping layer, set a caption background, raise contrast). If it already looks good, return an empty ops array.',
    },
  };
})(window.FM);
