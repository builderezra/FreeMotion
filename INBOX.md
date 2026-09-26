# INBOX

Append requests below the divider. The building chat drains it: each entry moves into REQUESTS.md with a
number, then `tools/inbox.sh --done` removes only the lines it was shown, so anything added mid-drain stays.
The divider is the line of three dashes below. Keep that exact line out of this header prose: on 20 Sep
the old drain cut the file at the first three dashes in the header, and the inbox was blind for six days.

WHO WRITES HERE: Ezra from his phone, and the LOGGING CHAT (his arrangement, 26 Sep). The logging chat
writes one block per message he sends it:

    ### <date, time AWST> — <short title>
    **His words (verbatim):** …exactly what he typed, typos and all…
    **Logger's plan (not his words):** a READY-TO-BUILD plan: where in the code, the exact change,
    options already drawn/rendered (and his pick, when he has made it in the logging chat),
    measurements already taken, the test that proves it, and any question left (as a `❓ASK:` line).
    Big plans live in tools/design/plans/ and the block links them.

BUILDER: move the WHOLE block into the REQUESTS.md entry. His words go in as the verbatim quote and get
split into his numbered clauses as usual. The plan goes under them, labelled as the logger's plan.
Follow it; if the tree has moved and a step no longer fits, say so in the entry rather than improvising silently. Design requests still get drawn options before anything ships
(#545), and the queue order is unchanged: log it at the bottom and it waits its turn.

---


### 26 Sep 2026, ~22:40 AWST — Notes and Shortcuts/tips (the panels that can go BIG) open SMALL when you start a new project

**His words (verbatim):** "Make it so that the notepad and like Settings menu I guess the ones that are like able to be made really big like when you start a new project they default to being the short version"

His clauses:
1. The panels that can be made really big (he names the notepad, and "like Settings menu I guess"; the ones with #927's small/BIG grip)…
2. …default to the short (small) version when you start a new project.

**Logger's plan (not his words). Ready to build:**
- Which panels: the ones with the grip are exactly **Notes** (`js/notepad.js` ~147) and **Shortcuts/tips** (`js/shortcuts.js` ~144), both via `FM.panelSize.attach(card, { key: 'notes' | 'shortcuts', … })`. Settings has no BIG state, so "Settings menu I guess" means the Shortcuts/tips panel. Clearing the whole store also covers any panel that gets the grip later.
- Today: `js/panelsize.js` remembers BIG per panel in localStorage `fm.panelBig` (~35, `{notes: true, shortcuts: true}`, a key present only while big). #927 clause: "every time you open it up and close it it'll remember what you last had it like". **Keep that remembering. Only a NEW project resets it.**
- Decided (not asked): reset on a brand-new project; don't make it per-project. That is the literal reading of his words, and it keeps #927's remembering while you work.
- Build:
  - In `js/panelsize.js`, add `function resetAll() { try { localStorage.removeItem(STORE); } catch (e) {} }` and export it in `FM.panelSize` (~420) as `resetAll: resetAll`.
  - Call `if (FM.panelSize && FM.panelSize.resetAll) FM.panelSize.resetAll();` right after a successful create:
    - (a) `js/home.js` ~2792 `newProjectDialog`, after `if (!pid) return;` and before `FM.home.close(…)`. This is his "start a new project".
    - (b) the template → new project path, `js/storage.js` ~3170, after its `FM.projects.create` returns a pid.
  - NOT on imports of an existing project file, element drafts or template drafts. Those are not starting a new project.
  - Bump `?v=` for `js/panelsize.js`, `js/home.js` and `js/storage.js` in `index.html`.
- Test:
  - Set `localStorage['fm.panelBig'] = '{"notes":true,"shortcuts":true}'`, run the New-project path (the function behind the dialog's Create), then open Notes and Shortcuts: neither card has `.pb-big`. Fails on HEAD.
  - **Positive control in the same test:** with the store set and NO new project (reopen the current one), Notes opens BIG. That proves the remembering still works and the reset is not just "never big".
  - Re-run the `927` tests (`?only=927`).
- Verify at 380/440 and on PC: make Notes big, go Home, start a new project, open Notes → small. Make it big, close and reopen → still big.

### 26 Sep 2026, ~22:41 AWST — CORRECTION to the block above: it is NOTES and the HELP menu, and the size is remembered PER PROJECT (this plan REPLACES the one above)

**His words (verbatim):** "Oh wait, it's not the Settings menu. It's the Help menu yeah so the menu on the menu both need to default a small but they remember When it's in the same project so like basically if I'm in a project and I make it bigger and then go back and it will still be big but then if I start a new project, it'll be small again"

His clauses (these replace the block above's):
1. The two panels are **Notes** and the **Help menu**, not Settings. Help is the Shortcuts/tips panel that opens from the ? button (`js/shortcuts.js` ~144, `key: 'shortcuts'`, `button: helpButton`).
2. Both default to SMALL.
3. They remember their size **within the same project**: make it big in a project, go back to it, and it is still big.
4. Start a new project and they are small again.

**Logger's plan (not his words). Ready to build. It REPLACES the reset-on-create plan above, so do not add `resetAll` hooks:**
- Remember per project instead of globally. A new project has a new id and therefore no entry, so it opens small with no hook in any create path. Switching between existing projects gives each its own size. That matches "when it's in the same project" exactly.
- `js/panelsize.js`:
  - (a) New store key `const STORE = 'fm.panelBigByProject';`, shaped `{ "<projectId>": { notes: true, shortcuts: true }, … }`. Leave the old flat `fm.panelBig` unread: everything starts small once after the update, which is harmless.
  - (b) `function pid() { try { return (FM.projects && FM.projects.currentId && FM.projects.currentId()) || '_none'; } catch (e) { return '_none'; } }`. `FM.projects.currentId()` is at `js/storage.js` ~2399.
  - (c) `remembered(key)` → `const p = readStore()[pid()]; return !!(p && p[key] === true);`.
  - (d) `remember(key, big)`: read the store, take `o[pid()] || {}`, set or delete `[key]`, and delete the project's object when it is empty. Cap the store at the 40 most recently written projects: re-insert the current id last, then drop the oldest keys past 40, so storage cannot grow forever.
  - (e) Export `_setBig(key, big)` as a suite seam, so tests stop writing the storage format by hand.
- No changes are needed in the panels:
  - Notes re-attaches on every open (`js/notepad.js` ~147, detached at ~189), so it re-reads `remembered`.
  - Help calls `sizer.sync()` on every show (`js/shortcuts.js` ~203), which re-reads it too.
  - Verify both pick up a project switch.
- Bump `?v=` for `js/panelsize.js` in `index.html`.
- Tests:
  - NEW: in project A, make Notes and Help big, close them and reopen: both are big (the positive control for clause 3). Then create a new project B (the New-project path): both open small (clauses 2 and 4). Back to A: both big again (clause 3, per project). It fails on HEAD at B, because the global store keeps them big.
  - UPDATE the 927 tests that read or write raw `fm.panelBig` (`tests/tests.js` ~100053, ~100252, ~100288, ~100305) to use `FM.panelSize.isBig` / `_setBig`. Record them as retuned, not removed.
  - Re-run `?only=927`.
- Verify at 380/440 and on PC.

### 26 Sep 2026, ~22:41 AWST — Phone: the SMALL Help menu is not actually small; there is no visible difference from big

**His words (verbatim):** "Also on mobile make it so that the small version for the Help menu is actually small because right now it's like there is no difference"

His clauses:
1. On mobile, the small version of the Help menu (the ? Shortcuts/tips panel) should actually be small.
2. Right now there is no visible difference between small and big.

**Logger's plan (not his words). Cause worked out from the CSS; options are being rendered through the app and follow as their own block:**
- Why there is no difference: small Help is `.shortcuts-card` (`styles.css` ~3656) with `width: min(440px, calc(100vw - 24px))` and `max-height: min(86vh, 86dvh)`. Its content (a long list) always fills that max-height.
  - On a 380×800 phone, small is therefore **356 × ~688** against big (`--pb-w/--pb-h`, ~10736, phone: `100vw − 20px` × `100dvh − 20px − insets`) of **360 × ~780**. That is 4px narrower and ~12% shorter, which reads as the same card.
  - Notes does not have this problem only because its content is short.
  - These numbers are computed from the rules and not yet measured. The rendering run measures them.
- Fix direction: on phones only (`@media (max-width: 700px)`), give SMALL Help its own clearly smaller box. For example `.shortcuts-card:not(.pb-big) { width: calc(100vw - 56px); max-height: min(52dvh, 460px); }`, with the list scrolling inside (`.shortcuts-scroll` already has `min-height: 0`). Small then reads as a card with the app visible around it, and big as the whole screen.
  - Recommended starting point, A: ~52% of the screen height, 28px margins each side.
  - Alternative, B: ~40%.
  - Renders of both at 380 and 440 follow. Keep PC unchanged.
- Test: at phone width, open Help small and then big. Small's height must be ≤ 60% of big's and its width ≤ big's − 30px. It fails on HEAD (~88% and 4px). Re-run `?only=927`.
