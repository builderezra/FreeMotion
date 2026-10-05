# #1037 — EXIF-rotated JPEG canvas and export coverage

- Starting commit: `53a29df7f91bff04ea468516eac2453581f559d2`; branch `codex/690-exif-orientation-coverage` in the existing isolated Codex worktree.
- Source: shared `REQUESTS.md` #1037 and batch2 `VERIFIED.md` §4 item 6. No prior EXIF test, matching audit JSON, or duplicate local branch/report was found.
- Changed: `tests/tests.js` and a 1.2 KB synthetic `tests/_fixtures/exif-orientation-6.jpg`. No product script changed, so no cache tag changed.
- One focused `{ item: 'TBD' }` regression loads a JPEG whose stored 80×40 pixels have EXIF orientation 6, checks the upright 40×80 dimensions and four distinct colour quadrants, then checks the normal canvas, export-mode renderer, and actual export worker.
- Checks: focused muted Chromium regression passed (1/1); test JavaScript syntax, fixture EXIF tag/dimensions, and diff checks passed. The first browser attempt failed app-frame readiness and was discarded.
- Local only; not promoted, pushed or released.
