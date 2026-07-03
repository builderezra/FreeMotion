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

  // Icon rendered straight from the shape's own polygon data (FM.SHAPE_POLYS) — the menu preview
  // can never drift from what actually gets added.
  function icoPoly(kind) {
    var polys = (FM.SHAPE_POLYS && FM.SHAPE_POLYS[kind]) || [];
    var open = kind === 'spiral';
    var body = polys.map(function (pl) {
      var pts = pl.map(function (p) { return (3 + p[0] * 18).toFixed(1) + ',' + (3 + p[1] * 18).toFixed(1); }).join(' ');
      return open ? '<polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.4"/>'
                  : '<polygon points="' + pts + '" fill="currentColor" stroke="none"/>';
    }).join('');
    return '<svg viewBox="0 0 24 24">' + body + '</svg>';
  }
  // The extra AM shape library (pages 2–4 of AM's shape sheet).
  var LIB_SHAPES = [
    ['speech', 'Speech'], ['moon', 'Moon'], ['snowflake', 'Snowflake'], ['shield', 'Shield'], ['check', 'Check'],
    ['droplet', 'Droplet'], ['cloud', 'Cloud'], ['play', 'Play'], ['spiral', 'Spiral'], ['sparkle', 'Sparkle'],
    ['stamp', 'Stamp'], ['bolt', 'Bolt'], ['puzzle', 'Puzzle'], ['pushpin', 'Pushpin'],
    ['flag', 'Flag'], ['thumbsup', 'Thumbs up'], ['paperplane', 'Paper plane'], ['house', 'House'], ['laurel', 'Laurel'],
    ['bookmark', 'Bookmark'], ['pointhand', 'Pointing hand'], ['flame', 'Flame'], ['banner', 'Banner'], ['wreath', 'Wreath'],
    ['diamond', 'Diamond'], ['plane', 'Plane'], ['umbrella', 'Umbrella'], ['bomb', 'Bomb'],
    ['boat', 'Boat'], ['magnifier', 'Magnifier'], ['key', 'Key'], ['sun', 'Sun'], ['person', 'Person'],
    ['rocket', 'Rocket'], ['envelope', 'Envelope'], ['woman', 'Woman'], ['car', 'Car'],
  ];

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
    ].concat(LIB_SHAPES.map(function (s) { return { label: s[1], icon: icoPoly(s[0]), add: shp(s[0], { name: s[1] }) }; })) },
    { key: 'media', label: 'Media', icon: ico('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M4 18l5-5 4 3 3-2 4 4"/>'), options: [
      { label: 'Import…', icon: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'), add: fileImport },
      { label: 'Sample clip', icon: ico('<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 9.5h16M9 5v4.5M15 5v4.5"/>'), add: function () { FM.addSampleClip && FM.addSampleClip(); } },
      { label: 'AI Scene', emoji: '✨', add: function () { FM.aiPanel && FM.aiPanel.show(); } },
      { label: 'Captions', icon: ico('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 11h3M7 14.5h6M14 11h3"/>'), add: function () { FM.addCaptionLayer && FM.addCaptionLayer(); } },
    ] },
    { key: 'audio', label: 'Audio', icon: ico('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'), options: [
      { label: 'Import audio…', icon: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'), add: fileImport },
    ] },
    { key: 'object', label: 'Object / Element', icon: ico('<path d="M10 3l5.5 9H4.5z"/><circle cx="16.5" cy="15.5" r="4.5"/>'), options: function () {
      var base = [
        { label: 'Camera', icon: ico('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'), add: function () { FM.addCameraLayer && FM.addCameraLayer(); } },
        { label: 'Null', icon: ico('<rect x="5" y="5" width="14" height="14" rx="1" stroke-dasharray="3 2"/><path d="M9 12h6M12 9v6"/>'), add: function () { FM.addNullLayer && FM.addNullLayer(); } },
        { label: 'Adjustment', icon: ico('<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/>'), add: function () { FM.addAdjustmentLayer && FM.addAdjustmentLayer(); } },
      ];
      // the user's saved Elements (reusable layer selections) insert at the playhead
      (FM.elements ? FM.elements.list() : []).forEach(function (e) {
        base.push({ label: e.name, icon: ico('<path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.8 6.4 20l1.5-6.3L3 9.5 9.4 9z"/>'), elementId: e.id,
          add: function () { FM.elements.insert(e.id); } });
      });
      return base;
    } },
    { key: 'template', label: 'Template', icon: ico('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/>'), options: function () {
      var out = (FM.templates ? FM.templates.list() : []).map(function (t) {
        return { label: t.name, icon: ico('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/>'),
          add: function () { FM.templates.insertInto(t.id); if (FM.toast) FM.toast('Inserted \u201c' + t.name + '\u201d'); } };
      });
      if (!out.length) out.push({ label: 'No templates yet', icon: ico('<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 2"/>'), add: function () { if (FM.toast) FM.toast('Save one from the home screen: project card \u2192 \u22ef \u2192 Save as template'); } });
      return out;
    } },
  ];

  // QUICK-ADD rail — one tap spawns/starts immediately. The instant-spawn tools live together on one
  // row (AM): Text · Freehand Drawing · Vector Drawing. On a phone this rail is always visible, so
  // Freehand Drawing is easy to find (it used to be a top tab that scrolled off-screen).
  var INSTANT = [
    { label: 'Text', icon: ico('<path d="M6 5h12M12 5v14M9 19h6"/>'), add: function () { FM.addTextLayer && FM.addTextLayer(); } },
    { label: 'Freehand Drawing', icon: ico('<path d="M3 17.5s3-8 6-8 2 5 5 5 4-9 7-9"/><path d="M14 20l3-1 1-3-8 0z"/>'), add: function () { FM.startDraw && FM.startDraw('freehand'); } },
    { label: 'Vector Drawing', icon: ico('<path d="M5 19l4-1 9-9-3-3-9 9z"/><circle cx="5" cy="19" r="1.6"/><circle cx="18" cy="6" r="1.6"/>'), add: function () { FM.startDraw && FM.startDraw('vector'); } },
  ];

  function card(item, cls, iconOnly) {
    var b = document.createElement('button');
    b.className = cls; b.type = 'button'; b.title = item.label;
    var ic = document.createElement('span'); ic.className = 'addmenu-ic';
    ic.innerHTML = item.emoji ? '<span class="add-emoji">' + item.emoji + '</span>' : item.icon;   // trusted literals only (ico()/emoji)
    b.appendChild(ic);
    if (!iconOnly) {   // shape cards are icon-only (AM) — the name lives in the tooltip
      var lb = document.createElement('span'); lb.className = 'addmenu-lbl';
      lb.textContent = item.label;   // element/template names are USER input — textContent, never innerHTML (#r3)
      b.appendChild(lb);
    }
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
        var opts = typeof tab.options === 'function' ? tab.options() : (tab.options || []);   // Elements/Templates lists are live
        var iconOnly = tab.key === 'shape';   // AM: shape grid is icon-only (name = tooltip) \u2192 bigger art, denser grid
        function makeCard(o) {
          var c = card(o, 'addmenu-card' + (iconOnly ? ' addmenu-card--ico' : ''), iconOnly);
          c.addEventListener('click', function () { o.add(); after(); });
          if (o.elementId) c.addEventListener('contextmenu', function (ev) {   // desktop: right-click removes a saved element
            ev.preventDefault();
            if (confirm('Delete element \u201c' + o.label + '\u201d?')) { FM.elements.remove(o.elementId); drawBody(); }
          });
          return c;
        }
        // AM: the grid PAGES HORIZONTALLY (swipe sideways) with page dots \u2014 not a vertical scroll.
        var perPage = iconOnly ? (variant === 'sheet' ? 15 : 18) : (variant === 'sheet' ? 9 : 12);   // shapes 5\u00d73 / 6\u00d73; others 3\u00d73 / 4\u00d73
        var pager = document.createElement('div'); pager.className = 'addmenu-pager';
        for (var i = 0; i < opts.length; i += perPage) {
          var page = document.createElement('div'); page.className = 'addmenu-page';
          var grid = document.createElement('div'); grid.className = 'addmenu-grid' + (iconOnly ? ' addmenu-grid--ico' : '');
          opts.slice(i, i + perPage).forEach(function (o) { grid.appendChild(makeCard(o)); });
          page.appendChild(grid); pager.appendChild(page);
        }
        bodyEl.appendChild(pager);
        var pageCount = Math.max(1, Math.ceil(opts.length / perPage));
        if (pageCount > 1) {
          var dots = document.createElement('div'); dots.className = 'addmenu-dots';
          for (var d = 0; d < pageCount; d++) { var dot = document.createElement('span'); dot.className = 'addmenu-dot' + (d === 0 ? ' on' : ''); dots.appendChild(dot); }
          bodyEl.appendChild(dots);
          pager.addEventListener('scroll', function () {
            var idx = Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth));
            var ds = dots.querySelectorAll('.addmenu-dot');
            for (var k = 0; k < ds.length; k++) ds[k].classList.toggle('on', k === idx);
          });
        }
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
