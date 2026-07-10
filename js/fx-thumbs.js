/* FreeMotion — Add-Effect browser thumbnails, LIVE-rendered (no image assets).
 * Each tile's canvas gets the REAL effect applied to a tiny module-private sample scene via
 * FM.renderScene (the compositor is scene-agnostic — same trick as the test harness). Static
 * effects cache one 96² frame; effects that move (shake, wipes, glowscan…) are auto-detected
 * by diffing two probe frames and cache a 10-frame strip looped by ONE shared ticker.
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

  // ---- sample scenes (built lazily once; module-private — never touch FM.scene/storage) ----
  // Content is deliberately OFF-CENTRE and mid-bright: centred symmetric content makes
  // mirror/kaleidoscope no-ops, and pure-dark/pure-white kills the glows and grades.
  let samples = null;
  function mkShape(props) { return FM.makeLayer('shape', Object.assign({ start: 0, duration: 2 }, props)); }
  function ensureSamples() {
    if (samples) return;
    // Layer arrays are TOP-first (renderScene draws from the end of the array up), so bg goes last.
    const bg  = () => mkShape({ shape: 'rect', shapeW: SIZE, shapeH: SIZE, fill: '#232c3d', x: 48, y: 48 });
    const dim = () => mkShape({ shape: 'ellipse', shapeW: 110, shapeH: 110, fill: '#33415c', x: 70, y: 88 });   // cheap luma variation so glows read
    const hero = mkShape({ shape: 'ellipse', shapeW: 46, shapeH: 46, fill: '#2fd0b5', x: 44, y: 44 });
    const dot  = mkShape({ shape: 'ellipse', shapeW: 12, shapeH: 12, fill: '#ffb86c', x: 74, y: 28 });          // makes warps/displacement legible
    const txt  = FM.makeLayer('text', { text: 'Abc', fontSize: 40, color: '#e8ecf4', x: 48, y: 48, start: 0, duration: 2 });
    // MEDIA sample: chromakey/lumakey/vignette only run in the media draw path, so a shape won't do.
    // One 96² canvas registered through FM.media (a canvas is a valid drawImage source): left half
    // chroma green that the DEFAULT key color+tolerance removes, right half a blue-grey gradient
    // whose dark end lumakey removes, white circle straddling the seam.
    const mc = document.createElement('canvas'); mc.width = SIZE; mc.height = SIZE;
    const g = mc.getContext('2d');
    g.fillStyle = '#18c454'; g.fillRect(0, 0, 48, SIZE);
    const gr = g.createLinearGradient(48, 0, SIZE, SIZE);
    gr.addColorStop(0, '#8fa3c7'); gr.addColorStop(1, '#26314a');
    g.fillStyle = gr; g.fillRect(48, 0, 48, SIZE);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(48, 48, 17, 0, Math.PI * 2); g.fill();
    FM.media.set('_fxthumb', { kind: 'image', el: mc, width: SIZE, height: SIZE, duration: 0 });
    const med = FM.makeLayer('image', { x: 48, y: 48, start: 0, duration: 2 });
    med.id = '_fxthumb';   // media registry is keyed by layer id
    samples = {
      def:   { layers: [dot, hero, dim(), bg()], heroIdx: 1 },
      text:  { layers: [txt, dim(), bg()], heroIdx: 0 },
      media: { layers: [med, dim(), bg()], heroIdx: 0 },
    };
  }

  // Per-type sample/param overrides (extensible). Receives (layers, hero) of the fresh clone.
  // Progress-driven effects (wipes/dissolves/counter) default to a STATIC midpoint param — keyframe
  // it 0→1 so the thumbnail sweeps instead of freezing half-wiped (effect params are evalProp'd).
  function kf01(key) {
    return function (layers, hero) { hero.effects[0].params[key] = { kf: [{ t: 0, v: 0, e: 'linear' }, { t: 1.65, v: 1, e: 'linear' }] }; };
  }
  const OVERRIDES = {
    // Content-motion blur is temporal — it needs something MOVING to blur, so keyframe the hero
    // across the frame. (Strips render in ascending t, which its two-slot plate cache requires.)
    motionflow: function (layers, hero) {
      hero.transform = Object.assign({}, hero.transform, { x: { kf: [{ t: 0, v: 26, e: 'linear' }, { t: 1, v: 70, e: 'linear' }, { t: 2, v: 26, e: 'linear' }] } });
    },
    // copybg: no override needed — the default sample already puts the effect on the HERO, so the
    // backdrop (bg + dim circle) shows through it. Recorded here so nobody "fixes" it onto the bg.
    copybg: null,
    wipe: kf01('progress'), radialwipe: kf01('progress'), dissolve: kf01('amount'), blockdissolve: kf01('amount'),
    counter: kf01('progress'), textprogress: kf01('progress'),
    // Defaults tuned for a 1080p comp fling the hero clean off a 96px frame (drift 120px/s, orbit
    // radius 80) — every probe/strip frame showed empty background, so both cached as static no-ops.
    // Scale the motion to the thumb: a visible drift / a tight on-screen orbit.
    drift: function (layers, hero) { hero.effects[0].params.x = 26; hero.effects[0].params.y = 14; },
    orbit: function (layers, hero) { hero.effects[0].params.radius = 14; hero.effects[0].params.speed = 0.7; },
    // No-ops on this sample at default params: darkglow needs DARK pixels (luma<102) on the hero;
    // replacecolor's default From is red and the hero is teal. Nudge so each visibly does its thing.
    darkglow: function (layers, hero) { hero.fill = '#26436b'; },
    replacecolor: function (layers, hero) { hero.effects[0].params.color = '#2fd0b5'; },
    // Legibility twins: solidmatte(white) was pixel-identical to threshold(0.5) — both a white
    // silhouette. A pink matte reads as "solid fill"; threshold keeps its honest white/black split.
    solidmatte: function (layers, hero) { hero.effects[0].params.color = '#ff3d7f'; },
    // colorbalance's default warm push landed on the same pixels as temperature(+40). Cool it instead —
    // still representative (it's a per-channel balance) and the two thumbs stop being twins.
    colorbalance: function (layers, hero) { hero.effects[0].params.red = -55; hero.effects[0].params.blue = 65; },
  };

  // Fresh scene per type: shallow-clone the layer list (plain objects) and give the TARGET layer
  // its own effects array — never share an effects array between types.
  function sceneFor(type) {
    const reg = FM.fxRegistry.get(type);
    const base = reg && reg.appliesTo === 'text' ? samples.text : reg && reg.appliesTo === 'media' ? samples.media : samples.def;
    const layers = base.layers.map(l => Object.assign({}, l));
    const target = layers[base.heroIdx];
    const inst = FM.fxRegistry.makeInstance(type);
    target.effects = inst ? [inst] : [];
    const ov = OVERRIDES[type];
    if (ov) ov(layers, target);
    return { project: PROJ, layers: layers };
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
      try { renderFrame({ project: PROJ, layers: samples.def.layers }, 0.2); fallbackEntry = { kind: 'static', frame: snap() }; }
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
  const pendingQ = new Map();   // type -> [canvasEl,…] waiting (dedup: many tiles, one generation)
  let queue = [], raf = 0;
  function schedule() { if (!raf && queue.length) raf = requestAnimationFrame(pump); }
  function pump() {
    raf = 0;
    const type = queue.shift();
    if (type != null) {
      const entry = cache.get(type) || generate(type);
      cache.set(type, entry);
      const ws = pendingQ.get(type) || [];
      pendingQ.delete(type);
      ws.forEach(function (cv) { if (cv._fxType === type) paint(cv, entry); });   // skip tiles re-mounted to another type meanwhile
    }
    schedule();
  }

  FM.fxThumbs = {
    /* Take ownership of a tile canvas: size its backing store, paint (now if cached, else queued),
     * add class 'ready' on first paint, and keep repainting animated types until it leaves the DOM. */
    mount: function (cv, type) {
      if (!FM.renderScene || !FM.fxRegistry || !FM.makeLayer) {   // compositor/registry not loaded — nothing to render with
        if (!warned._init) { warned._init = 1; console.warn('fx-thumbs: FM.renderScene/fxRegistry missing'); }
        return;
      }
      ensureSamples();
      if (cv.width !== SIZE) cv.width = SIZE;
      if (cv.height !== SIZE) cv.height = SIZE;
      cv._fxType = type;
      const hit = cache.get(type);
      if (hit) { paint(cv, hit); return; }
      let ws = pendingQ.get(type);
      if (!ws) { pendingQ.set(type, ws = []); queue.push(type); }
      if (ws.indexOf(cv) < 0) ws.push(cv);
      schedule();
    },
    /* Halt the ticker + pending generation (cache retained) — call when the browser closes. */
    stopAll: function () {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      queue.length = 0; pendingQ.clear();
      if (ticker) { clearInterval(ticker); ticker = 0; }
      live.clear();
    },
  };
})(window.FM);
