  /* ════════ P18: repro tests for #1056, #1059, #1060, #1061 (#1057 is a plan only: it needs a device run first). Append before `async function run()`. ════════ */
  test('P18 #1056 Mosaic Average: the edge tile of a cutout keeps the cutout’s colour (the mean is weighted by alpha); an opaque plate is byte-identical to the flat mean; Centre pixel is untouched', { item: '1056' }, async function () {
    const fn = FM._FX_TABLES && FM._FX_TABLES.PIXEL_FX && FM._FX_TABLES.PIXEL_FX.mosaic;
    if (!fn) throw new Error('FM._FX_TABLES.PIXEL_FX.mosaic is not reachable');
    const W = 64, H = 32, mk = () => { const d = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < 24; x++) { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 255; } return d; };   // a white cutout, x < 24, on transparent black
    const px = (d, x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
    const d = mk(); fn(d, W, H, { size: 16 }, 0.5, 1);
    const inside = px(d, 4, 4), edge = px(d, 20, 4), outside = px(d, 40, 4);
    if (inside.join() !== '255,255,255,255') throw new Error('CONTROL: a fully opaque tile is ' + inside);
    if (outside[3] !== 0) throw new Error('CONTROL: a fully transparent tile has alpha ' + outside[3]);
    if (edge[3] < 120 || edge[3] > 135) throw new Error('CONTROL: the half-covered tile should be about half opaque, alpha ' + edge[3]);
    if (Math.min(edge[0], edge[1], edge[2]) < 250) throw new Error('the edge tile is ' + edge.slice(0, 3) + ' — the cutout is white, so the rim should be white too (it is pulled dark by the transparent pixels, #1056)');
    const c = mk(); fn(c, W, H, { size: 16, sample: 1 }, 0.5, 1);
    if (px(c, 20, 4).join() !== '0,0,0,0') throw new Error('CONTROL: Centre pixel changed: ' + px(c, 20, 4));   // its centre pixel (x 24) is transparent
    // byte identity on an opaque plate: the flat mean the old code took
    const o = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < W * H; i++) { o[i * 4] = (i * 7) % 256; o[i * 4 + 1] = (i * 13) % 256; o[i * 4 + 2] = (i * 29) % 256; o[i * 4 + 3] = 255; }
    const want = new Uint8ClampedArray(o.length);
    for (let by = 0; by < H; by += 16) for (let bx = 0; bx < W; bx += 16) { let r = 0, g = 0, b = 0, n = 0; for (let y = by; y < by + 16; y++) for (let x = bx; x < bx + 16; x++) { const i = (y * W + x) * 4; r += o[i]; g += o[i + 1]; b += o[i + 2]; n++; } for (let y = by; y < by + 16; y++) for (let x = bx; x < bx + 16; x++) { const i = (y * W + x) * 4; want[i] = r / n; want[i + 1] = g / n; want[i + 2] = b / n; want[i + 3] = 255; } }
    const got = o.slice(); fn(got, W, H, { size: 16 }, 0.5, 1);
    let diff = 0; for (let i = 0; i < got.length; i++) if (got[i] !== want[i]) diff++;
    if (diff) throw new Error('an opaque plate changed in ' + diff + ' bytes against the flat mean: existing projects would look different');
  });

  test('P18 #1059 Detect speech: a clip with no sound is skipped and the next clip is tried (whole-project scope), instead of "Speech detection failed"', { item: '1059' }, async function () {
    const toasts = [], realToast = FM.toast, realDec = FM.decodeAudio, realDet = FM.detectSpeech, ids = [];
    const mkClip = name => { const l = FM.makeLayer('video', { name: name, start: 0, duration: 4 }); FM.scene.layers.push(l); ids.push(l.id); FM.media.set(l.id, { kind: 'video', file: new File(['x'], name + '.mp4'), width: 320, height: 240, duration: 4 }); return l; };
    const cap = FM.makeLayer('text', { name: 'Caps', start: 0, duration: 4, text: '' });
    FM.scene.layers.push(cap); ids.push(cap.id);
    try {
      const silent = mkClip('Silent'), talk = mkClip('Talk');
      FM.toast = function (m) { toasts.push(String(m)); };
      FM.decodeAudio = async function (file) { return /Silent/.test(file.name) ? null : { sampleRate: 8000, duration: 4 }; };
      FM.detectSpeech = async function () { return { segments: [{ start: 0.5, end: 1.5 }], stats: {} }; };
      FM._capScope = 'project'; FM._capSrcId = null;
      const wrap = FM.captionsEditor.detectRow(cap, function () {});
      const btn = wrap.querySelector('.cap-detect-btn');
      if (!btn || btn.disabled) throw new Error('CONTROL: no enabled Detect speech button');
      btn.click();
      for (let i = 0; i < 100 && (btn.disabled || !toasts.length); i++) await new Promise(r => setTimeout(r, 30));
      if (toasts.some(t => /Speech detection failed/.test(t))) throw new Error('the silent first clip ended the search: "' + toasts.join(' | ') + '" (#1059)');
      if (!toasts.some(t => /cue/.test(t))) throw new Error('no cue was made from the clip that talks: "' + toasts.join(' | ') + '"');
      // a clip the file's tracks already say has NO audio is skipped without being decoded at all
      toasts.length = 0; let decoded = [];
      FM.media.get(silent.id).hasAudioTrack = false;
      FM.decodeAudio = async function (file) { decoded.push(file.name); return { sampleRate: 8000, duration: 4 }; };
      const wrap2 = FM.captionsEditor.detectRow(cap, function () {}), btn2 = wrap2.querySelector('.cap-detect-btn');
      btn2.click();
      for (let i = 0; i < 100 && (btn2.disabled || !toasts.length); i++) await new Promise(r => setTimeout(r, 30));
      if (decoded.indexOf('Silent.mp4') >= 0) throw new Error('a clip known to have no audio was decoded anyway: ' + decoded);
      if (decoded.indexOf('Talk.mp4') < 0) throw new Error('CONTROL: the clip with sound was never tried: ' + decoded);
      // every clip silent: one plain line, not "Speech detection failed"
      toasts.length = 0; FM.media.get(talk.id).hasAudioTrack = false;
      const wrap3 = FM.captionsEditor.detectRow(cap, function () {}), btn3 = wrap3.querySelector('.cap-detect-btn');
      btn3.click();
      for (let i = 0; i < 100 && (btn3.disabled || !toasts.length); i++) await new Promise(r => setTimeout(r, 30));
      if (!toasts.some(t => /no(ne)?\b.*sound/i.test(t)) || toasts.some(t => /failed/i.test(t))) throw new Error('with no sound anywhere the line is "' + toasts.join(' | ') + '"');
    } finally {
      FM.toast = realToast; FM.decodeAudio = realDec; FM.detectSpeech = realDet; FM._capScope = null;
      FM.scene.layers = FM.scene.layers.filter(l => ids.indexOf(l.id) < 0); ids.forEach(id => { try { FM.media.remove(id); } catch (e) {} });
    }
  });

  test('P18 #1060 the service worker and the version chip only touch this app’s own caches and registrations (the origin is shared with Listing Kit)', { item: '1060' }, async function () {
    const src = await fetch('../sw.js?probe=1').then(r => r.text());
    const handlers = {}, deleted = [];
    const scope = { addEventListener: (t, fn) => { (handlers[t] = handlers[t] || []).push(fn); }, skipWaiting: () => {}, clients: { claim: () => Promise.resolve() }, location: { origin: location.origin } };
    const cachesStub = { open: () => Promise.resolve({}), keys: () => Promise.resolve(['freemotion-v0', 'freemotion-v1', 'listingkit-v3', 'other']), delete: k => { deleted.push(k); return Promise.resolve(true); } };
    new Function('self', 'caches', 'fetch', 'Response', 'URL', src)(scope, cachesStub, function () { return Promise.reject(new Error('n/a')); }, Response, URL);
    if (!handlers.activate || !handlers.activate.length) throw new Error('sw.js has no activate handler any more');
    let waited = null; handlers.activate[0]({ waitUntil: p => { waited = p; } }); await waited;
    if (deleted.indexOf('freemotion-v0') < 0) throw new Error('CONTROL: the worker did not drop its own superseded cache (' + deleted + ')');
    if (deleted.indexOf('freemotion-v1') >= 0) throw new Error('the worker deleted its own CURRENT cache');
    if (deleted.some(k => !/^freemotion-/.test(k))) throw new Error('the worker deleted caches that are not freemotion-*: ' + deleted.filter(k => !/^freemotion-/.test(k)) + ' (#1060)');
    if (typeof window.fmOwnCaches !== 'function' || typeof window.fmOwnRegs !== 'function') throw new Error('the version chip has no fmOwnCaches / fmOwnRegs (it deletes every cache and unregisters every worker on the origin)');
    const own = new URL('./', location.href).href;
    const regs = window.fmOwnRegs([{ scope: own }, { scope: location.origin + '/ListingKit/' }, { scope: 'https://other.example/' }]);   // own is the folder this page lives in; a sibling app's scope is a different folder on the same origin
    if (regs.length !== 1 || regs[0].scope !== own) throw new Error('fmOwnRegs kept ' + regs.map(r => r.scope));
    const ks = window.fmOwnCaches(['freemotion-v1', 'listingkit-v3', 'workbox-x']);
    if (ks.join() !== 'freemotion-v1') throw new Error('fmOwnCaches kept ' + ks);
    // and the chip really goes through them (the helpers alone would prove nothing if the handler ignored them)
    const html = await fetch('../index.html?probe=' + Date.now()).then(r => r.text());
    if (!/fmOwnRegs\(rs\)\.map/.test(html) || !/fmOwnCaches\(ks\)\.map/.test(html)) throw new Error('the version chip no longer filters its registrations and caches through fmOwnRegs / fmOwnCaches');
    if (/\brs\.map\(function \(r\) \{ return r\.unregister/.test(html) || /\bks\.map\(function \(k\) \{ return caches\.delete/.test(html)) throw new Error('the version chip still unregisters every worker or deletes every cache on the origin');
  });

  test('P18 #1061 a hold speed key that drops sharply: the source advance is exact after the step, and a split does not change it', { item: '1061' }, async function () {
    const mk = start => { const l = FM.makeLayer('video', { name: 'S', start: start, duration: 2 }); l.id = 'p18-1061-' + Math.random().toString(36).slice(2); return l; };
    const A = mk(10), ts = 0.5 + 0.4 / 120;
    A.speed = { kf: [{ t: 10, v: 100 }, { t: 10 + ts, v: 1, e: 'hold' }] };
    const adv = FM.layerSourceAdvance(A, 1.5), want = 100 * ts + 1 * (1.5 - ts);
    if (Math.abs(adv - want) > 0.001) throw new Error('advance at 1.5 s is ' + adv.toFixed(4) + ', exact is ' + want.toFixed(4) + ' (off by ' + (adv - want).toFixed(4) + ' s, #1061)');
    // a split at start + 0.3041 (NOT on the 120 Hz grid: +0.25 is exactly 30 samples, so the two grids coincide and a split there cannot show the error): the second half's advance at the
    // same project time must agree with the unsplit clip
    const SPL = 0.3041, B = mk(10 + SPL); B.duration = 2 - SPL; B.speed = { kf: A.speed.kf.map(k => Object.assign({}, k)) };
    const whole = FM.layerSourceAdvance(A, 1.2), second = FM.layerSourceAdvance(A, SPL) + FM.layerSourceAdvance(B, 1.2 - SPL);
    if (Math.abs(whole - second) > 0.001) throw new Error('split at +' + SPL + ': the unsplit clip is at ' + whole.toFixed(4) + ' and the two halves give ' + second.toFixed(4) + ' (off by ' + (second - whole).toFixed(4) + ' s, a split should be invisible)');
    // a smooth ramp and a plain static clip are unchanged by the fix
    const R = mk(0); R.speed = { kf: [{ t: 0, v: 1 }, { t: 2, v: 3, e: 'linear' }] };
    if (Math.abs(FM.layerSourceAdvance(R, 1.2) - (1.2 + 0.72)) > 1e-3) throw new Error('a linear ramp moved: ' + FM.layerSourceAdvance(R, 1.2));
    // …and BEFORE the first key that falls inside a sample interval the table is bit for bit what it was (the old trapezoid, copied here)
    const R2 = mk(0); R2.speed = { kf: [{ t: 0, v: 1 }, { t: 0.5 + 0.3 / 120, v: 2, e: 'linear' }, { t: 2, v: 3, e: 'linear' }] };
    const SR = 120, tabOld = [0]; let acc = 0, prev = Math.max(0.05, FM.evalProp(R2.speed, 0));
    for (let i = 1; i < SR * 2 + 2; i++) { const v = Math.max(0.05, FM.evalProp(R2.speed, i / SR)); acc += (prev + v) / (2 * SR); tabOld.push(acc); prev = v; }
    [0.1, 0.25, 0.4].forEach(into => { const x = into * SR, i0 = Math.floor(x), f = x - i0, want = tabOld[i0] + (tabOld[i0 + 1] - tabOld[i0]) * f; if (Math.abs(FM.layerSourceAdvance(R2, into) - Math.fround(want)) > 1e-6 && FM.layerSourceAdvance(R2, into) !== want) throw new Error('before the key the advance at ' + into + ' moved: ' + FM.layerSourceAdvance(R2, into) + ' vs ' + want); });
  });
