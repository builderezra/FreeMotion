/* FreeMotion — full-screen Add-Effect browser (Alight Motion style): search · auto-scrolling featured
 * carousel · paged Recents/Favourites grid with page dots + star-to-favourite · category banners that open
 * a per-category effect list. Adds exactly ONE effect per tap (the single add path). Reads FM.fxRegistry. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  const RECENTS_KEY = 'fm.fx.recents', FAV_KEY = 'fm.fx.fav', RECENTS_CAP = 8, PAGE_SIZE = 8;
  function readList(key) { try { const a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a.filter(id => FM.fxRegistry.get(id)) : []; } catch (e) { return []; } }
  function writeList(key, arr) { try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {} }
  function pushRecent(id) { const a = readList(RECENTS_KEY).filter(x => x !== id); a.unshift(id); writeList(RECENTS_KEY, a.slice(0, RECENTS_CAP)); }
  function isFav(id) { return readList(FAV_KEY).indexOf(id) >= 0; }
  function toggleFav(id) { const a = readList(FAV_KEY); const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id); writeList(FAV_KEY, a); }

  let root, scrollEl, searchInput, _layer, autoTimer = 0, autoPauseUntil = 0;

  // CSS-gradient swatch keyed by category (no image assets — Phase 1).
  function thumb(reg) {
    const t = el('div', 'fxb-thumb'); t.dataset.cat = reg.category;
    t.appendChild(el('span', 'fxb-thumb-glyph', (reg.label || '?').slice(0, 1).toUpperCase()));
    return t;
  }

  // The ONE add path — exactly one push, then close + refresh the inspector/timeline/canvas.
  function addEffect(id) {
    // Re-resolve from the LIVE scene by id: the overlay caches _layer at open(), but a delete (Backspace)
    // or undo (Cmd+Z, which rebuilds layer objects) can orphan it — pushing into the detached object would
    // silently lose the effect (history.commit snapshots the live scene without it).
    const layer = (FM.scene && _layer) ? FM.scene.layers.find(l => l.id === _layer.id) : null;
    if (!layer) { FM.fxBrowser.close(); return; }
    const inst = FM.fxRegistry.makeInstance(id);
    if (!inst || !FM.fxRegistry.supportsLayer(id, layer)) {
      const reg = FM.fxRegistry.get(id);
      const need = reg && reg.appliesTo === 'text' ? 'a text layer' : 'a video or image layer';
      if (FM.toast) FM.toast('That effect needs ' + need, 1600);
      return;
    }
    if (!layer.effects) layer.effects = [];
    layer.effects.push(inst);             // <- exactly one entry
    pushRecent(id);
    FM.fxBrowser.close();
    if (FM.inspector) FM.inspector.refresh();
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.requestRender) FM.requestRender();
    if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Added ' + (FM.fxRegistry.get(id).label), 1100);
  }

  // A tappable effect tile (thumb + name + ★ favourite toggle).
  function tile(reg, onStarChange) {
    const wrap = el('button', 'fxb-tile'); wrap.title = reg.label;
    const star = el('span', 'fxb-star' + (isFav(reg.id) ? ' on' : '')); star.textContent = '★';
    star.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(reg.id); star.classList.toggle('on'); if (onStarChange) onStarChange(); });
    wrap.appendChild(thumb(reg));
    wrap.appendChild(el('span', 'fxb-tile-name', reg.label));
    wrap.appendChild(star);
    wrap.addEventListener('click', () => addEffect(reg.id));
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
      card.addEventListener('click', () => addEffect(reg.id));
      row.appendChild(card);
    });
    // pause auto-scroll while the user is touching it
    row.addEventListener('pointerdown', () => { autoPauseUntil = perfNow() + 3000; });
    sec.appendChild(row);
    return { sec: sec, row: row };
  }

  // Section B — paged Recents (page 1) + Favourites (rest), 8 tiles per page, with page dots.
  function buildPaged(rerender) {
    const sec = el('div', 'fxb-section');
    sec.appendChild(el('div', 'fxb-sec-title', 'Recents & favourites'));
    const recents = readList(RECENTS_KEY).map(id => FM.fxRegistry.get(id)).filter(Boolean);
    const favs = readList(FAV_KEY).map(id => FM.fxRegistry.get(id)).filter(Boolean);
    // pages: [recents], then favourites chunked
    const pages = [];
    pages.push({ label: 'Recents', items: recents });
    for (let i = 0; i < favs.length; i += PAGE_SIZE) pages.push({ label: 'Favourites', items: favs.slice(i, i + PAGE_SIZE) });
    if (favs.length === 0) pages.push({ label: 'Favourites', items: [] });

    const pager = el('div', 'fxb-pager');
    pages.forEach(pg => {
      const page = el('div', 'fxb-page');
      if (!pg.items.length) {
        page.appendChild(el('div', 'fxb-empty', pg.label === 'Recents' ? 'No recent effects yet' : 'Tap ★ on any effect to favourite it'));
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
    const top = el('div', 'fxb-catview-top');
    const back = el('button', 'fxb-back', '‹ Back'); back.addEventListener('click', () => view.remove());
    top.appendChild(back);
    top.appendChild(el('div', 'fxb-catview-title', cat.label));
    view.appendChild(top);
    const grid = el('div', 'fxb-grid');
    FM.fxRegistry.byCategory(cat.key).forEach(reg => grid.appendChild(tile(reg, null)));
    const scroller = el('div', 'fxb-catview-scroll'); scroller.appendChild(grid);
    view.appendChild(scroller);
    root.appendChild(view);
  }

  function buildSearchResults(q) {
    const grid = el('div', 'fxb-grid fxb-search-grid');
    FM.fxRegistry.all().filter(r => r.label.toLowerCase().indexOf(q.toLowerCase()) >= 0)
      .forEach(reg => grid.appendChild(tile(reg, null)));
    if (!grid.children.length) grid.appendChild(el('div', 'fxb-empty', 'No effects match “' + q + '”'));
    return grid;
  }

  function rebuild() {
    scrollEl.innerHTML = '';
    const q = (searchInput.value || '').trim();
    if (q) { scrollEl.appendChild(buildSearchResults(q)); stopAuto(); return; }
    const feat = buildFeatured();
    scrollEl.appendChild(feat.sec);
    scrollEl.appendChild(buildPaged(rebuild));
    scrollEl.appendChild(buildCategories());
    startAuto(feat.row);
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
      let next = row.scrollLeft + 1.2;
      if (next >= max) next = 0;
      row.scrollLeft = next;
    }, 30);
  }

  FM.fxBrowser = {
    init: function () {
      root = document.getElementById('fx-browser'); if (!root) return;
      scrollEl = root.querySelector('.fxb-scroll');
      searchInput = root.querySelector('.fxb-search-input');
      root.querySelector('.fxb-close').addEventListener('click', () => FM.fxBrowser.close());
      const searchBtn = root.querySelector('.fxb-search-btn');
      searchBtn.addEventListener('click', () => { searchInput.classList.toggle('hidden'); if (!searchInput.classList.contains('hidden')) searchInput.focus(); else { searchInput.value = ''; rebuild(); } });
      searchInput.addEventListener('input', rebuild);
    },
    open: function (layer) {
      if (!root) FM.fxBrowser.init();
      if (!root) return;
      _layer = layer || (FM.scene && FM.layerById(FM.scene, FM.scene.selectedId));
      if (!_layer) { if (FM.toast) FM.toast('Select a layer first', 1400); return; }
      searchInput.value = ''; searchInput.classList.add('hidden');
      root.classList.remove('hidden');
      rebuild();
    },
    close: function () { if (!root) return; stopAuto(); root.classList.add('hidden'); root.querySelectorAll('.fxb-catview').forEach(v => v.remove()); },
  };
})(window.FM);
