# B32 Oil Paint — local build report

Starting commit: `b15ff479eacd62c825999ccfaa1c3fc2f30a485d` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (effect controls, reusable summed-area tables and Kuwahara pixel kernel), `js/fx-registry.js` (Stylize listing), `index.html` (script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Oil Paint selects the lowest-variance neighbouring colour region from four or eight directions, with brush size, edge sharpness, colour levels and Mix controls. Transparent pixels keep their original alpha. Large plates work at half resolution to limit frame cost.

Read: B32 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1240`, #690 at `REQUESTS.md:27376-27403`, and existing Stylize pixel effects. Exact searches found no existing Oil Paint request or audit finding on this starting snapshot.

Ran: JavaScriptCore parsed the three changed JavaScript files. One focused production-kernel probe confirmed Mix 0 identity, edge preservation, texture smoothing and alpha preservation on a small image, then exercised the large-plate path. One 720×1280 Mac JavaScriptCore frame took about 91 ms; this is not browser or iPhone performance. `git diff --check` passed. Browser visual quality and phone playback remain unverified.
