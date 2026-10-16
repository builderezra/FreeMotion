# #1083 port: the PC corner back pill (his pick B) on hunt/948-review

Branch `hunt/1083-port`, based on `ssh/hunt/948-review` (d61c591e, v17.54 label). It ports `hunt/1083-back` (037927ff, written
on v17.37, never merged) and adds the gates an audit found missing.

**Nothing was run.** A release ship was running on the laptop, so this is code only: `node --check js/app.js` and
`node --check tests/tests.js` passed, and nothing else ran (no browser, no server, no suite, no prove, no mutate).

## Conflicts and how they were resolved

- `js/app.js`, `styles.css`: `git diff d55cabc8..ssh/hunt/1083-back -- js styles.css | git apply -3` applied cleanly. There were
  no conflicts, only offsets (app.js: the block now sits after `#btn-back`'s handler at ~:7007 instead of ~:6936).
- `index.html`: the base's file, plus the branch's one markup hunk (`#btn-back-corner` as the first child of `#stage`, before
  `#canvas-wrap`) put in by hand. Busters bumped by one for each file changed: `styles.css?v=772 → 773`,
  `js/app.js?v=480 → 481`. The branch had bumped neither. The version label is untouched (the release does that).
- `tests/tests.js`: not merged. The branch's block (the `cornerMove` helper and three tests) was appended at the end of the
  base's file, after the 948 review tests, and the new gate test follows it. Two small edits to the branch's tests: test 2
  checks the pill exists before pressing it, and test 3 has its own "no pill" sentence, so on the base each one fails at a
  sentence of its own instead of a `TypeError`. Top-level name added to the suite's IIFE: `cornerMove` (no clash). App
  names added inside `init()`: `cornerBtn`, `stageEl` (no clash; everything else is block-local).

## The gates

The branch had only text editing and drawing. Now the pill does not light, and a click on it presses nothing, while any of the
following is true. Every check reads state the app already keeps; nothing new was invented.

| State | How it is read | CSS (hides a pill that was already lit) | JS `cornerOff()` (stops lighting and clicks) |
|---|---|---|---|
| Home | `body.home-open` (home.js) | yes | yes, plus `FM.overlayOwnsScreen()` |
| Settings | `body.set-open` (settings.js) | yes | yes |
| Add sheet (phone only today, kept for safety) | `body.add-open` (mobile.js) | yes | yes |
| Comments card | `body.cc-open` (collab-comments.js) | yes | yes |
| Share / collab card | `body.collab-card-open` (collab-ui.js) | yes | yes |
| Export dialog, export progress | `#export-dialog` / `#export-overlay` without `.hidden` | `body:has(…:not(.hidden))` | yes |
| Canvas settings card (the cog) | `#canvas-dialog` without `.hidden` | `:has()` | yes |
| Effects, audio effects, elements browsers | `#fx-browser` / `#afx-browser` / `#el-browser` without `.hidden`, plus `FM.fxSheetOpen()` | `:has()` (the same three as the `#view-bar` rule, queue 805) | yes |
| Simple on a PC (#980: its own top bar and its own way out) | `body.ed-simple`, inside the PC media query | yes | yes |
| Text editing, drawing (the branch's) | `body.text-editing`, `body.drawing` | yes | yes |
| A canvas tool (crop, touch-up, mask, points, eyedropper, fill drag, motion path, tracker pick) | `FM.toolOwnsCanvas()` | no | yes |
| Any full-screen surface (confirm cards, the shortcuts sheet, paste style, the recorder, and any added later) | `FM.overlayOwnsScreen()`: geometric, any fixed box over 90% of the screen | no (it sits on top of the pill anyway) | yes |
| Fullscreen | `document.fullscreenElement` | no | yes |

- **Fullscreen / preview: the app has neither.** There is no `requestFullscreen`, no `:fullscreen` rule and no preview-mode
  class anywhere in js/ or styles.css. `document.fullscreenElement` is the browser's own state and is inert today; it is not
  tested. If "preview" meant playback (`body.fm-playing`), it is deliberately NOT a gate: leaving mid-playback is a fair use
  of the door. That is a call for him or the PM.
- **Not gated, on purpose:** the AI panel and chat (`ai-open`, `aic-open`) are right-edge side panels, and the canvas stays
  live under them by design (app.js deselectOnEmptyTap note, queue 856). `#ctx-menu` is a popup that sits above the pill.
- **`:has()` is in its own rule.** It makes a selector list unforgiving, so a browser without it would otherwise drop the class
  half as well. Where `:has()` is missing, the JS gate still keeps the pill dark.
- **Cost:** `cornerOff()` runs only when the mouse is inside the 180×120 corner, because `overlayOwnsScreen()` hit-tests.
- **The click guard** (`if (!cornerOff()) backBtn.click()`) makes "takes no clicks" true even for a programmatic click on a
  `display:none` pill, and it is what the gate test can measure.

## Tests (all `{ item: '1083' }`, appended to tests/tests.js)

1. `1083 on PC the corner pill is hidden and takes no clicks, lights when the mouse is in the top-left, and covers no control` (branch)
2. `1083 the corner pill presses the real back button: out of a group first, then Home` (branch, plus a pill check)
3. `1083 phones and touch screens never get the corner pill` (branch)
4. `1083 the corner pill stays dark and takes no clicks while a dialog or sheet is open, in Simple on a PC, or while a tool or a full-screen surface has the screen - and lights on the plain editor` (new)
   - **CONTROL first:** on the plain editor the pill lights, and a click on it reaches the real `#btn-back`. The press is counted
     and stopped at the document, so nothing opens Home.
   - **Then, for each of 13 gates**, a control that the pill lights on the plain editor just before (this also proves the
     previous gate lifted), then the gate raised, then three checks:
     - (a) a pill that was already lit is `display:none` at once (CSS gates only);
     - (b) the mouse in the corner does not light it;
     - (c) a click presses nothing.
   - **How each gate is raised:**
     - Settings, Home and Simple are real (`FM.settings.open`, `FM.home.open`, `FM.editor.set('simple')` inside the suite's
       own `smView` harness, which puts the scene, the card and `fm.editor.*` back).
     - The dialogs and browsers flip their own `hidden`, and the sheets get their body class.
     - The full-screen surface is a fixed `inset:0` div, which is exactly what `overlayOwnsScreen` defines.
     - The tool is a stub of `FM.toolOwnsCanvas`.
   - Everything is put back in a `finally`.

**On the base (d61c591e)** there is no `#btn-back-corner`, so each test throws its own "there is no #btn-back-corner …"
sentence. **Against the branch's ungated code (037927ff's app.js and styles.css)**, test 4 should fail at
`with the export dialog up, the pill that was already lit stayed on screen …`.

Mutations for the loop to run once a ship is not in progress (each with `--only` and the gate test's title):

- `js/app.js` `light(inCorner && !cornerOff());` → `light(inCorner);`, expected: `with the export dialog up, the mouse in the top-left corner lit the pill`.
- `js/app.js` `{ if (!cornerOff()) backBtn.click(); }` → `{ backBtn.click(); }`, expected: `with the export dialog up, a click on the corner pill pressed the real back button`.
- `styles.css` `body.collab-card-open .corner-back, body.ed-simple .corner-back { display: none; }` → `body.collab-card-open .corner-back { display: none; }`, expected: `with Simple on a PC up, the pill that was already lit stayed on screen`.
- `styles.css` `body:has(#export-dialog:not(.hidden)) .corner-back, ` → `` (drop the export selector), expected: `with the export dialog up, the pill that was already lit stayed on screen`.

Run at both widths. Test 3 narrows to 380 itself, and tests 1, 2 and 4 widen to 1280 themselves. The driver guarantees a mouse
for the whole run (`tests/_cdp.py` `_mouse_state`).

## #545: the picture to compare against `tools/design/pc-back-hover/b-corner.png`

`b-corner.png` is 640×220: the top-left 320×110 CSS px of the editor at 2×, with the pill lit. To compare, render this branch
the same way:

- **1280×800, deviceScaleFactor 2:** open a project in the Full editor with nothing selected and no dialog. Dispatch a
  `mousemove` on `#stage` at (40, 30) from its top-left (or move a real mouse there), wait 200 ms, and screenshot the clip
  `{x: 0, y: 0, width: 320, height: 110}`. Put it side by side with `b-corner.png`. Also take the same clip at rest (mouse at
  600, 400) against `idle-corner.png`: the corner must be empty.
- **1024×700, deviceScaleFactor 2:** the same two clips. There is no reference drawn at this size. Check that the pill still
  sits at 14,14 and that nothing at 1024 wide (the narrower PC layout) sits under its 180×120 hot zone.
- **Also worth one look, never drawn for him:**
  - inside a group, the pill reads "‹ Back" (`body.group-editing`; the branch's choice, because there it leaves the group
    first). He has not seen this variant.
  - the light Home theme (`html[data-home="light"]`) and the glass theme (`html[data-theme="glass"]`): the editor behind the
    pill should still be dark. Not verified.
