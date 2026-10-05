# Batch2 §1b.11 — toast announcements

Starting commit: `f6cb76b9fe65b20763b700d2a256e2fee74de75b` on isolated `codex/690-batch2-toast-sr`.

Source: exact `REQUESTS.md` #1023 and `tools/design/chatgpt-tasks/reports/batch2/VERIFIED.md` §1b.11 checked; no duplicate toast-announcement audit record found.

Changed files: `index.html`, `js/app.js`, `tests/tests.js`, this report. A permanent visually hidden `#toast-sr` status region receives each toast's words on the next animation frame. The visible toast keeps its existing button role when actionable. The region stays outside the three dialog focus boundaries so errors remain audible there too. App script cache tag bumped to 482.

Checks: one focused Chromium regression passed on local port 8875 for ordinary and actionable toast announcements and the existing actionable role. The shared ship marker was present; `uptime` showed one-minute load 2.10, below the PM's four-load limit for a single non-collaboration test. Node syntax checks for changed app and test scripts and `git diff --check` passed. No collaboration or full-suite browser checks ran. The older six staged regressions remain pending, so preferred reviewed branch has not advanced.
