# Plans for the five after P19 (P20): #1075, #1076, #1077, #1078, #1079

Against `origin/main` 7125ecff (v17.31). Plans, tests and reference patches; nothing outside `tools/design/plans/helper-plans-20-scripts/` is changed on this branch. **Measured** = I ran it here (headless Chromium, the suite's own driver, 1280 and 380), **Read** = I read the line, **Guess** = I did not check.

**Which five.** The open items after #1074 in order are #1075 to #1079 (all `hunt LOW`, the PM's tutorial review of v17.23, "READY", no ask on any of them). The first thing I did with each was try to refute it against REQUESTS.md and the code's own comments, and **two of the five are by design**, with his words behind them: #1076 and #1077. Those get no patch and I say why.

`helper-plans-20-scripts/`:
- `p20-repro-tests.js`: three suite tests (`P20 #1075`, `#1078`, `#1079`). Append before `async function run()` in `tests/tests.js`; `?only=P20` runs them. **Measured: on main 0 of 3, each red for its own reason, at 1280 and at 380. With the patches 3 of 3 at 1280 and 380** (`results/`).
- `patches/p20-1075.patch` (timeline.js, styles.css), `p20-1078.patch` (inspector.js), `p20-1079.patch` (timeline.js): independent, each applies to main with `git apply --check`.
- `p20_mut.sh` and `results/p20_mut.log`: six mutations, all CAUGHT.
- `results/p20_1079_options.jpg`: the three options for #1079, drawn at 380 in the real app.

## #1075 Grabbing a clip to move it gives no visual signal on iPhone (LOW)
- **Claim: Verified (Read plus Measured).** The touch hold in `buildLane`'s `pointerdown` (about `timeline.js:2208`) creates `clipMove` after 350 ms and its only feedback is `navigator.vibrate(10)`, which Safari does not have. **Measured:** after the hold no clip element carries any class that says "picked up" (test red on main: 0 lifted clips). The edge grips arm in teal (`.clip-grip.armed`), the body does nothing.
- **Callers traced (Read).** `clipMove` is created in two places, the touch hold (here) and the mouse press (below it, where a pointer already shows what it holds). It ends in three: the window `pointerup` / `pointercancel` handler (`:5519`), `restoreGestures` and `recoverStuckGesture` (which reaches it) and two test seams. Only the touch hold needs the sign.
- **Patch.** The picked-up clip gets `.clip-grab` (3 px lift, 1.5% scale, a stronger shadow and a teal ring, 120 ms); one helper `dropGrab()` removes it, called from the release path. **Two of my own guards turned out to be dead code** and are not in the patch: I first dropped the class in `restoreGestures` and `recoverStuckGesture` too, and the mutations that removed them survived, because every one of those paths rebuilds the rows and a rebuilt row is a new element. The release is the one place that does not rebuild when the clip was already selected (solo view), and the test has that case (a selected clip held and released) so the mutation that removes the drop there is CAUGHT.
- **Test.** `P20 #1075`: three clips; hold the second with a touch for 560 ms, one clip must carry `clip-grab`; release, none; grab again, abort, none; and a clip that is already selected, held and released, none. **Mutations:** no lift class (A1), release keeps it (A2): both CAUGHT.
- **Risk.** Low. The lift is `transform` and `box-shadow` only (no layout), and `.clip` already has `overflow: visible` while selected. **Guess:** how it looks over a very busy filmstrip; I did not draw it, it is one CSS line to retune.

## #1076 PC: the S key splits only when the playhead is over the selected clip (**BY DESIGN, no change**)
- **Verdict: refuted, with his words.** `timeline.js:191-200` quotes the request this came from (queue **#765**, clauses 2 to 4): *"A will be cut all the way to the left and jump to left, S will be split down the middle, D will be Jump to the right … Make it so if ur not hovering over the clip tho and you press s no matter which side it will extend the clip to the playhead. while a and d just bring it to the playhead."* The code does exactly that (`clipKeyAction`, `timeline.js:201`), and `app.js:9013` says so beside the key. The reviewer read it as a surprising edit; it is the behaviour he asked for.
- **What I would do instead.** Nothing in the app. If the tutorials keep tripping on it, the tutorial should say "S splits when the playhead is on the clip, and stretches the clip to the playhead when it is not" (the key rail's tooltips already change with the side, `syncKeyRail`). **Not logged as a bug; I suggest closing #1076 with a pointer to #765.**

## #1077 Effects browser: the "does nothing here" badge swallows the tap (**BY DESIGN, no change**)
- **Verdict: refuted by the code's own comment.** `fx-browser.js:1062-1066`: *"Tappable, and it must NOT also pick the effect — the badge sits inside the tile, whose own tap adds or picks. A tap here is a question about the tile, not a choice of it."* It was built that way in queue 603 / v11.83 after three angry reports that the app "knew the answer and wrote it where he could never read it". The toast is the answer to that; picking as well would put a dead effect on the layer from a tap that asked "why does it say this?".
- **If he wants it softer** (**Guess**, not built): the badge could say "tap for why" the first time, or a second tap on the toast could add the effect anyway. Neither is a defect fix, so I would leave #1077 closed as by design.

## #1078 Drop Shadow with Shadow only on a full-frame clip turns the picture black (LOW)
- **Claim: Verified (Measured).** 360x640 project, a full-frame layer, Drop Shadow, Shadow only on: the centre pixel and the corner are both (0,0,0). At half size the corner stays white and only the layer area is black. The effect works; it is the sentence that is missing. (The Effects BROWSER already says "fills the whole frame … Shrink the layer first" through `COVERS_FRAME_FX`, `fx-browser.js:927`; the effect ROW in the inspector, where he is when the picture goes black, says nothing.)
- **Callers traced (Read).** The row's "does nothing here" tag comes from `FM.fxDeadOnLayer` (a one-pixel measurement, `inspector.js:1774`); it cannot see this case because the effect is not dead, it is total. `FM._fillBehindCovered` (`compositor.js:16723`) is the renderer's own "does this layer reach every edge" test and is the one the browser uses.
- **Patch.** In `fxRow`, in the same single tag slot (the file insists on one tag, never two): Drop Shadow, Shadow only on, layer covers the frame, then a tag "covers the picture" with the full sentence on its `title`. **Not covered:** `_fillBehindCovered` answers false for a shape or text layer (it is for video and image, which is what "clip" means in the report); a full-frame shape with Shadow only is black as well and gets no tag. Say so, or widen the test, if he wants it for shapes.
- **Test.** `P20 #1078`: an image layer at full size gets the tag; the same layer at half size gets none (CONTROL), and full size with Shadow only off gets none (CONTROL). **Mutations:** no tag (B1), tag ignores Shadow only (B2), tag ignores the cover test (B3): all CAUGHT.
- **Risk.** Very low (one tag, one condition).

## #1079 Phone: with a clip selected, the "Tap to add a layer" row is not drawn (LOW, but it is a beginner's wall)
- **Claim: Verified (Measured at 380).** Import two clips, and the second is selected: the solo view draws its one row, no add row, no +, and the only way out is the back arrow. The picture (`results/p20_1079_options.jpg`, panel NOW) is exactly that.
- **Callers traced (Read).** `buildTracks` draws the row only when `addRowWanted() && !soloId` (`timeline.js:3966`). The solo view is `soloLayerId()` (`:2838`): a phone with exactly one layer selected. Every creator selects what it made (import, Add text, shapes), so the solo view is where every beginner lands after the first action. The `#add-fab` is hidden by design since queue 294 (`styles.css:4205`), so the row is the one door.
- **This is the same family as #1074 (Export hidden) and my P19 plan for it** (do not select after the FIRST import on a phone) fixes only the first import. **A fixes all of them.**
- **Options (drawn at 380, one recommended):** NOW (nothing); **A (recommended): the add row stays in the solo view**, one row above the clip, 40 px; B: nothing selected after any import on a phone (fixes imports, not Add text or shapes, and costs the quick edit tap after each import); C: a one-time hint ("tap ‹ to add more"), the cheapest and the weakest. Needs his pick (**ask**).
- **Patch (A).** Remove `&& !soloId` from that one condition. **Measured:** the row appears at y=420 (40 px) above the solo row, a tap on it opens the Add sheet with the clip still selected, no script errors, and a neighbouring slice (`solo / add row / tap to add / add layer / empty timeline / playhead missing`, 21 tests) passes at 380. **Not measured:** dragging the row inside the solo view (the line-drag assumes other rows exist); with one row on screen it has nothing to drop past, so I would turn the drag off in the solo view rather than trust it, one `if` in `buildAddRow`. A decision for the builder, not tested here.
- **Test.** `P20 #1079`: nothing selected, the row is drawn (CONTROL); a clip selected, the solo view is on (CONTROL) and the row is drawn and a tap opens the Add sheet. **Mutation:** put `&& !soloId` back (C1): CAUGHT.
- **Risk.** Low to medium: the sheet is 40 px shorter in the solo view (visible in the picture; the cards still fit), and the row's drag behaviour above.

## Neighbouring tests (Measured)
Solo and add-row slice at 380 with the #1079 patch: 21 of 21. The three P20 tests, patched: 3 of 3 at 1280 and at 380.

## Order I would build them in
#1078 and #1075 first (self-contained, no decision), then #1079 once he picks A, B or C. #1076 and #1077: close as by design.

## Where I stopped
Not run: the whole suite on the patched tree (slices only), a real iPhone for #1075's look, and the solo-view row drag in #1079.
