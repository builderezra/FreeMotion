/* FreeMotion — AUTO-DUCK MUSIC UNDER VOICE (#966 B25, refers to #545).
 * Ported by hand from the ChatGPT pile's 3b65fae1 ("Generate music ducking keyframes from speech") and corrected; what was
 * wrong in it and what it is now: tools/design/plans/pile-autoduck/NOTES.md.
 *
 * WHAT IT DOES. A music clip's Volume card gets "Auto-duck music…": whose speech to duck under (any other clip that sounds,
 * or one key clip he picks), Amount 0–30 dB (12), Attack 0.05–1 s (0.2), Release 0.1–2 s (0.6), Padding 0–0.5 s (0.15).
 * Generate finds the speech on the device (FM.detectSpeech, js/captions-vad.js — nothing leaves it), ASKS FIRST, then writes
 * ORDINARY VOLUME KEYFRAMES on the music: Amount dB down from Padding before each phrase to Padding after it, falling over
 * Attack before that and coming back over Release after it. Phrases whose ramps would meet are one duck, so the music does
 * not bounce up between two sentences. One Generate is one undo step; Update re-runs it with the settings in the card;
 * Remove ducking takes it away. No speech found: nothing is written and he is told so.
 *
 * HIS OWN VOLUME KEYFRAMES ARE KEPT, AND THE DUCK RIDES ON TOP OF THEM. Every key the tool touches is marked, so Update and
 * Remove take away exactly what it did and nothing of his:
 *   · `ad`  — on every key the tool wrote or turned down: the value it wrote there;
 *   · `adg` — on the same keys: the gain the duck applied there (0 < adg ≤ 1);
 *   · `adv` — on a key of HIS that a duck covered: the value it had before;
 *   · `adBase` — on the volume track itself, when his level was a plain number: that number.
 * Taking the duck away (strip, below): the tool's own keys go; his keys get back the value they had; and a key whose value
 * he has CHANGED since (it no longer reads what the tool wrote) is his and stays, with the duck divided back out of it — so a
 * level he sets inside a duck survives Update exactly as he set it. A key with no mark that sits inside a duck (one he added
 * there afterwards) is read the same way: as a level with the duck on. So Update never stacks a duck on a duck.
 * And because they are ordinary keyframes, his keys and the duck move, split, stretch and copy with the clip like any other
 * key — the pile kept his old volume as a separate snapshot that did none of that, so after a move Update put his fade back
 * where it USED to be, and Update or Restore threw away every edit he had made since Generate.
 *
 * TIME. Keyframe times are absolute project time (FM.shiftLayerKeyframes; the preview, js/audio-play.js and the exporter all
 * read FM.layerVolume at project time), so the duck is laid where the speech is HEARD: each stretch the detector finds in the
 * voice clip's FILE is cut to the part the clip plays and mapped through its trim, speed (a ramp exactly) and reverse — the
 * inverse of FM.layerLocalTime. The music's own trim and speed do not move it. Its fades are not touched and still multiply on
 * top (FM.fadeMul, everywhere FM.layerVolume is read).
 *
 * SHAPE. Linear in amplitude between keys, as every volume key in the app is: four keys per duck on a plain level (ramp start,
 * floor start, floor end, ramp end). When his own level is keyframed the ramps get a key every 0.1 s, because a moving duck
 * times a moving level is a curve; where one of his eased segments is crossed by a duck, that piece becomes straight lines.
 *
 * The speech found in a file is kept for that file (and only a real answer is kept — a failed search is asked again next time).
 * Every name put in front of him goes in as text (FM.ask and FM.toast use textContent). */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const DEFAULTS = Object.freeze({ key: 'any', amount: 12, attack: 0.2, release: 0.6, padding: 0.15 });
  const RANGES = { amount: [0, 30], attack: [0.05, 1], release: [0.1, 2], padding: [0, 0.5] };
  const MAX_KEYS = 5000;
  const SAMPLE = 0.1;
  const SAME_T = 1e-3;
  const EPS = 1e-9;

  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  const toNum = v => (typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) : NaN));
  const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));

  /* Settings as the tool will use them: each number inside its range, anything that is not a number its default. */
  function settle(o) {
    o = (o && typeof o === 'object') ? o : {};
    const out = { key: (typeof o.key === 'string' && o.key) ? o.key : 'any' };
    Object.keys(RANGES).forEach(k => {
      const n = toNum(o[k]), r = RANGES[k];
      out[k] = Number.isFinite(n) ? Math.max(r[0], Math.min(r[1], n)) : DEFAULTS[k];
    });
    return out;
  }

  // The card's settings and whether it is open, for the session (a redraw keeps them). They become the project's only when
  // Generate writes them, so moving a slider is not an undo step.
  const editing = new Map();
  const open = new Set();
  function settingsFor(layer) {
    const id = layer && layer.id;
    if (!editing.has(id)) editing.set(id, settle(layer && layer.autoDuck));
    return editing.get(id);
  }

  /* ---- where the speech is heard ------------------------------------------------------------------------------------------
   * The part of the file the clip plays, in source seconds, and a source second → the project time it is heard. */
  function sourceWindow(layer) {
    const trim = isNum(layer.trimStart) ? layer.trimStart : 0;
    const total = FM.layerSourceAdvance(layer, layer.duration || 0);
    const t = isNum(total) && total > 0 ? total : 0;
    return { a: trim, b: trim + t, total: t };
  }
  function sourceToScene(layer, s, w) {
    let adv = Math.max(0, Math.min(w.total, s - w.a));
    if (layer.reversed) adv = w.total - adv;
    const dur = layer.duration || 0;
    let into;
    if (!FM.isAnimated(layer.speed)) into = adv / FM.speedAt(layer, layer.start);
    else {
      // A speed ramp: the advance is FM.layerSourceAdvance's own integral, so bisect it — exactly the forward map inverted.
      let lo = 0, hi = dur;
      for (let i = 0; i < 48; i++) {
        const mid = (lo + hi) / 2;
        if (FM.layerSourceAdvance(layer, mid) < adv) lo = mid; else hi = mid;
      }
      into = (lo + hi) / 2;
    }
    return (layer.start || 0) + Math.max(0, Math.min(dur, into));
  }
  /* The detector's stretches ({start, end} in the FILE's seconds) → where they are heard in the project, sorted. What the trim
     cut away is not heard, so it is not ducked; a reversed clip hears the later source second first. */
  function speechSpans(layer, segments) {
    const out = [];
    if (!layer) return out;
    const w = sourceWindow(layer);
    if (!(w.total > 0)) return out;
    (Array.isArray(segments) ? segments : []).forEach(sg => {
      const s = toNum(sg && sg.start), e = toNum(sg && sg.end);
      if (!Number.isFinite(s) || !Number.isFinite(e)) return;
      const lo = Math.max(w.a, Math.min(s, e)), hi = Math.min(w.b, Math.max(s, e));
      if (!(hi > lo)) return;
      const x = sourceToScene(layer, lo, w), y = sourceToScene(layer, hi, w);
      if (y !== x) out.push({ start: Math.min(x, y), end: Math.max(x, y) });
    });
    return out.sort((p, q) => p.start - q.start);
  }

  /* ---- the duck's shape ---------------------------------------------------------------------------------------------------
   * Each heard stretch, widened by Padding, is a floor at −Amount dB. Two whose ramps would meet (the next one's Attack starts
   * before the last one's Release ends) are one floor, so the music stays down between close phrases instead of bouncing.
   * A stretch whose duck does not reach into the music at all is left out. */
  function envelope(spans, o, lo, hi) {
    const iv = [];
    (spans || []).forEach(sp => {
      const a = sp.start - o.padding, b = sp.end + o.padding;
      if (!(b > a) || b + o.release <= lo || a - o.attack >= hi) return;
      iv.push({ a: a, b: b });
    });
    iv.sort((p, q) => p.a - q.a);
    const merged = [];
    iv.forEach(x => {
      const last = merged[merged.length - 1];
      if (last && x.a - o.attack <= last.b + o.release) last.b = Math.max(last.b, x.b);
      else merged.push({ a: x.a, b: x.b });
    });
    return merged;
  }
  // The duck's gain at project time t: 1 away from speech, 10^(−Amount/20) on a floor, straight lines between.
  function gainAt(iv, o, t) {
    const F = Math.pow(10, -o.amount / 20);
    let g = 1;
    for (let i = 0; i < iv.length; i++) {
      const x = iv[i];
      if (t <= x.a - o.attack || t >= x.b + o.release) continue;
      let gi;
      if (t < x.a) gi = 1 - (1 - F) * (t - (x.a - o.attack)) / o.attack;
      else if (t <= x.b) gi = F;
      else gi = F + (1 - F) * (t - x.b) / o.release;
      if (gi < g) g = gi;
    }
    return g;
  }

  /* ---- taking the duck away -------------------------------------------------------------------------------------------------
   * The music's volume WITHOUT the duck, from the marks (see the top of the file). Pure: it returns a new value and changes
   * nothing. { base, removed }: removed = how many of the tool's own keys went. */
  function strip(vol) {
    if (!FM.isAnimated(vol)) return { base: vol == null ? 1 : vol, removed: 0 };
    const src = vol.kf.filter(k => k && typeof k === 'object' && isNum(k.t)).slice().sort((p, q) => p.t - q.t);
    const marked = k => isNum(k.ad);
    const gOf = k => (isNum(k.adg) && k.adg > 0 && k.adg <= 1) ? k.adg : 1;
    const kept = [];
    let removed = 0;
    src.forEach((k, i) => {
      const c = clone(k);
      delete c.ad; delete c.adg; delete c.adv;
      if (marked(k)) {
        const unchanged = typeof k.v === 'number' && Math.abs(k.v - k.ad) <= EPS * Math.max(1, Math.abs(k.ad));
        const undone = typeof k.v === 'number' ? k.v / gOf(k) : k.v;
        if (isNum(k.adv)) { c.v = unchanged ? k.adv : undone; kept.push(c); return; }
        if (unchanged) { removed++; return; }
        // a key the tool wrote and he has changed since is his now: kept, with the duck divided back out of it
        c.v = undone;
        kept.push(c);
        return;
      }
      // NOT MARKED. Between two of the tool's keys whose gains say the music was down there, it was made with the duck on (a
      // key he added inside a duck afterwards), so the duck is divided back out of it too. The tool's gain is a straight line
      // between any two of its consecutive keys, so this is exact. On ONE side of the tool's keys only, just a split's seam
      // can be inside a duck (the cut took the keys on its other side away).
      let p = null, n = null;
      for (let j = i - 1; j >= 0; j--) if (marked(src[j])) { p = src[j]; break; }
      for (let j = i + 1; j < src.length; j++) if (marked(src[j])) { n = src[j]; break; }
      let g = 1;
      if (p && n) g = n.t > p.t ? gOf(p) + (gOf(n) - gOf(p)) * (k.t - p.t) / (n.t - p.t) : Math.min(gOf(p), gOf(n));
      else if ((p || n) && k.split) g = gOf(p || n);
      if (g < 1 - EPS && typeof k.v === 'number') {
        // A split's seam on a track whose own level was a plain number pins nothing of his: the plain number is the level.
        if (k.split && !(p && n) && isNum(vol.adBase)) return;
        c.v = k.v / g;
      }
      kept.push(c);
    });
    let base;
    if (kept.length) { base = Object.assign({}, clone(vol), { kf: kept }); delete base.adBase; }
    else base = isNum(vol.adBase) ? vol.adBase : 1;
    return { base: base, removed: removed };
  }

  /* ---- laying the duck on ---------------------------------------------------------------------------------------------------
   * His level `base` (a number, or his own keys) with the duck `iv` on top, inside the clip [lo, hi]. Pure.
   * { volume, wrote } — wrote = how many keys the tool added (his keys it turned down are not counted). */
  function build(base, iv, o, lo, hi) {
    const animated = FM.isAnimated(base);
    const plain = animated ? 1 : (isNum(base) ? base : (isNum(toNum(base)) ? toNum(base) : 1));
    const levelAt = t => { if (!animated) return plain; const v = FM.evalProp(base, t); return isNum(v) ? v : 1; };
    const his = animated ? base.kf.filter(k => k && typeof k === 'object' && isNum(k.t)).map(clone) : [];
    const times = [];
    const inClip = t => Math.max(lo, Math.min(hi, t));
    iv.forEach(x => {
      [x.a - o.attack, x.a, x.b, x.b + o.release].forEach(t => times.push(inClip(t)));
      if (animated) {
        [[x.a - o.attack, x.a], [x.b, x.b + o.release]].forEach(r => {
          for (let t = r[0] + SAMPLE; t < r[1] - SAMPLE / 2; t += SAMPLE) if (t > lo && t < hi) times.push(t);
        });
      }
    });
    times.sort((p, q) => p - q);
    const out = [];
    // His keys: turned down where a duck covers them — and marked as well where one stands in for a key of the tool's (within
    // SAME_T of it), so taking the duck away always finds the tool's edges.
    his.forEach(k => {
      const g = gainAt(iv, o, k.t);
      if (typeof k.v === 'number' && (g < 1 - EPS || times.some(t => Math.abs(k.t - t) < SAME_T))) {
        k.adv = k.v; k.v = k.v * g; k.ad = k.v; k.adg = g;
      }
      out.push(k);
    });
    let wrote = 0, last = -Infinity;
    times.forEach(t => {
      if (t - last <= 1e-6) return;
      last = t;
      if (his.some(k => Math.abs(k.t - t) < SAME_T)) return;
      const g = gainAt(iv, o, t);
      const v = Math.max(0, levelAt(t) * g);
      out.push({ t: t, v: v, e: 'linear', ad: v, adg: g });
      wrote++;
    });
    out.sort((p, q) => p.t - q.t);
    const volume = animated ? Object.assign({}, clone(base), { kf: out }) : { kf: out, adBase: plain };
    if (animated) delete volume.adBase;
    return { volume: volume, wrote: wrote };
  }

  function hasDuck(layer) {
    return !!(layer && FM.isAnimated(layer.volume) && layer.volume.kf.some(k => k && isNum(k.ad)));
  }

  /* ---- whose speech ---------------------------------------------------------------------------------------------------------
   * The music and every copy of it — Remove vocals' instrumental (karaokeOf) is the same song, and when it is on it is the one
   * that PLAYS (the original is muted) — are ducked together, and none of them is ever listened to for speech. */
  function familyOf(target) {
    const layers = (FM.scene && FM.scene.layers) || [];
    const root = target.karaokeOf || target.id;
    const fam = [target];
    layers.forEach(l => { if (l && l !== target && (l.id === root || l.karaokeOf === root)) fam.push(l); });
    return fam;
  }
  const overlaps = (l, lo, hi) => (l.start || 0) < hi && (l.start || 0) + (l.duration || 0) > lo;
  // A clip that is heard: not muted, not hidden, not in a hidden group, not silenced by someone else's solo.
  function sounds(l, layers) {
    if (l.muted || l.visible === false) return false;
    if (FM.groupHidden && FM.groupHidden(l)) return false;
    if (!l.solo && layers.some(x => x && x.solo)) return false;
    return true;
  }
  // Every other clip with sound under this music — what he can pick as the key.
  function candidates(target) {
    if (!target || !FM.scene) return [];
    const fam = new Set(familyOf(target).map(l => l.id));
    const lo = target.start || 0, hi = lo + (target.duration || 0);
    return FM.scene.layers.filter(l => l && l.type === 'video' && !fam.has(l.id) && overlaps(l, lo, hi) && !!AD.fileOf(l));
  }
  // What one Generate listens to: the key clip he picked (even if he has muted it — he chose it), or every candidate that sounds.
  function sourcesFor(target, key) {
    if (key && key !== 'any') return candidates(target).filter(l => l.id === key);
    return candidates(target).filter(l => sounds(l, FM.scene.layers));
  }

  /* THE SPEECH FOUND IN A FILE IS KEPT FOR THAT FILE — an Update with new settings does not search again — and ONLY A REAL
     ANSWER IS KEPT (the Loudness Match port's rule): a file that would not decode, a detector that threw, was missing or
     answered nothing usable leaves nothing behind, so the next press asks again. "No speech" ({segments: []}) is a real answer.
     One search that is running is shared. Keyed by the File itself, so every clip cut from one file shares it. 8 kHz, as the
     captions' detector uses: ample for a voice, and a sixth of a device-rate decode (js/media.js measured the difference). */
  const found = new WeakMap(), running = new WeakMap();
  function speechOf(file) {
    if (!file || typeof file !== 'object') return Promise.resolve(null);
    if (found.has(file)) return Promise.resolve(found.get(file));
    if (running.has(file)) return running.get(file);
    const p = (async () => {
      try {
        if (typeof FM.decodeAudio !== 'function' || typeof FM.detectSpeech !== 'function') return null;
        const buf = await FM.decodeAudio(file, { rate: 8000 });
        if (!buf) return null;
        const r = await FM.detectSpeech(buf);
        return (r && Array.isArray(r.segments)) ? r : null;
      } catch (e) { return null; }
    })();
    running.set(file, p);
    p.then(r => { if (running.get(file) === p) running.delete(file); if (r) found.set(file, r); });
    return p;
  }

  /* ---- one plan for the music and its copies --------------------------------------------------------------------------------- */
  function planFor(target, spans, o) {
    const lo = target.start || 0, hi = lo + (target.duration || 0);
    const iv = envelope(spans, o, lo, hi);
    const members = [];
    let wrote = 0, error = null;
    if (iv.length) {
      familyOf(target).forEach(l => {
        const v = l.volume;
        if (FM.isAnimated(v) && v.loopMode && v.loopMode !== 'none') { error = 'This clip’s volume keyframes loop — turn the loop off first, then duck it'; return; }
        const llo = l.start || 0, lhi = llo + (l.duration || 0);
        const b = build(strip(v).base, iv, o, llo, lhi);
        if (b.volume.kf.length > MAX_KEYS) { error = 'Too much speech to duck in one go (' + b.volume.kf.length + ' keyframes) — split the music and duck each part'; return; }
        if (l === target) wrote = b.wrote;
        members.push({ layer: l, volume: b.volume });
      });
    }
    return { intervals: iv, members: members, wrote: wrote, error: error };
  }

  function commitChange(layers, wasBoosted) {
    const live = FM.audioFxLive;
    if (live && live.needsBoost && live.sync) layers.forEach((l, i) => { if (!!live.needsBoost(l) !== wasBoosted[i]) live.sync(l); });
    if (FM.reconcileAudio) FM.reconcileAudio();
    if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
    if (FM.requestRender) FM.requestRender();
    if (FM.history) FM.history.commit();
    if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
  }
  const boostOf = layers => layers.map(l => !!(FM.audioFxLive && FM.audioFxLive.needsBoost && FM.audioFxLive.needsBoost(l)));

  function nameList(layers) {
    const names = layers.map(l => (l.name && String(l.name).trim()) || 'an audio clip');
    return names.length <= 3 ? names.join(', ') : names.slice(0, 3).join(', ') + ' and ' + (names.length - 3) + ' more';
  }
  const placesWord = n => (n === 1 ? '1 place' : n + ' places');
  const dbWord = a => String(+(+a).toFixed(1));

  /* ---- Generate / Update ------------------------------------------------------------------------------------------------------
   * Resolves { status, message, … } and never throws for anything he can cause: 'done' | 'none' (nothing to duck) |
   * 'cancelled' (he said no) | 'failed' | 'busy'. Nothing in the project changes until he says yes, and then it changes in
   * ONE history step, for the music and its copies together. */
  const busy = new Set();
  async function generate(target, settings) {
    const o = settle(settings);
    const say = (m, ms) => { if (m && FM.toast) FM.toast(m, ms || 4500); };
    const end = (status, message, more) => { say(message); return Object.assign({ status: status, message: message || null }, more || {}); };
    if (!target || target.type !== 'video' || !FM.scene || !FM.layerById(FM.scene, target.id)) return end('failed', 'Choose the music clip first');
    if (!((target.duration || 0) > 0)) return end('failed', 'This clip has no length to duck');
    if (!(o.amount > 0)) return end('none', 'Amount is 0 dB, so there is nothing to turn down — nothing was changed');
    if (busy.has(target.id)) return end('busy', 'Still finding the speech…');
    const sources = sourcesFor(target, o.key);
    if (!sources.length) {
      return end('none', o.key === 'any' ? 'No other clip with sound plays under this one — nothing was changed'
        : 'That clip is not under this one any more — choose another in Duck under');
    }
    busy.add(target.id);
    const started = FM.startedIn ? FM.startedIn() : null;
    const moved = () => (FM.stillIn && !FM.stillIn(started));
    try {
      if (FM.toast) FM.toast('Finding the speech…', 0);
      const spans = [];
      let read = 0;
      for (const s of sources) {
        const r = await speechOf(AD.fileOf(s));
        if (moved()) return end('failed', 'Not changed — you switched projects while the speech was being found');
        if (!r) continue;
        read++;
        const live = FM.layerById(FM.scene, s.id);
        if (live) speechSpans(live, r.segments).forEach(x => spans.push(x));
      }
      if (FM.hideToast) FM.hideToast();
      if (!FM.layerById(FM.scene, target.id)) return end('failed', 'Not changed — the clip was deleted while the speech was being found');
      const who = nameList(sources);
      if (!read) return end('failed', 'Could not read the sound of ' + who + ' — nothing was changed');
      let plan = planFor(target, spans, o);
      if (!plan.intervals.length) return end('none', 'No speech found in ' + who + ' under this clip — nothing was changed');
      if (plan.error) return end('failed', plan.error);
      const updating = hasDuck(target);
      const clipName = (target.name && String(target.name).trim()) || 'This clip';
      const message = 'Speech found in ' + placesWord(plan.intervals.length) + ' (' + who + '). ' + clipName + ' goes ' +
        dbWord(o.amount) + ' dB quieter there, written as ' + plan.wrote + ' volume keyframes' +
        (updating ? ', in place of the ones written before' : '') + '. Your own volume keyframes are kept, and Undo takes it all back.';
      const ok = FM.ask ? await FM.ask({ title: updating ? 'Update the ducking?' : 'Lower this clip under the speech?', message: message,
        ok: updating ? 'Update' : 'Lower it', cancel: 'Cancel' }) : true;
      if (!ok) return end('cancelled', null);
      if (moved() || !FM.layerById(FM.scene, target.id)) return end('failed', 'Not changed — the project changed while the question was open');
      // Laid again from the volume as it is NOW: anything he changed while the question was open is kept.
      plan = planFor(target, spans, o);
      if (plan.error || !plan.intervals.length) return end('failed', plan.error || 'Not changed — the clip moved away from the speech');
      const layers = plan.members.map(m => m.layer), was = boostOf(layers);
      plan.members.forEach(m => {
        m.layer.volume = m.volume;
        m.layer.autoDuck = { key: o.key, amount: o.amount, attack: o.attack, release: o.release, padding: o.padding };
      });
      commitChange(layers, was);
      say(clipName + ' is ' + dbWord(o.amount) + ' dB down in ' + placesWord(plan.intervals.length) + ' — Undo takes it back', 3500);
      return { status: 'done', message: null, places: plan.intervals.length, keys: plan.wrote, spans: spans };
    } finally {
      busy.delete(target.id);
    }
  }

  /* Remove ducking: the tool's keys go and his come back (strip, above), for the music and its copies, in one step. */
  function remove(target) {
    if (!target || !FM.scene) return 0;
    const fam = familyOf(target), was = boostOf(fam);
    let n = 0;
    fam.forEach(l => {
      if (hasDuck(l)) { const s = strip(l.volume); n += s.removed; l.volume = s.base; }
      delete l.autoDuck;
    });
    commitChange(fam, was);
    if (FM.toast) FM.toast('Ducking removed — your own volume is back', 3000);
    return n;
  }

  const AD = FM.autoDuck = {
    DEFAULTS: DEFAULTS,
    defaults: () => Object.assign({}, DEFAULTS),
    settle: settle,
    settingsFor: settingsFor,
    isOpen: layer => !!(layer && open.has(layer.id)),
    setOpen: (layer, on) => { if (layer) { if (on) open.add(layer.id); else open.delete(layer.id); } },
    speechSpans: speechSpans,
    envelope: envelope,
    gainAt: gainAt,
    strip: strip,
    build: build,
    hasDuck: hasDuck,
    familyOf: familyOf,
    candidates: candidates,
    sourcesFor: sourcesFor,
    speechOf: speechOf,
    generate: generate,
    remove: remove,
    // The clip's media file (a seam: the suite stands in for it, so no audio has to be decoded to test what is done with it).
    fileOf: layer => { const m = layer && FM.media && FM.media.get ? FM.media.get(layer.id) : null; return (m && m.file) || null; },
  };
})(window.FM);
