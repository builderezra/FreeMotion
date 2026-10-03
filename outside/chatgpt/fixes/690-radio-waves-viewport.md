# Radio Waves viewport alignment — local fix report

Starting commit: `410a34d13a5d86ca1e6d07b4061199f44d1b193a` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag), and `tests/tests.js` (the focused `{ item: 'TBD' }` Radio Waves regression now covers a cropped viewport).

Radio Waves' X/Y are project-frame percentages. When the editor zooms into a cropped preview, the canvas plate has a smaller width and an origin offset. The new effect originally used a percentage of that crop, so its centre would move as the user panned even though export stayed fixed. It now converts project coordinates through the plate's origin and scale.

Read: B28 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1236`, #690 at `REQUESTS.md:27376-27403`, and the existing `nestedPlate`/canvas dispatch offset contract. No separate matching request or audit record was found in `REQUESTS.md` or `audits/*.json` on this snapshot.

Ran: a focused production-renderer probe produced the expected centre (50,30) on a 100×60 crop starting at project (50,20) of a 200×100 project. JavaScriptCore syntax and `git diff --check` passed. Browser preview/export visual comparison remains unverified.
