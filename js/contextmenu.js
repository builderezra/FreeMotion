/* FreeMotion — Right-click context menu. FM.contextMenu.show(x, y, items). */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  let menu;
  function ensure() {
    if (menu) return menu;
    menu = document.createElement('div'); menu.id = 'ctx-menu'; menu.className = 'hidden';
    document.body.appendChild(menu);
    document.addEventListener('pointerdown', (e) => { if (menu && !menu.contains(e.target)) FM.contextMenu.hide(); });
    window.addEventListener('blur', () => FM.contextMenu.hide());
    window.addEventListener('resize', () => FM.contextMenu.hide());
    return menu;
  }
  FM.contextMenu = {
    show(x, y, items) {
      ensure(); menu.innerHTML = '';
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
  };
})(window.FM);
