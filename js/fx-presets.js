/* FreeMotion — per-EFFECT presets (Alight Motion "hold an effect" presets).
 * A preset is ONE effect with pre-authored params — often keyframed — that applies as a normal
 * effect instance anchored at the playhead. Two pools:
 *   FM.EFFECT_PRESETS  — shipped with the app (this file IS the shipping mechanism: Ezra authors
 *                        presets in-app, exports them, they get baked in here and reach every build).
 *   localStorage       — the user's own presets, saved from any effect's ⋯ → "Save as preset".
 * Keyframe times inside a preset are RELATIVE (0 = preset start); makeInstance() re-anchors them.
 * NOTE: FM.fxPresets (inspector.js) is the older effect-STACK presets — this is a separate system.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const KEY = 'fm.fx.userpresets', MAX_PRESETS = 120, MAX_KF = 240;

  // ---- shipped presets (edit THIS array to ship presets to every install) ----
  FM.EFFECT_PRESETS = [
    // — Shake (the flagship set) —
    { id: 's-beatslam', fx: 'shake', name: 'Beat Slam', desc: 'One violent hit that dies fast — park the playhead on the beat', dur: 0.45,
      params: { amount: { kf: [{ t: 0, v: 700, e: 'easeOut' }, { t: 0.45, v: 0, e: 'linear' }] }, speed: 16, twist: 25, zoom: 40, jitter: 1, smear: 0.7, direction: 0 } },
    { id: 's-quake', fx: 'shake', name: 'Earthquake', desc: 'Rolls in, rattles, settles', dur: 3,
      params: { amount: { kf: [{ t: 0, v: 0, e: 'easeIn' }, { t: 0.6, v: 520, e: 'linear' }, { t: 2.2, v: 380, e: 'easeOut' }, { t: 3, v: 0, e: 'linear' }] }, speed: 9, twist: 30, zoom: 18, jitter: 0.55, smear: 0.4, direction: 0 } },
    { id: 's-handheld', fx: 'shake', name: 'Handheld Cam', desc: 'Subtle constant drift — documentary feel', dur: 0,
      params: { amount: 26, speed: 2.2, twist: 1.5, zoom: 0, jitter: 0.1, smear: 0, direction: 0 } },
    { id: 's-hypex', fx: 'shake', name: 'Hype Shake X', desc: 'Fast hard horizontal rattle', dur: 0,
      params: { amount: 300, speed: 22, twist: 0, zoom: 10, jitter: 0.9, smear: 0.5, direction: 1 } },
    { id: 's-rumble', fx: 'shake', name: 'Rumble Build', desc: 'Riser — grows to a peak, cut it at the drop', dur: 1.8,
      params: { amount: { kf: [{ t: 0, v: 0, e: 'easeIn' }, { t: 1.8, v: 640, e: 'linear' }] }, zoom: { kf: [{ t: 0, v: 0, e: 'easeIn' }, { t: 1.8, v: 45, e: 'linear' }] }, speed: 13, twist: 12, jitter: 0.8, smear: 0.55, direction: 0 } },
    // — impact & reveal classics —
    { id: 'p-zoomhit', fx: 'zoomblur', name: 'Zoom Hit', desc: 'Radial blur punch that clears instantly', dur: 0.35,
      params: { amount: { kf: [{ t: 0, v: 0.85, e: 'easeOut' }, { t: 0.35, v: 0, e: 'linear' }] } } },
    { id: 'p-glitchpop', fx: 'rgbsplit', name: 'Glitch Pop', desc: 'Two stutter bursts of channel split', dur: 0.76,
      params: { amount: { kf: [{ t: 0, v: 0, e: 'linear' }, { t: 0.08, v: 26, e: 'linear' }, { t: 0.16, v: 4, e: 'linear' }, { t: 0.24, v: 18, e: 'linear' }, { t: 0.32, v: 0, e: 'linear' }, { t: 0.6, v: 0, e: 'linear' }, { t: 0.68, v: 30, e: 'linear' }, { t: 0.76, v: 0, e: 'linear' }] } } },
    { id: 'p-focuspull', fx: 'blur', name: 'Focus Pull', desc: 'Starts soft, snaps sharp', dur: 0.9,
      params: { radius: { kf: [{ t: 0, v: 28, e: 'easeOut' }, { t: 0.9, v: 0, e: 'linear' }] } } },
    { id: 'p-pixreveal', fx: 'pixelate', name: 'Pixel Reveal', desc: 'Chunky mosaic resolves to clean', dur: 1,
      params: { size: { kf: [{ t: 0, v: 64, e: 'easeOut' }, { t: 1, v: 1, e: 'linear' }] } } },
    { id: 'p-untwist', fx: 'twirl', name: 'Untwist In', desc: 'Spun-up warp unwinds to normal', dur: 0.8,
      params: { amount: { kf: [{ t: 0, v: 330, e: 'easeOut' }, { t: 0.8, v: 0, e: 'linear' }] } } },
    { id: 'p-neonpulse', fx: 'glow', name: 'Neon Flicker', desc: 'Glow stutters like a waking neon sign', dur: 2.4, params: {
      radius: { kf: [{ t: 0, v: 4, e: 'easeInOut' }, { t: 0.4, v: 40, e: 'easeInOut' }, { t: 0.8, v: 12, e: 'easeInOut' }, { t: 1.2, v: 34, e: 'easeInOut' }, { t: 1.6, v: 10, e: 'easeInOut' }, { t: 2, v: 30, e: 'easeInOut' }, { t: 2.4, v: 6, e: 'linear' }] }, color: '#19c3ff' } },
    { id: 'p-chromadrift', fx: 'chromaticaberration', name: 'Chroma Drift', desc: 'Slow breathing fringe that rotates', dur: 3, params: {
      amount: { kf: [{ t: 0, v: 2, e: 'easeInOut' }, { t: 1.5, v: 14, e: 'easeInOut' }, { t: 3, v: 2, e: 'linear' }] },
      angle: { kf: [{ t: 0, v: 0, e: 'linear' }, { t: 3, v: 180, e: 'linear' }] } } },
  ];

  // ---- validation (custom presets come back from localStorage — never trust the shape) ----
  const EASE_OK = { linear: 1, easeIn: 1, easeOut: 1, easeInOut: 1 };
  // Two bits of state the validator leaves behind for whoever asked it to validate. Reads (readCustom)
  // ignore them; the user-facing entry points (save/capture) drain them and speak up, so a rejection
  // or a trim is never silent. They are read IMMEDIATELY after the sanePreset() call that set them —
  // any later readCustom() would overwrite them.
  let _clamped = 0;   // over-long keyframe lists trimmed by the last sanePreset()
  let _why = '';      // why the last sanePreset() returned null
  let _note = '';     // what save() last put on screen (so callers don't toast over it)
  let _trimmedId = ''; // id of the preset capture() trimmed, for the save() that follows
  function saneKf(raw) {
    if (!Array.isArray(raw) || !raw.length) return null;
    // Over-long lists used to return null, which DROPPED the param, which could make sanePreset
    // return null — binning the entire preset over one greedy parameter, without a word. Keep the
    // first MAX_KF instead: a trimmed animation is recoverable, a discarded preset is not.
    if (raw.length > MAX_KF) { raw = raw.slice(0, MAX_KF); _clamped++; }
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const k = raw[i];
      if (!k || typeof k !== 'object' || !Number.isFinite(k.t) || !Number.isFinite(k.v)) return null;
      const c = { t: Math.min(600, Math.max(0, k.t)), v: k.v, e: (typeof k.e === 'string' && EASE_OK[k.e]) ? k.e : 'linear' };
      if (Array.isArray(k.bez) && k.bez.length === 4 && k.bez.every(Number.isFinite)) c.bez = k.bez.slice(0, 4);
      if (Number.isFinite(k.ti)) c.ti = k.ti;   // spatial/Hermite tangents survive (time-independent)
      if (Number.isFinite(k.to)) c.to = k.to;
      out.push(c);
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  }
  function sanePreset(raw) {
    _why = '';
    if (!raw || typeof raw !== 'object') { _why = 'it isn’t a preset'; return null; }
    const reg = FM.fxRegistry && FM.fxRegistry.get(String(raw.fx || ''));
    if (!reg) { _why = raw.fx ? ('this build has no “' + String(raw.fx).slice(0, 40) + '” effect') : 'it names no effect (an effect-stack preset can’t be saved here)'; return null; }
    const kinds = {};   // real storage key -> param type ('layer' excluded: source ids don't travel)
    reg.params.forEach(p => { if (p.type !== 'layer') kinds[p.key] = p.type; });
    const params = {};
    const rp = raw.params;
    if (!rp || typeof rp !== 'object') { _why = 'it carries no parameters'; return null; }
    for (const key of Object.keys(kinds)) {
      if (!Object.prototype.hasOwnProperty.call(rp, key)) continue;   // own-props ONLY (no proto walk)
      const v = rp[key];
      if (typeof v === 'number' && Number.isFinite(v)) params[key] = v;
      else if (typeof v === 'string' && v.length <= 32) params[key] = v;
      else if (v && typeof v === 'object' && Array.isArray(v.kf)) { const kf = saneKf(v.kf); if (kf) params[key] = { kf: kf }; }
    }
    if (!Object.keys(params).length) { _why = 'none of its values are settings ' + reg.label + ' has'; return null; }
    return {
      id: String(raw.id || '').slice(0, 40) || ('u' + Math.random().toString(36).slice(2, 9)),
      fx: reg.type,
      name: String(raw.name || 'Preset').slice(0, 40),
      desc: String(raw.desc || '').slice(0, 90),
      dur: Number.isFinite(raw.dur) ? Math.min(60, Math.max(0, raw.dur)) : 0,
      params: params,
    };
  }

  function readCustom() {
    try {
      const a = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(a) ? a.map(sanePreset).filter(Boolean) : [];
    } catch (e) { return []; }
  }
  // Returns whether the write actually landed. It used to swallow the failure and return undefined,
  // so save() reported success after a quota error and the caller's "Saved" toast painted straight
  // over the "Storage full" one.
  function writeCustom(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); return true; }
    catch (e) { if (FM.toast) FM.toast('Storage full — preset not saved', 3200); return false; }
  }

  FM.effectPresets = {
    /* Both pools for one effect type: { mine:[…], shipped:[…] }. */
    for: function (type) {
      return {
        mine: readCustom().filter(p => p.fx === type),
        shipped: FM.EFFECT_PRESETS.filter(p => p.fx === type),
      };
    },
    custom: readCustom,

    /* Capture a live effect instance as a preset: deep-copy params, drop non-portable layer refs,
     * rebase every keyframe so the EARLIEST key across all params sits at t=0 (project times are
     * absolute — a slam keyed at 8.2s must replay at 0). */
    capture: function (fx, name) {
      const reg = FM.fxRegistry.get(fx.type); if (!reg) return null;
      const params = {};
      let minT = Infinity, maxT = 0, any = false;
      reg.params.forEach(p => {
        if (p.type === 'layer') return;
        if (!Object.prototype.hasOwnProperty.call(fx.params || {}, p.key)) return;
        const v = fx.params[p.key];
        const c = JSON.parse(JSON.stringify(v === undefined ? null : v));
        if (c === null) return;
        params[p.key] = c; any = true;
        if (c && typeof c === 'object' && Array.isArray(c.kf)) c.kf.forEach(k => { if (Number.isFinite(k.t)) { minT = Math.min(minT, k.t); maxT = Math.max(maxT, k.t); } });
      });
      if (!any) return null;
      if (!Number.isFinite(minT)) minT = 0;   // no animated params → static preset
      const r4 = v => Math.round(v * 10000) / 10000;   // 8.5−8.2 leaves float dirt (0.2999…) in every rebased time
      Object.keys(params).forEach(key => {
        const c = params[key];
        if (c && typeof c === 'object' && Array.isArray(c.kf)) c.kf.forEach(k => { k.t = r4(Math.max(0, (k.t || 0) - minT)); });
      });
      _clamped = 0;
      const out = sanePreset({
        id: 'u' + Math.random().toString(36).slice(2, 9),
        fx: fx.type, name: name, desc: 'Your preset',
        dur: r4(Math.max(0, maxT - minT)),
        params: params,
      });
      // A trim that happened HERE is invisible to save() — by then the keyframes are already gone.
      // Hand it over by id (each capture mints a fresh one) so the save that follows can say so, and
      // an unrelated save can never inherit the message.
      _trimmedId = (_clamped && out) ? out.id : '';
      return out;
    },

    /* Returns true only if the preset is now on disk. A false NEVER passes silently any more: the
       reason is on screen before this returns, because a boolean nobody reads is not error handling. */
    save: function (preset) {
      _clamped = 0; _note = '';
      const p = sanePreset(preset);
      const why = _why;   // read now — readCustom() below re-runs the validator
      const clamped = _clamped || (p && _trimmedId === p.id);
      _trimmedId = '';
      if (!p) { if (FM.toast) FM.toast('Couldn’t save that preset — ' + (why || 'it didn’t validate'), 3600); return false; }
      const arr = readCustom().filter(x => x.id !== p.id).slice(0, MAX_PRESETS - 1);
      arr.unshift(p);
      if (!writeCustom(arr)) return false;   // writeCustom has already said why
      if (clamped) {
        _note = 'Saved “' + p.name + '” — one parameter had over ' + MAX_KF + ' keyframes, so only the first ' + MAX_KF + ' were kept';
        if (FM.toast) FM.toast(_note, 4000);
      }
      return true;
    },
    /* What save() already put on screen, '' if nothing — so a caller's own "Saved" toast doesn't
       paint over the more specific message this one just showed. */
    lastNote: function () { return _note; },
    remove: function (id) { writeCustom(readCustom().filter(p => p.id !== id)); },

    /* Preset → ONE normal effect instance. Starts from registry defaults (forward-compat: params the
     * preset predates get their schema defaults), overlays the preset, shifts kf to atTime. */
    makeInstance: function (preset, atTime) {
      const inst = FM.fxRegistry.makeInstance(preset.fx); if (!inst) return null;
      const t0 = Number.isFinite(atTime) ? atTime : 0;
      Object.keys(preset.params).forEach(key => {
        if (!(key in inst.params)) return;
        const v = JSON.parse(JSON.stringify(preset.params[key]));
        if (v && typeof v === 'object' && Array.isArray(v.kf)) v.kf.forEach(k => { k.t = (k.t || 0) + t0; });
        inst.params[key] = v;
      });
      return inst;
    },

    /* The shipping hand-off: JSON of the user's presets, for baking into FM.EFFECT_PRESETS above. */
    exportCode: function () { return JSON.stringify(readCustom(), null, 2); },
  };
})(window.FM);
