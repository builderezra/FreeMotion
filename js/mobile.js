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
    function toggle() { insp.classList.contains('open') ? close() : open(); }

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
        active = true; claimed = false; pid = e.pointerId;
        startY = lastY = e.clientY; startX = e.clientX; lastT = e.timeStamp; vy = 0;
        h = panel.getBoundingClientRect().height || 1; panel._swiped = false;
      }
      function onMove(e) {
        if (!active || e.pointerId !== pid) return;
        var dy = e.clientY - startY, dx = e.clientX - startX;
        if (!claimed) {
          if (dy < -4) { active = false; return; }                 // upward → not a dismiss
          if (dy > 6 && dy > Math.abs(dx)) { claimed = true; panel.style.transition = 'none'; try { panel.setPointerCapture(pid); } catch (_) {} }
          else return;
        }
        if (e.cancelable) e.preventDefault();
        var now = e.timeStamp, ddt = now - lastT; if (ddt > 0) vy = (e.clientY - lastY) / ddt; lastY = e.clientY; lastT = now;
        panel.style.transform = 'translateY(' + Math.max(0, dy) + 'px)';
      }
      function settle(e) {
        if (!active || (e && e.pointerId !== pid)) return;
        var wasClaimed = claimed; active = false; claimed = false;
        try { panel.releasePointerCapture(pid); } catch (_) {}
        panel.style.transition = '';
        panel.style.transform = '';
        if (!wasClaimed) return;
        panel._swiped = true;
        if ((lastY - startY) > 0.33 * h || vy > 0.5) dismiss();      // far enough OR fast flick → close
      }
      panel.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', settle);
      window.addEventListener('pointercancel', settle);
    }

    btn.addEventListener('click', toggle);
    grab.addEventListener('click', function () { if (insp._swiped) { insp._swiped = false; return; } close(); });
    makeSwipeDown(insp, grab, function () { if (isPhone() && document.body.classList.contains('m-editing')) FM.selectLayer(null); else close(); }, function () { return insp; });

    // Selecting a layer (canvas tap or layer list) slides the inspector up so its
    // controls are reachable; deselecting drops it. Wrap, don't edit, the core fn.
    if (typeof FM.selectLayer === 'function') {
      var orig = FM.selectLayer;
      FM.selectLayer = function (id) {
        // Toggle m-editing BEFORE the rebuild inside orig() — it drives --head-w (overview eye-only
        // vs edit pill), which the rebuild reads to keep clip-x / playhead in sync.
        if (isPhone()) document.body.classList.toggle('m-editing', !!id);
        var r = orig.apply(this, arguments);
        if (isPhone()) {
          if (id) { open(); syncClipName(); dockSheet(); requestAnimationFrame(dockSheet); }
          else { insp.style.top = ''; insp.style.maxHeight = ''; close(); }
        }
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
    if (mDup) mDup.addEventListener('click', function () { var L = curLayer(); if (L && FM.duplicateLayer) FM.duplicateLayer(L.id); });
    if (mDel) mDel.addEventListener('click', function () { var L = curLayer(); if (L && FM.deleteLayer) FM.deleteLayer(L.id); });

    // Anchor the docked sheet's top just below the single selected-clip row so the property
    // options never cover the clip — clamped so the panel always keeps a usable height.
    function dockSheet() {
      if (!isPhone() || !document.body.classList.contains('m-editing')) { insp.style.top = ''; insp.style.maxHeight = ''; return; }
      var tracks = document.getElementById('tl-tracks');
      var b = tracks ? tracks.getBoundingClientRect().bottom : 0;
      var top = Math.min(Math.round(b + 6), Math.round(window.innerHeight * 0.66));
      insp.style.top = top + 'px';
      insp.style.maxHeight = 'none';
    }
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
        // set m-editing BEFORE origRefresh's rebuild (drives --head-w; see selectLayer note)
        if (isPhone()) document.body.classList.toggle('m-editing', !!(FM.scene && FM.scene.selectedId));
        var r = origRefresh.apply(this, arguments);
        syncProjName();
        if (isPhone()) {
          var sel = FM.scene && FM.scene.selectedId;
          if (sel) { syncClipName(); dockSheet(); requestAnimationFrame(dockSheet); } else { insp.style.top = ''; insp.style.maxHeight = ''; }
        }
        return r;
      };
    }

    var mBack = document.getElementById('m-back');
    if (mBack) mBack.addEventListener('click', function () {
      if (isPhone() && document.body.classList.contains('m-editing')) { FM.selectLayer(null); return; }   // AM: back = deselect the clip
      var r = mBack.getBoundingClientRect();
      if (FM.contextMenu) FM.contextMenu.show(r.left, r.bottom + 4, [
        { label: 'Open project…', action: function () { if (FM.storage && FM.storage.importFile) FM.storage.importFile(); } },
        { label: 'Save project', action: function () { if (FM.storage && FM.storage.exportFile) FM.storage.exportFile(); } },
        { label: 'Save frame (PNG)', action: function () { if (FM.snapshotPNG) FM.snapshotPNG(); } },
        { label: 'Reset project…', danger: true, action: function () { if (confirm('Reset the project? This clears all layers and cannot be undone.') && FM.resetProject) FM.resetProject(); } },
        { sep: true },
        { label: 'Shortcuts', action: function () { if (FM.shortcuts) FM.shortcuts.toggle(); } },
      ]);
    });
    var mSettings = document.getElementById('m-settings');
    if (mSettings) mSettings.addEventListener('click', function () { clickHidden('btn-canvas'); });
    var mExport = document.getElementById('m-export');
    if (mExport) mExport.addEventListener('click', function () { clickHidden('btn-export'); });

    // Add sheet
    var addFab = document.getElementById('add-fab');
    var addSheet = document.getElementById('add-sheet');
    var addGrab = document.getElementById('add-grab');
    var addGrid = document.getElementById('add-grid');
    function openAdd() { close(); addSheet.classList.add('open'); document.body.classList.add('add-open'); }
    function closeAdd() { addSheet.classList.remove('open'); document.body.classList.remove('add-open'); }
    if (addFab) addFab.addEventListener('click', function () { addSheet.classList.contains('open') ? closeAdd() : openAdd(); });
    if (addGrab) addGrab.addEventListener('click', function () { if (addSheet._swiped) { addSheet._swiped = false; return; } closeAdd(); });
    if (addSheet) makeSwipeDown(addSheet, addGrab, closeAdd, null);

    // The Add sheet now hosts the shared AM-style Add menu (same component the PC inspector uses when
    // nothing is selected). Tabs open a sub-section; the quick-add rail adds instantly; X closes.
    if (addGrid && FM.addMenu) {
      addGrid.classList.remove('add-grid');           // drop the old 3-col grid; the menu owns its layout
      addGrid.classList.add('addmenu-host');
      FM.addMenu.render(addGrid, { variant: 'sheet', onAfterAdd: closeAdd, onClose: closeAdd });
    }

    // Returning to desktop width must never strand the drawer off-screen.
    window.addEventListener('resize', function () { if (!isPhone()) { close(); closeAdd(); document.body.classList.remove('m-editing'); insp.style.top = ''; insp.style.maxHeight = ''; } });

    FM.mobile = { open: open, close: close, toggle: toggle, isPhone: isPhone, openAdd: openAdd, closeAdd: closeAdd };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.FM);
