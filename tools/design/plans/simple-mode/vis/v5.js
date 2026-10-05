/* V5 — An old project opened in Simple (DESIGN §5 opening any project, §5.4 what Simple shows that it did not make,
 * §9 Full-editor content, §20 round 2's two blockers).
 *
 * Part 1, SAMPLE (b) "Cooking with Mia", made in Full. One phone, two editors (the toggle above it stands in for the ⚙
 * cog's switch; neither play bar has one, and Full's is today's, DESIGN §0.4). Simple's reading is the kit's real classifier (VIS.engine.classify), run on every draw. Every piece
 * says where it went and why (tap it in the phone, or in the list under it). The counter is measured, not claimed: it
 * is the size of the change set between the document as opened and the document now, so it reads 0 until the first
 * arranging edit (Close gap, Fix, Lift off, Put in the clip row), which is when adoption stores the clip row (§5.3).
 * Two keyframe tracks are added to this page's copy (a slow push-in on Tasting, a pop-in on the face cam) so the ✦
 * "has moves" badge (§9.1 level 'look') has something real to mark; nothing else in the sample is changed.
 * Delete is left out on purpose: in the kit engine, deleting a clip under the music cuts the song in two and then
 * refits the FIRST half to the video's end (a kit bug, reported), which would show the song playing twice.
 *
 * Part 2, SAMPLE (c) "Studio tips": a talking head with three cutaways above it. "After the fix" is the kit's
 * classifier (§5.2's background rule: all three tests). "Before the fix" is the first draft's reading (only the first
 * test), stored as marks on this page's copy so the same engine draws it. Delete a cutaway in either and the page
 * measures what moved against her words (the talking head never moves in either reading).
 * Plus the other blocker (things behind a clip stay behind) as two small pictures.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.VIS || !window.VIS.register) return;
  const VIS = window.VIS, E = VIS.engine, el = VIS.el, esc = VIS.esc;

  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(mq && mq.matches);
  const ACCENT = '#5ac7ed', FULLC = '#9b87f5';
  const SEC = VIS.SECTION_COLOR, SECN = VIS.SECTION_NAME;
  const ORDER = ['captions', 'text', 'overlay', 'effect', 'behind'];

  VIS.register('v5', {
    title: 'An old project in Simple',
    group: 'Old projects',
    blurb: 'A messy project made in Full, switched to Simple: every piece lands in a sensible place, with a reason for each one, and nothing is saved until your first clip edit.',
    mount: host => mountV5(host)
  });

  /* ------------------------------------------------------------------ words */
  const nm = l => (l && (l.name || l.text || l.id)) || '';
  const secs = t => VIS.fmt(Math.abs(t));
  // a clock length in whole seconds, the same as every other page ('0:14'); an exact amount is said in seconds ('1.5s')
  const mmss = t => { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const numWord = n => ['no', 'one', 'two', 'three', 'four', 'five', 'six'][n] || String(n);
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
  const andList = a => a.length <= 1 ? (a[0] || '') : a.length === 2 ? a[0] + ' and ' + a[1] : a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1];
  const orList = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' or ' + a[a.length - 1];
  const bold = s => '<b>' + esc(s) + '</b>';
  const typeWord = l => l.audioOnly ? 'Music' : l.type === 'video' ? 'Video' : l.type === 'image' ? 'Picture'
    : l.type === 'text' ? (Array.isArray(l.captions) ? 'Captions' : 'Text') : l.type === 'shape' ? (/^mask-/.test(l.blendMode || '') ? 'Mask shape' : 'Shape')
    : l.type === 'group' ? 'Group' : l.type === 'camera' ? 'Camera' : l.type;
  const markSvg = ok => ok === true ? VIS.icon('check') : ok === false ? VIS.icon('close') : '<span aria-hidden="true">–</span>';

  /* ------------------------------------------------------------------ the samples */
  function cookingDoc() {
    const d = VIS.sample('messy');
    const L = id => d.layers.find(l => l.id === id);
    L('m3').kf = { scale: [{ t: 12.5, v: 1 }, { t: 18.3, v: 1.12 }] };   // a slow push-in on Tasting (✦)
    L('pip').kf = { scale: [{ t: 6.0, v: 0.22 }, { t: 6.4, v: 0.3 }] };   // the face cam pops in (✦)
    L('lt-text').transform = { y: 0.73 };                                  // drawing only: the name sits on its bar
    return d;
  }
  function studioDoc(mode) {
    const d = VIS.sample('aroll');
    if (mode === 'before') {
      // The first draft's reading (§20 round 2): the talking head spans three clips that all sit above it, so it was
      // taken for a backdrop. Stored as marks on this copy only so the same engine draws that reading.
      d.project.sm = { v: 1, adopted: true };
      d.layers.forEach(l => { if (/^b\d$/.test(l.id)) l.sm = { main: true }; if (l.id === 'a1') l.sm = { stay: true }; });
    }
    return d;
  }

  /* ------------------------------------------------------------------ reading helpers */
  function clipNo(R, id) { let n = 0; for (const e of R.main) { if (!e.slot) n++; if (e.id === id) return e.slot ? 0 : n; } return 0; }
  const clipRef = (R, id) => '<b>Clip ' + clipNo(R, id) + '</b> (' + esc(nm(R.layer(id))) + ')';
  function levelOf(R, u) {
    if (!u) return 'none';
    if (u.kind === 'fullOnly') return 'fullOnly';
    if (u.kind === 'block') return 'block';
    return u.layers.some(id => { const l = R.layer(id); return l && l.type !== 'camera' && E.kfLists(l).some(a => a.length); }) ? 'look' : 'none';
  }
  function movesWord(R, u) {
    const props = new Set(); u.layers.forEach(id => { const l = R.layer(id); if (l && l.kf) for (const k in l.kf) if (l.kf[k].length) props.add(k); });
    const l = u.lead, sc = l.kf && l.kf.scale;
    if (sc && sc.length > 1) return (sc[sc.length - 1].t - sc[0].t) > 1 ? 'a slow zoom' : 'a quick pop-in';
    if (props.has('opacity')) return 'a fade';
    return 'moves';
  }
  /* Where a Full layer lands in Simple. */
  function place(R, lid) {
    const uid = R.unitOf.get(lid);
    if (uid == null) return { dest: 'Not drawn: shown one by one', color: 'var(--h-faint)' };
    const u = R.units[uid], member = uid !== lid;
    if (R.isMain(uid)) return { u, uid, dest: 'Clip row · Clip ' + clipNo(R, uid), color: ACCENT, main: true };
    if (u.kind === 'fullOnly') return { u, uid, dest: 'More in Full ›', color: FULLC };
    if (member) return { u, uid, member, dest: 'Inside the ‘' + nm(u.lead) + '’ block', color: SEC.overlay };
    const sec = u.section;
    return { u, uid, dest: (SECN[sec] || 'Timeline') + (u.kind === 'block' ? ' · block' : ''), color: SEC[sec] || ACCENT };
  }
  function hostLine(R, u) {
    if (u.host && R.isMain(u.host)) return 'It starts on ' + clipRef(R, u.host) + ', so it moves with that clip, and goes if that clip is deleted.';
    if (E.hasFlag(u.lead, 'stay')) return 'It is marked to stay put, so moving clips never drags it.';
    return '';
  }
  /* The reason, in plain words, built from the read model (so it stays true after every edit). */
  function reasons(R, lid) {
    const p = place(R, lid), out = [];
    if (!p.u) { out.push('A group that only keeps the layers tidy. Simple shows what is inside it one by one.'); return out; }
    const u = p.u, lead = u.lead, first = R.main[0], tEnd = R.trackEnd;
    if (p.member) {
      out.push('Part of the ' + bold(nm(lead)) + ' block, so Simple shows it inside that one piece. <b>Open in Full</b> changes it.');
      return out;
    }
    if (p.main) {
      const e = R.entry(u.id), prev = R.main[e.i - 1], n = clipNo(R, u.id);
      out.push(R.adopted && E.hasFlag(lead, 'main')
        ? 'It is saved as a clip in the row. Simple stored that at your first clip edit.'
        : 'It fills the whole picture, and nothing bigger covers it, so Simple puts it in the clip row.');
      if (!prev) out.push(e.seam.kind === 'gap' ? 'Nothing plays for the first ' + secs(e.seam.amt) + ', so the row starts with a gap block.' : 'It starts at 0:00, so it is Clip 1.');
      else if (e.seam.kind === 'join' || e.seam.kind === 'hairline') out.push('It starts right where Clip ' + (n - 1) + ' ends.');
      else if (e.seam.kind === 'gap') out.push('There is a <b>' + secs(e.seam.amt) + ' gap</b> before it, where nothing plays. Simple draws it as a striped block, and the <b>' + secs(e.seam.amt) + '</b> button closes it. Simple never closes a gap by itself.');
      else if (e.seam.kind === 'overlap') out.push('It starts <b>' + secs(e.seam.amt) + '</b> before Clip ' + (n - 1) + ' ends, so the two overlap. The red <b>−' + secs(e.seam.amt) + '</b> mark fixes it: this clip and everything after it slide ' + secs(e.seam.amt) + ' later.');
      else if (e.seam.kind === 'blend') out.push('It fades in over the clip before it, a hand-made crossfade. Simple keeps it exactly as it is.');
      const fol = (R.followers[u.id] || []).map(id => bold(nm(R.layer(id))));
      if (fol.length === 1) out.push('It carries ' + fol[0] + ', which goes wherever this clip goes.');
      else if (fol.length) out.push('It carries ' + andList(fol) + '. They go wherever this clip goes.');
    } else if (u.kind === 'fullOnly') {
      const zoom = lead.kf && lead.kf.zoom && lead.kf.zoom.length > 1;
      out.push('The camera' + (zoom ? ', doing a slow zoom in and out' : '') + '. It has nothing to show by itself, so Simple draws no row for it.');
      out.push('The line under the timeline says <b>More in Full ›</b>, which takes you straight to it. When clips move, its moves go with them.');
    } else if (u.kind === 'block') {
      if (lead.type === 'group') out.push('A group with ' + (lead.shadow ? 'a shadow' : 'a look of its own') + '. It has to be drawn as one piece, so Simple keeps it whole: a <b>block</b>. Simple can move it with its clip; <b>Open in Full</b> changes what is inside.');
      else out.push('A shape that cuts a circle out of the picture under it: a mask. Simple does not edit masks, so it is a <b>block</b>, one tap from <b>Open in Full</b>.');
      const h = hostLine(R, u); if (h) out.push(h);
    } else if (u.kind === 'background') {
      out.push('A still picture under the clips that covers their whole run and makes no sound: a backdrop. It sits in the hatched <b>Behind</b> row, and stays behind.');
    } else if (u.kind === 'text') {
      const whole = first && u.start <= first.start + R.eps && u.end >= tEnd - R.eps;
      if (whole && !u.host) out.push('Text across the whole video, ' + mmss(u.start) + ' to ' + mmss(u.end) + '. That is too long to belong to one clip, so it stays put: moving clips never drags it.');
      else { out.push('Text on top of the video.'); const h = hostLine(R, u); if (h) out.push(h); }
      if (E.hasFlag(lead, 'tail')) out.push('It is marked to end with the video, so it gets longer or shorter with it.');
    } else if (u.kind === 'audio') {
      if (!u.host) out.push('Music. It runs on past the clip it starts on by more than 1 second, so it stays put: moving clips never drags the song.');
      else out.push('A short sound. ' + hostLine(R, u));
      if (E.hasFlag(lead, 'tail')) out.push('It is marked to end with the video, so it gets longer or shorter with it.');
    } else if (u.kind === 'captions') {
      out.push('Captions across the video. Each line moves with the words it belongs to.');
    } else {
      const sc = lead.transform && lead.transform.scale;
      if (lead.type === 'shape') out.push('A shape, drawn on top of the clips.');
      else if (sc != null && sc < 0.95) out.push('It is a ' + (lead.type === 'image' ? 'picture' : 'video') + ', but shrunk to ' + Math.round(sc * 100) + '% in a corner, so it does not fill the picture. That makes it an overlay: it plays on top of the clips.');
      else if (R.adopted) out.push('It fills the picture, but it is not in the clip row, so it plays on top as an overlay. <b>Put in the clip row</b> changes that.');
      else out.push('It fills the picture, but a clip in the row already plays there, so it sits on top as an overlay.');
      const h = hostLine(R, u); if (h) out.push(h);
    }
    if (levelOf(R, u) === 'look') out.push('<span class="v5-star" aria-hidden="true">✦</span> It has ' + movesWord(R, u) + ' made with keyframes. Simple plays it exactly and keeps it with it. To change it, its panel says <b>Has moves and effects · Open in Full</b>.');
    return out;
  }

  /* ------------------------------------------------------------------ what was written */
  const eqJ = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  function patchOf(a, b) {
    const ops = [];
    new Set([...Object.keys(a.project), ...Object.keys(b.project)]).forEach(k => { if (!eqJ(a.project[k], b.project[k])) ops.push(['P/' + k, b.project[k] === undefined ? null : b.project[k]]); });
    const A = new Map(a.layers.map(l => [l.id, l])), B = new Map(b.layers.map(l => [l.id, l]));
    A.forEach((l, id) => { if (!B.has(id)) ops.push(['L/' + id, null]); });
    B.forEach((l, id) => {
      const o = A.get(id);
      if (!o) { ops.push(['L/' + id, l]); return; }
      new Set([...Object.keys(o), ...Object.keys(l)]).forEach(k => { if (!eqJ(o[k], l[k])) ops.push(['L/' + id + '/' + k, l[k] === undefined ? null : l[k]]); });
    });
    const oa = a.layers.map(l => l.id).filter(id => B.has(id)), ob = b.layers.map(l => l.id).filter(id => A.has(id));
    if (!eqJ(oa, ob)) ops.push(['order', b.layers.map(l => l.id)]);
    return ops;
  }
  const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  function bytesOf(a, b) { const ops = patchOf(a, b); if (!ops.length) return 0; const s = JSON.stringify(ops); return enc ? enc.encode(s).length : s.length; }
  /* The same change set, in words. R0 = the reading at open (its clip row is what adoption stores). */
  function describe(a, b, R0) {
    const saved = [], edit = [];
    const A = new Map(a.layers.map(l => [l.id, l])), B = new Map(b.layers.map(l => [l.id, l]));
    if (!(a.project.sm && a.project.sm.adopted) && b.project.sm && b.project.sm.adopted) saved.push('One mark on the project: “Simple has set up the clip row.”');
    const add = { main: [], stay: [], tail: [] }, off = [], newMain = [], stayEdit = [];
    B.forEach((l, id) => {
      const o = A.get(id); if (!o) return;
      const was = o.sm || {}, now = l.sm || {};
      if (now.main && !was.main) (R0.isMain(id) ? add.main : newMain).push(nm(l));
      if (now.stay && !was.stay) (R0.wouldStay.includes(id) ? add.stay : stayEdit).push(nm(l));
      if (now.tail && !was.tail) add.tail.push(nm(l));
    });
    R0.main.forEach(e => { const l = B.get(e.id); if (l && !e.slot && !(l.sm && l.sm.main) && (b.project.sm && b.project.sm.adopted)) off.push(nm(l)); });
    if (add.main.length) saved.push('A “clip row” mark on ' + andList(add.main.map(bold)) + '.');
    if (add.stay.length) saved.push('A “stays put” mark on ' + andList(add.stay.map(bold)) + '.');
    if (add.tail.length) saved.push('“Ends with the video” on ' + andList(add.tail.map(bold)) + '.');
    off.forEach(n => edit.push(bold(n) + ' came off the clip row and plays on top.'));
    newMain.forEach(n => edit.push(bold(n) + ' went into the clip row.'));
    if (stayEdit.length) edit.push(andList(stayEdit.map(bold)) + (stayEdit.length === 1 ? ' was' : ' were') + ' riding on it, so ' + (stayEdit.length === 1 ? 'it keeps its' : 'they keep their') + ' place (a “stays put” mark).');
    const moved = new Map();
    B.forEach((l, id) => {
      const o = A.get(id); if (!o || l.type === 'camera' || l.type === 'group') return;
      const d = Math.round((l.start - o.start) * 100) / 100; if (Math.abs(d) < 0.005) return;
      if (!moved.has(d)) moved.set(d, []); moved.get(d).push(o);
    });
    moved.forEach((ls, d) => edit.push('Moved ' + andList(ls.sort((x, y) => x.start - y.start).map(x => bold(nm(x)))) + ' ' + secs(d) + (d < 0 ? ' earlier.' : ' later.')));
    const refit = { shorter: [], longer: [] };
    B.forEach((l, id) => { const o = A.get(id); if (o && Math.abs(o.start - l.start) < 0.005 && Math.abs(o.duration - l.duration) > 0.005 && l.type !== 'group' && l.type !== 'camera') refit[l.duration < o.duration ? 'shorter' : 'longer'].push(nm(l)); });
    ['shorter', 'longer'].forEach(k => { const r = refit[k]; if (r.length) edit.push(andList(r.map(bold)) + ' got ' + k + ', so ' + (r.length === 1 ? 'it still ends' : 'they still end') + ' with the video.'); });
    B.forEach((l, id) => { const o = A.get(id); if (o && l.type === 'camera' && !eqJ(o.kf, l.kf)) edit.push('The camera’s zoom moved with the clips.'); });
    A.forEach((l, id) => { if (!B.has(id)) edit.push('Removed ' + bold(nm(l)) + '.'); });
    B.forEach((l, id) => { if (!A.has(id)) edit.push('Added ' + bold(nm(l)) + '.'); });
    const dd = (b.project.duration || 0) - (a.project.duration || 0);
    if (Math.abs(dd) > 0.005) edit.push('The video is ' + secs(dd) + (dd < 0 ? ' shorter' : ' longer') + ', so it is now ' + mmss(b.project.duration) + ' long.');
    return { saved, edit };
  }

  /* ------------------------------------------------------------------ small shared UI */
  function setTimeOf(f, t, fps, playing) {
    f.time.innerHTML = VIS.icon(playing ? 'pause' : 'play') + ' ' + VIS.tc(t, fps);
    const s = f.time.querySelector('svg'); if (s) s.style.cssText = 'width:10px;height:10px;display:inline-block;margin-right:3px;vertical-align:-1px';
    f.time.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  function trayTools(f, sayHTML, tools, onClick) {
    f.tray.innerHTML = '';
    const say = el('div', 'fm-say', sayHTML); f.tray.appendChild(say);
    if (tools && tools.length) {
      const box = el('div', 'v5-traytools');
      tools.forEach(t => {
        const b = el('button', 'fm-tool', VIS.icon(t.icon) + '<span class="tl">' + esc(t.label) + '</span>');
        b.type = 'button'; b.setAttribute('aria-label', t.aria || t.label); b.title = t.aria || t.label; b.dataset.tool = t.id;
        b.addEventListener('click', e => { e.stopPropagation(); onClick(t.id); });
        box.appendChild(b);
      });
      f.tray.appendChild(box);
    }
    return say;
  }
  function segButtons(seg, value) { seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === value))); }
  function countTo(node, from, to) {
    if (reduced() || from === to) { node.textContent = String(to); return; }
    const t0 = performance.now(), D = 520;
    const step = now => { const u = Math.min(1, (now - t0) / D), k = 1 - Math.pow(1 - u, 3); node.textContent = String(Math.round(from + (to - from) * k)); if (u < 1 && node.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function pulse(node) { node.classList.remove('pulse'); void node.offsetWidth; node.classList.add('pulse'); }
  /* ================================================================== the page */
  function mountV5(host) {
    host.classList.add('v5');
    host.innerHTML =
      '<p class="v5-lede">Your old projects still open in Full, so nothing changes for work you already have. Any of them can open in Simple: flip the switch in the ⚙ cog, and this phone remembers that pick for that project. Simple converts nothing. It looks at the layers and works out which ones are the clips, and where everything else goes.</p>' +
      '<section class="v5-sec" aria-labelledby="v5-b-h">' +
        '<div class="v5-headrow"><h3 class="v5-h" id="v5-b-h">Cooking with Mia</h3><span class="v5-tag">made in Full</span></div>' +
        '<p class="h-note v5-note">Four clips with a gap and an overlap, a face cam in the corner, a lower-third group with a shadow, a camera zoom, a circle mask, a title over the whole video, and music. Flip between the two editors with the buttons below (in the app, the switch in the ⚙ cog), then tap anything.</p>' +
        '<div class="v5-ctl">' +
          '<div class="h-seg v5-edseg" role="group" aria-label="Editor"><button type="button" data-v="full">In Full</button><button type="button" data-v="quick">In Simple</button></div>' +
          '<div class="v5-bytes" role="status" aria-live="polite"><b class="v5-bn">0</b><span>bytes saved to the project</span></div>' +
        '</div>' +
        '<div class="v5-grid">' +
          '<div class="v5-phone"><div class="v5-frame" data-ed="quick"></div><div class="v5-frame" data-ed="full"></div></div>' +
          '<aside class="v5-side">' +
            '<div class="h-card v5-why" aria-live="polite"></div>' +
            '<div class="h-card v5-save"></div>' +
          '</aside>' +
        '</div>' +
        '<div class="v5-where">' +
          '<h4 class="v5-sub">Where everything went</h4>' +
          '<p class="h-note v5-note">Every layer of the Full project, top of the stack first, and where Simple put it. Tap one for the reason.</p>' +
          '<ul class="v5-wlist"></ul>' +
        '</div>' +
      '</section>' +
      '<section class="v5-sec" aria-labelledby="v5-c-h">' +
        '<div class="v5-headrow"><h3 class="v5-h" id="v5-c-h">Studio tips</h3><span class="v5-tag">a talking head with cutaways</span></div>' +
        '<p class="h-note v5-note">She talks for 30 seconds. Three short cutaways (Cables, Lamp, Plant) sit on top of her, each over the tip it shows. Captions follow her words. An early draft of Simple read this project wrongly. Here is the fixed rule next to the old one.</p>' +
        '<div class="v5-ctl"><div class="h-seg v5-modeseg" role="group" aria-label="Which rule"><button type="button" data-v="after">After the fix</button><button type="button" data-v="before">Before the fix</button></div></div>' +
        '<div class="v5-grid">' +
          '<div class="v5-phone v5-cphone"></div>' +
          '<aside class="v5-side">' +
            '<div class="h-card v5-tests"></div>' +
            '<div class="h-card v5-try"></div>' +
          '</aside>' +
        '</div>' +
        '<div class="h-card v5-other">' +
          '<h4 class="v5-sub">The other fix: things behind stay behind</h4>' +
          '<div class="v5-minis">' +
            '<figure class="v5-minifig"><div class="v5-mini bad"><i class="bd"></i><i class="clip"></i><i class="bd top"></i><span class="v5-mk no">' + VIS.icon('close') + '</span></div><figcaption>Before the fix, after your first clip edit</figcaption></figure>' +
            '<figure class="v5-minifig"><div class="v5-mini"><i class="bd"></i><i class="clip"></i><span class="v5-mk yes">' + VIS.icon('check') + '</span></div><figcaption>After the fix</figcaption></figure>' +
          '</div>' +
          '<p class="h-note v5-note">A tall video often has a blurred copy of the picture behind a wide clip, on purpose. The first draft moved everything under a clip to the front at your first clip edit, so the backdrop covered the video. Now Simple knows the backdrop is behind, shows it in the hatched <b>Behind</b> row just above the clips, and never re-stacks it.</p>' +
        '</div>' +
      '</section>';
    const q = s => host.querySelector(s);

    mountCooking(host, q);
    mountStudio(host, q);
    if (mq) { const on = () => host.classList.toggle('v5-rm', reduced()); on(); if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on); }
  }

  /* ================================================================== part 1: Cooking with Mia */
  function mountCooking(host, q) {
    const ORIG = cookingDoc();
    const R0 = E.classify(ORIG);
    const ed = E.editor(ORIG);
    const FPS = ORIG.project.fps || 30;
    const S = { ed: 'quick', sel: null, t: 7.0, open: null, playing: false, raf: 0, expanded: new Set(), log: [], bytes: 0, lastLog: '' };
    const seg = q('.v5-edseg'), bytesBox = q('.v5-bytes'), bytesN = q('.v5-bn');
    const why = q('.v5-why'), save = q('.v5-save'), wlist = q('.v5-wlist');
    const hosts = { quick: q('.v5-frame[data-ed="quick"]'), full: q('.v5-frame[data-ed="full"]') };
    const F = {
      quick: VIS.phoneFrame(hosts.quick, { name: 'Cooking with Mia', editor: 'quick', stageH: 196, tlH: 206, onTool: () => note('The tools are tried on the V3 page. Here, tap ' + orList(tapThings(E.classify(ed.doc))) + '.') }),
      full: VIS.phoneFrame(hosts.full, { name: 'Cooking with Mia', editor: 'full', stageH: 196, tlH: 206 })
    };
    F.full.tray.style.display = 'none';
    // The same outside height in both editors, so switching never makes the page jump.
    const dh = F.quick.root.offsetHeight - F.full.root.offsetHeight;
    if (dh > 0) F.full.timeline.style.height = (206 + dh) + 'px';
    F.full.fit(); F.quick.fit();
    let api = null;
    /* What there is to tap in the clip row right now, so no line names a gap or a red mark that an edit has removed. */
    function tapThings(R) {
      const out = ['a clip'];
      if (R.main.some(e => e.seam.kind === 'gap')) out.push('the gap block');
      if (R.main.some(e => e.seam.kind === 'overlap')) out.push('the red mark');
      return out;
    }

    /* ---- the log and the counter */
    function log(text, delta) {
      if (text === S.lastLog && !delta) return;
      S.lastLog = text;
      S.log.unshift({ text, delta: delta || 0, key: Date.now() + Math.random() });
      S.log.length = Math.min(S.log.length, 6);
    }
    function refreshBytes() {
      const was = S.bytes; S.bytes = bytesOf(ORIG, ed.doc);
      if (was !== S.bytes) { countTo(bytesN, was, S.bytes); pulse(bytesBox); } else bytesN.textContent = String(S.bytes);
      bytesBox.classList.toggle('wrote', S.bytes > 0);
      return S.bytes - was;
    }
    function note(text, action) { const f = F[S.ed]; VIS.toast(f.root, text, action || null, { ms: 3200 }); }

    /* ---- actions */
    function select(id, from) {
      S.sel = id;
      if (id) {
        const R = E.classify(ed.doc), uid = R.unitOf.get(id), u = uid != null ? R.units[uid] : null;
        if (u && ORDER.includes(u.section)) S.open = u.section;
        log('Picked ' + nm(R.layer(id)));
      }
      draw(from);
      if (id && S.ed === 'full' && from === 'list') scrollFullTo(id);
    }
    function switchTo(which, why2) {
      if (which === S.ed) return;
      const prev = S.ed; S.ed = which;
      segButtons(seg, which);
      hosts[prev].hidden = true; hosts[which].hidden = false;
      hosts[which].classList.remove('enter'); void hosts[which].offsetWidth; hosts[which].classList.add('enter');
      F[which].fit();
      log(why2 || ('Switched to ' + (which === 'full' ? 'Full' : 'Simple')));
      draw();
      if (which === 'full' && S.sel) scrollFullTo(S.sel);
    }
    function run(cmd, args, label) {
      stop();
      const res = ed.run(cmd, args);
      if (!res.ok) { note(res.say); return; }
      if (typeof res.time === 'number') S.t = Math.max(0, Math.min(res.time, ed.doc.project.duration - 0.01));
      const d = refreshBytes();
      log(label + (res.adopted ? ' · your first clip edit' : ''), d);
      draw();
      VIS.toast(F.quick.root, res.say, { label: 'Undo', run: undo }, { ms: 4200 });
    }
    function undo() {
      stop();
      const l = ed.undo(); if (!l) { note('Nothing to undo'); return; }
      const d = refreshBytes(); log('Undo: ' + l, d); draw();
    }
    function redo() {
      stop();
      const l = ed.redo(); if (!l) { note('Nothing to redo'); return; }
      const d = refreshBytes(); log('Redo: ' + l, d); draw();
    }
    function moreInFull() {
      const R = E.classify(ed.doc); const fo = Object.values(R.units).filter(u => u.kind === 'fullOnly');
      if (!fo.length) return;
      S.sel = fo[0].id;                                    // one item: straight to it (§8.2); this page has one
      switchTo('full', 'More in Full › took you to the camera');
    }
    function openInFull() { if (!S.sel) return; switchTo('full', 'Open in Full: same pick, other editor'); }
    function scrollFullTo(id) {
      const a = F.full._api; if (!a) return;
      const bar = a.items.get(id); if (!bar) return;
      const row = bar.closest('.fm-row'); if (!row) return;
      const sc = a.scroller; const top = row.offsetTop - 22;
      if (top < sc.scrollTop || top + row.offsetHeight > sc.scrollTop + sc.clientHeight - 10) sc.scrollTo({ top: Math.max(0, top - 30), behavior: reduced() ? 'auto' : 'smooth' });
    }

    /* ---- play and scrub (0 bytes) */
    function paintTime() {
      const f = F[S.ed], doc = ed.doc, R = E.classify(doc);
      const uid = S.sel ? R.unitOf.get(S.sel) : null;
      VIS.stage(f.stage, doc, S.t, { selected: uid != null && R.units[uid] ? R.units[uid].lead.id : S.sel });
      const a = S.ed === 'quick' ? api : F.full._api;
      if (a && a.setTime) a.setTime(S.t);
      setTimeOf(f, S.t, FPS, S.playing);
    }
    function scrub(t) { stop(); S.t = Math.max(0, Math.min(t, ed.doc.project.duration - 0.01)); log('Moved the playhead'); paintTime(); drawSave(); }
    function play() {
      if (S.playing) { stop(); return; }
      const D = ed.doc.project.duration;
      if (S.t >= D - 0.05) S.t = 0;
      S.playing = true; let last = performance.now(), lastPaint = 0;
      const step = now => {
        if (!S.playing) return;
        if (!host.isConnected) { S.playing = false; return; }
        S.t = Math.min(D, S.t + (now - last) / 1000); last = now;
        if (now - lastPaint > 33) { lastPaint = now; paintTime(); }
        if (S.t >= D - 1e-6) { S.t = D - 0.01; stop(); return; }
        S.raf = requestAnimationFrame(step);
      };
      paintTime();
      S.raf = requestAnimationFrame(step);
    }
    function stop() {
      if (!S.playing) return;
      S.playing = false; cancelAnimationFrame(S.raf);
      log('Played'); paintTime(); drawSave();
    }

    /* ---- wiring the two frames */
    ['quick', 'full'].forEach(k => {
      const f = F[k];
      f.on('switch', () => switchTo(k === 'quick' ? 'full' : 'quick'));
      f.on('play', play);
      f.on('undo', undo);
      f.on('redo', redo);
      f.on('toStart', () => { stop(); S.t = 0; paintTime(); });
      f.on('toEnd', () => { stop(); S.t = ed.doc.project.duration - 0.01; paintTime(); });
      f.root.addEventListener('click', e => {
        const b = e.target.closest('[data-act]'); if (!b || !f.root.contains(b)) return;
        if (!['switch', 'play', 'undo', 'redo', 'toStart', 'toEnd'].includes(b.dataset.act)) note('That button is not part of this page.');
      });
    });
    seg.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) switchTo(b.dataset.v); });

    /* ---- drawing */
    function draw(from) {
      const doc = ed.doc, R = E.classify(doc);
      const uid = S.sel ? R.unitOf.get(S.sel) : null;
      const selU = uid != null && R.units[uid] ? uid : null;
      const f = F[S.ed];
      VIS.stage(f.stage, doc, S.t, { selected: selU ? R.units[selU].lead.id : S.sel });
      setTimeOf(f, S.t, FPS, S.playing);
      F.quick.root.querySelector('[data-act="undo"]').classList.toggle('dim', !ed.canUndo());
      F.quick.root.querySelector('[data-act="redo"]').classList.toggle('dim', !ed.canRedo());
      F.full.root.querySelector('[data-act="undo"]').classList.toggle('dim', !ed.canUndo());
      F.full.root.querySelector('[data-act="redo"]').classList.toggle('dim', !ed.canRedo());
      if (S.ed === 'quick') drawQuickTL(R, selU); else drawFullTL();
      drawWhy(R, selU);
      drawSave();
      drawWhere(R, selU, from);
    }
    function drawQuickTL(R, selU) {
      const f = F.quick, doc = ed.doc;
      api = VIS.drawQuick(f.timeline, doc, {
        pxPerSec: 'fit', time: S.t, selected: selU, open: S.open, addButton: false,
        onTap: id => { stop(); select(S.sel && (S.sel === id || R.unitOf.get(S.sel) === id) ? null : id, 'phone'); },
        onScrub: scrub,
        onOpen: s => { S.open = s; log('Opened the ' + (SECN[s] || s) + ' row'); draw(); },
        onSeam: (id, kind, e) => run('closeGap', { id }, kind === 'gap' ? 'Closed the ' + secs(e.seam.amt) + ' gap' : 'Fixed the ' + secs(e.seam.amt) + ' overlap')
      });
      for (const id in R.units) if (levelOf(R, R.units[id]) === 'look') { const it = api.items.get(id); if (it) it.appendChild(VIS.fullBadge()); }
      // the tray row: the pick's line and tools, or the quiet line with its notices (§8.2)
      if (!selU) {
        const n = R.main.filter(e => !e.slot).length;
        const fo = Object.values(R.units).filter(u => u.kind === 'fullOnly').length;
        const say = trayTools(f, '<b>' + plural(n, 'clip') + '</b> · ' + mmss(doc.project.duration) + (fo ? ' · ' : ''), []);
        if (fo) { const b = el('button', 'v5-more', 'More in Full ›'); b.type = 'button'; b.addEventListener('click', e => { e.stopPropagation(); moreInFull(); }); say.appendChild(b); }
        else if (!n) say.innerHTML = 'Nothing in the clip row';
        return;
      }
      const u = R.units[selU], lead = u.lead, lv = levelOf(R, u), tools = [];
      let say;
      if (R.isMain(selU)) {
        say = (lv === 'look' ? '✦ ' : '') + '<b>Clip ' + clipNo(R, selU) + '</b> · ' + VIS.fmt(u.duration);
        tools.push({ id: 'lift', label: 'Lift off', icon: 'lift', aria: 'Lift off the clip row' });
      } else if (u.kind === 'block') {
        say = 'Block' + (u.host && R.isMain(u.host) ? ' · moves with <b>Clip ' + clipNo(R, u.host) + '</b>' : '');
      } else if (u.kind === 'overlay' && /^(video|image)$/.test(lead.type)) {
        say = (lv === 'look' ? '✦ ' : '') + (u.host && R.isMain(u.host) ? 'Moves with <b>Clip ' + clipNo(R, u.host) + '</b>' : 'Overlay · stays put');
        tools.push({ id: 'drop', label: 'Clip row', icon: 'drop', aria: 'Put in the clip row' });
      } else if (u.kind === 'text') say = '“' + esc(nm(lead).slice(0, 16)) + (nm(lead).length > 16 ? '…' : '') + '” · ' + (u.host ? 'moves with <b>Clip ' + clipNo(R, u.host) + '</b>' : 'stays put');
      else if (u.kind === 'audio') say = 'The song · ' + (u.host ? 'moves with its clip' : 'stays put');
      else if (u.kind === 'fullOnly') say = 'The camera · shown only in Full';
      else say = esc(nm(lead));
      if (lv === 'look' || lv === 'block' || lv === 'fullOnly') tools.push({ id: 'full', label: 'Open in Full', icon: 'editor' });
      trayTools(f, say, tools, id => {
        if (id === 'lift') run('makeOverlay', { id: selU }, 'Lifted ' + nm(lead) + ' off the clip row');
        else if (id === 'drop') run('makeMain', { id: selU }, 'Put ' + nm(lead) + ' in the clip row');
        else if (id === 'full') openInFull();
      });
    }
    function drawFullTL() {
      const f = F.full, doc = ed.doc;
      F.full._api = VIS.drawFull(f.timeline, doc, {
        pxPerSec: 'fit', time: S.t, selected: S.sel,
        onTap: id => { stop(); select(S.sel === id ? null : id, 'phone'); },
        onScrub: scrub
      });
    }
    function destChip(p) { return '<span class="v5-dest" style="--c:' + p.color + '"><i></i>' + esc(p.dest) + '</span>'; }
    function drawWhy(R, selU) {
      if (!S.sel) {
        const main = R.main.filter(e => !e.slot).length;
        const gaps = R.main.filter(e => e.seam.kind === 'gap').length, ovs = R.main.filter(e => e.seam.kind === 'overlap').length;
        const U = Object.values(R.units);
        const blocks = U.filter(u => u.kind === 'block').length, looks = U.filter(u => levelOf(R, u) === 'look').length, fo = U.filter(u => u.kind === 'fullOnly').length;
        const bits = [bold(plural(main, 'clip')) + ' in the clip row'];
        const seams = []; if (gaps) seams.push(bold(plural(gaps, 'gap'))); if (ovs) seams.push(bold(plural(ovs, 'overlap')));
        if (seams.length) bits.push(seams.join(' and ') + ' between them');
        if (blocks) bits.push(bold(plural(blocks, 'block')) + ' (things kept as one piece)');
        if (looks) bits.push(bold(plural(looks, 'thing')) + ' with moves (marked ✦)');
        if (fo) bits.push(bold(plural(fo, 'thing')) + ' only Full shows');
        why.innerHTML = '<h4 class="v5-sub">' + (R.adopted ? 'Your clip row' : 'What Simple worked out') + '</h4>' +
          '<p>' + (R.adopted ? 'Since your first clip edit, the clip row is saved in the project. It now has ' : 'Simple looked at ' + plural(ed.doc.layers.length, 'layer') + ' and found ') + andList(bits) + '.</p>' +
          '<p class="h-note">' + (S.ed === 'quick' ? 'Tap ' + orList(tapThings(R).concat('a row item')) + ' in the phone to see why it is there.' : 'Tap a layer to see where it goes in Simple.') + '</p>';
        return;
      }
      const l = R.layer(S.sel); if (!l) { S.sel = null; drawWhy(R, null); return; }
      const p = place(R, S.sel);
      const rs = reasons(R, S.sel);
      why.innerHTML = '<div class="v5-whyhead"><div><h4 class="v5-sub">' + esc(nm(l)) + '</h4><p class="v5-type">' + esc(typeWord(l)) + ' · ' + (S.ed === 'full' ? 'in Simple it goes to' : 'in Simple') + '</p></div>' + destChip(p) + '</div>' +
        rs.map(s => '<p>' + s + '</p>').join('');
      why.classList.remove('flash'); void why.offsetWidth; why.classList.add('flash');
    }
    function firstEdits() {
      const R = E.classify(ed.doc), out = [];
      if (R.main.some(e => e.seam.kind === 'gap')) out.push('closing the gap');
      if (R.main.some(e => e.seam.kind === 'overlap')) out.push('fixing the red mark');
      return orList(out.concat('Lift off', 'Put in the clip row'));
    }
    function drawSave() {
      const d = describe(ORIG, ed.doc, R0);
      const rows = S.log.map((g, i) => '<li class="' + (i === 0 ? 'new' : '') + (g.delta ? ' wrote' : '') + '"><span>' + esc(g.text) + '</span><b>' + (g.delta > 0 ? '+' : g.delta < 0 ? '−' : '') + Math.abs(g.delta) + ' bytes</b></li>').join('');
      save.innerHTML = '<h4 class="v5-sub">Saved to the project</h4>' +
        (S.bytes === 0
          ? '<p>Nothing. Opening, switching, picking, playing and opening rows only change what is on screen. The first <b>clip edit</b> (' + firstEdits() + ') is when Simple saves its clip row.</p>'
          : '<p>Your first clip edit saved what Simple had worked out, in the same step as the edit:</p>' +
            (d.saved.length ? '<ul class="v5-saved">' + d.saved.map(s => '<li>' + s + '</li>').join('') + '</ul>' : '') +
            (d.edit.length ? '<p class="v5-lbl">And the edit itself</p><ul class="v5-saved">' + d.edit.map(s => '<li>' + s + '</li>').join('') + '</ul>' : '') +
            '<p class="h-note">Undo takes it all back, the marks too. Nothing else is ever tidied by itself.</p>') +
        (rows ? '<p class="v5-lbl">What you did</p><ol class="v5-log">' + rows + '</ol>' : '');
      // only the newest row animates in
      const nw = save.querySelector('.v5-log li.new'); if (nw && S.log[0] && S.log[0].key === S._animKey) nw.classList.remove('new');
      if (S.log[0]) S._animKey = S.log[0].key;
    }
    function drawWhere(R, selU, from) {
      const focusId = document.activeElement && document.activeElement.closest && document.activeElement.closest('.v5-wrow') ? document.activeElement.closest('.v5-wrow').dataset.id : null;
      const byId = new Map(ed.doc.layers.map(l => [l.id, l]));
      wlist.innerHTML = '';
      ed.doc.layers.forEach(l => {
        const p = place(R, l.id), li = el('li');
        const member = l.parent && byId.get(l.parent) && byId.get(l.parent).type === 'group';
        const on = S.sel && (S.sel === l.id || (selU && selU === l.id) || (selU && p.uid === selU && p.member));
        const b = el('button', 'v5-wrow' + (on ? ' on' : '') + (member ? ' member' : ''));
        b.type = 'button'; b.dataset.id = l.id; b.setAttribute('aria-expanded', String(S.expanded.has(l.id)));
        const sw = el('span', 'sw'); sw.style.background = l.type === 'text' ? '#50398d' : l.audioOnly ? '#174f42' : l.type === 'camera' ? 'repeating-linear-gradient(135deg,#2b3a44 0 4px,#24313a 4px 8px)' : l.type === 'group' ? 'linear-gradient(180deg, rgba(126,231,255,.6), rgba(94,106,255,.55))' : VIS.thumb(l);
        if (l.type === 'text') sw.textContent = 'Aa';
        b.appendChild(sw);
        b.appendChild(el('span', 'nm', '<span class="t">' + esc(nm(l)) + '</span> <small>' + esc(typeWord(l)) + '</small>'));
        b.appendChild(el('span', 'to', '<span class="arr" aria-hidden="true">→</span>' + destChip(p) + (levelOf(R, p.u) === 'look' && !p.member ? '<span class="v5-star" title="Has moves">✦</span>' : '')));
        b.addEventListener('click', () => {
          stop();
          if (S.expanded.has(l.id)) S.expanded.delete(l.id); else S.expanded.add(l.id);
          select(l.id, 'list');
        });
        li.appendChild(b);
        if (S.expanded.has(l.id)) li.appendChild(el('div', 'v5-wreason', reasons(R, l.id).map(s => '<p>' + s + '</p>').join('')));
        wlist.appendChild(li);
      });
      if (focusId && from === 'list') { const nb = wlist.querySelector('.v5-wrow[data-id="' + (window.CSS && CSS.escape ? CSS.escape(focusId) : focusId) + '"]'); if (nb) nb.focus({ preventScroll: true }); }
    }

    // first paint: Simple shown, Full hidden
    hosts.full.hidden = true;
    segButtons(seg, 'quick');
    log('Opened in Simple');
    draw();
    host._v5 = { S, ed, F };
  }

  /* ================================================================== part 2: Studio tips */
  function mountStudio(host, q) {
    const seg = q('.v5-modeseg'), tests = q('.v5-tests'), tryBox = q('.v5-try');
    const C = { mode: 'after', base: null, doc: null, sel: null, t: 13, open: null, deleted: null };
    const f = VIS.phoneFrame(q('.v5-cphone'), { name: 'Studio tips', editor: 'quick', stageH: 214, tlH: 190, onTool: () => toast('The tools are tried on the V3 page. Here, tap a cutaway, then Delete.') });
    const FPS = 30;
    function toast(text, action) { VIS.toast(f.root, text, action || null, { ms: 3400 }); }
    function reset(mode) {
      C.mode = mode; C.base = studioDoc(mode); C.doc = E.clone(C.base); C.sel = null; C.open = null;
      if (C.deleted) applyDelete(C.deleted, true);
    }
    function applyDelete(id, silent) {
      let say;
      if (C.mode === 'before') {
        const ed = E.editor(C.doc); const r = ed.run('deleteClip', { id });
        if (!r.ok) { if (!silent) toast(r.say); return false; }
        C.doc = ed.doc; say = 'Deleted clip';
      } else {
        C.doc = E.clone(C.doc); C.doc.layers = C.doc.layers.filter(l => l.id !== id);   // an overlay goes; nothing ripples (§5.2)
        say = 'Deleted the video on top';
      }
      C.deleted = id; C.sel = null;
      if (!silent) toast(say, { label: 'Undo', run: putBack });
      return true;
    }
    function putBack() { C.deleted = null; reset(C.mode); draw(); }
    function del(id) { if (C.deleted) { C.deleted = null; reset(C.mode); } applyDelete(id); draw(); }

    f.on('play', () => toast('Drag along the numbers at the top to move the playhead.'));
    f.on('switch', () => toast('This part stays in Simple. The switch in the ⚙ cog is tried in V1.'));
    f.on('undo', () => { if (C.deleted) putBack(); else toast('Nothing to undo'); });
    f.root.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b || !f.root.contains(b)) return;
      if (!['play', 'switch', 'undo'].includes(b.dataset.act)) toast('That button is not part of this page.');
    });
    seg.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b || b.dataset.v === C.mode) return; reset(b.dataset.v); segButtons(seg, C.mode); f.root.classList.remove('v5-swap'); void f.root.offsetWidth; f.root.classList.add('v5-swap'); draw(); });

    function speechAt(t) { const cap = C.base.layers.find(l => l.id === 'acap'); const q2 = cap && cap.captions.find(c => t >= cap.start + c.start - 0.3 && t < cap.start + c.end); return q2 ? q2.text : null; }
    function cuesOf(doc) { const cap = doc.layers.find(l => l.id === 'acap'); return cap ? cap.captions.map(c => ({ text: c.text, s: cap.start + c.start })) : []; }

    function draw() {
      const doc = C.doc, R = E.classify(doc);
      segButtons(seg, C.mode);
      VIS.stage(f.stage, doc, C.t, { selected: C.sel });
      setTimeOf(f, C.t, FPS, false);
      f.root.querySelector('[data-act="undo"]').classList.toggle('dim', !C.deleted);
      f.root.querySelector('[data-act="redo"]').classList.add('dim');
      const open = C.open || (C.mode === 'before' ? 'behind' : 'overlay');
      const api = VIS.drawQuick(f.timeline, doc, {
        pxPerSec: 'fit', time: C.t, selected: C.sel, open, addButton: false,
        onTap: id => { C.sel = C.sel === id ? null : id; const u = R.units[id]; if (C.sel && u && ORDER.includes(u.section)) C.open = u.section; draw(); },
        onScrub: t => { C.t = Math.max(0, Math.min(t, doc.project.duration - 0.01)); VIS.stage(f.stage, doc, C.t, { selected: C.sel }); api.setTime(C.t); setTimeOf(f, C.t, FPS, false); },
        onOpen: s => { C.open = s; draw(); },
        onSeam: () => toast('These gaps are where she talks. Closing them would pull the cutaways off her words.')
      });
      // the tray row
      if (!C.sel) {
        const n = R.main.filter(e => !e.slot).length;
        const gaps = R.main.filter(e => e.seam.kind === 'gap').length;
        trayTools(f, '<b>' + plural(n, 'clip') + '</b> · ' + mmss(R.trackEnd) + (gaps ? ' · ' + plural(gaps, 'gap') : ''), []);
      } else {
        const u = R.units[C.sel], lead = u.lead, cut = /^b\d$/.test(C.sel);
        let say;
        if (R.isMain(C.sel)) say = '<b>Clip ' + clipNo(R, C.sel) + '</b> · ' + VIS.fmt(u.duration) + (C.sel === 'a1' ? ' · her voice' : '');
        else if (u.section === 'behind') say = 'Behind · stays put';
        else if (u.kind === 'captions') say = 'Captions · follow her words';
        else if (u.host && R.isMain(u.host)) say = 'Moves with <b>Clip ' + clipNo(R, u.host) + '</b>';
        else say = '“' + esc(nm(lead)) + '” · ' + (R.tail.includes(C.sel) ? 'end card' : 'stays put');
        trayTools(f, say, cut ? [{ id: 'del', label: 'Delete', icon: 'delete' }] : [], () => del(C.sel));
      }
      drawTests(R);
      drawTry(R);
    }

    function drawTests(R) {
      // measured on the project as it is now, so the answers stay true after a cutaway is deleted
      const doc = C.doc, L = new Map(doc.layers.map(l => [l.id, l])), a1 = L.get('a1');
      const cuts = doc.layers.filter(l => /^b\d$/.test(l.id));
      const z = new Map(doc.layers.map((l, i) => [l.id, i]));
      const above = cuts.every(c => z.get(c.id) < z.get('a1'));
      // how much of the talking head only it shows
      const iv = cuts.map(c => [Math.max(a1.start, c.start), Math.min(a1.start + a1.duration, c.start + c.duration)]).filter(x => x[1] > x[0]).sort((x, y) => x[0] - y[0]);
      let covered = 0, cur = null; iv.forEach(x => { if (!cur || x[0] > cur[1]) { if (cur) covered += cur[1] - cur[0]; cur = x.slice(); } else cur[1] = Math.max(cur[1], x[1]); }); if (cur) covered += cur[1] - cur[0];
      const alone = a1.duration - covered, silent = !!a1.muted, before = C.mode === 'before';
      const row = (ok, head, text, skip) => '<li class="' + (skip ? 'skip' : ok ? 'yes' : 'no') + '"><i>' + markSvg(skip ? null : ok) + '</i><div><b>' + head + '</b><span>' + text + '</span></div></li>';
      tests.innerHTML = '<h4 class="v5-sub">Is the talking head a backdrop?</h4>' +
        '<p>A backdrop goes behind, and the clips on top of it become the clip row. ' + (before ? 'The first draft asked one question:' : 'Simple asks three questions, and it takes all three yeses:') + '</p>' +
        '<ol class="v5-q">' +
          row(above, 'Do the other clips all sit above it?', above ? 'Yes. ' + (cuts.length === 1 ? 'The cutaway is' : cuts.length === 2 ? 'Both cutaways are' : 'All ' + numWord(cuts.length) + ' cutaways are') + ' higher in the stack.' : 'No.') +
          row(alone <= 0.05, 'Do they cover all of it, with no holes?', alone <= 0.05 ? 'Yes.' : 'No. For ' + VIS.fmt(alone) + ' of its ' + VIS.fmt(a1.duration) + ' only the talking head shows.', before) +
          row(silent, 'Is it silent?', silent ? 'Yes.' : 'No. It is her voice.', before) +
        '</ol>' +
        '<p class="v5-verdict ' + (before ? 'bad' : 'good') + '">' + (before
          ? 'One yes was enough, so the talking head was sent <b>Behind</b> as a backdrop. The cutaways became the clip row, and the stretches where she talks turned into gap blocks.'
          : 'Two answers are no, so it is not a backdrop. The talking head is <b>Clip 1</b>, and the cutaways are overlays riding on it.') + '</p>';
    }

    function drawTry(R) {
      const btn = (id, cls, text) => '<button type="button" class="h-btn' + (cls ? ' ' + cls : '') + '" data-do="' + id + '">' + text + '</button>';
      if (!C.deleted) {
        tryBox.innerHTML = '<h4 class="v5-sub">Try it: delete a cutaway</h4>' +
          '<p>Delete the Lamp cutaway, then flip between the two rules. Her talking head never moves, so anything else that moves is now out of step with what she says.</p>' +
          '<div class="h-row">' + btn('b2', 'primary', 'Delete the Lamp cutaway') + '</div>';
      } else {
        const base = C.base, now = C.doc;
        const B = new Map(base.layers.map(l => [l.id, l])), N = new Map(now.layers.map(l => [l.id, l]));
        const items = [];
        const gone = nm(B.get(C.deleted));
        items.push([null, bold(gone) + ' is gone.']);
        const moved = [];
        base.layers.forEach(l => { const n = N.get(l.id); if (n && l.id !== 'acap' && Math.abs(n.start - l.start) > 0.01) moved.push([l, n]); });
        if (!moved.length) items.push([true, 'Nothing else moved.']);
        moved.forEach(([l, n]) => {
          const d = n.start - l.start, sp = speechAt(n.start + 0.4);
          let why2 = '';
          if (/^b\d$/.test(l.id) && sp) why2 = ', so it now shows while she says “' + esc(sp) + '”';
          else if (l.id === 'end' && n.start < 30) why2 = ', so it pops up while she is still talking';
          items.push([false, bold(nm(l)) + ' moved ' + secs(d) + (d < 0 ? ' earlier' : ' later') + why2 + '.']);
        });
        const oc = cuesOf(base), nc = cuesOf(now);
        let inStep = 0; const lines = [];
        oc.forEach(c => {
          const m = nc.find(x => x.text === c.text);
          if (!m) lines.push('“' + esc(c.text) + '” was deleted.');
          else if (Math.abs(m.s - c.s) < 0.05) inStep++;
          else lines.push('“' + esc(c.text) + '” now shows ' + secs(m.s - c.s) + (m.s < c.s ? ' before' : ' after') + ' she says it.');
        });
        items.push([inStep === oc.length, 'Captions in step with her voice: <b>' + inStep + ' of ' + oc.length + '</b>.' + (lines.length ? '<span class="v5-sublines">' + lines.join('<br>') + '</span>' : '')]);
        tryBox.innerHTML = '<h4 class="v5-sub">' + (C.mode === 'before' ? 'Before the fix: what the delete did' : 'After the fix: what the delete did') + '</h4>' +
          '<ul class="v5-res">' + items.map(([ok, t]) => '<li class="' + (ok === true ? 'yes' : ok === false ? 'no' : 'info') + '"><i>' + (ok === null ? VIS.icon('delete') : markSvg(ok)) + '</i><div>' + t + '</div></li>').join('') + '</ul>' +
          '<p class="h-note">' + (C.mode === 'before' ? 'With the cutaways as the clip row, deleting one closed up the row, and everything after it slid away from her words.' : 'A cutaway is an overlay, so deleting it takes it away and moves nothing.') + ' Flip the rule above to compare.</p>' +
          '<div class="h-row">' + btn('back', '', 'Put it back') + '</div>';
      }
      tryBox.querySelectorAll('[data-do]').forEach(b => b.addEventListener('click', () => { if (b.dataset.do === 'back') putBack(); else del(b.dataset.do); }));
    }

    reset('after');
    segButtons(seg, 'after');
    draw();
  }
})();
