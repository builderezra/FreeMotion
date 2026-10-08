# S4: the four Simple-mode bugs from the T10 walk, fixed on 980-p22-r3

Branch `hunt/simple-t10-fixes`, five commits on `980-p22-r3` (a51b5e1d): one commit of four red-first tests, then **one commit per bug**. Headless Chromium 1194 here, 1280 and 380. **Measured** = I ran it. **Read** = I read the line.

**Two of the four turned out not to be bugs the way I wrote them up in T10, and I say so first.** I read DESIGN.md for each before touching code.

| | what T10 said | what DESIGN.md says | what I did | release |
|---|---|---|---|---|
| a | Typing 1 in Speed % makes a 10-minute clip | §"Speed is Simple's own thin panel": a slider from **0.25× to 4×** (DESIGN.md:2728-2730); Full's 1 to 1000 "is not reused" | **Real bug. Fixed.** Simple's box now stops at 25 and 400 %; Full keeps 1 to 1000. Commit 1a7462e0 | **2.2** (More → Speed is 2.2's door). 2.3's own Speed row supersedes it for main and overlay clips, and 2.3 moves this same function into `FM.setClipSpeed`: expect a trivial conflict on the `rangeRow(…)` argument line |
| b | The ✦ badge ignores effects | §9.1 (DESIGN.md:2988-2990): ✦ is for **keyframed** properties (effect params included), masks, behaviours, 3D. A **plain effect is level none, by design**. And an effect applied in Simple (`inst.sm = 1`) is none "keyframes and all" (:2836-2842) | **A plain effect earning no ✦ is the spec, not a bug.** What the code lacked is the `sm = 1` exemption: `spine.js` counted every keyframe. Fixed that. Commit 961aec85. The only wrong thing left is the words "Has moves and effects" over a badge a plain effect does not light; those words are DESIGN's own (:2932), so it is for Ezra, not me | 2.2 (effects added from Simple). Today nothing in this tree sets `sm = 1` (only the sanitiser keeps it and `collab-core.js`'s fixture carries it), so this fix is live only for files and collab payloads that have it, and becomes visible when effect tiles in Simple mark their instances |
| c | The ‹ leaves the project with a clip selected, though it says "Close clip options" | §8.2: Simple sets **neither** `m-editing` nor `sel-mode`; "the phone's top bar keeps the project name" (DESIGN.md:2891, app.js:998-1002), and the bar is `#topbar-m, unchanged` (:2436). So ‹ goes Home with a clip selected in Simple **by design** | **Not a behaviour bug; a lying label.** `aria-label` was "Close clip options" for `phone && n === 1` in both editors (app.js:1023-1026). Now "Projects" in Simple. Behaviour unchanged. Commit 876032a5 | **1.3** (the selection chrome, §8.2, is Phase 1; the label branch is P1's) |
| d | A slow swipe on a panel button raises a "Reset" menu | Nothing: it is Full's feature ("hold a card to reset that group", queue 381). Full's code has the same hole | **Real, in shared code.** The 480 ms hold timer is cleared on up, cancel and leave, never on a move (inspector.js:4000-4017), so a swipe that takes 480 ms to get going raises it. **Fixed in Simple only** (a move of more than 10 px clears the timer); Full's identical code is untouched because DESIGN §0.4 says Full is unchanged. The same fix belongs in Full and needs his OK. Commit 59ee2198 | **2.2** (the More panel's cards) |

### The quote you asked for in (c)
DESIGN.md:2891, the phone top bar row of the selection table: *"`syncSelectionChrome` sets neither `m-editing` nor `sel-mode` (`js/app.js:941`, `styles.css:4030`, `:4051-4055`), so `#m-dup`, `#m-del`, `#m-more`, `#m-group`, `#m-maskgroup` and `#clip-name-m` never show; the tray names the selection and owns the one bin"*, and :2436 `‹  Beach day  ?  ✎  ⚙  Export  #topbar-m, unchanged`. If he wants ‹ to **deselect** in Simple (as it does in Full, js/mobile.js:354-357), that is a design change: Simple's selection is cleared by tapping empty space (T9 tutorial 03/04) and the tray, not ‹. Left as a question for him; the one-line change would be in `mobile.js`'s click handler.

## Tests (tests/tests.js, before `async function run()`, `?only=S4a` … `S4d`; careful, `S4` alone also matches the 921 S4 tests)
| test | red on 980-p22-r3 (Measured, both widths) | green after |
|---|---|---|
| S4a Speed % | "in Simple, typing 1 gave speed 0.01 and a clip 300.0 s long" | yes; CONTROLs: 200 → speed 2; **Full still takes 1 % → 0.01** |
| S4b ✦ | "an effect made in Simple (sm = 1) keyframes and all earned the ✦ (look)"; CONTROLs: bare clip none, plain effect none, keyframed Full-made effect look, and one Simple-made plus one Full-made keyframed effect still look | yes |
| S4c ‹ label | at 380: "in Simple with a clip selected the phone ‹ says "Close clip options" but it leaves the project"; CONTROL: Full says it | yes. **At 1280 it cannot be red:** `phone` is false there, the label is "Projects" before and after. The 1280 half is a guard, not a detector |
| S4d slow swipe | at 380 and 1280: 'a slow swipe that started on the Speed card raised "Reset Speed" 480 ms after the touch'; CONTROL: a still hold of 700 ms does raise it | yes |

Results: `simple-t10-results/base_*` (red) and `fin_*` (green).

## Mutations, all caught (Measured, 380; `simple-t10-results/mut_*.json`)
- a: the Simple lower stop 25 → 1: S4a red.
- b: the `sm` filter replaced with `true`: S4b red.
- c: `&& !simple` removed from the label: S4c red.
- d: the move slop 10 px → 1e9: S4d red.
Each restored; the tree was clean after.

## The Simple slice stays green, Full unchanged (Measured, and one thing I could not run)
- Slice on the fixed tree, names containing `simple P`, `speed`, `Speed`, `Reset`, `back arrow`, `back button` (122 tests): **115 pass at both widths; 5 are NOT RUN here (real touch / QR); 2 are red, and both are red on the untouched 980-p22-r3 too** (re-run there): `the quality ladder sheds pixels…` (the container is too fast: "35 ms a frame to begin with") and `simple P2.2 · tray B at 1280×800, 1280×720 and 960×700…` ("960×700: [5,4] duplicateClip lies outside the band"), which is the PC tray problem S5 puts to Ezra (A1). Not caused by these fixes.
- **Full unchanged:** every fix is gated on `FM.editor.isSimple()` (a, d), reads only Simple-written markers (b) or changes a label only in Simple (c). S4a and S4c carry a Full CONTROL each. **I could not run `tools/full-unchanged.sh`**: its instrument needs a video decoder this container lacks (see the H51 and S1 notes). The laptop should run it before these land.
