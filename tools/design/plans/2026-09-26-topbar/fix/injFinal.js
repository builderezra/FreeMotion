(function(){var s=document.createElement('style');s.id='fm-sb-proto-css';s.textContent="/* \u2550\u2550\u2550 QUEUE 920 (26 Sep) \u2014 THE TOP-EDGE TAB: the one thing iOS 26 reads for the status-bar strip.\n   His words: *\"when you're on the white mode \u2026 it's got a black bar at the top and like when you go in and out of\n   projects it's like changing constantly\"*. iOS 26's WebKit colours the strip from the first plain background-color on\n   the FIXED element under the top centre of the viewport, 4px down, and only looks again when a fixed element is added\n   or removed; a full-screen one never replaces a colour already set. The why, the WebKit source and the measurement are\n   in js/statusbar.js, which creates this element and keeps --sb equal to the screen's top colour.\n   \u26a0\ufe0f THE MASK MAKES IT PAINT NOTHING, in a way WebKit still reads. Measured in a real\n   WKWebView: mask-image and filter:opacity(0) are read; height:0 + overflow:hidden and clip-path are NOT (its hit-test\n   does not reach through a clip); opacity under 0.1 and visibility:hidden are skipped by rule.\n   \u26a0\ufe0f 12px, not less: WebKit ignores a background on a box 10px thin or thinner. Full width: under 90% of the viewport\n   and WebKit skips it. Never full height, or it becomes a \"viewport-sized\" container that never replaces a colour.\n   \u26a0\ufe0f z 214: above #home-screen (200), #app mid-push/pop (210), the push's + and toast (212/213); below the scrims (220+)\n   and the intro (10000). pointer-events:none so the top 12px of every screen still takes taps. */\n#fm-sb-tab {\n  position: fixed; top: 0; left: 0; right: 0; height: 12px; z-index: 214; pointer-events: none;\n  background-color: var(--sb, #161a21);\n  -webkit-mask-image: linear-gradient(transparent, transparent); mask-image: linear-gradient(transparent, transparent);\n}\n";(document.head||document.documentElement).appendChild(s);})();
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
  /* ═══ THE TOP-EDGE TAB (queue 920, 26 Sep) — WHAT iOS READS FOR THE STATUS BAR, AND WHEN IT READS IT ═══════════════════
   * Ezra, 26 Sep: "sometimes the top bar instead of it being like when you're on the white mode it going white all the way
   * to the top it's got a black bar at the top and like when you go in and out of projects it's like changing constantly".
   * iOS 26's WebKit fills the status-bar strip from the FIXED (or sticky) element it finds by hit-testing the top centre of
   * the viewport, 4px down, taking the first plain background-color on the way up (LocalFrameView::fixedContainerEdges).
   * It looks again ONLY when a fixed/sticky element is added or removed, and a container the size of the whole viewport may
   * never REPLACE a colour already set (WebKit commit 8b209a7, "to mitigate the color thrashing problems"). Every screen
   * here is exactly that: #splash (#111), #home-screen, and #app while it pushes or pops (position:fixed, z 210, #161a21
   * under the phone top bar). So the editor's #161a21, sampled as it slid off the returning Home, stuck on the LIGHT Home:
   * his black bar. With NO fixed element at the top (a project, once the push is over) there is no colour at all and iOS
   * draws its soft scroll-edge blur instead: his fade, there in a project and not on Home. Measured in a real WKWebView
   * (macOS 27, same WebCore): the light Home read #161a21 after one round trip, while <html> said #fafdff the whole time.
   * THE FIX gives WebKit one ordinary element to find on every screen, re-read every time:
   *   - full width, 12px tall (WebKit ignores a box 10px or thinner) and nowhere near full height, so it is a plain bar —
   *     whose colour is read fresh — not a full-screen layer that inherits the last one;
   *   - above every screen (z 214: Home 200, the pushing editor 210, the push's + and toast 212/213) and below the scrims
   *     (220+) and the intro (10000), which WebKit's own rules then handle;
   *   - MASKED to nothing (styles.css), so it paints nothing: WebKit's sampler reads background-color from style and its
   *     hit-test ignores masks. Measured: a zero-height box with overflow:hidden, and clip-path, are NOT read (the
   *     hit-test does not reach through them); mask-image and filter:opacity(0) are;
   *   - RE-INSERTED on every colour change (display none → flush → back), because an add/remove is the only thing WebKit
   *     re-samples on; a second kick 700ms later covers something else sitting on the sample point the first time (the
   *     Show-touches ripple, z 9999, is fixed and would be hit first).
   * ⚠️ Measured: what WebKit DECIDES (WKWebView on macOS 27). NOT measured: how iOS then paints it — no simulator runtime
   * on this Mac. His next look at the phone is the real check. */
  let tab = null, tabColour = '', lateKick = 0;
  function ensureTab() {
    if (tab && tab.isConnected) return tab;
    tab = document.getElementById('fm-sb-tab');
    if (!tab) {
      tab = document.createElement('div');
      tab.id = 'fm-sb-tab';
      tab.setAttribute('aria-hidden', 'true');
      document.body.appendChild(tab);
    }
    return tab;
  }
  function kick() {
    if (!document.body) return;
    const t = ensureTab();
    t.style.display = 'none';
    void t.offsetHeight;          // flush: its renderer goes now — that removal is what makes WebKit look at the top again
    t.style.display = '';
  }
  function syncTab() {
    if (!document.body) return;
    const t = ensureTab(), c = want();
    if (c === tabColour) return;
    tabColour = c;
    t.style.setProperty('--sb', c);
    kick();
    clearTimeout(lateKick);
    lateKick = setTimeout(kick, 700);   // again once the pop (380ms) / push's slide has run: in case something else sat on the sample point the first time
  }
  function start() {
    sync(); syncTab();
    const mo = new MutationObserver(function () { sync(); syncTab(); });
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
  FM.statusBar = { colours: COLOURS, sync, want, syncTab, kick, staleInstall: staleInstall, explain: explain, _maybeTell: maybeTell, _SEEN: SEEN };
})(window.FM);
