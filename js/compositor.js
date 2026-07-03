/* FreeMotion — Compositor.
 * Pure function of (scene, time) -> pixels on a 2D canvas. The same routine draws the
 * live preview AND every exported frame, so what you see is what you get. This is also
 * the surface the AI agent will render to a still and "look at" for self-correction.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // Alight-Motion-style blend modes -> canvas globalCompositeOperation.
  const BLEND = {
    normal: 'source-over',
    add: 'lighter',
    screen: 'screen',
    multiply: 'multiply',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    difference: 'difference',
    exclusion: 'exclusion',
    hue: 'hue',
    saturation: 'saturation',
    color: 'color',
    luminosity: 'luminosity',
    // Mask blending (AM): the layer's alpha KEEPS (include) or CUTS (exclude) everything below it.
    'mask-include': 'destination-in',
    'mask-exclude': 'destination-out',
  };
  FM.BLEND_MODES = Object.keys(BLEND);

  // Effects implemented via canvas ctx.filter — covers a lot of Alight Motion's catalogue
  // cheaply, applies identically in preview and export, and is keyframe-able (evalProp).
  FM.EFFECTS = [
    { type: 'blur', label: 'Gaussian Blur', param: 'radius', min: 0, max: 50, step: 0.5, def: 6, unit: 'px' },
    { type: 'brightness', label: 'Brightness', param: 'amount', min: 0, max: 3, step: 0.02, def: 1.3 },
    { type: 'contrast', label: 'Contrast', param: 'amount', min: 0, max: 3, step: 0.02, def: 1.3 },
    { type: 'saturate', label: 'Saturation', param: 'amount', min: 0, max: 3, step: 0.02, def: 1.6 },
    { type: 'hue', label: 'Hue Shift', param: 'deg', min: 0, max: 360, step: 1, def: 90, unit: '°' },
    { type: 'grayscale', label: 'Grayscale', param: 'amount', min: 0, max: 1, step: 0.02, def: 1 },
    { type: 'sepia', label: 'Sepia', param: 'amount', min: 0, max: 1, step: 0.02, def: 1 },
    { type: 'invert', label: 'Invert', param: 'amount', min: 0, max: 1, step: 0.02, def: 1 },
    { type: 'glow', label: 'Glow', param: 'radius', min: 0, max: 60, step: 1, def: 16, unit: 'px', color: true },
    { type: 'vignette', label: 'Vignette', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'chromakey', label: 'Chroma Key', param: 'tolerance', min: 0, max: 1, step: 0.02, def: 0.3, color: true, defColor: '#00ff00' },
    { type: 'lumakey', label: 'Luma Key', param: 'threshold', min: 0, max: 1, step: 0.02, def: 0.25 },
    { type: 'rgbsplit', label: 'RGB Split', param: 'amount', min: 0, max: 40, step: 1, def: 8, unit: 'px' },
    { type: 'pixelate', label: 'Pixelate', param: 'size', min: 1, max: 80, step: 1, def: 12, unit: 'px' },
    { type: 'posterize', label: 'Posterize', param: 'levels', min: 2, max: 16, step: 1, def: 5 },
    { type: 'mirror', label: 'Mirror', param: 'mode', def: 0, options: [[0, 'Left → Right'], [1, 'Right → Left'], [2, 'Top → Bottom'], [3, 'Bottom → Top']] },
    { type: 'tint', label: 'Tint', param: 'amount', min: 0, max: 1, step: 0.02, def: 1, color: true, defColor: '#ff3366' },
    { type: 'threshold', label: 'Threshold', param: 'level', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'duotone', label: 'Duotone', param: 'amount', min: 0, max: 1, step: 0.02, def: 1, color: true, defColor: '#241a52', colorLabel: 'Shadows', color2: true, defColor2: '#ff9e5e', color2Label: 'Highlights' },
    // ---- batch 1: per-pixel colour / texture effects (routed through drawPixelEffect) ----
    { type: 'solarize', label: 'Solarize', param: 'threshold', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'gamma', label: 'Gamma', param: 'gamma', min: 0.2, max: 4, step: 0.05, def: 1.8 },
    { type: 'temperature', label: 'Color Temperature', param: 'amount', min: -100, max: 100, step: 1, def: 40 },
    { type: 'noise', label: 'Noise', param: 'amount', min: 0, max: 100, step: 1, def: 35, unit: '%' },
    { type: 'scanlines', label: 'Scanlines', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    // ---- batch 2 ----
    { type: 'vibrance', label: 'Vibrance', param: 'amount', min: 0, max: 2, step: 0.02, def: 1.6 },
    { type: 'sharpen', label: 'Sharpen', param: 'amount', min: 0, max: 3, step: 0.05, def: 1.5 },
    { type: 'thermal', label: 'Hot Color', param: 'amount', min: 0, max: 1, step: 0.02, def: 1 },
    { type: 'dither', label: 'Dither', param: 'levels', min: 2, max: 8, step: 1, def: 4 },
    { type: 'halftone', label: 'Halftone Dots', param: 'size', min: 2, max: 30, step: 1, def: 8, unit: 'px' },
    // ---- batch 3: geometric warps (routed through drawWarpEffect) ----
    { type: 'wave', label: 'Wave', param: 'amount', min: 0, max: 120, step: 1, def: 30, unit: 'px' },
    { type: 'ripple', label: 'Circular Ripple', param: 'amount', min: 0, max: 60, step: 1, def: 22, unit: 'px' },
    { type: 'twirl', label: 'Twirl', param: 'amount', min: -360, max: 360, step: 1, def: 140, unit: '°' },
    { type: 'bulge', label: 'Pinch / Bulge', param: 'amount', min: -1, max: 2, step: 0.02, def: -0.5 },
    // ---- batch 4 ----
    { type: 'edge', label: 'Find Edges', param: 'amount', min: 0.5, max: 4, step: 0.05, def: 1.5 },
    { type: 'emboss', label: 'Emboss', param: 'amount', min: 0, max: 3, step: 0.05, def: 1 },
    { type: 'exposure', label: 'Exposure', param: 'stops', min: -3, max: 3, step: 0.05, def: 0.8, unit: ' EV' },
    { type: 'fisheye', label: 'Fisheye', param: 'amount', min: -1, max: 1, step: 0.02, def: 0.5 },
    // ---- batch 5 ----
    { type: 'kaleidoscope', label: 'Kaleidoscope', param: 'segments', min: 2, max: 12, step: 1, def: 6 },
    { type: 'glitch', label: 'Glitch', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'zoomblur', label: 'Zoom Blur', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'crt', label: 'CRT', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.7 },
    // ---- batch 6 ----
    { type: 'boxblur', label: 'Box Blur', param: 'radius', min: 0, max: 40, step: 1, def: 8, unit: 'px' },
    { type: 'spinblur', label: 'Spin Blur', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'gradientmap', label: 'Gradient Map', param: 'amount', min: 0, max: 1, step: 0.02, def: 1, color: true, defColor: '#241a52', colorLabel: 'Shadows', color2: true, defColor2: '#ffb86c', color2Label: 'Highlights' },
    { type: 'colorize', label: 'Colorize', param: 'amount', min: 0, max: 1, step: 0.02, def: 1, color: true, defColor: '#3aa0ff', colorLabel: 'Color' },
    { type: 'checker', label: 'Checker', param: 'size', min: 2, max: 120, step: 1, def: 24, unit: 'px', color: true, defColor: '#000000', colorLabel: 'Color' },
    { type: 'grid', label: 'Grid', param: 'size', min: 4, max: 160, step: 1, def: 32, unit: 'px', color: true, defColor: '#ffffff', colorLabel: 'Color' },
    // ---- batch 7 ----
    { type: 'mosaic', label: 'Mosaic', param: 'size', min: 2, max: 100, step: 1, def: 16, unit: 'px' },
    { type: 'lensblur', label: 'Lens Blur', param: 'radius', min: 0, max: 30, step: 1, def: 10, unit: 'px' },
    { type: 'dots', label: 'Dots', param: 'size', min: 4, max: 80, step: 1, def: 16, unit: 'px', color: true, defColor: '#ffffff', colorLabel: 'Color' },
    { type: 'polarcoords', label: 'Polar Coordinates', param: 'amount', min: 0, max: 1, step: 0.02, def: 1 },
    { type: 'bend', label: 'Bend', param: 'amount', min: -1, max: 1, step: 0.02, def: 0.5 },
    { type: 'glass', label: 'Glass', param: 'amount', min: 0, max: 40, step: 1, def: 12, unit: 'px' },
    // ---- batch 8 ----
    { type: 'lightglow', label: 'Light Glow', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'longshadow', label: 'Long Shadow', param: 'length', min: 0, max: 80, step: 1, def: 30, unit: 'px', color: true, defColor: '#000000', colorLabel: 'Shadow' },
    { type: 'halftonelines', label: 'Halftone Lines', param: 'size', min: 3, max: 40, step: 1, def: 8, unit: 'px' },
    { type: 'clouds', label: 'Clouds', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'rays', label: 'Radial Rays', param: 'count', min: 3, max: 64, step: 1, def: 16, color: true, defColor: '#ffffff', colorLabel: 'Color' },
    { type: 'stripes', label: 'Stripes', param: 'size', min: 4, max: 80, step: 1, def: 16, unit: 'px', color: true, defColor: '#000000', colorLabel: 'Color' },
    // ---- batch 9 ----
    { type: 'darkglow', label: 'Dark Glow', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'stroke', label: 'Stroke Color', param: 'width', min: 1, max: 16, step: 1, def: 4, unit: 'px', color: true, defColor: '#ffffff', colorLabel: 'Stroke' },
    { type: 'smoothedges', label: 'Smooth Edges', param: 'radius', min: 0, max: 20, step: 1, def: 4, unit: 'px' },
    { type: 'blocknoise', label: 'Block Noise', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'starfield', label: 'Starfield', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5, color: true, defColor: '#ffffff', colorLabel: 'Star' },
    { type: 'curl', label: 'Curl', param: 'amount', min: -1, max: 1, step: 0.02, def: 0.5 },
    // ---- batch 10 ----
    { type: 'bumpmap', label: 'Bump Map', param: 'amount', min: 0, max: 3, step: 0.05, def: 1.2 },
    { type: 'edgeglow', label: 'Edge Glow', param: 'amount', min: 0, max: 4, step: 0.05, def: 1.5, color: true, defColor: '#00ffea', colorLabel: 'Glow' },
    { type: 'contourlines', label: 'Contour Lines', param: 'levels', min: 2, max: 24, step: 1, def: 8 },
    { type: 'grunge', label: 'Grunge', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'iridescence', label: 'Iridescence', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.7 },
    { type: 'fractalwarp', label: 'Fractal Warp', param: 'amount', min: 0, max: 60, step: 1, def: 24, unit: 'px' },
    // ---- batch 11 (multi-param) ----
    { type: 'motionblur', label: 'Motion Blur', params: [{ key: 'distance', label: 'Distance', min: 0, max: 60, step: 1, def: 20, unit: 'px' }, { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, def: 0, unit: '°' }] },
    { type: 'colorbalance', label: 'Color Balance', params: [{ key: 'red', label: 'Red', min: -100, max: 100, step: 1, def: 25 }, { key: 'green', label: 'Green', min: -100, max: 100, step: 1, def: 0 }, { key: 'blue', label: 'Blue', min: -100, max: 100, step: 1, def: -25 }] },
    { type: 'highlightsshadows', label: 'Highlights & Shadows', params: [{ key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1, def: -40 }, { key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1, def: 50 }] },
    { type: 'tiltshift', label: 'Tilt Shift', params: [{ key: 'center', label: 'Focus', min: 0, max: 1, step: 0.02, def: 0.5 }, { key: 'softness', label: 'Softness', min: 0, max: 1, step: 0.02, def: 0.5 }] },
    // ---- batch 12 ----
    { type: 'dropshadow', label: 'Drop Shadow', params: [{ key: 'distance', label: 'Distance', min: 0, max: 60, step: 1, def: 18, unit: 'px' }, { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, def: 135, unit: '°' }, { key: 'softness', label: 'Softness', min: 0, max: 20, step: 1, def: 6, unit: 'px' }], color: true, defColor: '#000000', colorLabel: 'Shadow' },
    { type: 'chromaticaberration', label: 'Chromatic Aberration', params: [{ key: 'amount', label: 'Amount', min: 0, max: 30, step: 1, def: 8, unit: 'px' }, { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, def: 0, unit: '°' }] },
    { type: 'innerglow', label: 'Inner Glow', params: [{ key: 'radius', label: 'Radius', min: 1, max: 30, step: 1, def: 10, unit: 'px' }, { key: 'intensity', label: 'Intensity', min: 0, max: 2, step: 0.05, def: 1 }], color: true, defColor: '#ffe08a', colorLabel: 'Glow' },
    { type: 'unsharpmask', label: 'Unsharp Mask', params: [{ key: 'amount', label: 'Amount', min: 0, max: 3, step: 0.05, def: 1.2 }, { key: 'radius', label: 'Radius', min: 1, max: 20, step: 1, def: 3, unit: 'px' }] },
    { type: 'hextiles', label: 'Hexagon Tiles', param: 'size', min: 4, max: 80, step: 1, def: 20, unit: 'px' },
    { type: 'linstreaks', label: 'Linear Streaks', params: [{ key: 'length', label: 'Length', min: 0, max: 80, step: 1, def: 30, unit: 'px' }, { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, def: 90, unit: '°' }] },
    // ---- batch 13: Opacity / Visibility (time-based alpha) ----
    { type: 'blink', label: 'Blink', param: 'rate', min: 0.5, max: 12, step: 0.1, def: 2, unit: 'Hz' },
    { type: 'flicker', label: 'Flicker', params: [{ key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.02, def: 0.7 }, { key: 'speed', label: 'Speed', min: 1, max: 30, step: 1, def: 14, unit: 'Hz' }] },
    { type: 'pulseopacity', label: 'Pulse Opacity', params: [{ key: 'speed', label: 'Speed', min: 0.1, max: 8, step: 0.1, def: 1, unit: 'Hz' }, { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.02, def: 0.7 }] },
    { type: 'dissolve', label: 'Dissolve', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'blockdissolve', label: 'Block Dissolve', params: [{ key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.02, def: 0.5 }, { key: 'size', label: 'Block Size', min: 4, max: 60, step: 1, def: 16, unit: 'px' }] },
    // ---- batch 14: Matte / Mask / Key (alpha geometry) ----
    { type: 'wipe', label: 'Wipe', params: [{ key: 'progress', label: 'Progress', min: 0, max: 1, step: 0.02, def: 0.5 }, { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, def: 0, unit: '°' }] },
    { type: 'radialwipe', label: 'Radial Wipe', params: [{ key: 'progress', label: 'Progress', min: 0, max: 1, step: 0.02, def: 0.5 }, { key: 'start', label: 'Start', min: 0, max: 360, step: 1, def: 0, unit: '°' }] },
    { type: 'solidmatte', label: 'Solid Matte', param: 'amount', min: 0, max: 1, step: 0.02, def: 1, color: true, defColor: '#ffffff', colorLabel: 'Fill' },
    { type: 'mattechoker', label: 'Matte Choker', param: 'choke', min: -20, max: 20, step: 1, def: -4, unit: 'px' },
    { type: 'mattefringe', label: 'Matte Fringe', param: 'width', min: 1, max: 12, step: 1, def: 3, unit: 'px', color: true, defColor: '#00e0ff', colorLabel: 'Fringe' },
    // ---- batch 15: Repeat (tiled-coordinate warps) ----
    { type: 'gridrepeat', label: 'Grid Repeat', param: 'count', min: 1, max: 10, step: 1, def: 3 },
    { type: 'linearrepeat', label: 'Linear Repeat', param: 'count', min: 1, max: 12, step: 1, def: 4 },
    { type: 'radialrepeat', label: 'Radial Repeat', param: 'count', min: 2, max: 16, step: 1, def: 6 },
    { type: 'mirrortile', label: 'Mirror Tile', param: 'size', min: 20, max: 400, step: 1, def: 140, unit: 'px' },
    // ---- batch 16: Other / Color / Procedural / Drawing ----
    { type: 'channelremap', label: 'Channel Remap', param: 'mode', def: 1, options: [[0, 'RGB (identity)'], [1, 'Swap R/B'], [2, 'Swap R/G'], [3, 'Swap G/B'], [4, 'Rotate RGB→GBR'], [5, 'Rotate RGB→BRG']] },
    { type: 'gradientoverlay', label: 'Gradient Overlay', params: [{ key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.02, def: 0.8 }], color: true, defColor: '#ff3d7f', colorLabel: 'Start', color2: true, defColor2: '#3d7bff', color2Label: 'End' },
    { type: 'lensflare', label: 'Lens Flare', params: [{ key: 'x', label: 'Light X', min: 0, max: 1, step: 0.02, def: 0.3 }, { key: 'y', label: 'Light Y', min: 0, max: 1, step: 0.02, def: 0.3 }, { key: 'intensity', label: 'Intensity', min: 0, max: 2, step: 0.05, def: 1 }] },
    { type: 'roughenedges', label: 'Roughen Edges', params: [{ key: 'amount', label: 'Amount', min: 0, max: 20, step: 1, def: 6, unit: 'px' }, { key: 'scale', label: 'Scale', min: 2, max: 40, step: 1, def: 10, unit: 'px' }] },
    { type: 'hexarray', label: 'Hexagon Array', param: 'size', min: 8, max: 80, step: 1, def: 24, unit: 'px', color: true, defColor: '#19d6c0', colorLabel: 'Color' },
    // ---- batch 17: Drawing / Blur / Procedural ----
    { type: 'electricedges', label: 'Electric Edges', params: [{ key: 'amount', label: 'Glow', min: 0, max: 1, step: 0.02, def: 0.6 }, { key: 'speed', label: 'Speed', min: 0, max: 10, step: 0.1, def: 4 }], color: true, defColor: '#7df9ff', colorLabel: 'Electric' },
    { type: 'glowscan', label: 'Glow Scan', params: [{ key: 'speed', label: 'Speed', min: 0, max: 8, step: 0.1, def: 1.5, unit: 'Hz' }, { key: 'width', label: 'Width', min: 10, max: 200, step: 1, def: 60, unit: 'px' }], color: true, defColor: '#ffffff', colorLabel: 'Scan' },
    { type: 'spinstreaks', label: 'Spin Streaks', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'fractalridges', label: 'Fractal Ridges', params: [{ key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.02, def: 0.6 }, { key: 'scale', label: 'Scale', min: 8, max: 120, step: 1, def: 48, unit: 'px' }] },
    { type: 'smoothbevel', label: 'Smooth Bevel', params: [{ key: 'depth', label: 'Depth', min: 1, max: 20, step: 1, def: 6, unit: 'px' }, { key: 'strength', label: 'Light Strength', min: 0, max: 2, step: 0.05, def: 1 }] },
    // ---- batch 18: Blur / Proc / Distort / Drawing ----
    { type: 'zoomstreaks', label: 'Zoom Streaks', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.5 },
    { type: 'innerblur', label: 'Inner Blur', param: 'radius', min: 0, max: 30, step: 1, def: 8, unit: 'px' },
    { type: 'contourstrips', label: 'Contour Strips', param: 'levels', min: 2, max: 12, step: 1, def: 5, color: true, defColor: '#2b2d42', colorLabel: 'Low', color2: true, defColor2: '#ef476f', color2Label: 'High' },
    { type: 'innerpinch', label: 'Inner Pinch', param: 'amount', min: -1, max: 1, step: 0.02, def: 0.5 },
    { type: 'crosshatch', label: 'Crosshatch', param: 'spacing', min: 3, max: 30, step: 1, def: 7, unit: 'px', color: true, defColor: '#101014', colorLabel: 'Ink' },
    // ---- batch 19: TEXT effects (folded into the text string/spacing via TEXT_FX, text layers only) ----
    { type: 'counter', label: 'Count Up/Down', params: [{ key: 'progress', label: 'Progress', min: 0, max: 1, step: 0.01, def: 0.5 }, { key: 'from', label: 'From', min: 0, max: 100000, step: 1, def: 0 }, { key: 'to', label: 'To', min: 0, max: 100000, step: 1, def: 100 }, { key: 'decimals', label: 'Decimals', min: 0, max: 4, step: 1, def: 0 }] },
    { type: 'textprogress', label: 'Text Progress', param: 'progress', min: 0, max: 1, step: 0.01, def: 0.5 },
    { type: 'textrandomizer', label: 'Text Randomizer', params: [{ key: 'progress', label: 'Progress', min: 0, max: 1, step: 0.01, def: 0.5 }, { key: 'speed', label: 'Speed', min: 0, max: 30, step: 1, def: 12, unit: 'Hz' }] },
    { type: 'textspacing', label: 'Text Spacing', param: 'spacing', min: -20, max: 120, step: 1, def: 24, unit: 'px' },
    { type: 'texttransform', label: 'Text Transform', param: 'mode', def: 0, options: [[0, 'UPPERCASE'], [1, 'lowercase'], [2, 'Capitalize Words'], [3, 'Sentence case']] },
    { type: 'timecode', label: 'Timecode', param: 'mode', def: 0, options: [[0, 'MM:SS:FF'], [1, 'HH:MM:SS'], [2, 'SS:FF'], [3, 'Seconds']] },
    // ---- batch 20: cinematic grades + framing ----
    { type: 'bleachbypass', label: 'Bleach Bypass', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.7 },
    { type: 'tealorange', label: 'Teal & Orange', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'crossprocess', label: 'Cross Process', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'lightleak', label: 'Light Leak', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6, color: true, defColor: '#ff7a3c', colorLabel: 'Leak' },
    { type: 'letterbox', label: 'Letterbox', param: 'size', min: 0, max: 45, step: 1, def: 14, unit: '%' },
    { type: 'border', label: 'Border Frame', param: 'width', min: 1, max: 60, step: 1, def: 10, unit: 'px', color: true, defColor: '#ffffff', colorLabel: 'Border' },
    // ---- batch 21 ----
    { type: 'faded', label: 'Faded Film', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.6 },
    { type: 'nightvision', label: 'Night Vision', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.85 },
    { type: 'sketch', label: 'Pencil Sketch', param: 'amount', min: 0, max: 1, step: 0.02, def: 0.85 },
    // ---- batch 22: 3D (textured-mesh renderer via CANVAS_FX — AM's 3D category) ----
    // Shared params: rotx/roty/rotz spin the solid (keyframe them to animate), size scales it
    // relative to the layer's rendered bounds, shading = strength of the fixed key light.
    { type: 'cube3d', label: 'Cube', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 25, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 35, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 70, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.6 }] },
    { type: 'box3d', label: 'Box', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 25, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 35, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'depth', label: 'Depth', min: 10, max: 200, step: 1, def: 60, unit: '%' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 80, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.6 }] },
    { type: 'cylinder3d', label: 'Cylinder', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 20, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 75, unit: '°' }, { key: 'length', label: 'Length', min: 20, max: 250, step: 1, def: 150, unit: '%' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 70, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.6 }] },
    { type: 'sphere3d', label: 'Spherize', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 15, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 85, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.55 }] },
    { type: 'ellipsoid3d', label: 'Ellipsoid', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 25, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 25, unit: '°' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 85, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.55 }] },
    { type: 'torus3d', label: 'Torus', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 55, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 10, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'thickness', label: 'Thickness', min: 8, max: 45, step: 1, def: 30, unit: '%' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 85, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.6 }] },
    { type: 'ring3d', label: 'Ring', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 60, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 8, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'hole', label: 'Hole', min: 20, max: 90, step: 1, def: 62, unit: '%' }, { key: 'depth', label: 'Depth', min: 5, max: 100, step: 1, def: 35, unit: '%' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 85, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.6 }] },
    { type: 'pyramid3d', label: 'Pyramid', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 20, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 30, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 85, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.65 }] },
    { type: 'octahedron3d', label: 'Octahedron', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 20, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 30, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 85, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.65 }] },
    { type: 'hexprism3d', label: 'Hexagonal Prism', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 25, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 35, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'depth', label: 'Depth', min: 10, max: 200, step: 1, def: 55, unit: '%' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 80, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.6 }] },
    { type: 'starprism3d', label: 'Star Prism', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 25, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 30, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'points', label: 'Points', min: 4, max: 10, step: 1, def: 5 }, { key: 'depth', label: 'Depth', min: 10, max: 150, step: 1, def: 40, unit: '%' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 85, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.6 }] },
    { type: 'starpoly3d', label: 'Star Polyhedron', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 20, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 30, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'spike', label: 'Spike Length', min: 0.2, max: 2.5, step: 0.05, def: 1.1 }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 70, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.65 }] },
    { type: 'heart3d', label: 'Heart', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 15, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 30, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'depth', label: 'Depth', min: 10, max: 150, step: 1, def: 45, unit: '%' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 85, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.6 }] },
    { type: 'hollowbox3d', label: 'Hollow Box', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 25, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 35, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'wall', label: 'Wall', min: 8, max: 45, step: 1, def: 22, unit: '%' }, { key: 'depth', label: 'Depth', min: 10, max: 200, step: 1, def: 70, unit: '%' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 80, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.6 }] },
    { type: 'axiscross3d', label: 'Three-axis Cross', params: [{ key: 'rotx', label: 'Rotate X', min: 0, max: 360, step: 1, def: 25, unit: '°' }, { key: 'roty', label: 'Rotate Y', min: 0, max: 360, step: 1, def: 35, unit: '°' }, { key: 'rotz', label: 'Rotate Z', min: 0, max: 360, step: 1, def: 0, unit: '°' }, { key: 'arm', label: 'Arm Width', min: 15, max: 60, step: 1, def: 34, unit: '%' }, { key: 'size', label: 'Size', min: 10, max: 200, step: 1, def: 80, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.6 }] },
    { type: 'pagecurl', label: 'Page Curl', params: [{ key: 'amount', label: 'Curl', min: 0, max: 1, step: 0.01, def: 0.45 }, { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, def: 45, unit: '°' }, { key: 'radius', label: 'Radius', min: 5, max: 60, step: 1, def: 20, unit: '%' }, { key: 'shading', label: 'Shading', min: 0, max: 1, step: 0.02, def: 0.5 }] },
    { type: 'fliplayer', label: 'Flip Layer', param: 'mode', def: 0, options: [[0, 'Horizontal'], [1, 'Vertical'], [2, 'Both']] },
    { type: 'rasterextrude', label: 'Raster Extrude', params: [{ key: 'depth', label: 'Depth', min: 0, max: 100, step: 1, def: 40, unit: 'px' }, { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, def: 225, unit: '°' }, { key: 'darken', label: 'Side Darken', min: 0, max: 1, step: 0.02, def: 0.55 }] },
    // ---- batch 23: Move / Transform (whole-layer motion about its rendered bounds) ----
    { type: 'wiggle', label: 'Wiggle', params: [{ key: 'amount', label: 'Amount', min: 0, max: 200, step: 1, def: 40, unit: 'px' }, { key: 'speed', label: 'Speed', min: 0.1, max: 10, step: 0.1, def: 2, unit: 'Hz' }] },
    { type: 'shake', label: 'Shake', params: [{ key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, def: 20, unit: 'px' }, { key: 'speed', label: 'Speed', min: 1, max: 30, step: 0.5, def: 12, unit: 'Hz' }, { key: 'twist', label: 'Twist', min: 0, max: 20, step: 0.5, def: 4, unit: '°' }] },
    { type: 'swing', label: 'Swing', params: [{ key: 'angle', label: 'Angle', min: 0, max: 90, step: 1, def: 15, unit: '°' }, { key: 'speed', label: 'Speed', min: 0.1, max: 8, step: 0.1, def: 1, unit: 'Hz' }] },
    { type: 'spin', label: 'Spin', param: 'speed', min: -720, max: 720, step: 5, def: 90, unit: '°/s' },
    { type: 'pulse', label: 'Pulse', params: [{ key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.02, def: 0.2 }, { key: 'speed', label: 'Speed', min: 0.1, max: 8, step: 0.1, def: 1.5, unit: 'Hz' }] },
    { type: 'drift', label: 'Drift', params: [{ key: 'x', label: 'Speed X', min: -400, max: 400, step: 5, def: 120, unit: 'px/s' }, { key: 'y', label: 'Speed Y', min: -400, max: 400, step: 5, def: 0, unit: 'px/s' }] },
    { type: 'orbit', label: 'Orbit', params: [{ key: 'radius', label: 'Radius', min: 0, max: 400, step: 5, def: 80, unit: 'px' }, { key: 'speed', label: 'Speed', min: -4, max: 4, step: 0.1, def: 0.5, unit: 'rev/s' }] },
    // ---- batch 24: Squeeze (AM featured distort) + Tiles (repeat with gaps) ----
    { type: 'squeeze', label: 'Squeeze', param: 'amount', min: -1, max: 1, step: 0.02, def: 0.5 },
    { type: 'tiles', label: 'Tiles', params: [{ key: 'count', label: 'Tiles', min: 1, max: 8, step: 1, def: 3 }, { key: 'gap', label: 'Gap', min: 0, max: 40, step: 1, def: 8, unit: '%' }] },
  ];

  // getImageData + per-pixel keying is the heaviest path, so memoize the result and skip
  // recompute when the source frame and params are unchanged (static images, paused/scrub
  // redraws, repeated renders of one frame). Stats exposed for verification.
  FM._fxStats = { ckCompute: 0, lkCompute: 0 };
  // Bumped whenever a reused offscreen canvas (grade/key/blend) is (re)computed, so srcToken varies for
  // it. Without this, a canvas's object identity is constant while its pixels change every frame, and any
  // memo downstream (e.g. key over a graded video, or grade over a frame-blend) would freeze on frame 1.
  let _gen = 0, _idSeq = 0;
  function srcToken(src) {
    // include a stable per-element id so two distinct videos sharing the same fps/res/start (and thus the
    // same rounded currentTime bucket) can't collide in a single-slot key/grade memo (would return the
    // first video's pixels for the second).
    if (src && src.tagName === 'VIDEO') { if (src._fmId == null) src._fmId = ++_idSeq; return 'v:' + src._fmId + ':' + Math.round((src.currentTime || 0) * 1000); }
    if (src && src._fmGen != null) return 'c:' + src._fmGen;   // reused offscreen canvas → key by its generation
    return src;
  }

  // Key out a color → transparency (green/blue screen). Reuses one offscreen canvas + memo.
  let _ckCanvas = null, _ckLast = null;
  function chromaKey(src, w, h, keyHex, tol, filterStr) {
    const tok = srcToken(src);
    if (_ckLast && _ckCanvas && _ckLast.tok === tok && _ckLast.w === w && _ckLast.h === h && _ckLast.key === keyHex && _ckLast.tol === tol && _ckLast.filter === filterStr) return _ckCanvas;
    if (!_ckCanvas) _ckCanvas = document.createElement('canvas');
    const oc = _ckCanvas; oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    octx.clearRect(0, 0, w, h);
    octx.filter = filterStr || 'none';                    // filter the SOURCE before keying (AM order: FX → key)
    try { octx.drawImage(src, 0, 0, w, h); } catch (e) { octx.filter = 'none'; return src; }
    octx.filter = 'none';
    let img;
    try { img = octx.getImageData(0, 0, w, h); } catch (e) { return src; }  // tainted-canvas guard
    const d = img.data;
    const kr = parseInt(keyHex.slice(1, 3), 16), kg = parseInt(keyHex.slice(3, 5), 16), kb = parseInt(keyHex.slice(5, 7), 16);
    const thr = (tol || 0.3) * 441;
    for (let i = 0; i < d.length; i += 4) {
      const dr = d[i] - kr, dg = d[i + 1] - kg, db = d[i + 2] - kb;
      if (Math.sqrt(dr * dr + dg * dg + db * db) < thr) d[i + 3] = 0;
    }
    octx.putImageData(img, 0, 0);
    _ckLast = { tok, w, h, key: keyHex, tol, filter: filterStr }; FM._fxStats.ckCompute++;
    oc._fmGen = ++_gen;
    return oc;
  }

  // Key out by luminance → transparency (removes dark/black areas below threshold).
  let _lkCanvas = null, _lkLast = null;
  function lumaKey(src, w, h, threshold, filterStr) {
    const tok = srcToken(src);
    if (_lkLast && _lkCanvas && _lkLast.tok === tok && _lkLast.w === w && _lkLast.h === h && _lkLast.thr === threshold && _lkLast.filter === filterStr) return _lkCanvas;
    if (!_lkCanvas) _lkCanvas = document.createElement('canvas');
    const oc = _lkCanvas; oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    octx.clearRect(0, 0, w, h);
    octx.filter = filterStr || 'none';                    // filter SOURCE before keying
    try { octx.drawImage(src, 0, 0, w, h); } catch (e) { octx.filter = 'none'; return src; }
    octx.filter = 'none';
    let img;
    try { img = octx.getImageData(0, 0, w, h); } catch (e) { return src; }  // tainted-canvas guard
    const d = img.data;
    const t = (threshold == null ? 0.25 : threshold) * 255;
    const soft = 28;                                       // soft edge over `soft` luma units
    for (let i = 0; i < d.length; i += 4) {
      const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (luma <= t) d[i + 3] = 0;
      else if (luma < t + soft) d[i + 3] = Math.round(d[i + 3] * (luma - t) / soft);
    }
    octx.putImageData(img, 0, 0);
    _lkLast = { tok, w, h, thr: threshold, filter: filterStr }; FM._fxStats.lkCompute++;
    oc._fmGen = ++_gen;
    return oc;
  }

  // Lift / Gamma / Gain color grading via a 256-entry LUT: out = gain * in^(1/gamma) + lift.
  // ctx.filter can't express gamma/lift, so we do a memoized per-pixel pass (like the keys).
  let _grLUT = null, _grSig = null;
  function gradeLUT(lift, gamma, gain) {
    const sig = lift + '|' + gamma + '|' + gain;
    if (_grLUT && _grSig === sig) return _grLUT;
    const lut = new Uint8ClampedArray(256), ig = 1 / (gamma || 1);
    for (let i = 0; i < 256; i++) {
      const n = i / 255;
      lut[i] = Math.round((gain * Math.pow(n, ig) + lift) * 255);
    }
    _grLUT = lut; _grSig = sig; return lut;
  }
  let _grCanvas = null, _grLast = null;
  function gradeCanvas(src, w, h, lift, gamma, gain) {
    const tok = srcToken(src), sig = lift + '|' + gamma + '|' + gain;
    if (_grLast && _grCanvas && _grLast.tok === tok && _grLast.w === w && _grLast.h === h && _grLast.sig === sig) return _grCanvas;
    if (!_grCanvas) _grCanvas = document.createElement('canvas');
    const oc = _grCanvas; oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    octx.clearRect(0, 0, w, h);
    try { octx.drawImage(src, 0, 0, w, h); } catch (e) { return src; }
    let img;
    try { img = octx.getImageData(0, 0, w, h); } catch (e) { return src; }   // tainted guard
    const d = img.data, lut = gradeLUT(lift, gamma, gain);
    for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
    octx.putImageData(img, 0, 0);
    _grLast = { tok, w, h, sig }; FM._fxStats.gradeCompute = (FM._fxStats.gradeCompute || 0) + 1;
    oc._fmGen = ++_gen;
    return oc;
  }

  // Cross-dissolve two frames (smooth slow-mo / frame-blend). out = a*(1-frac) + b*frac.
  let _fbCanvas = null;
  function blendFrames(a, b, frac, w, h) {
    if (!_fbCanvas) _fbCanvas = document.createElement('canvas');
    const oc = _fbCanvas; oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    octx.globalAlpha = 1; octx.clearRect(0, 0, w, h);
    try {
      octx.drawImage(a, 0, 0, w, h);
      octx.globalAlpha = frac;
      octx.drawImage(b, 0, 0, w, h);
    } catch (e) { octx.globalAlpha = 1; return a; }
    octx.globalAlpha = 1;
    oc._fmGen = ++_gen;
    return oc;
  }

  function effectFilter(layer, t) {
    const parts = [];
    const fx = layer.effects;
    if (fx && fx.length) for (const e of fx) {
      if (e.enabled === false) continue;
      const p = e.params || {};
      const v = (k, d) => (p[k] == null ? d : FM.evalProp(p[k], t));
      switch (e.type) {
        case 'blur': parts.push('blur(' + v('radius', 6) + 'px)'); break;
        case 'brightness': parts.push('brightness(' + v('amount', 1) + ')'); break;
        case 'contrast': parts.push('contrast(' + v('amount', 1) + ')'); break;
        case 'saturate': parts.push('saturate(' + v('amount', 1) + ')'); break;
        case 'hue': parts.push('hue-rotate(' + v('deg', 0) + 'deg)'); break;
        case 'grayscale': parts.push('grayscale(' + v('amount', 1) + ')'); break;
        case 'sepia': parts.push('sepia(' + v('amount', 1) + ')'); break;
        case 'invert': parts.push('invert(' + v('amount', 1) + ')'); break;
        case 'glow': parts.push('drop-shadow(0 0 ' + v('radius', 12) + 'px ' + (p.color || '#ffffff') + ')'); break;
      }
    }
    // Skip the colour-grade filter when the FILL system owns the layer's colour (shapes/text, or a
    // media layer overridden by a solid/gradient/media fill) — a stale hue/sat grade from the old
    // colour-wheel panel was silently shifting every picked fill colour. Grades still apply to
    // media/groups showing their own pixels, which is what grading is for.
    if (layer.colorGrade && !fillOwnsColor(layer)) {
      const cg = layer.colorGrade;
      if (cg.hue) parts.push('hue-rotate(' + cg.hue + 'deg)');
      if (cg.sat != null && Math.abs(cg.sat - 1) > 1e-3) parts.push('saturate(' + cg.sat + ')');
    }
    return parts.length ? parts.join(' ') : 'none';
  }
  FM.effectFilter = effectFilter;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // ---- TEXT EFFECTS ----
  // Transform a text layer's displayed STRING and letter-spacing BEFORE layout. These live in
  // layer.effects (so they share the same effects list / Add-Effect browser) but are NOT pixel or
  // CSS post-fx — they're folded here, in render order, by FM.applyTextEffects (called from the text
  // draw path). Each fn mutates st = { text, letterSpacing }. Numeric params read via FM.evalProp so
  // they keyframe; segment params (mode) read as a plain int.
  function tnum(v, d) { return (v == null || (typeof v === 'number' && isNaN(v))) ? d : v; }
  function tpad(n) { n = Math.floor(n); return (n < 10 ? '0' : '') + n; }
  const TEXT_SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@?!';
  const TEXT_FX = {
    counter: function (st, p, t) {
      var from = tnum(FM.evalProp(p.from, t), 0), to = tnum(FM.evalProp(p.to, t), 100);
      var dec = Math.max(0, Math.min(4, Math.round(tnum(FM.evalProp(p.decimals, t), 0))));
      var pr = clamp01(tnum(FM.evalProp(p.progress, t), 0.5));
      st.text = (from + (to - from) * pr).toFixed(dec);
    },
    textprogress: function (st, p, t) {
      var pr = clamp01(tnum(FM.evalProp(p.progress, t), 0.5));
      st.text = st.text.slice(0, Math.round(st.text.length * pr));
    },
    textrandomizer: function (st, p, t) {
      var pr = clamp01(tnum(FM.evalProp(p.progress, t), 0.5));
      var spd = tnum(FM.evalProp(p.speed, t), 12);
      var s = st.text, n = Math.floor(s.length * pr), frame = Math.floor(t * spd), out = '';
      for (var i = 0; i < s.length; i++) {
        var c = s[i];
        if (i < n || c === ' ' || c === '\n' || c === '\t') { out += c; }
        else { var h = (i * 2654435761 + frame * 40503) >>> 0; h = (h ^ (h >>> 13)) >>> 0; out += TEXT_SCRAMBLE[h % TEXT_SCRAMBLE.length]; }
      }
      st.text = out;
    },
    textspacing: function (st, p, t) {
      st.letterSpacing = tnum(FM.evalProp(p.spacing, t), 24);
    },
    texttransform: function (st, p, t) {
      var m = (p.mode | 0), s = st.text;
      if (m === 0) st.text = s.toUpperCase();
      else if (m === 1) st.text = s.toLowerCase();
      else if (m === 2) st.text = s.toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      else if (m === 3) { s = s.toLowerCase(); st.text = s.charAt(0).toUpperCase() + s.slice(1); }
    },
    timecode: function (st, p, t, info) {
      var m = (p.mode | 0), fps = (info && info.fps) || 30, lt = (info && info.localT != null) ? info.localT : t;
      if (lt < 0) lt = 0;
      var ff = Math.floor(lt * fps) % Math.max(1, Math.round(fps)), totalS = Math.floor(lt);
      var ss = totalS % 60, mm = Math.floor(totalS / 60) % 60, hh = Math.floor(totalS / 3600);
      if (m === 0) st.text = tpad(mm) + ':' + tpad(ss) + ':' + tpad(ff);
      else if (m === 1) st.text = tpad(hh) + ':' + tpad(mm) + ':' + tpad(ss);
      else if (m === 2) st.text = tpad(ss) + ':' + tpad(ff);
      else st.text = lt.toFixed(1) + 's';
    },
  };
  FM.TEXT_FX = TEXT_FX;
  // Fold every enabled text effect over the base string + spacing, in layer order. Returns {text, letterSpacing}.
  FM.applyTextEffects = function (layer, baseText, baseSpacing, t, scene) {
    var st = { text: String(baseText == null ? '' : baseText), letterSpacing: baseSpacing || 0 };
    var fx = layer && layer.effects;
    if (fx && fx.length) {
      var info = { localT: t - (layer.start || 0), fps: (scene && scene.project && scene.project.fps) || 30 };
      for (var i = 0; i < fx.length; i++) { var e = fx[i]; if (e.enabled === false) continue; var fn = TEXT_FX[e.type]; if (fn) fn(st, e.params || {}, t, info); }
    }
    return st;
  };
  // Smooth deterministic pseudo-noise in ~[-1,1] (sum of incommensurate sines) — same at a given
  // time every render, so wiggle is flicker-free and exports identically.
  function wnoise(u) { return Math.sin(u * 6.283) * 0.5 + Math.sin(u * 14.77 + 1.3) * 0.3 + Math.sin(u * 28.6 + 2.7) * 0.2; }
  FM.wiggleOffset = function (layer, t) {
    const w = layer.wiggle;
    if (!w || !w.enabled || !w.amp) return null;
    const f = w.freq || 2, a = w.amp;
    return { x: a * wnoise(t * f), y: a * wnoise(t * f + 100) };
  };

  // Apply the layer's parent-chain transform (translate/rotate/scale, root-most first) so a
  // child inherits its parent's motion (AM layer parenting). Cycle- and missing-parent-safe.
  // Composes the parent chain onto ctx (position/rotation/scale, root-first) and RETURNS the total
  // inherited rotation in radians — used to implement AM parenting rotation modes on the child.
  function applyParentChain(ctx, layer, t, scene) {
    if (!layer.parent || !scene) return 0;
    const chain = [];
    const seen = new Set([layer.id]);
    let pid = layer.parent;
    while (pid && !seen.has(pid)) {
      seen.add(pid);
      const pl = scene.layers.find(l => l.id === pid);
      if (!pl) break;
      chain.push(pl);
      pid = pl.parent;
    }
    let accumRot = 0;
    for (let i = chain.length - 1; i >= 0; i--) {
      const ptr = chain[i].transform;
      ctx.translate(FM.evalProp(ptr.x, t), FM.evalProp(ptr.y, t));
      const prot = FM.evalProp(ptr.rotation, t) * Math.PI / 180;
      if (prot) ctx.rotate(prot);
      accumRot += prot;
      const ps = FM.evalProp(ptr.scale, t);
      if (ps !== 1) ctx.scale(ps, ps);
    }
    return accumRot;
  }
  // AM parenting rotation modes: 'locked' keeps the child world-upright while it still orbits the
  // parent; 'weighted' keeps a fraction of the parent's rotation. Call after translate(x,y), before
  // the child's own rotation. (Position already inherited the full parent rotation via the chain.)
  function applyParentRotMode(ctx, layer, accumRot) {
    if (!layer.parent || !accumRot) return;
    const mode = layer.parentMode || 'normal';
    if (mode === 'normal') return;
    const wt = mode === 'weighted' ? clamp01(layer.parentWeight != null ? layer.parentWeight : 0.5) : 0;
    ctx.rotate(-accumRot * (1 - wt));
  }

  // ---- kinetic typography: per-unit (char/word/line) animated reveal ----
  function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }
  function easeOutBack(p) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
  function hexToRGB(h) { h = String(h || '#000000').replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]; }
  function lerpHex(a, b, f) { f = Math.max(0, Math.min(1, f)); const A = hexToRGB(a), B = hexToRGB(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * f) + ',' + Math.round(A[1] + (B[1] - A[1]) * f) + ',' + Math.round(A[2] + (B[2] - A[2]) * f) + ')'; }

  function drawAnimatedText(ctx, layer, t, lines, lh, total) {
    const an = layer.textAnim || {};
    const preset = an.preset || 'fade';
    const unit = an.unit || 'char';
    const durIn = an.durIn != null ? an.durIn : 0.6;
    const durOut = an.durOut || 0;
    const stagger = an.stagger != null ? an.stagger : 0.04;
    const fs = layer.fontSize || 96;
    const align = layer.align || 'center';
    const tIn = t - layer.start;                       // seconds since the layer began
    const tToEnd = (layer.start + layer.duration) - t; // seconds until the layer ends
    const baseAlpha = ctx.globalAlpha;                 // layer opacity already applied
    const stk = layer.stroke, drawStroke = stk && stk.enabled && stk.width > 0;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    const grad = FM.layerHasGradient(layer) ? layer.fillGradient : null;   // per-unit gradient sampling
    let gi = 0;
    lines.forEach((line, li) => {
      const yy = li * lh - total / 2;
      let units;
      if (unit === 'line') units = [line];
      else if (unit === 'word') units = line.split(/(\s+)/).filter(s => s.length);
      else units = Array.from(line);
      const widths = units.map(u => ctx.measureText(u).width);
      const sp = parseFloat(ctx.letterSpacing) || 0;   // global spacing is active; measureText over-counts one trailing gap per unit (#5)
      const lineW = widths.reduce((a, b) => a + b, 0) - (units.length ? sp : 0);
      let x = align === 'center' ? -lineW / 2 : align === 'right' ? -lineW : 0;
      const lineLeft = x;
      units.forEach((u, ui) => {
        const w = widths[ui];
        const wDraw = Math.max(0, w - sp);   // visual width = measured minus the over-counted trailing gap; advance still uses w (= inter-unit gap) (#5)
        const p = durIn > 0 ? Math.min(1, Math.max(0, (tIn - gi * stagger) / durIn)) : (tIn >= gi * stagger ? 1 : 0);
        const pe = easeOutCubic(p);
        const outA = durOut > 0 ? Math.min(1, Math.max(0, tToEnd / durOut)) : 1;
        let alpha = 1, dx = 0, dy = 0, sc = 1;
        if (preset === 'fade') alpha = p;
        else if (preset === 'fade-up') { alpha = p; dy = (1 - pe) * fs * 0.6; }
        else if (preset === 'typewriter') alpha = p > 0 ? 1 : 0;
        else if (preset === 'pop') { sc = Math.max(0, easeOutBack(p)); alpha = Math.min(1, p * 2.2); }
        else if (preset === 'slide') { alpha = p; dx = (1 - pe) * fs * 0.9; }
        ctx.save();
        ctx.globalAlpha = baseAlpha * Math.max(0, Math.min(1, alpha)) * outA;
        ctx.translate(x + wDraw / 2 + dx, yy + dy);
        if (sc !== 1) ctx.scale(sc, sc);
        if (grad) {   // sample the gradient at this unit's position, respecting the gradient angle
          const cx = x + wDraw / 2, dxc = cx - (lineLeft + lineW / 2), dyc = yy;
          let f;
          if (grad.type === 'radial') {
            f = Math.hypot(dxc, dyc) / (Math.max(lineW, total + fs) / 2 || 1);
          } else {
            const ang = (grad.angle || 0) * Math.PI / 180, co = Math.cos(ang), si = Math.sin(ang);
            const half = (Math.abs(co) * lineW + Math.abs(si) * (total + fs)) / 2 || 1;
            f = (dxc * co + dyc * si) / half / 2 + 0.5;
          }
          ctx.fillStyle = lerpHex(grad.c0, grad.c1, Math.max(0, Math.min(1, f)));
        }
        if (drawStroke) { ctx.lineJoin = 'round'; ctx.miterLimit = 2; ctx.lineWidth = stk.width * 2; ctx.strokeStyle = stk.color || '#000'; ctx.strokeText(u, -wDraw / 2, 0); }
        ctx.fillText(u, -wDraw / 2, 0);
        ctx.restore();
        x += w;
        gi++;
      });
    });
    ctx.textAlign = prevAlign;
  }
  FM.textHasAnim = function (layer) { return layer.textAnim && layer.textAnim.preset && layer.textAnim.preset !== 'none'; };

  // Text on a curve: lay characters along a circular arc, each rotated to the tangent.
  function drawArcLine(ctx, line, layer, curveDeg, drawStroke) {
    const chars = Array.from(line);
    // Glyphs are drawn one at a time, so neutralise the global letterSpacing during measurement (it
    // would otherwise add a trailing gap to every single-char measureText, inflating the radius/spacing)
    // and add the spacing back explicitly as inter-char advance. No-op when spacing is 0. (#5)
    const prevLS = ('letterSpacing' in ctx) ? ctx.letterSpacing : null;
    const sp = parseFloat(prevLS) || 0;
    if (prevLS != null) ctx.letterSpacing = '0px';
    const widths = chars.map(c => ctx.measureText(c).width);
    const tw = widths.reduce((a, b) => a + b, 0) + sp * Math.max(0, chars.length - 1);
    if (tw <= 0) { if (prevLS != null) ctx.letterSpacing = prevLS; return; }
    const ac = curveDeg * Math.PI / 180, R = tw / Math.abs(ac), sign = curveDeg >= 0 ? 1 : -1;
    const stk = layer.stroke;
    const prevAlign = ctx.textAlign, prevBase = ctx.textBaseline;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let s = 0;
    chars.forEach((ch, i) => {
      const w = widths[i];
      const a = ((s + w / 2) / tw - 0.5) * ac;
      ctx.save();
      ctx.translate(R * Math.sin(a), sign * (R - R * Math.cos(a)));
      ctx.rotate(a);
      if (drawStroke) { ctx.lineJoin = 'round'; ctx.miterLimit = 2; ctx.lineWidth = stk.width * 2; ctx.strokeStyle = stk.color || '#000'; ctx.strokeText(ch, 0, 0); }
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      s += w + sp;
    });
    ctx.textAlign = prevAlign; ctx.textBaseline = prevBase;
    if (prevLS != null) ctx.letterSpacing = prevLS;
  }

  // ---- vector mask: clip the layer to a shape (rect/ellipse/polygon), in layer-local space ----
  function addMaskShape(path, mk) {
    const mx = mk.x || 0, my = mk.y || 0, mw = mk.w || 300, mh = mk.h || 300;
    if (mk.shape === 'ellipse') {
      path.ellipse(mx, my, Math.abs(mw / 2), Math.abs(mh / 2), 0, 0, Math.PI * 2);
    } else if (mk.shape === 'polygon') {
      const n = Math.max(3, mk.sides || 5);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / n;
        const px = mx + (mw / 2) * Math.cos(a), py = my + (mh / 2) * Math.sin(a);
        if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
      }
      path.closePath();
    } else {   // rect
      path.rect(mx - mw / 2, my - mh / 2, mw, mh);
    }
  }
  function applyMaskClip(ctx, layer) {
    const mk = layer.mask;
    if (!mk || !mk.enabled) return;
    const path = new Path2D();
    if (mk.invert) path.rect(-100000, -100000, 200000, 200000);   // everything…
    addMaskShape(path, mk);                                        // …minus the shape (evenodd) = punch-out
    ctx.clip(path, mk.invert ? 'evenodd' : 'nonzero');
  }

  // Feathered mask: clip() can't soft-edge, so render the layer to an offscreen, then composite a
  // BLURRED mask shape over it (destination-in keeps inside / destination-out punches out), and blit.
  let _maskCv = null;
  function drawFeatheredMaskLayer(ctx, layer, t, scene) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height;
    if (!_maskCv) _maskCv = document.createElement('canvas');
    const off = _maskCv; off.width = W; off.height = H;
    const octx = off.getContext('2d');
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
    octx.globalAlpha = 1; octx.globalCompositeOperation = 'source-over'; octx.filter = 'none';
    // 1) draw the layer content (no mask, full opacity, normal blend) into the offscreen
    const tmp = Object.assign({}, layer, { mask: null, blendMode: 'normal', transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(octx, tmp, t, scene);
    // 2) composite the blurred mask shape in the layer's transformed local space — the SAME full
    // transform the content used (step 1's drawLayer), so the soft mask lines up even with skew /
    // non-uniform scale / Z. (#7)
    octx.save();
    octx.globalCompositeOperation = layer.mask.invert ? 'destination-out' : 'destination-in';
    applyLayerTransform(octx, layer, t, scene);
    octx.filter = 'blur(' + Math.max(0, layer.mask.feather || 0) + 'px)';
    octx.fillStyle = '#fff';
    const path = new Path2D(); addMaskShape(path, layer.mask); octx.fill(path);
    octx.restore();
    octx.filter = 'none'; octx.globalCompositeOperation = 'source-over';
    // 3) blit onto the main canvas with the layer's real opacity + blend
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }

  // Motion blur: average K sub-frame renders across the shutter window. A moving/rotating layer
  // smears along its motion; a static layer is unchanged. Each sample draws at 1/K opacity.
  // NOTE: this blurs the layer's TRANSFORM motion (pan/scale/rotate). It does NOT smear a video
  // clip's intrinsic subject motion — a forward video draws the same decoded frame per sub-sample
  // (per-sub-frame decode would need a full forward frame cache). Transform blur is the common use.
  let _mbCv = null;
  function drawMotionBlur(ctx, layer, t, scene) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const mb = layer.motionBlur;
    const samples = Math.max(2, Math.min(32, Math.round(mb.samples || 8)));
    const fps = (scene && scene.project && scene.project.fps) || 30;
    const dt = (mb.shutter != null ? mb.shutter : 0.5) / fps;   // shutter window in seconds
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height;
    if (!_mbCv) _mbCv = document.createElement('canvas');
    const off = _mbCv; off.width = W; off.height = H;
    const octx = off.getContext('2d');
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
    octx.globalAlpha = 1; octx.globalCompositeOperation = 'source-over'; octx.filter = 'none';
    // Sub-sample at 1/K opacity with ADDITIVE ('add'→lighter) compositing so overlapping samples
    // sum to full: a static layer stays solid, a moving one fades into a trail.
    // Collect only sub-times inside the clip's life, then renormalize opacity to that count: keeps
    // brightness constant near clip in/out WITHOUT collapsing skipped samples onto one boundary time
    // (which would reconstruct a sharp un-blurred frame — a visible seam).
    const lo = layer.start, hi = layer.start + layer.duration - 1e-4;
    const times = [];
    for (let k = 0; k < samples; k++) {
      const st = t + (k / (samples - 1) - 0.5) * dt;
      if (st >= lo && st <= hi) times.push(st);
    }
    if (!times.length) times.push(Math.max(lo, Math.min(hi, t)));
    const tmp = Object.assign({}, layer, { motionBlur: null, blendMode: 'add', transform: Object.assign({}, layer.transform, { opacity: 1 / times.length }) });
    times.forEach(st => drawLayer(octx, tmp, st, scene));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }
  FM.layerHasMotionBlur = function (layer) { return layer.motionBlur && layer.motionBlur.enabled; };

  // The per-pixel post-process effects, and a dispatcher that applies one (the outermost pass).
  // Each draw* renders a clean copy of the layer with THIS effect instance removed (recursing
  // inward through the remaining post-fx), then applies its own transform — so they compose in
  // array order regardless of type.
  const POSTFX = { rgbsplit: 1, pixelate: 1, posterize: 1, mirror: 1, tint: 1, threshold: 1, duotone: 1,
    solarize: 1, gamma: 1, temperature: 1, noise: 1, scanlines: 1,
    vibrance: 1, sharpen: 1, thermal: 1, dither: 1, halftone: 1,
    wave: 1, ripple: 1, twirl: 1, bulge: 1,
    edge: 1, emboss: 1, exposure: 1, fisheye: 1,
    kaleidoscope: 1, glitch: 1, zoomblur: 1, crt: 1,
    boxblur: 1, spinblur: 1, gradientmap: 1, colorize: 1, checker: 1, grid: 1,
    mosaic: 1, lensblur: 1, dots: 1, polarcoords: 1, bend: 1, glass: 1,
    lightglow: 1, longshadow: 1, halftonelines: 1, clouds: 1, rays: 1, stripes: 1,
    darkglow: 1, stroke: 1, smoothedges: 1, blocknoise: 1, starfield: 1, curl: 1,
    bumpmap: 1, edgeglow: 1, contourlines: 1, grunge: 1, iridescence: 1, fractalwarp: 1,
    motionblur: 1, colorbalance: 1, highlightsshadows: 1, tiltshift: 1,
    dropshadow: 1, chromaticaberration: 1, innerglow: 1, unsharpmask: 1, hextiles: 1, linstreaks: 1,
    blink: 1, flicker: 1, pulseopacity: 1, dissolve: 1, blockdissolve: 1,
    wipe: 1, radialwipe: 1, solidmatte: 1, mattechoker: 1, mattefringe: 1,
    gridrepeat: 1, linearrepeat: 1, radialrepeat: 1, mirrortile: 1,
    channelremap: 1, gradientoverlay: 1, lensflare: 1, roughenedges: 1, hexarray: 1,
    electricedges: 1, glowscan: 1, spinstreaks: 1, fractalridges: 1, smoothbevel: 1,
    zoomstreaks: 1, innerblur: 1, contourstrips: 1, innerpinch: 1, crosshatch: 1,
    bleachbypass: 1, tealorange: 1, crossprocess: 1, lightleak: 1, letterbox: 1, border: 1,
    faded: 1, nightvision: 1, sketch: 1,
    cube3d: 1, box3d: 1, cylinder3d: 1, sphere3d: 1, ellipsoid3d: 1, torus3d: 1, ring3d: 1,
    pyramid3d: 1, octahedron3d: 1, hexprism3d: 1, starprism3d: 1, starpoly3d: 1, heart3d: 1,
    hollowbox3d: 1, axiscross3d: 1, pagecurl: 1, fliplayer: 1, rasterextrude: 1,
    wiggle: 1, shake: 1, swing: 1, spin: 1, pulse: 1, drift: 1, orbit: 1,
    squeeze: 1, tiles: 1 };
  function applyPostFx(ctx, layer, t, scene, fx) {
    const p = fx.params || {};
    if (fx.type === 'rgbsplit') return drawRgbSplit(ctx, layer, t, scene, FM.evalProp(p.amount, t) || 0, fx);
    if (fx.type === 'pixelate') return drawPixelate(ctx, layer, t, scene, FM.evalProp(p.size, t) || 1, fx);
    if (fx.type === 'posterize') return drawPosterize(ctx, layer, t, scene, FM.evalProp(p.levels, t) || 5, fx);
    if (fx.type === 'mirror') return drawMirror(ctx, layer, t, scene, p.mode || 0, fx);
    if (fx.type === 'tint') return drawTint(ctx, layer, t, scene, FM.evalProp(p.amount, t), p.color || '#ff3366', fx);
    if (fx.type === 'threshold') return drawThreshold(ctx, layer, t, scene, FM.evalProp(p.level, t), fx);
    if (fx.type === 'duotone') return drawDuotone(ctx, layer, t, scene, FM.evalProp(p.amount, t), p.color || '#241a52', p.color2 || '#ff9e5e', fx);
    // generic per-pixel colour/texture effects
    if (PIXEL_FX[fx.type]) return drawPixelEffect(ctx, layer, t, scene, fx, PIXEL_FX[fx.type]);
    // generic geometric warps
    if (WARP_FX[fx.type]) return drawWarpEffect(ctx, layer, t, scene, fx, WARP_FX[fx.type]);
    // canvas-composited effects (3D mesh solids, Move/Transform motion, tiles/extrude)
    if (CANVAS_FX[fx.type]) return drawCanvasEffect(ctx, layer, t, scene, fx, CANVAS_FX[fx.type]);
  }

  // Generic per-pixel effect: render the layer clean to an offscreen (this fx removed so the rest still
  // compose), run a pixel function over the ImageData, then draw it back with the layer's opacity/blend.
  // Each pixel fn mutates `d` (RGBA bytes) in place; gets (d, W, H, P) where P = evaluated params.
  let _pfA = null, _pfB = null;
  function drawPixelEffect(ctx, layer, t, scene, fx, fn) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const proj = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = proj.width, H = proj.height;
    if (!_pfA) _pfA = document.createElement('canvas');
    if (!_pfB) _pfB = document.createElement('canvas');
    _pfA.width = W; _pfA.height = H; _pfB.width = W; _pfB.height = H;
    const actx = _pfA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => e !== fx), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const img = actx.getImageData(0, 0, W, H);
    fn(img.data, W, H, fx.params || {}, t);
    _pfB.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_pfB, 0, 0);
    ctx.restore();
  }

  // Per-pixel effect functions. Each mutates the RGBA byte array in place. Read params via FM.evalProp.
  const PIXEL_FX = {
    solarize: function (d, W, H, p, t) {
      // evalProp returns 0 (never null) for a missing prop, so branch on the raw param to actually
      // reach the 0.5 default when an instance has no threshold key (older/imported/AI nodes). (#19)
      const thr = clamp01(p.threshold == null ? 0.5 : FM.evalProp(p.threshold, t)) * 255;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > thr) d[i] = 255 - d[i];
        if (d[i + 1] > thr) d[i + 1] = 255 - d[i + 1];
        if (d[i + 2] > thr) d[i + 2] = 255 - d[i + 2];
      }
    },
    gamma: function (d, W, H, p, t) {
      const g = Math.max(0.05, FM.evalProp(p.gamma, t) || 1), inv = 1 / g, LUT = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) LUT[v] = Math.round(255 * Math.pow(v / 255, inv));
      for (let i = 0; i < d.length; i += 4) { d[i] = LUT[d[i]]; d[i + 1] = LUT[d[i + 1]]; d[i + 2] = LUT[d[i + 2]]; }
    },
    temperature: function (d, W, H, p, t) {
      const a = (FM.evalProp(p.amount, t) || 0) / 100, r = a * 50, b = -a * 50;   // warm: +R -B, cool: opposite
      for (let i = 0; i < d.length; i += 4) { d[i] = d[i] + r; d[i + 2] = d[i + 2] + b; }
    },
    noise: function (d, W, H, p, t) {
      const amt = (FM.evalProp(p.amount, t) || 0) / 100 * 160;   // up to ±80
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        // deterministic per-pixel hash (stable when paused), shifted slightly by frame for subtle motion
        const px = (i >> 2);
        let h = (px * 374761393 + Math.floor(t * 24) * 668265263) | 0;
        h = (h ^ (h >> 13)) * 1274126177; h = (h ^ (h >> 16));
        const n = ((h & 255) / 255 - 0.5) * amt;
        d[i] += n; d[i + 1] += n; d[i + 2] += n;
      }
    },
    scanlines: function (d, W, H, p, t) {
      const amt = clamp01(p.amount == null ? 0.6 : FM.evalProp(p.amount, t));   // reach the 0.6 default for a missing param (evalProp→0, never null) (#19)
      for (let y = 0; y < H; y++) {
        if (y % 2 === 0) continue;                 // darken every other row
        const k = 1 - amt, row = y * W * 4;
        for (let x = 0; x < W; x++) { const i = row + x * 4; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
      }
    },
    // ---- batch 2 ----
    vibrance: function (d, W, H, p, t) {
      const a = FM.evalProp(p.amount, t), k = (a == null ? 1.6 : a);
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], avg = (r + g + b) / 3;
        const f = 1 + (k - 1) * (1 - (Math.max(r, g, b) - Math.min(r, g, b)) / 255);   // unsaturated pixels boosted more
        d[i] = avg + (r - avg) * f; d[i + 1] = avg + (g - avg) * f; d[i + 2] = avg + (b - avg) * f;
      }
    },
    sharpen: function (d, W, H, p, t) {
      const a = FM.evalProp(p.amount, t), amt = (a == null ? 1.5 : a);
      if (amt <= 0) return;
      const s = d.slice();
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = (y * W + x) * 4;
          for (let c = 0; c < 3; c++) {
            const j = i + c;
            d[j] = s[j] * (1 + 4 * amt) - (s[j - W * 4] + s[j + W * 4] + s[j - 4] + s[j + 4]) * amt;
          }
        }
      }
    },
    thermal: (function () {
      const STOPS = [[0, 0, 0], [10, 0, 130], [120, 0, 170], [230, 50, 40], [255, 175, 0], [255, 255, 165]];
      function pal(l) {
        const seg = l * (STOPS.length - 1); let i0 = Math.floor(seg); if (i0 >= STOPS.length - 1) i0 = STOPS.length - 2; const f = seg - i0;
        const a = STOPS[i0], b = STOPS[i0 + 1];
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
      }
      return function (d, W, H, p, t) {
        const a = FM.evalProp(p.amount, t), am = (a == null ? 1 : clamp01(a));
        for (let i = 0; i < d.length; i += 4) {
          const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255, c = pal(l);
          d[i] += (c[0] - d[i]) * am; d[i + 1] += (c[1] - d[i + 1]) * am; d[i + 2] += (c[2] - d[i + 2]) * am;
        }
      };
    })(),
    dither: (function () {
      const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      return function (d, W, H, p, t) {
        const lv = Math.max(2, Math.round(FM.evalProp(p.levels, t) || 4)), step = 255 / (lv - 1);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4, thr = (B[y & 3][x & 3] / 16 - 0.5) * step;
            d[i] = Math.round(Math.round((d[i] + thr) / step) * step);
            d[i + 1] = Math.round(Math.round((d[i + 1] + thr) / step) * step);
            d[i + 2] = Math.round(Math.round((d[i + 2] + thr) / step) * step);
          }
        }
      };
    })(),
    halftone: function (d, W, H, p, t) {
      const size = Math.max(2, Math.round(FM.evalProp(p.size, t) || 8)), r2 = size / 2, s = d.slice();
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const ccx = Math.min(W - 1, Math.floor(x / size) * size + (size >> 1));
          const ccy = Math.min(H - 1, Math.floor(y / size) * size + (size >> 1));
          const ci = (ccy * W + ccx) * 4;
          const l = (s[ci] * 0.299 + s[ci + 1] * 0.587 + s[ci + 2] * 0.114) / 255;
          const dist = Math.hypot(x - (Math.floor(x / size) * size + r2), y - (Math.floor(y / size) * size + r2));
          const v = dist < (1 - l) * r2 * 1.45 ? 0 : 255;
          d[i] = v; d[i + 1] = v; d[i + 2] = v;
        }
      }
    },
    // ---- batch 4 ----
    edge: function (d, W, H, p, t) {
      const k = FM.evalProp(p.amount, t) || 1, s = d.slice(), w4 = W * 4;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = (y * W + x) * 4;
          const tl = s[i - w4 - 4] * 0.299 + s[i - w4 - 3] * 0.587 + s[i - w4 - 2] * 0.114;
          const tc = s[i - w4] * 0.299 + s[i - w4 + 1] * 0.587 + s[i - w4 + 2] * 0.114;
          const tr = s[i - w4 + 4] * 0.299 + s[i - w4 + 5] * 0.587 + s[i - w4 + 6] * 0.114;
          const ml = s[i - 4] * 0.299 + s[i - 3] * 0.587 + s[i - 2] * 0.114;
          const mr = s[i + 4] * 0.299 + s[i + 5] * 0.587 + s[i + 6] * 0.114;
          const bl = s[i + w4 - 4] * 0.299 + s[i + w4 - 3] * 0.587 + s[i + w4 - 2] * 0.114;
          const bc = s[i + w4] * 0.299 + s[i + w4 + 1] * 0.587 + s[i + w4 + 2] * 0.114;
          const br = s[i + w4 + 4] * 0.299 + s[i + w4 + 5] * 0.587 + s[i + w4 + 6] * 0.114;
          const gx = (tr + 2 * mr + br) - (tl + 2 * ml + bl), gy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
          const mag = Math.min(255, Math.hypot(gx, gy) * k);
          d[i] = mag; d[i + 1] = mag; d[i + 2] = mag;
        }
      }
    },
    emboss: function (d, W, H, p, t) {
      const k = (FM.evalProp(p.amount, t) == null ? 1 : FM.evalProp(p.amount, t)), s = d.slice(), w4 = W * 4;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = (y * W + x) * 4;
          for (let c = 0; c < 3; c++) { const j = i + c; d[j] = 128 + (s[j - w4 - 4] * -2 + s[j - w4] * -1 + s[j - 4] * -1 + s[j + 4] + s[j + w4] + s[j + w4 + 4] * 2) * k; }
        }
      }
    },
    exposure: function (d, W, H, p, t) {
      const m = Math.pow(2, FM.evalProp(p.stops, t) || 0);
      for (let i = 0; i < d.length; i += 4) { d[i] *= m; d[i + 1] *= m; d[i + 2] *= m; }
    },
    // ---- batch 5 ----
    glitch: function (d, W, H, p, t) {
      const amt = clamp01(FM.evalProp(p.amount, t)); if (amt <= 0) return;
      const s = d.slice(), bands = 14, bandH = Math.max(1, Math.floor(H / bands)), frame = Math.floor(t * 10);
      for (let b = 0; b < bands; b++) {
        let h = (b * 2654435761 + frame * 40503) | 0; h = (h ^ (h >> 13)) * 1274126177; h = h ^ (h >> 16);
        const shift = Math.round(((h & 255) / 255 - 0.5) * amt * W * 0.28);
        if (!shift) continue;
        const y0 = b * bandH, y1 = Math.min(H, y0 + bandH);
        for (let y = y0; y < y1; y++) {
          const row = y * W * 4;
          for (let x = 0; x < W; x++) { let sx = x - shift; if (sx < 0) sx += W; else if (sx >= W) sx -= W; const i = row + x * 4, si = row + sx * 4; d[i] = s[si]; d[i + 1] = s[si + 1]; d[i + 2] = s[si + 2]; d[i + 3] = s[si + 3]; }
        }
      }
      const cs = Math.round(amt * 9);
      if (cs > 0) { const s2 = d.slice(); for (let y = 0; y < H; y++) { const row = y * W * 4; for (let x = 0; x < W; x++) { const i = row + x * 4; d[i] = s2[row + Math.min(W - 1, x + cs) * 4]; d[i + 2] = s2[row + Math.max(0, x - cs) * 4 + 2]; } } }
    },
    zoomblur: function (d, W, H, p, t) {
      const amt = FM.evalProp(p.amount, t) || 0; if (amt <= 0) return;
      const s = d.slice(), cx = W / 2, cy = H / 2, N = 9;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4, dx = x - cx, dy = y - cy; let r = 0, g = 0, b = 0, a = 0, n = 0;
          for (let k = 0; k < N; k++) {
            const f = 1 - (k / N) * amt * 0.35, sx = (cx + dx * f) | 0, sy = (cy + dy * f) | 0;
            if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
            const si = (sy * W + sx) * 4; r += s[si]; g += s[si + 1]; b += s[si + 2]; a += s[si + 3]; n++;
          }
          if (n) { d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; d[i + 3] = a / n; }
        }
      }
    },
    crt: function (d, W, H, p, t) {
      const amt = clamp01(FM.evalProp(p.amount, t)), cx = W / 2, cy = H / 2, maxR = Math.hypot(cx, cy);
      for (let y = 0; y < H; y++) {
        const scan = (y & 1) ? (1 - amt * 0.45) : 1, row = y * W;
        for (let x = 0; x < W; x++) {
          const i = (row + x) * 4, ph = x % 3;
          let kr = scan, kg = scan, kb = scan;
          if (ph === 0) { kg *= 1 - amt * 0.18; kb *= 1 - amt * 0.18; } else if (ph === 1) { kr *= 1 - amt * 0.18; kb *= 1 - amt * 0.18; } else { kr *= 1 - amt * 0.18; kg *= 1 - amt * 0.18; }
          const r = Math.hypot(x - cx, y - cy) / maxR, vg = 1 - amt * 0.55 * Math.max(0, r - 0.4);
          d[i] *= kr * vg; d[i + 1] *= kg * vg; d[i + 2] *= kb * vg;
        }
      }
    },
    // ---- batch 6 ----
    boxblur: function(d,W,H,p,t){ var bbr=Math.round(FM.evalProp(p.radius,t)||0); if(bbr<1)return; if(bbr>40)bbr=40; var bbWin=2*bbr+1, bbInv=1/bbWin, bbSrc=d.slice(), bbX, bbY, bbCh, bbBase, bbSum, bbIdx, bbN, bbW4=W*4; for(bbY=0;bbY<H;bbY++){ bbBase=bbY*bbW4; for(bbCh=0;bbCh<4;bbCh++){ bbSum=bbSrc[bbBase+bbCh]*(bbr+1); for(bbN=1;bbN<=bbr;bbN++){ bbX=bbN<W?bbN:W-1; bbSum+=bbSrc[bbBase+bbX*4+bbCh]; } for(bbX=0;bbX<W;bbX++){ d[bbBase+bbX*4+bbCh]=bbSum*bbInv; bbN=bbX+bbr+1; bbIdx=bbN<W?bbN:W-1; bbSum+=bbSrc[bbBase+bbIdx*4+bbCh]; bbN=bbX-bbr; bbIdx=bbN>0?bbN:0; bbSum-=bbSrc[bbBase+bbIdx*4+bbCh]; } } } bbSrc=d.slice(); for(bbX=0;bbX<W;bbX++){ bbBase=bbX*4; for(bbCh=0;bbCh<4;bbCh++){ bbSum=bbSrc[bbBase+bbCh]*(bbr+1); for(bbN=1;bbN<=bbr;bbN++){ bbY=bbN<H?bbN:H-1; bbSum+=bbSrc[bbBase+bbY*bbW4+bbCh]; } for(bbY=0;bbY<H;bbY++){ d[bbBase+bbY*bbW4+bbCh]=bbSum*bbInv; bbN=bbY+bbr+1; bbIdx=bbN<H?bbN:H-1; bbSum+=bbSrc[bbBase+bbIdx*bbW4+bbCh]; bbN=bbY-bbr; bbIdx=bbN>0?bbN:0; bbSum-=bbSrc[bbBase+bbIdx*bbW4+bbCh]; } } } },
    spinblur: function(d,W,H,p,t){ var sbAmt=FM.evalProp(p.amount,t); if(sbAmt==null)sbAmt=0.5; if(sbAmt<0)sbAmt=0; if(sbAmt>1)sbAmt=1; if(sbAmt<=0)return; var sbS=d.slice(); var sbCx=W/2, sbCy=H/2, sbW4=W*4; var sbSpan=sbAmt*0.4, sbN=9, sbHalf=(sbN-1)/2; var sbCos=new Float64Array(sbN), sbSin=new Float64Array(sbN); for(var sbk=0;sbk<sbN;sbk++){ var sbOff=(sbk-sbHalf)/sbHalf*sbSpan; sbCos[sbk]=Math.cos(sbOff); sbSin[sbk]=Math.sin(sbOff); } for(var sby=0;sby<H;sby++){ var sbDy=sby-sbCy; for(var sbx=0;sbx<W;sbx++){ var sbDx=sbx-sbCx; var sbR=0,sbG=0,sbB=0,sbA=0; for(var sbj=0;sbj<sbN;sbj++){ var sbC=sbCos[sbj], sbN2=sbSin[sbj]; var sbSx=sbCx+sbDx*sbC-sbDy*sbN2; var sbSy=sbCy+sbDx*sbN2+sbDy*sbC; var sbIx=sbSx<0?0:(sbSx>W-1?W-1:(sbSx+0.5)|0); var sbIy=sbSy<0?0:(sbSy>H-1?H-1:(sbSy+0.5)|0); var sbI=sbIy*sbW4+sbIx*4; sbR+=sbS[sbI]; sbG+=sbS[sbI+1]; sbB+=sbS[sbI+2]; sbA+=sbS[sbI+3]; } var sbO=sby*sbW4+sbx*4; d[sbO]=sbR/sbN; d[sbO+1]=sbG/sbN; d[sbO+2]=sbB/sbN; d[sbO+3]=sbA/sbN; } } },
    gradientmap: function(d,W,H,p,t){ var gmAmt=FM.evalProp(p.amount,t); if(gmAmt==null)gmAmt=1; if(gmAmt<0)gmAmt=0; if(gmAmt>1)gmAmt=1; var gmSh=hexToRGB(p.color)||[36,26,82], gmHi=hexToRGB(p.color2)||[255,184,108]; var gmS0=gmSh[0],gmS1=gmSh[1],gmS2=gmSh[2], gmD0=gmHi[0]-gmS0,gmD1=gmHi[1]-gmS1,gmD2=gmHi[2]-gmS2; for(var gmI=0;gmI<d.length;gmI+=4){ var gmL=(0.299*d[gmI]+0.587*d[gmI+1]+0.114*d[gmI+2])/255; var gmO0=gmS0+gmD0*gmL, gmO1=gmS1+gmD1*gmL, gmO2=gmS2+gmD2*gmL; d[gmI]=d[gmI]+(gmO0-d[gmI])*gmAmt; d[gmI+1]=d[gmI+1]+(gmO1-d[gmI+1])*gmAmt; d[gmI+2]=d[gmI+2]+(gmO2-d[gmI+2])*gmAmt; } },
    colorize: function(d,W,H,p,t){ var czAmt=FM.evalProp(p.amount,t); czAmt=(czAmt==null?1:czAmt); if(czAmt<0)czAmt=0; if(czAmt>1)czAmt=1; var czCol=hexToRGB(p.color)||[58,160,255]; var czR=czCol[0],czG=czCol[1],czB=czCol[2]; for(var czI=0;czI<d.length;czI+=4){ var czL=(0.299*d[czI]+0.587*d[czI+1]+0.114*d[czI+2])/255; var czF=0.25+0.75*czL; var czTR=czR*czF; var czTG=czG*czF; var czTB=czB*czF; if(czTR<0)czTR=0; else if(czTR>255)czTR=255; if(czTG<0)czTG=0; else if(czTG>255)czTG=255; if(czTB<0)czTB=0; else if(czTB>255)czTB=255; d[czI]=d[czI]+(czTR-d[czI])*czAmt; d[czI+1]=d[czI+1]+(czTG-d[czI+1])*czAmt; d[czI+2]=d[czI+2]+(czTB-d[czI+2])*czAmt; } },
    checker: function(d,W,H,p,t){ var chkSz=FM.evalProp(p.size,t); chkSz=(chkSz==null?24:chkSz); chkSz=Math.max(2,Math.min(120,Math.round(chkSz))); var chkCol=hexToRGB(p.color)||[0,0,0]; var chkR=chkCol[0],chkG=chkCol[1],chkB=chkCol[2]; for(var chkY=0;chkY<H;chkY++){ var chkRow=(chkY/chkSz)|0; var chkBase=chkY*W*4; for(var chkX=0;chkX<W;chkX++){ if((((chkX/chkSz)|0)+chkRow)&1){ var chkI=chkBase+chkX*4; if(d[chkI+3]>0){ d[chkI]=(d[chkI]+chkR)*0.5; d[chkI+1]=(d[chkI+1]+chkG)*0.5; d[chkI+2]=(d[chkI+2]+chkB)*0.5; } } } } },
    grid: function(d,W,H,p,t){ var grSize=FM.evalProp(p.size,t); grSize=(grSize==null?32:grSize); grSize=Math.round(grSize); if(grSize<4)grSize=4; if(grSize>160)grSize=160; var grLW=Math.max(1,Math.round(grSize*0.06)); var grCol=hexToRGB(p.color)||[255,255,255]; var grR=grCol[0],grG=grCol[1],grB=grCol[2]; for(var grY=0;grY<H;grY++){ var grYOn=((grY%grSize)<grLW); var grRow=grY*W*4; for(var grX=0;grX<W;grX++){ if(grYOn||((grX%grSize)<grLW)){ var grI=grRow+grX*4; if(d[grI+3]>0){ d[grI]=grR; d[grI+1]=grG; d[grI+2]=grB; } } } } },
    // ---- batch 7 (pixel) ----
    mosaic: function(d,W,H,p,t){ var moBs=Math.round(FM.evalProp(p.size,t)||16); if(moBs<2)moBs=2; if(moBs>100)moBs=100; var moS=d.slice(),moW4=W*4; for(var moBy=0;moBy<H;moBy+=moBs){ var moY1=Math.min(moBy+moBs,H); for(var moBx=0;moBx<W;moBx+=moBs){ var moX1=Math.min(moBx+moBs,W),moSr=0,moSg=0,moSb=0,moSa=0,moN=0; for(var moY=moBy;moY<moY1;moY++){ var moRow=moY*moW4; for(var moX=moBx;moX<moX1;moX++){ var moI=moRow+moX*4; moSr+=moS[moI]; moSg+=moS[moI+1]; moSb+=moS[moI+2]; moSa+=moS[moI+3]; moN++; } } if(moN===0)continue; var moAr=moSr/moN,moAg=moSg/moN,moAb=moSb/moN,moAa=moSa/moN; for(var moY2=moBy;moY2<moY1;moY2++){ var moRow2=moY2*moW4; for(var moX2=moBx;moX2<moX1;moX2++){ var moJ=moRow2+moX2*4; d[moJ]=moAr; d[moJ+1]=moAg; d[moJ+2]=moAb; d[moJ+3]=moAa; } } } } },
    lensblur: function(d,W,H,p,t){ var lb_r=FM.evalProp(p.radius,t); lb_r=(lb_r==null?10:lb_r); if(lb_r<0)lb_r=0; if(lb_r>30)lb_r=30; if(lb_r<1)return; var lb_s=d.slice(),lb_w4=W*4,lb_ox=new Float64Array(16),lb_oy=new Float64Array(16),lb_k; for(lb_k=0;lb_k<16;lb_k++){var lb_a=lb_k*2.399963,lb_rd=lb_r*Math.sqrt((lb_k+0.5)/16);lb_ox[lb_k]=Math.cos(lb_a)*lb_rd;lb_oy[lb_k]=Math.sin(lb_a)*lb_rd;} for(var lb_y=0;lb_y<H;lb_y++){for(var lb_x=0;lb_x<W;lb_x++){var lb_sr=0,lb_sg=0,lb_sb=0,lb_sa=0; for(lb_k=0;lb_k<16;lb_k++){var lb_sx=lb_x+lb_ox[lb_k]|0,lb_sy=lb_y+lb_oy[lb_k]|0; if(lb_sx<0)lb_sx=0; else if(lb_sx>=W)lb_sx=W-1; if(lb_sy<0)lb_sy=0; else if(lb_sy>=H)lb_sy=H-1; var lb_si=lb_sy*lb_w4+lb_sx*4; lb_sr+=lb_s[lb_si];lb_sg+=lb_s[lb_si+1];lb_sb+=lb_s[lb_si+2];lb_sa+=lb_s[lb_si+3];} var lb_di=lb_y*lb_w4+lb_x*4; d[lb_di]=lb_sr/16;d[lb_di+1]=lb_sg/16;d[lb_di+2]=lb_sb/16;d[lb_di+3]=lb_sa/16;}} },
    dots: function(d,W,H,p,t){ var dt_sz=FM.evalProp(p.size,t); if(dt_sz==null)dt_sz=16; dt_sz=Math.max(4,Math.min(80,dt_sz)); var dt_col=hexToRGB(p.color); var dt_cr=dt_sz*0.32, dt_r2=dt_cr*dt_cr, dt_a=0.85, dt_ia=1-dt_a, dt_w4=W*4; for(var dt_y=0;dt_y<H;dt_y++){ var dt_dcy=dt_y-(Math.floor(dt_y/dt_sz)*dt_sz+dt_sz/2); var dt_row=dt_y*dt_w4; for(var dt_x=0;dt_x<W;dt_x++){ var dt_i=dt_row+dt_x*4; if(d[dt_i+3]===0)continue; var dt_dcx=dt_x-(Math.floor(dt_x/dt_sz)*dt_sz+dt_sz/2); if(dt_dcx*dt_dcx+dt_dcy*dt_dcy<=dt_r2){ d[dt_i]=d[dt_i]*dt_ia+dt_col[0]*dt_a; d[dt_i+1]=d[dt_i+1]*dt_ia+dt_col[1]*dt_a; d[dt_i+2]=d[dt_i+2]*dt_ia+dt_col[2]*dt_a; } } } },
    // ---- batch 8 (pixel) ----
    lightglow: function(d,W,H,p,t){ var lgAmt=FM.evalProp(p.amount,t); if(lgAmt==null)lgAmt=0.6; lgAmt=lgAmt<0?0:(lgAmt>1?1:lgAmt); if(lgAmt<=0)return; var lgN=W*H, lgBright=new Float32Array(lgN), lgTmp=new Float32Array(lgN), lgi, lgp4; for(lgi=0;lgi<lgN;lgi++){ lgp4=lgi*4; if(d[lgp4+3]===0){lgBright[lgi]=0;continue;} var lgL=0.299*d[lgp4]+0.587*d[lgp4+1]+0.114*d[lgp4+2]; lgBright[lgi]=lgL>153?lgL:0; } var lgR=6, lgDiv=2*lgR+1, lgx, lgy, lgRow, lgSum, lgIdx; for(lgy=0;lgy<H;lgy++){ lgRow=lgy*W; lgSum=0; for(lgx=-lgR;lgx<=lgR;lgx++){ var lgcx=lgx<0?0:(lgx>=W?W-1:lgx); lgSum+=lgBright[lgRow+lgcx]; } for(lgx=0;lgx<W;lgx++){ lgTmp[lgRow+lgx]=lgSum/lgDiv; var lgAddX=lgx+lgR+1; lgAddX=lgAddX>=W?W-1:lgAddX; var lgSubX=lgx-lgR; lgSubX=lgSubX<0?0:lgSubX; lgSum+=lgBright[lgRow+lgAddX]-lgBright[lgRow+lgSubX]; } } for(lgx=0;lgx<W;lgx++){ lgSum=0; for(lgy=-lgR;lgy<=lgR;lgy++){ var lgcy=lgy<0?0:(lgy>=H?H-1:lgy); lgSum+=lgTmp[lgcy*W+lgx]; } for(lgy=0;lgy<H;lgy++){ lgBright[lgy*W+lgx]=lgSum/lgDiv; var lgAddY=lgy+lgR+1; lgAddY=lgAddY>=H?H-1:lgAddY; var lgSubY=lgy-lgR; lgSubY=lgSubY<0?0:lgSubY; lgSum+=lgTmp[lgAddY*W+lgx]-lgTmp[lgSubY*W+lgx]; } } for(lgi=0;lgi<lgN;lgi++){ lgp4=lgi*4; if(d[lgp4+3]===0)continue; var lgGlow=lgBright[lgi]*lgAmt; if(lgGlow<=0)continue; if(lgGlow>255)lgGlow=255; var lgF=(255-lgGlow)/255; d[lgp4]=255-(255-d[lgp4])*lgF; d[lgp4+1]=255-(255-d[lgp4+1])*lgF; d[lgp4+2]=255-(255-d[lgp4+2])*lgF; } },
    longshadow: function(d,W,H,p,t){ var lsLen=FM.evalProp(p.length,t); if(lsLen==null)lsLen=30; lsLen=Math.max(0,Math.min(80,Math.round(lsLen))); if(lsLen<=0)return; var lsCol=hexToRGB(p.color)||[0,0,0]; var lsR=lsCol[0]&255,lsG=lsCol[1]&255,lsB=lsCol[2]&255; var s=d.slice(); var lsND=W+H-1, lsDiag; for(lsDiag=0;lsDiag<lsND;lsDiag++){ var lsX0,lsY0; if(lsDiag<W){lsX0=lsDiag;lsY0=0;}else{lsX0=0;lsY0=lsDiag-W+1;} var lsX=lsX0,lsY=lsY0,lsCount=0; while(lsX<W&&lsY<H){ var lsI=(lsY*W+lsX)*4; if(s[lsI+3]>0){lsCount=0;}else{ lsCount++; if(lsCount<=lsLen){ d[lsI]=lsR; d[lsI+1]=lsG; d[lsI+2]=lsB; d[lsI+3]=255; } } lsX++; lsY++; } } },
    halftonelines: function(d,W,H,p,t){ var htlSize=FM.evalProp(p.size,t); if(htlSize==null||isNaN(htlSize))htlSize=8; htlSize=Math.max(3,Math.min(40,Math.round(htlSize))); var htlW4=W*4; for(var htlY=0;htlY<H;htlY++){ var htlRowMod=((htlY%htlSize)+htlSize)%htlSize; var htlRowBase=htlY*htlW4; for(var htlX=0;htlX<W;htlX++){ var htlI=htlRowBase+htlX*4; if(d[htlI+3]===0)continue; var htlL=(0.299*d[htlI]+0.587*d[htlI+1]+0.114*d[htlI+2])/255; if(htlL<0)htlL=0; else if(htlL>1)htlL=1; var htlThresh=(1-htlL)*htlSize; var htlV=(htlRowMod<htlThresh)?0:255; d[htlI]=htlV; d[htlI+1]=htlV; d[htlI+2]=htlV; } } },
    clouds: function(d,W,H,p,t){ var cl_amt=FM.evalProp(p.amount,t); if(cl_amt==null)cl_amt=0.6; cl_amt=cl_amt<0?0:(cl_amt>1?1:cl_amt); if(cl_amt<=0)return; function cl_hash(cx,cy){ var cl_h=(cx*374761393+cy*668265263)|0; cl_h=(cl_h^(cl_h>>>13))*1274126177|0; cl_h=cl_h^(cl_h>>>16); return ((cl_h>>>0)%1000)/999; } function cl_smooth(cl_f){ return cl_f*cl_f*(3-2*cl_f); } var cl_cells=[64,32,16], cl_wts=[0.5715,0.2857,0.1428]; var cl_w4=W*4; for(var cl_y=0;cl_y<H;cl_y++){ for(var cl_x=0;cl_x<W;cl_x++){ var cl_i=cl_y*cl_w4+cl_x*4; if(d[cl_i+3]<=0)continue; var cl_sum=0; for(var cl_o=0;cl_o<3;cl_o++){ var cl_C=cl_cells[cl_o]; var cl_gx=Math.floor(cl_x/cl_C), cl_gy=Math.floor(cl_y/cl_C); var cl_fx=(cl_x-cl_gx*cl_C)/cl_C, cl_fy=(cl_y-cl_gy*cl_C)/cl_C; var cl_v00=cl_hash(cl_gx,cl_gy), cl_v10=cl_hash(cl_gx+1,cl_gy), cl_v01=cl_hash(cl_gx,cl_gy+1), cl_v11=cl_hash(cl_gx+1,cl_gy+1); var cl_sx=cl_smooth(cl_fx), cl_sy=cl_smooth(cl_fy); var cl_top=cl_v00+(cl_v10-cl_v00)*cl_sx; var cl_bot=cl_v01+(cl_v11-cl_v01)*cl_sx; cl_sum+=(cl_top+(cl_bot-cl_top)*cl_sy)*cl_wts[cl_o]; } var cl_g=cl_sum*255; if(cl_g<0)cl_g=0; if(cl_g>255)cl_g=255; d[cl_i]=d[cl_i]+(cl_g-d[cl_i])*cl_amt; d[cl_i+1]=d[cl_i+1]+(cl_g-d[cl_i+1])*cl_amt; d[cl_i+2]=d[cl_i+2]+(cl_g-d[cl_i+2])*cl_amt; } } },
    rays: function(d,W,H,p,t){ var raysCount=FM.evalProp(p.count,t); if(raysCount==null)raysCount=16; raysCount=Math.max(3,Math.min(64,Math.round(raysCount))); var raysCol=hexToRGB(p.color); if(!raysCol)raysCol=[255,255,255]; var raysCr=raysCol[0],raysCg=raysCol[1],raysCb=raysCol[2]; var raysCx=W/2,raysCy=H/2; for(var raysY=0;raysY<H;raysY++){ var raysDy=raysY-raysCy; var raysRow=raysY*W*4; for(var raysX=0;raysX<W;raysX++){ var raysI=raysRow+raysX*4; if(d[raysI+3]===0)continue; var raysA=Math.atan2(raysDy,raysX-raysCx); var raysInt=Math.cos(raysA*raysCount)*0.5+0.5; var raysAmt=raysInt*0.6; var raysInv=1-raysAmt; d[raysI]=d[raysI]*raysInv+raysCr*raysAmt; d[raysI+1]=d[raysI+1]*raysInv+raysCg*raysAmt; d[raysI+2]=d[raysI+2]*raysInv+raysCb*raysAmt; } } },
    stripes: function(d,W,H,p,t){ var stp_size=FM.evalProp(p.size,t); if(stp_size==null)stp_size=16; stp_size=Math.max(4,Math.min(80,stp_size)); var stp_period=Math.max(2,Math.round(stp_size)); var stp_half=stp_period*0.5; var stp_c=hexToRGB(p.color); var stp_r=stp_c[0],stp_g=stp_c[1],stp_b=stp_c[2]; var stp_k=0.6,stp_ik=1-stp_k; for(var stp_y=0;stp_y<H;stp_y++){ var stp_row=stp_y*W*4; for(var stp_x=0;stp_x<W;stp_x++){ var stp_i=stp_row+stp_x*4; if(d[stp_i+3]<=0)continue; var stp_m=(stp_x+stp_y)%stp_period; if(stp_m<0)stp_m+=stp_period; if(stp_m<stp_half){ d[stp_i]=d[stp_i]*stp_ik+stp_r*stp_k; d[stp_i+1]=d[stp_i+1]*stp_ik+stp_g*stp_k; d[stp_i+2]=d[stp_i+2]*stp_ik+stp_b*stp_k; } } } },
    // ---- batch 9 (pixel) ----
    darkglow: function(d,W,H,p,t){ var dgAmt=FM.evalProp(p.amount,t); if(dgAmt==null)dgAmt=0.6; dgAmt=Math.max(0,Math.min(1,dgAmt)); if(dgAmt<=0)return; var dgN=W*H; var dgDark=new Float32Array(dgN); var dgI4,dgL; for(var dgi=0;dgi<dgN;dgi++){ dgI4=dgi*4; if(d[dgI4+3]>0){ dgL=0.299*d[dgI4]+0.587*d[dgI4+1]+0.114*d[dgI4+2]; if(dgL<102)dgDark[dgi]=255-dgL; } } var dgR=6,dgWin=2*dgR+1,dgInv=1/dgWin; var dgTmp=new Float32Array(dgN); var dgx,dgy,dgsum,dgrow,dgxa; for(dgy=0;dgy<H;dgy++){ dgrow=dgy*W; dgsum=0; for(dgx=-dgR;dgx<=dgR;dgx++){ dgxa=dgx<0?0:(dgx>=W?W-1:dgx); dgsum+=dgDark[dgrow+dgxa]; } for(dgx=0;dgx<W;dgx++){ dgTmp[dgrow+dgx]=dgsum*dgInv; var dgAdd=dgx+dgR+1; dgAdd=dgAdd>=W?W-1:dgAdd; var dgSub=dgx-dgR; dgSub=dgSub<0?0:dgSub; dgsum+=dgDark[dgrow+dgAdd]-dgDark[dgrow+dgSub]; } } for(dgx=0;dgx<W;dgx++){ dgsum=0; for(dgy=-dgR;dgy<=dgR;dgy++){ var dgya=dgy<0?0:(dgy>=H?H-1:dgy); dgsum+=dgTmp[dgya*W+dgx]; } for(dgy=0;dgy<H;dgy++){ dgDark[dgy*W+dgx]=dgsum*dgInv; var dgAddY=dgy+dgR+1; dgAddY=dgAddY>=H?H-1:dgAddY; var dgSubY=dgy-dgR; dgSubY=dgSubY<0?0:dgSubY; dgsum+=dgTmp[dgAddY*W+dgx]-dgTmp[dgSubY*W+dgx]; } } for(var dgj=0;dgj<dgN;dgj++){ dgI4=dgj*4; if(d[dgI4+3]>0){ var dgF=1-(dgDark[dgj]/255)*dgAmt; if(dgF<0)dgF=0; d[dgI4]=d[dgI4]*dgF; d[dgI4+1]=d[dgI4+1]*dgF; d[dgI4+2]=d[dgI4+2]*dgF; } } },
    stroke: function(d,W,H,p,t){ var st_w=Math.round(FM.evalProp(p.width,t)); if(!(st_w>=1))st_w=4; if(st_w>16)st_w=16; var st_col=hexToRGB(p.color)||[255,255,255]; var st_N=W*H, st_w4=W*4; var st_x,st_y,st_i; var st_src=new Uint8Array(st_N); for(st_i=0;st_i<st_N;st_i++)st_src[st_i]=(d[st_i*4+3]>0)?1:0; var st_h=new Uint8Array(st_N); for(st_y=0;st_y<H;st_y++){ var st_row=st_y*W; var st_acc=0; var st_lo,st_hi; for(st_x=0;st_x<W;st_x++){ st_lo=st_x-st_w; if(st_lo<0)st_lo=0; st_hi=st_x+st_w; if(st_hi>W-1)st_hi=W-1; if(st_x===0){ st_acc=0; for(var st_k=st_lo;st_k<=st_hi;st_k++)st_acc+=st_src[st_row+st_k]; } else { var st_addH=st_x+st_w; if(st_addH<=W-1)st_acc+=st_src[st_row+st_addH]; var st_remH=st_x-st_w-1; if(st_remH>=0)st_acc-=st_src[st_row+st_remH]; } st_h[st_row+st_x]=st_acc>0?1:0; } } var st_dil=new Uint8Array(st_N); for(st_x=0;st_x<W;st_x++){ var st_accV=0; var st_loV,st_hiV; for(st_y=0;st_y<H;st_y++){ st_loV=st_y-st_w; if(st_loV<0)st_loV=0; st_hiV=st_y+st_w; if(st_hiV>H-1)st_hiV=H-1; if(st_y===0){ st_accV=0; for(var st_kv=st_loV;st_kv<=st_hiV;st_kv++)st_accV+=st_h[st_kv*W+st_x]; } else { var st_addV=st_y+st_w; if(st_addV<=H-1)st_accV+=st_h[st_addV*W+st_x]; var st_remV=st_y-st_w-1; if(st_remV>=0)st_accV-=st_h[st_remV*W+st_x]; } st_dil[st_y*W+st_x]=st_accV>0?1:0; } } for(st_i=0;st_i<st_N;st_i++){ if(st_dil[st_i]===1 && st_src[st_i]===0){ var st_o=st_i*4; d[st_o]=st_col[0]; d[st_o+1]=st_col[1]; d[st_o+2]=st_col[2]; d[st_o+3]=255; } } },
    smoothedges: function(d,W,H,p,t){ var seR=Math.round(FM.evalProp(p.radius,t)); if(seR==null||isNaN(seR))seR=4; if(seR<1)return; if(seR>20)seR=20; var seW=W,seH=H,seN=seW*seH; var seA=new Float32Array(seN),seTmp=new Float32Array(seN); var sei,sex,sey; for(sei=0;sei<seN;sei++){ seA[sei]=d[sei*4+3]; } var seWin=seR*2+1,seInv=1/seWin; for(sey=0;sey<seH;sey++){ var seRow=sey*seW,seSum=0,sek; for(sek=-seR;sek<=seR;sek++){ var seXc=sek<0?0:(sek>=seW?seW-1:sek); seSum+=seA[seRow+seXc]; } for(sex=0;sex<seW;sex++){ seTmp[seRow+sex]=seSum*seInv; var seAddX=sex+seR+1; seAddX=seAddX>=seW?seW-1:seAddX; var seSubX=sex-seR; seSubX=seSubX<0?0:seSubX; seSum+=seA[seRow+seAddX]-seA[seRow+seSubX]; } } for(sex=0;sex<seW;sex++){ var seSumV=0,sekk; for(sekk=-seR;sekk<=seR;sekk++){ var seYc=sekk<0?0:(sekk>=seH?seH-1:sekk); seSumV+=seTmp[seYc*seW+sex]; } for(sey=0;sey<seH;sey++){ var seVal=seSumV*seInv; d[(sey*seW+sex)*4+3]=seVal<0?0:(seVal>255?255:seVal); var seAddY=sey+seR+1; seAddY=seAddY>=seH?seH-1:seAddY; var seSubY=sey-seR; seSubY=seSubY<0?0:seSubY; seSumV+=seTmp[seAddY*seW+sex]-seTmp[seSubY*seW+sex]; } } },
    blocknoise: function(d,W,H,p,t){ var bnAmt=FM.evalProp(p.amount,t); if(bnAmt==null)bnAmt=0.5; bnAmt=Math.max(0,Math.min(1,bnAmt)); var bnK=bnAmt*0.6, bnInv=1-bnK; if(bnK<=0)return; var bnFrame=Math.floor(t*8)|0, bnW4=W*4; for(var bnY=0;bnY<H;bnY++){ var bnBy=(bnY/6)|0, bnRow=bnY*bnW4; for(var bnX=0;bnX<W;bnX++){ var bnI=bnRow+bnX*4; if(d[bnI+3]<=0)continue; var bnBx=(bnX/6)|0; var bnHsh=(bnBx*374761393+bnBy*668265263+bnFrame*2147483647)|0; bnHsh=(bnHsh^(bnHsh>>>13))*1274126177|0; bnHsh=bnHsh^(bnHsh>>>16); var bnG=(bnHsh>>>0)&255; d[bnI]=d[bnI]*bnInv+bnG*bnK; d[bnI+1]=d[bnI+1]*bnInv+bnG*bnK; d[bnI+2]=d[bnI+2]*bnInv+bnG*bnK; } } },
    starfield: function(sf_d,sf_W,sf_H,sf_p,sf_t){ var sf_amt=FM.evalProp(sf_p.amount,sf_t); if(sf_amt==null)sf_amt=0.5; sf_amt=Math.max(0,Math.min(1,sf_amt)); var sf_thr=sf_amt*0.03; if(sf_thr<=0)return; var sf_col=hexToRGB(sf_p.color)||[255,255,255]; var sf_w4=sf_W*4; for(var sf_y=0;sf_y<sf_H;sf_y++){ var sf_row=sf_y*sf_w4; for(var sf_x=0;sf_x<sf_W;sf_x++){ var sf_i=sf_row+sf_x*4; if(sf_d[sf_i+3]<=0)continue; var sf_h=(sf_x*374761393+sf_y*668265263)|0; sf_h=(sf_h^(sf_h>>>13))*1274126177; sf_h=sf_h^(sf_h>>>16); var sf_r=(sf_h>>>0)/4294967295; if(sf_r<sf_thr){ sf_d[sf_i]=sf_col[0]; sf_d[sf_i+1]=sf_col[1]; sf_d[sf_i+2]=sf_col[2]; sf_d[sf_i+3]=255; } } } },
    // ---- batch 10 (pixel) ----
    bumpmap: function(d,W,H,p,t){ var bmAmt=FM.evalProp(p.amount,t); if(bmAmt==null)bmAmt=1.2; bmAmt=Math.max(0,Math.min(3,bmAmt)); var bmS=d.slice(); var bmW4=W*4; var bmK=4; var bmLx=-0.5,bmLy=-0.5,bmLz=1; var bmLlen=Math.sqrt(bmLx*bmLx+bmLy*bmLy+bmLz*bmLz); bmLx/=bmLlen; bmLy/=bmLlen; bmLz/=bmLlen; for(var bmY=0;bmY<H;bmY++){ var bmYu=bmY>0?bmY-1:0; var bmYd=bmY<H-1?bmY+1:H-1; for(var bmX=0;bmX<W;bmX++){ var bmI=(bmY*W+bmX)*4; if(bmS[bmI+3]===0){ d[bmI]=bmS[bmI]; d[bmI+1]=bmS[bmI+1]; d[bmI+2]=bmS[bmI+2]; continue; } var bmXl=bmX>0?bmX-1:0; var bmXr=bmX<W-1?bmX+1:W-1; var bmIl=(bmY*W+bmXl)*4; var bmIr=(bmY*W+bmXr)*4; var bmIu=(bmYu*W+bmX)*4; var bmId=(bmYd*W+bmX)*4; var bmLumL=0.299*bmS[bmIl]+0.587*bmS[bmIl+1]+0.114*bmS[bmIl+2]; var bmLumR=0.299*bmS[bmIr]+0.587*bmS[bmIr+1]+0.114*bmS[bmIr+2]; var bmLumU=0.299*bmS[bmIu]+0.587*bmS[bmIu+1]+0.114*bmS[bmIu+2]; var bmLumD=0.299*bmS[bmId]+0.587*bmS[bmId+1]+0.114*bmS[bmId+2]; var bmGx=(bmLumR-bmLumL)/255; var bmGy=(bmLumD-bmLumU)/255; var bmNx=-bmGx, bmNy=-bmGy, bmNz=bmK; var bmNlen=Math.sqrt(bmNx*bmNx+bmNy*bmNy+bmNz*bmNz); if(bmNlen<1e-6)bmNlen=1e-6; bmNx/=bmNlen; bmNy/=bmNlen; bmNz/=bmNlen; var bmDiff=bmNx*bmLx+bmNy*bmLy+bmNz*bmLz; if(bmDiff<0)bmDiff=0; var bmF=0.5+bmAmt*0.6*bmDiff; var bmR=bmS[bmI]*bmF; var bmG=bmS[bmI+1]*bmF; var bmB=bmS[bmI+2]*bmF; d[bmI]=bmR>255?255:(bmR<0?0:bmR); d[bmI+1]=bmG>255?255:(bmG<0?0:bmG); d[bmI+2]=bmB>255?255:(bmB<0?0:bmB); } } },
    edgeglow: function(d,W,H,p,t){ var egAmt=FM.evalProp(p.amount,t); if(egAmt==null)egAmt=1.5; egAmt=Math.max(0,Math.min(4,egAmt)); if(egAmt<=0)return; var egCol=hexToRGB(p.color); if(!egCol)egCol=[0,255,234]; var egW4=W*4, egN=W*H, s=d.slice(); var egLum=new Float32Array(egN); var egi,egx,egy,egp; for(egi=0;egi<egN;egi++){ egp=egi*4; egLum[egi]=0.299*s[egp]+0.587*s[egp+1]+0.114*s[egp+2]; } var egEdge=new Float32Array(egN); for(egy=0;egy<H;egy++){ var egym=egy>0?egy-1:0, egyp=egy<H-1?egy+1:H-1; for(egx=0;egx<W;egx++){ var egxm=egx>0?egx-1:0, egxp=egx<W-1?egx+1:W-1; var egTL=egLum[egym*W+egxm], egT=egLum[egym*W+egx], egTR=egLum[egym*W+egxp], egL=egLum[egy*W+egxm], egR=egLum[egy*W+egxp], egBL=egyp*W+egxm, egB=egyp*W+egx, egBR=egyp*W+egxp; var egGx=(egTR+2*egR+egLum[egBR])-(egTL+2*egL+egLum[egBL]); var egGy=(egLum[egBL]+2*egLum[egB]+egLum[egBR])-(egTL+2*egT+egTR); egEdge[egy*W+egx]=Math.sqrt(egGx*egGx+egGy*egGy); } } var egRad=3, egDiv=egRad*2+1; var egTmp=new Float32Array(egN), egBlur=new Float32Array(egN); for(egy=0;egy<H;egy++){ var egAcc=0, egRow=egy*W, egk; for(egk=-egRad;egk<=egRad;egk++){ var egcx=egk<0?0:(egk>W-1?W-1:egk); egAcc+=egEdge[egRow+egcx]; } for(egx=0;egx<W;egx++){ egTmp[egRow+egx]=egAcc/egDiv; var egout=egx-egRad, egin=egx+egRad+1; var egoc=egout<0?0:(egout>W-1?W-1:egout); var egic=egin<0?0:(egin>W-1?W-1:egin); egAcc+=egEdge[egRow+egic]-egEdge[egRow+egoc]; } } for(egx=0;egx<W;egx++){ var egAccV=0, egj; for(egj=-egRad;egj<=egRad;egj++){ var egcy=egj<0?0:(egj>H-1?H-1:egj); egAccV+=egTmp[egcy*W+egx]; } for(egy=0;egy<H;egy++){ egBlur[egy*W+egx]=egAccV/egDiv; var egouty=egy-egRad, eginy=egy+egRad+1; var egocy=egouty<0?0:(egouty>H-1?H-1:egouty); var egicy=eginy<0?0:(eginy>H-1?H-1:eginy); egAccV+=egTmp[egicy*W+egx]-egTmp[egocy*W+egx]; } } var egcr=egCol[0], egcg=egCol[1], egcb=egCol[2]; for(egi=0;egi<egN;egi++){ egp=egi*4; if(d[egp+3]<=0)continue; var egg=(egBlur[egi]/255)*egAmt; if(egg<=0)continue; var egsr=egcr*egg, egsg=egcg*egg, egsb=egcb*egg; if(egsr>255)egsr=255; if(egsg>255)egsg=255; if(egsb>255)egsb=255; d[egp]=255-(255-d[egp])*(255-egsr)/255; d[egp+1]=255-(255-d[egp+1])*(255-egsg)/255; d[egp+2]=255-(255-d[egp+2])*(255-egsb)/255; } },
    contourlines: function(d,W,H,p,t){ var clLv=Math.round(FM.evalProp(p.levels,t)||8); if(clLv<2)clLv=2; if(clLv>24)clLv=24; var clS=d.slice(),clW4=W*4,clScl=clLv/255; var clBand=new Int16Array(W*H); for(var clI=0,clJ=0;clI<clS.length;clI+=4,clJ++){ var clLum=0.299*clS[clI]+0.587*clS[clI+1]+0.114*clS[clI+2],clB=Math.floor(clLum*clScl); if(clB>=clLv)clB=clLv-1; clBand[clJ]=clB; } for(var clY=0;clY<H;clY++){ for(var clX=0;clX<W;clX++){ var clIdx=(clY*W+clX)*4; if(clS[clIdx+3]===0)continue; var clP=clY*W+clX,clBc=clBand[clP],clXr=clX+1<W?clX+1:clX,clYb=clY+1<H?clY+1:clY,clBr=clBand[clY*W+clXr],clBb=clBand[clYb*W+clX]; if(clBc!==clBr||clBc!==clBb){ d[clIdx]=0; d[clIdx+1]=0; d[clIdx+2]=0; } } } },
    grunge: function(gr_d,gr_W,gr_H,gr_p,gr_t){ var gr_amt=FM.evalProp(gr_p.amount,gr_t); if(gr_amt==null)gr_amt=0.5; gr_amt=Math.max(0,Math.min(1,gr_amt)); var gr_thr=gr_amt*0.55, gr_mot=gr_amt*0.15; var gr_w4=gr_W*4; for(var gr_y=0;gr_y<gr_H;gr_y++){ var gr_row=gr_y*gr_w4; for(var gr_x=0;gr_x<gr_W;gr_x++){ var gr_i=gr_row+gr_x*4; if(gr_d[gr_i+3]<=0)continue; var gr_h=(gr_x*73856093)^(gr_y*19349663); gr_h=gr_h^(gr_h>>>13); gr_h=(gr_h*1274126177)>>>0; var gr_n=(gr_h>>>8)/16777216; var gr_h2=(gr_x*83492791)^(gr_y*2654435761); gr_h2=gr_h2^(gr_h2>>>15); gr_h2=(gr_h2*40503)>>>0; var gr_n2=(gr_h2>>>8)/16777216; var gr_mul=1-gr_mot*(gr_n-0.5); if(gr_n<gr_thr){ gr_mul*=(0.25+0.6*gr_n2); } if(gr_mul<0)gr_mul=0; gr_d[gr_i]=gr_d[gr_i]*gr_mul; gr_d[gr_i+1]=gr_d[gr_i+1]*gr_mul; gr_d[gr_i+2]=gr_d[gr_i+2]*gr_mul; } } },
    iridescence: function(d,W,H,p,t){ var iri_amt=FM.evalProp(p.amount,t); if(iri_amt==null)iri_amt=0.7; iri_amt=iri_amt<0?0:(iri_amt>1?1:iri_amt); if(iri_amt<=0)return; for(var iri_y=0;iri_y<H;iri_y++){ var iri_row=iri_y*W*4; for(var iri_x=0;iri_x<W;iri_x++){ var iri_i=iri_row+iri_x*4; if(d[iri_i+3]<=0)continue; var iri_r=d[iri_i],iri_g=d[iri_i+1],iri_b=d[iri_i+2]; var iri_l=(0.299*iri_r+0.587*iri_g+0.114*iri_b)/255; var iri_h=(iri_l*3+(iri_x+iri_y)/120); iri_h=iri_h-Math.floor(iri_h); var iri_h6=iri_h*6; var iri_cr=Math.abs(iri_h6-3)-1; iri_cr=iri_cr<0?0:(iri_cr>1?1:iri_cr); var iri_cg=2-Math.abs(iri_h6-2); iri_cg=iri_cg<0?0:(iri_cg>1?1:iri_cg); var iri_cb=2-Math.abs(iri_h6-4); iri_cb=iri_cb<0?0:(iri_cb>1?1:iri_cb); var iri_sr=iri_cr*iri_l*255,iri_sg=iri_cg*iri_l*255,iri_sb=iri_cb*iri_l*255; d[iri_i]=iri_r+(iri_sr-iri_r)*iri_amt; d[iri_i+1]=iri_g+(iri_sg-iri_g)*iri_amt; d[iri_i+2]=iri_b+(iri_sb-iri_b)*iri_amt; } } },
    // ---- batch 11 (multi-param pixel) ----
    motionblur: function(d,W,H,p,t){ var mbDist=FM.evalProp(p.distance,t); if(mbDist==null)mbDist=20; mbDist=Math.max(0,Math.min(60,mbDist)); if(mbDist<1)return; var mbAng=FM.evalProp(p.angle,t); if(mbAng==null)mbAng=0; mbAng=Math.max(0,Math.min(360,mbAng)); var mbRad=mbAng*Math.PI/180; var mbDx=Math.cos(mbRad); var mbDy=Math.sin(mbRad); var mbStep=mbDist/8; var mbS=d.slice(); var mbXmax=W-1, mbYmax=H-1; for(var mbY=0;mbY<H;mbY++){ for(var mbX=0;mbX<W;mbX++){ var mbI=(mbY*W+mbX)*4; if(mbS[mbI+3]===0)continue; var mbR=0,mbG=0,mbB=0,mbA=0; for(var mbK=-4;mbK<=4;mbK++){ var mbOff=mbK*mbStep; var mbSx=Math.round(mbX+mbDx*mbOff); var mbSy=Math.round(mbY+mbDy*mbOff); if(mbSx<0)mbSx=0; else if(mbSx>mbXmax)mbSx=mbXmax; if(mbSy<0)mbSy=0; else if(mbSy>mbYmax)mbSy=mbYmax; var mbJ=(mbSy*W+mbSx)*4; mbR+=mbS[mbJ]; mbG+=mbS[mbJ+1]; mbB+=mbS[mbJ+2]; mbA+=mbS[mbJ+3]; } d[mbI]=mbR/9; d[mbI+1]=mbG/9; d[mbI+2]=mbB/9; d[mbI+3]=mbA/9; } } },
    colorbalance: function(d,W,H,p,t){ var cbR=FM.evalProp(p.red,t); if(cbR==null)cbR=25; cbR=cbR<-100?-100:(cbR>100?100:cbR); var cbG=FM.evalProp(p.green,t); if(cbG==null)cbG=0; cbG=cbG<-100?-100:(cbG>100?100:cbG); var cbB=FM.evalProp(p.blue,t); if(cbB==null)cbB=-25; cbB=cbB<-100?-100:(cbB>100?100:cbB); var cbAddR=cbR/100*80, cbAddG=cbG/100*80, cbAddB=cbB/100*80; var cbN=W*H*4; for(var cbI=0;cbI<cbN;cbI+=4){ if(d[cbI+3]>0){ var cbVr=d[cbI]+cbAddR; d[cbI]=cbVr<0?0:(cbVr>255?255:cbVr); var cbVg=d[cbI+1]+cbAddG; d[cbI+1]=cbVg<0?0:(cbVg>255?255:cbVg); var cbVb=d[cbI+2]+cbAddB; d[cbI+2]=cbVb<0?0:(cbVb>255?255:cbVb); } } },
    highlightsshadows: function(d,W,H,p,t){ var hsHi=FM.evalProp(p.highlights,t); if(hsHi==null)hsHi=-40; hsHi=hsHi<-100?-100:hsHi>100?100:hsHi; var hsSh=FM.evalProp(p.shadows,t); if(hsSh==null)hsSh=50; hsSh=hsSh<-100?-100:hsSh>100?100:hsSh; var hsSA=hsSh/100*120, hsHA=hsHi/100*120; var hsN=W*H*4; for(var hsI=0;hsI<hsN;hsI+=4){ if(d[hsI+3]<=0)continue; var hsR=d[hsI], hsG=d[hsI+1], hsB=d[hsI+2]; var hsL=(0.299*hsR+0.587*hsG+0.114*hsB)/255; if(hsL<0)hsL=0; else if(hsL>1)hsL=1; var hsInv=1-hsL; var hsWS=hsInv*hsInv; var hsWH=hsL*hsL; var hsAdd=hsSA*hsWS+hsHA*hsWH; var hsO; hsO=hsR+hsAdd; d[hsI]=hsO<0?0:hsO>255?255:hsO; hsO=hsG+hsAdd; d[hsI+1]=hsO<0?0:hsO>255?255:hsO; hsO=hsB+hsAdd; d[hsI+2]=hsO<0?0:hsO>255?255:hsO; } },
    tiltshift: function(d,W,H,p,t){ var tsCenter=FM.evalProp(p.center,t); if(tsCenter==null)tsCenter=0.5; tsCenter=tsCenter<0?0:(tsCenter>1?1:tsCenter); var tsSoft=FM.evalProp(p.softness,t); if(tsSoft==null)tsSoft=0.5; tsSoft=tsSoft<0?0:(tsSoft>1?1:tsSoft); var tsW4=W*4, tsLen=d.length, tsR=8; var tsSrc=d.slice(); var tsTmp=new Float32Array(tsLen); var tsx,tsy,tsc,tsi,tsj,tsAcc,tsCnt,tsBase; for(tsy=0;tsy<H;tsy++){ var tsRow=tsy*tsW4; for(tsx=0;tsx<W;tsx++){ tsBase=tsRow+tsx*4; for(tsc=0;tsc<4;tsc++){ tsAcc=0; tsCnt=0; for(tsj=-tsR;tsj<=tsR;tsj++){ var tsnx=tsx+tsj; if(tsnx<0)tsnx=0; else if(tsnx>=W)tsnx=W-1; tsAcc+=tsSrc[tsRow+tsnx*4+tsc]; tsCnt++; } tsTmp[tsBase+tsc]=tsAcc/tsCnt; } } } var tsBlur=new Float32Array(tsLen); for(tsx=0;tsx<W;tsx++){ var tsCol=tsx*4; for(tsy=0;tsy<H;tsy++){ tsBase=tsy*tsW4+tsCol; for(tsc=0;tsc<4;tsc++){ tsAcc=0; tsCnt=0; for(tsj=-tsR;tsj<=tsR;tsj++){ var tsny=tsy+tsj; if(tsny<0)tsny=0; else if(tsny>=H)tsny=H-1; tsAcc+=tsTmp[tsny*tsW4+tsCol+tsc]; tsCnt++; } tsBlur[tsBase+tsc]=tsAcc/tsCnt; } } } var tsLine=tsCenter*H; var tsDenom=0.05+(1-tsSoft)*0.5; if(tsDenom<0.0001)tsDenom=0.0001; for(tsy=0;tsy<H;tsy++){ var tsDist=Math.abs(tsy-tsLine)/H; var tsBw=tsDist/tsDenom; if(tsBw<0)tsBw=0; else if(tsBw>1)tsBw=1; var tsInv=1-tsBw; var tsRowI=tsy*tsW4; for(tsx=0;tsx<W;tsx++){ tsi=tsRowI+tsx*4; if(d[tsi+3]>0){ d[tsi]=tsSrc[tsi]*tsInv+tsBlur[tsi]*tsBw; d[tsi+1]=tsSrc[tsi+1]*tsInv+tsBlur[tsi+1]*tsBw; d[tsi+2]=tsSrc[tsi+2]*tsInv+tsBlur[tsi+2]*tsBw; } } } },
    // ---- batch 12 (multi-param + colour) ----
    dropshadow: function(d,W,H,p,t){ var dsDist=FM.evalProp(p.distance,t); if(dsDist==null)dsDist=18; dsDist=Math.max(0,Math.min(60,dsDist)); var dsAng=FM.evalProp(p.angle,t); if(dsAng==null)dsAng=135; var dsSoft=FM.evalProp(p.softness,t); if(dsSoft==null)dsSoft=6; dsSoft=Math.max(0,Math.min(20,Math.round(dsSoft))); var dsCol=hexToRGB(p.color); var dsCr=dsCol?dsCol[0]:0, dsCg=dsCol?dsCol[1]:0, dsCb=dsCol?dsCol[2]:0; var dsN=W*H; var dsRad=dsAng*Math.PI/180; var dsOx=Math.round(Math.cos(dsRad)*dsDist); var dsOy=Math.round(Math.sin(dsRad)*dsDist); var s=d.slice(); var dsShift=new Float32Array(dsN); var dsx,dsy,dssx,dssy; for(dsy=0;dsy<H;dsy++){ for(dsx=0;dsx<W;dsx++){ dssx=dsx-dsOx; dssy=dsy-dsOy; if(dssx<0||dssx>=W||dssy<0||dssy>=H){ dsShift[dsy*W+dsx]=0; } else { dsShift[dsy*W+dsx]=s[(dssy*W+dssx)*4+3]; } } } if(dsSoft>0){ var dsR=dsSoft; var dsWin=dsR*2+1; var dsTmp=new Float32Array(dsN); var dsAcc,dskx,dski,dsrow; for(dsy=0;dsy<H;dsy++){ dsrow=dsy*W; dsAcc=0; for(dski=-dsR;dski<=dsR;dski++){ dskx=dski<0?0:(dski>=W?W-1:dski); dsAcc+=dsShift[dsrow+dskx]; } for(dsx=0;dsx<W;dsx++){ dsTmp[dsrow+dsx]=dsAcc/dsWin; var dsAdd=dsx+dsR+1; dsAdd=dsAdd>=W?W-1:dsAdd; var dsSub=dsx-dsR; dsSub=dsSub<0?0:dsSub; dsAcc+=dsShift[dsrow+dsAdd]-dsShift[dsrow+dsSub]; } } var dscol2; for(dsx=0;dsx<W;dsx++){ dsAcc=0; for(dski=-dsR;dski<=dsR;dski++){ dscol2=dski<0?0:(dski>=H?H-1:dski); dsAcc+=dsTmp[dscol2*W+dsx]; } for(dsy=0;dsy<H;dsy++){ dsShift[dsy*W+dsx]=dsAcc/dsWin; var dsAddY=dsy+dsR+1; dsAddY=dsAddY>=H?H-1:dsAddY; var dsSubY=dsy-dsR; dsSubY=dsSubY<0?0:dsSubY; dsAcc+=dsTmp[dsAddY*W+dsx]-dsTmp[dsSubY*W+dsx]; } } } var dsi,dsidx,dsa,dssh,dsoa; for(dsi=0;dsi<dsN;dsi++){ dsidx=dsi*4; dsa=s[dsidx+3]; if(dsa>0) continue; dssh=dsShift[dsi]; if(dssh<=0) continue; dsoa=dssh; if(dsoa>255)dsoa=255; d[dsidx]=dsCr; d[dsidx+1]=dsCg; d[dsidx+2]=dsCb; d[dsidx+3]=dsoa; } },
    chromaticaberration: function(d,W,H,p,t){ var caAmt=FM.evalProp(p.amount,t); if(caAmt==null)caAmt=8; caAmt=Math.max(0,Math.min(30,caAmt)); var caAng=FM.evalProp(p.angle,t); if(caAng==null)caAng=0; var caRad=caAng*Math.PI/180; var caDx=Math.cos(caRad)*caAmt, caDy=Math.sin(caRad)*caAmt; if(caAmt===0)return; var caS=d.slice(); var caW4=W*4; for(var caY=0;caY<H;caY++){ for(var caX=0;caX<W;caX++){ var caI=(caY*W+caX)*4; if(caS[caI+3]===0)continue; var caRx=Math.round(caX+caDx); var caRy=Math.round(caY+caDy); if(caRx<0)caRx=0; else if(caRx>=W)caRx=W-1; if(caRy<0)caRy=0; else if(caRy>=H)caRy=H-1; var caBx=Math.round(caX-caDx); var caBy=Math.round(caY-caDy); if(caBx<0)caBx=0; else if(caBx>=W)caBx=W-1; if(caBy<0)caBy=0; else if(caBy>=H)caBy=H-1; var caRi=(caRy*W+caRx)*4; var caBi=(caBy*W+caBx)*4; d[caI]=caS[caRi]; d[caI+1]=caS[caI+1]; d[caI+2]=caS[caBi+2]; d[caI+3]=caS[caI+3]; } } },
    innerglow: function(d,W,H,p,t){ var igRad=FM.evalProp(p.radius,t); if(igRad==null)igRad=10; igRad=Math.max(1,Math.min(30,Math.round(igRad))); var igInt=FM.evalProp(p.intensity,t); if(igInt==null)igInt=1; igInt=Math.max(0,Math.min(2,igInt)); var igCol=hexToRGB(p.color||'#ffe08a'); var igN=W*H; var igMask=new Float32Array(igN); var igI; for(igI=0;igI<igN;igI++){ igMask[igI]=d[igI*4+3]>0?1:0; } var igTmp=new Float32Array(igN); var igDiam=igRad*2+1; var igInv=1/igDiam; var igX,igY,igK,igAcc,igRow,igIdx; for(igY=0;igY<H;igY++){ igRow=igY*W; igAcc=0; for(igK=-igRad;igK<=igRad;igK++){ var igCx=igK<0?0:(igK>=W?W-1:igK); igAcc+=igMask[igRow+igCx]; } for(igX=0;igX<W;igX++){ igTmp[igRow+igX]=igAcc*igInv; var igAdd=igX+igRad+1; igAdd=igAdd>=W?W-1:igAdd; var igSub=igX-igRad; igSub=igSub<0?0:igSub; igAcc+=igMask[igRow+igAdd]-igMask[igRow+igSub]; } } var igSoft=igMask; for(igX=0;igX<W;igX++){ igAcc=0; for(igK=-igRad;igK<=igRad;igK++){ var igCy=igK<0?0:(igK>=H?H-1:igK); igAcc+=igTmp[igCy*W+igX]; } for(igY=0;igY<H;igY++){ igSoft[igY*W+igX]=igAcc*igInv; var igAddY=igY+igRad+1; igAddY=igAddY>=H?H-1:igAddY; var igSubY=igY-igRad; igSubY=igSubY<0?0:igSubY; igAcc+=igTmp[igAddY*W+igX]-igTmp[igSubY*W+igX]; } } var igCr=igCol[0],igCg=igCol[1],igCb=igCol[2]; for(igI=0;igI<igN;igI++){ igIdx=igI*4; if(d[igIdx+3]<=0)continue; var igProx=(1-igSoft[igI])*1.6; if(igProx<0)igProx=0; else if(igProx>1)igProx=1; var igF=igProx*igInt; if(igF<=0)continue; if(igF>1)igF=1; var igGr=igCr*igF, igGg=igCg*igF, igGb=igCb*igF; var igR0=d[igIdx],igG0=d[igIdx+1],igB0=d[igIdx+2]; d[igIdx]=255-(255-igR0)*(255-igGr)/255; d[igIdx+1]=255-(255-igG0)*(255-igGg)/255; d[igIdx+2]=255-(255-igB0)*(255-igGb)/255; } },
    unsharpmask: function(d,W,H,p,t){ var umAmt=FM.evalProp(p.amount,t); if(umAmt==null)umAmt=1.2; umAmt=Math.max(0,Math.min(3,umAmt)); var umR=FM.evalProp(p.radius,t); if(umR==null)umR=3; umR=Math.round(Math.max(1,Math.min(20,umR))); if(umAmt<=0){return;} var umN=W*H; var umS=d.slice(); var umTmp=new Float32Array(umN*3); var umBlur=new Float32Array(umN*3); var umDiv=2*umR+1; var x,y,c,umP,umI; for(y=0;y<H;y++){ var umRow=y*W; var umAcc0=0,umAcc1=0,umAcc2=0; for(c=0;c<=umR;c++){ umI=(umRow+Math.min(W-1,c))*4; umAcc0+=umS[umI]; umAcc1+=umS[umI+1]; umAcc2+=umS[umI+2]; } var umLeftPx=(umRow)*4; umAcc0+=umS[umLeftPx]*umR; umAcc1+=umS[umLeftPx+1]*umR; umAcc2+=umS[umLeftPx+2]*umR; for(x=0;x<W;x++){ umP=(umRow+x)*3; umTmp[umP]=umAcc0/umDiv; umTmp[umP+1]=umAcc1/umDiv; umTmp[umP+2]=umAcc2/umDiv; var umAddX=Math.min(W-1,x+umR+1); var umSubX=Math.max(0,x-umR); var umAdd=(umRow+umAddX)*4; var umSub=(umRow+umSubX)*4; umAcc0+=umS[umAdd]-umS[umSub]; umAcc1+=umS[umAdd+1]-umS[umSub+1]; umAcc2+=umS[umAdd+2]-umS[umSub+2]; } } for(x=0;x<W;x++){ var umAcc0v=0,umAcc1v=0,umAcc2v=0; for(c=0;c<=umR;c++){ umP=(Math.min(H-1,c)*W+x)*3; umAcc0v+=umTmp[umP]; umAcc1v+=umTmp[umP+1]; umAcc2v+=umTmp[umP+2]; } umP=x*3; umAcc0v+=umTmp[umP]*umR; umAcc1v+=umTmp[umP+1]*umR; umAcc2v+=umTmp[umP+2]*umR; for(y=0;y<H;y++){ umP=(y*W+x)*3; umBlur[umP]=umAcc0v/umDiv; umBlur[umP+1]=umAcc1v/umDiv; umBlur[umP+2]=umAcc2v/umDiv; var umAddY=Math.min(H-1,y+umR+1); var umSubY=Math.max(0,y-umR); var umAddP=(umAddY*W+x)*3; var umSubP=(umSubY*W+x)*3; umAcc0v+=umTmp[umAddP]-umTmp[umSubP]; umAcc1v+=umTmp[umAddP+1]-umTmp[umSubP+1]; umAcc2v+=umTmp[umAddP+2]-umTmp[umSubP+2]; } } for(y=0;y<H;y++){ for(x=0;x<W;x++){ umI=(y*W+x)*4; if(umS[umI+3]<=0)continue; umP=(y*W+x)*3; for(c=0;c<3;c++){ var umOrig=umS[umI+c]; var umVal=umOrig+(umOrig-umBlur[umP+c])*umAmt; if(umVal<0)umVal=0; else if(umVal>255)umVal=255; d[umI+c]=umVal; } } } },
    hextiles: function(d,W,H,p,t){ var hxSize=FM.evalProp(p.size,t); if(hxSize==null)hxSize=20; if(hxSize<4)hxSize=4; if(hxSize>80)hxSize=80; var hxRowH=hxSize*0.75; if(hxRowH<1)hxRowH=1; var hxHalf=hxSize*0.5; var hxSrc=d.slice(); var hxW4=W*4; for(var hxY=0;hxY<H;hxY++){ var hxRow=Math.floor(hxY/hxRowH); var hxShift=(hxRow&1)?hxHalf:0; for(var hxX=0;hxX<W;hxX++){ var hxCol=Math.floor((hxX-hxShift)/hxSize); var hxBestDx=1e9,hxBestX=hxX,hxBestY=hxY; for(var hxRO=-1;hxRO<=1;hxRO++){ var hxR2=hxRow+hxRO; var hxCY=hxR2*hxRowH+hxRowH*0.5; var hxSh2=(hxR2&1)?hxHalf:0; for(var hxCO=-1;hxCO<=1;hxCO++){ var hxC2=hxCol+hxCO; var hxCX=hxC2*hxSize+hxSh2+hxHalf; var hxDX=hxX-hxCX, hxDY=hxY-hxCY; var hxDist=hxDX*hxDX+hxDY*hxDY; if(hxDist<hxBestDx){ hxBestDx=hxDist; hxBestX=Math.round(hxCX); hxBestY=Math.round(hxCY); } } } if(hxBestX<0)hxBestX=0; else if(hxBestX>=W)hxBestX=W-1; if(hxBestY<0)hxBestY=0; else if(hxBestY>=H)hxBestY=H-1; var hxSi=(hxBestY*W+hxBestX)*4; var hxDi=hxY*hxW4+hxX*4; d[hxDi]=hxSrc[hxSi]; d[hxDi+1]=hxSrc[hxSi+1]; d[hxDi+2]=hxSrc[hxSi+2]; d[hxDi+3]=hxSrc[hxSi+3]; } } },
    linstreaks: function(d,W,H,p,t){ var lsLen=FM.evalProp(p.length,t); if(lsLen==null)lsLen=30; lsLen=Math.max(0,Math.min(80,lsLen)); if(lsLen<1)return; var lsAng=FM.evalProp(p.angle,t); if(lsAng==null)lsAng=90; var lsRad=lsAng*Math.PI/180; var lsDx=Math.cos(lsRad), lsDy=Math.sin(lsRad); var lsSamp=8; var lsStep=lsLen/lsSamp; var lsW4=W*4; var lsS=d.slice(); for(var lsY=0;lsY<H;lsY++){ var lsRow=lsY*lsW4; for(var lsX=0;lsX<W;lsX++){ var lsI=lsRow+lsX*4; if(lsS[lsI+3]<=0)continue; var lsAr=0,lsAg=0,lsAb=0; for(var lsK=1;lsK<=lsSamp;lsK++){ var lsOff=lsK*lsStep; var lsSx=lsX-lsDx*lsOff, lsSy=lsY-lsDy*lsOff; var lsXi=lsSx<0?0:(lsSx>W-1?W-1:Math.round(lsSx)); var lsYi=lsSy<0?0:(lsSy>H-1?H-1:Math.round(lsSy)); var lsSi=lsYi*lsW4+lsXi*4; if(lsS[lsSi+3]<=0)continue; var lsSr=lsS[lsSi], lsSg=lsS[lsSi+1], lsSb=lsS[lsSi+2]; var lsBright=(lsSr*0.299+lsSg*0.587+lsSb*0.114)/255; lsBright=lsBright*lsBright; var lsDecay=1-(lsK/(lsSamp+1)); var lsWt=lsBright*lsDecay; lsAr+=lsSr*lsWt; lsAg+=lsSg*lsWt; lsAb+=lsSb*lsWt; } var lsNorm=lsSamp*0.5; var lsTr=lsAr/lsNorm, lsTg=lsAg/lsNorm, lsTb=lsAb/lsNorm; if(lsTr>255)lsTr=255; if(lsTg>255)lsTg=255; if(lsTb>255)lsTb=255; var lsR=d[lsI], lsG=d[lsI+1], lsB=d[lsI+2]; d[lsI]=255-(255-lsR)*(255-lsTr)/255; d[lsI+1]=255-(255-lsG)*(255-lsTg)/255; d[lsI+2]=255-(255-lsB)*(255-lsTb)/255; } } },
    // ---- batch 13 (opacity / visibility) ----
    blink: function(d, W, H, p, t) { var blkRate = FM.evalProp(p.rate, t); if (blkRate == null || !isFinite(blkRate)) blkRate = 2; if (blkRate < 0.5) blkRate = 0.5; if (blkRate > 12) blkRate = 12; var blkTime = (typeof t === 'number' && isFinite(t)) ? t : 0; if (blkTime < 0) blkTime = 0; var blkOn = (Math.floor(blkTime * blkRate) & 1) ? 0 : 1; if (blkOn === 1) return; var blkN = W * H; for (var blkI = 0; blkI < blkN; blkI++) { var blkA = blkI * 4 + 3; if (d[blkA] > 0) d[blkA] = 0; } },
    flicker: function(d, W, H, p, t){ var fl_amt = FM.evalProp(p.amount, t); if(fl_amt===null||fl_amt===undefined||isNaN(fl_amt)) fl_amt = 0.7; if(fl_amt<0) fl_amt=0; if(fl_amt>1) fl_amt=1; var fl_spd = FM.evalProp(p.speed, t); if(fl_spd===null||fl_spd===undefined||isNaN(fl_spd)) fl_spd = 14; if(fl_spd<1) fl_spd=1; if(fl_spd>30) fl_spd=30; var fl_tt = (t<0)?0:t; var fl_step = Math.floor(fl_tt * fl_spd); var fl_h = (fl_step ^ 0x9e3779b9) >>> 0; fl_h = Math.imul(fl_h ^ (fl_h >>> 16), 0x45d9f3b) >>> 0; fl_h = Math.imul(fl_h ^ (fl_h >>> 16), 0x45d9f3b) >>> 0; fl_h = (fl_h ^ (fl_h >>> 16)) >>> 0; var fl_n = fl_h / 4294967295; var fl_k = 1 - fl_amt * fl_n; if(fl_k<0) fl_k=0; if(fl_k>1) fl_k=1; var fl_len = W * H * 4; for(var fl_i = 3; fl_i < fl_len; fl_i += 4){ var fl_a = d[fl_i]; if(fl_a > 0){ d[fl_i] = fl_a * fl_k; } } },
    pulseopacity: function(d, W, H, p, t){ var po_speed = FM.evalProp(p.speed, t); if(po_speed==null||isNaN(po_speed)) po_speed = 1; if(po_speed<0.1) po_speed = 0.1; if(po_speed>8) po_speed = 8; var po_depth = FM.evalProp(p.depth, t); if(po_depth==null||isNaN(po_depth)) po_depth = 0.7; if(po_depth<0) po_depth = 0; if(po_depth>1) po_depth = 1; var po_tt = t; if(po_tt==null||isNaN(po_tt)) po_tt = 0; var po_phase = 0.5 - 0.5*Math.cos(2*Math.PI*po_speed*po_tt); var po_k = 1 - po_depth*po_phase; if(po_k<0) po_k = 0; if(po_k>1) po_k = 1; var po_n = W*H; for(var po_i=0; po_i<po_n; po_i++){ var po_ai = po_i*4+3; var po_a = d[po_ai]; if(po_a>0){ d[po_ai] = po_a*po_k; } } },
    dissolve: function(d,W,H,p,t){ var dsAmt=FM.evalProp(p.amount,t); if(dsAmt==null)dsAmt=0.5; if(dsAmt<0)dsAmt=0; if(dsAmt>1)dsAmt=1; if(dsAmt<=0)return; var dsThr=(dsAmt>=1)?4294967296:Math.floor(dsAmt*4294967296); for(var dsY=0;dsY<H;dsY++){ for(var dsX=0;dsX<W;dsX++){ var dsI=(dsY*W+dsX)<<2; if(d[dsI+3]===0)continue; var dsH=(dsX*374761393+dsY*668265263)>>>0; dsH=(dsH^(dsH>>>13))>>>0; dsH=(dsH*1274126177)>>>0; dsH=(dsH^(dsH>>>16))>>>0; if(dsH<dsThr)d[dsI+3]=0; } } },
    blockdissolve: function(d, W, H, p, t){ var bd_amt = FM.evalProp(p.amount, t); if(bd_amt==null) bd_amt = 0.5; bd_amt = bd_amt<0?0:(bd_amt>1?1:bd_amt); var bd_size = FM.evalProp(p.size, t); if(bd_size==null) bd_size = 16; bd_size = bd_size<4?4:(bd_size>60?60:bd_size); bd_size = Math.floor(bd_size); if(bd_size<1) bd_size = 1; if(bd_amt<=0) return; var bd_x, bd_y, bd_i, bd_bx, bd_by, bd_h, bd_r; for(bd_y=0; bd_y<H; bd_y++){ bd_by = Math.floor(bd_y/bd_size); for(bd_x=0; bd_x<W; bd_x++){ bd_i = (bd_y*W + bd_x)*4; if(d[bd_i+3]===0) continue; bd_bx = Math.floor(bd_x/bd_size); bd_h = (bd_bx*73856093) ^ (bd_by*19349663); bd_h = bd_h ^ (bd_h>>>13); bd_h = (bd_h*1274126177) >>> 0; bd_r = (bd_h >>> 0) / 4294967295; if(bd_r < bd_amt){ d[bd_i+3] = 0; } } } },
    // ---- batch 14 (matte / mask / key) ----
    wipe: function(d, W, H, p, t){ var wp_prog = FM.evalProp(p.progress, t); if(wp_prog===null||wp_prog===undefined) wp_prog=0.5; if(wp_prog<0) wp_prog=0; if(wp_prog>1) wp_prog=1; var wp_ang = FM.evalProp(p.angle, t); if(wp_ang===null||wp_ang===undefined) wp_ang=0; var wp_rad = wp_ang*Math.PI/180; var wp_dx = Math.cos(wp_rad); var wp_dy = Math.sin(wp_rad); var wp_cx = W*0.5; var wp_cy = H*0.5; var wp_den = Math.abs(W*wp_dx)+Math.abs(H*wp_dy); if(wp_den<1e-6) wp_den=1e-6; var wp_inv = 1/wp_den; for(var wp_y=0; wp_y<H; wp_y++){ var wp_row = wp_y*W; var wp_py = (wp_y-wp_cy)*wp_dy; for(var wp_x=0; wp_x<W; wp_x++){ var wp_proj = ((wp_x-wp_cx)*wp_dx + wp_py)*wp_inv + 0.5; if(wp_proj > wp_prog){ d[(wp_row+wp_x)*4+3] = 0; } } } },
    radialwipe: function(d, W, H, p, t){ var rw_prog = FM.evalProp(p.progress, t); if(rw_prog===null||rw_prog===undefined) rw_prog=0.5; if(rw_prog<0) rw_prog=0; if(rw_prog>1) rw_prog=1; var rw_start = FM.evalProp(p.start, t); if(rw_start===null||rw_start===undefined) rw_start=0; var rw_TAU = Math.PI*2; var rw_startRad = (rw_start*Math.PI/180) % rw_TAU; if(rw_startRad<0) rw_startRad += rw_TAU; var rw_cx = W/2, rw_cy = H/2; for(var rw_y=0; rw_y<H; rw_y++){ var rw_dy = rw_y - rw_cy; var rw_row = rw_y*W; for(var rw_x=0; rw_x<W; rw_x++){ var rw_dx = rw_x - rw_cx; var rw_ang = Math.atan2(rw_dy, rw_dx); var rw_frac = (rw_ang - rw_startRad) % rw_TAU; if(rw_frac<0) rw_frac += rw_TAU; rw_frac = rw_frac / rw_TAU; if(rw_frac > rw_prog){ d[(rw_row + rw_x)*4 + 3] = 0; } } } },
    solidmatte: function(d,W,H,p,t){ var sm_amt=FM.evalProp(p.amount,t); if(sm_amt==null) sm_amt=1; if(sm_amt<0) sm_amt=0; if(sm_amt>1) sm_amt=1; var sm_col=hexToRGB(p.color); var sm_cr=sm_col[0], sm_cg=sm_col[1], sm_cb=sm_col[2]; var sm_n=W*H, sm_i=0; for(var sm_k=0; sm_k<sm_n; sm_k++){ if(d[sm_i+3]>0){ d[sm_i]=d[sm_i]+(sm_cr-d[sm_i])*sm_amt; d[sm_i+1]=d[sm_i+1]+(sm_cg-d[sm_i+1])*sm_amt; d[sm_i+2]=d[sm_i+2]+(sm_cb-d[sm_i+2])*sm_amt; } sm_i+=4; } },
    mattechoker: function(d,W,H,p,t){ var mc_choke=FM.evalProp(p.choke,t); if(mc_choke==null) mc_choke=-4; mc_choke=Math.round(mc_choke); if(mc_choke<-20) mc_choke=-20; if(mc_choke>20) mc_choke=20; if(mc_choke===0) return; var mc_r=Math.abs(mc_choke); var mc_erode=mc_choke<0; var mc_N=W*H; var mc_a=new Float32Array(mc_N); var mc_b=new Float32Array(mc_N); var mc_i, mc_x, mc_y, mc_w4=W*4; for(mc_i=0; mc_i<mc_N; mc_i++){ mc_a[mc_i]=d[mc_i*4+3]; } var mc_win=mc_r*2+1; for(mc_y=0; mc_y<H; mc_y++){ var mc_row=mc_y*W; for(mc_x=0; mc_x<W; mc_x++){ var mc_lo=mc_x-mc_r; var mc_hi=mc_x+mc_r; if(mc_lo<0) mc_lo=0; if(mc_hi>W-1) mc_hi=W-1; var mc_acc=mc_a[mc_row+mc_lo]; var mc_k; if(mc_erode){ for(mc_k=mc_lo+1; mc_k<=mc_hi; mc_k++){ var mc_v=mc_a[mc_row+mc_k]; if(mc_v<mc_acc) mc_acc=mc_v; } } else { for(mc_k=mc_lo+1; mc_k<=mc_hi; mc_k++){ var mc_v2=mc_a[mc_row+mc_k]; if(mc_v2>mc_acc) mc_acc=mc_v2; } } mc_b[mc_row+mc_x]=mc_acc; } } for(mc_x=0; mc_x<W; mc_x++){ for(mc_y=0; mc_y<H; mc_y++){ var mc_lo2=mc_y-mc_r; var mc_hi2=mc_y+mc_r; if(mc_lo2<0) mc_lo2=0; if(mc_hi2>H-1) mc_hi2=H-1; var mc_acc2=mc_b[mc_lo2*W+mc_x]; var mc_j; if(mc_erode){ for(mc_j=mc_lo2+1; mc_j<=mc_hi2; mc_j++){ var mc_u=mc_b[mc_j*W+mc_x]; if(mc_u<mc_acc2) mc_acc2=mc_u; } } else { for(mc_j=mc_lo2+1; mc_j<=mc_hi2; mc_j++){ var mc_u2=mc_b[mc_j*W+mc_x]; if(mc_u2>mc_acc2) mc_acc2=mc_u2; } } var mc_av=mc_acc2; if(mc_av<0) mc_av=0; if(mc_av>255) mc_av=255; d[(mc_y*W+mc_x)*4+3]=mc_av; } } },
    mattefringe: function(d, W, H, p, t){ var mfw = FM.evalProp(p.width, t); if(mfw==null) mfw=3; mfw = Math.round(mfw); if(mfw<1) mfw=1; if(mfw>12) mfw=12; var mfcol = hexToRGB(p.color); if(!mfcol) mfcol=[0,224,255]; var mfN=W*H; var mfMask=new Uint8Array(mfN); var mfi; for(mfi=0; mfi<mfN; mfi++){ mfMask[mfi] = d[mfi*4+3]>0 ? 1 : 0; } var mfEro=new Uint8Array(mfN); var mfx, mfy, mfk, mfidx; for(mfy=0; mfy<H; mfy++){ var mfrow=mfy*W; for(mfx=0; mfx<W; mfx++){ var mfmin=1; for(mfk=-mfw; mfk<=mfw; mfk++){ var mfsx=mfx+mfk; if(mfsx<0) mfsx=0; else if(mfsx>=W) mfsx=W-1; if(mfMask[mfrow+mfsx]===0){ mfmin=0; break; } } mfEro[mfrow+mfx]=mfmin; } } var mfEro2=new Uint8Array(mfN); for(mfx=0; mfx<W; mfx++){ for(mfy=0; mfy<H; mfy++){ var mfmin2=1; for(mfk=-mfw; mfk<=mfw; mfk++){ var mfsy=mfy+mfk; if(mfsy<0) mfsy=0; else if(mfsy>=H) mfsy=H-1; if(mfEro[mfsy*W+mfx]===0){ mfmin2=0; break; } } mfEro2[mfy*W+mfx]=mfmin2; } } var mfr=mfcol[0], mfg=mfcol[1], mfb=mfcol[2]; for(mfi=0; mfi<mfN; mfi++){ if(mfMask[mfi]===1 && mfEro2[mfi]===0){ mfidx=mfi*4; d[mfidx]=mfr; d[mfidx+1]=mfg; d[mfidx+2]=mfb; } } },
    // ---- batch 16 (other / color / proc / drawing) ----
    channelremap: function(d,W,H,p,t){ var crM=(p.mode|0); if(crM<0)crM=0; if(crM>5)crM=5; if(crM===0)return; var crN=W*H*4; for(var crI=0;crI<crN;crI+=4){ var crR=d[crI], crG=d[crI+1], crB=d[crI+2]; var crNr, crNg, crNb; switch(crM){ case 1: crNr=crB; crNg=crG; crNb=crR; break; case 2: crNr=crG; crNg=crR; crNb=crB; break; case 3: crNr=crR; crNg=crB; crNb=crG; break; case 4: crNr=crG; crNg=crB; crNb=crR; break; case 5: crNr=crB; crNg=crR; crNb=crG; break; default: crNr=crR; crNg=crG; crNb=crB; } d[crI]=crNr; d[crI+1]=crNg; d[crI+2]=crNb; } },
    gradientoverlay: function(d, W, H, p, t){ var go_ang = FM.evalProp(p.angle, t); if(go_ang===null||go_ang===undefined) go_ang = 0; var go_amt = FM.evalProp(p.amount, t); if(go_amt===null||go_amt===undefined) go_amt = 0.8; if(go_amt<0) go_amt=0; if(go_amt>1) go_amt=1; var go_rad = go_ang * Math.PI / 180; var go_dx = Math.cos(go_rad), go_dy = Math.sin(go_rad); var go_c1 = hexToRGB(p.color); var go_c2 = hexToRGB(p.color2); if(!go_c1) go_c1 = [255,61,127]; if(!go_c2) go_c2 = [61,123,255]; var go_cx = W/2, go_cy = H/2; var go_half = (Math.abs(go_dx)*go_cx + Math.abs(go_dy)*go_cy); if(go_half < 1e-6) go_half = 1; for(var go_y=0; go_y<H; go_y++){ var go_ry = go_y - go_cy; for(var go_x=0; go_x<W; go_x++){ var go_i = (go_y*W + go_x)*4; var go_a = d[go_i+3]; if(go_a<=0) continue; var go_rx = go_x - go_cx; var go_proj = go_rx*go_dx + go_ry*go_dy; var go_g = (go_proj + go_half) / (2*go_half); if(go_g<0) go_g=0; if(go_g>1) go_g=1; var go_gr = go_c1[0] + (go_c2[0]-go_c1[0])*go_g; var go_gg = go_c1[1] + (go_c2[1]-go_c1[1])*go_g; var go_gb = go_c1[2] + (go_c2[2]-go_c1[2])*go_g; d[go_i]   = d[go_i]   + (go_gr - d[go_i])*go_amt; d[go_i+1] = d[go_i+1] + (go_gg - d[go_i+1])*go_amt; d[go_i+2] = d[go_i+2] + (go_gb - d[go_i+2])*go_amt; } } },
    lensflare: function(d,W,H,p,t){ var lfx=FM.evalProp(p.x,t); if(lfx==null)lfx=0.3; if(lfx<0)lfx=0; if(lfx>1)lfx=1; var lfy=FM.evalProp(p.y,t); if(lfy==null)lfy=0.3; if(lfy<0)lfy=0; if(lfy>1)lfy=1; var lfI=FM.evalProp(p.intensity,t); if(lfI==null)lfI=1; if(lfI<0)lfI=0; if(lfI>2)lfI=2; var lfLX=lfx*W, lfLY=lfy*H; var lfSig=W*0.18; if(lfSig<1)lfSig=1; var lfDen=2*lfSig*lfSig; var lfFR=255, lfFG=240, lfFB=210; var lfRays=[0.0,1.0471975512,2.0943951024,3.1415926536,4.1887902048,5.2359877560]; var lfNR=lfRays.length; var lfMaxR=Math.sqrt(W*W+H*H); var lfw4=W*4; for(var lfYY=0;lfYY<H;lfYY++){ var lfrow=lfYY*lfw4; for(var lfXX=0;lfXX<W;lfXX++){ var lfi=lfrow+lfXX*4; if(d[lfi+3]<=0) continue; var lfDX=lfXX-lfLX, lfDY=lfYY-lfLY; var lfd2=lfDX*lfDX+lfDY*lfDY; var lfDist=Math.sqrt(lfd2); var lfCore=lfI*255*Math.exp(-lfd2/lfDen); var lfRay=0; if(lfDist>0.5){ var lfAng=Math.atan2(lfDY,lfDX); var lfBest=0; for(var lfk=0;lfk<lfNR;lfk++){ var lfdA=lfAng-lfRays[lfk]; while(lfdA>3.1415926536)lfdA-=6.2831853072; while(lfdA<-3.1415926536)lfdA+=6.2831853072; var lfAlign=Math.cos(lfdA); if(lfAlign>lfBest)lfBest=lfAlign; } if(lfBest>0){ var lfShape=Math.pow(lfBest,32); var lfFall=Math.exp(-lfDist/(lfMaxR*0.35)); lfRay=lfI*150*lfShape*lfFall; } } var lfAmt=lfCore+lfRay; if(lfAmt<=0) continue; var lfAddR=lfFR*lfAmt/255; var lfAddG=lfFG*lfAmt/255; var lfAddB=lfFB*lfAmt/255; var lfR=d[lfi], lfG=d[lfi+1], lfB=d[lfi+2]; var lfNR2=255-(255-lfR)*(255-lfAddR)/255; var lfNG2=255-(255-lfG)*(255-lfAddG)/255; var lfNB2=255-(255-lfB)*(255-lfAddB)/255; d[lfi]=lfNR2; d[lfi+1]=lfNG2; d[lfi+2]=lfNB2; } } },
    roughenedges: function(d,W,H,p,t){ var re_amt=FM.evalProp(p.amount,t); if(re_amt==null)re_amt=6; re_amt=Math.max(0,Math.min(20,re_amt)); var re_scl=FM.evalProp(p.scale,t); if(re_scl==null)re_scl=10; re_scl=Math.max(2,Math.min(40,re_scl)); if(re_amt<=0)return; var re_s=d.slice(); var re_w4=W*4; var re_inv=1/re_scl; function re_hash(ix,iy,sd){ var re_h=(ix*374761393+iy*668265263+sd*2147483647)|0; re_h=(re_h^(re_h>>>13))*1274126177|0; re_h=(re_h^(re_h>>>16))>>>0; return re_h/4294967295; } function re_noise(fx,fy,sd){ var re_x0=Math.floor(fx), re_y0=Math.floor(fy); var re_tx=fx-re_x0, re_ty=fy-re_y0; var re_ux=re_tx*re_tx*(3-2*re_tx), re_uy=re_ty*re_ty*(3-2*re_ty); var re_n00=re_hash(re_x0,re_y0,sd), re_n10=re_hash(re_x0+1,re_y0,sd); var re_n01=re_hash(re_x0,re_y0+1,sd), re_n11=re_hash(re_x0+1,re_y0+1,sd); var re_a=re_n00+(re_n10-re_n00)*re_ux; var re_b=re_n01+(re_n11-re_n01)*re_ux; return re_a+(re_b-re_a)*re_uy; } for(var re_y=0;re_y<H;re_y++){ for(var re_x=0;re_x<W;re_x++){ var re_fx=re_x*re_inv, re_fy=re_y*re_inv; var re_dx=(re_noise(re_fx,re_fy,11)*2-1)*re_amt; var re_dy=(re_noise(re_fx,re_fy,29)*2-1)*re_amt; var re_sx=re_x+(re_dx|0); var re_sy=re_y+(re_dy|0); if(re_sx<0)re_sx=0; else if(re_sx>=W)re_sx=W-1; if(re_sy<0)re_sy=0; else if(re_sy>=H)re_sy=H-1; d[(re_y*W+re_x)*4+3]=re_s[(re_sy*W+re_sx)*4+3]; } } },
    hexarray: function(d,W,H,p,t){ var hx_s=FM.evalProp(p.size,t); if(hx_s==null) hx_s=24; if(hx_s<8) hx_s=8; if(hx_s>80) hx_s=80; var hx_col=hexToRGB(p.color||'#19d6c0'); var hx_cr=hx_col[0], hx_cg=hx_col[1], hx_cb=hx_col[2]; var hx_rh=hx_s*0.8660254; var hx_band=Math.max(1, hx_s*0.12); for(var hx_y=0; hx_y<H; hx_y++){ var hx_brow=Math.round(hx_y/hx_rh); for(var hx_x=0; hx_x<W; hx_x++){ var hx_idx=(hx_y*W+hx_x)*4; if(d[hx_idx+3]===0) continue; var hx_d1=1e20, hx_d2=1e20; for(var hx_dr=-1; hx_dr<=1; hx_dr++){ var hx_r=hx_brow+hx_dr; var hx_ox=(hx_r&1)?(hx_s*0.5):0; var hx_bc=Math.round((hx_x-hx_ox)/hx_s); for(var hx_dc=-1; hx_dc<=1; hx_dc++){ var hx_c=hx_bc+hx_dc; var hx_px=hx_c*hx_s+hx_ox; var hx_py=hx_r*hx_rh; var hx_ex=hx_x-hx_px, hx_ey=hx_y-hx_py; var hx_dist=Math.sqrt(hx_ex*hx_ex+hx_ey*hx_ey); if(hx_dist<hx_d1){ hx_d2=hx_d1; hx_d1=hx_dist; } else if(hx_dist<hx_d2){ hx_d2=hx_dist; } } } var hx_diff=hx_d2-hx_d1; if(hx_diff<hx_band){ var hx_a=1-hx_diff/hx_band; if(hx_a<0) hx_a=0; if(hx_a>1) hx_a=1; var hx_ia=1-hx_a; d[hx_idx]=d[hx_idx]*hx_ia+hx_cr*hx_a; d[hx_idx+1]=d[hx_idx+1]*hx_ia+hx_cg*hx_a; d[hx_idx+2]=d[hx_idx+2]*hx_ia+hx_cb*hx_a; } } } },
    // ---- batch 17 (drawing / blur / proc) ----
    electricedges: function(d,W,H,p,t){ var eeAmt=FM.evalProp(p.amount,t); if(eeAmt==null)eeAmt=0.6; if(eeAmt<0)eeAmt=0; if(eeAmt>1)eeAmt=1; var eeSpd=FM.evalProp(p.speed,t); if(eeSpd==null)eeSpd=4; if(eeSpd<0)eeSpd=0; if(eeSpd>10)eeSpd=10; var eeCol=hexToRGB(p.color); var eeR=eeCol[0], eeG=eeCol[1], eeB=eeCol[2]; var ees=d.slice(); var eew4=W*4; var eeFrame=Math.floor(t*eeSpd); for(var eey=0;eey<H;eey++){ for(var eex=0;eex<W;eex++){ var eei=(eey*W+eex)*4; if(ees[eei+3]===0)continue; var eexm=eex>0?eex-1:0; var eexp=eex<W-1?eex+1:W-1; var eeym=eey>0?eey-1:0; var eeyp=eey<H-1?eey+1:H-1; var eeRow0=eeym*eew4, eeRow1=eey*eew4, eeRow2=eeyp*eew4; var eeXm4=eexm*4, eeX4=eex*4, eeXp4=eexp*4; var eeTL=ees[eeRow0+eeXm4]*0.299+ees[eeRow0+eeXm4+1]*0.587+ees[eeRow0+eeXm4+2]*0.114; var eeT=ees[eeRow0+eeX4]*0.299+ees[eeRow0+eeX4+1]*0.587+ees[eeRow0+eeX4+2]*0.114; var eeTR=ees[eeRow0+eeXp4]*0.299+ees[eeRow0+eeXp4+1]*0.587+ees[eeRow0+eeXp4+2]*0.114; var eeL=ees[eeRow1+eeXm4]*0.299+ees[eeRow1+eeXm4+1]*0.587+ees[eeRow1+eeXm4+2]*0.114; var eeRr=ees[eeRow1+eeXp4]*0.299+ees[eeRow1+eeXp4+1]*0.587+ees[eeRow1+eeXp4+2]*0.114; var eeBL=ees[eeRow2+eeXm4]*0.299+ees[eeRow2+eeXm4+1]*0.587+ees[eeRow2+eeXm4+2]*0.114; var eeBb=ees[eeRow2+eeX4]*0.299+ees[eeRow2+eeX4+1]*0.587+ees[eeRow2+eeX4+2]*0.114; var eeBR=ees[eeRow2+eeXp4]*0.299+ees[eeRow2+eeXp4+1]*0.587+ees[eeRow2+eeXp4+2]*0.114; var eeGx=(eeTR+2*eeRr+eeBR)-(eeTL+2*eeL+eeBL); var eeGy=(eeBL+2*eeBb+eeBR)-(eeTL+2*eeT+eeTR); var eeMag=Math.sqrt(eeGx*eeGx+eeGy*eeGy)/1442; if(eeMag<=0)continue; if(eeMag>1)eeMag=1; var eeH=(eex*374761393+eey*668265263+eeFrame*2147483647)>>>0; eeH=(eeH^(eeH>>>13))*1274126177>>>0; eeH=(eeH^(eeH>>>16))>>>0; var eeFlick=0.45+(eeH/4294967295)*0.55; var eeAdd=eeMag*eeAmt*eeFlick; if(eeAdd<=0)continue; if(eeAdd>1)eeAdd=1; var eeSr=255-(255-d[eei])*(255-eeR*eeAdd)/255; var eeSg=255-(255-d[eei+1])*(255-eeG*eeAdd)/255; var eeSb=255-(255-d[eei+2])*(255-eeB*eeAdd)/255; d[eei]=eeSr; d[eei+1]=eeSg; d[eei+2]=eeSb; } } },
    glowscan: function(d,W,H,p,t){ var gsSpeed=FM.evalProp(p.speed,t); if(gsSpeed==null)gsSpeed=1.5; if(gsSpeed<0)gsSpeed=0; if(gsSpeed>8)gsSpeed=8; var gsWidth=FM.evalProp(p.width,t); if(gsWidth==null)gsWidth=60; if(gsWidth<10)gsWidth=10; if(gsWidth>200)gsWidth=200; var gsCol=hexToRGB(p.color); var gsCr=gsCol[0],gsCg=gsCol[1],gsCb=gsCol[2]; var gsSigma=gsWidth*0.5; if(gsSigma<0.5)gsSigma=0.5; var gsDen=2*gsSigma*gsSigma; var gsPhase=(t*gsSpeed)%1; if(gsPhase<0)gsPhase+=1; var gsScanY=gsPhase*H; var gsW4=W*4; for(var gsY=0;gsY<H;gsY++){ var gsDist=Math.abs(gsY-gsScanY); var gsAlt=H-gsDist; if(gsAlt<gsDist)gsDist=gsAlt; var gsBr=Math.exp(-(gsDist*gsDist)/gsDen); if(gsBr<0.002)continue; var gsAddR=gsCr*gsBr,gsAddG=gsCg*gsBr,gsAddB=gsCb*gsBr; var gsRow=gsY*gsW4; for(var gsX=0;gsX<W;gsX++){ var gsI=gsRow+gsX*4; if(d[gsI+3]<=0)continue; var gsR=d[gsI],gsG=d[gsI+1],gsB=d[gsI+2]; d[gsI]=255-(255-gsR)*(255-gsAddR)/255; d[gsI+1]=255-(255-gsG)*(255-gsAddG)/255; d[gsI+2]=255-(255-gsB)*(255-gsAddB)/255; } } },
    spinstreaks: function(d,W,H,p,t){ var ssAmt=FM.evalProp(p.amount,t); if(ssAmt==null) ssAmt=0.5; if(ssAmt<0) ssAmt=0; if(ssAmt>1) ssAmt=1; if(ssAmt<=0.001) return; var ssSrc=d.slice(); var ssCx=W/2, ssCy=H/2, ssW4=W*4; var ssSpan=ssAmt*0.5; var ssN=10; var ssDa=ssSpan/(ssN-1); for(var ssY=0; ssY<H; ssY++){ for(var ssX=0; ssX<W; ssX++){ var ssDx=ssX-ssCx, ssDy=ssY-ssCy; var ssR=Math.sqrt(ssDx*ssDx+ssDy*ssDy); var ssA=Math.atan2(ssDy,ssDx); var ssAccR=0, ssAccG=0, ssAccB=0, ssAccA=0, ssWsum=0; for(var ssK=0; ssK<ssN; ssK++){ var ssWt=1/(1+ssK*0.6); var ssSa=ssA - ssK*ssDa; var ssSx=ssCx + ssR*Math.cos(ssSa); var ssSy=ssCy + ssR*Math.sin(ssSa); var ssXi=ssSx<0?0:(ssSx>W-1?W-1:(ssSx|0)); var ssYi=ssSy<0?0:(ssSy>H-1?H-1:(ssSy|0)); var ssIdx=ssYi*ssW4 + ssXi*4; ssAccR+=ssSrc[ssIdx]*ssWt; ssAccG+=ssSrc[ssIdx+1]*ssWt; ssAccB+=ssSrc[ssIdx+2]*ssWt; ssAccA+=ssSrc[ssIdx+3]*ssWt; ssWsum+=ssWt; } var ssOut=(ssY*W+ssX)*4; d[ssOut]=ssAccR/ssWsum; d[ssOut+1]=ssAccG/ssWsum; d[ssOut+2]=ssAccB/ssWsum; d[ssOut+3]=ssAccA/ssWsum; } } },
    fractalridges: function(d,W,H,p,t){ var fr_amt=FM.evalProp(p.amount,t); if(fr_amt==null) fr_amt=0.6; fr_amt=fr_amt<0?0:(fr_amt>1?1:fr_amt); var fr_sc=FM.evalProp(p.scale,t); if(fr_sc==null) fr_sc=48; fr_sc=fr_sc<8?8:(fr_sc>120?120:fr_sc); function fr_hash(ix,iy){ var fr_h=(ix*374761393+iy*668265263)|0; fr_h=(fr_h^(fr_h>>>13))*1274126177; fr_h=(fr_h^(fr_h>>>16))>>>0; return fr_h/4294967295; } function fr_sm(a){ return a*a*(3-2*a); } function fr_oct(fx,fy,cell){ var fr_gx=fx/cell, fr_gy=fy/cell; var fr_x0=Math.floor(fr_gx), fr_y0=Math.floor(fr_gy); var fr_tx=fr_sm(fr_gx-fr_x0), fr_ty=fr_sm(fr_gy-fr_y0); var fr_c00=fr_hash(fr_x0,fr_y0); var fr_c10=fr_hash(fr_x0+1,fr_y0); var fr_c01=fr_hash(fr_x0,fr_y0+1); var fr_c11=fr_hash(fr_x0+1,fr_y0+1); var fr_a=fr_c00+(fr_c10-fr_c00)*fr_tx; var fr_b=fr_c01+(fr_c11-fr_c01)*fr_tx; return fr_a+(fr_b-fr_a)*fr_ty; } var fr_w4=W*4; var fr_c1=fr_sc, fr_c2=fr_sc/2, fr_c3=fr_sc/4; for(var fr_y=0; fr_y<H; fr_y++){ for(var fr_x=0; fr_x<W; fr_x++){ var fr_i=(fr_y*W+fr_x)*4; if(d[fr_i+3]<=0) continue; var fr_n1=fr_oct(fr_x,fr_y,fr_c1); var fr_n2=fr_oct(fr_x,fr_y,fr_c2); var fr_n3=fr_oct(fr_x,fr_y,fr_c3); var fr_r1=1-Math.abs(2*fr_n1-1); var fr_r2=1-Math.abs(2*fr_n2-1); var fr_r3=1-Math.abs(2*fr_n3-1); var fr_sum=fr_r1*0.5+fr_r2*0.3+fr_r3*0.2; var fr_grey=fr_sum*255; if(fr_grey<0) fr_grey=0; else if(fr_grey>255) fr_grey=255; d[fr_i]=d[fr_i]+(fr_grey-d[fr_i])*fr_amt; d[fr_i+1]=d[fr_i+1]+(fr_grey-d[fr_i+1])*fr_amt; d[fr_i+2]=d[fr_i+2]+(fr_grey-d[fr_i+2])*fr_amt; } } },
    smoothbevel: function(d,W,H,p,t){ var sb_depth=FM.evalProp(p.depth,t); if(sb_depth==null) sb_depth=6; sb_depth=Math.max(1,Math.min(20,Math.round(sb_depth))); var sb_str=FM.evalProp(p.strength,t); if(sb_str==null) sb_str=1; sb_str=Math.max(0,Math.min(2,sb_str)); var sb_N=W*H, sb_i, sb_x, sb_y, sb_idx; var sb_mask=new Float32Array(sb_N); for(sb_i=0; sb_i<sb_N; sb_i++){ sb_mask[sb_i]=(d[sb_i*4+3]>0)?1:0; } var sb_tmp=new Float32Array(sb_N); var sb_soft=new Float32Array(sb_N); var sb_r=sb_depth, sb_win=sb_r*2+1; var sb_inv=1/sb_win; var sb_acc, sb_k; for(sb_y=0; sb_y<H; sb_y++){ var sb_rowo=sb_y*W; sb_acc=sb_mask[sb_rowo]*(sb_r+1); for(sb_k=1; sb_k<=sb_r; sb_k++){ sb_acc+=sb_mask[sb_rowo+Math.min(sb_k,W-1)]; } for(sb_x=0; sb_x<W; sb_x++){ sb_tmp[sb_rowo+sb_x]=sb_acc*sb_inv; var sb_ox=sb_x-sb_r; if(sb_ox<0) sb_ox=0; var sb_nx=sb_x+sb_r+1; if(sb_nx>W-1) sb_nx=W-1; sb_acc+=sb_mask[sb_rowo+sb_nx]-sb_mask[sb_rowo+sb_ox]; } } for(sb_x=0; sb_x<W; sb_x++){ sb_acc=sb_tmp[sb_x]*(sb_r+1); for(sb_k=1; sb_k<=sb_r; sb_k++){ sb_acc+=sb_tmp[Math.min(sb_k,H-1)*W+sb_x]; } for(sb_y=0; sb_y<H; sb_y++){ sb_soft[sb_y*W+sb_x]=sb_acc*sb_inv; var sb_oy=sb_y-sb_r; if(sb_oy<0) sb_oy=0; var sb_ny=sb_y+sb_r+1; if(sb_ny>H-1) sb_ny=H-1; sb_acc+=sb_tmp[sb_ny*W+sb_x]-sb_tmp[sb_oy*W+sb_x]; } } var sb_lx=-0.7071, sb_ly=-0.7071; for(sb_y=0; sb_y<H; sb_y++){ for(sb_x=0; sb_x<W; sb_x++){ sb_i=sb_y*W+sb_x; sb_idx=sb_i*4; if(d[sb_idx+3]<=0) continue; var sb_s=sb_soft[sb_i]; var sb_band=4*sb_s*(1-sb_s); if(sb_band<=0) continue; if(sb_band>1) sb_band=1; var sb_xm=sb_x>0?sb_x-1:0, sb_xp=sb_x<W-1?sb_x+1:W-1; var sb_ym=sb_y>0?sb_y-1:0, sb_yp=sb_y<H-1?sb_y+1:H-1; var sb_gx=sb_soft[sb_y*W+sb_xp]-sb_soft[sb_y*W+sb_xm]; var sb_gy=sb_soft[sb_yp*W+sb_x]-sb_soft[sb_ym*W+sb_x]; var sb_dot=sb_gx*sb_lx+sb_gy*sb_ly; var sb_term=sb_dot*sb_str*sb_band*255*3; var sb_rr=d[sb_idx]+sb_term; var sb_gg=d[sb_idx+1]+sb_term; var sb_bb=d[sb_idx+2]+sb_term; d[sb_idx]=sb_rr<0?0:(sb_rr>255?255:sb_rr); d[sb_idx+1]=sb_gg<0?0:(sb_gg>255?255:sb_gg); d[sb_idx+2]=sb_bb<0?0:(sb_bb>255?255:sb_bb); } } },
    // ---- batch 18 (blur / proc / drawing pixel) ----
    zoomstreaks: function(d,W,H,p,t){ var zs_amt=FM.evalProp(p.amount,t); if(zs_amt==null) zs_amt=0.5; if(zs_amt<0) zs_amt=0; if(zs_amt>1) zs_amt=1; var zs_s=d.slice(); var zs_cx=W/2, zs_cy=H/2; var zs_w4=W*4; var zs_steps=10; var zs_strength=0.16+0.74*zs_amt; for(var zs_y=0; zs_y<H; zs_y++){ for(var zs_x=0; zs_x<W; zs_x++){ var zs_i=(zs_y*zs_w4)+(zs_x*4); var zs_dx=zs_cx-zs_x; var zs_dy=zs_cy-zs_y; var zs_ar=0, zs_ag=0, zs_ab=0, zs_wsum=0; for(var zs_k=1; zs_k<=zs_steps; zs_k++){ var zs_f=(zs_k/zs_steps)*zs_strength; var zs_sx=zs_x+zs_dx*zs_f; var zs_sy=zs_y+zs_dy*zs_f; var zs_ix=zs_sx|0; var zs_iy=zs_sy|0; if(zs_ix<0) zs_ix=0; else if(zs_ix>W-1) zs_ix=W-1; if(zs_iy<0) zs_iy=0; else if(zs_iy>H-1) zs_iy=H-1; var zs_si=(zs_iy*zs_w4)+(zs_ix*4); var zs_r=zs_s[zs_si], zs_g=zs_s[zs_si+1], zs_b=zs_s[zs_si+2], zs_a=zs_s[zs_si+3]; var zs_lum=(zs_r*0.299+zs_g*0.587+zs_b*0.114)*(zs_a/255); var zs_decay=1-(zs_k/(zs_steps+1)); var zs_bw=(zs_lum/255); zs_bw=zs_bw*zs_bw; var zs_wt=zs_bw*zs_decay; zs_ar+=zs_r*zs_wt; zs_ag+=zs_g*zs_wt; zs_ab+=zs_b*zs_wt; zs_wsum+=zs_wt; } if(zs_wsum>0){ var zs_norm=zs_strength/(zs_steps); zs_ar=zs_ar*zs_norm; zs_ag=zs_ag*zs_norm; zs_ab=zs_ab*zs_norm; if(zs_ar>255) zs_ar=255; if(zs_ag>255) zs_ag=255; if(zs_ab>255) zs_ab=255; var zs_br=d[zs_i], zs_bg=d[zs_i+1], zs_bb=d[zs_i+2]; d[zs_i]=255-((255-zs_br)*(255-zs_ar))/255; d[zs_i+1]=255-((255-zs_bg)*(255-zs_ag))/255; d[zs_i+2]=255-((255-zs_bb)*(255-zs_ab))/255; var zs_aaa=d[zs_i+3]; var zs_streakA=(zs_ar>zs_ag?(zs_ar>zs_ab?zs_ar:zs_ab):(zs_ag>zs_ab?zs_ag:zs_ab)); if(zs_streakA>zs_aaa) d[zs_i+3]=zs_streakA<255?zs_streakA:255; } } } },
    innerblur: function(d,W,H,p,t){ var ib_r=FM.evalProp(p.radius,t); if(ib_r==null) ib_r=8; ib_r=ib_r|0; if(ib_r<0) ib_r=0; if(ib_r>30) ib_r=30; if(ib_r<1) return; var ib_w4=W*4; var ib_n=W*H; var ib_div=ib_r*2+1; var ib_tmp=new Float32Array(ib_n*3); var x,y,ch,acc,xx,yy,si,di; var ib_src=d; for(y=0;y<H;y++){ var ib_row=y*W; for(ch=0;ch<3;ch++){ acc=0; for(xx=-ib_r;xx<=ib_r;xx++){ var cx0=xx<0?0:(xx>=W?W-1:xx); acc+=ib_src[((ib_row+cx0)*4)+ch]; } for(x=0;x<W;x++){ ib_tmp[(ib_row+x)*3+ch]=acc/ib_div; var ib_xout=x-ib_r; var ib_xin=x+ib_r+1; var ib_co=ib_xout<0?0:(ib_xout>=W?W-1:ib_xout); var ib_ci=ib_xin<0?0:(ib_xin>=W?W-1:ib_xin); acc+=ib_src[((ib_row+ib_ci)*4)+ch]-ib_src[((ib_row+ib_co)*4)+ch]; } } } for(x=0;x<W;x++){ for(ch=0;ch<3;ch++){ acc=0; for(yy=-ib_r;yy<=ib_r;yy++){ var cy0=yy<0?0:(yy>=H?H-1:yy); acc+=ib_tmp[(cy0*W+x)*3+ch]; } for(y=0;y<H;y++){ di=((y*W+x)*4)+ch; d[di]=acc/ib_div; var ib_yout=y-ib_r; var ib_yin=y+ib_r+1; var ib_ro=ib_yout<0?0:(ib_yout>=H?H-1:ib_yout); var ib_ri=ib_yin<0?0:(ib_yin>=H?H-1:ib_yin); acc+=ib_tmp[(ib_ri*W+x)*3+ch]-ib_tmp[(ib_ro*W+x)*3+ch]; } } } },
    contourstrips: function(d,W,H,p,t){ var cs_levels=FM.evalProp(p.levels,t); if(cs_levels==null)cs_levels=5; cs_levels=Math.round(cs_levels); if(cs_levels<2)cs_levels=2; if(cs_levels>12)cs_levels=12; var cs_lo=hexToRGB(p.color); var cs_hi=hexToRGB(p.color2); var cs_n=W*H, cs_i, cs_idx, cs_a, cs_r, cs_g, cs_b, cs_l, cs_band, cs_frac, cs_br, cs_bg, cs_bb, cs_mix; for(cs_i=0; cs_i<cs_n; cs_i++){ cs_idx=cs_i*4; cs_a=d[cs_idx+3]; if(cs_a<=0)continue; cs_r=d[cs_idx]; cs_g=d[cs_idx+1]; cs_b=d[cs_idx+2]; cs_l=(0.299*cs_r+0.587*cs_g+0.114*cs_b)/255; if(cs_l<0)cs_l=0; if(cs_l>1)cs_l=1; cs_band=Math.floor(cs_l*cs_levels); if(cs_band>=cs_levels)cs_band=cs_levels-1; cs_frac=cs_levels>1?cs_band/(cs_levels-1):0; cs_br=cs_lo[0]+(cs_hi[0]-cs_lo[0])*cs_frac; cs_bg=cs_lo[1]+(cs_hi[1]-cs_lo[1])*cs_frac; cs_bb=cs_lo[2]+(cs_hi[2]-cs_lo[2])*cs_frac; cs_mix=(cs_band&1)?1.0:0.4; d[cs_idx]=cs_r+(cs_br-cs_r)*cs_mix; d[cs_idx+1]=cs_g+(cs_bg-cs_g)*cs_mix; d[cs_idx+2]=cs_b+(cs_bb-cs_b)*cs_mix; } },
    crosshatch: function(d,W,H,p,t){ var sp=FM.evalProp(p.spacing,t); if(sp==null)sp=7; sp=Math.round(sp); if(sp<3)sp=3; if(sp>30)sp=30; var col=hexToRGB(p.color); var ir=col[0],ig=col[1],ib=col[2]; var W4=W*4; for(var y=0;y<H;y++){ var row=y*W4; var ymod=y%sp; for(var x=0;x<W;x++){ var ci=row+x*4; var a=d[ci+3]; if(a===0)continue; var r=d[ci],g=d[ci+1],b=d[ci+2]; var l=(0.299*r+0.587*g+0.114*b)/255; var hatch=false; if(l<0.75){ var xy=(x+y)%sp; if(xy<0)xy+=sp; if(xy<1)hatch=true; } if(!hatch&&l<0.5){ var xmy=(x-y)%sp; if(xmy<0)xmy+=sp; if(xmy<1)hatch=true; } if(!hatch&&l<0.25){ if(ymod<1)hatch=true; } if(hatch){ d[ci]=ir; d[ci+1]=ig; d[ci+2]=ib; } } } },
    // ---- batch 20: cinematic grades + framing ----
    bleachbypass: function(d,W,H,p,t){ var a=FM.evalProp(p.amount,t); if(a==null)a=0.7; if(a<0)a=0; if(a>1)a=1; function ov(b,o){ return b<128 ? (2*b*o/255) : (255-2*(255-b)*(255-o)/255); } for(var i=0;i<d.length;i+=4){ if(d[i+3]===0)continue; var r=d[i],g=d[i+1],b=d[i+2]; var l=r*0.299+g*0.587+b*0.114; var dr=r+(l-r)*0.6, dg=g+(l-g)*0.6, db=b+(l-b)*0.6; d[i]=r+(ov(dr,l)-r)*a; d[i+1]=g+(ov(dg,l)-g)*a; d[i+2]=b+(ov(db,l)-b)*a; } },
    tealorange: function(d,W,H,p,t){ var a=FM.evalProp(p.amount,t); if(a==null)a=0.6; if(a<0)a=0; if(a>1)a=1; for(var i=0;i<d.length;i+=4){ if(d[i+3]===0)continue; var r=d[i],g=d[i+1],b=d[i+2]; var l=(r*0.299+g*0.587+b*0.114)/255; var w=(l-0.5)*2; var rr=r+w*42*a, gg=g+w*8*a, bb=b-w*42*a; d[i]=rr<0?0:(rr>255?255:rr); d[i+1]=gg<0?0:(gg>255?255:gg); d[i+2]=bb<0?0:(bb>255?255:bb); } },
    crossprocess: (function(){ function cv(v,lift,gain){ var x=v/255; x=x+lift*Math.sin(x*Math.PI); if(x<0)x=0; x=Math.pow(x,gain); return x*255; } return function(d,W,H,p,t){ var a=FM.evalProp(p.amount,t); if(a==null)a=0.6; if(a<0)a=0; if(a>1)a=1; for(var i=0;i<d.length;i+=4){ if(d[i+3]===0)continue; var r=d[i],g=d[i+1],b=d[i+2]; var nr=cv(r,0.10,0.90), ng=cv(g,0.06,0.95), nb=cv(b,-0.12,1.10); d[i]=r+(nr-r)*a; d[i+1]=g+(ng-g)*a; d[i+2]=b+(nb-b)*a; } }; })(),
    lightleak: function(d,W,H,p,t){ var a=FM.evalProp(p.amount,t); if(a==null)a=0.6; if(a<0)a=0; if(a>1)a=1; var col=hexToRGB(p.color); var cr=col[0],cg=col[1],cb=col[2]; var ph=t*0.15; var lx=W*(0.85+0.12*Math.sin(ph)), ly=H*(0.12+0.10*Math.cos(ph*1.3)); var maxR=Math.sqrt(W*W+H*H); for(var y=0;y<H;y++){ var row=y*W*4; for(var x=0;x<W;x++){ var i=row+x*4; if(d[i+3]===0)continue; var dx=x-lx, dy=y-ly; var dist=Math.sqrt(dx*dx+dy*dy)/maxR; var g=1-dist*1.8; if(g<=0)continue; g=g*g*a; if(g<=0.002)continue; d[i]=255-(255-d[i])*(255-cr*g)/255; d[i+1]=255-(255-d[i+1])*(255-cg*g)/255; d[i+2]=255-(255-d[i+2])*(255-cb*g)/255; } } },
    letterbox: function(d,W,H,p,t){ var s=FM.evalProp(p.size,t); if(s==null)s=14; if(s<0)s=0; if(s>48)s=48; var bar=Math.round(H*s/100); if(bar<=0)return; for(var y=0;y<H;y++){ if(y>=bar && y<H-bar) continue; var row=y*W*4; for(var x=0;x<W;x++){ var i=row+x*4; d[i]=0; d[i+1]=0; d[i+2]=0; if(d[i+3]<255)d[i+3]=255; } } },
    border: function(d,W,H,p,t){ var w=FM.evalProp(p.width,t); if(w==null)w=10; w=Math.round(w); if(w<1)w=1; var mx=Math.floor(Math.min(W,H)/2); if(w>mx)w=mx; var col=hexToRGB(p.color); var cr=col[0],cg=col[1],cb=col[2]; for(var y=0;y<H;y++){ var ey=(y<w||y>=H-w); var row=y*W*4; for(var x=0;x<W;x++){ if(ey||x<w||x>=W-w){ var i=row+x*4; d[i]=cr; d[i+1]=cg; d[i+2]=cb; if(d[i+3]<255)d[i+3]=255; } } } },
    // ---- batch 21 ----
    faded: function(d,W,H,p,t){ var a=FM.evalProp(p.amount,t); if(a==null)a=0.6; if(a<0)a=0; if(a>1)a=1; var lift=26*a, con=1-0.25*a; function ch(v){ v=lift+v*(255-lift)/255; return 128+(v-128)*con; } for(var i=0;i<d.length;i+=4){ if(d[i+3]===0)continue; var r=d[i],g=d[i+1],b=d[i+2]; var L=r*0.299+g*0.587+b*0.114; var cr=ch(r), cg=ch(g), cb=ch(b); var nr=cr+(L-cr)*0.15*a+8*a, ng=cg+(L-cg)*0.15*a+2*a, nb=cb+(L-cb)*0.15*a-6*a; d[i]=nr<0?0:(nr>255?255:nr); d[i+1]=ng<0?0:(ng>255?255:ng); d[i+2]=nb<0?0:(nb>255?255:nb); } },
    nightvision: function(d,W,H,p,t){ var a=FM.evalProp(p.amount,t); if(a==null)a=0.85; if(a<0)a=0; if(a>1)a=1; var fr=(t*30)|0; for(var i=0;i<d.length;i+=4){ if(d[i+3]===0)continue; var px=i>>2, y=(px/W)|0; var L=d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114; L=L*1.3+30; var h=(px*374761393+fr*668265263)|0; h=(h^(h>>13))*1274126177; h=(h^(h>>16)); L+=((h&255)/255-0.5)*60; if(y%3===0)L*=0.7; if(L<0)L=0; if(L>255)L=255; var gr=L*0.2, gg=L, gb=L*0.2; d[i]=d[i]+(gr-d[i])*a; d[i+1]=d[i+1]+(gg-d[i+1])*a; d[i+2]=d[i+2]+(gb-d[i+2])*a; } },
    sketch: function(d,W,H,p,t){ var a=FM.evalProp(p.amount,t); if(a==null)a=0.85; if(a<0)a=0; if(a>1)a=1; var s=d.slice(); function lum(xx,yy){ var j=(yy*W+xx)*4; return s[j]*0.299+s[j+1]*0.587+s[j+2]*0.114; } for(var y=0;y<H;y++){ for(var x=0;x<W;x++){ var i=(y*W+x)*4; if(d[i+3]===0)continue; var xm=x>0?x-1:0, xp=x<W-1?x+1:W-1, ym=y>0?y-1:0, yp=y<H-1?y+1:H-1; var gx=(lum(xp,ym)+2*lum(xp,y)+lum(xp,yp))-(lum(xm,ym)+2*lum(xm,y)+lum(xm,yp)); var gy=(lum(xm,yp)+2*lum(x,yp)+lum(xp,yp))-(lum(xm,ym)+2*lum(x,ym)+lum(xp,ym)); var mag=Math.sqrt(gx*gx+gy*gy)/1442; if(mag>1)mag=1; var v=255-mag*510; if(v<0)v=0; d[i]=d[i]+(v-d[i])*a; d[i+1]=d[i+1]+(v-d[i+1])*a; d[i+2]=d[i+2]+(v-d[i+2])*a; } } },
  };

  // Geometric warp: render the layer clean, then resample each destination pixel from a mapped source
  // coordinate. mapFn(x,y,W,H,cx,cy,maxR,params,t) → [srcX, srcY]. Nearest-neighbour sampling.
  let _wpA = null, _wpB = null;
  function drawWarpEffect(ctx, layer, t, scene, fx, mapFn) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const proj = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = proj.width, H = proj.height;
    if (!_wpA) _wpA = document.createElement('canvas');
    if (!_wpB) _wpB = document.createElement('canvas');
    _wpA.width = W; _wpA.height = H; _wpB.width = W; _wpB.height = H;
    const actx = _wpA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => e !== fx), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const src = actx.getImageData(0, 0, W, H).data;
    const bctx = _wpB.getContext('2d'), outImg = bctx.createImageData(W, H), o = outImg.data;
    const cx = W / 2, cy = H / 2, maxR = Math.hypot(cx, cy), pr = fx.params || {};
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const m = mapFn(x, y, W, H, cx, cy, maxR, pr, t);
        let sx = m[0] | 0, sy = m[1] | 0;
        if (sx < 0) sx = 0; else if (sx >= W) sx = W - 1;
        if (sy < 0) sy = 0; else if (sy >= H) sy = H - 1;
        const di = (y * W + x) * 4, si = (sy * W + sx) * 4;
        o[di] = src[si]; o[di + 1] = src[si + 1]; o[di + 2] = src[si + 2]; o[di + 3] = src[si + 3];
      }
    }
    bctx.putImageData(outImg, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_wpB, 0, 0);
    ctx.restore();
  }

  const WARP_FX = {
    wave: function (x, y, W, H, cx, cy, maxR, p, t) {
      const amp = FM.evalProp(p.amount, t) || 0;
      return [x + amp * Math.sin(y / 38), y + amp * 0.4 * Math.sin(x / 46)];
    },
    ripple: function (x, y, W, H, cx, cy, maxR, p, t) {
      const amp = FM.evalProp(p.amount, t) || 0, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) || 1e-6;
      const off = amp * Math.sin(r / 20);
      return [x + (dx / r) * off, y + (dy / r) * off];
    },
    twirl: function (x, y, W, H, cx, cy, maxR, p, t) {
      const ang = (FM.evalProp(p.amount, t) || 0) * Math.PI / 180, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      const f = Math.max(0, 1 - r / maxR), a = Math.atan2(dy, dx) + ang * f * f;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    },
    bulge: function (x, y, W, H, cx, cy, maxR, p, t) {
      const k = FM.evalProp(p.amount, t) || 0, nx = (x - cx) / maxR, ny = (y - cy) / maxR, r = Math.hypot(nx, ny);
      const scale = r < 1e-4 ? 1 : Math.pow(r, 1 + k) / r;   // k>0 pinch, k<0 bulge
      return [cx + nx * scale * maxR, cy + ny * scale * maxR];
    },
    fisheye: function (x, y, W, H, cx, cy, maxR, p, t) {
      const k = FM.evalProp(p.amount, t) || 0, dx = (x - cx) / maxR, dy = (y - cy) / maxR, r = Math.hypot(dx, dy);
      if (r >= 1 || r < 1e-5) return [x, y];
      const f = (r * (1 - k * (1 - r * r))) / r;   // barrel (k>0) / pincushion (k<0)
      return [cx + dx * f * maxR, cy + dy * f * maxR];
    },
    kaleidoscope: function (x, y, W, H, cx, cy, maxR, p, t) {
      const seg = Math.max(2, Math.round(FM.evalProp(p.segments, t) || 6)), dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      const slice = Math.PI * 2 / seg;
      let a = Math.atan2(dy, dx) % slice; if (a < 0) a += slice;
      a = Math.abs(a - slice / 2);   // fold within the wedge → mirrored kaleidoscope
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    },
    // ---- batch 7 (warp) ----
    polarcoords: function(x,y,W,H,cx,cy,maxR,p,t){ var plAmt=FM.evalProp(p.amount,t); if(plAmt==null)plAmt=1; if(plAmt<0)plAmt=0; if(plAmt>1)plAmt=1; var plAng=(x/W)*Math.PI*2, plRad=(y/H)*maxR; var plSx=cx+Math.cos(plAng)*plRad, plSy=cy+Math.sin(plAng)*plRad; return [x+(plSx-x)*plAmt, y+(plSy-y)*plAmt]; },
    bend: function(x,y,W,H,cx,cy,maxR,p,t){ var bdAmt=FM.evalProp(p.amount,t); if(bdAmt==null)bdAmt=0.5; if(bdAmt>1)bdAmt=1; if(bdAmt<-1)bdAmt=-1; var bdShift=bdAmt*cx*Math.sin((y/H)*Math.PI); return [x-bdShift,y]; },
    glass: function(x,y,W,H,cx,cy,maxR,p,t){ var gam=FM.evalProp(p.amount,t); if(gam==null)gam=12; gam=gam<0?0:(gam>40?40:gam); var ghh=(x*374761393 + y*668265263)|0; ghh=(ghh^(ghh>>13))*1274126177; ghh=ghh^(ghh>>16); var gdx=((ghh & 255)/255 - 0.5)*2*gam; var gdy=(((ghh>>8) & 255)/255 - 0.5)*2*gam; return [x+gdx, y+gdy]; },
    // ---- batch 9 (warp) ----
    curl: function(x,y,W,H,cx,cy,maxR,p,t){ var cuAmt=FM.evalProp(p.amount,t); if(cuAmt==null)cuAmt=0.5; if(cuAmt<-1)cuAmt=-1; if(cuAmt>1)cuAmt=1; var cuDx=x-cx, cuDy=y-cy, cuR=Math.hypot(cuDx,cuDy); var cuSw=cuAmt*0.6*Math.sin(cuR/40); var cuA=Math.atan2(cuDy,cuDx)+cuSw; return [cx+Math.cos(cuA)*cuR, cy+Math.sin(cuA)*cuR]; },
    // ---- batch 10 (warp) ----
    fractalwarp: function(x,y,W,H,cx,cy,maxR,p,t){ var fwAmt=FM.evalProp(p.amount,t); if(fwAmt==null)fwAmt=24; if(fwAmt<0)fwAmt=0; if(fwAmt>60)fwAmt=60; var fwNx=Math.sin(x/57+y/40)+Math.sin(x/29-y/53)*0.6+Math.sin(x/15+y/19)*0.35; var fwNy=Math.cos(x/47-y/61)+Math.sin(x/35+y/27)*0.6+Math.cos(x/13-y/21)*0.35; return [x+fwNx*fwAmt*0.4, y+fwNy*fwAmt*0.4]; },
    // ---- batch 15 (repeat / tiling) ----
    gridrepeat: function(x,y,W,H,cx,cy,maxR,p,t){ var grCount=Math.round(FM.evalProp(p.count,t)||3); if(grCount<1)grCount=1; if(grCount>10)grCount=10; var grCellW=W/grCount, grCellH=H/grCount; var grGx=(x-Math.floor(x/grCellW)*grCellW)/grCellW; var grGy=(y-Math.floor(y/grCellH)*grCellH)/grCellH; return [grGx*W, grGy*H]; },
    linearrepeat: function(x,y,W,H,cx,cy,maxR,p,t){ var lr_count=Math.round(FM.evalProp(p.count,t)||4); if(lr_count<1)lr_count=1; if(lr_count>12)lr_count=12; var lr_cellW=W/lr_count; var lr_lx=(x-Math.floor(x/lr_cellW)*lr_cellW)/lr_cellW; return [lr_lx*W, y]; },
    radialrepeat: function(x,y,W,H,cx,cy,maxR,p,t){ var rr_count=Math.round(FM.evalProp(p.count,t)||6); if(rr_count<2)rr_count=2; if(rr_count>16)rr_count=16; var rr_dx=x-cx, rr_dy=y-cy, rr_r=Math.hypot(rr_dx,rr_dy); var rr_seg=Math.PI*2/rr_count; var rr_a=Math.atan2(rr_dy,rr_dx); var rr_a2=rr_a-Math.floor(rr_a/rr_seg)*rr_seg; return [cx+Math.cos(rr_a2)*rr_r, cy+Math.sin(rr_a2)*rr_r]; },
    mirrortile: function(x,y,W,H,cx,cy,maxR,p,t){ var mt_size=FM.evalProp(p.size,t); if(mt_size==null) mt_size=140; if(mt_size<1) mt_size=1; var mt_cix=Math.floor(x/mt_size); var mt_lx=x-mt_cix*mt_size; if(mt_cix&1) mt_lx=mt_size-mt_lx; var mt_ciy=Math.floor(y/mt_size); var mt_ly=y-mt_ciy*mt_size; if(mt_ciy&1) mt_ly=mt_size-mt_ly; var mt_sx=(mt_lx/mt_size)*W; var mt_sy=(mt_ly/mt_size)*H; return [mt_sx,mt_sy]; },
    // ---- batch 18 (warp) ----
    innerpinch: function(x,y,W,H,cx,cy,maxR,p,t){ var ip_a=FM.evalProp(p.amount,t); if(ip_a===null||ip_a===undefined)ip_a=0.5; if(ip_a<-1)ip_a=-1; if(ip_a>1)ip_a=1; var ip_dx=x-cx, ip_dy=y-cy; var ip_r=Math.hypot(ip_dx,ip_dy); var ip_rad=maxR*0.6; if(ip_rad<=0)return [x,y]; var ip_nr=ip_r/ip_rad; if(ip_nr>=1)return [x,y]; var ip_fall=1-ip_nr*ip_nr; var ip_k=1+ip_a*ip_fall*0.8; return [cx+ip_dx*ip_k, cy+ip_dy*ip_k]; },
    // ---- batch 24: Squeeze — hourglass waist pinch (k>0) / barrel bulge (k<0), AM featured ----
    squeeze: function(x,y,W,H,cx,cy,maxR,p,t){ var sq_k=p.amount==null?0.5:FM.evalProp(p.amount,t); if(sq_k<-1)sq_k=-1; if(sq_k>1)sq_k=1; var sq_f=1-sq_k*Math.sin(Math.PI*y/H); if(sq_f<0.05)sq_f=0.05; return [cx+(x-cx)/sq_f, y]; },
  };

  // ================== CANVAS_FX: 3D solids + Move/Transform ==================
  // Canvas-composited effects. Like drawPixelEffect the layer is rendered clean to an offscreen,
  // but the effect fn then REDRAWS it with plain canvas ops (textured triangles / matrices) —
  // no per-pixel loops, so the 3D solids stay realtime. fn(srcCanvas, dstCtx, W, H, bbox, params,
  // t, tl) where bbox = the layer's rendered alpha bounds (the "texture" region AM wraps onto its
  // solids) and tl = time since the clip began (so Spin/Drift/Orbit start at the clip's start).
  // Everything derives from params + t only — deterministic, so preview == export.
  function alphaBBox(d, W, H) {
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y += 2) {
      const row = y * W * 4;
      for (let x = 0; x < W; x += 2) {
        if (d[row + x * 4 + 3] > 8) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    minX = Math.max(0, minX - 2); minY = Math.max(0, minY - 2);
    maxX = Math.min(W - 1, maxX + 2); maxY = Math.min(H - 1, maxY + 2);
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }
  let _cfA = null, _cfB = null, _cfTex = null, _reC = null;
  // Effects that never read the alpha bbox (no texture wrap, no pivot): skip the full-frame
  // getImageData scan — it was the single most expensive part of running them per frame.
  const CFX_NO_BBOX = { wiggle: 1, drift: 1, orbit: 1, tiles: 1, rasterextrude: 1 };
  function drawCanvasEffect(ctx, layer, t, scene, fx, fn) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const proj = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = proj.width, H = proj.height;
    if (!_cfA) _cfA = document.createElement('canvas');
    if (!_cfB) _cfB = document.createElement('canvas');
    _cfA.width = W; _cfA.height = H; _cfB.width = W; _cfB.height = H;
    const actx = _cfA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => e !== fx), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    let bbox = null;
    if (CFX_NO_BBOX[fx.type]) bbox = { x: 0, y: 0, w: W, h: H };   // fn ignores it — full frame stands in
    else try { bbox = alphaBBox(actx.getImageData(0, 0, W, H).data, W, H); } catch (e) { bbox = null; }  // tainted-canvas guard
    // set up B only AFTER the layer render — a nested canvas effect reuses these scratch canvases
    const bctx = _cfB.getContext('2d');
    _cfB.width = W; _cfB.height = H;
    bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, W, H);
    bctx.globalAlpha = 1; bctx.globalCompositeOperation = 'source-over'; bctx.filter = 'none';
    if (bbox && bbox.w > 2 && bbox.h > 2) fn(_cfA, bctx, W, H, bbox, fx.params || {}, t, t - (layer.start || 0));
    else bctx.drawImage(_cfA, 0, 0);   // empty / tainted → passthrough
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Nested canvas fx (two+ stacked): dst IS our scratch A, still holding this call's clean-layer
    // render — wipe it so only the effected result goes up, not a ghost of the plain layer under it.
    if (ctx.canvas === _cfA) ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_cfB, 0, 0);
    ctx.restore();
  }
  function fparam(p, key, def, t) { return p[key] == null ? def : FM.evalProp(p[key], t); }
  // Crop the layer's alpha bounds out of the frame → the texture the solids wrap.
  function extractTex(src, bb) {
    if (!_cfTex) _cfTex = document.createElement('canvas');
    _cfTex.width = bb.w; _cfTex.height = bb.h;
    const c = _cfTex.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, bb.w, bb.h);
    c.drawImage(src, bb.x, bb.y, bb.w, bb.h, 0, 0, bb.w, bb.h);
    return _cfTex;
  }

  // ---- tiny fixed-function mesh pipeline ----
  // verts: [x,y,z,u,v] in unit space (|xyz| ≲ 1, uv 0..1), tris: index triples.
  // Euler-rotates, projects with weak perspective, painter-sorts, then draws each triangle as an
  // affine texture map (clip + setTransform + drawImage) with flat double-sided Lambert shading.
  function renderMesh(dctx, tex, tw, th, verts, tris, o) {
    const cX = Math.cos(o.rx), sX = Math.sin(o.rx);
    const cY = Math.cos(o.ry), sY = Math.sin(o.ry);
    const cZ = Math.cos(o.rz), sZ = Math.sin(o.rz);
    const n = verts.length, F = 3.2;   // focal length in solid radii (weak perspective)
    const P = new Array(n), RZ = new Float32Array(n), RX3 = new Float32Array(n), RY3 = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = verts[i];
      let x = v[0], y = v[1], z = v[2], w;
      w = y * cX - z * sX; z = y * sX + z * cX; y = w;          // rotate X
      w = x * cY + z * sY; z = -x * sY + z * cY; x = w;         // rotate Y
      w = x * cZ - y * sZ; y = x * sZ + y * cZ; x = w;          // rotate Z
      RX3[i] = x; RY3[i] = y; RZ[i] = z;
      const f = F / (F - z);                                    // z+ toward viewer
      P[i] = [o.cx + x * f * o.R, o.cy + y * f * o.R];
    }
    const order = [];
    for (let i = 0; i < tris.length; i++) order.push(i);
    order.sort((a, b) => (RZ[tris[a][0]] + RZ[tris[a][1]] + RZ[tris[a][2]]) - (RZ[tris[b][0]] + RZ[tris[b][1]] + RZ[tris[b][2]]));
    const Lx = 0.42, Ly = -0.55, Lz = 0.72;   // key light: upper-left, toward viewer
    for (let k = 0; k < order.length; k++) {
      const tr = tris[order[k]];
      const a = P[tr[0]], b = P[tr[1]], c = P[tr[2]];
      const gx = (a[0] + b[0] + c[0]) / 3, gy = (a[1] + b[1] + c[1]) / 3;
      // inflate ~0.4px outward from the centroid to hide hairline seams between triangles
      const pts = [a, b, c].map(pp => {
        const dx = pp[0] - gx, dy = pp[1] - gy, len = Math.hypot(dx, dy) || 1;
        return [pp[0] + dx / len * 0.4, pp[1] + dy / len * 0.4];
      });
      const va = verts[tr[0]], vb = verts[tr[1]], vc = verts[tr[2]];
      const u0 = va[3] * tw, v0 = va[4] * th, u1 = vb[3] * tw, v1 = vb[4] * th, u2 = vc[3] * tw, v2 = vc[4] * th;
      const den = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
      if (Math.abs(den) < 1e-6) continue;
      const x0 = pts[0][0], y0 = pts[0][1], x1 = pts[1][0], y1 = pts[1][1], x2 = pts[2][0], y2 = pts[2][1];
      const ma = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / den;
      const mb = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / den;
      const mc = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / den;
      const md = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / den;
      const me = x0 - ma * u0 - mc * v0;
      const mf = y0 - mb * u0 - md * v0;
      // flat double-sided Lambert from the rotated face normal
      const e1x = RX3[tr[1]] - RX3[tr[0]], e1y = RY3[tr[1]] - RY3[tr[0]], e1z = RZ[tr[1]] - RZ[tr[0]];
      const e2x = RX3[tr[2]] - RX3[tr[0]], e2y = RY3[tr[2]] - RY3[tr[0]], e2z = RZ[tr[2]] - RZ[tr[0]];
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const lam = Math.abs((nx * Lx + ny * Ly + nz * Lz) / nl);
      const shade = (1 - o.shading) + o.shading * (0.25 + 0.75 * lam);
      dctx.save();
      dctx.beginPath();
      dctx.moveTo(pts[0][0], pts[0][1]); dctx.lineTo(pts[1][0], pts[1][1]); dctx.lineTo(pts[2][0], pts[2][1]);
      dctx.closePath();
      dctx.clip();
      dctx.transform(ma, mb, mc, md, me, mf);
      // shade baked into this face's own pixels (a source-atop fill would also darken farther
      // faces showing through transparent texels); brightness(s) ≡ compositing black at 1-s
      if (shade < 0.999) dctx.filter = 'brightness(' + shade.toFixed(3) + ')';
      dctx.drawImage(tex, 0, 0);
      dctx.restore();
    }
  }

  // ---- mesh builders (memoized per effect type on a geometry signature) ----
  const _meshCache = {};
  function meshFor(type, sig, build) {
    const m = _meshCache[type];
    if (m && m.sig === sig) return m.mesh;
    const mesh = build();
    _meshCache[type] = { sig, mesh };
    return mesh;
  }
  // parametric patch: fn(u01, v01) -> [x,y,z]
  function bParam(fn, nu, nv) {
    const V = [], T = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv, p = fn(u, v);
      V.push([p[0], p[1], p[2], u, v]);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const k = j * (nu + 1) + i;
      T.push([k, k + 1, k + nu + 2], [k, k + nu + 2, k + nu + 1]);
    }
    return { v: V, t: T };
  }
  // box: 6 faces, each sub×sub so weak perspective doesn't shear the texture visibly
  function bBox(wx, wy, wz, sub) {
    const V = [], T = [];
    function face(ox, oy, oz, ux, uy, uz, vx, vy, vz) {
      const base = V.length;
      for (let j = 0; j <= sub; j++) for (let i = 0; i <= sub; i++) {
        const fu = i / sub, fv = j / sub;
        V.push([ox + ux * fu + vx * fv, oy + uy * fu + vy * fv, oz + uz * fu + vz * fv, fu, fv]);
      }
      for (let j = 0; j < sub; j++) for (let i = 0; i < sub; i++) {
        const k = base + j * (sub + 1) + i;
        T.push([k, k + 1, k + sub + 2], [k, k + sub + 2, k + sub + 1]);
      }
    }
    face(-wx, -wy, wz, 2 * wx, 0, 0, 0, 2 * wy, 0);       // front
    face(wx, -wy, -wz, -2 * wx, 0, 0, 0, 2 * wy, 0);      // back
    face(wx, -wy, wz, 0, 0, -2 * wz, 0, 2 * wy, 0);       // right
    face(-wx, -wy, -wz, 0, 0, 2 * wz, 0, 2 * wy, 0);      // left
    face(-wx, -wy, -wz, 2 * wx, 0, 0, 0, 0, 2 * wz);      // top
    face(-wx, wy, wz, 2 * wx, 0, 0, 0, 0, -2 * wz);       // bottom
    return { v: V, t: T };
  }
  // extrude a 2D outline (pts in [-1,1]², star-convex about its centroid) to ±depth/2.
  // Sides sample a band between the edge and the centroid so the UV triangles stay non-degenerate.
  function bPrism(pts, depth) {
    const V = [], T = [], n = pts.length, hz = depth / 2;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    cx /= n; cy /= n;
    const cu = (cx + 1) / 2, cv = (cy + 1) / 2;
    const uu = p => (p[0] + 1) / 2, vv = p => (p[1] + 1) / 2;
    const f0 = V.length;
    V.push([cx, cy, hz, cu, cv]);
    for (let i = 0; i < n; i++) V.push([pts[i][0], pts[i][1], hz, uu(pts[i]), vv(pts[i])]);
    for (let i = 0; i < n; i++) T.push([f0, f0 + 1 + i, f0 + 1 + (i + 1) % n]);
    const b0 = V.length;
    V.push([cx, cy, -hz, cu, cv]);
    for (let i = 0; i < n; i++) V.push([pts[i][0], pts[i][1], -hz, uu(pts[i]), vv(pts[i])]);
    for (let i = 0; i < n; i++) T.push([b0, b0 + 1 + (i + 1) % n, b0 + 1 + i]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const s = V.length;
      const pu = uu(p), pv = vv(p), qu = uu(q), qv = vv(q);
      const pu2 = pu + (cu - pu) * 0.3, pv2 = pv + (cv - pv) * 0.3;
      const qu2 = qu + (cu - qu) * 0.3, qv2 = qv + (cv - qv) * 0.3;
      V.push([p[0], p[1], hz, pu, pv], [q[0], q[1], hz, qu, qv], [q[0], q[1], -hz, qu2, qv2], [p[0], p[1], -hz, pu2, pv2]);
      T.push([s, s + 1, s + 2], [s, s + 2, s + 3]);
    }
    return { v: V, t: T };
  }
  // tube: outer loop + aligned inner loop extruded to ±depth/2, with ring caps (Ring / Hollow Box)
  function bTube(outer, inner, depth) {
    const V = [], T = [], n = outer.length, hz = depth / 2;
    const uu = p => (p[0] + 1) / 2, vv = p => (p[1] + 1) / 2;
    function loopSides(pts, flip) {
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n], s = V.length;
        const pu = uu(p), pv = vv(p), qu = uu(q), qv = vv(q);
        V.push([p[0], p[1], hz, pu, pv], [q[0], q[1], hz, qu, qv], [q[0], q[1], -hz, qu * 0.94 + 0.03, qv * 0.94 + 0.03], [p[0], p[1], -hz, pu * 0.94 + 0.03, pv * 0.94 + 0.03]);
        if (flip) T.push([s, s + 2, s + 1], [s, s + 3, s + 2]);
        else T.push([s, s + 1, s + 2], [s, s + 2, s + 3]);
      }
    }
    loopSides(outer, false);
    loopSides(inner, true);
    for (let i = 0; i < n; i++) {   // front + back ring caps
      const o1 = outer[i], o2 = outer[(i + 1) % n], i1 = inner[i], i2 = inner[(i + 1) % n];
      let s = V.length;
      V.push([o1[0], o1[1], hz, uu(o1), vv(o1)], [o2[0], o2[1], hz, uu(o2), vv(o2)], [i2[0], i2[1], hz, uu(i2), vv(i2)], [i1[0], i1[1], hz, uu(i1), vv(i1)]);
      T.push([s, s + 1, s + 2], [s, s + 2, s + 3]);
      s = V.length;
      V.push([o1[0], o1[1], -hz, uu(o1), vv(o1)], [o2[0], o2[1], -hz, uu(o2), vv(o2)], [i2[0], i2[1], -hz, uu(i2), vv(i2)], [i1[0], i1[1], -hz, uu(i1), vv(i1)]);
      T.push([s, s + 2, s + 1], [s, s + 3, s + 2]);
    }
    return { v: V, t: T };
  }
  function circlePts(r, n) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    return pts;
  }
  function starPts(points, inr) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const a = -Math.PI / 2 + i * Math.PI / points, rr = (i % 2 === 0) ? 1 : inr;
      pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
    }
    return pts;
  }
  function heartPts(n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2 * Math.PI / n;
      pts.push([Math.pow(Math.sin(a), 3) * 16 / 17, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17]);
    }
    return pts;
  }
  // octahedron, optionally stellated (a pyramid raised on every face → Star Polyhedron)
  function bOcta(spike) {
    const base = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const faces = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
    const V = [], T = [];
    const uv = p => [(p[0] + 1) / 2, (p[1] + 1) / 2];   // planar projection wrap
    for (let fi = 0; fi < faces.length; fi++) {
      const f = faces[fi], A = base[f[0]], B = base[f[1]], C = base[f[2]], s = V.length;
      V.push([A[0], A[1], A[2], uv(A)[0], uv(A)[1]], [B[0], B[1], B[2], uv(B)[0], uv(B)[1]], [C[0], C[1], C[2], uv(C)[0], uv(C)[1]]);
      if (!spike) { T.push([s, s + 1, s + 2]); continue; }
      const k = (1 + spike) / 3;
      const gx = (A[0] + B[0] + C[0]) * k, gy = (A[1] + B[1] + C[1]) * k, gz = (A[2] + B[2] + C[2]) * k;
      V.push([gx, gy, gz, (uv(A)[0] + uv(B)[0] + uv(C)[0]) / 3, (uv(A)[1] + uv(B)[1] + uv(C)[1]) / 3]);
      T.push([s, s + 1, s + 3], [s + 1, s + 2, s + 3], [s + 2, s, s + 3]);
    }
    return { v: V, t: T };
  }
  function bPyramid() {
    const V = [], T = [];
    const b = [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]];   // base at y=+1 (canvas y-down ⇒ bottom)
    const apex = [0, -1, 0];
    for (let i = 0; i < 4; i++) {
      // per-face UV triangle — planar-projected UVs collapse (den=0) on the two faces whose base
      // edge runs along z, and renderMesh would skip them, leaving see-through holes
      const A = b[i], B = b[(i + 1) % 4], s = V.length;
      V.push([A[0], A[1], A[2], 0, 1], [B[0], B[1], B[2], 1, 1], [apex[0], apex[1], apex[2], 0.5, 0]);
      T.push([s, s + 1, s + 2]);
    }
    const s = V.length;
    for (let i = 0; i < 4; i++) V.push([b[i][0], b[i][1], b[i][2], (b[i][0] + 1) / 2, (b[i][2] + 1) / 2]);
    T.push([s, s + 2, s + 1], [s, s + 3, s + 2]);
    return { v: V, t: T };
  }
  function meshMerge(list) {
    const V = [], T = [];
    for (const m of list) {
      const off = V.length;
      for (const v of m.v) V.push(v);
      for (const tr of m.t) T.push([tr[0] + off, tr[1] + off, tr[2] + off]);
    }
    return { v: V, t: T };
  }
  // page curl: a plane that rolls around a cylinder whose front line sweeps across the layer
  function bCurl(ax, ay, amount, angRad, radius) {
    const dx = Math.cos(angRad), dy = Math.sin(angRad);
    const m = Math.abs(ax * dx) + Math.abs(ay * dy);
    const front = m * (1 - 2 * amount);
    return bParam(function (u, v) {
      const x = (u * 2 - 1) * ax, y = (v * 2 - 1) * ay;
      const s = x * dx + y * dy - front;
      if (s <= 0) return [x, y, 0];
      const per = -x * dy + y * dx;
      const a = s / radius;
      let along, z;
      if (a <= Math.PI) { along = front + radius * Math.sin(a); z = radius * (1 - Math.cos(a)); }
      else { along = front - (s - Math.PI * radius); z = 2 * radius; }
      return [along * dx - per * dy, along * dy + per * dx, z];
    }, 26, 26);
  }

  // ---- the CANVAS_FX catalog ----
  function solidFx(A, B, W, H, bb, p, t, type, buildMesh, defs) {
    const rx = fparam(p, 'rotx', defs.rotx, t) * Math.PI / 180;
    const ry = fparam(p, 'roty', defs.roty, t) * Math.PI / 180;
    const rz = fparam(p, 'rotz', defs.rotz, t) * Math.PI / 180;
    const size = fparam(p, 'size', defs.size, t) / 100;
    const shading = clamp01(fparam(p, 'shading', defs.shading, t));
    const tex = extractTex(A, bb);
    const mesh = buildMesh();
    renderMesh(B, tex, bb.w, bb.h, mesh.v, mesh.t, {
      cx: bb.x + bb.w / 2, cy: bb.y + bb.h / 2, R: Math.max(bb.w, bb.h) / 2 * size,
      rx, ry, rz, shading,
    });
  }
  const CANVAS_FX = {
    // ---- 3D solids ----
    cube3d: function (A, B, W, H, bb, p, t) {
      solidFx(A, B, W, H, bb, p, t, 'cube3d', () => meshFor('cube3d', 'u', () => bBox(0.72, 0.72, 0.72, 3)), { rotx: 25, roty: 35, rotz: 0, size: 70, shading: 0.6 });
    },
    box3d: function (A, B, W, H, bb, p, t) {
      const d = fparam(p, 'depth', 60, t) / 100;
      const S = Math.max(bb.w, bb.h), ax = bb.w / S, ay = bb.h / S;
      solidFx(A, B, W, H, bb, p, t, 'box3d', () => meshFor('box3d', ax + '|' + ay + '|' + d, () => bBox(ax, ay, d * 0.5, 3)), { rotx: 25, roty: 35, rotz: 0, size: 80, shading: 0.6 });
    },
    cylinder3d: function (A, B, W, H, bb, p, t) {
      const len = fparam(p, 'length', 150, t) / 100;
      solidFx(A, B, W, H, bb, p, t, 'cylinder3d', () => meshFor('cylinder3d', String(len), () => {
        const side = bParam(function (u, v) {
          const lon = (u - 0.5) * 2 * Math.PI;
          return [Math.sin(lon) * 0.62, (v - 0.5) * len, Math.cos(lon) * 0.62];
        }, 24, 4);
        const capPts = circlePts(0.62, 20);
        const capF = { v: [], t: [] }, capB = { v: [], t: [] };
        capF.v.push([0, -len / 2, 0, 0.5, 0.5]); capB.v.push([0, len / 2, 0, 0.5, 0.5]);
        for (let i = 0; i < capPts.length; i++) {
          const c = capPts[i];
          capF.v.push([c[0], -len / 2, c[1], (c[0] / 0.62 + 1) / 2, (c[1] / 0.62 + 1) / 2]);
          capB.v.push([c[0], len / 2, c[1], (c[0] / 0.62 + 1) / 2, (c[1] / 0.62 + 1) / 2]);
        }
        for (let i = 0; i < capPts.length; i++) {
          capF.t.push([0, 1 + i, 1 + (i + 1) % capPts.length]);
          capB.t.push([0, 1 + (i + 1) % capPts.length, 1 + i]);
        }
        return meshMerge([side, capF, capB]);
      }), { rotx: 20, roty: 0, rotz: 75, size: 70, shading: 0.6 });
    },
    sphere3d: function (A, B, W, H, bb, p, t) {
      solidFx(A, B, W, H, bb, p, t, 'sphere3d', () => meshFor('sphere3d', 'u', () => bParam(function (u, v) {
        const lon = (u - 0.5) * 2 * Math.PI, lat = (v - 0.5) * Math.PI;
        return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
      }, 22, 14)), { rotx: 15, roty: 0, rotz: 0, size: 85, shading: 0.55 });
    },
    ellipsoid3d: function (A, B, W, H, bb, p, t) {
      solidFx(A, B, W, H, bb, p, t, 'ellipsoid3d', () => meshFor('ellipsoid3d', 'u', () => bParam(function (u, v) {
        const lon = (u - 0.5) * 2 * Math.PI, lat = (v - 0.5) * Math.PI;
        return [Math.cos(lat) * Math.sin(lon) * 1.15, Math.sin(lat) * 0.62, Math.cos(lat) * Math.cos(lon) * 0.62];
      }, 22, 14)), { rotx: 25, roty: 0, rotz: 25, size: 85, shading: 0.55 });
    },
    torus3d: function (A, B, W, H, bb, p, t) {
      const thk = Math.min(0.45, fparam(p, 'thickness', 30, t) / 100);
      solidFx(A, B, W, H, bb, p, t, 'torus3d', () => meshFor('torus3d', String(thk), () => bParam(function (u, v) {
        const lon = (u - 0.5) * 2 * Math.PI, tube = v * 2 * Math.PI, R0 = 1 - thk;
        return [(R0 + thk * Math.cos(tube)) * Math.sin(lon), thk * Math.sin(tube), (R0 + thk * Math.cos(tube)) * Math.cos(lon)];
      }, 26, 12)), { rotx: 55, roty: 10, rotz: 0, size: 85, shading: 0.6 });
    },
    ring3d: function (A, B, W, H, bb, p, t) {
      const hole = Math.min(0.92, Math.max(0.1, fparam(p, 'hole', 62, t) / 100));
      const d = fparam(p, 'depth', 35, t) / 100;
      solidFx(A, B, W, H, bb, p, t, 'ring3d', () => meshFor('ring3d', hole + '|' + d, () => bTube(circlePts(1, 24), circlePts(hole, 24), d)), { rotx: 60, roty: 8, rotz: 0, size: 85, shading: 0.6 });
    },
    pyramid3d: function (A, B, W, H, bb, p, t) {
      solidFx(A, B, W, H, bb, p, t, 'pyramid3d', () => meshFor('pyramid3d', 'u', bPyramid), { rotx: 20, roty: 30, rotz: 0, size: 85, shading: 0.65 });
    },
    octahedron3d: function (A, B, W, H, bb, p, t) {
      solidFx(A, B, W, H, bb, p, t, 'octahedron3d', () => meshFor('octahedron3d', 'u', () => bOcta(0)), { rotx: 20, roty: 30, rotz: 0, size: 85, shading: 0.65 });
    },
    hexprism3d: function (A, B, W, H, bb, p, t) {
      const d = fparam(p, 'depth', 55, t) / 100;
      solidFx(A, B, W, H, bb, p, t, 'hexprism3d', () => meshFor('hexprism3d', String(d), () => bPrism(circlePts(1, 6), d)), { rotx: 25, roty: 35, rotz: 0, size: 80, shading: 0.6 });
    },
    starprism3d: function (A, B, W, H, bb, p, t) {
      const n = Math.max(4, Math.min(10, Math.round(fparam(p, 'points', 5, t))));
      const d = fparam(p, 'depth', 40, t) / 100;
      solidFx(A, B, W, H, bb, p, t, 'starprism3d', () => meshFor('starprism3d', n + '|' + d, () => bPrism(starPts(n, 0.45), d)), { rotx: 25, roty: 30, rotz: 0, size: 85, shading: 0.6 });
    },
    starpoly3d: function (A, B, W, H, bb, p, t) {
      const spike = fparam(p, 'spike', 1.1, t);
      solidFx(A, B, W, H, bb, p, t, 'starpoly3d', () => meshFor('starpoly3d', String(spike), () => bOcta(spike)), { rotx: 20, roty: 30, rotz: 0, size: 70, shading: 0.65 });
    },
    heart3d: function (A, B, W, H, bb, p, t) {
      const d = fparam(p, 'depth', 45, t) / 100;
      solidFx(A, B, W, H, bb, p, t, 'heart3d', () => meshFor('heart3d', String(d), () => bPrism(heartPts(28), d)), { rotx: 15, roty: 30, rotz: 0, size: 85, shading: 0.6 });
    },
    hollowbox3d: function (A, B, W, H, bb, p, t) {
      const wall = Math.min(0.45, Math.max(0.08, fparam(p, 'wall', 22, t) / 100));
      const d = fparam(p, 'depth', 70, t) / 100;
      const inner = 1 - wall * 2;
      const sq = [[-1, -1], [1, -1], [1, 1], [-1, 1]], si = sq.map(q => [q[0] * inner, q[1] * inner]);
      solidFx(A, B, W, H, bb, p, t, 'hollowbox3d', () => meshFor('hollowbox3d', wall + '|' + d, () => bTube(sq, si, d)), { rotx: 25, roty: 35, rotz: 0, size: 80, shading: 0.6 });
    },
    axiscross3d: function (A, B, W, H, bb, p, t) {
      const arm = Math.min(0.6, Math.max(0.15, fparam(p, 'arm', 34, t) / 100));
      solidFx(A, B, W, H, bb, p, t, 'axiscross3d', () => meshFor('axiscross3d', String(arm), () => meshMerge([
        bBox(1, arm / 2, arm / 2, 2), bBox(arm / 2, 1, arm / 2, 2), bBox(arm / 2, arm / 2, 1, 2),
      ])), { rotx: 25, roty: 35, rotz: 0, size: 80, shading: 0.6 });
    },
    pagecurl: function (A, B, W, H, bb, p, t) {
      const amount = clamp01(fparam(p, 'amount', 0.45, t));
      const ang = fparam(p, 'angle', 45, t) * Math.PI / 180;
      const radius = Math.max(0.02, fparam(p, 'radius', 20, t) / 100);
      const shading = clamp01(fparam(p, 'shading', 0.5, t));
      const S = Math.max(bb.w, bb.h), ax = bb.w / S, ay = bb.h / S;
      const tex = extractTex(A, bb);
      const mesh = bCurl(ax, ay, amount, ang, radius);   // amount animates → rebuilt per frame (cheap)
      renderMesh(B, tex, bb.w, bb.h, mesh.v, mesh.t, { cx: bb.x + bb.w / 2, cy: bb.y + bb.h / 2, R: S / 2, rx: 0, ry: 0, rz: 0, shading });
    },
    fliplayer: function (A, B, W, H, bb, p, t) {
      const m = (p.mode | 0), px = bb.x + bb.w / 2, py = bb.y + bb.h / 2;
      B.save();
      B.translate(px, py);
      B.scale(m === 1 ? 1 : -1, m === 0 ? 1 : -1);
      B.translate(-px, -py);
      B.drawImage(A, 0, 0);
      B.restore();
    },
    rasterextrude: function (A, B, W, H, bb, p, t) {
      const depth = Math.max(0, Math.min(100, fparam(p, 'depth', 40, t)));
      const ang = fparam(p, 'angle', 225, t) * Math.PI / 180;
      const dk = clamp01(fparam(p, 'darken', 0.55, t));
      const steps = Math.round(depth);
      if (!steps) { B.drawImage(A, 0, 0); return; }
      if (!_reC) _reC = document.createElement('canvas');
      _reC.width = W; _reC.height = H;
      const rctx = _reC.getContext('2d');
      rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.clearRect(0, 0, W, H);
      rctx.globalCompositeOperation = 'source-over'; rctx.drawImage(A, 0, 0);
      rctx.globalCompositeOperation = 'source-atop';
      rctx.fillStyle = 'rgba(0,0,0,' + dk.toFixed(3) + ')';
      rctx.fillRect(0, 0, W, H);
      rctx.globalCompositeOperation = 'source-over';
      const ddx = Math.cos(ang), ddy = Math.sin(ang);
      for (let i = steps; i >= 1; i--) B.drawImage(_reC, ddx * i, ddy * i);
      B.drawImage(A, 0, 0);
    },
    tiles: function (A, B, W, H, bb, p, t) {
      const n = Math.max(1, Math.min(8, Math.round(fparam(p, 'count', 3, t))));
      const gap = Math.max(0, Math.min(0.4, fparam(p, 'gap', 8, t) / 100));
      const cw = W / n, ch = H / n, gx = cw * gap, gy = ch * gap;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        B.drawImage(A, 0, 0, W, H, i * cw + gx / 2, j * ch + gy / 2, cw - gx, ch - gy);
      }
    },
    // ---- Move / Transform (motion about the layer's rendered bounds) ----
    wiggle: function (A, B, W, H, bb, p, t, tl) {
      const amt = fparam(p, 'amount', 40, t), spd = fparam(p, 'speed', 2, t);
      B.save(); B.translate(amt * wnoise(tl * spd), amt * wnoise(tl * spd + 100)); B.drawImage(A, 0, 0); B.restore();
    },
    shake: function (A, B, W, H, bb, p, t, tl) {
      const amt = fparam(p, 'amount', 20, t), spd = fparam(p, 'speed', 12, t), tw = fparam(p, 'twist', 4, t);
      const px = bb.x + bb.w / 2, py = bb.y + bb.h / 2;
      B.save();
      B.translate(px + amt * wnoise(tl * spd), py + amt * wnoise(tl * spd + 55));
      B.rotate(tw * wnoise(tl * spd + 200) * Math.PI / 180);
      B.translate(-px, -py);
      B.drawImage(A, 0, 0); B.restore();
    },
    swing: function (A, B, W, H, bb, p, t, tl) {
      const amp = fparam(p, 'angle', 15, t), spd = fparam(p, 'speed', 1, t);
      const px = bb.x + bb.w / 2, py = bb.y;   // pendulum pivot: top-centre of the layer
      B.save();
      B.translate(px, py);
      B.rotate(amp * Math.sin(2 * Math.PI * spd * tl) * Math.PI / 180);
      B.translate(-px, -py);
      B.drawImage(A, 0, 0); B.restore();
    },
    spin: function (A, B, W, H, bb, p, t, tl) {
      const spd = fparam(p, 'speed', 90, t);
      const px = bb.x + bb.w / 2, py = bb.y + bb.h / 2;
      B.save();
      B.translate(px, py);
      B.rotate(spd * tl * Math.PI / 180);
      B.translate(-px, -py);
      B.drawImage(A, 0, 0); B.restore();
    },
    pulse: function (A, B, W, H, bb, p, t, tl) {
      const amt = fparam(p, 'amount', 0.2, t), spd = fparam(p, 'speed', 1.5, t);
      const s = 1 + amt * Math.sin(2 * Math.PI * spd * tl);
      const px = bb.x + bb.w / 2, py = bb.y + bb.h / 2;
      B.save();
      B.translate(px, py); B.scale(s, s); B.translate(-px, -py);
      B.drawImage(A, 0, 0); B.restore();
    },
    drift: function (A, B, W, H, bb, p, t, tl) {
      const vx = fparam(p, 'x', 120, t), vy = fparam(p, 'y', 0, t);
      B.save(); B.translate(vx * tl, vy * tl); B.drawImage(A, 0, 0); B.restore();
    },
    orbit: function (A, B, W, H, bb, p, t, tl) {
      const r = fparam(p, 'radius', 80, t), spd = fparam(p, 'speed', 0.5, t);
      const a = 2 * Math.PI * spd * tl;
      B.save(); B.translate(r * Math.cos(a), r * Math.sin(a)); B.drawImage(A, 0, 0); B.restore();
    },
  };

  // RGB split / chromatic aberration: render the layer clean to an offscreen, then rebuild it
  // sampling the RED channel shifted +d and the BLUE channel shifted -d → coloured edge fringes.
  let _rgbA = null, _rgbB = null;
  function drawRgbSplit(ctx, layer, t, scene, d, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height, dd = Math.round(Math.max(0, d));
    if (!_rgbA) _rgbA = document.createElement('canvas');
    if (!_rgbB) _rgbB = document.createElement('canvas');
    _rgbA.width = W; _rgbA.height = H; _rgbB.width = W; _rgbB.height = H;
    const actx = _rgbA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    // render the layer with the rgbsplit effect removed (full opacity, normal blend) — keeps other fx/mask/blur
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'rgbsplit'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    if (dd <= 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = opacity; ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over'; ctx.filter = 'none'; ctx.drawImage(_rgbA, 0, 0); ctx.restore(); return; }
    const src = actx.getImageData(0, 0, W, H).data;
    const bctx = _rgbB.getContext('2d'); const out = bctx.createImageData(W, H); const o = out.data;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const i = (row + x) * 4;
        const ri = (row + Math.min(W - 1, x + dd)) * 4;   // red sampled from the right
        const bi = (row + Math.max(0, x - dd)) * 4;        // blue sampled from the left
        o[i] = src[ri]; o[i + 1] = src[i + 1]; o[i + 2] = src[bi + 2];
        o[i + 3] = Math.max(src[i + 3], src[ri + 3], src[bi + 3]);
      }
    }
    bctx.putImageData(out, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_rgbB, 0, 0);
    ctx.restore();
  }

  // Posterize: quantize each colour channel to N levels (banded / poster look).
  let _psA = null, _psB = null;
  function drawPosterize(ctx, layer, t, scene, levels, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height, q = Math.max(2, Math.round(levels));
    if (!_psA) _psA = document.createElement('canvas');
    if (!_psB) _psB = document.createElement('canvas');
    _psA.width = W; _psA.height = H; _psB.width = W; _psB.height = H;
    const actx = _psA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'posterize'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const img = actx.getImageData(0, 0, W, H), d = img.data, step = 255 / (q - 1);
    for (let i = 0; i < d.length; i += 4) { d[i] = Math.round(Math.round(d[i] / step) * step); d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step); d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step); }
    _psB.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_psB, 0, 0);
    ctx.restore();
  }

  // Tint / colorize: map each pixel's luminance onto a colour (black→black, white→tint), blended
  // with the original by `amount` — a quick duotone/colour-wash look.
  let _tiA = null, _tiB = null;
  function drawTint(ctx, layer, t, scene, amount, colorHex, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height, am = clamp01(amount), C = hexToRGB(colorHex || '#ff3366');
    if (!_tiA) _tiA = document.createElement('canvas');
    if (!_tiB) _tiB = document.createElement('canvas');
    _tiA.width = W; _tiA.height = H; _tiB.width = W; _tiB.height = H;
    const actx = _tiA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'tint'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const img = actx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;   // luma 0..1
      d[i] = d[i] + (l * C[0] - d[i]) * am;
      d[i + 1] = d[i + 1] + (l * C[1] - d[i + 1]) * am;
      d[i + 2] = d[i + 2] + (l * C[2] - d[i + 2]) * am;
    }
    _tiB.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_tiB, 0, 0);
    ctx.restore();
  }

  // Threshold: hard 2-tone cut on luminance (black below the level, white above). Pair with Tint
  // for a duotone. Alpha is preserved so only the visible shape is split.
  let _thA = null, _thB = null;
  function drawThreshold(ctx, layer, t, scene, level, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height, cut = clamp01(level) * 255;
    if (!_thA) _thA = document.createElement('canvas');
    if (!_thB) _thB = document.createElement('canvas');
    _thA.width = W; _thA.height = H; _thB.width = W; _thB.height = H;
    const actx = _thA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'threshold'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const img = actx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) >= cut ? 255 : 0;
      d[i] = v; d[i + 1] = v; d[i + 2] = v;
    }
    _thB.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_thB, 0, 0);
    ctx.restore();
  }

  // Duotone: map luminance across two colours (shadows → highlights), blended by `amount`. The
  // classic print/Spotify look — distinct from Tint (which keeps the original toward one colour).
  let _duA = null, _duB = null;
  function drawDuotone(ctx, layer, t, scene, amount, shadowHex, hiHex, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height, am = clamp01(amount), A = hexToRGB(shadowHex || '#241a52'), B = hexToRGB(hiHex || '#ff9e5e');
    if (!_duA) _duA = document.createElement('canvas');
    if (!_duB) _duB = document.createElement('canvas');
    _duA.width = W; _duA.height = H; _duB.width = W; _duB.height = H;
    const actx = _duA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'duotone'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    const img = actx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;   // luma 0..1
      d[i] = d[i] + ((A[0] + (B[0] - A[0]) * l) - d[i]) * am;
      d[i + 1] = d[i + 1] + ((A[1] + (B[1] - A[1]) * l) - d[i + 1]) * am;
      d[i + 2] = d[i + 2] + ((A[2] + (B[2] - A[2]) * l) - d[i + 2]) * am;
    }
    _duB.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(_duB, 0, 0);
    ctx.restore();
  }

  // Mirror / kaleidoscope: render the layer clean, then reflect one half onto the other.
  let _miA = null;
  function drawMirror(ctx, layer, t, scene, mode, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height; mode = Math.round(mode) || 0;
    if (!_miA) _miA = document.createElement('canvas');
    _miA.width = W; _miA.height = H;
    const actx = _miA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'mirror'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    const hw = W / 2, hh = H / 2;
    if (mode === 0) {           // Left → Right
      ctx.drawImage(_miA, 0, 0, hw, H, 0, 0, hw, H);
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(_miA, 0, 0, hw, H, 0, 0, hw, H); ctx.restore();
    } else if (mode === 1) {    // Right → Left
      ctx.drawImage(_miA, hw, 0, hw, H, hw, 0, hw, H);
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(_miA, hw, 0, hw, H, hw, 0, hw, H); ctx.restore();
    } else if (mode === 2) {    // Top → Bottom
      ctx.drawImage(_miA, 0, 0, W, hh, 0, 0, W, hh);
      ctx.save(); ctx.translate(0, H); ctx.scale(1, -1); ctx.drawImage(_miA, 0, 0, W, hh, 0, 0, W, hh); ctx.restore();
    } else {                    // Bottom → Top
      ctx.drawImage(_miA, 0, hh, W, hh, 0, hh, W, hh);
      ctx.save(); ctx.translate(0, H); ctx.scale(1, -1); ctx.drawImage(_miA, 0, hh, W, hh, 0, hh, W, hh); ctx.restore();
    }
    ctx.restore();
  }

  // Pixelate / mosaic: render the layer clean, downscale (averaging) then upscale with smoothing off.
  let _pxA = null, _pxS = null;
  function drawPixelate(ctx, layer, t, scene, size, fx) {
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const W = P.width, H = P.height;
    size = Math.max(1, Math.round(size));
    if (!_pxA) _pxA = document.createElement('canvas');
    if (!_pxS) _pxS = document.createElement('canvas');
    _pxA.width = W; _pxA.height = H;
    const actx = _pxA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
    actx.globalAlpha = 1; actx.globalCompositeOperation = 'source-over'; actx.filter = 'none';
    const tmp = Object.assign({}, layer, { blendMode: 'normal', effects: (layer.effects || []).filter(e => fx ? e !== fx : e.type !== 'pixelate'), transform: Object.assign({}, layer.transform, { opacity: 1 }) });
    drawLayer(actx, tmp, t, scene);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = 'none';
    if (size <= 1) { ctx.drawImage(_pxA, 0, 0); ctx.restore(); return; }
    const sw = Math.max(1, Math.round(W / size)), sh = Math.max(1, Math.round(H / size));
    _pxS.width = sw; _pxS.height = sh;
    const sctx = _pxS.getContext('2d');
    sctx.clearRect(0, 0, sw, sh); sctx.imageSmoothingEnabled = true;
    sctx.drawImage(_pxA, 0, 0, sw, sh);                 // downscale (block-average)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_pxS, 0, 0, sw, sh, 0, 0, W, H);      // upscale → blocky
    ctx.imageSmoothingEnabled = true;
    ctx.restore();
  }

  // Two-stop gradient (linear/radial) spanning a box {x,y,w,h} in the current transform space.
  function buildGradient(ctx, grad, box, t) {
    const c0 = FM.evalProp(grad.c0, t || 0) || '#ffffff', c1 = FM.evalProp(grad.c1, t || 0) || '#000000';
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    let g;
    if (grad.type === 'radial') {
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, Math.hypot(box.w, box.h) / 2));
    } else if (grad.type === 'angular' && ctx.createConicGradient) {
      g = ctx.createConicGradient((grad.angle || 0) * Math.PI / 180, cx, cy);
      g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c0);   // seamless wrap around the sweep
      return g;
    } else {
      const ang = (grad.angle || 0) * Math.PI / 180, dx = Math.cos(ang), dy = Math.sin(ang);
      const half = (Math.abs(dx) * box.w + Math.abs(dy) * box.h) / 2 || 1;
      g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    }
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    return g;
  }
  // Effective fill mode: explicit layer.fillMode, else derived from legacy fields so old projects
  // render byte-identically. One of 'none' | 'solid' | 'gradient' | 'media'. Media/groups default
  // to 'none' (show their own content) — shapes/text default to 'solid'.
  FM.fillModeOf = function (layer) {
    if (layer.fillMode) return layer.fillMode;
    if (layer.fillGradient && layer.fillGradient.enabled) return 'gradient';
    return (layer.type === 'shape' || layer.type === 'text') ? 'solid' : 'none';
  };
  // Does the fill system own this layer's colour right now? (drawn fill replaces/paints the content,
  // so the legacy colorGrade hue/sat filter must NOT shift the picked colour — WYSIWYG.)
  function fillOwnsColor(layer) {
    if (layer.type === 'shape' || layer.type === 'text') return true;
    return layer.fillMode != null && layer.fillMode !== 'none';
  }
  FM.layerHasGradient = function (layer) { return FM.fillModeOf(layer) === 'gradient' && !!layer.fillGradient; };
  // Media-fill pictures (a shape filled with an image), decoded lazily from the self-contained data
  // URL stashed on layer.fillImage — needs no extra IndexedDB plumbing and survives reload.
  const _fillImg = {};
  function getFillImage(layer) {
    const src = layer.fillImage;
    if (!src) return null;
    let rec = _fillImg[layer.id];
    if (!rec || rec.src !== src) {
      rec = _fillImg[layer.id] = { src: src, img: new Image(), ready: false };
      rec.img.onload = () => { rec.ready = true; FM.requestRender(); };
      rec.img.src = src;
    }
    return rec.ready ? rec.img : null;
  }
  // Paint the CURRENT path with the layer's fill (solid / gradient / media), honouring fillOpacity
  // and colour keyframes. Shared by the shape branch and the media fill-override so a rect, a video
  // and a group silhouette all colour identically. Assumes the caller traced the path.
  function paintFillInPath(ctx, layer, t, ox, oy, w, h) {
    const fmode = FM.fillModeOf(layer);
    if (fmode === 'none') return;
    const prevA = ctx.globalAlpha;
    ctx.globalAlpha = prevA * (layer.fillOpacity != null ? clamp01(layer.fillOpacity) : 1);
    if (fmode === 'media') {
      const fimg = getFillImage(layer);
      if (fimg && fimg.width) {
        ctx.save(); ctx.clip();                                        // clip to the traced outline
        const sc = Math.max(w / fimg.width, h / fimg.height);          // cover-fit inside the box
        const dw = fimg.width * sc, dh = fimg.height * sc;
        try { ctx.drawImage(fimg, ox + (w - dw) / 2, oy + (h - dh) / 2, dw, dh); } catch (e) {}
        ctx.restore();
      } else { ctx.fillStyle = FM.evalProp(layer.fill, t) || '#3a7bd5'; ctx.fill(); }   // still decoding → placeholder
    } else {
      ctx.fillStyle = (fmode === 'gradient' && layer.fillGradient) ? buildGradient(ctx, layer.fillGradient, { x: ox, y: oy, w: w, h: h }, t) : (FM.evalProp(layer.fill, t) || '#3a7bd5');
      ctx.fill();
    }
    ctx.globalAlpha = prevA;
  }

  // Apply a layer's full GEOMETRIC transform to ctx: parent chain → position (+ Z perspective shift
  // & wiggle) → rotation (+ parent rot mode) → non-uniform scale (× Z pscale) → skew. Factored out so
  // the feathered-mask pass applies the EXACT same transform as the content and the soft mask can't
  // drift off when a layer is skewed / non-uniformly scaled / has Z. (#7) Does NOT touch alpha / blend
  // / filter / shadow / mask-clip — the caller owns those.
  function applyLayerTransform(ctx, layer, t, scene) {
    const tr = layer.transform;
    const x = FM.evalProp(tr.x, t);
    const y = FM.evalProp(tr.y, t);
    const scale = FM.evalProp(tr.scale, t);
    const rot = FM.evalProp(tr.rotation, t) * Math.PI / 180;
    // Non-uniform scale (W/H), skew (X/Y), and a real Z via planar perspective about the project
    // centre. All additive: absent fields fall back so existing projects render identically.
    const _P = (scene && scene.project) || { width: ctx.canvas.width, height: ctx.canvas.height };
    const sclX = scale * (tr.scaleX != null ? FM.evalProp(tr.scaleX, t) : 1);   // scaleX/scaleY are non-uniform multipliers on the uniform master `scale`
    const sclY = scale * (tr.scaleY != null ? FM.evalProp(tr.scaleY, t) : 1);
    const skX = tr.skewX != null ? FM.evalProp(tr.skewX, t) : 0;
    const skY = tr.skewY != null ? FM.evalProp(tr.skewY, t) : 0;
    const zz = tr.z != null ? FM.evalProp(tr.z, t) : 0;
    const _F = Math.max(1, (_P.height || 1080) * 2);              // focal length (~2× project height)
    const pscale = zz ? _F / Math.max(_F * 0.05, _F + zz) : 1;    // z>0 = farther (smaller), z<0 = nearer (bigger)
    const _vpx = (_P.width || 0) / 2, _vpy = (_P.height || 0) / 2;
    const accumRot = applyParentChain(ctx, layer, t, scene);   // inherit parent motion before the layer's own transform
    const wig = FM.wiggleOffset(layer, t);                      // procedural jitter (motion-blur path averages it per sub-frame)
    // Z shifts on-screen position toward the project-centre vanishing point — but ONLY for unparented
    // layers, whose x/y are in project space. After applyParentChain the ctx is in the parent's local
    // space, so the project-centre lerp would converge on the wrong point; a parented layer takes Z as
    // scale alone (about its own origin). (#8)
    const lerp = pscale !== 1 && !layer.parent;
    const _px = lerp ? _vpx + (x - _vpx) * pscale : x;
    const _py = lerp ? _vpy + (y - _vpy) * pscale : y;
    ctx.translate(_px + (wig ? wig.x : 0), _py + (wig ? wig.y : 0));
    applyParentRotMode(ctx, layer, accumRot);   // 'locked'/'weighted' cancel some inherited rotation
    if (rot) ctx.rotate(rot);
    // Clamp the effective scale off zero so an overshoot/back-eased keyframe that momentarily dips
    // negative can't flip or collapse the layer for a frame. (#10)
    const _sx = Math.max(1e-4, sclX * pscale), _sy = Math.max(1e-4, sclY * pscale);
    if (_sx !== 1 || _sy !== 1) ctx.scale(_sx, _sy);
    if (skX || skY) ctx.transform(1, Math.tan(skY * Math.PI / 180), Math.tan(skX * Math.PI / 180), 1, 0, 0);   // X/Y skew
  }

  // ---- Data-driven shape library (AM parity) ----
  // Every entry is an ARRAY OF POLYGONS in normalized [0,1] space (multi-polygon shapes like the
  // sun's rays are several subpaths of one fill). Generated once at load; traceShapePath scales
  // them into the layer's box, and point editing converts them straight into editable paths.
  FM.SHAPE_POLYS = (function () {
    const arc = (cx, cy, rx, ry, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return o; };
    const rot = (pts, cx, cy, ang) => pts.map(([x, y]) => { const dx = x - cx, dy = y - cy, c = Math.cos(ang), s = Math.sin(ang); return [cx + dx * c - dy * s, cy + dx * s + dy * c]; });
    const bez = (p0, p1, p2, p3, n) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0], u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]]); } return o; };
    const PI = Math.PI, T = PI * 2;
    const S = {};
    // — page 2 —
    S.speech = [[[0.1,0.06],[0.9,0.06],[0.97,0.14],[0.97,0.66],[0.9,0.74],[0.42,0.74],[0.16,0.95],[0.22,0.74],[0.1,0.74],[0.03,0.66],[0.03,0.14]]];
    S.moon = [arc(0.5,0.5,0.47,0.47,-PI*0.62,PI*0.62,22).concat(arc(0.72,0.5,0.34,0.4,PI*0.55,-PI*0.55,20))];
    (function(){ const spoke=[[0.47,0.06],[0.53,0.06],[0.53,0.94],[0.47,0.94]], stub=(y,dir)=>[[0.5,y],[0.5+0.14*dir,y-0.1],[0.5+0.17*dir,y-0.06],[0.53*0+0.5+0.03*dir,y+0.045]]; const polys=[]; for(let k=0;k<3;k++){ const a=k*PI/3; polys.push(rot(spoke,0.5,0.5,a)); [[0.16,1],[0.16,-1],[0.84,1],[0.84,-1]].forEach(([y,d])=>polys.push(rot(stub(y,d),0.5,0.5,a))); } S.snowflake=polys; })();
    S.shield = [[[0.5,0.02],[0.94,0.14]].concat(arc(0.5,0.14,0.44,0.62,0,PI/2,12)).concat([[0.5,0.98]]).concat(arc(0.5,0.14,0.44,0.62,PI/2,PI,12)).concat([[0.06,0.14]])];
    S.check = [[[0.05,0.55],[0.2,0.4],[0.38,0.58],[0.8,0.12],[0.95,0.26],[0.38,0.88]]];
    S.droplet = [[[0.5,0.02],[0.68,0.32]].concat(arc(0.5,0.62,0.32,0.34,-PI*0.3,PI*1.3,24)).concat([[0.32,0.32]])];
    S.cloud = [arc(0.26,0.58,0.17,0.17,PI*0.5,PI*1.36,12).concat(arc(0.48,0.42,0.2,0.2,PI,PI*1.95,14)).concat(arc(0.72,0.56,0.17,0.17,PI*1.42,PI*2.5,12))];
    S.play = [[[0.12,0.06],[0.94,0.5],[0.12,0.94]]];
    (function(){ const o=[]; const turns=2.6,N=110; for(let i=0;i<=N;i++){const f=i/N,a=f*turns*T,r=0.04+f*0.44;o.push([0.5+r*Math.cos(a),0.5+r*Math.sin(a)]);} S.spiral=[o]; })();
    (function(){ const o=[]; for(let i=0;i<8;i++){const a=-PI/2+i*PI/4,r=(i%2===0)?0.48:0.13;o.push([0.5+r*Math.cos(a),0.5+r*Math.sin(a)]);} S.sparkle=[o]; })();
    S.bolt = [[[0.62,0.02],[0.2,0.56],[0.44,0.56],[0.36,0.98],[0.8,0.42],[0.55,0.42]]];
    S.puzzle = [[[0.1,0.3],[0.431,0.3]].concat(arc(0.5,0.19,0.13,0.13,2.13,7.29,16)).concat([[0.569,0.3],[0.9,0.3],[0.9,0.5]]).concat(arc(0.9,0.62,-0.12,0.12,-PI/2,PI/2,10)).concat([[0.9,0.74],[0.9,0.95],[0.1,0.95]])];
    S.pushpin = [arc(0.5,0.3,0.26,0.26,PI*0.9,PI*2.1,20).concat([[0.62,0.55],[0.54,0.6],[0.5,0.97],[0.46,0.6],[0.38,0.55]])];
    // — page 3 —
    S.flag = [[[0.14,0.02],[0.22,0.02],[0.22,0.12],[0.9,0.2],[0.68,0.34],[0.9,0.48],[0.22,0.42],[0.22,0.98],[0.14,0.98]]];
    S.thumbsup = [[[0.06,0.5],[0.24,0.5],[0.24,0.96],[0.06,0.96]],[[0.28,0.52],[0.42,0.22],[0.46,0.06],[0.58,0.06],[0.58,0.36],[0.94,0.36],[0.9,0.52],[0.92,0.64],[0.86,0.78],[0.84,0.92],[0.6,0.96],[0.28,0.92]]];
    S.paperplane = [[[0.04,0.5],[0.96,0.08],[0.62,0.92],[0.46,0.62],[0.96,0.08],[0.46,0.62],[0.3,0.56]]];
    S.house = [[[0.5,0.04],[0.96,0.44],[0.86,0.44],[0.86,0.96],[0.6,0.96],[0.6,0.66],[0.4,0.66],[0.4,0.96],[0.14,0.96],[0.14,0.44],[0.04,0.44]]];
    (function(){ const polys=[[[0.55,0.98],[0.50,0.98],[0.365,0.06],[0.415,0.05]]]; const sa=Math.atan2(-0.9,-0.14); for(let i=0;i<6;i++){ const f=0.15+i*0.14, cx=0.525-0.14*f, cy=0.98-0.9*f; [[1,sa+0.7],[-1,sa-0.7]].forEach(([sgn,ang])=>{ const lx=cx+sgn*0.078, ly=cy-sgn*0.012; polys.push(rot(arc(lx,ly,0.095,0.034,0,T,10),lx,ly,ang)); }); } S.laurel=polys; })();
    S.bookmark = [[[0.22,0.02],[0.78,0.02],[0.78,0.96],[0.5,0.72],[0.22,0.96]]];
    S.pointhand = [[[0.02,0.44],[0.36,0.42],[0.4,0.28],[0.47,0.22],[0.54,0.28],[0.52,0.42],[0.96,0.42],[0.98,0.48],[0.94,0.53],[0.6,0.53],[0.9,0.55],[0.9,0.64],[0.58,0.64],[0.84,0.67],[0.83,0.76],[0.56,0.75],[0.72,0.79],[0.7,0.88],[0.42,0.87],[0.22,0.82],[0.02,0.72]]];
    S.flame = [bez([0.52,0.02],[0.72,0.22],[0.6,0.3],[0.76,0.42],10).concat(bez([0.76,0.42],[0.9,0.54],[0.84,0.78],[0.64,0.88],12)).concat(arc(0.48,0.76,0.2,0.14,PI*0.25,PI*0.85,8)).concat(bez([0.3,0.84],[0.12,0.72],[0.16,0.5],[0.3,0.38],12)).concat(bez([0.3,0.38],[0.42,0.3],[0.34,0.2],[0.52,0.02],10))];
    S.banner = [[[0.02,0.24],[0.98,0.24],[0.86,0.5],[0.98,0.76],[0.02,0.76],[0.14,0.5]]];
    (function(){ const polys=[]; const N=14, a0=PI*1.61, a1=PI*3.39; for(let i=0;i<N;i++){ const a=a0+i*(a1-a0)/(N-1); const cx=0.5+0.38*Math.cos(a), cy=0.52+0.38*Math.sin(a); polys.push(rot(arc(cx,cy,0.088,0.033,0,T,8),cx,cy,a+PI/2)); } S.wreath=polys; })();
    S.diamond = [[[0.5,0.02],[0.92,0.5],[0.5,0.98],[0.08,0.5]]];
    S.plane = [[[0.5,0.04],[0.58,0.12],[0.58,0.34],[0.98,0.58],[0.98,0.68],[0.58,0.56],[0.58,0.78],[0.72,0.9],[0.72,0.97],[0.5,0.9],[0.28,0.97],[0.28,0.9],[0.42,0.78],[0.42,0.56],[0.02,0.68],[0.02,0.58],[0.42,0.34],[0.42,0.12]]];
    S.umbrella = [arc(0.5,0.52,0.47,0.44,PI,T,26).concat([[0.86,0.55],[0.78,0.48],[0.68,0.55],[0.6,0.48],[0.54,0.53],[0.54,0.84]]).concat(arc(0.44,0.84,0.1,0.1,0,PI,8)).concat([[0.28,0.84],[0.28,0.8],[0.4,0.8]]).concat(arc(0.44,0.84,0.02,0.02,PI,0,4)).concat([[0.46,0.53],[0.4,0.48],[0.31,0.55],[0.22,0.48],[0.13,0.55]])];
    S.bomb = [arc(0.44,0.62,0.36,0.36,0,T,26),[[0.6,0.28],[0.72,0.14],[0.8,0.2],[0.68,0.36]],[[0.78,0.06],[0.84,0.12],[0.88,0.04],[0.94,0.1],[0.9,0.16],[0.98,0.18],[0.86,0.22],[0.8,0.14]]];
    // — page 4 —
    S.boat = [[[0.5,0.02],[0.54,0.02],[0.54,0.62],[0.5,0.62]],[[0.58,0.1],[0.94,0.6],[0.58,0.6]],[[0.46,0.22],[0.46,0.6],[0.1,0.6]],[[0.06,0.68],[0.94,0.68],[0.82,0.94],[0.18,0.94]]];
    S.magnifier = [arc(0.42,0.42,0.34,0.34,0,T,26).concat([]),[[0.62,0.68],[0.7,0.6],[0.98,0.86],[0.9,0.94]]];
    S.key = [arc(0.3,0.3,0.24,0.24,0,T,22),[[0.44,0.42],[0.94,0.88],[0.94,0.97],[0.84,0.97],[0.84,0.88],[0.74,0.88],[0.74,0.78],[0.64,0.78],[0.36,0.5]]];
    (function(){ const polys=[arc(0.5,0.5,0.24,0.24,0,T,24)]; for(let i=0;i<8;i++){ const a=i*PI/4; polys.push(rot([[0.5,0.02],[0.56,0.18],[0.44,0.18]],0.5,0.5,a)); } S.sun=polys; })();
    S.person = [arc(0.5,0.16,0.13,0.13,0,T,18),[[0.34,0.32],[0.66,0.32],[0.74,0.62],[0.66,0.64],[0.62,0.46],[0.62,0.96],[0.53,0.96],[0.53,0.66],[0.47,0.66],[0.47,0.96],[0.38,0.96],[0.38,0.46],[0.34,0.64],[0.26,0.62]]];
    S.rocket = [bez([0.5,0.02],[0.68,0.2],[0.66,0.5],[0.62,0.7],14).concat([[0.62,0.7],[0.38,0.7]]).concat(bez([0.38,0.7],[0.34,0.5],[0.32,0.2],[0.5,0.02],14)),[[0.38,0.6],[0.38,0.82],[0.2,0.94],[0.3,0.66]],[[0.62,0.6],[0.7,0.66],[0.8,0.94],[0.62,0.82]],[[0.46,0.74],[0.54,0.74],[0.5,0.94]]];
    S.envelope = [[[0.03,0.16],[0.97,0.16],[0.5,0.6]],[[0.03,0.24],[0.44,0.56],[0.03,0.84]],[[0.97,0.24],[0.97,0.84],[0.56,0.56]],[[0.1,0.86],[0.46,0.62],[0.5,0.66],[0.54,0.62],[0.9,0.86]]];
    S.woman = [arc(0.5,0.14,0.12,0.12,0,T,18),[[0.4,0.28],[0.6,0.28],[0.78,0.72],[0.6,0.72],[0.6,0.96],[0.52,0.96],[0.52,0.78],[0.48,0.78],[0.48,0.96],[0.4,0.96],[0.4,0.72],[0.22,0.72]]];
    S.car = [[[0.2,0.36],[0.34,0.2],[0.68,0.2],[0.82,0.36],[0.96,0.42],[0.98,0.6],[0.9,0.62]].concat(arc(0.78,0.64,0.09,0.09,0,PI,8)).concat([[0.69,0.64],[0.35,0.64]]).concat(arc(0.24,0.64,0.09,0.09,0,PI,8)).concat([[0.15,0.64],[0.02,0.6],[0.04,0.42]])];
    S.stamp = [(function(){ const pts=[]; const bumps=5,r=0.045; for(let i=0;i<bumps;i++) pts.push(...arc(0.1+ (0.8/(bumps-1))*i,0.08,r,r,PI,0,6)); for(let i=0;i<bumps;i++) pts.push(...arc(0.92,0.1+(0.8/(bumps-1))*i,r,r,-PI/2,PI/2,6)); for(let i=0;i<bumps;i++) pts.push(...arc(0.9-(0.8/(bumps-1))*i,0.92,r,r,0,PI,6)); for(let i=0;i<bumps;i++) pts.push(...arc(0.08,0.9-(0.8/(bumps-1))*i,r,r,PI/2,PI*1.5,6)); return pts; })()];
    return S;
  })();
  const OPEN_POLY = { spiral: 1 };   // data shapes that STROKE their polyline instead of filling

  // Trace a shape layer's outline into ctx (beginPath + geometry only — caller fills/strokes).
  // ONE tracer shared by drawLayer and renderThumb so the two can never drift. Returns 'stroke'
  // for open kinds (line/arc — stroked, never filled) and 'fill' for everything else.
  FM.traceShapePath = function (ctx, layer, ox, oy, sw, sh) {
    const kind = layer.shape || 'rect';
    const P = (u, v) => [ox + u * sw, oy + v * sh];
    const poly = pts => {
      pts.forEach((p, i) => { const q = P(p[0], p[1]); if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
      ctx.closePath();
    };
    ctx.beginPath();
    const dp = FM.SHAPE_POLYS[kind];
    if (dp) {   // data-driven library shape: one or more normalized polygons
      dp.forEach(pl => { pl.forEach((q, i) => { const v = P(q[0], q[1]); if (i === 0) ctx.moveTo(v[0], v[1]); else ctx.lineTo(v[0], v[1]); }); if (!OPEN_POLY[kind]) ctx.closePath(); });
      return OPEN_POLY[kind] ? 'stroke' : 'fill';
    }
    if (kind === 'path') {
      // Freehand / vector / converted-shape path. layer.subs = multi-subpath (array of point
      // arrays); layer.points = single path. All [0,1]-normalized within the box.
      const subs = layer.subs || (layer.points && layer.points.length ? [layer.points] : []);
      if (!subs.length) return layer.closed ? 'fill' : 'stroke';
      subs.forEach(pts => {
        pts.forEach((p, i) => { const q = P(p[0], p[1]); if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
        if (layer.closed) ctx.closePath();
      });
      return layer.closed ? 'fill' : 'stroke';   // open path (freehand brush) is stroked, never filled
    } else if (kind === 'ellipse') {
      ctx.ellipse(ox + sw / 2, oy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
    } else if (kind === 'line') {
      ctx.moveTo(ox, oy + sh / 2); ctx.lineTo(ox + sw, oy + sh / 2);
      return 'stroke';
    } else if (kind === 'arc') {
      ctx.ellipse(ox + sw / 2, oy + sh / 2, sw / 2, sh / 2, 0, -Math.PI / 3, Math.PI * 4 / 3);
      return 'stroke';
    } else if (kind === 'polygon') {
      const n = Math.max(3, layer.sides || 5), cx = ox + sw / 2, cy = oy + sh / 2;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / n;
        const px = cx + (sw / 2) * Math.cos(a), py = cy + (sh / 2) * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (kind === 'triangle') {
      ctx.moveTo(ox + sw / 2, oy); ctx.lineTo(ox + sw, oy + sh); ctx.lineTo(ox, oy + sh); ctx.closePath();
    } else if (kind === 'star') {
      const n = Math.max(3, layer.sides || 5), cx = ox + sw / 2, cy = oy + sh / 2, inr = 0.45;
      for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + i * Math.PI / n, rr = (i % 2 === 0) ? 1 : inr;
        const px = cx + (sw / 2) * rr * Math.cos(a), py = cy + (sh / 2) * rr * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (kind === 'heart') {
      const cx = ox + sw / 2;
      ctx.moveTo(cx, oy + sh * 0.95);
      ctx.bezierCurveTo(ox - sw * 0.02, oy + sh * 0.55, ox + sw * 0.12, oy + sh * 0.02, cx, oy + sh * 0.30);
      ctx.bezierCurveTo(ox + sw * 0.88, oy + sh * 0.02, ox + sw * 1.02, oy + sh * 0.55, cx, oy + sh * 0.95);
      ctx.closePath();
    } else if (kind === 'plus') {
      poly([[0.33, 0], [0.67, 0], [0.67, 0.33], [1, 0.33], [1, 0.67], [0.67, 0.67], [0.67, 1], [0.33, 1], [0.33, 0.67], [0, 0.67], [0, 0.33], [0.33, 0.33]]);
    } else if (kind === 'pie') {
      const cx = ox + sw / 2, cy = oy + sh / 2;
      ctx.moveTo(cx, cy);
      ctx.ellipse(cx, cy, sw / 2, sh / 2, 0, -Math.PI / 2, Math.PI);   // 270° wedge
      ctx.closePath();
    } else if (kind === 'semicircle') {
      ctx.ellipse(ox + sw / 2, oy + sh * 0.98, sw / 2, sh * 0.96, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
    } else if (kind === 'ring') {
      ctx.ellipse(ox + sw / 2, oy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
      ctx.moveTo(ox + sw / 2 + sw * 0.275, oy + sh / 2);   // new subpath — else stroke() draws an outer→hole connector line
      ctx.ellipse(ox + sw / 2, oy + sh / 2, sw * 0.275, sh * 0.275, 0, 0, Math.PI * 2, true);   // hole (reverse winding)
    } else if (kind === 'arrow') {
      poly([[0, 0.3], [0.55, 0.3], [0.55, 0], [1, 0.5], [0.55, 1], [0.55, 0.7], [0, 0.7]]);
    } else if (kind === 'chevron') {
      poly([[0, 0], [0.55, 0], [1, 0.5], [0.55, 1], [0, 1], [0.45, 0.5]]);
    } else if (kind === 'trapezoid') {
      poly([[0.22, 0], [0.78, 0], [1, 1], [0, 1]]);
    } else if (kind === 'parallelogram') {
      poly([[0.28, 0], [1, 0], [0.72, 1], [0, 1]]);
    } else {   // rect
      const r = Math.min(layer.cornerRadius || 0, sw / 2, sh / 2);
      if (r > 0 && ctx.roundRect) ctx.roundRect(ox, oy, sw, sh, r); else ctx.rect(ox, oy, sw, sh);
    }
    return 'fill';
  };

  // Convert ANY shape kind into editable normalized points → { subs: [[ [u,v], … ], …], closed }.
  // The single source for "Edit points": parametric kinds are sampled/vertex-listed to match
  // traceShapePath exactly, library kinds hand over their polygon data.
  FM.shapeToPoints = function (layer) {
    const kind = layer.shape || 'rect';
    const clone = a => a.map(pl => pl.map(p => [p[0], p[1]]));
    const ell = (cx, cy, rx, ry, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return o; };
    const PI = Math.PI;
    if (FM.SHAPE_POLYS[kind]) return { subs: clone(FM.SHAPE_POLYS[kind]), closed: !OPEN_POLY[kind] };
    if (kind === 'path') return { subs: clone(layer.subs || (layer.points ? [layer.points] : [])), closed: layer.closed !== false };
    if (kind === 'ellipse') { const o = ell(0.5, 0.5, 0.5, 0.5, 0, PI * 2, 24); o.pop(); return { subs: [o], closed: true }; }
    if (kind === 'line') return { subs: [[[0, 0.5], [1, 0.5]]], closed: false };
    if (kind === 'arc') return { subs: [ell(0.5, 0.5, 0.5, 0.5, -PI / 3, PI * 4 / 3, 20)], closed: false };
    if (kind === 'polygon' || kind === 'star') {
      const n = Math.max(3, layer.sides || 5), o = [];
      if (kind === 'polygon') for (let i = 0; i < n; i++) { const a = -PI / 2 + i * 2 * PI / n; o.push([0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]); }
      else for (let i = 0; i < n * 2; i++) { const a = -PI / 2 + i * PI / n, r = (i % 2 === 0) ? 0.5 : 0.5 * 0.45; o.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]); }
      return { subs: [o], closed: true };
    }
    if (kind === 'triangle') return { subs: [[[0.5, 0], [1, 1], [0, 1]]], closed: true };
    if (kind === 'plus') return { subs: [[[0.33, 0], [0.67, 0], [0.67, 0.33], [1, 0.33], [1, 0.67], [0.67, 0.67], [0.67, 1], [0.33, 1], [0.33, 0.67], [0, 0.67], [0, 0.33], [0.33, 0.33]]], closed: true };
    if (kind === 'arrow') return { subs: [[[0, 0.3], [0.55, 0.3], [0.55, 0], [1, 0.5], [0.55, 1], [0.55, 0.7], [0, 0.7]]], closed: true };
    if (kind === 'chevron') return { subs: [[[0, 0], [0.55, 0], [1, 0.5], [0.55, 1], [0, 1], [0.45, 0.5]]], closed: true };
    if (kind === 'trapezoid') return { subs: [[[0.22, 0], [0.78, 0], [1, 1], [0, 1]]], closed: true };
    if (kind === 'parallelogram') return { subs: [[[0.28, 0], [1, 0], [0.72, 1], [0, 1]]], closed: true };
    if (kind === 'pie') return { subs: [[[0.5, 0.5]].concat(ell(0.5, 0.5, 0.5, 0.5, -PI / 2, PI, 18))], closed: true };
    if (kind === 'semicircle') return { subs: [ell(0.5, 0.98, 0.5, 0.96, PI, PI * 2, 16)], closed: true };
    if (kind === 'ring') { const outer = ell(0.5, 0.5, 0.5, 0.5, 0, PI * 2, 24); outer.pop(); const inner = ell(0.5, 0.5, 0.275, 0.275, PI * 2, 0, 24); inner.pop(); return { subs: [outer, inner], closed: true }; }
    if (kind === 'heart') {
      const bz = (p0, p1, p2, p3, n) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0], u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]); } return o; };
      const a = bz([0.5, 0.95], [-0.02, 0.55], [0.12, 0.02], [0.5, 0.30], 12), b = bz([0.5, 0.30], [0.88, 0.02], [1.02, 0.55], [0.5, 0.95], 12);
      a.pop(); b.pop();
      return { subs: [a.concat(b)], closed: true };
    }
    return { subs: [[[0, 0], [1, 0], [1, 1], [0, 1]]], closed: true };   // rect + fallback
  };

  let _blendMaskCv = null;
  function drawLayer(ctx, layer, t, scene) {
    // Null objects are invisible transform controllers — never rasterized. They still drive
    // parented children at any time because applyParentChain reads a parent's transform directly.
    if (layer.type === 'null') return;
    if (layer.type === 'group') return;        // invisible transform parent for its members (AM grouping)
    if (layer.type === 'adjustment') return;   // handled by renderScene (grades layers below)
    if (layer.type === 'camera') return;       // handled by renderScene (drives the composite)
    if (!FM.isLayerVisibleAt(layer, t)) return;
    // MASK blend modes composite the layer as ONE plate (destination-in/out) — multi-pass draws
    // (fill+stroke, caption pill, keyed video) would otherwise each re-clip the canvas below.
    const _bop = BLEND[layer.blendMode];
    if ((_bop === 'destination-in' || _bop === 'destination-out') && scene && (!_blendMaskCv || ctx.canvas !== _blendMaskCv)) {
      const P = scene.project;
      if (!_blendMaskCv) _blendMaskCv = document.createElement('canvas');
      if (_blendMaskCv.width !== P.width || _blendMaskCv.height !== P.height) { _blendMaskCv.width = P.width; _blendMaskCv.height = P.height; }
      const mc = _blendMaskCv.getContext('2d');
      mc.setTransform(1, 0, 0, 1, 0, 0); mc.clearRect(0, 0, P.width, P.height);
      mc.globalAlpha = 1; mc.globalCompositeOperation = 'source-over'; mc.filter = 'none';
      const saved = layer.blendMode; layer.blendMode = 'normal';
      try { drawLayer(mc, layer, t, scene); } finally { layer.blendMode = saved; }
      ctx.save();
      ctx.globalCompositeOperation = _bop; ctx.globalAlpha = 1; ctx.filter = 'none';
      ctx.drawImage(_blendMaskCv, 0, 0);
      ctx.restore();
      return;
    }
    // Per-pixel post-process effects compose in ARRAY ORDER: the last one in the stack is the
    // outermost pass, rendered over a clean copy of the layer with that effect removed (recursing
    // inward through the rest). So effect[0] is applied first (innermost), effect[n] last (outermost).
    if (scene && layer.effects) {
      const pp = layer.effects.filter(e => POSTFX[e.type] && e.enabled !== false);
      if (pp.length) { applyPostFx(ctx, layer, t, scene, pp[pp.length - 1]); return; }
    }
    // Motion blur wraps the whole layer (averaged sub-frames).
    if (scene && layer.motionBlur && layer.motionBlur.enabled) { drawMotionBlur(ctx, layer, t, scene); return; }
    // A feathered mask needs an offscreen pass (clip() is hard-edged only).
    if (scene && layer.mask && layer.mask.enabled && (layer.mask.feather || 0) > 0) { drawFeatheredMaskLayer(ctx, layer, t, scene); return; }

    const tr = layer.transform;
    const opacity = clamp01(FM.evalProp(tr.opacity, t));
    if (opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND[layer.blendMode] || 'source-over';
    ctx.filter = effectFilter(layer, t);   // reset automatically by ctx.restore()
    if (layer.shadow && layer.shadow.enabled) {
      const sh = layer.shadow;
      ctx.shadowColor = sh.color || '#000';
      ctx.shadowBlur = sh.blur || 0;
      ctx.shadowOffsetX = sh.dx || 0;
      ctx.shadowOffsetY = sh.dy || 0;
    }
    applyLayerTransform(ctx, layer, t, scene);   // parent chain + position/Z + rotation + non-uniform scale + skew
    applyMaskClip(ctx, layer);   // clip to the layer's vector mask (in this local, transformed space)

    if (layer.type === '_flat') {   // flattened group unit — full-frame blit (effects/opacity/blend already set up above)
      let src = layer._canvas;
      const cg = layer.colorGrade;
      if (cg && ((cg.lift || 0) !== 0 || (cg.gamma != null && cg.gamma !== 1) || (cg.gain != null && cg.gain !== 1))) {
        src = gradeCanvas(src, src.width, src.height, cg.lift || 0, cg.gamma || 1, cg.gain != null ? cg.gain : 1);   // hue/sat apply via effectFilter above
      }
      try { ctx.drawImage(src, 0, 0); } catch (e) {}
    } else if (layer.type === 'text') {
      ctx.fillStyle = FM.evalProp(layer.color, t) || '#fff';   // keyframable text colour
      ctx.textAlign = layer.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = (layer.italic ? 'italic ' : '') + (layer.bold ? '700 ' : '') + (layer.fontSize || 96) + 'px ' + (layer.fontFamily || 'sans-serif');
      // Caption tracks render the segment active at time t; plain text renders layer.text.
      let textSrc = (layer.captions && layer.captions.length) ? (FM.activeCaption(layer, t) || '') : (layer.text || '');
      // Text effects (Count Up/Down, Text Progress, Randomizer, Spacing, Transform, Timecode) transform the
      // displayed string + letter-spacing before layout — folded in layer order.
      const _tEff = FM.applyTextEffects(layer, textSrc, (layer.letterSpacing || 0), t, scene);
      textSrc = _tEff.text;
      if ('letterSpacing' in ctx) ctx.letterSpacing = _tEff.letterSpacing + 'px';
      const lines = String(textSrc).split('\n');
      const lh = (layer.fontSize || 96) * (layer.lineHeight || 1.15);
      const total = (lines.length - 1) * lh;
      // Caption background pill: readable semi-transparent box behind the text (CapCut/AM style).
      if (layer.captionBg && String(textSrc).trim()) {
        const fs = layer.fontSize || 96;
        let maxW = 0;
        for (const ln of lines) { const w2 = ctx.measureText(ln).width; if (w2 > maxW) maxW = w2; }
        const padX = fs * 0.4, padY = fs * 0.24, align = layer.align || 'center';
        const bx0 = align === 'center' ? -maxW / 2 - padX : align === 'right' ? -maxW - padX : -padX;
        const bw = maxW + 2 * padX, bh = total + fs + 2 * padY, by0 = -bh / 2;
        // Render the pill FLAT — strip any inherited glow filter / drop-shadow so the box
        // itself doesn't get a halo (the text below keeps its effects).
        const prevFill = ctx.fillStyle, prevFilter = ctx.filter, prevShadow = ctx.shadowColor, prevBlur = ctx.shadowBlur;
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.filter = 'none'; ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
        ctx.beginPath();
        const r = Math.min(fs * 0.25, bh / 2, bw / 2);
        if (ctx.roundRect) ctx.roundRect(bx0, by0, bw, bh, r); else ctx.rect(bx0, by0, bw, bh);
        ctx.fill();
        ctx.fillStyle = prevFill; ctx.filter = prevFilter; ctx.shadowColor = prevShadow; ctx.shadowBlur = prevBlur;
      }
      if (FM.textHasAnim(layer)) {
        drawAnimatedText(ctx, layer, t, lines, lh, total);
      } else {
        const stk = layer.stroke;
        const drawStroke = stk && stk.enabled && stk.width > 0;
        if (FM.layerHasGradient(layer)) {
          const fs = layer.fontSize || 96, align = layer.align || 'center';
          let maxW = 1; lines.forEach(l => { maxW = Math.max(maxW, ctx.measureText(l).width); });
          const bx = align === 'center' ? -maxW / 2 : align === 'right' ? -maxW : 0;
          ctx.fillStyle = buildGradient(ctx, layer.fillGradient, { x: bx, y: -(total + fs) / 2, w: maxW, h: total + fs }, t);
        }
        const curve = layer.textCurve || 0;
        if (Math.abs(curve) > 0.5) drawArcLine(ctx, lines.join(' '), layer, curve, drawStroke);   // text on a curve
        else lines.forEach((line, i) => {
          const yy = i * lh - total / 2;
          if (drawStroke) {
            // strokeText centres the line on the glyph edge (half is hidden by the fill drawn on
            // top), so double the width → the visible OUTSIDE outline ≈ stk.width, matching AM.
            ctx.save();
            ctx.lineJoin = 'round'; ctx.miterLimit = 2;
            ctx.lineWidth = stk.width * 2; ctx.strokeStyle = stk.color || '#000';
            ctx.strokeText(line, 0, yy);
            ctx.restore();
          }
          ctx.fillText(line, 0, yy);
        });
      }
    } else if (layer.type === 'shape') {
      const sw = layer.shapeW || 400, sh = layer.shapeH || 300;
      const ox = -sw * tr.anchorX, oy = -sh * tr.anchorY;   // top-left of the shape box (anchor-relative)
      const stk = layer.stroke;
      const mode = FM.traceShapePath(ctx, layer, ox, oy, sw, sh);
      if (mode === 'stroke') {   // open kinds (line / arc) are stroked, never filled — Color & Fill IS the line colour
        ctx.lineWidth = (stk && stk.width) ? stk.width : 8;
        ctx.strokeStyle = (stk && stk.enabled && stk.color) ? stk.color : (FM.evalProp(layer.fill, t) || '#ffffff');
        ctx.lineCap = 'round'; ctx.stroke();
      } else {
        paintFillInPath(ctx, layer, t, ox, oy, sw, sh);
        if (stk && stk.enabled && stk.width > 0) { ctx.lineWidth = stk.width; ctx.strokeStyle = stk.color || '#fff'; ctx.lineJoin = 'round'; ctx.stroke(); }
      }
    } else {
      const m = FM.media.get(layer.id);
      if (m && m.el) {
        const w = m.width, h = m.height;
        // Fill OVERRIDE (AM): a solid/gradient/media fill on a video or image layer fully replaces
        // its pixels with that fill over the clip's bounds. 'media' with no picture chosen yet keeps
        // showing the original clip, and audio-only clips (0×0) can't be filled.
        const fmode = FM.fillModeOf(layer);
        if (fmode !== 'none' && !(fmode === 'media' && !layer.fillImage) && w > 0 && h > 0) {
          const fx0 = -w * tr.anchorX, fy0 = -h * tr.anchorY;
          ctx.beginPath(); ctx.rect(fx0, fy0, w, h);
          paintFillInPath(ctx, layer, t, fx0, fy0, w, h);
          ctx.restore();
          return;
        }
        let src = null;
        // Render from the pre-decoded frame cache: reversed clips always; forward clips when
        // frame-blend slow-mo is on. With frame-blend + speed<1 we cross-dissolve the two
        // nearest source frames so slow motion looks smooth instead of stuttering on dupes.
        const slow = (layer.speed || 1) < 1;
        if (m.frameCache && m.frameCache.count && (layer.reversed || (layer.frameBlend && slow))) {
          const local = FM.layerLocalTime(layer, t);
          if (local != null) {
            const fc = m.frameCache, fpos = local * (fc.effFps || fc.fps);   // effFps spans the whole clip even past the 900-frame cap
            if (layer.frameBlend && slow && fc.count > 1) {
              let i0 = Math.floor(fpos); i0 = i0 < 0 ? 0 : i0 >= fc.count ? fc.count - 1 : i0;
              const i1 = Math.min(i0 + 1, fc.count - 1);
              const frac = Math.max(0, Math.min(1, fpos - Math.floor(fpos)));
              const a = fc.frames[i0], b = fc.frames[i1];
              src = (a && b && i1 !== i0 && frac > 0.001) ? blendFrames(a, b, frac, w, h) : (a || b || null);
            } else {
              let idx = Math.round(fpos);
              idx = idx < 0 ? 0 : idx >= fc.count ? fc.count - 1 : idx;
              src = fc.frames[idx] || null;
            }
          }
        }
        if (!src) {
          if (m.kind === 'video' && m.el.readyState < 2) {
            // Mid-seek (scrubbing/scrolling the timeline re-seeks the element on every step): the new
            // frame isn't decoded yet. In PREVIEW, hold the last good frame so the clip doesn't VANISH to
            // black for the whole scroll. In EXPORT, never substitute a stale frame — keep the original
            // skip so a slow seek can't bake the wrong frame into the output. (#13)
            if (!FM._exporting && m._lastFrame && m._lastFrame.width) src = m._lastFrame;
            else { ctx.restore(); return; }   // never produced a frame yet (still loading) / exporting
          } else {
            src = m.el;
            // Stash this good frame so the next mid-seek dip can hold it (forward clips only; preview
            // only — capturing every export frame is pure churn the exporter never uses). (#22)
            if (!FM._exporting && m.kind === 'video' && w > 0 && h > 0) {
              if (!m._lastFrame) m._lastFrame = document.createElement('canvas');
              if (m._lastFrame.width !== w || m._lastFrame.height !== h) { m._lastFrame.width = w; m._lastFrame.height = h; }
              try { const lx = m._lastFrame.getContext('2d'); lx.clearRect(0, 0, w, h); lx.drawImage(m.el, 0, 0, w, h); } catch (e) {}
            }
          }
        }
        // Lift/Gamma/Gain grade is a per-pixel color op → apply to the source first.
        const cg = layer.colorGrade;
        if (cg && src && ((cg.lift || 0) !== 0 || (cg.gamma || 1) !== 1 || (cg.gain != null ? cg.gain : 1) !== 1)) {
          src = gradeCanvas(src, w, h, cg.lift || 0, cg.gamma || 1, cg.gain != null ? cg.gain : 1);
        }
        // Color FX (ctx.filter) must run on the SOURCE before keying, else a blur halos the
        // keyed alpha edges. So when a key is present, bake the filter into the key offscreen
        // and clear ctx.filter for the final composite.
        const ck = layer.effects && layer.effects.find(e => e.type === 'chromakey' && e.enabled !== false);
        const lk = layer.effects && layer.effects.find(e => e.type === 'lumakey' && e.enabled !== false);
        let keyed = false;
        if (ck && src) {
          const p = ck.params || {};
          src = chromaKey(src, w, h, p.color || '#00ff00', p.tolerance != null ? p.tolerance : 0.3, ctx.filter); keyed = true;
        }
        if (lk && src) {
          const p = lk.params || {};
          src = lumaKey(src, w, h, p.threshold != null ? p.threshold : 0.25, keyed ? 'none' : ctx.filter); keyed = true;
        }
        if (keyed) ctx.filter = 'none';                   // filter already applied to the keyed source
        try {
          ctx.drawImage(src, -w * tr.anchorX, -h * tr.anchorY, w, h);
        } catch (e) { /* frame not ready */ }
        // vignette: radial darkening over the clip's bounds (not a CSS filter)
        const vig = layer.effects && layer.effects.find(e => e.type === 'vignette' && e.enabled !== false);
        if (vig) {
          const amt = clamp01(vig.params && vig.params.amount != null ? FM.evalProp(vig.params.amount, t) : 0.6);
          // Darken as a flat source-over overlay regardless of the layer's blend mode/opacity.
          ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
          const gx = -w * tr.anchorX + w / 2, gy = -h * tr.anchorY + h / 2, rad = Math.hypot(w, h) / 2;
          const grad = ctx.createRadialGradient(gx, gy, rad * 0.45, gx, gy, rad);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,' + amt + ')');
          ctx.fillStyle = grad;
          ctx.fillRect(-w * tr.anchorX, -h * tr.anchorY, w, h);
        }
      }
    }
    ctx.restore();
  }

  /* Render the whole scene at time t. Layers[0] is the TOP layer (drawn last). */
  // Adjustment layer: grade/filter everything already drawn beneath it (CSS-filter effects).
  let _adjCv = null, _adjTmp = null;
  // Per-pixel post-fx that an adjustment layer can also apply to everything beneath it (matching
  // the layer-level draw* math exactly). Geometric post-fx (pixelate/mirror/rgbsplit) aren't done
  // here — they need a geometry pass, so they only apply per-layer for now.
  const PIXEL_ADJ = { posterize: 1, tint: 1, threshold: 1, duotone: 1, rgbsplit: 1 };
  function applyPixelFx(d, fx, t, W, H) {
    const p = fx.params || {};
    if (fx.type === 'rgbsplit') {
      const dd = Math.round(FM.evalProp(p.amount, t) || 0);
      if (dd > 0 && W && H) {
        const src = d.slice();   // shift the RED channel +dd and BLUE −dd, sampling the original
        for (let y = 0; y < H; y++) {
          const row = y * W;
          for (let x = 0; x < W; x++) {
            const i = (row + x) * 4;
            d[i] = src[(row + Math.min(W - 1, x + dd)) * 4];
            d[i + 2] = src[(row + Math.max(0, x - dd)) * 4 + 2];
          }
        }
      }
      return;
    }
    if (fx.type === 'posterize') {
      const q = Math.max(2, Math.round(FM.evalProp(p.levels, t) || 5)), step = 255 / (q - 1);
      for (let i = 0; i < d.length; i += 4) { d[i] = Math.round(Math.round(d[i] / step) * step); d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step); d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step); }
    } else if (fx.type === 'threshold') {
      const cut = clamp01(FM.evalProp(p.level, t)) * 255;
      for (let i = 0; i < d.length; i += 4) { const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) >= cut ? 255 : 0; d[i] = v; d[i + 1] = v; d[i + 2] = v; }
    } else if (fx.type === 'tint') {
      const am = clamp01(FM.evalProp(p.amount, t)), C = hexToRGB(p.color || '#ff3366');
      for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255; d[i] += (l * C[0] - d[i]) * am; d[i + 1] += (l * C[1] - d[i + 1]) * am; d[i + 2] += (l * C[2] - d[i + 2]) * am; }
    } else if (fx.type === 'duotone') {
      const am = clamp01(FM.evalProp(p.amount, t)), A = hexToRGB(p.color || '#241a52'), B = hexToRGB(p.color2 || '#ff9e5e');
      for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255; d[i] += ((A[0] + (B[0] - A[0]) * l) - d[i]) * am; d[i + 1] += ((A[1] + (B[1] - A[1]) * l) - d[i + 1]) * am; d[i + 2] += ((A[2] + (B[2] - A[2]) * l) - d[i + 2]) * am; }
    }
  }
  function applyAdjustment(ctx, layer, t, scene) {
    const filter = effectFilter(layer, t), hasCss = filter && filter !== 'none';
    const ppfx = (layer.effects || []).filter(e => PIXEL_ADJ[e.type] && e.enabled !== false);
    const pixFx = (layer.effects || []).find(e => e.type === 'pixelate' && e.enabled !== false);
    if (!hasCss && !ppfx.length && !pixFx) return;
    const opacity = clamp01(FM.evalProp(layer.transform.opacity, t));
    if (opacity <= 0) return;
    const P = scene.project, W = P.width, H = P.height;
    if (!_adjCv) _adjCv = document.createElement('canvas');
    _adjCv.width = W; _adjCv.height = H;
    const a = _adjCv.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W, H); a.globalAlpha = 1; a.filter = 'none';
    a.drawImage(ctx.canvas, 0, 0);                 // snapshot current frame (background + layers below)
    if (ppfx.length) {                             // per-pixel post-fx grade the whole snapshot, in stack order
      const img = a.getImageData(0, 0, W, H), d = img.data;
      ppfx.forEach(fx => applyPixelFx(d, fx, t, W, H));
      a.putImageData(img, 0, 0);
    }
    if (pixFx) {                                   // pixelate the whole scene below (down- then up-scale the snapshot)
      const size = Math.max(1, Math.round(FM.evalProp((pixFx.params || {}).size, t) || 1));
      if (size > 1) {
        const sw = Math.max(1, Math.round(W / size)), sh = Math.max(1, Math.round(H / size));
        if (!_adjTmp) _adjTmp = document.createElement('canvas');
        _adjTmp.width = sw; _adjTmp.height = sh;
        const tctx = _adjTmp.getContext('2d');
        tctx.clearRect(0, 0, sw, sh); tctx.imageSmoothingEnabled = true;
        tctx.drawImage(_adjCv, 0, 0, sw, sh);              // downscale (block-average)
        a.imageSmoothingEnabled = false; a.clearRect(0, 0, W, H);
        a.drawImage(_adjTmp, 0, 0, sw, sh, 0, 0, W, H);    // upscale → blocky
        a.imageSmoothingEnabled = true;
      }
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = hasCss ? filter : 'none';
    ctx.drawImage(_adjCv, 0, 0);                    // (optionally CSS-filtered) graded snapshot, blended by opacity
    ctx.restore();
  }
  // When a camera layer is active, the whole scene is drawn to this offscreen first, then composited
  // onto the real canvas through the camera's (inverse) transform — so EVERY layer, including
  // post-fx / motion-blur / masked ones, is panned & zoomed uniformly.
  let _camCv = null;
  // ---- group units: a group with anything VISUAL of its own (masking, effects, opacity, blend,
  // shadow) is composited as ONE flattened unit, so all 152 effects / blending / presets act on the
  // group exactly like on a single layer. Plain transform-only groups keep the cheap per-member path.
  function groupNeedsUnit(g, t) {
    if (g.maskGroup) return true;
    if (g.fillMode && g.fillMode !== 'none') return true;   // fill recolours the flattened silhouette
    if (g.effects && g.effects.some(e => e.enabled !== false)) return true;
    if (g.blendMode && g.blendMode !== 'normal') return true;
    if (g.shadow && g.shadow.enabled) return true;
    if (g.stroke && g.stroke.enabled && g.stroke.width > 0) return true;   // border around the silhouette
    const cg = g.colorGrade;
    if (cg && ((cg.hue || 0) !== 0 || (cg.sat != null && Math.abs(cg.sat - 1) > 1e-3) || (cg.lift || 0) !== 0 || (cg.gamma != null && Math.abs(cg.gamma - 1) > 1e-3) || (cg.gain != null && Math.abs(cg.gain - 1) > 1e-3))) return true;
    const op = g.transform ? FM.evalProp(g.transform.opacity, t) : 1;
    if (op < 0.999 || (FM.isAnimated && FM.isAnimated(g.transform && g.transform.opacity))) return true;
    return false;
  }
  function collectGroupUnits(scene, t) {
    let map = null;
    for (const g of scene.layers) {
      if (g.type !== 'group' || !g.visible || !groupNeedsUnit(g, t)) continue;
      const members = [];
      (function walk(gid) {
        scene.layers.forEach(l => { if (l.parent === gid) { members.push(l); if (l.type === 'group') walk(l.id); } });
      })(g.id);
      const drawable = members.filter(l => l.type !== 'group' && l.type !== 'camera' && l.type !== 'adjustment' && l.type !== 'null');
      if (!drawable.length) continue;
      // masking needs a mask + at least one clipped member; effects-only units work from 1 member
      let maskId = null;
      if (g.maskGroup && drawable.length >= 2) {
        let mask = drawable[0], mi = scene.layers.indexOf(drawable[0]);
        drawable.forEach(l => { const idx = scene.layers.indexOf(l); if (idx < mi) { mi = idx; mask = l; } });
        maskId = mask.id;
      }
      const unit = { group: g, memberIds: new Set(members.map(l => l.id)), maskId: maskId, drawn: false };
      map = map || {};
      unit.memberIds.forEach(id => { if (!map[id]) map[id] = unit; });   // nearest-first: an outer unit wins over a nested one
    }
    return map;
  }
  let _mgA = null, _mgB = null;
  function drawGroupUnit(ctx, u, t, scene) {
    const P = scene.project;
    if (!_mgA) _mgA = document.createElement('canvas');
    if (!_mgB) _mgB = document.createElement('canvas');
    _mgA.width = P.width; _mgA.height = P.height;
    _mgB.width = P.width; _mgB.height = P.height;
    const a = _mgA.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, P.width, P.height);
    a.globalAlpha = 1; a.globalCompositeOperation = 'source-over'; a.filter = 'none';
    for (let i = scene.layers.length - 1; i >= 0; i--) {   // members bottom→top, minus the mask itself
      const L = scene.layers[i];
      if (!u.memberIds.has(L.id) || L.id === u.maskId || L.type === 'group') continue;
      drawLayer(a, L, t, scene);
    }
    const maskLayer = u.maskId ? scene.layers.find(l => l.id === u.maskId) : null;
    if (maskLayer && FM.isLayerVisibleAt(maskLayer, t)) {   // hidden mask → members show unclipped
      const b = _mgB.getContext('2d');
      b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, P.width, P.height);
      b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.filter = 'none';
      drawLayer(b, maskLayer, t, scene);
      a.globalCompositeOperation = 'destination-in';
      a.drawImage(_mgB, 0, 0);
      a.globalCompositeOperation = 'source-over';
    }
    // Hand the flattened unit back through drawLayer as a '_flat' proxy carrying the GROUP's own
    // effects/opacity/blend/shadow — the entire effect pipeline (CSS filters, pixel, warp, canvas/3D)
    // then applies to the group exactly as it would to a single layer.
    const g = u.group;
    // Group FILL: recolour the flattened silhouette (source-atop) with the group's solid/gradient/
    // media fill — same behaviour as a fill on a single layer, applied to the whole unit.
    const gFill = FM.fillModeOf(g);
    if (gFill !== 'none' && !(gFill === 'media' && !g.fillImage)) {
      a.save();
      a.globalCompositeOperation = 'source-atop';   // paintFillInPath handles fillOpacity itself
      a.beginPath(); a.rect(0, 0, P.width, P.height);
      paintFillInPath(a, g, t, 0, 0, P.width, P.height);
      a.restore();
    }
    _mgA._fmGen = ++_gen;   // unit pixels change every frame — key downstream memos (gradeCanvas) off a generation
    const tmp = FM.makeLayer('_flat', { name: g.name, x: 0, y: 0 });
    tmp._canvas = _mgA;
    tmp.start = t - 1; tmp.duration = 2;   // always inside its window at time t
    tmp.effects = g.effects || [];
    // group BORDER = the existing alpha-outline 'stroke' effect run on the flattened unit
    if (g.stroke && g.stroke.enabled && g.stroke.width > 0) {
      tmp.effects = tmp.effects.concat([{ type: 'stroke', enabled: true, params: { width: g.stroke.width, color: g.stroke.color || '#ffffff' } }]);
    }
    tmp.blendMode = g.blendMode || 'normal';
    if (g.shadow) tmp.shadow = g.shadow;
    if (g.colorGrade && gFill === 'none') tmp.colorGrade = g.colorGrade;   // grade never shifts a picked fill colour
    tmp.transform.anchorX = 0; tmp.transform.anchorY = 0;
    tmp.transform.opacity = (g.transform && g.transform.opacity != null) ? g.transform.opacity : 1;
    drawLayer(ctx, tmp, t, scene);
  }

  FM.renderScene = function (ctx, scene, t) {
    const P = scene.project;
    const cam = scene.layers.find(l => l.type === 'camera' && l.visible !== false && FM.isLayerVisibleAt(l, t));
    let target = ctx;
    if (cam) {
      if (!_camCv) _camCv = document.createElement('canvas');
      _camCv.width = P.width; _camCv.height = P.height;
      target = _camCv.getContext('2d');
    }
    target.save();
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.clearRect(0, 0, P.width, P.height);
    if (!cam && P.background) {   // with a camera, the bg is painted on the real canvas so it stays fixed
      target.fillStyle = P.background;
      target.fillRect(0, 0, P.width, P.height);
    }
    // GROUP units (masking / effects / opacity / blend): members composite as ONE flattened unit,
    // drawn at the z-slot of the group's bottom-most member so stacking stays correct.
    const memberToUnit = collectGroupUnits(scene, t);
    const soloActive = scene.layers.some(l => l.solo);   // if any layer is soloed, only draw soloed ones
    for (let i = scene.layers.length - 1; i >= 0; i--) {
      const L = scene.layers[i];
      if (soloActive && !L.solo) continue;
      if (L.type === 'camera') continue;   // the camera drives the composite; it is never rasterized
      const unit = memberToUnit && memberToUnit[L.id];
      if (unit) { if (!unit.drawn) { unit.drawn = true; drawGroupUnit(target, unit, t, scene); } continue; }
      if (L.type === 'adjustment') { if (FM.isLayerVisibleAt(L, t)) applyAdjustment(target, L, t, scene); }
      else drawLayer(target, L, t, scene);
    }
    target.restore();
    if (cam) {
      const cx = P.width / 2, cy = P.height / 2, tr = cam.transform;
      const zoom = Math.max(1e-3, FM.evalProp(tr.scale, t) || 1);   // clamp so an overshoot/negative camera scale can't mirror or collapse the whole scene (#10)
      const camX = FM.evalProp(tr.x, t), camY = FM.evalProp(tr.y, t);
      const rot = (FM.evalProp(tr.rotation, t) || 0) * Math.PI / 180;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, P.width, P.height);
      if (P.background) { ctx.fillStyle = P.background; ctx.fillRect(0, 0, P.width, P.height); }
      ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.rotate(rot); ctx.translate(-camX, -camY);
      ctx.drawImage(_camCv, 0, 0);   // camX,camY (scene point) lands at screen centre, scaled by zoom
      ctx.restore();
    }
  };

  /* Draw a small fitted thumbnail of one layer's content into a canvas (layer list + timeline). */
  // Unscaled intrinsic size of a layer's content (text measured, media natural, null/fallback 100).
  FM.layerSize = function (layer) {
    if (layer.type === 'text') {
      const c = document.createElement('canvas').getContext('2d');
      c.font = (layer.italic ? 'italic ' : '') + (layer.bold ? '700 ' : '') + (layer.fontSize || 96) + 'px ' + (layer.fontFamily || 'sans-serif');
      // A caption track sets layer.text='' and moves the visible text into layer.captions, so measuring
      // layer.text alone gives a 10px box that the hit-test/selection/align all read wrong. Measure the
      // widest caption (and its line count) instead, falling back to layer.text when there are none. (#4)
      const strs = (layer.captions && layer.captions.length) ? layer.captions.map(cap => cap.text || '') : [layer.text || ''];
      let w = 10, maxLines = 1;
      strs.forEach(s => { const lines = String(s).split('\n'); maxLines = Math.max(maxLines, lines.length); lines.forEach(l => { w = Math.max(w, c.measureText(l).width); }); });
      return { w: w, h: Math.max(10, maxLines * (layer.fontSize || 96) * (layer.lineHeight || 1.15)) };
    }
    if (layer.type === 'null') return { w: 100, h: 100 };
    if (layer.type === 'shape') return { w: layer.shapeW || 400, h: layer.shapeH || 300 };
    const m = FM.media.get(layer.id);
    return { w: m ? m.width : 100, h: m ? m.height : 100 };
  };

  // Approximate world bbox of a group's members (ignores rotations — good enough for the canvas
  // selection box + hit-test, which previously showed a meaningless 100px box at the group's 0,0).
  FM.groupBounds = function (group, scene, t) {
    const gx = FM.evalProp(group.transform.x, t) || 0, gy = FM.evalProp(group.transform.y, t) || 0;
    const gs = FM.evalProp(group.transform.scale, t) || 1;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, any = false;
    (function walk(gid, ox, oy) {
      scene.layers.forEach(l => {
        if (l.parent !== gid) return;
        if (l.type === 'group') { walk(l.id, ox + (FM.evalProp(l.transform.x, t) || 0), oy + (FM.evalProp(l.transform.y, t) || 0)); return; }
        if (l.type === 'camera' || l.type === 'adjustment' || l.type === 'null') return;
        if (!FM.isLayerVisibleAt(l, t)) return;
        const s = FM.layerSize(l);
        const sc = FM.evalProp(l.transform.scale, t) || 1;
        const x = ox + FM.evalProp(l.transform.x, t), y = oy + FM.evalProp(l.transform.y, t);
        const w = s.w * sc / 2, h = s.h * sc / 2;
        any = true;
        minX = Math.min(minX, x - w); maxX = Math.max(maxX, x + w);
        minY = Math.min(minY, y - h); maxY = Math.max(maxY, y + h);
      });
    })(group.id, 0, 0);
    if (!any) return null;
    return { x: gx + ((minX + maxX) / 2) * gs, y: gy + ((minY + maxY) / 2) * gs, w: (maxX - minX) * gs, h: (maxY - minY) * gs };
  };

  FM.renderThumb = function (layer, canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, W, H);
    if (layer.type === 'text') {
      ctx.fillStyle = layer.color || '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(H * 0.56) + 'px sans-serif';
      ctx.fillText('T', W / 2, H / 2 + 1);
      return;
    }
    if (layer.type === 'null') {
      ctx.strokeStyle = '#8b9bb4'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W / 2, 3); ctx.lineTo(W / 2, H - 3);
      ctx.moveTo(5, H / 2); ctx.lineTo(W - 5, H / 2);
      ctx.stroke();
      ctx.strokeRect(W / 2 - 5, H / 2 - 5, 10, 10);
      return;
    }
    if (layer.type === 'group') {   // folder glyph
      ctx.strokeStyle = '#9aa7bd'; ctx.lineWidth = 1.6;
      const fw = W * 0.6, fh = H * 0.52, fx = (W - fw) / 2, fy = (H - fh) / 2 + 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy); ctx.lineTo(fx + fw * 0.36, fy); ctx.lineTo(fx + fw * 0.48, fy + fh * 0.24); ctx.lineTo(fx + fw, fy + fh * 0.24);
      ctx.lineTo(fx + fw, fy + fh); ctx.lineTo(fx, fy + fh); ctx.closePath(); ctx.stroke();
      return;
    }
    if (layer.type === 'adjustment') {
      ctx.fillStyle = '#9aa7bd'; ctx.strokeStyle = '#9aa7bd'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - 4, -Math.PI / 2, Math.PI / 2); ctx.fill();   // half-filled circle
      ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - 4, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    if (layer.type === 'camera') {
      ctx.strokeStyle = '#9aa7bd'; ctx.fillStyle = '#9aa7bd'; ctx.lineWidth = 1.5;
      const bw = W * 0.42, bh = H * 0.34, bx = W / 2 - bw / 2, by = H / 2 - bh / 2;
      ctx.strokeRect(bx, by, bw, bh);                                   // camera body
      ctx.beginPath(); ctx.moveTo(bx + bw, H / 2 - bh * 0.28); ctx.lineTo(bx + bw + bw * 0.4, H / 2 - bh * 0.5); ctx.lineTo(bx + bw + bw * 0.4, H / 2 + bh * 0.5); ctx.lineTo(bx + bw, H / 2 + bh * 0.28); ctx.closePath(); ctx.fill();   // lens horn
      return;
    }
    if (layer.type === 'shape') {
      const pad = 6, iw = W - 2 * pad, ih = H - 2 * pad;
      const mode = FM.traceShapePath(ctx, layer, pad, pad, iw, ih);
      if (mode === 'stroke') { ctx.strokeStyle = FM.evalProp(layer.fill, FM.time || 0) || '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(); return; }
      const fmode = FM.fillModeOf(layer);
      if (fmode === 'none') { ctx.strokeStyle = FM.evalProp(layer.fill, FM.time || 0) || '#8b9bb4'; ctx.lineWidth = 2; ctx.stroke(); return; }
      if (fmode === 'media') {
        const fimg = getFillImage(layer);
        if (fimg && fimg.width) {
          ctx.save(); ctx.clip();
          const sc = Math.max(iw / fimg.width, ih / fimg.height), dw = fimg.width * sc, dh = fimg.height * sc;
          try { ctx.drawImage(fimg, pad + (iw - dw) / 2, pad + (ih - dh) / 2, dw, dh); } catch (e) {}
          ctx.restore(); return;
        }
      }
      ctx.fillStyle = (fmode === 'gradient' && layer.fillGradient) ? buildGradient(ctx, layer.fillGradient, { x: pad, y: pad, w: iw, h: ih }, FM.time || 0) : (FM.evalProp(layer.fill, FM.time || 0) || '#3a7bd5');
      ctx.fill();
      return;
    }
    const m = FM.media.get(layer.id);
    if (m && m.el) {
      // audio-only clips (mp3/wav ride the pictureless-video path, 0×0 picture) — music note, not a blank
      if (m.kind === 'video' && (!m.width || !m.height)) {
        ctx.strokeStyle = '#b39ddb'; ctx.fillStyle = '#b39ddb'; ctx.lineWidth = 1.6;
        const nx = W / 2 + 3, ny = H / 2 + 4;
        ctx.beginPath(); ctx.ellipse(nx - 5, ny + 3, 3.4, 2.6, -0.35, 0, Math.PI * 2); ctx.fill();   // note head
        ctx.beginPath(); ctx.moveTo(nx - 2, ny + 2); ctx.lineTo(nx - 2, ny - 9); ctx.stroke();       // stem
        ctx.beginPath(); ctx.moveTo(nx - 2, ny - 9); ctx.quadraticCurveTo(nx + 4, ny - 8, nx + 4, ny - 3); ctx.stroke();   // flag
        return;
      }
      if (m.kind === 'video' && m.el.readyState < 2) return;
      const mw = m.width || 1, mh = m.height || 1;
      const fit = Math.min(W / mw, H / mh);
      const dw = mw * fit, dh = mh * fit;
      try { ctx.drawImage(m.el, (W - dw) / 2, (H - dh) / 2, dw, dh); } catch (e) {}
    }
  };
})(window.FM);
