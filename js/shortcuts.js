/* FreeMotion — Keyboard shortcuts help overlay (toggle with ? or the top-bar button). */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const SHORTCUTS = [
    ['Space', 'Play / pause'],
    ['1 – 5', 'Add menu → Shape · Media · Audio · Object/Element · Template'],
    ['⇧ 1 / 2 / 3', 'Add Text · Freehand Drawing · Vector Drawing'],
    ['← / →', 'Nudge selected layer  (Shift = 10px)'],
    ['↑ / ↓', 'Nudge selected layer vertically'],
    [', / .', 'Step one frame back / forward'],
    ['Home / End', 'Jump to start / end'],
    ['[ / ]', 'Set loop region in / out  (\\ clears)'],
    ['M', 'Add a timeline marker at the playhead'],
    ['+ / −', 'Zoom timeline in / out'],
    ['S', 'Split clip at playhead'],
    ['Delete', 'Delete selected layer'],
    ['⌘/Ctrl + D', 'Duplicate selected layer'],
    ['⌘/Ctrl + C / V', 'Copy / paste layer(s)'],
    ['⌘/Ctrl + A', 'Select all layers'],
    ['⌘/Ctrl + Z', 'Undo'],
    ['⌘/Ctrl + ⇧ + Z', 'Redo'],
    ['Tab / ⇧Tab', 'Select next / previous layer'],
    ['Esc', 'Go back a page (sub-menu → grid → deselect)'],
    ['?', 'Show / hide this help'],
  ];
  // Mouse / stage interactions — the powerful bits that aren't obvious from the UI.
  const TIPS = [
    ['Right-click timeline', 'Add camera, adjustment layer, null, or sample'],
    ['Select camera, drag', 'Pan the whole scene'],
    ['Select camera, scroll', 'Zoom around the cursor'],
    ['Drag layer / handles', 'Move, or scale & rotate from the corners'],
    ['Effects panel', 'Add · animate ◆ · toggle · reorder · swipe-left to delete'],
    ['Click off the panel (PC)', 'Step back / close the open menu'],
    ['Double-click clip', 'Open it in the inspector'],
  ];
  let overlay;
  function section(card, title, pairs, keyClass) {
    const lbl = document.createElement('div'); lbl.className = 'shortcuts-sub'; lbl.textContent = title; card.appendChild(lbl);
    const list = document.createElement('div'); list.className = 'shortcuts-list';
    pairs.forEach(pair => {
      const row = document.createElement('div'); row.className = 'shortcut-row';
      const key = document.createElement('span'); key.className = keyClass; key.textContent = pair[0];
      const desc = document.createElement('span'); desc.className = 'shortcut-desc'; desc.textContent = pair[1];
      row.append(key, desc); list.appendChild(row);
    });
    card.appendChild(list);
  }
  function build() {
    overlay = document.createElement('div'); overlay.id = 'shortcuts-overlay'; overlay.className = 'hidden';
    const card = document.createElement('div'); card.className = 'shortcuts-card';
    const h = document.createElement('div'); h.className = 'shortcuts-title'; h.textContent = 'Shortcuts & tips';
    card.appendChild(h);
    section(card, 'Keyboard', SHORTCUTS, 'shortcut-key');
    section(card, 'Mouse & stage', TIPS, 'shortcut-key wide');
    const close = document.createElement('button'); close.className = 'btn'; close.textContent = 'Close';
    close.addEventListener('click', () => FM.shortcuts.hide());
    card.appendChild(close);
    overlay.appendChild(card);
    overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) FM.shortcuts.hide(); });
    document.body.appendChild(overlay);
  }
  FM.shortcuts = {
    isOpen() { return !!overlay && !overlay.classList.contains('hidden'); },
    toggle() { if (!overlay) build(); overlay.classList.toggle('hidden'); },
    show() { if (!overlay) build(); overlay.classList.remove('hidden'); },
    hide() { if (overlay) overlay.classList.add('hidden'); },
  };
})(window.FM);
