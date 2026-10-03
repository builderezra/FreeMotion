/* Bundled FreeMotion font catalogue. The files live with the app and keep stable family
 * names in saved projects; user-imported fonts continue through FM.fonts in storage.js. */
(function () {
  'use strict';
  const FM = window.FM = window.FM || {};
  const source = document.currentScript ? document.currentScript.src : document.baseURI;
  // These are fixed names in saved projects. Original drawings live under fonts/original;
  // the unchanged third-party files and their notices live under fonts/open.
  const catalogue = [
    { id: 'fm-aster-round', name: 'FM Aster Round', family: 'FM Aster Round', css: '"FM Aster Round", sans-serif', regular: 'original/fm-aster-round-regular.woff2', bold: 'original/fm-aster-round-bold.woff2', group: 'original' },
    { id: 'fm-circuit-sans', name: 'FM Circuit Sans', family: 'FM Circuit Sans', css: '"FM Circuit Sans", sans-serif', regular: 'original/fm-circuit-sans-regular.woff2', bold: 'original/fm-circuit-sans-bold.woff2', group: 'original' },
    { id: 'inter', name: 'Inter', family: 'Inter', css: 'Inter, sans-serif', regular: 'open/inter/Inter-Regular.woff2', bold: 'open/inter/Inter-Bold.woff2', group: 'open' },
    { id: 'outfit', name: 'Outfit', family: 'Outfit', css: '"Outfit", sans-serif', regular: 'open/outfit/Outfit-Regular.woff2', bold: 'open/outfit/Outfit-Bold.woff2', group: 'open' },
    { id: 'space-grotesk', name: 'Space Grotesk', family: 'Space Grotesk', css: '"Space Grotesk", sans-serif', regular: 'open/space-grotesk/SpaceGrotesk-Regular.woff2', bold: 'open/space-grotesk/SpaceGrotesk-Bold.woff2', group: 'open' },
    { id: 'barlow-condensed', name: 'Barlow Condensed', family: 'Barlow Condensed', css: '"Barlow Condensed", sans-serif', regular: 'open/barlow-condensed/BarlowCondensed-Regular.woff2', bold: 'open/barlow-condensed/BarlowCondensed-Bold.woff2', group: 'open' },
    { id: 'fraunces-72pt-soft', name: 'Fraunces 72pt Soft', family: 'Fraunces 72pt Soft', css: '"Fraunces 72pt Soft", serif', regular: 'open/fraunces-72pt-soft/Fraunces72ptSoft-Bold.ttf', bold: 'open/fraunces-72pt-soft/Fraunces72ptSoft-Bold.ttf', group: 'open' },
    { id: 'cormorant-garamond', name: 'Cormorant Garamond', family: 'Cormorant Garamond', css: '"Cormorant Garamond", serif', regular: 'open/cormorant-garamond/CormorantGaramond-Regular.woff2', bold: 'open/cormorant-garamond/CormorantGaramond-Bold.woff2', group: 'open' },
    { id: 'dm-serif-display', name: 'DM Serif Display', family: 'DM Serif Display', css: '"DM Serif Display", serif', regular: 'open/dm-serif-display/DMSerifDisplay-Regular.ttf', group: 'open' },
    { id: 'bebas-neue', name: 'Bebas Neue', family: 'Bebas Neue', css: '"Bebas Neue", sans-serif', regular: 'open/bebas-neue/BebasNeue-Regular.woff2', group: 'open' },
    { id: 'caveat', name: 'Caveat', family: 'Caveat', css: '"Caveat", cursive', regular: 'open/caveat/Caveat-Regular.ttf', group: 'open' },
    { id: 'lobster', name: 'Lobster', family: 'Lobster', css: '"Lobster", cursive', regular: 'open/lobster/Lobster-Regular.ttf', group: 'open' },
    { id: 'jetbrains-mono', name: 'JetBrains Mono', family: 'JetBrains Mono', css: '"JetBrains Mono", monospace', regular: 'open/jetbrains-mono/JetBrainsMono-Regular.woff2', bold: 'open/jetbrains-mono/JetBrainsMono-Bold.woff2', group: 'open' },
  ];
  const byCss = new Map(catalogue.map(f => [f.css, f]));
  const faces = new Map();
  let refreshTimer = 0;

  function refreshed() {
    // A caller may export on the very next microtask after load() resolves. Invalidate
    // fallback-measured line wraps now; only the preview repaint may be coalesced.
    FM.fontGen = (FM.fontGen || 0) + 1;
    if (refreshTimer) return;
    refreshTimer = setTimeout(function () {
      refreshTimer = 0;
      // Loading the whole picker may finish many files together; repaint once.
      if (FM.requestRender) FM.requestRender();
    }, 60);
  }

  function record(css) { return byCss.get(css) || null; }
  function load(css, bold) {
    const font = record(css);
    if (!font) return Promise.resolve(false);
    const heavy = !!bold && !!font.bold;
    const key = font.id + ':' + (heavy ? '700' : '400');
    let state = faces.get(key);
    if (!state) {
      if (!window.FontFace || !document.fonts) return Promise.reject(new Error('BUNDLED_FONT_UNSUPPORTED'));
      const path = heavy ? font.bold : font.regular;
      const url = new URL('../fonts/' + path + '?v=1', source).href;
      const face = new FontFace(font.family, 'url("' + url + '")', { weight: heavy ? '700' : '400' });
      document.fonts.add(face);
      state = { face: face, promise: null };
      faces.set(key, state);
    }
    if (!state.promise) {
      state.promise = state.face.load().then(function () {
        // Canvas text can have been measured using a fallback before this file arrived.
        refreshed();
        return true;
      }).catch(function () {
        document.fonts.delete(state.face);
        faces.delete(key); // allow a retry after a temporary offline/fetch failure
        throw new Error('BUNDLED_FONT_UNAVAILABLE:' + font.name);
      });
    }
    return state.promise;
  }

  function neededForScene(scene) {
    const needed = new Map();
    (scene && scene.layers || []).forEach(function (layer) {
      if (!layer || (layer.type !== 'text' && layer.type !== 'caption')) return;
      const font = record(layer.fontFamily);
      if (font) needed.set(font.id + ':' + !!layer.bold, [font.css, !!layer.bold]);
    });
    return Array.from(needed.values());
  }
  function forScene(scene) {
    return Promise.all(neededForScene(scene).map(pair => load(pair[0], pair[1])));
  }

  FM.studioFonts = {
    list() { return catalogue.slice(); },
    has(css) { return byCss.has(css); },
    load: load,
    usesScene(scene) { return neededForScene(scene).length > 0; },
    forScene: forScene,
    warmPreviews() { return Promise.allSettled(catalogue.flatMap(font => font.bold ? [load(font.css, false), load(font.css, true)] : [load(font.css, false)])); },
  };
  // New text uses Inter. Load its bundled face during boot so the first canvas frame does
  // not measure a device-dependent fallback before the user opens the font picker.
  load('Inter, sans-serif', false).catch(function () {});
})();
