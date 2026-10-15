# sm3 review — Simple Phase 3 read through seven lenses (queue 980, refers to #545)

Branch `hunt/sm3-review`, built on `ssh/hunt/sm3-extras` (374faa15). Reviewed: `ssh/hunt/v50-tree..ssh/hunt/sm3-extras`
without `tools/design` (Look 7da21cf2 · Captions 5620caf1 + 2d3d4599 · Effect segments 13d37382 · the morph b0ff43c9 · the #1171
guard bc8b4f63 · busters 3026a7e6 · tray effects 566bc3db · Clips › Extras 374faa15; fc301cb1 skipped as asked).

**NOTHING WAS RUN.** A release ship was running on this machine: no browser, no server, no python, no suite. Everything below
was found by reading. The only program run besides git / grep / sed / awk was `node --check` (OK on js/simple-tools.js,
js/spine-edit.js, js/spine.js, js/spine-words.js, js/editor-mode.js, js/editor-morph.js, js/simple-timeline.js, js/addmenu.js,
js/inspector.js and tests/tests.js). No CR bytes in any changed file.

## Findings

Each one was tried against the code (callers, guards, the sanitiser) before it was written down. CONFIRMED = the path was
traced in the code; PLAUSIBLE = the mechanism is real but no concrete trigger was found, or the cost is unmeasured.

| # | Lens | File:line | What goes wrong, in one scenario | | Status |
|---|---|---|---|---|---|
| 1 | 6 state reset | js/simple-tools.js:1217 `_reset` | The suite seam left `lookFocus`, `lookLeft`, `lookTop` and `sheetArmAt` as the last test set them. `drawPanel` (:1138) moves focus to the `[data-look]` control `lookFocus` names whenever focus is on `<body>`, so a Look test that left focus noted on the Adjust tab pulls focus into the next test's Look panel; `sheetArmAt` is the #1171 guard's arm time. | CONFIRMED | **fixed 062200ee** (buster `simple-tools.js?v=16`) |
| 2 | 1 Full unchanged | js/simple-tools.js:499 | The #1171 guard adds seven `window` capture listeners **at script load**, `passive: false`, so they are on every device in Full even if Simple is never opened. A non-passive `touchstart` on `window` is what Chrome treats as scroll-blocking: in Full on a phone every touch that starts a scroll (timeline, layer list, an effects strip) waits for the main thread to run the (instant) handler — during playback or a heavy render that is a scroll-start delay today's Full does not have. Second, inside its 450 ms window it stops `pointerup` / `mouseup` / `touchend` in capture before any window capture listener registered later (timeline.js drag `release`, inspector.js:2593 `off`, simple-timeline.js drag `onUp`): a gesture begun before the arm that ends on the sheet is never released. | CONFIRMED (registration); scroll cost PLAUSIBLE (unmeasured) | open — his / the PM's call, after a phone measurement. Options: `passive: true` on `touchstart` / `touchend` (stopImmediatePropagation still works; loses the click-suppression edge for a tap that starts at ~440 ms), or add the listeners in `armSheet` and drop them 450 ms later (moves them behind other window capture listeners). The stack NOTES flagged the first half and kept it as written. |
| 3 | 5 insert / §12.2 bands | js/spine-edit.js:3448 (`planAddTemplate` pre) | A template's non-clip layers — its titles, overlays, sm.unit groups and its caption track — are spliced as ONE block with its clips, just above the clip before the cut. DESIGN §12.2 (DESIGN.md:3729): "Every other unit is placed by the side-aware bands (§3.6.1)". Scenario: a title "Hello" on top of the stack over 2–6 s; Clips › Extras › a template at 2.4 s whose title runs 3.2–4.7 s: the template's title lands under "Hello" and under any overlay above Clip 1, so "Hello" covers it where they overlap, and its caption track (top of the stack by §3.6.1, `xSlot('captions')` = 0) lands under every overlay. | CONFIRMED | open — needs per-unit band placement after the splice (not a small local change) |
| 4 | 3 / 6 | js/simple-tools.js:305 (tray 🗑) + js/spine-edit.js:250, :1379 | An sm.unit wrapper whose last member is deleted from the tray is never removed. The tray's 🗑 on a non-main item calls Full's `FM.deleteLayer` (ungated, no refit; app.js:3775 removes children of a deleted group, never an emptied parent), and refitTransparentGroups' new "an emptied sm.unit wrapper goes with it" runs only in gated (arranging) steps. Scenario: add the "Lower third" element, 🗑 the bar, 🗑 the words: an empty group "Lower third" stays in the document — nothing in Simple, an empty group row in Full. | CONFIRMED | open — one undo step needs the delete to go through a Simple command (or the group to go in Full's delete), not a second FM.deleteLayer |
| 5 | 5 / §12.2 | js/spine-edit.js:3391 (`xLoose`) | DESIGN §12.2 (DESIGN.md:3739): "an element with one visual layer plus sounds makes no group, and its sounds link to that layer as the anchor through the same rule". No group is made (right), but nothing links the sounds either — js/spine.js 6c reads only sm.unit groups. Scenario: an element = a picture 0–2 s + a whoosh at 1.2 s, added at 2.5 s with a cut at 3.5 s: the picture rides the clip at 2.5, the whoosh (3.7 s) rides the next clip, and a Move later of either clip pulls them apart. | CONFIRMED | open — design call: wrap one visual + sounds too, or give 6c a sound-to-anchor rule |
| 6 | 3 half-applied | js/spine-edit.js:3273 `xMount`, :1386 | xMount's side effects outside the document — `FM.media.set` for the new ids, `pk.used = true`, `FM.storage.writeMedia` for files this device cannot decode — are not undone when the step fails after its `pre` (`restorePreEdit` puts back the document only). Scenario: an Add template that throws in fitTails / markCuts: the document is back, but FM.media holds records for ids that are not in it and IDB holds their blobs until the boot-time pruneOrphans sweep. Nothing user-visible. | PLAUSIBLE (no concrete throw found) | open, low |
| 7 | 2 strings into selectors | js/simple-tools.js:1078, :1138 (and :939–941) | Attribute selectors are built by string from ids that can now carry a saved preset's id: an item-effect tile is `data-tool="fx:p:<preset id>"`, and fx-presets.js:160 keeps an imported preset's id as given (40 chars). A `"` or `]` in it makes `querySelector` throw — not an injection (a selector cannot run code), a throw: a keyboard pick of that tile runs `closeEffects()` → `sync()` → the focus-restore selector at :1078 throws, so `S.cmd.itemEffect` on :941 never runs and the effect is not added. Same for Look's `lookFocus` (`f-<fid>`) at :1138. | PLAUSIBLE (needs an imported preset id with a quote) | open, low — `CSS.escape` at both selectors |

Considered and dropped after checking: a template's `trIn` being stripped (DESIGN §12.2's table strips it, and nothing reads it
before Phase 6); a long anchor not holding its members (DESIGN §4.1's own `hostOf` falls through to the start rule the same way);
Look / Strength previews writing the live layer (Full's sliders do the same, and collab-session.js `record()` merges a drag's
ticks into the one open step, keeping the earliest before-value); the Remove caption flush dropping the line first
(history.js skips an identical snapshot, so no empty step); `trayFor`'s "Moves with" tag on a two-row PC tray (fillTray returns
before it is added; the band words carry it).

## What was checked and found clean

- **Lens 1, Full is unchanged (apart from #2).** js/addmenu.js: every new line is behind `opts.tabs` / `opts.host`, which
  neither of Full's two callers passes (js/inspector.js, js/mobile.js `redrawAdd`); without them `tabs` IS `TABS`, `remTab` /
  `remPage` / `remdPage` ARE `rememberTab` / `rememberPage` / `rememberedPage`, `_startTab` is consumed exactly as before and
  the `host` ternary resolves to the old `closest('.panel')`; `shp()`'s `f.shape` / `f.shapeOpts` and the template tile's
  `templateId` are read-only facts (a Full tap runs what it ran). js/inspector.js: one line, and `drawPanel` returns false on
  every branch while Simple is not on screen. styles.css: every new rule hangs on `.sm-…`, `#ed-morph`, `#sm-timeline.edm-out`
  or `#sm-tray[data-row]`. index.html: busters and one script tag. The morph's listeners are added on its first played morph
  only and are no-ops with none on screen; it touches Full only through cancelled Web Animations. simple-tools' new
  `#inspector` / document listeners are added in `mount()` (Simple only) and return at once outside Simple. Full's Add sheet
  is redrawn by `openAdd` on every opening, so Simple's Extras left in `#add-grid` never shows in Full.
- **Lens 2, escaping.** Element and template names reach the Add menu cards as `textContent` (addmenu.js:958) and lines
  through `S.say` → simple-timeline `sayLine` (`textContent`); typed caption words, filter / effect / preset names, the
  "Moves with" tag and the Q5 hint are `textContent` or `setAttribute`; the only `innerHTML` writes are fixed ICON strings
  (`svg()`, `none`, `close`); the morph clones by `cloneNode` (nothing re-parsed); every CSS value written is a number.
- **Lens 3, undo.** Each new command is one `S.edit` (one undo step, one collab transaction) whose label matches its plan:
  Change look, Look strength, Reset adjust, Adjust, Add caption, Remove caption, Captions stay with the sound / follow the
  clips, Find speech, Add effect (segment and item), Change effect, Effect strength, Delete effect, Add shape, Add element,
  Add template. A throw inside a step puts the document back (`restorePreEdit`); the long reads (Find speech's listen,
  `readPack`) run before the runner under `S.reading` with a `finally`; slider previews are taken back to the byte before the
  step, and only while the layer is still exactly what the preview made it. Undo / redo are document snapshots, and the
  mounted media survive both. Nothing here can undo a friend's step (no new undo path).
- **Lens 4, live session.** The one arranging new command is Add template with clips: `newPlan`'s default `arranges` /
  `adopts` true, exactly as `planInsert`, so `S.arrangeGate` refuses it while someone else can edit. Every other new command
  sets `arranges = false, adopts = false` and moves nothing that exists (looks, words, effects, inserts at a band), like
  Phase 2's addText / addOverlay. `touched` carries the target for the lock and lease rules wherever an existing layer is
  written (Look, Change / Strength / Delete effect, item effect, Remove caption, Find speech on a track); Captions stay /
  follow has none, as Phase 2's Stay put. Fields: `sm.unit` is in storage.js `SM_FLAGS` (kept only as `true`), `inst.sm` is
  kept only as exactly 1, top level and inside containers, the Adjust box's `name` (≤ 64) and a filter's `fid` (the id regex)
  are kept, `sm.snd` / `sm.rideVol` are plain sub-keys — the sanitiser did not change, so no SCHEMA_REV bump is owed. Full's
  own `onCopy` routes (duplicate, paste, aiClone) are untouched (the pack route is a new branch only Simple calls).
- **Lens 5, the pack route.** ids re-minted by storage's `reIdLayers` (with `sanitizeImportedLayers`, parents, split
  lineage, behaviour and effect refs remapped); every run of the step builds from `pk.json`, so no object is shared between
  the pack and the project (a re-run after Do it anyway / Keep on the music reuses the same new ids into a restored
  document); the camera and links to it are dropped; files are pinned by `fileKey` (as `hydratePack`), written by the
  runner's `save` (`planBlobWrites`, `rec.file` is set by loadImage/VideoFile) or by `writeMedia` when undecodable; an unused
  pack lets its files go after 30 s and a late retry refuses with a line. Extras' open tab and pages live in addmenu's
  `_ownTab` / `_ownPage`; `fm.addmenu` is never written by it (`rememberTab` writes only on a change, and Full's own redraw
  in `openAdd` rewrites the same tab). Only `getPack` / `list` are called on the libraries.
- **Lens 6, merge damage.** No repeated top-level `function` / `const` / `let` in any changed file; no duplicate keys in
  ICON, `FM.simpleTools`, the `S.cmd` blocks or spine-words' `lines` / `tools` (the five repeats are nested objects, the same
  as v50-tree); every ICON name used exists; every `w.X`, `line('X')` and refusal kind used has its words; `ROWS` is defined
  before `ROWS.strength`; `extrasOpen` is declared before any run-time use; `_reset` covered every other new variable;
  `hasSound` / `speechHas` and xSlot's local `words` do not collide.
- **Lens 7, tests (44 added or changed).** Each main assertion can fail; each CONTROL checks the thing it guards (the
  sm.unit test's plain-group control, the ✦ control on an unmarked preset, the morph's 0.1 s record control, Extras' three
  tabs before the Full-memory check); no `//` comment is appended to a continued statement; no double quote in any title;
  every synthetic event targets an element queried after the last refill; stubs are put back (plain properties by
  assignment in a `finally`; `document.hidden` by deleting the own property, which restores the prototype getter; the
  frame's `top` by `onScreen924`'s `finally`).

## Owed

Everything in the stack NOTES' FIRST-RUN CHECKLIST, plus a run of `simple P3` and `simple P2.2` after 062200ee (the `_reset`
change touches every test that calls it). Finding 2 needs a phone measurement of scroll start in Full with and without the
guard before anyone changes it.
