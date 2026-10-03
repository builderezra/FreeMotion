// Lightweight environment controls. Pixel parity is tested separately in worker-canvas.html.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/render-canvas.js'), 'utf8');
let resets = 0;
const page = {
  document: { createElement(type) {
    assert.equal(type, 'canvas');
    let w = 300, h = 150;
    return { get width() { return w; }, set width(v) { w = v; resets++; },
      get height() { return h; }, set height(v) { h = v; resets++; } };
  } },
  OffscreenCanvas: class { constructor() { throw new Error('Page must retain its DOM backend'); } }
};
vm.runInNewContext(source, page);
page.FM.createRenderCanvas();
assert.equal(resets, 0, 'default allocation must not reset an already-correct canvas');
const resized = page.FM.createRenderCanvas(64, 32);
assert.equal(resized.width, 64); assert.equal(resized.height, 32); assert.equal(resets, 2);
const worker = { OffscreenCanvas: class { constructor(w, h) { this.width=w; this.height=h; } } };
vm.runInNewContext(source, worker);
const offscreen = worker.FM.createRenderCanvas(123, 77);
assert(offscreen instanceof worker.OffscreenCanvas);
assert.equal(offscreen.width, 123); assert.equal(offscreen.height, 77);
assert.equal('document' in worker, false); assert.equal('window' in worker, false);
const unsupported = {};
vm.runInNewContext(source, unsupported);
assert.throws(() => unsupported.FM.createRenderCanvas(), /cannot create a render canvas/);
// Loading the REAL shared modules must not require a fabricated window/document.
const context = vm.createContext(worker);
for (const name of ['scene.js', 'compositor.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', name), 'utf8'), context, {filename:name});
}
assert.equal(typeof context.FM.renderScene, 'function');
assert.equal(typeof context.FM.newScene, 'function');
console.log('PASS: DOM allocation, worker allocation, failure control, and real module loading without window/document.');
