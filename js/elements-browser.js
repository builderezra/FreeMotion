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

  function tile(e, i) {
    const b = el('button', 'fxb-tile');
    b.title = e.name || 'Element';
    const t = el('div', 'fxb-thumb'); t.dataset.cat = 'object';
    if (e.thumb) {
      const img = el('img', 'elb-thumb-img'); img.src = e.thumb; img.alt = '';
      t.appendChild(img);
    } else {
      /* A RING WALKED BY INDEX, not a hash of the name — the same decision addmenu.js already made
         and wrote down for the tab palettes: a hash gives every tile its own hue and no two of them
         any relationship, which reads as accidental, while walking a chosen ring keeps neighbours far
         apart and needs no upkeep. Before this, every element without a thumbnail was the SAME blue
         gradient, so a screen of them was one colour repeated — part of what "looks lazy" meant. */
      t.dataset.h = String((i || 0) % 6);
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

  /* THE EMPTY STATE WAS THE WHOLE COMPLAINT (queue 340 clause 2). Ezra: "when you press the add
     element button the menu is not thought and looks lazy and shit, make it good."
     What it was: a screen of black with one line of italic grey text at the top of it, a search field
     that stopped half way across the phone, and no way to do anything from here.
     And the line was WRONG as well as small — it said "select some layers, then Elements ▸ Save
     selection as element", and that item was removed from the Add menu (see the note in addmenu.js:216:
     it acts on a selection and that menu only ever opens when nothing is selected). So the one
     instruction in the room pointed at a door that is not there any more.
     What it is now: the mark this feature already uses, a heading, the TWO routes that actually exist,
     and — when there is a selection to act on — the button that does it, right here. */
  function emptyState() {
    const wrap = el('div', 'elb-empty');
    // The four-square mark from the Add menu's Custom elements tile, so the empty screen is recognisably
    // the same place as the button that opened it. Static markup, no user data.
    const mark = el('div', 'elb-empty-mark');
    mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>'
      + '<rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/></svg>';   // static markup, no user data
    wrap.appendChild(mark);
    wrap.appendChild(el('div', 'elb-empty-title', 'No elements yet'));
    wrap.appendChild(el('div', 'elb-empty-sub', 'An element is a piece you build once and drop into any project — a title, a logo lockup, a lower third.'));

    const ways = el('div', 'elb-ways');
    const way = (n, text) => { const r = el('div', 'elb-way'); r.appendChild(el('span', 'elb-way-n', n)); r.appendChild(el('span', 'elb-way-t', text)); return r; };
    ways.appendChild(way('1', 'In a project: select the layers, then ⋯ → Save selection as element.'));
    ways.appendChild(way('2', 'On the home screen: Elements → New element, build it, then ⋯ → Save as element.'));
    wrap.appendChild(ways);

    /* The button appears only when there is something for it to save. A permanently present control
       whose only behaviour is a toast telling you why it did nothing is the "lazy" this is fixing. */
    let n = 0;
    try { n = (FM.selectionIds ? FM.selectionIds() : []).length; } catch (e) {}
    if (n) {
      const b = el('button', 'elb-empty-go', 'Save ' + (n === 1 ? 'the selected layer' : 'the ' + n + ' selected layers') + ' as an element');
      b.type = 'button';
      b.addEventListener('click', () => { close(); if (FM.saveElementPrompt) FM.saveElementPrompt(); });
      wrap.appendChild(b);
    }
    return wrap;
  }

  function draw() {
    if (!grid) return;
    grid.textContent = '';
    const items = list();
    items.forEach((e, i) => grid.appendChild(tile(e, i)));
    const all = (FM.elements && FM.elements.list) ? (FM.elements.list() || []) : [];
    empty.textContent = '';
    empty.classList.toggle('hidden', !!items.length);
    if (!items.length) {
      if (all.length) empty.appendChild(el('div', 'elb-nomatch', 'No element matches “' + needle + '”'));
      else empty.appendChild(emptyState());
    }
    // Searching a library with nothing in it is furniture. Hidden on the count of the WHOLE library,
    // not of the filtered list, or typing a word that matches nothing would remove the field you typed
    // it into.
    if (searchInput) searchInput.classList.toggle('hidden', !all.length);
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

    /* NO WRAPPER. `.fxb-search-input` is styled for a flex COLUMN parent — the effect browser appends
       it straight into the root, where the default `align-items: stretch` gives it the full width.
       This browser wrapped it in an unstyled div, so the input fell back to an <input>'s intrinsic
       ~20-character width and stopped half way across the phone. Measured at 380px before the fix:
       190px of a 380px screen, hard against the left margin. */
    searchInput = el('input', 'fxb-search-input');
    searchInput.type = 'search'; searchInput.placeholder = 'Search elements';
    searchInput.setAttribute('aria-label', 'Search elements');
    searchInput.addEventListener('input', () => { needle = (searchInput.value || '').trim().toLowerCase(); draw(); });
    root.appendChild(searchInput);

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
