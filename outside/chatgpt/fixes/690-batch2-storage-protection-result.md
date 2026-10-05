# Persistent-storage diagnosis (batch2 §1b.6 / #1018)

Starting commit: `007e0eebb527e4ca987c580f74a5993e547e4c8f` in isolated `codex/690-batch2-storage-protection`. Checked the exact #1018 `REQUESTS.md` entry and batch2 `VERIFIED.md` §1b.6; the only audit JSON persistence-related hit concerned the separate #915 shared-media review.

The result of the browser's persistence request is retained as `FM.storagePersisted` (true, false, or unknown). Quota warnings now state whether protection is on or off, and Settings → Reports shows the status when known. A refusal remains silent during normal editing. One focused `{ item: 'TBD' }` regression stubs a refused request, checks the stored false result, forces a quota warning, and checks the report.

Changed: `js/storage.js`, `js/settings.js`, `tests/tests.js`, `index.html` (storage/settings cache tags 70→71 and 53→54).

Node syntax for both changed scripts and the test file, plus `git diff --check`, passed. The focused muted Chromium regression later passed (1/1) with the ship lock absent. Its first run had no `FM.settings` because that script was missing from the app frame; the retry loaded completely and passed. The temporary mute-driver edit was restored.

Local only; no shared Claude checkout edit, push, PR or deployment.
