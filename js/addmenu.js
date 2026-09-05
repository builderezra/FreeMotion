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
  /* Same geometry contract as ico(), but WITHOUT a blanket stroke="currentColor", so each child can
     carry its own. Only the Media tab uses it: Ezra asked for "the media one should have multiple
     colours, like yellow for the sun green for the grass etc", and that is a picture rather than a
     symbol — a sun and a hill are not the same thing and should not be the same colour. Every other
     tab stays single-colour and inherits from CSS, so there is exactly one place per tab that decides
     its hue. */
  function icoMulti(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  // The one file input is shared, so narrow `accept` to what this entry is actually asking for and put
  // it back afterwards. Two reasons this matters on a phone: a picker limited to audio doesn't bury
  // songs among the camera roll, and — the actual bug Ezra hit — iOS greys audio out in Files when the
  // accept list also carries image/* and video/*. Explicit EXTENSIONS go in beside the wildcard because
  // mobile pickers match those far more reliably than they map audio/* onto a UTI (.m4a in particular).
  var ACCEPT_ALL = 'video/*,image/*,audio/*';
  /* VIDEO IS IN THE AUDIO PICKER ON PURPOSE (queue 448). Ezra: "When you press import audio then choose
     from camera role it should auto extract the audio from the video and make it like an audio layer."
     Narrowing this to audio alone is what made a video un-pickable from the Audio tab in the first place
     — so the extensions stay (see the note above about iOS and UTIs) and video joins them. What arrives
     is not treated as a video: `FM._wantAudioOnly` tells the importer that this batch was asked for from
     the Audio tab, and a video picked here has its SOUND taken out. */
  var ACCEPT_AUDIO = 'audio/*,video/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.oga,.opus,.aif,.aiff,.caf,.wma,.amr,.mp4,.mov,.m4v';
  /* `wantAudio` IS ASSIGNED ON EVERY PICK, NOT SET ON ONE BRANCH (#686). The flag used to be raised by
     audioImport() and cleared only by handleFiles() when files actually arrived — so DISMISSING the
     Audio picker left it raised, and the next ordinary import turned a video into a soundtrack with no
     picture. The comment below audioImport() had already named that outcome exactly, as the thing a
     time-based clear would cause; consuming it on use has the same failure, reached by cancelling
     instead of by waiting. Assigning it here means a stale `true` cannot survive the next pick at all. */
  function pickFiles(accept, wantAudio) {
    var fi = document.getElementById('file-input');
    if (!fi) return;
    FM._wantAudioOnly = !!wantAudio;
    fi.setAttribute('accept', accept || ACCEPT_ALL);
    fi.click();
    // restore on the next tick — the click has already opened the picker with the value above, and
    // leaving it narrowed would silently break the next Import media
    setTimeout(function () { fi.setAttribute('accept', ACCEPT_ALL); }, 0);
  }
  FM._audioAccept = function () { return ACCEPT_AUDIO; };   // seam: the suite checks a video is reachable from the Audio tab
  function fileImport() { pickFiles(ACCEPT_ALL, false); }
  function audioImport() {
    /* Stamped for ONE batch and consumed by handleFiles, not cleared on a timer: a picker can sit open
       for as long as the user likes, so anything time-based would either expire mid-choice or leak into
       the next ordinary import and silently turn a video into a sound file.
       ⚠️ …and it leaked anyway, by the OTHER route the same sentence describes (#686): cancel the
       picker and handleFiles never runs, so nothing ever consumes the stamp. pickFiles now assigns it
       on every pick, and js/app.js clears it on the input's `cancel` event, so a dismissed picker
       cannot hand the next import a soundtrack with no picture. */
    pickFiles(ACCEPT_AUDIO, true);
  }

  function shp(kind, opts) { return function () { FM.addShapeLayer && FM.addShapeLayer(kind, opts); }; }

  // Icon rendered straight from the shape's own polygon data (FM.SHAPE_POLYS) — the menu preview
  // can never drift from what actually gets added.
  // `outline` draws it stroked instead of filled, to match the hand-drawn icons in the first block
  // of the Shape tab — a filled icon sitting next to stroked ones reads as a mistake.
  function icoPoly(kind, outline) {
    var polys = (FM.SHAPE_POLYS && FM.SHAPE_POLYS[kind]) || [];
    var open = kind === 'spiral';
    /* AT THE SHAPE'S OWN ASPECT (queue 159). Ezra: "most shapes icons vary largely to the actual shape,
     * try and make them 1-1."
     * The polygons were right all along — the BOX was wrong. Every shape's unit square was mapped into
     * an 18×18 square here, while FM.addShapeLayer spawns it into a box of its own SHAPE_ASPECT, so a
     * banner advertised at 1.84:1 arrived at 4.08:1 and an arrow shown square arrived at nearly 2:1.
     * That is the "vary largely" he is seeing, and it was never in the shape data.
     * Fit rather than stretch: scale by the LONGER side so the icon still occupies its 18px cell, and
     * centre what is left over, so a wide shape sits in the middle of the tile instead of hugging a
     * corner. Reading FM.SHAPE_ASPECT means there is one table, not a copy that can drift. */
    var asp = (FM.SHAPE_ASPECT && FM.SHAPE_ASPECT[kind]) || [1, 1];
    var k = 18 / Math.max(asp[0], asp[1]);
    var bw = asp[0] * k, bh = asp[1] * k;
    var ox = (24 - bw) / 2, oy = (24 - bh) / 2;
    /* ONE path, not one polygon per subpath (queue 159). Several of these shapes are made of a body
     * plus a HOLE — the compositor's own comment says it: "every body here winds clockwise, so a hole
     * must wind anticlockwise". Winding only cancels between subpaths of the SAME path, so drawing each
     * one as its own <polygon> filled every hole in solid. A clock came out a plain disc against a real
     * ring-with-hands (measured at 0.41 silhouette agreement), and it quietly cost the ring shapes —
     * wreath, gear, sun, snowflake, laurel — as well.
     * Default nonzero fill-rule, deliberately, because that is the rule the compositor fills with. */
    /* …and it walks the SAME CURVE the compositor walks. Half these outlines are smooth: a point
     * flagged [u,v,1] means the curve flows THROUGH it as a Catmull-Rom bezier, and drawing straight
     * lineTos between them turns a wreath into a polygon of it. FM.pointCtrl is the single source of
     * truth for those tangents (compositor, thumbnails and the point editor all read it), so the icon
     * reads it too rather than owning a second opinion about what the curve is. Mirrors
     * FM.buildSubPath exactly, emitting SVG C commands where that emits bezierCurveTo. */
    var M = function (p) { return [(ox + p[0] * bw), (oy + p[1] * bh)]; };
    var f = function (q) { return q[0].toFixed(2) + ' ' + q[1].toFixed(2); };
    var sub = function (pl) {
      var n = pl.length; if (!n) return '';
      var closed = !open;
      var out = 'M' + f(M(pl[0]));
      var segs = closed ? n : n - 1;
      for (var i = 0; i < segs; i++) {
        var p1 = pl[i], p2 = closed ? pl[(i + 1) % n] : pl[i + 1];
        if (p1[2] !== 1 && p2[2] !== 1) { out += ' L' + f(M(p2)); continue; }
        if (!FM.pointCtrl) { out += ' L' + f(M(p2)); continue; }
        var c1 = FM.pointCtrl(pl, i, closed).out, c2 = FM.pointCtrl(pl, i + 1, closed).in;
        out += ' C' + f(M(c1)) + ' ' + f(M(c2)) + ' ' + f(M(p2));
      }
      return out + (closed ? ' Z' : '');
    };
    var d = polys.map(sub).join(' ');
    var body = (open || outline)
      ? '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + (outline ? 1.8 : 1.4) + '" stroke-linejoin="round"/>'
      : '<path d="' + d + '" fill="currentColor" stroke="none"/>';
    return '<svg viewBox="0 0 24 24">' + body + '</svg>';
  }
  // The extra AM shape library (pages 2–4 of AM's shape sheet).
  var LIB_SHAPES = [
    ['speech', 'Speech'], ['moon', 'Moon'], ['snowflake', 'Snowflake'], ['shield', 'Shield'], ['check', 'Check'],
    ['droplet', 'Droplet'], ['cloud', 'Cloud'], ['play', 'Play'], ['spiral', 'Spiral'], ['sparkle', 'Sparkle'],
    ['stamp', 'Stamp'], ['bolt', 'Bolt'], ['puzzle', 'Puzzle'], ['pushpin', 'Pushpin'],
    ['flag', 'Flag'], ['thumbsup', 'Thumbs up'], ['paperplane', 'Paper plane'], ['house', 'House'], ['laurel', 'Laurel'],
    ['bookmark', 'Bookmark'], ['pointhand', 'Pointing hand'], ['flame', 'Flame'], ['banner', 'Banner'], ['ribbon', 'Silk ribbon'], ['wreath', 'Wreath'],
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
    /* A PENCIL (queue 161). Ezra: "Make the free hand drawing icon a pencil." It was a squiggle with a
       nib, which reads as "a wavy line" rather than as the tool you draw with. Drawn as body + ferrule
       band + tip band, because a bare angled rectangle at 22px is a stick — the two cross-strokes are
       what make it legible as a pencil at this size. */
    /* QUEUE 163, and the shape of it is worth keeping. Ezra: "get multiple agents with really high
       standards to not accept it until it's perfect." Three judges — an icon designer, a first-time
       user and a pixel engineer — rejected the v7.04 pencil 0/3 at 24px, which is the only size that
       decides anything here (it is the add-menu cell). Their converging faults:
         · a HOLLOW outline whose ~1.5px counter turns to mush at 24px — "reads as a paperclip or pill"
         · both details that make it a pencil (the ferrule band, the nib line) die at that size, so what
           survives is a capsule with a dark nick in it
         · and the concept fault, which is the one that mattered: a bare pencil is the universal EDIT
           glyph. Nothing in it said "draw by hand".
       So the body is FILLED — no counter left to lose — and a stroke trails from the tip, which is what
       turns an edit pencil into a drawing tool. The geometry is the OLD pencil's, deliberately: my first
       attempt redrew the body from scratch to make it solid and lost the pencil entirely (it read as a
       marker at 96px). Filling the shape that already worked fixed the fault without inventing a new
       problem. The stroke is one deep S rather than a ripple, because a shallow one flattened to a dash
       at 24px, and it starts under the nib rather than beside it so it reads as a line coming OUT of the
       pencil. See tests/_iconsheet.html — it renders both icons at 24/48/96 on the real cell colour. */
    { label: 'Sketching', icon: ico('<g transform="translate(2.4,-2.6) scale(0.9)" fill="currentColor" stroke="none"><path d="M4.2 19.8l.9-3.4L15.6 5.9a1.7 1.7 0 0 1 2.4 0l1.1 1.1a1.7 1.7 0 0 1 0 2.4L8.6 19.9l-3.4.9z"/></g><path d="M6.2 18.7c1.7-2.7 3.4 2.7 5.1 0"/>'), add: function () { FM.startDraw && FM.startDraw('freehand'); } },
    /* …and Vector stops being a pencil too, which is not scope creep but the other half of the same
       change: its old mark was ALSO a pencil silhouette (with two anchor dots), so giving Freehand the
       pencil would have left two pencils side by side in one list. That is the fault the Elements cube
       note records — "at 22px the two were nearly the same mark and neither told you what it opened".
       A curve between two anchor squares is what vector drawing IS, and it shares nothing with a pencil
       at any size. */
    /* …and the same three judges on the vector mark (queue 163). Two construction faults and one that
       is really about this app:
         · the curve entered the lower anchor at its CORNER and ate the counter, so that anchor rendered
           as a "G"; and the two anchors did not match each other in size or weight
         · at 24px a 4px square with a 1px counter fills in and reads as dirt
         · and: in a VIDEO editor, a curve between two square nodes is the standard easing / keyframe
           graph icon. The first-time-user judge's first guess was "speed curve", not "drawing tool".
       So: 5.2px anchors that survive, the curve BUTT-CAPPED so it stops flat at each anchor's edge
       instead of fusing into it with a fillet, and a control handle with a solid knob. The handle is the
       part that says pen tool rather than graph — an easing curve never has one hanging off it. The knob
       is solid because as a 1px ring its counter half-closed at 24px into a grey blob beside two crisp
       square counters. */
    { label: 'Custom shape', icon: ico('<path d="M5 16.6c0-5.6 8-3.2 8-8.8" stroke-linecap="butt"/><rect x="2.4" y="16.6" width="5.2" height="5.2" rx=".9"/><rect x="10.4" y="2.6" width="5.2" height="5.2" rx=".9"/><path d="M15.6 5.2h3.4" stroke-linecap="butt"/><circle cx="20.5" cy="5.2" r="1.5" fill="currentColor" stroke="none"/>'), add: function () { FM.startDraw && FM.startDraw('vector'); } },
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
    { key: 'object', label: 'Elements', icon: icoMulti(
      /* A gradient, not a flat hue (Ezra: "give it a gradient that looks nice and smooth and subtle").
         Two stops only and both inside the same violet family — a wide gradient on a 22px line reads as
         a colour ERROR rather than as depth. Lit at the top-left corner, which is where the cube's own
         top face is, so the shading agrees with the geometry. The id is namespaced because several of
         these icons live in the same document and a duplicate gradient id silently steals the fill. */
      '<defs><linearGradient id="fm-ic-el" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#C9B8FF"/><stop offset="1" stop-color="#7C5CE0"/></linearGradient></defs>'
      + '<path d="M12 2.6l8.2 4.7v9.4L12 21.4l-8.2-4.7V7.3z" stroke="url(#fm-ic-el)"/>'
      + '<path d="M3.8 7.3L12 12l8.2-4.7M12 12v9.4" stroke="url(#fm-ic-el)"/>'), options: function () {
      var base = INSTANT.concat([
        { label: 'Camera', icon: ico('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'), add: function () { FM.addCameraLayer && FM.addCameraLayer(); } },
        /* "CONTROLLER", not "Null" (queue 363). Ezra: "If you can think of another name for null that
           still makes sense and describes what it is then change the name of it to that."
           Null is After Effects' word and it names what the thing is NOT. What it IS: an invisible layer
           that renders nothing and exists to be parented to — you animate it and everything attached
           follows. "Controller" says what you use it for, is a real word, and collides with nothing.
           "Anchor" and "Pivot" were both rejected on purpose: every layer already has an ANCHOR POINT
           control, so an Anchor layer would collide with an existing, different, visible concept — worse
           than a vague name. "Empty" (Blender's word) repeats Null's mistake of naming an absence.
           `layer.type` stays 'null', so every saved project keeps working — this is a string change. */
        /* ⚠️ THESE TWO SAY WHAT THEY ARE FOR NOW — queue 596. Ezra: *"What do the controllers and
           adjustments even do? What is their function?"* **He was asking about two of his own layer
           types, which means the app was not saying.** Every EFFECT in the app carries a `desc`; these
           carried a name and an icon and nothing else.
           ⚠️ **THE EXPLANATION IS A TOAST ON ADD, NOT A TOOLTIP.** A `title` is invisible on a phone,
           which is where he works — it would have been a fix that looked done and helped him not at all.
           The toast lands at the moment of confusion, which is the #572 lesson: the app knowing something
           and only saying it somewhere he is not looking is the same fault as not knowing it.
           ⚠️ **Kept to one sentence each, naming the USE rather than the concept.** "A null object with no
           spatial extent" is accurate and would tell him nothing. */
        { label: 'Controller', icon: ico('<rect x="5" y="5" width="14" height="14" rx="1" stroke-dasharray="3 2"/><path d="M9 12h6M12 9v6"/>'),
          desc: 'An invisible handle — parent layers to it, then move it to move them all together.',
          add: function () { FM.addNullLayer && FM.addNullLayer(); if (FM.toast) FM.toast('Controller: an invisible handle. Parent layers to it, then move it to move them all at once.', 4200); } },
        { label: 'Adjustment', icon: ico('<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/>'),
          desc: 'Applies its effects to everything BELOW it, so one grade can cover the whole video.',
          add: function () { FM.addAdjustmentLayer && FM.addAdjustmentLayer(); if (FM.toast) FM.toast('Adjustment: its effects apply to every layer BELOW it — one grade over the whole video.', 4200); } },
        // An EMPTY group: grouping used to require selecting two layers first, so there was no way to
        // make the container and then fill it. Drag layers onto it, or parent them to it.
        // "New group", not "Empty group" (queue 412) — his words: "Rename empty group to new group".
        { label: 'New group', icon: ico('<rect x="3" y="6" width="18" height="14" rx="2" stroke-dasharray="3 2"/><path d="M8 13h8M12 9v8"/>'), add: function () { FM.addEmptyGroup && FM.addEmptyGroup(); } },
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
        /* Just the name (queue 281). Ezra: "get rid of the number from the custom elements section that
           says how many elements you have." It read "Custom elements (3)" and the count told you
           nothing you could not see the moment you opened it. */
        label: 'Custom elements',
        /* Four marks, four colours (queue 271). A CSS gradient cannot paint a stroke, so the icon
           carries its own paint servers — the same reason #267 and #270 needed them. Each square gets
           a hue from well apart on the wheel and the plus stays neutral, so it reads as "many things"
           rather than as a fifth colour competing with them. */
        icon: icoMulti(
          '<defs>'
          + '<linearGradient id="fm-ic-ce1" x1="3" y1="3" x2="10" y2="10" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7FD4FF"/><stop offset="1" stop-color="#4F9BFF"/></linearGradient>'
          + '<linearGradient id="fm-ic-ce2" x1="14" y1="3" x2="21" y2="10" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFC86B"/><stop offset="1" stop-color="#FF8A3D"/></linearGradient>'
          + '<linearGradient id="fm-ic-ce3" x1="3" y1="14" x2="10" y2="21" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9BE88A"/><stop offset="1" stop-color="#49C97E"/></linearGradient>'
          + '<linearGradient id="fm-ic-ce4" x1="14" y1="14" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F5A8E4"/><stop offset="1" stop-color="#C86BFF"/></linearGradient>'
          + '</defs>'
          + '<rect x="3" y="3" width="7" height="7" rx="1.5" stroke="url(#fm-ic-ce1)"/>'
          + '<rect x="14" y="3" width="7" height="7" rx="1.5" stroke="url(#fm-ic-ce2)"/>'
          + '<rect x="3" y="14" width="7" height="7" rx="1.5" stroke="url(#fm-ic-ce3)"/>'
          + '<path d="M17.5 14v7M14 17.5h7" stroke="url(#fm-ic-ce4)"/>'),
        add: function () {
          if (FM.elementsBrowser) FM.elementsBrowser.open();
          else if (FM.toast) FM.toast('Elements browser unavailable');
        },
      });
      return base;
    } },
    { key: 'shape', label: 'Shape', icon: icoMulti(
      /* "with the shapes one, you can make the circle shape and the square two different colours."
         Blue square, teal circle — adjacent on the wheel so the pair still reads as one icon rather
         than two stickers, but far enough apart to be obviously two colours at 22px. */
      '<defs>'
      + '<linearGradient id="fm-ic-sq" x1="4" y1="4" x2="13" y2="13" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#A5CDFF"/><stop offset="1" stop-color="#3B82F6"/></linearGradient>'
      + '<linearGradient id="fm-ic-ci" x1="11" y1="11" x2="21" y2="21" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#7FF0DE"/><stop offset="1" stop-color="#12A594"/></linearGradient>'
      + '</defs>'
      + '<rect x="4" y="4" width="9" height="9" rx="1.5" stroke="url(#fm-ic-sq)"/>'
      + '<circle cx="16" cy="16" r="5" stroke="url(#fm-ic-ci)"/>'), options: [
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
    { key: 'media', label: 'Media', icon: icoMulti(
      /* A little PICTURE, filled, rather than an outline sketch. Ezra: "I want the whole bottom line,
         rn it looks tacky, maybe try also filling in the green hills solid green and make the
         background solid blue". Two things came out of that, both deliberate:
         · THE WHOLE BOTTOM IS GREEN, corner curves included. The frame is drawn as a path that STOPS
           at y=17 on both sides, and the green ground path carries both bottom corner arcs — with a
           rect, or with a straight green line between the corners, the last few pixels at each end
           stayed blue, which is the "tacky" part: a ground line that does not reach the ground.
         · SOLID FILLS. At 22px an outline sun over an empty background reads as three unrelated marks;
           filled, it reads as a photo in one glance, which is the whole job of this icon. Compared
           against the outline version and a hills-only version at 3x before choosing. */
      '<defs>'
      + '<linearGradient id="fm-ic-sky" x1="12" y1="5" x2="12" y2="19" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#3E8CC4"/><stop offset="1" stop-color="#22557E"/></linearGradient>'
      + '<linearGradient id="fm-ic-hill" x1="12" y1="14" x2="12" y2="19" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#7BEBA6"/><stop offset="1" stop-color="#2FB765"/></linearGradient>'
      + '</defs>'
      + '<path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="url(#fm-ic-sky)" stroke="none"/>'
      + '<circle cx="8.4" cy="10.2" r="2.1" fill="#FBBF24" stroke="none"/>'
      + /* Peaks brought DOWN ~2px — Ezra: "the green goes up slightly to high". They were topping out at
         y=12.6 in a 5..19 frame, i.e. level with the sun, which made the hills fight the sky for the
         picture instead of sitting under it. Highest point is y=14.8 now, comfortably below the sun at
         10.2, and the silhouette is traced explicitly and closed through both bottom corner arcs so the
         ground still reaches the ground. */
      '<path d="M3 17L3 18.6L8.6 14.8L12.4 17.2L15.4 15.6L21 18.6L21 17A2 2 0 0 1 19 19L5 19A2 2 0 0 1 3 17Z" fill="url(#fm-ic-hill)" stroke="none"/>'
      + '<path d="M3 17V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10" stroke="#7CC9EA"/>'
      + '<path d="M3 17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2" stroke="#4ADE80"/>'), options: function () {
      var base = [
        // No trailing "…" (queue 197). Ezra: "on both the import buttons in the media and audio menus on
        // mobile it has three dots on the text for those two buttons, get rid of that." The ellipsis is
        // the desktop convention for "this opens a picker", and on a phone every tile opens something,
        // so it says nothing and just reads as a truncated word.
        /* A WHITE GRADIENT ICON ON A GREY PLATE (queue 270). "keep it all looking the same. I just
           want the actual icon for the import button to be more white colour with a gradient instead
           of grey how it is right now."
           Only the ICON changes — the plate keeps the plain grey that #210 made a system ("Import and
           Import audio are both grey on purpose", the neutral everyday action beside the things that
           MAKE something). That grey is `--am-tint`, and `.addmenu-card > .addmenu-ic` paints the icon
           from it, which is why the arrow was grey too: ico() strokes with currentColor.
           So the icon gets its own paint server, exactly as Sound effects does — a CSS colour cannot
           override one, which is the whole reason #267 took two attempts. Namespaced id: a duplicate
           silently steals the paint from whichever element asked for it second. */
        { label: 'Import', icon: icoMulti(
          '<defs><linearGradient id="fm-ic-imp" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">'
          + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs>'
          + '<path d="M12 16V4M7 9l5-5 5 5" stroke="url(#fm-ic-imp)"/>'
          + '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="url(#fm-ic-imp)"/>'), add: fileImport },
        /* SAMPLE CLIP — a real clapperboard (queue 543). Ezra: "fix up the sample clip icon because
           the lines are going through it", and he was describing the geometry exactly. The old art was
           `rect x=4 w=16` with `M4 9.5h16` across it and two ticks starting at `y=5`: the crossbar ran
           from x=4 to x=20, which IS the rect's left and right edge, and the ticks began ON the top
           edge. ico() sets stroke-linecap="round", so every one of those ends grew another 0.9px past
           the border — three lines poking out of the box. It was never the drawing, it was the
           endpoints, which is why it looked like something was overlapping it.
           Now the slate is its own tilted panel above the body, so there is no line that has to stop
           exactly on a border to look right — the shape cannot come back. */
        { label: 'Sample clip', icon: ico(
          '<rect x="3.5" y="9.6" width="17" height="9.9" rx="1.6"/>'
          + '<path d="M3.9 6.6 18.7 4.5a1 1 0 0 1 1.1.85l.3 2.1a1 1 0 0 1-.85 1.13L4.6 10.7a1 1 0 0 1-1.13-.85l-.3-2.1a1 1 0 0 1 .85-1.13Z"/>'
          + '<path d="M4.4 9.6 6.9 6.1M10.1 9.6l2.5-3.5M15.8 9.6l2.5-3.5"/>'), add: function () { FM.addSampleClip && FM.addSampleClip(); } },
        /* AI SCENE — a drawn mark, not an emoji (queue 543). Ezra: "Create a design for the ai scene
           button instead of just an emoji". It was the ONLY entry in this menu using `emoji`, so it sat
           among fourteen line icons as a filled yellow glyph — and an emoji is rendered by the platform,
           so it looked like a different thing on his phone than on his PC.
           The four-point sparkle pair is the mark AI has settled on, and its silhouette carries no
           rectangle, which matters here: almost every neighbour in this grid is box-shaped, so a shape
           with no box is the one that is easy to find. It is also the closest thing to the ✨ it
           replaces, so nobody has to re-learn where the button is. */
        { label: 'AI Scene', icon: ico(
          '<path d="M10.5 3.8l1.75 4.15 4.15 1.75-4.15 1.75-1.75 4.15-1.75-4.15L4.6 9.7l4.15-1.75Z"/>'
          + '<path d="M17.4 14.2l.85 2 2 .85-2 .85-.85 2-.85-2-2-.85 2-.85Z"/>'), add: function () { FM.aiPanel && FM.aiPanel.show(); } },
      ];
      // …then everything you've imported before, newest first. One tap re-adds it — no picker, no
      // trip through the Photos app. (A browser can't read the camera roll; this is the closest
      // thing that actually works, and after the first import it behaves the same.)
      libEntries(false).forEach(function (o) { base.push(o); });   // songs are filed under Audio, not here
      return base;
    } },
    { key: 'audio', label: 'Audio', icon: icoMulti(
      /* Same restraint as the cube: two stops, one family, lit from the top-right where the note's
         beam is highest, so the lighter end is the part that sits up. */
      '<defs><linearGradient id="fm-ic-au" x1="20" y1="4" x2="6" y2="20" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#FBC2E7"/><stop offset="1" stop-color="#E8438F"/></linearGradient></defs>'
      + '<path d="M9 18V6l10-2v12" stroke="url(#fm-ic-au)"/>'
      + '<circle cx="6.5" cy="18" r="2.5" stroke="url(#fm-ic-au)"/>'
      + '<circle cx="16.5" cy="16" r="2.5" stroke="url(#fm-ic-au)"/>'), options: function () {
      // Songs you've already imported live HERE, newest first, one tap to drop another copy on the
      // timeline — exactly how the Media tab has always treated clips and photos (Ezra: "when you add
      // a song like adding media it stays in the audios section"). They used to land in Media, mixed
      // in among the video thumbnails with no artwork to tell them apart.
      return [
        { label: 'Import audio', icon: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'), add: audioImport },
        /* Record voice… sits BESIDE Import rather than replacing it, and second rather than first:
           importing is still the commoner move, and the tile you have always tapped should not
           change position under your finger.
           The mark is a MICROPHONE in the Audio tab's own pink ramp (#FBC2E7 → #E8438F, lit from the
           top-right exactly like fm-ic-au above), so the new entry reads as belonging to this tab
           rather than as a stray. The gradient id is namespaced — a duplicate id silently steals the
           fill from whichever element asked for it second. */
        /* Sound effects (queue 196). Sits after Import and before Record voice: importing a track is
           still the commonest move, and the tile you have always tapped must not shift under your
           finger. The mark is a speaker throwing two arcs, in the Audio tab's own pink ramp so it reads
           as belonging here — and the gradient id is namespaced, because a duplicate id silently steals
           the fill from whichever element asked for it second. */
        { label: 'Sound effects', icon: icoMulti(
          /* WHITE, WITH A GRADIENT (queue 267). "The sound effects icon needs to be the white
             gradient, it still is red." It stayed red because the fix for the card set
             `.addmenu-card--rainbow > .addmenu-ic { color: #ffffff }` — and these strokes are painted
             with `url(#fm-ic-sfx)`, an explicit paint server, so `color` never reached them. A CSS
             colour cannot override an SVG gradient reference; the gradient itself has to change.
             White at falling opacity rather than white into grey, which is the same language as the
             ring around this card and answers the same words he used for it: "not solid white, give it
             some gradient". */
          '<defs><linearGradient id="fm-ic-sfx" x1="20" y1="4" x2="6" y2="20" gradientUnits="userSpaceOnUse">'
          + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".62"/></linearGradient></defs>'
          + '<path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" stroke="url(#fm-ic-sfx)" stroke-linejoin="round"/>'
          + '<path d="M15.4 9.2a4 4 0 0 1 0 5.6" stroke="url(#fm-ic-sfx)" stroke-linecap="round"/>'
          + '<path d="M18.1 6.6a7.7 7.7 0 0 1 0 10.8" stroke="url(#fm-ic-sfx)" stroke-linecap="round"/>'),
          add: function () { if (FM.sfx) FM.sfx.open(); else if (FM.toast) FM.toast('Sound effects aren’t available'); } },
        { label: 'Record voice…', icon: icoMulti(
          '<defs><linearGradient id="fm-ic-mic" x1="20" y1="4" x2="6" y2="20" gradientUnits="userSpaceOnUse">'
          + '<stop offset="0" stop-color="#FBC2E7"/><stop offset="1" stop-color="#E8438F"/></linearGradient></defs>'
          + '<rect x="9" y="2.6" width="6" height="11" rx="3" stroke="url(#fm-ic-mic)"/>'
          + '<path d="M5.8 11.2v.6a6.2 6.2 0 0 0 12.4 0v-.6" stroke="url(#fm-ic-mic)"/>'
          + '<path d="M12 18v3.2M8.6 21.2h6.8" stroke="url(#fm-ic-mic)"/>'),
          add: function () { if (FM.voiceRec) FM.voiceRec.open(); else if (FM.toast) FM.toast('Voice recording isn’t available'); } },
      ].concat(libEntries(true));
    } },
    // "Elements" (was "Object / Element" — Ezra). Elements are now a first-class thing with their own
    // section on Home, so the tab is named after them rather than after the odds and ends beside them.
    { key: 'template', label: 'Template', icon: icoMulti(
      /* "give the two lines in the middle different colours from the lines on the outside." The frame
         stays orange and the two dividers go amber — the lighter of the pair inside, so the icon reads
         frame-first and the layout it is describing sits within it. */
      /* Ezra: "make the lines in the middle complimentary colours but also very different from the
         border colour, and also make the sideways line and the downwards line both unique colours, and
         make sure the border lines go on top of the middle ones, not how it is currently."
         So: the two dividers are SEPARATE paths with their own hues — cyan across, violet down. Both
         sit opposite orange on the wheel, which is what makes them read as "not the border", and they
         are a near-complementary pair to each other. ORDER IS THE FIX for the last part: SVG paints in
         document order, so the dividers are declared FIRST and the frame LAST, and the frame's rounded
         corners now cover the divider ends instead of the dividers crossing the frame. */
      '<defs>'
      + '<linearGradient id="fm-ic-tpH" x1="4" y1="10" x2="20" y2="10" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#7FE9F5"/><stop offset="1" stop-color="#0EA5C6"/></linearGradient>'
      + '<linearGradient id="fm-ic-tpV" x1="10" y1="10" x2="10" y2="20" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#D8B4FE"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient>'
      + '<linearGradient id="fm-ic-tpB" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#FFC98A"/><stop offset="1" stop-color="#F0790E"/></linearGradient>'
      + '</defs>'
      /* NOT ALIGHT MOTION'S SHAPE ANY MORE (queue 375). Ezra: "Template icon needs to be a little bit
         different as it's identical to alight motions just with colour, should be a simple task just
         make it look good." He named the SHAPE, not the palette — the colours here are already his, from
         queue 267 and the two amendments after it — so the frame and both accent hues stay and the
         division inside changes. What made it identical was the arrangement: a full-width crossbar with
         an upright dropping from its centre, dividing the frame into a band over two panes, which is
         exactly AM's glyph. The crossbar stays (it is the thing that reads as "a layout"), the upright
         goes, and a single rounded content block sits under it instead — a header over a piece of
         content rather than a header over two panes. Three marks either way, so it carries the same
         weight beside Shape / Media / Audio / Elements at 24px, and the block is centred so the lower
         half is not lopsided the way one offset pane would be.
         Paint order is unchanged and still load-bearing: the block and the crossbar are declared FIRST
         and the frame LAST, so the frame's rounded corners cover their ends — "make sure the border
         lines go on top of the middle ones, not how it is currently". */
      /* ⚠️ REPLACED AGAIN — FOURTH TIME, AND THIS TIME HE CHOSE IT (queue 546/510/432).
         *"Template button still looks shitty like in the projects and inspector menu"*, and before that
         simply *"template icon looks shit"*. Queue 432 drew four alternatives and he picked none — the
         reason is recorded there and is worth remembering: they were "put to him" IN WORDS while the
         drawings sat in a local file he cannot open from a phone. Asking someone to choose between five
         icons by description is asking them to imagine one.
         So this time five were drawn, rendered at their REAL 24px beside the four neighbours, and sent to
         him as a picture. He picked the STAMP.
         WHY IT IS THE RIGHT SHAPE, in his terms rather than mine: a template is a thing you make copies
         from, and that is what this draws — a dashed master behind, a solid copy in front. It is also the
         only dashed texture in the TAB STRIP it lives in, so it is identifiable at 24px before the shape
         resolves at all — which is precisely what the old header-over-a-block failed at: at real size the
         bar and the block crowded into a smudge.
         ⚠️ Dashes are NOT unique in this menu overall, and that is worth knowing before anyone adds a
         third: `Controller` and `New group` are both dashed, and there the dashes mean "an EMPTY
         container". Here they mean "the master you copy from". Two meanings for one texture is a real
         cost, accepted because those two are CARDS inside the Elements tab while this is a TAB icon, so
         they never appear beside each other, and because this is the only one pairing a dashed shape with
         a SOLID one — which is the part that reads as "a copy of that" rather than "an empty box". If a
         dashed card ever lands in the tab strip, this is the note that says why it would be a problem.
         The PALETTE is untouched — orange frame, cyan and violet accents are his from queue 267 and the
         two amendments after it, and he has never complained about the colours, only the arrangement.
         Paint order is still load-bearing, and still his instruction: the copy is filled with the panel
         colour so the master reads as BEHIND it rather than crossing through it. */
      /* ⚠️ THE MASTER IS DRAWN AS AN OPEN PATH, NOT A RECT WITH A MATCHING FILL — and that is the whole
         difference between this working everywhere and working only where I tested it.
         The first version hid the master's covered corner by filling the copy with `var(--panel-2)`.
         It looked perfect, because the page I checked it on happened to have that exact background.
         On any tile whose background is NOT that colour — an active tab, a hover state, a future theme —
         the fill shows up as a slightly-wrong box sitting inside the icon. And the alternative, leaving
         it unfilled, puts the dashed lines straight through the solid copy: the EXACT fault he reported
         on the Sample clip icon an hour earlier.
         So the master traces only the part the copy does not cover — right stub, top, left, bottom stub,
         one continuous path. Nothing is hidden, so nothing has to match, and the icon is correct against
         any background. */
      + '<path d="M16.4 8.6V5.8A1.8 1.8 0 0 0 14.6 4H5.8A1.8 1.8 0 0 0 4 5.8v8.8a1.8 1.8 0 0 0 1.8 1.8h2.8" stroke="url(#fm-ic-tpH)" stroke-dasharray="2.6 2.4"/>'
      + '<rect x="8.6" y="8.6" width="11.4" height="11.4" rx="1.8" stroke="url(#fm-ic-tpB)"/>'
      + '<path d="M11.4 14.3h5.8" stroke="url(#fm-ic-tpV)"/>'), options: function () {
      var out = (FM.templates ? FM.templates.list() : []).map(function (t) {
        /* THE TEMPLATE'S OWN PICTURE, not the same little glyph nine times (queue 268, and the last
           open clause of #210 — "it shouldn't even colour it should show the hero image of whatever
           the template is (still keeping the text)"). His words here: "I want an actual visual
           representation of what's in the template kind of like how each project and template in the
           home menu you actually has a picture to it."
           Nothing had to be built: FM.templates.save already stores an inline `thumb` on the index
           entry — the project's own card image, captured at save time — which is exactly the picture
           the home screen shows. The tiles simply were not asking for it. The glyph stays as the
           fallback for a template saved before thumbs existed, or one whose capture failed. */
        return { label: t.name, thumb: t.thumb || null,
          // the SAME shape queue 375 replaced on the tab — it lives here too, as the fallback for a
          // template saved before thumbs existed, and changing only one of the two would have left AM's
          // glyph on screen while the entry claimed it was gone.
          icon: ico('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 8.6h16"/><rect x="7.2" y="11.7" width="9.6" height="5.6" rx="1.4"/>'),
          add: async function () { const ok = await FM.templates.insertInto(t.id); if (FM.toast) FM.toast(ok === false ? 'Template data missing \u2014 re-save it from a project' : 'Inserted \u201c' + t.name + '\u201d'); } };   // await the result \u2014 insertInto returns false when the IDB pack was evicted; the toast used to lie
      });
      /* AN EMPTY PANEL THAT EXPLAINS ITSELF, NOT A BUTTON THAT POPS A TOAST (queue 651). Ezra, with a
         screenshot of this exact panel: "also log to explain how templates work in here if u have no
         templates instead of making u press the button and have a pop up explain it".
         What was here was one dashed card reading "No templates yet" whose only job was to fire a toast
         — so the explanation existed but you had to guess that tapping a disabled-looking tile was how
         to reach it, and it vanished after four seconds. THE HOME SCREEN ALREADY SOLVED THIS (js/home.js
         emptyState, "Tap + to save a project as one…"); this panel simply never got the same treatment,
         which is what the entry says. Same shape, more words, because this is the surface where you
         would be asking WHAT a template is rather than where they went. */
      if (!out.length) out.push({ emptyPanel: {
        mark: '\u25F1',
        title: 'No templates yet',
        lines: ['A template is a whole project saved as a starting point \u2014 its layers, effects and timing, ready to drop into whatever you are working on.',
                'To make one: go to the home screen, open a project\u2019s \u22ef menu and choose Save as template.'] } });
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
  /* One library tile plus its gap, in the PC panel. MEASURED off the rendered grid (63px tile, 8px
     gap) rather than assumed — and CSS still owns the truth, so a test asserts the rendered pitch
     matches these. If that test goes red the numbers here are stale, not the layout. */
  var LIB_ROW_H = 63, LIB_GAP = 8, LIB_PITCH = LIB_ROW_H + LIB_GAP;
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

  /* Queue 145 — Ezra: "you can add colour to all the sub section buttons".
   * A CURATED ring rather than a colour per item, and rather than a hash of the label. Per-item
   * colours would be forty more decisions to make and to maintain (the Shape tab alone has dozens,
   * and saved elements are created at runtime and cannot be assigned one at all); a hash gives every
   * button its own hue but no two of them any relationship, which looks accidental. Walking a chosen
   * ring gives every button a colour, keeps neighbours far apart in hue, and needs no upkeep when an
   * item is added.
   * Stored as an "r, g, b" triple, not a hex, because the CSS needs BOTH the solid colour and a
   * translucent plate behind it from the same value. */
  /* ---- Per-tab palettes and named colours (queue 210) -----------------------------------------
   * "The shapes colours are fine, but the rest aren't. They're generic and copy paste. They need to
   * look quality."
   *
   * He is describing the cause exactly: there was ONE list of eight hues, cycled by index, on every
   * tab. So Elements and Shape opened with the same run of colours in the same order, and nothing on
   * any tab meant anything — the colour was a function of position, not of what the button does.
   *
   * Two changes. Each tab gets its OWN palette (Shape keeps the original, because he says it is the
   * one that is right), and the buttons he named by name get the colour he named, regardless of
   * where they sit. That second part is the one that makes the tabs stop feeling copy-pasted: the
   * colour now says something about the button.
   *
   * The greys are a system, not three separate asks — his own words make Import and Import audio
   * plain grey while the things that MAKE something carry colour. That hierarchy is the reason a
   * grey is specified at all, so it must survive any later repaint. */
  var BY_LABEL = {
    // "a basic grey" / "basic grey" — the neutral, everyday action. Deliberately colourless so the
    // buttons that create something stand out against it.
    'Import': '150, 160, 176',
    'Import audio': '150, 160, 176',
    'Import media': '150, 160, 176',
    'AI Scene': '240, 200, 90',          // "just a yellow colour for the background that isn't obnoxious"
    'Sound effects': 'RAINBOW',          // "a rainbow" — handled below; a single triple cannot say it
    'Record voice…': '235, 70, 70',      // "a strong red"
    'Record voice': '235, 70, 70',
    'Sample clip': 'PINKBLUE',           // "a pinky red colour and blue gradient"

    /* THE ELEMENTS TAB, BY NAME (queue 271). Ezra: "I think the colour choices are kind of poor and
       they kind of just like random and also similar to a lot of them. Null being red is good and you
       could make the custom elements button be multicoloured."
       Both halves of that are one cause. The tab was drawing from an eight-hue list CYCLED BY INDEX
       across nine cards, so a colour meant nothing except where a button happened to sit — "random" is
       the exact word for it — and the list itself held three blues (cyan, azure, indigo), two greens
       and two pinks, which is the "similar to a lot of them".
       So the hues are assigned BY NAME, the way #210 already established for the buttons he called out,
       and chosen to sit apart on the wheel rather than near each other. Roughly: red 0°, amber 38°,
       lime 96°, mint 166°, azure 212°, violet 258°, magenta 310° — nothing within 38° of its neighbour.
       Where a card's own artwork already has a colour, the plate agrees with it (the pen is green, the
       vector path is amber, the camera is violet) so the tab reads as deliberate instead of assorted.
       NULL KEEPS EXACTLY THE COLOUR IT HAS — he said it is good, so it is pinned rather than re-picked.
       The SCHEME is untouched: vivid icon, faint plate, which is the part he said to keep. */
    'Text': '79, 163, 255',              // azure — the writing tool
    'Captions': '236, 122, 214',         // magenta — speech, deliberately far from Text
    /* KEYED BY THE VISIBLE LABEL, which is why a rename has to come here too (queue 314/316). A miss
       does not throw — it silently drops the tile's colour, so the tile keeps working and just looks
       wrong, which is the kind of half-rename that survives a release. */
    /* PENCIL YELLOW, not lime (queue 421). Ezra: "Make the sketching button yellow instead of green, I feel
       yellow reminds me of pencil more."
       CHOSEN BY MEASUREMENT, because the obvious pencil yellows are all too close to Custom shape's amber:
       queue 271's rule is that no two vivid cards may sit within 60 in RGB, and every yellow in this app's
       usual register (L≈65%, S≈85%) came out 43-51 from that amber — the rule was right, a pencil yellow
       and an amber ARE nearly the same colour. This one is 68.6 from Custom shape and 66.6 from AI Scene,
       so it clears with headroom while still reading as a true 59° yellow rather than a chartreuse. */
    'Sketching': '250, 248, 45',         // pencil yellow — see the note above, it is 59° and clears amber by 68
    'Custom shape': '255, 186, 74',      // amber, matching its orange path
    'Camera': '156, 124, 255',           // violet, matching its lens
    'Controller': '255, 118, 140',       // "Null being red is good" — the value it already had, pinned. Keyed by LABEL, so this HAD to be renamed with the tile (queue 363) or the red he asked to keep would have silently fallen back to the generic ring.
    'Adjustment': '84, 226, 190',        // mint
    'New group': '150, 165, 190',        // steel — a container, deliberately the quiet one (renamed, queue 412)
    'Custom elements': 'MULTI',          // "you could make the custom elements button be multicoloured"
    /* Empty group and Custom elements are the two quiet ones, and giving them the same neutral put two
       identical plates side by side — the "similar to a lot of them" complaint in miniature. They are a
       steel and a lilac-grey now: still both quiet, still clearly two things. */
  };

  /* Elements: "choose more subtle background colours, the main icon can stay bright but the backdrop
   * more subtle, and also just change the colours up in general and pic better stuff, we don't want
   * it the exact same as the shape menu." So a different family from Shape's — cooler and earthier,
   * no violet-to-pink run — and the BACKDROP alpha is dropped separately in CSS so the icons stay
   * bright while the plate recedes. */
  /* VIVID hues, muted PLATE — the correction to v8.20 (queue 258). Ezra: "I wanted the colours of the
   * background for each option more faint, not the actual icon itself, keep the background colours but
   * make the icons pop like they used to."
   * He is right and the mistake was mine. His #210 wording was "the main icon can stay bright but the
   * backdrop more subtle" — TWO things — and I collapsed them into one by muting the palette itself.
   * Since the icon takes its colour from the same --am-tint, muting the palette muted the icons too;
   * his v7.30-against-v8.24 screenshots show it plainly.
   * The tint is vivid again, and the plate is kept faint by the `--soft` class's low alpha instead. One
   * hue per card, two different jobs: the icon gets it at full strength, the backdrop at 5.5%.
   * Still deliberately NOT Shape's palette — different hues in a different order, because "we don't
   * want it the exact same as the shape menu" was the other half of #210. */
  var TINTS_ELEMENT = [
    '86, 214, 255',    // cyan
    '236, 122, 214',   // magenta
    '150, 230, 110',   // lime
    '255, 186, 74',    // amber
    '132, 142, 255',   // indigo
    '255, 118, 140',   // rose
    '84, 226, 190',    // mint
    '110, 168, 255',   // azure
  ];
  var TINTS_MEDIA = ['150, 160, 176', '240, 200, 90', '120, 190, 240'];
  var TINTS_AUDIO = ['150, 160, 176', '160, 140, 235', '235, 70, 70'];

  /* A COLOUR PER SHAPE, GENERATED — NOT A LIST THAT COMES ROUND AGAIN (queue 434, after 413).
     Ezra, twice. First: "Add more colour to the shapes icons, currently the colours repeat and don't
     have much variety and isn't very pretty" (413, which went from eight hand-picked tints to sixteen
     generated ones). Then, at v10.71: "The colours you chose for the shapes menu are ugly and still
     repetitive. Come on man put some effort in."

     MEASURED BEFORE TOUCHING IT (tests/_shapehues.html, 380px), because "still" means the last idea was
     not the answer and a third guess is not worth having:
       · the shape tab draws **67 cards** and the palette had **16** entries, so it wrapped four times
         over and **five different shapes wore one colour**. That is the repeat, and no amount of
         re-ordering sixteen entries can fix a shortage of them.
       · saturation across the whole palette measured **85% to 85%**, lightness **66% to 66%**. Every
         single entry at one loudness — sixteen equally shouty candy colours, which is the "ugly".
         Local variety was already fine (nearest touching pair 67° apart), so re-spacing hues again
         would have changed nothing he can see.

     So the colour is DERIVED from the index instead of looked up:
       · hue advances by the golden angle (137.508°). Consecutive tiles are always ~137° apart, and the
         sequence does not come back round — 67 shapes get 67 different colours, and so would 670.
       · three TONES cycle underneath it, so the grid has depth instead of one flat intensity. Because
         they cycle every 3 and the hue never repeats, no two cards can match on both.
     Generating it is the point rather than a shortcut: 271's complaint about the Elements tab was
     "three blues, two greens" in a hand-picked list, and hand-picking sixty-seven is how that happens
     again, only worse. */
  /* FOUR TONES, NOT THREE, AND THE REASON IS ARITHMETIC RATHER THAN TASTE. The golden angle spreads
     hues beautifully but it FOLDS BACK at Fibonacci distances: step 21 lands 7.7° from where you
     started, step 34 lands 3.7° away. With three tones, 21 is divisible by 3 — so cards 0 and 21 came
     out 8° apart wearing the SAME tone, i.e. genuinely the same colour twice, which is the exact thing
     this change exists to remove. The suite caught it (238,131,99 vs 238,149,99).
     4 is coprime with 21, 34 and 55, so every near-hue pair the golden angle produces lands on a
     different tone and reads as a different colour. */
  var GOLDEN = 137.508, HUE0 = 14;
  var TONES = [
    { s: 0.82, l: 0.64 },   // full
    { s: 0.56, l: 0.50 },   // deep
    { s: 0.94, l: 0.76 },   // bright
    { s: 0.48, l: 0.70 },   // soft
  ];
  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    var f = function (t) {
      t = (t + 1) % 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(function (v) { return Math.round(v * 255); }).join(', ');
  }
  function tintFor(i) {
    var t = TONES[i % TONES.length];
    return hsl2rgb(HUE0 + i * GOLDEN, t.s, t.l);
  }
  // Suite seam (413, widened for 434): the tints a run of N tiles would actually WEAR, not a fixed
  // list — the palette is a sequence now, and asking it for 16 would have hidden the very repeat this
  // change is about.
  FM._addTints = function (n) {
    var out = [], k = Math.max(1, n || 24);
    for (var i = 0; i < k; i++) out.push(tintFor(i));
    return out;
  };

  function card(item, cls, iconOnly, tint) {
    var b = document.createElement('button');
    b.className = cls; b.type = 'button';
    /* Two of his asks cannot be said with one rgb triple — "a rainbow" and "a pinky red colour and
       blue gradient" are gradients. They get a class instead, and the CSS paints the plate; the
       --am-tint still carries a representative hue so the ICON and the border have something sane. */
    if (tint === 'RAINBOW') { b.classList.add('addmenu-card--rainbow'); tint = '255, 138, 61'; }
    else if (tint === 'PINKBLUE') { b.classList.add('addmenu-card--pinkblue'); tint = '255, 99, 158'; }
    /* MULTI is Elements' own multicoloured card and is NOT the Sound-effects rainbow: that one paints
       a full rainbow PLATE, and this tab's plates are deliberately faint (#258 — "the background for
       each option more faint… make the icons pop"). Here the colour is in the ICON, which is the
       treatment he said was right, and the plate keeps a quiet steel so the family holds. */
    else if (tint === 'MULTI') { b.classList.add('addmenu-card--multi'); tint = '172, 158, 196'; }
    if (tint) b.style.setProperty('--am-tint', tint);
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
    /* A card that already HAS its picture (templates carry one inline) shows it straight away — no
       IDB round trip, no flash of the glyph first. Same classes as the media tiles above so it wears
       the treatment he already signed off: image edge to edge, label over a gradient at the foot. */
    if (item.thumb && typeof item.thumb === 'string') {
      var timg = document.createElement('img');
      timg.src = item.thumb; timg.alt = ''; timg.className = 'addmenu-thumb';
      b.insertBefore(timg, b.firstChild);
      b.classList.add('addmenu-media', 'has-thumb');
    }
    if (!iconOnly) {   // shape cards are icon-only (AM) — the name lives in the tooltip
      var lb = document.createElement('span'); lb.className = 'addmenu-lbl';
      lb.textContent = label;   // element/template/file names are USER input — textContent, never innerHTML (#r3)
      b.appendChild(lb);
    }
    return b;
  }

  /* Seams for the suite (queue 314/316). A rename has to reach the LABELS and the tint map that is
     KEYED by them, and a miss on the second is silent — the tile keeps working and loses its
     colour. Reading both from outside is what lets that be asserted instead of hoped. */
  FM._instantLabels = function () { return INSTANT.map(function (o) { return o.label; }); };
  FM._tileTints = function () { return Object.keys(BY_LABEL); };

  FM.addMenu = {
    /* Exposed for the suite (queue 340). The Elements browser's empty state tells you how to MAKE an
       element, and for a long time it named a route through this menu that had been deleted — so the
       one instruction in the room pointed at a door that is not there. A test can only catch that if it
       can read what is actually in the menu, rather than being told. */
    _tabs: function () { return TABS; },
    /* The tile-colour table is keyed BY LABEL, so a rename that misses it leaves the tile looking up a
       colour that no longer exists and quietly falling back — the comment above BY_LABEL says exactly
       that. Exposed so a rename test can check the key moved with the label (queue 412). */
    _tileHue: function (label) { return BY_LABEL[label] || null; },
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
      /* THE PINNED ROW (queue 269 + 276). His words for Audio: "the three that I highlighted like the
         three options that are just default options … should be segregated from the ones at the bottom
         and when you scroll to the left and right it shouldn't scroll those top buttons. It should just
         scroll through the ones that you've added so those are always on screen." And for Media, the
         same thing plus how to divide it: "those stay at the top and like a separated and like by line".
         It is a SIBLING ABOVE the body, not a row inside it, and that is what makes it cheap: fitBox
         measures from bodyEl's own top down, so a strip above it comes out of the tile budget by
         construction — none of the fit arithmetic (queue 50/208) has to learn about it. */
      var pinnedEl = document.createElement('div'); pinnedEl.className = 'addmenu-pinned';
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

      /* Deliberately built with textContent and appendChild rather than innerHTML: the only reason this
         panel exists is to carry WORDS, and words are the thing that must never be able to become
         markup. Nothing here is user data today; the template NAME is one edit away from being. */
      function emptyPanel(spec) {
        var box = document.createElement('div'); box.className = 'am-empty';
        var m = document.createElement('div'); m.className = 'am-empty-mark'; m.textContent = spec.mark || '\u25F1';
        var t = document.createElement('div'); t.className = 'am-empty-title'; t.textContent = spec.title || '';
        box.appendChild(m); box.appendChild(t);
        (spec.lines || []).forEach(function (line) {
          var p = document.createElement('p'); p.textContent = line; box.appendChild(p);
        });
        return box;
      }

      function drawBody() {
        bodyEl.innerHTML = '';
        pinnedEl.innerHTML = '';
        pinnedEl.classList.remove('is-on');
        var tab = TABS.filter(function (t) { return t.key === active; })[0] || TABS[0];
        var opts = typeof tab.options === 'function' ? tab.options() : (tab.options || []);   // Elements/Templates lists are live
        /* WHICH ONES ARE PINNED: the tab's own actions, i.e. everything that is NOT a library tile.
           `mid` is the discriminator and it is the real one — it is the media-library id, so a card
           either came from his library or it is one of the buttons the tab ships with. No name list to
           fall out of date when a button is added.
           Only Media and Audio, because they are the two tabs that mix actions with a growing list;
           Shape, Elements and Template have nothing to scroll past. And only once there IS something
           to scroll — with no imports yet, splitting would just draw a divider under everything. */
        /* AN EMPTY TAB SAYS WHAT IT IS FOR (queue 651). Generic rather than Template-only — Elements
           and the media library will want the same treatment the day either can be empty, and a second
           copy is how the two would drift.
           ⚠️ IT IS WRAPPED IN THE ORDINARY PAGER/PAGE STRUCTURE, and that is not decoration. The first
           cut returned early with just the panel, on the reasoning that prose has one page and no dots
           — and the queue-275 test caught it: EVERY tab must render a `.addmenu-body` and a
           `.addmenu-pager`, because that pair is what the sheet's height and no-vertical-scroll rules
           are measured against. Breaking the invariant for one case would have left it true for four
           tabs and false for the fifth, which is how a layout rule quietly stops being a rule. One
           page, no dots, same boxes as everything else. */
        if (opts.length === 1 && opts[0].emptyPanel) {
          var epPager = document.createElement('div'); epPager.className = 'addmenu-pager';
          var epPage = document.createElement('div'); epPage.className = 'addmenu-page';
          epPage.appendChild(emptyPanel(opts[0].emptyPanel));
          epPager.appendChild(epPage);
          bodyEl.appendChild(epPager);
          return;
        }
        var splitTab = (tab.key === 'media' || tab.key === 'audio');
        var pinnedOpts = [];
        if (splitTab && opts.some(function (o) { return o.mid; })) {
          pinnedOpts = opts.filter(function (o) { return !o.mid; });
          opts = opts.filter(function (o) { return o.mid; });
        }
        /* THE RECENT-CLIPS GRID GETS A CEILING (queue 299). See the entry for the measurement: this
           body is CONTENT-SIZED, so Media and Audio — the only two tabs whose body is a growing library
           — gained a row of height per couple of imports while every other tab stayed put.
           Capped, never truncated: showing only the newest four would satisfy "two rows" and quietly
           make every older import unreachable, and one-tap re-adding is the whole point of the list. */
        var isLib = !!(splitTab && pinnedOpts.length > 0);
        bodyEl.classList.toggle('addmenu-body--lib', isLib);
        var iconOnly = tab.key === 'shape';   // AM: shape grid is icon-only (name = tooltip) \u2192 bigger art, denser grid
        /* The tint follows the item's position in the WHOLE tab, not its position on the page, so a
           button keeps its colour when the pager moves and two pages never open with the same run of
           hues. Media/Audio library tiles are skipped — they show the user's own frame, and a colour
           plate behind a photograph is noise. */
        function makeCard(o, idx) {
          /* By NAME first, then the tab's own palette, then the original list. Name beats position so
             "Record voice" is red wherever it sits — moving a button must not repaint it. */
          var pal = tab.key === 'object' ? TINTS_ELEMENT      // the Elements tab's key is 'object'
                  : tab.key === 'media' ? TINTS_MEDIA
                  : tab.key === 'audio' ? TINTS_AUDIO
                  : null;                                    // shapes: generated per index, see tintFor
          /* A card that shows a PICTURE gets no tint — a colour plate under a photo is just a wash
             over it. That was already true for media tiles (o.mid); it is now true for a template
             carrying its own thumb, which is #210's last clause word for word: "it shouldn't even
             colour it should show the hero image of whatever the template is (still keeping the
             text)". A template with no thumb keeps its colour and its glyph. */
          /* A plain lookup again. This used to need a prefix fallback because the card renamed itself
             to "Custom elements (3)" as you saved them and an exact match silently dropped back to the
             index palette; queue 281 removed the count, so the label is stable and the special case
             went with it. */
          var byName = BY_LABEL[o.label];
          var tint = (o.mid || o.thumb) ? null : (byName || (pal ? pal[idx % pal.length] : tintFor(idx)));
          // Elements gets the quieter plate (queue 210) — his "backdrop more subtle", applied per
          // TAB rather than per card so the whole tab reads as one family.
          var soft = tab.key === 'object' ? ' addmenu-card--soft' : '';
          var c = card(o, 'addmenu-card' + (iconOnly ? ' addmenu-card--ico' : '') + soft, iconOnly, tint);
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
        /* Drawn BEFORE the plan is measured, so the strip is already occupying its space when fitBox
           reads what is left for the tiles. Same card builder and the same makeCard index, so a pinned
           button keeps the colour it has always had — these are the buttons he picked colours for by
           name in #210, and they must not repaint just because they moved. */
        if (pinnedOpts.length) {
          var pgrid = document.createElement('div');
          pgrid.className = 'addmenu-grid addmenu-grid--pinned';
          pinnedOpts.forEach(function (o, j) { pgrid.appendChild(makeCard(o, j)); });
          pinnedEl.appendChild(pgrid);
          pinnedEl.classList.add('is-on');
        }
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
        /* ⚠️ 5, NOT 4 — THIS HAD TO MATCH THE CSS AND DID NOT (queue 542). styles.css line ~4644 lays a
           panel's library grid out as `repeat(5, 1fr)`, while this said 4. So every page was FILLED for
           four columns and RENDERED in five: the top row carried five tiles, the rows under it did not
           line up with it, and the page count was wrong. Measured on his own window — the grid reported
           five 53.2px columns while perPage was still being computed from 4. */
        var COLS = iconOnly ? (variant === 'sheet' ? 5 : 6) : (variant === 'sheet' ? 3 : 5);
        var perPage = plan ? plan.perPage : (iconOnly ? (variant === 'sheet' ? 15 : 18) : (variant === 'sheet' ? 9 : 12));   // shapes 5x3 / 6x3; others 3x3 / 4x3
        /* TWO ROWS, PAGED SIDEWAYS — queue 358, correcting queue 299 / v9.47.
           His words: "When I said I wanted the media and audio rows to be only two rows instead of three
           I didn't mean two rows fitting on screen then you have to scroll down, I just meant two rows
           solid locked in then you scroll left and right to go to the other rows where the spill over
           will be."
           v9.47 capped the body's HEIGHT and left it scrolling vertically, which is the thing he is
           ruling out — and it also made Media and Audio the two tabs that opened at a different height
           from every other one, which is his second complaint in the same entry. Both come out here.
           The machinery was already right beside it: this pager is what the Shape tab uses. A library
           tab simply gets a page that holds exactly two rows, and the spill-over is the next page. */
        /* THREE ROWS, not two (queue 473, v11.72). Ezra, with the dead band under the grid scribbled
           over: *"Since you made the pictures smaller you can probably fit three rows in there now, an
           extra row below, just take ur time and don't make anything worse"*.
           THIS REVERSES QUEUE 358, WHICH ASKED FOR TWO — and the reversal is honoured rather than
           argued because his objection there was to SCROLLING DOWN, not to the number: *"I just meant
           two rows solid locked in then you scroll left and right to go to the other rows where the
           spill over will be."* A third row that is equally locked in, with the spill-over still paging
           sideways, satisfies that sentence and this one.
           MEASURED BEFORE CHANGING, at 9:16 / 4:5 / 16:9 / 1:1 on a 390px phone: the library body is
           260px, two rows of 64px tiles use ~136px of it, and the ~125px left over is the band in his
           screenshot. Three rows come to ~208px and still fit, which is the "don't make anything worse"
           half — a shorter sheet is the risk #431 was about, and this was checked against the tallest
           stage (9:16), not just the aspect he happened to send. */
        /* ⚠️ THREE ROWS IS A PHONE MEASUREMENT, AND IT WAS BEING APPLIED TO A PC PANEL A THIRD ITS
           HEIGHT (queue 542). Ezra: "media and audio menus have broke on pc" — his screenshot shows the
           bottom row of tiles sliced through by the panel edge and the pager pushed below it.
           `3 * COLS` was measured on a 390px phone, where the note above records the library body as
           260px and three rows as ~208px. Measured on PC at his own window: the inspector column is
           232px tall with a 63px body. Three rows cannot fit, so the third is cut off.
           There was a SECOND fault stacked on it, and it is the one that made the arrangement ragged
           rather than merely tall: `COLS` here is a hardcoded 4, but the grid actually renders with
           `plan.cols` from the fit solver — 5 in his screenshot. So the page was being FILLED for four
           columns and LAID OUT in five, which is why his top row had five tiles and the rows below it
           did not line up.
           Both come out by using the plan, which is the machinery sitting immediately above this line
           and being bypassed: it already sizes columns AND rows to the real box.
           ⚠️ THE PHONE IS DELIBERATELY UNTOUCHED. `fitOn` (see above) is `variant === 'panel'` AND
           min-width 701px, so `plan` is null on a phone and the 3-row fallback below is exactly what
           shipped — which matters, because three rows is what he ASKED for in queue 473 and two rows
           paging sideways is what he asked for in 358. Neither of his numbers is overridden here; the
           PC simply stops pretending it has a phone's height. */
        if (isLib) {
          if (plan) perPage = plan.perPage;
          else if (fitOn) {
            /* NO PLAN CAME BACK, WHICH IS THE CASE THAT WAS BROKEN. The fit solver's fallback only
               accepts a grid that fits on ONE page, and a library with more items than fit never will —
               so on a short PC panel it returns nothing and this fell through to the phone's constant of
               three rows. Take the row count from the MEASURED body instead: the same question the
               solver answers, asked directly. Clamped to his three (queue 473) at the top.
               ⚠️ AND TO **ONE** WHEN THERE IS NO ROOM AT ALL, which is his actual window: measured on it,
               the tab strip and the Import/Sound-effects/Record strip take 203px of a 231px panel, so
               fitBox reports ZERO usable height and returns null. Three rows there is 204px of tiles in
               26px of space. One row plus the pager is the most that can honestly be offered, and the
               panel's own scroll (see styles.css, same queue) reaches the rest. */
            var lb = fitBox(FIT_DOTS) || fitBox(0);
            var rows = lb ? Math.max(1, Math.min(3, Math.floor((lb.h + LIB_GAP) / LIB_PITCH))) : 1;
            perPage = Math.max(1, rows * COLS);
          }
          /* ⚠️ THE PHONE IS UNTOUCHED, and this branch is what guarantees it. `fitOn` is false on a
             sheet, so `host` is null, so fitBox returns null there for a reason that has nothing to do
             with space — meaning the measured path above would have quietly given his phone ONE row
             where queue 473 asked for three. Kept explicit rather than relying on the clamp. */
          else perPage = Math.max(1, 3 * COLS);
        }
        var pager = document.createElement('div'); pager.className = 'addmenu-pager';
        for (var i = 0; i < opts.length; i += perPage) {
          var page = document.createElement('div'); page.className = 'addmenu-page';
          var grid = document.createElement('div'); grid.className = 'addmenu-grid' + (iconOnly ? ' addmenu-grid--ico' : '');
          var pageOpts = opts.slice(i, i + perPage);
          pageOpts.forEach(function (o, j) { grid.appendChild(makeCard(o, i + j)); });
          /* GROW INTO THE SHEET, BUT ONLY WHEN THERE IS A GRID TO GROW (queue 208). Ezra wanted the
           * dead band under the last row used up: "each icon in that section could be longer and more
           * square so then it fits it all nicely." Letting the rows share the sheet's height does that
           * — Elements went from 111×64 (ratio 1.73) to 111×81 (1.37), taller and squarer, band gone.
           * But applied to EVERY tab it overshoots badly: Media has three cards on one row, and one
           * row sharing 260px produced a 111×260 card at ratio 0.43 — a tall sliver, which is the
           * opposite of "more square". Measured, not guessed.
           * So the fill is opt-in per page, and the line is drawn at TWO rows, by measurement:
           *   3 rows (Elements, 9 cards) → 111×81, ratio 1.37 — his case, and the band is gone
           *   2 rows (Audio, 5 cards)    → 111×126, ratio 0.88 — squarer still, and fine
           *   1 row  (Media, 3 cards)    → 111×260, ratio 0.43 — a sliver, and clearly wrong
           * So one row keeps its natural size and the sheet simply has room to spare, which is honest.
           * Better a little empty space than a card stretched to four times its height pretending the
           * space is used. */
          /* …AND A SPARSE PAGE GETS FEWER COLUMNS RATHER THAN A TALLER ROW (queue 428, v11.34).
           * Ezra, with a screenshot of the Audio tab: *"fill it but those tabs are still broken as per
           * attached image"* — so the dead band is the complaint and "fill" is the instruction, which
           * settles the three-way choice the entry had been holding (fill / centre / shorter).
           * The reasoning above is still right: stretching ONE row to 260px gives a 113x260 sliver, and
           * that is worse than the gap. What it did not consider is dropping a column. Measured on the
           * sheet at 380px, Audio's three cards: 3 columns is one row of 113x64 with 196px dead beneath;
           * 2 columns is two rows of 173x126, ratio 1.37 — which is the exact ratio the table above
           * calls his case and calls good. Same cards, no stretching, no gap.
           * The odd card out spans the full width rather than leaving a hole, so the grid reads as
           * finished instead of interrupted. */
          var _rows = Math.ceil(pageOpts.length / COLS);
          if (_rows >= 2) grid.classList.add('addmenu-grid--fill');
          else if (pageOpts.length >= 1) grid.classList.add('addmenu-grid--fill', 'addmenu-grid--cols2');
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

      /* The travelling glint marks the OPEN tab (queue 155). Ezra: "I want the effect that you have on
         the open project, like with the shiny line going around it, also on whatever you have
         selected… the main button that opens the menu." Same light, same CSS as the open project's
         card — see .hm-glint / .am-glint in styles.css; nothing is duplicated but the corner radius.
         It has to MOVE with the selection rather than be appended once: clicking a tab swaps the
         .active class in place without rebuilding the row, so a ring added at build time would be left
         behind on whichever tab happened to be open first. */
      function placeGlint() {
        var all = tabsEl.querySelectorAll('.addmenu-tab');
        for (var i = 0; i < all.length; i++) {
          var old = all[i].querySelector('.am-glint');
          if (old && old.parentNode) old.parentNode.removeChild(old);
          if (!all[i].classList.contains('active')) continue;
          FM.glintRing(all[i], 'am-glint');   // built AND fitted in one place — see FM.glintRing (queue 304)
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
          placeGlint();
          drawBody();
        });
        tabsEl.appendChild(tb);
      });
      placeGlint();
      main.appendChild(tabsEl); main.appendChild(pinnedEl); main.appendChild(bodyEl);

      /* The rail is EMPTY of tools now. Text / Captions / Sketching / Custom shape moved into
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
    // Shift+1..4 → the instant rail: Text / Captions / Sketching / Custom shape.
    instant: function (i) { if (INSTANT[i]) INSTANT[i].add(); },
  };
})(window.FM);
