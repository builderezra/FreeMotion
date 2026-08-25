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
    flashdark: 'opacity',   // queue 349 — sits with its family, though it is the only one that leaves alpha alone
    // batch 14 (matte / mask / key)
    wipe: 'matte', radialwipe: 'matte', solidmatte: 'matte', mattechoker: 'matte', mattefringe: 'matte',
    // batch 15 (repeat / tiling)
    gridrepeat: 'repeat', linearrepeat: 'repeat', radialrepeat: 'repeat', mirrortile: 'repeat',
    // batch 16 (other / color / proc / drawing)
    channelremap: 'color', gradientoverlay: 'color', lensflare: 'proc', roughenedges: 'drawing', hexarray: 'proc',
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
    objectblur: 'blur',   // the layer's OWN movement, was layer.motionBlur (queue 335)
    copybg: 'stylize',    // copy the backdrop below into this layer
    magnifybg: 'stylize', // …and the same copy through a lens
    fillbehind: 'blur',  // …and the third of the family: fill the frame AROUND the layer with a blurred copy of it

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
    // batch 31 (the two grading gaps)
    levels: 'color', halation: 'color',
    // batch 32 (time + impact)
    framestutter: 'stylize', shockwave: 'distort',
    // batch 33 (manga lines + the HSL panel)
    speedlines: 'proc', hslbands: 'color',
    // batch 34 (the scan bar + a key that survives bad lighting)
    timewarp: 'stylize', chromakeypro: 'matte',
    // batch 35 (the compositing shot)
    lightwrap: 'matte',
    // batch 36 (disintegrate + tape damage)
    dispersion: 'opacity', vhstape: 'stylize',
    // batch 37 (the last two off the build table)
    compresscrunch: 'stylize', temporaldenoise: 'blur',
    // batch 38 (round 11 opens)
    lensdistort: 'distort', pixelsort: 'stylize', lumamatte: 'matte', compoundblur: 'blur', matchgrade: 'color',
    // batch 39 (the frame edges become solid)
    squish: 'distort',
    filter: 'stylize',   // the filter CONTAINER (queue 113) — hidden from the browser, see `hidden` below
  };

  // Display order + labels. Only categories that currently have effects are listed (no empty banners).
  const CATEGORY_LABELS = {
    color: 'Colouring',          // queue 288 — "Change colour and light effect menu to just Colouring"
    blur: 'Blur',
    /* FOUR RENAMES, ALL HIS (queue 446), across four separate messages:
       · "Distortion and warp to warping"
       · "Change procedural to generative"
       · "Chang the repeat menus name to repetition"
       · "Change the name of Matt/mask/key to whatever you thinks best instead of that" — my choice,
         and the choice is KEYING. A slash-triple is three words for one idea and reads like a
         glossary; matte, mask and key are the same act named by three trades. "Keying" is the one
         these effects actually DO — cutting one thing out of another by a property — and it is a verb,
         which is what the rest of this list is drifting toward (Warping, Colouring, Drawing). */
    distort: 'Warping',
    proc: 'Generative',
    matte: 'Keying',
    drawing: 'Drawing / Edge',
    move: 'Shakes / Movement',   // his name for it (queue 332 clause 2)
    repeat: 'Repetition',
    stylize: 'Stylize',
    threed: '3D',
    opacity: 'Opacity / Visibility',
    text: 'Text',
    /* "Other" is GONE (queue 289). Ezra: "Just put the effects from the other menu into menus that
       would fit them and get rid of the other menu."
       It held three, and one of those never showed: Channel Remap (whose every mode is a colour
       operation — Swap R/B, Hue Invert, Swap Sat/Val) went to Colouring; Fill Behind went to Blur,
       because a heavy blur IS the effect and "blurred background" is what someone would go looking
       under; and the Filter CONTAINER is `hidden: true`, so it never appeared in the browser at all —
       it is parked in Stylize, which is what a filter is, purely so its key resolves.
       The label and the order entry are removed rather than left empty: the browser only lists
       categories that have effects, so a leftover key would be invisible until something landed in it
       by accident and the menu he asked to delete came back. */
  };
  const CATEGORY_ORDER = ['color', 'blur', 'distort', 'proc', 'stylize', 'drawing', 'move', 'repeat', 'matte', 'opacity', 'text', 'threed'];

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
    posterize: 1, tint: 1, threshold: 1, duotone: 1, rgbsplit: 1, pixelate: 1, levels: 1,
  };

  // Effects to feature in the carousel. STANDING RULE (Ezra, 2026-07-11): most recently
  // added/updated effects lead — prepend on every effect add/update, trim from the tail (~12 max).
  // ONE EXCEPTION, found by the suite at v8.98 and walked into AGAIN at v9.03 (the text effects
  // that time — so the comment did not save me and the test did): nothing from MEDIA_ONLY or TEXT_ONLY belongs
  // here. The carousel does not filter by appliesTo — it offers every card and `guardedAdd`
  // refuses with a toast — so a media-only effect at the head of the row is two cards that a
  // shape or text layer can only answer with 'That effect needs a video or image layer'.
  /* FEATURED CARRIES NO NAME THAT IS ALSO A FILTER (queue 318). Ezra: *"in the effects menu filters
   * are showing up in the featured menu"*. Strictly they were not — `tealorange`, `faded`,
   * `bleachbypass` and `crossprocess` are single colour EFFECTS here — but each of them is ALSO the id
   * of a ready-made filter that leads with the same name, so the carousel was showing four tiles called
   * Teal & Orange, Faded Film, Bleach Bypass and Cross Process on a tab whose whole job is to not be
   * the Filters tab. From the outside that is filters in the featured row, and he is right that it is
   * wrong. Replaced with visual effects that have no filter twin; all four are still one search or one
   * category away, and still inside the filters that use them.
   * The browser ALSO refuses any featured id that names a filter — see fx-browser.js — because this
   * list is the kind that gets appended to, and the collision is invisible until someone reads both
   * files at once. */
  FM.FX_FEATURED = ['tunnel', 'bend', 'squeeze', 'innerpinch', 'glow', 'chromaticaberration', 'vignette', 'filmgrain', 'sharpen', 'boxblur', 'innerblur', 'stroke'];

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
        // A RANGE carries `legacy` for the same reason a segment does: an absent key renders at the
        // renderer's fallback, which for a param added to an existing effect is the value that effect
        // used to hardcode — not the new schema default. Without this the panel shows Edge Glow's
        // Radius as 8 on an instance the kernel is drawing at 3.
        else out.push({ key: pp.key, label: pp.label, type: 'range', min: pp.min, max: pp.max, step: pp.step, default: pp.def, legacy: pp.legacy, unit: pp.unit || '', keyframable: true, overriddenBy: pp.overriddenBy || '', liveWhen: pp.liveWhen, q: pp.q });
        /* `q` is the ruler's NOTCH, and it has to survive this copy for exactly the reason `liveWhen`
           does — see the warning immediately below, which was written when an option added at the
           declaration was silently dropped here. It forces how far a drag moves the value: the strip
           is pushed at 7px per notch, so a param whose notch is its own step feels coarse when that
           step is large relative to what the effect does. Queue 559 (the wipes) is the second use;
           the Speed slider (queue 455) was the first. */
        /* `liveWhen` has to survive this copy or it does not exist (queue 482). This normaliser
           rebuilds every param as a fresh object listing the keys it knows, so an option added at
           the declaration is silently dropped here — which is what happened first time: the panel
           kept using the old truthy test and the slider stayed locked in its own mode. */
      });
    } else if (def.options) {
      out.push({ key: def.param, label: def.label, type: 'segment', options: normOptions(def.options), default: def.def, legacy: def.legacy, keyframable: false });
    } else if (def.param) {
      out.push({ key: def.param, label: def.label, type: 'range', min: def.min, max: def.max, step: def.step, default: def.def, unit: def.unit || '', keyframable: true });
    }
    // a source-layer picker (Displacement Map): stores another layer's id. First in the list so it
    // reads top-down "pick a map, then how much". Value is a plain string id — persists (no leading _).
    if (def.layer) out.unshift({ key: 'source', label: def.layerLabel || 'Source', type: 'layer', default: '', keyframable: false });
    /* ⚠️ COLOURS KEYFRAME (queue 555). Ezra: "Colours for every effect like gradient overly should be
       key frame able" — a screenshot of Gradient Overlay where Amount carries a ◆ and the two colour
       stops carry nothing. These were `keyframable: false` while BOTH halves of the machinery already
       existed: FM.evalProp has interpolated '#rrggbb' keyframes channel-wise for months, and the
       inspector's `kfColorRow` (the colour row with a diamond) was already serving stroke and shadow.
       Only effect colours were wired to a plain row and flagged off. ai-ops still gates itself on
       `type === 'range'`, so the AI vocabulary is unaffected by this. */
    if (def.color)  out.push({ key: 'color',  label: def.colorLabel  || 'Colour',   type: 'color', default: def.defColor  || '#ffffff', keyframable: true });
    if (def.color2) out.push({ key: 'color2', label: def.color2Label || 'Colour 2', type: 'color', default: def.defColor2 || '#ffffff', keyframable: true });
    if (def.color3) out.push({ key: 'color3', label: def.color3Label || 'Colour 3', type: 'color', default: def.defColor3 || '#ffffff', keyframable: true });
    if (def.color4) out.push({ key: 'color4', label: def.color4Label || 'Colour 4', type: 'color', default: def.defColor4 || '#ffffff', keyframable: true });
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
    lensblur: 'Defocus with real lens character: turn up Highlight bloom and bright points swell into discs of the aperture shape you pick.',
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
    // Both used to promise the COMPOSITION, and both used to deliver it — by painting over the whole
    // frame and erasing the layers underneath. They are bounded to their own layer now (v6.35,
    // compositor fxBounds), so the blurbs say the layer or the UI documents the old bug.
    letterbox: 'Adds cinematic bars across the layer, cropping it to a wider ratio.',
    border: 'Draws a frame around the edge of the layer.',
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
    magnifybg: 'Copy Background through a lens: the layer fills with the scene below it, blown up around its own centre.',
    fillbehind: 'Fills the empty frame around the layer with a blurred, blown-up copy of the layer itself — the way a portrait clip is padded out to landscape. Does nothing if the layer already covers the canvas.',

    // ---- the rest, written 2026-08-08. Every line says what the effect DOES, in the words someone
    // would use before they knew its name. Where two effects are easy to confuse, the line says what
    // separates them — that is the question a description is actually being asked. ----

    // Colour & light
    thermal: 'Maps brightness onto a heat palette — darks go cold, highlights go white-hot.',
    lightglow: 'Blooms only the areas brighter than the threshold, so highlights glow and the rest stays put.',
    darkglow: 'The inverse bloom — the DARK areas spread instead, which sinks a shot rather than lifting it.',
    longshadow: 'Throws a long flat shadow off the layer at 45°, the way flat-design posters do.',
    radialshadow: 'Casts a shadow away from a light you place, so it stretches further the further it falls.',
    bumpmap: 'Shades the picture as though its own brightness were height — flat art picks up relief.',
    iridescence: 'An oil-slick sheen that shimmers across the picture. Motion sets how much it moves, Blur how soft it is.',
    colorbalance: 'Adds or removes each of red, green and blue separately — the direct way to kill a colour cast.',
    highlightsshadows: 'Recovers blown highlights and lifts crushed shadows without touching the midtones.',
    gradientoverlay: 'Lays a colour gradient over the layer at any angle.',
    faded: 'Lifts the blacks and drains the colour — the washed-out look of old film left in the sun.',
    replacecolor: 'Finds one colour and swaps it for another, leaving everything else alone.',
    spotcolor: 'Keeps ONE colour and drains the rest to grey — the red-coat-in-a-black-and-white-film shot.',
    fourcolor: 'Blends four colours from the four corners, for a soft full-frame wash.',
    spectralmap: 'Maps brightness across a stretch of the colour wheel — darks at one hue, lights at the other.',
    palettemap: 'Snaps every colour to the nearest one in a small palette, like a poster print.',

    // Distortion & warp
    polarcoords: 'Wraps the frame around a circle, or unwraps a circle into a straight strip. The Direction switch is which way.',
    bend: 'Curves the layer as though it were printed on a page being bent.',
    glass: 'Refracts the picture through rippled glass — sharp edges break up, colour stays.',
    curl: 'Swirls the picture in rings around a point, like a slow whirlpool.',
    fractalwarp: 'Pushes the picture around with fractal noise — organic, not geometric.',
    turbulentdisplace: 'The same idea with more control: Detail sets whether it is a slow churn or a fine crawl.',
    hextiles: 'Rebuilds the picture out of flat hexagons.',
    innerpinch: 'Squeezes the middle of the frame while the edges stay pinned.',
    squeeze: 'Pinches the layer in at the waist, or bulges it out.',
    tunnel: 'Pulls the frame into a receding tunnel around the centre.',
    stretchseg: 'Grabs one horizontal band and stretches it — the glitchy pulled-taffy smear.',
    tileshift: 'Chops the frame into tiles and slides alternate rows sideways.',
    tilerotate: 'Chops the frame into tiles and rotates each one in place.',
    squish: 'Makes the canvas edges solid: a layer sliding off-frame squashes against the edge instead of being cut off. Pair it with a Bounce ease on Position and the impact squash comes free.',
    displacemap: 'Pushes each pixel by the colour of another layer at that spot — red moves it sideways, green up and down.',
    polardisplace: 'The same, in circles: another layer’s brightness pushes pixels toward or around the centre.',

    // Procedural
    checker: 'Draws a checkerboard over the layer.',
    grid: 'Draws a grid of lines over the layer.',
    dots: 'Covers the layer in a regular dot pattern.',
    stripes: 'Covers the layer in even stripes.',
    clouds: 'Generates soft drifting cloud noise — a sky, a fog bank, or a mask to drive something else.',
    rays: 'Fires straight rays out of a point you place, like light through a gap.',
    blocknoise: 'Random rectangular blocks of corruption — the look of a dropped signal.',
    starfield: 'Scatters stars across the frame.',
    grunge: 'Grimy blotches and speckle, for dirtying up something too clean.',
    lensflare: 'A lens flare from a light you position, with the streaks and ghosts a real one throws.',
    hexarray: 'A honeycomb of hexagons over the frame.',
    fractalridges: 'Ridged fractal noise that churns in place — rock, cloth or turbulence, depending on Scale and Sharpness. Colour it flat, tinted, as a two-stop gradient or a full spectrum, and Overlay decides whether it sits on the picture or replaces it.',
    contourstrips: 'Slices the brightness range into flat bands and colours them, like a topographic map.',
    voronoi: 'Breaks the frame into organic cells, the pattern of cracked mud or a giraffe’s coat.',
    lightning: 'Draws branching lightning bolts across the layer.',

    // Drawing & edge
    halftonelines: 'Rebuilds the image out of lines of varying weight, like an engraving.',
    crosshatch: 'Redraws the image in crossed pen strokes, denser where it is darker.',
    contourlines: 'Draws a line wherever the brightness crosses a level — the picture as a contour map.',
    edgeglow: 'Blooms a glow out of the edges, in a colour you choose. Glow on Layer traces the layer’s own outline, so a flat shape or a line of text glows; Media finds the contrast edges inside the picture; Both does the two together.',
    electricedges: 'Edges that crackle and glow, and keep moving — a live-wire outline.',
    glowscan: 'A band of light sweeps across the layer over and over.',
    smoothedges: 'Feathers the layer’s outline so it fades out instead of stopping dead.',
    roughenedges: 'Eats the layer’s outline away into a torn, ragged edge.',
    smoothbevel: 'Rounds and lights the layer’s edge so it reads as a raised, moulded surface.',

    // Blur
    mosaic: 'Averages the picture into large blocks. Coarser and blockier than Pixelate.',
    unsharpmask: 'Sharpening with a radius — you set how WIDE the detail it hardens is, not just how much.',
    linstreaks: 'Smears the bright parts into straight streaks along an angle.',
    spinstreaks: 'Smears the bright parts into arcs around the centre.',
    zoomstreaks: 'Smears the bright parts outward from the centre, like a zoom during the exposure.',
    innerblur: 'Blurs inward from the layer’s edge and leaves the middle sharp.',

    // Matte / mask / key
    wipe: 'Reveals or hides the layer behind a straight line at any angle. Keyframe Progress to run it.',
    radialwipe: 'The same, but the line sweeps around like a clock hand.',
    solidmatte: 'Replaces everything the layer covers with one flat colour, keeping only its shape.',
    mattechoker: 'Eats into or fattens the layer’s edge by a few pixels — for tightening a key that left a rim.',
    mattefringe: 'Draws a coloured band along the layer’s edge.',
    touchup: 'Paints out a rectangle of the frame using the pixels around it — for a logo, a boom mic, a sign.',

    // Repeat
    gridrepeat: 'Repeats the layer in a grid.',
    linearrepeat: 'Repeats the layer in a line.',
    radialrepeat: 'Repeats the layer in a ring around the centre.',
    mirrortile: 'Tiles the frame with alternating mirrored copies, so the joins are seamless.',

    // Opacity / visibility
    blink: 'Switches the layer on and off at a steady rate.',
    flicker: 'Flickers the opacity irregularly, like a failing bulb.',
    flashdark: 'Darkens the picture in irregular flashes — like a black wash pulsing over it. The layer never disappears, because only its brightness moves, not its opacity.',
    pulseopacity: 'Fades the layer smoothly in and out, over and over.',
    dissolve: 'Punches random holes in the layer. Keyframe Amount to dissolve it away.',
    blockdissolve: 'The same, in blocks rather than single pixels — a chunkier, more digital exit.',

    // Move / transform
    swing: 'Rocks the layer back and forth like a pendulum.',
    spin: 'Rotates the layer continuously.',
    pulse: 'Breathes the layer’s size in and out.',
    drift: 'Slides the layer steadily in one direction, forever.',
    orbit: 'Carries the layer round a circle without rotating it.',

    // Text
    counter: 'Counts a number up or down. Keyframe Progress and it animates between the two ends.',
    textprogress: 'Types the text on, character by character, as Progress runs.',
    textrandomizer: 'Scrambles the characters and resolves them into the real text.',
    textspacing: 'Widens or tightens the gaps between letters.',
    texttransform: 'Forces the text to UPPERCASE, lowercase, Title Case or Sentence case without retyping it.',
    timecode: 'Shows the running time of the clip, in the format you pick.',

    // Stylize / other
    solarize: 'Inverts everything above a brightness cut, the way overexposed film does.',
    channelremap: 'Swaps the red, green and blue channels around. The fastest way to a completely alien palette.',

    // 3D — every one of these turns the layer into a solid and wraps its own pixels on as the skin
    cube3d: 'Wraps the layer onto a rotating cube.',
    box3d: 'Wraps the layer onto a box you can set the proportions of.',
    cylinder3d: 'Wraps the layer around a cylinder — a can, a column, a rolling banner.',
    sphere3d: 'Wraps the layer onto a sphere, like a globe or a planet.',
    ellipsoid3d: 'A sphere you can stretch — an egg, a capsule, a squashed ball.',
    torus3d: 'Wraps the layer onto a ring doughnut.',
    ring3d: 'A flat ring standing in space, textured with the layer.',
    pyramid3d: 'Wraps the layer onto a four-sided pyramid.',
    octahedron3d: 'Wraps the layer onto an eight-sided solid — two pyramids base to base.',
    hexprism3d: 'Wraps the layer onto a six-sided prism.',
    starprism3d: 'Wraps the layer onto a star-shaped prism — a star with depth.',
    starpoly3d: 'Wraps the layer onto a spiked star ball.',
    heart3d: 'Wraps the layer onto a solid heart.',
    hollowbox3d: 'A box with no front, so you can see inside it.',
    axiscross3d: 'Three bars crossing at right angles — a 3D plus sign, good as a scene axis.',
    pagecurl: 'Peels a corner of the layer up like a page turning, with the back lit.',
    fliplayer: 'Mirrors the layer horizontally, vertically, or both.',
    rasterextrude: 'Extrudes the layer back into depth, so flat art becomes a solid slab with shaded sides.',
  };

  // Every control an effect exposes, as plain words — the vocabulary someone searches with.
  function paramWords(def) {
    const out = [];
    if (Array.isArray(def.params)) def.params.forEach(function (p) { if (p.label) out.push(String(p.label)); });
    else if (def.label && def.param) out.push(String(def.label));
    if (def.color) out.push(def.colorLabel || 'Colour');
    if (def.layer) out.push(def.layerLabel || 'Source');
    return out;
  }
  function tagsOf(def) {
    const cat = CATEGORY_LABELS[CATEGORY_OF[def.type] || 'stylize'] || '';
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
    const cat = CATEGORY_LABELS[CATEGORY_OF[def.type] || 'stylize'] || 'Effect';
    const ctrl = paramWords(def);
    if (!ctrl.length) return cat + '. No settings — it either is or it isn\u2019t.';
    if (ctrl.length === 1) return cat + '. One control: ' + ctrl[0] + '.';
    return cat + '. Controls: ' + ctrl.slice(0, 5).join(', ') + (ctrl.length > 5 ? '\u2026' : '') + '.';
  }

  /* Object.create(null), not {} — a NULL-PROTOTYPE map, because this table is looked up with bare
   * bracket access from a value that can come out of a saved project file. With a normal object
   * literal, REG['toString'] resolves up the prototype chain and returns a FUNCTION: verified live,
   * get('toString') / ('constructor') / ('valueOf') / ('hasOwnProperty') all came back truthy and
   * supportsLayer() said true for every one of them. The inspector's expanded branch then calls
   * reg.params.forEach on a function, which is a TypeError that takes the whole effects panel down.
   * That path is reachable today because layer.effects is the one major layer sub-structure with NO
   * import sanitisation — sanitizeImportedLayers rebuilds audioFx, behaviors, masks, trimPath,
   * repeater and camera from their schemas and never touches effects. storage.js has learned this
   * lesson three times already; this is the same fix. */
  const REG = Object.create(null);
  (FM.EFFECTS || []).forEach(def => {
    REG[def.type] = {
      id: def.type, type: def.type, label: def.label,
      // A plain-English sentence saying what the effect actually does. Generic on purpose — the two
      // motion blurs need it most (their names alone cannot tell you which reads movement), but any
      // effect that declares one gets it shown in the panel and in the browser. When one isn't
      // written, describeOf builds a truthful line from the catalogue rather than inventing prose.
      desc: def.desc || DESCRIPTIONS[def.type] || describeOf(def),
      // Search keywords. DERIVED rather than hand-listed for 177 effects: the category, the words in
      // the label, the type id, and every control the effect exposes — which is what people actually
      // type ("radius", "angle", "shutter"). An effect can add its own with a `tags:` array.
      tags: tagsOf(def),
      /* Falls back to a REAL category (queue 289). It used to fall back to 'other', and deleting that
         category turned the fallback into a trap: an effect added without a CATEGORY_OF entry would
         resolve to a key with no label, and since the browser only lists categories that have effects,
         it would not appear anywhere at all. The suite now fails on an unlisted category rather than
         letting one go missing quietly. */
      category: CATEGORY_OF[def.type] || 'stylize',
      params: paramsOf(def),
      appliesTo: TEXT_ONLY[def.type] ? 'text' : (MEDIA_ONLY[def.type] ? 'media' : 'all'),
      // Not offered in the effects grid. The filter container is a real registry entry — the load path
      // validates its params like any other effect's — but you do not add an empty one from the grid.
      hidden: !!def.hidden,
      _def: def,
    };
  });

  // Categories that actually have at least one effect, in display order.
  FM.FX_CATEGORIES = CATEGORY_ORDER
    .filter(key => Object.keys(REG).some(t => REG[t].category === key && !REG[t].hidden))
    .map(key => ({ key: key, label: CATEGORY_LABELS[key] || key }));

  FM.fxRegistry = {
    get: function (id) { return REG[id] || null; },
    all: function () { return (FM.EFFECTS || []).map(d => REG[d.type]).filter(e => e && !e.hidden); },
    byCategory: function (catKey) { return (FM.EFFECTS || []).map(d => REG[d.type]).filter(e => e && !e.hidden && e.category === catKey); },
    // …and the unfiltered view, for the paths that must resolve a hidden type by name (the load path,
    // the inspector row). get() already returns hidden entries; this is only for enumeration.
    allIncludingHidden: function () { return (FM.EFFECTS || []).map(d => REG[d.type]); },
    categories: function () { return FM.FX_CATEGORIES; },
    paramsOf: function (id) { return (REG[id] && REG[id].params) || []; },
    // THE single creation path — returns exactly ONE instance (kills the duplicate-add bug by design).
    makeInstance: function (id) {
      const e = REG[id]; if (!e) return null;
      const params = {};
      e.params.forEach(p => { params[p.key] = p.default; });
      return { type: e.type, enabled: true, params: params };
    },
    /* Does a FILTER apply to this layer? Not answerable by supportsLayer, which is asked about a TYPE:
     * the container type itself has no restrictions, so supportsLayer('filter', anything) is true and a
     * filter full of text effects lands happily on a shape, where not one of them can run — a row that
     * looks like a look and does nothing.
     * The rule is the existing one applied one level in: a filter applies where its CONTENTS apply, so
     * this is the AND over its children. An empty filter is false — there is nothing in it that could
     * apply — which is deliberately NOT the gate on creating one from the Effects panel: you add an
     * empty filter in order to fill it. This gates the paths that LAND a filter built somewhere else. */
    supportsFilter: function (fx, layer) {
      if (!FM.isFxContainer || !FM.isFxContainer(fx) || !layer) return false;
      const kids = fx.effects || [];
      if (!kids.length) return false;
      return kids.every(k => k && typeof k.type === 'string' && this.supportsLayer(k.type, layer));
    },
    // Fit a stack entry to a layer: an unsupported child is dropped from INSIDE the filter, keeping the
    // filter, rather than the whole filter being dropped for one bad child. Returns null when nothing
    // of it survives. Normal effects pass through unchanged or not at all.
    fitToLayer: function (fx, layer) {
      if (!fx || typeof fx.type !== 'string' || !layer) return null;
      if (FM.isFxContainer && FM.isFxContainer(fx)) {
        const kept = (fx.effects || []).filter(k => k && typeof k.type === 'string' && this.supportsLayer(k.type, layer));
        if (!kept.length) return null;
        return Object.assign({}, fx, { effects: kept });
      }
      return this.supportsLayer(fx.type, layer) ? fx : null;
    },
    supportsLayer: function (id, layer) {
      const e = REG[id];
      // typeof check as well as truthiness: a null-prototype REG closes the inherited-key hole, but
      // this function is called with ids from clipboards, presets and project files, and a registry
      // entry is always an object — anything else is not an effect this build knows.
      if (!e || typeof e !== 'object' || !layer) return false;
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
      // Squish deforms whatever hangs OFF the frame — and a group reaches the effect stack already
      // flattened into a COMP-SIZED plate, so the overhang has been clipped away before the effect
      // can see it. Measured: a group holding a ball 40% past the wall renders byte-identically with
      // Squish on and off. Offer it on the members instead of shipping a control that cannot act.
      if (id === 'squish' && layer.type === 'group') return false;
      return true;
    },
  };
})(window.FM);
