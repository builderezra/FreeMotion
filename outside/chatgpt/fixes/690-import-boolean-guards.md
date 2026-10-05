# #1052 — imported camera and reminder switches require booleans

- Starting commit: `ef34e31c57c11881023970c20275f72186c0caf1` (`codex/690-storage-index-failclosed`); new branch `codex/690-import-boolean-guards` in the existing isolated Codex worktree.
- Source: shared `REQUESTS.md` #1052 and batch3 `VERIFIED.md` §1 item 13, with its `sanitiser-types.md` evidence. Search of shared `audits/*.json` found no exact duplicate of ST-6/ST-10.
- Changed: `js/storage.js`, `index.html`, `tests/tests.js`.
- Camera focus and fog now enable only on JSON `true`. Imported notes retain valid ids and text, but normalise `remind` to a real boolean and discard unknown fields; a valid note keeps its object identity.
- Checks: focused muted Chromium regression passed (1/1) for quoted `"false"` and real `true` controls; changed JavaScript syntax and diff checks passed.
- Local only; not promoted, pushed or released.
