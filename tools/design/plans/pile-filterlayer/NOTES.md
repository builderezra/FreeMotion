# #966 B21 — the Filter layer tile (hunt/pile-filterlayer)

Ported BY HAND from ChatGPT's pile commit **63b2fb08** ("Add neutral Filter layer workflow", pile INVENTORY T01), onto the
v17.50 tree **4af4e420** (hunt/v50-tree). **When this lands, DROP 63b2fb08 from the pile** — nothing of it should be cherry-picked.

Request: #966 idle backlog B21 — *Add > Filter layer: a neutral adjustment layer placed over the frontmost clip at the
playhead, opening the Filters tab.* LAND-LIST §3 Q8: *"Recommended: yes, after you pick its icon from 2-3 drawn options. It
lands in a release with no Simple-mode change."*

⚠️ **Written while a release ship held the machine: NOTHING WAS RUN** — no browser, no node, not even a parse check. The
proof is `scratchpad/agents/pile-filterlayer/prove.sh` (written, not run).

## Twin check

- ssh/main REQUESTS.md / POLISH-LOG.md: "filter layer" appears only once, in the ChatGPT-pile list inside REQUESTS
  ("Colour pack, audio tools, audio effects, Filter layer tile, …"); POLISH-LOG has no hit; nothing shipped it.
- The Add menu on 4af4e420 has **Adjustment** in Add > Elements (and the timeline's "Add adjustment layer"). That is not this:
  Adjustment starts with brightness + saturation, covers the whole video, sits at the Add row and opens nothing. The Filter
  layer starts EMPTY, sits directly over the clip under the playhead for that clip's length, and opens the Filters tab, so the
  next tap is the look. Both stay.

## The C1 check (B21 "needs C1 fixed first")

C1 — *"A filter on an ADJUSTMENT layer renders nothing"* — **shipped in v17.14** (queue 986 partial, POLISH-LOG on ssh/main
line 1530: *"a FILTER ON AN ADJUSTMENT LAYER now grades what is under it (it did nothing, while saying 'Added'), and its
Strength fades it"*). Read in the render path on 4af4e420: renderScene's loop sends an adjustment layer to `applyAdjustment`
(js/compositor.js ~25542); with no explicit list, `applyAdjustment` opens a live filter container through
`applyAdjustmentFilters` → `adjFlatten` / `adjFilterPlate` (~24535-24691). v17.21 added twenty colour effects to the
adjustment path, and #986 C52 the filter-tile preview. So the tile adds a layer that does something. Test 5 below checks it
through the tile's own layer.

## What was ported, and what was changed (read critically)

| Pile 63b2fb08 | Here |
|---|---|
| `FM.addFilterLayer` in js/app.js | kept, rewritten — see below |
| Tile in Add > Elements after Adjustment, icon = a rect with three lines | kept the place; **three drawn icons, his pick** (#545); the pile's icon read as a text document |
| No tint for the tile (BY_LABEL is keyed by label: a miss silently drops the colour) | **'Filter layer': 255, 112, 40** (warm orange) — 81 from Custom shape, 100 from Controller, every other vivid card further (queue 271's 60 rule) |
| Tile in Simple too (the Add menu is shared with Simple's + sheet) | **Full only** — the Elements list adds it only when Simple is not on screen; Simple's tab is exactly as it was |
| Entry in the PC "+" quick menu (#btn-add-layer) | **not ported** — #btn-add-layer is no longer in index.html, so that menu cannot open (dead code) |
| A video counts only when its media is loaded with a size | a video counts unless it is audio-only (the inspector's isAudioOnly rule, plus `layer.audioOnly`) — a video still loading has a picture coming |
| "On screen" = its own visible/start/duration test | `FM.isLayerVisibleAt`, the renderer's own gate — also skips a clip inside a HIDDEN group |
| Inside a group (not editing it): inserted with no parent between the members | **joins the clip's nearest group** directly over it, so the group stays one block on the timeline (a Controller parent is not copied) |
| `FM.addAt` restored to its old number | the Add row stays **between the same two layers**: its index moves down one when the new layer lands above it |
| No clip at the playhead: added at the Add row from the playhead, default length, silently | the same, **plus a toast** saying why it is not over a clip |
| Test tagged 'TBD', history muted, no undo check | six '966 B21' tests (below) |

Unchanged from the pile, and right: frontmost = lowest index in `scene.layers` (index 0 draws on top); the span = the clip's
start and duration; empty effects; selected; one `FM.history.commit()` after everything (one undo step); `openFxTab('filters')`
after the commit (it delegates to `openCategory('filters')` — the inspector refresh that resets the view on a new selection has
already run inside `refreshAll`, so the Filters side sticks). Labels: the tile's name goes in with `textContent` and `title`
(js/addmenu.js card()); the icon is a trusted literal; the toast is a literal — no user text reaches the DOM from this feature.

Busters: js/addmenu.js 83 → 84, js/app.js 480 → 481 (once above 4af4e420; re-bump on whatever tree it merges into).

## The three icons (#545 — he has not seen them; nothing ships before his pick)

Drawn in the Elements tab's own grammar — `ico()`: 24-unit viewBox, stroke 1.8, round caps and joins, currentColor (read off
Adjustment, Controller, New group and Camera). Files at 96 px in the tile's orange: `icon-a.svg`, `icon-b.svg`, `icon-c.svg`.

- **A — three overlapping circles** (RECOMMENDED): the colour-mixing mark phone photo apps use for "Filters"; nothing else on
  the tab is three of anything, and it does not repeat Adjustment's single circle.
- **B — a pane of tinted glass**: a rounded frame, half of it hatched — "something laid over the picture". Risk: diagonal
  hatching echoes the Shape tab's stripes.
- **C — a lens filter**: a ring inside a ring with a glint, the screw-on filter. Risk: next to Adjustment (a circle with a
  line) the two read as the same family at 24 px.

His pick is ONE LETTER: `FILTER_LAYER_ICON` in js/addmenu.js (A is wired). `render-probe.js` here draws all three at 96 px and
at 24 px as the tile between its phone neighbours (Adjustment | Filter layer | New group), read from the live sheet:
`tools/shot.py --js-file tools/design/plans/pile-filterlayer/render-probe.js` at **--width 380** with a receiver
(window.__recv), → `filterlayer-icons.jpg`, `filterlayer-phone.jpg`.

## The phone layout at 380 (read from the code, NOT measured)

The + sheet draws Elements nine to a page (`COLS = 3`, `perPage = 9` for a sheet, js/addmenu.js drawBody; the PC panel's
planner js/tilefit.js is gated to ≥701 px). The Filter layer is the **tenth** tile, so in Full the phone's Elements tab becomes
**two pages with dots**: page 1 the nine add-a-layer tiles (Filter layer beside Adjustment, New group after it), page 2
Custom elements alone — a one-card page is drawn across the page (`.addmenu-grid--cols2`, the odd card spans both columns).
The dots row takes its 15 px from the pager, so page 1's three rows are each ~5 px shorter (the queue 208 / 275 rules still
hold by reading: rows `minmax(clamp(50px, 8.5vh, 64px), 1fr)`, ratio stays under 1.7). Simple keeps nine on one page.
PC: at his 1440x900 window the panel fitted nine as 5 x 2 (test 963) — ten fit the same 5 x 2, so still one page; narrower
panels may page one band sooner than before (the planner, not a fixed number, decides).

## Tests ('966 B21 …', appended to tests/tests.js; ALL need Chrome — none can run in the node harnesses)

Each calls `needB21()` first, so on 4af4e420 every one fails with *"FM.addFilterLayer is missing - there is no Filter layer
to add (Add > Elements > Filter layer, #966 B21)"* — never a TypeError.

1. Add > Elements has the tile right after Adjustment in Full (PC panel and phone sheet, rendered off screen), with a tint
   ≥60 from every vivid Elements colour and the PICKED icon (`FM.addMenu.filterLayerIcon()`); and in **Simple** (put on screen
   inside `smView` with `FM.editor.apply`, no memory written) the Elements tab is exactly Full's minus the Filter layer.
2. A TAP on the tile (the real card, off-screen host) over [title, hidden clip, song, front 2–5 s, back 0–9 s] at 3 s: one
   empty adjustment layer directly over "front" (past the title, the hidden clip and the audio-only song), 2 s for 3 s,
   named Filter layer, no parent, selected, the Filters side open; Add row 5 → 6; exactly one history step; one Undo → the
   five layers as they were.
3. Fallback: [title, clip 0–2 s, hidden clip] at 5 s → at the Add row (1), from 5 s, default length, selected, Filters
   open, the Add row unmoved, and a toast "No clip at the playhead…" (FM.toast stubbed, its descriptor put back).
4. A clip in a group: [group, member 1, member 2, below] → the layer lands between the group row and member 1 WITH
   parent = the group, every row of the block in the group (the pile's version fails here: no parent).
5. C1 through the tile's layer: a red image clip (a canvas, as the Fill Behind tests feed one) under the Filter layer —
   CONTROL bare render is red; library **Silver** (fitted with fxRegistry.fitToLayer) greys it (channels within 12, red
   down >60); the same filter `enabled = false` leaves the clip within 2 of bare.
6. At 380 (atPhoneWidth): the real + sheet's Elements tab in Full — the Filter layer on page 1 right after Adjustment, every
   page-1 tile inside the pager and no sliver under 0.6:1, no vertical scroll in the body, one dot per page, the dots inside
   the body, and "Filter layer" uncut.

Bounds were REASONED, not measured (12 / 60 / 2 in test 5; 0.6 in test 6). Widen from a measurement, never by guess.

Existing tests this touches, by reading (prove.sh runs them on both trees): 963 "the nine Elements on ONE page" at 1440
(10 still fit 5 x 2 — but its title and messages say "nine"), 963 at 420 (rows to spare), 963 chips (no new widest word),
queue 271 palette (the tint clears 60), addsheet-fill (page 1 still fills; it reads the first grid), the Add sheet's
equal-height tabs, 981's SAFE cards (positions moved but all still on page 1).

## Questions for Ezra

1. **The icon**: A (recommended), B or C — from `filterlayer-icons.jpg`.
2. **The phone layout** (`filterlayer-phone.jpg`): (1) as built — Elements pages, Custom elements alone on page 2;
   (2) Filter layer last — today's page 1 untouched, the Filter layer alone on page 2; (3) four columns — all ten on one
   page, narrower tiles (one CSS rule, a visual change to every Elements tile). Recommended: **(1)** — no CSS change, and
   the two grading tiles sit together; but it is his phone, so it is his call.
3. The colour (warm orange) is the builder's — the sheet shows it; say if another reads better.

## Merge notes

- Base 4af4e420 (v17.50 tree). Re-bump `js/addmenu.js` and `js/app.js` `?v=` on the tree it merges into (other branches
  may have taken 84 / 481).
- tests.js: an append block between `// ── end 966 B48 ──` and the final `})();`, bracketed `// ── 966 B21 …` /
  `// ── end 966 B21 ──` — rebuild by blocks, never a union merge.
- js/app.js: one new function after `FM.addAdjustmentLayer`; js/addmenu.js: a block before `var TABS`, one splice in the
  Elements `options()`, one BY_LABEL key, two exports on `FM.addMenu`.
- POLISH-LOG / REQUESTS / version label are NOT touched here (the release does that). The release line must say the icon he
  picked and must NOT mention a Simple change. A `queue 966` claim needs the B21 tests named.
- Drop pile commit 63b2fb08.
