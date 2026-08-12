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
        switchRow('Loop playback', 'Playback restarts from the beginning instead of stopping at the end.',
          () => FM.loop, () => press('btn-loop')),
        switchRow('Onion skin', 'Ghosts the selected layer where it was just before and just after now (past cyan, future red) — for lining up an animation.',
          () => FM.onionSkin, () => press('btn-onion')),
        switchRow('Snapping (magnet)', 'Clips and keyframes stick to the playhead and to each other’s edges while you drag them.',
          () => FM.timeline && FM.timeline.isSnapping && FM.timeline.isSnapping(), () => press('btn-snap')),
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
        actionRow('Trim to last clip', 'Ends the project exactly where the last clip does, instead of running on into empty time.', 'Trim',
          () => press('btn-fit')),
        actionRow('Save a project file', 'Downloads this project as a .fmotion.json you can keep or re-open later. Nothing here is backed up anywhere else.', 'Save…',
          () => press('btn-save-proj')),
        actionRow('Reset project', 'Deletes every layer in this project and leaves it blank. Cannot be undone.', 'Reset…',
          () => { if (confirm('Reset the project? This clears all layers and cannot be undone.') && FM.resetProject) FM.resetProject(); }, 'danger'),
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
    ));
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
