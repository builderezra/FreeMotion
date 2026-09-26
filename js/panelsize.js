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

  /* THE GRIP'S MARK — the arc (queue 927). Three looks were carried while he chose; he picked A, 26 Sep (*"3 - a"*), and the
     grip lines and the expand chip were deleted with the choice. */
  const MARKS =
    '<svg class="pb-mark pb-arc" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 21.5V10a7.5 7.5 0 0 1 7.5-7.5h11.5"/></svg>';

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
    /* THE FRAME, for a mouse (he: "grab the edges again and drag it back in"). Thin strips on every edge and small
       squares on every corner, each with its own resize cursor. Which of them are live is the stylesheet's call:
       SMALL, only the two edges beside the grip (the other two face the button and the screen edge); BIG, all of
       them, because a centred window can be taken back in from any side — the bottom-right included, where a
       desktop hand goes first. `.pb-edge-h` / `.pb-edge-v` are the top edge and the grip-side edge. */
    const handles = ['n', 'w', 'e', 's', 'nw', 'ne', 'sw', 'se'].map(function (z) {
      const d = document.createElement('div');
      d.className = 'pb-edge pb-z-' + z + (z === 'n' || z === 's' ? ' pb-edge-h' : z === 'w' || z === 'e' ? ' pb-edge-v' : ' pb-edge-c');
      d.setAttribute('data-zone', z);
      d.setAttribute('aria-hidden', 'true');
      return d;
    });
    card.classList.add('pb-card');
    card.append.apply(card, handles.concat([grip]));

    function parts() { try { return (opts.parts ? opts.parts() : []).filter(Boolean); } catch (e) { return []; } }

    function apply(b) {
      card.classList.toggle('pb-big', b);
      // the scrim knows too: on a phone BIG is the whole screen, and the top bar's lit Export button would otherwise
      // glow through in the margin right beside the grip (a second corner) — styles.css darkens it
      if (card.parentElement) card.parentElement.classList.toggle('pb-host-big', b);
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

    /* Each handle's way OUT of the card, as a unit vector: pulling along it grows, pushing against it shrinks. */
    const OUT = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0], nw: [-1, -1], ne: [1, -1], sw: [-1, 1], se: [1, 1] };
    function outward(zone) {
      const v = OUT[zone], k = v[0] && v[1] ? Math.SQRT1_2 : 1;
      return { x: v[0] * k, y: v[1] * k };
    }
    function cursorOf(zone) {
      return zone === 'n' || zone === 's' ? 'ns' : zone === 'w' || zone === 'e' ? 'ew' : (zone === 'nw' || zone === 'se') ? 'nwse' : 'nesw';
    }
    /* THE LEAN STAYS ON SCREEN. It scales about the side opposite the hand, so on a phone — where the small card
       already runs nearly edge to edge — a full lean would push the grip off the glass under the finger. This is the
       most it may grow before any edge comes within 4px of the screen's. */
    function leanRoom(r, ox, oy) {
      const M = 4, W = window.innerWidth, H = window.innerHeight;
      function cap(edge, o, lo, hi) { const d = edge - o; if (d < -0.5) return (lo - o) / d; if (d > 0.5) return (hi - o) / d; return Infinity; }
      const s = Math.min(1 + LEAN, cap(r.left, ox, M, W - M), cap(r.left + r.width, ox, M, W - M), cap(r.top, oy, M, H - M), cap(r.top + r.height, oy, M, H - M));
      return Math.max(0, s - 1);
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
      const zone = el === grip ? (corner === 'tl' ? 'nw' : 'ne') : el.getAttribute('data-zone');
      e.preventDefault();
      e.stopPropagation();   // the scrim closes on a press that reaches it, and the editor listens on window
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      halt();
      const now = resting(card), b = box(card);
      /* The side OPPOSITE the one in hand stays put while the panel leans. transform-origin is in the card's own
         untransformed box, and the lean composes with popfrom's translate, so the origin carries that offset. */
      const v = OUT[zone];
      const Ox = v[0] < 0 ? now.left + now.width : v[0] > 0 ? now.left : now.left + now.width / 2;
      const Oy = v[1] < 0 ? now.top + now.height : v[1] > 0 ? now.top : now.top + now.height / 2;
      drag = { id: e.pointerId, el: el, zone: zone, x0: e.clientX, y0: e.clientY, u: outward(zone), d: 0, far: 0, other: null, room: leanRoom(now, Ox, Oy) };
      card.style.transformOrigin = Math.round(Ox - b.left) + 'px ' + Math.round(Oy - b.top) + 'px';
      card.classList.add('pb-dragging');
      document.documentElement.setAttribute('data-pb-cursor', cursorOf(zone));
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      drag.far = Math.max(drag.far, Math.hypot(dx, dy));
      drag.d = dx * drag.u.x + dy * drag.u.y;
      if (!still()) { const t = Math.tanh(drag.d / 120); card.style.scale = String(1 + (t > 0 ? drag.room : LEAN) * t); }
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
      const tap = !cancelled && d.el === grip && d.far < TAP;
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
      /* The writing DIMS while the frame changes size — it re-wraps to the new width as it goes, and at full strength
         that reads as lines hopping about. Dimmed, not blanked: an empty slab the size of the screen read as a glitch
         in the design review, and it should always look like his notes. */
      parts().forEach(p => running.push(p.animate([{ opacity: 1 }, { opacity: 0.42, offset: 0.3 }, { opacity: 0.42, offset: 0.62 }, { opacity: 1 }], { duration: dur })));
      a.onfinish = function () {
        running = running.filter(x => x !== a);
        card.classList.remove('pb-morph');
        if (tail) tail.style.visibility = '';
        card._pbHoldLift = false;
        if (typeof card._popPlace === 'function') card._popPlace();
      };
    }

    /* CLOSING WHILE BIG — "shrinks down onto itself before closing … shrinking and then folding into the button".
       Two beats in one animation, all of it TRANSFORM, so his writing stays on the card the whole way and nothing
       re-lays-out (a width/height animation reflows every frame, which an iPhone feels):
         1. it shrinks ONTO ITSELF: uniformly, about its own centre, to about the size small would be — never less
            than a fifth smaller, so on a phone (where small is nearly as wide as big) it still visibly shrinks;
         2. it FOLDS INTO THE BUTTON: tips back over the edge nearest the button while that edge travels to the
            button and the card shrinks to its size, fading only in the last moment, once it is there. The button
            gives a small bump as it takes it.
       The scrim fades across both. Returns { finish } so a caller that has to reopen at once can end it now.
       Calls done() exactly once, whichever way it ends. */
    function fold(done) {
      let finished = false, bump = null;
      const anims = [];
      function finish(natural) {
        if (finished) return;
        finished = true;
        closing = null;
        try { done(); } catch (e) {}
        clearTimeout(lift);
        anims.forEach(a => { a.onfinish = null; try { a.cancel(); } catch (e) {} });
        // the button's bump outlives the card on purpose — it is the moment the button takes it — unless the fold
        // was cut short (reopened mid-way), when a bump would celebrate a close that did not happen
        if (bump && natural !== true) { try { bump.cancel(); } catch (e) {} }
        card.classList.remove('pb-morph');
        card.style.transformOrigin = '';
      }
      let lift = 0;
      closing = { finish: function () { finish(false); } };
      if (drag) { drag = null; card.classList.remove('pb-dragging'); document.documentElement.removeAttribute('data-pb-cursor'); dropGhost(); }
      halt();
      card.style.scale = '';
      if (still() || !card.animate || !laidOut(card)) { finish(false); return null; }   // done() has already run

      const R = card.getBoundingClientRect();
      card.classList.remove('pb-big');
      const s = { w: card.offsetWidth, h: card.offsetHeight };   // the small size, measured the same tick
      card.classList.add('pb-big');
      const b = box(card), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const rc = mid(R);
      const bx = rc.x - cx, by = rc.y - cy;   // where it is drawn, against where it is laid out (0 unless it was moving)
      const S1 = Math.max(0.2, Math.min(0.8, s.w / b.width, s.h / b.height));
      const btn = opts.button && opts.button();
      const br = laidOut(btn) ? btn.getBoundingClientRect() : null;
      const P1 = 200, P2 = 320, T = P1 + P2, k = P1 / T;
      card.classList.add('pb-morph');
      card.style.transformOrigin = '50% 50%';
      /* One transform list for every keyframe, so the browser interpolates it piece by piece:
           translate(where) · translateY(E) · perspective · rotateX(tip) · scale(S2) · translateY(−E) · scale(S1)
         scale(S1) is beat 1, about the centre. The rest is beat 2, about the shrunk card's EDGE (E from the centre):
         the tip and the shrink-to-the-button both pivot on that edge, and `where` carries the edge onto the button.
         With no tip and S2 = 1 the two translateYs cancel, so beat 1 is exactly a shrink about the centre. */
      function tf(tx, ty, E, tip, S2, s1) {
        return 'translate(' + tx.toFixed(2) + 'px, ' + ty.toFixed(2) + 'px) translateY(' + E.toFixed(2) + 'px) perspective(700px) rotateX(' + tip + 'deg) scale(' + S2.toFixed(4) + ') translateY(' + (-E).toFixed(2) + 'px) scale(' + s1.toFixed(4) + ')';
      }
      let E = 0, end, S2 = 1;
      if (br) {
        const bc = mid(br);
        const below = bc.y > rc.y;   // PC: the button is below the panel; phone: above it, in the top bar
        E = (below ? 1 : -1) * S1 * b.height / 2;
        S2 = Math.max(0.03, Math.min(br.width / (S1 * b.width), br.height / (S1 * b.height)) * 1.3);
        end = tf(bc.x - cx, bc.y - cy - E, E, below ? 72 : -72, S2, S1);
      } else {
        end = tf(bx, by, 0, 0, 0.6, S1);   // no button on screen (opened from Home): it shrinks on and fades where it is
      }
      const kf = [
        { offset: 0, transform: tf(bx, by, E, 0, 1, 1), opacity: 1, easing: 'cubic-bezier(.4, 0, .2, 1)' },
        { offset: k, transform: tf(bx, by, E, 0, 1, S1), opacity: 1, easing: 'cubic-bezier(.5, 0, .3, 1)' },
        { offset: k + (1 - k) * 0.78, opacity: 1 },
        { offset: 1, transform: end, opacity: 0 }
      ];
      anims.push(card.animate(kf, { duration: T, fill: 'forwards' }));
      /* The second beat goes INTO the button. On PC popfrom lifts that button over the scrim while the panel is small
         and puts it back down while it is big (js/popfrom.js); it comes back up as the fold starts, so the panel
         slides in UNDER it rather than landing on top of it.
         Only while popfrom still owns the button: if it has already torn down (the card went some other way), a late
         lift would leave the button floating over whatever opens next — which the design renders caught. */
      if (br && card.classList.contains('pop-card')) lift = setTimeout(function () { if (card.isConnected && card._popPlace) btn.classList.add('pop-src'); }, P1);
      const host = card.parentElement;
      if (host) {
        const bg = getComputedStyle(host).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') anims.push(host.animate([{ backgroundColor: bg }, { backgroundColor: 'rgba(0, 0, 0, 0)' }], { duration: T, easing: 'ease-in', fill: 'forwards' }));
      }
      // the bump starts as the card reaches the button (about 85% of the way through the second beat)
      if (br) bump = btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 300, delay: Math.round(P1 + P2 * 0.85), easing: 'ease-out' });
      anims[0].onfinish = function () { finish(true); };
      return closing;
    }

    function key_(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();   // Space is play/pause in the editor
      setBig(!big, true);
    }

    handles.concat([grip]).forEach(el => {
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
