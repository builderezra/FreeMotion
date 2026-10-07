# Plans for the five after P7 (P8): #1004, #1005, #1006, #1007, #1008

Against `origin/main` b46b47d3 (v17.23). Plans only. **Reproduced / Measured** = I ran it in my container on the unmodified v17.23 page (a fresh browser profile each time, so nothing persisted). **Read** = I read the line. **Guess** = not verified.

## Which five

By the same rule as P7 (the queue classifier on `REQUESTS.md`), the next five audit-tier items after #1003 are **#1004 to #1008**. All five are ChatGPT's (`JUMPED: assigned to ChatGPT via the PM (5 Oct lane split)`), each with a write-up in `tools/design/chatgpt-tasks/reports/VERIFIED.md` (§1.5 to §1.9) that says **"Verified by: reading only"**. So the useful thing I could add is the run: **all five hold up**, four of them as data-loss or silent-delete bugs I could reproduce in the browser. Each plan says what to check when ChatGPT's commit arrives.

**What they have in common (the one thing to build once):** three of the five (#1004, #1005, #1006) are the same shape, "a storage read or write that failed is treated as if nothing was wrong, and the next step destroys data". The fix for each is "fail closed": on an unreadable doc, an unwritten key or a failed write, do **nothing destructive** and keep a copy.

---

## #1004 A project file that will not open gets overwritten with a blank one

**Reproduced.** I stored `fm.proj.pBROKEN1004 = 'garbage{'`, added a card for it, and opened it. `FM.projects.open` **returned `true`**, the project became current, and the key still held `garbage{` at that moment. Then `FM.storage.flushSync()` (what the app calls when he switches apps) ran, and the key now held `{"rev":1,"project":{"name":"Broken 1004","width":1080,...` : **a blank scene had replaced the corrupt document.**

**Where (Read).** `load()` pins the tab to the project and zeroes the rev before parsing (`js/storage.js:875-876`), then returns `false` when the text does not parse (`:880-881`) while the tab **stays bound**. `open()` carries on with an emptied scene and returns true. The next save finds no `{"rev":N` prefix, reads the rev as 0 (`revOf`, `:72-76`) and writes a blank scene at rev 1 (`writeScene`, `:108`). The corrupt text, which might have been recoverable, is gone.

**Build**
1. In `load()`, when `raw` is non-empty but does not parse to a scene with `.project` (the branch at `:880`): copy `raw` to `fm.proj.<id>.unreadable` (once; do not overwrite an earlier copy), and **unbind the tab** (`_bound = true; boundId = null`) so `writeScene()` has nothing to write to (`:110` already treats "no project open" as "nothing to save"). A missing doc (`raw === null`) keeps today's behaviour.
2. In `FM.projects.open` (`:2487+`): when `load()` returns false for a project that HAS a card, return `false` and toast "That project could not be read. A copy of its data was kept." instead of opening a blank one. (This is the half VERIFIED.md does not mention, and it is what makes the bug visible to him.)
3. Do not show the "newer copy" toast for this case.
**Test** (`1004 an unreadable project is never overwritten`): the exact script above. Assert `open` returns false, the key still reads `'garbage{'` after `flushSync()` and after 700 ms, and `fm.proj.<id>.unreadable` holds the same text. **Fails on v17.23** (overwritten, `open` true). Control: a good project opens and saves as before.
**Effort:** an hour. **Risk:** low; it only changes a case that is already broken.

---

## #1005 The boot cleanup deletes media that belongs to an unreadable project

**Reproduced.** A stored clip (`l_orphanK1005`) and a broken project doc (`fm.proj.pBROKEN1005 = '{"rev":1,"project":'`). `FM.projects.pruneOrphans()` **deleted the clip** (readable afterwards: false). Control with no broken doc: also deleted (it is a true orphan), which is exactly why the fix must be "any unreadable doc stops every deletion this boot", not a per-id rule: when a doc cannot be parsed, the sweep cannot know which clips it owned.

**Where (Read).** `collectKeep` (`js/storage.js:2936-2940`) reads each `fm.proj.*` with `readJSON(lk, null)` (which returns the default on a parse error, `:18`) and adds layer ids only `if (d && d.layers)`; the sweep then deletes everything not kept (`:2998`). Boot runs `pruneOrphans` at `js/app.js:6877` even after `load()` returned false.

**Build**
1. In `collectKeep`: if a `fm.proj.*` key exists whose text is non-empty but does not parse to an object with a `layers` array, set `unsafe = true`.
2. If `unsafe`, **skip every deletion this boot** (blobs and thumbnails) and `console.warn` the id once. The sweep runs again next boot, so nothing is lost by waiting.
3. `keep2` (`:2995`) takes the same flag.
**Test** (`1005 the boot sweep deletes nothing while a project doc is unreadable`): store blob K referenced by nothing, set `fm.proj.broken = '{"rev":1,"project":'`, run `pruneOrphans()`, assert K still exists. Control: remove the broken doc, run again, assert K is deleted. **Fails on v17.23** (K deleted in the first half). **Order:** build with #1004, same theme and same reproduction harness.
**Effort:** an hour. **Risk:** a permanently corrupt doc stops all cleanup forever; mitigate by reaping the `.unreadable` copy after N boots, or tell him once in Settings. **Guess:** that this is acceptable; it is the safe side.

---

## #1006 Opening a pre-v2.25 install with a full disk deletes the only scene

**Reproduced.** I set a legacy `fm.scene`, cleared the current-project pointer, made every write to an `fm.proj.*` key throw `QuotaExceededError`, and called `FM.projects.migrate()`. Result: **`fm.scene` was removed anyway, and a card named "Legacy 1006" exists whose document does not exist.** (`legacySurvives: false`, `cards: 1`, `cardDocExists: false`.)

**Where (Read).** `migrate()` (`js/storage.js:2406-2442`): `writeJSON('fm.proj.' + id, legacy)` has its result ignored (`:2435`), the card is added, `try { localStorage.removeItem(SCENE_KEY); }` runs unconditionally (`:2437`) and the current pointer was already set (`:2433`).

**How much it matters:** VERIFIED.md says it cannot happen on his devices (they migrated long ago, nothing writes `fm.scene` since v2.25) and I agree; it is a silent delete-after-failed-write kept for completeness. Cheapest of the five.

**Build:** (1) check `writeJSON`'s result; (2) remove `fm.scene` only after reading `fm.proj.<id>` back and seeing a `.project`; (3) on failure, clear `CUR_KEY` and do not add the card, so the next boot retries. **Test** (`1006 a failed migration keeps the legacy scene`): my script. Assert `fm.scene` survives and no card points at a missing doc. **Fails on v17.23.** **Effort:** half an hour. **Risk:** none.

---

## #1007 Opening a huge project file has no size warning

**Measured.** I built a valid project file with 16 embedded 4 MB images (85 MB) and drove `FM.storage.importFile` through its file input. `File.prototype.text` was called on **85 MB** with no warning, and the import finished in **0.5 s** with one new project and the only toast "Project imported". JS heap after: 279 MB, against a 4096 MB limit on this desktop browser.

**Where (Read).** `importFile` (`js/storage.js:2015-2030`) does `JSON.parse(await file.text())` with no look at `file.size`; `sceneFileProblem` checks only the layer count (`:1974-1981`); `reIdLayers` then clones everything again (`:1712`). Real exported files embed media (6 MB each, no count cap, `:970`), so **a hard cap would refuse real projects: do not add one** (VERIFIED.md is right about that).

**Build**
1. In the `change` handler (`:2017`), before `file.text()`: `if (file.size > WARN_BYTES)` ask once with the app's confirm pattern: "That file is N MB. It may take a while or run out of memory on a phone. Open it anyway?" with Open and Cancel; Cancel returns without reading.
2. **The number.** VERIFIED.md says about 300 MB. A back-of-envelope from my run (the text, the parsed object and the re-id clone are three copies of roughly the file's size) puts a 300 MB file at around 900 MB of heap, which is already past what a phone tab survives. I would warn at **150 MB** and say so; the warn costs a tap, the crash costs the tab. **Guess:** phone limits; I did not measure on a phone.
3. Optional, larger: stream or re-id in place to avoid the second copy (`:1712`). Not needed for the warning.
**Test** (`1007 a very large project file asks before it is read`): a `File` whose `size` property reads 400 MB (a stub; use `Object.defineProperty`), spy `File.prototype.text`; assert the question appears and `text` is **not** called until he accepts. Control: an 85 MB real file (as above) imports without a question at the chosen threshold.
**Effort:** an hour. **Risk:** none for normal files.

---

## #1008 Group rendering rescans the whole scene once per group, every frame

**Measured (V8, not JSC as in VERIFIED.md).** 490 leaf layers, a frame rendered on a 64 x 64 canvas, best of 7: 0 groups **2.4 ms**, 10 groups **3.0 ms**, 50 groups **4.8 ms**, 250 groups **13.1 ms**. With counting wrappers on one frame at 250 groups: `scene.layers.forEach` was called **251 times** (once per group plus one), each walking all 490 layers. The cost grows linearly with the group count, about 0.04 ms per group on this machine.

**Where (Read).** `collectGroupUnits`, `js/compositor.js:17863-17919` on the commit VERIFIED.md cites (the function has moved since: it is near `:18395` now, search the name); it runs once per frame from `renderScene` and during export. **Honest size:** typical projects have a handful of groups, so this is real only at hundreds of groups; 13 ms is a third of a 33 ms frame at 250 groups. Low priority, which is how it is filed.

**Build:** as VERIFIED.md: one pass building `childrenOf[parentId]` and an index map, `walk` iterates the children, keep `seen` as the cycle guard, **do not cache across frames** (opacity can animate). Note that #1041's fix (in the ChatGPT chain I reviewed in H16) edits the same function (`js/compositor.js` `childOwner`, replacing `innerOf`), so **land #1041 first and build this on top**, or the two will conflict.
**Test** (`1008 group rendering does not rescan the scene per group`): 250 groups and 490 leaves, wrap `scene.layers.forEach` and `indexOf` with counters, render one frame, assert `forEach` is called fewer than 10 times (v17.23: 251). Add the equivalence check VERIFIED.md names (unit, depth and maskId assignments identical for nested, reversed, maskGroup and parent-cycle fixtures). Do not assert a time: it would flake.
**Effort:** half a day with the equivalence fixtures. **Risk:** the equivalence check is the whole safety net; do not skip it.

---

## Order

1. **#1004 and #1005 together** (one harness, one theme, the two with real data loss). About two hours.
2. **#1006** (half an hour) and **#1007** (an hour).
3. **#1008** after #1041 lands.

## What I did not do

No fix was applied, so each "fails on v17.23" is the reproduction above, not a run of the finished test. I did not read ChatGPT's commits for these five (they are not on the branch H16 reviewed). #1007's phone limit is a guess.
