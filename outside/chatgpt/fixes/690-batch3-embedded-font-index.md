# #1042 — Keep embedded fonts after import

Starting commit: `368df604a363020d04d7c703cb6cb52df115c94b` (`codex/690-batch3-nested-groups`). Sources checked: exact `REQUESTS.md` #1042 and batch3 `VERIFIED.md` §1 item 3. The font-related audit JSON hits concern the earlier shared-media/font work, not this stale-index window.

An embedded font import now collects its new records, re-reads the index after its asynchronous font/blob work, and commits only families still absent. A refused index write rolls back this call's blobs and registration. Project import reports the specific font-storage failure; the boot sweep also refreshes font, template and element indexes before deleting candidates.

Changed files: `js/storage.js`, `index.html` (storage cache 72→73), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The regression overlaps an embedded font with a picker import, runs the orphan sweep, then refuses the font-index write and checks the warning plus blob rollback.

Checks: focused production-method Node behavior passed concurrent index preservation and failed-write rollback; changed JavaScript syntax and `git diff --check` passed. The browser regression is **pending** because the shared `.ship-in-progress` lock prohibits all Chromium runs during a ship. Keep this commit staged until that check passes.
