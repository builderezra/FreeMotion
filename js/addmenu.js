/* FreeMotion — AM-style "Add" menu (shared component).
 * Used in TWO places:
 *   • PC: the inspector's no-selection state (nothing selected → this menu; select a clip → editor).
 *   • Mobile: the green + FAB bottom-sheet.
 * AM interaction model: TOP-ROW tabs OPEN A SUB-SECTION of choices; the QUICK-ADD rail ADDS INSTANTLY. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function ico(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  function fileImport() { var fi = document.getElementById('file-input'); if (fi) fi.click(); }

  // TOP-ROW TABS — each opens a sub-section of choices (you pick, then it adds).
  var TABS = [
    { key: 'shape', label: 'Shape', icon: ico('<rect x="4" y="4" width="9" height="9" rx="1.5"/><circle cx="16" cy="16" r="5"/>'), options: [
      { label: 'Rectangle', icon: ico('<rect x="4" y="6" width="16" height="12" rx="1.5"/>'), add: function () { FM.addShapeLayer && FM.addShapeLayer('rect'); } },
      { label: 'Ellipse', icon: ico('<ellipse cx="12" cy="12" rx="9" ry="7"/>'), add: function () { FM.addShapeLayer && FM.addShapeLayer('ellipse'); } },
      { label: 'Triangle', icon: ico('<path d="M12 4l8 16H4z"/>'), add: function () { FM.addShapeLayer && FM.addShapeLayer('triangle'); } },
      { label: 'Star', icon: ico('<path d="M12 3l2.5 6 6.5.5-5 4.2 1.6 6.3L12 17l-5.6 3 1.6-6.3-5-4.2 6.5-.5z"/>'), add: function () { FM.addShapeLayer && FM.addShapeLayer('star'); } },
    ] },
    { key: 'media', label: 'Media', icon: ico('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M4 18l5-5 4 3 3-2 4 4"/>'), options: [
      { label: 'Import…', icon: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'), add: fileImport },
      { label: 'Sample clip', icon: ico('<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 9.5h16M9 5v4.5M15 5v4.5"/>'), add: function () { FM.addSampleClip && FM.addSampleClip(); } },
    ] },
    { key: 'object', label: 'Object / Element', icon: ico('<path d="M10 3l5.5 9H4.5z"/><circle cx="16.5" cy="15.5" r="4.5"/>'), options: [
      { label: 'Camera', icon: ico('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'), add: function () { FM.addCameraLayer && FM.addCameraLayer(); } },
      { label: 'Null', icon: ico('<rect x="5" y="5" width="14" height="14" rx="1" stroke-dasharray="3 2"/><path d="M9 12h6M12 9v6"/>'), add: function () { FM.addNullLayer && FM.addNullLayer(); } },
      { label: 'Adjustment', icon: ico('<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/>'), add: function () { FM.addAdjustmentLayer && FM.addAdjustmentLayer(); } },
    ] },
  ];

  // QUICK-ADD rail — one tap creates immediately (AM: the side column does NOT open a section).
  var INSTANT = [
    { label: 'Text', icon: ico('<path d="M6 5h12M12 5v14M9 19h6"/>'), add: function () { FM.addTextLayer && FM.addTextLayer(); } },
    { label: 'Captions', icon: ico('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 11h3M7 14.5h6M14 11h3"/>'), add: function () { FM.addCaptionLayer && FM.addCaptionLayer(); } },
    { label: 'AI Scene', emoji: '✨', add: function () { FM.aiPanel && FM.aiPanel.show(); } },
  ];

  function card(item, cls) {
    var b = document.createElement('button');
    b.className = cls; b.type = 'button'; b.title = item.label;
    var ic = item.emoji ? '<span class="add-emoji">' + item.emoji + '</span>' : item.icon;
    b.innerHTML = '<span class="addmenu-ic">' + ic + '</span><span class="addmenu-lbl">' + item.label + '</span>';
    return b;
  }

  FM.addMenu = {
    // container: where to render. opts: { variant: 'panel' | 'sheet', onAfterAdd, onClose }
    render: function (container, opts) {
      opts = opts || {};
      var variant = opts.variant || 'panel';
      var after = function () { if (opts.onAfterAdd) opts.onAfterAdd(); };
      container.innerHTML = '';

      var root = document.createElement('div');
      root.className = 'addmenu addmenu--' + variant;

      var main = document.createElement('div'); main.className = 'addmenu-main';
      var tabsEl = document.createElement('div'); tabsEl.className = 'addmenu-tabs';
      var bodyEl = document.createElement('div'); bodyEl.className = 'addmenu-body';
      var active = TABS[0].key;

      function drawBody() {
        bodyEl.innerHTML = '';
        var tab = TABS.filter(function (t) { return t.key === active; })[0] || TABS[0];
        var grid = document.createElement('div'); grid.className = 'addmenu-grid';
        tab.options.forEach(function (o) {
          var c = card(o, 'addmenu-card');
          c.addEventListener('click', function () { o.add(); after(); });
          grid.appendChild(c);
        });
        bodyEl.appendChild(grid);
      }

      TABS.forEach(function (t) {
        var tb = document.createElement('button');
        tb.type = 'button'; tb.title = t.label;
        tb.className = 'addmenu-tab' + (t.key === active ? ' active' : '');
        tb.innerHTML = '<span class="addmenu-ic">' + t.icon + '</span><span class="addmenu-lbl">' + t.label + '</span>';
        tb.addEventListener('click', function () {
          active = t.key;
          var all = tabsEl.querySelectorAll('.addmenu-tab');
          for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
          tb.classList.add('active');
          drawBody();
        });
        tabsEl.appendChild(tb);
      });
      main.appendChild(tabsEl); main.appendChild(bodyEl); drawBody();

      var side = document.createElement('div'); side.className = 'addmenu-side';
      INSTANT.forEach(function (it) {
        var c = card(it, 'addmenu-card addmenu-quick');
        c.addEventListener('click', function () { it.add(); after(); });
        side.appendChild(c);
      });
      if (variant === 'sheet' && opts.onClose) {
        var x = document.createElement('button');
        x.className = 'addmenu-close'; x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.textContent = '✕';
        x.addEventListener('click', opts.onClose);
        side.appendChild(x);
      }

      root.appendChild(main); root.appendChild(side);
      container.appendChild(root);
    },
  };
})(window.FM);
