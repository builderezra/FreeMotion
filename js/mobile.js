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
    makeSwipeDown(insp, grab, close, function () { return insp; });

    // Selecting a layer (canvas tap or layer list) slides the inspector up so its
    // controls are reachable; deselecting drops it. Wrap, don't edit, the core fn.
    if (typeof FM.selectLayer === 'function') {
      var orig = FM.selectLayer;
      FM.selectLayer = function (id) {
        var r = orig.apply(this, arguments);
        if (isPhone()) { if (id) open(); else close(); }
        return r;
      };
    }

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
      FM.refreshAll = function () { var r = origRefresh.apply(this, arguments); syncProjName(); return r; };
    }

    var mBack = document.getElementById('m-back');
    if (mBack) mBack.addEventListener('click', function () {
      var r = mBack.getBoundingClientRect();
      if (FM.contextMenu) FM.contextMenu.show(r.left, r.bottom + 4, [
        { label: 'Open project…', action: function () { if (FM.storage && FM.storage.importFile) FM.storage.importFile(); } },
        { label: 'Save project', action: function () { if (FM.storage && FM.storage.exportFile) FM.storage.exportFile(); } },
        { label: 'Save frame (PNG)', action: function () { if (FM.snapshotPNG) FM.snapshotPNG(); } },
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

    function svg(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
    var ICON = {
      text: '<path d="M6 5h12M12 5v14M9 19h6"/>',
      shape: '<rect x="4" y="4" width="9" height="9" rx="1.5"/><circle cx="16" cy="16" r="5"/>',
      media: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M4 18l5-5 4 3 3-2 4 4"/>',
      sample: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 9.5h16M9 5v4.5M15 5v4.5"/>',
      captions: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 11h3M7 14.5h6M14 11h3"/>',
    };
    function shapeMenu(card) {
      if (!FM.contextMenu) { if (FM.addShapeLayer) FM.addShapeLayer('rect'); return; }
      var r = card.getBoundingClientRect();
      FM.contextMenu.show(Math.max(8, r.left), Math.max(60, r.top - 8), [
        { label: 'Rectangle', action: function () { FM.addShapeLayer('rect'); } },
        { label: 'Ellipse', action: function () { FM.addShapeLayer('ellipse'); } },
        { label: 'Triangle', action: function () { FM.addShapeLayer('triangle'); } },
        { label: 'Star', action: function () { FM.addShapeLayer('star'); } },
        { sep: true },
        { label: 'Camera', action: function () { if (FM.addCameraLayer) FM.addCameraLayer(); } },
        { label: 'Adjustment layer', action: function () { if (FM.addAdjustmentLayer) FM.addAdjustmentLayer(); } },
        { label: 'Null (rig)', action: function () { if (FM.addNullLayer) FM.addNullLayer(); } },
      ]);
    }
    var CARDS = [
      { label: 'AI Scene', emoji: '✨', action: function () { if (FM.aiPanel) FM.aiPanel.show(); } },
      { label: 'Text', icon: ICON.text, action: function () { if (FM.addTextLayer) FM.addTextLayer(); } },
      { label: 'Shape', icon: ICON.shape, action: function (card) { shapeMenu(card); } },
      { label: 'Media', icon: ICON.media, action: function () { clickHidden('file-input'); } },
      { label: 'Sample', icon: ICON.sample, action: function () { if (FM.addSampleClip) FM.addSampleClip(); } },
      { label: 'Captions', icon: ICON.captions, action: function () { if (FM.addCaptionLayer) FM.addCaptionLayer(); } },
    ];
    if (addGrid) {
      CARDS.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'add-card';
        var ic = c.emoji ? '<span style="font-size:24px;line-height:1">' + c.emoji + '</span>' : svg(c.icon);
        b.innerHTML = '<span class="add-ic">' + ic + '</span><span>' + c.label + '</span>';
        b.addEventListener('click', function () { closeAdd(); c.action(b); });
        addGrid.appendChild(b);
      });
    }

    // Returning to desktop width must never strand the drawer off-screen.
    window.addEventListener('resize', function () { if (!isPhone()) { close(); closeAdd(); } });

    FM.mobile = { open: open, close: close, toggle: toggle, isPhone: isPhone, openAdd: openAdd, closeAdd: closeAdd };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.FM);
