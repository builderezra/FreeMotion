# Replace media stays with the project where it was picked

Starting commit: `5375622175076818afc2353ac63e40ebe81db5d4` on local `chatgpt/690-continuation`.

## Problem

`js/app.js:4792` awaited the selected file's decode. If the user opened another project during a long phone decode, `replaceMediaWith` returned false because the old layer was absent, but the caller ignored that result, continued updating the detached layer, saved the current project and returned success. An unused decoded record also kept its object URL. A switch during `stashPrevMedia` exposed the same path. A reversed clip introduced a further wait after the swap but before the history/save step.

This is distinct from the already recorded Replace media size, song, undo and template-slot defects in `REQUESTS.md` and `audits/937-hunt.json`.

## Change

- `js/app.js`: capture the originating project and layer; cancel if either changes while the picker, decode or outgoing-file stash is pending. Release abandoned decoded media and tell the user it was not replaced. Respect a failed `replaceMediaWith` result. Finish history/save before the optional reverse-frame build, so a project switch cannot interrupt the committed swap.
- `tests/tests.js`: one focused `{ item: 'TBD' }` regression holds image decode, switches projects and checks the old file remains saved, the new file is released, the other project is untouched and the user is told.
- `index.html`: bump `js/app.js` cache tag from 469 to 470.

## Checks

The focused browser regression passed (1/1). JavaScriptCore parsed both changed scripts; `git diff --check` passed. Installed-iPhone picker timing is unverified. No push, PR or shared checkout edit.
