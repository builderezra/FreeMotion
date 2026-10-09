# AU8: audit of js/home.js on main fba44ca8 (3,488 lines), anything that can lose or misplace a project first

Against `origin/main` fba44ca8. Branch `hunt/audit-home`. **Measured** = I ran it here (headless Chromium, 1280 and 380), **Read** = I read the code, **Guess** = I did not check.

**Bottom line, honestly.** I found **nothing in `home.js` that loses or misplaces a project.** Every delete path asks first, deletes the open project last, routes drafts through their own call, and the shared-project cases are said out loud. One small inconsistency is fixed and proven; the rest of what I tried held up.

## Fixed (LOW), red on main and green with the fix at 1280 and 380, mutations CAUGHT

| # | Where | What he sees | Repro | Fix |
|---|---|---|---|---|
| AU8-1 | `FM.projects.rename` and `duplicate` (`storage.js`; the Home ⋯ menu calls them) | **A name pasted into Rename keeps its full length on the card, then changes under him.** The loader cuts a project name to 200 characters, but Rename wrote whatever was typed into the card list (Measured: a 5,000-character name shows at 5,000 on Home, and after the project is opened and saved the card silently becomes 200). Duplicate of a 200-character name made a 205-character card (" copy" appended after the cut). Nothing is lost beyond the tail of an absurd name; it is the card changing without a reason. The New project path is already fine (its name is cut with the scene), kept as a control. | `AU8-1` | one `cardName()` (trim, 200, default) used by Rename and Duplicate |

Mutations (both CAUGHT, `au8_mut.log`): Rename uncut (A2), Duplicate uncut (A3). **A mutation that removed the same cut from New project SURVIVED**, which is how I found that edit was redundant: it is not in the patch. Busters bumped: `storage.js?v=59`.

`audit-home-scripts/`: `au8-tests.js` (append before `async function run()`; `?only=AU8`), `au8-fixes.patch`, `au8_mut.sh`, `au8_mut.log`.

## What I tried to make lose or misplace a project, and what happened (all Measured unless marked)

- **Create three projects, duplicate the OPEN one straight after an edit (no autosave wait):** the copy has every layer, including the one just added (4 of 4).
- **Bulk delete including the open project:** only the doomed ones go, the open project is deleted last, another project is open afterwards and is a listed one, with its layers intact.
- **Rename the open project, add a layer, Undo:** the new name stays (the v16.99 fix holds).
- **A stale ⋯ menu acting on a project that has just been deleted:** `rename` and `duplicate` of a deleted id do nothing (no ghost card, no resurrected document, list unchanged).
- **Read:** the Delete handlers (card ⋯ menu :1520, Select bar :1798, draft :2280, template :2015, element :2109) all ask first; the bar's ids are captured at the tap and the selection is pruned to what is on screen (`pruneSelection`), so a search typed after ticking cannot widen a delete; "Select all" uses only what is listed.
- **Read:** `importObject` (`storage.js:1989`) creates the new project BEFORE `applyScene`, so if `applyScene` throws (AU3-1: a `null` in a file's layers list) an empty project is left behind. That is the AU3 finding, already reported on `hunt/audit-storage`; with its fix the throw is gone. Nothing new here.
- **Read:** the New project dialog hides itself on the first call of `createFromDialog` (`:3181`) before anything async, so two quick taps cannot make two projects through the button; a held Enter key could call it twice (the hidden dialog's input may still have focus for a frame). **Guess:** not reproduced, and not worth a guard on this evidence.

## What I read, and how closely

Line by line: `openProject` (2391 to 2510), `projectCard`'s ⋯ menu (1351 to 1556), the Select bar (1753 to 1846), `newProjectDialog` / `createFromDialog` (3138 to 3196), `FM.home.close` (3415 to 3470). Skimmed: `render`, the intro and push animation machinery (238 to 920), the search and date parser (1094 to 1260).

**Not read:** the profile photo code (2829 to 2970), the template and element cards (1985 to 2330) beyond their Delete lines, and the collab badges (1260 to 1350). No claim either way.
