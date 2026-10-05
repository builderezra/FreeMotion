/* Simple and Full — visualizer kit (window.VIS).
 *
 * Plain JS, no build, no libraries. Three parts:
 *   1. VIS.SAMPLE  — three projects as plain data in the design's model (DESIGN.md §2.2)
 *   2. VIS.engine  — a small but real implementation of DESIGN §3 (ripple) and §4 (attachments)
 *   3. mock drawing + the hub (only when a document exists, so the engine also runs under
 *      `osascript -l JavaScript` for engine-tests.js)
 *
 * Names on screen: "Simple" = the new editor, "Full" = today's editor (his D1 pick, 1 Oct). In code the design's
 * names are kept (sm.main, sm.stay, spine) so this file can be read beside DESIGN.md.
 *
 * 1 Oct (his rule, DESIGN §0.4): Full is drawn exactly as today. Its play bar is ⋯ · ⧉ · ◐ · |◀ and its PC row has no
 * switch; the only way to switch is VIS.cog, the ⚙ cog's third block (cog/COG-DESIGN.md). Simple's bar has no switch either.
 */
(function (G) {
  'use strict';
  const VIS = G.VIS = G.VIS || {};
  VIS._regs = VIS._regs || [];
  if (!VIS.register) VIS.register = function (id, def) { VIS._regs.push([id, def]); };   // replaced by the hub below

  /* =====================================================================================
   * 1. SAMPLE PROJECTS
   * Layer fields follow FreeMotion: id, type, name, start, duration, trimStart, srcDur, speed,
   * visible, locked, parent, audioOnly, transform, blendMode, captions (layer-local cues),
   * kf (keyframes: {prop: [{t, v}]}, ABSOLUTE times like js/scene.js), sm ({main, stay, tail, tailEnd}).
   * `look` is mock-only: two colours for the gradient "thumbnail". The array is top of the stack first.
   * ===================================================================================== */
  const SAMPLE = {};

  SAMPLE.beach = {
    project: { name: 'Beach day', width: 1080, height: 1920, fps: 30, duration: 14.2,
               sm: { v: 1, adopted: true, home: 'simple' } },
    layers: [
      { id: 'cap', type: 'text', name: 'Captions', start: 0, duration: 14.2, captions: [
          { start: 0.3, end: 1.8, text: 'Here we go' },
          { start: 2.0, end: 3.3, text: 'First swim of summer' },
          { start: 3.6, end: 5.4, text: 'Listen to that' },
          { start: 5.6, end: 7.0, text: 'So cold!' },
          { start: 7.4, end: 9.6, text: 'Castle time' },
          { start: 10.6, end: 12.8, text: 'What a day' },
          { start: 12.9, end: 14.0, text: 'See you soon' } ] },
      { id: 'title', type: 'text', name: 'Beach day!', text: 'Beach day!', start: 3.9, duration: 2.2,
        kf: { opacity: [{ t: 3.9, v: 0 }, { t: 4.3, v: 1 }] } },
      { id: 'sticker', type: 'image', name: 'Shell sticker', start: 7.6, duration: 1.8,
        transform: { scale: 0.3, x: 0.68, y: 0.28 }, look: ['#ffd9a8', '#ff9a8b'],
        kf: { scale: [{ t: 7.6, v: 0.2 }, { t: 8.0, v: 0.3 }] } },
      { id: 'c4', type: 'video', name: 'Sunset', start: 10.35, duration: 3.85, trimStart: 1.2, srcDur: 9.6, speed: 1,
        look: ['#ff9966', '#6a3d7a'], sm: { main: true } },
      { id: 'c3', type: 'video', name: 'Sandcastle', start: 7.1, duration: 3.25, trimStart: 0, srcDur: 6.4, speed: 1,
        look: ['#f3d27a', '#c98b4b'], sm: { main: true } },
      { id: 'c2', type: 'video', name: 'Waves', start: 3.4, duration: 3.7, trimStart: 2.0, srcDur: 12.3, speed: 1,
        look: ['#5fd3e6', '#1f6fa3'], sm: { main: true }, kf: { scale: [{ t: 3.4, v: 1 }, { t: 7.1, v: 1.15 }] } },
      { id: 'c1', type: 'video', name: 'Arriving', start: 0, duration: 3.4, trimStart: 0.5, srcDur: 8.2, speed: 1,
        look: ['#9ad1a8', '#3f7d6b'], sm: { main: true } },
      { id: 'song', type: 'video', audioOnly: true, name: 'Summer song', start: 0, duration: 14.2, trimStart: 0,
        srcDur: 95, speed: 1, sm: { stay: true },                  // D17 B (his pick): music never ends with the video
        kf: { volume: [{ t: 12.2, v: 1 }, { t: 14.2, v: 0 }] } }
    ]
  };

  SAMPLE.messy = {
    project: { name: 'Cooking with Mia', width: 1920, height: 1080, fps: 30, duration: 22 },
    layers: [
      { id: 'mtitle', type: 'text', name: 'Cooking with Mia', text: 'Cooking with Mia', start: 0, duration: 22,
        transform: { y: 0.12 } },
      { id: 'cam', type: 'camera', name: 'Camera', start: 0, duration: 22,
        kf: { zoom: [{ t: 0, v: 1 }, { t: 5.2, v: 1.2 }, { t: 12.5, v: 1 }] } },
      { id: 'grp', type: 'group', name: 'Lower third', start: 6.2, duration: 2.8, shadow: true },
      { id: 'lt-text', type: 'text', name: 'Chef Mia', text: 'Chef Mia', parent: 'grp', start: 6.2, duration: 2.8 },
      { id: 'lt-bar', type: 'shape', name: 'Bar', parent: 'grp', start: 6.2, duration: 2.8, look: ['#ff7a59', '#ff7a59'] },
      { id: 'mask', type: 'shape', name: 'Circle mask', blendMode: 'mask-alpha', start: 13.0, duration: 4.0 },
      { id: 'pip', type: 'video', name: 'Face cam', start: 6.0, duration: 4.5, trimStart: 0, srcDur: 30, speed: 1,
        transform: { scale: 0.3, x: 0.8, y: 0.75 }, look: ['#e8b4a0', '#7a4a3a'] },
      { id: 'm4', type: 'video', name: 'Street', start: 18.1, duration: 3.9, trimStart: 0, srcDur: 12, speed: 1,
        look: ['#8aa0b8', '#394a5e'] },
      { id: 'm3', type: 'video', name: 'Tasting', start: 12.5, duration: 5.8, trimStart: 1, srcDur: 20, speed: 1,
        look: ['#e6c07a', '#8c5a2b'] },
      { id: 'm2', type: 'video', name: 'Kitchen', start: 5.2, duration: 5.8, trimStart: 0, srcDur: 40, speed: 1,
        look: ['#c9d8c5', '#56705a'] },
      { id: 'm1', type: 'video', name: 'Intro drone', start: 0, duration: 5.2, trimStart: 2, srcDur: 60, speed: 1,
        look: ['#7fb3d5', '#2e4f6b'] },
      { id: 'beats', type: 'video', audioOnly: true, name: 'Kitchen beats', start: 0, duration: 22, trimStart: 0,
        srcDur: 180, speed: 1 }
    ]
  };

  SAMPLE.aroll = {
    project: { name: 'Studio tips', width: 1080, height: 1920, fps: 30, duration: 33 },
    layers: [
      { id: 'acap', type: 'text', name: 'Captions', start: 0, duration: 30, captions: [
          { start: 0.4, end: 3.6, text: 'Three tips for a tidy desk' },
          { start: 4.2, end: 7.8, text: 'One: cables out of sight' },
          { start: 12.1, end: 15.4, text: 'Two: a warm lamp' },
          { start: 21.0, end: 24.5, text: 'Three: one plant, not five' },
          { start: 26.0, end: 29.5, text: 'That is it' } ] },
      { id: 'end', type: 'text', name: 'Subscribe', text: 'Subscribe', start: 30, duration: 3 },
      { id: 'b3', type: 'video', name: 'Plant', start: 21, duration: 3, trimStart: 0, srcDur: 8, speed: 1, muted: true,
        look: ['#9fd38a', '#3c6b34'] },
      { id: 'b2', type: 'video', name: 'Lamp', start: 12, duration: 3.5, trimStart: 1, srcDur: 9, speed: 1, muted: true,
        look: ['#ffd08a', '#9c6420'] },
      { id: 'b1', type: 'video', name: 'Cables', start: 4, duration: 3, trimStart: 0, srcDur: 7, speed: 1, muted: true,
        look: ['#9aa7c7', '#3b4666'] },
      { id: 'a1', type: 'video', name: 'Talking head', start: 0, duration: 30, trimStart: 3, srcDur: 64, speed: 1,
        look: ['#d9b8a3', '#5b4a44'] }
    ]
  };
  VIS.SAMPLE = SAMPLE;

  /* =====================================================================================
   * 2. THE ENGINE (DESIGN §3, §4, §5.2). Pure functions over {project, layers}.
   *    classify(doc) -> R (the read model, §2.5). Commands are (R, doc, args) -> plan | {refuse}.
   *    applyPlan writes one new document; Editor keeps one undo step per command (§3.2 rule 2).
   *    Where the design is intricate the rule is implemented plainly, and the comment says so.
   * ===================================================================================== */
  const E = {};
  const clone = o => JSON.parse(JSON.stringify(o));
  const endOf = l => l.start + l.duration;
  const hasFlag = (l, k) => !!(l && l.sm && l.sm[k]);
  E.MIN_CUE = 0.10;                                   // js/captions.js:21
  E.minLen = fps => Math.max(1 / fps, 0.1);          // §3.1 MIN_LEN
  E.snap = (t, fps) => Math.round(t * fps) / fps;     // only points the user picks are rounded (§3.1)

  /* §2.3: the ONE writer of sm. Merges, deletes a sub-key when off, deletes sm once empty. */
  function setFlag(l, key, on) {
    if (on) { l.sm = Object.assign({}, l.sm || {}); l.sm[key] = true; }
    else if (l.sm) { delete l.sm[key]; if (key === 'tail') delete l.sm.tailEnd; if (!Object.keys(l.sm).length) delete l.sm; }
  }
  E.setFlag = setFlag;

  /* keyframes: every list under l.kf (FM.timedLists, cue effects left out of this mock) */
  function kfLists(l) { const out = []; if (l && l.kf) for (const k in l.kf) if (Array.isArray(l.kf[k])) out.push(l.kf[k]); return out; }
  function hasKeys(l) { return kfLists(l).some(a => a.length); }
  function shiftKeys(l, d) { kfLists(l).forEach(a => a.forEach(k => { k.t += d; })); }   // FM.shiftLayerKeyframes
  function valueAt(a, t) {
    if (!a.length) return undefined;
    if (t <= a[0].t) return a[0].v;
    for (let i = 1; i < a.length; i++) if (t <= a[i].t) {
      const p = a[i - 1], q = a[i]; const u = q.t === p.t ? 1 : (t - p.t) / (q.t - p.t);
      return typeof p.v === 'number' ? p.v + (q.v - p.v) * u : p.v;
    }
    return a[a.length - 1].v;
  }
  E.valueAt = valueAt;
  E.kfLists = kfLists;

  /* ---------- time maps (§3.5): one map per command, applied to cues, track window, rider keys ---------- */
  //   {type:'cut', a, b}            Delete [a,b): t<a t · a≤t<b a · t≥b t−len
  //   {type:'insert', at, d}        t<at t · t≥at t+d   (cues split at `at` first)
  //   {type:'speed', a, old, k}     a+(t−a)k inside, t+old(k−1) after
  //   {type:'pieces', pieces}       piecewise translation g (Reorder), each {a, b, off}
  //   {type:'lift', a, b, cut}      Make overlay: cues inside [a,b) keep their time, the rest go through cut
  //   {type:'none'}
  function mapT(m, t, isEnd) {
    switch (m.type) {
      case 'cut': return t < m.a ? t : (t < m.b ? m.a : t - (m.b - m.a));
      case 'insert': return t < m.at ? t : t + m.d;
      case 'speed': return t < m.a ? t : (t < m.a + m.old ? m.a + (t - m.a) * m.k : t + m.old * (m.k - 1));
      case 'pieces': { const x = isEnd ? t - 1e-9 : t; for (const p of m.pieces) if (x >= p.a && x < p.b) return t + p.off; return t; }
      case 'lift': return mapT(m.cut, t, isEnd);
      default: return t;
    }
  }
  E.mapT = mapT;
  function splitsOf(m) {
    if (m.type === 'insert') return [m.at];
    if (m.type === 'pieces') return m.splits || [];
    if (m.type === 'lift') return [m.a, m.b];
    return [];
  }

  /* riderKeys (§3.10 rule 3, plainly): map every key; a cut drops keys strictly inside (a,b) and leaves a
     clean-step boundary pair at a (value just before a, then the value at b). */
  function riderKeys(l, m) {
    kfLists(l).forEach(a => {
      if (!a.length) return;
      if (m.type === 'cut' || m.type === 'lift') {
        const c = m.type === 'cut' ? m : m.cut, len = c.b - c.a;
        const before = a.filter(k => k.t < c.a), after = a.filter(k => k.t >= c.b);
        const cutAny = a.some(k => k.t > c.a && k.t < c.b);
        const out = before.map(k => ({ t: k.t, v: k.v }));
        if (cutAny && before.length && after.length) { out.push({ t: c.a, v: valueAt(a, c.a) }); out.push({ t: c.a, v: valueAt(a, c.b) }); }
        after.forEach(k => out.push({ t: k.t - len, v: k.v }));
        a.length = 0; out.forEach(k => a.push(k));
      } else a.forEach(k => { k.t = mapT(m, k.t, false); });
      a.sort((p, q) => p.t - q.t);
    });
  }
  E.riderKeys = riderKeys;

  /* ---------------------------------- classify (§5.2) ---------------------------------- */
  function isGroup(l) { return !!l && l.type === 'group'; }
  function blockGroup(g) { return !!(g.maskGroup || g.shadow || (g.opacity != null && g.opacity < 1) || hasKeys(g)); }
  function fillsFrame(l) {
    const tr = l.transform || {};
    return !((tr.scale != null && tr.scale < 0.95) || l.mask || (l.blendMode && l.blendMode !== 'normal'));
  }
  function drawsPicture(l) { return !l.audioOnly && !(l.opacity != null && l.opacity < 0.01); }
  function audible(l) { return (l.type === 'video') && !l.muted && !l.silent; }
  function blendMax(a, b) { return 0.5 * Math.min(a.end - a.start, b.end - b.start); }

  function classify(doc) {
    const P = doc.project, fps = P.fps || 30, eps = 0.5 / fps, minLen = E.minLen(fps);
    const L = doc.layers, byId = new Map(L.map(l => [l.id, l])), z = new Map(L.map((l, i) => [l.id, i]));
    const memberOf = l => { const p = l.parent && byId.get(l.parent); return isGroup(p) ? p : null; };
    // 1. UNITS (§2.5): a block group folds its descendants; a transparent group's own layer is bookkeeping.
    const unitOf = new Map(), units = {}, groups = [];
    const outerBlock = l => { let root = null, cur = l, hops = 0; while ((cur = memberOf(cur)) && hops++ < 64) if (blockGroup(cur)) root = cur; return root; };
    for (const l of L) {
      const ob = outerBlock(l) || (isGroup(l) && blockGroup(l) ? l : null);
      if (ob) { (units[ob.id] = units[ob.id] || { id: ob.id, lead: ob, layers: [] }).layers.push(l.id); unitOf.set(l.id, ob.id); continue; }
      if (isGroup(l)) { groups.push(l.id); continue; }
      units[l.id] = { id: l.id, lead: l, layers: [l.id] }; unitOf.set(l.id, l.id);
    }
    for (const id in units) {
      const u = units[id]; const ls = u.layers.map(i => byId.get(i));
      const members = ls.filter(l => !isGroup(l)); const span = members.length ? members : ls;
      u.start = Math.min(...span.map(l => l.start)); u.end = Math.max(...span.map(endOf)); u.duration = u.end - u.start;
      u.z = Math.min(...ls.map(l => z.get(l.id)));
      const l = u.lead;
      // 3. KIND (one table)
      u.kind = l.type === 'camera' ? 'fullOnly'
        : l.type === 'null' ? 'fullOnly'
        : isGroup(l) || /^mask-/.test(l.blendMode || '') ? 'block'
        : l.type === 'adjustment' ? 'effect'
        : l.type === 'text' && Array.isArray(l.captions) ? 'captions'
        : l.type === 'text' ? 'text'
        : l.type === 'shape' ? 'overlay'
        : l.audioOnly === true ? 'audio'
        : !drawsPicture(l) ? (audible(l) ? 'audio' : 'overlay')
        : 'overlay';
    }
    const U = Object.values(units);
    // 4. MAIN TRACK: stored wins ONLY once project.sm.adopted; otherwise derive.
    const adopted = !!(P.sm && P.sm.adopted);
    let main = [];
    const background = new Set();
    if (adopted) {
      main = U.filter(u => u.kind !== 'block' && u.kind !== 'audio' && u.kind !== 'captions' && u.kind !== 'fullOnly' && hasFlag(u.lead, 'main'));
    } else {
      const cands = U.filter(u => u.kind === 'overlay' && /^(video|image)$/.test(u.lead.type) && u.duration > 0 && drawsPicture(u.lead) && fillsFrame(u.lead));
      const vis = cands.filter(u => u.lead.visible !== false);
      // background: S spans 2+ others, all above it, tiling its stretch, and S is silent
      for (const S of vis) {
        const spanned = vis.filter(o => o !== S && o.start >= S.start - eps && o.end <= S.end + eps).sort((a, b) => a.start - b.start);
        if (spanned.length < 2 || !spanned.every(o => o.z < S.z) || audible(S.lead)) continue;
        let ok = spanned[0].start <= S.start + eps && spanned[spanned.length - 1].end >= S.end - eps;
        for (let i = 1; ok && i < spanned.length; i++) if (spanned[i].start > spanned[i - 1].end + eps) ok = false;
        if (ok) background.add(S.id);
      }
      let pool = vis.filter(u => !background.has(u.id));
      // stacked take: a candidate fully covered by a HIGHER full-frame one is dropped (unless the upper blends)
      pool = pool.filter(u => !pool.some(o => o !== u && o.z < u.z && o.start <= u.start + eps && o.end >= u.end - eps &&
        !(o.lead.blendMode && o.lead.blendMode !== 'normal') && !(o.lead.opacity != null && o.lead.opacity < 1) && !(o.lead.kf && o.lead.kf.opacity)));
      // greedy, bottom of the stack first. "Overlaps at most one taken clip" is read as: at no instant
      // does it overlap two taken clips (a clip with a hand crossfade on BOTH sides stays main).
      pool.sort((a, b) => b.z - a.z || a.start - b.start);
      const taken = [];
      for (const u of pool) {
        const ov = taken.filter(t => Math.min(t.end, u.end) - Math.max(t.start, u.start) > eps);
        let ok = true;
        for (const t of ov) {
          const amt = Math.min(t.end, u.end) - Math.max(t.start, u.start);
          const pair = t.start <= u.start ? [t, u] : [u, t];
          const tol = isBlendU(pair[0], pair[1]) ? blendMax(pair[0], pair[1]) : Math.min(1, 0.5 * Math.min(t.duration, u.duration));
          if (amt > tol) ok = false;
        }
        for (let i = 0; ok && i < ov.length; i++) for (let j = i + 1; j < ov.length; j++) {
          const a = ov[i], b = ov[j];
          const lo = Math.max(a.start, b.start, u.start), hi = Math.min(a.end, b.end, u.end);
          if (hi - lo > eps) ok = false;
        }
        if (ok) taken.push(u);
      }
      // pass B: hidden candidates that overlap no taken clip
      cands.filter(u => u.lead.visible === false).forEach(u => {
        if (!taken.some(t => Math.min(t.end, u.end) - Math.max(t.start, u.start) > eps)) taken.push(u);
      });
      main = taken;
    }
    function isBlendU(a, b) {           // §3.1: the upper of the two has opacity keys inside [b.start, a.end]
      const up = a.z < b.z ? a.lead : b.lead; const ks = (up.kf && up.kf.opacity) || [];
      return ks.some(k => k.t >= b.start - eps && k.t <= a.end + eps);
    }
    main.sort((a, b) => a.start - b.start || b.z - a.z || (a.id < b.id ? -1 : 1));
    const mainSet = new Set(main.map(u => u.id));
    // 5. SEAMS (§3.1) and slot entries
    function seam(a, b) {
      const diff = a.end - b.start;
      if (diff >= -1e-9 && diff <= eps) return { kind: 'join', amt: 0, diff };
      if (diff < -1e-9 && diff >= -eps) return { kind: 'hairline', amt: -diff, diff };
      if (diff < -eps) return { kind: 'gap', amt: -diff, diff };
      if (diff <= blendMax(a, b) && isBlendU(units[a.id], units[b.id])) return { kind: 'blend', amt: diff, diff };
      return { kind: 'overlap', amt: diff, diff };
    }
    const entries = [];
    const slotCand = u => !mainSet.has(u.id) && !background.has(u.id) && !['audio', 'captions', 'fullOnly'].includes(u.kind) && !hasFlag(u.lead, 'stay');
    for (let i = 0; i < main.length; i++) {
      const u = main[i], prev = entries[entries.length - 1];
      const gapStart = prev ? prev.end : 0;
      if (u.start - gapStart > eps) {
        const members = U.filter(o => slotCand(o) && o.start >= gapStart - 1e-9 && o.start < u.start - eps).map(o => o.id);
        if (members.length) entries.push({ id: 'slot:' + members[0], slot: true, start: gapStart, end: u.start, members });
      }
      entries.push({ id: u.id, start: u.start, end: u.end });
    }
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i], p = entries[i - 1];
      if (e.slot || (p && p.slot)) e.seam = { kind: 'join', amt: 0, diff: 0 };
      else if (p) e.seam = seam(p, e);
      else e.seam = e.start > eps ? { kind: 'gap', amt: e.start, diff: -e.start } : e.start < -eps ? { kind: 'negativeStart', amt: -e.start } : { kind: 'join', amt: 0, diff: 0 };
      e.i = i;
    }
    const R = {
      fps, eps, minLen, adopted, main: entries, units, unitOf, groups, byId, z, background,
      trackEnd: entries.length ? entries[entries.length - 1].end : 0,
      idx: {}, followers: {}, tail: [], riders: [], anomalies: [], wouldStay: [], notices: [], lanes: {}
    };
    entries.forEach((e, i) => { R.idx[e.id] = i; R.followers[e.id] = []; });
    R.isMain = id => mainSet.has(id);
    R.entry = id => entries[R.idx[id]];
    R.layer = id => byId.get(id);
    // mainAt (§4.1): start−eps ≤ t < end−eps, over clips AND slots; the LAST match wins, so an item exactly on a
    // cut belongs to the clip after it.
    R.mainAt = t => { let hit = null; for (const e of entries) if (e.start - eps <= t && t < e.end - eps) hit = e; return hit; };
    R.indexAt = t => { const e = R.mainAt(t); return e ? e.i : -1; };
    R.withinOneClip = u => entries.some(e => !e.slot && u.start >= e.start - eps && u.end <= e.end + eps);
    R.isLong = u => {                                       // §4.1: whole track, or touches three or more clips
      if (!entries.length) return false;
      const i = R.indexAt(u.start);
      const whole = u.start <= entries[0].start + eps && u.end >= R.trackEnd - eps;
      const pastNext = i >= 0 && i + 1 < entries.length && u.end > entries[i + 1].end + eps;
      return whole || pastNext;
    };
    R.linksOf = u => { const l = u.lead; const p = l.parent && byId.get(l.parent); return p && !isGroup(p) && units[unitOf.get(p.id)] ? [units[unitOf.get(p.id)]] : []; };
    // 6. HOSTS (§4.1 hostOf). opts.startOnly: the clip it starts on, without the long/sound tests (the invariant view).
    R.hostOf = function hostOf(u, seen = new Set(), opts = {}) {
      const l = u.lead;
      if (hasFlag(l, 'main') && adopted) return null;
      if (hasFlag(l, 'stay')) return null;
      if (mainSet.has(u.id)) return null;
      if (u.kind === 'fullOnly' || background.has(u.id)) return null;
      if (u.kind === 'captions' && !R.withinOneClip(u)) return null;
      if (seen.has(u.id)) return null; seen.add(u.id);
      for (const v of R.linksOf(u)) { if (mainSet.has(v.id)) return v.id; const h = hostOf(v, seen, opts); if (h) return h; }
      const c = R.mainAt(u.start);
      if (!c) return null;
      if (opts.startOnly) return c.id;
      if (u.kind === 'audio' && !hasFlag(l, 'twin') && u.end > c.end + 1.0) return null;   // the one sound rule
      if (!c.slot && R.isLong(u)) return null;
      return c.id;
    };
    for (const u of U) {
      if (mainSet.has(u.id)) { u.section = 'main'; u.host = null; continue; }
      if (background.has(u.id)) u.kind = 'background';
      const inSlot = entries.find(e => e.slot && e.members.includes(u.id));
      u.host = inSlot ? inSlot.id : R.hostOf(u);
      if (u.host) R.followers[u.host].push(u.id);
      // 7. SIDE (§3.6.1): behind when lower in the stack than every main clip it overlaps
      const over = main.filter(m => Math.min(m.end, u.end) - Math.max(m.start, u.start) > eps);
      u.side = over.length ? (over.every(m => m.z < u.z) ? 'behind' : 'front') : 'none';
      u.section = u.kind === 'captions' ? 'captions' : u.kind === 'text' ? 'text' : u.kind === 'effect' ? 'effect'
        : u.kind === 'audio' ? 'audio' : u.kind === 'fullOnly' ? 'none'
        : u.kind === 'background' || (u.side === 'behind' && u.kind !== 'block') ? 'behind' : 'overlay';
    }
    // 9. TAIL (§4.3) and riders (§3.5)
    for (const u of U) {
      if (mainSet.has(u.id)) continue;
      if (u.kind !== 'captions' && u.kind !== 'fullOnly' && !hasFlag(u.lead, 'stay') && !u.host && entries.length && u.start >= R.trackEnd - eps) R.tail.push(u.id);
      if (u.kind === 'captions' && !hasFlag(u.lead, 'stay') && !u.host) R.riders.push(u.id);
    }
    // wouldStay (§5.3): what adoption / pinStrays would pin
    R.neverPinned = u => u.kind === 'captions' || u.kind === 'fullOnly' || R.tail.includes(u.id) || entries.some(e => e.slot && e.members.includes(u.id)) || !!(u.lead.sm);
    for (const u of U) if (!mainSet.has(u.id) && !u.host && !R.neverPinned(u)) R.wouldStay.push(u.id);
    // 11. LANES (§8.6): greedy packing per section; sound packs the longest first
    const secs = {};
    U.forEach(u => { if (u.section && u.section !== 'main' && u.section !== 'none') (secs[u.section] = secs[u.section] || []).push(u); });
    for (const s in secs) {
      const items = secs[s].slice().sort(s === 'audio' ? (a, b) => b.duration - a.duration || a.start - b.start : (a, b) => a.start - b.start || a.z - b.z);
      const lanes = [];
      for (const u of items) {
        let lane = lanes.find(ln => ln.every(o => o.end <= u.start + 1e-9 || o.start >= u.end - 1e-9));
        if (!lane) lanes.push(lane = []);
        lane.push(u);
      }
      R.lanes[s] = lanes.map(ln => ln.map(u => u.id));
    }
    // 12. ANOMALIES and notices
    entries.forEach((e, i) => { if (['gap', 'overlap', 'hairline'].includes(e.seam.kind)) R.anomalies.push({ kind: e.seam.kind, ids: [i ? entries[i - 1].id : null, e.id], amt: e.seam.amt }); });
    U.forEach(u => { if (u.kind === 'fullOnly') R.notices.push({ kind: 'fullOnly', id: u.id }); if (u.kind === 'block') R.notices.push({ kind: 'block', id: u.id }); });
    return R;
  }
  E.classify = E.read = classify;

  /* ---------------------------------- plans ---------------------------------- */
  function newPlan(label) {
    return { label, moves: new Map(), lands: new Map(), writes: [], removes: new Set(), adds: [], flags: [],
             map: { type: 'none' }, pinFollowers: [], zops: [], arranges: true, say: '', time: null, cutUnits: new Set() };
  }
  function addMove(P, id, d) { P.moves.set(id, (P.moves.get(id) || 0) + d); }          // §3.3 additive
  function addLand(P, id, t) { P.lands.set(id, t); }                                      // §3.1 exact landing
  function moveEntry(R, P, e, d) { if (e.slot) e.members.forEach(m => addMove(P, m, d)); else addMove(P, e.id, d); }
  /* §3.4 THE one ripple: by main-track ORDER (an index), never by clock time */
  function ripple(R, P, from, dt, skip = new Set()) {
    for (let i = from; i < R.main.length; i++) {
      const c = R.main[i]; if (skip.has(c.id)) continue;
      moveEntry(R, P, c, dt);
      for (const f of R.followers[c.id] || []) if (!skip.has(f)) addMove(P, f, dt);
    }
  }
  const refuse = s => ({ refuse: s });
  const nameOf = l => (l && (l.name || l.text || l.id)) || 'clip';
  function mainEntry(R, id) {
    const i = R.idx[id]; if (i == null) return null;
    const e = R.main[i]; return e.slot ? null : e;
  }
  function uid(doc, base) { const ids = new Set(doc.layers.map(l => l.id)); let n = 2, id = base + '-' + n; while (ids.has(id)) id = base + '-' + (++n); return id; }
  function blendAround(R, i) {
    const e = R.main[i], n = R.main[i + 1];
    return (e && e.seam.kind === 'blend') || (n && n.seam.kind === 'blend');
  }
  /* A clip beside a blend OR a plain overlap must stay at least 2·amt long. §3.1 states it for blends; the same floor
     is needed for overlaps, because the classifier's tolerance is half the shorter clip (§5.2), so a shorter clip
     would drop off the derived main track, or its chip would change kind (found by engine-tests' random sweep). */
  function seamFloor(R, i) {
    const e = R.main[i], n = R.main[i + 1]; let f = 0;
    if (e && ['blend', 'overlap'].includes(e.seam.kind) && i > 0) f = Math.max(f, 2 * e.seam.amt);
    if (n && ['blend', 'overlap'].includes(n.seam.kind)) f = Math.max(f, 2 * n.seam.amt);
    // a hair over 2·amt: a trim that lands exactly on the floor can come back as a plain overlap by float noise alone
    // (0.6000000000000005 against half of 1.1999999999999993), and the crossfade would turn into a red chip
    return f ? f + 1e-12 : 0;
  }
  function blendOwner(R, a, b) { return R.z.get(a.id) < R.z.get(b.id) ? a : b; }   // the upper clip owns the fade
  /* §3.6 trims on a blend seam: the owner's fade keys (its opacity keys inside the overlap, the same window the classifier
     reads) are set apart and move by `d`; its other opacity keys go through the seam's map `m`, so the list stays sorted.
     A cut drops keys strictly inside (a, b) and leaves riderKeys' clean-step pair at a; a key exactly on a stays (its value
     is the value just before the cut). ownFirst: the fade keys sit before the others (a fade-in) or after them (a fade-out). */
  function moveFade(x, isOwned, d, m, ownFirst) {
    const ks = x.kf && x.kf.opacity; if (!ks || !ks.length) return;
    const orig = ks.map(k => ({ t: k.t, v: k.v }));
    const own = orig.filter(k => isOwned(k.t)).map(k => ({ t: k.t + d, v: k.v }));
    let rest = orig.filter(k => !isOwned(k.t));
    if (m.type === 'cut') {
      const len = m.b - m.a, out = rest.filter(k => k.t <= m.a);
      const cutAny = rest.some(k => k.t > m.a && k.t < m.b);
      if (cutAny && orig.some(k => k.t <= m.a) && orig.some(k => k.t >= m.b)) out.push({ t: m.a, v: valueAt(orig, m.a) }, { t: m.a, v: valueAt(orig, m.b) });
      rest.filter(k => k.t >= m.b).forEach(k => out.push({ t: k.t - len, v: k.v }));
      rest = out;
    } else rest = rest.map(k => ({ t: mapT(m, k.t, false), v: k.v }));
    const all = ownFirst ? own.concat(rest) : rest.concat(own);
    all.sort((p, q) => p.t - q.t);                       // stable: equal times keep the order above
    ks.length = 0; all.forEach(k => ks.push(k));
  }

  /* ---------------------------------- commands (§3.6) ---------------------------------- */
  const C = {};

  // Delete a main clip c: removes c and its followers; everything after closes up by the SLOT it leaves
  // (dt = −(n.start − c.start)); long items over it are cut through the delete map; cues cut the same way.
  C.deleteClip = function (R, doc, { id }) {
    const c = mainEntry(R, id); if (!c) return refuse('Pick a clip on the clip row first');
    const i = c.i, p = R.main[i - 1], n = R.main[i + 1];
    const P = newPlan('Delete ' + nameOf(R.layer(id)));
    let a = c.start, b = n ? n.start : c.end;
    let note = '';
    if (p && n && c.seam.kind === 'blend') {
      if (blendOwner(R, p, c) === c) { a = p.end; note = ' · the fade went with it'; }        // c faded in over p: n lands at p.end
      else {                                                                                  // p fades out: keep only if still a blend
        const pl = R.layer(p.id), stillBlend = R.z.get(p.id) < R.z.get(n.id) && c.seam.amt <= blendMax(p, n);
        if (!stillBlend) {
          a = p.end; note = ' · removed 1 crossfade';
          P.writes.push({ id: p.id, fn: l => { const ks = l.kf && l.kf.opacity; if (ks) { const v = valueAt(ks, c.start - 1e-6); l.kf.opacity = ks.filter(k => k.t < c.start - R.eps).concat([]); if (!l.kf.opacity.length) delete l.kf.opacity; l.opacity = v; } } });
        }
      }
    }
    const len = b - a;
    P.removes.add(c.id);
    const fol = R.followers[c.id] || [];
    fol.forEach(f => P.removes.add(f));
    // long units overlapping [a,b): cut through the delete map (§3.6 cases i-iii), then pinned
    const cutMap = { type: 'cut', a, b };
    for (const uid_ in R.units) {
      const u = R.units[uid_];
      if (R.isMain(u.id) || u.host || fol.includes(u.id) || R.tail.includes(u.id)) continue;
      if (['captions', 'fullOnly', 'block', 'background'].includes(u.kind) || hasFlag(u.lead, 'stay')) continue;
      if (!(u.start < b - R.eps && u.end > a + R.eps)) continue;
      const l = u.lead, s = l.start, e = endOf(l), media = l.type === 'video' || l.audioOnly, sp = l.speed || 1;
      P.cutUnits.add(u.id);
      if (s >= a - 1e-9 && s < b) {                                   // (i) starts inside
        if (media) { if (e - b < R.minLen - 1e-6) return refuse('That would leave a piece too short to keep'); }
        P.writes.push({ id: l.id, fn: x => { riderKeys(x, cutMap);
          if (media) { x.trimStart = (x.trimStart || 0) + (b - s) * sp; x.duration = e - b; }
          else x.duration = Math.max(R.minLen, mapT(cutMap, e, true) - a);
          x.start = a; } });
      } else if (e <= b + 1e-9) {                                      // (ii) ends inside
        P.writes.push({ id: l.id, fn: x => { riderKeys(x, cutMap); x.duration = Math.max(R.minLen, a - s); } });
      } else {                                                         // (iii) a middle cut
        if (!media) P.writes.push({ id: l.id, fn: x => { riderKeys(x, cutMap); x.duration -= len; } });
        else {
          if (a - s < R.minLen - 1e-6 || e - b < R.minLen - 1e-6) return refuse('That would leave a piece too short to keep');
          const bid = uid(doc, l.id);
          P.writes.push({ id: l.id, fn: (x, docN) => {
            const B = clone(x); B.id = bid; B.splitOf = x.id; B.start = a; B.duration = e - b;
            B.trimStart = (x.trimStart || 0) + (b - s) * sp;
            kfLists(B).forEach(arr => { const keep = arr.filter(k => k.t >= b).map(k => ({ t: k.t - len, v: k.v })); arr.length = 0; keep.forEach(k => arr.push(k)); });
            kfLists(x).forEach(arr => { const keep = arr.filter(k => k.t <= a); arr.length = 0; keep.forEach(k => arr.push(k)); });
            x.duration = a - s; setFlag(B, 'stay', true); if (B.sm) delete B.sm.tail, delete B.sm.tailEnd; if (B.sm && !Object.keys(B.sm).length) delete B.sm;
            docN.layers.splice(docN.layers.indexOf(x), 0, B);
          } });
        }
      }
    }
    ripple(R, P, i + 1, -len, new Set([c.id]));
    P.map = cutMap;
    const n2 = fol.length;
    P.say = 'Deleted clip' + (n2 ? ' and ' + n2 + (n2 === 1 ? ' thing' : ' things') + ' on it' : '') + note;
    P.time = a;
    return P;
  };

  // Trim the tail of c to `dur` (landed). Followers cut away slide back onto c (D6); the rest closes up.
  C.trimTail = function (R, doc, { id, dur }) {
    const c = mainEntry(R, id); if (!c) return refuse('Pick a clip on the clip row first');
    const l = R.layer(id), i = c.i, n = R.main[i + 1], sp = l.speed || 1, old = l.duration;
    let want = dur;
    if (want < old && old < R.minLen - 1e-6) return refuse('This clip is already as short as it can go');
    want = Math.max(want, R.minLen);
    if (l.type === 'video' && l.srcDur != null) want = Math.min(want, (l.srcDur - (l.trimStart || 0)) / sp);
    // §3.6: on a blend seam c|n the trim stops at 2·amt (seamFloor). When c owns the fade (it fades out over n), its fade
    // keys move with the cut by the landed dt, so the fade still ends at c's new end over the same amt (the seam's map:
    // the Delete map over [n.start + dt, n.start) for dt < 0, the Insert map at n.start for dt > 0). When n owns it, the
    // ripple carries n's keys.
    const owns = !!(n && n.seam.kind === 'blend' && blendOwner(R, c, n) === c);
    want = Math.max(want, seamFloor(R, i));
    const dt = want - old;
    if (Math.abs(dt) < 1e-9) return refuse(dur > old ? 'Not enough footage' : 'Nothing more to trim');
    const P = newPlan('Trim ' + nameOf(l));
    if (owns) {
      const ns = n.start, lo = ns - R.eps, hi = c.end + R.eps;
      const m = dt < 0 ? { type: 'cut', a: ns + dt, b: ns } : { type: 'insert', at: ns, d: dt };
      P.writes.push({ id, fn: x => { x.duration = want; moveFade(x, t => t >= lo && t <= hi, dt, m, false); } });
    } else P.writes.push({ id, fn: x => { x.duration = want; } });
    const newEnd = c.start + want;
    // D6 slide-back. Plain extension: the cut-off is the new end OR where the next clip now starts, whichever is
    // earlier, so a follower never ends up starting inside the next clip's overlap (it would re-home there).
    const cutoff = Math.min(newEnd, n ? n.start + dt : Infinity);
    if (dt < 0) for (const f of R.followers[id]) {
      const u = R.units[f];
      if (u.start >= cutoff - R.eps) addLand(P, f, Math.max(c.start, cutoff - u.duration));
      if (u.kind === 'effect' && u.end <= c.end + 1e-9) {                                           // §4.3 effect clamp
        const s2 = u.start >= cutoff - R.eps ? Math.max(c.start, cutoff - u.duration) : u.start;
        P.writes.push({ id: f, fn: x => { x.duration = Math.max(R.minLen, Math.min(x.duration, newEnd - s2)); } });
      }
    }
    for (const f of R.followers[id]) if (R.units[f].kind === 'captions') {             // a caption track on c keeps inside c
      const u = R.units[f]; const s2 = P.lands.has(f) ? P.lands.get(f) : u.start;
      if (s2 + u.duration > newEnd) P.writes.push({ id: f, fn: x => { x.duration = Math.max(E.MIN_CUE, newEnd - s2); } });
    }
    ripple(R, P, i + 1, dt);
    const A = n ? n.start : c.end;                          // §3.4: anchored at the first moved clip's original start
    P.map = dt < 0 ? { type: 'cut', a: A + dt, b: A } : { type: 'insert', at: A, d: dt };
    P.time = newEnd - 1 / R.fps;
    return P;
  };

  // Trim the head of c by h (+ trims in, − extends back). c keeps its start; its footage and keys move (§3.6).
  C.trimHead = function (R, doc, { id, by }) {
    const c = mainEntry(R, id); if (!c) return refuse('Pick a clip on the clip row first');
    const l = R.layer(id), i = c.i, p = R.main[i - 1], sp = l.speed || 1;
    let L = by;
    if (L > 0 && l.duration < R.minLen - 1e-6) return refuse('This clip is already as short as it can go');
    L = Math.min(L, l.duration - R.minLen);
    if (l.type === 'video' || l.audioOnly) L = Math.max(L, -(l.trimStart || 0) / sp);
    // §3.6: on a blend seam p|c the trim stops at 2·amt (seamFloor). When c owns the fade (it fades in over p), its fade
    // keys (t ≤ p.end + eps) are exempt from the −L, so the fade stays over the overlap; its other opacity keys go through
    // the Delete map over [p.end, p.end + L) (L > 0) or the Insert map at p.end (L < 0). When p owns it, nothing moves at the seam.
    const owns = !!(c.seam.kind === 'blend' && p && blendOwner(R, p, c) === c);
    L = Math.min(L, l.duration - seamFloor(R, i));
    if (Math.abs(L) < 1e-9) return refuse(by > 0 ? 'Nothing more to trim' : 'Not enough footage');
    const P = newPlan('Trim ' + nameOf(l));
    const pe = owns ? p.end : 0, fadeKeys = t => t <= pe + R.eps;
    const fm = L > 0 ? { type: 'cut', a: pe, b: pe + L } : { type: 'insert', at: pe, d: -L };
    P.writes.push({ id, fn: x => {
      x.duration -= L; if (x.type === 'video' || x.audioOnly) x.trimStart = (x.trimStart || 0) + L * sp;
      if (!owns) { shiftKeys(x, -L); return; }
      const op = x.kf && x.kf.opacity;                                   // the opacity list is mapped on its own
      kfLists(x).forEach(a => { if (a !== op) a.forEach(k => { k.t -= L; }); });
      moveFade(x, fadeKeys, 0, fm, true);
    } });
    const newEnd = c.end - L;
    for (const f of R.followers[id]) {
      const u = R.units[f]; const s2 = Math.max(c.start, u.start - L); if (s2 !== u.start) addMove(P, f, s2 - u.start);
      if (u.kind === 'captions' && s2 + u.duration > newEnd) P.writes.push({ id: f, fn: x => { x.duration = Math.max(E.MIN_CUE, newEnd - s2); } });
    }
    ripple(R, P, i + 1, -L);
    P.map = L > 0 ? { type: 'cut', a: c.start, b: c.start + L } : { type: 'insert', at: c.start, d: -L };
    P.time = c.start;
    return P;
  };

  // Split c at t. Not an arranging edit: nothing moves (§3.6 Split row).
  C.split = function (R, doc, { id, t }) {
    const c = mainEntry(R, id); if (!c) return refuse('Pick a clip on the clip row first');
    const l = R.layer(id); t = E.snap(t, R.fps);
    if (t - c.start < R.minLen - 1e-6 || c.end - t < R.minLen - 1e-6) return refuse('Too close to the edge of the clip. Trim instead?');
    for (let k = 1; k < R.main.length; k++) { const s = R.main[k].seam; if ((s.kind === 'blend' || s.kind === 'overlap') && t >= R.main[k].start - 1e-9 && t <= R.main[k - 1].end + 1e-9) return refuse('Move the playhead out of the crossfade to split it'); }
    { const e = R.main[c.i], n = R.main[c.i + 1];
      if ((c.i > 0 && ['blend', 'overlap'].includes(e.seam.kind) && t - c.start < 2 * e.seam.amt) || (n && ['blend', 'overlap'].includes(n.seam.kind) && c.end - t < 2 * n.seam.amt))
        return refuse('That piece would be shorter than the overlap next to it'); }
    const P = newPlan('Split ' + nameOf(l)); P.arranges = false;
    const bid = uid(doc, id);
    P.writes.push({ id, fn: (x, docN) => {
      const B = clone(x); B.id = bid; B.splitOf = x.splitOf || x.id; B.start = t; B.duration = endOf(x) - t;
      if (x.type === 'video' || x.audioOnly) B.trimStart = (x.trimStart || 0) + (t - x.start) * (x.speed || 1);
      kfLists(x).forEach(arr => { const v = valueAt(arr, t); const keep = arr.filter(k => k.t < t); if (arr.length && keep.length < arr.length) keep.push({ t, v }); arr.length = 0; keep.forEach(k => arr.push(k)); });
      kfLists(B).forEach(arr => { const v = valueAt(arr, t); const keep = arr.filter(k => k.t > t); if (arr.length && keep.length < arr.length) keep.unshift({ t, v }); arr.length = 0; keep.forEach(k => arr.push(k)); });
      x.duration = t - x.start;
      setFlag(x, 'tail', false);                          // onSplit: only the later piece can end with the video
      docN.layers.splice(docN.layers.indexOf(x), 0, B);   // B directly above A
    } });
    P.say = ''; P.time = t; P.newId = bid;
    return P;
  };

  // Reorder c to the cut before main[to] (0..length). Both halves against the ORIGINAL R (§3.6 Reorder row).
  C.reorder = function (R, doc, { id, to }) {
    const c = mainEntry(R, id); if (!c) return refuse('Pick a clip on the clip row first');
    const i = c.i, j = to, N = R.main.length;
    if (j < 0 || j > N) return refuse('There is no place there');
    if (j === i || j === i + 1) return refuse('It is already there');
    if (blendAround(R, i) || (j < N && R.main[j].seam.kind === 'blend')) return refuse('Some clips fade into each other · move them by hand');
    // plain: the design's seam' = main[j−1].end puts the moved clip INSIDE an overlap at the destination (it can land after
    // the next clip, or swallow a follower); refuse and let the overlap chip fix it first
    if (j > 0 && j < N && R.main[j].seam.kind === 'overlap') return refuse('Those two clips overlap · fix the overlap first');
    const n = R.main[i + 1], L = n ? n.start - c.start : c.end - c.start;
    const S = new Set([c.id, ...(R.followers[c.id] || [])]);
    const P = newPlan('Move ' + nameOf(R.layer(id)));
    ripple(R, P, i + 1, -L, S);                           // close the hole
    ripple(R, P, j, +L, S);                               // open the slot
    let seamT;
    if (j === 0) seamT = R.main[0].start;
    else { const e = R.main[j - 1]; const mv = e.slot ? (P.moves.get(e.members[0]) || 0) : (P.moves.get(e.id) || 0); seamT = e.end + mv; }
    const d = seamT - c.start;
    S.forEach(u => addMove(P, u, d));
    const s = j < N ? R.main[j].start : R.trackEnd;
    const pieces = j > i ? [{ a: c.start, b: c.start + L, off: d }, { a: c.start + L, b: s, off: -L }]
                         : [{ a: s, b: c.start, off: +L }, { a: c.start, b: c.start + L, off: d }];
    P.map = { type: 'pieces', pieces, splits: [c.start, c.start + L, s] };
    P.say = 'Moved ' + nameOf(R.layer(id)); P.time = seamT;
    return P;
  };

  // Speed of c to sp (flat). Followers keep their length; only where they start on c scales (§3.6 Speed row).
  C.speed = function (R, doc, { id, sp }) {
    const c = mainEntry(R, id); if (!c) return refuse('Pick a clip on the clip row first');
    const l = R.layer(id), i = c.i, s0 = l.speed || 1;
    if (!(sp > 0)) return refuse('Pick a speed');
    if (blendAround(R, i)) return refuse('That clip fades into the next one');
    const old = l.duration, nw = old * s0 / sp, k = nw / old;
    if (nw < R.minLen - 1e-6 && nw < old) return refuse('Too short to speed up that much');
    if (Math.abs(nw - old) < 1e-12) return refuse('Already at that speed');
    if (nw < seamFloor(R, i)) return refuse('Too short to speed up that much');
    const P = newPlan('Speed ' + nameOf(l));
    P.writes.push({ id, fn: x => { x.speed = sp; x.duration = nw; kfLists(x).forEach(a => a.forEach(q => { q.t = c.start + (q.t - c.start) * k; })); } });
    const smap = { type: 'speed', a: c.start, old, k };
    const nNew = R.main[i + 1] ? R.main[i + 1].start + (nw - old) : Infinity;
    for (const f of R.followers[id]) {
      const u = R.units[f]; const s2 = c.start + (u.start - c.start) * k;
      // plain D6 twin: a sped-up clip never leaves a follower starting inside the next clip's overlap
      if (s2 >= nNew - R.eps) addLand(P, f, Math.max(c.start, nNew - u.duration)); else addMove(P, f, s2 - u.start);
      if (u.kind === 'captions') P.writes.push({ id: f, fn: x => {        // a caption track lying on c: its cues are timed to the sound
        const t0 = x.start, ns = mapT(smap, t0);         // the move below lands x.start on ns
        x.captions.forEach(q => { q.start = mapT(smap, t0 + q.start) - ns; q.end = mapT(smap, t0 + q.end, true) - ns; });
        x.duration = Math.max(E.MIN_CUE, mapT(smap, t0 + x.duration, true) - ns); } });
    }
    ripple(R, P, i + 1, nw - old);
    P.map = smap; P.time = c.start;
    return P;
  };

  // Close the gap (or fix the overlap) before entry `id`: the seam lands exactly shut (§3.1, §3.6).
  C.closeGap = function (R, doc, { id }) {
    const k = R.idx[id]; if (k == null) return refuse('Nothing to close there');
    const e = R.main[k], kind = e.seam.kind;
    if (!['gap', 'overlap', 'hairline'].includes(kind)) return refuse(kind === 'blend' ? 'That is a crossfade, it stays' : 'There is no gap there');
    const target = k ? R.main[k - 1].end : 0;
    const d = target - e.start;
    const P = newPlan(kind === 'overlap' ? 'Fix overlap' : 'Close gap');
    ripple(R, P, k, d);
    if (!e.slot) addLand(P, e.id, target);
    P.map = d < 0 ? { type: 'cut', a: e.start + d, b: e.start } : { type: 'insert', at: e.start, d };
    P.say = kind === 'overlap' ? 'Fixed the overlap' : 'Closed the gap'; P.time = target;
    return P;
  };

  // Make overlay (lift) c: c keeps its time and leaves the clip row; the rest closes up. Cues on c stay (lift/paste 0).
  C.makeOverlay = function (R, doc, { id }) {
    const c = mainEntry(R, id); if (!c) return refuse('Pick a clip on the clip row first');
    const i = c.i, p = R.main[i - 1], n = R.main[i + 1];
    let a = c.start; const b = n ? n.start : c.end;
    if (p && n && c.seam.kind === 'blend' && blendOwner(R, p, c) === c) a = p.end;
    const fol = R.followers[id] || [];
    const P = newPlan('Lift ' + nameOf(R.layer(id)));
    P.flags.push({ id, key: 'main', on: false });
    fol.forEach(f => P.flags.push({ id: f, key: 'stay', on: true }));    // only a main clip can host
    ripple(R, P, i + 1, -(b - a), new Set([id, ...fol]));
    P.map = { type: 'lift', a: c.start, b, cut: { type: 'cut', a, b } };
    P.zops.push({ id, to: 'overlay' });
    P.say = nameOf(R.layer(id)) + ' is on top now · the clips closed up'; P.time = c.start;
    return P;
  };

  // Make main clip (drop) overlay o: it goes into the clip row at the cut nearest its start (§3.6).
  C.makeMain = function (R, doc, { id }) {
    const u = R.units[id]; if (!u || R.isMain(id)) return refuse('Pick an overlay first');
    if (u.kind !== 'overlay' || !/^(video|image)$/.test(u.lead.type)) return refuse('Only a video or picture can go in the clip row');
    const N = R.main.length;
    let j = 0, best = Infinity;
    for (let k = 0; k <= N; k++) { const cut = k < N ? R.main[k].start : R.trackEnd; const dd = Math.abs(cut - u.start); if (dd < best - 1e-9) { best = dd; j = k; } }
    const seamT = N === 0 ? 0 : (j === 0 ? R.main[0].start : R.main[j - 1].end);
    const len = u.duration;
    const P = newPlan('Put ' + nameOf(u.lead) + ' in the clip row');
    ripple(R, P, j, +len, new Set([id]));
    addMove(P, id, seamT - u.start);
    P.flags.push({ id, key: 'stay', on: false }, { id, key: 'main', on: true });
    P.zops.push({ id, to: 'main', near: N ? R.main[Math.min(j, N - 1)].id : null });
    P.map = { type: 'insert', at: seamT, d: len };
    P.say = nameOf(u.lead) + ' is in the clip row now'; P.time = seamT;
    return P;
  };

  // Insert new clips at the cut before main[at] (default: the end, i.e. Append). §3.6 Insert / Append rows.
  C.insert = function (R, doc, { clips, at }) {
    if (!clips || !clips.length) return refuse('Pick some clips first');
    const N = R.main.length, j = at == null ? N : Math.max(0, Math.min(N, at));
    if (j > 0 && j < N && R.main[j].seam.kind === 'blend') return refuse('Those clips fade into each other · pick another cut');
    const seamT = N === 0 ? 0 : (j === 0 ? R.main[0].start : (j === N ? R.trackEnd : R.main[j - 1].end));
    const D = clips.reduce((s, x) => s + x.duration, 0);
    const P = newPlan(clips.length === 1 ? 'Add ' + (clips[0].name || 'clip') : 'Add ' + clips.length + ' clips');
    ripple(R, P, j, +D);
    let T = seamT; const ids = [];
    clips.forEach((x, k) => {
      const l = Object.assign({ type: 'video', trimStart: 0, speed: 1 }, clone(x));
      l.id = x.id || uid({ layers: doc.layers.concat(P.adds.map(q => q.layer)) }, 'clip');
      l.start = T; T += x.duration; l.sm = { main: true }; ids.push(l.id);
      P.adds.push({ layer: l, near: N ? R.main[Math.max(0, Math.min(N - 1, j - 1))].id : null });
    });
    P.map = { type: 'insert', at: seamT, d: D };
    P.say = (clips.length === 1 ? 'Added 1 clip' : 'Added ' + clips.length + ' clips'); P.time = seamT; P.newIds = ids;
    return P;
  };

  // Duplicate c: the copy lands at c's end, keyframes and all; later clips make room (§3.6).
  C.duplicate = function (R, doc, { id }) {
    const c = mainEntry(R, id); if (!c) return refuse('Pick a clip on the clip row first');
    if (blendAround(R, c.i)) return refuse('That clip fades into the next one · duplicate it in Full');
    const l = R.layer(id), len = l.duration, did = uid(doc, id);
    const P = newPlan('Duplicate ' + nameOf(l));
    const dup = clone(l); dup.id = did; delete dup.splitOf; delete dup.locked;
    if (dup.sm) { delete dup.sm.tail; delete dup.sm.tailEnd; }
    dup.sm = Object.assign({}, dup.sm, { main: true });
    dup.start = c.end; shiftKeys(dup, c.end - l.start);
    P.adds.push({ layer: dup, above: id });
    ripple(R, P, c.i + 1, +len);
    P.map = { type: 'insert', at: c.end, d: len };
    P.say = 'Duplicated ' + nameOf(l); P.time = c.end; P.newId = did;
    return P;
  };

  // Stay put on / off (not arranging, §3.6)
  C.stayPut = function (R, doc, { id, on }) {
    const u = R.units[id]; if (!u || R.isMain(id)) return refuse('Pick an item first');
    const P = newPlan(on ? 'Stay put' : 'Follow the clip'); P.arranges = false;
    P.flags.push({ id: u.lead.id, key: 'stay', on: !!on });
    return P;
  };
  E.commands = C;

  /* ---------------------------------- apply ---------------------------------- */
  function unitLayers(R, docN, id) {
    const u = R.units[id]; const byIdN = new Map(docN.layers.map(l => [l.id, l]));
    return (u ? u.layers : [id]).map(x => byIdN.get(x)).filter(Boolean);
  }
  /* Rider cues (§3.5): split straddlers, map both ends, drop cues under MIN_CUE, move the window through the map. */
  function applyRiderTrack(x, m, R) {
    const t0 = x.start, D = x.duration;
    let oS = t0, oE = t0 + D;
    if (Math.abs(oE - R.trackEnd) <= R.eps) oE = R.trackEnd;                         // ends snapped before mapping
    if (R.main.length && Math.abs(oS - R.main[0].start) <= R.eps) oS = R.main[0].start;
    let cues = x.captions.map(q => Object.assign({}, q, { s: t0 + q.start, e: t0 + q.end, vis: q.end > 0 && q.start < D }));
    for (const T of splitsOf(m)) {
      const out = [];
      cues.forEach(q => { if (q.vis && q.s < T - R.eps && T + R.eps < q.e) { out.push(Object.assign({}, q, { e: T })); out.push(Object.assign({}, q, { s: T })); } else out.push(q); });
      cues = out;
    }
    let dropped = 0;
    const nS0 = Math.max(0, mapT(m, oS, false)), nE0 = mapT(m, oE, true);
    cues = cues.filter(q => {
      if (!q.vis) { const d = q.e <= t0 ? nS0 - oS : nE0 - oE; q.s += d; q.e += d; return true; }   // hidden cues ride their edge
      if (m.type === 'lift' && (q.s + q.e) / 2 >= m.a && (q.s + q.e) / 2 < m.b) {                   // lifted: paste(0)
        if (q.e - q.s < E.MIN_CUE - 1e-9) { dropped++; return false; }
        return true;
      }
      let s, e;
      if (m.type === 'insert') {
        // Insert / Append / Put in the clip row / a lengthening trim (§3.5, Q20): after splitAt(seam) a cue lies wholly
        // before the seam or wholly after it. One that ends AT the seam stays before it: f(t) = t + D for t ≥ seam used to
        // send its end past the new clip, so "So cold!" showed over Ice cream from 7.1 to 9.1 s (QA 29 Sep, V9).
        // Within eps of the seam counts as on it, the same tolerance the split uses.
        if (q.s >= m.at - R.eps) { s = q.s + m.d; e = q.e + m.d; }
        else if (q.e <= m.at + R.eps) { s = q.s; e = Math.min(q.e, m.at); }
        else { s = mapT(m, q.s, false); e = mapT(m, q.e, true); }
      } else { s = mapT(m, q.s, false); e = mapT(m, q.e, true); }
      q.s = s; q.e = e;
      if (e - s < E.MIN_CUE - 1e-9) { if (e - s > 1e-9) dropped++; return false; }   // collapsed to nothing: went with its clip
      return true;
    });
    let nS = nS0, nE = Math.max(nS + E.MIN_CUE, nE0);
    if (m.type === 'pieces' || m.type === 'lift') {                                                 // hull of the visible pieces
      cues.forEach(q => { if (q.vis) { nS = Math.min(nS, q.s); nE = Math.max(nE, q.e); } });
      nS = Math.max(0, nS);
    }
    x.start = nS; x.duration = nE - nS;
    x.captions = cues.sort((p, q) => p.s - q.s).map(q => { const o = Object.assign({}, q); o.start = q.s - nS; o.end = q.e - nS; delete o.s; delete o.e; delete o.vis; return o; });
    return dropped;
  }

  function applyPlan(docN, R, P) {
    const byIdN = () => new Map(docN.layers.map(l => [l.id, l]));
    let m = byIdN();
    // 0. adoption (§5.3): the first arranging edit stores what the classifier worked out, in the same step
    if ((P.arranges || P.flags.some(f => f.key === 'main')) && !R.adopted) {
      R.main.forEach(e => { if (!e.slot) { const l = m.get(e.id); if (l) setFlag(l, 'main', true); } });
      docN.project.sm = Object.assign({}, docN.project.sm, { v: 1, adopted: true });
      P._adopted = true;
    }
    // 1. writes (trims, splits, cuts) on the original positions
    P.writes.forEach(w => { const l = m.get(w.id); if (l) w.fn(l, docN); });
    m = byIdN();
    // 2. moves: one shiftUnit per id with its summed dt, or an exact landing (§3.3)
    const ids = new Set([...P.moves.keys(), ...P.lands.keys()]);
    ids.forEach(id => {
      if (P.removes.has(id)) return;
      const ls = unitLayers(R, docN, id); if (!ls.length) return;
      const u = R.units[id]; const lead = u ? u.start : ls[0].start;
      const d = P.lands.has(id) ? P.lands.get(id) - lead : P.moves.get(id);
      if (!d) return;
      ls.forEach(l => { if (P.lands.has(id) && l.id === id) l.start = P.lands.get(id); else l.start += d; shiftKeys(l, d); });
    });
    // 3. removes (a unit takes all its layers)
    const rm = new Set(); P.removes.forEach(id => unitLayers(R, docN, id).forEach(l => rm.add(l.id)));
    docN.layers = docN.layers.filter(l => !rm.has(l.id));
    // 4. adds, in the main band
    P.adds.forEach(a => {
      let at = docN.layers.length;
      const near = a.above || a.near; const k = near ? docN.layers.findIndex(l => l.id === near) : -1;
      if (k >= 0) at = k; else { const firstMain = docN.layers.findIndex(l => hasFlag(l, 'main')); if (firstMain >= 0) at = firstMain; }
      docN.layers.splice(at, 0, a.layer);
    });
    m = byIdN();
    // 5. riders: every spanning caption track and the camera go through the command's map (§3.5, §3.10)
    let dropped = 0;
    if (P.map.type !== 'none') {
      R.riders.forEach(id => { const l = m.get(id); if (l && !P.removes.has(id)) { dropped += applyRiderTrack(l, P.map, R); riderKeys(l, P.map); } });
      for (const id in R.units) if (R.units[id].lead.type === 'camera') { const l = m.get(id); if (l) riderKeys(l, P.map); }
    }
    // 6. flags
    P.flags.forEach(f => { const l = m.get(f.id); if (l) setFlag(l, f.key, f.on); });
    // 7. z moves (§3.6.1, plainly): an overlay goes above every non-text layer; a new main clip joins the main band
    P.zops.forEach(o => {
      const k = docN.layers.findIndex(l => l.id === o.id); if (k < 0) return;
      const [l] = docN.layers.splice(k, 1);
      if (o.to === 'overlay') { let at = docN.layers.findIndex(x => x.type !== 'text'); if (at < 0) at = docN.layers.length; docN.layers.splice(at, 0, l); }
      else { let at = o.near ? docN.layers.findIndex(x => x.id === o.near) : -1; if (at < 0) at = docN.layers.length; docN.layers.splice(at, 0, l); }
    });
    m = byIdN();
    // 8. the new track end: tail items follow it, sm.tail items are fitted to it (§4.3, §4.5)
    const mainIds = docN.layers.filter(l => (R.adopted || P._adopted) && hasFlag(l, 'main') && !l.audioOnly && !(l.type === 'text' && Array.isArray(l.captions)));
    const newTE = mainIds.length ? Math.max(...mainIds.map(endOf)) : 0;
    if (P.arranges) {
      const dTE = newTE - R.trackEnd;
      if (Math.abs(dTE) > 0) R.tail.forEach(id => { if (P.removes.has(id) || ids.has(id)) return; unitLayers(R, docN, id).forEach(l => { l.start += dTE; shiftKeys(l, dTE); }); });
      // pinStrays (§4.3): every non-main, unflagged unit with no host is pinned in the same step
      for (const id in R.units) {
        const u = R.units[id]; const l = m.get(u.lead.id); if (!l || R.isMain(id) || P.removes.has(id) || u.host || R.neverPinned(u)) continue;
        if (l.sm && (l.sm.stay || l.sm.main)) continue;
        setFlag(l, 'stay', true);
        // D17 B (his pick, 1 Oct): a sound unit never gets sm.tail, so a long song runs on in black, as in Full (§4.5)
        const tailOk = !['captions', 'fullOnly', 'background', 'block'].includes(u.kind) && u.section !== 'audio' && !l.audioOnly && !(l.type === 'video' && !l.audioOnly && audible(l));
        // ends with the video: its span (after this plan) ends at the new end, or, at adoption, it covered the whole track (§4.5)
        const wholeAtAdopt = P._adopted && R.main.length && Math.abs(u.end - R.trackEnd) <= R.eps && u.start <= R.main[0].start + R.eps;
        if (tailOk && mainIds.length && (Math.abs(endOf(l) - newTE) <= R.eps + 1e-9 || wholeAtAdopt)) { setFlag(l, 'tail', true); l.sm.tailEnd = endOf(l); }
      }
      // the tail fit: an sm.tail item whose end is still where it was last fitted follows the new end (4b keys)
      if (mainIds.length) docN.layers.forEach(l => {
        if (!hasFlag(l, 'tail')) return;
        if (l.audioOnly) { setFlag(l, 'tail', false); return; }   // D17 B: a stray flag on a sound is cleared, never fitted
        const De = l.duration, fitted = l.sm.tailEnd == null || Math.abs(endOf(l) - l.sm.tailEnd) <= R.eps;
        if (!fitted) return;
        const Dn = Math.max(R.minLen, newTE - l.start);
        if (Math.abs(Dn - De) > 1e-12) {
          const h = Math.min(5, Math.min(De, Dn) / 4), e = h, s = l.start;
          kfLists(l).forEach(a => a.forEach(k => {
            const r = k.t - s;
            if (r <= h) return;
            if (r >= De - e) { k.t += Dn - De; return; }
            k.t = s + h + (r - h) * ((Dn - e - h) / Math.max(1e-9, De - e - h));
          }));
          if (l.audioOnly && l.srcDur != null) l.duration = Math.min(Dn, (l.srcDur - (l.trimStart || 0)) / (l.speed || 1)); else l.duration = Dn;
        }
        l.sm.tailEnd = newTE;
      });
    }
    // 9. transparent groups refit to their members (§2.5)
    const by = byIdN();
    R.groups.forEach(gid => {
      const g = by.get(gid); if (!g) return;
      const mem = docN.layers.filter(l => l.parent === gid);
      if (mem.length) { const s = Math.min(...mem.map(l => l.start)); g.duration = Math.max(...mem.map(endOf)) - s; g.start = s; }
      else docN.layers = docN.layers.filter(l => l.id !== gid);
    });
    // 10. project length: the clips' end, unless something without "ends with the video" runs past (inv. 11)
    const others = docN.layers.filter(l => l.type !== 'camera' && l.type !== 'group' && !hasFlag(l, 'tail'));
    docN.project.duration = Math.max(newTE, ...others.map(endOf), 0);
    P.dropped = dropped;
    return docN;
  }
  E.applyPlan = applyPlan;

  /* ---------------------------------- the runner + undo (§3.7, §11) ---------------------------------- */
  function Editor(doc) { this.doc = clone(doc); this.undoStack = []; this.redoStack = []; this.listeners = []; }
  Editor.prototype.read = function () { return classify(this.doc); };
  Editor.prototype.plan = function (name, args) { const R = classify(this.doc); const f = C[name]; if (!f) return refuse('Unknown command ' + name); return f(R, this.doc, args || {}); };
  Editor.prototype.run = function (name, args, opts) {
    opts = opts || {};
    const R = classify(this.doc);                           // uncached, before planning (§2.5)
    const f = C[name]; if (!f) return { ok: false, say: 'Unknown command ' + name };
    const P = f(R, this.doc, args || {});
    if (P.refuse) return { ok: false, say: P.refuse };
    // locked (§3.7, D7): refuse, counting them, unless forced ("Do it anyway"); caption riders are exempt
    const touched = new Set([...P.moves.keys(), ...P.lands.keys(), ...P.removes, ...P.writes.map(w => w.id)]);
    let locked = 0; touched.forEach(id => (R.units[id] ? R.units[id].layers : [id]).forEach(x => { const l = R.layer(x); if (l && l.locked) locked++; }));
    if (locked && !opts.force) return { ok: false, locked, say: locked === 1 ? '1 item is locked' : locked + ' items are locked' };
    const before = JSON.stringify(this.doc);
    const next = applyPlan(JSON.parse(before), R, P);
    this.undoStack.push({ label: P.label, json: before });
    this.redoStack = [];
    this.doc = next;
    let say = P.say || '';
    if (P.dropped) say += (say ? ' · ' : '') + P.dropped + (P.dropped === 1 ? ' caption too short to keep' : ' captions too short to keep');
    const res = { ok: true, label: P.label, say, time: P.time, newId: P.newId, newIds: P.newIds, adopted: !!P._adopted, arranges: P.arranges };
    this.listeners.forEach(fn => { try { fn(res); } catch (e) { /* a listener never breaks an edit */ } });
    return res;
  };
  Editor.prototype.undo = function () { const s = this.undoStack.pop(); if (!s) return false; this.redoStack.push({ label: s.label, json: JSON.stringify(this.doc) }); this.doc = JSON.parse(s.json); this.listeners.forEach(fn => { try { fn({ ok: true, undo: s.label }); } catch (e) {} }); return s.label; };
  Editor.prototype.redo = function () { const s = this.redoStack.pop(); if (!s) return false; this.undoStack.push({ label: s.label, json: JSON.stringify(this.doc) }); this.doc = JSON.parse(s.json); this.listeners.forEach(fn => { try { fn({ ok: true, redo: s.label }); } catch (e) {} }); return s.label; };
  Editor.prototype.canUndo = function () { return this.undoStack.length > 0; };
  Editor.prototype.canRedo = function () { return this.redoStack.length > 0; };
  Editor.prototype.onChange = function (fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(x => x !== fn); }; };
  E.Editor = Editor;
  E.editor = doc => new Editor(doc);
  E.clone = clone;
  E.endOf = endOf;
  E.hasFlag = hasFlag;
  VIS.engine = E;
  VIS.sample = key => clone(SAMPLE[key]);

  /* =====================================================================================
   * 3. ICONS. Play, split, delete, undo, redo, add, duplicate, to start/end, fit, more, export and text are
   *    FreeMotion's own paths (index.html, js/fx-browser.js). The rest are drawn to match: 24px grid, 1.8 stroke.
   * ===================================================================================== */
  const ICONS = {
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none"/>',
    split: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.5" y2="15.5"/><line x1="8.5" y1="8.5" x2="20" y2="20"/>',
    delete: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    undo: '<path d="M6.64 7.97 A7 7 0 1 0 17.36 7.97"/><path d="M14.47 4.53 L19.66 6.05 L15.06 9.90 Z" fill="currentColor" stroke="none"/>',
    redo: '<path d="M17.36 7.97 A7 7 0 1 1 6.64 7.97"/><path d="M9.53 4.53 L4.34 6.05 L8.94 9.90 Z" fill="currentColor" stroke="none"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    duplicate: '<rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><path d="M7 13V9a2 2 0 0 1 2-2h4"/>',
    toStart: '<line x1="5" y1="5" x2="5" y2="19"/><polygon points="20 5 9 12 20 19 20 5"/>',
    toEnd: '<polygon points="4 5 15 12 4 19 4 5"/><line x1="19" y1="5" x2="19" y2="19"/>',
    fit: '<path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M9 20H5a1 1 0 0 1-1-1v-4M15 20h4a1 1 0 0 0 1-1v-4"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    export: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    text: '<path d="M6.4 18.6L12 5.2l5.6 13.4"/><path d="M8.5 14.2h7"/>',
    clips: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7.5 5v14M16.5 5v14M3 9.7h4.5M3 14.3h4.5M16.5 9.7H21M16.5 14.3H21"/>',
    captions: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 11h4M13 11h4M7 15h6M15 15h2"/>',
    music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
    sound: '<path d="M4 9.5v5h3.5L12.5 19V5L7.5 9.5z"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.6a7.6 7.6 0 0 1 0 10.8"/>',
    mute: '<path d="M4 9.5v5h3.5L12.5 19V5L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    overlay: '<rect x="3" y="3" width="13" height="13" rx="2"/><rect x="8" y="8" width="13" height="13" rx="2" fill="currentColor" fill-opacity=".22"/>',
    behind: '<rect x="8" y="3" width="13" height="13" rx="2"/><rect x="3" y="8" width="13" height="13" rx="2" stroke-dasharray="2.5 2.5"/>',
    look: '<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8a8.2 8.2 0 0 1 0 16.4z" fill="currentColor" stroke="none"/>',
    effects: '<path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    speed: '<path d="M4.5 16.5a7.5 7.5 0 1 1 15 0"/><path d="M12 16.5l4.2-5"/><circle cx="12" cy="16.5" r="1.2" fill="currentColor"/>',
    lift: '<path d="M12 15V5M8 9l4-4 4 4M5 19.5h14"/>',
    drop: '<path d="M12 5v10M8 11l4 4 4-4M5 19.5h14"/>',
    crop: '<path d="M6.5 3v14.5H21M3 6.5h14.5V21"/>',
    lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    eye: '<path d="M2.5 12s3.6-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.6 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    pin: '<path d="M9 3.5h6l-.8 5.5 3.3 3.2H6.5L9.8 9z"/><path d="M12 12.2V20.5"/>',
    ask: '<path d="M4 5.5h16v10.5H10l-6 4.5z"/><path d="M12 8.2l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="currentColor"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M4.3 4.3l1.9 1.9M17.8 17.8l1.9 1.9M2.8 12h2.6M18.6 12h2.6M4.3 19.7l1.9-1.9M17.8 6.2l1.9-1.9"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.8-2.4 2-2.4 3.7"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>',
    notes: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    personAdd: '<circle cx="9" cy="8" r="3.5"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M19 7.5v6M16 10.5h6"/>',
    /* The switch glyph (DESIGN §6.1; the final glyph is D16): it shows the editor you are IN. Simple = a row of clips,
       Full = stacked bars, and the way back from Full = ‹ plus the row of clips. The same paths V1 draws; V12's shots match. */
    quick: '<rect x="2" y="7.5" width="6" height="9" rx="1.6"/><rect x="9" y="7.5" width="6" height="9" rx="1.6"/><rect x="16" y="7.5" width="6" height="9" rx="1.6"/>',
    full: '<rect x="3" y="4" width="10" height="4" rx="1.3"/><rect x="8" y="10" width="13" height="4" rx="1.3"/><rect x="5" y="16" width="9" height="4" rx="1.3"/>',
    backQuick: '<path d="M5.6 8.3L2.6 12l3 3.7"/><rect x="8" y="8.5" width="4" height="7" rx="1.1"/><rect x="13" y="8.5" width="4" height="7" rx="1.1"/><rect x="18" y="8.5" width="4" height="7" rx="1.1"/>',
    /* "editor" is Full's mark wherever a page means Full (Open in Full, the Full card on New project). It used to be a
       window with panes, a third symbol for the same idea (QA 29 Sep). */
    editor: '<rect x="3" y="4" width="10" height="4" rx="1.3"/><rect x="8" y="10" width="13" height="4" rx="1.3"/><rect x="5" y="16" width="9" height="4" rx="1.3"/>',
    /* the rest of the main-clip tray (§8.5), the same drawings V2 uses */
    length: '<path d="M3.5 5v14M20.5 5v14M7 12h10M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
    earlier: '<rect x="12" y="6" width="8.5" height="12" rx="2"/><path d="M8.5 9l-3.5 3 3.5 3M5 12h5"/>',
    later: '<rect x="3.5" y="6" width="8.5" height="12" rx="2"/><path d="M15.5 9l3.5 3-3.5 3M19 12h-5"/>',
    replace: '<path d="M4.5 10a7.5 7.5 0 0 1 13-3.5L19 8M19.5 14a7.5 7.5 0 0 1-13 3.5L5 16"/><path d="M19 3.8V8h-4.2M5 20.2V16h4.2"/>',
    reverse: '<path d="M19.5 8H6M9 5L6 8l3 3M4.5 16H18M15 13l3 3-3 3"/>',
    soundout: '<path d="M3 12h1.5M6.5 8.5v7M10 5.5v13M13.5 9v6"/><path d="M16.5 12h5M19 9.5l2.5 2.5-2.5 2.5"/>',
    /* the item trays (§8.5, VIS.ITEM_TRAYS): the drawings V3 made for them */
    editwords: '<path d="M4 6h11M9.5 6v12M18 7v11M16 7h4M16 18h4"/>',
    style: '<path d="M3.5 18l4.5-12 4.5 12M5.2 13.5h5.6"/><circle cx="17.5" cy="15" r="3"/><path d="M20.5 11.5V18"/>',
    animate: '<path d="M10 7l8 5-8 5z"/><path d="M3 9h3.5M2.5 12h4M3 15h3.5"/>',
    blend: '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
    removecolour: '<path d="M12.5 8.5l3 3-7.5 7.5H5v-3z"/><path d="M15.5 4.5a2.1 2.1 0 0 1 3 3l-2.5 2.5-3-3z"/>',
    forward: '<rect x="3.5" y="10" width="10" height="10" rx="2"/><rect x="10.5" y="4" width="10" height="10" rx="2" fill="currentColor" fill-opacity=".28"/>',
    backward: '<rect x="10.5" y="4" width="10" height="10" rx="2"/><rect x="3.5" y="10" width="10" height="10" rx="2" fill="currentColor" fill-opacity=".28"/>',
    fade: '<path d="M3 18h4L17 6h4"/><path d="M3 21h18" opacity=".45"/>',
    voice: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    endswith: '<path d="M3 12h12.5M11.5 8l4 4-4 4"/><path d="M20 5v14"/>',
    findspeech: '<path d="M3 12h1.5M6 9v6M9 6.5v11M12 9.5v5"/><circle cx="17" cy="12.5" r="3.5"/><path d="M19.6 15.1L22 17.5"/>',
    editlines: '<path d="M4 7h11M4 12h8M4 17h5"/><path d="M13 19.5l.8-3.3 5.7-5.7 2.5 2.5-5.7 5.7z"/>',
    strength: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    change: '<path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8"/>',
    /* Full's own play-bar buttons, as today: ⧉ Layer actions and ◐ the add-row switch (index.html #btn-layermenu, #btn-addside) */
    layers: '<rect x="3.5" y="8" width="12.5" height="12.5" rx="2"/><path d="M8 8V5.5a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2H16"/>',
    addside: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
    /* the cog's three blocks (cog/COG-DESIGN.md §3): Editor, Friends, Canvas, and the ⤢ that opens a block */
    edblock: '<rect x="3" y="4.5" width="18" height="15" rx="2.6"/><path d="M8.6 4.5v15M11.6 9.3h6M11.6 12.3h4.4M11.6 15.3h6"/>',
    friends: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.2 19.5a5.8 5.8 0 0 1 11.6 0"/><path d="M15.5 5.6a3.1 3.1 0 0 1 0 6M17.6 14a5.6 5.6 0 0 1 3.2 5.5"/>',
    canvas: '<rect x="7" y="3" width="10" height="18" rx="2.2"/>',
    expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    swap: '<path d="M4 9h14l-3.5-3.5M20 15H6l3.5 3.5"/>'
  };
  VIS.ICONS = ICONS;
  VIS.icon = (name, cls) => '<svg viewBox="0 0 24 24" class="ico' + (cls ? ' ' + cls : '') + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.more) + '</svg>';

  /* small helpers */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  VIS.esc = esc;
  VIS.fmt = t => (Math.round(t * 10) / 10).toFixed(1).replace(/\.0$/, '') + 's';
  VIS.tc = (t, fps) => { fps = fps || 30; t = Math.max(0, t); const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t - Math.floor(t)) * fps + 1e-6); return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ':' + String(f).padStart(2, '0'); };
  VIS.say = (t, dur) => { const m = Math.floor(dur / 60), s = Math.round(dur % 60); return t + ' · ' + m + ':' + String(s).padStart(2, '0'); };

  VIS.QUICK_TOOLS = [
    { id: 'clips', label: 'Clips', icon: 'clips' }, { id: 'text', label: 'Text', icon: 'text' },
    { id: 'captions', label: 'Captions', icon: 'captions' }, { id: 'sound', label: 'Sound', icon: 'music' },
    // "Look for all", not "Look": it always acts on every clip, and the trays' Look acts on the pick (§8.5, §8.9, T20)
    { id: 'overlay', label: 'Overlay', icon: 'overlay' }, { id: 'look', label: 'Look for all', icon: 'look' },
    { id: 'effects', label: 'Effects', icon: 'effects' }, { id: 'ask', label: 'Ask', icon: 'ask' }
  ];
  /* The main-clip tray, the whole §8.5 row, left to right, with 🗑 pinned at the right end (the row scrolls under it).
     The clip's copy is 'duplicateClip', not 'duplicate': that id is the item tray's plain copy, and a page that handles
     'duplicate' as an item copy must not turn a clip into an overlay. */
  VIS.CLIP_TRAY = [
    { id: 'speed', label: 'Speed', icon: 'speed' }, { id: 'volume', label: 'Volume', icon: 'sound' },
    { id: 'lift', label: 'Lift off', icon: 'lift' }, { id: 'look', label: 'Look', icon: 'look' },
    { id: 'crop', label: 'Crop', icon: 'crop' }, { id: 'length', label: 'Length', icon: 'length' },
    { id: 'earlier', label: 'Move earlier', icon: 'earlier' }, { id: 'later', label: 'Move later', icon: 'later' },
    { id: 'effects', label: 'Effects', icon: 'effects' }, { id: 'replace', label: 'Replace', icon: 'replace' },
    { id: 'duplicateClip', label: 'Duplicate', icon: 'duplicate' }, { id: 'reverse', label: 'Reverse', icon: 'reverse' },
    { id: 'soundout', label: 'Take sound out', icon: 'soundout' }, { id: 'delete', label: 'Delete', icon: 'delete' }
  ];
  /* The old one-size item tray. Kept only because pages still read it (V1, V4, V6, V11); it is NOT the design. A picked
     item shows its own kind's row: use VIS.itemTray(R, id), or VIS.ITEM_TRAYS below. */
  VIS.ITEM_TRAY = [
    { id: 'edit', label: 'Edit', icon: 'text' }, { id: 'stay', label: 'Stay put', icon: 'pin' },
    { id: 'look', label: 'Look', icon: 'look' }, { id: 'duplicate', label: 'Copy', icon: 'duplicate' },
    { id: 'delete', label: 'Delete', icon: 'delete' }
  ];
  /* The item trays, one per kind (DESIGN §8.5, left to right, 🗑 pinned at the right end), exactly V3's lists, so a tapped
     title shows the same row on every page (QA 29 Sep: V1 and V4 showed Edit · Stay put · Look · Copy · Delete for all).
     `video: true` tools show only on a video overlay. Captions' last two are one two-way choice (a pressed pair). */
  VIS.ITEM_TRAYS = {
    text: [
      { id: 'editwords', label: 'Edit words', icon: 'editwords' }, { id: 'style', label: 'Style', icon: 'style' },
      { id: 'animate', label: 'Animate', icon: 'animate' }, { id: 'effects', label: 'Effects', icon: 'effects' },
      { id: 'copy', label: 'Duplicate', icon: 'duplicate' }, { id: 'stay', label: 'Stay put', icon: 'pin' },
      { id: 'delete', label: 'Delete', icon: 'delete' }
    ],
    overlay: [
      { id: 'into', label: 'Into row', icon: 'drop', title: 'Put in the clip row' }, { id: 'blend', label: 'Blend', icon: 'blend' },
      { id: 'volume', label: 'Volume', icon: 'sound', video: true }, { id: 'look', label: 'Look', icon: 'look' },
      { id: 'ovspeed', label: 'Speed', icon: 'speed', video: true }, { id: 'effects', label: 'Effects', icon: 'effects' },
      { id: 'removecolour', label: 'Remove a colour', icon: 'removecolour' }, { id: 'crop', label: 'Crop', icon: 'crop' },
      { id: 'forward', label: 'Forward', icon: 'forward' }, { id: 'backward', label: 'Back', icon: 'backward' },
      { id: 'stay', label: 'Stay put', icon: 'pin' }, { id: 'delete', label: 'Delete', icon: 'delete' }
    ],
    captions: [
      { id: 'editlines', label: 'Edit lines', icon: 'editlines' }, { id: 'capstyle', label: 'Style', icon: 'style' },
      { id: 'findspeech', label: 'Find speech', icon: 'findspeech' },
      { id: 'capfollow', label: 'Follows the clips', icon: 'link', pair: 'capmode' },
      { id: 'capstay', label: 'Stays with the sound', icon: 'pin', pair: 'capmode' },
      { id: 'delete', label: 'Delete', icon: 'delete' }
    ],
    sound: [
      { id: 'volume', label: 'Volume', icon: 'sound' }, { id: 'fade', label: 'Fade', icon: 'fade' },
      { id: 'sndspeed', label: 'Speed', icon: 'speed' },                // no Ends with the video switch (D17 B, his pick)
      { id: 'voice', label: 'Voice', icon: 'voice' }, { id: 'stay', label: 'Stay put', icon: 'pin' },
      { id: 'delete', label: 'Delete', icon: 'delete' }
    ],
    effect: [
      { id: 'change', label: 'Change effect', icon: 'change' }, { id: 'strength', label: 'Strength', icon: 'strength' },
      { id: 'stay', label: 'Stay put', icon: 'pin' }, { id: 'delete', label: 'Delete', icon: 'delete' }
    ]
  };
  /* Which item tray a unit gets, the way V3 picks it: captions by kind, anything in the sound row as sound, an effect
     segment as effect, text as text, everything else (stickers, pictures, shapes, blocks) as an overlay. */
  VIS.itemTrayKind = u => !u ? null : u.kind === 'captions' ? 'captions' : u.section === 'audio' ? 'sound'
    : u.kind === 'effect' ? 'effect' : u.kind === 'text' ? 'text' : 'overlay';
  /* The picked item's row, with its states: Stay put / Stays with the sound pressed when on, and a
     video-only tool left out on anything that is not a video. The main clip's row is VIS.CLIP_TRAY. */
  VIS.itemTray = function (R, id) {
    const u = R && R.units && R.units[id]; const k = VIS.itemTrayKind(u); if (!k) return [];
    const l = u.lead, stay = E.hasFlag(l, 'stay');
    return VIS.ITEM_TRAYS[k].filter(t => !t.video || l.type === 'video').map(t => {
      const c = Object.assign({}, t);
      if (t.id === 'stay') c.pressed = stay;
      else if (t.id === 'capfollow') c.pressed = !stay;
      else if (t.id === 'capstay') c.pressed = stay;
      else if (t.id === 'endswith') c.pressed = E.hasFlag(l, 'tail');
      else if (t.id === 'effects') c.on = (l.fx || []).length > 0;
      return c;
    });
  };
  VIS.SECTION_COLOR = { captions: '#f2c14e', text: '#b18cff', overlay: '#4fb3ff', effect: '#ff7aa2', audio: '#3fd6a4', behind: '#8195a0' };
  VIS.SECTION_NAME = { captions: 'Captions', text: 'Text', overlay: 'Overlays', effect: 'Effects', behind: 'Behind', audio: 'Sound' };

  if (typeof document === 'undefined') return;       // the engine is all osascript needs

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  VIS.el = el;

  /* "thumbnail": the layer's two look colours as a gradient; a stable fallback from the id */
  VIS.thumb = function (l) {
    let a, b;
    if (l && l.look) { a = l.look[0]; b = l.look[1] || l.look[0]; }
    else { let h = 0; String(l && l.id || 'x').split('').forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) % 360; }); a = 'hsl(' + h + ' 45% 55%)'; b = 'hsl(' + ((h + 40) % 360) + ' 50% 30%)'; }
    return 'linear-gradient(135deg, ' + a + ', ' + b + ')';
  };

  /* ---------------------------------- toolbar, chips, toast, badges ---------------------------------- */
  VIS.toolbar = function (host, tools, opts) {
    opts = opts || {};
    host.innerHTML = '';
    if (host.classList && host.classList.contains('fm-tray')) trayWheel(host);
    const buttons = {};
    tools.forEach(t => {
      const b = el('button', 'fm-tool' + (t.on ? ' on' : ''), VIS.icon(t.icon) + (opts.iconsOnly ? '' : '<span class="tl">' + esc(t.label) + '</span>'));
      b.type = 'button'; b.dataset.tool = t.id; b.title = t.title || t.label; b.setAttribute('aria-label', t.title || t.label);
      if (t.pressed != null) b.setAttribute('aria-pressed', String(!!t.pressed));
      if (t.disabled) b.disabled = true;
      b.addEventListener('click', () => { if (t.onClick) t.onClick(t, b); if (opts.onClick) opts.onClick(t.id, b); });
      host.appendChild(b); buttons[t.id] = b;
    });
    return {
      el: host, buttons,
      set(id, st) { const b = buttons[id]; if (!b) return; if ('on' in st) b.classList.toggle('on', !!st.on); if ('hl' in st) b.classList.toggle('hl', !!st.hl); if ('disabled' in st) b.disabled = !!st.disabled; }
    };
  };
  VIS.chip = function (text, kind, icon) { const c = el('span', 'fm-chip' + (kind ? ' ' + kind : ''), (icon ? VIS.icon(icon) : '') + '<span>' + esc(text) + '</span>'); return c; };
  VIS.lockBadge = function () { return el('span', 'fm-lock', VIS.icon('lock')); };
  VIS.fullBadge = function () { return el('span', 'fm-badge-full', '✦'); };
  /* The toast's default place: over the bottom of the picture, never over the timeline. At the old fixed 118 px it sat over
     the clip row on a phone, and a toast with a button caught taps meant for a clip for up to 4 s (QA V3 29 Sep). Worked out
     in the frame's own (unscaled) pixels; a root with no picture keeps kit.css's 118 px. */
  function overPicture(root) {
    const st = root.querySelector('.fm-stagewrap'); if (!st || !root.offsetHeight) return 118;
    const rr = root.getBoundingClientRect(), sr = st.getBoundingClientRect(), s = rr.height / root.offsetHeight || 1;
    if (!sr.height) return 118;
    return Math.max(8, Math.round((rr.bottom - sr.bottom) / s + 10));
  }
  VIS.toast = function (root, text, action, opts) {
    opts = opts || {};
    let t = root.querySelector(':scope > .fm-toast');
    if (!t) { t = el('div', 'fm-toast'); t.setAttribute('role', 'status'); root.appendChild(t); }
    t.innerHTML = '<span>' + esc(text) + '</span>';
    if (action) { const b = el('button', '', esc(action.label)); b.type = 'button'; b.addEventListener('click', () => { hide(); action.run && action.run(); }); t.appendChild(b); }
    t.style.bottom = (opts.bottom != null ? opts.bottom : overPicture(root)) + 'px';
    clearTimeout(t._tm);
    requestAnimationFrame(() => t.classList.add('show'));
    function hide() { t.classList.remove('show'); }
    if (opts.ms !== 0) t._tm = setTimeout(hide, opts.ms || 4000);
    return { el: t, hide };
  };
  VIS.playhead = function (host, x) { const p = el('div', 'fm-playhead'); p.style.left = x + 'px'; host.appendChild(p); return p; };
  VIS.linkLine = function (host, x, y1, y2, color) { const k = el('div', 'fm-link'); k.style.left = x + 'px'; k.style.top = y1 + 'px'; k.style.height = Math.max(0, y2 - y1) + 'px'; k.style.color = color || '#fff'; host.appendChild(k); return k; };

  /* ---------------------------------- frames ---------------------------------- */
  /* The left end of the phone's play bar (DESIGN §0.4 V1-V2, §6.1, §15.1, D18). Neither editor has a switch here: the switch is
     the ⚙ cog's third block (VIS.cog). Full keeps today's ⋯ · ⧉ · ◐ · |◀ exactly; Simple is ⋯ · ✂ · (empty) · |◀, so |◀ sits
     under the same thumb in both (D18 A). */
  const ibtn = (ic, label, act) => '<button type="button" class="fm-ibtn" data-act="' + (act || ic) + '" aria-label="' + label + '" title="' + label + '">' + VIS.icon(ic) + '</button>';
  function leftSideHTML(editor) {
    return editor === 'full'
      ? ibtn('more', 'Timeline options') + ibtn('layers', 'Layer actions', 'layermenu') + ibtn('addside', 'Move the add-layer row', 'addside') + ibtn('toStart', 'To start')
      : ibtn('more', 'More') + ibtn('split', 'Split') + '<span class="fm-ibtn fm-slotgap" aria-hidden="true"></span>' + ibtn('toStart', 'To start');
  }
  function playbarHTML(editor) {
    return '<div class="fm-side fm-left">' + leftSideHTML(editor) + '</div>' +
      '<button type="button" class="fm-time" data-act="play" aria-label="Play">00:00:00</button>' +
      '<div class="fm-side">' + ibtn('toEnd', 'To end') + ibtn('undo', 'Undo') + ibtn('redo', 'Redo') + ibtn('fit', 'Full screen') + '</div>';
  }
  /* the PC row's left end: Full as today (‹ · ⧉ · ◐ · |◀), Simple ‹ · ✂ · |◀ (§15.1). No switch in either. */
  function pcLeftHTML(editor) {
    return editor === 'full'
      ? ibtn('back', 'Projects') + ibtn('layers', 'Layer actions', 'layermenu') + ibtn('addside', 'Move the add-layer row', 'addside') + ibtn('toStart', 'To start')
      : ibtn('back', 'Projects') + ibtn('split', 'Split') + ibtn('toStart', 'To start');
  }
  VIS.phoneFrame = function (host, opts) {
    opts = opts || {};
    const PW = opts.width || 380;                              // drawn at a real phone width…
    // …or, where the page is narrower (a 380 px screen leaves ~340 px), drawn as that narrower phone at full size rather
    // than a 380 one shrunk to 0.85, which made the tool names 8.4 px (QA 29 Sep). Below MINW it scales, as before.
    const MINW = Math.min(PW, opts.minWidth || 326);
    const outer = el('div', 'fm-fit-outer'), box = el('div', 'fm-fit-box'), root = el('div', 'fm fm-phone');
    root.style.width = (PW + 14) + 'px';
    root.innerHTML =
      '<div class="fm-topbar">' +
        '<button type="button" class="fm-ibtn" data-act="back" aria-label="Projects">' + VIS.icon('back') + '</button>' +
        '<div class="fm-name">' + esc(opts.name || 'Beach day') + '</div>' +
        '<button type="button" class="fm-ibtn" data-act="help" aria-label="Help">' + VIS.icon('help') + '</button>' +
        '<button type="button" class="fm-ibtn" data-act="notes" aria-label="Notes">' + VIS.icon('notes') + '</button>' +
        '<button type="button" class="fm-ibtn" data-act="settings" aria-label="Settings">' + VIS.icon('gear') + '</button>' +
        '<button type="button" class="fm-export" data-act="export">' + VIS.icon('export') + 'Export</button>' +
      '</div>' +
      '<div class="fm-stagewrap"></div>' +
      '<div class="fm-playbar">' + playbarHTML(opts.editor) + '</div>' +
      '<div class="fm-tlwrap"></div>' +
      '<div class="fm-tray"><div class="fm-say"></div></div>' +
      '<div class="fm-tools"></div>';
    box.appendChild(root); outer.appendChild(box); host.appendChild(outer);
    const q = s => root.querySelector(s);
    const f = { root, outer, scale: 1, topbar: q('.fm-topbar'), stage: q('.fm-stagewrap'), playbar: q('.fm-playbar'), time: q('.fm-time'),
                timeline: q('.fm-tlwrap'), tray: q('.fm-tray'), say: q('.fm-say'), tools: q('.fm-tools'), switchBtn: null, editor: opts.editor === 'full' ? 'full' : 'quick' };
    f.stage.style.height = (opts.stageH || 210) + 'px';
    f.timeline.style.height = (opts.tlH || 210) + 'px';
    if (opts.editor !== 'full' && opts.tools !== false) f.toolbar = VIS.toolbar(f.tools, opts.tools || VIS.QUICK_TOOLS, { onClick: opts.onTool });
    if (opts.editor === 'full') f.tools.style.display = 'none';
    f.setTime = (t, fps) => { f.time.innerHTML = VIS.icon('play') + ' ' + VIS.tc(t, fps); f.time.querySelector('svg').style.cssText = 'width:10px;height:10px;display:inline-block;margin-right:3px;vertical-align:-1px'; };
    f.setTime(0);
    f.setSay = html => { f.say.innerHTML = html; };
    f.on = (act, fn) => root.addEventListener('click', e => { const b = e.target.closest('[data-act="' + act + '"]'); if (b && root.contains(b)) fn(e, b); });
    /* a page that flips editors redraws the play bar's left end, so Full always shows today's buttons */
    f.setEditor = ed => { f.editor = ed === 'full' ? 'full' : 'quick'; q('.fm-playbar .fm-left').innerHTML = leftSideHTML(f.editor); };
    f.fit = () => {
      // Hidden (another page is open, a folded card): measure nothing and keep the last size. Reading 0 here used to
      // fall back to full size and pin the box at 394 px, which then held a narrow grid cell open for good (QA, V1).
      if (!outer.isConnected || !outer.getClientRects().length) return;
      const full = PW + 14, floor = MINW + 14;
      // measure the room with the box out of the way, so an old size can never hold the container open
      const keep = box.style.width; box.style.width = '0px';
      let w = outer.clientWidth; box.style.width = keep;
      if (!w) w = full;                                        // a shrink-to-fit parent: draw the full phone
      // An outer whose own CSS fixes its height (contain: size with an aspect ratio, V11) keeps the full phone, scaled:
      // a narrower phone is taller for its width and would be cut off at the bottom.
      const fixed = /size|strict/.test(getComputedStyle(outer).contain || '');
      const dw = fixed ? full : Math.round(Math.max(floor, Math.min(full, w)));
      if (root.style.width !== dw + 'px') root.style.width = dw + 'px';
      const inner = dw - 14;
      root.classList.toggle('fm-w31', inner < 372 && inner >= 346);   // the app's smaller play-bar tiers (styles.css:2590-2603)
      root.classList.toggle('fm-w28', inner < 346);
      let s = Math.min(1, w / dw);
      if (fixed && outer.clientHeight && root.offsetHeight) s = Math.min(s, outer.clientHeight / root.offsetHeight);
      root.style.transform = s < 1 ? 'scale(' + s + ')' : '';
      box.style.width = (dw * s) + 'px'; box.style.height = (root.offsetHeight * s) + 'px';
      f.scale = s;
    };
    f.fit();
    // fitted on the next frame, not inside the observer: resizing the box from within it set off "ResizeObserver loop
    // completed with undelivered notifications" on the console
    let fitQueued = false;
    const fitSoon = () => { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; f.fit(); }); };
    if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(fitSoon); ro.observe(outer); ro.observe(root); }
    else window.addEventListener('resize', fitSoon);
    // §8.8 (his #171): in Simple, Notes hides while a clip or an item is picked. visibility, not display, so ? never slides.
    // Read from the drawing itself (a picked tile, item or bar in Simple's timeline), so every page gets it without a call.
    const syncPick = () => { const on = !!f.timeline.querySelector('.fm-quick .sel'); if (root.classList.contains('fm-picked') !== on) root.classList.toggle('fm-picked', on); };
    if (typeof MutationObserver !== 'undefined') new MutationObserver(syncPick).observe(f.timeline, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    trayWheel(f.tray);
    return f;
  };
  /* A tray that is wider than its row scrolls sideways by touch; with a mouse the wheel scrolls it too. */
  function trayWheel(tray) {
    if (!tray || tray._wheel) return; tray._wheel = true;
    tray.addEventListener('wheel', e => {
      if (tray.scrollWidth <= tray.clientWidth + 1 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const before = tray.scrollLeft; tray.scrollLeft += e.deltaY;
      if (tray.scrollLeft !== before) e.preventDefault();
    }, { passive: false });
  }
  VIS.pcFrame = function (host, opts) {
    opts = opts || {};
    const W = opts.width || 1100, H = opts.height || 680;
    const outer = el('div', 'fm-pc-outer'), box = el('div', 'fm-pc-box'), root = el('div', 'fm fm-pc');
    root.style.width = W + 'px'; root.style.height = H + 'px';
    root.style.setProperty('--pc-band', (opts.band || 250) + 'px');
    root.style.setProperty('--insp-w', (opts.inspW || 360) + 'px');
    const ib = (ic, label) => '<button type="button" class="fm-ibtn" data-act="' + ic + '" aria-label="' + label + '" title="' + label + '">' + VIS.icon(ic) + '</button>';
    root.innerHTML =
      '<div class="fm-winbar"><i></i><i></i><i></i><span style="margin-left:8px">' + esc(opts.name || 'Beach day') + ' — FreeMotion</span></div>' +
      '<div class="fm-stagewrap"></div>' +
      '<div class="fm-bandrow">' +
        '<div class="fm-band"><div class="fm-panel"></div><div class="fm-tray"><div class="fm-say"></div></div><div class="fm-tools"></div></div>' +
        '<div class="fm-tlpanel"><div class="fm-transport">' +
          '<span class="fm-pcleft">' + pcLeftHTML(opts.editor) + '</span>' +
          '<button type="button" class="fm-time" data-act="play" aria-label="Play">00:00:00</button>' + ib('toEnd', 'To end') +
          ib('undo', 'Undo') + ib('redo', 'Redo') + ib('help', 'Help') + ib('notes', 'Notes') + ib('gear', 'Settings') +
          '<button type="button" class="fm-export" data-act="export">' + VIS.icon('export') + 'Export</button>' + ib('more', 'More') + ib('fit', 'Full screen') +
        '</div><div class="fm-tlwrap"></div></div>' +
      '</div>';
    box.appendChild(root); outer.appendChild(box); host.appendChild(outer);
    const q = s => root.querySelector(s);
    const f = { root, outer, stage: q('.fm-stagewrap'), band: q('.fm-band'), panel: q('.fm-panel'), tray: q('.fm-tray'), say: q('.fm-say'),
                tools: q('.fm-tools'), transport: q('.fm-transport'), time: q('.fm-time'), timeline: q('.fm-tlwrap'), switchBtn: null, scale: 1,
                editor: opts.editor === 'full' ? 'full' : 'quick' };
    f.setEditor = ed => { f.editor = ed === 'full' ? 'full' : 'quick'; q('.fm-pcleft').innerHTML = pcLeftHTML(f.editor); };
    if (opts.editor !== 'full' && opts.tools !== false) f.toolbar = VIS.toolbar(f.tools, opts.tools || VIS.QUICK_TOOLS, { onClick: opts.onTool });
    f.setTime = (t, fps) => { f.time.textContent = VIS.tc(t, fps); };
    f.setSay = html => { f.say.innerHTML = html; };
    f.on = (act, fn) => root.addEventListener('click', e => { const b = e.target.closest('[data-act="' + act + '"]'); if (b && root.contains(b)) fn(e, b); });
    const minScale = opts.minScale == null ? 0.5 : opts.minScale;
    f.fit = () => {
      if (!outer.isConnected || !outer.getClientRects().length) return;   // hidden: keep the last size (see phoneFrame)
      const w = outer.clientWidth || W; let s = Math.min(1, w / W);
      const fits = s >= minScale; if (!fits) s = minScale;
      outer.classList.toggle('fits', fits);
      root.style.transform = 'scale(' + s + ')';
      box.style.width = (W * s) + 'px'; box.style.height = (H * s) + 'px';
      f.scale = s;
    };
    f.fit();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => f.fit()).observe(outer);
    else window.addEventListener('resize', f.fit);
    trayWheel(f.tray);
    return f;
  };

  /* ---------------------------------- the ⚙ cog and its third block (cog/COG-DESIGN.md; DESIGN §6) ----------------------------------
     The ONE place either editor switches (his rule, 1 Oct). ⚙ opens three blocks, one big: Canvas settings is big the first time,
     as today, with Friends and the new Editor block small above it. "What should you use?" (or a tap on the Editor bar away from
     the switch) makes the Editor block big, the way the Friends and Canvas bars do. The switch flips at once: the knob slides,
     and about 260 ms later the cog closes and opts.onSwitch(to) runs, so a page's animation plays as the scrim fades (§6.3). It
     stays open while Canvas settings holds picks not applied, or while Friends is the big block (D23 A, DESIGN §21). opts.warn(to) may return a warning (§6.4): Stay leaves
     everything as it was; the other answer runs opts.onWarnOk(to) and then switches. The cog reopens on the last of Canvas and
     Friends, never on the Editor explanation (DESIGN §21: it "stays small unless you want the explanation"). */
  const COG_PIC = {
    quick: '<svg viewBox="0 0 64 34" aria-hidden="true"><rect x="6" y="3" width="17" height="6" rx="3" fill="#9fb6c0"/><rect x="2" y="12" width="19" height="12" rx="2.4" fill="#cfe2e8"/><rect x="22.5" y="12" width="19" height="12" rx="2.4" fill="#cfe2e8"/><rect x="43" y="12" width="19" height="12" rx="2.4" fill="#cfe2e8"/><rect x="2" y="27" width="60" height="4" rx="2" fill="#6f8a95"/></svg>',
    full: '<svg viewBox="0 0 64 34" aria-hidden="true"><rect x="10" y="2" width="24" height="6" rx="3" fill="#5ac7ed"/><rect x="2" y="10" width="30" height="6" rx="3" fill="#5ac7ed" opacity=".8"/><rect x="24" y="18" width="36" height="6" rx="3" fill="#5ac7ed" opacity=".9"/><rect x="8" y="26" width="34" height="6" rx="3" fill="#5ac7ed" opacity=".7"/></svg>'
  };
  function cogSwitchHTML(cur, names, big) {
    const to = cur === 'full' ? 'quick' : 'full', label = 'Switch to ' + (to === 'quick' ? names[0] : names[1]) + ' editor';
    return '<button type="button" class="fm-cog-sw' + (big ? ' big' : '') + ' on-' + cur + '" data-cog="switch" aria-label="' + esc(label) + '" title="' + esc(label) + '">' +
      '<span class="knob" aria-hidden="true"></span><span class="w wq">' + esc(names[0]) + '</span><span class="arr" aria-hidden="true">' + VIS.icon('swap') + '</span><span class="w wf">' + esc(names[1]) + '</span></button>';
  }
  function cogBlocksHTML(st) {
    const pc = st.layout === 'pc', n = st.names, cur = st.editor, isBig = b => st.big === b;
    const exp = '<span class="fm-cog-exp" aria-hidden="true">' + VIS.icon('expand') + '</span>';
    const ic = name => '<span class="fm-cog-ic" aria-hidden="true">' + VIS.icon(name) + '</span>';
    const what = '<button type="button" class="fm-cog-what" data-cog="what" aria-expanded="' + isBig('editor') + '">What should' + (pc ? ' ' : '<br>') + 'you use?</button>';
    let ed;
    if (isBig('editor')) {
      const card = k => '<div class="fm-cog-card' + (cur === k ? ' cur' : '') + '"><span class="pic">' + COG_PIC[k] + '</span><div><b>' + esc(k === 'quick' ? n[0] : n[1]) + '</b>' +
        (cur === k ? '<span class="here">You’re here</span>' : '') + '<p>' + esc(k === 'quick'
          ? 'Clips one after another, with text, captions and music. Gaps close up by themselves. Best for a quick video, or if you’ve never edited.'
          : 'Everything FreeMotion does: layers anywhere, keyframes, masks, 3D and every effect. For animation, and anything ' + n[0] + ' can’t do.') + '</p></div></div>';
      ed = '<section class="fm-cog-blk ed big" data-blk="editor" aria-label="What should you use?"><h4>What should you use?</h4>' +
        '<div class="fm-cog-swrow">' + cogSwitchHTML(cur, n, true) + '<span class="you">You’re in ' + esc(cur === 'quick' ? n[0] : n[1]) + '</span></div>' +
        card('quick') + card('full') + '<p class="fm-cog-foot">Same project in both. Nothing is converted, and you can switch back any time.</p></section>';
    } else {
      ed = '<section class="fm-cog-blk ed small" data-blk="editor" aria-label="Editor">' + (pc ? '<div class="hd">' + ic('edblock') + '<b>Editor</b></div>' : ic('edblock')) +
        cogSwitchHTML(cur, n, false) + what + '</section>';
    }
    const fr = isBig('friends')
      ? '<section class="fm-cog-blk fr big" data-blk="friends" aria-label="Work with friends"><h4>Work with friends</h4><p class="sub">Off</p>' +
        '<ol><li>Turn on Work with friends below, then tap Start sharing</li><li>Send your friend the link</li><li>They tap it — you’re both editing</li></ol>' +
        '<p class="dim">Share this project live and edit it together, each on your own phone or computer. It stays off until you turn it on.</p>' +
        '<div class="row"><span><b>Work with friends</b><small>Off — turn it on here, and off again any time</small></span><i class="tog" aria-hidden="true"></i></div>' +
        '<button type="button" class="fm-cog-btn wide" data-cog="done">Done</button></section>'
      : '<section class="fm-cog-blk fr small" data-blk="friends" aria-label="Friends">' + ic('friends') + '<span class="tx"><b>Friends</b><small>Share live with friends</small></span>' + exp + '</section>';
    const asp = [['16:9', 18, 11], ['9:16', 11, 18], ['4:5', 13, 16], ['1:1', 15, 15], ['4:3', 17, 13], ['Custom', 15, 15]];
    const cv = isBig('canvas')
      ? '<section class="fm-cog-blk cv big" data-blk="canvas" aria-label="Canvas settings"><h4>Canvas settings</h4><div class="asp">' +
        asp.map((a, i) => '<button type="button" class="ch' + ((st.aspect == null ? 1 : st.aspect) === i ? ' on' : '') + '" data-cog="aspect" data-i="' + i + '"><i style="width:' + a[1] + 'px;height:' + a[2] + 'px"' + (i === 5 ? ' class="dash"' : '') + '></i>' + a[0] + '</button>').join('') + '</div>' +
        '<div class="row"><span>Resolution</span><span class="sel">1080p (FHD) ▾</span></div><div class="row"><span>Frame rate</span><span class="sel">30 fps ▾</span></div>' +
        '<div class="row"><span>Background</span><span class="sw"><i class="on" style="background:#000"></i><i style="background:#fff"></i><i style="background:#00b140"></i></span></div>' +
        '<div class="row"><span>Size</span><b>1080 × 1920</b></div>' +
        '<div class="acts"><button type="button" class="fm-cog-btn" data-cog="appsettings">App settings…</button><span class="sp"></span><button type="button" class="fm-cog-btn" data-cog="cancel">Cancel</button><button type="button" class="fm-cog-btn primary" data-cog="apply">Apply</button></div></section>'
      : '<section class="fm-cog-blk cv small" data-blk="canvas" aria-label="Canvas">' + ic('canvas') + '<span class="tx"><b>Canvas <span class="pill">App settings…</span></b><small>9:16 · 1080 × 1920 · 30 fps</small></span>' + exp + '</section>';
    return ed + fr + cv;
  }
  function offsetIn(node, root) { let x = 0, y = 0, n = node; while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y }; }
  VIS.cogStill = function (host, o) {
    o = o || {};
    const w = el('div', 'fm fm-cog-still ' + (o.layout === 'pc' ? 'pc' : 'phone') + ' big-' + (o.big || 'canvas'));
    w.innerHTML = cogBlocksHTML({ layout: o.layout || 'phone', big: o.big || 'canvas', editor: o.editor || 'full', names: o.names || ['Simple', 'Full'] });
    w.setAttribute('aria-hidden', 'true'); try { w.inert = true; } catch (e) { /* old browsers */ }
    host.appendChild(w);
    return w;
  };
  VIS.cog = function (f, opts) {
    opts = opts || {};
    const root = f.root, pc = root.classList.contains('fm-pc'), names = opts.names || ['Simple', 'Full'];
    const motion = () => !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const cur = () => ((typeof opts.editor === 'function' ? opts.editor() : f.editor) === 'full' ? 'full' : 'quick');
    let big = opts.start || 'canvas', last = big, layer = null, box = null, note = null, live = null, pending = false, busy = false, aspect = 1, back = null, shown = null;
    function render(knob) {
      if (!box) return;
      box.className = 'fm-cog-box ' + (pc ? 'pc' : 'phone') + ' big-' + big;
      box.innerHTML = cogBlocksHTML({ layout: pc ? 'pc' : 'phone', big, editor: knob || cur(), names, aspect });
      place();
    }
    function place() {
      if (!pc || !box) return;
      const g = root.querySelector('.fm-transport [data-act="gear"]');
      const W = root.clientWidth, H = root.clientHeight, h = box.offsetHeight, w = box.offsetWidth;
      let right = 8, top = Math.round((H - h) / 2);
      if (g) {
        const p = offsetIn(g, root);
        right = Math.max(8, Math.min(W - w - 8, W - (p.x + g.offsetWidth) - 12));
        top = Math.max(8, Math.min(H - h - 8, p.y - 10 - h));
      }
      box.style.right = right + 'px'; box.style.top = top + 'px';
    }
    function say(t) { if (!note) return; note.textContent = t || ''; note.hidden = !t; }
    function grow() {
      if (!motion() || !box) return;
      const b = box.querySelector('.fm-cog-blk.big');
      if (b && b.animate) b.animate([{ opacity: 0, transform: 'translateY(8px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.85,.25,1.06)' });
    }
    function setBig(b) { if (b === big) return; big = b; if (b !== 'editor') last = b; say('');   /* §21: the cog reopens on Canvas or Friends, never on the explanation ("stays small unless you want the explanation") */ render(); grow(); const h = box.querySelector('.fm-cog-blk.big h4, .fm-cog-blk.big [data-cog]'); if (h && h.focus) { h.tabIndex = -1; try { h.focus({ preventScroll: true }); } catch (e) { /* fine */ } } }
    function open(which) {
      if (layer) return;
      big = which && which !== 'last' ? which : last;
      back = document.activeElement;
      layer = el('div', 'fm-cog');
      layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Settings');
      layer.innerHTML = '<div class="fm-cog-scrim"></div><p class="fm-cog-note" role="status" hidden></p><p class="fm-cog-live" aria-live="polite"></p>';
      box = el('div', 'fm-cog-box');
      layer.appendChild(box);
      note = layer.querySelector('.fm-cog-note'); live = layer.querySelector('.fm-cog-live');
      root.appendChild(layer);
      render();
      if (motion() && layer.animate) { layer.querySelector('.fm-cog-scrim').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 }); grow(); }
      layer.addEventListener('click', onClick);
      layer.addEventListener('keydown', onKey);
      const sw = box.querySelector('[data-cog="switch"]'); if (sw) try { sw.focus({ preventScroll: true }); } catch (e) { /* fine */ }
      if (opts.onOpen) opts.onOpen();
    }
    function close(done) {
      if (!layer) { if (done) done(); return; }
      const l = layer; layer = null; box = null; note = null; live = null; pending = false; busy = false;
      const fin = () => { l.remove(); if (done) done(); };
      if (motion() && l.animate) { l.style.pointerEvents = 'none'; l.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).finished.then(fin, fin); }
      else fin();
      if (back && back.isConnected && back.focus) try { back.focus({ preventScroll: true }); } catch (e) { /* fine */ }
      if (opts.onClose) opts.onClose();
    }
    function ask(w, to) {
      const a = el('div', 'fm-cog-ask');
      a.setAttribute('role', 'alertdialog'); a.setAttribute('aria-label', w.title || 'Switch?');
      a.innerHTML = '<div class="card"><b>' + esc(w.title || ('Switch to ' + (to === 'quick' ? names[0] : names[1]) + '?')) + '</b><p>' + esc(w.text) + '</p>' +
        '<div class="acts"><button type="button" class="fm-cog-btn" data-ask="stay">' + esc(w.cancel || 'Stay') + '</button><button type="button" class="fm-cog-btn primary" data-ask="ok">' + esc(w.ok || 'Switch anyway') + '</button></div></div>';
      layer.appendChild(a);
      a.addEventListener('click', e => {
        e.stopPropagation();
        const b = e.target.closest('[data-ask]');
        if (!b && e.target !== a) return;
        a.remove();
        if (b && b.dataset.ask === 'ok') { if (opts.onWarnOk) opts.onWarnOk(to); go(to); }
        else { const sw = box && box.querySelector('[data-cog="switch"]'); if (sw) sw.focus(); say('Nothing changed. ' + (w.stayed || '')); }
      });
      const okB = a.querySelector('[data-ask="stay"]'); if (okB) okB.focus();
    }
    function go(to) {
      busy = true;
      box.querySelectorAll('.fm-cog-sw').forEach(s => { s.classList.remove('on-quick', 'on-full'); s.classList.add('on-' + to); });
      if (live) live.textContent = (to === 'quick' ? names[0] : names[1]) + ' editor';
      setTimeout(() => {
        if (!layer) return;
        busy = false;
        if (pending || big === 'friends') {              // D23 A: unapplied canvas picks, or Friends open, keep the cog open (DESIGN §21)
          if (opts.onSwitch) opts.onSwitch(to, { stayed: true });
          render(); say(pending ? 'Canvas settings has picks you haven’t applied, so the cog stays open. Apply or Cancel when you’re ready.' : '');
          return;
        }
        close();
        if (opts.onSwitch) opts.onSwitch(to, { stayed: false });
      }, motion() ? 260 : 0);
    }
    function onClick(e) {
      const t = e.target;
      if (t.classList.contains('fm-cog-scrim')) { close(); return; }
      if (busy) return;
      const c = t.closest('[data-cog]');
      if (c) {
        e.stopPropagation();
        const k = c.dataset.cog;
        if (k === 'switch') {
          if (opts.refuse) { const r = opts.refuse(); if (r) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); say(r); return; } }
          const to = cur() === 'quick' ? 'full' : 'quick', w = opts.warn ? opts.warn(to) : null;
          if (w) ask(w, to); else go(to);
        } else if (k === 'what') setBig('editor');
        else if (k === 'aspect') { aspect = +c.dataset.i; pending = aspect !== 1; render(); say(pending ? 'A new shape, not applied yet.' : ''); }
        else if (k === 'apply' || k === 'cancel' || k === 'done') { if (k === 'cancel') aspect = 1; close(); }
        else if (k === 'appsettings') say('App settings… opens the app’s settings, as today.');
        return;
      }
      const blk = t.closest('.fm-cog-blk.small');
      if (blk) { e.stopPropagation(); setBig(blk.dataset.blk); }
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const a = layer && layer.querySelector('.fm-cog-ask'); if (a) a.querySelector('[data-ask="stay"]').click(); else close(); } }
    root.addEventListener('click', e => {
      const g = e.target.closest('[data-act="settings"], [data-act="gear"]');
      if (!g || !root.contains(g) || layer) return;
      e.stopPropagation();
      shown = g; open('last');
    }, true);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => place()).observe(root);
    return { open, close, isOpen: () => !!layer, get big() { return big; }, refresh: () => render() };
  };

  /* ---------------------------------- the picture ---------------------------------- */
  VIS.stage = function (host, doc, t, opts) {
    opts = opts || {};
    host.innerHTML = '';
    const P = doc.project, cv = el('div', 'fm-canvas');
    cv.style.aspectRatio = P.width + ' / ' + P.height;
    cv.style.height = '100%'; cv.style.maxWidth = '100%';
    host.appendChild(cv);
    const H = cv.clientHeight || 190, W = H * P.width / P.height;
    const ops = l => { const a = l.kf && l.kf.opacity; const v = a && a.length ? valueAt(a, t) : (l.opacity == null ? 1 : l.opacity); return Math.max(0, Math.min(1, v)); };
    const layers = doc.layers.slice().reverse();                         // bottom first
    let drew = false;
    // A shape is drawn as a bar low on the picture (a lower third). A text in the same group as a bar sits ON the bar:
    // "Chef Mia" used to float at the text default, above the bar or over its end (QA 29 Sep, V5 and V11).
    const BAR = { x: 0.06, y: 0.72, w: 0.46, h: 0.11 };
    const barMate = l => {
      if (!l.parent) return null;
      return doc.layers.find(x => x !== l && x.parent === l.parent && x.type === 'shape' && !/^mask-/.test(x.blendMode || '')) || null;
    };
    layers.forEach(l => {
      if (l.visible === false || l.audioOnly || l.type === 'camera' || l.type === 'group' || l.type === 'null') return;
      if (!(t >= l.start && t < l.start + l.duration)) return;
      if (/^mask-/.test(l.blendMode || '')) return;
      const tr = l.transform || {};
      let d;
      if (l.type === 'text' && Array.isArray(l.captions)) {
        const q = l.captions.find(c => t - l.start >= c.start && t - l.start < c.end);
        if (!q) return;
        d = el('div', 'cv-cap', '<span>' + esc(q.text) + '</span>'); d.style.fontSize = Math.max(8, H * 0.034) + 'px';
      } else if (l.type === 'text' && barMate(l)) {
        d = el('div', 'cv-text cv-onbar', '<span>' + esc(l.text || l.name) + '</span>');
        d.style.left = (BAR.x * 100) + '%'; d.style.width = (BAR.w * 100) + '%'; d.style.right = 'auto';
        d.style.top = (BAR.y * 100) + '%'; d.style.height = (BAR.h * 100) + '%';
        d.style.fontSize = Math.max(8, Math.min(H * 0.07, H * BAR.h * 0.62)) + 'px';
      } else if (l.type === 'text') {
        d = el('div', 'cv-text', esc(l.text || l.name)); d.style.fontSize = Math.max(9, H * 0.07) + 'px';
        d.style.top = ((tr.y != null ? tr.y : 0.42) * 100) + '%';
      } else if (l.type === 'shape') {
        d = el('div', 'cv-pip'); d.style.background = VIS.thumb(l); d.style.outline = 'none';
        d.style.left = (BAR.x * 100) + '%'; d.style.width = (BAR.w * 100) + '%'; d.style.top = (BAR.y * 100) + '%'; d.style.height = (BAR.h * 100) + '%';
      } else if (tr.scale != null && tr.scale < 0.95) {
        d = el('div', 'cv-pip'); d.style.background = VIS.thumb(l);
        const s = tr.scale, cx = tr.x != null ? tr.x : 0.5, cy = tr.y != null ? tr.y : 0.5;
        d.style.width = (s * 100) + '%'; d.style.height = (s * 100) + '%';
        d.style.left = ((cx - s / 2) * 100) + '%'; d.style.top = ((cy - s / 2) * 100) + '%';
      } else { d = el('div', 'cv-layer'); d.style.background = VIS.thumb(l); drew = true; }
      d.style.opacity = ops(l);
      if (opts.selected === l.id) d.appendChild(el('div', 'cv-sel')), d.querySelector('.cv-sel').style.inset = '-2px';
      cv.appendChild(d);
    });
    if (!drew && !cv.children.length) cv.appendChild(el('div', 'cv-empty', 'Nothing here'));
    return { el: cv, width: W, height: H };
  };

  /* ---------------------------------- timelines ---------------------------------- */
  function tlShell(host, cls, doc, opts, headW) {
    host.innerHTML = '';
    const root = el('div', 'fm-tl ' + cls), scroll = el('div', 'fm-tl-scroll'), inner = el('div', 'fm-tl-inner');
    scroll.appendChild(inner); root.appendChild(scroll); host.appendChild(root);
    const span = Math.max(doc.project.duration || 0, opts.minSpan || 0, 1);
    let pps = opts.pxPerSec;
    if (!pps || pps === 'fit') { const w = (host.clientWidth || 340) - headW - 56; pps = Math.max(6, w / span); }
    const width = headW + span * pps + 64;
    inner.style.width = width + 'px';
    const api = { root, scroller: scroll, inner, pps, head: headW, items: new Map(), fps: doc.project.fps || 30 };
    api.xOf = t => headW + t * pps;
    api.tOf = clientX => { const r = inner.getBoundingClientRect(); const s = r.width / inner.offsetWidth || 1; return Math.max(0, ((clientX - r.left) / s - headW) / pps); };
    // ruler: labels at least ~44px apart
    const ruler = el('div', 'fm-ruler'); ruler.style.width = width + 'px';
    const steps = [0.5, 1, 2, 5, 10, 15, 30, 60]; const step = steps.find(s => s * pps >= 44) || 60;
    for (let t = 0; t <= span + 1e-9; t += step) { const k = el('div', 'tick', t % 1 ? '' : String(Math.round(t)) + 's'); k.style.left = api.xOf(t) + 'px'; ruler.appendChild(k); }
    for (let t = step / 2; t <= span; t += step) { const k = el('div', 'tick minor'); k.style.left = api.xOf(t) + 'px'; ruler.appendChild(k); }
    inner.appendChild(ruler);
    if (opts.onScrub) {
      let down = false;
      const go = e => opts.onScrub(api.tOf(e.clientX));
      ruler.addEventListener('pointerdown', e => { down = true; ruler.setPointerCapture && ruler.setPointerCapture(e.pointerId); go(e); });
      ruler.addEventListener('pointermove', e => { if (down) go(e); });
      ruler.addEventListener('pointerup', () => { down = false; });
      ruler.style.cursor = 'ew-resize'; ruler.style.touchAction = 'none';
    }
    api.ruler = ruler;
    return api;
  }
  function finishPlayhead(api, opts) {
    if (opts.time == null) return;
    api.playhead = VIS.playhead(api.inner, api.xOf(opts.time));
    api.setTime = t => { api.playhead.style.left = api.xOf(t) + 'px'; };
  }
  function tap(node, id, info, opts) { if (!opts.onTap) return; node.addEventListener('click', e => { e.stopPropagation(); opts.onTap(id, info, e); }); node.tabIndex = 0; node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onTap(id, info, e); } }); }

  /* Full: one row per layer, top of the stack first (js/timeline.js's look: 42px rows, 32px bars, eye + thumb head). */
  VIS.drawFull = function (host, doc, opts) {
    opts = opts || {};
    const api = tlShell(host, 'fm-full', doc, opts, 64);
    const byId = new Map(doc.layers.map(l => [l.id, l]));
    doc.layers.forEach(l => {
      const row = el('div', 'fm-row' + (l.visible === false ? ' hidden-layer' : ''));
      const head = el('div', 'fm-head', VIS.icon(l.visible === false ? 'eye' : 'eye') + '<span class="th-thumb"></span>');
      head.querySelector('.th-thumb').style.background = l.type === 'text' ? '#50398d' : l.audioOnly ? '#174f42' : VIS.thumb(l);
      if (l.parent && byId.get(l.parent) && byId.get(l.parent).type === 'group') head.style.boxShadow = 'inset 3px 0 0 rgba(126,231,255,.5)';
      row.appendChild(head);
      const lane = el('div', 'fm-lane'); lane.style.width = (api.inner.offsetWidth || parseFloat(api.inner.style.width)) - 64 + 'px';
      const type = l.audioOnly ? 'audio' : (l.type === 'text' && Array.isArray(l.captions)) ? 'captions' : l.type;
      const bar = el('div', 'fm-bar t-' + type + (opts.selected === l.id ? ' sel' : ''), '<span class="lbl">' + esc(l.name || l.text || l.id) + '</span>');
      bar.style.left = (l.start * api.pps) + 'px'; bar.style.width = Math.max(4, l.duration * api.pps) + 'px';
      if (type === 'video' || type === 'image') { const s = el('div', 'strip'); s.style.background = VIS.thumb(l); s.style.opacity = '.55'; bar.appendChild(s); }
      if (type === 'audio') bar.appendChild(el('div', 'fm-wave'));
      E.kfLists(l).forEach(a => a.forEach(k => { if (k.t < l.start - 1e-9 || k.t > l.start + l.duration + 1e-9) return; const d = el('i', 'kfd'); d.style.left = ((k.t - l.start) * api.pps) + 'px'; bar.appendChild(d); }));
      if (l.locked) bar.appendChild(VIS.lockBadge());
      lane.appendChild(bar); row.appendChild(lane); api.inner.appendChild(row);
      api.items.set(l.id, bar);
      tap(bar, l.id, { kind: 'layer', layer: l }, opts);
    });
    finishPlayhead(api, opts);
    return api;
  };

  /* Simple: sections above the clip row (captions, text, overlays, effects, behind), the clip row, the sound row (DESIGN §8.2/8.3).
     opts.open: 'all' (PC: every section open), or a section key (phone: that one open, the rest folded), or null (auto). */
  VIS.drawQuick = function (host, doc, opts) {
    opts = opts || {};
    const R = E.classify(doc);
    const api = tlShell(host, 'fm-quick', doc, Object.assign({ minSpan: R.trackEnd + 1 }, opts), 36);
    api.R = R;
    const W = parseFloat(api.inner.style.width) - 36;
    const ORDER = ['captions', 'text', 'overlay', 'effect', 'behind'];
    const GLYPH = { captions: '<span class="glyph">Cc</span>', text: '<span class="glyph">Aa</span>', overlay: VIS.icon('overlay'), effect: VIS.icon('effects'), behind: VIS.icon('behind') };
    const present = ORDER.filter(s => R.lanes[s] && R.lanes[s].length);
    const selUnit = opts.selected && R.units[opts.selected];
    let open = opts.open;
    if (open == null) open = (selUnit && ORDER.includes(selUnit.section)) ? selUnit.section : (present[0] || null);
    const allOpen = open === 'all';
    /* A short chip's name may run on past the chip's end, over the empty lane, up to the next thing in that lane, so
       "Here we go" reads "Here we go" or "Here we…" rather than "H…" (QA 29 Sep). The chip itself still shows the length. */
    const spill = (node, label, left, width, nextX, pad) => {
      const room = Math.floor(nextX - left - pad - 3);
      if (room <= width - 2 * pad) return width - 2 * pad - 2;
      node.classList.add('spill'); label.style.maxWidth = room + 'px';
      return room;
    };
    // A caption line with room for fewer than three letters shows no words at all rather than "H…" (its words are in the
    // chip's title, and on the picture when the playhead is on it)
    let measureCtx = null;
    const textW = (s, px, wt) => {
      if (!measureCtx) { try { measureCtx = document.createElement('canvas').getContext('2d'); } catch (e) { return s.length * px * 0.58; } }
      if (!measureCtx) return s.length * px * 0.58;
      measureCtx.font = (wt || 600) + ' ' + px + 'px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter, sans-serif';
      return measureCtx.measureText(s).width;
    };
    const laneRow = (sec, ids, secEl, i) => {
      const row = el('div', 'fm-row');
      const head = el('div', 'fm-head', i === 0 ? GLYPH[sec] : '');
      head.title = VIS.SECTION_NAME[sec];
      row.appendChild(head);
      const lane = el('div', 'fm-lane'); lane.style.width = W + 'px';
      const starts = ids.map(id => R.units[id].start).sort((a, b) => a - b);
      const nextAfter = t => { const n = starts.find(s => s > t + 1e-6); return n == null ? W / api.pps : n; };
      ids.forEach(id => {
        const u = R.units[id], l = u.lead;
        if (sec === 'captions') {
          const box = el('div', 'fm-item s-captions' + (opts.selected === id ? ' sel' : '') + (E.hasFlag(l, 'stay') ? ' stay' : ''));
          box.style.left = (u.start * api.pps) + 'px'; box.style.width = Math.max(6, u.duration * api.pps) + 'px';
          box.style.background = 'transparent'; box.style.border = '1px dashed rgba(242,193,78,.35)';
          lane.appendChild(box);
          const cues = (l.captions || []).filter(q => !(q.end <= 0 || q.start >= l.duration)).slice().sort((a, b) => a.start - b.start);
          cues.forEach((q, k) => {
            const c = el('div', 'fm-cue', '<span>' + esc(q.text) + '</span>'); c.title = q.text;
            const x = (l.start + q.start) * api.pps, w = Math.max(4, (q.end - q.start) * api.pps - 1);
            c.style.left = x + 'px'; c.style.width = w + 'px'; lane.appendChild(c);
            const nx = k + 1 < cues.length ? (l.start + cues[k + 1].start) * api.pps : Math.min(W, nextAfter(u.start) * api.pps);
            const room = spill(c, c.firstChild, x, w, nx, 4);
            if (textW(q.text, 9.5) > room && textW(q.text.slice(0, 3) + '…', 9.5) > room) c.firstChild.textContent = '';
          });
          api.items.set(id, box); tap(box, id, { kind: 'captions', unit: u }, opts);
          return;
        }
        const it = el('div', 'fm-item s-' + sec + (u.kind === 'block' ? ' block' : '') + (opts.selected === id ? ' sel' : '') + (E.hasFlag(l, 'stay') ? ' stay' : ''),
          (u.kind === 'block' ? '✦ ' : '') + '<span>' + esc(l.name || l.text || id) + '</span>');
        it.title = l.name || l.text || id;
        it.style.left = (u.start * api.pps) + 'px'; it.style.width = Math.max(8, u.duration * api.pps) + 'px';
        spill(it, it.querySelector('span'), u.start * api.pps, Math.max(8, u.duration * api.pps), nextAfter(u.start) * api.pps, 7);
        if (l.visible === false) it.style.opacity = '.45';
        if (l.locked) it.appendChild(VIS.lockBadge());
        lane.appendChild(it); api.items.set(id, it);
        tap(it, id, { kind: u.kind, unit: u }, opts);
      });
      row.appendChild(lane); secEl.appendChild(row);
      return row;
    };
    const sections = el('div', 'fm-sections');
    api.sectionRows = {};
    if (!allOpen && present.length) {
      // the folded band: one 32px row; openers side by side, then one strip of the folded sections' marks
      const band = el('div', 'fm-row fm-folded');
      const head = el('div', 'fm-head');
      present.forEach(s => {
        const b = el('button', 'fm-opener' + (s === open ? ' on' : ''), GLYPH[s]); b.type = 'button'; b.style.color = VIS.SECTION_COLOR[s];
        b.setAttribute('aria-label', VIS.SECTION_NAME[s]); b.title = VIS.SECTION_NAME[s];
        b.addEventListener('click', e => { e.stopPropagation(); if (opts.onOpen) opts.onOpen(s); });
        head.appendChild(b);
      });
      band.appendChild(head);
      const strip = el('div', 'fm-lane'); strip.style.width = W + 'px';
      present.filter(s => s !== open).forEach((s, k) => {
        (R.lanes[s] || []).forEach(ids => ids.forEach(id => { const u = R.units[id]; const m = el('div', 'fm-mark'); m.style.left = (u.start * api.pps) + 'px'; m.style.width = Math.max(4, u.duration * api.pps) + 'px'; m.style.top = (8 + k * 6) + 'px'; m.style.background = VIS.SECTION_COLOR[s]; strip.appendChild(m); }));
      });
      // the openers are wider than the 36px head column: pull the strip back under them so every row shares one time axis
      head.style.width = (present.length * 32 + 4) + 'px';
      strip.style.marginLeft = (36 - (present.length * 32 + 4)) + 'px';
      band.appendChild(strip);
      sections.appendChild(band);
    }
    (allOpen ? present : present.filter(s => s === open)).forEach(s => {
      const secEl = el('div', 'fm-sec fm-sec-' + s);
      const lanes = R.lanes[s]; const max = allOpen ? lanes.length : Math.min(lanes.length, opts.maxLanes || 3);
      for (let i = 0; i < max; i++) laneRow(s, lanes[i], secEl, i);
      if (lanes.length > max) { const h = secEl.querySelector('.fm-head'); h.innerHTML += '<span style="font-size:9px">+' + (lanes.length - max) + '</span>'; }
      api.sectionRows[s] = secEl;
      sections.appendChild(secEl);
    });
    api.inner.appendChild(sections);
    // the clip row
    const clipRow = el('div', 'fm-row fm-cliprow');
    clipRow.appendChild(el('div', 'fm-head', VIS.icon(doc.project.sm && doc.project.sm.muteClips ? 'mute' : 'sound')));
    const lane = el('div', 'fm-lane'); lane.style.width = W + 'px';
    /* A clip too narrow for its name lets it run on over the empty space after it: a gap up to the next clip, or the end of
       the row up to the + (under the gap's chip, which sits above the names). At a page's 'fit' zoom a 3-second cutaway is
       ~22 px on a phone and read "C…" (QA V5 29 Sep). With room for fewer than three letters the name shows none, the same
       rule as the captions; it is in the tile's tooltip, and in the tray's words when tapped. */
    const addX = opts.addButton !== false ? R.trackEnd * api.pps + 8 : W;
    const spillName = (tile, e, i, x, w) => {
      const lbl = tile.querySelector('.lbl'); if (!lbl) return;
      const name = lbl.textContent; tile.title = name;
      const next = R.main[i + 1], room = (next ? next.start * api.pps : addX) - (x + w);
      let avail = w - 12;
      if (room > 10) { avail = w - 6 + room - 8; tile.classList.add('spill'); lbl.style.maxWidth = Math.floor(avail) + 'px'; }
      if (name.length > 2 && textW(name.slice(0, 3) + '…', 10.5, 700) > avail && textW(name, 10.5, 700) > avail) lbl.style.visibility = 'hidden';
    };
    R.main.forEach((e, i) => {
      const x = e.start * api.pps, w = Math.max(6, (e.end - e.start) * api.pps);
      if (e.seam.kind === 'gap') {
        const gs = i ? R.main[i - 1].end : 0;
        const g = el('div', 'fm-gap'); g.style.left = (gs * api.pps) + 'px'; g.style.width = Math.max(2, (e.start - gs) * api.pps) + 'px'; lane.appendChild(g);
      }
      let tile;
      if (e.slot) {
        tile = el('div', 'fm-tile slot', '<div class="lbl">Card</div>');
      } else {
        const l = R.layer(e.id);
        tile = el('div', 'fm-tile' + (opts.selected === e.id ? ' sel' : ''), '<div class="film"></div><span class="len">' + VIS.fmt(e.end - e.start) + '</span><div class="lbl">' + esc(l.name || e.id) + '</div><i class="grip l"></i><i class="grip r"></i>');
        tile.querySelector('.film').style.background = VIS.thumb(l);
        if (l.visible === false) tile.style.opacity = '.45';
        if (l.locked) tile.appendChild(VIS.lockBadge());
        if ((l.speed || 1) !== 1) tile.querySelector('.len').textContent += ' · ' + (l.speed) + '×';
      }
      tile.style.left = x + 'px'; tile.style.width = w + 'px';
      if (!e.slot) spillName(tile, e, i, x, w);
      lane.appendChild(tile); api.items.set(e.id, tile);
      tap(tile, e.id, { kind: e.slot ? 'slot' : 'main', entry: e }, opts);
      if (e.seam.kind === 'gap' || e.seam.kind === 'overlap') {
        const txt = (e.seam.kind === 'gap' ? '' : '−') + VIS.fmt(e.seam.amt);
        const chip = el('button', 'fm-seam ' + e.seam.kind, txt);
        chip.type = 'button'; chip.title = e.seam.kind === 'gap' ? 'Close gap' : 'Fix overlap'; chip.setAttribute('aria-label', chip.title);
        // centred on the gap block (a gap) or on the stretch both clips share (an overlap), in the band between the tiles'
        // lengths and names (kit.css): it used to sit on the next clip's corner, over "3.8s" and Street's length (QA, V5)
        const prevEnd = i ? R.main[i - 1].end : 0, cx = (prevEnd + e.start) / 2 * api.pps, cw = Math.max(32, Math.round(12 + 6.3 * txt.length));
        chip.style.left = cx + 'px'; chip.style.width = cw + 'px';
        chip.addEventListener('click', ev => { ev.stopPropagation(); if (opts.onSeam) opts.onSeam(e.id, e.seam.kind, e); });
        lane.appendChild(chip);
      }
    });
    /* D17 B (his pick) and §5.4: anything that runs past the last clip (a long song, most often) makes the video run on in
       black. The band says how long and what runs past; it is not a clip and cannot be picked. */
    const runEnd = doc.project.duration || 0;
    if (R.main.length && runEnd > R.trackEnd + 0.05) {
      const past = doc.layers.filter(l => l.type !== 'camera' && l.type !== 'group' && !E.hasFlag(l, 'tail') && l.start + l.duration > R.trackEnd + 0.05);
      const what = past.length === 1 ? (past[0].audioOnly ? 'the song' : (past[0].text || past[0].name || 'one thing')) : past.length + ' things';
      const runFor = runEnd - R.trackEnd, len = runFor >= 60 ? Math.floor(runFor / 60) + ':' + String(Math.round(runFor % 60)).padStart(2, '0') : VIS.fmt(runFor);
      const bw = Math.max(4, runFor * api.pps), long = past.length ? ' · ' + esc(what) + ' runs past the clips' : '';
      const bl = el('div', 'fm-black' + (bw >= 240 ? ' long' : ''), '<span>Black · ' + len + (bw >= 240 ? long : '') + '</span>');
      bl.style.left = (R.trackEnd * api.pps) + 'px'; bl.style.width = bw + 'px';
      bl.title = 'The video runs on in black for ' + len + ' after the last clip' + (past.length ? ': ' + (past.length === 1 ? what + ' runs' : what + ' run') + ' past the clips' : '');
      lane.appendChild(bl); api.black = bl;
    }
    if (opts.addButton !== false) {
      const add = el('button', 'fm-addclip', VIS.icon('add')); add.type = 'button'; add.setAttribute('aria-label', 'Add clips'); add.title = 'Add clips';
      add.style.left = (R.trackEnd * api.pps + 8) + 'px';
      add.addEventListener('click', e => { e.stopPropagation(); if (opts.onAdd) opts.onAdd(); });
      lane.appendChild(add);
    }
    clipRow.appendChild(lane); api.inner.appendChild(clipRow); api.clipRow = clipRow;
    // the sound row: lane 0 drawn, a count badge where more overlap
    const snd = el('div', 'fm-row fm-soundrow');
    snd.appendChild(el('div', 'fm-head', VIS.icon('music')));
    const sl = el('div', 'fm-lane'); sl.style.width = W + 'px';
    const alanes = R.lanes.audio || [];
    (alanes[0] || []).forEach(id => {
      const u = R.units[id], l = u.lead;
      const it = el('div', 'fm-item s-audio' + (opts.selected === id ? ' sel' : '') + (E.hasFlag(l, 'stay') ? ' stay' : ''), '<div class="fm-wave"></div><span style="position:relative">' + esc(l.name || id) + '</span>');
      it.style.left = (u.start * api.pps) + 'px'; it.style.width = Math.max(8, u.duration * api.pps) + 'px';
      sl.appendChild(it); api.items.set(id, it); tap(it, id, { kind: 'audio', unit: u }, opts);
    });
    if (alanes.length > 1) { const b = VIS.chip('+' + (alanes.length - 1), ''); b.style.position = 'sticky'; b.style.right = '4px'; b.style.float = 'right'; b.style.marginTop = '4px'; sl.appendChild(b); }
    snd.appendChild(sl); api.inner.appendChild(snd); api.soundRow = snd;
    finishPlayhead(api, opts);
    // the link line from the selected follower down to its clip (§4.1)
    if (selUnit && selUnit.host && opts.showLink !== false && api.items.get(opts.selected)) {
      requestAnimationFrame(() => {
        const it = api.items.get(opts.selected); if (!it || !it.isConnected) return;
        const ir = api.inner.getBoundingClientRect(), r = it.getBoundingClientRect(), cr = clipRow.getBoundingClientRect(); const s = ir.width / api.inner.offsetWidth || 1;
        api.link = VIS.linkLine(api.inner, api.xOf(selUnit.start) + 1, (r.bottom - ir.top) / s, (cr.top - ir.top) / s + 4, VIS.SECTION_COLOR[selUnit.section] || '#fff');
      });
    }
    return api;
  };

  /* ---------------------------------- the hub ---------------------------------- */
  /* In number order, so the list and Previous / Next read V1, V2, V3 … V12 (QA 29 Sep: they ran V2, V3, V1 … V11, V10).
     No group is named after its only page ("Roadmap › The roadmap"): the last three share one group. */
  const GROUPS = [
    { name: 'Try it', ids: ['v1', 'v2', 'v3', 'v4'] },
    { name: 'Old projects', ids: ['v5'] },
    { name: 'Working together', ids: ['v6'] },
    { name: "How it's built", ids: ['v7', 'v8', 'v9'] },
    { name: 'Next steps', ids: ['v10', 'v11', 'v12'] }
  ];
  const PLAN = {
    v1: { title: 'The switch', blurb: 'In the ⚙ cog, a third block beside Canvas settings and Friends. One tap flips between Simple and Full; Full itself does not change.' },
    v2: { title: 'The first ten seconds', blurb: 'What someone new sees: New project, pick four clips, they land end to end, tap one.' },
    v3: { title: 'Simple on a phone', blurb: 'Trim, delete, split, move and speed up real clips. Titles, stickers and captions go with their clip.' },
    v4: { title: 'Phone and PC', blurb: 'The same tools, in the same order, with the same names, on both. Tap a tool on one and see it on the other.' },
    v5: { title: 'An old project in Simple', blurb: 'A messy project made in Full, opened in Simple. Nothing is saved until you make an edit.' },
    v6: { title: 'Two people, two editors', blurb: 'Sam in Simple and you in Full, on the same project at the same time, and what each release fixes.' },
    v7: { title: 'How it is built', blurb: 'One project in the middle, two ways of looking at it, and the one path every edit goes through.' },
    v8: { title: 'The data', blurb: 'The only new things saved in a project, and everything that is worked out instead of saved.' },
    v9: { title: 'The ripple maths', blurb: 'Before and after, for every kind of edit, down to the keyframes and the caption timings.' },
    v10: { title: 'Your decisions', blurb: 'Six choices still open, each with pictures and a recommended pick. Your 1 Oct answers are shown, greyed, with your words.' },
    v11: { title: 'The roadmap', blurb: 'What you can hold after each phase, drawn as the screen you would see. Phase 1 first.' },
    // 1 Oct: was "Buttons on the video", which showed a switch put into Full; v12.js registers this name itself
    v12: { title: 'The switch in the cog', blurb: 'Real pictures of the app with the cog’s third block, small and open, on a phone and a PC, and the warning.' }
  };
  const regs = new Map();
  const hub = { ready: false };
  const normId = id => String(id || '').trim().toLowerCase();
  VIS.register = function (id, def) {
    try {
      const k = normId(id);
      if (!k || !def || typeof def.mount !== 'function') { console.warn('VIS.register: needs an id and a mount(host) function', id); return; }
      regs.set(k, def);
      if (hub.ready) hub.refresh(k);
    } catch (e) { console.warn('VIS.register failed', e); }
  };
  VIS._regs.forEach(([id, def]) => VIS.register(id, def));
  VIS._regs = [];
  VIS.registered = () => Array.from(regs.keys());

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; }

  function order() {
    const out = [];
    GROUPS.forEach(g => g.ids.forEach(id => out.push({ id, group: g.name })));
    regs.forEach((def, id) => { if (!out.some(o => o.id === id)) out.push({ id, group: def.group || 'More' }); });
    return out;
  }
  function info(id) { const d = regs.get(id) || {}; const p = PLAN[id] || {}; return { id, title: d.title || p.title || id.toUpperCase(), blurb: d.blurb || p.blurb || '', built: regs.has(id), def: regs.get(id) }; }

  function initHub() {
    const toc = document.getElementById('vis-toc'), view = document.getElementById('vis-view');
    if (!toc || !view) return;
    hub.ready = true;
    const hosts = new Map();                              // id -> {wrap, mounted}
    let current = null;
    const details = el('details');
    const summary = el('summary', '', '<span>Pages</span><span class="h-cur"></span>');
    details.appendChild(summary);
    const groupsEl = el('div', 'h-groups');
    details.appendChild(groupsEl);
    toc.appendChild(details);
    const wide = window.matchMedia ? window.matchMedia('(min-width: 960px)') : { matches: true };
    const syncWide = () => { if (wide.matches) details.open = true; };
    details.open = wide.matches;                             // a phone starts with the list folded (its bar names the open page)
    if (wide.addEventListener) wide.addEventListener('change', syncWide); else if (wide.addListener) wide.addListener(syncWide);

    function buildNav() {
      groupsEl.innerHTML = '';
      const byGroup = new Map();
      order().forEach(o => { if (!byGroup.has(o.group)) byGroup.set(o.group, []); byGroup.get(o.group).push(o.id); });
      byGroup.forEach((ids, name) => {
        const g = el('div', 'h-group'); g.appendChild(el('p', 'h-group-name', esc(name)));
        const ul = el('ul');
        ids.forEach(id => {
          const inf = info(id); const li = el('li');
          const b = el('button', 'h-link' + (inf.built ? '' : ' pending'), '<span class="h-code">' + id.toUpperCase() + '</span><span class="h-lt">' + esc(inf.title) + '</span>');
          b.type = 'button'; b.dataset.id = id;
          if (id === current) b.setAttribute('aria-current', 'page');
          b.addEventListener('click', () => open(id, true));
          li.appendChild(b); ul.appendChild(li);
        });
        g.appendChild(ul); groupsEl.appendChild(g);
      });
    }
    function open(id, byUser) {
      id = normId(id);
      const list = order(); if (!list.some(o => o.id === id)) id = list[0].id;
      current = id; store('vis.open', id);
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* the frame may refuse; the page still works */ }
      buildNav();
      const inf = info(id), idx = list.findIndex(o => o.id === id), grp = list[idx].group;
      summary.querySelector('.h-cur').textContent = id.toUpperCase() + ' · ' + inf.title;
      view.innerHTML = '';
      const head = el('header', 'h-vhead', '<p class="h-eyebrow"><b>' + id.toUpperCase() + '</b> · ' + esc(grp) + '</p><h2 class="h-vtitle">' + esc(inf.title) + '</h2>' + (inf.blurb ? '<p class="h-vblurb">' + esc(inf.blurb) + '</p>' : ''));
      head.id = 'vis-top';
      view.appendChild(head);
      let slot = hosts.get(id);
      if (!slot) {
        slot = { wrap: el('div', 'h-host'), mounted: false };
        slot.wrap.dataset.vis = id;
        hosts.set(id, slot);
      }
      view.appendChild(slot.wrap);
      if (inf.built && !slot.mounted) {
        slot.mounted = true; slot.wrap.innerHTML = '';
        try { const r = inf.def.mount(slot.wrap); if (r && typeof r.then === 'function') r.catch(err => showErr(slot.wrap, err)); }
        catch (err) { showErr(slot.wrap, err); }
      } else if (!inf.built) {
        slot.wrap.innerHTML = '<div class="h-pending"><strong>Being built</strong><span>This page is on its way. It will show: ' + esc(inf.blurb || inf.title) + '</span></div>';
      }
      if (slot.wrap._shown) try { slot.wrap._shown(); } catch (e) {}
      // pager
      const pager = el('nav', 'h-pager'); pager.setAttribute('aria-label', 'Previous and next page');
      const prev = list[idx - 1], next = list[idx + 1];
      const pb = (o, dir) => { const b = el('button', '', '<small>' + dir + '</small>' + esc(o.id.toUpperCase() + ' · ' + info(o.id).title)); b.type = 'button'; b.addEventListener('click', () => open(o.id, true)); return b; };
      if (prev) pager.appendChild(pb(prev, 'Previous')); else pager.appendChild(el('span'));
      if (next) pager.appendChild(pb(next, 'Next'));
      view.appendChild(pager);
      if (byUser) {
        if (!wide.matches) details.open = false;
        const top = head.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.6) head.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }
    function showErr(host, err) { host.innerHTML = ''; const d = el('div', 'h-error'); d.textContent = 'This page hit a problem while drawing.\n' + (err && (err.stack || err.message) || err); host.appendChild(d); console.error(err); }
    hub.refresh = id => { if (id === current) { const s = hosts.get(id); if (s && !s.mounted) open(id, false); else buildNav(); } else buildNav(); };
    const fromHash = normId((location.hash || '').replace('#', ''));
    const saved = store('vis.open');
    const first = order()[0].id;
    open(fromHash && order().some(o => o.id === fromHash) ? fromHash : (saved && order().some(o => o.id === saved) ? saved : first), false);
    window.addEventListener('hashchange', () => { const h = normId(location.hash.replace('#', '')); if (h && h !== current && order().some(o => o.id === h)) open(h, true); });
    VIS.open = id => open(id, true);
  }

  /* The sample strip under the header: Beach day in a phone, Simple and Full, tap to pick. It is the kit's own smoke test. */
  function initSample() {
    const host = document.getElementById('vis-sample-demo'); if (!host) return;
    const doc = VIS.sample('beach');
    let editor = 'quick', sel = null, t = 4.6;
    const seg = el('div', 'h-seg', '<button type="button" data-ed="quick">Simple</button><button type="button" data-ed="full">Full</button>');
    seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Editor');
    host.appendChild(seg);
    const frameHost = el('div'); frameHost.style.width = '100%'; host.appendChild(frameHost);
    function draw() {
      seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ed === editor)));
      frameHost.innerHTML = '';
      // Full has no tray and no tool row, so its timeline takes their height and the phone stays the same size
      const f = VIS.phoneFrame(frameHost, { name: 'Beach day', editor, stageH: 190, tlH: editor === 'full' ? 322 : 214 });
      f.setTime(t, 30);
      VIS.stage(f.stage, doc, t, { selected: sel });
      let api = null;
      // Moving the playhead only moves the playhead: redrawing the whole phone threw away the ruler the finger or the
      // mouse was dragging, so only the first touch counted (QA 29 Sep)
      const scrub = x => { t = Math.max(0, Math.min(x, doc.project.duration - 0.01)); if (api && api.setTime) api.setTime(t); f.setTime(t, 30); VIS.stage(f.stage, doc, t, { selected: sel }); };
      const common = { time: t, selected: sel, onTap: id => { sel = sel === id ? null : id; draw(); }, onScrub: scrub, onOpen: s => { openSec = s; draw(); } };
      if (editor === 'full') api = VIS.drawFull(f.timeline, doc, common);
      else api = VIS.drawQuick(f.timeline, doc, Object.assign({ open: openSec }, common));
      const R = E.classify(doc);
      if (editor === 'full') f.tray.style.display = 'none';            // Full's pick shows on its bar and in the picture
      else if (sel && R.isMain(sel)) { f.tray.innerHTML = ''; VIS.toolbar(f.tray, VIS.CLIP_TRAY); }
      else if (sel) { f.tray.innerHTML = ''; VIS.toolbar(f.tray, VIS.itemTray(R, sel)); }
      else f.setSay('<b>4 clips</b> · 0:14 · tap a clip to pick it');
    }
    let openSec = null;
    seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; editor = b.dataset.ed; draw(); });
    draw();
  }

  function boot() { try { initSample(); } catch (e) { console.error(e); } try { initHub(); } catch (e) { console.error(e); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})(typeof window !== 'undefined' ? window : globalThis);
