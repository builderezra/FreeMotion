# AU4: audit of js/history.js and js/scene.js on main v17.31 (undo and redo, byte for byte)

Against `origin/main` 7125ecff. Branch `hunt/audit-scene`. **Measured** = I ran it here (headless Chromium, the suite's own driver, 1280 and 380), **Read** = I read the code, **Guess** = I did not check.

**Bottom line, honestly.** The document model held up better than I expected: a randomised sequence of real commands (add shapes / null / adjustment, keyframes, duplicate, delete, split, group / ungroup, flip, move, reorder, copy / paste, background) then undo all the way down and redo all the way up lands on the recorded snapshot **byte for byte on every step, in 20 random sequences (about 40 steps each, so about 800 undos and 800 redos in all; the 20-round run was in a probe, the suite test runs 4 rounds)**, and a canvas resize (five size changes with keyframes, text, captions, a path and an effect) round-trips exactly. The two bugs I found are both in how undo **meets the text editor**, not in the snapshots.

## Fixed, each red on main and green with the fix (1280 and 380), each with a mutation that is CAUGHT

| # | Where | What he sees | Repro test | Fix |
|---|---|---|---|---|
| AU4-1 | `restore()` in `js/history.js` | **Add text (or Add captions), press Undo, and Redo is gone for good.** The editor is open on the new layer; undo removes the layer, `refreshAll` runs inside `restore()`, the editor sees its layer is gone and closes itself with a `commit()`. At that moment `stack[index]` still names the OLD selection (the re-stamp that `restore()` returns is applied by `undo()` only after `restore()` returns), so that commit pushes a selection-only step and throws the whole redo tail away. `canRedo()` is false straight after the undo; the layer cannot be brought back. (Measured: text and caption, layers 2 to 1 to 1; a shape, with no editor, goes 2 to 1 to 2.) The v16.95 fix covered the CARD being open while he types, not this order of events. | `AU4-1` (control: a shape undoes and redoes) | `suppress` is held for the whole of `restore()` (try / finally, so a throw cannot leave commit dead for ever, the very trap the top of the file warns about), not only for the swap |
| AU4-2 | `FM.addEmptyGroup` in `js/app.js` | **Add group with the text editor open makes two history steps, and the first Undo appears to do nothing.** `FM.selectLayer` closes the editor, and its commit runs with the group already inserted and the old selection still on: step one is a copy of the half-done add (selection-only), step two is the real one. One Undo undoes the selection, so the group is still there. Measured over eleven adders with the editor open: only the group does it (the others write `selectedId` themselves before `refreshAll`). | `AU4-2` (control: no editor, one step) | `FM.textEdit.syncToSelection(g.id)` before the group is inserted, so the typing becomes its own step first (as it should) and the group is one step |

Mutations (all CAUGHT, `au4_mut.log`): suppress only during the swap again (A1), no editor close before the group (B1), and two that prove the byte-for-byte test can fail: restore skips the project (C1), restore keeps the old first layer (C2). Results at both widths for the new tests; the neighbouring undo and redo slice (1280) is green except two tests that say **NOT RUN HERE** in this container and are **identical on main** (`690 a project renamed on Home keeps its new name...`, `690 Undo and Redo keep open the effect whose slider he just moved...`). Busters bumped: `history.js?v=38`, `app.js?v=469`.

`AU4-3` is a guard, not a repro: it is **green on main** (the fuzz found no drift in the snapshots). It is in the set so the property cannot rot: any command that edits state outside the snapshot, or any `restore()` change that loses a field, fails it by name.

`audit-scene-scripts/`: `au4-tests.js` (append before `async function run()`; `?only=AU4`), `au4-fixes.patch` (against main; the app files on this branch carry them), `au4_mut.sh`, `au4_mut.log`.

## Measured and left alone (not bugs)

- **`project.duration` is the one field that does not round-trip byte for byte.** A snapshot taken right after `moveClipTo` (the A / D keys) stores the duration from before the project grows to fit the moved clip; after undo then redo the duration is the fitted one (e.g. 5 stored, 7 restored). It is a derived value that the refresh recomputes, the layers themselves are exact, and the screen is right. Logged so nobody chases it twice; the guard test compares everything except duration.
- **`FM.storage._sanitizeLayers` is idempotent on every shipped effect default** (398 effect and layer-type pairs, both directions: no byte changes after one pass). This is what makes `restore()` safe: it re-sanitises every snapshot, and a sanitiser that was not idempotent would change a layer on every undo.
- `evalProp` never returns a non-finite number for 3,000 random keyframe sets (unsorted, duplicate times, every ease, all three loop modes, times from -1 to 1e9).

## What I read, and how closely

Line by line: all of `js/history.js` (snapshot, restore, commit and its caps, undo, redo, the collab seams), `evalProp` (72 to 132), `cloneLayer`, `isAncestor`, `repairParentCycles`, `normalizeGroupOrder` (807 to 945). The speed and time functions (946 to 1085) were read in AU1 (reverse head grow) and are covered there.

**Not read closely, no claim either way:** the transform / keyframe editing helpers (290 to 660: `setTransform`, `shiftTransform`, `shiftLayerKeyframes`, `scaleLayerKeyframes`, `toggleKeyframe`, `dedupDraggedKfs`) beyond exercising them in the fuzz, `makeLayer` defaults (663 to 750), `isLayerVisibleAt` / `activeCaption` (1127 to 1200), and `rescaleProjectContents` beyond the five round-trips above. The fuzz only reaches commands that need no media file: clips with real video / audio sources (trim, speed ramps, replace file) are not in it.

## Candidates I tried to refute and dropped

- `commit()`'s 120-entry / 48 MB trim keeps at least 8 steps and `index` stays valid when the front is dropped (Read; the existing "degrades cleanly past the cap" test covers it).
- `cloneLayer` drops `_` keys through the replacer: no persisted `_` property exists (the fuzz would have seen a copy that differs from its original; it did not).
- A restored snapshot's selection is ignored on purpose (queue 690); the re-stamp keeps the stack entry byte-identical to what `snap()` would write.
