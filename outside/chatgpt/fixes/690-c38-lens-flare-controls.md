# C38: Lens Flare controls and percent position display

Starting commit: clean `e69dae17565da029b31e4e5f842137658bff61dd`; isolated branch `codex/690-c38-lens-flare`. Verified against standing #690 in `REQUESTS.md:27375-27399`, §6.5 and C38 in `tools/design/plans/2026-09-29-idle-backlog/backlog.md`, and the audit inventory. `audits/912-audit.json` contains a separate Lens Flare zoom/crop issue; it is not this finding.

Lens Flare now offers Core size, Rays, Rotation, Ghosts, Ring and Anamorphic streak. The custom renderer gives rays a selectable count and angle, places ghost discs along the lens axis, draws a soft ring, and adds a streak in the chosen rotation. All six controls are opt-in with defaults that route through the unchanged legacy kernel. Light X/Y display as percentages while saved values and keyframes remain fractions, so old project positions do not migrate or shift.

Changed files: `js/compositor.js`, `js/fx-registry.js`, `js/inspector.js`, `index.html` (compositor 287→288, registry 25.53→25.54, inspector 416→417), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

Checks: new focused browser regression passed 1/1, including eight ray peaks and visible responses from all new controls; existing queue 474 exact six-ray comparison passed 1/1. JavaScriptCore syntax and diff checks passed. No shared Claude/protected-file edit, push, PR, deployment or release. The separate zoom/crop audit and installed-device appearance remain unverified.

Integrated into the reviewed local branch as `0cae1018` after reconciling the C37 Roughen registry and compositor cache tag 290. The new focused regression and existing exact six-ray comparison each passed 1/1 on the combined branch; JavaScriptCore syntax and diff checks passed. The first legacy check encountered a transient incomplete test-frame load, and its retry passed.
