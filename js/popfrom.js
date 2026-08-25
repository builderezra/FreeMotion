/* popfrom.js — menus that open OUT of the button that opened them (queue 548).
 *
 * Ezra, 25 Aug, with a PC screenshot of the four buttons at the right of the transport row boxed in red:
 *   "for all these buttons i want their respective menus to pop out from the button like the settings cog
 *    one does but also i want a nice animation for all of them opening up not just it spawning and i want
 *    it to be like how comics have the line around the text box directing it to where its coming from, so
 *    like the ui for each menu actually has each button attached to it so you see where its coming from,
 *    also it would be cool if the note pad one had a unique animation that fit it"
 *
 * MEASURED FIRST, and the entry's guess was right — this is ONE mechanism, not four. At v12.72:
 *   ?  keyboard shortcuts  card at 500,63    dead centre   no animation
 *   📒 project notes       card renders 0x0  (dynamic)     no animation
 *   ⚙️  canvas settings     card at 1076,438  under the cog  cv-grow 160ms   ← the model
 *   ⬆️  export             card at 555,249   dead centre   no animation
 * The cog already did all of this, in CSS written only for `#canvas-dialog .export-card`, with its own
 * `--cv-anchor-*` variables. So this generalises the IDEA for the other three rather than adding three
 * more one-offs. The cog itself keeps its own placement and takes only the tail (`placed: true`) — its
 * behaviour is pinned by two suite tests and he is not asking for it to move, so re-deriving it here
 * would risk something he can see to make the code tidier, which is the wrong trade.
 *
 * ⚠️ DESKTOP ONLY, on purpose, and it is the same gate the cog already used (`min-width: 701px`). On a
 * phone these dialogs are full-width sheets and "pops out of a 34px button" is not a thing you want —
 * the card would be the whole screen with a tail pointing at nothing. His screenshot is a PC one and his
 * words are about the transport row, which on mobile is a different layout entirely.
 */
(function () {
  'use strict';
  const FM = window.FM = window.FM || {};

  const DESKTOP = '(min-width: 701px)';
  const GAP = 10;          // space between the button and the card, where the tail lives
  const EDGE = 12;         // never let a card touch the viewport edge
  const TAIL = 11;         // half-width of the tail triangle

  function isDesktop() { return window.matchMedia(DESKTOP).matches; }

  /* Place `card` so it reads as coming out of `btn`, and give it a comic tail pointing back.
   * Returns a cleanup function — callers MUST call it on close, or the next open inherits a stale
   * position (the card keeps `position: fixed` and the button keeps its lift above the scrim).
   * A no-op on mobile, and it says so by returning a cleanup that undoes nothing. */
  /* ⚠️ A CARD MUST BE RE-PLACED WHEN IT CHANGES SIZE, and this is not defensive coding — it is the
     bug I shipped first. Measured: the export card is 346px tall when it opens and 403px a moment
     later, because its resolution list is rebuilt after the dialog is shown. Placed once, it was put
     10px above the button at its OLD height and then grew straight back down over it (gap -46px). The
     cog was worse: its tail variable came out at -17px, computed against a card rect that no longer
     existed, so the tail sat 329px away from the button it was meant to point at.
     So placement is a function that re-runs — on resize, and on a ResizeObserver over the card. That is
     the same pattern `placeSheet`/`watchSheet` already use for the effects sheet (queue 528), for the
     same reason. */
  FM.popFrom = function (card, btn, opts) {
    opts = opts || {};
    if (!card || !btn || !isDesktop()) return function () {};
    if (!(btn.getBoundingClientRect().width > 0)) return function () {};

    /* ⚠️ THE TAIL IS A SIBLING IN <body>, NOT A CHILD OF THE CARD — and the suite caught me shipping
       the child version. A tail at `top: 100%` sits below the card's content box, and inside a card
       with `overflow-y: auto` that COUNTS TOWARD SCROLL HEIGHT: the canvas settings test went red with
       "it needs 402px and has 391px", and the 11px is exactly the tail. The same arrangement would also
       have let the tail scroll away inside the card it is supposed to be attached to.
       Positioned in viewport coordinates instead, so it cannot touch any card's layout or scrolling. */
    let done = false;   // declared up here because the retry loop below runs immediately and reads it

    const tail = document.createElement('span');
    tail.className = 'pop-tail';
    tail.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tail);
    card._popTail = tail;
    card.classList.add('pop-card');
    if (opts.placed) card.classList.add('pop-tailed');
    if (opts.flavour) card.classList.add('pop-' + opts.flavour);
    btn.classList.add('pop-src');


    /* ⚠️ THE TAIL TAKES THE CARD'S OWN COLOURS, read at runtime. Hard-coding `--panel`/`--line` is
       right for three of these four and WRONG for the notepad, which is deliberately paper — a white
       card with a dark tail hanging off it, which is what the first version drew. There is no CSS way
       to say "my parent's background", so it is copied here. The border falls back to the fill when the
       card has no border, so a borderless card gets a plain tail rather than one outlined in its own
       text colour. */
    function paint() {
      const cs = getComputedStyle(card);
      const fill = cs.backgroundColor;
      const bw = parseFloat(cs.borderTopWidth) || 0;
      const line = bw > 0 ? cs.borderTopColor : fill;
      if (fill && fill !== 'rgba(0, 0, 0, 0)') tail.style.setProperty('--pop-tail-fill', fill);
      tail.style.setProperty('--pop-tail-line', line);
    }

    /* Returns false when there is nothing to measure yet — see the retry below. */
    function place() {
      const br = btn.getBoundingClientRect();
      if (!(br.width > 0)) return false;
      paint();
      const bcx = br.left + br.width / 2;

      if (opts.placed) {
        // Decorate only — the card owns its own position; just aim the tail at the button.
        const op0 = card.offsetParent || document.body, opr0 = op0.getBoundingClientRect();
        const cr0 = { left: opr0.left + card.offsetLeft, top: opr0.top + card.offsetTop,
                      width: card.offsetWidth, height: card.offsetHeight };
        if (!(cr0.width > 0)) return false;
        const up0 = (cr0.top + cr0.height / 2) < br.top;
        card.classList.toggle('pop-up', up0);
        card.classList.toggle('pop-down', !up0);
        aimTail(cr0, up0, bcx);
        return true;
      }

      /* ⚠️ POSITIONED BY **TRANSFORM**, NOT BY `position: fixed` — and this is the third approach,
         because the first two both fought the cards' own layout instead of leaving it alone.
         These cards live in flex-centred scrims. Taking one out of that flow to place it changes its
         SIZE: the export card measures 367px tall parked at 0,0 and 403px where it lands, so placing it
         from 367 put it 10px above the button and it then rendered 36px taller, back over the button.
         Pinning the measured width instead made it worse — the notepad's scrim stretches its card, so
         "natural width" read 1150px and the card came out full-screen.
         A transform moves a box without touching layout at all, so the card keeps exactly the size and
         shape its own stylesheet gives it and this code only ever says WHERE. The offset is two custom
         properties, and the keyframes compose them, so the opening animation and the placement do not
         fight over the same property. */
      /* ⚠️ MEASURED WITHOUT THE TRANSFORM, via offset*. `getBoundingClientRect` reports the box AFTER
         transforms, and this card is mid-animation the first time we re-place it — scale(.86) makes it
         read 14% small, and the offset computed from that put every card 6px out with its tail up to
         63px off the button. `offsetWidth/offsetHeight` are layout values that transforms cannot touch,
         and `offsetLeft/offsetTop` against the offset parent give the untransformed origin. */
      card.style.maxHeight = ''; card.style.overflowY = '';
      const natural = function () {
        const op = card.offsetParent || document.body;
        const opr = op.getBoundingClientRect();
        return { left: opr.left + card.offsetLeft, top: opr.top + card.offsetTop,
                 width: card.offsetWidth, height: card.offsetHeight };
      };
      let cr = natural();
      if (!(cr.width > 0)) return false;

      const roomAbove = br.top - EDGE - GAP;
      const roomBelow = window.innerHeight - br.bottom - EDGE - GAP;
      /* WHICHEVER SIDE HAS ROOM — the cog's rule, for the cog's reason: the transport row is low in one
         desktop layout and near the top in the other, so "always upward" is the old bug mirrored.
         Upward wins ties, because that is the arrangement he asked for. */
      const up = (cr.height <= roomAbove) || (roomAbove >= roomBelow);
      const room = up ? roomAbove : roomBelow;

      // Too tall for its side? Cap it and let it scroll inside itself, then RE-MEASURE — capping
      // changes the height, and every number below depends on it.
      if (cr.height > room) {
        card.style.maxHeight = Math.max(140, room) + 'px';
        card.style.overflowY = 'auto';
        cr = natural();
      }

      const cw = cr.width, ch = cr.height;
      const top = up ? (br.top - GAP - ch) : (br.bottom + GAP);
      let left = Math.round(bcx - cw / 2);
      if (left + cw > window.innerWidth - EDGE) left = window.innerWidth - EDGE - cw;
      if (left < EDGE) left = EDGE;

      card.style.setProperty('--pop-dx', Math.round(left - cr.left) + 'px');
      card.style.setProperty('--pop-dy', Math.round(top - cr.top) + 'px');
      card.classList.toggle('pop-up', up);
      card.classList.toggle('pop-down', !up);
      aimTail({ left: left, top: top, width: cw, height: ch }, up, bcx);
      return true;
    }

    /* Aimed from the BUTTON's real centre, then clamped to the card's own edge — so a card pushed
       sideways by the viewport still has its tail over the button that opened it, and the tail never
       hangs off the corner of the card it belongs to. */
    function aimTail(rect, up, bcx) {
      const x = Math.min(Math.max(bcx, rect.left + TAIL + 6), rect.left + rect.width - TAIL - 6);
      tail.style.left = Math.round(x - TAIL) + 'px';
      tail.style.top = Math.round(up ? (rect.top + rect.height) : (rect.top - TAIL)) + 'px';
      tail.classList.toggle('pop-tail-up', up);
      tail.classList.toggle('pop-tail-down', !up);
    }

    /* ⚠️ RETRY UNTIL IT LANDS. A card that is still `display: none` when popFrom is called has no size,
       so there is nothing to measure and placing it is a no-op — and the cog hits exactly that: its
       dialog is un-hidden in the same tick that anchors it, so the first attempt (and the frame after)
       both found `offsetWidth: 0` and bailed. The tail then sat at the document origin, 1314px from the
       button, until something incidental re-placed it. Retrying for a few frames costs nothing and
       removes the ordering dependency entirely. */
    /* ⚠️ setTimeout, NOT requestAnimationFrame — measured, and it is LOOP.md rule 11 in a new place.
       rAF does not fire at all in a browser tab that is not fronted: a control loop here returned zero
       frames in 500ms and hung. An rAF-based retry therefore never runs in a background tab, which is
       precisely where a menu might be opened by a restored session or a script. setTimeout is throttled
       there, not frozen, and a few throttled attempts still land. */
    let tries = 0;
    (function attempt() {
      if (done) return;
      if (place() || ++tries > 12) return;
      setTimeout(attempt, 16);
    })();

    const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(place) : null;
    if (ro) ro.observe(card);
    window.addEventListener('resize', place);

    /* ⚠️ CLEAN UP WHEN THE CARD GOES, WHOEVER CLOSED IT. Hooking each close path is how the first
       version leaked: Escape closes the shortcuts overlay, the export dialog and the cog by three
       different routes, and after all three the button was still lifted above the scrim and the card
       still carried `position: fixed`. A future close path would inherit that bug silently.
       So teardown is driven by the card ITSELF disappearing, which every close path necessarily does.
       The poll only runs while a menu is open and stops the moment one is not. */
    /* Same reason as the retry above: a background tab gets no rAF at all, and a teardown that only
       runs when the tab is fronted is not a safety net. 120ms is far below anything a person notices
       and costs nothing while no menu is open. */
    let poll = 0;
    function visible() { return card.isConnected && card.getClientRects().length > 0; }
    function watch() {
      poll = 0;
      if (done) return;
      if (!visible()) { cleanup(); return; }
      poll = setTimeout(watch, 120);
    }
    poll = setTimeout(watch, 120);

    function cleanup() {
      if (done) return;
      done = true;
      if (poll) clearTimeout(poll);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', place);
      btn.classList.remove('pop-src');
      card.classList.remove('pop-card', 'pop-tailed', 'pop-up', 'pop-down');
      if (opts.flavour) card.classList.remove('pop-' + opts.flavour);
      if (!opts.placed) {
        card.style.removeProperty('--pop-dx'); card.style.removeProperty('--pop-dy');
        card.style.maxHeight = ''; card.style.overflowY = '';
      }
      delete card._popTail;
      if (tail.parentNode) tail.parentNode.removeChild(tail);
    }
    return cleanup;
  };

  // Suite seam: the placement is geometry, and geometry is the thing worth asserting.
  FM._popGeom = function (card, btn) {
    const cr = card.getBoundingClientRect(), br = btn.getBoundingClientRect();
    const tail = card._popTail || null;
    const tr = tail ? tail.getBoundingClientRect() : null;
    return {
      up: card.classList.contains('pop-up'),
      gap: card.classList.contains('pop-up') ? Math.round(br.top - cr.bottom) : Math.round(cr.top - br.bottom),
      cardCx: Math.round(cr.left + cr.width / 2),
      btnCx: Math.round(br.left + br.width / 2),
      tailCx: tr ? Math.round(tr.left + tr.width / 2) : null,
      hasTail: !!tail
    };
  };
})();
