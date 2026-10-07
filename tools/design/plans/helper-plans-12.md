# Plans for the five after P11 (P12): #1025, #1026, #1027, #1028, #1029

Against `origin/main` 2e3fd7a9 (v17.25). Plans, five reproductions and patches; no app code changed on this branch. **Measured** = I ran it in my container (headless Chromium 1194, the suite's own runner, 1280 and 380). **Read** = I read the line on main. **Guess** = not verified. After #1024 the next workable audit-tier items by `tools/_classify.py` order are #1025 to #1029 (all `🟢 READY`); each carries `JUMPED: assigned to ChatGPT via the PM`, so every plan is a checklist for its commit and a full build plan if none arrives.

`helper-plans-12-scripts/`:
- `p12-repro-tests.js`: five tests, one per item, named `P12 #10xx …` (append before `async function run()` in tests/tests.js; `?only=P12` runs them). **Measured: 0 of 5 pass on main, at 1280 and at 380.**
- `p12-1025-1026-1028-1029-fixes.patch`: the small fixes for four of them (114 lines, applies clean on main). **Measured with it: those four tests pass, at 1280 and 380.**
- `p12-1027-reference-implementation.patch`: a scratch implementation of #1027's keys that turns its test green. Labelled reference: it is the shortest thing that proves the test, not the finished feature (see #1027).
- `p12_contrast.js`: the in-page contrast scanner I used (composites each text colour over its nearest opaque backgrounds).

The five stale line numbers in the entries are corrected below. Three of the five entries' `Where:` lines are off.

## #1025 Glass-theme `--text-faint` is under 4.5:1
**What is true now (Measured, computed with the WCAG formula by script):**
| token | on | ratio |
|---|---|---|
| dark glass `--text-faint #63808c` (theme-glass.css:37) | `--panel #0a141a` | 4.43 |
| | `--panel-2 #0f1e26` | 4.05 |
| | `--panel-3 #172c36` | **3.45** |
| light Home settings sheet `#7d8798` (theme-glass.css:1125, scoped to `html[data-home="light"] body.home-open .set-scrim, #shortcuts-overlay`) | `#f7f9fc` | **3.44** |
The entry's "about 4.0" is the middle surface only; the worst dark surface is 3.45. `styles.css:18` holds a third value (`#59647a`) that the glass theme overrides, so it is not what is on screen (settings.js:16 and :123, as the entry says).
**The entry's suggested colour is not enough on the darkest-text surface:** `#7593a0` gives 5.71 / 5.22 / **4.44**. The smallest lift of the same hue that clears 4.5 on all three is `#7496a4` (5.89 / 5.38 / 4.58); I used that. The light override `#66707f` gives 4.75 on `#f7f9fc` and 5.01 on white.
**Callers (Read):** `var(--text-faint)` is used 56 times in styles.css (e.g. :301 section headers, :1037 `.empty`, :1122 `.cat-num`, :482 a ring stop), 3 in theme-glass.css, 7 in js (audio-react.js 3, mask-tool.js 2, touchup-tool.js 1, home.js 1). A token change reaches all of them, which is the point, and also why it needs the look-before-and-after he asked for (the CLAUDE.md design rule): draw it at 24 px and at the size it ships.
**Plan:** the two token values in the patch; show him a before/after of one editor card and the Home settings sheet; no JS.
**Test (`P12 #1025`):** reads `--text-faint` and the three panel tokens from the body, and the light pair from a real `.set-scrim` with `data-home="light"` and `body.home-open` put on for the test; fails below 4.5. **Red on main** (the four numbers above), **green with the patch**. It judges the tokens against the three named panel surfaces, not every element: a text drawn over a glass tint that is lighter than `--panel-3` is not covered (**Guess**: none, I did not scan; my element scanner found only 3 elements using the token on screen in a fresh project, so a real sweep needs a populated editor).

## #1026 Home tabs do not say which one is on
**Where (Read, corrected):** the four buttons are index.html:703, 704, 705 and 709 (`data-tab` projects, templates, elements, tutorials); the state is a CSS class set in `render()` at **home.js:2549**, `root.querySelectorAll('.hm-tab').forEach(b => b.classList.toggle('active', …))`. The entry's `home.js:2540` and `:3061` are about 9 and 10 lines off.
**Every way the tab changes (traced):** the click handler (home.js:3213, sets `tab` then `render()`), and three programmatic sets that each call `render()` too: `tab = 'projects'` (:3365), `'elements'` (:3380), `'templates'` (:3388); shortcuts.js:120 clicks the real button. **All of them go through `render()`, so one line there covers every route.**
**Pattern:** `aria-pressed` on the existing buttons, as the aspect buttons beside it already do (home.js:2993, 2994). `role="tab"` + `aria-selected` would need a `tablist` and a `tabpanel` the grid does not have; the entry offers either, pressed is the honest one.
**Plan:** in `render()` set `aria-pressed` with the class, and put the right initial value in the HTML (the first paint happens before the first `render()`): four attributes in index.html. Both are in the patch.
**Test (`P12 #1026`):** opens Home, clicks each tab in turn and asserts that exactly that tab reads `true` and the others `false`. **Red on main (16 wrong states; the attribute is `null` everywhere), green with the patch.** Neighbouring tests that touch `.hm-tab` (tests.js:6954, 13943, 13979, 23609, 43035, 43082) read the class or `dataset`, not the attribute.

## #1027 Keyframe diamonds cannot be read or moved by keyboard
**Where (Read):** the diamond (`.kf-dot`) is built at timeline.js:2663-2671 with `pointerdown`, `dblclick` and `contextmenu` listeners only; no `tabindex`, no role, no key handler. Retiming happens in the drag: `kfDrag.kfs.forEach(kf => { kf.t = nt; })` (timeline.js:5423) and, on release, `FM.dedupDraggedKfs(layer, kfDrag.kfs)` (timeline.js:5582, defined scene.js:644: it removes a keyframe the dragged one landed on). The inspector's own ◆ (inspector.js:1137-1139) is a real button, so a keyboard user can add and delete at the playhead; they cannot jump to one or move one.
**Keys that are free (Read, app.js keydown 8791-9000):** `Comma` and `Period` step a frame (app.js:8938-8939, shortcuts.js line `, / .`); Shift+Comma/Period is unbound; so is Alt+Comma/Period. Ctrl/Cmd + anything unhandled is returned at **app.js:8889** (`if (mod) return;`), so the entry's "modifier nudge" cannot be Ctrl/Cmd without a branch above that line; Alt+Shift is the keyboard-layout switch on Windows. The arrow keys nudge the selected LAYER (app.js:8908-8935), so they are taken.
**Proposal (my choice, he should confirm):** **Shift + , / .** = previous / next keyframe of the selected layer's animated properties; **Alt + , / .** = move the keyframe(s) under the playhead one frame earlier / later, through `FM.dedupDraggedKfs`, one history step. Both listed in `SHORTCUTS` (shortcuts.js:29) or the `?` sheet lies.
**Reference implementation (scratch, `…reference-implementation.patch`, 30 lines, Measured green):** it uses ALL animated properties of the selected layer. The finished feature should use only the properties whose editor is open, as the drag does with `liveStackAt` (an inline helper in the diamond's builder, timeline.js ~2680), so the keys and the mouse agree on which keyframes are "live"; I did not build that part, and the reference does not skip a locked/viewer-only layer beyond `L.locked` (the drag also checks `roNow()`, timeline.js:2692: a collab Viewer's keyframes are read-only).
**Also needed:** a focusable, named diamond for a screen reader (`tabindex="0"`, `role="button"`, `aria-label` with property and time: the same words the title already has) is the other half of "read a keyframe's time"; not in the reference.
**Test (`P12 #1027`):** a shape with x keyframes at 0 and 1 s, selected, Home shut (a full-screen overlay swallows keys, app.js's overlay gate): Shift+. must put the playhead at 1 s; Alt+. must move that keyframe to 1 + 1/fps with its value still 400. **Red on main ("left the playhead at 0 s"), green with the reference.** It pins the keys I proposed; if he picks others, change the two `key(…)` lines.

## #1028 The preview canvas has no accessible name
**Where (Read):** index.html:414 `<canvas id="preview"></canvas>`. The entry's fix (`role="img" aria-label="Video preview"`) is right for what it is. **Callers traced:** `getElementById('preview')` is read in 14 places (app.js:6722, canvas-edit.js:992, crop-tool.js:17, draw-tool.js:18, eyedropper.js:12, fill-drag.js:28, fx-browser.js:81 and :96, mask-tool.js:28, motion-path.js:28, point-edit.js:20, text-edit.js:329, touchup-tool.js:22, tracker.js:15); none reads `role` or `aria-*`, so adding them is inert for the code. **One honest limit:** the canvas is also the editing surface (drag, pinch, tap to select, draw), and `role="img"` tells a screen reader it is a picture; the real keyboard route to its layers is Tab (app.js:8956) and the inspector, which the label does not mention. A longer label ("Video preview. Tab selects layers.") is a wording decision for him.
**Plan:** the attribute pair in the patch.
**Test (`P12 #1028`):** non-empty `aria-label` and `role="img"`. **Red on main, green with the patch.**

## #1029 Long project names are cut off with no tooltip
**Where (Read, corrected):** the name is a `div.hm-name` built at **four** places, not the ones the entry lists: home.js:1371 (project card), **:1995** (template card), **:2095** (element card), **:2204** (draft card); the CSS is styles.css:**5503** (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`), with a desktop size rule at :7013 and a pinned colour at :5374. The entry's home.js:1989, 2088, 2196 are not name sites. The card's `aria-label` already carries the full name (home.js:1360).
**Measured (380 px):** the name box is 180 px wide; a 28-character name is already cut (193 px of text in 180), 42 characters needs 300 px, a 64-character one 450 px. That is about 26 characters per line at 14.5 px bold (6.9 px each, computed). At 1280 the box is 532 px and nothing up to 64 characters is cut.
**A `title` alone does not help the phone** (no hover on touch), and the entry says "draw options first" (CLAUDE.md: never ship a visual change he has not seen). Options to draw: **A** two-line clamp (the patch: 52 characters on a phone, ellipsis after the second line), **B** title only (desktop only), **C** middle-ellipsis ("Summer holiday in … final cut", keeps the ending, which is where versions differ: JS, not CSS). A + title is the patch.
**Measured with A:** the 68-character name wraps to two lines and ends in an ellipsis; **the card height does not change (108 px before and after, and the meta row stays inside the card)**; a short name is unchanged. Screenshot at 380 px: `helper-plans-12-scripts/p12-1029-two-line-name-380px.jpg`.
**Test (`P12 #1029`):** at 380 px (via `atPhoneWidth`), a 68-character project name: pass if the element has a title equal to the name, or wraps with a line clamp of 2 or more; **CONTROL** (only reached when it does not): the name really is cut on main. **Red on main ("475 px of text in 180 px on one line, no title"), green with the patch.**
**Callers:** tests that read `.hm-name` (tests.js:79328 a legibility check on "a project title", 85485 and 90985-90993 read `.textContent`) are not affected by the clamp or the title.

## Order I would build them in
1. **#1028** (one attribute pair, no look) and **#1026** (two lines of JS and four attributes): both are invisible and certain.
2. **#1025** after he has seen the two colours (it moves 66 uses).
3. **#1029** after he has picked A, B or C from drawings.
4. **#1027** last: it needs his key choice and the live-property rule, and it adds a shortcut that has to be on the `?` sheet.
Ship notes (all apply): the patch touches `index.html`, `js/home.js`, `styles.css`, `theme-glass.css`, so `?v=` on `js/home.js` and `styles.css` and `theme-glass.css` must be bumped and a POLISH-LOG line added (ship.sh refuses a changed file whose buster did not move).

## What I ran, and what I did not
- **Measured:** the five reproductions red on main and the four patched ones green, at 1280 and 380; the 1027 reference green; the contrast table and the card heights above.
- **Neighbour slice:** see the last line of this file.
- **Not done:** a populated-editor contrast sweep for #1025; the live-property rule for #1027; a screen-reader run on any of it (no screen reader here; every "exposes X" above is the attribute, not what VoiceOver says).

## Neighbour slice (Measured, 380 px)
All five fixes applied (the four patches plus the #1027 reference) on one tree, against main, the same name filter on both: `home`, `card`, `legib`, `contrast`, `name`, `tab`, `keyframe`, `shortcut`, `preview`, `timeline` (the two `690` export tests and one effects-browser test are removed from both runs, they hang this container; see H37 and H41). **474/511 on main, 478/515 with the fixes; 37 red or NOT RUN on each, and the red lists are identical** (no test is red on one tree and not the other). The four extra tests are the P12 ones that the filter matched. Most of those reds are this container's missing H.264 and timing tests.
