# Scanlines keeps its position through keyed Roll changes

Starting commit: `802b8417d1831c6be7bc99fa2350e58368830f47` on the clean reviewed checkpoint. Isolated branch: `codex/690-scanlines-roll-phase` in `/private/tmp/freemotion-scanlines-roll-20261004`.

`REQUESTS.md:27375-27399` keeps #690's effect bug hunt and polish open. `audits/912-audit.json:843-851` records the analogous confirmed keyframed-rate rewind and recommends integrating elapsed rate. Scanlines exposes keyframable Roll in `js/compositor.js:170-175`; `REQUESTS.md:32132-32133` records a completed, distinct Line weight fix.

Scanlines used current Roll multiplied by all elapsed time for its vertical offset. Keyframing Roll from 5 px/s to zero at 0.5 s therefore reset the lines to their first-frame position. Keyed Roll now integrates its rate over time; numeric Roll keeps the original multiplication. The default every-other-row fast path runs only when both current Roll and accumulated offset are zero, so a stopped keyed Roll retains its traveled position. Numeric zero and the existing Line weight behavior remain unchanged.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 272 → 273), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The regression compares the stopped keyed render at 1.25 s with numeric Roll 2 at 1.25 s, checks it remains still at 2 s, and covers both custom 6/2 lines and the default 2/1 pattern plus numeric zero. It failed on the starting code with “Scanlines rewound when keyed Roll stopped at pitch 6” and passed after the fix. JavaScriptCore loaded and executed the changed scripts; `git diff --check` passed. Browser and installed-device rendering remain unverified. No push, PR, deployment, protected-file edit, or shared Claude checkout edit.
