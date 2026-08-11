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
  // The one file input is shared, so narrow `accept` to what this entry is actually asking for and put
  // it back afterwards. Two reasons this matters on a phone: a picker limited to audio doesn't bury
  // songs among the camera roll, and — the actual bug Ezra hit — iOS greys audio out in Files when the
  // accept list also carries image/* and video/*. Explicit EXTENSIONS go in beside the wildcard because
  // mobile pickers match those far more reliably than they map audio/* onto a UTI (.m4a in particular).
  var ACCEPT_ALL = 'video/*,image/*,audio/*';
  var ACCEPT_AUDIO = 'audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.oga,.opus,.aif,.aiff,.caf,.wma,.amr';
  function pickFiles(accept) {
    var fi = document.getElementById('file-input');
    if (!fi) return;
    fi.setAttribute('accept', accept || ACCEPT_ALL);
    fi.click();
    // restore on the next tick — the click has already opened the picker with the value above, and
    // leaving it narrowed would silently break the next Import media
    setTimeout(function () { fi.setAttribute('accept', ACCEPT_ALL); }, 0);
  }
  function fileImport() { pickFiles(ACCEPT_ALL); }
  function audioImport() { pickFiles(ACCEPT_AUDIO); }

  function shp(kind, opts) { return function () { FM.addShapeLayer && FM.addShapeLayer(kind, opts); }; }

  // Icon rendered straight from the shape's own polygon data (FM.SHAPE_POLYS) — the menu preview
  // can never drift from what actually gets added.
  // `outline` draws it stroked instead of filled, to match the hand-drawn icons in the first block
  // of the Shape tab — a filled icon sitting next to stroked ones reads as a mistake.
  function icoPoly(kind, outline) {
    var polys = (FM.SHAPE_POLYS && FM.SHAPE_POLYS[kind]) || [];
    var open = kind === 'spiral';
    var body = polys.map(function (pl) {
      var pts = pl.map(function (p) { return (3 + p[0] * 18).toFixed(1) + ',' + (3 + p[1] * 18).toFixed(1); }).join(' ');
      return (open || outline) ? '<' + (open ? 'polyline' : 'polygon') + ' points="' + pts + '" fill="none" stroke="currentColor" stroke-width="' + (outline ? 1.8 : 1.4) + '" stroke-linejoin="round"/>'
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
    ['cross', 'Cross'], ['pin', 'Map pin'], ['lock', 'Lock'],   // (squircle is promoted to the top pair, next to Square)
    ['gear', 'Gear'], ['crown', 'Crown'], ['eye', 'Eye'], ['note', 'Music note'],
    ['starburst', 'Starburst'], ['clock', 'Clock'],
  ];

  // Previously-imported files as one-tap tiles, newest first. `wantAudio` splits the library in two:
  // the Media tab shows clips and photos, the Audio tab shows songs. One tap re-adds — no picker, no
  // trip through the Photos app. (A browser can't read the camera roll; this is the closest thing
  // that actually works, and after the first import it behaves the same.)
  function libEntries(wantAudio) {
    var lib = FM.mediaLib;
    if (!lib) return [];
    return lib.list().filter(function (m) { return !!lib.isAudio(m) === !!wantAudio; }).map(function (m) {
      return {
        label: m.name, mid: m.mid, kind: wantAudio ? 'audio' : m.kind, dur: m.dur,
        icon: ico(wantAudio ? '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'
          : m.kind === 'video' ? '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5l5 2.5-5 2.5z"/>'
          : '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M4 18l5-5 4 3 3-2 4 4"/>'),
        add: function () { FM.mediaLib.use(m.mid); },
      };
    });
  }

  /* The four instant-spawn tools. These no longer render as their own rail — they are the head of the
   * Elements tab's list (see above). Kept as a named array because the Shift+1..4 shortcuts index it
   * and FM.addmenu.instant() is the public entry point for them. */
  var INSTANT = [
    { label: 'Text', icon: ico('<path d="M6 5h12M12 5v14M9 19h6"/>'), add: function () { FM.addTextLayer && FM.addTextLayer(); } },
    { label: 'Captions', icon: ico('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 11h3M7 14.5h6M14 11h3"/>'), add: function () { FM.addCaptionLayer && FM.addCaptionLayer(); } },
    { label: 'Freehand Drawing', icon: ico('<path d="M3 17.5s3-8 6-8 2 5 5 5 4-9 7-9"/><path d="M14 20l3-1 1-3-8 0z"/>'), add: function () { FM.startDraw && FM.startDraw('freehand'); } },
    { label: 'Vector Drawing', icon: ico('<path d="M5 19l4-1 9-9-3-3-9 9z"/><circle cx="5" cy="19" r="1.6"/><circle cx="18" cy="6" r="1.6"/>'), add: function () { FM.startDraw && FM.startDraw('vector'); } },
  ];
  // TOP-ROW TABS — each opens a sub-section of choices (you pick, then it adds).
  var TABS = [
    /* ELEMENTS is the FIRST tab now (Ezra: "move the elements section to the far left so shapes isnt
     * the first thing that gets opened anymore") and it absorbed the old top row. Text, Captions,
     * Freehand Drawing and Vector Drawing used to sit in a separate always-visible rail above the
     * tabs; they are MOVED here, not copied — the rail is gone, so there is exactly one place to find
     * each of them and the panel got a whole row of its height back.
     * They lead the list because they are the things you reach for most, and because with Elements
     * opening by default they are the first thing on screen when the Add menu appears — one tap, same
     * as the rail gave, without the rail. */
    /* The icon is a CUBE — a building block (QUEUE 42). It was a triangle + a circle, which is the
     * same sentence the Shape tab's square + circle says, one tab to the right: at 22px the two were
     * nearly the same mark and neither told you what it opened. This tab holds Text, Captions,
     * Freehand / Vector Drawing, Camera, Null, Adjustment, Empty group and your saved elements — the
     * common thread is "a piece you assemble a scene from", including the rig pieces that render
     * nothing, and a block says that without promising a picture. Chosen over a puzzle piece (its
     * notches turn to mud at 22px — rendered and looked at, at 1x), a layer stack (that word already
     * means the Layers panel), a 2x2-plus grid (already the Custom elements card INSIDE this tab) and
     * a dashed frame (already the Null / Empty group language). Three straight strokes meeting in the
     * middle survive 1x rendering, and no neighbour in the row shares the silhouette. */
    { key: 'object', label: 'Elements', icon: ico('<path d="M12 2.6l8.2 4.7v9.4L12 21.4l-8.2-4.7V7.3z"/><path d="M3.8 7.3L12 12l8.2-4.7M12 12v9.4"/>'), options: function () {
      var base = INSTANT.concat([
        { label: 'Camera', icon: ico('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'), add: function () { FM.addCameraLayer && FM.addCameraLayer(); } },
        { label: 'Null', icon: ico('<rect x="5" y="5" width="14" height="14" rx="1" stroke-dasharray="3 2"/><path d="M9 12h6M12 9v6"/>'), add: function () { FM.addNullLayer && FM.addNullLayer(); } },
        { label: 'Adjustment', icon: ico('<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/>'), add: function () { FM.addAdjustmentLayer && FM.addAdjustmentLayer(); } },
        // An EMPTY group: grouping used to require selecting two layers first, so there was no way to
        // make the container and then fill it. Drag layers onto it, or parent them to it.
        { label: 'Empty group', icon: ico('<rect x="3" y="6" width="18" height="14" rx="2" stroke-dasharray="3 2"/><path d="M8 13h8M12 9v8"/>'), add: function () { FM.addEmptyGroup && FM.addEmptyGroup(); } },
      ]);
      // "Save selection as element…" is gone from here — it acts on a SELECTION, and this menu only
      // ever appears when nothing is selected, so the one state it needed was the one state it could
      // never be in. It still lives on the layer ⋯ menu, where a selection exists.
      //
      // The user's saved elements USED to be pushed onto this same list, so three structural layer
      // types and every element you had ever saved sat loose in one flat grid (Ezra: "make sure all
      // the elements are grouped together and not siting loose in the same menu that holds camera and
      // all that"). They live behind one button, which opens a real browser with its own search.
      var saved = (FM.elements ? FM.elements.list() : []) || [];
      base.push({
        label: saved.length ? 'Custom elements (' + saved.length + ')' : 'Custom elements',
        icon: ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/>'),
        add: function () {
          if (FM.elementsBrowser) FM.elementsBrowser.open();
          else if (FM.toast) FM.toast('Elements browser unavailable');
        },
      });
      return base;
    } },
    { key: 'shape', label: 'Shape', icon: ico('<rect x="4" y="4" width="9" height="9" rx="1.5"/><circle cx="16" cy="16" r="5"/>'), options: [
      // The pair Ezra asked for, first and side by side: the same square, sharp corners vs Apple's.
      // Both spawn a TRUE square (aspect forced 1:1) so the only difference you see is the corner.
      { label: 'Square', icon: ico('<rect x="5" y="5" width="14" height="14" rx="1.5"/>'), add: shp('rect', { name: 'Square', aspect: [1, 1] }) },
      { label: 'Squircle', icon: icoPoly('squircle', true), add: shp('squircle', { name: 'Squircle', aspect: [1, 1] }) },
      { label: 'Rectangle', icon: ico('<rect x="4" y="6" width="16" height="12" rx="1.5"/>'), add: shp('rect') },
      // A CIRCLE, because that is what tapping it gives you — ellipse has no SHAPE_ASPECT entry, so it
      // spawns 1:1. The oval icon was promising a shape the button never made (Ezra).
      { label: 'Ellipse', icon: ico('<circle cx="12" cy="12" r="8"/>'), add: shp('ellipse') },
      { label: 'Triangle', icon: ico('<path d="M12 4l8 16H4z"/>'), add: shp('triangle') },
      { label: 'Star', icon: ico('<path d="M12 3l2.5 6 6.5.5-5 4.2 1.6 6.3L12 17l-5.6 3 1.6-6.3-5-4.2 6.5-.5z"/>'), add: shp('star') },
      // GENERATED from the shipped geometry, not redrawn: FM.traceShapePath run into a recording
      // proxy over a 19x19 box in the 24x24 viewBox (IoU 0.9975 against what the app renders).
      // The old path claimed to be "traced from the same eight anchors" and had stopped being
      // true — it was squatter (aspect 1.077 vs 1.0), 4% lower in the waist and had a deeper V.
      // Regenerate this the same way if S.heart moves again.
      { label: 'Heart', icon: ico('<path d="M12 21.5C12 21.5 5.45 15.61 5.45 15.04C5.45 14.47 2.5 11.56 2.5 8.14C2.5 4.72 5.01 2.5 8.14 2.5C11.28 2.5 12 5.92 12 5.92C12 5.92 12.72 2.5 15.86 2.5C18.99 2.5 21.5 4.72 21.5 8.14C21.5 11.56 18.56 14.47 18.56 15.04C18.56 15.61 12 21.5 12 21.5Z"/>'), add: shp('heart') },
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
    { key: 'media', label: 'Media', icon: ico('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M4 18l5-5 4 3 3-2 4 4"/>'), options: function () {
      var base = [
        { label: 'Import…', icon: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'), add: fileImport },
        { label: 'Sample clip', icon: ico('<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 9.5h16M9 5v4.5M15 5v4.5"/>'), add: function () { FM.addSampleClip && FM.addSampleClip(); } },
        { label: 'AI Scene', emoji: '✨', add: function () { FM.aiPanel && FM.aiPanel.show(); } },
      ];
      // …then everything you've imported before, newest first. One tap re-adds it — no picker, no
      // trip through the Photos app. (A browser can't read the camera roll; this is the closest
      // thing that actually works, and after the first import it behaves the same.)
      libEntries(false).forEach(function (o) { base.push(o); });   // songs are filed under Audio, not here
      return base;
    } },
    { key: 'audio', label: 'Audio', icon: ico('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'), options: function () {
      // Songs you've already imported live HERE, newest first, one tap to drop another copy on the
      // timeline — exactly how the Media tab has always treated clips and photos (Ezra: "when you add
      // a song like adding media it stays in the audios section"). They used to land in Media, mixed
      // in among the video thumbnails with no artwork to tell them apart.
      return [{ label: 'Import audio…', icon: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'), add: audioImport }]
        .concat(libEntries(true));
    } },
    // "Elements" (was "Object / Element" — Ezra). Elements are now a first-class thing with their own
    // section on Home, so the tab is named after them rather than after the odds and ends beside them.
    { key: 'template', label: 'Template', icon: ico('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/>'), options: function () {
      var out = (FM.templates ? FM.templates.list() : []).map(function (t) {
        return { label: t.name, icon: ico('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/>'),
          add: async function () { const ok = await FM.templates.insertInto(t.id); if (FM.toast) FM.toast(ok === false ? 'Template data missing \u2014 re-save it from a project' : 'Inserted \u201c' + t.name + '\u201d'); } };   // await the result \u2014 insertInto returns false when the IDB pack was evicted; the toast used to lie
      });
      if (!out.length) out.push({ label: 'No templates yet', icon: ico('<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 2"/>'), add: function () { if (FM.toast) FM.toast('Save one from the home screen: project card \u2192 \u22ef \u2192 Save as template'); } });
      return out;
    } },
  ];

  var _startTab = null;   // set by openTab() so a keyboard shortcut can jump straight to a tab

  /* ---- QUEUE 51: the menu reopens on the tab you left it on --------------------------------------
   * Ezra: "whatever i had open last in the add section should re open, like if i add a shape then
   * exit out of editing the shape it should still have the shape section open."
   * GLOBAL and PERSISTED to localStorage under 'fm.addmenu', the same shape as the Studio layout
   * toggle and the export settings: this is a preference about the menu, not a property of one
   * project, and "what I had open last" plainly outlives a reload.
   * If the remembered key no longer names a tab — one renamed or removed in a later version — we
   * fall back to TABS[0] rather than drawing an empty body.
   *
   * THE PAGE INSIDE A TAB IS DELIBERATELY *NOT* PERSISTED, and this is narrower than the version
   * that shipped first. That one wrote the pager index to the same localStorage key, so a reload
   * came back on Shape page 3 of 5 (scrollLeft 728) with nothing on screen to explain why the top
   * of the shape list was missing. Ezra asked for the last SECTION to reopen; which page he had
   * scrolled to inside it is not a preference, it is where his hand happened to be. So the page
   * lives in this closure, which dies with the document: switch tab and come back, or add a layer
   * and let the inspector re-render, and you are on the page you left — reload, and you are on
   * page 1 of the tab you left.
   * The old {tab, page} value is still read without complaint (memGet only ever asks for .tab), and
   * the dead .page map is dropped the next time the tab is written rather than being left to rot.
   * NOT remembered: the Custom elements full-screen browser. That is somewhere you GO, not a tab;
   * reopening it unasked would throw a modal over the app every time you deselect a layer. Only the
   * tab behind it is stored, because that is all that is ever written here. */
  var MEM_KEY = 'fm.addmenu';
  function memGet() {
    try { var o = JSON.parse(localStorage.getItem(MEM_KEY)); return (o && typeof o === 'object') ? o : {}; }
    catch (e) { return {}; }
  }
  function memSet(o) { try { localStorage.setItem(MEM_KEY, JSON.stringify(o)); } catch (e) {} }
  function knownTab(k) { for (var i = 0; i < TABS.length; i++) if (TABS[i].key === k) return k; return null; }
  function rememberTab(k) {
    var m = memGet();
    var stale = ('page' in m);   // written by v5.69; harmless to read, so just sweep it up on the way past
    if (m.tab === k && !stale) return;
    m.tab = k; delete m.page; memSet(m);
  }
  var _page = {};   // tab key -> pager index. THIS PAGE-LOAD ONLY — see the QUEUE 51 note above.
  function rememberPage(k, i) { _page[k] = i; }
  function rememberedPage(k) { var i = +_page[k]; return (isFinite(i) && i > 0) ? i : 0; }

  /* ---- QUEUE 50: on PC the tiles SIZE THEMSELVES to the panel ------------------------------------
   * Ezra, with a screenshot: "the add section on pc on the left needs to actually fill up the screen
   * space it has properly … rn it has lots of space and i still need to scroll on it to see them all
   * which is weird. Make the icons get smaller or bigger depending on how zoomed in you have that
   * area." Both halves of that came from one cause: the tile area's height was a CONSTANT (Studio
   * capped the body at 128px; classic let it shrink-wrap its content) while the panel's height comes
   * from #app's grid and is anything from 269px to 460px+. A constant inside a variable box is dead
   * space and a scrollbar at the same time.
   * So the plan below derives columns, row height and icon size from the panel's REAL box, per tab —
   * Elements has 9-ish entries and Shape has 70, and they want different grids out of the same space.
   *
   * The circular-height trap: the panel's clientHeight is the one number in this stack that is NOT
   * defined by its own children (it comes from the grid), so every derived size hangs off that and
   * nothing asks a parent to size itself from the children it is sizing.
   * THE PHONE'S LAYOUT IS UNTOUCHED — and that claim is now stated as narrowly as it is true. The
   * fit only ever runs for variant 'panel' behind the same (min-width: 701px) gate the Studio CSS
   * uses, and every style it needs is scoped to `.addmenu--fit`, a class the sheet never gets.
   * Measured, add sheet at 390x844 with a touch UA, this tree vs pristine HEAD: 95 nodes both, 9
   * cards, 1 page, and every tab button and icon BOX rect identical to the pixel.
   * What is NOT untouched, and what an earlier version of this comment wrongly implied was: the
   * ELEMENTS TAB ICON (QUEUE 42) lives in the shared TABS table with no variant gate, so the new
   * cube draws on the phone too — 2 rect diffs in that whole sheet, both the mark's own path bbox
   * inside its unchanged 22px box. That is deliberate. Ezra's complaint ("its a triangle and
   * circle") is equally true on a phone, and forking one icon per surface would mean the same tab
   * says two different things depending on the device. Layout is PC-only; the icon is everywhere. */
  var FIT_GAP = 8;        // must match the grid `gap` the fit CSS sets
  /* The pager strip's own height, which the fit hands back before it plans the grid. The phone
   * sheet's row is 15 (a 6px dot on a 9px margin, decoration only); the PC panel's carries the real
   * ‹ › buttons, so it is a 24px row on a 2px margin — 26, and this constant is PC-only because
   * only the fit reads it. Those 11 extra pixels are the whole price of the pager being usable
   * with a mouse, and they are taken out of the grid, so keep the CSS and this number in step. */
  var FIT_DOTS = 26;
  var FS_MIN = 9.6;       // the label font at the smallest tile; the height floors are derived from it
  var FIT_CFG = {
    /* The minimums are not taste — each is the geometric floor of the tile it describes, and this
     * got written twice before it was right, in the same way both times: a floor was set from what
     * looked comfortable, and it quietly FORBADE grids the app had been shipping for versions. A
     * floor that outlaws the shipped layout is not a floor, it is a regression with a justification.
     * Measured on pristine HEAD at 1024x640 classic (panel 285x358, tile box 257x161):
     *   labelled tabs drew 5 columns of 45.0 x 62.5 tiles, 19px icons, ONE page, nothing clipped;
     *   the Shape tab drew 6 columns of 36.2 x 60 tiles holding 34px icons — i.e. 1.1px of side
     *   padding. HEAD is DENSER than anything below; none of these numbers invent a new tightness.
     *
     * What a floor is allowed to protect is the CONTROL, not the decoration around it. So padding
     * is now a RANGE (padV/padH preferred, padVMin/padHMin hard) and every floor is derived from
     * the hard end of it:
     *   ico.minW/minH = icoMin 30 + 2*2 = 34. The previous 42 was derived from the PREFERRED
     *        padding (30 + 6*2) and its stated justification — "w >= minW guarantees w - padH*2 >=
     *        30" — is true only if padH can never move. Measured, 42 makes 6 columns arithmetically
     *        unreachable in a 257px box (floor(265/50) = 5) at the very sizes HEAD ships 36.2px
     *        tiles, and that cost real page turns: classic 800x600 Shape 6 pages -> 7, 1280x720 3 -> 4.
     *   lbl.minW = 44 stays a genuine constant, and is the one floor NOT derived from the icon:
     *        a labelled tile has to fit two lines of text, and the label runs out of room long
     *        before the 18px icon does. 44 sits a hair under HEAD's proven 45.0.
     *   lbl.minH = 40 is only a backstop; the real floor is derived per-plan from the label band
     *        (2*2 + 18 + 5 + lblH, so 53 at the 9.6px font a 45px tile draws). The old 58 was 5px
     *        too tall to allow the SECOND ROW that HEAD draws at classic 800x600, which is why
     *        Elements — nine items — turned one page into two and left 59px of panel empty.
     *   aspect caps how letterbox-tall a sparse tab may grow its tiles. 1.25 for icon-only art;
     *        1.45 for labelled, because HEAD ships 62.5/45 = 1.39 and a cap under what ships is
     *        the same mistake again — at 1.25 the 1024x640 Elements tile shrank 63 -> 56 for
     *        nothing.
     *   maxW / maxH 118 are LEFT WHERE THEY WERE, and that is a measured decision rather than an
     *        oversight — the sparse tabs (Media / Audio / Template, one to three entries) do leave
     *        up to 124px below their row at the widest PC panels. Raising the cap does not spend
     *        that space on anything you can see: at a 118px tile the icon is ALREADY at icoMax 46
     *        (min(46, 118-8, 118-14-31) = 46), so every extra pixel of tile becomes padding around
     *        an icon that has stopped growing. A 3-entry tab cannot fill a 380x313 panel with tiles
     *        without drawing absurd ones; what it can do is stop dumping the slack in one block at
     *        the bottom, which is what `align-content: center` in the fit CSS now does. */
    /* icoMin IS THE SHIPPED ICON, EXACTLY. 19px for a labelled card and 34px for a shape tile are
     * not chosen numbers — they are what styles.css draws in the un-measured layout
     * (`.addmenu--panel:not(.addmenu--fit) … .addmenu-ic svg { width: 19px }` and
     * `.addmenu-card--ico .addmenu-ic svg { width: 34px }`), so a panel the fit has taken over can
     * never hand back smaller art than the same panel without it. The floors that sit under them —
     * minW / minH and padHMin / padVMin — are then arithmetic, not taste: a tile has to be at least
     * icoMin + twice the hard padding on each axis, or the icon it is supposed to protect gets
     * clipped by its own card. The PREFERRED padding (padV / padH) is unchanged; it is spent first
     * and only compressed when the tile is tight, and the label band then takes whatever room is
     * left.
     * ico's HARD padding is 0 on both axes, and that is the number that looks wrong until you price
     * it. Every pixel of hard padding raises the smallest legal shape tile, and a 2px floor on each
     * axis is a whole ROW or COLUMN in a tight box. Measured, at the real panel boxes: padHMin 1
     * (tile floor 36) costs the tenth column at Studio 2560x1440 and turns "all 67 shapes on one
     * page" into two, and the ninth column at Studio 1440x900, 4 pages into 5; padVMin 2 (tile floor
     * 38) turns Studio 1280x720 from two rows of 43.5px tiles, 5 pages, into one row of 79px ones,
     * 10 pages. With both at 0 the 34px floor is FREE: identical page counts to the 30px floor it
     * replaces at all seven measured boxes (31) and over a 3,780-box sweep (11,767), with 4px more
     * art everywhere it used to bottom out. At the floor the art meets the card edge, which is what
     * HEAD already does horizontally — its densest tile is 36.2px around 34px of art. */
    // labelled cards (Elements / Media / Audio / Template)
    lbl: { minW: 44, maxW: 118, minH: 40, maxH: 118, padV: 7, padH: 4, padVMin: 2, padHMin: 2, aspect: 1.45, icoGap: 5, icoMin: 19, icoMax: 46, lines: 2 },
    // icon-only cards (Shape) — the name lives in the tooltip, so all the height goes to the art
    ico: { minW: 34, maxW: 110, minH: 34, maxH: 110, padV: 8, padH: 6, padVMin: 0, padHMin: 0, aspect: 1.25, icoGap: 0, icoMin: 34, icoMax: 58, lines: 0 },
  };
  /* The label's RESERVED band, in px, and the one number that makes the fit monotonic.
   * It is a CONSTANT per card kind — the gap plus two lines at the smallest font — not a function
   * of the tile width. It used to be the latter, and that alone accounted for every remaining
   * icon inversion in the sweep: a 1px wider panel pushed the font 10.0 -> 10.1, which pushed the
   * two-line band 26 -> 27, which took a pixel off an icon whose tile had not grown (its height was
   * already at the aspect cap). Measured, classic + studio, 1px steps across the whole real panel
   * range: 15 icon inversions with the band derived from the font, 0 with it fixed here.
   * The font still scales with the tile — it is just chosen AFTER the icon, out of the slack the
   * icon left behind (see fitArt), so it can never take room the icon was already using. */
  Object.keys(FIT_CFG).forEach(function (k) {
    var c = FIT_CFG[k];
    c.band = c.lines ? c.icoGap + Math.ceil(FS_MIN * 1.2 * c.lines) + 2 : 0;   // lbl 31, ico 0
  });
  /* Size the art inside one tile of w x h, and say what padding and label band are left over.
   * The rule is the whole point of the height floors above: PADDING IS DECORATION, THE ICON IS THE
   * CONTROL. So the icon is first sized inside the PREFERRED padding, and only if that would push it
   * under icoMin does the padding compress (never past padVMin/padHMin) to protect the icon. At a
   * roomy panel nothing compresses and the tiles are exactly what they were; at a cramped one the
   * gutter gives way instead of the artwork — which is what lets a second row exist at all in a 90px
   * box, where the old fixed 8px padding made the choice "one row, or an icon below its own floor".
   *
   * ORDER MATTERS, and it is the reverse of what it was. The icon is measured against cfg.band, a
   * CONSTANT; the FONT is then chosen out of whatever the icon did not take. Sizing the font first
   * and the icon from the remainder is what made a wider panel able to hand back a SMALLER icon.
   * ico(w, h) is now non-decreasing in both w and h — both terms of the min() grow, cfg.band never
   * moves — and that is the property the whole monotonicity proof rests on. */
  function fitArt(cfg, w, h) {
    var availH = h - cfg.band;
    var ico = Math.min(cfg.icoMax, availH - cfg.padV * 2, w - cfg.padH * 2);
    var padV = cfg.padV, padH = cfg.padH;
    if (ico < cfg.icoMin) {   // preferred padding starves the art → spend the padding, not the icon
      ico = Math.min(cfg.icoMax, cfg.icoMin, availH - cfg.padVMin * 2, w - cfg.padHMin * 2);
      padV = cfg.padVMin; padH = cfg.padHMin;
    }
    ico = Math.max(0, ico);
    padV = Math.max(cfg.padVMin, Math.min(padV, (availH - ico) / 2));
    padH = Math.max(cfg.padHMin, Math.min(padH, (w - ico) / 2));
    // whatever the icon and its padding did not use is the label's; cfg.band is its guaranteed floor
    var slack = cfg.lines ? Math.max(cfg.band - cfg.icoGap, h - padV * 2 - ico - cfg.icoGap) : 0;
    var fs = 0, lblH = 0;
    if (cfg.lines) {
      var t = Math.max(0, Math.min(1, (w - cfg.minW) / Math.max(1, cfg.maxW - cfg.minW)));
      fs = Math.round((FS_MIN + t * 2.4) * 10) / 10;                       // scale the text with the tile…
      fs = Math.max(FS_MIN, Math.min(fs, (slack - 2) / (1.2 * cfg.lines)));  // …but never past its own band
      fs = Math.round(fs * 10) / 10;
      lblH = Math.max(Math.ceil(fs * 1.2 * cfg.lines) + 2, slack);
    }
    return { ico: ico, padV: padV, padH: padH, fs: fs, lblH: lblH };
  }
  /* Pick the column count / row count / row height / icon size that uses `availW x availH` best for
   * `count` items. Every (columns x rows) pair is costed, and the ranking answers Ezra's sentence in
   * the order he said it — "so they all fit … and I don't have to scroll to see them all", then
   * "make the icons get smaller or bigger depending on how zoomed in you have that area":
   *   1. FEWEST PAGES wins (showing everything is simply "one page", so this subsumes it);
   *   2. then the BIGGEST ICON — the control Ezra named, and the thing that has to track the panel;
   *   3. then the biggest card, so a tie on the icon still spends the leftover on the tile.
   *
   * THIS IS WHY IT IS MONOTONIC, which the shipped version was not. For a fixed (c, rows):
   *   · w and h are non-decreasing in availW / availH (both are clamped maxima, never rejections),
   *   · so ico(w, h) is non-decreasing (see fitArt), and so is w*h;
   *   · pages = ceil(count / (c*rows)) does not depend on the box at all.
   * And the candidate SET only ever grows as the box grows: hMin is a constant now, a column whose
   * share exceeds maxW is CLAMPED to maxW instead of being struck out, and cMax/rowsMax are floors
   * of the box. A maximum, taken over a growing set of individually non-decreasing values, is
   * non-decreasing — so more room can no longer buy a smaller icon.
   * Two things in the old loop broke each half of that:
   *   · `cMin = ceil((availW+g)/(maxW+g))` DELETED the wide-tile candidates as the panel grew. A
   *     3-entry tab went from 3 columns of 117.7px to 4 columns of 86.8px across a 2px panel step
   *     (measured, classic, panel 397 -> 399), because 3 columns had become "too wide to be legal".
   *   · rows was DERIVED (min(rowsNeed, rowsMax)) rather than costed, so the only 6-column layout
   *     ever considered at a given height was the densest one. Shape at box 257x202 was drawn 6c4r
   *     (44.4px tiles) and at 257x206 — a 4px BIGGER box — 5c5r (34.8px tiles), on the same 3 pages,
   *     because 6c4r was not a candidate there at all. */
  function planGrid(count, availW, availH, cfg) {
    var g = FIT_GAP, best = null;
    // the floor is the HARD padding and the CONSTANT band, so it does not move with the tile width
    var hMin = Math.max(cfg.minH, cfg.padVMin * 2 + cfg.icoMin + cfg.band);
    var rowsMax = Math.floor((availH + g) / (hMin + g));
    if (rowsMax < 1) return null;
    var cMax = Math.max(1, Math.min(count, Math.floor((availW + g) / (cfg.minW + g))));
    for (var c = 1; c <= cMax; c++) {
      // CLAMP, don't reject: a column wider than maxW keeps its tile at maxW and leaves the slack
      // to the grid, which centres it. (Rejecting is what made the tile shrink as the panel grew.)
      var w = Math.min(cfg.maxW, (availW - g * (c - 1)) / c);
      if (w < cfg.minW - 0.5) continue;
      var hMax = Math.max(hMin, Math.min(cfg.maxH, w * cfg.aspect));
      var rowsNeed = Math.max(1, Math.ceil(count / c));
      var rTop = Math.min(rowsMax, rowsNeed);   // more rows than the tab needs is only empty cells
      for (var rows = 1; rows <= rTop; rows++) {
        var h = Math.min(hMax, (availH - g * (rows - 1)) / rows);
        if (h < hMin - 0.5) continue;
        var art = fitArt(cfg, w, h);
        var shown = rows * c;
        var pages = Math.max(1, Math.ceil(count / shown));
        var better = !best || pages < best.pages;
        if (!better && pages === best.pages) {
          if (art.ico > best.ico + 1e-6) better = true;
          else if (art.ico > best.ico - 1e-6 && w * h > best.w * best.h + 1e-6) better = true;
        }
        if (better) {
          best = { cols: c, rows: rows, w: w, h: h, fs: art.fs, lblH: art.lblH, ico: art.ico,
                   padV: art.padV, padH: art.padH, perPage: shown, pages: pages, cfg: cfg };
        }
      }
    }
    return best;
  }
  var FIT_VARS = ['--am-cols', '--am-cw', '--am-row', '--am-ico', '--am-fs', '--am-lblh', '--am-pad', '--am-icogap', '--am-gap', '--am-pager'];
  var _fitRO = null;   // the one live ResizeObserver; a re-render replaces it (see render())

  function fmtDur(s) {
    s = Math.max(0, Math.round(s || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  // Demo mode blanks anything that would expose the user's own files on a screen recording: the
  // preview frame AND the filename (which is often just as revealing).
  function demo() { return !!(FM.settings && FM.settings.get('demoMode')); }

  function card(item, cls, iconOnly) {
    var b = document.createElement('button');
    b.className = cls; b.type = 'button';
    var hidden = item.mid && demo();
    var label = hidden ? (item.kind === 'video' ? 'Video' : item.kind === 'audio' ? 'Audio' : 'Photo') : item.label;
    b.title = label;
    var ic = document.createElement('span'); ic.className = 'addmenu-ic';
    ic.innerHTML = item.emoji ? '<span class="add-emoji">' + item.emoji + '</span>' : item.icon;   // trusted literals only (ico()/emoji)
    b.appendChild(ic);
    // Library tiles show the actual frame, loaded lazily (IDB → cached). Never in demo mode.
    if (item.mid && !hidden && FM.mediaLib) {
      b.classList.add('addmenu-media');
      FM.mediaLib.getThumb(item.mid).then(function (url) {
        if (!url || !b.isConnected) return;
        var img = document.createElement('img');
        img.src = url; img.alt = ''; img.className = 'addmenu-thumb';
        b.insertBefore(img, b.firstChild);
        b.classList.add('has-thumb');
      });
      if ((item.kind === 'video' || item.kind === 'audio') && item.dur) {   // a song's length matters as much as a clip's
        var d = document.createElement('span'); d.className = 'addmenu-dur'; d.textContent = fmtDur(item.dur);
        b.appendChild(d);
      }
    }
    if (item.mid && hidden) b.classList.add('addmenu-media', 'addmenu-media--demo');
    if (!iconOnly) {   // shape cards are icon-only (AM) — the name lives in the tooltip
      var lb = document.createElement('span'); lb.className = 'addmenu-lbl';
      lb.textContent = label;   // element/template/file names are USER input — textContent, never innerHTML (#r3)
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
      // QUEUE 51: an explicit jump (a number-key shortcut) wins, then the remembered tab, then the
      // default. knownTab() is what makes a stale key harmless.
      var active = _startTab || knownTab(memGet().tab) || TABS[0].key; _startTab = null;
      rememberTab(active);

      // QUEUE 50 — PC only, same gate as the Studio CSS, so a phone can never enter this path.
      var fitOn = variant === 'panel' && (!window.matchMedia || window.matchMedia('(min-width: 701px)').matches);
      var host = fitOn && container.closest ? container.closest('.panel') : null;
      /* The measured box the tiles get. `top` is where the body starts inside the panel's content
       * box — the tabs and the panel title sit above it and are measured, never guessed — and the
       * height that remains is the panel's own clientHeight minus that, the container's bottom
       * padding, and whatever the caller reserves for the page dots. */
      function fitBox(reserve) {
        if (!host || !host.clientHeight || !bodyEl.isConnected) return null;
        var pr = host.getBoundingClientRect(), br = bodyEl.getBoundingClientRect();
        var top = br.top - pr.top - host.clientTop + host.scrollTop;
        var padB = parseFloat(getComputedStyle(container).paddingBottom) || 0;
        var h = host.clientHeight - top - padB - reserve - 2;
        var w = bodyEl.clientWidth;
        return (w > 40 && h > 40) ? { w: w, h: h } : null;   // no room to plan with → leave the old layout alone
      }
      function applyPlan(plan, box) {
        root.classList.toggle('addmenu--fit', !!plan);
        // the numbers the plan was made from, so a probe (or a future bug report) can read what was
        // measured instead of re-deriving it: `data-am-fit="338x90 7c2r"` = the box the solver was
        // given, and the grid it chose. (An earlier comment here cited tests/_addfit.html as the
        // probe that reads it. There is no such file and there never has been — this attribute is
        // the hook; drive index.html top-level at a real size and read it.)
        if (plan && box) root.dataset.amFit = Math.round(box.w) + 'x' + Math.round(box.h) + ' ' + plan.cols + 'c' + plan.rows + 'r';
        else delete root.dataset.amFit;
        if (!plan) { FIT_VARS.forEach(function (v) { root.style.removeProperty(v); }); return; }
        var s = root.style;
        s.setProperty('--am-cols', String(plan.cols));
        // the column's STATED width, not 1fr. A tile is capped at cfg.maxW, so on a wide panel the
        // columns no longer stretch past it — the grid centres them and keeps the slack as an even
        // margin instead of inflating the cards (which is what forced an extra column, and a
        // smaller tile, every time the panel grew past a multiple of maxW).
        s.setProperty('--am-cw', plan.w.toFixed(2) + 'px');
        s.setProperty('--am-row', plan.h.toFixed(2) + 'px');
        s.setProperty('--am-ico', plan.ico.toFixed(2) + 'px');
        s.setProperty('--am-fs', (plan.fs || 10.5) + 'px');
        s.setProperty('--am-lblh', (plan.lblH || 0) + 'px');
        // the padding the PLAN could afford, not the config's preferred pair — fitIcon() compresses
        // it when the tile is tight, and writing the preferred value here would overflow the card.
        s.setProperty('--am-pad', plan.padV.toFixed(2) + 'px ' + plan.padH.toFixed(2) + 'px');
        s.setProperty('--am-icogap', plan.cfg.icoGap + 'px');
        s.setProperty('--am-gap', FIT_GAP + 'px');
        /* The pager takes the WHOLE measured box, not just the rows it drew, and the grid inside
         * centres itself in it. The grid is a stack of stated-height rows, so any leftover used to
         * fall out as one block of nothing under the last row — which is the "lots of space" half
         * of Ezra's complaint wearing a different hat. Measured while paging, this box: median
         * leftover 0px, p90 14-27px, worst 70px; centring splits that in two rather than piling it
         * at the bottom. It cannot overflow: box.h is what planGrid was handed, and every row it
         * chose fits inside it by construction. */
        s.setProperty('--am-pager', (box ? box.h : (plan.rows * plan.h + (plan.rows - 1) * FIT_GAP)).toFixed(2) + 'px');
      }

      function drawBody() {
        bodyEl.innerHTML = '';
        var tab = TABS.filter(function (t) { return t.key === active; })[0] || TABS[0];
        var opts = typeof tab.options === 'function' ? tab.options() : (tab.options || []);   // Elements/Templates lists are live
        var iconOnly = tab.key === 'shape';   // AM: shape grid is icon-only (name = tooltip) \u2192 bigger art, denser grid
        function makeCard(o) {
          var c = card(o, 'addmenu-card' + (iconOnly ? ' addmenu-card--ico' : ''), iconOnly);
          c.addEventListener('click', function () { if (!c._longPressed) { o.add(); after(); } c._longPressed = false; });
          if (o.elementId) c.addEventListener('contextmenu', function (ev) {   // desktop: right-click removes a saved element
            ev.preventDefault();
            if (confirm('Delete element \u201c' + o.label + '\u201d?')) { FM.elements.remove(o.elementId); drawBody(); }
          });
          // Library tile: right-click (PC) or long-press (phone) takes it out of the library. The
          // FILE isn't deleted from any project that uses it \u2014 this only forgets the shortcut.
          if (o.mid) {
            var forget = function () {
              if (!confirm('Remove this from your media library?\n\nProjects already using it keep it.')) return;
              FM.mediaLib.remove(o.mid); drawBody();
            };
            c.addEventListener('contextmenu', function (ev) { ev.preventDefault(); forget(); });
            var t = null;
            var cancel = function () { if (t) { clearTimeout(t); t = null; } };
            c.addEventListener('pointerdown', function () { cancel(); t = setTimeout(function () { c._longPressed = true; t = null; forget(); }, 550); });
            ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { c.addEventListener(ev, cancel); });
          }
          return c;
        }
        // AM: the grid PAGES HORIZONTALLY (swipe sideways) with page dots — not a vertical scroll.
        /* The Elements tab used to get its own search field and scrolling list, because every saved
         * element was dumped into it. Nothing open-ended lives here any more — it is nine fixed
         * entries, all visible at once — so the field searched a list you could already see whole.
         * Ezra: "in the elements section get rid of the search bar, that should only be in the browse
         * element section." The real search is in the Custom elements browser, over the pile that
         * actually needs one. */
        /* QUEUE 50: on PC the page size is MEASURED, not declared \u2014 see planGrid. The constants below
         * are still the phone's (and the fallback for a panel with no room to measure). */
        /* Plan against the RESERVED box first, and only take the roomier one back if the tab turns
         * out to fit on a single page (no pager row to pay for). The order used to be the other way
         * round \u2014 plan with no reserve, then re-plan with it if the first plan paged, and KEEP the
         * unreserved plan if that re-plan failed \u2014 and both halves of that were wrong:
         *   \u00b7 when the re-plan failed the panel got a grid sized for a box 26px taller than the one
         *     it was about to draw the pager row into, so the panel overflowed and scrolled: the
         *     exact symptom Ezra reported, reintroduced by the fix for it;
         *   \u00b7 and the box a paging tab was measured against flipped between h and h-26 depending on
         *     whether that second plan happened to succeed, which is not monotonic in the panel at
         *     all. Measured, classic, Elements: panel 278 planned in a 81px box (20.25px icons) and
         *     panel 282 \u2014 FOUR PIXELS TALLER \u2014 planned in a 55px one (18px icons). */
        var plan = null, box = null;
        if (fitOn) {
          var cfg = iconOnly ? FIT_CFG.ico : FIT_CFG.lbl;
          box = fitBox(FIT_DOTS);
          plan = box && planGrid(opts.length, box.w, box.h, cfg);
          if (plan && plan.pages === 1) {          // no pager row \u2192 hand the reserve back to the tiles
            var box0 = fitBox(0);
            var p0 = box0 && planGrid(opts.length, box0.w, box0.h, cfg);
            if (p0 && p0.pages === 1) { plan = p0; box = box0; }
          }
          if (!plan) {                              // too short for a reserved grid, but maybe not for a bare one
            var boxN = fitBox(0);
            var pN = boxN && planGrid(opts.length, boxN.w, boxN.h, cfg);
            if (pN && pN.pages === 1) { plan = pN; box = boxN; }
          }
        }
        applyPlan(plan, box);
        var perPage = plan ? plan.perPage : (iconOnly ? (variant === 'sheet' ? 15 : 18) : (variant === 'sheet' ? 9 : 12));   // shapes 5\u00d73 / 6\u00d73; others 3\u00d73 / 4\u00d73
        var pager = document.createElement('div'); pager.className = 'addmenu-pager';
        for (var i = 0; i < opts.length; i += perPage) {
          var page = document.createElement('div'); page.className = 'addmenu-page';
          var grid = document.createElement('div'); grid.className = 'addmenu-grid' + (iconOnly ? ' addmenu-grid--ico' : '');
          opts.slice(i, i + perPage).forEach(function (o) { grid.appendChild(makeCard(o)); });
          page.appendChild(grid); pager.appendChild(page);
        }
        bodyEl.appendChild(pager);
        var pageCount = Math.max(1, Math.ceil(opts.length / perPage));
        // QUEUE 51: come back to the page of this tab you were last on, not always page 1.
        var startPage = Math.min(rememberedPage(active), pageCount - 1);
        /* A fresh pager starts at scrollLeft 0, and the browser fires a scroll event of its own while
         * scroll-snap settles the new content. That event used to reach the listener below and write
         * "page 1" over the page we were about to restore — measured: the memory read back
         * {"page":{"shape":0}} immediately after a jump to page 3. Nothing is written until the
         * restore below has run. */
        var settled = false;
        if (pageCount > 1) {
          var dots = document.createElement('div'); dots.className = 'addmenu-dots';
          var pcPager = variant === 'panel';
          /* The dots stay SPANS — decoration, exactly as they have always been. An earlier cut of this
           * change made them <button>s so a mouse could click a page. Measured, that bought nothing:
           * the mark is 6px, the button was 6x6 too (the CSS reset kept it that size so the row height
           * the fit reserves would not move), and elementFromPoint around its centre stayed on the dot
           * for only 2px in each direction. A 2px-reach click target is not a control, and shipping it
           * as a <button> also put pageCount extra items in the tab order and the accessibility tree
           * announcing themselves as buttons.
           *
           * A REAL page control lives beside them instead, and only on the PANEL (QUEUE 50/DEFECT 2).
           * The reason it had to exist: on a phone you swipe the strip, but a mouse had no gesture at
           * all — the pager answers to a HORIZONTAL scroll delta, which a wheel mouse cannot produce
           * without shift — and the fit legitimately draws 5 and 6 page Shape tabs at the smaller PC
           * bands. Pages you cannot reach are pages that do not exist. Three ways in, all mouse-only:
           *   · ‹ and › buttons, 24x24, at the ends of the row (and focusable, so Enter/Space work);
           *   · a click anywhere along the row jumps to the nearest dot — that is what gives the 6px
           *     marks a usable hit area without making them bigger or turning them into buttons;
           *   · a plain vertical wheel over the tiles turns the page.
           * The PHONE SHEET GETS NONE OF IT: `pcPager` is false for variant 'sheet', so not one node,
           * class or listener below is created there and its DOM stays byte-for-byte what it was. */
          var mkArrow = null;
          if (pcPager) {
            dots.className += ' addmenu-dots--pc';
            mkArrow = function (dir, glyph, label) {
              var b = document.createElement('button');
              b.type = 'button'; b.className = 'addmenu-pgbtn'; b.title = label;
              b.setAttribute('aria-label', label);
              b.textContent = glyph;
              b.addEventListener('click', function (ev) { ev.stopPropagation(); goTo(curPage() + dir); });
              return b;
            };
            dots.appendChild(mkArrow(-1, '‹', 'Previous page'));
          }
          for (var d = 0; d < pageCount; d++) {
            var dot = document.createElement('span');
            dot.className = 'addmenu-dot' + (d === startPage ? ' on' : '');
            dots.appendChild(dot);
          }
          if (pcPager) dots.appendChild(mkArrow(1, '›', 'Next page'));
          bodyEl.appendChild(dots);
          var markDots = function (idx) {
            var ds = dots.querySelectorAll('.addmenu-dot');
            for (var k = 0; k < ds.length; k++) ds[k].classList.toggle('on', k === idx);
          };
          var curPage = function () { return Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth)); };
          /* A direct scrollLeft, not scrollTo({behavior:'smooth'}): the strip carries
           * `scroll-snap-type: x mandatory`, so the jump lands cleanly either way, and a smooth
           * scroll's end position is not observable until its animation finishes — which is both a
           * worse thing to test and, measured, a scroll that sometimes never arrived. */
          var goTo = function (i) {
            i = Math.max(0, Math.min(pageCount - 1, i));
            if (!pager.clientWidth) return;
            pager.scrollLeft = i * pager.clientWidth;
            rememberPage(active, i);   // record the intent here, not via the scroll event it will
            markDots(i);               // raise — that event is coalesced and can arrive frames later
          };
          if (pcPager) {
            dots.addEventListener('click', function (ev) {
              if (ev.target.closest && ev.target.closest('.addmenu-pgbtn')) return;   // the arrows did it
              var ds = dots.querySelectorAll('.addmenu-dot');
              var bestI = 0, bestD = Infinity;
              for (var k = 0; k < ds.length; k++) {
                var r = ds[k].getBoundingClientRect();
                var dx = Math.abs(ev.clientX - (r.left + r.width / 2));
                if (dx < bestD) { bestD = dx; bestI = k; }
              }
              goTo(bestI);
            });
            // A wheel MOUSE only emits deltaY. Horizontal deltas (a trackpad swipe) are left to the
            // browser's own scrolling, exactly as before, and a wheel at either end is not swallowed
            // — it falls through so the surrounding panel can still scroll if it ever needs to.
            var wheelAt = 0;
            pager.addEventListener('wheel', function (ev) {
              if (Math.abs(ev.deltaX) >= Math.abs(ev.deltaY) || !ev.deltaY) return;
              var to = curPage() + (ev.deltaY > 0 ? 1 : -1);
              if (to < 0 || to > pageCount - 1) return;
              ev.preventDefault();
              var now = Date.now();
              if (now - wheelAt < 260) return;    // one flick of a wheel is many events; one page each
              wheelAt = now;
              goTo(to);
            }, { passive: false });
          }
          pager.addEventListener('scroll', function () {
            var idx = curPage();
            markDots(idx);
            if (settled) rememberPage(active, idx);   // writes only when the index actually changes
          });
          // Restore after layout — a scrollLeft against a clientWidth of 0 silently lands on page 1 —
          // and only then let the listener above start writing.
          var jump = function () {
            if (startPage > 0 && pager.isConnected && pager.clientWidth) pager.scrollLeft = startPage * pager.clientWidth;
            settled = true;
          };
          if (window.requestAnimationFrame) requestAnimationFrame(jump); else jump();
        }
      }

      TABS.forEach(function (t) {
        var tb = document.createElement('button');
        tb.type = 'button'; tb.title = t.label;
        tb.className = 'addmenu-tab' + (t.key === active ? ' active' : ''); tb.dataset.key = t.key;
        tb.innerHTML = '<span class="addmenu-ic">' + t.icon + '</span><span class="addmenu-lbl">' + t.label + '</span>';
        tb.addEventListener('click', function () {
          active = t.key;
          rememberTab(active);   // QUEUE 51 — this is the only place a tab is chosen by hand
          var all = tabsEl.querySelectorAll('.addmenu-tab');
          for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
          tb.classList.add('active');
          drawBody();
        });
        tabsEl.appendChild(tb);
      });
      main.appendChild(tabsEl); main.appendChild(bodyEl);

      /* The rail is EMPTY of tools now. Text / Captions / Freehand Drawing / Vector Drawing moved into
       * the Elements tab (which opens first), so this row of cards would have been a duplicate of what
       * is already on screen — Ezra: "i want them moved not duplicated". The element itself stays
       * because the phone sheet hangs its ✕ here; CSS collapses it when it holds nothing, so the panel
       * gets the whole row back instead of an empty strip. */
      var side = document.createElement('div'); side.className = 'addmenu-side';
      /* NO ✕ on the phone sheet (v5.28). Ezra: "get rid of that stupid X button that's there for some
         reason and takes up heaps of needed space." It was costing the whole 88px rail on a 375px
         screen — a quarter of the width — to duplicate something you can already do four other ways:
         tap anywhere outside the sheet (app.js's tap handler, whose own comment says "so you never
         have to find the ✕"), tap the + again (it toggles), tap the grab handle, or swipe the sheet
         down. The rail is left in place but empty, and `.addmenu-side:empty { display: none }`
         collapses it, so the tiles get that width back rather than sitting beside a blank strip. */

      root.appendChild(main); root.appendChild(side);
      container.appendChild(root);
      /* drawBody() runs AFTER the mount, not before it (it used to be called while `main` was still
       * detached). QUEUE 50 measures the panel to size the tiles, and a detached subtree measures
       * 0x0 — every rect would have been zero and the fit would have silently never engaged. */
      drawBody();

      /* Re-fit when the panel's box changes: dragging the timeline's top edge changes --tl-h, which
       * is Studio's band height, and resizing the window changes --insp-w. The signature guard is
       * what keeps this from looping — drawBody() changes what is INSIDE the panel, never the
       * panel's own client box, so the next callback sees the same signature and stops.
       * The previous observer is dropped FIRST: the inspector re-renders this menu on every
       * deselect, and an observer left watching a panel that never happens to resize would keep its
       * whole detached subtree alive, one per render, for the life of the session. */
      if (_fitRO) { _fitRO.disconnect(); _fitRO = null; }
      if (fitOn && host && window.ResizeObserver) {
        var sig = host.clientHeight + 'x' + host.clientWidth;
        var ro = new ResizeObserver(function () {
          if (!root.isConnected) { ro.disconnect(); return; }     // a re-render replaced us
          var s = host.clientHeight + 'x' + host.clientWidth;
          if (s === sig) return;
          sig = s;
          drawBody();
        });
        ro.observe(host);
        _fitRO = ro;
      }
    },
    // number-key shortcut targets
    TAB_KEYS: TABS.map(function (t) { return t.key; }),   // 1-5 → Shape / Media / Audio / Object / Template
    // Open the Add menu on a specific tab (deselects on PC so the inspector shows it).
    openTab: function (key) {
      if (!key) return;
      _startTab = key;
      var hasSel = FM.scene && (FM.scene.selectedId || (FM.scene.selectedIds && FM.scene.selectedIds.length));
      if (hasSel && FM.selectLayer) FM.selectLayer(null);           // deselect → inspector re-renders the Add menu (reads _startTab)
      else if (FM.inspector) FM.inspector.refresh();                // already showing → re-render on the chosen tab
      var b = document.querySelector('.addmenu-tab[data-key="' + key + '"]');   // fallback: switch tab in place
      if (b && !b.classList.contains('active')) b.click();
      _startTab = null;
    },
    // Shift+1..4 → the instant rail: Text / Captions / Freehand Drawing / Vector Drawing.
    instant: function (i) { if (INSTANT[i]) INSTANT[i].add(); },
  };
})(window.FM);
