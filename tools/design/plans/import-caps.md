# H20: ready-to-build plan for the import caps and shape checks (from my own H8 findings)

Against `origin/main` b46b47d3 (v17.23). Plans only. **Reproduced / Measured** = I ran it in my container (headless Chromium, software GL, a fast desktop-class machine, so every time is a floor for a phone). **Read** = I read the line. **Guess** = not verified.

## 0. First, a correction to my own H8 that changes the plan

H8 said the freeze on opening a heavy project is "the first full-size render at the end of `applyScene`". **That was wrong about where the time goes.** I profiled the import (CDP CPU profile, 40 blur effects on one layer, 1080 x 1920):

| | |
|---|---|
| `FM.storage.importObject` total | 8.9 s |
| of which `makeThumb` (`js/storage.js:2133`), called by `touchCurrent` (`:2452`) | **8.85 s (99%)** |
| and inside it, the native `drawImage` that flushes the render | 88% of all samples |
| `applyScene`, the timeline rebuild, the inspector, the preview | about 0.2 s together |

`makeThumb` renders the whole scene onto a **full-size** project canvas (`src.width = P.width` at `:2142`, then `FM.renderScene(...)` at `:2149`) and only then halves it down to the 360 px card picture (`:2152-2158`). Canvas drawing is deferred, so the cost only shows when something reads the pixels, which is why a plain `FM.renderScene` call timed at 6 to 48 ms in my first attempt and the real cost was invisible. With a pixel read-back forced:

| scene, 1080 x 1920 | render at scale 1 | at 0.5 | at 0.25 |
|---|---|---|---|
| 10 blurs | 473 ms | 110 ms | 33 ms |
| 10 glows | **8218 ms** | 694 ms | 162 ms |

**It is not only an import problem.** `touchCurrent` runs on every autosave and re-captures the thumbnail "at most every 12 s when not playing" (`js/storage.js:2468`). So a project whose full-size render costs N seconds blocks the editor for N seconds **every 12 seconds of editing**. That fits the oldest open item (#6.33 "Editing lags, and gets bad fast"). **Guess:** that this is Ezra's lag. I have not run his projects; it is the strongest measured lead I have seen.

### Fix 0 (do this first, it removes the freeze at every entry path at once)

Render the card thumbnail at card size, not full size, in `makeThumb`:
```js
const s = Math.min(360 / P.width, 360 / P.height, 1);
const tw = Math.max(2, Math.round(P.width * s)), th = Math.max(2, Math.round(P.height * s));
const c = document.createElement('canvas'); c.width = tw; c.height = th;
c.__fmRS = s; c.__fmOX = 0; c.__fmOY = 0;            // the compositor's own scale and offset fields (tests/tests.js uses the same two)
FM.renderScene(c.getContext('2d'), FM.scene, <the same _endInstantTime as today>);
return c.toDataURL('image/jpeg', 0.8);
```
and delete the halving loop. **Measured proof of concept** (the same function written both ways in the page, same scene, thumbnail pixels compared):

| scene | old | new | pixel difference old vs new |
|---|---|---|---|
| no effect | 62 ms | 1 ms | mean 0.35 of 255 |
| 10 blurs | 505 ms | 10 ms | mean 0.37 |
| 10 glows | **8386 ms** | **108 ms** | mean **3.7** (glow's size follows the scale, so its halo differs a little) |

So 50 to 80 times faster, and visually the same within rasteriser noise (the card is 360 px and JPEG q0.8). **Show him before and after** for the glow case, because it is a visible (if tiny) change to a picture (his rule 16).
**Also (cheap, keeps working even if a render is still slow):** skip the periodic capture when the last one took over 500 ms, and when it does run, record `FM._lastThumbMs`. **Test:** `thumbnail cost does not grow with the project's size`: a 1080 x 1920 scene with 10 glows; `makeThumb()` (call it through `FM.projects.touchCurrent(true)` or expose a seam) must finish in under 1 s (fails on v17.23 at 8 s here); and the result decodes to a 360-wide image with a non-black centre. **Effort:** an hour. **Risk:** low; the thumbnail is cosmetic.

**What is left after Fix 0, and what the caps below are for:** the live preview still renders at screen size, so a project with thousands of effects is still slow to play; Fix 0 stops it freezing the tab on open and on every autosave. I have not measured the preview cost after the fix (nothing is built); I expect it to follow the 0.25-scale column above. **Guess.**

## 1. The doors, and what checks each one has today (Read)

| entry path | goes through | checks today |
|---|---|---|
| **Shared project file** | `importFile` (`js/storage.js:2015`) to `sceneFileProblem` (`:1974`) to `importObject` (`:1989`) to `applyScene` (`:1694`) to the sanitisers | layers at most 2000 (`:1979`, `:1696`); `project` and `layers` must exist and `layers` must be an array; **nothing about shape or size of anything else** |
| **Backup** | `restoreBackup` (`:1929`) calls `importObject` once per project | the per-project checks above; **no cap on the number of projects** |
| **Template / element** | the same `.fmotion.json`, inserted through `reIdLayers` (`:2040+`) and `sanitizeImportedLayers` (`:1638`) | the sanitiser caps below, nothing else |
| **Work-with-friends** | host `validOp` / `validateTx` (`js/collab-host.js:188-243`), then the invariants run `_sanitizeLayers` and `_clampProjectDims` on a clone (`js/collab-bridge.js:140-150`) | per message: 4 MB, 5000 ops, 2 MB a value, 200 000 chars a text leaf, 2000 layers, a rate limit (`js/collab-core.js:50-66`); **no cap on keyframes or points inside what is allowed** |
| **Fonts** | `FM.fonts.applyEmbedded` (`js/storage.js:3742`) | **none** for a file (the collab path caps size and family name, `js/collab-media.js:396`, `:415`) |

**The structural point:** every path except fonts and backup-count ends in the same sanitisers (`sanitizeKeyframes`, `sanitizeEffects`, `sanitizeImportedLayers`, and the path/mask code). **Put each cap in the sanitiser once** and it covers a file, a backup, a template, an element, a friend's edit, undo and every open. The cost of doing it there: **a sanitiser change has to be identical on every device in a session**, so it needs a `SCHEMA_REV` bump (`js/collab-core.js:48`; main is 7, Simple takes 8, F1-B in `plans/collab-privacy` needs one too: take the next free number at merge, and the fingerprint gate `tests/tests.js:30289` will name the new value).

## 2. The caps, with the numbers and why

The app already chose some numbers; reuse them so there is one story. Basis for the new ones: the **measured** import times from H8 and the app's own generators. **I could not look at a real user project** (nothing in the repo is one), so "what a real project uses" below is the app's built-in content and its own limits, not his data.

| what | today | proposed | why this number |
|---|---|---|---|
| layers per project | 2000 (`:1979`) | **keep 2000** | already agreed with collab (`LIMITS.LAYERS`) and with the S8 500-layer performance test |
| effects per layer | 120 (`FX_MAX`, `:1371`) | **keep 120** | **lowering it would delete saved effects on open** (H8 suggested 48; I now think that is the wrong trade). With Fix 0 the 120-blur freeze (25 s) is gone, so the cap no longer has to protect the tab |
| children of a Filter | 24 (`FX_CHILD_MAX`) | keep | exists |
| keyframes per property | **none** (audio and masks: 200, `AFX_MAX_KF` `:1095`, `MASK_MAX_KF` `:1274`) | **5000, the first 5000 by time** | measured import plus timeline rebuild: 2000 keys 0.3 s, 10 000 keys 1.9 s, 40 000 keys 18 s (superlinear). 5000 is about 0.7 s, and well above what the app's own sparse generators (`audioReact.bake`, `js/audio-react.js:372`, "never one keyframe per frame") write. Not a number from his projects |
| points in a path or shape | none (masks: 2000, `:1274`) | **20 000** | measured: 20 000 points 0.8 s, 80 000 9.9 s |
| text length | none | **200 000 characters** | the same number collab already allows for a text leaf (`STRING_LEAF`), so anything that can be shared live can be opened. (H8 suggested 20 000; that would make a shared project unopenable.) |
| fonts embedded in one file | none | **16 fonts and 40 MB** | measured: one real TTF is 885 KB, 200 of them took 8.5 s and 177 MB. 16 x 885 KB is 14 MB, so 40 MB leaves room for large CJK fonts |
| projects in one backup | none | **200** | measured about 175 ms each, linear. 200 is about 35 s, so it must **yield between projects** and call the existing `onProgress` (`:1941`) |
| file size to read | none | **warn above 50 MB** (do not refuse) | `importFile` reads the whole file as text (`:2022`); #1007 names it |

**Behaviour when a cap bites:** cut, never refuse, and say so once ("N keyframes on one control were too many to keep; the first 5000 are kept"). Refusing a whole project because one control is long loses more than it saves. The exceptions are shape errors (section 3) and the backup count (refuse, nothing created).

## 3. Shape checks (refuse bad shapes; never drop an unknown plain field)

**Before `FM.projects.create`** in `sceneFileProblem` (`js/storage.js:1974`), because the file's own comment (`:1983-1987`) says validate-then-create is the rule and `importObject` creates first (`:1993`):
1. `obj.project` must be a **plain object** (not a string, number or array): I **reproduced** `project: [1,2]` being accepted, and `project: "x"` throwing after a project was created.
2. `obj.layers` must be an array; **drop** entries that are not plain objects (do not refuse the file). Reproduced: `layers: [1, "a", true, [], null, {}]` throws from `sanitizeTiming` after the empty project exists.
3. `obj.media`, `obj.fonts`, `obj.omitted`: ignore if not the expected shape (H8 measured they already are).
4. **Unknown plain fields stay.** The sanitisers whitelist known keys; the rule from the Simple branch is the model (`smKeepUnknown` / `smPlain`, `js/storage.js` on `980-p22-trayb2`): keep any unknown key whose value is plain (null, boolean, finite number, a string up to 200 characters, or an array or object of those at most 3 deep, at most 24 keys, at most 2 KB), drop anything else. That stops "whitelist drift" losing a newer build's field.
5. **Fonts** (`js/storage.js:3742`): family must match the collab pattern `^FMF[A-Za-z0-9]{1,60}$` (`js/collab-media.js:415`); `css` must be the app's own generated form (H8 **measured** that a `css` of `x; } body { display:none }…` is stored verbatim, and the page did not change, so the damage looks bounded: **Guess**).
Related reproductions that belong with these (all Reproduced): a `fillGradient` that is a string, number or `true` throws in the sanitiser (`plans/helper-7`, #1002); `importObject` leaves an empty project on a throw or on a `false` (#1001).

## 4. Messages in plain words

- Bad project shape: "That file is not a FreeMotion project, so nothing was opened."
- A layer that is not a layer: silent (it is dropped); one toast at the end: "N items in the file were not layers and were skipped."
- Keyframes: "One control had N keyframes. FreeMotion keeps the first 5000."
- Path: "A shape had N points. FreeMotion keeps the first 20 000."
- Text: "A text layer was longer than 200 000 characters and was shortened."
- Fonts: "The file carries N fonts. FreeMotion keeps the first 16."
- Backup: "That backup holds N projects, which is more than FreeMotion will restore (200). Nothing was changed."
(Show him the words before they ship; they are the only visible part.)

## 5. Tests (each must fail on v17.23 first)

Use the cases I ran in H8 (each in a fresh page, real functions, hostile object in, scene and project list out). Names and assertions:
- `caps K keyframes`: one property with 50 000 keyframes; after import at most 5000 remain, they are the earliest, the import takes under 1.5 s (v17.23: about 4 s for 50 000, 9 s for 40 000), and a toast fired once.
- `caps P points`: 100 000 points; at most 20 000 remain; under 1.5 s (v17.23: more than 10 s).
- `caps T text`: 2 000 000 characters; 200 000 remain; layer still loads.
- `caps F fonts`: 40 valid fonts; 16 registered, the rest reported; total bytes under 40 MB.
- `caps B backup`: restore a backup with 300 projects; refused with the message; **no project created** (v17.23 starts creating them).
- `shape project`: `project: "x"`, `project: [1,2]`, `layers: [1,"a",true,[],null,{}]`: each gives a message or skips the bad entries, **adds no project when refused**, and leaves the open project untouched.
- `shape unknown field`: a layer with `futureField: { a: [1,2] }` keeps it; a layer with a function-like or 3 KB value drops that one field and nothing else. Control: a valid file imports and adds exactly one project.
- `thumbnail` (Fix 0) as in section 0.
- `schema`: the fingerprint gate moves with the bump (the existing test, `tests/tests.js:30313-30367`, mutates `SCHEMA_REV`; no new test, just the new number).
All of these run at 380 and 1280; none needs a layout.

## 6. Order

1. **Fix 0** (an hour, measurable, removes the freeze everywhere and probably the editing lag). Show him before and after.
2. **Shape checks** in `sceneFileProblem` (small; fixes #1001/#1051's trigger).
3. **Keyframe, path and text caps** in the sanitisers, with the `SCHEMA_REV` bump.
4. **Fonts, then the backup count.**
5. Leave `FX_MAX` alone.

## What I did not do

Nothing was built or applied. I did not look at a real user project, so every "real use" number is the app's own. I did not test the template or element paths separately: they share the sanitisers by reading, not by a run. I did not reproduce the friend (host) path.
