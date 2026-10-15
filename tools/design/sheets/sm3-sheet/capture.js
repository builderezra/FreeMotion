/* tools/design/sheets/sm3-sheet/capture.js - the app-side half of capture.py: the pictures for Ezra's Simple Phase 3 sheet (#545:
   nothing visual new to him ships unseen; tools/design/plans/sm3-stack/NOTES.md "NEEDS EZRA'S EYES", 14 items).

   Evaluated by capture.py in a page of the app itself (index.html on the worktree's own server), once per page load. It defines
   window.SM3SHEET: list(tag) -> the scenes for a viewport ('380' phone, '1280' PC, '900' small PC), count(scene), and
   step(scene, i, tag) -> { ok, name, crop, meta } | { ok, skip } | { ok: false, error }. Each step leaves the page in the state of
   ONE picture; capture.py takes it the moment the step returns. Every scene starts on a fresh page load, so no step inherits
   another scene's state.

   A WRONG SELECTOR FAILS LOUDLY, BY NAME: every step counts the boxes it expects (need / needTools) before it returns, and throws
   "MISSING <what> - <selector> matched n, want m" instead of letting an empty frame be shot as if it were the picture.

   The setups are the suite's own (tests/tests.js): smV / smPic / smT / smSong / smCap, smClips3, S9 option E's three video clips,
   smSegClips, sm3Proj, 2A row 16's clips. Two cosmetic changes, both said here: the project is 640x360 (the suite's is 320x240), and
   picture clips get a drawn beach picture (the suite's are flat red), so the preview shows something a person can read.

   Three pictures are DRAWN, not built (the sheet says so under each): the PC tray on the design's wider band (option b), the PC
   tray with Move earlier / later as one tool (option c), and the caption tray with short words. Each is the real tray with its
   real buttons, rearranged the way the app lays out a tray that fits (fillTray's two-row path; tools are moved, never rebuilt). */
(function () {
  'use strict';
  if (window.SM3SHEET) return;
  const STEP_MS = 45000;
  const PW = 640, PH = 360;
  const ST = {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  async function frames(n) { for (let i = 0; i < (n || 2); i++) await frame(); }
  function finishAnims() { document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }); }
  async function settle(ms) { await sleep(ms == null ? 300 : ms); finishAnims(); await frames(2); }
  async function idle() { for (let i = 0; i < 400 && window.FM && FM.spine && FM.spine.running; i++) await sleep(10); await sleep(40); }
  const PHONE = () => window.matchMedia('(max-width: 700px)').matches;

  /* ---------- finding things, loudly ---------- */
  function fail(what, detail) { throw new Error('MISSING ' + what + (detail ? ' - ' + detail : '')); }
  function box(el) { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }
  function shown(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }
  /* at least `min` elements matching `sel` on screen */
  function need(sel, min, what, root) {
    const all = Array.from((root || document).querySelectorAll(sel)), vis = all.filter(shown);
    if (vis.length < min) fail(what, '"' + sel + '" matched ' + all.length + ' (' + vis.length + ' on screen), want at least ' + min);
    return vis;
  }
  /* exactly `n` in the document (some may be scrolled out of their strip or sheet) */
  function count(sel, n, what, root) {
    const all = Array.from((root || document).querySelectorAll(sel));
    if (all.length !== n) fail(what, '"' + sel + '" matched ' + all.length + ', want ' + n);
    return all;
  }
  const toolIds = sel => Array.from(document.querySelectorAll(sel)).map(b => b.dataset.tool);
  function needTools(sel, want, what) {
    const got = toolIds(sel).join(',');
    if (got !== want.join(',')) fail(what, '"' + sel + '" holds ' + (got || 'nothing') + ', want ' + want.join(','));
  }
  const tool = id => document.querySelector('#sm-tray .sm-tool[data-tool="' + id + '"]') || document.querySelector('#sm-tools .sm-tool[data-tool="' + id + '"]');
  function press(id, what) {
    const b = tool(id);
    if (!b) fail(what || ('the ' + id + ' tool'), 'no .sm-tool[data-tool="' + id + '"] in #sm-tray or #sm-tools (the tray holds ' + toolIds('#sm-tray .sm-tool') + '; the row holds ' + toolIds('#sm-tools .sm-tool') + ')');
    b.click();
    return b;
  }
  function rowsOf(sel) {
    const rows = {};
    document.querySelectorAll(sel).forEach(b => { const y = Math.round(b.getBoundingClientRect().top); rows[y] = (rows[y] || 0) + 1; });
    return Object.keys(rows).map(Number).sort((a, b) => a - b).map(y => rows[y]);
  }
  /* tools whose words do not fit their button */
  function cutLabels(sel) {
    return Array.from(document.querySelectorAll(sel)).filter(b => {
      const l = b.querySelector('.sm-tool-l, .sm-fx-name');
      if (!l) return false;
      const r = b.getBoundingClientRect(), q = l.getBoundingClientRect();
      return l.scrollWidth > l.clientWidth + 1 || q.left < r.left - 0.5 || q.right > r.right + 0.5;
    }).map(b => b.dataset.tool);
  }
  /* the tray's tool strip (a one-row tray): does it scroll, and which tools are not wholly on show in it */
  function stripInfo() {
    const run = document.querySelector('#sm-tray .sm-run');
    if (!run) return { scrolls: false, hidden: [] };
    const v = run.getBoundingClientRect();
    const hidden = Array.from(run.querySelectorAll('.sm-tool')).filter(b => {
      const r = b.getBoundingClientRect();
      return r.left < v.left - 0.5 || r.right > v.right + 0.5 || r.right > innerWidth + 0.5;
    }).map(b => b.dataset.tool);
    return { scrolls: run.scrollWidth > run.clientWidth + 1, hidden: hidden };
  }
  /* simple-tools.js edges(): the fades say where tools are hidden */
  function fades(run) {
    const bx = run && run.parentNode;
    if (!bx || !bx.classList) return;
    const max = run.scrollWidth - run.clientWidth;
    bx.classList.toggle('sm-more-s', max > 1 && run.scrollLeft > 1);
    bx.classList.toggle('sm-more-e', max > 1 && run.scrollLeft < max - 1);
  }
  /* the crop: the PC band (#inspector-panel), widened to take in any extra element (a menu above it); on a phone the two rows
     under the timeline (#sm-bar) when `bar` is asked for, else null (the whole screen) */
  function rectUnion(els) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    els.forEach(e => { if (!e || !e.isConnected) return; const r = e.getBoundingClientRect(); if (r.width < 1) return; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
    if (!isFinite(x0)) return null;
    x0 = Math.max(0, Math.floor(x0 - 2)); y0 = Math.max(0, Math.floor(y0 - 2));
    x1 = Math.min(innerWidth, Math.ceil(x1 + 2)); y1 = Math.min(innerHeight, Math.ceil(y1 + 2));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function crop(o) {
    o = o || {};
    if (PHONE()) {
      if (!o.bar) return null;
      const b = document.getElementById('sm-bar');
      if (!b || !shown(b)) fail('the phone tool rows', '#sm-bar is not on screen');
      return rectUnion([b]);
    }
    const p = document.getElementById('inspector-panel');
    if (!p || !shown(p)) fail('the PC band', '#inspector-panel is not on screen');
    return rectUnion([p].concat(o.extra || []));
  }
  /* the PC play bar: every button and the time readout inside #transport, none overlapping the next, nothing to scroll */
  function playbar() {
    const t = document.getElementById('transport');
    if (!t || !shown(t)) return { fits: null, why: 'no play bar on screen' };
    const tr = t.getBoundingClientRect();
    const kids = Array.from(t.querySelectorAll('button, #time-readout')).filter(shown);
    const out = kids.filter(k => { const r = k.getBoundingClientRect(); return r.left < tr.left - 0.5 || r.right > tr.right + 0.5; });
    const rs = kids.map(k => k.getBoundingClientRect()).sort((a, b) => a.left - b.left);
    let overlaps = 0;
    for (let i = 1; i < rs.length; i++) if (rs[i].left < rs[i - 1].right - 1 && Math.abs(rs[i].top - rs[i - 1].top) < rs[i].height / 2) overlaps++;
    const scrolls = t.scrollWidth > t.clientWidth + 1;
    return { fits: !out.length && !overlaps && !scrolls, buttons: kids.length, out: out.map(k => k.id || k.title || String(k.className)), overlaps: overlaps, scrolls: scrolls, width: Math.round(tr.width) };
  }
  const panelW = () => { const p = document.getElementById('timeline-panel'); return p ? Math.round(p.getBoundingClientRect().width) : null; };
  /* the tools that run past the band's sides */
  function outsideBand(sel) {
    const p = document.getElementById('inspector-panel');
    if (!p) return [];
    const br = p.getBoundingClientRect();
    return Array.from(document.querySelectorAll(sel)).filter(b => { const r = b.getBoundingClientRect(); return r.left < br.left - 0.5 || r.right > br.right + 0.5; }).map(b => b.dataset.tool);
  }

  /* ---------- the suite's layers (tests/tests.js smV, smPic, smT, smSong, smCap), copied as they are ---------- */
  function smV(name, start, dur, W, H, o) {
    const l = FM.makeLayer('video', { name: name, x: W / 2, y: H / 2, start: start, duration: dur });
    l.srcW = W; l.srcH = H; l.srcRev = 0; l.muted = true;
    return Object.assign(l, o || {});
  }
  function smPic(name, start, dur, W, H, o) { return smV(name, start, dur, W, H, Object.assign({ type: 'image' }, o || {})); }
  function smT(name, start, dur, W, H, o) { const l = FM.makeLayer('text', { name: name, text: name, x: W / 2, y: H * 0.2, start: start, duration: dur }); return Object.assign(l, o || {}); }
  function smSong(name, start, dur, W, H, o) { const l = FM.makeLayer('video', { name: name, x: W / 2, y: H / 2, start: start, duration: dur }); l.audioOnly = true; return Object.assign(l, o || {}); }
  function smCap(name, start, dur, cues, W, H, o) {
    const l = FM.makeLayer('text', { name: name, text: '', x: W / 2, y: H * 0.8, start: start, duration: dur });
    l.captions = cues.map(c => ({ start: c[0], end: c[1], text: c[2] || 'x' }));
    return Object.assign(l, o || {});
  }
  /* a drawn beach (sky, sun, sea, sand), one light per clip, as a picture clip's media record (the Look tests' smLookPic shape) */
  function beach(W, H, i) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), hue = [24, 200, 315][i % 3];
    const sky = g.createLinearGradient(0, 0, 0, H * 0.62);
    sky.addColorStop(0, 'hsl(' + hue + ', 62%, 48%)'); sky.addColorStop(1, 'hsl(' + (hue + 28) + ', 85%, 78%)');
    g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.62);
    g.fillStyle = 'rgba(255, 238, 170, 0.95)'; g.beginPath(); g.arc(W * (0.3 + 0.2 * i), H * 0.36, H * 0.1, 0, Math.PI * 2); g.fill();
    const sea = g.createLinearGradient(0, H * 0.6, 0, H * 0.8);
    sea.addColorStop(0, '#1d5f96'); sea.addColorStop(1, '#2ea2c2');
    g.fillStyle = sea; g.fillRect(0, H * 0.6, W, H * 0.2);
    g.strokeStyle = 'rgba(255, 255, 255, 0.6)'; g.lineWidth = Math.max(1, H / 140);
    for (let k = 0; k < 4; k++) { const y = H * (0.64 + k * 0.035); g.beginPath(); g.moveTo(W * (0.08 + 0.1 * k), y); g.lineTo(W * (0.42 + 0.12 * k), y); g.stroke(); }
    g.fillStyle = '#e6cc94'; g.fillRect(0, H * 0.8, W, H * 0.2);
    g.fillStyle = '#c9a86a'; g.beginPath(); g.ellipse(W * 0.72, H * 0.9, W * 0.12, H * 0.025, 0, 0, Math.PI * 2); g.fill();
    return { kind: 'image', el: c, width: W, height: H };
  }
  const L = n => FM.scene.layers.find(l => l.name === n) || null;
  const picsABC = (W, H) => [smPic('C', 4, 2, W, H), smPic('B', 2, 2, W, H), smPic('A', 0, 2, W, H)];
  const vidsS9 = (W, H) => [smV('C', 5, 3, W, H, { muted: false }), smV('B', 3, 2, W, H, { muted: false }), smV('A', 0, 3, W, H, { muted: false })];

  /* A throwaway project in this page's own throwaway profile, the way the suite's smP2 makes one (Home closed, the scene applied,
     history reset), then Simple on (or Full, quietly) and everything drawn */
  async function setup(o) {
    for (let i = 0; i < 200 && !(window.FM && FM.projects && FM.storage && FM.editor && FM.spine && FM.spine.cmd && FM.simpleTools && FM.makeLayer && FM.media); i++) await sleep(50);
    if (!(window.FM && FM.spine && FM.spine.cmd && FM.simpleTools && FM.simpleTools.drawPanel && FM.editorMorph)) fail('the Phase 3 app', 'FM.spine.cmd / FM.simpleTools.drawPanel / FM.editorMorph are not all there - is the server serving the sm3 stack?');
    /* the boot restores the last project and THEN opens Home (every load is a first load here: capture.py's seed), so Home on
       screen means the restore is over and cannot land on top of the project made below */
    for (let i = 0; i < 300 && !(FM.home && FM.home.isOpen && FM.home.isOpen()); i++) await sleep(50);
    if (!(FM.home && FM.home.isOpen && FM.home.isOpen())) fail('Home after the app started', 'it never opened in 15 s, so the boot may still be restoring a project');
    await sleep(300);
    FM.home.close(); await sleep(400);
    /* the drawn clips have no footage FILE, so applyScene's load toast ("3 layers have no footage in this file …") sat over the
       timeline in every phone picture (first sheet run, 16 Oct). It is this fixture's, not something he sees with real clips. */
    if (!document.getElementById('sheet-no-toast')) { const st = document.createElement('style'); st.id = 'sheet-no-toast'; st.textContent = '#toast{display:none!important}'; document.head.appendChild(st); }
    const W = PW, H = PH;
    await FM.projects.create({ name: 'Beach day', width: W, height: H });
    await FM.storage.applyScene({ project: { name: 'Beach day', width: W, height: H, fps: 30, duration: 0, background: '#000000' }, layers: o.build(W, H), selectedId: null, selectedIds: [] });
    FM.history.reset(); FM.selectLayer(null); FM.time = o.time || 0;
    (o.pics || []).forEach((n, i) => { const l = L(n); if (!l) fail('the clip named ' + n); FM.media.set(l.id, beach(W, H, i)); });
    if (o.full) FM.editor.apply('full', { force: true, quiet: true }); else FM.editor.set('simple');
    FM.refreshAll(); await settle(800);
    if (!o.full && !FM.editor.isSimple()) fail('Simple on screen', 'FM.editor.set("simple") left ' + FM.editor.mode());
    if (o.full && FM.editor.mode() !== 'full') fail('Full on screen', 'the editor is ' + FM.editor.mode());
    if (!o.full) need('#sm-tools .sm-tool', 6, 'the project row');
  }
  async function select(name) {
    const l = L(name);
    if (!l) fail('the clip named ' + name);
    FM.selectLayer(l.id); await settle(350);
    return l;
  }
  async function reselect(name) { FM.simpleTools._reset(); FM.selectLayer(null); await settle(200); return select(name); }
  async function slide(sel, v, what) {
    const r = document.querySelector(sel);
    if (!r) fail(what, 'no "' + sel + '"');
    r.value = String(v);
    r.dispatchEvent(new Event('input', { bubbles: true }));
    r.dispatchEvent(new Event('change', { bubbles: true }));
    await idle(); await settle(300);
  }
  /* lay the tray's own buttons out as the app lays out a tray that fits two rows (fillTray's two-row path + rows(true)) */
  function twoRows(cols) {
    const tray = document.getElementById('sm-tray'), say = document.getElementById('sm-say');
    if (!tray || !say) fail('the tray row', '#sm-tray / #sm-say');
    const btns = Array.from(tray.querySelectorAll('.sm-tool'));
    Array.from(tray.children).forEach(c => c.remove());
    btns.forEach(b => tray.appendChild(b));
    tray.style.setProperty('--sm-cols', String(cols));
    tray.classList.add('sm-tray-2'); say.classList.add('sm-two');
    const h = document.querySelector('#inspector > .sm-band-hint[data-sel]');
    if (h) h.textContent = (FM.spineWords && FM.spineWords.tools && FM.spineWords.tools.bandHintSelPc) || 'Its tools are below';
    return btns.length;
  }
  function mark(items) {
    unmark();
    const lay = document.createElement('div'); lay.id = 'sm3sheet-mark';
    lay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
    items.forEach(it => {
      const b = document.createElement('div');
      b.style.cssText = 'position:absolute;box-sizing:border-box;border-radius:10px;left:' + (it.r.x - 4) + 'px;top:' + (it.r.y - 4) + 'px;width:' + (it.r.w + 8) + 'px;height:' + (it.r.h + 8) + 'px;border:3px ' + (it.dashed ? 'dashed' : 'solid') + ' #ffd400;box-shadow:0 0 0 2px rgba(0,0,0,.55)';
      const t = document.createElement('div'); t.textContent = it.label;
      t.style.cssText = 'position:absolute;right:-4px;' + (it.above ? 'bottom:100%;margin-bottom:5px;' : 'top:100%;margin-top:5px;') + 'white-space:nowrap;background:#ffd400;color:#111;font:700 13px/1.3 system-ui,sans-serif;padding:2px 7px;border-radius:6px';
      b.appendChild(t); lay.appendChild(b);
    });
    if (items.length === 2) {
      const a = items[0].r, b = items[1].r, x = a.x + a.w / 2, y0 = Math.min(a.y, b.y) + Math.min(a.h, b.h), y1 = Math.max(a.y, b.y) - 4;
      if (y1 > y0 + 8) { const ln = document.createElement('div'); ln.style.cssText = 'position:absolute;left:' + (x - 1) + 'px;top:' + y0 + 'px;height:' + (y1 - y0) + 'px;border-left:3px dotted #ffd400'; lay.appendChild(ln); }
    }
    document.body.appendChild(lay);
  }
  function unmark() { const m = document.getElementById('sm3sheet-mark'); if (m) m.remove(); }
  /* what a press at the centre of `r` would land on now */
  function underOf(r) {
    const u = document.elementFromPoint(r.x + r.w / 2, r.y + r.h / 2);
    if (!u) return 'nothing';
    const b = u.closest('button, [role="button"]') || u;
    return String(b.getAttribute('aria-label') || b.getAttribute('title') || (b.textContent || '').trim().slice(0, 48) || b.id || b.className || b.tagName);
  }

  /* ---------- the morph, held (js/editor-morph.js _hold: paused, its guard timer off) ---------- */
  async function morphTo(to) {
    if (FM.editorMorph.live()) { FM.editorMorph.stop(); await settle(400); }
    const ok = await FM.editor.request(to, { from: 'cog' });
    if (!ok || FM.editor.mode() !== to) fail('the switch to ' + to, 'FM.editor.request refused (the editor is ' + FM.editor.mode() + ')');
    /* the cog closes about 260 ms after its switch (sm3CogTo): a rebuild the switch causes (a PC band changing width) lands
       here, before the morph starts, as it does under the cog - a rebuild while it is held would land it */
    await sleep(320);
    FM.editor.afterCogClose();
    const an = FM.editorMorph._hold();
    if (!an || !an.length) fail('the morph to ' + to, 'nothing played as the cog closed (FM.editorMorph._hold() gave ' + JSON.stringify(an) + ')');
    const flies = document.querySelectorAll('#ed-morph .edm-fly').length;
    if (flies < 2) fail('the flying boxes', '"#ed-morph .edm-fly" matched ' + flies + ', want at least 2');
    ST.anims = an;
    const s = FM.editorMorph._state ? FM.editorMorph._state() : null;
    ST.kinds = s ? s.flights.reduce((o, f) => { o[f.k] = (o[f.k] || 0) + 1; return o; }, {}) : null;
  }
  async function seek(frac, name) {
    const T = FM.editorMorph.MS || 320, t = frac >= 1 ? T - 0.5 : frac * T;
    if (!ST.anims || !FM.editorMorph.live() || !document.getElementById('ed-morph')) fail('the held morph at ' + Math.round(frac * 100) + '%', 'it landed early (a rebuild, a resize or a press lands it)');
    ST.anims.forEach(a => { try { a.currentTime = t; } catch (e) {} });
    await frames(3);
    return { name: name, meta: { ms: Math.round(t), flights: ST.kinds } };
  }

  /* ---------- the scenes: each a list of steps, one picture per step ---------- */
  const BAR = { bar: true };
  const SCENES = {
    /* NEEDS 5: the project row, six tools (and the first-run hint in the tray row, NEEDS 3's "speed or look") */
    row: { tags: ['380', '1280'], steps: [
      async function () {
        await setup({ build: picsABC, pics: ['A', 'B', 'C'], time: 1 });
        needTools('#sm-tools .sm-tool', ['clips', 'text', 'captions', 'sound', 'overlay', 'effects'], 'the project row Clips, Text, Captions, Sound, Overlay, Effects');
        const bs = need('#sm-tools .sm-tool', 6, 'the six project tools on screen');
        return { name: 'row', crop: crop(BAR), meta: { widths: bs.map(b => Math.round(b.getBoundingClientRect().width)), cut: cutLabels('#sm-tools .sm-tool'),
          hint: ((document.querySelector('#sm-tray .sm-hint') || {}).textContent) || '' } };
      }] },

    /* NEEDS 3: where Look sits in a video clip's tray on a phone - as built (after Lift off), and third (drawn) */
    tray: { tags: ['380'], steps: [
      async function () {
        await setup({ build: vidsS9, time: 1 });
        await select('B');
        needTools('#sm-tray .sm-tool', ['length', 'audio', 'earlier', 'later', 'lift', 'look', 'duplicateClip', 'crop', 'replace', 'more', 'delete'], 'the eleven tools of a video clip');
        need('#sm-tray .sm-pins .sm-tool', 2, 'More and Delete pinned at the end');
        const run = document.querySelector('#sm-tray .sm-run');
        if (!run) fail('the tool strip', '#sm-tray .sm-run');
        run.scrollLeft = 0; fades(run); await frames(2);
        const s = stripInfo();
        return { name: 'tray', crop: crop(BAR), meta: { lookSeen: s.hidden.indexOf('look') < 0, hidden: s.hidden, scrolls: s.scrolls } };
      },
      async function () {
        const run = document.querySelector('#sm-tray .sm-run'), look = tool('look'), earlier = tool('earlier');
        if (!run || !look || !earlier) fail('the strip, Look and Move earlier', 'for the Look-third drawing');
        run.insertBefore(look, earlier);
        run.scrollLeft = 0; fades(run); await frames(2);
        const order = toolIds('#sm-tray .sm-tool');
        if (order.indexOf('look') !== 2) fail('Look third', 'the order is ' + order);
        const s = stripInfo();
        return { name: 'tray-look3', crop: crop(BAR), meta: { lookSeen: s.hidden.indexOf('look') < 0, hidden: s.hidden, drawn: true } };
      }] },

    /* NEEDS 2 (+5): a video clip's eleven tools on a PC - (a) as built, (c) one Move tool, (b) the design's wider band */
    trayopts: { tags: ['1280', '900'], steps: [
      async function () {
        await setup({ build: vidsS9, time: 1 });
        await select('B');
        needTools('#sm-tray .sm-tool', ['length', 'audio', 'earlier', 'later', 'lift', 'look', 'duplicateClip', 'crop', 'replace', 'more', 'delete'], 'the eleven tools of a video clip');
        need('#sm-tray .sm-pins .sm-tool', 2, 'More and Delete pinned at the end');
        if (document.querySelector('#sm-tray.sm-tray-2')) fail('option (a), one row', 'the tray is already on two rows');
        ST.panel0 = panelW();
        const s = stripInfo();
        return { name: 'tray-a', crop: crop(), meta: { rows: rowsOf('#sm-tray .sm-tool'), hidden: s.hidden, bar: playbar(), panelW: ST.panel0 } };
      },
      async function (tag) {
        if (tag !== '1280') return { skip: true };
        await reselect('B');
        needTools('#sm-tray .sm-tool', ['length', 'audio', 'earlier', 'later', 'lift', 'look', 'duplicateClip', 'crop', 'replace', 'more', 'delete'], 'the eleven tools again');
        const later = tool('later'), earlier = tool('earlier');
        later.remove();
        const lb = earlier.querySelector('.sm-tool-l');
        if (!lb) fail('the words of Move earlier', '.sm-tool-l');
        lb.textContent = 'Move';
        const ic = earlier.querySelector('svg');
        if (ic) ic.innerHTML = '<path d="M3.5 12h17M7.5 8l-4 4 4 4M16.5 8l4 4-4 4"/>';
        if (twoRows(5) !== 10) fail('ten tools', 'after merging Move');
        await settle(250);
        const rows = rowsOf('#sm-tray .sm-tool');
        if (rows.join() !== '5,5') fail('two rows of five', 'the merged tray lies on rows [' + rows + ']');
        return { name: 'tray-c', crop: crop(), meta: { rows: rows, outside: outsideBand('#sm-tray .sm-tool'), cut: cutLabels('#sm-tray .sm-tool'), drawn: true } };
      },
      async function () {
        await reselect('B');
        const st = document.createElement('style'); st.id = 'sm3sheet-wide';
        st.textContent = '@media (min-width: 701px) { body.ed-simple { --insp-w: clamp(372px, 26vw, 420px); } }';   /* DESIGN.md 8.3 (1) */
        document.head.appendChild(st);
        window.dispatchEvent(new Event('resize'));
        await settle(800);
        needTools('#sm-tray .sm-tool', ['length', 'audio', 'earlier', 'later', 'lift', 'look', 'duplicateClip', 'crop', 'replace', 'more', 'delete'], 'the eleven tools on the wider band');
        if (twoRows(6) !== 11) fail('eleven tools', 'on the wider band');
        await settle(250);
        const rows = rowsOf('#sm-tray .sm-tool');
        if (rows.join() !== '6,5') fail('two rows of six', 'the tray on the wider band lies on rows [' + rows + ']');
        const pw = panelW();
        return { name: 'tray-b', crop: crop(), meta: { rows: rows, outside: outsideBand('#sm-tray .sm-tool'), cut: cutLabels('#sm-tray .sm-tool'), bar: playbar(),
          panelW: pw, narrower: (ST.panel0 != null && pw != null) ? ST.panel0 - pw : null, drawn: true } };
      }] },

    /* NEEDS 1 and 4: the Look panel - Filters (a filter on, so Strength shows) and Adjust's six */
    look: { tags: ['380', '1280'], steps: [
      async function () {
        await setup({ build: picsABC, pics: ['A', 'B', 'C'], time: 3 });
        await select('B');
        press('look', 'Look in the tray'); await settle(450);
        need('#inspector .sm-look', 1, 'the Look panel');
        const tabs = need('#inspector .sm-look-tab', 2, 'the Filters and Adjust tabs').map(b => b.textContent).join('|');
        if (tabs !== 'Filters|Adjust') fail('the tabs Filters|Adjust', 'they read ' + tabs);
        const tiles = need('#inspector .sm-look-tile', 4, 'the filter tiles');
        if (tiles[0].dataset.fid !== '') fail('None first in the strip', 'the first tile is ' + tiles[0].dataset.fid);
        const pick = tiles.filter(t => t.dataset.fid)[0];
        const name = pick.getAttribute('aria-label') || pick.dataset.fid;
        pick.click(); await idle(); await settle(1000);
        need('#inspector .sm-look', 1, 'the Look panel after a pick');
        count('#inspector .sm-look-r[data-key="strength"]', 1, 'Strength under the strip');
        return { name: 'look-filters', crop: crop(), meta: { picked: name, tiles: document.querySelectorAll('#inspector .sm-look-tile').length } };
      },
      async function () {
        const adj = Array.from(document.querySelectorAll('#inspector .sm-look-tab')).filter(b => b.dataset.tab === 'adjust')[0];
        if (!adj) fail('the Adjust tab');
        adj.click(); await settle(350);
        await slide('#inspector .sm-look-r[data-key="bright"]', 20, 'Brightness');
        await slide('#inspector .sm-look-r[data-key="warmth"]', 40, 'Warmth');
        const keys = count('#inspector .sm-look-r', 6, 'the six Adjust sliders').map(r => r.dataset.key).join(',');
        if (keys !== 'bright,contrast,sat,exposure,warmth,vignette') fail('Brightness, Contrast, Saturation, Exposure, Warmth, Vignette', 'the sliders are ' + keys);
        count('#inspector .sm-look-reset', 1, 'Reset');
        const ins = document.getElementById('inspector'), ir = ins.getBoundingClientRect();
        const rows = Array.from(document.querySelectorAll('#inspector .sm-look-row, #inspector .sm-look-reset'));
        ST.allSeen = rows.every(r => { const q = r.getBoundingClientRect(); return q.top >= ir.top - 0.5 && q.bottom <= ir.bottom + 0.5 && q.bottom <= innerHeight + 0.5; });
        return { name: 'look-adjust', crop: crop(), meta: { allSeen: ST.allSeen, labels: Array.from(document.querySelectorAll('#inspector .sm-look-l')).map(x => x.textContent) } };
      },
      async function () {
        if (ST.allSeen) return { skip: true };
        const ins = document.getElementById('inspector');
        ins.scrollTop = ins.scrollHeight; await settle(250);
        need('#inspector .sm-look-reset', 1, 'Reset, scrolled to');
        return { name: 'look-adjust-end', crop: crop(), meta: {} };
      }] },

    /* NEEDS 6, 7, 8: the Captions list, the caption track's tray (as built, and short words drawn), Edit lines */
    captions: { tags: ['380', '1280'], steps: [
      async function () {
        await setup({ build: (W, H) => [smCap('Caps', 0, 6, [[0.5, 1.6, 'Hello from the beach'], [2.2, 3.2, 'The water is warm'], [4, 5, ' ']], W, H)].concat(picsABC(W, H)), pics: ['A', 'B', 'C'], time: 0.9 });
        press('captions', 'Captions in the project row'); await sleep(250); await frames(2);
        const items = need('.sm-menu .sm-menu-i', 3, 'the Captions list').map(b => b.textContent).join('|');
        if (items !== 'Type captions|Find speech|Style') fail('Type captions, Find speech, Style', 'the list reads ' + items);
        return { name: 'cap-menu', crop: crop({ extra: [document.querySelector('.sm-menu')] }), meta: { items: items } };
      },
      async function () {
        FM.simpleTools._reset(); await settle(150);
        await select('Caps');
        needTools('#sm-tray .sm-tool', ['editlines', 'capstyle', 'findspeech', 'capfollow', 'capstay', 'delete'], 'the tray of a caption track');
        const run = document.querySelector('#sm-tray .sm-run');
        if (run) { run.scrollLeft = 0; fades(run); await frames(2); }
        const s = stripInfo();
        return { name: 'cap-tray', crop: crop(BAR), meta: { scrolls: s.scrolls, hidden: s.hidden, rows: rowsOf('#sm-tray .sm-tool') } };
      },
      async function () {
        press('editlines', 'Edit lines'); await settle(500);
        need('#inspector .sm-cap', 1, 'the Edit lines panel');
        count('#inspector .sm-cap-row', 3, 'the three caption lines');
        count('#inspector .sm-cap-add', 1, 'Add a line here');
        count('#inspector .sm-cap-empty', 1, 'the empty line');
        return { name: 'cap-lines', crop: crop(), meta: { empty: (document.querySelector('#inspector .sm-cap-empty') || {}).textContent || '' } };
      },
      async function (tag) {
        if (tag !== '380') return { skip: true };
        FM.simpleTools.closePanel(); await settle(250);
        await reselect('Caps');
        const f = tool('capfollow'), s = tool('capstay');
        if (!f || !s) fail('Follows the clips and Stays with the sound', 'for the short-words drawing');
        f.querySelector('.sm-tool-l').textContent = 'Follows';
        s.querySelector('.sm-tool-l').textContent = 'Stays';
        const run = document.querySelector('#sm-tray .sm-run');
        if (run) { run.scrollLeft = 0; fades(run); }
        await frames(3);
        const si = stripInfo();
        return { name: 'cap-tray-short', crop: crop(BAR), meta: { scrolls: si.scrolls, hidden: si.hidden, drawn: true } };
      }] },

    /* NEEDS 9, 10: the effects picker, the segment's tray, its Strength row */
    effects: { tags: ['380', '1280'], steps: [
      async function () {
        await setup({ build: (W, H) => [smPic('A', 0, 2, W, H), smPic('B', 2, 2, W, H), smPic('C', 4, 2, W, H)], pics: ['A', 'B', 'C'], time: 2.5 });
        press('effects', 'Effects in the project row'); await settle(1300);
        if (!tool('fxBack')) fail('Done in the picker', '#sm-tray .sm-tool[data-tool="fxBack"]');
        need('#sm-tray .sm-fx-tile', 2, 'effect tiles on screen');
        const all = document.querySelectorAll('#sm-tray .sm-fx-tile');
        if (all.length < 10) fail('the effect tiles', 'only ' + all.length + ' in the picker');
        if (!document.querySelector('#sm-tray .sm-fx-tile[data-tool="fx:invert"]')) fail('the Invert tile');
        return { name: 'fx-picker', crop: crop(BAR), meta: { tiles: all.length, cut: cutLabels('#sm-tray .sm-fx-tile').length } };
      },
      async function () {
        const t = document.querySelector('#sm-tray .sm-fx-tile[data-tool="fx:invert"]');
        if (!t) fail('the Invert tile');
        t.click(); await idle(); await settle(600);
        needTools('#sm-tray .sm-tool', ['change', 'strength', 'stay', 'more', 'delete'], 'the tray of the new effect');
        return { name: 'fx-seg-tray', crop: crop(BAR), meta: {} };
      },
      async function () {
        press('strength', 'Strength'); await settle(350);
        await slide('#sm-tray .sm-str-r', 60, 'the Strength slider');
        const r = document.querySelector('#sm-tray .sm-str-r');
        if (!r || !shown(r)) fail('the Strength slider after a change', '#sm-tray .sm-str-r');
        return { name: 'fx-strength', crop: crop(BAR), meta: { value: r.value } };
      }] },

    /* NEEDS 13 (#1171): More's place before and after its panel opens on a phone */
    more: { tags: ['380'], steps: [
      async function () {
        await setup({ build: (W, H) => [smV('C', 6, 3, W, H), smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)], time: 1.5 });
        await select('A');
        const m = tool('more');
        if (!m || !shown(m)) fail('More in the tray');
        ST.r0 = box(m);
        mark([{ r: ST.r0, label: 'More' }]); await frames(2);
        return { name: 'more-before', crop: null, meta: { more: ST.r0 } };
      },
      async function () {
        unmark();
        press('more', 'More'); await settle(650); await settle(300);
        const insp = document.getElementById('inspector-panel');
        if (!insp || !insp.classList.contains('open')) fail('the panel More opens', '#inspector-panel is not .open after More');
        const m = tool('more');
        if (!m || !shown(m)) fail('More after its panel opened');
        const r1 = box(m), under = underOf(ST.r0);
        mark([{ r: ST.r0, label: 'More was here', dashed: true }, { r: r1, label: 'More now', above: true }]); await frames(2);
        return { name: 'more-after', crop: null, meta: { jump: Math.round(ST.r0.y - r1.y), under: under, more: r1 } };
      }] },

    /* NEEDS 12: the switch morph, held at 0, a third, two thirds and the end of its 320 ms, both ways (the suite's sm3Proj) */
    morph: { tags: ['380', '1280'], steps: [
      async function () {
        await setup({ build: (W, H) => [smT('Title', 0.5, 2, W, H), smSong('Song', 0, 3, W, H, { sm: { stay: true } }), smV('C', 2, 1, W, H), smV('B', 1, 1, W, H), smV('A', 0, 1, W, H)], full: true, time: 1.5 });
        FM.selectLayer(null); FM.refreshAll(); await settle(400);
        await morphTo('simple');
        return seek(0, 'morph-simple-0');
      },
      () => seek(1 / 3, 'morph-simple-33'),
      () => seek(2 / 3, 'morph-simple-66'),
      () => seek(1, 'morph-simple-100'),
      async function () {
        FM.editorMorph.stop(); ST.anims = null; await settle(600);
        if (document.getElementById('ed-morph')) fail('the first morph landed', '#ed-morph is still in the page');
        await morphTo('full');
        return seek(0, 'morph-full-0');
      },
      () => seek(1 / 3, 'morph-full-33'),
      () => seek(2 / 3, 'morph-full-66'),
      () => seek(1, 'morph-full-100')
    ] }
  };

  window.SM3SHEET = {
    version: 1,
    list(tag) { return Object.keys(SCENES).filter(k => SCENES[k].tags.indexOf(String(tag)) >= 0); },
    count(scene) { const s = SCENES[scene]; return s ? s.steps.length : -1; },
    async step(scene, i, tag) {
      const s = SCENES[scene];
      if (!s || !s.steps[i]) return { ok: false, error: 'no step ' + i + ' in scene ' + scene };
      let timer = 0;
      try {
        const res = await Promise.race([Promise.resolve().then(() => s.steps[i](String(tag))),
          new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('TIMEOUT: the step took over ' + STEP_MS / 1000 + ' s')), STEP_MS); })]);
        clearTimeout(timer);
        if (!res || (!res.skip && !res.name)) return { ok: false, error: 'the step returned no picture name' };
        return Object.assign({ ok: true }, res);
      } catch (e) {
        clearTimeout(timer);
        return { ok: false, error: String((e && e.message) || e) };
      }
    }
  };
})();
