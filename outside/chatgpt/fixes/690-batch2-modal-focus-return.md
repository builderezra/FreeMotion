# Batch2 §1b.10 — dialog focus boundary and return

Starting commit: `f2c3a33ffab9f23270cb9b7dd55f3f305cec76b5` on isolated `codex/690-batch2-modal-focus`.

Source: exact `REQUESTS.md` #1022 and `tools/design/chatgpt-tasks/reports/batch2/VERIFIED.md` §1b.10 checked. The audit JSON focus hits were separate editor-control cases.

Changed files: `js/app.js`, `js/home.js`, `index.html`, `tests/tests.js`, this report. A shared `FM.modalFocus` helper focuses inside New project, Export and Canvas dialogs, traps Tab, makes the rest of each surface inert while preserving the opener's close toggle, and restores opener focus on close. Home keeps its phone keyboard avoidance: the dialog itself receives focus until the existing desktop name-field focus runs. Home, Export and Canvas close paths release the boundary. Home/app script cache tags bumped to 203/481.

Checks: one focused Chromium regression passed on port 8874 for opening Export, isolating other editor controls, wrapping Shift+Tab and restoring focus to `#btn-export` on close. The preceding §1b.9 dialog-announcement regression also passed on the same isolated clone. The ship marker was present; `uptime` showed one-minute load 2.33–2.40, below the PM's four-load limit for single non-collaboration tests. Node syntax checks for `js/app.js`, `js/home.js` and `tests/tests.js`, plus `git diff --check`, passed. No collaboration/full-suite browser checks ran. The earlier six staged regressions remain pending; preferred reviewed branch must not advance until they pass.
