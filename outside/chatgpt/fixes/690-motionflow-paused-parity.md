# #1062 — paused Pixel Motion preview matches export

- Starting commit: `f249c1bd88d2fddd4876ec9b9516fd6a8ffe411d`; branch `codex/690-motionflow-parity` in the existing isolated Codex worktree.
- Source: shared `REQUESTS.md` #1062 and batch4 `VERIFIED.md` §1 item 4 (PEP-1). Shared `audits/*.json`, prior reports, and branch history showed no exact duplicate.
- Changed: `js/compositor.js`, `index.html` (compositor cache 380), `tests/tests.js` (one focused `{ item: 'TBD' }` regression).
- The parked preview now builds Pixel Motion's smear at the same 720 px working width as export. Playback retains 480 px to protect frame rate. The flow field and Directional Smear style are unchanged.
- Checks: before the fix, the 1080 px moving-frame probe differed in 390,784 channels (maximum delta 97); measured kernel time was 23.3 ms at preview's 480 px and 42.1 ms at export's 720 px. After the fix, the focused muted Chromium regression passed (1/1): paused preview and export match within two levels, playing retains its lower-cost tier, and Directional Smear remains identical. Changed JavaScript syntax and diff checks passed.
- Local only; not promoted, pushed or released.
