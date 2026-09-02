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
  /* DERIVED FROM THE LIVE EASING TABLES, not a hard-coded four (BUG-HUNT: "Saving an effect as a preset
   * silently rewrites bounce/elastic/hold/overshoot keyframe easing to linear").
   * This whitelisted linear/easeIn/easeOut/easeInOut and rewrote everything else to 'linear' — but the
   * app also ships bounce, elastic and hold in `FM.EASES`, and overshoot and anticipate in
   * `FM.EASE_PRESETS`, and the graph editor writes those names BARE (`kf.e = key; delete kf.bez`), so
   * there is no bezier left for the evaluator to fall back on. Every preset round-trip therefore
   * flattened the motion the user authored and previewed, permanently — `readCustom()` re-applies this
   * on every read — with no warning. Measured on a blur radius keyed [0, 40 bounce, 5 hold, 20
   * overshoot]: the original holds at 40 through t=2.5 while the preset gave 22.5.
   * scene.js loads before this file, so the tables are there at IIFE time. `custom` is allowed because
   * it only means anything alongside a valid `bez`, which saneKf already preserves separately. */
  const EASE_OK = (function () {
    const ok = { custom: 1 };
    [FM.EASES, FM.EASE_PRESETS].forEach(function (t) { if (t) Object.keys(t).forEach(function (k) { ok[k] = 1; }); });
    /* If the tables somehow are not loaded, fall back to the four this used to allow rather than to
       NOTHING — an empty whitelist would rewrite every easing in the app, which is worse than the bug. */
    if (Object.keys(ok).length <= 1) { ok.linear = 1; ok.easeIn = 1; ok.easeOut = 1; ok.easeInOut = 1; }
    return ok;
  })();
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
      /* ⚠️ `ez` — the parameterised easing the graph editor writes (Bounce, Elastic, Steps…). js/scene.js
         gives it priority OVER `bez` and `e`, so dropping it does not degrade gracefully: the keyframe
         falls back to whatever plain `e` says, which applyEzPreset leaves at 'easeInOut'. Saving a
         bouncing effect as a preset returned a plain ease, silently (queue 701).
         Validated, not trusted: `fam` and `preset` must be strings and every number in `p` finite, so a
         hand-edited or imported preset cannot smuggle in something the ease tables will choke on. */
      if (k.ez && typeof k.ez === 'object' && typeof k.ez.fam === 'string' && typeof k.ez.preset === 'string') {
        const ep = {};
        let epOK = true;
        Object.keys(k.ez.p || {}).forEach(function (kk) {
          const vv = k.ez.p[kk];
          if (typeof vv === 'number' && Number.isFinite(vv)) ep[kk] = vv; else epOK = false;
        });
        if (epOK) c.ez = { fam: k.ez.fam, preset: k.ez.preset, p: ep };
      }
      if (Number.isFinite(k.ti)) c.ti = k.ti;   // spatial/Hermite tangents survive (time-independent)
      if (Number.isFinite(k.to)) c.to = k.to;
      out.push(c);
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  }
  /* A container preset's children, put through the SAME validator a project load uses (queue 581).
     Nothing arbitrary from localStorage may reach the compositor, and this file's whole job is that
     rule — so the children get the same treatment the params already get, rather than being trusted
     because they arrived inside something that was checked. Returns undefined for a non-container so
     the key never appears on an ordinary preset. */
  function saneKids(raw) {
    if (!Array.isArray(raw) || !raw.length) return undefined;
    if (!FM._sanitizeFxList) return undefined;      // fail closed, like sanitizeFxList itself
    let out;
    try { out = FM._sanitizeFxList(raw.slice(0, 40)); } catch (e) { return undefined; }
    return (Array.isArray(out) && out.length) ? out : undefined;
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
      else if (v && typeof v === 'object' && Array.isArray(v.kf)) {
        const kf = saneKf(v.kf);
        /* CARRY loopMode, ON A WHITELIST. This rebuilt an animated parameter as `{ kf: kf }` and nothing
         * else — but FM.evalProp reads `loopMode` off that same object to keep repeating past the last
         * keyframe, so a looping animation came out of a preset frozen on its final value. Measured: a
         * parameter keyed t=1..4 with loopMode 'cycle' reads 40 at t=5; the preset made from it read 20,
         * the clamped last value. The layer-level loop writes this field onto every animated prop, so it
         * is not an exotic setting — anyone who has ever set a clip to loop has it.
         * Whitelisted rather than copied, because this function's whole job is that nothing arbitrary
         * from a saved file reaches the compositor; 'none' is the default and is not worth storing. */
        if (kf) {
          const o = { kf: kf };
          if (v.loopMode === 'cycle' || v.loopMode === 'pingpong') o.loopMode = v.loopMode;
          params[key] = o;
        }
      }
    }
    if (!Object.keys(params).length) { _why = 'none of its values are settings ' + reg.label + ' has'; return null; }
    return {
      id: String(raw.id || '').slice(0, 40) || ('u' + Math.random().toString(36).slice(2, 9)),
      fx: reg.type,
      name: String(raw.name || 'Preset').slice(0, 40),
      desc: String(raw.desc || '').slice(0, 90),
      dur: Number.isFinite(raw.dur) ? Math.min(60, Math.max(0, raw.dur)) : 0,
      params: params,
      // queue 581 — a filter's children, validated. `undefined` on an ordinary effect, so the key
      // simply is not there and nothing downstream has to know about containers.
      effects: saneKids(raw.effects),
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
      /* ⚠️ A FILTER IS ITS CHILDREN, AND THIS USED TO THROW THEM AWAY — queue 581.
         `capture` walks `reg.params` and stores those, which is right for an ordinary effect and
         **silently wrong for a container**: a filter's whole identity is the list of effects inside it.
         MEASURED at v12.96 — handed `FM.filters.makeInstance('noir')` this returned a preset with
         `hasEffects: false` and threw nothing. **Saving a custom filter that way stored an empty
         shell**, and the failure is the worst shape there is: it saves, it loads, it faves, it lists
         with the right name, and the picture is simply gone — noticed much later, with no error to
         connect it to.
         The children are copied raw here and VALIDATED on the way back out (see makeInstance, which
         hands the rebuilt instance to FM._sanitizeFxList — the same sanitiser a project load uses).
         Capped: a preset is user data on its way to localStorage, and an unbounded nested list is not. */
      const kids = (FM.isFxContainer && FM.isFxContainer(fx) && Array.isArray(fx.effects))
        ? JSON.parse(JSON.stringify(fx.effects.slice(0, 40)))
        : null;
      // …and a container with no own params is still worth saving, which the guard below would refuse.
      if (!any && !(kids && kids.length)) return null;
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
        effects: kids || undefined,
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
      /* The instance starts from the registry's own defaults, but every param below is copied out of
         localStorage — so the finished object is only as trustworthy as that store (queue 218). It
         goes through the shared sanitiser at the end of this function, not a second set of checks. */
      const t0 = Number.isFinite(atTime) ? atTime : 0;
      Object.keys(preset.params).forEach(key => {
        if (!(key in inst.params)) return;
        const v = JSON.parse(JSON.stringify(preset.params[key]));
        if (v && typeof v === 'object' && Array.isArray(v.kf)) v.kf.forEach(k => { k.t = (k.t || 0) + t0; });
        inst.params[key] = v;
      });
      /* …and a container's CHILDREN come back too (queue 581). Without this the preset restores an
         empty filter — it lands, it is named correctly, and it does nothing to the picture.
         Assigned BEFORE the sanitiser below rather than after, deliberately: that call validates the
         whole instance including everything nested in it, so the children are checked by the same pass
         that checks the parent instead of arriving behind its back. */
      /* ⚠️ DO NOT GUARD THIS ON `FM.isFxContainer(inst)` — it looks like the obviously right check and
         it is exactly wrong here. `isFxContainer` asks whether an instance HAS an effects array, and a
         FRESH instance from the registry has no `effects` key at all — so the guard was false for every
         container and the children were silently never restored. Measured: captured 4, restored 0.
         The sanitiser below is the authority on whether this type may hold children; if it may not, it
         drops them. Asking it is correct, and asking a not-yet-populated instance is circular. */
      if (Array.isArray(preset.effects) && preset.effects.length) {
        inst.effects = JSON.parse(JSON.stringify(preset.effects));
        if (FM.reconcileMaskMarkers) FM.reconcileMaskMarkers(inst);   // a preset's mask markers point at masks the target may not have (queue 560)
      }
      // Value-checked, not just name-checked (queue 218). Returns null rather than an effect the
      // sanitiser threw out — landing a half-rebuilt one would be worse than not landing it.
      if (FM._sanitizeFxList) { const out = FM._sanitizeFxList([inst]); return out.length ? out[0] : null; }
      return inst;
    },

    /* The shipping hand-off: JSON of the user's presets, for baking into FM.EFFECT_PRESETS above. */
    exportCode: function () { return JSON.stringify(readCustom(), null, 2); },
  };
})(window.FM);
