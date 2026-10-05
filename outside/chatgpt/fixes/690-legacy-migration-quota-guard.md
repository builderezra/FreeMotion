# #1006 — legacy scene survives a full-device migration

- Starting commit: `d8a5ed4fd3f5639a2ef8c2b6ac53bb6236cca1bb` (`codex/690-unreadable-prune-guard`).
- Source: shared `REQUESTS.md` #1006 and batch1 `VERIFIED.md` §1.7; audit JSON search found no exact duplicate.
- Changed: `js/storage.js`, `index.html`, `tests/tests.js`.
- Migrating the old `fm.scene` document now checks that the new project document landed and can be read back before deleting the only old scene. If the copy fails, the new pointer is cleared so boot can retry; if the card index fails after the document lands, both source and new document remain for safe re-indexing.
- Checks: focused Node run of the production migration passed quota refusal and successful control; changed JavaScript syntax and diff checks passed. The focused `TBD` browser regression remains pending under the active Claude ship lock.
- Staged locally; not promoted, pushed or released.
