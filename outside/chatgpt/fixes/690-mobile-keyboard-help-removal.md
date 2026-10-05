# Mobile: remove the keyboard shortcuts button

Starting commit: `a931a391e535c4b0d46e77ed260c994af70b546c` (`codex/690-batch4-rotate-seam`).

The phone top bar no longer shows its `?` keyboard-shortcuts button. The desktop button remains, and the phone's version, notes, settings and Export controls keep their order. Obsolete phone-button spacing and comments are removed.

Changed files: `index.html`, `styles.css` (style cache 761), `tests/tests.js` (one `TBD` regression).

Checks: focused markup check passed mobile absence, desktop preservation and remaining control order; test JavaScript syntax and `git diff --check` passed. Phone-width visual check at 380/440 px and browser regression remain pending under the Claude ship lock; this branch is not promoted to the preferred checkpoint until they pass.
