/* FreeMotion — full-screen Add-Effect browser (Alight Motion style): search · auto-scrolling featured
 * carousel · Recents grid that PULLS DOWN to the favourites browser + star-to-favourite · category banners that open
 * a per-category effect list. Adds exactly ONE effect per tap (the single add path). Reads FM.fxRegistry. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* THE SHEET GEOMETRY, shared (queue 277 built it, queue 300 made it shared).
   *
   * Ezra: "the menu won't cover the whole screen the menu will only go up until where the canvas is",
   * then, correcting himself in the same message, "it covers the play buttons and all of that so it
   * goes right up to the canvas". So the top edge is the bottom of the CANVAS, MEASURED — the canvas
   * box depends on the project's aspect, so a hard-coded height would be wrong for most projects.
   *
   * WHY IT LIVES HERE RATHER THAN INSIDE ONE BROWSER'S open(). It was written inline in
   * FM.fxBrowser.open, so the AUDIO browser — a sibling overlay with the same markup and the same
   * class names — never got it, and kept covering the whole screen for three weeks after the visual
   * one stopped. That is queue 300 in one sentence. A second copy would fix today and drift tomorrow
   * (there is a third overlay, #el-browser, built the same way); one function that every browser calls
   * cannot drift. FM.fxSheet is the seam the suite holds both browsers against.
   *
   * AND ON PC TOO, SINCE QUEUE 303. His words: *"on PC I want to make it so when you add an effect …
   * the same sort of thing happens on mobile that happens on PC … basically it'll cover everything on
   * the bottom except for the canvas so you can still see it and you can tap to selecting all that
   * stuff and it will just playback basically just the layout that you have selected"*. That is this
   * function's geometry plus the multi-select and the preview loop, all three of which were gated on
   * one `max-width: 700px` test — the class is what every one of them keys off, so removing the width
   * check hands PC the whole phone behaviour rather than a look-alike. The desktop dialog it replaces
   * is still there for the ELEMENTS browser, which he has not asked about.
   *
   * Returns whether the sheet is on, because both callers branch on it.
   */
  FM.fxSheet = function (root, on) {
    if (!root) return false;
    const sheet = on !== false;
    root.classList.toggle('fxb-sheet', sheet);
    if (sheet) {
      /* ON A DESKTOP IT LIVES IN THE INSPECTOR (queue 397). Ezra: "Make the effects browser on pc only show
         in the inspector." The phone keeps its full-bleed sheet — that is queue 277's design and his.
         The overlay is NOT reparented into the panel: it is `position: fixed`, so publishing the panel's
         rect as four variables puts it exactly over that column while every internal — the sheet class,
         the commit bar, the pager, the preview loop — keeps working unchanged. Reparenting would have
         moved it inside a scrolling container and broken all four.
         Guarded on a real width: a collapsed or hidden inspector would otherwise pin the browser into a
         zero-width strip, which is a worse bug than the one being fixed. Falls back to the canvas-bottom
         sheet whenever the panel is not there to sit in. */
      const wide = !window.matchMedia || window.matchMedia('(min-width: 701px)').matches;
      const insp = wide ? document.getElementById('inspector-panel') : null;
      const ir = insp ? insp.getBoundingClientRect() : null;
      if (ir && ir.width > 200 && ir.height > 120) {
        root.style.setProperty('--fxb-top', Math.round(ir.top) + 'px');
        root.style.setProperty('--fxb-left', Math.round(ir.left) + 'px');
        root.style.setProperty('--fxb-right', Math.round(window.innerWidth - ir.right) + 'px');
        root.style.setProperty('--fxb-bottom', Math.round(window.innerHeight - ir.bottom) + 'px');
        root.classList.add('fxb-in-inspector');
      } else {
        root.classList.remove('fxb-in-inspector');
        ['--fxb-left', '--fxb-right', '--fxb-bottom'].forEach(k => root.style.removeProperty(k));
        const cv = document.getElementById('preview');
        const top = cv ? Math.round(cv.getBoundingClientRect().bottom) : 0;
        root.style.setProperty('--fxb-top', Math.max(0, top) + 'px');
      }
    } else {
      root.classList.remove('fxb-in-inspector');
      ['--fxb-top', '--fxb-left', '--fxb-right', '--fxb-bottom'].forEach(k => root.style.removeProperty(k));
    }
    return sheet;
  };

  const RECENTS_KEY = 'fm.fx.recents', FAV_KEY = 'fm.fx.fav', RECENTS_CAP = 8;   // PAGE_SIZE went with the sideways pager (queue 92); js/audio-fx-browser.js keeps its own
  // Two entries in this browser are NOT registry effects — Mask and Motion Blur (Object) are
  // pseudo-tiles that drive layer state directly. They still look like effects and sit in the same
  // grid, so they are favouritable like everything else; readList has to stop filtering them out.
  // (Declared here, populated after the tile builders exist — see PSEUDO_TILES.) (#62)
  let _into = null;   // the filter container an add is destined for, or null for the layer's own stack
  // `_objblur` LEFT this table at queue 335: Motion Blur (Object) is a real registry effect now, so it
  // gets an ordinary tile, an ordinary row and a place inside a Filter. Mask is still layer state and
  // still needs the pseudo machinery, which is why the machinery stays.
  const PSEUDO = { _mask: 'Mask' };
  /* Own keys only. This one is the sharpest of the family, because the ids it is keyed by come
   * straight out of localStorage ('fm.fx.recents' / 'fm.fx.fav') and PSEUDO_TILES is CALLED, not just
   * tested: a stored id of 'toString' passes knownId, survives readList, and tileForId then invokes
   * Object.prototype.toString and hands back the STRING '[object Undefined]' — which grid.appendChild
   * rejects with "parameter 1 is not of type 'Node'", taking the effects browser down on open. The
   * favourites list has a second route to the same place: favLabel returns the function itself and
   * the sort calls .localeCompare on it. */
  Object.setPrototypeOf(PSEUDO, null);
  function knownId(id) { return !!(PSEUDO[id] || FM.fxRegistry.get(id)); }
  /* `_objblur` → `objectblur` (queue 335). Favourites and recents are RAW ids in localStorage and
     knownId drops anything it does not recognise — with no error and nothing in the suite watching —
     so without this rename the one user who starred Motion Blur (Object) silently loses it. */
  const ID_ALIAS = { _objblur: 'objectblur' };
  Object.setPrototypeOf(ID_ALIAS, null);
  function readList(key) { try { const a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a.map(id => ID_ALIAS[id] || id).filter(knownId) : []; } catch (e) { return []; } }
  function writeList(key, arr) { try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {} }
  function pushRecent(id) { const a = readList(RECENTS_KEY).filter(x => x !== id); a.unshift(id); writeList(RECENTS_KEY, a.slice(0, RECENTS_CAP)); }
  function isFav(id) { return readList(FAV_KEY).indexOf(id) >= 0; }
  function toggleFav(id) { const a = readList(FAV_KEY); const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id); writeList(FAV_KEY, a); return i < 0; }

  // One star, used by every tile builder. It used to be inlined in tile() only, which is exactly why
  // the featured carousel, Mask and Motion Blur (Object) had no way to be favourited. (#62)
  function starFor(id, onStarChange) {
    const star = el('span', 'fxb-star' + (isFav(id) ? ' on' : '')); star.textContent = '★';
    star.title = 'Favourite';
    star.addEventListener('click', (e) => {
      e.stopPropagation();          // never let the star's tap also ADD the effect
      const on = toggleFav(id);
      star.classList.toggle('on', on);
      if (onStarChange) onStarChange();
    });
    return star;
  }

  let root, scrollEl, searchInput, _layer, autoTimer = 0, autoPauseUntil = 0, _searchDebounce = 0;

  // Category-gradient swatch + glyph (Phase 1) stays as the instant placeholder/fallback; a canvas
  // fades in over it once FM.fxThumbs live-renders the real effect on a mini scene (Phase 2).
  function thumb(reg) {
    const t = el('div', 'fxb-thumb'); t.dataset.cat = reg.category;
    t.appendChild(el('span', 'fxb-thumb-glyph', (reg.label || '?').slice(0, 1).toUpperCase()));
    const cv = el('canvas', 'fxb-thumb-cv');
    t.appendChild(cv);
    if (FM.fxThumbs) FM.fxThumbs.mount(cv, reg.type); // engine sizes backing store + adds .ready on first paint
    return t;
  }

  // The ONE add path — exactly one push, then close + refresh the inspector/timeline/canvas.
  // `preset` (optional) = an FM.effectPresets entry: same flow, but the instance carries the
  // preset's params with keyframes re-anchored at the playhead (or the clip start if the playhead
  // is outside the clip) — park the playhead on the beat, add "Beat Slam", the hit lands there.
  function addEffect(id, preset, quiet, seed) {
    // Re-resolve from the LIVE scene by id: the overlay caches _layer at open(), but a delete (Backspace)
    // or undo (Cmd+Z, which rebuilds layer objects) can orphan it — pushing into the detached object would
    // silently lose the effect (history.commit snapshots the live scene without it).
    const layer = (FM.scene && _layer) ? FM.scene.layers.find(l => l.id === _layer.id) : null;
    if (!layer) { FM.fxBrowser.close(); return; }
    let inst;
    if (preset && FM.effectPresets) {
      const st = layer.start || 0, du = layer.duration || 0;
      const ph = (typeof FM.time === 'number') ? FM.time : st;
      const anchor = (ph >= st && ph < st + du - 0.01) ? ph : st;
      inst = FM.effectPresets.makeInstance(preset, anchor);
    } else if (seed) {
      /* The instance the PREVIEW was drawn with (queue 277 clause 9) — cloned, not adopted, so the
         layer never ends up holding an object the browser also has a reference to. */
      inst = JSON.parse(JSON.stringify(seed));
    } else {
      inst = FM.fxRegistry.makeInstance(id);
    }
    if (!inst || !FM.fxRegistry.supportsLayer(id, layer)) {
      const reg = FM.fxRegistry.get(id);
      let msg;
      if (layer.type === 'adjustment') msg = 'Adjustment layers only do colour, blur & pixel grades — add this to the layer itself';
      else if (layer.type === 'camera' || layer.type === 'null') msg = 'Camera & null layers have no pixels — effects can’t apply to them';
      else msg = 'That effect needs ' + (reg && reg.appliesTo === 'text' ? 'a text layer' : 'a video or image layer');
      if (FM.toast) FM.toast(msg, 2000);
      return;
    }
    if (!layer.effects) layer.effects = [];
    // Into a filter, if one asked for it AND it is still in this layer's stack — an undo between
    // opening the browser and picking an effect can take the container with it.
    const box = (_into && layer.effects.indexOf(_into) >= 0 && FM.isFxContainer(_into)) ? _into : null;
    if (box && FM.isFxContainer(inst)) { if (FM.toast) FM.toast('A filter can’t hold another filter', 1800); return; }
    const dest = box ? box.effects : layer.effects;
    dest.forEach(e => { e._expanded = false; });          // accordion: the newcomer is the one open editor
    inst._expanded = true;                                    // land with the new effect's controls ready to tweak
    dest.push(inst);                      // <- exactly one entry
    /* If it provably cannot do anything to this layer, say so NOW (queue 180). This is the moment the
       confusion happens: you tap Saturation on white text, the picture does not change, and without
       this the app's only answer is silence. It still gets ADDED — the effect is not wrong, the layer
       has no colour yet, and deleting someone's choice for them would be the ruder half of being
       right. The inspector row carries the same sentence for when you come back later. */
    if (FM.fxDeadOnLayer && FM.toast) {
      const why = FM.fxDeadOnLayer(inst, layer, FM.time);
      if (why) FM.toast(why, 3600);
    }
    pushRecent(id);
    if (quiet) return true;               // batch commit (queue 277): close and land once, at the end
    FM.fxBrowser.close();
    // Land ON the new effect's controls. inst._expanded above only decides which row is open —
    // it does nothing if the inspector has meanwhile fallen back to the category grid, which is
    // what made adding an effect look like it just closed the layer.
    if (FM.inspector) {
      if (FM.inspector.openCategory) FM.inspector.openCategory('effects');
      else FM.inspector.refresh();
      // …and bring it into view: on a phone the new row is usually below the fold, so without this
      // you arrive at the right panel and still cannot see the controls you just added.
      requestAnimationFrame(() => {
        const open = document.querySelector('.fx-row.fx-open');
        if (open && open.scrollIntoView) open.scrollIntoView({ block: 'nearest' });
      });
    }
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.requestRender) FM.requestRender();
    if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Added ' + (FM.fxRegistry.get(id).label) + (preset ? ' — ' + preset.name : ''), 1100);
  }

  /* Tap anywhere empty to back out of a sub-view (Ezra, 2026-08-07). The ‹ Back button is a long
   * reach with one thumb, and once you are three categories deep it is the only way out. Any tap
   * that does not land on something interactive now backs out one level.
   *
   * It has to be a TAP, not a pointerdown: the category grid scrolls, and dismissing the list out
   * from under a drag would make the sheet feel broken. So arm on pointerdown over empty space, and
   * only fire on pointerup if the finger barely moved and did not linger. Every tile, preset row and
   * nav arrow is a <button>, so `closest('button')` is the whole interactive test. */
  const TAP_SLOP = 10, TAP_MS = 700;
  function tapOutToClose(view, closeView) {
    let x0 = 0, y0 = 0, t0 = 0, armed = false;
    view.addEventListener('pointerdown', (e) => {
      armed = !(e.target.closest && e.target.closest('button, a, input, textarea, select, label, canvas'));
      x0 = e.clientX; y0 = e.clientY; t0 = perfNow();
    });
    view.addEventListener('pointercancel', () => { armed = false; });
    view.addEventListener('pointerup', (e) => {
      if (!armed) return;
      armed = false;
      if (Math.abs(e.clientX - x0) > TAP_SLOP || Math.abs(e.clientY - y0) > TAP_SLOP) return;   // that was a scroll
      if (perfNow() - t0 > TAP_MS) return;                                                       // that was a hold
      closeView();
    });
  }

  // ---- long-press (or right-click) an effect → its preset sheet ----
  const LP_MS = 420, LP_SLOP = 10;
  function attachLongPress(elm, reg) {
    let timer = 0, x0 = 0, y0 = 0;
    const clear = () => { if (timer) { clearTimeout(timer); timer = 0; } };
    elm.addEventListener('pointerdown', (e) => {
      if (e.button && e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('.fxb-star')) return;   // holding the ★ must not also open the preset sheet (#62)
      x0 = e.clientX; y0 = e.clientY; elm._lpFired = false;
      clear();
      timer = setTimeout(() => {
        timer = 0; elm._lpFired = true;
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} }
        openPresets(reg);
      }, LP_MS);
    });
    elm.addEventListener('pointermove', (e) => { if (timer && (Math.abs(e.clientX - x0) > LP_SLOP || Math.abs(e.clientY - y0) > LP_SLOP)) clear(); });   // a scroll-drag is not a hold
    elm.addEventListener('pointerup', clear);
    elm.addEventListener('pointercancel', clear);
    elm.addEventListener('pointerleave', clear);
    // desktop parity: right-click = presets (and block the OS menu the mobile hold would trigger)
    elm.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!elm._lpFired) { elm._lpFired = true; openPresets(reg); } });
  }
  /* ---- MULTI-SELECT (queue 277) -------------------------------------------------------------
   * Ezra: "when you tap on an effect it doesn't just add it selects it… you can select as many
   * effects as you want so you can just go and like select a bunch of effects every time you select
   * one it'll put a one or two on it so you know what order they are being added in… I find in a
   * light motion. Sometimes I want to go through and out a bunch of effects but every time I tap one
   * it takes me out of it and it's kind of slow."
   * PHONE ONLY, because that is what he asked for ("all just for mobile btw") and because the desktop
   * browser is a centred dialog with no timeline-sized space to become. On desktop a tap still adds
   * one effect and closes, exactly as before.
   * The pick list is ORDERED — it is the order they will be added in, which is what the badge says —
   * so a re-tap removes and renumbers rather than toggling a flag. */
  let _picked = [];
  const sheetMode = () => !!(root && root.classList.contains('fxb-sheet'));
  function pickIndex(id) { return _picked.indexOf(id); }
  function paintPicks() {
    if (!root) return;
    root.querySelectorAll('[data-fxid]').forEach(elm => {
      const n = pickIndex(elm.dataset.fxid);
      let b = elm.querySelector('.fxb-pick');
      if (n < 0) { if (b) b.remove(); elm.classList.remove('is-picked'); return; }
      if (!b) { b = el('span', 'fxb-pick'); elm.appendChild(b); }
      b.textContent = String(n + 1);
      elm.classList.add('is-picked');
    });
    const bar = root.querySelector('.fxb-commit');
    if (bar) {
      bar.classList.toggle('hidden', !_picked.length);
      const btn = bar.querySelector('.fxb-commit-go');
      if (btn) btn.textContent = _picked.length === 1 ? 'Add 1 effect' : 'Add ' + _picked.length + ' effects';
    }
  }
  /* ---- THE PREVIEW, AND THE LOOP (queue 277, clauses 5 and 7) --------------------------------
   * "it'll just take you back to the start of that layer instead and it will only show that layer which
   * makes sense because you're only seeing the effects for that layer anyways".
   * Both halves are VIEW-ONLY overrides — `FM.isolate` (which already exists and is documented as
   * touching nothing in the scene) for "only show that layer", and `FM._fxPreview` for the stack. The
   * layer object is never written to, so closing the sheet is the entire undo and a preview can never
   * reach history, autosave or an export.
   * The loop is a plain 24fps ticker rather than real playback: it must not fight the transport, and it
   * has to restart on every tap, which a play/pause API is a clumsy way to ask for. */
  /* `_isoHeld` is a separate flag rather than a null check on `_isoWas`, and that is not fussiness:
     the first version restored with `if (_isoWas !== null)`, and the ordinary case is that nothing was
     isolated before the sheet opened — so `_isoWas` was null, the guard never fired, and closing the
     sheet LEFT THE LAYER ISOLATED with every other layer invisible. Found by closing it and looking,
     not by reading the code. */
  let _loopTimer = 0, _isoWas = null, _isoHeld = false, _loopFrom = 0;
  function stopPreview() {
    if (_loopTimer) { clearInterval(_loopTimer); _loopTimer = 0; }
    FM._fxPreview = null;
    if (_isoHeld) { FM.isolate = _isoWas; _isoWas = null; _isoHeld = false; }
    /* THE REPAINT CANNOT BE ALLOWED TO TAKE THE CLOSE DOWN WITH IT. `FM.setTime` walks the media
       elements to re-seek them, and a layer whose element is not ready throws on `.currentTime` — which
       happened, in the suite, three tests deep: `close()` called this FIRST, the throw escaped before
       the overlay was hidden, and the effects browser was left on screen covering the phone's settings
       button. Two changes, because either alone would have been enough and both are cheap: the repaint
       is guarded, and `close()` hides the overlay before calling this. */
    try {
      if (FM.refreshCanvas) FM.refreshCanvas();
      else if (FM.setTime) FM.setTime(FM.time);
    } catch (e) { /* a preview that cannot repaint is a stale frame; a close that throws is a trapped user */ }
  }
  function previewStack() {
    /* Rebuilt from the picked ids each time rather than kept in step by hand: the list is short, the
       instances are cheap, and one source of truth beats two that can drift. Pseudo-tiles (Mask,
       Motion Blur (Object)) are layer state rather than effects, so they cannot be previewed — they
       are skipped rather than crashing makeInstance. */
    return _picked.map(id => (PSEUDO[id] ? null : FM.fxRegistry.makeInstance(id))).filter(Boolean);
  }
  function restartPreview() {
    if (!sheetMode()) return;
    const layer = (FM.scene && _layer) ? FM.scene.layers.find(l => l.id === _layer.id) : null;
    if (!layer) return;
    FM._fxPreview = { id: layer.id, list: previewStack() };
    if (!_isoHeld) { _isoWas = FM.isolate || null; _isoHeld = true; }
    /* THE PREVIEW SHOWS THE WHOLE COMPOSITION NOW (queue 390) — and this REVERSES his own earlier words,
       which is why the old ones are still quoted above rather than deleted. He asked for the solo at queue
       277 (*"it will only show that layer which makes sense because you're only seeing the effects for that
       layer anyways"*) and has since changed his mind, with a reason that outranks it: *"sometimes seeing
       how the other layers will interact with the layer you're adding effects to is pivotal"*. He is right
       — a blend mode, a glow or a matte means nothing against an empty frame.
       It CLEARS the isolate rather than simply not setting one, because a solo he switched on himself
       before opening the sheet would hide exactly the layers he is now asking to see. The save/restore
       machinery is unchanged, so his own solo comes back the moment the sheet closes — which is what
       `_isoHeld` is for, and the note above it explains what happens when that restore is got wrong. */
    FM.isolate = null;                                 // …the whole frame, not just this layer
    if (FM.playing && FM.pause) FM.pause();            // the sheet owns the clock while it is open
    const st = layer.start || 0, du = Math.max(0.25, layer.duration || 0);
    _loopFrom = Date.now();
    if (FM.setTime) FM.setTime(st);                    // "take you back to the start of that layer"
    if (_loopTimer) clearInterval(_loopTimer);
    _loopTimer = setInterval(() => {
      if (!sheetMode() || !FM.setTime) return;
      FM.setTime(st + (((Date.now() - _loopFrom) / 1000) % du));
    }, 1000 / 24);
  }

  function togglePick(id) {
    const i = pickIndex(id);
    if (i >= 0) _picked.splice(i, 1); else _picked.push(id);
    paintPicks();
    restartPreview();      // every tap re-previews AND restarts the layer, which is what he asked for
  }
  /* ---- HOW THEY LAND (queue 277, clause 9) ---------------------------------------------------
   * "Maybe add a button like a toggle button for when you're like done selecting all of the effects
   * you want to add you can toggle whether they spawn in with the values that were displayed in the
   * preview on the canvas or they are just added in as a fresh slate like they just added in naked so
   * you can do what you want to them."
   * ON  = the effects land carrying exactly the parameters the preview was drawn with.
   * OFF = fresh instances, default parameters — "naked".
   * WORTH KNOWING TODAY: the two settings currently produce the SAME parameters, because a previewed
   * effect is built with `makeInstance` and so is already naked. The difference only starts to mean
   * something when effects preview with something other than their defaults — which is exactly the
   * "make each effect load in with changes to it so it actually does something" work he asked me NOT
   * to start ("I don't want you to start on it yet"). The toggle is the agreed shape for it, so it is
   * built and wired to carry the real preview objects; it is not a control pretending to do something. */
  const KEEP_KEY = 'fm.fx.keepPreviewValues';
  function keepValues() { try { return localStorage.getItem(KEEP_KEY) === '1'; } catch (e) { return false; } }
  function setKeepValues(on) { try { localStorage.setItem(KEEP_KEY, on ? '1' : '0'); } catch (e) {} }
  FM._fxKeepValues = keepValues;      // for the suite

  function commitPicks() {
    const list = _picked.slice();
    /* Snapshot the previewed instances BEFORE stopPreview clears them — that is the whole point of the
       toggle, and reading them afterwards would hand back an empty list. */
    const shown = (FM._fxPreview && FM._fxPreview.list) ? FM._fxPreview.list.slice() : [];
    const keep = keepValues();
    _picked = [];
    stopPreview();          // the previewed copies go before the real ones land, or the layer gets both
    if (!list.length) { FM.fxBrowser.close(); return; }
    /* In tap order, and quietly — addEffect closes the browser and jumps the inspector on its own,
       which is right for one tap and wrong nine times in a row. */
    let added = 0;
    list.forEach((id, i) => {
      /* A pseudo-tile is not an effect instance, so it cannot go through addEffect — it changes the
         LAYER (a mask, or the object motion-blur flag). Routed by the same table the tiles are built
         from, so adding a third pseudo entry cannot leave the commit path behind. */
      if (PSEUDO[id]) { if (PSEUDO_ACTION[id] && PSEUDO_ACTION[id](true)) added++; return; }
      const seed = (keep && shown[i] && (shown[i].type === id || shown[i].id === id)) ? shown[i] : null;
      if (addEffect(id, null, true, seed)) added++;
    });
    FM.fxBrowser.close();
    if (FM.inspector) { if (FM.inspector.openCategory) FM.inspector.openCategory('effects'); else FM.inspector.refresh(); }
    if (FM.refreshAll) FM.refreshAll();
    if (FM.history && FM.history.commit) FM.history.commit();
    if (FM.toast && added) FM.toast(added === 1 ? 'Added 1 effect' : 'Added ' + added + ' effects', 1500);
  }
  FM._fxPicks = () => _picked.slice();     // read-only, for the suite

  // The click that ENDS a long-press must not also add the plain effect.
  function guardedAdd(elm, id) {
    elm.dataset.fxid = id;                 // so the badge painter can find every tile in one sweep
    return () => {
      if (elm._lpFired) { elm._lpFired = false; return; }
      if (sheetMode()) { togglePick(id); return; }
      addEffect(id);
    };
  }

  // ---- "Mask" as an addable entry (Ezra: pressing + Add Effect should offer Mask) ----
  // Not a real effect instance: tapping it ADDS A PEN MASK to the layer and opens the mask editor.
  // Injected into the Matte category grid + search results; pure UI, the effect registry stays clean.
  /* `quiet` is the batch path (queue 321). commitPicks runs several of these in a row and closes ONCE
     at the end, so a pseudo-tile that closed the browser itself would tear it down under the second
     item in its own list — the same reason addEffect grew this parameter at queue 277. */
  function addMaskFromBrowser(quiet) {
    const layer = (FM.scene && _layer) ? FM.scene.layers.find(l => l.id === _layer.id) : null;
    if (!layer) { if (!quiet) FM.fxBrowser.close(); return; }
    if (['shape', 'text', 'image', 'video', 'adjustment'].indexOf(layer.type) < 0) {
      if (FM.toast) FM.toast('Masks need a layer with pixels — camera/null/group can’t be masked', 1900);
      return;
    }
    if (!Array.isArray(layer.masks)) layer.masks = [];
    const m = (FM.masks && FM.masks.make) ? FM.masks.make('add')
      : { id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), enabled: true, mode: 'add', feather: 0, opacity: 1, invert: false, closed: true, path: [] };
    layer.masks.push(m);
    if (!quiet) FM.fxBrowser.close();
    if (FM.inspector) FM.inspector.refresh();
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
    /* The mask EDITOR only opens on the single-tap path. In a batch it would land on top of whatever
       else was picked, and you would be drawing a mask before seeing the rest of what you added. */
    if (!quiet && FM.maskTool && FM.maskTool.open) FM.maskTool.open(layer.id, m.id);
    return true;
  }
  function maskTile(onStarChange) {
    const wrap = el('button', 'fxb-tile'); wrap.title = 'Mask — draw a shape that reveals part of this layer';
    const t = el('div', 'fxb-thumb'); t.dataset.cat = 'matte';
    /* 2x raster, 96-unit drawing (v6.16). These two tiles are hand-drawn rather than rendered by
       fx-thumbs, so they need the same resolution bump by hand — otherwise they are the only soft
       thumbnails in a grid of sharp ones. g.scale keeps every coordinate below in 96-space. */
    const cv = el('canvas', 'fxb-thumb-cv'); cv.width = 192; cv.height = 192;
    const g = cv.getContext('2d'); g.scale(2, 2);
    g.fillStyle = '#1c2536'; g.fillRect(0, 0, 96, 96);
    g.fillStyle = '#2fd0b5';
    g.beginPath(); g.rect(12, 20, 72, 56); g.arc(48, 48, 20, 0, Math.PI * 2, true); g.fill('evenodd');
    g.setLineDash([4, 3]); g.strokeStyle = '#e8ecf4'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(48, 48, 20, 0, Math.PI * 2); g.stroke();
    cv.classList.add('ready');
    t.appendChild(cv);
    wrap.appendChild(t);
    wrap.appendChild(el('span', 'fxb-tile-name', 'Mask'));
    wrap.appendChild(starFor('_mask', onStarChange));
    /* PICK, DON'T COMMIT (queue 321). Ezra: *"With the mask effect when you press on it it instantly
       adds instead of previewing"*. Queue 277 made every ordinary tile select-then-Add, and these two
       PSEUDO tiles — Mask and Motion Blur (Object) — were left calling their action straight from the
       click, because they are layer state rather than registry effects and the multi-select was built
       around effect instances. From the outside that distinction is invisible: one tile in the grid
       behaves differently from all the others and shuts the browser on you.
       They badge and wait for Add now, like everything else. What they still cannot do is show a live
       PREVIEW of themselves — a mask has no result to preview until you have drawn one, which is what
       the editor that opens on Add is for. */
    wrap.dataset.fxid = '_mask';
    wrap.addEventListener('click', () => { if (sheetMode()) togglePick('_mask'); else addMaskFromBrowser(); });
    return wrap;
  }

  // ---- "Motion Blur (Object)" as an addable entry ----
  // Ezra: "I'm only seeing motion blur footage, we need a motion blur for the actual object."
  // It already existed and WORKED — it was just a checkbox buried in Move & Transform, while he
  // (reasonably) goes looking in the effects list, where the only two hits are Motion Blur (Footage),
  // which blurs movement INSIDE the clip, and Directional Blur, which ignores movement entirely.
  // Same pseudo-entry trick as Mask: this drives layer.motionBlur rather than pushing an effect
  // instance, so every existing project keeps rendering and exporting exactly as before.
  function enableObjectBlur(quiet) {
    const layer = (FM.scene && _layer) ? FM.scene.layers.find(l => l.id === _layer.id) : null;
    if (!layer) { if (!quiet) FM.fxBrowser.close(); return; }
    if (!layer.motionBlur || typeof layer.motionBlur !== 'object') layer.motionBlur = { enabled: false, shutter: 0.5, samples: 8 };
    const already = !!layer.motionBlur.enabled;
    layer.motionBlur.enabled = true;
    if (!quiet) FM.fxBrowser.close();
    if (FM.inspector) FM.inspector.refresh();
    if (FM.requestRender) FM.requestRender();
    if (!already && FM.history) FM.history.commit();
    if (FM.toast && !quiet) FM.toast(already ? 'Motion Blur (Object) is already on — its shutter is in Position / Scale'
                                              : 'Motion Blur (Object) on — smears this layer’s own movement', 2200);
    return true;
  }
  function objectBlurTile(onStarChange) {
    const wrap = el('button', 'fxb-tile');
    wrap.title = 'Motion Blur (Object) — smears the layer’s OWN movement (position, scale, rotation)';
    const t = el('div', 'fxb-thumb'); t.dataset.cat = 'blur';
    /* 2x raster, 96-unit drawing (v6.16). These two tiles are hand-drawn rather than rendered by
       fx-thumbs, so they need the same resolution bump by hand — otherwise they are the only soft
       thumbnails in a grid of sharp ones. g.scale keeps every coordinate below in 96-space. */
    const cv = el('canvas', 'fxb-thumb-cv'); cv.width = 192; cv.height = 192;
    const g = cv.getContext('2d'); g.scale(2, 2);
    g.fillStyle = '#1c2536'; g.fillRect(0, 0, 96, 96);
    // a square trailing its own ghosts — the thing the effect actually does
    for (let i = 6; i >= 0; i--) {
      g.globalAlpha = (1 - i / 7) * 0.85;
      g.fillStyle = '#2fd0b5';
      g.fillRect(20 + i * 6, 34, 28, 28);
    }
    g.globalAlpha = 1;
    cv.classList.add('ready');
    t.appendChild(cv);
    wrap.appendChild(t);
    wrap.appendChild(el('span', 'fxb-tile-name', 'Motion Blur (Object)'));
    wrap.appendChild(starFor('_objblur', onStarChange));
    wrap.dataset.fxid = '_objblur';
    wrap.addEventListener('click', () => { if (sheetMode()) togglePick('_objblur'); else enableObjectBlur(); });
    return wrap;
  }

  // Build whatever tile an id names — a registry effect or one of the two pseudo-entries. This is what
  // lets the Favourites page hold a favourited Mask / Motion Blur (Object) instead of dropping it. (#62)
  const PSEUDO_TILES = { _mask: maskTile };
  // What each pseudo tile DOES, keyed the same way its tile is — so the commit path and the grid can
  // never disagree about which entries exist (queue 321).
  const PSEUDO_ACTION = { _mask: addMaskFromBrowser };
  Object.setPrototypeOf(PSEUDO_ACTION, null);
  Object.setPrototypeOf(PSEUDO_TILES, null);   // own keys only — see PSEUDO. This table gets CALLED.
  function tileForId(id, onStarChange) {
    if (PSEUDO_TILES[id]) return PSEUDO_TILES[id](onStarChange);
    const reg = FM.fxRegistry.get(id);
    return reg ? tile(reg, onStarChange) : null;
  }

  // navigator.clipboard needs a secure context — hidden-textarea copy covers plain file:// use.
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { if (FM.toast) FM.toast('Copy failed — export from a saved preset later', 1800); }
    ta.remove();
  }

  // The layer this browser is adding to, re-read from the LIVE scene. The overlay caches _layer at
  // open(), and a delete or an undo rebuilds layer objects — addEffect has always re-resolved by id
  // for that reason, and a preview rendered from a detached object would be a picture of a layer
  // that no longer exists.
  function liveLayer() { return (FM.scene && _layer) ? FM.scene.layers.find(l => l.id === _layer.id) : null; }

  // Full-cover preset sheet for one effect (same chrome as the category view, incl. the
  // depth-tracked pause of the featured auto-scroll).
  FM._fxOpenPresets = function (reg) { return openPresets(reg); };   // suite seam (queue 407)
  function openPresets(reg) {
    if (!FM.effectPresets) return;
    const view = el('div', 'fxb-catview');
    _catDepth++; stopAuto();
    const closeView = () => { view.remove(); if (--_catDepth <= 0) { _catDepth = 0; if (_featRow && _featRow.isConnected) startAuto(_featRow); } };
    tapOutToClose(view, closeView);
    view.appendChild(subTop(reg.label, closeView));
    // What it does, then the words it answers to. Holding a tile is the one moment someone is asking
    // "what IS this?", so the answer goes above the presets rather than after them.
    if (reg.desc) {
      const d = el('div', 'fxb-desc'); d.textContent = reg.desc; view.appendChild(d);
    }
    if (reg.tags && reg.tags.length) {
      const tw = el('div', 'fxb-tags');
      reg.tags.slice(0, 10).forEach(function (t) { tw.appendChild(el('span', 'fxb-tag', t)); });
      view.appendChild(tw);
    }

    const scroller = el('div', 'fxb-catview-scroll');
    const list = el('div', 'fxp-list');

    /* Every thumb in this sheet is a picture of THE SELECTED LAYER with that preset on it (Ezra:
     * "the presets menu should show a preview of what the layer will look like when you add the
     * effects"). Decided ONCE for the sheet, not per row: canPreviewLayer renders the frame with and
     * without the layer to find out whether the layer contributes any pixels at all, and asking it
     * six times would render it six times — it is memoised per scene signature, but the sheet also
     * wants a single honest answer to put on screen. */
    const target = liveLayer();
    const onLayer = !!(target && FM.fxThumbs && FM.fxThumbs.canPreviewLayer && FM.fxThumbs.canPreviewLayer(target, reg.type));
    if (target && !onLayer) {
      const why = (FM.fxRegistry.supportsLayer && !FM.fxRegistry.supportsLayer(reg.id, target))
        ? ('“' + reg.label + '” can’t apply to a ' + (target.type || 'layer') + ' layer')
        : 'nothing of this layer is on screen at the playhead';
      list.appendChild(el('div', 'fxp-note', 'Previews below use a sample — ' + why + '.'));
    }

    // One tappable preset row: live animated thumb + name + duration badge + description.
    function presetRow(preset, mine) {
      const row = el('button', 'fxp-row');
      const th = el('div', 'fxb-thumb fxp-thumb'); th.dataset.cat = reg.category;
      const cv = el('canvas', 'fxb-thumb-cv');
      th.appendChild(cv);
      if (FM.fxThumbs && FM.fxThumbs.mountPreset) FM.fxThumbs.mountPreset(cv, preset, onLayer ? target : null);
      row.appendChild(th);
      const txt = el('div', 'fxp-txt');
      const nameLine = el('div', 'fxp-name', preset.name);
      nameLine.appendChild(el('span', 'fxp-dur', preset.dur > 0 ? (+preset.dur.toFixed(2)) + 's' : 'constant'));
      txt.appendChild(nameLine);
      if (preset.desc) txt.appendChild(el('div', 'fxp-desc', preset.desc));
      row.appendChild(txt);
      if (mine) {
        const del = el('span', 'fxp-del', '✕'); del.title = 'Delete this preset';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          FM.effectPresets.remove(preset.id);
          row.remove();
          if (FM.toast) FM.toast('Preset deleted', 1100);
        });
        row.appendChild(del);
      }
      row.addEventListener('click', () => addEffect(reg.id, preset));
      return row;
    }

    // Plain add row first — the sheet must never be a dead-end vs a normal tap.
    const plain = el('button', 'fxp-row');
    const pth = el('div', 'fxb-thumb fxp-thumb'); pth.dataset.cat = reg.category;
    const pcv = el('canvas', 'fxb-thumb-cv'); pth.appendChild(pcv);
    // Same rule for the plain-add row: your layer with the effect at its defaults, or the sample
    // tile (with its demo overrides) when the layer has nothing to show.
    if (FM.fxThumbs) {
      if (onLayer && FM.fxThumbs.mountLayerFx) FM.fxThumbs.mountLayerFx(pcv, reg.type, target);
      else FM.fxThumbs.mount(pcv, reg.type);
    }
    plain.appendChild(pth);
    const ptxt = el('div', 'fxp-txt');
    ptxt.appendChild(el('div', 'fxp-name', 'Default'));
    // The effect's own sentence when it has one — far more use than "Plain <name> at its normal settings".
    ptxt.appendChild(el('div', 'fxp-desc', reg.desc || ('Plain ' + reg.label + ' at its normal settings')));
    plain.appendChild(ptxt);
    plain.addEventListener('click', () => addEffect(reg.id));
    list.appendChild(plain);

    const pools = FM.effectPresets.for(reg.type);
    if (pools.mine.length) {
      const sec = el('div', 'fxb-sec-title fxp-sec', 'Your presets');
      // The shipping hand-off: copies ALL your presets (every effect) as JSON — paste them to
      // Claude to bake into the app so every install gets them.
      const exp = el('button', 'fxp-export', 'Export all');
      exp.title = 'Copy all your presets as code (to ship them into the app)';
      exp.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = FM.effectPresets.exportCode();
        const done = () => { if (FM.toast) FM.toast('Copied ' + FM.effectPresets.custom().length + ' preset(s) — paste to Claude to ship them into the app', 3200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => fallbackCopy(code, done));
        else fallbackCopy(code, done);
      });
      sec.appendChild(exp);
      list.appendChild(sec);
      pools.mine.forEach(p => list.appendChild(presetRow(p, true)));
    }
    if (pools.shipped.length) {
      list.appendChild(el('div', 'fxb-sec-title fxp-sec', 'Presets'));
      pools.shipped.forEach(p => list.appendChild(presetRow(p, false)));
    }
    if (!pools.mine.length && !pools.shipped.length) {
      /* SAY WHICH presets are missing, and name the exact action (queue 407 clause 1, and the same
         confusion as queue 406). Ezra: "when I load into one and then save it as a preset it doesn't get
         rid of the thing in the presets menu explaining what to do."
         It is not stuck — this list holds presets saved from THIS EFFECT's own ⋯, and he had saved a
         LAYER preset or an effects-only one, which live in different stores and never appear here. The old
         wording ("No presets for X yet — … ⋯ → Save as preset") read as "you have not saved anything",
         and pointed at a menu item whose label no longer exists. Naming the scope and the current label
         makes the message true and makes it obvious what would clear it. */
      list.appendChild(el('div', 'fxb-empty', 'No ' + reg.label + ' presets yet — these are saved from ' + reg.label + '’s own ⋯ → “Save this effect as preset…”. Whole-look and effects-only presets live in the layer’s Presets card instead.'));
    }
    scroller.appendChild(list);
    view.appendChild(scroller);
    root.appendChild(view);
  }

  // A tappable effect tile (thumb + name + ★ favourite toggle).
  function tile(reg, onStarChange) {
    const wrap = el('button', 'fxb-tile'); wrap.title = reg.label;
    wrap.appendChild(thumb(reg));
    wrap.appendChild(el('span', 'fxb-tile-name', reg.label));
    wrap.appendChild(starFor(reg.id, onStarChange));
    wrap.addEventListener('click', guardedAdd(wrap, reg.id));
    attachLongPress(wrap, reg);   // hold (or right-click) → preset sheet
    return wrap;
  }

  // Section A — auto-scrolling, swipeable "New" carousel.
  function buildFeatured() {
    const sec = el('div', 'fxb-section');
    /* "New", not "Featured" (queue 445, clause 1). Ezra: "in the effects menu change the featured row to
       New". It is the honest word for what the row actually is — FX_FEATURED leads with the newest
       effects, so "Featured" was promising an editorial pick the list does not make. */
    sec.appendChild(el('div', 'fxb-sec-title', 'New'));
    const row = el('div', 'fxb-featured');
    /* …and nothing whose id is also a FILTER's (queue 318). Cleaning FM.FX_FEATURED fixes today; this
       is what stops it coming back, because that list is appended to and the collision lives in a
       different file — an effect and a ready-made filter can share an id (the filter is built FROM the
       effect), and the carousel then shows a tile wearing the filter's name on the tab whose whole job
       is to not be the Filters tab. */
    (FM.FX_FEATURED || []).map(id => FM.fxRegistry.get(id)).filter(Boolean)
      .filter(reg => !(FM.filters && FM.filters.get && FM.filters.get(reg.id)))
      .forEach(reg => {
      const card = el('button', 'fxb-card'); card.title = reg.label;
      card.appendChild(thumb(reg));
      card.appendChild(el('div', 'fxb-card-name', reg.label));
      card.appendChild(starFor(reg.id, rerenderPaged));   // the featured row had no ★ at all, so the newest effects — which lead FX_FEATURED — were exactly the ones you could not favourite (#62)
      card.addEventListener('click', guardedAdd(card, reg.id));
      attachLongPress(card, reg);
      row.appendChild(card);
    });
    // pause auto-scroll while the user is touching it
    row.addEventListener('pointerdown', () => { autoPauseUntil = perfNow() + 3000; });
    sec.appendChild(row);
    return { sec: sec, row: row };
  }

  /* Section B — RECENTS, and the door to the Favourites browser (queue 92).
   *
   * This used to be a sideways PAGER: Recents was page 1 and your favourites were pages 2, 3… behind
   * a swipe right, with page dots. Ezra: "remove the feature of swiping right to see ur faves, just
   * make it if you swipe [up] on recents it does a clean little animation and opens up the faves
   * menu you have just built." He is right that it was the wrong door — three grey dots are not an
   * affordance, and the favourites you had starred were invisible until you swiped at something that
   * did not look swipeable.
   *
   * So the section is now exactly what its title says, and favourites live in ONE place: the
   * full-screen browser from queue 74, reachable two ways — pull the block down, or tap the strip.
   * The strip stays because a gesture nobody told you about is how Group ended up unreachable on the
   * PC (queue 53); the gesture is the fast path, not the only path.
   *
   * NOTE the sideways pager still exists in js/audio-fx-browser.js for AUDIO effects, and it still
   * uses .fxb-pager/.fxb-page/.fxb-dots — which is why those CSS rules are scoped to #afx-browser
   * now rather than deleted. */
  function buildPaged(rerender) {
    const sec = el('div', 'fxb-section fxb-recents');   // .fxb-recents is rerenderPaged's anchor — it used to key off .fxb-pager, which no longer exists
    sec.appendChild(el('div', 'fxb-sec-title', 'Recents'));
    const recents = readList(RECENTS_KEY);
    const favs = readList(FAV_KEY);          // only for the strip's count now, not for paging

    /* The hint that is revealed in the gap the block leaves as you pull it down. It sits BEHIND the
     * block (negative margin, so it takes no layout space) and is uncovered rather than animated in,
     * which is what makes the gesture read as pulling a drawer open instead of nudging a box. */
    const hint = el('div', 'fxb-pullhint');
    hint.innerHTML = '<span class="fxb-pullhint-ico">★</span><span class="fxb-pullhint-txt">Faves</span>';
    sec.appendChild(hint);

    const body = el('div', 'fxb-recents-body');   // the part that MOVES; the hint must stay put
    if (!recents.length) body.appendChild(el('div', 'fxb-empty', 'No recent effects yet'));
    else {
      const grid = el('div', 'fxb-grid');
      recents.forEach(id => { const t = tileForId(id, rerender); if (t) grid.appendChild(t); });
      body.appendChild(grid);
    }

    const grab = el('button', 'fxb-favmore');
    grab.type = 'button';
    // "Don't name it all faves, just faves" (#124) — it was "All favourites", and the "All" was doing
    // no work: there is only one faves screen, so the word only ever added length to a 11px caps label.
    /* A REAL BUTTON, NOT A NOTCH (queue 462). Ezra: *"Make the faves menu a big button and not just
       this small notch, and give it some nice shiny golden background colours"*.
       The star is the same mark that flags a favourite on every tile, so the button says what it opens
       without needing the word — and it is what earns the gold. The grab bar stays, small and above the
       face: the pull-down gesture is a real feature (queue 74) and removing its only affordance would
       hide it, but it is no longer the whole control. */
    grab.innerHTML = '<span class="fxb-favmore-bar"></span>'
      + '<span class="fxb-favmore-face">'
      +   '<svg class="fxb-favmore-star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
      +     '<path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z"/>'
      +   '</svg>'
      +   '<span class="fxb-favmore-txt">Faves' + (favs.length ? ' \u00b7 ' + favs.length : '') + '</span>'
      +   '<span class="fxb-favmore-chev">\u25be</span>'
      + '</span>';
    grab.title = 'Pull up (or tap) for your faves, with sorting';
    grab.addEventListener('click', () => openFavourites());   // a drag that ended here never reaches this: attachFavPull swallows that click in the capture phase
    body.appendChild(grab);
    sec.appendChild(body);

    attachFavPull(sec, body, hint);
    return sec;
  }

  /* ---- the pull-down itself --------------------------------------------------------------------
   * Mechanics are the house ones rather than new inventions: the claim rules come from makeSwipeDown
   * (js/mobile.js:80) — 6px with axis dominance, bail on any upward move, setPointerCapture once
   * claimed, listeners on window, pointercancel NEVER commits — and the damping curve comes from the
   * home overpull (js/home.js:386), Math.pow(dy, 0.78) capped, because a pull that follows the finger
   * 1:1 feels like the section has come loose.
   *
   * IT IS GATED ON BEING AT THE END OF THE SCROLLER (see atEnd), and that is the whole reason this can
   * be a bare gesture on the block at all.
   * DIRECTION FLIPPED AT v8.06 (queue 204), and the gate did NOT simply flip with it. This was built as
   * a pull-DOWN gated on `scrollTop <= 0`: down at the top of a scroller is free, because there is
   * nothing left to scroll up to. Ezra then asked twice for UP — "it still needs to be added that
   * swiping up on the recents menu in effects opens the faves menu" — and up is only free at the OTHER
   * end, where there is nothing left to scroll down to. Negating the gate instead of mirroring it would
   * have claimed the scroll direction in the middle of the list and made the browser unscrollable,
   * which is a far worse regression than the gesture being the wrong way round.
   * It is the pull-to-refresh bargain, upside down.
   *
   * Under prefers-reduced-motion the gesture is not armed at all, the same call home.js makes for the
   * overpull: better that the feature simply is not there than that it fires a silent version of
   * itself. The strip is still a button, so nothing becomes unreachable. */
  /* BOTH NUMBERS ARE IN DAMPED PIXELS, NOT FINGER PIXELS, which is the trap this constant fell into
   * first time: Math.pow(dy, 0.78) turns a 150px drag into 49.8, so a commit point of 62 needed about
   * 210px of travel on a 259px-tall section — unreachable in practice, and the harness caught it as
   * "the armed state never lights". 34 is ~92px of finger travel (92^0.78), which is a deliberate pull
   * on a phone but nowhere near a whole screen. PULL_MAX 88 caps the stretch at ~310px. */
  let _unbindPull = null;
  const PULL_MAX = 88, PULL_COMMIT = 34;
  const FLICK_VY = 0.5, FLICK_MIN = PULL_COMMIT * 0.45;
  /* REVERSING CANCELS, AND THE CANCEL STICKS (queue 124). Ezra: "since people may start swiping and not
   * want to go in that menu … you can just swipe back up and cancel the swipe to opening the menu."
   * Releasing short of the commit point already did nothing, so a reversal all the way back was already
   * harmless — but that is a POSITION rule, and at full stretch it is a useless one: from PULL_MAX you
   * would have to haul the finger ~220px back up before the gesture disarmed. What he is describing is a
   * DECISION: change your mind, pull back a bit, and it is off — wherever you happened to be.
   * So the trigger is distance back from the PEAK, not absolute position, and once it fires the drag is
   * dead for good; pushing back down cannot re-arm it. A gesture that could flip-flop under the finger
   * would leave you unsure what you had chosen at the exact moment you let go, which is the whole
   * anxiety the request is about.
   * 12 damped px is 39–52px of real finger travel depending where you reversed from (the damping curve
   * squashes the top end) — far beyond hand jitter, well short of a hauling motion. */
  const REVERSE_BY = 12, REVERSE_FROM = PULL_COMMIT * 0.5;
  /* AT THE END, not at the top (queue 204). Ezra asked twice for swipe UP, and the gate could not simply
   * be negated: the down-pull was legal because `scrollTop <= 0` means there is nothing left to scroll
   * UP to, so the gesture is free. An up-pull is only free at the other end, where there is nothing left
   * to scroll DOWN to. Getting this backwards does not make the gesture wrong, it makes the effects
   * browser unscrollable — a far worse regression than the direction, and on the screen he uses most.
   * The 1px slack absorbs fractional scrollHeight on a zoomed or high-dpr viewport, where an exact
   * equality never lands and the gesture would simply never arm. */
  function atEnd(sc) { return sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1; }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function attachFavPull(sec, body, hint) {
    if (reducedMotion()) return;
    let sy = 0, sx = 0, lastY = 0, lastT = 0, vy = 0, id = null, live = false, claimed = false, px = 0;
    let peak = 0, dead = false;
    const scroller = () => sec.closest('.fxb-scroll');
    const txt = hint.querySelector('.fxb-pullhint-txt'), ico = hint.querySelector('.fxb-pullhint-ico');
    /* The hint says which of the three things is about to happen, because "nothing visibly different"
     * is not an answer to "what will letting go do?". Written on state CHANGE only — this runs inside
     * pointermove, and rewriting identical text every frame is layout the gesture does not need. */
    let shown = '';
    const say = state => {
      if (state === shown) return;
      shown = state;
      hint.classList.toggle('armed', state === 'armed');
      hint.classList.toggle('cancelled', state === 'cancelled');
      if (ico) ico.textContent = state === 'cancelled' ? '↓' : '★';   // reversing an UP pull means going back down
      if (txt) txt.textContent = state === 'armed' ? 'Release to open' : state === 'cancelled' ? 'Cancelled' : 'Faves';
    };
    const set = (v, ease) => {
      body.style.transition = ease || '';
      body.style.transform = v ? 'translate3d(0,' + (-v).toFixed(1) + 'px,0)' : '';   // negative: pulls UP (queue 204)
      // The hint brightens with the pull and goes accent once you are past the commit point, so the
      // finger knows it has done enough BEFORE it lifts — the one thing a pull gesture must tell you.
      hint.style.opacity = v ? Math.min(1, v / (PULL_COMMIT * 0.75)).toFixed(2) : '';   // fully lit just before it arms, so the accent flip is the last thing that happens
      if (!dead) say(v >= PULL_COMMIT ? 'armed' : 'pulling');
    };
    let eating = null;
    const disarmEat = () => { if (eating) { sec.removeEventListener('click', eating, true); eating = null; } };
    const armEat = () => {
      disarmEat();
      eating = ev => { ev.stopPropagation(); ev.preventDefault(); disarmEat(); };
      sec.addEventListener('click', eating, true);
    };
    const down = e => {
      disarmEat();                                             // a new touch always clears a stale trap
      if (live || e.pointerType === 'mouse' && e.button !== 0) return;
      const sc = scroller();
      if (!sc || !atEnd(sc)) return;                             // only from a browser already at the END — see atEnd
      if (e.target.closest('input, textarea, select')) return;
      live = true; claimed = false; px = 0; peak = 0; dead = false; id = e.pointerId;
      say('pulling');   // reset on the NEXT gesture, not on release — letting go is exactly when you still want to be reading "Cancelled"; by then the hint is fading out anyway
      sy = lastY = e.clientY; sx = e.clientX; lastT = e.timeStamp; vy = 0;
    };
    const move = e => {
      if (!live || e.pointerId !== id) return;
      const dy = e.clientY - sy, dx = e.clientX - sx;
      if (!claimed) {
        if (dy > 4) { live = false; return; }                    // downward → this is a scroll, let it go
        if (dy < -6 && -dy > Math.abs(dx)) { claimed = true; try { body.setPointerCapture(id); } catch (_) {} }
        else return;
      }
      const sc = scroller();
      if (!sc || !atEnd(sc)) { set(0); live = false; return; }         // scrolled away mid-pull
      if (e.cancelable) e.preventDefault();
      const now = e.timeStamp, dt = now - lastT;
      if (dt > 0) vy = (e.clientY - lastY) / dt;
      lastY = e.clientY; lastT = now;
      if (dead) return;                                          // cancelled: hold the block home, but keep eating the scroll until the finger leaves
      px = Math.min(PULL_MAX, Math.pow(Math.max(0, -dy), 0.78));   // -dy: the pull is UP now (queue 204)
      if (px > peak) peak = px;
      if (peak >= REVERSE_FROM && peak - px >= REVERSE_BY) {      // pulled back → decided against it
        dead = true; px = 0;
        say('cancelled');
        set(0, 'transform 200ms cubic-bezier(.22,.8,.3,1)');      // glides home under the finger, so the cancel is something you SEE, not something you find out on release
        hint.style.opacity = '1';                                 // …and the word stays lit while it does, then fades with the section
        setTimeout(() => { if (hint) hint.style.opacity = ''; }, 320);
        return;
      }
      set(px);
    };
    const settle = (e, aborted) => {
      if (!live || (e && e.pointerId !== id)) return;
      const was = claimed, amt = dead ? 0 : px, killed = dead;
      live = false; claimed = false; px = 0; peak = 0; dead = false;
      if (_unbindPull) _unbindPull();
      try { body.releasePointerCapture(id); } catch (_) {}
      if (!was) return;
      /* A claimed drag must not also count as a tap on whatever it started on: the effect TILES are
       * plain buttons (built by tileForId, shared with search and the category views), so a drag that
       * began on a tile would otherwise ADD that effect on release. Swallow exactly one click in the
       * capture phase, so it never reaches the tile or the strip.
       * NO TIMER DISARMS IT. The first cut cleared the trap on setTimeout(0), which the harness caught
       * failing: background the tab mid-drag — switching apps on a phone is exactly that — and the
       * timer is throttled for minutes, leaving the strip and every tile dead to the touch with no way
       * to tell why. The trap now clears on whichever comes first, the click it was set for or the
       * next pointerdown, so it can never outlive the gesture that set it. */
      armEat();
      /* A flick still opens it, but only with a floor under it — the same velocity-AND-distance pair
       * the effect-row swipe uses (js/inspector.js:816). Velocity alone let a 28px nudge open the
       * whole favourites screen, which is exactly the kind of thing you hit by accident while
       * scrolling and cannot explain afterwards. */
      if (!aborted && !killed && (amt >= PULL_COMMIT || (vy > FLICK_VY && amt > FLICK_MIN))) {
        if (navigator.vibrate) { try { navigator.vibrate(9); } catch (_) {} }
        set(0, 'transform 190ms cubic-bezier(0,0,.2,1)');
        openFavourites(true);
      } else {
        set(0, 'transform 220ms cubic-bezier(.22,.8,.3,1)');      // abandoned → glide back, the home-overpull return
      }
      setTimeout(() => { if (body) body.style.transition = ''; }, 260);
    };
    /* The window listeners are bound only WHILE a drag is live, not for the life of the section.
     * rerenderPaged() replaces this whole section on every ★ toggle, so the permanent version leaked a
     * fresh move/up/cancel trio each time — and worse, the old closures kept firing against a detached
     * body forever. Binding on pointerdown and unbinding in settle() means at most one trio exists, and
     * it dies with the gesture.
     * lostpointercapture is in there because setPointerCapture on an element that then gets replaced
     * mid-drag delivers neither pointerup nor pointercancel; without it `live` would stay true and the
     * gesture would refuse to start ever again. */
    const bind = on => {
      const f = on ? window.addEventListener : window.removeEventListener;
      f.call(window, 'pointermove', move, { passive: false });
      f.call(window, 'pointerup', settle);
      f.call(window, 'pointercancel', cancel);
      f.call(window, 'lostpointercapture', cancel);
    };
    const cancel = e => settle(e, true);        // the OS (or a rebuild) stole it → snap back, never open
    body.addEventListener('pointerdown', e => { down(e); if (live) bind(true); });
    _unbindPull = () => bind(false);
  }

  /* ---- Section B½ — the full-screen FAVOURITES browser (queue 74) ------------------------------
   * Ezra: "swipe up for a full-screen Favourites browser… sorting by recency, effect type and A–Z,
   * each with an inverted order."
   *
   * WHY IT IS A HANDLE AND NOT A BARE SWIPE-UP ON THE SECTION. This browser is itself a vertical
   * scroller, so "swipe up anywhere on the Recents & favourites block" is the same gesture as
   * "scroll down past it" — wiring that would make the page unscrollable at exactly the point you
   * need to scroll through it. The swipe lives on its own strip instead, which also means it can be
   * TAPPED. A gesture with no visible affordance is how Group ended up unreachable on the PC (queue
   * 53): the action existed, and nobody could find the door.
   *
   * The three orders are the three questions actually being asked — "what did I just star", "show me
   * all my blurs together", "where is the one called Chromatic something". Each inverts, so that is
   * six. The choice is remembered, because a sort you have to re-pick every time is a sort you stop
   * using.
   *
   * Recency is derived, not stored: toggleFav APPENDS, so array order IS the order things were
   * starred, and newest-first is simply that reversed. No new persisted field, and no migration for
   * anyone's existing favourites. */
  const FAVSORT_KEY = 'fm.fx.favSort';
  const FAV_SORTS = [
    { key: 'recent', label: 'Recent' },
    { key: 'type',   label: 'Type' },
    { key: 'az',     label: 'A–Z' },
  ];
  function favSortRead() {
    try { const o = JSON.parse(localStorage.getItem(FAVSORT_KEY) || '{}');
      return { key: FAV_SORTS.some(s => s.key === o.key) ? o.key : 'recent', inv: !!o.inv }; }
    catch (e) { return { key: 'recent', inv: false }; }
  }
  function favSortWrite(o) { try { localStorage.setItem(FAVSORT_KEY, JSON.stringify(o)); } catch (e) {} }
  function favLabel(id) { const r = FM.fxRegistry.get(id); return PSEUDO[id] || (r && r.label) || id; }
  function favCatKey(id) {
    if (id === '_mask') return 'matte';          // the pseudo-entries sort into the categories they lead
    const r = FM.fxRegistry.get(id); return (r && r.category) || '';
  }
  function favCatLabel(key) {
    const c = (FM.fxRegistry.categories() || []).find(x => x.key === key);
    return c ? c.label : 'Other';
  }
  // Sorted COPY — never the stored array, because the stored order is the recency record.
  function favSorted(ids, sort) {
    const out = ids.slice();
    if (sort.key === 'recent') out.reverse();                       // stored oldest→newest, so newest first
    else if (sort.key === 'az') out.sort((a, b) => favLabel(a).localeCompare(favLabel(b)));
    else if (sort.key === 'type') out.sort((a, b) => {
      const ca = favCatLabel(favCatKey(a)), cb = favCatLabel(favCatKey(b));
      return ca === cb ? favLabel(a).localeCompare(favLabel(b)) : ca.localeCompare(cb);
    });
    if (sort.inv) out.reverse();
    return out;
  }

  /* fromPull: the view is being opened by the pull-down gesture rather than a tap, so it enters as a
   * continuation of that drag — sliding down from above, the direction the finger was already going.
   * A tap gets the same entrance minus the travel. This is the first panel in the browser with an
   * entrance at all (catview and the browser itself just appear), which is the point: the gesture
   * needs somewhere to land or the pull feels like it did nothing and the screen merely changed. */
  function openFavourites(fromPull) {
    const view = el('div', 'fxb-catview fxb-favview' + (reducedMotion() ? ' fxb-favview-fade' : (fromPull ? ' fxb-favview-pull' : ' fxb-favview-in')));
    _catDepth++; stopAuto();
    const closeView = () => { view.remove(); if (--_catDepth <= 0) { _catDepth = 0; if (_featRow && _featRow.isConnected) startAuto(_featRow); } };
    tapOutToClose(view, closeView);

    /* Faves re-labels its own title as the count changes, so it keeps a handle on it. Asked for from the
       shared header rather than hand-built, which is the whole point of having one. */
    const favTop = subTop('Faves', closeView);
    const title = favTop.querySelector('.fxb-catview-title');
    view.appendChild(favTop);

    const bar = el('div', 'fxb-favsort');
    const scroller = el('div', 'fxb-catview-scroll');
    view.appendChild(bar);
    view.appendChild(scroller);

    function paint() {
      const sort = favSortRead();
      const ids = readList(FAV_KEY);
      title.textContent = 'Faves' + (ids.length ? ' · ' + ids.length : '');
      bar.innerHTML = '';
      FAV_SORTS.forEach(s => {
        const b = el('button', 'fxb-sortbtn' + (s.key === sort.key ? ' on' : ''), s.label);
        b.type = 'button';
        b.title = 'Sort by ' + s.label.toLowerCase();
        b.addEventListener('click', () => {
          // Tapping the ACTIVE sort flips it. One control, two jobs — and it means the invert is
          // discoverable by pressing the thing you already pressed, rather than hidden behind a
          // second icon you have to know about.
          const cur = favSortRead();
          favSortWrite(s.key === cur.key ? { key: cur.key, inv: !cur.inv } : { key: s.key, inv: false });
          paint();
        });
        if (s.key === sort.key) b.appendChild(el('span', 'fxb-sortdir', sort.inv ? ' ↑' : ' ↓'));
        bar.appendChild(b);
      });

      scroller.innerHTML = '';
      if (!ids.length) {
        scroller.appendChild(el('div', 'fxb-empty', 'Tap ★ on any effect to favourite it'));
        return;
      }
      const sorted = favSorted(ids, sort);
      if (sort.key === 'type') {
        // Grouped, with a heading per category — "sort by type" that produced one flat run would be
        // sorted and unreadable, which is not what the word means to anyone looking for their blurs.
        let cur = null, grid = null;
        sorted.forEach(id => {
          const ck = favCatLabel(favCatKey(id));
          if (ck !== cur) {
            cur = ck;
            scroller.appendChild(el('div', 'fxb-sec-title', ck));
            grid = el('div', 'fxb-grid'); scroller.appendChild(grid);
          }
          const t = tileForId(id, paint); if (t && grid) grid.appendChild(t);
        });
      } else {
        const grid = el('div', 'fxb-grid');
        sorted.forEach(id => { const t = tileForId(id, paint); if (t) grid.appendChild(t); });
        scroller.appendChild(grid);
      }
    }
    paint();
    root.appendChild(view);
    return view;
  }
  FM._fxOpenFavourites = openFavourites;   // so the suite can open it without synthesising the gesture

  // Section C — category banners → per-category effect list (slide-in sub-screen).
  function buildCategories() {
    const sec = el('div', 'fxb-section');
    sec.appendChild(el('div', 'fxb-sec-title', 'Categories'));
  /* ONE ICON PER CATEGORY (queue 461). Ezra: *"Make an icon for each section that resembles the overall
   * theme in some way, like for colouring you could do an interesting colour palette but do something
   * distinct for each one"*, and *"Instead of how it is rn with random colours"*.
   * The tiles carried a colour and a word and nothing else, and the colours are per-category but carry
   * no meaning you can read — which is his complaint. The colours are kept (they are deliberate; the
   * Text one is even deliberately neutral, see styles.css) and the icon is what says what the section
   * IS.
   * Drawn to the app's existing icon family — 24 viewBox, 1.7 stroke, round caps — so they sit with the
   * add-menu tabs rather than looking imported. Every silhouette is distinct from every other AND from
   * the five add-menu tabs: no cube here, because Elements already owns that shape. */
  const CAT_ICON = {
    // a painter's palette, his own example
    color: '<path d="M12 3.4c-4.9 0-8.9 3.5-8.9 7.9 0 3.1 2.3 4.7 4.5 4.7h1.5a1.8 1.8 0 0 1 1.4 3c-.5.7-.2 1.7.9 1.7 4.9 0 8.9-3.9 8.9-8.7s-4-8.6-8.3-8.6z"/><circle cx="8.1" cy="9.1" r=".95"/><circle cx="12" cy="7.4" r=".95"/><circle cx="15.9" cy="9.6" r=".95"/>',
    // one sharp edge, one that has gone soft
    blur: '<circle cx="9.3" cy="12" r="4.1"/><circle cx="15.6" cy="12" r="5.3" stroke-dasharray="2.1 2.5"/>',
    // a straight grid pushed out of true
    distort: '<path d="M3.4 8.6c2.9-2.4 5.7 2.4 8.6 0s5.7 2.4 8.6 0M3.4 15.4c2.9-2.4 5.7 2.4 8.6 0s5.7 2.4 8.6 0"/>',
    // something being made out of nothing
    proc: '<path d="M12 3.5l1.1 2.7 2.7 1.1-2.7 1.1L12 11.1l-1.1-2.7-2.7-1.1 2.7-1.1z"/><circle cx="6.2" cy="15.2" r="1.5"/><circle cx="11.9" cy="17.7" r="1.1"/><circle cx="17.4" cy="13.8" r="1.8"/>',
    // a cut gem — a look applied over the top
    stylize: '<path d="M12 3.6l4.7 4.1-4.7 12.2-4.7-12.2z"/><path d="M7.5 7.7h9"/>',
    // a pen nib
    drawing: '<path d="M5.9 18.4l1.6-4.9 8.6-8.6a1.9 1.9 0 0 1 2.7 2.7l-8.6 8.6z"/><path d="M14.6 6.4l3.1 3.1"/>',
    // held still in the middle, thrown about at the edges
    move: '<rect x="9.1" y="7.4" width="5.8" height="9.2" rx="1.4"/><path d="M5.9 9.6v4.8M3.2 11.1v1.8M18.1 9.6v4.8M20.8 11.1v1.8"/>',
    // the same tile, again
    repeat: '<rect x="3.9" y="3.9" width="6.8" height="6.8" rx="1.4"/><rect x="13.3" y="3.9" width="6.8" height="6.8" rx="1.4"/><rect x="3.9" y="13.3" width="6.8" height="6.8" rx="1.4"/><rect x="13.3" y="13.3" width="6.8" height="6.8" rx="1.4"/>',
    // the subject you are keeping, inside the frame you are dropping
    matte: '<rect x="3.4" y="4.4" width="17.2" height="15.2" rx="2"/><circle cx="12" cy="10.3" r="2.2"/><path d="M8.9 16.4a3.9 3.9 0 0 1 6.2 0"/>',
    // solid on one side, see-through on the other
    opacity: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16"/><path d="M14.6 7.6h2.8M14.6 11.2h2.8M14.6 14.8h2.8"/>',
    // a letter
    text: '<path d="M6.4 18.6L12 5.2l5.6 13.4"/><path d="M8.5 14.2h7"/>',
    // depth WITHOUT a cube — Elements already owns that silhouette
    threed: '<path d="M3.4 14.7l8.6-4.2 8.6 4.2-8.6 4.2z"/><path d="M12 10.5V4.4"/><path d="M9.5 6.8L12 4.3l2.5 2.5"/>',
    other: '<circle cx="12" cy="12" r="7.6"/><path d="M12 8.2v4.4l3 1.8"/>',
  };
  const catIcon = (key) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (CAT_ICON[key] || CAT_ICON.other) + '</svg>';

    const list = el('div', 'fxb-cats');
    FM.fxRegistry.categories().forEach(cat => {
      const b = el('button', 'fxb-banner'); b.dataset.cat = cat.key;
      const ico = el('span', 'fxb-banner-ico'); ico.innerHTML = catIcon(cat.key);
      b.appendChild(ico);
      b.appendChild(el('span', 'fxb-banner-label', cat.label));
      b.appendChild(el('span', 'fxb-banner-count', String(FM.fxRegistry.byCategory(cat.key).length)));
      b.addEventListener('click', () => openCategory(cat));
      list.appendChild(b);
    });
    sec.appendChild(list);
    return sec;
  }

  /* ONE header for every sub-view of the browser — Back on the left, the title, Done on the right.
   *
   * The three sub-views (a tile's preset sheet, Faves, and a category) each built this by hand, and each
   * had only "‹ Back". Ezra: "when adding effects the done button should be there if ur inside one of
   * the effects sub menus" — and he is right that it was missing: from inside a category the only way
   * out of the browser was Back and THEN the close button, so finishing took two taps and one of them
   * went the wrong way.
   * Back closes the SUB-VIEW, Done closes the WHOLE browser. Built once rather than three times so the
   * two cannot drift apart — which is how they came to differ from the root header in the first place. */
  function subTop(titleText, closeView) {
    const top = el('div', 'fxb-catview-top');
    const back = el('button', 'fxb-back', '‹ Back');
    back.addEventListener('click', closeView);
    top.appendChild(back);
    top.appendChild(el('div', 'fxb-catview-title', titleText));
    /* DONE ADDS WHAT YOU PICKED (queue 333 clause 1 / queue 360). It used to call close() and nothing
       else, so every numbered pick was thrown on the floor — Ezra, twice, from opposite directions:
       *"All the effects I have selected do nothing im pretty sure, we talked about this ages ago but I
       guess you never fixed"* (a screenshot of EIGHT effects numbered 1-8 and an unchanged canvas), and
       *"when you press the dumb button it just kicks you out and doesn't actually add any of the effects
       or do anything. It's just there to fuck you over"*.
       He is describing one defect from two angles, and the second quote is the more useful one: a button
       labelled Done, beside a numbered selection, cannot mean "discard". Nobody presses Done to cancel.
       That was my design mistake, not a misreading on his part — the button predates the multi-select
       and was never revisited when picking arrived.
       With nothing picked it still just closes, which is the only thing it can mean then. */
    const done = el('button', 'fxb-back fxb-subdone', 'Done');
    done.type = 'button';
    done.title = 'Add the effects you picked and close';
    done.addEventListener('click', () => { if (_picked.length) commitPicks(); else FM.fxBrowser.close(); });
    top.appendChild(done);
    return top;
  }

  function openCategory(cat) {
    const view = el('div', 'fxb-catview');
    // pause the featured auto-scroll + its thumbnail ticker while a full-cover category view is open
    // (they were repainting invisibly underneath)
    _catDepth++; stopAuto();
    const closeView = () => { view.remove(); if (--_catDepth <= 0) { _catDepth = 0; if (_featRow && _featRow.isConnected) startAuto(_featRow); } };
    tapOutToClose(view, closeView);
    view.appendChild(subTop(cat.label, closeView));
    const grid = el('div', 'fxb-grid');
    if (cat.key === 'matte') grid.appendChild(maskTile());   // Mask leads its home category
    FM.fxRegistry.byCategory(cat.key).forEach(reg => grid.appendChild(tile(reg, null)));
    const scroller = el('div', 'fxb-catview-scroll'); scroller.appendChild(grid);
    view.appendChild(scroller);
    // Prev/next category arrows pinned under the list — page through every category in place
    // instead of Back → pick → Back → pick. Wraps at the ends. (Ezra)
    const cats = FM.fxRegistry.categories();
    const ci = Math.max(0, cats.findIndex(c => c.key === cat.key));
    const prev = cats[(ci - 1 + cats.length) % cats.length];
    const next = cats[(ci + 1) % cats.length];
    const nav = el('div', 'fxb-catnav');
    nav.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid var(--line);background:var(--panel-2, rgba(16,20,28,.96));';
    const go = (target) => { view.remove(); _catDepth--; openCategory(target); };   // balance the depth: openCategory re-increments, so a nav nets zero (else each arrow leaked +1 and froze the Featured auto-scroll forever)
    const mkBtn = (label, target) => {
      const b = el('button', 'fxb-back', label);
      b.style.cssText = 'flex:1;min-height:40px;padding:0 10px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';   // .fxb-back has no padding, so these paged to ~19px tall — under the thumb minimum, and a near-miss lands on the nav div, which has no handler
      b.addEventListener('click', () => go(target));
      return b;
    };
    nav.appendChild(mkBtn('‹ ' + prev.label, prev));
    nav.appendChild(el('span', 'fxb-catnav-pos', (ci + 1) + '/' + cats.length)).style.cssText = 'color:var(--text-dim);font-size:11px;flex:none;';
    nav.appendChild(mkBtn(next.label + ' ›', next));
    view.appendChild(nav);
    root.appendChild(view);
  }

  function buildSearchResults(q) {
    const grid = el('div', 'fxb-grid fxb-search-grid');
    const needle = q.toLowerCase();
    const catLabel = {};
    (FM.fxRegistry.categories() || []).forEach(c => { catLabel[c.key] = (c.label || '').toLowerCase(); });
    // match the label, the type id, OR the category name — so "3d", "blur" or "warp" surface
    // the whole family, not just effects that happen to carry the word in their title
    if ('mask'.indexOf(needle) >= 0 || needle.indexOf('mask') >= 0) grid.appendChild(maskTile());   // the pseudo-entry is searchable too
    // …and so is the object blur. Match the words someone would actually type when the clip they
    // MOVED isn't smearing: "motion", "blur", "object", plus its controls.
    // Name, id, category, DESCRIPTION and TAGS — so "shutter", "angle" or "smear" find the thing you
    // meant even when the word never appears in its title. (Ezra: "when you search for effects it
    // will also show effects with descriptions matching what you searched".)
    FM.fxRegistry.all().filter(r =>
      r.label.toLowerCase().indexOf(needle) >= 0 ||
      (r.type || '').toLowerCase().indexOf(needle) >= 0 ||
      (catLabel[r.category] || '').indexOf(needle) >= 0 ||
      (r.desc || '').toLowerCase().indexOf(needle) >= 0 ||
      (r.tags || []).some(function (t) { return t.indexOf(needle) >= 0; })
    ).forEach(reg => grid.appendChild(tile(reg, null)));
    if (!grid.children.length) grid.appendChild(el('div', 'fxb-empty', 'No effects match “' + q + '”'));
    return grid;
  }

  /* The Visual/Audio switch that leads the browser (queue 45). Ezra: "put a toggle at the top that
   * switches from showing you either the normal effects or audio ones." The two browsers are separate
   * full-screen overlays with identical chrome, so switching = close this one, open the other at the
   * same scroll position of the page (the top). Built by FM.fxModeToggle so the greying rule — and
   * what it says when you tap it — is written once, in inspector.js, for all three places it appears. */
  function modeToggle() {
    if (!FM.fxModeToggle || !_layer) return null;
    /* THE KEY, NOT AN ASSUMPTION (queue 317). Ezra: *"When you're in the add effect menu and press
       filters it thinks you pressed audio effects and then boots you out with a pop up"*. He is
       describing this callback exactly: it took no argument, so ANY tab that was not the current one
       closed the browser and opened the AUDIO one — and the popup was the audio browser explaining
       that the layer has no audio track. Written when there were only two sides, and never revisited
       when Filters became the third at queue 113. The inspector's own caller has always passed the key
       through, which is why this only ever misbehaved in the full-screen browser. */
    const tg = FM.fxModeToggle(_layer, 'visual', (key) => {
      const layer = _layer;
      if (key === 'visual') return;                 // already here
      // …and switching side is an exit too: picks made here must not vanish on the way to Audio (queue 389)
      if (_picked.length) commitPicks(); else FM.fxBrowser.close();
      if (key === 'audio') { if (FM.audioFxBrowser) FM.audioFxBrowser.open(layer); return; }
      // Filters is a list of ready-made looks rather than a grid of tiles, and it lives in the
      // inspector. Hand it back there instead of keeping a second copy of it in here.
      if (FM.inspector && FM.inspector.openFxTab) FM.inspector.openFxTab(key);
    });
    // The audio answer may not be known yet (it means decoding the file). The toggle rendered
    // optimistically; if the probe comes back "no track", re-render so the side greys out.
    if (FM.fxProbeAudioSide) FM.fxProbeAudioSide(_layer, id => { if (_layer && _layer.id === id && root && !root.classList.contains('hidden')) rebuild(); });
    return tg;
  }

  let _featRow = null, _catDepth = 0;
  function rebuild() {
    scrollEl.innerHTML = '';
    const tg = modeToggle(); if (tg) scrollEl.appendChild(tg);   // above everything, search results included
    const q = (searchInput.value || '').trim();
    if (q) { scrollEl.appendChild(buildSearchResults(q)); stopAuto(); return; }
    const feat = buildFeatured();
    scrollEl.appendChild(feat.sec);
    scrollEl.appendChild(buildPaged(rerenderPaged));   // star toggles do a LIGHT paged rerender (below), not a full rebuild
    scrollEl.appendChild(buildCategories());
    _featRow = feat.row;
    if (!_catDepth) startAuto(feat.row);
  }
  /* Toggling a ★ only needs the Recents section rebuilt — a full rebuild() also restarts the featured
   * carousel from the left, which is the v3.23 fix and must not be undone.
   * THE ANCHOR IS .fxb-recents. It used to be .fxb-pager, and when the pager was deleted for queue 92
   * that selector would have quietly returned null on every star toggle, falling through to the full
   * rebuild() below — no error, no failing test, just the carousel jumping back to the left each time
   * you favourited something. Anchoring on a class the section will always have is the fix. */
  function rerenderPaged() {
    const oldSec = scrollEl.querySelector('.fxb-recents');
    if (!oldSec) { rebuild(); return; }
    oldSec.replaceWith(buildPaged(rerenderPaged));
  }

  // tiny monotonic clock (Date.now is fine in app runtime, just not in workflow sandbox)
  function perfNow() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = 0; } }
  function startAuto(row) {
    stopAuto();
    autoTimer = setInterval(() => {
      if (!row || !row.isConnected) { stopAuto(); return; }
      if (perfNow() < autoPauseUntil) return;
      const max = row.scrollWidth - row.clientWidth;
      if (max <= 2) return;
      if (row.scrollLeft >= max - 0.5) return;   // reached the end → STOP here (hit the wall, no loop-back)
      row.scrollLeft = Math.min(max, row.scrollLeft + 1.2);
    }, 30);
  }
  // Seam: the suite reads this builder's title string rather than OPENING the browser, because
  // opening it mounts every effect thumbnail and a later thumbnail measurement then goes red (queue 445).
  FM._buildFeaturedSrc = function () { return String(buildFeatured); };


  FM.fxBrowser = {
    isFav: isFav, toggleFav: toggleFav,   // so an applied effect's ⋯ menu can favourite it too (#62)
    // Suite seams: whether the sheet is up, and a way to open a category sub-view without hunting for
    // its tile in the grid.
    isOpen: function () { return !!(root && !root.classList.contains('hidden')); },
    /* Takes the category OBJECT or just its key. It used to take only the object, and passing a key
       did not throw — `cat.key` came back undefined, byCategory(undefined) returned nothing, and you
       got a category view containing an empty grid. A sweep written against that reaches zero tiles and
       passes every assertion it makes about the tiles it reached. Resolving the key here means the
       wrong call is impossible rather than merely documented. */
    _openCategory: function (cat) {
      const c = (cat && typeof cat === 'object') ? cat : (FM.fxRegistry.categories() || []).filter(x => x.key === cat)[0];
      if (!c) throw new Error('no such effect category: ' + cat);
      return openCategory(c);
    },
    init: function () {
      root = document.getElementById('fx-browser'); if (!root) return;
      scrollEl = root.querySelector('.fxb-scroll');
      searchInput = root.querySelector('.fxb-search-input');
      /* EVERY EXIT NOW MEANS THE SAME THING AS Done (queue 389, and it is queue 333's other half).
         `close()` clears `_picked`, so leaving by the X, by the PC backdrop, or by switching to Filters /
         Audio threw every numbered pick on the floor without a word — while Done, fixed in v9.81, applied
         them. Two exits from one screen disagreeing about what your picks mean is the defect, and it is the
         same argument #333 settled for Done: *"a button labelled Done, beside a numbered selection, cannot
         mean discard"*. Neither can an X, once there are eight badges on screen — his re-report is
         *"The effects selected here still don't do anything at allllllllllllllllll"* with exactly that
         picture, and closing by the X is the likeliest way to have reached it.
         Discarding is still one tap away and now has exactly ONE affordance, which is the commit bar's
         **Clear** — an explicit control that says what it does, rather than three exits that quietly do it. */
      const exitBrowser = () => { if (_picked.length) commitPicks(); else FM.fxBrowser.close(); };
      FM._fxExitBrowser = exitBrowser;   // suite seam
      root.querySelector('.fxb-close').addEventListener('click', exitBrowser);
      // Click the backdrop (outside the centred panel, on PC) → close. The panel's own clicks have
      // target inside .fxb-top / .fxb-scroll etc., so only a hit on the root backdrop itself closes.
      root.addEventListener('pointerdown', (e) => { if (e.target === root) exitBrowser(); });
      /* The commit bar. It only ever shows in sheet mode and only with something picked, so the
         desktop dialog and an untouched sheet look exactly as they did. */
      if (!root.querySelector('.fxb-commit')) {
        const bar = el('div', 'fxb-commit hidden');
        const clear = el('button', 'fxb-commit-clear', 'Clear');
        const go = el('button', 'fxb-commit-go', 'Add');
        const keep = el('button', 'fxb-commit-keep');
        const paintKeep = () => {
          const on = keepValues();
          keep.classList.toggle('on', on);
          keep.textContent = on ? 'Keep preview values' : 'Add naked';
          keep.title = on
            ? 'Effects land with the values the preview was drawn with'
            : 'Effects land fresh, with their default values';
        };
        keep.addEventListener('click', () => { setKeepValues(!keepValues()); paintKeep(); });
        paintKeep();
        clear.addEventListener('click', () => { _picked = []; paintPicks(); restartPreview(); });
        go.addEventListener('click', commitPicks);
        bar.appendChild(clear); bar.appendChild(keep); bar.appendChild(go);
        root.appendChild(bar);
      }
      const searchBtn = root.querySelector('.fxb-search-btn');
      searchBtn.addEventListener('click', () => { searchInput.classList.toggle('hidden'); if (!searchInput.classList.contains('hidden')) searchInput.focus(); else { searchInput.value = ''; rebuild(); } });
      searchInput.addEventListener('input', () => { clearTimeout(_searchDebounce); _searchDebounce = setTimeout(rebuild, 120); });   // debounce: every keystroke tore down + rebuilt the whole result grid, re-mounting a canvas per match
    },
    open: function (layer, opts) {
      if (!root) FM.fxBrowser.init();
      if (!root) return;
      _layer = layer || (FM.scene && FM.layerById(FM.scene, FM.scene.selectedId));
      // opts.into: add into a FILTER's own list rather than the layer's stack (queue 113). Held by
      // identity, and re-checked against the live layer at add time — the same reason addEffect
      // re-resolves the layer rather than trusting the one cached here.
      _into = (opts && opts.into) || null;
      if (!_layer) { if (FM.toast) FM.toast('Select a layer first', 1400); return; }
      searchInput.value = ''; searchInput.classList.add('hidden');
      _picked = [];
      const sheet = FM.fxSheet(root);      // the sheet (queue 277, and PC too since 303) — geometry defined once, up top
      root.classList.remove('hidden');
      rebuild();
      paintPicks();
      if (sheet) restartPreview();     // isolate + loop the layer straight away, with an empty stack
      // one-time discoverability nudge for the hidden gesture (AM users know it; new users don't)
      if (FM.toast && !localStorage.getItem('fm.fx.presetHint')) {
        try { localStorage.setItem('fm.fx.presetHint', '1'); } catch (_) {}
        FM.toast('Tip: hold any effect to browse its presets', 2600);
      }
    },
    /* HIDING COMES FIRST, before anything that could throw. Everything after it is teardown, and one
       of those steps repaints — which can throw on a media layer whose element is not ready. When it
       did, the overlay stayed on screen with no way out. Whatever else fails here, the browser closes. */
    close: function () {
      _into = null; if (!root) return;
      root.classList.add('hidden');
      _picked = []; FM.fxSheet(root, false);
      stopPreview(); stopAuto();
      if (FM.fxThumbs) FM.fxThumbs.stopAll();
      root.querySelectorAll('.fxb-catview').forEach(v => v.remove());
      _catDepth = 0;   // belt-and-braces: a leaked depth must never survive close/reopen
    },
  };
})(window.FM);
