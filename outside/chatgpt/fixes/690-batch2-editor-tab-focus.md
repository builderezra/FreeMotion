# Editor Tab focus and layer-row keyboard access

Starting commit: `3c712a1d86eb1cc6510e8760eeaa9cb66615cf8c` on isolated `codex/690-batch2-tab-focus`. Exact batch2 VERIFIED §1b.5 and REQUESTS #1017 were checked; audit JSON matches found by broad keyboard searches concern other findings, with no exact duplicate of this Tab issue.

Tab from a focused editor control now remains in the browser's focus order. The old layer-cycle shortcut remains when focus is on the bare editor or timeline. Visible layer heads form a named selection list with one Tab stop; Up/Down selects and focuses the adjacent head, and Enter/Space selects the current one. A focused head shows a visible outline. A focused `{ item: 'TBD' }` regression checks Tab from Export versus the bare editor, plus row semantics and arrow navigation.

Changed: `js/app.js`, `js/timeline.js`, `styles.css`, `index.html` (app/timeline/CSS cache tags 478→479, 261→262, 756→757), `tests/tests.js`.

Node syntax and diff checks passed. Browser verification is pending because the shared builder's `.ship-in-progress` marker is present; no competing browser job was started.

Local only; no shared Claude checkout edit, push, PR or deployment.
