/* FreeMotion — full-screen Add-Audio-Effect browser. Sibling of fx-browser.js: search · auto-scrolling
 * featured carousel · paged Recents/Favourites grid with page dots + star-to-favourite · category banners
 * that open a per-category list. Adds exactly ONE effect per tap. Reads FM.audioFxRegistry.
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
  function toggleFav(id) { const a = readList(FAV_KEY); const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id); writeList(FAV_KEY, a); }

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
    if (FM.inspector) FM.inspector.refresh();
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Added ' + FM.audioFxRegistry.get(id).label, 1100);
  }

  function tile(reg, onStarChange) {
    const wrap = el('button', 'fxb-tile'); wrap.title = reg.label;
    const star = el('span', 'fxb-star' + (isFav(reg.type) ? ' on' : '')); star.textContent = '★';
    star.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(reg.type); star.classList.toggle('on'); if (onStarChange) onStarChange(); });
    wrap.appendChild(thumb(reg));
    wrap.appendChild(el('span', 'fxb-tile-name', reg.label));
    wrap.appendChild(star);
    wrap.addEventListener('click', () => addEffect(reg.type));
    return wrap;
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
      card.addEventListener('click', () => addEffect(reg.type));
      row.appendChild(card);
    });
    row.addEventListener('pointerdown', () => { autoPauseUntil = perfNow() + 3000; });
    sec.appendChild(row);
    return { sec: sec, row: row };
  }

  // Section B — paged Recents (page 1) + Favourites (rest), 8 tiles per page, with page dots.
  function buildPaged(rerender) {
    const sec = el('div', 'fxb-section');
    sec.appendChild(el('div', 'fxb-sec-title', 'Recents & favourites'));
    const recents = readList(RECENTS_KEY).map(id => FM.audioFxRegistry.get(id)).filter(Boolean);
    const favs = readList(FAV_KEY).map(id => FM.audioFxRegistry.get(id)).filter(Boolean);
    const pages = [];
    pages.push({ label: 'Recents', items: recents });
    for (let i = 0; i < favs.length; i += PAGE_SIZE) pages.push({ label: 'Favourites', items: favs.slice(i, i + PAGE_SIZE) });
    if (favs.length === 0) pages.push({ label: 'Favourites', items: [] });

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

  // Section C — category banners → per-category effect list (slide-in sub-screen).
  function buildCategories() {
    const sec = el('div', 'fxb-section');
    sec.appendChild(el('div', 'fxb-sec-title', 'Categories'));
    const list = el('div', 'fxb-cats');
    FM.audioFxRegistry.categories().forEach(cat => {
      const b = el('button', 'fxb-banner afxb-banner'); b.dataset.cat = cat.key;
      b.appendChild(el('span', 'fxb-banner-label', cat.label));
      b.appendChild(el('span', 'fxb-banner-count', String(FM.audioFxRegistry.byCategory(cat.key).length)));
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
    const grid = el('div', 'fxb-grid');
    FM.audioFxRegistry.byCategory(cat.key).forEach(reg => grid.appendChild(tile(reg, null)));
    const scroller = el('div', 'fxb-catview-scroll'); scroller.appendChild(grid);
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

  function buildSearchResults(q) {
    const grid = el('div', 'fxb-grid fxb-search-grid');
    const needle = q.toLowerCase();
    const catLabel = {};
    (FM.audioFxRegistry.categories() || []).forEach(c => { catLabel[c.key] = (c.label || '').toLowerCase(); });
    // match the label, the type id, OR the category name — so "eq", "space" or "delay" surface the
    // whole family, not just effects carrying the word in their title
    FM.audioFxRegistry.all().filter(r =>
      r.label.toLowerCase().indexOf(needle) >= 0 ||
      (r.type || '').toLowerCase().indexOf(needle) >= 0 ||
      (catLabel[r.category] || '').indexOf(needle) >= 0
    ).forEach(reg => grid.appendChild(tile(reg, null)));
    if (!grid.children.length) grid.appendChild(el('div', 'fxb-empty', 'No audio effects match “' + q + '”'));
    return grid;
  }

  let _featRow = null, _catDepth = 0;
  function rebuild() {
    scrollEl.innerHTML = '';
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
    }, 30);
  }

  FM.audioFxBrowser = {
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
      if (_layer.type !== 'video') { if (FM.toast) FM.toast('Audio effects only work on a clip with sound', 2000); return; }
      searchInput.value = ''; searchInput.classList.add('hidden');
      root.classList.remove('hidden');
      rebuild();
    },
    close: function () { if (!root) return; stopAuto(); root.classList.add('hidden'); root.querySelectorAll('.fxb-catview').forEach(v => v.remove()); _catDepth = 0; },   // belt-and-braces: a leaked depth must never survive close/reopen
  };
})(window.FM);
