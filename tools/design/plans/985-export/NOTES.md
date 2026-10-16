# #985 — the Export card, option A ("What you'll get") — builder's notes

Branch `hunt/985-export`, built on ssh/main v17.56 (456a6fa5). **Code only: nothing was run** — no browser, no server, no
suite, no prove.sh, no mutate.sh (a v17.57 ship held the laptop). The only program run was `node --check` on
`js/export-card.js`, `js/app.js` and `tests/tests.js` (all three print nothing).

## His words and the decision

> "the export menus settings are honestly a bit daunting for someone who doesnt know how it works. I dont want to lose any
> function but i want it to actually make sense at first glance. Capcut does a really good job of this but dont fully copy"
> (29 Sep, builder chat)

Clauses: (1) make sense at first glance, (2) lose NO function, (3) learn from CapCut, (4) don't copy it, (5) #545 pictures
before it ships. Decision line: ✅ UNBLOCKED 11 Oct (#1130, the PM under his standing rule) — **A**. #917 finding 7 is
folded in: on a phone the Resolution and Frame rate selects cut off their own values at 380 and 320.

## The one design decision that makes clause 2 checkable

**The card is a VIEW over the controls the export already reads.** `runExport`, `runAudioOnlyExport`, `expPrefsSave/Apply`,
`syncExportFormat`, `FM._exportFps` and the whole encoder side are untouched. The old selects (`#exp-format`, `#exp-res`,
`#exp-fps`, `#exp-quality`, `#exp-range`) and the transparent checkbox stay in the page, same ids, same option values, same
listeners, hidden inside `.xa-model`. `js/export-card.js` writes them (value + the `change` event their own listeners wait
for) and reads them back to draw itself; it holds no setting of its own. The custom boxes (`#exp-cw`, `#exp-ch`,
`#exp-fps-num` inside `#exp-custom-field` / `#exp-custom-fps`), the layer picker `#exp-solo-btn`, the warning
`#exp-noaudio-warn`, `#exp-cancel` (now the ✕) and `#exp-go` (now the big Export) are the REAL elements, moved to where A
draws them. So for the same values the export is today's, by construction — and test (b) checks it end to end.

## What changed, file by file

- **index.html** — `#export-dialog` rebuilt as A: ✕ (`#exp-cancel`), a left column (`.xa-left`: the picture `#xa-pic`, the
  "You'll get" summary `#xa-big` / `#xa-small`, the amber `#xa-only`), a right column (five `.xa-kind` buttons; `#xa-note`;
  the rows `#xa-g-size|fps|quality|alpha|sound|part`, each a `.xa-row` button + an in-place `.xa-list`; the exact boxes
  under Size and Smoothness; `#xa-more` + `#xa-morebody` with Only one layer, See-through, Exact size, Exact fps,
  Technical details), the hidden `.xa-model`, and a pinned `.dialog-actions.xa-foot` holding the warning and `#exp-go`.
  The model's `loop` option now reads "Between your marks" (mapping small fix 1). New `<script src="js/export-card.js?v=1">`
  after popfrom.js. Busters below.
- **js/export-card.js** (new) — the card: reads the facts (format, size, typed size with runExport's own clamp, fps via
  `FM._exportFps`, quality, Part length via `FM.exportSpan`), works out the output size the way each encoder does
  (exporter run/runGif/runFrames, app snapshotPNG) and "about N MB" with runExport's own bitrate sum, draws the rows /
  lists / More options / button, writes the model on a tap. Exposes `FM.exportCard = { sync, opened, closed }`. A tap that
  starts AND ends on the dim around the card closes it (new; mapping row 22). User strings (project name, layer name) only
  ever go in as textContent — no innerHTML anywhere in the file.
- **js/app.js** — four one-line hooks: `FM.exportCard.opened()` at the end of `showExportDialogNow`, `.sync()` at the end
  of `syncSoloBtn` and after the label line in `syncExportFormat`, `.closed()` in `hideExportDialog`. And one
  behaviour-preserving refactor: `exportRange()` is now `exportSpan(value, speak=true)`, so the card can ask a Part's
  length without the toasts (`FM.exportSpan`). Same returns, same toasts, same order — `9901`'s loop-clamp test still
  drives `FM.exportRange`. The old plain label line in `syncExportFormat` is kept as a fallback.
- **styles.css** — one block after the old export-dialog rules (`.xa-*`), phone first, PC from 701px (two columns, 580px
  card), a 340px tightening for 320. The pinned row's `bottom` matches each padding (queue 498). Nothing in it ellipsizes:
  rows wrap between runs and each run that must stay whole is `.xa-nw` (#917 f7).
- **tests/tests.js** — five new `985 …` tests (below) and four legacy tests adapted (below).
- **tutorials/09-export-options.md** rewritten for the new card, and **tutorials/01-first-video.md** step 11 "Export MP4" →
  "Export video". Both marked not walked. Without this, lesson 09 would walk him through dropdowns he can no longer see
  (test 1082 would not have caught it: the old words are still in the hidden model).

## Fields read and written (the whitelist check)

The card READS: `#exp-format`, `#exp-res` (+ its option list), `#exp-cw`, `#exp-ch`, `#exp-fps` (+ options), `#exp-fps-num`
(through `FM._exportFps`), `#exp-quality` (+ options), `#exp-range` (+ options and `disabled`), `#exp-transparent`
(`checked`/`disabled`), `FM._exportSoloId()`, `FM.scene.project` (`width`, `height`, `fps`, `duration`, `name`, marks via
`FM.hasLoopRegion`/`FM.exportSpan`), `FM.time`, `FM.projectHasAudio()`, `#preview` (pixels, for the picture).
The card WRITES: `#exp-format`, `#exp-res`, `#exp-fps`, `#exp-quality`, `#exp-range` (value + `change`), `#exp-transparent`
(`checked` + `change`), the `hidden` class of `#exp-custom-field` / `#exp-custom-fps` (same rule as syncCustom: shown iff
Exact is picked — plus hidden when the kind has no such row). Nothing else.
**Source of truth — what runExport reads** (js/app.js): `exp-format`, `exp-res`, `exp-cw`, `exp-ch`, `exp-fps` /
`exp-fps-num` (FM._exportFps), `exp-quality`, `exp-range` (exportRange), `exp-transparent`, `expSoloId`. Diff: identical
set; the card writes no field runExport does not read and leaves none of them unreachable.
**Stored settings:** `fm.exportPrefs` = `{v: 2, format, quality}`, written only by app.js `expPrefsSave` on Export —
unchanged shape and key (test (a) asserts the key set is exactly `format,quality,v`). Nothing is added to the project, so
`C.schemaFingerprint` is untouched — **no SCHEMA_REV bump, no FP to pin**. The card's own view state (open list, More open,
the session's sound type) is in memory only.

## The 34 settings (mapping.md), each with where it lives now

| # | Today | Now (A, as built) |
|---|---|---|
| 1 | PC top-bar Export | same, opens the card |
| 2 | phone green arrow | same |
| 3 | Home ⋯ → Export video… | same |
| 4 | preview pauses on open | same (showExportDialog untouched) |
| 5 | "Exporting is turned off" | same, before the card |
| 6 | "Before you export" reminders | same, before the card |
| 7 | clips still arriving | same, before the card |
| 8 | export marks / `[` `]` | Part row → "Between your marks · 0:06"; greyed with "mark them with [ and ] or the ⋯ menu" when unset; the model option renamed |
| 9 | title "Export" | the summary: picture, "You'll get · Video · 0:24", "1080×1920 · 30 fps · about 34 MB" |
| 10 | no-AAC amber warning | `#exp-noaudio-warn`, in the pinned footer right above Export |
| 11 | Format (6) | five buttons (Video=mp4, GIF, Picture=frame, Sound=audio/audiom4a, Frames); WAV/M4A in the Sound file row; still remembered |
| 12 | Resolution | Size row → list: every rung with pixels, a hint, its own MB (video), Recommended on Same as project |
| 13 | Custom size | "Exact size…" (last in the Size list) → the real W×H boxes under the Size row; also More options › Exact size → same boxes |
| 14 | Frame rate | Smoothness row → list (same rungs), Recommended on Same as project |
| 15 | Custom fps | "Exact fps…" → the real box under Smoothness; also More options › Exact fps |
| 16 | Quality (MP4) | Quality row, video only: Best / Balanced / Smallest (= High / Medium / Low), each with its MB |
| 17 | Range | Part row: Whole video / Between your marks / Selected clip, each with its length; clip greyed with no selection |
| 18 | Export just this layer | More options › Only one layer (`#exp-solo-btn`); "N on"; amber "Only the ‘X’ layer" under the summary; picker amber when set |
| 19 | Transparent (GIF/frames) | its own row "See-through background" for GIF/Frames; also More options (greyed with the reason for Video/Picture) |
| 20 | GIF note | note under the buttons ("…so this one comes out 360×640"); Size row says "Biggest a GIF allows · 360×640" |
| 21 | audio hides picture rows | Sound shows only Sound file + Part; the picture becomes a sound icon |
| 22 | Cancel / Esc / Export again | ✕ (`#exp-cancel`), Esc, a tap on the dim (new), Export again |
| 23 | button label per format | "Export video · about 34 MB", "Export GIF", "Save picture", "Export sound · about 4.6 MB", "Export frames" |
| 24 | memory rules | unchanged: format + quality persist; size, fps, layer reset each open; Part lasts the session (now said in the Part list: "Stays picked until you close FreeMotion") |
| 25 | pops from the button; Export pinned | same pop (popFrom), footer sticky |
| 26–32 | progress, notes, Done, Export ready, wake lock, leave warning, crash-resume | untouched |
| 33 | fixed choices | More options › Technical details, read-only, per kind, with the file name runExport will use |
| 34 | refusals and errors | same wording; "No region marked" headed off by the greyed Part choice; the toast stays as the fallback |

## Deliberately left out / changed from the drawing

- **Sound file type is not in More options for Video/GIF/Picture/Frames** (the drawing shows it under Video). It cannot
  change those files, and the app's own rule (queue 216) is that a control which cannot affect the output is worse than
  none. It is the Sound file row the moment Sound is picked. Nothing lost.
- **Exact size is not offered for Picture**: runExport's frame branch never read the boxes (a still is a rung of the
  project), so the old dialog offered it and ignored it. Smoothness, Quality and Part are not shown for Picture for the
  same reason (one frame). Nothing lost — none of them reached the still.
- **More options' Exact size / Exact fps are buttons ("Set…" / "640 × 640")** that open the real boxes under Size /
  Smoothness, rather than a second pair of boxes in More options: one set of inputs, so what is typed is what runExport
  reads, and the old "Custom rows are hidden until Custom is picked" behaviour (tests 141, 690) holds.
- **No 24 fps rung added** (mapping fix 3, optional): the export list is matched to the canvas picker (queue 119/120);
  Exact fps reaches 24.
- Only MP4 gets the Export ready card — unchanged (mapping fix 4).
- **The Simple editor**: untouched. Its Export list (v17.48) calls `showExportDialog(sx)` → `runExport(sx)`, which never
  reaches the card; the only shared line it passes is `hideExportDialog`, which now also folds the card's view state
  (harmless when the card is hidden). No line in the diff matches a `tools/_fu_gate.py` HOOK, and no changed line in
  app.js / index.html / styles.css is blamed on a Simple release (checked with git blame on every hunk; the app.js
  `?v=` line is a buster-only change, which the gate treats as nobody's). The lock should read NOT-TRIGGERED.
- **Simple lessons** (`tutorials/simple/02-…`, `07-export-from-simple.md`) still describe the old dialog — they were
  already out of step since v17.48 gave Simple its own Export list; not touched here (Simple-side, flagged for later).

## Busters (relative to the base, v17.56)

| file | base | here |
|---|---|---|
| styles.css | 772 | 773 |
| js/app.js | 480 | 481 |
| js/export-card.js | — (new) | 1 |

⚠️ v17.57 (shipping while this was built) also moves styles.css to 773 and a dozen others: the landing must re-bump
styles.css and app.js from whatever main says then.

## Tests

New (all `{ item: '985' }`):

| title (start) | fails on v17.56 with |
|---|---|
| `985 every setting of the old Export dialog is reachable on the new card and sets the same control the export reads` | the Export card has no ‘GIF’ button under What to make — option A’s five buttons are not there |
| `985 each kind on the new card reaches the same encoder as today with the same options, and is remembered the same` | the Export card has no ‘Video’ button under What to make — option A’s five buttons are not there (after its CONTROL: today's mp4 path reached the mp4 encoder) |
| `985 the card opens on what you will get - a picture, the length and about N MB, the same sum the exporter is then handed` | the Export card does not open on what you will get — there is no You’ll get summary, only the settings |
| `985 at 380 and 320 nothing on the Export card cuts off its own text - …(917 finding 7)` | at 380 the Export card cuts off its own text: at 380, as it opens: select#exp-res shows ‘Same as project — 1080×1920’ in N px and needs M (and #exp-fps) |
| `985 the card closes with its ✕ and with a tap on the dim around it, and a tap on the card itself or a drag out of it leaves it open` | a tap on the dim around the Export card left it open — … |

Controls: (a) every control the export reads is in the page, and Selected clip is enabled; (b) today's path (the control
set by hand + `FM._runExport`) reaches the expected encoder before the card's path is compared with it, and the WAV and
M4A cases are shown to differ; (c) the project has no sound (so the sizes carry no AAC), the dialog opened on the
project's own size/rate, and the picture is only required to have paint where the preview has paint; the MB is checked
against the bitrate the stubbed `FM.exporter.run` is actually handed (allowance = the card's own rounding, 0.5 MB from
10 MB up, 0.05 below — not a measured tolerance); (d) the cut-reader is shown a planted cut of each kind first (a value in
a 24px box, a select too narrow for its option) and must find both; (e) a tap on the card and a drag out of it must NOT
close it before the dim tap must.

Legacy tests adapted (same titles, bodies changed — no DROPS TEST):
- `choosing Audio only hides every control that cannot affect it` — the button word is "sound" now (`/sound/i`). Base:
  the button still says "Export audio" for an audio export.
- `export: M4A is offered, produces a real MP4 audio file, and never saves an empty track` — expects "Export sound …".
  Base: the export button says "Export audio" for M4A, …
- `export dialog: the controls line up in one column` — now measures the rows' value edges and arrow column (and More
  options' arrow); same card-fits-the-phone check. Base: control failed: only 0 visible row(s) on the Export card, …
- `918.12 — on PC the export dialog shows the project size and rate in full, and the layer picker has an arrow` — reads the
  Size and Smoothness rows at 1280 (name 1080×1920 / 30 fps, shown whole) and the picker in More options (with its
  `::after` arrow). Base: the Export card has no Size row on screen.

Legacy tests that should pass unchanged (reasoned, not run): 141 custom fps (`#exp-custom-fps` still class-hidden until
Custom), 690 custom size (the `#exp-custom-field` row is on screen under Size for GIF/frames), 121 inherits-from-the-cog,
172/173 defaults, 174 solo picker (`#exp-solo-btn` still opens the menu, now from More options), 215/495 the warning
(same element, same class rule), 494 and the canvas 498 pinned-row checks (footer is still `.dialog-actions`, sticky,
opaque, offsets matched; the card's last scrolling child is `.xa-body`), 548 popFrom (card is 580px on PC), 705 frame
scale, 884/891/690 runExport seams, 912 phone animation, 925 toggle, 1082 lesson words (every bold in the rewritten lesson
is in the source).

## Browser checks still owed (nothing above was run)

1. The suite at 1280 and 380, then the five new tests and the four adapted ones as a slice at 380 AND 1280 (some open lists
   at 380 inside atPhoneWidth).
2. prove.sh: all nine changed tests should read CAUGHT.
3. By eye at **380, 320, 900 (narrow PC) and 1280**: first glance; each of the five kinds; every list open; More options
   open with a layer picked (amber line, "1 on"); Exact size / Exact fps open; a long layer name; the no-AAC warning in the
   footer (force `FM.canEncodeAAC = async () => false` + a sound layer); a short phone (the pinned Export, scroll).
4. **Light and dark**: the card themes with the EDITOR (dark navy, and the glass theme's variables); it never opens over the
   light Home (Home's ⋯ → Export opens the project first). Check the glass theme (translucent card, opaque pinned footer —
   as before).
5. **An actual export of each kind compared with v17.56** for the same settings: MP4 (size, fps, bitrate, sound), GIF
   (640 cap, 50 fps, see-through), Picture (rung scale, one layer), Sound WAV and M4A (one layer, Part), Frames (ZIP, count,
   see-through) — on his iPhone for MP4/M4A (AAC) if possible.
6. Real touch: a tap on the dim closes, a drag from a box out to the dim does not; the ✕ is 34px.

## #545 pictures to take

The built card at **380** and at **1280**, beside `tools/design/985/985-A.jpg` — first glance, Size open, More options open
with one layer, GIF picked, Sound picked (the five phone states and the three PC states the sheet draws).

## What I was unsure about

- **"Best / Balanced / Smallest"** for High / Medium / Low are my words (the drawing only shows "Best"). The hints are mine
  too. Taste call for him with the #545 pictures.
- **The picture** is copied off `#preview`. While the preview is showing a cropped view (Free-Crop's `__fmCrop`) the
  picture would be that crop; rare, not handled.
- **The MP4 MB counts AAC only when the project has sound** (FM.projectHasAudio), where the drawing always added 160 kb/s.
- **"about N MB" is the encoder's TARGET bitrate** — H.264 can come in under it on simple pictures, so a real file may be
  smaller than the card says. The drawing's sum, as the mapping specified.
- **Tap outside to close is new behaviour** in a modal that used to ignore the dim. A test that clicks the dim on purpose
  (none found) would now close the dialog.
- **The rows show the exact boxes only after "Exact…" is picked**, as the old dialog did; the drawing shows always-present
  boxes in More options. Kept to the old rule so tests 141/690 hold and so there is one set of inputs.
- The phone card is `min(362px, 100vw − 28px)` (the drawing's), wider than the old 330px.
- The `.xa-left` column is sticky on PC so the picture stays while the right column scrolls — not drawn, my call.
- The ✕ is absolutely placed in the card's top corner, so on a short phone it scrolls away with the summary (Escape, a tap
  on the dim and the Export button still close it). The drawing pins only Export. Worth a look at 380×553.
- `ui.sound` (the session's WAV/M4A memory for the Sound button) follows the remembered format, so Sound comes back as the
  last file type exported; picking Sound when the last sound export was M4A gives M4A. That is today's behaviour of the
  remembered format, just shown on a button.

## Review (16 Oct) — adversarial review-and-fix of c59a91bc

**Nothing was run.** A release ship held the laptop: no browser, server, suite, prove.sh or mutate.sh. The only program
run was `node --check` on `js/export-card.js`, `js/app.js` and `tests/tests.js` (all print nothing), plus git and grep.
Every finding below was tried against the code from both sides; line numbers are c59a91bc's.

### Confirmed and fixed

| # | lens | where (c59a91bc) | what goes wrong | fix |
|---|---|---|---|---|
| R1 | 1 (the "You'll get" picture) | js/export-card.js:470-480 `drawThumb` | It COPIED `#preview`, which also carries what is never exported: the View menu isolate (on PC the Export button stays up with a clip isolated — the compositor's own note — so the picture showed one clip while the file holds every layer), the guides and onion skin drawn over the frame (app.js `render()`), and when zoomed in only the visible slice (`__fmCrop`), stretched to the project's shape. | Rendered with `FM.renderScene` at thumbnail size, the isolate and `_cropEditing` held aside for the one render exactly as `FM.snapshotPNG` does, at the preview's time (`FM._endInstantTime`). The copy is only a fallback if the render throws, and never of a cropped preview. |
| R2 | 3 (tap outside) | js/export-card.js:513-520 | With the Only one layer list (the context menu) open over the card, a tap on the dim closed the list AND the card — and the next open starts size, fps and layer again from the project. Same with the phone keyboard up in an exact-size box. | `pointerdown` does not arm while the context menu is open or a visible box in the card has focus: that tap only puts the list / keyboard away, the next one closes the card. |
| R3 | 3 | same | A mouse press that starts on the dim and is let go on the card: `click` fires on the common ancestor (`#export-dialog`), so it closed. | A `pointerup` on anything but the dim disarms. (Touch is unaffected: implicit capture.) |
| R4 | 3 (✕ scrolls away) | styles.css:3884-3887 `.xa-x` | Absolutely placed inside the scrolling card, so on a short phone it scrolled away; v17.56's Cancel was pinned beside Export (queue 494: "Cancel and Export stay on screen"). | `position: sticky` with negative margins that put it exactly where the absolute one sat (8px in at 380/320, 10px on PC) and give its height back; opaque `var(--panel)` like the pinned row. |
| R5 | 3 (safe area) | styles.css `#export-dialog` (no rule) | viewport-fit=cover + black-translucent: with a list open the card reaches max height and its top sits 12px from the screen edge — the new ✕ and the summary under the clock/Dynamic Island, Export near the home indicator. | `#export-dialog` padded by the insets, the card's max-height less both (vh, then svh) — the same pattern as `#canvas-dialog.cv-pair`. env() is 0 off-device, so the suite and a desktop are unchanged. |
| R6 | 4 (focus) | js/export-card.js:303 `optNode` | A pick folds its list away with the focused option in it, so a keyboard choice dropped focus to `<body>`: the next Tab started from the top of the editor behind the card. | Focus goes back to the list's row, unless the pick moved it on purpose (Exact size… → the width box). |
| R7 | 2 | js/export-card.js:197-204 | Picking Exact size… / Exact fps… while it is already the value left the list open over the boxes (every other pick folds it). | Folds the list, then focuses the box. |
| R8 | 1 (copy) | js/export-card.js:404 `more()` | With Picture picked, More options greyed See-through "— a video can't hold it" (a PNG could; this export just does not offer it). | "GIF and Frames only", with the video reason only for Video. |
| R9 | 8 | tutorials/09-export-options.md | The rewrite dropped v17.23's walked fact that Selected clip stays greyed on a phone (Export only shows with nothing selected), so "says how to set it" sent him round in a circle; step 2 bolded **Export** as if the card had that title (it has none now). | Caveat restored (and a verification row), bold removed. Lesson 01 step 11 is right as built. |

### Confirmed, left open (why)

- **MB vs MiB.** The card's "about 34 MB" is 10⁶ bytes (the drawing's sum, pinned by test (c)); the Export ready card
  (app.js `showExportReady`) divides by 1,048,576 — the same 33.6e6-byte target reads "32.0 MB" there. A visible number and
  a unit choice → for him with the #545 pictures (recommend: one unit in both places; phones show decimal).
- **`role="radio"` without arrow keys** on the five kinds and the list choices — Tab + Enter/Space work, arrows do not. A11y nit,
  no function lost; a roving-tabindex pass is its own small item.
- **Focus is not moved into the card on open nor back to Export on close** — the same as v17.56 (pre-existing).
- **Hints in `--text-faint` at 11–11.5px** (~3:1 by styles.css's own note on `.hm-search-hint`), including "mark them with [ and ]",
  which teaches. Contrast/taste call for #545.
- **Frames past 900** (e.g. 31 s at 30 fps): the card says "930 PNGs in a ZIP" and Export then alerts FRAMES_TOO_BIG — as
  v17.56 did. The card could say so first; an improvement, not a regression.
- **The picture does not follow Only one layer** (drawn once per open; the amber line says it). Design.

### Refuted (16)

exportSpan ≠ exportRange (same branches, toasts, order); the legacy "Audio only hides…" test going red because `#exp-res` is
never visible (its `visible()` reads the `.field`'s hidden class, still toggled in the model); 690's Custom-size row timing
(syncCustom un-hides synchronously); 494/498 last row and pinned row (children ✕ / .xa-body / footer, offsets match);
174 clicking the hidden picker (the menu still opens); stale list state measured by popFrom on reopen (every real close path
runs `closed()`); double listeners on reopen (`wired`, `_customWired`); any user string through innerHTML (none — text nodes
only, `fileBase` cleans); the Simple editor (no `_fu_gate` HOOK in any ± line of the whole diff, re-checked after these fixes;
Simple's export is `runExport(sx)`, never the card); Escape folding an open list first (an in-place list is not a layer);
Picture with Exact size (card says Same as project = runExport's frame branch); the card's sizes vs run/runGif/runFrames/
snapshotPNG (same arithmetic); the card over the light Home (z 100 < 200; Home's ⋯ opens the project first); 918.12 under
`atWideWidth(…, 1280)`; the lesson's button/row names vs the code; `exp-cancel`/`exp-go` without `type` (no form).

### Fields (whitelist update)

The card now also READS `FM.isolate` and each layer's `_cropEditing` — set aside for the one thumbnail render and put back in
`finally`, exactly as `FM.snapshotPNG` — and `#preview` only as the fallback. It still WRITES only the controls listed above.

### Tests (review)

New, all `{ item: '985' }`, each expected to fail on c59a91bc with:

| title (start) | on c59a91bc | on v17.56 |
|---|---|---|
| `985 the picture on the Export card is the frame the file will hold, …` | the picture … is the preview with the View menu isolate on it (its centre reads 32,48,64, the background) | the Export card has no picture of what you will get |
| `985 a tap on the dim closes only the topmost thing - …` | a tap on the dim to put the layer list away closed the Export card too | no ‘Video’ button under What to make |
| `985 the ✕ stays on the Export card while it scrolls, …` | scrolled down, the ✕ has gone off the top of the Export card | the ✕ is not in the top corner (Cancel is in the bottom row) |
| `985 a choice made from the keyboard on the Export card keeps the keyboard on the card - …` | after choosing Balanced from the keyboard, focus is on BODY, not the Quality row | no ‘Video’ button under What to make |

Controls: the preview shows the box un-isolated and loses it isolated (F1); the list really opened and really closed, the box
really took focus, and a plain dim tap still closes (F2); the ✕ starts in the top corner and the squeezed card really scrolls —
squeezed by `height`, because popFrom's ResizeObserver clears an inline max-height on PC (F3); the option really took focus and
really set Quality, and Exact size… still goes to its box (F4). Test (a) gained: under Picture the See-through reason does not
say "video" (fails on c59a91bc). No tolerance was added.

### Busters now

styles.css 774 (branch 773, base 772) · js/export-card.js 2 (new file) · js/app.js 481 (unchanged by the review). The landing
must re-bump from whatever main says then.

### Still owed to a browser / his phone

1. The nine 985 tests plus the four adapted ones as a slice at 380 AND 1280, then the suite; prove.sh (expect CAUGHT for all).
2. By eye: the ✕ at rest is where it was (8px corner at 380/320, 10px at 900/1280); scrolled on a short phone it stays; on
   **glass** it now sits on an opaque disc (like the opaque pinned footer) — judge it.
3. The rendered picture against the preview on a real project (video, effects, a camera, an adjustment layer with Local
   radius), and the cost of opening Export on a heavy project on his phone.
4. His installed iPhone app: with the Size list open the card clears the status bar and the home indicator; the ✕ taps.
5. Real touch: dim tap with the layer list open closes only the list; with the keyboard up only the keyboard; then one more
   closes the card. Keyboard: Tab into a list, Enter, a visible ring on the row.
