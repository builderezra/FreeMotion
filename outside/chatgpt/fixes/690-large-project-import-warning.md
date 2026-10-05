# Warn before opening a very large project file

Starting commit: `e877b6609bed9833655e39273ec5794a90afbca1` (`codex/690-export-frame-cleanup`).

The project picker now warns before reading files larger than 300 MB, while still allowing the import. For a freshly parsed project file, layer IDs are remapped in that parsed array instead of making another full deep copy; other callers retain the copy behavior. Media warning checks follow the remapped IDs.

Changed files: `js/storage.js`, `index.html` (storage cache 75), `tests/tests.js` (one `TBD` warning/order and in-place regression).

Checks: focused production-handler Node checks passed warning-before-read, small-file control and in-place re-ID; changed-JS syntax and `git diff --check` passed. Browser regression remains pending under the Claude ship lock; this branch is not promoted to the preferred checkpoint until it passes.
