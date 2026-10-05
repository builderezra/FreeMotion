# #1033 Multi-file import error regression

Starting commit: `c3154e1c13d33bfabd206a92d01d3f69fd6f32fe` on isolated `codex/690-batch2-import-file-error`.

Added one focused `{ item: 'TBD' }` regression that feeds a failing image followed by a readable image through the actual multi-file import handler. It checks that the error names the unreadable file and preserves the underlying failure, while the later file still imports. The handler already continues per file, so no application code or script cache tag changed.

Changed files: `tests/tests.js`, this report.

Checks: focused Node execution of the production import handler passed the two-file case; test JavaScript syntax and `git diff --check` passed. Browser regression pending until the shared Claude ship lock is absent; no Chromium ran under the lock.
