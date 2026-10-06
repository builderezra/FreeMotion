# Dead code and duplicate logic inventory (H7)

Against `origin/main` b46b47d (v17.23). Report only: nothing was deleted or changed.
**Method (so the limits are clear):** Python scripts over `js/*.js`, `sw.js`, `index.html`, `styles.css`, `theme-glass.css` and `tests/`. A name counts as "unreferenced" when its identifier appears nowhere else in the app, in `index.html`, or in the suite (token match, comments included, so a name that is only in a comment still counts as used, which errs towards keeping). I then confirmed each candidate with a repo-wide search. **Not caught:** dead code that is still referenced by other dead code, and anything reached through a string built at run time. I checked the second: the only `FM[...]` lookups are the tool namespaces in `js/collab-bridge.js:47-51` and `js/collab-presence.js:205-210`, which do not touch anything below.
**Verified** = confirmed by search. **Guess** = needs a person or a browser.

Scale: 3,060 function definitions scanned, **11 truly dead** (about 107 lines), 45 more that are only used by the test suite (kept on purpose), **52 CSS classes** and **3 CSS ids** that nothing uses, and **140 probe pages** that nothing mentions. The codebase is cleaner than I expected.

## 1. Dead JavaScript, ranked by risk of removal (lowest first)

Every name below appears **only at its own definition**, in the whole repo outside the `.md` notes. Not even the suite uses them.

| # | What | Where | Size | Why it is dead | Risk of removing |
|---|---|---|---|---|---|
| 1 | `FM.closeEasingCurve` | `js/graph-editor.js:588` | 1 line | its sibling `FM.openEasingCurve` is used (`js/inspector.js:4971`); the inspector's own back button clears the flag directly (`js/inspector.js:7148`) | none |
| 2 | `snapTo` | `js/canvas-edit.js:16` | 5 lines | the app uses `FM.snapAxis` (`js/app.js`, the shared one) instead | none |
| 3 | `makeMaskFallback` | `js/inspector.js:3053` | 4 lines | nothing calls it | none |
| 4 | `FM.layerHasMotionBlur` | `js/compositor.js:3731` | 5 lines | nothing calls it | none |
| 5 | `textRow` | `js/inspector.js:104` | 12 lines | the inspector builds rows with other helpers | none |
| 6 | `selectRow` | `js/inspector.js:116` | 15 lines | `js/settings.js` has its own, separate `selectRow`; this one is never called | none |
| 7 | `FM.distributeLayers` | `js/app.js:3444` | 8 lines | no button or shortcut calls it | low (check the align bar once: it is built elsewhere) |
| 8 | `FM.alignLayers` | `js/app.js:3429` | 15 lines | same | low |
| 9 | `gradientControls` | `js/inspector.js:4074` | 18 lines | nothing calls it | low (gradient UI is elsewhere; confirm in the browser) |
| 10 | `FM.fxOverriddenOnLayer` | `js/compositor.js:2520` | 23 lines | nothing calls it; sits in the compositor, so read it once before deleting in case it documents a rule | low |
| 11 | `FM.vadDefaults` | `js/captions-vad.js:226` | 1 line | only `tests/_vadreal.html` (a probe page) | none, but the probe page would break |

**Seams, kept on purpose:** about 45 `FM._something` functions (for example `FM._runExport` `js/app.js:5813`, `FM._handleFiles` `:5473`, `FM._sceneRevState` `js/storage.js:151`) have no caller in the app but are used by the suite. They are test seams, not dead code. Three seams have no test at all: `FM._resetPlayPaint` (`js/app.js:210`), `FM._resetAacProbe` (`js/app.js:5755`), `FM._glow6` (`js/compositor.js:12456`); and `FM._postFxTypes` (`js/compositor.js:3505`). Either add a test that uses them or remove them: this is a decision, not a safe delete.

## 2. Dead CSS

**3 ids with a rule and no element:** `#layers-panel` (`styles.css:297`), `#layer-list` (`styles.css:1015`), `#m-proj-more` (`styles.css:4214`). The first two are from the old layers panel that moved into the timeline (the repo's own note says "layers live in the timeline now"). Also in `index.html`, three ids that no script or style uses: `fm-note-sheet`, `fm-note-sheet-m`, `transport-extra`.

**52 classes with a rule and no mention in any script or in `index.html`** (and no run-time prefix: I removed 20 names that code builds by concatenation, such as `pb-z-n`, `sb-ne`, `fm-rail-arrow--next`, which must stay). In rule order:

| Group | Classes (first rule line) |
|---|---|
| old layer rows and inspector (all in `styles.css:1016-1047`) | `layer-row` :1016, `lr-thumb` :1026, `lr-name` :1031, `lr-vis` :1032, `lr-lock` :1034, `insp-head` :1043, `insp-thumb` :1044, `insp-name` :1045, `insp-del` :1047, `drop-target` :1025 |
| old effects stack (`styles.css:1704-1769`) | `preset-warn` :1704, `preset-del` :1705, `preset-empty` :1707, `fx-mv` :1711, `fx-toggle` :1714, `fx-slider` :1716, `fx-desc` :1741, `fx-rm` :1766, `fx-val` :1769 |
| old graph editor (`styles.css:1752-1759`) | `ge-ctrls` :1752, `ge-vals` :1755, `ge-val` :1756, `ge-presets` :1758, `ge-preset` :1759 |
| old Add menu | `add-card` :4819, `add-ic` :4826, `addmenu-body--list` :5003, `addmenu-search` :5005, `addmenu-list` :5007, `addmenu-none` :5008, `addmenu-quick` :5877 |
| filters sheet | `flt-list` :8176, `flt-desc` :8195, `flt-made` :8198, `fx-add-filter` :8017 |
| other | `te-open` :1280, `pe-btn` :1377, `tb-divider` :214, `tbtn-spacer` :2989, `vb-sep` :2430, `clip-thumb` :3184, `align-groupacts` :3241, `ai-remember` :4381, `mask-block` :6336, `insp-sec-title` :6636, `insp-sec-x` :6637, `hm-brand-mark` :6706, `hm-empty-sub` :5639, `hm-np-chip` :8636, `hm-np-chip-name` :8644, `hm-np-chip-meta` :8645, and `m-topbar` (`theme-glass.css:242`) |

**Risk of removing:** low for the old-layout groups (the markup they styled is gone), medium for the "other" group because a class could be set from data I cannot see (`classList.add(someVariable)`). **Guess:** each rule is a few lines, so the saving is a few KB; this is tidiness, not performance.

## 3. Duplicated logic, ranked by how likely the copies are to drift

| # | What | Where | Why it matters |
|---|---|---|---|
| 1 | **The phone breakpoint `(max-width: 700px)` is written out in at least 6 places in JS** (`js/mobile.js:7`, `js/timeline.js:52`, `js/ai-panel.js:14`, `js/collab-presence.js:175`, `js/home.js:489`, and `FM.mobile.isPhone`) plus **30 media queries in `styles.css`**. `isPhone` exists as 4 separate functions in 4 files. | listed | A breakpoint change must be made in about 36 places; miss one and the phone layout splits in two. The highest-value duplicate. Fix: one `FM.isPhone()`; CSS stays as is (it cannot share). |
| 2 | **`wnoise` is copied between `js/behaviors.js:21` and `js/compositor.js:2780`** (identical bodies) | listed | It is the random function behind Wiggle. If one copy changes, the preview and the export disagree on the shake. Related to the stateful-effect risk in `preview-export-parity.md`. |
| 3 | **`fx-browser.js` and `audio-fx-browser.js` are twins**: `startAuto` (`js/fx-browser.js:1829`, `js/audio-fx-browser.js:341`, 296 chars), `starFor` (`:193`, `:20`), `toggleFav` (`:189`, `:16`), `pushRecent` (`:187`, `:14`) are identical | listed | Any fix to favourites or recents has to be made twice. Candidate for one shared module. |
| 4 | **`dispScale` has 6 copies and 3 different bodies** (`js/canvas-edit.js:33`, `crop-tool.js:33`, `draw-tool.js:37`, `mask-tool.js:37`, `motion-path.js:33`, `point-edit.js:63`). Four ask `FM.previewDispScale`; `draw-tool.js:37` measures the canvas box itself; `canvas-edit.js:33` has its own logic | listed | The draw tool can disagree with the others on the screen-to-project scale (a **guess** about whether it ever does visibly; same-looking helpers with different answers are where handle-offset bugs come from). |
| 5 | **The `el(tag, class, text)` DOM helper is defined in 18 files, with 6 different bodies** (identical groups: `collab-comments.js:58`, `collab-presence.js:152`, `collab-ui.js:83`, `home.js:921`, `settings.js:159`; another 4 in `audio-fx-browser.js:9`, `elements-browser.js:20`, `fx-browser.js:8`, `template-fill.js:27`; 4 in `captions.js:325`, `inspector.js:11`, `notepad.js:35`, `sfx.js:791`; 3 in `ai-chat.js:35`, `ai-panel.js:13`, `voice-rec.js:88`) | listed | Mostly harmless, but 6 variants means the helper may treat its arguments differently by file (**guess**: for example a missing text). One shared helper would end that. |
| 6 | **`clamp` is defined in 6 files with 4 different shapes** (`ai-ops.js:20`, `audio-fx.js:51`, `captions.js:26`, `collab-presence.js:161`, `crop-tool.js:117`, `mask-tool.js:32`), and the argument order or NaN behaviour differs (`Math.max(a, Math.min(b, v))` vs a ternary) | listed | NaN passes through a ternary clamp but not always through the `Math` one; **guess** that it matters in a hostile import. |
| 7 | Smaller twins: `fmtDur` (`js/addmenu.js:707`, `js/home.js:1064`), `namesOf` (`js/collab-ui.js:4826`, `js/home.js:1326`), `nextTick` (`js/exporter.js:1003`, `js/tracker.js:156`), `openKeySettings` (`js/ai-chat.js:362`, `js/ai-panel.js:293`), `clapReduced` / `npFxReduced` (`js/app.js:835`, `js/home.js:3024`) | listed | Low. |

## 4. Files that nothing uses

- **140 of 283 probe pages in `tests/` (`_*.html`, 603 KB) are mentioned nowhere**: not in the suite, not in `tools/`, not in any `.md`. Another 79 are mentioned only in notes. 64 are used by tests or tools. (Examples: `tests/_482verify.html`, `tests/_626real.html`, `tests/_692matrix.html`, `tests/_art.html`.) They are the "measured here" evidence pages; the repo's own rule is to keep the evidence, so move rather than delete.
- Every file in `js/` and `vendor/` is loaded by `index.html` or `sw.js`. Nothing orphaned there.
- **`tools/design/` is 136 MB** (the rest of `tests/` is 14 MB). **Guess:** GitHub Pages serves the whole repo, so the live site carries these; they are not loaded by the app, so users do not download them, but a clone and a Pages build do.

## 5. What I would do, in order

1. Delete items 1 to 6 of §1 and the three dead ids in §2 (a 5-minute change with no behaviour risk; the suite is the proof). Then add a check to `tools/ship.sh` that fails when a new function has zero references anywhere (the structural fix, in the repo's own spirit: a gate, not a note).
2. Make `isPhone` one function (§3 item 1).
3. Deduplicate `wnoise` (§3 item 2) behind one shared function so preview and export cannot drift.
4. Decide the three untested seams.
5. Remove the 52 CSS classes in two groups: old layout (low risk) first, "other" after a browser check.
6. Move the 140 unreferenced probe pages into a `tests/probes/` folder in one commit.

## 6. Verified vs guess

Verified: every candidate by repo-wide search, every file:line, the counts (functions 3,060, CSS classes 1,535 and ids 170 scanned). Guess: that nothing builds a class name from data, that the old-layout CSS is safe to drop in a real browser, the cost of a 136 MB design folder, and whether `dispScale` differences ever show on screen.
