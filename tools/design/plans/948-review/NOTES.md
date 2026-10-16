# #948 review — an adversarial read of `hunt/948-plus` (as stacked in `hunt/v55`)

Branch `hunt/948-review`, cut from `ssh/hunt/v55` (5466b9f1). Three fixes, one commit each, plus these notes.

**Nothing was run.** A release ship was running on the laptop, so there was no browser, no server, no suite, no slice and
no python. The only commands were `node --check` (js/storage.js, js/home.js, tests/tests.js after every edit), git, grep
and awk. The three new tests have never run. Each is written to fail on v55 and pass with its fix, by reading the code
path, not by watching it.

Read: the four 948 commits (`ssh/hunt/929-heart..ssh/hunt/948-plus`), the two v55 test fixes, 948-plus/NOTES.md, and the
code each change leans on: storage.js (create, open, discardDraft, discardDraftAnyway, remove, duplicateFrom, packFromProject,
writeScene/flushSync/save, importObject/applyScene/sceneFileProblem/clampProjectDims/sanitizeProjectFields, hydratePack,
both commitDraft/updateFrom/openForEdit, backup restore), home.js (open/close, draft card, the + card, the editing bar),
contextmenu.js, collab-session.js (DENY), collab-ui.js (checkpoints), collab-bridge.js (saveVersion), addmenu.js and
elements-browser.js (where names and thumbs are drawn), app.js (boot, Export and Home buttons), toast.

## Findings

| # | Lens | Where | What goes wrong | Status | Result |
|---|------|-------|-----------------|--------|--------|
| F1 | 1 Data loss: Done pressed twice | js/storage.js:3352 `commitLibDraft` (called from home.js:3685; Done at home.js:2610) | Home opened twice before the first save lands. This happens with a held Enter on the focused Done, which repeats its click, and Home moves no focus. Both calls pass the `libNew` check, because the marker comes off only after the save. Each mints its own element or template: two cards for one thing (#505). | CONFIRMED (traced: the second call reaches `saveFromProject` before the first's first `await` returns) | **fixed 70d06364**: one commit per workspace at a time; a second call answers null. Test `948 review Done pressed twice…` |
| F2 | 1 Data loss: a duplicate after a hand save | js/home.js:2286–2297, the draft card's ⋯ | Setup: a + workspace he left without going Home stays a draft with `libNew`. Then: ⋯ → Save as template saves it and keeps the draft (as that item always has), with the marker still on. Opening the draft and going Home files it a **second** time. The element twin does the same whenever `discardDraftAnyway` is refused after Save as element. | CONFIRMED (traced) | **fixed 0e20d96f**: `libNewFiled` takes the marker off once the hand save has landed. Test `948 review a + card draft he saved by hand…` |
| F3 | 5 Card: focus | js/home.js:2519 | `cancel.addEventListener('click', lnClose)` handed the click event in as `leaving`. That value is truthy, the same value Home closing passes, so Cancel never gave the focus back to the +. Escape and the backdrop always did. A keyboard user was left with focus on nothing. | CONFIRMED (traced) | **fixed f86cd8dd**: `() => lnClose()`. Test `948 review Cancel on the + card…` (Escape is the control) |
| O1 | 4 lib-edit on an ordinary project | js/home.js:2587 `libEditState` | Two lines turn `lib-edit` on from the document's `ofElement` / `ofTemplate` alone, before the index is checked. An ordinary project whose doc carried a stray pointer would lose Export and show "Editing element: … · Done", and that Done saves nothing (commitDraft refuses a record that is not `elementDraft`). **No route that produces such a doc was found**: applyScene strips the pointers, collab's DENY keeps them out of guests' docs, checkpoints and saveVersion, and packs and `_adopt` strip them. Only an index rebuilt by `migrate()` for a stranded doc could produce one. | PLAUSIBLE | open. A one-line hardening, if wanted: read the record first and return null unless `rec.elementDraft \|\| rec.templateDraft`. That matches commitDraft's own guard. |
| O2 | 1 Two windows, or a very fast switch | js/storage.js:3300 `packFromProject` (`id === curId()`) | The commit reads the + workspace's files from memory only while `fm.currentProject` (the shared pointer, not this tab's) still names it, and only after `await openDB()`. Two ways it fails: another window moved the pointer, or Home's commit raced a card tap. Either way it reads IndexedDB instead, and a clip whose `save()` is still writing is packed without its file. `discardDraft` then deletes the workspace's records. The pre-existing commitDraft has the same shape; the + path inherits it. | PLAUSIBLE (pre-existing) | open. Out of 948's scope: the fix belongs in packFromProject (tabId, and read memory before the first await). |
| O3 | 1 Two windows on one workspace | storage.js:3049 `discardDraft` + `writeScene` | Window A files and discards the workspace while window B still has it open. B's next flush rewrites `fm.proj.<id>` with no index entry. B's later work is never filed (there is no record to file it from), and A's discard deleted the media records B's doc points at. Pre-existing for commitDraft. | PLAUSIBLE (pre-existing) | open |
| O4 | 1 An empty template | storage.js:3366 `has` | A blank template with only a background colour and duration counts as empty and is put away. 948-plus/NOTES already lists this as a question for him. | CONFIRMED (by design) | open: his call |
| O5 | 1 Design | app.js:7333 (Save as element… on a selection) | In a + element workspace, Save as element… on a selection makes element A. Going Home then files the whole workspace as "Element N" too: two elements from one sitting, both correct, possibly not what he expects. | PLAUSIBLE | open (design) |
| O6 | 2 Import | storage.js:3397 `libPackFromFile`, :949 `dataURLToFile` | A template or element file keeps any `data:` URL's bytes as a layer's File without decoding them. The project import decodes and drops what will not load. There is no script path (the blobs only reach img and video), so this is wasted storage for a clip that will never play, not a security hole. | CONFIRMED | open (LOW) |
| O7 | 6 Tests: leaked state | tests/tests.js:151782 | `948 the + card does what it says` picks 16:9 and 9:16 and never puts the session's `lnShape` back. No later test relies on the 1:1 default today. | CONFIRMED | open (LOW): there is no seam to reset it |
| O8 | 6 Tests: an assertion that cannot fail | tests/tests.js:151918 (`948 fix 3`) | In the runner's 1280 frame no Export is on screen for an ordinary project. The v55 test fix made the PC half of "no Export while editing" conditional, so on PC it is vacuous. The CSS (`styles.css:5784`) hides `#btn-export` wherever `pcTransportLayout` moves it, so the claim reads right, but nothing proves it at PC width. | CONFIRMED | open |
| O9 | 6 Tests: stub descriptor | tests/tests.js:152010/152073 | Assigning `HTMLAnchorElement.prototype.click` and "restoring" it leaves an own property (the same function) on HTMLAnchorElement.prototype. Six older tests do exactly this (60701, 75012, 85703, 94058, 96293, 104201), so fixing only 948's would change nothing. Harmless today. | CONFIRMED (suite-wide) | open |
| O10 | 5 Card: focus | home.js:2455 `openLibNew` | No focus trap: Tab walks out of the modal into Home behind it. `#hm-dialog` behaves the same way. | PLAUSIBLE | open (LOW) |
| O11 | 4 and 5 Layout | styles.css:5778 `#lib-bar`, home.js `libBar` | The pill sits at the top centre of `#stage`. On a phone it may cover the canvas's top edge or another stage overlay. In the Simple editor its visibility and Done were not looked at. Nothing was measured. | PLAUSIBLE | open: measure on the first run |

## Checked and found clean

**Lens 1: data loss.**
- **Leaving a workspace with unsaved edits.** `flushSync` must land, or the result is `'kept'` and the draft and its marker stay.
- **An auto-file failing part way.** A refused pack or a refused card makes `saveFromProject` / `templates.save` take the half back and say false, so the result is `'kept'`. A failed `libNew` delete is harmless.
- **A crash between steps.**
  - The library card write and the `libNew` delete run in one task (a microtask chain), so no crash can fall between them.
  - A crash after the marker comes off leaves an older draft, never a duplicate.
  - A crash in `startLibDraft` before `returnTo` is saved lands him on the first project.
- **An existing old-style draft.** No `libNew`, so it is never filed by itself (the fix 2 test's control).
- **Renaming to an existing name.** Names are not keys; `libRename` only sets a trimmed string of at most 120 characters.
- **An empty element.** Nothing is made, and the workspace goes only because it holds no layers. The template case is O4.
- **A project tapped in the card's row while another is open.** The row saves; it never opens a project. `packFromProject` flushes the open one first.
- **The project to return to was deleted meanwhile.** `back` falls to the first real project, or to none (`landOnHome`).
- **Boot.** A first load lands on Home and files a + workspace, exactly as commitDraft already does for an edit.

**Lens 2: import safety.**
- **Names are text everywhere.** Home cards and the + card use `el()` / textContent; the toast uses textContent; addmenu labels use textContent; elements-browser has no `innerHTML` of a name.
- **Card pictures.** A thumb is kept only if it is a base64 PNG, JPEG or WebP of at most 600 KB. The regex is linear.
- **Media.**
  - Only `data:` URLs, only the video and image kinds, only for layer ids that exist, and `__proto__` is excluded.
  - Keys are own keys only.
- **Layers.**
  - `sceneFileProblem` runs first.
  - Then `sanitizeImportedLayers` and `repairParentCycles`, the same as `applyScene`.
  - Ids are re-keyed at use by `reIdLayers`, as every pack is.
- **A template's project.** The notes and the session pointers (including `ofTemplateRev`) are taken off, and `clampProjectDims` runs, which includes `sanitizeProjectFields`, as `applyScene` does.
- **Canvas.** The numbers are clamped to 16–7680.
- **Prototype keys.** An own `__proto__` from `JSON.parse` is handled the same as in a project import.
- **Old and new versions.**
  - An old app opening a new file gets a project.
  - A new app opening an old template file (no kind) gets a project.
  - A file with `kind: 'template'` never makes a project.
- **Huge `data:` URLs.** The same exposure as a project import.

**Lens 3: whitelist drift.**
- **`libNew`.**
  - It lives on the projects index only.
  - Every index writer edits records in place or copies the card whole (`touchCurrent`, `rename`, `duplicateFrom`).
  - A backup drops it on purpose (documented in 948-plus/NOTES).
  - Collab never syncs the index or the packs.
- **Imported cards** carry the fields that `save` / `updateFrom` write (name, thumb, count, width, height, duration).
- **Packs** have `packFromProject`'s shape: `{layers, media{file, kind}, project | canvas}`.
- **The file's own fields.** `kind`, `name`, `thumb` and `canvas` are added after `serializeWith`, so nothing in it can drop them.
- **`elementDraft`, `templateDraft`, `ofElement` and `ofTemplate`** are unchanged by 948, apart from the rename.

**Lens 4: lib-edit.**
- **The state is always worked out fresh.** Every sync point (the end of `open()`, `home.close()`, `init`) reads it again from THIS tab's index record.
- **Every route between projects ends in a sync.** `create`, import, restore, `useAsNew`, both `openForEdit`s, every commit's switch, `discardDraftAnyway` and `remove` all end in `open()`.
- **A thrown error leaves the class off,** so Export shows.
- **Collab.** Its DENY list keeps the pointers out of guests' docs and out of checkpoints.
- **No stuck-on route** was found, apart from O1's hypothetical stray pointer.

**Lens 5: the card.**
- **Escaping.** Clean.
- **Double taps.** `lnBusy` guards the tile and the project taps, so a tap during a save does nothing rather than save twice.
- **The project row.** With no projects it shows the line. With many, each tile costs one `getThumb`, the same as the Projects grid.
- **Keyboard.** Enter and Space work on the tile, and a chip never starts a build. Escape and the backdrop give the focus back (Cancel now does too, F3).

**Lens 6: tests.**
- **No `//` comment on a continued line.** Checked with awk over the whole 948 block and the js diff.
- **No double quotes in any title.**
- **`FM.toast`.** It is a plain data property, so restoring it by assignment is equivalent.
- **Real controls** in fix 2, fix 3 (at 380) and fix 4.
- **The new tests** restore `FM.ask` and `FM.projects.discardDraftAnyway` by descriptor.

## For the first run

- Run `?only=948%20review` at the default width and at `--width 380`. All three are logic or focus tests, so width should not matter.
- Proof by mutation, one per fix:
  - **F1:** in `commitLibDraft`, change `_libCommitting.has(pid)` to `false`.
  - **F2:** make both `if (ok) libNewFiled(p.id);` lines no-ops.
  - **F3:** put back `cancel.addEventListener('click', lnClose)`.
- Busters: storage.js 66 → 67 (F1), home.js 204 → 205 (F2; F3 rides on it). No other file changed.
