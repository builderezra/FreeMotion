/* FreeMotion — full-screen Add-Audio-Effect browser. Sibling of fx-browser.js: search · auto-scrolling
 * featured carousel · paged Recents/Favourites grid with page dots + star-to-favourite · category banners
 * that open a per-category list. Adds exactly ONE effect per tap. Reads FM.audioFxRegistry.
 * The one exception is a VOICE tile (#966 B1): one named stack of those effects, in one undo step (FM.audioVoices).
 * Tiles carry a per-effect stroke glyph, not a canvas: audio has no frame to render. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  const RECENTS_KEY = 'fm.afx.recents', FAV_KEY = 'fm.afx.fav', RECENTS_CAP = 8, PAGE_SIZE = 8;
  function readList(key) { try { const a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a.filter(id => FM.audioFxRegistry.get(id)) : []; } catch (e) { return []; } }
  function writeList(key, arr) { try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {} }
  function pushRecent(id) { const a = readList(RECENTS_KEY).filter(x => x !== id); a.unshift(id); writeList(RECENTS_KEY, a.slice(0, RECENTS_CAP)); }
  function isFav(id) { return readList(FAV_KEY).indexOf(id) >= 0; }
  function toggleFav(id) { const a = readList(FAV_KEY); const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id); writeList(FAV_KEY, a); return i < 0; }

  // One star for every tile builder — the featured carousel had none, so the featured audio
  // effects were unfavouritable for no reason the user could see. (#62)
  function starFor(id, onStarChange) {
    const star = el('span', 'fxb-star' + (isFav(id) ? ' on' : '')); star.textContent = '★';
    star.title = 'Favourite';
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = toggleFav(id);
      star.classList.toggle('on', on);
      if (onStarChange) onStarChange();
    });
    return star;
  }

  let root, scrollEl, searchInput, _layer, autoTimer = 0, autoPauseUntil = 0, _searchDebounce = 0;

  /* One stroke glyph per effect — a small visual language for a thing you can't see: filter curves for
   * EQ, arcs for space, a knee for dynamics, a broken wave for character. Static author-written markup. */
  const GLYPHS = {
    bassTreble: '<path d="M2 16c3 0 3-8 6-8s3 8 6 8 3-8 6-8h2"/>',
    eq3: '<path d="M6 3v18M12 3v18M18 3v18"/><path d="M3 8h6M9 15h6M15 6h6"/>',
    lowpass: '<path d="M2 8h10c4 0 4 8 10 8"/>',
    highpass: '<path d="M2 16c6 0 6-8 10-8h10"/>',
    bandpass: '<path d="M2 17c5 0 5-10 10-10s5 10 10 10"/>',
    notch: '<path d="M2 7c5 0 5 10 10 10s5-10 10-10"/>',
    telephone: '<path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3z"/>',
    reverb: '<path d="M6 12h.01"/><path d="M10 8a6 6 0 0 1 0 8"/><path d="M14 5a10 10 0 0 1 0 14"/><path d="M18 2a14 14 0 0 1 0 20"/>',
    delay: '<path d="M4 5v14M10 8v8M16 10v4M22 11v2"/>',
    pingpong: '<path d="M8 6H3v5"/><path d="M3 6a12 12 0 0 0 18 6"/><path d="M16 18h5v-5"/><path d="M21 18A12 12 0 0 0 3 12"/>',
    width: '<path d="M12 4v16"/><path d="M8 8 4 12l4 4"/><path d="m16 8 4 4-4 4"/>',
    pan: '<path d="M3 17a9 9 0 0 1 18 0"/><path d="m12 17 5-5"/><circle cx="12" cy="17" r="1.4"/>',
    autopan: '<path d="M3 15a9 9 0 0 1 18 0"/><path d="M4 20c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4"/>',
    gain: '<path d="M12 21V3"/><path d="m6 9 6-6 6 6"/><path d="M4 21h16"/>',
    compressor: '<path d="M3 21 12 12h9"/><path d="M3 21 21 3" stroke-dasharray="2 2.5"/>',
    limiter: '<path d="M3 7h18" stroke-dasharray="2 2.5"/><path d="M3 17c2 0 2-10 4-10s2 10 4 10 2-10 4-10 2 10 4 10h2"/>',
    tremolo: '<path d="M2 12c2.5 0 2.5-7 5-7s2.5 7 5 7 2.5-7 5-7 2.5 7 5 7"/>',
    distortion: '<path d="M2 17V7h5v10h5V7h5v10h5"/>',
    bitcrush: '<path d="M2 19h4v-4h4v-4h4V7h4V4h4"/>',
    lofi: '<path d="M3 12h2M7 8v8M11 10v4M15 6v12M19 11v2"/>',
    chorus: '<path d="M2 10c2.5 0 2.5-5 5-5s2.5 5 5 5 2.5-5 5-5 2.5 5 5 5"/><path d="M2 19c2.5 0 2.5-5 5-5s2.5 5 5 5 2.5-5 5-5 2.5 5 5 5" opacity=".55"/>',
    flanger: '<path d="M3 20V4M7 20V7M11 20v-9M15 20V7M19 20V4"/><path d="M3 12h18" stroke-dasharray="2 2.5"/>',
    phaser: '<path d="M2 8c4 0 4 8 8 8"/><path d="M8 8c4 0 4 8 8 8" opacity=".6"/><path d="M14 8c4 0 4 8 8 8" opacity=".35"/>',
    vibrato: '<path d="M2 12h3"/><path d="M5 12c1.2-4 2.8-4 4 0s2.8 4 4 0 2.8-4 4 0"/><path d="M19 12h3"/>',
    ringmod: '<path d="M2 12c1.5 0 1.5-4 3-4s1.5 4 3 4"/><path d="m10 9 4 6M14 9l-4 6"/><path d="M16 12c1.5 0 1.5-4 3-4s1.5 4 3 4"/>',
    vocalremove: '<path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M6 11a6 6 0 0 0 12 0"/><path d="M12 17v4"/><path d="m3 3 18 18"/>',
    pitch: '<path d="M2 15c2.5 0 2.5-6 5-6s2.5 6 5 6"/><path d="M18 20V4"/><path d="m14 8 4-4 4 4"/><path d="m14 16 4 4 4-4"/>',
  };
  const CAT_FALLBACK = { eq: 'bandpass', space: 'reverb', dyn: 'gain', char: 'distortion' };

  function thumb(reg) {
    const t = el('div', 'fxb-thumb afxb-thumb'); t.dataset.cat = reg.category;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'afxb-glyph');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = GLYPHS[reg.type] || GLYPHS[CAT_FALLBACK[reg.category]] || GLYPHS.tremolo;
    t.appendChild(svg);
    return t;
  }

  /* bughunt6 #13: A CLIP HOLDS 16 AUDIO EFFECTS (FM.audioVoices.max, which the '966 B1' test pins to what js/storage.js's
     sanitiser keeps). That sanitiser keeps the first 16 on every Undo, Redo, reopen and friend's edit, so a 17th added past
     it was lost the next time any of those ran, and the autosave kept it lost. The Voice path already refused past 16; this
     is the same refusal, in its words, for every other way in: a tap here, and the ⋯ Duplicate and Paste in
     js/inspector.js. True when `need` more fit; otherwise it says so, and the caller adds nothing. */
  FM.audioFxRoom = function (layer, need) {
    const max = (FM.audioVoices && FM.audioVoices.max) || 16;
    const have = (layer && Array.isArray(layer.audioFx)) ? layer.audioFx.length : 0;
    const n = Math.max(1, need | 0);
    if (have + n <= max) return true;
    if (FM.toast) FM.toast('A clip holds ' + max + ' audio effects — this one has ' + have + (n === 1 ? ' already' : ', and the paste needs ' + n + ' more'), 2600);
    return false;
  };

  // The ONE add path — exactly one push, then rebuild the audio graph so the effect is audible now.
  function addEffect(id) {
    // Re-resolve from the LIVE scene by id: the overlay caches _layer at open(), but a delete or an undo
    // (which rebuilds layer objects) can orphan it — pushing into the detached object would silently lose
    // the effect, since history.commit snapshots the live scene without it.
    const layer = (FM.scene && _layer) ? FM.scene.layers.find(l => l.id === _layer.id) : null;
    if (!layer) { FM.audioFxBrowser.close(); return; }
    const inst = FM.audioFxRegistry.makeInstance(id);
    if (!inst || !FM.audioFxRegistry.supportsLayer(id, layer)) {
      if (FM.toast) FM.toast('Audio effects only work on a clip with sound', 2000);
      return;
    }
    /* bughunt6 #13: past 16 it is refused, as a voice is; the sheet stays open, as it does for a voice that does not fit */
    if (!FM.audioFxRoom(layer, 1)) return;
    if (!layer.audioFx) layer.audioFx = [];
    layer.audioFx.forEach(e => { e._expanded = false; });   // accordion: the newcomer is the one open editor
    inst._expanded = true;
    layer.audioFx.push(inst);             // <- exactly one entry
    pushRecent(id);
    FM.audioFxBrowser.close();
    if (FM.reconcileAudio) FM.reconcileAudio();
    // This tap IS the user gesture that unlocks the AudioContext — it has to resume inside the click's
    // call stack, so nothing may await before it.
    if (FM.audioFxLive && FM.audioFxLive.resume) FM.audioFxLive.resume();
    // Land ON the new effect's controls — the Effects card's AUDIO side (queue 45). A plain refresh()
    // used to be enough because you could only get here from the Audio Effects card; you can now
    // arrive from the visual browser's toggle, where a refresh would drop you on the category grid.
    if (FM.inspector) {
      if (FM.inspector.openCategory) FM.inspector.openCategory('audiofx');
      else FM.inspector.refresh();
      requestAnimationFrame(() => {
        const open = document.querySelector('.fx-row.fx-open');
        if (open && open.scrollIntoView) open.scrollIntoView({ block: 'nearest' });
      });
    }
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Added ' + FM.audioFxRegistry.get(id).label, 1100);
  }

  function tile(reg, onStarChange) {
    const wrap = el('button', 'fxb-tile'); wrap.title = reg.label;
    const star = starFor(reg.type, onStarChange);
    wrap.appendChild(thumb(reg));
    wrap.appendChild(el('span', 'fxb-tile-name', reg.label));
    wrap.appendChild(star);
    wrap.addEventListener('click', () => addEffect(reg.type));
    return wrap;
  }

  /* ---- THE VOICE CATEGORY (#966 B1, refers to #545) ------------------------------------------------------------------
   * A voice tile adds a named STACK of the effects in the other four categories. FM.audioVoices (js/audio-fx.js) holds the
   * table and every rule; this only draws it and makes the tap.
   * ⚠️ DRAWN BEFORE HE HAS SEEN IT. The tile (the Voice tint carrying its first effect's glyph), the category icon, the Save
   * row and the ✕ on his own voices are placeholders, built so his pick (#545) is a tweak, not a rebuild. The questions are
   * in tools/design/plans/fxnew-voice/NOTES.md.
   * ⚠️ NO CARD, NO MENU. The name field and the delete both live INSIDE this sheet: on a phone a tap anywhere outside the
   * sheet is its exit (app.js, queues 401/810), so a confirm card or a ⋯ menu would close the browser under his thumb. */
  // His own first (they are his, the library is everyone's — the Filters tab's order), then the shipped ones.
  function voiceOrder() { return FM.audioVoices ? FM.audioVoices.mine().concat(FM.audioVoices.all()) : []; }

  function voiceTile(v, onRemoved) {
    const wrap = el('button', 'fxb-tile afxb-voice-tile');
    wrap.title = v.desc ? v.name + ' — ' + v.desc : v.name;
    wrap.dataset.voice = v.id;
    wrap.appendChild(thumb({ category: 'voice', type: v.stack[0] && v.stack[0].type }));
    wrap.appendChild(el('span', 'fxb-tile-name', v.name));
    if (v.mine && onRemoved) wrap.appendChild(removeX(v, wrap, onRemoved));
    wrap.addEventListener('click', () => addVoice(v.id));
    return wrap;
  }

  /* His own voice's ✕. The first tap ARMS it (it turns red and the name reads "Tap ✕ to delete"); a second tap inside 4 s
     deletes. A saved voice is in no project's history, so no Undo brings it back — one stray tap must not lose it. */
  function removeX(v, tileEl, onRemoved) {
    const x = el('span', 'afxb-voice-del', '✕');
    x.title = 'Delete this voice';
    if (FM.drawnX) FM.drawnX(x, 16);   // queue 965: one drawn ✕ for the app
    const nameEl = tileEl.querySelector('.fxb-tile-name');
    let armed = 0;
    const disarm = () => { armed = 0; x.classList.remove('armed'); if (nameEl) nameEl.textContent = v.name; };
    x.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      if (!armed) {
        x.classList.add('armed');
        if (nameEl) nameEl.textContent = 'Tap ✕ to delete';
        armed = setTimeout(disarm, 4000);
        return;
      }
      clearTimeout(armed); armed = 0;
      FM.audioVoices.remove(v.id);
      if (FM.toast) FM.toast('Deleted “' + v.name + '”', 1400);
      onRemoved();
    });
    return x;
  }

  /* A voice tile's add. The voice's whole stack goes on after what the clip has, then ONE history step — so one Undo takes
     every effect it added off again and leaves the clip as it was. The rest is addEffect's landing: the browser closes, the
     audio is rebuilt inside the tap, and the panel opens on the voice's FIRST effect with the others closed under it.
     `layerArg` is the suite's seam (no open browser needed); a tile passes nothing and the browser's own clip is used. */
  function addVoice(id, layerArg) {
    const want = layerArg || _layer;
    const layer = (FM.scene && want) ? FM.scene.layers.find(l => l.id === want.id) : null;
    if (!layer) { FM.audioFxBrowser.close(); return null; }
    const r = FM.audioVoices ? FM.audioVoices.addTo(layer, id) : { ok: false, why: 'unknown' };
    if (!r.ok) {
      const msg = r.why === 'full' ? 'A clip holds ' + FM.audioVoices.max + ' audio effects — this one has ' + r.have + ', and ' + r.name + ' needs ' + r.need + ' more'
        : r.why === 'nosound' ? 'Audio effects only work on a clip with sound' : 'That voice isn’t in this version of the app';
      if (FM.toast) FM.toast(msg, 2600);
      return null;
    }
    layer.audioFx.forEach(e => { if (e) e._expanded = false; });   // accordion: the voice's first effect is the one open editor
    r.added[0]._expanded = true;
    FM.audioFxBrowser.close();
    if (FM.reconcileAudio) FM.reconcileAudio();
    // the tap that unlocks the AudioContext, as in addEffect — guarded here, because a failed unlock must not cost him the voice
    if (FM.audioFxLive && FM.audioFxLive.resume) { try { FM.audioFxLive.resume(); } catch (e) {} }
    if (FM.inspector) {
      if (FM.inspector.openCategory) FM.inspector.openCategory('audiofx');
      else FM.inspector.refresh();
      requestAnimationFrame(() => {
        const open = document.querySelector('.fx-row.fx-open');
        if (open && open.scrollIntoView) open.scrollIntoView({ block: 'nearest' });
      });
    }
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();   // <- ONE step for the whole voice
    if (FM.toast) FM.toast('Added ' + r.name + ': ' + r.added.map(f => (FM.audioFxRegistry.get(f.type) || {}).label || f.type).join(' + '), 1600);
    return r.added;
  }

  // "Save this stack as a voice": the button opens a name field in the sheet; Save (or Enter) keeps the clip's stack.
  function saveRow(onSaved) {
    const wrap = el('div', 'afxb-voice-savewrap');
    const open = el('button', 'afxb-voice-save', 'Save this stack as a voice');
    open.title = 'Keep the audio effects on this clip as a voice of your own';
    const row = el('div', 'afxb-voice-saverow hidden');
    const name = el('input', 'afxb-voice-name');
    name.type = 'text'; name.maxLength = 40; name.placeholder = 'Voice name'; name.autocomplete = 'off'; name.spellcheck = false;
    name.setAttribute('enterkeyhint', 'done');
    name.setAttribute('aria-label', 'Voice name');
    const ok = el('button', 'afxb-voice-ok', 'Save'), cancel = el('button', 'afxb-voice-cancel', 'Cancel');
    row.appendChild(name); row.appendChild(ok); row.appendChild(cancel);
    const clip = () => (FM.scene && _layer) ? FM.scene.layers.find(l => l.id === _layer.id) : null;
    const hide = () => { row.classList.add('hidden'); open.classList.remove('hidden'); };
    const nothingOn = () => { if (FM.toast) FM.toast('This clip has no audio effects on yet — add some, then save them as a voice', 2600); };
    open.addEventListener('click', () => {
      if (!FM.audioVoices.stackOf(clip()).length) { nothingOn(); return; }
      name.value = 'My voice';
      open.classList.add('hidden'); row.classList.remove('hidden');
      name.focus(); try { name.select(); } catch (e) {} try { name.setSelectionRange(0, name.value.length); } catch (e) {}
    });
    const save = () => {
      const nm = (name.value || '').trim();
      if (!nm) { name.focus(); return; }
      const id = FM.audioVoices.save(clip(), nm);
      if (!id) { if (!FM.audioVoices.stackOf(clip()).length) nothingOn(); return; }   // a full disk says so itself (save)
      hide();
      if (FM.toast) FM.toast('Saved “' + nm.slice(0, 40) + '” — it’s under Your voices', 1800);
      onSaved();
    };
    ok.addEventListener('click', save);
    cancel.addEventListener('click', hide);
    name.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); save(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); }
    });
    wrap.appendChild(open); wrap.appendChild(row);
    return wrap;
  }

  // The Voice category's list: the Save row, his voices (if any), then the shipped ones. Redrawn in place after a save/delete.
  function fillVoices(scroller) {
    scroller.innerHTML = '';
    const redraw = () => { if (scroller.isConnected) fillVoices(scroller); };
    scroller.appendChild(saveRow(redraw));
    const all = voiceOrder(), mine = all.filter(v => v.mine), shipped = all.filter(v => !v.mine);
    if (mine.length) {
      scroller.appendChild(el('div', 'fxb-sec-title afxb-voice-title', 'Your voices'));
      const g = el('div', 'fxb-grid afxb-voice-grid afxb-voice-mine');
      mine.forEach(v => g.appendChild(voiceTile(v, redraw)));
      scroller.appendChild(g);
      scroller.appendChild(el('div', 'fxb-sec-title afxb-voice-title', 'Voices'));
    }
    const grid = el('div', 'fxb-grid afxb-voice-grid');
    shipped.forEach(v => grid.appendChild(voiceTile(v, null)));
    scroller.appendChild(grid);
  }

  // Section A — auto-scrolling, swipeable featured carousel.
  function buildFeatured() {
    const sec = el('div', 'fxb-section');
    sec.appendChild(el('div', 'fxb-sec-title', 'Featured'));
    const row = el('div', 'fxb-featured');
    (FM.AFX_FEATURED || []).map(id => FM.audioFxRegistry.get(id)).filter(Boolean).forEach(reg => {
      const card = el('button', 'fxb-card'); card.title = reg.label;
      card.appendChild(thumb(reg));
      card.appendChild(el('div', 'fxb-card-name', reg.label));
      card.appendChild(starFor(reg.type, rerenderPaged));   // the featured row had no ★ at all (#62)
      card.addEventListener('click', () => addEffect(reg.type));
      row.appendChild(card);
    });
    // the effects strip's rule, shared (queue 931): held while touched, and for a while after his last scroll
    if (FM.carouselPause) FM.carouselPause(row, () => autoPauseUntil, (t) => { autoPauseUntil = t; });
    else row.addEventListener('pointerdown', () => { autoPauseUntil = perfNow() + 3000; });
    sec.appendChild(row);
    /* A mouse pages it with ‹ › (queue 977: "on pc without trackpad there seems to be no way to slide the new section in
       effects menu"). The rail is this section, so the row keeps its parent (917.13 finds the title through
       row.parentElement). A page turn holds the auto-scroll first: its 30 ms tick writes scrollLeft and would cancel the
       smooth scroll halfway. */
    if (FM.railArrows) FM.railArrows(sec, row, { item: '.fxb-card', onPage: () => { autoPauseUntil = Math.max(autoPauseUntil, perfNow() + (FM._carouselPauseMs || 8000)); } });
    return { sec: sec, row: row };
  }

  // Section B — paged Recents (page 1) + Favourites (rest), 8 tiles per page, with page dots.
  function buildPaged(rerender) {
    const sec = el('div', 'fxb-section');
    sec.appendChild(el('div', 'fxb-sec-title', 'Recents / faves'));   // he named the thing "Faves" (#124); the audio browser is the same feature and must not use a second word for it
    const recents = readList(RECENTS_KEY).map(id => FM.audioFxRegistry.get(id)).filter(Boolean);
    const favs = readList(FAV_KEY).map(id => FM.audioFxRegistry.get(id)).filter(Boolean);
    const pages = [];
    pages.push({ label: 'Recents', items: recents });
    for (let i = 0; i < favs.length; i += PAGE_SIZE) pages.push({ label: 'Faves', items: favs.slice(i, i + PAGE_SIZE) });
    if (favs.length === 0) pages.push({ label: 'Faves', items: [] });

    const pager = el('div', 'fxb-pager');
    pages.forEach(pg => {
      const page = el('div', 'fxb-page');
      if (!pg.items.length) {
        page.appendChild(el('div', 'fxb-empty', pg.label === 'Recents' ? 'No recent audio effects yet' : 'Tap ★ on any effect to favourite it'));
      } else {
        const grid = el('div', 'fxb-grid');
        pg.items.forEach(reg => grid.appendChild(tile(reg, rerender)));
        page.appendChild(grid);
      }
      pager.appendChild(page);
    });
    sec.appendChild(pager);

    const dots = el('div', 'fxb-dots');
    pages.forEach((_, i) => { const d = el('span', 'fxb-dot' + (i === 0 ? ' on' : '')); dots.appendChild(d); });
    pager.addEventListener('scroll', () => {
      const i = Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth));
      [].forEach.call(dots.children, (d, k) => d.classList.toggle('on', k === i));
    });
    sec.appendChild(dots);
    return sec;
  }

  /* ---- CATEGORY ICONS (queue 585) ---------------------------------------------------------------
   * Ezra: *"Add icons for these buttons too like you did in the effects menu."*
   * ⚠️ **THE SAME HAND, DELIBERATELY.** These mirror js/fx-browser.js's CAT_ICON exactly — 24×24 box,
   * `fill: none`, `currentColor`, **stroke-width 1.7**, round caps and joins — because he asked for it
   * to be *like* the effects menu, and a second drawing style for the same idea in the same app is worse
   * than no icons at all. The visual set also comments what each glyph IS; that convention is kept, and
   * it is not decoration — it is what stops the next person redrawing one into something that means
   * something else.
   * ⚠️ **NOT REUSED FROM THE VISUAL SET.** Nothing there means EQ or stereo, and borrowing (say) `move`
   * for Dynamics would have two categories in two browsers wearing the same glyph for unrelated ideas.
   * Each of these draws the thing the category actually does to a SOUND. */
  const AUDIO_CAT_ICON = {
    // three faders at different heights — the one drawing everybody already reads as EQ
    eq: '<path d="M6.5 4.6v14.8M12 4.6v14.8M17.5 4.6v14.8"/><circle cx="6.5" cy="9.1" r="1.6"/><circle cx="12" cy="14.6" r="1.6"/><circle cx="17.5" cy="7.6" r="1.6"/>',
    // one source, spreading outwards on both sides — width and room
    space: '<circle cx="12" cy="12" r="1.7"/><path d="M8.2 8.9a4.9 4.9 0 0 0 0 6.2M15.8 8.9a4.9 4.9 0 0 1 0 6.2"/><path d="M5.2 6.2a9.2 9.2 0 0 0 0 11.6M18.8 6.2a9.2 9.2 0 0 1 0 11.6"/>',
    // a signal squeezed between two rails — loud bits pushed down to meet the quiet ones
    dyn: '<path d="M4 6.6h16M4 17.4h16"/><path d="M7.2 9.6v4.8M10.4 8.2v7.6M13.6 10.6v2.8M16.8 9.1v5.8"/>',
    // a clean wave on the left going square on the right — drive, warmth, damage
    char: '<path d="M3.6 15.4c1.7 0 2.1-6.8 4.2-6.8s2.5 6.8 4.2 6.8"/><path d="M12 15.4h1.5V9.2h4.1v6.2h1.4"/>',
    // a speech bubble with a wave in it — someone talking, the sound changed (#966 B1). A PLACEHOLDER in this hand: the real
    // icon is drawn and picked first (#545), see tools/design/plans/fxnew-voice/NOTES.md
    voice: '<path d="M5 4.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8.5l-3.8 3.2v-3.2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/><path d="M6.6 10.5c1.2-2.6 2.4-2.6 3.6 0s2.4 2.6 3.6 0 2.4-2.6 3.6 0"/>',
  };
  const audioCatIcon = (key) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (AUDIO_CAT_ICON[key] || AUDIO_CAT_ICON.eq) + '</svg>';
  FM._audioCatIconKeys = () => Object.keys(AUDIO_CAT_ICON);   // seam: the suite checks every category has one

  // Section C — category banners → per-category effect list (slide-in sub-screen).
  function buildCategories() {
    const sec = el('div', 'fxb-section');
    sec.appendChild(el('div', 'fxb-sec-title', 'Categories'));
    const list = el('div', 'fxb-cats');
    FM.audioFxRegistry.categories().forEach(cat => {
      const b = el('button', 'fxb-banner afxb-banner'); b.dataset.cat = cat.key;
      // queue 585 — same element and class the visual browser uses, so it inherits that styling rather
      // than needing a parallel rule that can drift away from it.
      const ico = el('span', 'fxb-banner-ico'); ico.innerHTML = audioCatIcon(cat.key);
      b.appendChild(ico);
      b.appendChild(el('span', 'fxb-banner-label', cat.label));
      // the Voice banner counts voices (#966 B1): it has no effect of its own, so byCategory would say 0
      b.appendChild(el('span', 'fxb-banner-count', String(cat.key === 'voice' ? voiceOrder().length : FM.audioFxRegistry.byCategory(cat.key).length)));
      b.addEventListener('click', () => openCategory(cat));
      list.appendChild(b);
    });
    sec.appendChild(list);
    return sec;
  }

  function openCategory(cat) {
    const view = el('div', 'fxb-catview');
    // pause the featured auto-scroll while a full-cover category view is open — it was scrolling
    // invisibly underneath
    _catDepth++; stopAuto();
    const closeView = () => { view.remove(); if (--_catDepth <= 0) { _catDepth = 0; if (_featRow && _featRow.isConnected) startAuto(_featRow); } };
    const top = el('div', 'fxb-catview-top');
    const back = el('button', 'fxb-back', '‹ Back'); back.addEventListener('click', closeView);
    top.appendChild(back);
    top.appendChild(el('div', 'fxb-catview-title', cat.label));
    view.appendChild(top);
    const scroller = el('div', 'fxb-catview-scroll');
    if (cat.key === 'voice') fillVoices(scroller);   // #966 B1: voice tiles, his own voices and the Save row
    else {
      const grid = el('div', 'fxb-grid');
      FM.audioFxRegistry.byCategory(cat.key).forEach(reg => grid.appendChild(tile(reg, null)));
      scroller.appendChild(grid);
    }
    view.appendChild(scroller);
    // Prev/next category arrows pinned under the list — page through every category in place. Wraps.
    const cats = FM.audioFxRegistry.categories();
    const ci = Math.max(0, cats.findIndex(c => c.key === cat.key));
    const prev = cats[(ci - 1 + cats.length) % cats.length];
    const next = cats[(ci + 1) % cats.length];
    const nav = el('div', 'fxb-catnav afxb-catnav');
    const go = (target) => { view.remove(); _catDepth--; openCategory(target); };   // balance the depth: openCategory re-increments, so a nav nets zero (else each arrow leaks +1 and freezes the Featured auto-scroll forever)
    const mkBtn = (label, target) => {
      const b = el('button', 'fxb-back afxb-catnav-btn', label);
      b.addEventListener('click', () => go(target));
      return b;
    };
    nav.appendChild(mkBtn('‹ ' + prev.label, prev));
    nav.appendChild(el('span', 'fxb-catnav-pos afxb-catnav-pos', (ci + 1) + '/' + cats.length));
    nav.appendChild(mkBtn(next.label + ' ›', next));
    view.appendChild(nav);
    root.appendChild(view);
  }

  /* Match the label, the type id, OR the category name — so "eq", "space" or "delay" surface the whole family,
     not just effects carrying the word in their title — AND the names people give the sound (queue 986, hunt
     C13: the registry's `tags`). A tag matches while it is being typed ("karao") and when it is one of the
     words typed ("robot voice", "make it underwater"), compared on words so "8-bit" and "8 bit" are one thing.
     "While it is being typed" means from the START of one of its words: matching anywhere inside one listed
     Distortion for "low" (blOWn out), Reverb for "the" (caTHEdral) and Stereo Width for "no" (mONO).
     ONE rule for effects and voices (#966 B1): a voice matches by its name, by the Voice category's name ("voice"
     lists them all, as "space" lists Space / Stereo) and by its own tags, read exactly as an effect's are. */
  const words = s => ' ' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  function matcher(q) {
    const needle = String(q).toLowerCase(), qw = words(q), qTrim = qw.trim();
    const catLabel = {};
    (FM.audioFxRegistry.categories() || []).forEach(c => { catLabel[c.key] = (c.label || '').toLowerCase(); });
    const tagHit = tags => !!qTrim && (tags || []).some(tag => {
      const tw = words(tag);
      return tw.indexOf(' ' + qTrim) >= 0 || qw.indexOf(tw) >= 0;
    });
    return {
      effect: r => r.label.toLowerCase().indexOf(needle) >= 0 ||
        (r.type || '').toLowerCase().indexOf(needle) >= 0 ||
        (catLabel[r.category] || '').indexOf(needle) >= 0 ||
        tagHit(r.tags),
      voice: v => v.name.toLowerCase().indexOf(needle) >= 0 || (catLabel.voice || '').indexOf(needle) >= 0 || tagHit(v.tags),
    };
  }
  function voicesMatching(q) { const m = matcher(q); return voiceOrder().filter(m.voice); }

  function buildSearchResults(q) {
    const m = matcher(q), out = document.createDocumentFragment();
    const grid = el('div', 'fxb-grid fxb-search-grid');
    FM.audioFxRegistry.all().filter(m.effect).forEach(reg => grid.appendChild(tile(reg, null)));
    /* Voices that match get their own row ABOVE the effects (#966 B1), in a grid of their own: a voice is a stack, not an
       effect, and .fxb-search-grid keeps meaning exactly what it meant (queue 986 C13 counts its tiles). */
    const vs = voicesMatching(q);
    if (vs.length) {
      out.appendChild(el('div', 'fxb-sec-title afxb-voice-title', 'Voices'));
      const vg = el('div', 'fxb-grid afxb-voice-grid afxb-voice-found');
      vs.forEach(v => vg.appendChild(voiceTile(v, null)));
      out.appendChild(vg);
      if (grid.children.length) out.appendChild(el('div', 'fxb-sec-title afxb-voice-title', 'Effects'));
    }
    if (!grid.children.length && !vs.length) grid.appendChild(el('div', 'fxb-empty', 'No audio effects match “' + q + '”'));
    if (grid.children.length) out.appendChild(grid);
    return out;
  }

  // The other half of the queue-45 switch — same control, same position, pointing back at the visual
  // browser. Its own side is greyed on a SONG's browser only in the sense that Effects (visual) is:
  // a 0×0 layer has no picture, so FM.fxModeToggle greys the visual half and this stays put.
  function modeToggle() {
    if (!FM.fxModeToggle || !_layer) return null;
    /* Same fix as the visual browser's (queue 317), and it had the same defect for the same reason:
       no key, so pressing FILTERS from here opened the visual effects grid. Two overlays written
       against a two-state toggle, both left behind when the third state arrived. */
    return FM.fxModeToggle(_layer, 'audio', (key) => {
      const layer = _layer;
      if (key === 'audio') return;
      FM.audioFxBrowser.close();
      if (key === 'visual') { if (FM.fxBrowser) FM.fxBrowser.open(layer); return; }
      if (FM.inspector && FM.inspector.openFxTab) FM.inspector.openFxTab(key);
    });
  }

  let _featRow = null, _catDepth = 0;
  function rebuild() {
    scrollEl.innerHTML = '';
    const tg = modeToggle(); if (tg) scrollEl.appendChild(tg);   // above everything, search results included
    const q = (searchInput.value || '').trim();
    if (q) { scrollEl.appendChild(buildSearchResults(q)); stopAuto(); return; }
    const feat = buildFeatured();
    scrollEl.appendChild(feat.sec);
    scrollEl.appendChild(buildPaged(rerenderPaged));   // star toggles do a LIGHT paged rerender, not a full rebuild
    scrollEl.appendChild(buildCategories());
    _featRow = feat.row;
    if (!_catDepth) startAuto(feat.row);
  }
  // Toggling a ★ only needs the Recents/Favourites section rebuilt — a full rebuild() resets the pager to
  // page 1 AND restarts the featured carousel from the left. Replace just that section, keep the page.
  function rerenderPaged() {
    const oldPager = scrollEl.querySelector('.fxb-pager');
    const oldSec = oldPager && oldPager.closest('.fxb-section');
    if (!oldSec) { rebuild(); return; }
    const pageIdx = Math.round(oldPager.scrollLeft / Math.max(1, oldPager.clientWidth));
    const fresh = buildPaged(rerenderPaged);
    oldSec.replaceWith(fresh);
    const np = fresh.querySelector('.fxb-pager');
    if (np && pageIdx > 0) np.scrollLeft = pageIdx * np.clientWidth;
  }

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
      row._autoLeft = row.scrollLeft;   // queue 931: the strip's own scroll is not his
    }, 30);
  }

  FM.audioFxBrowser = {
    isFav: isFav, toggleFav: toggleFav,   // so an applied audio effect's ⋯ menu can favourite it too (#62)
    addVoice: addVoice,   // #966 B1: the path a Voice tile takes — addVoice(id, layer?)
    // suite seams (#966 B1): the voices a search shows, and the tiles the Voice category draws, in their order — read from
    // the same functions the sheet draws with, so a test of these is a test of what is on screen
    _voicesMatching: function (q) { return voicesMatching(String(q == null ? '' : q).trim()).map(v => v.id); },
    _voiceTiles: function () { return voiceOrder().map(v => ({ id: v.id, name: v.name, mine: v.mine })); },
    init: function () {
      root = document.getElementById('afx-browser'); if (!root) return;
      scrollEl = root.querySelector('.fxb-scroll');
      searchInput = root.querySelector('.fxb-search-input');
      root.querySelector('.fxb-close').addEventListener('click', () => FM.audioFxBrowser.close());
      // Click the backdrop (outside the centred panel, on PC) → close. The panel's own clicks land inside
      // .fxb-top / .fxb-scroll, so only a hit on the root backdrop itself closes.
      root.addEventListener('pointerdown', (e) => { if (e.target === root) FM.audioFxBrowser.close(); });
      const searchBtn = root.querySelector('.fxb-search-btn');
      searchBtn.addEventListener('click', () => { searchInput.classList.toggle('hidden'); if (!searchInput.classList.contains('hidden')) searchInput.focus(); else { searchInput.value = ''; rebuild(); } });
      searchInput.addEventListener('input', () => { clearTimeout(_searchDebounce); _searchDebounce = setTimeout(rebuild, 120); });
    },
    open: function (layer) {
      if (!root) FM.audioFxBrowser.init();
      if (!root) return;
      _layer = layer || (FM.scene && FM.layerById(FM.scene, FM.scene.selectedId));
      if (!_layer) { if (FM.toast) FM.toast('Select a clip first', 1400); return; }
      // "Has sound" is a decoded track now, not the layer type (queue 45) — a silent screen recording
      // is a video with nothing to process. Unknown (not probed yet) still opens: see FM.hasAudioTrack.
      if (FM.fxAudioSideOk ? !FM.fxAudioSideOk(_layer) : _layer.type !== 'video') { if (FM.toast) FM.toast('Audio effects only work on a clip with sound', 2000); return; }
      searchInput.value = ''; searchInput.classList.add('hidden');
      /* The sheet, on a phone (queue 300). His words: "Audio effects menu still opens full screen" —
         and "still" is the whole report. Queue 277 turned the VISUAL browser into a sheet that stops
         at the canvas so you can see the clip you are working on; this one, a sibling overlay with the
         same markup, was not converted with it. FM.fxSheet is that geometry, so both are now the same
         thing rather than two things that happen to match. */
      FM.fxSheet(root);
      root._fxExit = () => FM.audioFxBrowser.close();   // queue 810: this browser's own way out, for FM.fxSheetExit
      root.classList.remove('hidden');
      rebuild();
    },
    close: function () { if (!root) return; stopAuto(); root.classList.add('hidden'); FM.fxSheet(root, false); root.querySelectorAll('.fxb-catview').forEach(v => v.remove()); _catDepth = 0; },   // belt-and-braces: a leaked depth must never survive close/reopen
  };
})(window.FM);
