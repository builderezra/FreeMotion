/* FreeMotion — mobile drawer + touch affordances (active at the phone breakpoint).
 * On desktop this is inert: the inspector stays a fixed column and #insp-toggle is hidden. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function isPhone() { return window.matchMedia('(max-width: 700px)').matches; }

  function init() {
    var insp = document.getElementById('inspector-panel');
    var btn = document.getElementById('insp-toggle');
    if (!insp || !btn) return;

    // A grab-handle/close bar pinned to the top of the bottom-sheet (phone only). Tapping it
    // closes the sheet, so the floating button can hide while the sheet is up (no overlap).
    var grab = document.createElement('button');
    grab.id = 'insp-grab';
    grab.type = 'button';
    grab.setAttribute('aria-label', 'Close inspector');
    grab.innerHTML = '<span class="grab-bar"></span>';
    insp.insertBefore(grab, insp.firstChild);

    function open() { insp.classList.add('open'); btn.classList.add('on'); document.body.classList.add('insp-open'); }
    function close() { insp.classList.remove('open'); btn.classList.remove('on'); document.body.classList.remove('insp-open'); }
    function toggle() { insp.classList.contains('open') ? dismiss() : open(); }

    // ---------- the sheet's state is DERIVED from the selection, not set by one caller ----------
    // It used to open in exactly one place: the FM.selectLayer wrapper below. But twenty-odd code
    // paths set FM.scene.selectedId directly and never go near it — adding a shape, paste, duplicate,
    // split, select-all, shift/paint-select, group and ungroup, undo/redo, the AI scene builder. Every
    // one of those left you with a layer selected, the top bar showing its name, and no edit options
    // on screen (Ezra: "sometimes you have a layer selected but all the edit options don't show up").
    // Deriving it from the selection on every inspector refresh — the one call they ALL make — closes
    // the whole class, including any path added later.
    var lastSyncKey = null;     // which selection the sheet last synced to
    var userClosed = false;     // …and whether the user dismissed it for THAT selection
    function dismiss() { userClosed = true; close(); }   // only a DELIBERATE close latches
    // m-editing is the focused single-clip timeline layout (it drives --head-w), so it must stay OFF
    // for a multi-select even though the sheet is open — the multi bar is where Group / trim-all /
    // align live, and gating the sheet on m-editing hid all of them behind an empty panel.
    // It is NOT decided here any more (v5.71). This counted the selection itself, which made two
    // owners of one class and left "1 selected in select mode" between them; app.js's
    // syncSelectionChrome derives all three top-bar classes from the live selection in one place. This
    // wrapper survives only for ORDER — it has to run before origRefresh's rebuild, which reads --head-w.
    function syncEditingClass() {
      if (FM.syncSelectionChrome) FM.syncSelectionChrome();
    }
    function syncSheet() {
      if (!isPhone()) return;
      syncEditingClass();
      var id = (FM.scene && FM.scene.selectedId) || null;
      var ids = (FM.selectionIds ? FM.selectionIds() : []) || [];
      var multi = ids.length > 1 || !!FM.selectMode;
      var has = !!id || ids.length > 0;
      var key = multi ? 'multi:' + ids.length : id;
      if (key !== lastSyncKey) { userClosed = false; lastSyncKey = key; }   // a NEW selection always gets the sheet back
      if (!has) { insp.style.top = ''; insp.style.maxHeight = ''; close(); userClosed = false; return; }
      /* A timeline clip drag owns the screen. Dragging a clip SELECTS it first, on purpose, so you can
         see what you grabbed — but the sheet is derived from the selection, so that selection used to
         throw the panel up over the very timeline being dragged on (Ezra, twice: "I still need it so I
         can drag clips on the timeline without it opening up the editing panel").
         Grabbing a clip stamps its id; the sheet leaves that one selection alone and any other
         selection clears the stamp. Read here rather than having timeline.js reach into the sheet, so
         the "derived from the selection" rule this function exists to enforce still holds. */
      // Stamped by timeline.js when you GRAB a clip. It names the layer, so a stamp left behind by
      // a gesture on some other layer — or set while the viewport was not a phone and this
      // function was returning early — cannot suppress an unrelated panel: anything that does not
      // match is cleared on sight.
      /* SUPPRESS FOR THE LIFE OF THE DRAG — NEVER LATCH (queue 433 clause 2). This used to consume the
         stamp and set `userClosed = true`, and `userClosed` is only ever reset when the selection KEY
         changes. So grabbing the clip that is ALREADY selected latched its sheet shut: the drag ends,
         the selection has not changed — a grab deliberately does not select — and nothing brings the
         panel back. Measured at 380px (tests/_soloroom.html): stamp set, drag over, stamp cleared,
         refresh → sheet STILL CLOSED with that layer still selected, and only picking a DIFFERENT clip
         freed it. That is his report: *"I pressed on a layer and the edit menu didn't load"*.
         `userClosed` means the user dismissed it. A grab is not a dismissal, so it must not write that
         flag. The stamp's lifetime is the drag — timeline.js clears it when the gesture ends — and this
         reads it without consuming it, so a mid-drag rebuild cannot let the sheet slip up either.
         A stamp naming some OTHER layer is stale and is still cleared on sight, which is the guard that
         stopped a flag set on desktop from suppressing an unrelated panel. */
      if (FM._sheetSuppressFor) {
        if (!multi && FM._sheetSuppressFor === id) return;
        FM._sheetSuppressFor = null;
      }
      if (userClosed) return;                                               // swiped away on purpose — leave it down
      if (!insp.classList.contains('open')) { if (FM.mobile && FM.mobile.closeAdd) FM.mobile.closeAdd(); open(); }
      if (multi) { insp.style.top = ''; insp.style.maxHeight = ''; }        // the docked position belongs to ONE clip
      else { syncClipName(); dockSheet(); }
    }

    // Swipe a bottom sheet DOWN to dismiss it (follows the finger, then snaps closed past a threshold).
    function makeSwipeDown(panel, grabEl, dismiss, getScrollEl) {
      var startY = 0, startX = 0, lastY = 0, lastT = 0, vy = 0, active = false, claimed = false, pid = null, h = 0;
      function atTop() { if (!getScrollEl) return true; var s = getScrollEl(); return !s || s.scrollTop <= 0; }
      function onDown(e) {
        if (active) return;   // a swipe is already in progress — ignore a 2nd finger (it would steal pid/startY and stall/misfire the gesture)
        if (!isPhone() || !panel.classList.contains('open')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        var onGrab = grabEl && (e.target === grabEl || grabEl.contains(e.target));
        if (!onGrab && !atTop()) return;
        // controls that OWN vertical drags (Move trackpad, rotate dial, value scrubs, curve editors)
        // must never be hijacked into a sheet-dismiss — that deselected the layer mid-gesture.
        //
        // .fx-grip is the effect/audio-effect reorder handle, and it belongs on this list for exactly
        // that reason: it carries touch-action:none, so unlike the rest of the row it keeps feeding
        // pointermoves instead of turning into a sheet scroll — and this handler was claiming them.
        // Ezra: "if I only have two effects and I try to drag the top one down it just closes the
        // menu." Measured on a 390x844 phone with real touch events: the second move called
        // panel.setPointerCapture(), which retargets every later move AND the pointerup at the panel,
        // so the effect row never ran endReorder() (the drop was thrown away, the row left stuck
        // mid-drag with .fx-dragging and a translateY still on it, and _fxReorderAt never stamped, so
        // the v5.56 400ms tap-guard could not possibly help). Drag past a third of the sheet's height
        // — which the top row must, to clear an open editor — and the drop deselected the layer.
        if (!onGrab && e.target.closest && e.target.closest('.mt-trackpad, .mt-dial-ring, .mt-scrub, .mt-vbox-val, .fx-scrub, .fx-grip, .es-canvas, .ge-canvas, .cw-canvas, input, textarea, select')) return;
        active = true; claimed = false; pid = e.pointerId;
        startY = lastY = e.clientY; startX = e.clientX; lastT = e.timeStamp; vy = 0;
        h = panel.getBoundingClientRect().height || 1; panel._swiped = false;
      }
      function onMove(e) {
        if (!active || e.pointerId !== pid) return;
        /* AN EFFECT REORDER OUTRANKS THE DISMISS (#686). The list above excludes `.fx-grip` at
           pointerdown, but a press-hold ANYWHERE on an effect row cannot be excluded there: the hold
           does not fire for 280ms, so at pointerdown this handler cannot know what the gesture will
           become, and it has already armed. Checked here instead, where the answer is known — and
           only before `claimed`, so a dismiss already in flight still completes. */
        if (!claimed && FM._fxReordering) { active = false; return; }
        var dy = e.clientY - startY, dx = e.clientX - startX;
        if (!claimed) {
          if (dy < -4) { active = false; return; }                 // upward → not a dismiss
          if (dy > 6 && dy > Math.abs(dx)) { claimed = true; panel.style.transition = 'none'; panel.style.animation = 'none'; try { panel.setPointerCapture(pid); } catch (_) {} }   // queue 773: the hinge keyframe (fill both) still OWNED transform after it ended, so the finger moved nothing — a claimed drag switches it off
          else return;
        }
        if (e.cancelable) e.preventDefault();
        var now = e.timeStamp, ddt = now - lastT; if (ddt > 0) vy = (e.clientY - lastY) / ddt; lastY = e.clientY; lastT = now;
        panel.style.transform = 'translateY(' + Math.max(0, dy) + 'px)';
      }
      function settle(e, aborted) {
        if (!active || (e && e.pointerId !== pid)) return;
        var wasClaimed = claimed; active = false; claimed = false;
        try { panel.releasePointerCapture(pid); } catch (_) {}
        panel.style.transition = '';
        panel.style.transform = '';
        panel.style.animation = '';   // queue 773: and hands transform back once the finger is off
        if (!wasClaimed || aborted) return;   // pointercancel = the OS stole the gesture → snap back, NEVER dismiss/deselect
        panel._swiped = true;
        if ((lastY - startY) > 0.33 * h || vy > 0.5) dismiss(Math.max(0, lastY - startY));      // far enough OR fast flick → close — from where the finger left it (queue 773)
      }
      panel.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', settle);
      window.addEventListener('pointercancel', e => settle(e, true));
    }

    btn.addEventListener('click', toggle);
    grab.addEventListener('click', function () { if (insp._swiped) { insp._swiped = false; return; } dismiss(); });
    makeSwipeDown(insp, grab, function () { if (isPhone() && document.body.classList.contains('m-editing')) FM.selectLayer(null); else dismiss(); }, function () { return insp; });

    // Every rebuild of the panel re-derives the sheet's state. This is the hook that makes the rule
    // above universal: selectLayer, refreshAll, add-a-shape, paste, duplicate, split, group, undo —
    // they all end in an inspector refresh, whether or not they know the sheet exists.
    if (FM.inspector && typeof FM.inspector.refresh === 'function') {
      var origInspRefresh = FM.inspector.refresh;
      FM.inspector.refresh = function () { var r = origInspRefresh.apply(this, arguments); syncSheet(); return r; };
    }

    // Selecting a layer (canvas tap or layer list) slides the inspector up so its controls are
    // reachable; deselecting drops it. Wrap, don't edit, the core fn. The class has to be set BEFORE
    // the rebuild inside orig() — it drives --head-w (overview eye-only vs edit pill), which the
    // rebuild reads to keep clip-x / playhead in sync; syncSheet then settles everything after.
    // orig() IS FM.selectLayer, which sets the id and then calls syncSelectionChrome before its own
    // rebuilds — so the class lands early enough without a second copy of the rule out here (v5.71).
    if (typeof FM.selectLayer === 'function') {
      var orig = FM.selectLayer;
      FM.selectLayer = function (id) {
        var r = orig.apply(this, arguments);
        if (isPhone() && id) requestAnimationFrame(dockSheet);   // dock once the sheet's height has settled
        return r;
      };
    }

    // ---------- AM phone clip-edit: top-bar clip name + duplicate/delete + docked sheet ----------
    var clipNameM = document.getElementById('clip-name-m');
    var mDup = document.getElementById('m-dup');
    var mDel = document.getElementById('m-del');
    function curLayer() { return FM.selectedLayer ? FM.selectedLayer(FM.scene) : null; }
    function syncClipName() { var L = curLayer(); if (clipNameM && L && document.activeElement !== clipNameM) clipNameM.value = L.name || ''; }
    if (clipNameM) {
      clipNameM.addEventListener('input', function () {
        var L = curLayer(); if (!L) return;
        L.name = clipNameM.value;
        if (FM.layersPanel) FM.layersPanel.refresh();
        if (FM.timeline) FM.timeline.rebuild();
      });
      clipNameM.addEventListener('change', function () { if (FM.history) FM.history.commit(); });
    }
    // PARENTING, not duplicate. This slot came from a screenshot Ezra sent of Alight Motion's top
    // bar; the icon there opens a parent picker (a list of every layer you can attach to, each with
    // its thumbnail), and it was read as a duplicate button. Duplicate has two other homes already —
    // the transport row and the layer ⋯ menu — so nothing is lost by giving the slot back.
    if (mDup) mDup.addEventListener('click', function () {
      var L = curLayer(); if (!L) return;
      var r = mDup.getBoundingClientRect();
      if (FM.openParentPicker) FM.openParentPicker(L, Math.min(r.left - 60, window.innerWidth - 250), r.bottom + 6);
    });
    // ⋯ More — the full clip menu (split, lock, reverse, replace media, reset, loop, blend, parent…),
    // the same set desktop reaches by right-clicking a clip. Anchored under the button, right-aligned.
    var mMore = document.getElementById('m-more');
    if (mMore) mMore.addEventListener('click', function () {
      var L = curLayer(); if (!L || !FM.contextMenu || !FM.layerMenuItems) return;
      var r = mMore.getBoundingClientRect();
      FM.contextMenu.show(Math.max(8, r.right - 230), r.bottom + 6, FM.layerMenuItems(L));
    });
    if (mDel) mDel.addEventListener('click', function () {
      var ids = FM.selectionIds ? FM.selectionIds() : [];
      if (ids.length > 1 && FM.deleteSelected) { FM.deleteSelected(); return; }   // select-mode: delete the whole set
      var L = curLayer(); if (L && FM.deleteLayer) FM.deleteLayer(L.id);
    });
    // The project ⋯ handler lived here. Removed with the button (v6.13) — see index.html for where each
    // of its entries went. What made it removable was the canvas dialog's new "App settings…" button:
    // FM.settings used to be reachable from the home screen only, so on a phone this menu really was
    // the one door to snapping, onion skin, guides and save/reset. It is two taps from the cog now.
    // AM: Group button (top bar, next to the bin) — appears when 2+ layers are selected
    /* ONE TAP, NO MENU (queue 376) — AND NOW A PAIR OF THEM (queue 436).
       Queue 376's note said a second icon here "would come straight out of 4 layers selected", and put
       Masking Group in the multi-select sheet instead. Ezra came back and said that is not what he
       wanted: *"I wanted the ability to group every layer selected in the top right with an icon for
       the two options, not in the bottom menu."*
       So it was re-measured rather than re-argued, at the same 380px with four layers selected: the
       header reports **49.5px spare** and a 56px hole beside the bin. The earlier reading counted the
       hole as "full" — it is `#m-del { margin-right: 52px }`, a deliberate mis-tap guard, so it is not
       slack to be reclaimed, but it is not the header being out of room either. The twin goes on the
       far side of that guard, beside this button, and the count label pays the 46px by saying
       "4 selected" instead. */
    var mGroup = document.getElementById('m-group');
    if (mGroup) mGroup.addEventListener('click', function () { if (FM.groupSelection) FM.groupSelection(); });
    var mMask = document.getElementById('m-maskgroup');
    if (mMask) mMask.addEventListener('click', function () { if (FM.groupSelection) FM.groupSelection({ mask: true }); });

    // Anchor the docked sheet's top just below the single selected-clip row so the property
    // options never cover the clip — clamped so the panel always keeps a usable height.
    function dockSheet() {
      if (!isPhone() || !document.body.classList.contains('m-editing')) { insp.style.top = ''; insp.style.maxHeight = ''; return; }
      var tracks = document.getElementById('tl-tracks');
      /* DOCK TO THE ROWS, NOT TO THE CONTAINER (queue 433 clause 1). Ezra, with the band circled:
         "Wasted space here". Measured at 380px: the clip's row ended at y=485 and the sheet started at
         541 — a 56px strip of nothing between a clip and its own options, one and a third rows tall.
         It is not a margin and nothing is broken: `#tl-tracks` carries
         `padding-bottom: calc(52px + safe-area)` so you can drag a layer past the last one and so the
         list can scroll clear of the home bar. That padding is scroll room for a LIST — and this dock
         only ever runs in the single-selection solo view, where exactly one row is drawn and there is
         no list to scroll. So the sheet was measuring an allowance for content that does not exist.
         Measuring the last ROW instead leaves the padding doing its job everywhere it has one. */
      var bottom = 0;
      if (tracks) {
        var rows = tracks.querySelectorAll('.track-row, .tl-addrow');
        for (var i = 0; i < rows.length; i++) bottom = Math.max(bottom, rows[i].getBoundingClientRect().bottom);
        // No rows at all (an empty project) → the container is the only thing there is to measure.
        if (!bottom) bottom = tracks.getBoundingClientRect().bottom;
      }
      var top = Math.min(Math.round(bottom + 6), Math.round(window.innerHeight * 0.66));
      insp.style.top = top + 'px';
      insp.style.maxHeight = 'none';
    }
    /* ⚠️ THE DOCK HAS TO RUN AFTER AN ADD TOO (queue 531), and this is the SAME root cause as #523.
       Ezra: *"When you add a layer and it instantly opens up it leaves this gap untill you start
       editing … The gap between the editor and the timeline I mean"*.
       `dockSheet` was only ever reached from the `FM.selectLayer` wrapper below — but every layer
       CREATOR (`addTextLayer`, `addCamera`, `addAdjustmentLayer` and a dozen more) writes
       `FM.scene.selectedId` DIRECTLY and calls `refreshAll()`, never touching `selectLayer`. So an added
       layer opened its panel with whatever `top` the last dock left behind and nothing re-measured it.
       MEASURED at 380px: after `FM.addTextLayer()` the panel sits at a stale `top: 6px` and is still
       there 1.4s later — it does not self-correct. One real `selectLayer` moves it to 491px, which is
       exactly "until you start editing".
       Exposed rather than duplicated, and called from `refreshAll` — the one place every creator does
       go through. It self-guards (not a phone, or not editing → it clears its own inline styles), so
       calling it from a shared path is safe. */
    FM._dockSheet = function () { try { dockSheet(); } catch (e) {} };
    window.addEventListener('resize', function () { if (isPhone() && document.body.classList.contains('m-editing')) { syncClipName(); requestAnimationFrame(dockSheet); } });

    // ---------- AM-style mobile chrome: top bar + green + FAB + Add sheet ----------
    function clickHidden(id) { var b = document.getElementById(id); if (b) b.click(); }

    // mirror the build version onto the phone top bar so Ezra can confirm he's on the latest deploy
    var verM = document.getElementById('ver-m');
    var verSrc = document.querySelector('.ver');
    if (verM && verSrc) { var vm = verSrc.textContent.match(/v[\d.]+/); verM.textContent = vm ? vm[0] : ''; }

    // project name field (mirrors the desktop #proj-name + FM.scene.project.name)
    var pnM = document.getElementById('proj-name-m');
    var pnD = document.getElementById('proj-name');
    function syncProjName() { if (pnM && document.activeElement !== pnM) pnM.value = (FM.scene.project.name || 'Untitled'); }
    if (pnM) {
      syncProjName();
      pnM.addEventListener('input', function () { FM.scene.project.name = pnM.value; if (pnD) pnD.value = pnM.value; });
      pnM.addEventListener('change', function () { if (FM.history) FM.history.commit(); });
    }
    if (typeof FM.refreshAll === 'function') {   // keep it synced on load / undo / restore
      var origRefresh = FM.refreshAll;
      FM.refreshAll = function () {
        syncEditingClass();   // BEFORE origRefresh's rebuild (drives --head-w; see the selectLayer note)
        var r = origRefresh.apply(this, arguments);
        syncProjName();
        // The sheet itself was settled by the inspector refresh inside origRefresh. Only the docked
        // position needs the extra frame, once the new content has given the sheet its height.
        if (isPhone() && document.body.classList.contains('m-editing')) requestAnimationFrame(dockSheet);
        return r;
      };
    }

    var mBack = document.getElementById('m-back');
    if (mBack) mBack.addEventListener('click', function () {
      // The bar belongs to the selection → back LEAVES the selection, it does not leave the project.
      // Without this the arrow beside a live multi-selection went to the home screen (v5.71).
      if (isPhone() && document.body.classList.contains('sel-mode')) { FM.selectLayer(null); return; }
      if (isPhone() && document.body.classList.contains('m-editing')) { FM.selectLayer(null); return; }   // AM: back = deselect the clip
      if (FM.groupContext && FM.exitGroup) { FM.exitGroup(); return; }   // back out of the Edit Group timeline first
      // AM: back from the editor = the home screen (project browser). The old file menu's actions
      // moved there: Import/Export live on home (⋯ + per-project menu); reset = delete the project.
      if (FM.home) { FM.home.open(); return; }
      var r = mBack.getBoundingClientRect();
      if (FM.contextMenu) FM.contextMenu.show(r.left, r.bottom + 4, [
        { label: 'Open project…', action: function () { if (FM.storage && FM.storage.importFile) FM.storage.importFile(); } },
        { label: 'Save project', action: function () { if (FM.storage && FM.storage.exportFile) FM.storage.exportFile(); } },
        // 'Save frame (PNG)' now lives in Export ▸ Format ▸ "This frame (PNG)", the same place the
        // desktop menu sends you — Ezra asked for it to be there, not in two menus at once.
        { sep: true },
        { label: 'Shortcuts', action: function () { if (FM.shortcuts) FM.shortcuts.toggle(); } },
      ]);
    });
    var mSettings = document.getElementById('m-settings');
    if (mSettings) mSettings.addEventListener('click', function () { clickHidden('btn-canvas'); });
    var mExport = document.getElementById('m-export');
    if (mExport) mExport.addEventListener('click', function () { clickHidden('btn-export'); });
    /* No notes button on the phone BAR (queue 139). One was added and the suite caught the hazard:
       any extra control in that group shifts the settings cog sideways into the spot the delete bin
       occupies in select mode — "a thumb going where it has always gone hits delete". The phone reaches
       the notepad through Settings, which is where every other project-level action already lives. */

    // Add sheet
    var addFab = document.getElementById('add-fab');
    var addSheet = document.getElementById('add-sheet');
    var addGrab = document.getElementById('add-grab');
    var addGrid = document.getElementById('add-grid');
    /* THE SHEET REDRAWS EACH TIME IT OPENS (BUG-HUNT: "Turning on Demo mode does not blank the phone Add
       sheet's media tiles — filenames and thumbnails of personal media stay on screen").
       It was rendered exactly once, at init. Demo mode is only read while a card is BUILT, and the body
       is only rebuilt when you change tab or type in the search — so turning the setting on and coming
       back to the project reopened the sheet still showing "Holiday_Bali_2024.mp4" and the clip's own
       frame, which is precisely the exposure the setting exists to prevent, during the screen recording
       it was just switched on for. Nothing said the setting had not applied.
       Re-rendering here rather than subscribing to the settings listener, because `render()` also runs
       for the PC inspector and a listener added there would leak one per re-render. The menu remembers
       its tab and page, so a redraw returns to where you were — only the CONTENT is re-derived. */
    var addOpts = { variant: 'sheet', onAfterAdd: closeAdd, onClose: closeAdd };
    function redrawAdd() { if (addGrid && FM.addMenu) FM.addMenu.render(addGrid, addOpts); }
    /* Publish the canvas's bottom edge as the sheet's top (queue 404). Measured rather than derived from
       a constant, because the stage's height depends on the project's aspect and on whether the layout is
       phone or PC — the same reason js/timeline.js measures its own panel instead of reading a variable. */
    function syncAddSheetTop() {
      var stage = document.getElementById('stage');
      if (!addSheet) return;
      if (!stage || !isPhone()) { addSheet.style.removeProperty('--add-sheet-top'); return; }
      var b = stage.getBoundingClientRect().bottom;
      addSheet.style.setProperty('--add-sheet-top', Math.max(0, Math.round(b)) + 'px');
    }
    function openAdd() {
      close(); redrawAdd(); syncAddSheetTop();
      if (addSheet._closeTimer) { clearTimeout(addSheet._closeTimer); addSheet._closeTimer = 0; }   // reopened mid-close: cancel the release
      addSheet.classList.remove('closing'); addSheet.style.transition = ''; addSheet.style.transform = '';
      addSheet.classList.add('open'); document.body.classList.add('add-open');
    }
    /* THE CLOSE SLIDES DOWN (queue 773). Ezra: "when you swipe down to swipe it away or just like tap to close it it doesn't
       slide down on the screen anymore. It just disappears which is tacky make it actually slide down when you slide your
       finger down." Removing `.open` takes the hinge keyframe (queue 706, v15.08) with it, and a transition does not start
       from a value an animation was holding — so the sheet cut to nothing (measured: translateY 404px on the very first
       frame after the tap). And a swipe's release cleared the finger's offset first, snapping the sheet back to the top.
       So: hold the sheet where it is — the finger's offset, or the top — with the motion off and the hinge gone, commit
       that frame, and release it one frame later so the base rule's translateY(100%) + .22s transition carry it down. */
    function closeAdd(fromY) {
      if (!addSheet.classList.contains('open')) { document.body.classList.remove('add-open'); return; }
      var y = Math.max(0, +fromY || 0);
      addSheet.classList.add('closing');
      addSheet.style.transition = 'none';
      addSheet.style.transform = 'translateY(' + y + 'px)';
      addSheet.classList.remove('open');
      void addSheet.offsetHeight;   // commit the held frame before releasing it
      document.body.classList.remove('add-open');
      requestAnimationFrame(function () {
        if (addSheet.classList.contains('open')) return;   // reopened in between — openAdd already tidied
        addSheet.style.transition = ''; addSheet.style.transform = '';
        var done = function () { addSheet.classList.remove('closing'); addSheet.removeEventListener('transitionend', done); addSheet._closeTimer = 0; };
        addSheet.addEventListener('transitionend', done);
        addSheet._closeTimer = setTimeout(done, 400);
      });
    }
    FM._addSheetClose = closeAdd;   // suite seam (queue 773)
    if (addFab) addFab.addEventListener('click', function () { addSheet.classList.contains('open') ? closeAdd() : openAdd(); });
    if (addGrab) addGrab.addEventListener('click', function () { if (addSheet._swiped) { addSheet._swiped = false; return; } closeAdd(); });
    if (addSheet) makeSwipeDown(addSheet, addGrab, closeAdd, null);

    // The Add sheet now hosts the shared AM-style Add menu (same component the PC inspector uses when
    // nothing is selected). Tabs open a sub-section; the quick-add rail adds instantly; X closes.
    if (addGrid && FM.addMenu) {
      addGrid.classList.remove('add-grid');           // drop the old 3-col grid; the menu owns its layout
      addGrid.classList.add('addmenu-host');
      redrawAdd();
    }

    // Returning to desktop width must never strand the drawer off-screen.
    window.addEventListener('resize', function () { if (!isPhone()) { close(); closeAdd(); document.body.classList.remove('m-editing'); insp.style.top = ''; insp.style.maxHeight = ''; } else { syncAddSheetTop(); } });

    FM.mobile = { open: open, close: close, toggle: toggle, isPhone: isPhone, openAdd: openAdd, closeAdd: closeAdd, syncAddSheetTop: syncAddSheetTop };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.FM);
