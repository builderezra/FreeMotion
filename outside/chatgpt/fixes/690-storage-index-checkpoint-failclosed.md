# #1049 — keep media when an index or checkpoint cannot be read

- Starting commit: `bd56f3c71f6879aeed75044f9b07cdb58d5cb830` (`codex/690-legacy-migration-guard`, restored from its verified bundle after the earlier temporary clone disappeared).
- Source: shared `REQUESTS.md` #1049 and batch3 `VERIFIED.md` §1 item 10; audit JSON and prior local reports did not contain this exact fix.
- Changed: `js/storage.js`, `index.html`, `tests/tests.js`.
- A strict reader distinguishes a missing index from corrupt bytes. The boot sweep and project delete stop before media deletion when an index, another project document, or a collaboration checkpoint cannot be read. Index writers refuse to overwrite unreadable data.
- Checks: the focused muted Chromium regression passed (1/1) with malformed template, element and font indexes, a checkpoint read error, damaged peer project, and a clean orphan-collection control. Changed JavaScript syntax and diff checks passed.
- Staged locally; not promoted, pushed or released.
