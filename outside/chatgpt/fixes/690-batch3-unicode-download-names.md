# #1044 — Keep project and template names in downloads

Starting commit: `422ef078214aee934c8ca2a160d2501ad9f3ae95` (`codex/690-batch3-multifile-undo`). Sources checked: exact `REQUESTS.md` #1044 and batch3 `VERIFIED.md` §1 item 5; the audit JSON has no matching filename finding.

Project and template downloads now share one filename helper. It keeps Cyrillic, CJK, Arabic, accents and emoji, replacing only filesystem-invalid and control characters. It removes leading/trailing dots and caps at 80 whole Unicode code points, retaining the project/template fallback.

Changed files: `js/storage.js`, `index.html` (storage cache 73→74), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The regression checks representative names, illegal characters and long emoji, then captures the actual download names from a project and a template.

Checks: focused production-helper Node behavior passed Unicode preservation and whole-code-point truncation; changed JavaScript syntax and `git diff --check` passed. The browser download regression is **pending** while `.ship-in-progress` prohibits Chromium. Keep this commit staged until it passes.
