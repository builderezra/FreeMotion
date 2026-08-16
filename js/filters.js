/* FreeMotion — the FILTER LIBRARY (queue 113, step 6).
 *
 * Ezra: "This will be good because lots of people will not want to spend time making filters
 * themselves." and "You will make a Bunch of filters and section them, so that people can find stuff
 * organised, like how the effects are organised."
 *
 * A filter here is DATA, not code: a name, a section, and the list of real effects it is made of. It
 * becomes an ordinary filter container the moment you add it (js/compositor.js drawFilterContainer),
 * which is the point — a filter from this list is not a special object, it is exactly the thing you
 * could have built yourself with "+ Add Filter". You can open it, change any effect inside it, delete
 * one, add your own, or pull the Strength down. Nothing here is locked.
 *
 * TWO RULES THIS FILE IS AUTHORED AGAINST
 *
 * 1. CSS-FILTER EFFECTS ARE LISTED FIRST. Nine types (FM.CSS_FX — blur, brightness, contrast,
 *    saturate, hue, grayscale, sepia, invert, glow) are folded into one ctx.filter string applied
 *    BEFORE the layer is drawn, whatever order they sit in. Authoring them anywhere else would make
 *    the row order disagree with the render order — a "VHS" filter written grade → grain → scanlines
 *    would silently render grade-first. Listed first, what you read top-to-bottom is what happens.
 *    (The rows say "always first" too, but a list that agrees with itself needs no explaining.)
 *
 * 2. NOTHING IS AUTHORED AT AN EXTREME. Every value here sits where it still reads as the thing it is
 *    named after when Strength is at 1, because Strength fades the WHOLE filter toward the untouched
 *    picture — so the useful range is 0..1 around a sane look, not a rescue from an overcooked one.
 *
 * The definitions are validated against the effect registry on read (saneFilter), the same discipline
 * fx-presets.js applies: a type this build does not have, a param that is not in its schema, or a
 * value outside its range never reaches the compositor. A typo here should cost a dropped control,
 * never a broken render.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const SECTIONS = [
    { key: 'cinematic', label: 'Cinematic' },
    { key: 'retro', label: 'Retro / Analogue' },
    { key: 'glow', label: 'Light / Glow' },
    { key: 'stylised', label: 'Stylised' },
  ];

  /* e(type, params) — one child effect. Params are only the ones being moved off their default, so a
   * filter's definition reads as "what is different about this look" rather than as a wall of numbers. */
  const e = (type, params) => ({ type: type, params: params || {} });

  const FILTERS = [
    // ---- Cinematic ----------------------------------------------------------------------------
    { id: 'tealorange', name: 'Teal & Orange', section: 'cinematic',
      desc: 'The blockbuster grade — shadows toward teal, skin toward orange, with the edges eased down.',
      effects: [e('contrast', { amount: 1.12 }), e('saturate', { amount: 1.08 }),
                e('tealorange', { amount: 0.65 }), e('vignette', { amount: 0.32, size: 42 })] },
    { id: 'bleach', name: 'Bleach Bypass', section: 'cinematic',
      desc: 'Harsh, silvery and desaturated — the war-film look, with a little grain to stop it going clinical.',
      effects: [e('contrast', { amount: 1.24 }), e('saturate', { amount: 0.55 }),
                e('bleachbypass', { amount: 0.75 }), e('filmgrain', { amount: 22, size: 2 })] },
    { id: 'crossproc', name: 'Cross Process', section: 'cinematic',
      desc: 'Film developed in the wrong chemistry: cyan shadows, blown warm highlights.',
      effects: [e('contrast', { amount: 1.1 }), e('crossprocess', { amount: 0.6 }),
                e('colorbalance', { red: 12, green: -6, blue: 18 })] },
    { id: 'faded', name: 'Faded Film', section: 'cinematic',
      desc: 'Lifted blacks and drained colour, like a print left in the sun.',
      effects: [e('contrast', { amount: 0.92 }), e('faded', { amount: 0.65 }),
                e('filmgrain', { amount: 26, size: 2 }), e('vignette', { amount: 0.24, size: 46 })] },

    // ---- Retro & Analogue ---------------------------------------------------------------------
    { id: 'vhs', name: 'VHS Tape', section: 'retro',
      desc: 'Worn tape: colour bleeding sideways, the picture wobbling, tracking drifting through it.',
      effects: [e('vhstape', { amount: 0.7, chromableed: 30, wobble: 4 }),
                e('scanlines', { amount: 0.32, spacing: 3 })] },
    { id: 'crt', name: 'CRT Monitor', section: 'retro',
      desc: 'An old television: scanlines, a shadow mask, and the soft bloom a phosphor screen gives everything.',
      effects: [e('glow', { radius: 10 }), e('crt', { amount: 0.7, scanline: 0.5, mask: 0.22 })] },
    { id: 'super8', name: 'Super 8', section: 'retro',
      desc: 'Home-movie film — warm, grainy, light spilling in at the edges.',
      effects: [e('saturate', { amount: 1.15 }), e('contrast', { amount: 1.08 }),
                e('lightleak', { amount: 0.5 }), e('filmgrain', { amount: 45, size: 3 }),
                e('vignette', { amount: 0.4, size: 38 })] },
    { id: 'oldfilm', name: 'Old Film', section: 'retro',
      desc: 'Nearly monochrome, heavily grained, with the faint line structure of a worn projector print.',
      effects: [e('grayscale', { amount: 0.85 }), e('contrast', { amount: 1.2 }),
                e('filmgrain', { amount: 55, size: 2 }), e('scanlines', { amount: 0.18, spacing: 6 }),
                e('vignette', { amount: 0.45, size: 34 })] },

    // ---- Light & Glow -------------------------------------------------------------------------
    { id: 'dreamy', name: 'Dreamy Bloom', section: 'glow',
      desc: 'Highlights blooming into a soft haze — the everything-is-lovely look.',
      effects: [e('glow', { radius: 22, passes: 2 }), e('saturate', { amount: 1.1 }),
                e('lightglow', { amount: 0.55, radius: 14, threshold: 55 })] },
    { id: 'goldenhour', name: 'Golden Hour', section: 'glow',
      desc: 'Warm late light, with the highlights just starting to bloom.',
      effects: [e('saturate', { amount: 1.14 }), e('temperature', { amount: 45, tint: 8 }),
                e('lightglow', { amount: 0.4, radius: 10, threshold: 70 }),
                e('vignette', { amount: 0.22, size: 46 })] },
    { id: 'leak', name: 'Light Leak', section: 'glow',
      desc: 'Light spilling onto the film, with the warm red halo it leaves around bright areas.',
      effects: [e('lightleak', { amount: 0.7 }), e('halation', { amount: 1, threshold: 0.6 })] },
    { id: 'neonnight', name: 'Neon Night', section: 'glow',
      desc: 'Cold, saturated and glowing — wet streets and signs after dark.',
      effects: [e('contrast', { amount: 1.2 }), e('saturate', { amount: 1.5 }),
                e('colorbalance', { red: -10, green: -5, blue: 30 }),
                e('lightglow', { amount: 0.6, radius: 18, threshold: 45 }),
                e('halation', { amount: 0.9, threshold: 0.65 })] },

    // ---- Stylised -----------------------------------------------------------------------------
    { id: 'comic', name: 'Comic Ink', section: 'stylised',
      desc: 'Flat blocks of colour with the edges drawn back in, like inked line art.',
      effects: [e('contrast', { amount: 1.15 }), e('posterize', { levels: 5, mix: 0.85 }),
                e('edge', { amount: 1 })] },
    { id: 'poster', name: 'Poster Print', section: 'stylised',
      desc: 'Few colours, printed as dots — a screen-printed poster.',
      effects: [e('contrast', { amount: 1.2 }), e('posterize', { levels: 4 }),
                e('halftone', { size: 6 })] },
    { id: 'thermal', name: 'Thermal Camera', section: 'stylised',
      desc: 'Brightness read as heat — cold darks, white-hot highlights, glowing.',
      effects: [e('glow', { radius: 12 }), e('thermal', { amount: 1 })] },
    { id: 'nightvis', name: 'Night Vision', section: 'stylised',
      desc: 'Green phosphor, sensor noise and a hard vignette — looking through a scope.',
      effects: [e('nightvision', { amount: 0.85 }), e('noise', { amount: 25, speed: 20 }),
                e('scanlines', { amount: 0.22, spacing: 4 }),
                e('vignette', { amount: 0.5, size: 30 })] },
  ];

  /* Validate a definition against the LIVE registry and build a real container instance from it.
   * Same discipline as fx-presets' sanePreset, and for the same reason: this list is hand-authored, a
   * param key can be mistyped, and an effect can be renamed or removed by a later build. A typo should
   * cost one dropped control, never a broken render — so an unknown type is dropped, an unknown param
   * key is dropped, and a value outside the schema's range is clamped into it.
   * Returns null when nothing of the filter survives, because an empty filter is not a look. */
  function saneChild(def) {
    if (!def || typeof def.type !== 'string' || !FM.fxRegistry) return null;
    const reg = FM.fxRegistry.get(def.type);
    if (!reg || reg.type !== def.type) return null;
    const inst = FM.fxRegistry.makeInstance(def.type);
    if (!inst) return null;
    const schema = reg.params || [];
    Object.keys(def.params || {}).forEach(k => {
      const pd = schema.filter(p => p && p.key === k)[0];
      if (!pd) return;                                    // not a control this effect has
      let v = def.params[k];
      if (typeof v === 'number' && isFinite(v)) {
        if (isFinite(pd.min)) v = Math.max(pd.min, v);
        if (isFinite(pd.max)) v = Math.min(pd.max, v);
      }
      inst.params[k] = v;
    });
    return inst;
  }

  FM.FILTERS = FILTERS;
  FM.filters = {
    sections: function () {
      // Only sections that actually have something in them — an empty banner is worse than no banner.
      return SECTIONS.filter(s => FILTERS.some(f => f.section === s.key));
    },
    all: function () { return FILTERS.slice(); },
    bySection: function (key) { return FILTERS.filter(f => f.section === key); },
    get: function (id) { return FILTERS.filter(f => f.id === id)[0] || null; },
    /* The one creation path: a definition in, a real filter container out — the same shape "+ Add
     * Filter" produces, so everything downstream (render, inspector row, save/load, copy, presets)
     * treats it as an ordinary filter, because it is one. */
    makeInstance: function (id) {
      const def = this.get(id);
      if (!def || !FM.fxRegistry) return null;
      const box = FM.fxRegistry.makeInstance(FM.FX_CONTAINER);
      if (!box) return null;
      box.effects = (def.effects || []).map(saneChild).filter(Boolean);
      if (!box.effects.length) return null;
      box.name = def.name;      // so the row reads "Teal & Orange", not "Filter"
      return box;
    },
  };
})(window.FM);
