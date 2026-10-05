# #1063 — rotate-handle browser gate

- Starting commit: `8d9132c9f16b13455ef5718dd02867318e0c5864`; branch `codex/690-rotate-seam-gate` in the existing isolated Codex worktree.
- Source: shared `REQUESTS.md` #1063, batch4 `VERIFIED.md` §1 item 5, and the staged `690-batch4-rotate-handle-seam.md` report. Product fix and its one `{ item: 'TBD' }` regression were already present; this checkpoint corrects that regression's setup.
- Changed: `tests/tests.js` and the existing #1063 report. The selection box is created lazily when a layer is selected, so the regression now reads it after selection. No product script changed; no cache bump.
- Checks: focused muted Chromium passed (1/1); JavaScript syntax and diff checks passed. Temporary mute-driver edit was restored.
- Local only; not promoted, pushed or released.
