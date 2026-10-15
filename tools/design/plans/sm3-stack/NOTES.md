# Simple Phase 3 · the stack — Look + Captions + Effect segments + the switch morph + the #1171 guard (queue 980, refers to #545)

Branch `hunt/sm3-stack`, built on `ssh/hunt/v50-tree` (4af4e420, the v17.50 tree). **Nothing was run in a browser, a server or
python**: a release ship was running on this machine the whole time. The only program run besides git / grep / sed / awk was
`node --check` (a parse check). The suite has not seen any of this; every Phase 3 test below is owed its first run.

Each branch's own NOTES are kept beside this one (`../sm3-look/`, `../sm3-captions/`, `../sm3-segments/`, `../sm3-morph/`) and stay
the detailed record; this file is what the stack changed and what is owed.

## Merge order

| # | Commit | What |
|---|---|---|
| 0 | 4af4e420 | `hunt/v50-tree`, the base |
| 1 | 7da21cf2 | Look (from `hunt/sm3-look`, already under Captions) |
| 2 | 5620caf1, 2d3d4599 | Captions, then its parse fix (`hasSound` → `speechHas`) — the branch the stack started from |
| 3 | 13d37382 | Effect segments, cherry-pick of 61c7f13e (`hunt/sm3-segments`, built on Look) |
| 4 | b0ff43c9 | the switch morph, cherry-pick of 2d7714dd (`hunt/sm3-morph`, built on v50-tree) |
| 5 | bc8b4f63 | the #1171 guard (`.claude/v17.49-guard/guard.diff` + `guard_test.js` in the main checkout) |
| 6 | 3026a7e6 | index.html busters for the whole stack |
| 7 | (this commit) | these NOTES |

## Every conflict and how it was resolved

Segments onto Captions (both built on Look, both append at the same places) — rebuilt by blocks, both kept whole:
- `js/simple-tools.js` ICON: Captions' six drawings, then Segments' three (`effects`, `change`, `strength`); a comma after `close`.
- `js/simple-tools.js` state lets: Captions' `linesSeen, linesTop`, then Segments' `fxPick, segDrag`.
- `js/simple-tools.js` blocks: `PHASE 3 · CAPTIONS — EDIT LINES`, then `PHASE 3 · EFFECT SEGMENTS`, both before `FM.simpleTools = {`.
- `js/simple-tools.js` `_reset`: one line clearing both (`segUndrag()`, `linesSeen`, `linesTop`, `fxPick`).
- `js/spine-edit.js`: the CAPTIONS block (now closed by its own `});`), then the EFFECT SEGMENTS block, before `})(window.FM);`.
- `js/spine-words.js` `lines` and `tools`: Captions' keys, then Segments' keys (a comma after each side's last entry). No key clash.
- `styles.css`: the `.sm-cap…` block, then the `.sm-fx…` block, both after Look's `.sm-look…` block.
- `tests/tests.js` end: Look's block, Captions' block, Effects segments' block, before the final `})();`.
- `smTrayCheck`: Segments' tolerant in-order form, the list made right for the final row:
  `['clips', 'text', 'captions', 'sound', 'overlay', 'effects']`.
- "More's panel leaves Clips, Text, Sound and Overlay in reach" CONTROL: Segments' tolerant `<` form, count **6**
  (`btns.length < 6`; its real check, every project tool pressable with the panel up, covers all six). Title unchanged.
- **Not a git conflict, found by reading:** Captions' first test checked the row EXACTLY (`clips,text,captions,sound,overlay`), so it
  would go red the moment Effects joined. Now `clips,text,captions,sound,overlay,effects`, and its title says
  `… the project row is Clips · Text · Captions · Sound · Overlay · Effects, …`.
- `index.html`: both branches made the identical four bumps, so git saw no conflict; set once for the stack (below).

Morph onto that:
- `index.html` `styles.css?v=`: took the base line (768) and bumped once above every branch → 771.
- `tests/tests.js` end: the three blocks above, then the switch morph's block (helpers all `sm3…` / `SM3_MS`, no clash).
- `js/editor-mode.js`, `js/editor-morph.js` (new), and the `styles.css` block after the `ed-xfade` rules merged cleanly.

The #1171 guard onto that:
- `js/simple-tools.js`: `sheetArmAt` / `armSheet` / `sheetGuard` and the window capture listeners, verbatim from guard.diff, after
  `splitMark`; `openPanel` calls `armSheet()` (the line is Look's form now, so the call was added by hand, not patched).
- `tests/tests.js`: the guard's test appended before the final `})();` in its own block, **renamed from its `PROBE` title** as the
  REQUESTS.md #1171 entry asks.

Checked after every step: every line each branch ADDED is in the result (count-aware) and every line it removed is gone, file by
file; the only differences are the resolutions listed above.

## Final busters (index.html)

One above the highest value the file has on v50-tree or on ANY of the four branches:

| File | v50 | look | captions | segments | morph | **stack** |
|---|---|---|---|---|---|---|
| styles.css | 768 | 769 | 770 | 770 | 769 | **771** |
| js/spine-words.js | 13 | 14 | 15 | 15 | 13 | **16** |
| js/spine-edit.js | 12 | 13 | 14 | 14 | 12 | **15** |
| js/inspector.js | 423 | 424 | 424 | 424 | 423 | **425** |
| js/simple-tools.js | 10 | 11 | 12 | 12 | 10 | **13** |
| js/editor-mode.js | 6 | 6 | 6 | 6 | 7 | **8** |
| js/editor-morph.js | – | – | – | – | 1 | **2** (new file; 1 would also pass ship.sh) |

Every `<script src>` / stylesheet link on any of the five refs (103 distinct) is in index.html exactly once;
`editor-morph.js` loads right after `editor-mode.js`, before `app.js`. If main moves past v17.50 before this lands, re-bump each
against main (take main's line, then one above the higher).

## Final project-tool order

**Clips · Text · Captions · Sound · Overlay · Effects** — DESIGN §8.5 (DESIGN.md 2926: *Clips · Text · Captions · Sound · Overlay ·
Look for all · Effects · Ask*) with the two not built yet left out. Captions' NOTES and Segments' NOTES agree.

## Parse and name checks (the last run, on the tree of commit 6)

- `node --check`: OK for js/simple-tools.js, js/spine-edit.js, js/spine-words.js, js/inspector.js, js/editor-mode.js,
  js/editor-morph.js and tests/tests.js.
- CR bytes 0 and no conflict markers in every changed file.
- Duplicate 2-space top-level `const` / `let` / `function` names: none in any changed app file. tests.js reports the same
  one-letter names as v50-tree (inner arrow-function locals on one line, e.g. `c`, `g`, `x`), nothing new at top level.
  js/inspector.js assigns `FM._tickQuantum` twice at top level — exactly as on v50-tree (Look added only the drawPanel line).
- Duplicate keys: none in ICON, FM.simpleTools, ROWS, the S.cmd blocks, or spine-words' `lines` / `tools` beyond what v50-tree
  already had (`audio camera follow matte twin` in nested objects).
- No double quote in any new test title; no duplicate test title; no `//` comment appended to a continued statement in an
  added line.

## FIRST-RUN CHECKLIST

**New tests (28), grouped.** Every title starts as written here.

Look (7) — `simple P3 · Look …`
1. `simple P3 · Look at 380 a selected clip’s tray holds Look, and Look raises its own panel …`
2. `simple P3 · Look at 1280×800 the panel opens inside the left band above the tray (D20 A) …`
3. `simple P3 · Look at 380 a tap on Noir puts Noir on THAT clip only …`
4. `simple P3 · Look at 380 Adjust’s Brightness moves the picture …`
5. `simple P3 · Look at 380 Strength writes the filter’s own Strength in ONE step labelled Look strength …`
6. `simple P3 · Look switched to Full: …`
7. `simple P3 · Look leaves Full’s own panel alone: …`

Captions (8) — `simple P3 · Captions …`
1. `simple P3 · Captions at 380 the project row is Clips · Text · Captions · Sound · Overlay · Effects, …` (title changed here)
2. `simple P3 · Captions at 380 Type captions with the playhead on Clip 2 adds ONE line there …`
3. `simple P3 · Captions at 380 the words typed into a line are kept as words: …`
4. `simple P3 · Captions at 380 Find speech on a selected clip puts one line at each stretch of speech …`
5. `simple P3 · Captions at 380 Find speech on a voice-over that stays put marks the new track Stays with the sound …`
6. `simple P3 · Captions at 380 Find speech that hears nothing says so in the tray row …`
7. `simple P3 · Captions switched to Full: …`
8. `simple P3 · Captions leaves Full’s own panel alone: …`

Effect segments (6) — `simple P3 · Effects segments …`
1. `simple P3 · Effects segments at 380 the project row’s Effects opens a picker in the tray row …`
2. `simple P3 · Effects segments at 380 a segment rides its clip: …`
3. `simple P3 · Effects segments at 380 the segment’s own tools are each ONE step with its own label: …`
4. `simple P3 · Effects segments at 1280×800 the picker lies in the tray row inside the left band …`
5. `simple P3 · Effects segments switched to Full: …`
6. `simple P3 · Effects segments leave Full alone: …`

The switch morph (6) — `simple P3 · the switch morph …` (each at 380 and 1280 inside the test)
1. `simple P3 · the switch morph Full → Simple through the cog at 380 and 1280: …`
2. `simple P3 · the switch morph Simple → Full through the cog at 380 and 1280: …`
3. `simple P3 · the switch morph: a second switch in mid-flight lands the first at once …`
4. `simple P3 · the switch morph never sticks: …`
5. `simple P3 · the switch morph with reduced motion: …` (asks the driver for reduced motion, as `980 cog T15`)
6. `simple P3 · the switch morph plays for Open in Full too: …`

The #1171 guard (1) — REAL input (`realInput924`), so through `tests/_cdp.py`, and it sets the phone heights itself
1. `simple P2.7 · 2A row 16 at 380×800 and 380×667 a REAL double click on More opens its panel and presses nothing the panel brought under the pointer`

**Changed tests (owed a run too):**
- `simple P2.3 · S9 option E: a main video clip’s tray is Length, Audio, Move earlier, Move later, Lift off, Look, …` — Look renamed
  it (its claim changed: eleven tools keep one scrolling row on PC — see NEEDS EZRA'S EYES 2).
- Look's six pick-B fixtures: `simple P2.2 · tray B at 1280 on PC a clip with every tool shows all nine on two rows …`,
  `… tray B at 1280×800, 1280×720 and 960×700 every tool is on show …`, `… tray B at 380 the phone keeps its one row …`,
  `… tray B at 1280×720 a double click on Close gap …`, `… tray B at 1280×720 after the window was once 500 px tall …`,
  `… tray B on PC the band says “Its tools are below” only while …`.
- `smTrayCheck` (its users: `simple P2.2 · at 380 a selected clip’s tools fill the tray row …`, `simple P2.2 · at 1280 the tray and the
  project tools sit at the bottom of the left band …`).
- `simple P2.2 · review More’s panel leaves Clips, Text, Sound and Overlay in reach …` (CONTROL `< 6`).

**Slices** (serve the tree with `tools/serve.sh`; each at the driver's default 1280 and again at 380):
```bash
python3 tests/_cdp.py --port 8777 --timeout 1800 --url 'http://localhost:8777/tests/run.html?only=simple%20P3'
python3 tests/_cdp.py --port 8777 --timeout 1800 --width 380 --url 'http://localhost:8777/tests/run.html?only=simple%20P3'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P2.2'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=simple%20P2.2'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=S9%20option%20E'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=S9%20option%20E'
python3 tests/_cdp.py --port 8777 --width 380 --height 800 --url 'http://localhost:8777/tests/run.html?only=2A%20row%2016'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=SU1'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=SU1'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P2.4%20%C2%B7%20T4'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=980%20cog%20T15'
```
`2A row 16` runs the old 2.7 room test and the new guard test together (the guard is phone-only by design). `SU1` covers #4 (the
double tap the guard sits beside), #5 (the wheel in More's sheet) and #15 (the strip Look's scroll-keep touches). `P2.4 · T4` is the
rider set Captions leans on; `980 cog T15` is the reduced-motion swap the morph's test 5 mirrors. Then the full suite at both
widths, then the Full-unchanged lock below. The morph's picture probe (`tools/design/plans/sm3-morph/render-probe.js`, its run
line in its header) is owed too — it needs a POST receiver this tree does not have.

## WHAT THE LOCK RUN (Full unchanged, FU1–FU7) MUST COVER — merged from the four NOTES and the #1171 entry

Shared (Full) files the stack touches: **`js/inspector.js`** (Look: one line in `refresh`, `FM.simpleTools.drawPanel`, false
whenever Simple is not on screen), **`styles.css`** (only `.sm-look…`, `.sm-cap…`, `.sm-fx…`, `#sm-tray[data-row="effects"]`,
`#ed-morph` / `.edm-…` / `#sm-timeline.edm-out` rules), **`index.html`** (busters + one script tag). Simple-owned:
`js/simple-tools.js`, `js/spine-words.js`, `js/spine-edit.js`, `js/editor-mode.js`, the new `js/editor-morph.js`.
- **Full draws exactly as HEAD** at 380 and 1280 — Add menu, layer editor, Effects card, Captions card — with and without a trip to
  Simple that left Look's panel, Edit lines or the effects picker open (the in-suite guards are each feature's "leaves Full alone"
  test; the FU groups are the real proof). The new `#inspector` focusin / scroll listeners (Look, Edit lines) return at once
  outside Simple.
- **A caption track made in Simple** looks and edits in Full exactly like one from Full's Add → Captions: its Captions card, its Aa
  sheet, Detect speech, export burn-in.
- **An effect segment made in Simple** shows in Full as an ordinary adjustment layer with one effect — its row, its Effects card —
  **opened in Full at 380 and at 1280, and exported**. Full's own Add → Adjustment layer is still its seeded Brightness +
  Saturation over the whole project. The editor-switch `onChange` line only nulls Simple's picker / Strength preview.
- **A Simple Look filter** (Noir, Adjust) shows in Full as an ordinary filter container in Effects, and exports.
- **The morph (FU7: Full after a swap is today's Full exactly).** It touches Full only during the 320 ms and only through Web
  Animations, all cancelled by `stop()`: `#timeline-panel` transform (phone only), `#timeline` opacity / visibility, each Full
  `.clip[data-id]` that flies at opacity 0. Its listeners (resize, pagehide, visibilitychange, pointerdown + keydown in capture,
  `FM.timeline.onRebuilt`) are added on the first morph and are no-ops with none on screen — the FU keydown sweep will see one
  keydown listener with no key literals. Run both directions, the hop (Open in Full), reduced motion, and a project opening (a
  quiet apply must never morph). `tools/_fu_gate.py` `SIMPLE_FILES` does not name `js/editor-morph.js` (an instrument change, so a
  release of its own — not done here).
- **The #1171 guard** adds seven capture listeners on `window` (pointer/mouse/touch down and up, click), `passive: false`, that
  return at once unless the event is trusted AND within 450 ms of More / Look / Edit lines opening the sheet in Simple on a phone.
  The lock must see Full's input untouched, and a phone pass should confirm Full's scrolling is unchanged: a non-passive
  `touchstart` on `window` is scroll-blocking in Chrome's eyes even though it returns at once (flagged, not changed — it is the
  guard as written and verified in its scratch copy).
- The guard needs its own Full-unchanged lock (the #1171 entry says so: it is in a Simple-owned file).

## ❓ NEEDS EZRA'S EYES (one list from all four NOTES and #1171; #545: nothing visual new to him ships unseen)

Nothing here has been drawn on a sheet he has seen.

1. **The Look panel** at 380 (sheet) and 1280×800 (band): the two tabs, the strip with None and the tiles, Strength, the six
   Adjust sliders and Reset.
2. **His pick B no longer fits a video clip's tray on a PC.** Look makes it ELEVEN tools (a picture beside a gap goes from ten to
   eleven too); two rows of five in the 306 px band hold ten (`TWO_ROW_MAX`). Options:
   (a) one scrolling row with More and 🗑 pinned — **as built**;
   (b) the design's wider band, DESIGN §8.3 (1) `body.ed-simple { --insp-w: clamp(372px, 26vw, 420px) }` + `TWO_ROW_MAX` 12 —
   **recommended in Look's NOTES for Phase 3 as a whole** (the project row's eventual eight tools need it too), but it narrows the
   timeline and at 900 px wide the PC play bar may not fit (unmeasured);
   (c) one "Move" tool holding Move earlier / Move later (as Audio did for sound) — costs the a11y button route's one-press reach.
3. **Where Look sits in a clip's tray** — after Lift off (5th on a picture, 6th on a video): on a 380 phone it is one swipe in for a
   video clip while the first-run hint says "change its speed or look". Third is one line.
4. **Adjust's set and ranges** (six controls, ±100 = brightness ×0.5–1.5 …) and the word **Warmth**.
5. **The project row is now SIX tools** — Clips · Text · Captions · Sound · Overlay · Effects: ~60 px each at 380, ~51 px each in the
   1280 band (306 / 6, computed, not measured; Captions / Overlay / Effects labels may be cut). DESIGN says the row never scrolls;
   its eight need 2(b).
6. **The Captions list** (Type captions · Find speech · Style) and **the caption track's tray** at 380: six tools, two wide labels
   (*Follows the clips* ~97 px, *Stays with the sound* ~112 px), so it scrolls with the fade at 380 (two rows of three on PC).
   Option: shorter faces *Follows* / *Stays* with the long words as the title.
7. **The Edit lines panel** at 380 and 1280×800: rows of time + words + ✕, "Add a line here", *"Empty · tap to type"*.
8. **Captions' calls**: the Find speech result is a visible `#sm-say` line; the words say *captions*, not *cues*; Find speech with
   nothing selected listens to every clip; Style in the tray is today's panel.
9. **The effects picker** at 380 and 1280×800: Done + ~45 tiles in one long scrolling row, 40×24 live pictures, names cut at 60 px.
   Options: (a) as built; (b) a panel like Look's with categories (needs the phone sheet to rise with nothing selected — a Full-file
   hook — or Effects to select something first).
10. **The segment's tray** (Change effect · Strength · Stay put · More · 🗑) and the Strength row; **Strength = the segment layer's
    opacity**; a new segment is **3 s**; the picker is Simple's own (not Full's effects browser); tiles that need a clip are left out.
11. **The words**: Look's (*"Noir on Clip 2"*, *"Strength 40%"*, *"Brightness +50"*, *"Adjust is back to zero"*), Captions'
    (spine-words Phase 3 · Captions block), Segments' (*"Invert over Clip 2"*, *"Changed to Grayscale"*, *"Deleted the effect"*,
    *"Add a clip first, then an effect over it"*).
12. **The morph itself — never seen.** The probe's four JPEGs (380 and 1280, each way) are owed before it ships. Its open calls,
    each with the build's default: back to Full on a phone a band of background closes as the panel rises (as built; the
    alternative is a real stage-height transition); the hop (Open in Full) morphs too (yes); reduced motion plays nothing
    (nothing, as `980 cog T15`, where §6.3 says a 120 ms crossfade).
13. **#1171, for his next sheet:** when More opens, More itself jumps 134 px up and its old spot becomes *Trim end to playhead* — put
    beside his ❓ "the preview shrinks when More opens (as built)?". The 450 ms guard does not help a deliberate second tap a second
    later.
14. Brand names (Polaroid, Kodachrome, Technicolor) now show in Simple's Look strip — Full's names already; for BEFORE-PUBLISHING.

## Unresolved / decided by the stacker

- **The guard is armed by Look's panel and Edit lines too**, not only More: they open in the same sheet the same way, so a double
  tap on Look or Edit lines had the same hole. One `armSheet()` each in `openLook` / `openLines`; the comment says so. The test
  still covers More only (script clicks are never held, so no Look / Captions test is affected).
- The guard test keeps `{ item: '980' }` as written; its queue item is #1171 (a log line naming `queue 1171` has this as its one
  catching test). Per the entry it is green on v17.47, so prove against an old base can read it DEAD; against v17.50 it should be red.
- Captions' first test: the row and the title now include Effects (exact, not tolerant — the final list is known here).
- `inspector.js` 425 and `editor-morph.js` 2 follow the one-above-every-branch rule literally, though their bytes equal Look's 424 and
  Morph's 1.
- The guard's listeners fire before the morph's capture pointerdown (registered at load): a REAL press on the sheet within 450 ms of
  More / Look / Edit lines opening is stopped before the morph would land. Only matters if a morph is in flight at that moment.
- Not built anywhere in the stack (each branch says so): Look on overlays, **Look for all**, **Ask**, Effects in the clip / overlay /
  text trays (§8.5c item 3), the "runs over the next clip" hint, the 844×390 sideways sheet (Look, Edit lines and More share
  today's dock), a Full-side keyframe edit dropping `inst.sm`, Find speech's scope picker, §3.5's adoption exception, a caption
  block's own line, the morph's sheet-hinge-after-settle, row heads shrinking, the folded-section edge.
