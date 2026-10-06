/* FreeMotion — FM.simpleTools: the Simple editor's two rows (Simple mode Phase 2, DESIGN.md §8.2, §8.3, §8.5; his D10).
 *
 * THE TRAY ROW (#sm-tray, inside #sm-say): the selected item's tools; with nothing selected, one quiet line ("4 clips ·
 * 0:15"). #sm-say's lines take the same 52 px row for a moment (§3.12), so nothing appears, disappears or moves. On PC a
 * tray of more than five tools lies on TWO such rows (his pick B, 6 Oct; one again while More's panel is open), and a line
 * takes the top one.
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
  let fills = 0, lastPress = null;   // how many times the tray was refilled; the tool a pointer's last single click pressed
  let roomy = false;                 // PC, and the band is tall enough for the tray's two rows (roomForTwo)
  /* TWO ROWS NEED A BAND THAT HOLDS THEM: its title (33), both rows (104), the project tools (57) and one whole line of words
     above them — 232 px, the band's own floor at every PC size (styles.css --tl-h). The divider drags it down to 150 and the
     height is remembered (fm_tl_h), and two rows there pushed the project tools out of the band: a lower band keeps one row. */
  function roomForTwo() {
    if (phone.matches) return false;
    const band = document.getElementById('inspector-panel');
    return !!band && band.getBoundingClientRect().height >= 231.5;
  }
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
    /* a held second row goes when the line does (rows() below) */
    if (sayEl && window.MutationObserver) new MutationObserver(fitRows).observe(sayEl, { attributes: true, attributeFilter: ['class'] });
    /* …and the rows follow the band's height: a window resize, or the divider's drag (it writes --tl-h on <html>) */
    const reroom = () => {
      if (!bar || !isSimple() || !FM.selectionIds || FM.selectionIds().length !== 1) return;   // only one item's tools ever take two rows
      if (roomForTwo() !== roomy) { lastSig = ''; FM.simpleTools.sync(); }
    };
    window.addEventListener('resize', reroom);
    if (window.MutationObserver) new MutationObserver(reroom).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    buildTools();
    /* Simple's ⋯ (§8.2): Close all gaps when there is one, then everything else in Full's own ⋯ strip. Capture phase, and
       only while Simple is on screen, so Full's ⋯ is exactly today's. */
    const opts = document.getElementById('btn-opts');
    if (opts) opts.addEventListener('click', e => {
      if (!isSimple() || FM._smOptsPass) return;
      /* the lit ⋯ shuts the Loop / preview speed strip it opened, as in Full (review finding 28): the tap goes to Full's toggle */
      const ob = document.getElementById('opt-bar');
      if (ob && FM.sideBarOpen && FM.sideBarOpen(ob)) { closeMenu(); return; }
      e.stopImmediatePropagation(); e.preventDefault(); optsMenu(opts);
    }, true);
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
    /* the accessible name STARTS with the words on the face (WCAG 2.5.3 Label in Name, review finding 30): "Into row, Put in the
       clip row", so Voice Control's "tap Into row" finds it; a full name that already contains the face word is kept as is */
    const face = String(t.label || ''), full = String(t.title || '');
    b.title = full || face;
    b.setAttribute('aria-label', !full ? face : full.toLowerCase().indexOf(face.toLowerCase()) >= 0 ? full : face + ', ' + full);
    if (t.pressed != null) b.setAttribute('aria-pressed', t.pressed ? 'true' : 'false');
    if (t.disabled) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', e => {
      e.stopPropagation();
      /* THE SECOND CLICK OF A DOUBLE CLICK NEVER PRESSES A TOOL THAT TOOK THE FIRST ONE'S PLACE (his pick B). On PC the tray
         changes shape under a press — More opens a panel and the tray goes to one row, Done gives the two rows back — and the
         second click came down on whatever had moved under the pointer: Move later where More was, Crop where Done was. The
         same tool pressed twice (Move later, +1 frame) still counts twice. A pointer's click count only (keyboard: 0). */
      if (e.detail >= 2 && lastPress && lastPress.fill !== fills && lastPress.id !== t.id) return;
      if (e.detail >= 1) lastPress = { id: t.id, fill: fills };
      if (b.getAttribute('aria-disabled') === 'true') { if (t.why && FM.spine) FM.spine.say(t.why); return; }
      closeMenu(); t.run(b);
    });
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
    /* THE LIST OWNS ITS KEYS (review finding 26; the pattern of js/contextmenu.js's role=menu): ↑/↓/Home/End move between
       choices, Esc closes it and gives focus back to the button that opened it, and Space / Enter / Backspace / Delete stay
       with the focused choice. Without this they reached Full's window handler: ↓ nudged the selected clip's picture a
       pixel (a hidden canvas edit), Backspace deleted the clip, Esc deselected it and left the list open. Letter
       shortcuts (A / S / D, ⌘Z) still reach the app. */
    menu.addEventListener('keydown', e => {
      const its = Array.from(menu.querySelectorAll('.sm-menu-i')), i = its.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); if (anchor && anchor.isConnected) anchor.focus({ preventScroll: true }); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault(); e.stopPropagation();
        const n = e.key === 'Home' ? 0 : e.key === 'End' ? its.length - 1 : e.key === 'ArrowDown' ? (i + 1) % its.length : (i - 1 + its.length) % its.length;
        if (its[n]) its[n].focus({ preventScroll: true });
        return;
      }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation();
    });
    /* …and their keyups: Full's arrow keyup commits a pending nudge, which is not the list's to commit */
    menu.addEventListener('keyup', e => { if (/^(Arrow|Home$|End$|Escape$|Enter$| $|Backspace$|Delete$)/.test(e.key)) e.stopPropagation(); });
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

  /* What the tray holds; true when it lies on two rows */
  function fillTray(R, ids, one, S) {
    if (lengthFor) { lengthRow(R, lengthFor).forEach(n => tray.appendChild(n.nodeType ? n : tool(n))); return false; }
    if (!ids.length) { tray.appendChild(quietLine(R)); return false; }
    if (ids.length > 1) {   // §8.5b: the intersection — Stay put on all, Delete (one main clip at a time in 2.2)
      const w = W();
      tray.appendChild(el('div', 'sm-quiet', (w.selected || (n => n + ' selected'))(ids.length)));
      const all = ids.every(id => !R.isMain(id));
      if (all) tray.appendChild(tool({ id: 'stay', label: w.stay || 'Stay put', icon: 'pin', run: () => S.cmd.stayMany(ids, true) }));   // ONE step for all of them (§3.2 rule 2)
      tray.appendChild(tool({ id: 'delete', label: w.delete || 'Delete', icon: 'delete', pin: true, run: () => { if (all) { if (FM.deleteSelected) FM.deleteSelected(); } else S.say((FM.spineWords.lines || {}).deleteOne || 'Delete one clip at a time'); } }));
      return false;
    }
    const list = trayFor(R, one);
    /* PC, HIS PICK B (6 Oct, "do reconmended"; tools/design/plans/simple-mode/p22-review-shots/sheet-tray-pc.jpg): more than
       five tools lay out on TWO rows of ceil(n/2), every one on show. At 1280 a clip's nine are ~530 px of buttons in a ~306 px
       band, and in one row Lift off, Duplicate, Crop and Close gap sat off the edge with nothing showing they were there. More
       and 🗑 take the last two places of the second row (styles.css). The phone keeps its one row and its pinned end.
       WHILE MORE'S PANEL IS OPEN the tray is today's one row (More and 🗑 pinned, the rest a scroll or a wheel away): the panel
       docks in the band above the tray (D20 A), and two rows left it 36 px at 1280×720 and 44 at 1280×800, under one row of its
       own buttons. One row gives it back the room it has always had (88 / 96 px). */
    if (roomy && list.length > 5 && panelFor !== one) {
      tray.style.setProperty('--sm-cols', String(Math.ceil(list.length / 2)));
      list.forEach(t => tray.appendChild(tool(t)));
      return true;
    }
    /* More and 🗑 share ONE sticky end (review finding 22): More is the only way to every other setting, and with 8 tools at
       ~54 px it sat past the 307 px band at 1280, or under 🗑 at 380, where a mouse could never reach it */
    const pins = el('div', 'sm-pins');
    list.forEach(t => (t.id === 'more' || t.pin ? pins : tray).appendChild(tool(t)));
    if (pins.firstChild) tray.appendChild(pins);
    return false;
  }
  /* THE BAND'S HEIGHT FOLLOWS THE TRAY'S ROWS (his pick B): #sm-say is two rows tall only while the tray holds two — but it
     never drops to one under a line being said, nor just before one. A command that takes the selection away (Delete) refills
     the tray to the one-row quiet line and THEN says its line with Undo (js/spine-edit.js speakDone, same task); a band that
     dropped a row there would put that Undo in the row where 🗑 was pressed (finding 23's hazard). So the drop waits a
     microtask, and while a line shows it waits for the line to go (the observer in mount). */
  function rows(two) {
    tray.classList.toggle('sm-tray-2', two);
    if (!two) tray.style.removeProperty('--sm-cols');
    if (!sayEl) return;
    if (two) sayEl.classList.add('sm-two');
    else if (sayEl.classList.contains('sm-two')) Promise.resolve().then(fitRows);
  }
  function fitRows() {
    if (sayEl && sayEl.classList.contains('sm-two') && !tray.classList.contains('sm-tray-2') && !sayEl.classList.contains('sm-saying')) sayEl.classList.remove('sm-two');
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
      roomy = !!one && roomForTwo();   // measured only for one item, the only tray that can take two rows
      const sig = [ids.join(','), lengthFor, lengthEdge, panelFor, roomy, l ? [l.start, l.duration, l.locked, JSON.stringify(l.sm || null)].join('|') : '', R.main.map(e => e.id + (e.seam ? e.seam.kind : '')).join(','), R.trackEnd].join('#');
      if (sig === lastSig) return;
      lastSig = sig;
      /* THE PRESSED TOOL KEEPS FOCUS (§3.12 1a, §8.10 item 6; review finding 27): a press that changes the clip rebuilds the
         row, and focus fell to <body> with the button it was on, so a second Enter on Move later or +1 frame did nothing.
         Restored only when focus was already in the tray, so a tap on the timeline never pulls focus here. */
      const ae = document.activeElement, hadFocus = !!(ae && ae !== tray && tray.contains(ae));
      const focusKey = hadFocus ? ((ae.dataset && ae.dataset.tool) || (ae.classList.contains('sm-len-v') ? '#len' : '')) : '';
      FM.simpleTools._fill(R, ids, one, S);
      if (hadFocus) {
        const want = focusKey === 'lenBack' ? 'length' : focusKey;   // Done goes back to the Length that opened the row
        const n = (want === '#len' ? tray.querySelector('.sm-len-v') : want && tray.querySelector('[data-tool="' + want + '"]')) || tray.querySelector('button, input');
        if (n) n.focus({ preventScroll: true });
      }
    },
    _fill(R, ids, one, S) {
      fills++;
      tray.textContent = '';
      tray.classList.toggle('sm-tray-len', !!lengthFor);
      let two = false;
      try { two = fillTray(R, ids, one, S); } finally { rows(two); }
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
