# #1036 Phone rotation into Studio regression

Starting commit: `0dc0bf92f234802e4c0753cb298ee01722c40b06` on isolated `codex/690-batch2-rotate-studio`.

Added one focused `{ item: 'TBD' }` regression that resizes the app’s test iframe from 390×844 to 844×390, crossing the 700px phone/Studio boundary. It checks that a selected layer, its inspector panel and the playhead remain available after the transition. The existing resize handler only clears phone chrome, so no application script or cache tag changed.

Changed files: `tests/tests.js`, this report.

Checks: focused Node execution of the production breakpoint handler preserved selection/time while clearing phone controls; test JavaScript syntax and `git diff --check` passed. The viewport and inspector browser regression is pending until the shared Claude ship lock is absent; no Chromium ran under the lock.
