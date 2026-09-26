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
    /* ⚠️ OFF, AND OFF IS A PROMISE (queue 921 S3, spec §19.8 / §23). With this false there is no
       collaboration DOM in the page at all — no share button, no Join button, no card — and nothing in
       js/collab-*.js runs beyond defining its namespace. It is the switch the whole feature hangs off,
       so it starts where a solo user cannot feel it. The three sibling keys §4.2 lists —
       collabCursors, collabSelections, collabCodesOnly — arrive with the stages that READ them (S5
       presence, S6 the relay); a preference row that changes nothing is worse than no row. */
    collabLabs: false,
    /* S5 (§18.3, §19.8): whether the other people's pointers and taps, and their selections, are drawn
       on THIS device. Local preferences — nothing travels — and on by default, because seeing where the
       others are is the point of the feature. Each hides only its own half. */
    collabCursors: true,
    collabSelections: true,
    /* S6 (§2 D3, §14.4, §19.8): Codes only. On, and nothing on this device ever opens a socket to the
       free relay or asks a STUN server for its address — joining is by swapping connection codes, the
       fully serverless path. Off by default because the relay is what makes "tap a link and you're in"
       and the automatic reconnect work (D3 / Q1: "yes by default, with Codes only always available"). */
    collabCodesOnly: false,
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
      /* `homeLight` IS IN THIS LIST NOW, AND ITS ABSENCE WAS THE WHOLE OF #688 (Ezra: "make it actually
         remember cause currently it forgets"). save() serialises the entire state object, so the value
         was written to localStorage perfectly — and load() restores booleans through this EXPLICIT
         WHITELIST, which nobody extended when the setting was added. So it was stored and never read
         back, and reset to DEFAULTS.homeLight on every single launch.
         MEASURED before and after: set it to dark, and localStorage held `"homeLight":false` while
         FM.settings.get('homeLight') came back `true` on the next load, with data-home="light".
         ⚠️ The splash in index.html reads the SAME key straight from localStorage, before this file
         exists — so it honoured the choice correctly and then this file overrode it a moment later.
         The dark intro followed by a light home screen was the two halves disagreeing, not two bugs. */
      /* ⚠️ …AND `collabLabs` WAS MISSING FROM IT TOO — the #688 bug again (queue 921 S5). The Labs switch
         was saved on every flip and reset to off on every launch, so the collaboration feature switched
         itself off each time the app was opened; S3's test only asked whether the key EXISTED. The two
         S5 display switches join it here rather than repeating the mistake. */
      /* …and `collabCodesOnly` (S6) with them, the same day it was added — a privacy switch that reset to
         OFF on every launch would be the #688 bug with a worse consequence than a colour. */
      ['demoMode', 'showTouches', 'systemFonts', 'homeLight', 'collabLabs', 'collabCursors', 'collabSelections', 'collabCodesOnly'].forEach(k => { if (typeof saved[k] === 'boolean') state[k] = saved[k]; });
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
    /* queue 921 S3: the Labs switch owns every piece of collaboration DOM there is, so it is applied
       here — the one place that runs at boot AND on every change — rather than from the row that flips
       it. `syncLabs` builds nothing when the switch is off, and ENDS a live session if it goes off
       while one is running (a connection behind a hidden UI is worse than no switch). */
    if (FM.collab && FM.collab.ui) { try { FM.collab.ui.syncLabs(); } catch (e) {} }
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
  /* ONE BACKUP, TWO DOORS (queue 920, 24 Sep): the Settings row below, and the note an install from before the status-bar fix
     shows on Home (js/statusbar.js), whose first step is "back up". The handler was inline in the row; lifted out unchanged so
     both run the identical code, rather than a second copy of the "say what is not in it" rules. */
  FM.backupEverything = async function () {
    if (!FM.storage || !FM.storage.backupAll) return null;
    /* actionRow closes the panel before it runs the handler, so progress has to live in a toast
       rather than on the button. A library of videos takes a few seconds and silence in that gap
       reads as "nothing happened", which is how people tap a thing twice. */
    if (FM.toast) FM.toast('Packing up your projects…', 4000);
    let r = null;
    try {
      r = await FM.storage.backupAll(null);
    } catch (e) { r = { ok: false, reason: 'The backup could not be written.' }; }
    if (!r || !r.ok) { if (FM.toast) FM.toast((r && r.reason) || 'The backup could not be written.', 6000); return; }
    /* ⚠️ SAY WHAT IS NOT IN IT, EVERY TIME. A backup that quietly leaves a clip out is worse
       than no backup, because he would trust it and find out when it mattered. */
    const miss = (r.notIncluded && r.notIncluded.media) || [];
    const mb = Math.round((r.bytes || 0) / 1048576);
    /* queue 915 clause 8: drafts are counted as what they are, not as projects he would go looking for */
    const nd = r.drafts || 0, np = r.count - nd;
    let msg = 'Backed up ' + np + (np === 1 ? ' project' : ' projects') + (nd ? ' and ' + nd + (nd === 1 ? ' draft' : ' drafts') : '') + ' (' + (mb >= 1 ? mb + ' MB' : 'under 1 MB') + ').';
    /* queue 915 phase A: a clip with NO footage stored is listed too (`missing`), and it is not "too big" —
       "Clip (0 MB) was too big" would be a second lie on top of the blank. Two sentences, each true. */
    const big = miss.filter(m => !m.missing), gone = miss.filter(m => m.missing);
    if (big.length) {
      const names = big.slice(0, 3).map(m => m.file + ' (' + m.mb + ' MB)').join(', ');
      msg += ' ⚠️ ' + big.length + (big.length === 1 ? ' clip was' : ' clips were') + ' too big to include: ' + names + (big.length > 3 ? ' and more' : '') + '.';
    }
    if (gone.length) {
      const names = gone.slice(0, 3).map(m => m.file + ' in ' + m.project).join(', ');
      msg += ' ⚠️ ' + gone.length + (gone.length === 1 ? ' clip has' : ' clips have') + ' no footage stored on this device, so the file has none either: ' + names + (gone.length > 3 ? ' and more' : '') + '.';
    }
    if (miss.length) msg += ' Everything else is in the file.';
    if (FM.toast) FM.toast(msg, miss.length ? 12000 : 6000);
    return r;
  };
  /* A LABS ROW OPENS ITS CARD ON TOP OF SETTINGS, AND CLOSING THE CARD COMES BACK HERE (queue 933). Ezra: "every time I
     test something out, like one of the options and then click out, it just like completely closes the settings. So you
     have to reopen the settings and go all the way to the bottom, which is very frustrating." actionRow shuts the panel
     first because its other rows hand him the app (a backup, a sample); the collaboration cards are the opposite — each
     is a question about THIS section, and their scrim already sits above Settings' (222 over 220), so a click out lands
     on the card's scrim and closes only the card. Settings never moved, so it is exactly where he left it, scrolled to
     Labs. Two things still follow the card: a JOIN that succeeds takes him into the project, so Settings gets out of the
     way then; and anything the card changed (his name) is re-read into the row. */
  function stayRow(label, hint, btnLabel, fn, after) {
    const row = el('div', 'set-row');
    const txt = el('div', 'set-rowtext');
    txt.appendChild(el('div', 'set-label', label));
    const h = hint ? el('div', 'set-hint', hint) : null;
    if (h) txt.appendChild(h);
    const b = el('button', 'set-action', btnLabel);
    b.type = 'button';
    b.addEventListener('click', () => {
      const wasLive = !!(FM.collab && FM.collab.active);
      let seen = false;
      const mo = new MutationObserver(() => {
        const up = document.body.classList.contains('collab-card-open');
        if (up) { seen = true; return; }
        if (!seen) return;                       // the class toggling on its way UP, not the card closing
        mo.disconnect();
        if (!wasLive && FM.collab && FM.collab.active) { FM.settings.close({ handBack: false }); return; }
        if (after) after(h);
      });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      seen = document.body.classList.contains('collab-card-open');
      fn();
      if (document.body.classList.contains('collab-card-open')) seen = true;
    });
    row.appendChild(txt); row.appendChild(b);
    return row;
  }
  function actionRow(label, hint, btnLabel, fn, tone) {
    const row = el('div', 'set-row');
    const txt = el('div', 'set-rowtext');
    txt.appendChild(el('div', 'set-label', label));
    if (hint) txt.appendChild(el('div', 'set-hint', hint));
    const b = el('button', 'set-action' + (tone ? ' ' + tone : ''), btnLabel);
    b.type = 'button';
    b.addEventListener('click', () => { FM.settings.close({ handBack: false }); fn(); });
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
    b.addEventListener('click', async () => {
      const n = count();
      // No FM.toast here on purpose: #toast sits at z-index 60 and .set-scrim at 220, so a toast
      // raised from this panel would be painted behind it and never seen.
      // FM.ask (js/ask.js, queue 919), not the browser's confirm(): Settings opens from Home, and the
      // grey box ignored the light look. It sits above this panel and eats its Escape while it is up.
      if (!n || !await FM.ask({ title: 'Clear ' + label.toLowerCase(), message: describe(n) + '\n\nForget them? Projects already using a file keep it — this only clears the list.', ok: 'Clear', danger: true })) return;
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
  let _onClose = null;   // queue 930: FM.settings.openAt(…, { onClose }) — who to hand back to when Settings closes

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
    if (FM.drawnX) FM.drawnX(close, 28);   // queue 965: his pick B — the search ✕'s drawn disc at 28px, in the same 34px button
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
        actionRow('Save a project file', 'Downloads THIS project as a .fmotion.json to keep or send to someone. Clips over 6 MB are too big to fit and it will tell you which — for the footage as well, use Back up every project below.', 'Save…',
          () => press('btn-save-proj')),
      ));
      /* THE REPORTS ARE A LONG WAY DOWN IN A PROJECT (queue 785): measured at 380x800 the "Your last playback" row was
         the 16th of 19 labels, 2,121px into a 3,089px scroll. The project's own settings come first (his ask, queue 52 — its test
         holds the first row), so the row right under them says the reports exist and takes him there. */
      const jump = el('div', 'set-row set-jump');
      const jumpHead = el('div', 'set-row-head');
      jumpHead.appendChild(el('div', 'set-label', 'Reports from this device'));
      jumpHead.appendChild(el('div', 'set-hint', 'Your last playback, export, project open, scrub and blank clip — the reports the unblock list asks you to copy.'));
      const jumpBtn = el('button', 'set-action', 'Show'); jumpBtn.type = 'button';
      jumpBtn.addEventListener('click', () => { const r = document.getElementById('set-reports'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      jump.append(jumpHead, jumpBtn);
      body.appendChild(group(jump));
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

    /* ── YOUR AI KEY, IN ONE PLACE (queue 930) ───────────────────────────────────────────────────────────────────
     * Ezra: "the only way you can put in an API key is in the director menu. So basically what you should do is move it so
     * that there's a button in both pages that takes you to app settings and it takes you to a section in the app settings
     * where you put in the API key and you put it in there instead." (And, in the same breath, NOT a password lock: "we'll
     * add accounts … people will just … be protected by their account.")
     * The key still lives in ONE place — js/ai-key.js, FM.aiKey, the only module that holds it — so a key he entered in the
     * Director before this is the same key here; nothing moves in storage. This row only reads the MASKED form ("sk-ant-…a1b2")
     * and never writes the key into the page: the field is a password field, it starts empty, and it is cleared the moment
     * the key is saved. `FM.settings.openAt('aikey')` is the door the Director and the Assistant each have. */
    if (FM.aiKey) {
      const ak = el('div', 'set-row set-aikey');
      ak.id = 'set-aikey';
      const txt = el('div', 'set-rowtext');
      txt.appendChild(el('div', 'set-label', 'AI — your Anthropic key'));
      const state = el('div', 'set-hint');
      const paint = () => { state.textContent = FM.aiKey.has() ? ('Connected: ' + FM.aiKey.masked() + (FM.aiKey.remembered() ? ' · remembered on this device' : ' · for this session only')) : 'No key yet — the Director and the Assistant use it. Used only on this device, sent only to api.anthropic.com, never logged or uploaded; spend is on your own account.'; };
      paint();
      txt.appendChild(state);
      ak.appendChild(txt);
      const form = el('div', 'set-aikey-form');
      const input = el('input', 'set-aikey-input');
      input.type = 'password'; input.placeholder = 'sk-ant-…'; input.autocomplete = 'off'; input.spellcheck = false;
      input.setAttribute('autocapitalize', 'off'); input.setAttribute('aria-label', 'Anthropic API key');
      /* NOT A LOGIN (queue 930 review): a password field invites the browser and password-manager extensions to offer to save
         it — the key would then live in a vault that Forget cannot reach. These are the opt-outs the common managers honour.
         (Not autocomplete="one-time-code": on his iPhone that makes the keyboard offer SMS codes into the key field.) */
      ['data-1p-ignore', 'data-bwignore'].forEach(a => input.setAttribute(a, ''));
      input.setAttribute('data-lpignore', 'true'); input.setAttribute('data-form-type', 'other');
      const remRow = el('label', 'set-aikey-rem');
      /* Unticked for a new key, as the Director's was — a key is kept for the session unless he chooses otherwise; ticked
         only if the key he has IS remembered (queue 930 review). */
      const rem = el('input'); rem.type = 'checkbox'; rem.checked = FM.aiKey.remembered();
      remRow.appendChild(rem); remRow.appendChild(el('span', null, 'Remember on this device'));
      const save = el('button', 'set-action', 'Save key'); save.type = 'button';
      const forget = el('button', 'set-action danger', 'Forget key'); forget.type = 'button';
      const getKey = el('a', 'set-aikey-get', 'Get a key → console.anthropic.com');
      getKey.href = 'https://console.anthropic.com/settings/keys'; getKey.target = '_blank'; getKey.rel = 'noopener';
      const sync = () => { paint(); forget.classList.toggle('hidden', !FM.aiKey.has()); if (FM.aiPanel && FM.aiPanel.refreshKey) FM.aiPanel.refreshKey(); };
      /* The box means what it says the moment it changes (queue 930 review): unticking it takes a remembered key out of this
         device's storage at once, ticking it keeps the key he has — not only on the next Save. */
      rem.addEventListener('change', () => { if (FM.aiKey.has()) { FM.aiKey.set(FM.aiKey.get(), rem.checked); sync(); } });
      save.addEventListener('click', () => {
        const v = input.value.trim();
        if (!FM.aiKey.looksValid(v)) { input.classList.add('bad'); input.value = ''; input.placeholder = 'That doesn\u2019t look like an sk-ant- key'; return; }
        FM.aiKey.set(v, rem.checked);
        input.value = ''; input.classList.remove('bad'); input.placeholder = 'sk-ant-…';
        sync();
        if (FM.toast) FM.toast('Key saved — the Director and the Assistant will use it', 2200);
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save.click(); } });
      forget.addEventListener('click', async () => {
        // one tap from Save, so it asks (queue 930 review) — and a Director build running on the key is stopped, not left to fail stage by stage
        const running = !!(FM.ai && FM.ai.isRunning && FM.ai.isRunning());
        const ok = FM.ask ? await FM.ask({ title: 'Forget your key?', message: 'The Director and the Assistant stop working until you add it again.' + (running ? ' The scene being built now is stopped.' : ''), ok: 'Forget', cancel: 'Keep it', danger: true }) : true;
        if (!ok) return;
        if (running && FM.ai.cancel) FM.ai.cancel();
        FM.aiKey.forget(); rem.checked = false; sync();
        if (FM.toast) FM.toast('Key forgotten on this device', 1800);
      });
      form.appendChild(input); form.appendChild(remRow);
      const btns = el('div', 'set-aikey-btns'); btns.appendChild(save); btns.appendChild(forget);
      form.appendChild(btns); form.appendChild(getKey);
      ak.appendChild(form);
      sync();
      body.appendChild(group(ak));
    }

    // The old home ⋯ menu, rehomed. Both are app-level rather than project-level, so they belong
    // with the rest of the app's settings and work the same from Home or from inside a project.
    body.appendChild(group(
      actionRow('Import a project file', 'Open a .fmotion.json backup as a project of its own.', 'Import…',
        () => { if (FM.storage && FM.storage.importFile) FM.storage.importFile(() => { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); }); }),
      /* ── BACK UP EVERYTHING (queue 869) ────────────────────────────────────────────────────────
       * The row above saves ONE project, by hand, before anything goes wrong. These two are the
       * whole library in one file. Until now there was no backup for his projects at all — the code
       * is on GitHub and tools/rollback.sh can restore any release, but the projects live only in
       * this browser's storage on this device, and home.js says so at the delete prompt: "there is
       * no undo and no backup".
       * Deliberately a FILE HE SAVES, which is option A of #869 and the only one that changes
       * nothing about what this app is: no server, no account, nothing of his on anyone else's
       * machine. Say the word and it can become something else. */
      /* Only on an install from before the status-bar fix (queue 920) — the steps again, for whenever he is ready. */
      (FM.statusBar && FM.statusBar.staleInstall && FM.statusBar.staleInstall())
        ? actionRow('Remove the blur at the top of the screen', 'This copy was added to your Home Screen before the fix. A fresh install fixes it — the steps, with a backup first.', 'How…', () => FM.statusBar.explain(true))
        : null,
      actionRow('Back up every project', 'Writes ALL your projects into one file you keep wherever you like. Nothing is uploaded anywhere — it saves to this device like any download.', 'Back up…',
        () => FM.backupEverything()),
      actionRow('Restore from a backup', 'Adds every project from a backup file back in. It never replaces or deletes what is already here.', 'Restore…',
        () => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.json,application/json'; input.style.display = 'none';
          input.addEventListener('change', async () => {
            const file = input.files && input.files[0]; input.remove();
            if (!file) return;
            let obj = null;
            try { obj = JSON.parse(await file.text()); }
            catch (e) { if (FM.toast) FM.toast('That file is not readable — it may be truncated.', 5000); return; }
            if (FM.toast) FM.toast('Restoring…', 3000);
            const r = await FM.storage.restoreBackup(obj, null);
            if (!r.ok) { if (FM.toast) FM.toast(r.reason || 'Nothing in that file could be restored.', 6000); return; }
            const rd = r.drafts || 0, rp = r.restored - rd;   // queue 915 clause 8
            let msg = 'Restored ' + rp + (rp === 1 ? ' project' : ' projects') + (rd ? ' and ' + rd + (rd === 1 ? ' draft' : ' drafts') : '') + '.';
            if (r.failed && r.failed.length) msg += ' ' + r.failed.length + ' could not be read: ' + r.failed.slice(0, 3).join(', ') + '.';
            if (FM.toast) FM.toast(msg, 8000);
            // queue 915 clause 4: FM.home.refresh did not exist, so this line did nothing and the grid stayed stale
            if (FM.home && FM.home.refresh) FM.home.refresh();
          });
          document.body.appendChild(input); input.click();
        }),
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
        FM.settings.close({ handBack: false });     // he has to be able to USE the app while it samples
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
    }
    /* ---- THE DEVICE REPORTS ARE HERE WHETHER OR NOT A PROJECT IS OPEN (queue 785, 5 Sep). Every readout below is a
       record the app wrote about HIS DEVICE — the last playback, export, project open, scrub, blank clip — and twelve
       open items wait on him pasting one of them. They sat inside `if (inProject)` with the Measure button, so from the
       home screen's cog none of them existed, and the natural moment to look (after leaving a project that cut out or
       exported silently) found an empty panel. Only Measure needs a project to sample; the readouts need nothing. */
    {
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
      const expWrap = el('div', 'set-row set-perf'); expWrap.id = 'set-reports';   // the jump row's target (queue 785)
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
      /* ═══ LAST ERROR (queue 674) ═══════════════════════════════════════════════════════════════
       * Same shape as the two reports below it, for the same reason those exist: a message he might
       * miss is not a report. Until today a failed export alerted "Export failed: blit is not defined"
       * — a variable name, on a phone, uncopyable. The sentence he sees now says what to try; the
       * stack, the device and what he was doing live here.
       * Only rendered when there IS one: an empty "Last error" block on a healthy install is a row of
       * nothing that says something went wrong. */
      let errText = '';
      try { errText = localStorage.getItem('fm.lastError') || ''; } catch (e) {}
      if (errText) {
        const errWrap = el('div', 'set-row set-perf');
        const errOut = el('pre', 'set-perf-out');
        errOut.textContent = errText;
        const errCopy = el('button', 'set-action', 'Copy'); errCopy.type = 'button';
        errCopy.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(errOut.textContent); if (FM.toast) FM.toast('Copied \u2014 paste it to me', 3000); }
          catch (e) { try { const ta = document.createElement('textarea'); ta.value = errOut.textContent; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); if (FM.toast) FM.toast('Copied \u2014 paste it to me', 3000); } catch (e2) {} }
        });
        const errClear = el('button', 'set-action', 'Clear'); errClear.type = 'button';
        errClear.addEventListener('click', () => {
          try { localStorage.removeItem('fm.lastError'); } catch (e) {}
          errWrap.remove(); if (FM.toast) FM.toast('Cleared');
        });
        const errHead = el('div', 'set-rowtext');
        errHead.appendChild(el('div', 'set-label', 'Last error'));
        errHead.appendChild(el('div', 'set-hint', 'Something went wrong recently. This is what happened, in full \u2014 send it to me and I can usually tell you why.'));
        const errBtns = el('div', 'set-perf-btns');
        errBtns.append(errCopy, errClear);
        errWrap.append(errHead, errBtns, errOut);
        body.appendChild(group(errWrap));
      }

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

      /* ═══ "YOUR LAST PROJECT OPEN" (queue 508) ═══════════════════════════════════════
       * The open-project transition measures smooth on this machine and he says it is janky on his
       * phone — three times. home.js records every frame of the push on HIS device now; this is the
       * one place that reading can be read back and pasted. Same shape as the two rows above. */
      const opWrap = el('div', 'set-row set-perf');
      const opOut = el('pre', 'set-perf-out');
      let opText = '';
      try { opText = localStorage.getItem('fm.lastOpenReport') || ''; } catch (e) {}
      opOut.textContent = opText || 'Nothing yet \u2014 this fills in the next time you open a project from Home.';
      const opCopy = el('button', 'set-action', 'Copy'); opCopy.type = 'button'; opCopy.disabled = !opText;
      opCopy.addEventListener('click', async () => {
        const text = opOut.textContent;
        try { await navigator.clipboard.writeText(text); if (FM.toast) FM.toast('Copied \u2014 paste it to me', 3000); }
        catch (e) {
          try {
            const r = document.createRange(); r.selectNodeContents(opOut);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
            if (FM.toast) FM.toast('Selected \u2014 use Copy from the menu', 3000);
          } catch (e2) {}
        }
      });
      const opHead = el('div', 'set-rowtext');
      opHead.appendChild(el('div', 'set-label', 'Your last project open'));
      opHead.appendChild(el('div', 'set-hint', 'How smoothly the last project opened from Home \u2014 every frame of the slide, and which ones ran long. If opening feels janky on your phone, open one, come here, Copy, and paste it to me.'));
      const opBtns = el('div', 'set-perf-btns');
      opBtns.append(opCopy);
      opWrap.append(opHead, opBtns, opOut);
      body.appendChild(group(opWrap));

      /* ═══ "YOUR LAST SCRUB" (queue 768) — the scrub probe's report, same shape as the row above. */
      const scWrap = el('div', 'set-row set-perf');
      const scOut = el('pre', 'set-perf-out');
      let scText = '';
      try { scText = localStorage.getItem('fm.lastScrubReport') || ''; } catch (e) {}
      scOut.textContent = scText || 'Nothing yet \u2014 this fills in the next time you scrub the timeline.';
      const scCopy = el('button', 'set-action', 'Copy'); scCopy.type = 'button'; scCopy.disabled = !scText;
      scCopy.addEventListener('click', async () => {
        const text = scOut.textContent;
        try { await navigator.clipboard.writeText(text); if (FM.toast) FM.toast('Copied \u2014 paste it to me', 3000); }
        catch (e) {
          try { const r = document.createRange(); r.selectNodeContents(scOut); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); if (FM.toast) FM.toast('Selected \u2014 use Copy from the menu', 3000); } catch (e2) {}
        }
      });
      const scHead = el('div', 'set-rowtext');
      scHead.appendChild(el('div', 'set-label', 'Your last scrub'));
      scHead.appendChild(el('div', 'set-hint', 'How smoothly the last drag of the playhead ran \u2014 every frame, what was selected and which panel was open. If scrubbing feels jumpy on your phone, scrub once, come here, Copy, and paste it to me.'));
      const scBtns = el('div', 'set-perf-btns');
      scBtns.append(scCopy);
      scWrap.append(scHead, scBtns, scOut);
      body.appendChild(group(scWrap));

      /* ═══ "YOUR LAST BACK FROM AN EFFECTS CATEGORY" (queue 712) ═══ the phone answers the one question only it could. */
      const bkWrap = el('div', 'set-row set-perf');
      const bkOut = el('pre', 'set-perf-out');
      let bkText = '';
      try { bkText = localStorage.getItem('fm.lastBackReport') || ''; } catch (e) {}
      bkOut.textContent = bkText || 'Nothing yet \u2014 open the effects browser, go into a category, press Back, then come back here.';
      const bkCopy = el('button', 'set-action', 'Copy'); bkCopy.type = 'button'; bkCopy.disabled = !bkText;
      bkCopy.addEventListener('click', async () => {
        const text = bkOut.textContent;
        try { await navigator.clipboard.writeText(text); if (FM.toast) FM.toast('Copied \u2014 paste it to me', 3000); }
        catch (e) {
          try { const r = document.createRange(); r.selectNodeContents(bkOut); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); if (FM.toast) FM.toast('Selected \u2014 use Copy', 3000); } catch (e2) {}
        }
      });
      const bkHead = el('div', 'set-rowtext');
      bkHead.appendChild(el('div', 'set-label', 'Your last Back from an effects category'));
      bkHead.appendChild(el('div', 'set-hint', 'Whether pressing Back in the effects browser stalls the app while thumbnails build \u2014 how long until it could take a tap again, and how many tiles were queued. If Back ever freezes on your phone, send me this.'));
      const bkBtns = el('div', 'set-perf-btns');
      bkBtns.append(bkCopy);
      bkWrap.append(bkHead, bkBtns, bkOut);
      body.appendChild(group(bkWrap));

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

    /* ═══ LABS (queue 921 S3, §19.8) ═════════════════════════════════════════════════════════════════════════
     * Last but for the version line, because it is the one group whose rows can change what the app IS
     * rather than how it looks. The two sub-rows are built either way and hidden by a class rather than
     * built only when the switch is on: rebuilding this panel from inside one of its own rows means
     * closing and reopening it, and open() rebinds Escape without unbinding while a close in the same
     * frame as an open is the exact null-scrim crash the guard on open() below records. */
    if (FM.collab && FM.collab.ui) {
      const ui = FM.collab.ui;
      const me = ui.getProfile();
      const kids = el('div', 'set-labs' + (state.collabLabs ? '' : ' hidden'));
      kids.appendChild(stayRow('Your name and colour',
        me ? me.name : 'Not set yet — you are asked the first time you share or join',
        'Change…', () => ui.profile({ force: true }),
        (h) => { const p = ui.getProfile(); if (h && p && p.name) h.textContent = p.name; }));
      kids.appendChild(stayRow('Join a live project', 'Paste an invite link, or type the short code somebody read you.', 'Join…', () => ui.join()));
      /* S8 (§25.5): "Test connection". Not an actionRow — that shuts the panel, and the answer IS this row. Nothing
         is tried until the button is tapped (§23); the result is one sentence per question and the numbers behind
         them in the same copyable box the Reports use, kept as `fm.lastConnReport`. */
      if (ui.testConnection) {
        const cw = el('div', 'set-row set-perf set-conn'); cw.id = 'set-conn';
        const ch = el('div', 'set-rowtext');
        ch.appendChild(el('div', 'set-label', 'Test connection'));
        ch.appendChild(el('div', 'set-hint', 'Tries the free connection services and this device’s live connections, then says plainly what works on this network. Nothing about your projects is sent.'));
        const cb = el('div', 'set-perf-btns');
        const tb = el('button', 'set-action set-conn-go', 'Test'); tb.type = 'button';
        const cc = el('button', 'set-action', 'Copy'); cc.type = 'button';
        const lines = el('ul', 'set-conn-lines');
        const cout = el('pre', 'set-perf-out');
        let last = '';
        try { last = localStorage.getItem('fm.lastConnReport') || ''; } catch (e) {}
        cout.textContent = last || 'Nothing yet — tap Test.';
        cc.disabled = !last;
        tb.addEventListener('click', () => {
          tb.disabled = true; tb.textContent = 'Testing…';
          lines.textContent = '';
          const wait = el('li'); wait.appendChild(el('span', 'skip', '…')); wait.appendChild(el('span', null, 'Trying — this takes up to ten seconds.'));
          lines.appendChild(wait);
          ui.testConnection().then(r => {
            lines.textContent = '';
            r.lines.forEach(x => {
              const li = el('li');
              li.appendChild(el('span', x.st, x.st === 'ok' ? '✓' : x.st === 'no' ? '✕' : '–'));
              li.appendChild(el('span', null, x.text));
              lines.appendChild(li);
            });
            cout.textContent = r.report; cc.disabled = false;
          }, e => { lines.textContent = ''; const li = el('li'); li.appendChild(el('span', 'no', '✕')); li.appendChild(el('span', null, 'The test itself failed: ' + ((e && e.message) || e))); lines.appendChild(li); })
            .then(() => { tb.disabled = false; tb.textContent = 'Test again'; });
        });
        /* S8 review: the answer is SAID ON THE BUTTON. A toast from this panel is painted under .set-scrim (see the
           Clear buttons above), so "Copied" was never seen and a tap looked like it did nothing. */
        let ccT = 0;
        const ccSay = (t) => { clearTimeout(ccT); cc.textContent = t; ccT = setTimeout(() => { cc.textContent = 'Copy'; }, 1800); };
        cc.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(cout.textContent); ccSay('Copied ✓'); }
          catch (e) {
            ccSay('Select it ↓');
            try { const rg = document.createRange(); rg.selectNodeContents(cout); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg); } catch (e2) {}
          }
        });
        cb.append(tb, cc);
        cw.append(ch, cb, lines, cout);
        kids.appendChild(cw);
      }
      /* S6 (§19.8): Codes only. toggleRow → `apply()` → `syncLabs()`, which stops any relay already running
         the moment it goes on — the switch is a promise about sockets, not about the next session. */
      kids.appendChild(toggleRow('Connect with codes only', 'No free relay at all: nothing but the two devices. Invite links and short codes stop working — you swap a long code with each person instead.', 'collabCodesOnly'));
      /* S5: the two §19.8 display switches. Local to this device — they change what YOU see, never what
         the others see of you. `apply()` is not needed: presence reads the setting on every draw. */
      kids.appendChild(toggleRow('Show others’ pointers', 'Their mouse pointer and their taps, in their colour.', 'collabCursors'));
      kids.appendChild(toggleRow('Show others’ selections', 'An outline in their colour around the layers they have selected, and a ring on those clips.', 'collabSelections'));
      body.appendChild(group(
        switchRow('Live collaboration (preview)',
          /* S6 review: every third party by name — see collab-ui.js PRIVACY_LINE. */
          'Edit one project with people on other devices. Free public services — relays run by PeerJS, EMQX and HiveMQ, and Google and Cloudflare’s address lookup — help the devices find each other. They see internet addresses and when a room is in use, never your project; then the devices talk directly, encrypted. Codes only skips them all.',
          () => !!state.collabLabs,
          () => { state.collabLabs = !state.collabLabs; save(); apply(); kids.classList.toggle('hidden', !state.collabLabs); }),
        kids
      ));
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
      /* ⚠️ THE SLIDE NEVER PLAYED (#912 clause 4). The nodes above are brand new, and a rAF callback
         runs BEFORE the frame's first style pass — so by the time the browser first resolved the panel's
         style it already had `.open`, never saw translateX(-100%), and had nothing to transition from.
         Measured: panel at matrix(1,0,0,1,0,0) on the first frame, getAnimations() empty, no
         transitionrun, on phone and PC alike. Reading a layout value here resolves the closed state
         first, which is all the transition needed. */
      void panel.offsetWidth;
      requestAnimationFrame(() => { if (scrim) scrim.classList.add('open'); });
      document.body.classList.add('set-open');   // lifts #toast above the panel (queue 930 review: "Key saved" appeared behind it)
      _onClose = null;                           // a plain open never inherits a return trip; openAt sets it after this
      /* ONE Escape listener, ever (queue 690). open() on an already-open panel — openAt from the Director's or the
         Assistant's key button, a second route in — rebuilt the panel and added a SECOND listener without taking the
         first one off, and close() only removes the newest. The stranded one then answered every Escape for the rest of
         the session: preventDefault on a key nothing was listening for. That used to be harmless noise; since the
         editor now leaves an Escape that something else has already answered (js/app.js, the Escape branch), it
         silently turned Escape off everywhere after the panel had been opened twice. Measured in the suite after the
         930 test: the editor's Escape stopped reaching its handler at all. So the old one goes first, and the listener
         only answers while the panel is actually up. */
      if (escBound) document.removeEventListener('keydown', escBound);
      escBound = e => { if (e.key === 'Escape' && FM.settings.isOpen()) { e.preventDefault(); FM.settings.close(); } };
      document.addEventListener('keydown', escBound);
    },
    close(opts) {
      if (!scrim) return;
      document.body.classList.remove('set-open');
      /* The panel that sent him here comes back only when he DISMISSES Settings (✕, the scrim, Escape, the cog) — not when a
         row closes it to hand him something else (a backup, Measure, a joined project), which the AI panel would then cover
         (queue 930 review, round 2). And never over a Settings he has already reopened. */
      const back = (opts && opts.handBack === false) ? null : _onClose; _onClose = null;
      if (back) setTimeout(() => { if (FM.settings.isOpen()) return; try { back(); } catch (e) {} }, 280);   // after the slide-out
      scrim.classList.remove('open');
      if (escBound) { document.removeEventListener('keydown', escBound); escBound = null; }
      const s = scrim; scrim = null; panel = null;
      setTimeout(() => s.remove(), 260);   // after the slide-out
    },
    isOpen() { return !!scrim; },
    /* Open straight at one section (queue 930: the Director's and the Assistant's "API key" buttons). The panel is rebuilt
       on every open, so the section is looked up after it, scrolled to the top of the panel, and — with a real keyboard —
       its first field focused; on a phone a focus would throw the keyboard over the very row he came to read. */
    openAt(which, opts) {
      FM.settings.open();
      _onClose = (opts && typeof opts.onClose === 'function') ? opts.onClose : null;   // the panel that sent him here comes back
      const id = which === 'aikey' ? 'set-aikey' : String(which || '');
      const target = id && document.getElementById(id);
      if (!target) return false;
      requestAnimationFrame(() => {
        try { target.scrollIntoView({ block: 'start' }); } catch (e) {}
        target.classList.add('set-flash');
        setTimeout(() => target.classList.remove('set-flash'), 1400);
        const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
        const f = target.querySelector('input[type=password]');
        if (fine && f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
      });
      return true;
    },
    toggle() { if (FM.settings.isOpen()) FM.settings.close(); else FM.settings.open(); },   // by name, not `this`: callers pass it detached — `(FM.settings.toggle || FM.settings.open)()` — and a detached method has no `this` in strict mode   // a second tap on the button CLOSES it (queue 762)
  };

  load();
})(window.FM);
