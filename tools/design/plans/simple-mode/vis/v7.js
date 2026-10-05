/* V7 · How it is built (DESIGN §1, §3.7, §10.1, §10.3, §10.4 4a, §18 V7).
 *
 * One page, three ideas, drawn from ONE live document (Beach day):
 *   1. The project in the middle, with Full and Simple as two lenses on it. Both lenses are drawn from the same
 *      {project, layers}; Simple's rows come from the kit's classifier (E.classify), which never writes. Tap a layer
 *      anywhere and it lights up in all three.
 *   2. The runner (§3.7) as a rail a dot travels down: tap → gate → locked → blockers → adopt → apply → one commit.
 *      Seven examples. The clip maths is the kit's engine run for real; the gate and the busy check are the design's
 *      rules played out (the kit has no second person); the lines are §3.11's exact words.
 *   3. After the commit: the collab diff (computed from the before and after documents, as paths), the wire with
 *      clip time converted at its two edges only (§10.4 4a), and Sam's phone in whichever editor Sam uses.
 * Styles are injected once (#v7-style) so index.html is untouched. Design only: nothing here touches FreeMotion.
 */
(function () {
  'use strict';
  const V = window.VIS;
  if (!V || typeof V.register !== 'function' || typeof document === 'undefined') return;

  const E = V.engine, esc = V.esc;
  const el = (t, c, h) => V.el(t, c, h);
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const num = t => { const v = Math.round(t * 100) / 100; return String(Object.is(v, -0) ? 0 : v); };
  const sec = t => num(t) + ' s';
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const nameOf = l => (l && (l.name || l.text || l.id)) || '';
  const quote = s => '‘' + s + '’';
  const SPAN = 15.4;                 // the drawn time span: Beach day is 14.2 s, 15.2 s after the Full example
  const SAM = '#f78fb3';

  /* two icons the kit does not have, drawn on the same 24px grid */
  const MINE = {
    list: '<path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/><circle cx="5" cy="6.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="5" cy="17.5" r="1.3" fill="currentColor" stroke="none"/>',
    phone: '<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6"/><path d="M10.5 18h3"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 15.5h6"/>'
  };
  const ico = (n, c) => MINE[n]
    ? '<svg viewBox="0 0 24 24" class="ico' + (c ? ' ' + c : '') + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + MINE[n] + '</svg>'
    : V.icon(n, c);
  const LOCK = '<i class="lk">' + V.icon('lock') + '</i>';

  /* ------------------------------------------------------------------ the examples */
  const beach = () => V.sample('beach');
  function unadopted() {                           // Beach day as Full would have left it: no sm keys at all
    const d = beach(); d.layers.forEach(l => { delete l.sm; }); delete d.project.sm; return d;
  }
  function lockedSunset() { const d = beach(); d.layers.find(l => l.id === 'c4').locked = true; return d; }

  const SCN = [
    { id: 'solo', chip: 'Just you', make: beach,
      say: 'You delete Waves in Simple. Nobody else is in the project.' },
    { id: 'sam', chip: 'With Sam', make: beach, friend: { phase: 'together' }, mode: 'clip',
      say: 'The “together” release. Sam has the same project open in Full and is not touching these clips. You delete Waves.' },
    { id: 'old', chip: 'Old project', make: unadopted,
      say: 'Beach day as it was made in Full, never edited in Simple. Simple still shows the clips. You delete Waves.' },
    { id: 'lock', chip: 'Locked clip', make: lockedSunset,
      say: 'Sunset is locked. Deleting Waves would slide Sunset along.' },
    { id: 'before', chip: 'Sam, before “together”', make: beach, friend: { phase: 'before' }, mode: 'abs',
      say: 'Sam is in the project as an Editor, in the release before “together”. You delete Waves.' },
    { id: 'busy', chip: 'Sam is busy', make: beach, friend: { phase: 'together', holding: 'c4' }, mode: 'clip',
      say: 'The “together” release. Sam is cropping Sunset right now. You delete Waves.' },
    { id: 'full', chip: 'Edit in Full', make: beach, full: true,
      say: 'You drag Sunset 1 s later in Full. Full never closes gaps, so this skips the checks.' }
  ];

  /* ------------------------------------------------------------------ the words (one plain sentence each) */
  const STAGES = [
    { id: 'tap', name: 'Your tap', code: 'edit', icon: 'delete', idle: 'The edit you asked for',
      plain: 'Every Simple edit starts as one request: what you tapped, and where the playhead was.',
      how: '<code>FM.spine.edit(label, makePlan)</code>. One edit runs at a time; up to 4 more taps wait in line, in the order you made them.' },
    { id: 'gate', grp: 'The checks', name: 'Friends check', code: 'gate', icon: 'personAdd', idle: 'Is a friend who can edit in here?',
      plain: 'While a friend who can edit is in the project, edits that move other clips wait until the “together” release. Text, looks and sound always work.',
      how: '<code>othersCanEdit()</code>: Editors count, Viewers and Commenters do not. Its refusals are <code>live</code>, <code>away</code> and <code>offline</code>.' },
    { id: 'locked', name: 'Lock check', code: 'locked', icon: 'lock', idle: 'Would it move a locked clip?',
      plain: 'If the edit would move a clip you locked, it stops and asks first. Do it anyway moves it and keeps the lock.',
      how: '<code>plan.touched()</code> is checked against each clip’s <code>locked</code>. Do it anyway is <code>opts.unlock</code>: unlock, move and lock again, all in the same step (D7).' },
    { id: 'blockers', name: 'Busy check', code: 'blockers', icon: 'notes', idle: 'Is a friend working on one of these?',
      plain: 'If a friend is working on a clip this would move, it waits instead of pulling the clip out from under them.',
      how: '<code>FM.spine.blockers(plan)</code> reads who is holding what (<code>PZ.heldByOther</code>). It checks again after the change, in case someone picked one up meanwhile.' },
    { id: 'adopt', grp: 'The edit', name: 'First move', code: 'adopt', icon: 'pin', idle: 'First time clips move in this project?',
      plain: 'The first time clips move in a project made in Full, it saves which clips are the clip row, in the same step, so one Undo takes both back.',
      how: '<code>FM.spine.adopt(R)</code> writes <code>sm.main</code> on each clip, <code>sm.stay</code> on what stays put, and <code>project.sm.adopted</code>. Just opening a project writes nothing.' },
    { id: 'apply', name: 'The change', code: 'apply', icon: 'clips', idle: 'Slide the clips and what is on them',
      plain: 'The clips after it slide by exactly the same amount, and everything on them goes too: titles, stickers, captions and keyframes.',
      how: '<code>apply(plan)</code>: <code>shiftLayerKeyframes</code> for every moved layer, captions through one time map, then <code>fitTails</code> for things that end with the video. Undo is paused while it runs.' },
    { id: 'commit', name: 'One step', code: 'commit', icon: 'check', idle: 'Save it as one step',
      plain: 'It is saved as one step. One Undo takes all of it back, and friends get it as one package.',
      how: '<code>FM.history.commit({label, ed: \'s\', arr})</code>: one undo step, one collab diff, one transaction.' },
    { id: 'diff', grp: 'To your friends', name: 'What changed', code: 'diff', icon: 'list', idle: 'List what changed',
      plain: 'Your phone compares before and after, once. That list of changes is exactly what goes to your friends.',
      how: 'The collab diff is taken at the commit, as paths like <code>L/c3/start</code>, and sent as one <code>tx</code>. Nothing is sent while a drag is still moving.' },
    { id: 'wire', name: 'The wire', code: 'wire', icon: 'link', idle: 'Send it',
      plain: 'Keyframe times leave as “time into the clip” and turn back into project time as they arrive, so inside both apps nothing changes.',
      how: 'Only at the wire’s edge: <code>t_clip = t − (kb ?? start)</code> going out, the reverse coming in (step 4a of “together”). <code>FM.scene</code> keeps project time, so the ~888 places that read keyframes stay as they are.' },
    { id: 'sam', name: 'Sam’s phone', code: 'peer', icon: 'phone', idle: 'Show it',
      plain: 'Sam’s phone applies the same changes and shows them in whichever editor Sam has open.',
      how: 'The editor you see is per device and never syncs. Presence says who is in which: <code>ed: \'s\' | \'f\'</code>.' }
  ];
  const IDX = {}; STAGES.forEach((s, i) => { IDX[s.id] = i; });

  const PART1 = {
    full: { plain: 'Full shows every layer on its own row, exactly as it is saved.',
      how: 'Draws <code>layers</code> top to bottom, each at its own <code>start</code> and <code>duration</code>. Full’s edits write those numbers directly, as today, and never move other clips.' },
    doc: { plain: 'There is one project, saved once. Both editors read it and change it. Nothing is ever converted.',
      how: '<code>{project, layers}</code>, each layer with its own <code>start</code>. The only new saved keys are <code>sm.main</code> (on the clip row), <code>sm.stay</code> (stays put) and <code>sm.tail</code> (ends with the video).' },
    quick: { plain: 'Simple reads the same layers as clips end to end, with titles, captions and sound in their own rows. It works this out every time and saves nothing.',
      how: '<code>FM.spine.classify(scene)</code> builds <code>R</code>: the clip row in <code>start</code> order, which clip each thing sits on, and the rows. Never saved.' },
    none: { plain: 'Tap a layer in any of the three. It is the same layer every time: saved once, shown two ways.', how: '' }
  };

  /* ------------------------------------------------------------------ the engine side */
  function kfTimes(l) {
    const out = []; if (!l.kf) return out;
    Object.keys(l.kf).forEach(p => (l.kf[p] || []).forEach((k, i) => out.push([p, i, k.t])));
    return out;
  }
  function shiftKeys(l, d) { kfTimes(l).forEach(([p, i]) => { l.kf[p][i].t += d; }); }
  /* §3.7 runs pinStrays inside the step, BEFORE apply: things with no clip under them are pinned first, so a
     whole-video song stays put instead of being cut by the delete. The kit plans against the unpinned project,
     so the old-project example pins first here, exactly as the runner does. */
  function pinStrays(doc, R) {
    const d = E.clone(doc);
    R.wouldStay.forEach(id => {
      const u = R.units[id]; const l = d.layers.find(x => x.id === u.lead.id); if (!l) return;
      l.sm = Object.assign({}, l.sm, { stay: true });
      const whole = R.main.length && u.start <= R.main[0].start + R.eps && Math.abs(u.end - R.trackEnd) <= R.eps;
      if (whole && u.kind === 'audio') { l.sm.tail = true; l.sm.tailEnd = l.start + l.duration; }
    });
    return d;
  }
  function moveInFull(doc, id, d) {
    const x = E.clone(doc); const l = x.layers.find(k => k.id === id);
    l.start += d; shiftKeys(l, d);
    x.project.duration = Math.max(...x.layers.filter(k => k.type !== 'camera').map(k => k.start + k.duration));
    return x;
  }
  function applySummary(a, b) {
    const A = new Map(a.layers.map(l => [l.id, l])), Rb = E.classify(b);
    const moved = b.layers.filter(l => Rb.isMain(l.id) && A.has(l.id) && !near(A.get(l.id).start, l.start));
    if (!moved.length) return 'Done';
    const d = moved[0].start - A.get(moved[0].id).start;
    return moved.length + (moved.length === 1 ? ' clip slides ' : ' clips slide ') + sec(Math.abs(d)) + (d < 0 ? ' earlier' : ' later') + ', with what is on them';
  }

  /* One run of an example: what each stage says, the document after, and the line the app shows (§3.11). */
  function outcome(sc, start, opt) {
    const S = {}; let line = null, after = null, res = null;
    const pass = note => ({ st: 'pass', note }), skip = note => ({ st: 'skip', note }), stop = note => ({ st: 'stop', note });
    const fr = sc.friend;
    if (sc.full) {
      after = moveInFull(start, 'c4', 1);
      S.tap = pass('Drag ‘Sunset’ 1 s later, in Full');
      ['gate', 'locked', 'blockers', 'adopt'].forEach(k => { S[k] = skip('Skipped: a Full edit moves one thing'); });
      S.apply = pass('Sunset 1 s later · nothing else moves');
      S.commit = pass('One step · Move Sunset');
      ['diff', 'wire', 'sam'].forEach(k => { S[k] = skip('Only when a friend is in'); });
    } else {
      S.tap = pass('Delete ‘Waves’');
      if (!fr) S.gate = pass('Just you');
      else if (opt.viewer) S.gate = pass('Sam is a Viewer now · Viewers don’t count');
      else if (fr.phase === 'before') { S.gate = stop('Sam can edit, so it stops here'); line = { text: 'Sam can edit · clips stay put', btns: [['Options ›', 'options']] }; }
      else S.gate = pass('Sam is connected · allowed together');
      if (!line) {
        const R0 = E.classify(start);
        const ed = E.editor(R0.adopted ? start : pinStrays(start, R0));
        const r = ed.run('deleteClip', { id: 'c2' }, { force: !!opt.force });
        if (!r.ok && r.locked) {
          S.locked = stop('Sunset is locked, so it stops here');
          line = { text: 'That clip is locked', btns: [['Do it anyway', 'force']], pulse: 'c4' };
        } else if (!r.ok) {
          S.locked = stop(r.say); line = { text: r.say };
        } else {
          S.locked = pass(opt.force ? 'Moves Sunset and keeps its lock' : 'Nothing locked');
          if (fr && fr.holding && !opt.samDone) {
            S.blockers = stop('Sam is cropping Sunset, so it waits');
            line = { text: 'Sam is editing ‘Clip 4’ · try again soon', pulse: 'c4' };
          } else {
            S.blockers = pass(fr ? (opt.samDone ? 'Sam is done with Sunset' : 'Sam isn’t holding any of these') : 'Nobody else here');
            after = ed.doc; res = r;
            S.adopt = r.adopted ? pass('Saves the clip row: 4 clips, and the song stays put') : skip('Already saved');
            S.apply = pass(applySummary(start, after));
            S.commit = pass('One step · ' + r.label);
            line = { text: r.say, btns: [['Undo', 'undo']] };
            if (fr) { S.diff = pass(''); S.wire = pass('Sent to Sam'); S.sam = pass(opt.viewer ? 'Sam watches it land, in Full' : 'Sam sees it, in Full'); }
            else ['diff', 'wire', 'sam'].forEach(k => { S[k] = skip('Only when a friend is in'); });
          }
        }
      }
    }
    let halted = false;
    STAGES.forEach(s => { if (halted) S[s.id] = { st: 'off', note: 'Not reached' }; else if (S[s.id] && S[s.id].st === 'stop') halted = true; });
    STAGES.forEach(s => { if (!S[s.id]) S[s.id] = { st: 'off', note: 'Not reached' }; });
    return { S, line, after, res, halted };
  }

  /* The collab diff, worked out from the two documents, grouped per layer. clip = keyframes counted from the clip. */
  const KWORD = { opacity: 'fade', scale: 'size', volume: 'volume', zoom: 'zoom' };
  function diffDocs(a, b, clip) {
    const rows = []; let ops = 0; const saved = [];
    const A = new Map(a.layers.map(l => [l.id, l])), B = new Map(b.layers.map(l => [l.id, l]));
    const Ra = E.classify(a);
    a.layers.forEach(la => {
      if (B.has(la.id)) return;
      const u = Ra.units[la.id], host = u && u.host && Ra.layer(u.host);
      rows.push({ kind: 'rm', text: quote(nameOf(la)) + ' removed' + (host && B.has(host.id) === false && host.id !== la.id ? ' (it was on ' + nameOf(host) + ')' : ''), paths: ['L/' + la.id] }); ops++;
    });
    b.layers.forEach(lb => {
      const la = A.get(lb.id), id = lb.id;
      if (!la) { rows.push({ kind: 'add', text: quote(nameOf(lb)) + ' added', paths: ['L/' + id] }); ops++; return; }
      const bits = [], paths = [];
      if (!near(la.start, lb.start)) { bits.push('starts ' + num(la.start) + ' → ' + sec(lb.start)); paths.push('L/' + id + '/start'); }
      if (!near(la.duration, lb.duration)) { bits.push('now ' + sec(lb.duration) + ' long'); paths.push('L/' + id + '/duration'); }
      const props = new Set([...Object.keys(la.kf || {}), ...Object.keys(lb.kf || {})]);
      props.forEach(p => {
        const ta = ((la.kf || {})[p] || []).map(k => k.t - (clip ? la.start : 0));
        const tb = ((lb.kf || {})[p] || []).map(k => k.t - (clip ? lb.start : 0));
        const same = ta.length === tb.length && ta.every((t, i) => near(t, tb[i]));
        const sameAbs = (() => { const x = ((la.kf || {})[p] || []), y = ((lb.kf || {})[p] || []); return x.length === y.length && x.every((k, i) => near(k.t, y[i].t)); })();
        if (!same) { bits.push((KWORD[p] || p) + ' keys ' + ta.map(num).join(', ') + ' → ' + tb.map(num).join(', ') + ' s' + (clip ? ' in' : '')); paths.push('L/' + id + '/kf/' + p); }
        else if (clip && !sameAbs) saved.push(nameOf(lb) + '’s ' + ta.length + ' ' + (KWORD[p] || p) + ' keys');
      });
      if (la.captions || lb.captions) {
        const ca = la.captions || [], cb = lb.captions || [];
        const moved = cb.filter(c => { const o = ca.find(x => x.text === c.text); return o && (!near(o.start, c.start) || !near(o.end, c.end)); }).length;
        const gone = ca.filter(c => !cb.some(x => x.text === c.text)).length;
        if (moved || gone) { bits.push([moved ? moved + (moved === 1 ? ' line moves' : ' lines move') : '', gone ? gone + ' cut' : ''].filter(Boolean).join(', ')); paths.push('L/' + id + '/captions'); }
      }
      const sa = la.sm || {}, sb = lb.sm || {};
      const marks = [];
      [['main', 'on the clip row'], ['stay', 'stays put'], ['tail', 'ends with the video']].forEach(([k, w]) => {
        if (!!sa[k] !== !!sb[k]) { marks.push(sb[k] ? w : 'no longer ' + w); paths.push('L/' + id + '/sm/' + k); }
      });
      if (marks.length) bits.push('marked: ' + marks.join(' and '));
      if (sb.tailEnd != null && (sa.tailEnd == null || !near(sa.tailEnd, sb.tailEnd))) paths.push('L/' + id + '/sm/tailEnd');
      if (paths.length) { rows.push({ kind: 'ch', text: quote(nameOf(lb)) + ' ' + (bits.length ? bits.join(', ') : 'refitted'), paths }); ops += paths.length; }
    });
    if (!near(a.project.duration, b.project.duration)) { rows.push({ kind: 'ch', text: 'The video is now ' + sec(b.project.duration) + ' long', paths: ['project/duration'] }); ops++; }
    if (JSON.stringify(a.project.sm || {}) !== JSON.stringify(b.project.sm || {})) { rows.push({ kind: 'ch', text: 'The project is marked as arranged in Simple', paths: ['project/sm'] }); ops++; }
    return { rows, ops, saved };
  }

  function wireVals(doc) {
    const s = doc.layers.find(l => l.id === 'sticker');
    if (!s || !s.kf || !s.kf.scale || s.kf.scale.length < 2) return null;
    const t = s.kf.scale[1].t; return { abs: t, start: s.start, rel: t - s.start };
  }

  /* ------------------------------------------------------------------ keyed boxes: every drawing animates by moving */
  function reconcile(box, nodes, list, animate) {
    const seen = new Set();
    box.classList.toggle('anim', !!animate);
    list.forEach(b => {
      seen.add(b.k);
      let n = nodes.get(b.k); const fresh = !n;
      if (fresh) { n = document.createElement('div'); n._html = null; nodes.set(b.k, n); box.appendChild(n); }
      if (n._gone) { clearTimeout(n._gone); n._gone = null; }
      n.className = 'z ' + b.c;
      const h = b.html || ''; if (n._html !== h) { n.innerHTML = h; n._html = h; }
      const s = n.style;
      s.left = b.x + 'px'; s.top = b.y + 'px'; s.width = b.w + 'px'; s.height = b.h + 'px';
      s.background = b.bg || ''; s.color = b.color || '';
      if (b.id) n.dataset.id = b.id; else delete n.dataset.id;
      if (fresh && animate) { s.opacity = '0'; void n.offsetWidth; s.opacity = ''; }
    });
    nodes.forEach((n, k) => {
      if (seen.has(k)) return;
      if (!animate) { n.remove(); nodes.delete(k); return; }
      if (n._gone) return;
      n.classList.add('out');
      n._gone = setTimeout(() => { n.remove(); if (nodes.get(k) === n) nodes.delete(k); }, 460);
    });
  }
  const FULL_T = l => l.audioOnly ? 'audio' : (l.type === 'text' && Array.isArray(l.captions)) ? 'captions' : l.type === 'text' ? 'text' : l.type === 'image' ? 'image' : l.type;
  const SEC = V.SECTION_COLOR;
  const glyph = s => s === 'captions' ? '<b>Cc</b>' : s === 'text' ? '<b>Aa</b>' : ico(s === 'overlay' ? 'overlay' : s === 'effect' ? 'effects' : 'behind');
  function ruler(boxes, x0, pps, W, cfg) {
    [0, 5, 10, 15].forEach(t => { const x = x0 + t * pps; if (x > W - 12) return; boxes.push({ k: 'tk' + t, c: 'tk', x, y: 0, w: 1, h: cfg.rulerH, html: '<span>' + t + 's</span>' }); });
  }
  function fullBoxes(doc, W, cfg, o) {
    const x0 = cfg.head + 4, pps = Math.max(4, (W - x0 - 6) / SPAN), rh = cfg.rowH, bh = cfg.barH;
    const boxes = []; ruler(boxes, x0, pps, W, cfg);
    let y = cfg.rulerH + 4;
    doc.layers.forEach(l => {
      const t = FULL_T(l), pic = t === 'video' || t === 'image';
      boxes.push({ k: 'hd:' + l.id, c: 'hd t-' + t, x: 3, y: y + (rh - 9) / 2, w: cfg.head - 6, h: 9, bg: pic ? V.thumb(l) : '', id: l.id });
      const w = Math.max(3, l.duration * pps);
      boxes.push({ k: 'b:' + l.id, c: 'fb t-' + t + (o.sel === l.id ? ' sel' : '') + (o.held === l.id ? ' held' : '') + (o.pulse === l.id ? ' pulse' : ''),
        x: x0 + l.start * pps, y: y + (rh - bh) / 2, w, h: bh, id: l.id, bg: pic ? V.thumb(l) : '',
        html: (cfg.names && w >= 26 ? '<span>' + esc(nameOf(l)) + '</span>' : '') + (l.locked ? LOCK : '') });
      kfTimes(l).forEach(([p, i, tt]) => {
        if (tt < l.start - 1e-6 || tt > l.start + l.duration + 1e-6) return;
        boxes.push({ k: 'k:' + l.id + ':' + p + ':' + i, c: 'kd', x: x0 + tt * pps - 3, y: y + (rh + bh) / 2 - 3.5, w: 6, h: 6 });
      });
      y += rh;
    });
    return { boxes, H: y + 4 };
  }
  function quickBoxes(doc, W, cfg, o) {
    const R = E.classify(doc);
    const x0 = cfg.head + 4, pps = Math.max(4, (W - x0 - 6) / SPAN), rh = cfg.rowH, ih = cfg.barH, th = cfg.tileH;
    const boxes = []; ruler(boxes, x0, pps, W, cfg);
    let y = cfg.rulerH + 4;
    const itemBottom = {};
    ['captions', 'text', 'overlay', 'effect', 'behind'].forEach(s => {
      const lanes = R.lanes[s]; if (!lanes || !lanes.length) return;
      lanes.slice(0, 2).forEach((ids, li) => {
        if (li === 0) boxes.push({ k: 'sh:' + s, c: 'sh', x: 0, y, w: cfg.head, h: rh, html: glyph(s), color: SEC[s] });
        ids.forEach(id => {
          const u = R.units[id], l = u.lead;
          if (s === 'captions') {
            (l.captions || []).forEach((c, ci) => {
              if (c.end <= 0 || c.start >= l.duration) return;
              const a = l.start + c.start, b = l.start + Math.min(c.end, l.duration);
              boxes.push({ k: 'q:' + id + ':' + (c.text || ci), c: 'cue' + (o.sel === id ? ' sel' : ''), x: x0 + a * pps, y: y + (rh - ih) / 2, w: Math.max(3, (b - a) * pps - 1), h: ih, id,
                html: cfg.big && (b - a) * pps > 44 ? '<span>' + esc(c.text) + '</span>' : '' });
            });
            return;
          }
          const w = Math.max(4, u.duration * pps);
          boxes.push({ k: 'u:' + id, c: 'it s-' + s + (o.sel === id ? ' sel' : ''), x: x0 + u.start * pps, y: y + (rh - ih) / 2, w, h: ih, id,
            html: cfg.names && w >= 30 ? '<span>' + esc(nameOf(l)) + '</span>' : '' });
          itemBottom[id] = y + (rh + ih) / 2;
        });
        y += rh;
      });
    });
    const cy = y + 2;
    boxes.push({ k: 'sh:main', c: 'sh', x: 0, y: cy, w: cfg.head, h: th, html: ico('clips'), color: '#cfe3ea' });
    R.main.forEach((e, i) => {
      if (e.seam.kind === 'gap') {
        const gs = i ? R.main[i - 1].end : 0;
        boxes.push({ k: 'gap:' + e.id, c: 'gap', x: x0 + gs * pps, y: cy, w: Math.max(2, (e.start - gs) * pps), h: th });
        boxes.push({ k: 'gc:' + e.id, c: 'gchip', x: x0 + (gs + e.start) / 2 * pps - 15, y: cy + th / 2 - 8, w: 30, h: 16, html: esc(num(e.seam.amt)) + 's' });
      }
      if (e.slot) return;
      const l = R.layer(e.id), w = Math.max(4, (e.end - e.start) * pps);
      boxes.push({ k: 'u:' + e.id, c: 'tile' + (o.sel === e.id ? ' sel' : '') + (o.held === e.id ? ' held' : '') + (o.pulse === e.id ? ' pulse' : ''),
        x: x0 + e.start * pps, y: cy, w, h: th, id: e.id, bg: V.thumb(l),
        html: (cfg.names && w >= 28 ? '<span>' + esc(nameOf(l)) + '</span>' : '') + (l.locked ? LOCK : '') });
      if (o.held === e.id) boxes.push({ k: 'who', c: 'who', x: x0 + e.start * pps + 3, y: cy - 7, w: 30, h: 13, html: 'Sam' });
    });
    Object.keys(itemBottom).forEach(id => {
      const u = R.units[id]; if (!u.host) return;
      boxes.push({ k: 'ln:' + id, c: 'ln', x: x0 + u.start * pps + 1, y: itemBottom[id], w: 2, h: Math.max(0, cy - itemBottom[id]), color: SEC[u.section] });
    });
    y = cy + th + 4;
    const al = R.lanes.audio || [];
    if (al.length) {
      boxes.push({ k: 'sh:audio', c: 'sh', x: 0, y, w: cfg.head, h: rh, html: ico('music'), color: SEC.audio });
      (al[0] || []).forEach(id => {
        const u = R.units[id], l = u.lead, w = Math.max(4, u.duration * pps);
        boxes.push({ k: 'u:' + id, c: 'it s-audio' + (o.sel === id ? ' sel' : ''), x: x0 + u.start * pps, y: y + (rh - ih) / 2, w, h: ih, id,
          html: '<i class="wv"></i>' + (cfg.names && w >= 40 ? '<span>' + esc(nameOf(l)) + '</span>' : '') });
      });
      y += rh;
    }
    return { boxes, H: y + 3 };
  }
  function makeLens(host, kind, cfg) {
    const box = el('div', 'v7-lz v7-lz-' + kind + (cfg.big ? ' big' : ''));
    box.setAttribute('aria-hidden', 'true');
    host.appendChild(box);
    const nodes = new Map(); let last = null, lastW = 0;
    function draw(doc, o) {
      o = o || {}; last = { doc, o };
      const W = box.clientWidth; if (!W) return;             // hidden: the observer draws it when it shows
      lastW = W;
      const r = kind === 'full' ? fullBoxes(doc, W, cfg, o) : quickBoxes(doc, W, cfg, o);
      box.style.height = r.H + 'px';
      reconcile(box, nodes, r.boxes, !!o.animate && !reduced());
    }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { const W = box.clientWidth; if (last && W && Math.abs(W - lastW) > 0.5) draw(last.doc, Object.assign({}, last.o, { animate: false })); }).observe(box);
    if (cfg.onTap) { box.addEventListener('click', e => { const n = e.target.closest('[data-id]'); if (n && box.contains(n)) cfg.onTap(n.dataset.id); }); box.classList.add('tappable'); }
    return { el: box, draw };
  }

  /* ------------------------------------------------------------------ the project, as a list (the middle) */
  const SW = { text: '#8d74d6', captions: '#c9a33a', audio: '#3fb592', shape: '#cf6ea0' };
  const range = (s, e) => num(s) + ' → ' + sec(e);
  function makeDoc(host, onTap) {
    const ol = el('ol', 'v7-dl'); host.appendChild(ol);
    const rows = new Map();
    function tags(l) {
      const t = [];
      if (E.hasFlag(l, 'main')) t.push(['main', 'clip row']);
      if (E.hasFlag(l, 'stay')) t.push(['stay', 'stays put']);
      if (E.hasFlag(l, 'tail')) t.push(['tail', 'ends with the video']);
      if (l.locked) t.push(['lock', 'locked']);
      if (Array.isArray(l.captions)) t.push(['cues', l.captions.length + ' lines']);
      const k = kfTimes(l).length; if (k) t.push(['kf', '◆ ' + k + ' keyframe' + (k === 1 ? '' : 's')]);
      return t;
    }
    function draw(doc, o) {
      o = o || {};
      const anim = !!o.animate && !reduced();
      const present = new Set(); let prev = null;
      doc.layers.forEach(l => {
        present.add(l.id);
        let r = rows.get(l.id);
        if (!r) {
          const li = el('li'), w = el('div', 'w'); const b = el('button', 'v7-row', '<span class="sw"></span><span class="nm"></span><span class="tm"></span><span class="tg"></span>');
          b.type = 'button'; b.dataset.id = l.id; w.appendChild(b); li.appendChild(w);
          b.addEventListener('click', () => onTap(l.id));
          r = { li, b, sw: b.querySelector('.sw'), nm: b.querySelector('.nm'), tm: b.querySelector('.tm'), tg: b.querySelector('.tg'), s: null, e: null, tags: '' };
          rows.set(l.id, r);
          ol.insertBefore(li, prev ? prev.nextSibling : ol.firstChild);
        }
        r.li.classList.remove('gone');
        const t = FULL_T(l);
        r.sw.style.background = (t === 'video' || t === 'image') ? V.thumb(l) : (SW[t] || '#7d8c95');
        r.nm.textContent = nameOf(l);
        const s1 = l.start, e1 = l.start + l.duration;
        if (r.s == null || !anim) r.tm.textContent = range(s1, e1);
        else if (!near(r.s, s1) || !near(r.e, e1)) { tween(r, r.s, r.e, s1, e1); flash(r.li); }
        r.s = s1; r.e = e1;
        const tg = tags(l), key = tg.map(x => x[0] + x[1]).join('|');
        if (key !== r.tags) {
          const had = new Set(r.tags.split('|'));
          r.tg.innerHTML = tg.map(x => '<span class="v7-tag t-' + x[0] + (anim && r.tags && !had.has(x[0] + x[1]) ? ' new' : '') + '">' + esc(x[1]) + '</span>').join('');
          if (anim && r.tags) flash(r.li);
          r.tags = key;
        }
        r.b.classList.toggle('sel', o.sel === l.id);
        r.b.setAttribute('aria-pressed', String(o.sel === l.id));
        r.b.setAttribute('aria-label', nameOf(l) + ', ' + range(s1, e1) + (tg.length ? ', ' + tg.map(x => x[1]).join(', ') : ''));
        prev = r.li;
      });
      rows.forEach((r, id) => {
        if (present.has(id)) return;
        if (!anim) { r.li.remove(); rows.delete(id); return; }
        if (r.li.classList.contains('gone')) return;
        r.li.classList.add('gone');
        setTimeout(() => { if (r.li.classList.contains('gone') && rows.get(id) === r) { r.li.remove(); rows.delete(id); } }, 700);
      });
    }
    function tween(r, s0, e0, s1, e1) {
      const t0 = performance.now(), D = 560; cancelAnimationFrame(r.raf);
      const step = now => { const k = Math.min(1, (now - t0) / D), z = 1 - Math.pow(1 - k, 3); r.tm.textContent = range(s0 + (s1 - s0) * z, e0 + (e1 - e0) * z); if (k < 1) r.raf = requestAnimationFrame(step); };
      r.raf = requestAnimationFrame(step);
    }
    function flash(li) { li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash'); clearTimeout(li._ft); li._ft = setTimeout(() => li.classList.remove('flash'), 1500); }
    return { el: ol, draw };
  }

  /* one plain sentence about a layer, for part 1 */
  const SECWORD = { text: 'Text', overlay: 'Overlay', effect: 'Effects', behind: 'Behind', audio: 'Sound' };
  function layerText(doc, id) {
    const R = E.classify(doc), l = R.layer(id); if (!l) return null;
    const u = R.units[id], n = '<b>' + esc(quote(nameOf(l))) + '</b>';
    let p;
    if (R.isMain(id)) {
      p = n + ' is one layer. Full gives it its own row. Simple shows it as clip ' + (R.idx[id] + 1) + ' of ' + R.main.length +
        (R.adopted && E.hasFlag(l, 'main') ? ', because it is saved as a clip-row clip.' : ', worked out on the spot: it fills the picture and carries on from the clip before.');
    } else if (u && u.kind === 'captions') {
      p = 'The captions are one layer with ' + l.captions.length + ' lines. Full shows it as one row. Simple shows every line, and each line rides on the clip under it.';
    } else if (u && u.host) {
      const h = R.layer(u.host);
      p = n + ' starts on ' + esc(quote(nameOf(h))) + ', so in Simple it sits in the ' + (SECWORD[u.section] || 'Overlay') + ' row and goes wherever ' + esc(nameOf(h)) + ' goes.';
    } else if (u && u.section === 'audio') {
      p = n + ' stays put: music does not follow clips.' + (E.hasFlag(l, 'tail') ? ' It ends with the video.' : ' When clips first move, it is marked to stay put.');
    } else p = n + ' is one layer, shown in both.';
    const bits = ['id: ' + l.id, 'start: ' + num(l.start), 'duration: ' + num(l.duration)];
    if (l.sm) bits.push('sm: ' + JSON.stringify(l.sm).replace(/"/g, '').replace(/,/g, ', ').replace(/:/g, ': '));
    if (l.locked) bits.push('locked: true');
    return { plain: p, how: 'Saved as <code>{ ' + esc(bits.join(', ')) + ' }</code>. Nothing else about it is stored; the rest is worked out.' };
  }

  /* ------------------------------------------------------------------ styles */
  function injectStyle() {
    if (document.getElementById('v7-style')) return;
    const s = document.createElement('style'); s.id = 'v7-style'; s.textContent = CSS; document.head.appendChild(s);
  }
  const CSS = `
.v7 { container-type: inline-size; display: grid; gap: 40px; min-width: 0; }
.v7 > * { min-width: 0; }
.v7 code { font-family: var(--h-mono); font-size: .84em; background: var(--h-surface-2); border: 1px solid var(--h-rule); border-radius: 5px; padding: 0 4px; overflow-wrap: anywhere; }
.v7-part { display: grid; gap: 14px; min-width: 0; }
.v7-part > * { min-width: 0; }
.v7-eb { font-family: var(--h-mono); font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--h-muted); margin: 0; }
.v7-eb b { color: var(--h-accent); font-weight: 600; }
.v7-h3 { font-family: var(--h-display); font-weight: 700; font-size: 23px; line-height: 1.15; margin: -6px 0 0; letter-spacing: -.01em; text-wrap: balance; }
.v7-lede { margin: 0; color: var(--h-muted); font-size: 15.5px; max-width: 64ch; text-wrap: pretty; }
.v7-hl { display: inline-block; width: 16px; height: 16px; vertical-align: -3px; }

/* ---- 1: the middle ---- */
.v7-trio { display: grid; grid-template-columns: minmax(0, 1fr); align-items: stretch; min-width: 0; }
.v7-trio > * { min-width: 0; }
.v7-beam { position: relative; height: 44px; }
.v7-beam .ln { position: absolute; left: 50%; top: 6px; bottom: 6px; width: 2px; margin-left: -1px; opacity: .75;
  background: repeating-linear-gradient(180deg, var(--h-accent) 0 5px, transparent 5px 10px); animation: v7-flow-v 1.1s linear infinite; }
.v7-beam.up .ln { animation-direction: reverse; }
.v7-beam .ah { position: absolute; left: 50%; width: 11px; height: 11px; margin-left: -5.5px; border-left: 2px solid var(--h-accent); border-top: 2px solid var(--h-accent); }
.v7-beam.up .ah { top: 4px; transform: rotate(45deg); }
.v7-beam.down .ah { bottom: 4px; transform: rotate(225deg); }
.v7-beam .lb { position: absolute; left: calc(50% + 12px); top: 50%; transform: translateY(-50%); font: 12px/1 var(--h-mono); color: var(--h-muted); white-space: nowrap; }
@keyframes v7-flow-v { to { background-position: 0 10px; } }
@keyframes v7-flow-h { to { background-position: 10px 0; } }

.v7-lens { margin: 0; border-radius: 16px; background: var(--panel); border: 1px solid #22313a; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, .22);
  background-image: radial-gradient(120% 70% at 50% -20%, rgba(90, 199, 237, .10), transparent 60%); }
.v7-lh { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 8px 12px; border: 0; border-bottom: 1px solid var(--line-soft);
  background: transparent; color: var(--text); text-align: left; cursor: pointer; font: inherit; }
.v7-lh:hover { background: rgba(255, 255, 255, .04); }
.v7-lh .nm { font-size: 15px; font-weight: 700; }
.v7-lh .sub { font-size: 12px; color: var(--text-dim); flex: 1; min-width: 0; }
.v7-lh .qm { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: var(--text-dim); flex: none; }
.v7-lh .qm .ico { width: 18px; height: 18px; }
.v7-lh[aria-pressed="true"] .qm { color: var(--accent); }
.v7-lh .ed { font-size: 10.5px; font-weight: 800; padding: 3px 8px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); letter-spacing: .02em; }
.v7-lh .ed.full { background: rgba(155, 135, 245, .16); color: #c3b6ff; }
.v7-lens .v7-lz { margin: 8px 10px 10px; }

.v7-doc { background: var(--h-surface); border: 1px solid var(--h-rule); border-radius: 16px; box-shadow: var(--h-shadow); overflow: hidden; position: relative; }
.v7-doc::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 3px; background: linear-gradient(90deg, #9b87f5, var(--h-accent)); }
.v7-dh { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; padding: 11px 14px 8px; border: 0; background: transparent; color: var(--h-ink); text-align: left; cursor: pointer; font: inherit; }
.v7-dh:hover { background: var(--h-accent-soft); }
.v7-dh .di { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--h-accent-soft); color: var(--h-accent); flex: none; }
.v7-dh .di .ico { width: 20px; height: 20px; }
.v7-dh .t { display: grid; gap: 1px; flex: 1; min-width: 0; }
.v7-dh b { font-family: var(--h-display); font-size: 18px; line-height: 1.1; }
.v7-dh small { font-size: 12.5px; color: var(--h-muted); }
.v7-dh .qm { color: var(--h-muted); }
.v7-dh .qm .ico { width: 18px; height: 18px; }
.v7-dh[aria-pressed="true"] .qm { color: var(--h-accent); }
.v7-dl { list-style: none; margin: 0; padding: 2px 6px 6px; display: grid; }
.v7-dl li { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .45s ease, opacity .4s ease; }
.v7-dl li > .w { min-height: 0; overflow: hidden; }
.v7-dl li.gone { grid-template-rows: 0fr; opacity: 0; }
.v7-dl li.gone .nm { text-decoration: line-through; }
.v7-row { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; column-gap: 9px; row-gap: 3px; align-items: center; width: 100%;
  border: 0; background: transparent; color: var(--h-ink); text-align: left; padding: 7px 8px; border-radius: 9px; cursor: pointer; font: 14.5px/1.2 var(--h-body); }
.v7-row:hover { background: var(--h-accent-soft); }
.v7-row .sw { width: 14px; height: 10px; border-radius: 3px; box-shadow: 0 0 0 1px rgba(0, 0, 0, .15); }
.v7-row .nm { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v7-row .tm { font: 12px/1.2 var(--h-mono); color: var(--h-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.v7-row .tg { grid-column: 2 / 4; display: flex; flex-wrap: wrap; gap: 4px; }
.v7-row .tg:empty { display: none; }
.v7-row.sel { background: var(--h-accent-soft); box-shadow: inset 0 0 0 1.5px var(--h-accent); }
.v7-dl li.flash .v7-row { animation: v7-flash 1.4s ease-out; }
@keyframes v7-flash { 0% { background: color-mix(in srgb, var(--h-accent) 28%, transparent); } 100% { background: transparent; } }
.v7-tag { font: 700 10.5px/1 var(--h-body); padding: 3px 7px; border-radius: 999px; background: var(--h-surface-2); color: var(--h-muted); white-space: nowrap; }
.v7-tag.t-main { background: var(--h-accent-soft); color: var(--h-accent); }
.v7-tag.t-stay, .v7-tag.t-tail { background: color-mix(in srgb, var(--h-good) 14%, transparent); color: var(--h-good); }
.v7-tag.t-lock { background: color-mix(in srgb, var(--h-warn) 16%, transparent); color: var(--h-warn); }
.v7-tag.new { animation: v7-pop .6s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes v7-pop { 0% { transform: scale(.4); opacity: 0; } 100% { transform: none; opacity: 1; } }
.v7-dfoot { margin: 0; padding: 6px 14px 11px; font: 11.5px/1.3 var(--h-mono); color: var(--h-faint); border-top: 1px dashed var(--h-rule); }

.v7-say { background: var(--h-surface); border: 1px solid var(--h-rule); border-left: 3px solid var(--h-accent); border-radius: 12px; padding: 12px 14px; display: grid; gap: 6px; min-height: 64px; }
.v7-say p { margin: 0; }
.v7-plain { font-size: 16px; line-height: 1.45; text-wrap: pretty; }
.v7-how { font-size: 13px; line-height: 1.55; color: var(--h-muted); }
.v7-how:empty { display: none; }
.v7-how .k { font-family: var(--h-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--h-faint); margin-right: 5px; }
.v7-say { position: relative; }
.v7-x { display: none; position: absolute; right: 6px; top: 6px; width: 36px; height: 36px; border: 0; border-radius: 10px; background: transparent; color: var(--h-muted); cursor: pointer; place-items: center; }
.v7-x:hover { background: var(--h-accent-soft); }
.v7-x .ico { width: 18px; height: 18px; }
.v7-say.picked { padding-right: 44px; }
.v7-say.picked .v7-x { display: grid; }
@container (max-width: 759px) {
  .v7-say.picked { position: sticky; bottom: 10px; z-index: 8; box-shadow: 0 -6px 30px rgba(0, 0, 0, .28), var(--h-shadow); }
}
.v7-say.pulse { animation: v7-saypulse .5s ease-out; }
@keyframes v7-saypulse { 0% { box-shadow: 0 0 0 0 var(--h-accent-soft); } 60% { box-shadow: 0 0 0 6px var(--h-accent-soft); } 100% { box-shadow: none; } }

@container (min-width: 760px) {
  /* wide: the two lenses side by side on top, the project centred under both, a "reads" arrow up to each */
  .v7-trio { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: "full quick" "bl br" "doc doc"; column-gap: 20px; align-items: stretch; }
  .v7-trio > .v7-lens:first-child { grid-area: full; }
  .v7-trio > .v7-lens:last-child { grid-area: quick; }
  .v7-trio > .v7-beam.up { grid-area: bl; }
  .v7-trio > .v7-beam.down { grid-area: br; }
  .v7-trio > .v7-doc { grid-area: doc; justify-self: center; width: min(100%, 600px); }
  .v7-beam { height: 48px; }
  .v7-beam.up .ln, .v7-beam.up .ah { left: 78%; }
  .v7-beam.down .ln, .v7-beam.down .ah { left: 22%; }
  .v7-beam.down .ah { top: 4px; bottom: auto; transform: rotate(45deg); }
  .v7-beam.down .ln { animation-direction: reverse; }
  .v7-beam.up .lb { left: calc(78% + 12px); }
  .v7-beam.down .lb { left: calc(22% + 12px); }
  .v7-row { grid-template-columns: 14px minmax(0, 1fr) auto auto; }
  .v7-row > .sw { order: 1; } .v7-row > .nm { order: 2; } .v7-row > .tg { order: 3; grid-column: auto; justify-content: flex-end; } .v7-row > .tm { order: 4; min-width: 7.5em; text-align: right; }
}

/* ---- the drawings (always the app's dark look) ---- */
.v7-lz { position: relative; }
.v7-lz .z { position: absolute; }
.v7-lz.anim .z { transition: left .5s cubic-bezier(.2, .75, .25, 1), top .5s cubic-bezier(.2, .75, .25, 1), width .5s cubic-bezier(.2, .75, .25, 1), height .5s cubic-bezier(.2, .75, .25, 1), opacity .35s, transform .35s; }
.v7-lz .z.out { opacity: 0; transform: scale(.7); pointer-events: none; }
.v7-lz.tappable .z[data-id] { cursor: pointer; }
.v7-lz .tk { border-left: 1px solid var(--line); }
.v7-lz .tk span { position: absolute; left: 3px; top: 0; font-size: 8.5px; line-height: 1; color: var(--text-faint); font-variant-numeric: tabular-nums; }
.v7-lz .hd { border-radius: 2.5px; background: #3b4a53; box-shadow: 0 0 0 1px rgba(255, 255, 255, .12); }
.v7-lz .hd.t-text { background: #6a4fb0; } .v7-lz .hd.t-captions { background: #8a6d1c; } .v7-lz .hd.t-audio { background: #1f6b58; }
.v7-lz .fb, .v7-lz .it, .v7-lz .tile { display: flex; align-items: center; overflow: hidden; white-space: nowrap; color: #fff; font-weight: 700; text-shadow: 0 1px 2px rgba(0, 0, 0, .9); }
.v7-lz .fb { border-radius: 4px; border: 1px solid rgba(255, 255, 255, .22); font-size: 8.5px; padding: 0 4px; box-shadow: 0 1px 3px rgba(0, 0, 0, .3); }
.v7-lz .fb span, .v7-lz .it span { position: relative; z-index: 1; overflow: hidden; text-overflow: ellipsis; }
.v7-lz .fb.t-video, .v7-lz .fb.t-image { border-color: #4d6db5; }
.v7-lz .fb.t-video::before, .v7-lz .fb.t-image::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(52, 80, 126, .5), rgba(40, 60, 99, .62)); }
.v7-lz .fb.t-text { background: linear-gradient(180deg, #6a4fb0, #50398d); border-color: #8d74d6; }
.v7-lz .fb.t-captions { background: linear-gradient(180deg, #8a6d1c, #6b5314); border-color: #c9a33a; }
.v7-lz .fb.t-audio { background: linear-gradient(180deg, #1f6b58, #174f42); border-color: #3fb592; }
.v7-lz .kd { background: var(--kf); transform: rotate(45deg); box-shadow: 0 0 0 1px rgba(0, 0, 0, .55); z-index: 2; }
.v7-lz .sh { display: grid; place-items: center; font-size: 9px; }
.v7-lz .sh b { font-weight: 800; }
.v7-lz .sh .ico { width: 12px; height: 12px; }
.v7-lz .it { border-radius: 4px; border: 1px solid; font-size: 8.5px; padding: 0 4px; }
.v7-lz .it.s-text { background: color-mix(in srgb, var(--sec-text) 55%, #111); border-color: var(--sec-text); }
.v7-lz .it.s-overlay { background: color-mix(in srgb, var(--sec-overlay) 50%, #111); border-color: var(--sec-overlay); }
.v7-lz .it.s-effect { background: color-mix(in srgb, var(--sec-effect) 50%, #111); border-color: var(--sec-effect); }
.v7-lz .it.s-behind { background: repeating-linear-gradient(135deg, #34424a 0 5px, #2a363d 5px 10px); border-color: var(--sec-behind); }
.v7-lz .it.s-audio { background: color-mix(in srgb, var(--sec-audio) 40%, #0c1a17); border-color: var(--sec-audio); }
.v7-lz .it .wv { position: absolute; inset: 0; opacity: .7; background: repeating-linear-gradient(90deg, rgba(255, 255, 255, .55) 0 1px, transparent 1px 3px);
  -webkit-mask: linear-gradient(0deg, transparent 15%, #000 50%, transparent 85%); mask: linear-gradient(0deg, transparent 15%, #000 50%, transparent 85%); }
.v7-lz .cue { border-radius: 3px; background: color-mix(in srgb, var(--sec-captions) 50%, #151208); border: 1px solid color-mix(in srgb, var(--sec-captions) 85%, #000); overflow: hidden; }
.v7-lz .cue span { position: absolute; left: 4px; right: 3px; top: 50%; transform: translateY(-50%); font-size: 8.5px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v7-lz .tile { border-radius: 5px; border: 1px solid rgba(255, 255, 255, .25); box-shadow: 0 2px 5px rgba(0, 0, 0, .35); }
.v7-lz .tile::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent 0 21px, rgba(0, 0, 0, .35) 21px 22px); pointer-events: none; }
.v7-lz .tile span { position: absolute; left: 4px; right: 3px; bottom: 3px; font-size: 8.5px; overflow: hidden; text-overflow: ellipsis; z-index: 1; }
.v7-lz .lk { position: absolute; right: 2px; top: 2px; width: 13px; height: 13px; border-radius: 4px; background: rgba(0, 0, 0, .65); color: #ffd27a; display: grid; place-items: center; z-index: 2; }
.v7-lz .lk .ico { width: 9px; height: 9px; }
.v7-lz .fb .lk { top: 50%; transform: translateY(-50%); }
.v7-lz .gap { border: 1.3px dashed var(--line); border-radius: 5px; background: rgba(255, 255, 255, .02); }
.v7-lz .gchip { border-radius: 8px; background: #2a1f14; border: 1.2px solid var(--warn); color: var(--warn); font-size: 8.5px; font-weight: 800; display: grid; place-items: center; z-index: 4; }
.v7-lz .ln { border-left: 1.3px dashed currentColor; opacity: .8; pointer-events: none; z-index: 1; }
.v7-lz .sel { box-shadow: 0 0 0 1.5px #fff, 0 2px 8px rgba(0, 0, 0, .5); z-index: 3; }
.v7-lz .held { box-shadow: 0 0 0 2px ${SAM}, 0 0 10px ${SAM}; z-index: 3; }
.v7-lz .who { background: ${SAM}; color: #2a0f1c; font-size: 8.5px; font-weight: 800; border-radius: 4px; display: grid; place-items: center; z-index: 5; }
.v7-lz .pulse { animation: v7-warnring 1.1s ease-out 2; z-index: 3; }
@keyframes v7-warnring { 0% { box-shadow: 0 0 0 0 rgba(255, 159, 90, .95); } 100% { box-shadow: 0 0 0 9px rgba(255, 159, 90, 0); } }
.v7-lz.big .fb, .v7-lz.big .it, .v7-lz.big .tile span, .v7-lz.big .cue span { font-size: 10px; }
.v7-lz.big .tk span { font-size: 9px; }
.v7-lz.big .sh { font-size: 10px; } .v7-lz.big .sh .ico { width: 14px; height: 14px; }
.v7-lz.big .tile span { bottom: 4px; left: 5px; }
.v7-lz.big .tile::after { background: repeating-linear-gradient(90deg, transparent 0 31px, rgba(0, 0, 0, .35) 31px 32px); }

/* ---- 2: the path ---- */
.v7-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.v7-chip { font: 700 14px/1.15 var(--h-body); border: 1px solid var(--h-rule); background: var(--h-surface); color: var(--h-ink); padding: 9px 14px; border-radius: 999px; cursor: pointer; min-height: 42px; }
.v7-chip:hover { border-color: var(--h-accent); }
.v7-chip[aria-pressed="true"] { background: var(--h-accent); border-color: var(--h-accent); color: var(--h-accent-ink); }
.v7-scn-say { margin: 0; font-size: 15.5px; max-width: 62ch; min-height: 2.9em; text-wrap: pretty; }
.v7-grid { display: grid; gap: 22px; grid-template-columns: minmax(0, 1fr); align-items: start; }
.v7-side { display: grid; gap: 12px; min-width: 0; }
.v7-ctl { display: flex; flex-wrap: wrap; gap: 10px; }
.v7-ctl .h-btn { display: inline-flex; align-items: center; gap: 8px; }
.v7-ctl .h-btn .ico { width: 16px; height: 16px; }
.v7-ctl .h-btn[disabled] { opacity: .55; cursor: default; }
.v7-res { margin: 0; font-size: 14.5px; color: var(--h-muted); text-wrap: pretty; }
.v7-res.hint { color: var(--h-faint); }
.v7-res b { color: var(--h-ink); }
@container (min-width: 760px) {
  .v7-grid { grid-template-columns: minmax(0, 1fr) minmax(300px, 390px); gap: 28px; }
  .v7-side { order: 2; position: sticky; top: 16px; }
}

.v7-app { position: relative; border-radius: 20px; overflow: hidden; background: var(--bg); border: 1px solid #22313a; box-shadow: 0 16px 44px rgba(0, 0, 0, .3);
  background-image: radial-gradient(120% 60% at 50% -10%, rgba(90, 199, 237, .10), transparent 60%); }
.v7-abar { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 10px; border-bottom: 1px solid var(--line-soft); }
.v7-abar .ed { font-size: 10.5px; font-weight: 800; padding: 3px 8px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
.v7-abar .ed.full { background: rgba(155, 135, 245, .16); color: #c3b6ff; }
.v7-abar .an { font-weight: 600; font-size: 13.5px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v7-who { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px 0 4px; border-radius: 12px; background: var(--panel-3); border: 1px solid var(--line); font-size: 11px; font-weight: 700; white-space: nowrap; }
.v7-who i { width: 16px; height: 16px; border-radius: 50%; background: ${SAM}; color: #2a0f1c; font: 800 9px/16px -apple-system, sans-serif; text-align: center; font-style: normal; }
.v7-who:empty { display: none; }
.v7-alz { background: var(--panel); padding: 6px 6px 4px; }
.v7-alz .v7-lz { margin: 0; }
.v7-app .fm-tray { min-height: 52px; height: auto; }
.v7-app .fm-tray .fm-tool { min-width: 44px; flex: 1 1 0; }
.v7-app .fm-tray .fm-tool.hl { box-shadow: none; background: color-mix(in srgb, var(--accent) 12%, var(--panel-2)); }
.v7-app .fm-tray > .fm-tool[data-tool="delete"].hl { box-shadow: -16px 0 12px -4px var(--panel-2), 10px 0 0 0 var(--panel-2); }
.v7-app .fm-tray .fm-tool.hl .ico { color: var(--accent); }
.v7-app .fm-tray .fm-tool[data-tool="delete"] .ico { color: var(--bad); }
.v7-app .fm-tray .fm-tool.on { background: color-mix(in srgb, #ff6b7a 18%, var(--panel-2)); }
.v7-line { display: flex; align-items: center; gap: 4px; width: 100%; min-width: 0; padding-right: 56px; }
.v7-line .t { flex: 0 1 auto; min-width: 0; font-size: 12.5px; color: var(--text); padding-left: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v7-line.warn .t { color: #ffd0a8; }
.v7-line.in { animation: v7-rise .3s ease-out; }
@keyframes v7-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.v7-app .v7-lb { border: 0; background: transparent; color: var(--accent); font-weight: 700; font-size: 12.5px; padding: 6px 8px; min-height: 36px; min-width: 44px; cursor: pointer; border-radius: 8px; white-space: nowrap; flex: none; }
.v7-app .v7-lb:hover { background: var(--accent-soft); }
.v7-pop { position: absolute; left: 8px; bottom: 58px; z-index: 20; min-width: 210px; display: grid; gap: 2px; padding: 6px; background: var(--panel-3); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 14px 34px rgba(0, 0, 0, .6); animation: v7-rise .2s ease-out; }
.v7-pop button { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 6px 10px; border: 0; background: transparent; border-radius: 8px; text-align: left; cursor: pointer; color: var(--text); font-size: 13px; }
.v7-pop button:hover { background: rgba(255, 255, 255, .07); }
.v7-pop .ico { width: 18px; height: 18px; color: var(--accent); flex: none; }
.v7-fullnote { padding: 12px 12px 14px; border-top: 1px solid var(--line-soft); background: var(--panel-2); color: var(--text-dim); font-size: 12.5px; line-height: 1.4; }

.v7-rail { position: relative; display: grid; min-width: 0; }
.v7-track, .v7-fill { position: absolute; left: 15px; width: 2px; border-radius: 2px; }
.v7-track { background: var(--h-rule); }
.v7-fill { background: var(--h-accent); height: 0; transition: height .42s cubic-bezier(.3, .7, .3, 1); }
.v7-rail.halt .v7-fill { background: linear-gradient(180deg, var(--h-accent), var(--h-warn)); }
.v7-dot { position: absolute; left: 9px; top: 0; width: 14px; height: 14px; border-radius: 50%; background: var(--h-accent); z-index: 3; pointer-events: none; opacity: 0;
  box-shadow: 0 0 0 4px var(--h-accent-soft), 0 0 16px var(--h-accent); transition: transform .42s cubic-bezier(.3, .7, .3, 1), opacity .3s, background .25s; }
.v7-rail.run .v7-dot { opacity: 1; }
.v7-rail.halt .v7-dot { background: var(--h-warn); box-shadow: 0 0 0 4px color-mix(in srgb, var(--h-warn) 22%, transparent), 0 0 16px var(--h-warn); }
.v7-rail.still .v7-dot, .v7-rail.still .v7-fill { transition: none; }
.v7-grp { margin: 16px 0 2px 44px; font-family: var(--h-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--h-faint); }
.v7-st { position: relative; min-width: 0; }
.v7-hit { display: grid; grid-template-columns: 32px minmax(0, 1fr) 14px; gap: 12px; align-items: center; width: 100%; background: transparent; border: 0; color: var(--h-ink);
  text-align: left; padding: 7px 6px 7px 0; border-radius: 12px; cursor: pointer; min-height: 54px; font: inherit; }
.v7-hit:hover .v7-nm b { color: var(--h-accent); }
.v7-node { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--h-surface); border: 1.5px solid var(--h-rule); color: var(--h-muted);
  position: relative; z-index: 2; transition: background .25s, border-color .25s, color .25s, transform .25s, box-shadow .25s; }
.v7-node .ico { width: 16px; height: 16px; }
.v7-tx { min-width: 0; }
.v7-nm { display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px 8px; }
.v7-nm b { font-size: 16px; line-height: 1.2; transition: color .15s; }
.v7-nm code { font-size: 11px; color: var(--h-muted); }
.v7-note { display: block; font-size: 13.5px; line-height: 1.35; color: var(--h-muted); margin-top: 2px; text-wrap: pretty; }
.v7-chev { width: 9px; height: 9px; border-right: 2px solid var(--h-faint); border-bottom: 2px solid var(--h-faint); transform: rotate(45deg); margin-top: -5px; transition: transform .2s; }
.v7-st.open .v7-chev { transform: rotate(-135deg); margin-top: 4px; }
.v7-st[data-state="active"] .v7-node { border-color: var(--h-accent); color: var(--h-accent); transform: scale(1.1); box-shadow: 0 0 0 6px var(--h-accent-soft); }
.v7-st[data-state="pass"] .v7-node { background: var(--h-good); border-color: var(--h-good); color: var(--h-bg); }
.v7-st[data-state="pass"] .v7-note { color: var(--h-good); font-weight: 700; }
.v7-st[data-state="stop"] .v7-node { background: var(--h-warn); border-color: var(--h-warn); color: var(--h-bg); box-shadow: 0 0 0 6px color-mix(in srgb, var(--h-warn) 18%, transparent); }
.v7-st[data-state="stop"] .v7-note { color: var(--h-warn); font-weight: 700; }
.v7-st[data-state="skip"] .v7-node { border-style: dashed; color: var(--h-faint); background: var(--h-bg); }
.v7-st[data-state="skip"] .v7-note { color: var(--h-faint); }
.v7-st[data-state="off"] .v7-hit { opacity: .42; }
.v7-more { margin: 0 0 10px 44px; padding: 11px 13px; background: var(--h-surface); border: 1px solid var(--h-rule); border-left: 3px solid var(--h-accent); border-radius: 10px; display: grid; gap: 6px; animation: v7-rise .22s ease-out; }
.v7-more[hidden] { display: none; }
.v7-more p { margin: 0; }
.v7-body { margin: 2px 0 10px 44px; min-width: 0; }
.v7-body:empty { display: none; }

.v7-box { background: var(--h-surface); border: 1px solid var(--h-rule); border-radius: 12px; padding: 12px; display: grid; gap: 10px; min-width: 0; }
.v7-box > * { min-width: 0; }
.v7-segrow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.v7-segrow > span { font-size: 13px; color: var(--h-muted); }
.v7-segrow .h-seg button { font-size: 13px; padding: 7px 12px; min-height: 34px; }
.v7-empty { margin: 0; font-size: 13.5px; color: var(--h-muted); }
.v7-empty .v7-go { border: 0; background: none; color: var(--h-accent); font: 700 13.5px var(--h-body); cursor: pointer; padding: 6px 2px; text-decoration: underline; text-underline-offset: 3px; }
.v7-dsum { margin: 0; font-size: 14.5px; }
.v7-dlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; background: var(--h-rule); border: 1px solid var(--h-rule); border-radius: 9px; overflow: hidden; }
.v7-dlist li { background: var(--h-surface); padding: 7px 10px; display: grid; gap: 2px; animation: v7-rise .3s ease-out both; }
.v7-dlist .dt { font-size: 13.5px; line-height: 1.35; }
.v7-dlist .dt::before { content: "±"; font-family: var(--h-mono); font-weight: 700; color: var(--h-accent); margin-right: 7px; }
.v7-dlist li.rm .dt::before { content: "−"; color: var(--h-warn); }
.v7-dlist .dp { font: 11px/1.35 var(--h-mono); color: var(--h-faint); overflow-wrap: anywhere; }
.v7-dnote { margin: 0; font-size: 13px; color: var(--h-good); }

.v7-wbox { container: v7w / inline-size; }
.v7-wire { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 38px minmax(0, 1fr) 38px minmax(0, 1fr); align-items: stretch; padding-bottom: 26px; }
.v7-stn { border: 1px solid var(--h-rule); border-radius: 10px; padding: 8px 4px; text-align: center; display: grid; gap: 2px; align-content: start; background: var(--h-bg); transition: border-color .25s, box-shadow .25s; min-width: 0; }
.v7-stn small { font-size: 10.5px; color: var(--h-muted); font-weight: 700; text-transform: uppercase; letter-spacing: .04em; line-height: 1.15; }
.v7-stn b { font: 700 15px/1.2 var(--h-mono); color: var(--h-ink); }
.v7-stn b.kf::before { content: ""; display: inline-block; width: 7px; height: 7px; background: #e0a800; transform: rotate(45deg); margin-right: 5px; vertical-align: 2px; }
.v7-stn span { font-size: 11px; color: var(--h-faint); line-height: 1.2; }
.v7-stn.m { background: color-mix(in srgb, var(--h-accent) 8%, var(--h-bg)); }
.v7-stn.hot { border-color: var(--h-accent); box-shadow: 0 0 0 3px var(--h-accent-soft); }
.v7-edge { position: relative; display: grid; place-content: center; justify-items: center; gap: 3px; min-width: 0; }
.v7-edge::before { content: ""; position: absolute; top: 4px; bottom: 4px; left: 50%; border-left: 2px dashed var(--h-rule); }
.v7-edge .ev { position: relative; z-index: 1; font: 700 12px/1.2 var(--h-body); color: var(--h-accent); background: var(--h-surface); padding: 3px 1px; text-align: center; white-space: nowrap; font-variant-numeric: tabular-nums; }
.v7-edge .ev .u { display: none; }
.v7-edge .es { display: none; }
.v7-edge.hot::before { border-left-color: var(--h-accent); }
.v7-edge.hot .ev { color: var(--h-ink); }
.v7-wire.unsent .v7-stn, .v7-wire.unsent .v7-edge { opacity: .6; }
@container v7w (min-width: 360px) {
  .v7-wire { grid-template-columns: minmax(0, 1fr) minmax(76px, .7fr) minmax(0, 1fr) minmax(76px, .7fr) minmax(0, 1fr); }
  .v7-stn { padding: 9px 6px; }
  .v7-edge { gap: 4px; padding: 0 4px; }
  .v7-edge .ev { font-size: 16px; padding: 4px 4px 2px; }
  .v7-edge .ev .u { display: inline; }
  .v7-edge .es { display: block; position: relative; z-index: 1; font-size: 11.5px; line-height: 1.25; color: var(--h-muted); background: var(--h-surface); text-align: center; padding: 0 2px 3px; text-wrap: balance; }
}
.v7-ptrack { position: absolute; left: 8%; right: 8%; bottom: 8px; height: 2px; background: repeating-linear-gradient(90deg, var(--h-rule) 0 6px, transparent 6px 10px); }
.v7-pk { position: absolute; top: 50%; left: 0; transform: translate(-50%, -50%); height: 20px; padding: 0 8px; border-radius: 10px; background: var(--h-accent); color: var(--h-accent-ink);
  font: 700 10.5px/20px var(--h-body); white-space: nowrap; opacity: 0; transition: left .55s cubic-bezier(.4, 0, .2, 1), opacity .25s; box-shadow: 0 2px 10px var(--h-accent-soft); }
.v7-wnote { margin: 0; font-size: 13.5px; line-height: 1.45; }
.v7-race { display: grid; gap: 10px; padding-top: 10px; border-top: 1px dashed var(--h-rule); }
.v7-race > p { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--h-muted); }
.v7-race > p b { color: var(--h-ink); }
.v7-rr { display: grid; gap: 5px; padding: 8px 10px; border-radius: 10px; border: 1px solid transparent; transition: border-color .2s, background .2s; }
.v7-rr.cur { border-color: var(--h-rule); background: var(--h-bg); }
.v7-rr p { margin: 0; font-size: 13px; line-height: 1.4; }
.v7-rr .rl b { font-size: 13.5px; }
.v7-rr.bad .v7-rt { color: var(--h-warn); }
.v7-rr.good .v7-rt { color: var(--h-good); }
.v7-rt { font-weight: 600; }
.v7-rtr { position: relative; height: 26px; border-radius: 6px; background: var(--panel, #0a141a); background: #0c1a21; box-shadow: inset 0 0 0 1px #1d3742; }
.v7-rtr .bar { position: absolute; top: 5px; height: 16px; border-radius: 4px; background: color-mix(in srgb, #4fb3ff 50%, #111); border: 1px solid #4fb3ff; }
.v7-rtr .ghost { position: absolute; top: 5px; height: 16px; border-radius: 4px; border: 1.3px dashed #4a6573; }
.v7-rtr .d { position: absolute; top: 9px; width: 8px; height: 8px; margin-left: -4px; transform: rotate(45deg); background: #ffce4a; box-shadow: 0 0 0 1px rgba(0, 0, 0, .6); z-index: 2; }
.v7-rtr .d.off { background: #ff6b7a; }
.v7-rtr .d.sam { box-shadow: 0 0 0 1.5px ${SAM}; }

.v7-sam { border-radius: 14px; overflow: hidden; background: var(--panel); border: 1px solid #22313a; }
.v7-sam .v7-abar { min-height: 36px; }
.v7-sam .v7-lz { margin: 6px 8px 8px; }

.v7-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) {
  .v7-beam .ln { animation: none; }
  .v7 .v7-dot, .v7 .v7-fill, .v7 .v7-pk, .v7 .v7-node { transition: none; }
}
`;

  /* ------------------------------------------------------------------ the page */
  function mount(host) {
    injectStyle();
    const root = el('div', 'v7'); host.appendChild(root);

    /* state: one live document, what is picked, and the example being played */
    let sc = SCN[1], startDoc = sc.make(), cur = startDoc, opt = {}, sel = null, what = 'none';
    let mode = sc.mode || 'clip', runTok = 0, playing = false, lastOC = null, reached = -1, played = false, wireDoc = startDoc, samDoc = startDoc, stopped = false;

    /* ============ 1 · the middle ============ */
    const p1 = el('section', 'v7-part');
    p1.innerHTML = '<p class="v7-eb"><b>1</b> · One project</p><h3 class="v7-h3">One project in the middle, two ways of looking at it</h3>' +
      '<p class="v7-lede">Full and Simple are two lenses on the same saved project. Tap a layer in any of the three to find it in the other two. Tap a heading to see what it is.</p>';
    const trio = el('div', 'v7-trio');
    const lensCard = (key, name, sub, ed) => {
      const f = el('figure', 'fm v7-lens');
      const h = el('button', 'v7-lh', '<span class="ed' + (ed === 'full' ? ' full' : '') + '">' + esc(name) + '</span><span class="sub">' + esc(sub) + '</span><span class="qm">' + V.icon('help') + '</span>');
      h.type = 'button'; h.setAttribute('aria-pressed', 'false'); h.dataset.what = key;
      f.appendChild(h); return { f, h };
    };
    const fullC = lensCard('full', 'Full', 'every layer on its own row', 'full');
    const quickC = lensCard('quick', 'Simple', 'clips end to end, the rest in rows', 'quick');
    const docC = el('div', 'v7-doc');
    const docH = el('button', 'v7-dh', '<span class="di">' + ico('doc') + '</span><span class="t"><b>The project</b><small>Beach day · saved once, on the device</small></span><span class="qm">' + V.icon('help') + '</span>');
    docH.type = 'button'; docH.setAttribute('aria-pressed', 'false'); docH.dataset.what = 'doc';
    docC.appendChild(docH);
    const beam = dir => el('div', 'v7-beam ' + dir, '<i class="ln"></i><i class="ah"></i><span class="lb">reads</span>');
    trio.append(fullC.f, beam('up'), docC, beam('down'), quickC.f);
    p1.appendChild(trio);
    const say1 = el('div', 'v7-say'); say1.setAttribute('role', 'status');
    say1.innerHTML = '<button type="button" class="v7-x" aria-label="Close">' + V.icon('close') + '</button><p class="v7-plain"></p><p class="v7-how"></p>';
    say1.querySelector('.v7-x').addEventListener('click', () => { sel = null; what = 'none'; drawP1(false); });
    p1.appendChild(say1);
    root.appendChild(p1);

    const pick = id => { sel = sel === id ? null : id; what = sel ? 'layer' : 'none'; drawP1(false); };
    const fullL = makeLens(fullC.f, 'full', { head: 18, rulerH: 11, rowH: 18, barH: 13, names: true, onTap: pick });
    const quickL = makeLens(quickC.f, 'quick', { head: 18, rulerH: 11, rowH: 17, barH: 12, tileH: 30, names: true, onTap: pick });
    const docL = makeDoc(docC, pick);
    const docFoot = el('p', 'v7-dfoot'); docC.appendChild(docFoot);
    [fullC.h, docH, quickC.h].forEach(b => b.addEventListener('click', () => { const w = b.dataset.what; what = what === w ? 'none' : w; sel = null; drawP1(false); }));

    function drawP1(animate) {
      if (sel && !cur.layers.some(l => l.id === sel)) { sel = null; if (what === 'layer') what = 'none'; }
      fullL.draw(cur, { sel, animate }); quickL.draw(cur, { sel, animate }); docL.draw(cur, { sel, animate });
      const P = cur.project;
      docFoot.textContent = 'project · ' + P.width + '×' + P.height + ' · ' + sec(P.duration) + (P.sm && P.sm.adopted ? ' · arranged in Simple' : '');
      [fullC.h, docH, quickC.h].forEach(b => b.setAttribute('aria-pressed', String(what === b.dataset.what)));
      say1.classList.toggle('picked', what !== 'none');
      let t = PART1[what] || PART1.none;
      if (what === 'layer' && sel) t = layerText(cur, sel) || PART1.none;
      const pl = say1.querySelector('.v7-plain'), hw = say1.querySelector('.v7-how');
      const next = t.plain + '§' + t.how;
      if (say1._k !== next) {
        pl.innerHTML = t.plain; hw.innerHTML = t.how ? '<span class="k">In the code</span>' + t.how : '';
        say1._k = next; if (!reduced() && what !== 'none') { say1.classList.remove('pulse'); void say1.offsetWidth; say1.classList.add('pulse'); }
      }
    }

    /* ============ 2 · the path ============ */
    const p2 = el('section', 'v7-part');
    p2.innerHTML = '<p class="v7-eb"><b>2</b> · One path</p><h3 class="v7-h3">Every Simple edit takes the same path</h3>' +
      '<p class="v7-lede">A few checks, then the change, saved as one step, then sent to friends. Pick an example and press Play. Tap any stage to see what it does.</p>';
    const chips = el('div', 'v7-chips'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Examples');
    SCN.forEach(s => { const b = el('button', 'v7-chip', esc(s.chip)); b.type = 'button'; b.dataset.scn = s.id; b.addEventListener('click', () => choose(s.id, true)); chips.appendChild(b); });
    const scnSay = el('p', 'v7-scn-say');
    p2.append(chips, scnSay);
    const grid = el('div', 'v7-grid');
    const side = el('div', 'v7-side');
    const railHost = el('div');
    grid.append(side, railHost);
    p2.appendChild(grid);
    root.appendChild(p2);

    /* the app, as you would see it */
    const app = el('div', 'fm v7-app');
    app.innerHTML = '<div class="v7-abar"><span class="ed">Simple</span><span class="an">Beach day</span><span class="v7-who"></span></div><div class="v7-alz"></div><div class="fm-tray"></div>';
    side.appendChild(app);
    const aEd = app.querySelector('.ed'), aWho = app.querySelector('.v7-who'), aLz = app.querySelector('.v7-alz'), tray = app.querySelector('.fm-tray');
    tray.setAttribute('role', 'status'); tray.setAttribute('aria-live', 'polite');
    const aQuick = makeLens(aLz, 'quick', { head: 22, rulerH: 12, rowH: 21, barH: 16, tileH: 44, names: true, big: true });
    const aFull = makeLens(aLz, 'full', { head: 20, rulerH: 12, rowH: 20, barH: 15, names: true, big: true });
    const fullNote = el('div', 'v7-fullnote'); app.appendChild(fullNote);
    const ctl = el('div', 'v7-ctl');
    const playB = el('button', 'h-btn primary', V.icon('play') + '<span>Play</span>'); playB.type = 'button';
    const resetB = el('button', 'h-btn', V.icon('undo') + '<span>Start again</span>'); resetB.type = 'button';
    ctl.append(playB, resetB); side.appendChild(ctl);
    const res = el('p', 'v7-res'); side.appendChild(res);
    const setRes = (h, hint) => { res.innerHTML = h; res.classList.toggle('hint', !!hint); };
    const idleRes = () => setRes('Press <b>Play</b> and watch the dot go down the path.', true);
    playB.addEventListener('click', () => { if (lastOC && lastOC.S.blockers.st === 'stop' && !opt.samDone) play({ samDone: true }); else play({}); });
    resetB.addEventListener('click', () => reset(true, ''));

    /* the rail */
    const rail = el('div', 'v7-rail'); railHost.appendChild(rail);
    const track = el('i', 'v7-track'), fill = el('i', 'v7-fill'), dot = el('i', 'v7-dot');
    rail.append(track, fill, dot);
    const live = el('p', 'v7-sr'); live.setAttribute('aria-live', 'polite'); rail.appendChild(live);
    const st = STAGES.map((S, i) => {
      if (S.grp) rail.appendChild(el('p', 'v7-grp', esc(S.grp)));
      const row = el('div', 'v7-st'); row.dataset.state = 'idle'; row.dataset.st = S.id;
      const hit = el('button', 'v7-hit', '<span class="v7-node"></span><span class="v7-tx"><span class="v7-nm"><b>' + esc(S.name) + '</b><code>' + esc(S.code) + '</code></span><span class="v7-note"></span></span><i class="v7-chev" aria-hidden="true"></i>');
      hit.type = 'button'; hit.setAttribute('aria-expanded', 'false');
      const more = el('div', 'v7-more', '<p class="v7-plain">' + esc(S.plain) + '</p><p class="v7-how"><span class="k">In the code</span>' + S.how + '</p>');
      more.hidden = true; more.id = 'v7-more-' + S.id; hit.setAttribute('aria-controls', more.id);
      const body = el('div', 'v7-body');
      row.append(hit, more, body); rail.appendChild(row);
      hit.addEventListener('click', () => toggle(i));
      return { S, row, hit, more, body, node: hit.querySelector('.v7-node'), note: hit.querySelector('.v7-note') };
    });
    function toggle(i) {
      st.forEach((s, j) => { const open = j === i && s.more.hidden; s.more.hidden = !open; s.hit.setAttribute('aria-expanded', String(open)); s.row.classList.toggle('open', open); });
      layoutRail();
    }
    const stageIcon = i => i === 0 ? (sc.full ? 'editor' : 'delete') : STAGES[i].icon;
    function setStage(i, state, note) {
      const s = st[i]; s.row.dataset.state = state;
      s.note.textContent = note != null && note !== '' ? note : STAGES[i].idle;
      s.node.innerHTML = state === 'pass' ? V.icon('check') : state === 'stop' ? V.icon('close') : ico(stageIcon(i));
    }
    function centers() {
      const rr = rail.getBoundingClientRect();
      return st.map(s => { const r = s.node.getBoundingClientRect(); return r.top - rr.top + r.height / 2; });
    }
    function placeDot(i, still) {
      const c = centers(); if (!c.length) return;
      track.style.top = c[0] + 'px'; track.style.height = Math.max(0, c[c.length - 1] - c[0]) + 'px';
      const y = i < 0 ? c[0] : c[i];
      if (still) rail.classList.add('still');
      dot.style.transform = 'translateY(' + (y - 7) + 'px)';
      fill.style.top = c[0] + 'px'; fill.style.height = (i < 0 ? 0 : Math.max(0, y - c[0])) + 'px';
      if (still) { void dot.offsetWidth; rail.classList.remove('still'); }
    }
    function layoutRail() { placeDot(reached, true); }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => layoutRail()).observe(rail);

    /* bodies: what changed, the wire, Sam's phone */
    const diffB = st[IDX.diff].body, wireB = st[IDX.wire].body, samB = st[IDX.sam].body;
    const dBox = el('div', 'v7-box'); diffB.appendChild(dBox);
    const seg = el('div', 'v7-segrow', '<span>Keyframes travel as</span><div class="h-seg" role="group" aria-label="How keyframes travel"><button type="button" data-m="clip">Clip time</button><button type="button" data-m="abs">Project time</button></div>');
    const segNote = el('p', 'v7-empty');
    const dOut = el('div');
    dBox.append(seg, segNote, dOut);
    seg.addEventListener('click', e => { const b = e.target.closest('button[data-m]'); if (!b) return; mode = b.dataset.m; drawBodies(false); });

    const wBox = el('div', 'v7-box v7-wbox'); wireB.appendChild(wBox);
    wBox.innerHTML = '<p class="v7-wnote wcap"></p>' +
      '<div class="v7-wire"><div class="v7-stn a"><small>Your phone</small><b class="kf va"></b><span>project time</span></div>' +
      '<div class="v7-edge e1"><span class="ev"></span><small class="es"></small></div>' +
      '<div class="v7-stn m"><small>On the wire</small><b class="kf vm"></b><span class="um"></span></div>' +
      '<div class="v7-edge e2"><span class="ev"></span><small class="es"></small></div>' +
      '<div class="v7-stn c"><small>Sam’s phone</small><b class="kf vc"></b><span>project time</span></div>' +
      '<div class="v7-ptrack"><i class="v7-pk"></i></div></div>' +
      '<p class="v7-wnote wafter"></p><div class="v7-race"></div>';
    const W = s => wBox.querySelector(s);
    const samBox = el('div'); samB.appendChild(samBox);
    let samL = null;

    function setOut(h) { if (dOut._h !== h) { dOut.innerHTML = h; dOut._h = h; } }
    function drawBodies(animSam) {
      seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));
      segNote.textContent = mode === 'clip' ? 'Clip time comes with the “together” release.' : 'Project time is how it works today.';
      /* what changed */
      const di = IDX.diff, sd = lastOC && lastOC.S.diff;
      if (sd && sd.st === 'pass' && st[di].row.dataset.state === 'pass') {
        const d = diffDocs(startDoc, lastOC.after, mode === 'clip');
        setOut('<p class="v7-dsum"><b>' + d.ops + ' changes</b>, sent together as one package</p><ul class="v7-dlist">' +
          d.rows.map((r, k) => '<li class="' + r.kind + '" style="animation-delay:' + (reduced() ? 0 : k * 45) + 'ms"><span class="dt">' + esc(r.text) + '</span><span class="dp">' + esc(r.paths.join('  ')) + '</span></li>').join('') + '</ul>' +
          (d.saved.length ? '<p class="v7-dnote">Not sent: ' + esc(d.saved.join(', ')) + '. Counted from the clip’s own start, they did not change.</p>' : ''));
        st[di].note.textContent = d.ops + ' changes · one package';
      } else {
        const why = lastOC && lastOC.halted ? 'Nothing was saved, so nothing is sent.' : sc.friend ? 'Press Play to see the list.' : 'This only happens while a friend is in the project.';
        setOut('<p class="v7-empty">' + esc(why) + (sc.friend ? '' : ' <button type="button" class="v7-go" data-go="sam">Try “With Sam”</button>') + '</p>');
      }
      /* the wire */
      const wv = wireVals(wireDoc), w0 = wireVals(startDoc);
      const clip = mode === 'clip';
      const unsent = stopped;
      W('.wcap').innerHTML = unsent
        ? '<b>Nothing was sent this time.</b> This is how one keyframe would travel: the shell sticker’s pop, when it reaches full size.'
        : '<b>How one keyframe travels:</b> the shell sticker’s pop, when it reaches full size.';
      W('.v7-wire').classList.toggle('unsent', unsent);
      if (wv) {
        W('.va').textContent = sec(wv.abs); W('.vc').textContent = sec(wv.abs);
        W('.vm').textContent = clip ? sec(wv.rel) : sec(wv.abs);
        W('.um').textContent = clip ? 'into the sticker' : 'project time';
        const at = esc(num(wv.start)), unit = '<span class="u">\u2009s</span>';
        W('.e1 .ev').innerHTML = clip ? '\u2212' + at + unit : 'as is';
        W('.e2 .ev').innerHTML = clip ? '+' + at + unit : 'as is';
        W('.e1 .es').textContent = clip ? 'takes off its start' : 'no change';
        W('.e2 .es').textContent = clip ? 'adds it back' : 'no change';
        W('.e1').setAttribute('aria-label', clip ? 'Going out: minus ' + num(wv.start) + ' seconds, the sticker’s start' : 'Going out: sent as is');
        W('.e2').setAttribute('aria-label', clip ? 'Coming in: plus ' + num(wv.start) + ' seconds, the sticker’s start' : 'Coming in: used as is');
        const moved = w0 && !near(w0.start, wv.start);
        W('.wafter').innerHTML = !moved
          ? (clip ? 'The sticker starts at ' + esc(sec(wv.start)) + ', so ' + esc(sec(wv.abs)) + ' in the project is ' + esc(num(wv.rel)) + ' s into the sticker. Only the edges of the wire convert.'
                  : 'Today keyframes travel in project time, exactly as they are saved.')
          : (clip ? '<b>Still ' + esc(num(wv.rel)) + ' s into the sticker</b> after your delete, so its keys are not sent again. Only the sticker’s new start, ' + esc(sec(wv.start)) + ', goes.'
                  : '<b>Its project time changed</b> from ' + esc(num(w0.abs)) + ' to ' + esc(sec(wv.abs)) + ', so today the sticker’s whole key list is sent again. That is what can fight a friend’s edit:');
      }
      drawRace();
      /* Sam's phone */
      if (!sc.friend) {
        samBox.innerHTML = '<p class="v7-empty">Nobody else is in this example. <button type="button" class="v7-go" data-go="sam">Try “With Sam”</button></p>'; samL = null;
      } else {
        if (!samL) {
          samBox.innerHTML = '';
          const card = el('div', 'fm v7-sam', '<div class="v7-abar"><span class="ed full">Full</span><span class="an">Beach day · Sam’s phone</span><span class="v7-who"><i>S</i>Sam</span></div>');
          samBox.appendChild(card);
          samL = makeLens(card, 'full', { head: 16, rulerH: 11, rowH: 15, barH: 11, names: true });
        }
        samL.draw(samDoc, { animate: animSam, held: sc.friend.holding && !opt.samDone ? sc.friend.holding : null });
      }
    }
    function drawRace() {
      const race = W('.v7-race');
      const b0 = startDoc.layers.find(l => l.id === 'sticker');
      const ed = E.editor(beach()); ed.run('deleteClip', { id: 'c2' });
      const b1 = ed.doc.layers.find(l => l.id === 'sticker');
      if (!b0 || !b1 || !b0.kf || !b0.kf.scale) { race.innerHTML = ''; return; }
      const span = 10, P = t => (Math.max(0, Math.min(span, t)) / span * 100) + '%', Wd = d => (d / span * 100) + '%';
      const samRel = 1.0, dt = b1.start - b0.start;
      const oldKeys = b0.kf.scale.map(k => k.t).concat([b0.start + samRel]);
      const relKeys = oldKeys.map(t => t - b0.start);
      const strip = (keys, off) => '<div class="v7-rtr"><i class="ghost" style="left:' + P(b0.start) + ';width:' + Wd(b0.duration) + '"></i>' +
        '<i class="bar" style="left:' + P(b1.start) + ';width:' + Wd(b1.duration) + '"></i>' +
        keys.map((t, k) => '<i class="d' + (off ? ' off' : '') + (k === keys.length - 1 ? ' sam' : '') + '" style="left:' + P(t) + '"></i>').join('') + '</div>';
      race.innerHTML = '<p><b>If Sam adds a key at the same moment.</b> Your delete slides the sticker ' + esc(sec(Math.abs(dt))) + ' earlier while Sam adds a key ' + esc(sec(samRel)) + ' into it. The dashed box is where the sticker was.</p>' +
        '<div class="v7-rr bad' + (mode === 'abs' ? ' cur' : '') + '"><p class="rl"><b>Project time</b> · today</p>' + strip(oldKeys, true) +
        '<p class="v7-rt">Sam’s list lands last and puts the keys back where the sticker used to be. Nobody is told.</p></div>' +
        '<div class="v7-rr good' + (mode === 'clip' ? ' cur' : '') + '"><p class="rl"><b>Clip time</b> · together</p>' + strip(relKeys.map(r => b1.start + r), false) +
        '<p class="v7-rt">Both land. Every key stays on the sticker.</p></div>';
    }
    root.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g && root.contains(g)) { choose(g.dataset.go, true); chips.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); } });

    /* the app strip */
    function drawApp(phase, animate) {
      const full = !!sc.full;
      aEd.textContent = full ? 'Full' : 'Simple'; aEd.classList.toggle('full', full);
      aWho.innerHTML = sc.friend ? '<i>S</i>Sam · ' + (opt.viewer ? 'Viewer' : 'Full') : '';
      aQuick.el.style.display = full ? 'none' : ''; aFull.el.style.display = full ? '' : 'none';
      const line = lastOC && lastOC.line;
      const o = { animate, sel: full ? (cur.layers.some(l => l.id === 'c4') ? 'c4' : null) : (cur.layers.some(l => l.id === 'c2') ? 'c2' : null),
        held: sc.friend && sc.friend.holding && !opt.samDone ? sc.friend.holding : null,
        pulse: phase === 'stop' && line && line.pulse ? line.pulse : null };
      (full ? aFull : aQuick).draw(cur, o);
      tray.style.display = full ? 'none' : '';
      fullNote.style.display = full ? '' : 'none';
      fullNote.innerHTML = phase === 'done' ? 'Moved. Nothing else moved with it. Back in Simple, the <b>1 s gap</b> shows as a block with a chip you tap to close. Simple never closes it by itself.'
        : 'Full: drag Sunset along its row. Full edits never move other clips.';
      const pop = app.querySelector('.v7-pop'); if (pop) pop.remove();
      if (full) { tray.innerHTML = ''; return; }
      if (phase === 'idle' || phase === 'pressed') {
        const tb = V.toolbar(tray, V.CLIP_TRAY, { onClick: id => { if (id === 'delete' && !playing) play({}); } });
        tb.set('delete', { hl: phase === 'idle', on: phase === 'pressed' });
        Object.keys(tb.buttons).forEach(k => { if (k !== 'delete') tb.buttons[k].tabIndex = -1; });
        return;
      }
      tray.innerHTML = '';
      if (!line) return;
      const ln = el('div', 'v7-line' + (phase === 'stop' ? ' warn' : '') + (animate && !reduced() ? ' in' : ''));
      ln.appendChild(el('span', 't', esc(line.text))).title = line.text;
      (line.btns || []).forEach(([label, act]) => { const b = el('button', 'v7-lb', esc(label)); b.type = 'button'; b.addEventListener('click', () => lineAct(act)); ln.appendChild(b); });
      tray.appendChild(ln);
    }
    function lineAct(act) {
      if (act === 'undo') { reset(true, 'Undone: one tap took the whole step back, everything on Waves included.'); return; }
      if (act === 'force') { play({ force: true }); return; }
      if (act === 'options') {
        let pop = app.querySelector('.v7-pop'); if (pop) { pop.remove(); return; }
        pop = el('div', 'v7-pop');
        const mk = (icn, label, fn) => { const b = el('button', '', V.icon(icn) + '<span>' + esc(label) + '</span>'); b.type = 'button'; b.addEventListener('click', fn); pop.appendChild(b); };
        mk('eye', 'Make Sam a Viewer', () => { pop.remove(); play({ viewer: true }); });
        mk('editor', 'Open in Full', () => { pop.remove(); setRes('<b>Open in Full:</b> there, Delete removes only Waves and leaves a 3.7 s gap. Full never moves other clips, so it is never held back.'); });
        app.appendChild(pop);
        const first = pop.querySelector('button'); if (first) first.focus();
      }
    }

    /* choosing and playing */
    function choose(id, byUser) {
      const s = SCN.find(x => x.id === id) || SCN[0];
      runTok++; playing = false;
      sc = s; startDoc = s.make(); cur = startDoc; wireDoc = startDoc; samDoc = startDoc; opt = {}; lastOC = null; reached = -1;
      mode = s.mode || mode;
      chips.querySelectorAll('.v7-chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scn === s.id)));
      scnSay.textContent = s.say;
      idleRes();
      resetRail();
      drawP1(false); drawApp('idle', false); drawBodies(false);
      syncCtl();
      if (byUser) played = true;
    }
    function resetWire() {
      const pk = W('.v7-pk');
      pk.style.transition = 'none'; pk.style.opacity = '0'; pk.style.left = '0%'; pk.textContent = '';
      void pk.offsetWidth; pk.style.transition = '';
      wBox.querySelectorAll('.hot').forEach(n => n.classList.remove('hot'));
    }
    function resetRail() {
      resetWire(); stopped = false;
      rail.classList.remove('run', 'halt');
      st.forEach((s, i) => setStage(i, 'idle', null));
      reached = -1; layoutRail();
    }
    function reset(animate, msg) {
      runTok++; playing = false;
      const was = cur;
      cur = startDoc; wireDoc = startDoc; samDoc = startDoc; opt = {}; lastOC = null;
      resetRail();
      drawP1(animate && was !== startDoc); drawApp('idle', animate && was !== startDoc); drawBodies(animate);
      if (msg) setRes(esc(msg)); else idleRes();
      syncCtl();
    }
    function syncCtl() {
      const busyStop = lastOC && lastOC.S.blockers.st === 'stop' && !playing;
      playB.querySelector('span').textContent = playing ? 'Playing…' : busyStop ? 'Try again' : lastOC ? 'Play again' : 'Play';
      playB.disabled = playing;
    }
    async function play(o) {
      const tok = ++runTok; played = true;
      opt = Object.assign({}, o || {});
      const oc = outcome(sc, startDoc, opt);
      lastOC = oc; playing = true;
      cur = startDoc; wireDoc = startDoc; samDoc = startDoc;
      resetRail(); rail.classList.add('run');
      setRes('Watch the dot go down the path.', true);
      drawP1(false); drawApp('pressed', false); drawBodies(false);
      syncCtl();
      const rm = reduced();
      for (let i = 0; i < STAGES.length; i++) {
        const S = STAGES[i], r = oc.S[S.id];
        if (r.st === 'off') { setStage(i, 'off', r.note); continue; }
        reached = i;
        if (!rm) {
          placeDot(i, false); setStage(i, 'active', null);
          await wait(r.st === 'skip' ? 300 : 460); if (tok !== runTok) return;
        }
        setStage(i, r.st, r.note);
        if (S.id === 'commit' && r.st === 'pass') { cur = oc.after; drawP1(!rm); drawApp('done', !rm); }
        if (r.st === 'stop') { rail.classList.add('halt'); stopped = true; drawApp('stop', !rm); drawBodies(false); for (let j = i + 1; j < STAGES.length; j++) setStage(j, 'off', oc.S[STAGES[j].id].note); break; }
        if (S.id === 'diff' && r.st === 'pass') drawBodies(false);
        if (S.id === 'wire' && r.st === 'pass') { await sendPacket(oc, tok, rm); if (tok !== runTok) return; }
        if (S.id === 'sam' && r.st === 'pass') { samDoc = oc.after; drawBodies(!rm); }
        if (!rm) { await wait(r.st === 'skip' ? 60 : 200); if (tok !== runTok) return; }
      }
      if (tok !== runTok) return;
      if (rm) placeDot(reached, true);
      rail.classList.remove('run');
      playing = false;
      setRes(resultLine(oc));
      live.textContent = (oc.line ? oc.line.text + '. ' : '') + res.textContent;
      syncCtl();
    }
    function resultLine(oc) {
      if (oc.halted) {
        const s = STAGES.find(x => oc.S[x.id].st === 'stop');
        const tail = s.id === 'locked' ? ' Tap <b>Do it anyway</b> in the app to move it and keep the lock.'
          : s.id === 'blockers' ? ' Press <b>Try again</b>: by then Sam is done with Sunset.'
          : s.id === 'gate' ? ' Tap <b>Options ›</b> in the app for the two ways out.' : '';
        return '<b>Nothing was saved</b>, so there is nothing to undo.' + tail;
      }
      if (sc.full) return '<b>Saved as 1 step:</b> Move Sunset. It never went through the checks, because a Full edit moves only the thing you dragged.';
      return '<b>Saved as 1 step:</b> ' + esc(oc.res.label) + '. One Undo takes all of it back' + (oc.res.adopted ? ', the saved clip row included' : '') + '.' + (sc.friend ? ' Sam got it as one package.' : '');
    }
    async function sendPacket(oc, tok, rm) {
      const d = diffDocs(startDoc, oc.after, mode === 'clip');
      const pk = W('.v7-pk'); pk.textContent = d.ops + ' changes';
      const a = W('.v7-stn.a'), m = W('.v7-stn.m'), c = W('.v7-stn.c'), e1 = W('.e1'), e2 = W('.e2');
      wireDoc = oc.after;
      if (rm) { drawBodies(false); return; }
      const hot = (n, on) => n.classList.toggle('hot', on);
      pk.style.transition = 'none'; pk.style.left = '0%'; pk.style.opacity = '1'; void pk.offsetWidth; pk.style.transition = '';
      drawBodies(false); hot(a, true);
      await wait(260); if (tok !== runTok) return;
      hot(e1, true); pk.style.left = '50%';
      await wait(560); if (tok !== runTok) return;
      hot(a, false); hot(e1, false); hot(m, true);
      await wait(360); if (tok !== runTok) return;
      hot(e2, true); pk.style.left = '100%';
      await wait(560); if (tok !== runTok) return;
      hot(m, false); hot(e2, false); hot(c, true);
      await wait(380); if (tok !== runTok) return;
      hot(c, false); pk.style.opacity = '0';
    }

    /* first view plays "With Sam" once, unless he has already touched it or asks for less motion */
    choose(sc.id, false);
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver(ents => {
        if (!ents.some(e => e.isIntersecting)) return;
        io.disconnect();
        if (!played && !reduced()) setTimeout(() => { if (!played && app.isConnected) play({}); }, 500);
      }, { threshold: 0.6 });
      io.observe(app);
    }
    host._shown = () => { layoutRail(); };
  }

  V.register('v7', {
    title: 'How it is built',
    group: "How it's built",
    blurb: 'One project in the middle, two ways of looking at it, and the one path every edit takes before it is saved and sent to a friend.',
    mount
  });
})();
