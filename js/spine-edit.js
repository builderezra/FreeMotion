/* FreeMotion — FM.spine's WRITE side: the runner and the arranging commands (Simple mode Phase 2, DESIGN.md §3, §4, §5.3).
 *
 * WHAT THIS IS. js/spine.js (Phase 1) READS a project as clips. This file CHANGES it the way a clip-after-clip editor
 * does: delete a clip and the rest close up, trim one and the rest follow, split, close a gap, duplicate. Every command
 * is one plan built against the read model, applied by ONE runner, as ONE undo step and ONE collab transaction.
 *
 * ONLY SIMPLE CALLS ANYTHING HERE (DESIGN.md §0.4). Full's delete, trims, split and drags are not touched: they never
 * ripple, and nothing in Full reaches FM.spine.edit. The few shared seams this release adds (history meta, the undo
 * queue while `FM.spine.running`, `sm.cut` in the de-click rule, `{noSave}` on duplicate) are each inert unless a
 * Simple command is running or a Simple-made mark is in the document; the FU group proves Full equals HEAD.
 *
 * WHAT RELEASE 2.1 REFUSES INSTEAD OF DOING (BUILD-PLAN-PHASE2.md §3, each with its own line and Open in Full): a
 * command that would have to move caption cues, camera keys or a cut item's keys (the rider maps, release 2.4), a blend
 * whose fade belongs to the clip being trimmed or deleted (2.4), and a time link the command would pull apart (2.4's
 * ask). Refusing is DESIGN §3.2 rule 6: refuse, never half-apply.
 *
 * No DOM except body.sm-running and the one sink FM.spine.say (js/simple-timeline.js). The suite drives it headless.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const S = FM.spine = FM.spine || {};
  const words = () => FM.spineWords || {};
  const line = (k, a, b, c) => { const v = (words().lines || {})[k]; return typeof v === 'function' ? v(a, b, c) : (v || ''); };
  const fps = () => (FM.scene && FM.scene.project && FM.scene.project.fps) || 30;
  const MINLEN = () => S.minLen(fps());
  const SLACK = 1e-6;
  const isAnim = p => !!(p && typeof p === 'object' && Array.isArray(p.kf));

  /* ═══ THE KEYFRAME MOVERS (§0.4 B2). Simple's own copies over FM.timedLists, so cue-effect keys move too; Full's
     FM.shiftLayerKeyframes / scaleLayerKeyframes stay on animatedProps exactly as before. */
  S.shiftKeys = function (layer, d) {
    if (!layer || !d || !isFinite(d)) return;
    (FM.timedLists ? FM.timedLists(layer) : FM.animatedProps(layer)).forEach(p => p.kf.forEach(k => { k.t += d; }));
  };
  S.keyCount = function (layer) {
    let n = 0;
    (FM.timedLists ? FM.timedLists(layer) : FM.animatedProps(layer)).forEach(p => { if (p !== layer.speed) n += p.kf.length; });
    return n;
  };
  /* The §4.5 tail-fit map: old span [s, s+D] → [s, s+D2]. Keys in the first h keep their time, keys in the last e move by
     D2 − D, keys between scale linearly. h = e = min(5, min(D, D2)/4): symmetric, so a fit there and back is exact. */
  S.fitMap = function (s, D, D2) {
    const h = Math.min(5, Math.min(D, D2) / 4), e = h;
    return function (t) {
      if (!(D > 0) || !(D2 > 0)) return t;
      if (t <= s + h) return t;
      if (t >= s + D - e) return t + (D2 - D);
      const a0 = s + h, a1 = s + D - e, b1 = s + D2 - e;
      return a0 + (t - a0) * (b1 - a0) / (a1 - a0);
    };
  };
  S.mapLayerKeys = function (layer, g) {
    (FM.timedLists ? FM.timedLists(layer) : FM.animatedProps(layer)).forEach(p => {
      if (p === layer.speed) return;   // the ramp describes the re-timing (scene.js scaleLayerKeyframes)
      p.kf.forEach(k => { k.t = g(k.t); });
    });
  };

  /* ═══ FM.trimClipEdge (§3.6): the grip's maths (js/timeline.js applyTrim), minus the frame snap and the drag, as a PURE
     function. Returns { start, duration, trimStart, landed, fxShift } and writes nothing (the speed integrals lay a
     temporary window on the layer and restore it, as FM.speedAdvanceOver always has). Used by Simple only: Full's grip,
     A / D and FM.trimLayerHead keep their own code (§0.4 B7); T2 compares the numbers with the grip's. */
  FM.trimClipEdge = function (layer, edge, delta, srcDur) {
    const s0 = +layer.start || 0, d0 = +layer.duration || 0, tr0 = +layer.trimStart || 0;
    const isVid = layer.type === 'video';
    const rev = isVid && !!layer.reversed;
    const ramped = !!(FM.isAnimated && FM.isAnimated(layer.speed));
    const sp = FM.speedAt ? FM.speedAt(layer, s0) : 1;
    const sd = (isFinite(srcDur) && srcDur > 0) ? srcDur : Infinity;
    const floor = Math.min(MINLEN(), d0);
    const keepTrim = isVid ? undefined : layer.trimStart;
    if (edge === 'tail') {
      let nd = Math.max(floor, d0 + delta), tr = tr0;
      if (rev && ramped) {
        if (nd > d0) { nd = Math.max(floor, FM.speedAdvanceSolve(layer, d0, nd, tr0)); tr = Math.max(0, tr0 - FM.speedAdvanceOver(layer, d0, nd)); }
        else tr = tr0 + FM.speedAdvanceOver(layer, nd, d0);
      } else if (rev) {
        let nt = tr0 - (nd - d0) * sp;
        if (nt < 0) { nd = Math.max(floor, d0 + tr0 / sp); nt = 0; }
        tr = nt;
      } else if (isVid && sd < Infinity) {
        nd = Math.min(nd, FM.maxDurForSource(layer, sd - tr0, nd));
      }
      return { start: s0, duration: nd, trimStart: isVid ? tr : keepTrim, landed: nd - d0, fxShift: 0 };
    }
    let dl = delta;
    if (d0 - dl < floor) dl = d0 - floor;
    if (rev) {
      if (sd < Infinity) { const maxDur = (sd - tr0) / sp; if (d0 - dl > maxDur) dl = d0 - maxDur; }
      return { start: s0 + dl, duration: d0 - dl, trimStart: tr0, landed: dl, fxShift: dl };
    }
    if (!isVid) return { start: s0 + dl, duration: d0 - dl, trimStart: keepTrim, landed: dl, fxShift: dl };
    const srcOf = d => ramped ? FM.headSourceDelta(layer, d) : d * sp;
    let srcD = srcOf(dl);
    if (tr0 + srcD < 0) {
      if (!ramped) dl = -tr0 / sp;
      else { let lo = dl, hi = 0; for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (FM.speedAdvanceOver(layer, mid, 0) > tr0) lo = mid; else hi = mid; } dl = hi; }
      srcD = srcOf(dl);
    }
    return { start: s0 + dl, duration: d0 - dl, trimStart: Math.max(0, tr0 + srcD), landed: dl, fxShift: dl };
  };

  /* ───────────────────────────── read-model helpers ───────────────────────────── */
  const srcDurOf = l => { const m = FM.media && FM.media.get && FM.media.get(l.id); return (m && m.duration > 0) ? m.duration : Infinity; };
  function byIdMap() { return new Map(FM.scene.layers.map(l => [l.id, l])); }
  function unitLayers(id, map) {
    const l = map.get(id); if (!l) return [];
    if (l.type === 'group' && FM.groupDescendants) return [l].concat(FM.groupDescendants(id).filter(Boolean));
    return [l];
  }
  function mainIdx(R, id) { for (let i = 0; i < R.main.length; i++) if (!R.main[i].slot && R.main[i].id === id) return i; return -1; }
  /* The main entry under t: start − eps ≤ t < end − eps, a cut going to the clip AFTER it (§4.1). Clips only. */
  S.mainAtTime = function (R, t) {
    for (let i = R.main.length - 1; i >= 0; i--) { const e = R.main[i]; if (!e.slot && e.start - R.eps <= t && t < e.end - R.eps) return e; }
    return null;
  };
  const isFloatJoin = (R, i) => i > 0 && R.main[i].seam && (R.main[i].seam.kind === 'hairline' || (R.main[i].seam.kind === 'join' && Math.abs(R.main[i - 1].end - R.main[i].start) < 1e-9));
  /* The upper of two overlapping main clips owns a blend (§3.1): it carries the opacity keys inside the overlap. */
  function blendOwner(a, b, map) { const la = map.get(a.id), lb = map.get(b.id), z = id => FM.scene.layers.findIndex(l => l.id === id); return z(a.id) < z(b.id) ? la : lb; }

  /* ═══ isTwinOf (§4.6): the sound taken out of a clip. Audio-only, the clip's exact timing, and either the karaoke link
     or the same source file (name + size + type: an extracted twin's record is re-read from the clip's own File). */
  S.isTwinOf = function (t, c, eps) {
    if (!t || !c || t === c || t.type !== 'video') return false;
    if (!(t.audioOnly === true || (t.sm && t.sm.snd === true))) return false;
    const e = eps == null ? 0.5 / fps() : eps, near = (a, b) => Math.abs((+a || 0) - (+b || 0)) <= e;
    if (!(near(t.start, c.start) && near(t.duration, c.duration) && near(t.trimStart, c.trimStart) && !!t.reversed === !!c.reversed)) return false;
    if (JSON.stringify(t.speed == null ? 1 : t.speed) !== JSON.stringify(c.speed == null ? 1 : c.speed)) return false;
    if (t.karaokeOf === c.id) return true;
    const a = FM.media && FM.media.get(t.id), b = FM.media && FM.media.get(c.id), fa = a && a.file, fb = b && b.file;
    return !!(fa && fb && fa.name === fb.name && fa.size === fb.size && fa.type === fb.type);
  };
  function twinsOf(R, c, map) { return (R.followers[c.id] || []).map(id => map.get(id)).filter(t => S.isTwinOf(t, map.get(c.id), R.eps)); }

  /* ═══ neverPinned (§4.3): the ONE "never gets sm.stay" test, shared by adopt() and pinStrays(). */
  S.neverPinned = function (id, R) {
    const u = R.units[id]; if (!u) return true;
    if (u.kind === 'main' || u.kind === 'captions' || u.kind === 'fullOnly' || u.kind === 'undecided') return true;
    if (R.tail.indexOf(id) >= 0) return true;
    if (u.host && String(u.host).indexOf('slot:') === 0) return true;
    return false;
  };
  /* A picture item whose end may follow the video (§4.5, D17 B): never a sound, a caption track, the camera, a Full-only
     or undecided unit, a background, or a video that carries audible sound. */
  function tailOk(l, u) {
    if (!l || !u) return false;
    if (u.kind === 'audio' || u.kind === 'captions' || u.kind === 'fullOnly' || u.kind === 'undecided' || u.kind === 'background') return false;
    if (l.audioOnly === true || (l.sm && l.sm.snd === true) || l.type === 'camera') return false;
    if (l.type === 'video' && !l.muted) { const m = FM.media && FM.media.get(l.id); if (!(m && m.hasAudio === false)) return false; }
    return true;
  }
  function setTail(l, end) { if (S.setFlag(l, 'tail', true)) l.sm.tailEnd = end; }

  /* ═══ ADOPTION (§5.3): the first arranging edit stores what was worked out, in its own undo step. Writes the main set
     (exactly, removing strays), Stay put on hostless, long and whole-covering items, and the tail flag on whole-covering
     PICTURE items. Moves nothing. Returns the paths it wrote (the collab meta for §5.3's adoption rule, release 2.6). */
  S.adopt = function (R) {
    const P = FM.scene.project, paths = ['P/sm/adopted', 'P/sm/v'];
    if (!P.sm || typeof P.sm !== 'object' || Array.isArray(P.sm)) P.sm = {};
    P.sm.adopted = true; P.sm.v = FM.SM_V;
    const mainIds = new Set(R.main.filter(e => !e.slot).map(e => e.id));
    FM.scene.layers.forEach(l => {
      if (mainIds.has(l.id)) { if (!(l.sm && l.sm.main)) { S.setFlag(l, 'main', true); paths.push('L/' + l.id + '/sm/main'); } }
      else if (l.sm && l.sm.main) { S.setFlag(l, 'main', false); paths.push('L/' + l.id + '/sm/main'); }
    });
    paths.push.apply(paths, pinUnits(R, true));
    return paths;
  };
  /* Both adopt() and pinStrays(): Stay put on every non-main unit neverPinned does not exclude, with no flag of its own,
     whose pre-edit host is null (before 0, in a gap, long, or the one sound rule) or that covers the whole main track.
     `whole` items that are pictures get the tail flag too (decided once, stored, so no later trim flips it). */
  function pinUnits(R, adopting) {
    const map = byIdMap(), out = [];
    const first = R.main.filter(e => !e.slot)[0];
    Object.keys(R.units).forEach(id => {
      const u = R.units[id], l = map.get(id);
      if (!l || S.neverPinned(id, R)) return;
      if (l.sm && (l.sm.stay || l.sm.main)) return;
      const s = +l.start || 0, e = s + (+l.duration || 0);
      const whole = !!first && s <= first.start + R.eps && e >= R.trackEnd - R.eps;
      if (!(whole || u.host == null)) return;
      S.setFlag(l, 'stay', true); out.push('L/' + id + '/sm/stay');
      if (tailOk(l, u) && first && Math.abs(e - R.trackEnd) <= R.eps) { setTail(l, e); out.push('L/' + id + '/sm/tail', 'L/' + id + '/sm/tailEnd'); }
      if (!adopting) S._pinnedNow.push(id);
    });
    return out;
  }
  S._pinnedNow = [];
  S.pinStrays = function (R) { S._pinnedNow = []; return pinUnits(R, false); };

  /* ═══ THE TAIL FIT (§4.5, D17 B): every item carrying sm.tail whose end still equals the end it was fitted at follows
     the new main-track end, keys re-timed by fitMap. A different end means he set its length on purpose: the flag goes
     (Stay put kept) and the line says so. Sound never carries the flag, and the runner clears a stray one. Only the
     latest-starting piece of one split lineage keeps it (an old build's double flag is repaired here). */
  S.fitTails = function (R2, plan) {
    const end = R2.trackEnd, notes = [], map = byIdMap();
    if (!R2.main.some(e => !e.slot)) return notes;
    const lineage = new Map();
    FM.scene.layers.forEach(l => {
      if (!(l.sm && l.sm.tail)) return;
      const u = R2.units[l.id];
      if (!tailOk(l, u || { kind: 'overlay' })) { S.setFlag(l, 'tail', false); return; }
      const k = l.splitOf || l.id;
      const prev = lineage.get(k);
      if (!prev || (+l.start || 0) > (+prev.start || 0)) { if (prev) S.setFlag(prev, 'tail', false); lineage.set(k, l); }
      else S.setFlag(l, 'tail', false);
    });
    lineage.forEach(l => {
      const s = +l.start || 0, D = +l.duration || 0, e = s + D;
      const fitted = typeof l.sm.tailEnd === 'number' ? l.sm.tailEnd : e;
      if (Math.abs(e - fitted) > R2.eps && !(plan && plan.resized && plan.resized.has(l.id))) { S.setFlag(l, 'tail', false); S.setFlag(l, 'stay', true); notes.push(line('keepsLength', S.itemWord(l, R2))); return; }
      if (Math.abs(e - end) <= 1e-9) { l.sm.tailEnd = end; return; }
      if (!(end > s + 1e-9)) return;                                    // cannot be fitted: the black band names it
      let D2 = end - s, tr = l.trimStart;
      if (l.type === 'video') { const r = FM.trimClipEdge(l, 'tail', D2 - D, srcDurOf(l)); D2 = r.duration; tr = r.trimStart; }
      else D2 = Math.max(MINLEN(), D2);
      const g = S.fitMap(s, D, D2);
      S.mapLayerKeys(l, g);
      if (plan && plan.touched) plan.touched.add(l.id);
      l.duration = D2; if (l.type === 'video') l.trimStart = tr;
      l.sm.tailEnd = s + D2;
    });
    return notes;
  };

  /* Transparent groups follow their members (§2.5): start = min member start, duration = max end − start, exact (Full's
     refitGroupsFor rounds to the millisecond and only walks up from one layer). An emptied group is removed with the
     delete that emptied it; one with no members never holds the video past the new end. */
  function refitTransparentGroups(R) {
    const L = FM.scene.layers, byParent = new Map();
    L.forEach(l => { if (l.parent) { if (!byParent.has(l.parent)) byParent.set(l.parent, []); byParent.get(l.parent).push(l); } });
    const depth = g => { let n = 0, p = g.parent, m = byIdMap(); while (p && n < 64) { n++; const q = m.get(p); p = q ? q.parent : null; } return n; };
    L.filter(g => g.type === 'group' && !R.units[g.id]).sort((a, b) => depth(b) - depth(a)).forEach(g => {
      const kids = byParent.get(g.id) || [];
      if (!kids.length) {
        const ge = (+g.start || 0) + (+g.duration || 0);
        if (R.trackEnd > 0 && ge > R.trackEnd + 1e-9) g.duration = Math.max(MINLEN(), R.trackEnd - (+g.start || 0));
        return;
      }
      const s = Math.min.apply(null, kids.map(k => +k.start || 0));
      const e = Math.max.apply(null, kids.map(k => (+k.start || 0) + (+k.duration || 0)));
      g.start = s; g.duration = Math.max(MINLEN(), e - s);
    });
  }

  /* ═══ sm.cut (§12.1, §0.4 B6): two halves of one split that a command made touch over a jump in the footage get the
     de-click ramps back. app.js seamAt checks continuity only for a pair whose later half carries this mark, so a
     Full-made project sounds exactly as today. */
  function markCuts(touched) {
    const L = FM.scene.layers, sib = new Map();
    L.forEach(l => { if (l.splitOf) { if (!sib.has(l.splitOf)) sib.set(l.splitOf, []); sib.get(l.splitOf).push(l); } });
    sib.forEach(list => {
      list.sort((a, b) => (+a.start || 0) - (+b.start || 0));
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i];
        if (!touched.has(a.id) && !touched.has(b.id)) continue;
        if (Math.abs((+a.start || 0) + (+a.duration || 0) - (+b.start || 0)) >= 1e-3) continue;
        if (!S.continuous(a, b)) S.setFlag(b, 'cut', true);
      }
    });
  }
  S.continuous = function (a, b) {   // a plays before b in time; is b's first source frame a's next one?
    if ((a.mediaRev || 0) !== (b.mediaRev || 0) || !!a.reversed !== !!b.reversed) return false;
    const adv = l => FM.layerSourceAdvance ? FM.layerSourceAdvance(l, +l.duration || 0) : (+l.duration || 0);
    return a.reversed ? Math.abs((+b.trimStart || 0) + adv(b) - (+a.trimStart || 0)) <= 1 / 48000
                      : Math.abs((+a.trimStart || 0) + adv(a) - (+b.trimStart || 0)) <= 1 / 48000;
  };

  /* ═══ THE PLAN. moves add (addMove), a landing assigns (addLand: l.start = t exactly, keys by t − old). writes run before
     the moves (trims, key shifts on a clip that keeps its start), pre are async steps that make layers (split, duplicate),
     post run after the moves. `touched` is every unit the lock rule (D7) and the lease rule look at. */
  function newPlan(label) {
    return { label: label, moves: new Map(), lands: new Map(), keyless: new Set(), removes: new Set(), touched: new Set(),
             resized: new Set(), writes: [], pre: [], post: [], arranges: true, adopts: true, time: null, live: null, say: null, sayButtons: null, counts: {},
             mints: false, copies: [] };   // mints: the plan made a new media record ({noSave}), so the runner saves its file at once;
                                           // copies: [sourceId, copyId] pairs a duplicate made (a copy of a locked clip is locked, D7)
  }
  function addMove(p, id, d) { p.moves.set(id, (p.moves.get(id) || 0) + d); p.touched.add(id); }
  function addLand(p, id, t) { p.lands.set(id, t); p.touched.add(id); }
  const refusePlan = (kind, o) => ({ refuse: kind, refuseOpts: o || {} });

  /* THE ONE RIPPLE (§3.4), by main-track ORDER, with exact landings (§3.1): entries from `from` move by dt; a seam that was a
     float-noise join or a hairline, and the first seam when `landFirst`, lands bit-exact on the new end before it, and
     every later entry, follower and the tail take that correction too. Returns the total displacement of the last entry, and
     `end`: the last CLIP's new end exactly as apply() writes it (null when no clip moved) — the tail lands on that, never on
     trackEnd + d, which differs by an ulp often enough to open a black frame before an end card (§3.1). */
  function ripple(p, R, from, dt, skip, prevEnd, landFirst) {
    let acc = 0, last = null, end = null;
    const map = byIdMap();
    for (let i = from; i < R.main.length; i++) {
      const e = R.main[i];
      if (skip.has(e.id)) continue;
      let d = dt + acc, landAt = null;
      const wantLand = !S._noLanding && prevEnd != null && ((i === from && landFirst) || isFloatJoin(R, i));   // _noLanding: T2b's positive control only
      if (wantLand) { const prop = e.start + d; if (Math.abs(prevEnd - prop) <= R.eps + 1e-9) { landAt = prevEnd; acc += prevEnd - prop; d = prevEnd - e.start; } }
      if (e.slot) { e.members.forEach(m => { if (!skip.has(m)) addMove(p, m, d); }); prevEnd = e.end + d; }
      else {
        if (landAt != null) addLand(p, e.id, landAt); else addMove(p, e.id, d);
        (R.followers[e.id] || []).forEach(f => { if (!skip.has(f)) addMove(p, f, d); });
        /* the end the NEXT seam lands on is the one apply() will produce, bit for bit: the new start (assigned, or old + d)
           plus the stored duration — never e.end + d, which rounds differently (§3.1) */
        const l = map.get(e.id), ns = landAt != null ? landAt : (+l.start || 0) + d;
        prevEnd = ns + (+l.duration || 0);
        end = prevEnd;
      }
      last = d;
    }
    return { last: last, acc: acc, end: end };
  }
  /* The tail (§4.3) moves by the change of trackEnd; one that sat bit-exact on the old end lands on the new one. */
  function tailMove(p, R, newEnd, map) {
    const d = newEnd - R.trackEnd;
    if (!d) return;
    R.tail.forEach(id => { const l = map.get(id); if (!l) return; if (Math.abs((+l.start || 0) - R.trackEnd) < 1e-9) addLand(p, id, newEnd); else addMove(p, id, d); });
  }

  /* The displacement a layer gets from this plan (null = removed). A unit's members share its d. */
  function dispOf(p, map) {
    const out = new Map();
    const set = (id, d) => unitLayers(id, map).forEach(l => out.set(l.id, d));
    p.moves.forEach((d, id) => set(id, d));
    p.lands.forEach((t, id) => { const l = map.get(id); if (l) set(id, t - (+l.start || 0)); });
    p.removes.forEach(id => unitLayers(id, map).forEach(l => out.set(l.id, null)));
    return out;
  }
  /* §3.10 rule 5 and rule 4, the 2.1 form: a survivor that references a removed layer refuses the command, naming both;
     a reference whose two ends this plan moves by different amounts refuses too (2.4 makes that an ask). The referenced
     end counts only when it varies in time (keys, a video, a behaviour); a still parent can be left behind harmlessly. */
  function refsOf(l) {
    const out = [];
    if (l.parent) out.push({ id: l.parent, via: 'parent' });
    (l.behaviors || []).forEach(b => { if (b && b.params) ['targetId', 'sourceId'].forEach(k => { if (b.params[k]) out.push({ id: b.params[k], via: 'follow' }); }); });
    if (FM.eachRefFx) FM.eachRefFx(l, fx => { if (fx && fx.params && fx.params.source) out.push({ id: fx.params.source, via: 'matte' }); });
    if (l.karaokeOf) out.push({ id: l.karaokeOf, via: 'twin' });
    return out;
  }
  const timeVarying = l => !!l && (l.type === 'video' || (FM.animatedProps && FM.animatedProps(l).length > 0) || (l.behaviors || []).some(b => b && b.enabled !== false));
  function couplingBlock(p, R, map) {
    const disp = dispOf(p, map);
    for (let i = 0; i < FM.scene.layers.length; i++) {
      const x = FM.scene.layers[i];
      const dx = disp.has(x.id) ? disp.get(x.id) : 0;
      if (dx === null) continue;
      const refs = refsOf(x);
      for (let k = 0; k < refs.length; k++) {
        const y = map.get(refs[k].id); if (!y) continue;
        if (refs[k].via === 'parent' && y.type === 'group') continue;   // membership, not a link (§2.5)
        const dy = disp.has(y.id) ? disp.get(y.id) : 0;
        if (dy === null) {
          if (refs[k].via === 'twin') continue;   // a karaoke twin is a follower: it is removed with its clip
          return { kind: 'attached', a: S.itemWord(x, R), b: S.itemWord(y, R) };
        }
        if (Math.abs(dx - dy) > 1e-9 && timeVarying(y)) { const v = refs[k].via; if (!(p.asks || []).some(a => a.kind === 'slip' && a.via === v)) p.asks = (p.asks || []).concat([{ kind: 'slip', via: v }]); }
      }
    }
    return null;   // 2.4: a link whose two ends move by different amounts is an ASK now (plan.asks), never a refusal; deleting a referenced unit still refuses ('attached')
  }

  /* ═══════════════ RELEASE 2.4: riders, couplings and crossfades (DESIGN §3.5, §3.10, §3.1) ═══════════════
     ONE TIME MAP PER COMMAND (§3.5). A map is a list of PIECES of the original time, each with the image it lands on: k = 1 shifts
     (an offset), k = 0 collapses a cut span to one point, any other k scales (Speed). Every rider (a caption track's cues, its window
     and its keys, the camera's keys and window, a cut item's keys, a crossfade's owned keys) goes through the SAME map, so a shift is
     never applied twice and a cue that straddles an edit always has an answer. A START is mapped by the piece it lies in (R), an END
     by the piece it ends in (L): that is what lets one cue straddle an Insert (it splits, the halves meet the inserted clips' edges)
     or a Delete (its two outside parts join). Reorder and Sort are the stated exception, a piecewise TRANSLATION g (translation: true). */
  const BIG = 1e9, TME = 1e-9, SEAMNUDGE = 1e-3;
  const minCue = () => (FM.captions && FM.captions.MIN_CUE) || 0.10;
  const clone = o => JSON.parse(JSON.stringify(o, FM.jsonReplacer));
  function tmMake(pieces, translation) {
    const P = pieces.filter(p => p.hi > p.lo + 1e-12);
    const img = (p, t) => p.i0 + (t - p.lo) * p.k;
    const find = (t, left) => {
      for (let i = 0; i < P.length; i++) if (left ? (t > P[i].lo + TME && t <= P[i].hi + TME) : (t >= P[i].lo - TME && t < P[i].hi - TME)) return P[i];
      return t <= P[0].lo ? P[0] : P[P.length - 1];
    };
    const m = { pieces: P, translation: !!translation, img: img, find: find };
    m.R = t => img(find(t, false), t);
    m.L = t => img(find(t, true), t);
    m.holes = [];
    for (let j = 0; j + 1 < P.length; j++) if (Math.abs(P[j + 1].i0 - img(P[j], P[j].hi)) > 1e-9) m.holes.push(P[j].hi);
    m.splits = translation ? P.slice(0, -1).map(p => p.hi) : m.holes.slice();
    m.cuts = P.filter(p => p.k === 0).map(p => [p.lo, p.hi]);
    m.scales = P.filter(p => p.k !== 0 && Math.abs(p.k - 1) > 1e-9);
    return m;
  }
  /* removals [a, b) and insertions {a, ins}, ascending in original time */
  function tmOps(ops) {
    const o = ops.slice().sort((x, y) => x.a - y.a), pieces = [];
    let lo = 0, off = 0;
    o.forEach(op => {
      const len = op.b > op.a ? op.b - op.a : 0;
      pieces.push({ lo: lo, hi: op.a, i0: lo + off, k: 1 });
      if (len > 0) { pieces.push({ lo: op.a, hi: op.b, i0: op.a + off, k: 0 }); lo = op.b; off -= len; }
      else { lo = op.a; off += (op.ins || 0); }
    });
    pieces.push({ lo: lo, hi: BIG, i0: lo + off, k: 1 });
    return tmMake(pieces, false);
  }
  const tmShift = (at, D) => D >= 0 ? tmOps([{ a: at, ins: D }]) : tmOps([{ a: at + D, b: at }]);   // a tail or head trim, Insert, Append, Duplicate, Fix overlap
  const tmCut = (a, b) => tmOps([{ a: a, b: b }]);                                                   // Delete, Make overlay, Close gap
  function tmScale(a, oldLen, newLen) {                                                              // Speed: cue [3,5] on clip [0,4] at 2x -> [1.5, 3]
    const k = newLen / oldLen;
    return tmMake([{ lo: 0, hi: a, i0: 0, k: 1 }, { lo: a, hi: a + oldLen, i0: a, k: k }, { lo: a + oldLen, hi: BIG, i0: a + newLen, k: 1 }], false);
  }
  function tmPieces(list) {                                                                          // Reorder: [{ lo, hi, off }] covering [0, BIG)
    return tmMake(list.map(p => ({ lo: p.lo, hi: p.hi, i0: p.lo + p.off, k: 1 })), true);
  }
  S.tm = { make: tmMake, ops: tmOps, shift: tmShift, cut: tmCut, scale: tmScale, pieces: tmPieces };

  /* ═══ FM.spine.seamKey / divideSegment (§3.10 rule 3a): the boundary key, built the way FM.splitLayer builds its seam key. A COPY
     of that block (js/app.js `EASE_AS_BEZ` … `splitBez`), so Full's split is not touched (§0.4 I9). The key carries `split: 1` (as the
     split's does) and `sb: 1` (a mark Full never writes: Bounce skips it). */
  const EASE_AS_BEZ = { easeIn: [1 / 3, 0, 2 / 3, 1 / 3], easeOut: [1 / 3, 2 / 3, 2 / 3, 1] };
  function easeBezOf(b) {
    if (b.ez && FM.easeApply && FM.easeApply(b.ez, 0.5) != null) return null;
    if (Array.isArray(b.bez) && b.bez.length === 4 && b.bez.every(Number.isFinite)) return b.bez;
    if (b.e && FM.EASES && Object.prototype.hasOwnProperty.call(FM.EASES, b.e)) return EASE_AS_BEZ[b.e] || null;
    if (b.e && FM.EASE_PRESETS && Object.prototype.hasOwnProperty.call(FM.EASE_PRESETS, b.e)) return FM.EASE_PRESETS[b.e];
    return null;
  }
  function splitBez(z, u) {
    const bx = s => { const m = 1 - s; return 3 * m * m * s * z[0] + 3 * m * s * s * z[2] + s * s * s; };
    let lo = 0, hi = 1, s = u;
    for (let i = 0; i < 60; i++) { s = (lo + hi) / 2; if (bx(s) < u) lo = s; else hi = s; }
    const Lr = (p, q) => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s];
    const P0 = [0, 0], P1 = [z[0], z[1]], P2 = [z[2], z[3]], P3 = [1, 1];
    const A = Lr(P0, P1), Bm = Lr(P1, P2), C = Lr(P2, P3), D = Lr(A, Bm), E = Lr(Bm, C), M = Lr(D, E);
    const ok = n => Math.abs(n) > 1e-6;
    const head = (ok(M[0]) && ok(M[1])) ? [A[0] / M[0], A[1] / M[1], D[0] / M[0], D[1] / M[1]] : null;
    const tx = x => (x - M[0]) / (1 - M[0]), ty = y => (y - M[1]) / (1 - M[1]);
    const tail = (ok(1 - M[0]) && ok(1 - M[1])) ? [tx(E[0]), ty(E[1]), tx(C[0]), ty(C[1])] : null;
    const fin = q => q && q.every(Number.isFinite) ? q.map(n => Math.round(n * 1e9) / 1e9) : null;
    return { head: fin(head), tail: fin(tail), my: M[1] };
  }
  const isArrKf = p => p.kf.some(k => Array.isArray(k.v));
  /* the key at t with the HEAD of the divided curve, and the TAIL to write on the original key after t */
  S.seamKey = function (p, t) {
    const keys = p.kf.slice().sort((x, y) => x.t - y.t), arr = isArrKf(p);
    const b = keys.find(k => k.t >= t - 1e-9), a = keys.slice().reverse().find(k => k.t < t - 1e-9);
    const v = arr ? clone((keys.slice().reverse().find(k => k.t <= t + 1e-9) || keys[0]).v) : FM.evalProp(p, t);
    const plain = x => typeof x === 'number' || typeof x === 'string';
    const z = (a && b && !arr && plain(a.v) && plain(b.v) && b.t - a.t > 1e-9 && !Number.isFinite(a.to) && !Number.isFinite(b.ti)) ? easeBezOf(b) : null;
    let cut = z ? splitBez(z, (t - a.t) / (b.t - a.t)) : null;
    if (cut && typeof a.v === 'string' && !(cut.my >= -1e-9 && cut.my <= 1 + 1e-9)) cut = null;
    const key = { t: t, v: v, e: (b && b.e) || 'linear', split: 1, sb: 1 };
    if (b && b.bez) key.bez = b.bez.slice();
    if (b && b.ez) key.ez = clone(b.ez);
    if (cut && cut.head) key.bez = cut.head.slice();
    return { key: key, nextBez: cut && cut.tail ? cut.tail.slice() : null, next: b || null };
  };
  /* A Cut whose a and b lie in ONE segment divides the ORIGINAL segment at both, before any key is inserted: evaluating seamKey(b) on a
     list that already carries the a-key divides the wrong curve (§3.10 rule 3a) */
  S.divideSegment = function (p, t1, t2) {
    const keys = p.kf.slice().sort((x, y) => x.t - y.t), arr = isArrKf(p);
    const k1 = keys.find(k => k.t >= t1 - 1e-9), k0 = keys.slice().reverse().find(k => k.t < t1 - 1e-9);
    const same = k0 && k1 && t2 <= k1.t + 1e-9;
    const first = S.seamKey(p, t1), second = S.seamKey(p, t2);
    if (!same || arr || !k1) return { a: first, b: second };
    const plain = x => typeof x === 'number' || typeof x === 'string';
    const z = (plain(k0.v) && plain(k1.v) && k1.t - k0.t > 1e-9 && !Number.isFinite(k0.to) && !Number.isFinite(k1.ti)) ? easeBezOf(k1) : null;
    if (!z) return { a: first, b: second };
    const ca = splitBez(z, (t1 - k0.t) / (k1.t - k0.t)), cb = splitBez(z, (t2 - k0.t) / (k1.t - k0.t));
    if (ca.head) first.key.bez = ca.head.slice();
    first.nextBez = null;                                       // the a-key ends the head part: nothing is written after it
    second.nextBez = cb.tail ? cb.tail.slice() : null;
    second.next = k1;
    return { a: first, b: second };
  };

  /* ═══ FM.spine.riderKeys(layer | props, map) (§3.10 rule 3): the keys of every keyframed list through one time map, boundary keys where the map
     breaks the curve. (b) Cut(a, b): a seam key at a and at b (through divideSegment) when the property has keys on both sides; keys strictly
     inside dropped. (c) Insert-form holes: the seam key before the hole and a copy with the same value after it, so the pose holds over the
     new material and the move over the old clips keeps its timing. Piecewise translations: a pair at every boundary. (d) A looping prop is
     left whole. Never `{kf: []}`. Boundary keys are dropped again when they change nothing (the neighbours are hold or linear and equal). */
  function riderKeysProp(p, m, o) {
    o = o || {};
    if (!p || !Array.isArray(p.kf) || !p.kf.length) return;
    if (p.loopMode && p.loopMode !== 'none' && p.kf.length >= 2) return;
    const orig = p.kf.slice().sort((x, y) => x.t - y.t), first = orig[0].t, last = orig[orig.length - 1].t, P = m.pieces;
    const seams = [];
    P.forEach((pc, j) => {
      if (pc.k === 0) {                                           // a collapsed span [a, b)
        if (!(first < pc.hi - 1e-9 && last > pc.lo + 1e-9)) return;
        const d = S.divideSegment({ kf: orig, loopMode: p.loopMode }, pc.lo, pc.hi);
        if (!o.fromCut) seams.push({ t: pc.lo, at: pc.i0, s: d.a, side: 'head' });   // fromCut: the item STARTS inside the cut and lands at its edge, so nothing before it plays
        seams.push({ t: pc.hi, at: pc.i0 + SEAMNUDGE, s: d.b, side: 'tail' });
      }
    });
    m.holes.forEach(B => {
      const left = P.find(pc => Math.abs(pc.hi - B) < 1e-9), right = P.find(pc => Math.abs(pc.lo - B) < 1e-9);
      if (!left || !right || left.k === 0 || right.k === 0) return;
      if (!(first < B - 1e-9 && last > B + 1e-9)) return;
      const s = S.seamKey({ kf: orig }, B);
      seams.push({ t: B, at: m.img(left, B), s: s, side: 'head' }, { t: B, at: right.i0, s: s, side: 'tail' });
    });
    if (m.translation) m.splits.forEach(B => {
      if (m.holes.some(h => Math.abs(h - B) < 1e-9)) return;
      const left = P.find(pc => Math.abs(pc.hi - B) < 1e-9), right = P.find(pc => Math.abs(pc.lo - B) < 1e-9);
      if (!left || !right || Math.abs(m.img(left, B) - right.i0) < 1e-9) return;
      if (!(first < B - 1e-9 && last > B + 1e-9)) return;
      const s = S.seamKey({ kf: orig }, B);
      seams.push({ t: B, at: m.img(left, B), s: s, side: 'head' }, { t: B, at: right.i0, s: s, side: 'tail' });
    });
    const out = [];
    orig.forEach(k => {
      const pc = m.find(k.t, false);
      if (pc.k === 0 && k.t > pc.lo + (o.fromCut ? -1e-9 : 1e-9)) return;   // strictly inside a cut: dropped (fromCut: a key AT its start is cut away too)
      k.t = pc.i0 + (k.t - pc.lo) * (pc.k === 0 ? 0 : pc.k);
      out.push({ key: k, orig: true });
    });
    seams.forEach(sm => {
      const k = Object.assign({}, sm.s.key); k.t = sm.at;
      if (sm.side === 'tail') { k.v = Array.isArray(k.v) ? clone(k.v) : k.v; if (sm.s.nextBez && sm.s.next && !sm.s.next.__dropped) sm.s.next.bez = sm.s.nextBez.slice(); }
      else if (Array.isArray(k.v)) k.v = clone(k.v);
      out.push({ key: k, orig: false, side: sm.side });
    });
    out.sort((x, y) => x.key.t - y.key.t);
    // two keys on one frame: the later ORIGINAL survives (two originals); a boundary pair keeps both, the later nudged by a millisecond
    const res = [];
    out.forEach(e => {
      const prev = res[res.length - 1];
      if (prev && Math.abs(prev.key.t - e.key.t) < 1e-6) {
        if (prev.orig && e.orig) { res[res.length - 1] = e; return; }
        if (!prev.orig && !e.orig && JSON.stringify(prev.key.v) === JSON.stringify(e.key.v) && prev.side === 'head' && e.side === 'tail' && Math.abs(e.key.t - prev.key.t) < 1e-9 && e.nudged !== true) { e.key.t = prev.key.t + SEAMNUDGE; res.push(e); return; }
        if (!e.orig || !prev.orig) { e.key.t = Math.max(e.key.t, prev.key.t + SEAMNUDGE); }
      }
      res.push(e);
    });
    // a boundary key that changes nothing goes (never an original)
    const keep = res.filter((e, i) => {
      if (e.orig) return true;
      const a = res[i - 1], b = res[i + 1]; if (!a || !b) return true;
      const same = JSON.stringify(a.key.v) === JSON.stringify(e.key.v) && JSON.stringify(b.key.v) === JSON.stringify(e.key.v);
      const flat = x => !x.key.e || x.key.e === 'linear' || x.key.e === 'hold';
      return !(same && flat(e) && flat(b));
    });
    p.kf = keep.map(e => e.key);
  }
  S.riderKeys = function (what, m, o) {
    const props = Array.isArray(what) ? what : (FM.timedLists ? FM.timedLists(what, { cues: false }) : FM.animatedProps(what));
    props.forEach(p => riderKeysProp(p, m, o));
  };
  S._riderKeysProp = riderKeysProp;

  /* ═══ THE CAPTION RIDER (§3.5): one pure computation per track, applied as one write ═══
     Both ends of every visible cue go through the map (a cue that straddles a hole splits there, its halves carry no animFrom / animTo);
     a visible cue under MIN_CUE after the map is dropped and counted; hidden cues move rigidly with the edge they hide past; the window
     goes through the map with its ends snapped to the main track's (so Append and Delete of the last clip reach it); the track's own keys
     and each cue's effect keys go through the same map (the cue effects move by their own cue's displacement, never twice). */
  function captionRider(R, track, m) {
    const MC = minCue(), st0 = +track.start || 0, d0 = +track.duration || 0, cues = FM.captions.cues(track).map(clone);
    const mainStart = R.main.length ? R.main[0].start : 0;
    const s0 = Math.abs(st0 - mainStart) <= R.eps ? mainStart : st0;
    let e0 = st0 + d0; if (Math.abs(e0 - R.trackEnd) <= R.eps) e0 = R.trackEnd;
    let nS, nE;
    if (m.translation) {
      let lo = Infinity, hi = -Infinity;
      m.pieces.forEach(pc => { const a = Math.max(pc.lo, s0), b = Math.min(pc.hi, e0); if (b > a + 1e-9) { lo = Math.min(lo, pc.i0 + (a - pc.lo) * pc.k); hi = Math.max(hi, pc.i0 + (b - pc.lo) * pc.k); } });
      nS = isFinite(lo) ? lo : m.R(s0); nE = isFinite(hi) ? hi : m.L(e0);
    } else { nS = m.R(s0); nE = m.L(e0); }
    nS = Math.max(0, nS); nE = Math.max(nS + MC, nE);
    const parts = [], hiddenHead = nS - st0, hiddenTail = nE - (st0 + d0);
    let dropped = 0;
    cues.forEach(c => {
      const visible = c.end > 1e-9 && c.start < d0 - 1e-9;
      if (!visible) {                                               // hidden: rigid with the edge it hides past
        const off = c.start >= d0 - 1e-9 ? hiddenTail : hiddenHead;
        c.start += off; c.end += off; c.__abs = true; c.__hidden = true; parts.push(c); return;
      }
      const as = st0 + c.start, ae = st0 + c.end, cuts = m.splits.filter(B => B > as + 1e-6 && B < ae - 1e-6).sort((a, b) => a - b);
      const bounds = [as].concat(cuts, [ae]);
      for (let i = 0; i + 1 < bounds.length; i++) {
        const ps = bounds[i], pe = bounds[i + 1], part = clone(c);
        const ns = m.R(ps), ne = m.translation ? ns + (pe - ps) : m.L(pe);
        if (cuts.length) { delete part.animFrom; delete part.animTo; }
        if (ne - ns < MC - 1e-9) { dropped++; continue; }
        // the cue's effect keys: its own displacement (an affine for a scale piece, the Cut treatment where it spans a cut)
        const fxProps = Array.isArray(part.effects) && part.effects.length && FM.fxListAnimatedProps ? FM.fxListAnimatedProps(part.effects) : [];
        const spansCut = m.cuts.some(cu => cu[1] > ps + 1e-9 && cu[0] < pe - 1e-9);
        const inScale = m.scales.some(pc => ps >= pc.lo - 1e-9 && pe <= pc.hi + 1e-9);
        fxProps.forEach(fp => {
          if (!fp.kf) return;
          if (spansCut || inScale) { if (spansCut) riderKeysProp(fp, m); else fp.kf.forEach(k => { k.t = m.R(k.t); }); }
          else { const d = ns - ps; if (d) fp.kf.forEach(k => { k.t += d; }); }
        });
        part.start = ns; part.end = ne; part.__abs = true; parts.push(part);
      }
    });
    // a cue left before the window's start (a paste): the window grows to it, the effect clock keeps its phase (the head-extend rule)
    let nS2 = nS, extended = 0;
    parts.forEach(c => { if (c.start < nS2 - 1e-9 && !c.__hidden) nS2 = c.start; });
    if (nS2 < nS - 1e-9) { extended = nS - nS2; }
    const out = parts.map(c => {
      const o = Object.assign({}, c); const hid = c.__hidden;
      delete o.__abs; delete o.__hidden;
      // visible cues are absolute here; hidden cues were moved by the edge displacement while still LOCAL to the old start: rebase both to the new start
      if (hid) { o.start = c.start; o.end = c.end; o.start += st0 - nS2; o.end += st0 - nS2; }
      else { o.start = c.start - nS2; o.end = c.end - nS2; }
      return o;
    }).sort((a, b) => a.start - b.start);
    return { start: nS2, duration: Math.max(MC, nE - nS2), cues: out, dropped: dropped, extended: extended };
  }
  const isCaptionTrack = l => !!l && l.type === 'text' && Array.isArray(l.captions);

  /* the camera (§3.10 rule 3f/3g): its keys through the map and its window through it, skipped when its start is 0 (autoFitDuration re-spans it) */
  function cameraRider(R, cam, m, anyway) {
    const s = +cam.start || 0, d = +cam.duration || 0;
    if (s === 0) return { ask: false, window: null };
    let ns, ne;
    if (m.translation) {
      const inOne = m.pieces.find(pc => s >= pc.lo - 1e-9 && s + d <= pc.hi + 1e-9);
      if (inOne) { ns = s + (inOne.i0 - inOne.lo); ne = ns + d; }
      else {
        if (!anyway) return { ask: true, window: null };
        let lo = Infinity, hi = -Infinity;
        m.pieces.forEach(pc => { const a = Math.max(pc.lo, s), b = Math.min(pc.hi, s + d); if (b > a + 1e-9) { lo = Math.min(lo, pc.i0 + (a - pc.lo)); hi = Math.max(hi, pc.i0 + (b - pc.lo)); } });
        ns = lo; ne = hi;
      }
    } else { ns = m.R(s); ne = Math.max(ns + minCue(), m.L(s + d)); }
    return { ask: false, window: { start: ns, duration: ne - ns } };
  }

  /* ═══ riderPlan: where riderBlock stood. It validates (a camera crossing a piecewise map asks; nothing else refuses any more), counts, and
     hands back `attach(plan)`, which writes everything as part of the plan, in the same undo step. */
  function riderPlan(R, map, m, o) {
    o = o || {};
    const caps = (R.riders || []).map(id => map.get(id)).filter(l => isCaptionTrack(l) && !(l.sm && l.sm.stay));
    const cams = (R.fullOnly || []).map(id => map.get(id)).filter(l => l && l.type === 'camera' && !(l.sm && l.sm.stay));
    const capJobs = caps.map(t => ({ t: t, r: captionRider(R, t, m) }));
    const camJobs = [], asks = [];
    cams.forEach(cm => { const r = cameraRider(R, cm, m, R.anyway); if (r.ask) asks.push('camera'); camJobs.push({ cam: cm, r: r }); });
    const keyed = cams.some(cm => (FM.timedLists ? FM.timedLists(cm) : FM.animatedProps(cm)).some(pp => pp.kf.length));
    const dropped = capJobs.reduce((a, j) => a + j.r.dropped, 0);
    return {
      asks: asks, dropped: dropped, moves: keyed,
      attach(plan) {
        loopRider(plan, m);
        asks.forEach(a => { plan.asks = (plan.asks || []).concat([{ kind: 'camera' }]); });
        if (dropped) plan.counts.cuesDropped = (plan.counts.cuesDropped || 0) + dropped;
        if (keyed) plan.counts.camera = (plan.counts.camera || 0) + 1;
        plan.writes.push(() => {
          capJobs.forEach(j => {
            const t = j.t, r = j.r;
            S.riderKeys(t, m);
            t.captions = r.cues; t.start = r.start; t.duration = r.duration;
            if (r.extended && FM.shiftLayerFxClock) FM.shiftLayerFxClock(t, -r.extended);
          });
          camJobs.forEach(j => {
            S.riderKeys(j.cam, m);
            if (j.r.window) { j.cam.start = j.r.window.start; j.cam.duration = j.r.window.duration; }
          });
        });
      }
    };
  }
  S._riderPlan = riderPlan;
  /* the loop region (§3.6.2) rides the same map: both ends through it, or cleared (with the line) when a piecewise map splits it */
  function loopRider(plan, m) {
    const P = FM.scene.project;
    if (!(P.loopIn != null && P.loopOut != null)) return;
    const a = P.loopIn, b = P.loopOut;
    if (m.translation) {
      const pa = m.find(a, false), pb = m.find(b, true);
      if (pa !== pb) { plan.counts.loopCleared = 1; plan.writes.push(() => { P.loopIn = null; P.loopOut = null; }); return; }
    }
    const na = m.R(a), nb = Math.max(na + 0.01, m.L(b));
    plan.writes.push(() => { P.loopIn = na; P.loopOut = nb; });
  }

  /* ═══ OWNED KEYS (§3.1): a blend's owner is its upper clip and the owned keys are its opacity keys in the overlap. They move with the SEAM,
     not with their clip's footage (keys are absolute time). */
  const opacityOf = l => l && l.transform && isAnim(l.transform.opacity) ? l.transform.opacity : null;
  /* the static fallback (§12.1): the fade's keys go and the clip rests at its visible value, never `{kf: []}`. mode 'in' rests at the LAST
     owned key (a fade-in ends visible), 'out' at the FIRST (a fade-out starts visible). */
  function stripOwned(l, lo, hi, mode) {
    const op = opacityOf(l); if (!op) return false;
    const keys = op.kf.slice().sort((a, b) => a.t - b.t), own = keys.filter(k => k.t >= lo && k.t <= hi), rest = keys.filter(k => !(k.t >= lo && k.t <= hi));
    if (!own.length) return false;
    if (rest.length) op.kf = rest; else l.transform.opacity = (mode === 'in' ? own[own.length - 1] : own[0]).v;
    return true;
  }
  S._stripOwned = stripOwned;

  /* ───────────────────────────── the commands (§3.6) ───────────────────────────── */

  /* DELETE A MAIN CLIP (D5: what follows it goes too, counted, one Undo). n slides to where c started; the seam p|c becomes
     p|n with its old amount. Long items over [a, b) are cut through the delete map; a block is never cut. */
  S.planDelete = function (R, id) {
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], p = R.main[i - 1] || null, n = R.main[i + 1] || null, L = map.get(c.id);
    const plan = newPlan('Delete clip');
    let a = c.start, b = n ? n.start : c.end;
    let dt = -(b - a);
    /* blends (§3.1, §3.6 Delete row): c's blend with n goes with c. A fade-in c owns over p goes too: n lands at p.end.
       A fade p owns over c would need its keys stripped to a static value (release 2.4): refused. */
    if (p && c.seam && c.seam.kind === 'blend') {
      const own = blendOwner(p, c, map);
      if (own === L) { if (n) dt = p.end - n.start; plan.counts.fade = 1; }
      else {
        /* 2.4: p owns the fade over c. The new p|n seam keeps `amt` only if it still classifies as a blend (p above n, amt within half
           the shorter clip); otherwise n lands at p.end, p's owned keys take the static fallback and the line says so (§3.6 Delete row) */
        const pl = map.get(p.id), nl = n ? map.get(n.id) : null, amt = c.seam.amt;
        const stays = !!(nl && FM.scene.layers.indexOf(pl) < FM.scene.layers.indexOf(nl) && amt <= Math.min(+pl.duration || 0, +nl.duration || 0) / 2 + 1e-9);
        if (!stays) {
          if (n) dt = p.end - n.start;
          plan.counts.xfade = 1;
          plan.writes.push(() => { stripOwned(pl, c.start - R.eps, p.end + R.eps, 'out'); });
        }
      }
    }
    const removes = [c.id].concat(R.followers[c.id] || []);
    removes.forEach(x => { unitLayers(x, map).forEach(l => plan.removes.add(l.id)); plan.touched.add(x); });
    plan.counts.followers = (R.followers[c.id] || []).filter(x => !S.isTwinOf(map.get(x), L, R.eps)).length;
    /* (i)–(iii) long items cut through the delete map, keys refused until 2.4. The time that goes is [ca, b): when c's own
       fade-in went with it, p still shows over [a, p.end) and n lands at p.end, so what played at b now plays at p.end — the
       cut starts there and len = −dt, never b − a (a voice-over ran ahead of the picture by the fade; review finding 18) */
    const ca = ((plan.counts.fade || plan.counts.xfade) && n) ? p.end : a;
    const ml = MINLEN(), len = b - ca;
    const rd = riderPlan(R, map, tmCut(ca, b)), mcut = tmCut(ca, b);   // 2.4: cues, camera, track keys and a cut item's keys all go through this one map
    const cut = Object.keys(R.units).filter(uid => {
      const u = R.units[uid], l = map.get(uid);
      if (!l || !u.long || u.kind === 'captions' || u.kind === 'fullOnly' || u.kind === 'block' || u.kind === 'main') return false;
      if (R.tail.indexOf(uid) >= 0 || (l.sm && l.sm.stay) || l.type === 'group') return false;
      const s = +l.start || 0, e = s + (+l.duration || 0);
      return e > ca + 1e-9 && s < b - 1e-9;
    });
    for (let k = 0; k < cut.length; k++) {
      const l = map.get(cut[k]), s = +l.start || 0, e = s + (+l.duration || 0);
      /* a speed ramp is absolute-time keys like any other (keyCount leaves it out for the tail fit's sake): cutting the item would
         leave the ramp behind its footage, so it refuses with the rest until 2.4's riderKeys moves it (review finding 19) */
      const keyed = S.keyCount(l) > 0 || (FM.isAnimated && FM.isAnimated(l.speed));   // 2.4: its keys go through the delete map, once, from their original times
      const media = l.type === 'video';
      if (s >= ca - 1e-9) {                                  // (i) starts inside the deleted span
        if (e - b < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.keyless.add(l.id); addLand(plan, l.id, ca);
        plan.writes.push(() => {
          const r = media ? FM.trimClipEdge(l, 'head', b - s, srcDurOf(l)) : null;   // the source advance integrates the ORIGINAL ramp: before its keys move
          if (keyed) S.riderKeys(l, mcut, { fromCut: true });
          if (media) { l.duration = r.duration; l.trimStart = r.trimStart; FM.shiftLayerFxClock(l, r.fxShift); }
          else { l.duration = Math.max(ml, e - b); FM.shiftLayerFxClock(l, b - s); }
        });
      } else if (e <= b + 1e-9) {                             // (ii) ends inside it
        if (ca - s < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.touched.add(l.id);
        plan.writes.push(() => { if (keyed) S.riderKeys(l, mcut); l.duration = Math.max(ml, ca - s); });
      } else if (!media) {                                    // (iii) a middle cut of something with no source clock
        plan.touched.add(l.id);
        plan.writes.push(() => { if (keyed) S.riderKeys(l, mcut); l.duration = Math.max(ml, l.duration - len); });
      } else {                                                // (iii) a middle cut of a video or sound: split, then trim B
        if (ca - s < ml - SLACK || e - b < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.touched.add(l.id);
        plan.pre.push(async () => {
          const t0 = FM.time; FM.time = ca;
          try { await FM.splitLayer(l.id); } finally { FM.time = t0; }
          const B = FM.scene.layers.find(x => x !== l && x.splitOf && x.splitOf === l.splitOf && Math.abs((+x.start || 0) - ca) < 1e-6);
          if (!B) throw new Error('the cut item did not split');
          const r = FM.trimClipEdge(B, 'head', len, srcDurOf(B));
          B.duration = r.duration; B.trimStart = r.trimStart; FM.shiftLayerFxClock(B, r.fxShift);
          if (keyed) S.riderKeys(B, mcut, { fromCut: true });   // B kept the keys from the cut on (the split divided them); the cut closes up over them
          S.setFlag(B, 'stay', true); S.setFlag(l, 'stay', true);
          plan.resized.add(B.id);   // the cut made this length, not he: a whole-video piece keeps sm.tail and the fit re-seats it (§4.3)
        });
      }
      plan.resized.add(l.id);
      plan.counts.cut = (plan.counts.cut || 0) + 1;
    }
    const prevEnd = p ? p.end : null;
    const landFirst = !!(p && (isFloatJoin(R, i) || plan.counts.fade || plan.counts.xfade));
    const rp = ripple(plan, R, i + 1, dt, new Set([c.id]), prevEnd, landFirst);
    /* the new main-track end: the last clip moved by the ripple, or (c last) the clip before it, or c's start when c was alone */
    const lastClipIdx = (() => { for (let k = R.main.length - 1; k >= 0; k--) if (!R.main[k].slot && k !== i) return k; return -1; })();
    const newEnd = lastClipIdx > i ? (rp.end != null ? rp.end : R.main[lastClipIdx].end + (rp.last == null ? dt : rp.last)) : (lastClipIdx >= 0 ? R.main[lastClipIdx].end : a);
    tailMove(plan, R, newEnd, map);
    rd.attach(plan);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = n ? a : Math.max(0, newEnd);
    plan.selectNone = true;
    const nf = plan.counts.followers;
    plan.say = nf ? line('deletedWith', nf) : null;
    plan.live = nf ? null : line('deleted');
    if (plan.counts.cut) plan.say = (plan.say || line('deleted')) + ' · ' + line('keptRunsOn', plan.counts.cut);
    if (plan.counts.fade) plan.say = (plan.say || line('deleted')) + ' · ' + line('fadeWent');
    if (plan.counts.xfade) plan.say = (plan.say || line('deleted')) + ' · ' + line('crossfadeRemoved');
    plan.sayUndo = !!plan.say;
    return plan;
  };

  /* TRIM THE TAIL of a main clip to newDur (D, the Length row). Things on the part cut away slide back onto the clip (D6). */
  S.planTrimTail = function (R, id, newDur, o) {
    o = o || {};
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], n = R.main[i + 1] || null, L = map.get(c.id), ml = MINLEN();
    if (L.type === 'group') return refusePlan('trimBlock');   // a main block: its members play their own spans, the group row is not the clip (§9.1)
    const d0 = +L.duration || 0;
    if (newDur < d0 - 1e-9 && d0 < ml - SLACK) return refusePlan('alreadyShort');
    if (newDur < ml - SLACK) return refusePlan(o.key ? 'trimEdge' : 'alreadyShort');
    if (n && n.seam && n.seam.kind === 'blend') {
      if (newDur < 2 * n.seam.amt - SLACK) return refusePlan('fadesNext');
    }
    /* the blend with the clip BEFORE counts too (§3.1: "a trim of either clip stops at newDuration ≥ 2·amt"): its seam does
       not move, but a shorter c lowers blendMax under amt and the crossfade would read as a red overlap */
    if (i > 0 && c.seam && c.seam.kind === 'blend' && newDur < 2 * c.seam.amt - SLACK) return refusePlan('fadesBefore');
    const r = FM.trimClipEdge(L, 'tail', newDur - d0, srcDurOf(L));
    if (o.typed && Math.abs(r.duration - newDur) > 1 / fps()) return refusePlan(newDur > d0 ? 'shortSource' : 'nothingMore');
    const dt = r.duration - d0;
    if (Math.abs(dt) < 1e-9) return refusePlan(newDur > d0 ? 'shortSource' : 'nothingMore');
    const rd = riderPlan(R, map, tmShift(c.start + d0, dt));
    const plan = newPlan('Trim clip'); plan.touched.add(c.id);
    const twins = twinsOf(R, c, map), twinIds = new Set(twins.map(t => t.id));
    plan.writes.push(() => {
      [L].concat(twins).forEach(x => { x.duration = r.duration; if (x.type === 'video') x.trimStart = r.trimStart; });
    });
    /* 2.4 OWNED KEYS (§3.1): when c owns the blend with n (it fades out over n), its fade keys move with the SEAM: the Insert map at n.start
       for dt > 0, the Delete map over [n.start + dt, n.start) for dt < 0, so the fade still ends at c's new end over the same amt */
    if (n && n.seam && n.seam.kind === 'blend' && blendOwner(c, n, map) === L) plan.writes.push(() => { const op = opacityOf(L); if (op) riderKeysProp(op, tmShift(n.start - R.eps, dt)); });
    twins.forEach(t => plan.touched.add(t.id));
    const newEnd = c.start + r.duration;
    (R.followers[c.id] || []).forEach(fid => {
      if (twinIds.has(fid)) return;
      const f = map.get(fid), u = R.units[fid]; if (!f) return;
      const fs = +f.start || 0, fd = +f.duration || 0;
      if (dt < 0 && fs >= newEnd - R.eps) {                       // D6: its first frame is cut away — back onto the clip
        const s2 = Math.max(c.start, newEnd - fd);
        addLand(plan, fid, s2);
        if (u && u.kind === 'effect' && fs + fd <= c.end + 1e-9) plan.writes.push(() => { f.duration = Math.max(ml, Math.min(fd, newEnd - s2)); });
      } else if (dt < 0 && u && u.kind === 'effect' && fs + fd <= c.end + 1e-9 && fs + fd > newEnd + 1e-9) {
        plan.touched.add(fid); plan.writes.push(() => { f.duration = Math.max(ml, newEnd - fs); });   // §4.3: stays inside its clip
      }
    });
    const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);
    tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);   // c last: its start + the new duration, bit for bit
    rd.attach(plan);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.live = line('trimmed', S.itemWord(L, R));
    plan.pulse = [c.id];
    return plan;
  };

  /* TRIM THE HEAD of a main clip by h (A; + cuts in, − extends back). The clip keeps its slot: its start never moves, its
     footage does (keys −L, effect clock +L), and things on it stay on the same footage frame, clamped at its start. */
  S.planTrimHead = function (R, id, h, o) {
    o = o || {};
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], p = R.main[i - 1] || null, L = map.get(c.id), ml = MINLEN();
    if (L.type === 'group') return refusePlan('trimBlock');   // as the tail trim: a main block refuses Trim with the block line (§9.1)
    const d0 = +L.duration || 0;
    if (h > 0 && d0 < ml - SLACK) return refusePlan('alreadyShort');
    if (d0 - h < ml - SLACK) return refusePlan(o.key ? 'trimEdge' : 'alreadyShort');
    if (p && c.seam && c.seam.kind === 'blend') {
      if (d0 - h < 2 * c.seam.amt - SLACK) return refusePlan('fadesBefore');
    }
    /* …and the blend with the clip AFTER (§3.1, either clip): n slides back by the trim and keeps its overlap, so a c shorter
       than 2·amt would turn the crossfade into a red overlap */
    const nx = R.main[i + 1] || null;
    if (nx && nx.seam && nx.seam.kind === 'blend' && d0 - h < 2 * nx.seam.amt - SLACK) return refusePlan('fadesNext');
    const r = FM.trimClipEdge(L, 'head', h, srcDurOf(L));
    const Lnd = r.landed;
    if (o.typed && Math.abs(Lnd - h) > 1 / fps()) return refusePlan(h < 0 ? 'videoStart' : 'nothingMore');
    if (Math.abs(Lnd) < 1e-9) return refusePlan(h < 0 ? 'videoStart' : 'nothingMore');
    const rd = riderPlan(R, map, Lnd > 0 ? tmCut(c.start, c.start + Lnd) : tmShift(c.start, -Lnd));
    const plan = newPlan('Trim clip'); plan.touched.add(c.id);
    const twins = twinsOf(R, c, map), twinIds = new Set(twins.map(t => t.id));
    /* 2.4 OWNED KEYS: when c owns the blend with p (it fades in over p) its fade keys (t <= p.end + eps) stay with the SEAM: exempt from the
       -Lnd the footage keys take, so the fade stays over the overlap */
    const ownedHead = (p && c.seam && c.seam.kind === 'blend' && blendOwner(p, c, map) === L && opacityOf(L)) ? opacityOf(L).kf.filter(k => k.t <= p.end + R.eps) : [];
    plan.writes.push(() => {
      [L].concat(twins).forEach(x => {
        x.duration = r.duration; if (x.type === 'video') x.trimStart = r.trimStart;
        FM.shiftLayerFxClock(x, r.fxShift); S.shiftKeys(x, -Lnd);
      });
      ownedHead.forEach(k => { k.t += Lnd; });
    });
    twins.forEach(t => plan.touched.add(t.id));
    const newEnd = c.start + r.duration;
    (R.followers[c.id] || []).forEach(fid => {
      if (twinIds.has(fid)) return;
      const f = map.get(fid), u = R.units[fid]; if (!f) return;
      const fs = +f.start || 0, fd = +f.duration || 0;
      const s2 = Math.max(c.start, fs - Lnd);
      addLand(plan, fid, s2);
      if (u && u.kind === 'effect' && fs + fd <= c.end + 1e-9 && s2 + fd > newEnd + 1e-9) plan.writes.push(() => { f.duration = Math.max(ml, newEnd - s2); });
    });
    const rp = ripple(plan, R, i + 1, -Lnd, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);
    tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);   // c last: its start never moves, so its end is start + the new duration
    rd.attach(plan);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = c.start;
    plan.live = line('trimmed', S.itemWord(L, R));
    plan.pulse = [c.id];
    return plan;
  };

  /* SPLIT at the playhead (✂, S). Not arranging: nothing else moves, so it works with a friend in (the lease is checked).
     Full's own split guard is not changed (§0.4 B1): MIN_LEN is enforced here. A sound twin splits at the same time. */
  S.planSplit = function (R, id, t) {
    const map = byIdMap(), L = map.get(id);
    if (!L) return refusePlan('gone');
    const u = R.units[id];
    if ((u && u.kind === 'block') || ['video', 'image', 'text', 'shape'].indexOf(L.type) < 0) return refusePlan('splitBlock');
    t = FM.snapFrame ? FM.snapFrame(t) : t;
    const s = +L.start || 0, e = s + (+L.duration || 0), ml = MINLEN();
    if (t < s || t >= e) return refusePlan('splitOff');
    if (t - s < ml - SLACK || e - t < ml - SLACK) return refusePlan('splitEdge');
    for (let k = 1; k < R.main.length; k++) {
      const sm = R.main[k].seam;
      if (!sm || (sm.kind !== 'blend' && sm.kind !== 'overlap')) continue;
      const lo = R.main[k].start, hi = R.main[k - 1].end;
      if (t >= lo - R.eps && t <= hi + R.eps) return refusePlan('splitFade');
    }
    const i = mainIdx(R, id);
    if (i >= 0) {
      const nb = R.main[i + 1], pb = R.main[i - 1];
      if (nb && nb.seam && nb.seam.kind === 'blend' && e - t < 2 * nb.seam.amt - SLACK) return refusePlan('splitFade');
      if (pb && R.main[i].seam && R.main[i].seam.kind === 'blend' && t - s < 2 * R.main[i].seam.amt - SLACK) return refusePlan('splitFade');
    }
    const plan = newPlan('Split'); plan.arranges = false; plan.adopts = false;
    const twins = i >= 0 ? twinsOf(R, R.main[i], map) : [];
    plan.touched.add(id); twins.forEach(x => plan.touched.add(x.id));
    plan.pre.push(async () => {
      const t0 = FM.time;
      const halves = [];
      for (const x of [L].concat(twins)) {
        FM.time = t;
        try { await FM.splitLayer(x.id); } finally { FM.time = t0; }
        const B = FM.scene.layers.find(y => y !== x && y.splitOf && y.splitOf === x.splitOf && Math.abs((+y.start || 0) - t) < 1e-6);
        if (!B) throw new Error('split did not happen');
        halves.push(B);
        if (x.sm && x.sm.tail) S.setFlag(x, 'tail', false);   // only the later piece can end with the video (§4.5)
      }
      const B0 = halves[0];
      halves.slice(1).forEach(Bt => { if (Bt.karaokeOf === L.id) Bt.karaokeOf = B0.id; });
      plan.selectId = B0.id;
    });
    plan.live = line('split');
    return plan;
  };

  /* CLOSE A GAP or FIX AN OVERLAP: tap its chip. Everything from that clip on moves by the gap, landing the seam shut. */
  S.planSeam = function (R, entryId) {
    const map = byIdMap(), j = R.main.findIndex(e => e.id === entryId);
    if (j < 0) return refusePlan('gone');
    const e = R.main[j], sm = e.seam;
    if (!sm || (sm.kind !== 'gap' && sm.kind !== 'overlap') || sm.covered) return refusePlan('noSeam');
    const dt = sm.kind === 'gap' ? -sm.amt : sm.amt;
    const prevEnd = j > 0 ? R.main[j - 1].end : 0;
    const rd = riderPlan(R, map, sm.kind === 'gap' ? tmCut(prevEnd, e.start) : tmShift(e.start, dt));
    const plan = newPlan(sm.kind === 'gap' ? 'Close gap' : 'Fix overlap');
    const rp = ripple(plan, R, j, dt, new Set(), prevEnd, true);
    tailMove(plan, R, rp.end != null ? rp.end : R.trackEnd + (rp.last == null ? dt : rp.last), map);
    rd.attach(plan);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    const t = FM.time || 0, lo = Math.min(prevEnd, e.start), hi = Math.max(prevEnd, e.start);
    if (t > lo && t < hi) plan.time = prevEnd;
    plan.live = line(sm.kind === 'gap' ? 'gapClosed' : 'overlapFixed');
    return plan;
  };

  /* DUPLICATE a main clip: the copy lands right after it on the clip row, everything after moves along. Things on the
     clip are not copied (as the phone editors do); its sound twin is. */
  S.planDuplicate = function (R, id) {
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], p = R.main[i - 1] || null, n = R.main[i + 1] || null, L = map.get(c.id);
    if (L.type === 'group') return refusePlan('splitBlock');
    const len = +L.duration || 0, target = (+L.start || 0) + len;
    const rd = riderPlan(R, map, tmShift(target, len));
    const plan = newPlan('Duplicate clip'); plan.touched.add(c.id);
    /* 2.4 OWNED KEYS (§3.6 Duplicate row): when c owns a blend its fade keys are stripped (the static fallback) from the COPY for a fade-in or from
       the ORIGINAL for a fade-out, so the fade stays only at the outer seam and c|copy is a clean join */
    const fadeInOwned = !!(p && c.seam && c.seam.kind === 'blend' && blendOwner(p, c, map) === L), fadeOutOwned = !!(n && n.seam && n.seam.kind === 'blend' && blendOwner(c, n, map) === L);
    if (fadeOutOwned) plan.writes.push(() => { stripOwned(L, n.start - R.eps, c.end + R.eps, 'out'); });
    const twins = twinsOf(R, c, map);
    plan.pre.push(async () => {
      const dupId = await FM.duplicateLayer(L.id, false, { noSave: true });
      const dup = dupId && FM.layerById(FM.scene, dupId);
      if (!dup) throw new Error('duplicate refused');
      plan.mints = true; plan.copies.push([L.id, dupId]);
      S.setFlag(dup, 'main', true);                         // put back after onCopy stripped it: the one route that does (§12.2)
      const d = target - (+dup.start || 0); dup.start = target; S.shiftKeys(dup, d);
      if (fadeInOwned) stripOwned(dup, c.start - R.eps + d, p.end + R.eps + d, 'in');
      for (const t of twins) {
        const tid = await FM.duplicateLayer(t.id, true, { noSave: true });
        const td = tid && FM.layerById(FM.scene, tid);
        if (!td) continue;
        plan.copies.push([t.id, tid]);
        const dd = target - (+td.start || 0); td.start = target; S.shiftKeys(td, dd);
        if (td.karaokeOf === L.id) td.karaokeOf = dupId;
      }
      plan.selectId = dupId;
    });
    const rp = ripple(plan, R, i + 1, len, new Set(), target + len, false);
    tailMove(plan, R, rp.end != null ? rp.end : target + len, map);   // c last: the copy's end, start target + its duration
    rd.attach(plan);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = target;
    plan.live = line('duplicated');
    return plan;
  };

  /* ───────────────────────────── applying a plan ───────────────────────────── */
  function removeLayers(ids) {
    ids.forEach(id => { try { if (FM.cancelGesturesOn) FM.cancelGesturesOn(id); } catch (e) {} try { if (FM.teardownLayerPlayback) FM.teardownLayerPlayback(id); } catch (e) {} });
    FM.scene.layers = FM.scene.layers.filter(l => !ids.has(l.id));
    if (FM.restartAudioIfPlaying) FM.restartAudioIfPlaying();
  }
  S._applyPlan = function (plan) { return applyPlan(plan); };   // suite seam (T2b): a plan applied to a scene on its own
  async function applyPlan(plan) {
    for (const op of plan.pre) await op(plan);
    const map = byIdMap();
    plan.writes.forEach(w => w(map));
    const done = new Set();
    new Set([...plan.moves.keys(), ...plan.lands.keys()]).forEach(id => {
      if (plan.removes.has(id)) return;
      const head = map.get(id); if (!head) return;
      const land = plan.lands.has(id) ? plan.lands.get(id) : null;
      const d = land != null ? land - (+head.start || 0) : plan.moves.get(id);
      if (!d && land == null) return;
      unitLayers(id, map).forEach(l => {
        if (done.has(l.id)) return; done.add(l.id);
        if (l === head && land != null) l.start = land; else l.start = (+l.start || 0) + d;
        if (d && !plan.keyless.has(l.id)) S.shiftKeys(l, d);
      });
    });
    if (plan.removes.size) removeLayers(plan.removes);
    plan.post.forEach(f => f(map));
  }

  /* ═══ beginEdit / restorePreEdit (§3.7). A JSON copy of the document, then mute; a refusal after apply puts it back. */
  function beginEdit() {
    const pre = JSON.stringify({ project: FM.scene.project, layers: FM.scene.layers }, FM.jsonReplacer);
    FM.history.mute();
    return pre;
  }
  function restorePreEdit(pre) {
    const s = JSON.parse(pre), was = FM.scene.selectedId;
    FM.scene.project = s.project; FM.scene.layers = s.layers;
    if (FM.history._afterExternalChange) FM.history._afterExternalChange(was, { pause: false });
    FM.refreshAll();
    if (FM.storage && FM.storage.autosave) FM.storage.autosave();
  }

  /* ═══ THE GATES (§3.7, §10.2). D14, first half: looks, text, captions and sound work with a friend in; anything that
     moves clips waits while someone else who can edit is in the session (on a guest, always; on a linked copy, too). */
  S.roReason = function () {
    const C = FM.collab;
    if (!C || !C.readOnly || !C.readOnly()) return '';
    const r = C.myRole ? C.myRole() : '';
    return r === 'viewer' ? 'view' : r === 'commenter' ? 'comment' : 'outbox';
  };
  S.arrangeGate = function () {
    const C = FM.collab;
    if (!C || !C.othersCanEdit || !C.othersCanEdit()) return '';
    const s = C.session;
    if (!s || !C.active) return 'offline';                 // a linked copy with no session yet
    if (s.online === false) return 'offline';
    return 'live';
  };
  S.newerSchema = function () { const P = FM.scene && FM.scene.project; return !!(P && P.sm && typeof P.sm.v === 'number' && P.sm.v > FM.SM_V); };
  S.blockers = function (plan) {
    const PZ = FM.collab && FM.collab.presence;
    if (!PZ || !PZ.heldByOther || !(FM.collab.active)) return null;
    const ids = Array.from(plan.touched);
    for (let k = 0; k < ids.length; k++) { const h = PZ.heldByOther(ids[k]); if (h) return { id: ids[k], name: (PZ.holderName && PZ.holderName(ids[k])) || '' }; }
    return null;
  };
  function lockedOf(plan, map) {
    const out = [];
    plan.touched.forEach(id => { if (unitLayers(id, map).some(l => l.locked)) out.push(id); });
    return out;
  }

  /* ═══ WHERE SIMPLE SPEAKS (§3.11, §3.12): every refusal has a line; buttons only where there is something to do. */
  function lockedLine(ids, R, map) {
    if (ids.length > 1) return R && ids.every(id => R.isMain(id)) ? line('lockedClips', ids.length) : line('lockedItems', ids.length);
    const id = ids[0], u = R && R.units[id], l = map.get(id);
    if (R && R.isMain(id)) return line('lockedClip');
    if (u && u.kind === 'audio') return u.long ? line('lockedMusic') : line('lockedSound');
    if (u && (u.kind === 'text' || u.kind === 'captions')) return line('lockedText');
    if (u && u.kind === 'block') return line('lockedBlock');
    return l ? line('lockedClip') : line('lockedItems', 1);
  }
  /* ═══ 2.6: THE OWNER'S TWO WAYS THROUGH THE GATE (§3.7, §3.11). Who is holding it: { here: [{ mid, name }], away: [{ rid, name }] }, read from the session's
     member table and the room's remembered editors; nothing is written. */
  S.liveInfo = function () {
    const C = FM.collab, s = C && C.session, H = s && s.host;
    const here = (s && s.isOwner && H && H.members) ? Object.keys(H.members).filter(m => m !== H.ownerMid && H.members[m] && H.members[m].role === 'editor').map(m => ({ mid: m, name: H.members[m].name || '' })) : [];
    const away = (s && s.isOwner && C.ui && C.ui.offlineEditors) ? C.ui.offlineEditors() : [];
    return { here: here, away: away };
  };
  /* Make Sam a Viewer. Asks first when Sam is in the middle of something (typing, dragging, animating, holding a lease): the host changes the role before
     the guest hears it, so Sam's unsent change would be undone. One path with the People menu (U.setMemberRole). */
  S.makeViewer = async function (who) {
    const C = FM.collab, U = C && C.ui, PZ = C && C.presence;
    if (!U || !U.setMemberRole || !who) return false;
    const name = S.nameWord(who.name || ''), busy = PZ && PZ.busyWith ? PZ.busyWith(who.mid) : null;
    if (busy && FM.ask) {
      const yes = await FM.ask({ title: name + ' is ' + (busy === 'editing' ? 'editing' : busy) + ' · make ' + name + ' a Viewer anyway?', message: name + '’s unsent change will be undone.', ok: 'Make Viewer', cancel: 'Not now' });
      if (!yes) return false;
    }
    if (!U.setMemberRole(who.mid, 'viewer')) return false;
    S.say(line('madeViewer', name));
    return true;
  };
  /* Arrange anyway: one confirm, then the remembered editors who are offline stop counting for THIS session; one who reconnects counts again. */
  S.arrangeAnyway = async function (away) {
    const C = FM.collab, U = C && C.ui;
    if (!U || !U.waiveOffline || !FM.ask) return false;
    const name = away && away.length === 1 ? S.nameWord(away[0].name) : 'they';
    const yes = await FM.ask({ title: 'Arrange anyway?', message: 'Anything ' + (away && away.length === 1 ? name : 'they') + ' changed offline may land in the wrong place.', ok: 'Arrange anyway', cancel: 'Not now' });
    if (!yes) return false;
    U.waiveOffline(away ? away.map(a => a.rid) : null);
    S.say(line('waivedSaid'));
    return true;
  };
  function refuse(kind, o, R) {
    o = o || {};
    const full = { label: line('openFull'), fn: () => { if (FM.editor && FM.editor.request) FM.editor.request('full', { hop: true }); } };   // a hop: no editor memory (Phase 1 review R1)
    let text = '', buttons = [];
    switch (kind) {
      case 'locked': text = lockedLine(o.ids || [], R, byIdMap()); if (o.retry) buttons = [{ label: line('doAnyway'), fn: o.retry }]; break;
      case 'live': {
        const C = FM.collab, s = C && C.session;
        if (s && !s.isOwner) { text = line('liveGuest'); buttons = [full]; break; }
        /* 2.6 (§3.11): the owner's line says which of the two it is. Somebody who is HERE: "Sam can edit" + Options (Make Sam a Viewer · Open in Full; two
           or more: Who can edit › · Open in Full). Somebody whose connection dropped and who is still remembered: "Sam is offline" + Arrange anyway (two or more:
           Options). A role change or a waiver is never one tap: it is a menu item, or it asks. */
        const info = S.liveInfo(), here = info.here, away = info.away;
        const menu = items => at => { if (FM.contextMenu) FM.contextMenu.show(Math.min(at.left, window.innerWidth - 200), at.top - 4, items, { above: true }); };
        const whoMenu = menu([{ label: line('whoCanEdit'), action: () => { if (C.ui && C.ui.openPeople) C.ui.openPeople(); } }, { label: line('openFull'), action: full.fn }]);
        if (here.length) {
          text = here.length === 1 ? line('liveOwner1', S.nameWord(here[0].name)) : line('liveOwnerN', Math.max(2, here.length));
          buttons = [{ label: line('optionsMore'), fn: here.length === 1 ? menu([{ label: line('makeViewer', here[0].name ? S.nameWord(here[0].name) : ''), action: () => S.makeViewer(here[0]) }, { label: line('openFull'), action: full.fn }]) : whoMenu }];
        } else if (away.length) {
          text = away.length === 1 ? line('awayOwner1', S.nameWord(away[0].name)) : line('awayOwnerN', Math.max(2, away.length));
          buttons = away.length === 1 ? [{ label: line('arrangeAnyway'), fn: () => S.arrangeAnyway(away) }] : [{ label: line('optionsMore'), fn: menu([{ label: line('arrangeAnyway'), action: () => S.arrangeAnyway(away) }, { label: line('whoCanEdit'), action: () => { if (C.ui && C.ui.openPeople) C.ui.openPeople(); } }, { label: line('openFull'), action: full.fn }]) }];
        } else { text = line('liveOwnerN', 2); buttons = [full]; }
        break;
      }
      case 'offline': {
        const copy = !!(FM.collab && FM.collab.isLinkedCopy && FM.collab.isLinkedCopy());
        text = copy ? line('offlineCopy') : line('offlineOwner');
        /* 2.6: a linked copy's way out. After it the gate is false and the next arranging edit goes through (a copy whose owner closed the app, paused or never came back was gated for good). */
        if (copy && FM.collab.ui && FM.collab.ui.leaveKeep) buttons = [{ label: line((window.matchMedia && window.matchMedia('(max-width: 700px)').matches) ? 'makeMineShort' : 'makeMine'), fn: () => FM.collab.ui.leaveKeep() }];
        break;
      }
      case 'view': text = line('view'); break;
      case 'comment': text = line('comment'); break;
      case 'outbox': text = line('outbox'); break;
      case 'newer': text = line('newer'); break;
      case 'waiting': text = line('waiting'); break;
      case 'busy': text = line('busy', o.name ? S.nameWord(o.name) : '', o.id ? S.itemWord(byIdMap().get(o.id), R) : ''); break;
      case 'attached': text = line('attached', o.a, o.b); buttons = [full]; break;
      case 'slip': text = line('slip', o.via); buttons = [full]; break;
      case 'riders': text = line('ridersNext'); buttons = [full]; break;
      case 'camera': text = line('cameraNext'); buttons = [full]; break;
      case 'cutKeys': text = line('cutKeysNext', o.name); buttons = [full]; break;
      case 'fadeOwned': text = line('fadeOwned', o.a, o.b); buttons = [full]; break;
      case 'cutShort': text = line('cutShort', o.name); buttons = [full]; break;
      case 'insertFade': text = line('insertFade', o.a, o.b); break;   // 2.2: the two clip numbers (DESIGN §3.11)
      default: text = line(kind) || line('failed');
        if (kind === 'splitBlock' || kind === 'trimBlock' || kind === 'liftBlock' || kind === 'slotIntoRow' || kind === 'speedBlock' || kind === 'replaceBlock') buttons = [full];
    }
    S.say(text, { buttons: buttons, refusal: kind, ids: o.ids });
    S.lastRefusal = kind;
    return false;
  }
  /* ═══ KEEP ON THE MUSIC (§4.1): lyrics timed to a song. plan.musicTimed = the moved text units (no caption track, no `sm` key, nothing linked)
     that start within one frame of a benchmark, or belong to a run of three or more back-to-back texts (each starting within 0.1 s of the
     previous one's end) that crosses a cut, AND have a stay-put non-twin sound under them. The line says "Moved 6 texts with their clips" and
     offers Keep on the music, which undoes the step and runs the same command again with those units given sm.stay, as one step. An ordinary
     title over a music bed never matches. */
  function musicTimedOf(plan, R, map) {
    const moved = id => (plan.moves.has(id) && Math.abs(plan.moves.get(id)) > 1e-9) || plan.lands.has(id);
    const texts = Object.keys(R.units).map(id => map.get(id)).filter(l => l && l.type === 'text' && !isCaptionTrack(l) && R.units[l.id] && moved(l.id)
      && !(l.sm && Object.keys(l.sm).length) && !l.parent && !(l.behaviors || []).length && !FM.scene.layers.some(x => refsOf(x).some(r => r.id === l.id)));
    if (!texts.length) return [];
    const sounds = Object.keys(R.units).map(id => map.get(id)).filter(l => l && R.units[l.id].kind === 'audio' && l.sm && l.sm.stay && !(l.sm.twin) && !S.isTwinOf(l, null, R.eps));
    const under = t => sounds.some(a => (+a.start || 0) <= (+t.start || 0) + 1e-9 && (+a.start || 0) + (+a.duration || 0) > (+t.start || 0) + 1e-9);
    const marks = (FM.scene.project.markers || []).map(m => m.t), half = 1 / fps();
    const byStart = texts.slice().sort((a, b) => a.start - b.start), out = new Set();
    byStart.forEach(t => { if (under(t) && marks.some(mt => Math.abs(mt - (+t.start || 0)) <= half)) out.add(t.id); });
    // runs of three or more back-to-back texts crossing a cut (a boundary of the clip row strictly inside the run)
    const cutAt = x => R.main.some(e => !e.slot && e.start > x.a + R.eps && e.start < x.b - R.eps);
    const all = Object.keys(R.units).map(id => map.get(id)).filter(l => l && l.type === 'text' && !isCaptionTrack(l) && !(l.sm && Object.keys(l.sm).length)).sort((a, b) => a.start - b.start);
    let run = [];
    const flush = () => { if (run.length >= 3 && cutAt({ a: run[0].start, b: run[run.length - 1].start + run[run.length - 1].duration }) && run.every(t => under(t))) run.forEach(t => { if (texts.indexOf(t) >= 0) out.add(t.id); }); run = []; };
    all.forEach(t => { const last = run[run.length - 1]; if (last && Math.abs((+t.start || 0) - ((+last.start || 0) + (+last.duration || 0))) <= 0.1) run.push(t); else { flush(); run = [t]; } });
    flush();
    return Array.from(out);
  }
  S._musicTimedOf = musicTimedOf;
  /* THE PRE-FLIGHT ASK (§3.10 rule 4): a link whose two ends the plan moves by different amounts, or a camera window a piecewise map cannot keep, says so ONCE,
     before anything is written: *"1 parent will slip"* + Do it anyway (the same command, one step, Undo reverses it) + Why? › (the whole sentence, never cut). */
  function ask(asks, retry, R) {
    const kinds = asks.map(a => a.kind === 'camera' ? 'camera' : a.via);
    const uniq = kinds.filter((v, i) => kinds.indexOf(v) === i);
    const text = uniq.map(v => line('slip', v)).join(' · ');
    const why = uniq.map(v => line('slipWhy', v)).join(' ');
    S.say(text, { buttons: [{ label: line('doAnyway'), fn: retry }, { label: line('whyMore'), fn: () => S.say(why, { buttons: [{ label: line('openFull'), fn: () => { if (FM.editor && FM.editor.request) FM.editor.request('full', { hop: true }); } }] }) }], refusal: 'ask' });
    S.lastRefusal = 'ask';
    return false;
  }
  S.nameWord = function (name) { const n = String(name || '').trim(); return n.length > 10 ? n.slice(0, 10) + '…' : (n || line('someone')); };
  S._refuse = refuse;

  /* ═══ THE RUNNER (§3.7): one edit = one undo step = one collab transaction. Single flight, then a FIFO of four that
     stores each tap's intent; never coalesced. */
  S.running = false;
  S.queue = [];
  S.reading = 0;   // adds still reading their picked files (before the runner): the editor switch waits on it (busyReason)
  const seq = () => (FM.history && FM.history._commitSeq) ? FM.history._commitSeq() : 0;
  S.queueStep = function (kind) {
    if (S.queue.length >= 4) { S.say(line('wait')); return false; }
    /* stamped with the commits it will legitimately wait behind: the running command's, plus one per edit already queued
       ahead of it, so [Split, Delete, ⌘Z] undoes the Delete (DESIGN §3.7) and only an unrelated commit makes it stale */
    S.queue.push({ kind: kind, seq: seq() + S.queue.filter(q => q.kind === 'edit').length });
    return false;
  };
  S.drain = function () {
    while (S.queue.length && !S.running) {
      /* re-armed, never dropped: a queue left waiting on a muted history held nothing open and nothing came back for it, and the
         switch now waits on the queue (busyReason), so a stranded entry would hold it shut (review finding 10) */
      if (FM.history && FM.history.isMuted && FM.history.isMuted()) { setTimeout(S.drain, 30); return; }
      if (FM.jobDepth && FM.jobDepth() > 0) { setTimeout(S.drain, 30); return; }
      const e = S.queue.shift();
      if (e.kind !== 'edit' && seq() - e.seq > 1) { S.say(line('skipped')); continue; }   // an edit is an intent, re-planned now (§3.7)
      if (e.kind === 'edit') { S.edit.apply(null, e.args); return; }
      if (e.kind === 'undo') FM.history.undo(); else if (e.kind === 'redo') FM.history.redo();
    }
  };
  S.edit = async function (label, makePlan, opts) {
    opts = opts || {};
    if (S.running) {
      if (S.queue.length < 4) S.queue.push({ kind: 'edit', args: [label, makePlan, opts], seq: seq() });
      else S.say(line('wait'));
      return false;
    }
    S.running = true; document.body.classList.add('sm-running');
    let muted = false;
    try {
      const ro = S.roReason(); if (ro) return refuse(ro);
      if (S.newerSchema()) return refuse('newer');
      const R = S.classify(FM.scene);                                    // uncached (§2.5)
      R.anyway = !!opts.anyway;                                          // 2.4: a piecewise map's camera window is a hull only after Do it anyway
      const plan = makePlan(R);
      if (!plan) return false;
      if (plan.refuse) return refuse(plan.refuse, plan.refuseOpts, R);
      if (opts.stayIds && opts.stayIds.length) {   // Keep on the music: the same command again, those units left where they are and pinned
        const stayMap = byIdMap();
        opts.stayIds.forEach(id => { plan.moves.delete(id); plan.lands.delete(id); const l = stayMap.get(id); if (l) plan.writes.push(() => { S.setFlag(l, 'stay', true); }); });
      } else if (plan.arranges && (plan.moves.size || plan.lands.size)) { plan.musicTimed = musicTimedOf(plan, R, byIdMap()); plan.rerun = () => S.edit(label, makePlan, Object.assign({}, opts, { stayIds: plan.musicTimed })); }
      if (plan.asks && plan.asks.length && !opts.anyway) return ask(plan.asks, () => S.edit(label, makePlan, Object.assign({}, opts, { anyway: true })), R);
      const gated = !!(plan.arranges || (plan.adopts && !R.adopted));
      if (gated) { const g = S.arrangeGate(); if (g) return refuse(g, {}, R); }
      if (gated && R.anomalies.some(a => a.kind === 'undecided')) return refuse('waiting', {}, R);
      const map = byIdMap();
      const lk = lockedOf(plan, map);
      if (lk.length && !opts.unlock) return refuse('locked', { ids: lk, retry: () => S.edit(label, makePlan, Object.assign({}, opts, { unlock: true })) }, R);
      const b = S.blockers(plan); if (b) return refuse('busy', b, R);
      if (FM.flushPendingCommit) FM.flushPendingCommit();
      if (FM.textEdit && FM.textEdit.flush) FM.textEdit.flush();
      if (FM.playing && FM.pause) FM.pause();
      const pre = beginEdit(); muted = true;
      const sel0 = FM.scene.selectedId, sels0 = (FM.scene.selectedIds || []).slice();
      /* D7's Do it anyway: the ids it unlocked are held HERE, never as a mark on the layer — FM.cloneLayer drops every '_' key,
         so a split's second half, a cut item's piece and a copy all came out unlocked (review finding 14) */
      const ids0 = new Set(FM.scene.layers.map(l => l.id)), relock = new Set();
      let ok = false, notes = [], adoptPaths = null;
      const trPre = S.trPairs();
      try {
        if (opts.unlock) lk.forEach(id => unitLayers(id, map).forEach(l => { if (l.locked) { l.locked = false; relock.add(l.id); } }));
        if (!R.adopted && plan.adopts) adoptPaths = S.adopt(R);
        if (gated) S.pinStrays(R);
        await applyPlan(plan);
        if (!plan.keepsTransitions) { const dropped = S.dropStaleTransitions(trPre); if (dropped) { plan.counts.trDropped = dropped; } }
        const R2 = S.classify(FM.scene);
        if (gated) { notes = S.fitTails(R2, plan); pinTailsAfter(R2); refitTransparentGroups(R2); }
        markCuts(plan.touched);
        if (relock.size) relockAfter(relock, ids0, plan);
        ok = true;
      } catch (e) {
        if (FM.reportError) { try { FM.reportError('Simple edit failed: ' + label, e); } catch (x) {} }
      } finally { FM.history.unmute(); muted = false; }
      if (!ok) { restorePreEdit(pre); return refuse('failed'); }   // the document from before the unlock: every lock as it was
      if (plan.selectNone) { FM.scene.selectedId = null; FM.scene.selectedIds = []; }
      else if (plan.selectId && FM.layerById(FM.scene, plan.selectId)) { FM.scene.selectedId = plan.selectId; FM.scene.selectedIds = [plan.selectId]; }
      else if (plan.keepSel && sel0 && FM.layerById(FM.scene, sel0)) { FM.scene.selectedId = sel0; FM.scene.selectedIds = sels0.filter(x => FM.layerById(FM.scene, x)); }   // a tray action on 2+ keeps them (§8.5b)
      else if (sel0 && FM.layerById(FM.scene, sel0)) { FM.scene.selectedId = sel0; FM.scene.selectedIds = [sel0]; }
      FM.refreshAll();
      if (plan.time != null && !FM.playing) { const P = FM.scene.project; FM.time = Math.max(0, Math.min(P.duration || 0, plan.time)); if (FM.seekVideosToTime) FM.seekVideosToTime(); if (FM.timeline && FM.timeline.updatePlayhead) FM.timeline.updatePlayhead(); if (FM.updateReadout) FM.updateReadout(); }   // S10a: the pill reads the playhead the command just moved (it kept the time of the last clip the picker laid down)
      FM.history.commit(adoptPaths ? { label: label, ed: 's', arr: gated, adopt: adoptPaths } : { label: label, ed: 's', arr: gated });   // 2.6 (§5.3): the paths adoption wrote, so a session's undo can leave them alone once anyone else has written
      /* a new media record (a duplicate's copy, an added clip, overlay or song) is written NOW, not on the 600 ms autosave: a hide flush cancels that and writes
         the document only, so the copy came back blank (queue 681). Saved after the commit, so the finished document is what
         lands — the reason for {noSave} (nothing un-rippled on disk mid-run) still holds. */
      if (plan.mints && FM.storage && FM.storage.save) FM.storage.save();
      if (FM.textEdit && FM.textEdit.resync) FM.textEdit.resync();
      if (plan.after) { try { plan.after(); } catch (e) {} }          // 2.2: e.g. Text opens for typing once its step is in
      speakDone(plan, notes);
      return true;
    } finally {
      if (muted) FM.history.unmute();
      S.running = false; document.body.classList.remove('sm-running');
      S.drain();
    }
  };
  /* D7, "one step, the lock kept": every layer Do it anyway unlocked is locked again, and so is every piece this edit made of
     one — a split half (a NEW layer of an unlocked layer's split lineage) and a duplicate's copy, as Full's duplicate keeps
     the lock. Older pieces of the same lineage that were never locked stay as they were. */
  function relockAfter(relock, ids0, plan) {
    const lin = new Set();
    FM.scene.layers.forEach(l => { if (relock.has(l.id) && l.splitOf) lin.add(l.splitOf); });
    const copyOf = new Set((plan.copies || []).filter(pr => relock.has(pr[0])).map(pr => pr[1]));
    FM.scene.layers.forEach(l => {
      if (relock.has(l.id) || copyOf.has(l.id) || (!ids0.has(l.id) && l.splitOf && lin.has(l.splitOf))) l.locked = true;
    });
  }
  /* §4.3: a unit pinned in this step whose span now ends at the new track end follows it from here on (pictures only). */
  function pinTailsAfter(R2) {
    const map = byIdMap();
    (S._pinnedNow || []).forEach(id => {
      const l = map.get(id), u = R2.units[id];
      if (!l || !(l.sm && l.sm.stay) || l.sm.tail || !tailOk(l, u)) return;
      if (Math.abs((+l.start || 0) + (+l.duration || 0) - R2.trackEnd) <= R2.eps) setTail(l, R2.trackEnd);
    });
    S._pinnedNow = [];
  }
  function speakDone(plan, notes) {
    let text = plan.say, live = plan.live;
    const extra = [];   // 2.4: what the riders did, said in the same line
    if (plan.counts.cuesDropped) extra.push(line('cuesShort', plan.counts.cuesDropped));
    if (plan.counts.camera) extra.push(line('cameraMoves'));
    if (plan.counts.loopCleared) extra.push(line('loopCleared'));
    if (plan.counts.trDropped) extra.push(line('trDropped', plan.counts.trDropped));
    if (extra.length) { text = (text || live || '') + ' · ' + extra.join(' · '); }
    if (notes && notes.length) text = (text || live || '') + ' · ' + notes.join(' · ');
    if (plan.musicTimed && plan.musicTimed.length) {   // §4.1: titles timed to a song moved with their clips; one tap puts them back on the music
      const n = plan.musicTimed.length, ids = plan.musicTimed.slice();
      S.say((text || live || line('moved0')) + ' · ' + line('movedTexts', n), { buttons: [{ label: line('keepOnMusic'), fn: () => { FM.history.undo(); plan.rerun(); } }, { label: line('undo'), fn: () => FM.history.undo() }] });
      return;
    }
    if (text) S.say(text, { buttons: plan.sayUndo ? [{ label: line('undo'), fn: () => FM.history.undo() }] : [] });
    else if (live) S.say(live, { live: true, pulse: plan.pulse });
  }

  /* ═══ TAP-TIME INTENTS: the target and the playhead are read when the key or button is pressed, never at run time. */
  S.cmd = {
    del(id) { return S.edit('Delete clip', R => S.planDelete(R, id)); },
    trimTail(id, t, o) { t = t == null ? FM.time : t; return S.edit('Trim clip', R => { const L = FM.layerById(FM.scene, id); return L ? S.planTrimTail(R, id, t - (+L.start || 0), o || { key: true }) : refusePlan('gone'); }); },
    trimHead(id, t, o) { t = t == null ? FM.time : t; return S.edit('Trim clip', R => { const L = FM.layerById(FM.scene, id); return L ? S.planTrimHead(R, id, t - (+L.start || 0), o || { key: true }) : refusePlan('gone'); }); },
    split(id, t) { t = t == null ? FM.time : t; return S.edit('Split', R => { const target = id || (S.mainAtTime(R, t) || {}).id; return target ? S.planSplit(R, target, t) : refusePlan('noClipHere'); }); },
    closeSeam(entryId) { return S.edit('Close gap', R => S.planSeam(R, entryId)); },
    duplicate(id) { return S.edit('Duplicate clip', R => S.planDuplicate(R, id)); },
    transition(id, type, d) { return S.edit('Transition', R => S.planTransition(R, id, type, d)); },
    transitionAll(id) { return S.edit('Transition on every cut', R => S.planTransitionAll(R, id)); },
    turnTransition(id) { return S.edit('Turn into a transition', R => S.planTurnIntoTransition(R, id)); }
  };
  /* ═══════════════════════ RELEASE 2.2: the rest of the commands the tray and the tools need ═══════════════════════ */

  /* WHERE A NEW THING GOES IN THE STACK (§3.6.1), the 2.2 subset: the array is z-order, index 0 on top. `insertAt` puts a
     layer at a slot and gives Full's Add row its place back (§3.6.1 "one insert helper"), synchronously. */
  S.insertAt = function (layer, slot) {
    const keep = FM.clampAddAt();
    FM.addAt = Math.max(0, Math.min(slot, FM.scene.layers.length));
    FM.insertLayer(layer);
    FM.addAt = keep + (FM.addAt <= keep ? 1 : 0);
    FM.clampAddAt();
    return layer;
  };
  const overlaps = (a, s, e) => (+a.start || 0) < e - 1e-9 && (+a.start || 0) + (+a.duration || 0) > s + 1e-9;
  const isCap = l => l.type === 'text' && Array.isArray(l.captions);
  /* The slot ABOVE every layer `test` accepts that overlaps [s, e) (the top-most such layer's index), or `fallback`. */
  function slotAbove(s, e, test, fallback, skip) {
    const L = FM.scene.layers;
    for (let i = 0; i < L.length; i++) { const l = L[i]; if (skip && skip.has(l.id)) continue; if (test(l) && overlaps(l, s, e)) return i; }
    return fallback;
  }
  /* text: directly above the top-most non-caption layer it overlaps; overlay: directly above the top-most layer it overlaps
     that is not text, captions or a sound. Returns that layer's id (moveLayers' beforeId puts a layer just ABOVE it), or
     null when it overlaps nothing of that kind (then it stays where the add put it). */
  S.bandAnchor = function (kind, s, e, skip) {
    const test = kind === 'text' ? (l => !isCap(l) && l.type !== 'camera' && !(l.audioOnly === true))
                                 : (l => l.type !== 'text' && l.type !== 'camera' && !(l.audioOnly === true) && !(l.sm && l.sm.snd === true));
    const i = slotAbove(s, e, test, -1, skip);
    return i >= 0 ? FM.scene.layers[i].id : null;
  };
  /* §3.6 Add row: a new text, overlay or sticker is clamped to the TRACK end (never lengthens the video). */
  S.clampToTrack = function (R, start, len) {
    const ml = MINLEN(), clips = R.main.filter(e => !e.slot);
    if (!clips.length) return { start: start, duration: len };
    const last = clips[clips.length - 1];
    let s = start;
    if (s >= R.trackEnd - ml) s = Math.max(last.start, R.trackEnd - len);
    return { start: s, duration: Math.max(ml, Math.min(len, R.trackEnd - s)) };
  };

  /* THE Z ANCHOR FOR CUT j (§3.6.1 "directly above the main clip before it"): the nearest real CLIP before j, or failing that
     the first clip from j on. A card (slot) entry's id is 'slot:…', no layer's id, and moveLayers sent an unknown anchor to
     the very bottom — under a background or a backdrop, where nothing of the new clip showed (review finding 6). */
  S.rowAnchor = function (R, j, skip) {
    for (let k = j - 1; k >= 0; k--) if (!R.main[k].slot && R.main[k].id !== skip) return R.main[k].id;
    for (let k = j; k < R.main.length; k++) if (!R.main[k].slot && R.main[k].id !== skip) return R.main[k].id;
    return null;
  };
  /* The cut nearest t (§3.6 Insert, §8.5 "After Clip N"): an exact tie at a clip's midpoint goes AFTER it. Returns the
     index j of the entry the new clips go before (R.main.length = the end). */
  S.insertIndexAt = function (R, t) {
    if (!R.main.length) return 0;
    let best = 0, bd = Infinity;
    for (let j = 0; j <= R.main.length; j++) {
      const cut = j === 0 ? R.main[0].start : R.main[j - 1].end;
      const d = Math.abs(t - cut);
      if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && j > best)) { bd = d; best = j; }
    }
    return best;
  };

  const mediaKindOf = f => { const t = String((f && f.type) || ''), n = String((f && f.name) || '').toLowerCase();
    if (/^video\//.test(t) || /\.(mp4|mov|m4v|webm)$/.test(n)) return /^audio\//.test(t) ? 'audio' : 'video';
    if (/^image\//.test(t) || /\.(jpe?g|png|gif|heic|webp)$/.test(n)) return 'image';
    if (/^audio\//.test(t) || /\.(mp3|m4a|aac|wav|ogg|opus|flac|aiff?|caf)$/.test(n)) return 'audio';
    return ''; };
  /* Read the picked files BEFORE the runner (§3.7: no picker and no long decode inside a step that a refusal could undo):
     the records, in pick order, with the length each clip will get. Sound files are kept apart: they never enter the clip
     row (§7.3), they go in as music. */
  S.readPicked = async function (files) {
    const pickedIn = FM.startedIn ? FM.startedIn() : null, out = { clips: [], sounds: [], skipped: 0 };
    for (const f of files || []) {
      const k = mediaKindOf(f);
      try {
        const rec = k === 'image' ? await FM.loadImageFile(f) : (k === 'video' || k === 'audio') ? await FM.loadVideoFile(f) : null;
        if (!rec) { out.skipped++; continue; }
        if (FM.stillIn && !FM.stillIn(pickedIn)) { FM.letGoMedia(rec); out.skipped++; continue; }
        const picture = rec.kind === 'image' || (rec.width > 0 && rec.height > 0);
        const len = rec.kind === 'video' ? Math.max(0.1, rec.duration || 5) : FM.defaultLayerDuration();
        (picture ? out.clips : out.sounds).push({ rec: rec, len: len });
      } catch (e) { out.skipped++; if (FM.reportError) FM.reportError('reading “' + (f && f.name) + '”', e); }
    }
    return out;
  };
  function addRecs(recs, at, pickB, map) {
    const made = [];
    let t = at;
    recs.forEach((it, i) => {
      const l = FM.addMediaLayer(it.rec, { at: t, pick: recs.length > 1 ? { b: pickB, i: i } : null, noSave: true });
      if (!l) return;
      if (it.rec.kind !== 'image' && !(it.rec.width > 0 && it.rec.height > 0)) S.setFlag(l, 'snd', true);   // §0.4 B8: Simple's own sound-only fact
      made.push(l); t = (+l.start || 0) + (+l.duration || 0);
    });
    return made;
  }
  const newPickB = () => 'pk' + Date.now().toString(36).slice(-6) + Math.floor(Math.random() * 1296).toString(36);
  /* FULL'S ADD ROW KEEPS ITS PLACE (§3.6.1 "one insert helper", as S.insertAt): addMediaLayer inserts at FM.addAt and the
     plan then moves the new layers into their band, which left the row one layer off (review finding 17). Call before the
     adds; the returned function puts the row back above the layer it sat above. */
  function addRowMark() {
    const L = FM.scene.layers, k = FM.clampAddAt(), id = L[k] ? L[k].id : null;
    return () => { const i = id ? FM.scene.layers.findIndex(l => l.id === id) : -1; FM.addAt = i >= 0 ? i : FM.scene.layers.length; FM.clampAddAt(); };
  }
  /* §3.6.1 BACKDROP: in a project with no main clips, a visual that fills the frame, at opacity 1, normal blend, no mask, below
     every other visual it overlaps (a text-and-shapes template's full-canvas rect). `vis` is in array order. */
  function isBackdrop(l, vis) {
    if (!l || l.type === 'text' || l.type === 'group') return false;
    if (l.blendMode && l.blendMode !== 'normal') return false;
    if ((l.mask && l.mask.enabled) || (l.masks || []).some(m => m && m.enabled !== false)) return false;
    const s = +l.start || 0, d = +l.duration || 0;
    if (FM.layerOpacity && [s, s + d / 2].some(t => FM.layerOpacity(l, t) < 0.999)) return false;
    const P = FM.scene.project, W = P.width || 1080, H = P.height || 1920;
    let b = null; try { b = FM.worldBox ? FM.worldBox(l, s, FM.scene) : null; } catch (e) { b = null; }
    if (!b) return false;
    const iw = Math.max(0, Math.min(W, b.x1) - Math.max(0, b.x0)), ih = Math.max(0, Math.min(H, b.y1) - Math.max(0, b.y0));
    if (iw * ih < 0.9 * W * H) return false;
    const i = FM.scene.layers.indexOf(l);
    return vis.every(o => o === l || FM.scene.layers.indexOf(o) < i);
  }
  /* §3.6.1: THE FIRST MAIN CLIPS of a project with none go directly above the top-most backdrop they overlap, else directly
     below the lowest visual they overlap — never at FM.addAt's default, the top, over every title and shape (finding 17). */
  function placeFirstMain(made, s, e, R) {
    const ids = new Set(made.map(l => l.id));
    const vis = FM.scene.layers.filter(l => !ids.has(l.id) && overlaps(l, s, e) && l.type !== 'camera' && l.type !== 'group' &&
      l.audioOnly !== true && !(l.sm && l.sm.snd === true) && !(R.units[l.id] && (R.units[l.id].kind === 'audio' || R.units[l.id].kind === 'fullOnly')));
    if (!vis.length) return;
    const back = vis.filter(l => isBackdrop(l, vis));
    if (back.length) { FM.moveLayers(made.map(l => l.id), back[0].id); return; }   // just above the top-most backdrop
    const L = FM.scene.layers, k = L.indexOf(vis[vis.length - 1]);
    const nx = L.slice(k + 1).find(l => !ids.has(l.id));
    FM.moveLayers(made.map(l => l.id), nx ? nx.id : null);                         // just below the lowest visual
  }

  /* APPEND (the clip row's +, Clips › At the end): the clips go end to end from the track end, BEFORE an end card, which
     moves along. Arranging only when it moves something (a tail item) or the project is not adopted yet (§3.6 Append row):
     a plain clips-only Append works with a friend in. Cues or a window that cross the track end refuse until 2.4. */
  S.planAppend = function (R, picked) {
    const map = byIdMap(), clips = picked.clips;
    if (!clips.length && !picked.sounds.length) return refusePlan('nothingAdded');
    const T = R.main.some(e => !e.slot) ? R.trackEnd : 0;
    const sum = clips.reduce((a, c) => a + c.len, 0);
    const rd = clips.length ? riderPlan(R, map, tmShift(T, sum)) : null;   // §3.10 rule 3e: the camera and the track's keys ride the Append map whenever clips are added
    const plan = newPlan(clips.length > 1 ? 'Add ' + clips.length + ' clips' : 'Add clip');
    if (rd) rd.attach(plan);
    /* §3.6 Append row: arranging (so gated, pinned and tail-fitted in this same step) when it moves an end card, when an
       sm.tail item will be refitted to the new end, or when a whole-video picture added in Full after adoption carries no
       flag yet (pinStrays tags it, the tail fit takes it to the new end). Otherwise not: a plain Append works live. */
    const first0 = R.main.filter(e => !e.slot)[0];
    const wholeUntagged = id => { const l = map.get(id), u = R.units[id];
      if (!l || !first0 || (l.sm && (l.sm.stay || l.sm.main || l.sm.tail)) || S.neverPinned(id, R) || !tailOk(l, u)) return false;
      const s = +l.start || 0; return s <= first0.start + R.eps && s + (+l.duration || 0) >= R.trackEnd - R.eps; };
    plan.arranges = R.tail.length > 0 || (clips.length > 0 && (FM.scene.layers.some(l => l.sm && l.sm.tail === true) || Object.keys(R.units).some(wholeUntagged)));
    R.tail.forEach(id => addMove(plan, id, sum));
    const lastMain = (() => { const m = R.main.filter(e => !e.slot); return m.length ? m[m.length - 1].id : null; })();
    plan.pre.push(async () => {
      const keepRow = addRowMark();
      const made = addRecs(clips, T, newPickB(), map);
      made.forEach(l => { S.setFlag(l, 'main', true); muteIfMode(l); });   // 2.3: Mute clip sound is on, so the new clip is muted too
      if (made.length && lastMain && FM.layerById(FM.scene, lastMain)) FM.moveLayers(made.map(l => l.id), lastMain);   // just above the clip before (§3.6.1)
      else if (made.length) placeFirstMain(made, T, T + sum, R);
      const snd = addRecs(picked.sounds, Math.max(0, Math.min(FM.time || 0, T)), newPickB(), map);
      snd.forEach(l => { S.setFlag(l, 'stay', true); FM.moveLayers([l.id], null); });   // music: Stay put, left whole (D17 B); sound sits at the end of the stack
      keepRow();
      if (made.length || snd.length) plan.mints = true;   // {noSave} records: the runner writes their files at once (queue 681, review finding 9)
      plan.selectId = made.length ? made[0].id : (snd[0] && snd[0].id);
      plan.made = made.length;
    });
    plan.time = T;
    plan.live = clips.length > 1 ? line('addedN', clips.length) : line('added1');
    return plan;
  };
  /* INSERT at the cut j (Clips › After Clip N): the new clips go in there, everything from j on moves along by their
     length. A crossfade at that cut refuses (its fade would end up spanning the new clips). */
  S.planInsert = function (R, picked, j) {
    const map = byIdMap(), clips = picked.clips;
    if (!clips.length) return S.planAppend(R, picked);
    if (j >= R.main.length) return S.planAppend(R, picked);
    const e = R.main[j];
    if (e.seam && e.seam.kind === 'blend') return refusePlan('insertFade', { a: j, b: j + 1 });
    const at = j === 0 ? R.main[0].start : R.main[j - 1].end;
    const sum = clips.reduce((a, c) => a + c.len, 0);
    const rd = riderPlan(R, map, tmShift(at, sum));
    /* the new clips' end exactly as addRecs writes it (each start = the last end, duration = its len), so the ripple lands
       entry j there only when its seam was a join or a hairline — with the same correction carried to its followers, every
       later clip and the tail. A gap stays a gap (§3.2 rule 1): a late land after the ripple moved j by sum − gap while
       everything tied to it moved by sum (review finding 11). */
    let newEnd = at; clips.forEach(c => { newEnd = newEnd + c.len; });
    const plan = newPlan(clips.length > 1 ? 'Add ' + clips.length + ' clips' : 'Add clip');
    const rp = ripple(plan, R, j, sum, new Set(), newEnd, true);
    tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);
    rd.attach(plan);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    const anchor = S.rowAnchor(R, j);
    plan.pre.push(async () => {
      const keepRow = addRowMark();
      const made = addRecs(clips, at, newPickB(), map);
      made.forEach(l => { S.setFlag(l, 'main', true); muteIfMode(l); });
      if (made.length && anchor) FM.moveLayers(made.map(l => l.id), anchor);
      plan.selectId = made.length ? made[0].id : null;
      const snd = addRecs(picked.sounds, Math.max(0, FM.time || 0), newPickB(), map);
      snd.forEach(l => { S.setFlag(l, 'stay', true); FM.moveLayers([l.id], null); });
      keepRow();
      if (made.length || snd.length) plan.mints = true;
    });
    plan.time = at;
    plan.live = clips.length > 1 ? line('addedN', clips.length) : line('added1');
    return plan;
  };

  /* REORDER c to before entry j (Move earlier / Move later, §3.6 Reorder row). One slot length L = n.start − c.start (c's
     trailing seam travels with it), both halves against the ORIGINAL read model; c and its followers get ONE move to their
     new place. A clip on a crossfade refuses. Exact landings at the two seams the move creates. */
  S.planReorder = function (R, id, j) {
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    if (j === i || j === i + 1 || j < 0 || j > R.main.length) return refusePlan('noMove');
    const c = R.main[i], n = R.main[i + 1] || null, L = map.get(c.id);
    const fades = k => R.main[k] && R.main[k].seam && R.main[k].seam.kind === 'blend';
    if (fades(i) || fades(i + 1) || (j < R.main.length && fades(j))) return refusePlan('sortFade');
    const len = n ? n.start - c.start : (+L.duration || 0);
    const S0 = new Set([c.id].concat(R.followers[c.id] || []));
    const plan = newPlan('Move clip');
    /* new positions, walked in the NEW order: every entry keeps its own seam amount except at the two edit points */
    const order = R.main.map((e, k) => k).filter(k => k !== i);
    const at = j > i ? j - 1 : j;
    order.splice(at, 0, i);
    const dOf = k => (k > i && k < j) ? -len : (k >= j && k < i) ? len : 0;   // forward: (i, j) move −L; backward: [j, i) move +L
    let prevEnd = null, acc = 0, cStart = null, clipEnd = null;
    order.forEach((k, pos) => {
      const e = R.main[k];
      let ns;
      if (k === i) ns = pos === 0 ? R.main[0].start : prevEnd;                  // c lands exactly where its slot opens (§3.6 seam')
      else {
        const prop = e.start + dOf(k) + acc;
        const gap = prevEnd == null ? null : prop - prevEnd;
        /* the entry that closes up behind c meets p across the removed c: its seam is p|c's, not its own c|n (Delete reads
           isFloatJoin(R, i) the same way) — a p|c hairline was read as a join, moved off the grid and left open (finding 7) */
        const sk = (k === i + 1 && i > 0) ? R.main[i].seam : e.seam;
        if (gap != null && ((Math.abs(gap) < 1e-9 && gap !== 0) || (gap > 0 && gap <= R.eps && sk && sk.kind === 'hairline'))) { acc += prevEnd - prop; ns = prevEnd; }
        else if (pos > 0 && order[pos - 1] === i && Math.abs(gap) <= R.eps) { acc += prevEnd - prop; ns = prevEnd; }   // the seam after c is new: land it
        else ns = prop;
      }
      const d = ns - e.start;
      if (e.slot) { e.members.forEach(m => { if (d) addMove(plan, m, d); }); prevEnd = e.end + d; }
      else {
        const landed = k === i || ns !== e.start + dOf(k), Lk = map.get(e.id);
        if (landed) addLand(plan, e.id, ns); else if (d) addMove(plan, e.id, d);
        (R.followers[e.id] || []).forEach(f => { if (d) addMove(plan, f, d); });
        if (k === i) cStart = ns;
        /* the end apply() will write, bit for bit (a landed start, else old + d), for the next seam and for the tail */
        prevEnd = (landed ? ns : (+Lk.start || 0) + d) + (+Lk.duration || 0);
        clipEnd = prevEnd;
      }
    });
    plan.touched.add(c.id);
    /* §3.6 Reorder row: with c last (L = c.duration), or c moved to the end, the track end changes and the tail follows it —
       an end card waited after seconds of black, or slid under the clips (review finding 13). The last CLIP's end, never a
       card's: trackEnd is always a clip's end. */
    if (clipEnd != null) tailMove(plan, R, clipEnd, map);
    /* 2.4 (§3.5 Reorder): ONE piecewise translation g, built from the same L the ripple used. Forward: P0 [0, c.start) fixed, Pc [c.start, c.start + L)
       moves to c's new start, P1 [c.start + L, s) moves -L, P2 [s, ...) fixed. Backward: P0 [0, s) fixed, P1 [s, c.start) moves +L, Pc moves to c's new
       start, P2 [c.start + L, ...) fixed. `s` is the destination cut's start (the track end when c goes last). */
    {
      const s0 = j < R.main.length ? R.main[j].start : R.trackEnd, cOff = cStart - c.start;
      const g = j > i
        ? tmPieces([{ lo: 0, hi: c.start, off: 0 }, { lo: c.start, hi: c.start + len, off: cOff }, { lo: c.start + len, hi: s0, off: -len }, { lo: s0, hi: BIG, off: 0 }])
        : tmPieces([{ lo: 0, hi: s0, off: 0 }, { lo: s0, hi: c.start, off: len }, { lo: c.start, hi: c.start + len, off: cOff }, { lo: c.start + len, hi: BIG, off: 0 }]);
      riderPlan(R, map, g).attach(plan);
    }
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = cStart;
    const newIndex = order.filter(k => !R.main[k].slot).indexOf(i) + 1;
    plan.live = line('moved', S.itemWord(L, R), newIndex, R.main.filter(e => !e.slot).length);
    plan.pulse = [c.id];
    return plan;
  };
  S.moveIndexFor = function (R, id, dir) {
    const i = mainIdx(R, id); if (i < 0) return -1;
    if (dir < 0) { let k = i - 1; while (k >= 0 && R.main[k].slot) k--; return k < 0 ? -1 : k; }
    let k = i + 1; while (k < R.main.length && R.main[k].slot) k++;
    return k >= R.main.length ? -1 : k + 1;
  };

  /* LIFT OFF (Make overlay, §3.6): c keeps its time but leaves the clip row; what comes after closes up under it; the
     things on it stay with it, Stay put; it goes up into the overlay band, under its own titles. */
  S.planLift = function (R, id) {
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], p = R.main[i - 1] || null, n = R.main[i + 1] || null, L = map.get(c.id);
    /* a main block (§8.5 Block row: Open in Full · Duplicate · 🗑): sm.main lives on its members, never on the group row, so
       clearing the group's flag left the block main while the clips after it slid under it (review finding 0) */
    if (L.type === 'group') return refusePlan('liftBlock');
    if ((n && n.seam && n.seam.kind === 'blend') || (p && c.seam && c.seam.kind === 'blend')) return refusePlan('sortFade');
    const rd = riderPlan(R, map, tmCut(c.start, n ? n.start : c.end));   // §3.5: the delete-form map (the camera follows the clip row, not the lifted clip)
    const plan = newPlan('Lift off');
    const fol = R.followers[c.id] || [];
    const dt = n ? -(n.start - c.start) : 0;
    const prevEnd = p ? p.end : null;
    const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(fol)), prevEnd, !!(p && isFloatJoin(R, i)));
    if (n) tailMove(plan, R, rp.end != null ? rp.end : R.trackEnd + (rp.last == null ? dt : rp.last), map);   // the last clip's end as apply() writes it, never trackEnd + d (§3.1, finding 16)
    else { const lastClip = R.main.filter(e => !e.slot && e.id !== c.id).pop(); tailMove(plan, R, lastClip ? lastClip.end : c.start, map); }
    plan.touched.add(c.id);
    rd.attach(plan);
    plan.post.push(() => {
      S.setFlag(L, 'main', false);
      if (L.sm && L.sm.muteByMode) { S.setFlag(L, 'muteByMode', false); L.muted = false; }   // 2.3: an overlay is not part of Mute clip sound; it gets its sound back
      fol.forEach(fid => { const f = map.get(fid); if (f && !S.isTwinOf(f, L, R.eps)) S.setFlag(f, 'stay', true); });
      /* overlay band: directly above the top-most layer it overlaps that is not text, captions or itself */
      const s = +L.start || 0, e = s + (+L.duration || 0), skip = new Set([L.id].concat(fol));
      const idx = slotAbove(s, e, l => l.type !== 'text' && l.type !== 'camera' && !(l.audioOnly === true) && !fol.includes(l.id), -1, skip);
      if (idx >= 0) { const above = FM.scene.layers[idx]; if (above && above.id !== L.id) FM.moveLayers([L.id], above.id); }
    });
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.live = line('lifted');
    plan.pulse = [c.id];
    return plan;
  };
  /* INTO ROW (Make main clip, §3.6): an overlay goes into the clip row at the cut nearest its start; the clips from there on
     move along by its length; it lands exactly on that cut. */
  S.planIntoRow = function (R, id) {
    const map = byIdMap(), o = map.get(id), u = R.units[id];
    if (!o || !u || R.isMain(id)) return refusePlan('gone');
    /* a member of a card between clips (a slot): DESIGN §3.6's slot form puts the card in the row with no ripple and no move.
       Make main clip's map rippled the card's other members and every later clip by +len and opened a gap (finding 12).
       Refused with Open in Full until the slot form is built. */
    if (u.host && String(u.host).indexOf('slot:') === 0) return refusePlan('slotIntoRow');
    if (!(o.type === 'video' || o.type === 'image' || o.type === 'shape' || (o.type === 'text' && !isCap(o)))) return refusePlan('cannotMain');
    if (o.audioOnly === true || (o.sm && o.sm.snd === true)) return refusePlan('cannotMain');
    const j = S.insertIndexAt(R, +o.start || 0);
    if (j < R.main.length && R.main[j].seam && R.main[j].seam.kind === 'blend') return refusePlan('insertFade', { a: j, b: j + 1 });
    const seam = j === 0 ? (R.main[0] ? R.main[0].start : 0) : R.main[j - 1].end;
    const len = +o.duration || 0, dO = seam - (+o.start || 0);
    /* its sound twin travels with it (§4.6: a twin belongs to its clip's unit, never a follower). After a Lift off the twin
       reads as a follower of whatever slid under it, so the ripple would carry it len seconds away from its picture, or a
       karaoke twin refused as a slip (review finding 1). o is not a main entry, so twinsOf (R.followers) cannot find them. */
    const twins = FM.scene.layers.filter(t => S.isTwinOf(t, o, R.eps));
    const rd = riderPlan(R, map, tmShift(seam, len));
    const plan = newPlan('Put in the clip row');
    rd.attach(plan);
    const rp = ripple(plan, R, j, len, new Set([id].concat(twins.map(t => t.id))), seam + len, true);
    tailMove(plan, R, rp.end != null ? rp.end : seam + len, map);   // o last: its end, landed at seam with its own duration
    addLand(plan, id, seam);
    twins.forEach(t => { plan.moves.delete(t.id); addLand(plan, t.id, (+t.start || 0) + dO); });   // a land beats a move or a tail land
    plan.post.push(() => {
      S.setFlag(o, 'main', true); S.setFlag(o, 'stay', false); muteIfMode(o);
      twins.forEach(t => S.setFlag(t, 'stay', false));
      const anchor = S.rowAnchor(R, j, o.id);
      if (anchor) FM.moveLayers([o.id], anchor);   // main band: just above the clip before it (never a card's slot id)
    });
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = seam;
    plan.live = line('intoRow');
    plan.pulse = [id];
    return plan;
  };
  /* STAY PUT (a flag; nothing moves). Several at once (§8.5b "Stay put (all)") are ONE plan: one undo step, one collab
     transaction. A forEach of single edits made one step per item and dropped every tap past the runner's queue of four
     (review findings 8 / 24). Refused whole when any is gone or main (§3.2 rule 6); the selection is kept. */
  S.planStayMany = function (R, ids, on) {
    const map = byIdMap(), ls = ids.map(id => map.get(id));
    if (!ls.length || ls.some((l, k) => !l || R.isMain(ids[k]))) return refusePlan('gone');
    const plan = newPlan(on ? 'Stay put' : 'Follow clip'); plan.arranges = false; plan.adopts = false; plan.keepSel = true;
    plan.post.push(() => ls.forEach(l => { S.setFlag(l, 'stay', !!on); if (!on) S.setFlag(l, 'tail', false); }));
    plan.live = on ? line('stays') : line('follows');
    return plan;
  };
  S.planStay = function (R, id, on) { return S.planStayMany(R, [id], on); };
  /* FORWARD / BACK for an overlay or text (z one step among the items it overlaps; it never crosses the clip row, §3.6.1). */
  S.planZ = function (R, id, dir) {
    const map = byIdMap(), l = map.get(id);
    if (!l || R.isMain(id)) return refusePlan('gone');
    const L = FM.scene.layers, i = L.indexOf(l), s = +l.start || 0, e = s + (+l.duration || 0);
    let k = i + (dir > 0 ? -1 : 1);
    while (k >= 0 && k < L.length && !(overlaps(L[k], s, e) && L[k].type !== 'camera')) k += (dir > 0 ? -1 : 1);
    if (k < 0 || k >= L.length || R.isMain(L[k].id)) return refusePlan(dir > 0 ? 'atTop' : 'atBottom');
    const plan = newPlan(dir > 0 ? 'Forward' : 'Back'); plan.arranges = false; plan.adopts = false; plan.touched.add(id);
    const target = L[k];
    plan.post.push(() => { if (dir > 0) FM.moveLayers([id], target.id); else { const nx = FM.scene.layers[FM.scene.layers.indexOf(target) + 1]; FM.moveLayers([id], nx ? nx.id : null); } });
    plan.live = line(dir > 0 ? 'forward' : 'backward');
    return plan;
  };
  /* CLOSE ALL GAPS (Simple's ⋯): every gap and overlap and every hairline a frame falls into, left to right, landed shut,
     one step. Blends, slots and covered gaps are left alone. */
  S.planCloseAll = function (R) {
    const map = byIdMap(), fps0 = fps();
    const plan = newPlan('Close all gaps');
    let prevEnd = null, acc = 0, closed = 0;
    const tmops = [];   // 2.4: the removals (a closed gap) and insertions (a fixed overlap) in ORIGINAL time, one map for every rider
    R.main.forEach((e, k) => {
      let d = acc, ns = e.start + acc;
      const sm = e.seam, hair = !!(sm && sm.kind === 'hairline');
      /* frame f is black when prevEnd ≤ f/fps < start: a CEIL test on the original edges (a floor test missed an edge that sits
         on a frame and counted one that does not), and a hairline this command moves is landed shut whatever it held, since
         its new place is off the grid (§3.1: landed whenever it moves; inv. 13; review finding 4) */
      const pEnd0 = k ? R.main[k - 1].end : 0;
      const frameIn = hair && Math.ceil(pEnd0 * fps0 - 1e-9) !== Math.ceil(e.start * fps0 - 1e-9);
      const movedHair = hair && acc !== 0 && prevEnd != null;
      const fix = sm && !sm.covered && (sm.kind === 'gap' || sm.kind === 'overlap' || frameIn || movedHair || (sm.kind === 'join' && Math.abs((k ? R.main[k - 1].end : e.start) - e.start) < 1e-9 && prevEnd != null));
      if (fix) {
        const target = prevEnd != null ? prevEnd : 0; if (sm.kind === 'gap' || sm.kind === 'overlap' || frameIn) closed++;
        const delta = target - ns;
        if (delta < -1e-9) tmops.push({ a: e.start + delta, b: e.start }); else if (delta > 1e-9) tmops.push({ a: e.start, ins: delta });
        acc += delta; d = acc; ns = target;
      }
      if (e.slot) { e.members.forEach(m => { if (d) addMove(plan, m, d); }); prevEnd = e.end + d; return; }
      if (fix) addLand(plan, e.id, ns); else if (d) addMove(plan, e.id, d);
      (R.followers[e.id] || []).forEach(f => { if (d) addMove(plan, f, d); });
      prevEnd = ns + (+map.get(e.id).duration || 0);
    });
    if (!closed) return refusePlan('noGaps');
    tailMove(plan, R, prevEnd, map);
    riderPlan(R, map, tmOps(tmops)).attach(plan);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.live = line('gapsClosed', closed);
    return plan;
  };
  /* END WITH THE VIDEO (the black band, §5.4, D17 B): every PICTURE item that runs past the last clip is fitted to it —
     media through the tail trim, keys re-timed like the tail fit. A sound is named and left running (his D17 B). */
  S.overrun = function (R) {
    const out = { pictures: [], sounds: [], ends: [] };
    if (!R.main.some(e => !e.slot)) return out;
    FM.scene.layers.forEach(l => {
      if (l.type === 'camera') return;
      const s = +l.start || 0, e = s + (+l.duration || 0);
      if (e <= R.trackEnd + 1e-9) return;
      const u = R.units[l.id] || {};
      if (u.kind === 'audio' || l.audioOnly === true || (l.sm && l.sm.snd === true)) out.sounds.push(l);
      else if (s >= R.trackEnd - 1e-9) out.ends.push(l);
      else if (l.type !== 'group') out.pictures.push(l);
    });
    return out;
  };
  S.planEndWithVideo = function (R) {
    const o = S.overrun(R);
    if (!o.pictures.length) return refusePlan('nothingToFit');
    const plan = newPlan('End with the video'); plan.arranges = false; plan.adopts = false;
    o.pictures.forEach(l => plan.touched.add(l.id));
    plan.writes.push(() => o.pictures.forEach(l => {
      const s = +l.start || 0, D = +l.duration || 0;
      let D2 = R.trackEnd - s, tr = l.trimStart;
      if (l.type === 'video') { const r = FM.trimClipEdge(l, 'tail', D2 - D, srcDurOf(l)); D2 = r.duration; tr = r.trimStart; }
      D2 = Math.max(MINLEN(), D2);
      S.mapLayerKeys(l, S.fitMap(s, D, D2));
      l.duration = D2; if (l.type === 'video') l.trimStart = tr;
      if (l.sm && l.sm.tail) l.sm.tailEnd = s + D2;
    }));
    plan.live = line('fitted', o.pictures.length);
    return plan;
  };
  /* ADD TEXT / OVERLAY (the project tools, §3.6 Add row): at the playhead, clamped to the TRACK end, in its band. The text
     opens for typing. Not arranging: it moves nothing that exists, so it works with a friend in. */
  S.planAddText = function (R) {
    const plan = newPlan('Add text'); plan.arranges = false; plan.adopts = false;
    plan.pre.push(async () => {
      const P = FM.scene.project, c = S.clampToTrack(R, Math.max(0, FM.time || 0), FM.defaultLayerDuration());
      /* today's text defaults (js/app.js addTextLayer), placed by Simple: no commit, no editor opened mid-step */
      const t = FM.makeLayer('text', { name: 'Text', x: P.width / 2, y: P.height / 2, fontSize: FM.defaultTextSize(), start: c.start, duration: c.duration });
      const anchor = S.bandAnchor('text', c.start, c.start + c.duration, null);
      S.insertAt(t, anchor ? FM.scene.layers.findIndex(l => l.id === anchor) : 0);
      plan.selectId = t.id; plan.typeInto = t.id;
    });
    plan.after = () => { if (plan.typeInto && FM.textEdit && FM.textEdit.start) FM.textEdit.start(plan.typeInto, { selectAll: true }); };
    plan.live = line('textAdded');
    return plan;
  };
  S.planAddOverlay = function (R, picked) {
    const items = picked.clips;
    if (!items.length) return refusePlan('nothingAdded');
    const plan = newPlan('Add overlay'); plan.arranges = false; plan.adopts = false;
    plan.pre.push(async () => {
      const keepRow = addRowMark();
      const t0 = Math.max(0, FM.time || 0), made = addRecs(items, t0, newPickB(), null);
      made.forEach(l => {
        const c = S.clampToTrack(R, +l.start || 0, +l.duration || 0);
        l.start = c.start;
        if (c.duration < l.duration) { if (l.type === 'video') { const r = FM.trimClipEdge(l, 'tail', c.duration - l.duration, srcDurOf(l)); l.duration = r.duration; l.trimStart = r.trimStart; } else l.duration = c.duration; }
        const s0 = +l.start || 0, e0 = s0 + (+l.duration || 0);
        const anchor = S.bandAnchor('overlay', s0, e0, new Set([l.id]));
        if (anchor) FM.moveLayers([l.id], anchor);
        else {   // nothing but words under it: below every text and caption track it overlaps (§3.6.1), not left on top of them
          const L = FM.scene.layers, words = L.filter(x => x !== l && x.type === 'text' && overlaps(x, s0, e0));
          if (words.length) { const k = L.indexOf(words[words.length - 1]), nx = L.slice(k + 1).find(x => x !== l); FM.moveLayers([l.id], nx ? nx.id : null); }
        }
      });
      keepRow();
      if (made.length) plan.mints = true;
      plan.selectId = made.length ? made[0].id : null;
    });
    plan.live = line('overlayAdded');
    return plan;
  };
  S.planAddMusic = function (R, picked) {
    const items = picked.sounds.concat(picked.clips.filter(c => c.rec.kind === 'video'));
    if (!items.length) return refusePlan('nothingAdded');
    const plan = newPlan('Add music'); plan.arranges = false; plan.adopts = false;
    plan.pre.push(async () => {
      const keepRow = addRowMark();
      const made = addRecs(items, Math.max(0, FM.time || 0), newPickB(), null);
      made.forEach(l => {
        /* a PICTURE video picked as music: its sound only, as Full's Extract Audio makes it (audioOnly, opacity 0 — the only
           thing that stops the compositor drawing it) plus Simple's sound fact. Added as it was, it drew a full-frame picture
           in every gap and, at the bottom of an un-adopted project, became the whole clip row (review finding 15). */
        if (!(l.sm && l.sm.snd)) { l.audioOnly = true; l.transform.opacity = 0; S.setFlag(l, 'snd', true); l.muted = false; }
        S.setFlag(l, 'stay', true); FM.moveLayers([l.id], null);   // music: Stay put, whole (D17 B); sound sits at the end of the stack
      });
      keepRow();
      if (made.length) plan.mints = true;
      plan.selectId = made.length ? made[0].id : null;
    });
    plan.live = line('musicAdded');
    return plan;
  };

  /* READ, THEN RUN, with the switch held shut between (review finding 10): readPicked can take seconds (a decode, a 20 s metadata
     wait), and S.running is not set until S.edit starts, so the cog's switch went through and the Simple ripple, its adoption
     and its refusals (spoken into a hidden row) all landed in Full. S.edit sets S.running synchronously, so there is no gap. */
  function afterRead(files, run) {
    return (async () => {
      S.reading++;
      let picked;
      try { picked = await S.readPicked(files); } finally { S.reading--; }
      return run(picked);
    })();
  }
  /* ═══════════════════════ RELEASE 2.3: speed, sound and replacing (BUILD-PLAN-PHASE2-2.3.md) ═══════════════════════
     Speed, Volume, Fade, Replace, Reverse, Take sound out / Put sound back and Mute clip sound, each ONE plan through the same
     runner as 2.1's and 2.2's commands. Only Speed on a main clip and Replace with a shorter file arrange (they ripple); the rest
     are looks and sound, so they work with a friend in the session (D14 first half) and never move a clip. */
  const SPEED_LO = 0.25, SPEED_HI = 4, VOL_HI = 10;   // VOL_HI: Full's own ceiling (1000%); Simple's row offers 0–200% but never clamps a level Full set higher
  const flatSpan = l => (+l.duration || 0) * FM.speedAt(l, +l.start || 0);   // the footage the clip shows: what a re-time never changes
  /* The Speed panel's stops: 0.25× to the lower of 4× and the speed at which the clip (and each blend beside it) would be too short */
  S.speedRange = function (R, id) {
    const L = FM.layerById(FM.scene, id); if (!L || FM.isAnimated(L.speed)) return null;
    const span = flatSpan(L); let hi = Math.min(SPEED_HI, span / MINLEN());
    const i = mainIdx(R, id);
    if (i >= 0) {
      const c = R.main[i], n = R.main[i + 1];
      if (n && n.seam && n.seam.kind === 'blend') hi = Math.min(hi, span / (2 * n.seam.amt));
      if (i > 0 && c.seam && c.seam.kind === 'blend') hi = Math.min(hi, span / (2 * c.seam.amt));
    }
    return { lo: SPEED_LO, hi: Math.max(SPEED_LO, hi), span: span, now: FM.speedAt(L, +L.start || 0) };
  };
  /* what setClipSpeed will really write: the new length, clamped by the 0.1 s floor and by the source left (its own rule, exactly) */
  function speedLength(L, sp) {
    let nd = Math.max(0.1, flatSpan(L) / sp);
    if (L.type === 'video') { const sd = srcDurOf(L); if (isFinite(sd)) nd = Math.max(0.1, Math.min(nd, (sd - (+L.trimStart || 0)) / sp)); }
    return nd;
  }
  /* the cue-effect key lists animatedProps leaves out (a caption cue's own effects) ride a re-time too, about the clip's own start */
  function scaleCueKeys(l, k) {
    const base = new Set(FM.animatedProps(l));
    FM.timedLists(l).forEach(p => { if (!base.has(p)) p.kf.forEach(kk => { kk.t = (+l.start || 0) + (kk.t - (+l.start || 0)) * k; }); });
  }

  /* SPEED of a main clip (flat only): every footage frame stays, the length becomes span / sp, what starts on the clip moves with
     its place on it (and keeps its own length), the clips after close up or open out, the playhead stays on the same moment. */
  S.planSpeed = function (R, id, sp) {
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], n = R.main[i + 1] || null, L = map.get(c.id), ml = MINLEN();
    if (L.type === 'group') return refusePlan('speedBlock');
    if (L.type !== 'video') return refusePlan('failed');   // a picture has no clock to change
    if (FM.isAnimated(L.speed)) return refusePlan('speedRamp');
    if (!(sp > 0) || !isFinite(sp)) return refusePlan('failed');
    const old = FM.speedAt(L, +L.start || 0), d0 = +L.duration || 0;
    if (Math.abs(sp - old) < 1e-9) return refusePlan('nothingChanged');
    const nd = speedLength(L, sp);
    if (nd < ml - SLACK || Math.abs(nd - flatSpan(L) / sp) > 1e-6) return refusePlan('speedShort');   // under the shortest clip, or the source would run out before the speed did
    if (n && n.seam && n.seam.kind === 'blend') {
      if (nd < 2 * n.seam.amt - SLACK) return refusePlan('fadesNext');
      if (blendOwner(c, n, map) === L) return refusePlan('fadeOwned', { a: S.itemWord(L, R), b: S.itemWord(map.get(n.id), R) });
    }
    if (i > 0 && c.seam && c.seam.kind === 'blend') {
      if (nd < 2 * c.seam.amt - SLACK) return refusePlan('fadesBefore');
      if (blendOwner(R.main[i - 1], c, map) === L) return refusePlan('fadeOwned', { a: S.itemWord(map.get(R.main[i - 1].id), R), b: S.itemWord(L, R) });
    }
    const fol = R.followers[c.id] || [];
    const k = nd / d0, dt = nd - d0;
    const rd = riderPlan(R, map, tmScale(c.start, d0, nd));
    const plan = newPlan('Change speed'); plan.touched.add(c.id);
    const twins = twinsOf(R, c, map), twinIds = new Set(twins.map(t => t.id));
    twins.forEach(t => plan.touched.add(t.id));
    plan.writes.push(() => { [L].concat(twins).forEach(x => { FM.setClipSpeed(x, sp); scaleCueKeys(x, k); }); });
    const newEnd = c.start + nd;
    fol.forEach(fid => {
      if (twinIds.has(fid)) return;
      const f = map.get(fid), u = R.units[fid]; if (!f) return;
      const x = (+f.start || 0) - c.start, mv = x * (k - 1);
      if (Math.abs(mv) > 1e-9) addMove(plan, fid, mv);
      if (isCaptionTrack(f)) plan.writes.push(() => {   // 2.4: a caption track lying on the clip rides its speed: window and cues scale about the clip's start (cue times are local, so they scale by k)
        f.duration = (+f.duration || 0) * k;
        f.captions = FM.captions.cues(f).map(cu => { const o = clone(cu); o.start *= k; o.end *= k; if (Array.isArray(o.effects) && FM.fxListAnimatedProps) FM.fxListAnimatedProps(o.effects).forEach(pp => pp.kf.forEach(kk => { kk.t = c.start + (kk.t - c.start) * k; })); return o; });
      });
      const fd = +f.duration || 0, fe = c.start + x * k + fd;
      if (u && u.kind === 'effect' && (+f.start || 0) + fd <= c.end + 1e-9 && fe > newEnd + 1e-9) {   // §4.3: an effect stays inside its clip
        plan.touched.add(fid); plan.writes.push(() => { f.duration = Math.max(ml, newEnd - (c.start + x * k)); });
      }
    });
    const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);
    tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);
    rd.attach(plan);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    const t = FM.time || 0;                                                       // §3.6.2: the same moment of the clip stays under the line
    if (t >= c.start - 1e-9 && t < c.start + d0 - 1e-9) plan.time = c.start + (t - c.start) * k;
    else if (t >= c.start + d0 - 1e-9) plan.time = t + dt;
    plan.live = line('sped', S.itemWord(L, R), Math.round(sp * 100) / 100);
    plan.pulse = [c.id];
    return plan;
  };
  /* SPEED of anything else with a clock (an overlay video, a song): nothing follows it and nothing ripples, so it is a look. A
     sm.tail mark goes (its end is no longer the track end), the Stay put under it stays. */
  S.planSpeedItem = function (R, id, sp) {
    const map = byIdMap(), L = map.get(id), u = R.units[id];
    if (!L || !u || R.isMain(id)) return refusePlan('gone');
    if (L.type !== 'video') return refusePlan('failed');
    if (FM.isAnimated(L.speed)) return refusePlan('speedRamp');
    if (!(sp > 0) || !isFinite(sp)) return refusePlan('failed');
    const old = FM.speedAt(L, +L.start || 0);
    if (Math.abs(sp - old) < 1e-9) return refusePlan('nothingChanged');
    const nd = speedLength(L, sp);
    if (nd < MINLEN() - SLACK || Math.abs(nd - flatSpan(L) / sp) > 1e-6) return refusePlan('speedShort');
    const k = nd / (+L.duration || 1);
    const plan = newPlan('Change speed'); plan.arranges = false; plan.adopts = false; plan.touched.add(id);
    plan.writes.push(() => { FM.setClipSpeed(L, sp); scaleCueKeys(L, k); if (L.sm && L.sm.tail) S.setFlag(L, 'tail', false); });
    plan.live = line('sped', S.itemWord(L, R), Math.round(sp * 100) / 100);
    plan.keepSel = true;
    return plan;
  };
  /* USE ONE SPEED (a ramped clip → flat): keeps the LENGTH, so nothing moves and nothing is arranged; the speed is the footage over the length */
  S.planUseOneSpeed = function (R, id) {
    const map = byIdMap(), L = map.get(id);
    if (!L || L.type !== 'video') return refusePlan('gone');
    if (!FM.isAnimated(L.speed)) return refusePlan('nothingChanged');
    const fol = R.followers[id] || [];
    if (fol.some(f => R.units[f] && R.units[f].kind === 'captions')) return refusePlan('riders');   // cues would need φ (2.4)
    const span = FM.layerSourceAdvance(L, +L.duration || 0), d = +L.duration || 0;
    if (!(span > 0) || !(d > 0)) return refusePlan('failed');
    const twins = R.isMain(id) ? twinsOf(R, R.main[mainIdx(R, id)], map) : [];
    const plan = newPlan('Use one speed'); plan.arranges = false; plan.adopts = false; plan.touched.add(id);
    twins.forEach(t => plan.touched.add(t.id));
    plan.writes.push(() => { [L].concat(twins).forEach(x => { x.speed = span / d; }); });
    plan.live = line('oneSpeed');
    plan.keepSel = true;
    return plan;
  };

  /* VOLUME and FADE act on the sound twin when the clip has one (the original is muted, the twin carries the sound), else on the
     clip. A keyed level keeps its shape (FM.shiftProp: no key at the playhead, the count never changes). A volume above 0 on a muted
     clip is a wish to hear it, so it un-mutes (and drops the Mute clip sound mark, which only ever stood for "muted by that switch"). */
  function soundTarget(R, id, map) {
    const L = map.get(id); if (!L) return null;
    if (R.isMain(id)) { const t = twinsOf(R, R.main[mainIdx(R, id)], map)[0]; if (t) return t; }
    return L;
  }
  S.soundTargetId = function (R, id) { const t = soundTarget(R, id, byIdMap()); return t ? t.id : null; };
  S.planVolume = function (R, id, v) {
    const map = byIdMap(), L = soundTarget(R, id, map);
    if (!L || !(v >= 0) || !isFinite(v)) return refusePlan('gone');
    const t = FM.time || 0;
    const plan = newPlan('Change volume'); plan.arranges = false; plan.adopts = false; plan.touched.add(L.id); plan.keepSel = true;
    plan.writes.push(() => {
      FM.shiftProp(L, 'volume', v, t, { min: 0, max: VOL_HI });
      if (v > 0 && L.muted) { L.muted = false; S.setFlag(L, 'muteByMode', false); }
    });
    plan.after = () => { if (FM.reconcileAudio) FM.reconcileAudio(); };
    plan.live = line('volumeSet', Math.round(v * 100));
    return plan;
  };
  S.planFade = function (R, id, which, sec) {
    const map = byIdMap(), L = soundTarget(R, id, map);
    if (!L || (which !== 'in' && which !== 'out') || !(sec >= 0) || !isFinite(sec)) return refusePlan('gone');
    const s = Math.round(Math.min(sec, Math.max(0, (+L.duration || 0))) * 10) / 10, key = which === 'in' ? 'fadeIn' : 'fadeOut';
    if (Math.abs((+L[key] || 0) - s) < 1e-9) return refusePlan('nothingChanged');
    const plan = newPlan('Change fade'); plan.arranges = false; plan.adopts = false; plan.touched.add(L.id); plan.keepSel = true;
    plan.writes.push(() => { L[key] = s; });
    plan.after = () => { if (FM.reconcileFades) FM.reconcileFades(); };
    plan.live = line('fadeSet', which === 'in' ? 'in' : 'out', s);
    return plan;
  };

  /* REVERSE / UN-REVERSE (a video): the flag on the clip and each twin, nothing else moves (start, length, keys, followers keep their
     times, as Full's toggle does). The frame cache is never built in here (a decode can take seconds on a phone with history muted):
     after the commit the runner's `after` asks for it, and never for a twin (a twin needs only its audio). */
  S.planReverse = function (R, id) {
    const map = byIdMap(), L = map.get(id);
    if (!L) return refusePlan('gone');
    if (L.type !== 'video') return refusePlan('noReverse');
    const twins = R.isMain(id) ? twinsOf(R, R.main[mainIdx(R, id)], map) : [];
    const on = !L.reversed;
    const plan = newPlan(on ? 'Reverse' : 'Play forwards'); plan.arranges = false; plan.adopts = false; plan.touched.add(id); plan.keepSel = true;
    twins.forEach(t => plan.touched.add(t.id));
    plan.writes.push(() => { [L].concat(twins).forEach(x => { x.reversed = on; }); });
    plan.after = async () => {
      if (on && FM.ensureReverseCache) { try { await FM.ensureReverseCache(L); } catch (e) { S.say(line('reverseSlow')); } }
      else if (!on && FM.maybeClearCache) FM.maybeClearCache(L);
      if (FM.requestRender) FM.requestRender();
      if (FM.reconcileAudio) FM.reconcileAudio();
    };
    plan.live = line(on ? 'reversed' : 'forwards');
    return plan;
  };

  /* TAKE SOUND OUT / PUT SOUND BACK (§4.6). Take out: Full's own extractAudio inside a step of ours, so Full's function is untouched;
     the layer it made is found by the ids around the call (it returns nothing) and marked sm.twin by us. Put back: the twin goes
     and the clip is heard again, in one step. A clip that has no sound, or that is already muted, has nothing to take out. */
  const hasSound = L => L && L.type === 'video' && !L.audioOnly && !(L.sm && L.sm.snd === true) && !L.muted && (() => { const m = FM.media && FM.media.get(L.id); return !(m && m.hasAudio === false); })();
  S.canTakeSound = function (R, id) { const L = FM.layerById(FM.scene, id); return !!(L && R.isMain(id) && hasSound(L) && !twinsOf(R, R.main[mainIdx(R, id)], byIdMap()).length); };
  S.planTakeSound = function (R, id) {
    const map = byIdMap(), L = map.get(id);
    if (!L || !R.isMain(id)) return refusePlan('gone');
    if (twinsOf(R, R.main[mainIdx(R, id)], map).length) return refusePlan('alreadyOut');
    if (!hasSound(L)) return refusePlan('noSound');
    const plan = newPlan('Take sound out'); plan.arranges = false; plan.adopts = false; plan.touched.add(id); plan.keepSel = true; plan.mints = true;
    plan.pre.push(async () => {
      const before = new Set(FM.scene.layers.map(l => l.id));
      await FM.extractAudio(L);
      const dup = FM.scene.layers.find(l => !before.has(l.id));
      if (dup) { S.setFlag(dup, 'twin', true); S.setFlag(dup, 'snd', true); S.setFlag(L, 'muteByMode', false); }
    });
    plan.live = line('soundTaken');
    return plan;
  };
  S.planPutSoundBack = function (R, id) {
    const map = byIdMap(), L = map.get(id);
    if (!L || !R.isMain(id)) return refusePlan('gone');
    const twins = twinsOf(R, R.main[mainIdx(R, id)], map);
    if (!twins.length) return refusePlan('noTwin');
    const plan = newPlan('Put sound back'); plan.arranges = false; plan.adopts = false; plan.touched.add(id); plan.keepSel = true;
    twins.forEach(t => { plan.touched.add(t.id); plan.removes.add(t.id); });
    plan.writes.push(() => { L.muted = false; S.setFlag(L, 'muteByMode', false); });
    plan.after = () => { if (FM.reconcileAudio) FM.reconcileAudio(); };
    plan.live = line('soundBack');
    return plan;
  };

  /* MUTE CLIP SOUND (the clip row's 🔈): the mode lives on the document (project.sm.muteClips, it syncs: the mute is part of the
     video). On: every main video not already muted is muted and marked sm.muteByMode (one he muted himself gets no mark). Off: only
     the marked ones are un-muted, never one with a sound twin or a karaoke companion (that would play the sound twice), and a
     mark whose clip is no longer muted is just dropped, so a manual choice is never overwritten. */
  S.muteMode = function () { const P = FM.scene && FM.scene.project; return !!(P && P.sm && P.sm.muteClips === true); };
  function muteIfMode(l) { if (S.muteMode() && l && l.type === 'video' && !l.audioOnly && !(l.sm && l.sm.snd === true) && !l.muted) { l.muted = true; S.setFlag(l, 'muteByMode', true); } }
  S.planMuteClips = function (R, on) {
    const map = byIdMap(), clips = R.main.filter(e => !e.slot).map(e => map.get(e.id)).filter(Boolean);
    if (!clips.length) return refusePlan('noClipHere');
    const P = FM.scene.project;
    if (!!on === S.muteMode()) return refusePlan('nothingChanged');
    const plan = newPlan(on ? 'Mute clip sound' : 'Clip sound back on'); plan.arranges = false; plan.adopts = false; plan.keepSel = true;
    clips.forEach(l => plan.touched.add(l.id));
    plan.writes.push(() => {
      if (on) {
        clips.forEach(l => { if (l.type === 'video' && !l.audioOnly && !l.muted) { l.muted = true; S.setFlag(l, 'muteByMode', true); } });
        if (!P.sm || typeof P.sm !== 'object' || Array.isArray(P.sm)) P.sm = {};
        P.sm.muteClips = true;
      } else {
        clips.forEach(l => {
          if (!(l.sm && l.sm.muteByMode)) return;
          const hasTwin = twinsOf(R, R.main[mainIdx(R, l.id)], map).length > 0 || FM.scene.layers.some(t => t.karaokeOf === l.id);
          S.setFlag(l, 'muteByMode', false);
          if (l.muted && !hasTwin) l.muted = false;
        });
        if (P.sm) { delete P.sm.muteClips; if (!Object.keys(P.sm).length) delete P.sm; }
      }
    });
    plan.after = () => { if (FM.reconcileAudio) FM.reconcileAudio(); };
    plan.live = line(on ? 'clipsMuted' : 'clipsHeard');
    return plan;
  };

  /* REPLACE (a clip's footage, the slot kept). The picker has already run (FM.pickReplacement, at the tap, outside the runner) and
     `nrec` is the decoded record. A shorter file is a tail trim in the same step: replaceMediaWith clamps the length to the new
     source, so the plan ripples by the difference, with the tail trim's own refusals. A sound twin gets the same file (its own
     record, a second decode of the same File) so it stays in step. The swap itself is a `pre` step; its file is written by the
     runner after the commit (plan.mints). */
  S.planReplace = function (R, id, nrec) {
    const map = byIdMap(), L = map.get(id);
    if (!L || !nrec) return refusePlan('gone');
    if (L.type === 'text' || L.type === 'shape' || L.type === 'null' || L.type === 'group' || L.type === 'camera') return refusePlan('replaceBlock');
    const main = R.isMain(id), i = main ? mainIdx(R, id) : -1, ml = MINLEN();
    const d0 = +L.duration || 0;
    let nd = d0;
    if (nrec.kind === 'video' && nrec.duration > 0) {
      const tr = Math.max(0, Math.min(+L.trimStart || 0, nrec.duration - 0.05));
      const avail = FM.maxDurForSource ? FM.maxDurForSource(L, nrec.duration - tr) : (nrec.duration - tr) / (FM.speedAt(L, +L.start || 0) || 1);
      nd = Math.max(0.1, Math.min(d0, avail));
    }
    const dt = nd - d0;
    const plan = newPlan('Replace clip'); plan.touched.add(id); plan.mints = true; plan.keepSel = true; plan.arranges = main && dt < -1e-9; plan.adopts = plan.arranges;
    let twins = [];
    if (main) {
      const c = R.main[i], n = R.main[i + 1] || null;
      twins = twinsOf(R, c, map);
      twins.forEach(t => plan.touched.add(t.id));
      if (dt < -1e-9) {
        if (nd < ml - SLACK) return refusePlan('shortSource');
        if (n && n.seam && n.seam.kind === 'blend') {
          if (nd < 2 * n.seam.amt - SLACK) return refusePlan('fadesNext');
          if (blendOwner(c, n, map) === L) return refusePlan('fadeOwned', { a: S.itemWord(L, R), b: S.itemWord(map.get(n.id), R) });
        }
        if (i > 0 && c.seam && c.seam.kind === 'blend' && nd < 2 * c.seam.amt - SLACK) return refusePlan('fadesBefore');
        const rdR = riderPlan(R, map, tmShift(c.start + d0, dt));
        rdR.attach(plan);
        const newEnd = c.start + nd, twinIds = new Set(twins.map(t => t.id));
        (R.followers[c.id] || []).forEach(fid => {   // the tail trim's follower rules: a title cut off slides back onto its clip (D6), an effect is clamped
          if (twinIds.has(fid)) return;
          const f = map.get(fid), u = R.units[fid]; if (!f) return;
          const fs = +f.start || 0, fd = +f.duration || 0;
          if (fs >= newEnd - R.eps) {
            const s2 = Math.max(c.start, newEnd - fd); addLand(plan, fid, s2);
            if (u && u.kind === 'effect' && fs + fd <= c.end + 1e-9) plan.writes.push(() => { f.duration = Math.max(ml, Math.min(fd, newEnd - s2)); });
          } else if (u && u.kind === 'effect' && fs + fd <= c.end + 1e-9 && fs + fd > newEnd + 1e-9) {
            plan.touched.add(fid); plan.writes.push(() => { f.duration = Math.max(ml, newEnd - fs); });
          }
        });
        const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);
        tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);
        const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
        plan.pulse = [c.id];
      }
    } else if (L.sm && L.sm.tail && Math.abs(dt) > 1e-9) plan.writes.push(() => { S.setFlag(L, 'tail', false); });
    plan.pre.push(async () => {
      await FM.swapInMedia(id, nrec, { noSave: true, simple: true });
      for (const t of twins) {
        let r2 = null; try { r2 = nrec.file ? await FM.loadVideoFile(nrec.file) : null; } catch (e) { r2 = null; }
        if (r2) await FM.swapInMedia(t.id, r2, { noSave: true, noLib: true, simple: true });
      }
    });
    plan.live = line('replaced', S.itemWord(L, R));
    return plan;
  };

  /* ═══════════════ RELEASE 2.5: what a drag needs from the engine (DESIGN §3.8, §3.6 Reorder / Lift / Into row) ═══════════════
     A drag previews in the DOM only and commits through the same S.cmd as its button; these are the three things the buttons did not need. */
  /* THE ARM GATE (§3.8): null, or the reason a hold or a grip must not start. Read when a gesture arms and again on release; the runner's own
     checks stay as the backstop. 'view' / 'comment' / 'outbox' (the room), 'newer', 'offline' / 'live' (a friend who can edit), 'gone',
     'locked', 'busy' (a friend holds it). */
  S.canArrange = function (id, o) {
    const ro = S.roReason(); if (ro) return ro;
    if (S.newerSchema()) return 'newer';
    const g = (o && o.look) ? '' : S.arrangeGate();   // 2.5b: trimming an overlay, text or sound moves nothing else, so a friend who can edit does not shut it (a look, like Volume)
    if (g) return g;
    const map = byIdMap(); if (!map.get(id)) return 'gone';
    if (unitLayers(id, map).some(l => l.locked)) return 'locked';
    if (S.blockers({ touched: new Set([id]) })) return 'busy';
    return null;
  };
  /* the line for a reason S.canArrange returned, through the same refuse() the runner uses. 'locked' is the one reason a gesture does NOT stop at
     (the Simple timeline lets the drag run and the runner asks at the release, with its own Do it anyway, so the retry is one step). */
  S.explain = function (kind, id) { return refuse(kind, { ids: [id] }, S.classify(FM.scene)); };
  /* WHERE A DRAGGED CLIP LANDS: the index j that planReorder takes (before entry j; R.main.length is the end) for a clip whose CENTRE is at
     time tc. The first other clip whose midpoint is after tc is the one it goes before. Pure, so the suite can drive it without a finger. */
  S.moveTargetFor = function (R, id, tc) {
    const i = mainIdx(R, id); if (i < 0) return -1;
    for (let k = 0; k < R.main.length; k++) {
      const e = R.main[k]; if (e.slot || k === i) continue;
      if (tc < (e.start + e.end) / 2) return k;
    }
    return R.main.length;
  };
  /* AN ITEM IN TIME (§3.8 "moves an item in time"): a text, overlay or sound goes to `ns` (clamped at 0), its members with it. Nothing else moves. */
  S.planMoveItem = function (R, id, ns) {
    const map = byIdMap(), l = map.get(id), u = R.units[id];
    if (!l || !u || R.isMain(id)) return refusePlan('gone');
    ns = Math.max(0, +ns);
    const d = ns - (+l.start || 0);
    if (!(Math.abs(d) > 1e-6)) return refusePlan('noMove');
    const plan = newPlan('Move item');
    unitLayers(id, map).forEach(m => addMove(plan, m.id, d));
    plan.touched.add(id);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = ns;
    plan.live = line('itemMoved', S.itemWord(l, R), ns);
    plan.pulse = [id];
    return plan;
  };
  /* TRIM AN ITEM'S EDGE (2.5b, DESIGN §8.2: "its trim grips work on that drawing"; the Gestures line: "edge grips trim with a length readout"): a text, overlay or sound that is not in the clip row
     gets its own length changed through the same trimClipEdge maths as a clip, and NOTHING else moves (no ripple, no followers: it is not a clip). A head trim moves its start by the amount
     trimmed and its footage with it (keys are absolute time, so they stay where they are, which is exactly "the same footage on the same frame"). A look, not an arrangement. */
  S.planTrimItem = function (R, id, side, t) {
    const map = byIdMap(), L = map.get(id), u = R.units[id];
    if (!L || !u || R.isMain(id)) return refusePlan('gone');
    if (L.type === 'group' || L.type === 'camera' || u.kind === 'captions' || u.kind === 'block' || u.kind === 'fullOnly' || u.kind === 'undecided' || (L.sm && L.sm.twin) || S.isTwinOf(L, null, R.eps)) return refusePlan('trimBlock');
    if (side !== 'head' && side !== 'tail') return refusePlan('gone');
    const s = +L.start || 0, d = +L.duration || 0, ml = MINLEN();
    if (side === 'tail' && t - s < ml - SLACK) return refusePlan('trimEdge');
    if (side === 'head' && (s + d) - t < ml - SLACK) return refusePlan('trimEdge');
    const r = FM.trimClipEdge(L, side, side === 'tail' ? t - (s + d) : t - s, srcDurOf(L));
    if (Math.abs(r.landed) < 1e-9) return refusePlan((side === 'tail' ? t > s + d : t < s) ? 'shortSource' : 'nothingMore');
    const plan = newPlan('Trim item'); plan.arranges = false; plan.adopts = false; plan.touched.add(id); plan.keepSel = true;
    plan.writes.push(() => {
      L.duration = r.duration; if (L.type === 'video') L.trimStart = r.trimStart;
      if (side === 'head') { L.start = r.start; if (FM.shiftLayerFxClock) FM.shiftLayerFxClock(L, r.fxShift); }
    });
    plan.after = () => { if (FM.reconcileAudio) FM.reconcileAudio(); };
    plan.live = line('trimmed', S.itemWord(L, R));
    plan.pulse = [id];
    return plan;
  };
  Object.assign(S.cmd, {
    trimItem(id, side, t) { return S.edit('Trim item', R => S.planTrimItem(R, id, side, t)); },
    moveTo(id, j) { return S.edit('Move clip', R => S.planReorder(R, id, j)); },
    moveItem(id, ns) { return S.edit('Move item', R => S.planMoveItem(R, id, ns)); }
  });

  Object.assign(S.cmd, {
    append(files) { return afterRead(files, picked => S.edit('Add clips', R => S.planAppend(R, picked))); },
    insert(files, j) { return afterRead(files, picked => S.edit('Add clips', R => S.planInsert(R, picked, j))); },
    move(id, dir) { return S.edit('Move clip', R => { const j = S.moveIndexFor(R, id, dir); return j < 0 ? refusePlan(dir < 0 ? 'atStart' : 'atEnd') : S.planReorder(R, id, j); }); },
    lift(id) { return S.edit('Lift off', R => S.planLift(R, id)); },
    intoRow(id) { return S.edit('Put in the clip row', R => S.planIntoRow(R, id)); },
    stay(id, on) { return S.edit(on ? 'Stay put' : 'Follow clip', R => S.planStay(R, id, on)); },
    stayMany(ids, on) { ids = ids.slice(); return S.edit(on ? 'Stay put' : 'Follow clip', R => S.planStayMany(R, ids, on)); },
    z(id, dir) { return S.edit(dir > 0 ? 'Forward' : 'Back', R => S.planZ(R, id, dir)); },
    closeAll() { return S.edit('Close all gaps', R => S.planCloseAll(R)); },
    endWithVideo() { return S.edit('End with the video', R => S.planEndWithVideo(R)); },
    addText() { return S.edit('Add text', R => S.planAddText(R)); },
    addOverlay(files) { return afterRead(files, picked => S.edit('Add overlay', R => S.planAddOverlay(R, picked))); },
    addMusic(files) { return afterRead(files, picked => S.edit('Add music', R => S.planAddMusic(R, picked))); },
    length(id, newDur) { return S.edit('Trim clip', R => S.planTrimTail(R, id, newDur, { typed: true })); },
    trimStartBy(id, h) { return S.edit('Trim clip', R => S.planTrimHead(R, id, h, { typed: true })); },
    /* release 2.3 */
    speed(id, sp) { return S.edit('Change speed', R => R.isMain(id) ? S.planSpeed(R, id, sp) : S.planSpeedItem(R, id, sp)); },
    useOneSpeed(id) { return S.edit('Use one speed', R => S.planUseOneSpeed(R, id)); },
    volume(id, v) { return S.edit('Change volume', R => S.planVolume(R, id, v)); },
    fade(id, which, sec) { return S.edit('Change fade', R => S.planFade(R, id, which, sec)); },
    reverse(id) { return S.edit('Reverse', R => S.planReverse(R, id)); },
    takeSoundOut(id) { return S.edit('Take sound out', R => S.planTakeSound(R, id)); },
    putSoundBack(id) { return S.edit('Put sound back', R => S.planPutSoundBack(R, id)); },
    muteClips(on) { return S.edit(on ? 'Mute clip sound' : 'Clip sound back on', R => S.planMuteClips(R, on)); },
    replace(id, nrec) { return S.edit('Replace clip', R => S.planReplace(R, id, nrec)); },
    /* the picker runs HERE, at the tap, never inside the runner (a dismissed picker can leave its promise unsettled): then the swap is one step.
       A project switched away from while the file decoded lets the file go instead of landing it in the wrong project. */
    async pickReplace(id) {
      const pid = FM.startedIn ? FM.startedIn() : null;
      const nrec = await FM.pickReplacement(id);
      if (!nrec) return false;
      if (FM.stillIn && !FM.stillIn(pid)) { if (FM.letGoMedia) FM.letGoMedia(nrec); return false; }
      return S.cmd.replace(id, nrec);
    }
  });

  /* 2.6 (§10.2 door 2a): the lease half only, by layer ids: who else holds any of them, or null. Read-only. */
  S.blockersForLayers = function (ids) { return S.blockers({ touched: new Set(ids || []) }); };
  S.undoBlocked = function (b) {
    if (FM.editor && FM.editor.isSimple && FM.editor.isSimple()) refuse('busy', b, S.read(FM.scene));
    else if (FM.toast) FM.toast("Can't undo — it has changed since");
  };
  S.undoGate = function () { return S.arrangeGate(); };
  /* 2.6 (§11): ONE LINE PER UNDO that skipped part of itself because somebody else changed it since. In Full the session's own toast says it (today's, word for
     word); in Simple the session stays quiet and this builds the one #sm-say line, with the full wording as its title. A plain undo says nothing here. */
  S.undoSaid = function (ls, kind) {
    if (!ls || !(ls.soft || ls.adoptKept) || !(FM.editor && FM.editor.isSimple && FM.editor.isSimple())) return;
    const who = ls.who ? S.nameWord(ls.who) : '';
    let text = !ls.soft ? line('undid') : who ? line('undidExcept', who) : line('undidExceptSome');
    if (ls.adoptKept) text += ' · ' + line('adoptStays');   // §5.3: the edit adoption rode on undid, the main track stays as set up
    S.say(text, { title: ls.soft ? line('undidTitle', ls.label || '', ls.who || '') : text, refusal: 'softUndo',
      buttons: (ls.soft && ls.arr && kind === 'undo') ? [{ label: line('closeGaps'), fn: () => S.cmd.closeAll() }] : [] });
  };  /* runStep's refusal of an arranging step while someone else can edit (§10.2 door 2). In Simple it is the gate's line;
     in Full it is Full's existing undo-refusal toast, word for word (§0.4 N4): no new words in Full. */

  /* TRANSITIONS (2.7, DESIGN §12.1): `trIn = {type, d}` on the incoming main clip of a JOIN seam. A look edit only: nothing moves, no
     adoption, no ripple. A seam that is a gap, an overlap or a card refuses in one plain line. */
  S.joinInto = function (R, id) {
    const i = mainIdx(R, id);
    if (i < 1) return null;
    const e = R.main[i], prev = R.main[i - 1];
    if (!e || e.slot || !prev || prev.slot || !e.seam || e.seam.kind !== 'join') return null;
    return { inc: e.id, out: prev.id };
  };
  S.planTransition = function (R, id, type, d) {
    const map = byIdMap(), L = map.get(id);
    if (!L) return refusePlan('gone');
    if (!S.joinInto(R, id)) return refusePlan('noTransition');
    const none = type == null || type === 'none';
    if (!none && FM.TR_TYPES.indexOf(type) < 0) return refusePlan('gone');
    const cur = L.trIn || null;
    d = none ? 0 : Math.round(Math.max(FM.TR_MIN, Math.min(FM.TR_MAX, d == null ? (cur ? cur.d : FM.TR_DEFAULT) : +d)) * 10) / 10;
    if (none ? !cur : (cur && cur.type === type && Math.abs(cur.d - d) < 1e-9)) return refusePlan('nothingChanged');
    const plan = newPlan(none ? 'No transition' : 'Transition'); plan.arranges = false; plan.adopts = true; plan.touched.add(id); plan.keepSel = true; plan.keepsTransitions = true;
    plan.writes.push(() => { if (none) delete L.trIn; else { L.trIn = { type: type, d: d }; const P = FM.scene.project; if (P.sm && !(P.sm.v >= FM.SM_V)) P.sm.v = FM.SM_V; } });   // a file that holds a transition is stamped as this release's, so an older build opens it read-only instead of dropping the transitions
    plan.live = none ? line('trNone') : line('trSet', type, d);
    return plan;
  };
  S.planTransitionAll = function (R, id) {
    const map = byIdMap(), L = map.get(id);
    if (!L || !L.trIn) return refusePlan('gone');
    const tr = { type: L.trIn.type, d: L.trIn.d }, ids = [];
    R.main.forEach((e, i) => { if (i > 0 && !e.slot && e.id !== id && S.joinInto(R, e.id)) { const l = map.get(e.id); if (l && !(l.trIn && l.trIn.type === tr.type && l.trIn.d === tr.d)) ids.push(e.id); } });
    if (!ids.length) return refusePlan('nothingChanged');
    const plan = newPlan('Transition on every cut'); plan.arranges = false; plan.adopts = true; plan.keepSel = true; plan.keepsTransitions = true;
    ids.forEach(x => plan.touched.add(x));
    plan.writes.push(() => { ids.forEach(x => { const l = FM.layerById(FM.scene, x); if (l) l.trIn = { type: tr.type, d: tr.d }; }); });
    plan.live = line('trAll', ids.length + 1);
    return plan;
  };
  /* THE DROP RULE (all plans): a transition belongs to ONE cut. After any edit, a clip whose out-neighbour changed, or that is new (a copy,
     a split half), or whose seam is no longer a join, loses its trIn, and the line says so. `pre` is the {incId: outId} map from before. */
  S.trPairs = function () {
    const m = new Map();
    FM.scene.layers.forEach(l => { if (l.trIn) { const o = FM.transitionOutOf ? FM.transitionOutOf(FM.scene, l) : null; m.set(l.id, o ? o.id : null); } });
    return m;
  };
  S.dropStaleTransitions = function (pre) {
    let n = 0;
    FM.scene.layers.forEach(l => {
      if (!l.trIn) return;
      const o = FM.transitionOutOf(FM.scene, l);
      if (!pre.has(l.id) || !o || pre.get(l.id) !== o.id) { delete l.trIn; n++; }
    });
    return n;
  };
  /* TURN INTO A TRANSITION (§12.1) on a BLEND seam: the two clips meet at the middle of the overlap with no ripple (a's tail trimmed by amt/2,
     b's head by amt/2, b keeps its end), b.trIn = a crossfade of length amt, and the opacity keys the blend counted are gone (the static value
     comes back, never an empty key list). A follower of b that began inside the cut-away head slides forward onto b's new start (D6). */
  S.planTurnIntoTransition = function (R, id) {
    const map = byIdMap(), j = mainIdx(R, id);
    if (j < 1) return refusePlan('noSeam');
    const e = R.main[j], pe = R.main[j - 1], sm = e.seam;
    if (!sm || sm.kind !== 'blend' || e.slot || pe.slot) return refusePlan('noSeam');
    const La = map.get(pe.id), Lb = map.get(e.id), amt = sm.amt, half = amt / 2;
    if (!La || !Lb || La.type === 'group' || Lb.type === 'group') return refusePlan('splitBlock');
    if (FM.TR_TYPES.indexOf('crossfade') < 0 || !(amt >= FM.TR_MIN - 1e-9)) return refusePlan('noTransition');
    const owner = blendOwner(pe, e, map), lo = e.start - R.eps, hi = pe.end + R.eps;
    const rA = FM.trimClipEdge(La, 'tail', -half, srcDurOf(La)), rB = FM.trimClipEdge(Lb, 'head', half, srcDurOf(Lb));
    if (Math.abs(rA.duration - (La.duration - half)) > 1e-6 || Math.abs(rB.landed - half) > 1e-6) return refusePlan('nothingMore');
    const plan = newPlan('Turn into a transition'); plan.touched.add(pe.id); plan.touched.add(e.id);
    const twA = twinsOf(R, pe, map), twB = twinsOf(R, e, map), twIds = new Set(twA.concat(twB).map(t => t.id));
    const M = La.start + rA.duration, dB = Lb.start + Lb.duration - M;
    plan.writes.push(() => {
      stripOwned(owner, lo, hi, owner === Lb ? 'in' : 'out');
      [La].concat(twA).forEach(x => { x.duration = rA.duration; if (x.type === 'video') x.trimStart = rA.trimStart; });
      [Lb].concat(twB).forEach(x => { x.start = M; x.duration = dB; if (x.type === 'video') x.trimStart = rB.trimStart; FM.shiftLayerFxClock(x, rB.fxShift); });
      Lb.trIn = { type: 'crossfade', d: Math.round(Math.min(FM.TR_MAX, Math.max(FM.TR_MIN, amt)) * 10) / 10 };
      const P = FM.scene.project; if (P.sm && !(P.sm.v >= FM.SM_V)) P.sm.v = FM.SM_V;
    });
    twA.concat(twB).forEach(t => plan.touched.add(t.id));
    (R.followers[e.id] || []).forEach(fid => {   // D6: its first frame was cut away, so it keeps its host
      if (twIds.has(fid)) return;
      const f = map.get(fid); if (!f) return;
      if ((+f.start || 0) < M - R.eps) addLand(plan, fid, M);
    });
    plan.keepsTransitions = true;
    plan.live = line('trTurned');
    return plan;
  };
  S.undoRefused = function (why) {
    if (FM.editor && FM.editor.isSimple && FM.editor.isSimple()) refuse(why || 'live');
    else if (FM.toast) FM.toast("Can't undo — it has changed since");
  };
})(window.FM);
