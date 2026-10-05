# Batch 3: keep recent colours from both windows

Starting commit: `52d66825e8009fd1781af613d32bd9ab3484ad4c` (`codex/690-batch3-long-text`).

The inspector loaded recent colours once. A pick in another tab could be replaced by the stale list in this tab's next write. Colour rows now read the latest stored list when they open, and each committed pick merges with the stored list immediately before saving.

Changed files: `js/inspector.js`, `index.html` (inspector cache 421), `tests/tests.js` (one `TBD` cross-tab regression).

Checks: focused production-helper check preserved an external pick after a local pick and refreshed the displayed list. Changed-JS syntax and `git diff --check` passed. Browser regression remains pending under the Claude ship lock; this branch is not promoted to the preferred checkpoint until it passes.
