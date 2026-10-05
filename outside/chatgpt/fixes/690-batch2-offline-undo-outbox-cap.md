# Offline Undo/Redo outbox accounting (batch2 §1b.7 / #1019)

Starting commit: `ed27177e40d987d270d48ed6d8096bcd8814198c` in isolated `codex/690-batch2-outbox-undo`. Checked the exact #1019 `REQUESTS.md` entry and batch2 `VERIFIED.md` §1b.7; broad `audits/*.json` outbox searches found no matching duplicate.

All guest transactions now enter the outbox through one accounting helper, including regular edits, Undo/Redo and reload recovery. Undo/Redo stops when the outbox is already full and returns its step to the stack. Acks subtract only counted entries and cannot push the counters below zero. One focused `{ item: 'TBD' }` regression makes a 1200-layer offline edit, alternates Undo/Redo past the 5000-op cap, checks the read-only signal, drains acks, and crosses the cap again.

Changed: `js/collab-session.js`, `tests/tests.js`, `index.html` (collab-session cache 13→14).

Node syntax and `git diff --check` passed. The focused browser regression is pending because the shared `.ship-in-progress` marker is active; this commit is staged only and must not be fast-forwarded to the preferred branch until the pending browser checks pass.

Local only; no shared Claude checkout edit, push, PR or deployment.
