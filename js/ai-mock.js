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

  function intent(ctx) {
    return {
      subject: title(ctx), style: 'punchy promo', palette: ['#0e1320', '#29d9bb', '#ffce4a', '#ffffff'],
      pacing: 'fast', durationSec: 6, aspect: '9:16', captions: true, mood: 'energetic, premium',
    };
  }

  function plan(ctx) {
    var subj = title(ctx);
    return {
      heroRef: 'title',
      scaffoldOps: [
        { op: 'setProject', width: 1080, height: 1920, fps: 30, duration: 6, background: '#0e1320', name: 'AI Scene' },
        { op: 'addShape', ref: 'bg', shape: 'rect', x: 540, y: 960, shapeW: 1080, shapeH: 1920, fill: '#0e1320', z: 6, duration: 6 },
        { op: 'addText', ref: 'title', text: subj, x: 540, y: 780, fontSize: 150, color: '#ffffff', bold: true, align: 'center', z: 0, duration: 6 },
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
        var jx = (nonce % 3) * 60;
        return { ops: [
          { op: 'addShape', ref: 'accent1', shape: 'ellipse', x: 300 + jx, y: 1180, shapeW: 220, shapeH: 220, fill: cols[0], z: 4, duration: 6 },
          { op: 'addShape', ref: 'accent2', shape: shp, x: 820 - jx, y: 520, shapeW: 180, shapeH: 180, fill: cols[1], z: 4, duration: 6 },
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
        var s = pickN(sets, nonce);
        return { ops: [
          { op: 'addCaptionTrack', ref: 'caps', captionBg: true, fontSize: 76, color: '#ffffff', x: 540, y: 1560, z: 1,
            segments: [ { start: 0.3, end: 2.2, text: s[0] }, { start: 2.2, end: 4.2, text: s[1] }, { start: 4.2, end: 6, text: s[2] } ] },
        ] };
      }
      case 't_camera': return { ops: [
        { op: 'addCamera', ref: 'cam' },
        { op: 'addKeyframe', ref: 'cam', path: 'transform.scale', keys: [{ t: 0, v: pickN([1.18, 1.1, 1.25, 1.0], nonce) }, { t: 2.4, v: 1, e: 'easeOut' }] },
      ] };
      default: return { ops: [] };
    }
  }

  FM.aiMock = {
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
          if (ctx.pass === 0) return { assessment: 'title a touch large for safe margins', ops: [{ op: 'setProp', ref: 'title', path: 'fontSize', value: 132 }] };
          return { assessment: 'looks good', ops: [] };
        }
        default: return { ops: [] };
      }
    },
  };
})(window.FM);
