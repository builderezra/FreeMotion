# #920 reopened (26 Sep): the top of the screen on his iPhone. Plan for the builder

Written by the planning chat. Nothing in the repo was edited. All files referenced as `PLAN/…` live in
`/Users/ezrasmith/Claude/FreeMotion/tools/design/plans/2026-09-26-topbar/`.

## 0. The short version

- **Cause, measured in real WebKit.** iOS 26 does not take the strip's colour from `<html>`. It takes it from the
  **fixed element under the top centre of the page, 4px down**, and it only looks again **when a fixed element is
  added or removed**. On top of that, a fixed element **the size of the whole screen may never replace a colour that
  is already set** (WebKit commit 8b209a7, "to mitigate the color thrashing problems").
- **Why that hits us.** Every screen we have is a full-screen fixed layer: `#splash` (#111), `#home-screen`, and `#app`
  while it slides in or out. So whichever colour WebKit sees first sticks.
  - In a WKWebView on this Mac, the **light Home read `#111111` (the intro's colour) for a whole session.** In a second
    run (actually the earlier of the two) it read **`#161a21` (the editor's colour) after one trip into a project.** Meanwhile `<html>` correctly said
    `#fafdff` the whole time. That is his black bar.
  - When there is **no** fixed element at the top (a project, once the slide is over), there is no colour at all, and
    iOS draws its blur instead. That is his fade. Whether he gets the fade or a solid colour depends on the order things
    happened in, which is why it comes and goes.
- **Fix (Option A, recommended).** One element, `#fm-sb-tab`, for WebKit to find on every screen:
  - `position:fixed`, full width, 12px tall, `pointer-events:none`, z 214.
  - `background-color: var(--sb)`, which `js/statusbar.js` keeps equal to the screen's top colour.
  - **Masked to nothing**, so it paints 0 pixels (measured).
  - **Re-inserted on every colour change**, because adding or removing a fixed element is the only thing that makes
    WebKit look again.
  - About 45 lines of JS and one CSS rule. **No reinstall.**
- **Proof.**
  - In real WebKit the fix gives the right colour at every step, 75–100 ms after each switch (476 ms once, when a
    Show-touches ripple sat on the sample point) (§3.3).
  - A new suite test ports WebKit's rule to JS. It **fails on HEAD, passes with the fix (2.9 s), and catches 4
    mutations** (§6).
- **Not verifiable here.** How the installed iPhone app then *paints* WebKit's decision: there is no simulator runtime
  on this Mac. Confidence is in §3.5.

---

## 1. His words (verbatim) and his clauses

> "the fade being at the top of the screen is still an issue. And also sometimes it's a bit buggy where like the fade at the top of the screen like covering stuff is there sometimes it isn't but also sometimes the top bar instead of it being like when you're on the white mode it going white all the way to the top it's got a black bar at the top and like when you go in and out of projects it's like changing constantly Shit."

His clauses (REQUESTS.md #920, clauses 7–10):
1. (7) The fade at the top of the screen is still an issue.
2. (8) It is intermittent: the fade covering stuff at the top is sometimes there and sometimes not.
3. (9) Sometimes in light (white) mode, instead of white all the way to the top, there is a BLACK bar at the top.
4. (10) Going in and out of projects, it keeps changing.

Standing rule on #920: **do NOT ask him for screenshots.**

---

## 2. What exists now (current working tree, read 26 Sep ~20:00–21:40; v17.04 was being shipped)

**`js/statusbar.js`** (loaded as `js/statusbar.js?v=3`, `index.html:1051`):
- `:37`: `const COLOURS = { homeLight: '#fafdff', homeDark: '#091823', editor: '#161a21' };`
- `:40`: `function want()` returns `editor` unless `body.home-open`; otherwise `homeDark` if `html[data-home="dark"]`, else `homeLight`.
- `:45`: `function sync()` only writes `<meta name="theme-color">`. Safari 26 ignores that (#920, v16.96).
- `:51–56`: `function start()` runs `sync()` and `new MutationObserver(sync)` on `html[data-home]` and `body[class]`.
- `:100`: `FM.statusBar = { colours: COLOURS, sync, want, staleInstall: staleInstall, explain: explain, _maybeTell: maybeTell, _SEEN: SEEN };`

**The full-screen fixed layers WebKit finds at the top centre:**
- `styles.css:4751`: `#home-screen { position: fixed; inset: 0; z-index: 200; … }`. `:4752` hides it with `#home-screen.hidden { display: none; }`.
- `styles.css:6771`: `body.fm-popping #app { position: fixed; inset: 0; z-index: 210; }` (the slide back to Home).
- `styles.css:6856`: `body.fm-pushing #app { position: fixed; left: 0; top: 0; z-index: 210; background: var(--bg); }` (the slide into a project).
- Under reduced motion, `styles.css:6774` and `:6951` put `#app` back to `position: static`, so there is no fixed `#app`.
- `styles.css:2110`: `#splash {`, with `position: fixed; inset: 0; z-index: 10000;` on `:2111`. `theme-glass.css:880` sets `#splash.splash-light { background: #111; }`, which ramps to white under the light look (`theme-glass.css:886`).
- `styles.css:6069`: `.touch-ripple { position: fixed; z-index: 9999; … 46px … }`. Only used with Settings → Show touches (`js/settings.js:146`).

**In a project nothing fixed covers the top.** `styles.css:4256` makes `#topbar-m` `position: relative; z-index: 30;`
with `:4266` `background: #161a21;`. Once the slide ends, `#app` is a grid, not fixed. This was measured: the rendered
fixed/sticky list in a project (`PLAN/fixed.txt`) has only bottom sheets parked off-screen, plus the timeline's sticky
rows at y=475.

**The page colours v16.96 set are right, and WebKit's page colour followed them live** (`under=` in every probe log):
- `theme-glass.css:539` (inside `html[data-home="light"] #home-screen {` at `:532`): `background-color: #fafdff;` (light).
- `theme-glass.css:550`: `html[data-home="light"]:has(#home-screen:not(.hidden)) { background-color: #fafdff; … }`.
- `styles.css:2169` (phone only): `html:not(.splash-on):has(#home-screen.hidden) { background-color: #161a21; … }`.
- `styles.css:2179–2180`: the dark Home is `#091823` on `#home-screen` and on `<html>`.
- `<body>` is transparent (`rgba(0, 0, 0, 0)`, measured), so `<html>` is the page colour.

**Screen switches** (`js/home.js`):
- `open()`: `:2967` `document.body.classList.add('home-open')`, and it plays `startPop()` (`:2960`).
- `close()`: `:2979` `document.body.classList.remove('home-open')`, then `:2984` `closing = startPush(…)`.
- The slide animations only run at ≤700px (`pushAllowed`, `js/home.js:489`).

**`index.html`:**
- `:50`: `<meta name="theme-color" content="#12151b">`
- `:59`: `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- `:42`: `styles.css?v=727` in the working tree at review time (26 Sep ~21:50). HEAD (v17.04) has `726`; the 727 is the
  other session's uncommitted v17.05 work.
- `:1051`: `statusbar.js?v=3`

**Re-read these numbers before editing.**

---

## 3. Findings and measurements

### 3.1 How iOS 26 picks the colour above the page, and when it looks again (WebKit source, `main`, Sep 2026)

Source was fetched with curl from `raw.githubusercontent.com/WebKit/WebKit/main/…`. Copies are in `PLAN/wk/`.

1. **Where it looks.** `Source/WebCore/page/LocalFrameView.cpp`, `LocalFrameView::fixedContainerEdges()` (~line 2286).
   - For the top it hit-tests one point: the **top centre, 4px down** (`midpointOnSide(Top, fixedRect)`, where
     `fixedRect` is the layout viewport shrunk by `sampleRectMargin = 4`).
   - The hit-test flags are `ReadOnly, DisallowUserAgentShadowContent, IgnoreClipping, ForFixedContainerSampling`. The
     first pass also uses `IgnoreCSSPointerEventsProperty`, so `pointer-events:none` elements are still hit.
   - From the hit it walks up to the **first fixed or sticky** box, taking the first visible `style().backgroundColor()`
     on the way.
   - It skips boxes ≤10px (`thinBorderWidth = 10`), boxes under 90% of the viewport width, and boxes with
     `opacity < 0.1`.
2. **How it classifies what it found** (`containerEdgeCandidateResult`). Each side is compared to the viewport as <90%,
   90–105%, or >105%. Full width and full height is `IsViewportSizedCandidate`. Full width but short is an ordinary
   `IsCandidate`.
3. **The sticky rule** (same function):
   ```cpp
   bool preferExistingColor = result.isDimmingLayer || result.isViewportSized || result.isSidebar;
   if (preferExistingColor && page->fixedContainerEdges().hasFixedEdge(side)) {
       edges.colors.setAt(side, page->fixedContainerEdges().colors.at(side));
       continue;
   }
   ```
   Commit 8b209a7 (11 Aug 2025, shipped in iOS 26.0) gives the reason: *"we don't allow viewport-sized containers like
   this to _replace_ existing color extensions, to mitigate the color thrashing problems."*
4. **Keep-the-last rule** (`Source/WebCore/page/Page.cpp`, `Page::updateFixedContainerEdges`, ~line 5658). If nothing
   fixed is found, the previous colour is **kept** as long as the previous container still has a renderer and is
   visible. If that container is `display:none`, the top colour is dropped.
5. **When it looks at all** (`Source/WebKit/WebProcess/WebPage/Cocoa/WebPageCocoa.mm`, `willCommitMainFrameData`, ~line 2420):
   `if (std::exchange(m_needsFixedContainerEdgesUpdate, false)) page->updateFixedContainerEdges(…)`.
   - That flag is set only by a page load, by a fixed/sticky renderer being added or removed
     (`didAddOrRemoveViewportConstrainedObjects`, `LocalFrameView.cpp:1793/1810`), or by the obscured insets changing.
   - **A colour change, a class change or an animation does not set it.** In a single-page app, the only lever is adding
     or removing a fixed element.
6. **On iPhone, scrolling and taps do not freeze it.** `TopContentInsetBackgroundCanChangeAfterScrolling` defaults to
   `currentUserInterfaceIdiomIsSmallScreen()` (`Shared/Cocoa/WebPreferencesDefaultValuesCocoa.mm:155`). That setting
   came in with commit c9f1bebd (Jul 2025).
7. **What gets drawn.** See `WKWebView.mm` `_updateFixedColorExtensionViews` (~line 3557) and `ios/WKWebViewIOS.mm`
   `_shouldHideTopScrollPocket` (~line 2373).
   - With a top colour, WebKit shows a **solid colour-extension view**, and the soft scroll-edge effect is **hidden**
     (`return [self _hasVisibleColorExtensionView:WebCore::BoxSide::Top];`).
   - With no top colour, **the soft edge effect shows** (the blur/fade). It is tinted
     `_sampledTopFixedPositionContentColor ?: underPageBackgroundColor` (`WKWebView.mm` ~line 3507).
   - So "a solid bar in some colour" and "the fade" are the two outcomes of the same decision.

Other people report the same thing:
- joe-bell/skills#6 describes the same centre point, 4px in, and the 0.1 opacity snap.
- homecast-web#199: the colour is read from style on every re-evaluation, and snapshotted when there is no plain colour.
- letter-archive#172: "stale edge colors … changes color out of step" when opening and closing, in a Home Screen web app.
- okou#36386: fixes the iOS blur with a fixed strip at the top edge (not verified on a device).
- WebKit bug 301756, comment 2: colour extension is only used when a fixed/sticky element is near the edge.
- None of dozzle#5222, fin-app#411, vcsudoku#38 or hypersweeper#145 mention in-app navigation. All four only switched
  away from `black-translucent`, which we already did in v16.78.
- URLs are in §11.

### 3.2 What the top-centre hit finds in our app

Measured in Chrome with a JS port of the rule (`PLAN/edge-emu.js`) via `tools/shot.py --width 440 --height 956 --js-file PLAN/probe1.js`,
sampling at +0/80/250/450/800/1400 ms after each switch.

| moment | hit | container WebKit uses | colour it reads |
|---|---|---|---|
| launch (intro up) | `#splash-vid` | `#splash`, full-screen | #111, then kept while the intro ramps to #fff |
| light Home, settled | `#hm-grain` (absolute) | `#home-screen`, full-screen | #fafdff |
| dark Home, settled | `.hm-top` | `#home-screen`, full-screen | "Multiple": `.hm-top` has a backdrop-filter |
| slide into a project, 0–250 ms | Home, then `#topbar-m` | `#home-screen`, then `#app` (full-screen, z 210) | — |
| project, after the slide | `#topbar-m` | **none**: nothing fixed | none, so iOS blurs |
| slide back to Home, first 80 ms | `#m-back` / `#topbar-m` | `#app`, full-screen, **on top of the returning Home** | **#161a21** |
| same slide, 250 ms on | `#hm-grain` | `#home-screen`, full-screen | cannot replace #161a21 (rule 3) |

Every container the app offers is full-screen, which is exactly the kind rule 3 forbids from replacing a colour.

### 3.3 Real WebKit: WKWebView on this Mac (macOS 27.0; same WebCore decision code as iOS)

**The probe.** `PLAN/harness/main.swift`, built with `swiftc main.swift -o harness`:
- Loads `http://127.0.0.1:8777/index.html` at 440 wide, with a non-persistent data store and a seeded project.
- Sets `obscuredContentInsets.top = 54`, standing in for the status bar.
- Every 25 ms it reads the SPI `_sampledTopFixedPositionContentColor`, which is **WebKit's own answer** (`nil` means
  no top colour, so iOS shows the blur), and the page colour `underPageBackgroundColor`.
- It drives `FM.home.close({push:true})`, `FM.home.open()`, the dark switch and a simulated Show-touches ripple on a
  29-second timeline (`PLAN/harness/scen2.json`).

**HEAD, run 1** (`PLAN/harness/run-head.txt`, driven by `PLAN/harness/scen-head.json`, a 21 s timeline; the intro was
still up when the first project opened):

| moment | WebKit's top colour | page colour | on his phone |
|---|---|---|---|
| intro | #111111, kept while the intro ramps to #fff | #111 → #fff | dark strip over a white intro |
| first project | **nil** | #161a21 | **the fade** |
| back to the light Home | **#161a21** | #fafdff | **black bar on white** |
| project again | #161a21 (kept: `#app` still has a renderer) | #161a21 | solid, no fade |
| back to the light Home once more (13.5 s) | **#161a21** | #fafdff | **black bar on white** |
| dark Home | #161a21 | #091823 | near-invisible |

**HEAD, run 2** (`PLAN/harness/run2-head.txt`; same code, the intro finished first): **`#111111` from the intro to the
end of the 29 s session.** That covered the light Home, three projects, the dark Home and back to light, while the page
colour went #fafdff → #161a21 → #fafdff → #091823 → #fafdff exactly as v16.96 intended.

**With Option A** (`PLAN/harness/run2-final.txt`; the injected code is exactly §5's CSS plus the new `statusbar.js`):

| moment (action at t) | WebKit's top colour | lag after the action |
|---|---|---|
| intro | #111111 (the intro is above the tab) | — |
| intro removed, light Home | **#fafdff** | at removal |
| into a project (12.00 s) | **#161a21** | 100 ms |
| back to light Home (14.50 s) | **#fafdff** | 77 ms |
| into a project (17.00 s) | #161a21 | 75 ms |
| back to Home **with a ripple sitting on the sample point** (19.50 s) | #161a21, then **#fafdff at 19.98 s** | 476 ms (the ripple left; the 700 ms kick would also have caught it) |
| dark switch (22.00 s) | **#091823** | 75 ms |
| project from dark / back (23.00 / 25.50 s) | #161a21 / #091823 | 76 / 75 ms |
| light again (28.00 s) | **#fafdff** | 76 ms |

Never `nil` after the intro, so no blur state is left anywhere.

**Which "invisible" WebKit will still read** (each `run2-fix*.txt` is the same timeline with a different CSS for the tab):

| variant | read by WebKit? | paints |
|---|---|---|
| `mask-image: linear-gradient(transparent, transparent)` (**Option A**) | **yes**, every step correct (`run2-fixM.txt`, `run2-final.txt`) | 0 px (measured, §4) |
| `filter: opacity(0)` | **yes**, every step correct (`run2-fixF.txt`) | 0 px |
| visible, `opacity: .12` (**Option B**) | **yes**, every step correct (`run2-fixA.txt`) | a faint 12px band |
| 0px tall + `overflow:hidden` + 12px child | **no**: `#111111` all session (`run2-fixB.txt`) | 0 px |
| `clip-path: inset(0 0 100% 0)` | **no**: `#111111` all session (`run2-fixP.txt`) | 0 px |

So **the hit-test does not reach through clipping**, whatever `IgnoreClipping` suggests. Only masking and filtering
leave the element both invisible and readable.

### 3.4 Which mechanism produces each clause

| his clause | mechanism (measured in §3.3) |
|---|---|
| 1. the fade | In a project nothing fixed covers the top centre. After the slide, `#home-screen` is `display:none`, so rule 4 drops the colour. WebKit then has none, and iOS shows its soft scroll-edge effect: a blur washed toward `<html>`'s colour, over the top bar's buttons ("covering stuff"). |
| 2. sometimes there, sometimes not | Whether a project gets a colour or the blur depends on which fixed element was seen last and whether it still has a renderer (rule 4). After a slide back, `#app` still has one; after a slide in, `#home-screen` does not (run 1: blur, then solid). Home always gets a solid colour because it is a fixed layer, so the blur only appears in projects, and only sometimes. |
| 3. black bar on the white Home | Rule 3. `#home-screen` is full-screen, so it may not replace the colour already set: the intro's `#111` after a cold start (run 2), or the editor's `#161a21`, sampled from `#app` while it sits on top for the first frames of the slide back (run 1). v16.96's `background-color` values are right but are never read, because WebKit does not look again on a colour change (rule 5). |
| 4. changes as he goes in and out | Every slide adds and removes fixed layers (`#app` becomes fixed at z 210; Home goes `display:none`/`flex`), so WebKit re-evaluates at those moments, and each result depends on the one before (rules 3 and 4). Two runs of the same code gave two different wrong answers. With Show touches on, every tap adds and removes a fixed ripple too. |

This also explains the older entries. #883 ("white bar at the top inside a project") is rule 3 the other way round: a
white Home colour carried into the editor. #903 ("black bar that fades … on top of all the buttons") is the blur from
rule 7.

### 3.5 What could NOT be measured, and confidence

- **Not measured: his installed iPhone app.** There is no iOS simulator runtime here, and his rule forbids asking for
  screenshots.
  - The WKWebView probe runs the same WebCore decision code (`fixedContainerEdges`, `updateFixedContainerEdges`, and the
    commit-time trigger in `WebPageCocoa.mm`, which Mac and iOS share). But the painting it does is macOS's, and the
    Home Screen app host is closed source.
  - "The strip on his phone is drawn from this decision" rests on the open iOS code path (§3.1.7), and on it matching
    every report he has sent: #883 (white in a project), #903 (black plus fade), 25 Sep (strip = page colour with
    nothing fixed), and 26 Sep (black on the light Home, changing).
- **One inconsistency.** His 25 Sep light-Home screenshot showed `#f4f6fa`, which was Home's own colour at v16.95.
  Under rule 3 that needs an evaluation with no colour already set. That happens if Reduce Motion is on (no intro, and
  no fixed `#app` during slides, `styles.css:6774/6951`), or if the screenshot came before any intro or slide that
  session. With Option A this does not matter: the tab is the container every time.
- **Confidence:**
  - **High** that WebKit's decision is wrong today and right with the tab (measured).
  - **Medium-high** that this is what his phone draws.
  - **Medium** that the tab also removes the blur in every state. WebKit hides the edge effect whenever a colour view is
    showing, unless `_needsTopScrollPocketDueToVisibleContentInset` is set, and that cannot be checked here.
  - **Intro not changed:** while the intro plays, its `#111` still shows. It is above the tab by design, and it is
    measured.

---

## 4. Options

The strip itself is drawn by iOS, so no desktop browser can show it.
- **`PLAN/920-what-iphone-reads.png`** (1180×1638): WebKit's measured colour painted as the iPhone strip over real
  renders of the app. The strip is simulated; the pages are real. It shows today vs Option A, for six moments.
  The TODAY column combines the two HEAD runs: rows 2 and 3 (the blur, then `#161a21` on the light Home) are run 1,
  rows 1, 4, 5 and 6 (`#111`) are run 2. Each row is a measured value; no single run produced all six.
- **`PLAN/920-options.png`** (1180×812): real Chrome renders at 440 @2x of the top 40px of the light Home with a
  dialog open (`#hm-dialog`, z 210, which sits under the tab). It shows what each option adds to the page, first at
  the size it ships at and then 2× bigger.

### Option A: masked tab. **Recommended.**

`#fm-sb-tab`: fixed, full width, 12px, z 214, `pointer-events:none`, `background-color: var(--sb)`, and
`mask-image: linear-gradient(transparent, transparent)`.

- **Paints nothing.** 0 pixels changed on the whole 880×1912 screen, measured for the light Home, a project, and the
  light Home with a dialog open (`shots/*-final.png` against the same shots without it).
- **WebKit reads it at every step** (§3.3).
- **Why recommended:** it changes nothing he can see except the strip. It is an ordinary container, so its colour is
  re-read every time, and there is a measured fallback if a future iOS stops reading masked boxes. That fallback is a
  one-line swap to `filter: opacity(0)`, also measured.

### Option B: the same tab left visible at `opacity: .12`

- WebKit skips below 0.1, and reads 0.12 as the **full** colour because it reads `background-color`, not opacity.
- Over its own screen it is invisible. Over anything else it shows a faint band: **21,120 pixels change, by up to 10
  levels, in the top 12px** with the dialog open.
- It relies only on the documented 0.1 threshold, so it is the fallback if both mask and filter ever stop being read.

### Option C: make the screens' own top bars sticky/fixed with a solid colour. Not recommended; no picture.

- `.hm-top` would need an opaque colour over the Home glow, which is a visible change he has not asked for.
- The dark Home's `.hm-top` has a backdrop-filter, which makes WebKit return "Multiple" anyway (§3.2).
- It still needs the re-insert kick. More change for the same result.

**Refuted by measurement (do not use):** a 0px-tall `overflow:hidden` wrapper, and `clip-path`. WebKit never reads them.

---

## 5. The exact change (Option A)

### 5.1 `styles.css`: add this block after the dark-Home lines

Put it directly after the current `styles.css:2179–2180`. Anchor: the line
`html:not([data-home="light"]):not(.splash-on):has(#home-screen:not(.hidden)) { background-color: #091823; }`.
Same text as `PLAN/proposed/styles-920-tab.css`:

```css
/* ═══ QUEUE 920 (26 Sep) — THE TOP-EDGE TAB: the one thing iOS 26 reads for the status-bar strip.
   His words: *"when you're on the white mode … it's got a black bar at the top and like when you go in and out of
   projects it's like changing constantly"*. iOS 26's WebKit colours the strip from the first plain background-color on
   the FIXED element under the top centre of the viewport, 4px down, and only looks again when a fixed element is added
   or removed; a full-screen one never replaces a colour already set. The why, the WebKit source and the measurement are
   in js/statusbar.js, which creates this element and keeps --sb equal to the screen's top colour.
   ⚠️ THE MASK MAKES IT PAINT NOTHING, in a way WebKit still reads. Measured in a real
   WKWebView: mask-image and filter:opacity(0) are read; height:0 + overflow:hidden and clip-path are NOT (its hit-test
   does not reach through a clip); opacity under 0.1 and visibility:hidden are skipped by rule.
   ⚠️ 12px, not less: WebKit ignores a background on a box 10px thin or thinner. Full width: under 90% of the viewport
   and WebKit skips it. Never full height, or it becomes a "viewport-sized" container that never replaces a colour.
   ⚠️ z 214: above #home-screen (200), #app mid-push/pop (210), the push's + and toast (212/213); below the scrims (220+)
   and the intro (10000). pointer-events:none so the top 12px of every screen still takes taps. */
#fm-sb-tab {
  position: fixed; top: 0; left: 0; right: 0; height: 12px; z-index: 214; pointer-events: none;
  background-color: var(--sb, #161a21);
  -webkit-mask-image: linear-gradient(transparent, transparent); mask-image: linear-gradient(transparent, transparent);
}
```

### 5.2 `js/statusbar.js`: two hunks

The full proposed file is `PLAN/proposed/statusbar.js`, and the diff against the current file is
`PLAN/proposed/statusbar.diff`.

**Hunk 1.** Replace the whole current `start()` function, from `  function start() {` down to the
`    if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });` line and its closing
`  }`, with:

```js
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
```

**Hunk 2.** The export line at the bottom becomes:
```js
  FM.statusBar = { colours: COLOURS, sync, want, syncTab, kick, staleInstall: staleInstall, explain: explain, _maybeTell: maybeTell, _SEEN: SEEN };
```

### 5.3 `index.html`: cache-busters (ship.sh refuses without them)

- `styles.css?v=N`: the gate compares with HEAD. At review time HEAD had `726` and the working tree already `727`
  (the other session's uncommitted v17.05). Rule: if the tree's value still equals HEAD's, add 1; if it is already
  above HEAD's, bumping once more is harmless, so add 1 anyway. Re-read it first.
- `js/statusbar.js?v=3` becomes `?v=4`.
- Version label, POLISH-LOG line and REQUESTS.md summary stamp as usual. The POLISH-LOG line claims `queue 920`, and the
  new test is its catching test.

### 5.4 Do not change

- `apple-mobile-web-app-status-bar-style` stays `default`.
- Do **not** ask him to reinstall: the tab is page code and arrives with the update.
- Leave v16.96's `background-color` rules alone. They still colour the blur in any state the tab might miss, and the
  existing 920 tests hold them.

---

## 6. The proving test

Full code: `PLAN/proposed/test-920-tab.js`. Paste it into `tests/tests.js` directly after the test named
`'920 the status bar takes each screen top colour from the page background-color — light Home, dark Home and a project'`.
That test's closing `});` is followed by `test('903: the home screen paints no heavy colour wash…`.

```js
  /* QUEUE 920 (26 Sep) — HIS BLACK BAR ON THE LIGHT HOME, AND THE FADE THAT COMES AND GOES.
     *"sometimes the top bar instead of it being like when you're on the white mode it going white all the way to the top
     it's got a black bar at the top and like when you go in and out of projects it's like changing constantly"*
     iOS 26's WebKit colours the status-bar strip from the first plain background-color on the FIXED/STICKY element under
     the top centre of the viewport, 4px down (LocalFrameView::fixedContainerEdges) — re-read only when a fixed element is
     added or removed, and never REPLACED by a container the size of the whole viewport (WebKit 8b209a7). Every screen here
     is one of those (#splash, #home-screen, #app mid-push/pop), so the editor's #161a21 stuck on the light Home, and a
     project with nothing fixed at the top got iOS's blur instead. Measured in a real WKWebView (macOS 27) before the fix:
     #161a21 on the light Home after one round trip. #fm-sb-tab is the one ordinary container WebKit now finds on every
     screen. This holds it to the rules WebKit classifies by, at the moments that went wrong — the first frame of a push, the
     middle of it, after it; the same for the pop; a light/dark switch — and holds that every colour change RE-INSERTS it,
     because that removal is the only thing that makes WebKit look again.
     The probe does what WebKit's own hit-test does and Chrome's does not: it ignores pointer-events
     (IgnoreCSSPointerEventsProperty). It does NOT look through clipping — measured in a WKWebView, a clipped tab is never
     read — and, like WebKit, it is not stopped by the tab's mask. Its control hides the tab and must then see #home-screen
     as a full-screen layer — the exact thing that inherits a stale colour — so a pass cannot be vacuous. */
  test('920 the top-edge tab: every screen offers iOS the same short fixed tab at the top centre, in that screen top colour, re-inserted on every switch', { item: '920', budgetMs: 40000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const html = document.documentElement, home = document.getElementById('home-screen');
    const C = FM.statusBar && FM.statusBar.colours;
    if (!C) throw new Error('setup: FM.statusBar.colours is missing');
    const rgbOf = h => { const n = parseInt(String(h).slice(1), 16); return 'rgb(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')'; };
    const homeOn = () => !!home && !home.classList.contains('hidden');
    const wasHome = homeOn(), dh = html.getAttribute('data-home');

    /* WebKit's pick for the TOP side, ported from Source/WebCore/page/LocalFrameView.cpp (fixedContainerEdges):
       hit-test (width/2, 4), walk up to the first fixed/sticky box, classify it against the viewport (<90% narrow,
       90–105% same, >105% larger), and take the first visible plain background-color on a box >10px tall and ≥90% wide. */
    function topEdge() {
      const W = innerWidth, H = innerHeight, vpW = W - 8, vpH = H - 8;
      const cmp = (len, vp) => len < vp * 0.9 ? 'S' : len < vp * 1.05 ? 'M' : 'L';
      const st = document.createElement('style');
      st.textContent = '*,*::before,*::after{pointer-events:auto!important}';
      document.head.appendChild(st);
      try {
        const hit = document.elementFromPoint(W / 2, 4);
        let colour = null;
        for (let el = hit; el && el.nodeType === 1; el = el.parentElement) {
          const cs = getComputedStyle(el), r = el.getBoundingClientRect(), bg = cs.backgroundColor;
          const visibleBg = bg && bg !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(bg);
          if (!colour && visibleBg && r.width >= vpW * 0.9 && r.height > 10 && cs.visibility === 'visible' && +cs.opacity >= 0.1) colour = bg;
          if (cs.position === 'fixed' || cs.position === 'sticky') {
            const side = cmp(r.width, vpW), adj = cmp(r.height, vpH);
            const kind = side === 'S' ? 'too narrow' : (side === 'M' && adj === 'M') ? 'full-screen' : adj === 'L' ? 'too tall' : 'bar';
            return { id: el.id || String(el.className || el.tagName), kind: kind, colour: colour, hit: hit.id || String(hit.className || hit.tagName) };
          }
        }
        return { id: null, kind: 'none', colour: colour, hit: hit ? (hit.id || String(hit.className || hit.tagName)) : null };
      } finally { st.remove(); }
    }
    function mustBeTab(want, where) {
      const e = topEdge();
      if (e.id !== 'fm-sb-tab') {
        throw new Error(where + ': iOS\'s top-centre sample lands on ' + (e.id ? '#' + e.id + ' (' + e.kind + ')' : 'nothing fixed') + ', hit ' + e.hit + ' — '
          + (e.kind === 'full-screen' ? 'a full-screen layer never replaces the colour it inherited: the black bar on the light Home' : 'with nothing fixed at the top iOS draws its blur: the fade'));
      }
      if (e.kind !== 'bar') throw new Error(where + ': WebKit would read the tab as ' + e.kind + ' — only a short full-width bar has its colour re-read every time');
      if (e.colour !== rgbOf(want)) throw new Error(where + ': the tab offers ' + e.colour + ', not this screen\'s top colour ' + rgbOf(want));
    }
    async function settle(what) {   // until the push/pop is over: Home shown/hidden as asked, no push or pop classes left
      for (let i = 0; i < 60; i++) {
        const b = document.body.classList;
        if (!b.contains('fm-pushing') && !b.contains('fm-popping') && homeOn() === (what === 'home')) return;
        await sleep(50);
      }
      throw new Error('setup: the ' + (what === 'home' ? 'pop back to Home' : 'push into the project') + ' never finished');
    }

    await atPhoneWidth(async function () {
      const tab = document.getElementById('fm-sb-tab');
      let kicks = [];
      const mo = new MutationObserver(recs => recs.forEach(r => {
        if (r.type === 'attributes' && /display:\s*none/.test(r.oldValue || '')) kicks.push(((r.oldValue.match(/--sb:\s*([^;]+)/) || [])[1] || '').trim());
        if (r.type === 'childList') [].forEach.call(r.removedNodes, n => { if (n.id === 'fm-sb-tab') kicks.push((n.style.getPropertyValue('--sb') || '').trim()); });
      }));
      const kickedWith = (want, where) => {
        if (!kicks.some(k => k.toLowerCase() === want.toLowerCase())) throw new Error(where + ': the tab took ' + want + ' but was never re-inserted with it (re-inserts seen: [' + kicks.join(', ') + ']) — WebKit re-reads the top only when a fixed element comes or goes, so the colour would stay stale');
        kicks = [];
      };
      try {
        for (let i = 0; i < 100 && document.getElementById('splash'); i++) await sleep(100);   // the intro (z 10000) is above everything until boot removes it
        if (document.getElementById('splash')) throw new Error('setup: the intro never left, and it covers the top centre');
        html.classList.remove('splash-on', 'splash-on-light');
        html.setAttribute('data-home', 'light');
        if (!homeOn()) { FM.home.open(); }
        await settle('home'); await sleep(150);

        // CONTROL — without the tab, the probe must see what WebKit saw before the fix: Home as a full-screen layer.
        if (tab) tab.style.setProperty('display', 'none', 'important');
        const bare = topEdge();
        if (tab) tab.style.removeProperty('display');
        if (bare.id !== 'home-screen' || bare.kind !== 'full-screen') throw new Error('control: with the tab gone the probe finds ' + bare.id + ' (' + bare.kind + '), not #home-screen as a full-screen layer — it cannot tell the fix from the bug');
        if (!tab) throw new Error('there is no #fm-sb-tab — iOS samples #home-screen, a full-screen layer, which keeps whatever colour came before it (the editor\'s #161a21 after a project, the intro\'s #111 after launch): the black bar on the light Home');
        mo.observe(tab, { attributes: true, attributeFilter: ['style'], attributeOldValue: true });
        mo.observe(document.body, { childList: true });

        // It paints nothing (masked to transparent — a mask is the kind of invisible WebKit still reads), and it takes no taps.
        const tcs = getComputedStyle(tab), mask = tcs.maskImage || tcs.webkitMaskImage || '';
        const maskCols = mask.match(/rgba?\([^)]*\)/g) || [];
        if (!/gradient/.test(mask) || !maskCols.length || maskCols.some(c => !/,\s*0\)$/.test(c))) throw new Error('the tab is not masked to nothing (mask-image: ' + mask + ') — it would paint a 12px band of colour across the top of every screen');
        if (tcs.pointerEvents !== 'none') throw new Error('the tab takes taps (pointer-events ' + tcs.pointerEvents + ') — the top 12px of every screen would go dead');
        const under = document.elementFromPoint(innerWidth / 2, 4);
        if (!under || tab.contains(under)) throw new Error('a tap at the top centre lands on the tab, not on the screen');
        // …and the kick detector sees a kick (positive control for the re-insert checks below).
        kicks = []; FM.statusBar.kick(); await sleep(0);
        if (!kicks.length) throw new Error('control: FM.statusBar.kick() re-inserted nothing the observer could see');
        kicks = [];

        mustBeTab(C.homeLight, 'light Home');

        FM.home.close({ push: true }); await sleep(0);
        mustBeTab(C.editor, 'first frame of the push into a project');
        kickedWith(C.editor, 'into a project');   // checked at the FIRST frame: the 700ms late kick cannot have fired yet, so only the immediate re-insert can pass this
        await sleep(160);
        mustBeTab(C.editor, 'middle of the push (the editor is a full-screen fixed layer now)');
        await settle('project'); await sleep(100);
        mustBeTab(C.editor, 'in the project after the push');

        FM.home.open(); await sleep(0);
        mustBeTab(C.homeLight, 'first frame of the pop back to the light Home (the editor is still on top of it)');
        kickedWith(C.homeLight, 'back to the light Home');
        await sleep(160);
        mustBeTab(C.homeLight, 'middle of the pop');
        await settle('home'); await sleep(100);
        mustBeTab(C.homeLight, 'back on the light Home');

        html.setAttribute('data-home', 'dark'); await sleep(60);
        mustBeTab(C.homeDark, 'dark Home');
        kickedWith(C.homeDark, 'light → dark');
        FM.home.close({ push: true }); await settle('project'); await sleep(100);
        mustBeTab(C.editor, 'project, entered from the dark Home');
        FM.home.open(); await settle('home'); await sleep(100);
        mustBeTab(C.homeDark, 'back on the dark Home');
        html.setAttribute('data-home', 'light'); await sleep(60);
        mustBeTab(C.homeLight, 'dark → light, on Home');
        kickedWith(C.homeLight, 'dark → light');
      } finally {
        mo.disconnect();
        html.setAttribute('data-home', dh || 'light');
        if (wasHome && !homeOn()) FM.home.open();
        if (!wasHome && homeOn()) FM.home.close();
        await sleep(200);
      }
    }, 440);
  });
```

**Why it fails on HEAD.** There is no `#fm-sb-tab`. The control passes, because the probe finds `#home-screen` as a
full-screen layer, and the next line throws.

**Reviewer's change (26 Sep, NOT re-run).** The two `kickedWith` calls for the push and the pop were moved from after
`settle(…)` to straight after the first-frame `mustBeTab`. Reason: `settle` returns about 520–570 ms after the push starts
(`PUSH_IN_MS = 520`, `js/home.js:179`), plus a 100 ms sleep, so the old check ran 30–80 ms before the 700 ms late kick.
Under suite load the late kick could land first, and the "drop the immediate kick" mutation would then pass. At the first
frame only the immediate kick can have run. It is delivered in time because `statusbar.js`'s MutationObserver callback
runs in the microtask checkpoint before `sleep(0)`'s timer, and the test's own observer records come in that same
checkpoint. The HEAD failure is unchanged (the test throws earlier, at "there is no #fm-sb-tab"). The builder must
confirm with `?only=920` (§7.1) and by re-running that one mutation with `tools/mutate.sh js/statusbar.js "    kick();"
"    /*kick();*/"`. `    kick();` (4 spaces) occurs once in the new file; `mutate.sh` refuses otherwise. The
planner's original is kept as `PLAN/proposed/test-920-tab.planner.js`.

**Validated with `tools/shot.py` at 440×956** (the planner's version, before the change above). The same test body was
run in the live app with `atPhoneWidth` replaced by the 440px viewport (`PLAN/validate-*.js`):

| run | result |
|---|---|
| HEAD | `FAIL: there is no #fm-sb-tab — iOS samples #home-screen, a full-screen layer, which keeps whatever colour came before it (the editor's #161a21 after a project, the intro's #111 after launch): the black bar on the light Home` |
| with §5 injected | **`PASS in 2906ms`** |
| mutation `z-index: 214` → `205` | `FAIL: middle of the push (the editor is a full-screen fixed layer now): iOS's top-centre sample lands on #app (full-screen)…` |
| mutation `height: 12px` → `10px` | `FAIL: light Home: the tab offers null, not this screen's top colour rgb(250, 253, 255)` |
| mutation: drop the immediate `kick();` in `syncTab` | `FAIL: into a project: the tab took #161a21 but was never re-inserted with it (re-inserts seen: [])…` |
| mutation: drop the two mask declarations | `FAIL: the tab is not masked to nothing (mask-image: none) — it would paint a 12px band…` |

**Positive controls inside the test:**
1. With the tab hidden, the probe must see `#home-screen` as full-screen, so it can tell the bug from the fix.
2. `FM.statusBar.kick()` must be seen by the re-insert detector before that detector is trusted.
3. A plain `elementFromPoint` at the top centre must NOT land on the tab, so taps still get through.

The probe ignores pointer-events like WebKit does. It does **not** look through clipping, because WebKit measurably
does not. Like WebKit, Chrome's hit-test is not stopped by a mask.

---

## 7. Verification steps (builder)

1. Run `python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=920'` first (all four 920 tests), then
   the full suite as ship.sh does it: the 900px frame plus `--width 380`. The new test forces 440 on its own.
2. **Real-WebKit check of the built tree.** This is one command and takes about 35 s. Run it when nothing else is
   shipping. It needs `tools/serve.sh` running on 8777. First copy the probe into the repo (decided in §8) and build it
   into the scratchpad, never the repo:
   `mkdir -p tools/wkedge && cp PLAN/harness/main.swift PLAN/harness/scen2.json tools/wkedge/ && swiftc tools/wkedge/main.swift -o "$TMPDIR/wkedge"`
   then `"$TMPDIR/wkedge" http://127.0.0.1:8777/index.html tools/wkedge/scen2.json | grep -E '^ *[0-9]+ +(HOME|PROJ)|top=nil'`.
   The one or two `top=nil` lines stamped before about 3000 ms are the page loading before the intro (in
   `run2-final.txt` they are the first two lines) and are expected.
   Pass no fix file, because the fix is in the tree now. Every `HOME-L` line must say `top=#fafdff`, every `HOME-D`
   `top=#091823`, every `PROJ` `top=#161a21`, and nothing after the intro may say `top=nil`.
3. **Phone 380×820 and his 440×956, light and dark Home and a project** (shot.py). Freeze animations as
   `PLAN/cap-home.js` does. The top 20px must be pixel-identical to before, because the tab paints nothing; this was
   measured as 0 changed pixels on the whole screen. Taps at the top centre must still reach the Home wordmark row and
   the phone top bar (the test checks this).
4. **PC 1280×900.** The tab exists at every width and paints nothing. Desktop Safari 26 would tint its toolbar from it,
   which is more correct than today. Windows and Chrome ignore all of this.
5. **iPhone:** not possible here. Say so in the ship note.

---

## 8. Risks, and tests that might break

- **Existing tests (checked with grep): expected breakage is none.**
  - `coveringNow()` (tests.js ~14654) and the Shift+End cover scan (~45333/45368) look for fixed boxes at least 90% of
    the viewport tall. The tab is 12px, so they ignore it.
  - The sheet-shadow scan (~12592) skips fixed boxes under 40px.
  - `FM.overlayOwnsScreen()` (`js/app.js:8560`) asks what is at the MIDDLE of the screen, using `elementsFromPoint`,
    which skips `pointer-events:none`.
  - The three existing 920 tests read theme-color, `background-color` and the stale-install path. All three are
    unchanged.
  - Nothing reads `document.body.children`, `.childNodes`, `.firstElementChild` or `.lastElementChild` in `tests/tests.js`
    or `js/*.js` (reviewer grep, 26 Sep: 0 hits). The `body.children` uses at tests.js ~8191, ~57547 and ~101031 are
    local panel bodies, not `<body>`.
  - The push formation sweep (tests.js ~21014 and ~21044, `'home push…'`) walks body-level fixed elements. The tab has
    no animation, so the first sweep skips it. In the second it stays put (`dSelf` spread 0), so it passes. Checked by
    reading the code, not run.
- **A future iOS may treat masked boxes as hidden.** The fallback is a one-line swap to `filter: opacity(0)` (measured,
  §3.3), and Option B after that. The real-WebKit command in §7.2 is how anyone can tell which one is being read.
- **Scrims and dialogs.** The tab sits under the scrims (220+), so while one is open WebKit applies its own rules:
  a full-screen dim keeps the colour already set, and a panel anchored to the top lends its own colour. `#hm-dialog` and
  `#fm-ask` (`styles.css:5346`, z 210, a 70% dark `rgba(4, 6, 10, .7)` backdrop) sit under the tab, so the strip stays
  the screen's colour while they are up. On the light Home that means a `#fafdff` strip above a dimmed page for as long
  as a dialog is open. WebKit's own rule for a full-screen layer (keep the existing colour) gives the same result, so this
  is not new, but it is visible and it is not measured on a phone. It is not in his clauses. If he names it, the lever is
  a darker `--sb` while `#hm-dialog`/`#fm-ask` is open.
- **The intro is unchanged.** It is above the tab, so its `#111` stays in the strip while it plays: under the light look
  that is a dark strip over the white end of the film for about a second. Not in his clauses. If he ever names it, the
  lever is a kick when the intro's background finishes ramping.
- **Show-touches ripple** (z 9999) sitting on the sample point during a switch. Covered by the second kick 700 ms later,
  and by the ripple's own removal (measured: corrected 476 ms later).
- **If the blur still shows in a project after this ships,** the iOS host is forcing its edge effect
  (`_needsTopScrollPocketDueToVisibleContentInset`), and nothing in the page can turn that off. The colour would still
  match, because `<html>` is already `#161a21` there.
- **DECIDED (reviewer): the real-WebKit probe goes into the repo in this release**, as `tools/wkedge/main.swift` plus
  `tools/wkedge/scen2.json` (the command is in §7.2). Do not commit the binary.
  - **Why:** §7.2 is the only real-WebKit check, and its source lives in `/private/tmp`, which macOS clears. This strip
    has been reported many times (statusbar.js lists #135, #143, #162, #553, #883, #903 and #920), and his standing
    rule is that anything that could be forgotten must be structural.
  - **Edit when copying:** `main.swift`'s first line says "planning only — lives in the scratchpad, never in the repo".
    Replace that one line with this one line:
    `// Real-WebKit probe for queue 920 (what iOS 26's WebKit picks for the status-bar strip). Build: swiftc tools/wkedge/main.swift -o "$TMPDIR/wkedge"`
  - **Tooling:** it uses SPI (`_sampledTopFixedPositionContentColor`, `_setWindowOcclusionDetectionEnabled:`) and needs
    only `swiftc`, which is already installed.
  - **Scope:** new files in `tools/` are outside the `?v=` gate.

---

## 9. Questions for Ezra

None. Option A changes nothing he can see except the strip, so there is no picture for him to choose between. And by
his rule he is not asked for screenshots.

For REQUESTS.md: tick clauses 7–10 as **built**, marked unverified on the iPhone, and add
`⏸ BUILT OUT UNTIL HE opens and closes a project a few times on his phone and says whether the top ever goes black or fuzzy`.
Also strike the entry's two holding lines, `⏳ PLAN PENDING: the logging chat is researching…` and
`JUMPED: waiting on the logging chat's plan block…`. The entry itself says "Take this line off when the plan lands". Left
in place, the JUMPED line keeps the item out of the oldest-first gate.

## 10. What to tell him (one line)

"Found why the top kept changing: your iPhone keeps the colour of whichever screen it saw first and won't let the next
one replace it, so the white Home kept the project's black — now every screen hands the iPhone its own colour each time
you switch, no reinstall needed; go in and out of a project a few times and just tell me if the top ever goes black or
fuzzy again."

## 11. Sources

- WebKit `LocalFrameView::fixedContainerEdges`: https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/LocalFrameView.cpp
- WebKit `Page::updateFixedContainerEdges`: https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp
- WebKit `WebPage::willCommitMainFrameData`: https://github.com/WebKit/WebKit/blob/main/Source/WebKit/WebProcess/WebPage/Cocoa/WebPageCocoa.mm
- WebKit colour extension and scroll pocket: https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/Cocoa/WKWebView.mm and https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/ios/WKWebViewIOS.mm
- Pref default: https://github.com/WebKit/WebKit/blob/main/Source/WebKit/Shared/Cocoa/WebPreferencesDefaultValuesCocoa.mm
- Commit 8b209a7 (viewport-sized containers may not replace a colour): https://github.com/WebKit/WebKit/commit/8b209a7da992cc5728c936b41afc2ae5dbafd2e5
- Commit 76ee762 (dimming layers keep the existing colour): https://github.com/WebKit/WebKit/commit/76ee762294ac08f751a17daec6a959751405c44a
- Commit c9f1bebd (top colour can change after scrolling on iPhone): https://github.com/WebKit/WebKit/commit/c9f1bebd8e25c4d0c16472d4c046be474632f23e
- WebKit bug 301756 (Wenson Hsieh, comment 2): https://bugs.webkit.org/show_bug.cgi?id=301756
- homecast-web#199: https://github.com/parob/homecast-web/pull/199
- letter-archive#172 (stale edge colours on open/close): https://github.com/MLGalusha/letter-archive/issues/172
- joe-bell/skills#6: https://github.com/joe-bell/skills/pull/6
- okou#36386 (a fixed strip at the top edge replaces the blur): https://github.com/okou-ai/okou/pull/36386
- dozzle#5222: https://github.com/amir20/dozzle/pull/5222
- fin-app#411: https://github.com/MrClit/fin-app/issues/411
- vcsudoku#38: https://github.com/tmshv/vcsudoku/pull/38
- hypersweeper#145: https://github.com/sirk0/hypersweeper/pull/145
- barcelona-cinemas#98 (Safari tab, iOS 26.5 simulator): https://github.com/jas7553/barcelona-cinemas/pull/98
- Ben Frain, iOS 26 fixed-element tinting: https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/
- Ben Nasedkin, Safari 26–27 colours: https://nasedk.in/blog/ios26-safari-toolbar-colors/

---

## Review (skeptical reviewer, 26 Sep ~21:50; no repo file edited, nothing run against the live server)

**Verdict: ready after fixes.** The mechanism, the evidence and the code hold up. What changed:

**References corrected** (re-read from the current working tree, which carries the other session's uncommitted v17.05):
- `index.html`: `statusbar.js` is on line 1051, not 1050.
- `styles.css?v=`: HEAD has 726, the tree has 727. §5.3 now gives an explicit rule instead of "N was 726".
- `theme-glass.css`: every reference was one line off. Now 532/539, 550, 880 and 886.
- `#splash`: the declarations are on `:2111`.
- Checked and correct as written:
  - `styles.css`: 2169, 2179–2180, 4256/4266, 4751–4752, 6069, 6771/6774, 6856/6951.
  - `js/statusbar.js`: 37/40/45/51–56/100.
  - `js/home.js`: 489/2960/2967/2979/2984.
  - `js/settings.js:146`, `js/app.js:8560`, tests.js ~14654/~45368.
  - The anchor test and its successor (`'903: the home screen paints no heavy colour wash…'`).

**Evidence checked against the files:**
- `run-head.txt`, `run2-head.txt`, `run2-final.txt` and the five `run2-fix*.txt` say what §3.3 says. The lags are
  100/77/75/476/75/76/75/76 ms.
- The before and after shots are byte-identical (`cmp`), which backs "0 pixels changed".
- `validate-*.txt` match the §6 table.
- The §5 CSS and JS match `proposed/` and `statusbar.diff`, and the injected `fix/injFinal.js` is that code.
- `proposed/statusbar.js` and the test parse (JavaScriptCore).

**Wording fixed:**
- §0 "within 50–100 ms" now says 75–100 ms, plus the 476 ms ripple case.
- Run 1 is the 21 s `scen-head.json` timeline. It went back to the light Home once more, not "twice more".
- §4 now says the TODAY column in `920-what-iphone-reads.png` combines both HEAD runs.

**Images:** both open.
- `920-what-iphone-reads.png` is 1180×1638 and `920-options.png` is 1180×812. Both are within the phone limits and show
  what the plan says.

**Test hardened, NOT re-run** (details in §6):
- The push and pop `kickedWith` checks now run at the first frame. Before, they ran 30–80 ms before the 700 ms late kick,
  so the "drop the immediate kick" mutation could slip through under load.
- HEAD still fails the same way.
- The builder re-runs that one mutation with `tools/mutate.sh`. The planner's version is kept as
  `proposed/test-920-tab.planner.js`.

**Decided, not left to the builder:**
- The WKWebView probe is committed as `tools/wkedge/` (§8). §7.2 builds it from there, and its grep now shows `top=nil`
  lines.
- §9 now says to strike #920's `⏳ PLAN PENDING` and `JUMPED` lines, which would otherwise keep holding the queue.

**Risks made explicit (§8):**
- A light Home with a dialog open gets a `#fafdff` strip over a 70% dim. WebKit does the same today, but nobody has
  seen it on a phone.
- The body-children and push-formation sweeps were checked by reading the code (0 `document.body.children` users).

**Still unverified** (the planner said so too):
- How iOS paints WebKit's decision.
- The test inside `run.html`'s 440×760 frame.
- The moved `kickedWith` lines.

**Scope note:** the request this workflow relayed (the PC Add-layer menu and inspector shrinking, REQUESTS.md ~33561)
is not #920. It belongs to a sibling plan (`plans/panels/`), not this one. This plan covers all four of #920's
26 Sep clauses, and its quote matches REQUESTS.md:32665 word for word.
