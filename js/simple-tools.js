/* FreeMotion — FM.simpleTools: the Simple editor's bar (Simple mode Phase 2, DESIGN.md §8.2, §8.3, §8.5; #1243 S3, S9, S15).
 *
 * ONE BAR, ONE 56 px ROW, FOUR MODES (#1243 R rule 1; his words, 8 Nov: "when you actually tap on a layer, that first row goes
 * away", and "I don't want two menus at once"). #sm-bar[data-mode]:
 *   project — nothing selected: the project tools (#sm-tools), Clips · Text · Captions · Sound · Overlay · Look · Effects;
 *   item    — the selection's tools (#sm-tray), a ‹ first that clears the selection;
 *   sub     — a row that replaces the bar (#sm-tray again): a ‹ back one level, then that row's choices (Clips, Sound,
 *             Captions, the effects pickers, Speed, Volume, Opacity, Transform, Fade, Strength, Transition — the SUBS table);
 *   panel   — a panel is up (a text's Style, Edit lines, Extras, and Look, the project's since #1243 S12; Export, from the Export button, since #1243 S6): the bar hides, the panel has the room.
 * Every row is one strip that scrolls sideways with fades at the edge that hides tools (S15: "make it like CapCut where you
 * can scroll it"), never squeezed. Simple's spoken lines float as a 44 px strip just above the bar (#sm-say), so nothing moves.
 * #1243 R release 8 (THE TRAYS): one tray order with section lines between its groups and Delete last, scrolling with the rest (S31);
 * no More (S4); a PC shows the same single strip (R decision 6: the two-row grid and its › cue are gone).
 * Phone: the bar sits under the Simple timeline, and a panel runs from the stage's bottom edge to the bottom of the screen
 * (#1243 R rule 3, js/mobile.js sheetLine); the stage never shrinks. PC: the bar sits at the bottom of the left band, and a
 * panel takes the whole band while the bar hides (D20 A, his pick).
 *
 * One home per control (§8.5, his #310): Split is the first of every item's own tools (#1243 S5, no ✂ on the play row), Close all
 * gaps is in the Clips row (no ⋯ in Simple since S5), Add clips is the clip row's + and Clips. Every command goes through FM.spine.cmd, so it is one undo step and refuses with a line when it must.
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
    cutend: '<path d="M3.5 12H14M11 9l3 3-3 3"/><path d="M18 5v14"/>',
    /* #1243 S5: Split, the play row's ✂ drawing (index.html had it there until Split moved onto the item's tools) */
    split: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.5 15.5M8.5 8.5L20 20"/>',
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
    strength: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    /* #1243 R release 8: Opacity, Transform and Transform's row (our own drawings, the D16 A stroke) */
    opacity: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 4h8v8H4zM12 12h8v8h-8z" fill="currentColor" fill-opacity=".45" stroke="none"/>',
    transform: '<rect x="7" y="7" width="10" height="10" rx="1.5" stroke-dasharray="2.4 2"/><path d="M3.5 7.5v-4h4M16.5 3.5h4v4M20.5 16.5v4h-4M7.5 20.5h-4v-4"/>',
    mirror: '<path d="M12 3v18" stroke-dasharray="2 2"/><path d="M9.5 7L4 17h5.5zM14.5 7L20 17h-5.5z"/>',
    flipv: '<path d="M3 12h18" stroke-dasharray="2 2"/><path d="M7 9.5L17 4v5.5zM7 14.5L17 20v-5.5z"/>',
    turn: '<rect x="3.5" y="9.5" width="11" height="11" rx="1.5"/><path d="M9 4.5h4.5a6 6 0 0 1 6 6V14"/><path d="M17 11.5l2.5 2.5 2.5-2.5"/>',
    centre: '<circle cx="12" cy="12" r="2.2"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
    reset: '<path d="M5 12a7 7 0 1 0 2.05-4.95"/><path d="M4.5 3.5v4h4"/>',
    /* #1243 R release 8b: S33's look and sound doors (our own drawings, the D16 A stroke) */
    motionblur: '<circle cx="15" cy="12" r="5.5"/><path d="M2.5 8.5h5M2 12h5M2.5 15.5h5"/>',
    smoothskin: '<circle cx="11" cy="13" r="7.5"/><path d="M8 15a3.6 3.6 0 0 0 6 0"/><path d="M19 2.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    quieter: '<path d="M2.5 12h2l1.5-5 2 10 2-8 1.5 3h2"/><path d="M18.5 5.5v11M15.5 13.5l3 3 3-3"/>',
    soundstyles: '<rect x="7.5" y="3" width="6" height="10.5" rx="3"/><path d="M4.5 10.5a6 6 0 0 0 12 0M10.5 16.5v4M7.5 20.5h6"/><path d="M19.5 3l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z"/>',
    clearvoice: '<rect x="9" y="3" width="6" height="10.5" rx="3"/><path d="M6 10.5a6 6 0 0 0 12 0M12 16.5v4"/><path d="M2.5 8v5M21.5 8v5"/>',
    /* #1243 R release 10 (S27 A): Slide — a fixed window over a strip of film, an arrow each way under it (our own drawing) */
    slide: '<rect x="7" y="3.5" width="10" height="11" rx="1.5"/><path d="M2.5 6v6M21.5 6v6"/><path d="M4 19.5h16M7 17l-3 2.5L7 22M17 17l3 2.5-3 2.5"/>'
  };
  const svg = n => '<svg viewBox="0 0 24 24" class="sm-ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[n] || ICON.more) + '</svg>';
  const W = () => (FM.spineWords && FM.spineWords.tools) || {};
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  let bar = null, tray = null, tools = null;   // (the floating list, `menu`, went with its last user: Export is a panel since #1243 S6)
  let panelFor = null, lastSig = '', lastSel = null;
  /* #1243 S9: THE SUB-ROW ON THE BAR ({key: a SUBS key, id: the item it acts on or null, from: the sub ‹ returns to, sel: the
     selection it was opened with — any other selection closes it}); the data-tool focus goes to after a ‹ */
  let subFor = null, backTo = '';
  const ROW_KEYS = new Set(['speed', 'volume', 'opacity', 'transform', 'fade', 'transition', 'strength', 'soundstyles', 'slide']);   // the item rows rowFor() still names (#1243 S28: Audio's went; 8b: Sound styles; 10: Slide)
  let fills = 0, lastPress = null;   // how many times the tray was refilled; the tool a pointer's last single click pressed
  let rowN = 0;                      // how many times the bar has shown another row (_fill): tool()'s double-tap hold (HW5)
  /* Phase 3 · Look: which panel panelFor's band / sheet shows ('more' = Full's own panel for the item — More opened it until #1243 S4; a
     text's Style and a caption track's Style open it now — 'look' = Look's own), Look's open tab, a
     slider's live preview to take back ({id, pre}), and where the panel was (its strip's scroll, its own scroll, the control with
     focus) so the redraw after each step leaves it there. stripKey: the tray whose tool strip keeps its scroll across a refill. */
  let panelKind = null, lookTab = 'filters', lookDrag = null, lookSeen = '', lookLeft = 0, lookTop = 0, lookFocus = '', stripKey = '';
  /* #1243 S12: Look is the PROJECT's (his words: "you shouldn't have the look menu on each layer"), so its panel is open for no layer:
     panelFor is PROJECT then, held only while nothing is selected (a selection closes it, as one closes Extras) */
  const PROJECT = '@look';
  /* Phase 3 · Captions: Edit lines is a third kind of panelFor's panel ('lines'); the layer it last drew and how far it was scrolled */
  let linesSeen = '', linesTop = 0;
  /* Phase 3 · Effect segments: the Strength slider's live preview to take back (the effects pickers are sub-rows since #1243 S9). Since
     #1243 R release 8 the same holder serves Opacity's and Size's sliders: {id, key: the transform key it previews, pre, last} */
  let segDrag = null;
  /* (THE PC TRAY ON TWO ROWS — his pick B of 6 Oct, TWO_ROW_MAX, roomForTwo and the band measure behind it — went in #1243 R release 8,
     R decision 6: "S15's strip is the only overflow cue". A PC shows the same single scrolling strip as a phone, with its section lines.) */
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
    bar = document.getElementById('sm-bar');
    tray = document.getElementById('sm-tray'); tools = document.getElementById('sm-tools');
    if (!bar || !tray || !tools) { bar = null; return false; }
    /* sync places it, or sends it home. The PC band's Extras has no home on a phone (a phone's Extras is the Add sheet): crossing to a
       phone width with it up gives the Clips row back, or the bar sat in panel mode with no panel and no way back (the 9 Nov review, MODE-2) */
    if (phone.addEventListener) phone.addEventListener('change', () => {
      if (phone.matches && extrasOpen) { extrasOpen = false; extrasMark(); if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh(); }
      lastSig = ''; FM.simpleTools.sync();
    });
    if (FM.editor && FM.editor.onChange) FM.editor.onChange(m => {
      /* nothing else runs sync() in Full (Phase 3 · Effect segments: a Strength preview is taken back; · Clips › Extras: it closes; #1243 S9:
         the sub-row closes, and the bar's mode, the band title's ‹ and the floating hint go, so Full's band and #sm-bar are exactly today's) */
      if (m !== 'simple') { home(); subFor = null; pbackSync(null); segUndrag(); extrasOpen = false; extrasSheetOff(); hintSync('off'); bar.removeAttribute('data-mode'); bar.removeAttribute('data-sub'); bar.style.removeProperty('--sm-sheet-b'); }
      /* #1243 S12: the project's Look panel belongs to no selection, so it closes on the way out, as Extras does (a trip back to Simple
         never finds it raised over nothing) */
      if (m !== 'simple' && panelFor === PROJECT) { lookUndrag(); panelFor = null; panelKind = null; }
      /* review L1-3 / L3-1 (11 Nov): Full's ⋯ strip (#opt-bar: Loop, preview speed, snapping, marks) is put away on the way INTO Simple.
         Simple has no ⋯ (S5), so a strip left open in Full sat over Simple's stage with nothing there to close it. Only on entering Simple;
         Full's ⋯ and its strip are exactly today's. */
      if (m === 'simple' && FM.closeOptBar) FM.closeOptBar();
      /* …AND THE LEFT PANEL IS REDRAWN FOR THE EDITOR NOW ON SCREEN (queue 980, verify high-inspector). Nothing on the switch
         path redrew #inspector, so Full kept Simple's band words ("Tap a clip to see its tools") in place of its Add menu or
         layer editor, and a phone's sheet stayed shut, until the selection changed; entering Simple kept Full's Add menu
         under Simple's rows the same way. The inspector's own refresh, then the title refreshAll gives it (syncTopBar), so
         the panel is exactly what that editor draws. Runs only on a switch, so Full that never saw Simple is untouched. */
      if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
      if (FM.syncTopBar) FM.syncTopBar();
      if (FM.updateReadout) FM.updateReadout();   // 2.7 (SU1 #14): the pill's words follow the editor (Simple's 0:03 / 0:12, Full's 00:03:12)
    });
    /* THE BODY'S CLASSES WHILE SIMPLE IS ON SCREEN (#1243 S9 and rule 3). Entering Simple still resizes the phone stage (Full's 40svh
       to Simple's 100svh less 380 px), and nothing re-measures the preview when only the stage changes size (js/app.js stageResized), so
       the preview and the selection box are re-fitted then. More's panel no longer changes the stage (rule 3: the stage never shrinks),
       so the sheet's insp-open only re-syncs the bar: a grab-bar or swipe close of the phone sheet puts it back in item mode. Opening
       Home closes a sub-row and Extras. Leaving Simple calls nothing here, so Full is today's. */
    let wasSimple = document.body.classList.contains('ed-simple'), wasSheet = document.body.classList.contains('insp-open'), wasHome = document.body.classList.contains('home-open');
    if (window.MutationObserver) new MutationObserver(() => {
      const b = document.body.classList, s = b.contains('ed-simple'), sh = b.contains('insp-open'), hm = b.contains('home-open');
      if (s && !wasSimple) requestAnimationFrame(() => { if (FM.refreshPreviewScale) FM.refreshPreviewScale(); if (FM.canvasEdit && FM.canvasEdit.stageResized) FM.canvasEdit.stageResized(); });
      /* …and Extras as closeExtras closes it, its band drawn again and Clips no longer pressed: the band kept Extras' menu and title under
         the project row after Home (the 9 Nov review, HW2) */
      if (s && hm && !wasHome && (subFor || extrasOpen)) {
        subFor = null; segUndrag();
        if (extrasOpen) { extrasOpen = false; extrasMark(); if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh(); }
        extrasSheetOff();
      }
      /* THE PHONE SHEET GOING AWAY UNCOVERS THE PLAY ROW AND THE TIMELINE under the finger that closed it (the 9 Nov review, MODE-4):
         armShut holds the next real press there for 450 ms, as armSheet holds one on a panel that has just risen. Only when a real press
         on the sheet closed it (its grab bar, a swipe, a ‹: sheetPressAt, noted below): a sheet that goes for any other reason (an undo,
         a selection made elsewhere) has no finger on it, and holding the timeline's next press then would only eat a real tap. */
      if (s && wasSheet && !sh && performance.now() - sheetPressAt < 1000) armShut();
      if (s && (sh !== wasSheet || hm !== wasHome)) { lastSig = ''; FM.simpleTools.sync(); }
      wasSimple = s; wasSheet = sh; wasHome = hm;
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    /* …and the phone's Add sheet, which holds Extras there (a panel: the bar hides while it is up, and the Clips row is back when it goes).
       In Full the callback runs and does nothing. */
    const addSh = document.getElementById('add-sheet');
    if (addSh && window.MutationObserver) new MutationObserver(() => { if (isSimple()) { lastSig = ''; FM.simpleTools.sync(); } }).observe(addSh, { attributes: true, attributeFilter: ['class'] });
    /* (the two-row tray followed the band's height here, a resize or the divider's drag, until #1243 R release 8 made it one strip) */
    /* 2.7 (#545): More transition controls flipped in Settings while Simple is on screen: the ◇s and an open Transition row are drawn
       again at once (the tray's signature carries the switch too). Any other setting changing does nothing here. */
    if (FM.settings && FM.settings.onChange) {
      let ex = trExtras(), dm = demoOn();
      FM.settings.onChange(() => {
        /* review L4-1: Demo mode flipped with Your media open redraws that row (its signature carries the switch); nothing else here */
        const d = demoOn();
        if (d !== dm) { dm = d; if (isSimple() && subFor && subFor.key === 'yourmedia') FM.simpleTools.sync(); }
        const now = trExtras();
        if (now === ex) return;
        ex = now; lastSig = '';
        if (isSimple() && FM.simpleTimeline && FM.simpleTimeline.rebuild) FM.simpleTimeline.rebuild();
      });
    }
    buildTools();
    /* #1243 S5 (his words: "for the play button row, get rid of the playback options… just so that row is really simple"): Simple has
       no ⋯ any more (styles.css hides it in Simple; Full's is untouched). Its Close all gaps and Sort by date taken are in the Clips row,
       and Loop and preview speed stays Full's. #1243 S34 A: LINK takes the play row's first place, one switch for the whole project. */
    const lk = document.getElementById('btn-sm-link');
    if (lk) lk.addEventListener('click', () => { if (isSimple() && FM.spine && FM.spine.cmd && FM.spine.linkMode) FM.spine.cmd.link(!FM.spine.linkMode()); });
    /* 2.7 (SU1 #20, his "2A" 14 Oct): SIMPLE'S EXPORT IS ITS OWN, not Full's dialog (120 fps, Custom, "Export just this layer", the loop
       region). Capture phase on the button both editors share (the phone's ⬆ clicks it), only while Simple is on screen (as Simple's ⋯
       did until #1243 S5 took it off the play row). #1243 S6 (his words: "Just make an export menu, but make it simple and easy to
       read"): it opens Simple's Export PANEL (exportPanel below), and pressed again it closes it, as Full's button closes its dialog
       (queue 925). In Full this listener returns at once, so Full's Export is today's. */
    const xb = document.getElementById('btn-export');
    if (xb) xb.addEventListener('click', e => {
      if (!isSimple()) return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (exportUp()) { FM.simpleTools.closePanel(); return; }
      /* a viewer whose owner turned exporting off is told at once, as Full's dialog tells him before it opens (js/app.js exportTurnedOff) */
      if (FM.exportTurnedOff && FM.exportTurnedOff()) { if (FM.sayExportTurnedOff) FM.sayExportTurnedOff(); return; }
      FM.simpleTools.openExport();
    }, true);
    /* A PLAIN MOUSE WHEEL SCROLLS THE TRAY SIDEWAYS (review finding 22, his #976: "on pc without trackpad there seems to be no
       way to slide"). Only a vertical wheel over a row that overflows, and only while it can still move; a trackpad's own
       sideways swipe and a finger are left to the browser. Since SU1 #15 a one-row tray scrolls in its tool strip (.sm-run),
       not the tray, so the wheel moves whichever of the two is the scroller; since #1243 S15 the project row is a strip too. */
    function wheelOn(host) {
      host.addEventListener('wheel', e => {
        if (!e.deltaY || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
        const sc = host.querySelector(':scope > .sm-runbox > .sm-run') || host, max = sc.scrollWidth - sc.clientWidth; if (max <= 0) return;
        const to = Math.max(0, Math.min(max, sc.scrollLeft + e.deltaY));
        if (to === sc.scrollLeft) return;
        e.preventDefault(); sc.scrollLeft = to;
      }, { passive: false });
    }
    wheelOn(tray); wheelOn(tools);
    /* Phase 3 · Look: the panel is drawn again after every step it takes, so it remembers which of its controls had focus and how
       far it was scrolled. These only note things, and only for Look's own controls (data-look); nothing here acts in Full. */
    /* when a real press last came down on the phone's sheet (armShut asks): passive, and it notes nothing in Full */
    const ipanel = document.getElementById('inspector-panel');
    if (ipanel) ipanel.addEventListener('pointerdown', e => { if (e.isTrusted && isSimple()) sheetPressAt = performance.now(); }, { capture: true, passive: true });
    const insp = document.getElementById('inspector');
    if (insp) {
      insp.addEventListener('focusin', e => { if (!isSimple()) return; const t = e.target; lookFocus = (t && t.dataset && t.dataset.look) || ''; });
      insp.addEventListener('scroll', () => { if (isSimple() && panelKind === 'look' && insp.querySelector(':scope > .sm-look')) lookTop = insp.scrollTop; }, { passive: true });
      document.addEventListener('pointerdown', e => { if (lookFocus && !insp.contains(e.target)) lookFocus = ''; }, true);
    }
    return true;
  }
  function tool(t) {
    const b = el('button', t.cls || 'sm-tool');   // t.cls: the ‹s (#1243 S9); no tool is pinned since #1243 S31 (Delete scrolls with the rest)
    b.type = 'button'; b.dataset.tool = t.id;
    b.innerHTML = t.icon === null ? '' : svg(t.icon);                 // a fixed string, never user data (null: a text-only tool, a speed preset)
    if (t.label) b.appendChild(el('span', 'sm-tool-l', t.label));    // a ‹ is its icon alone
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
      /* …AND A TOUCH'S SECOND TAP, WHICH MAY COUNT 1 (the 9 Nov review, HW5): since #1243 S3 and S9 every press that changes the row puts
         another tool under the finger (the item ‹ → Clips, Clips → the row's ‹, Text → Edit words, Speed's ‹ → Audio's), and a tap's
         click is not sure to count to 2 like a mouse's (nor is a real input driver's). So a REAL pointer press on the bar within 450 ms of
         the row changing under the last press, at the same place, on another tool, is the double tap's second half and does nothing.
         Keyboard presses (detail 0) and script clicks are never held. */
      if (e.isTrusted && e.detail >= 1 && lastPress && lastPress.key !== key && lastPress.row !== rowN && performance.now() - lastPress.at < 450 &&
          Math.abs(e.clientX - lastPress.x) < 24 && Math.abs(e.clientY - lastPress.y) < 24) return;
      if (e.detail >= 1) lastPress = { key: key, fill: fills, row: rowN, at: performance.now(), x: e.clientX, y: e.clientY };
      if (b.getAttribute('aria-disabled') === 'true') { if (t.rest) t.rest(b, e); else if (t.why && FM.spine) FM.spine.say(t.why); return; }   // t.rest: a resting tool whose why has a button (release 8b review)
      t.run(b, e);
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
  /* ═══ #1243 S9: THE PROJECT TOOLS' OWN ROWS. Clips, Sound and Captions opened a small floating list over the bar; now each opens a
     sub-row that takes the bar's place (his words: "when you open up any of these sub menus, I want the first menu to go away"), with
     exactly the choices the lists had, as text-only tools (no new glyphs: #1243 S8 draws these rows with their options later). A
     choice that acts closes the sub-row first, as the list closed on a pick. ═══ */
  function closeSub() { subFor = null; lastSig = ''; FM.simpleTools.sync(); }
  /* Clips: Add clips (the picker, or At the end / After Clip N with the playhead inside the clips) and Extras, a panel that keeps the row
     under it. #1243 S5 (R's Clips row): then what the play row's ⋯ used to hold, Close all gaps while there is a gap or an overlap, and
     Sort by date taken while at least two clips of the row carry a capture date (2.4b, §3.6) */
  function clipsRow(R, s, run) {
    const w = W(), S = FM.spine;
    const out = [{ id: 'addClips', label: w.addClips || 'Add clips', icon: null, run: () => { closeSub(); clipsTool(); } },
                 { id: 'extras', label: w.extras || 'Extras', icon: null, title: w.extrasTitle, run: () => FM.simpleTools.openExtras() }];
    if (R.main.some(e => e.seam && !e.seam.covered && (e.seam.kind === 'gap' || e.seam.kind === 'overlap'))) out.push({ id: 'closeAll', label: w.closeAll || 'Close all gaps', icon: null, run: () => { closeSub(); S.cmd.closeAll(); } });
    if (R.main.filter(e => !e.slot && Number.isFinite(+((FM.layerById(FM.scene, e.id) || {}).taken))).length >= 2) out.push({ id: 'sortDate', label: w.sortByDate || 'Sort by date taken', icon: null, run: () => { closeSub(); S.cmd.sortByDate(); } });
    out.forEach(t => run.appendChild(tool(t)));
  }
  function soundRow(R, s, run) {
    const w = W();
    [{ id: 'music', label: w.music || 'Music from your files', icon: null, run: () => { closeSub(); pick('audio/*,video/*', true, f => FM.spine.cmd.addMusic(f)); } },
     { id: 'sfx', label: w.sfx || 'Sound effects', icon: null, run: () => { closeSub(); if (FM.sfx && FM.sfx.open) FM.sfx.open(); } },
     { id: 'voice', label: w.voice || 'Record voice', icon: null, run: () => { closeSub(); if (FM.voiceRec && FM.voiceRec.open) FM.voiceRec.open(); } }]
      .forEach(t => run.appendChild(tool(t)));
  }
  /* Phase 3 · CAPTIONS (DESIGN §8.5 "Type captions · Find speech · Style"). Type captions adds a line at the playhead and opens the text
     editor on it; Find speech listens to the clips, then to the other sounds one at a time if the clips say nothing (S.speechSources);
     Style, once there is a caption track, opens today's panel for the one under the playhead (else the first).
     #1243 S3 (the 9 Nov review, HW1): Captions is on the project row, which shows only with nothing selected, and its row closes on a
     selection, so Find speech can no longer be pointed at ONE selected clip or sound: it listens as it does with nothing selected. A
     caption track's own Find speech listens again under that track. (One-item Find speech needs a home in a tray: #1243 S8/S33.)
     MODE-7: the row stays up while the playhead moves, so Style finds its track when it is pressed, not when the row was drawn. */
  const isCapTrack = l => !!l && l.type === 'text' && Array.isArray(l.captions);
  const capTrackNow = () => FM.spine.captionTrackAt(FM.time || 0) || FM.scene.layers.find(isCapTrack) || null;
  function captionsRow(R, s, run) {
    const w = W(), S = FM.spine;
    const out = [
      { id: 'capType', label: w.typeCaptions || 'Type captions', icon: null, run: () => { closeSub(); S.cmd.captionAdd(); } },
      { id: 'capFind', label: w.findSpeech || 'Find speech', icon: null, title: w.findSpeechTitle, run: () => { closeSub(); S.cmd.findSpeech({ from: null }); } },
      /* #1243 S8 (R (a) "Captions: Find speech · Type captions · Caption looks"): a row of looks for the track under the playhead; with no
         track yet it rests and says how to make one */
      { id: 'capLooks', label: w.capLooksRow || 'Caption looks', icon: null, title: w.capLooksTitle, disabled: !capTrackNow(), why: w.capLooksNone, run: () => FM.simpleTools.openSub('caplooks', null, 'captions') }
    ];
    /* KNOWN DEVIATION from 1243-R (review L3-7, 11 Nov): R's decision 3 drops Style from this row once Caption looks is in ("Captions drops
       Style and gains Caption looks"). It is still here, so the row has two doors to the captions' style; taking it out is left for R's
       own release, not done quietly in this one. */
    if (capTrackNow()) out.push({ id: 'capStyleTrack', label: w.capStyle || 'Style', icon: null, title: w.capStyleTitle, run: () => { const T = capTrackNow(); if (!T) return; FM.selectLayer(T.id); FM.simpleTools.openPanel(T.id); } });
    out.forEach(t => run.appendChild(tool(t)));
  }
  /* #1243 S8: CAPTION LOOKS (S.CAPTION_LOOKS, js/spine-edit.js). Each tile wears its look on a sample line drawn by the page (font, weight,
     slant, colour and outline as the track will; the word-by-word looks light their middle word the way the Word Highlight lights a spoken
     one); the track's own canvas shows the real thing the moment it is tapped. The track is the one under the playhead when the tile is
     pressed (capTrackNow, as Style finds it: MODE-7), and the look it wears now is pressed. Fixed strings only, never user data. */
  /* #1243 S8: TEXT'S ROW — Add text (what Text did until now), Title looks and Draw (his S17: "in the text menu… you can draw") */
  function textRow(R, s, run) {
    const w = W();
    [{ id: 'addText', label: w.addText || 'Add text', icon: null, run: () => { closeSub(); FM.spine.cmd.addText(); } },
     { id: 'titleLooks', label: w.titleLooksRow || 'Title looks', icon: null, title: w.titleLooksTitle, run: () => FM.simpleTools.openSub('titlelooks', null, 'text') },
     { id: 'draw', label: w.draw || 'Draw', icon: null, title: w.drawTitle, run: () => { closeSub(); startDrawing(); } }]
      .forEach(t => run.appendChild(tool(t)));
  }
  /* #1243 S17: DRAW is Full's own Sketching (js/draw-tool.js, its bar, its brush, its per-stroke undo). Simple adds one thing: on every way out
     of the sketch (Done, Enter, Close, Escape) draw-tool.js's one-shot onEnd hands back the drawing it made, and Simple places it as a new
     overlay (FM.spine.cmd.placeDrawing). A sketch that never started leaves no hook behind, and a sketch with no stroke places nothing. */
  function startDrawing() {
    if (!FM.startDraw || !FM.drawTool) return;
    FM.drawTool.onEnd = id => { if (id && isSimple() && FM.spine && FM.spine.cmd) FM.spine.cmd.placeDrawing(id); };
    FM.startDraw('freehand');
    if (!FM.drawTool.active) FM.drawTool.onEnd = null;
  }
  /* #1243 S8: OVERLAY'S ROW — Photo or video (the ONLY door to the native picker now) and Your media (what this device has imported before,
     js/medialib.js: no picker, no round trip through the Photos app); Your media rests, saying why, until something has been imported.
     (Stickers, his S16, is a later release: the research comes first.) */
  function overlayRow(R, s, run) {
    const w = W(), has = FM.spine.libraryVisuals ? FM.spine.libraryVisuals().length > 0 : false;
    [{ id: 'photoVideo', label: w.photoVideo || 'Photo or video', icon: null, run: () => { closeSub(); pick('video/*,image/*', true, f => FM.spine.cmd.addOverlay(f)); } },
     { id: 'yourMedia', label: w.yourMedia || 'Your media', icon: null, title: w.yourMediaTitle, disabled: !has, why: w.yourMediaNone, run: () => FM.simpleTools.openSub('yourmedia', null, 'overlay') }]
      .forEach(t => run.appendChild(tool(t)));
  }
  /* …and YOUR MEDIA: one tile per photo or video in the library, newest first, its thumbnail filled in when it is ready (FM.mediaLib.getThumb,
     an image the app made itself) and its name as text. A tap goes through FM.mediaLib.use — every one-stored-copy rule there (queue 915) —
     and Simple places the record it read (FM.spine.cmd.addOverlayRec): one step, at the playhead, in its band. */
  /* review L4-1 (11 Nov): DEMO MODE, as Full's Add menu honours it (addmenu.js: "Hides your photo and video previews (and their filenames)
     in the Add menu — so a screen recording never shows your camera roll"): each tile reads Photo or Video and shows no frame */
  function demoOn() { return !!(FM.settings && FM.settings.get && FM.settings.get('demoMode')); }
  function yourMediaFill(R, s, run) {
    const w = W(), lib = FM.mediaLib, list = FM.spine.libraryVisuals ? FM.spine.libraryVisuals() : [], hide = demoOn();
    list.slice(0, 60).forEach(e => {
      const kindWord = e.kind === 'image' ? (w.aPhoto || 'Photo') : (w.aVideo || 'Video');
      const b = tool({ id: 'media:' + e.mid, cls: 'sm-tool sm-libtile', label: String(hide ? kindWord : (e.name || kindWord)).slice(0, 40), icon: null,
        run: () => { closeSub(); useTile(lib, e.mid); } });
      const im = el('img', 'sm-libtile-img'); im.alt = ''; im.decoding = 'async';
      b.insertBefore(im, b.firstChild);
      if (!hide && lib && lib.getThumb) lib.getThumb(e.mid).then(u => { if (typeof u === 'string' && /^data:image\//.test(u) && im.isConnected) im.src = u; }).catch(() => {});   // only the app's own picture
      run.appendChild(b);
    });
  }
  /* review L1-1 / L3-2 / L4-2 (11 Nov): THE SWITCH IS HELD SHUT while the library reads, copies and decodes the file (S.reading, as afterRead
     holds it for the picker: review finding 10), and the record is placed only while Simple is still the editor. A first reuse writes the
     whole file ("Preparing…", seconds on a phone); without the hold the cog's switch went through and Simple's Add overlay step ran in Full.
     If Simple is somehow gone by then, place refuses (false) and the library lets the record go: nothing lands in Full. */
  function useTile(lib, mid) {
    if (!lib || !lib.use) return Promise.resolve(false);
    const S = FM.spine;
    S.reading = (S.reading || 0) + 1;
    let p;
    try { p = Promise.resolve(lib.use(mid, { place: rec => isSimple() ? S.cmd.addOverlayRec(rec) : false })); }
    catch (x) { p = Promise.resolve(false); }
    return p.finally(() => { S.reading = Math.max(0, (S.reading || 1) - 1); });
  }
  /* …and TITLE LOOKS (S.TITLE_LOOKS, js/spine-edit.js): each tile wears its type on a sample word; a tap adds a new title at the playhead in
     that look, one step, and opens it for typing, as Add text does. Its entrance plays on the canvas. */
  function titleLooksFill(R, s, run) {
    const S = FM.spine, w = W(), names = w.titleLooks || {};
    (S.TITLE_LOOKS || []).forEach(look => {
      const b = tool({ id: 'title:' + look.key, cls: 'sm-tool sm-caplook', label: names[look.key] || look.key, icon: null,
        run: () => { closeSub(); S.cmd.addText(look.key); } });
      b.insertBefore(capLookSample(look, w.titleLookSample || 'Title'), b.firstChild);
      run.appendChild(b);
    });
  }
  function capLookSample(look, sample) {
    const w = W(), t = look.text, h = look.hl, s = el('span', 'sm-caplook-s');
    s.style.fontFamily = t.fontFamily; s.style.fontWeight = t.bold ? '700' : '400'; s.style.fontStyle = t.italic ? 'italic' : 'normal'; s.style.color = t.color;
    if (t.stroke && t.stroke.enabled) s.style.webkitTextStroke = Math.max(0.6, t.stroke.width / 7).toFixed(1) + 'px ' + t.stroke.color;
    if (t.letterSpacing) s.style.letterSpacing = Math.min(3, t.letterSpacing / 4) + 'px';   // the look's spacing, scaled to a 13 px sample
    const words = String(sample || w.capLookSample || 'Every word').split(' ');
    words.forEach((wd, i) => {
      const on = !!h && i === Math.min(1, words.length - 1), p = el('span', on ? 'sm-caplook-on' : '', wd);
      if (on && h.style === 0) p.style.color = h.color;
      if (on && h.style === 1 && h.unit !== 2) { p.style.background = h.boxcolor; p.style.borderRadius = '4px'; p.style.padding = '0 3px'; }
      if (on && h.style === 2) { p.style.textDecoration = 'underline'; p.style.textDecorationColor = h.color; p.style.textDecorationThickness = '2px'; }
      if (on && h.style === 3) { p.style.display = 'inline-block'; p.style.transform = 'scale(' + ((h.grow || 120) / 100) + ')'; }
      s.appendChild(p); if (i < words.length - 1) s.appendChild(document.createTextNode(' '));
    });
    if (h && h.unit === 2) { s.style.background = h.boxcolor; s.style.borderRadius = '4px'; s.style.padding = '1px 5px'; }
    return s;
  }
  let capKeyDrawn = '';   // the track and look the open Caption looks row was drawn for (timeMoved, review L3-6)
  let splitDrawn = null;   // whether the line was inside the one selected item when its tray was drawn (timeMoved, the 11 Nov verifiers' V2)
  function capLooksFill(R, s, run) {
    const S = FM.spine, w = W(), names = w.capLooks || {}, T = capTrackNow(), cur = T && S.captionLookOf ? S.captionLookOf(T) : '';
    capKeyDrawn = T ? T.id + '/' + cur : '';
    (S.CAPTION_LOOKS || []).forEach(look => {
      const b = tool({ id: 'look:' + look.key, cls: 'sm-tool sm-caplook', label: names[look.key] || look.key, icon: null, pressed: cur === look.key,
        run: () => { const tr = capTrackNow(); if (!tr) { S.say(w.capLooksNone || ''); return; } S.cmd.captionLook(tr.id, look.key); } });
      b.insertBefore(capLookSample(look), b.firstChild);
      run.appendChild(b);
    });
  }
  /* THE PROJECT ROW (§8.5) is one strip that scrolls sideways (#1243 S15, his words: "don't just keep condensing it, like make it like
     CapCut where you can scroll it"): every tool at least 64 px, spreading when they all fit, a fade on the edge that hides more. Built
     once, so its scroll is kept across the trips to the other modes. */
  function buildTools() {
    const w = W();
    tools.textContent = '';
    const run = strip(tools);
    /* Phase 3 · Clips › Extras: Clips opens its row, Add clips (what Clips did until Phase 3) and Extras (DESIGN §8.5, D21 A) */
    [{ id: 'clips', label: w.clips || 'Clips', icon: 'clips', title: w.clipsTitle, run: () => FM.simpleTools.openSub('clips') },
     /* #1243 S8 (R (a) "Text | sub | Add text · Title looks · Draw"): Text opens its own row, as Clips, Captions and Sound do */
     { id: 'text', label: w.text || 'Text', icon: 'text', title: w.textTitle, run: () => FM.simpleTools.openSub('text') },
     /* Phase 3 · Captions, in the design's order (§8.5) */
     { id: 'captions', label: w.captions || 'Captions', icon: 'captions', title: w.captionsTitle, run: () => FM.simpleTools.openSub('captions') },
     { id: 'sound', label: w.sound || 'Sound', icon: 'music', run: () => FM.simpleTools.openSub('sound') },
     /* #1243 S8 (his words: "when you click overlay, it… shows up the iOS menu… it should open up to another menu and then you press a
        button from there"): Overlay opens its own row; the native picker opens only from its Photo or video */
     { id: 'overlay', label: w.overlay || 'Overlay', icon: 'overlay', run: () => FM.simpleTools.openSub('overlay') },
     /* #1243 S12 (R (a) "7 Look | panel", before Effects): ONE look over the whole video, its panel opened with nothing selected (the PC
        band, a phone's sheet from the sheet line). It left the clip's tray: "you shouldn't have the look menu on each layer" */
     { id: 'look', label: w.look || 'Look', icon: 'look', title: w.lookTitle, run: (b, e) => FM.simpleTools.toggleLook(null, e) },
     /* Phase 3 · Effect segments (§8.5, §8.5c item 2): a new whole-frame segment at the playhead, picked first in its own row */
     { id: 'effects', label: w.effects || 'Effects', icon: 'effects', title: w.effectsTitle, run: () => FM.simpleTools.openEffects(null) }
    ].forEach(t => run.appendChild(tool(t)));
    edges(run);
  }

  /* ═══ THE TRAY (§8.5; #1243 R (a) "Item trays", release 8): the selected item's tools in ONE order, its sections split by a thin line
     (R: "{divider:true}, a 1 × 24 px rule, no headings… never first, last or doubled; empty sections drop"), Delete last. His words: S33
     "basically you've got your main section with pretty much everything I've said so far, but then like a second section… they just put
     a line in between each section to like break them up"; S31 "put the delete button inside of the menu… But not permanently stuck to
     the right… slides along with it like the rest". Only tools that exist today or belong to this release: a later release's tool is
     never drawn early (no dead tiles). ═══ */
  const DIV = { divider: true };
  /* the sections, each a list of tools (null or empty ones drop), joined by one line each */
  function secs(groups) {
    const out = [];
    groups.forEach(g => { const t = (g || []).filter(Boolean); if (!t.length) return; if (out.length) out.push(DIV); out.push(...t); });
    return out;
  }
  /* …and the same rule on any list, so nothing added after (Cut at the end) can leave a line first, last or doubled */
  /* Open in Full: Full's own panel for the selection (a hop: no editor memory). A block's and a Full-only item's one tool, and since
     review R8-2 the way to what More reached on a sound and an effect segment until their own Simple tools come (8b, S13 / S30) */
  const openFullT = w => ({ id: 'openFull', label: w.openFull || 'Open in Full', icon: 'editor', run: () => FM.editor && FM.editor.request('full', { hop: true }) });
  function tidy(list) {
    const out = [];
    list.forEach(t => { if (t && t.divider) { if (out.length && !out[out.length - 1].divider) out.push(t); } else if (t) out.push(t); });
    while (out.length && out[out.length - 1].divider) out.pop();
    return out;
  }
  /* #1243 S37: an item that runs past the end of the video (and starts before it) offers Cut at the end, at the end of its first section
     (R (a): "[Cut at the end]" closes the main section). Added here, once, for every kind of item's tray. An end card (starts at or after
     the end) is meant to be there, and a clip of the row never runs past it. */
  function trayFor(R, id) {
    const list = trayItems(R, id), l = FM.layerById(FM.scene, id);
    if (!l || !list.length || l.type === 'camera' || R.isMain(id) || !(R.trackEnd > 0)) return tidy(list);
    const s = +l.start || 0, e = s + (+l.duration || 0);
    if (!(e > R.trackEnd + FM.spine.PAST && R.trackEnd - s >= FM.spine.minLen(+FM.scene.project.fps || 30))) return tidy(list);   // an item can be no shorter than the shortest length
    const w = W(), cut = { id: 'cutEnd', label: w.cutEnd || 'Cut at the end', icon: 'cutend', title: w.cutEndTitle, run: () => FM.spine.cmd.cutAtEnd(id) };
    let at = list.findIndex(t => t.divider);
    if (at < 0) at = list.findIndex(t => t.id === 'delete');
    list.splice(at < 0 ? list.length : at, 0, cut);
    return tidy(list);
  }
  /* the line is inside this item, by S.planSplit's own test (the frame-snapped time; start ≤ t < end): Split rests outside it */
  function splitAt(l) {
    if (!l) return false;
    const t = FM.snapFrame ? FM.snapFrame(FM.time || 0) : (FM.time || 0), s = +l.start || 0, e = s + (+l.duration || 0);
    return t >= s && t < e;
  }
  function trayItems(R, id) {
    const S = FM.spine, w = W(), l = FM.layerById(FM.scene, id), u = R.units[id];
    if (!l) return [];
    /* review #4: an item goes through S.cmd.deleteItems, which is Full's own delete unless it would empty an inserted element's group */
    /* #1243 S31 (his words: "not permanently stuck to the right… slides along with it like the rest"): Delete is no longer pinned; it is the
       last tool of every tray, alone in its own last section, and scrolls with the rest */
    const del = { id: 'delete', label: w.delete || 'Delete', icon: 'delete', run: () => { if (R.isMain(id)) S.cmd.del(id); else if (S.cmd.deleteItems) S.cmd.deleteItems([id]); else if (FM.deleteLayer) FM.deleteLayer(id); } };
    const stayOn = !!(l.sm && l.sm.stay);
    const withW = withWords(R, id);   // Phase 3 · Clips › Extras: a layer that moves with the rest of its element says so, in Stay put's name too
    /* #1243 S34 A: with Link off everything stays put already, so Stay put rests (greyed, and a press says why) until Link is back on */
    const linked = !S.linkMode || S.linkMode();
    const stay = { id: 'stay', label: w.stay || 'Stay put', icon: 'pin', title: withW ? (w.stay || 'Stay put') + ' · ' + withW : undefined, pressed: stayOn, disabled: !linked, why: w.stayUnlinked, run: () => S.cmd.stay(id, !stayOn) };
    /* #1243 S5 (his words: "Get rid of the split button… put the split button on the row that pops up when you have a layer selected"):
       Split is the FIRST tool of a clip, a picture, an overlay, a text and a sound. It splits THIS item at the line (review L3-3, 11 Nov:
       on an item's own row it is the only tool that acted on a different item, re-selecting the clip under the line and splitting that).
       With the line outside the item, Split RESTS (the 11 Nov verifiers' V2: a live-looking first tool that only refused was SU1 #11's old
       complaint back again): greyed, and a press says S.planSplit's own 'splitOff' line ("Move the playhead onto the clip to split") and
       changes nothing. splitAt() is planSplit's own test; sync's signature carries it and timeMoved redraws the tray when the line crosses
       the item's edge. The S key keeps its own rule (FM.editor.splitHere: the clip under the line when the selected clip is not under it). */
    const splitT = { id: 'split', label: w.split || 'Split', icon: 'split', title: w.splitTitle, disabled: !splitAt(l), why: (FM.spineWords.lines || {}).splitOff, run: () => S.cmd.split(id) };
    /* (#1243 S4, his words: "where it says more and delete… get rid of more, because that's just a lazy way of having like all the other
       features". More opened Full's whole panel for the item; what Simple reached only through it now has a tool of its own: a text's
       Style (Full's panel for the text until S36), and Opacity and Transform on anything with a picture (R decision 5: "S4 ships with
       Opacity, Transform and the text tray's Style"). The rest of Full's panel is Full's: Open in Full.) */
    const crop = { id: 'crop', label: w.crop || 'Crop', icon: 'crop', run: () => { if (FM.cropTool && FM.cropTool.start) FM.cropTool.start(id); } };
    /* 2.3: the sound and speed tools. A video has all of them; a picture has only Replace; a sound has Volume, Fade and Speed. */
    const isVid = l.type === 'video' && !l.audioOnly && !(l.sm && l.sm.snd === true);
    const speedT = { id: 'speed', label: w.speed || 'Speed', icon: 'speed', run: () => FM.simpleTools.openRow('speed', id) };
    const volumeT = { id: 'volume', label: w.volume || 'Volume', icon: 'volume', run: () => FM.simpleTools.openRow('volume', id) };
    const fadeT = { id: 'fade', label: w.fade || 'Fade', icon: 'fade', run: () => FM.simpleTools.openRow('fade', id) };
    const replaceT = { id: 'replace', label: w.replace || 'Replace', icon: 'replace', run: () => S.cmd.pickReplace(id) };
    /* #1243 R release 8: Opacity and Transform open their own sub-rows (R (a) "Tray sub-rows": "Opacity: ‹ · slider", "Transform: ‹ · Flip ↔ ·
       Flip ↕ · Turn 90° · Size · Centre · Reset"), only on what has a picture (S.canTransform) */
    const tfOk = !!(S.canTransform && S.canTransform(l));
    const opacityT = tfOk ? { id: 'opacity', label: w.opacity || 'Opacity', icon: 'opacity', run: () => FM.simpleTools.openRow('opacity', id) } : null;
    const transformT = tfOk ? { id: 'transform', label: w.transform || 'Transform', icon: 'transform', title: w.transformTitle, run: () => FM.simpleTools.openRow('transform', id) } : null;
    /* the sound commands make or remove a layer: the tray is drawn again when they are done (the redraw during the command saw a half-done
       scene), so the button that was pressed turns into its opposite where it was */
    const again = async p => { const ok = await p; if (FM.layerById(FM.scene, id)) { lastSig = ''; FM.refreshAll(); } return ok; };
    /* #1243 R release 8b (1243-R (a) "| Match · Opacity · Motion blur · Smooth skin" on a clip, "| Opacity · Motion blur" on an overlay; his S33
       words: "a second section where it's got stuff like makeup, like retouch… opacity, motion blur"): one tap puts Full's own effect on the
       item in ONE step and shows it pressed; a second tap takes it off in one step. No sub-row (R (a) gives none). */
    const fxT = (which, icon) => (S.fxToggleOk && S.fxToggleOk(l, which)) ? { id: which, label: w[which], icon: icon, title: w[which + 'Title'], pressed: S.fxToggleOn(l, which),
      run: () => S.cmd.fxToggle(id, which, !S.fxToggleOn(FM.layerById(FM.scene, id), which)) } : null;
    const motionT = fxT('motionBlur', 'motionblur'), skinT = fxT('smoothSkin', 'smoothskin');
    /* #1243 R release 8b (1243-R (a) "| Quieter background · Sound styles · Clear voice" on a video clip and a sound; his S33 words: "another
       section which is more like an audio section where they've got extract audio, isolate voice… reduce noise, audio effects, enhance
       voice"): on the sound the item plays (S.soundFxTarget), only when it has one. Quieter background and Clear voice are one tap each,
       pressed while on; Sound styles opens its row of styles (R rule 2: a few choices fit one row). The audio is unlocked inside the tap
       (iOS starts it only there), as Full's audio effects browser does. */
    const sndL = S.soundFxTarget ? S.soundFxTarget(R, id) : null, Ln = (FM.spineWords && FM.spineWords.lines) || {};
    const unlock = () => { if (FM.audioFxLive && FM.audioFxLive.resume) { try { FM.audioFxLive.resume(); } catch (e) {} } };
    const qz = sndL && S.quieterState ? S.quieterState(R, id) : null;
    /* resting (Remove vocals on): a press still asks the command, which says why WITH Open in Full (review R8b-5) */
    const quietT = qz ? { id: 'quieter', label: w.quieter, icon: 'quieter', title: w.quieterTitle, pressed: qz.on, disabled: qz.blocked, why: Ln.quieterBlocked, rest: () => S.cmd.quieter(id), run: () => again(S.cmd.quieter(id)) } : null;
    const stylesT = sndL ? { id: 'soundStyles', label: w.soundStyles, icon: 'soundstyles', title: w.soundStylesTitle, pressed: !!S.soundStyleOf(sndL), run: () => FM.simpleTools.openRow('soundstyles', id) } : null;
    const clearT = sndL ? { id: 'clearVoice', label: w.clearVoice, icon: 'clearvoice', title: w.clearVoiceTitle, pressed: S.clearVoiceOn(sndL),
      run: () => { unlock(); const t = S.soundFxTarget(S.read(FM.scene), id); S.cmd.clearVoice(id, !(t && S.clearVoiceOn(t))); } } : null;
    const soundSec = [quietT, stylesT, clearT];
    /* #1243 R release 10 (S27 A; R (a) "… Transition · Slide · Reverse …" on a video clip, "[video: Speed · Volume · Slide]" on an overlay). His
       words: "a button on the layer or… in the settings menu that lets you actually slide it along, because we have the slide option in the
       complex editor": the tool opens its own row (filmstrip, −1 frame, +1 frame). A video that already shows all of its footage has nothing
       spare on either side: Slide rests and a press says so in plain words (as Full's ⇄ pill is not drawn then). */
    const slSt = S.slideState ? S.slideState(l) : null;
    const slideT = slSt ? { id: 'slide', label: w.slide || 'Slide', icon: 'slide', title: w.slideTitle, disabled: slSt !== 'ok', why: slSt === 'whole' ? Ln.slideWhole : slSt === 'missing' ? Ln.slideMissing : Ln.slideUnknown,
      run: () => FM.simpleTools.openRow('slide', id) } : null;
    /* (Phase 3 · Look sat third in a clip's tray, after Audio, until #1243 S12 put Look on the project row for the whole video: "you
       shouldn't have the look menu on each layer". A clip that already carries a look keeps it; Look's panel offers to remove them.) */
    /* #1243 S12: the project's Look layer is never drawn as an item, but Full can select it and hand that selection over: its tray is
       Look (its panel, with the selection let go) and Delete */
    if (R.look === id) return secs([[{ id: 'lookOpen', label: w.look || 'Look', icon: 'look', title: w.lookTitle, run: () => FM.simpleTools.openLook() }], [del]]);
    /* Phase 3 · Effects on an item (DESIGN §8.5c item 3): an effect on THIS item, picked in the tray row. Its face is "Add effect", not
       the tables' "Effects": the project row's Effects (a segment over the clip) is on screen at the same time, and his #310 rule is one
       face per control on screen (NOTES). On a title and anything on top; not yet on a clip-row clip (NOTES: his pick B holds ten). */
    const addFxT = { id: 'addfx', label: w.addEffect || 'Add effect', icon: 'effects', title: w.addEffectTitle, run: () => FM.simpleTools.openItemEffects(id) };
    if (R.isMain(id)) {
      const i = R.main.findIndex(e => e.id === id), sb = R.main[i].seam, na = R.main[i + 1], sa = na && na.seam;
      /* #1243 S24 and S25 (his words, 8 Nov): "I do not think we need a move earlier, move later button… people pick it up and drag it…
         people are going to accidentally press it", and "you also don't need a length button… if you want to change the length, you just
         grab the end and drag it". So the tray no longer has Length, Move earlier or Move later: a hold-and-drag reorders, the grips trim
         (a clip too short for them gets them outside its edges, simple-timeline.js drawGrips), and the keyboard keeps Alt+←/→ and A/D
         (editor-mode.js) for anyone who cannot drag. */
      /* #1243 S28 (his words: "if you click audio, it takes you to a menu that has speed. Volume. Reverse. And take out sound. Those should
         all just be buttons in the main menu where like length, audio, and look are. Not in there"): Audio and its row are gone; Speed,
         Volume, Reverse and Take sound out (or Put sound back) are the clip's own tools, in the main section, not repeated later (R decision 2).
         #1243 S32 (his words: "you should have a replace button as well, so you can replace the media with whatever you want"): Replace is
         4th on a video clip, 2nd on a picture, inside the first screen at 380 (it was 9th, four swipes in, where he could not find it). */
      /* release 8b review (R8b-2): Quieter background's cleaned copy rides the clip like a taken-out sound but is not one (Quieter background
         puts it back), so it never turns Take sound out into Put sound back; with it on the clip is muted, so neither shows */
      const NR = FM.noiseReduction, nrCopy = t => !!(NR && NR.isTwin && NR.isTwin(t));
      const hasTwin = isVid && (R.followers[id] || []).some(f => { const t = FM.layerById(FM.scene, f); return !nrCopy(t) && S.isTwinOf(t, l, R.eps); });
      /* (`again`, the redraw after a sound command, is above: Quieter background uses it too) */
      const soundT = !isVid ? null : hasTwin ? { id: 'putSound', label: w.putSound || 'Put sound back', icon: 'soundback', run: () => again(S.cmd.putSoundBack(id)) }
        : S.canTakeSound(R, id) ? { id: 'takeSound', label: w.takeSound || 'Take sound out', icon: 'soundout', run: () => again(S.cmd.takeSoundOut(id)) } : null;
      const reverseT = isVid ? { id: 'reverse', label: w.reverse || 'Reverse', icon: 'reverse', pressed: !!l.reversed, run: () => S.cmd.reverse(id) } : null;
      /* #1243 S1 option A (his words: "that blue thing clips with whatever is on the above layer… a pretty shitty spot to put your… transition
         thing"): the ◇ on a cut hides while the clip on either side is selected (its grips own both edges), so the clip's own tray has a
         Transition tool instead: the row for the cut before it, or the cut after it when the cut before is not a join (the first clip). The
         row acts on the clip after the cut, and belongs to this selection (`of`). */
      const trCut = !S.joinInto ? null : S.joinInto(R, id) ? id : (na && !na.slot && S.joinInto(R, na.id)) ? na.id : null;
      const trT = trCut ? { id: 'transition', key: 'transition:' + trCut, label: w.transition || 'Transition', icon: 'transition', title: w.transitionTitle, run: () => FM.simpleTools.openRow('transition', trCut, null, id) } : null;
      const out = [
        splitT,
        ...(isVid ? [speedT, volumeT] : []),
        ...(l.type === 'video' || l.type === 'image' ? [replaceT] : []),
        trT, slideT, reverseT, soundT,
        { id: 'lift', label: w.lift || 'Lift off', icon: 'lift', title: w.liftTitle, run: () => S.cmd.lift(id) },
        { id: 'duplicateClip', label: w.duplicate || 'Duplicate', icon: 'duplicate', run: () => S.cmd.duplicate(id) }
      ].filter(Boolean);
      /* §8.2: a clip next to a gap or an overlap offers Close gap / Fix too (the seam chip's command) */
      /* its key names the seam it closes, so a double click never runs on into the next seam (the guard in tool()) */
      const seamTool = (e, s) => ({ id: 'seam', key: 'seam:' + e.id + ':' + s.kind, label: s.kind === 'gap' ? (w.closeGap || 'Close gap') : (w.fix || 'Fix'), icon: 'check', run: () => S.cmd.closeSeam(e.id) });
      if (sb && (sb.kind === 'gap' || sb.kind === 'overlap') && !sb.covered) out.push(seamTool(R.main[i], sb));
      else if (sa && (sa.kind === 'gap' || sa.kind === 'overlap') && !sa.covered) out.push(seamTool(na, sa));
      /* 2.7 (DESIGN :522, §12.1): a clip that fades in over the one before it (a crossfade seam) offers Turn into a transition; the ◇ on
         that crossfade selects it. Only with More transition controls on (S.trExtras, #545): his sheet never showed it. */
      if (sb && sb.kind === 'blend' && S.cmd.turnTransition && trExtras()) out.push({ id: 'turnTr', key: 'turnTr:' + id, label: w.turnTr || 'Turn into a transition', icon: 'transition', run: () => S.cmd.turnTransition(id) });
      /* R (a): main | Opacity · Motion blur · Smooth skin (Match later) | Crop · Transform (Steady later) | Quieter background · Sound
         styles · Clear voice (release 8b; a picture clip has no sound, so the section drops) | (Hold frame · Mask later) | Delete */
      return secs([out, [opacityT, motionT, skinT], [crop, transformT], soundSec, [del]]);
    }
    const k = u ? u.kind : '';
    /* R (a) "Text: Split · Edit words · Style · Effects · Stay put | Opacity · Transform | Delete". Style is the text's font, colour and
       outline: Full's panel for the text (togglePanel), the place More used to open, until S36 rethinks it */
    if (k === 'text') return secs([[splitT, { id: 'editwords', label: w.editWords || 'Edit words', icon: 'editwords', run: () => { if (FM.textEdit && FM.textEdit.start) FM.textEdit.start(id, { selectAll: true }); } },
      { id: 'style', label: w.style || 'Style', icon: 'style', title: w.styleTitle, pressed: panelFor === id && panelKind === 'more', run: (b, e) => FM.simpleTools.togglePanel(id, e) },
      addFxT, stay], [opacityT, transformT], [del]]);
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
        /* #1243 S34 A: with Link off the pair rests, as Stay put does (a track follows nothing then) */
        { id: 'capfollow', label: phone.matches ? (w.capFollowShort || 'Follows') : (w.capFollow || 'Follows the clips'), icon: 'link', title: w.capFollowTitle || w.capFollow || 'Follows the clips', pressed: !stays, disabled: !linked, why: w.stayUnlinked, run: () => { if (stays) S.cmd.captionStay(id, false); } },
        { id: 'capstay', label: phone.matches ? (w.capStayShort || 'Stays') : (w.capStay || 'Stays with the sound'), icon: 'pin', title: w.capStayTitle || w.capStay || 'Stays with the sound', pressed: stays, disabled: !linked, why: w.stayUnlinked, run: () => { if (!stays) S.cmd.captionStay(id, true); } },
        DIV, del];   // R (a) "Caption track: Edit lines · Style · Find speech · Follows · Stays | Delete"
    }
    /* 2.4b: the opt-in volume rider (§3.10 rule 3), offered only on a sound that stays put AND has a volume curve to carry */
    /* review L3-5 (11 Nov): with Link off it rests like Stay put and the caption pair (the volume rider does not ride then, riderPlan) */
    const rideT = { id: 'rideVol', label: w.rideVol || 'Follow clips', icon: 'volume', title: w.rideVolTitle || 'Keep volume changes with the clips', pressed: !!(l.sm && l.sm.rideVol), disabled: !linked, why: w.stayUnlinked, run: () => S.cmd.rideVol(id, !(l.sm && l.sm.rideVol)) };
    const hasCurve = !!(FM.isAnimated && (FM.isAnimated(l.volume) || FM.isAnimated(l.transform && l.transform.opacity)));
    /* R (a) "Sound: Split · Volume · Replace · Fade · [Speed if from a video] · Pulse · Stay put · [Follow clips] | (Quieter background · Sound
       styles · Clear voice, release 8b) | Delete" (Pulse is S29's, later). #1243 S32: Replace after Volume (FM.pickReplacement gives a song the
       sound picker); never on a sound taken out of a clip, which is that clip's own sound */
    /* review R8-2: More was the only way in Simple to a sound's Remove vocals, Reduce noise and Audio effects (Full's panel for it), so Open
       in Full ended the main section "until 8b". Release 8b gives a sound Quieter background (Reduce noise), Sound styles (the Voices of
       Audio effects) and Clear voice in their own section (R (a)). Open in Full KEEPS a job there, so it stays, as that section's last tool:
       Remove vocals, the other audio effects one by one and the settings of what these three put on are still only in Full's panel. */
    if (k === 'audio') return secs([[splitT, volumeT, ...(l.sm && l.sm.twin ? [] : [replaceT]), fadeT, ...(l.type === 'video' ? [speedT] : []), stay, ...(stayOn && hasCurve ? [rideT] : [])], soundSec.concat([openFullT(w)]), [del]]);
    if (k === 'effect') return segmentTray(id, l, stay);   // Phase 3 · Effect segments: Change effect · Strength · Stay put | Delete
    if (k === 'block' || k === 'fullOnly') return secs([[openFullT(w)], [del]]);
    if (k === 'undecided') return [];
    const inCard = !!(u && u.host && String(u.host).indexOf('slot:') === 0);   // a card between clips: no Into row until its slot form exists (§3.6)
    /* overlays, stickers, pictures, a background. R (a) "Overlay: Split · Into row · Replace · Effects · Stay put · [video: Speed · Volume ·
       Slide] · Forward · Back | Opacity · Motion blur | Crop · Transform | Delete" (Motion blur came in release 8b, Slide in release 10).
       #1243 S32: Replace after Into row, on a photo or a video (planReplace refuses a shape) */
    return secs([[
      splitT,
      ...(inCard ? [] : [{ id: 'into', label: w.into || 'Into row', icon: 'drop', title: w.intoTitle, run: () => S.cmd.intoRow(id) }]),
      ...(l.type === 'video' || l.type === 'image' ? [replaceT] : []),
      addFxT,   /* Phase 3 · Effects on an item, R (a)'s "Effects" */
      stay,
      ...(isVid ? [speedT, volumeT, slideT] : []),
      { id: 'forward', label: w.forward || 'Forward', icon: 'forward', run: () => S.cmd.z(id, 1) },
      { id: 'backward', label: w.backward || 'Back', icon: 'backward', run: () => S.cmd.z(id, -1) }],
      [opacityT, motionT], [crop, transformT], [del]]);
  }
  /* (Length's row lived here until #1243 S25 took Length off the tray: "you just grab the end and drag it". S.cmd.length and
     S.cmd.trimStartBy stay, for the grips' commands and the keyboard.) */

  /* ═══ RELEASE 2.3: SPEED, VOLUME and FADE are rows that take the bar's place (the row itself is the panel, so the timeline above
     never moves). Each commits ONE command on release / press; while a slider moves only the DOM and the playback rate change, so the
     scene stays exactly as it was until he lets go (and an undo has one step to go back). Since #1243 S9 they are SUBS sub-rows: the
     ‹ in front of them is drawn by fillTray, and each fill appends into the row's strip (`run`). ═══ */
  const pct = v => Math.round(v * 100);
  const fmtX = sp => (Math.round(sp * 100) / 100) + '×';
  const put = (run, n) => run.appendChild(n.nodeType ? n : tool(n));
  function speedRow(R, s, run) {
    const S = FM.spine, w = W(), id = s.id, l = FM.layerById(FM.scene, id);
    if (!l) return;
    if (FM.isAnimated(l.speed)) {   // a ramp is not one speed: say so, and offer the one way out
      put(run, el('div', 'sm-quiet', w.speedRamped || 'Speed changes over the clip'));
      put(run, { id: 'oneSpeed', label: w.useOneSpeed || 'Use one speed', icon: 'speed', run: () => S.cmd.useOneSpeed(id) });
      return;
    }
    const rg = S.speedRange(R, id) || { lo: 0.25, hi: 4 }, now = FM.speedAt(l, +l.start || 0), why = (FM.spineWords.lines || {}).speedShort;
    [0.5, 1, 1.5, 2, 3].forEach(sp => put(run, { id: 'sp' + sp, label: sp + '×', icon: null, title: (w.speed || 'Speed') + ' ' + sp + '×', pressed: Math.abs(now - sp) < 1e-6, disabled: sp > rg.hi + 1e-9, why: why,
      run: () => { if (Math.abs(now - sp) > 1e-9) S.cmd.speed(id, sp); } }));
    /* #1243 S28 polish (his words: "actually polish those things"; B S28 step 4 "the new length live"): under the speed, the length the clip
       will have at it (one speed over the clip: the footage it plays stays the same, so the length goes as now / speed), live as the slider moves */
    const d0 = +l.duration || 0, lenAt = sp => (w.newLength || (s => s.toFixed(1) + ' s'))(sp > 0 ? d0 * now / sp : d0);
    const out = el('span', 'sm-speed-out'), val = el('span', 'sm-speed-v', fmtX(now)), len = el('span', 'sm-len-v', lenAt(now));
    out.append(val, len);
    const rng = el('input', 'sm-speed-r'); rng.type = 'range'; rng.min = String(rg.lo); rng.max = String(rg.hi); rng.step = '0.05';
    rng.value = String(Math.max(rg.lo, Math.min(rg.hi, now))); rng.setAttribute('aria-label', w.speedLabel || 'Speed');
    rng.addEventListener('input', () => { const sp = parseFloat(rng.value); val.textContent = fmtX(sp); len.textContent = lenAt(sp); if (FM.simpleTimeline && FM.simpleTimeline.previewSpeed) FM.simpleTimeline.previewSpeed(id, sp); });
    rng.addEventListener('change', () => { const sp = parseFloat(rng.value); if (FM.simpleTimeline && FM.simpleTimeline.previewSpeed) FM.simpleTimeline.previewSpeed(id, null); if (Math.abs(sp - now) > 1e-9) S.cmd.speed(id, sp); });
    run.append(rng, out);
  }
  function volumeRow(R, s, run) {
    const S = FM.spine, w = W(), id = s.id, tid = S.soundTargetId(R, id), t = tid && FM.layerById(FM.scene, tid);
    if (!t) return;
    const now = (() => { const v = t.volume == null ? 1 : FM.evalProp(t.volume, FM.time); return isFinite(v) ? v : 1; })();
    const val = el('span', 'sm-vol-v', pct(now) + '%');
    const rng = el('input', 'sm-vol-r'); rng.type = 'range'; rng.min = '0'; rng.max = '200'; rng.step = '1'; rng.value = String(Math.min(200, pct(now)));
    rng.setAttribute('aria-label', w.volumeLabel || 'Volume in percent');
    /* #1243 S28 polish (B S28 step 4: "0-200% with a soft stop at 100% and a Mute pill"): the slider rests on 100% within 4 of it, so the
       clip's own level is easy to find again */
    const soft = () => { let p = parseFloat(rng.value); if (Math.abs(p - 100) <= 4 && Math.abs(now * 100 - p) > 0.5) { p = 100; rng.value = '100'; } return p / 100; };
    rng.addEventListener('input', () => { const v = soft(); val.textContent = pct(v) + '%'; const m = FM.media && FM.media.get(t.id); if (m && m.el) { try { m.el.volume = Math.min(1, v); } catch (e) {} } });
    rng.addEventListener('change', () => { const v = soft(); if (Math.abs(v - now) > 0.004) S.cmd.volume(id, v); });
    run.append(rng, val);
    put(run, { id: 'mute', label: w.mute || 'Mute', icon: 'mute', pressed: !!t.muted, run: () => S.cmd.mute(id, !t.muted) });   // R (a) "Volume: ‹ · 0–200 % · Mute"
  }
  /* #1243 R release 8 (R (a) "Opacity: ‹ · slider"; his S33 words: "they've got opacity"): 0–100 %, the picture changes while the slider
     moves (the preview is taken back to the byte before the one step lands, as Strength's is), one step on release */
  function opacityRow(R, s, run) {
    const S = FM.spine, w = W(), id = s.id, l = FM.layerById(FM.scene, id);
    if (!l || !l.transform || !S.canTransform(l)) return;
    const now = Math.round(FM.evalProp(l.transform.opacity == null ? 1 : l.transform.opacity, FM.time || 0) * 100);
    const val = el('span', 'sm-vol-v sm-opa-v', now + '%');
    const rng = el('input', 'sm-vol-r sm-opa-r'); rng.type = 'range'; rng.min = '0'; rng.max = '100'; rng.step = '1'; rng.value = String(now);
    rng.setAttribute('aria-label', w.opacityLabel || 'Opacity in percent');
    rng.addEventListener('input', () => {
      const v = Math.round(parseFloat(rng.value)), Lx = FM.layerById(FM.scene, id);
      val.textContent = v + '%';
      if (!Lx || !Lx.transform) return;
      dragStart(Lx, 'opacity');
      if (Lx.transform.opacity == null) Lx.transform.opacity = 1;
      FM.shiftProp(Lx.transform, 'opacity', v / 100, FM.time || 0, { min: 0, max: 1 });
      segDrag.last = JSON.stringify(Lx.transform.opacity);
      if (FM.requestRender) FM.requestRender();
    });
    rng.addEventListener('change', () => { const v = Math.round(parseFloat(rng.value)); segUndrag(); if (v !== now) S.cmd.opacity(id, v / 100); });
    run.append(rng, val);
  }
  /* #1243 R release 8, R decision 5 (his S33 words: "transform, which has like mirror, rotate, and then advanced"): a BASIC Transform that does
     not wait on F6 — Mirror · Flip · Turn · Size · Centre · Reset, each one command and one step (the Size slider on release). Free move and
     rotate stay finger gestures on the canvas; his "advanced" (axis, tilt) is Fine-tune, after F6. */
  function transformRow(R, s, run) {
    const S = FM.spine, w = W(), id = s.id, l = FM.layerById(FM.scene, id);
    if (!l || !l.transform || !S.canTransform(l)) return;
    put(run, { id: 'mirror', label: w.mirror || 'Mirror', icon: 'mirror', title: w.mirrorTitle, pressed: !!l.flipH, run: () => S.cmd.transform(id, 'flipH') });
    put(run, { id: 'flipv', label: w.flipV || 'Flip', icon: 'flipv', title: w.flipVTitle, pressed: !!l.flipV, run: () => S.cmd.transform(id, 'flipV') });
    put(run, { id: 'turn', label: w.turn || 'Turn', icon: 'turn', title: w.turnTitle, run: () => S.cmd.transform(id, 'turn') });
    const base = S.baseScale(l), now = Math.round(FM.evalProp(l.transform.scale == null ? 1 : l.transform.scale, FM.time || 0) / base * 100);
    put(run, el('div', 'sm-quiet sm-size-l', w.size || 'Size'));
    const val = el('span', 'sm-vol-v sm-size-v', now + '%');
    const rng = el('input', 'sm-vol-r sm-size-r'); rng.type = 'range'; rng.min = '10'; rng.max = '400'; rng.step = '1'; rng.value = String(Math.max(10, Math.min(400, now)));
    rng.setAttribute('aria-label', w.sizeLabel || 'Size in percent');
    rng.addEventListener('input', () => {
      const v = Math.round(parseFloat(rng.value)), Lx = FM.layerById(FM.scene, id);
      val.textContent = v + '%';
      if (!Lx || !Lx.transform) return;
      dragStart(Lx, 'scale');
      FM.shiftTransform(Lx, 'scale', base * v / 100, FM.time || 0);
      segDrag.last = JSON.stringify(Lx.transform.scale);
      if (FM.requestRender) FM.requestRender();
      if (FM.canvasEdit && FM.canvasEdit.update) FM.canvasEdit.update();
    });
    rng.addEventListener('change', () => { const v = Math.round(parseFloat(rng.value)); segUndrag(); if (v !== now) S.cmd.transform(id, 'size', base * v / 100); });
    run.append(rng, val);
    put(run, { id: 'centre', label: w.centre || 'Centre', icon: 'centre', title: w.centreTitle, run: () => S.cmd.transform(id, 'centre') });
    put(run, { id: 'tfReset', label: w.reset || 'Reset', icon: 'reset', title: w.resetTitle, run: () => S.cmd.transform(id, 'reset') });
  }
  /* #1243 R release 8b, SOUND STYLES (his S33 words: "audio effects"; 1243-F S33 "Sound styles", a door to the 31 effects plus the voice
     presets): None, then every style — his own saved voices first, then the shipped ones (the Voice category of Full's audio effects
     browser) — each one tap and ONE step, the one on now pressed. A style takes the place of the one before it; his own effects stay. A
     style's name is his own words for his own voices: it goes in as text (tool() writes it with textContent). */
  function soundStylesRow(R, s, run) {
    const S = FM.spine, w = W(), id = s.id, L = S.soundFxTarget ? S.soundFxTarget(R, id) : null;
    if (!L) return;
    const now = S.soundStyleOf(L), unlock = () => { if (FM.audioFxLive && FM.audioFxLive.resume) { try { FM.audioFxLive.resume(); } catch (e) {} } };
    put(run, { id: 'style-none', label: w.soundStylesNone || 'None', icon: null, pressed: !now, run: () => S.cmd.soundStyle(id, null) });   // words only, as the Transition row's None
    S.soundStyles().forEach(st => put(run, { id: 'style-' + st.key, label: st.name, icon: null, title: st.desc ? st.name + ' · ' + st.desc : st.name, pressed: now === st.key,
      run: () => { unlock(); S.cmd.soundStyle(id, st.key); } }));
  }
  /* ═══ #1243 R release 10 · SLIDE'S ROW (S27 A; R (a) "Slide: ‹ · filmstrip · ±1 frame"; 1243-B S27 change 2). His words: "lets you actually
     slide it along… for the clip to like start a second earlier… Instead you can just slide it and then it's like super simple and easy".
     THE FILMSTRIP is the whole footage (FM.buildClipStrip's frames, each at its own place in the file) moving under a FIXED bright window the
     size of what the clip plays, laid out in the order the clip plays it (a reversed clip's strip runs backwards, so a drag and the frame
     steps go the way the picture shows). Dragging the strip only previews — the clip's trimStart on show, the picture sought, no step — and
     the release takes the preview back to the byte and runs ONE command (S.cmd.slide), as Speed's slider commits on release. −1 frame and
     +1 frame are one step each. The readout under the strip says where the clip starts in its video. ═══ */
  /* {id, pid: the finger that owns it, pre: the clip's trimStart to put back, at: the trimStart on show, keep: [{id, had: the field existed,
     pre}] for every layer the preview moves (S.slideMovers: the clip, its own sound and their copies, review R10-4)} */
  let slideDrag = null;
  function slideUndrag() {
    if (!slideDrag) return;
    const d = slideDrag;
    slideDrag = null;
    /* only while each still holds exactly what the preview put there: a step that landed meanwhile is never written over */
    d.keep.forEach(k => {
      const L = FM.layerById && FM.scene ? FM.layerById(FM.scene, k.id) : null;
      if (L && L.trimStart === d.at) { if (k.had) L.trimStart = k.pre; else delete L.trimStart; }
    });
    if (FM.seekVideosToTime) FM.seekVideosToTime();
    if (FM.requestRender) FM.requestRender();
  }
  /* what Slide's row is drawn from (sync's row signature): the footage the clip shows, read through a drag's preview (the value it puts back),
     so a refresh while the finger is down never redraws the strip from under it */
  function slideSig(l) {
    const tr = slideDrag && slideDrag.id === l.id ? slideDrag.pre : l.trimStart;
    return [tr, l.duration, !!l.reversed, JSON.stringify(l.speed == null ? 1 : l.speed), FM.spine.slideState ? FM.spine.slideState(l) : ''].join('|');
  }
  /* the playhead onto the clip when it is elsewhere, so the picture he slides is on the stage (its first frame: "start a second earlier") */
  function slideShow(L) {
    const t = FM.time || 0, s = +L.start || 0, e = s + (+L.duration || 0), fps = (FM.scene.project && FM.scene.project.fps) || 30;
    if (!((t < s - 1e-9 || t >= e - 1e-9) && FM.setTime)) return;
    /* the first frame INSIDE the clip: FM.setTime snaps to the NEAREST frame, which for a clip starting between two frames (a clip added at
       its file's own length) is often the frame before it, so the stage kept showing the clip before (review R10-2) */
    const f = Math.ceil(s * fps - 1e-6) / fps;
    FM.setTime(f < e - 1e-9 ? f : s, true);
  }
  function slideRow(R, s, run) {
    const S = FM.spine, w = W(), Ln = (FM.spineWords && FM.spineWords.lines) || {}, id = s.id, l = FM.layerById(FM.scene, id);
    const r = l && S.slideRange ? S.slideRange(l) : null, st = l && S.slideState ? S.slideState(l) : null;
    if (!l || !st) return;
    if (st !== 'ok' || !r) { put(run, el('div', 'sm-quiet', st === 'whole' ? Ln.slideWhole : st === 'missing' ? Ln.slideMissing : Ln.slideUnknown)); return; }
    const rev = !!l.reversed, m = FM.media.get(l.id);
    const pos = t => rev ? r.max - t : t;   // the window's place along the strip, in the order the clip plays its footage
    const box = el('div', 'sm-slide'), cv = el('canvas', 'sm-slide-film'), out = el('span', 'sm-slide-v');
    box.append(cv, out);
    /* data-tool: sync's focus rule finds it again after a step's redraw, so ← → keep working from the keyboard (it is not a .sm-tool) */
    box.dataset.tool = 'slideFilm'; box.tabIndex = 0; box.setAttribute('role', 'slider'); box.setAttribute('aria-label', w.slideLabel || 'Slide the video inside the clip');
    box.setAttribute('aria-valuemin', '0'); box.setAttribute('aria-valuemax', String(Math.round(r.max * 10) / 10));
    /* the scale: the whole footage across 90 % of the strip, unless that makes the window under 35 % of it (a short clip from a long file);
       then the window keeps 35 % and the film runs past the strip's edges (each drag moves about three windows' worth at most) */
    const scaleOf = B => Math.max(0.9 * B / r.src, 0.35 * B / r.adv);
    const fromOf = t => rev ? t + r.adv : t;
    const say = t => {
      const f = (w.slideFrom || (x => 'from ' + x.toFixed(1)))(fromOf(t));
      out.textContent = f;
      box.setAttribute('aria-valuenow', String(Math.round(t * 100) / 100)); box.setAttribute('aria-valuetext', f);
    };
    const draw = t => {
      say(t);
      const B = cv.clientWidth || 160, H = cv.clientHeight || 32, dpr = Math.min(2, window.devicePixelRatio || 1);
      const bw = Math.max(1, Math.round(B * dpr)), bh = Math.max(1, Math.round(H * dpr));
      if (cv.width !== bw) cv.width = bw;
      if (cv.height !== bh) cv.height = bh;
      const g = cv.getContext && cv.getContext('2d'); if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, B, H);
      const sc = scaleOf(B), ww = Math.max(2, r.adv * sc), wx = (B - ww) / 2, fx = wx - pos(t) * sc, fw = r.src * sc;
      const frames = (m && m.stripFrames) || [], N = frames.length, aspect = (m && m.width && m.height) ? m.width / m.height : 16 / 9;
      const tileW = Math.max(18, Math.round(H * aspect));
      for (let x = 0; x < fw; x += tileW) {   // each tile shows the frame at its own place in the file (mirrored for a reversed clip)
        const X = fx + x, tw = Math.min(tileW, fw - x);
        if (X + tw < 0 || X > B) continue;
        const frac = (x + tw / 2) / fw, f = N ? frames[Math.min(N - 1, Math.max(0, Math.floor((rev ? 1 - frac : frac) * N)))] : null;
        if (f) { try { g.drawImage(f, X, 0, tw, H); } catch (e) { /* a frame that was let go draws nothing */ } }
        else { g.fillStyle = 'rgba(120,130,150,.32)'; g.fillRect(X, 0, tw - 1, H); }
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(X + tw - 1, 0, 1, H);
      }
      /* what the clip does not show is dimmed; the window stays bright (a plain overlay: canvas filters are not on every phone) */
      g.fillStyle = 'rgba(8,11,16,.62)';
      g.fillRect(0, 0, Math.max(0, wx), H); g.fillRect(wx + ww, 0, Math.max(0, B - wx - ww), H);
      const atEnd = pos(t) <= 1e-4 || pos(t) >= r.max - 1e-4;
      g.strokeStyle = atEnd ? '#ff9042' : '#4da3ff'; g.lineWidth = 2;   // orange: up against an end of the video (Full's slip ghost's colour)
      g.strokeRect(wx + 1, 1, ww - 2, H - 2);
    };
    /* a drag: window listeners (a synthetic or captured pointer alike), the preview on the layer, one command on release */
    box.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const L0 = FM.layerById(FM.scene, id); if (!L0) return;
      e.preventDefault(); e.stopPropagation();
      slideUndrag();
      if (FM.playing && FM.pause) FM.pause();
      slideShow(L0);
      const B = cv.clientWidth || 160, sc = scaleOf(B), x0 = e.clientX, pid = e.pointerId, t0 = Math.max(0, +L0.trimStart || 0);
      const keep = (S.slideMovers ? S.slideMovers(L0) : [L0]).map(x => ({ id: x.id, had: Object.prototype.hasOwnProperty.call(x, 'trimStart'), pre: x.trimStart }));
      slideDrag = { id: id, pid: pid, pre: L0.trimStart, at: L0.trimStart, keep: keep };
      const off = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', end, true); window.removeEventListener('pointercancel', end, true); };
      const move = ev => {
        if (ev.pointerId !== pid) return;
        const L2 = FM.layerById(FM.scene, id);
        if (!slideDrag || slideDrag.id !== id || slideDrag.pid !== pid || !L2) { off(); return; }
        const p = Math.max(0, Math.min(r.max, pos(t0) - (ev.clientX - x0) / sc)), t = rev ? r.max - p : p;   // the film follows the finger
        slideDrag.keep.forEach(k => { const x = FM.layerById(FM.scene, k.id); if (x) x.trimStart = t; });
        slideDrag.at = t;
        draw(t);
        if (FM.scrubTime) FM.scrubTime(FM.time || 0, true); else if (FM.requestRender) FM.requestRender();
      };
      const end = ev => {
        if (ev.pointerId !== pid) return;
        off();
        if (slideDrag && slideDrag.pid !== pid) return;   // review R10-3: a second finger took the strip over; its drag goes on, this one is over
        const d = slideDrag && slideDrag.id === id ? slideDrag : null, t = d ? +d.at : t0, moved = !!d && Math.abs(t - t0) > 1e-6;
        slideUndrag();
        /* a step the runner refuses (locked, view only, busy) redraws nothing, so the strip goes back to where the clip still plays from
           (review R10-1); a queued step returns false too, and its own commit redraws the row later */
        if (ev.type === 'pointerup' && moved) {
          Promise.resolve(S.cmd.slide(id, t)).then(ok => {
            if (ok || !cv.isConnected || slideDrag) return;
            const Lr = FM.layerById(FM.scene, id);
            draw(Lr ? Math.max(0, +Lr.trimStart || 0) : t0);
          }).catch(() => {});
        } else if (cv.isConnected) draw(t0);
      };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', end, true);
      window.addEventListener('pointercancel', end, true);
    });
    /* the keyboard: ← and → are the frame steps; they stay here (Full's window keys would nudge the clip's picture) */
    const step = n => { const Lx = FM.layerById(FM.scene, id); if (Lx) slideShow(Lx); return S.cmd.slideFrames(id, n); };
    box.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); e.stopPropagation();
      step(e.key === 'ArrowRight' ? 1 : -1);
    });
    box.addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation(); });
    run.appendChild(box);
    draw(r.trim);
    requestAnimationFrame(() => { if (cv.isConnected && !slideDrag) draw(r.trim); });   // drawn again at the size the row settled at
    if (m && m.stripFrames === undefined && FM.buildClipStrip) FM.buildClipStrip(m, 8).then(() => { if (cv.isConnected && !slideDrag) draw(r.trim); }).catch(() => {});
    const p0 = pos(r.trim), endWhy = Ln.slideEnd;
    put(run, { id: 'slidePrev', label: w.slidePrev || '−1 frame', icon: null, title: w.slidePrevTitle, disabled: p0 <= 1e-6, why: endWhy, run: () => step(-1) });
    put(run, { id: 'slideNext', label: w.slideNext || '+1 frame', icon: null, title: w.slideNextTitle, disabled: p0 >= r.max - 1e-6, why: endWhy, run: () => step(1) });
  }
  function fadeRow(R, s, run) {
    const S = FM.spine, w = W(), id = s.id, tid = S.soundTargetId(R, id), t = tid && FM.layerById(FM.scene, tid);
    if (!t) return;
    [['in', 'fadeIn', w.fadeIn || 'In'], ['out', 'fadeOut', w.fadeOut || 'Out']].forEach(f => {
      const cur = () => { const L = FM.layerById(FM.scene, tid); return L ? (+L[f[1]] || 0) : 0; };
      put(run, el('div', 'sm-quiet sm-fade-l', f[2] + ' ' + cur().toFixed(1) + ' s'));
      put(run, { id: 'fade' + f[0] + 'Minus', label: '−', icon: null, title: f[2] + ': ' + (w.shorter || 'shorter'), run: () => S.cmd.fade(id, f[0], Math.max(0, cur() - 0.5)) });
      put(run, { id: 'fade' + f[0] + 'Plus', label: '+', icon: null, title: f[2] + ': ' + (w.longer || 'longer'), run: () => S.cmd.fade(id, f[0], cur() + 0.5) });
    });
  }
  /* (OPTION E, a video clip's Speed, Volume, Reverse and Take sound out inside one Audio row, was his own earlier pick, made to keep the PC
     tray on two rows. #1243 S28 reverses it in his words: "Those should all just be buttons in the main menu… Not in there". They are the
     clip's own tools now, trayItems.) */
  /* 2.7 THE TRANSITION ROW (#1122 clause 2, his pick A: tools/design/plans/simple-mode/transition-options/sheet.jpg on
     plans/simple-transitions): opened by the ◇ above a cut (js/simple-timeline.js), for the clip AFTER the cut. Done · None · Crossfade ·
     Dip to black · Dip to white, as on his sheet, on a phone and on a PC alike. With More transition controls on (S.trExtras, #545: his
     sheet never showed them), once one is set, its length (− and + by 0.1 s, 0.1 to 3 s) and On every cut follow. A type is pressed with
     no length, so a new transition is FM.TR_DEFAULT long and a changed one keeps its own. Each press is one command, one undo step, like
     Speed, Volume and Fade (2.3). */
  function transitionRow(R, s, run) {
    const S = FM.spine, w = W(), id = s.id;
    if (!FM.layerById(FM.scene, id)) return;
    const cur = () => { const L = FM.layerById(FM.scene, id); return L && L.trIn ? L.trIn : null; };
    const types = [['none', w.trNone || 'None'], ['crossfade', w.trCrossfade || 'Crossfade'], ['dipblack', w.trDipBlack || 'Dip to black'], ['dipwhite', w.trDipWhite || 'Dip to white']];
    types.forEach(t => put(run, { id: 'tr-' + t[0], label: t[1], icon: null, pressed: (cur() ? cur().type : 'none') === t[0], run: () => S.cmd.transition(id, t[0]) }));
    if (cur() && trExtras()) {
      put(run, el('div', 'sm-quiet sm-fade-l', (w.trLength || 'Length') + ' ' + cur().d.toFixed(1) + ' s'));
      put(run, { id: 'trMinus', label: '−', icon: null, title: w.trShorter || 'Shorter by 0.1 s', run: () => { const c = cur(); if (c) S.cmd.transition(id, c.type, c.d - 0.1); } });
      put(run, { id: 'trPlus', label: '+', icon: null, title: w.trLonger || 'Longer by 0.1 s', run: () => { const c = cur(); if (c) S.cmd.transition(id, c.type, c.d + 0.1); } });
      put(run, { id: 'trAll', label: w.trEvery || 'On every cut', icon: null, run: () => S.cmd.transitionAll(id) });
    }
  }
  /* ═══ #1243 S9 (R decision 3): ONE SUB-ROW MECHANISM. Every row that takes the bar's place, by its key in subFor: what fills it
     (fill(R, subFor, run), into the row's strip), the data-tool of the tool that opened it (focus goes back there after its ‹), the ‹'s
     own id (rowBack, or fxBack for the effects pickers) and its spoken name (the tray's aria-label, from the words file). ═══ */
  const SUBS = {
    clips:      { fill: clipsRow,      opener: () => 'clips',    word: 'clips' },
    sound:      { fill: soundRow,      opener: () => 'sound',    word: 'sound' },
    captions:   { fill: captionsRow,   opener: () => 'captions', word: 'captions' },
    caplooks:   { fill: capLooksFill,  opener: () => 'capLooks', word: 'capLooksRow' },   // #1243 S8: Captions › Caption looks (‹ back to Captions)
    text:       { fill: textRow,       opener: () => 'text',     word: 'text' },          // #1243 S8: Text › Add text · Title looks
    titlelooks: { fill: titleLooksFill, opener: () => 'titleLooks', word: 'titleLooksRow' },   // #1243 S8: Text › Title looks (‹ back to Text)
    overlay:    { fill: overlayRow,    opener: () => 'overlay',  word: 'overlay' },       // #1243 S8: Overlay › Photo or video · Your media
    yourmedia:  { fill: yourMediaFill, opener: () => 'yourMedia', word: 'yourMedia' },     // #1243 S8: Overlay › Your media (‹ back to Overlay)
    effects:    { fill: fxFill,        opener: s => s.id ? 'change' : 'effects', back: 'fxBack', word: 'effects' },
    itemfx:     { fill: itemFxFill,    opener: () => 'addfx',    back: 'fxBack', word: 'addEffect' },
    speed:      { fill: speedRow,      opener: () => 'speed',    word: 'speed' },
    volume:     { fill: volumeRow,     opener: () => 'volume',   word: 'volume' },
    opacity:    { fill: opacityRow,    opener: () => 'opacity',  word: 'opacity' },     // #1243 R release 8
    transform:  { fill: transformRow,  opener: () => 'transform', word: 'transform' },  // #1243 R release 8
    soundstyles: { fill: soundStylesRow, opener: () => 'soundStyles', word: 'soundStyles' },   // #1243 R release 8b
    slide:      { fill: slideRow,      opener: () => 'slide',    word: 'slide' },           // #1243 R release 10 (S27 A)
    fade:       { fill: fadeRow,       opener: () => 'fade',     word: 'fade' },
    transition: { fill: transitionRow, opener: () => 'transition', word: 'transition' },   // #1243 S1 A: from the ◇, or the clip's own Transition
    strength:   { fill: strengthRow,   opener: () => 'strength', word: 'strength' }
  };
  /* THE ‹s (#1243 R: "item and sub start with a ‹ … in item mode it clears the selection, in a sub-row it goes back one level"; 44 px,
     the tray's finger floor, not R's 40). A sub-row's keeps the ids rowBack / fxBack and is a .sm-tool; the item's is not one, so the
     tray's own tool list is unchanged; a panel's sits in that panel's own first row (no header row: queue 835). */
  /* key: which row this ‹ leaves (MODE-6), so tool()'s double-click guard never takes Audio's ‹ for the Speed row's ‹ that it replaced
     under the pointer: a double click on Speed's ‹ went back two levels */
  function backTool(id, key) { return tool({ id: id, key: key, cls: 'sm-tool sm-back', label: '', icon: 'back', title: W().back || 'Back', run: () => FM.simpleTools.back() }); }
  function itemBack() { return tool({ id: 'itemBack', cls: 'sm-back', label: '', icon: 'back', title: W().backItem || 'Back · nothing selected', run: () => FM.simpleTools.back() }); }
  function panelBack() {
    const b = el('button', 'sm-pback'); b.type = 'button'; b.innerHTML = svg('back');   // a fixed string, never user data
    b.title = W().back || 'Back'; b.setAttribute('aria-label', b.title);
    b.addEventListener('click', e => { e.stopPropagation(); FM.simpleTools.back(); });
    return b;
  }
  /* the PC band's way back from More's panel (a caption track's Style too) and from Extras: ONE ‹ at the start of the band's own title
     row (#inspector-panel > .panel-title, which js/inspector.js never rebuilds: it writes only .panel-title-label). On a phone that row
     is not shown, and the sheet's grab bar is the way back. Taken out on every way out of Simple (sync, the editor switch, _reset). */
  function pbackSync(mode) {
    const title = document.querySelector('#inspector-panel > .panel-title');
    const b = title && title.querySelector(':scope > .sm-pback');
    const want = !!title && isSimple() && !phone.matches && mode === 'panel' && (panelKind === 'more' || extrasUp());
    if (want && !b) title.insertBefore(panelBack(), title.firstChild);
    else if (!want && b) b.remove();
  }

  /* THE FIRST-RUN HINT WENT (#1255's 20:53 follow-up). His words: "I'm also noticing a pop-up that says tap a clip to split or change
     its speed. There shouldn't be any explanations like that. We have tutorials for a reason, and there could be a tutorial when the
     first time you load into the app is, but not, you know, constantly there." It was SU1 #13's line ("Tap a clip to split it or change
     its speed", on a PC "Click a clip… · S splits at the line"), floating just above the bar in the project row until the first tap. It
     floated (absolute), so nothing moves where it sat. What it pointed at is found where it always was: a clip's tap opens its tools,
     Split first, Speed among them. fm.sm.hint is no longer read or written. hintSync stays as the one place that takes a hint left in
     the bar by an earlier version's page away. */
  function hintSync() {
    const h = bar && bar.querySelector(':scope > .sm-hint');
    if (h) h.remove();
  }
  /* 2.7 (2A row 16): A PANEL THAT OPENS UNDER THE FINGER IGNORES THAT FINGER. More's panel rises over the place More was pressed (until
     #1243 it moved the tray and More up 134 px at 380x800; since #1243 rule 3 the sheet runs from the stage's bottom edge over the whole
     bar, and on a PC the panel takes the band where the bar was), so the second tap of a double tap on More pressed whatever lay there
     (a real mouse, measured: "Close inspector" at 380x667, so the panel opened and shut; "Trim end to playhead" at 380x800 once the
     panel had risen). For 450 ms after More opens the panel, a REAL press that lands on it does nothing, as a line's buttons ignore
     presses for their first 400 ms (section 3.12 rule 5). Simple only; script clicks (isTrusted false) are never held.
     Phase 3 (the sm3 stack, #1171): Look's panel and Edit lines open in that same place the same way, so they arm it too. */
  /* ON ONLY WHILE ARMED (sm3 review, lens 1): the listeners are non-passive window captures, and a non-passive touchstart on
     window makes Chrome hold every scroll for the main thread. Added at load they sat in Full too, so they go on when a panel
     arms the guard and come off 500 ms later: Full, and Simple between panels, carries none. */
  let sheetArmAt = -1e9, shutArmAt = -1e9, sheetPressAt = -1e9, sheetOn = false, sheetOff = 0;
  const SHEET_EV = ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'touchend', 'click'];
  const SHEET_OPT = { capture: true, passive: false };
  function sheetListen(on) {
    if (on === sheetOn) return;
    sheetOn = on;
    SHEET_EV.forEach(t => { if (on) window.addEventListener(t, sheetGuard, SHEET_OPT); else window.removeEventListener(t, sheetGuard, SHEET_OPT); });
  }
  /* #1243 S9: on a PC too, now that a panel takes the band and the bar hides: the second press of a double click on More lands in the
     panel where More was. And on the phone's Add sheet, where Extras rises (Clips › Extras). */
  function armSheet() {
    if (!isSimple()) return;
    sheetArmAt = performance.now(); sheetListen(true);
    clearTimeout(sheetOff); sheetOff = setTimeout(() => sheetListen(false), 500);
  }
  /* …AND THE SAME WHEN IT GOES (the 9 Nov review, MODE-4). Since #1243 rule 3 a phone's sheet starts at the stage's bottom edge, which
     is the top of the play row: its grab bar lies over Link (⋯ and ✂ until #1243 S5), and Look's and Edit lines' ‹ over the play row's foot
     and the ruler. The sheet closes under the first tap and the second lands on Link (a whole-project switch), ▶, or the timeline. For 450 ms after the sheet
     goes, a REAL press in #timeline-panel (the play row, the timeline, the bar) does nothing. Phone only: on a PC nothing a panel covers
     comes back under its ‹. Armed by the body's insp-open going away while Simple is on screen within a second of a real press on the
     sheet (mount, sheetPressAt), so every way a finger closes it counts: the grab bar, a swipe, a ‹, a button in the panel. */
  function armShut() {
    if (!isSimple() || !phone.matches) return;
    shutArmAt = performance.now(); sheetListen(true);
    clearTimeout(sheetOff); sheetOff = setTimeout(() => sheetListen(false), 500);
  }
  function sheetGuard(e) {
    if (!e.isTrusted) return;
    const now = performance.now(), t = e.target && e.target.nodeType === 1 ? e.target : null;
    const under = ids => !!t && ids.some(id => { const s = document.getElementById(id); return s && s.contains(t); });
    if ((now - sheetArmAt <= 450 && under(['inspector-panel', 'add-sheet'])) || (now - shutArmAt <= 450 && under(['timeline-panel']))) { e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); }
  }
  /* #1243 S34 A: the play row's Link says its state: pressed while linked (the default). Review L3-8 (11 Nov): ONE accessible name, "Link",
     and aria-pressed carries the state (the ARIA toggle pattern: a toggle's name never changes with it; "Links off… not pressed" said the
     state twice). The hover title still explains what the state means. */
  function linkSync() {
    const b = document.getElementById('btn-sm-link');
    if (!b || !FM.spine || !FM.spine.linkMode) return;
    const w = W(), on = FM.spine.linkMode(), p = on ? 'true' : 'false', t = on ? (w.linkTitle || 'Link') : (w.linkOffTitle || 'Link'), name = w.link || 'Link';
    if (b.getAttribute('aria-pressed') !== p) b.setAttribute('aria-pressed', p);
    if (b.title !== t) b.title = t;
    if (b.getAttribute('aria-label') !== name) b.setAttribute('aria-label', name);
  }

  /* ═══ #1243 S6 A: SIMPLE'S EXPORT MENU (1243-B "S6", 1243-R (c) row 12). ═══
     His words (8 Nov): "the export on simple mode is really bad… it literally just says, do you want 1080p export or 720p export? And then
     it starts exporting. Just make an export menu, but make it simple and easy to read."
     Option A (RECOMMENDED; B: three tiles Small · Standard · Best that export on one tap, C: A plus "More options ›" into Full's dialog):
     ONE card, top to bottom: the frame at the playhead and the video's length; Quality (720p · 1080p · 4K); Smoothness (30 · 60 fps, and the
     project's own rate when it is neither); "About 28 MB"; one big Save video. No explanations (his H3). It is a PANEL (1243-R rule 3): on a
     phone the sheet from the stage's bottom edge (js/mobile.js raises it through projectPanel, as for Look), on a PC the whole left band (D20
     A), the bar hidden; nothing starts until Save video is pressed (his "And then it starts exporting" is the fault).
     It runs through what js/app.js already exposes (FM.exportSimple: the dialog's own gates, then runExport with these fixed settings, an
     MP4, never saved as the dialog's defaults) — js/exporter.js and js/app.js are not touched, so Full's Export is exactly today's. */
  const EXPORT_Q = 0.18;                 // Full's High quality, the one Simple has always used (2.7, SU1 #20)
  const EXPORT_KEY = 'fm.sm.export';     // his last pick on this device ({p, fps}); never the dialog's own memory (fm.exportPrefs)
  let expP = 0, expFps = 0, posterAt = NaN, posterCv = null;
  const exportUp = () => {
    if (panelFor !== PROJECT || panelKind !== 'export' || (FM.selectionIds ? FM.selectionIds() : []).length) return false;
    if (!phone.matches) return true;
    const s = document.getElementById('inspector-panel');
    return !!(s && s.classList.contains('open'));
  };
  /* the Export button on screen (the phone's ⬆ or the PC's), where focus goes back to when the panel closes */
  const exportBtn = () => ['m-export', 'btn-export'].map(id => document.getElementById(id)).find(b => b && b.getClientRects().length) || null;
  const expShort = () => { const P = FM.scene.project || {}; return Math.min(+P.width || 0, +P.height || 0); };
  /* Quality's rungs, by the frame's short side, NEVER an upscale (today's rule, 2.7): 720p and 1080p when the frame is that big, 4K only
     when its short side is 2160 or more (1243-B S6 change 2), and a frame below 4K that is not a rung also offers its own size, so the
     file can always be the frame's own size (a 900 px frame: 720p · 900p; a 240 px one: 240p alone; a 1440 px one: 720p · 1080p · 1440p;
     review R12-5: an own size only under 1080 left a 1440p project no way to export at its size) */
  function exportRungs() {
    const short = expShort(), out = [720, 1080, 2160].filter(p => p <= short);
    if (short > 0 && short < 2160 && out.indexOf(short) < 0) out.push(short);
    return out.sort((a, b) => a - b);
  }
  /* Smoothness: 30 and 60, and the project's own rate when it is neither (24, 25, …) */
  function exportRates() {
    const pf = +(FM.scene.project || {}).fps || 30, out = [30, 60];
    if (!out.some(f => Math.abs(f - pf) < 1e-6)) out.push(pf);
    return out.sort((a, b) => a - b);
  }
  /* 0 to the end of the last clip (and an end card after them: #1243 S37 review, it is content and his timeline says it is kept), so the
     black a song or a title runs on into is never in the file — what Simple's export has always covered (2.7) */
  function exportEnd() {
    const P = FM.scene.project || {}, R = FM.spine.read(FM.scene), cards = R.trackEnd > 0 ? FM.spine.overrun(R).ends.map(l => (+l.start || 0) + (+l.duration || 0)) : [];
    return R.trackEnd > 0 ? Math.max.apply(null, [R.trackEnd].concat(cards)) : (+P.duration || 0);
  }
  /* "About 28 MB": what runExport (js/app.js) hands the encoder — min(80 Mb/s, W·H·fps·quality) at this scale — plus the 160 kb/s sound
     track the exporter adds when the project has sound (FM.projectHasAudio), over the length. The same arithmetic as Full's Export card
     (js/export-card.js mp4Bytes); the plan wanted ONE helper exported from js/exporter.js, which this release may not edit, so the
     '1243 R12' test pins this number to the bitrate the exporter is really given. */
  function exportBytes(p, fps, len) {
    const P = FM.scene.project || {}, s = p / expShort();
    const br = Math.min(80e6, Math.round((+P.width || 0) * s * (+P.height || 0) * s * fps * EXPORT_Q));
    const snd = (FM.projectHasAudio && FM.projectHasAudio()) ? 160e3 : 0;
    return (br + snd) * Math.max(0, len) / 8;
  }
  /* what the panel starts on: his last pick on this device when this project offers it, else the top rung and the project's own rate */
  function exportInit() {
    let mem = null;
    try { mem = JSON.parse(localStorage.getItem(EXPORT_KEY) || 'null'); } catch (e) { mem = null; }
    const rungs = exportRungs(), rates = exportRates(), pf = +(FM.scene.project || {}).fps || 30;
    expP = (mem && rungs.indexOf(+mem.p) >= 0) ? +mem.p : rungs[rungs.length - 1];
    expFps = (mem && rates.some(f => Math.abs(f - +mem.fps) < 1e-6)) ? +mem.fps : pf;
  }
  /* review R12-1 / R12-C1: the pick is checked against the project as it is NOW wherever it is used (the panel drawn again, Save video):
     a panel left up while the frame size or rate changed under it (Canvas from the cog, an undo, Home and another project) kept the old
     pick, showed nothing pressed, and Save video exported 2160 / 1080 = an upscale. A pick this project no longer offers starts over. */
  function exportCheck() {
    if (exportRungs().indexOf(expP) < 0 || !exportRates().some(f => Math.abs(f - expFps) < 1e-6)) exportInit();
  }
  function exportKeep() { try { localStorage.setItem(EXPORT_KEY, JSON.stringify({ p: expP, fps: expFps })); } catch (e) {} }
  /* THE PICTURE: the frame at the playhead as the FILE will hold it, rendered (never copied off #preview, which carries guides and the
     isolate) the way Full's Export card draws its own (js/export-card.js drawThumb): the isolate, the crop tool's whole-frame view and the
     effects sheet's preview held aside for the one render and put back. Drawn again only when the playhead has moved (or the project or
     its frame size changed under the panel: review R12-C1). A playhead past the clips' end (the black a song runs on into, which the file
     leaves out) shows the file's last frame instead (review R12-2). */
  function exportPoster() {
    const P = FM.scene.project || {}, t0 = FM._endInstantTime ? FM._endInstantTime(FM.scene, FM.time || 0) : (FM.time || 0);
    const t = Math.max(0, Math.min(t0, exportEnd() - 1 / (+P.fps || 30)));
    const at = [FM.storage && FM.storage.openProjectId ? FM.storage.openProjectId() : '', P.width, P.height, t].join('|');
    if (posterCv && posterAt === at) return posterCv;
    const c = posterCv || el('canvas', 'sm-exp-pic');
    c.setAttribute('aria-hidden', 'true');
    posterCv = c; posterAt = at;
    if (!(P.width > 0) || !(P.height > 0)) return c;
    const k = Math.min(260 / P.width, 144 / P.height);   // twice the phone's 72 px frame (styles.css .sm-exp-pic)
    c.width = Math.max(1, Math.round(P.width * k)); c.height = Math.max(1, Math.round(P.height * k));
    const g = c.getContext('2d');
    if (!g || !FM.renderScene) return c;
    const isoWas = FM.isolate, pvWas = FM._fxPreview, cmpWas = FM._fxCompare, held = (FM.scene.layers || []).filter(l => l && l._cropEditing);
    FM.isolate = null; FM._fxPreview = null; FM._fxCompare = null; held.forEach(l => { l._cropEditing = false; });
    try { g.clearRect(0, 0, c.width, c.height); FM.renderScene(g, FM.scene, t); }
    catch (e) { try { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, c.width, c.height); } catch (x) {} }
    finally { FM.isolate = isoWas; FM._fxPreview = pvWas; FM._fxCompare = cmpWas; held.forEach(l => { l._cropEditing = true; }); }
    return c;
  }
  /* "About 28 MB" for the pick on show (Full's card's own rounding: KB under 1 MB, one decimal under 10 MB) */
  function exportSizeText() {
    const w = W(), n = exportBytes(expP, expFps, exportEnd()) / 1e6;
    const s = !(n > 0) ? '0 KB' : n < 1 ? Math.max(1, Math.round(n * 1000)) + ' KB' : (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10) + ' MB';
    return typeof w.exportSize === 'function' ? w.exportSize(s) : 'About ' + s;
  }
  /* one segmented row: its name, then a button per choice (aria-pressed: the one picked). A press picks it, keeps it for next time and
     puts the size right, in place, so focus stays on the button pressed */
  function exportSeg(box, key, label, list, cur, name, pick) {
    const row = el('div', 'sm-exp-row'); row.dataset.row = key;
    row.appendChild(el('span', 'sm-exp-l', label));
    const seg = el('div', 'sm-exp-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', label);
    list.forEach(v => {
      const b = el('button', 'sm-exp-b', name(v)); b.type = 'button'; b.dataset.exp = key + '-' + v;
      b.setAttribute('aria-pressed', Math.abs(v - cur) < 1e-6 ? 'true' : 'false');
      b.addEventListener('click', e => {
        e.stopPropagation();
        pick(v); exportKeep();
        seg.querySelectorAll('.sm-exp-b').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        const sz = box.querySelector('.sm-exp-size'); if (sz) sz.textContent = exportSizeText();
      });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    box.appendChild(row);
  }
  /* Save video: the panel goes, focus goes back to the Export button, and the export runs through FM.exportSimple — the dialog's gates
     (pause, the owner's export switch, the notepad, clips still arriving), then an MP4 at this size and smoothness. With nothing to export
     it says so in Simple's line instead (runExport's own refusal is a browser alert). */
  function exportGo() {
    const w = W(), short = expShort(), to = exportEnd();
    if (!(FM.scene.layers || []).length || !(to > 0)) { if (FM.spine && FM.spine.say) FM.spine.say(w.exportEmpty || 'Add a clip first, then export it'); return; }
    if (!(short > 0) || !FM.exportSimple) return;
    exportCheck();   // review R12-1: never a pick this frame no longer offers (an upscale)
    const o ={ scale: expP / short, fps: expFps, quality: EXPORT_Q, from: 0, to: to };
    exportKeep();
    FM.simpleTools.closePanel();
    const x = exportBtn(); if (x) x.focus({ preventScroll: true });
    FM.exportSimple(o);
  }
  function exportPanel(root) {
    exportCheck();   // review R12-1: drawn again after the frame size or rate changed, a choice is still pressed and it is one on offer
    const w = W(), box = el('div', 'sm-exp');
    box.setAttribute('role', 'group'); box.setAttribute('aria-label', w.exportTitle || 'Export video');
    /* the first row: the way back (#1243 S9: in the panel's own first row), the frame, and the panel's name over the video's length — one
       row, so the whole card fits the phone's sheet (about 330 px at 380 × 800) with Save video on screen */
    const top = el('div', 'sm-exp-top'), what = el('div', 'sm-exp-what');
    what.append(el('span', 'sm-exp-h', w.exportHead || 'Export'), el('span', 'sm-exp-len', typeof w.exportLen === 'function' ? w.exportLen(exportEnd()) : String(Math.round(exportEnd())) + ' s'));
    top.append(panelBack(), exportPoster(), what);
    box.appendChild(top);
    exportSeg(box, 'q', w.exportQuality || 'Quality', exportRungs(), expP, p => typeof w.exportRung === 'function' ? w.exportRung(p) : p + 'p', v => { expP = v; });
    exportSeg(box, 'fps', w.exportSmooth || 'Smoothness', exportRates(), expFps, f => typeof w.exportFps === 'function' ? w.exportFps(f) : f + ' fps', v => { expFps = v; });
    /* the size, then Save video: stacked on a phone, side by side in the PC band (styles.css), so the whole card fits its ~206 px at 1280 × 800 */
    const foot = el('div', 'sm-exp-foot');
    const go = el('button', 'sm-exp-go', w.exportGo || 'Save video'); go.type = 'button'; go.dataset.exp = 'go';
    go.addEventListener('click', e => { e.stopPropagation(); exportGo(); });
    foot.append(el('div', 'sm-exp-size', exportSizeText()), go);
    box.appendChild(foot);
    /* THE PANEL OWNS ITS KEYS (as the Export list did, review finding 26): Space / Enter / Backspace / Delete and the arrows stay with the
       panel, so they never reach Full's window handler (play, a nudge, a delete); ← / → move between a row's choices. Escape goes on to
       FM.simpleTools.escape, which closes the panel on a PC with focus back on Export. */
    box.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const a = document.activeElement, seg = a && a.closest ? a.closest('.sm-exp-seg') : null;
        if (seg) {
          const bs = Array.from(seg.querySelectorAll('.sm-exp-b')), i = bs.indexOf(a), n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length];
          if (n) n.focus({ preventScroll: true });
          e.preventDefault();
        }
      }
      if (/^(Arrow| $|Enter$|Backspace$|Delete$|Home$|End$)/.test(e.key)) e.stopPropagation();
    });
    box.addEventListener('keyup', e => { if (/^(Arrow| $|Enter$|Backspace$|Delete$|Home$|End$)/.test(e.key)) e.stopPropagation(); });
    root.appendChild(box);
  }

  /* What the tray holds (#1243 S3, S9): in a sub-row its ‹ and that row's controls; with something selected (item mode, or a panel
     over it, drawn hidden so its ‹ brings the row back at once) the ‹ that clears the selection and the selection's tools; in project
     mode nothing (the bar is the project row then). */
  /* #1243 R (a) "Section lines: {divider:true}, a 1 × 24 px rule, no headings": a line between two sections of a tray, never pressed and
     never read out (aria-hidden), a .sm-div and never a .sm-tool, so a tray's tool list is only its tools */
  function divEl() { const d = el('span', 'sm-div'); d.setAttribute('aria-hidden', 'true'); return d; }
  function fillTray(R, ids, one, S, mode) {
    tray.removeAttribute('data-row');
    if (mode === 'project' && !subFor) return;
    if (subFor) {
      const k = subFor.key, d = SUBS[k];
      if (k === 'effects' || k === 'itemfx') tray.setAttribute('data-row', 'effects');   // the pickers' tiles
      tray.setAttribute('aria-label', W()[d.word] || k);
      tray.appendChild(backTool(d.back || 'rowBack', 'back:' + k + '/' + (subFor.from || '')));
      const run = strip(tray);
      d.fill(R, subFor, run);
      edges(run);
      return;
    }
    tray.setAttribute('aria-label', W().clipTools || 'Clip tools');
    tray.appendChild(itemBack());
    const run = strip(tray);
    if (ids.length > 1) {   // §8.5b: the intersection — Stay put on all | Delete (one main clip at a time in 2.2); R (a) "Multi-select: today's tools | Delete"
      const w = W();
      run.appendChild(el('div', 'sm-quiet', (w.selected || (n => n + ' selected'))(ids.length)));
      const all = ids.every(id => !R.isMain(id));
      if (all) run.appendChild(tool({ id: 'stay', label: w.stay || 'Stay put', icon: 'pin', disabled: !!(S.linkMode && !S.linkMode()), why: w.stayUnlinked, run: () => S.cmd.stayMany(ids, true) }));   // ONE step for all of them (§3.2 rule 2); #1243 S34 A: rests while Link is off
      run.appendChild(divEl());
      run.appendChild(tool({ id: 'delete', label: w.delete || 'Delete', icon: 'delete', run: () => { if (all) { if (S.cmd.deleteItems) S.cmd.deleteItems(ids, true); else if (FM.deleteSelected) FM.deleteSelected(); } else S.say((FM.spineWords.lines || {}).deleteOne || 'Delete one clip at a time'); } }));   // review #4: see trayFor's Delete
      edges(run);
      return;
    }
    /* ONE STRIP, ON A PHONE AND A PC ALIKE (#1243 R decision 6, S15's "make it like CapCut where you can scroll it"): the tools scroll in their
       strip with a fade on the edge that hides tools (SU1 #15) and a wheel moves it; Delete is the strip's last tool, after a line (S31), and
       scrolls with the rest. (Until release 8 a PC laid six or more on two rows, his pick B of 6 Oct, and More and 🗑 were a pinned end
       beside the strip; S4 took More away, S31 unpinned 🗑, and S33's lines do not read in a grid.) */
    const withT = withWords(R, one); if (withT) run.appendChild(withTag(withT));   // Phase 3 · Clips › Extras: "Moves with the shape", first in the strip
    trayFor(R, one).forEach(t => run.appendChild(t.divider ? divEl() : tool(t)));
    edges(run);
  }
  /* (More turned into Done with a › cue while its panel was open on a PC, 8 Nov. #1243 S9 hides the bar while a panel is up, so neither
     could ever show: the band title's ‹ is the way back now.) */
  /* Which edges of the tool strip hide tools: a 1 px slack, as the wheel's own bound, so a fractional scroll on a phone's
     display never leaves a fade over a strip that is at its end. A strip that is not laid out (its row hidden in another mode)
     measures 0 and shows none; the ResizeObserver puts them right when it comes back. */
  function edges(run) {
    const box = run && run.parentNode;
    if (!box || !box.classList) return;
    const max = run.scrollWidth - run.clientWidth;
    box.classList.toggle('sm-more-s', max > 1 && run.scrollLeft > 1);
    box.classList.toggle('sm-more-e', max > 1 && run.scrollLeft < max - 1);
  }
  const runSeen = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => edges(e.target))) : null;
  /* #1243 S15: ONE STRIP for every row on the bar — the project row, the item tray's one row, the several-selected tray, every sub-row and
     both effects pickers: a scroller (.sm-run: pan-x, its own overscroll) in a box with a fade at each end, shown on the edge that hides
     tools (edges()); a wheel scrolls it (wheelOn) and a strip that was hidden or changed width puts its fades right (runSeen). */
  function strip(parent) {
    const box = el('div', 'sm-runbox'), run = el('div', 'sm-run');
    const fade = side => { const f = el('span', 'sm-fade sm-fade-' + side); f.setAttribute('aria-hidden', 'true'); return f; };
    box.append(run, fade('s'), fade('e'));
    parent.appendChild(box);
    run.addEventListener('scroll', () => edges(run), { passive: true });
    if (runSeen) runSeen.observe(run);
    return run;
  }
  /* THE BAND'S WORDS (js/inspector.js draws them, bandWords, and may do so before the tray is refilled for a new selection, so every
     refill puts them right). #1255's 20:53 follow-up, his words: "There shouldn't be any explanations like that. We have tutorials for a
     reason". The PC band said "Tap a clip to see its tools" with nothing selected and "Its tools are below" with something selected,
     every time: both went, and the band is empty (styles.css hides the empty line, so it takes no room). What stays is a fact about the
     item, not a how-to: a layer of an element moving with the rest says so (Phase 3 · Clips › Extras, "Moves with ‘Hello’"). */
  function bandWords(layer) {
    if (!layer) return '';
    const id = (layer && layer.id) || ((FM.selectionIds ? FM.selectionIds() : [])[0] || null);
    const R = FM.simpleTimeline && FM.simpleTimeline.read ? FM.simpleTimeline.read() : null;
    return id ? withWords(R, id) : '';
  }
  function hintFollows() {
    const h = document.querySelector('#inspector > .sm-band-hint[data-sel]');
    if (h) { const t = bandWords(true); if (h.textContent !== t) h.textContent = t; }
  }

  /* ═══ PHASE 3 · LOOK — THE PANEL (queue 980; DESIGN §8.5, §8.7 "Filters + strength …; Adjust", D20 A; #1243 S12: the whole video's). ═══
     Since #1243 S12 Look is on the PROJECT ROW and works on the project's Look layer (js/spine-edit.js, LOOK FOR THE WHOLE VIDEO), so its
     panel opens with nothing selected (panelFor PROJECT): drawn by js/inspector.js into #inspector through drawPanel(root, null), as
     Extras is on a PC — the whole left band, the bar hidden — and on a phone in the sheet js/mobile.js raises for it from the sheet line
     (FM.simpleTools.projectPanel). Two tabs: FILTERS — chips for the sections over ONE strip of None and the sections (his favourites, his
     own, the library's by its own names), each a tile with the library's own picture (FM.fxThumbs, the Filters tab's tiles), a tap is one
     step; and the filter's Strength under them while one is on. ADJUST — Brightness, Contrast, Saturation, Exposure, Warmth and Vignette,
     and Reset. A slider shows the picture as it moves (FM.spine.lookApply on the live look layer, once there is one) and writes ONE step
     when it is let go: the preview is taken back to the byte first, then FM.spine.cmd.projectLook writes it, so a refused step leaves
     nothing behind. Built with createElement / textContent: a filter's name can be his own words (a saved filter), never markup. */
  /* …taken back only while the clip's stack is still exactly what the preview made it: an edit that landed meanwhile (a friend's,
     an undo) is never written over with the old stack */
  function lookUndrag() {
    if (!lookDrag) return;
    const d = lookDrag, L = FM.layerById && FM.scene ? FM.layerById(FM.scene, d.id) : null;
    lookDrag = null;
    if (L && d.last != null && JSON.stringify(L.effects || [], FM.jsonReplacer) === d.last) { try { L.effects = JSON.parse(d.pre); } catch (e) {} }
    if (FM.requestRender) FM.requestRender();
  }
  /* #1243 S12 (C S12 change 7, his words: "the look menu is good… it's just not organized at all"): THE STRIP'S SECTIONS — his own saved
     filters, his favourites, then the library's sections by their own names (FM.filters.sections(), read here, never copied), each only when
     it holds a look. A favourite shows in Favourites AND in its own section, as Full's Filters tab shows it (js/filters.js faves). */
  function lookSections() {
    const F = FM.filters, w = W(), out = [];
    if (!F) return out;
    const valid = list => (list || []).filter(f => f && f.id);
    try {
      /* 1243-R (a) item 7's order: Yours · Favourites · the sections */
      const own = valid(F.custom ? F.custom() : []);
      if (own.length) out.push({ key: 'yours', label: w.lookYours || 'Yours', list: own });
      const fav = valid(F.faves ? F.faves() : []);
      if (fav.length) out.push({ key: 'fav', label: w.lookFaves || 'Favourites', list: fav });
      (F.sections ? F.sections() : []).forEach(s => {
        const list = valid(F.bySection ? F.bySection(s.key) : []);
        if (list.length) out.push({ key: String(s.key), label: String(s.label || s.key), list: list });
      });
      if (!out.length && F.all) { const all = valid(F.all()); if (all.length) out.push({ key: 'all', label: w.lookFilters || 'Filters', list: all }); }
    } catch (e) {}
    return out;
  }
  /* L: the project's Look layer, or null before the first pick (then a slider has nothing to preview on, and its release makes the layer) */
  function lookSlider(L, key, label, lo) {
    const S = FM.spine, w = W(), id = L ? L.id : null, now = S.lookValue(L, key), frag = document.createDocumentFragment();
    const pctLike = key === 'strength' || key === 'vignette';
    const fmt = v => pctLike ? (key === 'strength' ? v + '%' : String(v)) : (v > 0 ? '+' + v : String(v));
    const op = v => key === 'strength' ? { kind: 'strength', v: v } : { kind: 'adjust', key: key, v: v };
    const row = el('div', 'sm-look-row');
    const rng = el('input', 'sm-look-r'); rng.type = 'range'; rng.min = String(lo); rng.max = '100'; rng.step = '1';
    rng.value = String(Math.max(lo, Math.min(100, now))); rng.dataset.key = key; rng.dataset.look = 'r-' + key;
    rng.setAttribute('aria-label', label);
    const val = el('span', 'sm-look-v', fmt(now));
    rng.addEventListener('input', () => {
      const v = Math.round(parseFloat(rng.value)), Lx = id ? FM.layerById(FM.scene, id) : null;
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
      if (v !== now) S.cmd.projectLook(op(v));
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
  /* #1243 S11, A GUARD — THE PICTURE TILES MOUNT WHEN THEY COME INTO VIEW. His words, 8 Nov: "stuck on one frame and… nothing is like really
     working cleanly… And I just added like an effect". Not reproduced on the laptop (v18.29, the s11probe), so the cause is unmeasured: S11
     stays open, waiting on his screen recording. What this guards: every picker tile was mounted the moment its strip was drawn — the
     Effects strip held 44 (counted 9 Nov; 42 since #1243 S10 left out Glow and Auto Grade) — and each mount is a live render (js/fx-thumbs.js generates one per animation frame, and its shared timer repaints every
     animated tile still in the page, on screen or not), all competing with the preview for every frame on his phone. Now ONLY THE TILES IN
     VIEW HOLD A LIVE PICTURE, at all times: each tile's canvas waits outside the page (a same-size placeholder holds its place) until the
     tile comes within 60 px of the strip's view (an IntersectionObserver rooted on the strip, watching the tiles), then goes in and is
     mounted; when the tile leaves that margin the canvas comes out again, and fx-thumbs' timer, which repaints only canvases in the page,
     drops it. Mounting once was not enough (the logger's review): a scroll end to end would have left all of them live. A return remounts,
     which is cheap: fx-thumbs keeps the frames. THIS IS THE CONTRACT the tiles' pictures plug into (the FX1 effect pictures too):
     `mount(item)` is called each time a tile comes into view. js/fx-thumbs.js itself is untouched: Full's effects browser shares it. */
  const LAZY_AHEAD_PX = 60;
  function lazyTiles(strip, items, mount) {
    if (typeof IntersectionObserver !== 'function') { items.forEach(it => { try { mount(it); } catch (e) {} }); return null; }
    const byTile = new Map();
    items.forEach(it => {
      const cv = it[0], tile = cv.parentNode;
      if (!tile) return;
      const rest = document.createElement('span');
      rest.className = cv.className + ' sm-th-rest'; rest.setAttribute('aria-hidden', 'true');
      cv.replaceWith(rest);
      byTile.set(tile, { it: it, cv: cv, rest: rest, live: false });
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const t = byTile.get(en.target); if (!t) return;
        if (en.isIntersecting && !t.live) {
          if (t.rest.parentNode) t.rest.replaceWith(t.cv);
          t.live = true;
          try { mount(t.it); } catch (e) {}
        } else if (!en.isIntersecting && t.live) {
          if (t.cv.parentNode) t.cv.replaceWith(t.rest);
          t.live = false;
        }
      });
    }, { root: strip, rootMargin: '0px ' + LAZY_AHEAD_PX + 'px 0px ' + LAZY_AHEAD_PX + 'px' });
    byTile.forEach((t, tile) => io.observe(tile));
    return io;
  }
  /* #1243 S12: the chip for the section in view lights up as the strip scrolls: the last section whose divider lies left of the strip's
     middle (the first one before any does), and the chip row keeps it in sight */
  function lookLight(strip) {
    const box = strip && strip.parentNode, chips = box && box.querySelector(':scope > .sm-look-chips');
    if (!chips) return;
    const mid = strip.getBoundingClientRect().left + strip.clientWidth / 2, heads = Array.from(strip.querySelectorAll(':scope > .sm-look-sec'));
    let on = heads.length ? heads[0].dataset.sec : '';
    heads.forEach(h => { if (h.getBoundingClientRect().left <= mid) on = h.dataset.sec; });
    let lit = null;
    chips.querySelectorAll(':scope > .sm-look-chip').forEach(c => { const p = c.dataset.sec === on; c.setAttribute('aria-pressed', p ? 'true' : 'false'); if (p) lit = c; });
    if (lit) {
      const cr = lit.getBoundingClientRect(), rr = chips.getBoundingClientRect();
      if (cr.left < rr.left || cr.right > rr.right) chips.scrollLeft += cr.left - rr.left - 8;
    }
  }
  /* a chip's tap: its section's divider to the strip's start (or as far as the strip goes), so its first tile is in view */
  function lookToSection(strip, key) {
    const h = strip.querySelector(':scope > .sm-look-sec[data-sec="' + CSS.escape(key) + '"]');
    if (!h) return;
    const d = h.getBoundingClientRect().left - strip.getBoundingClientRect().left;
    strip.scrollLeft = Math.max(0, Math.min(strip.scrollWidth - strip.clientWidth, strip.scrollLeft + d));
    lookLeft = strip.scrollLeft;
    lookLight(strip);
  }
  function lookFilters(box, L) {
    const w = W(), lk = FM.spine.lookOf(L), cur = lk.filter ? lk.filter.fid : '', secs = lookSections();
    const cvs = [];
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
        cvs.push([cv, fid]);   // mounted when it comes into view (lazyTiles, #1243 S11)
      } else {
        const n = el('span', 'sm-look-th sm-look-none');
        n.innerHTML = svg('none');   // a fixed string, never user data
        b.appendChild(n);
      }
      b.appendChild(el('span', 'sm-look-name', name));
      b.addEventListener('click', e => { e.stopPropagation(); if (fid !== (cur || '')) FM.spine.cmd.projectLook({ kind: 'filter', fid: fid || null }); });
      return b;
    };
    /* #1243 S12: ONE STRIP, each section opened by a thin divider with its name, and a row of chips over it, one per section: a tap
       brings that section into view (his pick: chips over one strip, so the picture stays in view on a phone). Names are text, never markup. */
    const chips = el('div', 'sm-look-chips');
    chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', w.lookChips || 'Filter sections');
    strip.appendChild(tile('', w.lookNone || 'None'));
    secs.forEach(s => {
      const h = el('div', 'sm-look-sec'); h.dataset.sec = s.key;
      h.appendChild(el('span', 'sm-look-sec-l', s.label));
      strip.appendChild(h);
      s.list.forEach(f => { const t = tile(String(f.id), String(f.name || f.id)); t.dataset.sec = s.key; strip.appendChild(t); });
      const c = el('button', 'sm-look-chip', s.label); c.type = 'button'; c.dataset.sec = s.key; c.dataset.look = 'chip-' + s.key;
      c.setAttribute('aria-pressed', 'false');
      c.addEventListener('click', e => { e.stopPropagation(); lookToSection(strip, s.key); });
      chips.appendChild(c);
    });
    strip.addEventListener('scroll', () => { lookLeft = strip.scrollLeft; lookLight(strip); }, { passive: true });
    if (secs.length) box.appendChild(chips);
    box.appendChild(strip);
    requestAnimationFrame(() => { if (strip.isConnected) lookLight(strip); });   // once the panel is laid out
    if (FM.fxThumbs && FM.fxThumbs.mountFilter) lazyTiles(strip, cvs, q => FM.fxThumbs.mountFilter(q[0], q[1], null));
    if (lk.filter) box.appendChild(lookSlider(L, 'strength', w.lookStrength || 'Strength', 0));
  }
  function lookAdjust(box, L) {
    const w = W(), S = FM.spine;
    /* (With no look yet a slider has no layer to show the picture on, so it changes when let go. The R9 review's line saying so, "Let go
       to see it", stood over the sliders every time; it went with #1255's 20:53 follow-up, his words: "There shouldn't be any explanations
       like that". Letting go shows it, and from then on the sliders show the picture as they move.) */
    (S.LOOK_ADJ || []).forEach(d => box.appendChild(lookSlider(L, d.key, w[d.word] || d.key, d.lo)));
    const rs = el('button', 'sm-look-reset', w.lookReset || 'Reset'); rs.type = 'button'; rs.dataset.look = 'reset';
    if (!S.lookOf(L).adjust) rs.setAttribute('aria-disabled', 'true');
    rs.addEventListener('click', e => { e.stopPropagation(); if (rs.getAttribute('aria-disabled') !== 'true') S.cmd.projectLook({ kind: 'reset' }); });
    box.appendChild(rs);
  }
  /* #1243 S12: a line in the panel with its one-step button (the words are the words file's, never data) */
  function lookLine(text, label, key, fn) {
    const n = el('div', 'sm-look-line'); n.dataset.line = key;
    n.appendChild(el('span', 'sm-look-note-t', text));
    const b = el('button', 'sm-look-full', label); b.type = 'button'; b.dataset.look = 'line-' + key;
    b.addEventListener('click', e => { e.stopPropagation(); fn(); });
    n.appendChild(b);
    return n;
  }
  /* L: the project's Look layer, or null before the first pick */
  function lookPanel(root, L) {
    const w = W(), S = FM.spine, box = el('div', 'sm-look');
    box.setAttribute('role', 'group'); box.setAttribute('aria-label', w.look || 'Look');
    const tabs = el('div', 'sm-look-tabs');
    tabs.appendChild(panelBack());   // #1243 S9: the way back, in the panel's own first row (no header row: queue 835)
    [['filters', w.lookFilters || 'Filters'], ['adjust', w.lookAdjust || 'Adjust']].forEach(t => {
      const b = el('button', 'sm-look-tab', t[1]); b.type = 'button'; b.dataset.tab = t[0]; b.dataset.look = 'tab-' + t[0];
      b.setAttribute('aria-pressed', lookTab === t[0] ? 'true' : 'false');
      b.addEventListener('click', e => { e.stopPropagation(); if (lookTab === t[0]) return; lookUndrag(); lookTab = t[0]; if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh(); });
      tabs.appendChild(b);
    });
    box.appendChild(tabs);
    /* #1243 S12: CLIPS THAT KEEP A LOOK OF THEIR OWN (the tray's Look, before Look was the video's): how many, and Remove them, ONE step that
       takes off only those looks (S.planProjectLook 'clipsOff'). And a look that ends before the last clip (clips added in Full; every
       Simple step keeps it whole): Fix, one step. Nothing is written for either until he presses it. */
    const own = S.clipLooks ? S.clipLooks().length : 0;
    if (own) box.appendChild(lookLine(typeof w.lookClipsOwn === 'function' ? w.lookClipsOwn(own) : own + ' clips have their own look',
      typeof w.lookClipsOff === 'function' ? w.lookClipsOff(own) : 'Remove them', 'clipsOff', () => S.cmd.projectLook({ kind: 'clipsOff' })));
    const R = (FM.simpleTimeline && FM.simpleTimeline.read && FM.simpleTimeline.read()) || S.read(FM.scene);
    if (S.lookEndsEarly && S.lookEndsEarly(R)) box.appendChild(lookLine(w.lookEndsEarly || 'The look doesn’t cover the whole video', w.fix || 'Fix', 'fix', () => S.cmd.projectLook({ kind: 'fix' })));
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
    top.append(panelBack(), add);   // #1243 S9: the way back first, in the panel's own first row
    box.appendChild(top);
    const list = el('div', 'sm-cap-list'), cues = (FM.captions && FM.captions.cues) ? FM.captions.cues(L) : [];
    list.setAttribute('role', 'list');
    if (!cues.length) list.appendChild(el('div', 'sm-cap-none', w.capNone || 'No lines yet'));
    cues.forEach((c, i) => {
      const row = el('div', 'sm-cap-row'); row.setAttribute('role', 'listitem');
      const at = capTime((+L.start || 0) + (+c.start || 0)), words = String(c.text == null ? '' : c.text).trim();
      const b = el('button', 'sm-cap-t'); b.type = 'button'; b.dataset.cap = 'line-' + i;
      b.appendChild(el('span', 'sm-cap-time', at));
      b.appendChild(el('span', 'sm-cap-w' + (words ? '' : ' sm-cap-empty'), words || (w.capEmpty || 'Empty')));
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
     THE SEGMENT'S TRAY: Change effect (only when it holds one plain effect) · Strength · Stay put | Delete (#1243 R release 8), its Delete Simple's own
     one-step Delete effect. STRENGTH is an inline row like Volume: a slider that previews on the canvas while it moves and writes
     ONE step when let go (the preview taken back to the byte first, as Look's sliders do).
     Built with createElement / textContent: an effect's name is put in as text, never markup. */
  /* #1243 R release 8, R (a) "Effect segment: Change effect · Strength · Stay put | Delete" (Delete is Simple's own one-step Delete effect).
     A segment holding several effects has no Change effect: More opened them in Full's panel until #1243 S4, so it offers Open in Full now
     (and its refusal line says so). Review R8-2: a segment of ONE effect has Open in Full too, the only way to that effect's own settings
     (its speed, amount, colour…) until the Effects library gives them a Simple row (S13 / S30) */
  function segmentTray(id, l, stay) {
    const S = FM.spine, w = W(), list = [], one = S.segmentEffect(l) || !(l.effects || []).length;
    if (one) list.push({ id: 'change', label: w.change || 'Change effect', icon: 'change', run: () => FM.simpleTools.openEffects(id) });
    list.push({ id: 'strength', label: w.strength || 'Strength', icon: 'strength', run: () => FM.simpleTools.openRow('strength', id) });
    list.push(stay);
    if ((l.effects || []).length) list.push(openFullT(w));   // one effect or several; an empty segment has nothing there to set
    return secs([list, [{ id: 'delete', label: w.delete || 'Delete', icon: 'delete', run: () => S.cmd.deleteEffect(id) }]]);
  }
  /* #1243 S9: the picker is the `effects` sub-row (subFor.id: the segment Change effect is for, or null for a new one); its ‹ (fxBack) is drawn by fillTray */
  function fxFill(R, s, run) {
    const S = FM.spine, w = W(), seg = s.id ? FM.layerById(FM.scene, s.id) : null;
    const cur = seg ? ((S.segmentEffect(seg) || {}).type || '') : null;   // null: a new segment, so no tile is pressed
    const cvs = [];
    run.classList.add('sm-fx-run'); run.setAttribute('role', 'group'); run.setAttribute('aria-label', w.effects || 'Effects');
    (S.segmentEffects ? S.segmentEffects() : []).forEach(reg => {
      const type = String(reg.type), name = String(reg.label || type);
      /* #1243 S10 change 5: a refusal ('segmentNoClip', 'segmentOnClip', a lock…) is said in the tray row, and the picker was holding that
         row, so the line came up over the tiles and the picker came back under it. A new segment's pick closes the picker FIRST (as the
         item picker does): it lands as the segment's own tray, or its refusal is said in a row that shows it. Change effect keeps the
         picker up when it lands, so only a refusal said during its tap closes it (pickTap, read by the line hook below). */
      const b = tool({ id: 'fx:' + type, label: name, icon: null, pressed: cur == null ? null : cur === type,
        run: () => {
          if (seg) { if (cur !== type) { pickTap = true; try { S.cmd.changeEffect(seg.id, type); } finally { pickTap = false; } } return; }
          const t = FM.time || 0, back = !!(document.activeElement && tray.contains(document.activeElement));
          FM.simpleTools.closeEffects();
          if (back) { const a = tools && tools.querySelector('.sm-tool[data-tool="effects"]'); if (a) a.focus({ preventScroll: true }); }   // the tool that opened it keeps focus (§3.12 1a)
          S.cmd.addEffect(type, t);
        } });
      b.classList.add('sm-fx-tile');
      const cv = el('canvas', 'sm-fx-th'); cv.setAttribute('aria-hidden', 'true');
      b.insertBefore(cv, b.firstChild);
      run.appendChild(b); cvs.push([cv, type]);
    });
    if (FM.fxThumbs && FM.fxThumbs.mount) lazyTiles(run, cvs, p => FM.fxThumbs.mount(p[0], p[1]));   // #1243 S11: as they come into view
  }
  /* the project row's Effects shows pressed while it has the picker open for a new segment */
  function fxMark() {
    const b = tools && tools.querySelector('.sm-tool[data-tool="effects"]');
    if (b) b.setAttribute('aria-pressed', subFor && subFor.key === 'effects' && !subFor.id ? 'true' : 'false');
  }
  /* …and Look while its panel is open (#1243 S12) */
  function lookMark() {
    const b = tools && tools.querySelector('.sm-tool[data-tool="look"]');
    if (b) b.setAttribute('aria-pressed', panelFor === PROJECT && panelKind === 'look' ? 'true' : 'false');
  }
  /* what sync's signature needs from this block: the picker, and the selected segment's effect and strength (Change effect and Undo
     move the pressed tile; a strength step or its Undo moves the slider) */
  /* #1243 R release 8b: what Motion blur, Smooth skin, Quieter background, Sound styles and Clear voice show pressed is read from the item's
     effects and its sound's audio effects and Reduce noise state, so a change to any of them (a press, an undo, an edit in Full) redraws */
  function fxSig(R, l, one) {
    if (!l || !one) return '';
    const S = FM.spine, t = S.soundFxTarget ? S.soundFxTarget(R, one) : null, N = FM.noiseReduction;
    try { return JSON.stringify([(l.effects || []).map(f => f && [f.type, f.enabled !== false]), t ? [t.id, t.audioFx || null, N && N.state ? N.state(t) : ''] : null], FM.jsonReplacer); }
    catch (e) { return ''; }
  }
  function segSig(l) {
    const a = subFor && (subFor.key === 'effects' || subFor.key === 'itemfx') ? 'fx/' + (subFor.id || '') + (subFor.key === 'itemfx' ? '/on' : '') : '';   // '/on': the item picker (Phase 3 · Effects on an item)
    const b = (l && l.type === 'adjustment') ? JSON.stringify([(l.effects || []).map(f => f && f.type), l.transform ? l.transform.opacity : 1]) : '';
    return a + '|' + b;
  }
  /* …taken back only while the value is still exactly what the preview made it: an edit that landed meanwhile is never written over.
     #1243 R release 8: the key it previews (Strength and Opacity: opacity; Size: scale) */
  function segUndrag() {
    slideUndrag();   // #1243 R release 10: every way a slider's preview is taken back takes Slide's back too (a redraw, a ‹, the switch, _reset)
    if (!segDrag) return;
    const d = segDrag, k = d.key || 'opacity', L = FM.layerById && FM.scene ? FM.layerById(FM.scene, d.id) : null;
    segDrag = null;
    if (L && L.transform && JSON.stringify(L.transform[k]) === d.last) { try { if (d.pre === undefined) delete L.transform[k]; else L.transform[k] = JSON.parse(d.pre); } catch (e) {} }
    if (FM.requestRender) FM.requestRender();
    if (k !== 'opacity' && FM.canvasEdit && FM.canvasEdit.update) FM.canvasEdit.update();
  }
  /* a slider's first move keeps what to put back (a new layer or key starts a new holder) */
  function dragStart(L, key) {
    if (segDrag && segDrag.id === L.id && (segDrag.key || 'opacity') === key) return;
    segUndrag();
    segDrag = { id: L.id, key: key, pre: JSON.stringify(L.transform[key]), last: null };
  }
  function strengthRow(R, s, run) {
    const S = FM.spine, w = W(), id = s.id, l = FM.layerById(FM.scene, id);
    if (!l || !S.segmentStrength) return;
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
    run.append(rng, val);
  }

  /* ═══ PHASE 3 · EFFECTS ON AN ITEM (queue 980; DESIGN §8.5c item 3, §8.5 the Overlay and Text trays). ═══
     ADD EFFECT in a title's or an overlay's tray opens the effects picker in the tray row, as the project row's Effects does (the
     row itself is the panel, so nothing above it moves): Done, then one tile per effect THIS item can run (FM.spine.itemEffects —
     his presets and the shipped ones first, then the browser's categories without 3D, Keying and Repetition), each with the
     browser's own sample picture. Nothing is written until a tile is tapped (§8.5c item 1, pick first). A tap closes the picker,
     back to the item's tray with Add effect where it was, and runs ONE step (FM.spine.cmd.itemEffect) that puts that effect on the
     item; the line "Added Shake to “Hi”" is said in #sm-live (§3.12 1a). Any other selection, Done or leaving Simple closes it, as
     the segment picker does: the `itemfx` sub-row (#1243 S9). Built with createElement / textContent: a preset's name can be his
     own words, never markup. */
  function itemFxFill(R, s, run) {
    const S = FM.spine, w = W(), id = s.id, L = id ? FM.layerById(FM.scene, id) : null;
    const cvs = [];
    run.classList.add('sm-fx-run'); run.setAttribute('role', 'group'); run.setAttribute('aria-label', w.addEffect || 'Add effect');
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
    /* #1259, his words (23 Nov): "in the simple editor, the effects is just all the same image and they don't really actually show you what
       it is that is happening". A preset used to be drawn live on the one sample photo (mountPreset), and the presets come first in this
       row, so the first screen was a dozen near-identical photos. Every tile now shows the drawn picture of the effect it puts on the
       item: a preset shows its base effect's picture (S.itemEffects gives a preset's `type` as its fx), a stock effect its own. */
    const T = FM.fxThumbs;
    if (T && T.mount) lazyTiles(run, cvs, q => T.mount(q[0], q[1].type));   // #1243 S11: as they come into view
  }

  /* ═══ PHASE 3 · CLIPS › EXTRAS (queue 980; DESIGN §8.5 the Clips row "Add clips … · Extras (D21, from Phase 3): saved elements, shapes
     and templates, reusing addmenu's Elements, Shape and Template tab contents through the §14.2 tabs option, each pick running §12.2's
     insert command"; §17 D21, his answer 1 Oct "D21 A"). ═══
     CLIPS opens its row (#1243 S9: a sub-row, it was a short list): Add clips (what Clips did until Phase 3: the picker, or At the end /
     After Clip N with the playhead inside the clips) and Extras. EXTRAS is the Add menu itself (js/addmenu.js render, with its opt-in
     `tabs`), showing only three tabs: Elements — his saved elements as tiles with their own pictures (Full keeps them behind its Custom
     elements browser) — Shape, and Template, each tile's tap running Simple's own one-step command (FM.spine.cmd.addShape / addElement /
     addTemplate), never Full's add. It is a panel: on a phone it is the Add sheet he knows, risen from the bottom (FM.mobile.openAdd, then
     the three tabs drawn into it); on a PC it takes the left band, where Look's panel goes (D20 A), with the band title's ‹ as its way
     back. The bar hides while it is up, and the Clips row is under it when it goes. It needs nothing selected (a selection is let go
     first), and it closes on a pick, on its ‹, on any selection, or on leaving Simple. Its open tab and pages are its own: Full's Add menu
     reopens on the tab Full left it on. Names are his own words: addmenu's cards put them in as text. */
  let extrasOpen = false;
  /* (7B grew the PC band while a panel was open, 6 Nov. #1243 S9 gives a panel the whole band and hides the bar instead, so the picture
     keeps its size and nothing is grown, stored or put back: 1280×800 leaves the panel about 207 px, what 7B's growth gave it.) */
  const xIco ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/></svg>';
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
     against #inspector itself (`host`), and the band's title row says Extras, as Full's says Add, with its ‹ in front (pbackSync): the
     bar hides while Extras is up, so the whole band is the menu's (#1243 S9). */
  function drawExtras(root, title) {
    const w = W();
    if (title) title.textContent = w.extras || 'Extras';
    if (!FM.addMenu || !FM.addMenu.render) return false;
    FM.addMenu.render(root, { variant: 'panel', tabs: extrasTabs(), host: root, onAfterAdd: () => FM.simpleTools.closeExtras() });
    const am = root.querySelector(':scope > .addmenu');
    if (am) { am.dataset.sm = 'extras'; am.setAttribute('aria-label', w.extras || 'Extras'); }
    return true;
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
  /* #1243 S10 change 5: a refusal said while Change effect's tap is in flight closes the picker before the line takes the tray row */
  let pickTap = false;
  function pickSay(text, opts) {
    if (pickTap && subFor && subFor.key === 'effects' && opts && opts.refusal && !opts.live) { subFor = null; segUndrag(); lastSig = ''; FM.simpleTools.sync(); }
    return tfSay(text, opts);
  }
  if (FM.spine) FM.spine.sayOver = pickSay;

  /* ═══ #1243 S3 · S9 (R rule 1): WHICH OF THE FOUR MODES THE BAR IS IN. A panel is up when Extras is (the PC band or the phone's Add
     sheet), or More's / Look's / Edit lines' panel is open for the one selected item: on a phone only while its sheet is really up (a
     grab-bar close leaves panelFor set, finding 20: the mode is item then, and More raises it again as today). ═══ */
  const extrasUp = () => extrasOpen || !!document.querySelector('#add-sheet.open > #add-grid > .addmenu[data-sm="extras"]');
  function panelUp(ids) {
    if (extrasUp()) return true;
    if (!panelFor) return false;
    if (panelFor === PROJECT ? ids.length > 0 : (ids.length !== 1 || ids[0] !== panelFor)) return false;   // #1243 S12: Look's is open for no item
    if (!phone.matches) return true;
    const s = document.getElementById('inspector-panel');
    return !!(s && s.classList.contains('open'));
  }
  function modeOf(ids) {
    if (panelUp(ids)) return 'panel';
    if (subFor) return 'sub';
    return ids.length ? 'item' : 'project';
  }
  /* a panel goes: Look's slider preview taken back, nothing open, every part drawn again (closePanel, and a sub-row opened over it) */
  function dropPanel() { lookUndrag(); panelFor = null; panelKind = null; lastSig = ''; FM.refreshAll(); }
  /* THE PANEL'S WAY BACK, for the focus rule (the 9 Nov review, MODE-3): the band title's ‹ (More, Extras on a PC), Look's or Edit lines'
     own ‹, the phone sheet's grab bar, the phone's Add sheet (Extras) — the first one on screen */
  function panelBackEl() {
    const sel = ['#inspector-panel > .panel-title > .sm-pback', '#inspector .sm-look-tabs > .sm-pback', '#inspector .sm-cap-top > .sm-pback', '#inspector .sm-exp-top > .sm-pback', '#inspector-panel.open > #insp-grab', '#add-sheet.open button'];   // #1243 S6: Export's ‹
    for (const s of sel) { const n = document.querySelector(s); if (n && n.getClientRects().length) return n; }
    return null;
  }
  /* A tool that opens a panel had the focus (More, Look, Edit lines, Style, Extras, by the keyboard): the bar hides with the panel, so
     focus goes to the panel's way back, not to <body>. A panel the band draws after this sync (Look's, Edit lines') gets it a frame on. */
  function panelFocus() {
    const go = () => { const n = panelBackEl(); if (n) n.focus({ preventScroll: true }); return !!n; };
    if (go()) return;
    requestAnimationFrame(() => {
      const a = document.activeElement;
      if (isSimple() && bar && bar.dataset.mode === 'panel' && (!a || a === document.body || !a.isConnected || bar.contains(a))) go();
    });
  }

  FM.simpleTools = {
    /* review L3-6 (11 Nov): the playhead moved (simple-timeline.js updatePlayhead). An open Caption looks row is drawn for the track under
       the line and the look it wears, and its tiles act on the track under the line at the tap, so it is drawn again when either changes
       (sync's row signature carries both); with any other row, or in Full, this does nothing. */
    timeMoved() {
      if (!bar || !isSimple()) return;
      /* the 11 Nov verifiers' V2: one item's tray holds a Split that rests while the line is outside the item, so the tray is drawn
         again when the line crosses the item's edge (sync's signature carries splitAt; a redraw only on the crossing) */
      if (!subFor) {
        const ids = FM.selectionIds ? FM.selectionIds() : [], l = ids.length === 1 ? FM.layerById(FM.scene, ids[0]) : null;
        if (l && splitAt(l) !== splitDrawn) FM.simpleTools.sync();
        return;
      }
      if (subFor.key !== 'caplooks') return;
      const T = capTrackNow(), k = T ? T.id + '/' + (FM.spine.captionLookOf ? FM.spine.captionLookOf(T) : '') : '';
      if (k !== capKeyDrawn) FM.simpleTools.sync();
    },
    /* Called by the Simple timeline's rebuild and by syncSelectionChrome: re-draws the tray only when what it shows changed */
    sync() {
      if (!mount()) return;
      const ae = document.activeElement;   // read before anything below takes a ‹ out of the page (pbackSync), for the focus rule
      if (!isSimple()) {
        home(); if (lookDrag) lookUndrag(); if (subFor || segDrag) { subFor = null; segUndrag(); } extrasOpen = false;
        pbackSync(null); bar.removeAttribute('data-mode'); bar.removeAttribute('data-sub'); bar.style.removeProperty('--sm-sheet-b'); hintSync('off');
        return;
      }
      place();
      linkSync();
      const S = FM.spine, R = (FM.simpleTimeline && FM.simpleTimeline.read && FM.simpleTimeline.read()) || S.read(FM.scene);
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      /* Phase 3 · Clips › Extras: a selection (a pick's own, or a tap) closes it, and so does any sub-row but the Clips row it opened from (one menu at a time) */
      if (extrasOpen && (ids.length || (subFor && subFor.key !== 'clips'))) { extrasOpen = false; extrasMark(); if (!ids.length && FM.inspector && FM.inspector.refresh) FM.inspector.refresh(); }
      /* §3.12 rule 1b: a line dismisses on a selection change, so the new selection's tools are never hidden behind it */
      const selKey = ids.join(',');
      if (selKey !== lastSel) { if (lastSel !== null && FM.simpleTimeline && FM.simpleTimeline.clearSay) FM.simpleTimeline.clearSay(); lastSel = selKey; }
      /* a panel goes with its item; the project's Look panel with any selection at all (#1243 S12), as Extras does */
      if (panelFor && (panelFor === PROJECT ? ids.length > 0 : (ids.length !== 1 || ids[0] !== panelFor))) { panelFor = null; panelKind = null; lookUndrag(); }
      /* #1243 S9: another selection closes a sub-row, and so does its item going (an undo, a friend's delete) */
      /* (#1243 S1 A: a clip's own Transition opens the row of the cut AFTER it on the first clip: that row acts on the next clip but belongs
         to this selection, subFor.of) */
      const own = subFor && (subFor.of || subFor.id);
      if (subFor && (subFor.sel !== selKey || (own && (ids.length !== 1 || ids[0] !== own || !FM.layerById(FM.scene, subFor.id))))) { subFor = null; segUndrag(); }
      const one = ids.length === 1 ? ids[0] : null, l = one && FM.layerById(FM.scene, one);
      /* THE BAR'S MODE (#1243 S3, S9): styles.css shows the project row only in project mode and the tray only in item and sub mode, so
         the bar is one row and exactly one menu is on screen. On a phone a panel's spoken line floats just above the sheet line. */
      const mode = modeOf(ids);
      if (bar.dataset.mode !== mode) bar.dataset.mode = mode;
      if (mode === 'sub') bar.dataset.sub = subFor.key; else bar.removeAttribute('data-sub');
      if (phone.matches && mode === 'panel' && FM.mobile && FM.mobile.sheetLine) bar.style.setProperty('--sm-sheet-b', Math.max(0, innerHeight - FM.mobile.sheetLine()) + 'px');
      else bar.style.removeProperty('--sm-sheet-b');
      pbackSync(mode);
      /* (the project row keeps its place across the trips to the other modes by itself: Chrome keeps a hidden strip's offset, measured by
         the 1243 R4 S15 test with a restore here taken out, so none is kept here; runSeen puts its fades right when it comes back) */
      const rowTarget = subFor && subFor.id && ROW_KEYS.has(subFor.key) && FM.spine.soundTargetId ? FM.layerById(FM.scene, FM.spine.soundTargetId(R, subFor.id)) : null;   // 2.3: a row redraws when what it shows changes
      const rowSig = subFor ? [subFor.key, subFor.id || '', subFor.from || '', rowTarget ? [rowTarget.fadeIn, rowTarget.fadeOut, JSON.stringify(rowTarget.volume), JSON.stringify(rowTarget.speed), rowTarget.duration, rowTarget.muted].join('|') : '', (l && (subFor.key === 'opacity' || subFor.key === 'transform')) ? JSON.stringify([l.transform, !!l.flipH, !!l.flipV]) : '', subFor.key === 'captions' ? FM.scene.layers.some(isCapTrack) : '', subFor.key === 'caplooks' ? (() => { const T = capTrackNow(); return T ? T.id + '/' + (FM.spine.captionLookOf ? FM.spine.captionLookOf(T) : '') : ''; })() : '', subFor.key === 'yourmedia' ? (demoOn() ? 'demo' : 'shown') : '', (l && subFor.key === 'slide') ? slideSig(l) : ''].join('#') : '';   // #1243 S8: the pressed look follows the track; review L4-1: Your media redraws when Demo mode flips; release 10: Slide's row follows the clip's footage
      /* the selected item's KIND, HOST and ROW from this read (queue 980, verify medium-tray; ported from BX1d 5f10fdb): a layer
         made in the same refresh (Text, Sound effects, Record voice) is synced first from the timeline's previous read, which
         has never heard of it, and drew the overlay tray (Into row, Crop) under a text or a sound; the rebuild's own sync then
         computed the same signature and kept it. Its kind from the fresh read differs, so the tray is drawn again.
         #1243 S9: every change of mode refills (tool()'s double-click guard counts the fills). */
      const sig = [ids.join(','), mode, extrasUp(), subFor ? subFor.key + '/' + (subFor.id || '') + '/' + (subFor.from || '') : '', panelFor, panelKind, rowSig, l ? [l.reversed, l.muted, (R.followers[one] || []).length].join('|') : '', trExtras(), FM.spine.muteMode && FM.spine.muteMode(), FM.spine.linkMode && FM.spine.linkMode(), l ? [l.start, l.duration, l.locked, JSON.stringify(l.sm || null), l.type, l.audioOnly, JSON.stringify(l.trIn || null)].join('|') : '', one && R.units[one] ? R.units[one].kind + '/' + (R.units[one].host || '') + '/' + (R.isMain(one) ? 'm' : 'o') : '', R.main.map(e => e.id + (e.seam ? e.seam.kind : '')).join(','), R.trackEnd, segSig(l), (l && !subFor) ? splitAt(l) : '', fxSig(R, l, one), (l && FM.spine.slideState) ? FM.spine.slideState(l) || '' : ''].join('#');   // release 10: Slide rests until the footage's length is known
      splitDrawn = (l && !subFor) ? splitAt(l) : null;   // the 11 Nov verifiers' V2: Split rests while the line is outside the item
      if (sig === lastSig) return;
      lastSig = sig;
      /* THE PRESSED TOOL KEEPS FOCUS (§3.12 1a, §8.10 item 6; review finding 27): a press that changes the clip rebuilds the
         row, and focus fell to <body> with the button it was on, so a second Enter on the same tool did nothing.
         Restored only when focus was already in the bar's rows or on a panel's ‹, so a tap on the timeline never pulls focus here,
         and a spoken line that took focus keeps it. After a ‹ focus goes to the tool that opened the row it left (#1243 S9). */
      const isP = !!(ae && ae.classList && ae.classList.contains('sm-pback'));
      const hadFocus = !!(ae && ((ae !== tray && tray.contains(ae)) || (ae !== tools && tools.contains(ae)) || isP));
      const focusKey = hadFocus ? (isP ? 'pback' : ((ae.dataset && ae.dataset.tool) || '')) : '';
      FM.simpleTools._fill(R, ids, one, S, mode);
      if (hadFocus && mode === 'panel') panelFocus();
      else if (hadFocus) {
        const row = mode === 'project' ? tools : tray;
        const want = /^(rowBack|fxBack|itemBack|pback)$/.test(focusKey) ? backTo : focusKey;
        const n = (want && row.querySelector('[data-tool="' + CSS.escape(want) + '"]')) || row.querySelector('button, input');
        if (n) n.focus({ preventScroll: true });
      }
      backTo = '';
    },
    _fill(R, ids, one, S, mode) {
      fills++;
      /* Phase 3 · Look: THE TOOL STRIP KEEPS ITS PLACE WHEN THE SAME TRAY IS DRAWN AGAIN. Look joined a clip's tools, so a video clip's
         tray is eleven and keeps one scrolling row on a PC too (his pick B holds ten), and every press redraws the tray: the strip
         went back to its start, so a tool pressed past the first screen (Close gap, Replace, Move later on a phone) left the place
         under the finger and a second press found another tool. §3.12 1(a): the pressed tool stays where it was. A new selection,
         or another row (Speed, Volume…), starts at the beginning as before. */
      segUndrag();   // Phase 3 · Effect segments: a redraw never leaves the Strength slider's preview in the document
      const old = tray.querySelector(':scope > .sm-runbox > .sm-run'), key = [ids.join(','), mode, subFor ? subFor.key + '/' + (subFor.id || '') : '', panelFor ? panelKind : ''].join('#');
      const keepLeft = (old && key === stripKey) ? old.scrollLeft : 0;
      if (key !== stripKey) rowN++;   // another row under the last press: tool()'s double-tap hold (HW5)
      stripKey = key;
      if (runSeen) tray.querySelectorAll('.sm-run').forEach(r => runSeen.unobserve(r));   // SU1 #15: the old tool strip goes with the old tools (the project row's stays watched)
      tray.textContent = '';
      tray.classList.toggle('sm-tray-len', !!subFor && ROW_KEYS.has(subFor.key));   // the item rows (a slider, presets): centred as 2.3 drew them; the project tools' rows keep full-height choices
      try { fillTray(R, ids, one, S, mode); } finally { hintFollows(); hintSync(mode, R); fxMark(); lookMark(); }
      if (keepLeft > 0) { const run = tray.querySelector(':scope > .sm-runbox > .sm-run'); if (run) { run.scrollLeft = keepLeft; edges(run); } }
    },
    /* Full's own panel for the selection (a text's Style, a caption track's Style; a tray's More opened it until #1243 S4): on a phone the
       sheet from the stage's bottom edge (#1243 rule 3), on a PC the whole band */
    /* unlatch: a closed sheet comes back (finding 20); armSheet: 2.7 (#1171), see sheetGuard */
    openPanel(id) { lookUndrag(); panelFor = id; panelKind = 'more'; lastSig = ''; if (FM.mobile && FM.mobile.unlatch) FM.mobile.unlatch(); FM.refreshAll(); armSheet(); },
    /* …and closed: a ‹ that had focus hands it to the tool that opened the panel (the panel's own ‹ goes with the redraw) */
    closePanel() {
      if (!panelFor) return;
      const ae = document.activeElement, fromBack = !!(ae && ae.classList && ae.classList.contains('sm-pback')), to = backTo;
      dropPanel();
      if (fromBack) {
        lastSig = ''; this.sync();
        const q = to ? '[data-tool="' + CSS.escape(to) + '"]' : '', n = q && (tray.querySelector(q) || tools.querySelector(q));   // #1243 S12: Look is on the project row
        if (n) n.focus({ preventScroll: true });
      }
    },
    /* Style (More until #1243 S4) pressed again closes what it opened (first-user audit item 4: only a tap on empty timeline did). It is up when the
       phone's sheet is open on this item (a grab-bar close leaves panelFor set, and More then raises it again, finding 20) or
       the PC band shows it. The second click of a double click never closes it, so a double tap does not open and shut it.
       Phase 3: Look's panel is the same place with its own contents, so More over an open Look (or Look over More) swaps them. */
    togglePanel(id, e) { return this._toggle('more', id, e); },
    toggleLook(id, e) { return this._toggle('look', PROJECT, e); },   // #1243 S12: the project's, whatever was passed
    _toggle(kind, id, e) {
      const sheet = document.getElementById('inspector-panel'), phone = FM.mobile && FM.mobile.isPhone ? FM.mobile.isPhone() : false;
      if (!(panelFor === id && panelKind === kind && (!phone || (sheet && sheet.classList.contains('open'))))) return kind === 'look' ? this.openLook(id) : kind === 'lines' ? this.openLines(id) : this.openPanel(id);
      if (!(e && e.detail >= 2)) this.closePanel();
    },
    /* Phase 3 · Look: Look's own panel, opened on Filters. #1243 S12: the PROJECT's, with nothing selected (a selection is let go first, a
       row or Extras closes: one menu at a time) — the whole left band on a PC (D20 A), on a phone the sheet from the sheet line, which
       js/mobile.js raises for it (projectPanel). Only while Simple is on screen. */
    openLook() {
      if (!isSimple() || !mount()) return;
      lookUndrag();
      if (subFor) { subFor = null; segUndrag(); }
      if (extrasOpen) { extrasOpen = false; extrasMark(); }
      extrasSheetOff();
      if (FM.selectionIds && FM.selectionIds().length && FM.selectLayer) FM.selectLayer(null);
      panelFor = PROJECT; panelKind = 'look'; lookTab = 'filters'; lookSeen = ''; lastSig = '';
      if (FM.mobile && FM.mobile.unlatch) FM.mobile.unlatch();
      FM.refreshAll(); armSheet();
    },
    /* #1243 S6 A: Simple's Export panel (exportPanel), from the Export button: a project panel like Look's — nothing selected (a selection
       is let go first, a row or Extras closes: one menu at a time), the whole left band on a PC, on a phone the sheet from the sheet line.
       It starts on his last pick on this device, else the top rung and the project's rate. Only while Simple is on screen and the frame
       has a size; false when it opened nothing. */
    openExport() {
      if (!isSimple() || !mount() || !(expShort() > 0) || !FM.exportSimple) return false;
      /* review R12-4: with nothing to export it says so on Simple's line and opens nothing (a card reading 0:00 and About 0 KB whose
         Save video only said this) */
      if (!(FM.scene.layers || []).length || !(exportEnd() > 0)) { const w = W(); if (FM.spine && FM.spine.say) FM.spine.say(w.exportEmpty || 'Add a clip first, then export it'); return false; }
      lookUndrag();
      if (subFor) { subFor = null; segUndrag(); }
      if (extrasOpen) { extrasOpen = false; extrasMark(); }
      extrasSheetOff();
      if (FM.selectionIds && FM.selectionIds().length && FM.selectLayer) FM.selectLayer(null);
      panelFor = PROJECT; panelKind = 'export'; exportInit(); posterCv = null; posterAt = NaN; lastSig = '';
      if (FM.mobile && FM.mobile.unlatch) FM.mobile.unlatch();
      FM.refreshAll(); armSheet();
      return true;
    },
    /* the Export panel is up (on a phone: its sheet is really open) */
    exportOpen: () => exportUp(),
    /* js/mobile.js asks this with nothing selected: the project's Look panel is open, so its sheet rises with no selection */
    projectPanel() { return isSimple() && panelFor === PROJECT && (panelKind === 'look' || panelKind === 'export') && !((FM.selectionIds ? FM.selectionIds() : []).length); },   // #1243 S6: or Export's
    /* js/inspector.js asks this before drawing its layer editor (or, with nothing selected, its Add menu): true when it drew one of
       Simple's panels instead. False whenever Simple is not on screen or none is open there, so Full's panel is exactly today's. */
    drawPanel(root, layer, title) {
      if (root && !layer && isSimple() && extrasOpen) return drawExtras(root, title);   // Phase 3 · Clips › Extras: the band with nothing selected (PC)
      if (root && layer && isSimple() && panelKind === 'lines' && panelFor === layer.id) return this._drawLines(root, layer, title);   // Phase 3 · Captions
      if (root && !layer && isSimple() && panelFor === PROJECT && panelKind === 'export') { if (title) title.textContent = ''; exportPanel(root); return true; }   // #1243 S6: Export's, for no layer
      if (!root || layer || !isSimple() || panelKind !== 'look' || panelFor !== PROJECT) return false;   // #1243 S12: Look's is drawn for no layer
      lookUndrag();   // a redraw while a finger is still on a slider (a refresh from elsewhere) never leaves its preview in the document
      if (title) title.textContent = '';
      const view = PROJECT + '/' + lookTab, same = view === lookSeen;   // the same view across the first pick, which makes the layer
      lookSeen = view;
      if (!same) { lookLeft = 0; lookTop = 0; }
      lookPanel(root, FM.spine.lookLayer ? FM.spine.lookLayer() : null);
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
    /* #1243 S9: A SUB-ROW TAKES THE BAR'S PLACE (key: a SUBS key; id: the item it acts on; from: the row its ‹ goes back to). One at a
       time: a new one replaces whatever row was up (the 2.7 ◇ pressed with the Effects picker up opens its row at once, the 7 Nov review).
       Only while Simple is on screen, so nothing opens or draws in Full. */
    openSub(key, id, from, of) {
      if (!SUBS[key] || !isSimple() || !mount()) return;
      segUndrag();
      /* ONE MENU AT A TIME BOTH WAYS (the 9 Nov review, MODE-1): a row opened while a panel is up closes the panel first. On a PC the ◇
         over the cut before a clip whose More or Look is open set the Transition row under that panel, where the bar is hidden: the press
         showed nothing until the panel's ‹ was pressed. */
      if (panelFor) dropPanel();
      /* `of`: the selected item the row belongs to when it acts on another (#1243 S1 A: the first clip's Transition, for the cut after it) */
      subFor = { key: key, id: id || null, from: from || null, of: of || null, sel: (FM.selectionIds ? FM.selectionIds() : []).join(',') };
      lastSig = ''; this.sync();
    },
    openRow(kind, id, from, of) { this.openSub(kind, id, from, of); },   // 2.3: Speed, Volume, Fade; 2.7: Transition; Strength; #1243 R release 8: Opacity, Transform
    /* Phase 3 · Effect segments: the effects picker, for a new segment (null: the project row's Effects) or for that segment's Change
       effect. Pressed again for the same target it closes. */
    openEffects(id) {
      const want = id || null;
      if (subFor && subFor.key === 'effects' && subFor.id === want) { this.closeEffects(); return; }
      this.openSub('effects', want);
    },
    closeEffects() { if (!subFor || (subFor.key !== 'effects' && subFor.key !== 'itemfx')) return; subFor = null; lastSig = ''; this.sync(); },
    /* Phase 3 · Effects on an item: the picker for an effect ON this item (Add effect in its tray); pressed again for the same item it
       closes. Only while Simple is on screen, so nothing opens or draws in Full. */
    openItemEffects(id) {
      if (!id || !isSimple()) return;
      if (subFor && subFor.key === 'itemfx' && subFor.id === id) { this.closeEffects(); return; }
      this.openSub('itemfx', id);
    },
    /* the effects picker's state as the suite has always read it ({id, sel, on}), now read off the sub-row */
    fxPick: () => subFor && (subFor.key === 'effects' || subFor.key === 'itemfx') ? { id: subFor.id, sel: subFor.sel, on: subFor.key === 'itemfx' } : null,
    /* #1243 S9: ‹ GOES BACK ONE LEVEL. From a panel to the row under it (the item's tray, or the Clips row under Extras); from a sub-row to
       the row that opened it (Speed opened in Audio goes back to Audio; a row of the bar's own goes back to the item or project row); from
       an item's tray it lets the selection go, as a tap on empty timeline does. Focus follows to the tool that opened what closed. */
    back() {
      if (!mount() || !isSimple()) return;
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      if (modeOf(ids) === 'panel') {
        if (extrasUp()) { backTo = 'extras'; this.closeExtras(); return; }
        /* #1243 S6: Export's panel was opened from the Export button, which is not on the bar: focus goes back there */
        if (panelKind === 'export') { backTo = ''; this.closePanel(); const x = exportBtn(); if (x) x.focus({ preventScroll: true }); return; }
        backTo = panelKind === 'look' ? 'look' : panelKind === 'lines' ? 'editlines' : panelKind === 'more' ? (tray.querySelector('[data-tool="style"]') ? 'style' : 'capstyle') : '';   // 'more': Full's own panel for the item (a text's Style, a caption track's Style)
        this.closePanel(); return;
      }
      if (subFor) {
        backTo = SUBS[subFor.key].opener(subFor);
        subFor = subFor.from ? { key: subFor.from, id: subFor.id, from: null, of: subFor.of || null, sel: subFor.sel } : null;
        segUndrag(); lastSig = ''; this.sync(); return;
      }
      if (ids.length && FM.selectLayer) { backTo = ''; FM.selectLayer(null); }
    },
    /* ESCAPE GOES BACK ONE LEVEL TOO (the 9 Nov review, MODE-5; queue 690: Escape gets him out of what is open). Clips', Sound's and
       Captions' lists owned Escape; as rows they had none, so it fell to inspector.back(), which does nothing with nothing selected and
       lets the selection go (every level at once) with something selected. js/app.js asks this last, after every dialog, menu and tool
       that answers Escape, just before inspector.back(): a sub-row, or a panel in the PC band, goes back one level (More's panel lets
       the layer editor step back its own pages first). True when it answered. False whenever Simple is not on screen, so Full is today's. */
    escape() {
      if (!isSimple() || !mount()) return false;
      const ids = FM.selectionIds ? FM.selectionIds() : [], m = modeOf(ids);
      if (m === 'panel' && !phone.matches && panelKind === 'more' && !extrasUp()) {
        const I = FM.inspector;
        if ((I && I.currentView && I.currentView() !== 'home') || FM._mtEasing || FM._volEasing || FM._spdEasing || FM._opaEasing || FM._fxEasing || FM._cropEasing) return false;
      }
      if (m !== 'sub' && !(m === 'panel' && !phone.matches)) return false;
      this.back();
      return true;
    },
    /* the bar's mode and its sub-row, for the suite */
    mode: () => (bar && bar.dataset.mode) || '',
    subFor: () => subFor && { key: subFor.key, id: subFor.id, from: subFor.from, of: subFor.of || null },
    /* Phase 3 · Clips › Extras: open (nothing selected; a selection is let go first), close, and whether it is up. Only while Simple
       is on screen: in Full openExtras opens nothing. A panel: the Clips row it was opened from stays under it. */
    openExtras() {
      if (!isSimple() || !mount()) return false;
      if (subFor && subFor.key !== 'clips') { subFor = null; segUndrag(); }   // one menu at a time
      if (FM.selectionIds && FM.selectionIds().length && FM.selectLayer) FM.selectLayer(null);
      if (phone.matches) {
        if (!FM.mobile || !FM.mobile.openAdd || !FM.addMenu || !FM.addMenu.render) return false;
        FM.mobile.openAdd();
        const sheet = document.getElementById('add-sheet'), grid = document.getElementById('add-grid');
        if (!sheet || !grid || !sheet.classList.contains('open')) return false;   // a Viewer adds nothing: the sheet stays down
        FM.addMenu.render(grid, { variant: 'sheet', tabs: extrasTabs(), onAfterAdd: () => { if (FM.mobile && FM.mobile.closeAdd) FM.mobile.closeAdd(); } });
        const am = grid.querySelector(':scope > .addmenu'); if (am) am.dataset.sm = 'extras';
        lastSig = ''; this.sync();
        armSheet();
        return true;
      }
      extrasOpen = true; extrasMark();
      if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
      lastSig = ''; this.sync();
      armSheet();
      return true;
    },
    closeExtras() {
      extrasSheetOff();   // the phone's Add sheet (its own observer brings the Clips row back)
      if (!extrasOpen) return;
      extrasOpen = false; extrasMark();
      if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
      lastSig = ''; this.sync();
    },
    extrasOpen: extrasUp,
    /* the item row open on the bar, as the suite has always read it ({kind, id, from}) */
    rowFor: () => subFor && ROW_KEYS.has(subFor.key) ? { kind: subFor.key, id: subFor.id, from: subFor.from } : null,
    panelFor: () => panelFor,
    /* js/mobile.js asks before raising the sheet for a selection; js/inspector.js before drawing the band */
    sheetHeld(id) { return isSimple() && panelFor !== id; },
    /* (Phase 3 · Clips › Extras: with nothing selected and Extras up, the band draws Extras instead of its line) */
    bandIdle(layer) { return isSimple() && !(layer && panelFor === layer.id) && !(!layer && (extrasOpen || panelFor === PROJECT)); },   // #1243 S12: or Look's
    /* …and the words it shows there while idle: a selected item's say where its tools are */
    bandWords: bandWords,
    /* suite seam (sm3 review, lens 6: Look's remembered focus and scroll and the #1171 arm time are state too, so one test's
       Look panel can no longer hand focus, or a held press, to the next) */
    _reset() { lookUndrag(); segUndrag(); panelFor = null; panelKind = null; lookTab = 'filters'; lookSeen = ''; lookLeft = 0; lookTop = 0; lookFocus = ''; sheetArmAt = -1e9; shutArmAt = -1e9; sheetPressAt = -1e9; lastPress = null; clearTimeout(sheetOff); sheetListen(false); linesSeen = ''; linesTop = 0; subFor = null; backTo = ''; extrasOpen = false; extrasSheetOff(); pbackSync(null); hintSync('off'); tfClear(); lastSig = ''; stripKey = ''; posterCv = null; posterAt = NaN; },
    ICON: ICON
  };
})(window.FM);
