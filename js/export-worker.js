/* FreeMotion — shared-compositor export worker (#47).
 * This file is both the page client and the Worker entry, so its versioned script URL is
 * also the Worker URL. Dependencies use the exact URLs loaded by index.html/PWA cache.
 * Enable only the scene features whose page/worker output has been verified. Unknown
 * fields fail closed to the existing renderer; they must never silently lose their effect.
 */
(function (root) {
  'use strict';
  const REVISION = 'canvas-worker-18';
  const dependencies = ['render-canvas.js', 'scene.js', 'eases.js', 'compositor.js', 'fx-registry.js'];

  const nativeBlends = new Set('normal add screen multiply overlay darken lighten color-dodge color-burn hard-light soft-light difference exclusion hue saturation color luminosity'.split(' '));
  const nativeFilters = new Set(['blur', 'brightness', 'contrast', 'saturate', 'hue', 'grayscale', 'sepia', 'invert']);
  function needsFilter(scene) {
    return scene.layers.some(l => (l.effects || []).some(fx => fx.enabled !== false && nativeFilters.has(fx.type)));
  }

  function needsRoundRect(scene) {
    return scene.layers.some(l => l.shape === 'rect' && l.cornerRadius > 0);
  }

  function blendProbe(scene) {
    const modes = Array.from(new Set(scene.layers.map(layer => layer.blendMode || 'normal'))).filter(mode => mode !== 'normal');
    if (!modes.length) return [];
    const canvas = root.FM.createRenderCanvas(1, 1), ctx = canvas.getContext('2d', {willReadFrequently:true});
    if (!ctx) throw new Error('Canvas blending unavailable');
    return modes.map(mode => {
      const operation = root.FM.nativeBlendOperation(mode);
      if (!nativeBlends.has(mode) || !operation) throw new Error('Unsupported canvas blend');
      ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#3b7fc099'; ctx.fillRect(0, 0, 1, 1);
      ctx.globalCompositeOperation = operation;
      if (ctx.globalCompositeOperation !== operation) throw new Error('Canvas blend unavailable');
      ctx.fillStyle = '#e56b39b3'; ctx.fillRect(0, 0, 1, 1);
      return [mode, operation, ...ctx.getImageData(0, 0, 1, 1).data];
    });
  }

  if (typeof document === 'undefined') {
    let scene, canvas, ctx;
    let videoIds = [];
    function setVideoFrames(frames) {
      for (const id of videoIds) {
        const previous = root.FM.media.get(id);
        if (previous && previous.el) previous.el.close();
        root.FM.media.delete(id);
      }
      videoIds = frames.map(source => source.id);
      for (const source of frames) root.FM.media.set(source.id,
        {kind:'image', el:source.bitmap, width:source.width, height:source.height});
    }
    root.onmessage = async function (event) {
      const msg = event.data;
      let bitmap;
      try {
        if (msg.type === 'init') {
          if (scene) throw new Error('Renderer already initialized');
          importScripts(...msg.urls);
          scene = msg.scene;
          root.FM.scene = scene;
          // Group pivots measure every member, including zero-picture audio. Retain dimensions
          // even for sources without a transferred picture; an absent record means a 100px placeholder.
          root.FM.media = new Map((msg.media || []).map(source => [source.id,
            {kind:source.kind, el:null, width:source.width, height:source.height, duration:source.duration}]));
          for (const source of (msg.images || [])) root.FM.media.set(source.id,
            {kind:'image', el:source.bitmap, width:source.width, height:source.height});
          setVideoFrames(msg.videos || []);
          root.FM._exporting = true;
          root.FM._exportTransparent = !!msg.transparent;
          if (JSON.stringify(blendProbe(scene)) !== JSON.stringify(msg.blends || [])) throw new Error('Worker canvas blends differ from the page');
          for (const source of (msg.fonts || [])) {
            if (!root.FontFace || !root.fonts) throw new Error('Worker fonts unavailable');
            const face = new root.FontFace(source.family, source.bytes, source.weight ? {weight:source.weight} : undefined);
            await face.load(); root.fonts.add(face);
          }
          root.FM.fontGen = (msg.fonts || []).length;
          if (msg.textSpacing != null && root.FM.textSpacingOK().letter !== msg.textSpacing) {
            throw new Error('Worker text spacing differs from the page');
          }
          if (needsFilter(scene) && !root.FM.ctxFilterOK()) throw new Error('Worker canvas filters unavailable');
          canvas = root.FM.createRenderCanvas(scene.project.width, scene.project.height);
          ctx = canvas.getContext('2d');
          if (!ctx || typeof canvas.transferToImageBitmap !== 'function') throw new Error('Worker canvas unavailable');
          if (needsRoundRect(scene) && typeof ctx.roundRect !== 'function') throw new Error('Worker rounded rectangles unavailable');
          // Probe actual compositor and bitmap support before the page selects a resume job.
          root.FM.time = msg.time;
          root.FM.renderScene(ctx, scene, msg.time);
          bitmap = canvas.transferToImageBitmap();
          bitmap.close(); bitmap = null;
          root.postMessage({id:msg.id, ready:true});
        } else if (msg.type === 'render') {
          if (!ctx || !Number.isFinite(msg.time)) throw new Error('Invalid frame request');
          setVideoFrames(msg.videos || []);
          root.FM.time = msg.time;
          root.FM.renderScene(ctx, scene, msg.time);
          bitmap = canvas.transferToImageBitmap();
          root.postMessage({id:msg.id, bitmap}, [bitmap]);
          bitmap = null; // the page now owns it
        } else throw new Error('Unknown renderer request');
      } catch (e) {
        if (bitmap) bitmap.close();
        root.postMessage({id:msg.id, error:e.message || String(e)});
      }
    };
    return;
  }

  const FM = root.FM = root.FM || {};
  const entryURL = document.currentScript && document.currentScript.src;
  const layerKeys = new Set(('id type name visible locked solo blendMode start duration trimStart reversed effects clipColor volume fadeIn fadeOut speed frameBlend wiggle parent parentMode parentWeight transform shape shapeW shapeH fill stroke cornerRadius sides fillMode fillGradient').split(' '));
  const containerLayerKeys = new Set([...layerKeys, 'collapsed', 'maskGroup']);
  const audioLayerKeys = new Set([...layerKeys, 'audioFx', 'muted', 'audioOnly']);
  const imageLayerKeys = new Set([...layerKeys, 'crop']);
  const videoLayerKeys = new Set([...audioLayerKeys, 'crop']);
  const textLayerKeys = new Set([...layerKeys, 'text', 'fontSize', 'color', 'fontFamily', 'align',
    'bold', 'italic', 'letterSpacing', 'lineHeight', 'wrapWidth', 'textAnim', 'textCurve']);
  const textAnimKeys = new Set(['preset','unit','durIn','durOut','stagger']);
  const textPresets = new Set(['none','fade','fade-up','typewriter','pop','slide','drop','spin','zoom-out','stretch','wave','jitter']);
  const systemFonts = new Set(['sans-serif','serif','monospace','cursive','system-ui',
    'Helvetica, Arial, sans-serif','Georgia, serif','Times New Roman, serif','Courier New, monospace',
    'Impact, sans-serif','Verdana, sans-serif','Trebuchet MS, sans-serif','Palatino, serif','Comic Sans MS, cursive']);
  const MAX_FONT_BYTES = 16 * 1024 * 1024;
  const MAX_VIDEO_PIXELS = 8 * 1024 * 1024, MAX_VIDEO_BYTES = 64 * 1024 * 1024;
  const cropKeys = new Set(['x','y','w','h']);
  const MAX_IMAGE_PIXELS = 8 * 1024 * 1024, MAX_IMAGE_BYTES = 32 * 1024 * 1024;
  const transformKeys = new Set('x y scale rotation opacity anchorX anchorY'.split(' '));
  const gradientKeys = new Set('enabled type c0 c1 angle ox oy'.split(' '));
  const projectKeys = new Set('name width height fps duration background markers sizePicked thumbPinned loopIn loopOut notes comments aiIntent ofTemplate ofTemplateRev returnTo ofElement fromTemplate'.split(' '));
  const projectMetadataKeys = new Set('sizePicked thumbPinned loopIn loopOut notes comments aiIntent ofTemplate ofTemplateRev returnTo ofElement fromTemplate'.split(' '));
  const effectKeys = new Set(['type', 'enabled', 'params']);
  const shapeKinds = new Set('rect ellipse line arc pie semicircle ring polygon star triangle heart plus arrow chevron trapezoid parallelogram speech moon snowflake shield droplet cloud play spiral sparkle bolt puzzle pushpin flag paperplane house laurel bookmark flame banner ribbon wreath diamond plane umbrella bomb boat magnifier sun person rocket woman stamp check thumbsup pointhand envelope key car squircle cross pin lock gear crown eye note starburst clock'.split(' '));
  const strokeKeys = new Set(['enabled', 'width', 'color', 'position']);
  const openShapes = new Set(['line', 'arc', 'spiral']);
  // This is a tested capability boundary, not a second effect schema. Defaults still come from
  // the shared compositor/registry; adding a parameter here requires worker parity coverage.
  const effectParams = new Map([
    ['brightness', new Set(['amount'])], ['blur', new Set(['radius'])],
    ['gamma', new Set(['gamma', 'red', 'green', 'blue'])],
    ['posterize', new Set(['levels', 'mix', 'channels', 'gamma'])],
    ['contrast', new Set(['amount'])], ['saturate', new Set(['amount'])],
    ['hue', new Set(['deg'])], ['grayscale', new Set(['amount'])],
    ['sepia', new Set(['amount'])], ['invert', new Set(['amount'])],
    ['temperature', new Set(['amount', 'tint', 'preserve'])],
    ['vibrance', new Set(['amount', 'skin', 'highlights'])],
    ['exposure', new Set(['stops', 'offset', 'rolloff'])]
  ]);
  const propKeys = new Set(['kf', 'loopMode']);
  const keyframeKeys = new Set(['t', 'v', 'e', 'bez', 'ez', 'ti', 'to']);
  const easeKeys = new Set(['fam', 'preset', 'p']);
  function knownKeys(value, keys) {
    return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => k[0] === '_' || keys.has(k));
  }
  function numericProp(p) { return supportedProp(p, Number.isFinite); }
  const hexColour = value => typeof value === 'string' && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
  function supportedProp(p, validValue) {
    if (validValue(p)) return true;
    if (!knownKeys(p, propKeys) || !Array.isArray(p.kf)) return false;
    if (p.loopMode != null && !['none','cycle','pingpong'].includes(p.loopMode)) return false;
    return p.kf.every(k => {
      if (!knownKeys(k, keyframeKeys) || !Number.isFinite(k.t) || !validValue(k.v)) return false;
      if (k.e != null && typeof k.e !== 'string') return false;
      if ((k.ti != null && !Number.isFinite(k.ti)) || (k.to != null && !Number.isFinite(k.to))) return false;
      if (k.bez != null && (!Array.isArray(k.bez) || k.bez.length !== 4 || !k.bez.every(Number.isFinite))) return false;
      if (k.ez != null) {
        if (!knownKeys(k.ez, easeKeys) || typeof k.ez.fam !== 'string' || typeof k.ez.preset !== 'string') return false;
        if (k.ez.p != null && (typeof k.ez.p !== 'object' || Array.isArray(k.ez.p) || !Object.values(k.ez.p).every(Number.isFinite))) return false;
      }
      return true;
    });
  }
  function supportedStroke(stroke) {
    if (stroke == null) return true;
    if (!knownKeys(stroke, strokeKeys)) return false;
    if (stroke.enabled != null && typeof stroke.enabled !== 'boolean') return false;
    // Open shapes use width even when the border is disabled. Validate the whole envelope.
    if (stroke.width != null && !numericProp(stroke.width)) return false;
    if (stroke.color != null && !supportedProp(stroke.color, hexColour)) return false;
    return stroke.position == null || ['center', 'inside', 'outside'].includes(stroke.position);
  }
  function supportedEffects(effects) {
    if (effects == null) return true;
    return Array.isArray(effects) && effects.every(fx => {
      if (!knownKeys(fx, effectKeys) || !effectParams.has(fx.type)) return false;
      if (fx.enabled != null && typeof fx.enabled !== 'boolean') return false;
      if (fx.params == null) return true;
      return knownKeys(fx.params, effectParams.get(fx.type)) && Object.keys(fx.params).every(k => k[0] === '_' || numericProp(fx.params[k]));
    });
  }
  function supportedAudio(layer) {
    const media = FM.media && FM.media.get(layer.id), el = media && media.el;
    // Loaded metadata is the source of truth: Extract Audio can retain a real video picture.
    // Only zero-picture files enter this path; the existing page mixer still handles their sound.
    if (!media || media.kind !== 'video' || !media.file || !el || !(el.readyState >= 1)
        || media.width !== 0 || media.height !== 0 || el.videoWidth !== 0 || el.videoHeight !== 0) return false;
    if (media.frameCache || media._building || layer.reversed || layer.frameBlend) return false;
    if ((layer.effects != null && (!Array.isArray(layer.effects) || layer.effects.length)) || layer.stroke || layer.fill != null
        || layer.fillMode != null || layer.fillGradient != null) return false;
    // Loudness Match reads FM.media while building its node; a captured registry must not be ignored.
    if (layer.audioFx != null && (!Array.isArray(layer.audioFx)
        || layer.audioFx.some(f => f && f.type === 'loudnessmatch' && f.enabled !== false))) return false;
    if (layer.muted != null && typeof layer.muted !== 'boolean') return false;
    if (['start','duration','trimStart','fadeIn','fadeOut'].some(k => layer[k] != null && !Number.isFinite(layer[k]))) return false;
    return ['volume','speed'].every(k => layer[k] == null || numericProp(layer[k]));
  }
  function supportedImage(layer) {
    const media = FM.media && FM.media.get(layer.id), el = media && media.el;
    if (!media || media.kind !== 'image' || !media.file || !el || !el.complete
        || !['image/jpeg','image/png'].includes(media.file.type)
        || !Number.isInteger(media.width) || !Number.isInteger(media.height)
        || media.width <= 0 || media.height <= 0
        || el.naturalWidth !== media.width || el.naturalHeight !== media.height) return false;
    if (media.frameCache || media._building || layer._cropEditing || layer.stroke || layer.fill != null
        || layer.fillMode != null || layer.fillGradient != null) return false;
    if (layer.crop != null && (!knownKeys(layer.crop, cropKeys)
        || Object.keys(layer.crop).some(k => k[0] !== '_' && !Number.isFinite(layer.crop[k])))) return false;
    return supportedEffects(layer.effects);
  }
  function supportedVideo(layer) {
    const media = FM.media && FM.media.get(layer.id), el = media && media.el;
    if (!media || media.kind !== 'video' || !media.file || !el || el.readyState < 1
        || !Number.isInteger(media.width) || !Number.isInteger(media.height)
        || media.width <= 0 || media.height <= 0
        || el.videoWidth !== media.width || el.videoHeight !== media.height
        || !Number.isFinite(media.duration) || media.duration <= 0) return false;
    if (media.frameCache || media._building || layer.reversed || layer.frameBlend || layer._cropEditing
        || layer.stroke || layer.fill != null || layer.fillMode != null || layer.fillGradient != null) return false;
    if (layer.speed != null && layer.speed !== 1) return false;
    // Loudness Match reads FM.media while building its node; a captured registry must not be ignored.
    if (layer.audioFx != null && (!Array.isArray(layer.audioFx)
        || layer.audioFx.some(f => f && f.type === 'loudnessmatch' && f.enabled !== false))) return false;
    if (layer.muted != null && typeof layer.muted !== 'boolean') return false;
    if (['start','duration','trimStart','fadeIn','fadeOut'].some(k => layer[k] != null && !Number.isFinite(layer[k]))) return false;
    if (layer.volume != null && !numericProp(layer.volume)) return false;
    if (layer.crop != null && (!knownKeys(layer.crop, cropKeys)
        || Object.keys(layer.crop).some(k => k[0] !== '_' && !Number.isFinite(layer.crop[k])))) return false;
    return supportedEffects(layer.effects);
  }
  function fontSource(layer) {
    const family = layer.fontFamily || 'sans-serif';
    if (FM.studioFonts && FM.studioFonts.has(family)) return FM.studioFonts.source(family, !!layer.bold);
    if (systemFonts.has(family)) return {family, file:null};
    if (typeof family !== 'string' || !/^FMF[a-z0-9]+, sans-serif$/i.test(family)
        || !FM.fonts || !FM.fonts.loadedSource) return null;
    return FM.fonts.loadedSource(family.split(',')[0]);
  }
  function supportedText(layer) {
    const source = fontSource(layer);
    if (typeof layer.text !== 'string' || !source) return false;
    if (!Number.isFinite(layer.fontSize) || layer.fontSize <= 0 || !supportedProp(layer.color, hexColour)) return false;
    if (layer.align != null && !['left','center','right'].includes(layer.align)) return false;
    if (['bold','italic'].some(k => layer[k] != null && typeof layer[k] !== 'boolean')) return false;
    if (['letterSpacing','lineHeight','wrapWidth'].some(k => layer[k] != null && !Number.isFinite(layer[k]))) return false;
    if ((layer.lineHeight != null && layer.lineHeight <= 0) || (layer.wrapWidth != null && layer.wrapWidth < 0)) return false;
    if (layer.textCurve != null && !Number.isFinite(layer.textCurve)) return false;
    const animation = layer.textAnim;
    if (animation != null) {
      if (!knownKeys(animation, textAnimKeys)) return false;
      if (animation.preset && !textPresets.has(animation.preset)) return false;
      if (animation.unit != null && !['char','word','line'].includes(animation.unit)) return false;
      if (['durIn','durOut','stagger'].some(k => animation[k] != null && (!Number.isFinite(animation[k]) || animation[k] < 0))) return false;
    }
    if (!supportedStroke(layer.stroke)) return false;
    const mode = FM.fillModeOf(layer), gradient = layer.fillGradient;
    if (!['solid','gradient'].includes(mode)) return false;
    if (gradient != null) {
      if (!knownKeys(gradient, gradientKeys) || !['linear','radial'].includes(gradient.type)
          || !hexColour(gradient.c0) || !hexColour(gradient.c1)) return false;
      if (gradient.enabled != null && typeof gradient.enabled !== 'boolean') return false;
      if (['angle','ox','oy'].some(k => gradient[k] != null && !Number.isFinite(gradient[k]))) return false;
    } else if (mode === 'gradient') return false;
    return supportedEffects(layer.effects);
  }
  function supportedContainer(layer) {
    if (layer.collapsed != null && typeof layer.collapsed !== 'boolean') return false;
    if (layer.maskGroup != null && layer.maskGroup !== false) return false;
    if (layer.fill != null || layer.fillGradient != null || (layer.fillMode != null && layer.fillMode !== 'none')) return false;
    if (!supportedStroke(layer.stroke) || (layer.stroke && layer.stroke.enabled)) return false;
    if (layer.type === 'group') {
      if (!supportedEffects(layer.effects)) return false;
    } else {
      if (layer.effects != null && (!Array.isArray(layer.effects) || layer.effects.length)) return false;
      if (layer.transform.opacity !== 1) return false;
    }
    if (['anchorX','anchorY'].some(k => layer.transform[k] != null && !Number.isFinite(layer.transform[k]))) return false;
    return ['start','duration'].every(k => Number.isFinite(layer[k]));
  }
  function supportedParents(scene) {
    if (!scene.layers.some(layer => layer && (layer.parent || ['group','null'].includes(layer.type)))) return true;
    const byId = new Map();
    for (const layer of scene.layers) {
      if (!layer || typeof layer.id !== 'string' || !layer.id || byId.has(layer.id)) return false;
      byId.set(layer.id, layer);
    }
    for (const layer of scene.layers) {
      if (layer.parent && layer.parentMode != null && layer.parentMode !== 'normal') return false;
      const seen = new Set([layer.id]); let id = layer.parent;
      while (id) {
        const parent = byId.get(id);
        if (!parent || !['group','null'].includes(parent.type) || seen.has(id) || seen.size >= 64) return false;
        seen.add(id); id = parent.parent;
      }
    }
    return true;
  }
  function eligible(scene) {
    if (!scene || !knownKeys(scene.project, projectKeys) || !Array.isArray(scene.layers)) return false;
    if (!supportedParents(scene)) return false;
    const p = scene.project;
    if (!Number.isInteger(p.width) || !Number.isInteger(p.height) || p.width < 1 || p.height < 1) return false;
    // These preview overrides are currently read by the main renderer during export too.
    if ((FM.isolate && FM.isolate.mode) || FM._dragOrderIds) return false;
    // Recursion removes effects by identity and registry hydration mutates params. A JSON snapshot
    // separates aliases, potentially changing defaults/order even across layers. Persisted documents
    // are trees; live callers sharing these objects keep the original renderer's exact semantics.
    const fonts = new Map(); let fontBytes = 0;
    for (const layer of scene.layers) {
      if (!layer || layer.type !== 'text') continue;
      if (!supportedText(layer)) return false;
      const source = fontSource(layer);
      if ((!source.file && !source.url) || fonts.has(source.family + ':' + (source.weight || '400'))) continue;
      fonts.set(source.family + ':' + (source.weight || '400'), true); fontBytes += source.file ? source.file.size : 0;
      if (!Number.isFinite(fontBytes) || fontBytes > MAX_FONT_BYTES) return false;
    }
    let videoPixels = 0, videoBytes = 0, videoCount = 0;
    for (const layer of scene.layers) {
      if (!layer || layer.type !== 'video' || supportedAudio(layer)) continue;
      if (!supportedVideo(layer)) return false;
      const media = FM.media.get(layer.id);
      videoPixels += media.width * media.height; videoBytes += media.file.size; videoCount++;
      if (!Number.isFinite(videoBytes) || videoPixels > MAX_VIDEO_PIXELS || videoBytes > MAX_VIDEO_BYTES || videoCount > 4) return false;
    }
    let imagePixels = 0, imageBytes = 0;
    for (const layer of scene.layers) {
      if (!layer || layer.type !== 'image') continue;
      if (!supportedImage(layer)) return false;
      const media = FM.media.get(layer.id);
      imagePixels += media.width * media.height; imageBytes += media.file.size;
      if (!Number.isFinite(imageBytes) || imagePixels > MAX_IMAGE_PIXELS || imageBytes > MAX_IMAGE_BYTES) return false;
    }
    const effectObjects = new Set();
    for (const layer of scene.layers) {
      if (!layer || !Array.isArray(layer.effects)) continue;
      for (const fx of layer.effects) {
        for (const value of [fx, fx && fx.params]) {
          if (!value || typeof value !== 'object') continue;
          if (effectObjects.has(value)) return false;
          effectObjects.add(value);
        }
      }
    }
    return scene.layers.every(l => {
      if (!l || !['shape','video','image','text','group','null'].includes(l.type)) return false;
      if (!knownKeys(l, ['group','null'].includes(l.type) ? containerLayerKeys : l.type === 'video' ? videoLayerKeys : l.type === 'image' ? imageLayerKeys : l.type === 'text' ? textLayerKeys : layerKeys) || !knownKeys(l.transform, transformKeys)) return false;
      // JSON turns nonfinite values into null; retain main rendering for unsupported transforms.
      if (Object.keys(l.transform).some(k => k[0] !== '_' && !numericProp(l.transform[k]))) return false;
      if ((l.wiggle && l.wiggle.enabled) || (l.blendMode != null && !nativeBlends.has(l.blendMode))) return false;
      if (FM.fxPreviewListFor && FM.fxPreviewListFor(l)) return false;
      if (l.type === 'group' || l.type === 'null') return supportedContainer(l);
      if (l.type === 'video') return supportedAudio(l) || supportedVideo(l);
      if (l.type === 'image') return supportedImage(l);
      if (l.type === 'text') return supportedText(l);
      if (!shapeKinds.has(l.shape)) return false;
      if (!Number.isFinite(l.shapeW) || l.shapeW <= 0 || !Number.isFinite(l.shapeH) || l.shapeH <= 0) return false;
      if (l.cornerRadius != null && (!Number.isFinite(l.cornerRadius) || l.cornerRadius < 0 || (l.cornerRadius > 0 && l.shape !== 'rect'))) return false;
      if (['polygon', 'star'].includes(l.shape) && l.sides != null && (!Number.isInteger(l.sides) || l.sides < 3 || l.sides > 12)) return false;
      if (!supportedStroke(l.stroke)) return false;
      // Closed inside borders clip a double-width stroke. DOM and Offscreen canvases currently
      // rasterize that clip differently (measured up to 111 channel values), even on the same page.
      // Preserve the page result until that operation has a shared, verified drawing path. Open
      // shapes ignore border position, and disabled/static-zero closed borders never clip.
      if (l.stroke && l.stroke.enabled && l.stroke.position === 'inside' && !openShapes.has(l.shape)
          && l.stroke.width != null && l.stroke.width !== 0) return false;
      if (!supportedEffects(l.effects)) return false;
      const mode = FM.fillModeOf(l);
      if (!['solid', 'gradient', 'none'].includes(mode)) return false;
      if (mode === 'gradient' && (!knownKeys(l.fillGradient, gradientKeys) || !['linear', 'radial'].includes(l.fillGradient.type))) return false;
      return true;
    });
  }
  function sourceURLs() {
    const scripts = Array.from(document.querySelectorAll('script[src]'), s => s.src);
    return dependencies.map(name => {
      const url = scripts.find(src => new URL(src).pathname.endsWith('/js/' + name));
      if (!url) throw new Error('Missing renderer dependency: ' + name);
      return url;
    });
  }

  const captures = new WeakSet(), resources = new WeakMap();
  function capture(scene, options) {
    // Eligibility must inspect the live tree before JSON splits shared effect objects or drops
    // private preview fields. The detached document then belongs to this export from its first await.
    if (!eligible(scene)) return null;
    try {
      const media = new Map(), images = [], videos = [], fonts = new Map();
      for (const layer of scene.layers) {
        if (layer.type === 'text') {
          const source = fontSource(layer);
          if (source.file || source.url) fonts.set(source.family + ':' + (source.weight || '400'), source);
        }
        if (layer.type !== 'video' && layer.type !== 'image') continue;
        const source = FM.media.get(layer.id);
        if (layer.type === 'image') {
          images.push(layer.id);
          media.set(layer.id, {kind:'image', el:null, file:source.file, width:source.width, height:source.height});
          continue;
        }
        if (source.width > 0 && source.height > 0) {
          videos.push(layer.id);
          media.set(layer.id, {kind:'video', el:null, url:null, file:source.file, width:source.width,
            height:source.height, duration:source.duration, audioBuffer:source.audioBuffer});
          continue;
        }
        // Copy the record as well as the map: replacing/deleting live media mutates the old record.
        // No element is needed for zero-picture layers, so fallback cannot seek or draw a later file.
        media.set(layer.id, {kind:'video', el:null, width:0, height:0, duration:source.duration,
          file:source.file, audioBuffer:source.audioBuffer});
      }
      const document = JSON.parse(JSON.stringify(scene, FM.jsonReplacer));
      // Home, template, loop and note metadata never changes pixels; keep the render snapshot small.
      for (const key of projectMetadataKeys) delete document.project[key];
      document.layers.forEach(layer => FM._effectiveFx(layer, options && options.time || 0));
      const captured = Object.freeze({document, media, images:Object.freeze(images), videos:Object.freeze(videos), fonts:Object.freeze(Array.from(fonts.values())), transparent:!!FM._exportTransparent});
      captures.add(captured);
      resources.set(captured, {disposed:false, ready:false, promise:null, manifest:'', fontManifest:'', videoManifest:'', fontData:[]});
      return captured;
    } catch (e) { return null; }
  }

  function closeImages(captured) {
    for (const id of captured.images) {
      const media = captured.media.get(id);
      if (media.el) { try { media.el.close(); } catch (e) {} media.el = null; }
    }
  }
  function closeVideos(captured) {
    for (const id of captured.videos) {
      const media = captured.media.get(id);
      if (media.el) { try { media.el.pause(); media.el.removeAttribute('src'); media.el.load(); } catch (e) {} media.el = null; }
      if (media.url) { root.URL.revokeObjectURL(media.url); media.url = null; }
    }
  }
  function closeSources(captured) { closeImages(captured); closeVideos(captured); }
  function waitVideo(media, time, state, cancelled) {
    return new Promise((resolve, reject) => {
      const el = media.el;
      let done = false, timer, timeout;
      const events = ['loadedmetadata','loadeddata','canplay','seeked','error'];
      const finish = error => {
        if (done) return;
        done = true; clearInterval(timer); clearTimeout(timeout);
        events.forEach(name => el.removeEventListener(name, check));
        if (error) reject(error); else resolve();
      };
      const check = () => {
        if (state.disposed || cancelled()) return finish(new Error('CANCELLED'));
        if (el.error) return finish(new Error('Captured video could not be decoded'));
        if (el.readyState < 1) return;
        const target = Math.min(Math.max(time, 0), Math.max(0, media.duration - .001));
        if (el.seeking) return;
        if (Math.abs(el.currentTime - target) >= .0001) {
          try { el.currentTime = target; } catch (e) { finish(e); }
          return;
        }
        if (el.readyState >= 2) finish();
      };
      events.forEach(name => el.addEventListener(name, check));
      timer = setInterval(check, 50);
      timeout = setTimeout(() => finish(new Error('Captured video frame timed out')), 20000);
      check();
    });
  }
  async function seekVideos(captured, time, options) {
    const state = resources.get(captured), cancelled = options && options.shouldCancel || (() => false);
    if (!state || state.disposed || cancelled()) throw new Error('CANCELLED');
    const active = [], solo = captured.document.layers.some(layer => layer.solo);
    for (const id of captured.videos) {
      const layer = captured.document.layers.find(layer => layer.id === id);
      if (layer.visible === false || (solo && !layer.solo)) continue;
      const local = FM.layerLocalTime(layer, time);
      if (local == null) continue;
      const media = captured.media.get(id);
      if (!media.el) throw new Error('Captured video source is unavailable');
      await waitVideo(media, local, state, cancelled); active.push(id);
    }
    return active;
  }
  async function videoFrames(captured, time, options) {
    const frames = [], cancelled = options && options.shouldCancel || (() => false);
    try {
      for (const id of await seekVideos(captured, time, options)) {
        // Keep decoded video frames as video sources: ImageBitmap changes transformed edge coverage.
        const media = captured.media.get(id), bitmap = new root.VideoFrame(media.el, {timestamp:Math.round(time * 1e6)});
        frames.push({id, width:media.width, height:media.height, bitmap});
        if (resources.get(captured).disposed || cancelled()) throw new Error('CANCELLED');
      }
      return frames;
    } catch (e) { frames.forEach(source => source.bitmap.close()); throw e; }
  }
  function release(captured) {
    const state = resources.get(captured);
    if (!state || state.disposed) return;
    state.disposed = true; closeSources(captured); state.fontData = [];
  }
  function mediaID(captured) {
    const state = resources.get(captured);
    if (!state) return '';
    return [state.manifest ? 'image-files-v1=' + state.manifest : '',
      state.fontManifest ? 'font-files-v1=' + state.fontManifest : '',
      state.videoManifest ? 'video-files-v1=' + state.videoManifest : ''].filter(Boolean).join(';');
  }
  function staticImage(bytes) {
    const data = new Uint8Array(bytes);
    if (data[0] === 255 && data[1] === 216 && data[2] === 255) return true;
    if (data.length < 20 || ![137,80,78,71,13,10,26,10].every((v,i) => data[i] === v)) return false;
    const view = new DataView(bytes);
    for (let at = 8; at + 12 <= data.length;) {
      const length = view.getUint32(at), type = String.fromCharCode(...data.subarray(at+4,at+8));
      if (at + 12 + length > data.length || type === 'acTL') return false; // APNG stays on the main renderer.
      if (type === 'IEND') return true;
      at += 12 + length;
    }
    return false;
  }
  async function prepare(captured, options) {
    const state = resources.get(captured), cancelled = options && options.shouldCancel || (() => false);
    if (cancelled()) throw new Error('CANCELLED');
    if (!state || state.disposed) return false;
    if ((!captured.images.length && !captured.fonts.length && !captured.videos.length) || state.ready) return true;
    if (state.promise) return state.promise;
    if ((captured.images.length && typeof root.createImageBitmap !== 'function') || (captured.videos.length && typeof root.VideoFrame !== 'function') || !root.crypto || !root.crypto.subtle) return false;
    state.promise = (async () => {
      const manifest = [], fontManifest = [], videoManifest = [];
      const check = () => { if (state.disposed || cancelled()) throw new Error('CANCELLED'); };
      try {
        for (const id of captured.images) {
          const media = captured.media.get(id);
          // File is immutable and retained before the first await; live element teardown is harmless.
          const bytes = await media.file.arrayBuffer(); check();
          if (!staticImage(bytes)) { closeSources(captured); return false; }
          const hash = await root.crypto.subtle.digest('SHA-256', bytes); check();
          const bitmap = await root.createImageBitmap(media.file);
          if (state.disposed || cancelled()) { bitmap.close(); check(); }
          if (bitmap.width !== media.width || bitmap.height !== media.height) {
            bitmap.close(); closeSources(captured); return false;
          }
          media.el = bitmap;
          const digest = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
          manifest.push([id,media.width,media.height,digest]);
        }
        for (const id of captured.videos) {
          const media = captured.media.get(id);
          const bytes = await media.file.arrayBuffer(); check();
          const hash = await root.crypto.subtle.digest('SHA-256', bytes); check();
          const digest = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
          if (!media.el) {
            media.url = root.URL.createObjectURL(media.file);
            media.el = document.createElement('video');
            media.el.muted = true; media.el.playsInline = true; media.el.preload = 'auto';
            media.el.src = media.url; media.el.load();
          }
          await waitVideo(media, 0, state, cancelled); check();
          if (media.el.videoWidth !== media.width || media.el.videoHeight !== media.height) {
            closeSources(captured); return false;
          }
          videoManifest.push([id,media.width,media.height,media.duration,digest]);
        }
        let loadedFontBytes = 0;
        for (const source of captured.fonts) {
          let bytes;
          if (source.file) bytes = await source.file.arrayBuffer();
          else {
            const response = await root.fetch(source.url);
            if (!response.ok) throw new Error('Bundled font unavailable');
            bytes = await response.arrayBuffer();
          }
          check(); loadedFontBytes += bytes.byteLength;
          if (loadedFontBytes > MAX_FONT_BYTES) throw new Error('Worker font budget exceeded');
          const hash = await root.crypto.subtle.digest('SHA-256', bytes); check();
          const digest = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
          state.fontData.push({family:source.family, weight:source.weight || '400', bytes});
          fontManifest.push([source.family,source.weight || '400',digest]);
        }
        state.manifest = manifest.length ? JSON.stringify(manifest) : '';
        state.fontManifest = fontManifest.length ? JSON.stringify(fontManifest) : '';
        state.videoManifest = videoManifest.length ? JSON.stringify(videoManifest) : ''; state.ready = true;
        return true;
      } catch (e) {
        closeSources(captured); state.fontData = [];
        if (state.disposed || cancelled() || e.message === 'CANCELLED') throw new Error('CANCELLED');
        return false; // Decoder/capability failure retains the ordinary main-renderer path.
      }
    })();
    return state.promise;
  }

  async function create(scene, options) {
    options = options || {};
    const cancelled = options.shouldCancel || (() => false);
    if (cancelled()) throw new Error('CANCELLED');
    const captured = Object.prototype.hasOwnProperty.call(options, 'capture')
      ? (captures.has(options.capture) ? options.capture : null) : capture(scene, options);
    const ownsCapture = !Object.prototype.hasOwnProperty.call(options, 'capture');
    const fallback = () => { if (ownsCapture && captured) release(captured); return null; };
    if (!entryURL || typeof root.Worker !== 'function' || typeof root.OffscreenCanvas !== 'function' || !captured) return fallback();
    if ((captured.images.length || captured.fonts.length || captured.videos.length) && !await prepare(captured, options)) return fallback();
    const snapshot = captured.document;
    // A partially loaded page may still render without registry defaults. Do not choose a worker
    // that would hydrate different values from the preview after independently loading that script.
    if (snapshot.layers.some(l => l.effects && l.effects.length) && (!FM.fxRegistry || typeof FM.fxRegistry.paramsOf !== 'function')) return fallback();
    if (needsFilter(snapshot) && (!FM.ctxFilterOK || !FM.ctxFilterOK())) return fallback();
    if (needsRoundRect(snapshot)) {
      try {
        const pageContext = document.createElement('canvas').getContext('2d');
        if (!pageContext || typeof pageContext.roundRect !== 'function') return fallback();
      } catch (e) { return fallback(); }
    }
    let blends;
    try { blends = blendProbe(snapshot); } catch (e) { return fallback(); }
    const transparent = captured.transparent;
    let worker, pending = null, sequence = 0, closed = false, closeError = null, urls;
    function dispose(error) {
      if (closed) return;
      closed = true; closeError = error || new Error('Renderer disposed');
      if (worker) worker.terminate();
      if (ownsCapture) release(captured);
      if (pending) pending.finish(closeError);
    }
    function request(type, data, transfer) {
      if (closed) return Promise.reject(new Error('Renderer disposed'));
      if (pending) return Promise.reject(new Error('A render is already in flight'));
      if (cancelled()) { dispose(); return Promise.reject(new Error('CANCELLED')); }
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timeout = setTimeout(() => dispose(new Error('Export worker timed out')), 30000);
        const cancelTimer = setInterval(() => { if (cancelled()) dispose(new Error('CANCELLED')); }, 50);
        pending = {id, finish(error, value) {
          clearTimeout(timeout); clearInterval(cancelTimer); pending = null;
          if (error) reject(error); else resolve(value);
        }};
        try { worker.postMessage(Object.assign({id, type}, data), transfer || []); }
        catch (e) { dispose(e); }
      });
    }
    const imageCopies = [], initialVideos = [];
    let rendering = false;
    try {
      urls = sourceURLs();
      worker = new root.Worker(entryURL);
      worker.onerror = e => { if (e.preventDefault) e.preventDefault(); dispose(new Error(e.message || 'Export worker failed')); };
      worker.onmessageerror = () => dispose(new Error('Export worker message could not be read'));
      worker.onmessage = e => {
        const msg = e.data;
        if (!pending || msg.id !== pending.id) { if (msg.bitmap) msg.bitmap.close(); return; }
        if (msg.error) { if (msg.bitmap) msg.bitmap.close(); dispose(new Error(msg.error)); return; }
        if (cancelled()) { if (msg.bitmap) msg.bitmap.close(); dispose(new Error('CANCELLED')); return; }
        pending.finish(null, msg);
      };
      for (const id of captured.images) {
        // Transfer an owned copy. Keep the prepared page bitmap alive until Worker readiness so a
        // startup failure can still use the captured main renderer without consulting live media.
        const media = captured.media.get(id), bitmap = await root.createImageBitmap(media.el);
        imageCopies.push({id, width:media.width, height:media.height, bitmap});
        if (cancelled()) throw new Error('CANCELLED');
      }
      // Preserve synchronous worker setup for the overwhelmingly common no-video path. Besides
      // avoiding a needless turn, lifecycle callers can install/cancel the first request immediately.
      if (captured.videos.length) initialVideos.push(...await videoFrames(captured, options.time || 0, {shouldCancel:() => closed || cancelled()}));
      const fontData = resources.get(captured).fontData;
      const textSpacing = snapshot.layers.some(l => l.type === 'text' && l.letterSpacing)
        ? FM.textSpacingOK().letter : null;
      const media = Array.from(captured.media, ([id, source]) =>
        ({id, kind:source.kind, width:source.width, height:source.height, duration:source.duration}));
      const reply = await request('init', {urls, scene:snapshot, transparent, time:options.time || 0, media, blends,
        images:imageCopies, videos:initialVideos, fonts:fontData, textSpacing}, imageCopies.concat(initialVideos).map(source => source.bitmap).concat(fontData.map(source => source.bytes)));
      if (!reply.ready) throw new Error('Export worker did not initialize');
      // Once startup succeeds the Worker owns its copies; page pixels are only needed for fallback.
      closeImages(captured);
      const state = resources.get(captured); state.ready = false; state.promise = null; state.fontData = [];
    } catch (e) {
      // An aborted source read after Worker.onerror is still a startup failure, not a user Cancel.
      const failure = (closed && closeError) || e;
      dispose(failure);
      if (cancelled() || failure.message === 'CANCELLED') throw new Error('CANCELLED');
      // Startup fallback only. Once a frame is encoded, changing renderers could corrupt a resume seam.
      return null;
    } finally {
      // Transferred copies are detached; untransferred copies must also be closed on startup failure.
      for (const source of imageCopies.concat(initialVideos)) { try { source.bitmap.close(); } catch (e) {} }
    }
    return {
      // Include asset versions and the captured alpha setting: either can change the pixels of
      // an otherwise identical document, so neither may splice into a saved prefix.
      id: [REVISION, entryURL].concat(urls, 'transparent=' + (transparent ? 1 : 0), mediaID(captured)).join(';'),
      // Resume must describe the same document sent to the worker, even if the live scene changes
      // while its asynchronous startup is in flight. Worker runtime caches live in its own copy.
      document: {project:snapshot.project, layers:snapshot.layers},
      transparent,
      async render(target, time) {
        if (closed) throw new Error('Renderer disposed');
        if (rendering) throw new Error('A render is already in flight');
        rendering = true;
        let frames = [], bitmap;
        try {
          if (captured.videos.length) frames = await videoFrames(captured, time, {shouldCancel:() => closed || cancelled()});
          const reply = await request('render', {time, videos:frames}, frames.map(source => source.bitmap));
          bitmap = reply.bitmap;
          if (!bitmap || bitmap.width !== snapshot.project.width || bitmap.height !== snapshot.project.height) throw new Error('Invalid export worker frame');
          target.save();
          try {
            target.setTransform(1, 0, 0, 1, 0, 0);
            target.globalAlpha = 1; target.globalCompositeOperation = 'source-over';
            target.clearRect(0, 0, target.canvas.width, target.canvas.height);
            target.drawImage(bitmap, 0, 0);
          } finally { target.restore(); }
        } catch (e) { const failure = cancelled() ? new Error('CANCELLED') : (closed && closeError) || e; dispose(failure); throw failure; }
        finally {
          if (bitmap) bitmap.close();
          for (const source of frames) { try { source.bitmap.close(); } catch (e) {} }
          rendering = false;
        }
      },
      dispose
    };
  }
  FM.exportWorker = {eligible, capture, prepare, release, mediaID, seekVideos, create};
})(globalThis);
