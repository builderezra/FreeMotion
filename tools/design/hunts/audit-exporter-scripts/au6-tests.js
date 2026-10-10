  /* ════════ AU6: audit of js/exporter.js. Append before `async function run()` in tests/tests.js; `?only=AU6` runs them. ════════
     THE CONTAINER HAS NO H.264 AND NO AAC (VP9, VP8, AV1 and Opus only), so run() cannot finish on a stock encoder here. The two
     encoder tests put a spy in front of VideoEncoder / AudioEncoder that hands the export a codec this browser CAN encode (VP9,
     Opus) under the name the exporter asks for; everything else in run() is the real code. On a browser that has H.264 and AAC
     the spy is not needed, and the same assertions hold with it in place. */
  const au6Spy = function (kind, opts) {
    const o = opts || {};
    const Real = window[kind], made = [], frames = [];
    const realCS = Real.isConfigSupported.bind(Real);
    const swap = kind === 'VideoEncoder' ? { codec: 'vp09.00.10.08' } : { codec: 'opus' };
    class Spy extends Real {
      constructor(init) { super(init); made.push(this); this._n = 0; this._idx = made.length; }
      configure(cfg) { const c = Object.assign({}, cfg, swap); if (kind === 'AudioEncoder') { delete c.bitrate; } return super.configure(c); }
      encode(x, y) { frames.push(x); if (o.throwAt && (!o.instance || o.instance === this._idx) && ++this._n === o.throwAt) throw new Error('au6 boom: encode'); return y === undefined ? super.encode(x) : super.encode(x, y); }
      static isConfigSupported(c) { const d = Object.assign({}, c, swap); if (kind === 'AudioEncoder') delete d.bitrate; return realCS(d); }
    }
    window[kind] = Spy;
    return { made: made, frames: frames, restore: function () { window[kind] = Real; } };
  };
  test('AU6-1 an MP4 export that fails part-way (a layer that will not draw, an encoder that throws) closes its video encoder and every frame it made', { item: 'AU6', budgetMs: 60000 }, async function () {
    if (typeof VideoEncoder === 'undefined' || typeof window.Mp4Muxer === 'undefined') throw new Error('setup: no WebCodecs or muxer here');
    const saved = { layers: FM.scene.layers.slice(), dur: FM.scene.project.duration, w: FM.scene.project.width, h: FM.scene.project.height, fps: FM.scene.project.fps, time: FM.time };
    const realRS = FM.renderScene;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    let spy = null;
    try {
      FM.scene.layers.length = 0; FM.scene.project.width = 160; FM.scene.project.height = 90; FM.scene.project.duration = 2; FM.scene.project.fps = 10;
      const L = FM.makeLayer('shape', { shape: 'rect', x: 10, y: 45, shapeW: 20, shapeH: 20, fill: '#ff0000' }); L.start = 0; L.duration = 2; FM.scene.layers.push(L);
      const go = async function (extra) {
        FM._exportCancel = false;
        // a failed export KEEPS its saved render by design (crash-resume), and the next one with the same settings resumes from it, so the
        // frame the test injects its failure at would never be reached: start each run from an empty store
        if (FM.exportResume) { try { await FM.exportResume.clear(); } catch (e) {} }
        let err = null, ready = null;
        try { await FM.exporter.run(Object.assign({ scale: 1, fps: 10, name: 'au6', onProgress: function () {}, onReady: function (r) { ready = r; } }, extra || {})); }
        catch (e) { err = e && e.message; }
        return { err: err, ready: ready };
      };
      const open = function (s) { return s.made.filter(function (e) { return e.state !== 'closed'; }).length; };
      // CONTROL: a clean export finishes with 20 frames, closes its encoder and releases the flag
      spy = au6Spy('VideoEncoder');
      let r = await go();
      if (r.err) throw new Error('CONTROL: the clean export failed: ' + r.err);
      if (!r.ready || Math.round(r.ready.seconds * r.ready.fps) !== 20) throw new Error('CONTROL: the clean export is not 20 frames');
      if (spy.made.length !== 1 || open(spy)) throw new Error('CONTROL: the clean export left ' + open(spy) + ' of ' + spy.made.length + ' encoders open');
      // CONTROL: a Cancel closes it (the branch that always did)
      spy.made.length = 0; let n = 0;
      r = await go({ onProgress: function () { if (++n === 5) FM._exportCancel = true; } });
      if (r.err !== 'CANCELLED') throw new Error('CONTROL: the cancelled export ended with ' + r.err);
      if (open(spy)) throw new Error('CONTROL: a cancelled export left an encoder open');
      // 1: the sixth frame fails to draw
      spy.made.length = 0; let k = 0;
      FM.renderScene = function () { if (++k === 6) throw new Error('au6 boom: render'); return realRS.apply(this, arguments); };
      r = await go(); FM.renderScene = realRS;
      if (r.err !== 'au6 boom: render') throw new Error('setup: the injected render failure did not reach the caller (' + r.err + ')');
      if (FM._exporting) throw new Error('the export flag is still on after a failure');
      if (open(spy)) throw new Error('an export that failed while drawing frame 6 left ' + open(spy) + ' video encoder(s) configured: it is only closed by the Cancel branches, so every failed export holds a hardware encoder until the page goes');
      // 2: the encoder itself throws on the fourth frame; the frame in hand must be closed too
      spy.restore(); spy = au6Spy('VideoEncoder', { throwAt: 4 });
      r = await go();
      if (r.err !== 'au6 boom: encode') throw new Error('setup: the injected encode failure did not reach the caller (' + r.err + ')');
      if (open(spy)) throw new Error('a throwing encode left an encoder open');
      const alive = spy.frames.filter(function (f) { return f.format !== null; }).length;
      if (alive) throw new Error(alive + ' VideoFrame(s) were never closed after the encoder threw on the one it was handed');
    } finally {
      if (spy) spy.restore();
      if (FM.exportResume) { try { await FM.exportResume.clear(); } catch (e) {} }
      FM.renderScene = realRS; FM._exportCancel = false; FM._exporting = false;
      FM.scene.layers = saved.layers; FM.scene.project.duration = saved.dur; FM.scene.project.width = saved.w; FM.scene.project.height = saved.h; FM.scene.project.fps = saved.fps; FM.time = saved.time;
      try { FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });
  test('AU6-2 a soundtrack encode that throws part-way closes its audio encoder and the AudioData in hand', { item: 'AU6', budgetMs: 30000 }, async function () {
    if (typeof AudioEncoder === 'undefined' || !FM._encodeAudio) throw new Error('setup: no AudioEncoder or seam here');
    const SR = 48000, len = SR;   // one second, mono
    const buf = new AudioBuffer({ numberOfChannels: 1, length: len, sampleRate: SR });
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.sin(2 * Math.PI * 440 * i / SR) * 0.3;
    const mix = { audioBuffer: buf, sampleRate: SR, channels: 1 };
    let spy = au6Spy('AudioEncoder');
    try {
      // CONTROL: the clean encode produces chunks and closes its encoder
      const chunks = []; await FM._encodeAudio(function (c) { chunks.push(c); }, mix);
      if (!chunks.length) throw new Error('CONTROL: the clean encode made no chunks');
      const open = function () { return spy.made.filter(function (e) { return e.state !== 'closed'; }).length; };
      if (!spy.made.length || open()) throw new Error('CONTROL: the clean encode left ' + open() + ' of ' + spy.made.length + ' encoders open');
      // 1: the SOUNDTRACK encoder (the second one made; the first is the warm-up probe) throws on its fifth frame
      spy.restore(); spy = au6Spy('AudioEncoder', { throwAt: 5, instance: 2 });
      let err = null; try { await FM._encodeAudio(function () {}, mix); } catch (e) { err = e && e.message; }
      if (err !== 'au6 boom: encode') throw new Error('setup: the injected failure did not reach the caller (' + err + ')');
      let live = spy.made.filter(function (e) { return e.state !== 'closed'; }).length;
      if (live) throw new Error('a soundtrack encode that threw left ' + live + ' audio encoder(s) configured (the export then drops its sound and carries on, holding the encoder)');
      const openData = spy.frames.filter(function (a) { return a.numberOfFrames !== 0; }).length;
      if (openData) throw new Error(openData + ' AudioData object(s) were never closed after the encoder threw');
      // 2: the WARM-UP probe (the first one made) throws; the export must carry on without the trim and leave nothing open
      spy.restore(); spy = au6Spy('AudioEncoder', { throwAt: 5, instance: 1 });
      const got2 = []; await FM._encodeAudio(function (c) { got2.push(c); }, mix);
      if (!got2.length) throw new Error('with the warm-up probe failing, the soundtrack still has to encode (no chunks came out)');
      live = spy.made.filter(function (e) { return e.state !== 'closed'; }).length;
      if (live) throw new Error('the warm-up probe threw and left ' + live + ' audio encoder(s) configured');
    } finally { spy.restore(); }
  });
  test('AU6-3 the pure export arithmetic: the mix limiter equals a plain reference across its block edges and never passes the ceiling, the streaming MP4 sink reproduces a dense buffer byte for byte, and the fit rectangle always fits', { item: 'AU6', budgetMs: 60000 }, async function () {
    let seed = 5; const rnd = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const ref = function (chs, ceil, sr) {
      const n = chs[0].length, A = Math.max(1, Math.round(0.005 * sr)), fall = 1 / A, rise = 1 / Math.max(1, Math.round(0.25 * sr));
      const r = new Float32Array(n); let cur = 1;
      for (let i = 0; i < n; i++) { let a = 0; chs.forEach(function (c) { const v = Math.abs(c[i]); if (v > a) a = v; }); const need = a > ceil ? ceil / a : 1; cur = Math.min(need, cur + rise); r[i] = cur; }
      const g = new Float32Array(n); for (let i = n - 1; i >= 0; i--) g[i] = i === n - 1 ? r[i] : Math.min(r[i], g[i + 1] + fall);
      return g;
    };
    for (let t = 0; t < 8; t++) {
      const sr = 48000, n = 70000 + Math.floor(rnd() * 80000), nc = 1 + Math.floor(rnd() * 2);
      const buf = new AudioBuffer({ numberOfChannels: nc, length: n, sampleRate: sr }), chs = [];
      for (let c = 0; c < nc; c++) { const d = buf.getChannelData(c); chs.push(d); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * 0.4; }
      const B = 32768;
      [B - 1, B, B - 240, 2 * B - 5, 2 * B + 1].concat(Array.from({ length: 5 }, function () { return Math.floor(rnd() * n); })).forEach(function (s) { for (let k = 0; k < 30; k++) { const i = s + k; if (i < n) chs.forEach(function (d) { d[i] = (rnd() < .5 ? -1 : 1) * (1 + rnd() * 3); }); } });
      const orig = chs.map(function (d) { return Float32Array.from(d); }), g = ref(orig, 0.995, sr);
      FM._limitMix(buf, 0.995);
      let pk = 0, md = 0;
      for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) { const v = Math.abs(chs[c][i]); if (v > pk) pk = v; const df = Math.abs(chs[c][i] - orig[c][i] * g[i]); if (df > md) md = df; }
      if (pk > 0.9951) throw new Error('limiter round ' + t + ': the loudest output sample is ' + pk + ', over the 0.995 ceiling');
      if (md > 1e-4) throw new Error('limiter round ' + t + ': differs from the plain reference by ' + md + ' (a block edge?)');
    }
    for (let t = 0; t < 120; t++) {
      const sink = FM._createMp4Sink('video/mp4', 1 + Math.floor(rnd() * 64)), want = new Uint8Array(4096); let len = 0;
      for (let w = 0, W = 1 + Math.floor(rnd() * 30); w < W; w++) {
        const sz = 1 + Math.floor(rnd() * 60), data = new Uint8Array(sz); for (let i = 0; i < sz; i++) data[i] = 1 + Math.floor(rnd() * 254);
        const m = rnd(), pos = (m < 0.55 || !len) ? len : m < 0.7 ? len + Math.floor(rnd() * 8) : Math.floor(rnd() * len);
        sink.onData(data, pos); want.set(data, pos); len = Math.max(len, pos + sz);
      }
      const got = new Uint8Array(await sink.finish().arrayBuffer());
      if (got.length !== len) throw new Error('sink round ' + t + ': ' + got.length + ' bytes, expected ' + len);
      for (let i = 0; i < len; i++) if (got[i] !== want[i]) throw new Error('sink round ' + t + ': byte ' + i + ' is ' + got[i] + ', expected ' + want[i]);
    }
    for (let t = 0; t < 1500; t++) {
      const pw = 1 + Math.floor(rnd() * 4000), ph = 1 + Math.floor(rnd() * 4000), ow = 2 + Math.floor(rnd() * 4000), oh = 2 + Math.floor(rnd() * 4000), f = FM.exportFitRect(pw, ph, ow, oh);
      if (f.dx < -1e-6 || f.dy < -1e-6 || f.dx + f.dw > ow + 1e-6 || f.dy + f.dh > oh + 1e-6 || Math.abs(f.dw / f.dh - pw / ph) > 1e-6) throw new Error('fit rect ' + pw + 'x' + ph + ' into ' + ow + 'x' + oh + ' is ' + JSON.stringify(f));
    }
  });
