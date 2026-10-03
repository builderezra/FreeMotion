# Project import keeps its missing-content warning

Starting commit: `304f6370` on local branch `chatgpt/690-continuation`. Nothing pushed.

Read: `REQUESTS.md` #888 says importing must name media layers restored without footage. `js/storage.js` already built that warning in `applyScene`, but the real `importObject` path immediately replaced it with “Project imported” in the app's single toast. The same overwrite could hide embedded-font and omitted-font warnings. Existing tests called `applyScene` directly and did not cover the final import message.

Changed: `js/storage.js` collects these warnings during a normal project import and includes them in the final, longer-lived success toast. Direct `applyScene` callers and quiet backup-restore imports retain their prior behavior. `tests/tests.js` adds one focused `{ item: 'TBD' }` regression through `importObject`, with a clean-import control. `index.html` advances the storage script cache tag.

Ran: The new focused browser regression and the existing #673 malformed-import control passed (1/1 each). JavaScriptCore parsed the changed scripts and `git diff --check` passed. Real iPhone toast legibility remains unverified.
