/* FreeMotion — Audio React.
 * Turn a clip's loudness into motion: sample a normalized 0..1 loudness envelope for the clip
 * (optionally band-split into bass / mid / treble), then BAKE it onto any layer's transform prop as
 * ordinary keyframes you can drag afterwards. The envelope is the reusable primitive (a later live
 * "audio-drive" behavior calls it too); bake + the sheet are the user-facing wrappers.
 *
 * The source->timeline mapping (trim / speed / reverse) MUST match the EXPORTER's makeClipBuffer, or
 * the envelope would line up with something other than what is actually HEARD. So this file mirrors
 * js/exporter.js makeClipBuffer sample-for-sample: static speed reads startSample + i*sp (reversed
 * from the far end of the covered span), ramped speed resamples along FM.layerSourceAdvance's integral.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const BANDS = { overall: 1, bass: 1, mid: 1, treble: 1 };
  const PROP_OK = { scale: 1, opacity: 1, rotation: 1, x: 1, y: 1 };

  // ---- audio plumbing ---------------------------------------------------------------------------

  // Decode (once) into the same media-rec slot getWaveform / audio-tools use. null => no audio track.
  async function getBuffer(layer) {
    const m = FM.media && FM.media.get(layer.id);
    if (!m) return null;
    if (m.audioBuffer === undefined) {
      if (!m.file || !FM.decodeAudio) return null;
      m.audioBuffer = await FM.decodeAudio(m.file);
    }
    return m.audioBuffer || null;
  }

  function monoize(buf) {
    const n = buf.length, nc = Math.max(1, buf.numberOfChannels);
    const out = new Float32Array(n);
    for (let c = 0; c < nc; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i]; }
    if (nc > 1) { const inv = 1 / nc; for (let i = 0; i < n; i++) out[i] *= inv; }
    return out;
  }

  // Band-split OFFLINE (iOS caps live AudioContexts — never open one here). overall = raw buffer.
  async function renderBand(ab, band) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return null;
    let octx;
    try { octx = new OAC(ab.numberOfChannels, ab.length, ab.sampleRate); } catch (e) { return null; }
    const src = octx.createBufferSource(); src.buffer = ab;
    const bq = (type, freq) => { const f = octx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 0.707; return f; };
    let node = src;
    if (band === 'bass') { const lp = bq('lowpass', 200); node.connect(lp); node = lp; }
    else if (band === 'treble') { const hp = bq('highpass', 2000); node.connect(hp); node = hp; }
    else if (band === 'mid') { const hp = bq('highpass', 200), lp = bq('lowpass', 2000); node.connect(hp); hp.connect(lp); node = lp; }
    node.connect(octx.destination);
    src.start(0);
    try { return await octx.startRendering(); } catch (e) { return null; }
  }

  // Filtered, mono loudness source for a band — cached per (band,sampleRate) on the media rec so
  // re-opening the sheet or dragging a slider never re-renders the (slow) offline filter twice.
  // Leading '_' => FM.jsonReplacer keeps it out of save/history.
  async function bandMono(layer, ab, band) {
    const m = FM.media.get(layer.id);
    const sr = ab.sampleRate, key = band + '@' + sr;
    if (!m._audioBandCache) m._audioBandCache = {};
    if (m._audioBandCache[key]) return m._audioBandCache[key];
    let buf = ab;
    if (band !== 'overall') { const r = await renderBand(ab, band); buf = r || ab; }
    const mono = monoize(buf);
    m._audioBandCache[key] = mono;
    return mono;
  }

  // ---- the primitive ----------------------------------------------------------------------------

  // Loudness envelope for a clip, sampled across its TIMELINE span at opts.fps, aligned to what is
  // heard (trim/speed/reverse), values NORMALIZED 0..1. Returns null if the clip has no audio track.
  FM.audioEnvelope = async function (layer, opts) {
    opts = opts || {};
    const ab = await getBuffer(layer);
    if (!ab) return null;

    const P = FM.scene && FM.scene.project;
    const fps = Math.max(1, opts.fps || (P && P.fps) || 30);
    const band = BANDS[opts.band] ? opts.band : 'overall';
    const gain = (opts.gain != null) ? opts.gain : 1;
    const attack = (opts.attack != null) ? opts.attack : 0.02;
    const release = (opts.release != null) ? opts.release : 0.15;
    const floor = Math.max(0, Math.min(0.98, opts.floor || 0));

    const sr = ab.sampleRate;
    const mono = await bandMono(layer, ab, band);
    const len = mono.length;

    // ---- source->timeline mapping, mirroring exporter.js makeClipBuffer ----
    const trimStart = layer.trimStart || 0;
    const startSample = trimStart * sr;
    const availSec = Math.max(0, ab.duration - trimStart);
    const reversed = !!layer.reversed;
    const ramped = FM.isAnimated && FM.isAnimated(layer.speed);
    const totalAdv = ramped ? FM.layerSourceAdvance(layer, layer.duration) : 0;
    const spStatic = ramped ? 1 : (layer.speed || 1);
    const lenSec = ramped ? 0 : Math.min(layer.duration, availSec / (spStatic || 1));

    function srcSample(tLocal) {   // float source-sample index for a clip-local time, or -1 (silence)
      if (ramped) {
        const adv = FM.layerSourceAdvance(layer, tLocal);
        const posSec = reversed ? (totalAdv - adv) : adv;
        if (posSec < 0 || posSec > availSec) return -1;
        return startSample + posSec * sr;
      }
      if (tLocal < 0 || tLocal > lenSec) return -1;
      const from = reversed ? (lenSec - tLocal) : tLocal;
      return startSample + from * spStatic * sr;
    }

    const clipStart = layer.start || 0;
    const clipDur = Math.max(0, layer.duration || 0);
    const n = Math.max(1, Math.ceil(clipDur * fps));
    const minWin = Math.max(1, Math.round(sr / fps));   // a slow clip still integrates ~one output frame

    // window-RMS per output frame. The window spans the SOURCE segment actually heard in this frame —
    // i.e. from this frame's source position to the next frame's — so a sped-up clip (speed>1, or the
    // fast part of a ramp) integrates every source sample instead of a fixed 1/fps slice that would skip
    // ~(1 - 1/speed) of the audio and miss transients the export plays. Falls back to minWin at the ends.
    const rms = new Float32Array(n + 1);
    for (let i = 0; i <= n; i++) {
      const cs = srcSample(i / fps);
      if (cs < 0) { rms[i] = 0; continue; }
      const csAdj = srcSample((i < n ? i + 1 : i - 1) / fps);
      const span = (csAdj < 0) ? minWin : Math.abs(csAdj - cs);
      const win = Math.max(minWin, Math.round(span));
      let s0 = Math.round(cs) - (win >> 1), s1 = s0 + win;
      if (s0 < 0) s0 = 0;
      if (s1 > len) s1 = len;
      if (s1 <= s0) { rms[i] = 0; continue; }
      let acc = 0;
      for (let j = s0; j < s1; j++) { const v = mono[j]; acc += v * v; }
      rms[i] = Math.sqrt(acc / (s1 - s0));
    }

    // one-pole envelope follower: fast attack when rising, slow release when falling
    const aC = Math.exp(-1 / Math.max(1e-4, attack * fps));
    const rC = Math.exp(-1 / Math.max(1e-4, release * fps));
    const env = new Float32Array(n + 1);
    let e = 0;
    for (let i = 0; i <= n; i++) {
      const target = rms[i];
      const c = target > e ? aC : rC;
      e = target + (e - target) * c;
      if (!(e >= 0)) e = 0;   // NaN guard
      env[i] = e;
    }

    // normalize to peak, apply gain (clamp), apply floor as a noise gate + rescale [floor..1]->[0..1]
    let peak = 0;
    for (let i = 0; i <= n; i++) if (env[i] > peak) peak = env[i];
    const scale = peak > 1e-9 ? 1 / peak : 0;
    const invFloor = 1 / Math.max(1e-6, 1 - floor);
    const times = new Array(n + 1), values = new Array(n + 1);
    for (let i = 0; i <= n; i++) {
      let v = env[i] * scale;
      v *= gain;
      if (v > 1) v = 1; else if (!(v > 0)) v = 0;
      if (floor > 0) { v = (v - floor) * invFloor; if (v < 0) v = 0; else if (v > 1) v = 1; }
      values[i] = v;
      times[i] = clipStart + i / fps;
    }
    return { fps: fps, band: band, times: times, values: values, clipStart: clipStart, clipDur: clipDur };
  };

  // ---- synchronous accessor (for the live audio-drive behavior) ---------------------------------

  // A live behavior evaluates per frame and cannot await, so it needs the envelope NOW or not at all.
  // Signature captures every opt that changes the computed envelope (fps/band/gain/attack/release/floor);
  // two behaviors with the same settings share one cached envelope. Leading '_' => never serialized.
  function envSig(opts) {
    opts = opts || {};
    const P = FM.scene && FM.scene.project;
    const fps = Math.max(1, opts.fps || (P && P.fps) || 30);
    const band = BANDS[opts.band] ? opts.band : 'overall';
    const gain = (opts.gain != null) ? opts.gain : 1;
    const attack = (opts.attack != null) ? opts.attack : 0.02;
    const release = (opts.release != null) ? opts.release : 0.15;
    const floor = Math.max(0, Math.min(0.98, opts.floor || 0));
    return fps + '|' + band + '|' + gain + '|' + attack + '|' + release + '|' + floor;
  }

  // Return the cached envelope object for (layer,opts) if already computed, else return null and kick
  // off FM.audioEnvelope in the background (fire-and-forget) so a later frame gets it. A no-audio clip
  // caches null (via `sig in cache`) so it isn't re-decoded every frame. Allocation-free on the hit path.
  FM.audioEnvelopeSync = function (layer, opts) {
    if (!layer) return null;
    const m = FM.media && FM.media.get(layer.id);
    if (!m) return null;
    const sig = envSig(opts);
    const cache = m._audioEnvCache;
    if (cache && (sig in cache)) return cache[sig];
    if (!m._audioEnvPending) m._audioEnvPending = {};
    if (!m._audioEnvPending[sig]) {
      m._audioEnvPending[sig] = 1;
      Promise.resolve().then(function () { return FM.audioEnvelope(layer, opts); }).then(function (env) {
        if (!m._audioEnvCache) m._audioEnvCache = {};
        m._audioEnvCache[sig] = env || null;   // cache null too — a clip with no audio must not re-decode forever
        delete m._audioEnvPending[sig];
        if (env && FM.requestRender) FM.requestRender();
      }).catch(function () { if (m._audioEnvPending) delete m._audioEnvPending[sig]; });
    }
    return null;
  };

  // Sample a precomputed envelope object at SCENE time t: linear-interp between frames, 0 outside the
  // clip span. Frames are uniform (times[i] = clipStart + i/fps), so the index is O(1) — no allocation.
  FM.audioEnvelopeSampleAt = function (env, t) {
    if (!env) return 0;
    const cs = env.clipStart || 0, cd = env.clipDur || 0;
    if (!(t >= cs) || t > cs + cd) return 0;
    const vals = env.values;
    const n = vals ? vals.length : 0;
    if (n === 0) return 0;
    if (n === 1) { const v0 = vals[0]; return v0 >= 0 ? v0 : 0; }
    const fps = env.fps || 30;
    const f = (t - cs) * fps;   // fractional frame index
    if (f <= 0) { const v0 = vals[0]; return v0 >= 0 ? v0 : 0; }
    if (f >= n - 1) { const vn = vals[n - 1]; return vn >= 0 ? vn : 0; }
    const i = f | 0, frac = f - i;
    const a = vals[i], b = vals[i + 1];
    const v = a + (b - a) * frac;
    return v >= 0 ? v : 0;
  };

  // ---- RDP (single channel): mark which sample indices to KEEP as keyframes ----------------------
  function rdpKeep(times, vals, keep, tol) {
    const stack = [[0, vals.length - 1]];
    while (stack.length) {
      const seg = stack.pop(), a = seg[0], b = seg[1];
      if (b <= a + 1) continue;
      const t0 = times[a], v0 = vals[a], t1 = times[b], v1 = vals[b], dt = (t1 - t0) || 1e-6;
      let worst = -1, wd = tol;
      for (let i = a + 1; i < b; i++) {
        const pred = v0 + (v1 - v0) * (times[i] - t0) / dt;
        const d = Math.abs(vals[i] - pred);
        if (d > wd) { wd = d; worst = i; }
      }
      if (worst >= 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
    }
  }

  // ---- bake -------------------------------------------------------------------------------------

  FM.audioReact = {
    // Envelope -> mapped keyframes on target.transform[prop]. Returns keyframes written (0 on failure).
    async bake(layer, opts) {
      opts = opts || {};
      const env = await FM.audioEnvelope(layer, opts);
      if (!env) { if (FM.toast) FM.toast('This clip has no audio'); return 0; }
      const targetId = opts.targetLayerId || layer.id;
      const target = (FM.scene && FM.scene.layers.find(l => l.id === targetId)) || layer;
      const prop = opts.prop;
      if (!PROP_OK[prop] || !target || !target.transform) { if (FM.toast) FM.toast('Pick a property to drive'); return 0; }

      const outMin = (opts.outMin != null) ? opts.outMin : 0;
      const outMax = (opts.outMax != null) ? opts.outMax : 1;
      const range = outMax - outMin;
      const times = env.times, vals = env.values, N = vals.length;

      const mapped = new Array(N);
      for (let i = 0; i < N; i++) {
        let v = outMin + vals[i] * range;
        if (prop === 'opacity') { if (v < 0) v = 0; else if (v > 1) v = 1; }   // sane domains; rotation/x/y unclamped
        else if (prop === 'scale') { if (v < 0) v = 0; }
        mapped[i] = v;
      }

      // simplify like the tracker: sparse, hand-editable — never one keyframe per frame. Keep first & last.
      const keep = new Array(N).fill(0);
      keep[0] = keep[N - 1] = 1;
      const tol = Math.max(1e-4, Math.abs(range) * 0.02);
      rdpKeep(times, mapped, keep, tol);
      const kf = [];
      for (let i = 0; i < N; i++) if (keep[i]) kf.push({ t: times[i], v: mapped[i], e: 'linear' });
      if (kf.length < 2) { if (FM.toast) FM.toast('Could not build keyframes'); return 0; }

      target.transform[prop] = { kf: kf };
      if (FM.history) FM.history.commit();
      if (FM.requestRender) FM.requestRender();
      if (FM.timeline) FM.timeline.rebuild();
      if (FM.inspector) FM.inspector.refresh();
      if (FM.canvasEdit) FM.canvasEdit.update();
      if (FM.toast) FM.toast(kf.length + ' keyframes added — drag them to touch up');
      return kf.length;
    },

    openSheet: openSheet,
  };

  // ---- sheet ------------------------------------------------------------------------------------

  const PROP_META = {
    scale:    { label: 'Scale',      unit: '%', def: [100, 140], toStore: v => v / 100 },
    opacity:  { label: 'Opacity',    unit: '%', def: [40, 100],  toStore: v => v / 100 },
    rotation: { label: 'Rotation',   unit: '°', def: [-8, 8], toStore: v => v },
    x:        { label: 'Position X', unit: 'px', def: null,       toStore: v => v },
    y:        { label: 'Position Y', unit: 'px', def: null,       toStore: v => v },
  };

  function isAudioOnly(l) {
    if (!l || l.type !== 'video') return false;
    const m = FM.media && FM.media.get(l.id);
    return !!(m && (!m.width || !m.height));   // mp3/wav ride the video path with a 0x0 picture
  }

  function closeSheet(root) {
    if (!root) return;
    if (root._arKeyHandler) { window.removeEventListener('keydown', root._arKeyHandler, true); root._arKeyHandler = null; }
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  function openSheet(layer) {
    if (!layer) return;
    const scene = FM.scene; if (!scene) return;
    const at = layer.start || 0;

    // ---- initial state ----
    const sel = FM.selectedLayer ? FM.selectedLayer(scene) : null;
    const st = {
      band: 'overall', gain: 1, smoothing: 0.4, floor: 0,
      targetId: (sel && !isAudioOnly(sel)) ? sel.id : layer.id,
      prop: 'scale', min: 100, max: 140,
      reqId: 0, debounce: 0,
    };
    function targetLayer() { return scene.layers.find(l => l.id === st.targetId) || layer; }
    function defRange(prop) {
      const meta = PROP_META[prop];
      if (meta.def) return meta.def.slice();
      const t = targetLayer();
      const cur = Math.round(FM.evalProp(t.transform[prop], at) || 0);
      return [cur, cur + 80];
    }
    function smoothingTimes() {   // one slider -> attack/release seconds
      return { attack: 0.005 + st.smoothing * 0.055, release: 0.03 + st.smoothing * 0.37 };
    }
    (function initRange() { const r = defRange(st.prop); st.min = r[0]; st.max = r[1]; })();

    // ---- DOM ----
    const root = document.createElement('div');
    root.id = 'ar-sheet';
    const wide = window.innerWidth >= 640;
    root.style.cssText = 'position:fixed;inset:0;z-index:190;display:flex;justify-content:center;align-items:' +
      (wide ? 'center' : 'flex-end') + ';background:rgba(0,0,0,.5);';
    root.addEventListener('pointerdown', e => { if (e.target === root) closeSheet(root); });
    // Swallow global editor shortcuts while the modal is up. app.js binds keydown on window in the BUBBLE
    // phase, so a capture-phase window listener here runs first and stops it — regardless of whether focus
    // sits in the sheet or on <body> (a root-scoped listener would miss the body-focused case, and then
    // Backspace/Delete would delete the layer BEHIND the sheet). Esc closes; the sheet's own inputs get
    // their keystrokes because their handlers already ran before this stops further propagation.
    root._arKeyHandler = e => {
      if (e.key === 'Escape') { closeSheet(root); return; }
      const inSheet = root.contains(e.target);
      const editing = inSheet && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName || '');
      if (!editing) e.stopPropagation();   // let typing in the sheet's own fields through; block everything else from the editor
    };
    window.addEventListener('keydown', root._arKeyHandler, true);

    const sheet = document.createElement('div');
    sheet.style.cssText = 'width:100%;max-width:460px;max-height:92vh;overflow:auto;background:var(--panel);' +
      'border:1px solid var(--line);border-radius:' + (wide ? '14px' : '16px 16px 0 0') +
      ';padding:16px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -6px 30px rgba(0,0,0,.5);' +
      '-webkit-user-select:none;user-select:none;';
    sheet.addEventListener('pointerdown', e => e.stopPropagation());
    root.appendChild(sheet);

    // header
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:2px;';
    const h = document.createElement('div');
    h.textContent = 'Audio React';
    h.style.cssText = 'font-size:16px;font-weight:700;flex:1;';
    const close = document.createElement('button');
    close.setAttribute('aria-label', 'Close');
    close.style.cssText = 'width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:var(--panel-2);border:1px solid var(--line);border-radius:8px;color:var(--text-dim);cursor:pointer;';
    close.innerHTML = svg('M6 6l12 12M18 6L6 18');
    close.addEventListener('click', () => closeSheet(root));
    head.appendChild(h); head.appendChild(close);
    sheet.appendChild(head);

    const sub = document.createElement('div');
    sub.textContent = 'Drive a property from this clip’s loudness.';
    sub.style.cssText = 'font-size:12px;color:var(--text-dim);margin-bottom:14px;';
    sheet.appendChild(sub);

    // band segmented
    sheet.appendChild(fieldLabel('Band'));
    const bandSeg = document.createElement('div');
    bandSeg.className = 'seg';
    bandSeg.style.cssText = 'margin-bottom:12px;';
    const bandBtns = {};
    ['overall', 'bass', 'mid', 'treble'].forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'seg-btn' + (b === st.band ? ' on' : '');
      btn.style.minHeight = '40px';
      btn.textContent = b[0].toUpperCase() + b.slice(1);
      btn.addEventListener('click', () => {
        st.band = b;
        Object.keys(bandBtns).forEach(k => bandBtns[k].classList.toggle('on', k === b));
        recompute();
      });
      bandBtns[b] = btn; bandSeg.appendChild(btn);
    });
    sheet.appendChild(bandSeg);

    // live preview
    const preWrap = document.createElement('div');
    preWrap.style.cssText = 'position:relative;height:74px;background:var(--panel-2);border:1px solid var(--line);border-radius:8px;overflow:hidden;margin-bottom:14px;';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    const preMsg = document.createElement('div');
    preMsg.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11.5px;color:var(--text-faint);pointer-events:none;';
    preWrap.appendChild(canvas); preWrap.appendChild(preMsg);
    sheet.appendChild(preWrap);

    // sliders
    const gainRow = slider('Sensitivity', 0.5, 4, 0.1, st.gain, v => '×' + v.toFixed(1), v => { st.gain = v; recompute(); });
    const smoothRow = slider('Smoothing', 0, 1, 0.01, st.smoothing, v => Math.round(v * 100) + '%', v => { st.smoothing = v; recompute(); });
    const floorRow = slider('Threshold', 0, 0.8, 0.01, st.floor, v => v <= 0 ? 'off' : Math.round(v * 100) + '%', v => { st.floor = v; recompute(); });
    sheet.appendChild(gainRow.row); sheet.appendChild(smoothRow.row); sheet.appendChild(floorRow.row);

    // target + property selects
    sheet.appendChild(fieldLabel('Target layer'));
    const targetSel = document.createElement('select');
    styleSelect(targetSel);
    scene.layers.forEach(l => {
      const o = document.createElement('option');
      o.value = l.id;
      o.textContent = (l.name || l.type || 'Layer') + (isAudioOnly(l) ? ' (audio)' : '');
      if (l.id === st.targetId) o.selected = true;
      targetSel.appendChild(o);
    });
    targetSel.addEventListener('change', () => { st.targetId = targetSel.value; resetRange(); });
    sheet.appendChild(targetSel);

    sheet.appendChild(fieldLabel('Property'));
    const propSel = document.createElement('select');
    styleSelect(propSel);
    Object.keys(PROP_META).forEach(p => {
      const o = document.createElement('option'); o.value = p; o.textContent = PROP_META[p].label;
      if (p === st.prop) o.selected = true; propSel.appendChild(o);
    });
    propSel.addEventListener('change', () => { st.prop = propSel.value; resetRange(); });
    sheet.appendChild(propSel);

    // range Min -> Max
    sheet.appendChild(fieldLabel('Range (quiet → loud)'));
    const rangeRow = document.createElement('div');
    rangeRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
    const minIn = numField(st.min, v => { st.min = v; });
    const arrow = document.createElement('span'); arrow.textContent = '→'; arrow.style.cssText = 'color:var(--text-dim);flex:0 0 auto;';
    const maxIn = numField(st.max, v => { st.max = v; });
    const unit = document.createElement('span'); unit.style.cssText = 'color:var(--text-dim);flex:0 0 auto;min-width:20px;';
    unit.textContent = PROP_META[st.prop].unit;
    rangeRow.appendChild(minIn); rangeRow.appendChild(arrow); rangeRow.appendChild(maxIn); rangeRow.appendChild(unit);
    sheet.appendChild(rangeRow);

    function resetRange() {
      const r = defRange(st.prop);
      st.min = r[0]; st.max = r[1];
      minIn.value = st.min; maxIn.value = st.max;
      unit.textContent = PROP_META[st.prop].unit;
    }

    // footer
    const foot = document.createElement('div');
    foot.style.cssText = 'display:flex;gap:10px;';
    const cancel = document.createElement('button');
    cancel.className = 'btn'; cancel.textContent = 'Cancel';
    cancel.style.cssText += ';flex:1;justify-content:center;min-height:44px;';
    cancel.addEventListener('click', () => closeSheet(root));
    const apply = document.createElement('button');
    apply.className = 'btn btn-accent'; apply.textContent = 'Apply';
    apply.style.cssText += ';flex:1;justify-content:center;min-height:44px;';
    apply.addEventListener('click', async () => {
      const meta = PROP_META[st.prop];
      apply.disabled = true; apply.textContent = 'Applying…';
      const times = smoothingTimes();
      const n = await FM.audioReact.bake(layer, {
        band: st.band, gain: st.gain, attack: times.attack, release: times.release, floor: st.floor,
        targetLayerId: st.targetId, prop: st.prop,
        outMin: meta.toStore(st.min), outMax: meta.toStore(st.max),
      });
      closeSheet(root);
      if (!n && FM.toast) FM.toast('Nothing baked');
    });
    foot.appendChild(cancel); foot.appendChild(apply);
    sheet.appendChild(foot);

    document.body.appendChild(root);

    // ---- live preview recompute (debounced; band change re-renders the offline filter once) ----
    function draw(values) {
      const dpr = window.devicePixelRatio || 1;
      const w = preWrap.clientWidth, hgt = preWrap.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(hgt * dpr));
      const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, hgt);
      if (!values || !values.length) return;
      const pad = 5, bh = hgt - pad * 2;
      g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, hgt - pad); g.lineTo(w, hgt - pad); g.stroke();
      const xat = i => (values.length < 2) ? 0 : (i / (values.length - 1)) * w;
      const yat = v => (hgt - pad) - v * bh;
      g.beginPath();
      g.moveTo(0, hgt - pad);
      for (let i = 0; i < values.length; i++) g.lineTo(xat(i), yat(values[i]));
      g.lineTo(w, hgt - pad); g.closePath();
      g.fillStyle = 'rgba(41,217,187,.18)'; g.fill();
      g.beginPath();
      for (let i = 0; i < values.length; i++) { const x = xat(i), y = yat(values[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#29d9bb').trim();   // canvas can't resolve a CSS var — read the computed value
      g.lineWidth = 1.8; g.stroke();
    }
    function recompute() {
      clearTimeout(st.debounce);
      preMsg.textContent = 'Decoding…';
      const id = ++st.reqId;
      st.debounce = setTimeout(async () => {
        const times = smoothingTimes();
        let env = null;
        try {
          env = await FM.audioEnvelope(layer, { band: st.band, gain: st.gain, attack: times.attack, release: times.release, floor: st.floor });
        } catch (e) { env = null; }
        if (id !== st.reqId || !root.parentNode) return;   // superseded / closed
        if (!env) { preMsg.textContent = 'This clip has no audio'; draw(null); return; }
        preMsg.textContent = '';
        draw(env.values);
      }, 160);
    }
    recompute();   // kick immediately — the 160ms debounce gives the sheet time to lay out before draw() reads its width (rAF gets paused when the pane is backgrounded)
  }

  // ---- tiny UI helpers --------------------------------------------------------------------------

  function svg(path) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="' + path + '"/></svg>';
  }
  function fieldLabel(text) {
    const d = document.createElement('div');
    d.textContent = text;
    d.style.cssText = 'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:var(--text-faint);margin:0 0 6px;';
    return d;
  }
  function styleSelect(s) {
    s.style.cssText = 'width:100%;min-height:44px;background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:0 10px;font-size:13px;margin-bottom:12px;-webkit-appearance:none;appearance:none;';
  }
  function numField(val, onInput) {
    const inp = document.createElement('input');
    inp.type = 'number'; inp.value = val;
    inp.style.cssText = 'flex:1;min-width:0;min-height:44px;background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:0 10px;font-size:14px;text-align:center;';
    inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (!isNaN(v)) onInput(v); });
    return inp;
  }
  function slider(label, min, max, step, val, fmt, onInput) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:12px;';
    const top = document.createElement('div');
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;';
    const lb = document.createElement('span'); lb.textContent = label; lb.style.cssText = 'font-size:12.5px;color:var(--text);';
    const vb = document.createElement('span'); vb.textContent = fmt(val); vb.style.cssText = 'font-size:12px;color:var(--accent);font-variant-numeric:tabular-nums;';
    top.appendChild(lb); top.appendChild(vb);
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    inp.style.cssText = 'width:100%;height:40px;accent-color:var(--accent);';
    inp.addEventListener('input', () => { const v = parseFloat(inp.value); vb.textContent = fmt(v); onInput(v); });
    row.appendChild(top); row.appendChild(inp);
    return { row: row, input: inp };
  }
})(window.FM);
