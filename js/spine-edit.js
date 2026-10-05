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

  /* Release 2.1 does not move riders, camera keys or a cut item's keys yet (2.4): a command that would is refused. `from` is
     the earliest project time the command changes; a rider or the camera with anything at or after it would need a map. */
  function riderBlock(R, from, map) {
    for (let k = 0; k < R.riders.length; k++) {
      const l = map.get(R.riders[k]); if (!l) continue;
      const end = (+l.start || 0) + (+l.duration || 0);
      if (end > from + R.eps) return { kind: 'riders', name: S.itemWord(l, R) };
    }
    return cameraBlock(R, from, map);
  }
  /* The camera half alone: Append moves only the tail, so riders wholly after T stay a listed 2.4 gap, but a keyed camera
     over the end card is not — it refuses rather than let the zoom play over the new clips (§3.10 rule 3e; review finding 5) */
  function cameraBlock(R, from, map) {
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
    /* (i)–(iii) long items cut through the delete map, keys refused until 2.4. The time that goes is [ca, b): when c's own
       fade-in went with it, p still shows over [a, p.end) and n lands at p.end, so what played at b now plays at p.end — the
       cut starts there and len = −dt, never b − a (a voice-over ran ahead of the picture by the fade; review finding 18) */
    const ca = (plan.counts.fade && n) ? p.end : a;
    const ml = MINLEN(), len = b - ca;
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
      if (S.keyCount(l) > 0 || (FM.isAnimated && FM.isAnimated(l.speed))) return refusePlan('cutKeys', { name: S.itemWord(l, R) });
      const media = l.type === 'video';
      if (s >= ca - 1e-9) {                                  // (i) starts inside the deleted span
        if (e - b < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.keyless.add(l.id); addLand(plan, l.id, ca);
        plan.writes.push(() => {
          if (media) { const r = FM.trimClipEdge(l, 'head', b - s, srcDurOf(l)); l.duration = r.duration; l.trimStart = r.trimStart; FM.shiftLayerFxClock(l, r.fxShift); }
          else { l.duration = Math.max(ml, e - b); FM.shiftLayerFxClock(l, b - s); }
        });
      } else if (e <= b + 1e-9) {                             // (ii) ends inside it
        if (ca - s < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.touched.add(l.id);
        plan.writes.push(() => { l.duration = Math.max(ml, ca - s); });
      } else if (!media) {                                    // (iii) a middle cut of something with no source clock
        plan.touched.add(l.id);
        plan.writes.push(() => { l.duration = Math.max(ml, l.duration - len); });
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
    const newEnd = lastClipIdx > i ? (rp.end != null ? rp.end : R.main[lastClipIdx].end + (rp.last == null ? dt : rp.last)) : (lastClipIdx >= 0 ? R.main[lastClipIdx].end : a);
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
    tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);   // c last: its start + the new duration, bit for bit
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
    tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);   // c last: its start never moves, so its end is start + the new duration
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
    tailMove(plan, R, rp.end != null ? rp.end : R.trackEnd + (rp.last == null ? dt : rp.last), map);
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
      plan.mints = true; plan.copies.push([L.id, dupId]);
      S.setFlag(dup, 'main', true);                         // put back after onCopy stripped it: the one route that does (§12.2)
      const d = target - (+dup.start || 0); dup.start = target; S.shiftKeys(dup, d);
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
      case 'insertFade': text = line('insertFade', o.a, o.b); break;   // 2.2: the two clip numbers (DESIGN §3.11)
      default: text = line(kind) || line('failed');
        if (kind === 'splitBlock' || kind === 'trimBlock' || kind === 'liftBlock') buttons = [full];
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
      const sel0 = FM.scene.selectedId, sels0 = (FM.scene.selectedIds || []).slice();
      /* D7's Do it anyway: the ids it unlocked are held HERE, never as a mark on the layer — FM.cloneLayer drops every '_' key,
         so a split's second half, a cut item's piece and a copy all came out unlocked (review finding 14) */
      const ids0 = new Set(FM.scene.layers.map(l => l.id)), relock = new Set();
      let ok = false, notes = [];
      try {
        if (opts.unlock) lk.forEach(id => unitLayers(id, map).forEach(l => { if (l.locked) { l.locked = false; relock.add(l.id); } }));
        if (!R.adopted && plan.adopts) S.adopt(R);
        if (gated) S.pinStrays(R);
        await applyPlan(plan);
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
      if (plan.time != null && !FM.playing) { const P = FM.scene.project; FM.time = Math.max(0, Math.min(P.duration || 0, plan.time)); if (FM.seekVideosToTime) FM.seekVideosToTime(); if (FM.timeline && FM.timeline.updatePlayhead) FM.timeline.updatePlayhead(); }
      FM.history.commit({ label: label, ed: 's', arr: gated });
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

  /* APPEND (the clip row's +, Clips › At the end): the clips go end to end from the track end, BEFORE an end card, which
     moves along. Arranging only when it moves something (a tail item) or the project is not adopted yet (§3.6 Append row):
     a plain clips-only Append works with a friend in. Cues or a window that cross the track end refuse until 2.4. */
  S.planAppend = function (R, picked) {
    const map = byIdMap(), clips = picked.clips;
    if (!clips.length && !picked.sounds.length) return refusePlan('nothingAdded');
    const T = R.main.some(e => !e.slot) ? R.trackEnd : 0;
    const sum = clips.reduce((a, c) => a + c.len, 0);
    for (const id of R.riders) { const l = map.get(id); if (l && (+l.start || 0) < T - R.eps && (+l.start || 0) + (+l.duration || 0) > T + R.eps) return refusePlan('riders'); }
    if (R.tail.length && clips.length) { const cm = cameraBlock(R, T, map); if (cm) return refusePlan(cm.kind, cm); }   // rule 3e: only when it moves the tail
    const plan = newPlan(clips.length > 1 ? 'Add ' + clips.length + ' clips' : 'Add clip');
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
      const made = addRecs(clips, T, newPickB(), map);
      made.forEach(l => S.setFlag(l, 'main', true));
      if (made.length && lastMain && FM.layerById(FM.scene, lastMain)) FM.moveLayers(made.map(l => l.id), lastMain);   // just above the clip before (§3.6.1)
      const snd = addRecs(picked.sounds, Math.max(0, Math.min(FM.time || 0, T)), newPickB(), map);
      snd.forEach(l => { S.setFlag(l, 'stay', true); FM.moveLayers([l.id], null); });   // music: Stay put, left whole (D17 B); sound sits at the end of the stack
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
    const rb = riderBlock(R, at, map); if (rb) return refusePlan(rb.kind, rb);
    const sum = clips.reduce((a, c) => a + c.len, 0);
    const plan = newPlan(clips.length > 1 ? 'Add ' + clips.length + ' clips' : 'Add clip');
    const rp = ripple(plan, R, j, sum, new Set(), null, false);
    tailMove(plan, R, R.trackEnd + (rp.last == null ? sum : rp.last), map);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    const anchor = S.rowAnchor(R, j);
    plan.pre.push(async () => {
      const made = addRecs(clips, at, newPickB(), map);
      made.forEach(l => S.setFlag(l, 'main', true));
      if (made.length && anchor) FM.moveLayers(made.map(l => l.id), anchor);
      /* the first clip after the new ones lands on their end exactly (a seam the command creates, §3.1) */
      if (made.length && !e.slot) { const last = made[made.length - 1]; plan.lands.set(e.id, (+last.start || 0) + (+last.duration || 0)); }
      plan.selectId = made.length ? made[0].id : null;
      const snd = addRecs(picked.sounds, Math.max(0, FM.time || 0), newPickB(), map);
      snd.forEach(l => { S.setFlag(l, 'stay', true); FM.moveLayers([l.id], null); });
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
    const lo = Math.min(c.start, j < R.main.length ? R.main[j].start : R.trackEnd);
    const rb = riderBlock(R, lo, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Move clip');
    /* new positions, walked in the NEW order: every entry keeps its own seam amount except at the two edit points */
    const order = R.main.map((e, k) => k).filter(k => k !== i);
    const at = j > i ? j - 1 : j;
    order.splice(at, 0, i);
    const dOf = k => (k > i && k < j) ? -len : (k >= j && k < i) ? len : 0;   // forward: (i, j) move −L; backward: [j, i) move +L
    let prevEnd = null, acc = 0, cStart = null;
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
      if (e.slot) e.members.forEach(m => { if (d) addMove(plan, m, d); });
      else {
        if (k === i || ns !== e.start + dOf(k)) addLand(plan, e.id, ns); else if (d) addMove(plan, e.id, d);
        (R.followers[e.id] || []).forEach(f => { if (d) addMove(plan, f, d); });
        if (k === i) cStart = ns;
      }
      prevEnd = e.slot ? e.end + d : ns + (+map.get(e.id).duration || 0);
    });
    plan.touched.add(c.id);
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
    const rb = riderBlock(R, c.start, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Lift off');
    const fol = R.followers[c.id] || [];
    const dt = n ? -(n.start - c.start) : 0;
    const prevEnd = p ? p.end : null;
    const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(fol)), prevEnd, !!(p && isFloatJoin(R, i)));
    if (n) tailMove(plan, R, R.trackEnd + (rp.last == null ? dt : rp.last), map);
    else { const lastClip = R.main.filter(e => !e.slot && e.id !== c.id).pop(); tailMove(plan, R, lastClip ? lastClip.end : c.start, map); }
    plan.touched.add(c.id);
    plan.post.push(() => {
      S.setFlag(L, 'main', false);
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
    const rb = riderBlock(R, seam, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Put in the clip row');
    const rp = ripple(plan, R, j, len, new Set([id].concat(twins.map(t => t.id))), seam + len, true);
    tailMove(plan, R, rp.end != null ? rp.end : seam + len, map);   // o last: its end, landed at seam with its own duration
    addLand(plan, id, seam);
    twins.forEach(t => { plan.moves.delete(t.id); addLand(plan, t.id, (+t.start || 0) + dO); });   // a land beats a move or a tail land
    plan.post.push(() => {
      S.setFlag(o, 'main', true); S.setFlag(o, 'stay', false);
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
    const rb = riderBlock(R, R.main.length ? R.main[0].start : 0, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Close all gaps');
    let prevEnd = null, acc = 0, closed = 0;
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
      if (fix) { const target = prevEnd != null ? prevEnd : 0; if (sm.kind === 'gap' || sm.kind === 'overlap' || frameIn) closed++; acc += target - ns; d = acc; ns = target; }
      if (e.slot) { e.members.forEach(m => { if (d) addMove(plan, m, d); }); prevEnd = e.end + d; return; }
      if (fix) addLand(plan, e.id, ns); else if (d) addMove(plan, e.id, d);
      (R.followers[e.id] || []).forEach(f => { if (d) addMove(plan, f, d); });
      prevEnd = ns + (+map.get(e.id).duration || 0);
    });
    if (!closed) return refusePlan('noGaps');
    tailMove(plan, R, prevEnd, map);
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
      const t0 = Math.max(0, FM.time || 0), made = addRecs(items, t0, newPickB(), null);
      made.forEach(l => {
        const c = S.clampToTrack(R, +l.start || 0, +l.duration || 0);
        l.start = c.start;
        if (c.duration < l.duration) { if (l.type === 'video') { const r = FM.trimClipEdge(l, 'tail', c.duration - l.duration, srcDurOf(l)); l.duration = r.duration; l.trimStart = r.trimStart; } else l.duration = c.duration; }
        const anchor = S.bandAnchor('overlay', l.start, l.start + l.duration, new Set([l.id]));
        if (anchor) FM.moveLayers([l.id], anchor);
      });
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
      const made = addRecs(items, Math.max(0, FM.time || 0), newPickB(), null);
      made.forEach(l => { S.setFlag(l, 'stay', true); if (!(l.sm && l.sm.snd)) l.muted = false; FM.moveLayers([l.id], null); });   // music: Stay put, whole (D17 B)
      if (made.length) plan.mints = true;
      plan.selectId = made.length ? made[0].id : null;
    });
    plan.live = line('musicAdded');
    return plan;
  };

  Object.assign(S.cmd, {
    append(files) { return (async () => { const picked = await S.readPicked(files); return S.edit('Add clips', R => S.planAppend(R, picked)); })(); },
    insert(files, j) { return (async () => { const picked = await S.readPicked(files); return S.edit('Add clips', R => S.planInsert(R, picked, j)); })(); },
    move(id, dir) { return S.edit('Move clip', R => { const j = S.moveIndexFor(R, id, dir); return j < 0 ? refusePlan(dir < 0 ? 'atStart' : 'atEnd') : S.planReorder(R, id, j); }); },
    lift(id) { return S.edit('Lift off', R => S.planLift(R, id)); },
    intoRow(id) { return S.edit('Put in the clip row', R => S.planIntoRow(R, id)); },
    stay(id, on) { return S.edit(on ? 'Stay put' : 'Follow clip', R => S.planStay(R, id, on)); },
    stayMany(ids, on) { ids = ids.slice(); return S.edit(on ? 'Stay put' : 'Follow clip', R => S.planStayMany(R, ids, on)); },
    z(id, dir) { return S.edit(dir > 0 ? 'Forward' : 'Back', R => S.planZ(R, id, dir)); },
    closeAll() { return S.edit('Close all gaps', R => S.planCloseAll(R)); },
    endWithVideo() { return S.edit('End with the video', R => S.planEndWithVideo(R)); },
    addText() { return S.edit('Add text', R => S.planAddText(R)); },
    addOverlay(files) { return (async () => { const picked = await S.readPicked(files); return S.edit('Add overlay', R => S.planAddOverlay(R, picked)); })(); },
    addMusic(files) { return (async () => { const picked = await S.readPicked(files); return S.edit('Add music', R => S.planAddMusic(R, picked)); })(); },
    length(id, newDur) { return S.edit('Trim clip', R => S.planTrimTail(R, id, newDur, { typed: true })); },
    trimStartBy(id, h) { return S.edit('Trim clip', R => S.planTrimHead(R, id, h, { typed: true })); }
  });

  S.undoGate = function () { return S.arrangeGate(); };
  /* runStep's refusal of an arranging step while someone else can edit (§10.2 door 2). In Simple it is the gate's line;
     in Full it is Full's existing undo-refusal toast, word for word (§0.4 N4): no new words in Full. */
  S.undoRefused = function (why) {
    if (FM.editor && FM.editor.isSimple && FM.editor.isSimple()) refuse(why || 'live');
    else if (FM.toast) FM.toast("Can't undo — it has changed since");
  };
})(window.FM);
