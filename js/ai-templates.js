/* FreeMotion — key-less deterministic fallback. Builds a real, editable scene from the intent
 * chips with NO API key and NO tokens, through the SAME validated applyOps path the AI uses. This
 * keeps the feature usable (and demoable) for anyone without a key, and guarantees a sensible floor. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  var ASPECT = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350] };

  function pick(chips, key, dflt) { return (chips && chips[key] != null && chips[key] !== '') ? chips[key] : dflt; }

  // Three distinct looks, chosen from the style/pacing keyword so "Build without a key" varies.
  var LOOKS = {
    punchy:  { palette: ['#0e1320', '#29d9bb', '#ffce4a', '#ffffff'], titleAnim: 'pop',    accent: 'orbit', glow: true,  cam: 1.16 },
    elegant: { palette: ['#14110f', '#caa86a', '#8c7a5b', '#f5efe4'], titleAnim: 'fade-up', accent: 'rule',  glow: false, cam: 1.08 },
    retro:   { palette: ['#1a0b2e', '#ff5d8f', '#36e3ff', '#ffe14d'], titleAnim: 'slide',   accent: 'orbit', glow: true,  cam: 1.0  },
  };
  function chooseLook(chips) {
    var s = ((chips && (chips.style || chips.subject)) || '').toLowerCase();
    if (/eleg|calm|wellness|minimal|luxe|soft|clean/.test(s)) return 'elegant';
    if (/retro|vhs|neon|80s|vapor|glitch|arcade/.test(s)) return 'retro';
    return 'punchy';
  }

  function build(chips) {
    chips = chips || {};
    var subject = String(pick(chips, 'subject', 'Your Big Idea')).slice(0, 80);
    var dims = ASPECT[pick(chips, 'aspect', '9:16')] || ASPECT['9:16'];
    var W = dims[0], H = dims[1];
    var dur = Math.max(2, Math.min(30, parseFloat(pick(chips, 'duration', 6)) || 6));
    var look = LOOKS[chooseLook(chips)];
    var palette = (chips.palette && chips.palette.length) ? chips.palette : look.palette;
    var bg = palette[0], accentA = palette[1] || '#29d9bb', accentB = palette[2] || '#ffce4a', ink = palette[3] || '#ffffff';

    var ops = [
      { op: 'setProject', width: W, height: H, fps: 30, duration: dur, background: bg, name: subject.slice(0, 40) || 'Template scene' },
      { op: 'addShape', ref: 'bg', shape: 'rect', x: W / 2, y: H / 2, shapeW: W, shapeH: H, fill: bg, z: 6, duration: dur },
      { op: 'addText', ref: 'title', text: subject, x: W / 2, y: H * 0.44, fontSize: Math.round(H / 11), color: ink, bold: true, align: 'center', z: 0, duration: dur },
      { op: 'setGradientFill', ref: 'title', type: 'linear', angle: 90, c0: ink, c1: accentA },
      { op: 'setTextAnim', ref: 'title', preset: look.titleAnim, unit: 'char', durIn: 0.5, stagger: 0.03 },
      { op: 'setShadow', ref: 'title', enabled: true, blur: 24, dy: 10, color: '#000000' },
      { op: 'addKeyframe', ref: 'title', path: 'transform.opacity', keys: [{ t: 0, v: 0 }, { t: 0.4, v: 1, e: 'easeOut' }] },
      { op: 'addCaptionTrack', ref: 'caps', captionBg: true, fontSize: Math.round(H / 26), color: ink, x: W / 2, y: H * 0.82, z: 1,
        segments: [ { start: 0.4, end: dur * 0.4, text: 'No key needed' }, { start: dur * 0.4, end: dur * 0.75, text: 'Fully editable' }, { start: dur * 0.75, end: dur, text: 'Make it yours' } ] },
      { op: 'addCamera', ref: 'cam' },
      { op: 'addKeyframe', ref: 'cam', path: 'transform.scale', keys: [{ t: 0, v: 1.0 + (look.cam - 1) }, { t: Math.min(2.4, dur), v: 1, e: 'easeOut' }] },
    ];
    if (look.glow) {
      ops.splice(2, 0,
        { op: 'addShape', ref: 'glow', shape: 'ellipse', x: W / 2, y: H * 0.42, shapeW: W * 0.9, shapeH: W * 0.9, fill: accentA, z: 5, duration: dur },
        { op: 'setProp', ref: 'glow', path: 'transform.opacity', value: 0.18 },
        { op: 'addKeyframe', ref: 'glow', path: 'transform.scale', keys: [{ t: 0, v: 0.9 }, { t: dur / 2, v: 1.1 }, { t: dur, v: 0.9 }], loopMode: 'pingpong' });
    }
    if (look.accent === 'rule') {
      ops.push({ op: 'addShape', ref: 'bar', shape: 'rect', x: W / 2, y: H * 0.55, shapeW: W * 0.22, shapeH: 4, fill: accentA, z: 0, duration: dur },
        { op: 'addKeyframe', ref: 'bar', path: 'transform.scale', keys: [{ t: 0.4, v: 0 }, { t: 1.0, v: 1, e: 'easeOut' }] });
    } else { // orbit
      ops.push({ op: 'addShape', ref: 'dotL', shape: 'ellipse', x: W * 0.26, y: H * 0.6, shapeW: W * 0.16, shapeH: W * 0.16, fill: accentA, z: 0, duration: dur },
        { op: 'addShape', ref: 'dotR', shape: 'star', x: W * 0.76, y: H * 0.3, shapeW: W * 0.15, shapeH: W * 0.15, fill: accentB, z: 0, duration: dur },
        { op: 'addKeyframe', ref: 'dotR', path: 'transform.rotation', keys: [{ t: 0, v: 0 }, { t: dur, v: 360, e: 'linear' }] },
        { op: 'addKeyframe', ref: 'dotL', path: 'transform.scale', keys: [{ t: 0, v: 0.8 }, { t: dur / 2, v: 1.15 }, { t: dur, v: 0.8 }], loopMode: 'pingpong' });
    }

    var refMap = {};
    var log = FM.aiOps.applyOps(ops, refMap);
    if (refMap.title) FM.scene.selectedId = refMap.title;
    FM.scene.selectedIds = FM.scene.selectedId ? [FM.scene.selectedId] : [];
    FM.refreshAll();
    if (FM.history) FM.history.commit();
    return { applied: log.appliedCount, dropped: log.dropped, refMap: refMap };
  }

  FM.aiTemplates = { build: build };
})(window.FM);
