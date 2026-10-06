# H9: read-only second opinion on the Simple mode branches

Against `origin/main` b46b47d3 (v17.23). Nothing was changed, merged or run against his projects. Scope is what he asked: bugs, 380 px layout risk, and anything that could change the ORIGINAL Full editor (his rule of 1 Oct: the original editor must not change in design or function, apart from the third section in the settings cog). No redesign advice.

## Which branches, and what I actually reviewed

| branch | head | relation |
|---|---|---|
| `980-p22-trayb2` | a7000c6f | **the one I reviewed in full**: 61 commits on main, contains `980-p22` |
| `980-p22` | bda3802e | an ancestor of `trayb2` (30 commits), so covered by it |
| `980-phase2` | f368458d | **not** an ancestor of `trayb2`: it is the one release-2.2 commit, which `p22` carries again in a later form (88 more lines in `spine-edit.js` on `p22`). Covered by content, not by history |
| `fu-lock-r5` | f0e6e8dd | main plus tooling only. `git diff --stat` for `js/`, `styles.css`, `index.html`, `sw.js` is empty, so by construction it cannot change Full. Reviewed as a tool, below |

**What I read:** every changed line in every file that already existed on main (`js/app.js` 219 lines, `js/timeline.js`, `js/history.js`, `js/scene.js`, `js/storage.js`, `js/compositor.js`, `js/mobile.js`, `js/inspector.js`, `js/collab-*.js`, `js/crop-tool.js`, `js/touchup-tool.js`, `js/ai-ops.js`, `index.html`) and all 309 added lines of `styles.css`. **What I did not read line by line:** the new files (`spine-edit.js` 1453 lines, `spine.js`, `simple-timeline.js`, `simple-tools.js` partly, `editor-mode.js`). I read `editor-mode.js` and the first third of `simple-tools.js`. A bug inside Simple's own logic is outside what this review can promise.

## Findings, most severe first

### 1. Medium: the collab schema number can collide with main's next polish batch (`js/collab-core.js:48`, `:257`)

`C.SCHEMA_REV = 8` and a `C.SCHEMA_FP` measured "on this tree". The comment at `:44-47` says the plan was 6 to 7 and #482 batch 6 took 7 first. Main's polish batches bump this number whenever an effect gains a control, and they keep shipping. **If another batch lands on main before Simple merges, both claim 8 and the fingerprint is wrong.** It fails loudly (the `921 S1` fingerprint test names it), not silently, so this is a merge-day cost, not a hidden bug. Separately, and by design (audited as N1): a Full user on a rev-7 build cannot join a rev-8 session, so Full's collaboration needs everyone to update.

### 2. Low: `#sm-bar` is left inside Full's `#inspector-panel` after a visit to Simple (`js/simple-tools.js:71-76`, `:367-368`)

`sync()` runs `mount()` and `place()` before the `isSimple()` check, and on a PC `place()` appends the bar into `#inspector-panel` (`:76`). **Measured:** on `980-p22-trayb2` at 1280x800, Full to Simple to Full, `#inspector-panel`'s children go from `insp-grab, am-resizer, panel-title, key-rail, inspector` to the same list plus `sm-bar`. It is `display:none` in Full (`styles.css:11784`), so nothing shows, and I searched `styles.css`, `theme-glass.css`, `js/inspector.js`, `js/mobile.js`, `js/app.js` and `js/timeline.js` for `:last-child`, `lastElementChild` and `.children` readers of that panel and found none. So no visible change today. It is the kind of thing a later `:last-child` rule would turn into one. Same call also installs a `resize` listener and a `MutationObserver` on `<html style>` (`:91-92`); both return on their first line in Full, so they cost almost nothing.

### 3. Low: a screen-reader element appears for Full users after one switch (`js/editor-mode.js:176-177`)

The first switch builds `#ed-live`, a visually hidden `aria-live="polite"` region, on `body`, and it says "Full editor" when they come back. **Measured** after a round trip at 380 and 1280: it is the only new id, and every other visible box, text, colour, opacity, `<body>` class and `<html style>` was identical to main. Invisible, but a screen-reader user hears something new in Full. Only after they have used the switch.

### 4. Info: Full-visible changes that are real and are in the audit (not new findings)

I list them because "must not change" is his rule and these are the exceptions, so he should see them in one place:
- **The settings cog gets a third block for everyone** (`js/editor-mode.js:17`, `GATED = false`; `js/app.js` the `cvEd*` block). This is the one change he sanctioned. Note that the Canvas and Friends swap animation was rewritten to handle three blocks (`cvPairSwap`, the `KEY`/`BAR`/`CONTENT` maps, z-index 3/2/1, `cardShrinks = from === 'canvas'`). I traced it: with two blocks it gives the same values as before. I did not open the cog in a browser.
- **Every media layer a Full user adds now saves `srcW`, `srcH`, `srcRev`** (`js/app.js:3083`) **and every multi-file import saves `pick`** (`:3084`, `:5523-5527`). Invisible, kept by the sanitiser, and listed in `FU_INVISIBLE` (`tools/full-unchanged.sh`). They make saved projects slightly larger and reach collaborators.
- **Audio de-click at a cut** (`js/app.js:1970`, `:1979`): a pair marked `sm.cut` now needs continuity. Only Simple writes `sm.cut`, so Full-made projects sound as today; a project Simple has edited can sound different when opened in Full.

### 5. Checked and clean (so nobody re-checks)

- **Every gate returns false in Full.** `isSimple()` guards: `js/timeline.js` rebuild and playhead and key rail, `js/app.js:1004-1012` selection classes, `js/mobile.js` `sheetHeld` and `dockSheet`, `js/inspector.js` `bandIdle`, `js/history.js` `undo`/`redo` (`FM.spine.running`), `editor-mode.js` `onKey` (first lines return `false` unless in Simple).
- **`FM.history.commit(meta)`:** no caller outside Simple passes an argument, and nothing passes `commit` by reference, so Full's `meta` is always `null`. `metas` stays index-for-index with `stack` at every mutation (`js/history.js:275`, `:309-317`).
- **CSS is additive and Simple-scoped:** 309 added lines, none removed; every selector hangs on `sm-`, `ed-`, `cv-ed`, `#sm` or `body.ed-simple`.
- **`layerAABB` gained a fourth argument** (`js/compositor.js:15314`); every caller passes three, so nothing changes.
- **`FM.addMediaLayer` returns the layer now** (`js/app.js:3151`); every other caller ignores it.

## 380 px (measured, headless Chromium with device emulation, not a phone)

Simple mode, 3 clips and a title, one clip selected, on `980-p22-trayb2`:

| viewport | page scroll width | preview picture | tools row | any tool under 44 px | tray scrolls sideways |
|---|---|---|---|---|---|
| 320x568 | 320 (no overflow) | 96x171 | 80 px per project tool | none | yes |
| 360x640 | 360 | 96x171 | 90 | none | yes |
| 380x667 | 380 | 96x171 | 95 | none | yes |
| 380x800 | 380 | 153x272 | 95 | none | yes |
| 390x844 | 390 | 176x314 | 98 | none | yes |
| 430x932 | 430 | 199x354 | 108 | none | no |

- **No horizontal overflow and no tap target under 44 px** (smallest tool 54x50) at any of the six sizes.
- **On a phone 667 px tall or less the preview picture is 171 px high** (`js/mobile.js:278-279` says the stage clamp bottoms out at a 180 px floor below 694 px). It works; it is small. Reported as a fact, not a defect.
- **The seven-tool tray is about 392 px wide**, so at 390 and below it scrolls sideways (the pin stays on screen). A person with a first-time phone may not see the last tool; that is a layout fact, I did not test discovery.

## Full against main (measured)

Both builds served from separate folders, same scene (three video layers and a title), clip selected, every visible element with an id compared by box, text, colour, background and opacity:

| viewport | visible ids main / branch | differences |
|---|---|---|
| 380x800 | 51 / 51 | none |
| 320x568 | 51 / 51 | none |
| 390x844 | 51 / 51 | none |
| 1280x800 | 56 / 56 | none |

Two runs each. **One false alarm worth knowing:** `#add-grid` is 301.6 px high on some loads and 282 px on others, **on main as well** (main gave 282 in 1 of 7 loads), so it is a pre-existing race, not Simple's. The comparison only counts a difference that appears in both runs.

**What this does not cover:** one scene, Home open, one selection. It is a sanity check, not a substitute for `tools/full-unchanged.sh`.

## `fu-lock-r5` as a tool

Read, not run (its own header says about three hours on his Mac, and a PASS is cached by a source hash).
- **It touches no app file** (stat above), so it is safe to merge on its own.
- `tools/ship.sh` is changed by +39 lines: it runs the gate's self-test first, refuses a Simple release without a PASS on the exact tree, and asks again just before the commit. I read these lines and the logic is as the header says.
- `FU_INVISIBLE` allows exactly the keys in finding 4 plus `layer.sm.twin`, `presence.ed` and `manifest.w/h/dur`. `layer.sm.cut` (finding 4, third bullet) is not in it and does not need to be, since Full never writes it; it is the one place a Full-made versus Simple-touched project can differ in sound.
- **Not checked:** whether its plants really turn it red. That is the part that costs three hours.

## What I did not do

No real device, no Safari, no opening the cog, no mutation of the lock, no read of Simple's own command logic past what the diffs of shared files needed. If he wants one more pass, the most valuable one is `spine-edit.js` against the `AUDIT-FULL-UNTOUCHED.md` list.
