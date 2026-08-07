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
    filmgrain: 'stylize',
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
    faded: 'color', nightvision: 'stylize', sketch: 'drawing', roundcorners: 'stylize', liquidglass: 'stylize',
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
    // batch 26 (AM parity fill-ins)
    softglow: 'color', replacecolor: 'color', spotcolor: 'color', fourcolor: 'color', spectralmap: 'color',
    radialshadow: 'color', voronoi: 'proc', tunnel: 'distort',
    // batch 27
    touchup: 'matte',     // Remove Object — content-aware rectangular fill (delogo-style)
    // batch 28 (more AM Distortion/Warp + Procedural + Color parity)
    turbulentdisplace: 'distort', stretchseg: 'distort', tileshift: 'distort', tilerotate: 'distort',
    palettemap: 'color', lightning: 'proc',
    // batch 29 (layer-referencing displacement)
    displacemap: 'distort', polardisplace: 'distort',
    // batch 30 (procedural particle system)
    particles: 'proc',
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

  // chromakey/lumakey only affect media (video/image) layers — they run in the media draw path.
  // (vignette WAS here, but v2.86 gave non-media layers a comp-space PIXEL_FX.vignette, so the
  // add-flow gate would now block a working effect.)
  const MEDIA_ONLY = { chromakey: 1, lumakey: 1 };
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

  // Effects to feature in the carousel. STANDING RULE (Ezra, 2026-07-11): most recently
  // added/updated effects lead — prepend on every effect add/update, trim from the tail (~12 max).
  FM.FX_FEATURED = ['liquidglass', 'roundcorners', 'tiles', 'filmgrain', 'shake', 'particles', 'displacemap', 'polardisplace', 'lightning', 'turbulentdisplace', 'tilerotate', 'palettemap'];

  // Segment options are written two ways in FM.EFFECTS: as [value, label] pairs, or as a bare label
  // list where the index IS the value. Normalize to pairs HERE, once — the UI indexes opt[0]/opt[1],
  // and a bare string quietly indexes into the string itself ('Off'[0] === 'O', 'Off'[1] === 'f'),
  // which shipped Tiles with buttons labelled "f"/"n" that wrote parseFloat('O') = NaN.
  function normOptions(opts) {
    return (opts || []).map(function (o, i) { return Array.isArray(o) ? o : [i, o]; });
  }

  // Normalize a raw FM.EFFECTS def into the richer param[] schema (keeping real storage keys).
  function paramsOf(def) {
    const out = [];
    if (Array.isArray(def.params)) {
      // multi-param effects: a `params` array on the def — each a range control, or a segmented
      // choice when the entry carries `options` (e.g. Motion Blur (Content) styles).
      def.params.forEach(function (pp) {
        // `toggle` is a tick box, not a two-button segment: it reads as ON/OFF rather than as a choice
        // between two equal options, which matters when the thing it switches on overrides other controls.
        if (pp.toggle) out.push({ key: pp.key, label: pp.label, type: 'toggle', default: pp.def, note: pp.note || '', keyframable: false });
        // `legacy` is the value the RENDERER falls back to when the key is absent, which is not always
        // the schema default (byte-identity: an old instance must keep rendering as it always did).
        // The UI needs it so the highlighted button matches what actually draws.
        else if (pp.options) out.push({ key: pp.key, label: pp.label, type: 'segment', options: normOptions(pp.options), default: pp.def, legacy: pp.legacy, keyframable: false });
        else out.push({ key: pp.key, label: pp.label, type: 'range', min: pp.min, max: pp.max, step: pp.step, default: pp.def, unit: pp.unit || '', keyframable: true, overriddenBy: pp.overriddenBy || '' });
      });
    } else if (def.options) {
      out.push({ key: def.param, label: def.label, type: 'segment', options: normOptions(def.options), default: def.def, legacy: def.legacy, keyframable: false });
    } else if (def.param) {
      out.push({ key: def.param, label: def.label, type: 'range', min: def.min, max: def.max, step: def.step, default: def.def, unit: def.unit || '', keyframable: true });
    }
    // a source-layer picker (Displacement Map): stores another layer's id. First in the list so it
    // reads top-down "pick a map, then how much". Value is a plain string id — persists (no leading _).
    if (def.layer) out.unshift({ key: 'source', label: def.layerLabel || 'Source', type: 'layer', default: '', keyframable: false });
    if (def.color)  out.push({ key: 'color',  label: def.colorLabel  || 'Color',   type: 'color', default: def.defColor  || '#ffffff', keyframable: false });
    if (def.color2) out.push({ key: 'color2', label: def.color2Label || 'Color 2', type: 'color', default: def.defColor2 || '#ffffff', keyframable: false });
    if (def.color3) out.push({ key: 'color3', label: def.color3Label || 'Color 3', type: 'color', default: def.defColor3 || '#ffffff', keyframable: false });
    if (def.color4) out.push({ key: 'color4', label: def.color4Label || 'Color 4', type: 'color', default: def.defColor4 || '#ffffff', keyframable: false });
    return out;
  }

  /* Hand-written descriptions for the effects people reach for most. Everything else falls back to
   * describeOf(), which states the family and the controls truthfully rather than inventing prose —
   * a wrong description is worse than a plain one. Add to this map as effects earn a real sentence.
   * Kept here rather than in FM.EFFECTS so the compositor catalogue stays about rendering. */
  const DESCRIPTIONS = {
    blur: 'Softens everything evenly, like a lens out of focus.',
    boxblur: 'A cheaper, squarer blur — faster than Gaussian, slightly boxy up close.',
    sharpen: 'Hardens edges to bring detail back. Push it far and edges start to halo.',
    zoomblur: 'Streaks outward from a centre point, like a fast zoom during the shot.',
    spinblur: 'Streaks in a circle around a centre point — motion from a spin.',
    lensblur: 'Defocus with real lens character: bright points bloom into the aperture shape.',
    tiltshift: 'Keeps one band sharp and blurs away from it, the miniature-model look.',
    brightness: 'Lifts or drops the whole image evenly.',
    contrast: 'Pushes lights lighter and darks darker, or flattens them together.',
    saturate: 'Strengthens or drains colour without touching brightness.',
    vibrance: 'Boosts the muted colours and leaves already-vivid ones alone — kinder to skin than Saturation.',
    hue: 'Rotates every colour around the wheel.',
    grayscale: 'Removes colour entirely.',
    sepia: 'Warm monochrome — the old-photograph tone.',
    invert: 'Flips every colour to its opposite, like a film negative.',
    gamma: 'Reshapes the midtones without moving black or white.',
    exposure: 'Brightness in stops, the way a camera meters it.',
    temperature: 'Warms toward orange or cools toward blue.',
    tint: 'Washes the whole clip toward one colour.',
    colorize: 'Replaces the image colour with a single hue, keeping its light and shade.',
    duotone: 'Maps darks to one colour and lights to another.',
    gradientmap: 'Remaps brightness onto a gradient — darks take one end, lights the other.',
    glow: 'Blooms the bright areas into a soft halo.',
    softglow: 'A gentler bloom that lifts highlights without washing the picture out.',
    vignette: 'Darkens the edges to pull the eye to the middle.',
    filmgrain: 'Adds film grain. Controls how coarse it is and whether it sits in the shadows, the highlights, or both.',
    noise: 'Random speckle over the whole frame.',
    scanlines: 'Horizontal lines across the picture, like an old CRT.',
    crt: 'The whole old-television look: scanlines, curvature and a shadow mask.',
    glitch: 'Tears the image into displaced bands, digital-fault style.',
    rgbsplit: 'Separates the red, green and blue channels so they sit slightly apart.',
    chromaticaberration: 'Colour fringing toward the edges, the way a real lens misfocuses each colour.',
    pixelate: 'Averages the image into blocks.',
    posterize: 'Cuts the colours down to a few flat steps.',
    threshold: 'Hard two-tone: everything is black or white on either side of a cut.',
    dither: 'Reduces to few colours but scatters the error, so it reads as more shades than it has.',
    halftone: 'Rebuilds the image out of dots, like newsprint.',
    edge: 'Keeps only the edges and drops the fill.',
    emboss: 'Lights the image from one side so it reads as raised.',
    stroke: 'Draws an outline around the layer\u2019s own shape.',
    dropshadow: 'Casts a shadow behind the layer.',
    innerglow: 'Glows inward from the layer\u2019s edges.',
    roundcorners: 'Rounds the layer\u2019s corners, Apple-style — a continuous curve, not a plain arc.',
    liquidglass: 'A glass panel over the layer: refraction, a lit rim and a soft specular.',
    letterbox: 'Adds cinematic bars, cropping the frame to a wider ratio.',
    border: 'Draws a frame around the edge of the composition.',
    chromakey: 'Removes a colour — the green-screen key.',
    lumakey: 'Removes by brightness instead of colour.',
    mirror: 'Reflects one half of the frame onto the other.',
    kaleidoscope: 'Repeats a wedge of the image around a centre.',
    wave: 'Ripples the image along a sine wave.',
    ripple: 'Rings spreading from a centre, like a drop in water.',
    twirl: 'Spirals the image around a centre point.',
    bulge: 'Pushes the middle out or sucks it in.',
    fisheye: 'Barrel distortion, like a very wide lens.',
    particles: 'Emits particles from the layer — deterministic, so the same time always gives the same frame.',
    shake: 'Handheld camera shake, with optional zoom and twist.',
    wiggle: 'Drifts the layer around on smooth random noise.',
    tiles: 'Repeats the clip across the frame. Extend keeps it full size and fills outward; Grid shrinks it into an n\u00d7n block.',
    lightleak: 'A wash of light across the frame, like a leak onto film.',
    tealorange: 'The blockbuster grade: shadows toward teal, skin toward orange.',
    bleachbypass: 'High-contrast, low-saturation — the bleach-bypass film process.',
    crossprocess: 'The colour shifts of developing film in the wrong chemistry.',
    nightvision: 'Green phosphor, grain and a soft vignette.',
    sketch: 'Redraws the image as pencil lines.',
    copybg: 'Copies the layers underneath into this one, so it can be distorted or masked as a unit.',
  };

  // Every control an effect exposes, as plain words — the vocabulary someone searches with.
  function paramWords(def) {
    const out = [];
    if (Array.isArray(def.params)) def.params.forEach(function (p) { if (p.label) out.push(String(p.label)); });
    else if (def.label && def.param) out.push(String(def.label));
    if (def.color) out.push(def.colorLabel || 'Color');
    if (def.layer) out.push(def.layerLabel || 'Source');
    return out;
  }
  function tagsOf(def) {
    const cat = CATEGORY_LABELS[CATEGORY_OF[def.type] || 'other'] || '';
    const words = [].concat(
      String(def.label || '').split(/[^A-Za-z0-9]+/),
      cat.split(/[^A-Za-z0-9]+/),
      paramWords(def).join(' ').split(/[^A-Za-z0-9]+/),
      def.tags || [],
      [def.type]
    );
    const seen = {}, out = [];
    words.forEach(function (w) {
      w = String(w || '').trim().toLowerCase();
      if (w.length < 2) return;
      if (seen[w]) return; seen[w] = 1; out.push(w);
    });
    return out;
  }
  // A truthful fallback line when an effect hasn't been given one by hand: what family it is in and
  // what you can actually change. No invented adjectives — a wrong description is worse than none.
  function describeOf(def) {
    const cat = CATEGORY_LABELS[CATEGORY_OF[def.type] || 'other'] || 'Effect';
    const ctrl = paramWords(def);
    if (!ctrl.length) return cat + '. No settings — it either is or it isn\u2019t.';
    if (ctrl.length === 1) return cat + '. One control: ' + ctrl[0] + '.';
    return cat + '. Controls: ' + ctrl.slice(0, 5).join(', ') + (ctrl.length > 5 ? '\u2026' : '') + '.';
  }

  const REG = {};
  (FM.EFFECTS || []).forEach(def => {
    REG[def.type] = {
      id: def.type, type: def.type, label: def.label,
      // A plain-English sentence saying what the effect actually does. Generic on purpose — the two
      // motion blurs need it most (their names alone cannot tell you which reads movement), but any
      // effect that declares one gets it shown in the panel and in the browser. When one isn't
      // written, describeOf builds a truthful line from the catalogue rather than inventing prose.
      desc: def.desc || DESCRIPTIONS[def.type] || describeOf(def),
      // Search keywords. DERIVED rather than hand-listed for 175 effects: the category, the words in
      // the label, the type id, and every control the effect exposes — which is what people actually
      // type ("radius", "angle", "shutter"). An effect can add its own with a `tags:` array.
      tags: tagsOf(def),
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
      // Motion Blur (Footage) promises the OPPOSITE of what it would do on a group. Its whole design
      // is a plate rendered with the layer's transform zeroed, so moving the clip cannot smear it —
      // but a group is handed to the effect stack already flattened, with its transform baked into
      // the pixels. There is nothing left to neutralise, so dragging the group WOULD smear it. Offer
      // it on the members instead of shipping a control that does the reverse of its own name.
      if (id === 'motionflow' && layer.type === 'group') return false;
      return true;
    },
  };
})(window.FM);
