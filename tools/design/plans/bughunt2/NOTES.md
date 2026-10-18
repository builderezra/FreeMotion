# bughunt2 — seven confirmed defects, fixed red-first (hunt/bughunt2-fix, from 672e74e1)

Written code-only while a release shipped: nothing was run but `node --check` on each changed file and git. The builder runs the
tests. One commit per defect, in the brief's order (#1, #3, #2, #4, #5, #6, #7). All tests are in `tests/tests.js` between
`// ── bughunt 2 (hunt/bughunt2-fix) ──` and `// ── end bughunt 2 ──`, all `{ item: '1176' }`. The block's own helpers are `_bh2With`
(a scene of the test's own, with layers, project object, fps, duration, selection, playhead, kf clipboard, gestures, media records and
the undo stack put back), `_bh2Img`, `_bh2HoldImageLoads`, `_bh2Shape`, `_bh2Group` and `_bh2Times`.

Busters (against ssh/main): app.js 481 → 482, timeline.js 266 → 267, inspector.js 426 → 427, behaviors.js 7 → 8. compositor.js was
already 232 on this branch (main 230) and was not bumped again.

## #1 (MEDIUM): Undo pressed while a split is loading its media duplicated the clip and wiped the redo

- **Where:** `js/app.js` `FM.splitLayer`, after `await reloadMediaTo(id, B.id)`; `js/timeline.js` `clipSplit`.
- **Bug:** the split mutates A, then awaits the tail's media load. `history.undo` is not blocked meanwhile and swaps `FM.scene.layers`
  for fresh parsed objects. The split then found A again **by id** (the restored, unsplit copy), spliced B in beside it and committed:
  two overlapping clips, and the commit cut the redo tail.
- **Fix:** after the await, `if (FM.layerById(FM.scene, id) !== layer)` the split is abandoned: nothing inserted, saved or committed,
  and the media record just minted under B's fresh id is removed (nothing can reference that id). This is swapInMedia's identity test.
  `clipSplit` (the multi-clip Split) records `FM.history._steps()` before muting; while muted only an undo, redo or reset can move the
  stack, so if it moved the loop stops and the batch's commit is skipped. A selected clip whose object was replaced is skipped, never
  split by id.
- **Unaffected:** with no undo during the await, A is still the same object, so the old path runs unchanged. A deleted A still hits the
  old `idx < 0` return. A batch with no undo has an unmoved stack and commits once, as before.
- **Tests:** `bughunt2 #1 Undo pressed while a split…` (one image clip; `FM.loadImageFile` held on a gate; reset, move A to start 1 and
  commit, split at 5, undo, release). `bughunt2 #1 an Undo during the multi-clip Split…` (two clips through `FM.timeline.clipOp('split')`).
  - **Fail on 672e74e1:** two layers and `canRedo()` false; the batch gives four layers (three with only splitLayer's fix).
  - **Controls:** the load was reached before the undo; the undo swapped in a fresh unsplit A. Both also check that no media record is
    left for a tail that never landed, and the first checks that redo brings back exactly his move.

## #3 (MEDIUM): moving several clips left a group's members behind; Align moved locked clips

- **Where:** `js/timeline.js` `clipMoveToPlayhead`, the several-clips branch; `js/inspector.js` `alignRow` (`setStart`, Start together,
  Chain down, Chain up, End together).
- **Fix:** the several-clips move builds a Set of the targets plus each selected group's unlocked descendants (`FM.groupDescendants`,
  `!m.locked`, as `FM.moveClipTo`) and shifts each one once. In `alignRow`, the alignment is computed over the unlocked clips only
  (`movable`, `movableRows`), `setStart` refuses a locked layer, and a group bar carries its unlocked members. A member rides with its
  NEAREST selected group, unless it is selected itself (then it takes its own target). All-locked says "Those clips are locked".
- **Unaffected:** a selection with no group and no locked clip runs the same arithmetic. `setStart` still assigns `l.start = ns`
  exactly (not `+= d`), so the 465 test's exact starts are unchanged.
- **Tests:** `bughunt2 #3 moving several clips to the playhead…` (G 1..2 with M and a locked LM, X 4..5; select [G, X]; playhead 8;
  `clipOp('move')`). `bughunt2 #3 Align on timeline…` (the 465 recipe through the real "Start together" button: A, locked B, C; then X
  plus a group bar G with M and a locked LM).
  - **Fail on 672e74e1:** M stays at 1 while G goes to 4; B goes to 0; M stays at 2 while G goes to 0.
  - **Controls:** G and X moved by +3; C moved to 0; G moved to 0.
- **A choice to check:** a locked clip is left out of the alignment entirely, like clipOp's block move. So Chain does not leave a gap
  for it, and Start together lines up on the earliest unlocked clip, not on a locked one.

## #2 (LOW): text wrap split emoji and flags across UTF-16 surrogates

- **Where:** `js/compositor.js` `FM.textLines`, `chop`.
- **Fix:** chop walks `graphemes(solid)` (the same segmenter the animated path and the curve use). A run of one grapheme wider than the
  column stands alone.
- **Unaffected:** the `trim(s).length > 1` gate is kept. Plain ASCII is one grapheme per code unit, so the loop makes the same
  comparisons and cuts as before.
- **Test:** `bughunt2 #2 text wrap never cuts an emoji…`: `'😀😀🇦🇺👍🏽'` at 24px, column `min(20, floor(0.8 × narrowest emoji))`.
  No lone surrogate, the lines join back to the string, every break is on an `Intl.Segmenter` boundary, and only single graphemes may
  overflow.
  - **Fails on 672e74e1:** the first line is the lone high surrogate of 😀.
  - **Controls:** every emoji is wider than the column. Three ASCII strings wrap exactly as a verbatim copy of the old chop does.

## #4 (MEDIUM): Follow on a split target froze after the cut

- **Where:** `js/behaviors.js` `followValue`, plus a new `followTarget`.
- **Fix:** the target is resolved at `t − delay` through `FM.clipAt`, the lineage lookup Audio Drive and the parent chain use. When no
  half covers that moment, it takes the latest half to have ended, else the earliest. That is the half holding the value an unsplit
  target would hold past its end or before its start (plain `clipAt` would return the head and read its seam value).
- **Unaffected:** a target with no `splitOf` returns `FM.layerById` exactly, as before.
- **Test:** `bughunt2 #4 Follow keeps following…`: T.x 0 → 400 over 0..4, split at 2; F reads 100 / 300 / 400 at 1 / 3 / 5 s, and
  300 at 4 s with a 1 s delay.
  - **Fails on 672e74e1:** it reads 200 at 3 and 5 s, and 200 with the delay.
  - **Controls:** the unsplit readings; the split made a tail half.
- **The same gap elsewhere, not fixed (per the brief):** `tools/design/plans/simple-mode/DESIGN.md` ~1262–1270 lists the effect-source
  lookups (`scene.layers.find(l => l.id === srcId)` in compositor.js, and the collide pool's source) and the matte (drawn through
  `drawLayer`, which returns outside the source's window). Past a cut, a matted layer disappears and an effect source reads the head
  half. DESIGN proposes one `refLayerAt` helper over `FM.clipAt` for those.
- **Full-unchanged lock:** this changes what Full renders for a Follow on a split target. DESIGN B4 said that waits for Ezra's yes; the
  PM decided on 18 Oct to fix it without asking. `tools/_fu_gate.py` fires only on Simple releases, and none of the added lines matches
  one of its HOOKS, so this release does not trigger it. The FU probe's B4 Follow guard compares against HEAD, so once this lands it is
  the baseline.

## #5 (LOW): Paste keyframe at the playhead stacked a near-duplicate

- **Where:** `js/timeline.js` `pasteKfAtPlayhead`.
- **Fix:** `t = FM.snapKfTime(FM.time)`, and the hit test is `< FM._halfFrame()`. These are upsertKeyframe's rules (queue 625). The
  millisecond round stays only as the fallback if `snapKfTime` is missing.
- **Unaffected:** a playhead on a frame with no key within half a frame still adds a key there. One visible difference: a paste at a
  frame like 1/30 s now lands exactly on the frame, not at the old ms-rounded 0.033.
- **Test:** `bughunt2 #5 Paste keyframe…` at 30 fps: T.x keys at 1.0125 and 2; copy S's key at 1.0 (value 50); paste at 1.
  - **Fails on 672e74e1:** two keys within half a frame of 1 s.
  - **Controls:** the copy found the key; 1.0125 is within half a frame of 1; a paste at 2.5 adds one key at 2.5.

## #6 (LOW): dragging a group bar moved its locked members

- **Where:** `js/timeline.js`, the clip drag's `expandGrp` in pointermove.
- **Fix:** skip `l.locked`, as `FM.moveClipTo` and the selection's co-drag list (queue 823) already do. The release only shifts what
  is in `clipMove.group`, so the locked member's keyframes stay put too.
- **Unaffected:** groups with no locked member expand exactly as before.
- **Test:** `bughunt2 #6 dragging a group bar…`: mouse pointerdown on the bar's `.clip`, four Shift-held pointermoves (Shift bypasses
  snapping) and a pointerup on window, one pointerId, 80 px in all. The project is 10 s long, so `groupDragCeil` leaves room.
  - **Fails on 672e74e1:** the locked member's start and keys move with the bar.
  - **Controls:** the bar moved; the unlocked member and its keys moved by the same amount.

## #7 (LOW): the first or last frame of a clip was refused for a split

- **Where:** `js/app.js` `FM.splitLayer`, the edge guard.
- **Fix:** refuse only within `FM._halfFrame()` of an edge (half a frame; 1e-3 with no usable fps; 0.02 only if `_halfFrame` is
  missing). When the playhead is inside the clip but that close, the toast now says "Move the playhead at least a frame from the
  clip's edge to split it", not "Park the playhead inside the clip".
- **Unaffected:** a split at or outside an edge is still refused. At 30 fps, frame 1 (0.033 s) was already allowed and still is.
- **Test:** `bughunt2 #7 at 60 fps…`: a 0..2 shape split at 1/60 and at 2 − 1/60 gives two halves cut exactly there.
  - **Fails on 672e74e1:** both are refused.
  - **Controls:** at 0 and at 1/240 it is still refused; at 1 s it splits.

## Unsure

- None of this was run. Every number comes from reading the code: exact float expressions, linear segments, frame times. The only
  tolerance placeholder is in #4: `TOL = 0.01 /* MEASURE: … */`.
- #1's tests stub `FM.loadImageFile` and give the image a 2×2 canvas record with a 4-byte Blob as its `file`. The autosaves and
  commits during the test may write that blob to IndexedDB for the open project, as other split tests already do.
  `FM.history.reset()` at the start releases the RAM records of layers outside the test scene. The undo-fidelity sweep does the same.
- #3b and #6 drive real DOM (the inspector's align row, the timeline's `.clip`). If a layout hides the align row it is still in the
  DOM, as the 465 test relies on. If the group bar has no `.clip`, #6 says so through `attached()`.
- The #2 control column assumes the test Chrome measures emoji at least 5 px wide at 24px. If its fonts draw them narrower, the
  CONTROL throws rather than passing vacuously.
- `followTarget`'s fallback when no half covers the moment goes beyond the brief's plain `FM.clipAt`. Without it, a follower past its
  target's end would still read the head's seam value.

## #8 / #9 (from 346d5811): the mattes and the effect sources read the half of a split layer on screen at t

#4 fixed Follow, and its notes listed the same gap in the mattes and the effect sources (simple-mode DESIGN.md ~1262–1270). This section
is that follow-up. It is one commit, because the two share one helper: #8 is the mattes, #9 the effect sources. Code only, as above.

- **The shared rule:** `FM.refLayerAt(scene, id, t)`, new in `js/scene.js` beside `FM.clipAt`. It returns the half on screen at t, by
  `FM.isLayerVisibleAt`'s half-open window (start ≤ t < end), and tries the stored-id half first. Where no half is on screen, it returns
  the latest half to have ended by t, else the earliest. That fallback is #4's. Follow's `followTarget` now calls it, so the rule exists
  once.
  - **Why not `FM.clipAt`:** its inclusive end hands back the head ON the cut frame, and the head draws nothing on that frame. A matte
    built on it would still blank for one frame at every cut. The tests measure the cut frame (2 s) for this reason.
  - **The one change for Follow:** exactly on the cut it now reads the tail, where #4 read the head. The split gives both halves the same
    seam keyframe there, so the number is the same unless a half has been edited since. #4's test reads at 1 / 3 / 5 s and 4 s with
    delay, never on the cut, so its numbers do not move.
- **Every lookup that resolves another layer by its stored id at render time** (compositor.js unless named):

  | Lookup | Broken on 346d5811? | Now |
  |---|---|---|
  | Luma Matte `drawLumaMatte` | yes: past the cut the matte was empty and the layer vanished | `fxSourceAt` |
  | Masking group mask (`collectGroupUnits`, `buildGroupUnit`, the fill-behind pass) | yes: the head stayed the mask (top member, by id), and the tail, inserted just below it, was drawn as an ordinary member. Past the cut the members showed unclipped with the mask's own picture over them | every half of the top member's lineage is the mask (`isUnitMask`, `u.maskLin`); the half on screen at t clips (`FM.refLayerAt`) |
  | Compound Blur, Match Grade (live), Displacement / Polar Displacement, Gradient Wipe | yes: an empty map or reference past the cut | `fxSourceAt` |
  | Match Grade held / smoothed moments (`mgHeldStats`) | yes: drew the half on screen NOW at the other moment | `refAt(tt)` per moment; the memo key covers every half, so an edit to any half is a new key and the key holds across the cut |
  | `FM.matchGradeFrameLayers` (the export's decode list) | yes: the head's frames only, so past the cut the export graded from the live frame | adds every video half of the reference's lineage |
  | Squish "Collide with" one layer | yes: the head was skipped past the cut by its own window test, so the wall vanished | `FM.refLayerAt` |
  | Follow (behaviors.js) | fixed in #4 | now through `FM.refLayerAt` |
  | Audio Drive (behaviors.js `audioDelta`), the parent chain (`applyParentChain`) | no, already `FM.clipAt` | unchanged |
  | Music Visualiser `specCandidates` | no, it already hears every half of the lineage | unchanged |

  `fxSourceAt(scene, srcId, t, layer)` keeps the old `!== layer.id` guard on the resolved half. So when a layer's source is its own
  lineage (a split of a self-referencing layer), the half resolved at t is the layer itself and reads as no source, as a
  self-reference always did.
- **Not render lookups, left alone:** pen masks (`penmask.maskId`) name a mask inside the same layer. Isolate, the group-pivot walk and
  the source pickers are UI, and so is Audio React's bake target (a one-off write of keyframes).
  - **A sibling gap, not fixed (Audio Drive, not a matte or effect):** `js/exporter.js` ~1148 prewarms Audio Drive envelopes for the
    stored id only. At render time Audio Drive reads the tail through `FM.clipAt`, so in a fresh session's export the drive may be inert
    for a few frames after a cut until the tail's envelope lands.
- **Unsplit sources are unchanged:**
  - `FM.refLayerAt` returns `FM.layerById`'s own answer at `!p.splitOf`.
  - `fxSourceAt` is the old find plus that one read.
  - `maskLin` stays null for a mask never split, so `isUnitMask` is the old id test and its second clause is never read.
  - `collectGroupUnits` reads `mask.splitOf` once per unit.
  - `mgHeldStats` keeps the old memo key exactly (`[clean, rLayer]`, `rLayer.id`).
  - `matchGradeFrameLayers` adds nothing.
  - One new rule touches only a split mask: a masking group whose only drawable members are halves of one clip is not masked. Before the
    split it held one clip and was not masked either. On 346d5811 it went blank inside the head's window.
- **Tests** (all `{ item: '1176' }`). Each renders frames at 1 s, 2 s (the cut) and 3 s with `FM.renderScene` into a 320×240 scene of
  the block's own, from the layers in `FM.scene`. It then runs `FM.time = 2; await FM.splitLayer(src.id)` and requires the same frames
  again (TOL 2 levels; they should match byte for byte). The shared fixture is a white 80-px bar whose centre is keyed linearly 80 → 240
  over 0..4 s. A linear key divides exactly, so the halves draw the unsplit numbers.
  - `bughunt2 #8 a Luma Matte keeps cutting…`: red full-frame S, matte M = the bar at opacity 0.
    - **Fails on 346d5811:** 0 red px at 2 s and 3 s, where the unsplit matte shows 19200.
    - **Controls:** a bar-sized cut-out that moves right (left edge 80 / 120 / 160); no white; the split made a tail half at 2 s; the 1 s
      frame.
  - `bughunt2 #8 a masking group keeps clipping…`: the group at the origin, the bar as top member (mask), red full-frame member.
    - **Fails on 346d5811:** at 2 s and 3 s, 57600 red px and 19200 white, where the unsplit group shows 19200 red and none white.
    - **Controls:** as above, plus no mask pixels before the split.
  - `bughunt2 #9 a Displacement Map keeps displacing…`: red S over x 100..220, the bar as map, Luma → X only, Amount 40.
    - **Fails on 346d5811:** at 2 s and 3 s the map is empty and S is its plain 100..220. Before the split it is 100..180 + 200..220 at
      2 s and 100..180 at 3 s.
    - **Controls:** before the split each of the three frames differs from S without the effect; the tail half; the 1 s frame.
  - `bughunt2 #9 the export decodes every half…`: a pure call on hand-built layer objects.
    - **Fails on 346d5811:** the list is `bh2-ref` only.
    - **Controls:** an unsplit reference lists exactly itself; a split clip of another lineage is never listed.
- **Not separately tested:** Compound Blur, Gradient Wipe, Polar Displacement, live Match Grade and held Match Grade go through the same
  `fxSourceAt` line that #9 proves through Displacement. Collide goes through `FM.refLayerAt`. Each would need its own effect-specific
  picture, reasoned without a run.
- **Buster:** scene.js 121 → 122. behaviors.js stays at 8 (already bumped on this branch). compositor.js is not bumped (the builder bumps
  it at assembly).
- **DESIGN.md is now stale here:** ~1262–1274 says Follow and the effect sources render through the stored id, and that `R.linkOf` reads
  the stored id for them "permanently (what actually renders)". The renderer now reads the lineage for Follow, mattes, the masking-group
  mask and effect sources. Simple's link rule may want to follow, as DESIGN itself says it can once this ships. Not touched here.
- **Full-unchanged:** this changes what Full renders for a split matte, mask or effect source, as #4 did for Follow, under the PM's
  18 Oct decision. No added line names one of `tools/_fu_gate.py`'s HOOKS.
- **Unsure:** nothing was run. The frame numbers come from reading `drawLumaMatte`, `buildGroupUnit`, `dispVec` / `displaceResample`
  and `FM.splitLayer`: axis-aligned bars on whole pixels, white luma 1 → push +40 px, opacity 0 matte layers drawing nothing themselves
  (as `penMaskMatteScene` relies on). If the renderer anti-aliases a bar edge differently between the halves, TOL 2 may need measuring.

## SHIPPED IN TWO PARTS (18 Oct)
v17.72 shipped #1, #3, #2, #5 and #6. #4, #7 and #8 changed the very lines the Full-unchanged lock (#980) anchored its `floor`,
`matte` and `follow` plants on, and moving a plant is an instrument change that ships alone with its own full PASS — so v17.73
re-anchored those three plants (lines the same before and after these fixes, each planting a change that differs from Full on
both sides), and v17.74 ships #4, #7 and #8 against it. Decided under his 11 Oct rule (PM, 18 Oct): an obvious bug-fix yes.
This branch's own re-anchoring (9fca4b3e, 038f341a) is NOT what shipped; v17.73's is.
