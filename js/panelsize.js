/* panelsize.js — grab the corner of the Notes or Shortcuts/tips panel to make it BIG (queue 927).
 *
 * Ezra, 24 Sep, in full in REQUESTS.md #927. The clauses this file carries, in his words:
 *   · "almost like how on like any computer, when you grab the corner of a window … the cursor will change.
 *      And then you click and then you drag it"                                     → the grip + resize cursor
 *   · "instead of it being like it has like unlimited different states … it only has two states either zoomed
 *      in or zoomed out"                                                              → SMALL and BIG, nothing between
 *   · "it expands into a bigger view where it basically covers up more of the screen and is in the center"
 *   · "if you grab the edges again and drag it back in again it'll go back to smaller"
 *   · "every time you open it up and close it it'll remember what you last had it like"   → localStorage, per panel
 *   · "if you extend it out big and you close it … it kind of like shrinks down onto itself before closing so it's
 *      like shrinking and then folding into the button"                               → fold()
 *
 * ONE MECHANISM FOR BOTH PANELS, the way js/popfrom.js is one mechanism for the four transport menus. A panel
 * calls attach(card, opts) once it has built its card and gets back a small controller.
 *
 * HOW A DRAG DECIDES. The drag never sizes the panel freely — that is the one thing he ruled out. While the
 * pointer is down the panel only LEANS after it (a few percent, damped), and once the pointer has travelled far
 * enough to commit, a dashed outline of the OTHER size appears, so he can see what letting go will do. Letting go
 * past that point animates to the other size; letting go short of it springs back. A plain tap on the grip also
 * switches, because a finger on a phone is not always going to drag a corner that sits near the screen edge.
 *
 * ⚠️ BIG IS DRAWN BY CSS, NOT BY THIS FILE. `.pb-big` gives the card its big width and height (styles.css,
 * `--pb-w/--pb-h`), and the card's own flex-centred scrim puts it in the middle. This file only toggles the
 * class and animates between the two measured boxes — so a window resize, a rotation or the phone's safe areas
 * are all handled by the stylesheet and nothing here has to re-measure them.
 * On PC the small panel hangs off its button through js/popfrom.js's `--pop-dx/--pop-dy`; popfrom's place()
 * zeroes those while `.pb-big` is on, and exposes itself as `card._popPlace` so a size change re-places the card
 * in the same tick instead of on the next ResizeObserver callback.
 */
(function () {
  'use strict';
  const FM = window.FM = window.FM || {};

  const STORE = 'fm.panelBig';   // {notes: true, shortcuts: true} — a key is present only while that panel is big
  const COMMIT = 36;             // px of travel (outward to grow, inward to shrink) that switches size on release
  const TAP = 6;                 // under this much travel a press on the grip is a tap, and a tap switches too
  const LEAN = 0.07;             // the most the panel leans after the pointer before it commits

  function readStore() {
    try { const o = JSON.parse(localStorage.getItem(STORE) || '{}'); return (o && typeof o === 'object') ? o : {}; }
    catch (e) { return {}; }
  }
  function remembered(key) { return readStore()[key] === true; }
  function remember(key, big) {
    try { const o = readStore(); if (big) o[key] = true; else delete o[key]; localStorage.setItem(STORE, JSON.stringify(o)); }
    catch (e) { /* private window / storage off: the size still works, it just is not remembered */ }
  }
  function still() {
    if (FM.panelSize && FM.panelSize._reduce) return true;   // suite seam: the reduced-motion path without the OS setting
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function laidOut(el) { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  /* The card's LAYOUT box — offset* values, which transforms cannot touch (the same reason popfrom.js reads them). */
  function box(el) {
    const op = el.offsetParent || document.body, r = op.getBoundingClientRect();
    return { left: r.left + el.offsetLeft, top: r.top + el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
  }
  /* Where the card RESTS in its current state: its layout box plus popfrom's offset, which only applies on PC. */
  function resting(card) {
    const b = box(card);
    let x = 0, y = 0;
    if (card.classList.contains('pop-card') && !card.classList.contains('pb-big') && window.matchMedia('(min-width: 701px)').matches) {
      x = parseFloat(card.style.getPropertyValue('--pop-dx')) || 0;
      y = parseFloat(card.style.getPropertyValue('--pop-dy')) || 0;
    }
    return { left: b.left + x, top: b.top + y, width: b.width, height: b.height };
  }
  function mid(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  /* THE GRIP'S MARK. Three looks are carried while he chooses (REQUESTS.md #927 clause 9, his standing rule #545);
     <html data-pb-look> picks one and the stylesheet shows only that one. The two he does not pick get deleted. */
  const MARKS =
    '<svg class="pb-mark pb-arc" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 21.5V10a7.5 7.5 0 0 1 7.5-7.5h11.5"/></svg>' +
    '<svg class="pb-mark pb-lines" viewBox="0 0 16 16" aria-hidden="true"><path d="M15 4.5 4.5 15M15 9 9 15M15 13.2 13.2 15"/></svg>' +
    '<span class="pb-mark pb-chip" aria-hidden="true">' +
      '<svg class="pb-out" viewBox="0 0 24 24"><path d="M4 10V4h6M4 4l6.5 6.5M20 14v6h-6M20 20l-6.5-6.5"/></svg>' +
      '<svg class="pb-in" viewBox="0 0 24 24"><path d="M10 3.5V10H3.5M10 10 3.5 3.5M14 20.5V14h6.5M14 14l6.5 6.5"/></svg>' +
    '</span>';

  /* attach(card, opts)
   *   opts.key     'notes' | 'shortcuts' — what the size is remembered under
   *   opts.name    'Notes' — for the grip's accessible label
   *   opts.button  () => the button the panel came out of (for the fold), or null when there is none on screen
   *   opts.parts   () => the card's BODY elements, which fade while the frame changes size (the header stays)
   *   opts.onChange(big) — after the size switched, e.g. the notepad re-fits its text boxes */
  function attach(card, opts) {
    opts = opts || {};
    const key = opts.key;
    let big = remembered(key);
    let corner = 'tr';
    let drag = null, ghost = null, running = [], closing = null;

    const grip = document.createElement('div');
    grip.className = 'pb-grip';
    grip.setAttribute('role', 'button');
    grip.tabIndex = 0;
    grip.innerHTML = MARKS;
    // The two edges beside the grip take the same drag on PC (he: "grab the edges again and drag it back in").
    const edgeH = document.createElement('div'); edgeH.className = 'pb-edge pb-edge-h'; edgeH.setAttribute('aria-hidden', 'true');
    const edgeV = document.createElement('div'); edgeV.className = 'pb-edge pb-edge-v'; edgeV.setAttribute('aria-hidden', 'true');
    card.classList.add('pb-card');
    card.append(edgeH, edgeV, grip);

    function parts() { try { return (opts.parts ? opts.parts() : []).filter(Boolean); } catch (e) { return []; } }

    function apply(b) {
      card.classList.toggle('pb-big', b);
      const name = opts.name || 'panel';
      grip.setAttribute('aria-label', (b ? 'Make ' + name + ' smaller' : 'Make ' + name + ' bigger'));
      grip.title = b ? 'Drag in to make it smaller' : 'Drag out to make it bigger';
      if (typeof card._popPlace === 'function') card._popPlace();
      if (opts.onChange) { try { opts.onChange(b); } catch (e) {} }
    }

    /* WHICH CORNER. The one facing into the screen, away from where the panel hangs: on PC the panel sits above its
       button at the right of the transport row, so that is the TOP-LEFT — the corner you would grab on a desktop
       window parked in the bottom-right. Centred (a phone, or opened from Home) it is the TOP-RIGHT: both cards keep
       their buttons along the bottom (Done; Tutorials/Close), so a bottom corner would sit on a button. Big keeps
       whichever corner small had, so the same grip goes back the way it came. */
    function refresh() {
      let c = 'tr';
      const btn = opts.button && opts.button();
      if (btn && card.classList.contains('pop-card')) {
        const r = btn.getBoundingClientRect();
        if (r.left + r.width / 2 > window.innerWidth / 2) c = 'tl';
      }
      corner = c;
      card.setAttribute('data-pb-corner', c);
    }

    function outward(zone) {
      const sx = corner === 'tl' ? -1 : 1;
      if (zone === 'h') return { x: 0, y: -1 };            // the top edge: up is out
      if (zone === 'v') return { x: sx, y: 0 };            // the side edge: away from the card
      return { x: sx * Math.SQRT1_2, y: -Math.SQRT1_2 };   // the corner: diagonally out
    }

    /* The OTHER size's box, for the preview outline: flip the class, measure, flip back — all in one tick, so
       nothing is painted in between. */
    function otherBox() {
      card.classList.toggle('pb-big', !big);
      if (typeof card._popPlace === 'function') card._popPlace();
      const r = resting(card);
      card.classList.toggle('pb-big', big);
      if (typeof card._popPlace === 'function') card._popPlace();
      return r;
    }
    function showGhost(on) {
      if (!on) { if (ghost) ghost.classList.remove('on'); return; }
      if (!drag.other) drag.other = otherBox();
      const host = card.parentElement;
      if (!host) return;
      if (!ghost) {
        ghost = document.createElement('div');
        ghost.className = 'pb-ghost';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.setAttribute('data-pb-key', key);
        // growing: the outline is BEHIND the card (the card sits inside the big frame's area);
        // shrinking: it is drawn OVER the big card, or it would be hidden by the very panel it outlines
        ghost.classList.toggle('pb-ghost-over', big);
        if (big) host.appendChild(ghost); else host.insertBefore(ghost, host.firstChild);
        const r = drag.other;
        ghost.style.left = Math.round(r.left) + 'px'; ghost.style.top = Math.round(r.top) + 'px';
        ghost.style.width = Math.round(r.width) + 'px'; ghost.style.height = Math.round(r.height) + 'px';
        void ghost.offsetWidth;   // commit the starting style so the fade-in runs
      }
      ghost.classList.add('on');
    }
    function dropGhost() { if (ghost) { ghost.remove(); ghost = null; } }

    function down(e) {
      if (drag || closing) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const el = e.currentTarget;
      const zone = el === edgeH ? 'h' : el === edgeV ? 'v' : 'c';
      e.preventDefault();
      e.stopPropagation();   // the scrim closes on a press that reaches it, and the editor listens on window
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      halt();
      const now = resting(card), b = box(card);
      drag = { id: e.pointerId, el: el, zone: zone, x0: e.clientX, y0: e.clientY, u: outward(zone), d: 0, far: 0, other: null };
      /* The corner OPPOSITE the one in hand stays put while the panel leans. transform-origin is in the card's
         own untransformed box, and the lean composes with popfrom's translate, so the origin carries that offset. */
      const ox = (corner === 'tl' ? now.left + now.width : now.left) - b.left;
      const oy = now.top + now.height - b.top;
      card.style.transformOrigin = Math.round(ox) + 'px ' + Math.round(oy) + 'px';
      card.classList.add('pb-dragging');
      document.documentElement.setAttribute('data-pb-cursor', zone === 'h' ? 'ns' : zone === 'v' ? 'ew' : (corner === 'tl' ? 'nwse' : 'nesw'));
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      drag.far = Math.max(drag.far, Math.hypot(dx, dy));
      drag.d = dx * drag.u.x + dy * drag.u.y;
      if (!still()) card.style.scale = String(1 + LEAN * Math.tanh(drag.d / 120));
      showGhost(big ? drag.d <= -COMMIT : drag.d >= COMMIT);
    }
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag, cancelled = e.type === 'pointercancel' || e.type === 'lostpointercapture';   // lost = the card went away mid-drag
      drag = null;
      try { d.el.releasePointerCapture(e.pointerId); } catch (err) {}
      card.classList.remove('pb-dragging');
      document.documentElement.removeAttribute('data-pb-cursor');
      dropGhost();
      const tap = !cancelled && d.zone === 'c' && d.far < TAP;
      const commit = !cancelled && (tap || (big ? d.d <= -COMMIT : d.d >= COMMIT));
      if (commit) setBig(!big, true);
      else settle();
    }
    /* Short of the commit point: spring back to exactly where it was. */
    function settle() {
      const s = parseFloat(card.style.scale) || 1;
      card.style.scale = '';
      if (Math.abs(s - 1) > 0.001 && !still() && card.animate) {
        const a = card.animate([{ scale: String(s) }, { scale: '1' }], { duration: 240, easing: 'cubic-bezier(.3, 1.5, .5, 1)' });
        running.push(a);
        a.onfinish = a.oncancel = function () { if (!drag) card.style.transformOrigin = ''; };
      } else card.style.transformOrigin = '';
    }
    /* Stop anything in flight at the state it was heading for. */
    function halt() {
      const r = running; running = [];
      r.forEach(a => { a.onfinish = a.oncancel = null; try { a.cancel(); } catch (e) {} });
      card.classList.remove('pb-morph');
      if (card._popTail) card._popTail.style.visibility = '';
      if (card._pbHoldLift) { card._pbHoldLift = false; if (typeof card._popPlace === 'function') card._popPlace(); }
    }

    function setBig(b, animate) {
      if (b === big || closing) return;
      const from = card.getBoundingClientRect();   // what is on screen now — lean, mid-animation and all
      halt();
      card.style.scale = '';
      card.style.transformOrigin = '';
      big = b;
      remember(key, b);
      const anim = animate && !still() && !!card.animate && laidOut(card) && from.width > 0;
      // shrinking: popfrom must not lift the button over the scrim until small has landed (it would show THROUGH the
      // big card for the whole shrink) — set before apply(), because apply() re-places the card at once
      card._pbHoldLift = anim && !b;
      apply(b);
      if (anim) morph(from);
    }

    /* THE SIZE CHANGE. Width and height really animate — the content reflows instead of being squashed, which a
       scale would do to his writing — and the card's position is carried by a translate from where it WAS to
       where it now rests. The card is flex-centred in its scrim, so its layout centre does not move while the
       width does, and the translate is simply "visual centre minus layout centre" at each end. */
    function morph(from) {
      const to = resting(card), b = box(card);
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const f = mid(from), t = mid(to);
      const dur = big ? 360 : 300;
      card.classList.add('pb-morph');
      const tail = card._popTail;
      if (tail) tail.style.visibility = 'hidden';   // the comic tail points at the button; it comes back when small lands
      const a = card.animate([
        { width: from.width + 'px', height: from.height + 'px', transform: 'translate(' + (f.x - cx) + 'px, ' + (f.y - cy) + 'px)' },
        { width: to.width + 'px', height: to.height + 'px', transform: 'translate(' + (t.x - cx) + 'px, ' + (t.y - cy) + 'px)' }
      ], { duration: dur, easing: big ? 'cubic-bezier(.2, .85, .25, 1.06)' : 'cubic-bezier(.35, .6, .2, 1)' });
      running.push(a);
      // the body dips while the frame changes, so a reflowing list is never what he watches
      parts().forEach(p => running.push(p.animate([{ opacity: 1 }, { opacity: 0, offset: 0.28 }, { opacity: 0, offset: 0.62 }, { opacity: 1 }], { duration: dur })));
      a.onfinish = function () {
        running = running.filter(x => x !== a);
        card.classList.remove('pb-morph');
        if (tail) tail.style.visibility = '';
        card._pbHoldLift = false;
        if (typeof card._popPlace === 'function') card._popPlace();
      };
    }

    /* CLOSING WHILE BIG — "shrinks down onto itself before closing … shrinking and then folding into the button".
       Two beats in one animation:
         1. it shrinks ONTO ITSELF: back to its small size, about its own centre, while its body fades;
         2. it FOLDS INTO THE BUTTON: tips back over the edge nearest the button, shrinks to the button and goes,
            and the button gives a small bump as it takes it.
       The scrim fades across both. Returns { finish } so a caller that has to reopen at once can end it now.
       Calls done() exactly once, whichever way it ends. */
    function fold(done) {
      let finished = false;
      const anims = [];
      function finish() {
        if (finished) return;
        finished = true;
        closing = null;
        try { done(); } catch (e) {}
        clearTimeout(lift);
        anims.forEach(a => { a.onfinish = null; try { a.cancel(); } catch (e) {} });
        card.classList.remove('pb-morph');
        card.style.transformOrigin = '';
      }
      let lift = 0;
      closing = { finish: finish };
      if (drag) { drag = null; card.classList.remove('pb-dragging'); document.documentElement.removeAttribute('data-pb-cursor'); dropGhost(); }
      halt();
      card.style.scale = '';
      if (still() || !card.animate || !laidOut(card)) { finish(); return null; }   // done() has already run

      const R = card.getBoundingClientRect();
      card.classList.remove('pb-big');
      const s = { w: card.offsetWidth, h: card.offsetHeight };   // the small size, measured the same tick
      card.classList.add('pb-big');
      const b = box(card), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const rc = mid(R);
      const base = 'translate(' + (rc.x - cx) + 'px, ' + (rc.y - cy) + 'px)';
      const btn = opts.button && opts.button();
      const br = laidOut(btn) ? btn.getBoundingClientRect() : null;
      const P1 = 210, P2 = 300, T = P1 + P2, k = P1 / T;
      card.classList.add('pb-morph');
      let end;
      if (br) {
        const bc = mid(br);
        const above = bc.y < rc.y;
        // it folds on the edge nearest the button, backwards into the screen
        card.style.transformOrigin = '50% ' + (above ? '0%' : '100%');
        const ey = rc.y + (above ? -s.h / 2 : s.h / 2);
        const sc = Math.max(0.05, Math.min(br.width / s.w, br.height / s.h) * 1.3);
        end = 'translate(' + (rc.x - cx + bc.x - rc.x) + 'px, ' + (rc.y - cy + bc.y - ey) + 'px) perspective(700px) rotateX(' + (above ? -72 : 72) + 'deg) scale(' + sc.toFixed(3) + ')';
      } else {
        end = base + ' perspective(700px) rotateX(0deg) scale(0.6)';   // no button on screen (opened from Home): it folds away where it is
      }
      const flat = base + ' perspective(700px) rotateX(0deg) scale(1)';
      const kf = [
        { offset: 0, width: R.width + 'px', height: R.height + 'px', transform: flat, opacity: 1, easing: 'cubic-bezier(.4, 0, .2, 1)' },
        { offset: k, width: s.w + 'px', height: s.h + 'px', transform: flat, opacity: 1, easing: 'cubic-bezier(.42, 0, .9, .75)' },
        { offset: 0.9, opacity: 1 },
        { offset: 1, width: s.w + 'px', height: s.h + 'px', transform: end, opacity: 0 }
      ];
      /* The second beat goes INTO the button, so on PC — where popfrom lifts the button over the scrim — the panel
         drops beneath it as that beat starts (a big panel otherwise sits above it, see styles.css). A keyframe, not
         a timer, so the drop is where the animation is, however it is played or scrubbed. */
      anims.push(card.animate(kf, { duration: T, fill: 'forwards' }));
      /* The second beat goes INTO the button. On PC popfrom lifts that button over the scrim while the panel is small
         and puts it back down while it is big (js/popfrom.js); it comes back up as the fold starts, so the panel
         slides in UNDER it rather than landing on top of it. */
      /* Only while popfrom still owns the button: if it has already torn down (the card went some other way), a late
         lift would leave the button floating over whatever opens next — which the design renders caught. */
      if (br && card.classList.contains('pop-card')) lift = setTimeout(function () { if (card.isConnected && card._popPlace) btn.classList.add('pop-src'); }, P1);
      parts().forEach(p => anims.push(p.animate([{ opacity: 1 }, { opacity: 0, offset: k * 0.7 }, { opacity: 0 }], { duration: T, fill: 'forwards' })));
      const host = card.parentElement;
      if (host) {
        const bg = getComputedStyle(host).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') anims.push(host.animate([{ backgroundColor: bg }, { backgroundColor: 'rgba(0, 0, 0, 0)' }], { duration: T, easing: 'ease-in', fill: 'forwards' }));
      }
      if (br) anims.push(btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: 300, delay: T - 110, easing: 'ease-out' }));
      anims[0].onfinish = finish;
      return closing;
    }

    function key_(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();   // Space is play/pause in the editor
      setBig(!big, true);
    }

    [grip, edgeH, edgeV].forEach(el => {
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', function (e) { if (drag && e.pointerId === drag.id) up(e); });
    });
    grip.addEventListener('keydown', key_);
    grip.addEventListener('click', function (e) { e.stopPropagation(); });   // the tap was handled on pointerup
    window.addEventListener('resize', refresh);

    apply(big);
    refresh();

    const ctl = card._panelSize = {
      grip: grip,
      isBig: function () { return big; },
      setBig: function (b, animate) { setBig(!!b, animate !== false); },
      /* The remembered size, re-read — the shortcuts card lives for the whole session and is only shown and hidden. */
      sync: function () { const r = remembered(key); if (r !== big) { halt(); big = r; apply(r); } refresh(); },
      refresh: refresh,
      fold: fold,
      isClosing: function () { return !!closing; },
      detach: function () { window.removeEventListener('resize', refresh); halt(); dropGhost(); }
    };
    return ctl;   // also on the card as `_panelSize`, for the suite and the design renders
  }

  FM.panelSize = {
    attach: attach,
    isBig: remembered,
    STORE: STORE,
    COMMIT: COMMIT,
    _reduce: false
  };
})();
