/* FreeMotion — Right-click context menu. FM.contextMenu.show(x, y, items). */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  let menu;
  // One tap on a trigger produces TWO events: pointerdown, then click. The pointerdown lands outside
  // the open menu and closes it; the click then runs the trigger's own handler, which calls show()
  // and opens it straight back up. Ezra: "tapping on it again should close it, currently it just
  // infinitely reopens." Fixed here rather than in every trigger, because there are a dozen of them
  // and the next one added would have the bug again.
  // The trick is telling "tapped the SAME trigger" (→ toggle shut) from "tapped a DIFFERENT trigger
  // while a menu was open" (→ close the old one, open the new one). Both look identical from inside
  // show(). So: remember which element dismissed the menu, and capture the element being clicked in
  // a CAPTURE-phase listener — capture runs before the trigger's own bubble-phase handler, so by the
  // time show() is called we already know what was clicked, without asking every call site to pass it.
  // The comparison that matters is "is the thing I am clicking now the same thing that OPENED the
  // menu I just closed?" — not "did the same element close it and click it", which is true of every
  // tap ever and made a second trigger swallow its own menu.
  let openedBy = null;            // element whose click opened the menu currently showing
  let closedOpener = null;        // what openedBy was at the moment an outside press closed it
  let lastClick = { t: 0, el: null };
  function sameTriggerAsLastOpen() {
    if (!closedOpener || !lastClick.el) return false;
    // 400ms, not 60: a trigger may do real work before it calls show() — the parent picker builds a
    // thumbnail for every layer first — and a tight window made that menu un-toggleable.
    if (performance.now() - lastClick.t > 400) return false;   // a later, unrelated click
    const a = closedOpener, b = lastClick.el;
    return a === b || (a.contains && a.contains(b)) || (b.contains && b.contains(a));
  }
  // Registered at LOAD, not inside ensure(). ensure() first runs during the very click that opens the
  // first menu, by which point that click has already passed document's capture phase — so the first
  // trigger of the session was never recorded and its second tap re-opened instead of closing. The
  // toggle was correct from the second menu onwards, which is exactly the kind of off-by-one that
  // survives a casual test.
  document.addEventListener('pointerdown', (e) => {
    if (!menu || menu.contains(e.target)) return;
    // Only meaningful for the tap IMMEDIATELY after an open menu. Left set, a stale opener would
    // make a much later tap on that same button toggle a menu shut that was not even showing.
    closedOpener = menu.classList.contains('hidden') ? null : openedBy;
    FM.contextMenu.hide();
  });
  document.addEventListener('click', (e) => { lastClick = { t: performance.now(), el: e.target }; }, true);
  window.addEventListener('blur', () => FM.contextMenu.hide());
  window.addEventListener('resize', () => FM.contextMenu.hide());

  function ensure() {
    if (menu) return menu;
    menu = document.createElement('div'); menu.id = 'ctx-menu'; menu.className = 'hidden';
    document.body.appendChild(menu);
    return menu;
  }
  FM.contextMenu = {
    show(x, y, items) {
      ensure();
      // Second tap on the trigger that just closed this menu → leave it closed.
      if (sameTriggerAsLastOpen()) { closedOpener = null; openedBy = null; FM.contextMenu.hide(); return; }
      closedOpener = null;
      // Whoever is being clicked right now owns this menu, so the NEXT tap on them closes it.
      openedBy = (performance.now() - lastClick.t < 400) ? lastClick.el : null;
      menu.innerHTML = '';
      items.forEach(it => {
        if (it.sep) { const s = document.createElement('div'); s.className = 'ctx-sep'; menu.appendChild(s); return; }
        if (it.swatches) {   // quick-colour strip (AM ⋯ menu): ✕ clears, dots set a layer colour tag
          if (it.swatchLabel) { const lb = document.createElement('div'); lb.className = 'ctx-swatch-label'; lb.textContent = it.swatchLabel; menu.appendChild(lb); }
          const row = document.createElement('div'); row.className = 'ctx-swatches';
          const none = document.createElement('button'); none.className = 'ctx-swatch ctx-swatch-none'; none.textContent = '✕'; none.title = 'No fill';
          none.addEventListener('click', () => { FM.contextMenu.hide(); it.onPick(null); });
          row.appendChild(none);
          it.swatches.forEach(hex => {
            const b = document.createElement('button'); b.className = 'ctx-swatch'; b.style.background = hex; b.title = hex;
            b.addEventListener('click', () => { FM.contextMenu.hide(); it.onPick(hex); });
            row.appendChild(b);
          });
          menu.appendChild(row); return;
        }
        const b = document.createElement('div'); b.className = 'ctx-item' + (it.danger ? ' danger' : '') + (it.disabled ? ' disabled' : '');
        if (it.arrow && !it.disabled) {
          // split button: the label runs the main action; the ▸ chevron runs arrowAction (which usually
          // opens a follow-up menu — it does its own show(), so we don't hide first)
          b.classList.add('ctx-split');
          const lab = document.createElement('span'); lab.className = 'ctx-split-label'; lab.textContent = it.label;
          lab.addEventListener('click', (e) => { e.stopPropagation(); FM.contextMenu.hide(); it.action(); });
          const arr = document.createElement('button'); arr.className = 'ctx-split-arrow'; arr.type = 'button'; arr.textContent = '▸'; arr.title = it.arrowTitle || 'More…';
          arr.addEventListener('click', (e) => { e.stopPropagation(); it.arrowAction(); });
          b.appendChild(lab); b.appendChild(arr);
        } else if (it.iconEl) {
          // item with a leading icon/thumbnail node (e.g. the Paste-Layer position picker shows each
          // layer's own thumbnail, matching the timeline row's left preview)
          b.classList.add('ctx-item-icon');
          b.appendChild(it.iconEl);
          const lab = document.createElement('span'); lab.className = 'ctx-icon-label'; lab.textContent = it.label;
          b.appendChild(lab);
          if (!it.disabled) b.addEventListener('click', () => { FM.contextMenu.hide(); it.action(); });
        } else {
          b.textContent = it.label;
          if (!it.disabled) b.addEventListener('click', () => { FM.contextMenu.hide(); it.action(); });
        }
        menu.appendChild(b);
      });
      menu.style.left = x + 'px'; menu.style.top = y + 'px'; menu.classList.remove('hidden');
      const r = menu.getBoundingClientRect();
      if (r.right > window.innerWidth) menu.style.left = Math.max(6, window.innerWidth - r.width - 6) + 'px';
      // Math.max(6,…): a menu TALLER than the viewport pushed top NEGATIVE, clipping its first items
      // off the top with no way to reach them — clamp to 6 and let CSS max-height/overflow scroll it.
      if (r.bottom > window.innerHeight) menu.style.top = Math.max(6, window.innerHeight - r.height - 6) + 'px';
    },
    hide() { if (menu) menu.classList.add('hidden'); },
    isOpen() { return !!menu && !menu.classList.contains('hidden'); },
  };
})(window.FM);
