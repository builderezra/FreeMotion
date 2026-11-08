/* FreeMotion — FM.simpleTools: the Simple editor's two rows (Simple mode Phase 2, DESIGN.md §8.2, §8.3, §8.5; his D10).
 *
 * THE TRAY ROW (#sm-tray, inside #sm-say): the selected item's tools; with nothing selected, one quiet line ("4 clips ·
 * 0:15"), or once per device the first-run hint in its place (§7.3 step 4). #sm-say's lines take the same 52 px row for a
 * moment (§3.12), so nothing appears, disappears or moves. On PC a tray of more than five tools lies on TWO such rows (his
 * pick B, 6 Oct; one again while More's panel is open, with More turned into Done and a › cue, 8 Nov), and a line takes the top one.
 * THE PROJECT TOOLS ROW (#sm-tools): Clips · Text · Sound · Overlay — it never goes away (D10 A). Phase 3 adds Captions,
 * Look for all, Effects and Ask to the same row (and Add effect to a title's and an overlay's tray).
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
    back: '<path d="M15 5l-7 7 7 7"/>',
    speed: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="M12 17l4-5.5"/><circle cx="12" cy="17" r="1.1" fill="currentColor"/>',
    volume: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.7a4.5 4.5 0 0 1 0 6.6M18.5 6a8.5 8.5 0 0 1 0 12"/>',
    replace: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    reverse: '<path d="M11 6l-7 6 7 6zM20 6l-7 6 7 6z"/>',
    soundout: '<path d="M9 5L4.5 8.5H2v7h2.5L9 19z"/><path d="M13 12h8M18 9l3 3-3 3"/>',
    soundback: '<path d="M9 5L4.5 8.5H2v7h2.5L9 19z"/><path d="M21 12h-8M16 9l-3 3 3 3"/>',
    /* 2.7: Turn into a transition */
    transition: '<rect x="3.5" y="6" width="10" height="12" rx="1.5"/><rect x="10.5" y="6" width="10" height="12" rx="1.5" stroke-dasharray="2.4 2"/>',
    fade: '<path d="M3.5 18.5L20.5 5.5M3.5 18.5V8M7 18.5v-5M10.5 18.5v-3M14 18.5v-1"/>',
    mute: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M16 9.5l4.5 5M20.5 9.5l-4.5 5"/>',
    /* Phase 3 · Look: the D16 A set's Look (tools/design/plans/simple-mode/vis/kit.js), and the strip's None */
    look: '<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8a8.2 8.2 0 0 1 0 16.4z" fill="currentColor" stroke="none"/>',
    none: '<circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/>',
    /* Phase 3 · Captions: the D16 A set's drawings (tools/design/plans/simple-mode/vis/kit.js ICONS, VIS.ITEM_TRAYS.captions) */
    captions: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 11h4M13 11h4M7 15h6M15 15h2"/>',
    findspeech: '<path d="M3 12h1.5M6 9v6M9 6.5v11M12 9.5v5"/><circle cx="17" cy="12.5" r="3.5"/><path d="M19.6 15.1L22 17.5"/>',
    editlines: '<path d="M4 7h11M4 12h8M4 17h5"/><path d="M13 19.5l.8-3.3 5.7-5.7 2.5 2.5-5.7 5.7z"/>',
    style: '<path d="M3.5 18l4.5-12 4.5 12M5.2 13.5h5.6"/><circle cx="17.5" cy="15" r="3"/><path d="M20.5 11.5V18"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    /* Phase 3 · Effect segments: the D16 A set's Effects, Change effect and Strength (tools/design/plans/simple-mode/vis/kit.js) */
    effects: '<path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    change: '<path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5"/>',
    strength: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'
  };
  const svg = n => '<svg viewBox="0 0 24 24" class="sm-ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[n] || ICON.more) + '</svg>';
  const W = () => (FM.spineWords && FM.spineWords.tools) || {};
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  let bar = null, sayEl = null, tray = null, tools = null, menu = null;
  let panelFor = null, lastSig = '', lastSel = null;
  let rowFor = null, rowLast = '';   // 2.3: the inline row open on the tray ({kind: 'speed' | 'volume' | 'fade', id}), and the tool that opened it (focus goes back there)
  let fills = 0, lastPress = null;   // how many times the tray was refilled; the tool a pointer's last single click pressed
  let roomy = false;                 // PC, and the band is tall enough for the tray's two rows (roomForTwo)
  let hintUp = false;                // 2.7: the first-run hint is in the tray row now (hintLine)
  /* Phase 3 · Look: which panel panelFor's band / sheet shows ('more' = today's panel, 'look' = Look's own), Look's open tab, a
     slider's live preview to take back ({id, pre}), and where the panel was (its strip's scroll, its own scroll, the control with
     focus) so the redraw after each step leaves it there. stripKey: the tray whose tool strip keeps its scroll across a refill. */
  let panelKind = null, lookTab = 'filters', lookDrag = null, lookSeen = '', lookLeft = 0, lookTop = 0, lookFocus = '', stripKey = '';
  /* Phase 3 · Captions: Edit lines is a third kind of panelFor's panel ('lines'); the layer it last drew and how far it was scrolled */
  let linesSeen = '', linesTop = 0;
  /* Phase 3 · Effect segments: the effects picker that owns the tray row ({id: the segment Change effect is for, or null for a new
     one; sel: the selection it was opened with — any other selection closes it}), and the Strength slider's live preview to take back */
  let fxPick = null, segDrag = null;
  /* TWO ROWS NEED A BAND THAT HOLDS THEM: its title (33), the bar's edge and project tools (1 + 57), both rows (104) and one
     whole line of words above them (#inspector's 4 px top + .sm-band-hint's 6 + 13 × 1.4 + 6, styles.css) — 230 px today.
     MEASURED FROM THE BAND'S OWN PARTS, never a fixed number (checker finding 2): it was 232, the band's CSS floor, but a
     window once shorter than 504 px leaves an inline --tl-h behind (js/app.js's resize re-clamp: 230 at 500 px) that stays
     when the window grows back, and his pick B then silently turned back into option A until a reload. The divider drags
     the band down to 150 and the height is remembered (fm_tl_h); two rows there pushed the project tools out of the band, so
     a band shorter than this keeps one row. */
  const TWO_ROWS = 104, WORDS_LINE = 6 + 13 * 1.4 + 6;
  /* 2.3: TWO ROWS HOLD AT MOST TEN TOOLS. The band is 307 px and a tool 54: five to a row. A video clip's tray is 13 tools from 2.3 (Speed, Volume,
     Replace, Reverse, Take sound out join the nine), so it goes back to ONE scrolling row there, More and 🗑 pinned, exactly as on a phone. His pick B
     holds for every tray that fits (a picture, a title, a sound, an overlay); BUILD-PLAN-PHASE2-2.3.md §A1 puts the choice back to him.
     PHASE 3, SHEET 1 QUESTION 1, PICK B (decided 6 Nov under his 21 Oct rule, "im pretty fine with ur choices then correcting later
     if i think its bad"): Simple's band is the design's wider one on a PC (styles.css, DESIGN §8.3 (1), 372-420 px), where six tools
     fit to a row, so a video clip's eleven (and a twelfth when a seam joins them) lie on two rows of six, every one on show. */
  const TWO_ROW_MAX = 12;
  function roomForTwo() {
    if (phone.matches || !bar || !sayEl) return false;
    const band = document.getElementById('inspector-panel'), insp = document.getElementById('inspector');
    if (!band || !insp || bar.parentNode !== band) return false;
    const hgt = n => n.getBoundingClientRect().height;
    let need = hgt(bar) - hgt(sayEl) + TWO_ROWS + (parseFloat(getComputedStyle(insp).paddingTop) || 0) + WORDS_LINE;
    for (const c of band.children) if (c !== bar && c !== insp && getComputedStyle(c).position !== 'absolute') need += hgt(c);   // the title row
    return hgt(band) >= Math.ceil(need - 0.01);
  }
  const isSimple = () => !!(FM.editor && FM.editor.isSimple && FM.editor.isSimple());
  const trExtras = () => !!(FM.spine && FM.spine.trExtras && FM.spine.trExtras());   // 2.7: More transition controls (js/spine.js, #545)
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
  /* …and back HOME — after #sm-scroll in #sm-timeline, where index.html puts it — whenever Simple is not on screen (the PM's
     merge-day note, 7 Oct). On a PC place() parks it at the bottom of Full's #inspector-panel, and nothing moved it back: after
     one Simple visit Full's band kept a Simple element as its last child (hidden by CSS, but in Full's DOM — what the
     Full-unchanged lock exists to refuse). Leaving Simple now sends it home. */
  function home() {
    if (!bar) return;
    const host = document.getElementById('sm-timeline'), sc = document.getElementById('sm-scroll');
    if (host && (bar.parentNode !== host || bar.previousElementSibling !== sc)) host.insertBefore(bar, sc ? sc.nextSibling : host.firstChild);
  }
  function mount() {
    if (bar) return true;
    bar = document.getElementById('sm-bar'); sayEl = document.getElementById('sm-say');
    tray = document.getElementById('sm-tray'); tools = document.getElementById('sm-tools');
    if (!bar || !tray || !tools) { bar = null; return false; }
    if (phone.addEventListener) phone.addEventListener('change', () => { lastSig = ''; FM.simpleTools.sync(); });   // sync places it, or sends it home
    if (FM.editor && FM.editor.onChange) FM.editor.onChange(m => {
      if (m !== 'simple') { home(); hintUp = false; splitMark(false); fxPick = null; segUndrag(); extrasOpen = false; extrasSheetOff(); growTo(false); }   // nothing else runs sync() in Full (Phase 3 · Effect segments: the picker closes, a Strength preview is taken back; · Clips › Extras: it closes)
      /* …AND THE LEFT PANEL IS REDRAWN FOR THE EDITOR NOW ON SCREEN (queue 980, verify high-inspector). Nothing on the switch
         path redrew #inspector, so Full kept Simple's band words ("Tap a clip to see its tools") in place of its Add menu or
         layer editor, and a phone's sheet stayed shut, until the selection changed; entering Simple kept Full's Add menu
         under Simple's rows the same way. The inspector's own refresh, then the title refreshAll gives it (syncTopBar), so
         the panel is exactly what that editor draws. Runs only on a switch, so Full that never saw Simple is untouched. */
      if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
      if (FM.syncTopBar) FM.syncTopBar();
      if (FM.updateReadout) FM.updateReadout();   // 2.7 (SU1 #14): the pill's words follow the editor (Simple's 0:03 / 0:12, Full's 00:03:12)
    });
    /* 2.7 (SU1 #16): Simple's phone stage is taller while no sheet is up (styles.css), and nothing re-measures the preview when only the
       stage changes size (js/app.js, stageResized). So when that room flips while Simple is on screen — More's panel up or down, or Simple
       arriving — the preview and the selection box are re-fitted. Leaving Simple calls nothing, so Full is today's. */
    const roomyNow = () => document.body.classList.contains('ed-simple') && !document.body.classList.contains('insp-open');
    let roomyStage = roomyNow();
    if (window.MutationObserver) new MutationObserver(recs => {
      /* 7B: a drag of either band handle while it is grown (js/app.js sets these classes for the drag's life) — only then can a
         different height be his; without one, a changed --tl-h is the window's re-clamp of ours (growTo, below). The old values
         too: a drag that starts and ends in one task has taken its class off again before this runs. */
      const drag = /(^|\s)(tl|am)-resizing(\s|$)/;
      if (grow && (drag.test(document.body.className) || recs.some(r => drag.test(r.oldValue || '')))) grow.touched = true;
      const now = roomyNow();
      if (now === roomyStage) return;
      roomyStage = now;
      if (!document.body.classList.contains('ed-simple')) return;
      requestAnimationFrame(() => {
        if (FM.refreshPreviewScale) FM.refreshPreviewScale();
        if (FM.canvasEdit && FM.canvasEdit.stageResized) FM.canvasEdit.stageResized();
      });
    }).observe(document.body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    /* a held second row goes when the line does (rows() below) */
    if (sayEl && window.MutationObserver) new MutationObserver(fitRows).observe(sayEl, { attributes: true, attributeFilter: ['class'] });
    /* …and the rows follow the band's height: a window resize, or the divider's drag (it writes --tl-h on <html>) */
    const reroom = () => {
      if (!bar || !isSimple() || !FM.selectionIds || FM.selectionIds().length !== 1) return;   // only one item's tools ever take two rows
      if (roomForTwo() !== roomy) { lastSig = ''; FM.simpleTools.sync(); }
    };
    window.addEventListener('resize', reroom);
    if (window.MutationObserver) new MutationObserver(reroom).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    /* 2.7 (#545): More transition controls flipped in Settings while Simple is on screen: the ◇s and an open Transition row are drawn
       again at once (the tray's signature carries the switch too). Any other setting changing does nothing here. */
    if (FM.settings && FM.settings.onChange) {
      let ex = trExtras();
      FM.settings.onChange(() => {
        const now = trExtras();
        if (now === ex) return;
        ex = now; lastSig = '';
        if (isSimple() && FM.simpleTimeline && FM.simpleTimeline.rebuild) FM.simpleTimeline.rebuild();
      });
    }
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
    /* 2.7 (SU1 #13): the first-run hint goes on the first tap anywhere, and only then is it remembered (hintLine) */
    window.addEventListener('pointerdown', () => { if (hintUp && isSimple()) dismissHint(); }, true);
    /* 2.7 (SU1 #20, his "2A" 14 Oct): SIMPLE'S EXPORT IS ONE SHORT LIST, not Full's dialog (120 fps, Custom, "Export just this layer",
       the loop region). Capture phase on the button both editors share (the phone's ⬆ clicks it), only while Simple is on screen, as
       Simple's ⋯ does. Pressed again it closes the list, as Full's button closes its dialog (queue 925): the outside-tap close above runs
       first on a press, so the press remembers whether the list was up. */
    const xb = document.getElementById('btn-export');
    let xUpAt = 0;
    window.addEventListener('pointerdown', () => { xUpAt = (menu && menu.dataset.kind === 'export') ? Date.now() : 0; }, true);
    if (xb) xb.addEventListener('click', e => {
      if (!isSimple()) return;
      e.stopImmediatePropagation(); e.preventDefault();
      if ((menu && menu.dataset.kind === 'export') || Date.now() - xUpAt < 800) { closeMenu(); xUpAt = 0; return; }
      exportMenu(['m-export', 'btn-export'].map(id => document.getElementById(id)).find(b => b && b.getClientRects().length) || xb);
    }, true);
    /* A PLAIN MOUSE WHEEL SCROLLS THE TRAY SIDEWAYS (review finding 22, his #976: "on pc without trackpad there seems to be no
       way to slide"). Only a vertical wheel over a tray that overflows, and only while it can still move; a trackpad's own
       sideways swipe and a finger are left to the browser. Since SU1 #15 a one-row tray scrolls in its tool strip (.sm-run),
       not the tray, so the wheel moves whichever of the two is the scroller. */
    tray.addEventListener('wheel', e => {
      if (!e.deltaY || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const sc = scroller(), max = sc.scrollWidth - sc.clientWidth; if (max <= 0) return;
      const to = Math.max(0, Math.min(max, sc.scrollLeft + e.deltaY));
      if (to === sc.scrollLeft) return;
      e.preventDefault(); sc.scrollLeft = to;
    }, { passive: false });
    /* Phase 3 · Look: the panel is drawn again after every step it takes, so it remembers which of its controls had focus and how
       far it was scrolled. These only note things, and only for Look's own controls (data-look); nothing here acts in Full. */
    const insp = document.getElementById('inspector');
    if (insp) {
      insp.addEventListener('focusin', e => { if (!isSimple()) return; const t = e.target; lookFocus = (t && t.dataset && t.dataset.look) || ''; });
      insp.addEventListener('scroll', () => { if (isSimple() && panelKind === 'look' && insp.querySelector(':scope > .sm-look')) lookTop = insp.scrollTop; }, { passive: true });
      document.addEventListener('pointerdown', e => { if (lookFocus && !insp.contains(e.target)) lookFocus = ''; }, true);
    }
    return true;
  }
  function tool(t) {
    const b = el('button', 'sm-tool' + (t.pin ? ' sm-pin' : ''));
    b.type = 'button'; b.dataset.tool = t.id;
    b.innerHTML = t.icon === null ? '' : svg(t.icon);                 // a fixed string, never user data (null: a text-only tool, a speed preset)
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
         same tool pressed twice (Move later, +1 frame) still counts twice. A pointer's click count only (keyboard: 0).
         "Same tool" is what the button DOES (t.key), not only its data-tool: the seam tool keeps the id 'seam' while it turns
         from Close gap (the gap before the clip) into Fix (the overlap after it), and a double click on Close gap pressed that
         Fix too — every seam closed, with Fix never on screen when he clicked (checker finding 1). */
      const key = t.key || t.id;
      if (e.detail >= 2 && lastPress && lastPress.fill !== fills && lastPress.key !== key) return;
      if (e.detail >= 1) lastPress = { key: key, fill: fills };
      if (b.getAttribute('aria-disabled') === 'true') { if (t.why && FM.spine) FM.spine.say(t.why); return; }
      closeMenu(); t.run(b, e);
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
  /* Phase 3 · CAPTIONS (DESIGN §8.5 "Type captions · Find speech · Style"): a small list like Sound's. Type captions adds a line at the
     playhead and opens the text editor on it; Find speech listens to the selected clip or sound when it has sound (read now, at the tap),
     else to the clips; Style, once there is a caption track, opens today's panel for the one under the playhead (else the first). */
  function captionsTool(b) {
    const w = W(), S = FM.spine, sel = FM.selectionIds ? FM.selectionIds() : [], from = sel.length === 1 ? sel[0] : null;
    const isTrack = l => !!l && l.type === 'text' && Array.isArray(l.captions);
    const T = S.captionTrackAt(FM.time || 0) || FM.scene.layers.find(isTrack) || null;
    const items = [
      { label: w.typeCaptions || 'Type captions', run: () => S.cmd.captionAdd() },
      { label: w.findSpeech || 'Find speech', run: () => S.cmd.findSpeech({ from: from }) }
    ];
    if (T) items.push({ label: w.capStyle || 'Style', run: () => { FM.selectLayer(T.id); FM.simpleTools.openPanel(T.id); } });
    openMenu(b, items);
    if (menu) menu.setAttribute('aria-label', w.captions || 'Captions');
  }
  function buildTools() {
    const w = W();
    tools.textContent = '';
    /* Phase 3 · Clips › Extras: Clips opens a short list, Add clips (what Clips did until now) and Extras (DESIGN §8.5, D21 A) */
    [{ id: 'clips', label: w.clips || 'Clips', icon: 'clips', title: w.clipsTitle, run: b => clipsMenu(b) },
     { id: 'text', label: w.text || 'Text', icon: 'text', run: () => FM.spine.cmd.addText() },
     /* Phase 3 · Captions, in the design's order (§8.5) */
     { id: 'captions', label: w.captions || 'Captions', icon: 'captions', title: w.captionsTitle, run: captionsTool },
     { id: 'sound', label: w.sound || 'Sound', icon: 'music', run: soundTool },
     { id: 'overlay', label: w.overlay || 'Overlay', icon: 'overlay', run: () => pick('video/*,image/*', true, f => FM.spine.cmd.addOverlay(f)) },
     /* Phase 3 · Effect segments (§8.5, §8.5c item 2): a new whole-frame segment at the playhead, picked first in the tray row */
     { id: 'effects', label: w.effects || 'Effects', icon: 'effects', title: w.effectsTitle, run: () => FM.simpleTools.openEffects(null) }
    ].forEach(t => tools.appendChild(tool(t)));
  }

  /* ═══ THE TRAY (§8.5): the selected item's tools, the tools that define its kind first, 🗑 pinned at the right end. ═══ */
  function trayFor(R, id) {
    const S = FM.spine, w = W(), l = FM.layerById(FM.scene, id), u = R.units[id];
    if (!l) return [];
    /* review #4: an item goes through S.cmd.deleteItems, which is Full's own delete unless it would empty an inserted element's group */
    const del = { id: 'delete', label: w.delete || 'Delete', icon: 'delete', pin: true, run: () => { if (R.isMain(id)) S.cmd.del(id); else if (S.cmd.deleteItems) S.cmd.deleteItems([id]); else if (FM.deleteLayer) FM.deleteLayer(id); } };
    const stayOn = !!(l.sm && l.sm.stay);
    const withW = withWords(R, id);   // Phase 3 · Clips › Extras: a layer that moves with the rest of its element says so, in Stay put's name too
    const stay = { id: 'stay', label: w.stay || 'Stay put', icon: 'pin', title: withW ? (w.stay || 'Stay put') + ' · ' + withW : undefined, pressed: stayOn, run: () => S.cmd.stay(id, !stayOn) };
    const more = { id: 'more', label: w.more || 'More', icon: 'more', title: w.moreTitle, run: (b, e) => FM.simpleTools.togglePanel(id, e) };
    const crop = { id: 'crop', label: w.crop || 'Crop', icon: 'crop', run: () => { if (FM.cropTool && FM.cropTool.start) FM.cropTool.start(id); } };
    /* 2.3: the sound and speed tools. A video has all of them; a picture has only Replace; a sound has Volume, Fade and Speed. */
    const isVid = l.type === 'video' && !l.audioOnly && !(l.sm && l.sm.snd === true);
    const speedT = { id: 'speed', label: w.speed || 'Speed', icon: 'speed', run: () => FM.simpleTools.openRow('speed', id) };
    const volumeT = { id: 'volume', label: w.volume || 'Volume', icon: 'volume', run: () => FM.simpleTools.openRow('volume', id) };
    const fadeT = { id: 'fade', label: w.fade || 'Fade', icon: 'fade', run: () => FM.simpleTools.openRow('fade', id) };
    const replaceT = { id: 'replace', label: w.replace || 'Replace', icon: 'replace', run: () => S.cmd.pickReplace(id) };
    /* Phase 3 · Look (DESIGN §8.5): a clip's filter and Adjust, in Look's own panel where More's docks (D20 A). Pressed while open.
       After Lift off, so nothing Phase 2 placed moves and Lift off stays in the first five (T19); ❓ its place is his pick (NOTES). */
    const lookT = { id: 'look', label: w.look || 'Look', icon: 'look', title: w.lookTitle, pressed: panelFor === id && panelKind === 'look', run: (b, e) => FM.simpleTools.toggleLook(id, e) };
    /* Phase 3 · Effects on an item (DESIGN §8.5c item 3): an effect on THIS item, picked in the tray row. Its face is "Add effect", not
       the tables' "Effects": the project row's Effects (a segment over the clip) is on screen at the same time, and his #310 rule is one
       face per control on screen (NOTES). On a title and anything on top; not yet on a clip-row clip (NOTES: his pick B holds ten). */
    const addFxT = { id: 'addfx', label: w.addEffect || 'Add effect', icon: 'effects', title: w.addEffectTitle, run: () => FM.simpleTools.openItemEffects(id) };
    if (R.isMain(id)) {
      const i = R.main.findIndex(e => e.id === id), sb = R.main[i].seam, na = R.main[i + 1], sa = na && na.seam;
      const audioT = { id: 'audio', label: w.audio || 'Audio', icon: 'volume', title: w.audioTitle || 'Speed, volume, reverse and the clip’s sound', run: () => FM.simpleTools.openRow('audio', id) };
      /* Look third, right after Audio (sheet 1 question 2, pick B, 6 Nov under his 21 Oct rule): the band's hint promises speed or
         look, so Look is on screen with no swipe on a phone, beside Audio, where speed lives. Lift off moves to sixth on a video. */
      /* #1243 S24 and S25 (his words, 8 Nov): "I do not think we need a move earlier, move later button… people pick it up and drag it…
         people are going to accidentally press it", and "you also don't need a length button… if you want to change the length, you just
         grab the end and drag it". So the tray no longer has Length, Move earlier or Move later: a hold-and-drag reorders, the grips trim
         (a clip too short for them gets them outside its edges, simple-timeline.js drawGrips), and the keyboard keeps Alt+←/→ and A/D
         (editor-mode.js) for anyone who cannot drag. */
      const out = [
        ...(isVid ? [audioT] : []),
        ...(l.type === 'video' || l.type === 'image' ? [lookT] : []),
        { id: 'lift', label: w.lift || 'Lift off', icon: 'lift', title: w.liftTitle, run: () => S.cmd.lift(id) },
        { id: 'duplicateClip', label: w.duplicate || 'Duplicate', icon: 'duplicate', run: () => S.cmd.duplicate(id) },
        crop,
        ...(l.type === 'video' || l.type === 'image' ? [replaceT] : [])   // after Crop: a picture's first row on two rows stays exactly as it was
      ];
      /* §8.2: a clip next to a gap or an overlap offers Close gap / Fix too (the seam chip's command) */
      /* its key names the seam it closes, so a double click never runs on into the next seam (the guard in tool()) */
      const seamTool = (e, s) => ({ id: 'seam', key: 'seam:' + e.id + ':' + s.kind, label: s.kind === 'gap' ? (w.closeGap || 'Close gap') : (w.fix || 'Fix'), icon: 'check', run: () => S.cmd.closeSeam(e.id) });
      /* 2.7 (DESIGN :522, §12.1): a clip that fades in over the one before it (a crossfade seam) offers Turn into a transition; the ◇ on
         that crossfade selects it. Only there: the Transition row itself opens from the ◇ above a join, never from this tray (pick A).
         Only with More transition controls on (S.trExtras, #545): his sheet never showed it. */
      if (sb && sb.kind === 'blend' && S.cmd.turnTransition && trExtras()) out.push({ id: 'turnTr', key: 'turnTr:' + id, label: w.turnTr || 'Turn into a transition', icon: 'transition', run: () => S.cmd.turnTransition(id) });
      if (sb && (sb.kind === 'gap' || sb.kind === 'overlap') && !sb.covered) out.push(seamTool(R.main[i], sb));
      else if (sa && (sa.kind === 'gap' || sa.kind === 'overlap') && !sa.covered) out.push(seamTool(na, sa));
      out.push(more, del);
      return out;
    }
    const k = u ? u.kind : '';
    if (k === 'text') return [{ id: 'editwords', label: w.editWords || 'Edit words', icon: 'editwords', run: () => { if (FM.textEdit && FM.textEdit.start) FM.textEdit.start(id, { selectAll: true }); } }, addFxT, stay, more, del];   // Phase 3 · Effects on an item: Add effect after Edit words (§8.5's text tray order)
    /* Phase 3 · Captions (DESIGN §8.5 caption track tray, the D16 A kit's VIS.ITEM_TRAYS.captions): Edit lines opens the lines in the
       panel's place; Style is today's panel for the track (its font, colour and plate: the role More had here); Find speech listens
       again for this track; the last two are ONE two-way choice, a pressed pair (§8.9 "Follows the clips / Stays with the sound") */
    if (k === 'captions') {
      const stays = !!(l.sm && l.sm.stay);
      return [
        { id: 'editlines', label: w.editLines || 'Edit lines', icon: 'editlines', title: w.editLinesTitle, pressed: panelFor === id && panelKind === 'lines', run: (b, e) => FM.simpleTools.toggleLines(id, e) },
        { id: 'capstyle', label: w.capStyle || 'Style', icon: 'style', title: w.capStyleTitle, run: (b, e) => FM.simpleTools.togglePanel(id, e) },
        { id: 'findspeech', label: w.findSpeech || 'Find speech', icon: 'findspeech', title: w.findSpeechTitle, run: () => S.cmd.findSpeech({ trackId: id }) },
        /* short words on a phone (sheet 1 question 3, pick B, 6 Nov under his 21 Oct rule): every tool on show with no swipe; the
           long words stay where they help, on a PC and in the accessible name (tool() keeps the title, which contains the face) */
        { id: 'capfollow', label: phone.matches ? (w.capFollowShort || 'Follows') : (w.capFollow || 'Follows the clips'), icon: 'link', title: w.capFollowTitle || w.capFollow || 'Follows the clips', pressed: !stays, run: () => { if (stays) S.cmd.captionStay(id, false); } },
        { id: 'capstay', label: phone.matches ? (w.capStayShort || 'Stays') : (w.capStay || 'Stays with the sound'), icon: 'pin', title: w.capStayTitle || w.capStay || 'Stays with the sound', pressed: stays, run: () => { if (!stays) S.cmd.captionStay(id, true); } },
        del];
    }
    /* 2.4b: the opt-in volume rider (§3.10 rule 3), offered only on a sound that stays put AND has a volume curve to carry */
    const rideT = { id: 'rideVol', label: w.rideVol || 'Follow clips', icon: 'volume', title: w.rideVolTitle || 'Keep volume changes with the clips', pressed: !!(l.sm && l.sm.rideVol), run: () => S.cmd.rideVol(id, !(l.sm && l.sm.rideVol)) };
    const hasCurve = !!(FM.isAnimated && (FM.isAnimated(l.volume) || FM.isAnimated(l.transform && l.transform.opacity)));
    if (k === 'audio') return [volumeT, fadeT, ...(l.type === 'video' ? [speedT] : []), stay, ...(stayOn && hasCurve ? [rideT] : []), more, del];
    if (k === 'effect') return segmentTray(id, l, stay, more);   // Phase 3 · Effect segments: Change effect · Strength · Stay put · More · 🗑
    if (k === 'block' || k === 'fullOnly') return [{ id: 'openFull', label: w.openFull || 'Open in Full', icon: 'editor', run: () => FM.editor && FM.editor.request('full', { hop: true }) }, del];
    if (k === 'undecided') return [];
    const inCard = !!(u && u.host && String(u.host).indexOf('slot:') === 0);   // a card between clips: no Into row until its slot form exists (§3.6)
    return [   // overlays, stickers, pictures, a background
      ...(inCard ? [] : [{ id: 'into', label: w.into || 'Into row', icon: 'drop', title: w.intoTitle, run: () => S.cmd.intoRow(id) }]),
      ...(isVid ? [volumeT, speedT] : []),
      addFxT,   /* Phase 3 · Effects on an item: after Speed, before Crop (§8.5's overlay tray order) */
      crop,
      { id: 'forward', label: w.forward || 'Forward', icon: 'forward', run: () => S.cmd.z(id, 1) },
      { id: 'backward', label: w.backward || 'Back', icon: 'backward', run: () => S.cmd.z(id, -1) },
      stay, more, del];
  }
  /* (Length's row lived here until #1243 S25 took Length off the tray: "you just grab the end and drag it". S.cmd.length and
     S.cmd.trimStartBy stay, for the grips' commands and the keyboard.) */

  /* ═══ RELEASE 2.3: SPEED, VOLUME and FADE are inline rows like Length (the row itself is the panel, so the timeline above never
     moves). Each commits ONE command on release / press; while a slider moves only the DOM and the playback rate change, so the
     scene stays exactly as it was until he lets go (and an undo has one step to go back). ═══ */
  const pct = v => Math.round(v * 100);
  const fmtX = sp => (Math.round(sp * 100) / 100) + '×';
  function rowBack() { return tool({ id: 'rowBack', label: W().done || 'Done', icon: 'back', run: () => { rowLast = rowFor ? rowFor.kind : ''; rowFor = (rowFor && rowFor.from) ? { kind: rowFor.from, id: rowFor.id } : null; lastSig = ''; FM.simpleTools.sync(); } }); }   // S9: Done from Speed or Volume opened inside Audio goes back to Audio
  function speedRow(R, id) {
    const S = FM.spine, w = W(), l = FM.layerById(FM.scene, id), out = [rowBack()];
    if (!l) return out;
    if (FM.isAnimated(l.speed)) {   // a ramp is not one speed: say so, and offer the one way out
      out.push(el('div', 'sm-quiet', w.speedRamped || 'Speed changes over the clip'));
      out.push(tool({ id: 'oneSpeed', label: w.useOneSpeed || 'Use one speed', icon: 'speed', run: () => S.cmd.useOneSpeed(id) }));
      return out;
    }
    const rg = S.speedRange(R, id) || { lo: 0.25, hi: 4 }, now = FM.speedAt(l, +l.start || 0), why = (FM.spineWords.lines || {}).speedShort;
    [0.5, 1, 1.5, 2, 3].forEach(sp => out.push(tool({ id: 'sp' + sp, label: sp + '×', icon: null, title: (w.speed || 'Speed') + ' ' + sp + '×', pressed: Math.abs(now - sp) < 1e-6, disabled: sp > rg.hi + 1e-9, why: why,
      run: () => { if (Math.abs(now - sp) > 1e-9) S.cmd.speed(id, sp); } })));
    const val = el('span', 'sm-speed-v', fmtX(now));
    const rng = el('input', 'sm-speed-r'); rng.type = 'range'; rng.min = String(rg.lo); rng.max = String(rg.hi); rng.step = '0.05';
    rng.value = String(Math.max(rg.lo, Math.min(rg.hi, now))); rng.setAttribute('aria-label', w.speedLabel || 'Speed');
    rng.addEventListener('input', () => { const sp = parseFloat(rng.value); val.textContent = fmtX(sp); if (FM.simpleTimeline && FM.simpleTimeline.previewSpeed) FM.simpleTimeline.previewSpeed(id, sp); });
    rng.addEventListener('change', () => { const sp = parseFloat(rng.value); if (FM.simpleTimeline && FM.simpleTimeline.previewSpeed) FM.simpleTimeline.previewSpeed(id, null); if (Math.abs(sp - now) > 1e-9) S.cmd.speed(id, sp); });
    out.push(rng, val);
    return out;
  }
  function volumeRow(R, id) {
    const S = FM.spine, w = W(), tid = S.soundTargetId(R, id), t = tid && FM.layerById(FM.scene, tid), out = [rowBack()];
    if (!t) return out;
    const now = (() => { const v = t.volume == null ? 1 : FM.evalProp(t.volume, FM.time); return isFinite(v) ? v : 1; })();
    const val = el('span', 'sm-vol-v', pct(now) + '%');
    const rng = el('input', 'sm-vol-r'); rng.type = 'range'; rng.min = '0'; rng.max = '200'; rng.step = '1'; rng.value = String(Math.min(200, pct(now)));
    rng.setAttribute('aria-label', w.volumeLabel || 'Volume in percent');
    rng.addEventListener('input', () => { const v = parseFloat(rng.value) / 100; val.textContent = pct(v) + '%'; const m = FM.media && FM.media.get(t.id); if (m && m.el) { try { m.el.volume = Math.min(1, v); } catch (e) {} } });
    rng.addEventListener('change', () => { const v = parseFloat(rng.value) / 100; if (Math.abs(v - now) > 0.004) S.cmd.volume(id, v); });
    out.push(rng, val);
    return out;
  }
  function fadeRow(R, id) {
    const S = FM.spine, w = W(), tid = S.soundTargetId(R, id), t = tid && FM.layerById(FM.scene, tid), out = [rowBack()];
    if (!t) return out;
    [['in', 'fadeIn', w.fadeIn || 'In'], ['out', 'fadeOut', w.fadeOut || 'Out']].forEach(f => {
      const cur = () => { const L = FM.layerById(FM.scene, tid); return L ? (+L[f[1]] || 0) : 0; };
      out.push(el('div', 'sm-quiet sm-fade-l', f[2] + ' ' + cur().toFixed(1) + ' s'));
      out.push(tool({ id: 'fade' + f[0] + 'Minus', label: '−', icon: null, title: f[2] + ': ' + (w.shorter || 'shorter'), run: () => S.cmd.fade(id, f[0], Math.max(0, cur() - 0.5)) }));
      out.push(tool({ id: 'fade' + f[0] + 'Plus', label: '+', icon: null, title: f[2] + ': ' + (w.longer || 'longer'), run: () => S.cmd.fade(id, f[0], cur() + 0.5) }));
    });
    return out;
  }
  /* OPTION E (S9, his A1 sheet): a video clip's four sound-and-time tools live in ONE row, opened by one tool, "Audio": Speed, Volume, Reverse, and Take sound out / Put sound back.
     That takes a clip's tray from 13 tools to 10, so it lays out on two rows on a PC with every tool on show, and loses nothing: each one is one tap further. Speed and Volume open
     their own rows with Done coming back HERE. */
  function audioRow(R, id) {
    const S = FM.spine, w = W(), l = FM.layerById(FM.scene, id), out = [rowBack()];
    if (!l) return out;
    out.push(tool({ id: 'speed', label: w.speed || 'Speed', icon: 'speed', run: () => FM.simpleTools.openRow('speed', id, 'audio') }));
    out.push(tool({ id: 'volume', label: w.volume || 'Volume', icon: 'volume', run: () => FM.simpleTools.openRow('volume', id, 'audio') }));
    out.push(tool({ id: 'reverse', label: w.reverse || 'Reverse', icon: 'reverse', pressed: !!l.reversed, run: () => S.cmd.reverse(id) }));
    const hasTwin = (R.followers[id] || []).some(f => S.isTwinOf(FM.layerById(FM.scene, f), l, R.eps));
    /* the sound commands make or remove a layer: the row is drawn again when they are done (the redraw during the command saw a half-done scene, and the sig only changes there), so the button that was pressed turns into its opposite where it was */
    const again = async p => { const ok = await p; if (FM.layerById(FM.scene, id)) { FM.simpleTools.openRow('audio', id); FM.refreshAll(); } return ok; };
    if (hasTwin) out.push(tool({ id: 'putSound', label: w.putSound || 'Put sound back', icon: 'soundback', run: () => again(S.cmd.putSoundBack(id)) }));
    else if (S.canTakeSound(R, id)) out.push(tool({ id: 'takeSound', label: w.takeSound || 'Take sound out', icon: 'soundout', run: () => again(S.cmd.takeSoundOut(id)) }));
    return out;
  }
  /* 2.7 THE TRANSITION ROW (#1122 clause 2, his pick A: tools/design/plans/simple-mode/transition-options/sheet.jpg on
     plans/simple-transitions): opened by the ◇ above a cut (js/simple-timeline.js), for the clip AFTER the cut. Done · None · Crossfade ·
     Dip to black · Dip to white, as on his sheet, on a phone and on a PC alike. With More transition controls on (S.trExtras, #545: his
     sheet never showed them), once one is set, its length (− and + by 0.1 s, 0.1 to 3 s) and On every cut follow. A type is pressed with
     no length, so a new transition is FM.TR_DEFAULT long and a changed one keeps its own. Each press is one command, one undo step, like
     Speed, Volume and Fade (2.3). */
  function transitionRow(R, id) {
    const S = FM.spine, w = W(), out = [rowBack()];
    if (!FM.layerById(FM.scene, id)) return out;
    const cur = () => { const L = FM.layerById(FM.scene, id); return L && L.trIn ? L.trIn : null; };
    const types = [['none', w.trNone || 'None'], ['crossfade', w.trCrossfade || 'Crossfade'], ['dipblack', w.trDipBlack || 'Dip to black'], ['dipwhite', w.trDipWhite || 'Dip to white']];
    types.forEach(t => out.push(tool({ id: 'tr-' + t[0], label: t[1], icon: null, pressed: (cur() ? cur().type : 'none') === t[0], run: () => S.cmd.transition(id, t[0]) })));
    if (cur() && trExtras()) {
      out.push(el('div', 'sm-quiet sm-fade-l', (w.trLength || 'Length') + ' ' + cur().d.toFixed(1) + ' s'));
      out.push(tool({ id: 'trMinus', label: '−', icon: null, title: w.trShorter || 'Shorter by 0.1 s', run: () => { const c = cur(); if (c) S.cmd.transition(id, c.type, c.d - 0.1); } }));
      out.push(tool({ id: 'trPlus', label: '+', icon: null, title: w.trLonger || 'Longer by 0.1 s', run: () => { const c = cur(); if (c) S.cmd.transition(id, c.type, c.d + 0.1); } }));
      out.push(tool({ id: 'trAll', label: w.trEvery || 'On every cut', icon: null, run: () => S.cmd.transitionAll(id) }));
    }
    return out;
  }
  const ROWS = { speed: speedRow, volume: volumeRow, fade: fadeRow, audio: audioRow, transition: transitionRow };

  function quietLine(R) {
    const clips = R.main.filter(e => !e.slot), sum = (FM.spineWords && FM.spineWords.summary) ? FM.spineWords.summary(clips.length, R.trackEnd || 0) : '';
    const p = el('div', 'sm-quiet', sum);
    return p;
  }
  /* 2.7 (SU1 #13, DESIGN §7.3 step 4, §8.9): THE FIRST-RUN HINT takes the quiet line's place while nothing is selected, only with
     a main clip on the track and at most once per device: the first tap anywhere takes it away and writes fm.sm.hint = '1' (the
     listener in mount). Phone or PC words by the phone test Full uses (max-width 700 px). While it shows, the play bar's ✂ wears
     the clip's own selection outline (styles.css .sm-hinted), held, not animated, and it goes with the hint. */
  const HINT_KEY = 'fm.sm.hint';
  function hintSeen() { try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return true; } }   // unreadable storage could never remember it: no hint
  function hintLine() { const w = W(); return el('div', 'sm-quiet sm-hint', phone.matches ? (w.firstHint || '') : (w.firstHintPc || '')); }
  function splitMark(on) { const sp = document.getElementById('btn-sm-split'); if (sp) sp.classList.toggle('sm-hinted', !!on); }
  /* 2.7 (2A row 16): A PANEL THAT OPENS UNDER THE FINGER IGNORES THAT FINGER. On a phone More's panel takes back the room the preview
     had under the tools, so the tray and More move up (134 px at 380x800) and the panel's grab bar and quick row land where More was:
     the second tap of a double tap on More pressed whatever lay there (a real mouse, measured: "Close inspector" at 380x667, so the
     panel opened and shut; "Trim end to playhead" at 380x800 once the panel had risen). For 450 ms after More opens the panel, a REAL
     press that lands on it does nothing, as a line's buttons ignore presses for their first 400 ms (section 3.12 rule 5). Phone,
     Simple only; script clicks (isTrusted false) are never held.
     Phase 3 (the sm3 stack, #1171): Look's panel and Edit lines open in that same place the same way, so they arm it too. */
  /* ON ONLY WHILE ARMED (sm3 review, lens 1): the listeners are non-passive window captures, and a non-passive touchstart on
     window makes Chrome hold every scroll for the main thread. Added at load they sat in Full too, so they go on when a panel
     arms the guard and come off 500 ms later: Full, and Simple between panels, carries none. */
  let sheetArmAt = -1e9, sheetOn = false, sheetOff = 0;
  const SHEET_EV = ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'touchend', 'click'];
  const SHEET_OPT = { capture: true, passive: false };
  function sheetListen(on) {
    if (on === sheetOn) return;
    sheetOn = on;
    SHEET_EV.forEach(t => { if (on) window.addEventListener(t, sheetGuard, SHEET_OPT); else window.removeEventListener(t, sheetGuard, SHEET_OPT); });
  }
  function armSheet() {
    if (!(isSimple() && phone.matches)) return;
    sheetArmAt = performance.now(); sheetListen(true);
    clearTimeout(sheetOff); sheetOff = setTimeout(() => sheetListen(false), 500);
  }
  function sheetGuard(e) {
    if (!e.isTrusted || performance.now() - sheetArmAt > 450) return;
    const s = document.getElementById('inspector-panel');
    if (s && e.target && e.target.nodeType === 1 && s.contains(e.target)) { e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); }
  }
  function dismissHint() {
    hintUp = false; splitMark(false);
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
    lastSig = ''; FM.simpleTools.sync();   // the quiet line in its place
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
    /* 2.4b (§3.6): Sort by date taken, only when at least two clips of the row carry a capture date */
    if (R.main.filter(e => !e.slot && Number.isFinite(+((FM.layerById(FM.scene, e.id) || {}).taken))).length >= 2) items.push({ label: w.sortByDate || 'Sort by date taken', run: () => S.cmd.sortByDate() });
    items.push({ label: w.moreOpts || 'Loop and preview speed…', run: () => { const o = document.getElementById('btn-opts'); if (o && FM.editor) { FM._smOptsPass = true; o.click(); FM._smOptsPass = false; } } });
    openMenu(btn, items);
  }

  /* 2.7 (SU1 #20): "1080p · Export" (and 720p when the frame is bigger than that; a smaller frame offers its own size, never an upscale):
     an MP4 at the project's frame rate and Full's default High quality, of the clips only — 0 to the end of the last clip, so the black a
     song or a title runs on into is never in the file. app.js runs it through the dialog's own gates and exporter (FM.exportSimple), and
     never saves it as the dialog's defaults. */
  function exportMenu(anchor) {
    const P = FM.scene.project || {}, w = W(), short = Math.min(+P.width || 0, +P.height || 0);
    if (!(short > 0) || !FM.exportSimple) return;
    const R = FM.spine.read(FM.scene), end = R.trackEnd > 0 ? R.trackEnd : (+P.duration || 0);
    const top = Math.min(1080, short), rungs = top > 720 ? [top, 720] : [top];
    openMenu(anchor, rungs.map(p => ({ label: w.exportAt ? w.exportAt(p) : p + 'p · Export',
      run: () => FM.exportSimple({ scale: p / short, fps: +P.fps || 30, quality: 0.18, from: 0, to: end }) })));
    if (menu) { menu.dataset.kind = 'export'; menu.setAttribute('aria-label', w.exportTitle || 'Export video'); }
  }

  /* What the tray holds; true when it lies on two rows */
  function fillTray(R, ids, one, S) {
    if (fxPick) return fxPick.on ? itemFxFill() : fxFill();   // Phase 3 · Effect segments: the effects picker owns the row while it is open (· Effects on an item: its item picker too)
    if (rowFor && rowFor.kind === 'audio' && ROWS.audio) tray.setAttribute('data-row', 'audio'); else tray.removeAttribute('data-row');   // S9: the Audio row's five buttons are 317 px at their usual padding, 10 px over the 307 px band at 1280
    if (extrasOpen && !ids.length) return extrasFill();   // Phase 3 · Clips › Extras (PC): Done in the tray row while Extras is in the band
    if (rowFor && ROWS[rowFor.kind]) { ROWS[rowFor.kind](R, rowFor.id).forEach(n => tray.appendChild(n.nodeType ? n : tool(n))); return false; }
    if (!ids.length) { hintUp = R.main.some(e => !e.slot) && !hintSeen(); tray.appendChild(hintUp ? hintLine() : quietLine(R)); return false; }
    if (ids.length > 1) {   // §8.5b: the intersection — Stay put on all, Delete (one main clip at a time in 2.2)
      const w = W();
      tray.appendChild(el('div', 'sm-quiet', (w.selected || (n => n + ' selected'))(ids.length)));
      const all = ids.every(id => !R.isMain(id));
      if (all) tray.appendChild(tool({ id: 'stay', label: w.stay || 'Stay put', icon: 'pin', run: () => S.cmd.stayMany(ids, true) }));   // ONE step for all of them (§3.2 rule 2)
      tray.appendChild(tool({ id: 'delete', label: w.delete || 'Delete', icon: 'delete', pin: true, run: () => { if (all) { if (S.cmd.deleteItems) S.cmd.deleteItems(ids, true); else if (FM.deleteSelected) FM.deleteSelected(); } else S.say((FM.spineWords.lines || {}).deleteOne || 'Delete one clip at a time'); } }));   // review #4: see trayFor's 🗑
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
    if (roomy && list.length > 5 && list.length <= TWO_ROW_MAX && panelFor !== one) {
      tray.style.setProperty('--sm-cols', String(Math.ceil(list.length / 2)));
      list.forEach(t => tray.appendChild(tool(t)));
      return true;
    }
    /* More and 🗑 share ONE pinned end (review finding 22): More is the only way to every other setting, and with 8 tools at
       ~54 px it sat past the 307 px band at 1280, or under 🗑 at 380, where a mouse could never reach it.
       THE REST SCROLL IN THEIR OWN STRIP, WITH A FADE WHERE MORE ARE HIDDEN (SU1 #15, the first-user audit at 380×800; DESIGN
       §8.5 "the row may scroll with a fade edge", never built). The pins used to be a sticky end INSIDE the scrolling tray, so
       the tools scrolled underneath them: at 380 Lift off sat half under More, Duplicate and Crop wholly under the pair, Replace
       off the screen, and nothing said there was more. Now the tools are their own scroller (.sm-run) that ENDS where the pins
       begin, so no tool is ever drawn under More or 🗑, and a fade lies over the edge where tools are hidden — the end while
       there are more to the right, the start once it is scrolled — and on neither when they all fit (edges()). The fades take
       no pointer events and sit inside the strip, never over the pins. */
    const pins = el('div', 'sm-pins'), box = el('div', 'sm-runbox'), run = el('div', 'sm-run');
    const withT = withWords(R, one); if (withT) run.appendChild(withTag(withT));   // Phase 3 · Clips › Extras: "Moves with the shape", first in the strip
    /* MORE TURNS INTO DONE WHILE ITS OWN PANEL IS OPEN ON A PC (8 Nov, queue 980: the 6 Oct ask, option 3, decided 6 Nov under his
       21 Oct rule; tools/design/plans/simple-mode/p22-review-shots/sheet-tray-more-pc.jpg). The one row above keeps the panel its
       room, but More still said More and the tools past the strip's end showed only as a fade. Now the same tool in the same place
       reads Done (its ✓ and the accent, as drawn) and closes the panel, which gives the two rows back; it keeps More's id, so focus
       and tool()'s double-click guard follow it, and the second click of a double click on More, which comes down on it, still
       closes nothing. A › sits at the strip's right end while tools lie past it, and goes with the end fade (edges()). Only More's
       own panel: Look's and Edit lines' keep today's tray, and a caption track's Style has no More to turn. Only on a PC: the
       phone's sheet stays exactly as it is. */
    const doneUp = !phone.matches && panelFor === one && panelKind === 'more' && list.some(t => t.id === 'more');
    list.forEach(t => (t.id === 'more' || t.pin ? pins : run).appendChild(doneUp && t.id === 'more' ? moreDone() : tool(t)));
    if (!run.firstChild && !pins.firstChild) return false;
    const fade = side => { const f = el('span', 'sm-fade sm-fade-' + side); f.setAttribute('aria-hidden', 'true'); return f; };
    box.append(run, fade('s'), fade('e'));
    if (doneUp) { const cue = el('span', 'sm-cue'); cue.setAttribute('aria-hidden', 'true'); cue.innerHTML = CUE; box.appendChild(cue); }   // a fixed string, never user data
    tray.appendChild(box);
    if (pins.firstChild) tray.appendChild(pins);
    run.addEventListener('scroll', () => edges(run), { passive: true });
    if (runSeen) runSeen.observe(run);   // a strip that was hidden (a line in its row) or a band that changed width
    edges(run);
    return false;
  }
  /* More's Done (8 Nov, queue 980, see fillTray): More's id and place, Done's words from the words file. A press closes the panel; the
     second click of a double click does not (that click is the one that opened it, landing again on the tool now in More's place). */
  function moreDone() {
    const w = W();
    /* its own key (the 8 Nov review): Done and More shared 'more', so tool()'s guard let a double click on Done close the panel and
       press More, which reflowed under the pointer, opening it again. Different keys, and the second click is dropped either way. */
    const b = tool({ id: 'more', key: 'moreDone', label: w.done || 'Done', icon: 'check', title: w.moreDoneTitle || 'Done · close More’s settings', run: (x, e) => { if (!(e && e.detail >= 2)) FM.simpleTools.closePanel(); } });
    b.classList.add('sm-done');
    return b;
  }
  /* …and the › at the strip's right end while tools lie past it (a fixed drawing; styles.css shows it with .sm-more-e) */
  const CUE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>';
  /* Which edges of the tool strip hide tools: a 1 px slack, as the wheel's own bound, so a fractional scroll on a phone's
     display never leaves a fade over a strip that is at its end. A strip that is not laid out (the row hidden while a line is
     said) measures 0 and shows none; the ResizeObserver puts them right when it comes back. */
  function edges(run) {
    const box = run && run.parentNode;
    if (!box || !box.classList) return;
    const max = run.scrollWidth - run.clientWidth;
    box.classList.toggle('sm-more-s', max > 1 && run.scrollLeft > 1);
    box.classList.toggle('sm-more-e', max > 1 && run.scrollLeft < max - 1);
  }
  const runSeen = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => edges(e.target))) : null;
  /* The strip that scrolls: the tool strip of a one-row tray, else the tray itself (two rows on PC, a Length or Speed row) */
  const scroller = () => (tray && tray.querySelector(':scope > .sm-runbox > .sm-run')) || tray;
  /* THE BAND'S HEIGHT FOLLOWS THE TRAY'S ROWS (his pick B): #sm-say is two rows tall only while the tray holds two — but it
     never drops to one under a line being said, nor just before one. A command that takes the selection away (Delete) refills
     the tray to the one-row quiet line and THEN says its line with Undo (js/spine-edit.js speakDone, same task); a band that
     dropped a row there would put that Undo in the row where 🗑 was pressed (finding 23's hazard). So the drop waits a
     microtask, and while a line shows it waits for the line to go (the observer in mount). */
  function rows(two) {
    tray.classList.toggle('sm-tray-2', two);
    if (!two) tray.style.removeProperty('--sm-cols');
    hintFollows();
    if (!sayEl) return;
    if (two) sayEl.classList.add('sm-two');
    else if (sayEl.classList.contains('sm-two')) Promise.resolve().then(fitRows);
  }
  /* THE BAND'S WORDS FOLLOW THE TRAY'S REAL ROWS (checker finding 3). "Its tools are below" alone is right only while every
     tool is on show on two rows; a one-row tray — a band dragged under what two rows need, a landscape phone, a title's four
     tools, Length's row — keeps today's "· More opens the rest". js/inspector.js draws the words (bandWords) and may do so
     before the tray is refilled for a new selection, and a drag flips the rows with no redraw at all, so every refill puts
     the selected-item words right. */
  function bandWords(layer) {
    const w = W();
    if (!layer) return w.bandHint || 'Tap a clip to see its tools';
    const base = tray && tray.classList.contains('sm-tray-2') ? (w.bandHintSelPc || 'Its tools are below') : (w.bandHintSel || 'Its tools are below · More opens the rest');
    /* Phase 3 · Clips › Extras: a layer of an element moving with the rest says so first (on two rows the tray has no room for it) */
    const id = (layer && layer.id) || ((FM.selectionIds ? FM.selectionIds() : [])[0] || null);
    const R = FM.simpleTimeline && FM.simpleTimeline.read ? FM.simpleTimeline.read() : null, wl = id ? withWords(R, id) : '';
    return wl ? wl + ' · ' + base : base;
  }
  function hintFollows() {
    const h = document.querySelector('#inspector > .sm-band-hint[data-sel]');
    if (h) { const t = bandWords(true); if (h.textContent !== t) h.textContent = t; }
  }
  function fitRows() {
    if (sayEl && sayEl.classList.contains('sm-two') && !tray.classList.contains('sm-tray-2') && !sayEl.classList.contains('sm-saying')) sayEl.classList.remove('sm-two');
  }

  /* ═══ PHASE 3 · LOOK — THE PANEL (queue 980; DESIGN §8.5 the tray's Look, §8.7 "Filters + strength …; Adjust", D20 A). ═══
     Drawn by js/inspector.js into #inspector through drawPanel, so it docks exactly where More's panel does: the sheet under the
     tray on a phone, inside the left band above the tray on a PC. Two tabs: FILTERS — None, then his favourites, his own saved
     filters and the library by section, each a tile with the library's own picture (FM.fxThumbs, the Filters tab's tiles), a tap is
     one step; and the filter's Strength under them while one is on. ADJUST — Brightness, Contrast, Saturation, Exposure, Warmth and
     Vignette, and Reset. A slider shows the picture as it moves (FM.spine.lookApply on the live clip) and writes ONE step when it is
     let go: the preview is taken back to the byte first, then FM.spine.cmd.look writes it, so a refused step leaves nothing behind.
     Built with createElement / textContent: a filter's name can be his own words (a saved filter), never markup. The writes and what
     they mean are js/spine-edit.js's (PHASE 3 · LOOK). */
  /* …taken back only while the clip's stack is still exactly what the preview made it: an edit that landed meanwhile (a friend's,
     an undo) is never written over with the old stack */
  function lookUndrag() {
    if (!lookDrag) return;
    const d = lookDrag, L = FM.layerById && FM.scene ? FM.layerById(FM.scene, d.id) : null;
    lookDrag = null;
    if (L && d.last != null && JSON.stringify(L.effects || [], FM.jsonReplacer) === d.last) { try { L.effects = JSON.parse(d.pre); } catch (e) {} }
    if (FM.requestRender) FM.requestRender();
  }
  /* his favourites, his own filters, then the library section by section; each look once */
  function lookList() {
    const F = FM.filters, seen = {}, out = [];
    if (!F) return out;
    const add = f => { if (f && f.id && !seen[f.id]) { seen[f.id] = 1; out.push(f); } };
    try {
      (F.faves ? F.faves() : []).forEach(add);
      (F.custom ? F.custom() : []).forEach(add);
      (F.sections ? F.sections() : []).forEach(s => (F.bySection ? F.bySection(s.key) : []).forEach(add));
      if (!out.length && F.all) F.all().forEach(add);
    } catch (e) {}
    return out;
  }
  function lookSlider(L, key, label, lo) {
    const S = FM.spine, w = W(), id = L.id, now = S.lookValue(L, key), frag = document.createDocumentFragment();
    const pctLike = key === 'strength' || key === 'vignette';
    const fmt = v => pctLike ? (key === 'strength' ? v + '%' : String(v)) : (v > 0 ? '+' + v : String(v));
    const op = v => key === 'strength' ? { kind: 'strength', v: v } : { kind: 'adjust', key: key, v: v };
    const row = el('div', 'sm-look-row');
    const rng = el('input', 'sm-look-r'); rng.type = 'range'; rng.min = String(lo); rng.max = '100'; rng.step = '1';
    rng.value = String(Math.max(lo, Math.min(100, now))); rng.dataset.key = key; rng.dataset.look = 'r-' + key;
    rng.setAttribute('aria-label', label);
    const val = el('span', 'sm-look-v', fmt(now));
    rng.addEventListener('input', () => {
      const v = Math.round(parseFloat(rng.value)), Lx = FM.layerById(FM.scene, id);
      val.textContent = fmt(v);
      if (!Lx) return;
      if (!lookDrag || lookDrag.id !== id) { lookUndrag(); lookDrag = { id: id, pre: JSON.stringify(Lx.effects || [], FM.jsonReplacer), last: null }; }
      S.lookApply(Lx, op(v));
      lookDrag.last = JSON.stringify(Lx.effects || [], FM.jsonReplacer);
      if (FM.requestRender) FM.requestRender();
    });
    rng.addEventListener('change', () => {
      const v = Math.round(parseFloat(rng.value));
      lookUndrag();
      if (v !== now) S.cmd.look(id, op(v));
    });
    row.append(el('span', 'sm-look-l', label), rng, val);
    frag.appendChild(row);
    /* §8.5: a keyed numeric row moves the whole animation, and says so with a way to Full */
    if (S.lookKeyed(L, key)) {
      const n = el('div', 'sm-look-note');
      n.appendChild(el('span', 'sm-look-note-t', w.lookKeyed || ''));
      const full = el('button', 'sm-look-full', w.openFull || 'Open in Full'); full.type = 'button'; full.dataset.look = 'full-' + key;
      full.addEventListener('click', e => { e.stopPropagation(); if (FM.editor && FM.editor.request) FM.editor.request('full', { hop: true }); });
      n.appendChild(full);
      frag.appendChild(n);
    }
    return frag;
  }
  function lookFilters(box, L) {
    const w = W(), id = L.id, lk = FM.spine.lookOf(L), cur = lk.filter ? lk.filter.fid : '';
    const strip = el('div', 'sm-look-strip');
    strip.setAttribute('role', 'group'); strip.setAttribute('aria-label', w.lookFilters || 'Filters');
    const tile = (fid, name) => {
      const b = el('button', 'sm-look-tile'); b.type = 'button';
      b.dataset.fid = fid; b.dataset.look = 'f-' + (fid || 'none');
      b.setAttribute('aria-pressed', fid === (cur || '') ? 'true' : 'false');
      b.title = name; b.setAttribute('aria-label', name);
      if (fid) {
        const cv = el('canvas', 'sm-look-th'); cv.setAttribute('aria-hidden', 'true');
        b.appendChild(cv);
        if (FM.fxThumbs && FM.fxThumbs.mountFilter) { try { FM.fxThumbs.mountFilter(cv, fid, null); } catch (e) {} }
      } else {
        const n = el('span', 'sm-look-th sm-look-none');
        n.innerHTML = svg('none');   // a fixed string, never user data
        b.appendChild(n);
      }
      b.appendChild(el('span', 'sm-look-name', name));
      b.addEventListener('click', e => { e.stopPropagation(); if (fid !== (cur || '')) FM.spine.cmd.lookFilter(id, fid || null); });
      return b;
    };
    strip.appendChild(tile('', w.lookNone || 'None'));
    lookList().forEach(f => strip.appendChild(tile(String(f.id), String(f.name || f.id))));
    strip.addEventListener('scroll', () => { lookLeft = strip.scrollLeft; }, { passive: true });
    box.appendChild(strip);
    if (lk.filter) box.appendChild(lookSlider(L, 'strength', w.lookStrength || 'Strength', 0));
  }
  function lookAdjust(box, L) {
    const w = W(), S = FM.spine;
    (S.LOOK_ADJ || []).forEach(d => box.appendChild(lookSlider(L, d.key, w[d.word] || d.key, d.lo)));
    const rs = el('button', 'sm-look-reset', w.lookReset || 'Reset'); rs.type = 'button'; rs.dataset.look = 'reset';
    if (!S.lookOf(L).adjust) rs.setAttribute('aria-disabled', 'true');
    rs.addEventListener('click', e => { e.stopPropagation(); if (rs.getAttribute('aria-disabled') !== 'true') S.cmd.look(L.id, { kind: 'reset' }); });
    box.appendChild(rs);
  }
  function lookPanel(root, L) {
    const w = W(), box = el('div', 'sm-look');
    box.setAttribute('role', 'group'); box.setAttribute('aria-label', w.look || 'Look');
    const tabs = el('div', 'sm-look-tabs');
    [['filters', w.lookFilters || 'Filters'], ['adjust', w.lookAdjust || 'Adjust']].forEach(t => {
      const b = el('button', 'sm-look-tab', t[1]); b.type = 'button'; b.dataset.tab = t[0]; b.dataset.look = 'tab-' + t[0];
      b.setAttribute('aria-pressed', lookTab === t[0] ? 'true' : 'false');
      b.addEventListener('click', e => { e.stopPropagation(); if (lookTab === t[0]) return; lookUndrag(); lookTab = t[0]; if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh(); });
      tabs.appendChild(b);
    });
    box.appendChild(tabs);
    if (lookTab === 'adjust') lookAdjust(box, L); else lookFilters(box, L);
    root.appendChild(box);
  }

  /* ═══ PHASE 3 · CAPTIONS — EDIT LINES (queue 980; DESIGN §8.5 the caption-track tray's Edit lines, V4's lines sheet). ═══
     Drawn by js/inspector.js through drawPanel where More's and Look's panels dock (the sheet under the tray on a phone, the band above
     it on a PC, D20 A). Every line of the track, its time and its words: a tap puts the playhead on it and opens the REAL text editor
     there (js/text-edit.js binds to the line under the playhead; one text-entry surface, as Full's cue list does), ✕ removes that line
     (one step), and "Add a line here" adds one at the playhead (one step, then the editor). The words are HIS: they go in as text
     (textContent / an attribute), never as markup. The writes are js/spine-edit.js's (PHASE 3 · CAPTIONS). */
  const capTime = t => { t = Math.round(Math.max(0, +t || 0) * 10) / 10; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };   // rounded first: 59.96 s is 1:00.0, never 0:60.0
  function typeLine(id, cue) {
    const L = FM.layerById(FM.scene, id);
    if (!L || !cue) return;
    if (FM.scrubTime) FM.scrubTime((+L.start || 0) + cue.start + Math.min(0.05, (cue.end - cue.start) / 2), true);
    if (FM.textEdit && FM.textEdit.start) FM.textEdit.start(id, { selectAll: true });
  }
  function linesPanel(root, L) {
    const w = W(), S = FM.spine, box = el('div', 'sm-cap');
    box.setAttribute('role', 'group'); box.setAttribute('aria-label', w.editLines || 'Edit lines');
    const top = el('div', 'sm-cap-top');
    const add = el('button', 'sm-cap-add', w.capAddLine || 'Add a line here'); add.type = 'button'; add.dataset.cap = 'add';
    add.addEventListener('click', e => { e.stopPropagation(); S.cmd.captionAdd({ id: L.id }); });
    top.appendChild(add);
    box.appendChild(top);
    const list = el('div', 'sm-cap-list'), cues = (FM.captions && FM.captions.cues) ? FM.captions.cues(L) : [];
    list.setAttribute('role', 'list');
    if (!cues.length) list.appendChild(el('div', 'sm-cap-none', w.capNone || 'No lines yet'));
    cues.forEach((c, i) => {
      const row = el('div', 'sm-cap-row'); row.setAttribute('role', 'listitem');
      const at = capTime((+L.start || 0) + (+c.start || 0)), words = String(c.text == null ? '' : c.text).trim();
      const b = el('button', 'sm-cap-t'); b.type = 'button'; b.dataset.cap = 'line-' + i;
      b.appendChild(el('span', 'sm-cap-time', at));
      b.appendChild(el('span', 'sm-cap-w' + (words ? '' : ' sm-cap-empty'), words || (w.capEmpty || 'Empty · tap to type')));
      b.setAttribute('aria-label', at + ', ' + (words || w.capEmpty || ''));
      b.addEventListener('click', e => { e.stopPropagation(); typeLine(L.id, c); });
      const x = el('button', 'sm-cap-x'); x.type = 'button'; x.dataset.cap = 'x-' + i;
      x.innerHTML = svg('close');   // a fixed string, never user data
      x.title = w.capRemove || 'Remove this line'; x.setAttribute('aria-label', (w.capRemove || 'Remove this line') + ', ' + at);
      x.addEventListener('click', e => { e.stopPropagation(); S.cmd.captionRemove(L.id, { start: c.start, end: c.end, text: c.text }); });
      row.append(b, x);
      list.appendChild(row);
    });
    box.appendChild(list);
    root.appendChild(box);
    /* the list is drawn again after every step: it stays where he had scrolled it (the #inspector scroll is noted while lines are up) */
    if (!root._smCapScroll) {
      root._smCapScroll = true;
      root.addEventListener('scroll', () => { if (isSimple() && panelKind === 'lines' && root.querySelector(':scope > .sm-cap')) linesTop = root.scrollTop; }, { passive: true });
    }
  }

  /* ═══ PHASE 3 · EFFECT SEGMENTS (queue 980; DESIGN §8.5 the project row's Effects and the Effect segment tray, §8.5c, §4.3). ═══
     THE PICKER is the tray row itself, as Length, Speed and Volume are (2.3: "the row itself is the panel, so the timeline above
     never moves"): Done, then one tile per whole-frame grade a segment can be (FM.spine.segmentEffects, the ADJ_OK effects in the
     effects browser's order), each with the browser's own live picture (FM.fxThumbs.mount) and its name. It needs no selection, so
     it works on a phone, where the docked sheet only rises for a selected item (js/mobile.js). Nothing is written until a tile is
     tapped (§8.5c item 1, pick first): from the project row's Effects a tap makes the segment at the playhead and selects it (its
     tray replaces the picker); from a segment's Change effect a tap swaps its effect and the picker stays, the tile now pressed.
     Any other selection, Done, Effects pressed again or leaving Simple closes it. The tiles scroll in the tray's own strip, so
     Done stays put, the fades show where more lie, a mouse wheel scrolls them, and a redraw keeps the strip where it was (_fill).
     THE SEGMENT'S TRAY: Change effect (only when it holds one plain effect) · Strength · Stay put · More · 🗑, its 🗑 Simple's own
     one-step Delete effect. STRENGTH is an inline row like Volume: a slider that previews on the canvas while it moves and writes
     ONE step when let go (the preview taken back to the byte first, as Look's sliders do).
     Built with createElement / textContent: an effect's name is put in as text, never markup. */
  function segmentTray(id, l, stay, more) {
    const S = FM.spine, w = W(), list = [];
    if (S.segmentEffect(l) || !(l.effects || []).length) list.push({ id: 'change', label: w.change || 'Change effect', icon: 'change', run: () => FM.simpleTools.openEffects(id) });
    list.push({ id: 'strength', label: w.strength || 'Strength', icon: 'strength', run: () => FM.simpleTools.openRow('strength', id) });
    list.push(stay, more, { id: 'delete', label: w.delete || 'Delete', icon: 'delete', pin: true, run: () => S.cmd.deleteEffect(id) });
    return list;
  }
  function fxFill() {
    const S = FM.spine, w = W(), seg = fxPick.id ? FM.layerById(FM.scene, fxPick.id) : null;
    const cur = seg ? ((S.segmentEffect(seg) || {}).type || '') : null;   // null: a new segment, so no tile is pressed
    tray.setAttribute('data-row', 'effects');
    tray.appendChild(tool({ id: 'fxBack', label: w.done || 'Done', icon: 'back', run: () => FM.simpleTools.closeEffects() }));
    const box = el('div', 'sm-runbox'), run = el('div', 'sm-run sm-fx-run'), cvs = [];
    run.setAttribute('role', 'group'); run.setAttribute('aria-label', w.effects || 'Effects');
    (S.segmentEffects ? S.segmentEffects() : []).forEach(reg => {
      const type = String(reg.type), name = String(reg.label || type);
      const b = tool({ id: 'fx:' + type, label: name, icon: null, pressed: cur == null ? null : cur === type,
        run: () => { if (seg) { if (cur !== type) S.cmd.changeEffect(seg.id, type); } else S.cmd.addEffect(type, FM.time || 0); } });
      b.classList.add('sm-fx-tile');
      const cv = el('canvas', 'sm-fx-th'); cv.setAttribute('aria-hidden', 'true');
      b.insertBefore(cv, b.firstChild);
      run.appendChild(b); cvs.push([cv, type]);
    });
    const fade = side => { const f = el('span', 'sm-fade sm-fade-' + side); f.setAttribute('aria-hidden', 'true'); return f; };
    box.append(run, fade('s'), fade('e'));
    tray.appendChild(box);
    run.addEventListener('scroll', () => edges(run), { passive: true });
    if (runSeen) runSeen.observe(run);
    edges(run);
    if (FM.fxThumbs && FM.fxThumbs.mount) cvs.forEach(p => { try { FM.fxThumbs.mount(p[0], p[1]); } catch (e) {} });
    return false;
  }
  /* the project row's Effects shows pressed while it has the picker open for a new segment */
  function fxMark() {
    const b = tools && tools.querySelector('.sm-tool[data-tool="effects"]');
    if (b) b.setAttribute('aria-pressed', fxPick && !fxPick.id ? 'true' : 'false');
  }
  /* what sync's signature needs from this block: the picker, and the selected segment's effect and strength (Change effect and Undo
     move the pressed tile; a strength step or its Undo moves the slider) */
  function segSig(l) {
    const a = fxPick ? 'fx/' + (fxPick.id || '') + (fxPick.on ? '/on' : '') : '';   // '/on': the item picker (Phase 3 · Effects on an item)
    const b = (l && l.type === 'adjustment') ? JSON.stringify([(l.effects || []).map(f => f && f.type), l.transform ? l.transform.opacity : 1]) : '';
    return a + '|' + b;
  }
  /* …taken back only while the opacity is still exactly what the preview made it: an edit that landed meanwhile is never written over */
  function segUndrag() {
    if (!segDrag) return;
    const d = segDrag, L = FM.layerById && FM.scene ? FM.layerById(FM.scene, d.id) : null;
    segDrag = null;
    if (L && L.transform && JSON.stringify(L.transform.opacity) === d.last) { try { L.transform.opacity = JSON.parse(d.pre); } catch (e) {} }
    if (FM.requestRender) FM.requestRender();
  }
  function strengthRow(R, id) {
    const S = FM.spine, w = W(), l = FM.layerById(FM.scene, id), out = [rowBack()];
    if (!l || !S.segmentStrength) return out;
    const now = S.segmentStrength(l);
    const val = el('span', 'sm-vol-v sm-str-v', now + '%');
    const rng = el('input', 'sm-vol-r sm-str-r'); rng.type = 'range'; rng.min = '0'; rng.max = '100'; rng.step = '1'; rng.value = String(now);
    rng.setAttribute('aria-label', w.strengthLabel || 'Strength in percent');
    rng.addEventListener('input', () => {
      const v = Math.round(parseFloat(rng.value)), Lx = FM.layerById(FM.scene, id);
      val.textContent = v + '%';
      if (!Lx || !Lx.transform) return;
      if (!segDrag || segDrag.id !== id) { segUndrag(); segDrag = { id: id, pre: JSON.stringify(Lx.transform.opacity), last: null }; }
      S.segmentStrengthApply(Lx, v);
      segDrag.last = JSON.stringify(Lx.transform.opacity);
      if (FM.requestRender) FM.requestRender();
    });
    rng.addEventListener('change', () => {
      const v = Math.round(parseFloat(rng.value));
      segUndrag();
      if (v !== now) S.cmd.effectStrength(id, v);
    });
    out.push(rng, val);
    return out;
  }
  ROWS.strength = strengthRow;

  /* ═══ PHASE 3 · EFFECTS ON AN ITEM (queue 980; DESIGN §8.5c item 3, §8.5 the Overlay and Text trays). ═══
     ADD EFFECT in a title's or an overlay's tray opens the effects picker in the tray row, as the project row's Effects does (the
     row itself is the panel, so nothing above it moves): Done, then one tile per effect THIS item can run (FM.spine.itemEffects —
     his presets and the shipped ones first, then the browser's categories without 3D, Keying and Repetition), each with the
     browser's own sample picture. Nothing is written until a tile is tapped (§8.5c item 1, pick first). A tap closes the picker,
     back to the item's tray with Add effect where it was, and runs ONE step (FM.spine.cmd.itemEffect) that puts that effect on the
     item; the line "Added Shake to “Hi”" is said in #sm-live (§3.12 1a). Any other selection, Done or leaving Simple closes it, as
     the segment picker does: the same fxPick state, marked `on`. Built with createElement / textContent: a preset's name can be his
     own words, never markup. */
  function itemFxFill() {
    const S = FM.spine, w = W(), id = fxPick.id, L = id ? FM.layerById(FM.scene, id) : null;
    tray.setAttribute('data-row', 'effects');
    tray.appendChild(tool({ id: 'fxBack', label: w.done || 'Done', icon: 'back', run: () => FM.simpleTools.closeEffects() }));
    const box = el('div', 'sm-runbox'), run = el('div', 'sm-run sm-fx-run'), cvs = [];
    run.setAttribute('role', 'group'); run.setAttribute('aria-label', w.addEffect || 'Add effect');
    ((L && S.itemEffects) ? S.itemEffects(L) : []).forEach(p => {
      const key = String(p.key);
      const b = tool({ id: 'fx:' + key, label: p.name, icon: null,
        run: () => {
          const t = FM.time || 0, back = !!(document.activeElement && tray.contains(document.activeElement));
          FM.simpleTools.closeEffects();
          if (back) { const a = tray.querySelector('.sm-tool[data-tool="addfx"]'); if (a) a.focus({ preventScroll: true }); }   // the tool that opened it keeps focus (§3.12 1a)
          S.cmd.itemEffect(id, key, t);
        } });
      b.classList.add('sm-fx-tile');
      const cv = el('canvas', 'sm-fx-th'); cv.setAttribute('aria-hidden', 'true');
      b.insertBefore(cv, b.firstChild);
      run.appendChild(b); cvs.push([cv, p]);
    });
    const fade = side => { const f = el('span', 'sm-fade sm-fade-' + side); f.setAttribute('aria-hidden', 'true'); return f; };
    box.append(run, fade('s'), fade('e'));
    tray.appendChild(box);
    run.addEventListener('scroll', () => edges(run), { passive: true });
    if (runSeen) runSeen.observe(run);
    edges(run);
    const T = FM.fxThumbs;
    if (T) cvs.forEach(q => { try { if (q[1].preset && T.mountPreset) T.mountPreset(q[0], q[1].preset, null); else if (T.mount) T.mount(q[0], q[1].type); } catch (e) {} });
    return false;
  }

  /* ═══ PHASE 3 · CLIPS › EXTRAS (queue 980; DESIGN §8.5 the Clips row "Add clips … · Extras (D21, from Phase 3): saved elements, shapes
     and templates, reusing addmenu's Elements, Shape and Template tab contents through the §14.2 tabs option, each pick running §12.2's
     insert command"; §17 D21, his answer 1 Oct "D21 A"). ═══
     CLIPS opens a short list like Sound's: Add clips (what Clips did until now: the picker, or At the end / After Clip N with the playhead
     inside the clips) and Extras. EXTRAS is the Add menu itself (js/addmenu.js render, with its opt-in `tabs`), showing only three tabs:
     Elements — his saved elements as tiles with their own pictures (Full keeps them behind its Custom elements browser) — Shape, and
     Template, each tile's tap running Simple's own one-step command (FM.spine.cmd.addShape / addElement / addTemplate), never Full's
     add. On a phone it is the Add sheet he knows, risen from the bottom (FM.mobile.openAdd, then the three tabs drawn into it); on a PC
     it is drawn in the left band above the tray, where Look's panel goes (D20 A), with a Done. It needs nothing selected (a selection is
     let go first), and it closes on a pick, on Done, on any selection, or on leaving Simple. Its open tab and pages are its own: Full's
     Add menu reopens on the tab Full left it on. Names are his own words: addmenu's cards put them in as text. */
  let extrasOpen = false;
  /* ═══ 7B (sheet 1 question 7 and sheet 2 question 1, pick B, decided 6 Nov under his 21 Oct rule): ON A PC THE BAND GROWS WHILE A
     PANEL IS OPEN. At 1280x800 the band under the picture is about 240 px and a panel above the tools got about 96 of it: Look showed
     one Adjust slider, and Extras' Done could not be pressed (R6, a real fault). While More's panel, Look, Edit lines or Extras is up,
     the band's row (--tl-h on <html>, the property both of the band's own drags write: the timeline divider and the band's top edge)
     grows by the height of the band's tool rows, inside the app's own ceiling (FM.clampTimelineH); the picture shrinks to make room,
     as a phone's does when More opens, and it all goes back when the panel closes or Simple leaves.
     WHOSE HEIGHT IT IS is read off the page, never off the pointer (the 7 Nov review: a press that moved nothing, a lost release, a
     right-button press and the band's top edge (#am-resizer) all slipped past a pointer-motion rule): at close, a --tl-h still equal to
     the one set here was never his, so his own goes back on screen, and if a drag's end stored the grown height (js/app.js end / amEnd
     store whatever is inline), the height he had stored goes back too; the window's re-clamp of ours counts as ours. A height that
     differs is his (a drag of either handle) and stays. Every write goes through FM.tlBandResized, the door every band-height writer
     uses (the stage, the selection outline, and everything pinned to the band). Never mid-drag, never on a phone (the sheet rises
     there), never in Full: growTo(true) runs only from sync() while Simple is on screen, and every way out of Simple calls growTo(false). ═══ */
  let grow = null, growHooked = false;   // grow: { from: the inline --tl-h before ('' for none), to: what was set, kept: fm_tl_h before }
  const storedTl = () => { try { return localStorage.getItem('fm_tl_h'); } catch (e) { return null; } };
  function bandMovedNow() {
    if (FM.tlBandResized) { FM.tlBandResized(); return; }
    if (FM.refreshPreviewScale) FM.refreshPreviewScale();
    if (FM.canvasEdit && FM.canvasEdit.stageResized) FM.canvasEdit.stageResized();
  }
  /* a grown height stored by a drag's end that changed nothing (or by a lost release) is put back to the one he had */
  function unstoreGrow(g) {
    const s = storedTl(), to = parseInt(g.to, 10), clamped = FM.clampTimelineH ? FM.clampTimelineH(to) : to;
    if (s == null || (parseInt(s, 10) !== to && parseInt(s, 10) !== clamped)) return;
    try { if (g.kept == null) localStorage.removeItem('fm_tl_h'); else localStorage.setItem('fm_tl_h', g.kept); } catch (e) {}
  }
  function growTo(on) {
    const root = document.documentElement;
    if (on && !grow) {
      if (document.body.classList.contains('tl-resizing')) return;   // a divider drag is his: no grow starts under it
      const band = document.getElementById('inspector-panel');
      if (!bar || !band) return;
      const add = Math.round(bar.getBoundingClientRect().height);
      const now = FM._bandH ? FM._bandH() : Math.round(band.getBoundingClientRect().height);
      if (!(add > 0) || !(now > 0)) return;
      const want = FM.clampTimelineH ? FM.clampTimelineH(now + add) : now + add;
      if (!(want > now)) return;   // at the ceiling already: nothing to give
      grow = { from: root.style.getPropertyValue('--tl-h').trim(), to: want + 'px', kept: storedTl() };
      if (!growHooked) { growHooked = true; window.addEventListener('pagehide', () => { if (grow) unstoreGrow(grow); }); }   // a reload with a panel up
      root.style.setProperty('--tl-h', grow.to);
      bandMovedNow();
    } else if (!on && grow) {
      const g = grow; grow = null;
      const cur = parseInt(root.style.getPropertyValue('--tl-h'), 10), to = parseInt(g.to, 10);
      /* his only when a handle was dragged while grown AND the height moved; else ours (as set, or as the window's re-clamps left it,
         a shrink then a grow of the window included: the review's leftover) */
      const ours = !g.touched || cur === to || (FM.clampTimelineH && cur === FM.clampTimelineH(to) && cur < to);
      if (ours) {
        const back = parseInt(g.from, 10);
        if (back > 0) root.style.setProperty('--tl-h', (FM.clampTimelineH ? FM.clampTimelineH(back) : back) + 'px');
        else {
          root.style.removeProperty('--tl-h');
          /* the stylesheet's band in a window the resize handler would have clamped: clamp it as it would have (the review's low) */
          const h = FM._bandH ? FM._bandH() : 0, c = h && FM.clampTimelineH ? FM.clampTimelineH(h) : h;
          if (h && c !== h) root.style.setProperty('--tl-h', c + 'px');
        }
        unstoreGrow(g);
      }
      bandMovedNow();
    }
  }
  function growSync() { growTo(isSimple() && !phone.matches && (!!panelFor || extrasOpen)); }
  const xIco ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/></svg>';
  function clipsMenu(b) {
    const w = W();
    openMenu(b, [
      { label: w.addClips || 'Add clips', run: clipsTool },
      { label: w.extras || 'Extras', run: () => FM.simpleTools.openExtras() }
    ]);
    if (menu) { menu.dataset.kind = 'clips'; menu.setAttribute('aria-label', w.clips || 'Clips'); }
  }
  /* The three tabs, each with Simple's own list. Shapes and templates are the Add menu's own tiles (their words, pictures and order),
     read at draw time; what a tap does is Simple's. A saved element is a tile of its own (Full lists them only behind a button). */
  function extrasTabs() {
    const S = FM.spine, w = W(), all = (FM.addMenu && FM.addMenu._tabs) ? FM.addMenu._tabs() : [];
    const listOf = k => { const t = all.filter(x => x.key === k)[0]; if (!t) return []; try { return (typeof t.options === 'function' ? t.options() : t.options) || []; } catch (e) { return []; } };
    const elIcon = () => { const ce = listOf('object').filter(o => o && o.label === 'Custom elements')[0]; return ce && typeof ce.icon === 'string' ? ce.icon : xIco; };
    return [
      { key: 'object', options: () => {
        const list = ((FM.elements && FM.elements.list) ? FM.elements.list() : []) || [], ic = elIcon();
        if (!list.length) return [{ emptyPanel: { mark: '◱', title: w.extrasNoElements || 'No elements yet', lines: [w.extrasElementsHow || ''] } }];
        return list.map(e => ({ label: String((e && e.name) || w.extrasElement || 'Element'), thumb: (e && typeof e.thumb === 'string') ? e.thumb : null, icon: ic,
          add: () => { if (S && S.cmd && S.cmd.addElement) S.cmd.addElement(e.id); } }));
      } },
      { key: 'shape', options: () => listOf('shape').map(o => ({ label: o.label, icon: o.icon,
        add: () => { const f = o.add; if (S && S.cmd && S.cmd.addShape) S.cmd.addShape(f && f.shape, f && f.shapeOpts); } })) },
      { key: 'template', options: () => listOf('template').map(o => o.emptyPanel ? o : ({ label: o.label, thumb: o.thumb || null, icon: o.icon,
        add: () => { if (S && S.cmd && S.cmd.addTemplate) S.cmd.addTemplate(o.templateId); } })) }
    ];
  }
  /* "Moves with the shape" (DESIGN §8.5 Block row "its members show their own trays … with 'Moves with ‘Hello’'", §4.1): for a layer of an
     element or template that follows the anchor of its sm.unit group (js/spine.js 6c); '' for anything else. The anchor is named the
     way every line names an item (FM.spine.itemWord: a title by its first words, never a layer name). */
  function withWords(R, id) {
    if (!R || !R.movesWith || !id) return '';
    const a = R.movesWith(id), L = a && FM.layerById ? FM.layerById(FM.scene, a) : null;
    if (!L || !FM.spine || !FM.spine.itemWord) return '';
    const f = (FM.spineWords && FM.spineWords.lines && FM.spineWords.lines.movesWith) || (n => 'Moves with ' + n);
    return f(FM.spine.itemWord(L, R));
  }
  function withTag(text) { const s = el('span', 'sm-with', text); s.title = text; return s; }
  function extrasMark() {
    const b = tools && tools.querySelector('.sm-tool[data-tool="clips"]');
    if (b) b.setAttribute('aria-pressed', extrasOpen ? 'true' : 'false');
  }
  /* the phone's Add sheet, when it is showing Extras: closed (the next Full opening draws Full's own menu into it, as it always does) */
  function extrasSheetOff() {
    const grid = document.getElementById('add-grid'), sheet = document.getElementById('add-sheet');
    if (!grid || !grid.querySelector(':scope > .addmenu[data-sm="extras"]')) return;
    if (sheet && sheet.classList.contains('open') && FM.mobile && FM.mobile.closeAdd) FM.mobile.closeAdd();
  }
  /* PC: the menu is drawn straight into the band's #inspector, exactly where Full's Add menu sits (its own CSS and fit apply), measured
     against #inspector itself (`host`: the band's tray and tools sit below it), and the band's title row says Extras, as Full's says Add.
     Its Done is in the tray row (extrasFill), as the effects pickers' is: the ~96 px over the tray at 1280×800 are all the menu's. */
  function drawExtras(root, title) {
    const w = W();
    if (title) title.textContent = w.extras || 'Extras';
    if (!FM.addMenu || !FM.addMenu.render) return false;
    FM.addMenu.render(root, { variant: 'panel', tabs: extrasTabs(), host: root, onAfterAdd: () => FM.simpleTools.closeExtras() });
    const am = root.querySelector(':scope > .addmenu');
    if (am) { am.dataset.sm = 'extras'; am.setAttribute('aria-label', w.extras || 'Extras'); }
    return true;
  }
  /* the tray row while Extras is in the band (PC, nothing selected): Done, and what Extras holds */
  function extrasFill() {
    const w = W();
    tray.appendChild(tool({ id: 'extrasBack', label: w.done || 'Done', icon: 'back', title: (w.done || 'Done') + ' · ' + (w.extras || 'Extras'), run: () => FM.simpleTools.closeExtras() }));
    tray.appendChild(el('div', 'sm-quiet', w.extrasTitle || ''));
    return false;
  }

  /* ═══ PHASE 3 · TEMPLATE REPLACE — SIMPLE'S LINE ON INSERT YOUR MEDIA (queue 980; DESIGN §0.4 B28, §3.6 Replace row, §3.12; his
     #619 / #343). ═══
     While Simple is on screen, Insert your Media's Replace Media is Simple's own Replace (js/template-fill.js → FM.spine.cmd.fillReplace).
     That sheet covers the whole screen (#tpl-fill), so #sm-say — where Simple says "That clip is locked · Do it anyway", "Not enough
     footage", "Sam can edit" — lies under it: a refused swap would change nothing and say nothing, which is the silence #619 was about.
     So while the sheet is up over Simple, a line Simple says shows ON the sheet, between the slots and the control, with its buttons
     (armed after 400 ms, §3.12 rule 5), and its words go to #sm-live for a screen reader; a live-only line still goes to #sm-live as
     before and puts the sheet's line away. The line goes on a press elsewhere on the sheet, after 4 s (10 s with a button, longer while
     the pointer or focus is on it), when the sheet closes, or on leaving Simple, and the element is taken out each time, so Full's sheet
     is left exactly as it was. A button that lands a step (Do it anyway) redraws the row and the preview (FM.templateFill.refresh): the
     tap's own promise settled before it. Built with createElement / textContent; nothing here runs in Full. */
  let tfLn = null, tfT = 0, tfSeen = null, tfN = 0, tfHooked = false;
  const tfUp = () => isSimple() && !!(FM.templateFill && FM.templateFill.isOpen && FM.templateFill.isOpen());
  function tfClear() {
    clearTimeout(tfT); tfT = 0;
    if (tfSeen) { tfSeen.disconnect(); tfSeen = null; }
    const root = document.getElementById('tpl-fill');
    if (root) root.removeEventListener('pointerdown', tfOff, true);
    if (tfLn) { tfLn.textContent = ''; if (tfLn.parentNode) tfLn.parentNode.removeChild(tfLn); }
  }
  function tfOff(e) { if (tfLn && e && e.target && tfLn.contains(e.target)) return; tfClear(); }
  /* after a line's button: wait for the runner to finish what it started, then draw the sheet's row again */
  async function tfAfter(p) {
    try { await p; } catch (e) {}
    const S = FM.spine;
    for (let i = 0; i < 400 && S && (S.running || S.reading > 0 || (S.queue && S.queue.length)); i++) await new Promise(r => setTimeout(r, 25));
    if (FM.templateFill && FM.templateFill.refresh) { try { FM.templateFill.refresh(); } catch (e) {} }
  }
  function tfSay(text, opts) {
    if (!tfUp()) return false;
    opts = opts || {};
    if (opts.live || !text) { tfClear(); return false; }
    const root = document.getElementById('tpl-fill'), rail = root && root.querySelector(':scope > .tfill-slots');
    if (!root || !rail) return false;
    if (!tfHooked && FM.editor && FM.editor.onChange) { tfHooked = true; FM.editor.onChange(m => { if (m !== 'simple') tfClear(); }); }
    tfClear();
    if (!tfLn) tfLn = el('div', 'sm-fill-say');
    tfLn.dataset.n = String(++tfN);   // which line this is (the suite tells a new line from one still showing)
    tfLn.appendChild(el('span', 'sm-fill-say-t', String(text)));
    const btns = (opts.buttons || []).slice(0, 2);
    if (opts.full && !btns.length) btns.push({ label: ((FM.spineWords && FM.spineWords.lines) || {}).openFull || 'Open in Full', fn: () => { if (FM.editor) return FM.editor.request('full', { hop: true }); } });
    const t0 = performance.now(), armed = () => performance.now() - t0 >= 400;
    btns.forEach(bd => {
      const b = el('button', 'sm-fill-say-b', bd.label); b.type = 'button'; b.setAttribute('aria-disabled', 'true');
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        if (!armed()) { ev.preventDefault(); return; }
        const at = b.getBoundingClientRect();
        tfClear();
        let r = null;
        try { r = bd.fn(at); } catch (e) { r = null; }
        tfAfter(r);
      });
      tfLn.appendChild(b);
    });
    rail.after(tfLn);
    if (btns.length) setTimeout(() => { if (tfLn && tfLn.isConnected) tfLn.querySelectorAll('.sm-fill-say-b').forEach(b => b.setAttribute('aria-disabled', 'false')); }, 400);
    const live = document.getElementById('sm-live');
    if (live) live.textContent = String(text);
    root.addEventListener('pointerdown', tfOff, true);
    if (window.MutationObserver) { tfSeen = new MutationObserver(() => { if (root.classList.contains('hidden')) tfClear(); }); tfSeen.observe(root, { attributes: true, attributeFilter: ['class'] }); }
    const tick = () => { if (tfLn && tfLn.isConnected && (tfLn.matches(':hover') || tfLn.contains(document.activeElement))) { tfT = setTimeout(tick, 1000); return; } tfClear(); };
    tfT = setTimeout(tick, opts.ms > 0 ? opts.ms : (btns.length ? 10000 : 4000));
    return true;
  }
  if (FM.spine) FM.spine.sayOver = tfSay;

  FM.simpleTools = {
    /* Called by the Simple timeline's rebuild and by syncSelectionChrome: re-draws the tray only when what it shows changed */
    sync() {
      if (!mount()) return;
      if (!isSimple()) { home(); closeMenu(); if (hintUp) { hintUp = false; splitMark(false); } if (lookDrag) lookUndrag(); if (fxPick || segDrag) { fxPick = null; segUndrag(); } extrasOpen = false; growTo(false); return; }
      place();
      const S = FM.spine, R = (FM.simpleTimeline && FM.simpleTimeline.read && FM.simpleTimeline.read()) || S.read(FM.scene);
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      /* Phase 3 · Clips › Extras: a selection (a pick's own, or a tap) closes it, and so does the project row's Effects picker (one picker up at a time) */
      if (extrasOpen && (ids.length || fxPick)) { extrasOpen = false; extrasMark(); if (fxPick && FM.inspector && FM.inspector.refresh) FM.inspector.refresh(); }
      /* §3.12 rule 1b: a line dismisses on a selection change, so the new selection's tools are never hidden behind it */
      const selKey = ids.join(',');
      if (selKey !== lastSel) { if (lastSel !== null && FM.simpleTimeline && FM.simpleTimeline.clearSay) FM.simpleTimeline.clearSay(); lastSel = selKey; }
      if (panelFor && (ids.length !== 1 || ids[0] !== panelFor)) { panelFor = null; panelKind = null; lookUndrag(); }
      if (rowFor && (ids.length !== 1 || ids[0] !== rowFor.id || !FM.layerById(FM.scene, rowFor.id))) rowFor = null;
      if (fxPick && (fxPick.sel !== selKey || (fxPick.id && !FM.layerById(FM.scene, fxPick.id)))) fxPick = null;   // Phase 3 · Effect segments: another selection closes the picker
      growSync();   // 7B: on a PC the band is grown exactly while a panel is up
      const one = ids.length === 1 ? ids[0] : null, l = one && FM.layerById(FM.scene, one);
      roomy = !!one && roomForTwo();   // measured only for one item, the only tray that can take two rows
      const rowTarget = rowFor && FM.spine.soundTargetId ? FM.layerById(FM.scene, FM.spine.soundTargetId(R, rowFor.id)) : null;   // 2.3: a row redraws when what it shows changes
      const rowSig = rowFor ? [rowFor.kind, rowFor.from, rowTarget ? [rowTarget.fadeIn, rowTarget.fadeOut, JSON.stringify(rowTarget.volume), JSON.stringify(rowTarget.speed), rowTarget.duration].join('|') : '', (l && rowFor.kind === 'audio') ? [l.reversed, l.muted, R.units[l.id] && (R.followers[l.id] || []).length].join('|') : ''].join('#') : '';
      /* the selected item's KIND, HOST and ROW from this read (queue 980, verify medium-tray; ported from BX1d 5f10fdb): a layer
         made in the same refresh (Text, Sound effects, Record voice) is synced first from the timeline's previous read, which
         has never heard of it, and drew the overlay tray (Into row, Crop) under a text or a sound; the rebuild's own sync then
         computed the same signature and kept it. Its kind from the fresh read differs, so the tray is drawn again. */
      const sig = [ids.join(','), panelFor, panelKind, roomy, rowSig, trExtras(), FM.spine.muteMode && FM.spine.muteMode(), l ? [l.start, l.duration, l.locked, JSON.stringify(l.sm || null), l.type, l.audioOnly, JSON.stringify(l.trIn || null)].join('|') : '', one && R.units[one] ? R.units[one].kind + '/' + (R.units[one].host || '') + '/' + (R.isMain(one) ? 'm' : 'o') : '', R.main.map(e => e.id + (e.seam ? e.seam.kind : '')).join(','), R.trackEnd, segSig(l)].join('#');
      if (sig === lastSig) return;
      lastSig = sig;
      /* THE PRESSED TOOL KEEPS FOCUS (§3.12 1a, §8.10 item 6; review finding 27): a press that changes the clip rebuilds the
         row, and focus fell to <body> with the button it was on, so a second Enter on the same tool did nothing.
         Restored only when focus was already in the tray, so a tap on the timeline never pulls focus here. */
      const ae = document.activeElement, hadFocus = !!(ae && ae !== tray && tray.contains(ae));
      const focusKey = hadFocus ? ((ae.dataset && ae.dataset.tool) || '') : '';
      const afterRow = rowLast; rowLast = '';
      FM.simpleTools._fill(R, ids, one, S);
      if (hadFocus) {
        const want = focusKey === 'rowBack' ? afterRow : focusKey;   // Done goes back to the Speed / Volume / Fade that opened the row
        const n = (want && tray.querySelector('[data-tool="' + CSS.escape(want) + '"]')) || tray.querySelector('button, input');
        if (n) n.focus({ preventScroll: true });
      }
    },
    _fill(R, ids, one, S) {
      fills++;
      /* Phase 3 · Look: THE TOOL STRIP KEEPS ITS PLACE WHEN THE SAME TRAY IS DRAWN AGAIN. Look joined a clip's tools, so a video clip's
         tray is eleven and keeps one scrolling row on a PC too (his pick B holds ten), and every press redraws the tray: the strip
         went back to its start, so a tool pressed past the first screen (Close gap, Replace, Move later on a phone) left the place
         under the finger and a second press found another tool. §3.12 1(a): the pressed tool stays where it was. A new selection,
         or another row (Length, Speed…), starts at the beginning as before. */
      segUndrag();   // Phase 3 · Effect segments: a redraw never leaves the Strength slider's preview in the document
      const old = tray.querySelector(':scope > .sm-runbox > .sm-run'), key = [ids.join(','), rowFor ? rowFor.kind : '', panelFor ? panelKind : '', fxPick ? 'fx/' + (fxPick.id || '') + (fxPick.on ? '/on' : '') : ''].join('#');
      const keepLeft = (old && key === stripKey) ? old.scrollLeft : 0;
      stripKey = key;
      if (runSeen) runSeen.disconnect();   // SU1 #15: the old tool strip goes with the old tools
      tray.textContent = '';
      tray.classList.toggle('sm-tray-len', !!rowFor);
      let two = false;
      hintUp = false;   // fillTray puts it back when the hint is drawn
      try { two = fillTray(R, ids, one, S); } finally { rows(two); splitMark(hintUp); fxMark(); }
      if (keepLeft > 0) { const run = tray.querySelector(':scope > .sm-runbox > .sm-run'); if (run) { run.scrollLeft = keepLeft; edges(run); } }
    },
    /* "More": today's panel for the selection, docked under the tray (phone) or in the band above it (PC) */
    /* unlatch: a closed sheet comes back (finding 20); armSheet: 2.7 (#1171), see sheetGuard */
    openPanel(id) { lookUndrag(); panelFor = id; panelKind = 'more'; lastSig = ''; if (FM.mobile && FM.mobile.unlatch) FM.mobile.unlatch(); FM.refreshAll(); armSheet(); },
    closePanel() { if (!panelFor) return; lookUndrag(); panelFor = null; panelKind = null; lastSig = ''; FM.refreshAll(); },
    /* More pressed again closes what it opened (first-user audit item 4: only a tap on empty timeline did). It is up when the
       phone's sheet is open on this item (a grab-bar close leaves panelFor set, and More then raises it again, finding 20) or
       the PC band shows it. The second click of a double click never closes it, so a double tap does not open and shut it.
       Phase 3: Look's panel is the same place with its own contents, so More over an open Look (or Look over More) swaps them. */
    togglePanel(id, e) { return this._toggle('more', id, e); },
    toggleLook(id, e) { return this._toggle('look', id, e); },
    _toggle(kind, id, e) {
      const sheet = document.getElementById('inspector-panel'), phone = FM.mobile && FM.mobile.isPhone ? FM.mobile.isPhone() : false;
      if (!(panelFor === id && panelKind === kind && (!phone || (sheet && sheet.classList.contains('open'))))) return kind === 'look' ? this.openLook(id) : kind === 'lines' ? this.openLines(id) : this.openPanel(id);
      if (!(e && e.detail >= 2)) this.closePanel();
    },
    /* Phase 3 · Look: Look's own panel for this clip, where More's docks (the sheet under the tray on a phone; inside the band above
       the tray on a PC, D20 A). It opens on Filters. */
    openLook(id) { lookUndrag(); panelFor = id; panelKind = 'look'; lookTab = 'filters'; lookSeen = ''; lastSig = ''; if (FM.mobile && FM.mobile.unlatch) FM.mobile.unlatch(); FM.refreshAll(); armSheet(); },
    /* js/inspector.js asks this before drawing its layer editor: true when it drew Look's panel instead. False whenever Simple is not
       on screen or Look is not the panel open for this layer, so Full's panel is exactly today's. */
    drawPanel(root, layer, title) {
      if (root && !layer && isSimple() && extrasOpen) return drawExtras(root, title);   // Phase 3 · Clips › Extras: the band with nothing selected (PC)
      if (root && layer && isSimple() && panelKind === 'lines' && panelFor === layer.id) return this._drawLines(root, layer, title);   // Phase 3 · Captions
      if (!root || !layer || !isSimple() || panelKind !== 'look' || panelFor !== layer.id) return false;
      lookUndrag();   // a redraw while a finger is still on a slider (a refresh from elsewhere) never leaves its preview in the document
      if (title) title.textContent = '';
      const view = layer.id + '/' + lookTab, same = view === lookSeen;
      lookSeen = view;
      if (!same) { lookLeft = 0; lookTop = 0; }
      lookPanel(root, layer);
      if (same) {
        const st = root.querySelector('.sm-look-strip');
        if (st && lookLeft) st.scrollLeft = lookLeft;
        if (lookTop) root.scrollTop = lookTop;
      }
      const ae = document.activeElement;
      if (lookFocus && (!ae || ae === document.body || !ae.isConnected)) {
        const f = root.querySelector('[data-look="' + CSS.escape(lookFocus) + '"]');   // an imported preset's id is kept as given (sm3 review, lens 2)
        if (f) f.focus({ preventScroll: true });
      }
      return true;
    },
    panelKind: () => panelKind,
    lookTab: () => lookTab,
    /* Phase 3 · Captions: Edit lines, a caption track's lines where More's and Look's panels dock; pressed again it closes (as More) */
    toggleLines(id, e) { return this._toggle('lines', id, e); },
    openLines(id) { lookUndrag(); panelFor = id; panelKind = 'lines'; linesSeen = ''; lastSig = ''; if (FM.mobile && FM.mobile.unlatch) FM.mobile.unlatch(); FM.refreshAll(); armSheet(); },
    _drawLines(root, layer, title) {
      if (!(layer.type === 'text' && Array.isArray(layer.captions))) return false;
      if (title) title.textContent = '';
      const same = layer.id === linesSeen;
      linesSeen = layer.id;
      if (!same) linesTop = 0;
      linesPanel(root, layer);
      if (same && linesTop) root.scrollTop = linesTop;
      return true;
    },
    openRow(kind, id, from) { if (!ROWS[kind]) return; if (fxPick) { fxPick = null; segUndrag(); } rowFor = { kind: kind, id: id, from: from || null }; lastSig = ''; this.sync(); },   // (a row closes the Effects picker, as openEffects closes a row: the 2.7 ◇ pressed with the picker up opens its row at once, the 7 Nov review)   // 2.3: Speed, Volume, Fade; S9: Audio (and `from` = the row Done returns to)
    /* Phase 3 · Effect segments: the effects picker in the tray row, for a new segment (null: the project row's Effects) or for that
       segment's Change effect. Pressed again for the same target it closes. */
    openEffects(id) {
      const want = id || null, sel = (FM.selectionIds ? FM.selectionIds() : []).join(',');
      if (fxPick && fxPick.id === want) { this.closeEffects(); return; }
      segUndrag(); fxPick = { id: want, sel: sel }; rowFor = null; lastSig = ''; this.sync();
    },
    closeEffects() { if (!fxPick) return; fxPick = null; lastSig = ''; this.sync(); },
    /* Phase 3 · Effects on an item: the picker in the tray row for an effect ON this item (Add effect in its tray); pressed again for
       the same item it closes. Only while Simple is on screen, so nothing opens or draws in Full. */
    openItemEffects(id) {
      if (!id || !isSimple()) return;
      if (fxPick && fxPick.on && fxPick.id === id) { this.closeEffects(); return; }
      const sel = (FM.selectionIds ? FM.selectionIds() : []).join(',');
      segUndrag(); fxPick = { id: id, sel: sel, on: true }; rowFor = null; lastSig = ''; this.sync();
    },
    fxPick: () => fxPick,
    /* Phase 3 · Clips › Extras: open (nothing selected; a selection is let go first), close, and whether it is up. Only while Simple
       is on screen: in Full openExtras opens nothing. */
    openExtras() {
      if (!isSimple() || !mount()) return false;
      closeMenu();
      if (fxPick) { fxPick = null; segUndrag(); }   // one picker up at a time
      if (FM.selectionIds && FM.selectionIds().length && FM.selectLayer) FM.selectLayer(null);
      if (phone.matches) {
        if (!FM.mobile || !FM.mobile.openAdd || !FM.addMenu || !FM.addMenu.render) return false;
        FM.mobile.openAdd();
        const sheet = document.getElementById('add-sheet'), grid = document.getElementById('add-grid');
        if (!sheet || !grid || !sheet.classList.contains('open')) return false;   // a Viewer adds nothing: the sheet stays down
        FM.addMenu.render(grid, { variant: 'sheet', tabs: extrasTabs(), onAfterAdd: () => { if (FM.mobile && FM.mobile.closeAdd) FM.mobile.closeAdd(); } });
        const am = grid.querySelector(':scope > .addmenu'); if (am) am.dataset.sm = 'extras';
        return true;
      }
      extrasOpen = true; extrasMark();
      if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
      lastSig = ''; this.sync();
      return true;
    },
    closeExtras() {
      extrasSheetOff();
      if (!extrasOpen) return;
      extrasOpen = false; extrasMark();
      if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
      lastSig = ''; this.sync();
    },
    extrasOpen: () => extrasOpen || !!document.querySelector('#add-sheet.open > #add-grid > .addmenu[data-sm="extras"]'),
    rowFor: () => rowFor,
    panelFor: () => panelFor,
    /* js/mobile.js asks before raising the sheet for a selection; js/inspector.js before drawing the band */
    sheetHeld(id) { return isSimple() && panelFor !== id; },
    /* (Phase 3 · Clips › Extras: with nothing selected and Extras up, the band draws Extras instead of its line) */
    bandIdle(layer) { return isSimple() && !(layer && panelFor === layer.id) && !(!layer && extrasOpen); },
    /* …and the words it shows there while idle: a selected item's say where its tools are, "· More opens the rest" unless
       every tool is on show on the tray's two rows */
    bandWords: bandWords,
    /* suite seam (sm3 review, lens 6: Look's remembered focus and scroll and the #1171 arm time are state too, so one test's
       Look panel can no longer hand focus, or a held press, to the next) */
    _reset() { lookUndrag(); segUndrag(); panelFor = null; panelKind = null; lookTab = 'filters'; lookSeen = ''; lookLeft = 0; lookTop = 0; lookFocus = ''; sheetArmAt = -1e9; clearTimeout(sheetOff); sheetListen(false); linesSeen = ''; linesTop = 0; rowFor = null; fxPick = null; extrasOpen = false; extrasSheetOff(); growTo(false); tfClear(); lastSig = ''; stripKey = ''; closeMenu(); },
    _menu: () => menu,
    ICON: ICON
  };
})(window.FM);
