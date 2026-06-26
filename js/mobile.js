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

    function open() { insp.classList.add('open'); btn.classList.add('on'); }
    function close() { insp.classList.remove('open'); btn.classList.remove('on'); }
    function toggle() { insp.classList.contains('open') ? close() : open(); }

    btn.addEventListener('click', toggle);
    grab.addEventListener('click', close);

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

    // Returning to desktop width must never strand the drawer off-screen.
    window.addEventListener('resize', function () { if (!isPhone()) close(); });

    FM.mobile = { open: open, close: close, toggle: toggle, isPhone: isPhone };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.FM);
