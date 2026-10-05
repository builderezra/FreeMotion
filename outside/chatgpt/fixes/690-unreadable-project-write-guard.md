# #1004 — unreadable project survives a later flush

- Starting commit: `309a618e49a282acf7066438824a4d74e43ee72e` (`codex/690-duplicate-read-failure`).
- Source: shared `REQUESTS.md` #1004 and batch1 `VERIFIED.md` §1.5; audit JSON search found no exact duplicate.
- Changed: `js/storage.js`, `index.html`, `tests/tests.js`.
- When an existing project document is unreadable, its original bytes are kept and copied to a recovery key where space permits. That tab refuses to save a blank scene over the unreadable original. A genuinely missing document keeps its existing behavior.
- Checks: focused Node run of the production load and save-guard branches passed corrupt and missing-document cases; changed JavaScript syntax and diff checks passed. The focused `TBD` browser regression remains pending under the Claude ship lock's Chromium ban.
- Staged locally; not promoted, pushed or released.
