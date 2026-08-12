/* FreeMotion — Add-Effect browser thumbnails, LIVE-rendered (no image assets).
 * Each tile's canvas gets the REAL effect applied to a tiny module-private sample scene via
 * FM.renderScene (the compositor is scene-agnostic — same trick as the test harness). Static
 * effects cache one frame; effects that move (shake, wipes, glowscan…) are auto-detected
 * by diffing two probe frames and cache a 10-frame strip looped by ONE shared ticker.
 * Every effect names the SUBJECT that demonstrates it (see SUBJECT_OF) rather than sharing one
 * generic sample — a single subject cannot show 177 different things.
 * Contract with fx-browser.js: FM.fxThumbs.mount(canvasEl, effectType) + FM.fxThumbs.stopAll().
 * The SCENE is 96 units; the RASTER is 2x that since v6.16 (see R) because the tiles are displayed
 * at up to 154 CSS px on a DPR-2 screen. Cache is lazy and kept for the whole session — about 23MB
 * after a realistic browse of ~60 effects, ~72MB if you open every one of the 195. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const SIZE = 96, FRAMES = 10, TICK_MS = 90;   // 10 frames @ ~11fps ≈ 0.9s loop
  const PROJ = { width: SIZE, height: SIZE, fps: 30, duration: 2, background: '#151a24' };
  /* RENDER SCALE (v6.16). Ezra: "the quality of the effect previews need to be better, rn it looks
   * shitty." They were being drawn at 96² and then blown up — measured live: a tile's thumb box is
   * 77 CSS px on a 375px phone and 154 on PC, a featured card's is 148, so on a DPR-2 screen a 96px
   * bitmap was upscaled between 1.6x and 3.2x.
   *
   * SIZE is the SCENE — 96 project units — and it must NOT change. Every demo-only value in OVERRIDES
   * below is a length measured against a 96-unit frame, so moving SIZE would silently re-tune all 195
   * thumbnails at once. R is how many DEVICE pixels each of those units gets. The scene is identical
   * at any R; only the raster is finer. Nothing has to be passed anywhere: renderScene derives the
   * scale itself from canvas.width / project.width and stamps it as __fmRS.
   *
   * R = 2 and not 3: at 288² the all-effects worst case is ~163MB of cached canvas, which is not a
   * thing to do to a phone. At 2 it is ~72MB for all 195 and ~23MB for a realistic browse, against
   * ~6MB before — and the cache is lazy, so nothing is paid for an effect you never scroll past.
   * Cost measured over 40 effects x 3 renders: 1.72 → 1.78 ms/effect, about 3%. The per-pixel kernels
   * still run on plate-sized buffers (plateScale stays capped at 1), which is why it is nearly free.
   *
   * This only became possible once compositor.js grew renderScale(): with the old code every
   * ctx.filter length was divided by __fmRS, so simply enlarging the canvas made blur 38% weaker and
   * glow 33% weaker than the effect really is. */
  const R = 2, PX = SIZE * R;

  /* ---- Ezra's photographs --------------------------------------------------------------------
   * Fourteen of his own shots (fx-art/*.jpg, 320² each — tiles are 96 and cards 150, so 2x on both).
   * A real photograph shows what an effect DOES in a way drawn art cannot: a grade needs a real
   * tonal range, a blur needs real detail to destroy, a warp needs real straight lines to bend.
   *
   * The parametric art below is NOT removed and is not dead: it is what a tile paints until the JPEG
   * has decoded, and what it keeps painting if the file never arrives (a PWA opened offline before
   * fx-art/ was ever fetched). So the browser is never blank and never depends on an asset.
   * -------------------------------------------------------------------------------------------- */
  const PHOTOS = {};
  function photo(key) {
    let im = PHOTOS[key];
    if (im) return im;
    im = PHOTOS[key] = new Image();
    im.decoding = 'async';
    im.addEventListener('load', photosChanged);
    im.src = 'fx-art/' + key + '.jpg?v=1';
    return im;
  }
  function photoArt(key, fallback) {
    return function (g, S) {
      const im = photo(key);
      if (im.complete && im.naturalWidth > 0) { g.drawImage(im, 0, 0, S, S); return; }
      fallback(g, S);
    };
  }
  // Every photo, requested the moment the browser opens. Without this a photo is only fetched when
  // the first tile that needs it is built — which is always AFTER that tile has already painted its
  // fallback, so every tile visibly flashed drawn art and then swapped. 243 KB for the set. (#66)
  const ALL_PHOTOS = ['city', 'ramp', 'dusk', 'towers', 'dog', 'sunpath', 'bush', 'shore', 'bay',
                      'run', 'clouds', 'figures', 'cat', 'pair'];
  let preloaded = false;
  function preloadArt() { if (preloaded) return; preloaded = true; ALL_PHOTOS.forEach(photo); }

  // A decoded photo makes every tile that used it stale — the sample scene baked the fallback art
  // into a canvas, and the frame cache baked that. Coalesced, because fourteen files land at once.
  let photoSettle = 0;
  function photosChanged() {
    if (photoSettle) return;
    photoSettle = setTimeout(function () {
      photoSettle = 0;
      const live = [].slice.call(document.querySelectorAll('canvas.fxb-thumb-cv')).filter(cv => cv._fxType && cv.isConnected);
      FM.fxThumbs.stopAll();                                    // cancels the ticker, queue and rAF
      if (samples) Object.keys(samples).forEach(k => { if (k.indexOf(':') >= 0) delete samples[k]; });
      cache.clear();
      live.forEach(cv => mountKey(cv, cv._fxType, null));
    }, 80);
  }

  // ---- render surface (one shared offscreen canvas) ----
  const work = document.createElement('canvas');
  work.width = PX; work.height = PX;   // the RASTER is R x the scene — see R above
  const wctx = work.getContext('2d', { willReadFrequently: true });
  function renderFrame(scene, t) { wctx.setTransform(1, 0, 0, 1, 0, 0); FM.renderScene(wctx, scene, t); }
  function snap() {   // copy the work canvas into a fresh cacheable frame
    const c = document.createElement('canvas'); c.width = PX; c.height = PX;
    c.getContext('2d').drawImage(work, 0, 0);
    return c;
  }

  /* ---- SUBJECTS ------------------------------------------------------------------------------
   * A thumbnail is only worth showing if you can tell WHAT THE EFFECT DOES from the tile alone.
   * One generic subject cannot do that for 193 effects: a flat teal ball has no tonal range (so
   * Brightness, Contrast and Saturation all render the identical ball), no straight lines (so every
   * warp is just a slightly different ball) and no texture (so the 3D solids are all one blob).
   *
   * So the subject is chosen per SECTION: every category of the Add-Effect browser gets ONE piece
   * of art built to demonstrate that family, and a section reads as one worked example (see
   * SECTION_ART). SUBJECT_OF then names every effect whose own behaviour disagrees with its section.
   * Two FORMS of each section's art:
   *   full:<cat>  the art filling the 96px frame — anything tonal, geometric or full-frame.
   *   card:<cat>  the same art at 64px on the backdrop — content AND a hard rectangular edge, for
   *               effects that act on the layer's BORDER (stroke, shadow, corners, repeat, 3D) or
   *               that need somewhere outside the layer to throw glows, shadows and ghosts.
   * Fixed subjects that no section default can replace:
   *   ball     flat teal ellipse + orange dot on the backdrop. Clean silhouette, no interior — right
   *            only when the effect is about the layer's ALPHA/outline or about MOVING a small object.
   *   text     a text layer. Only the six effects that rewrite/space a string.
   *   keyshot  half chroma-green, half gradient, white circle across the seam. Keying only.
   *   backdrop a plain shape over the landscape, for the two effects that read the layers BELOW.
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

  /* --- one piece of art per section ---------------------------------------------------------- */

  // BLUR. A blur is only visible if there was detail to lose, and the landscape is all smooth
  // gradients — Sharpen and Unsharp Mask measured 12% and 20% of pixels moved on it, i.e. nothing.
  // A resolution star + a 1px comb are the two things that make "how much detail survived" legible.
  function paintDetail(g, S) {
    const u = S / 96;
    g.fillStyle = '#0b101c'; g.fillRect(0, 0, S, S);
    const cx = 42 * u, cy = 40 * u;
    g.fillStyle = '#eef2fa';
    for (let i = 0; i < 24; i += 2) {                       // 12 wedges converging to a point
      g.beginPath(); g.moveTo(cx, cy);
      g.arc(cx, cy, 40 * u, i * Math.PI / 12, (i + 1) * Math.PI / 12); g.closePath(); g.fill();
    }
    g.fillStyle = '#0b101c'; g.fillRect(0, 76 * u, S, S - 76 * u);
    g.fillStyle = '#9fe8ff';                                // the highest frequency a 96px tile holds
    for (let x = 0; x < 96; x += 2) g.fillRect(Math.round(x * u), 79 * u, Math.max(1, u), 10 * u);
    // specular points: a lens blur turns these into aperture discs, the streak blurs into trails
    [[80, 14, '#fff6d0'], [88, 30, '#ff5ea8'], [12, 88, '#8dff9f']].forEach(function (p) {
      g.fillStyle = p[2]; g.beginPath(); g.arc(p[0] * u, p[1] * u, 2.6 * u, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = '#ff8b3d'; g.fillRect(68 * u, 60 * u, 24 * u, 12 * u);   // an edge for a smear to drag
  }

  // PROCEDURAL. Everything in this section PAINTS its own pattern over the layer, and a busy picture
  // underneath fights it. A quiet plate with one ring and one block is enough to tell plate from
  // pattern, and dark enough that clouds, rays, lightning and starfields read as added light.
  function paintPlate(g, S) {
    const u = S / 96;
    // Quiet, but with the FULL luma range corner to corner: Posterize, Threshold, Dither and Noise
    // all measure their strength against the range they are given, and a uniformly dark plate makes
    // every one of them look like it did nothing.
    const lg = g.createLinearGradient(0, 0, S, S);
    lg.addColorStop(0, '#cfe0f2'); lg.addColorStop(0.4, '#2f6a86'); lg.addColorStop(1, '#04060b');
    g.fillStyle = lg; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1, 1.4 * u);
    g.beginPath(); g.arc(44 * u, 46 * u, 26 * u, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffb347'; g.fillRect(10 * u, 10 * u, 12 * u, 12 * u);
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 68 * u, S, S - 68 * u);
  }

  // STYLIZE. A broadcast test card, because that is literally what these looks were built against:
  // hard vertical edges and flat colour for glitch / VHS / CRT / scanlines to tear, and a smooth
  // ramp plus a step wedge for dither, posterise and compression to band.
  function paintBars(g, S) {
    const u = S / 96;
    const cols = ['#e6e9ef', '#e8d44d', '#3ec9d8', '#3fb75c', '#c94bb8', '#d94141', '#3a53c4'];
    const w = S / cols.length;
    cols.forEach(function (c, i) { g.fillStyle = c; g.fillRect(i * w, 0, w + 1, 56 * u); });
    const r = g.createLinearGradient(0, 0, S, 0);
    r.addColorStop(0, '#050505'); r.addColorStop(1, '#fbfbfb');
    g.fillStyle = r; g.fillRect(0, 56 * u, S, 20 * u);
    for (let i = 0; i < 8; i++) {
      const v = Math.round(255 * i / 7);
      g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.fillRect(i * S / 8, 76 * u, S / 8 + 1, 12 * u);
    }
    g.fillStyle = '#0a0a0a'; g.fillRect(0, 88 * u, S, S - 88 * u);
    g.fillStyle = '#ff3d7f'; g.fillRect(6 * u, 90 * u, 26 * u, 4 * u);
  }

  // DRAWING & EDGE. One clean closed contour and one filled shape with a tonal interior: exactly
  // what an edge pass traces, what a bevel/stroke rides, and what a halftone or hatch screen needs.
  function paintEmblem(g, S) {
    const u = S / 96;
    const bgg = g.createLinearGradient(0, 0, 0, S);
    bgg.addColorStop(0, '#121a2c'); bgg.addColorStop(1, '#080b12');
    g.fillStyle = bgg; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#4ad7c4'; g.lineWidth = Math.max(1.5, 4 * u);
    g.beginPath(); g.arc(46 * u, 44 * u, 32 * u, 0, Math.PI * 2); g.stroke();
    const fill = g.createLinearGradient(0, 20 * u, 0, 70 * u);
    fill.addColorStop(0, '#fff2d8'); fill.addColorStop(1, '#7d5fbe');
    g.fillStyle = fill;
    g.beginPath(); g.moveTo(34 * u, 24 * u); g.lineTo(70 * u, 45 * u); g.lineTo(34 * u, 66 * u); g.closePath(); g.fill();
    g.fillStyle = '#ff8b3d'; g.fillRect(8 * u, 76 * u, 20 * u, 14 * u);
    g.fillStyle = '#e6e9ef'; g.fillRect(68 * u, 78 * u, 20 * u, 5 * u);
  }

  // MOVE / TRANSFORM. An arrow on a disc: a rotated circle is the same circle, so Spin, Swing and
  // Pulse can only be read off something that points somewhere and has a right way up.
  function paintToken(g, S) {
    const u = S / 96;
    g.fillStyle = '#12203a'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#2fd0b5'; g.beginPath(); g.arc(48 * u, 48 * u, 44 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0b1220';
    g.beginPath(); g.moveTo(48 * u, 12 * u); g.lineTo(74 * u, 62 * u); g.lineTo(48 * u, 50 * u); g.lineTo(22 * u, 62 * u); g.closePath(); g.fill();
    g.fillStyle = '#ffb347'; g.fillRect(40 * u, 72 * u, 16 * u, 8 * u);
  }

  // REPEAT. The transform-demo "F": asymmetric in BOTH axes, so a copy that has been mirrored,
  // flipped or turned is obvious the moment it lands beside the original.
  function paintMotif(g, S) {
    const u = S / 96;
    g.fillStyle = '#101827'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#f2f5fb';
    g.fillRect(28 * u, 14 * u, 12 * u, 68 * u);
    g.fillRect(28 * u, 14 * u, 42 * u, 12 * u);
    g.fillRect(28 * u, 42 * u, 30 * u, 11 * u);
    g.fillStyle = '#ff3d7f'; g.fillRect(6 * u, 6 * u, 10 * u, 10 * u);
    g.fillStyle = '#ffb347';
    g.beginPath(); g.moveTo(S, S); g.lineTo(S - 22 * u, S); g.lineTo(S, S - 22 * u); g.closePath(); g.fill();
  }

  // MATTE / MASK / KEY. A clear foreground/background split — head and shoulders, bright, against a
  // dark two-plane field — so a key, a wipe, a choke or a fill reads as "this came away from that".
  function paintSplit(g, S) {
    const u = S / 96;
    const sky = g.createLinearGradient(0, 0, 0, S);
    sky.addColorStop(0, '#1b2b4a'); sky.addColorStop(1, '#070a12');
    g.fillStyle = sky; g.fillRect(0, 0, S, S);
    g.fillStyle = '#0e1522'; g.fillRect(0, 70 * u, S, S - 70 * u);
    g.fillStyle = '#ff8f5c';
    g.beginPath(); g.arc(40 * u, 32 * u, 15 * u, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(16 * u, 92 * u); g.quadraticCurveTo(40 * u, 42 * u, 64 * u, 92 * u); g.closePath(); g.fill();
    g.fillStyle = '#ffe0c8'; g.beginPath(); g.arc(36 * u, 28 * u, 5 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3ec9d8'; g.fillRect(76 * u, 46 * u, 14 * u, 44 * u);
  }

  // OPACITY / VISIBILITY. FLAT and saturated on purpose: at 60% a photograph just looks like a
  // slightly different photograph, but a flat block visibly lets the backdrop through.
  function paintChip(g, S) {
    const u = S / 96;
    g.fillStyle = '#ff2e63'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#08d9d6'; g.beginPath(); g.arc(58 * u, 38 * u, 30 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f7f7f7'; g.fillRect(8 * u, 66 * u, 60 * u, 12 * u);
    g.fillStyle = '#252a34'; g.fillRect(8 * u, 8 * u, 22 * u, 22 * u);
  }

  // 3D. A UV checker: flat it is a checker, wrapped on a solid its squares curve — the only thing
  // that says "this is a form" rather than "this is a silhouette". The stripe and the corner block
  // keep it asymmetric, so Flip Layer is a flip rather than the same texture again.
  function paintFacet(g, S) {
    const u = S / 96, n = 4, c = S / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = ((x + y) % 2) ? '#1d2a4d' : '#f0e6d2';
      g.fillRect(x * c, y * c, c + 1, c + 1);
    }
    g.strokeStyle = '#ff3d7f'; g.lineWidth = Math.max(1.5, 3.5 * u);
    g.beginPath(); g.moveTo(2 * u, 94 * u); g.lineTo(94 * u, 2 * u); g.stroke();
    g.fillStyle = '#2fd0b5'; g.fillRect(4 * u, 4 * u, 18 * u, 18 * u);
  }

  // Category key -> the art its tiles are built from. Colour & Light keeps the landscape; every
  // other section gets art built for what that family actually does.
  /* Five sections now lead with a photograph, each chosen for what its family needs to show, with
   * the drawn art kept behind it as the pre-decode fallback:
   *   color   city   — a golden CBD sunset: crushed silhouettes, a blown sun, warm/cool separation
   *   blur    dusk   — a dense dusk cityscape: high-frequency detail a blur can visibly destroy
   *   distort towers — an aerial grid of hard straight lines, the only thing that reads as a warp
   *   stylize dog    — a real subject, so posterise/halftone happen to something recognisable
   *   other   ramp   — the cleanest colour ramp of the set
   * The other eight sections keep their drawn art on purpose: opacity needs a FLAT block (a photo at
   * 60% is just a slightly different photo), move/repeat/threed need a small asymmetric token with
   * room to travel, matte needs a defined light/dark split, and proc/drawing get drawn ON. (#66) */
  const SECTION_ART = {
    color: photoArt('city', paintPhoto), other: photoArt('ramp', paintPhoto), text: paintPhoto,
    blur: photoArt('dusk', paintDetail), distort: photoArt('towers', paintGrid), proc: paintPlate,
    stylize: photoArt('dog', paintBars),
    drawing: paintEmblem, move: paintToken, repeat: paintMotif, matte: paintSplit,
    opacity: paintChip, threed: paintFacet,
  };

  /* The remaining nine photographs, wired to the individual effects they demonstrate better than
   * their section's default. Applied ON TOP of SUBJECT_OF so the FORM already reasoned out below is
   * preserved — an effect that needs a card keeps its card, it just gets a photograph on it. (#66) */
  const PHOTO_OF = {
    sunpath: ['glow', 'softglow', 'darkglow', 'lightglow', 'edgeglow', 'lensflare', 'rays', 'lightleak', 'halation'],
    bush:    ['filmgrain', 'noise', 'blocknoise'],
    shore:   ['saturate', 'vibrance', 'hue', 'grayscale', 'duotone', 'gradientmap', 'tint'],
    bay:     ['gradientoverlay', 'iridescence'],
    run:     ['motionblur', 'motionflow'],
    clouds:  ['vignette', 'lightning'],
    figures: ['threshold', 'posterize'],
    cat:     ['pixelate', 'mosaic', 'halftone', 'halftonelines'],
    pair:    ['lumamatte', 'matchgrade', 'highlightsshadows'],
  };
  const PHOTO_SUBJECT = {};
  Object.keys(PHOTO_OF).forEach(k => PHOTO_OF[k].forEach(t => { PHOTO_SUBJECT[t] = k; }));

  /* Four effects act on PIXEL-LEVEL detail, and a photograph resampled down to a 96px tile has none
   * left to act on — which is exactly why the drawn art carries 1px specks. This is not a guess:
   * with a photo subject the suite's "no tile is indistinguishable from its subject" check failed
   * for all of them (sharpen scored mean 7.80 against a threshold of 9, unsharpmask 5.42,
   * temporaldenoise 8.41). They keep the drawn detail plate. (#66)
   * Pixel Sort belongs with them but wants the BARS, not the detail plate — it sorts along runs of
   * colour, and it scored 0.24 on the detail plate against 1.54 on a photo. */
  const DETAIL_BOUND = ['sharpen', 'unsharpmask', 'temporaldenoise'];

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

  // A matte: black hides, white keeps. A hard soft-edged disc so Luma Matte's tile reads as a CUT.
  function paintMatte(g, S) {
    g.fillStyle = '#000000'; g.fillRect(0, 0, S, S);
    const r = g.createRadialGradient(S * 0.46, S * 0.46, S * 0.12, S * 0.46, S * 0.46, S * 0.42);
    r.addColorStop(0, '#ffffff'); r.addColorStop(0.72, '#ffffff'); r.addColorStop(1, '#000000');
    g.fillStyle = r; g.fillRect(0, 0, S, S);
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
    /* The bitmap is R x the art's PROJECT size, but the media entry keeps declaring S — the
     * compositor lays this out from m.width/m.height and never looks at el.width, so it is still an
     * S x S layer in the scene. Without this the art would be a 96px picture stretched over a 192px
     * frame and the extra raster would buy nothing. Every painter here is parametric in S (u = S/96)
     * and the photographs are 320² sources, so both get genuinely sharper rather than interpolated. */
    const c = document.createElement('canvas'); c.width = S * R; c.height = S * R;
    painter(c.getContext('2d'), S * R);
    FM.media.set(id, { kind: 'image', el: c, width: S, height: S, duration: 0 });
    const l = FM.makeLayer('image', { x: x, y: y, start: 0, duration: 2 });
    l.id = id;
    return l;
  }
  // Layer arrays are TOP-first (renderScene draws from the end of the array up), so bg goes last.
  function bg() { return mkArt('_fxthumbBack', paintBackdrop, SIZE, 48, 48); }
  function ensureSamples() {
    if (samples) return;
    const hero = mkShape({ shape: 'ellipse', shapeW: 46, shapeH: 46, fill: '#2fd0b5', x: 44, y: 44 });
    const dot  = mkShape({ shape: 'ellipse', shapeW: 12, shapeH: 12, fill: '#ffb86c', x: 74, y: 28 });          // makes warps/displacement legible
    const txt  = FM.makeLayer('text', { text: 'Abc', fontSize: 40, color: '#e8ecf4', x: 48, y: 48, start: 0, duration: 2 });
    samples = {
      ball:     { layers: [dot, hero, bg()], heroIdx: 1 },
      text:     { layers: [txt, bg()], heroIdx: 0 },
      keyshot:  { layers: [mkArt('_fxthumb', paintKeyshot, SIZE, 48, 48), bg()], heroIdx: 0 },
      // A plain shape over the landscape: for Copy Background, whose whole job is to pull the
      // layers UNDERNEATH into the layer, so the tile has to have something worth pulling in.
      backdrop: { layers: [mkShape({ shape: 'rect', shapeW: 54, shapeH: 54, fill: '#2fd0b5', x: 46, y: 44 }), mkArt('_fxthumbPhoto', paintPhoto, SIZE, 48, 48)], heroIdx: 0 },
      // For DETAIL_BOUND — see above; a photo tile has no pixel-level detail left to sharpen.
      detail:   { layers: [mkArt('_fxthumbDetail', paintDetail, SIZE, 48, 48), bg()], heroIdx: 0 },
      bars:     { layers: [mkArt('_fxthumbBars', paintBars, SIZE, 48, 48), bg()], heroIdx: 0 },
    };
  }
  // 'full:<cat>' / 'card:<cat>' built on first use and kept for the session (24 small canvases).
  // CARD offset: 64px art centred at 46,44 leaves a 14-16px margin all round, so a stroke, a drop
  // shadow or a 3D rotation still has somewhere to land inside the tile.
  function sampleFor(key) {
    if (samples[key]) return samples[key];
    const cut = key.indexOf(':');
    if (cut < 0) return samples.ball;
    const form = key.slice(0, cut), cat = key.slice(cut + 1);
    // 'photo:<key>' / 'photocard:<key>' name one of Ezra's photographs directly rather than a
    // section. Same two forms, same geometry — only the art differs. (#66)
    if (form === 'photo' || form === 'photocard') {
      const pa = photoArt(cat, paintPhoto);
      const ps = (form === 'photocard')
        ? { layers: [mkArt('_fxthumbPC_' + cat, pa, 64, 46, 44), bg()], heroIdx: 0 }
        : { layers: [mkArt('_fxthumbPF_' + cat, pa, SIZE, 48, 48), bg()], heroIdx: 0 };
      samples[key] = ps;
      return ps;
    }
    const art = SECTION_ART[cat] || paintPhoto;
    const s = (form === 'card')
      ? { layers: [mkArt('_fxthumbC_' + cat, art, 64, 46, 44), bg()], heroIdx: 0 }
      : { layers: [mkArt('_fxthumbF_' + cat, art, SIZE, 48, 48), bg()], heroIdx: 0 };
    samples[key] = s;
    return s;
  }

  /* Which FORM of its section's art demonstrates each effect. The section default gets most of them
   * right, and SUBJECT_OF names every effect whose own behaviour disagrees with its section. */
  const SUBJECT_BY_CATEGORY = {
    color: 'full', blur: 'full', proc: 'full', stylize: 'full', drawing: 'full', other: 'full',
    distort: 'full',
    // Fading needs something to fade AGAINST: on a full-frame subject a blink is just a blank tile.
    opacity: 'card',
    // Move and 3D both need an ASYMMETRIC subject with an edge and room to travel, so both use the
    // card: a full-frame subject that spins or drifts just swings its own edges through the tile.
    move: 'card', threed: 'card',
    repeat: 'card', matte: 'card', text: 'text',
  };
  const SUBJECT_OF = {
    // Edge/alpha work: the effect happens at the layer's BORDER, so the tile has to show a border
    // and some backdrop outside it. A full-frame subject would push the whole thing off-tile.
    glow: 'card', softglow: 'card', darkglow: 'card', lightglow: 'card',
    innerglow: 'card', stroke: 'card', dropshadow: 'card', longshadow: 'card', radialshadow: 'card',
    // Edge Glow's headline is that it works on SHAPES and text — a tile showing a photograph would
    // say the opposite, because a photograph is the one subject the old luminance-only version
    // already handled. 'ball' is a flat-filled ellipse with clear backdrop all round it: no interior
    // luminance for Media to find, so everything in the tile comes from the layer's own outline.
    edgeglow: 'ball',
    smoothedges: 'card', roughenedges: 'card', smoothbevel: 'card', roundcorners: 'card', electricedges: 'card',
    // Particles stream OUT of the emitter, so a small compact emitter reads; a full-frame one just
    // sprays from everywhere at once.
    particles: 'ball',
    liquidglass: 'card', mattefringe: 'card',
    // Matte Choker eats or grows the alpha. On a rectangle that is just a slightly different
    // rectangle; on letters you can watch the shape thicken, which is the whole point.
    mattechoker: 'text',
    // Remove Object needs something worth removing: a rectangle punched out of the picture and
    // filled from its surroundings.
    touchup: 'full',
    // Copy Background is the one effect whose subject must be BLANK: the point is that the layer
    // fills with whatever is underneath, so the backdrop has to be the interesting half.
    // Light Wrap reads the layers UNDERNEATH, so like Copy Background its tile needs a plain shape
    // over something worth wrapping.
    copybg: 'backdrop', lightwrap: 'backdrop', magnifybg: 'backdrop',
    // Fill Behind is the exact opposite requirement to those three: it paints the space the layer is
    // NOT filling, so its tile needs a subject that stops short of the edges. The card does that —
    // and 'other' resolves the card's art to the photo, which is the one that reads as a blurred
    // wash rather than as an abstract pattern.
    fillbehind: 'card',
    // Whole-frame framing: these draw ON the comp edge, so the subject must reach it.
    letterbox: 'full', border: 'full', vignette: 'full', tiltshift: 'full',
    // Halation blooms OUT of the blown highlight, so the halo needs somewhere to land.
    halation: 'card',
    // Dispersion blows the layer AWAY, so it needs an edge to blow away from and space to go.
    dispersion: 'card',
    // Frame Stutter is shown by an orbit stepping instead of gliding, and an orbiting full-frame
    // subject just swings its own edges through the tile.
    framestutter: 'card',
    // Keying removes a colour/brightness that has to actually be in the picture.
    chromakey: 'keyshot', lumakey: 'keyshot', chromakeypro: 'keyshot',
    lumamatte: 'full', compoundblur: 'full', matchgrade: 'full',
    // The scan bar has to have somewhere to sweep, and the frozen half only reads against a live
    // half — a full-frame subject with internal motion is the only thing that shows both.
    timewarp: 'full',
    // These two throw ghosts/streaks OUTSIDE the layer, which only shows if there is an outside.
    rgbsplit: 'card', innerblur: 'card', motionblur: 'card',
  };
  DETAIL_BOUND.forEach(t => { SUBJECT_OF[t] = 'detail'; });
  SUBJECT_OF.pixelsort = 'bars';   // the stylize section's own drawn art, kept now that the section leads with a photo

  function subjectFor(type, reg) {
    // appliesTo is a hard gate, not a preference: a text effect on an image layer renders nothing.
    if (reg && reg.appliesTo === 'text') return 'text';
    if (reg && reg.appliesTo === 'media') return 'keyshot';
    const want = SUBJECT_OF[type] || SUBJECT_BY_CATEGORY[(reg && reg.category) || ''] || 'full';
    // A named photograph beats the section default for these — but only where the subject is a FORM.
    // A fixed subject (keyshot, backdrop, text) was chosen because nothing else works at all. (#66)
    const pk = PHOTO_SUBJECT[type];
    if (pk && (want === 'full' || want === 'card')) return (want === 'card' ? 'photocard:' : 'photo:') + pk;
    // 'full'/'card' are FORMS — they resolve against the section the effect lives in.
    if (want === 'full' || want === 'card') return want + ':' + ((reg && SECTION_ART[reg.category]) ? reg.category : 'color');
    return want;
  }

  // Per-type sample/param overrides (extensible). Receives (layers, hero) of the fresh clone.
  // Progress-driven effects (wipes/dissolves/counter) default to a STATIC midpoint param — keyframe
  // it 0→1 so the thumbnail sweeps instead of freezing half-wiped (effect params are evalProp'd).
  function kf01(key) {
    return function (layers, hero) { hero.effects[0].params[key] = { kf: [{ t: 0, v: 0, e: 'linear' }, { t: 1.65, v: 1, e: 'linear' }] }; };
  }
  // Tilt the hero — see the Copy Background note below for why the backdrop effects need it.
  function tilted16(layers, hero) { hero.transform = Object.assign({}, hero.transform, { rotation: 16 }); }
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
    // Same reason: a frozen half of a STILL picture looks exactly like the live half, so all you
    // would see is a bar travelling. Put motion under it and the freeze becomes the point.
    // Temporal denoise only shows itself against MOTION — it is defined by what it leaves sharp.
    // …and it is defined by what it does NOT change, so the tile also has to run it flat out.
    temporaldenoise: function (layers, hero) {
      const mv = FM.fxRegistry.makeInstance('orbit');
      if (mv) { mv.params.radius = 14; mv.params.speed = 1.2; hero.effects.unshift(mv); }
      const p = hero.effects[hero.effects.length - 1].params;
      p.strength = 1; p.threshold = 0.5; p.spatial = 6;
    },
    timewarp: function (layers, hero) {
      const mv = FM.fxRegistry.makeInstance('orbit');
      if (mv) { mv.params.radius = 16; mv.params.speed = 1.6; hero.effects.unshift(mv); }
      const fx = hero.effects[hero.effects.length - 1];
      fx.params.duration = 1.5; fx.params.loop = 1; fx.params.barwidth = 4;
    },
    // Copy Background aligns the copied backdrop to the COMP, so a straight rectangle sitting on
    // that backdrop is invisible — the tile just looks like the untouched picture. Rotating the
    // layer rotates the copy with it, which is what makes "this shape now holds what's behind it"
    // readable in one frame.
    // Magnify Background gets the same treatment for the same reason (its window has to read as a
    // window), and the tilt also separates the blown-up copy from the picture around it.
    copybg: tilted16, magnifybg: tilted16,
    wipe: kf01('progress'), radialwipe: kf01('progress'), dissolve: kf01('amount'), blockdissolve: kf01('amount'),
    counter: kf01('progress'), textprogress: kf01('progress'),
    dispersion: kf01('progress'),   // progress 0.45 frozen is half a picture; sweeping it IS the effect
    // Defaults tuned for a 1080p comp fling the hero clean off a 96px frame (drift 120px/s, orbit
    // radius 80) — every probe/strip frame showed empty background, so both cached as static no-ops.
    // Scale the motion to the thumb: a visible drift / a tight on-screen orbit.
    // Same 1080p-vs-96px problem as drift/orbit below: a 60px blur on a 96px comp smears the fill
    // into one flat colour, so the tile would show a grey border, not a blurred copy of the picture.
    fillbehind: function (layers, hero) { hero.effects[0].params.blur = 9; hero.effects[0].params.zoom = 1.3; },
    drift: function (layers, hero) { hero.effects[0].params.x = 26; hero.effects[0].params.y = 14; },
    orbit: function (layers, hero) { hero.effects[0].params.radius = 14; hero.effects[0].params.speed = 0.7; },
    // Same 1080p-vs-96px problem, same fix: shake's 120px throw hurls the subject clean out of the
    // tile, mirror tile's 140px cell is larger than the whole frame (so it never tiles), and the
    // particle defaults (320px/s, 400 gravity) empty the frame before the strip's second frame.
    shake: function (layers, hero) { hero.effects[0].params.amount = 13; },
    wiggle: function (layers, hero) { hero.effects[0].params.amount = 12; },
    mirrortile: function (layers, hero) { hero.effects[0].params.size = 26; },
    rasterextrude: function (layers, hero) { const p = hero.effects[0].params; p.depth = 34; p.darken = 0.9; },
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
    /* Scale is the usual 1080p-vs-96px correction: a 48px lattice is two cells across this frame.
     * Amount and Sharpness are the same argument one step on — measured off-vs-on against the tile's
     * own sample scene at the tile's own geometry (96 units, 192px raster), the rework's default
     * Gradient palette read 38.1 where the old grey read 41.6, because a navy-to-amber ramp sits
     * closer to the art than pure white does. 0.9 + 1.4 puts it at 49.8, above where it was, and
     * lifts the strip's own t=0.15 -> 1.5 difference from 13.5 to 22.8 so the churn is visible in a
     * 1.35s loop. Colour mode and Bands are left at their panel defaults on purpose: a tile that
     * advertises a look the effect does not open on is a lie, however good it looks. */
    fractalridges: function (l, h) { const p = h.effects[0].params; p.scale = 20; p.amount = 0.9; p.sharpness = 1.4; },
    glass: function (l, h) { h.effects[0].params.amount = 4; },
    // A horizontal flip of a picture you have never seen is not a flip — it is just a picture.
    // Vertical is the same effect and reads instantly, because the diagonal changes hands.
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
    smoothedges: function (l, h) { h.effects[0].params.radius = 20; },
    smoothbevel: function (l, h) { h.effects[0].params.depth = 17; h.effects[0].params.strength = 2; },
    // Both displacement effects fall back to self-displacing when no Map layer is chosen, which
    // reads as "smeared" rather than "displaced BY something". Give them a real map — mid-grey
    // (no push) with three soft blobs — and dial the throw down to the tile.
    // Luma Matte does nothing until a matte layer is picked — which is correct, and useless in a
    // tile. Give it one: a white disc on black, so the tile shows the picture cut to a circle.
    lumamatte: function (layers, hero) {
      layers.push(mkArt('_fxthumbMatte', paintMatte, SIZE, 48, 48));
      hero.effects[0].params.source = '_fxthumbMatte';
    },
    // Same for the other two layer-pickers: no source means no effect, which is honest and useless
    // in a tile. The matte disc doubles as a blur map (white blurs, black stays sharp).
    compoundblur: function (layers, hero) {
      layers.push(mkArt('_fxthumbMatte', paintMatte, SIZE, 48, 48));
      const p = hero.effects[0].params;
      p.source = '_fxthumbMatte'; p.invert = 1; p.radius = 9;   // sharp in the middle, soft at the edge
    },
    matchgrade: function (layers, hero) {
      layers.push(mkArt('_fxthumbGrid', paintGrid, SIZE, 48, 48));   // a cool, high-contrast reference
      hero.effects[0].params.source = '_fxthumbGrid';
    },
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
    colorbalance: function (layers, hero) { const p = hero.effects[0].params; p.red = -100; p.green = 40; p.blue = 100; },
    // Same twins problem: Duotone (#241a52→#ff9e5e) and Gradient Map (#241a52→#ffb86c) run identical
    // luma-ramp maths from near-identical colours, so their tiles collide. Give the map a cold-to-warm
    // ramp of its own; Duotone keeps the defaults, since ITS name is the one about two colours.
    gradientmap: function (l, h) { h.effects[0].params.color = '#07263f'; h.effects[0].params.color2 = '#8df5a0'; },
    // A -4px choke on a 64px rectangle is a 64px rectangle. Letters are the shape whose alpha you can
    // watch fatten, so the choke is shown spreading text rather than nudging an edge.
    mattechoker: function (l, h) { h.effects[0].params.choke = 7; },
    // Both of these overflow a 96px tile at the sample's 40px font: 'Abc' + 24px tracking is ~141px
    // wide, and MM:SS:FF is eight glyphs at ~155px. Shorter tracking, shorter clock.
    textspacing: function (l, h) { h.effects[0].params.spacing = 9; },
    timecode: function (l, h) { h.effects[0].params.mode = 2; },
    // Remove Object's default rectangle lands on empty background, so nothing looks removed. Put it
    // over the head of the matte section's figure — the one thing you notice is missing.
    touchup: function (l, h) {
      const p = h.effects[0].params;
      p.x = 26; p.y = 16; p.w = 30; p.h = 32; p.feather = 5;
    },

    /* ---- DEMO STRENGTH (thumbnail only — the real defaults are untouched) --------------------
     * 26 tiles measured as indistinguishable from their un-effected subject at 96px: either nothing
     * moved anywhere (mean < 8/255 with no pixel past 100/255), or the whole frame shifted by so
     * little that it read as the same picture (nothing past 35/255). Fixed here, along with four
     * more that were only just above the line (brightness, crosshatch, stretchseg, starfield).
     * Two causes, and both are about the tile rather than the effect:
     *   • a PIXEL length set for a real comp — Soft Glow's 100px radius is wider than this whole
     *     96px frame, so its bloom is spread too thin to see; same for Light Glow and Light Wrap.
     *   • a THRESHOLD that a small dark tile never crosses — Halation waits for 0.68 luma, Luma Key
     *     for 0.25, so on this subject they simply never fire.
     * Everything here stays inside the control's own range and stays honest about what the effect
     * does; it is the same picture the effect makes, taken far enough to see at 96 pixels. */
    halation: function (l, h) { const p = h.effects[0].params; p.threshold = 0.1; p.spread = 20; p.amount = 2; p.tightness = 0; p.knee = 1; },
    lightglow: function (l, h) { const p = h.effects[0].params; p.radius = 20; p.threshold = 18; p.amount = 1; },
    softglow: function (l, h) { const p = h.effects[0].params; p.radius = 28; p.threshold = 12; p.amount = 1; },
    bumpmap: function (l, h) { h.effects[0].params.amount = 3; },
    levels: function (l, h) { const p = h.effects[0].params; p.inblack = 80; p.inwhite = 185; p.gamma = 1.7; },
    hslbands: function (l, h) { const p = h.effects[0].params; p.sat = 100; p.lum = 34; p.range = 3; },
    tealorange: function (l, h) { h.effects[0].params.amount = 1; },
    crossprocess: function (l, h) { h.effects[0].params.amount = 1; },
    faded: function (l, h) { h.effects[0].params.amount = 1; },
    temperature: function (l, h) { h.effects[0].params.amount = 100; },
    // The three Ezra named: at their defaults all three tiles were the same landscape again.
    saturate: function (l, h) { h.effects[0].params.amount = 3; },
    contrast: function (l, h) { h.effects[0].params.amount = 2.6; },
    brightness: function (l, h) { h.effects[0].params.amount = 2.1; },
    roughenedges: function (l, h) { const p = h.effects[0].params; p.amount = 20; p.scale = 7; },
    // A 7px hatch pitch is 13 lines across the whole tile — tighten it so the screen reads as a
    // screen, and stretch a band deep enough that Stretch Segment is a stretch and not a nudge.
    crosshatch: function (l, h) { h.effects[0].params.spacing = 4; },
    stretchseg: function (l, h) { const p = h.effects[0].params; p.amount = 0.95; p.height = 44; },
    electricedges: function (l, h) { h.effects[0].params.amount = 1; },
    lumakey: function (l, h) { h.effects[0].params.threshold = 0.58; },
    // Reach/radius are comp-scale pixels: past ~45 on a 96px tile the wrap spreads so wide it fades
    // out again (measured 11.22 mean at 44/34, 6.19 at 72/60), so this is the peak, not the maximum.
    lightwrap: function (l, h) { const p = h.effects[0].params; p.intensity = 2; p.reach = 44; p.radius = 34; },
    starfield: function (l, h) { h.effects[0].params.amount = 1; },
    contourstrips: function (l, h) { h.effects[0].params.levels = 11; },
    filmgrain: function (l, h) { const p = h.effects[0].params; p.amount = 100; p.size = 3; p.color = 60; p.shadows = 100; p.highlights = 100; },
    // A black shadow on a dark backdrop is a shadow you cannot see. Keep it black (that IS the
    // default look) but pull it in close and hard so it reads as an offset edge.
    dropshadow: function (l, h) { const p = h.effects[0].params; p.distance = 26; p.softness = 10; },
    /* ---- the CELL-SIZED effects (v6.16) ---------------------------------------------------------
     * These are the only effects the 2x raster made WORSE, and it is worth writing down why, because
     * the reason is not obvious and the same trap is waiting for the next pattern effect.
     * plateScale is still capped at 1, so a per-pixel kernel runs on a 96-unit plate and that plate
     * is then scaled up to the 192px canvas. A one-pixel dither cell therefore gets bilinearly
     * stretched into a soft two-pixel blob, and when the tile is finally drawn at its display size the
     * pattern averages back towards flat. Measured: dither -56%, noise -20%, halftone -16% against
     * the same tile at 96. Everything else was untouched (blur, glow, scanlines, pixelate all 0%),
     * because they either go through ctx.filter — which renderScale now sizes correctly — or already
     * work in plate units.
     * The fix is to make the cell two plate-pixels instead of one, so it survives the up-then-down
     * trip. These are demo-only values, which is exactly what this table is for; the effect's real
     * defaults are untouched.
     * Halftone is deliberately NOT in this list. Bigger dots read as LESS effect, not more — measured
     * 16px at -46% against the old tile where the untouched 8px default is -16% — because a coarser
     * screen puts fewer, flatter dots on the same frame. Its own default is the best it gets, and a
     * 16% softening is not worth making the tile lie about what the effect looks like.
     * Dither takes scale 2 rather than 4 or 6, which measure stronger still (-27%, -23%): past two
     * plate-pixels the cell stops reading as error diffusion and starts reading as mosaic, and a
     * thumbnail that overstates the effect is the same failure as one that understates it. */
    dither: function (l, h) { h.effects[0].params.scale = 2; },
    noise: function (l, h) { const p = h.effects[0].params; p.amount = 100; p.size = 4; p.color = 45; },
    posterize: function (l, h) { h.effects[0].params.levels = 3; },
    // Vibrance protects already-saturated pixels, so at its default it moved this photo by ~6%.
    // Top of its range is all the headroom there is (Protect-highlights measured WORSE, 12.98 vs
    // 14.36) — the tile is as strong as the control allows.
    vibrance: function (l, h) { h.effects[0].params.amount = 2; },
  };

  // Fresh scene per type: shallow-clone the layer list (plain objects) and give the TARGET layer
  // its own effects array — never share an effects array between types.
  // `inst` (optional) = a ready effect instance (preset previews); `span` extends layer/project
  // duration when a preset's keyframes run past the default 2s sample.
  function sceneFor(type, inst, span) {
    const reg = FM.fxRegistry.get(type);
    const base = sampleFor(subjectFor(type, reg));
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
    const d = wctx.getImageData(0, 0, PX, PX).data;
    // stride scales with the raster so the probe still reads the same NUMBER of samples as it did
    // at 96² — a fixed stride over 4x the pixels would make the still/animated test 4x dearer.
    for (let i = 0; i < base.length; i += 16 * R * R) { if (Math.abs(base[i] - d[i]) > 3) return true; }
    return false;
  }
  function fallback() {
    if (!fallbackEntry) {
      try { renderFrame({ project: PROJ, layers: samples.ball.layers }, 0.2); fallbackEntry = { kind: 'static', frame: snap() }; }
      catch (e) {
        const c = document.createElement('canvas'); c.width = PX; c.height = PX;
        const x = c.getContext('2d'); x.fillStyle = PROJ.background; x.fillRect(0, 0, PX, PX);
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
      const d0 = wctx.getImageData(0, 0, PX, PX).data;
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
    preloadArt();          // kick every JPEG off on the first tile, not one at a time as tiles build
    ensureSamples();
    if (cv.width !== PX) cv.width = PX;
    if (cv.height !== PX) cv.height = PX;
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
    /* The exact scene a tile is rendered from — the subject, the effect instance and any demo-only
     * parameter overrides. Exposed so the suite can MEASURE a tile (render it, render it again with
     * the effect stripped out, diff) instead of taking "it looks right" on trust. Read-only: it
     * hands back a fresh clone each call, so mutating it cannot affect a real thumbnail. */
    previewScene: function (type) { preloadArt(); ensureSamples(); return sceneFor(type); },
    /* Halt the ticker + pending generation (cache retained) — call when the browser closes. */
    stopAll: function () {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      queue.length = 0; pendingQ.clear(); presetByKey.clear();
      if (ticker) { clearInterval(ticker); ticker = 0; }
      live.clear();
    },
  };
})(window.FM);
