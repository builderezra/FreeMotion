/* FreeMotion — Keyboard shortcuts help overlay (toggle with ? or the top-bar button). */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const SHORTCUTS = [
    ['Space', 'Play / pause'],
    ['1 – 5', 'Add menu → Shape · Media · Audio · Object/Element · Template'],
    ['⇧ 1 / 2 / 3', 'Add Text · Sketching · Custom shape'],
    ['← / →', 'Nudge selected layer  (Shift = 10px)'],
    ['↑ / ↓', 'Nudge selected layer vertically'],
    [', / .', 'Step one frame back / forward'],
    ['Home / End', 'Jump to start / end'],
    ['⇧ + Home / End', 'Send the add marker to the top / bottom'],
    ['[ / ]', 'Set loop region in / out  (\\ clears)'],
    ['M', 'Add a timeline marker at the playhead'],
    ['+ / −', 'Zoom timeline in / out'],
    ['A', 'Cut away the left of the clip at the playhead · off the clip: bring it left to the playhead'],
    ['S', 'Split clip at playhead · off the clip: extend it to the playhead'],
    ['D', 'Cut away the right of the clip at the playhead · off the clip: bring it right to the playhead'],
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
    ['Right-click timeline', 'Add camera, adjustment layer, controller, or sample'],
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
    /* ONLY THE SHORTCUTS SCROLL (queue 372 clause 2). Ezra: "when you swipe down the menu it should only
       swipe the shortcuts not the close and tutorials buttons like it does now when you reach the bottom
       of the scroll."
       The card itself used to be the scroller with the footer sticky inside it — and sticky at
       `bottom: -22px`, a NEGATIVE offset, which is precisely why the buttons drift out of view exactly
       at the end of the scroll and nowhere else. A sticky footer inside the scroller can only ever
       approximate a pinned one; a footer that is a SIBLING of the scroller cannot move at all. */
    const scroll = document.createElement('div'); scroll.className = 'shortcuts-scroll';
    section(scroll, 'Keyboard', SHORTCUTS, 'shortcut-key');
    section(scroll, 'Mouse / stage', TIPS, 'shortcut-key wide');
    card.appendChild(scroll);
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
      FM.shortcuts.hide({ now: true });   // Home is about to cover the ? — nothing to fold into
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
    /* SMALL OR BIG (queue 927). Built once, like the card: the overlay lives for the session and is only shown and
       hidden, so the size is re-read on every show (sync) rather than on build. */
    if (FM.panelSize) sizer = FM.panelSize.attach(card, { key: 'shortcuts', name: 'Shortcuts', button: helpButton, parts: () => [scroll, row] });
  }
  let sizer = null, folding = null;
  /* The ? that is on screen — the PC transport row's or the phone top bar's — and none from Home, where the
     editor's ? is buried (#912): the fold (#927) must land on a button he can see. */
  function helpButton() {
    if (FM.home && FM.home.isOpen && FM.home.isOpen()) return null;
    const phone = window.matchMedia('(max-width: 700px)').matches;   // the phone bar's first — see notesButton in js/notepad.js
    for (const id of (phone ? ['m-help', 'btn-help'] : ['btn-help', 'm-help'])) {
      const b = document.getElementById(id);
      if (b && b.getBoundingClientRect().width > 0) return b;
    }
    return null;
  }
  /* POP OUT OF THE ? BUTTON (queue 548). The card opened dead centre at 500,63 with no animation;
     his ask is that each of the four transport menus comes out of its own button with a comic tail
     back to it. Placement lives in js/popfrom.js so all four share one rule.
     `popCleanup` is not optional: popFrom sets `position: fixed` on the card and lifts the button
     above the scrim, and both have to come off on close or the next open measures the old placement. */
  let popCleanup = null;
  /* …BUT NOT FROM THE HOME SCREEN (#912). Settings › Keyboard shortcuts opens this sheet over Home, where
     the editor's ? is not on screen — yet it still has a box, so popFrom anchored to it, lifted it above
     the scrim (measured z-index 3101), and a stray ? floated over Home at 1280 with the card's tail
     pointing at it. From Home the card centres, the same as it always has on a phone. */
  function popOpen() {
    if (popCleanup) { popCleanup(); popCleanup = null; }
    if (FM.home && FM.home.isOpen && FM.home.isOpen()) return;
    const card = overlay && overlay.querySelector('.shortcuts-card');
    const btn = document.getElementById('btn-help');
    /* NOT FROM HOME (#912). Home → Settings → Keyboard shortcuts opens this too, and the editor's ? is
       under the home screen there — still laid out, so popFrom measured it and lifted a lone ? and a
       comic tail over Home, pointing at nothing. From Home the card pops centred instead (styles.css). */
    const onHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (card && btn && FM.popFrom && !onHome) popCleanup = FM.popFrom(card, btn);
  }
  function popShut() { if (popCleanup) { popCleanup(); popCleanup = null; } }

  /* CLOSING WHILE BIG FOLDS INTO THE ? (queue 927 clause 8). It counts as closed from the first frame — isOpen()
     is false and a second ? opens it again at once — and is hidden when the fold lands. */
  function shut(now) {
    if (!overlay) return;
    if (folding) { if (now) folding.finish(); return; }
    if (!now && sizer && sizer.isBig() && !overlay.classList.contains('hidden')) {
      overlay.classList.add('pb-closing');
      folding = sizer.fold(() => {
        folding = null;
        overlay.classList.remove('pb-closing');
        overlay.classList.add('hidden');
        popShut();
      });
      return;
    }
    overlay.classList.add('hidden');
    popShut();
  }
  function open() {
    if (!overlay) build();
    if (folding) folding.finish();   // opened again mid-fold: end the fold, then open as normal
    overlay.classList.remove('hidden');
    if (sizer) sizer.sync();         // before popOpen, so a panel he left big opens big and centred
    popOpen();
    if (sizer) sizer.refresh();
  }

  FM.shortcuts = {
    isOpen() { return !!overlay && !overlay.classList.contains('hidden') && !overlay.classList.contains('pb-closing'); },
    toggle() { if (FM.shortcuts.isOpen()) shut(false); else open(); },
    show() { open(); },
    hide(o) { shut(!!(o && o.now)); },
  };
})(window.FM);
