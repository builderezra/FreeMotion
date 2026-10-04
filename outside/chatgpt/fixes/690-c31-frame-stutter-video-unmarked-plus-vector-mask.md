# #690 / C31 — Frame Stutter video with unmarked pen and vector masks

Starting commit: `955841a5b8a37567b6a41d33de3b40c6d5d172aa` on isolated `codex/690-c31-stutter-video-unmarked-vector`.

A decoded video carrying an unmarked pen mask and a legacy vector mask was excluded from Frame Stutter's cold-seek boundary planner. The vector mask belongs to the historical held plate; the unmarked pen mask wraps it at the current time. The existing whole-plate redraw already preserves that order, so the planner now admits this one combination. Multiple or marked pen-mask arrangements keep their separate gates.

Changed files: `js/compositor.js` (narrow planner admission), `js/exporter.js` (main-video resume identity 7), `index.html` (compositor/exporter cache tags 340/157), `tests/tests.js` (one new `TBD` regression and prior resume-identity expectations), and this report.

The new browser regression failed on the old planner because it prepared no boundary source, then passed after the change at 128 and 64 px: cold-seek versus sequential parity, the outer pen mask's current-time path, separate nonvacuous controls for both masks, and a one-frame main MP4 export. The adjacent unmarked pen-mask regression passed. The first test mask accidentally hid every lit video pixel; the final fixture places the fixture's lit bar across both stencil edges. The headless CLI intermittently dropped unrelated app scripts, so the focused results were verified in the local in-app Chromium test runner. JavaScript syntax and diff checks passed. No Worker export or arbitrary multi-mask stack is claimed.

Local only; no shared Claude checkout edit, push, PR, deployment or release.
