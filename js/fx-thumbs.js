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
  /* A PICTURE PAINTED WITHOUT ITS PHOTOGRAPH IS NEVER KEPT (queue 359). The drawn art is the stand-in
   * for the moment before a JPEG decodes — but `sampleFor` BAKES whatever it painted into a canvas and
   * keeps it, so a tile built during that moment showed the stand-in for the rest of the session. There
   * is an invalidation for this (`photosChanged` clears the samples and re-mounts) and it does work,
   * which is why this was invisible for so long: the tile heals a fraction of a second later, unless it
   * is a canvas the app is not tracking. Watching the grid re-render, the victim moved — Cross Process
   * one run, CRT Monitor the next — which is the signature of a race rather than a broken table.
   * Healing after the fact is weaker than not being wrong: the flag below marks any paint that had to
   * fall back, and nothing marked is stored — not the sample, not the frame. The next paint, once the
   * photograph is in, is the real one and is kept. Cost is a few re-renders in the first second of a
   * session and none after it. */
  let artFellBack = false;
  function photoArt(key, fallback) {
    return function (g, S) {
      const im = photo(key);
      if (im.complete && im.naturalWidth > 0) { g.drawImage(im, 0, 0, S, S); return; }
      artFellBack = true;
      fallback(g, S);
    };
  }
  // Every photo, requested the moment the browser opens. Without this a photo is only fetched when
  // the first tile that needs it is built — which is always AFTER that tile has already painted its
  // fallback, so every tile visibly flashed drawn art and then swapped. 243 KB for the set. (#66)
  /* WHICH PHOTOGRAPHS TO FETCH UP FRONT — DERIVED, NEVER HAND-KEPT (queue 359). This was a literal
   * array of fourteen names sitting three hundred lines above the tables that name the photographs, and
   * it had fallen four behind them: every car Ezra shot for the Filters tab was referenced by a tile and
   * missing from the preload, so a car tile started its own fetch mid-generation and baked the drawn
   * fallback into the sample while it waited. Nothing announced the omission — the tile just quietly
   * showed the wrong picture.
   * A second list of the same names is exactly the kind of thing that goes stale silently, so there is
   * no longer a second list: the set is computed from the three tables that actually reference art, and
   * adding a photograph to any of them preloads it by construction. `photoKeys()` is deferred to first
   * call because those tables are declared below this point. */
  function photoKeys() {
    const set = Object.create(null);
    Object.keys(PHOTO_OF).forEach(k => { set[k] = 1; });                       // per-effect subjects
    Object.keys(FILTER_SUBJECT).forEach(k => { set[FILTER_SUBJECT[k]] = 1; }); // per-filter subjects
    Object.keys(SECTION_PHOTO).forEach(k => { set[SECTION_PHOTO[k]] = 1; });   // per-section defaults
    return Object.keys(set);
  }
  let preloaded = false;
  function preloadArt() { if (preloaded) return; preloaded = true; photoKeys().forEach(photo); }

  // A decoded photo makes every tile that used it stale — the sample scene baked the fallback art
  // into a canvas, and the frame cache baked that. Coalesced, because fourteen files land at once.
  let photoSettle = 0;
  function photosChanged() {
    if (photoSettle) return;
    photoSettle = setTimeout(function () {
      photoSettle = 0;
      if (samples) Object.keys(samples).forEach(k => { if (k.indexOf(':') >= 0) delete samples[k]; });
      // Re-mount through the shared path, which remembers what each key IS. Re-mounting with a bare
      // key used to drop a preset tile's preset — see the note on `meta` — and paint the fallback.
      FM.fxThumbs.remountLive();
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

  // Category key -> the art its tiles are built from. Colouring keeps the landscape; every
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
  // The photograph each section defaults to, kept as DATA so the preload set can be derived from it
  // rather than restated by hand — see photoKeys().
  const SECTION_PHOTO = { color: 'city', other: 'ramp', blur: 'dusk', distort: 'towers', stylize: 'dog' };
  Object.setPrototypeOf(SECTION_PHOTO, null);
  const SECTION_ART = {
    color: photoArt(SECTION_PHOTO.color, paintPhoto), other: photoArt(SECTION_PHOTO.other, paintPhoto), text: paintPhoto,
    blur: photoArt(SECTION_PHOTO.blur, paintDetail), distort: photoArt(SECTION_PHOTO.distort, paintGrid), proc: paintPlate,
    stylize: photoArt(SECTION_PHOTO.stylize, paintBars),
    drawing: paintEmblem, move: paintToken, repeat: paintMotif, matte: paintSplit,
    opacity: paintChip, threed: paintFacet,
  };

  /* The remaining nine photographs, wired to the individual effects they demonstrate better than
   * their section's default. Applied ON TOP of SUBJECT_OF so the FORM already reasoned out below is
   * preserved — an effect that needs a card keeps its card, it just gets a photograph on it. (#66) */
  /* Reassigned across Colouring so neighbouring tiles do not share a picture (queue 110). Ezra:
   * "you can tell the effects don't work because all the images don't show any change in the effects
   * menu." Most of the section had no photo of its own and fell through to the SAME section default,
   * so forty tiles were one photograph with a succession of quiet grades on it — which reads exactly
   * like nothing happening, whatever the compositor is doing underneath.
   * Each move below is to a picture that gives that specific effect something to bite on, and the
   * reasoning is recorded next to it because "why this photo" is the part that would otherwise be lost. */
  const PHOTO_OF = {
    sunpath: ['glow', 'darkglow', 'edgeglow', 'lensflare', 'rays', 'lightleak'],
    bush:    ['filmgrain', 'noise', 'blocknoise', 'bumpmap'],           // bumpmap needs real texture to raise
    shore:   ['saturate', 'hue', 'duotone', 'gradientmap', 'tint',
              'spotcolor'],                                            // shore is the only photo with a vivid band near hue 0 for Spot Colour to keep
    bay:     ['gradientoverlay', 'iridescence', 'vibrance'],            // Vibrance peaks on MID-saturation; shore was already too vivid for it to do anything
    run:     ['motionblur', 'motionflow', 'sepia'],                     // sepia reads best on a picture that started with several hues
    clouds:  ['vignette', 'lightning'],
    figures: ['threshold', 'posterize', 'halation'],                    // the darkest surround of the 14, so halation's red bleed escapes into black rather than washing a sunset
    cat:     ['pixelate', 'mosaic', 'halftone', 'halftonelines',
              'tealorange'],                                            // a split-tone cancels out on a photo that is ALREADY teal and orange; cat is near-colourless
    pair:    ['lumamatte', 'matchgrade', 'levels'],
    dusk:    ['lightglow'],                                             // discrete lamps on a dark street: a hard-keyed bloom shows as separate blooms, not a wash
    towers:  ['softglow'],                                              // a pale detail-packed aerial, so a wide diffusion visibly dissolves detail
    dog:     ['grayscale'],                                             // strongest tonal structure of the 14 — B&W reads as a photograph, not a grey wash
    ramp:    ['highlightsshadows'],                                     // 14% crushed and 1% blown, so both halves of the effect's name have something to recover
    /* HIS CARS, ON THE SHAKE SECTION (queue 332 clause 1). Ezra sent four photographs and settled where
     * they go himself: *"All just for the shake section"*. Four across seven effects rather than one
     * repeated, because a category whose tiles are all the same picture tells you nothing about which
     * effect is which — the exact fault queue 359 was about. Ordered so no two ADJACENT tiles in the
     * category (wiggle, shake, swing, spin, pulse, drift, orbit) share a car.
     * This works without touching the subject machinery because the move category already uses the CARD
     * form — a photo inset in the frame with room to travel — which is what makes a shake visible at
     * all; a full-frame subject that shakes just swings its own edges through the tile. */
    huracan:  ['shake', 'pulse'],
    mclaren:  ['wiggle', 'drift'],
    revuelto: ['swing', 'orbit'],
    tesla:    ['spin'],
  };
  const PHOTO_SUBJECT = {};
  Object.keys(PHOTO_OF).forEach(k => PHOTO_OF[k].forEach(t => { PHOTO_SUBJECT[t] = k; }));

  /* WHICH PHOTOGRAPH EACH FILTER IS DEMONSTRATED ON (queue 359). Ezra: *"Why did you change all the
   * filters images to shit photos instead of the good ones they were before? Change it back man come
   * on, and also I still need the tuff filters like I discussed with the car photos"*.
   *
   * Nothing had been changed and nothing was broken — the tiles were, and had always been, real
   * photographs with the grade correctly applied. The fault was that a filter had no subject of its
   * own: it borrowed the one belonging to its FIRST CHILD EFFECT, and eleven of the sixteen filters
   * open on `contrast` or `saturate`, which live in the colour section and resolve to city.jpg. So the
   * Filters tab was the same Perth sunset fourteen times, and not one of the four cars he shot for it.
   * A wall of near-identical thumbnails is worth less than no thumbnail — you cannot tell the looks
   * apart, which is the only thing the grid is for.
   *
   * The subject is a taste call, so each of these was picked by LOOKING at all eighteen photographs
   * beside all sixteen tiles, not by reasoning from filenames. Each one is chosen so the filter has
   * something to visibly act ON: the split-tone gets a yellow car on grey pavement so both anchors are
   * present, the bleach bypass gets orange paint to drain to silver, cross process gets big flat black
   * panels for its cyan to land in, thermal gets a warm animal because that is what a thermal camera is
   * for, and the two line-art filters get cars because a car outlines cleanly and a skyline turns to
   * mush. An id missing here simply keeps the old child-effect behaviour. */
  /* NO CARS HERE (queue 371). Five of these had one, and none of that was asked for: the four car
   * photographs were sent for the SHAKE section — *"All just for the shake section"* (queue 332) — and
   * I read them as general art once the files existed. His correction: *"I didn't want the car images
   * as the main images for any of the groups but the tuff group"*. The cars are reserved for the tuff
   * filters (queue 349), which do not exist yet. */
  const FILTER_SUBJECT = {
    tealorange: 'bay',     bleach: 'run',     crossproc: 'ramp',   faded: 'city',
    vhs:        'city',    crt:  'towers',    super8:    'bush',   oldfilm: 'dog',
    dreamy:     'shore',   goldenhour: 'sunpath', leak:  'pair',   neonnight: 'dusk',
    comic:      'dog',     poster: 'clouds',  thermal:   'cat',    nightvis: 'figures',
  };
  Object.setPrototypeOf(FILTER_SUBJECT, null);   // an id like 'constructor' must miss, not inherit

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
    FM.media.pin(id);   // these back a PRIVATE sample scene, not FM.scene — the media GC must not sweep them
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
    artFellBack = false;          // see photoArt — a sample painted without its photograph is provisional
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
      if (!artFellBack) samples[key] = ps;
      return ps;
    }
    const art = SECTION_ART[cat] || paintPhoto;
    const s = (form === 'card')
      ? { layers: [mkArt('_fxthumbC_' + cat, art, 64, 46, 44), bg()], heroIdx: 0 }
      : { layers: [mkArt('_fxthumbF_' + cat, art, SIZE, 48, 48), bg()], heroIdx: 0 };
    if (!artFellBack) samples[key] = s;
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
    innerglow: 'card', stroke: 'card', dropshadow: 'card', longshadow: 'card',
    // Radial Shadow moves OFF the card: the card leaves 12-20px of margin and this effect projects
    // the silhouette outward, so on a card it could only ever render as a rim — which is what made
    // it a twin of Long Shadow. The ball has ~50px of open backdrop, so the plume can widen AND
    // fade inside the tile, which is the effect's actual claim.
    radialshadow: 'ball',
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
    // and its category's art is a PHOTO, which is what reads as a blurred wash rather than as an
    // abstract pattern. (It sat in 'other' until queue 289 dissolved that category; it is in Blur now,
    // whose art is also a photo, so the requirement is unchanged.)
    fillbehind: 'card',
    // Framing effects: these draw ON an edge, so the subject must reach the tile's own edges or the
    // tile shows a frame floating in the middle of nothing. Letterbox and Border Frame draw on the
    // LAYER's edge now rather than the comp's (v6.35 — before that they painted the whole frame and
    // erased what was under them); a full-frame subject's box IS the frame, so both tiles are
    // byte-identical to what they always rendered.
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
    // Squish needs something that can HANG OVER an edge, and its category default ('grid') is a
    // full-frame lattice touching all four edges with nothing over any of them — the tile would show
    // an untouched picture. The ball is also the effect's own pitch: drop it on the floor and watch
    // it squash. (See the OVERRIDE, which supplies the drop.)
    squish: 'ball',
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
    /* Squish only does anything when the layer is OVER an edge, so a static tile is just a ball.
     * Drive it into the floor and back: round in the air, flat and wide on the floor, which IS the
     * pitch. The cycle is 0.9s against the strip's 10 frames at 0.15s, so four of them land on or
     * near the impact whatever phase the shared ticker is in — a one-shot Bounce ease is over in
     * ~0.08s and the strip would step straight past it. Floor only: a ball squashing on the ceiling
     * on the way down reads as a glitch. */
    squish: function (layers, hero) {
      hero.transform = Object.assign({}, hero.transform, {
        y: { kf: [{ t: 0, v: 30, e: 'easeIn', bez: [0.5, 0, 1, 1] },
                  { t: 0.45, v: 86, e: 'easeOut', bez: [0, 0, 0.5, 1] },
                  { t: 0.9, v: 30, e: 'easeIn', bez: [0.5, 0, 1, 1] },
                  { t: 1.35, v: 86, e: 'easeOut', bez: [0, 0, 0.5, 1] },
                  { t: 1.8, v: 30, e: 'linear' }] },
      });
      hero.effects[0].params.walls = 1;
    },
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
    // tightness 0 made rCore 30% of rWide, i.e. two radii merged into one ordinary glow — the exact
    // thing this effect's own comment says it exists NOT to be. 0.9 gives a hot near-sharp core
    // inside the wide wash, which is what halation actually looks like.
    halation: function (l, h) { const p = h.effects[0].params; p.threshold = 0.1; p.spread = 20; p.amount = 2; p.tightness = 0.9; p.knee = 1; },
    // radius here is RAW PLATE PIXELS on the 96px thumbnail plate, so 20 meant a 41px-wide box over
    // a 96px frame — the keyed light got averaged into a veil. And threshold 18 keyed almost every
    // pixel of a sunset, so the hard key stopped selecting anything.
    lightglow: function (l, h) { const p = h.effects[0].params; p.radius = 10; p.threshold = 30; p.amount = 1; },
    /* radius is a PERCENT, resolved as round(min(W,H)/40 * radius/100). On the 96px thumbnail plate
     * that is round(2.4 * 0.28) = ONE PIXEL — so this tile had no diffusion in it whatsoever and was
     * simply an exposure lift, which is why it was indistinguishable from Light Glow. 400 is the
     * control's own maximum and resolves to a 10px radius here; on a 1080p comp the same formula
     * gives 27px at 100%, so this is the 96px correction, not a cranked slider. */
    softglow: function (l, h) { const p = h.effects[0].params; p.radius = 400; p.threshold = 22; p.amount = 1; },
    bumpmap: function (l, h) { h.effects[0].params.amount = 2.4; },   // amount drives the relief AND a flat multiply, so max washes the tile out
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
    /* SIZE 2, NOT 4 (queue 319). Ezra: *"For the noise preview make the noise smaller so it doesn't
       look shit"*. He is right, and the rule that says so is already written three paragraphs up, about
       DITHER: two plate-pixels is what survives the up-then-down trip, and "past two plate-pixels the
       cell stops reading as error diffusion and starts reading as mosaic, and a thumbnail that
       overstates the effect is the same failure as one that understates it." Noise was set to 4 in the
       same pass that reasoned dither down to 2, and nobody applied the second half of the sentence to
       it — so the tile advertised Noise as chunky mosaic when the effect's own default is fine speckle.
       Amount and colour stay where they are: the complaint was the size of the grain, not its loudness. */
    noise: function (l, h) { const p = h.effects[0].params; p.amount = 100; p.size = 2; p.color = 45; },
    posterize: function (l, h) { h.effects[0].params.levels = 3; },
    // Vibrance protects already-saturated pixels, so at its default it moved this photo by ~6%.
    // Top of its range is all the headroom there is (Protect-highlights measured WORSE, 12.98 vs
    // 14.36) — the tile is as strong as the control allows.
    vibrance: function (l, h) { h.effects[0].params.amount = 2; },
    /* Added for queue 110 — each of these rendered at a strength that showed nothing at 84px. */
    spotcolor: function (l, h) { h.effects[0].params.tolerance = 0.32; },      // keep-window is tolerance*120 degrees; 0.2 only half-caught shore's band
    vignette: function (l, h) { const p = h.effects[0].params; p.amount = 1; p.size = 20; },  // size is the UNTOUCHED inner radius: 35 left the darkening in the corners only
    bleachbypass: function (l, h) { h.effects[0].params.amount = 1; },         // amount is a straight opacity on the whole look; 0.7 was showing a partly-unprocessed photo
    longshadow: function (l, h) { h.effects[0].params.length = 16; },          // beyond 16 the throw is clipped by the plate, so bigger values paint an identical corner fill
    radialshadow: function (l, h) { const p = h.effects[0].params; p.reach = 70; p.x = 82; p.y = 88; },   // light OUTSIDE the silhouette, throwing up-left — the default 50/35 sat inside it and could only make a rim
  };

  // Fresh scene per type: shallow-clone the layer list (plain objects) and give the TARGET layer
  // its own effects array — never share an effects array between types.
  // `inst` (optional) = a ready effect instance (preset previews); `span` extends layer/project
  // duration when a preset's keyframes run past the default 2s sample.
  function sceneFor(type, inst, span, subject) {
    const reg = FM.fxRegistry.get(type);
    // `subject` names the sample outright — a filter chooses its own (FILTER_SUBJECT) rather than
    // inheriting whatever its first child effect happens to demonstrate on.
    const base = sampleFor(subject || subjectFor(type, reg));
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

  /* ---- LAYER PREVIEWS — the tile shows YOUR layer, not a sample ------------------------------
   * Ezra: "the presets menu should show a preview of what the layer will look like when you add the
   * effects." Everything above renders a module-private SAMPLE scene, which answers "what does this
   * preset DO" but never "what does it do to THIS". A layer preview renders the LIVE scene with the
   * selected layer's effect stack extended by the preset — the same instance addEffect would push,
   * anchored the same way (playhead if it is inside the clip, else the clip start) — so choosing a
   * preset is choosing a picture of your own footage.
   *
   * THE WHOLE SCENE, not the layer on its own. Three reasons, all measured rather than assumed:
   *   • a GROUP renders nothing by itself — its members are separate top-level layers that the
   *     compositor finds through scene.layers, so a one-layer mini scene shows an empty frame;
   *   • an ADJUSTMENT layer has no pixels of its own and only changes what is UNDER it, so its
   *     honest preview is the frame, not the layer;
   *   • in context is nearly free at tile size (the whole 8-layer scene 4.3ms vs 3.7ms for the
   *     layer alone), because the tile is 65x116 device pixels and plateScale follows it down.
   * The one layer that is CLONED is the target: it is the only one whose document we change.
   *
   * FM._mfGhost is set for every preview render, for exactly the reason the onion skin sets it
   * (js/app.js): Motion Blur (Footage), Frame Stutter, Time Warp and Temporal Denoise each keep a
   * per-LAYER-ID frame record, and a preview strip walks that record over its own ten timestamps.
   * The clone must KEEP the real id (FM.media is keyed by layer id, so a renamed clone loses its
   * footage), so the flag those four already honour is the only way a preview cannot corrupt the
   * live render's history. The cost is that a preview of one of those four passes the frame through.
   * ------------------------------------------------------------------------------------------- */

  /* The .fxp-thumb box is 76x58 CSS (styles.css) and .fxb-thumb-cv is object-fit:cover, so a raster
   * of exactly that shape — at the same 2x used everywhere else in this file — crops NOTHING. The
   * project frame is then LETTERBOXED inside it: a 9:16 comp stretched to fill a 4:3 box is either
   * squashed or loses 57% of its height, and half a preview is worse than no preview. */
  const TW = 76 * R, TH = 58 * R, MAT = '#0a0d13';
  const SLICE_MS = 8;   // main-thread budget per rAF for a layer strip — see layerStep

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function strHash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + '_' + s.length.toString(36);   // length too: a free second opinion
  }

  let lwork = null, lctx = null;      // project-aspect work surface (one, shared, like `work` above)
  function rasterFor(P) {
    const k = Math.min(TW / Math.max(1, P.width || 1), TH / Math.max(1, P.height || 1));
    return { w: Math.max(2, Math.round((P.width || 1) * k)), h: Math.max(2, Math.round((P.height || 1) * k)) };
  }
  function lrender(scene, t, r) {
    if (!lwork) { lwork = document.createElement('canvas'); lctx = null; }
    if (lwork.width !== r.w || lwork.height !== r.h) { lwork.width = r.w; lwork.height = r.h; }
    if (!lctx) lctx = lwork.getContext('2d', { willReadFrequently: true });
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, r.w, r.h);
    const g0 = FM._mfGhost;
    FM._mfGhost = 1;
    try { FM.renderScene(lctx, scene, t); } finally { FM._mfGhost = g0; }
  }
  function lsnap(r) {   // one cacheable tile-shaped frame: mat + the letterboxed project frame
    const c = document.createElement('canvas'); c.width = TW; c.height = TH;
    const g = c.getContext('2d');
    g.fillStyle = MAT; g.fillRect(0, 0, TW, TH);
    g.drawImage(lwork, Math.round((TW - r.w) / 2), Math.round((TH - r.h) / 2));
    return c;
  }

  // The target and everything parented under it. Used to take the layer OUT of the scene: hiding a
  // group clone would not hide its members, because isLayerVisibleAt resolves group ancestors
  // through the LIVE FM.scene, not through the list it was handed.
  function descendants(id) {
    const out = {}; out[id] = 1;
    for (let pass = 0, grew = true; grew && pass < 32; pass++) {
      grew = false;
      FM.scene.layers.forEach(function (l) { if (l.parent && out[l.parent] && !out[l.id]) { out[l.id] = 1; grew = true; } });
    }
    return out;
  }
  // The live scene with ONE layer replaced by a clone whose effect stack has `inst` appended.
  // The clone comes from JSON so nothing mutable is shared with the real document — the compositor
  // stashes caches on layer objects (_wrapCache) and on effect instances, and a preview must never
  // be able to write into the thing being previewed. jsonReplacer drops those '_' keys on the way.
  function sceneWith(target, inst) {
    const doc = JSON.parse(JSON.stringify(target, FM.jsonReplacer));
    doc.effects = (doc.effects || []).concat(inst ? [inst] : []);
    return { project: FM.scene.project, layers: FM.scene.layers.map(function (l) { return l.id === target.id ? doc : l; }) };
  }
  /* A scene in which the target layer has been put through whatever APPLYING a preset does. The
   * caller hands in the mutation rather than a description of it, so the tile is rendered by the same
   * code the Apply button runs — which is the only way a "what will this look like" preview can be
   * trusted not to drift from what you actually get. The clone is what gets mutated; the rest of the
   * scene is the live objects, because previewing in context is the point. */
  function sceneApplied(target, applyFn) {
    const doc = JSON.parse(JSON.stringify(target, FM.jsonReplacer));
    try { applyFn(doc); } catch (e) { return null; }
    return { project: FM.scene.project, layers: FM.scene.layers.map(function (l) { return l.id === target.id ? doc : l; }) };
  }
  function sceneWithout(target) {
    const drop = descendants(target.id);
    return { project: FM.scene.project, layers: FM.scene.layers.filter(function (l) { return !drop[l.id]; }) };
  }

  /* WHEN the strip is rendered. The anchor is addEffect's own rule verbatim (fx-browser.js) — the
   * preview has to be of the effect you are about to get, and that one lands at the playhead when
   * the playhead is inside the clip. The window is then clamped to the clip: past its end the layer
   * stops existing and the strip would fade to an empty frame, which reads as a broken tile. */
  function windowFor(layer, preset) {
    const st = layer.start || 0, du = Math.max(0, layer.duration || 0), end = st + du;
    const ph = (typeof FM.time === 'number') ? FM.time : st;
    const anchor = (ph >= st && ph < end - 0.01) ? ph : st;
    const span = Math.min(3, Math.max(0.9, (preset && preset.dur) || 0));
    const t1 = Math.min(anchor + span, Math.max(anchor, end - 0.001));
    return { t0: anchor, t1: t1, anchor: anchor, n: (t1 - anchor < 0.15) ? 1 : FRAMES };
  }

  /* One signature over everything a layer preview READS. Content-based on purpose: undo/redo
   * rebuilds layer objects with the SAME ids, so object identity — or a _rev counter on the layer —
   * hands back the pre-undo picture, which is the exact "stale preview of something else" defect
   * this feature would otherwise introduce. Media is in here too: swapping a file, or a photo that
   * has only just decoded, changes the picture without changing one byte of the document.
   * Memoised for the current task only. A sheet builds all of its rows synchronously, so this is ONE
   * hash per sheet open; the next open re-reads the scene rather than trusting a stamp. */
  let _rev = null;
  function sceneRev() {
    if (_rev != null) return _rev;
    const P = FM.scene.project;
    let s = P.width + 'x' + P.height + ':' + (P.background || '-') + ':' + (P.fps || 0) + ':' + Math.round((FM.time || 0) * 30);
    s += JSON.stringify(FM.scene.layers, FM.jsonReplacer);
    FM.scene.layers.forEach(function (l) {
      const m = FM.media && FM.media.get(l.id);
      if (!m) return;
      const el = m.el || {};
      s += '|' + l.id + ':' + (m.kind || '') + ':' + (el.readyState || 0) + ':' +
           (el.naturalWidth || el.videoWidth || 0) + ':' + Math.round((el.currentTime || 0) * 1000);
    });
    _rev = strHash(s);
    Promise.resolve().then(function () { _rev = null; });
    return _rev;
  }

  /* Can this layer be previewed at all? Type first (a null/camera has no pixels, and an effect that
   * cannot apply renders the layer untouched), then MEASURED: render the frame with the layer in it
   * and again with it and its descendants taken out, and compare. Measurement rather than type is
   * what catches an empty group, a layer at opacity 0, one scrolled off-frame, one hidden behind
   * another, and a video whose first frame has not decoded — every one of which otherwise renders a
   * column of identical dark rectangles. All four channels are compared, never alpha alone: the
   * project background paints alpha 255 everywhere, so an alpha test says "identical" for all of
   * them. Memoised per layer+scene signature, so a sheet pays for it once. */
  const contribCk = new Map();
  function contributes(layer) {
    const r = rasterFor(FM.scene.project), w = windowFor(layer, null);
    lrender(sceneWith(layer, null), w.anchor, r);
    const on = lctx.getImageData(0, 0, r.w, r.h).data;
    lrender(sceneWithout(layer), w.anchor, r);
    const off = lctx.getImageData(0, 0, r.w, r.h).data;
    for (let i = 0; i < on.length; i++) if (Math.abs(on[i] - off[i]) > 2) return true;
    return false;
  }
  function canPreview(layer, fxType) {
    if (!layer || !FM.scene || !FM.renderScene) return false;
    if (fxType && FM.fxRegistry.supportsLayer && !FM.fxRegistry.supportsLayer(fxType, layer)) return false;
    const key = layer.id + '#' + sceneRev();
    if (contribCk.has(key)) return contribCk.get(key);
    let ok = false;
    try { ok = contributes(layer); } catch (e) { ok = false; }
    if (contribCk.size > 32) contribCk.clear();
    contribCk.set(key, ok);
    return ok;
  }

  // What this row shows when the layer cannot be previewed (or its render threw): today's sample
  // tile, unchanged — the Default row keeps its demo OVERRIDES, a preset keeps its scaled sample.
  function syntheticFor(m) {
    return m.preset ? (cache.get('p:' + m.preset.id) || generatePreset(m.preset))
                    : (cache.get(m.fx) || generate(m.fx));
  }

  /* One SLICE of a layer strip. Cheap presets finish in a single rAF (a 10-frame shake strip on a
   * 1080x1920 layer measured 3.8ms); the dear ones do not, and cannot be made to: nine kernels in
   * compositor.js allocate and loop at P.width x P.height whatever the target size, so RGB Split
   * measured 8.4ms PER FRAME at 1080p and 43ms at 4K — one frame of it already overruns a 16ms
   * slice on its own. So the budget is per rAF and the strip resumes where it left off, which is
   * the difference between a tile that streams in and a panel that freezes for half a second. */
  const jobs = new Map();
  function layerStep(key, m) {
    let j = jobs.get(key);
    if (!j) {
      const layer = FM.scene.layers.find(function (l) { return l.id === m.layerId; });
      if (!layer) return syntheticFor(m);
      const w = windowFor(layer, m.preset);
      let scn = null;
      if (m.apply) {
        scn = sceneApplied(layer, m.apply);
        if (!scn) return syntheticFor(m);
      } else {
        let inst = null;
        try {
          inst = m.preset ? (FM.effectPresets ? FM.effectPresets.makeInstance(m.preset, w.anchor) : null)
                          : FM.fxRegistry.makeInstance(m.fx);
        } catch (e) { inst = null; }
        if (!inst) return syntheticFor(m);
        scn = sceneWith(layer, inst);
      }
      j = { scene: scn, w: w, r: rasterFor(FM.scene.project), frames: [], i: 0, shown: 0 };
      jobs.set(key, j);
    }
    const t0 = now();
    do {
      const at = now();
      try {
        lrender(j.scene, j.w.t0 + (j.w.n === 1 ? 0 : (j.i / j.w.n) * (j.w.t1 - j.w.t0)), j.r);
        j.frames.push(lsnap(j.r));
        /* ADAPTIVE STRIP LENGTH, decided by the first frame's measured cost. The nine kernels above
         * cannot be sliced any finer than one frame, and at 3840x2160 one RGB Split frame measured
         * 86ms — a ten-frame strip is ten dropped frames in a row, which is the panel stuttering
         * rather than a tile animating. So a dear effect gets a SHORTER strip, and a very dear one
         * gets a single frame: a still of your own layer beats a stutter, and it still beats the
         * stock ball it replaces. Cheap effects (the overwhelming majority — a shake strip on a 4K
         * 12-layer scene measured 2.2ms/frame) are untouched. */
        if (j.i === 0) { const c = now() - at; j.w.n = (c <= 4) ? j.w.n : (c <= 20 ? Math.min(j.w.n, 4) : 1); }
      } catch (e) {
        // A broken effect must never break the sheet — same contract as generate() above.
        jobs.delete(key);
        if (!warned[key]) { warned[key] = 1; console.warn('fx-thumbs: layer preview failed for "' + key + '"', e); }
        return syntheticFor(m);
      }
      j.i++;
    } while (j.i < j.w.n && now() - t0 < SLICE_MS);
    if (j.i < j.w.n) return null;   // not done — pump() keeps it at the head of the queue
    jobs.delete(key);
    return j.frames.length > 1 ? { kind: 'anim', frames: j.frames } : { kind: 'static', frame: j.frames[0] };
  }

  /* Eviction, which this cache has never had. A sample tile is keyed by effect type and there are
   * 195 of those; a layer preview is keyed by preset AND layer AND scene signature, so every edit
   * and every layer you look at mints a new one. One 10-frame strip is 10 x 152 x 116 x 4 = 705KB,
   * so an unbounded cache is a phone's memory in an afternoon. Byte-capped LRU over the LAYER
   * entries only: the sample tiles keep the documented session-long behaviour. */
  const layerKeys = [];
  let layerBytes = 0;
  const LAYER_CACHE_MAX = 10 * 1024 * 1024;
  function bytesOf(e) {
    const f = e.kind === 'anim' ? e.frames[0] : e.frame;
    return (e.kind === 'anim' ? e.frames.length : 1) * (f ? f.width * f.height * 4 : 0);
  }
  function remember(key, entry) {
    const i = layerKeys.indexOf(key);
    if (i >= 0) layerKeys.splice(i, 1); else layerBytes += bytesOf(entry);
    layerKeys.push(key);
    while (layerBytes > LAYER_CACHE_MAX && layerKeys.length > 1) {
      const old = layerKeys.shift();
      const e = cache.get(old);
      if (e) layerBytes -= bytesOf(e);
      cache.delete(old); meta.delete(old);
    }
  }
  function touch(key) { const i = layerKeys.indexOf(key); if (i >= 0) { layerKeys.splice(i, 1); layerKeys.push(key); } }

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
    /* Entries no longer all have one shape: a sample tile is a 192² square, a layer preview is the
     * .fxp-thumb box at the project's aspect. Sizing the canvas FROM THE ENTRY is what stops a
     * fallback tile being blitted 1:1 into the corner of a canvas that was sized for the other one. */
    const f0 = (entry.kind === 'anim') ? entry.frames[0] : entry.frame;
    if (f0 && (cv.width !== f0.width || cv.height !== f0.height)) { cv.width = f0.width; cv.height = f0.height; }
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
  /* What each key needs in order to be (re)generated: { preset } for a sample preset tile, plus
   * { layerId, rev, fx } for a layer preview. It used to be a preset-only map that was DELETED the
   * moment the tile was generated, and that is a bug with pixels: when the fx-art photographs land,
   * photosChanged() clears the cache and re-mounts every live tile — with no preset to re-mount
   * WITH. generate() then looked 'p:s-beatslam' up in the effect registry, threw, and cached the
   * generic fallback ball under the preset's key for the rest of the session. Measured on the build
   * before this one: open the first preset sheet within ~1s of the browser opening and every tile
   * mounted in that window is the same grey ball, permanently. The recipe outlives the entry. */
  const meta = new Map();
  let queue = [], raf = 0;
  function schedule() { if (!raf && queue.length) raf = requestAnimationFrame(pump); }
  function pump() {
    raf = 0;
    const key = queue[0];
    if (key != null) {
      const m = meta.get(key);
      let entry = cache.get(key);
      artFellBack = false;
      if (!entry) entry = (m && m.layerId) ? layerStep(key, m)
                        : (m && m.filter) ? generateFilter(m.filter)
                        : (m && m.preset) ? generatePreset(m.preset)
                        : generate(key);
      /* A frame rendered while a photograph was still decoding is provisional — see photoArt. It is
         still PAINTED, so a tile is never blank; it is simply not remembered, and the next mount builds
         the real one. */
      const provisional = artFellBack;
      if (entry) {
        queue.shift();
        if (!provisional) cache.set(key, entry);
        if (m && m.layerId) remember(key, entry);
        const ws = pendingQ.get(key) || [];
        pendingQ.delete(key);
        ws.forEach(function (cv) { if (cv._fxType === key) paint(cv, entry); });   // skip tiles re-mounted to another key meanwhile
      } else {
        // A strip too dear to finish in one slice: show its first frame now rather than an empty
        // box, and carry on next rAF. The finished strip replaces it.
        const j = jobs.get(key);
        if (j && j.frames.length && !j.shown) {
          j.shown = 1;
          (pendingQ.get(key) || []).forEach(function (cv) { if (cv._fxType === key) paint(cv, { kind: 'static', frame: j.frames[0] }); });
        }
      }
    }
    schedule();
  }
  /* A FILTER's tile (queue 220). Cheaper than an effect's in the one way that matters: a filter's
   * settings are already chosen by whoever authored it, so none of the ~60 per-effect demo tweaks
   * apply — sceneFor takes the ready-made container and skips them of its own accord.
   * STATIC, not animated. Only the grain/noise ingredients in the library vary with time, and paying
   * an animated strip for 16 tiles on a phone buys a shimmer nobody is choosing a look by.
   * The SUBJECT comes from the first child's type, which is the same rule effects already follow,
   * applied to the look's leading ingredient — so a colour filter gets the photo a colour effect gets
   * rather than a shape. */
  function generateFilter(id) {
    try {
      const box = FM.filters && FM.filters.makeInstance(id);
      if (!box || !box.effects || !box.effects.length) return fallback();
      const pk = FILTER_SUBJECT[id];
      const scene = sceneFor(box.effects[0].type, box, 0, pk ? 'photo:' + pk : null);
      renderFrame(scene, 0.001);
      return { kind: 'static', frame: snap() };
    } catch (e) {
      if (!warned['f:' + id]) { warned['f:' + id] = 1; console.warn('fx-thumbs: filter preview failed for "' + id + '"', e); }
      return fallback();
    }
  }

  /* EVERY CANVAS A TILE HAS BEEN PAINTED INTO (queue 359). `remountLive` used to find its tiles with
   * querySelectorAll('canvas.fxb-thumb-cv') — the effects browser's class. The Filters tab is built by
   * the inspector and its tiles wear `flt-thumb-cv`, so the sweep could not see a single one of them:
   * when the photographs finished decoding and every other tile in the app was repainted, the sixteen
   * filter tiles kept the drawn stand-in they had been born with, for the rest of the session. That is
   * precisely what Ezra reported and precisely why it looked like the Filters tab alone had been
   * vandalised — *"Why did you change all the filters images to shit photos"*.
   * Naming the second class would fix today and rot the same way the moment a third surface mounts a
   * tile. So the sweep no longer guesses from markup: a canvas is registered here when it is mounted,
   * and being findable is a consequence of having been painted rather than of wearing the right class. */
  const mounted = new Set();

  // Shared mount plumbing: size the canvas, paint from cache or join the generation queue.
  function mountKey(cv, key, m) {
    if (!FM.renderScene || !FM.fxRegistry || !FM.makeLayer) {   // compositor/registry not loaded — nothing to render with
      if (!warned._init) { warned._init = 1; console.warn('fx-thumbs: FM.renderScene/fxRegistry missing'); }
      return;
    }
    preloadArt();          // kick every JPEG off on the first tile, not one at a time as tiles build
    ensureSamples();
    const w = (m && m.layerId) ? TW : PX, h = (m && m.layerId) ? TH : PX;
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    cv._fxType = key;
    mounted.add(cv);        // see remountLive — the re-mount sweep must not depend on a CSS class
    if (m) meta.set(key, m);
    const hit = cache.get(key);
    if (hit) { paint(cv, hit); if (m && m.layerId) touch(key); return; }
    let ws = pendingQ.get(key);
    if (!ws) { pendingQ.set(key, ws = []); queue.push(key); }
    if (ws.indexOf(cv) < 0) ws.push(cv);
    schedule();
  }
  // A layer preview's key and recipe, or null when this layer cannot honestly be previewed (in which
  // case the caller mounts the sample tile, exactly as before this feature existed).
  function layerMeta(layer, fxType, preset) {
    if (!layer || !canPreview(layer, fxType)) return null;
    return { layerId: layer.id, rev: sceneRev(), preset: preset || null, fx: fxType };
  }

  FM.fxThumbs = {
    /* Seam for the suite (queue 319). The demo-only tuning in OVERRIDES is the thing he judges a tile
       by — it is what makes Noise look chunky or fine — and it is unreachable from outside, so nothing
       could hold it to the rule the file states for itself. Read-only: it hands back the function, and
       the caller supplies its own throwaway layer to run it on. */
    _override: function (type) { return OVERRIDES[type] || null; },
    // Read-only seams so the suite can check the derivation itself — that every photograph a table
    // names is in the preload set — rather than checking a copy of the list (queue 359).
    _photoKeys: function () { return photoKeys().slice(); },
    _filterSubject: function (id) { return FILTER_SUBJECT[id] || null; },
    // The subject an EFFECT resolves to ('photocard:huracan', 'full:color', 'keyshot', …). Read-only,
    // so a test can check which picture a category actually demonstrates on (queue 332).
    _subjectOf: function (type) { return subjectFor(type, FM.fxRegistry.get(type)); },
    /* Take ownership of a tile canvas: size its backing store, paint (now if cached, else queued),
     * add class 'ready' on first paint, and keep repainting animated types until it leaves the DOM. */
    mount: function (cv, type) { mountKey(cv, type, null); },
    /* A FILTER's tile, keyed by library id. No layer variant on purpose: the effects GRID it sits
     * beside uses sample tiles too, and matching that is the whole point of the request. */
    mountFilter: function (cv, id) { if (id) mountKey(cv, 'f:' + id, { filter: id }); },
    /* A PRESET's live preview. With `layer`, the tile is THAT LAYER in its scene with the preset
     * appended to its effect stack — the picture you are about to get. Without one (or when the
     * layer has nothing to show) it is the sample tile, cache-keyed by preset id as before. */
    mountPreset: function (cv, preset, layer) {
      if (!preset || !preset.id) return;
      const m = layerMeta(layer, preset.fx, preset);
      // The no-layer path STILL carries the preset in its recipe. Passing null here instead cost a
      // full session of grey balls once already: pump() would find no recipe for 'p:<id>', hand the
      // key to generate(), which looks it up in the effect registry, misses, throws, and caches the
      // fallback. That is the same failure the `meta` note above describes, by a second route.
      mountKey(cv, m ? 'p:' + preset.id + '@' + m.layerId + '#' + m.rev : 'p:' + preset.id, m || { preset: preset });
    },
    /* Same, for an effect at its plain defaults — the sheet's "Default" row. Falls back to the
     * ordinary sample tile, which keeps that effect's demo-only OVERRIDES (a preset instance skips
     * them, so routing this through mountPreset would quietly weaken 30 tiles). */
    mountLayerFx: function (cv, type, layer) {
      if (!type) return;
      const m = layerMeta(layer, type, null);
      mountKey(cv, m ? 'd:' + type + '@' + m.layerId + '#' + m.rev : type, m);
    },
    /* A tile of THIS LAYER with a saved preset applied to it — the inspector's Presets card. The
     * caller passes the mutation (see sceneApplied), so the picture is produced by the same code the
     * Apply button runs. `key` must change when the preset's CONTENTS change, or a re-saved preset of
     * the same name would serve the old tile out of the cache.
     * Returns false when this layer cannot honestly be previewed — nothing of it is on screen at the
     * playhead, say — so the caller can fall back to a plain row instead of showing a sample tile of
     * some unrelated subject, which would be worse than no picture at all. */
    mountApplied: function (cv, key, layer, applyFn) {
      if (!cv || !key || !layer || typeof applyFn !== 'function') return false;
      if (!canPreview(layer, null)) return false;
      mountKey(cv, 'a:' + key + '@' + layer.id + '#' + sceneRev(), { layerId: layer.id, rev: sceneRev(), apply: applyFn, fx: null });
      return true;
    },
    /* Is a live preview of this layer meaningful (see canPreview)? Public so a sheet can say WHY it
     * is showing a sample instead of guessing, and so the suite can assert the fallback. */
    canPreviewLayer: function (layer, fxType) { try { return canPreview(layer, fxType); } catch (e) { return false; } },
    /* The exact scene a tile is rendered from — the subject, the effect instance and any demo-only
     * parameter overrides. Exposed so the suite can MEASURE a tile (render it, render it again with
     * the effect stripped out, diff) instead of taking "it looks right" on trust. Read-only: it
     * hands back a fresh clone each call, so mutating it cannot affect a real thumbnail. */
    previewScene: function (type) { preloadArt(); ensureSamples(); return sceneFor(type); },
    /* The same, for a LAYER preview: the scene, the window and the raster a tile would use. Only the
     * TARGET layer is a clone — the rest are the live objects, because rendering in context is the
     * point. Returns null when this layer cannot be previewed, which is itself the assertion a test
     * wants for a null/camera/empty layer. `frames` is the strip's FULL length; a real tile may
     * render fewer, because layerStep shortens the strip when the first frame measures dear. */
    previewLayerScene: function (layer, preset, fxType) {
      const type = preset ? preset.fx : fxType;
      if (!layerMeta(layer, type, preset)) return null;
      const w = windowFor(layer, preset);
      const inst = preset ? FM.effectPresets.makeInstance(preset, w.anchor) : FM.fxRegistry.makeInstance(type);
      if (!inst) return null;
      const r = rasterFor(FM.scene.project);
      return { scene: sceneWith(layer, inst), plain: sceneWith(layer, null), t0: w.t0, t1: w.t1, anchor: w.anchor, frames: w.n, w: r.w, h: r.h, tw: TW, th: TH };
    },
    /* Re-mount every tile currently on screen against a cleared cache. This is what runs when the
     * fx-art photographs decode, and it is exposed so the suite can prove that a preset tile comes
     * back as its preset rather than as the fallback ball. */
    remountLive: function () {
      const els = [];
      mounted.forEach(function (cv) {
        // A canvas that has left the document is not coming back — the inspector rebuilds its tiles
        // from scratch on every refresh — so drop it here rather than letting the set grow forever.
        if (!cv.isConnected) { mounted.delete(cv); return; }
        if (cv._fxType) els.push(cv);
      });
      /* IN-FLIGHT TILES ARE CARRIED ACROSS, not just the ones the DOM can see (queue 110).
       * This used to re-mount purely from that querySelectorAll, and stopAll() below wipes the queue —
       * so any tile that was queued but NOT YET IN THE DOCUMENT was dropped on the floor with nothing
       * left to re-queue it. Permanently blank, no retry, no error.
       * That window is real and the browser sits right in it: fx-browser.js's thumb() mounts the canvas
       * while its tile is still detached and hands the tile back for the caller to append, so every
       * tile in a section is un-connected for the moment between being mounted and being inserted. The
       * photographs decode ~80ms after the first tile asks for them, which is the same moment a
       * category is being built. Land there and the whole section stays blank — which is exactly what
       * he reported: "all the images don't show any change in the effects menu".
       * Waiters are captured BEFORE stopAll() clears them, and de-duplicated against the DOM sweep,
       * so the normal case behaves exactly as it did. */
      const inflight = [];
      pendingQ.forEach(function (cvs) {
        cvs.forEach(function (cv) { if (cv && cv._fxType) inflight.push(cv); });
      });
      FM.fxThumbs.stopAll();
      cache.clear(); layerKeys.length = 0; layerBytes = 0;
      const seen = new Set();
      els.concat(inflight).forEach(function (cv) {
        if (seen.has(cv)) return;
        seen.add(cv);
        mountKey(cv, cv._fxType, meta.get(cv._fxType) || null);
      });
      return seen.size;
    },
    /* What the layer-preview cache is holding. Exposed because "it is capped at 10MB" is a claim,
     * and a claim about memory that nothing can read is a claim nobody will ever check. */
    stats: function () { return { layerEntries: layerKeys.length, layerBytes: layerBytes, cap: LAYER_CACHE_MAX, keys: cache.size }; },
    /* The GENERATION side of the same argument (queue 110). Mounting a whole category at once left
       most tiles blank, and working out why took five probes precisely because none of this was
       readable from outside: whether the queue still held the keys, whether anything was waiting on
       them, whether the rAF loop was alive. It is readable now. */
    queueState: function () {
      return { queued: queue.length, pending: pendingQ.size, cached: cache.size, jobs: jobs.size, rafArmed: !!raf, head: queue[0] || null };
    },
    /* Halt the ticker + pending generation (cache retained) — call when the browser closes. */
    stopAll: function () {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      queue.length = 0; pendingQ.clear(); jobs.clear();
      if (ticker) { clearInterval(ticker); ticker = 0; }
      live.clear();
    },
  };
})(window.FM);
