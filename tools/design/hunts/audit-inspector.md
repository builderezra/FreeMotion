# AU2: audit of js/inspector.js on main v17.31 (7,245 lines)

Against `origin/main` 7125ecff. Branch `hunt/audit-inspector`. **Measured** = I ran it here (headless Chromium, the suite's own driver, 1280 and 380), **Read** = I read the code, **Guess** = I did not check.

## Result: three bugs survived (four tests), each red on main at 1280 and 380 and green with a small fix

| # | Where | What he sees | Repro test | Fix | Proof |
|---|---|---|---|---|---|
| AU2-1 | `js/inspector.js` `fxScrubber.apply` (about :1165), `kfNumRow.apply` (:1352), `kfScaledRow.apply` (:1384) | **Typing the number a slider already shows changes it.** 26 shipped effect defaults sit between the slider's step notches (CRT Scanline 0.45 on a 0.02 step, Dots opacity 0.85, Flash (dark) 0.45 and 0.15, Night vision 0.85, the 3D solids' Shading 0.55 and 0.65, and more; `au2_lint.py` prints the list), and the box snaps a typed value to the nearest notch: typing the 0.45 on screen stores 0.46. The X / Y boxes had exactly this bug and were fixed ("a TYPED value is exact, snapping/rounding silently rewrote it (545 became 540)", `mtSetXY`); these three never got it. The file's own header says "typed values in the box stay free-form". | `AU2-1` | the three `apply` functions take a `typed` flag from the box's `change` handler and round to the digits the box shows instead of to the step | red / green at both widths; mutation A1 CAUGHT |
| AU2-2 | `js/inspector.js` `applyStyle` (:3348) and `styleBlockedReason` (:3402) | **Paste look → Effects puts a text-only effect inside a copied filter onto a shape,** where it can never run (a row that looks like a look and does nothing). The effect **Paste** button beside it fits each pasted entry with `fitToLayer` (a filter keeps only the children that suit the layer); Paste look checked only the top-level type, and a filter's own type is allowed everywhere. The Effects tile also read "available" for a filter none of whose children suit the target, which would then replace the target's effects with nothing (the silent wipe queue 569 fixed). | `AU2-2` (control: the child that suits a shape survives) | `applyStyle` and the tile's reason use `fitToLayer` | red / green; mutation B1 CAUGHT |
| AU2-3 | `js/inspector.js` `alignRow` `setStart` (:3636) | **The multi-select Align buttons move a LOCKED clip.** "Start together", "Chain down / up" and "End together" took every selected clip. The A / S / D keys, the clip drag, the reorder handle and the phone buttons all refuse a locked clip (queue 816 / 823). Measured: with a locked clip at 3 s, Start together moved it to 0 s, Chain down to 2 s, End together to 6 s. | `AU2-3` | `setStart` skips a locked layer (it still counts as an anchor for the others) | red / green; mutation C1 CAUGHT |
| AU2-4 | same `setStart` | **The same buttons move a selected GROUP bar without what is inside it:** the bar went to 0 s, the layer inside stayed at 5 s, so the group no longer contains its own contents. `FM.moveClipTo` already says "A GROUP BAR CARRIES ITS MEMBERS" and fixed it there; this mover was the other copy. | `AU2-4` (control: the bar itself did move) | `setStart` carries `FM.groupDescendants` (unlocked) with the bar, keyframes included | red / green; mutation C2 CAUGHT |

`audit-inspector-scripts/`: `au2-tests.js` (append before `async function run()`; `?only=AU2`), `au2-fixes.patch` against main (the fixes are also in the branch's app files; the `inspector.js` buster is bumped), `au2_patched_{1280,380}.txt`, `au2_mut.log`, `au2_lint.py` (the registry lint), `au2_probe.py`.

**One behaviour change to know about (AU2-1):** a typed value on a step-1-or-bigger effect row is now kept to the box's digits instead of being moved to a step multiple, so typing 7 on a step-5 row keeps 7. That is what the X / Y boxes already do and what the file header promises; dragging still lands on notches. Clamping to min and max is unchanged.

## A lint over the whole effect registry (Measured: 798 range params, 135 segments, 70 colours)

Every range param has finite min, max, a step above 0 and min <= max; every default and legacy value is inside its range; every segment default and legacy is one of its options; no `overriddenBy`, `follows` or `alsoGate` points at a key the effect does not have; no effect has two params with one key. **The only finding is the 26 off-grid defaults above**, which is what AU2-1 is about. Run `python3 au2_lint.py <port>` against a served tree.

## What I read, and how closely

Line by line: the numeric rows and typing boxes (11 to 300), the effect clipboard and the layer presets (420 to 665), the effect scrubbers, toggles, segments, `markOverridden` and the keyframe rows (1119 to 1430), Paste look and its blocked-reason rules (3275 to 3480), the single and multi-select clip rows (3543 to 3780), the Move & Transform value boxes and scrubber (4380 to 4600), the crop panel (4600 to 4780), parent / behaviours / volume panel (5393 to 5690).

**Skimmed or not read** (no claim either way): the effects browser and filter rail (1930 to 2360), the audio-effects section (2360 to 2720), the category grid and icons (2860 to 3270 and 3940 to 4075), the fill panel (4074 to 4360), the Move & Transform panel body and edit-points tools (4800 to 5390), the camera panel and `buildCategory` (5800 to 6770), the keyframe-scope selection code (6770 to the end).

## Candidates I tried to refute and dropped

- `layerPresets.save` clamps keyframe times at 0 (`shiftKf`), so keys that sit before the clip's start collapse to 0 when a look is saved: real, but only for keys before the head, and applying a look re-anchors from the clip start by design (queue 690). Logged here, not built.
- `normHex` turns an 8-digit `#rrggbbaa` into black in the colour field (display only; nothing is written until he edits): no stored property carries hex alpha today (**Read**).
- `layerPresets.list()` returns `null` if the stored value is the JSON text `null`: needs a hand-edited store.
- `resizeCrop` with the aspect lock: once the clamped height hits the source height the width is not re-derived, so the ratio drifts at the limit only (the earlier lock fix covers the long drag).
- `fxToggle` writes `fx.params[key]` directly rather than through `FM.setProp`: toggles are not keyframable, so nothing is lost.
