/* FreeMotion — FM.simpleTools: the Simple editor's two rows (Simple mode Phase 2, DESIGN.md §8.2, §8.3, §8.5; his D10).
 *
 * THE TRAY ROW (#sm-tray, inside #sm-say): the selected item's tools; with nothing selected, one quiet line ("4 clips ·
 * 0:15"). #sm-say's lines take the same 52 px row for a moment (§3.12), so nothing appears, disappears or moves.
 * THE PROJECT TOOLS ROW (#sm-tools): Clips · Text · Sound · Overlay — it never goes away (D10 A). Phase 3 adds Captions,
 * Look for all, Effects and Ask to the same row.
 * Phone: both rows sit under the Simple timeline; a tool that needs a panel opens today's panel docked under the tray
 * (js/mobile.js dockSheet). PC: both rows sit at the bottom of the left band, the panel above them (D20 A, his pick).
 *
 * One home per control (§8.5, his #310): Split is the play bar's ✂, Close all gaps is Simple's ⋯, Add clips is the clip
 * row's + and Clips. Every command goes through FM.spine.cmd, so it is one undo step and refuses with a line when it must.
 * Built with createElement / textContent; the icons are fixed SVG strings (the D16 A set, tools/design/.../vis/kit.js).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const ICON = {
    clips: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7.5 5v14M16.5 5v14M3 9.7h4.5M3 14.3h4.5M16.5 9.7H21M16.5 14.3H21"/>',
    text: '<path d="M6.4 18.6L12 5.2l5.6 13.4"/><path d="M8.5 14.2h7"/>',
    music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
    overlay: '<rect x="3" y="3" width="13" height="13" rx="2"/><rect x="8" y="8" width="13" height="13" rx="2" fill="currentColor" fill-opacity=".22"/>',
    length: '<path d="M3.5 5v14M20.5 5v14M7 12h10M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
    earlier: '<rect x="12" y="6" width="8.5" height="12" rx="2"/><path d="M8.5 9l-3.5 3 3.5 3M5 12h5"/>',
    later: '<rect x="3.5" y="6" width="8.5" height="12" rx="2"/><path d="M15.5 9l3.5 3-3.5 3M19 12h-5"/>',
    lift: '<path d="M12 15V5M8 9l4-4 4 4M5 19.5h14"/>',
    drop: '<path d="M12 5v10M8 11l4 4 4-4M5 19.5h14"/>',
    duplicate: '<rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><path d="M7 13V9a2 2 0 0 1 2-2h4"/>',
    crop: '<path d="M6.5 3v14.5H21M3 6.5h14.5V21"/>',
    delete: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    pin: '<path d="M9 3.5h6l-.8 5.5 3.3 3.2H6.5L9.8 9z"/><path d="M12 12.2V20.5"/>',
    forward: '<rect x="3.5" y="10" width="10" height="10" rx="2"/><rect x="10.5" y="4" width="10" height="10" rx="2" fill="currentColor" fill-opacity=".28"/>',
    backward: '<rect x="10.5" y="4" width="10" height="10" rx="2"/><rect x="3.5" y="10" width="10" height="10" rx="2" fill="currentColor" fill-opacity=".28"/>',
    editwords: '<path d="M4 6h11M9.5 6v12M18 7v11M16 7h4M16 18h4"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    minus: '<path d="M5 12h14"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    editor: '<rect x="3" y="4" width="10" height="4" rx="1.3"/><rect x="8" y="10" width="13" height="4" rx="1.3"/><rect x="5" y="16" width="9" height="4" rx="1.3"/>',
    back: '<path d="M15 5l-7 7 7 7"/>'
  };
  const svg = n => '<svg viewBox="0 0 24 24" class="sm-ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[n] || ICON.more) + '</svg>';
  const W = () => (FM.spineWords && FM.spineWords.tools) || {};
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  let bar = null, sayEl = null, tray = null, tools = null, menu = null;
  let panelFor = null, lengthFor = null, lengthEdge = 'end', lastSig = '', lastSel = null;
  const isSimple = () => !!(FM.editor && FM.editor.isSimple && FM.editor.isSimple());
  function el(tag, cls, text) { const d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }

  /* The two rows live in ONE wrapper (#sm-bar), moved between layouts: phone → under the Simple timeline's rows; PC → the
     bottom of the left band. One element, so the tools have one home on both. */
  function place() {
    if (!bar) return;
    const host = phone.matches ? document.getElementById('sm-timeline') : document.getElementById('inspector-panel');
    if (!host) return;
    if (phone.matches) { const sc = document.getElementById('sm-scroll'); if (bar.parentNode !== host || bar.previousElementSibling !== sc) host.insertBefore(bar, sc ? sc.nextSibling : host.firstChild); }
    else if (bar.parentNode !== host || host.lastElementChild !== bar) host.appendChild(bar);
  }
  function mount() {
    if (bar) return true;
    bar = document.getElementById('sm-bar'); sayEl = document.getElementById('sm-say');
    tray = document.getElementById('sm-tray'); tools = document.getElementById('sm-tools');
    if (!bar || !tray || !tools) { bar = null; return false; }
    if (phone.addEventListener) phone.addEventListener('change', () => { place(); lastSig = ''; FM.simpleTools.sync(); });
    buildTools();
    /* Simple's ⋯ (§8.2): Close all gaps when there is one, then everything else in Full's own ⋯ strip. Capture phase, and
       only while Simple is on screen, so Full's ⋯ is exactly today's. */
    const opts = document.getElementById('btn-opts');
    if (opts) opts.addEventListener('click', e => { if (!isSimple() || FM._smOptsPass) return; e.stopImmediatePropagation(); e.preventDefault(); optsMenu(opts); }, true);
    document.addEventListener('pointerdown', e => { if (menu && !menu.contains(e.target)) closeMenu(); }, true);
    /* A PLAIN MOUSE WHEEL SCROLLS THE TRAY SIDEWAYS (review finding 22, his #976: "on pc without trackpad there seems to be no
       way to slide"). Only a vertical wheel over a tray that overflows, and only while it can still move; a trackpad's own
       sideways swipe and a finger are left to the browser. */
    tray.addEventListener('wheel', e => {
      if (!e.deltaY || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const max = tray.scrollWidth - tray.clientWidth; if (max <= 0) return;
      const to = Math.max(0, Math.min(max, tray.scrollLeft + e.deltaY));
      if (to === tray.scrollLeft) return;
      e.preventDefault(); tray.scrollLeft = to;
    }, { passive: false });
    return true;
  }
  function tool(t) {
    const b = el('button', 'sm-tool' + (t.pin ? ' sm-pin' : ''));
    b.type = 'button'; b.dataset.tool = t.id;
    b.innerHTML = svg(t.icon);                                        // a fixed string, never user data
    b.appendChild(el('span', 'sm-tool-l', t.label));
    b.title = t.title || t.label; b.setAttribute('aria-label', t.title || t.label);
    if (t.pressed != null) b.setAttribute('aria-pressed', t.pressed ? 'true' : 'false');
    if (t.disabled) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', e => { e.stopPropagation(); if (b.getAttribute('aria-disabled') === 'true') { if (t.why && FM.spine) FM.spine.say(t.why); return; } closeMenu(); t.run(b); });
    return b;
  }

  /* ═══ THE PROJECT TOOLS (§8.5): nothing needs to be selected. ═══ */
  function pick(accept, multiple, cb) {
    const inp = el('input'); inp.type = 'file'; inp.accept = accept; inp.multiple = !!multiple;
    inp.addEventListener('change', () => { const f = Array.from(inp.files || []); if (f.length) cb(f); });
    inp.click();
  }
  function clipsTool() {
    const S = FM.spine, R = S.read(FM.scene), w = W(), t = FM.time || 0, clips = R.main.filter(e => !e.slot);
    const inside = clips.length && t > clips[0].start + R.eps && t < R.trackEnd - R.eps;
    if (!inside) { pick('video/*,image/*,audio/*', true, f => S.cmd.append(f)); return; }
    const j = S.insertIndexAt(R, t);
    /* after a card (a slot entry, id 'slot:…', no layer) the label names the card by its first member: "After " alone read
       as a broken button (review finding 6) */
    const pe = j > 0 ? R.main[j - 1] : null, nm = pe ? S.itemWord(FM.layerById(FM.scene, pe.slot ? pe.members[0] : pe.id), R) : '';
    const after = j === 0 ? w.beforeFirst : (nm ? (w.afterClip || 'After ') + nm : (w.afterCard || 'After the card'));
    S.say(w.addWhere || 'Add clips', { buttons: [
      { label: w.atEnd || 'At the end', fn: () => pick('video/*,image/*,audio/*', true, f => S.cmd.append(f)) },
      { label: after, fn: () => pick('video/*,image/*,audio/*', true, f => S.cmd.insert(f, j)) }
    ] });
  }
  function soundTool(b) {
    const w = W();
    openMenu(b, [
      { label: w.music || 'Music from your files', run: () => pick('audio/*,video/*', true, f => FM.spine.cmd.addMusic(f)) },
      { label: w.sfx || 'Sound effects', run: () => { if (FM.sfx && FM.sfx.open) FM.sfx.open(); } },
      { label: w.voice || 'Record voice', run: () => { if (FM.voiceRec && FM.voiceRec.open) FM.voiceRec.open(); } }
    ]);
  }
  function buildTools() {
    const w = W();
    tools.textContent = '';
    [{ id: 'clips', label: w.clips || 'Clips', icon: 'clips', run: clipsTool },
     { id: 'text', label: w.text || 'Text', icon: 'text', run: () => FM.spine.cmd.addText() },
     { id: 'sound', label: w.sound || 'Sound', icon: 'music', run: soundTool },
     { id: 'overlay', label: w.overlay || 'Overlay', icon: 'overlay', run: () => pick('video/*,image/*', true, f => FM.spine.cmd.addOverlay(f)) }
    ].forEach(t => tools.appendChild(tool(t)));
  }

  /* ═══ THE TRAY (§8.5): the selected item's tools, the tools that define its kind first, 🗑 pinned at the right end. ═══ */
  function trayFor(R, id) {
    const S = FM.spine, w = W(), l = FM.layerById(FM.scene, id), u = R.units[id];
    if (!l) return [];
    const del = { id: 'delete', label: w.delete || 'Delete', icon: 'delete', pin: true, run: () => { if (R.isMain(id)) S.cmd.del(id); else if (FM.deleteLayer) FM.deleteLayer(id); } };
    const stayOn = !!(l.sm && l.sm.stay);
    const stay = { id: 'stay', label: w.stay || 'Stay put', icon: 'pin', pressed: stayOn, run: () => S.cmd.stay(id, !stayOn) };
    const more = { id: 'more', label: w.more || 'More', icon: 'more', title: w.moreTitle, run: () => FM.simpleTools.openPanel(id) };
    const crop = { id: 'crop', label: w.crop || 'Crop', icon: 'crop', run: () => { if (FM.cropTool && FM.cropTool.start) FM.cropTool.start(id); } };
    if (R.isMain(id)) {
      const i = R.main.findIndex(e => e.id === id), sb = R.main[i].seam, na = R.main[i + 1], sa = na && na.seam;
      const out = [
        { id: 'length', label: w.length || 'Length', icon: 'length', run: () => FM.simpleTools.openLength(id) },
        { id: 'earlier', label: w.earlier || 'Move earlier', icon: 'earlier', disabled: S.moveIndexFor(R, id, -1) < 0, run: () => S.cmd.move(id, -1) },
        { id: 'later', label: w.later || 'Move later', icon: 'later', disabled: S.moveIndexFor(R, id, 1) < 0, run: () => S.cmd.move(id, 1) },
        { id: 'lift', label: w.lift || 'Lift off', icon: 'lift', title: w.liftTitle, run: () => S.cmd.lift(id) },
        { id: 'duplicateClip', label: w.duplicate || 'Duplicate', icon: 'duplicate', run: () => S.cmd.duplicate(id) },
        crop
      ];
      /* §8.2: a clip next to a gap or an overlap offers Close gap / Fix too (the seam chip's command) */
      const seamTool = (e, s) => ({ id: 'seam', label: s.kind === 'gap' ? (w.closeGap || 'Close gap') : (w.fix || 'Fix'), icon: 'check', run: () => S.cmd.closeSeam(e.id) });
      if (sb && (sb.kind === 'gap' || sb.kind === 'overlap') && !sb.covered) out.push(seamTool(R.main[i], sb));
      else if (sa && (sa.kind === 'gap' || sa.kind === 'overlap') && !sa.covered) out.push(seamTool(na, sa));
      out.push(more, del);
      return out;
    }
    const k = u ? u.kind : '';
    if (k === 'text') return [{ id: 'editwords', label: w.editWords || 'Edit words', icon: 'editwords', run: () => { if (FM.textEdit && FM.textEdit.start) FM.textEdit.start(id, { selectAll: true }); } }, stay, more, del];
    if (k === 'captions') return [more, del];
    if (k === 'audio') return [stay, more, del];
    if (k === 'effect') return [stay, more, del];
    if (k === 'block' || k === 'fullOnly') return [{ id: 'openFull', label: w.openFull || 'Open in Full', icon: 'editor', run: () => FM.editor && FM.editor.request('full', { hop: true }) }, del];
    if (k === 'undecided') return [];
    const inCard = !!(u && u.host && String(u.host).indexOf('slot:') === 0);   // a card between clips: no Into row until its slot form exists (§3.6)
    return [   // overlays, stickers, pictures, a background
      ...(inCard ? [] : [{ id: 'into', label: w.into || 'Into row', icon: 'drop', title: w.intoTitle, run: () => S.cmd.intoRow(id) }]),
      crop,
      { id: 'forward', label: w.forward || 'Forward', icon: 'forward', run: () => S.cmd.z(id, 1) },
      { id: 'backward', label: w.backward || 'Back', icon: 'backward', run: () => S.cmd.z(id, -1) },
      stay, more, del];
  }
  /* LENGTH (§8.5): the clip's length with − and + of one frame each and a typed value; it commits a ripple trim exactly as
     D does. The row itself is the panel (a thin one), so the timeline above it never moves. "Start" trims the head. */
  function lengthRow(R, id) {
    const S = FM.spine, w = W(), l = FM.layerById(FM.scene, id), fps = FM.scene.project.fps || 30;
    const row = [];
    const back = tool({ id: 'lenBack', label: w.done || 'Done', icon: 'back', run: () => { lengthFor = null; lastSig = ''; FM.simpleTools.sync(); } });
    const which = tool({ id: 'lenEdge', label: lengthEdge === 'end' ? (w.lenEnd || 'End') : (w.lenStart || 'Start'), icon: 'length', pressed: lengthEdge === 'start', run: () => { lengthEdge = lengthEdge === 'end' ? 'start' : 'end'; lastSig = ''; FM.simpleTools.sync(); } });
    const step = sign => tool({ id: sign < 0 ? 'lenMinus' : 'lenPlus', label: sign < 0 ? (w.minusFrame || '−1 frame') : (w.plusFrame || '+1 frame'), icon: sign < 0 ? 'minus' : 'plus', title: sign < 0 ? (w.shorter || 'One frame shorter') : (w.longer || 'One frame longer'),
      run: () => { const L = FM.layerById(FM.scene, id); if (!L) return; if (lengthEdge === 'end') S.cmd.length(id, L.duration + sign / fps); else S.cmd.trimStartBy(id, -sign / fps); } });
    const val = el('input', 'sm-len-v'); val.type = 'text'; val.inputMode = 'decimal'; val.enterKeyHint = 'done'; val.value = l ? l.duration.toFixed(2) : '';
    val.setAttribute('aria-label', w.lengthLabel || 'Length in seconds');
    /* ONE commit for Enter and for leaving the field (review finding 21): the iPhone's decimal pad has no Return, so its Done
       or a tap elsewhere — a blur, which fires change — is the only way he can send a typed length. Each value is sent once
       (Enter blurs, and the blur's change must not send it again should the edit still be in flight), and a value equal to
       the clip's length sends nothing (no false "Nothing more to trim"). */
    let sent = null;
    const commit = () => {
      const v = parseFloat(String(val.value).replace(',', '.')), L = FM.layerById(FM.scene, id);
      if (!isFinite(v) || !L || v === sent || Math.abs(v - L.duration) < 0.5 / fps) return;
      sent = v;
      if (lengthEdge === 'end') S.cmd.length(id, v); else S.cmd.trimStartBy(id, L.duration - v);
    };
    val.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); commit(); val.blur(); });
    val.addEventListener('change', commit);
    row.push(back, which, step(-1), val, step(1));
    return row;
  }

  function quietLine(R) {
    const clips = R.main.filter(e => !e.slot), sum = (FM.spineWords && FM.spineWords.summary) ? FM.spineWords.summary(clips.length, R.trackEnd || 0) : '';
    const p = el('div', 'sm-quiet', sum);
    return p;
  }

  /* ═══ Simple's ⋯ and the Sound tool's choices: a small list above the button, one ≥ 44 px row per choice. ═══ */
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  function openMenu(anchor, items) {
    closeMenu();
    menu = el('div', 'sm-menu'); menu.setAttribute('role', 'menu');
    items.forEach(it => { const b = el('button', 'sm-menu-i', it.label); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.addEventListener('click', e => { e.stopPropagation(); closeMenu(); it.run(); }); menu.appendChild(b); });
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect(), mr = menu.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - mr.width - 8, r.left));
    const top = r.top - mr.height - 6 >= 8 ? r.top - mr.height - 6 : r.bottom + 6;
    menu.style.left = left + 'px'; menu.style.top = top + 'px';
    const first = menu.querySelector('button'); if (first) first.focus({ preventScroll: true });
  }
  function optsMenu(btn) {
    const S = FM.spine, R = S.read(FM.scene), w = W();
    const anyGap = R.main.some(e => e.seam && !e.seam.covered && (e.seam.kind === 'gap' || e.seam.kind === 'overlap'));
    const items = [];
    if (anyGap) items.push({ label: w.closeAll || 'Close all gaps', run: () => S.cmd.closeAll() });
    items.push({ label: w.moreOpts || 'Loop and preview speed…', run: () => { const o = document.getElementById('btn-opts'); if (o && FM.editor) { FM._smOptsPass = true; o.click(); FM._smOptsPass = false; } } });
    openMenu(btn, items);
  }

  FM.simpleTools = {
    /* Called by the Simple timeline's rebuild and by syncSelectionChrome: re-draws the tray only when what it shows changed */
    sync() {
      if (!mount()) return;
      place();
      if (!isSimple()) { closeMenu(); return; }
      const S = FM.spine, R = (FM.simpleTimeline && FM.simpleTimeline.read && FM.simpleTimeline.read()) || S.read(FM.scene);
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      /* §3.12 rule 1b: a line dismisses on a selection change, so the new selection's tools are never hidden behind it */
      const selKey = ids.join(',');
      if (selKey !== lastSel) { if (lastSel !== null && FM.simpleTimeline && FM.simpleTimeline.clearSay) FM.simpleTimeline.clearSay(); lastSel = selKey; }
      if (panelFor && (ids.length !== 1 || ids[0] !== panelFor)) panelFor = null;
      if (lengthFor && (ids.length !== 1 || ids[0] !== lengthFor || !R.isMain(lengthFor))) lengthFor = null;
      const one = ids.length === 1 ? ids[0] : null, l = one && FM.layerById(FM.scene, one);
      const sig = [ids.join(','), lengthFor, lengthEdge, panelFor, l ? [l.start, l.duration, l.locked, JSON.stringify(l.sm || null)].join('|') : '', R.main.map(e => e.id + (e.seam ? e.seam.kind : '')).join(','), R.trackEnd].join('#');
      if (sig === lastSig) return;
      lastSig = sig;
      tray.textContent = '';
      tray.classList.toggle('sm-tray-len', !!lengthFor);
      if (lengthFor) { lengthRow(R, lengthFor).forEach(n => tray.appendChild(n.nodeType ? n : tool(n))); return; }
      if (!ids.length) { tray.appendChild(quietLine(R)); return; }
      if (ids.length > 1) {   // §8.5b: the intersection — Stay put on all, Delete (one main clip at a time in 2.2)
        const w = W();
        tray.appendChild(el('div', 'sm-quiet', (w.selected || (n => n + ' selected'))(ids.length)));
        const all = ids.every(id => !R.isMain(id));
        if (all) tray.appendChild(tool({ id: 'stay', label: w.stay || 'Stay put', icon: 'pin', run: () => S.cmd.stayMany(ids, true) }));   // ONE step for all of them (§3.2 rule 2)
        tray.appendChild(tool({ id: 'delete', label: w.delete || 'Delete', icon: 'delete', pin: true, run: () => { if (all) { if (FM.deleteSelected) FM.deleteSelected(); } else S.say((FM.spineWords.lines || {}).deleteOne || 'Delete one clip at a time'); } }));
        return;
      }
      /* More and 🗑 share ONE sticky end (review finding 22): More is the only way to every other setting, and with 8 tools at
         ~54 px it sat past the 307 px band at 1280, or under 🗑 at 380, where a mouse could never reach it */
      const pins = el('div', 'sm-pins');
      trayFor(R, one).forEach(t => (t.id === 'more' || t.pin ? pins : tray).appendChild(tool(t)));
      if (pins.firstChild) tray.appendChild(pins);
    },
    /* "More": today's panel for the selection, docked under the tray (phone) or in the band above it (PC) */
    openPanel(id) { panelFor = id; lastSig = ''; if (FM.mobile && FM.mobile.unlatch) FM.mobile.unlatch(); FM.refreshAll(); },   // a closed sheet comes back (finding 20)
    closePanel() { if (!panelFor) return; panelFor = null; lastSig = ''; FM.refreshAll(); },
    openLength(id) { lengthFor = id; lengthEdge = 'end'; lastSig = ''; this.sync(); },
    panelFor: () => panelFor,
    /* js/mobile.js asks before raising the sheet for a selection; js/inspector.js before drawing the band */
    sheetHeld(id) { return isSimple() && panelFor !== id; },
    bandIdle(layer) { return isSimple() && !(layer && panelFor === layer.id); },
    _reset() { panelFor = null; lengthFor = null; lastSig = ''; closeMenu(); },   // suite seam
    _menu: () => menu,
    ICON: ICON
  };
})(window.FM);
