# #1034 Large animated GIF frame budget regression

Starting commit: `8f2472c8836663330c8e724828220d4076db0b99` on isolated `codex/690-batch2-gif-budget`.

Added one focused `{ item: 'TBD' }` regression using a tiny-file, 1800×1800 three-frame GIF. It drives the existing decoder past its 32 MiB frame budget, checks that the cached frames shrink within the budget, records that the compositor draws them across the original image box, and verifies that removing the media record closes the bitmaps. The application already has these paths, so no script cache tag changed.

Changed files: `tests/tests.js`, this report.

Checks: production GIF decoder run in a focused Node harness produced three 1672×1672 cached frames under 32 MiB; test JavaScript syntax and `git diff --check` passed. The full compositor/release browser regression is pending until the shared Claude ship lock is absent; no Chromium ran under the lock.
