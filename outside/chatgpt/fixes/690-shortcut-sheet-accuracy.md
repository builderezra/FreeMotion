# #1054 — shortcut sheet names the keys' real conditions

- Starting commit: `790efde06eac6cc0686dcf48a1eb3ebc6cdebd03` (`codex/690-import-numeric-strings`); new branch `codex/690-shortcut-sheet-accuracy` in the existing isolated Codex worktree.
- Source: shared `REQUESTS.md` #1054 and batch3 `VERIFIED.md` §1 item 15 (F2/F3). Shared audit JSON and prior fix reports had no exact duplicate.
- Changed: `js/shortcuts.js`, `index.html`, `tests/tests.js`.
- The ? sheet now distinguishes unselected Add-menu digits from selected-layer panel-card digits, and lists Backspace and Ctrl+Y. Add-tab names remain read from the Add menu itself.
- Checks: focused rendered-sheet behavior check passed with live Add-menu labels; changed JavaScript syntax and diff checks passed. The focused muted Chromium regression passed (1/1) after its fixture used a real selected layer and restored Home state.
- Local only; not promoted, pushed or released.
