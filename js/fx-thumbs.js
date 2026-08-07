/* FreeMotion — Add-Effect browser thumbnails, LIVE-rendered (no image assets).
 * Each tile's canvas gets the REAL effect applied to a tiny module-private sample scene via
 * FM.renderScene (the compositor is scene-agnostic — same trick as the test harness). Static
 * effects cache one 96² frame; effects that move (shake, wipes, glowscan…) are auto-detected
 * by diffing two probe frames and cache a 10-frame strip looped by ONE shared ticker.
 * Every effect names the SUBJECT that demonstrates it (see SUBJECT_OF) rather than sharing one
 * generic sample — a single subject cannot show 177 different things.
 * Contract with fx-browser.js: FM.fxThumbs.mount(canvasEl, effectType) + FM.fxThumbs.stopAll().
 * Cache is kept for the whole session (~8-15MB at 96² for ~160 statics + ~30 strips — fine). */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const SIZE = 96, FRAMES = 10, TICK_MS = 90;   // 10 frames @ ~11fps ≈ 0.9s loop
  const PROJ = { width: SIZE, height: SIZE, fps: 30, duration: 2, background: '#151a24' };

  // ---- render surface (one shared offscreen canvas) ----
  const work = document.createElement('canvas');
  work.width = SIZE; work.height = SIZE;
  const wctx = work.getContext('2d', { willReadFrequently: true });
  function renderFrame(scene, t) { wctx.setTransform(1, 0, 0, 1, 0, 0); FM.renderScene(wctx, scene, t); }
  function snap() {   // copy the work canvas into a fresh cacheable frame
    const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE;
    c.getContext('2d').drawImage(work, 0, 0);
    return c;
  }

  /* ---- SUBJECTS ------------------------------------------------------------------------------
   * A thumbnail is only worth showing if you can tell WHAT THE EFFECT DOES from the tile alone.
   * One generic subject cannot do that for 177 effects: a flat teal ball has no tonal range (so
   * Brightness, Contrast and Saturation all render the identical ball), no straight lines (so every
   * warp is just a slightly different ball) and no texture (so the 3D solids are all one blob).
   * So each effect names the subject that demonstrates IT — see SUBJECT_OF below.
   *
   *   ball     flat teal ellipse + orange dot on the backdrop. Clean silhouette, no interior — right
   *            only when the effect is about the layer's ALPHA/outline or about MOVING a small object.
   *   photo    a mini landscape filling the frame: full 0-255 luma (near-black ridge, near-white
   *            horizon), wide hue (indigo→orange sky, crimson sail), a dead-straight horizon and a
   *            circular sun. The general-purpose subject for anything tonal.
   *   card     that same photo at 64px on the backdrop — content AND a hard rectangular edge, for
   *            effects that act on the layer's border (stroke, shadow, corners, repeat, 3D).
   *   grid     full-frame lattice: checker ground, straight rules, concentric rings, one bold
   *            diagonal. Straight lines make any geometric deformation unmistakable.
   *   gridcard the lattice at 64px on the backdrop — texture plus an edge.
   *   text     a text layer. Only the six effects that rewrite/space a string.
   *   keyshot  half chroma-green, half gradient, white circle across the seam. Keying only.
   * -------------------------------------------------------------------------------------------- */

  // A mini landscape, drawn parametrically so it stays crisp at any tile size (u = size/96).
  function paintPhoto(g, S) {
    const u = S / 96;
    const HZ = 58 * u;                                   // horizon line
    let sky = g.createLinearGradient(0, 0, 0, HZ);
    sky.addColorStop(0, '#0b1030'); sky.addColorStop(0.45, '#3b3f8f'); sky.addColorStop(0.82, '#e2653f'); sky.addColorStop(1, '#ffc178');
    g.fillStyle = sky; g.fillRect(0, 0, S, HZ);
    // stars — 1px specks give sharpen / unsharp / grain something real to bite on
    g.fillStyle = 'rgba(220,228,255,0.85)';
    [[10, 8], [22, 15], [38, 6], [52, 17], [72, 9], [86, 20], [30, 25], [62, 13]].forEach(function (p) {
      g.fillRect(Math.round(p[0] * u), Math.round(p[1] * u), Math.max(1, u), Math.max(1, u));
    });
    // sun: a hard disc inside a soft halo — a circle for the warps, a highlight for the glows
    const sx = 66 * u, sy = 27 * u;
    const halo = g.createRadialGradient(sx, sy, 0, sx, sy, 24 * u);
    halo.addColorStop(0, 'rgba(255,232,170,0.95)'); halo.addColorStop(0.4, 'rgba(255,180,90,0.35)'); halo.addColorStop(1, 'rgba(255,150,70,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(sx, sy, 24 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff4cf'; g.beginPath(); g.arc(sx, sy, 8.5 * u, 0, Math.PI * 2); g.fill();
    // sea
    let sea = g.createLinearGradient(0, HZ, 0, S);
    sea.addColorStop(0, '#26406e'); sea.addColorStop(1, '#060a18');
    g.fillStyle = sea; g.fillRect(0, HZ, S, S - HZ);
    // sun's reflection column
    const col = g.createLinearGradient(0, HZ, 0, S);
    col.addColorStop(0, 'rgba(255,214,150,0.75)'); col.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = col; g.fillRect(60 * u, HZ, 13 * u, S - HZ);
    // ridge — the near-black end of the luma range
    g.fillStyle = '#05070f';
    g.beginPath();
    g.moveTo(0, HZ); g.lineTo(0, 46 * u); g.lineTo(14 * u, 33 * u); g.lineTo(27 * u, 45 * u);
    g.lineTo(40 * u, 38 * u); g.lineTo(52 * u, HZ);
    g.closePath(); g.fill();
    // horizon — the near-white end, and a dead-straight line for the warps to bend
    g.fillStyle = '#fff6e2'; g.fillRect(0, HZ - 1 * u, S, Math.max(1, 1.6 * u));
    // crimson sail: one fully saturated red, off to the left so nothing here is symmetric
    g.fillStyle = '#e42a3a';
    g.beginPath(); g.moveTo(30 * u, 40 * u); g.lineTo(38 * u, HZ - 1 * u); g.lineTo(22 * u, HZ - 1 * u); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(29 * u, 40 * u, Math.max(1, 1.4 * u), 17 * u);
  }

  // A lattice: straight rules + rings + one diagonal. Any bend, twist or tile shows immediately.
  function paintGrid(g, S) {
    const u = S / 96;
    g.fillStyle = '#101a34'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#1d2c55';
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if ((x + y) % 2) g.fillRect(x * 16 * u, y * 16 * u, 16 * u, 16 * u);
    g.strokeStyle = '#2fd0b5'; g.lineWidth = Math.max(1, 1.2 * u);
    for (let i = 1; i < 6; i++) {
      const p = Math.round(i * 16 * u) + 0.5;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke();
    }
    g.strokeStyle = '#ffb86c'; g.lineWidth = Math.max(1, 1.6 * u);
    [16, 30, 44].forEach(function (r) { g.beginPath(); g.arc(48 * u, 48 * u, r * u, 0, Math.PI * 2); g.stroke(); });
    g.strokeStyle = '#ff3d7f'; g.lineWidth = Math.max(1.5, 3 * u); g.lineCap = 'round';
    g.beginPath(); g.moveTo(4 * u, 92 * u); g.lineTo(92 * u, 4 * u); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(8 * u, 8 * u, 11 * u, 11 * u);   // a landmark: which tile went where
  }

  // A neutral-grey displacement map with three soft blobs — mid-grey pushes nothing, the blobs push
  // in opposite directions, so Displacement Map has something to actually displace BY.
  function paintMap(g, S) {
    const u = S / 96;
    g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
    [[28, 30, 34, '255,255,255'], [68, 70, 34, '0,0,0'], [70, 24, 26, '255,64,0']].forEach(function (b) {
      const r = g.createRadialGradient(b[0] * u, b[1] * u, 0, b[0] * u, b[1] * u, b[2] * u);
      r.addColorStop(0, 'rgba(' + b[3] + ',1)'); r.addColorStop(1, 'rgba(' + b[3] + ',0)');
      g.fillStyle = r; g.beginPath(); g.arc(b[0] * u, b[1] * u, b[2] * u, 0, Math.PI * 2); g.fill();
    });
  }

  // The surface every card sits on. It used to be a flat rect plus a big grey ellipse (there to give
  // the glows some luma to work with) — but at card size that ellipse reads as a stray grey slab
  // crossing the tile. A quiet gradient does the same job without looking like a bug.
  function paintBackdrop(g, S) {
    const lg = g.createLinearGradient(0, 0, S, S);
    lg.addColorStop(0, '#2b3852'); lg.addColorStop(0.55, '#1d2638'); lg.addColorStop(1, '#11161f');
    g.fillStyle = lg; g.fillRect(0, 0, S, S);
    const hl = g.createRadialGradient(S * 0.3, S * 0.22, 0, S * 0.3, S * 0.22, S * 0.7);
    hl.addColorStop(0, 'rgba(120,150,200,0.18)'); hl.addColorStop(1, 'rgba(120,150,200,0)');
    g.fillStyle = hl; g.fillRect(0, 0, S, S);
  }

  function paintKeyshot(g, S) {
    g.fillStyle = '#18c454'; g.fillRect(0, 0, S / 2, S);
    const gr = g.createLinearGradient(S / 2, 0, S, S);
    gr.addColorStop(0, '#8fa3c7'); gr.addColorStop(1, '#26314a');
    g.fillStyle = gr; g.fillRect(S / 2, 0, S / 2, S);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(S / 2, S / 2, S * 0.18, 0, Math.PI * 2); g.fill();
  }

  // ---- sample scenes (built lazily once; module-private — never touch FM.scene/storage) ----
  // Content is deliberately OFF-CENTRE and asymmetric: centred symmetric content makes
  // mirror/kaleidoscope no-ops, and pure-dark/pure-white kills the glows and grades.
  let samples = null;
  function mkShape(props) { return FM.makeLayer('shape', Object.assign({ start: 0, duration: 2 }, props)); }
  // An image layer backed by a canvas we paint ourselves. FM.media is keyed by LAYER ID and holds
  // only live objects (nothing enumerates it, nothing serializes it), so these '_fxthumb*' entries
  // sit alongside real media without ever reaching storage or export.
  function mkArt(id, painter, S, x, y) {
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    painter(c.getContext('2d'), S);
    FM.media.set(id, { kind: 'image', el: c, width: S, height: S, duration: 0 });
    const l = FM.makeLayer('image', { x: x, y: y, start: 0, duration: 2 });
    l.id = id;
    return l;
  }
  function ensureSamples() {
    if (samples) return;
    // Layer arrays are TOP-first (renderScene draws from the end of the array up), so bg goes last.
    const bg  = () => mkArt('_fxthumbBack', paintBackdrop, SIZE, 48, 48);
    const hero = mkShape({ shape: 'ellipse', shapeW: 46, shapeH: 46, fill: '#2fd0b5', x: 44, y: 44 });
    const dot  = mkShape({ shape: 'ellipse', shapeW: 12, shapeH: 12, fill: '#ffb86c', x: 74, y: 28 });          // makes warps/displacement legible
    const txt  = FM.makeLayer('text', { text: 'Abc', fontSize: 40, color: '#e8ecf4', x: 48, y: 48, start: 0, duration: 2 });
    // CARD offset: 64px art centred at 46,44 leaves a 14-16px margin all round, so a stroke, a drop
    // shadow or a 3D rotation still has somewhere to land inside the tile.
    samples = {
      ball:     { layers: [dot, hero, bg()], heroIdx: 1 },
      photo:    { layers: [mkArt('_fxthumbPhoto', paintPhoto, SIZE, 48, 48), bg()], heroIdx: 0 },
      card:     { layers: [mkArt('_fxthumbCard', paintPhoto, 64, 46, 44), bg()], heroIdx: 0 },
      grid:     { layers: [mkArt('_fxthumbGrid', paintGrid, SIZE, 48, 48), bg()], heroIdx: 0 },
      gridcard: { layers: [mkArt('_fxthumbGridC', paintGrid, 64, 46, 44), bg()], heroIdx: 0 },
      text:     { layers: [txt, bg()], heroIdx: 0 },
      keyshot:  { layers: [mkArt('_fxthumb', paintKeyshot, SIZE, 48, 48), bg()], heroIdx: 0 },
      // A plain shape over the landscape: for Copy Background, whose whole job is to pull the
      // layers UNDERNEATH into the layer, so the tile has to have something worth pulling in.
      backdrop: { layers: [mkShape({ shape: 'rect', shapeW: 54, shapeH: 54, fill: '#2fd0b5', x: 46, y: 44 }), mkArt('_fxthumbPhoto', paintPhoto, SIZE, 48, 48)], heroIdx: 0 },
    };
  }

  /* Which subject demonstrates each effect. A CATEGORY default gets most of them right — tonal
   * families want the photo, geometric ones want the lattice — and SUBJECT_OF names every effect
   * whose own behaviour disagrees with its category. Anything not listed falls to its category. */
  const SUBJECT_BY_CATEGORY = {
    color: 'photo', blur: 'photo', proc: 'photo', stylize: 'photo', drawing: 'photo', other: 'photo',
    // Fading needs something to fade AGAINST: on a full-frame subject a blink is just a blank tile.
    opacity: 'card',
    distort: 'grid',
    // Move and 3D both need an ASYMMETRIC subject with an edge: a round ball cannot show Spin,
    // Swing or Pulse at all (a rotated circle is the same circle), and a 3D solid textured with a
    // flat colour is a silhouette rather than a form.
    move: 'card', threed: 'card',
    repeat: 'card', matte: 'card', text: 'text',
  };
  const SUBJECT_OF = {
    // Edge/alpha work: the effect happens at the layer's BORDER, so the tile has to show a border
    // and some backdrop outside it. A full-frame subject would push the whole thing off-tile.
    glow: 'card', softglow: 'card', darkglow: 'card', lightglow: 'card', edgeglow: 'card',
    innerglow: 'card', stroke: 'card', dropshadow: 'card', longshadow: 'card', radialshadow: 'card',
    smoothedges: 'card', roughenedges: 'card', smoothbevel: 'card', roundcorners: 'card', electricedges: 'card',
    // Particles stream OUT of the emitter, so a small compact emitter reads; a full-frame one just
    // sprays from everywhere at once.
    particles: 'ball',
    liquidglass: 'card', mattefringe: 'card',
    // Matte Choker eats or grows the alpha. On a rectangle that is just a slightly different
    // rectangle; on letters you can watch the shape thicken, which is the whole point.
    mattechoker: 'text',
    // Remove Object needs something worth removing: a rectangle punched out of the landscape and
    // filled from its surroundings.
    touchup: 'photo',
    // Copy Background is the one effect whose subject must be BLANK: the point is that the layer
    // fills with whatever is underneath, so the backdrop has to be the interesting half.
    copybg: 'backdrop',
    // Whole-frame framing: these draw ON the comp edge, so the subject must reach it.
    letterbox: 'photo', border: 'photo', vignette: 'photo', tiltshift: 'photo',
    // Halation blooms OUT of the blown highlight, so the halo needs somewhere to land.
    halation: 'card',
    // Frame Stutter is shown by an orbit stepping instead of gliding, and an orbiting full-frame
    // subject just swings its own edges through the tile.
    framestutter: 'card',
    // Keying removes a colour/brightness that has to actually be in the picture.
    chromakey: 'keyshot', lumakey: 'keyshot',
    // Geometry that reads better on a real picture than on an abstract lattice: these re-tile or
    // re-colour the content rather than bending it, so what matters is recognising the content.
    mirror: 'photo', pixelate: 'photo', chromaticaberration: 'photo', hextiles: 'photo', glass: 'photo',
    // These two throw ghosts/streaks OUTSIDE the layer, which only shows if there is an outside.
    rgbsplit: 'card', innerblur: 'card', motionblur: 'card',
  };
  function subjectFor(type, reg) {
    // appliesTo is a hard gate, not a preference: a text effect on an image layer renders nothing.
    if (reg && reg.appliesTo === 'text') return 'text';
    if (reg && reg.appliesTo === 'media') return 'keyshot';
    return SUBJECT_OF[type] || SUBJECT_BY_CATEGORY[(reg && reg.category) || ''] || 'photo';
  }

  // Per-type sample/param overrides (extensible). Receives (layers, hero) of the fresh clone.
  // Progress-driven effects (wipes/dissolves/counter) default to a STATIC midpoint param — keyframe
  // it 0→1 so the thumbnail sweeps instead of freezing half-wiped (effect params are evalProp'd).
  function kf01(key) {
    return function (layers, hero) { hero.effects[0].params[key] = { kf: [{ t: 0, v: 0, e: 'linear' }, { t: 1.65, v: 1, e: 'linear' }] }; };
  }
  const OVERRIDES = {
    // Footage blur reads motion INSIDE the clip and deliberately ignores the layer's own transform —
    // so keyframing the hero across the frame proves nothing. Put a Drift UNDERNEATH it in the stack
    // instead: drift moves the content within the plate, which is exactly what this blur smears.
    // (Strips render in ascending t, which its two-slot plate cache requires.)
    motionflow: function (layers, hero) {
      // Orbit rather than Drift: drift is unbounded (at a speed big enough to smear, the content is
      // off-frame before the strip ends), an orbit keeps moving without ever leaving the tile.
      const mv = FM.fxRegistry.makeInstance('orbit');
      if (mv) { mv.params.radius = 15; mv.params.speed = 3; hero.effects.unshift(mv); }
    },
    // Frame Stutter has nothing to hold unless something is moving, and it only reads as STEPPY
    // next to motion that would otherwise be smooth. Same inner-orbit trick as the footage blur.
    framestutter: function (layers, hero) {
      const mv = FM.fxRegistry.makeInstance('orbit');
      if (mv) { mv.params.radius = 17; mv.params.speed = 1.4; hero.effects.unshift(mv); }
      hero.effects[hero.effects.length - 1].params.rate = 4;
    },
    // Copy Background aligns the copied backdrop to the COMP, so a straight rectangle sitting on
    // that backdrop is invisible — the tile just looks like the untouched picture. Rotating the
    // layer rotates the copy with it, which is what makes "this shape now holds what's behind it"
    // readable in one frame.
    copybg: function (layers, hero) {
      hero.transform = Object.assign({}, hero.transform, { rotation: 16 });
    },
    wipe: kf01('progress'), radialwipe: kf01('progress'), dissolve: kf01('amount'), blockdissolve: kf01('amount'),
    counter: kf01('progress'), textprogress: kf01('progress'),
    // Defaults tuned for a 1080p comp fling the hero clean off a 96px frame (drift 120px/s, orbit
    // radius 80) — every probe/strip frame showed empty background, so both cached as static no-ops.
    // Scale the motion to the thumb: a visible drift / a tight on-screen orbit.
    drift: function (layers, hero) { hero.effects[0].params.x = 26; hero.effects[0].params.y = 14; },
    orbit: function (layers, hero) { hero.effects[0].params.radius = 14; hero.effects[0].params.speed = 0.7; },
    // Same 1080p-vs-96px problem, same fix: shake's 120px throw hurls the subject clean out of the
    // tile, mirror tile's 140px cell is larger than the whole frame (so it never tiles), and the
    // particle defaults (320px/s, 400 gravity) empty the frame before the strip's second frame.
    shake: function (layers, hero) { hero.effects[0].params.amount = 13; },
    wiggle: function (layers, hero) { hero.effects[0].params.amount = 12; },
    mirrortile: function (layers, hero) { hero.effects[0].params.size = 26; },
    rasterextrude: function (layers, hero) { hero.effects[0].params.depth = 15; },
    particles: function (layers, hero) {
      const p = hero.effects[0].params;
      p.speed = 52; p.gravity = 60; p.sizeStart = 7; p.sizeEnd = 2; p.rate = 90; p.lifetime = 1.6;
    },
    /* Spatial-frequency defaults are set for a real comp, and a 96px tile is a tenth of one. Left
     * alone these do not render "a small version of the effect" — they render NOTHING: a 120px tile
     * grid has a single tile so Tile Shift / Tile Rotate are exact no-ops, and a 38px wavelength is
     * a 239px period, so Wave shows less than half of one hump. Shorten the period, keep the look. */
    wave: function (l, h) { h.effects[0].params.wavelength = 14; h.effects[0].params.amount = 6; },
    ripple: function (l, h) { h.effects[0].params.wavelength = 6; h.effects[0].params.amount = 6; },
    curl: function (l, h) { h.effects[0].params.wavelength = 8; h.effects[0].params.amount = 1; },
    tileshift: function (l, h) { h.effects[0].params.size = 24; },
    tilerotate: function (l, h) { h.effects[0].params.size = 24; },
    turbulentdisplace: function (l, h) { h.effects[0].params.amount = 10; h.effects[0].params.scale = 22; },
    fractalridges: function (l, h) { h.effects[0].params.scale = 20; },
    glass: function (l, h) { h.effects[0].params.amount = 4; },
    // A horizontal flip of a picture you have never seen is not a flip — it is just a picture.
    // Vertical is the same effect and reads instantly, because the sky ends up underneath.
    fliplayer: function (l, h) { h.effects[0].params.mode = 1; },
    glowscan: function (l, h) { h.effects[0].params.width = 26; },
    linstreaks: function (l, h) { h.effects[0].params.length = 16; },
    grid: function (l, h) { h.effects[0].params.size = 16; },
    // Tiles defaults to Extend, which keeps the clip full size and fills OUTWARD — on a 64px card in
    // a 96px frame there is barely any outward left, so the tile looks like an untouched picture.
    // Grid is the layout that says "repeated" at a glance; the panel still opens on Extend.
    tiles: function (l, h) { const p = h.effects[0].params; p.mode = 1; p.count = 3; p.gap = 4; },
    // Both of these work on the alpha edge, and their defaults are a 4px feather / a 6px bevel —
    // real values on a real comp, invisible on a 64px card. Show the shape of what they do.
    smoothedges: function (l, h) { h.effects[0].params.radius = 12; },
    smoothbevel: function (l, h) { h.effects[0].params.depth = 17; h.effects[0].params.strength = 2; },
    // Both displacement effects fall back to self-displacing when no Map layer is chosen, which
    // reads as "smeared" rather than "displaced BY something". Give them a real map — mid-grey
    // (no push) with three soft blobs — and dial the throw down to the tile.
    displacemap: function (layers, hero) {
      layers.push(mkArt('_fxthumbMap', paintMap, SIZE, 48, 48));
      hero.effects[0].params.source = '_fxthumbMap'; hero.effects[0].params.amount = 14;
    },
    polardisplace: function (layers, hero) {
      layers.push(mkArt('_fxthumbMap', paintMap, SIZE, 48, 48));
      hero.effects[0].params.source = '_fxthumbMap'; hero.effects[0].params.radius = 12;
    },
    // Legibility twins: solidmatte(white) was pixel-identical to threshold(0.5) — both a white
    // silhouette. A pink matte reads as "solid fill"; threshold keeps its honest white/black split.
    solidmatte: function (layers, hero) { hero.effects[0].params.color = '#ff3d7f'; },
    // colorbalance's default warm push landed on the same pixels as temperature(+40). Cool it instead —
    // still representative (it's a per-channel balance) and the two thumbs stop being twins.
    colorbalance: function (layers, hero) { hero.effects[0].params.red = -55; hero.effects[0].params.blue = 65; },
    // Same twins problem: Duotone (#241a52→#ff9e5e) and Gradient Map (#241a52→#ffb86c) run identical
    // luma-ramp maths from near-identical colours, so their tiles collide. Give the map a cold-to-warm
    // ramp of its own; Duotone keeps the defaults, since ITS name is the one about two colours.
    gradientmap: function (l, h) { h.effects[0].params.color = '#07263f'; h.effects[0].params.color2 = '#8df5a0'; },
    // Vibrance protects already-saturated pixels, so at its default it moves the photo by ~6% — true
    // to the effect and invisible in a tile. Run it at the top of its range instead.
    vibrance: function (l, h) { h.effects[0].params.amount = 2; },
    // A -4px choke on a 64px rectangle is a 64px rectangle. Letters are the shape whose alpha you can
    // watch fatten, so the choke is shown spreading text rather than nudging an edge.
    mattechoker: function (l, h) { h.effects[0].params.choke = 7; },
    // Both of these overflow a 96px tile at the sample's 40px font: 'Abc' + 24px tracking is ~141px
    // wide, and MM:SS:FF is eight glyphs at ~155px. Shorter tracking, shorter clock.
    textspacing: function (l, h) { h.effects[0].params.spacing = 9; },
    timecode: function (l, h) { h.effects[0].params.mode = 2; },
    // Remove Object's default rectangle lands on empty sky, so nothing looks removed. Put it over
    // the sun — the one thing in the picture you notice is missing.
    touchup: function (l, h) {
      const p = h.effects[0].params;
      p.x = 57; p.y = 15; p.w = 24; p.h = 25; p.feather = 5;
    },
  };

  // Fresh scene per type: shallow-clone the layer list (plain objects) and give the TARGET layer
  // its own effects array — never share an effects array between types.
  // `inst` (optional) = a ready effect instance (preset previews); `span` extends layer/project
  // duration when a preset's keyframes run past the default 2s sample.
  function sceneFor(type, inst, span) {
    const reg = FM.fxRegistry.get(type);
    const base = samples[subjectFor(type, reg)] || samples.ball;
    const layers = base.layers.map(l => Object.assign({}, l));
    if (span && span > 2) layers.forEach(l => { l.duration = span + 0.5; });
    const target = layers[base.heroIdx];
    const made = inst || FM.fxRegistry.makeInstance(type);
    target.effects = made ? [made] : [];
    if (!inst) { const ov = OVERRIDES[type]; if (ov) ov(layers, target); }
    const proj = (span && span > 2) ? Object.assign({}, PROJ, { duration: span + 0.5 }) : PROJ;
    return { project: proj, layers: layers };
  }

  // ---- generation ----
  const cache = new Map();    // type -> { kind:'static', frame } | { kind:'anim', frames[] }
  const warned = {};
  let fallbackEntry = null;   // plain sample frame, painted when an effect throws

  function probeDiffers(scene, base, t) {
    renderFrame(scene, t);
    const d = wctx.getImageData(0, 0, SIZE, SIZE).data;
    for (let i = 0; i < base.length; i += 16) { if (Math.abs(base[i] - d[i]) > 3) return true; }
    return false;
  }
  function fallback() {
    if (!fallbackEntry) {
      try { renderFrame({ project: PROJ, layers: samples.ball.layers }, 0.2); fallbackEntry = { kind: 'static', frame: snap() }; }
      catch (e) {
        const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE;
        const x = c.getContext('2d'); x.fillStyle = PROJ.background; x.fillRect(0, 0, SIZE, SIZE);
        fallbackEntry = { kind: 'static', frame: c };
      }
    }
    return fallbackEntry;
  }
  function generate(type) {
    try {
      const scene = sceneFor(type);
      // Animated auto-detect: probe frames in ASCENDING t (temporal effects keep state). Two probes
      // 0.5s apart PLUS one 1s apart, so 1Hz/2Hz periodic effects (blink, pulse) can't alias to "static".
      renderFrame(scene, 0.2);
      const d0 = wctx.getImageData(0, 0, SIZE, SIZE).data;
      const still = snap();
      if (!probeDiffers(scene, d0, 0.7) && !probeDiffers(scene, d0, 1.2)) return { kind: 'static', frame: still };
      renderFrame(scene, 0);   // warm-up so temporal effects (motionflow) enter the strip with state
      const frames = [];
      for (let i = 0; i < FRAMES; i++) { renderFrame(scene, 0.15 + i * (1.5 / FRAMES)); frames.push(snap()); }
      return { kind: 'anim', frames: frames };
    } catch (e) {
      // A broken effect must never break the browser — show the plain sample instead.
      if (!warned[type]) { warned[type] = 1; console.warn('fx-thumbs: preview failed for "' + type + '"', e); }
      return fallback();
    }
  }
  // Preset previews always render an animated strip spanning the preset's own duration (its
  // keyframes replay anchored at 0, exactly like applying it to a clip that starts at 0).
  function generatePreset(preset) {
    try {
      const span = Math.min(3, Math.max(0.9, preset.dur || 0));
      const inst = FM.effectPresets ? FM.effectPresets.makeInstance(preset, 0) : null;
      if (!inst) return fallback();
      // Presets carry project-scale px values (a 700px slam) — on a 96px sample the hero would just
      // vanish off-frame. Scale px-unit params to the thumb; everything else (°, %, 0-1) is scale-free.
      const reg = FM.fxRegistry.get(preset.fx);
      (reg ? reg.params : []).forEach(function (p) {
        if (p.unit !== 'px') return;
        const v = inst.params[p.key];
        if (typeof v === 'number') inst.params[p.key] = v * 0.2;
        else if (v && Array.isArray(v.kf)) v.kf.forEach(function (k) { k.v = (k.v || 0) * 0.2; });
      });
      const scene = sceneFor(preset.fx, inst, span);
      renderFrame(scene, 0);   // warm-up for temporal effects
      const frames = [];
      for (let i = 0; i < FRAMES; i++) { renderFrame(scene, 0.001 + i * (span / FRAMES)); frames.push(snap()); }
      return { kind: 'anim', frames: frames };
    } catch (e) {
      if (!warned['p:' + preset.id]) { warned['p:' + preset.id] = 1; console.warn('fx-thumbs: preset preview failed for "' + preset.id + '"', e); }
      return fallback();
    }
  }

  // ---- shared animation ticker (one interval repaints every live animated tile) ----
  const live = new Map();     // canvasEl -> frames[] (dropped once the canvas leaves the DOM)
  let ticker = 0, frameIdx = 0;
  function tick() {
    frameIdx++;
    live.forEach(function (frames, cv) {
      if (!cv.isConnected) { live.delete(cv); return; }
      cv.getContext('2d').drawImage(frames[frameIdx % frames.length], 0, 0);
    });
    if (!live.size) { clearInterval(ticker); ticker = 0; }
  }
  function paint(cv, entry) {
    if (entry.kind === 'anim') {
      live.set(cv, entry.frames);
      cv.getContext('2d').drawImage(entry.frames[frameIdx % entry.frames.length], 0, 0);
      if (!ticker) ticker = setInterval(tick, TICK_MS);
    } else {
      live.delete(cv);   // a recycled tile may previously have shown an animated type
      cv.getContext('2d').drawImage(entry.frame, 0, 0);
    }
    cv.classList.add('ready');
  }

  // ---- generation queue: at most ONE effect per rAF slice (a full strip counts as one), so
  // ~20 visible tiles stream in without ever janking the browser UI ----
  const pendingQ = new Map();   // cacheKey -> [canvasEl,…] waiting (dedup: many tiles, one generation)
  const presetByKey = new Map();   // 'p:<id>' -> preset object awaiting generation
  let queue = [], raf = 0;
  function schedule() { if (!raf && queue.length) raf = requestAnimationFrame(pump); }
  function pump() {
    raf = 0;
    const key = queue.shift();
    if (key != null) {
      const pre = presetByKey.get(key);
      const entry = cache.get(key) || (pre ? generatePreset(pre) : generate(key));
      cache.set(key, entry);
      presetByKey.delete(key);
      const ws = pendingQ.get(key) || [];
      pendingQ.delete(key);
      ws.forEach(function (cv) { if (cv._fxType === key) paint(cv, entry); });   // skip tiles re-mounted to another key meanwhile
    }
    schedule();
  }
  // Shared mount plumbing: size the canvas, paint from cache or join the generation queue.
  function mountKey(cv, key, preset) {
    if (!FM.renderScene || !FM.fxRegistry || !FM.makeLayer) {   // compositor/registry not loaded — nothing to render with
      if (!warned._init) { warned._init = 1; console.warn('fx-thumbs: FM.renderScene/fxRegistry missing'); }
      return;
    }
    ensureSamples();
    if (cv.width !== SIZE) cv.width = SIZE;
    if (cv.height !== SIZE) cv.height = SIZE;
    cv._fxType = key;
    const hit = cache.get(key);
    if (hit) { paint(cv, hit); return; }
    if (preset) presetByKey.set(key, preset);
    let ws = pendingQ.get(key);
    if (!ws) { pendingQ.set(key, ws = []); queue.push(key); }
    if (ws.indexOf(cv) < 0) ws.push(cv);
    schedule();
  }

  FM.fxThumbs = {
    /* Take ownership of a tile canvas: size its backing store, paint (now if cached, else queued),
     * add class 'ready' on first paint, and keep repainting animated types until it leaves the DOM. */
    mount: function (cv, type) { mountKey(cv, type, null); },
    /* Same contract for a PRESET's live preview (cache keyed by preset id). */
    mountPreset: function (cv, preset) { if (preset && preset.id) mountKey(cv, 'p:' + preset.id, preset); },
    /* Halt the ticker + pending generation (cache retained) — call when the browser closes. */
    stopAll: function () {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      queue.length = 0; pendingQ.clear(); presetByKey.clear();
      if (ticker) { clearInterval(ticker); ticker = 0; }
      live.clear();
    },
  };
})(window.FM);
