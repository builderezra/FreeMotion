# Batch 3: Mask multi-pick uses one Undo

Starting commit: `75bcac8f9178fa044e70fcb514476c892b7812cb` (`codex/690-batch3-ai-undo`).

The Effects sheet's numbered selection adds its picks as one action, but the Mask pseudo-effect committed its own history step even on the quiet batch path. Selecting Mask and Blur therefore required two Undo presses. A quiet Mask now leaves the history commit to the sheet, while its single-tap path still commits normally.

Changed files: `js/fx-browser.js`, `index.html` (cache tag 99), `tests/tests.js` (one `TBD` regression covering both pick orders).

Checks: focused production-method check for quiet and ordinary Mask history counts passed; JavaScript syntax and `git diff --check` passed. Browser regression remains pending while the Claude ship lock is present; this branch is not promoted to the preferred checkpoint until it passes.
