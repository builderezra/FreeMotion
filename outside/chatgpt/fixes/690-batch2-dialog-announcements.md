# Batch2 §1b.9 — dialog and export announcements

Starting commit: `37dadf74866d2a0722323d0da53fa38c8d70d719` on isolated `codex/690-batch2-dialog-announcements`.

Source: exact `REQUESTS.md` #1021 and `tools/design/chatgpt-tasks/reports/batch2/VERIFIED.md` §1b.9 checked. Audit JSON searches found related export and Escape cases, but no duplicate of this screen-reader announcement finding.

Changed files: `index.html`, `js/app.js`, `styles.css`, `tests/tests.js`, this report. The New project, Export, Canvas, export-progress and export-ready surfaces now have named modal-dialog semantics. Export progress has a live status and measured progressbar; spoken updates occur at phase changes and ten-percent milestones, including decode progress. The ready card announces completion and focuses Save. Script/style cache tags bumped in `index.html`.

Checks: the one focused `TBD` regression was added but **has not run in Chromium** while the shared ship marker is present. Node syntax checks for both changed scripts and `git diff --check` passed. A focused callback check produced eleven announcements across 0–100% for both render and decode, with the bar reaching 100; a static HTML check confirmed five unique named dialogs and both live status regions. Browser behavior remains pending and this commit must not advance the preferred reviewed branch until that check passes.
