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
    solarize: 'stylize', noise: 'proc', scanlines: 'stylize',
    // batch 2
    vibrance: 'color', thermal: 'color',
    sharpen: 'blur', dither: 'stylize', halftone: 'drawing',
    // batch 3 — geometric warps
    wave: 'distort', ripple: 'distort', twirl: 'distort', bulge: 'distort',
    // batch 4
    edge: 'drawing', emboss: 'drawing', exposure: 'color', fisheye: 'distort',
    // batch 5
    kaleidoscope: 'distort', zoomblur: 'blur', glitch: 'stylize', crt: 'stylize',
    // batch 6
    boxblur: 'blur', spinblur: 'blur', gradientmap: 'color', colorize: 'color', checker: 'proc', grid: 'proc',
    // batch 7
    mosaic: 'blur', lensblur: 'blur', polarcoords: 'distort', bend: 'distort', glass: 'distort', dots: 'proc',
    // batch 8
    lightglow: 'color', longshadow: 'color', halftonelines: 'drawing', clouds: 'proc', rays: 'proc', stripes: 'stylize',
    // batch 9
    darkglow: 'color', stroke: 'drawing', smoothedges: 'drawing', blocknoise: 'proc', starfield: 'proc', curl: 'distort',
    // batch 10
    bumpmap: 'color', edgeglow: 'drawing', contourlines: 'drawing', grunge: 'proc', iridescence: 'color', fractalwarp: 'distort',
    // batch 11 (multi-param)
    motionblur: 'blur', colorbalance: 'color', highlightsshadows: 'color', tiltshift: 'blur',
    // batch 12
    dropshadow: 'stylize', chromaticaberration: 'distort', innerglow: 'drawing', unsharpmask: 'blur', hextiles: 'distort', linstreaks: 'blur',
    // batch 13 (opacity / visibility)
    blink: 'opacity', flicker: 'opacity', pulseopacity: 'opacity', dissolve: 'opacity', blockdissolve: 'opacity',
    // batch 14 (matte / mask / key)
    wipe: 'matte', radialwipe: 'matte', solidmatte: 'matte', mattechoker: 'matte', mattefringe: 'matte',
    // batch 15 (repeat / tiling)
    gridrepeat: 'repeat', linearrepeat: 'repeat', radialrepeat: 'repeat', mirrortile: 'repeat',
    // batch 16 (other / color / proc / drawing)
    channelremap: 'other', gradientoverlay: 'color', lensflare: 'proc', roughenedges: 'drawing', hexarray: 'proc',
    // batch 17 (drawing / blur / proc)
    electricedges: 'drawing', glowscan: 'drawing', spinstreaks: 'blur', fractalridges: 'proc', smoothbevel: 'drawing',
    // batch 18 (blur / proc / distort / drawing)
    zoomstreaks: 'blur', innerblur: 'blur', contourstrips: 'proc', innerpinch: 'distort', crosshatch: 'drawing',
    // batch 19 (text)
    counter: 'text', textprogress: 'text', textrandomizer: 'text', textspacing: 'text', texttransform: 'text', timecode: 'text',
    // batch 20 (cinematic grades + framing)
    bleachbypass: 'color', tealorange: 'color', crossprocess: 'color', lightleak: 'color', letterbox: 'stylize', border: 'drawing',
    // batch 21
    faded: 'color', nightvision: 'stylize', sketch: 'drawing',
    // batch 22 (3D — textured-mesh solids)
    cube3d: 'threed', box3d: 'threed', cylinder3d: 'threed', sphere3d: 'threed', ellipsoid3d: 'threed',
    torus3d: 'threed', ring3d: 'threed', pyramid3d: 'threed', octahedron3d: 'threed', hexprism3d: 'threed',
    starprism3d: 'threed', starpoly3d: 'threed', heart3d: 'threed', hollowbox3d: 'threed', axiscross3d: 'threed',
    pagecurl: 'threed', fliplayer: 'threed', rasterextrude: 'threed',
    // batch 23 (move / transform)
    wiggle: 'move', shake: 'move', swing: 'move', spin: 'move', pulse: 'move', drift: 'move', orbit: 'move',
    // batch 24
    squeeze: 'distort', tiles: 'repeat',
    motionflow: 'blur',   // content-aware motion blur (temporal)
    copybg: 'stylize',    // copy the backdrop below into this layer
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
    opacity: 'Opacity / Visibility',
    text: 'Text',
    other: 'Other',
  };
  const CATEGORY_ORDER = ['color', 'blur', 'distort', 'proc', 'stylize', 'drawing', 'move', 'repeat', 'matte', 'opacity', 'text', 'threed', 'other'];

  // chromakey/lumakey/vignette only affect media (video/image) layers — never text/shape.
  const MEDIA_ONLY = { chromakey: 1, lumakey: 1, vignette: 1 };
  // Text effects transform a text layer's displayed string / letter-spacing — only valid on text layers.
  const TEXT_ONLY = { counter: 1, textprogress: 1, textrandomizer: 1, textspacing: 1, texttransform: 1, timecode: 1 };
  // An adjustment layer grades the already-composited frame below it. compositor.applyAdjustment can
  // ONLY apply: CSS-filter effects (effectFilter) + the PIXEL_ADJ whole-frame grades + pixelate.
  // Every other effect (geometry warps, the rest of the pixel/text passes) is accepted but renders
  // nothing on an adjustment layer — a silent no-op — so this whitelist gates them out. (#6)
  const ADJ_OK = {
    blur: 1, brightness: 1, contrast: 1, saturate: 1, hue: 1, grayscale: 1, sepia: 1, invert: 1, glow: 1,
    posterize: 1, tint: 1, threshold: 1, duotone: 1, rgbsplit: 1, pixelate: 1,
  };

  // Effects to feature in the carousel (visually interesting ones). Chroma Key + Squeeze lead, like AM.
  FM.FX_FEATURED = ['chromakey', 'motionflow', 'copybg', 'squeeze', 'cube3d', 'duotone', 'glow', 'pagecurl', 'rgbsplit', 'pixelate'];

  // Normalize a raw FM.EFFECTS def into the richer param[] schema (keeping real storage keys).
  function paramsOf(def) {
    const out = [];
    if (Array.isArray(def.params)) {
      // multi-param effects: a `params` array on the def — each a range control, or a segmented
      // choice when the entry carries `options` (e.g. Motion Blur (Content) styles).
      def.params.forEach(function (pp) {
        if (pp.options) out.push({ key: pp.key, label: pp.label, type: 'segment', options: pp.options, default: pp.def, keyframable: false });
        else out.push({ key: pp.key, label: pp.label, type: 'range', min: pp.min, max: pp.max, step: pp.step, default: pp.def, unit: pp.unit || '', keyframable: true });
      });
    } else if (def.options) {
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
      appliesTo: TEXT_ONLY[def.type] ? 'text' : (MEDIA_ONLY[def.type] ? 'media' : 'all'),
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
      if (layer.type === 'camera' || layer.type === 'null') return false;   // rig controls have no pixels to affect (#19)
      if (e.appliesTo === 'media' && !(layer.type === 'video' || layer.type === 'image')) return false;
      if (e.appliesTo === 'text' && layer.type !== 'text') return false;   // text effects need a text layer
      if (layer.type === 'adjustment' && !ADJ_OK[id]) return false;        // adjustment layers can only grade (no geometry/most pixel passes) (#6)
      return true;
    },
  };
})(window.FM);
