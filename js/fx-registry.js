/* FreeMotion — Effect registry. The single source of truth the effects list, per-effect editor and the
 * Add-Effect browser all read. It DERIVES from FM.EFFECTS (compositor.js) — it never renames storage keys
 * and never replaces the catalog, so the compositor / AI validators keep working untouched. Adding a new
 * effect = add to FM.EFFECTS + a compositor render branch + a CATEGORY_OF entry; everything here derives. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // type -> AM category. Every existing effect is assigned. New categories appear as effects fill them.
  const CATEGORY_OF = {
    brightness: 'color', contrast: 'color', saturate: 'color', hue: 'color',
    grayscale: 'color', sepia: 'color', invert: 'color', tint: 'color',
    glow: 'color', vignette: 'color', duotone: 'color',
    blur: 'blur',
    rgbsplit: 'distort', pixelate: 'distort', mirror: 'distort',
    posterize: 'proc', threshold: 'proc',
    chromakey: 'matte', lumakey: 'matte',
    // batch 1
    gamma: 'color', temperature: 'color',
    solarize: 'stylize', noise: 'stylize', scanlines: 'stylize',
    // batch 2
    vibrance: 'color', thermal: 'color',
    sharpen: 'stylize', dither: 'stylize', halftone: 'stylize',
    // batch 3 — geometric warps
    wave: 'distort', ripple: 'distort', twirl: 'distort', bulge: 'distort',
    // batch 4
    edge: 'drawing', emboss: 'drawing', exposure: 'color', fisheye: 'distort',
    // batch 5
    kaleidoscope: 'distort', zoomblur: 'blur', glitch: 'stylize', crt: 'stylize',
  };

  // Display order + labels. Only categories that currently have effects are listed (no empty banners).
  const CATEGORY_LABELS = {
    color: 'Color & Light',
    blur: 'Blur',
    distort: 'Distortion & Warp',
    proc: 'Procedural',
    matte: 'Matte / Mask / Key',
    drawing: 'Drawing & Edge',
    move: 'Move / Transform',
    repeat: 'Repeat',
    stylize: 'Stylize',
    threed: '3D',
    other: 'Other',
  };
  const CATEGORY_ORDER = ['color', 'blur', 'distort', 'proc', 'stylize', 'drawing', 'move', 'repeat', 'matte', 'threed', 'other'];

  // chromakey/lumakey/vignette only affect media (video/image) layers — never text/shape.
  const MEDIA_ONLY = { chromakey: 1, lumakey: 1, vignette: 1 };

  // Effects to feature in the carousel (visually interesting ones).
  FM.FX_FEATURED = ['duotone', 'chromakey', 'glow', 'rgbsplit', 'pixelate', 'mirror'];

  // Normalize a raw FM.EFFECTS def into the richer param[] schema (keeping real storage keys).
  function paramsOf(def) {
    const out = [];
    if (def.options) {
      out.push({ key: def.param, label: def.label, type: 'segment', options: def.options, default: def.def, keyframable: false });
    } else if (def.param) {
      out.push({ key: def.param, label: def.label, type: 'range', min: def.min, max: def.max, step: def.step, default: def.def, unit: def.unit || '', keyframable: true });
    }
    if (def.color)  out.push({ key: 'color',  label: def.colorLabel  || 'Color',   type: 'color', default: def.defColor  || '#ffffff', keyframable: false });
    if (def.color2) out.push({ key: 'color2', label: def.color2Label || 'Color 2', type: 'color', default: def.defColor2 || '#ffffff', keyframable: false });
    return out;
  }

  const REG = {};
  (FM.EFFECTS || []).forEach(def => {
    REG[def.type] = {
      id: def.type, type: def.type, label: def.label,
      category: CATEGORY_OF[def.type] || 'other',
      params: paramsOf(def),
      appliesTo: MEDIA_ONLY[def.type] ? 'media' : 'all',
      _def: def,
    };
  });

  // Categories that actually have at least one effect, in display order.
  FM.FX_CATEGORIES = CATEGORY_ORDER
    .filter(key => Object.keys(REG).some(t => REG[t].category === key))
    .map(key => ({ key: key, label: CATEGORY_LABELS[key] || key }));

  FM.fxRegistry = {
    get: function (id) { return REG[id] || null; },
    all: function () { return (FM.EFFECTS || []).map(d => REG[d.type]); },
    byCategory: function (catKey) { return (FM.EFFECTS || []).map(d => REG[d.type]).filter(e => e.category === catKey); },
    categories: function () { return FM.FX_CATEGORIES; },
    paramsOf: function (id) { return (REG[id] && REG[id].params) || []; },
    // THE single creation path — returns exactly ONE instance (kills the duplicate-add bug by design).
    makeInstance: function (id) {
      const e = REG[id]; if (!e) return null;
      const params = {};
      e.params.forEach(p => { params[p.key] = p.default; });
      return { type: e.type, enabled: true, params: params };
    },
    supportsLayer: function (id, layer) {
      const e = REG[id]; if (!e || !layer) return false;
      if (e.appliesTo === 'media' && !(layer.type === 'video' || layer.type === 'image')) return false;
      if (layer.type === 'adjustment' && id === 'mirror') return false;   // mirror needs a geometry pass adjustment layers can't do
      return true;
    },
  };
})(window.FM);
