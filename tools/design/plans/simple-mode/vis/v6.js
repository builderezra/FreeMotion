/* V6 — Two people, two editors, live (DESIGN §10: 10.2 the gate, 10.3 what people see, 10.4 Phase 4 "together" 4a–4d,
 * 10.5 Phase 5 all-or-nothing, 10.6 what is left, 10.7 his own devices; §3.11 the lines; §3.12 where they show; §11 undo).
 *
 * Two devices, Sam (a friend, Editor role) in Quick and Ezra (the owner), both in Beach day. Nine scripted moments (DESIGN §18
 * V6), each played for three releases: "Phases 2–3" (the gate: clips stay put while someone else can edit, ending with what the
 * gate prevents), "Phase 4" (together: clip time on the wire, a lease protects content, keep my frame / authorship / pre-flight,
 * the glide and "Sam moved N clips", undo puts back only its own layers' order, "This is me") and "Phase 5" (all-or-nothing).
 * Moment 9 is his own Mac + iPhone in one session: the owner's "Your phone can edit · clips stay put" + Options › Make it a
 * Viewer, and from Phase 4 the Share panel's "This is me (my other device)". The Mac is drawn as a narrow window (the app's
 * phone layout), because a scaled-down PC frame has unreadable words on his phone; the narration says so.
 *
 * Wide (the page at least 740 px): the two devices side by side. Narrow (his phone): one device at a time, full size, with two
 * tabs; each step shows the device where it happens, and a change that reaches the other device switches to it as it lands.
 * Both "On … phone" boxes stay visible under the device, and a tap on one shows that device.
 *
 * Both devices run VIS.engine: each side is its own E.editor (its own copy, as each device has); a change is cloned onto the
 * other copy when "it reaches" it. Every step is replayed from the start, so Back / dots / Next are exact. Ezra can flip his own
 * device to Quick or Full at any time. Every other control on the devices answers with a short "not part of this page" note.
 *
 * CSS is injected once (id v6-css), hub side under .v6, mock side under .v6 .fm, so index.html needs no extra <link>.
 */
(function () {
  'use strict';
  const VIS = window.VIS;
  if (!VIS || !VIS.register) return;
  const E = VIS.engine, el = VIS.el, esc = VIS.esc;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* private mode */ } return null; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const r2 = x => Math.round(x * 100) / 100;

  /* who is on each side. `word` is how a line on the OTHER device names this one (§3.11 whoWord). */
  const WHO_FRIEND = {
    sam: { name: 'Sam', ch: 'S', color: '#ff8a5b', head: 'Sam', tab: "Sam's phone", on: "On Sam's phone", chip: 'Sam', word: 'Sam' },
    ez: { name: 'Ezra', ch: 'E', color: '#93a9ff', head: 'You', tab: 'Your phone', on: 'On your phone', chip: 'Ezra', word: 'Ezra' }
  };
  const WHO_SELF = {
    sam: { name: 'Your phone', ch: 'E', color: '#6fd6a0', head: 'Your phone', tab: 'Your phone', on: 'On your phone', chip: 'Ezra (phone)', word: 'Your phone' },
    ez: { name: 'Your Mac', ch: 'E', color: '#93a9ff', head: 'Your Mac', tab: 'Your Mac', on: 'On your Mac', chip: 'Ezra (Mac)', word: 'The device that started sharing', mac: true }
  };
  const LAG = 750;                                  // the beat between a change on one device and the other
  const SPAN = 15.2;                                // seconds the timelines are drawn for (Beach day is 14.2 s)
  const LAYOUT = { quick: { stageH: 230, tlH: 221 }, full: { stageH: 150, tlH: 356 } };   // both devices end up ~658 px tall
  const TWO_AT = 740;                               // the page width from which both devices sit side by side at full size

  /* the two editor glyphs worn on a face (§10.3): Quick = one row of clips, Full = a row per layer */
  const GQ = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x=".6" y="3.4" width="3.3" height="5.2" rx=".9" fill="currentColor"/><rect x="4.35" y="3.4" width="3.3" height="5.2" rx=".9" fill="currentColor"/><rect x="8.1" y="3.4" width="3.3" height="5.2" rx=".9" fill="currentColor"/></svg>';
  const GF = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1.3" width="6.6" height="2.4" rx=".7" fill="currentColor"/><rect x="3" y="4.8" width="8" height="2.4" rx=".7" fill="currentColor"/><rect x="2" y="8.3" width="6" height="2.4" rx=".7" fill="currentColor"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const CHEV_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHEV_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor"/><rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor"/></svg>';
  const ICON_AGAIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M4.5 3.5v4.5H9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------ the pictures ------------------------------------------------ */
  /* Each Beach day clip is a small 9:16 scene (viewBox 90×160) with ONE thing that moves through the footage (the walker, the
     waves, the flag, the sun), so "the same frame" is something you can see. u = how far through the source, 0..1. */
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
    return '<path d="' + d + '" fill="#ffc6ab" stroke="#e0785c" stroke-width="2.6" stroke-linejoin="round"/>' + lines +
      '<path d="M35 80h20l-3 7H38z" fill="#e0785c"/>';
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
    const q = Math.round(clamp(u, 0, 1) * 48) / 48, mk = key + ':' + q;
    if (urlMemo.has(mk)) return urlMemo.get(mk);
    const vb = key === 'sticker' ? '0 0 90 90' : '0 0 90 160';
    const s = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" preserveAspectRatio="xMidYMid slice">' + SCENE[key](q) + '</svg>') + '")';
    urlMemo.set(mk, s);
    return s;
  }
  const srcU = (l, t) => ((l.trimStart || 0) + (t - l.start) * (l.speed || 1)) / (l.srcDur || l.duration || 1);
  /* VIS.thumb is swapped only for the length of one synchronous draw call, so no other page is affected */
  let kitThumb = VIS.thumb, thumbMode = 'strip', thumbT = 0;
  function myThumb(l) {
    const base = kitThumb(l);
    const key = l && (SCENE[l.id] ? l.id : (l.splitOf && SCENE[l.splitOf] ? l.splitOf : null));
    if (!key) return base;
    if (key === 'sticker') return sceneURL('sticker', 0) + ' center / contain no-repeat';
    if (thumbMode === 'stage') return sceneURL(key, srcU(l, thumbT)) + ' center / cover no-repeat, ' + base;
    return sceneURL(key, .45) + ' left center / auto 100% repeat-x, ' + base;
  }
  function withThumbs(mode, t, fn) {
    if (VIS.thumb !== myThumb) kitThumb = VIS.thumb;
    const prev = VIS.thumb; thumbMode = mode; thumbT = t; VIS.thumb = myThumb;
    try { return fn(); } finally { VIS.thumb = prev; }
  }

  /* ------------------------------------------------------------ document helpers ------------------------------------------- */
  const lay = (doc, id) => doc.layers.find(l => l.id === id);
  const other = side => side === 'sam' ? 'ez' : 'sam';
  function shiftLayer(l, d) { if (!l) return; l.start += d; E.kfLists(l).forEach(a => a.forEach(k => { k.t += d; })); }
  function movedClips(before, after) {
    let n = 0;
    after.layers.forEach(l => { if (!E.hasFlag(l, 'main') || l.audioOnly) return; const b = lay(before, l.id); if (b && Math.abs(b.start - l.start) > 1e-6) n++; });
    return n;
  }
  /* §10.4 4c: a delete keeps another person's items as Stay put, IN THE SAME STEP (so Undo takes the flag off again) */
  function runKeeping(ed, keepIds, name, args) {
    const before = JSON.stringify(ed.doc);
    keepIds.forEach(id => { const l = lay(ed.doc, id); if (l) E.setFlag(l, 'stay', true); });
    const r = ed.run(name, args);
    if (r.ok) ed.undoStack[ed.undoStack.length - 1].json = before; else ed.doc = JSON.parse(before);
    return r;
  }
  function both(S, fn) { fn(S.sam.ed.doc); fn(S.ez.ed.doc); }
  /* A batch from one device lands on the other; the line it gets is counted, not typed (4d). `silent`: another line says it. */
  function reaches(S, to, silent) {
    const from = other(to), before = S[to].ed.doc;
    S[to].ed.doc = E.clone(S[from].ed.doc);
    const n = movedClips(before, S[to].ed.doc);
    if (n && !silent) S[to].msg = { text: S.who[from].word + ' moved ' + n + (n === 1 ? ' clip' : ' clips'), quiet: true };
    return n;
  }
  function setText(doc, text) { const l = lay(doc, 'title'); if (l) { l.text = text; l.name = text; } }
  function setCue(doc, from, to) { const c = lay(doc, 'cap'); const q = c && c.captions.find(x => x.text === from); if (q) q.text = to; }
  function setOpacity(doc, v) { const l = lay(doc, 'c2'); if (!l) return; l.kf = l.kf || {}; if (l.kf.opacity && l.kf.opacity.length) l.kf.opacity[0].v = v; else l.kf.opacity = [{ t: 5.5, v }]; }
  function addZoomKey(doc) { const l = lay(doc, 'c3'); if (!l) return; l.kf = l.kf || {}; l.kf.scale = [{ t: 8.4, v: 1.25 }]; }
  const GATE = { text: 'Clips stay put while you both edit', btns: ['Open in Full'] };            // a guest (§3.11 live, guest)
  const GATE_OWNER = { text: 'Sam can edit · clips stay put', btns: ['Options ›'] };               // the owner, one editor
  /* a title Sam made on Sandcastle (moments 8 and 9), and the one she adds in moment 7 */
  const SAM_TITLE = { id: 'stitle', type: 'text', name: 'Castle for Mia', text: 'Castle for Mia', start: 7.5, duration: 1.9, transform: { y: .62 } };
  const FUN_TITLE = { id: 'stitle', type: 'text', name: 'So fun!', text: 'So fun!', start: 7.4, duration: 2.0, transform: { y: .62 } };
  const STICKER = () => E.clone(VIS.sample('beach').layers.find(l => l.id === 'sticker'));

  /* ------------------------------------------------------------ the nine moments ------------------------------------------- */
  /* Each step: say (the narration), by (who acts: 'sam' | 'ez'), lag (the other device gets it a beat later), look (which
     device a narrow screen shows: one side, or [first, then] when the change reaches the other one), hypo (the "without the
     stop" step), anims, run(S). Internal codes in result checks ('4a'…'5') only pick the "Phase 4 / Phase 5" tag. */
  const HELLO = "You're both in Beach day: Sam in Quick on her phone, you in Full. Each face shows which editor that person is in.";
  const SAME4 = 'Phase 5 changes nothing in this moment. It is about undo and two moves at the same time (moment 5).';
  const SAME5 = 'Phase 5 changes nothing in this moment.';
  const CASES = [
    {
      id: 'trim', title: 'Sam trims', sub: 'you animate the next clip', open: 'text',
      sam: { t: 5.2, sel: 'c2' }, ez: { t: 8.4, sel: 'c3', tool: { kind: 'kf', label: 'Zoom', val: .3, key: false } },
      steps(p) {
        const s = [
          { say: HELLO, pulse: true, run() {} },
          { say: 'You add a zoom keyframe to Sandcastle, right where the flag comes up.', by: 'ez', lag: true,
            anims: [{ side: 'ez', kind: 'slider', from: .3, to: .7 }],
            run(S) { both(S, addZoomKey); S.ez.tool.key = true; S.ez.tool.val = .7; if (S.phase >= 4) S.sam.hold = { id: 'c3', kind: 'kf' }; } }
        ];
        if (p < 4) return s.concat([
          { say: 'Sam drags the end of Waves to make it 1 s shorter. Quick stops her straight away and says why. Nothing moves.', by: 'sam',
            run(S) { S.sam.shake = 'c2'; S.sam.msg = GATE; } },
          { say: "Without that stop: Sam's trim would also send her old copy of Sandcastle's animation. Your keyframe would vanish on both phones, and nobody would be told.",
            hypo: true, by: 'sam', lag: true, look: ['sam', 'ez'],
            run(S) {
              const d = E.clone(S.sam.ed.doc); delete lay(d, 'c3').kf;         // her copy, from before your key arrived
              const ed = E.editor(d); ed.run('trimTail', { id: 'c2', dur: 2.7 });
              S.sam.ed.doc = E.clone(ed.doc); S.ez.ed.doc = E.clone(ed.doc);
              S.ez.tool.key = false; S.ez.marks = [{ on: 'c3', at: 7.4, kind: 'lost' }];
              S.ez.note = 'Your keyframe is gone. No message.'; S.sam.note = 'Nothing tells her anything went wrong.';
            } }
        ]);
        return s.concat([
          { say: 'Sam drags the end of Waves to make it 1 s shorter. On her phone the clips after it close up.', by: 'sam',
            run(S) { const r = S.sam.ed.run('trimTail', { id: 'c2', dur: 2.7 }); if (r.ok) S.sam.t = r.time; } },
          { say: "It reaches you. Sandcastle and Sunset slide 1 s earlier, in Sam's colour. Your keyframe and your playhead moved with Sandcastle, so your picture didn't jump.",
            by: 'sam', look: 'ez',
            run(S) { reaches(S, 'ez'); S.ez.t = r2(S.ez.t - 1); S.ez.kmf = true; S.ez.marks = [{ on: 'c3', at: 7.4, kind: 'kept' }]; } },
          { say: "Sam tries to speed up Sandcastle while you're still animating it. That waits, and her phone says who is on it.", by: 'sam',
            run(S) { S.sam.sel = 'c3'; S.sam.hl = 'speed'; S.sam.msg = { text: 'Ezra is animating this clip · try again soon' }; } }
        ]);
      },
      result(p) {
        if (p < 4) return { checks: [[1, '', 'Your keyframe is safe. Nothing moved on either phone.'], [1, '', 'Sam is told why in one line, with Open in Full beside it.'],
          [0, '', "Sam can't trim or move clips while you're both editing. Looks, text, captions and sound still work."]],
          stop: 'your keyframe would be lost on both phones, with no message.' };
        return { checks: [[1, '4a', 'Your keyframe moved with Sandcastle and stayed on the flag.'], [1, '4c', "Your playhead moved with it, so your picture didn't jump."],
          [1, '4d', "You saw it happen: an outline in Sam's colour and “Sam moved 2 clips”."], [1, '4c', 'A change that would rewrite your animation waits, and Sam is told who is on it.']],
          note: p === 5 ? SAME4 : '' };
      }
    },
    {
      id: 'crop', title: 'Sam deletes', sub: 'you crop a later clip', open: 'text',
      sam: { t: 1.6, sel: 'c1', hold: { id: 'c4', kind: 'lease' } }, ez: { t: 12.0, sel: 'c4', tool: { kind: 'crop' } },
      steps(p) {
        const s = [{ say: "You open Crop on Sunset. While it's open, Sunset is yours: on Sam's phone it wears your colour.", pulse: true, look: 'ez', run() {} }];
        if (p < 4) return s.concat([
          { say: 'Sam taps Delete on Arriving, the first clip. Quick stops her straight away and says why.', by: 'sam',
            run(S) { S.sam.hl = 'delete'; S.sam.msg = GATE; } },
          { say: "Without that stop: Sunset is yours while you crop, so it couldn't move. Everything before it would slide 3.4 s earlier and leave a hole nobody asked for.",
            hypo: true, by: 'sam', lag: true, look: ['sam', 'ez'],
            run(S) {
              const orig = E.clone(S.sam.ed.doc), ed = E.editor(orig);
              ed.run('deleteClip', { id: 'c1' });
              const d = ed.doc, c4 = lay(d, 'c4'); shiftLayer(c4, lay(orig, 'c4').start - c4.start);
              const song = lay(d, 'song'); Object.assign(song, E.clone(lay(orig, 'song'))); d.project.duration = orig.project.duration;
              S.sam.ed.doc = E.clone(d); S.ez.ed.doc = E.clone(d); S.sam.sel = null;
              S.sam.note = 'A 3.4 s hole before Sunset.'; S.ez.note = 'Sunset stayed; the rest moved. No message.';
            } }
        ]);
        return s.concat([
          { say: 'Sam deletes Arriving. On her phone everything after it slides 3.4 s earlier, Sunset too.', by: 'sam',
            run(S) { const r = S.sam.ed.run('deleteClip', { id: 'c1' }); if (r.ok) { S.sam.t = 1.2; S.sam.sel = null; } } },
          { say: "It reaches you. Sunset slides too, and Crop stays open: holding a clip protects what's in it, not where it sits. Your playhead moved with it.",
            by: 'sam', look: 'ez', run(S) { reaches(S, 'ez'); S.ez.t = r2(S.ez.t - 3.4); S.ez.kmf = true; } },
          { say: "Sam tries to trim Sunset, the clip you're cropping. That waits, and her phone says who is on it.", by: 'sam',
            run(S) { S.sam.sel = 'c4'; S.sam.shake = 'c4'; S.sam.msg = { text: 'Ezra is editing ‘Clip 3’ · try again soon' }; } }
        ]);
      },
      result(p) {
        if (p < 4) return { checks: [[1, '', 'Your crop is safe. Nothing moved.'], [1, '', 'Sam is told why, in one line.'],
          [0, '', "Sam can't delete a clip while you're both editing."]], stop: 'a hole would open before Sunset that nobody asked for.' };
        return { checks: [[1, '4b', 'Sunset slid 3.4 s even though you were holding it.'], [1, '4c', "Crop stayed open, and your picture didn't jump."],
          [1, '4d', '“Sam moved 3 clips”, in her colour.'], [1, '4c', "A change to the clip you're holding waits, and Sam is told who is on it."]],
          note: p === 5 ? SAME4 : '' };
      }
    },
    {
      id: 'title', title: 'Sam deletes', sub: 'you type the title on it', open: 'text',
      sam: { t: 5.0, sel: 'c2', hold: { id: 'title', kind: 'lease' } }, ez: { t: 4.6, sel: 'title', tool: { kind: 'text', text: 'Beach day!' } },
      steps(p) {
        const s = [
          { say: "You're changing the title on Waves. While you type, the title is yours: on Sam's phone it wears your colour.", pulse: true, look: 'ez', run() {} },
          { say: 'You type “Beach day with Mia!”. The words appear on Sam\'s phone as you type.', by: 'ez', lag: true,
            anims: [{ side: 'ez', kind: 'type', from: 'Beach day!', to: 'Beach day with Mia!' }, { side: 'sam', kind: 'type', from: 'Beach day!', to: 'Beach day with Mia!' }],
            run(S) { both(S, d => setText(d, 'Beach day with Mia!')); S.ez.tool.text = 'Beach day with Mia!'; } }
        ];
        if (p < 4) return s.concat([
          { say: 'Sam taps Delete on Waves. Quick stops her straight away and says why.', by: 'sam',
            run(S) { S.sam.hl = 'delete'; S.sam.msg = GATE; } },
          { say: "Without that stop: the title rides on Waves, so Sam's delete would take it too, words and all, while you're still typing.",
            hypo: true, by: 'sam', lag: true, look: ['sam', 'ez'],
            run(S) {
              S.sam.ed.run('deleteClip', { id: 'c2' }); S.ez.ed.doc = E.clone(S.sam.ed.doc);
              S.sam.sel = null; S.sam.hold = null; S.ez.sel = null; S.ez.tool.gone = true;
              S.ez.note = 'Your title is gone, mid-sentence.'; S.sam.note = 'Nothing tells her the title was yours.';
            } }
        ]);
        return s.concat([
          { say: "Sam deletes Waves. The title is yours, so it isn't deleted: it stays where it is, set to Stay put. Her phone says so.", by: 'sam',
            run(S) { const r = runKeeping(S.sam.ed, ['title'], 'deleteClip', { id: 'c2' }); if (r.ok) { S.sam.sel = null; S.sam.t = 4.6; }
              S.sam.msg = { text: "Deleted clip · kept Ezra's title", btns: ['Undo', 'Show'], show: 'title' }; } },
          { say: "You're told, with a button to find it, and your typing is never interrupted. The title now sits over Sandcastle.", by: 'sam', look: 'ez',
            run(S) { S.ez.ed.doc = E.clone(S.sam.ed.doc); S.ez.msg = { text: 'Sam deleted a clip — your title ‘Beach day with…’ was kept (now Stay put)', btns: ['Show'], show: 'title' }; } },
          { say: 'You keep typing: “Beach day with Mia and Sam!”', by: 'ez', lag: true,
            anims: [{ side: 'ez', kind: 'type', from: 'Beach day with Mia!', to: 'Beach day with Mia and Sam!' }, { side: 'sam', kind: 'type', from: 'Beach day with Mia!', to: 'Beach day with Mia and Sam!' }],
            run(S) { both(S, d => setText(d, 'Beach day with Mia and Sam!')); S.ez.tool.text = 'Beach day with Mia and Sam!'; } }
        ]);
      },
      result(p) {
        if (p < 4) return { checks: [[1, '', 'Your title and your words are safe.'], [1, '', 'Sam is told why.'],
          [0, '', "Sam can't delete a clip while you're both editing."]], stop: 'your title would be deleted while you were typing it.' };
        return { checks: [[1, '4c', "Sam's delete took only the clip. Your title and your words were kept."], [1, '4d', 'Both of you were told, each with a button to find the title.'],
          [1, '4b', 'Your typing was never interrupted.']], note: p === 5 ? SAME4 : '' };
      }
    },
    {
      id: 'fade', title: 'Sam moves a clip', sub: 'you drag a fade', open: 'text',
      sam: { t: 11.5, sel: 'c4' }, ez: { t: 5.5, sel: 'c2', tool: { kind: 'opacity', val: 1 } },
      steps(p) {
        const s = [
          { say: 'You pick Waves in Full and open its opacity. Sam is looking at Sunset on her phone.', pulse: true, look: 'ez', run() {} },
          { say: "You drag Waves' opacity down to 40%. That makes a keyframe at this moment of Waves.", by: 'ez', lag: true,
            anims: [{ side: 'ez', kind: 'slider', from: 1, to: .4 }],
            run(S) { both(S, d => setOpacity(d, .4)); S.ez.tool.val = .4; if (S.phase >= 4) S.sam.hold = { id: 'c2', kind: 'kf' }; } }
        ];
        if (p < 4) return s.concat([
          { say: 'Sam holds Sunset to drag it to the front. Quick stops her straight away and says why.', by: 'sam',
            run(S) { S.sam.shake = 'c4'; S.sam.msg = GATE; } },
          { say: "Without that stop: Sam's move would send her own copy of Waves, fade and all. Your 40% would jump back to 100% on both phones.",
            hypo: true, by: 'sam', lag: true, look: ['sam', 'ez'],
            run(S) {
              const d = E.clone(S.sam.ed.doc); delete lay(d, 'c2').kf.opacity;   // her copy, from before your drag arrived
              const ed = E.editor(d); ed.run('reorder', { id: 'c4', to: 0 });
              S.sam.ed.doc = E.clone(ed.doc); S.ez.ed.doc = E.clone(ed.doc); S.sam.t = 1.5;
              S.ez.tool.val = 1; S.ez.marks = [{ on: 'c2', at: 9.35, kind: 'lost' }];
              S.ez.note = 'Your fade snapped back to 100%. No message.'; S.sam.note = 'Nothing tells her.';
            } }
        ]);
        return s.concat([
          { say: 'Sam holds Sunset and drags it toward the front. On your phone Sunset gets her outline, marked “Sam · clip row”.', by: 'sam', look: ['sam', 'ez'],
            run(S) { S.sam.drag = { id: 'c4', x: .5 }; S.ez.arr = { ids: ['c4'] }; S.ez.note = 'Sunset has Sam\'s outline, marked “Sam · clip row”.'; } },
          { say: 'She lets go. On her phone the clips make room for Sunset.', by: 'sam',
            run(S) { const r = S.sam.ed.run('reorder', { id: 'c4', to: 0 }); if (r.ok) S.sam.t = 1.5; S.ez.arr = { ids: ['c4'] }; } },
          { say: "It reaches you. The four clips move, in Sam's colour: “Sam moved 4 clips”. Your fade stayed on the same moment of Waves, and your playhead moved with it.",
            by: 'sam', look: 'ez', run(S) { reaches(S, 'ez'); S.ez.t = r2(S.ez.t + 3.85); S.ez.kmf = true; S.ez.marks = [{ on: 'c2', at: 9.35, kind: 'kept' }]; } },
          { say: 'You keep dragging, down to 25%. Nothing you did was lost.', by: 'ez', lag: true,
            anims: [{ side: 'ez', kind: 'slider', from: .4, to: .25 }],
            run(S) { both(S, d => setOpacity(d, .25)); S.ez.tool.val = .25; } }
        ]);
      },
      result(p) {
        if (p < 4) return { checks: [[1, '', 'Your fade is safe.'], [1, '', 'Sam is told why.'],
          [0, '', "Sam can't move clips while you're both editing."]], stop: 'your fade would jump back to 100%.' };
        return { checks: [[1, '4a', 'You saw it coming: Sunset had Sam\'s outline while she dragged.'], [1, '4a', 'Your fade stayed on the same moment of Waves.'],
          [1, '4c', "Your playhead moved with Waves, so your picture didn't jump."], [1, '4d', '“Sam moved 4 clips”.']], note: p === 5 ? SAME4 : '' };
      }
    },
    {
      id: 'undo', title: 'Sam undoes', sub: 'after you moved a clip', open: 'overlay',
      sam: { t: 8.0, sel: 'c3' }, ez: { t: 12.0, sel: 'c4', tool: null },
      steps(p) {
        const s = [{ say: "You're both in Beach day: Sam in Quick, you in Full. Sam is looking at Sandcastle.", pulse: true, look: 'sam', run() {} }];
        const move = { say: p < 4 ? "You drag Sunset 1 s later in Full. Moving one clip in Full still works, and Sam's phone shows the new 1 s gap."
                                   : "You drag Sunset 1 s later in Full. On Sam's phone it glides over in your colour, and a 1 s gap appears.",
          by: 'ez', lag: true, look: ['ez', 'sam'], run(S) { both(S, d => shiftLayer(lay(d, 'c4'), 1)); S.ez.sel = 'c4'; } };
        if (p < 4) return s.concat([
          { say: 'Sam taps Delete on Sandcastle. Quick stops her and says why. An undo that would move clips is held the same way.', by: 'sam',
            run(S) { S.sam.hl = 'delete'; S.sam.msg = GATE; } },
          move,
          { say: "Without that stop: Sam deletes Sandcastle, then taps Undo. Her undo would put back her own copy of every clip, and your move of Sunset would quietly disappear.",
            hypo: true, by: 'sam', lag: true, look: ['sam', 'ez'],
            run(S) {
              const d = VIS.sample('beach'); S.sam.ed.doc = E.clone(d); S.ez.ed.doc = E.clone(d);
              S.ez.marks = [{ on: 'c4', at: 11.35, kind: 'lost' }];
              S.ez.note = 'Sunset is back where it was. Your move is gone. No message.'; S.sam.note = 'Nothing tells her.';
            } }
        ]);
        s.push(
          { say: 'Sam deletes Sandcastle, and Sunset slides into its place. The shell sticker is yours, so it stays, set to Stay put.', by: 'sam', lag: true, look: ['sam', 'ez'],
            run(S) {
              const r = runKeeping(S.sam.ed, ['sticker'], 'deleteClip', { id: 'c3' });
              if (r.ok) { S.sam.sel = null; S.sam.t = 8.6; }
              S.sam.msg = { text: "Deleted clip · kept Ezra's sticker", btns: ['Undo', 'Show'], show: 'sticker' };
              S.ez.ed.doc = E.clone(S.sam.ed.doc); S.ez.t = r2(S.ez.t - 3.25); S.ez.kmf = true;   // you had Sunset picked
              S.ez.msg = { text: 'Sam deleted a clip — your sticker was kept (now Stay put)', btns: ['Show'], show: 'sticker' };
            } },
          move);
        if (p === 4) s.push(
          { say: 'Sam taps Undo. Sandcastle and the sticker come back, but you moved Sunset since, so it stays where you put it. The clips now overlap, and a chip shows it.',
            by: 'sam', lag: true, look: ['sam', 'ez'],
            run(S) {
              const ed = S.sam.ed, now = lay(ed.doc, 'c4').start;
              ed.undo();
              const c4 = lay(ed.doc, 'c4'); shiftLayer(c4, now - c4.start);        // the soft undo (§11): skip what Ezra changed
              S.sam.msg = { text: 'Undid, except what Ezra changed', btns: ['Close gaps'] };
              S.ez.ed.doc = E.clone(ed.doc);
            } });
        else s.push(
          { say: 'Sam taps Undo. You moved Sunset since, so the whole undo is refused instead of half done. Nothing moves, and her phone says why.', by: 'sam',
            run(S) { S.sam.msg = { text: "Can't undo — Ezra changed it since" }; } });
        return s;
      },
      result(p) {
        if (p < 4) return { checks: [[1, '', 'Your move of Sunset stands. Moving one clip in Full still works.'], [1, '', 'Sam is told why.'],
          [0, '', "Sam can't delete, or undo a clip move, while you're both editing."]], stop: 'your move of Sunset would quietly disappear.' };
        if (p === 4) return { checks: [[1, '4c', 'Your sticker was kept when Sam deleted its clip.'], [1, '4d', "Your move glided onto Sam's phone, in your colour."],
          [0, '', 'Undo came out half done: Sunset now overlaps Sandcastle. A chip shows it, and one tap fixes it. Phase 5 fixes this.']] };
        return { checks: [[1, '4c', 'Your sticker was kept when Sam deleted its clip.'], [1, '4d', "Your move glided onto Sam's phone, in your colour."],
          [1, '5', 'No half-done undo: it is refused whole, and Sam is told why.'], [1, '', 'Your move of Sunset stands.']] };
      }
    },
    {
      /* DESIGN §10.4 4a′ (captions keyed) + 4b + 4c's caption clause: before them, the text editor's lease holds the WHOLE
         caption track for as long as she types, so the owner's ripple would land without it. */
      id: 'captions', title: 'Sam types captions', sub: 'you delete and trim earlier clips', open: 'captions', ezEd: 'quick',
      sam: { t: 8.0, sel: 'cap', tool: { kind: 'text', label: 'Cc', text: 'Castle time' } },
      ez: { t: 1.6, sel: 'c1', hold: { id: 'cap', kind: 'lease', cue: 'Castle time' } },
      steps(p) {
        const s = [{ say: "Sam has been typing captions on her phone for a few minutes. She's on “Castle time”, over Sandcastle. You're in Quick too, on Arriving. On your phone her caption wears her colour.",
          pulse: true, look: 'sam', run() {} }];
        if (p < 4) return s.concat([
          { say: 'You tap Delete on Arriving. Quick stops you and says why: Sam can edit too, so clips stay put.', by: 'ez',
            run(S) { S.ez.hl = 'delete'; S.ez.msg = GATE_OWNER; } },
          { say: "Without that stop: Sam has the captions open, so they couldn't move. The clips would slide 3.4 s earlier without them, and every caption would sit over the wrong clip.",
            hypo: true, by: 'ez', lag: true, look: ['ez', 'sam'],
            run(S) {
              const orig = E.clone(S.ez.ed.doc), ed = E.editor(E.clone(orig));
              ed.run('deleteClip', { id: 'c1' });
              Object.assign(lay(ed.doc, 'cap'), E.clone(lay(orig, 'cap')));        // her captions were refused; the clips moved
              S.ez.ed.doc = E.clone(ed.doc); S.sam.ed.doc = E.clone(ed.doc); S.ez.sel = null;
              S.ez.note = 'The clips moved; the captions did not. No message.';
              S.sam.note = '“Castle time” is now over Sunset. Nothing tells her.';
            } }
        ]);
        return s.concat([
          { say: 'You delete Arriving. On your phone the clips after it close up, 3.4 s earlier.', by: 'ez',
            run(S) { const r = S.ez.ed.run('deleteClip', { id: 'c1' }); if (r.ok) { S.ez.sel = null; S.ez.t = 0.2; } } },
          { say: "It reaches Sam. Her caption slides with Sandcastle, words untouched, and her playhead moves with it, so her picture doesn't jump. She keeps typing.",
            by: 'ez', look: 'sam', anims: [{ side: 'sam', kind: 'type', from: 'Castle time', to: 'Castle time with Mia' }],
            run(S) { reaches(S, 'sam'); S.sam.t = r2(S.sam.t - 3.4); S.sam.kmf = true; both(S, d => setCue(d, 'Castle time', 'Castle time with Mia'));
              S.sam.tool.text = 'Castle time with Mia'; S.ez.hold.cue = 'Castle time with Mia'; } },
          { say: "You trim the end of Waves 1 s shorter. Sam's caption slides again, and her typing is never interrupted.", by: 'ez', lag: true, look: ['ez', 'sam'],
            anims: [{ side: 'sam', kind: 'type', from: 'Castle time with Mia', to: 'Castle time with Mia & Sam' }],
            run(S) { S.ez.ed.run('trimTail', { id: 'c2', dur: 2.7 }); reaches(S, 'sam'); S.sam.t = r2(S.sam.t - 1); S.sam.kmf = true;
              both(S, d => setCue(d, 'Castle time with Mia', 'Castle time with Mia & Sam')); S.sam.tool.text = 'Castle time with Mia & Sam'; S.ez.hold.cue = S.sam.tool.text; } },
          { say: "You try to delete Sandcastle, the clip under the caption Sam is typing. That would delete her caption, so it waits, and your phone says who is on it.", by: 'ez',
            run(S) { S.ez.sel = 'c3'; S.ez.hl = 'delete'; S.ez.shake = 'c3'; S.ez.msg = { text: 'Sam is typing captions · try again soon' }; } }
        ]);
      },
      result(p) {
        if (p < 4) return { checks: [[1, '', "Sam's captions and her words are safe."], [1, '', 'You are told why, in one line, with Options › beside it.'],
          [0, '', "While Sam can edit, you can't delete or trim clips. For as long as she types, her captions hold still."]],
          stop: 'the clips would move without the captions, and every caption would sit over the wrong clip.' };
        return { checks: [[1, '4b', 'You deleted and trimmed while Sam typed. Her caption slid with its clip.'], [1, '4c', "Her words were never touched, and her picture didn't jump."],
          [1, '4c', 'Only a change that would delete her caption waits, and you are told who is on it.']], note: p === 5 ? SAME5 : '' };
      }
    },
    {
      /* DESIGN §11 "Undo restores only its own layers' order" (ships with 4a): today an undo restates the whole stack order, so
         a title a friend added since drops to the very bottom, behind every clip. */
      id: 'undotitle', title: 'Sam adds a title', sub: 'then you undo', open: 'text',
      sam: { t: 8.2, sel: null }, ez: { t: 8.2, sel: 'sticker', tool: null },
      steps(p) {
        return [
          { say: "You're in Full, Sam is in Quick, both on Sandcastle. You've picked the shell sticker.", pulse: true, look: 'ez', run() {} },
          { say: 'You delete the sticker.', by: 'ez', lag: true, look: ['ez', 'sam'],
            run(S) { both(S, d => { d.layers = d.layers.filter(l => l.id !== 'sticker'); }); S.ez.sel = null; } },
          { say: 'Sam adds a title over Sandcastle and types “So fun!”. It lands on top of the picture on both phones.', by: 'sam', lag: true, look: ['sam', 'ez'],
            anims: [{ side: 'sam', kind: 'type', from: '', to: 'So fun!' }],
            run(S) { both(S, d => d.layers.unshift(E.clone(FUN_TITLE))); S.sam.sel = 'stitle'; S.sam.tool = { kind: 'text', text: 'So fun!' }; } },
          p < 4
            ? { say: "You tap Undo to bring the sticker back. It comes back, but Sam's title drops to the very bottom, behind every clip. It vanishes from both pictures, and nobody is told.",
                by: 'ez', lag: true, look: ['ez', 'sam'],
                run(S) {
                  both(S, d => {
                    const byId = new Map(d.layers.map(l => [l.id, l]));
                    const out = VIS.sample('beach').layers.map(b => b.id === 'sticker' ? STICKER() : byId.get(b.id)).filter(Boolean);
                    d.layers.forEach(l => { if (!out.includes(l)) out.push(l); });      // the whole old order restated: her title ends up last
                    d.layers = out;
                  });
                  S.ez.sel = 'sticker'; S.ez.press = 'undo'; S.sam.tool = null;
                  S.ez.marks = [{ on: 'stitle', at: 8.3, kind: 'lost' }]; S.sam.marks = [{ on: 'stitle', at: 8.3, kind: 'lost' }];
                  S.ez.note = "Sam's title is now under every clip, so you can't see it. No message.";
                  S.sam.note = 'Her title vanished from the picture. Nothing tells her why.';
                } }
            : { say: "You tap Undo to bring the sticker back. Only the sticker goes back to its place. Sam's title stays on top, where she put it.",
                by: 'ez', lag: true, look: ['ez', 'sam'],
                run(S) {
                  both(S, d => { const i = d.layers.findIndex(l => l.id === 'title'); d.layers.splice(i + 1, 0, STICKER()); });
                  S.ez.sel = 'sticker'; S.ez.press = 'undo'; S.sam.tool = null;
                } }
        ];
      },
      result(p) {
        if (p < 4) return { checks: [[1, '', 'The sticker came back.'],
          [0, '', "Sam's title dropped behind every clip. It is gone from both pictures, and nobody was told."]],
          note: "This happens in today's app too. Phase 4 changes Undo so it puts back only your own things." };
        return { checks: [[1, '4a', 'The sticker came back to its own place.'], [1, '4a', "Sam's title stayed on top, where she put it. Undo puts back only your own things."]],
          note: p === 5 ? SAME5 : '' };
      }
    },
    {
      /* DESIGN §10.4 4c item 3: the owner's delete keeps an item a guest made (Stay put), and both are told (4d). */
      id: 'keeptitle', title: 'You delete a clip', sub: "that carries Sam's title", open: 'text', ezEd: 'quick',
      setup(d) { d.layers.unshift(E.clone(SAM_TITLE)); },
      sam: { t: 8.2, sel: null }, ez: { t: 8.2, sel: 'c3' },
      steps(p) {
        const s = [{ say: "Earlier, Sam put a title on Sandcastle: “Castle for Mia”. The shell sticker on it is yours. You're both in Quick.", pulse: true, look: 'ez', run() {} }];
        if (p < 4) return s.concat([
          { say: 'You tap Delete on Sandcastle. Quick stops you and says why: Sam can edit too, so clips stay put.', by: 'ez',
            run(S) { S.ez.hl = 'delete'; S.ez.msg = GATE_OWNER; } },
          { say: "Without that stop: what's on a clip goes with it, so your delete would take Sam's title too. It would just vanish from her phone.",
            hypo: true, by: 'ez', lag: true, look: ['ez', 'sam'],
            run(S) {
              S.ez.ed.run('deleteClip', { id: 'c3' }); S.sam.ed.doc = E.clone(S.ez.ed.doc); S.ez.sel = null;
              S.ez.note = "Sam's title went with the clip. Nothing told you it was hers."; S.sam.note = 'Her title is gone. No message.';
            } }
        ]);
        return s.concat([
          { say: "You delete Sandcastle. Your sticker goes with it, as it does when you edit alone. Sam's title is hers, so it stays where it was, set to Stay put.", by: 'ez',
            run(S) { const r = runKeeping(S.ez.ed, ['stitle'], 'deleteClip', { id: 'c3' }); if (r.ok) S.ez.sel = null;
              S.ez.msg = { text: "Deleted clip · kept Sam's title", btns: ['Undo', 'Show'], show: 'stitle' }; } },
          { say: 'It reaches Sam. Sunset glides into place, and her phone says her title was kept, with a button to find it.', by: 'ez', look: 'sam',
            run(S) { reaches(S, 'sam', true); S.sam.msg = { text: 'Ezra deleted a clip — your title ‘Castle for Mia’ was kept (now Stay put)', btns: ['Show'], show: 'stitle' }; } },
          { say: "Sam taps Show. Her title is picked, now over Sunset. It's still hers, to move or delete.", by: 'sam',
            run(S) { S.sam.sel = 'stitle'; } }
        ]);
      },
      result(p) {
        if (p < 4) return { checks: [[1, '', "Sam's title is safe. Nothing moved."], [1, '', 'You are told why, with Options › beside it.'],
          [0, '', "While Sam can edit, you can't delete a clip."]], stop: "your delete would take Sam's title with it, and she would never know why." };
        return { checks: [[1, '4c', "Sam's title was kept, not deleted with the clip."], [1, '4c', 'Your own sticker went with the clip, as it does when you edit alone.'],
          [1, '4d', 'Both of you were told, and Show finds the title.']], note: p === 5 ? SAME5 : '' };
      }
    },
    {
      /* DESIGN §10.7 his own Mac and iPhone; §3.11 the owner's `live` line with whoWord ("your phone") and Options › Make it a
         Viewer; §10.4 4c item 4, "This is me (my other device)". The Mac is the owner (it started sharing). */
      id: 'mine', title: 'Your phone and Mac', sub: 'both in one session', open: 'text', ezEd: 'quick', who: WHO_SELF,
      sam: { t: 8.2, sel: null }, ez: { t: 8.2, sel: 'c3' },
      steps(p) {
        const intro = 'Your Mac started sharing Beach day, and you opened the link on your phone. The link joins as an Editor, so your phone can edit too. Both are in Quick.';
        if (p < 4) return [
          { say: intro, pulse: true, look: 'ez', run() {} },
          { say: 'On your Mac you tap Delete on Sandcastle. Quick stops you, because your phone could be moving clips at the same moment. The line calls it “your phone”, not “Ezra”.', by: 'ez',
            run(S) { S.ez.hl = 'delete'; S.ez.msg = { text: 'Your phone can edit · clips stay put', btns: ['Options ›'] }; } },
          { say: 'You tap Options ›. Two choices: Make it a Viewer, or Open in Full.', by: 'ez',
            run(S) { S.ez.msg = { text: 'Your phone can edit · clips stay put', btns: ['Options ›'] }; S.ez.press = 'Options ›'; S.ez.menu = ['Make it a Viewer', 'Open in Full']; } },
          { say: 'You tap Make it a Viewer. Your phone can now only watch. It says “View only”, with Ask to edit if you want it back.', by: 'ez', lag: true, look: ['ez', 'sam'],
            run(S) { S.sam.viewer = true; S.sam.msg = { text: 'View only', btns: ['Ask to edit'] }; } },
          { say: 'Now your Mac can move clips again. You delete Sandcastle: your sticker goes with it, and the clips close up on both screens.', by: 'ez', lag: true, look: ['ez', 'sam'],
            run(S) { const r = S.ez.ed.run('deleteClip', { id: 'c3' }); if (r.ok) S.ez.sel = null; S.sam.ed.doc = E.clone(S.ez.ed.doc);
              S.ez.msg = { text: r.say || 'Deleted clip', btns: ['Undo'] }; S.sam.msg = { text: 'View only', btns: ['Ask to edit'] }; } }
        ];
        return [
          { say: intro + ' From Phase 4, moving clips works while both are online, so nothing stops you.', pulse: true, look: 'ez', run() {} },
          { say: 'On your phone you add a title over Sandcastle, “Castle for Mia”, and tap Done.', by: 'sam', lag: true, look: ['sam', 'ez'],
            anims: [{ side: 'sam', kind: 'type', from: '', to: 'Castle for Mia' }],
            run(S) { both(S, d => d.layers.unshift(E.clone(SAM_TITLE))); S.sam.sel = 'stitle'; S.sam.tool = { kind: 'text', text: 'Castle for Mia' }; } },
          { say: 'On your Mac you delete Sandcastle. Your phone still counts as someone else, so its title is kept, set to Stay put, and both screens say so.', by: 'ez', lag: true, look: ['ez', 'sam'],
            run(S) {
              const r = runKeeping(S.ez.ed, ['stitle'], 'deleteClip', { id: 'c3' }); if (r.ok) S.ez.sel = null;
              S.ez.msg = { text: "Deleted clip · kept your phone's title", btns: ['Undo', 'Show'], show: 'stitle' };
              reaches(S, 'sam', true); S.sam.tool = null; S.sam.sel = null;
              S.sam.msg = { text: 'The device that started sharing deleted a clip — your title ‘Castle for Mia’ was kept (now Stay put)', btns: ['Show'], show: 'stitle' };
            } },
          { say: 'But the title is yours. You tap Undo, then open Share and tick “This is me (my other device)” on your phone\'s row.', by: 'ez', look: 'ez',
            run(S) { S.ez.ed.undo(); S.sam.ed.doc = E.clone(S.ez.ed.doc); S.ez.sel = 'c3'; S.ez.sheet = true; } },
          { say: 'Now you delete Sandcastle again. The title goes with it, just as when you edit alone: one line, with Undo. Your phone gets no “kept” line.', by: 'ez', lag: true, look: ['ez', 'sam'],
            run(S) { const r = S.ez.ed.run('deleteClip', { id: 'c3' }); if (r.ok) S.ez.sel = null; S.ez.msg = { text: r.say || 'Deleted clip', btns: ['Undo'] }; reaches(S, 'sam'); } }
        ];
      },
      result(p) {
        if (p < 4) return { checks: [[1, '', 'Your Mac says why moving clips stopped, and calls the other device “your phone”.'],
          [1, '', 'Options › then Make it a Viewer fixes it in two taps. Your phone can ask to edit again.'],
          [0, '', 'Before Phase 4 your two devices count as two people: while both can edit, moving clips stays off on both.']],
          note: 'To skip this every time: in Share, set “Whoever you give the link to” to Viewer.' };
        return { checks: [[1, '4d', 'Moving clips works on both devices at once. Nothing stops you.'],
          [1, '4c', 'Until you mark it, your phone counts as someone else, so its title was kept.'],
          [1, '4c', 'After “This is me”, deleting works as it does alone: one line, one Undo.'], [1, '', 'The lines on your Mac call it “your phone”, never “Ezra”.']],
          note: p === 5 ? SAME5 : '' };
      }
    }
  ];

  const PHASES = [
    { p: 3, label: 'Phases 2–3', desc: 'Before “together”. Moving clips stops while someone else can edit. Looks, text, captions and sound still work live.' },
    { p: 4, label: 'Phase 4', desc: '“Together”. Moving clips works live, and each of you sees it happen.' },
    { p: 5, label: 'Phase 5', desc: '“All-or-nothing”. A change that can\'t land whole doesn\'t land at all.' }
  ];
  /* tooltips on the Phase 4 / Phase 5 tags (shown in the Phase 5 view, where they tell the two releases apart) */
  const TAGS = {
    '4a': 'Phase 4: keyframes ride inside their clip', '4b': 'Phase 4: holding a clip protects what is in it, not where it sits',
    '4c': "Phase 4: your picture stays put, and other people's things are kept", '4d': 'Phase 4: clips glide, and you see who moved them',
    '5': 'Phase 5: a change lands whole, or not at all'
  };
  const FEATS = [
    { ph: 'Phase 1', from: 1, text: 'Faces show which editor each person is in: “Sam · Quick”. What someone is holding wears their colour.' },
    { ph: 'Phase 2', from: 2, until: 3, text: 'The stop: “Clips stay put while you both edit”. Looks, text, captions and sound work live.',
      lifted: 'The stop lifts while everyone is online. It still holds when someone who can edit is offline.' },
    { ph: 'Phase 4', from: 4, text: 'Keyframes ride inside their clip, so moving it never loses them. While Sam drags a clip, it wears her outline on your phone, marked “Sam · clip row”.' },
    { ph: 'Phase 4', from: 4, text: 'A clip you\'re holding can still slide in time. What\'s in it stays yours. A caption someone is typing slides with its clip, words untouched.' },
    { ph: 'Phase 4', from: 4, text: 'Your picture stays on the same frame when clips move under you. Your things are kept when someone else deletes their clip. A change to what you\'re holding waits, with a line naming you. Undo puts back only your own things.' },
    { ph: 'Phase 4', from: 4, text: 'Clips glide into place, outlined in the mover\'s colour, with “Sam moved 4 clips”. Moving clips works live. Your own phone can be marked “This is me”.' },
    { ph: 'Phase 5', from: 5, text: 'All-or-nothing: an undo that can\'t land whole is refused, “Can\'t undo — Ezra changed it since”.' }
  ];

  /* ------------------------------------------------------------ CSS ------------------------------------------------------- */
  const CSS = `
.v6 { display: grid; gap: 20px; min-width: 0; }
.v6 > * { min-width: 0; }
.v6 p { margin: 0; }
.v6-intro { font-size: 16px; color: var(--h-muted); max-width: 62ch; }
.v6-lbl { font-family: var(--h-mono); font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--h-muted); margin-bottom: 8px !important; }
.v6-cases { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.v6-case:last-child:nth-child(odd) { grid-column: 1 / -1; }
@media (min-width: 700px) { .v6-cases { grid-template-columns: repeat(3, minmax(0, 1fr)); } .v6-case:last-child:nth-child(odd) { grid-column: auto; } }
.v6-case { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 8px; align-items: start; text-align: left; min-height: 56px;
  border: 1px solid var(--h-rule); background: var(--h-surface); color: var(--h-ink); border-radius: 12px; padding: 9px 10px; cursor: pointer;
  font: 14px/1.25 var(--h-body); transition: border-color .15s, background .15s; }
@media (hover: hover) { .v6-case:hover { border-color: var(--h-accent); } }
.v6-case .n { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--h-surface-2); font: 700 13px/1 var(--h-mono); color: var(--h-muted); }
.v6-case b { display: block; font-weight: 700; }
.v6-case .sub { display: block; color: var(--h-muted); font-size: 13px; margin-top: 1px; }
.v6-case[aria-pressed="true"] { border-color: var(--h-accent); background: var(--h-accent-soft); box-shadow: inset 0 0 0 1px var(--h-accent); }
.v6-case[aria-pressed="true"] .n { background: var(--h-accent); color: var(--h-accent-ink); }
.v6-rel { max-width: 100%; }
.v6 .v6-rel button { padding-inline: 14px; }
.v6-reldesc { margin-top: 8px !important; font-size: 14.5px; color: var(--h-muted); max-width: 62ch; }
.v6-box { display: grid; gap: 12px; background: var(--h-surface); border: 1px solid var(--h-rule); border-radius: 18px; padding: 18px; }
.v6-box.one { padding: 0; border: 0; background: none; border-radius: 0; }
.v6-player { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.v6-player .h-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 12px; min-height: 44px; }
.v6-player .h-btn svg { width: 18px; height: 18px; flex: none; }
.v6-player .v6-play { min-width: 104px; }
.v6-player .h-btn:disabled { opacity: .4; cursor: default; }
.v6-dots { display: flex; margin-left: auto; }
.v6-dot { width: 24px; height: 40px; border: 0; background: transparent; padding: 0; display: grid; place-items: center; cursor: pointer; }
.v6-dot i { width: 9px; height: 9px; border-radius: 50%; background: var(--h-rule); transition: transform .2s, background .2s; }
.v6-dot.done i { background: color-mix(in srgb, var(--h-accent) 45%, var(--h-rule)); }
.v6-dot.hypo i { border-radius: 2px; transform: rotate(45deg); }
.v6-dot[aria-current="step"] i { background: var(--h-accent); transform: scale(1.35); }
.v6-dot.hypo[aria-current="step"] i { background: var(--h-warn); transform: rotate(45deg) scale(1.35); }
/* the kit's .h-seg rule loads after this style, so these carry an extra .v6 to win */
.v6 .v6-tabs { display: none; }
.v6-box.one .v6-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; border-radius: 14px; }
.v6-box.one .v6-tabs button { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 6px 8px; border-radius: 11px; position: relative; min-width: 0; }
.v6-tabs .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.v6-tabs .new { position: absolute; top: 6px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: var(--h-warn); display: none; }
.v6-tabs button.has-new .new { display: block; }
.v6-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 22px; align-items: start; }
.v6-col, .v6-bubbles { display: contents; }
.v6-col[data-side="sam"] > *, .v6-bubble[data-side="sam"] { grid-column: 1; } .v6-col[data-side="ez"] > *, .v6-bubble[data-side="ez"] { grid-column: 2; }
.v6-col > .v6-who { grid-row: 1; } .v6-col > .v6-phone { grid-row: 2; } .v6-bubble { grid-row: 3; align-self: stretch; }
.v6-box.one .v6-pair { gap: 10px 8px; }
.v6-box.one .v6-col > * { grid-column: 1 / -1; }
.v6-box.one .v6-col:not(.shown) > * { display: none; }
.v6-who { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; min-height: 44px; min-width: 0; font-weight: 700; font-size: 15px; white-space: nowrap; }
.v6-who > span:not(.v6-face) { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.v6-who .v6-edseg { margin-left: auto; flex: none; }
.v6-face { width: 26px; height: 26px; border-radius: 50%; background: var(--who); color: #0b1216; display: grid; place-items: center; font: 800 12.5px/1 var(--h-body); position: relative; flex: none; }
.v6-face .g { position: absolute; right: -6px; bottom: -5px; width: 15px; height: 15px; border-radius: 4px; background: #0b1216; color: #fff; display: grid; place-items: center; box-shadow: 0 0 0 1.5px var(--h-surface); }
.v6-face .g svg { width: 11px; height: 11px; }
.v6-edname { color: var(--h-muted); font-weight: 600; }
.v6 .v6-edseg button { padding: 7px 12px; font-size: 13px; min-height: 36px; }
.v6-phone { min-width: 0; border-radius: 30px; transition: box-shadow .25s; }
.v6-bubble { font-size: 14px; line-height: 1.4; background: var(--h-bg); border: 1px solid var(--h-rule); border-radius: 12px; padding: 8px 10px; min-height: 3.4em; overflow-wrap: anywhere; transition: opacity .2s, border-color .2s; }
.v6-bubble small { display: block; color: var(--h-muted); font: 600 10.5px/1.3 var(--h-mono); letter-spacing: .06em; text-transform: uppercase; margin-bottom: 3px; }
.v6-bubble .go { display: none; color: var(--h-accent); font-weight: 700; letter-spacing: 0; text-transform: none; font-family: var(--h-body); font-size: 12.5px; margin-left: 4px; }
.v6-box.one .v6-bubble { cursor: pointer; }
.v6-box.one .v6-bubble.cur { border-color: color-mix(in srgb, var(--h-accent) 70%, var(--h-rule)); }
.v6-box.one .v6-bubble:not(.cur) .go { display: inline; }
.v6-bubble.none span { color: var(--h-faint); }
.v6-bubble .pill { display: inline-block; border: 1px solid var(--h-rule); border-radius: 999px; padding: 0 8px; margin: 2px 2px 0 0; font-size: 12.5px; font-weight: 700; color: var(--h-accent); background: var(--h-surface); }
.v6-bubble.wait { opacity: .5; }
.v6-bubble.hypo { border-color: color-mix(in srgb, var(--h-warn) 55%, var(--h-rule)); }
.v6-narr { border-left: 3px solid var(--h-accent); background: var(--h-bg); border-radius: 0 12px 12px 0; padding: 11px 14px 12px; font-size: 16px; line-height: 1.45; text-wrap: pretty; box-sizing: border-box; }
.v6-narr .st { display: block; font: 600 11px/1 var(--h-mono); letter-spacing: .07em; text-transform: uppercase; color: var(--h-muted); margin-bottom: 6px; }
.v6-narr.hypo { border-left-color: var(--h-warn); background: color-mix(in srgb, var(--h-warn) 9%, var(--h-bg)); }
.v6-narr.hypo .st { color: var(--h-warn); }
.v6-result { display: grid; gap: 12px; }
.v6-result[hidden] { display: none; }
.v6-result h3 { font-family: var(--h-display); font-size: 20px; line-height: 1.15; margin: 0; }
.v6-checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 11px; }
.v6-checks li { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px; align-items: start; font-size: 15px; line-height: 1.4; }
.v6-checks li > i { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-style: normal; }
.v6-checks li > i svg { width: 16px; height: 16px; }
.v6-checks li.ok > i { background: color-mix(in srgb, var(--h-good) 18%, transparent); color: var(--h-good); }
.v6-checks li.bad > i { background: color-mix(in srgb, var(--h-warn) 18%, transparent); color: var(--h-warn); }
.v6-tag { display: inline-block; font: 600 11px/1 var(--h-mono); padding: 3px 6px; border-radius: 6px; background: var(--h-accent-soft); color: var(--h-accent); margin-left: 6px; vertical-align: 1px; white-space: nowrap; }
.v6-rnote { font-size: 14px; color: var(--h-muted); border-top: 1px dashed var(--h-rule); padding-top: 10px; }
.v6-rnote b { color: var(--h-warn); }
.v6-feats-wrap { display: grid; gap: 10px; }
.v6-feats-wrap h3 { font-family: var(--h-display); font-size: 20px; margin: 0; }
.v6-feats { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; }
.v6-feats li { display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 10px; align-items: baseline; font-size: 14.5px; line-height: 1.4; transition: opacity .2s; }
.v6-feats .ph { font: 600 11.5px/1.4 var(--h-mono); color: var(--h-muted); white-space: nowrap; }
.v6-feats li.on .ph { color: var(--h-good); }
.v6-feats li.on .ph::before { content: "✓ "; }
.v6-feats li.off { opacity: .42; }
.v6-feats li.off .ph::after { content: "later"; display: block; }
.v6-feats li.lifted .ph { color: var(--h-muted); }
.v6-feats li.lifted .ph::before { content: "↑ "; }
.v6-feats .lift { display: block; color: var(--h-muted); font-size: 13.5px; }
.v6 kbd { font-family: var(--h-mono); font-size: 12px; padding: 1px 6px; border-radius: 5px; border: 1px solid var(--h-rule); background: var(--h-surface-2); }

/* ---- the mock (FreeMotion's dark editor) ---- */
.v6-phone.hypo .fm-phone { border-color: #4a1a22; box-shadow: 0 0 0 2px #ff6b7a, 0 18px 50px rgba(0, 0, 0, .35); }
.v6 .fm.v6-mac { border-radius: 12px; border-color: #20292e; }
.v6 .fm .v6-winbar { height: 24px; flex: none; display: flex; align-items: center; gap: 6px; padding: 0 10px; background: #0b1419; border-bottom: 1px solid var(--line-soft); color: var(--text-dim); font-size: 11px; white-space: nowrap; overflow: hidden; }
.v6 .fm .v6-winbar i { width: 9px; height: 9px; border-radius: 50%; background: #2a3a42; flex: none; }
.v6 .fm .v6-winbar span { margin-left: 6px; overflow: hidden; text-overflow: ellipsis; }
/* the numbers along the top: the same 18 px ruler, with a slightly taller place to put a finger (the extra 10 px is invisible) */
.v6 .fm .fm-ruler::after { content: ""; position: absolute; left: 0; right: 0; top: 100%; height: 10px; }
.v6 .fm .fm-canvas .cv-pip { outline: none; box-shadow: none; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, .5)); border-radius: 0; }
.v6 .fm .v6-pres { position: absolute; left: 8px; top: 8px; z-index: 5; display: flex; }
.v6 .fm .v6-pchip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px 0 4px; border-radius: 14px; background: rgba(6, 14, 18, .78); border: 1px solid var(--glass-rim); font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.v6 .fm .v6-pres.pulse .v6-pchip { animation: v6pulse 1.1s ease-out 2; }
.v6 .fm .v6-pface { width: 21px; height: 21px; border-radius: 50%; background: var(--who); color: #0b1216; display: grid; place-items: center; font-weight: 800; font-size: 10.5px; position: relative; flex: none; }
.v6 .fm .v6-pface .g { position: absolute; right: -5px; bottom: -4px; width: 13px; height: 13px; border-radius: 3.5px; background: #0b1216; color: #fff; display: grid; place-items: center; box-shadow: 0 0 0 1px rgba(255, 255, 255, .25); }
.v6 .fm .v6-pface .g svg { width: 9.5px; height: 9.5px; }
.v6 .fm .v6-livechip { position: absolute; right: 8px; top: 10px; z-index: 5; }
.v6 .fm .v6-rhead { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px dashed var(--who); z-index: 8; pointer-events: none; opacity: .95; transition: left .25s; }
.v6 .fm .v6-rhead b { position: absolute; top: 2px; left: -8px; width: 14px; height: 14px; border-radius: 50%; background: var(--who); color: #0b1216; font-size: 8.5px; font-weight: 800; display: grid; place-items: center; }
.v6 .fm .v6-held { box-shadow: 0 0 0 2px var(--who), 0 0 12px color-mix(in srgb, var(--who) 70%, transparent) !important; }
.v6 .fm .v6-arr { box-shadow: 0 0 0 2.5px var(--who), 0 0 14px color-mix(in srgb, var(--who) 60%, transparent) !important; }
.v6 .fm .v6-arrtag { position: absolute; z-index: 6; line-height: 14px; pointer-events: none; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 5px; background: var(--who); color: #0b1216; text-shadow: none; white-space: nowrap; }
.v6 .fm .v6-tint { animation: v6tint 1.4s ease-out forwards; }
.v6 .fm .v6-tint-static { box-shadow: 0 0 0 2.5px var(--who) !important; }
.v6 .fm .v6-shake { animation: v6shake .45s ease-in-out 1; }
.v6 .fm .v6-lift { transform: translateY(-6px) scale(1.05); box-shadow: 0 12px 26px rgba(0, 0, 0, .65), 0 0 0 2px #fff !important; z-index: 9 !important; }
.v6 .fm .v6-caret { position: absolute; top: 0; bottom: 0; width: 3px; margin-left: -1px; border-radius: 2px; background: var(--accent); box-shadow: 0 0 8px var(--accent); z-index: 7; }
.v6 .fm .v6-ghost { opacity: 0; transform: scale(.92); transition: opacity .3s, transform .3s; pointer-events: none; z-index: 1; }
.v6 .fm .v6-lost { position: absolute; top: 50%; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; background: var(--bad); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 900; font-style: normal; z-index: 4; box-shadow: 0 0 0 2px rgba(0, 0, 0, .55); text-shadow: none; }
.v6 .fm .v6-kept { position: absolute; bottom: 0; width: 13px; height: 13px; margin-left: -6.5px; border-radius: 50%; border: 2px solid var(--kf); z-index: 4; box-shadow: 0 0 8px var(--kf); animation: v6pulse 1.1s ease-out 2; }
.v6 .fm .v6-crop { position: absolute; left: 10%; right: 10%; top: 16%; bottom: 20%; border: 1.5px solid #fff; box-shadow: 0 0 0 999px rgba(0, 0, 0, .5); pointer-events: none; z-index: 3; }
.v6 .fm .v6-crop i { position: absolute; width: 7px; height: 7px; background: #fff; }
.v6 .fm .v6-crop i:nth-child(1) { left: -4px; top: -4px; } .v6 .fm .v6-crop i:nth-child(2) { right: -4px; top: -4px; }
.v6 .fm .v6-crop i:nth-child(3) { left: -4px; bottom: -4px; } .v6 .fm .v6-crop i:nth-child(4) { right: -4px; bottom: -4px; }
.v6 .fm .v6-kmf { position: absolute; right: 8px; bottom: 8px; z-index: 5; display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 9px 0 6px; border-radius: 12px; background: var(--accent-soft); border: 1px solid rgba(90, 199, 237, .55); color: var(--accent); font-size: 11px; font-weight: 700; animation: v6in .3s ease-out; }
.v6 .fm .v6-kmf .ico { width: 14px; height: 14px; }
.v6 .fm .v6-hypo { position: absolute; left: 0; right: 0; bottom: 0; z-index: 6; height: 24px; display: grid; place-items: center; font-size: 10.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #fff; background: repeating-linear-gradient(135deg, #7a1f2b 0 8px, #611923 8px 16px); }
.v6 .fm .v6-line { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; padding: 0 56px 0 6px; }
.v6 .fm .v6-line .t { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; color: var(--text); }
.v6 .fm .v6-line .b { flex: none; height: 32px; padding: 0 11px; border-radius: 9px; border: 1px solid var(--glass-rim); background: var(--glass-tint); display: inline-flex; align-items: center; font-weight: 700; font-size: 12px; color: var(--accent); white-space: nowrap; cursor: pointer; }
.v6 .fm .v6-line .b.press { background: var(--accent-soft); border-color: var(--accent); box-shadow: 0 0 0 2px rgba(90, 199, 237, .35); }
.v6 .fm .v6-line.in { animation: v6in .3s ease-out; }
.v6 .fm .v6-pressed { background: var(--accent-soft); color: var(--accent); box-shadow: inset 0 0 0 1.5px var(--accent); animation: v6pulse 1.1s ease-out 2; }
.v6 .fm.v6-viewer .fm-tools, .v6 .fm.v6-viewer .fm-playbar [data-act="split"] { opacity: .35; }
.v6 .fm .v6-tool { display: flex; align-items: center; gap: 10px; width: 100%; min-width: 0; padding: 0 8px; }
.v6 .fm .v6-tool .ico { width: 18px; height: 18px; color: var(--accent); flex: none; }
.v6 .fm .v6-tname { font-weight: 700; font-size: 12.5px; white-space: nowrap; }
.v6 .fm .v6-tname.cc { color: var(--sec-captions); }
.v6 .fm .v6-grow { flex: 1; }
.v6 .fm .v6-slider { position: relative; flex: 1; min-width: 60px; height: 4px; border-radius: 2px; background: var(--panel-3); }
.v6 .fm .v6-slider s { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 2px; background: var(--accent); transition: width .9s cubic-bezier(.3, .7, .3, 1); }
.v6 .fm .v6-slider i { position: absolute; top: 50%; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, .5); transition: left .9s cubic-bezier(.3, .7, .3, 1); }
.v6 .fm .v6-val { font-variant-numeric: tabular-nums; min-width: 34px; text-align: right; color: var(--text-dim); font-weight: 600; }
.v6 .fm .v6-kfb { width: 32px; height: 32px; flex: none; border-radius: 9px; display: grid; place-items: center; border: 1px solid var(--line); }
.v6 .fm .v6-kfb b { width: 9px; height: 9px; transform: rotate(45deg); border: 1.5px solid var(--text-faint); }
.v6 .fm .v6-kfb.on { border-color: color-mix(in srgb, var(--kf) 60%, transparent); }
.v6 .fm .v6-kfb.on b { background: var(--kf); border-color: var(--kf); }
.v6 .fm .v6-pill { flex: none; height: 30px; padding: 0 11px; border-radius: 9px; border: 1px solid var(--line); display: inline-flex; align-items: center; font-weight: 700; font-size: 12px; color: var(--text-dim); }
.v6 .fm .v6-pill.on { color: var(--accent); border-color: rgba(90, 199, 237, .5); background: var(--accent-soft); }
.v6 .fm .v6-field { flex: 1; min-width: 0; height: 34px; border-radius: 9px; border: 1px solid var(--accent); background: rgba(0, 0, 0, .35); display: flex; align-items: center; padding: 0 10px; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; }
.v6 .fm .v6-field .caret { width: 1.5px; height: 16px; background: var(--accent); margin-left: 1px; flex: none; animation: v6blink 1s steps(1) infinite; }
.v6 .fm .v6-field.gone { border-color: var(--bad); color: var(--text-faint); }
.v6 .fm .v6-field.gone .txt { text-decoration: line-through; }
.v6 .fm .v6-field.gone .caret { display: none; }
.v6 .fm .v6-gone { color: var(--bad); font-weight: 700; font-size: 12px; white-space: nowrap; }
.v6 .fm .v6-menu { position: absolute; right: 14px; z-index: 30; min-width: 190px; padding: 5px; border-radius: 12px; background: var(--panel-3); border: 1px solid var(--line); box-shadow: 0 14px 34px rgba(0, 0, 0, .6); animation: v6in .2s ease-out; }
.v6 .fm .v6-menu .mi { display: flex; align-items: center; min-height: 42px; padding: 0 12px; border-radius: 8px; font-size: 13.5px; font-weight: 600; color: var(--text); cursor: pointer; }
.v6 .fm .v6-menu .mi:first-child { color: var(--accent); background: var(--accent-soft); }
.v6 .fm .v6-sheet { position: absolute; left: 0; right: 0; bottom: 0; z-index: 25; background: var(--panel-2); border-top: 1px solid var(--line); border-radius: 16px 16px 0 0; padding: 12px 12px 14px; display: grid; gap: 8px; box-shadow: 0 -12px 30px rgba(0, 0, 0, .5); animation: v6up .25s ease-out; }
.v6 .fm .v6-sheet .sh-h { display: flex; align-items: center; justify-content: space-between; font-size: 15px; }
.v6 .fm .v6-sheet .sh-done { color: var(--accent); font-weight: 700; font-size: 13px; padding: 6px 4px; cursor: pointer; }
.v6 .fm .v6-sheet .sh-sub { color: var(--text-faint); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.v6 .fm .v6-sheet .sh-row { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 4px 8px; border-radius: 10px; background: var(--panel); border: 1px solid var(--line-soft); }
.v6 .fm .v6-sheet .sh-row.on { border-color: rgba(90, 199, 237, .45); }
.v6 .fm .v6-sheet .sh-n { display: grid; gap: 1px; min-width: 0; font-size: 13px; }
.v6 .fm .v6-sheet .sh-n small { color: var(--text-dim); font-size: 11.5px; }
.v6 .fm .v6-sheet .sh-me { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 8px 0 40px; font-size: 13px; font-weight: 600; cursor: pointer; }
.v6 .fm .v6-sheet .sh-me .box { width: 20px; height: 20px; border-radius: 5px; background: var(--accent); color: #062029; display: grid; place-items: center; font-size: 13px; font-weight: 900; flex: none; animation: v6pulse 1.1s ease-out 2; }
.v6 .fm .v6-sheet .sh-foot { color: var(--text-dim); font-size: 12px; }
.v6 .fm .v6-inert { position: absolute; left: 50%; z-index: 45; transform: translate(-50%, -100%); width: max-content; max-width: calc(100% - 28px); padding: 8px 12px; border-radius: 10px; background: var(--panel-3); border: 1px solid var(--line); color: var(--text); font-size: 12.5px; line-height: 1.3; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, .6); opacity: 0; transition: opacity .15s; pointer-events: none; }
.v6 .fm .v6-inert.show { opacity: 1; }
@keyframes v6tint { 0%, 50% { box-shadow: 0 0 0 2.5px var(--who), 0 0 16px var(--who); } 100% { box-shadow: 0 0 0 0 transparent; } }
@keyframes v6shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
@keyframes v6pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, .55); } 100% { box-shadow: 0 0 0 12px rgba(255, 255, 255, 0); } }
@keyframes v6in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes v6up { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes v6blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .v6 .fm .v6-menu, .v6 .fm .v6-sheet, .v6 .fm .v6-line.in, .v6 .fm .v6-kmf { animation: none; } }
`;
  function injectCSS() {
    if (document.getElementById('v6-css')) return;
    const s = document.createElement('style'); s.id = 'v6-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------ the page -------------------------------------------------- */
  function mount(host) {
    injectCSS();
    let ci = clamp(parseInt(store('v6.case') || '0', 10) || 0, 0, CASES.length - 1);
    let phase = [3, 4, 5].includes(+store('v6.phase')) ? +store('v6.phase') : 4;
    let cs = CASES[ci], ezEditor = cs.ezEd || 'full', steps = cs.steps(phase), k = 0, S = null, playing = false, gen = 0, timers = [];
    let mode = 'two', shown = 'sam', lastW = 0;
    const W = () => cs.who || WHO_FRIEND;

    const root = el('div', 'v6');
    root.innerHTML =
      '<p class="v6-intro">Pick a moment and a release, then press Play. Watch what one person does, and what reaches the other. On a narrow screen one device shows at a time, and the page switches to the one that changes.</p>' +
      '<div><p class="v6-lbl" id="v6-cl">The moment</p><div class="v6-cases" role="group" aria-labelledby="v6-cl"></div></div>' +
      '<div><p class="v6-lbl" id="v6-rl">Which release</p><div class="h-seg v6-rel" role="group" aria-labelledby="v6-rl"></div><p class="v6-reldesc"></p></div>' +
      '<div class="v6-box">' +
        '<div class="v6-player">' +
          '<button type="button" class="h-btn v6-back" aria-label="Back a step" title="Back (←)">' + CHEV_L + '</button>' +
          '<button type="button" class="h-btn primary v6-play"></button>' +
          '<button type="button" class="h-btn v6-next" aria-label="Next step" title="Next (→)">' + CHEV_R + '</button>' +
          '<div class="v6-dots" role="group" aria-label="Steps"></div>' +
        '</div>' +
        '<div class="v6-narr" aria-live="polite"></div>' +
        '<div class="h-seg v6-tabs" role="group" aria-label="Which device to show"><button type="button" data-side="sam"></button><button type="button" data-side="ez"></button></div>' +
        '<div class="v6-pair">' +
          '<div class="v6-col" data-side="sam"><div class="v6-who"></div><div class="v6-phone"></div></div>' +
          '<div class="v6-col" data-side="ez"><div class="v6-who"></div><div class="v6-phone"></div></div>' +
          '<div class="v6-bubbles"><div class="v6-bubble" data-side="sam" aria-live="polite"></div><div class="v6-bubble" data-side="ez" aria-live="polite"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="v6-result h-card" hidden></div>' +
      '<section class="v6-feats-wrap" aria-labelledby="v6-fh"><h3 id="v6-fh">What each release adds</h3><ul class="v6-feats"></ul>' +
      '<p class="h-note">Tap Next or use <kbd>←</kbd> <kbd>→</kbd> to step. Drag along the numbers at the top of a timeline to move that person\'s playhead; the other device shows it as a dashed line. Full / Quick above your device switches your editor, and the other device shows the change. On a narrow screen, the two tabs (or a tap on an “On …” box) swap devices.</p></section>';
    host.appendChild(root);
    const $ = s => root.querySelector(s);
    const casesEl = $('.v6-cases'), relEl = $('.v6-rel'), relDesc = $('.v6-reldesc'), dotsEl = $('.v6-dots'), narr = $('.v6-narr'), box = $('.v6-box'),
      playBtn = $('.v6-play'), backBtn = $('.v6-back'), nextBtn = $('.v6-next'), resEl = $('.v6-result'), featsEl = $('.v6-feats'), tabsEl = $('.v6-tabs');
    const views = {
      sam: { col: $('.v6-col[data-side="sam"]'), f: null, api: null, editor: null, mac: false, lastMsg: null },
      ez: { col: $('.v6-col[data-side="ez"]'), f: null, api: null, editor: null, mac: false, lastMsg: null }
    };
    ['sam', 'ez'].forEach(s => {
      const V = views[s];
      V.phoneHost = V.col.querySelector('.v6-phone'); V.who = V.col.querySelector('.v6-who');
      V.bubble = root.querySelector('.v6-bubble[data-side="' + s + '"]'); V.tab = tabsEl.querySelector('[data-side="' + s + '"]');
      V.tab.addEventListener('click', () => showSide(s, true));
      V.bubble.addEventListener('click', () => { if (mode === 'one' && shown !== s) showSide(s, true); });
      V.phoneHost.addEventListener('click', e => deadControl(s, e), true);   // capture: before the kit's own handlers
    });

    /* ---- controls ---- */
    CASES.forEach((c, i) => {
      const b = el('button', 'v6-case', '<span class="n">' + (i + 1) + '</span><span><b>' + esc(c.title) + '</b><span class="sub">' + esc(c.sub) + '</span></span>');
      b.type = 'button'; b.dataset.i = i;
      b.addEventListener('click', () => { ci = i; cs = CASES[i]; ezEditor = cs.ezEd || 'full'; store('v6.case', String(i)); views.sam.open = views.ez.open = null; restart(true); });
      casesEl.appendChild(b);
    });
    PHASES.forEach(ph => {
      const b = el('button', '', esc(ph.label)); b.type = 'button'; b.dataset.p = ph.p;
      b.addEventListener('click', () => { phase = ph.p; store('v6.phase', String(ph.p)); restart(true); });
      relEl.appendChild(b);
    });
    playBtn.addEventListener('click', () => { if (playing) stop(); else play(); });
    backBtn.addEventListener('click', () => { stop(); if (k > 0) go(k - 1, { anim: true }); });
    nextBtn.addEventListener('click', () => { stop(); if (k < steps.length - 1) go(k + 1, { anim: true }); });
    const onKey = e => {
      if (!root.isConnected || !root.offsetParent || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;   // another page is showing
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const a = document.activeElement;
      if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
      if (a && a.closest && a.closest('.fm-tl-scroll')) return;
      e.preventDefault(); stop();
      if (e.key === 'ArrowRight' && k < steps.length - 1) go(k + 1, { anim: true });
      if (e.key === 'ArrowLeft' && k > 0) go(k - 1, { anim: true });
    };
    document.addEventListener('keydown', onKey);

    function later(fn, ms) { const g = gen; const id = setTimeout(() => { if (g === gen && root.isConnected) fn(); }, ms); timers.push(id); }
    function clearTimers() { gen++; timers.forEach(clearTimeout); timers = []; }
    function stop() { playing = false; clearTimers(); drawPlayer(); }
    function play() { if (k >= steps.length - 1) { playing = true; S = null; go(0, { anim: true }); schedule(); return; } playing = true; drawPlayer(); schedule(); }
    function stepMs(i) { const st = steps[i]; return clamp(1500 + st.say.length * 25, 3000, 7200) + (st.lag ? LAG : 0) + (st.anims ? 900 : 0); }
    function schedule() {
      if (!playing) return;
      if (k >= steps.length - 1) { playing = false; drawPlayer(); return; }
      later(() => { if (!playing) return; go(k + 1, { anim: true, keepTimers: true }); schedule(); }, stepMs(k));
    }
    function restart(auto) { stop(); steps = cs.steps(phase); k = 0; S = null; drawControls(); go(0, { anim: !!auto }); if (auto) { playing = true; drawPlayer(); schedule(); } }

    /* ---- the two layouts: side by side, or one device at a time ---- */
    function visible(V) { return !!(V.phoneHost.isConnected && V.phoneHost.getClientRects().length); }
    function relayout(force) {
      const w = root.clientWidth; if (!w) return;
      const m = w >= TWO_AT ? 'two' : 'one';
      if (!force && m === mode && Math.abs(w - lastW) < 24) return;
      lastW = w; mode = m;
      box.classList.toggle('one', m === 'one'); box.classList.toggle('two', m === 'two');
      markShown();
      fitNarr();
      if (S) { drawSide('sam', {}); drawSide('ez', {}); }         // a new width is a new timeline scale
    }
    function markShown() {
      ['sam', 'ez'].forEach(s => {
        const V = views[s], on = s === shown;
        V.col.classList.toggle('shown', on); V.bubble.classList.toggle('cur', on);
        V.tab.setAttribute('aria-pressed', String(on));
      });
      markNew();
    }
    function markNew() {
      ['sam', 'ez'].forEach(s => {
        const P = S && S[s], has = !!(P && (P.msg || P.note || P.kmf || P.sheet));
        views[s].tab.classList.toggle('has-new', mode === 'one' && s !== shown && has);
      });
    }
    function showSide(side, redraw) {
      const was = shown; shown = side; markShown();
      if (redraw && mode === 'one' && was !== side && S) drawSide(side, {});
    }
    /* the narration keeps the height of its longest step, so the devices under it don't jump from step to step */
    function fitNarr() {
      if (!narr.offsetParent) return;
      narr.style.minHeight = '';
      const keep = narr.innerHTML, keepH = narr.classList.contains('hypo');
      let h = 0;
      steps.forEach((st, i) => { narr.classList.toggle('hypo', !!st.hypo); narr.innerHTML = narrHTML(st, i); h = Math.max(h, narr.offsetHeight); });
      narr.innerHTML = keep; narr.classList.toggle('hypo', keepH);
      narr.style.minHeight = h + 'px';
    }
    if (typeof ResizeObserver !== 'undefined') {
      let q = false;
      new ResizeObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; relayout(false); }); }).observe(root);
    }

    /* ---- state ---- */
    function fresh() {
      const doc = VIS.sample('beach');
      if (cs.setup) cs.setup(doc);
      const side = c => ({ ed: E.editor(doc), t: c.t, sel: c.sel, hold: c.hold ? Object.assign({}, c.hold) : null, tool: c.tool ? Object.assign({}, c.tool) : null,
        msg: null, note: '', hl: null, shake: null, drag: null, arr: null, kmf: false, marks: [], menu: null, sheet: false, press: null, viewer: false });
      return { phase, hypo: false, who: W(), sam: side(cs.sam), ez: side(cs.ez) };
    }
    function stateAt(i) {
      const s = fresh();
      for (let j = 0; j <= i; j++) {
        ['sam', 'ez'].forEach(x => { const P = s[x]; P.msg = null; P.note = ''; P.hl = P.shake = P.drag = P.arr = P.menu = P.press = null; P.kmf = false; P.sheet = false; P.marks = []; });
        s.hypo = !!steps[j].hypo;
        steps[j].run(s);
      }
      return s;
    }

    /* ---- one step ---- */
    function go(i, how) {
      how = how || {};
      if (!how.keepTimers) clearTimers();
      const forward = i === k + 1 || (i === 0 && !S);
      k = clamp(i, 0, steps.length - 1);
      S = stateAt(k);
      const st = steps[k], anim = !!how.anim;
      drawPlayer(); drawNarr(); drawResult();
      root.querySelectorAll('.v6-phone').forEach(p => p.classList.toggle('hypo', S.hypo));
      const actor = st.by || null, recv = actor ? other(actor) : null;
      const look = [].concat(st.look || actor || shown);
      /* which device a narrow screen shows: the first one now; the second when the change reaches it */
      showSide(anim ? look[0] : look[look.length - 1], false);
      const fx = { anim, forward: forward && anim, pulse: st.pulse && anim, anims: forward && anim ? (st.anims || []) : [] };
      if (!actor) { drawSide('sam', fx); drawSide('ez', fx); markNew(); return; }
      drawSide(actor, Object.assign({ actor: true }, fx));
      const second = look[1];
      const doRecv = () => { if (anim && second === recv) showSide(recv, false); drawSide(recv, Object.assign({ recv: true }, fx)); markNew(); };
      if (st.lag && anim) { views[recv].bubble.classList.add('wait'); later(doRecv, LAG); }
      else {
        doRecv();
        if (anim && second && second !== look[0]) later(() => showSide(second, true), 1300);
      }
      markNew();
    }

    /* ---- the hub pieces ---- */
    function drawControls() {
      casesEl.querySelectorAll('.v6-case').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === ci)));
      relEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.p === phase)));
      relDesc.textContent = PHASES.find(p => p.p === phase).desc;
      dotsEl.innerHTML = '';
      steps.forEach((st, i) => {
        const d = el('button', 'v6-dot' + (st.hypo ? ' hypo' : ''), '<i></i>'); d.type = 'button';
        d.setAttribute('aria-label', 'Step ' + (i + 1) + (st.hypo ? ', without the stop' : ''));
        d.addEventListener('click', () => { stop(); go(i, { anim: true }); });
        dotsEl.appendChild(d);
      });
      drawFeats(); drawWho(); fitNarr();
    }
    function drawPlayer() {
      const last = k >= steps.length - 1;
      playBtn.innerHTML = playing ? ICON_PAUSE + '<span>Pause</span>' : last ? ICON_AGAIN + '<span>Play again</span>' : ICON_PLAY + '<span>Play</span>';
      backBtn.disabled = k <= 0; nextBtn.disabled = last;
      dotsEl.querySelectorAll('.v6-dot').forEach((d, i) => { d.classList.toggle('done', i < k); if (i === k) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
    }
    function narrHTML(st, i) { return '<span class="st">' + (st.hypo ? 'Without the stop · what it prevents' : 'Step ' + (i + 1) + ' of ' + steps.length) + '</span>' + esc(st.say); }
    function drawNarr() {
      const st = steps[k];
      narr.classList.toggle('hypo', !!st.hypo);
      narr.innerHTML = narrHTML(st, k);
    }
    /* the Phase 4 / Phase 5 tags only mean something beside each other, so they show in the Phase 5 view */
    function tagHTML(t) { return t && phase === 5 ? '<span class="v6-tag" title="' + esc(TAGS[t] || '') + '">' + (t === '5' ? 'Phase 5' : 'Phase 4') + '</span>' : ''; }
    function drawResult() {
      const last = k === steps.length - 1;
      resEl.hidden = !last;
      if (!last) return;
      const R = cs.result(phase), ph = PHASES.find(p => p.p === phase);
      resEl.innerHTML = '<h3>' + esc(ph.label) + ': what happened</h3><ul class="v6-checks">' +
        R.checks.map(c => '<li class="' + (c[0] ? 'ok' : 'bad') + '"><i>' + (c[0] ? CHECK : CROSS) + '</i><span>' + esc(c[2]) + tagHTML(c[1]) + '</span></li>').join('') + '</ul>' +
        (R.stop ? '<p class="v6-rnote"><b>Why the stop is there:</b> without it, ' + esc(R.stop) + ' The last step shows it.</p>' : '') +
        (R.note ? '<p class="v6-rnote">' + esc(R.note) + '</p>' : '');
    }
    function drawFeats() {
      featsEl.innerHTML = FEATS.map(f => {
        const inIt = f.from <= phase || (f.from === 2 && phase >= 3);
        const lifted = f.until && phase > f.until;
        const cls = lifted ? 'lifted' : inIt ? 'on' : 'off';
        return '<li class="' + cls + '"><span class="ph">' + esc(f.ph) + '</span><span>' + esc(f.text) + (lifted ? '<span class="lift">' + esc(f.lifted) + '</span>' : '') + '</span></li>';
      }).join('');
    }
    function faceHTML(side, editor) { const w = W()[side]; return '<span class="v6-face" style="--who:' + w.color + '">' + w.ch + '<span class="g">' + (editor === 'quick' ? GQ : GF) + '</span></span>'; }
    function drawWho() {
      const w = W();
      views.sam.who.innerHTML = faceHTML('sam', 'quick') + '<span>' + esc(w.sam.head) + '</span><span class="v6-edname">· Quick</span>';
      views.ez.who.innerHTML = faceHTML('ez', ezEditor) + '<span>' + esc(w.ez.head) + '</span>';
      const seg = el('div', 'h-seg v6-edseg', '<button type="button" data-ed="full">Full</button><button type="button" data-ed="quick">Quick</button>');
      seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Your editor');
      seg.querySelectorAll('button').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.ed === ezEditor)); b.addEventListener('click', () => flipEditor(b.dataset.ed)); });
      views.ez.who.appendChild(seg);
      ['sam', 'ez'].forEach(s => { views[s].tab.innerHTML = faceHTML(s, s === 'sam' ? 'quick' : ezEditor) + '<span class="lbl">' + esc(w[s].tab) + '</span><i class="new" aria-hidden="true"></i>'; });
      markShown();
    }
    function flipEditor(to) {
      to = to || (ezEditor === 'full' ? 'quick' : 'full');
      if (to === ezEditor) return;
      ezEditor = to;
      drawWho();
      drawSide('ez', {});
      drawSide('sam', { pulse: !reduced() });               // the other device sees the glyph flip, nothing else (§10.7)
    }

    /* ---- controls on the devices that this page does not act on: say so, instead of doing nothing ---- */
    let inertAt = 0;
    function inert(side, text) {
      const f = views[side].f; if (!f) return;
      const now = Date.now(); if (now - inertAt < 450) return; inertAt = now;
      let t = f.root.querySelector(':scope > .v6-inert');
      if (!t) { t = el('div', 'v6-inert'); t.setAttribute('role', 'status'); f.root.appendChild(t); }
      t.textContent = text || "That button isn't part of this page. Use Play or Next.";
      t.style.top = Math.max(40, f.playbar.offsetTop - 8) + 'px';
      t.classList.add('show'); clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('show'), 2200);
    }
    function deadControl(side, e) {
      const t = e.target.closest('button, .v6-line .b, .v6-menu .mi, .v6-sheet .tap');
      if (!t || !views[side].phoneHost.contains(t)) return;
      if (t.classList.contains('fm-opener') || t.closest('.fm-toast')) return;         // section openers and the Full-side Show work
      if (t.dataset.act === 'switch' && side === 'ez') return;                          // your switch works
      e.stopPropagation(); e.preventDefault();
      if (t.dataset.act === 'switch') { inert(side, W().sam.name + ' stays in Quick on this page.'); return; }
      if (t.dataset.show && S) {                                                        // a line's Show picks the item
        const P = S[side]; P.sel = t.dataset.show; P.msg = null; P.tool = null; drawSide(side, {}); return;
      }
      inert(side);
    }

    /* ---- one device ---- */
    function makeFrame(side, editor) {
      const V = views[side], w = W()[side];
      V.phoneHost.innerHTML = '';
      V.f = VIS.phoneFrame(V.phoneHost, Object.assign({ name: 'Beach day', editor }, LAYOUT[editor]));
      V.editor = editor; V.mac = !!w.mac; V.api = null; V.lastMsg = null;
      if (V.mac) {                                                   // his Mac, drawn as a narrow window (the app's phone layout)
        V.f.root.classList.add('v6-mac');
        V.f.root.insertBefore(el('div', 'v6-winbar', '<i></i><i></i><i></i><span>Beach day — FreeMotion · narrow window</span>'), V.f.root.firstChild);
        V.f.fit();
      }
      if (side === 'ez') V.f.on('switch', () => flipEditor());
      else V.f.switchBtn.title = V.f.switchBtn.ariaLabel = w.name + ' stays in Quick on this page';
    }
    function ppsFor(f, editor) {
      const inner = (parseFloat(f.root.style.width) || 394) - 14;
      return Math.max(8, (inner - (editor === 'full' ? 64 : 36) - 72) / SPAN);
    }
    function snapPos(api) {
      const out = new Map(); if (!api || !api.inner.isConnected) return out;
      const ir = api.inner.getBoundingClientRect(), s = (ir.width / api.inner.offsetWidth) || 1;
      api.items.forEach((node, id) => { if (!node.isConnected) return; const r = node.getBoundingClientRect(); out.set(id, { x: (r.left - ir.left) / s, y: (r.top - ir.top) / s, w: r.width / s, h: r.height / s, node }); });
      return out;
    }
    function flip(api, old, o) {
      const now = snapPos(api), moved = [];
      now.forEach((p, id) => {
        const q = old.get(id), n = p.node;
        if (n.classList.contains('v6-lift')) return;
        if (!q) { if (o.tintOk(id)) moved.push(n); if (o.glide) { n.style.opacity = '0'; requestAnimationFrame(() => { n.style.transition = 'opacity .35s'; n.style.opacity = ''; }); } return; }
        const dx = q.x - p.x, dy = q.y - p.y, dw = q.w - p.w;
        if ((Math.abs(dx) > .5 || Math.abs(dw) > .5) && o.tintOk(id)) moved.push(n);
        if (!o.glide || (Math.abs(dx) < .5 && Math.abs(dy) < .5 && Math.abs(dw) < .5)) return;
        const w0 = n.style.width;
        n.style.transition = 'none'; n.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; if (Math.abs(dw) > .5) n.style.width = q.w + 'px';
        void n.offsetWidth;
        n.style.transition = 'transform .32s cubic-bezier(.2,.8,.2,1), width .32s cubic-bezier(.2,.8,.2,1)';
        n.style.transform = ''; n.style.width = w0;
        setTimeout(() => { n.style.transition = ''; }, 380);
      });
      if (o.glide) old.forEach((q, id) => {
        if (now.has(id)) return;
        const g = q.node; g.classList.remove('sel', 'v6-held', 'v6-arr', 'v6-tint', 'v6-shake');
        Object.assign(g.style, { position: 'absolute', left: q.x + 'px', top: q.y + 'px', width: q.w + 'px', height: q.h + 'px', margin: '0', transform: '', transition: 'none' });
        api.inner.appendChild(g); void g.offsetWidth; g.classList.add('v6-ghost');
        setTimeout(() => g.remove(), 360);
      });
      if (o.tint) moved.forEach(n => { n.style.setProperty('--who', o.color); n.classList.add(reduced() ? 'v6-tint-static' : 'v6-tint'); });
      return moved.length;
    }

    function drawSide(side, how) {
      how = how || {};
      if (!S) return;
      const V = views[side], P = S[side], oSide = other(side), O = S[oSide];
      const editor = side === 'sam' ? 'quick' : ezEditor;
      if (!V.f || V.editor !== editor || V.mac !== !!W()[side].mac) makeFrame(side, editor);
      const f = V.f;
      if (visible(V)) f.fit();
      const old = (how.anim || how.forward) && visible(V) ? snapPos(V.api) : null;
      f.root.classList.toggle('v6-viewer', !!P.viewer);
      /* the picture */
      const pic = withThumbs('stage', P.t, () => VIS.stage(f.stage, doc(P), P.t, { selected: P.sel }));
      stageExtras(side, P, pic, how);
      f.setTime(P.t, 30);
      /* the timeline */
      const opts = {
        pxPerSec: ppsFor(f, editor), time: P.t, selected: P.sel,
        onTap: id => { P.sel = P.sel === id ? null : id; drawSide(side, {}); },
        onScrub: t => scrub(side, t)
      };
      V.api = withThumbs('strip', 0, () => editor === 'full' ? VIS.drawFull(f.timeline, doc(P), opts)
        : VIS.drawQuick(f.timeline, doc(P), Object.assign({ open: V.open || cs.open, maxLanes: 2, onOpen: s => { V.open = s; drawSide(side, {}); } }, opts)));
      decorate(side, V, P, O, how);
      drawTray(side, V, P, editor, how);
      drawToast(side, V, P, editor);
      drawExtras(side, V, P, editor);
      drawBubble(side, P, editor);
      /* the glide (§10.4 4d): a person's own edits always move smoothly in Quick; a friend's ripple glides only from Phase 4 and
         only in Quick, tinted in the mover's colour for a second; Full rebuilds and outlines the moved clips instead (§8.10). */
      if (old) {
        const glide = !reduced() && how.anim && (how.recv ? (S.phase >= 4 && !S.hypo && editor === 'quick') : true);
        const tint = !!how.recv && how.forward && S.phase >= 4 && !S.hypo;
        const d = doc(P), clipIds = new Set(d.layers.filter(l => E.hasFlag(l, 'main') || l.type === 'image' || (l.type === 'text' && !Array.isArray(l.captions))).map(l => l.id));
        flip(V.api, old, { glide, tint, color: S.who[oSide].color, tintOk: id => clipIds.has(id) });
      }
      (how.anims || []).filter(a => a.side === side).forEach(a => runAnim(side, V, a));
    }
    const doc = P => P.ed.doc;

    function stageExtras(side, P, pic, how) {
      const V = views[side], f = V.f, oSide = other(side), o = S.who[oSide], oEd = oSide === 'sam' ? 'quick' : ezEditor;
      const pres = el('div', 'v6-pres' + (how.pulse ? ' pulse' : ''),
        '<span class="v6-pchip"><span class="v6-pface" style="--who:' + o.color + '">' + o.ch + '<span class="g">' + (oEd === 'quick' ? GQ : GF) + '</span></span>' +
        esc(o.chip) + ' · ' + (oEd === 'quick' ? 'Quick' : 'Full') + '</span>');
      f.stage.appendChild(pres);
      const live = VIS.chip(side === 'sam' ? 'Live · Ezra' : 'LIVE', 'live'); live.classList.add('v6-livechip'); f.stage.appendChild(live);
      if (side === 'ez' && P.tool && P.tool.kind === 'crop') {
        const c4 = lay(doc(P), 'c4');
        if (c4 && P.t >= c4.start && P.t < c4.start + c4.duration) pic.el.appendChild(el('div', 'v6-crop', '<i></i><i></i><i></i><i></i>'));
      }
      if (P.kmf) f.stage.appendChild(el('div', 'v6-kmf', VIS.icon('check') + '<span>Same frame</span>'));
      if (S.hypo) f.stage.appendChild(el('div', 'v6-hypo', 'Without the stop'));
    }

    function decorate(side, V, P, O, how) {
      const api = V.api, oSide = other(side), oWho = S.who[oSide];
      const rh = el('div', 'v6-rhead', '<b>' + oWho.ch + '</b>'); rh.style.setProperty('--who', oWho.color); rh.style.left = api.xOf(O.t) + 'px';
      rh.title = oWho.name + "'s playhead"; api.inner.appendChild(rh); V.rhead = rh;
      /* what the other person is holding wears their colour: a lease from Phase 1, an animation from Phase 4 */
      if (P.hold && (P.hold.kind === 'lease' || S.phase >= 4)) {
        let it = null;
        if (P.hold.cue) it = [...api.inner.querySelectorAll('.fm-cue')].find(c => c.title === P.hold.cue) || null;
        it = it || api.items.get(P.hold.id);
        if (it) { it.classList.add('v6-held'); it.style.setProperty('--who', oWho.color); }
      }
      if (P.arr) P.arr.ids.forEach((id, i) => {
        const it = api.items.get(id); if (!it) return;
        it.classList.add('v6-arr'); it.style.setProperty('--who', oWho.color);
        if (!i && it.parentNode) {                                  // the label sits just after the clip, so a short clip never cuts it off
          const tag = el('span', 'v6-arrtag', esc(oWho.chip) + ' · clip row'); tag.style.setProperty('--who', oWho.color);
          tag.style.left = (it.offsetLeft + it.offsetWidth + 4) + 'px'; tag.style.top = (it.offsetTop + Math.max(0, (it.offsetHeight - 16) / 2)) + 'px';
          it.parentNode.appendChild(tag);
        }
      });
      if (P.drag) {
        const it = api.items.get(P.drag.id);
        if (it) { it.classList.add('v6-lift'); it.style.left = (P.drag.x * api.pps) + 'px'; const c = el('div', 'v6-caret'); c.style.left = '0px'; it.parentNode.appendChild(c); }
      }
      if (P.shake && how.forward) { const it = api.items.get(P.shake); if (it) it.classList.add('v6-shake'); }
      (P.marks || []).forEach(m => {
        const it = api.items.get(m.on), l = lay(doc(P), m.on); if (!it || !l) return;
        if (m.kind === 'kept' && V.editor === 'quick') return;                 // Quick draws no keyframes
        const d = el('i', 'v6-' + m.kind, m.kind === 'lost' ? '✕' : ''); d.style.left = ((m.at - l.start) * api.pps) + 'px';
        d.title = m.kind === 'lost' ? (l.type === 'text' ? 'Under every clip now' : 'Your keyframe was here') : 'Your keyframe, on the same frame'; it.appendChild(d);
        if (m.kind === 'lost') keepInView(api, it);
      });
    }
    function keepInView(api, it) {
      const sc = api.scroller; if (!sc || !sc.isConnected) return;
      const r = it.getBoundingClientRect(), sr = sc.getBoundingClientRect(); if (!sr.height) return;
      const s = (sr.height / sc.offsetHeight) || 1;
      if (r.bottom > sr.bottom - 4) sc.scrollTop += (r.bottom - sr.bottom + 10) / s;
      else if (r.top < sr.top + 20) sc.scrollTop -= (sr.top + 20 - r.top) / s;
    }

    function lineEl(msg, fresh, press) {
      const d = el('div', 'v6-line' + (fresh ? ' in' : ''), '<span class="t">' + esc(msg.text) + '</span>' + (msg.btns || []).map(b =>
        '<span class="b' + (press === b ? ' press' : '') + '"' + (b === 'Show' && msg.show ? ' data-show="' + esc(msg.show) + '"' : '') + '>' + esc(b) + '</span>').join(''));
      d.setAttribute('role', 'status'); d.title = msg.text;
      return d;
    }
    function drawTray(side, V, P, editor, how) {
      const f = V.f;
      const inTray = P.msg && editor === 'quick' && !(P.msg.quiet && P.tool);   // a no-button line never replaces a tool someone is typing in
      const key = inTray ? P.msg.text : '';
      const fresh = !!how.anim && key && key !== V.lastMsg;
      V.lastMsg = key;
      f.tray.innerHTML = '';
      if (inTray) { f.tray.appendChild(lineEl(P.msg, fresh, P.press)); return; }
      if (P.tool) { f.tray.innerHTML = toolHTML(P.tool); return; }
      const R = E.classify(doc(P));
      if (editor === 'quick' && P.sel && R.isMain(P.sel)) { const tb = VIS.toolbar(f.tray, VIS.CLIP_TRAY); if (P.hl) tb.set(P.hl, { hl: true, on: true }); return; }
      if (editor === 'quick' && P.sel && R.units[P.sel]) { VIS.toolbar(f.tray, VIS.ITEM_TRAY); return; }
      const clips = R.main.filter(e => !e.slot).length;
      const sel = P.sel && lay(doc(P), P.sel);
      f.tray.innerHTML = '<div class="fm-say">' + (sel ? '<b>' + esc(sel.name || sel.id) + '</b> · picked' : '<b>' + clips + ' clips</b> · ' + VIS.fmt(R.trackEnd)) + '</div>';
    }
    function sliderHTML(v) { const pc = Math.round(v * 100); return '<div class="v6-slider"><s style="width:' + pc + '%"></s><i style="left:' + pc + '%"></i></div>'; }
    function toolHTML(t) {
      if (t.kind === 'kf') return '<div class="v6-tool"><span class="v6-tname">' + esc(t.label) + '</span>' + sliderHTML(t.val) + '<span class="v6-kfb' + (t.key ? ' on' : '') + '" title="Keyframe"><b></b></span></div>';
      if (t.kind === 'crop') return '<div class="v6-tool">' + VIS.icon('crop') + '<span class="v6-tname">Crop · Sunset</span><span class="v6-grow"></span><span class="v6-pill">Reset</span><span class="v6-pill on">Done</span></div>';
      if (t.kind === 'text') return '<div class="v6-tool">' + (t.label ? '<span class="v6-tname cc">' + esc(t.label) + '</span>' : '') +
        '<div class="v6-field' + (t.gone ? ' gone' : '') + '"><span class="txt">' + esc(t.text) + '</span><i class="caret"></i></div>' +
        (t.gone ? '<span class="v6-gone">Deleted</span>' : '<span class="v6-pill on">Done</span>') + '</div>';
      if (t.kind === 'opacity') return '<div class="v6-tool"><span class="v6-tname">Opacity</span>' + sliderHTML(t.val) + '<span class="v6-val">' + Math.round(t.val * 100) + '%</span><span class="v6-kfb on" title="Keyframe"><b></b></span></div>';
      return '';
    }
    function drawToast(side, V, P, editor) {
      const t0 = V.f.root.querySelector(':scope > .fm-toast');
      if (editor === 'full' && P.msg) {
        const m = P.msg;
        const act = m.btns && m.show ? { label: 'Show', run: () => { if (S) { S[side].sel = m.show; S[side].msg = null; drawSide(side, {}); } } } : null;
        VIS.toast(V.f.root, m.text, act, { ms: 0, bottom: 64 });
      } else if (t0) t0.classList.remove('show');
    }
    /* the Options › menu, the Share panel's people, and a pressed play-bar button */
    function drawExtras(side, V, P, editor) {
      const f = V.f;
      f.root.querySelectorAll(':scope > .v6-menu, :scope > .v6-sheet').forEach(n => n.remove());
      f.playbar.querySelectorAll('.v6-pressed').forEach(n => n.classList.remove('v6-pressed'));
      if (P.press) { const b = f.playbar.querySelector('[data-act="' + P.press + '"]'); if (b) b.classList.add('v6-pressed'); }
      if (P.menu && editor === 'quick') {
        const m = el('div', 'v6-menu', P.menu.map(x => '<div class="mi">' + esc(x) + '</div>').join(''));
        m.setAttribute('role', 'menu'); f.root.appendChild(m);
        m.style.bottom = (f.root.clientHeight - f.tray.offsetTop + 6) + 'px';
      }
      if (P.sheet) {
        const w = S.who;
        const face = s => '<span class="v6-pface" style="--who:' + w[s].color + '">' + w[s].ch + '<span class="g">' + GQ + '</span></span>';
        f.root.appendChild(el('div', 'v6-sheet',
          '<div class="sh-h"><b>Share · Beach day</b><span class="sh-done tap">Done</span></div>' +
          '<div class="sh-sub">People</div>' +
          '<div class="sh-row">' + face('ez') + '<div class="sh-n"><b>' + esc(w.ez.chip) + '</b><small>Owner · this device</small></div></div>' +
          '<div class="sh-row on">' + face('sam') + '<div class="sh-n"><b>' + esc(w.sam.chip) + '</b><small>Editor ▾</small></div></div>' +
          '<div class="sh-me tap"><span class="box">✓</span>This is me (my other device)</div>' +
          '<div class="sh-foot">Whoever you give the link to joins as an Editor ▾</div>'));
      }
    }
    function drawBubble(side, P, editor) {
      const b = views[side].bubble; b.classList.remove('wait');
      const bits = [];
      if (P.msg) bits.push('<span class="q">“' + esc(P.msg.text) + '”</span>' + (P.msg.btns || []).map(x => ' <span class="pill">' + esc(x) + '</span>').join(''));
      if (P.menu) bits.push('<span>A menu opens: ' + P.menu.map(x => '<span class="pill">' + esc(x) + '</span>').join(' ') + '</span>');
      if (P.sheet) bits.push('<span>Share is open. Your phone\'s row is ticked “This is me (my other device)”.</span>');
      if (P.note) bits.push('<span>' + esc(P.note) + '</span>');
      if (P.kmf) bits.push('<span>The playhead moved with the clip, so the picture stayed on the same frame.</span>');
      b.classList.toggle('none', !bits.length); b.classList.toggle('hypo', !!S.hypo);
      const where = S.who[side].on + (P.msg && editor === 'full' ? ' (a note at the bottom)' : '');
      b.innerHTML = '<small>' + esc(where) + '<span class="go">Show ›</span></small>' + (bits.length ? bits.join('<br>') : '<span>Nothing new.</span>');
    }

    function runAnim(side, V, a) {
      if (reduced()) return;
      const g = gen;
      if (a.kind === 'slider') {
        const s = V.f.tray.querySelector('.v6-slider'); if (!s) return;
        const fill = s.querySelector('s'), knob = s.querySelector('i'), val = V.f.tray.querySelector('.v6-val');
        const to = Math.round(a.to * 100), from = Math.round(a.from * 100);
        fill.style.transition = knob.style.transition = 'none'; fill.style.width = from + '%'; knob.style.left = from + '%'; void s.offsetWidth;
        fill.style.transition = knob.style.transition = ''; fill.style.width = to + '%'; knob.style.left = to + '%';
        const layer = side === 'ez' && V.f.stage.querySelector('.fm-canvas .cv-layer');
        if (val) { let i = 0; const n = 14; const tick = () => { if (g !== gen) return; i++; val.textContent = Math.round(from + (to - from) * i / n) + '%'; if (i < n) setTimeout(tick, 55); }; tick(); }
        if (layer && val) { const op = parseFloat(layer.style.opacity || '1'); layer.style.transition = 'none'; layer.style.opacity = String(a.from); void layer.offsetWidth; layer.style.transition = 'opacity .9s'; layer.style.opacity = String(op); }
        return;
      }
      if (a.kind === 'type') {
        const field = V.f.tray.querySelector('.v6-field .txt');
        const cv = [...V.f.stage.querySelectorAll('.cv-text, .cv-cap span')].find(x => x.textContent === a.to) || null;   // the words on the picture
        const common = a.to.startsWith(a.from) ? a.from.length : 0;
        let i = common;
        const put = s => { if (field) field.textContent = s; if (cv) cv.textContent = s; };
        put(a.to.slice(0, i));
        const tick = () => { if (g !== gen || !V.f.root.isConnected) return; i++; put(a.to.slice(0, i)); if (i < a.to.length) setTimeout(tick, 70); };
        setTimeout(tick, 120);
      }
    }

    function scrub(side, t) {
      const V = views[side], P = S[side], OV = views[other(side)];
      P.t = clamp(t, 0, Math.max(0, doc(P).project.duration - 0.01)); P.kmf = false;
      if (V.api && V.api.setTime) V.api.setTime(P.t);
      const pic = withThumbs('stage', P.t, () => VIS.stage(V.f.stage, doc(P), P.t, { selected: P.sel }));
      stageExtras(side, P, pic, {}); V.f.setTime(P.t, 30);
      if (OV.rhead && OV.api) OV.rhead.style.left = OV.api.xOf(P.t) + 'px';
    }

    mode = (root.clientWidth || 0) >= TWO_AT ? 'two' : 'one';
    box.classList.add(mode);
    drawControls();
    go(0, { anim: false });
    host._shown = () => { relayout(true); };
  }

  VIS.register('v6', {
    title: 'Two people, two editors',
    group: 'Working together',
    blurb: 'Sam edits in Quick on her phone while you edit in Full, on the same project at the same time, and each release shows what it fixes.',
    mount
  });
})();
