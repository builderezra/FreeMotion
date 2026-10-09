  /* ════════ P22: repro tests for #1086, #1087, #1088, #1089 (thumbnail). Append before `async function run()` in tests/tests.js; `?only=P22` runs them. ════════
     This container has no H.264 / AAC: the #1086 test puts a spy in front of VideoEncoder / AudioEncoder that hands the export a codec the browser CAN encode
     (VP9, Opus) under the name the exporter asks for; the rest of run() is the real code. */
  const p22Spy = function (kind) {
    const Real = window[kind], realCS = Real.isConfigSupported.bind(Real);
    const swap = kind === 'VideoEncoder' ? { codec: 'vp09.00.10.08' } : { codec: 'opus' };
    class Spy extends Real {
      configure(cfg) { const c = Object.assign({}, cfg, swap); if (kind === 'AudioEncoder') delete c.bitrate; return super.configure(c); }
      static isConfigSupported(c) { const d = Object.assign({}, c, swap); if (kind === 'AudioEncoder') delete d.bitrate; return realCS(d); }
    }
    window[kind] = Spy;
    return function () { window[kind] = Real; };
  };
  const p22Tone = function (seconds, amp) {
    const SR = 48000, ab = new AudioBuffer({ numberOfChannels: 1, length: Math.round(seconds * SR), sampleRate: SR });
    const d = ab.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.sin(2 * Math.PI * 440 * i / SR) * (amp || 0.3);
    return ab;
  };
  const p22Scene = function (fn) {
    const saved = { layers: FM.scene.layers.slice(), dur: FM.scene.project.duration, w: FM.scene.project.width, h: FM.scene.project.height, fps: FM.scene.project.fps, time: FM.time, sel: FM.scene.selectedId };
    const made = [];
    FM.scene.layers.length = 0; FM.scene.project.width = 160; FM.scene.project.height = 90; FM.scene.project.duration = 2; FM.scene.project.fps = 10;
    const clip = function (name, rec, over) {
      const L = FM.makeLayer('video', { name: name, start: 0, duration: 2, trimStart: 0 });
      L.start = 0; L.duration = 2; L.volume = 1; Object.assign(L, over || {});
      FM.media.set(L.id, Object.assign({ kind: 'video', duration: 2, width: 0, height: 0 }, rec)); made.push(L); FM.scene.layers.push(L); return L;
    };
    const done = function () {
      made.forEach(function (L) { try { FM.media.remove(L.id); } catch (e) {} });
      FM.scene.layers = saved.layers; FM.scene.project.duration = saved.dur; FM.scene.project.width = saved.w; FM.scene.project.height = saved.h; FM.scene.project.fps = saved.fps; FM.time = saved.time; FM.scene.selectedId = saved.sel;
      try { FM.refreshAll(); } catch (e) {}
    };
    return { clip: clip, done: done };
  };
  test('P22 #1086 a file that HAS a soundtrack but is missing one clip\'s sound says so on the ready card, instead of "Sound ✓"', { item: '1086', budgetMs: 60000 }, async function () {
    if (typeof VideoEncoder === 'undefined' || typeof AudioEncoder === 'undefined' || !FM._exportSoundText) throw new Error('setup: no WebCodecs here, or the card seam is missing');
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const undoV = p22Spy('VideoEncoder'), undoA = p22Spy('AudioEncoder');
    const S = p22Scene();
    try {
      const go = async function () {
        if (FM.exportResume) { try { await FM.exportResume.clear(); } catch (e) {} }
        FM._exportCancel = false; let ready = null, err = null;
        try { await FM.exporter.run({ scale: 1, fps: 10, name: 'p22', onProgress: function () {}, onReady: function (r) { ready = r; } }); } catch (e) { err = e && e.message; }
        if (err) throw new Error('setup: the export failed: ' + err);
        return ready;
      };
      // CONTROL: one good clip, nothing missing: "Sound ✓"
      S.clip('good song', { file: new Blob(['x'], { type: 'audio/wav' }), audioBuffer: p22Tone(2) });
      let r = await go();
      if (!r.hasAudio) throw new Error('CONTROL: the good clip alone produced no soundtrack');
      if (FM._exportSoundText(r) !== 'Sound ✓') throw new Error('CONTROL: a complete soundtrack reads "' + FM._exportSoundText(r) + '"');
      // THE CASE: add a clip whose sound will not decode
      S.clip('bad clip', { file: new Blob(['this is not audio at all'], { type: 'audio/wav' }) });
      r = await go();
      if (!r.hasAudio || r.audioDropped) throw new Error('setup: with one good clip the file should still have a soundtrack (hasAudio ' + r.hasAudio + ', audioDropped ' + r.audioDropped + ')');
      if (!(FM._lastAudioDrops || []).some(function (d) { return /bad clip/.test(d); })) throw new Error('setup: the mixer did not name the bad clip (' + JSON.stringify(FM._lastAudioDrops) + ')');
      const text = FM._exportSoundText(r);
      if (/✓/.test(text) || !/missing/i.test(text) || !/1 clip\b/.test(text)) throw new Error('one clip\'s sound is missing from the file and the card reads "' + text + '" (audioMissing ' + r.audioMissing + ')');
    } finally { undoV(); undoA(); S.done(); if (FM.exportResume) { try { await FM.exportResume.clear(); } catch (e) {} } if (hadHome && FM.home && FM.home.open) FM.home.open(); }
  });
  test('P22 #1087 export does not decode a source over the size ceiling on a touch device, and does not keep the PCM it decoded', { item: '1087', budgetMs: 60000 }, async function () {
    const saved = window.matchMedia;
    const asTouch = function (touch) {
      window.matchMedia = function (q) { return /hover: hover\) and \(pointer: fine/.test(q) ? { matches: !touch, media: q, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} } : saved.call(window, q); };
    };
    const S = p22Scene();
    try {
      const big = function (rec) { const f = new Blob(['x'], { type: 'audio/wav' }); Object.defineProperty(f, 'size', { value: FM.media.WAVE_MAX_BYTES + 1024 }); return Object.assign(rec, { file: f }); };
      const wav = async function () { return FM.sfx.encodeWav(p22Tone(1)); };
      // CONTROL: a small real file on a touch device is decoded into the mix
      const small = S.clip('small', { file: await wav() });
      asTouch(true);
      let mix = await FM.exporter.buildAudioMix(FM.scene, 0, 2);
      if (!mix) throw new Error('CONTROL: a small decodable file on a touch device built no mix');
      // 1. release: the buffer the mix decoded is not kept
      if (FM.media.get(small.id).audioBuffer) throw new Error('after the mix was built the clip\'s whole decoded soundtrack is still on its record (' + FM.media.get(small.id).audioBuffer.length + ' samples)');
      // …a reversed clip keeps its buffer (its preview plays from it), and one a reader decoded earlier is not touched
      const rev = S.clip('reversed', { file: await wav() }, { reversed: true });
      const pre = S.clip('already decoded', { file: await wav(), audioBuffer: p22Tone(1) });
      await FM.exporter.buildAudioMix(FM.scene, 0, 2);
      if (!FM.media.get(rev.id).audioBuffer) throw new Error('a reversed clip lost its decoded buffer');
      if (!FM.media.get(pre.id).audioBuffer) throw new Error('a buffer somebody else had decoded was thrown away');
      // 2. the ceiling
      FM.scene.layers.length = 0;
      const huge = S.clip('huge source', big({}));
      FM._lastAudioDrops = [];
      asTouch(false);
      await FM.exporter.buildAudioMix(FM.scene, 0, 2);
      if ((FM._lastAudioDrops || []).some(function (d) { return /too big/.test(d); })) throw new Error('CONTROL: on a desktop the oversized source was refused (it must still be decoded there)');
      FM.media.get(huge.id).audioBuffer = undefined;
      asTouch(true);
      FM._lastAudioDrops = [];
      mix = await FM.exporter.buildAudioMix(FM.scene, 0, 2);
      const named = (FM._lastAudioDrops || []).filter(function (d) { return /huge source/.test(d) && /too big to read its sound on this device/.test(d); });
      if (!named.length) throw new Error('on a touch device a source over ' + Math.round(FM.media.WAVE_MAX_BYTES / 1048576) + ' MB was not refused by name (drops: ' + JSON.stringify(FM._lastAudioDrops) + ')');
      if (FM.media.get(huge.id).audioBuffer !== undefined) throw new Error('the refused source was decoded anyway');
    } finally { window.matchMedia = saved; S.done(); }
  });
  test('P22 #1088 an audio-only export hands its file over through the Save card (a fresh tap), and says "saved" only after a real hand-over', { item: '1088', budgetMs: 60000 }, async function () {
    if (typeof FM._runAudioOnlyExport !== 'function' || !FM.exporter || typeof FM.exporter.deliver !== 'function') throw new Error('setup: the audio export or exporter.deliver is not reachable');
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const S = p22Scene(); const card = document.getElementById('export-ready');
    const realDeliver = FM.exporter.deliver, realClick = HTMLAnchorElement.prototype.click, realToast = FM.toast;
    const clicks = [], delivered = [], toasts = [];
    try {
      S.clip('song', { file: new Blob(['x'], { type: 'audio/wav' }), audioBuffer: p22Tone(2) });
      HTMLAnchorElement.prototype.click = function () { if (this.download) { clicks.push(this.download); return; } return realClick.apply(this, arguments); };
      FM.toast = function (m) { toasts.push(String(m)); return realToast && realToast.apply(this, arguments); };
      let answer = 'downloaded';
      FM.exporter.deliver = async function (blob, name, type) { delivered.push({ size: blob.size, name: name, type: type }); return answer; };
      const sel = document.getElementById('exp-format'), was = sel && sel.value;
      const start = function () { return FM._runAudioOnlyExport({ m4a: false }); };
      let p = start();
      await sleep(900);
      if (clicks.length) throw new Error('the file was downloaded straight away (' + clicks.join(', ') + ') with no Save card and no tap — on an iPhone a click that comes minutes after the tap is the one that may never save');
      if (card.classList.contains('hidden')) throw new Error('no Save card came up for the audio export');
      const meta = document.getElementById('xr-meta').textContent, nm = document.getElementById('xr-name').textContent;
      if (!/\.wav$/.test(nm) || !/audio only/.test(meta) || /×/.test(meta)) throw new Error('the card does not describe an audio file: "' + nm + '" / "' + meta + '"');
      if (toasts.some(function (t) { return /Audio (exported|saved)/.test(t); })) throw new Error('"Audio exported/saved" was said before anybody tapped Save');
      // a dismissed share sheet is not a save: the card stays, nothing is announced
      answer = 'cancelled';
      document.getElementById('xr-save').click(); await sleep(150);
      if (card.classList.contains('hidden')) throw new Error('a dismissed share sheet closed the card');
      if (toasts.some(function (t) { return /Audio (exported|saved)/.test(t); })) throw new Error('"saved" was said after a dismissed share sheet');
      // a real hand-over closes it and says so, with the audio MIME type
      answer = 'downloaded';
      document.getElementById('xr-save').click(); await sleep(150);
      await p;
      if (!card.classList.contains('hidden')) throw new Error('the card is still up after a successful Save');
      if (!delivered.length || delivered[delivered.length - 1].type !== 'audio/wav' || !/\.wav$/.test(delivered[delivered.length - 1].name)) throw new Error('deliver() was not given an audio type and a .wav name: ' + JSON.stringify(delivered));
      if (!toasts.some(function (t) { return /Audio saved/.test(t); })) throw new Error('no "Audio saved" after a real hand-over (' + JSON.stringify(toasts.slice(-3)) + ')');
      // Discard: nothing delivered, nothing announced
      delivered.length = 0; toasts.length = 0;
      p = start(); await sleep(900);
      document.getElementById('xr-discard').click(); await p;
      if (delivered.length || toasts.some(function (t) { return /Audio saved|Audio exported/.test(t); })) throw new Error('Discard still delivered or announced the file');
      if (sel) sel.value = was;
    } finally {
      FM.exporter.deliver = realDeliver; HTMLAnchorElement.prototype.click = realClick; FM.toast = realToast;
      if (card) card.classList.add('hidden');
      S.done(); if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });
  test('P22 #1089 the card picture leaves no canvas holding pixels behind it', { item: '1089', budgetMs: 30000 }, async function () {
    if (!FM.storage || typeof FM.storage._makeThumb !== 'function') throw new Error('setup: the thumbnail seam is missing');
    const made = [], real = document.createElement.bind(document);
    const saved = { w: FM.scene.project.width, h: FM.scene.project.height, layers: FM.scene.layers.slice() };
    try {
      FM.scene.project.width = 1080; FM.scene.project.height = 1920;
      document.createElement = function (tag) { const el = real.apply(document, arguments); if (String(tag).toLowerCase() === 'canvas') made.push(el); return el; };
      const url = FM.storage._makeThumb();
      document.createElement = real;
      if (!url || url.indexOf('data:image/jpeg') !== 0) throw new Error('CONTROL: the thumbnail is not a JPEG data URL (' + String(url).slice(0, 30) + ')');
      if (made.length < 3) throw new Error('CONTROL: only ' + made.length + ' canvases were made for a 1080x1920 project, so the halving stages did not run');
      const held = made.filter(function (c) { return c.width > 0 && c.height > 0; });
      const bytes = held.reduce(function (n, c) { return n + c.width * c.height * 4; }, 0);
      if (held.length) throw new Error(held.length + ' of the ' + made.length + ' canvases the card picture made still hold pixels (' + (bytes / 1048576).toFixed(1) + ' MB): ' + held.map(function (c) { return c.width + 'x' + c.height; }).join(', '));
    } finally { document.createElement = real; FM.scene.project.width = saved.w; FM.scene.project.height = saved.h; try { FM.refreshAll(); } catch (e) {} }
  });
