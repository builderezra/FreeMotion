# AU11: audit of js/app.js, last third: lines 6101 to 9151 (main fba44ca8)

Branch `hunt/audit-app-3`. **Measured** = I ran it here (headless Chromium, 1280 and 380), **Read** = I read the code, **Guess** = I did not check. Thirds by line count: AU9 = 1 to 3050, AU10 = 3051 to 6100, AU11 = 6101 to 9151. This third is the export card and the rest of the export run, the timeline resizer, `init()` (all the button and dialog wiring), the PC transport layout, the canvas-size dialog and the keyboard shortcuts.

**Bottom line, honestly.** One real bug, in the **arrow-key nudge**, fixed and proven. Most of this third is event wiring that earlier hunts have been through; I read a small part of it closely.

## Fixed, red on main and green with the fix at 1280 and 380, five mutations CAUGHT

| # | Where | What he sees | Repro | Fix |
|---|---|---|---|---|
| AU11-1 | the arrow-key nudge in the global `keydown` handler (`app.js` about 8920) | **An arrow key does not move a member of a turned or scaled group on the screen.** The nudge adds 1 (10 with Shift) to the layer's `transform.x` / `.y`, which are in the PARENT's own axes. **Measured on main:** with the group turned 90 degrees, Right moved the member DOWN by 1 px on the screen; in a group scaled 2x it moved 2 px; in a 30 degree group it went off at 30 degrees. (Measured on a group whose pivot is stored; with the default floating pivot the member also swung by half a pixel on both axes because moving it moved the group's pivot: (0.5, 0.5) for Right in a 90 degree group.) A canvas drag of the same member already carries the finger's screen delta into the parent's frame (`canvas-edit.js`, `drag.pxf`), so the two disagreed. A plain layer, and a member of an untouched group, were right. | `AU11-1` (controls: a plain layer and a member of an untouched group keep the exact old whole-pixel numbers) | for a layer whose parent turns or scales, map the screen step through the parent frame (`FM.canvasEdit._parentXform`, the same walk the drag uses) after pinning the group pivots above it; every other layer keeps the old code |

Mutations (all CAUGHT, `au11_mut.log`): the parent frame ignored (A1), pivots not pinned (A2), the rotation the wrong way round (A3), the scale ignored (A4), and a layer in an untouched group taking the new path (A5, which first SURVIVED: the test had no fractional-position control for that case, now added). Busters bumped: `app.js?v=469`.

`audit-app-3-scripts/`: `au11-tests.js` (append before `async function run()`; `?only=AU11`), `au11-fixes.patch`, `au11_mut.sh`, `au11_mut.log`.

**One behaviour change to know about:** a nudge of a member of a turned or scaled group now writes a value to two decimals (an exact screen step), where every other layer still gets a whole pixel. Both axes can change for one arrow (that is what a turned group needs), so an animated member gets a keyframe on each at the playhead. **Not changed, Read only:** the whole-pixel rule moves a layer sitting on a fraction by less or more than 1 px (x 100.5 + 1 becomes 102); it is the long-standing snap and I left it.

## Read, no defect found

- **The canvas-size dialog** (`cvCompute`, `cvDetect`, `cvUpdate`, `cvApply`, 8247 to 8700): custom sizes are clamped to even values from 16 to 7680, a size that matches a preset reopens on the preset and anything else on Custom (so Apply cannot silently snap it), and the layers are rescaled with `FM.rescaleProjectContents`, which AU4 round-tripped through undo at five sizes.
- **The key chain** (8868 to 8960): modifier combos that are not the app's own return before the bare-key chain; typing in a field never reaches it except Escape in the notes pad.

## What I read, and how closely

Line by line: the nudge handler and its neighbours (8868 to 8960), the canvas dialog's size logic (8247 to 8330), `showExportReady` (6242 to 6330, also covered in P22).

**Not read, no claim either way:** `setupTimelineResizer` (6338 to 6720), the whole of `init()` outside the pieces above (6720 to 7630, about 900 lines of wiring), `pcTransportLayout` and the transport room code (7634 to 7912), `setupPanelGlow`, the rate stepping and `syncRateUI` (7913 to 8235), the project-name and canvas-dialog Apply wiring after 8330, drag and drop and `handleFiles`' callers, and the keyboard handler's other branches (A, S, D and clip keys, 8960 to 9151).
