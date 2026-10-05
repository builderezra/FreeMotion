# #1001 — failed import rolls back its new project

- Starting commit: `1dfae9097227d0e1693ea58da5a1af860c99e4e7` (`codex/690-stale-media-guard`).
- Source: `REQUESTS.md` #1001 and batch1 `VERIFIED.md` §1.2, checked in the shared checkout; audit JSON search found no exact duplicate fix.
- Changed: `js/storage.js`, `index.html`, `tests/tests.js`.
- An exception or `false` from `applyScene` now returns to the project that was open before import, removes only the newly minted project and explains that the file could not be opened. A valid import still adds one project.
- Checks: focused Node run of the production `importObject` for thrown, false and valid outcomes passed; both changed JavaScript files passed syntax checks; `git diff --check` passed. The focused `TBD` browser regression remains pending while Claude's `.ship-in-progress` lock forbids Chromium runs.
- This is a staged local fix, not promoted, pushed or released.
