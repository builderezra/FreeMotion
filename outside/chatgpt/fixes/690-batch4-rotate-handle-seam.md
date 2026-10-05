# Batch 4: rotate handle crosses the left-hand seam smoothly

Starting commit: `d9ae8777581851a20148b8b8b5c315ac7dd934a7` (`codex/690-batch4-hold-speed`).

The rotate handle used the raw difference between two `atan2` readings, so crossing the angle seam at the left of the pivot jumped the displayed rotation by 360°. It now accumulates each wrapped pointer step. An ordinary drag stays smooth and deliberate full turns still reach 360°.

Changed files: `js/canvas-edit.js`, `index.html` (canvas-edit cache 122), `tests/tests.js` (one `TBD` seam/control regression).

Checks: focused production-branch Node check passed 170°→190°, 10°→30°, and a full turn with 2° maximum adjacent steps; changed-JS syntax and `git diff --check` passed. Browser regression remains pending under the Claude ship lock; this branch is not promoted to the preferred checkpoint until it passes.
