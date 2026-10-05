# #1027 Keyboard keyframe navigation and retiming

Starting commit: `1f4225be0419356e7b50e32232f4d40d1d6dcb4a` on isolated `codex/690-batch2-keyframe-keyboard`.

Live timeline diamonds can now receive keyboard focus and announce their property and frame time. Left/Right moves to adjacent keyframes; Alt/Option+Left/Right retimes the focused live stack one frame using the pointer drag's collision rule. Alt/Option+,/. navigates keyframes from elsewhere in the editor, and Shift adds a one-frame retime for the focused property at the playhead. The shortcut panel lists these keys and focused diamonds have a visible outline.

Changed files: `js/timeline.js`, `js/app.js`, `js/shortcuts.js`, `styles.css`, `index.html` (timeline 262→263, shortcuts 85→86, app 482→483, styles 758→759), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), this report.

Checks: focused production-function Node VM check passed for next-key navigation, one-frame retiming, unchanged value, and unrelated property preservation. JavaScript syntax and `git diff --check` passed. The browser regression is pending until the Claude ship lock is absent; no browser or Chromium process was run under the lock.
