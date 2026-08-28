/* FreeMotion — app settings (the home-screen cog).
 * A small persisted preferences store plus the slide-in panel that edits it. Everything here is
 * app-wide and survives across projects; per-project things (canvas size, fps, background) live in
 * Canvas settings instead.
 *
 * Only the preferences that mean something in a local, browser-based editor are here — there's no
 * account, no analytics and no socials to link, so those rows from other editors are simply absent.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const KEY = 'fm.settings';
  const DEFAULTS = {
    sort: 'date',            // home list order: 'date' (recently edited) | 'name' (A–Z)
    theme: 'glass',          // the only look there is now — the Classic option went in queue 178
    demoMode: false,         // hide personal media previews + filenames (for screen recordings)
    showTouches: false,      // draw a ripple where you tap, so a recording shows what you pressed
    systemFonts: true,       // include the built-in font list in the text font picker
    layerDuration: 5,        // seconds given to a newly added photo / text / shape / drawing
    /* 'random' (a fresh vivid hue per shape, which is what the app has always done) or a '#rrggbb'
     * every new shape starts in. Queue 142 — Ezra: "make a setting to change the default colour of
     * shapes when you import them. Applied to every shape."
     * Read at CREATION only, by FM.defaultShapeFill(). A shape arriving from a saved project, a
     * template, an element or an import carries its own fill and is never touched — recolouring
     * someone's saved element to your preference would be wrong, and is the one exemption this
     * setting has to make. */
    shapeColor: 'random',
    /* THE WHITE HOME SCREEN (queue 615). Ezra: "I wanna try a white background for the home menu…
     * make sure there's a way to switch back incase".
     * ⚠️ THE ESCAPE HATCH IS A SETTING, NOT A NOTE, because he asked for one and because he cannot
     * edit code — a flag only Claude can flip is not "a way to switch back" for him. Default OFF: he
     * said "I wanna TRY", which is not a decision, so the app he opens tomorrow is the app he knows
     * until he says otherwise. */
    /* ⚠️ DEFAULT FLIPPED TO ON at v13.62 (queue 639). He asked to SEE it — *"I just wanna see how it
     * looks as soon as possible because that's important to me"* — and a look that is off by default
     * is a look he has to go and find. The switch below turns the whole thing off in one tap, which is
     * still the escape hatch he asked for in #615; what changed is which side it starts on. */
    homeLight: true,
    playbackQuality: 'auto', // 'auto' adapts to the machine | 'smooth' pins it low | 'detail' never drops
    /* ONE desktop layout (queue 249). Ezra: "I just want two layouts not three."
     * There were three in practice — phone, studio, and classic — because classic was the DEFAULT and
     * the choice lives in each browser's own storage. His laptop had studio saved from when we built
     * it; his ultrawide, a different machine, still had the classic default; and a phone held sideways
     * is over 700px so it took the desktop path and got classic too. Exactly the "amalgamation of the
     * old one" he described.
     * Studio is the one he asked me to build, so studio is the one that stays. */
    layout: 'studio',
                             // the timeline. Desktop only: the CSS is gated behind (min-width: 701px), so a
                             // phone keeps its sheet layout whatever this says.
  };
  const DURATIONS = [0.5, 1, 2, 3, 5, 10, 15];

  let state = Object.assign({}, DEFAULTS);
  const listeners = [];

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    state = Object.assign({}, DEFAULTS);
    if (saved && typeof saved === 'object') {
      // validate every field — this is hand-editable storage, and layerDuration feeds layer maths
      if (saved.sort === 'name' || saved.sort === 'date') state.sort = saved.sort;
      // A stored 'classic' from before queue 178 is ignored rather than honoured: the option is gone,
      // and a saved value is the one way someone could still be looking at a look with no way back.
      if (['auto', 'smooth', 'detail'].indexOf(saved.playbackQuality) >= 0) state.playbackQuality = saved.playbackQuality;
      /* `layout` is not read from saved settings any more (queue 293). Queue 249 removed the switch and
       * migrated every saved 'classic' to 'studio'; 293 deleted the Classic CSS itself, so there is one
       * layout and nothing left for a stored value to select. An old settings blob still carrying
       * layout:'classic' is simply ignored rather than migrated, because there is no longer a second
       * thing it could mean. */
      ['demoMode', 'showTouches', 'systemFonts'].forEach(k => { if (typeof saved[k] === 'boolean') state[k] = saved[k]; });
      const d = +saved.layerDuration;
      if (isFinite(d) && d > 0 && d <= 60) state.layerDuration = d;
      // hand-editable storage, and this string is handed straight to a canvas fillStyle
      if (saved.shapeColor === 'random' || /^#[0-9a-f]{6}$/i.test(String(saved.shapeColor || ''))) {
        state.shapeColor = saved.shapeColor === 'random' ? 'random' : String(saved.shapeColor).toLowerCase();
      }
    }
    return state;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  // Everything that reacts to a setting reads it through here, so a change is applied in one place.
  function apply() {
    /* theme-glass.css is scoped entirely to html[data-theme="glass"], which is why this attribute has
       to be SET rather than assumed — with it absent the app falls back to the bare stylesheet, which
       is exactly the Classic look queue 178 removed. Ezra: "Get rid of the classic theme option." */
    document.documentElement.setAttribute('data-theme', 'glass');
    document.body.classList.toggle('demo-mode', !!state.demoMode);
    /* ⚠️ ON THE ROOT, NOT ON #home-screen (queue 615). The home screen is torn down and rebuilt, and
       the splash sits OUTSIDE it — an attribute on the element would be lost on every rebuild and
       could never reach anything painted before home exists. One attribute on <html> is also what
       makes reverting one line of CSS scoping rather than a hunt. */
    document.documentElement.setAttribute('data-home', state.homeLight ? 'light' : 'dark');
    /* The `layout-studio` class is GONE (queue 293). It marked one of two desktop layouts; the other has
       been deleted from the stylesheet, so the class selected nothing and applying it said something
       about the app that was no longer true. Verified before removing it: with the Classic rules gone,
       #app and all four regions measure identically with and without the class. */
    touchRipples(state.showTouches);
    listeners.forEach(fn => { try { fn(state); } catch (e) {} });
  }

  /* ---------- Show touches: a ripple under the pointer, for screen recordings ---------------- */
  let rippleBound = false;
  function onPointerDown(e) {
    const r = document.createElement('div');
    r.className = 'touch-ripple';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 620);   // outlives the 600ms animation
  }
  function touchRipples(on) {
    if (on && !rippleBound) { document.addEventListener('pointerdown', onPointerDown, true); rippleBound = true; }
    else if (!on && rippleBound) { document.removeEventListener('pointerdown', onPointerDown, true); rippleBound = false; }
  }

  /* ---------- the panel ---------------------------------------------------------------------- */
  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }
  function group(...kids) { const g = el('div', 'set-group'); kids.forEach(k => k && g.appendChild(k)); return g; }

  // A switch whose state is READ back from wherever it really lives, and whose press is handed to
  // whoever really owns it. A stored preference is just the case where both are this module (see
  // toggleRow); the project toggles below own theirs in app.js and timeline.js, and are never copied.
  function switchRow(label, hint, get, toggle) {
    const row = el('div', 'set-row');
    const txt = el('div', 'set-rowtext');
    txt.appendChild(el('div', 'set-label', label));
    if (hint) txt.appendChild(el('div', 'set-hint', hint));
    const sw = el('button', 'set-switch');
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    const sync = () => { const on = !!get(); sw.classList.toggle('on', on); sw.setAttribute('aria-checked', on ? 'true' : 'false'); };
    sw.setAttribute('aria-label', label);
    sw.appendChild(el('span', 'set-knob'));
    sw.addEventListener('click', () => { toggle(); sync(); });
    sync();
    row.appendChild(txt); row.appendChild(sw);
    return row;
  }

  function toggleRow(label, hint, key) {
    return switchRow(label, hint, () => state[key], () => { state[key] = !state[key]; save(); apply(); });
  }

  function segmentRow(label, key, options) {
    const row = el('div', 'set-row');
    row.appendChild(el('div', 'set-label', label));
    const seg = el('div', 'set-seg');
    options.forEach(o => {
      const b = el('button', 'set-segbtn' + (state[key] === o.value ? ' on' : ''), o.label);
      b.type = 'button';
      b.setAttribute('aria-pressed', state[key] === o.value ? 'true' : 'false');
      b.addEventListener('click', () => {
        state[key] = o.value; save();
        seg.querySelectorAll('.set-segbtn').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        apply();
      });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    return row;
  }

  // A row whose control is a button that DOES something, rather than storing a preference. Added so
  // the home screen's ⋯ menu could be emptied into here (Ezra: "Put the options that show up in the
  // three dots that are in the home menu specifically inside the menus settings cog menu") — a
  // two-item overflow menu next to a settings cog was two front doors to the same cupboard.
  // `tone` marks a destructive one red (Reset project) so it never reads as one more neutral button
  // in a column of them — the same warning the ⋯ menu's `danger` flag used to carry.
  function actionRow(label, hint, btnLabel, fn, tone) {
    const row = el('div', 'set-row');
    const txt = el('div', 'set-rowtext');
    txt.appendChild(el('div', 'set-label', label));
    if (hint) txt.appendChild(el('div', 'set-hint', hint));
    const b = el('button', 'set-action' + (tone ? ' ' + tone : ''), btnLabel);
    b.type = 'button';
    b.addEventListener('click', () => { FM.settings.close(); fn(); });
    row.appendChild(txt); row.appendChild(b);
    return row;
  }

  function hintRow(text) {
    const row = el('div', 'set-row');
    row.appendChild(el('div', 'set-hint', text));
    return row;
  }

  // A row that FORGETS something, and stays put while it does. Deliberately not actionRow:
  //   · actionRow shuts the panel before it runs, which is right for anything whose result is on the
  //     screen behind (Trim, Save…, Reset). Here the result IS this row — the count in the hint is the
  //     whole confirmation — so closing would hide the only feedback there is.
  //   · clearing songs is usually followed by clearing clips. Re-opening Settings between the two
  //     would be a silly thing to make someone do.
  // Disabled at zero rather than hidden: a row that disappears once it is empty is a row you cannot
  // find again to check, and "Songs — nothing remembered yet" is itself the answer to "is it clear?".
  function clearRow(label, describe, count, doClear) {
    const row = el('div', 'set-row');
    const txt = el('div', 'set-rowtext');
    txt.appendChild(el('div', 'set-label', label));
    const hint = el('div', 'set-hint');
    txt.appendChild(hint);
    const b = el('button', 'set-action danger', 'Clear');
    b.type = 'button';
    b.setAttribute('aria-label', 'Clear ' + label.toLowerCase());
    const sync = () => {
      const n = count();
      hint.textContent = describe(n);
      b.disabled = !n;
    };
    b.addEventListener('click', () => {
      const n = count();
      // No FM.toast here on purpose: #toast sits at z-index 60 and .set-scrim at 220, so a toast
      // raised from this panel would be painted behind it and never seen.
      if (!n || !confirm(describe(n) + '\n\nForget them? Projects already using a file keep it — this only clears the list.')) return;
      doClear();
      sync();
    });
    sync();
    row.appendChild(txt); row.appendChild(b);
    return row;
  }

  function selectRow(label, hint, key, values, fmt) {
    const row = el('div', 'set-row');
    const txt = el('div', 'set-rowtext');
    txt.appendChild(el('div', 'set-label', label));
    if (hint) txt.appendChild(el('div', 'set-hint', hint));
    const sel = el('select', 'set-select');
    sel.setAttribute('aria-label', label);
    values.forEach(v => { const o = document.createElement('option'); o.value = String(v); o.textContent = fmt(v); if (v === state[key]) o.selected = true; sel.appendChild(o); });
    sel.addEventListener('change', () => { state[key] = +sel.value; save(); apply(); });
    row.appendChild(txt); row.appendChild(sel);
    return row;
  }

  /* Default shape colour (queue 142). Two states, not one, which is why this is not a plain colour
   * input: 'random' is a real choice and the app's long-standing behaviour, so it needs somewhere to
   * live and a way back to it. The swatch shows the current answer — a solid fill, or a spectrum when
   * it is random — and the Random button doubles as the reset. */
  function shapeColorRow() {
    const row = el('div', 'set-row');
    const txt = el('div', 'set-rowtext');
    txt.appendChild(el('div', 'set-label', 'Default shape colour'));
    const hint = el('div', 'set-hint');
    txt.appendChild(hint);

    const wrap = el('div', 'set-colorwrap');
    const input = el('input', 'set-color');
    input.type = 'color';
    input.setAttribute('aria-label', 'Default shape colour');
    const rnd = el('button', 'set-segbtn set-color-rnd', 'Random');
    rnd.type = 'button';

    const sync = () => {
      const isRnd = state.shapeColor === 'random';
      // A colour input cannot display "random", so the wrapper paints the spectrum behind it and the
      // input itself goes transparent — the swatch still opens the picker, which is what you want.
      wrap.classList.toggle('is-random', isRnd);
      input.value = isRnd ? '#29d9bb' : state.shapeColor;   // a sensible starting point if they open it
      rnd.classList.toggle('on', isRnd);
      rnd.setAttribute('aria-pressed', isRnd ? 'true' : 'false');
      hint.textContent = isRnd
        ? 'Every new shape gets its own bright colour. Tap the swatch to pick one instead.'
        : 'Every new shape starts ' + state.shapeColor + '. Shapes already on a timeline keep their colours, and saved elements and templates keep theirs.';
    };
    input.addEventListener('input', () => { state.shapeColor = String(input.value).toLowerCase(); save(); sync(); });
    rnd.addEventListener('click', () => { state.shapeColor = 'random'; save(); sync(); });
    sync();

    wrap.appendChild(input);
    row.appendChild(txt);
    const ctl = el('div', 'set-colorctl');
    ctl.appendChild(wrap); ctl.appendChild(rnd);
    row.appendChild(ctl);
    return row;
  }

  let panel = null, scrim = null, escBound = null;

  function build() {
    scrim = el('div', 'set-scrim');
    panel = el('aside', 'set-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Settings');

    const head = el('div', 'set-head');
    head.appendChild(el('div', 'set-title', 'Settings'));
    const close = el('button', 'set-close', '✕');
    close.type = 'button'; close.setAttribute('aria-label', 'Close settings');
    close.addEventListener('click', () => FM.settings.close());
    head.appendChild(close);

    const body = el('div', 'set-body');

    // ---- THIS PROJECT (queue 52 + 35) --------------------------------------------------------
    // Ezra: "PC: the settings cog opens the wrong settings menu in a project." It did: inside a
    // project the cog opened this panel with only APP-wide, home-screen preferences in it —
    // appearance, project sorting, import a file — and nothing whatsoever about the project you were
    // looking at, while the project's own settings sat behind the ⋯ button 40px to its left.
    // So the cog leads with the project when there IS one. Loop / Onion skin / Snapping move in with
    // it (queue 35: they are settings, not actions) and leave the PC ⋯ menu — the same relocation the
    // home screen's ⋯ menu already made into this panel. Each one is read and written through the
    // control that owns it, never copied: a second copy of "is snapping on" is how the ⋯ menu used to
    // show the wrong tick.
    const inProject = !(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (inProject) {
      const press = (id) => { const b = document.getElementById(id); if (b) b.click(); };
      /* THE PROJECT SWITCHES ARE GONE FROM THIS PANEL (queue 308, 309, 310), and he closed the obvious
         worry himself before it could be raised: *"They all have homes and don't need to be repeated
         there"*. Each one was checked against its survivor before its row was deleted, because that is
         the half he cannot verify from his side:
         · **Canvas** — *"we don't need the Canva settings button"*. Lives on both bars: #btn-canvas on
           the desktop rail and #m-settings on the phone's, both visible, both opening the same dialog.
         · **Snapping (magnet)** — *"we don't need the snapping magnet button"*. Lives on the ⛶ view bar
           as #vb-snap, which presses #btn-snap and reads its state back, so the two cannot disagree.
         · **Guides** — *"it has the show guide button but we don't need that there because it's already
           got a place"*. He is right: #vb-guides, on the same view bar, driving the same FM.showGuides.
         · **Trim to last clip** — *"it automatically does that now we don't need that any more"*. Also
           right, and worth recording because it is the one with no survivor: FM.autoFitDuration runs
           inside refreshAll and the comment on it says the timeline length always tracks the clips, so
           the button was re-doing on demand what already happens on every change. Removing this row
           leaves #btn-fit with no door at all, which is deliberate rather than an oversight — the
           button and its handler are left in place rather than ripped out mid-session, and that is
           noted here so the next pass knows it is dead weight and not a control someone lost.
         What is left in this panel for a project is the one thing that genuinely has nowhere else on a
         desktop: saving a .fmotion.json. On an app with no cloud copy, that file IS the backup. */
      body.appendChild(group(
        actionRow('Save a project file', 'Downloads this project as a .fmotion.json you can keep or re-open later. Nothing here is backed up anywhere else.', 'Save…',
          () => press('btn-save-proj')),
      ));
    }

    body.appendChild(group(
      /* (Appearance is gone — queue 178. It was a two-way Liquid|Classic switch, and with Classic
         removed a segmented control with one segment is not a control. The layout row below is a
         DIFFERENT setting that happens to share the word: Classic|Studio is where the inspector sits,
         and it stays.) */
      segmentRow('Project sorting', 'sort', [{ label: 'Date', value: 'date' }, { label: 'Name', value: 'name' }]),
      /* Sits WITH project sorting because both are "how the home screen behaves", and because this is
         the switch queue 615 promised him — it has to be somewhere he can find it without being told. */
      /* ONE SWITCH FOR THE WHOLE LOOK (queue 639). It started as just the background; it now also
         chooses the intro film and the wordmark's ink, because those three were made for each other —
         his new intro literally ends on white. Three separate toggles would be three ways to end up
         with a mismatched app. */
      toggleRow('New light look', 'White projects screen with the top bar\u2019s colour bleeding into it, the new intro, and the new logo. Turn this off to go back to the dark look. The editor is unaffected either way.', 'homeLight'),
    ));
    body.appendChild(group(
      toggleRow('Demo mode', 'Hides your photo and video previews (and their filenames) in the Add menu — so a screen recording never shows your camera roll.', 'demoMode'),
      toggleRow('Show touches', 'Draws a ring where you tap. Screen recordings don’t capture taps on their own.', 'showTouches'),
      toggleRow('Show system fonts', 'Off = the text font picker lists only fonts you imported.', 'systemFonts'),
      selectRow('Default layer duration', 'How long a new photo, text, shape or drawing lasts. Video clips always use their own length.', 'layerDuration', DURATIONS, v => (v < 1 ? v + 's' : v + 's')),
      shapeColorRow(),   // sits with layer duration: both answer "what is a NEW layer like?"
    ));

    // ---- Import history (Ezra: "a setting that lets you clear the songs and media history that shows
    // up after you import files") ---------------------------------------------------------------
    // The Add menu remembers every file you have ever imported and shows it as a one-tap tile, because
    // a browser cannot read your camera roll and the picker is the only way in (see medialib.js). That
    // is the right default and it is also how a dozen throwaway test clips end up being the first thing
    // on screen forever. Long-pressing a tile has always forgotten ONE; this is the bulk door.
    // Songs and clips get their own button because they live in two different tabs and it is usually
    // one of them you want gone. It sits directly under Demo mode, which hides these same tiles for a
    // screen recording — same subject, one row apart, so whichever one you came looking for is here.
    if (FM.mediaLib && FM.mediaLib.counts) {
      const n = FM.mediaLib.counts();
      body.appendChild(group(
        clearRow('Songs',
          c => c ? c + (c === 1 ? ' song' : ' songs') + ' remembered from past imports' : 'No songs remembered',
          () => FM.mediaLib.counts().audio, () => FM.mediaLib.clear('audio')),
        clearRow('Photos & videos',
          c => c ? c + (c === 1 ? ' file' : ' files') + ' remembered from past imports' : 'No photos or videos remembered',
          () => FM.mediaLib.counts().visual, () => FM.mediaLib.clear('visual')),
        hintRow(n.total
          ? 'These are the tiles in Add → Media and Add → Audio. Clearing forgets the shortcut only: a project already using a file keeps it, and the file is deleted from this device once no project needs it.'
          : 'Files you import appear here as one-tap tiles in Add → Media and Add → Audio, so you never have to go back through the file picker for something you have already used.'),
      ));
    }
    body.appendChild(group(
      segmentRow('Playback quality', 'playbackQuality', [
        { label: 'Auto', value: 'auto' }, { label: 'Smooth', value: 'smooth' }, { label: 'Sharp', value: 'detail' },
      ]),
      hintRow('While playing, the preview renders at a lower resolution so the playhead keeps time, then snaps back to full detail the moment you pause. Auto measures your machine and uses as much detail as it can hold — Smooth pins it low for a slow device, Sharp never trades quality (for a fast computer).'),
    ));
    // Desktop only — the Studio grid lives behind the same (min-width: 701px) gate, so offering the
    // choice on a phone would be a switch that does nothing.
    if (!window.matchMedia || window.matchMedia('(min-width: 701px)').matches) {
      body.appendChild(group(
        /* The Classic/Studio switch is GONE (queue 249) — a third layout you could land on by accident
           is the whole of what he reported. The hint below keeps the part that is still true and still
           useful: what studio is, and that the band is draggable. */
        hintRow('The editing panel sits next to the timeline, with the top bar as a rail down the far left — so adding and editing is a short trip from the clips instead of a reach to the top corner, and the canvas gets the height the top bar was using. Drag the top edge of the bottom band to trade canvas height for editing room.'),
      ));
    }

    // The old home ⋯ menu, rehomed. Both are app-level rather than project-level, so they belong
    // with the rest of the app's settings and work the same from Home or from inside a project.
    body.appendChild(group(
      actionRow('Import a project file', 'Open a .fmotion.json backup as a project of its own.', 'Import…',
        () => { if (FM.storage && FM.storage.importFile) FM.storage.importFile(() => { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); }); }),
      actionRow('Keyboard shortcuts', 'The full list, including the ones that have no button.', 'Show',
        () => { if (FM.shortcuts) FM.shortcuts.toggle(); }),
    ));

    /* ---- "What's slow" (queue 202, and the thing #125 and #95 are both waiting on) -------------
     * Three separate lag reports have now died the same death: measured on this Mac, found fine,
     * moved on. #125 says it outright — "every time lag comes up I have measured on THIS machine,
     * found acceptable numbers, and moved on" — and #202's own measurement ends with the only useful
     * next step being "the same measurement running ON HIS PHONE".
     *
     * The numbers already exist (FM._perfState, FM.playbackQualityInfo). What has never existed is a
     * way for Ezra to SEE them on the device that is actually struggling and send them over. That is
     * all this is: sample while he does the slow thing, then one button that copies a block of text.
     * Deliberately not a graph — the point is a report that can be pasted into a message. */
    if (inProject) {
      const perfWrap = el('div', 'set-row set-perf');
      const perfOut = el('pre', 'set-perf-out');
      perfOut.textContent = 'Press Measure, then use the app normally for ten seconds.';
      const perfBtn = el('button', 'set-action', 'Measure');
      perfBtn.type = 'button';
      const copyBtn = el('button', 'set-action', 'Copy'); copyBtn.type = 'button'; copyBtn.disabled = true;
      let last = '';
      perfBtn.addEventListener('click', () => {
        if (perfBtn.disabled) return;
        perfBtn.disabled = true; copyBtn.disabled = true;
        FM.settings.close();                       // he has to be able to USE the app while it samples
        /* One definition of "measure", shared with the automatic offer that fires when playback is
           struggling (js/app.js). It stores the report; this panel reads it back from storage when
           reopened, which is what the `stored` branch below already does. */
        if (FM.startPerfMeasure) FM.startPerfMeasure(10000);
      });
      copyBtn.addEventListener('click', async () => {
        const text = last || perfOut.textContent;
        try { await navigator.clipboard.writeText(text); if (FM.toast) FM.toast('Copied — paste it to me', 2200); }
        catch (e) {
          /* Clipboard access needs a secure context and a user gesture, and on iOS it can still
             refuse. Selecting the text is the fallback that always works — he can then use the
             system Copy — rather than a toast saying it failed and leaving him stuck. */
          try {
            const r = document.createRange(); r.selectNodeContents(perfOut);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
            if (FM.toast) FM.toast('Selected — use Copy from the menu', 3000);
          } catch (e2) {}
        }
      });
      let stored = '';
      try { stored = localStorage.getItem('fm.lastPerfReport') || ''; } catch (e) {}
      if (stored) { perfOut.textContent = stored; last = stored; copyBtn.disabled = false; }
      const perfHead = el('div', 'set-rowtext');
      perfHead.appendChild(el('div', 'set-label', 'What\u2019s slow'));
      perfHead.appendChild(el('div', 'set-hint', 'Measures the preview for ten seconds while you use the app, then gives you a block of text to send me. Nothing leaves the device on its own.'));
      const perfBtns = el('div', 'set-perf-btns');
      perfBtns.append(perfBtn, copyBtn);
      perfWrap.append(perfHead, perfBtns, perfOut);
      body.appendChild(group(perfWrap));

      /* ---- "Your last export" (queue 604 / 215 / 662) ------------------------------------------
       * He has reported a silent export four times, and every round died the same way: everything
       * measurable on a desktop is healthy, and the device it happens on cannot be inspected. On
       * 28 Aug he settled the biggest unknown himself — the export bug is MOBILE ONLY; his PC exports
       * fine — which retires the "both devices" premise those entries were built on.
       * The exporter has always known exactly why a soundtrack was dropped. It said so in a toast, and
       * queue 215 then found every one of those toasts was painted BEHIND the export overlay. This is
       * the same information written down instead of flashed: whether a track was written, which of the
       * five drop reasons fired, whether the browser even HAS an AudioEncoder, and what the mix peaked
       * at. Same shape as "What's slow" above, for the same reason — that one is the only thing that
       * ever moved the lag reports along. */
      const expWrap = el('div', 'set-row set-perf');
      const expOut = el('pre', 'set-perf-out');
      let expText = '';
      try { expText = localStorage.getItem('fm.lastExportReport') || ''; } catch (e) {}
      expOut.textContent = expText || 'Nothing yet — export something and this will say what happened to the sound.';
      const expCopy = el('button', 'set-action', 'Copy'); expCopy.type = 'button'; expCopy.disabled = !expText;
      expCopy.addEventListener('click', async () => {
        const text = expOut.textContent;
        try { await navigator.clipboard.writeText(text); if (FM.toast) FM.toast('Copied — paste it to me', 3000); }
        catch (e) {
          try {
            const r = document.createRange(); r.selectNodeContents(expOut);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
            if (FM.toast) FM.toast('Selected — use Copy from the menu', 3000);
          } catch (e2) {}
        }
      });
      const expHead = el('div', 'set-rowtext');
      expHead.appendChild(el('div', 'set-label', 'Your last export'));
      expHead.appendChild(el('div', 'set-hint', 'What happened to the sound the last time you exported \u2014 including whether this browser can encode audio at all. If an export comes out silent, this is the thing to send me.'));
      const expBtns = el('div', 'set-perf-btns');
      expBtns.append(expCopy);
      expWrap.append(expHead, expBtns, expOut);
      body.appendChild(group(expWrap));

      /* ═══ "YOUR LAST PLAYBACK" — the number three entries have been waiting weeks for ═══════════
       * #95 ("the audios don't play smoothly"), #96 ("adding a SONG… sometimes will not play at all")
       * and #663 ("audio still doesn't play consistently on mobile, it cuts in and out") all end on
       * the same sentence: this needs a measurement from HIS phone. Everything measurable has been
       * measured here, at 4x and 6x CPU throttle, and none of it reproduces what he describes.
       * js/audio-health.js watches whether an element that should be making sound actually advanced
       * — a stall that leaves no trace in any existing counter — and this is where he reads it.
       * Same shape as "Your last export" directly above, for the same reason: a toast he might miss
       * is not a report, and these three entries have already proved that a number nobody can reach
       * is a number that changes nothing. */
      const audWrap = el('div', 'set-row set-perf');
      const audOut = el('pre', 'set-perf-out');
      let audText = '';
      try { audText = localStorage.getItem('fm.lastAudioReport') || ''; } catch (e) {}
      audOut.textContent = audText || 'Nothing yet \u2014 play something with sound in it, press stop, then come back here.';
      const audCopy = el('button', 'set-action', 'Copy'); audCopy.type = 'button'; audCopy.disabled = !audText;
      audCopy.addEventListener('click', async () => {
        const text = audOut.textContent;
        try { await navigator.clipboard.writeText(text); if (FM.toast) FM.toast('Copied \u2014 paste it to me', 3000); }
        catch (e) {
          try {
            const r = document.createRange(); r.selectNodeContents(audOut);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
            if (FM.toast) FM.toast('Selected \u2014 use Copy from the menu', 3000);
          } catch (e2) {}
        }
      });
      const audHead = el('div', 'set-rowtext');
      audHead.appendChild(el('div', 'set-label', 'Your last playback'));
      audHead.appendChild(el('div', 'set-hint', 'Whether the sound actually kept playing, and what the app saw when it did not. If audio cuts in and out on your phone, play it, press stop, then send me this.'));
      const audBtns = el('div', 'set-perf-btns');
      audBtns.append(audCopy);
      audWrap.append(audHead, audBtns, audOut);
      body.appendChild(group(audWrap));

      /* ═══ "A CLIP WITH NO PICTURE" (queue 129) ═════════════════════════════════════════════════
       * That entry's last question is put to HIM — "what does the FILE say, .mov or .mp4? A .mov
       * points at the container, an .mp4 at the codec, and the two need different fixes." The app
       * has been working that out every single time it happens and throwing it away into a toast and
       * a console line, on a bug he has reported from a PHONE twice. Now it is written down, with the
       * codec table asked of HIS browser rather than of Chrome — which is the half the 27 Aug
       * measurement could not supply, since codec support is per-browser and the two are reversed
       * between Safari and Chrome. */
      const bcWrap = el('div', 'set-row set-perf');
      const bcOut = el('pre', 'set-perf-out');
      let bcText = '';
      try { bcText = localStorage.getItem('fm.lastBlankClip') || ''; } catch (e) {}
      bcOut.textContent = bcText || 'Nothing yet \u2014 this fills in if a video ever lands on the timeline with no picture.';
      const bcCopy = el('button', 'set-action', 'Copy'); bcCopy.type = 'button'; bcCopy.disabled = !bcText;
      bcCopy.addEventListener('click', async () => {
        const text = bcOut.textContent;
        try { await navigator.clipboard.writeText(text); if (FM.toast) FM.toast('Copied \u2014 paste it to me', 3000); }
        catch (e) {
          try {
            const r = document.createRange(); r.selectNodeContents(bcOut);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
            if (FM.toast) FM.toast('Selected \u2014 use Copy from the menu', 3000);
          } catch (e2) {}
        }
      });
      const bcHead = el('div', 'set-rowtext');
      bcHead.appendChild(el('div', 'set-label', 'A clip with no picture'));
      bcHead.appendChild(el('div', 'set-hint', 'If a video sits on the timeline but shows nothing, this says what the file was and what this browser will and will not play. Send it to me and I will know which fix it needs.'));
      const bcBtns = el('div', 'set-perf-btns');
      bcBtns.append(bcCopy);
      bcWrap.append(bcHead, bcBtns, bcOut);
      body.appendChild(group(bcWrap));
    }

    const foot = el('div', 'set-foot');
    const ver = document.querySelector('.ver');
    foot.textContent = 'FreeMotion ' + (ver ? ver.textContent.trim() : '') + ' · everything stays on this device';
    body.appendChild(foot);

    panel.appendChild(head); panel.appendChild(body);
    scrim.addEventListener('pointerdown', e => { if (e.target === scrim) FM.settings.close(); });
    scrim.appendChild(panel);
    document.body.appendChild(scrim);
  }

  FM.settings = {
    init() { load(); apply(); },
    get(k) { return k ? state[k] : Object.assign({}, state); },
    set(k, v) { state[k] = v; save(); apply(); },
    // subscribe to changes (home re-sorts, the add menu redraws, …)
    onChange(fn) { if (typeof fn === 'function') listeners.push(fn); },
    open() {
      if (!scrim) build();
      // rebuild the controls each open so they always show the live values
      scrim.remove(); scrim = null; panel = null; build();
      // guard: close() nulls scrim, and a close in the SAME frame as the open (a double-tap, or a
      // script driving both) left this callback holding a dead reference — "Cannot read properties
      // of null (reading 'classList')". Harmless to skip: if it's already closed there is nothing to
      // animate open. Surfaced by the new PC settings cog making open/close reachable back-to-back.
      requestAnimationFrame(() => { if (scrim) scrim.classList.add('open'); });
      escBound = e => { if (e.key === 'Escape') { e.preventDefault(); FM.settings.close(); } };
      document.addEventListener('keydown', escBound);
    },
    close() {
      if (!scrim) return;
      scrim.classList.remove('open');
      if (escBound) { document.removeEventListener('keydown', escBound); escBound = null; }
      const s = scrim; scrim = null; panel = null;
      setTimeout(() => s.remove(), 260);   // after the slide-out
    },
    isOpen() { return !!scrim; },
  };

  load();
})(window.FM);
