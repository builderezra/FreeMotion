/* V11 — The roadmap (DESIGN §15, §15.1).
 *
 * One card per step of §15, top to bottom, each with the screen Ezra would hold after that step, drawn with the kit's
 * own mock (VIS.phoneFrame / VIS.pcFrame, VIS.stage, VIS.drawQuick / VIS.drawFull), and one plain line of what the step
 * adds. What is new in a step is ringed in green and numbered; the numbers match the list beside the picture.
 *
 * Step 1 is highlighted and open, and it is a working mock drawn exactly as §15.1 says, on a phone and on a PC:
 *   - no tools row; the tray row is the lines-only #sm-say row: blank when idle, one line with one real "Open in Full"
 *     button (at least 44x32) after the Delete key on a clip, after ✂ (or A / S / D), or after a tap on a gap chip.
 *     The line clears after 10 s (never while the pointer or focus is in it) or on a tap elsewhere; its buttons stay
 *     inert for 400 ms; the rightmost 56 px of the row hold no button (§3.12 rules 2, 5)
 *   - ✂ dimmed, aria-disabled and still tappable; no switch on either play bar (Full's is today's ⋯ ⧉ ◐ |◀). The switch is the
 *     ⚙ cog's third block (VIS.cog, DESIGN §6.1): one tap flips Simple and Full with Phase 1's 150 ms crossfade; there is no E key
 *   - selecting opens today's panels, docked (phone: under the timeline; PC: the band). Full on a phone shows only the
 *     picked layer's row, as the app does today (V1's solo view)
 *   - + opens Full's Add sheet unchanged; media picked there land end to end from the end of the clip row, nothing that
 *     was there moves and no Simple marks are written (a plain add, so the song stays where it was)
 *   - no Settings row (D22 A, recommended): the cog's block is the only door, and nothing else in Full changes (§0.4)
 * Both projects are the kit's samples with their Simple marks removed: in step 1 every project was made in Full.
 * Later steps use the adopted Beach day and the kit's real commands where something moves (delete, reorder).
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.VIS || !window.VIS.register) return;
  const VIS = window.VIS, E = VIS.engine, el = VIS.el, esc = VIS.esc;

  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(mq && mq.matches);
  const EASE = 'cubic-bezier(.2,.8,.2,1)';

  VIS.register('v11', {
    title: 'The roadmap',
    group: 'Roadmap',
    blurb: 'What you could hold after each phase, drawn as the screen you would see, with Phase 1 first.',
    mount: host => mountV11(host)
  });

  /* ------------------------------------------------------------------ sizes and small helpers */
  const STAGE = 196, TL = 184, TOOLS_H = 55, TRAY_H = 52;
  const PH = 14 + 44 + STAGE + 40 + TL + TRAY_H + TOOLS_H;       // the phone mock's full height (585)
  const SAM = '#ff8a5b', MIA = '#c49bff';
  const tool = id => VIS.QUICK_TOOLS.find(t => t.id === id);
  const TOOLS_P2 = ['clips', 'text', 'sound', 'overlay'].map(tool);
  const P2_TRAY = [
    { id: 'speed', label: 'Speed', icon: 'speed' }, { id: 'volume', label: 'Volume', icon: 'sound' },
    { id: 'lift', label: 'Lift off', icon: 'lift' }, { id: 'crop', label: 'Crop', icon: 'crop' },
    { id: 'length', label: 'Length', icon: 'toEnd' }, { id: 'delete', label: 'Delete', icon: 'delete' }
  ];
  const TR_TRAY = [
    { id: 'pick', label: 'Transition', icon: 'effects' }, { id: 'len', label: 'Length', icon: 'toEnd' },
    { id: 'all', label: 'Every cut', icon: 'check' }
  ];
  const NEW_CLIPS = [
    { name: 'Rock pool', d: 5.2, look: ['#86dccb', '#1d6a74'] },
    { name: 'Ice cream', d: 3.1, look: ['#ffc6d6', '#d9658b'] },
    { name: 'Kite', d: 4.4, look: ['#a8d4ff', '#3a64c0'] },
    { name: 'Walk home', d: 4.8, look: ['#f8b98c', '#5f447a'] },
    { name: 'Shells', d: 2.6, look: ['#f4e3bb', '#b4895a'] },
    { name: 'Seagull', d: 3.6, look: ['#e3ecf1', '#6f879b'] }
  ];

  const nm = l => (l && (l.name || l.text || l.id)) || '';
  const clock = t => { const s = Math.max(0, Math.round(t)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const svg = inner => '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  function btn(cls, html, label) { const b = el('button', cls, html); b.type = 'button'; if (label) { b.setAttribute('aria-label', label); b.title = label; } return b; }
  function fullMade(key) { const d = VIS.sample(key); delete d.project.sm; d.layers.forEach(l => { delete l.sm; }); return d; }
  let seq = 0;
  const newId = () => 'add' + (++seq);

  /* Full's inspector categories, with the app's own icon paths (js/inspector.js CATEGORIES) */
  const CAT = {
    effects: { label: 'Effects', inner: VIS.ICONS.effects },
    color: { label: 'Colouring', inner: '<path d="M12 3a9 9 0 1 0 9 9c0-1.1-.9-2-2-2h-1.5a2 2 0 0 1 0-4H19a2 2 0 0 0 2-2c0-2-4-3-9-3z"/>' },
    border: { label: 'Outline & Shadows', inner: '<path d="M4 4h12v12H4zM9 20h11V9"/>' },
    blend: { label: 'Mixing', inner: '<path d="M9 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12M15 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12"/>' },
    transform: { label: 'Position / Scale', inner: '<path d="M12 2v20M2 12h20M8 5l4-3 4 3M8 19l4 3 4-3M5 8l-3 4 3 4M19 8l3 4-3 4"/>' },
    speed: { label: 'Speed', inner: '<path d="M4.2 16.8a8 8 0 1 1 15.6 0M12 12l4-2.5"/>' },
    volume: { label: 'Volume', inner: '<path d="M11 5 6 9H3v6h3l5 4zM16 8.5a4 4 0 0 1 0 7M19.5 6a8 8 0 0 1 0 12"/>' },
    element: { label: 'Element Properties', inner: '<path d="M4 9h7v7H4zM15 6a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7M16 14l4 6h-8z"/>' },
    captions: { label: 'Captions', inner: VIS.ICONS.captions }
  };
  function catsFor(l) {
    if (!l) return [];
    if (l.audioOnly) return ['volume', 'speed', 'effects'];
    if (l.type === 'text' && Array.isArray(l.captions)) return ['captions', 'color', 'border', 'transform'];
    if (l.type === 'text') return ['effects', 'color', 'border', 'blend', 'transform', 'element'];
    if (l.type === 'video') return ['effects', 'color', 'blend', 'transform', 'speed', 'volume'];
    if (l.type === 'camera') return ['transform', 'effects'];
    return ['effects', 'color', 'border', 'blend', 'transform'];
  }
  function kindWord(l) {
    if (!l) return '';
    if (l.audioOnly) return 'Sound';
    if (l.type === 'text') return Array.isArray(l.captions) ? 'Captions' : 'Text';
    return { video: 'Video clip', image: 'Picture', group: 'Group', shape: 'Shape', camera: 'Camera' }[l.type] || 'Layer';
  }
  function thumbOf(l) { return l.type === 'text' ? 'linear-gradient(135deg,#7a5cc4,#3f2d78)' : l.audioOnly ? 'linear-gradient(135deg,#2f9b7c,#174f42)' : VIS.thumb(l); }

  /* ------------------------------------------------------------------ mock pieces */
  function phone(host, o) {
    o = o || {};
    const f = VIS.phoneFrame(host, { name: o.name || 'Beach day', editor: 'quick', stageH: o.stageH || STAGE, tlH: o.tlH || TL,
      tools: o.tools === false ? false : (o.tools || VIS.QUICK_TOOLS) });
    if (o.tools === false) f.tools.style.display = 'none';
    return f;
  }
  /* a screen that is not the editor: the phone shell with its own content, the same height as the editor mocks */
  function shell(host, top, body) {
    const f = VIS.phoneFrame(host, { name: top, editor: 'full' });
    f.root.innerHTML = '<div class="fm-topbar"><span class="fm-ibtn" aria-hidden="true">' + VIS.icon('back') + '</span><div class="fm-name">' + esc(top) + '</div></div>' + body;
    f.root.style.height = PH + 'px';
    f.fit();
    return f;
  }
  /* "new in this step": a green ring, and a number that matches the list beside the picture */
  function ring(node, n, opts) {
    if (!node) return null;
    node.classList.add('v11-new');
    // the bottom row of the phone: the ring follows the phone's rounded corners instead of being cut off by them
    node.classList.toggle('v11-foot', !!(opts && opts.foot));
    if (getComputedStyle(node).position === 'static') node.style.position = 'relative';
    if (n != null) { const p = el('span', 'v11-pin' + (opts && opts.out ? ' out' : '') + (opts && opts.left ? ' left' : '') + (opts && opts.outl ? ' outl' : ''), String(n)); p.setAttribute('aria-hidden', 'true'); node.appendChild(p); }
    return node;
  }
  function unring(root) {
    root.querySelectorAll('.v11-pin').forEach(p => p.remove());
    root.querySelectorAll('.v11-new').forEach(n => n.classList.remove('v11-new', 'v11-foot'));
  }
  /* a #sm-say line: text first, its buttons after it, the rightmost 56 px left empty (§3.12 rule 5) */
  function sayLine(tray, text, buttons) {
    tray.classList.remove('v11-docked');
    tray.innerHTML = '';
    const row = el('div', 'v11-sayline');
    const tx = el('span', 'v11-saytext', esc(text)); tx.title = text; row.appendChild(tx);
    (buttons || []).forEach(b => {
      const x = btn('v11-saybtn', (b.icon ? VIS.icon(b.icon) : '') + '<span>' + esc(b.label) + '</span>');
      x.addEventListener('click', e => { e.stopPropagation(); if (x.getAttribute('aria-disabled') === 'true') return; b.run(); });
      row.appendChild(x);
    });
    tray.appendChild(row);
    return row;
  }
  function quiet(tray, html) { tray.classList.remove('v11-docked'); tray.innerHTML = '<div class="fm-say">' + (html || '') + '</div>'; }
  function people(stageWrap, list) {
    const box = el('div', 'v11-people');
    list.forEach(p => box.appendChild(el('span', 'v11-face', '<i style="background:' + p.c + '">' + esc(p.n[0]) + '</i><span>' + esc(p.n) + ' · ' + esc(p.ed) + '</span>')));
    box.appendChild(VIS.chip('LIVE', 'live'));
    stageWrap.appendChild(box);
  }
  /* FLIP: tiles glide from where they were (the timeline is redrawn, so ids carry the continuity) */
  function rects(api) { const m = new Map(); if (api) api.items.forEach((n, id) => m.set(id, n.getBoundingClientRect())); return m; }
  function glide(api, before, scale, ms) {
    if (!api || reduced()) return;
    const s = scale || 1;
    api.items.forEach((n, id) => {
      const a = before.get(id); if (!a) return;
      const b = n.getBoundingClientRect();
      const dx = (a.left - b.left) / s, dy = (a.top - b.top) / s;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      n.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: ms || 260, easing: EASE });
    });
  }
  function inspector(l) {
    const box = el('div', 'v11-insp');
    box.innerHTML = '<div class="v11-insp-h"><span class="th" style="background:' + thumbOf(l) + '"></span><div><b>' + esc(nm(l)) + '</b><small>' + esc(kindWord(l)) + '</small></div></div>' +
      '<div class="v11-insp-grid">' + catsFor(l).map(k => '<span class="v11-icat">' + svg(CAT[k].inner) + '<span>' + esc(CAT[k].label) + '</span></span>').join('') + '</div>';
    return box;
  }

  /* ================================================================== STEP 1: the working mock (§15.1) */
  function buildP1(mockHost, ui) {
    const S = { view: ui.view || 'phone', proj: 'beach', editor: 'quick', sel: null, seam: null, open: null, t: 4.6, line: null, sheet: null, picks: [], on: true };
    const T0 = { beach: 4.6, messy: 6.8 };
    let docs, undo;
    function reset() { docs = { beach: fullMade('beach'), messy: fullMade('messy') }; undo = { beach: [], messy: [] }; }
    reset();
    let f = null, api = null, live = null, lineTimer = 0, pointerIn = false, focusIn = false, cog = null;
    const doc = () => docs[S.proj];
    const layerOf = id => doc().layers.find(l => l.id === id) || null;
    const quick = () => S.editor === 'quick';
    const say = t => ui.narrate(t);

    function build() {
      clearTimeout(lineTimer); pointerIn = false; focusIn = false;
      mockHost.innerHTML = '';
      const name = doc().project.name;
      f = S.view === 'pc'
        ? VIS.pcFrame(mockHost, { name, editor: 'quick', width: 1100, height: 660, band: 250, inspW: 330, minScale: 0.2, tools: false })
        : VIS.phoneFrame(mockHost, { name, editor: 'quick', stageH: STAGE + TOOLS_H, tlH: TL, tools: false });
      f.tools.style.display = 'none';
      f.tray.classList.add('v11-smsay');
      f.tray.setAttribute('role', 'status'); f.tray.setAttribute('aria-live', 'polite');
      live = el('div', 'v11-vh'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); f.root.appendChild(live);
      f.root.tabIndex = 0;
      f.root.setAttribute('aria-label', 'Phase 1 screen, ' + name + '. Delete and S work here; ⚙ opens the cog with the switch.');
      f.on('split', () => splitTap());
      cog = VIS.cog(f, { editor: () => S.editor, onSwitch: () => flip(), onOpen: () => { S.sheet = null; renderSheet(); say('The ⚙ cog, with its new third block on top. Tap its switch to flip editors; “What should you use?” opens the explanation.'); } });
      f.on('undo', () => undoOne());
      f.root.addEventListener('keydown', onKey);
      f.root.addEventListener('pointerdown', e => {
        if (!S.line || f.tray.contains(e.target)) return;
        if (e.target.closest('[data-act="split"], .fm-seam')) return;      // those raise a line of their own
        clearLine();
      }, true);
      f.tray.addEventListener('pointerenter', () => { pointerIn = true; clearTimeout(lineTimer); });
      f.tray.addEventListener('pointerleave', () => { pointerIn = false; armTimer(); });
      f.tray.addEventListener('focusin', () => { focusIn = true; clearTimeout(lineTimer); });
      f.tray.addEventListener('focusout', () => { focusIn = false; armTimer(); });
      draw();
    }

    /* Full on a phone with something picked shows only that layer's row, with its panels docked below, as the app
       does today (V1 draws the same). Without this the pick scrolled out of sight after the switch. */
    const soloFull = () => !quick() && S.view === 'phone' && !!(S.sel && layerOf(S.sel));
    function draw(opt) {
      opt = opt || {};
      const d = doc(), q = quick(), solo = soloFull();
      // no switch on either play bar (§0.4): Full's is today's, Simple's is ⋯ ✂ · |◀; the switch is the ⚙ cog's third block
      f.setEditor(S.editor);
      if (ui.onEditor) ui.onEditor(S.editor);
      const sb = f.root.querySelector('[data-act="split"]');
      if (sb && q) { sb.classList.add('dim'); sb.setAttribute('aria-disabled', 'true'); sb.title = 'Split (in the next update)'; }
      if (S.view === 'phone') { const tray = q || solo; f.tray.style.display = tray ? '' : 'none'; f.timeline.style.height = (tray ? TL : TL + TRAY_H) + 'px'; }
      else f.tray.style.visibility = q ? '' : 'hidden';
      VIS.stage(f.stage, d, S.t, { selected: S.sel });
      const common = { pxPerSec: 'fit', time: S.t, selected: S.sel, onTap: tapItem, onScrub: scrub };
      api = q ? VIS.drawQuick(f.timeline, d, Object.assign({ open: S.view === 'pc' ? 'all' : S.open, onOpen: s => { S.open = s; draw(); },
                  onSeam: seamTap, onAdd: openAdd }, common))
              : VIS.drawFull(f.timeline, d, common);
      if (solo) soloRow();
      else if (!q && S.sel) showRow();
      if (q && S.seam) markSeam();
      renderSay();
      if (S.view === 'pc') renderPanel();
      renderSheet();
      f.setTime(S.t, d.project.fps);
      pins();
      if (opt.fade && !reduced()) [f.timeline, f.tray, S.view === 'pc' ? f.panel : null].forEach(n => { if (n) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' }); });
    }
    function soloRow() {
      const bar = api.items.get(S.sel); if (!bar) return;
      const keep = bar.closest('.fm-row');
      api.inner.querySelectorAll('.fm-row').forEach(r => { if (r !== keep) r.style.display = 'none'; });
      api.scroller.scrollTop = 0;
      f.timeline.appendChild(el('p', 'v11-solo-note', 'Full on a phone shows only the picked layer, as it does today. Tap it again to see every row.'));
    }
    function showRow() {                 // PC Full: every row, with the picked one scrolled into sight
      const bar = api.items.get(S.sel); if (!bar) return;
      const row = bar.closest('.fm-row') || bar, sc = api.scroller, top = row.offsetTop;
      if (top < sc.scrollTop + 18 || top + row.offsetHeight > sc.scrollTop + sc.clientHeight) sc.scrollTop = Math.max(0, top - 24);
    }
    function dockFor(l) {
      f.tray.innerHTML = ''; f.tray.classList.add('v11-docked');
      const dock = el('div', 'v11-dock');
      dock.innerHTML = '<i class="v11-grabbar"></i><div class="v11-dock-row"><span class="v11-dock-name">' + esc(nm(l)) + '</span>' +
        catsFor(l).map(k => '<span class="v11-dcat">' + svg(CAT[k].inner) + '<span>' + esc(CAT[k].label) + '</span></span>').join('') + '</div>';
      f.tray.appendChild(dock);
    }
    function markSeam() {
      const R = api.R; const chips = f.timeline.querySelectorAll('.fm-seam');
      const withSeam = R.main.filter(e => e.seam.kind === 'gap' || e.seam.kind === 'overlap');
      const i = withSeam.findIndex(e => e.id === S.seam);
      if (chips[i]) chips[i].classList.add('v11-on');
    }
    function renderSay() {
      if (!quick()) { if (soloFull()) dockFor(layerOf(S.sel)); else { f.tray.classList.remove('v11-docked'); f.tray.innerHTML = ''; } return; }
      if (S.line) {
        const row = sayLine(f.tray, S.line, [{ label: 'Open in Full', run: openInFull }]);
        const bs = row.querySelectorAll('.v11-saybtn');
        bs.forEach(b => { b.setAttribute('aria-disabled', 'true'); b.classList.add('arming'); b.title = 'Open in Full'; });
        setTimeout(() => bs.forEach(b => { b.removeAttribute('aria-disabled'); b.classList.remove('arming'); }), 400);
        return;
      }
      const l = S.sel && layerOf(S.sel);
      if (S.view === 'phone' && l && !S.sheet) { dockFor(l); return; }   // today's panels, docked under the timeline
      quiet(f.tray, '');
    }
    function renderPanel() {
      const p = f.panel; p.innerHTML = '';
      const l = S.sel && layerOf(S.sel);
      if (!l) { p.appendChild(el('div', 'v11-insp-empty', 'Nothing picked')); return; }
      p.appendChild(inspector(l));
    }
    function pins() {
      unring(f.root);
      ring(f.root.querySelector(S.view === 'pc' ? '.fm-transport [data-act="gear"]' : '.fm-topbar [data-act="settings"]'), 1, { out: true });
      if (!quick()) return;                                     // Full: nothing new but the cog's block, which lives inside ⚙
      ring(f.timeline.querySelector('.fm-cliprow'), 2, { left: true });
      const docked = S.view === 'phone' && S.sel && !S.line && !S.sheet && layerOf(S.sel);
      if (S.sel && !S.line && layerOf(S.sel)) ring(S.view === 'pc' ? f.panel : f.tray.querySelector('.v11-dock'), 3, { foot: S.view === 'phone' });
      ring(f.root.querySelector('[data-act="split"]'), 4, { outl: true });
      if (!docked) ring(f.tray, 5, { foot: S.view === 'phone' });
      ring(f.timeline.querySelector('.fm-addclip'), 6, { out: true });
    }

    /* the #sm-say line: one line, one button, clears after 10 s unless the pointer or focus is in it */
    function setLine(text) { S.line = text; renderSay(); pins(); armTimer(); if (live) live.textContent = text + ' · Open in Full'; }
    function clearLine() { if (!S.line) return; S.line = null; S.seam = null; clearTimeout(lineTimer); f.timeline.querySelectorAll('.fm-seam.v11-on').forEach(c => c.classList.remove('v11-on')); renderSay(); pins(); }
    function armTimer() { clearTimeout(lineTimer); if (!S.line || pointerIn || focusIn) return; lineTimer = setTimeout(clearLine, 10000); }

    function tapItem(id) {
      if (S.sheet) return;
      S.sel = S.sel === id ? null : id; S.seam = null; S.line = null; clearTimeout(lineTimer);
      draw();
      const l = S.sel && layerOf(S.sel);
      if (!l) { say('Nothing picked. The message row goes back to blank.'); return; }
      const where = S.view === 'pc' ? 'on the left, beside the timeline' : 'under the timeline';
      if (!quick()) { say('You picked “' + nm(l) + '”. ' + (S.view === 'phone' ? 'Full on a phone shows only that layer, with its panels under it, as it does today.' : 'Its panels open on the left, beside the timeline, as they do today.')); return; }
      say((api.R && api.R.isMain && api.R.isMain(S.sel) ? 'You picked the clip “' : 'You picked “') + nm(l) + '”. The panels you know from Full open ' + where + '. Changes there are ordinary edits to that one thing, so nothing else moves.');
    }
    function scrub(t) {
      const d = doc(); S.t = Math.max(0, Math.min(t, d.project.duration - 0.01));
      VIS.stage(f.stage, d, S.t, { selected: S.sel });
      if (api && api.setTime) api.setTime(S.t);
      f.setTime(S.t, d.project.fps);
    }
    function seamTap(id) {
      if (S.sheet) return;
      S.sel = null; S.seam = id; S.line = 'Closing gaps comes in the next update';
      draw(); armTimer();
      if (live) live.textContent = S.line + ' · Open in Full';
      say('Gaps and overlaps show as small chips on the clip row. In Phase 1 a tap only explains. Nothing is saved.');
    }
    function splitTap() {
      if (!quick()) { say('In Full, ✂ splits exactly as it does today.'); return; }
      if (S.sheet) return;
      if (S.seam) { S.seam = null; f.timeline.querySelectorAll('.fm-seam.v11-on').forEach(c => c.classList.remove('v11-on')); }
      setLine('Splitting comes in the next update');
      say('✂ is greyed out in Phase 1 but already sits in its final place, so nothing shifts when Phase 2 turns it on.');
    }
    function deleteKey() {
      if (!quick()) { say('In Full, Delete works exactly as it does today.'); return; }
      if (!S.sel) { say('Pick something first, then press Delete.'); return; }
      const R = E.classify(doc());
      if (R.isMain(S.sel)) {
        setLine('Deleting clips comes next');
        say('There is no delete button in Simple yet. On a clip, the Delete key explains instead of leaving a hole in the row.');
        return;
      }
      const l = layerOf(S.sel); if (!l) return;
      undo[S.proj].push(E.clone(doc()));
      const gone = new Set([l.id]); doc().layers.forEach(x => { if (x.parent === l.id) gone.add(x.id); });
      doc().layers = doc().layers.filter(x => !gone.has(x.id));
      S.sel = null; draw();
      if (live) live.textContent = 'Deleted ' + nm(l);
      say('Deleted “' + nm(l) + '”, the same as in Full. Deleting something that is not a clip can never open a gap in the row. ↶ brings it back.');
    }
    function flip(opts) {
      if (!S.on) return;
      S.editor = quick() ? 'full' : 'quick';
      S.line = null; S.seam = null; S.sheet = null; clearTimeout(lineTimer);
      draw({ fade: true });
      if (live) live.textContent = 'Now in ' + (quick() ? 'Simple' : 'Full');
      if (!(opts && opts.silent)) say('Now in ' + (quick() ? 'Simple' : 'Full') + '. Same project, same spot, same pick' + (soloFull() ? ': Full on a phone shows only the picked layer, as it does today' : '') + '. Nothing was converted or saved' + (quick() ? '' : ', and Full is exactly today’s Full') + '. Phase 1 switches with a quick fade; the animation comes in Phase 3.');
    }
    function openInFull() {
      S.editor = 'full'; S.line = null; S.seam = null; clearTimeout(lineTimer);
      draw({ fade: true });
      say('Open in Full takes you to the same spot in Full, with the same thing picked. Full is plain Full, with no back button: the switch in the ⚙ cog brings you back.');
    }
    function undoOne() {
      if (!quick()) { say('In Full, ↶ undoes as it does today.'); }
      const st = undo[S.proj];
      if (!st.length) { say('Nothing to undo yet.'); return; }
      docs[S.proj] = st.pop();
      S.sel = null; S.line = null; S.seam = null; S.sheet = null;
      draw();
      say('Undone. Adding and deleting use the same undo as Full.');
    }
    function onKey(e) {
      const k = e.key;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); deleteKey(); }
      else if (k === 'a' || k === 'A' || k === 's' || k === 'S' || k === 'd' || k === 'D') { if (quick()) { e.preventDefault(); splitTap(); } }
      else if (k === 'Escape') { if (S.sheet) { S.sheet = null; draw(); } else clearLine(); }
    }

    /* + : Full's Add sheet, unchanged; then the phone's own picker; then the clips land end to end */
    function openAdd() {
      if (!quick()) return;
      S.line = null; S.seam = null; clearTimeout(lineTimer);
      S.sheet = 'add'; S.picks = [];
      renderSay(); renderSheet(); pins();
      say('+ opens Full’s Add menu, exactly as it is today. Try Media, then Import.');
    }
    function renderSheet() {
      f.root.querySelectorAll(':scope > .v11-scrim, :scope > .v11-sheet, :scope > .v11-picker').forEach(n => n.remove());
      if (!S.sheet) return;
      const pc = S.view === 'pc';
      const scrim = el('div', 'v11-scrim'); scrim.addEventListener('click', () => { S.sheet = null; renderSheet(); renderSay(); pins(); });
      f.root.appendChild(scrim);
      if (S.sheet === 'add') {
        const sh = el('div', 'v11-sheet' + (pc ? ' pc' : ''));
        sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Add');
        const recents = E.classify(doc()).main.filter(e => !e.slot).slice(0, 3).map(e => layerOf(e.id)).filter(Boolean);
        sh.innerHTML = '<div class="v11-grab"><i></i></div><div class="v11-sheet-t">Add</div>' +
          '<div class="v11-acats">' + ADD_CATS.map(c => '<button type="button" class="v11-acat' + (c.k === 'media' ? ' on' : '') + '" data-k="' + c.k + '" aria-pressed="' + (c.k === 'media') + '">' + c.svg + '<span>' + c.label + '</span></button>').join('') + '</div>' +
          '<div class="v11-media"><button type="button" class="v11-import">' + VIS.icon('add') + '<span>Import</span></button>' +
          recents.map(l => '<button type="button" class="v11-rec" style="background:' + VIS.thumb(l) + '"><span>' + esc(nm(l)) + '</span></button>').join('') + '</div>';
        sh.querySelector('.v11-import').addEventListener('click', () => { S.sheet = 'pick'; S.picks = []; renderSheet(); say('This is your phone’s own picker. Tap the clips you want, in order, then Add.'); });
        sh.querySelectorAll('.v11-acat').forEach(b => b.addEventListener('click', () => { if (b.dataset.k !== 'media') say('Elements, Shape, Audio and Template work exactly as in Full today.'); }));
        sh.querySelectorAll('.v11-rec').forEach(b => b.addEventListener('click', () => say('One tap re-adds a file you have used before, as in Full. Try Import to pick new clips.')));
        f.root.appendChild(sh);
        try { sh.querySelector('.v11-import').focus({ preventScroll: true }); } catch (e) { /* fine */ }
      } else {
        const pk = el('div', 'v11-picker' + (pc ? ' pc' : ''));
        pk.setAttribute('role', 'dialog'); pk.setAttribute('aria-label', 'Your phone’s picker');
        pk.innerHTML = '<div class="v11-pk-h"><button type="button" class="v11-pk-x">Cancel</button><b>Recents</b><button type="button" class="v11-pk-add" disabled>Add</button></div>' +
          '<div class="v11-pk-grid">' + NEW_CLIPS.map((c, i) => '<button type="button" class="v11-pk-tile" data-i="' + i + '" aria-pressed="false" aria-label="' + esc(c.name) + ', ' + clock(c.d) + '" style="background:linear-gradient(135deg,' + c.look[0] + ',' + c.look[1] + ')"><i class="tick"></i><span class="nm">' + esc(c.name) + '</span><span class="dur">' + clock(c.d) + '</span></button>').join('') + '</div>' +
          '<p class="v11-pk-note">Your phone’s own picker, not FreeMotion’s</p>';
        const addB = pk.querySelector('.v11-pk-add');
        const sync = () => {
          pk.querySelectorAll('.v11-pk-tile').forEach(t => { const k = S.picks.indexOf(+t.dataset.i); t.setAttribute('aria-pressed', String(k >= 0)); t.querySelector('.tick').textContent = k >= 0 ? String(k + 1) : ''; });
          addB.disabled = !S.picks.length; addB.textContent = S.picks.length ? 'Add (' + S.picks.length + ')' : 'Add';
        };
        pk.querySelectorAll('.v11-pk-tile').forEach(t => t.addEventListener('click', () => { const i = +t.dataset.i, k = S.picks.indexOf(i); if (k >= 0) S.picks.splice(k, 1); else S.picks.push(i); sync(); }));
        pk.querySelector('.v11-pk-x').addEventListener('click', () => { S.sheet = null; renderSheet(); renderSay(); pins(); say('Nothing added.'); });
        addB.addEventListener('click', landPicks);
        f.root.appendChild(pk);
      }
    }
    function landPicks() {
      const d = doc(); if (!S.picks.length) return;
      undo[S.proj].push(E.clone(d));
      const R = E.classify(d); const from = R.main.length ? R.trackEnd : 0;
      let T = from; const b = Math.floor(Math.random() * 1e6); const ids = [];
      S.picks.forEach((i, k) => {
        const c = NEW_CLIPS[i], id = newId();
        d.layers.unshift({ id, type: 'video', name: c.name, start: Math.round(T * 1000) / 1000, duration: c.d, trimStart: 0, srcDur: c.d, speed: 1, look: c.look.slice(), pick: { b, i: k } });
        T += c.d; ids.push(id);
      });
      d.project.duration = Math.max(d.project.duration, Math.round(T * 1000) / 1000);
      const n = ids.length, after = R.main.length ? nm(layerOf(R.main[R.main.length - 1].id)) : '';
      S.sheet = null; S.picks = []; S.sel = null; S.t = from + 0.4;
      draw();
      if (!reduced() && api) ids.forEach((id, k) => { const node = api.items.get(id); if (node) node.animate([{ opacity: 0, transform: 'translateY(14px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 60 + k * 110, easing: EASE, fill: 'backwards' }); });
      if (live) live.textContent = 'Added ' + n + (n === 1 ? ' clip' : ' clips');
      say((n === 1 ? 'The clip lands' : 'The ' + n + ' clips land one after another,') + (after ? ' after ' + after : ' at the start') + '. Nothing that was there moved' + (S.proj === 'beach' ? ', and the song stays where it was until Phase 2 makes it follow the clips.' : '.') + ' ↶ takes them out again.');
    }

    build();
    return {
      get view() { return S.view; }, get proj() { return S.proj; }, get on() { return S.on; }, get editor() { return S.editor; },
      setView(v) { if (v === S.view) return; S.view = v; S.sheet = null; S.line = null; S.seam = null; build(); ui.onView(v); },
      setProj(p) { if (p === S.proj) return; S.proj = p; S.t = T0[p]; S.sel = null; S.seam = null; S.open = null; S.line = null; S.sheet = null; if (S.on) S.editor = 'quick'; build(); ui.onProj(p); },
      reset() { reset(); S.sel = null; S.seam = null; S.line = null; S.sheet = null; S.open = null; S.t = T0[S.proj]; S.editor = S.on ? 'quick' : 'full'; build(); say('Back to the start: ' + doc().project.name + ', made in Full, seen in Simple.'); },
      pickClip() {
        if (!quick() && S.on) flip({ silent: true });
        S.sheet = null; renderSheet();
        const R = E.classify(doc()); const e = R.main.filter(x => !x.slot)[1] || R.main[0];
        if (!e) return; S.sel = null; tapItem(e.id);
      },
      pressDelete() {
        if (!quick() && S.on) flip({ silent: true });
        S.sheet = null;
        const R = E.classify(doc());
        if (!S.sel || !R.isMain(S.sel)) { const e = R.main.filter(x => !x.slot)[1] || R.main[0]; S.sel = e ? e.id : null; S.line = null; draw(); }
        deleteKey();
      },
      tapSplit() { if (!quick() && S.on) flip({ silent: true }); S.sheet = null; renderSheet(); splitTap(); },
      tapAdd() { if (!quick() && S.on) flip({ silent: true }); openAdd(); },
      tapSwitch() { if (cog) cog.open('last'); },
      tapGap() {
        if (S.proj !== 'messy') this.setProj('messy');
        if (!quick() && S.on) flip({ silent: true });
        S.sheet = null;
        const e = E.classify(doc()).main.find(x => x.seam.kind === 'gap');
        if (e) seamTap(e.id);
      },
      setOn() {}
    };
  }

  /* Full's Add sheet categories (js/addmenu.js: Elements, Shape, Media, Audio, Template) */
  const ADD_CATS = [
    { k: 'object', label: 'Elements', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.6" fill="#ffb86b"/><circle cx="17" cy="7" r="4" fill="#7fd1ff"/><path d="M12 13.5l5.2 8H6.8z" fill="#b8a4ff"/></svg>' },
    { k: 'shape', label: 'Shape', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3.5" y="9" width="11" height="11" rx="1.5"/><circle cx="15.5" cy="8.5" r="5"/></svg>' },
    { k: 'media', label: 'Media', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="#2f6f9f"/><circle cx="8.4" cy="10.2" r="2.1" fill="#fbbf24"/><path d="M3 17c2.6-3.4 5-3.6 7.6-1.6 2.2-2.6 5.4-3.2 10.4.2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#3fc47a"/></svg>' },
    { k: 'audio', label: 'Audio', svg: svg(VIS.ICONS.music) },
    { k: 'template', label: 'Template', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>' }
  ];

  /* ================================================================== the other steps' screens */
  function buildDecide(host) {
    const DECS = [['D1', 'Names', 'A'], ['D3', 'New project (asked again)', 'A'], ['D4', 'Titles follow clips', 'A'],
      ['D5', 'Delete takes its titles', 'A'], ['D6', 'A title’s start trimmed off', 'A'], ['D7', 'A locked clip', 'A'], ['D8', 'Gaps', 'A'], ['D9', 'Old projects', 'A']];
    shell(host, 'Your decisions',
      '<div class="v11-dec"><p class="v11-dec-lede">A letter for each, or just “do recommended”.</p>' +
      DECS.map(d => '<div class="v11-dec-row"><span class="k">' + d[0] + '</span><span class="q">' + esc(d[1]) + '</span><span class="v11-dec-pick">' +
        ['A', 'B', 'C'].map(x => '<i' + (x === d[2] ? ' class="on"' : '') + '>' + x + '</i>').join('') + '</span></div>').join('') +
      '<p class="v11-dec-more">and 14 more · D2 is settled: the switch is in the ⚙ cog</p></div>' +
      '<div class="v11-dec-foot"><span class="v11-dec-btn">Do recommended</span><span class="v11-dec-btn primary">Copy my answers</span></div>');
    return {};
  }

  function buildEdit(host, detail) {
    const ed = E.editor(VIS.sample('beach'));
    let sel = 'c2', line = null, t = 4.6, api = null;
    const f = phone(host, { tools: TOOLS_P2 });
    const tryB = btn('h-btn v11-try', '');
    function draw() {
      unring(f.root);
      VIS.stage(f.stage, ed.doc, t, { selected: sel });
      api = VIS.drawQuick(f.timeline, ed.doc, { pxPerSec: 'fit', time: t, selected: sel, open: 'text', showLink: false,
        onTap: id => { sel = sel === id ? null : id; line = null; draw(); } });
      const R = api.R;
      if (line) sayLine(f.tray, line, [{ label: 'Undo', icon: 'undo', run: undoIt }]);
      else if (sel && R.isMain(sel)) { f.tray.innerHTML = ''; VIS.toolbar(f.tray, P2_TRAY, { onClick: id => { if (id === 'delete') del(); } }); ring(f.tray, 1); }
      else if (sel) { f.tray.innerHTML = ''; VIS.toolbar(f.tray, VIS.ITEM_TRAY.filter(x => x.id !== 'look')); }
      else quiet(f.tray, '<b>' + R.main.length + ' clips</b> · ' + clock(R.trackEnd));
      ring(f.tools, 2, { foot: true });
      if (sel && R.isMain(sel)) ring(api.items.get(sel), 3);
      ring(f.root.querySelector('[data-act="split"]'), 4, { outl: true });
      f.setTime(t, 30);
      const has = ed.doc.layers.some(l => l.id === 'c2');
      tryB.innerHTML = has ? VIS.icon('delete') + '<span>Delete Waves</span>' : VIS.icon('undo') + '<span>Undo</span>';
    }
    function del() {
      const id = sel && api.R.isMain(sel) ? sel : 'c2';
      const before = rects(api);
      const r = ed.run('deleteClip', { id });
      if (!r.ok) return;
      sel = null; line = r.say; if (r.time != null) t = r.time;
      draw(); glide(api, before, f.scale, 260);
    }
    function undoIt() {
      if (!ed.canUndo()) return;
      const before = rects(api);
      ed.undo(); sel = 'c2'; line = null; t = 4.6;
      draw(); glide(api, before, f.scale, 260);
    }
    f.on('undo', undoIt);
    tryB.addEventListener('click', () => { if (ed.doc.layers.some(l => l.id === 'c2')) { sel = 'c2'; del(); } else undoIt(); });
    draw();
    detail.tries.appendChild(tryB);
  }

  function buildLooks(host, detail) {
    const doc = VIS.sample('beach');
    const f = phone(host, { tools: VIS.QUICK_TOOLS });
    VIS.stage(f.stage, doc, 8.2, {});
    const cv = f.stage.querySelector('.fm-canvas'); if (cv) cv.classList.add('v11-look');
    const api = VIS.drawQuick(f.timeline, doc, { pxPerSec: 'fit', time: 8.2, open: 'captions' });
    quiet(f.tray, '<b>4 clips</b> · 0:14');
    f.setTime(8.2, 30);
    ring(f.tools, 1, { foot: true });
    ['captions', 'look', 'effects', 'ask'].forEach(id => { const b = f.toolbar && f.toolbar.buttons[id]; if (b) b.classList.add('v11-dot'); });
    ring(api.sectionRows && api.sectionRows.captions, 2);
    ring(cv, 3);
    // the way in (§7.1, 1 Oct): New project stays today's dialog; D3 A opens a new project in this device's last editor
    detail.extra.appendChild(el('p', 'v11-h4', 'The way in'));
    detail.extra.appendChild(el('p', 'v11-note', 'New project stays exactly as it is today. A new project opens in the editor this device last switched to in the ⚙ cog (D3, asked again). When that is Simple, Create also opens the picker straight away, so the clips land end to end.'));
  }

  function buildTogether(host, detail) {
    const ed = E.editor(VIS.sample('beach'));
    let api = null, line = null, tint = [], tm = 0;
    const f = phone(host, { tools: VIS.QUICK_TOOLS });
    function draw() {
      unring(f.root);
      VIS.stage(f.stage, ed.doc, 1.2, {});
      people(f.stage, [{ n: 'Sam', ed: 'Simple', c: SAM }]);
      api = VIS.drawQuick(f.timeline, ed.doc, { pxPerSec: 'fit', time: 1.2, open: 'text' });
      tint.forEach(id => { const n = api.items.get(id); if (n) n.classList.add('v11-tint'); });
      if (line) sayLine(f.tray, line, []); else quiet(f.tray, '<b>4 clips</b> · 0:14');
      ring(f.timeline.querySelector('.fm-cliprow'), 1, { left: true });
      if (line) ring(f.tray, 2);
      f.setTime(1.2, 30);
    }
    function move(animate) {
      const beforeStart = new Map(ed.doc.layers.map(l => [l.id, l.start]));
      const before = rects(api);
      ed.run('reorder', { id: 'c4', to: 0 });
      const R = E.classify(ed.doc);
      tint = R.main.filter(e => !e.slot && Math.abs(beforeStart.get(e.id) - e.start) > 1e-6).map(e => e.id);
      line = 'Sam moved ' + tint.length + ' clips';
      draw();
      if (animate) {
        glide(api, before, f.scale, 200);
        clearTimeout(tm);
        if (!reduced()) tm = setTimeout(() => { tint = []; f.timeline.querySelectorAll('.v11-tint').forEach(n => n.classList.remove('v11-tint')); }, 1000);
      }
    }
    const tryB = btn('h-btn v11-try', VIS.icon('play') + '<span>Play Sam’s move</span>');
    tryB.addEventListener('click', () => {
      clearTimeout(tm);
      if (ed.canUndo()) ed.undo();
      tint = []; line = null; draw();
      tm = setTimeout(() => move(true), reduced() ? 0 : 450);
    });
    draw(); move(false);
    detail.tries.appendChild(tryB);
  }

  function buildSeams(host) {
    const ed = E.editor(VIS.sample('beach'));
    ed.run('reorder', { id: 'c4', to: 0 });
    const f = phone(host, { tools: VIS.QUICK_TOOLS });
    VIS.stage(f.stage, ed.doc, 5.2, {});
    people(f.stage, [{ n: 'Sam', ed: 'Simple', c: SAM }, { n: 'Mia', ed: 'Full', c: MIA }]);
    VIS.drawQuick(f.timeline, ed.doc, { pxPerSec: 'fit', time: 5.2, open: 'text' });
    quiet(f.tray, '<b>4 clips</b> · 0:14');
    f.setTime(5.2, 30);
    ring(f.timeline.querySelector('.fm-cliprow'), 1, { left: true });
  }

  function buildTransitions(host) {
    const doc = VIS.sample('beach');
    const f = phone(host, { tools: VIS.QUICK_TOOLS });
    const t = 7.1;
    VIS.stage(f.stage, doc, t, {});
    const cv = f.stage.querySelector('.fm-canvas');
    if (cv) {                                   // the picture half way through a wipe from Waves to Sandcastle
      const w = el('div', 'cv-layer v11-wipe'); w.style.background = VIS.thumb(doc.layers.find(l => l.id === 'c2'));
      cv.appendChild(w); cv.appendChild(el('div', 'v11-wipeline'));
    }
    const api = VIS.drawQuick(f.timeline, doc, { pxPerSec: 'fit', time: t, open: 'text' });
    const row = f.timeline.querySelector('.fm-cliprow');
    api.R.main.forEach((e, i) => {
      if (!i) return;
      const d = el('span', 'v11-cut' + (e.id === 'c3' ? ' on' : ''));
      d.style.left = api.xOf(e.start) + 'px'; d.style.top = (row.offsetTop + 30) + 'px';
      api.inner.appendChild(d);
    });
    f.tray.innerHTML = ''; VIS.toolbar(f.tray, TR_TRAY);
    f.setTime(t, 30);
    ring(row, 1, { left: true }); ring(f.tray, 2); ring(cv, 3);
  }

  function buildLater(host) {
    const L = [['Freeze a frame', 'pause'], ['Steady a shaky clip', 'crop'], ['Speed curves', 'speed'], ['Beat marks on music', 'music'],
      ['Subtitle files', 'captions'], ['Sticker and text styles', 'text'], ['Words in captions', 'captions'], ['Sound fades at transitions', 'sound'], ['A first-time tour', 'help']];
    shell(host, 'Later, one at a time',
      '<div class="v11-later"><p class="v11-dec-lede">Each one only after your yes.</p>' +
      L.map(x => '<div class="v11-later-row">' + VIS.icon(x[1]) + '<span>' + esc(x[0]) + '</span><i>' + (x[0] === 'A first-time tour' ? 'at launch' : 'your yes') + '</i></div>').join('') + '</div>');
  }

  function buildIfNeeded(host) {
    shell(host, 'Only if needed',
      '<div class="v11-ghost"><div class="v11-ghost-row"><i></i><i></i><i class="gap"></i><i></i></div><div class="v11-ghost-q">?</div>' +
      '<p>Only if working together still leaves gaps between clips too often, once it has been measured.</p></div>');
  }

  /* ================================================================== the road */
  const STEPS = [
    { n: 0, name: 'Decide', when: 'You are here', hold: ['see', 'You see it here'],
      line: 'You look through these pages and pick your answers. Nothing in the app changes yet.',
      starts: 'Now. You answered most of them on 1 Oct; six are still open on the decision sheet (V10), or send “do recommended”.',
      news: [], notes: ['Every open question has a recommended answer, so “do recommended” answers all six at once.'], build: buildDecide },
    { n: 1, name: 'See any project as clips', when: 'The first thing you hold', hold: ['preview', 'You can hold it, as a preview'], first: true,
      line: 'Any project shows as a row of clips. You can look, pick, and add clips on the end. Editing clips still happens in Full.',
      starts: 'You said go (D15 A). Your picks on D1, D9 and D16 are in; D18, D22, D23 and D24 are still open. D2 is settled: the switch is in the ⚙ cog.' },
    { n: 2, name: 'Edit clip after clip', hold: ['preview', 'You can hold it, as a preview'],
      line: 'Trim, split, delete, move and speed up clips. The rest close up, and titles go with their clip.',
      starts: 'After Phase 1 is checked, with your picks on D4 to D8, D10, D14, D17 (a long song runs on in black) and D19, and D14b still open.',
      news: ['Tools for the clip you picked, in the row under the timeline', 'A tools row: Clips, Text, Sound and Overlay', 'Handles on the picked clip, to trim it', '✂ splits'],
      notes: ['With a friend who can edit in the project, clips stay put (D14b, still open; A is recommended). Looks, text and sound still work live.'], build: buildEdit },
    { n: 3, name: 'Looks, captions and the way in', hold: ['yes', 'You can hold it'],
      line: 'Looks, captions, effects and Ask arrive. A new project opens in the editor you last switched to; New project itself is unchanged.',
      starts: 'After Phase 2, with your picks on D11 (the morph), D12, D20 (panels in the left band) and D21, and D3 still open.',
      news: ['Captions, Look, Effects and Ask join the tools row (the green dots)', 'Captions go with their clips, line by line', 'A look on the picture'],
      notes: ['The switch in the cog now plays the morph as the cog closes (D11, your pick).'], build: buildLooks },
    { n: 4, name: 'Together (held)', hold: ['none', 'Held'],
      line: 'Held. You and a friend could both move clips at the same time, but it would change how Full behaves when a friend is in, so it is built only if you say yes (D14b). Drawn here in Simple.',
      starts: 'Only if you say yes on D14b (option B), after your first real test with the Mac and the iPhone together.',
      news: ['A friend’s moves glide into place and glow in their colour for a second', 'One line says what happened'],
      notes: ['If this is never built, moving clips waits while a friend who can edit is in the project, for good, and Full is untouched.'], build: buildTogether },
    { n: 5, name: 'All or nothing (held)', hold: ['none', 'Held with Phase 4'],
      line: 'If two people move clips at the very same moment, each move lands whole or not at all. You should notice nothing.',
      starts: 'Only with Phase 4.',
      news: ['Clips still join up, even when two people move them at the same moment'], notes: [], build: buildSeams },
    { n: 6, name: 'Transitions', hold: ['yes', 'You can hold it'],
      line: 'A ◇ at every cut to add a transition, and clips that can animate in and out.',
      starts: 'After Phase 5, with your pick on D13. You see drawn options first.',
      news: ['A ◇ at every cut', 'Pick a transition, set its length, or use it on every cut', 'The picture half way through a transition'],
      notes: ['Transitions never shorten your video (D13, recommended).', 'One video: a transition added in Simple also plays in Full’s preview and export. Full gets no new button for it (D13 decides this when Phase 6 comes up).'], build: buildTransitions },
    { n: 7, name: 'The later list', hold: ['none', 'One at a time'],
      line: 'Small extras, one at a time, each only when you say yes.',
      starts: 'Your go-ahead on each one.', news: [], notes: [], build: buildLater },
    { n: 8, name: 'Only if needed', hold: ['none', 'Maybe never'],
      line: 'A bigger rebuild of how clips are laid out, only if working together still leaves gaps too often.',
      starts: 'Only if Phases 4 and 5 still show gaps often, once measured.', news: [], notes: [], build: buildIfNeeded }
  ];
  const SHORT = ['Decide', 'See clips', 'Edit clips', 'Looks', 'Together (held)', 'All or nothing (held)', 'Transitions', 'Later', 'If needed'];

  const P1_NEWS = [
    'The ⚙ cog gets a third block on top, Editor: a small Simple ⇄ Full switch and “What should you use?”. One tap switches and the cog closes. Same project, same spot, same pick, nothing converted or saved. It is the only change you would see in Full.',
    'Clips in one row, with titles, captions and sound in rows of their own. Gaps and overlaps show as small chips.',
    'Tap a clip and the panels you know from Full open, docked under the timeline (on a PC, on the left beside it).',
    '✂ is in its final place but greyed out. A tap says so and offers Open in Full.',
    'The message row. It stays blank until something needs saying, so nothing jumps. No tool rows yet.',
    '+ opens Full’s Add menu. The clips you pick land one after another at the end. Nothing already there moves.'
  ];

  const withGlyphs = t => esc(t);
  function legend(items) {
    const ol = el('ol', 'v11-legend');
    items.forEach((t, i) => ol.appendChild(el('li', '', '<span class="v11-num" aria-hidden="true">' + (i + 1) + '</span><span><span class="v11-vh">' + (i + 1) + '. </span>' + withGlyphs(t) + '</span>')));
    return ol;
  }
  function seg(opts, cur, label, onPick) {
    const s = el('div', 'h-seg v11-seg'); s.setAttribute('role', 'group'); s.setAttribute('aria-label', label);
    opts.forEach(([v, t]) => { const b = btn('', esc(t)); b.dataset.v = v; b.setAttribute('aria-pressed', String(v === cur)); s.appendChild(b); });
    s.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; onPick(b.dataset.v); });
    s.set = v => s.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    return s;
  }

  function mountV11(host) {
    const root = el('div', 'v11'); host.appendChild(root);
    root.appendChild(el('p', 'v11-lede', 'Each phase ships on its own, and each is checked before the next one starts. Below is the screen you could hold after each phase. <b>Phase 1 is the first thing you get</b>, so it is open and it works: tap around in it.'));
    root.appendChild(el('p', 'v11-keyline', '<span class="v11-swatch" aria-hidden="true"></span><span>Ringed in green: new in that phase. The numbers match the list beside the picture.</span>'));
    const jump = el('nav', 'v11-jump'); jump.setAttribute('aria-label', 'Phases');
    root.appendChild(jump);
    const road = el('ol', 'v11-road');
    root.appendChild(road);
    const cards = [];

    STEPS.forEach((st, idx) => {
      const li = el('li', 'v11-step' + (st.first ? ' first' : '') + (st.n === 0 ? ' now' : ''));
      li.id = 'v11-step-' + st.n;
      li.appendChild(el('div', 'v11-node', String(st.n))).setAttribute('aria-hidden', 'true');
      const card = el('article', 'v11-card'); card.setAttribute('aria-labelledby', 'v11-name-' + st.n);
      const mini = el('div', 'v11-mini');
      const mockHost = el('div', 'v11-mock'); mini.appendChild(mockHost);
      const head = el('div', 'v11-head',
        '<p class="v11-eye"><span class="v11-badge">Phase ' + st.n + '</span>' + (st.when ? '<span class="v11-when">' + esc(st.when) + '</span>' : '') + '</p>' +
        '<h3 class="v11-name" id="v11-name-' + st.n + '">' + esc(st.name) + '</h3>' +
        '<p class="v11-hold ' + st.hold[0] + '">' + esc(st.hold[1]) + '</p>');
      const text = el('div', 'v11-text',
        '<p class="v11-line">' + esc(st.line) + '</p><p class="v11-starts"><b>Starts:</b> ' + esc(st.starts) + '</p>');
      const more = btn('h-btn v11-more', '');
      more.setAttribute('aria-controls', 'v11-detail-' + st.n);
      text.appendChild(more);
      const detail = el('div', 'v11-detail'); detail.id = 'v11-detail-' + st.n; detail.hidden = true;
      text.appendChild(detail);
      card.appendChild(mini); card.appendChild(head); card.appendChild(text);
      li.appendChild(card); road.appendChild(li);

      const c = { st, li, card, mini, more, detail, open: false };
      cards.push(c);
      const jb = btn(st.first ? 'first' : '', '<b>' + st.n + '</b><span>' + esc(SHORT[idx]) + '</span>', 'Phase ' + st.n + ': ' + st.name);
      jb.addEventListener('click', () => { setOpen(c, true); scrollTo(c); });
      jump.appendChild(jb);

      if (st.first) buildStep1(c, mockHost);
      else {
        const parts = { tries: el('div', 'v11-tries'), extra: el('div', 'v11-extra') };
        if (st.news.length) { detail.appendChild(el('p', 'v11-h4', 'New in this phase')); detail.appendChild(legend(st.news)); }
        st.build(mockHost, parts);
        if (parts.tries.children.length) detail.insertBefore(parts.tries, detail.firstChild);
        (st.notes || []).forEach(t => detail.appendChild(el('p', 'v11-note', esc(t))));
        if (parts.extra.children.length) detail.appendChild(parts.extra);
      }
      mini.addEventListener('click', () => { if (!c.open) { setOpen(c, true); } });
      mini.addEventListener('keydown', e => { if (!c.open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(c, true); } });
      more.addEventListener('click', () => setOpen(c, !c.open));
      setOpen(c, !!st.first, true);
    });

    function setOpen(c, open, quietly) {
      c.open = open;
      c.card.classList.toggle('open', open);
      c.detail.hidden = !open;
      c.more.setAttribute('aria-expanded', String(open));
      c.more.innerHTML = '<span>' + (open ? 'Smaller' : 'See it bigger') + '</span>';
      if (open) { c.mini.removeAttribute('role'); c.mini.removeAttribute('tabindex'); c.mini.removeAttribute('aria-label'); }
      else { c.mini.setAttribute('role', 'button'); c.mini.tabIndex = 0; c.mini.setAttribute('aria-label', 'See Phase ' + c.st.n + ' bigger'); }
      if (c.p1) {
        if (!open && c.p1.view === 'pc') c.p1.setView('phone');
        c.mini.querySelectorAll('.fm').forEach(n => { if (open) n.removeAttribute('inert'); else n.setAttribute('inert', ''); });
      } else c.mini.querySelectorAll('.fm').forEach(n => { if (open) n.removeAttribute('inert'); else n.setAttribute('inert', ''); });
      if (!quietly && open) requestAnimationFrame(() => {
        const r = c.card.getBoundingClientRect();
        if (r.top < 0 || r.top > window.innerHeight * 0.55) scrollTo(c);
      });
    }
    function scrollTo(c) { c.li.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); }

    function buildStep1(c, mockHost) {
      const d = c.detail;
      const narr = el('p', 'v11-narr', 'Tap anything on the screen above, or try one of these.');
      narr.setAttribute('aria-live', 'polite');
      let segView, segProj;
      const syncSwTry = () => {};
      const wideStart = (window.innerWidth || 1024) >= 1000;
      const p1 = buildP1(mockHost, {
        view: wideStart ? 'pc' : 'phone',
        narrate: t => { narr.textContent = t; if (!reduced()) narr.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' }); },
        onView: v => { segView && segView.set(v); c.card.classList.toggle('pc', v === 'pc'); },
        onProj: p => { if (segProj) segProj.set(p); },
        onEditor: ed => syncSwTry(ed)
      });
      c.p1 = p1;
      c.card.classList.toggle('pc', p1.view === 'pc');
      const ctl = el('div', 'v11-p1ctl');
      segView = seg([['phone', 'Phone'], ['pc', 'PC']], p1.view, 'Screen', v => { if (!c.open) setOpen(c, true); p1.setView(v); });
      segProj = seg([['beach', 'Beach day'], ['messy', 'Cooking with Mia']], p1.proj, 'Project', v => p1.setProj(v));
      ctl.appendChild(segView); ctl.appendChild(segProj);
      d.appendChild(ctl);
      const tries = el('div', 'v11-tries');
      const T = (icon, label, run) => { const b = btn('h-btn v11-try', VIS.icon(icon) + '<span>' + esc(label) + '</span>'); b.addEventListener('click', run); tries.appendChild(b); return b; };
      T('clips', 'Pick a clip', () => p1.pickClip());
      T('delete', 'Press Delete', () => p1.pressDelete());
      T('split', 'Tap ✂', () => p1.tapSplit());
      T('add', 'Tap +', () => p1.tapAdd());
      T('gear', 'Open the ⚙ cog', () => p1.tapSwitch());
      T('fit', 'Show a gap', () => p1.tapGap());
      T('undo', 'Start again', () => p1.reset()).classList.add('v11-reset');
      d.appendChild(tries);
      d.appendChild(narr);
      const cols = el('div', 'v11-p1cols');
      const a = el('div', 'v11-p1col'), b = el('div', 'v11-p1col');
      a.appendChild(el('p', 'v11-h4', 'New on this screen'));
      a.appendChild(legend(P1_NEWS));
      a.appendChild(el('p', 'v11-note', 'Looking at a project in Simple saves nothing. Clips you add are saved the same way as adding them in Full.'));
      a.appendChild(el('p', 'v11-note', 'It works with a friend in the project too, because nothing in Simple moves other clips yet.'));
      // the switch (§6.1, §15.1): the cog's third block, small; under D22 A there is no Settings row
      b.appendChild(el('p', 'v11-h4', 'The switch, in the ⚙ cog'));
      const still = el('div', 'v11-cogstill'); b.appendChild(still);
      VIS.cogStill(still, { layout: 'phone', big: 'canvas', editor: 'full' });
      b.appendChild(el('p', 'v11-note', 'Canvas settings and Friends stay where they are today; the Editor block sits small above them. “What should you use?” opens it big. There is no Settings row for it (D22, recommended), so nothing else in Full changes.'));
      // the message row, both states (§15.1: blank, and with the Delete line)
      b.appendChild(el('p', 'v11-h4', 'The message row'));
      const strips = el('div', 'v11-strips');
      const s1 = el('div', 'fm v11-strip', '<div class="fm-tray"><div class="fm-say"></div></div>');
      const s2 = el('div', 'fm v11-strip', '<div class="fm-tray"></div>');
      sayLine(s2.querySelector('.fm-tray'), 'Deleting clips comes next', [{ label: 'Open in Full', run: () => {} }]);
      s1.setAttribute('inert', ''); s2.setAttribute('inert', '');
      strips.appendChild(el('p', 'v11-cap', 'Most of the time: blank'));
      strips.appendChild(s1);
      strips.appendChild(el('p', 'v11-cap', 'After the Delete key on a clip'));
      strips.appendChild(s2);
      b.appendChild(strips);
      b.appendChild(el('p', 'v11-note', 'The right end of the row stays empty, so a quick second tap can’t land on a button. In Phase 2 the same row holds the clip tools, so nothing moves.'));
      cols.appendChild(a); cols.appendChild(b);
      d.appendChild(cols);
    }
  }
})();
