# ChatGPT batch 3: verified against the current code

ChatGPT read snapshot 28104a3e (v17.21) and wrote 12 reports. HEAD is still 28104a3e. The working tree has uncommitted
edits in `js/compositor.js` and `js/inspector.js` only (the other session's polish batch). Every other file cited below
has no diff against HEAD, so its line numbers are exact. Lines in compositor.js and inspector.js were re-read on 1 Oct
and are current, but can drift as that session keeps working.

Nothing here was run on his iPhone. Browser runs were `tools/shot.py` (headless, 380px or 1280px) for ST-1, ST-2, ST-4,
ST-6, PFS-2, PFS-4, PFS-6, U2, U22 and TR-1. JXA (`osascript`) reproductions were used for DFC-1/2/3, ST-1/2/3/6/7 and the
Posterize/Dots/Grid arithmetic. Everything else is code reading.

Sources: `deleters-fail-closed.md`, `create-then-fill.md`, `stale-tab-writes.md`, `sanitiser-types.md`,
`per-frame-scans.md`, `failure-path-cleanup.md`, `dead-effect-controls.md`, `undo-steps.md`, `shortcuts-audit.md`,
`text-robustness.md`, `big-media.md`, `effect-upgrade-specs.md` (+ `effect-upgrade-specs-VETTED.md`), all in this folder.

## For Ezra, in plain words

- **One bad project file could stop the app opening Home.** It needs a hand-made or broken `.fmotion.json` with a layer
  that has no position data. Once that project autosaves, every launch would fail. Normal use never makes such a
  file, but the cost is the whole app, so it is the top item.
- **Three groups inside each other, each with its own fade, shadow or tint, come out wrong.** The inside is too bright
  and gets drawn twice. Every extra level doubles the work. This shows in the preview and in the export.
- **A font can vanish for good.** If you open a project file that carries its own fonts and import a font at the same
  moment, or your phone is full when you open it, the font file can be deleted on the next launch. Text then falls back
  to the plain font.
- **Picking several photos at once takes several Undo presses to take back.** Nothing is lost, it's just one press per
  photo.
- **Projects with non-English names download as `project.fmotion.json`.** Accents get dropped too ("Café" saves as
  "Caf"). The name inside the file is fine.
- Most of the rest is "only if the file is hand-edited" or "only if storage is full" territory. All of it is low.

---

## (1) Confirmed new issues, ranked

The builder should log these as hunt items with the tier shown, so they sort behind his own requests. Overlapping
verdicts are merged and their ids listed. None of these are in REQUESTS.md, `audits/*.json`, or batch 1/2 VERIFIED.md.

**Before building any of these, note:** ST-2, ST-4 and the `layers:[null]` trigger in CTF-1 all end in batch 1 **1.2**
(an import that throws leaves an empty project behind). DFC-2/3/4/5 all extend batch 1 **1.6** (fail-closed sweep).
Build 1.2's rollback and 1.6's strict reader first, then add these on top.

### 1. (hunt MEDIUM) A layer with no `transform` gets through import, breaks the timeline, and after a save makes every launch fail before Home
- **Ids:** ST-4 (ChatGPT flagged "transform is never rebuilt". The verifier found the crash and the boot failure.)
- **Where:**
  - `js/storage.js:1638-1650`: sanitizeImportedLayers never reshapes `transform`.
  - `js/scene.js:562`: `Object.keys(layer.transform)` throws, called from timeline buildLane.
  - `js/storage.js:1707-1708`: applyScene has already set the layers by then.
  - `js/app.js:6847`: `FM.storage.load().then(...)` has no catch, so `FM.home.init` does not run.
- **What he'd see:** the import fails while the broken layer is live. Every refresh throws. After any autosave, every
  reopen fails before Home. Measured in a headless browser up to `load()` rejecting. The real-reload boot step was
  inferred from the code, not observed.
- **Reach:** a hand-made or corrupt file. A second route, not run: a modified collab client sending
  `d ['L',id,'transform']` (collab-host.js:214 lets it through). `FM.makeLayer` always writes a transform, so normal use
  never produces this. Rare, but the cost is the whole app.
- **Fix:**
  - In `sanitizeUnsafeValues`, replace a non-plain-object `transform` with FM.makeLayer's default for that type. This
    one function covers load, import, history restore and the collab host.
  - Add a `.catch` on the boot `load()` that still runs `FM.home.init()`.
  - Batch 1 1.2's rollback cleans up the leftover project.
- **Test:**
  - Import a shape layer with no transform. Assert it resolves, the transform is an object, `refreshAll` doesn't throw,
    and save then `load()` resolves. Repeat with `transform:null`.
  - A 921 S1-style host test for `d L/a/transform`.
  - Prove with mutate.sh: remove the guard and both tests must fail with the scene.js:562 TypeError.

### 2. (hunt MEDIUM) Three or more nested styled groups draw the wrong picture, and the work doubles per level
- **Ids:** PFS-2. ChatGPT framed nested groups as a scan-cost problem. The verifier measured the wrong pixels.
- **Where:** `js/compositor.js:18402-18408`: innerOf picks the DEEPEST unit. `:18467` buildGroupUnit routes each member there.
- **What he'd see:**
  - With groups A>B>C, each at opacity 0.5, the leaf skips B's fade and B draws C a second time.
  - Measured centre red: 3 deep reads 80 (should be 32); 4 deep reads 95 (should be 16).
  - `_flat` builds: 4 at 3 deep, 8 at 4 deep, 128 at 8 deep, 512 at 10 deep.
  - It shows in the preview and the export. A middle group's blur or blend lands on only one of the two copies.
- **Reach:** three CONSECUTIVE groups that each count as a unit: opacity below 1, an effect, a blend, a mask, a fill, a
  shadow, a border or a grade. A plain group in between breaks the chain. Uncommon but possible (group-of-groups, #193).
  The two-level test at tests/tests.js:19706 can't catch it.
- **Fix:** route each member to the unit ONE level below u. Give each unit a `childOwner` map from its nearest unit
  ancestor, and use that in place of innerOf. Keep `map` (shallowest) as it is. It can share batch 1 §1.9's
  childrenOf index (PFS-1).
- **Test:**
  - 3- and 4-deep opacity-0.5 chains read 32 and 16 (±2) in both scene orders, and `_flat` builds === K.
  - A 3-deep chain with a middle-only blur or multiply, compared against a reference flattened by hand.
  - The 1- and 2-deep cases as controls. Prove by putting innerOf back.

### 3. (hunt LOW) Embedded-font import can lose a font permanently: it ignores a failed index write, and holds a stale index across awaits
- **Ids:** CTF-3 (ChatGPT's) and STW-3 (the verifier found the real window). Same function, one fix.
- **Where:**
  - `js/storage.js:3742-3759` applyEmbedded reads `idx` at :3744.
  - It then awaits dataURLToFile, registerFace and idbPut per font (:3750-3754).
  - It writes the whole array at :3758 and discards the result.
  - pruneOrphans (`:2958`, `:2987`) then deletes any `font:` blob that is not indexed.
- **What he'd see:** after a reload, text in that font falls back to sans-serif. Re-opening the file doesn't bring it
  back if the project was saved without it.
  - (a) Full storage: a toast does say "Storage full — autosave paused", but the font-specific loss is silent.
  - (b) Concurrent: a picker font import, or a second applyEmbedded (a file import or a collaborator's font), lands while
    this one awaits. The :3758 write then drops it from the index.
- **Reach:** rare (a full phone, or overlapping imports within about a second), but the loss is permanent.
- **Fix:**
  - Collect the new records locally. After the loop, re-read `this.list()`, append the families not already present,
    and write once, synchronously.
  - If that write returns false, delete the blobs this call wrote, drop them from `_fontReg`, and toast the interactive
    import's "Storage is full — the fonts in this file could not be saved".
  - Optional: re-read the font, template and element id sets inside pruneOrphans' delete pass (next to keep2).
- **Test:**
  - Slow registerFace, start applyEmbedded unawaited, await FM.fonts.import, then await the first call. Both families
    are listed, and after pruneOrphans the imported font's blob still exists.
  - Patch setItem to throw only for the font index. The failure toast fires and no orphan `font:` key remains.

### 4. (hunt LOW) Picking or dropping several media files makes one undo step per file
- **Ids:** U2 (+ U25a). Verifier-found; ChatGPT's report said no action makes several steps.
- **Where:** `js/app.js:5489` handleFiles loops per file with no mute. Each file goes through FM.addMediaLayer, which
  commits at `:3106`. The picker is `index.html:659 multiple`, and drop comes in at app.js:8740.
- **What he'd see:** three photos picked together need three Undo presses. Measured: history 1 → 4 steps.
- **Reach:** the commonest one in this batch. Multi-selecting in the iOS picker is normal. Nothing is lost.
- **Fix:** mute around the adds with a finally, and commit once if anything landed. Mute only around the synchronous
  addMediaLayer calls, so his edits during a slow decode don't fold into the import step. Alternatively, give
  addMediaLayer a `{noCommit}` option.
- **Test:** `FM._handleFiles([3 PNGs])` grows the history by exactly 1, one undo removes all three, and redo brings
  them back. Control: a single file is still +1. Prove by deleting the mute.

### 5. (hunt LOW) Project and template download filenames drop every non-ASCII character
- **Ids:** TR-2.
- **Where:** `js/storage.js:1795` and `:3127` use `.replace(/[^\w\- ]+/g, ' ')`. The download names are set at
  `:1798` and `:3130`.
- **What he'd see:** "Привет", "東京の夜" and "مشروع" all save as `project.fmotion.json` and collide as `project (1)…`.
  "Café Noir" saves as "Caf Noir" and "🎬 Reel" as "Reel". The name inside the JSON is intact.
- **Reach:** every export of a non-Latin-named project. Accented letters are lost for Latin-script names.
- **Fix:** one shared helper that strips only filesystem-illegal characters (`\/:*?"<>|`, control chars) and leading
  and trailing dots, caps at about 80 code points without splitting a surrogate pair, and keeps the `project`/`template`
  fallbacks.
- **Test:**
  - `FM.storage._safeFileName` keeps Cyrillic, CJK, Arabic, accents and emoji; maps `a/b:c*?` to `a b c`; gives the
    fallback for `...`; and leaves no lone surrogate at 300 chars.
  - Capture `a.download` from a real export.

### 6. (hunt LOW) Saving a preset on a full phone says "saved" when nothing was saved
- **Ids:** CTF-10a. Verifier-found; ChatGPT's report said preset creation had no gap.
- **Where:**
  - Effect presets: `js/inspector.js:372` `FM.fxPresets._write` swallows the quota error, and save() at `:373` returns
    nothing. Both callers then toast "Saved preset" (inspector.js around `:2350` and `:6380`).
  - Layer presets: `_write` does toast "Storage full — preset not saved", but `js/app.js:5349` overwrites that toast
    straight away with "Preset saved — …".
- **What he'd see:** a look he thinks he saved is missing later. Existing work is never lost.
- **Reach:** needs localStorage to be full. Projects live there, so a heavy phone user can get there.
- **Fix:** both `_write`s return true/false, save() returns that, and callers toast success only on true. fxPresets
  gets the same "Storage full" toast. In rename, write first and move the tags after.
- **Test:** make setItem throw for `fm.fxpresets` and `fm.layerpresets`. The toast must read "Storage full — preset not
  saved" and the list must be unchanged. Control: unpatched, the list grows by 1.

### 7. (hunt LOW) An AI Director build, re-roll or refine that deletes a layer takes 2+ undo presses
- **Ids:** U22 (+ U25c). ChatGPT's report said each of these commits once. The verifier reproduced the split.
- **Where:**
  - `js/ai.js` never calls `history.mute`. Its applyOps calls are at `:211`, `:228`, `:265`, `:337` and `:386`.
  - The deleteLayer op (`js/ai-ops.js:446-451`) calls FM.deleteLayer, which commits at `js/app.js:3789`.
  - The comment at ai-ops.js:443-445 says this is only safe inside the caller's mute.
- **What he'd see:** after Refine "remove X", one undo leaves a half-undone scene. Measured: [C white, A red] with B
  still gone. A second undo restores it.
- **Reach:** needs a BYOK key and the model choosing deleteLayer. Plausible on a refine. The built-in mock never
  emits it.
- **Fix:** have `FM.aiOps.applyOps` (ai-ops.js:127) mute and unmute around its own loop with a finally, so no caller
  can forget. The depth counter nests safely under ai-chat's mute. Also make ai.js:291's cancel path commit regardless
  of the layer count (an identical snapshot is a no-op).
- **Test:** stub the refine mock to return [setProp A, deleteLayer B, setProp C]. One undo must restore the exact
  pre-refine list. Control: the same ops through ai-chat applyTurn. Prove by removing the mute.

### 8. (hunt LOW) Effects sheet: picking Mask first, then another effect, makes 2 undo steps
- **Ids:** U9 (+ U25b). Verifier-found.
- **Where:** `js/fx-browser.js:575`: `addMaskFromBrowser(quiet)` commits even when quiet. commitPicks (`:509-536`)
  then commits again at `:536`. addEffect's quiet path returns before its commit.
- **What he'd see:** one Add, then the first undo removes only the second effect.
- **Reach:** rare. It needs sheet multi-pick with Mask not picked last.
- **Fix:** preferred: wrap commitPicks' add loop in mute/unmute with a finally (the clipSplit pattern). Alternatively,
  guard the :575 commit with `!quiet`.
- **Test:** pick _mask then Gaussian Blur, then Add. The history grows by exactly 1 and one undo removes both. Control:
  Blur then Mask is +1 (it passes today).

### 9. (hunt LOW) A long unbroken text run wraps in quadratic time and freezes the page
- **Ids:** TR-1.
- **Where:** `js/compositor.js:19042` FM.textLines. The chop loop runs about `:19077-19086`. It measures the whole
  remainder once per line, then walks forward one character at a time. Import never caps text length (storage.js:1638-1650).
- **What he'd see:** measured on desktop: 30k chars 2.3 s, 60k chars 9.4 s. It's paid on first render and again after
  each edit (there's a 2-slot cache). It would be slower on a phone.
- **Reach:** tens of thousands of characters with no spaces: a crafted file or a pathological paste. Normal CJK text
  is fine.
- **Fix:** binary-search the longest fitting prefix for each line, giving the same cut points. Optionally clamp
  imported text to about 20k chars.
- **Test:**
  - Deep-equal the lines before and after across ASCII, CJK, mixed and over-long-word inputs at several widths.
  - A cost test on `'x'.repeat(30000)` that counts measured characters (not time): it must be under 40×n.

### 10. (hunt LOW) The boot sweep and project delete still fail open on unreadable template, element or font indexes and on failed checkpoint reads
- **Ids:** DFC-3, DFC-2, DFC-5(b), DFC-4(b). This extends batch 1 **1.6**, which only covered `fm.proj.*` docs.
- **Where:**
  - `js/storage.js:3069`, `:3412` and `:3674`: the list() calls return `readJSON(INDEX, [])`, so a malformed string reads as [].
  - `:2958-2960` and `:2985-2987`: every pack becomes a delete candidate, and keep2 (`:2995`) doesn't cover them.
  - `:175` idbGet resolves null on error, so `:2982` ckptKeep misses that checkpoint.
  - `:2875-2887`: projects.remove builds `elsewhere` from the same readers.
  - `:3135`, `:3589` and `:3724`: a remove, save or duplicate after a bad read writes `[]` over the corrupt bytes.
- **What he'd see:** every saved template, element or imported font gone at once (DFC-3). Or blank clips after an
  "Earlier versions" restore (DFC-2).
- **Reach:** close to nil. It needs hand-corrupted localStorage, or a single failed IDB get alongside successful
  deletes. Low, but the loss is total when it happens.
- **Fix:** one strict reader that tells "unreadable" apart from "absent". The sweep, and the per-layer deletes in
  projects.remove, skip deleting when any index, doc or checkpoint is unreadable. Index writers refuse (or first copy
  the value to `<INDEX>.unreadable`) when the current value is unreadable. Build it together with 1.6.
- **Test:**
  - `fm.templates='[{"id":"tA"'`: tpl:tA survives pruneOrphans. Repeat for elem: and font:. Control: a valid `[]`
    collects it.
  - A patched IDB get erroring on a checkpoint: the blob survives.
  - Project B truncated: `remove('A')` keeps the shared blob L.

### 11. (hunt LOW) Recent colours: each window overwrites the other's picks
- **Ids:** STW-6 (ChatGPT listed recent colours among the whole-list writers; the verifier showed it needs no timing coincidence).
- **Where:** `js/inspector.js:6977` hydrates `FM.recentColors` once at init. addRecentColor (`:247-251`) writes `[c]` +
  the in-memory list and never re-reads.
- **What he'd see:** with the PWA and a browser tab both open, colours picked in one disappear from the swatch row
  after a pick in the other. It happens every time, not by chance.
- **Fix:** re-read `fm.recentColors` inside addRecentColor before merging, and optionally refresh when the popover opens.
- **Test:** set `fm.recentColors` to `['#112233']` directly, then pick #445566. The stored list must be
  `['#445566','#112233']`.

### 12. (hunt LOW) A project that is a plain value (`"project":"x"`) passes the import gate and throws
- **Ids:** ST-2. A new trigger for batch 1 1.2's empty-project leftover.
- **Where:** `js/storage.js:1978` sceneFileProblem and `:1695` applyScene test only `!obj.project`.
  clampProjectDims `:1009` assigns to a primitive under 'use strict'.
- **What he'd see:** the toast "Could not read that project file", plus a stray empty project. Measured.
- **Reach:** hand-made files only. Collab can't reach it (collab-host.js:209).
- **Fix:** refuse non-plain-object `project` with the existing "missing its canvas settings" reason, and have
  clampProjectDims return early on a non-object. Also refuse non-object entries in `layers` (the `layers:[null]` trigger
  for CTF-1).
- **Test:** importObject with project `'x'`, `5`, `true`, `[]` returns false, shows the toast, and leaves the project
  count unchanged.

### 13. (hunt LOW) Two more "false is truthy" reads in the import sanitiser: camera focus/fog `enabled` and note `remind`
- **Ids:** ST-6 and ST-10.
- **Where:**
  - `js/storage.js:1343` `enabled: !!f.enabled` and `:1348` `enabled: !!g.enabled`.
  - `:1065-1070` keeps note objects whole. notepad.js reads `remind` by truthiness (`:40`, `:90-96`, `:233`, `:250`).
- **What he'd see:** a file with `"false"` switches on depth of field or fog, or lights the reminder dot and blocks
  the export with the reminder card. This is the same class as `sizePicked` (queue 690), which was fixed one line away
  (:1063).
- **Reach:** hand-made files (and a collab peer for notes). The app always writes booleans, so saved files are unchanged
  by the fix.
- **Fix:** `enabled: f.enabled === true` (and the same for fog). Rebuild each note as {text string capped, remind only
  if boolean}.
- **Test:** `_sanitizeLayers([{type:'camera',focus:{enabled:'false'},fog:{enabled:'false'}}])` gives false/false, and a
  note with `remind:'false'` is not truthy. Controls: `true` stays true. Mutation: put `!!` back.

### 14. (hunt LOW) Numeric text such as `"0.5"` is kept in effect params but reset to the default in audioFx, behaviours, trimPath, stroke.dash and repeater
- **Ids:** ST-8.
- **Where:** `js/storage.js:1401-1403` keeps it (effect params). `:1176-1182` sanitizeAudioFx, `:1191-1195` numOrKf
  (used by `:1199-1221`) and `:1259-1263` sanitizeBehaviors all fall back to the default.
- **What he'd see:** a hand-edited or third-party file loses those values silently, for example a mix of "0.5" becomes
  the default and trim end "0.5" becomes 1. There's no crash.
- **Fix:** one `finiteNum(v)` helper used in all four places.
- **Test:** `trimPath.end:'0.5'` and audioFx `mix:'0.5'` both survive as 0.5. Mutation: revert numOrKf.

### 15. (hunt LOW) The ? shortcut sheet: the 1-5 row has no "nothing selected" condition, the 1-9 card keys are missing, and Ctrl+Y and Backspace are not listed
- **Ids:** F3 and F2.
- **Where:**
  - `js/app.js:8959-8969`: digits open inspector cards when a layer is selected.
  - `js/shortcuts.js:16-21` addMenuRow builds the 1-5 row with no condition.
  - `js/app.js:8859` Ctrl+Y and `:9020` Backspace work, but the rows at `js/shortcuts.js:44` and `:49` don't mention them.
- **What he'd see:** with a layer selected, 1 opens a panel card, not the Add menu the sheet promises. It's harmless.
  On PC the cards show their number badge.
- **Fix:** text only in shortcuts.js (bump its `?v=`):
  - "1 – 5 (nothing selected)".
  - A new row "1 – 9 (layer selected) → that panel card".
  - "Delete / Backspace".
  - "⌘/Ctrl+⇧+Z or ⌘/Ctrl+Y".
- **Test:** the sheet rows name the condition, Backspace and Y. A paired behaviour check: Digit1 with a layer selected
  opens a card, not the Add menu.

### 16. (hunt LOW) Pixelate's Block aspect and Edges do nothing on an adjustment layer
- **Ids:** found while vetting the effect-upgrade specs (`effect-upgrade-specs-VETTED.md`). Not a ChatGPT claim.
- **Where:** the adjustment-layer path reads only `size` (`js/compositor.js` around `:18140-18157`, a working-tree line,
  so re-read it). Pixelate isn't in `PIXEL_ADJ` either, contrary to `effects-pack-VETTED`.
- **What he'd see:** two sliders that move and change nothing when Pixelate is on an adjustment layer.
- **Fix / test:** route those params through the adjustment path. Render min vs max on an adjustment layer: the pixels
  must differ, and the clip path must be unchanged.

### 17. (hunt LOW, needs his OK: it changes how existing projects look) Mosaic's Average mode gives cutout edges a dark fringe
- **Ids:** found while vetting the specs. Not a ChatGPT claim.
- **Where:** `js/compositor.js` around `:6692` (working-tree line, re-read it): it averages colour without weighting by
  alpha.
- **Fix / test:** use an alpha-weighted average. Use a white cutout on transparent and assert the edge tiles stay
  white. It needs its own before/after picture for him, because saved projects will render differently.

### 18. (hunt LOW, device run first) Stills are decoded and kept at full source resolution, with no preview proxy
- **Ids:** BM-1. ChatGPT rated it High; it's low until a device shows pressure.
- **Where:** `js/media.js:801-807` loadImageFile keeps the native size. `js/storage.js:457-472` hydrates every layer.
  Video has a budget (frames.js:113-160); stills have none.
- **What he'd see:** possibly memory pressure or reloads on a 20+ photo slideshow on his iPhone. A 12 MP photo is about
  48 MB decoded. NOT measured.
- **Fix:** only after a device run: a downscaled preview bitmap capped by the project size × headroom (or the max
  keyframed scale), rebuilt at full resolution for export.
- **Test:** a 6000×4000 PNG in a 1080×1920 project gives a preview source at or below the cap, and a 2× zoom export
  matches a full-resolution render. Device half: 5/20/50 photos, then reopen, scrub and export.

---

## (2) Already known

| Id | What | Known as |
|---|---|---|
| DFC-1 | Corrupt project doc lets the boot sweep delete its media | Batch 1 VERIFIED 1.6 (hunt LOW). Item 10 above extends it |
| CTF-1 | Import that throws leaves an empty project | Batch 1 1.2. Easier to trigger than batch 1 thought: `layers:[null]` or `project:'x'` is enough (see items 1 and 12) |
| CTF-6 | Media layer committed before its file lands | Queue 690 (pending-file note, warned at the next load). A same-session toast would belong under #690 |
| CTF-9 | Duplicate says done after an IDB read error | Batch 1 1.4, still open (`js/storage.js:2667`) |
| CTF-X | New project on a full phone | #941, done |
| STW-10 | idbDel has no cross-tab lease | Batch 1 1.1 (stale tab's save frees media). Still unfixed |
| ST-1 | Non-object fillGradient crashes the sanitiser | Batch 1 1.3 + 1.2 (`js/storage.js:1537`). Browser-confirmed again |
| ST-13 | Collab op values only JSON-checked; a sanitiser throw half-applies | Batch 1 1.3 (atomic applyAndFix) |
| PFS-1 | collectGroupUnits rescans every layer per group node | Batch 1 §1.9, queued in INBOX.md:39. Build it with item 2 |
| PFS-4 | Fill Behind group flattened twice per frame | Intended (comment at `js/compositor.js:18413-18416`), measured 2 vs 1 |
| U26 | Undo capped at 120 snapshots / 48M chars | Deliberate (REQUESTS.md:3609-3613, history.js:298-306) |
| F1 | Tab always cycles layers, even with a button focused | Batch 2 row 5 (A1, hunt LOW). ChatGPT's "High" is wrong |
| BM-2 | One preload=auto video per layer | Batch 2 IP-1 / test-gaps #5 (device-only) |
| BM-3 | No HEIC fallback | Batch 2 test-gaps #2 and rank 2 (named error). iOS hands over JPEG anyway |
| BM-4 | Waveforms bounded | Queue 834 (WAVE_MAX_BYTES) |

---

## (3) Wrong, or fixed since

**Fixed since v17.21:** none. HEAD is unchanged, and none of the cited storage, app, history, timeline, collab or media
files have edits.

**Wrong as defects:**
- **DFC-6:** discarding a draft that leaves orphans is the intended outcome. The pack stays the durable copy.
- **DFC-7:** `FM.storage.clear()` has no caller. Its UI was removed in queue 177.
- **DFC-8:** idbDel's marker order is deliberate (queue 690). Reversing it brings back blank-clip-after-undo.
- **DFC-9:** guarded behaviour. A corrupt medialib index loses nothing reachable.
- **DFC-10:** removeItem can't hit quota, and if access is blocked nothing was written in the first place.
- **DFC-11:** fmwipe is gated to loopback hosts plus `fmtest=collab`, so it can't fire on Pages or the PWA.
- **DFC-12:** informational.
- **CTF-4 and CTF-5:** staged and compensated (#915 clause 2). A kill leaves orphans that the sweep collects.
- **CTF-10:** "no gap in presets" was wrong. The real gap is item 6.
- **STW-1, STW-2, STW-4, STW-5:** every index is re-read synchronously with no await before writing, so only
  same-millisecond writes from two processes could collide. #939 already closed the rename case.
- **STW-7:** checkpoint writers hold the host Web Lock.
- **STW-8:** the part GC respects a 7-day TTL and aborts cleanly with 'gap'.
- **STW-9:** canvas presets were removed in v11.25. ChatGPT read a leftover comment as code.
- **ST-5:** the File constructor stringifies any name. No HTML sink.
- **FPC-1, FPC-2:** codec errors close the encoder or decoder themselves. The loops are synchronous, and the configs
  are constants.
- **FPC-4:** the shared MessageChannel drains completely. Nothing builds up.
- **DEC-2:** 885 vs 813 compares two different counting methods. The new controls came from reviewed batches.
- **DEC-4:** Backdrop Clone has nothing to tune by design. Its real defect is #907.
- **U1, U3-U8, U10-U12:** correct descriptions of correct behaviour, not defects.

**Held, but not a defect (no action):** CTF-7, CTF-8, ST-3, ST-7, ST-9, ST-11, ST-12, PFS-3, PFS-5, PFS-6, PFS-N1,
U13-U21, U23, U24.

**Unverifiable:**
- **CTF-2:** template create-then-adopt has no trigger that can throw.
- **FPC-3 and FPC-5:** OfflineAudioContext retention needs a heap probe. The `finally` dispose is harmless but frees
  nothing provable.
- **DEC-1 and DEC-3:** ChatGPT rendered nothing. Only a render sweep settles it.
- **TR-3:** the RTL run order was not rendered.

**Optional tidy-ups (not hunt items, fold into nearby work if convenient):**
- Delete the dead `storage.clear()` (storage.js:922-935).
- Delete the stale canvas-preset comments (storage.js:3762-3774, home.js:2856-2860).
- Use `hasOwn(C.OP_GRAMMAR, op.o)` in validOp (ST-12).
- Write before moving tags in preset rename (STW-4).
- Cache a failed AAC priming probe for the session (FPC-2).
- Memoise groupPivot per render (PFS-6).
- Raise `_mediaBusy` in the template and element save paths (CTF-5 side note).
- Note that duplicateSelection's global mute spans awaits (U19 side note).

---

## (4) The effect-upgrade specs

See **`effect-upgrade-specs-VETTED.md`** in this folder. None of the six can be built exactly as ChatGPT wrote them.
Each was corrected:

| Spec | Correction |
|---|---|
| Pixelate Keep outline | Make the colour fully opaque on the small canvas before cutting it to the original shape |
| Mosaic Tile bevel | Light defaults to 135 (top-left), not 45; relief and light greyed out while bevel is 0 |
| Dots | Uses the existing `stagger` and `aspect` keys; the cell is stretched together with the dot |
| Grid | Bold lines default to Off and 2×, with a 1px phone floor |
| Contour Lines | Same as Grid, plus a faster thickening method and a 4× cap |
| Posterize | Offset limited to ±45%; `off===0` added to the fast-path condition; a Luma-only speck rule |

Also:
- The C33 Grid anti-aliasing fix in the backlog changes Grid's default look.
- Every new control means a collab SCHEMA_REV bump to 7 and a re-pinned fingerprint.
- Before/after pictures at phone size are required before anything ships (his standing design rule).

None of this is logged in REQUESTS.md yet.

---

## (5) Hit rate

**99 verdicts in total.**

| Verdict | Count |
|---|---|
| Confirmed new | 45 |
| Already known | 15 |
| Wrong | 33 |
| Unverifiable | 6 |

Most of the confirmed-new and wrong verdicts are "correct behaviour, described correctly". The useful numbers are
ChatGPT's actual defect claims (about 55):
- 26 held (18 new, 8 known): **about 47%**.
- 18 were new real defects: **about 33%**.
- They merge into 18 issue blocks above. Four of those (items 4, 6, 7, 8) came from the verifiers alone. Two more came
  from vetting the specs (items 16, 17).
- In items 1, 2, 3 and 11 the verifier found the actual harm behind a vaguer ChatGPT claim.

| Report | Defect claims held | Notes |
|---|---|---|
| sanitiser-types | 7 / 13 (5 new, 2 known) | Best report. Under-rated ST-4, which is the batch's top item |
| shortcuts-audit | 3 / 3 (2 new, 1 known) | F1 rated High; it's batch 2's LOW |
| text-robustness | 2 / 2 (+1 self-disclaimed) | Both real; TR-2 has the widest reach of any ChatGPT find |
| big-media | 3 / 3 (1 new, 2 known) | BM-1 rated High; it's low until a device run |
| deleters-fail-closed | 5 / 10 (4 new, 1 known) | All near-zero preconditions. Disproved batch 1's "one deleter fails open" |
| create-then-fill | 2 / 3 (1 new, 1 known) | Its "presets are safe" and "duplicate is defensive" were wrong |
| per-frame-scans | 2 / 6 (1 new, 1 known) | Framed as cost; the real bug (wrong pixels) was the verifier's |
| stale-tab-writes | 2 / 9 | Worst. Generic last-writer-wins with no check for an await; read a deleted feature's comment as code |
| failure-path-cleanup | 0 / 5 | Missed that WebCodecs errors close the codec themselves |
| dead-effect-controls | 0 / 1 | Rendered nothing; the recount compared two different metrics |
| undo-steps | 0 claimed; 3 missed | 23 accurate per-action rows, but "nothing makes several steps" was wrong three times |
| effect-upgrade-specs | 0 / 6 buildable as written | All six ideas usable after correction |

**Patterns, the same as batches 1-2:**
- Citations are reliable (within 1-2 lines).
- Severity is unreliable both ways. Two Highs became low, and the two real mediums were framed as low-level or
  performance issues.
- Reach is weak. It doesn't check whether there is an await between read and write, whether a function has a caller,
  or whether a feature still exists.
- It never runs code. The batch's most important findings came from the verifiers running the path.

---

## (6) Batch 4 suggestions

All read-only and report-only, in areas batches 1-3 have not covered:

1. **Keyframe and easing maths:** `js/scene.js` interpolation, `js/eases.js` and `js/graph-editor.js` with duplicate-time keys, zero-length segments, bezier handles outside [0,1], and NaN/Infinity reaching a drawn transform. Report each path from input to pixel.
2. **Frame rounding, preview vs export:** `FM.clipAt`, `js/frames.js` and the exporter's frame loop at 23.976/29.97/60 fps. Look for an off-by-one first or last frame at clip edges, at split points and after a speed change. Give the exact time values that differ.
3. **Re-entry while a job awaits:** every `jobWrapped` / busy flag in app.js, exporter.js, audio-tools.js and ai.js. Cover a double tap and a project switch mid-await, and say which project each late write lands in.
4. **Old build and new data:** what `js/storage.js` load and the sanitisers do with fields, effect ids and audio-fx/sfx ids from a NEWER build, and from the oldest saved revs. List what is dropped on read-modify-write (the STW-5 wrinkle).
5. **Text editor input edges:** `js/text-edit.js` IME composition events, emoji and surrogate pairs at the cursor, selection and backspace, multi-line or rich paste, and the undo button during composition.
6. **Geometry degeneracies:** `js/motion-path.js`, `js/masks.js`, `js/point-edit.js` and `js/tracker.js` with zero-length paths, coincident points, normalising a zero vector, and a one-point mask. Look for NaN that reaches render or save.
