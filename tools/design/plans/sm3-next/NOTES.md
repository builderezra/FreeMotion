# Simple Phase 3 · Tray effects — an effect ON a title or an overlay, and the "runs over the next clip" hint (queue 980, refers to #545)

Branch `hunt/sm3-next`, built ON `ssh/hunt/sm3-stack` (fc301cb1: Look, Captions, Effect segments, the switch morph, the #1171 guard).
**Nothing was run** — no browser, no server, no python, no test: a release ship was running on this machine. The only program run
besides git / grep / awk / tr was `node --check` (a parse check). Every line here is from reading; the suite has not seen any of it,
and every test below is owed its first run.

## Which part, and why this one

DESIGN §15's Phase 3 row, in its order: Look (filters + Adjust) · Captions · Effects segments · Ask · Clips › Extras · the Create
picker · template-fill Replace · pack insert · the morph. Built on the stack so far: Look on clip-row clips, Captions, Effect segments,
the morph. The first unbuilt pieces in that order, and what each waits on:

| Piece (its place in §15) | Decisions | Built here? |
|---|---|---|
| **Look for all** (under Look; §8.5 project row) | no §17 row — but see why skipped | **no** — skipped, below |
| **Look on overlays** (under Look; §8.5 overlay tray) | none open in §17 | **no** — skipped, below |
| **Effects in the Main clip, Overlay and Text trays** (the Effects flow, §8.5c item 3) + **the Q5 hint** (§4.3) | §8.5c has no open D; Q5 is decided (DESIGN §19: "crossing ones are left alone with a hint") | **yes — on titles and overlays; the clip-row clip's tool waits on decision 2 (below)** |
| Ask (D12 A, answered) | answered, but §8.5a: "Ask ships in Phase 3 only with all of the above" | no — skipped, below |
| Clips › Extras (D21 A, answered) | answered | no — next in line |
| The Create picker | **D3 open (re-asked)** | no — waits on D3 |
| Template-fill Replace (B28) | answered | no — later in the order |

So the part built is the rest of the Effects flow: **Add effect in a title's and an overlay's tray** (§8.5c item 3, item 4's marker,
§8.5's "3D, Keying and Repetition hidden"), plus **the "runs over the next clip" hint** (§4.3 / Q5) — both live in the same code (the
segment picker's state and the segment's read). It is something he can SEE: a new tool in two trays, its picker, and a tag on the
timeline.

## What was built

- **The command** (`js/spine-edit.js`, block `PHASE 3 · EFFECTS ON AN ITEM` at the very end):
  - `FM.spine.itemEffects(L)` — what the picker offers for THIS layer: his own effect presets and the shipped ones first (a filter
    preset is Look's, left out), then every effect in the browser's category order, each only when `fxRegistry.supportsLayer(type, L)`
    says it runs on that layer, and never 3D, Keying or Repetition. `{ key, type, name, preset }`; a preset's key is `'p:' + id`.
  - `FM.spine.planItemEffect(R, id, key, t)` / `FM.spine.cmd.itemEffect(id, key, t)` — ONE runner step labelled **Add effect**
    (`ed: 's'`), never arranging, never adopting (works with a friend in, as Look does — D14 A). It pushes exactly what Full's
    browser pushes for that tile (`js/fx-browser.js` addEffect): one registry instance, or a preset's instance keyed from the playhead
    when the playhead is inside the item, else from the item's start (Full's own anchor rule) — onto the END of the item's own
    stack, marked `sm: 1` (§8.5c item 4), so a preset's keys are level `none` (no ✦; Phase 1's `smFxProps` already reads the marker).
    The effect travels with its item because its keys are the item's keys (`FM.timedLists`, Phase 1). Takes a picture / video /
    shape on top, a background, a title — and a clip-row clip (the command takes it; the tray does not offer it yet). Refuses a sound,
    a caption track, a segment, a block, the camera. Live line (`#sm-live`): *"Added Shake to the image"*, *"Added Beat Slam to “Hi”"*.
  - `FM.spine.segmentOver(R, id)` — §4.3 / Q5: true for an effect segment that rides a clip (has a host) and ends past that clip's
    end. A long one (over three or more clips, no host) says nothing.
- **The tray** (`js/simple-tools.js`):
  - `addFxT` in `trayFor`: a title's tray is **Edit words · Add effect · Stay put · More · 🗑**; anything on top is **Into row · (Volume ·
    Speed) · Add effect · Crop · Forward · Back · Stay put · More · 🗑** — DESIGN §8.5's order for both.
  - Block `PHASE 3 · EFFECTS ON AN ITEM`, `itemFxFill()`: the picker in the tray row, the same shape as the segment picker (Done, then
    tiles in their own scrolling strip with its fades, the browser's sample pictures: `fxThumbs.mount` / `mountPreset(…, null)`).
    Nothing is written until a tile is tapped. A tap closes the picker back to the item's tray (Add effect keeps keyboard focus) and
    runs the one step with the playhead read at the tap.
  - `FM.simpleTools.openItemEffects(id)` — opens it (pressed again for the same item, closes); does nothing outside Simple. It reuses
    the segment picker's `fxPick` state with `on: true`, so every existing close path (another selection, Done, leaving Simple,
    `_reset`) closes it too. One-line hooks in Segments' code: `fillTray`'s first line, `segSig`, `_fill`'s strip key (`'/on'`).
- **The hint** (`js/simple-timeline.js` `badge`): a small tag *"runs over the next clip"* on that segment's timeline item, and the same
  words appended to the item's `title` and accessible name.
- **Words** (`js/spine-words.js`): lines `itemFxAdded`, `itemFxGone` (*"That was just deleted"*), `itemFxUnsuited` (*"That effect
  doesn’t work on this"*), `segmentOver`; tools `addEffect` (*"Add effect"*), `addEffectTitle` (*"Add effect to the selected item"*).
- **CSS** (`styles.css`, one block at the very end): `.sm-fx-over` only. The picker reuses Segments' `#sm-tray[data-row="effects"]`,
  `.sm-fx-tile`, `.sm-fx-th` rules.
- **Busters** (`index.html`, one above sm3-stack's): styles.css 771→**772**, js/spine-words.js 16→**17**, js/spine-edit.js 15→**16**,
  js/simple-timeline.js 12→**13**, js/simple-tools.js 13→**14**. If main moves past these before landing: take main's line, then one
  above the higher.

## Skipped, and why

- **Add effect on a clip-row clip** (§8.5c item 3 names the Main clip tray first) — **waits on decision 2** (sm3-stack NOTES, NEEDS
  EZRA'S EYES 2: "his pick B no longer fits a video clip's tray on a PC"). His pick B lays a tray on two rows only up to ten tools
  (`TWO_ROW_MAX`); a picture clip already has exactly ten since Look, so one more tool puts EVERY clip-row clip on PC into the
  one-scrolling-row fallback and ends his pick B for clips — the open question, decided by default. It would also re-fixture the six
  pick-B tests that pin "a picture's ten tools". Under his options: (a) as built for video → one line in `trayFor`'s main branch
  (`addFxT` after Look) and the pick-B fixtures move to an overlay; (b) the wider band + `TWO_ROW_MAX` 12 → the same line, pick B
  holds; (c) one Move tool → the same line, pick B holds. The command already takes clips.
- **Look for all** (the project row's "Look with Use on every clip"): it needs a place for a panel with NOTHING selected — on a phone the
  docked sheet only rises for a selected item (`js/mobile.js`, a Full file: Segments' NOTES) and `drawPanel` draws for a layer; and it
  is the project row's seventh tool, which Look's NOTES tie to the same open band decision (sm3-stack NEEDS EZRA'S EYES 2(b) and 5).
- **Look on overlays** (§8.5 overlay tray): with Add effect it makes a picture on top nine tools (five columns, so More's column moves
  in the More-double-click test, which cannot be re-fixtured blind) and a video on top ELEVEN — past pick B's ten, decision 2 again.
- **Ask** (D12 A): §8.5a "ships in Phase 3 only with all of the above" — `applyOps(…, {simple: true})` intents in `js/ai-ops.js`,
  an async `applyTurn` in `js/ai-chat.js`, the manifest's Simple vocabulary, `FM.spine.compose`: Full files and a whole feature, not
  a code-only part with nothing run.
- **Clips › Extras** (D21 A): needs §14.2's `tabs` option in `js/addmenu.js` (a Full file) and §12.2's insert command (classify the
  pack, splice its main units, `sm.unit` groups, the camera dropped). Next in line after this.
- **The Create picker**: D3 is open (re-asked).
- **Template-fill Replace** (B28): `js/template-fill.js` is a Full file, and it is later in the order.
- Not built inside this part either: Segments' deviation 2 stays (the project row's picker still leaves out the tiles a segment
  cannot be, rather than showing them with *"Pick a clip first"*) — now that titles and overlays have Add effect those tiles would
  have somewhere to send him, but they are ~100 more tiles in that row; his call with the picker's look (EYES 4).

## Departures from the design (each a call made while building; his to overrule)

1. **The tray's face is "Add effect", not "Effects"** (DESIGN §8.5's tray tables and §8.9's word list say Effects). The project row's
   Effects (a segment over the clip) is on screen at the same time, and §8.5's one-home rule — HIS #310, "no two controls visible at
   the same time share a face label, a title or a command id" — forbids two "Effects". Same sparkle icon as the project row's.
2. **Not on clip-row clips yet** (decision 2, above). The command takes them.
3. **Simple's own picker in the tray row, not `FM.fxBrowser` in a `simple` target mode** — Segments' deviation 1, for the same reasons
   (no Full-file change; the tray row needs no sheet). No categories, no search, no preset rows under each effect.
4. **Presets are tiles of their own, first** (his presets, then the shipped ones; a filter preset is left to Look). The design names
   "a tile or preset row" (§8.5c item 1) without saying where.
5. **3D, Keying and Repetition are hidden from an item's picker too** — §8.5 says so for the project row's browser; Keying is the overlay
   tray's own Remove a colour (not built), 3D and Repetition are Full's.
6. **One pick, then the picker closes** back to the item's tray (Full's browser closes after an add too). Each pick is its own step;
   trying another means Undo, or another Add effect (which stacks a second effect).
7. **No toast, no Recents, no open row.** Full's add writes the browser's Recents (`fm.fx.recents`), opens the effect's row and toasts
   when the effect provably does nothing on that layer (`FM.fxDeadOnLayer`). Simple's add does none of these: Full's Recents stay
   Full's, Simple has no effect rows, and §3.12 bans `FM.toast` (the "does nothing here" warning has no Simple line yet).
8. **The Q5 hint lives on the timeline item** (a tag, plus its title and accessible name), not in the tray; only for a segment that rides
   a clip.

## ❓ NEEDS EZRA'S EYES (#545: nothing visual new ships unseen; none of this has been drawn on a sheet)

1. **Add effect in the trays** at 380 and 1280×800: a picture on top's eight tools (two rows of four on PC), a video on top's ten (two rows
   of five), a title's five (one row).
2. **The face "Add effect"** beside the project row's **Effects**, with the same sparkle icon. Options: (a) as built — recommended, it
   keeps his #310; (b) both "Effects", as DESIGN's tables (two identical faces on screen at once); (c) the tray "Effects" and the project
   row renamed (e.g. "Effect over").
3. **A title's tray on PC** is five tools in one row (pick B starts at six). Computed, not measured: on the laptop's wider fallback font
   (~6.4 px a letter at the tray's 10 px) it is ~318 px in the 307 px band, so Stay put sits half under the end fade (a wheel or a swipe
   reaches it); on the Mac's font it fits.
4. **The item picker**: Done + one long scrolling row — presets first, then ~100+ effects by category — with the browser's SAMPLE pictures,
   not his clip; names cut at 60 px. Options: (a) as built; (b) a panel with categories like Look's (sheet / band); (c) live pictures of
   his own item (`fxThumbs.mountPreset(…, layer)` — heavier).
5. **The hint** — a dark tag *"runs over the next clip"* on the segment's green item (cut with an ellipsis on a short item); words his to
   change.
6. **Words**: *"Added Shake to the image"*, *"Added Beat Slam to “Hi”"*, *"That effect doesn’t work on this"*, *"That was just deleted"*,
   *"Add effect to the selected item"* (its title).
7. **Decision 2 now holds a third thing**: clip-row clips' Add effect (above), with Look's own two.

## What the lock run (Full unchanged, FU1–FU7) must cover

**No Full file changed.** Files: `js/simple-tools.js`, `js/simple-timeline.js`, `js/spine-edit.js`, `js/spine-words.js` (Simple-owned),
`styles.css` (one `.sm-fx-over` rule, a class only Simple's timeline makes), `index.html` (five busters).
- **An effect added in Simple on an overlay or a title is an ordinary effect in Full**: its row in Full's Effects card at 380 and 1280,
  editable there, and it **exports** the same — include a shipped preset (Beat Slam: a keyed Shake, `sm: 1`) and check it plays at the
  same moment in Full's preview and in the file.
- **Full's own effects browser is untouched**: its add still writes no `sm` marker, still writes its Recents, still opens the row and
  toasts; Simple's add leaves `fm.fx.recents` as it was.
- A project with a **segment that runs over a cut**, opened in Full: no tag anywhere in Full (the tag is Simple's timeline only).
- `js/simple-timeline.js` and `js/spine-edit.js` are already Simple files in the lock's eyes (`tools/_fu_gate.py SIMPLE_FILES` — check
  they are listed; `editor-morph.js` is not, per sm3-stack's NOTES).

## Tests (tests/tests.js, before the final `})();`, `{ item: '980' }`, block `simple P3 · Tray effects`)

New (8). Each fails on fc301cb1 (sm3-stack) by its own sentence, never a TypeError:

1. `simple P3 · Tray effects at 380 a picture on top and a title each hold Add effect, which opens a picker in the tray row — Done, then
   only effects that item can run …` — on the base `smIfxOpen` throws *"the selected item’s tray has no Add effect tool (it holds
   into,crop,forward,backward,stay,more,delete)"*. CONTROLS first (pass on the base): O reads as a picture on top and Hi as a title;
   some 3D / Keying / Repetition effect DOES run on a picture (so leaving them out is measured); some text effect runs on a title and
   not on a picture; the Beat Slam preset exists.
2. `… at 380 a tap on Shake puts ONE Shake marked sm 1 on the end of that picture’s own effects …` — base: the same Add effect sentence.
   CONTROL: O starts with its own Blur (so "on the end" is measured).
3. `… at 380 a preset tile lands as ONE Shake keyed from the playhead when it is inside the item, else from the item’s start … CONTROL: the
   same preset unmarked does earn it …` — base: the CONTROLS pass (Q, carrying an unmarked Beat Slam, earns the ✦: the ✦ check is not
   blind), then the Add effect sentence.
4. `… at 380 an effect put on an overlay travels with it: deleting the clip before its clip moves the overlay by −2 s and the Beat Slam’s
   keys by the same −2 s` — base: CONTROL (O rides A) passes, then the Add effect sentence.
5. `… at 1280×800 an overlay’s eight tools — Add effect among them — lie on two rows of four …` — base: *"1280×800: the overlay’s tray has
   no Add effect (it holds into,crop,forward,backward,stay,more,delete)"*.
6. `… at 380 an effect segment that runs on past the clip it rides shows ‘runs over the next clip’ …; one inside its clip shows nothing
   (CONTROL), until a trim of its end takes it over the cut` — read from the page only; base: CONTROLS pass (both segments are effect
   units with the hosts named, both drawn), then *"380: the segment that runs past Clip 1’s end shows no ‘runs over the next clip’ hint
   on its timeline item"*. The trim uses 2.5's own item-drag command (`cmd.trimItem`).
7. `… switched to Full: an effect added in Simple is an ordinary effect on that layer …` — base: the Add effect sentence.
8. `… leave Full alone: openItemEffects in Full opens nothing, draws nothing and writes nothing (CONTROL: in Simple Add effect opens the
   picker)` — base: the Simple CONTROL throws the Add effect sentence BEFORE `openItemEffects` (which the base lacks) is called.

Changed (owed a run too):
- `simple P2.2 · tray B at 1280×720 More opens its panel …` — the overlay's CONTROL count 7 → **8** (still four columns, More still the
  third of the second row). Base: *"CONTROL: the tray is into,crop,forward,backward,stay,more,delete"*.
- `simple P2.2 · review at 380 a Text or a sound effect added in Simple gets its own tray at once …` — want
  `editwords,addfx,stay,more,delete`. Base: its own *"a Text added in Simple shows the tray … want editwords,addfx,…"*.
- `SU1 #9 · at 380 a title typed in Simple is named by its words …` — the same list. Base: *"after the ✓ the tray is
  editwords,stay,more,delete, want Edit words, Add effect, …"*.
- Comments only: `tray B at 1280 on PC a clip with every tool …` (a title's tools are five now, still one row) and `SU1 #15` (a title's
  tray still fits 380). Two titles still say "a title’s four tools" (`tray B on PC the band says …`, its own message) — true in intent
  (one row, today's words), wrong in count; left as they are so no test is renamed.
- Read and unchanged: `smTrayCheck` (the main-clip tray and the project row are unchanged), the More-in-reach CONTROL (project row
  unchanged), the WCAG name test (Add effect's name contains its face), `simple P2.3 · the tray: …` (subset checks).

## First run (serve the tree with `tools/serve.sh`)

```bash
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=Tray%20effects'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=Tray%20effects'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P2.2'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=simple%20P2.2'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=SU1%20%239'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=SU1%20%2315'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P3'
```
Then sm3-stack's own first-run list (this branch is on top of it), the full suite at both widths, and the lock run above.

## Checks done here (the only ones possible)

- `node --check`: OK for js/spine-edit.js, js/simple-tools.js, js/spine-words.js, js/simple-timeline.js, tests/tests.js.
- CR bytes 0 and no conflict markers in every changed file.
- No duplicate 2-space top-level `const` / `let` / `function` name in any changed app file; tests.js has no new duplicate (its new
  helpers are all `smIfx…`). `FM.simpleTools` gains one key (`openItemEffects`); spine-words gains six keys, none repeated.
- No double quote in a new test title; no `//` comment appended to a line whose statement continues.
