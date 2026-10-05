# #1045 — Tell the truth when a preset cannot be saved

Starting commit: `22f6531325858475bba2019ad0aceac45e51eb89` (`codex/690-batch3-unicode-filenames`). Sources checked: exact `REQUESTS.md` #1045 and batch3 `VERIFIED.md` §1 item 6; audit JSON preset words refer to other findings.

Effect and layer preset writes now return whether localStorage accepted them. The Save controls only announce success after a successful write; a refused write says “Storage full — preset not saved” and leaves the list unchanged. Rename writes before moving tags, and Update propagates a refused write.

Changed files: `js/inspector.js`, `js/app.js`, `index.html` (inspector/app caches 419→420 and 485→486), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The regression refuses both preset index writes, checks the visible warning and unchanged lists, then confirms normal saves still work.

Checks: focused production-method Node behavior passed refusal, success and rename-order checks; changed JavaScript syntax and `git diff --check` passed. The browser regression is **pending** while `.ship-in-progress` prohibits Chromium. Keep this commit staged until it passes.
