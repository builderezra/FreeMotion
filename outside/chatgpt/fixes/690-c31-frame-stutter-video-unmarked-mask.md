# #690 / C31 — Frame Stutter below an unmarked pen mask on video

Starting commit: `dc77b4fd9465c76de4d48be96f3fc4324b7f8b25` on isolated `codex/690-c31-stutter-video-unmarked-mask`.

A decoded video with one unmarked pen mask was excluded from Frame Stutter's cold-seek planner. That mask wraps the held picture, so its keyed path belongs to the current playback time while the decoded video belongs to the historical hold boundary. The planner now admits this narrow case. Marked, multiple, disabled, or combined vector/unmarked-mask stacks retain their own existing paths or gates.

Changed files: `js/compositor.js` (narrow unmarked-mask admission); `js/exporter.js` (video boundary resume identity 6); `index.html` (compositor/exporter cache tags 338/156); `tests/tests.js` (one new `TBD` regression and prior identity expectations); this report.

The new Chromium regression failed before because no boundary source was prepared. After the change it passed at 128 and 64 px: cold and sequential frames matched, the outer mask followed its current keyed path instead of freezing at the hold boundary, removing it changed visible pixels, and a one-frame main MP4 export completed. The adjacent combined-mask video/MP4 regression passed. JavaScriptCore syntax and `git diff --check` passed. No Worker export or arbitrary multi-mask behavior is claimed here.

Local only; no shared Claude checkout edit, push, PR, deployment or release.
