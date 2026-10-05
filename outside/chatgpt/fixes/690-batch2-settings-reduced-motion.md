# #1032 Settings reports jump and reduced motion

Starting commit: `6c542c1d10f12b68b52559e9ae0bd1e51b4abea1` on isolated `codex/690-batch2-settings-motion`.

Settings → Reports now jumps immediately when the device requests reduced motion; ordinary motion keeps the smooth scroll. The preference is checked when Show is clicked, so a live preference change applies without rebuilding Settings.

Changed files: `js/settings.js`, `index.html` (settings cache 54→55), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), this report.

Checks: focused Node execution of the production click handler passed for reduced `auto` and ordinary `smooth`, with the Reports section opened in both cases; changed JavaScript syntax and `git diff --check` passed. Browser regression pending until the shared Claude ship lock is absent; no Chromium ran under the lock.
