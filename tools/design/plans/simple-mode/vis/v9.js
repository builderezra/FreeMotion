/* V9 · The ripple maths (DESIGN §3 ripple, §3.1 blends, §3.5 caption riders, §3.6 every command, §3.10 the camera, §4 attachments,
 * §4.3 the tail, §12.1 Turn into a transition, D6 slide-back). DESIGN §18 V9 is the list of what this page must show.
 *
 * A step-through over SAMPLE (a) "Beach day": thirteen edits, each run for real on VIS.engine (the plan from
 * E.commands[name], the result from an editor's run), except the two the engine does not do yet (below). For each one the page
 * draws the project before and after on one time scale, and between them the footage map: a band per clip from where its
 * footage sat to where it sits now (red where footage was cut out, green where footage was added, dashed where a gap closed).
 * Tap anything to see its exact numbers; drag sideways to move the white line, which follows one moment of footage through the
 * edit, with the picture before and after. Under it: what moved (to 0.01 s) and the checks worked out from the result (the cuts,
 * what sits on each clip, keyframes, caption edges against the footage under them, a crossfade over its overlap, the end card,
 * the camera, the song's end, and undo byte for byte). A check that fails says so on the page; nothing is claimed that is not
 * measured.
 *
 * Changes to the sample, said on the page: "So cold!" runs 0.3 s over the Waves | Sandcastle cut (7.0 → 7.4 s), so a caption
 * straddles a cut; a camera zoom made in Full rides over the whole video, so the camera can be seen moving with the clips. Close
 * a gap uses a copy where a friend in Full dragged Sandcastle and what came after it later. The end card step adds "Thanks for
 * watching" after the last clip. The crossfade steps use a copy where Waves runs 0.6 s longer and fades out over Sandcastle (a
 * hand-made crossfade, §3.1), with the shell sticker popping in during the fade.
 *
 * One thing the shared engine does not do yet, and this page works out itself from the design's own rule, saying so on the page:
 * Turn into a transition (Phase 6, §12.1), which is not in the engine at all; a small pure function below. (A trim of the clip that
 * owns a crossfade used to need a stand-in here too; the engine does it now, §3.6, so the page runs the engine's own trim.)
 *
 * The pure part (samples, steps, runs, bands, changes, checks, words) works without a page, so it can be run under osascript.
 * Plain JS, no libraries. Styles are injected once, so index.html is untouched. Remembers the open step per viewer.
 */
(function (G) {
  'use strict';
  const VIS = G.VIS;
  if (!VIS || !VIS.engine) return;
  const E = VIS.engine;
  const esc = VIS.esc || (s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));

  /* =================================================================== numbers and words */
  const TOL = 1e-6;
  const r2 = t => { const v = Math.round(t * 100) / 100; return v === 0 ? 0 : v; };
  const n2 = t => String(r2(t));
  const sec = t => n2(t) + ' s';
  const spanTxt = (a, b) => n2(a) + '–' + n2(b) + ' s';
  const tenth = v => Math.round(v * 10) / 10;
  const nice = v => String(Math.round(v * 100) / 100);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const byId = doc => new Map(doc.layers.map(l => [l.id, l]));
  const endOf = l => l.start + l.duration;
  const ts = l => l.trimStart || 0;
  const spd = l => l.speed || 1;
  const isMedia = l => !!l && (l.type === 'video' || !!l.audioOnly);
  const isClipLike = l => !!l && l.type === 'video' && !l.audioOnly;
  const isCam = l => !!l && l.type === 'camera';
  const srcAt = (l, t) => ts(l) + (t - l.start) * spd(l);
  const tOfSrc = (l, s) => l.start + (s - ts(l)) / spd(l);
  const isTrack = l => !!l && l.type === 'text' && Array.isArray(l.captions);
  const mapOf = P => (P && P.map ? (P.map.type === 'lift' ? P.map.cut : P.map) : { type: 'none' });
  const andList = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const Cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const q = s => '‘' + s + '’';
  const poss = s => /s$/.test(s) ? s + '’' : s + '’s';
  const lerp = (a, b, e) => a + (b - a) * e;
  const plural = (n, one, many) => n === 1 ? one : many;

  /* A plain name for anything in the project (never a field name). */
  function what(l) {
    if (!l) return 'it';
    if (isTrack(l)) return 'the captions';
    if (isCam(l)) return 'the camera';
    if (l.id === 'endcard') return 'the end card';
    if (l.type === 'text') return 'the title “' + (l.text || l.name) + '”';
    if (l.audioOnly) return 'the song';
    if (isClipLike(l)) return l.name;
    return 'the ' + String(l.name || 'item').toLowerCase();
  }
  const label = l => isTrack(l) ? 'Captions' : isCam(l) ? 'Camera' : l.type === 'text' ? '“' + (l.text || l.name) + '”' : (l.name || l.id);

  /* =================================================================== the project and its copies */
  /* A slow zoom made in Full: in over Arriving and Waves, held over Sandcastle, back out on Sunset. No key sits on a cut. */
  const CAM_KEYS = [{ t: 1.2, v: 1 }, { t: 5.2, v: 1.25 }, { t: 8.6, v: 1.25 }, { t: 12.2, v: 1 }];
  function beach() {
    const d = VIS.sample('beach');
    const cap = d.layers.find(l => l.id === 'cap');
    const c = cap && cap.captions.find(x => x.text === 'So cold!');
    if (c) c.end = 7.4;                        // runs 0.3 s over the Waves | Sandcastle cut (said on the page)
    d.layers.unshift({ id: 'cam', type: 'camera', name: 'Camera', start: 0, duration: d.project.duration, kf: { zoom: E.clone(CAM_KEYS) } });
    return d;
  }
  const shiftKeys = (l, d) => E.kfLists(l).forEach(a => a.forEach(k => { k.t += d; }));
  /* A friend in Full dragged Sandcastle, Sunset and the sticker g later; the lines spoken over them and the camera's moves over
     them went too. The song stays as it was (Full never stretches music, and D17 B means Simple does not either). */
  function beachWithGap(g) {
    const d = beach(), L = byId(d);
    ['c3', 'c4', 'sticker'].forEach(id => { const l = L.get(id); l.start += g; shiftKeys(l, g); });
    const cap = L.get('cap');
    cap.captions.forEach(c => { if (c.start >= 7.1 - 1e-9) { c.start += g; c.end += g; } });
    cap.duration += g;
    L.get('cam').kf.zoom.forEach(k => { if (k.t >= 7.1) k.t += g; });
    d.project.duration += g;
    return d;
  }
  /* Beach day with an end card after the last clip. It has no "Stay put" and starts where the clips end, so it is a tail item (§4.3). */
  const ENDCARD = { id: 'endcard', type: 'text', name: 'End card', text: 'Thanks for watching', start: 14.2, duration: 2,
    transform: { y: 0.46 }, kf: { opacity: [{ t: 14.2, v: 0 }, { t: 14.6, v: 1 }] } };
  function beachEnd() {
    const d = beach();
    d.layers.splice(d.layers.findIndex(l => l.id === 'title') + 1, 0, E.clone(ENDCARD));
    d.project.duration = endOf(ENDCARD);
    return d;
  }
  /* Beach day with a hand-made crossfade (§3.1): Waves runs 0.6 s longer and fades out over Sandcastle. Waves is put above the
     later clips, because the upper clip of an overlap is the one that fades. The shell pops in during the fade. */
  const FADE = 0.6;
  function beachBlend() {
    const d = beach(), L = byId(d), w = L.get('c2');
    w.duration += FADE;
    w.kf.opacity = [{ t: 7.1, v: 1 }, { t: 7.1 + FADE, v: 0 }];
    d.layers.splice(d.layers.indexOf(w), 1);
    d.layers.splice(d.layers.indexOf(L.get('c4')), 0, w);
    const st = L.get('sticker'), dd = 7.25 - st.start;
    st.start += dd; shiftKeys(st, dd);
    return d;
  }

  /* =================================================================== the steps */
  const B0 = beach(), B0R = E.classify(B0), B0M = byId(B0);
  const NAME = id => (B0M.get(id) || {}).name || id;
  const CLIPS = B0R.main.filter(e => !e.slot).map(e => e.id);
  const NEWCLIP = { name: 'Ice cream', duration: 2, srcDur: 7.5, look: ['#ffd1e3', '#c9507f'] };

  function tailLim(id) {
    const l = B0M.get(id), avail = (l.srcDur - ts(l)) / spd(l);
    return { min: 0.2, max: Math.floor(Math.min(avail, l.duration + 3) * 10 + 1e-9) / 10, step: 0.1 };
  }
  function headLim(id) {
    const l = B0M.get(id);
    return { min: -Math.floor(Math.min(ts(l) / spd(l), 2) * 10 + 1e-9) / 10, max: Math.floor(Math.min(l.duration - 0.3, 2.5) * 10 + 1e-9) / 10, step: 0.1 };
  }
  function moveOpts(id) {
    const i = B0R.idx[id], N = B0R.main.length, out = [];
    for (let j = 0; j <= N; j++) {
      if (j === i || j === i + 1) continue;
      out.push({ v: j, label: j === 0 ? 'To the front' : j === N ? 'To the end' : 'After ' + NAME(B0R.main[j - 1].id) });
    }
    return out;
  }
  function insertOpts() {
    const N = B0R.main.length, out = [];
    for (let j = 0; j <= N; j++) out.push({ v: j, label: j === 0 ? 'At the start' : j === N ? 'At the end' : 'After ' + NAME(B0R.main[j - 1].id) });
    return out;
  }
  const clipKnob = (def, lbl) => ({ type: 'clip', key: 'id', label: lbl || 'Which clip', def });
  const WAVES_LONG = 3.7 + FADE;
  const ENDEDIT = { del: 'deleteClip', trim: 'trimTail', add: 'insert' };

  const STEPS = [
    { key: 'delete', title: 'Delete a clip', pill: 'Delete', cmd: 'deleteClip', t0: 8.3,
      rule: 'What comes after slides back by exactly the space the clip leaves. What starts on the clip goes with it.',
      knobs: [clipKnob('c2')], args: s => ({ id: s.id }) },
    { key: 'tail', title: 'Trim the end', pill: 'Trim the end', cmd: 'trimTail', t0: 8.3,
      rule: 'The clips after it slide by exactly the amount trimmed. What starts on the part that is left does not move.',
      knobs: [clipKnob('c3'), { type: 'range', key: 'dur', label: 'New length', def: 2, lim: s => tailLim(s.id), fmt: sec,
        reset: s => tenth(B0M.get(s.id).duration * 0.6) }],
      args: s => ({ id: s.id, dur: s.dur }), noop: s => Math.abs(s.dur - B0M.get(s.id).duration) < 0.05 ? 'That is its length now. Move the slider.' : '' },
    { key: 'slide', title: 'The slide-back', pill: 'Slide-back', cmd: 'trimTail', t0: 7.3,
      rule: 'A trim never pushes a title or sticker onto the next clip. If it cuts off the moment one starts on, it slides back onto its own clip. (Decision D6.)',
      knobs: [{ type: 'range', key: 'dur', label: 'Sandcastle’s new length', def: 0.4, lim: () => ({ min: 0.2, max: 3.2, step: 0.1 }), fmt: sec }],
      args: s => ({ id: 'c3', dur: s.dur }), subject: () => 'c3' },
    { key: 'head', title: 'Trim the start, both ways', pill: 'Trim the start', cmd: 'trimHead', t0: 4.8,
      rule: 'The clip keeps its place in the row, and what is on it stays on the same moment of the footage. The other way, keeping the same time into the clip, is drawn third: an alternative, not chosen.',
      knobs: [clipKnob('c2'), { type: 'range', key: 'by', label: 'Trim off the start', def: 1, lim: s => headLim(s.id),
        fmt: v => v < 0 ? 'add ' + sec(-v) : sec(v), reset: () => 1 }],
      args: s => ({ id: s.id, by: s.by }), noop: s => Math.abs(s.by) < 0.05 ? 'Nothing is trimmed yet. Move the slider.' : '' },
    { key: 'speed', title: 'Change the speed', pill: 'Speed', cmd: 'speed', t0: 4.8,
      rule: 'Titles and stickers keep their own length; only where they start on the clip changes. Captions speed up with the voice.',
      knobs: [clipKnob('c2'), { type: 'choice', key: 'sp', label: 'Speed', def: 2, opts: () => [0.5, 0.75, 1.5, 2, 3].map(v => ({ v, label: nice(v) + '×' })) }],
      args: s => ({ id: s.id, sp: s.sp }) },
    { key: 'move', title: 'Move a clip', pill: 'Move', cmd: 'reorder', t0: 5,
      rule: 'The clip takes what is on it. Captions stay with the clip they are over, and a line that runs over a cut splits in two.',
      knobs: [clipKnob('c2'), { type: 'choice', key: 'to', label: 'Move it', def: 3, opts: s => moveOpts(s.id) }],
      args: s => ({ id: s.id, to: s.to }) },
    { key: 'insert', title: 'Add a clip', pill: 'Add', cmd: 'insert', t0: 8.3,
      rule: 'Everything from that cut on slides later by exactly the new clip’s length. A caption over that cut splits, so no words sit over the new clip.',
      knobs: [{ type: 'choice', key: 'at', label: 'Where the new clip goes', def: 2, opts: () => insertOpts() }],
      args: s => ({ clips: [E.clone(NEWCLIP)], at: s.at }), subject: (s, ctx) => ctx.res && ctx.res.newIds && ctx.res.newIds[0] },
    { key: 'lift', title: 'Lift off', pill: 'Lift off', cmd: 'makeOverlay', t0: 8.3,
      rule: 'The clip keeps its time and goes on top. The clips after it close up, and what is on it stays with it.',
      knobs: [clipKnob('c3')], args: s => ({ id: s.id }) },
    { key: 'gap', title: 'Close a gap', pill: 'Close gap', cmd: 'closeGap', t0: 9,
      rule: 'Simple never closes a gap by itself. When you tap it, everything after slides back by exactly the gap.',
      knobs: [{ type: 'range', key: 'gap', label: 'The gap Full left', def: 0.8, lim: () => ({ min: 0.2, max: 2, step: 0.1 }), fmt: sec }],
      base: s => beachWithGap(s.gap), args: () => ({ id: 'c3' }), subject: () => 'c3' },
    { key: 'endcard', title: 'An end card follows the end', pill: 'End card', cmd: s => ENDEDIT[s.edit], t0: 15,
      rule: 'An end card starts where the clips end, and keeps doing so: every edit moves it by exactly as much as the end of the clips moved.',
      knobs: [{ type: 'choice', key: 'edit', label: 'The edit', def: 'trim', opts: () => [
        { v: 'trim', label: 'Trim Sunset’s end' }, { v: 'del', label: 'Delete Waves' }, { v: 'add', label: 'Add a clip at the end' }] }],
      base: () => beachEnd(),
      args: s => s.edit === 'del' ? { id: 'c2' } : s.edit === 'trim' ? { id: 'c4', dur: 2.35 } : { clips: [E.clone(NEWCLIP)], at: 4 },
      subject: (s, ctx) => s.edit === 'del' ? 'c2' : s.edit === 'trim' ? 'c4' : ctx.res && ctx.res.newIds && ctx.res.newIds[0] },
    { key: 'blendDel', title: 'Delete next to a crossfade', pill: 'Delete by a fade', cmd: 'deleteClip', t0: 7.4,
      rule: 'A crossfade is kept through a delete whenever it still fits. If the clip that makes the fade goes, the fade goes with it.',
      knobs: [clipKnob('c3', 'Which clip to delete')], base: () => beachBlend(), args: s => ({ id: s.id }) },
    { key: 'blendTrim', title: 'Trim either clip of a crossfade', pill: 'Trim by a fade', cmd: s => s.which === 'end' ? 'trimTail' : 'trimHead', t0: 7.4,
      rule: 'Trimming either clip of a crossfade keeps the fade exactly over the overlap. A trim stops before a clip gets shorter than twice the fade.',
      knobs: [{ type: 'choice', key: 'which', label: 'Which edge', def: 'end', opts: () => [
          { v: 'end', label: 'The end of Waves' }, { v: 'start', label: 'The start of Sandcastle' }] },
        { type: 'range', key: 'amt', label: 'How much to trim off', def: 1, lim: s => ({ min: 0.1, max: s.which === 'end' ? 2.5 : 2, step: 0.1 }), fmt: sec }],
      base: () => beachBlend(),
      args: s => s.which === 'end' ? { id: 'c2', dur: r2(WAVES_LONG - s.amt) } : { id: 'c3', by: s.amt },
      subject: s => s.which === 'end' ? 'c2' : 'c3' },
    { key: 'turn', title: 'Turn into a transition', pill: 'Into a transition', t0: 7.3, phase: 6,
      rule: 'Phase 6. One tap turns a hand-made crossfade into a real transition: the two clips meet in the middle of the overlap and nothing after them moves.',
      knobs: [], base: () => beachBlend(), local: ctx => turnInto(ctx), subject: () => 'c3' }
  ];

  function freshState(step) { const s = {}; step.knobs.forEach(k => { s[k.key] = k.def; }); return s; }
  /* Keep every knob inside what its clip allows. */
  function fix(step, s) {
    step.knobs.forEach(k => {
      if (k.type === 'range') { const lim = k.lim(s); s[k.key] = clamp(tenth(+s[k.key]), lim.min, lim.max); }
      else if (k.type === 'choice') {
        const opts = k.opts(s);
        if (!opts.some(o => o.v === s[k.key])) {
          if (k.key === 'to') { const i = B0R.idx[s.id]; const want = i + 2 <= B0R.main.length ? i + 2 : i - 1; s.to = opts.some(o => o.v === want) ? want : opts[0].v; }
          else s[k.key] = opts.some(o => o.v === k.def) ? k.def : opts[0].v;
        }
      } else if (k.type === 'clip' && !CLIPS.includes(s[k.key])) s[k.key] = k.def;
    });
    return s;
  }

  /* =================================================================== crossfades (§3.1) */
  /* Every blend seam: a (the clip before), b (the clip after), the overlap [s, e], and its owner (the upper clip, which fades). */
  function blendsOf(R) {
    const out = [];
    R.main.forEach((e, i) => {
      if (!i || e.slot || e.seam.kind !== 'blend') return;
      const p = R.main[i - 1]; if (p.slot) return;
      const owner = R.z.get(p.id) < R.z.get(e.id) ? p.id : e.id;
      out.push({ a: p.id, b: e.id, amt: e.seam.amt, s: e.start, e: p.end, owner, out: owner === p.id });
    });
    return out;
  }
  function ownedKeys(R, bl) { const l = R.layer(bl.owner), ks = (l && l.kf && l.kf.opacity) || []; return ks.filter(k => k.t >= bl.s - R.eps && k.t <= bl.e + R.eps); }

  /* =================================================================== one run on the engine */
  function runStep(step, s) {
    const before = step.base ? step.base(s) : beach();
    const R = E.classify(before);
    const ctx = { step, s, before, R, B: byId(before), args: {} };
    const noop = step.noop && step.noop(s);
    if (noop) { ctx.refused = noop; ctx.noop = true; return ctx; }
    if (step.local) { step.local(ctx); return finish(ctx); }
    const cmd = typeof step.cmd === 'function' ? step.cmd(s) : step.cmd;
    const args = step.args(s);
    ctx.cmd = cmd; ctx.args = args;
    const plan = E.commands[cmd](R, before, args);                // the plan, without applying it
    if (plan.refuse) { ctx.refused = plan.refuse; return ctx; }
    ctx.plan = plan;
    const ed = E.editor(before);
    const res = ed.run(cmd, args);                                  // the real run: one undo step
    if (!res.ok) { ctx.refused = res.say; return ctx; }
    ctx.res = res;
    ctx.after = E.clone(ed.doc);
    ctx.undoSteps = ed.undoStack.length;
    ed.undo();
    ctx.undoOk = JSON.stringify(ed.doc) === JSON.stringify(before) && !ed.canUndo();
    return finish(ctx);
  }
  function finish(ctx) {
    ctx.A = byId(ctx.after);
    ctx.R2 = E.classify(ctx.after);
    ctx.subject = ctx.step.subject ? ctx.step.subject(ctx.s, ctx) : ctx.args.id;
    ctx.ch = changes(ctx);
    return ctx;
  }

  /* Turn into a transition (Phase 6, §12.1), on the one crossfade: the clips meet at the middle of the overlap with no ripple (a's
     tail to b.start + amt/2, b's head trimmed by amt/2 so b's end stays), b gets a crossfade of the old length, what started on b's
     cut-off footage moves to b's new first frame (it keeps its clip), and the fade's keys inside the overlap go; a list left
     empty gets its value from just outside the overlap back as a plain value, never an empty list. */
  function turnInto(ctx) {
    const { R, before } = ctx, bl = blendsOf(R)[0];
    ctx.plan = { map: { type: 'none' }, lands: new Map() };
    ctx.sameTime = true; ctx.local = true;
    if (!bl) { ctx.refused = 'There is no crossfade here'; ctx.after = E.clone(before); return; }
    const doc = E.clone(before), M = byId(doc), a = M.get(bl.a), b = M.get(bl.b), h = bl.amt / 2, mid = bl.s + h;
    const moved = [];
    (R.followers[bl.b] || []).forEach(f => {
      const u = R.units[f]; if (!u || u.kind === 'captions' || u.start >= mid - 1e-9) return;
      const l = M.get(f), d = mid - l.start; l.start = mid; shiftKeys(l, d); moved.push(f);
    });
    a.duration = mid - a.start;
    b.start += h; b.duration -= h; b.trimStart = ts(b) + h * spd(b);
    const gone = [];
    [[a, bl.s - 1e-6], [b, bl.e + 1e-6]].forEach(([l, edge]) => {
      const ks = l.kf && l.kf.opacity; if (!ks || !ks.length) return;
      const keep = ks.filter(k => k.t < bl.s - R.eps || k.t > bl.e + R.eps);
      if (keep.length === ks.length) return;
      gone.push(l.id);
      if (keep.length) { l.kf.opacity = keep; return; }
      l.opacity = E.valueAt(ks, edge); delete l.kf.opacity;
      if (!Object.keys(l.kf).length) delete l.kf;
    });
    b.trIn = { type: 'crossfade', d: bl.amt };
    ctx.after = doc;
    ctx.turn = { a: bl.a, b: bl.b, amt: bl.amt, mid, moved, gone, owner: bl.owner };
    ctx.args = { id: bl.b };
  }
  /* For the pictures only: a document that draws the transition as the fade it is (the clips run on under it, one fading). */
  function transitionView(doc) {
    const d = E.clone(doc), M = byId(d);
    d.layers.forEach(inc => {
      if (!inc.trIn) return;
      const out = d.layers.find(l => l !== inc && l.sm && l.sm.main && Math.abs(endOf(l) - inc.start) < 1e-6);
      if (!out) return;
      const h = inc.trIn.d / 2, cut = inc.start;
      out.duration += h;
      inc.start -= h; inc.duration += h; inc.trimStart = Math.max(0, ts(inc) - h * spd(inc));
      const upOut = d.layers.indexOf(out) < d.layers.indexOf(inc), up = upOut ? out : inc;
      up.kf = up.kf || {};
      up.kf.opacity = upOut ? [{ t: cut - h, v: 1 }, { t: cut + h, v: 0 }] : [{ t: cut - h, v: 0 }, { t: cut + h, v: 1 }];
      delete up.opacity;
      void M;
    });
    return d;
  }

  /* The head trim's alternative (not chosen): things on the clip keep the same time into it. */
  function altDoc(c) {
    const d = E.clone(c.after), A = byId(d), id = c.args.id, hb = c.B.get(id), ha = A.get(id);
    folOf(c, id).forEach(f => {
      const l = A.get(f), fb = c.B.get(f); if (!l) return;
      const want = ha.start + (fb.start - hb.start), dd = want - l.start;
      l.start = want; shiftKeys(l, dd);
    });
    return d;
  }

  /* =================================================================== footage maths */
  /* Where one moment of the video (before) is after the edit: followed through its clip's footage. */
  function follow(ctx, t) {
    const { R } = ctx, m = mapOf(ctx.plan);
    const e = R.mainAt(t);
    if (ctx.sameTime) return { t2: t, id: e && !e.slot ? e.id : null, kept: true, same: true };
    if (e && !e.slot) {
      const keptOn = id => {
        const lb = R.layer(id), la = ctx.A.get(id);
        if (!la || !isMedia(la) || !isMedia(lb)) return null;
        const t2 = tOfSrc(la, srcAt(lb, t));
        return t2 >= la.start - TOL && t2 < endOf(la) - TOL ? { t2, id, kept: true } : null;
      };
      const hit = keptOn(e.id);
      if (hit) return hit;
      // inside a crossfade two clips play: if the later one's frame is gone, the earlier one's may still be there
      const bl = blendsOf(R).find(b => b.b === e.id && t >= b.s - TOL && t < b.e);
      const other = bl && keptOn(bl.a);
      if (other) return other;
      return { t2: E.mapT(m, t), id: e.id, kept: false, gone: true };
    }
    return { t2: E.mapT(m, t), id: null, kept: false, empty: true };
  }
  /* The camera follows the clip ROW (§3.5, §3.10): a key over a clip still in the row stays on the same moment of its footage; a key
     over footage that left the row (cut, or lifted off) goes; a key over no clip goes through the same time map as the clips. */
  function camFollow(ctx, t) {
    if (ctx.sameTime) return { t2: t, kept: true };
    const { R, A, R2 } = ctx, e = R.mainAt(t);
    if (e && !e.slot) {
      const lb = R.layer(e.id), la = A.get(e.id);
      if (la && R2.isMain(e.id) && isMedia(la)) { const t2 = tOfSrc(la, srcAt(lb, t)); if (t2 >= la.start - TOL && t2 < endOf(la) - TOL) return { t2, kept: true, id: e.id }; }
      return { kept: false, id: e.id, lifted: !!la && !R2.isMain(e.id) };
    }
    return { t2: E.mapT(mapOf(ctx.plan), t), kept: true };
  }
  function camInfo(ctx) {
    if (!ctx.after) return null;
    const cb = ctx.before.layers.find(isCam); if (!cb) return null;
    const ca = ctx.A.get(cb.id); if (!ca) return null;
    const kb = (cb.kf && cb.kf.zoom) || [], ka = (ca.kf && ca.kf.zoom) || [];
    const kept = [], cut = [], miss = [], used = new Set();
    kb.forEach(k => {
      const f = camFollow(ctx, k.t);
      if (!f.kept) { cut.push({ k, id: f.id, lifted: f.lifted }); return; }
      const j = ka.findIndex((x, i) => !used.has(i) && Math.abs(x.t - f.t2) < TOL && Math.abs(x.v - k.v) < 1e-9);
      if (j < 0) miss.push({ k, t2: f.t2 }); else { used.add(j); kept.push({ k, t2: f.t2 }); }
    });
    // keys the cut adds: a clean step, two keys at one time (the value just before the cut, then the value after it)
    const extra = ka.filter((x, i) => !used.has(i)), steps = [], stray = [];
    extra.forEach(x => { if (steps.some(s => Math.abs(s - x.t) < TOL)) return; const n = extra.filter(y => Math.abs(y.t - x.t) < TOL).length; if (n === 2) steps.push(x.t); else stray.push(x); });
    return { kb, ka, kept, cut, miss, steps, stray, ok: !miss.length && !stray.length };
  }
  /* The bands between the two strips: each clip's kept footage, what was cut out, what was added, closed gaps. */
  function bands(ctx) {
    const { R, R2, A, plan } = ctx, m = mapOf(plan), out = [];
    R.main.forEach((e, i) => {
      const g0 = i ? R.main[i - 1].end : 0;
      if (e.seam.kind === 'gap' && e.start - g0 > TOL) out.push({ kind: 'gap', b0: g0, b1: e.start, a0: E.mapT(m, g0), a1: E.mapT(m, e.start, true) });
      if (e.slot) return;
      const lb = R.layer(e.id), la = A.get(e.id), col = (lb.look || [])[0] || '#5ac7ed';
      if (!la) { const p = E.mapT(m, e.start); out.push({ kind: 'cut', id: e.id, b0: e.start, b1: e.end, a0: p, a1: p }); return; }
      const lifted = !R2.isMain(e.id);
      const sb0 = ts(lb), sb1 = ts(lb) + lb.duration * spd(lb), sa0 = ts(la), sa1 = ts(la) + la.duration * spd(la);
      const k0 = Math.max(sb0, sa0), k1 = Math.min(sb1, sa1);
      if (k1 > k0 + 1e-9) out.push({ kind: lifted ? 'lift' : 'keep', id: e.id, col, b0: tOfSrc(lb, k0), b1: tOfSrc(lb, k1), a0: tOfSrc(la, k0), a1: tOfSrc(la, k1) });
      if (sb0 < k0 - 1e-9) { const p = tOfSrc(la, k0); out.push({ kind: 'cut', id: e.id, b0: tOfSrc(lb, sb0), b1: tOfSrc(lb, k0), a0: p, a1: p }); }
      if (sb1 > k1 + 1e-9) { const p = tOfSrc(la, k1); out.push({ kind: 'cut', id: e.id, b0: tOfSrc(lb, k1), b1: tOfSrc(lb, sb1), a0: p, a1: p }); }
      if (sa0 < k0 - 1e-9) { const p = tOfSrc(lb, k0); out.push({ kind: 'add', id: e.id, b0: p, b1: p, a0: tOfSrc(la, sa0), a1: tOfSrc(la, k0) }); }
      if (sa1 > k1 + 1e-9) { const p = tOfSrc(lb, k1); out.push({ kind: 'add', id: e.id, b0: p, b1: p, a0: tOfSrc(la, k1), a1: tOfSrc(la, sa1) }); }
    });
    R2.main.forEach(e => {
      if (e.slot || ctx.B.get(e.id)) return;
      const p = plan.map && plan.map.type === 'insert' ? plan.map.at : e.start;
      out.push({ kind: 'add', id: e.id, b0: p, b1: p, a0: e.start, a1: e.end });
    });
    return out;
  }

  /* =================================================================== what moved */
  function cueList(doc) {
    const out = [];
    doc.layers.forEach(l => {
      if (!isTrack(l)) return;
      l.captions.forEach(c => { if (c.end <= 0 || c.start >= l.duration) return; out.push({ tr: l.id, text: c.text, s: l.start + c.start, e: l.start + c.end }); });
    });
    return out.sort((a, b) => a.s - b.s);
  }
  function keyTimes(l) { const a = []; E.kfLists(l).forEach(x => x.forEach(k => a.push(k.t))); return a.sort((p, r) => p - r); }
  const sameNums = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < TOL);
  function moveTag(ds, dl) {
    const parts = [];
    if (Math.abs(ds) >= TOL) parts.push(ds < 0 ? sec(-ds) + ' earlier' : sec(ds) + ' later');
    if (Math.abs(dl) >= TOL) parts.push(dl < 0 ? sec(-dl) + ' shorter' : sec(dl) + ' longer');
    return parts;
  }
  const ORDER = { Clips: 0, 'On the clips': 1, 'After the clips': 2, Captions: 3, Camera: 4, Sound: 5 };

  function changes(ctx) {
    const { before, after, R, R2, A, B } = ctx, rows = [], same = [];
    const grp = l => R.isMain(l.id) ? 'Clips' : l.audioOnly ? 'Sound' : isCam(l) ? 'Camera' : R.tail.includes(l.id) ? 'After the clips' : 'On the clips';
    before.layers.filter(l => !isTrack(l)).sort((a, b) => ORDER[grp(a)] - ORDER[grp(b)] || a.start - b.start).forEach(l => {
      const a = A.get(l.id), g = grp(l), k = 'L:' + l.id;
      if (!a) {
        const u = R.units[l.id], h = u && u.host && R.layer(u.host);
        rows.push({ cat: 'layer', k, g, id: l.id, name: label(l), from: spanTxt(l.start, endOf(l)), to: 'gone', tag: h ? 'went with ' + h.name : 'deleted', kind: 'gone', b: [l.start, endOf(l)] });
        return;
      }
      const kb = keyTimes(l), ka = keyTimes(a);
      if (isCam(l)) {                                                 // the camera: its window does not matter, its moves do
        if (sameNums(kb, ka)) { same.push('the camera’s zoom'); return; }
        const ci = camInfo(ctx), mv = ci ? ci.kept.filter(x => Math.abs(x.t2 - x.k.t) > TOL).length : 0;
        const tag = [mv ? mv + plural(mv, ' move', ' moves') + ' shifted' : '', ci && ci.cut.length ? ci.cut.length + plural(ci.cut.length, ' went', ' went') : ''].filter(Boolean).join(', ') || 'moves shifted';
        const row = { cat: 'layer', k, g, id: l.id, name: 'Camera zoom', from: kb.map(n2).join(', ') + ' s', to: ka.map(n2).join(', ') + ' s', tag, kind: 'moved', b: [0, before.project.duration] };
        row.note = 'made in Full; its moves follow the clips under them' + (ci && ci.steps.length ? '. Where a move was cut out, two keys at ' + andList(ci.steps.map(sec)) + ' make a clean step across the cut' : '');
        rows.push(row); return;
      }
      const ds = a.start - l.start, dl = a.duration - l.duration, dsp = Math.abs(spd(a) - spd(l)) > TOL;
      const lifted = R.isMain(l.id) && !R2.isMain(l.id), pinned = !E.hasFlag(l, 'stay') && E.hasFlag(a, 'stay');
      const trAdded = !l.trIn && a.trIn;
      if (Math.abs(ds) < TOL && Math.abs(dl) < TOL && !dsp && sameNums(kb, ka) && !lifted && !trAdded) { same.push(label(l)); return; }
      const parts = moveTag(ds, dl);
      if (dsp) parts.push('now ' + nice(spd(a)) + '×');
      if (lifted) parts.push('now on top');
      if (!parts.length) parts.push(sameNums(kb, ka) ? 'same place' : 'keys moved');
      const row = { cat: 'layer', k, g, id: l.id, name: label(l), from: spanTxt(l.start, endOf(l)), to: spanTxt(a.start, endOf(a)), tag: parts.join(', '), kind: 'moved', b: [l.start, endOf(l)], a: [a.start, endOf(a)] };
      const u2 = R2.units[l.id];
      if (trAdded) row.note = 'a ' + sec(a.trIn.d) + ' crossfade transition now sits on its first cut';
      else if (ctx.turn && ctx.turn.gone.includes(l.id)) row.note = 'its fade-out keys went: the transition does the fade now';
      else if (u2 && u2.host && !R2.isMain(l.id)) { const h = A.get(u2.host); if (h) { const off = a.start - h.start; row.note = off < TOL ? 'starts on the first frame of ' + h.name : 'starts ' + sec(off) + ' into ' + h.name; } }
      else if (pinned) row.note = 'stays with the lifted clip, now set to stay put';
      else if (E.hasFlag(a, 'tail')) row.note = R.tail.length ? 'ends with the last clip' : 'ends with the video';
      else if (R.tail.includes(l.id)) row.note = 'an end card: it follows the end of the clips';
      if (kb.length && !sameNums(kb, ka)) row.keys = { from: kb, to: ka };
      rows.push(row);
    });
    // captions, line by line (a split line has two pieces with the same words)
    const cb = cueList(before), ca = cueList(after), seen = new Map();
    const m = mapOf(ctx.plan);
    cb.forEach(c => {
      const key = c.tr + '|' + c.text; if (seen.has(key)) return; seen.set(key, true);
      const bs = cb.filter(x => x.tr === c.tr && x.text === c.text), as = ca.filter(x => x.tr === c.tr && x.text === c.text);
      const k = 'Q:' + c.tr + ':' + c.text;
      const from = bs.map(x => spanTxt(x.s, x.e)).join(' and ');
      if (!as.length) {
        const e = R.mainAt((c.s + c.e) / 2), h = e && !e.slot ? R.layer(e.id) : null;
        rows.push({ cat: 'cue', k, g: 'Captions', text: c.text, name: q(c.text), from, to: 'gone', kind: 'gone', tag: h ? (A.get(h.id) ? 'its part of ' + h.name + ' was cut' : 'went with ' + h.name) : 'cut', b: [c.s, c.e] });
        return;
      }
      const to = as.map(x => spanTxt(x.s, x.e)).join(' and ');
      if (as.length > bs.length) { rows.push({ cat: 'cue', k, g: 'Captions', text: c.text, name: q(c.text), from, to, kind: 'split', tag: 'split in two', b: [c.s, c.e], a: [as[0].s, as[as.length - 1].e] }); return; }
      const ds = as[0].s - bs[0].s, dl = (as[0].e - as[0].s) - (bs[0].e - bs[0].s);
      if (Math.abs(ds) < TOL && Math.abs(dl) < TOL && as.length === bs.length) { same.push(q(c.text)); return; }
      const kind = Math.abs(dl) < TOL ? 'moved' : 'resized';
      const row = { cat: 'cue', k, g: 'Captions', text: c.text, name: q(c.text), from, to, kind, tag: moveTag(ds, dl).join(', '), b: [c.s, c.e], a: [as[0].s, as[0].e] };
      if (kind === 'resized' && dl < 0 && m.type === 'cut' && c.s < m.b && c.e > m.a) {
        const e = R.mainAt((Math.max(c.s, m.a) + Math.min(c.e, m.b)) / 2);
        if (e && !e.slot) row.note = 'its part over ' + (A.get(e.id) ? poss(NAME(e.id)) + ' trimmed footage' : NAME(e.id)) + ' was cut';
        else row.note = 'its part in the gap was cut';
        row.kind = 'cut';
      } else if (kind === 'resized' && m.type === 'speed' && c.s < m.a + m.old && c.e > m.a) {
        const e = R.mainAt(m.a + 1e-6); if (e && !e.slot) row.note = 'sped up with ' + NAME(e.id);
      }
      rows.push(row);
    });
    // new things
    after.layers.forEach(a => { if (!B.get(a.id)) rows.push({ cat: 'layer', k: 'L:' + a.id, g: R2.isMain(a.id) ? 'Clips' : 'On the clips', id: a.id, name: label(a), from: '—', to: spanTxt(a.start, endOf(a)), tag: 'new', kind: 'new', a: [a.start, endOf(a)] }); });
    rows.sort((p, r) => ORDER[p.g] - ORDER[r.g]);
    return { rows, same, d0: before.project.duration, d1: after.project.duration };
  }
  function cueKinds(ctx) {
    const rows = ctx.ch.rows.filter(r => r.cat === 'cue'), by = k => rows.filter(r => r.kind === k);
    return { gone: by('gone'), split: by('split'), cut: by('cut'), resized: by('resized'), moved: by('moved') };
  }

  /* What happened to each crossfade, measured on the result. */
  function fadeInfo(ctx) {
    if (!ctx.after || ctx.turn) return [];
    const post = blendsOf(ctx.R2);
    return blendsOf(ctx.R).map(bl => {
      const r = { bl, partner: bl.out ? bl.b : bl.a };
      if (!ctx.A.get(bl.owner)) {                               // the clip that made the fade is gone: the other clip must meet its new
        const nb = ctx.A.get(r.partner) ? r.partner : null;        // neighbour with a plain cut on that side
        const e2 = nb && ctx.R2.entry(nb), side = e2 && (bl.out ? e2 : ctx.R2.main[e2.i + 1]);
        r.kind = 'wentWithOwner'; r.nb = nb;
        r.ok = !side || (bl.out && e2.i === 0) || side.seam.kind === 'join';
        return r;
      }
      const pb = post.find(x => x.owner === bl.owner && x.out === bl.out);
      if (!pb) {                                                   // not kept: the design strips the fade and says "removed 1 crossfade"
        const left = ownedKeys(ctx.R2, { owner: bl.owner, s: bl.s, e: bl.e });
        r.kind = 'removed'; r.ok = !left.length; return r;
      }
      r.pb = pb; r.partner2 = bl.out ? pb.b : pb.a;
      const kb = ownedKeys(ctx.R, bl), ka = ownedKeys(ctx.R2, pb);
      r.amtOk = Math.abs(pb.amt - bl.amt) < TOL;
      r.keysOk = kb.length === ka.length && kb.every((k, i) => Math.abs((ka[i].t - pb.s) - (k.t - bl.s)) < TOL && Math.abs(ka[i].v - k.v) < 1e-9);
      r.ok = r.amtOk && r.keysOk;
      r.kind = r.partner2 !== r.partner ? 'newPartner' : Math.abs(pb.s - bl.s) > TOL ? 'moved' : 'same';
      return r;
    });
  }
  function fadeWords(ctx, r) {
    const bl = r.bl, own = NAME(bl.owner), verb = bl.out ? 'fades out over ' : 'fades in over ';
    if (r.kind === 'wentWithOwner') {
      const e2 = r.nb && ctx.R2.entry(r.nb), other = e2 && (bl.out ? ctx.R2.main[e2.i - 1] : ctx.R2.main[e2.i + 1]);
      return 'The fade was part of ' + own + ', so it went with it' + (r.nb ? '; ' + NAME(r.nb) + ' now meets ' + (other && !other.slot ? NAME(other.id) : 'the edge of the video') + ' with a plain cut' : '') + '.';
    }
    if (r.kind === 'removed') return 'The fade could not carry over, so it was taken off ' + own + ' and the cut is a plain one; Simple says “removed 1 crossfade”.';
    const span = spanTxt(r.pb.s, r.pb.e);
    if (r.kind === 'newPartner') return own + ' ' + (bl.out ? 'faded out over ' : 'faded in over ') + NAME(r.partner) + '; now it ' + verb + NAME(r.partner2) + ' instead, over the same ' + sec(bl.amt) + ' (' + span + '). It is kept because it still fits: ' + own + ' is on top, and ' + sec(bl.amt) + ' is less than half of either clip.';
    if (r.kind === 'moved') return 'The fade moves with its clips, whole: ' + own + ' still ' + verb + NAME(r.partner) + ' for ' + sec(bl.amt) + ', now ' + span + '.';
    return 'The fade does not move: ' + own + ' still ' + verb + NAME(r.partner) + ', ' + span + '.';
  }

  /* =================================================================== the checks (worked out, never assumed) */
  function keyName(l, prop, list) {
    const own = isClipLike(l) ? poss(l.name) : l.id === 'endcard' ? 'the end card’s' : l.type === 'text' ? 'the title’s' : l.audioOnly ? 'the song’s' : poss('the ' + String(l.name).toLowerCase());
    const f = list[0], z = list[list.length - 1];
    const kind = prop === 'opacity' ? (z.v >= f.v ? 'fade-in' : 'fade-out') : prop === 'volume' ? (z.v <= f.v ? 'fade-out' : 'fade-up')
      : prop === 'scale' ? (z.t - f.t <= 0.6 ? 'pop-in' : 'zoom') : prop;
    return own + ' ' + kind;
  }
  function checks(ctx) {
    const { R, R2, A, B, before, after } = ctx, out = [];
    const blends2 = blendsOf(R2);
    // 1. the cuts
    const bad = R2.main.filter(e => (e.i > 0 || e.start > R2.eps) && ['gap', 'overlap'].includes(e.seam.kind));
    const hadGap = R.main.find(e => e.seam.kind === 'gap');
    if (bad.length) out.push({ ok: false, title: 'A cut is not exact', text: bad.map(e => (e.seam.kind === 'gap' ? 'a ' + sec(e.seam.amt) + ' gap' : 'a ' + sec(e.seam.amt) + ' overlap') + ' before ' + label(R2.layer(e.id))).join(' · ') });
    else if (hadGap) { const e = R2.entry(hadGap.id), p = R2.main[e.i - 1]; out.push({ ok: true, title: 'The gap is shut exactly', text: label(R2.layer(e.id)) + ' now starts at ' + sec(e.start) + (p ? ', exactly where ' + label(R2.layer(p.id)) + ' ends.' : '.') }); }
    else out.push({ ok: true, title: 'Every cut is still exact', text: 'Each clip starts exactly where the one before it ends' + (blends2.length ? ', except where a crossfade overlaps them on purpose.' : '. No gap or overlap was made.') });
    // 2. what sits on each clip
    const good = [], wrong = [];
    Object.keys(R.followers).forEach(h => (R.followers[h] || []).forEach(f => {
      const fa = A.get(f), ha = A.get(h), fb = B.get(f), hb = B.get(h);
      if (!fa || !fb || isTrack(fb)) return;                      // deleted with its clip: listed under What moved
      if (!ha) { wrong.push(Cap(what(fa)) + ' outlived its clip'); return; }
      if (!R2.isMain(h)) {                                          // lifted: keeps its time with the clip, now pinned
        const okk = Math.abs((fa.start - ha.start) - (fb.start - hb.start)) < TOL && E.hasFlag(fa, 'stay');
        (okk ? good : wrong).push(Cap(what(fa)) + (okk ? ' stays with ' + ha.name + ', on top, set to stay put' : ' lost its place on ' + ha.name));
        return;
      }
      const u2 = R2.units[f];
      if (u2 && u2.host === h) { const off = fa.start - ha.start; good.push(Cap(what(fa)) + (off < TOL ? ' starts on the first frame of ' + ha.name : ' starts ' + sec(off) + ' into ' + ha.name)); }
      else wrong.push(Cap(what(fa)) + ' now starts on ' + (u2 && u2.host ? label(A.get(u2.host)) : 'nothing'));
    }));
    if (good.length || wrong.length) out.push({ ok: !wrong.length, title: wrong.length ? 'Something left its clip' : 'Everything on a clip still starts on it', text: (wrong.length ? wrong : good).join('. ') + '.' });
    // 3. keyframes (a crossfade's own keys are checked in 5, the camera's in 8)
    const fadeOwners = new Set(blendsOf(R).map(b => b.owner));
    const foot = [], offs = [], tails = [], off = [], fadesGone = [];
    before.layers.forEach(l => {
      const a = A.get(l.id); if (!a || !l.kf || isCam(l)) return;
      Object.keys(l.kf).forEach(prop => {
        const kb = l.kf[prop], ka = (a.kf && a.kf[prop]) || [];
        if (!Array.isArray(kb) || !kb.length) return;
        const nm = keyName(l, prop, kb);
        if (prop === 'opacity' && fadeOwners.has(l.id)) { if (ctx.turn) fadesGone.push(nm); return; }
        if (ka.length !== kb.length) { off.push(nm + ' lost a keyframe'); return; }
        if (E.hasFlag(l, 'tail') && E.hasFlag(a, 'tail')) {
          const ok = kb.every((k, i) => endOf(l) - k.t > 3 + TOL || Math.abs((endOf(a) - ka[i].t) - (endOf(l) - k.t)) < TOL);
          (ok ? tails : off).push(ok ? nm : nm + ' moved away from the end');
        } else if (isClipLike(l)) {
          const ok = kb.every((k, i) => Math.abs(srcAt(a, ka[i].t) - srcAt(l, k.t)) < TOL);
          (ok ? foot : off).push(ok ? nm : nm + ' slipped off its footage');
        } else {
          const ok = kb.every((k, i) => Math.abs((ka[i].t - a.start) - (k.t - l.start)) < TOL);
          (ok ? offs : off).push(ok ? nm : nm + ' moved against its layer');
        }
      });
    });
    const ks = [];
    if (foot.length) ks.push(Cap(andList(foot)) + (foot.length === 1 ? ' stays' : ' stay') + ' on the same moment of footage');
    if (offs.length) ks.push(Cap(andList(offs)) + (offs.length === 1 ? ' keeps' : ' keep') + ' the same distance from ' + (offs.length === 1 ? 'its' : 'their') + ' start');
    if (tails.length) ks.push(Cap(andList(tails)) + ' stays at the very end');
    if (off.length || ks.length) out.push({ ok: !off.length, title: off.length ? 'A keyframe moved on its own' : 'Keyframes moved with what they belong to', text: (off.length ? off.map(Cap) : ks).join('. ') + '.' });
    // 4. captions against the footage under them: every edge whose frame is still there, and the middle of every piece
    const ca = cueList(after), cbl = cueList(before);
    let n = 0; const miss = [];
    cbl.forEach(c => {
      [['s', c.s], ['e', c.e]].forEach(([side, t]) => {
        const e = R.mainAt(side === 'e' ? t - 1e-7 : t); if (!e || e.slot) return;
        const lb = R.layer(e.id), la = A.get(e.id); if (!la || !isMedia(la)) return;
        const t2 = tOfSrc(la, srcAt(lb, t));
        const inside = side === 's' ? t2 >= la.start - TOL && t2 < endOf(la) - TOL : t2 > la.start + TOL && t2 <= endOf(la) + TOL;
        if (!inside) return;                                         // that frame was cut out: the line went with it
        const pieces = ca.filter(x => x.tr === c.tr && x.text === c.text);
        if (!pieces.length) return;                                  // what was left was under 0.1 s: dropped, as the design says
        const hit = side === 's' ? pieces.some(x => Math.abs(x.s - t2) < TOL) : pieces.some(x => Math.abs(x.e - t2) < TOL);
        n++; if (!hit) miss.push(q(c.text) + (side === 's' ? ' starts' : ' ends') + ' off its words');
      });
    });
    // footage that was not in the video before: a new clip, or more of a clip that was lengthened. No line may sit on it.
    const fresh = [];
    after.layers.forEach(la => {
      if (!isClipLike(la)) return;
      const lb = B.get(la.id);
      if (!lb) { fresh.push({ l: la, a: la.start, b: endOf(la), whole: true }); return; }
      const w0 = ts(lb), w1 = ts(lb) + lb.duration * spd(lb), f0 = ts(la), f1 = ts(la) + la.duration * spd(la);
      if (f0 < w0 - TOL) fresh.push({ l: la, a: la.start, b: tOfSrc(la, Math.min(w0, f1)) });
      if (f1 > w1 + TOL) fresh.push({ l: la, a: tOfSrc(la, Math.max(w1, f0)), b: endOf(la) });
    });
    const overNew = [];
    ca.forEach(p => {
      fresh.forEach(f => {
        const a0 = Math.max(p.s, f.a), a1 = Math.min(p.e, f.b);
        if (a1 - a0 > 0.01) overNew.push(q(p.text) + ' shows over ' + (f.whole ? f.l.name : 'footage of ' + f.l.name + ' that was not in the video before') + ', from ' + n2(a0) + ' to ' + sec(a1));
      });
      const mid = (p.s + p.e) / 2, own = cbl.filter(x => x.tr === p.tr && x.text === p.text);
      const under = after.layers.filter(l => isClipLike(l) && mid >= l.start - TOL && mid < endOf(l) - TOL);
      if (!under.length || fresh.some(f => mid > f.a && mid < f.b)) return;
      n++;
      const ok = under.some(la => { const lb = B.get(la.id); if (!lb) return false; const tb = tOfSrc(lb, srcAt(la, mid)); return own.some(x => tb >= x.s - TOL && tb <= x.e + TOL); });
      if (!ok) miss.push(q(p.text) + ' moved off its words');
    });
    if (overNew.length) out.push({ ok: false, title: 'A caption sits over new footage', text: overNew.join('. ') + '. The design says it must not.' });
    if (n) out.push({ ok: !miss.length, title: miss.length ? 'A caption slipped' : 'Every caption still sits on its words',
      text: miss.length ? miss.join('. ') + '.' : 'Checked ' + n + ' caption edges and middles against the footage under them. Each sits on the same moment of video as before' + (cueKinds(ctx).gone.length ? '; lines over footage that was cut out went with it.' : '.') });
    // 5. crossfades
    fadeInfo(ctx).forEach(r => {
      const title = r.kind === 'wentWithOwner' ? 'The fade went with its clip' : r.kind === 'removed' ? 'The fade was taken off, cleanly' : r.ok ? 'The crossfade still sits exactly over the overlap' : 'The crossfade came apart';
      let text = fadeWords(ctx, r);
      if (r.pb && !r.ok) text = (r.amtOk ? '' : 'The overlap changed from ' + sec(r.bl.amt) + ' to ' + sec(r.pb.amt) + '. ') + (r.keysOk ? '' : 'The fade’s keys no longer line up with the overlap.');
      else if (r.pb) text = 'Measured: ' + sec(r.pb.amt) + ' of overlap, as before, and ' + poss(NAME(r.bl.owner)) + ' fade runs exactly across it, ' + spanTxt(r.pb.s, r.pb.e) + '.';
      else if (!r.ok) text = 'Something of the fade was left behind.';
      out.push({ ok: r.ok, title, text });
    });
    // 6. Turn into a transition
    if (ctx.turn) {
      const T = ctx.turn, a = A.get(T.a), b = A.get(T.b);
      const meet = Math.abs(endOf(a) - T.mid) < TOL && Math.abs(b.start - T.mid) < TOL;
      const trOk = !!b.trIn && b.trIn.type === 'crossfade' && Math.abs(b.trIn.d - T.amt) < TOL;
      const ow = A.get(T.owner);
      const noEmpty = [a, b].every(l => !(l.kf && Array.isArray(l.kf.opacity) && !l.kf.opacity.length)) && !ownedKeys(R2, { owner: T.owner, s: T.mid - T.amt / 2, e: T.mid + T.amt / 2 }).length &&
        !!ow && (ow.opacity == null || ow.opacity > 0.999 || !!(ow.kf && ow.kf.opacity && ow.kf.opacity.length));
      out.push({ ok: meet && trOk && noEmpty, title: meet && trOk && noEmpty ? 'The two clips meet in the middle, with a transition' : 'The transition is not right',
        text: NAME(T.a) + ' now ends and ' + NAME(T.b) + ' now starts at ' + sec(T.mid) + ', the middle of the old overlap, and a ' + sec(b.trIn ? b.trIn.d : 0) + ' crossfade sits on the cut: the same length as the fade it replaces. ' +
          (fadesGone.length ? Cap(andList(fadesGone)) + ' went' : 'The hand-made fade went') + (noEmpty ? ', and ' + NAME(T.owner) + ' is left fully visible: no empty list of fade keys, which would hide the clip.' : ', but an empty list of fade keys was left behind, which hides the clip.') });
      const still = before.layers.filter(l => l.id !== T.a && l.id !== T.b && !T.moved.includes(l.id));
      const shifted = still.filter(l => { const x = A.get(l.id); return !x || Math.abs(x.start - l.start) > TOL || Math.abs(x.duration - l.duration) > TOL || !sameNums(keyTimes(l), keyTimes(x)); });
      const lenOk = Math.abs(after.project.duration - before.project.duration) < TOL;
      out.push({ ok: !shifted.length && lenOk, title: !shifted.length && lenOk ? 'Nothing after the cut moved' : 'Something else moved',
        text: !shifted.length && lenOk ? 'Sunset, the captions, the camera and the song are exactly where they were, and the video stays ' + sec(after.project.duration) + '.' + (T.moved.length ? ' Only ' + andList(T.moved.map(f => what(B.get(f)))) + ' moved, onto ' + poss(NAME(T.b)) + ' new first frame.' : '')
          : andList(shifted.map(label)) + ' moved.' });
    }
    // 7. the end card
    R.tail.forEach(id => {
      const lb = B.get(id), la = A.get(id); if (!lb) return;
      if (!la) { out.push({ ok: false, title: 'The end card is gone', text: 'Nothing in this edit should remove it.' }); return; }
      const gap = lb.start - R.trackEnd, want = R2.trackEnd + gap, dk = la.start - lb.start;
      const ok = Math.abs(la.start - want) < TOL && Math.abs(la.duration - lb.duration) < TOL && sameNums(keyTimes(lb).map(t => t + dk), keyTimes(la));
      out.push({ ok, title: ok ? 'The end card follows the end of the clips' : 'The end card lost the end',
        text: 'It started at ' + sec(lb.start) + ', where the clips ended; now it starts at ' + sec(la.start) + (ok ? ', where they end now, and keeps its ' + sec(lb.duration) + ' and its fade-in.' : ', but the clips end at ' + sec(R2.trackEnd) + '.') });
    });
    // 8. the camera
    const ci = camInfo(ctx);
    if (ci && ci.kb.length) {
      const mv = ci.kept.filter(x => Math.abs(x.t2 - x.k.t) > TOL).length;
      out.push({ ok: ci.ok, title: ci.ok ? (mv || ci.cut.length ? 'The camera moved exactly with the clips' : 'The camera did not move') : 'The camera slipped',
        text: ci.ok ? 'Its ' + ci.kb.length + ' zoom keys (made in Full): ' + (ci.kept.length ? ci.kept.length + ' still ' + plural(ci.kept.length, 'sits', 'sit') + ' on the same moment of the footage under ' + plural(ci.kept.length, 'it', 'them') : 'none is left') +
          (ci.cut.length ? '; ' + ci.cut.length + ' sat over footage that ' + (ci.cut.every(c => c.lifted) ? 'left the clip row' : 'was cut out') + ', so ' + plural(ci.cut.length, 'it', 'they') + ' went' + (ci.steps.length ? ', and the zoom steps cleanly across the cut at ' + andList(ci.steps.map(sec)) : '') : '') + '.'
          : ci.miss.map(x => 'the key at ' + sec(x.k.t) + ' should be at ' + sec(x.t2)).join('; ') + (ci.stray.length ? '; ' + ci.stray.length + ' extra key(s)' : '') + '.' });
    }
    // 9. the song (D17 B, his pick): it stays put, keeps its length, and nothing fits or fades it to the clips
    const songB = before.layers.find(l => l.audioOnly), song = songB && A.get(songB.id);
    if (song) {
      const okS = Math.abs(song.start - songB.start) < TOL && Math.abs(song.duration - songB.duration) < TOL && !E.hasFlag(song, 'tail');
      const runs = endOf(song) > R2.trackEnd + TOL, short = endOf(song) < R2.trackEnd - TOL;
      const lenOk = Math.abs(after.project.duration - Math.max(R2.trackEnd, ...after.layers.filter(l => !isCam(l) && l.type !== 'group' && !E.hasFlag(l, 'tail')).map(endOf))) < TOL;
      out.push({ ok: okS && lenOk, title: okS ? 'The song stays put and keeps its length' : 'The song moved or changed length',
        text: 'The clips now end at ' + sec(R2.trackEnd) + ', and ' + song.name + ' ends at ' + sec(endOf(song)) + (okS ? ', as before.' : ' (it was ' + sec(endOf(songB)) + ').') +
          (runs ? ' So the video runs on in black after the last clip, to ' + sec(after.project.duration) + ', as Full does today (your pick, D17).' :
            short ? ' So the last ' + sec(R2.trackEnd - endOf(song)) + ' of the clips have no music.' : '') +
          (lenOk ? '' : ' The video\'s length is wrong: ' + sec(after.project.duration) + '.') });
    }
    // 10. undo
    if (!ctx.local) out.push({ ok: ctx.undoOk && ctx.undoSteps === 1, title: 'One tap of Undo puts it all back',
      text: ctx.undoOk ? 'The whole edit is one step. Undo gives back the exact project, checked character by character.' : 'Undo did not give back the exact project.' });
    return out;
  }

  /* =================================================================== what happens, in words */
  function songLine(ctx) {
    const sb = ctx.before.layers.find(l => l.audioOnly), sa = sb && ctx.A.get(sb.id);
    if (!sb || !sa) return '';
    const e0 = endOf(sb), e1 = endOf(sa);
    if (Math.abs(e1 - e0) >= TOL) return 'The song changed length, to ' + sec(e1) + '. ';
    const te = ctx.R2.trackEnd;
    return 'The song does not move or change length (D17)' + (e1 > te + TOL ? ', so the video runs on in black after the clips, to ' + sec(e1) + '. ' : '. ');
  }
  function camLine(ctx) {
    const ci = camInfo(ctx); if (!ci || !ci.kb.length) return '';
    const mv = ci.kept.filter(x => Math.abs(x.t2 - x.k.t) > TOL).length;
    if (!mv && !ci.cut.length) return 'The camera’s zoom does not move. ';
    let s = 'The camera’s zoom moves with the footage under it';
    if (ci.cut.length) s += ', and ' + (ci.cut.length === 1 ? 'the move' : 'the ' + ci.cut.length + ' moves') + ' over ' + (ci.cut.every(c => c.lifted) ? 'the lifted clip' : 'the cut footage') + (ci.cut.length === 1 ? ' goes' : ' go');
    return s + '. ';
  }
  const folOf = (ctx, id) => (ctx.R.followers[id] || []).filter(f => !isTrack(ctx.B.get(f)));
  const bname = n => '<b>' + esc(n) + '</b>';
  const SAY = {
    delete(ctx) {
      const { R, B } = ctx, id = ctx.args.id, e = R.entry(id), n = R.main[e.i + 1], l = B.get(id);
      const fol = folOf(ctx, id).map(f => what(B.get(f))), ci = cueKinds(ctx);
      let s = bname(l.name) + ' comes out. ';
      s += n ? 'Everything after it slides <b>' + sec(ctx.A.get(n.id) ? n.start - ctx.A.get(n.id).start : n.start - e.start) + '</b> earlier, so no gap is left. ' : 'It was the last clip, so the video just ends <b>' + sec(e.end - e.start) + '</b> sooner. ';
      s += fol.length ? 'What starts on it goes with it: ' + esc(andList(fol)) + '. ' : 'Nothing starts on it, so nothing else goes. ';
      if (ci.gone.length) s += (ci.gone.length === 1 ? 'One caption line' : ci.gone.length + ' caption lines') + ' spoken over it ' + (ci.gone.length === 1 ? 'goes' : 'go') + ' too. ';
      if (ci.cut.length) s += esc(andList(ci.cut.map(r => q(r.text)))) + (ci.cut.length === 1 ? ' runs' : ' run') + ' over the cut, so only the part over ' + esc(l.name) + ' goes. ';
      return s + camLine(ctx) + songLine(ctx);
    },
    tail(ctx) {
      const { R, B, A, plan } = ctx, id = ctx.args.id, e = R.entry(id), n = R.main[e.i + 1], l = B.get(id), a = A.get(id);
      const dt = a.duration - l.duration, ci = cueKinds(ctx);
      let s = bname(l.name) + ' gets <b>' + sec(Math.abs(dt)) + '</b> ' + (dt < 0 ? 'shorter at its end. ' : 'longer at its end, showing more of its footage. ');
      s += n ? 'The clips after it slide ' + sec(Math.abs(dt)) + (dt < 0 ? ' earlier' : ' later') + ', with what is on them. ' : 'It is the last clip, so the video ends ' + sec(Math.abs(dt)) + (dt < 0 ? ' sooner. ' : ' later. ');
      const fol = folOf(ctx, id), slid = fol.filter(f => plan.lands.has(f)), stay = fol.filter(f => !plan.lands.has(f));
      if (slid.length) s += esc(Cap(andList(slid.map(f => what(B.get(f)))))) + ' started on the part that was cut off, so it slides back onto ' + esc(l.name) + ' (step 3 shows why). ';
      if (stay.length) s += esc(Cap(andList(stay.map(f => what(B.get(f)))))) + (stay.length === 1 ? ' starts inside what is left, so it stays exactly where it was. ' : ' start inside what is left, so they stay exactly where they were. ');
      if (ci.cut.length) s += esc(andList(ci.cut.map(r => q(r.text)))) + (ci.cut.length === 1 ? ' loses' : ' lose') + ' the part over the trimmed end. ';
      if (ci.gone.length) s += (ci.gone.length === 1 ? 'One caption line' : ci.gone.length + ' caption lines') + ' over the trimmed end ' + (ci.gone.length === 1 ? 'goes' : 'go') + ' with it. ';
      return s + camLine(ctx) + songLine(ctx);
    },
    slide(ctx) {
      const { R, B, A, plan } = ctx, c = R.entry('c3'), a = A.get('c3'), st = B.get('sticker'), sa = A.get('sticker'), nx = A.get('c4');
      const off = st.start - c.start;
      if (plan.lands.has('sticker')) {
        const off2 = sa.start - a.start;
        let s = 'Sandcastle is cut down to <b>' + sec(a.duration) + '</b>. The shell sticker started <b>' + sec(off) + '</b> in, on footage that is now cut off. ';
        s += 'Left where it was, it would start on Sunset and move with Sunset from then on (the dashed red box). Instead it <b>slides back</b> onto Sandcastle' + (off2 < TOL ? ', to its first frame,' : ', to ' + sec(off2) + ' in,') + ' and keeps its full ' + sec(st.duration) + '. ';
        if (nx && endOf(sa) > endOf(a) + TOL) s += 'It runs on over Sunset for ' + sec(endOf(sa) - endOf(a)) + ', which is fine: it follows the clip it starts on.';
        return s;
      }
      return 'Sandcastle is now <b>' + sec(a.duration) + '</b> long. The shell sticker starts ' + sec(off) + ' in, and that part is still there, so nothing slides. Drag the length to ' + sec(off) + ' or less to cut off the sticker’s first frame.';
    },
    head(ctx) {
      const { R, B, A } = ctx, id = ctx.args.id, e = R.entry(id), n = R.main[e.i + 1], l = B.get(id), a = A.get(id);
      const L = l.duration - a.duration, alt = byId(altDoc(ctx));
      let s = L > 0 ? '<b>' + sec(L) + '</b> is trimmed off the start of ' + bname(l.name) + '. It keeps its place in the row; its footage just starts ' + sec(L) + ' later. '
                    : bname(l.name) + ' gets <b>' + sec(-L) + '</b> longer at its start: more of its footage shows, and it keeps its place in the row. ';
      const fol = folOf(ctx, id);
      fol.forEach(f => {
        const fb = B.get(f), fa = A.get(f); if (!fa) return;
        const mv = fa.start - fb.start;
        if (Math.abs(mv) < TOL) s += esc(Cap(what(fb))) + ' already starts on the first frame, so it stays there. ';
        else if (mv < 0) s += esc(Cap(what(fb))) + ' stays on the same moment of the footage, so it moves ' + sec(-mv) + ' earlier' + (-mv < L - TOL ? ' (it stops at ' + esc(poss(l.name)) + ' first frame, so it stays on this clip)' : '') + '. ';
        else s += esc(Cap(what(fb))) + ' stays on the same moment of the footage, so it moves ' + sec(mv) + ' later. ';
      });
      fol.forEach(f => {
        const fb = B.get(f), fx = alt.get(f); if (!fx) return;
        s += '<b>The other way</b>, not chosen and drawn third, would leave ' + esc(what(fb)) + ' at ' + sec(fx.start) + ', the same ' + sec(fb.start - l.start) + ' into the clip, but over footage ' + sec(Math.abs(L)) + (L > 0 ? ' later' : ' earlier') + ' than before. ';
      });
      if (!fol.length) s += 'Nothing starts on ' + esc(l.name) + ', so both ways give the same result here; pick Waves to see them differ. ';
      if (E.kfLists(l).some(x => x.length)) s += 'Its own zoom stays on the same footage too. ';
      if (n) s += 'Everything after slides ' + sec(Math.abs(L)) + (L > 0 ? ' earlier. ' : ' later. ');
      return s + camLine(ctx);
    },
    speed(ctx) {
      const { R, B, A } = ctx, id = ctx.args.id, e = R.entry(id), n = R.main[e.i + 1], l = B.get(id), a = A.get(id);
      let s = bname(l.name) + ' plays at <b>' + nice(ctx.args.sp) + '×</b>, so it lasts ' + sec(a.duration) + ' instead of ' + sec(l.duration) + '. ';
      folOf(ctx, id).forEach(f => {
        const fb = B.get(f), fa = A.get(f); if (!fa) return;
        s += esc(Cap(what(fb))) + ' keeps its own ' + sec(fb.duration) + '. Where it starts scales with the speed: ' + sec(fb.start - e.start) + ' in becomes ' + sec(fa.start - a.start) + ' in. ';
      });
      const over = cueList(ctx.before).filter(c => c.s < e.end - TOL && c.e > e.start + TOL).length;
      if (over) s += (over === 1 ? 'The caption line' : 'The ' + over + ' caption lines') + ' over ' + esc(l.name) + ' speed up with the voice. ';
      if (E.kfLists(l).some(x => x.length)) s += 'Its zoom speeds up with it. ';
      if (n) s += 'Everything after slides ' + sec(Math.abs(a.duration - l.duration)) + (a.duration < l.duration ? ' earlier. ' : ' later. ');
      return s + camLine(ctx);
    },
    move(ctx) {
      const { R, B } = ctx, id = ctx.args.id, to = ctx.args.to, e = R.entry(id), l = B.get(id), N = R.main.length, ci = cueKinds(ctx);
      const fol = folOf(ctx, id).map(f => what(B.get(f)));
      const where = to === 0 ? 'to the front' : to === N ? 'to the end' : 'to just after ' + NAME(R.main[to - 1].id);
      let s = bname(l.name) + ' moves ' + where + (fol.length ? ', and takes ' + esc(andList(fol)) + ' with it' : '') + '. ';
      const between = (to > e.i ? R.main.slice(e.i + 1, to) : R.main.slice(to, e.i)).filter(x => !x.slot).map(x => NAME(x.id));
      const nx = R.main[e.i + 1], L = (nx ? nx.start : e.end) - e.start;
      s += esc(andList(between)) + (between.length === 1 ? ' slides ' : ' slide ') + sec(L) + (to > e.i ? ' earlier to fill the hole. ' : ' later to make room. ');
      if (ci.split.length) s += esc(andList(ci.split.map(r => q(r.text)))) + (ci.split.length === 1 ? ' ran' : ' run') + ' over a cut that moved, so it splits in two, with the same words on each part. ';
      return s + camLine(ctx) + 'Nothing changes length, and the video stays ' + sec(ctx.after.project.duration) + '.';
    },
    insert(ctx) {
      const { R } = ctx, at = ctx.args.at, N = R.main.length, ci = cueKinds(ctx), D = NEWCLIP.duration;
      const where = at === 0 ? 'at the start' : at === N ? 'at the end' : 'after ' + NAME(R.main[at - 1].id);
      let s = 'A new ' + sec(D) + ' clip, <b>Ice cream</b>, goes in ' + where + '. ';
      const later = R.main.slice(at).filter(x => !x.slot).map(x => NAME(x.id));
      s += later.length ? esc(andList(later)) + ', and what is on ' + (later.length === 1 ? 'it' : 'them') + ', ' + (later.length === 1 ? 'slides ' : 'slide ') + sec(D) + ' later. ' : 'Nothing moves: the video just gets longer. ';
      if (ci.split.length) s += esc(andList(ci.split.map(r => q(r.text)))) + ' ran over that cut, so it splits in two: its words show before the new clip and again after it, never over it. ';
      return s + camLine(ctx) + songLine(ctx);
    },
    lift(ctx) {
      const { R, B } = ctx, id = ctx.args.id, e = R.entry(id), n = R.main[e.i + 1], l = B.get(id);
      let s = bname(l.name) + ' leaves the clip row but keeps its time: it now plays on top. ';
      const rest = R.main.slice(e.i + 1).filter(x => !x.slot).map(x => NAME(x.id));
      s += n ? 'The clips after it close up: ' + esc(andList(rest)) + (rest.length === 1 ? ' slides ' : ' slide ') + sec(n.start - e.start) + ' earlier. ' : 'It was the last clip, so the clip row now ends ' + sec(e.end - e.start) + ' sooner. ';
      const fol = folOf(ctx, id).map(f => what(B.get(f)));
      if (fol.length) s += esc(Cap(andList(fol))) + (fol.length === 1 ? ' stays' : ' stay') + ' with ' + esc(l.name) + ', on top, and ' + (fol.length === 1 ? 'is' : 'are') + ' now set to stay put. ';
      const ca = cueList(ctx.after); let both = false;
      for (let i = 1; i < ca.length; i++) if (ca[i].s < ca[i - 1].e - TOL) both = true;
      s += 'Caption lines spoken over ' + esc(l.name) + ' keep their time, because its sound still plays there' + (both ? '; the lines after it slide with the clips, so two lines show at once for a moment. ' : '. ');
      s += camLine(ctx).replace('moves with the footage under it', 'follows the clip row, not the lifted clip');
      return s + songLine(ctx);
    },
    gap(ctx) {
      const g = ctx.s.gap, ci = cueKinds(ctx);
      let s = 'Here a friend in Full dragged Sandcastle ' + sec(g) + ' later, leaving a gap: ' + sec(g) + ' of black. Simple draws it with an orange chip and never closes it by itself. ';
      s += 'Tap the chip, and Sandcastle and everything after it slide exactly ' + sec(g) + ' earlier, so it starts where Waves ends. ';
      if (ci.cut.length) s += esc(andList(ci.cut.map(r => q(r.text)))) + ' ran on into the gap; that part goes. ';
      return s + camLine(ctx) + songLine(ctx);
    },
    endcard(ctx) {
      const { R, R2, A, B } = ctx, ec = B.get('endcard'), ea = A.get('endcard'), ed = ctx.s.edit;
      let s = '“Thanks for watching” is an end card: it starts where the clips end. ';
      if (ed === 'del') s += bname('Waves') + ' comes out, and everything after it slides ' + sec(R.trackEnd - R2.trackEnd) + ' earlier, the title on it going too. ';
      else if (ed === 'trim') s += bname('Sunset') + ' gets <b>' + sec(R.trackEnd - R2.trackEnd) + '</b> shorter at its end, so the clips end that much sooner. ';
      else s += 'A new 2 s clip, <b>Ice cream</b>, goes in after Sunset: at the end of the clips, and <b>before</b> the end card. ';
      if (ea) s += 'The end card follows the new end: it started at ' + sec(ec.start) + ' and now starts at <b>' + sec(ea.start) + '</b>, right where the clips end, keeping its ' + sec(ec.duration) + ' and its fade-in. ';
      s += camLine(ctx);
      const song = ctx.after.layers.find(l => l.audioOnly);
      if (song) s += 'The song keeps its length (D17) and ends at ' + sec(endOf(song)) + (endOf(song) > R2.trackEnd + TOL ? ', so it now plays on under the end card' + (endOf(song) > ctx.after.project.duration - TOL && ea && endOf(song) > endOf(ea) + TOL ? ' and the video runs on in black after it' : '') + '.' : endOf(song) < R2.trackEnd - TOL ? ', before the clips end.' : '.');
      return s;
    },
    blendDel(ctx) {
      const r = fadeInfo(ctx)[0];
      let s = SAY.delete(ctx).replace(camLine(ctx) + songLine(ctx), '');
      if (r) s += esc(fadeWords(ctx, r)) + ' ';
      return s + camLine(ctx) + songLine(ctx);
    },
    blendTrim(ctx) {
      const { B, A } = ctx, id = ctx.args.id, l = B.get(id), a = A.get(id), r = fadeInfo(ctx)[0];
      const over = r && r.pb ? ': it runs ' + spanTxt(r.pb.s, r.pb.e) + ', exactly over the overlap. ' : '. ';
      let s;
      if (ctx.cmd === 'trimTail') {
        const dt = a.duration - l.duration;
        s = bname(l.name) + ' gets <b>' + sec(-dt) + '</b> shorter at its end. Sandcastle and everything after it slide ' + sec(-dt) + ' earlier, so the two clips still overlap by ' + sec(FADE) + '. ';
        s += 'Waves is the clip that fades, and its fade-out moves with the cut' + over;
      } else {
        const L = l.duration - a.duration;
        s = '<b>' + sec(L) + '</b> is trimmed off the start of ' + bname(l.name) + '. It keeps its place, so the overlap with Waves stays where it was, and Waves’ fade-out over it does not move' + over;
        s += 'Only the Sandcastle footage under the fade is later. ';
        const st = B.get('sticker'), sa = A.get('sticker');
        if (st && sa && Math.abs(sa.start - st.start) > TOL) {
          const clamped = st.start - L < a.start - TOL;
          s += clamped ? 'The shell sticker started ' + sec(st.start - l.start) + ' into Sandcastle, on footage that is now trimmed off, so it moves to Sandcastle’s first frame and stays on its clip. '
                       : 'The shell sticker stays on the same moment of Sandcastle’s footage, so it moves ' + sec(st.start - sa.start) + ' earlier. ';
        }
      }
      s += 'The trim stops before either clip gets shorter than twice the fade (' + sec(2 * FADE) + '). ';
      s += camLine(ctx);
      return s;
    },
    turn(ctx) {
      const T = ctx.turn; if (!T) return '';
      let s = 'In Phase 6, tapping the fade between ' + bname(NAME(T.a)) + ' and ' + bname(NAME(T.b)) + ' offers <b>Turn into a transition</b>. The two clips then meet in the middle of the overlap, at <b>' + sec(T.mid) + '</b>: ';
      s += NAME(T.a) + ' loses its last ' + sec(T.amt / 2) + ', ' + NAME(T.b) + ' its first ' + sec(T.amt / 2) + '. A ' + sec(T.amt) + ' crossfade transition sits on the cut, so it looks the same. Nothing after it moves. ';
      s += poss(NAME(T.owner)) + ' fade-out keys go: the transition does the fade now. ';
      T.moved.forEach(f => { const b = ctx.B.get(f); s += esc(Cap(what(b))) + ' started at ' + sec(b.start) + ', on ' + NAME(T.b) + ' footage that is now trimmed off, so it moves to ' + poss(NAME(T.b)) + ' new first frame, ' + sec(T.mid) + ', and stays on its clip. '; });
      return s + '<small class="v9-honest">Transitions are not in the maths these pages run on yet, so this page works this one out from the design’s rule, and Undo is not checked here.</small>';
    }
  };

  VIS._v9 = { beach, beachWithGap, beachEnd, beachBlend, STEPS, fix, freshState, runStep, follow, camFollow, camInfo, bands, changes, checks, fadeInfo, blendsOf, turnInto, transitionView, altDoc, SAY };
  if (typeof document === 'undefined' || !VIS.register || !VIS.el) return;

  /* =================================================================== the pictures (the scenes V6 draws, so the same frame is visible) */
  const el = VIS.el, SEC = VIS.SECTION_COLOR;
  const LG = (a, b, stop) => '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="' + (stop || 1) + '" stop-color="' + b + '"/></linearGradient></defs>';
  function wave(y, a, p, col, w, op) {
    let d = 'M-12 ' + y;
    for (let x = -12; x < 140; x += p) d += ' q' + (p / 4) + ' ' + (-a) + ' ' + (p / 2) + ' 0 t' + (p / 2) + ' 0';
    return '<path d="' + d + '" stroke="' + col + '" stroke-width="' + w + '" fill="none" opacity="' + op + '" stroke-linecap="round"/>';
  }
  function shellPath() {
    const cx = 45, cy = 80, r = 52, ribs = [-52, -31, -10, 10, 31, 52].map(a => a * Math.PI / 180);
    const pt = a => [cx + r * Math.sin(a), cy - r * Math.cos(a)].map(v => Math.round(v * 10) / 10);
    let d = 'M' + cx + ' ' + cy + ' L' + pt(ribs[0]).join(' ');
    for (let i = 1; i < ribs.length; i++) d += ' A10 10 0 0 1 ' + pt(ribs[i]).join(' ');
    d += ' Z';
    const lines = ribs.slice(1, -1).map(a => { const p = pt(a); return '<path d="M' + cx + ' ' + cy + ' L' + p[0] + ' ' + p[1] + '" stroke="#e08a6c" stroke-width="2" opacity=".75"/>'; }).join('');
    return '<path d="' + d + '" fill="#ffc6ab" stroke="#e0785c" stroke-width="2.6" stroke-linejoin="round"/>' + lines + '<path d="M35 80h20l-3 7H38z" fill="#e0785c"/>';
  }
  const SCENE = {
    c1: u => {
      const y = 152 - u * 52, x = 49 - u * 3, s = 1.35 - u * .6;
      return LG('#8fd0e6', '#e6f4f2', '.55') + '<rect width="90" height="160" fill="url(#g)"/><circle cx="68" cy="26" r="8" fill="#fff5d6"/>' +
        '<path d="M0 62h90v20H0z" fill="#3d9bbd"/>' + wave(70, 1.2, 18, '#c6ecf6', 1, .8) +
        '<path d="M0 80c22-5 52-6 90 2v78H0z" fill="#efd9a6"/><path d="M0 118c14-14 30-16 44-8s30 4 46-4v54H0z" fill="#86c396"/>' +
        '<path d="M36 160l8-80h4l15 80z" fill="#c9a169"/><path d="M39 150h20M40 138h17M41 126h14M42 114h12M43 102h9M44 92h6" stroke="#8b6a3e" stroke-width="1.1"/>' +
        '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s.toFixed(2) + ')"><circle cy="-9" r="2.6" fill="#2f3b44"/>' +
        '<path d="M0-6v8M-3.4-2.5h6.8M0 2l-2.4 5.5M0 2l2.4 5.5" stroke="#2f3b44" stroke-width="1.7" stroke-linecap="round"/></g>';
    },
    c2: u => {
      const o = -(u * 36) % 36;
      return '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4ecf7"/><stop offset=".36" stop-color="#8fd5ea"/>' +
        '<stop offset=".36" stop-color="#2b86b8"/><stop offset="1" stop-color="#15527e"/></linearGradient></defs><rect width="90" height="160" fill="url(#g)"/>' +
        '<g transform="translate(' + o.toFixed(1) + ' 0)">' + wave(74, 2, 18, '#e8fbff', 1.4, .7) + wave(94, 3, 24, '#ffffff', 2.4, .8) + wave(116, 4, 30, '#ffffff', 3, .9) + '</g>' +
        '<path d="M0 138c15-9 30-9 45 0s30 9 45 0v22H0z" fill="#eaf9fb"/><path d="M0 150c15-6 30-6 45 0s30 6 45 0v10H0z" fill="#e8d6a6"/>';
    },
    c3: u => {
      const fy = 75 - u * 19;
      return LG('#ffe6ae', '#f6c77c', '.6') + '<rect width="90" height="160" fill="url(#g)"/><circle cx="18" cy="26" r="7" fill="#fff3cf"/>' +
        '<path d="M0 104c30-6 60-6 90 0v56H0z" fill="#e0b066"/>' +
        '<path d="M33 78V53" stroke="#6b4a2a" stroke-width="1.3"/><path d="M33 ' + fy.toFixed(1) + 'l11 3.6-11 3.6z" fill="#ff6f5b"/>' +
        '<path d="M22 112V76h5v-5h4v5h4v-5h4v5h5v36z" fill="#b97d3e"/><path d="M42 112V90h5v-5h4v5h4v-5h4v5h5v22z" fill="#c68a47"/>' +
        '<path d="M30 112v-9a3 3 0 0 1 6 0v9z" fill="#7a4e22"/><path d="M0 126c30-5 60-3 90 2v32H0z" fill="#d9a55b"/><path d="M68 124l3-9h7l3 9z" fill="#4fb3ff"/>';
    },
    c4: u => {
      const cy = 82 + u * 22;
      return LG('#6a3d7a', '#ffb46b', '.62') + '<rect width="90" height="100" fill="url(#g)"/><circle cx="45" cy="' + cy.toFixed(1) + '" r="17" fill="#ffe0a0"/>' +
        '<rect y="98" width="90" height="62" fill="#3d2a5a"/><path d="M30 104h30M34 111h22M38 118h14M41 125h8" stroke="#ffc98a" stroke-width="2.4" opacity="' + (0.85 - u * .45).toFixed(2) + '"/>' +
        '<path d="M0 132c20-4 40-4 60 0s22 4 30 2v26H0z" fill="#241a36"/>';
    },
    sticker: () => shellPath()
  };
  const urlMemo = new Map();
  function sceneURL(key, u) {
    const qq = Math.round(clamp(u, 0, 1) * 48) / 48, mk = key + ':' + qq;
    if (urlMemo.has(mk)) return urlMemo.get(mk);
    const vb = key === 'sticker' ? '0 0 90 90' : '0 0 90 160';
    const s = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" preserveAspectRatio="xMidYMid slice">' + SCENE[key](qq) + '</svg>') + '")';
    urlMemo.set(mk, s);
    return s;
  }
  const srcU = (l, t) => ((l.trimStart || 0) + (t - l.start) * (l.speed || 1)) / (l.srcDur || l.duration || 1);
  /* VIS.thumb is swapped only for the length of one synchronous VIS.stage call, so no other page is affected */
  let stageT = 0;
  function sceneThumb(kitThumb) {
    return function (l) {
      const base = kitThumb(l);
      const key = l && (SCENE[l.id] ? l.id : (l.splitOf && SCENE[l.splitOf] ? l.splitOf : null));
      if (!key) return base;
      if (key === 'sticker') return sceneURL('sticker', 0) + ' center / contain no-repeat';
      return sceneURL(key, srcU(l, stageT)) + ' center / cover no-repeat, ' + base;
    };
  }
  function stageAt(host, doc, t) {
    const prev = VIS.thumb; stageT = t; VIS.thumb = sceneThumb(prev);
    try { return VIS.stage(host, doc, t); } finally { VIS.thumb = prev; }
  }
  const SHELL_ICON = () => sceneURL('sticker', 0) + ' center / contain no-repeat';

  /* =================================================================== drawing */
  const reduced = () => !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* private mode: fine */ } return null; }
  const now = () => (G.performance ? performance.now() : Date.now());
  const CAM_ICO = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="7" width="13" height="10" rx="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 11.2 21 8v8l-5.5-3.2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  const CAM_COL = '#9fc3d6';
  const XFADE = '<svg viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L10 10M0 10L10 0" vector-effect="non-scaling-stroke"/></svg>';

  const CSS = `
.v9 { display: grid; gap: 18px; min-width: 0; container: v9 / inline-size; }
.v9 > * { min-width: 0; }
.v9-lede { margin: 0; font-size: 16px; line-height: 1.5; max-width: 66ch; text-wrap: pretty; }
.v9-lede small { display: block; margin-top: 8px; font-size: 14px; color: var(--h-muted); }
.v9-stepbar { display: flex; align-items: center; gap: 6px; min-width: 0; }
.v9-steps { flex: 1; min-width: 0; display: flex; gap: 6px; overflow-x: auto; padding: 2px; scrollbar-width: none; -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity; }
.v9-steps::-webkit-scrollbar { display: none; }
.v9-arrow { flex: none; width: 38px; height: 42px; border-radius: 12px; border: 1px solid var(--h-rule); background: var(--h-surface); color: var(--h-ink); display: grid; place-items: center; cursor: pointer; padding: 0; }
.v9-arrow svg { width: 18px; height: 18px; }
.v9-arrow[disabled] { opacity: .3; cursor: default; }
@container v9 (min-width: 620px) {
  .v9-arrow { display: none; }
  .v9-steps { flex-wrap: wrap; overflow: visible; }
}
.v9-step { flex: none; scroll-snap-align: start; display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 13px 0 6px; border-radius: 999px;
  border: 1px solid var(--h-rule); background: var(--h-surface); color: var(--h-ink); font: 600 14px/1 var(--h-body); cursor: pointer; transition: background .15s, color .15s, border-color .15s; white-space: nowrap; }
.v9-step b { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--h-surface-2); font: 600 12px/1 var(--h-mono); color: var(--h-muted); }
.v9-step .ph { font: 600 10px/1 var(--h-mono); letter-spacing: .04em; padding: 3px 5px; border-radius: 5px; background: var(--h-accent-soft); color: var(--h-accent); }
@media (hover: hover) { .v9-step:hover { border-color: var(--h-accent); } }
.v9-step[aria-current="step"] { background: var(--h-accent); border-color: var(--h-accent); color: var(--h-accent-ink); }
.v9-step[aria-current="step"] b { background: rgba(255, 255, 255, .24); color: inherit; }
.v9-step[aria-current="step"] .ph { background: rgba(255, 255, 255, .22); color: inherit; }
.v9-top { display: grid; gap: 12px; }
.v9-eyebrow { margin: 0; font: 600 11.5px/1 var(--h-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--h-muted); }
.v9-h { margin: 0; font-family: var(--h-display); font-weight: 700; font-size: clamp(24px, 4.4vw, 30px); line-height: 1.08; letter-spacing: -.01em; }
.v9-rule { margin: 0; padding: 10px 14px; border-left: 3px solid var(--h-accent); background: var(--h-accent-soft); border-radius: 0 12px 12px 0; font-size: 15.5px; line-height: 1.45; max-width: 70ch; }
.v9-rule span { display: block; font: 600 10.5px/1.4 var(--h-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--h-accent); margin-bottom: 2px; }
.v9-what { margin: 0; font-size: 15.5px; line-height: 1.55; max-width: 70ch; text-wrap: pretty; }
.v9-what .v9-honest { display: block; margin-top: 8px; font-size: 13.5px; line-height: 1.45; color: var(--h-muted); }
.v9-knobs { display: flex; flex-wrap: wrap; gap: 12px 22px; align-items: flex-end; }
.v9-knobs:empty { display: none; }
.v9-knob { display: grid; gap: 7px; min-width: 0; }
.v9-knob.wide { flex: 1 1 260px; }
.v9-klbl { font: 600 11px/1 var(--h-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--h-muted); }
.v9-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.v9-pill { min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--h-rule); background: var(--h-surface); color: var(--h-ink); font: 600 14px/1 var(--h-body); cursor: pointer; }
@media (hover: hover) { .v9-pill:hover { border-color: var(--h-accent); } }
.v9-pill[aria-pressed="true"] { background: var(--h-ink); border-color: var(--h-ink); color: var(--h-bg); }
.v9-range { display: flex; align-items: center; gap: 12px; min-height: 40px; }
.v9-range input { flex: 1; min-width: 0; accent-color: var(--h-accent); height: 36px; margin: 0; cursor: pointer; }
.v9-range output { font: 600 15px/1 var(--h-mono); min-width: 7ch; text-align: right; font-variant-numeric: tabular-nums; }

.v9-dia { position: relative; border-radius: 18px; padding: 12px 6px 10px; border: 1px solid #1c2c34; overflow: hidden;
  background: var(--bg); background-image: radial-gradient(120% 70% at 50% -20%, rgba(90, 199, 237, .10), transparent 60%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .25), 0 14px 40px rgba(4, 14, 20, .28); touch-action: pan-y; cursor: ew-resize; }
.v9-dia:focus-visible { outline: 2px solid var(--h-accent); outline-offset: 3px; }
.v9-dl { display: flex; align-items: baseline; gap: 8px; padding: 0 4px 6px; font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--text-dim); }
.v9-dl .len { font-weight: 600; letter-spacing: .02em; text-transform: none; color: var(--text-faint); font-variant-numeric: tabular-nums; }
.v9-dl .cmd { margin-left: auto; letter-spacing: .02em; text-transform: none; font-weight: 600; color: var(--accent); }
.v9-dl.v9-alt { margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--line); color: #ffb98a; flex-wrap: wrap; }
.v9-dl.v9-alt .len { color: #d39b76; }
.v9-strip { position: relative; }
.v9-ruler { position: relative; height: 15px; margin-left: var(--head); border-bottom: 1px solid var(--line-soft); }
.v9-ruler i { position: absolute; bottom: 0; height: 4px; border-left: 1px solid var(--line); }
.v9-ruler i.lb { height: 100%; }
.v9-ruler i span { position: absolute; left: 3px; top: 1px; font: 600 9px/1 -apple-system, "Segoe UI", sans-serif; font-style: normal; color: var(--text-faint); font-variant-numeric: tabular-nums; }
.v9-row { display: flex; border-bottom: 1px solid var(--line-soft); }
.v9-row:last-of-type { border-bottom: 0; }
.v9-rh { width: var(--head); flex: none; display: grid; place-items: center; font-size: 10px; font-weight: 800; letter-spacing: -.02em; }
.v9-rh .ico { width: 14px; height: 14px; }
.v9-lane { position: relative; flex: 1; min-width: 0; }
.v9-it { position: absolute; border-radius: 5px; white-space: nowrap; font-size: 9.5px; font-weight: 700; color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .85); display: flex; align-items: center; gap: 3px; padding: 0 4px; cursor: pointer; border: 1px solid rgba(255, 255, 255, .22); box-sizing: border-box; }
.v9-it .t { position: relative; z-index: 2; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.v9-it.lab { align-items: flex-start; padding-top: 3px; }
.v9-it.lab .t, .v9-it.cue .t { flex: none; }
.v9-it.notext .t { display: none; }
.v9-it.cue { border-radius: 4px; background: color-mix(in srgb, var(--sec-captions) 45%, #151208); border-color: color-mix(in srgb, var(--sec-captions) 80%, #000); font-weight: 600; }
.v9-it.s-text { background: color-mix(in srgb, var(--sec-text) 55%, #111); border-color: var(--sec-text); }
.v9-it.s-overlay { background: color-mix(in srgb, var(--sec-overlay) 34%, #111); border-color: var(--sec-overlay); }
.v9-it.s-effect { background: color-mix(in srgb, var(--sec-effect) 50%, #111); border-color: var(--sec-effect); }
.v9-it .stk { flex: none; position: relative; z-index: 2; width: 13px; height: 13px; margin-left: -1px; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .5)); }
.v9-it.clip { border-radius: 6px; align-items: flex-end; padding: 0 4px 5px; box-shadow: 0 2px 6px rgba(0, 0, 0, .35); }
.v9-it .film { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; }
.v9-it.clip .film::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent 0 25px, rgba(0, 0, 0, .4) 25px 26px); }
.v9-it .len { position: absolute; left: 4px; top: 3px; z-index: 2; font-size: 8.5px; background: rgba(0, 0, 0, .5); padding: 1px 3px; border-radius: 3px; font-variant-numeric: tabular-nums; }
.v9-it .sp { position: absolute; right: 3px; top: 3px; z-index: 2; font-size: 8.5px; background: var(--accent); color: #04161d; text-shadow: none; padding: 1px 3px; border-radius: 3px; }
.v9-it.snd { background: color-mix(in srgb, var(--sec-audio) 40%, #0c1a17); border-color: var(--sec-audio); }
.v9-it.snd .fm-wave { z-index: 1; }
.v9-it.cam { background: rgba(159, 195, 214, .07); border: 1px dashed rgba(159, 195, 214, .45); cursor: pointer; align-items: flex-start; padding-top: 2px; color: ${CAM_COL}; text-shadow: none; font-weight: 600; }
.v9-it.cam .t { background: rgba(6, 12, 15, .78); padding: 0 3px; border-radius: 3px; line-height: 12px; }
.v9-it.cam svg.curve { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.v9-it.cam .curve path { fill: none; stroke: ${CAM_COL}; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.v9-it.cam .curve path.area { fill: rgba(159, 195, 214, .14); stroke: none; }
.v9-it.over { z-index: 2; }
.v9-it.subj { box-shadow: 0 0 0 2px var(--accent), 0 0 14px rgba(90, 199, 237, .45); z-index: 3; }
.v9-it.pick { box-shadow: 0 0 0 2px #fff, 0 0 14px rgba(255, 255, 255, .4); z-index: 4; }
.v9-it.gone { background: transparent !important; border: 1.5px dashed var(--bad); pointer-events: none; }
.v9-it.gone > * { display: none; }
.v9-it.ghost { background: rgba(255, 107, 122, .07); border: 1.5px dashed var(--bad); color: #ff9aa5; text-shadow: none; pointer-events: none; font-weight: 600; }
.v9-kf { position: absolute; bottom: -4px; width: 7px; height: 7px; margin-left: -3.5px; background: var(--kf); transform: rotate(45deg); box-shadow: 0 0 0 1px rgba(0, 0, 0, .7); z-index: 3; pointer-events: none; }
.v9-it.cam .v9-kf { bottom: auto; margin-top: -3.5px; }
.v9-fade { position: absolute; z-index: 5; pointer-events: none; border-radius: 3px; border: 1px solid rgba(255, 255, 255, .7); background: rgba(6, 12, 15, .38); }
.v9-fade svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.v9-fade svg path { stroke: #fff; stroke-width: 1.2; opacity: .9; }
.v9-fade.tr { border-style: dashed; border-color: #ffe08a; background: rgba(255, 224, 138, .12); }
.v9-fade.tr svg path { stroke: #ffe08a; }
.v9-trdia { position: absolute; z-index: 5; width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px; transform: rotate(45deg); background: #1b2a31; border: 1.5px solid #ffe08a; pointer-events: none; }
.v9-flabel { position: absolute; z-index: 5; transform: translateX(-50%); font: 700 9px/13px -apple-system, "Segoe UI", sans-serif; padding: 0 4px; border-radius: 4px; background: #1b2a31; color: #fff; white-space: nowrap; pointer-events: none; }
.v9-flabel.tr { color: #ffe08a; }
.v9-late { animation: v9in .35s .95s both; }
@keyframes v9in { from { opacity: 0; } to { opacity: 1; } }
.v9-gap { position: absolute; border: 1.5px dashed var(--warn); border-radius: 6px; background: rgba(255, 159, 90, .07); pointer-events: none; }
.v9-gapchip { position: absolute; top: 50%; transform: translate(-50%, -50%); height: 20px; padding: 0 7px; border-radius: 10px; display: grid; place-items: center;
  background: #2a1f14; border: 1.5px solid var(--warn); color: var(--warn); font-size: 9.5px; font-weight: 800; z-index: 5; pointer-events: none; white-space: nowrap; }
.v9-link { position: absolute; width: 0; border-left: 1.5px dashed; opacity: .8; pointer-events: none; z-index: 2; }
.v9-link::after { content: ""; position: absolute; bottom: -3px; left: -4px; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.v9-rib { display: block; width: 100%; overflow: visible; margin: 2px 0 6px; }
.v9-rib .rb { stroke-width: 1; }
.v9-rib .rb.keep { fill: var(--c); fill-opacity: .26; stroke: var(--c); stroke-opacity: .7; }
.v9-rib .rb.lift { fill: var(--accent); fill-opacity: .12; stroke: var(--accent); stroke-dasharray: 4 3; }
.v9-rib .rb.cut { fill: var(--bad); fill-opacity: .34; stroke: var(--bad); stroke-opacity: .8; }
.v9-rib .rb.add { fill: var(--good); fill-opacity: .32; stroke: var(--good); stroke-opacity: .85; }
.v9-rib .rb.gap { fill: var(--warn); fill-opacity: .08; stroke: var(--warn); stroke-dasharray: 3 3; }
.v9-rib .rph { fill: none; stroke: #eaf0f8; stroke-width: 2; filter: drop-shadow(0 0 3px rgba(255, 255, 255, .5)); transition: opacity .2s; }
.v9-rib .rph.gone { stroke: var(--bad); stroke-dasharray: 4 3; filter: none; }
.v9-ph { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px solid #eaf0f8; box-shadow: 0 0 6px rgba(255, 255, 255, .45); z-index: 8; pointer-events: none; transition: opacity .2s; }
.v9-ph b { position: absolute; top: 0; left: -1px; transform: translateX(-50%); font: 700 9px/13px -apple-system, "Segoe UI", sans-serif; background: #eaf0f8; color: #06121a; border-radius: 4px; padding: 0 4px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.v9-ph.gone { border-left: 2px dashed var(--bad); box-shadow: none; }
.v9-ph.gone b { background: var(--bad); color: #1a0508; }
.v9-ph.hide, .v9-rib .rph.hide { opacity: 0; }
.v9-refuse { margin: 4px 4px 2px; padding: 12px; border-radius: 10px; border: 1px solid var(--warn); color: var(--text); background: #2a1f14; font-size: 13px; }
.v9-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
.v9-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 13px; color: var(--h-muted); flex: 1 1 260px; }
.v9-legend span { display: inline-flex; align-items: center; gap: 6px; }
.v9-legend i { display: inline-block; width: 14px; height: 10px; border-radius: 3px; }
.v9-legend .lk { width: 8px; height: 8px; background: #ffce4a; transform: rotate(45deg); border-radius: 1px; box-shadow: 0 0 0 1px rgba(0, 0, 0, .35); }
.v9-legend .lc { background: rgba(255, 107, 122, .5); border: 1px solid #ff6b7a; }
.v9-legend .la { background: rgba(90, 217, 176, .5); border: 1px solid #3fbf95; }
.v9-legend .lp { width: 3px; height: 14px; background: var(--h-ink); border-radius: 2px; }
.v9-legend .lx { position: relative; background: #3a4a52; border: 1px solid #9fb0b8; }
.v9-legend .lx::before, .v9-legend .lx::after { content: ""; position: absolute; left: 50%; top: 50%; width: 15px; height: 1px; background: #fff; transform: translate(-50%, -50%) rotate(34deg); }
.v9-legend .lx::after { transform: translate(-50%, -50%) rotate(-34deg); }
.v9-legend .lt { width: 9px; height: 9px; transform: rotate(45deg); border-radius: 1px; background: #1b2a31; border: 1.5px solid #e0b93a; margin: 0 2px; }
.v9-legend [hidden] { display: none; }
.v9-replay { display: inline-flex; align-items: center; gap: 8px; }
.v9-replay .ico { width: 14px; height: 14px; }
.v9-pick { margin: 0; min-height: 3em; font-size: 14.5px; line-height: 1.45; color: var(--h-muted); padding: 10px 14px; border-radius: 12px; background: var(--h-surface); border: 1px solid var(--h-rule); }
.v9-pick b { color: var(--h-ink); }
.v9-pick .mono { font-family: var(--h-mono); font-size: 13px; color: var(--h-ink); }
.v9-cols { display: grid; gap: 18px; align-items: start; }
@media (min-width: 760px) { .v9-cols { grid-template-columns: minmax(0, 320px) minmax(0, 1fr); gap: 26px; } .v9-moment { position: sticky; top: 16px; } .v9-scr { height: 230px; } }
.v9-sub { margin: 0 0 8px; font-family: var(--h-display); font-size: 19px; line-height: 1.2; }
.v9-lbl { margin: 0 0 8px; font: 600 11px/1.3 var(--h-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--h-muted); }
.v9-moment { display: grid; gap: 10px; }
.v9-shots { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.v9-shot { border-radius: 14px; overflow: hidden; background: var(--panel); border: 1px solid #1c2c34; }
.v9-scr { height: 170px; background: var(--stage); display: grid; place-items: center; padding: 8px; position: relative; }
.v9 .fm-canvas .cv-pip { outline: none; box-shadow: none; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, .5)); border-radius: 0; }
.v9-shot p { margin: 0; padding: 7px 10px 9px; font-size: 11.5px; line-height: 1.35; color: var(--text-dim); min-height: 3.2em; }
.v9-shot p b { color: var(--text); }
.v9-shot p .okm { color: var(--good); font-weight: 700; }
.v9-shot p .bad { color: #ff8b97; font-weight: 700; }
.v9-x { position: absolute; inset: 8px; display: grid; place-items: center; background: rgba(6, 12, 15, .74); color: #ff8b97; font-weight: 700; font-size: 11.5px; border-radius: 4px; text-align: center; padding: 8px; }
.v9-moved { display: grid; gap: 4px; }
.v9-len { margin: 0 0 6px; font-size: 14.5px; }
.v9-len b { font-family: var(--h-mono); font-weight: 600; }
.v9-g { margin: 10px 0 2px; font: 600 11px/1.3 var(--h-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--h-faint); }
.v9-m { display: grid; gap: 3px; width: 100%; text-align: left; border: 1px solid transparent; background: transparent; color: inherit; font: inherit; padding: 7px 10px; border-radius: 10px; cursor: pointer; }
@media (hover: hover) { .v9-m:hover { background: var(--h-accent-soft); } }
.v9-m[aria-pressed="true"] { border-color: var(--h-accent); background: var(--h-accent-soft); }
.v9-mt { display: flex; align-items: center; gap: 8px; min-width: 0; }
.v9-mt .nm { font-weight: 700; font-size: 15px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v9-dot { width: 10px; height: 10px; border-radius: 3px; flex: none; background: var(--c); box-shadow: 0 0 0 1px rgba(0, 0, 0, .15); }
.v9-tag { margin-left: auto; flex: none; font-size: 12.5px; font-weight: 600; padding: 3px 9px; border-radius: 999px; background: var(--h-surface-2); color: var(--h-ink); white-space: nowrap; }
.v9-tag.gone { background: rgba(214, 69, 88, .14); color: #c23a4d; }
.v9-tag.new { background: rgba(28, 125, 92, .14); color: var(--h-good); }
.v9-tag.split { background: var(--h-accent-soft); color: var(--h-accent); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .v9-tag.gone { color: #ff8b97; } }
:root[data-theme="dark"] .v9-tag.gone { color: #ff8b97; }
.v9-ft { font-family: var(--h-mono); font-size: 12.5px; color: var(--h-muted); overflow-wrap: anywhere; }
.v9-ft .to { color: var(--h-ink); }
.v9-ks, .v9-note { font-size: 13px; color: var(--h-muted); }
.v9-ks { font-family: var(--h-mono); font-size: 12px; }
.v9-ks::before { content: ""; display: inline-block; width: 6px; height: 6px; margin: 0 7px 1px 2px; background: #e8b30f; transform: rotate(45deg); }
.v9-same { margin: 10px 0 0; font-size: 13.5px; color: var(--h-muted); }
.v9-checks { display: grid; gap: 10px; }
@media (min-width: 760px) { .v9-checks { grid-template-columns: 1fr 1fr; } }
.v9-ck { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px; align-items: start; padding: 12px 14px; border-radius: 14px; background: var(--h-surface); border: 1px solid var(--h-rule); }
.v9-ck i { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: rgba(28, 125, 92, .14); color: var(--h-good); }
.v9-ck.bad i { background: rgba(164, 86, 26, .16); color: var(--h-warn); }
.v9-ck.bad { border-color: var(--h-warn); }
.v9-ck i .ico { width: 15px; height: 15px; }
.v9-ck b { display: block; font-size: 15px; margin-bottom: 2px; }
.v9-ck span { font-size: 14px; color: var(--h-muted); line-height: 1.45; }
.v9-pn { display: flex; gap: 10px; justify-content: space-between; }
.v9-pn .h-btn { flex: 1 1 0; min-width: 0; max-width: 48%; text-align: left; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v9-pn .h-btn:last-child { text-align: right; margin-left: auto; }
.v9-pn .h-btn[disabled] { visibility: hidden; }
@media (prefers-reduced-motion: reduce) { .v9 *, .v9 *::before, .v9 *::after { transition: none !important; animation: none !important; } }
`;
  function injectCSS() {
    if (document.getElementById('v9-style')) return;
    const s = document.createElement('style'); s.id = 'v9-style'; s.textContent = CSS;
    (document.head || document.body).appendChild(s);
  }

  /* Pack spans into lanes (first lane that is free). */
  function pack(list) {
    const lanes = [];
    list.slice().sort((a, b) => a.s - b.s).forEach(x => {
      let i = lanes.findIndex(ln => ln.every(o => o.e <= x.s + 1e-9 || o.s >= x.e - 1e-9));
      if (i < 0) { lanes.push([]); i = lanes.length - 1; }
      lanes[i].push(x); x.lane = i;
    });
    return Math.max(1, lanes.length);
  }

  /* One strip: ruler, captions, titles, stickers, the camera, clips, sound. Returns its items by key (for matching). */
  function drawStrip(doc, g, o) {
    o = o || {};
    const R = E.classify(doc), M = g.m;
    const root = el('div', 'v9-strip'); root.style.setProperty('--head', g.head + 'px');
    const items = new Map(), lanes = {};
    const ru = el('div', 'v9-ruler');
    for (let t = 0; t <= g.span + 1e-9; t += 1) {
      const lb = t % g.lab === 0, room = (g.W - g.head) - t * g.pps > 18, i = el('i', lb ? 'lb' : '', lb && room ? '<span>' + t + 's</span>' : null);
      i.style.left = (t * g.pps) + 'px'; ru.appendChild(i);
    }
    root.appendChild(ru);
    const row = (key, glyph, color, n, h, name) => {
      const r = el('div', 'v9-row v9-r-' + key), hd = el('div', 'v9-rh', glyph), ln = el('div', 'v9-lane');
      hd.style.color = color; hd.title = name; hd.setAttribute('aria-label', name); ln.style.height = (n * h) + 'px';
      r.appendChild(hd); r.appendChild(ln); root.appendChild(r);
      lanes[key] = { el: ln, h, row: r };
    };
    const put = (rowKey, k, s, e, lane, cls, inner, data) => {
      const L = lanes[rowKey], left = s * g.pps, full = (e - s) * g.pps, w = Math.max(3, rowKey === 'clip' || full < 6 ? full : full - 1.5);
      const d = el('div', 'v9-it ' + cls, inner);
      d.style.left = left + 'px'; d.style.width = w + 'px'; d.style.top = (lane * L.h + 2) + 'px'; d.style.height = (L.h - 4) + 'px';
      d.dataset.k = k;
      if (o.subject && k === 'L:' + o.subject) d.classList.add('subj');
      L.el.appendChild(d);
      items.set(k, Object.assign({ el: d, left, width: w, row: rowKey, s, e, lane }, data || {}));
      return d;
    };
    const dots = (d, l, w) => E.kfLists(l).forEach(a => a.forEach(k => {
      const x = (k.t - l.start) * g.pps; if (x < -0.5 || x > w + 0.5) return;
      const i = el('i', 'v9-kf'); i.style.left = clamp(x, 3.5, Math.max(3.5, w - 3.5)) + 'px'; d.appendChild(i);
    }));
    const tspan = s => '<span class="t">' + esc(s) + '</span>';

    // captions
    const cues = cueList(doc), count = new Map();
    cues.forEach(c => { const kk = c.tr + ':' + c.text; const n = count.get(kk) || 0; count.set(kk, n + 1); c.k = 'Q:' + kk + (n ? '#' + n : ''); });
    row('cap', '<span>Cc</span>', SEC.captions, pack(cues), M.cue, 'Captions');
    cues.forEach(c => put('cap', c.k, c.s, c.e, c.lane, 'cue', tspan(c.text), { base: 'Q:' + c.tr + ':' + c.text, label: true }));
    // titles (Aa) and stickers / overlays, each in its own row
    const tops = [], ovs = [];
    Object.values(R.units).forEach(u => {
      if (R.isMain(u.id) || ['captions', 'audio', 'fullOnly'].includes(u.kind)) return;
      (u.section === 'text' ? tops : ovs).push({ s: u.start, e: u.end, u });
    });
    (o.ghosts || []).forEach(gh => (gh.row === 'top' ? tops : ovs).push({ s: gh.s, e: gh.e, ghost: gh }));
    row('top', '<span>Aa</span>', SEC.text, pack(tops), M.top, 'Titles');
    row('ov', VIS.icon('overlay'), SEC.overlay, pack(ovs), M.ov, 'Stickers and overlays');
    const drawTop = (rowKey) => x => {
      if (x.ghost) {                                   // the slide-back: where it would be without the rule
        const L = lanes[rowKey], gw = (x.e - x.s) * g.pps, d = el('div', 'v9-it ghost lab', '<span class="t">' + esc(gw >= 92 ? x.ghost.text : '✕') + '</span>');
        d.title = x.ghost.text;
        d.style.left = (x.s * g.pps) + 'px'; d.style.width = Math.max(3, (x.e - x.s) * g.pps) + 'px';
        d.style.top = (x.lane * L.h + 2) + 'px'; d.style.height = (L.h - 4) + 'px';
        L.el.appendChild(d); return;
      }
      const l = x.u.lead, cls = x.u.section === 'text' ? 's-text' : x.u.section === 'effect' ? 's-effect' : 's-overlay';
      const w = (x.e - x.s) * g.pps, isStk = l.type === 'image';
      const d = put(rowKey, 'L:' + l.id, x.s, x.e, x.lane, cls + ' lab', (isStk ? '<i class="stk"></i>' : '') + tspan(l.type === 'text' ? l.text || l.name : l.name), { host: x.u.host, section: x.u.section, label: true });
      if (isStk) d.querySelector('.stk').style.background = SHELL_ICON();
      dots(d, l, Math.max(3, w));
    };
    tops.forEach(drawTop('top')); ovs.forEach(drawTop('ov'));
    // the camera: its zoom as a line over the whole video, with its keys on it
    const cam = doc.layers.find(isCam);
    if (cam) {
      row('cam', CAM_ICO, CAM_COL, 1, M.cam, 'Camera (made in Full)');
      const dur = Math.max(doc.project.duration, 0.1), w = dur * g.pps, h = M.cam - 4, ks = (cam.kf && cam.kf.zoom) || [];
      const lo = g.zoom[0], hi = g.zoom[1], yOf = v => (h - 3) - (clamp(v, lo, hi) - lo) / Math.max(1e-6, hi - lo) * (h - 7);
      let path = '';
      const N = Math.max(24, Math.round(w / 4));
      for (let i = 0; i <= N; i++) { const t = dur * i / N, v = ks.length ? E.valueAt(ks, t) : 1; path += (i ? 'L' : 'M') + (w * i / N).toFixed(1) + ' ' + yOf(v).toFixed(1); }
      // the steps a cut leaves are vertical: draw them at their exact time
      const d = put('cam', 'L:' + cam.id, 0, dur, 0, 'cam', '<svg class="curve" viewBox="0 0 ' + w.toFixed(1) + ' ' + h + '" preserveAspectRatio="none"><path class="area" d="' + path + 'L' + w.toFixed(1) + ' ' + h + 'L0 ' + h + 'Z"/><path d="' + path + '"/></svg>' + (w > 90 ? tspan('Camera zoom') : ''), { label: false });
      d.title = 'Camera zoom (made in Full)';
      ks.forEach(k => { const x = k.t * g.pps; if (x < -0.5 || x > w + 0.5) return; const i = el('i', 'v9-kf'); i.style.left = clamp(x, 3.5, w - 3.5) + 'px'; i.style.top = yOf(k.v) + 'px'; d.appendChild(i); });
    }
    // clips
    row('clip', VIS.icon('clips'), 'var(--text-dim)', 1, M.clip, 'Clips');
    R.main.forEach((e, i) => {
      const gs = i ? R.main[i - 1].end : 0;
      if (e.seam.kind === 'gap' && e.start - gs > 1e-6) {
        const gp = el('div', 'v9-gap'); gp.style.left = (gs * g.pps) + 'px'; gp.style.width = Math.max(2, (e.start - gs) * g.pps) + 'px';
        gp.style.top = '2px'; gp.style.height = (M.clip - 4) + 'px'; lanes.clip.el.appendChild(gp);
        const chip = el('div', 'v9-gapchip', esc(n2(e.seam.amt)) + 's'); chip.style.left = (((gs + e.start) / 2) * g.pps) + 'px'; lanes.clip.el.appendChild(chip);
      }
      if (e.slot) return;
      const l = R.layer(e.id), w = (e.end - e.start) * g.pps;
      // a clip whose first moments sit under a crossfade or a transition keeps its length and name clear of it
      let pad = l.trIn ? l.trIn.d / 2 * g.pps : 0;
      const p = i && e.seam.kind === 'blend' ? R.main[i - 1] : null, prevOnTop = p && !p.slot && R.z.get(p.id) < R.z.get(e.id);
      if (prevOnTop) pad = Math.max(pad, (p.end - e.start) * g.pps);
      const d = put('clip', 'L:' + l.id, e.start, e.end, 0, 'clip',
        '<div class="film"></div>' + (w - pad > 34 ? '<span class="len">' + esc(n2(e.end - e.start)) + 's</span>' : '') + (spd(l) !== 1 && w > 30 ? '<span class="sp">' + esc(nice(spd(l))) + '×</span>' : '') + (w - pad > 24 ? tspan(l.name) : ''));
      d.querySelector('.film').style.background = VIS.thumb(l);
      if (pad) { d.style.paddingLeft = (pad + 4) + 'px'; const lb = d.querySelector('.len'); if (lb) lb.style.left = (pad + 4) + 'px'; }
      if (prevOnTop) { const pi = items.get('L:' + p.id); if (pi) pi.el.classList.add('over'); }   // the clip that fades is drawn on top, as it plays
      dots(d, l, Math.max(3, w));
    });
    // a hand-made crossfade (the overlap, with the ✕ editors use for a fade) and a transition (◇ on the cut)
    const fades = [];
    blendsOf(R).forEach(bl => fades.push({ a: bl.s, b: bl.e, tr: false, amt: bl.amt }));
    doc.layers.forEach(l => { if (l.trIn && R.isMain(l.id)) fades.push({ a: l.start - l.trIn.d / 2, b: l.start + l.trIn.d / 2, tr: true, amt: l.trIn.d, cut: l.start }); });
    fades.forEach(f => {
      const x = el('div', 'v9-fade' + (f.tr ? ' tr' : '') + (o.late ? ' v9-late' : ''), XFADE);
      x.style.left = (f.a * g.pps) + 'px'; x.style.width = Math.max(4, (f.b - f.a) * g.pps) + 'px'; x.style.top = '2px'; x.style.height = (M.clip - 4) + 'px';
      lanes.clip.el.appendChild(x);
      if (f.tr) { const dm = el('i', 'v9-trdia' + (o.late ? ' v9-late' : '')); dm.style.left = (f.cut * g.pps) + 'px'; dm.style.top = (M.clip / 2) + 'px'; lanes.clip.el.appendChild(dm); }
      if (!g.wide) return;                             // on a phone the ✕ and the legend say it; a label would cover a clip's length
      const lab = el('span', 'v9-flabel' + (f.tr ? ' tr' : '') + (o.late ? ' v9-late' : ''), esc(f.tr ? 'transition ' + n2(f.amt) + 's' : 'fade ' + n2(f.amt) + 's'));
      lab.style.left = (((f.a + f.b) / 2) * g.pps) + 'px'; lab.style.top = '-8px'; lanes.clip.el.appendChild(lab);
    });
    // sound
    const snd = Object.values(R.units).filter(u => u.kind === 'audio').map(u => ({ s: u.start, e: u.end, u }));
    row('snd', VIS.icon('music'), SEC.audio, pack(snd), M.snd, 'Sound');
    snd.forEach(x => {
      const l = x.u.lead, w = (x.e - x.s) * g.pps;
      const d = put('snd', 'L:' + l.id, x.s, x.e, x.lane, 'snd', '<div class="fm-wave"></div>' + tspan(l.name), { label: true });
      dots(d, l, Math.max(3, w));
    });
    // a short item's name may run on past its end, up to the next thing in its lane (it would otherwise read "Beac…")
    const laneW = g.span * g.pps;
    const byLane = new Map();
    items.forEach(it => { if (!it.label) return; const kk = it.row + ':' + it.lane; if (!byLane.has(kk)) byLane.set(kk, []); byLane.get(kk).push(it); });
    byLane.forEach(list => {
      list.sort((a, b) => a.left - b.left);
      list.forEach((it, i) => {
        const nx = list[i + 1], room = (nx ? nx.left : laneW) - it.left - 6;
        const avail = Math.max(it.width - 9, room) - (it.el.querySelector('.stk') ? 16 : 0);
        const t = it.el.querySelector('.t'); if (!t) return;
        if (avail < 22) it.el.classList.add('notext'); else t.style.maxWidth = avail + 'px';
      });
    });
    const ph = el('div', 'v9-ph', '<b></b>'); root.appendChild(ph);
    return {
      root, items, lanes, R, ph,
      /* the thin line from each title or sticker down to the clip it starts on (measured once it is on the page) */
      links() {
        root.querySelectorAll('.v9-link').forEach(x => x.remove());
        const cl = lanes.clip.row.offsetTop;
        items.forEach(it => {
          if ((it.row !== 'top' && it.row !== 'ov') || !it.host || !R.isMain(it.host)) return;
          const y0 = lanes[it.row].row.offsetTop + it.el.offsetTop + it.el.offsetHeight;
          const k = el('div', 'v9-link'); k.style.left = (g.head + it.left + 1) + 'px'; k.style.top = y0 + 'px'; k.style.height = Math.max(0, cl - y0 + 5) + 'px';
          k.style.color = SEC[it.section] || '#fff'; root.appendChild(k);
        });
      }
    };
  }

  /* The footage bands as smooth ribbons. e = 0 draws them straight (before), 1 bent into place (after). */
  function ribbonPaths(g, list, e, H) {
    const X = t => g.head + t * g.pps;
    return list.map(b => {
      const a0 = lerp(b.b0, b.a0, e), a1 = lerp(b.b1, b.a1, e);
      const x0 = X(b.b0), x1 = X(b.b1), y0 = X(a0), y1 = X(a1), m = H / 2;
      const d = 'M' + x0 + ',0L' + x1 + ',0C' + x1 + ',' + m + ' ' + y1 + ',' + m + ' ' + y1 + ',' + H + 'L' + y0 + ',' + H + 'C' + y0 + ',' + m + ' ' + x0 + ',' + m + ' ' + x0 + ',0Z';
      return '<path class="rb ' + b.kind + '" d="' + d + '"' + (b.col ? ' style="--c:' + esc(b.col) + '"' : '') + '/>';
    }).join('');
  }

  /* =================================================================== the page */
  const ARROW = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function mountV9(host) {
    injectCSS();
    let cur = Math.max(0, STEPS.findIndex(s => s.key === store('v9.step')));
    const state = {};
    STEPS.forEach(s => { state[s.key] = fix(s, freshState(s)); });
    let ctx = null, t = STEPS[cur].t0, picked = null, raf = 0, animating = false, lastW = 0;

    const root = el('div', 'v9');
    root.innerHTML =
      '<p class="v9-lede">Every clip edit in Simple moves things by exact amounts. Pick an edit to see Beach day before and after it, on one time scale: the clips, the title and the shell sticker on them, every caption line, the camera’s zoom, the song, and the yellow keyframe dots. The coloured bands between the two show where each clip’s footage went.' +
      '<small>Changes to the sample for this page: the caption “So cold!” runs 0.3 s past the cut into Sandcastle, so a caption crosses a cut; and a slow camera zoom, made in Full, rides over the whole video. Edit 10 adds an end card; edits 11 to 13 use a copy where Waves fades out over Sandcastle.</small></p>' +
      '<div class="v9-stepbar"><button type="button" class="v9-arrow" data-d="-1" aria-label="Earlier edits">' + ARROW(-1) + '</button><nav class="v9-steps" aria-label="Edits"></nav><button type="button" class="v9-arrow" data-d="1" aria-label="Later edits">' + ARROW(1) + '</button></div>' +
      '<div class="v9-top"><p class="v9-eyebrow"></p><h3 class="v9-h"></h3><p class="v9-rule"></p><div class="v9-knobs"></div><p class="v9-what" aria-live="polite"></p></div>' +
      '<div class="v9-dia fm" tabindex="0" role="group" aria-label="Before and after. Drag sideways, or use the arrow keys, to move the white line."></div>' +
      '<div class="v9-foot"><div class="v9-legend"><span><i class="lk"></i>keyframe</span><span><i class="lc"></i>footage cut out</span><span><i class="la"></i>footage added</span><span class="lg-x"><i class="lx"></i>crossfade</span><span class="lg-t"><i class="lt"></i>transition</span><span><i class="lp"></i>the same moment</span></div>' +
      '<button type="button" class="h-btn v9-replay">' + VIS.icon('play') + 'Play it again</button></div>' +
      '<p class="v9-pick"></p>' +
      '<div class="v9-cols"><div class="v9-moment"><p class="v9-lbl">The same moment, before and after</p><div class="v9-shots"></div></div><div class="v9-moved"></div></div>' +
      '<div><p class="v9-lbl">Checked on this edit</p><div class="v9-checks"></div></div>' +
      '<nav class="v9-pn" aria-label="Previous and next edit"><button type="button" class="h-btn" data-go="-1"></button><button type="button" class="h-btn" data-go="1"></button></nav>';
    host.appendChild(root);
    const $ = s => root.querySelector(s);
    const stepsEl = $('.v9-steps'), dia = $('.v9-dia'), knobsEl = $('.v9-knobs'), pickEl = $('.v9-pick'), shotsEl = $('.v9-shots'), movedEl = $('.v9-moved'), checksEl = $('.v9-checks');
    const arrows = [...root.querySelectorAll('.v9-arrow')];

    /* the two pictures */
    shotsEl.innerHTML = '<div class="v9-shot fm"><div class="v9-scr"></div><p></p></div><div class="v9-shot fm"><div class="v9-scr"></div><p></p></div>';
    const [shotB, shotA] = shotsEl.querySelectorAll('.v9-shot');

    STEPS.forEach((s, i) => {
      const b = el('button', 'v9-step', '<b>' + (i + 1) + '</b>' + esc(s.pill) + (s.phase ? '<span class="ph">Phase ' + s.phase + '</span>' : '')); b.type = 'button';
      b.addEventListener('click', () => go(i)); stepsEl.appendChild(b);
    });
    /* On a phone the edits are one row that scrolls; the arrows show there is more, and step through it. On a PC they wrap. */
    const arrowState = () => {
      const m = stepsEl.scrollWidth - stepsEl.clientWidth;
      arrows[0].disabled = stepsEl.scrollLeft <= 2; arrows[1].disabled = stepsEl.scrollLeft >= m - 2;
    };
    arrows.forEach(b => b.addEventListener('click', () => stepsEl.scrollBy({ left: +b.dataset.d * Math.max(120, stepsEl.clientWidth * 0.7), behavior: reduced() ? 'auto' : 'smooth' })));
    stepsEl.addEventListener('scroll', arrowState, { passive: true });
    root.querySelectorAll('.v9-pn button').forEach(b => b.addEventListener('click', () => go(cur + (+b.dataset.go), true)));
    $('.v9-replay').addEventListener('click', () => render(true));

    function go(i, fromPager) {
      if (i < 0 || i >= STEPS.length) return;
      cur = i; store('v9.step', STEPS[i].key); picked = null; t = STEPS[i].t0;
      render(true);
      if (fromPager) { const r = root.getBoundingClientRect(); if (r.top < 0) root.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); }
    }

    function renderKnobs(step, s) {
      knobsEl.innerHTML = '';
      step.knobs.forEach(k => {
        const box = el('div', 'v9-knob' + (k.type === 'range' ? ' wide' : ''));
        const id = 'v9-k-' + step.key + '-' + k.key;
        box.appendChild(el('span', 'v9-klbl', esc(typeof k.label === 'function' ? k.label(s) : k.label))).id = id;
        if (k.type === 'range') {
          const lim = k.lim(s), wrap = el('div', 'v9-range');
          const inp = el('input'); inp.type = 'range'; inp.min = lim.min; inp.max = lim.max; inp.step = lim.step; inp.value = s[k.key];
          inp.setAttribute('aria-labelledby', id);
          const out = el('output', '', esc(k.fmt(s[k.key])));
          inp.addEventListener('input', () => { s[k.key] = tenth(+inp.value); out.textContent = k.fmt(s[k.key]); render(false, true); });
          wrap.appendChild(inp); wrap.appendChild(out); box.appendChild(wrap);
        } else {
          const opts = k.type === 'clip' ? CLIPS.map(v => ({ v, label: NAME(v) })) : k.opts(s);
          const pills = el('div', 'v9-pills'); pills.setAttribute('role', 'group'); pills.setAttribute('aria-labelledby', id);
          opts.forEach(o => {
            const b = el('button', 'v9-pill', esc(o.label)); b.type = 'button'; b.setAttribute('aria-pressed', String(s[k.key] === o.v));
            b.addEventListener('click', () => {
              if (s[k.key] === o.v) return;
              s[k.key] = o.v;
              if (k.type === 'clip') step.knobs.forEach(x => { if (x.reset) s[x.key] = x.reset(s); });
              fix(step, s); picked = null; render(true);
            });
            pills.appendChild(b);
          });
          box.appendChild(pills);
        }
        knobsEl.appendChild(box);
      });
    }

    /* geometry shared by every strip and the ribbons */
    function geometry() {
      const W = Math.max(280, dia.clientWidth - 12), wide = W >= 560;
      const head = wide ? 38 : 26;
      const ends = [ctx.before.project.duration, ctx.R.trackEnd];
      if (ctx.after) ends.push(ctx.after.project.duration, ctx.R2.trackEnd);
      const span = Math.max(15, Math.ceil(Math.max(...ends) + 0.3));
      const pps = (W - head - 8) / span;
      const lab = [1, 2, 5].find(s => s * pps >= 40) || 5;
      const zk = [];
      [ctx.before, ctx.after].forEach(d => { const c = d && d.layers.find(isCam); if (c && c.kf && c.kf.zoom) c.kf.zoom.forEach(k => zk.push(k.v)); });
      const zoom = zk.length ? [Math.min(1, ...zk), Math.max(...zk)] : [1, 1.2];
      return { W, head, pps, span, lab, wide, rh: wide ? 64 : 52, zoom,
        m: wide ? { cue: 22, top: 30, ov: 30, cam: 26, clip: 50, snd: 24 } : { cue: 19, top: 26, ov: 26, cam: 22, clip: 40, snd: 20 } };
    }

    let S = {};                                        // what is on screen: strips, ribbon, bands
    function render(animate, live) {
      const step = STEPS[cur], s = state[step.key];
      fix(step, s);
      ctx = runStep(step, s);
      // header
      stepsEl.querySelectorAll('.v9-step').forEach((b, i) => { if (i === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      const pill = stepsEl.children[cur];
      if (pill && !live && stepsEl.scrollWidth > stepsEl.clientWidth + 2) {
        const L = pill.offsetLeft - stepsEl.offsetLeft, Rr = L + pill.offsetWidth;
        if (L < stepsEl.scrollLeft || Rr > stepsEl.scrollLeft + stepsEl.clientWidth) stepsEl.scrollTo({ left: Math.max(0, L - 12), behavior: reduced() || !animate ? 'auto' : 'smooth' });
      }
      arrowState();
      $('.v9-eyebrow').textContent = 'Edit ' + (cur + 1) + ' of ' + STEPS.length + (step.phase ? ' · Phase ' + step.phase : '');
      $('.v9-h').textContent = step.title;
      $('.v9-rule').innerHTML = '<span>The rule</span>' + esc(step.rule);
      if (!live) renderKnobs(step, s);
      $('.v9-what').innerHTML = ctx.refused ? 'Simple says: “' + esc(ctx.refused) + '” Try another setting.' : SAY[step.key](ctx);
      const pn = root.querySelectorAll('.v9-pn button');
      pn[0].disabled = cur === 0; pn[0].innerHTML = cur ? '‹ ' + esc(STEPS[cur - 1].title) : '';
      pn[1].disabled = cur === STEPS.length - 1; pn[1].innerHTML = cur < STEPS.length - 1 ? esc(STEPS[cur + 1].title) + ' ›' : '';
      $('.lg-x').hidden = !blendsOf(ctx.R).length; $('.lg-t').hidden = !ctx.turn;
      drawDiagram(animate && !live);
      drawMoved(); drawChecks();
      setT(t);
      showPick();
    }

    function drawDiagram(animate) {
      cancelAnimationFrame(raf); animating = false;
      const g = geometry(); lastW = dia.clientWidth;
      dia.innerHTML = '';
      const len = d => '<span class="len">' + esc(sec(d)) + '</span>';
      dia.appendChild(el('div', 'v9-dl', 'Before ' + len(ctx.before.project.duration)));
      const sb = drawStrip(ctx.before, g, { subject: ctx.subject });
      dia.appendChild(sb.root);
      S = { g, sb };
      if (ctx.refused) {
        dia.appendChild(el('div', 'v9-refuse', 'Simple says: “' + esc(ctx.refused) + '”. Nothing changes.'));
        sb.links(); return;
      }
      const H = g.rh, NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'v9-rib'); svg.setAttribute('height', H); svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('viewBox', '0 0 ' + g.W + ' ' + H); svg.setAttribute('preserveAspectRatio', 'none');
      const gb = document.createElementNS(NS, 'g'), rph = document.createElementNS(NS, 'path'); rph.setAttribute('class', 'rph');
      svg.appendChild(gb); svg.appendChild(rph);
      dia.appendChild(svg);
      dia.appendChild(el('div', 'v9-dl', 'After ' + len(ctx.after.project.duration) + '<span class="cmd">' + esc(ctx.step.pill) + '</span>'));
      // the slide-back's ghost: where the sticker would be without the rule
      const ghosts = [];
      if (ctx.plan.lands) ctx.plan.lands.forEach((to, id) => {
        const lb = ctx.B.get(id); if (!lb || ctx.R.isMain(id) || Math.abs(to - lb.start) < TOL) return;
        const u = ctx.R.units[id];
        ghosts.push({ s: lb.start, e: endOf(lb), text: 'without the rule', row: u && u.section === 'text' ? 'top' : 'ov' });
      });
      const doAnim = animate && !reduced();
      const sa = drawStrip(ctx.after, g, { subject: ctx.subject, ghosts, late: doAnim });
      dia.appendChild(sa.root);
      let alt = null;
      if (ctx.step.key === 'head') {                    // Q1: the way not chosen, always beside the chosen one
        dia.appendChild(el('div', 'v9-dl v9-alt', 'Alternative, not chosen <span class="len">· what is on the clip keeps the same time into it</span>'));
        alt = drawStrip(altDoc(ctx), g, { subject: ctx.subject }); dia.appendChild(alt.root);
      }
      const bl = bands(ctx);
      Object.assign(S, { sa, svg, gb, rph, bl, H, alt });
      sb.links(); if (alt) alt.links();
      // items that fly: every after item starts where it was before
      const tweens = [];
      if (doAnim) {
        const m = mapOf(ctx.plan);
        sa.items.forEach((it, k) => {
          if (it.row === 'cam') { tweens.push({ el: it.el, l0: it.left, w0: it.width, l1: it.left, w1: it.width, o: true }); return; }
          const b = sb.items.get(k) || (it.base && sb.items.get(it.base));
          if (b) tweens.push({ el: it.el, l0: b.left, w0: b.width, l1: it.left, w1: it.width });
          else tweens.push({ el: it.el, l0: it.left, w0: 0, l1: it.left, w1: it.width, o: true });
        });
        sb.items.forEach((it, k) => {
          const found = sa.items.get(k) || [...sa.items.values()].some(x => x.base && x.base === k);
          if (found) return;
          const L = sa.lanes[it.row]; if (!L) return;
          const d = it.el.cloneNode(true); d.classList.remove('subj', 'pick'); d.classList.add('gone'); d.style.top = '2px';
          L.el.appendChild(d);
          const p = E.mapT(m, it.s) * g.pps;
          tweens.push({ el: d, l0: it.left, w0: it.width, l1: p, w1: 0, fade: true, ghost: true });
        });
      }
      if (!tweens.length) { gb.innerHTML = ribbonPaths(g, bl, 1, H); sa.links(); return; }
      animating = true;
      sa.ph.classList.add('hide'); rph.classList.add('hide');
      const t0 = now() + 120, D = 900;
      const ease = p => 1 - Math.pow(1 - p, 3);
      const frame = () => {
        const p = clamp((now() - t0) / D, 0, 1), e = ease(p);
        tweens.forEach(tw => {
          tw.el.style.left = lerp(tw.l0, tw.l1, e) + 'px'; tw.el.style.width = Math.max(0, lerp(tw.w0, tw.w1, e)) + 'px';
          if (tw.o) tw.el.style.opacity = String(e);
          if (tw.fade) tw.el.style.opacity = String(1 - e);
        });
        gb.innerHTML = ribbonPaths(g, bl, e, H);
        if (p < 1) { raf = requestAnimationFrame(frame); return; }
        tweens.forEach(tw => { if (tw.ghost) tw.el.remove(); else { tw.el.style.opacity = ''; } });
        animating = false; sa.links(); sa.ph.classList.remove('hide'); rph.classList.remove('hide'); setT(t);
      };
      raf = requestAnimationFrame(frame);
    }

    /* the white line: one moment of footage, before and after */
    function setT(tt) {
      if (!ctx) return;
      t = clamp(tt, 0, ctx.before.project.duration - 0.02);
      const g = S.g; if (!g) return;
      const f = ctx.after ? follow(ctx, t) : null;
      const pb = S.sb.ph; pb.style.left = (g.head + t * g.pps) + 'px'; pb.querySelector('b').textContent = n2(t) + 's';
      if (f && S.sa) {
        const t2 = clamp(f.t2, 0, ctx.after.project.duration);
        const pa = S.sa.ph; pa.style.left = (g.head + t2 * g.pps) + 'px'; pa.querySelector('b').textContent = f.kept || f.empty ? n2(t2) + 's' : 'cut';
        pa.classList.toggle('gone', !f.kept && !f.empty);
        const X = x => g.head + x * g.pps, H = S.H, x0 = X(t), x1 = X(t2);
        S.rph.setAttribute('d', 'M' + x0 + ',0C' + x0 + ',' + H / 2 + ' ' + x1 + ',' + H / 2 + ' ' + x1 + ',' + H);
        S.rph.setAttribute('class', 'rph' + (!f.kept && !f.empty ? ' gone' : '') + (animating ? ' hide' : ''));
        if (S.alt) { S.alt.ph.style.left = pa.style.left; S.alt.ph.querySelector('b').textContent = pa.querySelector('b').textContent; }
      }
      drawShots(f);
    }
    /* what plays at t: a clip, a crossfade, the end card, or a gap */
    function whatPlays(doc, R, tt) {
      const bl = blendsOf(R).find(b => tt >= b.s - 1e-9 && tt < b.e);
      if (bl) return NAME(bl.a) + ' fading into ' + NAME(bl.b);
      const e = R.mainAt(tt);
      if (e && !e.slot) { const l = R.layer(e.id); const trL = doc.layers.find(x => x.trIn && R.isMain(x.id) && Math.abs(tt - x.start) < x.trIn.d / 2); return trL ? 'mid-transition into ' + trL.name : l.name; }
      return tt >= R.trackEnd - 1e-9 && R.main.length ? 'after the clips' : 'a gap, nothing plays';
    }
    function drawShots(f) {
      const scrB = shotB.querySelector('.v9-scr'), scrA = shotA.querySelector('.v9-scr');
      stageAt(scrB, ctx.before, t);
      shotB.querySelector('p').innerHTML = '<b>Before</b> · ' + esc(sec(t)) + ' · ' + esc(whatPlays(ctx.before, ctx.R, t));
      if (!f) { scrA.innerHTML = ''; shotA.querySelector('p').innerHTML = '<b>After</b> · nothing changed'; return; }
      const t2 = clamp(f.t2, 0, ctx.after.project.duration - 0.02);
      stageAt(scrA, ctx.turn ? transitionView(ctx.after) : ctx.after, t2);
      const p = shotA.querySelector('p');
      if (f.same) p.innerHTML = '<b>After</b> · ' + esc(sec(t2)) + ' · ' + esc(whatPlays(ctx.after, ctx.R2, t2)) + ' <span class="okm">· the same moment</span>';
      else if (f.kept) p.innerHTML = '<b>After</b> · ' + esc(sec(t2)) + ' · ' + esc(ctx.A.get(f.id).name) + ' <span class="okm">· the same frame</span>';
      else if (f.empty) p.innerHTML = '<b>After</b> · ' + esc(sec(t2)) + ' · ' + esc(whatPlays(ctx.after, ctx.R2, t2));
      else {
        scrA.appendChild(el('div', 'v9-x', 'This moment was cut out'));
        p.innerHTML = '<b>After</b> · <span class="bad">not in the video any more</span>';
      }
    }

    /* tap anything: exact numbers, and the white line jumps to it */
    function pick(k) {
      picked = picked === k ? null : k;
      if (picked) {
        const row = ctx.ch && ctx.ch.rows.find(r => r.k === picked);
        const b = S.sb && S.sb.items.get(picked);
        if (picked === 'L:cam') { /* the camera spans the video: the line stays */ }
        else if (b) setT((b.s + b.e) / 2);
        else if (row && row.b) setT((row.b[0] + row.b[1]) / 2);
      }
      showPick();
    }
    function showPick() {
      [S.sb, S.sa, S.alt].forEach(st => st && st.items.forEach((it, k) => it.el.classList.toggle('pick', !!picked && (k === picked || it.base === picked))));
      movedEl.querySelectorAll('.v9-m').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === picked)));
      if (ctx.refused) { pickEl.innerHTML = 'Nothing happens, so there is nothing to compare.'; return; }
      const row = picked && ctx.ch.rows.find(r => r.k === picked);
      if (!picked) { pickEl.innerHTML = 'Tap anything in the strips to see its exact numbers. Drag sideways to follow one moment of the video through the edit.'; return; }
      if (!row) {
        const it = S.sb.items.get(picked) || (S.sa && S.sa.items.get(picked));
        const lid = /^L:/.test(picked) ? picked.slice(2) : null, l = lid && (ctx.B.get(lid) || ctx.A.get(lid));
        const nm = l ? (isCam(l) ? 'The camera’s zoom' : label(l)) : q(picked.replace(/^Q:[^:]*:/, '').replace(/#\d+$/, ''));
        pickEl.innerHTML = it ? '<b>' + esc(nm) + '</b> did not move' + (l && isCam(l) ? '.' : ': <span class="mono">' + esc(spanTxt(it.s, it.e)) + '</span>.') : '';
        return;
      }
      pickEl.innerHTML = '<b>' + esc(row.name) + '</b> <span class="mono">' + esc(row.from) + ' → ' + esc(row.to) + '</span> · ' + esc(row.tag) + (row.note ? ' · ' + esc(row.note) : '') + '.';
    }
    dia.addEventListener('click', e => {
      if (dragged) { dragged = false; return; }
      const it = e.target.closest('.v9-it[data-k]');
      if (it && dia.contains(it)) { pick(it.dataset.k); return; }
      if (S.g) { const r = S.sb.root.getBoundingClientRect(); setT((e.clientX - r.left - S.g.head) / S.g.pps); }
    });
    let down = null, dragged = false;
    dia.addEventListener('pointerdown', e => { if (e.button > 0) return; down = { x: e.clientX, id: e.pointerId }; dragged = false; });
    dia.addEventListener('pointermove', e => {
      if (!down || e.pointerId !== down.id || !S.g) return;
      if (!dragged && Math.abs(e.clientX - down.x) < 6) return;
      if (!dragged) { dragged = true; try { dia.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } }
      const r = S.sb.root.getBoundingClientRect(); setT((e.clientX - r.left - S.g.head) / S.g.pps);
    });
    const up = () => { down = null; setTimeout(() => { dragged = false; }, 0); };
    dia.addEventListener('pointerup', up); dia.addEventListener('pointercancel', up);
    dia.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); setT(t + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 1 : 0.1));
    });

    /* what moved, exactly */
    function colourOf(r) {
      if (r.cat === 'cue') return SEC.captions;
      const l = ctx.B.get(r.id) || (ctx.A && ctx.A.get(r.id));
      if (!l) return '#888';
      if (isCam(l)) return CAM_COL;
      if (l.audioOnly) return SEC.audio;
      if (l.type === 'text') return SEC.text;
      if (isClipLike(l) && l.look) return l.look[0];
      return SEC.overlay;
    }
    function drawMoved() {
      movedEl.innerHTML = '<h4 class="v9-sub">What moved, exactly</h4>';
      if (ctx.refused) { movedEl.appendChild(el('p', 'v9-same', 'Nothing. Simple refused this one and said why.')); return; }
      const ch = ctx.ch;
      movedEl.appendChild(el('p', 'v9-len', Math.abs(ch.d1 - ch.d0) < TOL ? 'The video stays <b>' + esc(sec(ch.d0)) + '</b> long.' : 'The video: <b>' + esc(sec(ch.d0)) + '</b> → <b>' + esc(sec(ch.d1)) + '</b>'));
      let g = '';
      ch.rows.forEach(r => {
        if (r.g !== g) { g = r.g; movedEl.appendChild(el('p', 'v9-g', esc(g))); }
        const b = el('button', 'v9-m'); b.type = 'button'; b.dataset.k = r.k;
        const tagCls = r.kind === 'gone' ? ' gone' : r.kind === 'new' ? ' new' : r.kind === 'split' ? ' split' : '';
        b.innerHTML = '<span class="v9-mt"><i class="v9-dot"></i><span class="nm">' + esc(r.name) + '</span><span class="v9-tag' + tagCls + '">' + esc(r.tag) + '</span></span>' +
          '<span class="v9-ft">' + esc(r.from) + ' → <span class="to">' + esc(r.to) + '</span></span>' +
          (r.keys ? '<span class="v9-ks">' + esc(r.keys.from.map(n2).join(', ')) + ' → ' + esc(r.keys.to.map(n2).join(', ')) + '</span>' : '') +
          (r.note ? '<span class="v9-note">' + esc(Cap(r.note)) + '</span>' : '');
        b.querySelector('.v9-dot').style.setProperty('--c', colourOf(r));
        b.addEventListener('click', () => pick(r.k));
        movedEl.appendChild(b);
      });
      if (ch.same.length) movedEl.appendChild(el('p', 'v9-same', 'Did not move: ' + esc(andList(ch.same)) + '.'));
    }
    function drawChecks() {
      checksEl.innerHTML = '';
      if (ctx.refused) { checksEl.appendChild(el('p', 'v9-same', 'Nothing to check: nothing changed.')); return; }
      checks(ctx).forEach(c => {
        const d = el('div', 'v9-ck' + (c.ok ? '' : ' bad'), '<i>' + VIS.icon(c.ok ? 'check' : 'close') + '</i><div><b>' + esc(c.title) + '</b><span>' + esc(c.text) + '</span></div>');
        checksEl.appendChild(d);
      });
    }

    render(true);
    /* redraw at the new width (a turned phone, a resized window); no animation */
    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { arrowState(); if (dia.clientWidth && Math.abs(dia.clientWidth - lastW) > 2) render(false, true); }, 120); };
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(onResize).observe(dia); else G.addEventListener('resize', onResize);
    host._shown = onResize;
  }

  VIS.register('v9', {
    title: 'The ripple maths',
    group: "How it's built",
    blurb: 'Thirteen edits run on Beach day, drawn before and after, so you can see exactly where every clip, title, caption line, keyframe, crossfade and camera move lands.',
    mount: host => mountV9(host)
  });
})(typeof window !== 'undefined' ? window : globalThis);
