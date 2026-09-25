/* FreeMotion — DRY_RUN fixtures. When FM.ai.DRY_RUN is true, every "agent" call is answered here
 * instead of hitting the network — zero tokens, zero key required. Used by the test page and by the
 * "Preview (no key)" demo so the whole multi-agent pipeline (plan → parallel builders → critic) can
 * be exercised and verified without spending anything. Returns the SAME shape a forced tool_use
 * would: the tool's input object. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function title(ctx) {
    var s = (ctx && ctx.prompt ? String(ctx.prompt) : '') || ((ctx && ctx.chips && ctx.chips.subject) || '');
    s = s.trim().split(/\s+/).slice(0, 6).join(' ');
    return s || 'Your Big Idea';
  }

  /* ⚠️ THE DEMO BUILDS ON HIS CANVAS (queue 690, hunt d). It was drawn for 1080x1920 and forced the project to that size,
     so "Watch a demo run" turned his landscape project — his clip in it — portrait. With Aspect on auto it now keeps the
     project's shape (FM.aiTemplates.canvasFor, the same rule as Build a scene without a key), so its layout is laid onto
     that shape: every position is the same FRACTION of the frame, every size follows the short side. On a 1080x1920
     project these are exactly the numbers it always had. */
  function canvas(ctx) { return (FM.aiTemplates && FM.aiTemplates.canvasFor) ? FM.aiTemplates.canvasFor(ctx && ctx.chips) : [1080, 1920]; }
  function fit(W, H) {
    var sx = W / 1080, sy = H / 1920, k = Math.min(W, H) / 1080;
    return { x: function (v) { return Math.round(v * sx); }, y: function (v) { return Math.round(v * sy); }, s: function (v) { return Math.round(v * k); } };
  }
  // builders and the critic run after the scaffold has sized the project, so they read the live canvas
  function liveFit() { var P = FM.scene && FM.scene.project; return fit((P && P.width) || 1080, (P && P.height) || 1920); }

  function intent(ctx) {
    var c = canvas(ctx);
    return {
      subject: title(ctx), style: 'punchy promo', palette: ['#0e1320', '#29d9bb', '#ffce4a', '#ffffff'],
      pacing: 'fast', durationSec: 6, aspect: FM.aiTemplates && FM.aiTemplates.aspectOf ? FM.aiTemplates.aspectOf(c[0], c[1]) : '9:16', captions: true, mood: 'energetic, premium',
    };
  }

  function plan(ctx) {
    var subj = title(ctx);
    var c = canvas(ctx), W = c[0], H = c[1], f = fit(W, H);
    return {
      heroRef: 'title',
      scaffoldOps: [
        { op: 'setProject', width: W, height: H, fps: 30, duration: 6, background: '#0e1320', name: 'AI Scene' },
        { op: 'addShape', ref: 'bg', shape: 'rect', x: f.x(540), y: f.y(960), shapeW: W, shapeH: H, fill: '#0e1320', z: 6, duration: 6 },
        { op: 'addText', ref: 'title', text: subj, x: f.x(540), y: f.y(780), fontSize: f.s(150), color: '#ffffff', bold: true, align: 'center', z: 0, duration: 6 },
      ],
      tasks: [
        { id: 't_title', label: 'Hero title', goal: 'pop + gradient the title', refs: ['title'], z: 0 },
        { id: 't_accent', label: 'Accent shapes', goal: 'orbiting accents', refs: ['accent1', 'accent2'], z: 4 },
        { id: 't_caption', label: 'Captions', goal: 'punchy captions', refs: ['caps'], z: 1 },
        { id: 't_camera', label: 'Camera punch-in', goal: 'subtle push-in', refs: ['cam'], z: 0 },
      ],
    };
  }

  // re-rolls pass a nonce so the mock yields a visibly different variation each time (real Claude varies naturally)
  function pickN(arr, n) { return arr[(n || 0) % arr.length]; }
  function builderOps(taskId, nonce) {
    nonce = nonce || 0;
    switch (taskId) {
      case 't_title': return { ops: [
        { op: 'setTextAnim', ref: 'title', preset: pickN(['pop', 'fade-up', 'slide', 'typewriter'], nonce), unit: 'char', durIn: 0.5, stagger: 0.03 },
        { op: 'setGradientFill', ref: 'title', type: 'linear', angle: 90, c0: '#ffffff', c1: pickN(['#29d9bb', '#ffce4a', '#df5b5b', '#9b6dff'], nonce) },
        { op: 'addKeyframe', ref: 'title', path: 'transform.opacity', keys: [{ t: 0, v: 0 }, { t: 0.4, v: 1, e: 'easeOut' }] },
        { op: 'addKeyframe', ref: 'title', path: 'transform.scale', keys: [{ t: 0, v: 0.6 }, { t: 0.6, v: 1.06, bezPreset: 'overshoot' }, { t: 0.9, v: 1 }] },
        { op: 'setShadow', ref: 'title', enabled: true, blur: 24, dy: 10, color: '#000000' },
      ] };
      case 't_accent': {
        var cols = pickN([['#29d9bb', '#ffce4a'], ['#df5b5b', '#9b6dff'], ['#46c98a', '#4d8bf0'], ['#e85f9e', '#ffce4a']], nonce);
        var shp = pickN(['star', 'heart', 'triangle', 'ellipse'], nonce);
        var jx = (nonce % 3) * 60, f = liveFit();
        return { ops: [
          { op: 'addShape', ref: 'accent1', shape: 'ellipse', x: f.x(300 + jx), y: f.y(1180), shapeW: f.s(220), shapeH: f.s(220), fill: cols[0], z: 4, duration: 6 },
          { op: 'addShape', ref: 'accent2', shape: shp, x: f.x(820 - jx), y: f.y(520), shapeW: f.s(180), shapeH: f.s(180), fill: cols[1], z: 4, duration: 6 },
          { op: 'addKeyframe', ref: 'accent2', path: 'transform.rotation', keys: [{ t: 0, v: 0 }, { t: 6, v: 360, e: 'linear' }] },
          { op: 'addKeyframe', ref: 'accent1', path: 'transform.scale', keys: [{ t: 0, v: 0.8 }, { t: 3, v: 1.1 }, { t: 6, v: 0.8 }], loopMode: 'pingpong' },
        ] };
      }
      case 't_caption': {
        var sets = [
          ['Built by AI', 'Fully editable', 'Make it yours'],
          ['Type a sentence', 'Get a timeline', 'Keep editing'],
          ['Heaps of agents', 'One scene', 'Zero hassle'],
        ];
        var s = pickN(sets, nonce), fc = liveFit();
        return { ops: [
          { op: 'addCaptionTrack', ref: 'caps', captionBg: true, fontSize: fc.s(76), color: '#ffffff', x: fc.x(540), y: fc.y(1560), z: 1,
            segments: [ { start: 0.3, end: 2.2, text: s[0] }, { start: 2.2, end: 4.2, text: s[1] }, { start: 4.2, end: 6, text: s[2] } ] },
        ] };
      }
      case 't_camera': return { ops: [
        { op: 'addCamera', ref: 'cam', z: 99 },   // the bottom row, where the demo has always put it (no z now means on top — queue 690, hunt d)
        { op: 'addKeyframe', ref: 'cam', path: 'transform.scale', keys: [{ t: 0, v: pickN([1.18, 1.1, 1.25, 1.0], nonce) }, { t: 2.4, v: 1, e: 'easeOut' }] },
      ] };
      default: return { ops: [] };
    }
  }

  /* queue 856 — the CHAT fixture. It returns the SAME `{content:[…]}` shape a real response has, text
     blocks and an optional tool_use, so the dry-run path through ai-chat.js is the same code as the
     live one. A mock that hands back a different shape only ever tests the mock. It reads a few real
     verbs out of the sentence so the suite can drive a believable edit with no key and no tokens. */
  function chat(text, scene) {
    var t = String(text || '').toLowerCase();
    var target = (scene && scene.selectedId) || (scene && scene.layers && scene.layers.length ? scene.layers[scene.layers.length - 1].id : null);
    var ops = [], said;
    if (!target) {
      said = 'There is nothing in the project yet — add a layer and tell me what to do with it.';
    } else if (/bigger|larger|grow/.test(t)) {
      ops.push({ op: 'setProp', ref: target, path: 'transform.scale', value: 1.4 });
      said = 'Made it bigger.';
    } else if (/smaller|shrink/.test(t)) {
      ops.push({ op: 'setProp', ref: target, path: 'transform.scale', value: 0.7 });
      said = 'Made it smaller.';
    } else if (/delete|remove|get rid/.test(t)) {
      ops.push({ op: 'deleteLayer', ref: target });
      said = 'Deleted it.';
    } else if (/duplicate|copy/.test(t)) {
      ops.push({ op: 'duplicateLayer', ref: target, newRef: 'dup' });
      said = 'Duplicated it.';
    } else if (/glow|blur/.test(t)) {
      ops.push({ op: 'addEffect', ref: target, type: /blur/.test(t) ? 'blur' : 'glow', params: {} });
      said = 'Added it.';
    } else if (/red|blue|green|gold|white|black/.test(t)) {
      var c = /red/.test(t) ? '#ff4d4d' : /blue/.test(t) ? '#4d8bf0' : /green/.test(t) ? '#46c98a'
            : /gold/.test(t) ? '#ffce4a' : /white/.test(t) ? '#ffffff' : '#000000';
      ops.push({ op: 'setProp', ref: target, path: 'color', value: c });
      said = 'Recoloured it.';
    } else {
      said = 'I can change size, colour, timing and effects — tell me which layer and what to do.';
    }
    var content = [{ type: 'text', text: said }];
    if (ops.length) content.push({ type: 'tool_use', id: 'mock_chat', name: 'emit_ops', input: { ops: ops } });
    return { content: content, stop: 'mock', out: { ops: ops } };
  }

  FM.aiMock = {
    chat: chat,
    respond: function (toolName, ctx) {
      ctx = ctx || {};
      switch (toolName) {
        case 'emit_intent': return intent(ctx);
        case 'emit_plan': return plan(ctx);
        case 'emit_ops': return builderOps(ctx.taskId, ctx.nonce);
        case 'emit_critique': {
          // refine: turn the user's instruction into targeted fix-ops on the hero title
          if (ctx.refine) {
            var ins = (ctx.instruction || '').toLowerCase(), ops = [];
            if (/gold|yellow/.test(ins)) ops.push({ op: 'setProp', ref: 'title', path: 'color', value: '#ffce4a' });
            else if (/red|crimson/.test(ins)) ops.push({ op: 'setProp', ref: 'title', path: 'color', value: '#df5b5b' });
            else if (/blue/.test(ins)) ops.push({ op: 'setProp', ref: 'title', path: 'color', value: '#4d8bf0' });
            else if (/green|teal/.test(ins)) ops.push({ op: 'setProp', ref: 'title', path: 'color', value: '#29d9bb' });
            if (/big|large|huge|bigger/.test(ins)) ops.push({ op: 'setProp', ref: 'title', path: 'fontSize', value: 190 });
            if (/small|smaller/.test(ins)) ops.push({ op: 'setProp', ref: 'title', path: 'fontSize', value: 110 });
            if (/bold|strong/.test(ins)) ops.push({ op: 'setProp', ref: 'title', path: 'bold', value: true });
            if (/glow|shadow/.test(ins)) ops.push({ op: 'setShadow', ref: 'title', enabled: true, blur: 40, dy: 14, color: '#000000' });
            if (!ops.length) ops.push({ op: 'setShadow', ref: 'title', enabled: true, blur: 36, dy: 14, color: '#000000' });
            return { assessment: 'applied: ' + (ctx.instruction || ''), ops: ops };
          }
          // build-time critic: first pass nudges, later passes are clean (stops the loop)
          if (ctx.pass === 0) return { assessment: 'title a touch large for safe margins', ops: [{ op: 'setProp', ref: 'title', path: 'fontSize', value: liveFit().s(132) }] };
          return { assessment: 'looks good', ops: [] };
        }
        default: return { ops: [] };
      }
    },
  };
})(window.FM);
