/* FreeMotion — Right-click context menu. FM.contextMenu.show(x, y, items[, { right, above }]) — right/above anchor it to a button. */
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
  let returnFocus = null;
  let insidePointerUntil = 0;
  function focusTrigger(node) {
    if (!(node instanceof Element)) return null;
    const target = node.closest('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    return target && target.isConnected ? target : null;
  }
  function menuItems() {
    return Array.from(menu.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])'));
  }
  function focusItem(item) {
    if (!item) return;
    menuItems().forEach(n => { n.tabIndex = n === item ? 0 : -1; });
    item.focus({ preventScroll: true });
  }
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
    menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Actions'); menu.tabIndex = -1;
    // A touch on a div menu item can move focus to the page before its click fires. Keep the
    // menu mounted for that gesture; the item's click closes it after running its action.
    menu.addEventListener('pointerdown', () => { insidePointerUntil = performance.now() + 500; });
    menu.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); FM.contextMenu.hide(true); return;
      }
      const items = menuItems();
      const current = e.target.closest('[role="menuitem"]');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault(); e.stopPropagation();
        const index = items.indexOf(current);
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
          : e.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
        focusItem(items[next]); return;
      }
      // Div/span menu items do not get the browser's native button keyboard click.
      if ((e.key === 'Enter' || e.key === ' ') && current && current.tagName !== 'BUTTON') {
        e.preventDefault(); e.stopPropagation(); current.click();
      }
    });
    menu.addEventListener('focusout', () => queueMicrotask(() => {
      if (menu && !menu.classList.contains('hidden') && !menu.contains(document.activeElement)
          && performance.now() >= insidePointerUntil) FM.contextMenu.hide();
    }));
    document.body.appendChild(menu);
    return menu;
  }
  FM.contextMenu = {
    show(x, y, items, opts) {
      ensure();
      // Second tap on the trigger that just closed this menu → leave it closed.
      if (sameTriggerAsLastOpen()) { closedOpener = null; openedBy = null; FM.contextMenu.hide(true); return; }
      closedOpener = null;
      // Whoever is being clicked right now owns this menu, so the NEXT tap on them closes it.
      openedBy = (performance.now() - lastClick.t < 400) ? lastClick.el : null;
      if (!menu.contains(document.activeElement)) returnFocus = focusTrigger(openedBy) || focusTrigger(document.activeElement);
      menu.innerHTML = '';
      items.forEach(it => {
        if (it.sep) { const s = document.createElement('div'); s.className = 'ctx-sep'; s.setAttribute('role', 'separator'); menu.appendChild(s); return; }
        if (it.swatches) {   // quick-colour strip (AM ⋯ menu): ✕ clears, dots set a layer colour tag
          if (it.swatchLabel) { const lb = document.createElement('div'); lb.className = 'ctx-swatch-label'; lb.textContent = it.swatchLabel; menu.appendChild(lb); }
          const row = document.createElement('div'); row.className = 'ctx-swatches'; row.setAttribute('role', 'group');
          row.setAttribute('aria-label', it.swatchLabel || 'Colours');
          const none = document.createElement('button'); none.className = 'ctx-swatch ctx-swatch-none'; none.textContent = '✕'; none.title = 'No fill';
          none.setAttribute('role', 'menuitem'); none.setAttribute('aria-label', 'No fill'); none.tabIndex = -1;
          none.addEventListener('click', () => { FM.contextMenu.hide(true); it.onPick(null); });
          row.appendChild(none);
          it.swatches.forEach(hex => {
            const b = document.createElement('button'); b.className = 'ctx-swatch'; b.style.background = hex; b.title = hex;
            b.setAttribute('role', 'menuitem'); b.setAttribute('aria-label', hex); b.tabIndex = -1;
            b.addEventListener('click', () => { FM.contextMenu.hide(true); it.onPick(hex); });
            row.appendChild(b);
          });
          menu.appendChild(row); return;
        }
        const b = document.createElement('div'); b.className = 'ctx-item' + (it.danger ? ' danger' : '') + (it.disabled ? ' disabled' : '');
        if (it.arrow && !it.disabled) {
          // split button: the label runs the main action; the ▸ chevron runs arrowAction (which usually
          // opens a follow-up menu — it does its own show(), so we don't hide first)
          b.classList.add('ctx-split'); b.setAttribute('role', 'group'); b.setAttribute('aria-label', it.label);
          const lab = document.createElement('span'); lab.className = 'ctx-split-label'; lab.textContent = it.label;
          lab.setAttribute('role', 'menuitem'); lab.tabIndex = -1;
          lab.addEventListener('click', (e) => { e.stopPropagation(); FM.contextMenu.hide(true); it.action(); });
          const arr = document.createElement('button'); arr.className = 'ctx-split-arrow'; arr.type = 'button'; arr.textContent = '▸'; arr.title = it.arrowTitle || 'More…';
          arr.setAttribute('role', 'menuitem'); arr.setAttribute('aria-label', it.arrowTitle || 'More ' + it.label); arr.tabIndex = -1;
          arr.addEventListener('click', (e) => { e.stopPropagation(); it.arrowAction(); });
          b.appendChild(lab); b.appendChild(arr);
        } else if (it.iconEl) {
          // item with a leading icon/thumbnail node (e.g. the Paste-Layer position picker shows each
          // layer's own thumbnail, matching the timeline row's left preview)
          b.classList.add('ctx-item-icon');
          b.appendChild(it.iconEl);
          const lab = document.createElement('span'); lab.className = 'ctx-icon-label'; lab.textContent = it.label;
          b.appendChild(lab);
          b.setAttribute('role', 'menuitem'); b.setAttribute('aria-label', it.label); b.tabIndex = -1;
          if (it.disabled) b.setAttribute('aria-disabled', 'true');
          if (!it.disabled) b.addEventListener('click', () => { FM.contextMenu.hide(true); it.action(); });
        } else {
          b.textContent = it.label;
          b.setAttribute('role', 'menuitem'); b.tabIndex = -1;
          if (it.disabled) b.setAttribute('aria-disabled', 'true');
          if (!it.disabled) b.addEventListener('click', () => { FM.contextMenu.hide(true); it.action(); });
        }
        menu.appendChild(b);
      });
      /* ⚠️ #864 — THE MENU IS A CHILD OF document.body, SO EVERY ONE OF THE LIGHT HOME'S 44 RULES
         MISSES IT. That is the whole bug Ezra photographed: a near-black slab with white text dropped
         on a white-to-mint Home screen. `html[data-home="light"]` is on the root and would match here
         too — but it must NOT, because the same #ctx-menu opens inside the editor, which is dark
         whatever the home is set to, and the home-light setting persists across the boundary.
         So the question the CSS has to be asked is not "is the light home switched on" but "is the
         light home ON SCREEN RIGHT NOW", and that is decided here, at open time, where the answer is
         knowable. A class rather than a `:has()` selector on purpose: a class is readable from a test
         in one line, and this is exactly the shape of thing that gets silently undone by a later
         refactor of the home screen's markup. */
      const home = document.getElementById('home-screen');
      const onLightHome = !!home && !home.classList.contains('hidden')
                       && document.documentElement.getAttribute('data-home') === 'light';
      menu.classList.toggle('ctx-light', onLightHome);
      /* ⚠️ MEASURED AT THE LEFT EDGE FIRST (#967 B4/B5 review). A fixed box is shrink-to-fit, so one placed at x takes at
         most `innerWidth − x`: opened from a button near the right edge, a menu of long items ("Editor — can change
         anything") WRAPPED every item onto two lines, measured that squeezed width, and the clamp below — which only acts
         when it hangs off the screen — found nothing to do, leaving it flush against the edge. At x = 0 nothing squeezes
         it, so `natW` below is the menu's own width and the clamp places it whole. */
      menu.style.left = '0px'; menu.style.top = y + 'px'; menu.classList.remove('hidden');
      /* ⚠️ THE HINGE CLASS COMES OFF BEFORE ANYTHING IS MEASURED, and this cost a real bug on the
         SECOND open. `fm-hinge-corner` is `animation-fill-mode: both`, so the moment the class is on,
         the element is already wearing the FROM frame — `rotateX(-78deg)` — and a rotated box measures
         about a fifth of its true height. Leaving last time's class on meant the clamp below asked "is
         104px tall going to fit?" and was told 22px, so it did not clamp, and a menu opened near the
         bottom of the phone hung off the screen. Measured: layout top 782 with height 104 on an 812
         viewport. The FIRST open was always fine, which is exactly what makes it the kind of bug that
         ships. */
      menu.classList.remove('ctx-hinge');
      const natW = menu.getBoundingClientRect().width;
      menu.style.left = x + 'px';
      let r = menu.getBoundingClientRect();
      /* ANCHORED UNDER A BUTTON, RIGHT EDGE TO RIGHT EDGE (queue 918.10 / 918.13). The callers that open
         a menu from a button used to GUESS its width — `r.right - 200` for Layer actions, `min(r.left,
         innerWidth - 210)` for Home's ⋯ — and the menu is only as wide as its longest item (min 152px).
         Measured at 1280: the Layer actions menu landed 49px left of its button, over the Back chevron;
         Home's ⋯ menu opened from the dot's LEFT edge and hung 106px past the card column at 1280 but
         sat right-aligned at 900. `opts.right` says where the right edge goes and the menu's own
         measured width does the rest — so it cannot drift from its button whatever it holds. */
      const alignR = !!opts && typeof opts.right === 'number' && isFinite(opts.right);
      if (alignR) { menu.style.left = Math.max(6, opts.right - natW) + 'px'; r = menu.getBoundingClientRect(); }
      /* Its OWN width decides (natW, above) — at x it may already have been squeezed to end exactly at the edge. */
      const overR = r.left + natW > window.innerWidth;
      if (overR) menu.style.left = Math.max(6, window.innerWidth - natW - 6) + 'px';   // see the hinge note below: measured BEFORE any transform
      r = menu.getBoundingClientRect();                                                 // …and its height once it has its width
      // Math.max(6,…): a menu TALLER than the viewport pushed top NEGATIVE, clipping its first items
      // off the top with no way to reach them — clamp to 6 and let CSS max-height/overflow scroll it.
      // A right-anchored menu hangs from its top-RIGHT corner, under the button, so it hinges from there.
      const flipX = alignR || overR, flipY = r.bottom > window.innerHeight;
      /* …and when it does not fit BELOW its button it opens ABOVE it (`opts.above` = the button's top),
         rather than being slid up until it covers the very button that opened it — measured at 1280x900,
         Layer actions (button 634-668, menu 247 tall) was clamped to 647-894, on top of its own button.
         Only when there is room above; otherwise the old clamp, which at least keeps every item on screen. */
      const upTop = (alignR && typeof opts.above === 'number') ? opts.above - 4 - r.height : -1;
      if (flipY) menu.style.top = (upTop >= 6 ? upTop : Math.max(6, window.innerHeight - r.height - 6)) + 'px';
      /* ═══ THE HINGE GOES ON LAST, AND THAT ORDER IS THE WHOLE TRICK (queue 612) ═══════════════
       * He picked the hinge: *"also do hinge for the animations"*. The menu swings open about the
       * corner it came from — but the clamping directly above measures `getBoundingClientRect()` to
       * decide whether the menu fits on screen, and a rotated box measures SMALLER than a flat one.
       * Adding the class before that would have the menu clamp against its own foreshortened width
       * and land in the wrong place, which reads as a positioning bug and not an animation one.
       * So it is added after every measurement is finished, and the origin follows whichever corner
       * the clamp actually put it on — a menu flipped to the left of your finger must hinge from the
       * right, or it swings away from the thing you tapped. */
      menu.style.transformOrigin = (flipX ? '100%' : '0%') + ' ' + (flipY ? '100%' : '0%');
      // #912: the PC pop family grows DOWN out of the click, or UP when the clamp lifted the menu above it
      menu.classList.toggle('ctx-up', flipY);
      void menu.offsetWidth;               // restart the animation when the menu is re-opened in place
      menu.classList.add('ctx-hinge');
      focusItem(menuItems()[0] || menu);
    },
    hide(restore) {
      if (!menu) return;
      const hadFocus = menu.contains(document.activeElement) || document.activeElement === menu;
      menu.classList.add('hidden');
      if (hadFocus) {
        if (restore && returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
        else document.activeElement.blur();
      }
    },
    isOpen() { return !!menu && !menu.classList.contains('hidden'); },
  };
})(window.FM);
