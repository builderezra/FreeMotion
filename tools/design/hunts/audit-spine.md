# AU22: audit of the Simple editor's engine (`js/spine.js`, `js/spine-words.js`, the `sm` additions in `storage.js` and `scene.js`)

Against `origin/main` 1fa76385 (v17.34). **Measured** = I ran it here (headless Chromium on Linux, 1280 and 380), **Read** = read the code against `tools/design/plans/simple-mode/DESIGN.md`, **Guess** = not checked. Not touched: `editor-mode.js`, `simple-timeline.js` (not on main). Probe scripts: `audit-spine-scripts/`.

**Scope note.** What is on main is the READ side only (the classifier, the one `sm` writer `S.setFlag`, `S.onCopy`, the words) plus the sanitiser. Nothing writes `sm` yet, so several of the risks the brief names (undo crossing modes, a Simple save Full cannot open, collab) are about code that does not exist on main; I report what I could test and say which ones wait for step 1.3.

## Three findings, each red on main v17.34, green with the fix at 1280 and 380, mutation-caught

**AU22-1 (Measured, spec deviation): after adoption a main clip that is see-through for its whole length leaves the main track.** DESIGN §5.2 says a stored `sm.main` on an opacity-0 unit "is honoured (not a 'mainNoPicture' anomaly)" after adoption. The code gave every `kind === 'audio'` unit the `mainNoPicture` refusal, and the opacity rule produces `kind 'audio'` for a video with sound, so a clip with `opacity 0` (or faded out for its whole stretch) disappeared from `R.main`, its neighbours then reported a **gap** anomaly across the hole, and it showed as a sound. Measured: three adjacent main clips, the middle one at opacity 0: `R.main` was `[1, 3]` with anomalies `mainNoPicture, gap`. Fix: the opacity rule records the unit (`faded`), and the adopted branch refuses only a layer whose media is audio-only. Control kept: an audio-only layer carrying `sm.main` is still refused and named.

**AU22-2 (Measured): `FM.spine.classify` throws on a layer with no `transform`.** `FM.layerOpacity` and `FM.animatedProps` both read `layer.transform` without a guard (`Cannot read properties of undefined (reading 'opacity')`, `Cannot convert undefined or null to object`), and the Simple timeline rebuilds from this read, so one such layer takes the whole Simple editor down. Such layers exist today: a project file without a layer transform imports as it is (#1040, whose fix `ba154a37` is waiting to land), and a half-made layer from the collab or AI paths would do the same (Guess: I did not make one that way). Fix: the read treats a layer it cannot read opacity or animated props from as opaque and not animated (two small guards in `spine.js`). Full still has the #1040 problem; this only stops Simple from being the thing that crashes.

**AU22-3 (Measured): splitting a Stay-put item that ends with the video, in Full, leaves two items claiming the end of the track.** §4.5 and §12.2 say split heads do not carry `sm.tail` (the head keeps `stay`; the tail half keeps both). `FM.splitLayer` never looks at `sm`, so both halves keep `{stay, tail, tailEnd}`. Fix: `FM.spine.onSplit(head, tail)` (new, 7 lines in `spine.js`) called once from `FM.splitLayer` right after the lineage stamp. Busters: `spine.js` 1 to 3 (2 for the first two fixes, 3 for this), `app.js` 469 to 470.

## Neighbours (Measured, 1280 and 380, identical to main)
`simple P1` 11/11 and `split` 29/29 (main 28/28: the extra is AU22-3) at both widths.

## Probed and held (Measured unless said)
- **Empty, null and junk scenes:** `classify(null)` and an empty project never threw; `{}` and `{id:'x'}`-style layers threw before AU22-2 and do not now; every garbage field I tried (NaN start, string duration, `effects: null`, `masks: [null]`, a layer that is its own parent, `sm: 'x'`, fps 0, negative, NaN or 1e9) classifies.
- **Pure and deterministic:** `classify` does not change the scene (a JSON compare before and after) and two reads agree.
- **Long and phone-sized projects:** 100 layers 7 ms, 300 8 ms, 1000 48 ms, 3000 180 ms; worst shapes at 1500 layers (all clips on one range, 1500 tiled, overlapping chain, half hidden) 52 to 95 ms. Fine for a rebuild-time call.
- **`S.setFlag` against the sanitiser:** all 8,640 combinations (5 layer shapes x three flag writes from 6 flags, each on or off) leave a layer the sanitiser does not change (`p3.js`), so a write is never undone by the next load.
- **Copy routes:** Duplicate strips `sm.main`, `tail` and `pick` (Measured); Extract Audio goes through `duplicateLayer` and so strips too (Read); Paste and AI clone call `onCopy` (Read; I could not drive paste headless). Split keeps everything, as the spec says, apart from AU22-3.

## Not testable on main yet (waits for the builder's step 1.3)
- **Undo crossing modes, a Simple save Full cannot open, and collab behaviour** need a writer. What is checkable today holds: `sm` is in layers and so in undo snapshots and in the collab diff, `SM_V` is hashed into the schema fingerprint, and the sanitiser keeps unknown plain sub-keys.
- **Pack and element insert routes** (`onCopy(..., 'pack')`, `'insert'`) are in DESIGN §12.2 but not in `STRIP_ROUTES` and not called from `storage.js` (`insertInto`, `elements.insert`). Today nothing is adopted so nothing is wrong; once a project can be adopted, inserting a Simple-made template into it in Full would bring a second `sm.main` along. Put it on step 1.3's list.
- **The newer-file guard** (`project.sm.v` above `SM_V`) is not implemented on the load path yet (the sanitiser only clamps it).
