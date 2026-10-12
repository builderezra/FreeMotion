#!/usr/bin/env node
/* check-voices-node.js — every voice in voices.js builds, without a browser.
 *
 *   node tools/design/plans/new-effects/check-voices-node.js
 *
 * Loads the app's own js/audio-fx.js and js/storage.js into a vm and, against a MOCK Web Audio graph (the polish batches 7/8
 * harness: it throws on a non-finite value, a bad connection, a negative time or a buffer of length 0, and records any
 * AudioParam scheduled past its maximum — a delay line asked for more than it holds), checks for every voice:
 *   · each type is in FM.audioFxRegistry; each key is in its schema; each number is in range; each choice is one of its options;
 *   · the stack is ≤ AFX_MAX (16, storage.js) and no listed value is just the default (a row that changes nothing);
 *   · FM.storage._sanitizeLayers keeps every value exactly as written (so a saved voice reloads as it was);
 *   · FM.buildAudioFxChain builds it at 44.1 and 48 kHz, schedules it for 5 s (the export path) and drives it live (applyAt),
 *     with no throw and nothing past a maximum.
 * It cannot HEAR anything — that is what render-voices-probe.js is for.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', '..', '..'));
const DATA = require(path.join(__dirname, 'voices.js'));

/* ---- a mock Web Audio graph (agents/fx-b8/mock.js, the batch 7/8 harness) ------------------------------------------------ */
let problems = [], overs = [];
function chk(v, what) { if (typeof v !== 'number' || !isFinite(v)) { problems.push('non-finite ' + what + ': ' + v); throw new TypeError('non-finite ' + what); } }
class Param {
  constructor(name, v, lo, hi) { this.name = name; this._v = v; this.events = []; this.inputs = 0; this.lo = lo; this.hi = hi; }
  _range(v) { if (this.hi != null && v > this.hi + 1e-9) overs.push(this.name + ' ' + v + ' > ' + this.hi); }
  get value() { return this._v; }
  set value(v) { chk(v, this.name + '.value'); this._range(v); this._v = v; }
  setValueAtTime(v, t) { chk(v, this.name + ' set'); chk(t, this.name + ' t'); if (t < 0) throw new RangeError('neg time'); this._range(v); this.events.push(['set', v, t]); return this; }
  linearRampToValueAtTime(v, t) { chk(v, this.name + ' ramp'); chk(t, this.name + ' t'); if (t < 0) throw new RangeError('neg time'); this._range(v); this.events.push(['ramp', v, t]); return this; }
  exponentialRampToValueAtTime(v, t) { chk(v, this.name + ' exp'); chk(t, this.name + ' t'); this.events.push(['exp', v, t]); return this; }
  setTargetAtTime(v, t) { chk(v, 'tgt'); this.events.push(['tgt', v, t]); return this; }
  setValueCurveAtTime(c, t) { for (const x of c) chk(x, 'curve'); this.events.push(['curve', c.length, t]); return this; }
  cancelScheduledValues(t) { chk(t, 'cancel t'); this.events = this.events.filter(e => e[2] < t); return this; }
  cancelAndHoldAtTime(t) { return this.cancelScheduledValues(t); }
}
class Node {
  constructor(ctx, kind, ins, outs) { this.context = ctx; this.kind = kind; this.numberOfInputs = ins; this.numberOfOutputs = outs; this.out = []; this.channelCount = 2; this.channelCountMode = 'max'; this.channelInterpretation = 'speakers'; }
  connect(dest, o, i) {
    if (o != null && (o < 0 || o >= this.numberOfOutputs)) throw new Error(this.kind + ' has no output ' + o);
    if (dest instanceof Param) { dest.inputs++; this.out.push(dest); return undefined; }
    if (!(dest instanceof Node)) throw new Error('connect to non-node');
    if (i != null && (i < 0 || i >= dest.numberOfInputs)) throw new Error(dest.kind + ' has no input ' + i);
    this.out.push(dest); return dest;
  }
  disconnect() { this.out = []; }
}
class Buffer {
  constructor(ch, len, sr) { if (!(len >= 1)) throw new Error('buffer length ' + len); this.numberOfChannels = ch; this.length = len; this.sampleRate = sr; this.duration = len / sr; this._d = []; for (let c = 0; c < ch; c++) this._d.push(new Float32Array(len)); }
  getChannelData(c) { return this._d[c]; }
}
class Ctx {
  constructor(sr) { this.sampleRate = sr || 48000; this.currentTime = 0; this.destination = new Node(this, 'dest', 1, 0); }
  createGain() { const n = new Node(this, 'gain', 1, 1); n.gain = new Param('gain', 1); return n; }
  createDelay(max) { if (!(max > 0 && max < 180)) throw new Error('delay max ' + max); const n = new Node(this, 'delay', 1, 1); n.maxDelay = max; n.delayTime = new Param('delayTime', 0, 0, max); return n; }
  createBiquadFilter() { const n = new Node(this, 'biquad', 1, 1); n.type = 'lowpass'; n.frequency = new Param('frequency', 350); n.Q = new Param('Q', 1); n.gain = new Param('bgain', 0); n.detune = new Param('detune', 0); return n; }
  createWaveShaper() { const n = new Node(this, 'shaper', 1, 1); let c = null; Object.defineProperty(n, 'curve', { get: () => c, set: v => { if (v) { if (!(v instanceof Float32Array) || v.length < 2) throw new Error('bad curve'); for (const x of v) chk(x, 'curve pt'); } c = v; } }); n.oversample = 'none'; return n; }
  createStereoPanner() { const n = new Node(this, 'panner', 1, 1); n.pan = new Param('pan', 0); return n; }
  createDynamicsCompressor() { const n = new Node(this, 'comp', 1, 1); n.threshold = new Param('threshold', -24); n.knee = new Param('knee', 30); n.ratio = new Param('ratio', 12); n.attack = new Param('attack', 0.003); n.release = new Param('release', 0.25); n.reduction = 0; return n; }
  createConvolver() { const n = new Node(this, 'conv', 1, 1); n.buffer = null; n.normalize = true; return n; }
  createChannelSplitter(c) { return new Node(this, 'split', 1, c || 6); }
  createChannelMerger(c) { return new Node(this, 'merge', c || 6, 1); }
  createBufferSource() { const n = new Node(this, 'src', 0, 1); n.buffer = null; n.loop = false; n.playbackRate = new Param('playbackRate', 1); n.started = false;
    n.start = (w, off) => { if (n.started) throw new Error('started twice'); chk(w, 'start when'); if (off != null) { chk(off, 'start offset'); if (off < 0) throw new RangeError('neg offset'); } n.started = true; };
    n.stop = () => {}; return n; }
  createBuffer(ch, len, sr) { return new Buffer(ch, len, sr); }
}

/* ---- the app in a vm ------------------------------------------------------------------------------------------------------- */
const noop = function () {};
const store = {};
const win = { FM: {}, console, setTimeout, clearTimeout, setInterval, clearInterval, Math, JSON, Date, Object, Array, Number, String, Boolean, RegExp, Error,
  Map, Set, WeakMap, WeakSet, Symbol, Promise, Proxy, Reflect, Float32Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint32Array, Int32Array, Float64Array, isFinite, isNaN, parseFloat, parseInt,
  addEventListener: noop, removeEventListener: noop, navigator: { userAgent: 'node' }, location: { search: '', href: '', hostname: 'localhost' },
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: { createElement: () => ({ getContext: () => null, style: {} }), addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null },
  performance: { now: () => Date.now() }, requestAnimationFrame: noop, matchMedia: () => ({ matches: false, addEventListener: noop }) };
win.window = win; win.self = win; win.globalThis = win;
const ctx = vm.createContext(win);
for (const f of ['js/scene.js', 'js/eases.js', 'js/audio-fx.js', 'js/storage.js']) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { if (f === 'js/audio-fx.js') throw e; console.log('note: ' + f + ' did not fully load in the vm (' + (e && e.message) + ')'); }
}
const FM = win.FM, reg = FM.audioFxRegistry;
if (!reg || !FM.buildAudioFxChain) throw new Error('FM.audioFxRegistry / FM.buildAudioFxChain did not load');

/* ---- check ----------------------------------------------------------------------------------------------------------------- */
const inst = m => { const i = reg.makeInstance(m.type); i.params = Object.assign({}, i.params, JSON.parse(JSON.stringify(m.params))); return i; };
/* CONTROLS FIRST: three voices that must FAIL. If any of them passes, the checker cannot see what it claims to and every "ok"
   below would be the tool's, not the voice's (12 of 15 accusations were the tool, the last time a control was skipped). */
const CONTROLS = [
  { id: '_c1', name: 'control: range', stack: [{ type: 'pitch', params: { semitones: 99 } }] },
  { id: '_c2', name: 'control: key', stack: [{ type: 'reverb', params: { roomsize: 0.5 } }] },
  { id: '_c3', name: 'control: type', stack: [{ type: 'crackle', params: {} }] },
];
let bad = 0, controlFailed = 0;
for (const v of CONTROLS.concat(DATA.VOICES)) {
  const isControl = v.id.charAt(0) === '_';
  const errs = [], warns = [];
  if (v.stack.length > DATA.AFX_MAX) errs.push('stack of ' + v.stack.length + ' > AFX_MAX ' + DATA.AFX_MAX);
  v.stack.forEach(m => {
    const d = reg.get(m.type);
    if (!d) { errs.push('no audio effect "' + m.type + '"'); return; }
    const schema = reg.paramsOf(m.type) || [], def = reg.makeInstance(m.type).params;
    Object.keys(m.params).forEach(k => {
      const pd = schema.filter(q => q.key === k)[0], x = m.params[k];
      if (!pd) { errs.push(m.type + '.' + k + ' is not a control'); return; }
      if (typeof x !== 'number' || !isFinite(x)) { errs.push(m.type + '.' + k + ' is not a number'); return; }
      if (x < pd.min || x > pd.max) errs.push(m.type + '.' + k + ' = ' + x + ' is outside ' + pd.min + '..' + pd.max);
      if (pd.options && !pd.options.some(o => o[0] === x)) errs.push(m.type + '.' + k + ' = ' + x + ' is not one of its options');
      if (def[k] === x && k !== 'style') warns.push(m.type + '.' + k + ' = ' + x + ' is already the default');
    });
  });
  if (!errs.length) {
    // the load sanitiser keeps every value as written
    const lay = [{ id: 'v' + v.id, type: 'audio', name: v.name, start: 0, duration: 5, transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }, audioFx: v.stack.map(inst) }];
    try {
      if (FM.storage && FM.storage._sanitizeLayers) {
        FM.storage._sanitizeLayers(lay);
        const got = lay[0].audioFx || [];
        if (got.length !== v.stack.length) errs.push('the sanitiser kept ' + got.length + ' of ' + v.stack.length);
        v.stack.forEach((m, i) => Object.keys(m.params).forEach(k => { if (!got[i] || got[i].params[k] !== m.params[k]) errs.push('sanitiser: ' + m.type + '.' + k + ' ' + m.params[k] + ' -> ' + (got[i] && got[i].params[k])); }));
      } else warns.push('FM.storage._sanitizeLayers not loaded — sanitiser not checked');
    } catch (e) { errs.push('sanitiser threw: ' + (e && e.message)); }
    // build, schedule (export) and drive live, at both rates
    for (const sr of [44100, 48000]) {
      problems = []; overs = [];
      try {
        const c = new Ctx(sr), ch = FM.buildAudioFxChain(c, { audioFx: v.stack.map(inst) }, 0);
        if (!ch || !ch.input || !ch.output) throw new Error('no chain');
        ch.schedule(0, 5); if (ch.dispose) ch.dispose();
        const lc = new Ctx(sr), live = FM.buildAudioFxChain(lc, { audioFx: v.stack.map(inst) });
        live.applyAt(1); lc.currentTime = 0.016; live.applyAt(1.016); lc.currentTime = 0.5; live.applyAt(1.5);
      } catch (e) { errs.push(sr + ' Hz: ' + (e && e.message) + (problems.length ? ' (' + problems.join('; ') + ')' : '')); }
      if (overs.length) errs.push(sr + ' Hz: past a maximum: ' + overs.slice(0, 3).join('; '));
    }
  }
  if (isControl) { if (errs.length) controlFailed++; else console.log('CONTROL PASSED (it must fail): ' + v.name); continue; }
  if (errs.length) bad++;
  console.log((errs.length ? 'FAIL ' : 'ok   ') + v.name.padEnd(14) + ' ' + v.stack.map(m => m.type).join(' + ').padEnd(40) + (errs.length ? ' ' + errs.join(' | ') : '') + (warns.length ? '  (note: ' + warns.join('; ') + ')' : ''));
}
if (controlFailed !== CONTROLS.length) { console.log('---- THE CHECKER IS BLIND: ' + (CONTROLS.length - controlFailed) + ' control(s) passed — nothing above means anything'); process.exitCode = 2; }
else {
  console.log('---- ' + (DATA.VOICES.length - bad) + ' of ' + DATA.VOICES.length + ' voices build (and all ' + CONTROLS.length + ' controls failed, as they must)');
  process.exitCode = bad ? 1 : 0;
}
