# #1028 Preview canvas accessible name

Starting commit: `2bce988dc0604fdcbcba862c8c93011b42bbb797` on isolated `codex/690-batch2-preview-name`.

The main preview canvas now exposes `role="img"` and `aria-label="Video preview"`, so screen readers can identify the editing surface. The rendered preview and pointer behavior are unchanged.

Changed files: `index.html`, `tests/tests.js` (one focused `{ item: 'TBD' }` regression), this report. No application script changed, so no script cache tag needed a bump.

Checks: focused static markup assertion, test-file JavaScript syntax and `git diff --check` passed. Browser regression remains pending until the shared Claude ship lock is absent; no browser or Chromium test ran under the lock.
