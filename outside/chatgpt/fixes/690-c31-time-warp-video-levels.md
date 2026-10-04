# 690 / C31 — keyed Levels before Time Warp Scan on decoded video

Starting commit: `b700726b08becf116f913fa6177ec5d76e87082e` (`codex/690-reviewed-local`).

A decoded video with animated Levels before Time Warp Scan was still excluded from historical sampling, so a cold seek filled earlier scan strips from the current source frame. Levels is a point-local grade. The video plan now accepts it before the scan; historical frames evaluate the keyed grade at each crossing. Other unproved effect stacks remain gated. MP4 resume renderer identity advances to `c31-video-timewarp-4` so an interrupted export cannot reuse an older prefix.

Changed files: `js/compositor.js`, `js/exporter.js`, `index.html` (compositor/exporter cache tags), `tests/tests.js` (one new focused `TBD` regression and the existing identity expectations), and this report.

Checks: new Chromium regression failed before the implementation because the plan was excluded; after the fix it passed cold-versus-continuous sampling at 128/64 px, visible keyed-grade control, and main MP4 output. The adjacent keyed Brightness/Contrast video regression passed. JavaScriptCore parsed the changed scripts; `git diff --check` passed. An intermediate test control was too close to the encoded MP4 sample and was strengthened; one unrelated browser fixture initialization failure was retried once.

Scope: local Codex-only checkpoint. No push, PR, deployment, shared Claude checkout edit, or claim that all C31 stacks are solved.
