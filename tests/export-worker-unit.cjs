// Worker client protocol and fallback controls; actual rendering parity lives in worker-canvas.html.
// Run: node --test tests/export-worker-unit.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const sources = Object.fromEntries(['render-canvas.js', 'scene.js', 'eases.js', 'compositor.js', 'fx-registry.js', 'export-worker.js']
  .map(name => [name, fs.readFileSync(path.join(root, 'js', name), 'utf8')]));
const dependencyNames = ['render-canvas.js', 'scene.js', 'eases.js', 'compositor.js', 'fx-registry.js'];

function harness(options = {}) {
  const workers = [], timers = new Map();
  let timerID = 0;
  const entry = options.entry === undefined ? 'https://test.invalid/js/export-worker.js?v=1' : options.entry;
  const urls = dependencyNames.map(name => `https://test.invalid/js/${name}?v=${options.assetVersion || '1'}`);
  class FakeWorker {
    constructor(url) {
      if (options.constructorError) throw new Error('constructor blocked');
      this.url = url; this.messages = []; this.terminations = 0;
      workers.push(this);
    }
    postMessage(msg) {
      this.messages.push(msg);
      if (options.postError) throw new Error('post failed');
    }
    terminate() { this.terminations++; }
    reply(data) { this.onmessage({data}); }
    fail(message = 'worker crashed') {
      let prevented = 0;
      this.onerror({message, preventDefault() { prevented++; }});
      assert.equal(prevented, 1);
    }
  }
  const sandbox = {
    URL, console, performance,
    document: {
      currentScript: entry ? {src:entry} : null,
      querySelectorAll() { return (options.missingDependency ? urls.slice(1) : urls).map(src => ({src})); },
      createElement() {
        return {width:300, height:150, getContext() {
          if (options.noPageContext) return null;
          return options.roundRect === false ? {} : {roundRect() {}};
        }};
      }
    },
    Worker: options.noWorker ? undefined : FakeWorker,
    OffscreenCanvas: options.noOffscreen ? undefined : class {},
    setTimeout(fn, ms) { const id = ++timerID; timers.set(id, {kind:'timeout', fn, ms}); return id; },
    setInterval(fn, ms) { const id = ++timerID; timers.set(id, {kind:'interval', fn, ms}); return id; },
    clearTimeout(id) { timers.delete(id); },
    clearInterval(id) { timers.delete(id); }
  };
  const context = vm.createContext(sandbox);
  for (const name of ['render-canvas.js', 'scene.js', 'eases.js', 'compositor.js', 'fx-registry.js', 'export-worker.js']) {
    vm.runInContext(sources[name], context, {filename:name});
  }
  const FM = context.FM;
  // Native filtering is a browser pixel capability; control its answer for client routing tests.
  let filterCalls = 0;
  FM.ctxFilterOK = () => { filterCalls++; return options.filterOK !== false; };
  function scene() {
    return {
      project: {name:'Worker unit fixture', width:64, height:32, fps:30, duration:2, background:'#102030'},
      layers: [FM.makeLayer('shape', {shape:'rect', shapeW:24, shapeH:16, fill:'#ff3366'})]
    };
  }
  function fire(kind) {
    const items = Array.from(timers.values()).filter(t => t.kind === kind);
    assert.equal(items.length, 1, `expected one ${kind}`);
    items[0].fn();
  }
  return {FM, workers, timers, entry, urls, scene, fire, get filterCalls() { return filterCalls; }};
}
function bitmap(width = 64, height = 32) {
  return {width, height, closes:0, close() { this.closes++; }};
}
function target(options = {}) {
  const calls = [];
  return {
    calls, canvas:{width:64, height:32},
    save() { calls.push(['save']); }, restore() { calls.push(['restore']); },
    setTransform(...args) { calls.push(['setTransform', ...args]); },
    clearRect(...args) { calls.push(['clearRect', ...args]); },
    drawImage(...args) { calls.push(['drawImage', ...args]); if (options.drawError) throw new Error('draw failed'); }
  };
}
async function ready(h, options = {}) {
  const promise = h.FM.exportWorker.create(h.scene(), options);
  assert.equal(h.workers.length, 1);
  const worker = h.workers[0];
  assert.equal(worker.messages[0].type, 'init');
  worker.reply({id:worker.messages[0].id, ready:true});
  const renderer = await promise;
  assert(renderer);
  assert.equal(h.timers.size, 0);
  return {renderer, worker};
}
function latestID(worker) { return worker.messages[worker.messages.length - 1].id; }

for (const [name, options] of Object.entries({
  'missing Worker':{noWorker:true}, 'missing OffscreenCanvas':{noOffscreen:true},
  'missing entry URL':{entry:null}, 'missing dependency':{missingDependency:true},
  'Worker constructor failure':{constructorError:true}
})) {
  test(`${name} selects startup fallback without leaked timers`, async () => {
    const h = harness(options);
    assert.equal(await h.FM.exportWorker.create(h.scene()), null);
    assert.equal(h.workers.length, 0);
    assert.equal(h.timers.size, 0);
  });
}

test('post failure during init falls back and terminates once', async () => {
  const h = harness({postError:true});
  assert.equal(await h.FM.exportWorker.create(h.scene()), null);
  assert.equal(h.workers[0].terminations, 1);
  assert.equal(h.timers.size, 0);
});
for (const kind of ['reply error', 'not ready', 'error event', 'messageerror', 'timeout']) {
  test(`${kind} during init selects fallback and terminates once`, async () => {
    const h = harness();
    const promise = h.FM.exportWorker.create(h.scene());
    const worker = h.workers[0];
    if (kind === 'reply error') worker.reply({id:latestID(worker), error:'init failed'});
    if (kind === 'not ready') worker.reply({id:latestID(worker), ready:false});
    if (kind === 'error event') worker.fail();
    if (kind === 'messageerror') worker.onmessageerror();
    if (kind === 'timeout') h.fire('timeout');
    assert.equal(await promise, null);
    assert.equal(worker.terminations, 1);
    assert.equal(h.timers.size, 0);
  });
}

test('cancel before creating a worker rejects instead of falling back', async () => {
  const h = harness();
  await assert.rejects(h.FM.exportWorker.create(h.scene(), {shouldCancel:() => true}), /CANCELLED/);
  assert.equal(h.workers.length, 0);
});
test('cancel pending initialization rejects and releases the worker', async () => {
  const h = harness();
  let cancelled = false;
  const promise = h.FM.exportWorker.create(h.scene(), {shouldCancel:() => cancelled});
  const rejection = assert.rejects(promise, /CANCELLED/);
  cancelled = true; h.fire('interval');
  await rejection;
  assert.equal(h.workers[0].terminations, 1);
  assert.equal(h.timers.size, 0);
});

test('init snapshots scene without private caches and uses versioned dependency URLs', async () => {
  const h = harness();
  const scene = h.scene();
  const cache = {}; cache.self = cache;
  scene.layers[0]._canvas = cache;
  h.FM._exportTransparent = true;
  const promise = h.FM.exportWorker.create(scene, {time:0.75});
  const worker = h.workers[0], init = worker.messages[0];
  assert.equal(worker.url, h.entry);
  assert.deepEqual(Array.from(init.urls), h.urls);
  assert.equal(init.transparent, true);
  assert.equal(init.time, 0.75);
  assert.equal('_canvas' in init.scene.layers[0], false);
  assert.equal(scene.layers[0]._canvas, cache, 'the page scene must retain its cache');
  init.scene.layers[0].fill = '#000000';
  assert.equal(scene.layers[0].fill, '#ff3366', 'worker snapshot must be detached');
  worker.reply({id:init.id, ready:true});
  (await promise).dispose();
});

test('successful frame resets destination compositing, draws once, and closes bitmap', async () => {
  const h = harness();
  const {renderer, worker} = await ready(h);
  const dest = target(), frame = bitmap();
  const promise = renderer.render(dest, 0.25);
  assert.equal(worker.messages[1].type, 'render');
  assert.equal(worker.messages[1].time, 0.25);
  worker.reply({id:latestID(worker), bitmap:frame});
  await promise;
  assert.deepEqual(dest.calls, [
    ['save'], ['setTransform', 1, 0, 0, 1, 0, 0], ['clearRect', 0, 0, 64, 32],
    ['drawImage', frame, 0, 0], ['restore']
  ]);
  assert.equal(dest.globalAlpha, 1);
  assert.equal(dest.globalCompositeOperation, 'source-over');
  assert.equal(frame.closes, 1);
  assert.equal(worker.terminations, 0);
  assert.equal(h.timers.size, 0);
  renderer.dispose(); renderer.dispose();
  assert.equal(worker.terminations, 1);
});

test('only one frame can be in flight; rejected overlap does not corrupt first frame', async () => {
  const h = harness();
  const {renderer, worker} = await ready(h);
  const first = renderer.render(target(), 0);
  await assert.rejects(renderer.render(target(), 0.1), /already in flight/);
  assert.equal(worker.messages.length, 2);
  const frame = bitmap();
  worker.reply({id:latestID(worker), bitmap:frame});
  await first;
  assert.equal(frame.closes, 1);
  const second = renderer.render(target(), 0.2);
  worker.reply({id:latestID(worker), bitmap:bitmap()});
  await second;
  renderer.dispose();
});

test('mismatched response closes its bitmap without settling the active request', async () => {
  const h = harness();
  const {renderer, worker} = await ready(h);
  const dest = target(), promise = renderer.render(dest, 0), stale = bitmap(), frame = bitmap();
  worker.reply({id:latestID(worker) - 1, bitmap:stale});
  assert.equal(stale.closes, 1);
  assert.equal(dest.calls.length, 0);
  assert.equal(h.timers.size, 2);
  worker.reply({id:latestID(worker), bitmap:frame});
  await promise;
  assert.equal(frame.closes, 1);
  renderer.dispose();
});

test('disposing pending frame rejects it and closes a late bitmap exactly once', async () => {
  const h = harness();
  const {renderer, worker} = await ready(h);
  const promise = renderer.render(target(), 0);
  const rejection = assert.rejects(promise, /Renderer disposed/);
  renderer.dispose(); renderer.dispose();
  await rejection;
  const late = bitmap();
  worker.reply({id:latestID(worker), bitmap:late});
  assert.equal(late.closes, 1);
  assert.equal(worker.terminations, 1);
  assert.equal(h.timers.size, 0);
  await assert.rejects(renderer.render(target(), 1), /Renderer disposed/);
  assert.equal(worker.messages.length, 2);
});
for (const delivery of ['timer', 'reply']) {
  test(`cancel pending frame via ${delivery} rejects and terminates exactly once`, async () => {
    const h = harness();
    let cancelled = false;
    const {renderer, worker} = await ready(h, {shouldCancel:() => cancelled});
    const promise = renderer.render(target(), 0);
    const rejection = assert.rejects(promise, /CANCELLED/);
    cancelled = true;
    const frame = bitmap();
    if (delivery === 'timer') h.fire('interval');
    worker.reply({id:latestID(worker), bitmap:frame});
    await rejection;
    renderer.dispose();
    assert.equal(frame.closes, 1);
    assert.equal(worker.terminations, 1);
    assert.equal(h.timers.size, 0);
  });
}
for (const kind of ['reply error', 'error event', 'messageerror', 'timeout']) {
  test(`${kind} after initialization rejects export instead of changing renderers`, async () => {
    const h = harness();
    const {renderer, worker} = await ready(h);
    const promise = renderer.render(target(), 0.5);
    const rejection = assert.rejects(promise, /frame failed|worker crashed|could not be read|timed out/);
    const errorFrame = bitmap();
    if (kind === 'reply error') worker.reply({id:latestID(worker), error:'frame failed', bitmap:errorFrame});
    if (kind === 'error event') worker.fail();
    if (kind === 'messageerror') worker.onmessageerror();
    if (kind === 'timeout') h.fire('timeout');
    await rejection;
    if (kind === 'reply error') assert.equal(errorFrame.closes, 1);
    assert.equal(worker.terminations, 1);
    assert.equal(h.timers.size, 0);
    await assert.rejects(renderer.render(target(), 1), /Renderer disposed/);
    renderer.dispose();
    assert.equal(worker.terminations, 1);
  });
}
for (const kind of ['missing bitmap', 'wrong dimensions', 'draw failure']) {
  test(`${kind} rejects the frame and releases all owned resources`, async () => {
    const h = harness();
    const {renderer, worker} = await ready(h);
    const dest = target({drawError:kind === 'draw failure'});
    const frame = kind === 'missing bitmap' ? undefined : bitmap(kind === 'wrong dimensions' ? 63 : 64);
    const promise = renderer.render(dest, 0);
    const rejection = assert.rejects(promise, /Invalid export worker frame|draw failed/);
    worker.reply({id:latestID(worker), bitmap:frame});
    await rejection;
    if (frame) assert.equal(frame.closes, 1);
    if (kind === 'draw failure') assert.deepEqual(dest.calls.at(-1), ['restore']);
    assert.equal(worker.terminations, 1);
    assert.equal(h.timers.size, 0);
  });
}

test('resume renderer identity changes for entry and dependency asset versions', async () => {
  const contexts = [harness(), harness({entry:'https://test.invalid/js/export-worker.js?v=2'}), harness({assetVersion:'2'})];
  const instances = await Promise.all(contexts.map(h => ready(h)));
  const ids = instances.map(item => item.renderer.id);
  assert.equal(new Set(ids).size, 3);
  contexts[0].urls.forEach(url => assert(ids[0].includes(url)));
  assert(ids[0].includes(contexts[0].entry));
  instances.forEach(item => item.renderer.dispose());
});

test('default rect/ellipse and linear/radial gradients remain eligible', () => {
  const h = harness();
  const scene = h.scene(), layer = scene.layers[0];
  assert.equal(h.FM.exportWorker.eligible(scene), true);
  layer.shape = 'ellipse';
  assert.equal(h.FM.exportWorker.eligible(scene), true);
  layer.fillMode = 'gradient';
  for (const type of ['linear', 'radial']) {
    layer.fillGradient = {enabled:true, type, c0:'#000000', c1:'#ffffff', angle:25, ox:0.2, oy:-0.1};
    assert.equal(h.FM.exportWorker.eligible(scene), true);
  }
});
const unsupported = {
  'unknown project field': s => { s.project.futureEffect = true; },
  'unknown layer field': s => { s.layers[0].futureEffect = true; },
  'unknown transform field': s => { s.layers[0].transform.futureEffect = true; },
  '3D tilt': s => { s.layers[0].transform.rotationX = 15; },
  'unknown gradient field': s => { Object.assign(s.layers[0], {fillMode:'gradient', fillGradient:{type:'linear', c0:'#000', c1:'#fff', futureEffect:true}}); },
  'angular gradient': s => { Object.assign(s.layers[0], {fillMode:'gradient', fillGradient:{type:'angular', c0:'#000', c1:'#fff'}}); },
  'animated corner radius': s => { s.layers[0].cornerRadius = {kf:[{t:0,v:0},{t:1,v:8}]}; },
  'parent': s => { s.layers[0].parent = 'another-layer'; },
  'enabled wiggle': s => { s.layers[0].wiggle.enabled = true; },
  'unknown stroke parameter': s => { s.layers[0].stroke.futureMode = true; },
  'unsupported effects including disabled': s => { s.layers[0].effects = [{type:'chromakey', enabled:false}]; },
  'behavior': s => { s.layers[0].behaviors = [{type:'bounce'}]; },
  'pen mask': s => { s.layers[0].masks = []; },
  'legacy motion blur': s => { s.layers[0].motionBlur = {enabled:true}; },
  'shadow': s => { s.layers[0].shadow = {enabled:true}; },
  'repeater': s => { s.layers[0].repeater = {enabled:true}; },
  'captions': s => { s.layers[0].captions = []; },
  'media fill': s => { s.layers[0].fillMode = 'media'; },
  'fill image': s => { s.layers[0].fillImage = 'asset'; },
  'unsupported blend mode': s => { s.layers[0].blendMode = 'mask-include'; },
  'custom path shape': s => { s.layers[0].shape = 'path'; },
  'hidden unsupported layer': s => { s.layers.push({type:'text', visible:false}); },
  'zero output dimensions': s => { s.project.width = 0; },
  'fractional output dimensions': s => { s.project.height = 2.5; }
};
for (const [name, change] of Object.entries(unsupported)) {
  test(`eligibility falls back for ${name}`, async () => {
    const h = harness(), scene = h.scene();
    change(scene);
    assert.equal(h.FM.exportWorker.eligible(scene), false);
    assert.equal(await h.FM.exportWorker.create(scene), null);
    assert.equal(h.workers.length, 0);
  });
}
for (const [name, change] of Object.entries({
  'active isolate': FM => { FM.isolate = {mode:'solo'}; },
  'drag ordering': FM => { FM._dragOrderIds = []; },
  'effect preview': FM => { FM.fxPreviewListFor = () => [{type:'blur'}]; }
})) {
  test(`eligibility falls back for ${name}`, () => {
    const h = harness(); change(h.FM);
    assert.equal(h.FM.exportWorker.eligible(h.scene()), false);
  });
}


// The next supported slice uses the shared native-filter and pixel-effect implementations.
const effectParams = {
  brightness: {amount:1.25},
  blur: {radius:3.5},
  gamma: {gamma:1.8, red:0.8, green:1.2, blue:1.1},
  posterize: {levels:5, mix:0.75, channels:1, gamma:1.2},
  contrast: {amount:1.4},
  saturate: {amount:1.7},
  hue: {deg:-45},
  grayscale: {amount:0.4},
  sepia: {amount:0.6},
  invert: {amount:0.25},
  temperature: {amount:-35, tint:20, preserve:60},
  vibrance: {amount:45, skin:30, highlights:65},
  exposure: {stops:-0.75, offset:0.1, rolloff:40}
};
const addedNativeEffectTypes = ['contrast', 'saturate', 'hue', 'grayscale', 'sepia', 'invert'];
const addedPixelEffectTypes = ['temperature', 'vibrance', 'exposure'];
const addedEffectTypes = [...addedNativeEffectTypes, ...addedPixelEffectTypes];
function sceneWithEffects(h, effects) {
  const scene = h.scene(); scene.layers[0].effects = effects; return scene;
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
for (const [type, params] of Object.entries(effectParams)) {
  test(`${type} accepts its scalar and numeric-keyframe parameters`, () => {
    const h = harness();
    const scene = sceneWithEffects(h, [{type, enabled:true, params}]);
    assert.equal(h.FM.exportWorker.eligible(scene), true);
    const animated = {};
    for (const [key, value] of Object.entries(params)) {
      animated[key] = {kf:[{t:0, v:value, e:'linear'}, {t:1, v:value + 0.5, e:'easeInOut'}]};
    }
    scene.layers[0].effects[0].params = animated;
    assert.equal(h.FM.exportWorker.eligible(scene), true);
    assert.equal(h.filterCalls, 0, 'structural eligibility must not probe the page canvas');
  });
}

test('supported effects preserve stack order, duplicates and explicit disabled state', async () => {
  const h = harness();
  const stack = [
    {type:'gamma', params:{gamma:0.7}},
    {type:'posterize', enabled:false, params:{levels:4}},
    {type:'blur', params:{radius:2}},
    {type:'gamma', params:{gamma:1.8}},
    {type:'brightness', params:{amount:1.4}}
  ];
  const scene = sceneWithEffects(h, stack);
  assert.equal(h.FM.exportWorker.eligible(scene), true);
  const promise = h.FM.exportWorker.create(scene);
  assert.equal(h.workers.length, 1);
  const worker = h.workers[0], sent = worker.messages[0].scene.layers[0].effects;
  assert.deepEqual(Array.from(sent, fx => fx.type), stack.map(fx => fx.type));
  assert.equal(sent[1].enabled, false);
  assert.equal(sent[0].params.gamma, 0.7);
  assert.equal(sent[3].params.gamma, 1.8);
  worker.reply({id:latestID(worker), ready:true});
  (await promise).dispose();
});

const badEffects = {
  'unsupported enabled effect': {type:'chromakey', params:{}},
  'unsupported disabled effect': {type:'chromakey', enabled:false, params:{}},
  'unknown effect envelope key': {type:'gamma', params:{gamma:1}, futureMode:true},
  'nested effect stack': {type:'gamma', effects:[{type:'blur'}], params:{}},
  'unknown effect parameter': {type:'gamma', params:{futureMode:2}},
  'parameter from another effect': {type:'brightness', params:{radius:2}},
  'string scalar': {type:'brightness', params:{amount:'1.2'}},
  'NaN scalar': {type:'brightness', params:{amount:NaN}},
  'infinite scalar': {type:'gamma', params:{red:Infinity}},
  'array scalar': {type:'blur', params:{radius:[1, 2]}},
  'audio-linked property': {type:'brightness', params:{amount:{kf:[{t:0,v:1}], audioLink:{sourceId:'song'}}}},
  'unknown animated-property key': {type:'gamma', params:{gamma:{kf:[{t:0,v:1}], futureMode:true}}},
  'unknown keyframe key': {type:'gamma', params:{gamma:{kf:[{t:0,v:1,futureMode:true}]}}},
  'string keyframe value': {type:'posterize', params:{levels:{kf:[{t:0,v:'3'}]}}},
  'nonfinite keyframe value': {type:'gamma', params:{red:{kf:[{t:0,v:Infinity}]}}},
  'nonfinite keyframe time': {type:'blur', params:{radius:{kf:[{t:NaN,v:2}]}}},
  'non-array keyframes': {type:'gamma', params:{gamma:{kf:{t:0,v:1}}}},
  'invalid loop mode': {type:'gamma', params:{gamma:{kf:[{t:0,v:1}], loopMode:'audio'}}},
  'unknown parameterized-ease field': {type:'gamma', params:{gamma:{kf:[{t:0,v:1,ez:{fam:'Bounce',preset:'In',future:true}}]}}},
  'nonnumeric parameterized-ease control': {type:'gamma', params:{gamma:{kf:[{t:0,v:1,ez:{fam:'Bounce',preset:'In',p:{count:'four'}}}]}}},
  'invalid bezier shape': {type:'gamma', params:{gamma:{kf:[{t:0,v:1,bez:[0,0,1]}]}}},
  'nonfinite spatial tangent': {type:'gamma', params:{gamma:{kf:[{t:0,v:1,to:Infinity}]}}},
  'nonnumeric enabled flag': {type:'gamma', enabled:'false', params:{}},
  'array parameter envelope': {type:'gamma', params:[]},
  'null effect entry': null
};
for (const [name, effect] of Object.entries(badEffects)) {
  test(`effect eligibility rejects ${name}`, async () => {
    const h = harness(), scene = sceneWithEffects(h, [effect]);
    assert.equal(h.FM.exportWorker.eligible(scene), false);
    assert.equal(await h.FM.exportWorker.create(scene), null);
    assert.equal(h.workers.length, 0);
    assert.equal(h.filterCalls, 0);
  });
}

test('private effect caches are ignored structurally and stripped only from the detached snapshot', async () => {
  const h = harness();
  const cache = {}; cache.self = cache;
  const fx = {type:'gamma', params:{gamma:1.4}, _plate:cache};
  const scene = sceneWithEffects(h, [fx]);
  assert.equal(h.FM.exportWorker.eligible(scene), true);
  const promise = h.FM.exportWorker.create(scene);
  assert.equal(h.workers.length, 1);
  const worker = h.workers[0];
  assert.equal('_plate' in worker.messages[0].scene.layers[0].effects[0], false);
  assert.equal(fx._plate, cache);
  worker.reply({id:latestID(worker), ready:true});
  (await promise).dispose();
});

for (const type of ['brightness', 'blur', ...addedNativeEffectTypes]) {
  test(`active ${type} falls back before Worker allocation when native filtering is unavailable`, async () => {
    const h = harness({filterOK:false});
    const scene = sceneWithEffects(h, [{type, params:effectParams[type]}]);
    assert.equal(h.FM.exportWorker.eligible(scene), true);
    assert.equal(h.filterCalls, 0);
    const creation = h.FM.exportWorker.create(scene);
    assert.equal(h.workers.length, 0);
    assert.equal(await creation, null);
    assert.equal(h.filterCalls, 1);
    assert.equal(h.timers.size, 0);
  });
}

test('pixel effects and disabled native effects do not require native filter support', async () => {
  const h = harness({filterOK:false});
  const scene = sceneWithEffects(h, [
    {type:'gamma', params:{gamma:1.2}},
    {type:'posterize', params:{levels:4}},
    {type:'blur', enabled:false, params:{radius:3}},
    {type:'brightness', enabled:false, params:{amount:1.3}}
  ]);
  assert.equal(h.FM.exportWorker.eligible(scene), true);
  const promise = h.FM.exportWorker.create(scene);
  assert.equal(h.workers.length, 1);
  assert.equal(h.filterCalls, 0);
  const worker = h.workers[0];
  worker.reply({id:latestID(worker), ready:true});
  (await promise).dispose();
});

test('native effects fail closed if the page cannot report filter capability', async () => {
  const h = harness(); delete h.FM.ctxFilterOK;
  const scene = sceneWithEffects(h, [{type:'brightness', params:{amount:1.2}}]);
  assert.equal(await h.FM.exportWorker.create(scene), null);
  assert.equal(h.workers.length, 0);
});

test('init hydrates sparse defaults on detached layers without mutating the live document', async () => {
  const h = harness();
  const scene = sceneWithEffects(h, [
    {type:'brightness'}, {type:'blur', params:{}}, {type:'gamma', params:{red:0}},
    {type:'posterize', params:{mix:0, levels:{kf:[{t:0,v:3},{t:1,v:7}]}}}
  ]);
  const before = plain(scene);
  const expected = plain(scene);
  h.FM._effectiveFx(expected.layers[0], 0.5);
  const promise = h.FM.exportWorker.create(scene, {time:0.5});
  assert.equal(h.workers.length, 1);
  const worker = h.workers[0], sent = worker.messages[0].scene.layers[0].effects;
  assert.deepEqual(plain(sent), plain(expected.layers[0].effects), 'snapshot defaults must match the shared compositor');
  assert.equal(sent[0].params.amount, 1.3);
  assert.equal(sent[1].params.radius, 6);
  assert.equal(sent[2].params.red, 0, 'explicit zero must survive default hydration');
  assert.equal(sent[2].params.green, 1);
  assert.equal(sent[2].params.blue, 1);
  assert.equal(sent[3].params.mix, 0);
  assert.equal(sent[3].params.channels, 0);
  assert.equal(sent[3].params.gamma, 1);
  assert.deepEqual(plain(sent[3].params.levels), before.layers[0].effects[3].params.levels);
  assert.deepEqual(plain(scene), before, 'export must not hydrate the live scene');
  worker.reply({id:latestID(worker), ready:true});
  (await promise).dispose();
});


test('effect parameters retain supported looping, tangents and easing metadata', () => {
  const h = harness();
  const prop = {loopMode:'pingpong', kf:[
    {t:0, v:0.75, e:'linear', ti:0.1, to:0.2},
    {t:1, v:1.5, e:'easeIn', bez:[0.25,0.1,0.25,1],
      ez:{fam:'Bounce', preset:'In', p:{count:3, elasticity:0.5}}}
  ]};
  assert.equal(h.FM.exportWorker.eligible(sceneWithEffects(h, [{type:'gamma', params:{gamma:prop}}])), true);
});

for (const [name, effects, filterOK, expectedReady] of [
  ['native filter unavailable', [{type:'blur',params:{radius:3}}], false, false],
  ['native filter available', [{type:'brightness',params:{amount:1.4}}], true, true],
  ['pixel-only without native filter', [{type:'gamma',params:{gamma:1.2}}], false, true],
  ...addedNativeEffectTypes.map(type => [type + ' native filter unavailable', [{type,params:effectParams[type]}], false, false]),
  ...addedNativeEffectTypes.map(type => [type + ' disabled without native filter', [{type,enabled:false,params:effectParams[type]}], false, true]),
  ...addedPixelEffectTypes.map(type => [type + ' pixel-only without native filter', [{type,params:effectParams[type]}], false, true])
]) {
  test(`worker independently checks its own backend: ${name}`, () => {
    const replies = [], calls = [];
    const probeBitmap = bitmap();
    const sandbox = {
      importScripts() {
        sandbox.FM = {
          ctxFilterOK() { calls.push('filter'); return filterOK; },
          createRenderCanvas() {
            calls.push('canvas');
            return {getContext() { return {}; }, transferToImageBitmap() { return probeBitmap; }};
          },
          renderScene() { calls.push('render'); }
        };
      },
      postMessage(reply) { replies.push(reply); }
    };
    vm.runInNewContext(sources['export-worker.js'], sandbox, {filename:'export-worker.js'});
    sandbox.onmessage({data:{id:1, type:'init', urls:[], time:0,
      scene:{project:{width:64,height:32}, layers:[{effects}]}}});
    assert.equal(replies.length, 1);
    assert.equal(!!replies[0].ready, expectedReady);
    if (expectedReady) {
      assert(calls.includes('render'));
      assert.equal(probeBitmap.closes, 1);
      if (!filterOK) assert.equal(calls.includes('filter'), false);
    } else {
      assert.match(replies[0].error, /filters unavailable/);
      assert.equal(calls.includes('canvas'), false);
      assert.equal(calls.includes('render'), false);
    }
  });
}


test('resume document remains the hydrated startup snapshot when the live scene changes during init', async () => {
  const h = harness();
  const scene = sceneWithEffects(h, [{type:'gamma'}]);
  const promise = h.FM.exportWorker.create(scene);
  const worker = h.workers[0], original = plain(worker.messages[0].scene);
  scene.project.background = '#ffffff';
  scene.layers[0].effects[0].params = {gamma:4};
  worker.reply({id:latestID(worker), ready:true});
  const renderer = await promise;
  assert.deepEqual(plain(renderer.document), {project:original.project, layers:original.layers});
  assert.notEqual(renderer.document.layers[0].effects[0].params.gamma, 4);
  renderer.dispose();
});

test('missing effect registry selects fallback before worker allocation', async () => {
  const h = harness(), scene = h.scene();
  scene.layers[0].effects = [{type:'gamma'}];
  h.FM.fxRegistry = null;
  const promise = h.FM.exportWorker.create(scene);
  assert.equal(h.workers.length, 0, 'a page missing default hydration must not choose a fully hydrated worker');
  assert.equal(await promise, null);
});


for (const type of addedEffectTypes) {
  test(`${type} rejects unknown parameters and invalid or audio-linked keyframes`, async () => {
    const h = harness();
    const key = Object.keys(effectParams[type])[0];
    const cases = {
      'unknown parameter': {...effectParams[type], futureMode:1},
      'nonfinite scalar': {...effectParams[type], [key]:Infinity},
      'nonfinite keyframe': {...effectParams[type], [key]:{kf:[{t:0,v:0}, {t:1,v:NaN}]}},
      'audio-linked keyframe': {...effectParams[type], [key]:{kf:[{t:0,v:0},{t:1,v:1}], audioLink:{sourceId:'song'}}}
    };
    for (const [name, params] of Object.entries(cases)) {
      const scene = sceneWithEffects(h, [{type,params}]);
      assert.equal(h.FM.exportWorker.eligible(scene), false, name);
      const creation = h.FM.exportWorker.create(scene);
      assert.equal(h.workers.length, 0, name);
      assert.equal(await creation, null, name);
    }
    assert.equal(h.filterCalls, 0, 'unsupported data must be rejected before native capability probing');
  });
}

for (const type of addedPixelEffectTypes) {
  test(`${type} starts on a page without native filtering and preserves every parameter`, async () => {
    const h = harness({filterOK:false});
    const scene = sceneWithEffects(h, [{type,params:effectParams[type]}]);
    const promise = h.FM.exportWorker.create(scene);
    assert.equal(h.workers.length, 1);
    assert.equal(h.filterCalls, 0);
    const worker = h.workers[0];
    assert.deepEqual(plain(worker.messages[0].scene.layers[0].effects[0].params), effectParams[type]);
    worker.reply({id:latestID(worker),ready:true});
    (await promise).dispose();
  });
}

test('disabled native color effects start without page filtering capability', async () => {
  const h = harness({filterOK:false});
  const effects = addedNativeEffectTypes.map(type => ({type,enabled:false,params:effectParams[type]}));
  const promise = h.FM.exportWorker.create(sceneWithEffects(h,effects));
  assert.equal(h.workers.length, 1);
  assert.equal(h.filterCalls, 0);
  const worker = h.workers[0];
  assert.deepEqual(plain(worker.messages[0].scene.layers[0].effects), effects);
  worker.reply({id:latestID(worker),ready:true});
  (await promise).dispose();
});

test('new effect defaults use the shared registry on the detached resume document', async () => {
  const h = harness();
  const effects = addedEffectTypes.map(type => ({type}));
  const scene = sceneWithEffects(h,effects), before = plain(scene), expected = plain(scene);
  h.FM._effectiveFx(expected.layers[0],0);
  const promise = h.FM.exportWorker.create(scene);
  assert.equal(h.workers.length,1);
  const worker = h.workers[0], sent = worker.messages[0].scene.layers[0].effects;
  assert.deepEqual(plain(sent),plain(expected.layers[0].effects));
  for (const fx of sent) {
    assert.deepEqual(Object.keys(fx.params).sort(),Object.keys(effectParams[fx.type]).sort(),fx.type);
    assert(Object.values(fx.params).every(Number.isFinite),fx.type + ' defaults must be numeric');
  }
  assert.deepEqual(plain(scene),before,'the page scene must remain sparse');
  worker.reply({id:latestID(worker),ready:true});
  const renderer = await promise;
  assert.deepEqual(plain(renderer.document.layers[0].effects),plain(sent));
  renderer.dispose();
});

test('same effect object repeated in a stack selects fallback before JSON changes its identity', async () => {
  const h = harness();
  const fx = {type:'gamma',params:{gamma:2}};
  const scene = sceneWithEffects(h,[fx,fx]);
  assert.equal(h.FM.exportWorker.eligible(scene),false);
  const promise = h.FM.exportWorker.create(scene);
  assert.equal(h.workers.length,0);
  assert.equal(await promise,null);
  assert.equal(scene.layers[0].effects[0],scene.layers[0].effects[1]);
});

test('distinct equal effect instances remain supported and retain both stack entries', async () => {
  const h = harness();
  const effects = [{type:'gamma',params:{gamma:2}},{type:'gamma',params:{gamma:2}}];
  const scene = sceneWithEffects(h,effects);
  assert.notEqual(effects[0],effects[1]);
  assert.equal(h.FM.exportWorker.eligible(scene),true);
  const promise = h.FM.exportWorker.create(scene);
  assert.equal(h.workers.length,1);
  const worker = h.workers[0], sent = worker.messages[0].scene.layers[0].effects;
  assert.equal(sent.length,2);
  assert.notEqual(sent[0],sent[1]);
  assert.equal(sent[0].params.gamma,2);
  assert.equal(sent[1].params.gamma,2);
  worker.reply({id:latestID(worker),ready:true});
  (await promise).dispose();
});


for (const caseName of ['same-layer shared params','cross-layer shared params','cross-layer shared effect']) {
  test(`${caseName} selects fallback without hydrating the shared live objects`, async () => {
    const h = harness(), scene = h.scene(), params = {};
    const gamma = {type:'gamma',params};
    const posterize = {type:'posterize',enabled:false,params};
    scene.layers[0].effects = [gamma];
    if (caseName === 'same-layer shared params') scene.layers[0].effects.push(posterize);
    else {
      const second = h.scene().layers[0];
      second.effects = [caseName === 'cross-layer shared effect' ? gamma : posterize];
      scene.layers.push(second);
    }
    assert.equal(h.FM.exportWorker.eligible(scene),false);
    const promise = h.FM.exportWorker.create(scene);
    assert.equal(h.workers.length,0);
    assert.equal(await promise,null);
    assert.deepEqual(params,{},'rejection must happen before default hydration');
  });
}

test('distinct equal parameter objects across layers remain eligible', async () => {
  const h = harness(), scene = h.scene();
  scene.layers[0].effects = [{type:'gamma',params:{}}];
  const second = h.scene().layers[0];
  second.effects = [{type:'gamma',params:{}}];
  scene.layers.push(second);
  assert.notEqual(scene.layers[0].effects[0].params,second.effects[0].params);
  assert.equal(h.FM.exportWorker.eligible(scene),true);
  const promise = h.FM.exportWorker.create(scene);
  assert.equal(h.workers.length,1);
  const worker = h.workers[0];
  worker.reply({id:latestID(worker),ready:true});
  (await promise).dispose();
});


for (const initialTransparent of [false, true]) {
  test(`worker transparency stays ${initialTransparent} when the live flag changes during init`, async () => {
    const h = harness();
    h.FM._exportTransparent = initialTransparent;
    const promise = h.FM.exportWorker.create(h.scene());
    assert.equal(h.workers.length, 1);
    const worker = h.workers[0], init = worker.messages[0];
    assert.equal(init.transparent, initialTransparent);
    h.FM._exportTransparent = !initialTransparent;
    worker.reply({id:init.id, ready:true});
    const renderer = await promise;
    assert.equal(renderer.transparent, initialTransparent, 'renderer must retain the value sent to its worker');
    assert.equal(init.transparent, initialTransparent);
    assert.equal(h.FM._exportTransparent, !initialTransparent, 'startup must not overwrite the live setting');
    renderer.dispose();
    assert.equal(worker.terminations, 1);
    assert.equal(h.timers.size, 0);
  });
}


const workerShapeKinds = 'rect ellipse line arc pie semicircle ring polygon star triangle heart plus arrow chevron trapezoid parallelogram speech moon snowflake shield droplet cloud play spiral sparkle bolt puzzle pushpin flag paperplane house laurel bookmark flame banner ribbon wreath diamond plane umbrella bomb boat magnifier sun person rocket woman stamp check thumbsup pointhand envelope key car squircle cross pin lock gear crown eye note starburst clock'.split(' ');
for (const shape of workerShapeKinds) {
  test(`${shape} geometry admits an ordinary animated outline without changing the snapshot`, async () => {
    const h = harness(), scene = h.scene(), layer = scene.layers[0];
    layer.shape = shape;
    layer.transform.rotation = {kf:[{t:0,v:0},{t:1,v:30,e:'easeIn'}]};
    layer.stroke = {
      enabled:true, position:'center',
      width:{kf:[{t:0,v:1},{t:1,v:9,e:'easeInOut'}]},
      color:{kf:[{t:0,v:'#f00'},{t:1,v:'#33ccffff',e:'linear'}]}
    };
    const before = plain(scene);
    assert.equal(h.FM.exportWorker.eligible(scene),true);
    const promise = h.FM.exportWorker.create(scene);
    assert.equal(h.workers.length,1);
    const worker = h.workers[0];
    assert.deepEqual(plain(worker.messages[0].scene),before);
    assert.deepEqual(plain(scene),before);
    worker.reply({id:latestID(worker),ready:true});
    (await promise).dispose();
  });
}

for (const field of ['shapeW','shapeH']) {
  test(`${field} requires a finite positive static dimension`, async () => {
    const h = harness();
    for (const value of [0,-1,NaN,Infinity,'24',{kf:[{t:0,v:24},{t:1,v:32}]}]) {
      const scene = h.scene(); scene.layers[0][field] = value;
      assert.equal(h.FM.exportWorker.eligible(scene),false,String(value));
      const creation = h.FM.exportWorker.create(scene);
      assert.equal(h.workers.length,0);
      assert.equal(await creation,null);
    }
  });
}
for (const shape of ['polygon','star']) {
  test(`${shape} bounds sides to static integers from 3 through 12`, async () => {
    const h = harness(), scene = h.scene(), layer = scene.layers[0]; layer.shape = shape;
    for (const sides of [3,5,12]) {
      layer.sides = sides;
      assert.equal(h.FM.exportWorker.eligible(scene),true,String(sides));
    }
    for (const sides of [2,13,3.5,NaN,Infinity,'5',{kf:[{t:0,v:3},{t:1,v:6}]}]) {
      layer.sides = sides;
      assert.equal(h.FM.exportWorker.eligible(scene),false,String(sides));
      const creation = h.FM.exportWorker.create(scene);
      assert.equal(h.workers.length,0);
      assert.equal(await creation,null);
    }
  });
}

test('corner radius is static, finite and nonnegative, and applies only to rectangles', () => {
  const h = harness(), scene = h.scene(), layer = scene.layers[0];
  for (const radius of [0,4,100]) {
    layer.cornerRadius = radius;
    assert.equal(h.FM.exportWorker.eligible(scene),true,String(radius));
  }
  for (const radius of [-1,NaN,Infinity,'4',{kf:[{t:0,v:0},{t:1,v:4}]}]) {
    layer.cornerRadius = radius;
    assert.equal(h.FM.exportWorker.eligible(scene),false,String(radius));
  }
  layer.shape = 'ellipse'; layer.cornerRadius = 4;
  assert.equal(h.FM.exportWorker.eligible(scene),false);
  layer.cornerRadius = 0;
  assert.equal(h.FM.exportWorker.eligible(scene),true);
});

for (const position of ['center','inside','outside']) {
  test(`${position} ordinary stroke accepts static width including zero and hexadecimal colors`, () => {
    const h = harness(), scene = h.scene(), layer = scene.layers[0];
    if (position === 'inside') layer.shape = 'line'; // open-path position is ignored by the shared renderer
    for (const color of ['#f0A','#f0A8','#12aBcD','#12aBcD80']) {
      layer.stroke = {enabled:true,position,width:0,color};
      assert.equal(h.FM.exportWorker.eligible(scene),true,color);
      layer.stroke.width = 7.5;
      assert.equal(h.FM.exportWorker.eligible(scene),true,color);
    }
  });
}

test('disabled borders on open geometry still validate the width and nested stroke fields', async () => {
  const h = harness();
  for (const shape of ['line','arc','spiral']) {
    const scene = h.scene(), layer = scene.layers[0]; layer.shape = shape;
    layer.stroke = {enabled:false,width:{kf:[{t:0,v:2},{t:1,v:9}]},color:'#fff'};
    assert.equal(h.FM.exportWorker.eligible(scene),true,shape);
    layer.stroke.width.kf[1].v = Infinity;
    assert.equal(h.FM.exportWorker.eligible(scene),false,shape + ' invalid width');
    layer.stroke.width = 8;
    layer.stroke.dash = {enabled:false};
    assert.equal(h.FM.exportWorker.eligible(scene),false,shape + ' unsupported dash');
    const creation = h.FM.exportWorker.create(scene);
    assert.equal(h.workers.length,0);
    assert.equal(await creation,null);
  }
});

const unsupportedStrokes = {
  'unknown field': {enabled:false,width:8,color:'#fff',futureMode:1},
  'disabled dash': {enabled:false,width:8,color:'#fff',dash:{enabled:false}},
  'string enabled flag': {enabled:'true',width:8,color:'#fff'},
  'unknown border position': {enabled:true,width:8,color:'#fff',position:'outer'},
  'nonfinite width': {enabled:true,width:Infinity,color:'#fff'},
  'string width': {enabled:true,width:'8',color:'#fff'},
  'invalid width keyframe': {enabled:true,width:{kf:[{t:0,v:2},{t:1,v:NaN}]},color:'#fff'},
  'audio-linked width': {enabled:true,width:{kf:[{t:0,v:2}],audioLink:{sourceId:'song'}},color:'#fff'},
  'named CSS color': {enabled:true,width:8,color:'red'},
  'malformed hex color': {enabled:true,width:8,color:'#12345'},
  'nonhex color': {enabled:true,width:8,color:'#zzzzzz'},
  'numeric color': {enabled:true,width:8,color:123},
  'invalid color keyframe': {enabled:true,width:8,color:{kf:[{t:0,v:'#fff'},{t:1,v:'red'}]}},
  'audio-linked color': {enabled:true,width:8,color:{kf:[{t:0,v:'#fff'}],audioLink:{sourceId:'song'}}},
  'unknown color keyframe field': {enabled:true,width:8,color:{kf:[{t:0,v:'#fff',futureMode:1}]}},
  'nonfinite color keyframe time': {enabled:true,width:8,color:{kf:[{t:Infinity,v:'#fff'}]}}}
;
for (const [name,stroke] of Object.entries(unsupportedStrokes)) {
  test(`stroke fallback rejects ${name}`, async () => {
    const h = harness(), scene = h.scene(); scene.layers[0].stroke = stroke;
    assert.equal(h.FM.exportWorker.eligible(scene),false);
    const creation = h.FM.exportWorker.create(scene);
    assert.equal(h.workers.length,0);
    assert.equal(await creation,null);
  });
}

test('stroke color keyframes preserve the shared easing and looping metadata', () => {
  const h = harness(), scene = h.scene();
  scene.layers[0].stroke = {enabled:true,width:3,color:{loopMode:'pingpong',kf:[
    {t:0,v:'#0000',e:'linear'},
    {t:1,v:'#ffffff88',e:'easeIn',bez:[0.25,0.1,0.25,1],ez:{fam:'Bounce',preset:'In',p:{count:3}}}
  ]}};
  assert.equal(h.FM.exportWorker.eligible(scene),true);
});

for (const options of [{roundRect:false},{noPageContext:true}]) {
  test(`rounded rectangle falls back before worker creation when page ${options.noPageContext ? 'context' : 'roundRect'} is unavailable`, async () => {
    const h = harness(options), scene = h.scene(); scene.layers[0].cornerRadius = 4;
    assert.equal(h.FM.exportWorker.eligible(scene),true,'capability probing must remain outside structural eligibility');
    const creation = h.FM.exportWorker.create(scene);
    assert.equal(h.workers.length,0);
    assert.equal(await creation,null);
    assert.equal(h.timers.size,0);
  });
}

test('rounded rectangle starts when page roundRect is available', async () => {
  const h = harness(), scene = h.scene(); scene.layers[0].cornerRadius = 4;
  const promise = h.FM.exportWorker.create(scene);
  assert.equal(h.workers.length,1);
  const worker = h.workers[0];
  assert.equal(worker.messages[0].scene.layers[0].cornerRadius,4);
  worker.reply({id:latestID(worker),ready:true});
  (await promise).dispose();
});

test('square rectangle does not require page roundRect support', async () => {
  const h = harness({roundRect:false});
  const {renderer,worker} = await ready(h);
  renderer.dispose();
  assert.equal(worker.terminations,1);
});

for (const [radius,roundRect,expectedReady] of [[4,false,false],[4,true,true],[0,false,true]]) {
  test(`worker roundRect capability is checked independently for radius ${radius}, support ${roundRect}`, () => {
    const replies = [], calls = [], probeBitmap = bitmap();
    const sandbox = {
      importScripts() {
        sandbox.FM = {
          createRenderCanvas() { return {
            getContext() { return roundRect ? {roundRect() {}} : {}; },
            transferToImageBitmap() { return probeBitmap; }
          }; },
          renderScene() { calls.push('render'); }
        };
      },
      postMessage(reply) { replies.push(reply); }
    };
    vm.runInNewContext(sources['export-worker.js'],sandbox,{filename:'export-worker.js'});
    sandbox.onmessage({data:{id:1,type:'init',urls:[],time:0,scene:{
      project:{width:64,height:32},layers:[{type:'shape',shape:'rect',cornerRadius:radius,effects:[]}]
    }}});
    assert.equal(replies.length,1);
    assert.equal(!!replies[0].ready,expectedReady);
    if (expectedReady) {
      assert.deepEqual(calls,['render']);
      assert.equal(probeBitmap.closes,1);
    } else {
      assert.match(replies[0].error,/round|corner/i);
      assert.equal(calls.length,0);
    }
  });
}


const openWorkerShapeKinds = ['line','arc','spiral'];
test('closed inside outlines fall back for static and animated nonzero widths', async () => {
  const h = harness();
  for (const shape of workerShapeKinds.filter(kind => !openWorkerShapeKinds.includes(kind))) {
    for (const width of [6,{kf:[{t:0,v:0},{t:1,v:8}]}]) {
      const scene = h.scene(), layer = scene.layers[0]; layer.shape = shape;
      layer.transform.opacity = 0.37;
      layer.stroke = {enabled:true,position:'inside',width,color:'#33ccff'};
      assert.equal(h.FM.exportWorker.eligible(scene),false,shape);
      const creation = h.FM.exportWorker.create(scene);
      assert.equal(h.workers.length,0,shape + ' must not create a worker');
      assert.equal(await creation,null,shape);
    }
  }
});

test('open inside strokes remain eligible with static and animated widths', async () => {
  const h = harness();
  for (const shape of openWorkerShapeKinds) {
    for (const width of [6,{kf:[{t:0,v:2},{t:1,v:8}]}]) {
      const scene = h.scene(), layer = scene.layers[0]; layer.shape = shape;
      layer.transform.opacity = 0.37;
      layer.stroke = {enabled:true,position:'inside',width,color:'#33ccff'};
      assert.equal(h.FM.exportWorker.eligible(scene),true,shape);
      const before = h.workers.length, promise = h.FM.exportWorker.create(scene);
      assert.equal(h.workers.length,before + 1);
      const worker = h.workers.at(-1);
      worker.reply({id:latestID(worker),ready:true});
      (await promise).dispose();
    }
  }
});

for (const [name,stroke] of [
  ['disabled inside border',{enabled:false,position:'inside',width:{kf:[{t:0,v:2},{t:1,v:8}]},color:'#fff'}],
  ['static zero-width inside border',{enabled:true,position:'inside',width:0,color:'#fff'}],
  ['missing-width inside border',{enabled:true,position:'inside',color:'#fff'}]
]) {
  test(`closed shapes with a ${name} remain eligible`, async () => {
    const h = harness(), scene = h.scene(); scene.layers[0].stroke = stroke;
    assert.equal(h.FM.exportWorker.eligible(scene),true);
    const promise = h.FM.exportWorker.create(scene);
    assert.equal(h.workers.length,1);
    const worker = h.workers[0];
    worker.reply({id:latestID(worker),ready:true});
    (await promise).dispose();
  });
}


test('worker resume identity separates captured transparency and keeps default opaque identity stable', async () => {
  const contexts=[harness(),harness(),harness()];
  contexts[1].FM._exportTransparent=false;contexts[2].FM._exportTransparent=true;
  const instances=await Promise.all(contexts.map(h=>ready(h)));
  try {
    assert.equal(instances[0].renderer.id,instances[1].renderer.id);
    assert.notEqual(instances[0].renderer.id,instances[2].renderer.id);
  } finally { instances.forEach(item=>item.renderer.dispose()); }
});

test('worker resume identity uses captured transparency after a live startup edit', async () => {
  const opaque=await ready(harness()),h=harness();
  h.FM._exportTransparent=true;
  const pending=h.FM.exportWorker.create(h.scene()),worker=h.workers[0];
  h.FM._exportTransparent=false;
  worker.reply({id:latestID(worker),ready:true});
  const renderer=await pending;
  try {
    assert.equal(renderer.transparent,true);
    assert.equal(worker.messages[0].transparent,true);
    assert.notEqual(renderer.id,opaque.renderer.id);
  } finally { renderer.dispose();opaque.renderer.dispose(); }
});


// Export captures are taken before asynchronous setup. These tests use the actual shared
// scene/default evaluators; the fake Worker isolates the handoff from browser pixel behavior.
test('capture is synchronous, detached, canonical and free of renderer side effects', () => {
  const h = harness(), scene = h.scene();
  scene.layers[0].effects = [{type:'gamma'}];
  const cache = {}; cache.self = cache;
  scene.layers[0]._canvas = cache;
  scene.layers[0].transform.x = {kf:[{t:0,v:4},{t:1,v:20,e:'easeInOut'}]};
  h.FM._exportTransparent = true;
  const captured = h.FM.exportWorker.capture(scene, {time:0.5});
  assert(captured && typeof captured.then !== 'function', 'capture must return before any await');
  assert.equal(captured.transparent, true);
  assert.notEqual(captured.document, scene);
  assert.notEqual(captured.document.project, scene.project);
  assert.notEqual(captured.document.layers[0].transform.x, scene.layers[0].transform.x);
  assert.deepEqual(plain(captured.document.layers[0].effects[0].params), {gamma:1.8,red:1,green:1,blue:1});
  assert.equal('params' in scene.layers[0].effects[0], false, 'default hydration must not edit the live effect');
  assert.equal('_canvas' in captured.document.layers[0], false);
  assert.equal(scene.layers[0]._canvas, cache, 'private live caches must remain owned by the page');
  scene.project.background = '#ffffff';
  scene.layers[0].transform.x.kf[0].v = 999;
  assert.equal(captured.document.project.background, '#102030');
  assert.equal(captured.document.layers[0].transform.x.kf[0].v, 4);
  assert.equal(h.workers.length, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.filterCalls, 0, 'capture must not probe an asynchronous renderer backend');
});

test('prepared create preserves captured document, alpha and renderer identity through later live edits', async () => {
  const h = harness(), scene = sceneWithEffects(h, [{type:'gamma'}]);
  h.FM._exportTransparent = true;
  const captured = h.FM.exportWorker.capture(scene, {time:0.25});
  const expected = plain(captured.document);
  scene.project.width = 120; scene.project.height = 90; scene.project.background = '#ffffff';
  scene.layers[0].fill = '#000000'; scene.layers[0].effects = [{type:'unknown'}];
  h.FM._exportTransparent = false;
  const promise = h.FM.exportWorker.create(scene, {time:0.25,capture:captured});
  assert.equal(h.workers.length, 1);
  const worker = h.workers[0], init = worker.messages[0];
  assert.deepEqual(plain(init.scene), expected);
  assert.equal(init.transparent, true);
  assert.equal(init.time, 0.25);
  scene.project.background = '#ff0000';
  worker.reply({id:init.id,ready:true});
  const renderer = await promise;
  const comparison = harness(); comparison.FM._exportTransparent = true;
  const sameAlpha = await ready(comparison);
  const opaque = await ready(harness());
  try {
    assert.deepEqual(plain(renderer.document), {project:expected.project,layers:expected.layers});
    assert.equal(renderer.transparent, true);
    assert.equal(renderer.id, sameAlpha.renderer.id, 'identity must use captured alpha, not the live flag');
    assert.notEqual(renderer.id, opaque.renderer.id);
  } finally { renderer.dispose(); sameAlpha.renderer.dispose(); opaque.renderer.dispose(); }
});

for (const [name,change] of Object.entries({
  'isolate selection': (h,scene) => { h.FM.isolate = {id:scene.layers[0].id,mode:1}; },
  'drag ordering': h => { h.FM._dragOrderIds = []; },
  'effect preview': (h,scene) => { h.FM._fxPreview = {id:scene.layers[0].id,list:[{type:'blur',params:{radius:12}}]}; }
})) {
  test(`prepared create does not recapture a new live ${name}`, async () => {
    const h = harness(), scene = h.scene();
    const captured = h.FM.exportWorker.capture(scene), expected = plain(captured.document);
    change(h,scene);
    assert.equal(h.FM.exportWorker.eligible(scene), false, 'control must make a fresh capture ineligible');
    const promise = h.FM.exportWorker.create(scene, {capture:captured});
    assert.equal(h.workers.length, 1, 'an authorized capture must survive later preview changes');
    const worker = h.workers[0];
    assert.deepEqual(plain(worker.messages[0].scene), expected, 'late preview must not enter the prepared document');
    worker.reply({id:latestID(worker),ready:true});
    (await promise).dispose();
    assert.equal(h.timers.size, 0);
  });
}

for (const [name,change] of Object.entries({
  'unsupported layer': scene => { scene.layers[0].type = 'text'; },
  'unsupported effect': scene => { scene.layers[0].effects = [{type:'unknown'}]; },
  'repeated effect identity': scene => { const fx={type:'gamma'}; scene.layers[0].effects=[fx,fx]; },
  'shared effect params': scene => { const params={}; scene.layers[0].effects=[{type:'gamma',params},{type:'posterize',params}]; }
})) {
  test(`capture rejects ${name} before JSON can erase the distinction`, () => {
    const h = harness(), scene = h.scene(); change(scene);
    assert.equal(h.FM.exportWorker.capture(scene), null);
    assert.equal(h.workers.length, 0);
    assert.equal(h.timers.size, 0);
    assert.equal(h.filterCalls, 0);
  });
}

for (const name of ['invented document','copied capture envelope','capture from another client']) {
  test(`prepared create falls back for a forged ${name}`, async () => {
    const h = harness(), scene = h.scene();
    let capture;
    if (name === 'invented document') capture = {document:plain(scene),transparent:false};
    if (name === 'copied capture envelope') capture = {...h.FM.exportWorker.capture(scene)};
    if (name === 'capture from another client') { const other=harness(); capture=other.FM.exportWorker.capture(other.scene()); }
    assert.equal(await h.FM.exportWorker.create(scene,{capture}), null);
    assert.equal(h.workers.length, 0, 'unrecognized capture must not silently switch to a fresh document');
    assert.equal(h.timers.size, 0);
  });
}

test('prepared create tests backend requirements of the captured document', async () => {
  const h = harness({filterOK:false}), scene = sceneWithEffects(h,[{type:'blur',params:{radius:3}}]);
  const capture = h.FM.exportWorker.capture(scene);
  assert(capture, 'structural capture should not require a working canvas filter');
  scene.layers[0].effects = [];
  assert.equal(await h.FM.exportWorker.create(scene,{capture}), null, 'removing a live effect cannot waive captured filter requirements');
  assert.equal(h.workers.length, 0);
  assert.equal(h.timers.size, 0);
});

test('later live native effects do not impose backend requirements on a captured pixel-only scene', async () => {
  const h = harness({filterOK:false}), scene = sceneWithEffects(h,[{type:'gamma',params:{gamma:1.2}}]);
  const capture = h.FM.exportWorker.capture(scene);
  scene.layers[0].effects = [{type:'blur',params:{radius:3}}];
  const promise = h.FM.exportWorker.create(scene,{capture});
  assert.equal(h.workers.length, 1);
  const worker = h.workers[0];
  assert.equal(worker.messages[0].scene.layers[0].effects[0].type, 'gamma');
  worker.reply({id:latestID(worker),ready:true});
  (await promise).dispose();
  assert.equal(h.timers.size, 0);
});


for (const field of ['x','y','scale','rotation','opacity','anchorX','anchorY']) {
  test(`transform capture rejects nonfinite or unsupported ${field} before JSON changes it`, async () => {
    const h=harness();
    const invalid=[Infinity,-Infinity,NaN,'2',null,
      {kf:[{t:0,v:Infinity}]}, {kf:[{t:0,v:NaN}]}, {kf:[{t:Infinity,v:1}]},
      {kf:[{t:0,v:1,ti:NaN}]}, {kf:[{t:0,v:1,bez:[0,0,1,Infinity]}]},
      {kf:[{t:0,v:1,ez:{fam:'quad',preset:'in',p:{amount:Infinity}}}]}];
    for (const value of invalid) {
      const scene=h.scene();scene.layers[0].transform[field]=value;
      assert.equal(h.FM.exportWorker.eligible(scene),false,field+' must keep the original main renderer');
      assert.equal(h.FM.exportWorker.capture(scene),null,'unsupported values must not enter a detached document');
      assert.equal(await h.FM.exportWorker.create(scene),null);
      assert.equal(h.workers.length,0);assert.equal(h.timers.size,0);
    }
  });
}
test('transform capture preserves finite scalars and keyframes and accepts omitted fields', () => {
  const h=harness();
  for (const field of ['x','y','scale','rotation','opacity','anchorX','anchorY']) {
    for (const value of [0,-2.5,3.25,{kf:[{t:0,v:1},{t:1,v:2,e:'easeInOut',bez:[0,0,1,1]}]},undefined]) {
      const scene=h.scene();
      if (value===undefined) delete scene.layers[0].transform[field];
      else scene.layers[0].transform[field]=value;
      assert.equal(h.FM.exportWorker.eligible(scene),true);
      const captured=h.FM.exportWorker.capture(scene);assert(captured);
      assert.deepEqual(plain(captured.document.layers[0].transform),plain(scene.layers[0].transform));
    }
  }
});
