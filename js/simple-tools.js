/* FreeMotion — FM.simpleTools: the Simple editor's bar (Simple mode Phase 2, DESIGN.md §8.2, §8.3, §8.5; #1243 S3, S9, S15).
 *
 * ONE BAR, ONE 56 px ROW, FOUR MODES (#1243 R rule 1; his words, 8 Nov: "when you actually tap on a layer, that first row goes
 * away", and "I don't want two menus at once"). #sm-bar[data-mode]:
 *   project — nothing selected: the project tools (#sm-tools), Clips · Text · Captions · Sound · Overlay · Effects;
 *   item    — the selection's tools (#sm-tray), a ‹ first that clears the selection;
 *   sub     — a row that replaces the bar (#sm-tray again): a ‹ back one level, then that row's choices (Clips, Sound,
 *             Captions, the effects pickers, Audio, Speed, Volume, Fade, Strength, Transition — the SUBS table);
 *   panel   — a panel is up (More, Look, Edit lines, Extras): the bar hides, the panel has the room.
 * Every row is one strip that scrolls sideways with fades at the edge that hides tools (S15: "make it like CapCut where you
 * can scroll it"), never squeezed. Simple's spoken lines float as a 44 px strip just above the bar (#sm-say), so nothing moves.
 * On PC a tray of more than five tools still lies on TWO rows (his pick B, 6 Oct) until #1243 R's release 8.
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
    strength: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'
  };
  const svg = n => '<svg viewBox="0 0 24 24" class="sm-ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[n] || ICON.more) + '</svg>';
  const W = () => (FM.spineWords && FM.spineWords.tools) || {};
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  let bar = null, tray = null, tools = null, menu = null;
  let panelFor = null, lastSig = '', lastSel = null;
  /* #1243 S9: THE SUB-ROW ON THE BAR ({key: a SUBS key, id: the item it acts on or null, from: the sub ‹ returns to, sel: the
     selection it was opened with — any other selection closes it}); the data-tool focus goes to after a ‹ */
  let subFor = null, backTo = '';
  const ROW_KEYS = new Set(['audio', 'speed', 'volume', 'fade', 'transition', 'strength']);   // the item rows rowFor() still names
  let fills = 0, lastPress = null;   // how many times the tray was refilled; the tool a pointer's last single click pressed
  let rowN = 0;                      // how many times the bar has shown another row (_fill): tool()'s double-tap hold (HW5)
  let roomy = false;                 // PC, and the band is tall enough for the tray's two rows (roomForTwo)
  let hintUp = false;                // 2.7: the first-run hint floats above the bar now (hintSync)
  /* Phase 3 · Look: which panel panelFor's band / sheet shows ('more' = today's panel, 'look' = Look's own), Look's open tab, a
     slider's live preview to take back ({id, pre}), and where the panel was (its strip's scroll, its own scroll, the control with
     focus) so the redraw after each step leaves it there. stripKey: the tray whose tool strip keeps its scroll across a refill. */
  let panelKind = null, lookTab = 'filters', lookDrag = null, lookSeen = '', lookLeft = 0, lookTop = 0, lookFocus = '', stripKey = '';
  /* Phase 3 · Captions: Edit lines is a third kind of panelFor's panel ('lines'); the layer it last drew and how far it was scrolled */
  let linesSeen = '', linesTop = 0;
  /* Phase 3 · Effect segments: the Strength slider's live preview to take back (the effects pickers are sub-rows since #1243 S9) */
  let segDrag = null;
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
  /* #1243 R release 4: the bar is one row now, so the 58 px its edge and the project row took (the sum this read off the page:
     the bar less #sm-say) is a constant, and the threshold stays where it was. R's release 8 deletes this with the grid. */
  const BAR_EDGE_AND_ROW = 58;
  function roomForTwo() {
    if (phone.matches || !bar) return false;
    const band = document.getElementById('inspector-panel'), insp = document.getElementById('inspector');
    if (!band || !insp || bar.parentNode !== band) return false;
    const hgt = n => n.getBoundingClientRect().height;
    let need = BAR_EDGE_AND_ROW + TWO_ROWS + (parseFloat(getComputedStyle(insp).paddingTop) || 0) + WORDS_LINE;
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
    document.addEventListener('pointerdown', e => { if (menu && !menu.contains(e.target)) closeMenu(); }, true);
    /* 2.7 (SU1 #13): the first-run hint goes on the first tap anywhere, and only then is it remembered (hintSync) */
    window.addEventListener('pointerdown', () => { if (hintUp && isSimple()) dismissHint(); }, true);
    /* 2.7 (SU1 #20, his "2A" 14 Oct): SIMPLE'S EXPORT IS ONE SHORT LIST, not Full's dialog (120 fps, Custom, "Export just this layer",
       the loop region). Capture phase on the button both editors share (the phone's ⬆ clicks it), only while Simple is on screen (as
       Simple's ⋯ did until #1243 S5 took it off the play row). Pressed again it closes the list, as Full's button closes its dialog (queue 925): the outside-tap close above runs
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
    const b = el('button', t.cls || ('sm-tool' + (t.pin ? ' sm-pin' : '')));   // t.cls: the ‹s (#1243 S9)
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
     /* Phase 3 · Effect segments (§8.5, §8.5c item 2): a new whole-frame segment at the playhead, picked first in its own row */
     { id: 'effects', label: w.effects || 'Effects', icon: 'effects', title: w.effectsTitle, run: () => FM.simpleTools.openEffects(null) }
    ].forEach(t => run.appendChild(tool(t)));
    edges(run);
  }

  /* ═══ THE TRAY (§8.5): the selected item's tools, the tools that define its kind first, 🗑 pinned at the right end. ═══ */
  /* #1243 S37: an item that runs past the end of the video (and starts before it) offers Cut at the end, before More and 🗑. Added here, once, for
     every kind of item's tray. An end card (starts at or after the end) is meant to be there, and a clip of the row never runs past it. */
  function trayFor(R, id) {
    const list = trayItems(R, id), l = FM.layerById(FM.scene, id);
    if (!l || !list.length || l.type === 'camera' || R.isMain(id) || !(R.trackEnd > 0)) return list;
    const s = +l.start || 0, e = s + (+l.duration || 0);
    if (!(e > R.trackEnd + FM.spine.PAST && R.trackEnd - s >= FM.spine.minLen(+FM.scene.project.fps || 30))) return list;   // an item can be no shorter than the shortest length
    const w = W(), cut = { id: 'cutEnd', label: w.cutEnd || 'Cut at the end', icon: 'cutend', title: w.cutEndTitle, run: () => FM.spine.cmd.cutAtEnd(id) };
    const at = list.findIndex(t => t.id === 'more' || t.id === 'delete');
    list.splice(at < 0 ? list.length : at, 0, cut);
    return list;
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
    const del = { id: 'delete', label: w.delete || 'Delete', icon: 'delete', pin: true, run: () => { if (R.isMain(id)) S.cmd.del(id); else if (S.cmd.deleteItems) S.cmd.deleteItems([id]); else if (FM.deleteLayer) FM.deleteLayer(id); } };
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
        splitT,
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
    if (k === 'text') return [splitT, { id: 'editwords', label: w.editWords || 'Edit words', icon: 'editwords', run: () => { if (FM.textEdit && FM.textEdit.start) FM.textEdit.start(id, { selectAll: true }); } }, addFxT, stay, more, del];   // Phase 3 · Effects on an item: Add effect after Edit words (§8.5's text tray order)
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
        del];
    }
    /* 2.4b: the opt-in volume rider (§3.10 rule 3), offered only on a sound that stays put AND has a volume curve to carry */
    /* review L3-5 (11 Nov): with Link off it rests like Stay put and the caption pair (the volume rider does not ride then, riderPlan) */
    const rideT = { id: 'rideVol', label: w.rideVol || 'Follow clips', icon: 'volume', title: w.rideVolTitle || 'Keep volume changes with the clips', pressed: !!(l.sm && l.sm.rideVol), disabled: !linked, why: w.stayUnlinked, run: () => S.cmd.rideVol(id, !(l.sm && l.sm.rideVol)) };
    const hasCurve = !!(FM.isAnimated && (FM.isAnimated(l.volume) || FM.isAnimated(l.transform && l.transform.opacity)));
    if (k === 'audio') return [splitT, volumeT, fadeT, ...(l.type === 'video' ? [speedT] : []), stay, ...(stayOn && hasCurve ? [rideT] : []), more, del];
    if (k === 'effect') return segmentTray(id, l, stay, more);   // Phase 3 · Effect segments: Change effect · Strength · Stay put · More · 🗑
    if (k === 'block' || k === 'fullOnly') return [{ id: 'openFull', label: w.openFull || 'Open in Full', icon: 'editor', run: () => FM.editor && FM.editor.request('full', { hop: true }) }, del];
    if (k === 'undecided') return [];
    const inCard = !!(u && u.host && String(u.host).indexOf('slot:') === 0);   // a card between clips: no Into row until its slot form exists (§3.6)
    return [   // overlays, stickers, pictures, a background
      splitT,
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
    const val = el('span', 'sm-speed-v', fmtX(now));
    const rng = el('input', 'sm-speed-r'); rng.type = 'range'; rng.min = String(rg.lo); rng.max = String(rg.hi); rng.step = '0.05';
    rng.value = String(Math.max(rg.lo, Math.min(rg.hi, now))); rng.setAttribute('aria-label', w.speedLabel || 'Speed');
    rng.addEventListener('input', () => { const sp = parseFloat(rng.value); val.textContent = fmtX(sp); if (FM.simpleTimeline && FM.simpleTimeline.previewSpeed) FM.simpleTimeline.previewSpeed(id, sp); });
    rng.addEventListener('change', () => { const sp = parseFloat(rng.value); if (FM.simpleTimeline && FM.simpleTimeline.previewSpeed) FM.simpleTimeline.previewSpeed(id, null); if (Math.abs(sp - now) > 1e-9) S.cmd.speed(id, sp); });
    run.append(rng, val);
  }
  function volumeRow(R, s, run) {
    const S = FM.spine, w = W(), id = s.id, tid = S.soundTargetId(R, id), t = tid && FM.layerById(FM.scene, tid);
    if (!t) return;
    const now = (() => { const v = t.volume == null ? 1 : FM.evalProp(t.volume, FM.time); return isFinite(v) ? v : 1; })();
    const val = el('span', 'sm-vol-v', pct(now) + '%');
    const rng = el('input', 'sm-vol-r'); rng.type = 'range'; rng.min = '0'; rng.max = '200'; rng.step = '1'; rng.value = String(Math.min(200, pct(now)));
    rng.setAttribute('aria-label', w.volumeLabel || 'Volume in percent');
    rng.addEventListener('input', () => { const v = parseFloat(rng.value) / 100; val.textContent = pct(v) + '%'; const m = FM.media && FM.media.get(t.id); if (m && m.el) { try { m.el.volume = Math.min(1, v); } catch (e) {} } });
    rng.addEventListener('change', () => { const v = parseFloat(rng.value) / 100; if (Math.abs(v - now) > 0.004) S.cmd.volume(id, v); });
    run.append(rng, val);
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
  /* OPTION E (S9, his A1 sheet): a video clip's four sound-and-time tools live in ONE row, opened by one tool, "Audio": Speed, Volume, Reverse, and Take sound out / Put sound back.
     That takes a clip's tray from 13 tools to 10, so it lays out on two rows on a PC with every tool on show, and loses nothing: each one is one tap further. Speed and Volume open
     their own rows with their ‹ coming back HERE (`from`). */
  function audioRow(R, s, run) {
    const S = FM.spine, w = W(), id = s.id, l = FM.layerById(FM.scene, id);
    if (!l) return;
    put(run, { id: 'speed', label: w.speed || 'Speed', icon: 'speed', run: () => FM.simpleTools.openRow('speed', id, 'audio') });
    put(run, { id: 'volume', label: w.volume || 'Volume', icon: 'volume', run: () => FM.simpleTools.openRow('volume', id, 'audio') });
    put(run, { id: 'reverse', label: w.reverse || 'Reverse', icon: 'reverse', pressed: !!l.reversed, run: () => S.cmd.reverse(id) });
    const hasTwin = (R.followers[id] || []).some(f => S.isTwinOf(FM.layerById(FM.scene, f), l, R.eps));
    /* the sound commands make or remove a layer: the row is drawn again when they are done (the redraw during the command saw a half-done scene, and the sig only changes there), so the button that was pressed turns into its opposite where it was */
    /* (…unless a panel was opened while it ran: that is the newer press, and a row opened now would close it, MODE-1) */
    const again = async p => { const ok = await p; if (FM.layerById(FM.scene, id)) { if (!panelFor) FM.simpleTools.openRow('audio', id); FM.refreshAll(); } return ok; };
    if (hasTwin) put(run, { id: 'putSound', label: w.putSound || 'Put sound back', icon: 'soundback', run: () => again(S.cmd.putSoundBack(id)) });
    else if (S.canTakeSound(R, id)) put(run, { id: 'takeSound', label: w.takeSound || 'Take sound out', icon: 'soundout', run: () => again(S.cmd.takeSoundOut(id)) });
  }
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
    audio:      { fill: audioRow,      opener: () => 'audio',    word: 'audio' },
    speed:      { fill: speedRow,      opener: () => 'speed',    word: 'speed' },
    volume:     { fill: volumeRow,     opener: () => 'volume',   word: 'volume' },
    fade:       { fill: fadeRow,       opener: () => 'fade',     word: 'fade' },
    transition: { fill: transitionRow, opener: () => '',         word: 'transition' },
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

  /* 2.7 (SU1 #13, DESIGN §7.3 step 4, §8.9): THE FIRST-RUN HINT, while nothing is selected, only with a main clip on the track and at
     most once per device: the first tap anywhere takes it away and writes fm.sm.hint = '1' (the listener in mount). Phone or PC words
     by the phone test Full uses (max-width 700 px). (Its outline on the play bar's ✂ went with the ✂: #1243 S5 put Split on the clip's
     own tools, which the hint's first words send him to.) #1243 S3: it FLOATS just above the bar like a spoken line (the project
     row is just the tools), and takes no pointer events, so the first tap also reaches the clip under it. (The quiet line, "3 clips ·
     0:06", is retired: the pill shows the length and the timeline the clips.) */
  const HINT_KEY = 'fm.sm.hint';
  function hintSeen() { try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return true; } }   // unreadable storage could never remember it: no hint
  function hintSync(mode, R) {
    hintUp = mode === 'project' && !!R && R.main.some(e => !e.slot) && !hintSeen();
    let h = bar && bar.querySelector(':scope > .sm-hint');
    if (hintUp) {
      if (!h) { h = el('div', 'sm-hint'); bar.insertBefore(h, tray); }
      const t = phone.matches ? (W().firstHint || '') : (W().firstHintPc || '');
      if (h.textContent !== t) h.textContent = t;
    } else if (h) h.remove();
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
  function dismissHint() {
    hintUp = false;
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
    lastSig = ''; FM.simpleTools.sync();   // the hint goes (hintSync)
  }

  /* ═══ Simple's Export: a small list above the button, one ≥ 44 px row per choice (Clips', Sound's and Captions' lists are sub-rows
     since #1243 S9, and ⋯'s left Simple with #1243 S5; this one stays a list until #1243 S6). ═══ */
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

  /* 2.7 (SU1 #20): "1080p · Export" (and 720p when the frame is bigger than that; a smaller frame offers its own size, never an upscale):
     an MP4 at the project's frame rate and Full's default High quality, of the clips (and an end card after them: #1243 S37 review, it is
     content and his timeline says it is kept) — 0 to the end of the last clip, so the black a song or a title runs on into is never in the file. app.js runs it through the dialog's own gates and exporter (FM.exportSimple), and
     never saves it as the dialog's defaults. */
  function exportMenu(anchor) {
    const P = FM.scene.project || {}, w = W(), short = Math.min(+P.width || 0, +P.height || 0);
    if (!(short > 0) || !FM.exportSimple) return;
    const R = FM.spine.read(FM.scene), cards = R.trackEnd > 0 ? FM.spine.overrun(R).ends.map(l => (+l.start || 0) + (+l.duration || 0)) : [];
    const end = R.trackEnd > 0 ? Math.max.apply(null, [R.trackEnd].concat(cards)) : (+P.duration || 0);
    const top = Math.min(1080, short), rungs = top > 720 ? [top, 720] : [top];
    openMenu(anchor, rungs.map(p => ({ label: w.exportAt ? w.exportAt(p) : p + 'p · Export',
      run: () => FM.exportSimple({ scale: p / short, fps: +P.fps || 30, quality: 0.18, from: 0, to: end }) })));
    if (menu) { menu.dataset.kind = 'export'; menu.setAttribute('aria-label', w.exportTitle || 'Export video'); }
  }

  /* What the tray holds (#1243 S3, S9): in a sub-row its ‹ and that row's controls; with something selected (item mode, or a panel
     over it, drawn hidden so its ‹ brings the row back at once) the ‹ that clears the selection and the selection's tools; in project
     mode nothing (the bar is the project row then). True when it lies on two rows. */
  function fillTray(R, ids, one, S, mode) {
    tray.removeAttribute('data-row');
    if (mode === 'project' && !subFor) return false;
    if (subFor) {
      const k = subFor.key, d = SUBS[k];
      /* S9 (option E): the Audio row's five buttons are 317 px at their usual padding, 10 px over the 307 px band at 1280; the pickers' tiles */
      if (k === 'audio') tray.setAttribute('data-row', 'audio'); else if (k === 'effects' || k === 'itemfx') tray.setAttribute('data-row', 'effects');
      tray.setAttribute('aria-label', W()[d.word] || k);
      tray.appendChild(backTool(d.back || 'rowBack', 'back:' + k + '/' + (subFor.from || '')));
      const run = strip(tray);
      d.fill(R, subFor, run);
      edges(run);
      return false;
    }
    tray.setAttribute('aria-label', W().clipTools || 'Clip tools');
    tray.appendChild(itemBack());
    if (ids.length > 1) {   // §8.5b: the intersection — Stay put on all, Delete (one main clip at a time in 2.2)
      const w = W(), run = strip(tray), pins = el('div', 'sm-pins');
      run.appendChild(el('div', 'sm-quiet', (w.selected || (n => n + ' selected'))(ids.length)));
      const all = ids.every(id => !R.isMain(id));
      if (all) run.appendChild(tool({ id: 'stay', label: w.stay || 'Stay put', icon: 'pin', disabled: !!(S.linkMode && !S.linkMode()), why: w.stayUnlinked, run: () => S.cmd.stayMany(ids, true) }));   // ONE step for all of them (§3.2 rule 2); #1243 S34 A: rests while Link is off
      pins.appendChild(tool({ id: 'delete', label: w.delete || 'Delete', icon: 'delete', pin: true, run: () => { if (all) { if (S.cmd.deleteItems) S.cmd.deleteItems(ids, true); else if (FM.deleteSelected) FM.deleteSelected(); } else S.say((FM.spineWords.lines || {}).deleteOne || 'Delete one clip at a time'); } }));   // review #4: see trayFor's 🗑
      tray.appendChild(pins);
      edges(run);
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
    const pins = el('div', 'sm-pins'), run = strip(tray);
    const withT = withWords(R, one); if (withT) run.appendChild(withTag(withT));   // Phase 3 · Clips › Extras: "Moves with the shape", first in the strip
    list.forEach(t => (t.id === 'more' || t.pin ? pins : run).appendChild(tool(t)));
    if (pins.firstChild) tray.appendChild(pins);
    edges(run);
    return false;
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
  /* THE TRAY'S ROWS (his pick B on a PC): two only while it holds two, and the band's words follow them. Since #1243 the bar is one
     row and a spoken line floats above it, so nothing waits for a line any more: no Undo can land in the row where 🗑 was. */
  function rows(two) {
    tray.classList.toggle('sm-tray-2', two);
    if (!two) tray.style.removeProperty('--sm-cols');
    hintFollows();
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
  function lookFilters(box, L) {
    const w = W(), id = L.id, lk = FM.spine.lookOf(L), cur = lk.filter ? lk.filter.fid : '';
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
      b.addEventListener('click', e => { e.stopPropagation(); if (fid !== (cur || '')) FM.spine.cmd.lookFilter(id, fid || null); });
      return b;
    };
    strip.appendChild(tile('', w.lookNone || 'None'));
    lookList().forEach(f => strip.appendChild(tile(String(f.id), String(f.name || f.id))));
    strip.addEventListener('scroll', () => { lookLeft = strip.scrollLeft; }, { passive: true });
    box.appendChild(strip);
    if (FM.fxThumbs && FM.fxThumbs.mountFilter) lazyTiles(strip, cvs, q => FM.fxThumbs.mountFilter(q[0], q[1], null));
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
    tabs.appendChild(panelBack());   // #1243 S9: the way back, in the panel's own first row (no header row: queue 835)
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
  /* what sync's signature needs from this block: the picker, and the selected segment's effect and strength (Change effect and Undo
     move the pressed tile; a strength step or its Undo moves the slider) */
  function segSig(l) {
    const a = subFor && (subFor.key === 'effects' || subFor.key === 'itemfx') ? 'fx/' + (subFor.id || '') + (subFor.key === 'itemfx' ? '/on' : '') : '';   // '/on': the item picker (Phase 3 · Effects on an item)
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
    const T = FM.fxThumbs;
    if (T) lazyTiles(run, cvs, q => { if (q[1].preset && T.mountPreset) T.mountPreset(q[0], q[1].preset, null); else if (T.mount) T.mount(q[0], q[1].type); });   // #1243 S11: as they come into view
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
    if (!panelFor || ids.length !== 1 || ids[0] !== panelFor) return false;
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
    const sel = ['#inspector-panel > .panel-title > .sm-pback', '#inspector .sm-look-tabs > .sm-pback', '#inspector .sm-cap-top > .sm-pback', '#inspector-panel.open > #insp-grab', '#add-sheet.open button'];
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
        home(); closeMenu(); if (lookDrag) lookUndrag(); if (subFor || segDrag) { subFor = null; segUndrag(); } extrasOpen = false;
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
      if (panelFor && (ids.length !== 1 || ids[0] !== panelFor)) { panelFor = null; panelKind = null; lookUndrag(); }
      /* #1243 S9: another selection closes a sub-row, and so does its item going (an undo, a friend's delete) */
      if (subFor && (subFor.sel !== selKey || (subFor.id && (ids.length !== 1 || ids[0] !== subFor.id || !FM.layerById(FM.scene, subFor.id))))) { subFor = null; segUndrag(); }
      const one = ids.length === 1 ? ids[0] : null, l = one && FM.layerById(FM.scene, one);
      roomy = !!one && roomForTwo();   // measured only for one item, the only tray that can take two rows
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
      const rowSig = subFor ? [subFor.key, subFor.id || '', subFor.from || '', rowTarget ? [rowTarget.fadeIn, rowTarget.fadeOut, JSON.stringify(rowTarget.volume), JSON.stringify(rowTarget.speed), rowTarget.duration].join('|') : '', (l && subFor.key === 'audio') ? [l.reversed, l.muted, R.units[l.id] && (R.followers[l.id] || []).length].join('|') : '', subFor.key === 'captions' ? FM.scene.layers.some(isCapTrack) : '', subFor.key === 'caplooks' ? (() => { const T = capTrackNow(); return T ? T.id + '/' + (FM.spine.captionLookOf ? FM.spine.captionLookOf(T) : '') : ''; })() : '', subFor.key === 'yourmedia' ? (demoOn() ? 'demo' : 'shown') : ''].join('#') : '';   // #1243 S8: the pressed look follows the track; review L4-1: Your media redraws when Demo mode flips
      /* the selected item's KIND, HOST and ROW from this read (queue 980, verify medium-tray; ported from BX1d 5f10fdb): a layer
         made in the same refresh (Text, Sound effects, Record voice) is synced first from the timeline's previous read, which
         has never heard of it, and drew the overlay tray (Into row, Crop) under a text or a sound; the rebuild's own sync then
         computed the same signature and kept it. Its kind from the fresh read differs, so the tray is drawn again.
         #1243 S9: every change of mode refills (tool()'s double-click guard counts the fills). */
      const sig = [ids.join(','), mode, extrasUp(), subFor ? subFor.key + '/' + (subFor.id || '') + '/' + (subFor.from || '') : '', panelFor, panelKind, roomy, rowSig, trExtras(), FM.spine.muteMode && FM.spine.muteMode(), FM.spine.linkMode && FM.spine.linkMode(), l ? [l.start, l.duration, l.locked, JSON.stringify(l.sm || null), l.type, l.audioOnly, JSON.stringify(l.trIn || null)].join('|') : '', one && R.units[one] ? R.units[one].kind + '/' + (R.units[one].host || '') + '/' + (R.isMain(one) ? 'm' : 'o') : '', R.main.map(e => e.id + (e.seam ? e.seam.kind : '')).join(','), R.trackEnd, segSig(l), (l && !subFor) ? splitAt(l) : ''].join('#');
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
      let two = false;
      try { two = fillTray(R, ids, one, S, mode); } finally { rows(two); hintSync(mode, R); fxMark(); }
      if (keepLeft > 0) { const run = tray.querySelector(':scope > .sm-runbox > .sm-run'); if (run) { run.scrollLeft = keepLeft; edges(run); } }
    },
    /* "More": today's panel for the selection: on a phone the sheet from the stage's bottom edge (#1243 rule 3), on a PC the whole band */
    /* unlatch: a closed sheet comes back (finding 20); armSheet: 2.7 (#1171), see sheetGuard */
    openPanel(id) { lookUndrag(); panelFor = id; panelKind = 'more'; lastSig = ''; if (FM.mobile && FM.mobile.unlatch) FM.mobile.unlatch(); FM.refreshAll(); armSheet(); },
    /* …and closed: a ‹ that had focus hands it to the tool that opened the panel (the panel's own ‹ goes with the redraw) */
    closePanel() {
      if (!panelFor) return;
      const ae = document.activeElement, fromBack = !!(ae && ae.classList && ae.classList.contains('sm-pback')), to = backTo;
      dropPanel();
      if (fromBack) {
        lastSig = ''; this.sync();
        const n = to && tray.querySelector('[data-tool="' + CSS.escape(to) + '"]');
        if (n) n.focus({ preventScroll: true });
      }
    },
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
    /* #1243 S9: A SUB-ROW TAKES THE BAR'S PLACE (key: a SUBS key; id: the item it acts on; from: the row its ‹ goes back to). One at a
       time: a new one replaces whatever row was up (the 2.7 ◇ pressed with the Effects picker up opens its row at once, the 7 Nov review).
       Only while Simple is on screen, so nothing opens or draws in Full. */
    openSub(key, id, from) {
      if (!SUBS[key] || !isSimple() || !mount()) return;
      segUndrag();
      /* ONE MENU AT A TIME BOTH WAYS (the 9 Nov review, MODE-1): a row opened while a panel is up closes the panel first. On a PC the ◇
         over the cut before a clip whose More or Look is open set the Transition row under that panel, where the bar is hidden: the press
         showed nothing until the panel's ‹ was pressed. */
      if (panelFor) dropPanel();
      subFor = { key: key, id: id || null, from: from || null, sel: (FM.selectionIds ? FM.selectionIds() : []).join(',') };
      lastSig = ''; this.sync();
    },
    openRow(kind, id, from) { this.openSub(kind, id, from); },   // 2.3: Speed, Volume, Fade; S9: Audio (and `from` = the row its ‹ returns to); 2.7: Transition; Strength
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
        backTo = panelKind === 'look' ? 'look' : panelKind === 'lines' ? 'editlines' : panelKind === 'more' ? (tray.querySelector('[data-tool="more"]') ? 'more' : 'capstyle') : '';
        this.closePanel(); return;
      }
      if (subFor) {
        backTo = SUBS[subFor.key].opener(subFor);
        subFor = subFor.from ? { key: subFor.from, id: subFor.id, from: null, sel: subFor.sel } : null;
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
    subFor: () => subFor && { key: subFor.key, id: subFor.id, from: subFor.from },
    /* Phase 3 · Clips › Extras: open (nothing selected; a selection is let go first), close, and whether it is up. Only while Simple
       is on screen: in Full openExtras opens nothing. A panel: the Clips row it was opened from stays under it. */
    openExtras() {
      if (!isSimple() || !mount()) return false;
      closeMenu();
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
    bandIdle(layer) { return isSimple() && !(layer && panelFor === layer.id) && !(!layer && extrasOpen); },
    /* …and the words it shows there while idle: a selected item's say where its tools are, "· More opens the rest" unless
       every tool is on show on the tray's two rows */
    bandWords: bandWords,
    /* suite seam (sm3 review, lens 6: Look's remembered focus and scroll and the #1171 arm time are state too, so one test's
       Look panel can no longer hand focus, or a held press, to the next) */
    _reset() { lookUndrag(); segUndrag(); panelFor = null; panelKind = null; lookTab = 'filters'; lookSeen = ''; lookLeft = 0; lookTop = 0; lookFocus = ''; sheetArmAt = -1e9; shutArmAt = -1e9; sheetPressAt = -1e9; lastPress = null; clearTimeout(sheetOff); sheetListen(false); linesSeen = ''; linesTop = 0; subFor = null; backTo = ''; extrasOpen = false; extrasSheetOff(); pbackSync(null); hintSync('off'); tfClear(); lastSig = ''; stripKey = ''; closeMenu(); },
    _menu: () => menu,
    ICON: ICON
  };
})(window.FM);
