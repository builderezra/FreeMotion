/* FreeMotion — full-screen Add-Effect browser (Alight Motion style): search · auto-scrolling featured
 * carousel · Recents grid that PULLS DOWN to the favourites browser + star-to-favourite · category banners that open
 * a per-category effect list. Adds exactly ONE effect per tap (the single add path). Reads FM.fxRegistry. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  const RECENTS_KEY = 'fm.fx.recents', FAV_KEY = 'fm.fx.fav', RECENTS_CAP = 8;   // PAGE_SIZE went with the sideways pager (queue 92); js/audio-fx-browser.js keeps its own
  // Two entries in this browser are NOT registry effects — Mask and Motion Blur (Object) are
  // pseudo-tiles that drive layer state directly. They still look like effects and sit in the same
  // grid, so they are favouritable like everything else; readList has to stop filtering them out.
  // (Declared here, populated after the tile builders exist — see PSEUDO_TILES.) (#62)
  const PSEUDO = { _mask: 'Mask', _objblur: 'Motion Blur (Object)' };
  /* Own keys only. This one is the sharpest of the family, because the ids it is keyed by come
   * straight out of localStorage ('fm.fx.recents' / 'fm.fx.fav') and PSEUDO_TILES is CALLED, not just
   * tested: a stored id of 'toString' passes knownId, survives readList, and tileForId then invokes
   * Object.prototype.toString and hands back the STRING '[object Undefined]' — which grid.appendChild
   * rejects with "parameter 1 is not of type 'Node'", taking the effects browser down on open. The
   * favourites list has a second route to the same place: favLabel returns the function itself and
   * the sort calls .localeCompare on it. */
  Object.setPrototypeOf(PSEUDO, null);
  function knownId(id) { return !!(PSEUDO[id] || FM.fxRegistry.get(id)); }
  function readList(key) { try { const a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a.filter(knownId) : []; } catch (e) { return []; } }
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
  function addEffect(id, preset) {
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
    layer.effects.forEach(e => { e._expanded = false; });   // accordion: the newcomer is the one open editor
    inst._expanded = true;                                    // land with the new effect's controls ready to tweak
    layer.effects.push(inst);             // <- exactly one entry
    pushRecent(id);
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
  // The click that ENDS a long-press must not also add the plain effect.
  function guardedAdd(elm, id) { return () => { if (elm._lpFired) { elm._lpFired = false; return; } addEffect(id); }; }

  // ---- "Mask" as an addable entry (Ezra: pressing + Add Effect should offer Mask) ----
  // Not a real effect instance: tapping it ADDS A PEN MASK to the layer and opens the mask editor.
  // Injected into the Matte category grid + search results; pure UI, the effect registry stays clean.
  function addMaskFromBrowser() {
    const layer = (FM.scene && _layer) ? FM.scene.layers.find(l => l.id === _layer.id) : null;
    if (!layer) { FM.fxBrowser.close(); return; }
    if (['shape', 'text', 'image', 'video', 'adjustment'].indexOf(layer.type) < 0) {
      if (FM.toast) FM.toast('Masks need a layer with pixels — camera/null/group can’t be masked', 1900);
      return;
    }
    if (!Array.isArray(layer.masks)) layer.masks = [];
    const m = (FM.masks && FM.masks.make) ? FM.masks.make('add')
      : { id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), enabled: true, mode: 'add', feather: 0, opacity: 1, invert: false, closed: true, path: [] };
    layer.masks.push(m);
    FM.fxBrowser.close();
    if (FM.inspector) FM.inspector.refresh();
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
    if (FM.maskTool && FM.maskTool.open) FM.maskTool.open(layer.id, m.id);
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
    wrap.addEventListener('click', addMaskFromBrowser);
    return wrap;
  }

  // ---- "Motion Blur (Object)" as an addable entry ----
  // Ezra: "I'm only seeing motion blur footage, we need a motion blur for the actual object."
  // It already existed and WORKED — it was just a checkbox buried in Move & Transform, while he
  // (reasonably) goes looking in the effects list, where the only two hits are Motion Blur (Footage),
  // which blurs movement INSIDE the clip, and Directional Blur, which ignores movement entirely.
  // Same pseudo-entry trick as Mask: this drives layer.motionBlur rather than pushing an effect
  // instance, so every existing project keeps rendering and exporting exactly as before.
  function enableObjectBlur() {
    const layer = (FM.scene && _layer) ? FM.scene.layers.find(l => l.id === _layer.id) : null;
    if (!layer) { FM.fxBrowser.close(); return; }
    if (!layer.motionBlur || typeof layer.motionBlur !== 'object') layer.motionBlur = { enabled: false, shutter: 0.5, samples: 8 };
    const already = !!layer.motionBlur.enabled;
    layer.motionBlur.enabled = true;
    FM.fxBrowser.close();
    if (FM.inspector) FM.inspector.refresh();
    if (FM.requestRender) FM.requestRender();
    if (!already && FM.history) FM.history.commit();
    if (FM.toast) FM.toast(already ? 'Motion Blur (Object) is already on — its shutter is in Move & Transform'
                                   : 'Motion Blur (Object) on — smears this layer’s own movement', 2200);
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
    wrap.addEventListener('click', enableObjectBlur);
    return wrap;
  }

  // Build whatever tile an id names — a registry effect or one of the two pseudo-entries. This is what
  // lets the Favourites page hold a favourited Mask / Motion Blur (Object) instead of dropping it. (#62)
  const PSEUDO_TILES = { _mask: maskTile, _objblur: objectBlurTile };
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
  function openPresets(reg) {
    if (!FM.effectPresets) return;
    const view = el('div', 'fxb-catview');
    _catDepth++; stopAuto();
    const closeView = () => { view.remove(); if (--_catDepth <= 0) { _catDepth = 0; if (_featRow && _featRow.isConnected) startAuto(_featRow); } };
    tapOutToClose(view, closeView);
    const top = el('div', 'fxb-catview-top');
    const back = el('button', 'fxb-back', '‹ Back'); back.addEventListener('click', closeView);
    top.appendChild(back);
    top.appendChild(el('div', 'fxb-catview-title', reg.label));
    view.appendChild(top);
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
      list.appendChild(el('div', 'fxb-empty', 'No presets for ' + reg.label + ' yet — set it up on a layer, then ⋯ → “Save as preset”'));
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

  // Section A — auto-scrolling, swipeable featured carousel.
  function buildFeatured() {
    const sec = el('div', 'fxb-section');
    sec.appendChild(el('div', 'fxb-sec-title', 'Featured'));
    const row = el('div', 'fxb-featured');
    (FM.FX_FEATURED || []).map(id => FM.fxRegistry.get(id)).filter(Boolean).forEach(reg => {
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
   * make it if you swipe down on recents it does a clean little animation and opens up the faves
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
    grab.innerHTML = '<span class="fxb-favmore-bar"></span><span class="fxb-favmore-txt">Faves' +
      (favs.length ? ' \u00b7 ' + favs.length : '') + ' \u25be</span>';
    grab.title = 'Pull down (or tap) for your faves, with sorting';
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
   * IT IS GATED ON scrollTop <= 0, and that is the whole reason this can be a bare gesture on the
   * block at all. The old swipe-UP had to live on its own narrow strip because up IS the scroll
   * direction here, so claiming it would have made the browser unscrollable exactly where you need to
   * scroll. Down at the top of a scroller is different: there is nothing left to scroll to, so the
   * gesture is free. It is the pull-to-refresh bargain, and it costs the user nothing — the Recents
   * block sits 244px down a 753px viewport, fully on screen the moment the browser opens.
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
      if (ico) ico.textContent = state === 'cancelled' ? '↑' : '★';
      if (txt) txt.textContent = state === 'armed' ? 'Release to open' : state === 'cancelled' ? 'Cancelled' : 'Faves';
    };
    const set = (v, ease) => {
      body.style.transition = ease || '';
      body.style.transform = v ? 'translate3d(0,' + v.toFixed(1) + 'px,0)' : '';
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
      if (!sc || sc.scrollTop > 0) return;                       // only from a browser already at the top
      if (e.target.closest('input, textarea, select')) return;
      live = true; claimed = false; px = 0; peak = 0; dead = false; id = e.pointerId;
      say('pulling');   // reset on the NEXT gesture, not on release — letting go is exactly when you still want to be reading "Cancelled"; by then the hint is fading out anyway
      sy = lastY = e.clientY; sx = e.clientX; lastT = e.timeStamp; vy = 0;
    };
    const move = e => {
      if (!live || e.pointerId !== id) return;
      const dy = e.clientY - sy, dx = e.clientX - sx;
      if (!claimed) {
        if (dy < -4) { live = false; return; }                   // upward → this is a scroll, let it go
        if (dy > 6 && dy > Math.abs(dx)) { claimed = true; try { body.setPointerCapture(id); } catch (_) {} }
        else return;
      }
      const sc = scroller();
      if (!sc || sc.scrollTop > 0) { set(0); live = false; return; }   // scrolled away mid-pull
      if (e.cancelable) e.preventDefault();
      const now = e.timeStamp, dt = now - lastT;
      if (dt > 0) vy = (e.clientY - lastY) / dt;
      lastY = e.clientY; lastT = now;
      if (dead) return;                                          // cancelled: hold the block home, but keep eating the scroll until the finger leaves
      px = Math.min(PULL_MAX, Math.pow(Math.max(0, dy), 0.78));
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
    if (id === '_objblur') return 'blur';
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

    const top = el('div', 'fxb-catview-top');
    const back = el('button', 'fxb-back', '‹ Back'); back.addEventListener('click', closeView);
    top.appendChild(back);
    const title = el('div', 'fxb-catview-title', 'Faves');
    top.appendChild(title);
    view.appendChild(top);

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
    const list = el('div', 'fxb-cats');
    FM.fxRegistry.categories().forEach(cat => {
      const b = el('button', 'fxb-banner'); b.dataset.cat = cat.key;
      b.appendChild(el('span', 'fxb-banner-label', cat.label));
      b.appendChild(el('span', 'fxb-banner-count', String(FM.fxRegistry.byCategory(cat.key).length)));
      b.addEventListener('click', () => openCategory(cat));
      list.appendChild(b);
    });
    sec.appendChild(list);
    return sec;
  }

  function openCategory(cat) {
    const view = el('div', 'fxb-catview');
    // pause the featured auto-scroll + its thumbnail ticker while a full-cover category view is open
    // (they were repainting invisibly underneath)
    _catDepth++; stopAuto();
    const closeView = () => { view.remove(); if (--_catDepth <= 0) { _catDepth = 0; if (_featRow && _featRow.isConnected) startAuto(_featRow); } };
    tapOutToClose(view, closeView);
    const top = el('div', 'fxb-catview-top');
    const back = el('button', 'fxb-back', '‹ Back'); back.addEventListener('click', closeView);
    top.appendChild(back);
    top.appendChild(el('div', 'fxb-catview-title', cat.label));
    view.appendChild(top);
    const grid = el('div', 'fxb-grid');
    if (cat.key === 'matte') grid.appendChild(maskTile());   // Mask leads its home category
    if (cat.key === 'blur') grid.appendChild(objectBlurTile());   // …and the object blur leads Blur, beside Motion Blur (Footage)
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
    if (/motion|blur|object|smear|shutter|transform/.test(needle)) grid.appendChild(objectBlurTile());
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
    const tg = FM.fxModeToggle(_layer, 'visual', () => {
      const layer = _layer;
      FM.fxBrowser.close();
      if (FM.audioFxBrowser) FM.audioFxBrowser.open(layer);
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

  FM.fxBrowser = {
    isFav: isFav, toggleFav: toggleFav,   // so an applied effect's ⋯ menu can favourite it too (#62)
    init: function () {
      root = document.getElementById('fx-browser'); if (!root) return;
      scrollEl = root.querySelector('.fxb-scroll');
      searchInput = root.querySelector('.fxb-search-input');
      root.querySelector('.fxb-close').addEventListener('click', () => FM.fxBrowser.close());
      // Click the backdrop (outside the centred panel, on PC) → close. The panel's own clicks have
      // target inside .fxb-top / .fxb-scroll etc., so only a hit on the root backdrop itself closes.
      root.addEventListener('pointerdown', (e) => { if (e.target === root) FM.fxBrowser.close(); });
      const searchBtn = root.querySelector('.fxb-search-btn');
      searchBtn.addEventListener('click', () => { searchInput.classList.toggle('hidden'); if (!searchInput.classList.contains('hidden')) searchInput.focus(); else { searchInput.value = ''; rebuild(); } });
      searchInput.addEventListener('input', () => { clearTimeout(_searchDebounce); _searchDebounce = setTimeout(rebuild, 120); });   // debounce: every keystroke tore down + rebuilt the whole result grid, re-mounting a canvas per match
    },
    open: function (layer) {
      if (!root) FM.fxBrowser.init();
      if (!root) return;
      _layer = layer || (FM.scene && FM.layerById(FM.scene, FM.scene.selectedId));
      if (!_layer) { if (FM.toast) FM.toast('Select a layer first', 1400); return; }
      searchInput.value = ''; searchInput.classList.add('hidden');
      root.classList.remove('hidden');
      rebuild();
      // one-time discoverability nudge for the hidden gesture (AM users know it; new users don't)
      if (FM.toast && !localStorage.getItem('fm.fx.presetHint')) {
        try { localStorage.setItem('fm.fx.presetHint', '1'); } catch (_) {}
        FM.toast('Tip: hold any effect to browse its presets', 2600);
      }
    },
    close: function () { if (!root) return; stopAuto(); if (FM.fxThumbs) FM.fxThumbs.stopAll(); root.classList.add('hidden'); root.querySelectorAll('.fxb-catview').forEach(v => v.remove()); _catDepth = 0; },   // belt-and-braces: a leaked depth must never survive close/reopen
  };
})(window.FM);
