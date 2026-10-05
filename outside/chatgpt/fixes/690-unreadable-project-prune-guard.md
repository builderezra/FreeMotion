# #1005 — boot cleanup preserves media when a project cannot be read

- Starting commit: `364096857edcd263a15037f572adef234a84a5b4` (`codex/690-unreadable-project-guard`).
- Source: shared `REQUESTS.md` #1005 and batch1 `VERIFIED.md` §1.6; audit JSON search found no exact duplicate.
- Changed: `js/storage.js`, `index.html`, `tests/tests.js`.
- The boot media sweep now stops before deleting anything when any real project document lacks a readable layers array, and checks again immediately before its deletion pass. The `.unreadable` recovery copy made by #1004 is recognized as a backup rather than another project. A later boot can sweep once documents are readable again.
- Checks: focused Node run of the production keep-set passed backup, corrupt-project and clean controls; changed JavaScript syntax and diff checks passed. The focused `TBD` browser regression for preserving an otherwise orphaned blob, then deleting it after removing the bad document, remains pending under `.ship-in-progress`.
- Staged locally; not promoted, pushed or released.
