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
    theme: 'glass',          // 'glass' = the logo-sampled Liquid Glass look | 'classic' = the original palette
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
    playbackQuality: 'auto', // 'auto' adapts to the machine | 'smooth' pins it low | 'detail' never drops
    layout: 'classic',       // 'classic' = inspector down the right | 'studio' = left rail + inspector beside
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
      if (saved.theme === 'glass' || saved.theme === 'classic') state.theme = saved.theme;
      if (['auto', 'smooth', 'detail'].indexOf(saved.playbackQuality) >= 0) state.playbackQuality = saved.playbackQuality;
      if (saved.layout === 'classic' || saved.layout === 'studio') state.layout = saved.layout;
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
    // theme-glass.css is scoped entirely to html[data-theme="glass"], so removing the attribute
    // restores the original stylesheet exactly — this is the one-tap undo for the whole look.
    document.documentElement.setAttribute('data-theme', state.theme === 'classic' ? 'classic' : 'glass');
    document.body.classList.toggle('demo-mode', !!state.demoMode);
    // Studio layout is a pure re-placement of the same four regions (see the block at the end of
    // styles.css). The class goes on unconditionally; the media query decides whether it means anything,
    // so a phone is never affected and switching costs no reflow beyond the grid itself.
    document.body.classList.toggle('layout-studio', state.layout === 'studio');
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
      body.appendChild(group(
        actionRow('Canvas', 'Size, aspect, frame rate and background — this project only.', 'Open…',
          () => press('btn-canvas')),
        /* (Loop playback is NOT here any more — queue 175. Ezra: "Get rid of loop play back out of the
           settings menu, it should only be in view options." Same rule that moved onion skin out in
           queue 122: one control, one home. Its door is the ⛶ view bar's loop button, #vb-loop, which
           is where the other watching-rather-than-editing toggles already live.) */
        /* (Onion skin is NOT here any more — queue 122. Ezra: "shouldn't onion skin not be in the view
           options and app settings? … it should just be in the three dots when you have a layer
           selected." It ghosts the SELECTED layer and drawOnionSkin() returns immediately without one,
           so a switch in a panel you can open with nothing selected was a control that could not act.
           Its one door is the layer ⋯ menu now — see FM.layerMenuItems.) */
        switchRow('Snapping (magnet)', 'Clips and keyframes stick to the playhead and to each other’s edges while you drag them.',
          () => FM.timeline && FM.timeline.isSnapping && FM.timeline.isSnapping(), () => press('btn-snap')),
        // The last thing the phone's project ⋯ held that had nowhere else to be (v6.13). It sits with
        // the other three view toggles because that is what it is — none of them change the project,
        // they change what you can SEE while you work on it. Read through FM.showGuides, never copied.
        switchRow('Guides', 'Draws safe margins and a rule-of-thirds grid over the canvas. They are for lining things up — they never appear in an export.',
          () => FM.showGuides, () => press('btn-guides')),
      ));
      // ---- and the three project ACTIONS the PC ⋯ menu was the only door to -------------------
      // Removing #btn-more finished queue 35. Most of what it held was a second copy of a control
      // already on screen (guides / export marks / preview speed / timeline zoom on the ⛶ view bar,
      // split on S and the clip's own trim handles, canvas + import + shortcuts right here) and was
      // simply deleted. These three had nowhere else on a desktop: Trim and Reset had no other call
      // site at all, and Save meant leaving the project for the home screen — on an app with no cloud
      // copy, where a .fmotion.json IS the backup. They are ACTIONS, not preferences, so they get
      // their own group rather than sitting among the switches. actionRow shuts the panel before it
      // runs the action, so each one's result (a re-drawn timeline, the browser's save sheet, the
      // reset confirm) lands on the project rather than behind this scrim.
      body.appendChild(group(
        actionRow('Project notes', 'Jot down anything about this project, and tick the ones you want to be reminded of when you export.', 'Open…',
          () => { if (FM.notepad) FM.notepad.open(); }),
        actionRow('Trim to last clip', 'Ends the project exactly where the last clip does, instead of running on into empty time.', 'Trim',
          () => press('btn-fit')),
        actionRow('Save a project file', 'Downloads this project as a .fmotion.json you can keep or re-open later. Nothing here is backed up anywhere else.', 'Save…',
          () => press('btn-save-proj')),
        /* (Reset project is gone — queue 177. Ezra: "Completely remove the reset project button, it
           doesn't need to exist anymore, someone can just delete it and make a new project." It was the
           only caller of FM.resetProject, so that function went with it rather than being left as an
           orphan nothing can reach.) */
      ));
    }

    body.appendChild(group(
      segmentRow('Appearance', 'theme', [{ label: 'Liquid', value: 'glass' }, { label: 'Classic', value: 'classic' }]),
      segmentRow('Project sorting', 'sort', [{ label: 'Date', value: 'date' }, { label: 'Name', value: 'name' }]),
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
        segmentRow('Layout', 'layout', [
          { label: 'Classic', value: 'classic' }, { label: 'Studio', value: 'studio' },
        ]),
        hintRow('Classic puts the editing panel down the right-hand side. Studio moves it next to the timeline and turns the top bar into a rail on the far left — so adding and editing is a short trip from the clips instead of a reach to the top corner, and the canvas gets the height the top bar was using. Drag the top edge of the bottom band to trade canvas height for editing room.'),
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
