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
    ['⇧ + Home / End', 'Send the add marker to the top / bottom'],
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
    const h = document.createElement('div'); h.className = 'shortcuts-title'; h.textContent = 'Shortcuts / tips';
    card.appendChild(h);
    section(card, 'Keyboard', SHORTCUTS, 'shortcut-key');
    section(card, 'Mouse / stage', TIPS, 'shortcut-key wide');
    /* A WAY OUT TO THE TUTORIALS (queue 274). Ezra: "At the bottom of the keyboard shortcuts menu when
       you press the ? Icon it should show a button that takes you straight to the tutorial section and
       it should also the button should just say like tutorials here or whatever and then you click on
       it and it takes you to tutorials."
       This sheet is where someone lands when they are stuck, and until now the only thing it offered
       them was a list of shortcuts and a Close. The tutorials live on the home screen behind a tab, so
       getting there meant leaving the project by hand and knowing which tab to press.
       It reuses the tab button rather than reaching into home's state: the click handler on .hm-tab is
       the ONE thing that switches tab and re-renders, so pressing it is the same route a finger takes
       and there is no second path to keep in step. */
    const row = document.createElement('div'); row.className = 'shortcuts-foot';
    const tut = document.createElement('button'); tut.className = 'btn shortcuts-tut'; tut.type = 'button';
    tut.textContent = 'Tutorials';
    tut.addEventListener('click', () => {
      FM.shortcuts.hide();
      if (FM.home && FM.home.open) FM.home.open();
      /* AFTER open(), and on a TIMER rather than rAF. Two separate reasons, both load-bearing:
         · open() sets its tab back to 'projects' itself and then renders, so switching before it runs
           is simply overwritten;
         · requestAnimationFrame does not fire in a hidden or backgrounded tab. The first cut of this
           used rAF and the button silently did nothing — home opened on Projects — which is the same
           trap tests/tests.js already records for its own waits ("rAF is throttled and a promise
           waiting on it never settles"). A timer runs either way. */
      setTimeout(() => {
        const b = document.querySelector('#home-screen .hm-tab[data-tab="tutorials"]');
        if (b) b.click();
      }, 0);
    });
    const close = document.createElement('button'); close.className = 'btn'; close.textContent = 'Close';
    close.addEventListener('click', () => FM.shortcuts.hide());
    row.append(tut, close);
    card.appendChild(row);
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
