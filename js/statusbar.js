/* statusbar.js — the status bar is painted by the screen it sits over (queue 920).
 *
 * Ezra, 22 Sep: "the faded white bar is still at the top of the screen, all black bar, like it fades onto the
 * screen … pretty much the same as the screenshots I sent you before." Seventh entry about this strip (135,
 * 143, 162, 553, 883, 903). Every earlier fix changed the PAGE, and none could see what he sees, because a
 * desktop browser has no safe area: env(safe-area-inset-top) is 0 there. tools/shot.py --safe-top 47 now fakes
 * one, and with it the page's own top is clean on Home (light and dark) and in a project.
 *
 * WHAT HE IS LOOKING AT IS DRAWN BY iOS, NOT BY US. Since iOS 26, an installed web app that runs under the status
 * bar — `apple-mobile-web-app-status-bar-style: black-translucent` + `viewport-fit=cover`, which this app has had
 * since v5.49 — gets the system's Liquid Glass "scroll edge effect" in the top inset: a GRADIENT, tinted white
 * over light content and black over dark, reaching ~35–45pt past the status bar, i.e. over his top buttons.
 * That is his "faded white bar" on the light Home and "black bar … fades onto the screen" in a project, exactly.
 * Reported the same way by other installed apps (github.com/MrClit/fin-app/issues/411, amir20/dozzle#5222).
 *
 * THE FIX is in index.html: status-bar-style `default`. The status bar becomes opaque and the web view starts
 * BELOW it, so there is no inset for iOS to fill and nothing to fade. iOS then paints that opaque bar with
 * <meta name="theme-color"> — which was a fixed #12151b, i.e. a dark strip over the light Home. So this file
 * keeps theme-color equal to the top colour of whatever is on screen, measured at 390×844 with a 47px inset:
 * light Home #fafdfe, dark Home #08161f, editor #161a21.
 *
 * It WATCHES rather than being called: body.home-open and html[data-home] already change on every route in and
 * out of Home (open, close, the push, the Settings switch), and a caller that forgot to call a sync function is
 * how a strip has been wrong in six earlier entries. A colour the screen owns cannot drift from the screen.
 *
 * ⚠️ iOS reads the status-bar-style meta ONCE, WHEN THE APP IS ADDED TO THE HOME SCREEN. Nothing changes on his
 * phone until he removes the app and adds it again — and removing an installed web app can delete its storage,
 * so he must back up first (Settings → Back up every project). He has been told both. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const COLOURS = { homeLight: '#fafdfe', homeDark: '#08161f', editor: '#161a21' };
  let meta = null, last = '';

  function want() {
    const onHome = document.body && document.body.classList.contains('home-open');
    if (!onHome) return COLOURS.editor;
    return document.documentElement.getAttribute('data-home') === 'dark' ? COLOURS.homeDark : COLOURS.homeLight;
  }
  function sync() {
    if (!meta) meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const c = want();
    if (c !== last) { meta.setAttribute('content', c); last = c; }
  }
  function start() {
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-home'] });
    if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  FM.statusBar = { colours: COLOURS, sync, want };
})(window.FM);
