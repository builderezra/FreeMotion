# AU10: audit of js/app.js, second third: lines 3051 to 6100 (main fba44ca8)

Branch `hunt/audit-app-2`. **Measured** = I ran it here (headless Chromium, 1280 and 380), **Read** = I read the code, **Guess** = I did not check. Thirds by line count: AU9 = 1 to 3050, AU10 = 3051 to 6100, AU11 = 6101 to 9151. This third holds the layer creators, selection, delete, group and ungroup, duplicate and paste, replace media, move and extend, align, import and the export dialog.

**Bottom line, honestly.** The document operations here are in good shape: **group and ungroup are pixel-exact** and **duplicate is exact**. I found one real bug, in **Align**, and fixed it.

## Fixed, red on main and green with the fix at 1280 and 380, five mutations CAUGHT

| # | Where | What he sees | Repro | Fix |
|---|---|---|---|---|
| AU10-1 | `FM.alignLayers` (`app.js:3429`), the Align buttons | **Align does not put a layer on the canvas edge or centre when the layer is inside a group, or turned.** The arithmetic treats `transform.x` and `.y` as the centre in project pixels with the layer's UNTURNED size, which is only true for a layer with no parent and no rotation. **Measured:** a member of a group offset 60 px: Align left left it 60 px from the edge (leftmost pixel at x = 60); a layer turned 37 degrees: Align left put its drawn box 3.98 px OFF the canvas on the left (an 80x40 layer turned 45 degrees showed its far edge at 82 where the box needs 84.8). I did not measure the scaled and turned group case on main (the test stops at the first miss, the turned layer); the same group case WITH the drawn-box path but without pinning the pivot was 15 px off (mutation A2), which is why the pin is there. A plain layer was right. There is no test of `alignLayers` anywhere in the suite today. | `AU10-1` (control: a plain layer keeps its exact old numbers) | for a layer with a parent or a turn, measure the box the renderer draws (`FM._layerAABB`, parents included), move it by the difference, turned back into the parent's own axes (the inverse of the parent frame), after pinning the group pivots above it (`settleGroupPivotsAbove`, as ungrouping does, because a floating pivot moves when a member moves); every other layer keeps the old code and the exact old numbers |

Mutations (all CAUGHT, `au10_mut.log`): the drawn-box path never used (A1), group pivots not pinned (A2), parent axes ignored (A3), the right edge computed from the wrong side (A4), and the plain layer taking the new path (A5, caught by the "exact old numbers" control). Busters bumped: `app.js?v=469`.

`audit-app-2-scripts/`: `au10-tests.js` (append before `async function run()`; `?only=AU10`), `au10-fixes.patch`, `au10_mut.sh`, `au10_mut.log`.

**One behaviour change to know about:** Align on a grouped or turned layer now writes a value rounded to 0.01 (an exact box), where a plain layer still gets a whole number. **Not changed, Read only:** `FM.distributeLayers` sorts and spaces by each layer's own local x or y, so layers inside DIFFERENT parents are spaced in different frames; inside one group it is right (equal local steps are equal drawn steps). It is a smaller case and I left it.

## Tried and held up (Measured)

- **Group then Ungroup, 12 random scenes** (2 to 4 shapes, random position, turn, scale, opacity, some with keyframed x): the picture at four times is identical, 0 pixels differ.
- **A group whose static transform (turn, scale, x, y, opacity, or all) was changed, then ungrouped:** 0 pixels differ in 12 of 12.
- **An ANIMATED group transform, then ungrouped:** the picture DOES change, and that is by design: `bakeGroupTransform` says "this group's position is animated, so the layers go back to their own positions" and `ungroup` names it in a toast (queue 739); an animated group opacity, effects and blend mode are named the same way (`bakeGroupLook`). Refuted, not logged.
- **Duplicate of a group (members, a parented layer inside):** the copies parent to the copied group, none points at an original, and the picture is identical whichever of the two is shown.

## What I read, and how closely

Line by line: `alignLayers`, `distributeLayers`, `alignTargets`, `snapAxis`, `moveLayers` (3421 to 3456, 5370 to 5421), `addMediaLayer`'s neighbours and `insertLayer` (already covered in AU9), `bakeGroupTransform`, `bakeGroupLook`, `ungroup` (4073 to 4183), the parent-bake helpers (3825 to 3870).

**Not read, no claim either way:** the layer creators `addTextLayer`, `addNullLayer`, `addShapeLayer`, `addPathLayer` and the path refit (3128 to 3420), `selectLayer` / `toggleSelect` / `deleteLayer` / `rehomeOrphans` (3513 to 3797), `groupSelection` and its parent planning (3869 to 4072), `snapshotPNG` and `fitToContent` (4227 to 4305), copy and paste (4363 to 4625), `replaceMedia` and its restore (4625 to 4799), `moveClipTo` / `extendClipTo` beyond what AU4 exercised (4799 to 5110), the layer menu (5207 to 5342), import (`handleFiles`, 5489 onward) and the export dialog and `runExport` (5550 to 6100, which AU6 touched from the exporter's side).
