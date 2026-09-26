# #963 — PC: the Add menu and the layer inspector shrink as ONE system

Plan for the builder chat. Everything here was measured in the real app through `tools/shot.py` (each number says how), or run
on the real planner code. Nothing in the repo was edited. Code to paste is in `code/` beside this file; images in `shots/`.

**For the builder, in one paragraph.** Both panels get planned by ONE new file, `js/tilefit.js` (the Add menu's existing
solver moved out of `js/addmenu.js` unchanged, plus two smaller tile shapes and a ladder between them). The inspector stops
doing arithmetic on `--tl-h` and asks the same planner for its grid (so a short band gets 4×2 squarer tiles instead of three
rows of flat bars with 12px icons); the Add menu stops falling off a cliff below 54px tiles, drops its tab names (64 → 32px)
only when its tiles would otherwise lose theirs, and tries the whole box before reserving a pager row (so nine Elements fit
one page at 1440×900). One `[data-rung]` CSS block draws both panels' tiles. Paste order: `code/hunks.md` H1–H15 (incl.
H5b) — or run `code/apply963.py`, which applies exactly those blocks; `code/tilefit.js` is H2, `code/tilefit.css` is H13, `code/tests-963.js` goes at the end of `tests/tests.js`. Wait for his
letter (§9) — it only changes three constants at the top of `js/tilefit.js` (table in §5; `apply963.py --option X`).

**Re-checked by the reviewer against v17.05 (acae12a5, 26 Sep, clean tree):** `code/apply963.py` applies cleanly to a copy of
HEAD for all three options (every anchor found exactly once), the patched `js/tilefit.js`, `js/addmenu.js`,
`js/inspector.js` and `tests/tests.js` all parse (JavaScriptCore), no code outside the moved span still names `planGrid` /
`FIT_CFG` / `FIT_GAP` / `FS_MIN` / `FIT_VARS` / `--am-*`, and nothing v17.04–v17.05 changed touches these panels (their only
styles.css / index.html changes are elsewhere). The busters it writes at HEAD: `styles.css?v=728`, `addmenu.js?v=81`,
`inspector.js?v=393`, new `tilefit.js?v=1`. The suite was NOT re-run on v17.05 (the builder was shipping).

This folder belongs at `tools/design/plans/2026-09-26-panels/` (REQUESTS.md #963 is still ⏳ PLAN PENDING and waits for the
logging chat's follow-up block linking this path — add that block when copying the folder in). Copy `plan.md`,
`code/` and `shots/` (3.7 MB) — the hunks refer to `code/…` and the images to `shots/…`. `raw/` (every frame), `tmp/` (logs,
the JavaScriptCore sweeps) and the probe scripts at the top level are the evidence behind the numbers; they need not go in
the repo.

---

## 1. His words, and his clauses (verbatim — REQUESTS.md #963)

> "When you shrink the add layer or like the layer inspect layer inspector on PC, it should just lose the text when it gets too
> small. Because it just looks really bunched up when it gets really small. Or just make or just figure out a way for it to
> shrink and still look good when it's small. And have the text and the picture and just so it's dynamic in a way that
> actually looks really good. Because right now, the dynamics of the add layer and the inspector layer are both very
> different. from each other and honestly they both are shit in their own ways and they're also both good in their own ways
> so just maybe have a big look through that"

1. On PC, shrinking the Add menu or the layer inspector looks bunched up.
2. Either lose the text when too small,
3. or find a way to shrink that still looks good, keeping text + picture, dynamic in a way that looks really good.
4. The two currently behave very differently — each bad in its own ways, good in its own ways.
5. Have a big look: one considered design for both.
6. (#545, standing) options rendered for him to pick.

**Clause → where the plan answers it:** 1 (bunched) → §3c D1/D2/D6/D7 measured, fixed by the shared planner (§5); 2 (lose the
text) → the `icon` rung, options A and C; 3 (shrink and still look good, text + picture) → the `row` chip rung (C) and the
inspector's 4×2 squarer tiles (all options); 4 (they behave differently) → one planner + one `[data-rung]` CSS block for both
(§5, test "one planner for both panels"); 5 (big look) → §3 (six windows, five bands, both panels) and §4; 6 (options to pick)
→ `shots/` and the ❓ASK in §9.

## 2. What exists now (drawn on v17.03 + the then-uncommitted v17.04; every line number below re-checked on v17.05 — they drift, anchors don't)

**One box, two contents.** The Add menu and the inspector are the same element, drawn one at a time:

- `index.html:481` `<aside id="inspector-panel" class="panel">` → `:485` `<div id="am-resizer" …>` (the float handle) →
  `:492` `<div class="panel-title">…` (33px; 40px while the clip keys show) → `:495` `<div id="key-rail" class="hidden" …>` →
  `:500` `<div id="inspector">` (the scroller; the grid or the Add menu is rendered into it).
- **How it gets smaller on PC** — three inputs, measured below:
  - width: `styles.css:6131` `--insp-w: clamp(300px, 24vw, 400px);` → 300px at any window ≤1250 wide, 345.6 at 1440, 400 at ≥1667;
  - height (the one he drags): the band row, `styles.css:6141` `grid-template-rows: minmax(0, 1fr) var(--tl-h, max(150px, min(232px, 46vh)));`,
    defaults `:2396` `--tl-h: clamp(232px, 30vh, 300px)` (≥1100 wide) and `:2401` `clamp(300px, 33vh, 460px)` (≥1600), dragged
    by `#tl-resizer` and clamped by `js/app.js:6315` `return Math.max(150, Math.min(ceil, h));` — so **150px is the floor**;
  - height while floated over the canvas: `body.am-floating #inspector-panel { position: fixed; … height: var(--am-h, 264px) }`
    (`styles.css` ~8858), clamped by `FM.clampAddMenuH` (`js/app.js:6482`).

**The Add menu** (`js/addmenu.js`) — a real solver sized from the panel's own box (queue 50):
- `:734` `lbl: { minW: 44, maxW: 118, minH: 40, maxH: 118, padV: 7, padH: 4, padVMin: 2, padHMin: 2, aspect: 1.45, icoGap: 5, icoMin: 19, icoMax: 46, lines: 2 },`
- `:739` `ico: { minW: 46, maxW: 110, minH: 44, maxH: 110, … icoMin: 40, icoMax: 58, lines: 0 },` (the Shape tab)
- `:767` `function fitArt(cfg, w, h)`, `:814` `function planGrid(count, availW, availH, cfg)`,
  `:817` `var hMin = Math.max(cfg.minH, cfg.padVMin * 2 + cfg.icoMin + cfg.band);` → **54px: the only tile shape it knows is
  icon-over-two-lines, and it cannot draw one shorter than that.**
- `:1338–1351` the plan is made against the box minus the pager row first: `box = fitBox(FIT_DOTS);` …
  `:1341` `if (plan && plan.pages === 1) {` — the whole box is only tried when the reduced box ALREADY fitted on one page.
- `:1163` `applyPlan` writes `--am-cols/-cw/-row/-ico/-fs/-lblh/-pad/-icogap/-gap/-pager`; CSS `styles.css:5613–5660`
  (`.addmenu--fit …`). When there is no plan the Studio fallback is `styles.css:6233` `body .addmenu--panel:not(.addmenu--fit) .addmenu-body { max-height: 128px; overflow-y: auto; }`.
- The tab row: `styles.css:1258` `.addmenu-tab, .addmenu-card { … padding: 11px 6px; … }`, `:1354` `.addmenu-ic svg { width: 22px; height: 22px; }`,
  `:1356` `.addmenu-lbl { font-size: 10.5px; … }`, `:6223` `body .addmenu--panel .addmenu-tabs { display: flex; }` → always 64px tall.

**The inspector** (`js/inspector.js`) — CSS arithmetic on the band's height:
- `:3774` `function categoryGrid(layer)` builds `.cat-wrap > .cat-grid.cat-grid-top (3) + .cat-grid.cat-grid-bot (rest)`, each
  `.cat-card` = `.cat-num` + `.cat-ico` + `.cat-label` (`:3807`); mounted at `:6919`
  `root.appendChild(quickRow(layer)); root.appendChild(categoryGrid(layer));`.
- `styles.css:959` `.cat-grid { --cat-cols: 2; --cat-gap: 9px; display: flex; flex-wrap: wrap; … }`, `:1057` `.cat-grid { --cat-cols: 3; }` (PC).
- `styles.css:8614–8733` "The layer buttons shrink with the band (queue 285)":
  `:8652` `--cat-h: clamp(40px, calc((var(--tl-h, 264px) - 88px - var(--insp-extra, 0px)) / 3), 101px);`
  `:8664` `--cat-ico: clamp(12px, calc(var(--cat-h) - 2 * var(--cat-pad) - var(--cat-inner-gap) - 15px), 26px);`
  `:8668` `--cat-gap: clamp(4px, calc((var(--tl-h, 264px) - 120px) / 16), 9px);`
  — always three columns, row height = (band − a hand-counted 88px) ÷ 3, and **the icon gets what the label leaves**.
- The home quick-row (`js/inspector.js:3374` `function quickRow(layer)`) holds only `.qr-nudge` / `.qr-trim` buttons, both hidden on PC
  (`styles.css:2319` / `:2321` `@media (min-width: 701px) { .qr-btn.qr-trim { display: none; } }`), but keeps its
  `padding: 6px 2px 10px` (`:2976`) → a 16px empty strip above the cards.

## 3. Findings — measured on v17.03 through the app

How: `python3 tools/shot.py --width W --height H --js-file probe.js` (one headless Chrome per run). The probe leaves Home,
adds a star shape layer (the seeded test project is empty since #936), selects it (inspector) or deselects (Add menu, Elements
tab), sets `--tl-h` inline when a band is named, dispatches `resize`, waits ~1s, then reads `getBoundingClientRect` of every
tile, icon `<svg>` and label, the label's computed `font-size`, its painted line rects (`Range.getClientRects`), and every
scroller's `scrollHeight − clientHeight`. Probe: `probe-lib.js`, `probe-sweep.js`, `sweep.sh`.

### 3a. Default band at each PC window (nothing dragged)

| window | panel | **Inspector** tile (3 cols) | icon / name | **Add** (Elements) | icon / name | Add pages |
|---|---|---|---|---|---|---|
| 900×700 | 300×272 | 84.3×59 | **12px / 11.5px** | 5 tabs 48.6×64 + 47.8×69.3 ×5 | 24.3 / 9.7 | 2 |
| 1100×750 | 300×272 | 84.3×59 | **12 / 11.5** | 47.8×69.3 ×5 | 24.3 / 9.7 | 2 |
| 1280×800 | 307×240 | 86.7×48.3 | **12 / 9.6** | 49.2×71.3 ×5 | 26.3 / 9.8 | 2 |
| 1440×900 | 345.6×270 | 99.5×58.3 | **12 / 11.5** | 57×82.6 ×5 | 37.6 / 10 | **2** (fits on 1 — D8) |
| 1600×900 | 384×300 | 112.3×68.3 | 15.5 / 11.5 | 64.6×78 ×9 | 33 / 10 | 1 |
| 1920×1080 | 400×356 | 117.7×87.1 | 26 / 11.5 | 67.8×98.3 ×9 | 46 / 10.4 | 1 |

### 3b. Dragging the band down (1280×800, panel 307 wide)

| band | Inspector | Add menu |
|---|---|---|
| 420 | 3×3 of 86.7×101, icon 26, name 11.5 — fine | 3×3 of 87.3×87, icon 42, name 10 — fine |
| 300 | 3×3 of 86.7×68.3, **icon 15.5 under 11.5 names** | 5×2 of 49.2×71.3, icon 26.3 / name 9.8, one page |
| 240 (default) | 3×3 of 86.7×48.3, **icon 12 under 9.6 names** | 5×1 of 49.2×70.9 over **2 pages**, icon 25.9 / 9.8 |
| 190 | 3×3 of 84×**40** (floor), icon 12, **#inspector scrolls 23px** (149 of 172), "Outline &" and "Customise" show **part of a second line** | **no plan** (`addmenu--fit` off): body is a **56px scroller over 133px** of tiles; cards cut by the panel edge; the page dots are off-panel |
| 150 | only 2 of 3 rows visible, third row needs scrolling, same part-lines | body is a **16px** scroller; only the tops of the tiles show (`shots/sheet-now-1280.png`) |

### 3c. What each does badly (numbers above)

- **Inspector, D1 — the bunched look.** The icon is sized from what the label leaves and bottoms out at 12px, so at every
  default band from 900 to 1440 wide the cards are wide flat bars (84–100 × 48–68) with a 12px speck over 11.5px words.
  Worked for the 1280×800 default (band 240, keys on so `--insp-extra` 7px): `--cat-h` = (240−88−7)/3 = 48.3, `--cat-pad` = (240−120−7)/12 = 9.4, inner gap (240−120)/16 = 7.5 → icon = 48.3 − 18.8 − 7.5 − 15 = 7.0 → clamped up to 12.
- **Inspector, D2 — the short band.** Three rows are forced; at ≤200 the floor (40px) overflows: 23px of scroll at 190 and
  cut second lines.
- **Inspector, D3 — the tile gap never shrinks.** `--cat-gap` is set on the panel but `.cat-grid` (`:959`) declares its own
  `--cat-gap: 9px`, which wins on the element — measured 9px gaps at 150, 190, 300 and 420.
- **Inspector, D4 — a 16px dead strip.** The empty home quick-row (all its buttons hidden on PC) keeps its padding.
- **Inspector, D5 — arithmetic on a proxy.** 88px of chrome is counted by hand; the keys-on title line is 7px taller (handled
  by `--insp-extra`), a text layer's Text-to-Voice row is 48px (handled by another variable). Every new row above the grid
  needs another variable, or the grid overflows.
- **Add, D6 — the cliff.** Its solver only knows icon-over-two-lines (≥54px). Below it, it returns nothing and the panel
  falls back to a fixed layout that does not fit: the sliver scroller at 190 and 150.
- **Add, D7 — the tab row never gives.** 64px at every size: 43% of a 150px band. And an empty pinned strip (every tab
  that pins nothing) is still a flex item, so the tiles start **18px** under the tabs, not 9 (measured at 1440, band 160:
  tab row bottom 102, pinned strip top 111 and 0px tall, body top 120).
- **Add, D8 — a pager it did not need.** It plans in the box minus the pager's 26px first and only tries the whole box when
  that already fitted on one page. At 1440×900 (his window, default band) HEAD planned in 317×108 and drew 5 + 4 over two
  pages; the whole box is 317×134, where its OWN solver gives 5×2 of 57×63 on one page (measured: `d8.js`).
- **Both, D9 — two engines.** The Add menu is JS measuring its real box; the inspector is CSS guessing its box from `--tl-h`.
  They size, space and break differently at the same panel size — which is clause 4, measured.

### 3d. What each does well (kept)

- **Add:** sizes from the real box; never cuts a label while planned (0 ellipsed labels at every planned size above); icons
  scale up to 46px; monotonic (a bigger box never gives a smaller icon); stated tile widths, grid centred in the box.
- **Inspector:** never pages; the 3×3 look at a tall band (his 26 Sep screenshot, 98×101 tiles) with the gradient rings and
  the 1–9 key badges; 11.5px names that read comfortably.

## 4. The design: ONE shrink system, three ways to finish it

**The system (all three options share it).** Both panels are planned by the same code from the box they really have, and drawn
by the same CSS:

- **The grid picks its columns.** The inspector stops being forced into 3 columns. A short band gets 4×2 (or 5×2) squarer
  tiles instead of three rows of flat bars — this alone removes the "12px icon under 11.5px words" look: at the 1280×800
  default the inspector goes from 3×3 of 86.7×48 with 12px icons to 4×2 of 63.5×86 with 41px icons (measured — the 1280 table under option C).
- **The tile has shapes, most words first.** `stack` (icon over name) → `row` (a chip: icon left, name right, two lines max,
  never cut mid-name) → `icon` (picture alone, the name on hover). The panel takes the first shape that shows everything on
  one page with an icon of at least 22px. Same thresholds for both panels.
- **The Add menu's tabs** drop their words at one panel size, the same for every tab, only when the tiles would otherwise lose
  theirs (64px row → 32px of icons, each still titled).
- **Monotonic**: a bigger panel never shows fewer words, more pages or a smaller icon (1,592,318 boxes checked on the real
  code, 0 violations — §10).
- **Kept from each:** the Add menu's measured, icon-first solver (moved, not re-tuned); the inspector's never-page rule, its
  3×3 look at a tall band (a `fill` tie-break keeps three columns rather than two 118px ones), its rings and key badges.

**The three options differ only in the tile shapes allowed** (three constants in `js/tilefit.js`):

**The pictures** (made through the app with the prototype injected; PNG/JPG in `shots/`):
- `shots/option-now-1440.jpg` — **NOW**, both panels at bands 160 / 190 / 225 / 270 / 460 (1.6×).
- `shots/option-A-1440.jpg`, `shots/option-B-1440.jpg`, `shots/option-C-1440.jpg` — the same five bands per option (1.6×).
- `shots/compare-band160-1440.png`, `compare-band190-1440.png`, `compare-band225-1440.png` — NOW / A / B / C side by side
  at **actual size (1×)**, the sizes where they differ.
- `shots/sheet-now-1280.png` — NOW at 1280×800, bands 150 / 190 / 420 (the sliver and the cut third row).

### Option A — "names drop when too small" (his first idea, done properly)

Stacked tiles (icon over name) for as long as the icon can be 22px or more; below that every tile shows its picture alone,
bigger, with the name on hover (`title`) and for screen readers (`aria-label`). The inspector keeps its 1–9 badges.
`LADDER = ['stack', 'icon']`, `GATE = { stack: 22 }`, `TAB_WORDS_GO = true`.

Measured through the app at 1440×900 (his window; panel 345.6 wide) — `shots/option-A-1440.jpg`:

| band | Inspector | Add menu (Elements) |
|---|---|---|
| 160 | icons 5×2 of 57×46, 34px icon | tab names off (32px row); icons 5×2 of 57×28.5, 18px, one page |
| 190 | icons 5×2 of 57×61, 34px | icons 5×2 of 57×43.5, 31.5px |
| 225 | stacked 4×2 of 73×78.5, icon 33.5, name 10px | icons 5×2 of 57×61, 34px |
| 270 (his default) | stacked 4×2 of 73×101, icon 46, name 10.5 | tab names ON; stacked 5×2 of 57×67.5, icon 22.5, name 10 — all nine, one page |
| 460 | stacked 3×3 of 100×118, icon 46, name 11.4 | stacked 3×3 of 100×105.6, icon 46 |

Nothing scrolls at any band; no name is ever cut (0 part-lines, 0 labels outside their tile).

### Option B — "names always" (scroll or page instead)

Stacked tiles at every size. The grid still picks its columns (so the medium sizes get the same fix as A and C), but when
stacked tiles cannot fit, the inspector scrolls and the Add menu pages — and below ~200px the Add menu still has no layout
that fits (the sliver, as today). The tab names never go. `LADDER = ['stack']`, `GATE = {}`, `TAB_WORDS_GO = false`.

Measured at 1440×900 — `shots/option-B-1440.jpg`:

| band | Inspector | Add menu (Elements) |
|---|---|---|
| 160 | stacked 4×2 of 73×100 — **#inspector scrolls 107px** (one row visible) | **no layout fits: the 98px-scrolling sliver, as today** |
| 190 | stacked 4×2 of 73×61, **icon 19 under 10.5px names** | **the sliver (68px of scroll)** |
| 225 | stacked 4×2 of 73×78.5, icon 33.5 | stacked 5×1 of 57×72 over 2 pages |
| 270 / 460 | as A | as A |

B fixes the medium sizes (the grid still picks its columns) and nothing below ~200px.

### Option C — "tiles → chips → icons" ★ Recommended

Stacked tiles while the icon can be 22px+; then **chips** — the icon on the left and the whole name beside it on up to two
lines, using the width a short band has spare; only at the very smallest sizes, icons alone (name on hover). A chip never
shows part of a name: it needs 30px of height for two lines, and below that the name goes altogether rather than being cut
to "Outline & Sh…". `LADDER = ['stack', 'row', 'icon']`, `GATE = { stack: 22 }`, `TAB_WORDS_GO = true` (as shipped in
`code/tilefit.js`).

**Why C.** It is the only one that answers his second sentence as well as his first — *"have the text and the picture … dynamic
in a way that actually looks really good"* — and still ends where his first sentence starts (*"lose the text when it gets too
small"*). A drops the names ~35px of band earlier than it has to; B keeps them at the price of scrolling and the Add menu's
sliver, which is the thing he called bunched. C costs nothing extra to build: it is the same code as A with one more entry
in a list.

Measured at 1440×900 — `shots/option-C-1440.jpg`:

| band | Inspector | Add menu (Elements) |
|---|---|---|
| 160 | icons 5×2 of 57×46, 34px | tab names off (32px row); icons 5×2 of 57×28.5, 18px, one page |
| 190 | **chips** 3×3 of 100×38: icon 22, name 10.5px on up to two lines | icons 5×2 of 57×43.5, 31.5px |
| 225 | stacked 4×2 of 73×78.5, icon 33.5, name 10 | tab names off; **chips** 3×3 of 100×38, icon 22, name 10.5 |
| 270 (his default) | stacked 4×2 of 73×101, icon 46, name 10.5 | tab names ON; stacked 5×2 of 57×67.5, icon 22.5 — all nine, one page |
| 460 | stacked 3×3 of 100×118, icon 46, name 11.4 | stacked 3×3 of 100×105.6, icon 46 |

And at 1280×800 (panel 307 wide — the narrowest PC panel is 300), C measured band by band:

| band | Inspector | Add menu (Elements) |
|---|---|---|
| 150 (the drag's floor) | icons 4×2 of 63.5×41, 29px | tab names off; icons 5×1 of 49×29, 18px, **2 pages with the ‹ • › row inside the panel** |
| 170 | chips 3×3 of 87×31, icon 18, name 10.1 | icons 5×2 of 49×33.5, 21.5px |
| 190 | chips 3×3 of 87×38, icon 22 | icons 5×2 of 49×43.5, 31.5px |
| 210 | stacked 4×2 of 63.5×71, icon 26 | chips 3×3 of 87×33, icon 20 |
| 240 (the 1280×800 default) | stacked 4×2 of 63.5×86, **icon 41** (HEAD: 12) | tab names off; stacked 5×2 of 49×68.5, icon 23.5 — nine on one page (HEAD: 5 + 4 over two) |
| 420 | stacked 3×3 of 87×114.7, icon 46 | tab names on; stacked 3×3 of 87×92, icon 46 |

Also measured with C at 1440: a TEXT layer (nine cards) — chips 3×3 at 190,
stacked 5×2 of 57×83 at 270, no scroll either time; the panel RAISED over the canvas to 600px — inspector 3×3 of 100×118
(three columns kept, as in his 26 Sep screenshot), Add menu 3×3 of 100×118; the SHAPE tab — 6×1 of 46×58 art tiles at 190
(tab names off with every other tab at that size), 6×2 at 270 with names on. **0 scrolling boxes, 0 part-lines, 0 labels
outside their tile in every C measurement above.**

Worth saying to him with the pictures (reviewer, read off `shots/option-C-1440.jpg`): at the SAME band the two panels can sit
on different rungs — at 190 the inspector shows chips while the Add menu shows icons, at 225 the inspector is stacked while
the Add menu is chips — because the Add menu gives ~32–64px of the same panel to its tab row. It is one rule applied to two
different boxes, not two systems; but his complaint was that they behave differently, so say it before he spots it.

⚠️ One visible default change to know about: at the **1280×800 default band** the Add menu's tab names go (the Elements tiles
need the 32px to stay stacked on one page). At his 1440×900 they stay. One word overrides it (§9).


## 5. The exact change (all three options share it; the option is three constants)

The architecture is the same whichever option he picks — one planner, one set of CSS rules, both panels:

1. **New `js/tilefit.js`** (`code/tilefit.js`, paste verbatim). The Add menu's solver (`planGrid` / `fitArt` / `FIT_CFG`)
   moves here unchanged as the `stack` (and Shape-tab `ico`) rung, and gains two more tile shapes — `row` (the chip) and
   `icon` (picture alone) — plus a ladder that picks the first shape, most words first, that shows every item on one page.
   `GATE.stack = 22`: a stacked tile whose icon would come out under 22px counts as "bunched" and lets the next shape try.
   The option is only these three constants in it:

   | option | `LADDER` | `GATE` | `TAB_WORDS_GO` |
   |---|---|---|---|
   | A | `['stack', 'icon']` | `{ stack: 22 }` | `true` |
   | B | `['stack']` | `{}` | `false` (the tab names never go) |
   | **C (recommended)** | `['stack', 'row', 'icon']` (as shipped in the file) | `{ stack: 22 }` | `true` |

2. **`js/addmenu.js`** — the solver moves out (H3), `applyPlan` writes through `FM.tileFit.apply` (H4), the tab row's words
   are decided once per panel size (H5, which also lets `fitBox` hand over boxes down to 20px, so the 28px icon tiles can
   exist at a 150px band), its observer also watches the box under the title (H5b — found by running the hunks), and the
   plan tries the whole box first (H6 — fixes D8).
3. **`js/inspector.js`** — cards carry their name as `title`/`aria-label` (H7), `fitCards()` plans them from their real box
   with the same planner (H8), called on build (H9) and from a ResizeObserver on `#inspector` (H10).
4. **`styles.css`** — delete the `--tl-h` arithmetic (H11), move the add menu's fit tile rules into ONE shared `[data-rung]`
   block used by both panels (H12, H13 = `code/tilefit.css`). Also fixes D3 (the dead `--cat-gap`) by deleting it, D4 (the
   empty 16px quick-row) with one `:has()` rule, and a 9px gap the empty pinned strip cost every Add tab (D7).
5. **`index.html`** — load `js/tilefit.js` before `addmenu.js`; bump `?v=` on `addmenu.js`, `inspector.js` and `styles.css`
   (ship.sh refuses otherwise; the new file is exempt) (H1).

**Every hunk, with its anchor text, is in `code/hunks.md`** (H1–H13 and H5b the change, H14–H15 two test retunes). `code/tests-963.js`
goes at the end of `tests/tests.js`, just inside its closing `})();` (§6). `code/apply963.py` applies all of it in one go and
was run on a copy of the tree (§10).

A POLISH-LOG line that fits the gates (one `queue 963`, the item this closes; `#NNN` for anything only referred to). Put
HIS letter where it says `C`, and if he picks A or B change the clause about chips to match:
`- v17.xx — queue 963: the Add menu and the layer inspector shrink as ONE system (his pick: C). One planner (js/tilefit.js,
the Add menu's solver moved out unchanged) plans both panels from their real box: icon-over-name tiles → name-beside-icon
chips → icons alone, most words first; the inspector gets 4×2 squarer tiles instead of 12px icons under 11.5px names; the
Add menu no longer drops to a scrolling sliver on a short band, its tab names go only when the tiles need the room, and the
nine Elements fit one page at 1440×900 (it planned against the box minus its pager first). --insp-extra is now unread.`

Why the planner and not CSS container queries (the brief suggested them): both panels need their COLUMN COUNT chosen, not
just their tile styled — the inspector's bunching is caused by the forced 3 columns, and the Add menu's cliff by a solver that
cannot pick a smaller shape. A container query can restyle a tile for its size but cannot pick 4×2 over 3×3. And
`container-type: size` on `#inspector-panel` would make it the containing block for every `position: fixed` descendant
(layout containment) — a new class of bug for a panel that floats and hosts pop-ups. The planner already exists, is tested,
and is monotonic; this makes the inspector use it too.

## 6. The proving tests — `code/tests-963.js`, appended to `tests/tests.js`

Five tests, all `{ item: '963' }`, in the suite's style (`test(name, { item }, async function () {…})`, `atWideWidth`,
`sleep`, try/finally restoring `--tl-h`, the layer list and the selection). Why each fails on HEAD (v17.03):

| test | what it asserts | fails on HEAD because (measured) |
|---|---|---|
| **963 — the PC layer inspector shrinks without bunching…** (1280 wide, bands 150…420) | no scroll; nothing below the panel; every card ≥28×28; a shown name is whole lines inside its card; the icon ≥ 1.5× the name's font; a hidden name only with `aria-label`/`title` = the name. CONTROL: some band shows names, and 150 vs 420 draw different shapes | measured on HEAD: "the cards need 63px of scrolling (band 150px)"; past that, 12px icons under 11.5px names (12 < 17.25) |
| **963 — the PC Add menu shrinks without a sliver…** (1280, bands 150…420, Elements) | the body never scrolls; tiles and page dots inside the panel; ≥28px tiles and tabs; whole names; icon ≥1.5× font; an icon-only tab keeps its `title`. CONTROL: at 420 one page with names | measured on HEAD: "the Add menu body is a 16px scroller over 133px of tiles — the sliver (band 150px)" |
| **963 — one planner for both panels…** (1280, bands 150/190/264/420) | both the inspector's `.cat-wrap` and the Add menu's root carry `data-rung`; every tile is drawn at the plan's `--tf-cw × --tf-row`, icon at `--tf-ico`; label hidden exactly on the icon rung; `flex-direction: row` exactly on the row rung. CONTROL: ≥2 shapes seen | the inspector carries no plan at all (it is CSS arithmetic on `--tl-h`) — clause 4 as a fact |
| **963 — FM.tileFit: a bigger box never shows fewer words, more pages, or a smaller icon** | 46,728 boxes (counts 3/5/8/9, widths 272–372, heights 30–560, fill on/off): monotonic in pages, words and icon | `FM.tileFit` does not exist (the test throws, it does not skip). Run on the real `code/tilefit.js` in JavaScriptCore (`osascript -l JavaScript`): **46,728 checked, 0 violations** |
| **963 — at his 1440 window the nine Elements are on ONE page** (1440 wide, band 270) | 1 page, all nine names shown | measured on HEAD: "drawn over 2 pages at 1440x900 (plan 317x108 5c1r) — they fit on one" (D8) |

The suite runner's desktop frame is 900px; every one of these forces its own width with `atWideWidth`, so they mean the same
in the desktop pass and the 380px pass (where `atWideWidth` widens the frame back to PC).

## 7. Verification (the builder, after pasting)

1. `python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=963'` — five green (after the append, exactly five
   test names contain "963"). Then every §8 neighbour in ONE run (`?only=` takes several name substrings joined by `%0A`;
   it matches test NAMES only — the earlier `?only=addmenu` matched no test at all). 20 tests, including 803 and the 921 S5
   inspector-line test, which the planning run skipped:
   `python3 tests/_cdp.py --timeout 900 --url 'http://localhost:8777/tests/run.html?only=labels%20never%20collapse%20to%20nothing%0Aa%20PC%20category%20label%20shows%20whole%20lines%0Aqueue%20285%0Aqueue%20807%0Aqueue%20518%0Aqueue%20476%0Aqueue%20542%0A797%3A%0A760%3A%0Ashape%20tiles%20keep%20their%20big%20icons%0Aadd%20menu%3A%0A803%3A%0Athe%20inspector%20line%20takes%20no%20height'`
   Expected from `tools/prove.sh` at ship time: the five 963 tests CAUGHT (tests 1, 2 and 5 on the behaviour; 3 and 4 on the
   missing planner, which is the structural claim), and 672 / 918.3 — changed by H14/H15 — reported `⚠️ DEAD` because they
   also pass on HEAD. That is expected (they were retuned, not written to catch this) and does not block: one `queue 963`
   needs one catch.
2. **PC, by eye, at the sizes in the sheets** — `tools/shot.py --width 1440 --height 900` and `--width 1280 --height 800`, with
   `--setup` setting `--tl-h` to 160 / 190 / 225 / 270 / 460 and selecting / deselecting a layer. Compare with
   `shots/option-<picked>-1440.jpg`. Also 1920×1080 and 900×700 at the default band.
3. **The float** — raise the Add menu (`body.am-floating`, `--am-h` 600) at 1440×900 and check both panels re-plan (the
   inspector should be 3×3 big tiles, not 2×4) — the ResizeObserver on `#inspector` is what does it.
4. **Text layer** — at 1280×800 band 190 and 240, select a text layer (nine cards): no scroll, the grid re-plans for nine
   (measured in the prototype at 1440: chips 3×3 at 190, stacked 5×2 of 57×83 at 270).
5. **Light and dark** — the tiles keep their own plates/rings; only size and arrangement change, so one theme check at 1440
   (Home light vs dark does not reach the editor's panel colours) is enough: `--home light` and `--home dark` shots of the
   inspector at band 190 must differ only in the Home chrome, not in the tile geometry.
6. **Phone — must be byte-for-byte unchanged.** Everything new is inside `@media (min-width: 701px)` and scoped to
   `#inspector-panel`; the JS gates on `(min-width: 701px)`. Shoot the property sheet (`FM.mobile.open()`) and the Add sheet
   (`FM.mobile.openAdd()`) at **380×800** and at his **440×956**, before and after, and diff (PIL `ImageChops.difference`
   → `getbbox()` must be `None`). Done once while planning — §10.

## 8. Risks, and the existing tests this touches

Every row below except 803 and 921 S5 was RUN on the patched copy (option C, H14/H15 retunes applied): **18/18 PASS** (§10).

| test (name, `grep -n` in tests/tests.js) | effect | retune |
|---|---|---|
| `672 — the layer-panel labels never collapse to nothing, at any band height` (~80507) | Option A: at 180 (1100 wide) the inspector is on the icon rung, labels are `display:none` → "renders 0px tall". Option C: 180 is chips, labels show → passes. | Skip a card whose `.cat-wrap` has `data-rung="icon"` **and** whose `aria-label` equals its label text (assert that instead). The 0px-collapse it guards cannot recur: the label is either shown by a plan or deliberately hidden with its name moved. |
| `918.3 — a PC category label shows whole lines only, and both lines of a wrapping one` (~80557) | Option A at 180 (1280): hidden labels read 0 lines → throws. C: chips at 180 — a line-clamped label's `clientHeight` is whole lines → passes. | Same skip as 672 for icon-rung cards. Its CONTROL (a label wraps to two lines) still fires at ≥205 (stacked). |
| `the layer buttons shrink with the timeline band so they all stay on screen (queue 285)` (~45856) | Still true — the real planner (JavaScriptCore) on the suite frame's box (panel 300 → wrap 272 wide): band 240 → 4×2 of 62×86, icon 41, no scroll; band 420 → 3×3 of 85×114.7 (≥ 90, and > 86 + 20). | none expected — run it. |
| `a raised inspector grows its option cards into the height it was given (queue 807)` (~53790) | Now via the ResizeObserver (its 120ms wait is plenty — it fires the next frame). Planner on the suite box: 232 band → 4×2 of 62×82; raised +250 → 3×3 of 85×118 (+36 ≥ 20). | none expected. |
| `the inspector panel fits its own contents for every layer type (queue 518)` (~50856) | Guaranteed by construction (the box is measured below the Text-to-Voice row). | none; its prose about "88px of chrome" becomes history — update the comment. |
| `the layer menu’s short last row lines up with the columns above it (queue 476)` (~70158) | A real CSS grid: every card sits in a column. | none. |
| `797: the category number badges hide where there is no keyboard…` (~43815) | Badges still exist on every card; hidden on the chip rung by CSS only. | none. |
| `on PC the Add menu stays inside the inspector panel on every tab (queue 542)` (~54061) | More tabs now have a plan (fewer fallbacks); the fallback path is unchanged. | none expected. |
| `PC add menu: it has a surface of its own, and it costs the panel no scrollbar` (~16836) | The add menu is still shorter than the panel (title outside it). | none. |
| `803: the clip keys sit in the band on the layer title line…` (~43618) | Asserts `--insp-extra` is written — js/timeline.js still writes it. | none (it becomes unread; say so in POLISH-LOG). |
| `921 S5 review: at 1280×760 the inspector line takes no height from the band…` (~36121) | The collab line takes no height, so no re-plan fires. If it ever did take height, the grid would now re-plan instead of scrolling. | none expected — run it (`?only=921%20S5`). |
| `shape tiles keep their big icons; only the labelled cards are trimmed` (~14071), `760: on PC the shape tiles are 46px or wider with 40px art…` (~83561) | The Shape tab's `ico` config is moved unchanged; tabs keep their words on Shape unless the panel is small for every tab. | none expected. |

Other risks:
- **Moving 170 lines of `js/addmenu.js`.** The numbers are copied, not re-derived; the monotonicity test now runs on the moved
  code. The one behaviour change on the Add menu at sizes that already worked is the D8 fix (one page where it fitted).
- **The tab row losing its words** is a visible change at small sizes. It is decided once per panel size (not per tab), so
  switching tabs never makes the row jump — the "jumpy" complaint from v5.46.
- **#958 (drag the Add menu right up to the top)** is planned in parallel and only changes how TALL the floated panel may get.
  Nothing here reads the drag's clamp: both panels plan from their real box whenever it changes, so a taller float just
  gets bigger tiles up to the 118px cap, centred (the Add menu already does this today; the inspector will too). Build
  either first.
- **ResizeObserver in the suite frame** — the Add menu already depends on one (`_fitRO`) in the same frame, and its tests pass.
- **`:has()`** (quick-row rule) — Chrome 105+, Safari 15.4+, already used elsewhere in styles.css.
- **`-webkit-line-clamp` with a `var()`** — works in Chrome and Safari (verified in the prototype runs: the chips show at most
  `--tf-lines` lines).
- **Layout reads on every inspector rebuild (unmeasured).** `fitCards()` reads `getBoundingClientRect` right after the
  grid is appended, i.e. one forced layout per home-view rebuild — the same pattern the Add menu's `drawBody` already uses.
  Not profiled; if a rebuild ever turns out to run per frame during playback, move the call into a `requestAnimationFrame`.
- Label font in `<button>`s is the UA's (Arial in headless Chrome), so the 84px chip floor is measured in Arial. Safari was
  not measured; if a chip's word ever overflows there, raise `CFG.row.minW` (one number) rather than shrinking the font.

## 9. Open question for Ezra

❓ASK: Which way should BOTH panels shrink — **A** (names drop, icons only, when too small), **B** (names always; scroll or page
instead), or **C** (tiles → chips with the name beside the icon → icons only at the very smallest)? Recommended: **C** — it
keeps the text and the picture longest ("have the text and the picture"), never shows half a name, and still ends in your
"just lose the text" at the smallest sizes. One letter.

Everything else was decided here (per rule 16 / "don't ask what you can decide") and is named so he can overrule it in one
word: the 22px icon floor before a tile changes shape (say "16" or "28" — `GATE.stack`), the Add menu's tab names dropping
at small sizes, which includes the 1280×800 default band (say "keep tab names" — `TAB_WORDS_GO = false`; the cost, by the
planner's arithmetic, is that below a ~180px band the Add menu has no room left for a row of tiles), and the inspector
keeping 3 columns when tall (say "2 columns" — drop `fill: true` in H8).

## 10. What was measured, and what was not

Measured (through the app, `tools/shot.py`, one Chrome per run, waiting on the builder's locks and load < 8 each time):
- HEAD at 900×700, 1100×750, 1280×800, 1440×900, 1600×900, 1920×1080 (default bands) and 1280×800 at bands 150/190/240/300/420:
  tile boxes, icon sizes, label fonts, painted line counts, part-lines, scrollers (§3).
- The three options prototyped by injecting `code/tilefit.css` + `code/tilefit.js` + `proto-glue.js` into the running app
  and re-arranging the DOM the app drew, the way H4–H10 will (§4, the sheets, the numbers table).
- The planner's monotonicity: the real `code/tilefit.js` run in JavaScriptCore (`osascript -l JavaScript`) over 1,592,318
  boxes (counts 1–18, widths 150–420, heights 20–700, `fill` on and off) — 0 violations (`tmp/mono3.js`); and per option —
  every ladder A / B / C and the Shape tab's `['ico']`, counts 3/9/14/30/67 — over 1,470,750 more, 0 violations
  (`tmp/mono4.js`).
- "Moved, not re-tuned": HEAD's own `planGrid` + `FIT_CFG`, cut straight out of `js/addmenu.js` (lines 664–847), against
  `FM.tileFit.planRung('stack' | 'ico')` over 311,712 boxes (counts 1–67, both configs) — identical columns, rows, tile size,
  icon, font, label band, padding and pages in every one (`tmp/same.js`).
- The phone, CSS: the property sheet (`FM.mobile.open()`) and the Add sheet (`FM.mobile.openAdd()`) at **380×800** and
  **440×956**, animations frozen, with vs without `code/tilefit.css` injected — **IDENTICAL** at both sizes (PIL
  `ImageChops.difference(...).getbbox()` is `None`).

Run for real (the hunks, not the prototype): `code/apply963.py` applied H1–H15 to a COPY of the tree (v17.03 + the
builder's uncommitted v17.04, copied 26 Sep 20:20 into `app/c`; a second copy `app/head` got only the new tests), each served by
`tools/serve.sh` on its own port and run through `tools/shot.py --path /tests/run.html?only=…` (1600×1000):
- **HEAD + the five new tests: 0/5 pass** — "the cards need 63px of scrolling (band 150px)", "the Add menu body is a 16px
  scroller over 133px of tiles — the sliver", "FM.tileFit is not loaded", "FM.tileFit.plan is missing", "the nine Elements
  are drawn over 2 pages at 1440x900 (plan 317x108 5c1r) — they fit on one".
- **Patched (option C): 4/5 on the first run** — "one planner…" failed: "the Add menu carries no plan at a 150px band". That
  was a real bug, found only because the hunks ran: deselecting a layer renders the Add menu while the title line is still
  40px (the clip keys), the keys go a tick later, and the menu's observer watched only the panel, so it never re-planned in
  the taller box. Fixed by **H5b** (observe the container too). **Re-run with H5b: 5/5 pass.**
- **The 18 neighbour tests on the patched copy: 18/18 pass** — 672, 918.3, queue 285, 518, both 807, 476, 542, 797, 760,
  shape-icon-size, addmenu-bg, and the seven "add menu: …" tests (the retunes H14/H15 included).
- The phone, real code: the patched copy vs the HEAD copy, property sheet and Add sheet at **380×800** and **440×956**,
  animations frozen — **IDENTICAL** at both sizes (so the new JS paths, not just the CSS, leave the phone alone).

Not measured (said plainly):
- The full suite was not run on the patched copy — only the five new tests and the 18 neighbours above. ship.sh runs it
  (both passes) and prove.sh re-does the HEAD-vs-patched proof.
- The builder's REAL tree: the hunks were applied to a copy; the tree will have moved on by build time. `apply963.py`
  refuses on any anchor it cannot find exactly once, which is the check that it still fits.
- Safari: nothing was measured in Safari (headless Chrome only). The chip floor is measured in Arial (the font Chrome gives a
  `<button>`).
- The collab test `921 S5 … the inspector line takes no height from the band` was not run (it needs the collab rig); it is on
  the §7 list.
- His real display scale: the 1.6× sheets are magnified; the `compare-*.png` sheets are 1×, i.e. CSS pixels.

## Review (second reader, 26 Sep, against v17.05 / acae12a5)

Changed:
- Re-ran `code/apply963.py` on a fresh copy of HEAD (v17.05) for options A, B and C: every anchor still found exactly once; all
  patched JS parses (JavaScriptCore); no dangling `planGrid`/`FIT_CFG`/`--am-*` reference. Said so at the top.
- `apply963.py` did not apply H12's last instruction (the styles.css comment still naming `--am-pager`); added that step, and
  noted it in hunks.md.
- §7: `?only=addmenu` matched NO test (the filter matches names; the tests say "add menu:"). Replaced the list of single
  filters with one `%0A`-joined run of all 20 neighbours, now including 803 and the 921 S5 inspector-line test the planning run
  skipped.
- §7: said what `prove.sh` will print (5 CAUGHT; 672/918.3 DEAD, expected and non-blocking — prove.sh only warns on DEAD).
- §2: line numbers re-checked on v17.05 (quickRow 3374; H5b anchor ~1637 in hunks.md); the REQUESTS.md pointer corrected
  (#963 is still PLAN PENDING, no block points here yet).
- §4: added the note that at the same band the two panels can sit on different rungs (seen in `option-C-1440.jpg`) — say it
  to him before he spots it. §5: the POLISH-LOG line's "(his pick: C)" is a placeholder for his letter.
- §8: named the one unmeasured cost (a forced layout per inspector rebuild).
- Added a clause → section map.

Checked and left alone: every image exists, opens, is ≤1200 wide and under 3× tall, and shows what its caption says; the §3
arithmetic (D1's worked example, the 46,728-box count) adds up; `.cat-grid`'s own `--cat-gap` (D3) is real (the id-weighted
8px one at styles.css:4574 is phone-only); H5's `host`/`tabsEl`/`main`/`container`/`bodyEl`/`fitOn` and hoisted `placeGlint`
are all in `render`'s scope; tabs and add-menu cards already carry `title`; labels contain no entities, so `aria-label` equals
the label's text; the five tests fail on HEAD for the stated reasons and each negative check has a control. `FM.tileFit.better`
is exported but never called — harmless, left in because the measurements were taken with this exact file.
Not done: no suite run on v17.05 (another session was shipping); Safari still unmeasured.

