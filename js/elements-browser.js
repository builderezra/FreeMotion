/* FreeMotion — full-screen Elements browser.
 *
 * Ezra: "make sure all the elements are grouped together and not siting loose in the same menu that
 * holds camera and all that, you need to press a button that opens up a new menu that is like the
 * effects menu but for your elements, and has search and all that."
 *
 * Saved elements used to be PUSHED onto the same list as Camera / Null / Adjustment / Empty group, so
 * three structural layer types and thirty of your own saved selections sat in one flat grid. They now
 * live behind one button in the Elements tab, which opens this.
 *
 * Deliberately reuses the .fxb-* classes from the effect browser rather than inventing a second set of
 * styles: same chrome, same search field, same grid, so it reads as the same kind of place. Elements
 * carry a real thumbnail (e.thumb, the same one the home screen shows), which is better than anything
 * generated — so tiles show it when it exists and fall back to a glyph when it doesn't.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  let root, grid, searchInput, empty, needle = '';

  function list() {
    const all = (FM.elements && FM.elements.list) ? (FM.elements.list() || []) : [];
    if (!needle) return all;
    return all.filter(e => (e.name || '').toLowerCase().indexOf(needle) >= 0);
  }

  async function insert(e) {
    close();
    const ok = await FM.elements.insert(e.id);
    // insert() returns false when the IndexedDB pack was evicted — say so instead of silently
    // doing nothing, the same way the template inserter had to be taught to.
    if (FM.toast) FM.toast(ok === false ? 'Element data missing — re-save it from a project' : 'Inserted “' + (e.name || 'element') + '”');
  }

  function tile(e) {
    const b = el('button', 'fxb-tile');
    b.title = e.name || 'Element';
    const t = el('div', 'fxb-thumb'); t.dataset.cat = 'object';
    if (e.thumb) {
      const img = el('img', 'elb-thumb-img'); img.src = e.thumb; img.alt = '';
      t.appendChild(img);
    } else {
      t.appendChild(el('span', 'fxb-thumb-glyph', (e.name || '?').slice(0, 1).toUpperCase()));
    }
    b.appendChild(t);
    b.appendChild(el('span', 'fxb-tile-name', e.name || 'Element'));
    b.addEventListener('click', () => insert(e));
    // long-press / right-click to delete, matching how the home screen manages them
    let lp = 0;
    const del = async () => {
      if (!confirm('Delete element “' + (e.name || '') + '”?')) return;
      await FM.elements.remove(e.id);
      draw();
    };
    b.addEventListener('contextmenu', (ev) => { ev.preventDefault(); del(); });
    b.addEventListener('pointerdown', () => { lp = setTimeout(del, 620); });
    ['pointerup', 'pointerleave', 'pointercancel', 'pointermove'].forEach(k => b.addEventListener(k, () => { if (lp) { clearTimeout(lp); lp = 0; } }));
    return b;
  }

  function draw() {
    if (!grid) return;
    grid.textContent = '';
    const items = list();
    items.forEach(e => grid.appendChild(tile(e)));
    const none = !items.length;
    empty.classList.toggle('hidden', !none);
    empty.textContent = needle
      ? 'No element matches “' + needle + '”'
      : 'No elements yet — select some layers, then Elements ▸ Save selection as element.';
  }

  function build() {
    root = el('div', 'fxb-root hidden'); root.id = 'el-browser';
    const top = el('div', 'fxb-top');
    top.appendChild(el('div', 'fxb-title', 'Elements'));
    const close_ = el('button', 'fxb-close', '✕');
    close_.type = 'button'; close_.setAttribute('aria-label', 'Close elements');
    close_.addEventListener('click', close);
    top.appendChild(close_);
    root.appendChild(top);

    const sw = el('div', 'fxb-search');
    searchInput = el('input', 'fxb-search-input');
    searchInput.type = 'search'; searchInput.placeholder = 'Search elements';
    searchInput.setAttribute('aria-label', 'Search elements');
    searchInput.addEventListener('input', () => { needle = (searchInput.value || '').trim().toLowerCase(); draw(); });
    sw.appendChild(searchInput);
    root.appendChild(sw);

    const scroll = el('div', 'fxb-catview-scroll');
    grid = el('div', 'fxb-grid');
    empty = el('div', 'fxb-empty hidden');
    scroll.appendChild(grid); scroll.appendChild(empty);
    root.appendChild(scroll);

    // tap the backdrop to dismiss — same as the effect browser's tap-out
    root.addEventListener('pointerdown', (ev) => { if (ev.target === root) close(); });
    document.body.appendChild(root);
  }

  function close() { if (root) root.classList.add('hidden'); }

  FM.elementsBrowser = {
    open() {
      if (!root) build();
      needle = ''; if (searchInput) searchInput.value = '';
      draw();
      root.classList.remove('hidden');
      // don't autofocus on a phone: the keyboard would cover the grid you came to look at
      const fine = !window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (fine && searchInput) setTimeout(() => searchInput.focus(), 30);
    },
    close: close,
    // exposed for the suite: the filter is the whole point of the browser
    _match(all, q) { needle = (q || '').trim().toLowerCase(); return (all || []).filter(e => (e.name || '').toLowerCase().indexOf(needle) >= 0); },
  };
})(window.FM);
