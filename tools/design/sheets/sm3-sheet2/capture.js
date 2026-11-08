/* tools/design/sheets/sm3-sheet2/capture.js - the app-side half of capture.py: the pictures for Ezra's SECOND Simple Phase 3 sheet
   (#545: nothing visual new to him ships unseen). It covers what was built after the first sheet: Clips > Extras and the band question
   R6 that sm3-land left open (tools/design/plans/sm3-extras, sm3-land), effects on a title or an overlay (sm3-next), template Replace
   on Insert your Media (sm3-replace), and the one-picture element tie (sm3-fix #5).

   The same contract as the first sheet's capture.js (tools/design/sheets/sm3-sheet/capture.js, copied and adapted, never edited):
   evaluated by capture.py in a page of the app itself (index.html on the worktree's own server), once per page load. It defines
   window.SM3SHEET2: list(tag) -> the scenes for a viewport ('380' phone, '1280' PC, '900' small PC), count(scene), and
   step(scene, i, tag) -> { ok, name, crop, meta } | { ok, skip } | { ok: false, error }. Each step leaves the page in the state of ONE
   picture; capture.py takes it the moment the step returns. Every scene starts on a fresh page load, so no step inherits another
   scene's state.

   A WRONG SELECTOR FAILS LOUDLY, BY NAME: every step counts the boxes it expects (need / count / needTools) before it returns, and
   throws "MISSING <what> - <selector> matched n, want m" instead of letting an empty frame be shot as if it were the picture.

   The setups are the suite's own (tests/tests.js): simple P3 . Extras (smXLib's stubbed library, smXOpen's Clips > Extras, the lower
   third of its third test), simple P3 . Tray effects (smIfxScene, the two segments of its sixth test), simple P3 . Replace (the locked
   Clip 3, the masking frame, the 4 s clip its decode stub hands back), simple P3 . Fix (the Sting element of #5). Cosmetic changes, all
   said here: the project is 640x360 (the suite's is 320x240, so the Sting picture is 128x96 where the suite's is 64x48); picture clips
   get a drawn beach picture and video clips a record that shows one (the suite's are flat or blank); the library's tiles get drawn
   thumbnails; the second element is called Logo (the suite's carries a markup test name). The library is stubbed IN THE PAGE
   (FM.elements / FM.templates list and getPack) of a throwaway Chrome profile, so nothing here reaches his IndexedDB, and the one file
   picker (Replace Media) is stood in for by FM.pickReplacement handing back the 4 s record - what the suite's decode stub hands it.

   DRAWN, not built (the sheet says so under each): R6 (b) the band grown while Extras is open - --tl-h, the property the Studio
   divider's own drag writes, raised by the height of the band's two tool rows; R6 (c) Extras as a sheet over the timeline - the real
   #inspector with the real Extras menu in it, laid over #timeline-panel by an injected style, the band keeping its Done and tools; and
   question 4's option B, the tray's Add effect with its words changed to Effects. One picture is FULL, for comparison: Full's own Add
   menu in the same band at 1280x800, the room option (b) is measured against. */
(function () {
  'use strict';
  if (window.SM3SHEET2) return;
  const STEP_MS = 45000;
  const PW = 640, PH = 360;
  const ST = {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  async function frames(n) { for (let i = 0; i < (n || 2); i++) await frame(); }
  function finishAnims() { document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }); }
  async function settle(ms) { await sleep(ms == null ? 300 : ms); finishAnims(); await frames(2); }
  async function idle() { for (let i = 0; i < 400 && window.FM && FM.spine && FM.spine.running; i++) await sleep(10); await sleep(40); }
  /* a pick reads its pack first (FM.spine.reading), then runs ONE step (FM.spine.running): the suite's smXIdle */
  async function busy() { for (let i = 0; i < 600 && window.FM && FM.spine && (FM.spine.reading || FM.spine.running); i++) await sleep(10); await sleep(120); }
  const PHONE = () => window.matchMedia('(max-width: 700px)').matches;

  /* ---------- finding things, loudly ---------- */
  function fail(what, detail) { throw new Error('MISSING ' + what + (detail ? ' - ' + detail : '')); }
  function box(el) { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }
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
  async function stripToStart() { const run = document.querySelector('#sm-tray .sm-run'); if (run) { run.scrollLeft = 0; fades(run); } await frames(2); }
  function rectUnion(els, pad) {
    const p = pad == null ? 2 : pad;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    els.forEach(e => { if (!e || !e.isConnected) return; const r = e.getBoundingClientRect(); if (r.width < 1) return; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
    if (!isFinite(x0)) return null;
    x0 = Math.max(0, Math.floor(x0 - p)); y0 = Math.max(0, Math.floor(y0 - p));
    x1 = Math.min(innerWidth, Math.ceil(x1 + p)); y1 = Math.min(innerHeight, Math.ceil(y1 + p));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  /* the crop: on a PC the band (#inspector-panel), widened to take in any extra element (a list above it); on a phone the two rows
     under the timeline (#sm-bar) and the extras when `bar` is asked for, else null (the whole screen) */
  function crop(o) {
    o = o || {};
    if (PHONE()) {
      if (!o.bar) return null;
      const b = document.getElementById('sm-bar');
      if (!b || !shown(b)) fail('the phone tool rows', '#sm-bar is not on screen');
      return rectUnion([b].concat(o.extra || []));
    }
    const p = document.getElementById('inspector-panel');
    if (!p || !shown(p)) fail('the PC band', '#inspector-panel is not on screen');
    return rectUnion([p].concat(o.extra || []));
  }
  /* the tools that run past the band's sides */
  function outsideBand(sel) {
    const p = document.getElementById('inspector-panel');
    if (!p || PHONE()) return [];
    const br = p.getBoundingClientRect();
    return Array.from(document.querySelectorAll(sel)).filter(b => { const r = b.getBoundingClientRect(); return r.left < br.left - 0.5 || r.right > br.right + 0.5; }).map(b => b.dataset.tool);
  }
  /* what a press at the centre of `el` lands on: { ok: it lands on el, by: what it lands on } */
  function hitTest(el) {
    if (!el || !el.isConnected) return { ok: false, by: 'it is not in the page' };
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return { ok: false, by: 'it has no size' };
    const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { ok: !!h && el.contains(h), by: h ? (h.id ? '#' + h.id : String(h.getAttribute('class') || h.tagName)) : 'nothing' };
  }
  function sayText() { const s = document.getElementById('sm-say'), ln = s && s.querySelector('.sm-line'); return ((ln || s || {}).textContent) || ''; }
  const picBox = () => { const p = document.getElementById('preview'); if (!p) return null; const r = p.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };

  /* ---------- the suite's layers (tests/tests.js smV, smPic, smT, smSong), copied as they are ---------- */
  function smV(name, start, dur, W, H, o) {
    const l = FM.makeLayer('video', { name: name, x: W / 2, y: H / 2, start: start, duration: dur });
    l.srcW = W; l.srcH = H; l.srcRev = 0; l.muted = true;
    return Object.assign(l, o || {});
  }
  function smPic(name, start, dur, W, H, o) { return smV(name, start, dur, W, H, Object.assign({ type: 'image' }, o || {})); }
  function smT(name, start, dur, W, H, o) { const l = FM.makeLayer('text', { name: name, text: name, x: W / 2, y: H * 0.2, start: start, duration: dur }); return Object.assign(l, o || {}); }
  function smSong(name, start, dur, W, H, o) { const l = FM.makeLayer('video', { name: name, x: W / 2, y: H / 2, start: start, duration: dur }); l.audioOnly = true; return Object.assign(l, o || {}); }

  /* a drawn beach (sky, sun, sea, sand), one light per clip (the first sheet's beach, drawn into any context) */
  function paintBeach(g, W, H, i) {
    const hue = [24, 200, 315, 140][i % 4];
    const sky = g.createLinearGradient(0, 0, 0, H * 0.62);
    sky.addColorStop(0, 'hsl(' + hue + ', 62%, 48%)'); sky.addColorStop(1, 'hsl(' + (hue + 28) + ', 85%, 78%)');
    g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.62);
    g.fillStyle = 'rgba(255, 238, 170, 0.95)'; g.beginPath(); g.arc(W * (0.3 + 0.2 * (i % 3)), H * 0.36, H * 0.1, 0, Math.PI * 2); g.fill();
    const sea = g.createLinearGradient(0, H * 0.6, 0, H * 0.8);
    sea.addColorStop(0, '#1d5f96'); sea.addColorStop(1, '#2ea2c2');
    g.fillStyle = sea; g.fillRect(0, H * 0.6, W, H * 0.2);
    g.strokeStyle = 'rgba(255, 255, 255, 0.6)'; g.lineWidth = Math.max(1, H / 140);
    for (let k = 0; k < 4; k++) { const y = H * (0.64 + k * 0.035); g.beginPath(); g.moveTo(W * (0.08 + 0.1 * k), y); g.lineTo(W * (0.42 + 0.12 * k), y); g.stroke(); }
    g.fillStyle = '#e6cc94'; g.fillRect(0, H * 0.8, W, H * 0.2);
    g.fillStyle = '#c9a86a'; g.beginPath(); g.ellipse(W * 0.72, H * 0.9, W * 0.12, H * 0.025, 0, 0, Math.PI * 2); g.fill();
  }
  function beachCanvas(W, H, i) { const c = document.createElement('canvas'); c.width = W; c.height = H; paintBeach(c.getContext('2d'), W, H, i); return c; }
  /* a picture clip's media record (the Look tests' smLookPic shape) */
  const beach = (W, H, i) => ({ kind: 'image', el: beachCanvas(W, H, i), width: W, height: H });
  /* a video clip's media record: the suite's smRec shape (tests.js), its frame a beach */
  function vrec(W, H, i, dur, name) {
    const file = new File([new Uint8Array(64)], name || 'src.mp4', { type: 'video/mp4' }); file._dur = dur;
    return { kind: 'video', el: beachCanvas(W, H, i), file: file, width: W, height: H, duration: dur, hasAudio: true, waveform: null };
  }
  function thumb(draw) { const c = document.createElement('canvas'); c.width = 192; c.height = 108; draw(c.getContext('2d'), 192, 108); return c.toDataURL('image/jpeg', 0.86); }
  const L = n => FM.scene.layers.find(l => l.name === n) || null;

  /* ---------- the library (tests.js smXLib, in the page): his saved elements and templates ---------- */
  function lowerThird(W, H) {
    const bar = FM.makeLayer('shape', { name: 'Bar', shape: 'rect', x: W * 0.32, y: H * 0.8, shapeW: 340, shapeH: 52, fill: '#1d2433', start: 0, duration: 2 });
    const words = FM.makeLayer('text', { name: 'Jo Bloggs', text: 'Jo Bloggs', x: W * 0.32, y: H * 0.8, start: 0.3, duration: 2.7 });
    return [words, bar];
  }
  function stubLib(lib) {
    const E = FM.elements, T = FM.templates;
    if (!E || !T || !E.list || !T.list) fail('the element and template library', 'FM.elements / FM.templates are not there');
    const copy = p => p ? { layers: JSON.parse(JSON.stringify(p.layers, FM.jsonReplacer)), media: p.media || {}, project: p.project ? JSON.parse(JSON.stringify(p.project)) : undefined } : null;
    const meta = x => ({ id: x.id, name: x.name, count: x.pack.layers.length, thumb: x.thumb || null });
    E.list = () => (lib.elements || []).map(meta);
    E.getPack = async id => copy(((lib.elements || []).filter(x => x.id === id)[0] || {}).pack);
    T.list = () => (lib.templates || []).map(meta);
    T.getPack = async id => copy(((lib.templates || []).filter(x => x.id === id)[0] || {}).pack);
    ST.lib = lib;
  }
  function sheetLib(W, H) {
    const ltThumb = thumb((g, w, h) => {
      paintBeach(g, w, h, 1);
      g.fillStyle = '#1d2433'; g.fillRect(w * 0.08, h * 0.7, w * 0.56, h * 0.16);
      g.fillStyle = '#ffffff'; g.font = '700 ' + Math.round(h * 0.11) + 'px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('Jo Bloggs', w * 0.12, h * 0.78);
    });
    const logoThumb = thumb((g, w, h) => {
      g.fillStyle = '#10151f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f2a33a'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.32, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#10151f'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.16, 0, Math.PI * 2); g.fill();
    });
    const promoThumb = thumb((g, w, h) => {
      paintBeach(g, w, h, 2);
      g.fillStyle = 'rgba(0, 0, 0, 0.35)'; g.fillRect(0, h * 0.3, w, h * 0.3);
      g.fillStyle = '#ffffff'; g.font = '800 ' + Math.round(h * 0.2) + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PROMO', w / 2, h * 0.45);
    });
    const logo = FM.makeLayer('shape', { name: 'Logo', shape: 'circle', x: W * 0.85, y: H * 0.18, shapeW: 70, shapeH: 70, fill: '#f2a33a', start: 0, duration: 3 });
    const promo = [smT('Promo title', 0.2, 1.5, W, H), smPic('P2', 2, 2, W, H), smPic('P1', 0, 2, W, H)];
    return {
      elements: [{ id: 'eLT', name: 'Lower third', thumb: ltThumb, pack: { layers: lowerThird(W, H), media: {} } },
                 { id: 'eLogo', name: 'Logo', thumb: logoThumb, pack: { layers: [logo], media: {} } }],
      templates: [{ id: 'tPromo', name: 'Promo', thumb: promoThumb, pack: { layers: promo, media: {}, project: { name: 'Promo', width: W, height: H, fps: 30, duration: 4 } } }]
    };
  }

  /* A throwaway project in this page's own throwaway profile, the way the suite's smP2 makes one (Home closed, the scene applied,
     history reset, the media records set), then Simple on and everything drawn */
  async function setup(o) {
    for (let i = 0; i < 200 && !(window.FM && FM.projects && FM.storage && FM.editor && FM.spine && FM.spine.cmd && FM.simpleTools && FM.makeLayer && FM.media); i++) await sleep(50);
    if (!(window.FM && FM.spine && FM.spine.cmd && FM.simpleTools && FM.simpleTools.openExtras && FM.simpleTools.openItemEffects && FM.spine.cmd.addElement && FM.spine.cmd.fillReplace && FM.templateFill))
      fail('the Phase 3 app with Extras, tray effects and template Replace', 'FM.simpleTools.openExtras / openItemEffects, FM.spine.cmd.addElement / fillReplace or FM.templateFill is not there - is the server serving the sm3-fix chain?');
    /* the boot restores the last project and THEN opens Home (every load is a first load here: capture.py's seed), so Home on
       screen means the restore is over and cannot land on top of the project made below */
    for (let i = 0; i < 300 && !(FM.home && FM.home.isOpen && FM.home.isOpen()); i++) await sleep(50);
    if (!(FM.home && FM.home.isOpen && FM.home.isOpen())) fail('Home after the app started', 'it never opened in 15 s, so the boot may still be restoring a project');
    await sleep(300);
    FM.home.close(); await sleep(400);
    /* the drawn clips have no footage FILE, so applyScene's load toast sat over the timeline in every phone picture (first sheet,
       16 Oct). It is this fixture's, not something he sees with real clips. */
    if (!document.getElementById('sheet-no-toast')) { const st = document.createElement('style'); st.id = 'sheet-no-toast'; st.textContent = '#toast{display:none!important}'; document.head.appendChild(st); }
    const W = PW, H = PH;
    await FM.projects.create({ name: 'Beach day', width: W, height: H });
    await FM.storage.applyScene({ project: { name: 'Beach day', width: W, height: H, fps: 30, duration: 0, background: '#000000' }, layers: o.build(W, H), selectedId: null, selectedIds: [] });
    FM.history.reset(); FM.selectLayer(null); FM.time = o.time || 0;
    (o.pics || []).forEach((n, i) => { const l = L(n); if (!l) fail('the clip named ' + n); FM.media.set(l.id, beach(W, H, i)); });
    (o.media || []).forEach(m => { const l = L(m[0]); if (!l) fail('the clip named ' + m[0]); FM.media.set(l.id, vrec(W, H, m[1], m[2], m[3])); });
    if (o.lib) stubLib(sheetLib(W, H));
    if (o.full) FM.editor.apply('full', { force: true, quiet: true }); else FM.editor.set('simple');
    FM.refreshAll(); await settle(800);
    if (o.full) { if (FM.editor.mode() !== 'full') fail('Full on screen', 'the editor is ' + FM.editor.mode()); return; }
    if (!FM.editor.isSimple()) fail('Simple on screen', 'FM.editor.set("simple") left ' + FM.editor.mode());
    need('#sm-tools .sm-tool', 6, 'the project row');
  }
  async function select(name) {
    const l = L(name);
    if (!l) fail('the clip named ' + name);
    FM.selectLayer(l.id); await settle(400);
    return l;
  }
  async function reselect(name) { FM.simpleTools._reset(); FM.selectLayer(null); await settle(200); return select(name); }

  /* ---------- Clips > Extras (tests.js smXOpen / smXTab) ---------- */
  const xMenu = () => document.querySelector('#add-sheet.open #add-grid > .addmenu[data-sm="extras"]') || document.querySelector('#inspector .addmenu[data-sm="extras"]');
  const xTabs = am => Array.from(am.querySelectorAll('.addmenu-tab')).map(t => t.dataset.key);
  const xTabWords = am => Array.from(am.querySelectorAll('.addmenu-tab')).map(t => t.title || ((t.querySelector('.addmenu-lbl') || {}).textContent) || t.dataset.key);
  const xCards = am => Array.from(am.querySelectorAll('.addmenu-body .addmenu-card'));
  async function openExtras() {
    press('clips', 'Clips in the project row'); await sleep(200); await frames(2);
    const items = need('.sm-menu .sm-menu-i', 2, 'the Clips list');
    const ex = items.filter(b => b.textContent === 'Extras')[0];
    if (!ex) fail('Extras in the Clips list', 'the list reads ' + items.map(b => b.textContent).join('|'));
    ex.click(); await settle(800);
    const am = xMenu();
    if (!am) fail('the Extras menu', PHONE() ? '"#add-sheet.open #add-grid > .addmenu[data-sm=extras]" matched nothing' : '"#inspector .addmenu[data-sm=extras]" matched nothing');
    if (xTabs(am).join() !== 'object,shape,template') fail('Elements, Shape and Template in Extras', 'its tabs are ' + xTabs(am).join());
    return am;
  }
  async function xTab(key) {
    const am = xMenu(), t = am && am.querySelector('.addmenu-tab[data-key="' + key + '"]');
    if (!t) fail('the ' + key + ' tab in Extras', am ? 'its tabs are ' + xTabs(am).join() : 'no Extras menu is open');
    t.click(); await settle(500);
    const m = xMenu();
    if (!m) fail('Extras after its ' + key + ' tab was pressed', 'the menu went');
    const act = m.querySelector('.addmenu-tab.active');
    if (!act || act.dataset.key !== key) fail('the ' + key + ' tab open', 'the open tab is ' + (act && act.dataset.key));
    return m;
  }
  /* how much of the open tab is on show inside `bx`: cards wholly inside it AND inside the pager's own box (the other pages lie
     beside it), pressable at their centre; the cards a page holds; every card of the tab; how many pages */
  function tilesInfo(am, bx) {
    const cards = xCards(am), pager = am.querySelector('.addmenu-pager'), pr = pager ? pager.getBoundingClientRect() : null;
    const first = am.querySelector('.addmenu-body .addmenu-page');
    const perPage = first ? first.querySelectorAll('.addmenu-card').length : cards.length;
    const on = cards.filter(c => {
      const r = c.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      if (r.left < bx.left - 0.5 || r.right > bx.right + 0.5 || r.top < bx.top - 0.5 || r.bottom > bx.bottom + 0.5) return false;
      if (pr && (r.left < pr.left - 0.5 || r.right > pr.right + 0.5 || r.top < pr.top - 0.5 || r.bottom > pr.bottom + 0.5)) return false;
      return hitTest(c).ok;
    }).length;
    return { on: on, perPage: perPage, total: cards.length, pages: Math.max(1, am.querySelectorAll('.addmenu-body .addmenu-page').length),
      fit: am.dataset.amFit || '', icoTabs: am.classList.contains('addmenu--tabs-ico') };
  }
  /* the room Extras has in the band: #inspector between the title row and the tool rows (#sm-bar) */
  function bandBox() {
    const p = document.getElementById('inspector-panel'), ins = document.getElementById('inspector'), bar = document.getElementById('sm-bar');
    if (!p || !ins || !bar) fail('the PC band, its panel and its tool rows', '#inspector-panel / #inspector / #sm-bar');
    const pr = p.getBoundingClientRect(), ir = ins.getBoundingClientRect(), br = bar.getBoundingClientRect();
    return { left: pr.left, right: pr.right, top: ir.top, bottom: Math.min(ir.bottom, br.top) };
  }
  function r6Measure(am, bx) {
    const band = document.getElementById('inspector-panel'), tl = document.getElementById('timeline-panel');
    return { band: Math.round(band.getBoundingClientRect().height), room: Math.round(bx.bottom - bx.top), tiles: tilesInfo(am, bx), done: hitTest(tool('extrasBack')),
      pic: picBox(), tl: tl ? Math.round(tl.getBoundingClientRect().height) : null, title: ((document.querySelector('#inspector-panel .panel-title-label') || {}).textContent) || '' };
  }
  const r6Scene = (W, H) => [smT('Beach day', 0.5, 3, W, H), smPic('B', 3, 3, W, H), smPic('A', 0, 3, W, H)];
  async function r6Open() {
    await setup({ build: r6Scene, pics: ['A', 'B'], time: 1, lib: true });
    await openExtras();
    if (!tool('extrasBack')) fail('Done in the tray row while Extras is open', '#sm-tray .sm-tool[data-tool="extrasBack"]');
    const am = await xTab('shape');
    if (xCards(am).length < 6) fail('the Shape tab tiles', 'only ' + xCards(am).length + ' in Extras');
    return am;
  }

  /* ---------- Insert your Media over Simple (tests.js smRpSwap, its picker stood in for) ---------- */
  async function fillLine(name, words, button) {
    const l = L(name);
    if (!l) fail('the clip named ' + name);
    const id = l.id;
    if (!FM.templateFill.open()) fail('Insert your Media over the project', 'FM.templateFill.open() gave false');
    await settle(600);
    const sheet = document.getElementById('tpl-fill');
    if (!sheet || sheet.classList.contains('hidden')) fail('Insert your Media on screen', '#tpl-fill is hidden');
    const slot = sheet.querySelector('.tfill-slot[data-id="' + CSS.escape(String(id)) + '"]');
    if (!slot) fail('the slot for clip ' + name, '"#tpl-fill .tfill-slot[data-id]" holds ' + Array.from(sheet.querySelectorAll('.tfill-slot')).length + ' slots, none for it');
    slot.click(); await settle(300);
    const btn = sheet.querySelector('.tfill-replace');
    if (!btn || btn.disabled || !btn.isConnected) fail('Replace Media, on and enabled for that slot', '#tpl-fill .tfill-replace');
    if (!FM.editor.isSimple()) fail('Simple under the sheet', 'the editor is ' + FM.editor.mode());
    const keep = FM.pickReplacement;
    FM.pickReplacement = async () => vrec(PW, PH, 3, 4, 'short-b.mp4');   // the 4 s clip the suite's decode stub hands back
    let t = null;
    try {
      btn.click();
      for (let i = 0; i < 250 && !(t = sheet.querySelector('.sm-fill-say .sm-fill-say-t')); i++) await sleep(20);
      if (!t) fail('Simple’s line on the sheet', '"#tpl-fill .sm-fill-say .sm-fill-say-t" never appeared (the line under the sheet says “' + sayText() + '”)');
      await sleep(520); await frames(2);   // its button is armed 400 ms after the line appears
    } finally { FM.pickReplacement = keep; }
    const line = t.textContent;
    if (line.indexOf(words) < 0) fail('the line “' + words + '”', 'the sheet says “' + line + '”');
    const bs = Array.from(sheet.querySelectorAll('.sm-fill-say .sm-fill-say-b')).map(b => b.textContent);
    if (bs.join() !== button) fail('the one button ' + button, 'the line offers ' + JSON.stringify(bs));
    const b0 = sheet.querySelector('.sm-fill-say .sm-fill-say-b'), rec = FM.media.get(id);
    if (!rec || !rec.file || rec.file.name === 'short-b.mp4') fail('nothing written by the refusal', 'the slot now plays ' + (rec && rec.file && rec.file.name));
    const ln = sheet.querySelector('.sm-fill-say'), rail = sheet.querySelector('.tfill-slots'), rr = rail.getBoundingClientRect(), lr = ln.getBoundingClientRect(), br = btn.getBoundingClientRect();
    return { meta: { line: line, buttons: bs, armed: b0.getAttribute('aria-disabled') === 'false', pressable: hitTest(b0).ok, between: lr.top >= rr.bottom - 0.5 && lr.bottom <= br.top + 0.5 },
      crop: rectUnion([sheet.querySelector('.tfill-lead'), rail, ln, btn], 14) };
  }

  /* ---------- the scenes: each a list of steps, one picture per step ---------- */
  const BAR = { bar: true };
  const SCENES = {
    /* R6 (sm3-land): Clips > Extras on a PC, as built - at 1280x800 and in a small 900x700 window */
    r6: { tags: ['1280', '900'], steps: [
      async function () {
        const am = await r6Open();
        const m = r6Measure(am, bandBox());
        if (m.title !== 'Extras') fail('the band titled Extras', 'its title row says ' + JSON.stringify(m.title));
        return { name: 'r6-a', crop: crop(), meta: m };
      }] },

    /* R6, for comparison: FULL's own Add menu in the same band at 1280x800 (nothing selected), on its Shape tab - the room option (b)
       is measured against */
    r6full: { tags: ['1280'], steps: [
      async function () {
        await setup({ build: r6Scene, pics: ['A', 'B'], time: 1, full: true });
        FM.selectLayer(null); FM.refreshAll(); await settle(500);
        const am = document.querySelector('#inspector .addmenu');
        if (!am || !shown(am)) fail('Full’s Add menu in the band', '"#inspector .addmenu" is ' + (am ? 'off the screen' : 'not there'));
        if (am.dataset.sm) fail('Full’s own Add menu', 'the band shows Simple’s Extras');
        const t = am.querySelector('.addmenu-tab[data-key="shape"]');
        if (!t) fail('Full’s Shape tab', 'its tabs are ' + xTabs(am).join());
        t.click(); await settle(500);
        const m = document.querySelector('#inspector .addmenu');
        if (!m) fail('Full’s Add menu after its Shape tab was pressed', 'it went');
        const ins = document.getElementById('inspector'), r = ins.getBoundingClientRect(), p = document.getElementById('inspector-panel').getBoundingClientRect();
        const bx = { left: p.left, right: p.right, top: r.top, bottom: Math.min(r.bottom, p.bottom) };
        return { name: 'r6-full', crop: crop(), meta: { band: Math.round(p.height), room: Math.round(bx.bottom - bx.top), tiles: tilesInfo(m, bx) } };
      }] },

    /* R6 (b), DRAWN: the band grows while Extras is open - the divider's own --tl-h, raised by the height of the band's two tool rows,
       so the panel gets what Full's band gives its Add menu in the same window; the app's own ceiling (FM.clampTimelineH) applies */
    r6b: { tags: ['1280'], steps: [
      async function () {
        await r6Open();
        const before = r6Measure(xMenu(), bandBox());
        const band = document.getElementById('inspector-panel'), bar = document.getElementById('sm-bar');
        const grow = Math.round(bar.getBoundingClientRect().height);
        let want = Math.round(band.getBoundingClientRect().height) + grow;
        if (FM.clampTimelineH) want = FM.clampTimelineH(want);
        document.documentElement.style.setProperty('--tl-h', want + 'px');
        if (FM.refreshPreviewScale) FM.refreshPreviewScale();
        if (FM.canvasEdit && FM.canvasEdit.stageResized) FM.canvasEdit.stageResized();
        await settle(1100);
        const am = xMenu();
        if (!am) fail('Extras after the band grew', 'it closed');
        const m = r6Measure(am, bandBox());
        if (Math.abs(m.band - want) > 2) fail('the band grown to ' + want + ' px', 'it is ' + m.band + ' px');
        if (!(m.pic && before.pic && m.pic.h < before.pic.h)) fail('the picture shrunk while the band is taller', 'the preview went from ' + JSON.stringify(before.pic) + ' to ' + JSON.stringify(m.pic));
        m.before = { band: before.band, room: before.room, pic: before.pic, tl: before.tl, tiles: before.tiles };
        m.grow = grow; m.drawn = true;
        return { name: 'r6-b', crop: crop(), meta: m };
      }] },

    /* R6 (c), DRAWN: Extras as a sheet over the timeline, as on the phone - the real #inspector (the real Extras menu in it, its
       fit re-planned by the menu's own ResizeObserver) laid over #timeline-panel's box; the band keeps its title, Done and tools */
    r6c: { tags: ['1280'], steps: [
      async function () {
        await r6Open();
        const pic0 = picBox(), T = document.getElementById('timeline-panel').getBoundingClientRect();
        const st = document.createElement('style'); st.id = 'sm3sheet2-sheet';
        st.textContent = 'body.ed-simple #inspector-panel > #inspector { position: fixed !important; left: ' + T.left + 'px !important; top: ' + T.top + 'px !important;'
          + ' width: ' + T.width + 'px !important; height: ' + T.height + 'px !important; max-height: none !important; min-height: 0 !important; margin: 0 !important;'
          + ' z-index: 90 !important; box-sizing: border-box !important; padding: 14px 18px 10px !important; overflow-y: auto !important;'
          + ' background: var(--panel, #161a21) !important; border: 1px solid var(--line, #2b3548) !important; border-bottom: 0 !important;'
          + ' border-radius: 16px 16px 0 0 !important; box-shadow: 0 -10px 34px rgba(0, 0, 0, 0.55) !important; }'
          + ' body.ed-simple #inspector-panel > #sm-bar { margin-top: auto !important; }';
        document.head.appendChild(st);
        await settle(1100);
        const ins = document.getElementById('inspector'), r = ins.getBoundingClientRect();
        if (Math.abs(r.left - T.left) > 2 || Math.abs(r.top - T.top) > 2 || Math.abs(r.width - T.width) > 2 || Math.abs(r.height - T.height) > 2)
          fail('the drawn sheet over the timeline', '#inspector sits at ' + JSON.stringify(box(ins)) + ', want ' + JSON.stringify({ x: Math.round(T.left), y: Math.round(T.top), w: Math.round(T.width), h: Math.round(T.height) }));
        const am = xMenu();
        if (!am || !ins.contains(am)) fail('Extras inside the drawn sheet', 'no Extras menu in #inspector');
        const top = hitTest(am.querySelector('.addmenu-tab.active'));
        if (!top.ok) fail('the drawn sheet on top of the timeline', 'its open tab is covered by ' + top.by);
        const bar = document.getElementById('sm-bar');
        if (!shown(bar)) fail('the band’s tool rows beside the drawn sheet', '#sm-bar is not on screen');
        const m = r6Measure(am, { left: r.left, right: r.right, top: r.top, bottom: r.bottom });
        m.sheet = box(ins); m.pic0 = pic0; m.drawn = true;
        return { name: 'r6-c', crop: rectUnion([document.getElementById('inspector-panel'), ins]), meta: m };
      }] },

    /* Extras, just look: Clips is a two-item list now */
    clips: { tags: ['380', '1280'], steps: [
      async function () {
        await setup({ build: (W, H) => [smPic('B', 3, 3, W, H), smPic('A', 0, 3, W, H)], pics: ['A', 'B'], time: 1 });
        const b = press('clips', 'Clips in the project row'); await sleep(250); await frames(2);
        const words = count('.sm-menu .sm-menu-i', 2, 'the two items of the Clips list').map(x => x.textContent).join('|');
        need('.sm-menu .sm-menu-i', 2, 'the Clips list on screen');
        if (words !== 'Add clips|Extras') fail('Add clips and Extras', 'the list reads ' + words);
        return { name: 'clips-list', crop: crop({ bar: true, extra: [document.querySelector('.sm-menu')] }), meta: { items: words, title: b.title || '' } };
      }] },

    /* Extras, just look: the phone's Add sheet (its title still Add), its three tabs, and Elements with no saved element */
    xsheet: { tags: ['380'], steps: [
      async function () {
        await setup({ build: (W, H) => [smPic('B', 3, 3, W, H), smPic('A', 0, 3, W, H)], pics: ['A', 'B'], time: 1, lib: true });
        await openExtras();
        const sheet = document.getElementById('add-sheet');
        if (!sheet || !sheet.classList.contains('open')) fail('the Add sheet', '#add-sheet is not .open');
        const t = sheet.querySelector('.sheet-title'), title = t ? t.textContent.trim() : '';
        if (title !== 'Add') fail('the sheet’s title Add', 'it reads ' + JSON.stringify(title));
        const m = await xTab('object'), names = xCards(m).map(c => c.title);
        if (names.join('|') !== 'Lower third|Logo') fail('his two saved elements as tiles', 'the Elements tab holds ' + JSON.stringify(names));
        return { name: 'x-elements', crop: null, meta: { title: title, tabs: xTabWords(m), names: names } };
      },
      async function () {
        const m = await xTab('shape'), n = xCards(m).length;
        if (n < 6) fail('the Shape tab’s tiles', 'only ' + n);
        return { name: 'x-shape', crop: null, meta: { tiles: n, pages: m.querySelectorAll('.addmenu-body .addmenu-page').length } };
      },
      async function () {
        const m = await xTab('template'), names = xCards(m).map(c => c.title);
        if (names.indexOf('Promo') < 0) fail('the Promo template', 'the Template tab holds ' + JSON.stringify(names));
        return { name: 'x-template', crop: null, meta: { names: names } };
      },
      async function () {
        ST.lib.elements = [];
        const m = await xTab('object'), e = m.querySelector('.am-empty');
        if (!e || !shown(e)) fail('the empty Elements panel', '"' + '.addmenu .am-empty" is not on screen');
        return { name: 'x-noelements', crop: null, meta: { title: ((e.querySelector('.am-empty-title') || {}).textContent) || '', lines: Array.from(e.querySelectorAll('p')).map(p => p.textContent) } };
      }] },

    /* Extras, just look: a saved lower third added (the suite's third Extras test), its words saying what they move with */
    xwith: { tags: ['380', '1280'], steps: [
      async function () {
        await setup({ build: (W, H) => [smPic('B', 5, 3, W, H), smPic('A', 2, 3, W, H), smPic('Z', 0, 2, W, H)], pics: ['Z', 'A', 'B'], time: 4.8, lib: true });
        FM.time = 4.8;
        await FM.spine.cmd.addElement('eLT'); await busy();
        const B2 = L('Bar'), W2 = L('Jo Bloggs');
        if (!B2 || !W2) fail('the lower third in the project', 'the line says “' + sayText() + '”');
        const G = B2.parent ? FM.layerById(FM.scene, B2.parent) : null;
        if (!G || !(G.sm && G.sm.unit === true) || W2.parent !== G.id) fail('the bar and the words in one moves-together group', JSON.stringify({ bar: B2.parent || null, words: W2.parent || null }));
        FM.simpleTools._reset(); FM.selectLayer(null); FM.time = 5.6; FM.refreshAll(); await settle(300);
        FM.selectLayer(W2.id); await settle(450);
        const tag = need('#sm-tray .sm-with', 1, 'the Moves with tag in the words’ tools')[0];
        if (tag.textContent !== 'Moves with the shape') fail('the tag Moves with the shape', 'it reads ' + JSON.stringify(tag.textContent));
        await stripToStart();
        const st = tool('stay'), s = stripInfo();
        return { name: 'x-with', crop: crop(BAR), meta: { tag: tag.textContent, stay: st ? st.getAttribute('aria-label') : '', tools: toolIds('#sm-tray .sm-tool'), hidden: s.hidden, scrolls: s.scrolls } };
      }] },

    /* Effects on an item (sm3-next): the two trays, the picker, and option B of question 4 drawn */
    fxtray: { tags: ['380', '1280'], steps: [
      async function () {
        await setup({ build: (W, H) => [smT('Hi', 0.5, 1.5, W, H), smPic('O', 1, 1.5, W, H), smPic('C', 3, 3, W, H), smPic('A', 0, 3, W, H)], pics: ['A', 'O', 'C'], time: 1.6 });
        await select('O');
        needTools('#sm-tray .sm-tool', ['into', 'addfx', 'crop', 'forward', 'backward', 'stay', 'more', 'delete'], 'a picture on top’s eight tools');
        await stripToStart();
        const s = stripInfo();
        return { name: 'fx-tray-pic', crop: crop(BAR), meta: { n: 8, rows: rowsOf('#sm-tray .sm-tool'), hidden: s.hidden, scrolls: s.scrolls, outside: outsideBand('#sm-tray .sm-tool'), cut: cutLabels('#sm-tray .sm-tool') } };
      },
      async function () {
        await reselect('Hi');
        needTools('#sm-tray .sm-tool', ['editwords', 'addfx', 'stay', 'more', 'delete'], 'a title’s five tools');
        await stripToStart();
        const s = stripInfo();
        return { name: 'fx-tray-title', crop: crop(BAR), meta: { n: 5, rows: rowsOf('#sm-tray .sm-tool'), hidden: s.hidden, scrolls: s.scrolls, outside: outsideBand('#sm-tray .sm-tool'), cut: cutLabels('#sm-tray .sm-tool') } };
      },
      async function () {
        await reselect('O');
        press('addfx', 'Add effect in the picture’s tools'); await settle(1400);
        if (!tool('fxBack')) fail('Done in the item’s effects picker', '#sm-tray .sm-tool[data-tool="fxBack"]');
        need('#sm-tray .sm-fx-tile', 2, 'effect tiles on screen');
        const all = Array.from(document.querySelectorAll('#sm-tray .sm-fx-tile'));
        if (all.length < 10) fail('the effect tiles', 'only ' + all.length + ' in the picker');
        if (!document.querySelector('#sm-tray .sm-fx-tile[data-tool="fx:shake"]')) fail('the Shake tile', '#sm-tray .sm-fx-tile[data-tool="fx:shake"]');
        const run = document.querySelector('#sm-tray .sm-fx-run');
        return { name: 'fx-item-picker', crop: crop(BAR), meta: { tiles: all.length, presets: all.filter(b => String(b.dataset.tool).indexOf('fx:p:') === 0).length,
          first: all.slice(0, 5).map(b => ((b.querySelector('.sm-tool-l') || {}).textContent) || ''), cut: cutLabels('#sm-tray .sm-fx-tile').length, scrolls: !!run && run.scrollWidth > run.clientWidth + 1 } };
      },
      async function (tag) {
        if (tag !== '380') return { skip: true };
        await reselect('Hi');
        const a = tool('addfx');
        if (!a) fail('Add effect in the title’s tools', 'for the Effects drawing');
        const lb = a.querySelector('.sm-tool-l');
        if (!lb) fail('the words of Add effect', '.sm-tool-l');
        lb.textContent = 'Effects';
        const fx = document.querySelector('#sm-tools .sm-tool[data-tool="effects"]');
        if (!fx || !shown(fx)) fail('the bottom row’s Effects on screen at the same time', '#sm-tools .sm-tool[data-tool="effects"]');
        await stripToStart();
        const faces = Array.from(document.querySelectorAll('#sm-bar .sm-tool .sm-tool-l')).filter(x => x.textContent === 'Effects' && shown(x)).length;
        if (faces !== 2) fail('two buttons reading Effects on screen', faces + ' on screen');
        return { name: 'fx-face-effects', crop: crop(BAR), meta: { drawn: true, faces: faces } };
      }] },

    /* Effects on an item: the "runs over the next clip" tag (the suite's sixth Tray effects test) */
    fxover: { tags: ['380'], steps: [
      async function () {
        await setup({ build: (W, H) => {
          const seg = (name, s, d) => { const l = FM.makeLayer('adjustment', { name: name, x: W / 2, y: H / 2, start: s, duration: d }); const f = FM.fxRegistry.makeInstance('invert'); f.sm = 1; l.effects = [f]; return l; };
          return [seg('Over', 1, 2), seg('Inside', 2.5, 1), smPic('A', 0, 2, W, H), smPic('B', 2, 2, W, H), smPic('C', 4, 2, W, H)];
        }, pics: ['A', 'B', 'C'], time: 2 });
        const node = n => document.querySelector('#sm-timeline .sm-item[data-id="' + CSS.escape(String(L(n).id)) + '"]');
        const o = node('Over'), i = node('Inside');
        if (!o || !shown(o)) fail('the segment that runs past its clip, on the timeline', '#sm-timeline .sm-item for Over is ' + (o ? 'off the screen' : 'not drawn'));
        const h = o.querySelector('.sm-fx-over');
        if (!h || !shown(h)) fail('the runs over the next clip tag', '"#sm-timeline .sm-item .sm-fx-over" is ' + (h ? 'off the screen' : 'not there'));
        if (h.textContent !== 'runs over the next clip') fail('the words runs over the next clip', 'the tag reads ' + JSON.stringify(h.textContent));
        if (i && i.querySelector('.sm-fx-over')) fail('no tag on the segment inside its clip', 'Inside shows one too');
        const sc = document.getElementById('sm-scroll');
        const c = (sc && shown(sc)) ? rectUnion([sc], 0) : rectUnion([o, i], 60);
        return { name: 'fx-over', crop: c, meta: { text: h.textContent, label: o.getAttribute('aria-label') || '', cut: h.scrollWidth > h.clientWidth + 1 } };
      }] },

    /* Template Replace (sm3-replace): Insert your Media over Simple, a shorter clip for Clip 2 while Clip 3 is locked */
    filllock: { tags: ['380', '1280'], steps: [
      async function () {
        await setup({ build: (W, H) => [smT('On B', 4, 1, W, H), smV('C', 9, 3, W, H, { locked: true }), smV('B', 3, 6, W, H), smV('A', 0, 3, W, H)],
          media: [['A', 0, 10, 'src-a.mp4'], ['B', 1, 10, 'src.mp4'], ['C', 2, 10, 'src-c.mp4']], time: 0 });
        const r = await fillLine('B', 'That clip is locked', 'Do it anyway');
        return { name: 'fill-lock', crop: PHONE() ? null : r.crop, meta: r.meta };
      }] },

    /* Template Replace: a shorter clip for the clip inside a masking frame (the suite's fourth Replace test) */
    fillframe: { tags: ['380', '1280'], steps: [
      async function () {
        await setup({ build: (W, H) => {
          const G = FM.makeLayer('group', { name: 'Frame', x: 0, y: 0, start: 3, duration: 6 });
          G.maskGroup = true;
          const B = smV('B', 3, 6, W, H);
          B.parent = G.id;
          return [G, B, smV('C', 9, 3, W, H), smV('A', 0, 3, W, H)];
        }, media: [['A', 0, 10, 'src-a.mp4'], ['B', 1, 10, 'src.mp4'], ['C', 2, 10, 'src-c.mp4']], time: 0 });
        const R = FM.spine.classify(FM.scene), G = L('Frame');
        if (!G || !R.units[G.id] || R.units[G.id].kind !== 'block' || R.units[L('B').id]) fail('the framed clip as part of a block', JSON.stringify({ frame: G && R.units[G.id] ? R.units[G.id].kind : null, clip: R.units[L('B').id] || null }));
        const r = await fillLine('B', 'shorter than its place in the group', 'Open in Full');
        return { name: 'fill-frame', crop: PHONE() ? null : r.crop, meta: r.meta };
      }] },

    /* #5 (sm3-fix): an element of one picture and a sound, added just before a cut; the sound's tools say what it moves with */
    tie5: { tags: ['380'], steps: [
      async function () {
        await setup({ build: (W, H) => [smPic('B', 3.5, 3.5, W, H), smPic('A', 0, 3.5, W, H)], pics: ['A', 'B'], time: 2.5 });
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
        const g = cv.getContext('2d');
        g.fillStyle = '#10151f'; g.fillRect(0, 0, 128, 96);
        g.fillStyle = '#f2a33a'; g.beginPath(); g.arc(64, 48, 34, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#10151f'; g.beginPath(); g.arc(64, 48, 16, 0, Math.PI * 2); g.fill();
        const file = await new Promise(res => cv.toBlob(b => res(new File([b], 'logo.png', { type: 'image/png' })), 'image/png'));
        const pic = smPic('Logo', 0, 2, PW, PH, { srcW: 128, srcH: 96 }), whoosh = smSong('Whoosh', 1.2, 0.8, PW, PH);
        const media = {}; media[pic.id] = { file: file, kind: 'image' };
        stubLib({ elements: [{ id: 'eSting', name: 'Sting', pack: { layers: [pic, whoosh], media: media } }], templates: [] });
        FM.time = 2.5;
        await FM.spine.cmd.addElement('eSting'); await busy();
        const Lg = L('Logo'), Wh = L('Whoosh');
        if (!Lg || !Wh) fail('the element in the project', 'the line says “' + sayText() + '”');
        const G = Lg.parent ? FM.layerById(FM.scene, Lg.parent) : null;
        if (!G || !(G.sm && G.sm.unit === true) || Wh.parent !== G.id) fail('the picture and its sound tied in one moves-together group', JSON.stringify({ picture: Lg.parent || null, sound: Wh.parent || null }));
        FM.simpleTools._reset(); FM.selectLayer(null); await settle(250);
        FM.selectLayer(Wh.id); await settle(450);
        const tag = need('#sm-tray .sm-with', 1, 'the Moves with tag in the sound’s tools')[0];
        await stripToStart();
        return { name: 'tie-sound', crop: crop(BAR), meta: { with: tag.textContent, tools: toolIds('#sm-tray .sm-tool') } };
      }] }
  };

  window.SM3SHEET2 = {
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
