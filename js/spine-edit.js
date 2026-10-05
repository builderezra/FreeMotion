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
      if (tailOk(l, u) && first && Math.abs(e - R.trackEnd) <= R.eps) { setTail(l, e); out.push('L/' + id + '/sm/tail'); }
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
             mints: false };   // mints: the plan made a new media record ({noSave}), so the runner saves its file at once
  }
  function addMove(p, id, d) { p.moves.set(id, (p.moves.get(id) || 0) + d); p.touched.add(id); }
  function addLand(p, id, t) { p.lands.set(id, t); p.touched.add(id); }
  const refusePlan = (kind, o) => ({ refuse: kind, refuseOpts: o || {} });

  /* THE ONE RIPPLE (§3.4), by main-track ORDER, with exact landings (§3.1): entries from `from` move by dt; a seam that was a
     float-noise join or a hairline, and the first seam when `landFirst`, lands bit-exact on the new end before it, and
     every later entry, follower and the tail take that correction too. Returns the total displacement of the last entry. */
  function ripple(p, R, from, dt, skip, prevEnd, landFirst) {
    let acc = 0, last = null;
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
      }
      last = d;
    }
    return { last: last, acc: acc };
  }
  /* The tail (§4.3) moves by the change of trackEnd; one that sat bit-exact on the old end lands on the new one. */
  function tailMove(p, R, newEnd, map) {
    const d = newEnd - R.trackEnd;
    if (!d) return;
    R.tail.forEach(id => { const l = map.get(id); if (!l) return; if (Math.abs((+l.start || 0) - R.trackEnd) < 1e-9) addLand(p, id, newEnd); else addMove(p, id, d); });
  }

  /* Release 2.1 does not move riders, camera keys or a cut item's keys yet (2.4): a command that would is refused. `from` is
     the earliest project time the command changes; a rider or the camera with anything at or after it would need a map. */
  function riderBlock(R, from, map) {
    for (let k = 0; k < R.riders.length; k++) {
      const l = map.get(R.riders[k]); if (!l) continue;
      const end = (+l.start || 0) + (+l.duration || 0);
      if (end > from + R.eps) return { kind: 'riders', name: S.itemWord(l, R) };
    }
    for (let k = 0; k < R.fullOnly.length; k++) {
      const l = map.get(R.fullOnly[k]); if (!l || l.type !== 'camera' || (l.sm && l.sm.stay)) continue;
      const keyed = (FM.timedLists ? FM.timedLists(l) : FM.animatedProps(l)).some(pp => pp.kf.some(kk => kk.t >= from - R.eps));
      const windowed = (+l.start || 0) > 0 && (+l.start || 0) + (+l.duration || 0) > from + R.eps;
      if (keyed || windowed) return { kind: 'camera' };
    }
    return null;
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
        if (Math.abs(dx - dy) > 1e-9 && timeVarying(y)) return { kind: 'slip', via: refs[k].via };
      }
    }
    return null;
  }

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
      else return refusePlan('fadeOwned', { a: S.itemWord(map.get(p.id), R), b: S.itemWord(L, R) });
    }
    const rb = riderBlock(R, a, map); if (rb) return refusePlan(rb.kind, rb);
    const removes = [c.id].concat(R.followers[c.id] || []);
    removes.forEach(x => { unitLayers(x, map).forEach(l => plan.removes.add(l.id)); plan.touched.add(x); });
    plan.counts.followers = (R.followers[c.id] || []).filter(x => !S.isTwinOf(map.get(x), L, R.eps)).length;
    /* (i)–(iii) long items cut through the delete map, keys refused until 2.4 */
    const ml = MINLEN(), len = b - a;
    const cut = Object.keys(R.units).filter(uid => {
      const u = R.units[uid], l = map.get(uid);
      if (!l || !u.long || u.kind === 'captions' || u.kind === 'fullOnly' || u.kind === 'block' || u.kind === 'main') return false;
      if (R.tail.indexOf(uid) >= 0 || (l.sm && l.sm.stay) || l.type === 'group') return false;
      const s = +l.start || 0, e = s + (+l.duration || 0);
      return e > a + 1e-9 && s < b - 1e-9;
    });
    for (let k = 0; k < cut.length; k++) {
      const l = map.get(cut[k]), s = +l.start || 0, e = s + (+l.duration || 0);
      if (S.keyCount(l) > 0) return refusePlan('cutKeys', { name: S.itemWord(l, R) });
      const media = l.type === 'video';
      if (s >= a - 1e-9) {                                   // (i) starts inside the deleted span
        if (e - b < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.keyless.add(l.id); addLand(plan, l.id, a);
        plan.writes.push(() => {
          if (media) { const r = FM.trimClipEdge(l, 'head', b - s, srcDurOf(l)); l.duration = r.duration; l.trimStart = r.trimStart; FM.shiftLayerFxClock(l, r.fxShift); }
          else { l.duration = Math.max(ml, e - b); FM.shiftLayerFxClock(l, b - s); }
        });
      } else if (e <= b + 1e-9) {                             // (ii) ends inside it
        if (a - s < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.touched.add(l.id);
        plan.writes.push(() => { l.duration = Math.max(ml, a - s); });
      } else if (!media) {                                    // (iii) a middle cut of something with no source clock
        plan.touched.add(l.id);
        plan.writes.push(() => { l.duration = Math.max(ml, l.duration - len); });
      } else {                                                // (iii) a middle cut of a video or sound: split, then trim B
        if (a - s < ml - SLACK || e - b < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.touched.add(l.id);
        plan.pre.push(async () => {
          const t0 = FM.time; FM.time = a;
          try { await FM.splitLayer(l.id); } finally { FM.time = t0; }
          const B = FM.scene.layers.find(x => x !== l && x.splitOf && x.splitOf === l.splitOf && Math.abs((+x.start || 0) - a) < 1e-6);
          if (!B) throw new Error('the cut item did not split');
          const r = FM.trimClipEdge(B, 'head', len, srcDurOf(B));
          B.duration = r.duration; B.trimStart = r.trimStart; FM.shiftLayerFxClock(B, r.fxShift);
          S.setFlag(B, 'stay', true); S.setFlag(l, 'stay', true);
          plan.resized.add(B.id);   // the cut made this length, not he: a whole-video piece keeps sm.tail and the fit re-seats it (§4.3)
        });
      }
      plan.resized.add(l.id);
      plan.counts.cut = (plan.counts.cut || 0) + 1;
    }
    const prevEnd = p ? p.end : null;
    const landFirst = !!(p && (isFloatJoin(R, i) || plan.counts.fade));
    const rp = ripple(plan, R, i + 1, dt, new Set([c.id]), prevEnd, landFirst);
    /* the new main-track end: the last clip moved by the ripple, or (c last) the clip before it, or c's start when c was alone */
    const lastClipIdx = (() => { for (let k = R.main.length - 1; k >= 0; k--) if (!R.main[k].slot && k !== i) return k; return -1; })();
    const newEnd = lastClipIdx > i ? R.main[lastClipIdx].end + (rp.last == null ? dt : rp.last) : (lastClipIdx >= 0 ? R.main[lastClipIdx].end : a);
    tailMove(plan, R, newEnd, map);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = n ? a : Math.max(0, newEnd);
    plan.selectNone = true;
    const nf = plan.counts.followers;
    plan.say = nf ? line('deletedWith', nf) : null;
    plan.live = nf ? null : line('deleted');
    if (plan.counts.cut) plan.say = (plan.say || line('deleted')) + ' · ' + line('keptRunsOn', plan.counts.cut);
    if (plan.counts.fade) plan.say = (plan.say || line('deleted')) + ' · ' + line('fadeWent');
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
      if (blendOwner(c, n, map) === L) return refusePlan('fadeOwned', { a: S.itemWord(L, R), b: S.itemWord(map.get(n.id), R) });
    }
    /* the blend with the clip BEFORE counts too (§3.1: "a trim of either clip stops at newDuration ≥ 2·amt"): its seam does
       not move, but a shorter c lowers blendMax under amt and the crossfade would read as a red overlap */
    if (i > 0 && c.seam && c.seam.kind === 'blend' && newDur < 2 * c.seam.amt - SLACK) return refusePlan('fadesBefore');
    const r = FM.trimClipEdge(L, 'tail', newDur - d0, srcDurOf(L));
    if (o.typed && Math.abs(r.duration - newDur) > 1 / fps()) return refusePlan(newDur > d0 ? 'shortSource' : 'nothingMore');
    const dt = r.duration - d0;
    if (Math.abs(dt) < 1e-9) return refusePlan(newDur > d0 ? 'shortSource' : 'nothingMore');
    const rb = riderBlock(R, c.start + Math.min(d0, r.duration), map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Trim clip'); plan.touched.add(c.id);
    const twins = twinsOf(R, c, map), twinIds = new Set(twins.map(t => t.id));
    plan.writes.push(() => {
      [L].concat(twins).forEach(x => { x.duration = r.duration; if (x.type === 'video') x.trimStart = r.trimStart; });
    });
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
    tailMove(plan, R, R.trackEnd + (rp.last == null ? dt : rp.last), map);
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
      if (blendOwner(p, c, map) === L) return refusePlan('fadeOwned', { a: S.itemWord(map.get(p.id), R), b: S.itemWord(L, R) });
    }
    /* …and the blend with the clip AFTER (§3.1, either clip): n slides back by the trim and keeps its overlap, so a c shorter
       than 2·amt would turn the crossfade into a red overlap */
    const nx = R.main[i + 1] || null;
    if (nx && nx.seam && nx.seam.kind === 'blend' && d0 - h < 2 * nx.seam.amt - SLACK) return refusePlan('fadesNext');
    const r = FM.trimClipEdge(L, 'head', h, srcDurOf(L));
    const Lnd = r.landed;
    if (o.typed && Math.abs(Lnd - h) > 1 / fps()) return refusePlan(h < 0 ? 'videoStart' : 'nothingMore');
    if (Math.abs(Lnd) < 1e-9) return refusePlan(h < 0 ? 'videoStart' : 'nothingMore');
    const rb = riderBlock(R, c.start, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Trim clip'); plan.touched.add(c.id);
    const twins = twinsOf(R, c, map), twinIds = new Set(twins.map(t => t.id));
    plan.writes.push(() => {
      [L].concat(twins).forEach(x => {
        x.duration = r.duration; if (x.type === 'video') x.trimStart = r.trimStart;
        FM.shiftLayerFxClock(x, r.fxShift); S.shiftKeys(x, -Lnd);
      });
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
    tailMove(plan, R, R.trackEnd + (rp.last == null ? -Lnd : rp.last), map);
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
    const rb = riderBlock(R, Math.min(e.start, prevEnd), map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan(sm.kind === 'gap' ? 'Close gap' : 'Fix overlap');
    const rp = ripple(plan, R, j, dt, new Set(), prevEnd, true);
    tailMove(plan, R, R.trackEnd + (rp.last == null ? dt : rp.last), map);
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
    if ((n && n.seam && n.seam.kind === 'blend' && blendOwner(c, n, map) === L) || (p && c.seam && c.seam.kind === 'blend' && blendOwner(p, c, map) === L))
      return refusePlan('fadeOwned', { a: S.itemWord(L, R), b: S.itemWord(map.get((n || p).id), R) });
    const len = +L.duration || 0, target = (+L.start || 0) + len;
    const rb = riderBlock(R, target, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Duplicate clip'); plan.touched.add(c.id);
    const twins = twinsOf(R, c, map);
    plan.pre.push(async () => {
      const dupId = await FM.duplicateLayer(L.id, false, { noSave: true });
      const dup = dupId && FM.layerById(FM.scene, dupId);
      if (!dup) throw new Error('duplicate refused');
      plan.mints = true;
      S.setFlag(dup, 'main', true);                         // put back after onCopy stripped it: the one route that does (§12.2)
      const d = target - (+dup.start || 0); dup.start = target; S.shiftKeys(dup, d);
      for (const t of twins) {
        const tid = await FM.duplicateLayer(t.id, true, { noSave: true });
        const td = tid && FM.layerById(FM.scene, tid);
        if (!td) continue;
        const dd = target - (+td.start || 0); td.start = target; S.shiftKeys(td, dd);
        if (td.karaokeOf === L.id) td.karaokeOf = dupId;
      }
      plan.selectId = dupId;
    });
    const rp = ripple(plan, R, i + 1, len, new Set(), target + len, false);
    tailMove(plan, R, R.trackEnd + (rp.last == null ? len : rp.last), map);
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
  function refuse(kind, o, R) {
    o = o || {};
    const full = { label: line('openFull'), fn: () => { if (FM.editor && FM.editor.request) FM.editor.request('full', { hop: true }); } };   // a hop: no editor memory (Phase 1 review R1)
    let text = '', buttons = [];
    switch (kind) {
      case 'locked': text = lockedLine(o.ids || [], R, byIdMap()); if (o.retry) buttons = [{ label: line('doAnyway'), fn: o.retry }]; break;
      case 'live': {
        const C = FM.collab, s = C && C.session;
        if (s && !s.isOwner) { text = line('liveGuest'); buttons = [full]; break; }
        const H = s && s.host, eds = H && H.members ? Object.keys(H.members).filter(m => m !== H.ownerMid && H.members[m] && H.members[m].role === 'editor') : [];
        text = eds.length === 1 ? line('liveOwner1', S.nameWord(H.members[eds[0]].name)) : line('liveOwnerN', Math.max(2, eds.length));
        buttons = [full]; break;
      }
      case 'offline': text = (FM.collab && FM.collab.isLinkedCopy && FM.collab.isLinkedCopy()) ? line('offlineCopy') : line('offlineOwner'); break;
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
      default: text = line(kind) || line('failed');
        if (kind === 'splitBlock' || kind === 'trimBlock') buttons = [full];
    }
    S.say(text, { buttons: buttons, refusal: kind, ids: o.ids });
    S.lastRefusal = kind;
    return false;
  }
  S.nameWord = function (name) { const n = String(name || '').trim(); return n.length > 10 ? n.slice(0, 10) + '…' : (n || line('someone')); };
  S._refuse = refuse;

  /* ═══ THE RUNNER (§3.7): one edit = one undo step = one collab transaction. Single flight, then a FIFO of four that
     stores each tap's intent; never coalesced. */
  S.running = false;
  S.queue = [];
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
      if (FM.history && FM.history.isMuted && FM.history.isMuted()) return;
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
      const plan = makePlan(R);
      if (!plan) return false;
      if (plan.refuse) return refuse(plan.refuse, plan.refuseOpts, R);
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
      const sel0 = FM.scene.selectedId;
      let ok = false, notes = [];
      try {
        if (opts.unlock) lk.forEach(id => unitLayers(id, map).forEach(l => { if (l.locked) { l.locked = false; l._smRelock = true; } }));
        if (!R.adopted && plan.adopts) S.adopt(R);
        if (gated) S.pinStrays(R);
        await applyPlan(plan);
        const R2 = S.classify(FM.scene);
        if (gated) { notes = S.fitTails(R2, plan); pinTailsAfter(R2); refitTransparentGroups(R2); }
        markCuts(plan.touched);
        FM.scene.layers.forEach(l => { if (l._smRelock) { l.locked = true; delete l._smRelock; } });
        ok = true;
      } catch (e) {
        if (FM.reportError) { try { FM.reportError('Simple edit failed: ' + label, e); } catch (x) {} }
      } finally { FM.history.unmute(); muted = false; }
      if (!ok) { FM.scene.layers.forEach(l => { delete l._smRelock; }); restorePreEdit(pre); return refuse('failed'); }
      if (plan.selectNone) { FM.scene.selectedId = null; FM.scene.selectedIds = []; }
      else if (plan.selectId && FM.layerById(FM.scene, plan.selectId)) { FM.scene.selectedId = plan.selectId; FM.scene.selectedIds = [plan.selectId]; }
      else if (sel0 && FM.layerById(FM.scene, sel0)) { FM.scene.selectedId = sel0; FM.scene.selectedIds = [sel0]; }
      FM.refreshAll();
      if (plan.time != null && !FM.playing) { const P = FM.scene.project; FM.time = Math.max(0, Math.min(P.duration || 0, plan.time)); if (FM.seekVideosToTime) FM.seekVideosToTime(); if (FM.timeline && FM.timeline.updatePlayhead) FM.timeline.updatePlayhead(); }
      FM.history.commit({ label: label, ed: 's', arr: gated });
      /* a new media record (a duplicate's copy) is written NOW, not on the 600 ms autosave: a hide flush cancels that and writes
         the document only, so the copy came back blank (queue 681). Saved after the commit, so the finished document is what
         lands — the reason for {noSave} (nothing un-rippled on disk mid-run) still holds. */
      if (plan.mints && FM.storage && FM.storage.save) FM.storage.save();
      if (FM.textEdit && FM.textEdit.resync) FM.textEdit.resync();
      speakDone(plan, notes);
      return true;
    } finally {
      if (muted) FM.history.unmute();
      S.running = false; document.body.classList.remove('sm-running');
      S.drain();
    }
  };
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
    if (notes && notes.length) text = (text || live || '') + ' · ' + notes.join(' · ');
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
    duplicate(id) { return S.edit('Duplicate clip', R => S.planDuplicate(R, id)); }
  };
  S.undoGate = function () { return S.arrangeGate(); };
  /* runStep's refusal of an arranging step while someone else can edit (§10.2 door 2). In Simple it is the gate's line;
     in Full it is Full's existing undo-refusal toast, word for word (§0.4 N4): no new words in Full. */
  S.undoRefused = function (why) {
    if (FM.editor && FM.editor.isSimple && FM.editor.isSimple()) refuse(why || 'live');
    else if (FM.toast) FM.toast("Can't undo — it has changed since");
  };
})(window.FM);
