# Offline guest edits during reconnect use clash checks

Starting commit: `3170a94c8d572b7a7cc8b58bcb90a0a3e708a0b0` on isolated `codex/690-batch2-offline-clash`.

Verified source: `tools/design/chatgpt-tasks/reports/batch2/VERIFIED.md` §1b item 3 and `REQUESTS.md` #1015. No matching duplicate was found in `audits/*.json`.

When a guest edits again after the link reopens but before the owner's catch-up copy arrives, the new transaction now remains queued for the host's compare-and-swap check. Undo takes the same path. During catch-up, an unchanged stale guest value is not emitted again with the owner's newer value as its baseline; that echo had bypassed the apparent fix and could still overwrite the owner. Catch-up ends only after the copy arrives and outstanding transactions are acknowledged.

Changed: `js/collab-session.js`, `index.html` (collaboration session cache 12→13), and one `{ item: 'TBD' }` regression in `tests/tests.js`.

Checks: the new browser regression failed before the fix (`q:0`) and passed after for both a second edit and Undo; adjacent offline-outbox regression passed. Node syntax checks for changed scripts and `git diff --check` passed.

Local only; no shared Claude checkout edit, push, PR or deployment.
