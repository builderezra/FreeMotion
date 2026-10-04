# Shape quality hold — 4 October 2026

Starting commit: `ffb3742e4c70943b589844ae9bf89907377f33c5` on the isolated consolidated branch. New isolated branch: `codex/690-reviewed-local`.

Ezra reported that most of the recently redrawn shapes looked poor in a screenshot and asked for independent visual criticism before any replacement enters the final version. This checkpoint restores the pre-pass silhouettes and Add-menu pictures by reverting the local-only shape pass `d6ca358a`. The pass and its original report remain recoverable on `chatgpt/shapes-polish` and in the earlier all-local bundle. No release or shared Claude checkout included the pass.

Changed files: `js/compositor.js`, `js/addmenu.js`, `index.html`, `tests/tests.js`; the superseded `outside/chatgpt/fixes/shapes-polish.md` is removed from this preferred branch. Both changed script cache tags are advanced. The one `{ item: 'TBD' }` regression guards that representative shapes still render at picker and canvas sizes; it does not judge their visual quality. Two independent visual reviews are in progress and will decide which contours merit a new redesign.

Checks: JavaScriptCore syntax for both changed scripts and the test file passed; `git diff --check` passed. Focused browser regression pending the shared browser resource. No push, PR or deployment.
