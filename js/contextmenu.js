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
        const b = document.createElement('div'); b.className = 'ctx-item' + (it.danger ? ' danger' : ''); b.textContent = it.label;
        b.addEventListener('click', () => { FM.contextMenu.hide(); it.action(); });
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
