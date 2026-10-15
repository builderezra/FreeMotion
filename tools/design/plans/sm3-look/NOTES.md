# Simple Phase 3 · Look — filters and Adjust for a clip (queue 980, refers to #545)

Branch `hunt/sm3-look`, built on `ssh/hunt/v50-tree` (4af4e420, the v17.50 tree). **Nothing was run**: a release ship was
running in the main checkout, so no node, no python, no browser. Every line here is from reading; the suite has not seen it.

## What the design asks (and where)

- DESIGN.md §15 Phase 3 row (line 4032): "Look (filters + Adjust)"; gate D20 A (panels in the band), D16 A (icons) — both
  answered 1 Oct. **Nothing in Look waits on an open decision** (D3 / D14b / D18 / D22–24 do not touch it).
- §8.5 tray table (2698–2699): Look is a main-clip and overlay tray tool; §8.5 (2722–2754): panels reuse the existing builders
  through `openCategory` with a `simple` flag, **rows never add a keyframe** (`FM.shiftProp`, numeric keyed rows say *"This
  changes over time. Your change applies to the whole clip · Open in Full"*).
- §8.7 (2864): "Filters + strength + use on every clip; Adjust — 56 filters; colour effects — Core (the Look tool)".
- §8.5 project tools (2688): **Look for all** is a separate project-row tool (the Look panel with Use on every clip on).
- §14.1 (3837): `js/simple-tools.js` holds "the Look tool (filter strip + Adjust)".
- §8.5c item 4 (2841–2844): an instance applied in Simple carries `inst.sm = 1`; the sanitiser keeps it (Phase 1,
  `js/storage.js:1548`). design-ux.md:601 (the input to DESIGN): Adjust is "one list of sliders that writes a single
  filter-container effect named Adjust with brightness, contrast, saturation, exposure, temperature and vignette children".
- §8.3 / D20 A (2604–2619): on PC the panel docks in the band above the tray and scrolls inside itself; T19b (line 4008) adds
  the 844×390 sheet-over-the-timeline case.
- §3.12 rule 1(a): lines with no button (a pick, a slider) go to `#sm-live`, never replace the tray; never `FM.toast`.

## What was built

- **The tray's Look** (`js/simple-tools.js` trayFor): on a main clip that is a video or a picture, right after Lift off
  (nothing Phase 2 placed moves, and Lift off stays in the first five for T19). `aria-pressed` while its panel is open. The
  icon is the D16 A set's Look (`vis/kit.js:993`). **Not on overlays yet** (see open questions).
- **Look's own panel**, drawn into `#inspector` through one new hook in `js/inspector.js` refresh (`FM.simpleTools.drawPanel`,
  false whenever Simple is not on screen), so it docks exactly where More's panel docks: the sheet under the tray on a phone,
  inside the band above the tray on a PC (D20 A). More and Look share the place; pressing one over the other swaps them.
  - **Filters** tab: None, then his favourites, his own saved filters, then the library by section — tiles with the library's
    own pictures (`FM.fxThumbs.mountFilter`, the Filters tab's tiles). A tap is ONE runner step `Change look`. Under them,
    while a filter is on, **Strength** (0–100 %).
  - **Adjust** tab: Brightness, Contrast, Saturation, Exposure, Warmth (−100…+100), Vignette (0…100), and Reset.
  - A slider previews on the canvas while it moves (`FM.spine.lookApply` on the live clip), then on release the preview is
    put back to the byte and ONE step writes it (so a refused step leaves nothing behind, and a friend's edit that landed
    meanwhile is never written over). A keyed value shows §8.5's line with an **Open in Full** button.
  - Panel redraws keep the strip's scroll, the panel's scroll and the focused control (keyboard arrows on a slider keep working).
- **The data** (`js/spine-edit.js`, PHASE 3 · LOOK): two ordinary filter containers on the clip, both `sm: 1`:
  the filter is exactly `fitToLayer(FM.filters.makeInstance(fid), clip)` (what Full's Filters tab adds, so Full shows a plain
  "Noir" row); a pick replaces the Simple-made filter in place; filters added in Full are never touched. **Adjust** is one
  container named `Adjust` holding only the controls that are off zero, in a fixed order; back to zero removes the child, an
  empty box goes. Mapping (u = the panel's number): brightness/contrast `1 + u/200`, saturate `1 + u/100`, exposure `u/50` EV,
  temperature `u`, vignette `u/100`. Every write is `S.edit` (one undo step, one collab tx, never arranging/adopting, so it
  works live like Full's look edits — D14 A); keyed values move through `FM.shiftProp` (key count never changes).
- Undo labels: `Change look`, `Look strength`, `Adjust`, `Reset adjust` (`ed: 's'`). Lines (`#sm-live`): *"Noir on Clip 2"*,
  *"No filter on Clip 2"*, *"Strength 40%"*, *"Brightness +50"*, *"Adjust is back to zero"*; refusal *"That filter doesn’t
  work on this clip"*. All words are in `js/spine-words.js` (T20).
- **The tray strip keeps its scroll when the same tray redraws** (`_fill`, stripKey). Needed because Look makes a video clip's
  tray eleven (see below): a press past the first screen redrew the tray back to its start, so the pressed tool left the place
  under the finger (§3.12 1(a)). A new selection or another row starts at 0 as before.
- CSS: one block after the 2.3 block in `styles.css`, only `.sm-look…` classes.
- Busters: styles.css 769, spine-words 14, spine-edit 13, inspector 424, simple-tools 11.

## ❓ Needs his eyes / his pick before it ships (#545: nothing visual new to him ships unseen)

1. **The Look panel itself** — never drawn on any sheet (no V-page draws it). Needs a picture at 380 (phone sheet) and
   1280×800 (band) of: the two tabs, the strip with None and the tiles, Strength, the six Adjust sliders and Reset.
2. **His pick B no longer holds for a video clip's tray on a PC.** Look makes a video clip's tray ELEVEN tools; two rows
   hold ten in the 306 px band (`TWO_ROW_MAX`), so it keeps one scrolling row with More and 🗑 pinned (the documented fallback
   the gap case already used). A picture beside a gap also goes from ten to eleven. Options for him:
   (a) as built — one scrolling row for 11+; (b) **the design's own answer, recommended for Phase 3 as a whole**: DESIGN §8.3 (1)
   `body.ed-simple { --insp-w: clamp(372px, 26vw, 420px) }` (also needed for Phase 3's eight project tools) + `TWO_ROW_MAX`
   12 — but it narrows the timeline panel, and at 900 px wide the PC play bar may not fit (unmeasured); (c) one "Move" tool
   holding Move earlier / Move later (as Audio did for sound) — costs the a11y button route's one-press reach.
3. **Where Look sits in the tray** — after Lift off (5th on a picture, 6th on a video): on a 380 phone it is one swipe in for a
   video clip, while the first-run hint says "change its speed or look". Moving it third is one line; Lift off then leaves the
   first five on a video clip (T19).
4. **The Adjust set and its ranges** (six controls, ±100 = brightness ×0.5–1.5 etc.) and the word **Warmth** for temperature.

## Open / not done (said plainly)

- **Look on overlays** (DESIGN's overlay tray has Look) — not added: it changes the overlay pick-B test's tool count and
  More's column (`tray B at 1280×720 More opens its panel…`, seven tools). One line in trayFor once that is checked.
- **Look for all** (the project-row tool, "Use on every clip") — not built: it belongs with the project-tools row that Phase 3
  grows to eight (Captions, Effects, Ask), which needs decision 2(b)'s band first. The commands are ready for it
  (`S.cmd.lookFilter` per clip).
- **844×390 (phone sideways)**: T19b wants Look's panel as a sheet over `#timeline-panel` there; it docks in the band like
  More's panel does today. Shared with More; not changed here.
- A Full-side param edit that adds a keyframe should drop `inst.sm` (§8.5c item 4) — that is Full-side plumbing and was not touched.
- A refresh from elsewhere in the middle of a slider drag (a playhead crossing a clip edge while playing, a friend's edit)
  cancels that drag's preview and nothing is written; the finger has to start again.
- Brand names: the library's filter names (Polaroid, Kodachrome, Technicolor) show in Simple's strip now; T20's brand regex
  does not list them and they are Full's names already — flagged for BEFORE-PUBLISHING, not changed.

## Tests (tests/tests.js, before the final `})();`, `{ item: '980' }`)

New — each fails on 4af4e420 at `smLookOpen`'s own sentence ("the selected clip’s tray has no Look tool"), never a TypeError:
1. `simple P3 · Look at 380 … tray holds Look … sheet docked under the tray … pressed again it closes`
2. `simple P3 · Look at 1280×800 the panel opens inside the left band above the tray (D20 A) …`
3. `simple P3 · Look at 380 a tap on Noir puts Noir on THAT clip only …` (same instance as Full's Filters tab via
   `fitToLayer(makeInstance)`, `sm: 1`, centre pixel spread → 0 on B only, one step, Undo label `Change look`, replace, None)
4. `simple P3 · Look at 380 Adjust’s Brightness moves the picture …` (FM.renderScene centre 128 → >143, one step, `Adjust`,
   Undo back; CONTROL: the plain grey first)
5. `simple P3 · Look at 380 Strength … never adds a keyframe …` (two keys move by −0.35, count stays 2, `Look strength`)
6. `simple P3 · Look switched to Full: … Noir in Full’s Effects list …`
7. `simple P3 · Look leaves Full’s own panel alone …` (380 and 1280; CONTROL: Simple shows the panel first)

Changed (pick-B fixtures that Look pushed past ten tools — the intent kept, flagged in each):
- `simple P2.3 · S9 option E: a main video clip’s tray …` — **its claim changes** (two rows of five → one scrolling row of
  eleven on PC); title rewritten; this is decision 2 above.
- `simple P2.2 · tray B at 1280 on PC a clip with every tool shows all nine on two rows …` — B now flush (no gap), list + look.
- `simple P2.2 · tray B at 1280×800, 1280×720 and 960×700 every tool is on show …` — B flush (C at 5).
- `simple P2.2 · tray B at 380 the phone keeps its one row …` — count 10 → 11.
- `simple P2.2 · tray B at 1280×720 a double click on Close gap …` — C's eleven tools keep one row: the strip is scrolled to
  Close gap first, and the new scroll-keep is what puts Fix under the pointer (the guard is still what is tested).
- `simple P2.2 · tray B at 1280×720 after the window was once 500 px tall …` — B flush (C at 5).
- `simple P2.2 · tray B on PC the band says “Its tools are below” only while …` — B flush (C at 5) at 1280×720.

Read but unchanged (subset checks or ≤ 10 tools): smTrayCheck (380 / 1280), the More-in-reach wheel test, the locked-clip
line test, the overlay More test, SU1 #15.

## Merge notes vs the morph branch (switch animation, D11 B)

Shared files this branch touches: **`index.html`** (five `?v=` busters: styles.css, spine-words, spine-edit, inspector,
simple-tools), **`styles.css`** (one block after the "Simple mode release 2.3" block), **`js/spine-words.js`** (new keys at the
end of `lines` and `tools`), **`tests/tests.js`** (the block at the end + the seven pick-B edits). Not touched:
`js/editor-mode.js`, `js/simple-timeline.js`, `js/spine.js`. If the morph also bumps `styles.css` or `simple-tools.js`, take
the base for the buster and bump once above the higher of the two (CLAUDE.md index.html rule). Tests: both append before the
final `})();` — rebuild by blocks, never union-merge.

## What the lock run (Full unchanged, FU1–FU7) must cover

`js/inspector.js` changed (one line in `refresh`, inert unless `FM.editor.isSimple()` and Look is open for that layer) and
`styles.css` gained `.sm-look…` rules only. Full must draw its Add menu / layer editor / Effects card exactly as HEAD, at 380
and 1280, with and without a trip to Simple with Look open (test 7 is the in-suite guard; the FU group is the real proof).
The new `#inspector` focusin / scroll listeners return at once outside Simple.
