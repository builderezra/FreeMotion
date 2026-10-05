# Bound the frozen collaboration message queue (batch2 §1b.8 / #1020)

Starting commit: `0d7c3252d75e94c4a3a3e906a86f25749d926f08` in isolated `codex/690-batch2-held-queue`. Checked the exact #1020 `REQUESTS.md` entry and batch2 `VERIFIED.md` §1b.8; broad `audits/*.json` searches found no matching queue-cap record.

The document messages held during export or another busy editor action now have a 256-message and 4 MiB ceiling. At overflow, the held tail is discarded and no more is retained while frozen. When the editor is available, the owner rebuilds its live document from the authoritative host base; a guest requests a fresh host copy. One focused `{ item: 'TBD' }` regression sends more than 256 genuine Editor transactions to a frozen owner, checks the bound, then unfreezes and compares live/base hashes.

Changed: `js/collab-core.js`, `js/collab-session.js`, `tests/tests.js`, `index.html` (core/session cache tags 20→21 and 14→15).

Node syntax and `git diff --check` passed. The first muted Chromium run exposed a test fixture that sent 264 transactions faster than the host's documented 30/s limit, so the host correctly rejected the final transaction. The fixture now paces each transaction at 40 ms; its focused rerun passed (1/1) in the ship gap. The implementation remains staged with later changes; no release was made.

Local only; no shared Claude checkout edit, push, PR or deployment.
