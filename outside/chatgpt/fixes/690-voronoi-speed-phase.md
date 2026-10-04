# Voronoi Cells keeps its motion when keyed Speed stops

Starting commit: `eb0e48410df72f3e0b67c246e1ccdda7b0066079` on the clean reviewed checkpoint. Isolated branch: `codex/690-voronoi-speed-phase` in `/private/tmp/freemotion-voronoi-phase-20261004`.

`REQUESTS.md:27375-27399` keeps #690's effect polish and bug hunt open. `REQUESTS.md:10553-10576` records Ezra's request for Voronoi cells to wander independently with Motion and Speed. The analogous keyed rate rewind is confirmed in `audits/912-audit.json:843-851` and recorded as #913 finding 4 in `REQUESTS.md:32459-32461`; that finding did not include Voronoi.

Voronoi multiplied its current Speed by all elapsed time. When a keyed Speed reached zero, every cell snapped back to its first-frame position. The animated path now integrates Speed into a phase, so slowing and stopping preserve the distance already traveled. The numeric path and an old instance with no Motion parameter retain their previous output.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 270 → 271), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The regression failed on the starting code with “Voronoi cells rewound to their first-frame positions” and passed after the fix. It checks a linear slowdown, a stopped hold, an equivalent numeric Speed, and the old no-Motion case. JavaScriptCore loaded and executed the changed scripts; `git diff --check` passed. Browser and installed-device rendering remain unverified. No push, PR, deployment, protected-file edit, or shared Claude checkout edit.

Integrated on the reviewed local branch as `329c5401`. The same focused regression passed there in JavaScriptCore, and changed-script syntax and diff checks passed. The branch remains local and unreleased.
