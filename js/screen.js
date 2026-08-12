/* FreeMotion — the visual viewport, in ONE place.
 *
 * WHY THIS FILE EXISTS. On iOS there are two viewports and the difference is invisible on a desktop
 * browser, so it is very easy to write geometry that is right on a Mac and wrong on Ezra's phone:
 *
 *   LAYOUT viewport  — window.innerWidth/innerHeight. This is the coordinate space that
 *                      getBoundingClientRect() reports in, that position:fixed resolves against,
 *                      and that vh units are a percentage of. Opening the keyboard does NOT
 *                      change it on iOS.
 *   VISUAL viewport  — window.visualViewport. The part of the layout viewport the user can
 *                      actually SEE: it shrinks above the keyboard, it shrinks when you pinch-zoom,
 *                      and — the part everyone forgets — it also SLIDES DOWN inside the layout
 *                      viewport, which is what visualViewport.offsetTop is.
 *
 * offsetTop is the whole bug class. Whenever the document cannot scroll (any full-screen takeover
 * with body{overflow:hidden}) iOS still has to reveal the focused field, and the only budget it has
 * left is offsetTop — so it can jump straight to its maximum, innerHeight - visualViewport.height.
 * Every number below is therefore expressed in LAYOUT coordinates, with the visible window's
 * position inside it stated explicitly, so a caller can never accidentally mean "the top of the
 * page" when it meant "the top of what you can see".
 *
 * Measured on the reproducing case (iPhone 390x844, safe-area 47/34, keyboard up):
 *   layoutH 844 · visualH 464 · offsetTop 380  ->  fixedTop 380, fixedBottom 0, top 380, bottom 844.
 * A position:fixed toolbar therefore wants `top: 380px` to sit on the visible top edge, and a
 * NORMAL-FLOW box that wants its content to start just under that toolbar needs 380px of extra
 * padding-top that no CSS constant can supply. See padTop().
 *
 * NAMING. This is FM.screen, not FM.viewport — FM.viewport was already taken by the canvas pan/zoom
 * state in canvas-edit.js (scale/x/y/apply/reset), and shadowing it silently breaks pinch-zoom.
 * "screen" = what the user can see. FM.screen.metrics().scale is the BROWSER's pinch-zoom on the
 * whole page; FM.viewport.scale is the app's own zoom of the preview. Two different things.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function fin(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function rectOf(x) { return (x && typeof x.getBoundingClientRect === 'function') ? x.getBoundingClientRect() : x; }

  /* Everything about the current viewport pair, in layout px.
   *
   *   layoutW/layoutH   the coordinate space of getBoundingClientRect() and position:fixed
   *   visualW/visualH   how much of it is on screen
   *   offsetTop/Left    where that visible window sits inside the layout viewport
   *   top/bottom        the visible window's edges, in LAYOUT y  (bottom = offsetTop + visualH)
   *   fixedTop          the CSS `top` a position:fixed element needs to sit on the visible TOP edge
   *   fixedBottom       the CSS `bottom` it needs to sit on the visible BOTTOM edge — i.e. the
   *                     height of whatever is covering the page from below (usually the keyboard)
   *   hidden            layoutH - visualH: everything currently off screen, top and bottom together
   *   scale             pinch-zoom factor (1 = not zoomed)
   *
   * Clamped on purpose: iOS reports transient values while the keyboard animates (offsetTop briefly
   * larger than the room it has, height briefly larger than the layout), and an unclamped
   * subtraction turns those into negative paddings and elements that fly off screen for a frame.
   */
  function metrics() {
    const vv = window.visualViewport;
    const layoutH = Math.max(0, fin(window.innerHeight, 0));
    const layoutW = Math.max(0, fin(window.innerWidth, 0));
    const visualH = Math.max(0, Math.min(fin(vv && vv.height, layoutH), layoutH));
    const visualW = Math.max(0, Math.min(fin(vv && vv.width, layoutW), layoutW));
    const offsetTop = Math.max(0, Math.min(fin(vv && vv.offsetTop, 0), layoutH - visualH));
    const offsetLeft = Math.max(0, Math.min(fin(vv && vv.offsetLeft, 0), layoutW - visualW));
    const below = Math.max(0, layoutH - visualH - offsetTop);
    return {
      layoutW: layoutW, layoutH: layoutH, visualW: visualW, visualH: visualH,
      offsetTop: offsetTop, offsetLeft: offsetLeft,
      top: offsetTop, bottom: offsetTop + visualH,
      left: offsetLeft, right: offsetLeft + visualW,
      fixedTop: offsetTop, fixedBottom: below,
      hidden: Math.max(0, layoutH - visualH),
      scale: fin(vv && vv.scale, 1) || 1,
      has: !!vv
    };
  }

  /* Layout y  <->  the row of the SCREEN it is actually on. The only correct way to answer "can the
   * user see this?" from a getBoundingClientRect(). */
  function toScreen(layoutY, m) { return layoutY - (m || metrics()).offsetTop; }
  function toLayout(screenY, m) { return screenY + (m || metrics()).offsetTop; }
  function isVisible(el, m) {
    const r = rectOf(el); if (!r) return false;
    m = m || metrics();
    return r.bottom > m.top && r.top < m.bottom;
  }

  /* The padding that puts a normal-flow box's CONTENT edge exactly `aboveH` below the top of what
   * the user can see (`belowH` above the bottom, respectively). Pass the box's own rect — or the
   * element, and it will measure it.
   *
   * REQUIREMENT: the box must be border-box AND its height must not depend on its own padding
   * (a grid/flex track, a fixed height, 100%…), or this feeds back on itself frame after frame.
   * #stage satisfies both. Both results are clamped at 0: a box that already starts below the
   * toolbar does not want negative padding, it wants none. */
  function padTop(box, aboveH, m) {
    const r = rectOf(box); if (!r) return 0;
    m = m || metrics();
    return Math.max(0, m.top + (aboveH || 0) - r.top);
  }
  function padBottom(box, belowH, m) {
    const r = rectOf(box); if (!r) return 0;
    m = m || metrics();
    return Math.max(0, r.bottom - (m.bottom - (belowH || 0)));
  }

  /* iOS scrolls the DOCUMENT to bring a focused field into view even when body{overflow:hidden}
   * says there is nothing to scroll — that scroll is pure damage in a full-screen takeover (it
   * drags everything up and is exactly what "the screen jumped" means), so put it back. */
  function unscroll() {
    if (window.scrollY || window.scrollX) { try { window.scrollTo(0, 0); } catch (_) {} }
  }

  /* Subscribe to every event that can change the numbers above, and get back ONE unsubscribe.
   * It captures the visualViewport object it subscribed to, so removal cannot silently miss when
   * the object has been swapped underneath (which a test harness does, and which used to leave a
   * dead listener firing against a torn-down overlay). */
  function watch(fn) {
    const vv = window.visualViewport;
    window.addEventListener('resize', fn);
    window.addEventListener('orientationchange', fn);
    if (vv) { vv.addEventListener('resize', fn); vv.addEventListener('scroll', fn); }
    return function () {
      window.removeEventListener('resize', fn);
      window.removeEventListener('orientationchange', fn);
      if (vv) { vv.removeEventListener('resize', fn); vv.removeEventListener('scroll', fn); }
    };
  }

  FM.screen = {
    metrics: metrics,
    toScreen: toScreen, toLayout: toLayout, isVisible: isVisible,
    padTop: padTop, padBottom: padBottom,
    unscroll: unscroll, watch: watch
  };
})(window.FM);
