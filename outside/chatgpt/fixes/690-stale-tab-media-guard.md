# Keep a newer tab's replaced media safe

Starting commit: `5bf4ad865ac8198f6c416b8775b2d1f482b1df46` (`codex/690-huge-import-warning`).

When an older tab's scene write is refused as stale, its save now stops before touching IndexedDB media. A preflight also keeps that tab from recording pending-media notes for a newer scene. Quota-refused scene writes still attempt their media save as before.

Changed files: `js/storage.js`, `index.html` (storage cache 76), `tests/tests.js` (one `TBD` two-tab replacement regression).

Checks: focused production `save()` Node check passed known-stale and newly-stale branches without a pending note or blob write; changed-JS syntax and `git diff --check` passed. Browser storage regression remains pending under the Claude ship lock; this branch is not promoted to the preferred checkpoint until it passes.
