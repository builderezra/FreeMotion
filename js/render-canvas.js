/* Shared canvas allocation for preview and export-worker rendering. */
(function (root) {
  'use strict';
  const FM = root.FM = root.FM || {};
  FM.createRenderCanvas = function (width = 300, height = 150) {
    if (root.document && typeof root.document.createElement === 'function') {
      const canvas = root.document.createElement('canvas');
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      return canvas;
    }
    if (typeof root.OffscreenCanvas === 'function') return new root.OffscreenCanvas(width, height);
    throw new Error('This environment cannot create a render canvas');
  };
})(globalThis);
