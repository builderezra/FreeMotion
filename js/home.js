/* FreeMotion — Home screen (AM-style project browser).
 * Full-screen overlay above the editor: all projects at a glance (thumbnail cards), plus a
 * Templates tab. Backed by FM.projects / FM.templates (storage.js). The editor stays mounted
 * underneath — opening a project just swaps the scene and hides this overlay.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  /* ---------- THE TRAVELLING EDGE-LIGHT, built and FITTED in one place -------------------------
   * Ezra, originally: "make it so the project that's open, along the border of it has a moving glint
   * that follows around it" (queue ~110), then the same light on the open add-menu tab (queue 155) and
   * on the sound-effects and record-voice sheets (queue 291). Four hosts, one signature — the CSS has
   * carried a note for three releases about what happens when surfaces meant to feel identical each get
   * their own copy, and all four still hand-built the same two elements.
   *
   * QUEUE 304 IS WHAT "FITTED" MEANS, and it is why this is a function rather than four copies of two
   * lines. His words: *"The circle that moves around the sound effects menu stops halfway and like
   * glitches a little bit"*, and *"It also kind of glitches out on the record voice menu"*.
   *
   * The light is one bright wedge of a conic gradient painted on a box that SPINS behind a ring-shaped
   * mask. For the light to reach every part of the ring, that box has to still cover the host at every
   * angle — so it must be a SQUARE at least as big as the host's diagonal. It was sized at 140% of the
   * host on each axis, which covers a card and stops covering anything tall the moment it turns.
   * Measured on the sound-effects sheet at 390x800: card 354x688, comet box 496x963, and the ring needs
   * 774 of diagonal — at 90° the box fell 96px short, so for a stretch of every single turn the light
   * had nowhere to be at the top and bottom. That is the "stops halfway".
   * There was a second fault stacked on it, from the same override: the box was centred with
   * `margin-top: -70%`, and PERCENTAGE MARGINS ALL RESOLVE AGAINST WIDTH — top and bottom included. On
   * a 354-wide, 963-tall box that is -248px where half the height is 481, so the comet was orbiting a
   * point 233px above the middle of the card. Both are gone: the size is measured here, and the
   * centring is a transform, which cannot be fooled by an aspect ratio.
   *
   * 1.5 rather than the exact diagonal because √2 ≈ 1.415 is the worst case and a little margin costs
   * nothing — the box is masked down to a 1.5px ring either way.
   * A ResizeObserver rather than a one-shot measurement because the host is usually NOT in the document
   * yet when its ring is built (the sheets append the ring to a detached card), so the first read is
   * 0x0; the observer is what makes the number arrive at all, and it keeps it right if the window is
   * resized while the sheet is open. Where there is no observer the CSS falls back to what it did
   * before, which is correct for the card-shaped hosts and no worse for the others.
   */
  FM.glintRing = function (host, cls) {
    if (!host) return null;
    const g = document.createElement('span');
    g.className = cls;
    g.setAttribute('aria-hidden', 'true');   // decoration: the OPEN badge / .active carry this for a reader
    g.appendChild(document.createElement('i'));
    host.appendChild(g);
    const fit = () => {
      const r = host.getBoundingClientRect();
      const d = Math.ceil(Math.max(r.width, r.height) * 1.5);
      if (d > 0) g.style.setProperty('--glint-d', d + 'px');
    };
    fit();
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(fit);
      ro.observe(host);
      g._fmGlintRO = ro;    // held on the ring, so it is collected with it when the host goes
    }
    return g;
  };

  let root = null, grid = null, tab = 'projects';
  let selectMode = false;                 // multi-select for bulk delete / duplicate (projects tab only)
  const selected = new Set();             // ids ticked while in select mode
  let query = '';                         // live search text ('' = not searching)

  /* ---------- home → project PUSH ---------------------------------------------------------------
   * Ezra: "when you tap on a project the project that you tapped on swipes to the left and then the
   * project actual screen comes in by swiping from the right."
   *
   * Five moving parts, all of them CSS (see the fm-push block in styles.css) — this file only
   * stamps and unstamps classes:
   *   .fm-card-press  on pointerdown, synchronously, so the card answers the finger on that frame
   *   .fm-intro-cut   on a card tapped mid-entrance: the entrance is dropped so the press can be seen
   *   .fm-card-lead   on the tapped card: it leaves ahead of its own screen
   *   .fm-lead-cold   + on a lead whose press was never painted, so it leads from rest, not from .965
   *   .fm-push-out / .fm-push-in  on #home-screen / #app: the two screens crossing
   *
   * The press is the whole hand-off and it is the part that has been wrong every round. An open is async —
   * the media has to decode — so between the finger lifting and the push starting there can be a
   * second or more with nothing else moving, and the press is the only thing telling the user their
   * tap landed. So it has an OWNER (pressHeld) for the length of that wait, and the push starts the
   * lead from wherever the press actually left it (pressPainted). Every path that gives the press up
   * without handing it to a push eases it back rather than snapping.
   *
   * The push is armed only by the paths that actually LAND YOU IN A PROJECT. Every other caller of
   * close() (text-edit's guard, settings' import, the test harnesses) gets the old instant close,
   * unchanged, because they are not a screen transition and several of them measure the editor on
   * the very next line.
   *
   * TEARDOWN IS NOT OPTIONAL. #app carries a transform for the length of the push, and a transform
   * makes an element the containing block for every position:fixed descendant — leave it on and the
   * editor's sheets, FAB and menus are re-rooted to #app forever. endPush() therefore runs from
   * animationend AND from a timer backstop AND from open(), and it always strips both.
   */
  /* Ezra: "I need the animation for when you open a project to be a bit slower". 280 -> 380.
     Published to CSS as --fm-push-ms just below, so the stylesheet's durations and this constant
     cannot drift apart — this number also drives the backstop timer, and a backstop that fires before
     the animation it guards leaves a stranded transform on #app. */
  const PUSH_MS = 380;
  // The two long waits, in one mutable object rather than as consts, so the regression suite can
  // drive the abandon path without sleeping for eight seconds. Nothing in the app writes to it.
  //   release — a finger lifted off a card that then opened nothing (see releasePress)
  //   stuck   — an open that never settled at all (see holdPress and openAbandoned)
  const WAIT = { release: 600, stuck: 8000 };
  let pushTimer = 0, pushLead = null, pressEl = null, pressTimer = 0, closing = false;
  // The waiting phase's own backstop (queue 128) — see startPush. It replaces the press backstop on
  // the split path: the press is handed to the push on the tap, so an open that never settles no
  // longer strands a pressed card, it strands the whole transition.
  let waitTimer = 0;
  // Deferred card-thumbnail capture — see the note in open(). (queue 128)
  let thumbTimer = 0, thumbIdle = 0;
  /* True for the whole of a two-phase push. #home-screen is the honest end-of-push signal for a
   * one-shot push because both motion modes animate it — but when the editor waits for a load, home
   * finishes FIRST and its animationend would end the push with the editor barely into its entrance.
   * On this path the arriving editor owns the ending instead (onAppPushEnd). (queue 128) */
  let splitRun = false;
  // Who owns the press, and has it actually been seen. Both are load-bearing:
  //   pressHeld    — an async open (project / template / element) has taken the press for the length
  //                  of its wait. While it is set NOTHING else may move or drop the press: not a
  //                  second tap on the same card, not a tap on a different card, not the release
  //                  timer. Before this existed a second tap threw the press away and the push then
  //                  snapped the card back to scale(.965) in one frame (numbers on openProject).
  //   pressPainted — has the pressed card been on screen for a whole frame? Only then can the push
  //                  start the lead from the pressed scale. A keyboard Enter, or a tap whose open
  //                  finishes inside the same task, never paints the press, and starting the lead
  //                  from .965 in that case is a pop in the other direction (see startPush).
  let pressHeld = false, pressPainted = false;
  // Declared up here rather than beside openProject because setPress reads it: a second card tapped
  // while the first is still opening must not steal the press even before holdPress has run.
  let _opening = false, _openingAt = 0;
  // …and a way OUT of it. `_opening` is cleared in openProject's `finally`, which means it is never
  // cleared at all if FM.projects.open()'s promise simply never settles — a decode that hangs, a
  // rejected media permission that leaves a dangling await. Before this, that stranded the whole home
  // screen for the rest of the session: setPress returned early on `_opening` forever, so NO card
  // ever showed a press again, on any tab, and every tap was silently dropped. Past WAIT.stuck the
  // press backstop has already eased the card off and nothing on screen is holding the wait, so the
  // open is treated as abandoned: presses answer again and a fresh tap is allowed to try. Inside the
  // window the guard is exactly as it was — two overlapping open() loads leaked media and raced
  // refreshAll, which is the whole reason it exists.
  function openAbandoned() { return _opening && (Date.now() - _openingAt) > WAIT.stuck; }

  // ease=true lets the card glide back to rest (see .fm-card-unpress) instead of snapping. Used by
  // every path that gives the press up WITHOUT handing it to a push; the hand-off itself is instant,
  // because fm-push-lead takes the transform over on that same frame.
  function clearPress(ease) {
    clearTimeout(pressTimer); pressTimer = 0;
    pressHeld = false; pressPainted = false;
    const card = pressEl; pressEl = null;
    if (!card) return;
    card.classList.remove('fm-card-press');
    if (!ease) { card.classList.remove('fm-card-unpress'); return; }
    card.classList.add('fm-card-unpress');
    setTimeout(() => card.classList.remove('fm-card-unpress'), 260);
  }
  // A CARD YOU HAVE YOUR FINGER ON IS NO LONGER ENTERING. The once-per-session entry stagger
  // (stampIntro, below) runs @keyframes hm-rise, which animates TRANSFORM — and a running animation
  // always beats a plain declaration, so for as long as it plays `.hm-card.fm-card-press { transform:
  // scale(.965) }` does literally nothing. Measured on a real cold launch at 380x800 — splash played,
  // dismissed by tapping it, Input.dispatchTouchEvent, per-frame computed style, top level: press
  // class on at 79.5ms and the card sat at scale 1.0000 for 14 consecutive frames / 232ms, then the
  // push arrived at 311.5ms and jumped it 1.0000 → 0.9650 in ONE frame. With a slower open the press
  // stayed invisible for 34 frames / 533ms and then popped on its own the instant hm-rise ended.
  // Two animations fighting over one property cannot be arbitrated, so the entrance is DROPPED on
  // this card instead: removing .hm-in cancels it, nothing fills forwards, and the card lands exactly
  // where the entrance was taking it. Only its OPACITY is eased on the way (see .fm-intro-cut) — a
  // card caught at 8% would otherwise flash to solid on the same frame. The transform deliberately
  // does NOT ease: the press is answering a finger and has to land on that frame.
  function cutIntro(card) {
    if (!card.classList.contains('hm-in') && !card.classList.contains('hm-in-fab')) return;
    card.style.setProperty('--cut-from', getComputedStyle(card).opacity);   // read BEFORE the cancel
    unstampIntro(card);
    card.classList.add('fm-intro-cut');
    setTimeout(() => { card.classList.remove('fm-intro-cut'); card.style.removeProperty('--cut-from'); }, 200);
  }
  function setPress(card) {
    // An open in flight owns the press. A second tap — on that card or on any other — is ignored
    // rather than moving the acknowledgement onto a card that is not the one loading; openProject
    // ignores the tap itself for the same reason, so moving it would be a lie either way.
    if (pressHeld || (_opening && !openAbandoned())) return;
    if (pressEl === card) return;
    clearPress();
    pressEl = card; pressPainted = false;
    card.classList.remove('fm-card-unpress');
    cutIntro(card);                        // or the entrance animation owns transform and the press is invisible
    card.classList.add('fm-card-press');   // synchronous: no rAF, no transition — see styles.css
    // One frame later the press is really on screen, and only then may the push start the lead from
    // the pressed scale. rAF callbacks run before that frame's paint, so this is exactly "a frame
    // happened between the press and the push".
    requestAnimationFrame(() => { if (pressEl === card) pressPainted = true; });
  }
  // The release arms a 600ms timer to drop the press (see projectCard's pointerup). That timer is for
  // a tap that never opens anything — it must NOT fire while an open is actually running, and an open
  // routinely runs longer than 600ms because the project's media has to decode. Measured on a 900ms
  // open before this existed: press on at t=42, dropped at t=756, then 335ms of completely dead screen
  // (card back at transform:none, nothing else moving), and at t=1108 the push started and snapped the
  // card back to scale(.965) in ONE frame — the popped frame this whole hand-off is designed to avoid.
  // So anything that takes the tap and then goes async calls this to take the press with it, and hands
  // it to startPush (which clears it) or drops it itself when it gives up.
  function releasePress(card) {
    if (pressHeld || pressEl !== card) return;   // an open already owns it, or this is not its card
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => clearPress(true), WAIT.release);
  }
  // "That tap turned out not to be a tap" — a drag, a pointercancel, a select-mode tick. Never takes
  // the press off a card that an open is still waiting on.
  function cancelPress(card) {
    if (pressHeld) return;
    if (card && pressEl !== card) return;
    clearPress(true);
  }
  // The long backstop is not the mechanism, only insurance: a load that never settles at all must not
  // leave a card pressed for the rest of the session. It hands over CLEANLY — the press eases off
  // (no snap) and pressPainted goes with it, so a push that finally arrives at t=12s leads from rest
  // instead of jumping back to the pressed scale on its first frame.
  function holdPress() {
    clearTimeout(pressTimer);
    pressHeld = !!pressEl;
    pressTimer = pressEl ? setTimeout(() => clearPress(true), WAIT.stuck) : 0;
  }
  // Everything the once-per-session entry stagger leaves on an element (stampIntro, below: the .hm-in
  // class plus an INLINE animation-delay, 0.49s on the first card). An inline delay outranks every
  // stylesheet rule, and fm-push-lead is declared `both` — so a lead card still carrying one holds
  // its `from` state for the whole push and never moves. Measured on a real cold launch at 380x800,
  // before this call existed: computed animation-delay during the push 0.49s, card-minus-home offset
  // 22.09px on the first push frame and 22.09px on the last, i.e. EXTRA LEAD 0.00px and opacity
  // 1 → 1. The headline of the whole feature, absent on the one launch every new user sees.
  // Two call sites, both load-bearing: setPress (via cutIntro) so the press can own the transform,
  // and startPush so the lead is not frozen by an inherited delay. ONE line clears both halves of the
  // stamp — assigning '' to the `animation` SHORTHAND removes every longhand it covers, delay
  // included, so the `n.style.animationDelay = ''` that used to sit above it was dead code (which is
  // why mutating it never turned the suite red).
  function unstampIntro(n) {
    n.classList.remove('hm-in', 'hm-in-fab');
    n.style.animation = '';   // clears the inline animation-delay stampIntro wrote, and any other longhand
    /* …and it must STAY unstamped (queue 222). Removing the class is not enough on its own: stampIntro
     * re-stamps every card in the grid whenever the list is re-entered, so a card that has already
     * begun a push can have `hm-in` — and with it an entrance DELAY of up to 0.82s — put straight back
     * on. The lead animation then inherits that delay and has not started when the push is scrubbed to
     * 280ms, which is exactly the diagnostic the flaky test captured: `state=paused ct=280` with the
     * card still carrying `hm-in` and the transform still identity, about one run in five.
     * A flag on the node is the smallest honest fix: the element itself is the thing that must not be
     * re-stamped, so the element carries the answer. */
    n._fmNoIntro = 1;
  }
  // hide=true finishes the push (the home screen goes away); hide=false just unwinds it, which is
  // what open() needs when you come back before the 280ms is up.
  function endPush(hide) {
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = 0; }
    if (waitTimer) { clearTimeout(waitTimer); waitTimer = 0; }
    splitRun = false;
    // A pop and a push are mutually exclusive, and fm-pop-out is `animation-fill-mode: both` — so if a
    // pop is still classed on when a push begins or ends, its FINAL frame stays applied to #app. Even
    // at the identity matrix that is fatal: any transform on #app makes it the containing block for
    // every position:fixed panel in the editor, which then positions against #app instead of the
    // viewport. The suite caught exactly that, reporting "matrix(1, 0, 0, 1, 0, 0)" after a push.
    endPop();
    const app = document.getElementById('app');
    if (root) { root.classList.remove('fm-push-out'); if (hide) root.classList.add('hidden'); }
    if (app) { app.classList.remove('fm-push-in', 'fm-push-wait'); app.removeEventListener('animationend', onAppPushEnd); }
    document.body.classList.remove('fm-pushing');
    if (pushLead) {
      pushLead.classList.remove('fm-card-lead', 'fm-lead-cold');
      pushLead.style.removeProperty('--lead-from');
      pushLead = null;
    }
    clearPress();
    closing = false;
  }
  /* ---- the POP: the push, run backwards, on the way back to home (v6.27, queue 60) --------------
   * Ezra: "reverse the open animation when returning to home." Opening a project has pushed since
   * v5.x — the card leaves left, the editor arrives from the right — but coming back was instant,
   * so the two directions did not agree and the app felt like it only had a forward gear.
   * The CSS for this already existed and had never been wired: fm-pop-out (the editor leaving right),
   * fm-pop-in (home returning from the left), the #add-fab viewport variant, and the reduced-motion
   * guard. All that was missing was the JS to put the classes on and take them off again.
   *
   * Cleanup is belt-and-braces for the same reason endPush is: animationend does NOT fire if the tab
   * is hidden mid-animation, and a stranded transform on #app is a permanent, unrecoverable bug — the
   * editor would sit a screen to the right forever. So a timer always finishes the job, and endPop is
   * safe to call twice. */
  let popTimer = 0, hasOpened = false;
  function endPop() {
    if (popTimer) { clearTimeout(popTimer); popTimer = 0; }
    const app = document.getElementById('app');
    if (app) app.classList.remove('fm-pop-out');
    if (root) root.classList.remove('fm-pop-in');
    document.body.classList.remove('fm-popping');
  }
  /* Take the card's fresh thumbnail once the app has nothing better to do (queue 128).
   *
   * WHEN, and why it is not simply "after the animation": the capture is ~60ms at phone speed, and
   * measured with a plain timer two runs in four still put a frame over 50ms right where you land —
   * you arrive on the grid and it hitches under your thumb. requestIdleCallback spends that time in a
   * gap instead, and the timeout means it can never be starved. The setTimeout is the fallback for
   * browsers without it, and the animation length is the floor either way: dropping a 60ms capture
   * INSIDE a running 380ms animation would be the stutter this whole item is about.
   *
   * The card keeps its previous thumbnail until then, which is a picture of the project you were
   * looking at seconds ago — a far smaller cost than the 81ms stall it replaces. */
  function captureThumbSoon() {
    if (thumbTimer) { clearTimeout(thumbTimer); thumbTimer = 0; }
    if (thumbIdle && window.cancelIdleCallback) { try { cancelIdleCallback(thumbIdle); } catch (e) {} }
    thumbIdle = 0;
    const grab = function () {
      thumbTimer = 0; thumbIdle = 0;
      if (!root || root.classList.contains('hidden')) return;   // left again already — nothing to refresh
      try { FM.projects.touchCurrent(true); } catch (e) {}
      render();
    };
    thumbTimer = setTimeout(function () {
      thumbTimer = 0;
      if (window.requestIdleCallback) thumbIdle = requestIdleCallback(grab, { timeout: 1500 });
      else grab();
    }, PUSH_MS + 80);
  }

  function startPop() {
    const app = document.getElementById('app');
    if (!app || !root) return;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;                       // the CSS zeroes these animations anyway; don't even class up
    endPop();                                 // a second Back before the first finished restarts cleanly
    void app.offsetWidth;
    app.classList.add('fm-pop-out');
    root.classList.add('fm-pop-in');
    document.body.classList.add('fm-popping');
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fm-push-ms')) || 380;
    popTimer = setTimeout(endPop, ms + 140);
  }

  function onPushEnd(e) {
    // #home-screen is the one element that animates on BOTH paths (slide and reduced-motion fade),
    // so it — not #app — is the honest end-of-push signal. Filter hard: the card entrances and the
    // two backdrop drifts all bubble their animationend through this same node.
    if (e.target !== root || e.pseudoElement) return;
    if (e.animationName !== 'fm-push-out' && e.animationName !== 'fm-push-fade') return;
    /* …unless the editor has not arrived yet. On the two-phase path (queue 128) the home screen leaves
     * on the tap while the project is still loading, so its animation routinely finishes FIRST — and
     * ending the push here would hide home, unpark the editor and drop the whole transition on the
     * floor mid-load. While #app is parked, the push is not over; onAppPushEnd finishes it instead. */
    if (splitRun) return;   // the editor ends this one — see splitRun
    endPush(true);
  }
  // Returns whether a push actually started — close() uses that as the value of `closing`, so a page
  // with no #app (never happens in the app, does happen in a stripped test page) still closes cleanly.
  // The push is a PHONE behaviour: it was designed, measured and verified at 380/390/414 only, and a
  // verifier caught the unscoped version playing the full 280ms slide on desktop with #app going
  // position:fixed z-index 210 mid-flight at 1280x720 — where the Studio layout has its own fixed
  // chrome to collide with and nothing had been measured. Desktop keeps the instant swap until that
  // case is measured on its own terms.
  let pushAllowed = function () {
    return !!(window.matchMedia && window.matchMedia('(max-width: 700px)').matches);
  };

  try { document.documentElement.style.setProperty('--fm-push-ms', PUSH_MS + 'ms'); } catch (e) {}

  /* TWO-PHASE PUSH (queue 128). Ezra: "make it so the animation of the project layer moving to the
   * left happens instantly, so it feels responsive, then smoothly the project should swoop in too."
   *
   * That is a description of a split, and the measurement backs it: openProject awaits the project
   * load and only THEN starts the push, so nothing on screen can move until the load resolves — 28ms
   * on this desktop, **113ms at 6× CPU throttle on a four-layer project**, and it grows with the
   * project. The animation itself was measured smooth at 6× (worst frame 18ms, no frame over 50), so
   * there was never any stutter to fix; the whole complaint is that dead time.
   *
   * Phase 1 runs on the tap: the card and the home screen leave immediately. Phase 2 runs when the
   * load resolves: the editor swoops in.
   *
   * The reason this is a split and not simply "start the push earlier" is the artefact that would
   * cause — #app still holds the PREVIOUS project, so an early push would slide the old project in
   * for 113ms and then swap it underneath the user, which is worse than the wait. So phase 1 also
   * PARKS #app off the right edge (fm-push-wait, a static transform, no animation), which is where
   * fm-push-in would have started it from anyway. What the vacated space shows meanwhile is the theme
   * background that body.fm-pushing already gives #app, not the old project. */
  /* The end-of-push signal for the two-phase path. #home-screen is the honest signal for a one-shot
   * push because it animates on both the slide and the reduced-motion fade — but when the editor waits
   * for a load, home has long since finished, so the arriving editor is the thing that says "done". */
  function onAppPushEnd(e) {
    if (e.pseudoElement || e.animationName !== 'fm-push-in') return;
    const app = document.getElementById('app');
    if (e.target !== app) return;
    endPush(true);
  }

  function armPushIn() {
    const app = document.getElementById('app');
    if (!app || !app.classList.contains('fm-push-wait')) return false;
    if (waitTimer) { clearTimeout(waitTimer); waitTimer = 0; }
    app.classList.remove('fm-push-wait');
    app.classList.add('fm-push-in');
    app.addEventListener('animationend', onAppPushEnd);   // same ref every time, so this registers once
    // The backstop starts HERE, not at the tap: it guards the incoming animation, and during phase 1
    // there is no incoming animation to guard. Armed at the tap it could fire mid-load and tear the
    // push down with the editor still parked off-screen.
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushTimer = 0; endPush(true); }, PUSH_MS + 140);
    return true;
  }
  // The load failed, or there is nothing to arm phase 2 with. Put the home screen back rather than
  // leave it dimmed at -24% with the editor parked off-screen and nothing coming.
  function abortPush() {
    const app = document.getElementById('app');
    if (app) app.classList.remove('fm-push-wait');
    endPush(false);
  }

  function startPush(lead, wait) {
    const app = document.getElementById('app');
    if (!root || !app) { if (root) root.classList.add('hidden'); return false; }
    // PHONE ONLY, and gated HERE rather than in the stylesheet on purpose. Every rule in the push
    // block keys off `fm-pushing` / `fm-push-out` / `fm-push-in`, so withholding the class makes all
    // of them inert at once — correct by construction, where a width-scoped @media block is one more
    // list that the next rule added below it can quietly fall outside of. This repo has been bitten
    // four times by exactly that shape of miss.
    // The behaviour was measured only at phone widths (380/390/414). A verifier found the unscoped
    // version playing the full 280ms slide on desktop, with #app going position:fixed z-index 210
    // mid-flight at 1280x720 — unverified there, and the Studio layout has its own fixed chrome to
    // collide with. Desktop keeps HEAD's instant swap until that case is measured on its own terms.
    // Exposed as FM.home._pushAllowed so the suite can BOTH assert the gate itself (it must be false
    // at desktop width) and override it to exercise the push, because tests/run.html drives the app in
    // a 900px frame where the real gate is legitimately false and no push would ever run.
    if (!pushAllowed()) {
      root.classList.add('hidden');
      return false;
    }
    if (pushTimer) endPush(false);           // a second push on top of a running one: restart it
    /* A pop still classed on #app would BEAT the park. fm-pop-out has animation-fill-mode:both, and a
     * running animation always wins over a plain declaration — so `fm-push-wait`'s static transform is
     * silently ignored and the editor sits wherever the pop's last frame left it, part-way on screen
     * with the previous project showing. endPush has guarded this for the same reason since the suite
     * caught a stranded matrix on #app; the entry side never did, because until the two-phase push
     * everything here was an animation too and could compete on equal terms. (queue 128) */
    endPop();
    // WARM = this card is pressed and that press has been painted, so fm-push-lead can start from the
    // pressed scale and the release into the push is continuous. COLD = it has not: keyboard Enter
    // (no finger, and click runs in the same task as the keydown), an open that resolved without a
    // frame in between, or the 8s backstop having already let go. Starting a cold card at scale(.965)
    // is a 3.5% jump on the push's first frame — the exact pop this hand-off exists to remove — so
    // the cold card leads from rest instead. Measured, keyboard Enter at 380x800: 1.000 → 0.965 in
    // one frame before this existed, 1.000 → 0.999 after.
    const warm = !!(lead && lead === pressEl && pressPainted);
    if (lead && lead.isConnected) {
      pushLead = lead;
      // Opacity gets the same treatment as scale: start the lead from where the card ACTUALLY is.
      // A card tapped mid-entrance is still easing in (.fm-intro-cut) when the push takes over, and a
      // flat `opacity: 1` in the keyframes stepped it 0.34829 → 1.00000 in one frame. Read before the
      // classes go on, so this is the pre-push value and not the keyframe's own `from`.
      lead.style.setProperty('--lead-from', getComputedStyle(lead).opacity);
      unstampIntro(lead);                    // an inherited intro delay would freeze the lead: see unstampIntro
      lead.classList.add('fm-card-lead');
      if (!warm) lead.classList.add('fm-lead-cold');
    }
    clearPress();                            // instant, not eased — fm-push-lead owns the transform from this frame
    document.body.classList.add('fm-pushing');
    root.classList.add('fm-push-out');
    // Phase 1 parks the editor where fm-push-in would have begun; phase 2 (armPushIn) starts it moving.
    app.classList.add(wait ? 'fm-push-wait' : 'fm-push-in');
    root.addEventListener('animationend', onPushEnd);   // same function ref every time, so this registers once
    // Backstop. animationend does not fire if the tab is hidden mid-push, and a stranded transform
    // on #app is a permanent bug — so the timer always finishes the job. On the waiting path it is
    // armed by armPushIn instead, because there is nothing to back up until the editor is moving.
    if (!wait) pushTimer = setTimeout(() => { pushTimer = 0; endPush(true); }, PUSH_MS + 140);
    /* AN OPEN THAT NEVER SETTLES MUST NOT STRAND THE TRANSITION. Before the split, a hung open left a
     * card pressed and holdPress's WAIT.stuck timer let it go. On this path the press was handed to
     * the push on the tap, so what a hung open strands now is the push itself — home dimmed at -24%,
     * the editor parked off-screen, and nothing ever arriving. Same deadline, same reasoning, applied
     * to the thing that is actually at risk. (queue 128) */
    if (wait) waitTimer = setTimeout(() => { waitTimer = 0; abortPush(); }, WAIT.stuck);
    splitRun = !!wait;
    return true;
  }

  /* The project cards' film-grain static (v6.23, queue 76). Ezra sent a reference photo and asked for
   * "a static effect to each project that is subtle and moves like how the static looks in this image",
   * clarifying he meant the CARDS on the home screen, not anything inside a project.
   *
   * The tile is GENERATED here rather than shipped as an asset: a 64px noise PNG is a few KB of
   * base64 that would have to live in the CSS or the repo, and generating it costs about a
   * millisecond, once, on a canvas we throw away. It is also the only honest way to get real
   * per-pixel noise — a CSS gradient cannot make one, and feTurbulence costs a filter pass per frame.
   *
   * Grey, not colour, and only the alpha varies: coloured noise over a card tints it, and these cards
   * carry the user's own thumbnails.
   *
   * SIX TILES, RE-ROLLED IN PLACE — third attempt, and the first two failed in opposite directions
   * (queue 105). v6.23 stepped ONE tile between five offsets: that is a sheet of noise lurching
   * sideways eight times a second, and Ezra called it "too jumpy". v6.62 made the same offset slide
   * smoothly instead, which he liked even less — "it looks like it's all moving together", and he is
   * right, because a translating noise field reads as fabric passing behind a window rather than as
   * grain. The mistake both times was animating POSITION at all.
   *
   * Real grain does not travel; it boils where it sits. The app's own filmgrain effect already does
   * exactly that (js/compositor.js: `const frame = Math.floor(t * 24)` — "re-roll per frame: static
   * grain reads as dirt on the lens"), which is what Ezra means by "kinda like the effect we have in
   * our app". So: several independent tiles, swapped in place, with the background-position never
   * touched. Six is enough that the cycle does not read as a repeating loop and cheap enough to
   * generate once (~6 KB of base64 total, about a millisecond each).
   *
   * They are shared across cards, but each card is given its own negative animation-delay by
   * renderCards, so no two cards are showing the same tile at the same moment — "each one having its
   * own things" without paying for N canvases.
   *
   * TWO TILES OF 256, not six of 64 (v7.76, queue 157). Ezra, on the field after it moved to the
   * background: "The background film grain looks shit." The strength was not the fault — the TILE SIZE
   * was. A 64px tile repeats about 76 times across a 380x820 phone, and the eye is very good at
   * spotting a repeated random field: what you see is a grid, not grain. On a card it repeated roughly
   * five times, which is why four rounds of tuning on the cards never turned this up and why it only
   * became ugly the moment the same field was asked to cover a screen. At 256 it repeats 4.8 times.
   * Measured, because the arithmetic is not obvious: six 64px tiles cost 54 KB and about 166 ms to
   * generate; two 256px tiles cost 272 KB and about 15 ms. So the bigger field is TEN TIMES cheaper to
   * build as well as far better looking — most of the old cost was six separate toDataURL calls.
   * Two is enough now that the cards no longer use these at all (v7.71): the background needs exactly
   * a pair to dissolve between, and the per-card phase offset it had six for is gone. */
  const STATIC_TILES = 2;
  /* The tile SIZE is the whole of queue 157's fix, and it is invisible when it regresses: a 64px field
     looks perfectly fine in a screenshot of one card and reads as a grid across a phone. So it is a
     named constant the suite can assert on rather than a local nobody can reach. */
  const STATIC_PX = 256;
  let staticURL = null;
  function ensureStaticTile() {
    if (staticURL) return staticURL;
    try {
      const N = STATIC_PX;
      for (let k = 0; k < STATIC_TILES; k++) {
        const c = document.createElement('canvas');
        c.width = c.height = N;
        const g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          d[i] = d[i + 1] = d[i + 2] = 255;   // white grain; the ALPHA is what varies
          d[i + 3] = v;
        }
        g.putImageData(img, 0, 0);
        const url = 'url("' + c.toDataURL('image/png') + '")';
        document.documentElement.style.setProperty('--hm-static-' + k, url);
        if (k === 0) { staticURL = url; document.documentElement.style.setProperty('--hm-static', url); }
      }
    } catch (e) { staticURL = null; }   // no canvas → the CSS vars stay unset and the overlay draws nothing
    return staticURL;
  }

  /* ---- The overpull slam (v6.25) ----------------------------------------------------------------
   * Ezra: "when you swipe down in the Home Screen and keep swiping down even tho you reached the top,
   * the project will just slam back up really hard and shake the screen."
   *
   * An Easter egg, so it has exactly one job: be fun, and be impossible to trigger by accident. The
   * whole gesture only exists while the list is ALREADY at the top and you keep pulling — which is a
   * dead gesture otherwise, so nothing is taken away to pay for it.
   *
   * The pull is damped on a curve rather than following the finger 1:1, for the same reason every
   * rubber-band scroll is: a linear pull feels like the list has come loose. `Math.pow(dy, .78)` gives
   * ground quickly at first and then resists, so it feels attached to something.
   *
   * On release the return is NOT a spring — a spring says "gently corrected". Ezra asked for a slam,
   * so it is a hard cubic that arrives fast and stops dead, and the SCREEN takes the impact: the shake
   * is on #home-screen, decaying over 420ms, because a slam that only moved the list would read as a
   * scroll animation rather than as something hitting a wall.
   *
   * Two guards worth naming: nothing fires below PULL_MIN, so a short overscroll during ordinary
   * scrolling stays silent; and it is skipped entirely under prefers-reduced-motion, where a screen
   * shake is not a joke but a problem. */
  /* PULL_SOFT is where the pull starts getting heavy — NOT where it stops (queue 131). Ezra: "you
   * should still be able to drag it down as freely as you want and at any point of letting go after a
   * certain amount it does the slam." The old code did Math.min(PULL_MAX, …), a hard cut: past it the
   * list stopped answering the finger entirely, which is exactly what he described as a freeze.
   * Now everything past PULL_SOFT is compressed to 28% rather than discarded, so it keeps moving at
   * any distance — heavier and heavier, never stuck. CANCEL_UP is how far you have to move UP before
   * this counts as "no, I'm scrolling back" — see the pointermove handler for why 0 is not enough. */
  const PULL_SOFT = 150, PULL_MIN = 64, CANCEL_UP = 12;
  function damp(dy) {
    if (dy <= 0) return 0;
    const raw = Math.pow(dy, 0.78);
    return raw <= PULL_SOFT ? raw : PULL_SOFT + (raw - PULL_SOFT) * 0.28;
  }
  let pull = null;
  // `ease` FIRST, then the transform — setting the transition afterwards would apply to the NEXT
  // change, not this one, and the return would snap with no animation at all.
  function setPull(px, ease) {
    if (!grid) return;
    grid.style.transition = ease || '';
    grid.style.transform = px ? 'translate3d(0,' + px.toFixed(1) + 'px,0)' : '';
  }
  function slam() {
    if (!grid || !root) return;
    // The list snaps back over 190ms on a curve that is fast in and flat out — it arrives, it does not
    // settle. The shake is a separate, longer animation so the impact outlasts the movement.
    setPull(0, 'transform 190ms cubic-bezier(.7,0,.2,1)');
    root.classList.remove('hm-slam');
    void root.offsetWidth;                                   // restart the animation if it is already running
    root.classList.add('hm-slam');
    if (navigator.vibrate) { try { navigator.vibrate([14, 26, 9]); } catch (e) {} }
    setTimeout(() => { if (root) root.classList.remove('hm-slam'); if (grid) grid.style.transition = ''; }, 460);
  }
  function initOverpull() {
    const sc = root && root.querySelector('.hm-scroll');
    if (!sc || sc._overpull) return;
    sc._overpull = 1;
    const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sc.addEventListener('pointerdown', (e) => {
      if (selectMode || reduced()) return;                   // a paint-select drag owns the gesture
      if (sc.scrollTop > 0) return;                          // only from a list already at the top
      pull = { y: e.clientY, id: e.pointerId, px: 0 };
    });
    sc.addEventListener('pointermove', (e) => {
      if (!pull || e.pointerId !== pull.id) return;
      const dy = e.clientY - pull.y;
      // The list scrolling away from the top ends it — that genuinely IS a scroll, not a pull.
      if (sc.scrollTop > 0) { if (pull.px) setPull(0); pull = null; return; }
      /* THE BUG THAT MADE THIS EGG UNREACHABLE ON A PHONE (queue 132). This used to read
       *     if (dy <= 0 || sc.scrollTop > 0) { … pull = null; return; }
       * and `pull = null` is permanent — nothing re-arms it until the next pointerdown. A real finger's
       * FIRST pointermove very often reports the same clientY as the pointerdown, so dy === 0, and the
       * whole gesture died on frame one. Every synthetic test jumped 20px on the first move and so
       * never produced dy === 0, which is why this passed verification more than once while never
       * working on his phone. Confirmed by git: the block is byte-identical to the day it shipped, so
       * it never regressed — it was always broken on real touch.
       * Now only a deliberate UPWARD move cancels; dy of 0, or a pixel of jitter while you hold still,
       * simply parks the pull at 0 and keeps the gesture alive. */
      if (dy <= -CANCEL_UP) { if (pull.px) setPull(0); pull = null; return; }
      pull.px = damp(dy);
      setPull(pull.px);
    });
    const release = () => {
      if (!pull) return;
      const px = pull.px; pull = null;
      if (px >= PULL_MIN) slam();
      else if (px) setPull(0, 'transform 220ms cubic-bezier(.22,.8,.3,1)');   // short pull → just glide back, no joke
    };
    sc.addEventListener('pointerup', release);
    sc.addEventListener('pointercancel', release);
    sc.addEventListener('pointerleave', release);
    /* The OTHER half of why this never fired on iOS (queue 132). At scrollTop 0 a downward drag is
     * Safari's own rubber-band gesture, and the moment WebKit latches onto it as a scroll it fires
     * pointercancel at us — which runs release() with pull.px still tiny, well under PULL_MIN. So even
     * with the dy===0 bug above fixed, the pull would be taken away mid-gesture.
     * preventDefault on touchmove while a pull is actually live stops Safari starting that bounce, so
     * the gesture stays ours. It is scoped hard: only while `pull` exists AND the finger has already
     * moved down, so ordinary scrolling in every other direction and position is untouched — the
     * listener bails instantly the rest of the time. passive:false because a passive listener is
     * forbidden from calling preventDefault at all. */
    sc.addEventListener('touchmove', (e) => {
      if (pull && pull.px > 0 && e.cancelable) e.preventDefault();
    }, { passive: false });

    /* …and the same thing on a WHEEL (v6.26). Ezra: "for the easter egg to work you should make it on
     * pc when scrolling and you reach the top you can keep scrolling." He is right that the drag
     * version above simply does not exist on a desktop — nobody scrolls a list by dragging it with a
     * mouse, so on PC the egg was unreachable.
     *
     * A wheel has no release event, so the burst has to be timed out: 130ms of silence ends the
     * gesture. That is long enough to bridge the gaps inside one trackpad flick and short enough that
     * two deliberate pushes are two attempts, not one.
     *
     * deltaY < 0 is scrolling UP — the wheel equivalent of pulling the list down — and it only counts
     * while the list is already at the top. preventDefault (hence passive:false) stops the browser
     * running its own overscroll bounce or, on some setups, a back-navigation gesture underneath ours.
     * The accumulator is in the same units as the drag, so the two paths reach the threshold at the
     * same felt effort and share one PULL_MIN. */
    let wheelAcc = 0, wheelTimer = 0, wheelSpent = 0;
    sc.addEventListener('wheel', (e) => {
      if (selectMode || reduced()) return;
      if (sc.scrollTop > 0 || e.deltaY >= 0) {      // scrolled away from the top, or scrolling down
        if (wheelAcc) { wheelAcc = 0; setPull(0, 'transform 200ms cubic-bezier(.22,.8,.3,1)'); }
        clearTimeout(wheelTimer); wheelTimer = 0;
        return;
      }
      e.preventDefault();
      wheelAcc += -e.deltaY;
      const px = damp(wheelAcc);
      /* FIRE THE MOMENT IT IS FAR ENOUGH, not 130ms after you stop (v7.86, queue 238). Ezra: "when you
       * do it and you swipe down too far on PC, it takes a bit too long before it snaps back up. It
       * would be nice if when you kept swiping up, it was a bit of a smooth animation and didn't just
       * freeze for a second before going back up."
       * That freeze was this debounce. A trackpad has no pointerup, so the wheel path waited for a gap
       * in the events to decide the gesture was over — which means at full stretch the list SAT there,
       * fully pulled and visibly stuck, until you took your fingers off. The touch path never had this:
       * it slams on release, and release is a real event. Crossing the threshold IS the commitment, so
       * the slam goes now and the rest of the flick is swallowed by a short cooldown.
       * The cooldown is what makes this safe: one flick delivers dozens of wheel events, and without it
       * the accumulator would climb back over PULL_MIN and re-slam two or three times per gesture. */
      if (px >= PULL_MIN && !wheelSpent) {
        clearTimeout(wheelTimer); wheelTimer = 0;
        wheelAcc = 0; wheelSpent = 1;
        slam();
        return;
      }
      /* Once a flick has slammed it is SPENT until the gesture actually ends, and "ends" means a gap in
       * the events rather than a fixed number of milliseconds. A timed cooldown was the first attempt
       * and the suite caught it firing twice: a flick that outlasts the timer re-crosses the threshold
       * and slams again, and how long a flick lasts depends on the machine — mine ran 366ms and the
       * test runner's ran longer. Re-arming on the same 130ms silence the release path already uses
       * makes one gesture exactly one slam at any speed. */
      if (wheelSpent) {
        wheelAcc = 0;
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => { wheelTimer = 0; wheelSpent = 0; }, 130);
        return;
      }
      setPull(px);   // same curve as the drag, so both paths feel identical and share PULL_MIN
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelTimer = 0;
        const rest = damp(wheelAcc);
        wheelAcc = 0;
        if (rest) setPull(0, 'transform 220ms cubic-bezier(.22,.8,.3,1)');
      }, 130);
    }, { passive: false });
  }

  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  /* ---- Pinned items (queue 138) -----------------------------------------------------------------
   * Ezra: "if you press the three dots on a project or even template etc you can press pin and the
   * project will stay at the top … Make sure you can pin as many as you want."
   *
   * Kept HERE rather than on the project/template/element records: pinning is a property of how YOUR
   * home screen is arranged, not of the thing itself. Writing it onto the record would mean a save
   * through three different stores (and a project save rewrites the whole scene just to set a flag),
   * and a pinned project exported and re-imported would arrive pinned on someone else's home — which
   * is plainly wrong.
   *
   * Keyed BY TAB, so the same id pinned as a project and as a template stay independent, and a tab
   * added later gets an empty list for free instead of throwing. No cap anywhere: he asked for as
   * many as you want, so nothing here slices. */
  const PIN_KEY = 'fm.home.pins';
  let pinState = null;
  function pinsAll() {
    if (pinState) return pinState;
    pinState = { projects: [], templates: [], elements: [] };
    try {
      const raw = JSON.parse(localStorage.getItem(PIN_KEY) || '{}');
      // Rebuilt from the schema rather than trusted wholesale — this is user-editable storage, and a
      // string where an array belongs would take the whole home screen down on the first render.
      Object.keys(pinState).forEach(k => {
        if (Array.isArray(raw[k])) pinState[k] = raw[k].filter(v => typeof v === 'string');
      });
    } catch (e) {}
    return pinState;
  }
  function pinsFor(t) { const a = pinsAll(); if (!Array.isArray(a[t])) a[t] = []; return a[t]; }
  function isPinned(t, id) { return pinsFor(t).indexOf(id) !== -1; }
  function togglePin(t, id) {
    const a = pinsFor(t), i = a.indexOf(id);
    if (i === -1) a.push(id); else a.splice(i, 1);
    try { localStorage.setItem(PIN_KEY, JSON.stringify(pinsAll())); } catch (e) {}
    return i === -1;
  }
  /* A STABLE partition, not a sort key: pinned cards move to the front and everything keeps the order
   * it already had. So whichever order the tab is in — recently edited, or A–Z from Settings — still
   * holds inside each block, and pinning never scrambles a list you already know how to read.
   * Ids of deleted items simply never match anything, so they are inert rather than needing a sweep. */
  function pinSort(t, list, idOf) {
    const p = pinsFor(t);
    if (!p.length) return list;
    const hit = [], rest = [];
    list.forEach(x => (p.indexOf(idOf(x)) !== -1 ? hit : rest).push(x));
    return hit.concat(rest);
  }
  // The indicator: a small tack on the thumb's free corner (OPEN owns top-left, the duration owns
  // bottom-left). Same dark glass plate as those two so it reads as one family rather than a new badge
  // style, and it sits INSIDE existing furniture instead of adding a row to the card.
  function pinBadge() {
    const b = el('span', 'hm-pin');
    b.setAttribute('aria-label', 'Pinned');
    b.title = 'Pinned to top';
    b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
      + '<path d="M9.6 1.4l5 5-1.9 1.9-1.2-.4-2.7 2.7.5 2.5-1.3 1.3-3.1-3.1-3.3 3.3-.8-.8 3.3-3.3-3.1-3.1 1.3-1.3 2.5.5 2.7-2.7-.4-1.2z"/>'
      + '</svg>';
    return b;
  }
  // One menu row, built the same way for all three card types so the wording never drifts apart.
  function pinMenuItem(t, id) {
    const on = isPinned(t, id);
    return { label: on ? 'Unpin' : 'Pin to top', action: () => {
      const nowOn = togglePin(t, id);
      render();
      if (FM.toast) FM.toast(nowOn ? 'Pinned to top' : 'Unpinned', 1200);
    } };
  }
  // role=button divs don't synthesise a click from Enter/Space like a real <button> — wire it so the
  // cards are keyboard-activatable (they announce as buttons to screen readers but did nothing on Enter).
  // Enter/Space is a tap with no finger, so it gets the same press: without one the card sat at
  // transform:none for the whole load and then jumped to the pressed scale on the push's first frame.
  // The press is set BEFORE click() and released on keyup, so a held key reads exactly like a held
  // finger; if click() runs in the same task (an already-open project) the press never paints and
  // startPush leads cold instead — see startPush's `warm`.
  function keyActivate(elm) {
    elm.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (e.repeat) return;          // a held key must not re-fire the activation
      setPress(elm);
      elm.click();
    });
    elm.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') releasePress(elm); });
    elm.addEventListener('blur', () => cancelPress(elm));   // focus moved on; an open in flight keeps its press
  }
  function ago(ts) {
    if (!ts) return '';
    const s = Math.max(1, (Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }
  function fmtDur(s) {
    s = Math.max(0, Math.round(s || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function aspectLabel(w, h) {
    if (!w || !h) return '';
    const r = w / h;
    if (Math.abs(r - 9 / 16) < 0.02) return '9:16';
    if (Math.abs(r - 16 / 9) < 0.02) return '16:9';
    if (Math.abs(r - 1) < 0.02) return '1:1';
    if (Math.abs(r - 4 / 5) < 0.02) return '4:5';
    if (Math.abs(r - 4 / 3) < 0.02) return '4:3';
    return w + '×' + h;
  }
  // "1080p" the way every editor labels it: the SHORT side (1080×1920 portrait is still 1080p).
  function resLabel(w, h) { return (w && h) ? Math.min(w, h) + 'p' : ''; }
  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ---------- search: forgiving name + date matching -------------------------------------------
   * Nothing here demands an exact query. Names match on substring, word-prefix, typo distance and
   * subsequence; date queries parse loosely ("yesterday", "last week", "aug", "2/8/26") into a
   * range and score by CLOSENESS, so the nearest project still surfaces when nothing falls inside
   * the range. Every result carries a 0..1 score; the list is ranked by it, best first.
   */
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const DAY_MS = 86400000;
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s_\-]+/g, ' ').trim(); }

  // Levenshtein distance — the typo tolerance ("prject" still finds "Project").
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = new Array(n + 1), cur = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      }
      const t = prev; prev = cur; cur = t;
    }
    return prev[n];
  }
  // Initials / skipped-letter match ("sct" → "Spin Cut Transition"), scored by how tightly packed it is.
  function subseq(s, q) {
    let i = 0, first = -1, last = -1;
    for (let j = 0; j < s.length && i < q.length; j++) {
      if (s.charAt(j) === q.charAt(i)) { if (first < 0) first = j; last = j; i++; }
    }
    if (i < q.length) return 0;
    return Math.max(0.35, q.length / (last - first + 1));
  }
  // Initials, the way people actually abbreviate: "sct" → Spin Cut Transition.
  function initialsScore(s, q) {
    if (q.indexOf(' ') >= 0 || q.length < 2) return 0;
    const words = s.split(' ').filter(Boolean);
    if (words.length < 2 || q.length > words.length) return 0;
    for (let st = 0; st + q.length <= words.length; st++) {
      let ok = true;
      for (let i = 0; i < q.length; i++) if (words[st + i].charAt(0) !== q.charAt(i)) { ok = false; break; }
      if (ok) return st === 0 ? 0.84 : 0.78;
    }
    return 0;
  }
  function nameScore(name, q) {
    const s = norm(name), t = norm(q);
    if (!s || !t) return 0;
    if (s === t) return 1;
    const at = s.indexOf(t);
    if (at === 0) return 0.96;
    if (at > 0) return 0.9 - Math.min(0.12, at / 200);
    const words = s.split(' ').filter(Boolean);
    if (words.some(w => w.indexOf(t) === 0)) return 0.88;
    const ini = initialsScore(s, t);
    if (ini) return ini;
    let best = 0;
    for (const c of [s].concat(words)) {
      if (!c) continue;
      const sc = 1 - lev(c, t) / Math.max(c.length, t.length);
      if (sc > best) best = sc;
    }
    return Math.max(best * 0.86, subseq(s, t) * 0.7);
  }

  function dayStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function dayEnd(ts) { const d = new Date(ts); d.setHours(23, 59, 59, 999); return d.getTime(); }
  function daysInMonth(y, mo) { return new Date(y, mo + 1, 0).getDate(); }
  function monthIndex(w) {
    if (!w || w.length < 3) return -1;
    if (w === 'sept') return 8;
    for (let i = 0; i < 12; i++) if (MONTHS[i].indexOf(w) === 0) return i;
    return -1;
  }
  function monthRange(y, mo) { return { a: new Date(y, mo, 1).getTime(), b: new Date(y, mo + 1, 1).getTime() - 1 }; }
  // A day that doesn't exist ("31/6", "29/2/25") is NOT silently rolled into the next month — JS Date
  // would happily do that and we'd then announce "1 match" for a date the project was never touched on.
  function dayRange(y, mo, d) {
    if (d < 1 || d > daysInMonth(y, mo)) return null;
    const t = new Date(y, mo, d).getTime();
    return { a: dayStart(t), b: dayEnd(t) };
  }
  // Two-digit years: 26 → 2026, 99 → 1999 (nobody's editing video in 2099).
  function fullYear(y) { y = +y; return y >= 100 ? y : (y <= 79 ? 2000 + y : 1900 + y); }

  // Loose date query → {a, b} millisecond range, or null when the text isn't date-ish at all.
  function parseDateQuery(raw) {
    // NOT norm() — that collapses hyphens, which would eat "2026-08-02" and "2-8-26"
    const t = String(raw == null ? '' : raw).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!t) return null;
    const now = Date.now(), D = new Date(now);
    let m;
    if (t === 'today') return { a: dayStart(now), b: dayEnd(now) };
    if (t === 'yesterday') return { a: dayStart(now - DAY_MS), b: dayEnd(now - DAY_MS) };
    if (t === 'this week' || t === 'week') return { a: dayStart(now - 6 * DAY_MS), b: dayEnd(now) };
    if (t === 'last week') return { a: dayStart(now - 13 * DAY_MS), b: dayEnd(now - 7 * DAY_MS) };
    if (t === 'this month' || t === 'month') return monthRange(D.getFullYear(), D.getMonth());
    if (t === 'last month') return monthRange(D.getFullYear(), D.getMonth() - 1);
    if (t === 'this year' || t === 'year') return { a: new Date(D.getFullYear(), 0, 1).getTime(), b: new Date(D.getFullYear() + 1, 0, 1).getTime() - 1 };
    if (t === 'last year') return { a: new Date(D.getFullYear() - 1, 0, 1).getTime(), b: new Date(D.getFullYear(), 0, 1).getTime() - 1 };
    // "3 days ago", "2 weeks ago", "6 months ago"
    m = t.match(/^(\d{1,3}) *(d|day|days|w|week|weeks|mo|month|months|y|year|years) *ago$/);
    if (m) {
      const n = +m[1], u = m[2];
      if (u[0] === 'd') { const ts = now - n * DAY_MS; return { a: dayStart(ts), b: dayEnd(ts) }; }
      if (u[0] === 'w') { const ts = now - n * 7 * DAY_MS; return { a: dayStart(ts - 3 * DAY_MS), b: dayEnd(ts + 3 * DAY_MS) }; }
      if (u[0] === 'm') return monthRange(D.getFullYear(), D.getMonth() - n);
      return { a: new Date(D.getFullYear() - n, 0, 1).getTime(), b: new Date(D.getFullYear() - n + 1, 0, 1).getTime() - 1 };
    }
    // ISO-ish: 2026-08-02, 2026/08, 2026-8
    m = t.match(/^(\d{4})[-\/](\d{1,2})(?:[-\/](\d{1,2}))?$/);
    if (m) { const y = +m[1], mo = +m[2] - 1; if (mo >= 0 && mo < 12) return m[3] ? dayRange(y, mo, +m[3]) : monthRange(y, mo); }
    // Day-first (he's in Perth): 2/8, 2-8-26, 02/08/2026
    m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2}|\d{4}))?$/);
    if (m) {
      const d = +m[1], mo = +m[2] - 1, y = m[3] ? fullYear(m[3]) : D.getFullYear();
      if (d >= 1 && d <= 31 && mo >= 0 && mo < 12) return dayRange(y, mo, d);
    }
    // Month names: "august", "aug 2026", "2 aug", "aug 2", "2 august 2026"
    const w = t.split(' ').filter(Boolean);
    if (w.length && w.length <= 3) {
      let mo = -1, day = 0, year = 0, ok = true;
      for (const part of w) {
        const mi = monthIndex(part);
        if (mi >= 0 && mo < 0) { mo = mi; continue; }
        if (/^\d{1,2}(st|nd|rd|th)?$/.test(part) && !day) { day = parseInt(part, 10); continue; }
        if (/^\d{4}$/.test(part) && !year) { year = +part; continue; }
        ok = false; break;
      }
      if (ok && mo >= 0) {
        const y = year || D.getFullYear();
        if (day >= 1) { const r = dayRange(y, mo, day); if (r) return r; }   // "feb 30" → fall back to the whole month rather than a wrong day
        return monthRange(y, mo);
      }
    }
    // A bare plausible year
    m = t.match(/^(\d{4})$/);
    if (m && +m[1] >= 1990 && +m[1] <= 2100) return { a: new Date(+m[1], 0, 1).getTime(), b: new Date(+m[1] + 1, 0, 1).getTime() - 1 };
    return null;
  }
  // Inside the range = a perfect hit; outside it fades over ~6 weeks so "closest" still means something.
  function dateScore(ts, range) {
    if (!ts || !range) return 0;
    if (ts >= range.a && ts <= range.b) return 1;
    const outDays = (ts < range.a ? range.a - ts : ts - range.b) / DAY_MS;
    return Math.max(0, 0.85 - outDays * 0.02);
  }
  // Best of name / created / edited. A date only counts as a real MATCH when the project actually
  // falls inside the range — proximity is for ranking the "closest" fallback, so asking for "today"
  // can't claim last week's project as a hit. `why` explains a date-driven row on the sub-line.
  function scoreProject(p, q, range) {
    const n = nameScore(p.name, q);
    let d = 0, inRange = false, why = '';
    if (range) {
      const cts = p.created || 0, ets = p.modified;
      const cs = dateScore(cts, range), es = dateScore(ets, range);
      d = Math.max(cs, es);
      inRange = d >= 1;
      // Only ever say "created" when a creation date was actually recorded — pre-v3.68 cards have
      // only an edit date, and labelling that as the creation date would be a plain lie.
      if (d > 0) why = (cts && cs >= es) ? ('created ' + fmtDate(cts)) : ('edited ' + fmtDate(ets));
    }
    return { score: Math.max(n, d), exact: n >= 0.45 || inRange, why: d > n ? why : '' };
  }

  function projectCard(p, subOverride) {
    // a DIV, not a button — a card is a <button> and the ⋯ is a nested <button>, which is invalid
    // HTML and silently breaks the inner tap on iOS Safari (the "three dots do nothing" bug).
    const isOpen = p.id === FM.projects.currentId();
    const card = el('div', 'hm-card' + (isOpen ? ' hm-open' : '') + (selectMode && selected.has(p.id) ? ' hm-sel' : ''));
    /* NO PER-CARD GRAIN ANY MORE (queue 157) — the four rounds of tuning that produced the phase
       offset and the per-card tile pair moved to the background with the field itself, where there is
       one surface and so nothing to de-synchronise. The cards are smooth now; see #hm-grain. */
    card.setAttribute('role', 'button'); card.tabIndex = 0; card.dataset.pid = p.id;
    card.setAttribute('aria-label', (p.name || 'Untitled') + ' — open project');
    const th = el('div', 'hm-thumb');
    // Thumbnails now live in IndexedDB (out of the autosave-hot index) — load async, placeholder first.
    const ph = el('span', 'hm-thumb-empty', '▶'); th.appendChild(ph);
    FM.projects.getThumb(p.id).then(url => { if (url) { const img = document.createElement('img'); img.src = url; img.alt = ''; img.addEventListener('load', () => { if (ph.parentNode) ph.remove(); }); th.insertBefore(img, ph); } });
    th.appendChild(el('span', 'hm-dur', fmtDur(p.duration)));   // AM-style timecode badge on the thumb
    if (isOpen) th.appendChild(el('span', 'hm-open-badge', 'OPEN'));
    if (isPinned('projects', p.id)) { th.appendChild(pinBadge()); card.classList.add('is-pinned'); }
    // The tick is selectify's now (v6.17) — appending one here as well would put TWO in the corner.
    const name = el('div', 'hm-name', p.name || 'Untitled');
    // duration lives on the thumb badge; the meta line carries the AM set: aspect · resolution · fps · layers
    const meta = el('div', 'hm-meta');
    const mi = txt => { if (txt) meta.appendChild(el('span', 'hm-mi', txt)); };
    mi(aspectLabel(p.width, p.height));
    mi(resLabel(p.width, p.height));
    mi(p.fps ? p.fps + 'fps' : '');       // older cards have no fps yet — it fills in when the project is next opened
    mi(p.layers != null ? p.layers + (p.layers === 1 ? ' layer' : ' layers') : '');
    const sub = el('div', 'hm-sub', subOverride || ('edited ' + ago(p.modified)));
    const more = el('button', 'hm-card-more', '⋯');
    more.setAttribute('aria-label', 'Project actions');
    more.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = more.getBoundingClientRect();
      FM.contextMenu.show(Math.min(r.left, window.innerWidth - 210), r.bottom + 4, [
        { label: 'Open', action: () => openProject(p.id) },
        pinMenuItem('projects', p.id),
        { label: 'Rename…', action: () => { const n = prompt('Project name:', p.name); if (n && n.trim()) { FM.projects.rename(p.id, n.trim()); render(); } } },
        { label: 'Duplicate', action: async () => { if (FM.toast) FM.toast('Duplicating…', 1200); await FM.projects.duplicate(p.id); render(); } },
        // Sits directly under Duplicate: both make a NEW thing out of this project, so they read as a
        // pair. It was buried below Select… (a mode, not a creation) and Ezra asked for a feature that
        // was already here — which is a findability problem, not a missing one.
        { label: 'Save as template…', action: async () => {
          const n = prompt('Template name:', p.name || 'My template'); if (!n || !n.trim()) return;
          const ok = await FM.templates.save(n.trim(), p.id);
          if (FM.toast) FM.toast(ok ? 'Template saved' : 'Could not save template');
        } },
        // The other half of "build a new element": the same shelf as Save as template, because from
        // here they are the same gesture — turn this project into a reusable thing.
        { label: 'Save as element…', action: async () => {
          const n = prompt('Element name:', p.name || 'My element'); if (!n || !n.trim()) return;
          const ok = await FM.elements.saveFromProject(p.id, n.trim());
          if (FM.toast) FM.toast(ok ? 'Element saved' : 'Could not save element');
          render();
        } },
        { label: 'Select…', action: () => { enterSelect(p.id); } },
        // EXPORT VIDEO — the same dialog the editor's Export button opens (format, resolution, frame
        // rate, quality, range). It used to fire FM.storage.exportFile() the instant you tapped, which
        // silently downloaded a .fmotion.json project file: no options, and not what "Export" means to
        // anyone. Rendering video needs the scene and its media actually loaded, so this opens the
        // project first and leaves you in it — you are exporting THAT project, so that is where you
        // should be standing.
        { label: 'Export video…', action: async () => {
          const ok = await openProject(p.id);
          if (!ok) { if (FM.toast) FM.toast('Busy opening a project — try again'); return; }
          // let the editor finish laying out before the dialog measures the project for its presets
          setTimeout(() => { if (FM.showExportDialog) FM.showExportDialog(); }, 260);
        } },
        // the project FILE (.fmotion.json) is a different thing — a backup you can re-import — so it
        // keeps its own entry, and still exports without stealing the OPEN badge from your project
        { label: 'Save project file…', action: async () => {
          const prev = FM.projects.currentId();
          const ok = await openProject(p.id, true);
          if (!ok) { if (FM.toast) FM.toast('Busy opening a project — try again'); return; }   // switch was skipped (another open in flight): exporting now would serialize the WRONG scene
          await FM.storage.exportFile();
          if (prev && prev !== p.id) { await openProject(prev, true); render(); }
        } },
        { sep: true },
        { label: 'Delete…', danger: true, action: async () => {
          if (!confirm('Delete "' + (p.name || 'Untitled') + '"? This cannot be undone.')) return;
          await FM.projects.remove(p.id); render();
        } },
      ]);
    });
    const body = el('div', 'hm-body');
    body.appendChild(name); body.appendChild(meta); body.appendChild(sub);
    card.appendChild(th); card.appendChild(body);
    if (!selectMode) card.appendChild(more);   // the ⋯ menu is redundant while selecting (the check owns that corner)
    // The open project's travelling glint (Ezra: "make it so the project that's open, along the border
    // of it has a moving glint that follows around it"). It is a light running around the card's EDGE,
    // not a glow on the card, so it can be obvious without changing the contrast of anything you read.
    // Added last so it paints over the thumb and the ⋯, and marked aria-hidden — the OPEN badge on the
    // thumbnail is what carries this meaning for a screen reader; this is the same fact, in light.
    // The <i> is the part that spins; .hm-glint masks it down to a 1.5px ring (see styles.css).
    if (isOpen) FM.glintRing(card, 'hm-glint');
    // Select, the ticks, the hold and the drag-paint all come from selectify now (v6.17) — this block
    // used to hold its own copy, which is exactly why the other two tabs never had any of it.
    // projectCard doesn't use the return value: its ⋯ is appended above, under its own `!selectMode`.
    selectify(card, th, p.id, () => openProject(p.id, false, card));
    keyActivate(card);
    return card;
  }

  /* ---------- paint-select: drag across cards to select a run of them ---------------------------
   * Same gesture the timeline uses on track heads, so it feels like one app: the selection this
   * drag makes is always the SPAN anchor→current card, which means dragging back the way you came
   * un-selects what you passed instead of forcing you to undo it by hand. Cards ticked before the
   * gesture started are never disturbed.
   *
   * Deliberately does NOT re-render while dragging — render() rebuilds the grid, which would detach
   * the card under your finger mid-gesture. Classes are painted straight onto the elements and the
   * bar is reconciled on release.
   */
  let paint = null;
  function cardEls() { return grid ? [].slice.call(grid.querySelectorAll('.hm-card[data-pid]')) : []; }
  function paintClasses() {
    cardEls().forEach(el => {
      const on = selected.has(el.dataset.pid);
      el.classList.toggle('hm-sel', on);
      const chk = el.querySelector('.hm-check');
      if (chk) { chk.classList.toggle('on', on); chk.textContent = on ? '✓' : ''; }
    });
  }
  function beginPaint(id, y) {
    const ids = cardEls().map(el => el.dataset.pid);
    const anchor = ids.indexOf(id);
    if (anchor < 0) return;
    paint = { ids: ids, anchor: anchor, pre: new Set(selected), last: anchor, moved: false, y: y, raf: 0 };
    // The cards' own pointerup only fires when you release ON the card you started from. Releasing
    // over a gap, over the select bar, or outside the grid left `paint` alive with its auto-scroll
    // rAF still running — the list kept scrolling by itself and the next tap painted a range.
    paint.onUp = function () { endPaint(); };
    window.addEventListener('pointerup', paint.onUp);
    window.addEventListener('pointercancel', paint.onUp);
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
  }
  function paintTo(clientY) {
    if (!paint) return;
    const els = cardEls();
    // Use each card's vertical band rather than elementFromPoint, so sliding sideways off the card
    // (or past the ends of the list) keeps extending the range instead of stalling.
    let idx = paint.last;
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) { idx = i; break; }
      if (i === 0 && clientY < r.top) idx = 0;
      if (i === els.length - 1 && clientY > r.bottom) idx = els.length - 1;
    }
    paint.last = idx;
    const lo = Math.min(paint.anchor, idx), hi = Math.max(paint.anchor, idx);
    selected.clear();
    paint.pre.forEach(v => selected.add(v));           // pre-existing ticks survive untouched
    for (let i = lo; i <= hi; i++) selected.add(paint.ids[i]);
    paintClasses();
    renderSelBar();
  }
  // Auto-scroll when the finger sits near the top/bottom of the list, so a long run is reachable.
  function paintAutoScroll() {
    if (!paint) return;
    const sc = root && root.querySelector('.hm-scroll');
    if (sc) {
      const r = sc.getBoundingClientRect(), EDGE = 56;
      let d = 0;
      if (paint.y < r.top + EDGE) d = -(EDGE - (paint.y - r.top));
      else if (paint.y > r.bottom - EDGE) d = EDGE - (r.bottom - paint.y);
      if (d) { sc.scrollTop += d * 0.35; paintTo(paint.y); }
    }
    paint.raf = requestAnimationFrame(paintAutoScroll);
  }
  function endPaint() {
    if (!paint) return;
    if (paint.raf) cancelAnimationFrame(paint.raf);
    if (paint.onUp) { window.removeEventListener('pointerup', paint.onUp); window.removeEventListener('pointercancel', paint.onUp); }
    const did = paint.moved;
    paint = null;
    // `_paintedAway` exists to swallow the click that ends a drag — but that click lands on the card
    // you RELEASED over, so the flag on the card the drag STARTED from was never cleared and quietly
    // ate a genuine tap on it later. Clear them all once the click has had its turn (a 0ms timeout
    // runs after the click event that follows pointerup).
    setTimeout(function () { cardEls().forEach(function (el) { el._paintedAway = false; }); }, 0);
    renderSelBar();
    return did;
  }

  function toggleSel(id) {
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    // update the tapped card IN PLACE — a full render() rebuilt the whole grid and re-fetched every
    // thumbnail from IndexedDB per tick (each card flashing its ▶ placeholder) on a big library
    const card = grid && grid.querySelector('.hm-card[data-pid="' + id + '"]');
    if (card) {
      const on = selected.has(id);
      card.classList.toggle('hm-sel', on);
      const chk = card.querySelector('.hm-check');
      if (chk) { chk.classList.toggle('on', on); chk.textContent = on ? '✓' : ''; }
    }
    renderSelBar();
  }
  function enterSelect(preId) { selectMode = true; selected.clear(); if (preId) selected.add(preId); render(); }
  function exitSelect() { selectMode = false; selected.clear(); const b = document.getElementById('hm-selbar'); if (b) b.remove(); render(); }

  // Bottom action bar shown while selecting: Delete (n) · Duplicate (n) · Select all · Cancel.
  /* Per-tab from v5.04. Everything here used to be hardwired to FM.projects, which was safe only
   * because Select could not be entered anywhere else. Now that it can, each action has to resolve
   * against the list actually on screen — otherwise "Delete 3" on the Templates tab would have gone
   * looking for three template ids in the PROJECT store. */
  function selKind() {
    if (tab === 'tutorials') return null;   // nothing selectable on the placeholder tab
    if (tab === 'templates') return { noun: 'template', store: FM.templates, canDuplicate: false };
    if (tab === 'elements') return { noun: 'element', store: FM.elements, canDuplicate: false };
    return { noun: 'project', store: FM.projects, canDuplicate: true };
  }
  /* One empty state for all three tabs (v5.30). It used to be a single line of 13px italic
     --text-faint pinned to the TOP of the tab body: measured at 380x820 that was a 26px paragraph
     followed by 517px of dead background, and at 1440x900 a single 11px line above a 611px void —
     99.1% of the body empty. It read as a broken page rather than an empty one, and it is the first
     thing a new user sees on two of the three tabs.
     A mark, a bold title and one short line, centred by the CSS below. The Elements copy was five
     lines of explainer; centring five lines of small italic would not have helped, so it is trimmed
     to the sentence that actually says what an element IS. */
  function emptyState(mark, title, line) {
    const box = el('div', 'hm-empty');
    box.appendChild(el('div', 'hm-empty-mark', mark));
    box.appendChild(el('div', 'hm-empty-title', title));
    const p = document.createElement('p');
    p.textContent = line;
    box.appendChild(p);
    return box;
  }

  function renderSelBar() {
    let bar = document.getElementById('hm-selbar');
    if (!selectMode) { if (bar) bar.remove(); return; }
    if (!bar) { bar = el('div', 'hm-selbar'); bar.id = 'hm-selbar'; root.appendChild(bar); }
    bar.innerHTML = '';
    const K = selKind();
    const n = selected.size;
    const count = el('span', 'hm-selcount', n + ' selected');
    const all = el('button', 'hm-selbtn', 'Select all');
    // "all" = everything CURRENTLY LISTED — with a search active, ticking things you can't see (and
    // then hitting Delete) would be a nasty surprise. No fallback to a store's full list any more:
    // an empty shownIds now means the grid is genuinely empty, and "select all of nothing" is
    // nothing. The old `|| FM.projects.list()` fallback was the trap that made this dangerous.
    all.addEventListener('click', () => { shownIds.forEach(id => selected.add(id)); renderSelBar(); render(); });
    const dup = el('button', 'hm-selbtn', 'Duplicate');
    dup.disabled = !n;
    dup.addEventListener('click', async () => { if (!n) return; const ids = [...selected]; if (FM.toast) FM.toast('Duplicating ' + ids.length + '…'); for (const id of ids) await FM.projects.duplicate(id); exitSelect(); });
    const del = el('button', 'hm-selbtn danger', 'Delete');
    del.disabled = !n;
    del.addEventListener('click', async () => {
      if (!n) return; let ids = [...selected];
      if (!confirm('Delete ' + ids.length + ' ' + K.noun + (ids.length === 1 ? '' : 's') + '? This cannot be undone.')) return;
      if (FM.toast) FM.toast('Deleting ' + ids.length + '…');
      if (K.noun === 'project') {
        // delete the CURRENTLY-OPEN project LAST: remove() does a full project-switch (media decode +
        // refreshAll) whenever it deletes the open one, so deleting it first made every other doomed
        // project get fully opened in turn — order it last so that expensive switch happens once.
        const cur = FM.projects.currentId();
        ids = ids.sort((a, b) => (a === cur ? 1 : 0) - (b === cur ? 1 : 0));
      }
      for (const id of ids) await K.store.remove(id);
      exitSelect();
    });
    const cancel = el('button', 'hm-selbtn', 'Cancel');
    cancel.addEventListener('click', exitSelect);
    bar.appendChild(count); bar.appendChild(el('span', 'hm-selspacer')); bar.appendChild(all);
    // Duplicate is projects-only: neither FM.templates nor FM.elements has one, and a button that
    // throws is worse than a button that isn't there.
    if (K.canDuplicate) bar.appendChild(dup);
    bar.appendChild(del); bar.appendChild(cancel);
  }

  /* Everything a card needs to take part in Select, factored out of projectCard so templates and
   * elements behave identically instead of approximately (v5.04). Three things have to move together
   * or Select looks broken: the tick, the outline, and the click. The fourth — hiding ⋯ — matters
   * because the check occupies that corner, and two overlapping controls in one corner on a phone is
   * a coin flip about which one you hit. */
  function selectify(card, th, id, defaultAction) {
    /* THE ID STAMP. Everything that updates a card in place finds it with
     * `.hm-card[data-pid="<id>"]` — toggleSel, paintClasses, cardEls, the hold path's `live` lookup.
     * Only projectCard used to set it, so on the Templates and Elements tabs (v6.17, Ezra:
     * "Selecting templates and elements doesnt work properly") a tap in select mode went into the
     * `selected` set and updated the count on the bar, and then failed to find the card — no tick, no
     * outline, nothing on screen. The state was right and the screen was wrong, which is the worst of
     * the two, because the next thing you press is Delete. */
    card.dataset.pid = id;
    if (selectMode) {
      if (selected.has(id)) card.classList.add('hm-sel');
      th.appendChild(el('span', 'hm-check' + (selected.has(id) ? ' on' : ''), selected.has(id) ? '✓' : ''));
    }
    card.addEventListener('click', () => {
      if (card._paintedAway) { card._paintedAway = false; cancelPress(card); return; }   // that "click" was the end of a drag-select
      if (selectMode) { cancelPress(card); toggleSel(id); } else defaultAction();
    });
    /* …and the GESTURES, which lived in projectCard and so existed on one tab in three (v6.17).
     * On Projects you could hold a card to enter Select and drag across to take a run; on Templates
     * and Elements neither did anything, so the only way in was the header button and the only way to
     * pick five was five taps. This function's whole reason for existing is that the three tabs
     * "behave identically instead of approximately" — the gesture is part of behaving. */
    let holdTimer = null, downY = 0, downX = 0;
    card.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      if (ev.target.closest && ev.target.closest('.hm-card-more')) return;   // the ⋯ stays a button
      downX = ev.clientX; downY = ev.clientY;
      if (selectMode) { beginPaint(id, ev.clientY); }
      else {
        setPress(card);   // synchronous, on THIS frame — the press is the tap's only acknowledgement until the project has loaded
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
          holdTimer = null;
          if (!card.isConnected) return;
          cancelPress(card);   // a HOLD is not a tap: the render below throws this node away, so let the press go with it rather than leaving pressEl pointing at a detached card
          selectMode = true; selected.clear(); selected.add(id);
          document.body.classList.add('hm-selecting');
          render();                                   // one rebuild to draw the checks, BEFORE painting starts
          beginPaint(id, downY);
          if (paint) {
            paint.moved = true;
            paint.y = downY;
            // render() above replaced this card, so `card` is now a detached node — flag the LIVE one
            // (whichever node the follow-up click actually lands on) or the release immediately
            // un-ticks the thing you just held to select.
            const live = grid && grid.querySelector('.hm-card[data-pid="' + id + '"]');
            if (live) live._paintedAway = true;
            card._paintedAway = true;
            // Arm the auto-scroll here too. The pointermove branch below only starts it on the
            // moved:false → true transition, and this path has already set moved — so entering select
            // mode by HOLD and then dragging to the edge of the list never scrolled.
            paint.raf = requestAnimationFrame(paintAutoScroll);
            paintClasses(); renderSelBar();
          }
        }, 380);
      }
    });
    card.addEventListener('pointermove', (ev) => {
      if (holdTimer && Math.hypot(ev.clientX - downX, ev.clientY - downY) > 10) { clearTimeout(holdTimer); holdTimer = null; }
      // a drag is a scroll, not a tap — let go of the press the moment it stops being one
      if (pressEl === card && Math.hypot(ev.clientX - downX, ev.clientY - downY) > 10) cancelPress(card);
      if (!paint) return;
      if (!paint.moved && Math.hypot(ev.clientX - downX, ev.clientY - downY) < 8) return;   // still a tap, not a drag
      if (!paint.moved) { paint.moved = true; card._paintedAway = true; paint.raf = requestAnimationFrame(paintAutoScroll); }
      ev.preventDefault();
      paint.y = ev.clientY;
      paintTo(ev.clientY);
    });
    const finish = () => { clearTimeout(holdTimer); holdTimer = null; endPaint(); };
    // The release deliberately does NOT let go of the press: click fires next, and the push takes the
    // card over from the same scale, so unpressing here would flash it back to full size first. The
    // timer is the escape hatch for a tap that never opens anything (a second tap during a load, a
    // release that turned out to be the end of a drag-select).
    card.addEventListener('pointerup', () => { finish(); releasePress(card); });
    card.addEventListener('pointercancel', () => { finish(); cancelPress(card); });
    return !selectMode;   // caller uses this to decide whether to append its ⋯ button
  }

  function templateCard(t) {
    const card = el('div', 'hm-card');   // div not button — same nested-button fix as projectCard
    card.setAttribute('role', 'button'); card.tabIndex = 0;
    const th = el('div', 'hm-thumb');
    if (t.thumb) { const img = document.createElement('img'); img.src = t.thumb; img.alt = ''; th.appendChild(img); }
    else th.appendChild(el('span', 'hm-thumb-empty', '❖'));
    th.appendChild(el('span', 'hm-dur', fmtDur(t.duration)));
    if (isPinned('templates', t.id)) { th.appendChild(pinBadge()); card.classList.add('is-pinned'); }
    card.appendChild(th);
    const body = el('div', 'hm-body');
    body.appendChild(el('div', 'hm-name', t.name || 'Template'));
    body.appendChild(el('div', 'hm-meta', aspectLabel(t.width, t.height)));
    card.appendChild(body);
    const more = el('button', 'hm-card-more', '⋯');
    more.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = more.getBoundingClientRect();
      FM.contextMenu.show(Math.min(r.left, window.innerWidth - 210), r.bottom + 4, [
        { label: 'New project from template', action: use },
        pinMenuItem('templates', t.id),
        { sep: true },
        { label: 'Delete template…', danger: true, action: async () => { if (!confirm('Delete template "' + t.name + '"?')) return; await FM.templates.remove(t.id); render(); } },
      ]);
    });
    more.setAttribute('aria-label', 'Template actions');
    async function use() {
      holdPress();   // building a project out of a template is the same long async wait as opening one
      if (FM.toast) FM.toast('Creating project…');
      try {
        const ok = await FM.templates.useAsNew(t.id);
        if (ok) FM.home.close({ push: true, lead: card }); else if (FM.toast) FM.toast('Could not load that template');
      } finally { clearPress(true); }   // eased: on the push path startPush already took it, so this only runs when nothing happened
    }
    if (selectify(card, th, t.id, use)) card.appendChild(more);
    keyActivate(card);
    return card;
  }

  // An ELEMENT is a saved bundle of layers — a watermark, a logo, a lower-third — that you drop into
  // any edit instead of rebuilding it or hunting for the project you made it in. Its card leads with
  // INSERT, because that is the entire point of the thing; a template's leads with "new project".
  function elementCard(e) {
    const card = el('div', 'hm-card');   // div not button — same nested-button fix as projectCard
    card.setAttribute('role', 'button'); card.tabIndex = 0;
    const th = el('div', 'hm-thumb');
    if (e.thumb) { const img = document.createElement('img'); img.src = e.thumb; img.alt = ''; th.appendChild(img); }
    else th.appendChild(el('span', 'hm-thumb-empty', '✦'));
    if (isPinned('elements', e.id)) { th.appendChild(pinBadge()); card.classList.add('is-pinned'); }
    card.appendChild(th);
    const body = el('div', 'hm-body');
    body.appendChild(el('div', 'hm-name', e.name || 'Element'));
    const n = e.count || 0;
    body.appendChild(el('div', 'hm-meta', n + (n === 1 ? ' layer' : ' layers')));
    card.appendChild(body);
    const more = el('button', 'hm-card-more', '⋯');
    more.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = more.getBoundingClientRect();
      FM.contextMenu.show(Math.min(r.left, window.innerWidth - 210), r.bottom + 4, [
        { label: 'Add to the open project', action: use },
        pinMenuItem('elements', e.id),
        { sep: true },
        { label: 'Delete element…', danger: true, action: async () => { if (!confirm('Delete element "' + e.name + '"?')) return; await FM.elements.remove(e.id); render(); } },
      ]);
    });
    more.setAttribute('aria-label', 'Element actions');
    async function use() {
      // Elements go INTO a project, so there has to be one open. Home is reachable with no project
      // loaded (first run, or after deleting the last one) — say so rather than failing silently.
      if (!FM.projects.currentId || !FM.projects.currentId()) {
        cancelPress(card);
        if (FM.toast) FM.toast('Open a project first, then add the element', 2200);
        return;
      }
      holdPress();   // inserting an element decodes its media too — same wait, same press to hold
      try {
        const ok = await FM.elements.insert(e.id);
        if (ok) { FM.home.close({ push: true, lead: card }); if (FM.toast) FM.toast('Added “' + e.name + '”'); }
        else if (FM.toast) FM.toast('That element’s data is missing — save it again');
      } finally { clearPress(true); }
    }
    if (selectify(card, th, e.id, use)) card.appendChild(more);
    keyActivate(card);
    return card;
  }

  // The + button is per-TAB (Ezra: "the templates and elements sections should actually work when you
  // press the create button, rn if you press the create button it creates a project not a template").
  // Templates and elements are both made FROM a project, so both routes pick one — there is nothing
  // else they could sensibly mean, and the alternative (a + that silently makes a project while you
  // are looking at a list of templates) is the bug being fixed.
  function pickProject(title, then) {
    const list = FM.projects.list();
    if (!list.length) { if (FM.toast) FM.toast('Make a project first — templates and elements are saved from one'); return; }
    const items = list.slice(0, 14).map(p => ({ label: p.name || 'Untitled', action: () => then(p) }));
    const btn = document.getElementById('hm-new'), r = btn.getBoundingClientRect();
    FM.contextMenu.show(Math.max(8, Math.min(r.left - 150, window.innerWidth - 230)), Math.max(8, r.top - 12 - Math.min(14, items.length) * 34),
      [{ label: title, disabled: true }, { sep: true }].concat(items));
  }
  function newFromTab() {
    if (tab === 'templates') {
      pickProject('Save which project as a template?', async (p) => {
        const name = prompt('Template name:', p.name || 'Template'); if (!name || !name.trim()) return;
        const ok = await FM.templates.save(name.trim(), p.id);
        if (FM.toast) FM.toast(ok ? 'Saved template “' + name.trim() + '”' : 'Could not save that template');
        render();
      });
      return;
    }
    if (tab === 'elements') {
      // Two ways in. Until now you could only turn EXISTING work into an element (Ezra: "in alight
      // motion you can create elements, in this you can only turn stuff into elements"), so the first
      // entry builds one from nothing: a square, transparent canvas — the shape a watermark, logo or
      // sticker actually wants — which you then save from its own ⋯ menu.
      const nb = document.getElementById('hm-new'), nr = nb.getBoundingClientRect();
      FM.contextMenu.show(Math.max(8, Math.min(nr.left - 150, window.innerWidth - 240)), Math.max(8, nr.top - 96), [
        { label: 'New element', disabled: true }, { sep: true },
        { label: 'Build a new one…', action: async () => {
          const name = prompt('Element name:', 'My element'); if (!name || !name.trim()) return;
          const pid = await FM.projects.create({ name: name.trim(), width: 1080, height: 1080 });
          if (!pid) { if (FM.toast) FM.toast('Could not create that'); return; }
          FM.scene.project.background = null;   // transparent: an element drops onto whatever is under it
          if (FM.storage) { FM.storage.markDirty(); FM.storage.save(); }
          FM.home.close({ push: true });
          if (FM.toast) FM.toast('Build it, then Home → this project’s ⋯ → Save as element…', 4200);
        } },
        { label: 'From an existing project…', action: () => {
          pickProject('Save which project as an element?', async (p) => {
            const name = prompt('Element name:', p.name || 'Element'); if (!name || !name.trim()) return;
            const ok = await FM.elements.saveFromProject(p.id, name.trim());
            if (FM.toast) FM.toast(ok ? 'Saved element “' + name.trim() + '”' : 'Could not save that element');
            render();
          });
        } },
      ]);
      return;
    }
    newProjectDialog();
  }

  // `lead` is the card you tapped, if you tapped one — it leads the push out (see the push block at
  // the top of the file). The push starts HERE rather than on the tap because the editor sliding in
  // has to be showing the project you asked for; starting it earlier would slide in the previous
  // project and swap its contents mid-flight. The card's press state covers the wait.
  async function openProject(id, keepOpen, lead) {
    // A second tap while the first project's media is still decoding is IGNORED — the tap AND its
    // press. (Two overlapping open() loads leaked media and raced refreshAll, which is why the tap is
    // dropped at all.) It used to clearPress() here, which threw away the press the FIRST tap is
    // still holding, and the card the user is waiting on went dead. Measured at 380x780 with a
    // 1200ms open — same card tapped twice: press on at 33ms, gone at 739ms, 619ms of dead screen,
    // then the push snapped it back to scale(.965) in ONE frame at 1358ms. A different card tapped
    // was worse: the press moved to card B at 656ms, died 100ms later, and card A — the one actually
    // loading — sat at rest for 717ms before popping. The card that is loading keeps the press; the
    // second tap gets nothing, which is the truth of what the app is doing.
    // …but only for as long as that first open is plausibly still running. An open whose promise
    // never settles at all would otherwise wall the home screen off permanently — see openAbandoned.
    if (_opening && !openAbandoned()) return false;
    _opening = true; _openingAt = Date.now();
    holdPress();   // this open now owns the press — no release timer, and no other card, may take it
    /* THE CARD LEAVES ON THE TAP (queue 128). Everything below used to happen after `await open(id)`,
     * so nothing on screen could move until the project had loaded: 113ms of dead time at phone speed
     * on a four-layer project, growing with the project. Phase 1 goes first and phase 2 waits for the
     * load — see armPushIn.
     * Only when a push is actually going to play. On desktop close() hides home instantly, and
     * starting THAT before the load would show the previous project for the whole load, which is the
     * artefact this split exists to avoid rather than cause. */
    const needsLoad = id !== FM.projects.currentId();
    const split = !keepOpen && needsLoad && FM.home.pushWillRun && FM.home.pushWillRun();
    let phase1 = false;
    if (split) {
      FM.home.close({ push: true, lead: lead, wait: true });
      // close() reports nothing, and startPush can decline (no #app, a reduced-motion path, the gate).
      // The class is the honest answer to "did phase 1 actually happen?".
      const _a = document.getElementById('app');
      phase1 = !!(_a && _a.classList.contains('fm-push-wait'));
    }
    try {
      if (needsLoad) await FM.projects.open(id);
      // Opening a project restores its media from IndexedDB, so the same not-yet-decoded window applies
      // — arguably more so, since it is every clip at once rather than one (queue 201).
      if (FM.loadingDot) FM.loadingDot.check();
      // Phase 2, or the ordinary one-shot close when there was no phase 1 (desktop, keepOpen, or a
      // push that declined to start). armPushIn reports false if there is nothing waiting, so a
      // phase 1 that quietly did not happen still gets a real close rather than being stranded.
      if (!keepOpen && !(phase1 && FM.home.armPushIn())) FM.home.close({ push: true, lead: lead });
      return true;   // callers (e.g. Export) need to know the switch actually happened, not got skipped
    } catch (e) {
      // The load failed with the home screen already half-way out. Put it back, rather than leave it
      // dimmed at -24% with the editor parked off-screen and nothing ever arriving.
      if (phase1) { try { FM.home.abortPush(); } catch (e2) {} }
      throw e;
    } finally {
      _opening = false;
      // Every way out: the push started (startPush already took the press, so this is a no-op), or
      // keepOpen meant there was never going to be one, or open() threw. None of them may leave it on.
      clearPress(true);
    }
  }

  // ids visible in the grid right now, whichever tab is showing (search-aware; Select-all uses it).
  // It MUST be filled on every tab, not just projects. Two things read it and both fail dangerously
  // if it is stale: pruneSelection() drops every tick whose id isn't in here, and Select-all falls
  // back to FM.projects.list() when it is empty — so on the Templates tab an unfilled shownIds would
  // have made "Select all" tick your PROJECTS and Delete destroy them.
  let shownIds = [];
  let introShown = false, introPending = false, introTimer = 0;   // the once-per-session entry stagger (see stampIntro)
  // A tick only counts while you can SEE the card. Without this, selecting three projects and then
  // typing a search would leave "3 selected" on the bar and Delete would take three projects that
  // are no longer on screen — the exact surprise the Select-all guard exists to prevent.
  function pruneSelection() {
    if (!selectMode || !selected.size) return;
    const live = new Set(shownIds);
    [...selected].forEach(id => { if (!live.has(id)) selected.delete(id); });
  }
  function render() {
    if (!grid) return;
    ensureStaticTile();   // one-time; the CSS vars it sets are what #hm-grain draws
    /* Give the background its pair of fields to dissolve between (queue 157). Two DIFFERENT tiles, or
       the cross-fade has nothing to cross to and the grain sits perfectly still. */
    const gEl = document.getElementById('hm-grain');
    if (gEl && !gEl._tiled && staticURL) {
      gEl._tiled = 1;
      // With exactly two tiles there is nothing to choose between — it is 0 and 1. The random pick
      // this used to make was for six tiles and would now sometimes have picked the same one twice.
      gEl.style.setProperty('--hm-grain-a', 'var(--hm-static-0)');
      gEl.style.setProperty('--hm-grain-b', 'var(--hm-static-1)');
    }
    // Select works on EVERY tab now (v5.04). What does NOT survive a tab change is the SELECTION —
    // ids are only meaningful within their own list, and carrying three ticked project ids into the
    // Templates tab is how "delete 3" ends up deleting the wrong three things. The tab handler
    // clears the set; the MODE stays on, which is what you want when you're tidying up two lists.
    document.body.classList.toggle('hm-selecting', selectMode);   // CSS hands card drags to paint-select instead of scrolling
    grid.innerHTML = '';
    shownIds = [];
    root.querySelectorAll('.hm-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    // header Select toggle (built once, kept in sync)
    const selBtn = document.getElementById('hm-select-btn');
    if (selBtn) { selBtn.textContent = selectMode ? 'Done' : 'Select'; selBtn.style.display = ''; }
    // the + means something different on each tab — say which, so it isn't a mystery button
    const newBtn = document.getElementById('hm-new');
    // Nothing to create on the Tutorials tab, so the + hides rather than making a project from a
    // screen that has no projects on it.
    if (newBtn) { newBtn.style.display = (tab === 'tutorials') ? 'none' : ''; newBtn.setAttribute('aria-label', tab === 'templates' ? 'New template' : tab === 'elements' ? 'New element' : 'New project'); }
    if (tab === 'projects') {
      // Order follows Settings → Project sorting: most recently EDITED first (so the project you
      // just worked on is the front card), or plain A–Z by name.
      const byName = FM.settings && FM.settings.get('sort') === 'name';
      // …then pinned cards are lifted to the front, keeping that order inside each block (queue 138).
      // Deliberately NOT applied to the search results below: when you have typed a query you want the
      // best MATCH first, and a pinned project outranking a closer one would read as the search being
      // broken. Pins are about the resting order of the list, not about relevance.
      const list = pinSort('projects', FM.projects.list().slice().sort(byName
        ? (a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' })
        : (a, b) => (b.modified || 0) - (a.modified || 0)), p => p.id);
      if (query) {
        if (!list.length) { grid.appendChild(emptyState('▶', 'No projects yet', 'Tap + to start one.')); renderSelBar(); return; }
        const range = parseDateQuery(query);
        const scored = list.map(p => { const r = scoreProject(p, query, range); return { p: p, score: r.score, exact: r.exact, why: r.why }; })
          .sort((a, b) => (b.score - a.score) || ((b.p.modified || 0) - (a.p.modified || 0)));
        const strong = scored.filter(x => x.exact);
        const shown = strong.length ? strong : scored.slice(0, 5);   // never a dead end: fall back to the closest few
        grid.appendChild(el('div', 'hm-note', strong.length
          ? (strong.length + (strong.length === 1 ? ' match' : ' matches') + (range ? ' for that date' : '') + ' — best first')
          : 'Nothing matched “' + query + '” exactly. Closest projects:'));
        shown.forEach(x => { shownIds.push(x.p.id); grid.appendChild(projectCard(x.p, x.why || undefined)); });
        pruneSelection();
        renderSelBar();
        return;
      }
      if (!list.length) grid.appendChild(emptyState('▶', 'No projects yet', 'Tap + to start one.'));
      // gentle housekeeping nudge on a big library (thumbs are out of the hot path now, so this is
      // informational — never a "you must delete to fix lag" like some other editors)
      const h = FM.projects.health && FM.projects.health();
      if (h && h.level !== 'ok' && !selectMode) {
        const msg = h.level === 'full'
          ? 'You have ' + h.count + ' projects. Things still run fast — but tap Select to tidy up any you don’t need.'
          : 'You have ' + h.count + ' projects. Tap Select to bulk-delete or duplicate.';
        grid.appendChild(el('div', 'hm-note', msg));
      }
      list.forEach(p => { shownIds.push(p.id); grid.appendChild(projectCard(p)); });
      pruneSelection();
    } else if (tab === 'tutorials') {
      // Nothing here yet ON PURPOSE — the tab is a placeholder Ezra asked for so the lessons have
      // somewhere to land later. The copy says "coming", not "none found", because an empty state that
      // reads like a failure is worse than no tab at all.
      grid.appendChild(emptyState('▷', 'Tutorials are coming', 'Short walkthroughs of the editor will live here.'));
    } else if (tab === 'templates') {
      let list = pinSort('templates', FM.templates.list(), t => t.id);
      if (query && list.length) {
        // templates carry no dates — name matching only, same forgiving scorer
        const scored = list.map(t => ({ t: t, score: nameScore(t.name, query) })).sort((a, b) => b.score - a.score);
        const strong = scored.filter(x => x.score >= 0.45);
        const shown = strong.length ? strong : scored.slice(0, 5);
        grid.appendChild(el('div', 'hm-note', strong.length ? (strong.length + (strong.length === 1 ? ' match' : ' matches') + ' — best first') : 'Nothing matched “' + query + '” exactly. Closest templates:'));
        shown.forEach(x => { shownIds.push(x.t.id); grid.appendChild(templateCard(x.t)); });
        renderSelBar();
        return;
      }
      if (!list.length) grid.appendChild(emptyState('◱', 'No templates yet', 'Tap + to save a project as one, or use a project’s ⋯ menu.'));
      list.forEach(t => { shownIds.push(t.id); grid.appendChild(templateCard(t)); });
    } else {
      // ELEMENTS — same shape as the templates branch, including the forgiving name search.
      let list = pinSort('elements', FM.elements.list(), e => e.id);
      if (query && list.length) {
        const scored = list.map(e => ({ e: e, score: nameScore(e.name, query) })).sort((a, b) => b.score - a.score);
        const strong = scored.filter(x => x.score >= 0.45);
        const shown = strong.length ? strong : scored.slice(0, 5);
        grid.appendChild(el('div', 'hm-note', strong.length ? (strong.length + (strong.length === 1 ? ' match' : ' matches') + ' — best first') : 'Nothing matched “' + query + '” exactly. Closest elements:'));
        shown.forEach(x => { shownIds.push(x.e.id); grid.appendChild(elementCard(x.e)); });
        renderSelBar();
        return;
      }
      if (!list.length) grid.appendChild(emptyState('◇', 'No elements yet', 'An element is a saved piece — a watermark, a logo, a lower-third — that you drop into any edit.'));
      list.forEach(e => { shownIds.push(e.id); grid.appendChild(elementCard(e)); });
    }
    renderSelBar();
    if (introPending) { introPending = false; stampIntro(); }
  }

  /* First-open entry animation (v4.92). Ezra: "when all the projects and things on screen are loading
   * for the first time after the transition, they load by fading in from bottom to top, don't do like
   * a wave transition that effects everything but every individual project and then option fades in."
   *
   * So the delay is stamped per ELEMENT rather than animating one container — the top-bar buttons
   * first, then the tabs, then each card, then the + last, each on its own beat. Reading order, which
   * is also the order they'd assemble if you were building the screen by hand.
   *
   * The step is capped at 14 items: a 40-project library on a 55ms step would take 2.2s to finish
   * arriving, and by then it stops reading as an entrance and starts reading as a slow app. Past the
   * cap everything shares the last beat, which off-screen cards do anyway.
   *
   * Delay goes in a style attribute rather than an nth-child rule because the count is unknown and
   * the cards are rebuilt on every render — CSS can't see how many there are. */
  /* WHEN the entry plays, as opposed to what it does.
   *
   * On a cold launch the splash video covers the screen for ~3s, and home.open() runs the moment the
   * scripts finish — so the first version of this played the entire stagger behind an opaque splash
   * and was finished 200ms BEFORE the dissolve even started (measured: intro done at t=2101ms, fade
   * began at t=2281ms). Nobody ever saw it. It now waits for the splash's own dismiss event and
   * starts 150ms into the dissolve, while the black is still ~95% up — so the cards rise in through
   * the clearing black rather than being revealed already in place.
   *
   * No splash (same-session reload, reduced motion, a skipped launch) → run immediately.
   * The 6s fallback covers a splash that is torn down some other way; go() is idempotent. */
  // Is there a splash still to come down? Present-but-hidden and mid-dissolve both mean NO, and
  // getting that wrong is what blanked the home screen (see the comment in armIntro). Its own
  // function so the regression test can put the DOM in each state and call the real thing, rather
  // than re-implementing the condition and asserting against its own copy.
  function splashIsUp() {
    const sp = document.getElementById('splash');
    return !!sp && !sp.classList.contains('hidden') && !sp.classList.contains('splash-out');
  }

  function armIntro() {
    if (!root) return;
    // "Is there a splash to wait for?" — and that is NOT the same question as "does #splash exist".
    // The boot script plays the splash ONCE PER SESSION (sessionStorage 'fm.splashed'), and on a
    // repeat load it returns before `sp.classList.remove('hidden')`, so the element is still sitting
    // in the DOM — hidden, display:none, with no listeners, no timers, and no dismiss() ever wired
    // up. Testing for the element alone took the "splash is up" branch on every one of those loads:
    // .hm-preintro went on (which is `opacity: 0` for every child of #home-screen) and the code then
    // waited for an fm:splash-dismiss that nothing would ever dispatch. The 6s backstop eventually
    // cleared it, so the symptom was a home screen that was INVISIBLE BUT STILL CLICKABLE for six
    // seconds — Ezra: "when i exit a project nothing loads, i can still press on the screen and load
    // projects but they just arent visibly there… it happens if i refresh while in a project."
    // (Refreshing inside a project is what separates the two cases: home is not opened at boot, so
    // this runs for the first time later, on the way OUT of the project, long after the splash slot
    // has passed.) `splash-out` is checked too: mid-dissolve the event has already been dispatched,
    // and a listener added after it would wait just as forever.
    if (!splashIsUp()) { introPending = true; return; }   // nothing to wait for → render() stamps
    // Splash is up. Hide the content NOW (see .hm-preintro in styles.css) — leaving it visible is
    // what made the dissolve show a finished screen behind a still-playing logo.
    root.classList.add('hm-preintro');
    let ran = false;
    const go = () => {
      if (ran || !root) return;
      ran = true;
      root.classList.remove('hm-preintro');
      root.classList.add('hm-intro');
      // stamp directly rather than re-rendering: the cards are already built, and a rebuild would
      // re-read every thumbnail out of IndexedDB for nothing
      stampIntro();
    };
    document.addEventListener('fm:splash-dismiss', () => setTimeout(go, 150), { once: true });
    setTimeout(go, 6000);   // a splash torn down some other way must never leave the screen blank
  }

  function stampIntro() {
    if (!root) return;
    const seq = [];
    root.querySelectorAll('.hm-top > *').forEach(n => seq.push(n));
    root.querySelectorAll('.hm-tabs > *').forEach(n => seq.push(n));
    if (grid) Array.prototype.forEach.call(grid.children, n => seq.push(n));
    const step = 0.055, cap = 14;
    seq.forEach((n, i) => {
      if (n._fmNoIntro) return;   // already pushed off this screen — re-stamping would re-attach an entrance delay (queue 222)
      n.classList.add('hm-in');
      n.style.animationDelay = (0.05 + Math.min(i, cap) * step).toFixed(3) + 's';
    });
    const fab = document.getElementById('hm-new');
    if (fab) {
      fab.classList.add('hm-in-fab');
      fab.style.animationDelay = (0.05 + Math.min(seq.length, cap + 1) * step).toFixed(3) + 's';
    }
    // Strip the whole thing once it has played. The class is what arms the animation, so leaving it
    // on would restage the screen on every tab switch and every search keystroke. 2s is past the
    // longest possible finish (0.05 + 15×0.055 delay + 0.55 duration ≈ 1.43s).
    clearTimeout(introTimer);
    introTimer = setTimeout(stripIntro, 2000);
  }

  // Shared by the first-load stagger and the per-tab one (queue 207) — two copies of this would
  // drift, and the one that drifted would leave `hm-intro` on and restage the screen on every
  // keystroke in the search box.
  function stripIntro() {
    if (!root) return;
    root.classList.remove('hm-intro');
    root.querySelectorAll('.hm-in, .hm-in-fab').forEach(n => {
      n.classList.remove('hm-in', 'hm-in-fab');
      n.style.animationDelay = '';
    });
  }

  /* ---- Stagger the CARDS on every tab switch (queue 207) ---------------------------------------
   * His words: "when you open up any of the 4 menus like projects elements etc it does something
   * like the animation when opening the app where all of the spawn in loading from top to bottom."
   *
   * Reuses stampIntro's own class and keyframes rather than a second set, which the entry asks for
   * by name — two sets of entrance animations would drift, and the drifted one is the one you would
   * see most. The differences from first load are deliberate:
   * · only the GRID is stamped. The top bar and the tabs are already on screen and staying there;
   *   restaging them would make the whole page flinch every time you changed tab.
   * · a tighter step and a lower cap. First load is a moment you are watching; a tab switch is one
   *   you are trying to get through, and the entry says to cap it so a long list does not take a
   *   second to finish appearing. 10 × 0.04 = 0.4s to the last card, whatever the count. */
  function stampCards() {
    if (!root || !grid) return;
    root.classList.add('hm-intro');
    const step = 0.04, cap = 10;
    Array.prototype.forEach.call(grid.children, (n, i) => {
      if (n._fmNoIntro) return;   // pushed off this screen already — see queue 222
      n.classList.remove('hm-in');
      n.classList.add('hm-in');
      n.style.animationDelay = (Math.min(i, cap) * step).toFixed(3) + 's';
    });
    clearTimeout(introTimer);
    introTimer = setTimeout(stripIntro, 1200);   // past 0.4s delay + 0.5s duration
  }
  FM._hmStampCards = stampCards;   // read by the suite

  // Search bar show/hide. Closing always clears the query so reopening Home is never mysteriously filtered.
  function toggleSearch(force) {
    const bar = document.getElementById('hm-searchbar'), btn = document.getElementById('hm-search-btn'), inp = document.getElementById('hm-search-input');
    if (!bar || !inp) return;
    const on = force != null ? force : bar.classList.contains('hidden');
    bar.classList.toggle('hidden', !on);
    if (btn) { btn.classList.toggle('on', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false'); }
    // focus SYNCHRONOUSLY inside the tap handler — WebKit only raises the software keyboard for a
    // focus() that still holds the user-gesture token, and a setTimeout callback has lost it
    if (on) { inp.focus(); }
    else {
      inp.value = '';
      const hint = document.querySelector('.hm-search-hint'); if (hint) hint.classList.remove('hidden');
      if (query) { query = ''; render(); }
    }
  }

  /* ---------- new-project dialog: every canvas option up front ---------------------------------
   * Aspect ratio + resolution (or a free custom W×H), frame rate (presets or custom), background
   * colour (or transparent) and the exact pixel size — so a project starts the way you want it
   * instead of being corrected later in Canvas settings. The picks are remembered for next time.
   */
  const NEWP_KEY = 'fm.newproj';
  const NP_ASPECTS = ['9:16', '16:9', '1:1', '4:5', '4:3', 'custom'];   // whitelist: a corrupt remembered value must not reach the a/b maths as NaN
  let npAspect = '9:16', npBg = '#000000', dlgEsc = null;
  const npEl = id => document.getElementById(id);
  const npClampDim = v => Math.max(16, Math.min(7680, Math.round((parseInt(v, 10) || 16) / 2) * 2));   // even + sane bounds, same clamp as Canvas settings
  function npCompute() {
    if (npAspect === 'custom') return { w: npClampDim(npEl('hm-new-w').value), h: npClampDim(npEl('hm-new-h').value) };
    const base = parseInt(npEl('hm-new-res').value, 10) || 1080;
    const pr = npAspect.split(':').map(Number), a = pr[0], b = pr[1];
    let w, h;
    if (a >= b) { h = base; w = base * a / b; } else { w = base; h = base * b / a; }   // the resolution is always the SHORT side
    return { w: Math.round(w / 2) * 2, h: Math.round(h / 2) * 2 };
  }
  function npFps() {
    const sel = npEl('hm-new-fps');
    const raw = (sel && sel.value === 'custom') ? (npEl('hm-new-fps-num') || {}).value : (sel ? sel.value : 30);
    return Math.max(1, Math.min(120, parseInt(raw, 10) || 30));
  }
  function npUpdate() {
    const custom = npAspect === 'custom';
    npEl('hm-new-res-row').classList.toggle('hidden', custom);
    npEl('hm-new-custom-size').classList.toggle('hidden', !custom);
    npEl('hm-new-custom-fps').classList.toggle('hidden', npEl('hm-new-fps').value !== 'custom');
    const dlg = npEl('hm-dialog');
    // aria-pressed too — the accent border is the ONLY selected-state cue otherwise, which tells a
    // screen-reader user (and a colour-blind one, on Black vs Charcoal) nothing at all
    dlg.querySelectorAll('.hm-aspect').forEach(b => { const on = b.dataset.aspect === npAspect; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    dlg.querySelectorAll('.hm-bg-sw').forEach(b => { const on = b.dataset.bg === npBg; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    const s = npCompute();
    npEl('hm-new-size').textContent = s.w + ' × ' + s.h + '  ·  ' + npFps() + ' fps';
  }
  /* Canvas presets saved in the editor (queue 183) offered here, which is the only place they are
     actually worth anything — the point of saving a canvas setup is starting the NEXT project from
     it. Picking one writes the controls below and leaves you on the dialog, so you still name the
     project and still press Create; nothing is created behind your back.
     Names are user text and go in by textContent, never innerHTML. */
  function npApplyPreset(p) {
    npAspect = (p.aspect === 'custom' || NP_ASPECTS.indexOf(p.aspect) >= 0) ? p.aspect : 'custom';
    if (p.res) { const rs = npEl('hm-new-res'); if (rs) { for (let i = 0; i < rs.options.length; i++) if (rs.options[i].value === String(p.res)) rs.value = String(p.res); } }
    npEl('hm-new-w').value = p.w; npEl('hm-new-h').value = p.h;
    const fsel = npEl('hm-new-fps'), fnum = npEl('hm-new-fps-num');
    let listed = false;
    if (fsel) { for (let i = 0; i < fsel.options.length; i++) if (fsel.options[i].value === String(p.fps)) listed = true; }
    if (fsel && listed) fsel.value = String(p.fps); else if (fsel) { fsel.value = 'custom'; if (fnum) fnum.value = p.fps; }
    npBg = p.bg;
    if (/^#[0-9a-f]{6}$/i.test(npBg)) npEl('hm-new-bg').value = npBg;
    npUpdate();
    // A named aspect that does not reproduce the saved pixels falls back to Custom, rather than
    // quietly starting the project at a size the preset never held.
    if (npAspect !== 'custom') { const got = npCompute(); if (got.w !== p.w || got.h !== p.h) { npAspect = 'custom'; npUpdate(); } }
    const row = npEl('hm-np-preset-row');
    if (row) row.querySelectorAll('.hm-np-chip').forEach(c => {
      const on = c.dataset.cvp === p.id;
      c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function npRenderPresets() {
    const wrap = npEl('hm-np-presets'), row = npEl('hm-np-preset-row');
    if (!wrap || !row) return;
    const all = (FM.canvasPresets ? FM.canvasPresets.list() : []);
    row.textContent = '';
    wrap.classList.toggle('hidden', all.length === 0);
    all.forEach(p => {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'hm-np-chip'; c.dataset.cvp = p.id;
      c.setAttribute('role', 'listitem'); c.setAttribute('aria-pressed', 'false');
      const nm = document.createElement('span'); nm.className = 'hm-np-chip-name'; nm.textContent = p.name;
      const mt = document.createElement('span'); mt.className = 'hm-np-chip-meta';
      mt.textContent = p.w + '×' + p.h + ' · ' + p.fps + ' fps';
      c.appendChild(nm); c.appendChild(mt);
      c.addEventListener('click', () => npApplyPreset(p));
      row.appendChild(c);
    });
  }

  function newProjectDialog() {
    const dlg = document.getElementById('hm-dialog');
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(NEWP_KEY)) || {}; } catch (e) {}
    npAspect = NP_ASPECTS.indexOf(saved.aspect) >= 0 ? saved.aspect : '9:16';
    npBg = (saved.bg === 'none' || /^#[0-9a-f]{6}$/i.test(saved.bg || '')) ? saved.bg : '#000000';
    // set every control EVERY time (not just when remembered) — the dialog is reused, so a value
    // left behind by the previous open would silently become the next project's setting
    npEl('hm-new-res').value = String(saved.res || 1080);
    npEl('hm-new-w').value = saved.w || 1080;
    npEl('hm-new-h').value = saved.h || 1920;
    const fsel = npEl('hm-new-fps'), fnum = npEl('hm-new-fps-num');
    const wantFps = String(saved.fps || 30);
    let has = false;
    for (let i = 0; i < fsel.options.length; i++) if (fsel.options[i].value === wantFps) has = true;
    if (has) { fsel.value = wantFps; fnum.value = 30; }
    else { fsel.value = 'custom'; fnum.value = wantFps; }
    if (/^#[0-9a-f]{6}$/i.test(npBg)) npEl('hm-new-bg').value = npBg;
    const input = npEl('hm-new-name');
    input.value = 'Project ' + (FM.projects.list().length + 1);
    npRenderPresets();                 // (queue 183) rebuilt each open — one may have been saved since
    npUpdate();
    dlg.classList.remove('hidden');
    // Focus the name field on a real keyboard only. On a phone, auto-focus throws the software
    // keyboard up the instant the dialog opens and pushes Create/Cancel off the visual viewport
    // (measured: a 667pt screen leaves ~380pt, the card is ~550pt) — the name already has a sane
    // default, so tapping the field when you actually want to rename is the better trade.
    const hasKeyboard = !window.matchMedia || matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hasKeyboard) setTimeout(() => { input.focus(); input.select(); }, 30);
  }
  async function createFromDialog() {
    const dlg = npEl('hm-dialog');
    const name = (npEl('hm-new-name').value || '').trim() || 'Untitled';
    const s = npCompute(), fps = npFps();
    try { localStorage.setItem(NEWP_KEY, JSON.stringify({ aspect: npAspect, res: npEl('hm-new-res').value, fps: fps, bg: npBg, w: s.w, h: s.h })); } catch (e) {}
    dlg.classList.add('hidden');
    await FM.projects.create({ name: name, width: s.w, height: s.h, fps: fps, background: npBg === 'none' ? null : npBg });
    FM.home.close({ push: true });   // same hand-off as tapping a card — every route from home into a project pushes
  }

  FM.home = {
    init() {
      root = document.getElementById('home-screen');
      if (!root) return;
      grid = root.querySelector('.hm-grid');
      initOverpull();
      root.querySelectorAll('.hm-tab').forEach(b => b.addEventListener('click', () => {
        const changed = tab !== b.dataset.tab;
        // keep select MODE across tabs, drop the SELECTION — see the note in render()
        if (changed) selected.clear();
        tab = b.dataset.tab; render();
        /* The tab itself reacts (queue 207: "adding a little animation to the button you press").
           Restarted the careful way — cancel any run in flight, then force layout on the BUTTON.
           `b` is a real HTMLElement so offsetWidth works here, unlike the <svg> that made the cog
           turn exactly once per page load (queue 255); the pattern is kept identical anyway so the
           next person copying it copies the version that works. */
        if (b.getAnimations) b.getAnimations().forEach(a => { try { a.cancel(); } catch (e) {} });
        b.classList.remove('hm-tab-pop');
        void b.offsetWidth;
        b.classList.add('hm-tab-pop');
        // …and the cards restage, but ONLY when the tab actually changed. Re-tapping the tab you are
        // already on should do nothing rather than replay the whole grid.
        if (changed) stampCards();
      }));
      document.getElementById('hm-new').addEventListener('click', newFromTab);   // per-tab: project / template / element
      // "Select" toggle in the top bar → enter/leave multi-select (bulk delete / duplicate)
      const top = root.querySelector('.hm-top');
      if (top && !document.getElementById('hm-select-btn')) {
        const sb = el('button', 'hm-select-btn', 'Select'); sb.id = 'hm-select-btn';
        sb.addEventListener('click', () => { if (selectMode) exitSelect(); else enterSelect(); });
        top.appendChild(sb);   // the ⋯ used to anchor this; it is gone (v5.24), so these simply append
      }
      // settings cog — app-wide preferences (sorting, demo mode, defaults). Injected like the
      // Select button so the markup stays put; sits left of the ⋯ file menu.
      if (top && !document.getElementById('hm-settings-btn')) {
        const cg = el('button', 'hm-search-btn', ''); cg.id = 'hm-settings-btn';
        cg.setAttribute('aria-label', 'Settings'); cg.title = 'Settings';
        cg.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';   // same mark as the editor's cog
        cg.addEventListener('click', () => { if (FM.settings) FM.settings.open(); });
        top.appendChild(cg);   // cog is now the last control in the row
      }
      // re-sort / re-render when a setting that affects this screen changes
      if (FM.settings) FM.settings.onChange(() => { if (FM.home.isOpen()) render(); });
      // The home ⋯ is GONE (v5.24). Its only two entries — Import project file and Shortcuts — moved
      // into the settings cog beside it, which is where app-level actions already live. Ezra: "Put the
      // options that show up in the three dots that are in the home menu specifically inside the menus
      // settings cog menu." Two front doors to the same cupboard, and the ⋯ was the emptier one.
      // search: magnifier → name/date bar over the list
      const sBtn = document.getElementById('hm-search-btn'), sInp = document.getElementById('hm-search-input');
      if (sBtn && sInp) {
        sBtn.addEventListener('click', () => toggleSearch());
        // debounced: render() rebuilds every card and re-reads each thumbnail from IndexedDB, so a
        // per-keystroke rebuild made a big library strobe its ▶ placeholders while typing
        let sTimer = null;
        sInp.addEventListener('input', () => {
          const hint = document.querySelector('.hm-search-hint');
          if (hint) hint.classList.toggle('hidden', !!sInp.value);   // reclaim the space once they're typing (phones: keyboard up)
          clearTimeout(sTimer);
          sTimer = setTimeout(() => { query = sInp.value.trim(); render(); }, 110);
        });
        sInp.addEventListener('keydown', e => {
          if (e.key === 'Escape') { e.preventDefault(); toggleSearch(false); }
          else if (e.key === 'Enter') { e.preventDefault(); sInp.blur(); }   // phones: close the keyboard, keep the results
        });
        const clr = document.getElementById('hm-search-clear');
        if (clr) clr.addEventListener('click', () => {
          sInp.value = ''; query = '';
          const hint = document.querySelector('.hm-search-hint'); if (hint) hint.classList.remove('hidden');
          render(); sInp.focus();
        });
      }
      // modal manners for the (now much bigger) new-project dialog: Escape closes, so does a tap on
      // the backdrop — on a phone with the keyboard up, the buttons can be the hardest thing to reach
      dlgEsc = e => { const d = document.getElementById('hm-dialog'); if (e.key === 'Escape' && d && !d.classList.contains('hidden')) { e.preventDefault(); d.classList.add('hidden'); } };
      document.addEventListener('keydown', dlgEsc);
      document.getElementById('hm-dialog').addEventListener('pointerdown', e => { if (e.target && e.target.id === 'hm-dialog') e.currentTarget.classList.add('hidden'); });
      // new-project dialog wiring
      const dlg = document.getElementById('hm-dialog');
      dlg.querySelectorAll('.hm-aspect').forEach(b => b.addEventListener('click', () => { npAspect = b.dataset.aspect; npUpdate(); }));
      dlg.querySelectorAll('.hm-bg-sw').forEach(b => b.addEventListener('click', () => {
        npBg = b.dataset.bg;
        if (/^#[0-9a-f]{6}$/i.test(npBg)) npEl('hm-new-bg').value = npBg;
        npUpdate();
      }));
      npEl('hm-new-bg').addEventListener('input', () => { npBg = npEl('hm-new-bg').value; npUpdate(); });
      npEl('hm-new-res').addEventListener('change', npUpdate);
      npEl('hm-new-fps').addEventListener('change', npUpdate);
      ['hm-new-w', 'hm-new-h', 'hm-new-fps-num'].forEach(id => { const inp = npEl(id); if (inp) inp.addEventListener('input', npUpdate); });
      npEl('hm-new-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); createFromDialog(); } });
      dlg.querySelector('#hm-create').addEventListener('click', createFromDialog);
      dlg.querySelector('#hm-cancel').addEventListener('click', () => dlg.classList.add('hidden'));
    },
    open() {
      if (!root) return;
      endPush(false);   // coming back before the push finished: unwind it, and never leave the transform on #app
      if (FM.pause) FM.pause(); else FM.playing = false;   // silence playback under the overlay (#r4)
      if (FM.groupContext && FM.exitGroup) FM.exitGroup(true);   // home always shows the top-level project
      if (FM.viewport) FM.viewport.reset();   // closing a project resets the preview pan/zoom (view-only)
      /* METADATA NOW, PICTURE LATER (queue 128, the closing half). This used to be
       * `touchCurrent(true)` — a forced thumbnail capture — and startPop() is the LAST line of this
       * function, so every millisecond here is a millisecond in which the finger has lifted and
       * nothing on screen has moved. Measured at 6x CPU throttle: open() blocked for 81ms and **62ms
       * of it was this one call**. The card grid needs the metadata to render; it does not need the
       * new picture until you can see it, and the cards are sliding in. */
      FM.projects.touchCurrent(false, true);   // name/size/duration/layer count only — no capture
      if (selectMode) { selectMode = false; selected.clear(); }
      // First open of the session only — this is the arrival, not a screen you keep re-entering.
      const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!introShown && !reduce) { introShown = true; armIntro(); }
      tab = 'projects';       // set BEFORE toggleSearch: clearing a live query re-renders, and doing that on a stale 'templates' tab built a grid we immediately throw away
      toggleSearch(false);    // Home always opens on the full library, never a stale filter
      // one-time: lift legacy inline thumbs out of the index into IDB, then re-render so cards refill
      if (FM.projects.migrateThumbs) FM.projects.migrateThumbs().then(() => { if (root && !root.classList.contains('hidden')) render(); });
      render();
      root.classList.remove('hidden');
      // Only RETURNING plays the pop. The first open of the session is the app arriving from the
      // splash, and sliding home in from the left there would look like it came back from somewhere
      // it has never been. hasOpened is its own flag rather than piggy-backing on introShown, which
      // never flips under reduced motion and would have made this fire on boot for exactly the people
      // who least want it.
      if (hasOpened) startPop();
      hasOpened = true;
      /* …and the picture, once the animation it was blocking is over. Deliberately after the pop
       * rather than one frame into it: the capture is 62ms at phone speed, which dropped inside a
       * running animation would be the stutter this is supposed to remove. The card keeps its previous
       * thumbnail for the length of the slide, which is a project you were looking at a moment ago. */
      captureThumbSoon();
      document.body.classList.add('home-open');
      // Remember which screen the user is on, so a refresh / force-update reload puts them back
      // there instead of always landing on the project browser (the boot path reads this).
      try { localStorage.setItem('fm.view', 'home'); } catch (e) {}
    },
    // close({ push, lead }) plays the home → project push (see the block at the top of this file).
    // Called with nothing, it is byte-for-byte the close it has always been: the overlay is hidden on
    // this line, which several callers depend on.
    close(opts) {
      if (!root) return;
      const push = !!(opts && opts.push) && !root.classList.contains('hidden');
      document.getElementById('hm-dialog').classList.add('hidden');
      document.body.classList.remove('home-open');
      if (push) {
        // `closing` makes isOpen() report false for the length of the push, so nothing downstream can
        // tell an animating close from a finished one and try to close it a second time. Assigned
        // AFTER the call: startPush may unwind a push already in flight, and that resets the flag.
        closing = startPush(opts.lead, !!(opts && opts.wait));
      } else {
        endPush(false);
        root.classList.add('hidden');
      }
      if (FM.requestRender) FM.requestRender();
      try { localStorage.setItem('fm.view', 'editor'); } catch (e) {}   // in the editor now — reloads return here
    },
    // Phase 2 of the two-phase push (queue 128) — see armPushIn. Returns false when there was no
    // phase 1 to complete, so a caller can fall back to the ordinary one-shot close.
    armPushIn() { return armPushIn(); },
    abortPush() { abortPush(); },
    // Whether a push would actually run for this close. openProject needs to know BEFORE it starts,
    // because the two-phase split is only correct when the push is going to play: on desktop close()
    // hides home instantly, and splitting that would show the previous project for the whole load.
    pushWillRun() { return pushAllowed(); },
    isOpen() { return !!root && !root.classList.contains('hidden') && !closing; },
    _splashIsUp: splashIsUp,   // exposed for the regression test — see armIntro
    _waits: WAIT,              // ditto: the suite shortens WAIT.stuck rather than sleeping 8s for it
    // The phone gate, as a swappable function rather than an inline matchMedia. The suite asserts the
    // REAL one is false in its own 900px frame (that IS the desktop case) and then swaps in a stub to
    // drive the push behaviour itself — otherwise every push assertion would be dead code in a runner
    // that can never be 700px wide, which is exactly the "a test that cannot run is not a test" trap.
    get _pushAllowed() { return pushAllowed; },
    set _pushAllowed(fn) { pushAllowed = fn; },
    // The grain field's shape, for the suite — see STATIC_PX (queue 157).
    _grain: { tile: STATIC_PX, tiles: STATIC_TILES },
  };
})(window.FM);
