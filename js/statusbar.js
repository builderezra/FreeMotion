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
  /* ⚠️ SAFARI 26 IGNORES theme-color (queue 920, 25 Sep — his reinstall proved it: the strip was the page's
   * background-color, not this). What actually paints the status bar is the background-COLOR set per screen in
   * styles.css and theme-glass.css. These are the same three values, kept here for browsers that do read
   * theme-color (Chrome on Android), and a test holds the CSS to them. Measured at 390x844 with no inset — the
   * page starts below the status bar now, so its top row is what has to continue up. */
  const COLOURS = { homeLight: '#fafdff', homeDark: '#091823', editor: '#161a21' };
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
  /* ═══ AN INSTALL FROM BEFORE THE FIX SAYS SO ITSELF (queue 920, 24 Sep) ═══════════════════════════════════════════
   * He reported the blur again at v16.90 — "The fade at the top is still an issue" — and his screenshot answers why: the
   * status bar is drawn OVER the page. With v16.78's `default` style a fresh install starts the page BELOW an opaque status
   * bar, so nothing can be under it. Drawn over the page means this copy was added to his Home Screen while the page still
   * asked for `black-translucent`, and iOS reads that ONCE, at install — every later release, the fix included, is ignored
   * by it. Research (24 Sep) agrees there is no CSS or meta switch for the iOS 26 edge blur; the only lever is not putting
   * the page under the status bar, which only a fresh install does.
   * So the app detects the condition — installed, AND the page's top sits under the status bar (env(safe-area-inset-top)
   * above zero) — and tells him once, with the steps and a Back up button, instead of a note in a file he may not open.
   * A fresh install measures 0 and never sees it; a browser tab is not "installed" and never sees it either. */
  function insetTop() {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
    (document.body || document.documentElement).appendChild(d);
    const h = d.getBoundingClientRect().height;
    d.remove();
    return h;
  }
  function installed() { return navigator.standalone === true || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); }
  function staleInstall() {
    const t = FM.statusBar && FM.statusBar._fake;   // suite seam: { installed, inset }
    return t ? (!!t.installed && t.inset > 12) : (installed() && insetTop() > 12);
  }
  const SEEN = 'fm.sb920.told';
  const STEPS = 'Your iPhone draws a blur over the top of FreeMotion because this copy was added to your Home Screen before the fix. iOS only applies the fix to a fresh install:\n\n'
    + '1. Back up (the button below) — removing the app deletes what is stored in it.\n'
    + '2. Remove FreeMotion from your Home Screen.\n'
    + '3. In Safari open builderezra.github.io/FreeMotion → Share → Add to Home Screen.\n'
    + '4. Open it → Settings → Restore from a backup.';
  async function explain(force) {
    if (!FM.ask) return;
    if (!force) { try { if (localStorage.getItem(SEEN)) return; localStorage.setItem(SEEN, '1'); } catch (e) {} }
    const go = await FM.ask({ title: 'Remove the blur at the top', message: STEPS, ok: 'Back up now', cancel: 'Not now' });
    if (go && FM.backupEverything) FM.backupEverything();
  }
  function maybeTell() {
    if (!staleInstall()) return;
    const home = document.getElementById('home-screen');
    if (!home || home.classList.contains('hidden')) return;   // said on Home, not over a project he has open
    explain(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  setTimeout(maybeTell, 2500);   // after the intro and the Home cards have settled
  FM.statusBar = { colours: COLOURS, sync, want, staleInstall: staleInstall, explain: explain, _maybeTell: maybeTell, _SEEN: SEEN };
})(window.FM);
