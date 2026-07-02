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

  function shp(kind, opts) { return function () { FM.addShapeLayer && FM.addShapeLayer(kind, opts); }; }

  // TOP-ROW TABS — each opens a sub-section of choices (you pick, then it adds).
  var TABS = [
    { key: 'shape', label: 'Shape', icon: ico('<rect x="4" y="4" width="9" height="9" rx="1.5"/><circle cx="16" cy="16" r="5"/>'), options: [
      { label: 'Rectangle', icon: ico('<rect x="4" y="6" width="16" height="12" rx="1.5"/>'), add: shp('rect') },
      { label: 'Ellipse', icon: ico('<ellipse cx="12" cy="12" rx="9" ry="7"/>'), add: shp('ellipse') },
      { label: 'Triangle', icon: ico('<path d="M12 4l8 16H4z"/>'), add: shp('triangle') },
      { label: 'Star', icon: ico('<path d="M12 3l2.5 6 6.5.5-5 4.2 1.6 6.3L12 17l-5.6 3 1.6-6.3-5-4.2 6.5-.5z"/>'), add: shp('star') },
      { label: 'Heart', icon: ico('<path d="M12 20s-7.5-4.9-9-9.2C1.9 7.6 4 5 6.7 5 8.9 5 10.6 6.4 12 8c1.4-1.6 3.1-3 5.3-3 2.7 0 4.8 2.6 3.7 5.8C19.5 15.1 12 20 12 20z"/>'), add: shp('heart') },
      { label: 'Hexagon', icon: ico('<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/>'), add: shp('polygon', { name: 'Hexagon', extra: { sides: 6 } }) },
      { label: 'Pentagon', icon: ico('<path d="M12 3l8.5 6.2-3.2 10H6.7L3.5 9.2z"/>'), add: shp('polygon', { name: 'Pentagon', extra: { sides: 5 } }) },
      { label: 'Diamond', icon: ico('<path d="M12 3l8 9-8 9-8-9z"/>'), add: shp('polygon', { name: 'Diamond', extra: { sides: 4 } }) },
      { label: 'Plus', icon: ico('<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'), add: shp('plus') },
      { label: 'Pie', icon: ico('<path d="M12 12V3a9 9 0 1 1-9 9 9 9 0 0 1 2.6-6.4z"/>'), add: shp('pie') },
      { label: 'Semicircle', icon: ico('<path d="M3 16a9 9 0 0 1 18 0z"/>'), add: shp('semicircle') },
      { label: 'Arc', icon: ico('<path d="M18.5 17.5A8.5 8.5 0 1 0 5 16"/>'), add: shp('arc') },
      { label: 'Ring', icon: ico('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'), add: shp('ring') },
      { label: 'Arrow', icon: ico('<path d="M3 10h9V6l8 6-8 6v-4H3z"/>'), add: shp('arrow') },
      { label: 'Chevron', icon: ico('<path d="M4 4h7l8 8-8 8H4l7-8z"/>'), add: shp('chevron') },
      { label: 'Trapezoid', icon: ico('<path d="M7.5 5h9L21 19H3z"/>'), add: shp('trapezoid') },
      { label: 'Parallelogram', icon: ico('<path d="M8 5h13l-5 14H3z"/>'), add: shp('parallelogram') },
      { label: 'Line', icon: ico('<path d="M4 12h16"/>'), add: shp('line') },
      { label: 'Polygon', icon: ico('<path d="M12 3l8.5 6.2-3.2 10H6.7L3.5 9.2z"/><circle cx="12" cy="12" r="1.6"/>'), add: shp('polygon') },
    ] },
    { key: 'media', label: 'Media', icon: ico('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M4 18l5-5 4 3 3-2 4 4"/>'), options: [
      { label: 'Import…', icon: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'), add: fileImport },
      { label: 'Sample clip', icon: ico('<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 9.5h16M9 5v4.5M15 5v4.5"/>'), add: function () { FM.addSampleClip && FM.addSampleClip(); } },
    ] },
    { key: 'audio', label: 'Audio', icon: ico('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'), options: [
      { label: 'Import audio…', icon: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'), add: fileImport },
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
