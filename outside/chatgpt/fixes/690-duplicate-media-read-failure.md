# #1003 — project duplication refuses an unreadable clip

- Starting commit: `3feb7fbf578470fc84b42c462dedf6b79604798c` (`codex/690-failed-import-rollback`).
- Source: shared `REQUESTS.md` #1003 and batch1 `VERIFIED.md` §1.4; audit JSON search found related duplicate findings, but no fix for this IDB read-error path.
- Changed: `js/storage.js`, `js/home.js`, `index.html`, `tests/tests.js`.
- Project copies now use a strict media reader: an IDB read error rejects the incomplete copy and invokes the existing rollback, while a genuinely absent record keeps its prior behavior. Home explains that either reading or saving a file may have failed; it no longer incorrectly claims storage is full.
- Checks: focused Node run of production `idbGet` passed success, absence, asynchronous and synchronous errors, and ordinary-read control; changed JavaScript syntax and diff checks passed. The focused `TBD` browser regression for failed duplicate, no new card/document and valid control remains pending while `.ship-in-progress` forbids Chromium runs.
- Staged locally; not promoted, pushed or released.
