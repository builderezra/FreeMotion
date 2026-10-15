# Simple Phase 3 · Clips › Extras — shapes, saved elements and templates from Simple (queue 980, refers to #545)

Branch `hunt/sm3-extras`, built ON `ssh/hunt/sm3-next` (566bc3db: the sm3 stack — Look, Captions, Effect segments, the morph, the #1171
guard, the picture-sheet tooling — plus tray effects for titles and overlays and the "runs over the next clip" hint).
**Nothing was run** — no browser, no server, no python, no test: a release ship was running on this machine. The only program run
besides git / grep / sed / tr / od was `node --check` (a parse check). Every line here is from reading; the suite has not seen any of it,
and every test below is owed its first run.

## The decision it rests on: D21 is ANSWERED

DESIGN §17, the D21 row: *"Can you add shapes, saved elements and templates inside Simple?"* — options **A. Yes, under Clips › Extras, and
what you drop in stays editable piece by piece (recommended)** · B. Only in Full, with one line in the Clips tool — his answer column:
**"A, decided. *"D21 A"*"**. His answers of 1 Oct, verbatim from §17: *"My picks for the simple editor: D1 A, D2 ?, D3 A, D4 A, D5 A, D6 A,
D7 A, D8 A, D9 A, D10 A, D11 B, D12 A, D13 A, D14 A, D15 A, D16 A, D17 B, D18 ?, D19 A, D20 A, D21 A …"*. §15's Phase 3 row lists
"answered: D11 B (Morph), D12 A, D20 A (panels in the band), D21 A; open: D3 (re-asked), which only decides the Create picker item".

The other answers this part leans on, each quoted from §17:
- **D14 (first half), A** — *"D14 A"*: looks, text, captions and sound work with a friend in. So Add shape and Add element (which move
  nothing that exists) are not arranging and work live; Add template with clips ripples, so it is arranging and waits like Insert.
- **D20, A** — *"D20 A"*: "On a computer, where a tool's panel opens: A. Inside the left band, scrolling". Extras on a PC is in the band.
- **D5, A** — *"D5 A"*: deleting a clip takes what is on it. That is why the moves-together anchor matters: without it, deleting the clip
  a lower third's words start on deleted the words and left the bar.
- **D17, B** — *"D17 B"*: music runs on, never fitted. A template's song is put in whole with Stay put, never trimmed.
- **D16, A** — the icon set. No new icon is drawn here: the Clips tool keeps its D16 icon, Extras uses the Add menu's own tab icons and
  tiles, and the element tile fallback is Full's own Custom elements mark.

Nothing Extras needs is an open decision. (D3 decides only the Create picker, which is not built here.)

## What was built

**The commands** (`js/spine-edit.js`, block `PHASE 3 · CLIPS › EXTRAS` at the very end; each ONE runner step, `ed: 's'`):
- `FM.spine.cmd.addShape(kind, opts, t)` → plan `planAddShape`, label **Add shape**. The Shape tab's shape, made exactly as Full's
  `FM.addShapeLayer` makes it (min(W,H)/3 × the shape's aspect, its name and extras), at the playhead **clamped to the track end** (§3.6 Add
  row) and in the **overlay band** (§3.6.1: above the top-most non-text layer it overlaps, else under every text it overlaps). Not
  arranging, not adopting. Selected afterwards (its overlay tray shows). Live line *"Shape added"*.
- `FM.spine.cmd.addElement(eid)` → `planAddElement`, label **Add element**. §12.2: never splices. The pack is read before the runner
  (`FM.spine.readPack`): FM.storage's own re-id + sanitiser gate (`FM.storage._reIdLayers`), each file decoded once (for its size and then
  for playback). Its **camera is always left out** (and a parent link to it); every layer goes through the new **pack copy route**
  (`FM.spine.onCopy(layers, 'pack', {element: true})`: strips `sm.main`, `sm.tail`/`tailEnd`, `sm.muteByMode` keeping `muted`, `trIn`,
  `pick`, `by`, and `sm.stay`); a moves-together group saved inside it loses its `sm.unit` (the element becomes ONE piece). It lands at the
  playhead **held inside the video** (the whole element's start by §3.6's clamp; a layer that would run past the last clip is cut there, a
  video through the trim maths), in ONE piece in its own stacking order at the band of its highest visual layer. **Two or more visual
  layers are wrapped in a group carrying `sm.unit`** — a plain, closed, identity-transform group named after the element (Full sees an
  ordinary group). Its files go live with it (the record plays from the pack's key, as FM.storage's hydrate does; a file this device could
  not decode is still stored with `FM.storage.writeMedia`), and the runner saves at once (`plan.mints`). The top visual layer is selected.
  Live line *"“Lower third” added"*; with a camera left out the row says *"… · its camera move was left out (Open in Full to use it)"*.
- `FM.spine.cmd.addTemplate(tid)` → `planAddTemplate`, label **Add template**. §12.2 step 1: the template is **classified by itself**
  before anything is stripped (so an adopted template's stored `sm.main` counts), from the sizes of its own files (new `o.media` lookup in
  `FM.spine.classify`); a see-through full-frame picture (non-normal, non-mask blend, or static opacity < 1) is never a clip. Its clips are
  **spliced at the cut nearest the playhead** with Insert's own machinery (`ripple` with the landing at the template's end, `tailMove`,
  `riderPlan` for captions/camera/loop, `couplingBlock`, the blend-seam refusal *"Clips N and N+1 fade into each other · pick another
  cut"*); the first template clip lands bit-exact on the cut; `sm.main` is written back on exactly those clips (and Mute clip sound applies).
  Every other layer keeps its offset to them; its **music** (a sound with no clip to follow in the template) gets `sm.stay`; a caption
  track stays a caption track; **top-level layers that start together and lie side by side in its stack are wrapped in `sm.unit`**; the
  camera is left out. The whole template goes in as one piece just above the clip before the cut (its own stacking kept); into an empty
  project, Phase 2's first-clips placement. A template with no clips is put at the playhead the way an element is (not arranging).
  Arranging (gated, adopting) only with clips. Line *"“Promo” added · 2 clips in the row"*.
- `readPack` lets go of decoded files nothing used after 30 s (a refused pick; a line's retry lives 10 s); a re-run (Do it anyway, Keep on
  the music) rebuilds from the same pack (`pk.json`), and refuses with the runner's *"That didn't work"* if its files were let go.

**The sm.unit fix for editing an inserted element** (`js/spine.js`, classify section **6c**, DESIGN §2.5 / §4.1): a group carrying
`sm.unit` was already "not a block" (each member its own item, kind and tray) but nothing made its members move together. Now every member
without `sm.main`/`sm.stay` (not a caption track, twin, card member or tail item) takes the host of the group's **anchor** — its member on
the clip row, else its earliest-starting member with no `sm.stay` (ties: higher in the stack) — through the link path, before its own start
rule and before "long things stay", and is marked `linked: 'unit'` (so it is never pinned). Worked out every read, never stored: delete the
anchor and the next one leads; Stay put on one member takes only that one out. `R.movesWith(id)` names the anchor for the tray.
`refitTransparentGroups` (js/spine-edit.js) now removes an `sm.unit` wrapper whose last member an arranging step removed (a one-line hook).

**The UI** (`js/simple-tools.js`, block `PHASE 3 · CLIPS › EXTRAS`):
- **Clips opens a short list** (like Sound's and Captions'): **Add clips** — exactly what Clips did (the picker, or *At the end / After
  Clip N* with the playhead inside the clips) — and **Extras**. The Clips tool's title is *"Add clips, or shapes, elements and templates"*
  and it shows pressed while Extras is up (PC).
- **Extras is the Add menu itself** (`FM.addMenu.render` with the new opt-in `tabs`): only **Elements · Shape · Template**. Elements =
  his saved elements as tiles with their own pictures (Full keeps them behind its Custom elements browser), or an empty panel that says
  what an element is and how to make one; Shape = the Shape tab's own tiles in its order; Template = his templates (or Full's own empty
  panel). Every tap runs Simple's command above, never Full's add.
  - **Phone:** the Add sheet he knows (`FM.mobile.openAdd()`, then the three tabs drawn into `#add-grid`); a pick, the grab bar, a swipe or
    a tap outside closes it; leaving Simple closes it.
  - **PC:** drawn straight into the left band's `#inspector`, where Full's Add menu sits, measured against `#inspector` (new opt-in
    `host`); the band's title row says **Extras**; **Done** is in the tray row with *"Shapes, saved elements and templates"* (the effects
    pickers' pattern) — so the ~96 px over the tray at 1280×800 are all the menu's.
  - It needs nothing selected (a selection is let go first); it closes on a pick, Done, any selection, the project row's Effects picker,
    or leaving Simple. Its open tab and pages are its own; Full's Add menu reopens on the tab Full left it on.
- **"Moves with the shape"**: a selected member of a moves-together group says what it moves with — a quiet tag first in a one-row tray
  strip (`.sm-with`), in Stay put's title and accessible name (*"Stay put · Moves with the shape"*), and on a PC two-row tray in the band
  words (*"Moves with the shape · Its tools are below"*). The anchor is named the way every line names an item (`itemWord`).
- `FM.simpleTools.openExtras()` / `closeExtras()` / `extrasOpen()`; openExtras does nothing in Full.

**Words** (`js/spine-words.js`): lines `shapeAdded`, `elementAdded`, `templateAdded`, `packCamera`, `packMissing`, `packEmpty`, `shapeGone`,
`movesWith`; tools `clipsTitle`, `addClips`, `extras`, `extrasTitle`, `extrasNoElements`, `extrasElement`, `extrasElementsHow`.

**CSS** (`styles.css`, one block at the very end): `.sm-with` only. Extras itself is the Add menu with its own CSS.

**Busters** (`index.html`, +1 over sm3-next): styles.css 772→**773**, js/spine-words.js 17→**18**, js/spine.js 7→**8**, js/spine-edit.js
16→**17**, js/addmenu.js 83→**84**, js/simple-tools.js 14→**15**. If main or another Phase 3 branch moves past these before landing: take
the higher line, then one above it.

## Full files touched — every line, for the lock run

**`js/addmenu.js` only** (storage.js, mobile.js, inspector.js, elements-browser.js and app.js are untouched). All opt-in; called without
`tabs` / `host`, `tabs` IS `TABS` and the memory functions ARE `rememberTab` / `rememberPage` / `rememberedPage`.
- **L81–84** `shp()`: the returned function carries `f.shape` / `f.shapeOpts` (read-only facts); what a tap runs is unchanged.
- **L602–604** the template tile object gains `templateId: t.id` (card() never reads it; the comment above it is new).
- **L630** `var _ownTab = null, _ownPage = {};` (an Extras menu's own tab/page memory).
- **L992–1011** in `render`: `opts.tabs` → the `tabs` list (filtered/ordered TABS, a `{key, options}` entry overrides that tab's list), and
  `ownTab` / `remTab` / `remPage` / `remdPage` choosing own memory or Full's.
- **L1033–1035** `active` (own → `_ownTab` or the first tab; Full → today's `_startTab || knownTab(memGet().tab) || TABS[0].key`),
  `if (!own) _startTab = null;`, `remTab(active)`.
- **L1039** `host = fitOn ? (opts.host || closest('.panel')) : null` (same as before without `opts.host`).
- **L1066** `tabsSettled`: `tabs[0]` for `TABS[0]`.
- **L1103** `drawBody`: `tabs.filter(…)[0] || tabs[0]` for `TABS…`.
- **L1354, L1416, L1449** page memory through `remdPage` / `remPage`.
- **L1478, L1485** the tab buttons from `tabs`, and `remTab(active)` on a tap.

**What the lock (FU1–FU7) must show for these:** Full's Add menu on the phone sheet and in the PC band, every tab, is pixel- and
layout-identical to HEAD; it reopens on the remembered tab (`fm.addmenu`) and page exactly as HEAD, including after Simple's Extras was
used and left on another tab; the 1–5 keys (`FM.addMenu.openTab`) jump as HEAD; a Shape tile adds Full's shape (random fill, at FM.time,
full default length, one commit, selected); a Template tile calls `FM.templates.insertInto` and toasts as HEAD; Custom elements opens the
Elements browser and its insert is Full's; Demo mode redraws as HEAD; the PC fit's `data-am-fit` and rung are HEAD's at 1280×800, 1440×900
and a short band. FU2's "a template insert" and "an element insert" steps run Full's own paths — untouched.

Simple-owned files (already Simple files in the lock's eyes — check `tools/_fu_gate.py SIMPLE_FILES` lists them): js/spine.js,
js/spine-edit.js, js/spine-words.js, js/simple-tools.js; plus styles.css (`.sm-with`, made only by simple-tools) and index.html (busters).
Also for the lock: **what a Simple insert leaves in the document, seen in Full** — an element/template wrapper is an ordinary closed group
named after the element (Full can open, edit, ungroup it; Ungroup drops `sm.unit` with the group); a Simple-added shape is an ordinary
shape; inserted clips carry `srcW/srcH/srcRev` (I2's plain fields); a template's clips carry `sm.main`; nothing else new.

## Departures from the design (each a call made while building; his to overrule)

1. **Extras' Elements tab is his saved elements only**, as tiles. §8.5 says "reusing addmenu's Elements … tab contents"; Full's Elements tab
   is Text · Captions · Sketching · Custom shape · Camera · Controller · Adjustment · New group · Custom elements. Text and Captions have
   their own project tools (his #310: one home per control), the rest are Full's rig pieces, and the design names "saved elements". Full's
   tab is reused for its name, icon, colours and layout; the list is his elements.
2. **No search** over saved elements (Full's Custom elements browser has one). Many elements page sideways.
3. **Clips is a list now** — Add clips is one tap further. §8.5 has Clips open "Add clips · recent media · Extras"; recent media is not built.
4. **PC: Done is in the tray row and the band's title row says Extras** (no header row of its own) — the band above the tray is ~96 px at
   1280×800, and a header would have left the menu ~58 px.
5. **Phone: Extras is Full's Add sheet**, whose title still reads "Add" (it is Full's DOM; changing it would be a Full change). It rises to
   the bottom of the picture and covers the Simple timeline while open, as Full's does.
6. **An element is held inside the video** (§3.6 Add row's clamp, extended to elements): the whole element moves earlier only when its start
   would fall in the last frame; a layer running past the last clip is cut there. The design says only "placed by the bands at the playhead".
7. **A template goes in as ONE piece just above the clip before the cut**, its own stacking kept, rather than each unit by its own §3.6.1
   band. So a template title sits under a long host title that spans the cut (the band rule would put it above). Simpler and never lifts a
   template background over its clips.
8. **Same-start wrapping in a template only for layers side by side in its stack** — wrapping across one of its clips would re-stack a layer.
9. **The pack's files are decoded and registered by Simple's own code** (FM.media.set + fileKey + repaint wiring; writeMedia for a file that
   did not decode), a few lines that mirror FM.storage's private `hydratePack`, so storage.js (a Full file) is not touched. It uses
   `FM.storage._reIdLayers`, exported "for the suite": it is the one re-id + sanitiser gate, and a second copy would drift.
10. **A template layer with no file and no size** reads as undecided (so never a clip), not "missing" — the classifier's existing rule.
11. **The anchor applies before "long things stay"** (DESIGN §4.1's order), but not to a tail item, a card member, a caption track or a twin.
12. **An emptied sm.unit wrapper is removed** by the arranging step that emptied it (refit hook). Full's own Delete of the last member (the
   tray's 🗑 on a non-clip calls Full's `FM.deleteLayer`) still leaves an empty group, as Full does with any group.

## ❓ NEEDS EZRA'S EYES (#545: nothing visual new ships unseen; none of this has been drawn on a sheet)

1. **Clips as a list** — "Add clips · Extras" above the Clips tool, at 380 and 1280×800. (Options: (a) as built; (b) Extras as a third button
   on the "Add clips" line — not possible with the line's two-button rule when the playhead is outside the clips.)
2. **Extras on a phone** — the Add sheet with three tabs (title still "Add"), his element tiles, the Shape grid, his templates, and the empty
   Elements panel's words.
3. **Extras on a PC** — the band at 1280×800 gives the menu ~96 px: expect icon-only tabs and one row of small tiles. Options: (a) as
   built, recommended only if it reads; (b) the band grows while Extras is open; (c) a sheet over the timeline, as on the phone (§8.3's
   sideways rule).
4. **"Moves with the shape"** — the tag first in a title's tray strip at 380 (it pushes Edit words right by ~110 px), Stay put's name, and
   the PC band words. Options: (a) as built; (b) words only (no tag); (c) the tag after the tools.
5. **Words**: *"Shape added"*, *"“Lower third” added"*, *"“Promo” added · 2 clips in the row"*, *"its camera move was left out (Open in Full
   to use it)"*, *"That one’s data is missing · save it again from a project"*, *"There’s nothing in that one to add"*, *"Add clips, or
   shapes, elements and templates"*, *"Shapes, saved elements and templates"*, *"No elements yet"* + *"An element is a piece you build once
   and drop into any video — a title, a logo, a lower third. To make one, open Full, select its layers and choose ⋯ › Save selection as
   element."*
6. **Where an element and a template land in the stack** (one piece at the band of the element's top layer; the template above the clip
   before the cut) — a picture of a lower third over a clip with a title, and a template's title over its clip.

## Tests (tests/tests.js, before the final `})();`, `{ item: '980' }`, block `simple P3 · Extras`)

The library is stubbed (FM.elements / FM.templates `list` and `getPack`, put back in a finally), so no test writes IndexedDB. Helpers are
all `smX…` (no clash). New (7). **On the base (sm3-next, 566bc3db) each fails by its own sentence, never a TypeError:**

1. `… at 380 Clips opens a short list — Add clips and Extras — and Extras raises the Add sheet with only Elements, Shape and Template …`
   (at 380). Base: `smXOpen` throws *"Clips opened no list with Extras in it (the row says “Add clips…”)"* — the base's Clips, with the
   playhead set inside the clips first (so no file picker opens), says its Add clips line. Checks: three tabs; his two elements by name,
   a name with markup put in as text (no element made, nothing run); no Camera/Controller/New group/Custom elements/Text/Captions; the
   Shape tiles are Full's, in Full's order; the template; nothing written; **CONTROL: Full's remembered tab (`fm.addmenu` = audio) is
   unchanged**; Add clips still offers *At the end* and *After Clip 1*.
2. `… at 380 a Star from the Shape tab is ONE shape at the playhead in ONE step labelled Add shape …` (at 380). Base: the smXOpen sentence.
   Checks Full's size rule, the playhead, the clamp at the end (5 s → 1 s), z between the title and Clip 2, one step, sheet down, selected
   with the overlay tray, Undo's label and removal.
3. `… at 380 a saved lower third … lands in ONE step labelled Add element as ONE moves-together group …` (at 380). Base: the smXOpen
   sentence. Checks the sm.unit wrapper named after the element, `sm.main`/`sm.stay`/`by`/`pick` stripped, 4.8 / 5.1, both on Clip 2;
   **CONTROL: the same document without sm.unit puts the words on Clip 3**; Edit words on the words, the overlay tools on the bar, the
   *"Moves with the shape"* tag and Stay put's name; Undo/Redo; Move earlier of their clip moves both by −2; deleting the clip the words
   start on keeps both (without the anchor it deleted the words: D5).
4. `… at 1280×800 Clips › Extras opens inside the left band above the tray, titled Extras … a template’s two clips go into the clip row …`
   (at 1280×800). Base: the smXOpen sentence. **CONTROL (passes on the base): the template alone reads as two clips.** Checks the band, the
   title row, Done in the tray, the tile pressable inside the band, Done closes, then A·P1·P2·B with 3/5/7, `sm.main` on P1/P2, the title
   on P1 at 3.2, title + subtitle in one sm.unit group each its own text, the song at 3 with Stay put and in no group, P1's own picture,
   one step labelled Add template, Extras closed, Undo.
5. `… leaves Full’s Add menu alone …` (at 380) — **the Full-unchanged control**. Base: its CONTROL (Simple's Extras shows three tabs) throws
   the smXOpen sentence. Then in Full: the sheet opens on Audio (the remembered tab) with five tabs; Elements still has Camera, Controller,
   Custom elements and Text; a Star adds Full's own shape (at the playhead, full default length, one step, no `sm`, no parent); a Template
   tile calls Full's own `insertInto` (stubbed to record).
6. `… an sm.unit group moves as one …` (pure, no project). Base: **CONTROL passes** (in a plain group the bar and the dot ride A, the words
   B), then *"in an sm.unit group the words ride B, not the bar’s clip A: its members do not move together"*. Also: kinds kept, the group is
   no item; Stay put on the words takes only them out; with the bar gone the dot leads and the words follow it; the pack route for an
   element and a template; **CONTROL: the duplicate route is byte-for-byte what it was**.
7. `… a saved element is never a clip and never brings its camera …` (default width, the PC band). Base: the smXOpen sentence (after its
   **CONTROL — the picture alone is a clip —** which passes). Checks no camera added, no `sm.main`, the clip row and the video's length
   unchanged, held inside the video (5.5 + 0.5), its own picture, no group for one picture, one step, the camera line.

Changed (owed a run too):
- `simple P2.2 · review Clips › After a card and Into row after a card …` — after tapping Clips it taps the list's **Add clips** if there is
  one (tolerant: on the base there is none and it reads the line as before).
- Read and unchanged: `smTrayCheck` and the More-in-reach CONTROL (the project row gains no tool — Extras is inside Clips), the WCAG name
  test (Clips' name *"Add clips, or shapes, elements and templates"* contains its face), the Captions project-row test (ids unchanged),
  the T20 brand scan (no brand in the new words).

## First run (serve the tree with `tools/serve.sh`)

```bash
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=simple%20P3%20%C2%B7%20Extras'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P3%20%C2%B7%20Extras'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=After%20a%20card'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P1'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P2'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=simple%20P2'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P3'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=queue%2051'
```
(the last: Full's Add menu memory tests — find their exact titles by `grep -n "queue 51" tests/tests.js`; also every test that renders
`FM.addMenu` — `grep -n "addMenu.render\|addmenu-tab" tests/tests.js`). Then sm3-next's own first-run list, the full suite at both
widths, and the lock run above. Things to look at first if a test goes red: the PC fit inside a ~96 px band (test 4's tile pressable
check), `#inspector-panel:has(.addmenu--panel)`'s flex rules with `#sm-bar` in the band, and `FM.mobile.openAdd` + the re-render.

## What was skipped, and why

- **Recent media** in the Clips list (§8.5 "Add clips · recent media · Extras") — not part of Extras; its own piece.
- **"Into Full"** (§12.2): `onCopy(units, 'pack')` on Full's own `templates.insertInto` / `elements.insert` — a storage.js (Full-file)
  change, I4 plumbing, not needed by Extras. The route exists now; wiring it into Full is its own item, gated by the lock.
- **Template-fill Replace while Simple is on screen** (B28) and **the Create picker** (D3 open) — later in §15's order.
- **Ask** (D12 A) — §8.5a, a whole feature in Full files (ai-ops / ai-chat / ai-manifest).
- **Search over saved elements** in Extras, and deleting an element from Extras (Full's browser and Home do both).
- **A sheet title "Extras" on the phone** (Full's DOM).
- Not changed: Full's own Delete of the last member of a wrapper leaves an empty group (as any Full group).

## Checks done here (the only ones possible)

- `node --check`: OK for js/spine.js, js/spine-edit.js, js/spine-words.js, js/simple-tools.js, js/addmenu.js, tests/tests.js.
- CR bytes 0 and no conflict markers in every changed file.
- No duplicate 2-space top-level `const` / `let` / `function` name in any changed app file; the new tests.js helpers are all `smX…`, none
  repeated. No double quote in a new test title. No `//` comment appended to a line whose statement continues on the next line.
