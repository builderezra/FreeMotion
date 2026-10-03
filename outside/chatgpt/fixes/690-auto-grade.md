# B51 Auto Grade — local build report

Starting commit: `6d538904e84d4fe63eafa5a3d77dca8ed5fc2064` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (Auto Grade effect and temporal analysis), `js/fx-registry.js` (Colouring registration), `index.html` (script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Auto Grade offers Levels (independent RGB percentile endpoints), Contrast (shared luminance endpoints) and Colour (shared contrast plus a bounded grey-world colour balance). It samples up to roughly 4,000 visible pixels per frame, limits gain to 4×, and applies the result through three 256-entry lookup tables. Temporal smoothing blends measured statistics across adjacent forward frames. It resets on a seek, mode/resolution change or preview/export switch, so prior preview history cannot colour the first exported frame. The full-frame pixel path avoids grading a different cropped region as the preview zoom changes.

Read: B51 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1264`, exact #690 at `REQUESTS.md:27376-27403`, request/audit searches for this feature, the existing Temporal Denoise state reset and Match Grade statistics code, and the preview/export compositor route.

Ran: JavaScriptCore parsed the changed scripts and test source. Two focused production-kernel probes checked all three modes, temporal smoothing and seek reset; `git diff --check` passed. Browser playback, preview/export visual parity and phone performance remain unverified.
