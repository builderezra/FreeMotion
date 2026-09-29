/* V8 — The data (DESIGN §2: what is stored, the rules for the sm key, what is deliberately not stored, the read model).
 *
 * The saved file of a small project, drawn as the text it really is, with three layers of meaning:
 *   - blue: the only new keys Quick saves (sm.main, sm.stay, sm.tail, sm.tailEnd, project.sm) — §2.2
 *   - plain: fields every FreeMotion project already has — Quick reads them and adds nothing
 *   - grey dashed pills: what Quick works out each time (order, hosts, offsets, rows and lanes, seams) — §2.4, §2.5
 * Tap any key or pill for a plain-words meaning. Every pill is computed live by the kit's classifier
 * (VIS.engine.classify), and the edit buttons run the kit's real commands, so the file you see after
 * "Delete Waves" or "Close the gap" is the file the design would write. "Cooking with Mia" (made in Full)
 * starts with no Quick marks at all; its first clip edit is the adoption step (§5.3) and the marks appear.
 * The counter and the strip are measured from the file on screen (JSON.stringify), not claimed.
 * `look` is a mock-only field (the gradient thumbnails) and is left out of the file shown here.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.VIS || !window.VIS.register) return;
  const VIS = window.VIS, E = VIS.engine, el = VIS.el, esc = VIS.esc;

  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(mq && mq.matches);
  const behave = () => (reduced() ? 'auto' : 'smooth');

  VIS.register('v8', {
    title: 'The data',
    group: "How it's built",
    blurb: 'The few new things Quick saves in a project, lit up in blue, and everything it works out for itself, greyed out.',
    mount: host => mountV8(host)
  });

  /* ------------------------------------------------------------------ words and numbers */
  const num = v => { const r = Math.round(v * 1000) / 1000; return String(Object.is(r, -0) ? 0 : r); };
  const sec = t => num(Math.round(t * 100) / 100) + ' s';
  const nm = l => (l && (l.name || l.text || l.id)) || '';
  const b = s => '<b>' + esc(s) + '</b>';
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
  const andList = a => a.length <= 1 ? (a[0] || '') : a.length === 2 ? a[0] + ' and ' + a[1] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
  const ordinal = i => ORD[i] || (i + 1) + 'th';
  const SECS = ['captions', 'text', 'overlay', 'effect', 'behind'];

  /* ------------------------------------------------------------------ the read model helpers */
  const mainClips = R => R.main.filter(e => !e.slot);
  function clipNo(R, id) { let n = 0; for (const e of R.main) { if (!e.slot) n++; if (e.id === id) return e.slot ? 0 : n; } return 0; }
  function unitIdOf(R, id) { return R.unitOf.get(id) || (R.units[id] ? id : null); }
  function selUnitFor(R, owner) {
    if (!owner || owner === 'project') return null;
    const uid = unitIdOf(R, owner); const u = uid && R.units[uid];
    return u && u.section !== 'none' ? uid : null;
  }
  function laneOf(R, uid) { const u = R.units[uid]; const L = (u && R.lanes[u.section]) || []; for (let k = 0; k < L.length; k++) if (L[k].includes(uid)) return { k, n: L.length }; return null; }
  function hostName(R, hid) { if (!hid) return ''; if (String(hid).startsWith('slot:')) return 'the card'; return nm(R.layer(hid)); }
  function entryOf(R, hid) { return R.main.find(e => e.id === hid); }

  /* ------------------------------------------------------------------ meanings (§2 in plain words) */
  const TIER = {
    new: 'New · saved by Quick',
    helper: 'A plain field · now written more often',
    old: 'Already in every project',
    derived: 'Worked out · never saved'
  };
  const WHY_LABEL = { new: "Why it's saved", helper: 'Why it matters', derived: "Why it isn't saved" };

  function valAt(o, path) { return path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); }

  const MEAN = {
    'sm': c => ({ tier: 'new', title: "Quick's little box",
      body: "The only new thing on a layer. It holds a few yes-or-no marks and nothing else. Most layers never get one. Full doesn't look inside it, and an older FreeMotion keeps it untouched.",
      here: 'On ' + b(c.name) + ' it says: ' + esc(andList(Object.keys(c.v || {}).map(k => MARK_WORD[k] || k))) + '.',
      why: "It never names another layer, so copying, pasting or saving a template can't break it." }),
    'sm.main': c => {
      const n = clipNo(c.R, c.owner), N = mainClips(c.R).length;
      return { tier: 'new', title: 'In the clip row',
        body: "This clip is one of the clips in Quick's row. That's all the mark says: not where it sits in the row, and not what rides on it.",
        here: n ? b(c.name) + ' is clip ' + n + ' of ' + N + '. That number is worked out from its start time (' + esc(sec(c.l.start)) + '), not saved.' : '',
        why: "So a full-screen picture someone adds later in Full doesn't join the row by itself. It shows as an overlay with a one-tap Put in the clip row." };
    },
    'sm.stay': c => ({ tier: 'new', title: 'Stay put',
      body: 'This keeps its place when clips before it are trimmed, moved or deleted. Music gets it by itself, and you can switch any title or sticker to Stay put.',
      here: b(c.name) + ' stays at ' + esc(sec(c.l.start)) + ' whatever happens to the clips.',
      why: "It's a choice, so nothing else in the file could tell Quick." }),
    'sm.tail': c => {
      const end = c.l.start + c.l.duration, te = c.R.trackEnd, same = Math.abs(end - te) <= c.R.eps + 1e-9;
      return { tier: 'new', title: 'Ends with the video',
        body: 'When the clips get longer or shorter, this is trimmed so it ends where the last clip ends. Its fade-out comes along.',
        here: same ? b(c.name) + ' ends at ' + esc(sec(end)) + ', right where the last clip ends.' : b(c.name) + ' ends at ' + esc(sec(end)) + ' and the clips end at ' + esc(sec(te)) + '.',
        why: "It's a choice, like Stay put. Only the song and things like it have it." };
    },
    'sm.tailEnd': c => {
      const end = c.l.start + c.l.duration, fitted = Math.abs(end - c.v) <= c.R.eps + 1e-9;
      return { tier: 'new', title: 'Where it was last fitted',
        body: 'The end, in seconds, that Quick last fitted it to. If the end has moved from here, you set the length yourself, and Quick leaves it alone from then on.',
        here: fitted ? 'Fitted at ' + esc(sec(c.v)) + ', and ' + b(c.name) + ' still ends there, so Quick keeps fitting it.'
          : 'Fitted at ' + esc(sec(c.v)) + ', but ' + b(c.name) + ' now ends at ' + esc(sec(end)) + ", so Quick won't touch it.",
        why: "Without it, Quick couldn't tell an end it fitted from one you chose." };
    },
    'project.sm': c => ({ tier: 'new', title: "Quick's box on the project",
      body: 'A few facts about the whole project. A project made in Full has no box at all until your first clip edit in Quick.',
      why: 'Like the box on a layer, it never names a layer, and Full ignores it.' }),
    'project.sm.v': () => ({ tier: 'new', title: 'Which rules made the marks',
      body: 'A version number. If a newer FreeMotion ever changes the rules, an older one opens the project in Quick read-only instead of getting it wrong. Full stays editable.',
      why: "It's the one safety catch for files that travel between phones and computers." }),
    'project.sm.adopted': c => ({ tier: 'new', title: 'Quick has saved its clip row',
      body: 'Set by your first clip edit in Quick: a delete, a trim or a move. Until then Quick only looks and writes nothing, so opening an old project in Quick changes nothing.',
      here: c.adoptedNow ? 'Set just now by ' + b(c.adoptedNow) + ', in the same undo step as the edit.' : b(c.doc.project.name) + ' was made in Quick, so it was set from the start.',
      why: 'From here on the clip row stays as you made it, even when Full adds clips.' }),
    'project.sm.home': () => ({ tier: 'new', title: 'Opens in Quick',
      body: 'Which editor opens this project on a phone or computer that has never opened it. The saved word is "simple", the code\'s name for Quick.',
      why: "It's only a starting point. Each device remembers the editor you last used, and that stays on the device, never in the file, so a friend's editor never flips." }),
    'audioOnly': () => ({ tier: 'helper', title: 'Sound only',
      body: "This layer has sound and no picture. The field isn't new. What's new is that it's written the moment a song is added.",
      why: "Quick knows it's music even before the song file reaches a friend's phone, so it never mistakes it for a clip." }),
    'id': c => ({ tier: 'old', title: "The layer's tag",
      body: 'A tag the file uses to tell layers apart. You never see it.',
      here: "Quick's marks never mention one, so nothing breaks when " + b(c.name) + ' is copied, pasted or saved as a template.' }),
    'type': c => ({ tier: 'old', title: 'What kind of layer',
      body: 'Video, image, text, shape, group or camera. Quick uses it to decide which row a thing goes in.',
      here: b(c.name) + ' is ' + esc(TYPE_WORD(c.l)) + '.' }),
    'name': () => ({ tier: 'old', title: 'Its name', body: 'The name you see on the layer, in both editors.' }),
    'text': () => ({ tier: 'old', title: 'Its words', body: 'The words it shows on the picture.' }),
    'parent': c => ({ tier: 'old', title: "The group it's in", body: 'This layer sits inside a group.',
      here: b(c.name) + ' is inside ' + b(nm(c.R.layer(c.v))) + '.' }),
    'start': c => ({ tier: 'old', title: 'When it starts', body: 'Seconds from the start of the video. The order of the clip row comes from this number.',
      here: b(c.name) + ' appears at ' + esc(sec(c.v)) + '.' }),
    'duration': c => ({ tier: 'old', title: 'How long', body: 'Seconds on screen.',
      here: b(c.name) + ' is on screen for ' + esc(sec(c.v)) + ', until ' + esc(sec(c.l.start + c.v)) + '.' }),
    'trimStart': c => ({ tier: 'old', title: 'Cut off the front', body: 'How much of the video file is skipped at the start.',
      here: b(c.name) + ' skips the first ' + esc(sec(c.v)) + ' of its file.' }),
    'srcDur': c => ({ tier: 'old', title: 'The whole file', body: 'How long the original video or song file is.',
      here: b(c.name) + "'s file is " + esc(sec(c.v)) + ' long.' }),
    'speed': () => ({ tier: 'old', title: 'Speed', body: '1 is normal speed, 2 is twice as fast.' }),
    'muted': () => ({ tier: 'old', title: 'Sound off', body: "This clip's own sound is switched off." }),
    'blendMode': () => ({ tier: 'old', title: 'How it mixes', body: '"mask-alpha" means it is a mask: it cuts a shape out of the picture under it. Quick shows it as a block (✦) and moves it whole.' }),
    'shadow': () => ({ tier: 'old', title: 'A shadow on the group', body: 'It makes the whole group draw as one piece, so Quick treats it as a block (✦) and moves it whole.' }),
    'transform': () => ({ tier: 'old', title: 'Where it sits', body: 'Its size and place on the picture. 1 is full size; 0.5 is the middle.' }),
    'captions': c => ({ tier: 'old', title: 'The caption lines', body: 'Each line with its own start and end, counted from the start of this layer. Quick moves them line by line.',
      here: b(c.name) + ' has ' + plural((c.v || []).length, 'line') + '.' }),
    'kf': c => ({ tier: 'old', title: 'Its moves', body: 'Keyframes: how it changes over time. Each one carries its own time, so they come along when the layer moves.',
      here: b(c.name) + ' has ' + esc(andList(Object.keys(c.v || {}).map(k => plural(c.v[k].length, k + ' key')))) + '.' }),
    'project.name': () => ({ tier: 'old', title: "The project's name", body: 'The name on its card on Home.' }),
    'project.width': c => ({ tier: 'old', title: 'The video size', body: 'Width and height in pixels.', here: esc(c.doc.project.width + ' by ' + c.doc.project.height) + (c.doc.project.height > c.doc.project.width ? ' is a phone-shaped (tall) video.' : ' is a wide video.') }),
    'project.height': c => MEAN['project.width'](c),
    'project.fps': c => ({ tier: 'old', title: 'Frames per second', body: 'How many pictures make one second of video.', here: 'Half a frame here is ' + esc(num(1000 * 0.5 / c.v)) + ' thousandths of a second: that is how close two clips must be to count as joined.' }),
    'project.duration': c => {
      const cl = mainClips(c.R), last = cl[cl.length - 1];
      return { tier: 'old', title: 'How long the video is', body: 'Quick keeps it equal to where the last clip ends, unless something you chose runs on past it.',
        here: last ? b(esc(sec(c.v))) + (Math.abs(c.v - c.R.trackEnd) <= c.R.eps + 1e-9 ? ', which is where ' + b(nm(c.R.layer(last.id))) + ' ends.' : '. The last clip ends at ' + esc(sec(c.R.trackEnd)) + '.') : '' };
    }
  };
  const MARK_WORD = { main: 'in the clip row', stay: 'stay put', tail: 'ends with the video', tailEnd: 'where it was last fitted', twin: 'sound taken out of a clip', muteByMode: 'muted by the Mute clips switch' };
  const TYPE_WORD = l => l.audioOnly ? 'sound only (a song)' : l.type === 'video' ? 'a video' : l.type === 'image' ? 'a picture' : l.type === 'text' ? (Array.isArray(l.captions) ? 'a caption track' : 'text') : l.type === 'shape' ? 'a shape' : l.type === 'group' ? 'a group' : l.type === 'camera' ? 'a camera' : 'a ' + l.type;

  /* ------------------------------------------------------------------ worked-out pills (§2.4, §2.5) */
  function hintsFor(l, R, doc) {
    const out = [], o = l.id, name = nm(l);
    const add = (cat, text, info) => out.push(Object.assign({ key: 'h:' + o + '|' + cat, cat, text, on: name }, info));
    const uid = unitIdOf(R, o), u = uid && R.units[uid];
    if (!u) {
      add('folder', 'Just a folder', { title: 'Just a folder', body: "A plain group for tidying up. Quick shows what's in it one by one.", why: 'The group type already says it.' });
      return out;
    }
    if (uid !== o) {
      const bn = nm(R.layer(uid));
      add('member', 'Part of ' + bn, { title: 'Part of ' + bn, body: 'It moves with the ' + esc(bn) + ' block. You change it on its own in Full.', why: 'Worked out from the group it sits in.', sel: selUnitFor(R, uid) });
      return out;
    }
    if (R.isMain(o)) {
      const e = entryOf(R, o), n = clipNo(R, o), cl = mainClips(R), N = cl.length;
      const fileMain = doc.layers.filter(x => R.isMain(x.id)).findIndex(x => x.id === o);
      add('order', 'Clip ' + n + ' of ' + N, { title: 'Clip ' + n + ' of ' + N,
        body: "Worked out by putting the row's clips in start-time order. The file lists layers top to bottom, like Full's rows, not in the order they play.",
        here: b(name) + ' is the ' + ordinal(fileMain) + ' clip in the file and clip ' + n + ' in the row.',
        why: 'A saved order would be a second answer, and one drag in Full could make it wrong.', sel: o, time: e.start });
      const i = R.main.indexOf(e), prev = i > 0 ? R.main[i - 1] : null, pn = prev ? hostName(R, prev.id) : '';
      const k = e.seam.kind, amt = e.seam.amt || 0;
      let st, sb;
      if (!prev) { if (k === 'gap') { st = sec(amt) + ' of nothing first'; sb = 'The video starts with ' + esc(sec(amt)) + ' of nothing before ' + b(name) + '.'; } else { st = 'Starts the video'; sb = b(name) + ' starts at 0 s.'; } }
      else if (k === 'gap') { st = sec(amt) + ' gap before it'; sb = "There's " + esc(sec(amt)) + ' of nothing between ' + b(pn) + ' and ' + b(name) + '. Quick shows a gap block you tap to close.'; }
      else if (k === 'overlap') { st = 'Overlaps ' + pn + ' by ' + sec(amt); sb = b(name) + ' starts ' + esc(sec(amt)) + ' before ' + b(pn) + ' ends, so both show for a moment. Quick shows a red chip you tap to fix it.'; }
      else if (k === 'blend') { st = 'Fades from ' + pn; sb = b(name) + ' fades in over the end of ' + b(pn) + '.'; }
      else { st = 'Joins ' + pn; sb = b(pn) + ' ends exactly where ' + b(name) + ' starts (to within half a frame).'; }
      add('seam', st, { title: st, body: sb, why: "It's just the difference between two numbers already in the file.", sel: o, time: e.start });
      const fol = R.followers[o] || [];
      if (fol.length) {
        const names = fol.map(id => nm(R.layer(id)));
        const t = 'Carries ' + (names.length <= 2 ? andList(names) : names[0] + ' +' + (names.length - 1));
        add('carries', t, { title: t, body: 'Everything that starts on this clip comes along when it moves, and goes with it when it is deleted.',
          here: esc(andList(names)) + (names.length === 1 ? ' starts' : ' start') + ' on ' + b(name) + '.',
          why: 'Worked out from start times each time, so there is no list to keep up to date.', sel: fol[0] });
      }
      return out;
    }
    if (u.kind === 'fullOnly') add('fullOnly', 'Only in Full ✦', { title: 'Only in Full', body: "Quick shows it with ✦ and doesn't edit it. Its moves still stay in time when clips move.", why: 'The layer type already says it.' });
    if (u.kind === 'block') add('block', 'A block ✦', { title: 'A block', body: "A group or mask that draws as one piece. Quick moves it whole; you change what's inside it in Full.", why: 'Worked out from what the group does (a shadow, a mask).', sel: selUnitFor(R, uid) });
    const sel = selUnitFor(R, uid);
    if (u.host) {
      const hn = hostName(R, u.host), he = entryOf(R, u.host), off = l.start - (he ? he.start : 0);
      add('host', 'Follows ' + hn, { title: 'Follows ' + hn,
        body: 'It starts on ' + b(hn) + ', so it goes where ' + b(hn) + ' goes: move, trim or delete ' + b(hn) + ' and this comes along.',
        why: 'A saved link would need fixing every time something is copied, pasted or saved as a template, and would go wrong the moment someone drags in Full.', sel, time: l.start });
      const ot = Math.abs(off) < 1e-6 ? 'Starts with ' + hn : sec(off) + ' into ' + hn;
      add('offset', ot, { title: ot, body: 'Its start (' + esc(sec(l.start)) + ') minus ' + b(hn) + "'s start (" + esc(sec(he ? he.start : 0)) + '). When ' + b(hn) + ' moves, this keeps the same distance.',
        why: 'Two numbers already in the file.', sel, time: l.start });
    } else if (R.riders.includes(uid)) {
      add('rider', 'Moves line by line', { title: 'Moves line by line', body: "A caption track that runs across several clips isn't tied to one clip. Each line moves with the clip under it, and a line on a deleted clip goes with it.",
        why: 'The line times are already in the file.', sel });
    } else if (!E.hasFlag(l, 'stay') && R.wouldStay.includes(uid)) {
      add('wouldStay', 'Stays put', { title: 'Stays put, for now', body: "It runs the whole video, so it doesn't follow any one clip. That is worked out for now. Your first clip edit saves it as Stay put, so it can't flip later.",
        why: 'Until your first clip edit, Quick writes nothing at all.', sel });
    } else if (R.tail.includes(uid)) {
      add('tailFollow', 'Follows the end', { title: 'Follows the end', body: 'It sits after the last clip, so it moves when the video gets longer or shorter.', why: 'Worked out from where the clips end.', sel });
    }
    if (u.section && u.section !== 'none' && u.section !== 'main') {
      const ln = laneOf(R, uid), sn = VIS.SECTION_NAME[u.section] || u.section;
      const t = sn + ' row' + (ln && ln.n > 1 ? ' · lane ' + (ln.k + 1) : '');
      add('row', t, { title: t,
        body: 'Which row comes from what kind of thing it is: captions, text, overlays, effects or sound. Lanes inside a row are packed fresh each time, so two things never sit on top of each other.',
        why: 'The kind of layer already says it.', sel });
    }
    return out;
  }
  function projectHints(R, doc) {
    const out = [], P = doc.project;
    const add = (cat, text, info) => out.push(Object.assign({ key: 'h:project|' + cat, cat, text, on: 'the project' }, info));
    const cl = mainClips(R);
    if (cl.length) {
      const names = cl.map(e => nm(R.layer(e.id)));
      add('prow', 'Clip row: ' + names.join(' → '), { title: 'The clip row', body: R.adopted
        ? 'The clips with the in-the-row mark, put in start-time order. The mark says which clips; the start times say the order.'
        : 'The full-screen clips, in start-time order. Nothing is saved: Quick works this out fresh every time, until your first clip edit.',
        why: 'A saved list of clips would need fixing on every copy and paste, and Full would never keep it up to date.' });
      add('pend', 'Video ends at ' + sec(R.trackEnd), { title: 'Where the video ends', body: 'Where the last clip ends. Things marked Ends with the video are fitted to this.',
        here: b(names[names.length - 1]) + ' ends at ' + esc(sec(R.trackEnd)) + '.', why: "It's the last clip's start plus its length." });
    }
    const rows = SECS.filter(s => R.lanes[s] && R.lanes[s].length).map(s => VIS.SECTION_NAME[s]);
    if (R.lanes.audio && R.lanes.audio.length) rows.push('Sound');
    if (rows.length) add('prows', 'Rows: ' + rows.join(', '), { title: "Quick's rows", body: 'Which rows Quick draws above and below the clips, from the kinds of things in the project.', why: 'Nothing to save: the layers already say what they are.' });
    void P;
    return out;
  }

  /* ------------------------------------------------------------------ the file, measured */
  function displayDoc(doc) {
    const d = E.clone(doc);
    d.layers.forEach(l => { delete l.look; });
    return d;
  }
  function measure(doc) {
    const d = displayDoc(doc);
    const pieces = [];
    let s = '{"project":'; const pStart = s.length; const pj = JSON.stringify(d.project); s += pj;
    pieces.push({ a: pStart, b: s.length, json: pj });
    s += ',"layers":[';
    d.layers.forEach((l, i) => { if (i) s += ','; const a = s.length, j = JSON.stringify(l); s += j; pieces.push({ a, b: s.length, json: j }); });
    s += ']}';
    const marks = [];
    let chars = 0, count = 0;
    pieces.forEach(p => {
      const k = p.json.indexOf('"sm":{');
      if (k < 0) return;
      const end = p.json.indexOf('}', k);
      marks.push({ a: p.a + k, b: p.a + end + 1 });
      chars += end + 1 - k;
    });
    if (d.project.sm) count += Object.keys(d.project.sm).length;
    d.layers.forEach(l => { if (l.sm) count += Object.keys(l.sm).length; });
    return { len: s.length, pieces, marks, chars, count };
  }
  function flat(doc) {
    const m = new Map();
    const put = (o, k, v) => m.set(o + '|' + k, JSON.stringify(v));
    const walk = (o, obj) => { for (const k in obj) { if (k === 'look') continue; const v = obj[k]; if ((k === 'sm' || k === 'transform') && v && typeof v === 'object' && !Array.isArray(v)) { m.set(o + '|' + k, '{}'); for (const s in v) put(o, k + '.' + s, v[s]); } else put(o, k, v); } };
    walk('project', doc.project);
    doc.layers.forEach(l => walk(l.id, l));
    return m;
  }
  function countNums(a, b) {
    if (typeof a === 'number' || typeof b === 'number') return (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9) ? 0 : 1;
    if (a && typeof a === 'object' && b && typeof b === 'object') { let n = 0; const ks = new Set([...Object.keys(a), ...Object.keys(b)]); ks.forEach(k => { n += countNums(a[k], b[k]); }); return n; }
    if (a && typeof a === 'object') return countNums(a, {});
    if (b && typeof b === 'object') return countNums({}, b);
    return 0;
  }
  function diffDocs(A, B) {
    const fa = flat(A), fb = flat(B), chg = new Set(), born = new Set();
    const ida = new Set(A.layers.map(l => l.id)), idb = new Set(B.layers.map(l => l.id));
    const gone = [...ida].filter(i => !idb.has(i)), back = [...idb].filter(i => !ida.has(i));
    // a layer that comes back (undo) flashes whole, as itself; only keys new on a layer that was already there glow blue
    fb.forEach((v, k) => { const o = k.slice(0, k.indexOf('|')); if (o !== 'project' && !ida.has(o)) return; if (!fa.has(k)) born.add(k); else if (fa.get(k) !== v) chg.add(k); });
    let nums = countNums(A.project, B.project);
    B.layers.forEach(l => { const o = A.layers.find(x => x.id === l.id); if (o) { const x = E.clone(o), y = E.clone(l); delete x.sm; delete y.sm; delete x.look; delete y.look; nums += countNums(x, y); } });
    const mA = measure(A).count, mB = measure(B).count;
    return { chg, born, gone, back, nums, marks: mB - mA };
  }

  /* ------------------------------------------------------------------ drawing the file */
  const KEY_ORDER = ['id', 'type', 'name', 'text', 'parent', 'start', 'duration', 'trimStart', 'srcDur', 'speed', 'audioOnly', 'muted', 'visible', 'locked', 'blendMode', 'shadow', 'opacity', 'transform', 'captions', 'kf', 'sm'];
  const PROJ_ORDER = ['name', 'width', 'height', 'fps', 'duration', 'sm'];
  const SHORT_HIDE = new Set(['trimStart', 'srcDur', 'speed', 'transform']);
  const rank = order => k => { const i = order.indexOf(k); return i < 0 ? 900 : i; };
  const sortKeys = (obj, order) => Object.keys(obj).filter(k => k !== 'look').sort((a, c) => rank(order)(a) - rank(order)(c));

  function jv(v) {
    if (typeof v === 'string') return '<span class="v t-s">"' + esc(v) + '"</span>';
    if (typeof v === 'number') return '<span class="v t-n">' + esc(num(v)) + '</span>';
    if (typeof v === 'boolean') return '<span class="v t-b">' + v + '</span>';
    if (v === null) return '<span class="v t-b">null</span>';
    return '<span class="v">' + esc(JSON.stringify(v)) + '</span>';
  }

  function mountV8(host) {
    injectCSS();
    const root = el('div', 'v8');
    host.appendChild(root);

    const PROJ = {
      beach: { label: 'Beach day', sub: 'made in Quick', make: () => VIS.sample('beach') },
      messy: { label: 'Cooking with Mia', sub: 'made in Full', make: () => VIS.sample('messy') }
    };
    const eds = {};
    const edOf = k => eds[k] || (eds[k] = E.editor(PROJ[k].make()));
    let saved = null;
    try { saved = localStorage.getItem('vis.v8.proj'); } catch (e) { saved = null; }
    const S = { proj: saved === 'messy' ? 'messy' : 'beach', short: true, hints: true, sel: null, expanded: new Set(), openSec: null, wide: false, adoptedNow: {}, status: {} };
    const ed = () => edOf(S.proj);
    let hintMap = new Map();
    let flash = null;                     // {chg, born} for the next file draw
    let lastCount = null;

    root.innerHTML =
      '<p class="v8-lede">This is how a project is saved: plain text, one block per layer. Quick adds very little to it, and the blue bits are all of it. The grey dashed notes are what Quick works out each time it opens the project. They are never saved.</p>' +
      '<ul class="v8-legend" aria-label="Key">' +
        '<li><span class="v8-sw new">"main": true</span><span>New, saved by Quick</span></li>' +
        '<li><span class="v8-sw old">"start": 3.4</span><span>Already in every project</span></li>' +
        '<li><span class="v8-sw der">Clip 2 of 4</span><span>Worked out, never saved</span></li>' +
      '</ul>' +
      '<div class="v8-seg" role="group" aria-label="Project"></div>' +
      '<div class="v8-grid">' +
        '<div class="v8-meter h-card" aria-live="polite"></div>' +
        '<div class="v8-edits"></div>' +
        '<aside class="v8-side" aria-label="What Quick draws">' +
          '<p class="v8-lenscap">What Quick draws from this file</p>' +
          '<div class="fm v8-lens"><div class="fm-tlwrap"></div></div>' +
          '<div class="v8-cardslot"></div>' +
        '</aside>' +
        '<div class="v8-filewrap">' +
          '<div class="v8-filebar">' +
            '<button type="button" class="v8-switch" role="switch" aria-checked="true"><span class="trk" aria-hidden="true"></span><span>Show what Quick works out</span></button>' +
            '<div class="v8-mini" role="group" aria-label="How much to show"><button type="button" data-short="1">Short</button><button type="button" data-short="0">Every field</button></div>' +
          '</div>' +
          '<div class="v8-file" role="group" aria-label="The saved project file"></div>' +
        '</div>' +
      '</div>' +
      whyHTML();

    const q = s => root.querySelector(s);
    const segEl = q('.v8-seg'), grid = q('.v8-grid'), meterEl = q('.v8-meter'), editsEl = q('.v8-edits');
    const side = q('.v8-side'), lensWrap = q('.v8-lens .fm-tlwrap'), cardSlot = q('.v8-cardslot');
    const fileEl = q('.v8-file'), sw = q('.v8-switch'), mini = q('.v8-mini');
    const card = el('div', 'v8-card');
    card.setAttribute('role', 'region'); card.setAttribute('aria-label', 'What this means'); card.setAttribute('aria-live', 'polite');

    /* project picker */
    Object.keys(PROJ).forEach(k => {
      const bt = el('button', '', '<span>' + esc(PROJ[k].label) + '</span><small>' + esc(PROJ[k].sub) + '</small>');
      bt.type = 'button'; bt.dataset.p = k;
      bt.addEventListener('click', () => { if (S.proj === k) return; S.proj = k; S.sel = null; S.openSec = null; S.expanded.clear(); flash = null; lastCount = null; try { localStorage.setItem('vis.v8.proj', k); } catch (e) { /* private mode */ } renderAll(true); });
      segEl.appendChild(bt);
    });
    sw.addEventListener('click', () => { S.hints = !S.hints; if (S.sel && S.sel.startsWith('h:')) S.sel = null; renderFile(true); placeCard(); drawLens(); renderMeter(); });
    mini.addEventListener('click', e => { const bt = e.target.closest('button'); if (!bt) return; S.short = bt.dataset.short === '1'; S.expanded.clear(); renderFile(false); placeCard(); });

    /* taps inside the file */
    fileEl.addEventListener('click', e => {
      const more = e.target.closest('[data-more]');
      if (more) { S.expanded.add(more.dataset.more); renderFile(false); placeCard(); return; }
      const t = e.target.closest('[data-p],[data-h]');
      if (!t || !fileEl.contains(t) || card.contains(t)) return;
      const key = t.dataset.h || t.dataset.p;
      select(S.sel === key ? null : key, { from: 'file' });
    });
    card.addEventListener('click', e => { if (e.target.closest('.v8-x')) select(null, { from: 'close' }); });

    /* ---------------- the pieces ---------------- */
    function renderSeg() { segEl.querySelectorAll('button').forEach(bt => bt.setAttribute('aria-pressed', String(bt.dataset.p === S.proj))); }

    function renderMeter() {
      const doc = ed().doc, m = measure(doc), R = E.classify(doc);
      let facts = projectHints(R, doc).length; doc.layers.forEach(l => { facts += hintsFor(l, R, doc).length; });
      const zero = m.count === 0;
      let strip = '';
      m.pieces.forEach((p, i) => { if (i === 0) return; strip += '<i class="lay" style="left:' + (100 * p.a / m.len).toFixed(3) + '%;width:' + (100 * (p.b - p.a) / m.len).toFixed(3) + '%"></i>'; });
      m.marks.forEach(k => { strip += '<i class="mk" style="left:' + (100 * k.a / m.len).toFixed(3) + '%;width:' + (100 * (k.b - k.a) / m.len).toFixed(3) + '%"></i>'; });
      meterEl.innerHTML =
        '<div class="v8-mrow">' +
          '<span class="v8-big' + (zero ? ' zero' : '') + '"><b>' + m.count + '</b><span>' + (zero ? 'marks from Quick. It has written nothing.' : (m.count === 1 ? 'new mark saved by Quick' : 'new marks saved by Quick')) + '</span></span>' +
          '<span class="v8-dim"><b>' + facts + '</b> things worked out, never saved</span>' +
        '</div>' +
        '<div class="v8-strip" role="img" aria-label="' + esc('The whole file, start to end. Quick\'s marks are ' + m.chars + ' of ' + m.len + ' characters.') + '">' + strip + '</div>' +
        '<p class="v8-mcap">The whole file, start to end' + (zero ? '. No blue: nothing in it is from Quick.' : '. The blue slivers are everything Quick adds: ' + m.chars.toLocaleString('en-AU') + ' of ' + m.len.toLocaleString('en-AU') + ' characters.') + '</p>';
      if (lastCount != null && lastCount !== m.count && !reduced()) { const n = meterEl.querySelector('.v8-big b'); n.classList.add('v8-pulse'); }
      lastCount = m.count;
    }

    function editsFor() {
      const doc = ed().doc, R = E.classify(doc), has = id => doc.layers.some(l => l.id === id);
      if (S.proj === 'beach') {
        const first = mainClips(R)[0];
        return [
          { label: 'Delete Waves', icon: 'delete', ok: has('c2'), run: () => ed().run('deleteClip', { id: 'c2' }) },
          { label: 'Move Sunset first', icon: 'toStart', ok: has('c4') && first && first.id !== 'c4', run: () => ed().run('reorder', { id: 'c4', to: 0 }) }
        ];
      }
      const gap = R.main.find(e => !e.slot && e.seam.kind === 'gap');
      return [{ label: gap ? 'Close the ' + sec(gap.seam.amt) + ' gap' : 'Close the gap', icon: 'fit', ok: !!gap, run: () => ed().run('closeGap', { id: gap.id }) }];
    }
    function renderEdits() {
      const list = editsFor();
      editsEl.innerHTML = '<p class="v8-elabel">Try an edit and watch the file</p><div class="h-row"></div><p class="v8-status" role="status"></p>';
      const row = editsEl.querySelector('.h-row');
      list.forEach(x => {
        const bt = el('button', 'h-btn', VIS.icon(x.icon) + '<span>' + esc(x.label) + '</span>'); bt.type = 'button'; bt.disabled = !x.ok;
        bt.addEventListener('click', () => doEdit(x));
        row.appendChild(bt);
      });
      const u = el('button', 'h-btn', VIS.icon('undo') + '<span>Undo</span>'); u.type = 'button'; u.disabled = !ed().canUndo();
      u.addEventListener('click', doUndo); row.appendChild(u);
      editsEl.querySelector('.v8-status').innerHTML = S.status[S.proj] || (S.proj === 'beach'
        ? 'Made in Quick, so its marks are already there.'
        : 'Made in Full and just opened in Quick. The clip row and every grey note are worked out, and nothing is written.');
    }
    function fileLine(d, undo) {
      const parts = [];
      if (d.gone.length) parts.push(plural(d.gone.length, 'layer') + ' gone');
      if (d.back.length) parts.push(plural(d.back.length, 'layer') + ' back');
      if (d.nums) parts.push(plural(d.nums, 'number') + ' changed');
      if (d.marks > 0 && !undo) parts.push(plural(d.marks, 'new mark'));
      if (d.marks < 0) parts.push(plural(-d.marks, 'mark') + ' gone');
      return parts.length ? 'In the file: ' + parts.join(', ') + '.' : 'The file did not change.';
    }
    function doEdit(x) {
      const before = E.clone(ed().doc);
      const res = x.run();
      if (!res || !res.ok) { S.status[S.proj] = esc((res && res.say) || 'That edit was refused.'); renderEdits(); return; }
      const d = diffDocs(before, ed().doc);
      if (res.adopted) S.adoptedNow[S.proj] = x.label;
      let tail;
      if (res.adopted) tail = ' This was your first clip edit in Quick, so it saved its clip row: the new blue marks. Full ignores them.';
      else if (d.gone.length) tail = ' Nothing else had to change: nothing in the file points at another layer.';
      else tail = " The order isn't saved anywhere. The new start times are the new order.";
      S.status[S.proj] = b(res.say || x.label) + '. ' + esc(fileLine(d)) + esc(tail);
      flash = d;
      if (S.sel) { const o = ownerOf(S.sel); if (o !== 'project' && !ed().doc.layers.some(l => l.id === o)) S.sel = null; }
      renderAll(false);
    }
    function doUndo() {
      const before = E.clone(ed().doc);
      if (!ed().undo()) return;
      const d = diffDocs(before, ed().doc);
      if (!ed().canUndo()) delete S.adoptedNow[S.proj];
      S.status[S.proj] = b('Undone') + '. ' + esc(fileLine(d, true)) + (ed().canUndo() ? '' : ' The file is back as it was.');
      flash = d;
      if (S.sel) { const o = ownerOf(S.sel); if (o !== 'project' && !ed().doc.layers.some(l => l.id === o)) S.sel = null; }
      renderAll(false);
    }

    function fieldHTML(o, k, v, last) {
      const comma = last ? '' : '<span class="pu">,</span>';
      const cls = x => (flash && flash.chg.has(o + '|' + x) ? ' chg' : '') + (flash && flash.born.has(o + '|' + x) ? ' born' : '');
      const tok = (path, label, valueHTML, tier, isLast) =>
        '<button type="button" class="v8-kv t-' + tier + cls(path) + '" data-p="' + esc(o + '|' + path) + '"><span class="k">"' + esc(label) + '"</span><span class="pu">: </span>' + valueHTML + (isLast ? '' : '<span class="pu">,</span>') + '</button>';
      if ((k === 'sm' || k === 'transform') && v && typeof v === 'object') {
        const tier = k === 'sm' ? 'new' : 'old', ks = Object.keys(v);
        const short = JSON.stringify(v).length + 6 <= 30;
        let h = '<span class="v8-grp g-' + tier + (short ? ' nw' : '') + cls(k) + '">' +
          '<button type="button" class="v8-kv t-' + tier + '" data-p="' + esc(o + '|' + k) + '"><span class="k">"' + k + '"</span><span class="pu">: {</span></button> ';
        // The last key and the group's closing brace never part: a wrap between them left a lone blue "}" on a line.
        ks.forEach((s, i) => {
          const t = tok(k + '.' + s, s, jv(v[s]), tier, i === ks.length - 1);
          h += i < ks.length - 1 ? t + ' ' : '<span class="v8-nw">' + t + ' <span class="pu">}</span>' + comma + '</span>';
        });
        return h + (ks.length ? '' : '<span class="pu">}</span>' + comma) + '</span>';
      }
      if (k === 'captions' && Array.isArray(v)) {
        if (S.short && !S.expanded.has(o)) return tok(k, k, '<span class="v v8-fold">[ ' + plural(v.length, 'line') + ' ]</span>', 'old', last);
        let h = '<button type="button" class="v8-kv t-old' + cls(k) + '" data-p="' + esc(o + '|captions') + '"><span class="k">"captions"</span><span class="pu">: [</span></button>';
        v.forEach((c, i) => {
          h += '<span class="v8-sub" data-p="' + esc(o + '|captions') + '"><span class="pu">{ </span><span class="v8-nw">"start": <span class="t-n">' + num(c.start) + '</span>,</span> <span class="v8-nw">"end": <span class="t-n">' + num(c.end) + '</span>,</span> <span class="v8-nw">"text": <span class="t-s">"' + esc(c.text) + '"</span></span><span class="pu"> }' + (i < v.length - 1 ? ',' : '') + '</span></span>';
        });
        return h + '<span class="pu">]</span>' + comma;
      }
      if (k === 'kf' && v && typeof v === 'object') {
        const ks = Object.keys(v);
        if (S.short && !S.expanded.has(o)) return tok(k, k, '<span class="v v8-fold">{ ' + esc(ks.map(p => p + ': ' + plural(v[p].length, 'key')).join(', ')) + ' }</span>', 'old', last);
        let inner = ks.map(p => '<span class="v8-nw">"' + esc(p) + '": [</span> ' + v[p].map(x => '<span class="v8-nw">{ "t": <span class="t-n">' + num(x.t) + '</span>, "v": <span class="t-n">' + num(x.v) + '</span> }</span>').join('<span class="pu">,</span> ') + ' <span class="pu">]</span>').join('<span class="pu">,</span> ');
        return '<button type="button" class="v8-kv t-old' + cls(k) + '" data-p="' + esc(o + '|kf') + '"><span class="k">"kf"</span><span class="pu">: {</span></button> <span class="v8-kfv" data-p="' + esc(o + '|kf') + '">' + inner + '</span> <span class="pu">}</span>' + comma;
      }
      return tok(k, k, jv(v), k === 'audioOnly' ? 'helper' : 'old', last);
    }

    function hintsHTML(list, ind) {
      if (!S.hints || !list.length) return '';
      let h = '<div class="v8-hints" style="--ind:' + ind + '"><span class="lbl" aria-hidden="true">worked out</span>';
      list.forEach(x => { hintMap.set(x.key, x); h += '<button type="button" class="v8-pill" data-h="' + esc(x.key) + '">' + esc(x.text) + '</button>'; });
      return h + '</div>';
    }

    function renderFile(enter) {
      const doc = ed().doc, R = E.classify(doc);
      hintMap = new Map();
      const P = doc.project;
      let h = '<div class="v8-ln"><span class="pu">{</span></div>';
      // the project
      const pk = sortKeys(P, PROJ_ORDER);
      h += '<div class="v8-obj proj" data-o="project"><div class="v8-body"><span class="k0">"project"</span><span class="pu">: {</span> ';
      const pRest = pk.filter(k => k !== 'sm');
      pRest.forEach((k, i) => { h += fieldHTML('project', k, P[k], i === pRest.length - 1 && !P.sm) + ' '; });
      // the blue box and the object's own closing brace wrap as one piece (v8-nw outside, the box wraps inside)
      if (P.sm) h += '<br><span class="v8-nw">' + fieldHTML('project', 'sm', P.sm, true) + ' <span class="pu">},</span></span>';
      else h += '<span class="pu">},</span>';
      h += '</div>' + hintsHTML(projectHints(R, doc), '2ch') + '</div>';
      // the layers
      h += '<div class="v8-ln i1"><span class="k0">"layers"</span><span class="pu">: [</span> <span class="v8-note">top of the stack first, like Full\'s rows</span></div>';
      doc.layers.forEach((l, li) => {
        const all = sortKeys(l, KEY_ORDER);
        const hide = S.short && !S.expanded.has(l.id) ? all.filter(k => SHORT_HIDE.has(k) || (k === 'text' && l.text === l.name)) : [];
        const shown = all.filter(k => !hide.includes(k));
        const back = flash && flash.back.includes(l.id);
        h += '<div class="v8-obj lay' + (back ? ' flash' : '') + '" data-o="' + esc(l.id) + '"><div class="v8-body"><span class="pu">{</span> ';
        const hasSm = shown.includes('sm'), rest = shown.filter(k => k !== 'sm');
        rest.forEach((k, i) => { h += fieldHTML(l.id, k, l[k], i === rest.length - 1 && !hide.length && !hasSm) + ' '; });
        if (hide.length) h += '<button type="button" class="v8-more-btn" data-more="' + esc(l.id) + '" aria-label="' + esc('Show ' + plural(hide.length, 'more field') + ' of ' + nm(l)) + '">… ' + hide.length + ' more</button>' + (hasSm ? '<span class="pu">,</span>' : '') + ' ';
        const close = '<span class="pu">}' + (li < doc.layers.length - 1 ? ',' : '') + '</span>';
        h += hasSm ? '<br><span class="v8-nw">' + fieldHTML(l.id, 'sm', l.sm, true) + ' ' + close + '</span>' : close;
        h += '</div>' + hintsHTML(hintsFor(l, R, doc), '4ch') + '</div>';
      });
      h += '<div class="v8-ln i1"><span class="pu">]</span></div><div class="v8-ln"><span class="pu">}</span></div>';
      if (card.parentNode === fileEl) fileEl.removeChild(card);
      fileEl.innerHTML = h;
      fileEl.classList.toggle('enter', !!enter && S.hints && !reduced());
      if (S.sel && !keyExists(S.sel)) S.sel = null;
      markSelected();
      flash = null;
    }

    function keyExists(key) { return key.startsWith('h:') ? hintMap.has(key) : !!fileEl.querySelector('[data-p="' + cssEsc(key) + '"]'); }
    function markSelected() {
      fileEl.querySelectorAll('[aria-pressed]').forEach(n => n.removeAttribute('aria-pressed'));
      fileEl.querySelectorAll('.v8-kv,.v8-pill').forEach(n => n.setAttribute('aria-pressed', 'false'));
      if (!S.sel) return;
      const n = S.sel.startsWith('h:') ? fileEl.querySelector('[data-h="' + cssEsc(S.sel) + '"]') : fileEl.querySelector('button[data-p="' + cssEsc(S.sel) + '"]');
      if (n) n.setAttribute('aria-pressed', 'true');
    }

    /* ---------------- what a key means ---------------- */
    function ownerOf(key) { const k = key.startsWith('h:') ? key.slice(2) : key; return k.slice(0, k.indexOf('|')); }
    function infoFor(key) {
      const doc = ed().doc, R = E.classify(doc);
      if (key.startsWith('h:')) {
        const x = hintMap.get(key); if (!x) return null;
        return Object.assign({ tier: 'derived', code: null }, x);
      }
      const bar = key.indexOf('|'), owner = key.slice(0, bar), path = key.slice(bar + 1);
      const isP = owner === 'project';
      const l = isP ? doc.project : R.layer(owner);
      if (!l) return null;
      const v = valAt(l, path);
      const fn = (isP && MEAN['project.' + path]) || MEAN[path] || (path.startsWith('transform.') && MEAN.transform) ||
        (() => ({ tier: path.startsWith('sm.') ? 'new' : 'old', title: path, body: 'A field Quick reads and leaves as it is.' }));
      const ctx = { owner, path, v, l, R, doc, isP, name: isP ? doc.project.name : nm(l), adoptedNow: S.adoptedNow[S.proj] };
      const r = fn(ctx);
      const last = path.split('.').pop();
      const shown = Array.isArray(v) ? '[ ' + plural(v.length, path === 'captions' ? 'line' : 'item') + ' ]' : v && typeof v === 'object' ? '{ … }' : typeof v === 'number' ? num(v) : JSON.stringify(v);
      r.code = '"' + last + '": ' + shown;
      r.on = isP ? 'the project' : nm(l);
      r.sel = isP ? null : selUnitFor(R, owner);
      r.time = isP ? null : (R.units[unitIdOf(R, owner)] || {}).start;
      return r;
    }

    function cardHTML(x) {
      if (!x) {
        return '<div class="v8-card-top"><span class="v8-tier">How to read it</span></div>' +
          '<h3 class="v8-card-h">Tap anything in the file</h3>' +
          '<p>Blue is new: the only things Quick adds. The grey dashed notes are worked out each time the project opens and never saved. Everything else was already in every FreeMotion project.</p>' +
          '<p class="v8-whyl">' + (S.wide ? 'Or tap a clip or an item in the picture above to find it in the file.' : 'Or tap a clip or an item in the picture above to jump to it in the file.') + '</p>';
      }
      const tier = x.tier || 'old';
      let h = '<div class="v8-card-top"><span class="v8-tier t-' + tier + '">' + esc(TIER[tier]) + '</span>' +
        '<button type="button" class="v8-x" aria-label="Close">' + VIS.icon('close') + '</button></div>';
      if (tier === 'derived') h += '<p class="v8-code"><span class="v8-pill static">' + esc(x.text) + '</span> <span>on ' + esc(x.on) + '</span></p>';
      else h += '<p class="v8-code"><code class="' + (tier === 'new' ? 'new' : '') + '">' + esc(x.code) + '</code> <span>on ' + esc(x.on) + '</span></p>';
      h += '<h3 class="v8-card-h">' + esc(x.title) + '</h3>';
      h += '<p>' + x.body + '</p>';
      if (x.here) h += '<p class="v8-here">' + x.here + '</p>';
      if (x.why) h += '<p class="v8-whyl"><b>' + esc(WHY_LABEL[tier] || 'Why') + ':</b> ' + esc(x.why) + '</p>';
      if (tier === 'old') h += '<p class="v8-whyl">Quick reads it and adds nothing to it. Full uses it exactly as before.</p>';
      if (!S.wide && x.sel) h += '<div class="fm v8-cardtl"><div class="fm-tlwrap"></div></div>';
      return h;
    }

    function placeCard(opts) {
      opts = opts || {};
      const x = S.sel ? infoFor(S.sel) : null;
      if (S.sel && !x) S.sel = null;
      card.innerHTML = cardHTML(x);
      let target = cardSlot, after = null;
      if (!S.wide && S.sel) {
        const o = ownerOf(S.sel);
        after = fileEl.querySelector('.v8-obj[data-o="' + cssEsc(o) + '"]');
        if (!after) target = cardSlot;
      }
      if (after) after.insertAdjacentElement('afterend', card); else if (card.parentNode !== target) target.appendChild(card);
      if (opts.animate && !reduced()) { card.classList.remove('in'); void card.offsetWidth; card.classList.add('in'); }
      const tw = card.querySelector('.v8-cardtl .fm-tlwrap');
      if (tw && x) drawTL(tw, x.sel, false, x.time);
    }

    /* ---------------- the Quick timeline (the kit's own drawing) ---------------- */
    function tlHeight(R, open, sel) {
      const secs = SECS.filter(s => R.lanes[s] && R.lanes[s].length);
      let rows;
      if (open === 'all') rows = secs.reduce((a, s) => a + R.lanes[s].length * 30 + 1, 0);
      else {
        const u = sel && R.units[sel];
        const os = open && secs.includes(open) ? open : (u && secs.includes(u.section) ? u.section : secs[0]);
        rows = (secs.length ? 33 : 0) + (os ? Math.min(3, R.lanes[os].length) * 30 + 1 : 0);
      }
      return 18 + rows + 61 + 32 + 14;
    }
    function drawTL(wrap, sel, wide, time) {
      const doc = ed().doc, R = E.classify(doc);
      const u = sel && R.units[sel];
      const secs = SECS.filter(s => R.lanes[s] && R.lanes[s].length);
      const open = wide ? 'all' : (S.openSec && secs.includes(S.openSec) ? S.openSec : null);
      wrap.style.height = tlHeight(R, open, sel) + 'px';
      const t = time != null ? time : (u ? u.start : null);
      return VIS.drawQuick(wrap, doc, {
        pxPerSec: 'fit', selected: sel || null, time: t == null ? null : t, open, addButton: false,
        onTap: id => focusFromPicture(id),
        onOpen: s => { S.openSec = s; redrawTimelines(); },
        onSeam: id => { if (S.hints) select('h:' + id + '|seam', { from: 'picture' }); else focusFromPicture(id); }
      });
    }
    function drawLens() {
      const x = S.sel ? infoFor(S.sel) : null;
      drawTL(lensWrap, x && x.sel, S.wide, x && x.time);
    }
    function redrawTimelines() {
      drawLens();
      const tw = card.querySelector('.v8-cardtl .fm-tlwrap');
      if (tw) { const x = S.sel && infoFor(S.sel); if (x) drawTL(tw, x.sel, false, x.time); }
    }

    /* ---------------- selection ---------------- */
    function select(key, opts) {
      opts = opts || {};
      S.sel = key;
      S.openSec = null;                     // a new pick opens its own row (the phone's folded band)
      if (key && !keyExists(key)) S.sel = null;
      markSelected();
      placeCard({ animate: !!S.sel });
      drawLens();
      if (!S.sel) return;
      const o = ownerOf(S.sel), obj = fileEl.querySelector('.v8-obj[data-o="' + cssEsc(o) + '"]');
      if (opts.from === 'picture' && obj) {
        obj.scrollIntoView({ block: S.wide ? 'center' : 'start', behavior: behave() });
        if (!reduced()) { obj.classList.remove('flash'); void obj.offsetWidth; obj.classList.add('flash'); }
      } else if (opts.from === 'file' && !S.wide && card.parentNode === fileEl) {
        requestAnimationFrame(() => { const r = card.getBoundingClientRect(); if (r.bottom > window.innerHeight - 8) card.scrollIntoView({ block: 'nearest', behavior: behave() }); });
      }
    }
    function focusFromPicture(id) {
      if (!id || String(id).startsWith('slot:')) return;
      const doc = ed().doc, l = doc.layers.find(x => x.id === id);
      if (!l) return;
      let key;
      if (l.sm && Object.keys(l.sm).length) key = id + '|sm.' + Object.keys(l.sm)[0];
      else if (S.hints) { const R = E.classify(doc); const hs = hintsFor(l, R, doc); key = hs.length ? hs[0].key : id + '|start'; }
      else key = id + '|start';
      select(key, { from: 'picture' });
    }

    /* ---------------- everything ---------------- */
    function renderAll(enter) {
      renderSeg();
      renderMeter();
      renderEdits();
      renderFile(enter);
      placeCard();
      drawLens();
    }

    function layout() {
      const w = root.clientWidth || host.clientWidth || 0;
      const wide = w >= 820;
      if (wide !== S.wide) { S.wide = wide; grid.classList.toggle('wide', wide); placeCard(); }
      redrawTimelines();
    }
    S.wide = (root.clientWidth || 0) >= 820; grid.classList.toggle('wide', S.wide);
    renderAll(false);
    sw.setAttribute('aria-checked', 'true');
    const syncControls = () => {
      sw.setAttribute('aria-checked', String(S.hints));
      mini.querySelectorAll('button').forEach(bt => bt.setAttribute('aria-pressed', String((bt.dataset.short === '1') === S.short)));
    };
    syncControls();
    sw.addEventListener('click', syncControls);
    mini.addEventListener('click', syncControls);
    let lastW = root.clientWidth, raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const w = root.clientWidth; if (w && w !== lastW) { lastW = w; layout(); } }); };
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(onResize).observe(root);
    else window.addEventListener('resize', onResize);
    host._shown = () => { lastW = -1; onResize(); };
  }

  function cssEsc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }

  /* ------------------------------------------------------------------ the static parts */
  function whyHTML() {
    return '<section class="v8-why" aria-labelledby="v8-why-h">' +
      '<h3 class="v8-h" id="v8-why-h">Why save so little?</h3>' +
      '<ul class="v8-reasons">' +
        '<li><b>No links to fix</b><p>A saved link between two layers has to be repaired every time something is copied, pasted, duplicated or saved as a template. Quick\'s marks never name another layer.</p></li>' +
        '<li><b>Full can\'t make it wrong</b><p>Full doesn\'t know about Quick. If the clip order were saved, one drag in Full would make it wrong. Worked out from the start times, it is always right.</p></li>' +
        '<li><b>Opening changes nothing</b><p>Quick works everything out when it opens a project, and saves its few marks only at your first clip edit. An old project stays exactly as it was until then.</p></li>' +
        '<li><b>Your editor stays yours</b><p>Which editor you are using is kept on each phone or computer, never in the file. A friend in the same project keeps their own.</p></li>' +
      '</ul>' +
      '<details class="v8-extra"><summary>Other small fields the design adds</summary>' +
        '<p class="h-note">Plain fields, not in Quick\'s box, because Full and the renderer can use them too. None of them points at another layer.</p>' +
        '<dl>' +
          '<dt><code>srcW</code>, <code>srcH</code></dt><dd>The clip\'s own size, so Quick can tell a full-screen clip before the file itself arrives.</dd>' +
          '<dt><code>audioOnly</code></dt><dd>Sound only. Now written the moment a song, voice-over or sound effect is added.</dd>' +
          '<dt><code>taken</code></dt><dd>The date a clip was filmed, for Sort by date taken.</dd>' +
          '<dt><code>pick</code></dt><dd>Which batch of picked files a clip came from.</dd>' +
          '<dt><code>by</code></dt><dd>Who added a layer in a live session, with their name and colour. A copy belongs to whoever made it.</dd>' +
          '<dt><code>"twin": true</code></dt><dd>In the box: the sound taken out of a clip.</dd>' +
          '<dt><code>"muteByMode": true</code>, <code>"muteClips": true</code></dt><dd>The Mute clip sound switch, and the clips it muted, so turning it off un-mutes only those.</dd>' +
          '<dt><code>"mrev": 12</code></dt><dd>On the project: a counter that goes up whenever the clip row changes, so two people editing at once can tell.</dd>' +
        '</dl>' +
      '</details>' +
    '</section>';
  }

  function injectCSS() {
    if (document.getElementById('v8-style')) return;
    const s = document.createElement('style');
    s.id = 'v8-style';
    s.textContent = CSS_TEXT;
    document.head.appendChild(s);
  }

  const DARK_TOKENS = '--v8-str:#7fd6b0;--v8-num:#f0b27a;--v8-bool:#b9a3ff;--v8-new-bg:rgba(90,199,237,.15);--v8-new-ring:rgba(90,199,237,.55);--v8-new-flash:rgba(90,199,237,.5);--v8-chg:rgba(230,160,99,.34);';
  const CSS_TEXT = `
.v8{display:grid;gap:20px;min-width:0;--v8-str:#18724f;--v8-num:#9a5510;--v8-bool:#6243c0;--v8-new:var(--h-accent);--v8-new-bg:rgba(11,120,159,.11);--v8-new-ring:rgba(11,120,159,.45);--v8-new-flash:rgba(11,120,159,.34);--v8-chg:rgba(196,106,30,.3)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .v8{${DARK_TOKENS}}}
:root[data-theme="dark"] .v8{${DARK_TOKENS}}
.v8>*{min-width:0}
.v8-lede{margin:0;font-size:16.5px;line-height:1.5;max-width:64ch;text-wrap:pretty}
.v8-legend{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px 20px;font-size:14px;color:var(--h-muted)}
.v8-legend li{display:inline-flex;align-items:center;gap:9px}
.v8-sw{font:600 12.5px/1 var(--h-mono);padding:6px 8px;border-radius:6px;white-space:nowrap}
.v8-sw.new{background:var(--v8-new-bg);box-shadow:inset 0 0 0 1px var(--v8-new-ring);color:var(--v8-new)}
.v8-sw.old{background:var(--h-surface);box-shadow:inset 0 0 0 1px var(--h-rule);color:var(--h-ink);font-weight:400}
.v8-sw.der{border:1.5px dashed var(--h-faint);color:var(--h-muted);font:italic 13px/1 var(--h-body);border-radius:999px;padding:6px 11px}

.v8-seg{display:flex;padding:3px;border-radius:14px;background:var(--h-surface-2);border:1px solid var(--h-rule);max-width:520px}
.v8-seg button{flex:1 1 0;min-width:0;border:0;background:transparent;color:var(--h-muted);padding:8px 12px;border-radius:11px;cursor:pointer;text-align:left;min-height:52px;font:700 15px/1.2 var(--h-body);display:grid;gap:3px;align-content:center;transition:background .2s,color .2s}
.v8-seg button small{font-weight:400;font-size:12.5px;color:var(--h-faint)}
.v8-seg button[aria-pressed="true"]{background:var(--h-surface);color:var(--h-ink);box-shadow:var(--h-shadow)}
.v8-seg button[aria-pressed="true"] small{color:var(--h-muted)}

.v8-grid{display:grid;gap:18px;grid-template-columns:minmax(0,1fr);grid-template-areas:"meter" "edits" "side" "file"}
.v8-grid>*{min-width:0}
.v8-meter{grid-area:meter}.v8-edits{grid-area:edits}.v8-side{grid-area:side}.v8-filewrap{grid-area:file}
.v8-grid.wide{grid-template-columns:minmax(0,1fr) 360px;grid-template-rows:auto auto 1fr;column-gap:24px;grid-template-areas:"meter side" "edits side" "file side"}
.v8-grid.wide .v8-side{align-self:start;position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto;scrollbar-width:thin}

.v8-meter{display:grid;gap:10px;padding:14px 16px}
.v8-mrow{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 20px}
.v8-big{display:inline-flex;align-items:baseline;gap:9px}
.v8-big b{display:inline-block;transform-origin:50% 70%;font:700 36px/1 var(--h-display);color:var(--v8-new);font-variant-numeric:tabular-nums}
.v8-big.zero b{color:var(--h-good)}
.v8-big span{font-size:15.5px;font-weight:700}
.v8-dim{font-size:14.5px;color:var(--h-muted)}
.v8-dim b{font-family:var(--h-mono);color:var(--h-ink);font-weight:600}
.v8-strip{position:relative;height:18px;border-radius:9px;overflow:hidden;background:var(--h-surface-2);box-shadow:inset 0 0 0 1px var(--h-rule)}
.v8-strip i{position:absolute;top:0;bottom:0;display:block}
.v8-strip i.lay:nth-child(odd){background:color-mix(in srgb,var(--h-ink) 7%,transparent)}
.v8-strip i.mk{top:3px;bottom:3px;min-width:3px;border-radius:2px;background:var(--v8-new);transition:left .4s cubic-bezier(.2,.8,.2,1)}
.v8-mcap{margin:0;font-size:13.5px;color:var(--h-muted)}
.v8-pulse{animation:v8-pulse .7s cubic-bezier(.2,.8,.2,1)}
@keyframes v8-pulse{0%{transform:scale(1)}35%{transform:scale(1.14)}100%{transform:scale(1)}}

.v8-edits{display:grid;gap:10px}
.v8-elabel,.v8-lenscap{margin:0;font-family:var(--h-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--h-muted)}
.v8-edits .h-row{gap:8px}
.v8-edits .h-btn{display:inline-flex;align-items:center;gap:7px;transition:transform .12s,background .2s}
.v8-edits .h-btn:active:not([disabled]){transform:scale(.97)}
.v8-edits .h-btn .ico{width:17px;height:17px;flex:none}
.v8-edits .h-btn[disabled]{opacity:.42;cursor:default}
.v8-status{margin:0;font-size:15px;line-height:1.45;color:var(--h-muted);max-width:62ch;min-height:1.45em}
.v8-status b{color:var(--h-ink)}

.v8-side{display:grid;gap:10px;align-content:start;grid-template-columns:minmax(0,1fr)}
.v8-side>*{min-width:0}
.v8-lens{border-radius:14px;min-width:0;overflow:hidden}
.v8-lens .fm-tlwrap,.v8-cardtl .fm-tlwrap{border-radius:12px;overflow:hidden;border:1px solid #22313a;box-shadow:0 10px 30px rgba(0,0,0,.18);min-height:0}
.v8-cardslot{min-width:0}

.v8-filebar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 14px;margin-bottom:10px}
.v8-switch{display:inline-flex;align-items:center;gap:10px;border:0;background:transparent;color:var(--h-ink);font:600 15px/1.2 var(--h-body);cursor:pointer;min-height:44px;padding:4px 2px;text-align:left}
.v8-switch .trk{width:42px;height:26px;border-radius:13px;background:var(--h-rule);position:relative;flex:none;transition:background .2s}
.v8-switch .trk::after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .22s cubic-bezier(.2,.8,.2,1)}
.v8-switch[aria-checked="true"] .trk{background:var(--h-accent)}
.v8-switch[aria-checked="true"] .trk::after{transform:translateX(16px)}
.v8-mini{display:inline-flex;padding:3px;border-radius:999px;background:var(--h-surface-2);border:1px solid var(--h-rule)}
.v8-mini button{font:600 13.5px/1 var(--h-body);border:0;background:transparent;color:var(--h-muted);padding:9px 13px;border-radius:999px;cursor:pointer;min-height:38px}
.v8-mini button[aria-pressed="true"]{background:var(--h-surface);color:var(--h-ink);box-shadow:var(--h-shadow)}

.v8-file{position:relative;background:var(--h-surface);border:1px solid var(--h-rule);border-radius:14px;padding:12px 12px 16px;font:13px/2.15 var(--h-mono);color:var(--h-ink);overflow-x:auto;box-shadow:var(--h-shadow);overflow-wrap:anywhere}
@media (max-width:480px){.v8-file{font-size:12.5px;padding:10px 9px 14px}}
.v8-file .pu{color:var(--h-faint)}
.v8-file .k0{color:var(--h-ink);font-weight:600}
.v8-ln{white-space:nowrap}
.v8-ln.i1{padding-left:2ch;white-space:normal}
.v8-note{font:italic 12.5px/1.4 var(--h-body);color:var(--h-faint);white-space:normal}
.v8-obj{--ind:2ch;border-radius:8px;scroll-margin:16px}
.v8-obj.lay{--ind:4ch}
.v8-body{padding-left:calc(var(--ind) + 2ch);text-indent:-2ch}
.v8-body>*{text-indent:0}
.v8-kv{font:inherit;color:inherit;background:transparent;border:0;margin:0;padding:4px 2px;border-radius:5px;cursor:pointer;white-space:nowrap;text-align:left;line-height:1.55;vertical-align:baseline;transition:background .15s}
.v8-kv:hover{background:color-mix(in srgb,var(--h-ink) 8%,transparent)}
.v8-kv .k{color:var(--h-ink)}
.v8-file .t-s{color:var(--v8-str)}.v8-file .t-n{color:var(--v8-num)}.v8-file .t-b{color:var(--v8-bool)}
.v8-fold{color:var(--h-muted)!important;font-style:italic}
.v8-grp.g-new{background:var(--v8-new-bg);box-shadow:inset 0 0 0 1px var(--v8-new-ring);border-radius:6px;padding:3px 2px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.v8-grp{white-space:normal}
.v8-grp.nw{white-space:nowrap}
.v8-grp.g-new .k,.v8-grp.g-new .pu{color:var(--v8-new);font-weight:600}
.v8-grp.g-new .v8-kv:hover{background:var(--v8-new-bg)}
.v8-kv.t-helper{box-shadow:inset 0 -2px 0 var(--v8-new-ring)}
.v8-kv[aria-pressed="true"]{outline:2px solid var(--h-accent);outline-offset:1px;background:var(--h-accent-soft)}
.v8-more-btn{font:inherit;font-size:.92em;color:var(--h-muted);background:transparent;border:1px dashed var(--h-rule);border-radius:6px;padding:1px 7px;cursor:pointer;line-height:1.55;white-space:nowrap}
.v8-more-btn:hover{color:var(--h-ink);border-color:var(--h-faint)}
.v8-sub{display:block;padding-left:2ch;cursor:pointer;border-radius:5px}
.v8-sub:hover,.v8-kfv:hover{background:color-mix(in srgb,var(--h-ink) 6%,transparent)}
.v8-kfv{cursor:pointer;border-radius:5px}
.v8-nw{white-space:nowrap}

.v8-hints{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:5px 0 12px calc(var(--ind) + 2ch);line-height:1.2}
.v8-hints .lbl{font:600 10px/1 var(--h-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--h-faint);margin-right:2px}
.v8-pill{font:italic 13px/1.2 var(--h-body);color:var(--h-muted);background:transparent;border:1.5px dashed color-mix(in srgb,var(--h-faint) 70%,transparent);border-radius:999px;padding:5px 10px;min-height:32px;cursor:pointer;text-align:left;transition:border-color .15s,color .15s,background .15s}
.v8-pill:hover{border-color:var(--h-muted);color:var(--h-ink)}
.v8-pill[aria-pressed="true"]{border-style:solid;border-color:var(--h-accent);color:var(--h-ink);background:var(--h-accent-soft)}
.v8-pill.static{display:inline-block;cursor:default;min-height:0;padding:4px 10px}
.v8-file.enter .v8-hints{animation:v8-fade .35s ease-out both}
@keyframes v8-fade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}

.v8-kv.chg .v,.v8-kv.chg .v8-fold{animation:v8-chg 2.2s ease-out;border-radius:4px}
@keyframes v8-chg{0%,35%{background:var(--v8-chg);box-shadow:0 0 0 2px var(--v8-chg)}100%{background:transparent;box-shadow:0 0 0 2px transparent}}
.v8-grp.born,.v8-kv.born{animation:v8-born 2.2s ease-out}
@keyframes v8-born{0%,35%{background:var(--v8-new-flash);box-shadow:0 0 0 3px var(--v8-new-flash)}100%{}}
.v8-obj.flash{animation:v8-flash 1.3s ease-out}
@keyframes v8-flash{0%,35%{background:var(--h-accent-soft)}100%{background:transparent}}

.v8-card{background:var(--h-surface);border:1px solid var(--h-rule);border-radius:16px;padding:12px 14px 16px;display:grid;grid-template-columns:minmax(0,1fr);gap:9px;box-shadow:var(--h-shadow);font:15px/1.45 var(--h-body);color:var(--h-ink);white-space:normal;text-indent:0;overflow-wrap:normal}
.v8-file .v8-card{margin:6px 0 14px;border-color:color-mix(in srgb,var(--h-accent) 45%,var(--h-rule))}
.v8-card.in{animation:v8-in .26s cubic-bezier(.2,.8,.2,1)}
@keyframes v8-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.v8-card p{margin:0}
.v8-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:36px}
.v8-tier{font:600 11px/1.2 var(--h-mono);letter-spacing:.07em;text-transform:uppercase;padding:6px 10px;border-radius:999px;border:1px solid var(--h-rule);color:var(--h-muted)}
.v8-tier.t-new{color:var(--v8-new);background:var(--v8-new-bg);border-color:var(--v8-new-ring)}
.v8-tier.t-helper{color:var(--v8-new);border-style:dotted;border-color:var(--v8-new-ring)}
.v8-tier.t-derived{border-style:dashed;border-color:var(--h-faint)}
.v8-x{width:40px;height:40px;margin:-4px -6px -4px 0;border-radius:10px;border:0;background:transparent;color:var(--h-muted);cursor:pointer;display:grid;place-items:center;flex:none}
.v8-x .ico{width:18px;height:18px}
.v8-x:hover{background:var(--h-surface-2);color:var(--h-ink)}
.v8-code{font:13px/1.5 var(--h-mono);color:var(--h-muted);overflow-wrap:anywhere}
.v8-code code{font:inherit;color:var(--h-ink);background:var(--h-surface-2);padding:2px 7px;border-radius:5px}
.v8-code code.new{color:var(--v8-new);background:var(--v8-new-bg);box-shadow:inset 0 0 0 1px var(--v8-new-ring);font-weight:600}
.v8-code > span:last-child{font-family:var(--h-body);font-size:14px}
.v8-card-h{font:700 22px/1.15 var(--h-display);margin:0;letter-spacing:-.01em;text-wrap:balance}
.v8-here{padding:9px 12px;border-radius:10px;background:var(--h-surface-2);font-size:14.5px}
.v8-whyl{font-size:14.5px;color:var(--h-muted)}
.v8-whyl b{color:var(--h-ink)}
.v8-cardtl{margin-top:4px;border-radius:12px;min-width:0;overflow:hidden}

.v8-why{display:grid;gap:14px;padding-top:22px;border-top:1px solid var(--h-rule)}
.v8-h{font:700 24px/1.15 var(--h-display);margin:0;letter-spacing:-.01em}
/* at most two columns (each at least about half the box), so the four reasons sit 2 x 2 and never 3 + 1 */
.v8-reasons{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,max(240px,calc(50% - 7px))),1fr));list-style:none;margin:0;padding:0}
.v8-reasons li{background:var(--h-surface);border:1px solid var(--h-rule);border-radius:14px;padding:14px 16px}
.v8-reasons b{display:block;font:700 17px/1.25 var(--h-display);margin-bottom:5px}
.v8-reasons p{margin:0;font-size:15px;color:var(--h-muted)}
.v8-extra{background:var(--h-surface);border:1px solid var(--h-rule);border-radius:14px}
.v8-extra summary{cursor:pointer;padding:12px 16px;min-height:48px;display:flex;align-items:center;gap:12px;font-weight:700;list-style:none}
.v8-extra summary::-webkit-details-marker{display:none}
.v8-extra summary::after{content:"";margin-left:auto;width:8px;height:8px;border-right:2px solid var(--h-muted);border-bottom:2px solid var(--h-muted);transform:rotate(45deg);margin-top:-4px;transition:transform .15s;flex:none}
.v8-extra[open] summary::after{transform:rotate(-135deg);margin-top:4px}
.v8-extra[open] summary{border-bottom:1px solid var(--h-rule)}
.v8-extra .h-note{margin:12px 16px 0}
.v8-extra dl{margin:0;padding:10px 16px 16px;display:grid;gap:4px 16px}
@media (min-width:640px){.v8-extra dl{grid-template-columns:max-content minmax(0,1fr)}}
.v8-extra dt{font:600 13px/1.6 var(--h-mono);margin-top:8px}
@media (min-width:640px){.v8-extra dt{margin-top:0}}
.v8-extra dt code{font:inherit;color:var(--v8-new)}
.v8-extra dd{margin:0;font-size:14.5px;color:var(--h-muted)}
`;
})();
