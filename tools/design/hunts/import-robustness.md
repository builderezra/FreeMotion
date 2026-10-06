# Opening untrusted files: robustness review (H8)

Against `origin/main` b46b47d (v17.23). Report only: no app or test code changed.
**Unlike my earlier hunts, most of this was measured.** I served the app from this exact commit (`tools/serve.sh`), drove headless Chromium over the DevTools protocol on Linux, and called the real import functions (`FM.storage.importObject`, `restoreBackup`, `FM.fonts.applyEmbedded`) with hostile objects, in a fresh browser per case, reading how long they took, whether they threw, and what the scene looked like afterwards. Timings are from a fast Linux machine at a 1080×1920 project: **a phone is slower, so read each number as a floor.** The probe scripts were scratch files and are not in the repo; the cases are listed below so they can be turned into tests.
**Measured** = the number came from a run. **Read** = I read the line. **Guess** = not verified.

## 0. The map of the doors

All four kinds of file go through the same gate. A template or element is saved as the same `.fmotion.json` a project is (`js/storage.js:3106`), a backup is a list of those (`FM.storage.restoreBackup` `js/storage.js:1929`), and a project import is `FM.storage.importFile` (`:2015`) → `sceneFileProblem` (`:1974`) → `importObject` (`:1989`) → `applyScene` (`:1694`) → `clampProjectDims` and `sanitizeProjectFields` (`:1004`, `:1028`), `sanitizeImportedLayers` (`:1638`), `reIdLayers`. Fonts go through `FM.fonts.applyEmbedded` (`:3742`) and media through `dataURLToFile` (`:943`).

**What is already good (measured, so nobody re-checks):** layer ids `__proto__` and `constructor` with matching parents imported cleanly in 121 ms; non-numeric transform values (`"abc"`, `{}`, `"1e999"`, `[]`) did not break the render; `start` and `duration` of 1e12 imported in 107 ms; effect parameters nested 20,000 levels deep imported in 264 ms; `omitted`, `fonts`, `media` and `selectedIds` as plain strings were ignored; a full localStorage (writes to `fm.proj.*` made to throw `QuotaExceededError`) gave a clear message ("Storage full — no room for a new project, so none was made"), created **no** project and returned false. The sanitisers are thorough about shapes. The weakness is **size and cost**, not shape.

## 1. Findings, severity-ranked

### HIGH: a legal-looking file can freeze the tab, with no warning

**H1. The cost of effects is not bounded.** The stack is capped per layer at `FX_MAX = 120` (`js/storage.js:1371`) and layers at 2,000 (`:1979`, `:1696`), but nothing bounds the product.
- **Measured:** one layer with 250, 500, 1,000 or 2,000 blur effects (cut to 120 by the cap) took **about 25 s** to open, every time (24.3 to 25.7 s). **100 layers each with 20 Glow effects did not open in 60 s** (tab frozen); so did 300 and 600 layers. The time is the first full-size render at the end of `applyScene` (`refreshAll`, `requestRender`), not parsing.
- **Why it matters:** the file is autosaved as the current project, so a project that freezes on open can freeze on every relaunch (**guess**: I did not reload the page; `js/storage.js:1002` says the same shape bricked relaunch for 16000 px canvases).
- **Smallest fix:** a **budget at open**: count enabled effects across the whole project; above a threshold (say 300) open with effects paused and a banner "N effects are paused so this opens quickly. Turn on" (the preview ladder and `FM._perfOfferState` `js/app.js:469` already exist for the playing case; this is the same idea for the opening case). Also lower `FX_MAX` from 120 to 48: nobody stacks 120.
- **Test idea:** import 100 layers × 20 glows; assert the import promise resolves in under 2 s and the banner is present; assert the effects switch back on at a tap.

**H2. Keyframes are uncapped, and the cost is quadratic.** `sanitizeKeyframes` (`js/storage.js:1615-1635`) filters and sorts but has no count cap (the audio-effect path does: `AFX_MAX_KF = 200`, `:1095`).
- **Measured** (one property, N keyframes): 2,000 → 0.2 s import and 0.12 s timeline rebuild; 10,000 → 1.1 s and 0.8 s; **40,000 → 9.0 s and 9.2 s**; 300,000 → did not finish in 60 s. Doubling N costs about four times as much, so it is superlinear, and the timeline rebuild (one DOM dot per keyframe) is as slow as the import.
- **Smallest fix:** keep at most 2,000 keyframes per property (the first by time), and say so in the import toast.
- **Test idea:** import 50,000 keyframes; assert at most 2,000 remain and the import takes under 1 s.

**H3. Path points are uncapped.** **Measured:** 5,000 points 0.24 s, 20,000 0.81 s, **80,000 9.9 s** (4× the points, 12× the time), 1,000,000 did not finish in 60 s. **Fix:** cap at 20,000 points (resample longer paths). **Test:** import 100,000 points; assert ≤ 20,000 and under 1 s.

**H4. A backup can hold any number of projects.** `restoreBackup` loops `obj.projects.length` with no cap (`js/storage.js:1929-1960`).
- **Measured:** about **175 ms per project** even for an empty one (10 → 1.8 s, 25 → 4.0 s, 50 → 8.9 s, linear), and **500 did not finish in 60 s**. Each is a real project card in `fm.projects`.
- **Fix:** refuse more than 200 projects with a clear message, and yield to the event loop between projects so the progress callback can paint (`onProgress` exists, `:1941`).
- **Test idea:** restore 300; assert refusal with a message and that nothing was created.

**H5. Embedded fonts are unbounded in count and size** (`FM.fonts.applyEmbedded`, `js/storage.js:3742-3760`). The collab path caps size (`LIM.FONT_MAX`, `js/collab-media.js:396`); the file path caps nothing.
- **Measured:** 200 valid fonts (a real 885 KB TTF each, **177 MB** of IndexedDB writes, computed with a script) registered and stored in **8.5 s**; all 200 were listed. 5,000 invalid entries took 6.9 s just to fail.
- **Smallest fix:** at most 16 fonts and 40 MB per file.
- **Test idea:** apply 40 fonts; assert 16 registered and the rest reported.

### MEDIUM

**M1. Wrong types in the top-level fields throw halfway, and leave an empty project with no message.**
- `sceneFileProblem` checks `!obj.project` and `Array.isArray(obj.layers)` only (`js/storage.js:1974-1981`).
- **Measured:** `project: "x"` → `TypeError: Cannot create property 'width' on string 'x'`, thrown **after** `FM.projects.create` had already made a project (project count +1), **no toast**. (This is the case #1051 and #1001 already name; now measured.) **New:** `project: [1,2]` is **accepted**: the import "succeeds" and `FM.scene.project` is an array. And `layers: [1, "a", true, [], null, {}]` throws `Cannot create property 'start' on number '1'` from `sanitizeTiming`, again after the empty project was created, again silent.
- **Smallest fix:** in `sceneFileProblem`, require `project` to be a plain object and every layer to be a plain object, **before** `projects.create` (the file's own comment at `:1983-1987` says validate-then-create is the rule). Drop non-object layers instead of refusing.
- **Test idea:** the three files above; assert a message, no new project, the open project untouched.

**M2. Text length is unbounded.** **Measured:** one text layer of 2,000,000 characters imported in 1.9 s; the render of it at only 108×192 px took 243 ms, so a full-size render is far worse (**guess**: scales with the wrap cost already named in #1048). **Fix:** cap `text` at 20,000 characters on import. **Test:** import 2 MB of text; assert 20,000 remain.

**M3. Font `css` and `family` are stored unchecked from a file.** **Measured:** a valid font with `css: "x; } body { display:none } @import url(http://evil.example/a.css);"` and another with a family containing a quote were both registered, stored and listed with the strings exactly as given. The page did not change (`body` stayed `display: block`), and the string is used as a CSSOM property (`abc.style.fontFamily = css`, `js/text-edit.js:473`) and as a layer's `fontFamily` for the canvas, so the damage looks bounded (**guess**). The collab path validates the same field (`FAMILY_RE`, `js/collab-media.js:415`, with a comment saying a family name "becomes CSS"). **Fix:** apply a shape check to `family` and `css` on this path too. **Test:** the hostile `css`; assert it is rejected or replaced by `family + ', sans-serif'`.

### LOW

**L1. The whole file is read into memory.** `importFile` calls `file.text()` with no size check (`js/storage.js:2022`; #1007 names this). Add a warning above 50 MB.

**L2. IndexedDB write failure during an import was not conclusive.** With `IDBObjectStore.put` made to throw during `importObject`, the import returned true and said "Project imported". The media was in memory, and the app has a once-per-clip "could not be saved" warning (`js/storage.js:305`) that presumably fires at the next autosave, after my probe had put `put` back. **Guess**; needs a test that keeps `put` failing through an autosave.

## 2. Verified vs guess

Measured: every number in H1 to H5 and M1 to M3, and everything in the "already good" list. Read: line numbers, and the claim that the autosave makes a freezing project freeze again. Guess: relaunch behaviour (H1), the real cost on a phone (every number is a floor), the font `css` damage bound (M3), the IndexedDB behaviour (L2).

## 3. Order I would fix them in

1. M1 (small, and the empty-project bug is the one a user can hit with a corrupt file). 2. H2, H3, M2 (three caps in the sanitisers, same file, same test pattern). 3. H5 and M3 (fonts). 4. H4 (backup cap). 5. H1 last, because it needs the "paused effects" banner designed first (his rule: nothing visual unseen), though the `FX_MAX` cut can ship alone.
