/* Engine tests for VIS.engine (kit.js). Run with:
 *   osascript -l JavaScript engine-tests.js /abs/path/to/vis
 * Checks DESIGN.md §3.9's invariants over seeded random main tracks (off-grid lengths, float-noise joins,
 * gaps, overlaps, hand crossfades), then each command on SAMPLE (a) "Beach day" with exact expectations.
 * Prints one line per group and a final PASS/FAIL count. No DOM, no node: JavaScriptCore via JXA. */
ObjC.import('Foundation');

function readText(p) {
  const s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null);
  if (!s || s.isNil && s.isNil()) throw new Error('cannot read ' + p);
  return s.js;
}

function run(argv) {
  const dir = (argv && argv[0]) || '/Users/ezrasmith/Claude/FreeMotion/tools/design/plans/simple-mode/vis';
  (0, eval)(readText(dir + '/kit.js'));
  const VIS = globalThis.VIS, E = VIS.engine;
  const out = [];
  let pass = 0, fail = 0;
  const fails = [];
  function ok(cond, msg) { if (cond) pass++; else { fail++; if (fails.length < 40) fails.push(msg); } }
  const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-9 : tol);
  const endOf = l => l.start + l.duration;
  const byId = doc => new Map(doc.layers.map(l => [l.id, l]));

  /* ---------------- seeded random projects ---------------- */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function randomProject(seed) {
    const r = rng(seed), pick = a => a[Math.floor(r() * a.length)];
    const fps = pick([24, 30, 60]);
    const n = 3 + Math.floor(r() * 5);
    const adopted = r() < 0.6;
    const clips = [], extra = [];
    let t = r() < 0.15 ? 0.4 + r() * 0.8 : 0;          // sometimes a leading gap
    const seams = [];
    for (let i = 0; i < n; i++) {
      const dur = 1.4 + r() * 4 + r() * 0.0137;         // off the frame grid
      const sp = pick([1, 1, 1, 2, 0.5]);
      const trimStart = r() * 2;
      const c = { id: 'c' + i, type: 'video', name: 'Clip ' + (i + 1), start: t, duration: dur, trimStart, speed: sp,
                  srcDur: trimStart + dur * sp + r() * 3, look: ['#345', '#678'] };
      if (r() < 0.5) c.kf = { scale: [{ t: t + dur * 0.2, v: 1 }, { t: t + dur * 0.8, v: 1.2 }] };
      if (adopted) c.sm = { main: true };
      clips.push(c);
      // the next seam
      const k = r(); let next;
      if (k < 0.6) { next = t + dur; seams.push('join'); }
      else if (k < 0.72) { next = t + dur + (r() - 0.5) * 2e-12; seams.push('noise'); }
      else if (k < 0.84) { next = t + dur + 0.3 + r() * 1.2; seams.push('gap'); }
      else { next = t + dur - (0.1 + r() * 0.3); seams.push(r() < 0.5 ? 'blend' : 'overlap'); }
      t = next;
    }
    // blends: the later clip is above (lower index) and fades in over the overlap
    for (let i = 1; i < n; i++) if (seams[i - 1] === 'blend') {
      const a = clips[i - 1], b = clips[i];
      b.kf = b.kf || {}; b.kf.opacity = [{ t: b.start, v: 0 }, { t: endOf(a), v: 1 }];
    }
    // followers: text, stickers, sound effects, placed well inside their clip
    clips.forEach((c, i) => {
      const prevOv = i ? Math.max(0, endOf(clips[i - 1]) - c.start) : 0;
      const nextOv = i < n - 1 ? Math.max(0, endOf(c) - clips[i + 1].start) : 0;
      const lo = c.start + prevOv + 0.08, hi = endOf(c) - nextOv - 0.7;
      const count = Math.floor(r() * 3);
      for (let k = 0; k < count && hi > lo; k++) {
        const s = lo + r() * (hi - lo), kind = pick(['text', 'sticker', 'sfx']);
        const d = 0.62 + r() * 1.3;
        const f = kind === 'text' ? { id: 't' + i + k, type: 'text', name: 'Title ' + i + k, text: 'Hi', start: s, duration: d, kf: { opacity: [{ t: s, v: 0 }, { t: s + 0.3, v: 1 }] } }
          : kind === 'sticker' ? { id: 's' + i + k, type: 'image', name: 'Sticker ' + i + k, start: s, duration: d, transform: { scale: 0.3 }, kf: { scale: [{ t: s + 0.1, v: 0.2 }] } }
          : { id: 'x' + i + k, type: 'video', audioOnly: true, name: 'Whoosh ' + i + k, start: s, duration: Math.min(d, endOf(c) + 0.5 - s), trimStart: 0, speed: 1, srcDur: 4 };
        extra.push(f);
      }
    });
    const trackEnd = Math.max(...clips.map(endOf));
    // a caption track over the whole track, cues back to back
    const cues = []; let q = 0.1;
    while (q < trackEnd - 0.5) { const d = 0.3 + r() * 1.6; cues.push({ start: q, end: Math.min(trackEnd - 0.05, q + d), text: 'cue ' + cues.length }); q += d + 0.05 + r() * 0.3; }
    const cap = { id: 'cap', type: 'text', name: 'Captions', start: 0, duration: trackEnd, captions: cues };
    const music = { id: 'song', type: 'video', audioOnly: true, name: 'Song', start: 0, duration: trackEnd, trimStart: 0, speed: 1, srcDur: 400,
                    kf: { volume: [{ t: 1, v: 1 }, { t: trackEnd - 1, v: 0.5 }] } };
    if (adopted) music.sm = { stay: true, tail: true, tailEnd: trackEnd };
    const layers = [cap].concat(extra);
    if (r() < 0.4) layers.push({ id: 'endcard', type: 'text', name: 'The end', text: 'The end', start: trackEnd, duration: 2 });
    clips.slice().reverse().forEach(c => layers.push(c));      // later clips higher in the stack
    layers.push(music);
    const project = { name: 'Random ' + seed, width: 1080, height: 1920, fps, duration: Math.max(trackEnd, trackEnd + (layers.some(l => l.id === 'endcard') ? 2 : 0)) };
    if (adopted) project.sm = { v: 1, adopted: true };
    return { project, layers };
  }

  function randomCommand(R, doc, r) {
    const pick = a => a[Math.floor(r() * a.length)];
    const clips = R.main.filter(e => !e.slot);
    const c = pick(clips); const l = R.layer(c.id);
    const cmd = pick(['deleteClip', 'trimTail', 'trimHead', 'split', 'reorder', 'speed', 'closeGap', 'makeOverlay', 'makeMain', 'insert', 'duplicate']);
    switch (cmd) {
      case 'trimTail': return [cmd, { id: c.id, dur: l.duration + (r() - 0.6) * 2 }];
      case 'trimHead': return [cmd, { id: c.id, by: (r() - 0.35) * 1.5 }];
      case 'split': return [cmd, { id: c.id, t: c.start + r() * (c.end - c.start) }];
      case 'reorder': return [cmd, { id: c.id, to: Math.floor(r() * (R.main.length + 1)) }];
      case 'speed': return [cmd, { id: c.id, sp: pick([0.5, 1.5, 2, 3]) }];
      case 'closeGap': { const g = R.main.filter(e => ['gap', 'overlap', 'hairline'].includes(e.seam.kind)); return [cmd, { id: g.length ? pick(g).id : c.id }]; }
      case 'makeMain': { const o = Object.values(R.units).filter(u => !R.isMain(u.id) && u.kind === 'overlay' && /video|image/.test(u.lead.type)); return [cmd, { id: o.length ? pick(o).id : c.id }]; }
      case 'insert': return [cmd, { clips: [{ name: 'New', duration: 1 + r() * 2 + 0.0071, srcDur: 9 }], at: Math.floor(r() * (R.main.length + 1)) }];
      default: return [cmd, { id: c.id }];
    }
  }

  /* ---------------- the invariants (§3.9), checked on one command ---------------- */
  function checkInvariants(tag, cmd, args, docB, R0, ed, res) {
    const docA = ed.doc, R1 = E.classify(docA), mB = byId(docB), mA = byId(docA);
    const MIN = R0.minLen;
    // inv 5: undo restores byte for byte; redo gives the same result
    const afterJson = JSON.stringify(docA);
    ed.undo(); ok(JSON.stringify(ed.doc) === JSON.stringify(docB), tag + ' inv5 undo not byte-exact');
    ed.redo(); ok(JSON.stringify(ed.doc) === afterJson, tag + ' inv5 redo differs');
    // inv 1: every consecutive pair of clips that is consecutive before and after keeps its seam exactly
    const pairs = R => { const m = new Map(); for (let i = 1; i < R.main.length; i++) { const a = R.main[i - 1], b = R.main[i]; if (!a.slot && !b.slot) m.set(a.id + '|' + b.id, { kind: b.seam.kind, diff: a.end - b.start }); } return m; };
    const p0 = pairs(R0), p1 = pairs(R1);
    p0.forEach((v, k) => {
      if (!p1.has(k)) return;
      if (cmd === 'closeGap' && k.endsWith('|' + args.id)) return;          // the edit point
      const w = p1.get(k);
      ok(near(v.diff, w.diff, 1e-9), tag + ' inv1 seam ' + k + ' diff ' + v.diff + ' -> ' + w.diff);
      const atEdit = k.split('|').includes(args.id);                        // the edited clip's own seams may change kind
      ok(atEdit || v.kind === w.kind || (v.kind === 'hairline' && w.kind === 'join'), tag + ' inv1 seam kind ' + k + ' ' + v.kind + ' -> ' + w.kind);
    });
    // main order: clips that stay main keep their relative order, apart from the one reordered
    const ord0 = R0.main.filter(e => !e.slot).map(e => e.id), ord1 = R1.main.filter(e => !e.slot).map(e => e.id);
    const common = ord0.filter(id => ord1.includes(id) && !(cmd === 'reorder' && id === args.id));
    ok(JSON.stringify(common) === JSON.stringify(ord1.filter(id => common.includes(id))), tag + ' inv1 main order changed');
    // inv 2: followers keep their host (the clip they start on) and their offset, except the stated cases
    const edited = args.id;
    for (const id in R0.units) {
      const u0 = R0.units[id]; if (!u0.host || u0.host.startsWith('slot:')) continue;
      const lB = mB.get(u0.lead.id), lA = mA.get(u0.lead.id); if (!lA) continue;       // removed with its clip
      if (E.hasFlag(lA, 'stay') && !E.hasFlag(lB, 'stay')) continue;                      // pinned in this step
      const u1 = R1.units[id]; if (!u1 || R1.isMain(id)) continue;
      if (cmd === 'split' && u0.kind === 'captions') continue;           // a caption track that now spans a cut rides (§3.5)
      const h1 = R1.hostOf(u1, new Set(), { startOnly: true });
      const expect = (cmd === 'split' && u0.host === edited && res.newId && lA.start >= mA.get(res.newId).start - R1.eps) ? res.newId : u0.host;
      ok(h1 === expect, tag + ' inv2 host of ' + id + ' ' + u0.host + ' -> ' + h1);
      if (h1 !== expect || cmd === 'split') continue;
      const off0 = lB.start - mB.get(u0.host).start, off1 = lA.start - mA.get(h1).start;
      if (u0.host === edited && cmd === 'speed') ok(off1 <= off0 * mA.get(h1).duration / mB.get(h1).duration + 1e-9 && off1 >= -1e-9, tag + ' inv2 speed offset ' + id);
      else if (u0.host === edited && cmd === 'trimTail') ok(off1 >= -1e-9 && off1 <= off0 + 1e-9, tag + ' inv2 slide-back ' + id);
      else if (u0.host === edited && cmd === 'trimHead') { const L = mB.get(edited).duration - mA.get(edited).duration; ok(near(off1, Math.max(0, off0 - L), 1e-9), tag + ' inv2 head offset ' + id); }
      else ok(near(off1, off0, 1e-9), tag + ' inv2 offset ' + id + ' ' + off0 + ' -> ' + off1);
    }
    // inv 3: every moved layer moved its keyframes by the identical d (skip the edited clip, cut / fitted / mapped layers)
    docA.layers.forEach(lA => {
      const lB = mB.get(lA.id); if (!lB || lA.id === edited) return;
      if (!near(lA.duration, lB.duration, 1e-12)) return;                // cut, fitted, clamped: checked elsewhere
      if (R0.riders.includes(lA.id) || lA.type === 'camera') return;      // riders go through the map
      const d = lA.start - lB.start;
      const ka = E.kfLists(lA), kb = E.kfLists(lB);
      ok(ka.length === kb.length, tag + ' inv3 key lists ' + lA.id);
      ka.forEach((a, i) => a.forEach((k, j) => ok(kb[i][j] && near(k.t - kb[i][j].t, d, 1e-9), tag + ' inv3 key moved differently ' + lA.id)));
    });
    // inv 4: nothing that had sm.stay before moved
    docB.layers.forEach(lB => { if (!E.hasFlag(lB, 'stay') || lB.id === edited) return; const lA = mA.get(lB.id); if (lA) ok(near(lA.start, lB.start, 0), tag + ' inv4 stay moved ' + lB.id); });
    // inv 7: no main clip under MIN_LEN that was not already under it
    R1.main.forEach(e => { if (e.slot) return; const d = e.end - e.start, b = mB.get(e.id); ok(d >= MIN - 1e-6 || (b && near(b.duration, d, 1e-9)), tag + ' inv7 short clip ' + e.id + ' ' + d); });
    // inv 11: project length = the clips' end unless an item without sm.tail runs past; sm.tail items end at it
    if (res.arranges && R1.main.length) {
      const past = docA.layers.filter(l => l.type !== 'camera' && l.type !== 'group' && !E.hasFlag(l, 'tail') && endOf(l) > R1.trackEnd + 1e-9);
      if (!past.length) ok(near(docA.project.duration, R1.trackEnd, 1e-9), tag + ' inv11 duration ' + docA.project.duration + ' vs ' + R1.trackEnd);
      docA.layers.forEach(l => { if (E.hasFlag(l, 'tail') && l.sm.tailEnd === R1.trackEnd && !(l.srcDur != null && endOf(l) < R1.trackEnd - 1e-9)) ok(near(endOf(l), R1.trackEnd, 1e-9), tag + ' inv11 tail item ' + l.id + ' end ' + endOf(l)); });
    }
    // inv 12: media stays inside its source
    docA.layers.forEach(l => { if (l.srcDur == null) return; const sp = l.speed || 1; ok((l.trimStart || 0) >= -1e-9 && (l.trimStart || 0) + l.duration * sp <= l.srcDur + 1e-6, tag + ' inv12 source ' + l.id); });
    // captions ride cue by cue: a cue lying wholly on a clip that moved rigidly moves with it, by the same d
    const cap0 = mB.get('cap'), cap1 = mA.get('cap');
    if (cap0 && cap1 && R0.riders.includes('cap')) {
      const abs = (t, q) => ({ s: t.start + q.start, e: t.start + q.end, text: q.text });
      const cuesA = cap1.captions.map(q => abs(cap1, q));
      for (let i = 0; i < R0.main.length; i++) {
        const e = R0.main[i]; if (e.slot || e.id === edited) continue;
        const lB = mB.get(e.id), lA = mA.get(e.id); if (!lA || !near(lA.duration, lB.duration, 1e-12) || !R1.isMain(e.id)) continue;
        const prev = R0.main[i - 1], next = R0.main[i + 1];
        const lo = Math.max(e.start, prev ? prev.end : -1) + R0.eps, hi = Math.min(e.end, next ? next.start : Infinity) - R0.eps;
        const d = lA.start - lB.start;
        cap0.captions.map(q => abs(cap0, q)).forEach(q => {
          if (q.s < lo || q.e > hi) return;
          ok(cuesA.some(x => x.text === q.text && near(x.s, q.s + d, 1e-9) && near(x.e, q.e + d, 1e-9)), tag + ' cue "' + q.text + '" did not ride ' + e.id + ' by ' + d);
        });
      }
      // cues stay sorted and never shorter than MIN_CUE
      const cs = cap1.captions; for (let i = 0; i < cs.length; i++) { ok(cs[i].end - cs[i].start >= E.MIN_CUE - 1e-9, tag + ' cue too short'); if (i) ok(cs[i].start >= cs[i - 1].start - 1e-12, tag + ' cues unsorted'); }
    }
  }

  /* ---------------- run the random sweep ---------------- */
  const counts = {}, refusals = {};
  const t0 = Date.now();
  const PROJECTS = 1000, STEPS = 6;
  for (let s = 1; s <= PROJECTS; s++) {
    const doc = randomProject(s), r = rng(s * 7919);
    const ed = E.editor(doc);
    // opening writes nothing (§5.1): classify must not touch the document
    const j0 = JSON.stringify(ed.doc); E.classify(ed.doc); ok(JSON.stringify(ed.doc) === j0, 'seed ' + s + ' classify wrote to the document');
    const R00 = E.classify(ed.doc);
    ok(R00.main.filter(e => !e.slot).length === doc.layers.filter(l => /^c\d+$/.test(l.id)).length, 'seed ' + s + ' classifier missed a main clip: ' + R00.main.map(e => e.id).join(','));
    for (let k = 0; k < STEPS; k++) {
      const R0 = E.classify(ed.doc); if (!R0.main.length) break;
      const [cmd, args] = randomCommand(R0, ed.doc, r);
      const docB = E.clone(ed.doc);
      let res;
      try { res = ed.run(cmd, args); } catch (e) { ok(false, 'seed ' + s + ' ' + cmd + ' threw ' + e.message + ' ' + (e.line || '')); break; }
      if (!res.ok) { refusals[cmd] = (refusals[cmd] || 0) + 1; ok(JSON.stringify(ed.doc) === JSON.stringify(docB), 'seed ' + s + ' refused ' + cmd + ' but wrote'); continue; }
      counts[cmd] = (counts[cmd] || 0) + 1;
      try { checkInvariants('seed ' + s + ' step ' + k + ' ' + cmd, cmd, args, docB, R0, ed, res); }
      catch (e) { ok(false, 'seed ' + s + ' ' + cmd + ' check threw ' + e.message + ' line ' + (e.line || '')); }
    }
  }
  out.push('Random sweep: ' + PROJECTS + ' seeded projects x ' + STEPS + ' commands, ' + (Date.now() - t0) + ' ms');
  out.push('  applied: ' + Object.keys(counts).sort().map(k => k + ' ' + counts[k]).join(', '));
  out.push('  refused (valid refusals, document unchanged): ' + Object.keys(refusals).sort().map(k => k + ' ' + refusals[k]).join(', '));

  /* ---------------- SAMPLE (a): each command, exact expectations ---------------- */
  const beforeSample = pass + fail;
  const fresh = () => E.editor(VIS.sample('beach'));
  const L = (ed, id) => ed.doc.layers.find(l => l.id === id);
  const cueAt = (ed, text) => { const c = L(ed, 'cap'); const q = c.captions.find(x => x.text === text); return q ? [c.start + q.start, c.start + q.end] : null; };
  const undoBack = (ed, name) => { const j = JSON.stringify(VIS.sample('beach')); ed.undo(); ok(JSON.stringify(ed.doc) === j, name + ': undo not byte-exact'); };
  function sample(name, fn) { try { fn(); } catch (e) { ok(false, name + ' threw ' + e.message); } }

  sample('classify', () => {
    const R = E.classify(VIS.sample('beach'));
    ok(R.main.map(e => e.id).join() === 'c1,c2,c3,c4', 'beach main order ' + R.main.map(e => e.id).join());
    ok(R.units.title.host === 'c2', 'title follows Waves');
    ok(R.units.sticker.host === 'c3', 'sticker follows Sandcastle');
    ok(R.riders.join() === 'cap', 'captions ride');
    ok(R.units.song.host === null && R.units.song.section === 'audio', 'music stays put in the sound row');
    ok(near(R.trackEnd, 14.2, 1e-9), 'track end 14.2');
  });
  sample('deleteClip', () => {
    const ed = fresh(); const r = ed.run('deleteClip', { id: 'c2' });
    ok(r.ok && r.say === 'Deleted clip and 1 thing on it', 'delete toast: ' + r.say);
    ok(!L(ed, 'title') && !L(ed, 'c2'), 'Waves and its title are gone');
    ok(near(L(ed, 'c3').start, 3.4), 'Sandcastle closes up to 3.4');
    ok(near(L(ed, 'sticker').start, 3.9) && near(L(ed, 'sticker').kf.scale[0].t, 3.9), 'sticker and its keyframes ride −3.7');
    ok(near(endOf(L(ed, 'song')), 10.5) && near(ed.doc.project.duration, 10.5), 'music and the video end at 10.5');
    ok(!cueAt(ed, 'Listen to that') && !cueAt(ed, 'So cold!'), 'the two cues on Waves are cut');
    const cc = cueAt(ed, 'Castle time'); ok(cc && near(cc[0], 3.7) && near(cc[1], 5.9), 'Castle time cue rides to 3.7');
    undoBack(ed, 'deleteClip');
  });
  sample('trimTail', () => {
    const ed = fresh(); const r = ed.run('trimTail', { id: 'c1', dur: 2.4 });
    ok(r.ok && near(L(ed, 'c1').duration, 2.4), 'Arriving is 2.4 s');
    ok(near(L(ed, 'c2').start, 2.4) && near(L(ed, 'title').start, 2.9), 'Waves and its title move −1.0');
    const q = cueAt(ed, 'First swim of summer'); ok(q && near(q[0], 2.0) && near(q[1], 2.4), 'the straddling cue is cut to the new end');
    ok(near(endOf(L(ed, 'song')), 13.2), 'music follows the new end');
    undoBack(ed, 'trimTail');
  });
  sample('trimTail slide-back', () => {
    const ed = fresh(); const r = ed.run('trimTail', { id: 'c2', dur: 0.4 });
    ok(r.ok && near(L(ed, 'title').start, 3.4), 'title cut away slides back onto Waves (D6): ' + L(ed, 'title').start);
    ok(near(L(ed, 'title').kf.opacity[0].t, 3.4), 'its keyframes slide with it');
  });
  sample('trimHead', () => {
    const ed = fresh(); const r = ed.run('trimHead', { id: 'c3', by: 0.5 });
    ok(r.ok && near(L(ed, 'c3').start, 7.1) && near(L(ed, 'c3').duration, 2.75) && near(L(ed, 'c3').trimStart, 0.5), 'Sandcastle keeps its slot, loses 0.5 s of footage');
    ok(near(L(ed, 'sticker').start, 7.1), 'sticker stays on the same footage frame, clamped at the clip start');
    ok(near(L(ed, 'c4').start, 9.85), 'Sunset closes up −0.5');
    undoBack(ed, 'trimHead');
  });
  sample('split', () => {
    const ed = fresh(); const r = ed.run('split', { id: 'c2', t: 5.0 });
    const B = L(ed, r.newId);
    ok(r.ok && near(L(ed, 'c2').duration, 1.6) && B && near(B.start, 5.0) && near(B.duration, 2.1) && near(B.trimStart, 3.6), 'Waves splits at 5.0 with the footage continuing');
    ok(B && B.sm && B.sm.main, 'the second half is on the clip row');
    ok(E.classify(ed.doc).units.title.host === 'c2', 'the title stays on the first half');
    ok(!r.arranges, 'split is not an arranging edit');
    undoBack(ed, 'split');
  });
  sample('reorder', () => {
    const ed = fresh(); const r = ed.run('reorder', { id: 'c4', to: 0 });
    const R = E.classify(ed.doc);
    ok(r.ok && R.main.map(e => e.id).join() === 'c4,c1,c2,c3', 'Sunset moves to the front: ' + R.main.map(e => e.id).join());
    ok(near(L(ed, 'c4').start, 0) && near(L(ed, 'c1').start, 3.85), 'positions');
    const q = cueAt(ed, 'What a day'); ok(q && near(q[0], 0.25), 'Sunset\'s cue rides with it');
    ok(near(L(ed, 'title').start, 7.75), 'Waves\' title rides +3.85');
    undoBack(ed, 'reorder');
  });
  sample('speed', () => {
    const ed = fresh(); const r = ed.run('speed', { id: 'c2', sp: 2 });
    ok(r.ok && near(L(ed, 'c2').duration, 1.85), 'Waves at 2x is 1.85 s');
    ok(near(L(ed, 'title').start, 3.65) && near(L(ed, 'title').duration, 2.2), 'title keeps its length and moves to half its offset');
    const q = cueAt(ed, 'Listen to that'); ok(q && near(q[0], 3.5) && near(q[1], 4.4), 'the cue on Waves scales');
    ok(near(L(ed, 'c3').start, 5.25), 'Sandcastle closes up −1.85');
    undoBack(ed, 'speed');
  });
  sample('closeGap', () => {
    const ed = fresh(); ed.run('trimTail', { id: 'c1', dur: 2.4 });
    // make a gap by hand, the way a Full drag would
    const j = JSON.parse(JSON.stringify(ed.doc)); j.layers.forEach(l => { if (['c2', 'c3', 'c4', 'title', 'sticker'].includes(l.id)) { l.start += 1; E.kfLists(l).forEach(a => a.forEach(k => { k.t += 1; })); } });
    const ed2 = E.editor(j); const R = E.classify(ed2.doc);
    ok(R.main[1].seam.kind === 'gap' && near(R.main[1].seam.amt, 1), 'a 1 s gap shows');
    const r = ed2.run('closeGap', { id: 'c2' });
    ok(r.ok && L(ed2, 'c2').start === endOf(L(ed2, 'c1')), 'the gap lands exactly shut');
    ok(near(L(ed2, 'title').start, 2.9), 'the title comes with its clip');
  });
  sample('makeOverlay', () => {
    const ed = fresh(); const r = ed.run('makeOverlay', { id: 'c3' });
    const R = E.classify(ed.doc);
    ok(r.ok && R.main.map(e => e.id).join() === 'c1,c2,c4', 'Sandcastle leaves the clip row');
    ok(near(L(ed, 'c3').start, 7.1) && near(L(ed, 'c4').start, 7.1), 'it keeps its time; Sunset closes up under it');
    ok(near(L(ed, 'sticker').start, 7.6) && E.hasFlag(L(ed, 'sticker'), 'stay'), 'its sticker keeps its time and stays put');
    const q = cueAt(ed, 'Castle time'); ok(q && near(q[0], 7.4), 'its cue keeps its time (lifted)');
    const q2 = cueAt(ed, 'What a day'); ok(q2 && near(q2[0], 7.35), 'later cues close up −3.25');
    ok(R.units.c3.section === 'overlay', 'it draws in the overlay section');
    undoBack(ed, 'makeOverlay');
  });
  sample('makeMain', () => {
    const ed = fresh(); const r = ed.run('makeMain', { id: 'sticker' });
    const R = E.classify(ed.doc);
    ok(r.ok && R.main.map(e => e.id).join() === 'c1,c2,sticker,c3,c4', 'the sticker drops into the clip row at the nearest cut: ' + R.main.map(e => e.id).join());
    ok(near(L(ed, 'sticker').start, 7.1) && near(L(ed, 'c3').start, 8.9), 'it lands at 7.1 and Sandcastle makes room');
    undoBack(ed, 'makeMain');
  });
  sample('insert', () => {
    const ed = fresh(); const r = ed.run('insert', { clips: [{ name: 'Ice cream', duration: 2.5, srcDur: 5 }, { name: 'Car home', duration: 3, srcDur: 7 }] });
    const R = E.classify(ed.doc);
    ok(r.ok && R.main.length === 6 && near(R.trackEnd, 19.7), 'two clips appended end to end');
    ok(near(endOf(L(ed, 'song')), 19.7) && near(ed.doc.project.duration, 19.7), 'the music follows to the new end');
    ok(near(endOf(L(ed, 'cap')), 19.7), 'the caption track grows over the new clips');
    const ed2 = fresh(); const r2 = ed2.run('insert', { clips: [{ name: 'Crab', duration: 1.5, srcDur: 4 }], at: 2 });
    ok(r2.ok && near(L(ed2, 'c3').start, 8.6) && near(L(ed2, 'sticker').start, 9.1), 'inserting after Waves pushes Sandcastle and its sticker +1.5');
    const q = cueAt(ed2, 'Castle time'); ok(q && near(q[0], 8.9), 'Sandcastle\'s cue rides too');
    undoBack(ed, 'insert');
  });
  sample('duplicate', () => {
    const ed = fresh(); const r = ed.run('duplicate', { id: 'c1' });
    const d = L(ed, r.newId);
    ok(r.ok && d && near(d.start, 3.4) && near(d.duration, 3.4), 'the copy lands at Arriving\'s end');
    ok(near(L(ed, 'c2').start, 6.8) && near(L(ed, 'title').start, 7.3), 'Waves and its title make room');
    ok(E.classify(ed.doc).units.title.host === 'c2', 'things on a clip are not copied');
    undoBack(ed, 'duplicate');
  });
  sample('stayPut', () => {
    const ed = fresh(); ed.run('stayPut', { id: 'title', on: true }); ed.run('deleteClip', { id: 'c1' });
    ok(L(ed, 'title') && near(L(ed, 'title').start, 3.9), 'a title set to Stay put keeps its time when clips move');
  });
  sample('locked', () => {
    const j = VIS.sample('beach'); j.layers.find(l => l.id === 'c4').locked = true;
    const ed = E.editor(j); const r = ed.run('deleteClip', { id: 'c1' });
    ok(!r.ok && r.locked === 1, 'a ripple that would move a locked clip is refused, counting it');
    const r2 = ed.run('deleteClip', { id: 'c1' }, { force: true });
    ok(r2.ok && L(ed, 'c4').locked, 'Do it anyway moves it and keeps the lock');
  });
  sample('messy (b)', () => {
    const doc = VIS.sample('messy'); const j = JSON.stringify(doc); const R = E.classify(doc);
    ok(JSON.stringify(doc) === j, 'opening writes 0 bytes');
    ok(R.main.map(e => e.id).join() === 'm1,m2,m3,m4', 'messy main track: ' + R.main.map(e => e.id).join());
    ok(R.main[2].seam.kind === 'gap' && near(R.main[2].seam.amt, 1.5), 'the 1.5 s gap');
    ok(R.main[3].seam.kind === 'overlap', 'Tasting and Street overlap');
    ok(R.units.pip.host === 'm2' && R.units.pip.section === 'overlay', 'the face cam follows Kitchen');
    ok(R.units.grp && R.units.grp.kind === 'block' && R.units.grp.host === 'm2', 'the lower third is one block on Kitchen');
    ok(R.units.cam.kind === 'fullOnly', 'the camera is a Full-only item');
    ok(R.units.mask.kind === 'block', 'the mask is a block');
    ok(R.units.mtitle.host === null && R.wouldStay.includes('mtitle'), 'the whole-video title would stay put');
    ok(R.units.beats.host === null, 'the music stays put');
    const ed = E.editor(doc); const r = ed.run('closeGap', { id: 'm3' });
    ok(r.ok && r.adopted && ed.doc.project.sm.adopted, 'the first arranging edit adopts, in the same step');
    ok(E.hasFlag(L(ed, 'beats'), 'tail') && near(endOf(L(ed, 'beats')), 20.5), 'the music is fitted to the new end');
    ok(E.hasFlag(L(ed, 'mtitle'), 'stay'), 'the title was pinned');
    ed.undo(); ok(JSON.stringify(ed.doc) === j, 'undo un-adopts byte for byte');
  });
  sample('aroll (c)', () => {
    const R = E.classify(VIS.sample('aroll'));
    ok(R.main.map(e => e.id).join() === 'a1', 'the A-roll is the one main clip');
    ok(['b1', 'b2', 'b3'].every(id => R.units[id].host === 'a1' && R.units[id].section === 'overlay'), 'cutaways are overlays on it');
    ok(R.tail.join() === 'end', 'the end card follows the end');
    const ed = E.editor(VIS.sample('aroll')); ed.run('trimTail', { id: 'a1', dur: 26 });
    ok(near(L(ed, 'end').start, 26), 'trimming the A-roll pulls the end card with it');
  });
  out.push('SAMPLE checks: ' + (pass + fail - beforeSample) + ' assertions over 16 cases');

  out.push('');
  out.push((fail ? 'FAIL' : 'PASS') + ': ' + pass + ' passed, ' + fail + ' failed');
  fails.forEach(f => out.push('  x ' + f));
  return out.join('\n');
}
