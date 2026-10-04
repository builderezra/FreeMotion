# 690 / C31 — keyed Levels before Time Warp Scan on still images

Starting commit: `f9e801335701ead71fc20953e6cdd41eac835d10` (`codex/690-reviewed-local`).

A moving still image with animated Levels before Time Warp Scan was excluded from historical source reconstruction. A cold seek therefore reused the current graded source across old strips. The synchronous still-image redraw now accepts point-local Levels and evaluates its keyframes at each crossing. Unproved upstream effects and downstream stacks remain gated. The still-image MP4 resume renderer identity advances from 3 to 4 so an interrupted export cannot reuse an older prefix.

Changed files: `js/compositor.js`, `js/exporter.js`, `index.html` (compositor/exporter cache tags), `tests/tests.js` (one focused `TBD` regression and existing resume assertion), and this report.

Checks: new Chromium regression failed before (cold=0 versus played=41 at a crossed pixel), passed after at 120/60 px in Freeze/Reveal with a live-frame control. Adjacent moving-still regression including MP4 resume passed. JavaScriptCore parsed changed scripts and `git diff --check` passed. Two unrelated app-bootstrap omissions were retried, one before and one after the fix.

Local Codex-only checkpoint; no shared Claude edit, push, PR, deployment or claim that all C31 combinations are solved.
