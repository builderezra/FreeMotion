# ChatGPT batch 1: verified against the current tree (1 Oct)

ChatGPT read snapshot **28104a3e (v17.21)**. HEAD is still 28104a3e and `js/`, `sw.js` and `index.html` are clean,
so every file:line below holds in the current tree. Verification was done by reading the code and, where marked,
by running the real functions under `osascript -l JavaScript` (JSC, the iPhone's engine). No browser runs, and
nothing in the app was edited.

Raw reports: `security.md`, `data-safety.md`, `performance.md`, `effects-pack.md`, `sound-effects.md`, `identity.md`.
Vetted design write-ups: `effects-pack-VETTED.md`, `sound-effects-VETTED.md`, `identity-VETTED.md`.

**For the builder:** section 1 becomes hunt items. Each header is ready to use as `(hunt <SEVERITY> #n)`, and they
sort behind his own requests, as `_classify.py` requires. Do not merge or build from the `chatgpt/*` branches.

---

## 1. Confirmed new issues (ranked)

### 1.1 A stale second tab writes its old media over a newer replaced file (hunt HIGH)
- **From:** data-safety F1
- **Where:**
  - `js/storage.js:743-747` plans the blob jobs, then calls `writeScene()`.
  - `writeScene()` refuses with `_writeFail='stale'` (`:111`, `:115`), and `save()` never checks that.
  - The blob loop at `:768-800` runs anyway. `:789-790` writes on any rev mismatch, including when the disk copy is newer.
  - The hydrated rev is 0 (`:470`, `:572`).
  - `replaceMedia` at `js/app.js:4780-4783` points the library tile at the same key.
  - `releaseSceneMedia` (`:546-549`) then frees the new file from tab B's memory.
- **What he'd see:** he has the app open twice (two tabs, or phone and installed PWA). He replaces a clip in one,
  and the other, older tab saves. The project reopens with the **old** clip, and the Media library tile also gives
  back the old one. The new file has no other copy on disk, so it is lost. The "newer copy" toast at `:89` says
  nothing was saved over his work, which is false for media.
- **Fix:** in `save()`, right after `writeScene()`, skip the blob loop when `_writeFail === 'stale'`. Keep the
  loop for `'refused'` (quota). Stop `notePending` (`:745`) recording notes for a tab already known to be stale.
  Do **not** change the rev comparison to "only higher", because undo legitimately writes older revs.
- **Test:**
  1. Seed image layer `clip` with blob A at rev 0, and load it.
  2. Fake the other tab: write `fm.proj.<id>` with rev = disk+1 and `mediaRev:1`, then
     `FM.storage.writeMedia('clip', {file:B, kind:'image', rev:1})`.
  3. Make a transform edit and `await FM.storage.save()`.
  4. Assert `FM._sceneRevState().stale` is true and `readMedia('clip')` is still rev 1 with B's bytes.
     Today it gives rev 0 with A's bytes.
- **Verified by:** reading only. It has not been run in a browser yet.

### 1.2 An import that throws leaves an empty "Imported project" behind (hunt LOW)
- **From:** security F2 (depth overflow). The ordering problem is the verifier's own finding.
- **Where:** `importObject` (`js/storage.js:1988-2009`) awaits `FM.projects.create(...)` **before** `applyScene`.
  A *throw* (not a `false` return) skips the cleanup and lands in `importFile`'s outer catch (`:2046`).
- **What he'd see:** the toast says "Could not read that project file" while he is now sitting in a new, empty
  project named after the file. This is #673's "the import destroyed my project" symptom, back for the throw path.
  Any throw does it. The deep-nesting trigger needs about 100k levels on JSC (20k survived), so it is extreme.
- **Fix:** wrap `applyScene` in try/catch inside `importObject`. On a throw or a `false` return, delete the
  just-created project, switch back to the previous one, then toast. As an option, cap nesting depth in
  `sceneFileProblem` with an iterative walk (over about 200 = "damaged file").
- **Test:** count projects, then monkey-patch `FM.storage._reIdLayers` to throw once and call `importObject`.
  Assert the count is unchanged, the previous project is still current, and a failure toast fired.
  Control: a valid object adds exactly 1 project.

### 1.3 A collaborator's bad edit can half-apply on the host's copy and crash its receive loop (hunt LOW)
- **From:** security F1
- **Where:**
  - `js/collab-host.js:661` applies the op first. Then `invariantFix` (`:684-686`) calls
    `js/collab-bridge.js:144`, then `FM.storage._sanitizeLayers`, then `sanitizeUnsafeValues`.
  - `js/storage.js:1537` checks only `if (l.fillGradient)`, and `:1542` writes `.angle` onto it.
    That throws when it is a string, number or `true`.
  - The throw escapes `H.receive` (`:883`).
- **What he'd see:** nothing, unless a collaborator runs a modified client. Reproduced in JSC with the real modules.
  The op stays in the host's document without being sequenced, no ack is sent, and later edits to that layer also
  throw. It heals on the owner's next `pushLocal` tick (`collab-session.js:188-190`), which is about one tick.
  Inside that window, an honest guest's edit to that layer is reverted, and a `catchUp` snapshot
  (`collab-session.js:771-784`) can ship the unsanitised layer to another guest. Out of 26 fields × 9 shapes,
  `fillGradient` is the only one that throws.
- **Fix:**
  1. In `sanitizeUnsafeValues`, delete `fillGradient` when it is not a plain object. This also hardens the
     every-open load path (`storage.js:903`) and history restore.
  2. Make the host's tx atomic. Clone the touched layers, try/catch the `inv.*` calls, and on a throw restore
     the clones, reject the ops as `'bad'` and send the normal ack with a repair.
- **Test:** a 921 S1-style host test (no network). An editor sends `s L/a/fillGradient 'bad'`.
  - Assert it does not throw, the op is rejected or dropped, and no non-object `fillGradient` remains.
  - Assert the next editor tx on layer `a` gets a non-null `ack.seq`.
  - Control: `{c0:'#fff', angle:'999'}` is accepted and clamped to 360.

### 1.4 Duplicate says "done" even when it could not read a clip (hunt LOW)
- **From:** data-safety F2
- **Where:**
  - `js/storage.js:175`: `idbGet` resolves `null` on error, the same as "absent".
  - `duplicateFrom` (`:2666-2667`) does `if (!rec) continue;`, so `whole` stays true (`:2659`) and it returns
    `done(true)` (`:2678`).
  - `js/home.js:1423-1427` then shows the new card.
- **What he'd see:** a duplicate that looks whole but has a missing clip. He only loses work if the read error was
  temporary *and* he later deletes the original. That is rare, but the copy claims to be complete when it is not.
- **Fix:**
  - Use a strict reader that tells "error" apart from "absent", and set `whole = false` on an error so the
    existing rollback runs (`:2602-2607`).
  - Keep the quiet skip for a genuine absence.
  - Make Home's failure toast generic. Today it says "storage is full", which is wrong for a read error.
- **Test:** patch `IDBObjectStore.prototype.get` so `get('clip')` fires `onerror`, then call `FM.projects.duplicate(id)`.
  Assert it returns false, adds no new card and leaves no new `fm.proj.*` key. Restore the patch in `finally`.

### 1.5 A project file that will not open gets overwritten with a blank one (hunt LOW)
- **From:** data-safety F3b
- **Where:**
  - `js/storage.js:875` binds the tab and calls `adoptRev(0)` before parsing.
  - `:880-881` returns false and the tab stays bound.
  - `js/app.js:6847-6861` opens Home, and pagehide/visibility (`:3776-3777`) calls `flushSync()`, then
    `writeScene()` (`:808`).
  - `revOf` (`:72-76`) gives 0 for text without a `{"rev":N` prefix, so the blank scene is written at rev 1.
- **What he'd see:** a project that failed to open is gone for good the moment he switches apps. It is exposed
  only for docs written via `writeJSON` (duplicate `:2644`, migrate `:2436`, createLinked), and only if the doc
  is already corrupt. That precondition is close to zero in normal use.
- **Fix:** when `raw` is non-empty but has no `scene.project`:
  - copy it to `fm.proj.<id>.unreadable`;
  - mark the tab unwritable for that id, or unbind it (no "newer copy" toast);
  - leave a missing doc (`raw === null`) behaving as today.
- **Test:** set `fm.proj.pX = 'garbage{'` and make it current. `load()` returns false. Then call `flushSync()`
  and assert the key is still `'garbage{'`.

### 1.6 The boot cleanup deletes media that belongs to an unreadable project (hunt LOW)
- **From:** data-safety F3
- **Where:**
  - `js/storage.js:18`: `readJSON` returns the default when parsing fails.
  - `collectKeep` (`:2936-2940`) and `keep2` (`:2995`) add no layer ids for an unreadable doc.
  - `:2998` `idbDel` then removes the blobs.
  - Boot runs `pruneOrphans()` at `js/app.js:6877`, even after `load()` returned false.
- **What he'd see:** the same corrupted-doc precondition as 1.5. It also deletes that project's clips. It is the
  one deleter in the app that fails open.
- **Fix:** fail closed. If any `fm.proj.*` doc does not parse to an object with a `layers` array, skip every
  deletion this boot. The sweep runs again next boot.
- **Test:**
  1. Store blob K with nothing referencing it.
  2. Set `fm.proj.broken = '{"rev":1,"project":'`.
  3. Run `pruneOrphans()` and assert K still exists.
  4. Control: without the broken doc, K is deleted.

### 1.7 Opening a pre-v2.25 install with a full disk deletes the only scene (hunt LOW)
- **From:** data-safety F4
- **Where:**
  - `js/storage.js:2436` ignores `writeJSON`'s false (quota).
  - It still adds the card (`:2437`), removes `fm.scene` (`:2438`) and points `fm.currentProject` at the new id
    (`:2433`).
- **What he'd see:** nothing on his devices. They migrated long ago, and nothing has written `fm.scene` since
  v2.25 (16cc73c4). Logged because it is a silent delete-after-failed-write.
- **Fix:** check the write. Remove `fm.scene` only after reading back the new key with `.project` present.
  On failure, clear the pointer so the next boot retries.
- **Test:** make `setItem` throw `QuotaExceededError` for `fm.proj.*` keys, then call `FM.projects.migrate()`.
  Assert `fm.scene` survives and no card points at a missing doc.

### 1.8 Opening a huge project file has no size warning (hunt LOW)
- **From:** security F2
- **Where:**
  - `js/storage.js:2041` calls `JSON.parse(await file.text())` with no `file.size` check.
  - `sceneFileProblem` (`:1974-1981`) checks only the layer count.
  - `reIdLayers` makes another full clone (`:1712`), so the peak is about 3× the file.
  - Unknown layer keys survive the sanitiser.
- **What he'd see:** picking a several-hundred-MB file could kill the tab on a phone. Harm is unmeasured. Real
  files embed media (6 MB each, `:970`, no count cap), so **do not add a hard cap**.
- **Fix:** read `file.size` first, and above about 300 MB show a "this may take a while or fail on a phone" toast
  and let him continue. On the import path, re-ID in place instead of cloning.
- **Test:** a File stub with `size` = 400 MB. The warning appears before `.text()` is called (use a spy).
  Control: a 1 MB file shows no warning.

### 1.9 Group rendering rescans the whole scene once per group, every frame (hunt LOW)
- **From:** performance P1
- **Where:**
  - `collectGroupUnits`, `js/compositor.js:17863-17919`: `scene.layers.forEach` runs per visited group (`:17879`).
  - `byId` is rebuilt per call (`:17903`), and the maskGroup branch calls `indexOf` per drawable (`:17884-17886`).
  - It is called once per frame from `renderScene` (`:18353`), including during export (`js/exporter.js:1479`).
- **What he'd see:** only on big projects. JSC timings:
  - 490 layers with 10 groups: 1.46 ms per frame.
  - 250 groups: 16 ms per frame.
  - 50 nested groups over 450 layers: 118 ms per frame.
  - Typical projects: under 0.1 ms.
- **Fix:** build a `childrenOf[parentId]` map and an index map in one pass, and have `walk` iterate the children.
  Keep `seen` as the cycle guard. Do not cache across frames, because opacity can animate.
- **Test:** 250 opacity-0.5 groups (plus a 50-deep nest) with counting wrappers on
  `scene.layers.forEach`/`indexOf`. One `renderScene` must make fewer than about 5×N callbacks (today 125,500).
  Equivalence check: the unit, depth and maskId assignments match for the nested, reversed, maskGroup and
  parent-cycle fixtures.

### 1.10 Image fills from a previous project stay in memory all session (hunt LOW)
- **From:** performance P3
- **Where:** `js/compositor.js:14672`. `_fillImg` lives as long as the module. `getFillImage`
  (`:14673-14695`) evicts at most one dead entry, and only above 40. Nothing clears it when a project opens.
- **What he'd see:** memory creep only after projects with many image-filled shapes (each up to 1024px,
  `js/inspector.js:4103-4107`). This is a niche feature.
- **Fix:** when the scene identity changes, drop all dead entries. Also set `img.src` to null on evicted records.
- **Test:** 100 distinct fills, then switch to an empty project with one fill, then render.
  The cache holds at most 1 entry. Control: within one project, the 100 fills are not decoded again.

### 1.11 The no-GPU blur fallback allocates two big buffers per call (hunt LOW)
- **From:** performance P2
- **Where:** `js/compositor.js:1834-1838` creates `new Float32Array(N*4)` twice on every call. It runs only when
  `ctx.filter` is missing **and** WebGL blur returns null (`:1898-1899`, `js/gl-color.js:331-336`).
- **What he'd see:** effectively never on his iPhone, which has WebGL. Logged so it is not lost.
  Fix it only when this code is touched anyway.
- **Fix:** reuse module-level scratch buffers that grow when needed. The function is synchronous, so one pair is safe.
- **Test:** with `FM._noGL = true` and `ctxFilterOK` false, two calls at the same size allocate at most 2 buffers
  (today 4). Output is byte-identical.

---

## 2. Already known

- security N1: the BYOK key is in localStorage when "remember" is on. This is by design (`js/ai-key.js:1-8`;
  REQUESTS.md:32902). *Open side-question, not verified:* every repo on `builderezra.github.io` shares one origin,
  so any other app he publishes there can read this key and his projects. That matters only if he publishes
  a second app under that account.
- security N2: PostLink has `origin '*'`. It is deliberate and test-only (`js/collab-link.js:164-166`). It loads only
  under `C.testMode()` (`js/collab-core.js:447-466`). Covered by #921.
- data-safety N1: the leftovers are covered by #830, #829, #834, #915, #673, #748, and by audits 934, 915-5, 935,
  937 and 939-hunt.
- performance N1: timeline rebuild cost is covered by #95 (REQUESTS.md:2096, measured at 2137-2181) and #815.
- performance N2(d): the encoder/VideoFrame leak on export failure is noted under **#671**, which is closed
  (REQUESTS.md:26754-26758), but that half is still open: `js/exporter.js:1494-1498` closes the frame only on
  success. *Worth reopening as a small hardening item.* Test: make `encode` throw on frame 3, then assert every
  VideoFrame was closed and `encoder.state === 'closed'`.
- identity: all 7 confirmed items and both leads are already in `BEFORE-PUBLISHING.md`.

## 3. Wrong, or fixed since

- performance N2(a), "a group is rasterised at full project size": **fixed in v9.26** (adbdf569), with the
  comment at `js/compositor.js:17930-17934`.
- performance N2(b)/(c), listener leaks and gesture runaway: **too vague to check**. They cite no lines, so they
  only loosely match REQUESTS.md:18378, :28923, #524 and #707.
- performance P2: the code is right but the **reach is overstated**. It is a double fallback that his phone never takes.
- data-safety F1: **understated**. ChatGPT missed that the library tile and tab B's memory release make the
  loss permanent.
- data-safety F3 and F4: **real but overstated**. Both need a corrupt doc or a pre-v2.25 install.
- security F2: the "~8,000 levels" figure is V8's. On JSC (the iPhone) it is about 100,000.
- effects:
  - "The app has no way to look at earlier frames": **wrong**. Four shipped effects keep a short frame history.
  - Some filter recipes set a `mix` control the effects do not have. Those are dropped without a warning.
  - Seed ranges of 0-9999 should be 0-999.
  - It used the wrong way to link to a second layer.
  - Its pixel-size controls are not marked as pixels.
  - Five effects are rated "heavy" when a cheap version exists.
  - Six of the 20 effects largely repeat existing ones.
- sounds:
  - "REQUESTS.md asks for cartoon / foley / ambience": **wrong**. Only #196 and #290 are related, and both are done.
  - Anomaex "Sci-Fi Explosion 2" has an unknown original owner, so it is out.
  - Pixabay and Sonniss are not usable for a built-in menu.
- security N3, N4 and N5 and performance N3: these are **no-defect coverage claims**. Every cited line checks out,
  and there is nothing to log.

## 4. Design inputs (not hunt items)

- **Effects shortlist:** `effects-pack-VETTED.md`. This is idle work for **#966**, and nothing ships before his
  picture-pick (#545).
  - **Upgrades first.** They change nothing on existing projects at their defaults, and each needs only a
    before/after:
    - Pixelate "Keep outline"
    - Mosaic tile bevel
    - Dots offset rows and ovals
    - Grid bold lines, shipped with the backlog's grid anti-aliasing fix
    - Contour Lines bold lines
    - Posterize band offset
  - **Then two sheets of six effects:**
    - Colour Delay
    - Character Art
    - Jigsaw
    - Ink Seep
    - Rain on Glass
    - Water Light
    - Low Poly
    - Stipple
    - Watercolour, sharing its core with the Oil Paint backlog idea
    - Paper Fold
    - Stitched Outline
    - Brushed Metal
  - **Then the 10 filters**, each only after its effects ship: Terminal, Colour Lag, Rainy Window, Pool Light,
    Gold Foil, Shards, Dotwork, Postcard, Folded Print, Patch.
  - Low Poly, Watercolour and Jigsaw still need a CapCut name check.
- **Sounds:** `sound-effects-VETTED.md`. 79 of 80 are CC0 and fine to ship without credit. The first set is 24
  sounds plus 2 nature loops, about 0.7-0.9 MB.
  - This is new work and his decision. He listens and picks, and he downloads the Freesound files himself,
    because full quality needs a login.
  - Bundling must solve these first:
    - Fetch the files with `?v=`, or they never work offline (`sw.js:92-96`, `:180`).
    - Old cached copies are never cleaned up (`sw.js:71`), so a changed sound needs a new filename.
    - Add a stereo path for sampled sounds, because the menu renders in mono (`js/sfx.js:575`).
    - New IDs must not clash with the existing `whoosh`/`punch`/`rain`.
    - Use WAV under 0.5 s and AAC `.m4a` for longer files. No Ogg.
- **Identity:** `identity-VETTED.md`. Held for launch. There are 18 alternative directions, ready to paste under
  the existing `BEFORE-PUBLISHING.md` entries. Four statements in that file are out of date and need
  wording fixes at launch:
  - The quick-add rail is now empty.
  - `--am-green` is really the logo's mint.
  - Camera Options has 4 screens, not 3.
  - "Object / Element" is no longer used in the app.

## 5. How good was ChatGPT

- **Bug, security and speed reports:** 20 items.
  - **11 confirmed new**, 5 already known, 4 no-defect notes, **0 wrong**.
  - Every one of the 11 defects it claimed held up (**11/11**), and 11 of 20 items were new (55%).
  - Only 1 of the 11 is serious (1.1). Two were stretched (P2 reach, F3/F4 preconditions) and one was
    understated (1.1). Its line numbers were exact.
  - It does not run code, so the depth limit and timings it gave were the wrong engine's.
- **Effects:** 14 of 20 effects are genuinely new (70%). Its build notes are unreliable: one false premise and
  several wrong mechanics.
- **Sounds:** the licence work was 79/80 right, with no dead links. One claim about his requests was invented.
- **Identity:** 0 new items, but it found 4 stale statements and gave useful alternatives.
- **Trust level for the next batch:** trust its *reading* of a code path and its citations. Check its reach,
  severity and "he asked for this" claims, and anything that depends on running code. Give it narrow,
  code-path-shaped questions (it did best on data-safety). Do not let it write build specs unchecked.

## 6. What to hand ChatGPT next (batch 3)

Batch 2 (`PROMPTS-batch2.md`, items 7-12) is already written. These follow directly from what batch 1 found.
All of them are read-only and report-only.

13. **Every deleter: does it fail closed?** List every code path that removes localStorage keys or IndexedDB
    records. For each, say what it does when it *cannot read* something (parse error, a get() error, a missing
    index). 1.4, 1.6 and 1.7 were all this shape.
14. **Create-then-fill atomicity.** Find every place that creates something (project, card, layer, library entry)
    and then fills it with a step that can throw. Say what is left behind on a throw. 1.2 and 1.3 were this shape.
15. **Cross-tab writes beyond the scene.** For media, library, fonts, settings, favourites and checkpoints: what
    does a stale tab overwrite? Building on 1.1, which is the only HIGH.
16. **Sanitiser type-shape table.** For every field the layer, project and media sanitisers touch: what happens
    on a string, number, boolean, array or null where an object is expected? 1.3 came from exactly one such field.
17. **Per-frame scans.** In `compositor.js` and `renderScene`'s callees, find loops over `scene.layers` nested
    inside per-layer or per-group work (the 1.9 pattern). Give a counted cost formula for each.
18. **Error-path cleanup in export and audio.** Encoder, VideoFrame, AudioContext, object URLs and workers on
    the *failure* path, not the success path (the #671 leftover).
19. **Specs for the six effect upgrades.** Parameter names, ranges and defaults, plus the "default is
    byte-identical" argument for each, so the builder can draw before/afters. Specs only, with no build notes
    on how they plug in.

Tell it the same rules as before: snapshot = current HEAD, file:line for every claim, separate "I read this"
from "I ran this", and never claim something is in REQUESTS.md without quoting the line.
