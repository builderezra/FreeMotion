# Plans for the five after P6 (P7): #996, #1000, #1001, #1002, #1003

Against `origin/main` b46b47d3 (v17.23). Plans only: no app, test or tool code changed. Everything marked **Reproduced** I ran in my own container against the unmodified v17.23 page, with a script that calls the app's own functions and cleans up the projects it makes. **Guess** says so.

## Which five, and why these

The queue classifier (`tools/_classify.py`, run on `REQUESTS.md` at this commit) has nothing left in Ezra's own words that is both workable and unplanned. After P6 the next audit-tier items by number are **#996, #1000, #1001, #1002, #1003** (#953 is a standing note, no build). **Four of the five carry `JUMPED: assigned to ChatGPT via the PM (5 Oct lane split) — land it, don't rebuild it`**. So each plan below is written to do two jobs: say exactly what to check when ChatGPT's commit arrives, and be a complete build plan if it does not.

**The thing worth knowing first:** #1001, #1002 and #1051 are **one user-visible failure** with three causes. A project file with a bad `fillGradient` passes the pre-check, then throws partway through the import and leaves him in a new empty project (Reproduced, #1002 below). Fix #1002 first and the common trigger goes away; fix #1001 so no other trigger can do it.

---

## #996 Two render tests fail together, only in the full phone pass

**State (verified in the entry and in code).** Instrumented 1 Oct. On 5 Oct the leak list named one cause and it was fixed: `q915aCleanup` now passes `{ confirmed: true }` (`tests/tests.js:980-989`). The entry stays open until a run shows the pair gone.

**New evidence: the other three leaks it listed are real, deterministic, and still there.** I ran the whole suite twice in my container (two independent passes, v17.23). Both printed the **identical** `sceneLeaks` list (the runner's report-only record of what a test leaves in the shared scene, `tests/tests.js:59582-59600`):

| leaving test | leaves | why (read in code) |
|---|---|---|
| `undo / redo grey out when there is nothing behind or ahead` (`tests/tests.js:13490`) | a `Shape` | adds `L` with `FM.scene.layers.unshift(L)` and never removes it (body ends after `agree('after redo')`) |
| `the home + catches taps well outside itself, without getting bigger` (`:42448`) | `Box`, `Box copy`, `Path copy` | **not its own fault**: they come from the test just before it, `notes stay with their own project` (`:42418`), whose `finally` does `FM.projects.remove(id)` without awaiting and **without reopening the project that was open**, so the app is left on a deleted project and the next scene load brings the copies back |
| `869: a backup carries every project, puts them back…` (`:85031`) | `TplProbe` | its `finally` removes `made` and strays but never switches back to the project that was open |

(The 380 pass of H13 will add a third run when it ends; I have not looked at it yet.)

**Plan**
1. **`:13490`:** wrap the body after `FM.history.reset()` in `try { … } finally { FM.scene.layers.splice(FM.scene.layers.indexOf(L), 1); FM.history.reset(); }`. One layer, one line.
2. **`:42418` (`notes stay with their own project`):** take `const orig = FM.projects.currentId();` at the top; in `finally` do `try { if (orig) await FM.projects.open(orig, { confirmed: true }); } catch (e) {}` **before** the removes, and `await` each `FM.projects.remove(id)`. Same shape as `q915aCleanup`.
3. **`:85031`:** the same two lines (capture `orig` at the top, reopen in `finally` before removing `made`).
4. **Then make the leak check bite.** `tests/tests.js:59590-59600` reports and never fails ("nothing turns red for it until the list is understood"). Once 1 to 3 are in and two full runs show an empty list, change it to fail the offending test with `left layers in the shared scene: …`, unless the test passes `{ leaves: true }`. That turns the whole bug class into an error at the test that causes it.
**Test:** the list itself is the test. Proof of the guard: a throwaway test that pushes a layer and returns must turn red under step 4.
**Close #996 when:** two full runs (desktop and 380) print `sceneLeaks: []` and the pair has not recurred. **Effort:** an hour, plus the runs. **Guess:** whether the original pink-layer variant (232,52,135) had a fourth cause; the 5 Oct entry says earlier occurrences named other leftovers.

---

## #1000 A stale second tab writes its old media over a newer replaced file (hunt HIGH)

**Reproduced.** Project with image clip at blob A (64 bytes, rev 0), saved. Then I faked the other tab: wrote a newer project document (rev + 1, `mediaRev` 1) to `fm.proj.<id>` and the new file B (65 bytes) to IndexedDB at rev 1. Then this (older) tab edited and saved. Result: `_sceneRevState()` said `stale: true`, and **the stored clip went from rev 1 / 65 bytes back to rev 0 / 64 bytes**. The newer file was overwritten.

**Where (read at this commit).** `save()` writes the document with `writeScene()` (`js/storage.js:747`), which refuses when stale (`:111`, `:115`) and sets `_writeFail = 'stale'`, but the blob loop at `:768` runs anyway, and `if (!existing || (existing.rev || 0) !== job.rev)` (`:790`) writes whenever the revs differ, **including when the disk copy is newer**. The "newer copy" toast (`warnStale`, `:87`) says nothing was saved over his work.

**Build**
1. In `save()` right after `let sceneOk = writeScene();` (`:747`): `const stale = (_writeFail === 'stale');` and run the blob loop only when `!stale`. **Keep it for `'refused'`** (quota), as the entry says.
2. Stop `notePending(jobs)` (`:745`) from recording notes for a tab already known to be stale: compute `_stale` before it.
3. **Do not** change the comparison at `:790` to "only when the job's rev is higher": undo legitimately writes older revs (the entry's warning, and it is right).
**Test** (name: `1000 a stale tab does not overwrite a newer media file`): exactly the script I used: seed A at rev 0 and save; write the newer doc and B at rev 1; edit and save; assert `_sceneRevState().stale` is true and `readMedia` still gives rev 1 and 65 bytes. **Fails on v17.23** (rev 0, 64 bytes). Control: a non-stale save with a replaced file (`mediaRev` bumped) still writes the new blob.
**Effort:** an hour. **Risk:** low. **ChatGPT's commit, when it arrives:** check it skips the loop on `'stale'` only, and that its test fails when the guard is removed.

---

## #1001 An import that throws leaves an empty "Imported project" behind

**Reproduced both paths.** `importObject` (`js/storage.js:1988-2009`) creates the project **before** `applyScene`. With `applyScene` made to **throw**: a new project exists and is current, and the throw escapes. With `applyScene` returning **`false`**: a new project exists and is current too, and the code's own comment ("the user must still be told rather than left in an empty project") is not true, because the `false` branch does not undo the create either. A valid import adds exactly one project (control).

**Build**
1. In `importObject`: remember `const prev = FM.projects.currentId();` before the create. Wrap the `applyScene` call in `try`. On a throw or a `false`, run one helper `undoImport(pid, prev)`: `await FM.projects.open(prev, { confirmed: true })` (when `prev` exists), `await FM.projects.remove(pid)`, then the existing "could not be opened" toast, and `return false`.
2. Leave `importFile`'s outer catch as it is (it still toasts), but it must no longer find a new project behind it.
3. Optional hardening from the entry: cap nesting depth in `sceneFileProblem` with an iterative walk (about 200 levels = damaged file). Not required to close the item.
**Test** (`1001 a failed import leaves no project behind`): count `FM.projects.list().length` and note `currentId()`; make `FM.storage.applyScene` throw once, then return false once; call `importObject(validObj, null, { quiet: true, confirmed: true })` each time. Assert the count is unchanged, the previous project is still current, and a toast fired. **Fails on v17.23** (count +1 both times). Control: a valid object adds exactly 1. Restore the patch in `finally`.
**Effort:** an hour. **Order:** after #1002. **ChatGPT's commit:** check both the throw and the `false` path, and that the previous project is reopened, not just the new one removed.

---

## #1002 A collaborator's bad edit can half-apply on the host's copy and crash its receive loop

**Reproduced the sanitiser half (not the host loop).** `sanitizeUnsafeValues` (the seam `FM.storage_sanitizeUnsafeValues`) on a layer whose `fillGradient` is `'bad'`, `5` or `true` **throws** (`Cannot create property 'angle' on string 'bad'`); `[1,2]` and `null` do not throw but stay non-objects; `{c0:'#fff',angle:'999'}` is clamped to 360 (control). `FM.storage._sanitizeLayers([layer])` throws the same way, which is the every-open load path.

**The compound with #1001 (Reproduced):** `importObject` of a project file whose layer has `fillGradient: 'bad'`: `sceneFileProblem` returns `null` (passes), then `importObject` **throws** and leaves the new empty project as current.

**Where.** `js/storage.js:1537` checks only `if (l.fillGradient)` and `:1542` assigns `.angle` onto it. The host side (`js/collab-host.js:661` applies, `:684-686` runs the invariants, the throw escapes `H.receive`, `:883`) is from the entry's reading and from its JSC reproduction; **I did not reproduce the host half**.

**Build**
1. In `sanitizeUnsafeValues`, before `:1537`: `if (l.fillGradient != null && (typeof l.fillGradient !== 'object' || Array.isArray(l.fillGradient))) delete l.fillGradient;`. Fixes string, number, `true` and array in one line, on every path that goes through it (open, import, undo restore, collab clone).
2. Make the host's transaction atomic as the entry says (clone the touched layers, try/catch the `inv.*` calls, on a throw restore the clones, reject the ops as `'bad'`, send the normal ack with a repair). This is the larger half and needs the S1 host harness.
**Tests**
- `1002 a non-object fillGradient is dropped, not thrown on`: the table above; assert no throw and `fillGradient` absent for string, number, `true`, array; control: the clamped object stays. **Fails on v17.23.**
- `1002 an import with a string fillGradient imports`: the compound above; after step 1 it imports and adds one project.
- Host half (an `921 S1`-style test, no network): an editor sends `s ['L','a','fillGradient'] 'bad'`; assert no throw, the op is refused, and the next editor tx on layer `a` gets a non-null `ack.seq`.
**Effort:** step 1 ten minutes; the host half about half a day. **ChatGPT's commit:** check it covers both halves, not just the sanitiser.

---

## #1003 Duplicate says "done" even when it could not read a clip

**Reproduced.** A project with one stored image clip. I made every media read (`IDBObjectStore.get` for `l_` keys) fail through its `onerror`, then called `FM.projects.duplicate(id)`. It **returned `true`**, a "copy" card appeared, and **no clip was written for the copy** (the clip count in IndexedDB stayed at the original's one). Control without the fault: a whole copy, `true`, two copies.

**Where.** `idbGet` (`js/storage.js:175`) resolves `null` on error, the same as "absent". `duplicateFrom` reads each clip with `idbGetMedia` (`:215`, `:2666`) and does `if (!rec) continue;`, so `whole` stays true and it returns `done(true)` (`:2678`). Home shows the new card and, on a `false`, the toast says "storage is full" (`js/home.js:1425`), which is wrong for a read error.

**Build**
1. Add a strict reader beside `idbGet`: `idbGetStrict(db, key)` resolves `{ ok: true, value }` or `{ ok: false }` on `onerror` or a thrown exception. Add `idbGetMediaStrict` that follows a pointer the same way and reports `{ ok: false }` if either read errored (a pointer at a genuinely absent target stays "absent, skip": that is a state the file really can be in).
2. In `duplicateFrom`'s loop (`:2666`): if `!r.ok` then `whole = false; break;`, so the existing rollback (`:2677-2682`) runs. Keep the quiet skip for a real absence.
3. `js/home.js:1425`: reword to `'Could not duplicate that project, nothing was copied'`. It is shown for both causes.
**Test** (`1003 a clip that cannot be read stops the duplicate`): the script I used (patch `IDBObjectStore.prototype.get` to fail for `/^l_/` keys), modelled on `tests/tests.js:770-815`. Assert `duplicate` returns `false`, adds no card, leaves no new `fm.proj.*` key and no new clip key. Restore the patch in `finally`. **Fails on v17.23** (`true`, a card). Control: same call without the fault returns true.
**Effort:** an hour. **Risk:** a flaky read now cancels a duplicate instead of making a quietly incomplete one, which is the intent.

---

## Order

1. **#1002 step 1**, then **#1001**, then **#1003** and **#1000**: four small, independent storage fixes. Together about half a day with the tests.
2. **#1002 host half** next.
3. **#996** whenever a test cleanup pass is next: it is three small edits and the guard.

## What I did not do

No fix was applied, so every "fails on v17.23" is the claim of the reproduction above, not a run of the finished test. I did not reproduce #1002's host receive loop. I did not read ChatGPT's commits for #1000 to #1003 (they are not on the branch I reviewed in H16).
