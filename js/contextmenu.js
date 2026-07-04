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
        if (it.swatches) {   // quick-colour strip (AM ⋯ menu): ✕ clears, dots apply a solid fill
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
        const b = document.createElement('div'); b.className = 'ctx-item' + (it.danger ? ' danger' : '') + (it.disabled ? ' disabled' : ''); b.textContent = it.label;
        if (!it.disabled) b.addEventListener('click', () => { FM.contextMenu.hide(); it.action(); });
        menu.appendChild(b);
      });
      menu.style.left = x + 'px'; menu.style.top = y + 'px'; menu.classList.remove('hidden');
      const r = menu.getBoundingClientRect();
      if (r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 6) + 'px';
      if (r.bottom > window.innerHeight) menu.style.top = (window.innerHeight - r.height - 6) + 'px';
    },
    hide() { if (menu) menu.classList.add('hidden'); },
  };
})(window.FM);
