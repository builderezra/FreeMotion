# H20: ready-to-build plan for the import caps and shape checks (from my own H8 findings)

Against `origin/main` b46b47d3 (v17.23); main is now v17.24 with the same app code (`tests/tests.js` lines have moved; tests are named by title). Plans only. **Reproduced / Measured** = I ran it in my container (headless Chromium, software GL, a fast desktop-class machine, so every time is a floor for a phone). **Read** = I read the line. **Guess** = not verified.

## 0. First, a correction to my own H8 that changes the plan

H8 said the freeze on opening a heavy project is "the first full-size render at the end of `applyScene`". **That was wrong about where the time goes.** I profiled the import (CDP CPU profile, 40 blur effects on one layer, 1080 x 1920):

| | |
|---|---|
| `FM.storage.importObject` total | 8.9 s |
| of which `makeThumb` (`js/storage.js:2133`), called by `touchCurrent` (`:2452`) | **8.85 s (99%)** |
| and inside it, the native `drawImage` that flushes the render | 88% of all samples |
| `applyScene`, the timeline rebuild, the inspector, the preview | about 0.2 s together |

`makeThumb` renders the whole scene onto a **full-size** project canvas (`src.width = P.width` at `:2140`, then `FM.renderScene(...)` at `:2148`) and only then halves it down to the 360 px card picture (the loop at `:2151`). **A second function does the same for template and element thumbnails** (`:2215-2219`, with `pickThumbTime`); give it the same fix. Canvas drawing is deferred, so the cost only shows when something reads the pixels, which is why a plain `FM.renderScene` call timed at 6 to 48 ms in my first attempt and the real cost was invisible. With a pixel read-back forced:

| scene, 1080 x 1920 | render at scale 1 | at 0.5 | at 0.25 |
|---|---|---|---|
| 10 blurs | 473 ms | 110 ms | 33 ms |
| 10 glows | **8218 ms** | 694 ms | 162 ms |

**It is not only an import problem.** `touchCurrent` runs on every autosave and re-captures the thumbnail "at most every 12 s when not playing" (`js/storage.js:2468`). So a project whose full-size render costs N seconds blocks the editor for N seconds **every 12 seconds of editing**. That fits the oldest open item, the unnumbered "Editing lags, and gets bad fast" (`REQUESTS.md:3536`). **Guess:** that this is Ezra's lag. I have not run his projects; it is the strongest measured lead I have seen.

### Fix 0 (do this first, it removes the freeze at every entry path at once)

Render the card thumbnail at card size, not full size, in `makeThumb`:
```js
const s = Math.min(360 / P.width, 360 / P.height, 1);
const tw = Math.max(2, Math.round(P.width * s)), th = Math.max(2, Math.round(P.height * s));
const c = document.createElement('canvas'); c.width = tw; c.height = th;
FM.renderScene(c.getContext('2d'), FM.scene, <the same _endInstantTime as today>);
return c.toDataURL('image/jpeg', 0.8);
```
and delete the halving loop. (An earlier version of this snippet also set `c.__fmRS = s; c.__fmOX = 0; c.__fmOY = 0;`. That does nothing: when `__fmCrop` is not set, `renderScene` overwrites those three from `canvas.width / P.width` (`js/compositor.js:18745-18748`), so the scale comes from the canvas size alone, which is the point.) **Measured proof of concept** (the same function written both ways in the page, same scene, thumbnail pixels compared):

| scene | old | new | pixel difference old vs new |
|---|---|---|---|
| no effect | 62 ms | 1 ms | mean 0.35 of 255 |
| 10 blurs | 505 ms | 10 ms | mean 0.37 |
| 10 glows | **8386 ms** | **108 ms** | mean **3.7** (glow's size follows the scale, so its halo differs a little) |

That table had **no photo, no video and no text**, and the halving loop exists for exactly those ("mushy cards", `js/storage.js:2130-2132`: a single big drawImage skipped most source pixels), so "visually the same" was not shown. **Measured now** (same page, v17.24, old = `makeThumb` as it is, new = render at card size; `import-caps-parity/`, side by side, left old, right new, at the size the card shows):

| scene | project | card | old (two runs) | new (two runs) | pixel difference (mean / max of 255) |
|---|---|---|---|---|---|
| a 4000x3000 photo-like image (synthetic: gradients, 4000 soft discs, 7-px stripes, small white text) | set by the first clip | 360x270 | 250 / 347 ms | 18 / 6 ms | 1.96 / 55 |
| a 1280x720 video frame (webm, VP8; the container has no H.264) | 1280x720 | 360x203 | 51 / 57 ms | 2 / 3 ms | 1.44 / 93 |
| small text, 26 px, 4 lines on 1080x1920 | 1080x1920 | 203x360 | 75 / 103 ms | 5 / 3 ms | 0.47 / 139 |
| 10 glows on a shape | 1080x1920 | 203x360 | 11 883 / 11 626 ms | 142 / 139 ms | **3.21 / 75** |

Reading the pictures: photo, video frame and text look the same at a glance. The text rows differ at glyph edges (max 139 on a few pixels, mean 0.47), which is the halving filter against direct sampling, not a different layout. **The glow is visibly different: the halo is wider and softer in the new picture** (a glow's size follows the render scale, so it is not the same halo). So "visually the same" holds for photo, video and text in these cases and **does not hold for glow**. The photo is synthetic and the video clip is 0.1 s of a MediaRecorder file; a real phone photo has not been tried. 15 to 82 times faster. **Show him before and after**, glow especially, because it is a visible change to a picture (his rule 16).
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

**The structural point, corrected (the first version said "put each cap in the sanitiser once ... every open", which is wrong):** the paths do **not** share one sanitiser. An ordinary open runs only `sanitizeMasks` / `sanitizeEffects` / `sanitizeUnsafeValues` (`js/storage.js:903`, `:1779`). `sanitizeImportedLayers` (`:1655`, exported as `_sanitizeLayers`) runs on import, templates and elements, collab, **and on every undo and redo** (`js/history.js:71`). So a cap placed in that shared sanitiser would also cut **existing saved projects on the first undo** (see the keyframe row below), while a cap placed in the open path would be paid on every open. **Put the caps at the import doors:** `applyScene`/`importObject`, the template/element insert, and the collab host's `validOp`/`validateTx`. A change at the collab door has to be identical on every device in a session, so it needs a `SCHEMA_REV` bump (`js/collab-core.js:44`; main is 7, Simple takes 8, F1-B in `plans/collab-privacy` needs one too: take the next free number at merge, and the fingerprint gate, `921 S1 the schema fingerprint gate`, will name the new value).

## 2. The caps, with the numbers and why

The app already chose some numbers; reuse them so there is one story. Basis for the new ones: the **measured** import times from H8 and the app's own generators. **I could not look at a real user project** (nothing in the repo is one), so "what a real project uses" below is the app's built-in content and its own limits, not his data.

| what | today | proposed | why this number |
|---|---|---|---|
| layers per project | 2000 (`:1979`) | **keep 2000** | already agreed with collab (`LIMITS.LAYERS`) and with the S8 500-layer performance test |
| effects per layer | 120 (`FX_MAX`, `:1371`) | **keep 120** | **lowering it would delete saved effects on open** (H8 suggested 48; I now think that is the wrong trade). With Fix 0 the 120-blur freeze (25 s) is gone, so the cap no longer has to protect the tab |
| children of a Filter | 24 (`FX_CHILD_MAX`) | keep | exists |
| keyframes per property | **none** (audio and masks: 200, `AFX_MAX_KF` `:1095`, `MASK_MAX_KF` `:1274`) | **5000, the first 5000 by time** | measured import plus timeline rebuild: 2000 keys 0.3 s, 10 000 keys 1.9 s, 40 000 keys 18 s (superlinear). 5000 is roughly 0.7 s (interpolated between my 2000 and 10 000 measurements: **Guess**). **"Well above what `audioReact.bake` writes" was a guess, and measuring says it is not:** `bake` keeps keys with a 2% RDP over an envelope sampled at the project fps (`js/audio-react.js:100`, `:372-378`) and nothing bounds the count. Measured here on synthetic tracks at 30 fps: speech-like bursts gave about **530 keyframes a minute (5288 for 10 minutes)**, a busy random-amplitude track about **1140 a minute (11 376 for 10 minutes)**. A real song is not either of these (Guess), but a 10-minute track can plausibly pass 5000, so a hard cap at 5000 could cut a saved audio-react bake. Re-measure on a real long track before choosing the number. **Place the cap at the door, not in `sanitizeImportedLayers`:** that sanitiser runs on every undo (`js/history.js:71`), and a cap there would cut an existing project's keyframes on its first undo, the same shape as queue 680 (`js/storage.js:1576-1580`: one undo dragged every past-zero clip to 0). Put it in `applyScene`/`importObject`, the template/element insert, and the collab host. Not a number from his projects |
| points in a path or shape | none (masks: 2000, `:1274`) | **20 000**, at the same doors (not in `sanitizeImportedLayers`: it runs on undo) | measured: 20 000 points 0.8 s, 80 000 9.9 s |
| text length | none | **200 000 characters** | the same number collab already allows for a text leaf (`STRING_LEAF`), so anything that can be shared live can be opened. (H8 suggested 20 000; that would make a shared project unopenable.) |
| fonts embedded in one file | none | **16 fonts and 40 MB** | measured: one real TTF is 885 KB, 200 of them took 8.5 s and 177 MB. 16 x 885 KB is 14 MB, so 40 MB leaves room for large CJK fonts |
| projects in one backup | none | **200** | measured about 175 ms each, linear. 200 is about 35 s, so it must **yield between projects** and call the existing `onProgress` (`js/storage.js:1947`; `:1941` is the `confirmLeave` refusal message) |
| file size to read | none | **warn above 50 MB** (do not refuse) | `importFile` reads the whole file as text (`:2022`); #1007 names it |

**Behaviour when a cap bites:** cut, never refuse, and say so once ("N keyframes on one control were too many to keep; the first 5000 are kept"). Refusing a whole project because one control is long loses more than it saves. The exceptions are shape errors (section 3) and the backup count (refuse, nothing created).

## 3. Shape checks (refuse bad shapes; never drop an unknown plain field)

**Before `FM.projects.create`** in `sceneFileProblem` (`js/storage.js:1974`), because the file's own comment (`:1983-1987`) says validate-then-create is the rule and `importObject` creates first (`:1993`):
1. `obj.project` must be a **plain object** (not a string, number or array): I **reproduced** `project: [1,2]` being accepted, and `project: "x"` throwing after a project was created.
2. `obj.layers` must be an array; **drop** entries that are not plain objects (do not refuse the file). Reproduced: `layers: [1, "a", true, [], null, {}]` throws from `sanitizeTiming` after the empty project exists.
3. `obj.media`, `obj.fonts`, `obj.omitted`: ignore if not the expected shape (H8 measured they already are).
4. **Unknown plain fields stay, and they already do: add no whitelist.** Layers have **no key whitelist**, and unknown layer fields already survive import, a reopen and an undo (**Measured** on v17.24: a layer with `futureField: {a:[1,2],b:{c:'x'}}`, a 3000-character string field and a `'function(){}'` string field imports with all three intact, adds one project, and all three survive an undo). `smKeepUnknown` on `980-p22-trayb2` is used **only for the `sm` sub-keys** (`js/storage.js:1576-1622` on that branch); applying its 200-character / 2 KB limits to layers would **drop fields that survive today**. If a rule is wanted, the existing model is `sanitizeProjectFields`' marker handling (`js/storage.js:1037-1049`: keep every plain field, at most 24 keys, refuse shapes the app would choke on).
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
- `caps K keyframes`: one property with 50 000 keyframes; after import at most 5000 remain, they are the earliest, the import takes under 1.5 s (v17.23: 9 s at 40 000, so more at 50 000), and a toast fired once.
- `caps P points`: 100 000 points; at most 20 000 remain; under 1.5 s (v17.23: more than 10 s).
- `caps T text`: 2 000 000 characters; 200 000 remain; layer still loads.
- `caps F fonts`: 40 valid fonts; 16 registered, the rest reported; total bytes under 40 MB.
- `caps B backup`: restore a backup with 300 projects; refused with the message; **no project created** (v17.23 starts creating them).
- `shape project`: `project: "x"`, `project: [1,2]`, `layers: [1,"a",true,[],null,{}]`: each gives a message or skips the bad entries, **adds no project when refused**, and leaves the open project untouched.
- `shape unknown field survives`: a layer with `futureField: { a: [1,2] }`, a 3000-character string and a function-like string **keeps all three** through import, a reopen and an undo. **This passes on v17.24, so it cannot fail first**; it is a regression guard for the rule in section 3 item 4, not a catching test, and must be labelled so. Control: a valid file imports and adds exactly one project. (The first version's test also expected a 3 KB value to be dropped: that dropped a plain field, which the app keeps today, so it was wrong.)
- `thumbnail` (Fix 0) as in section 0, **plus** a photo, a video-frame and a small-text case at the pixel-difference bars measured above, and the glow case named as a deliberate visible change.
- `schema`: the fingerprint gate moves with the bump (the existing `921 S1` tests mutate `SCHEMA_REV`; no new test, just the new number).
All of these run at 380 and 1280; none needs a layout.

## 6. Order

1. **Fix 0** (an hour, measurable, removes the freeze everywhere and probably the editing lag). Show him before and after.
2. **Shape checks** in `sceneFileProblem` (small; fixes #1001/#1051's trigger).
3. **Keyframe, path and text caps** at the import doors (not in `sanitizeImportedLayers`), with the `SCHEMA_REV` bump for the collab one.
4. **Fonts, then the backup count.**
5. Leave `FX_MAX` alone.

## What I did not do

Nothing was built or applied. I did not look at a real user project, so every "real use" number is the app's own. I did not test the template or element paths separately: they share the sanitisers by reading, not by a run. I did not reproduce the friend (host) path.
