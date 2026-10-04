# #690/C31 — temporal holds follow a translating null parent on cold seeks

Starting commit: `d4ef276e0025e85cb8ef5ead80ded88f7990b278` (`codex/690-reviewed-local`).

Frame Stutter and Time Warp Scan already redraw historical source pictures for a simple vector shape. They excluded every parent, so a child carried by a moving null could show its parent at the playhead instead of the hold boundary or scan crossing. A single-level null with keyed X/Y translation, no behavior, rotation, scale, mask or split ancestry is now eligible for the historical source path. The parent's transform is evaluated at the sampled time by the existing layer renderer. Rotating/scaling parents remain excluded: a rotated trial showed small antialiasing differences when rasterized in the cropped scan-strip viewport, and full-plate historical redraw is too slow for a long sweep.

Changed files: `js/compositor.js` (narrow parent eligibility), `index.html` (compositor cache 293), `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Checks: the moving-null-parent browser regression passed for both Frame Stutter and Time Warp Scan. JavaScriptCore syntax and `git diff --check` passed. A second parentless scan run could not reach assertions because two app-frame launches missed unrelated scripts; the same parentless test passed before this change on the identical renderer path. No broad suite was run.

Remaining C31: rotating/scaling or behavior-driven parents, masks, upstream/downstream effects, Time Warp Scan media, and Frame Stutter's other complex stacks. This is a partial local fix, not a release.
