# AU20: the rest of fx-thumbs, and the inspector's Presets card (tags and rename)

Branch `hunt/audit-fx-3`, against main v17.33. Labels: **Measured** = ran it, **Read** = read the code, **Guess** = not verified. Probes are in `audit-fx-3-scripts/`, raw runs in `audit-fx-3-scripts/results/`. Headless Chromium, Linux.

## Three real bugs in the Presets card, all in the tag and rename layer. All fixed, each with a test red on main and green with the fix at 1280 and 380, each mutation-caught.

### 1. A tag filter nothing carries any more empties the card, and nothing on screen can turn it off (Measured, `ptags.js`)
- **Repro.** Save two layer presets, tag one `warm`, tap the `warm` chip (the card shows one preset), then clear that preset's tag (Hold, Tags…, empty answer) or delete it. The card shows **no presets and no chips** (`rows: [], chips: []`). `presetTag` is module state in js/inspector.js, the chip row is built from the tags in use, and the row (with its "All" chip) is not built at all when no tag is in use. The filter stays on across layers and projects until the page is reloaded; the search box is still there but does not touch it.
- **Fix.** In the card builder, a `presetTag` that no preset carries any more is dropped (`js/inspector.js`, 6 lines with a comment).
- **Test** `AU20 clearing the last tag while its chip is the filter does not leave the Presets card empty`: both routes (clearing the tag, deleting the tagged preset). **Mutation** (fix line deleted) CAUGHT.

### 2. Renaming a layer preset takes the "Update" button away from every layer made from it (Measured, `ptags.js`)
- `layer.fromPreset` is a name; the card shows "Update “name”" only while a preset of that name exists. After `layerPresets.rename('PB', 'PB2')` the layer still says `PB` and the button is gone (`updateBtn: false`). The round trip queue 407 built (apply, edit, press Update) breaks silently on a rename.
- **Fix.** `rename` renames `fromPreset` on the open scene's layers that carry the old name. Layers in other saved projects keep the old name until they are opened: nothing reads it in a way that breaks, they just lose the button, as before. Not fixed for those (**Guess**: a stored alias would be the way, and it is more than this item).
- **Test** `AU20 renaming a layer preset keeps the Update button of layers that were applied from it`. **Mutations** (line deleted; line writing the old name back) both CAUGHT.

### 3. A long unbroken preset name runs under the ✕ and widens the whole panel (Measured at 380, `plen.js`, `plong.js`)
- At 380 px, names of 30 characters without a space (`Cinematic_Teal_Orange_Final_v2`) already run under the ✕ (name ends at 332, the ✕ starts at 313); 38 characters (`…_FIX_new`) and a pasted URL leave the row and make the inspector scroll sideways (scrollWidth 409 against 365; a 120-character name 2,911). Names with spaces wrap and are fine, and so is a long Japanese name. The tag chips scroll by design and are fine.
- **Fix.** One CSS rule: `.insp-preset-row .fxp-name` gets `min-width: 0; max-width: 100%; display: block; white-space: normal; overflow-wrap: anywhere` (`styles.css`). Nothing else uses that selector.
- **Test** `AU20 a long unbroken preset name wraps inside its row…` (an 84-character name: not under the ✕, not out of the row, the panel does not scroll sideways) red on main at 1280 (`name ends at 762, the ✕ starts at 245`) and 380, green with the fix. **Mutation** (the wrap line removed) CAUGHT.

### Neighbours
- With a layer seeded, the four existing card tests (`saving a preset updates the open Presets card…` 330, `the Presets card leads with its save button…` 331, `917.16…`, `presets can be searched, tagged, grouped and renamed` 331) are 8/8 green on the branch and on main at 1280 and 380 (`range331_*`). **They fail with "no layer to work from" when run alone or as the `preset` slice: that is the slice having no layer, not a bug**, and it is why the `preset` slice shows the same 6 reds on main and on the branch.
- Rename itself: refuses a taken name, carries the tags across (Read, and the existing 331 test covers it), trims the new name (the two Save buttons trim too). A rename to the same name with trailing spaces does nothing and says nothing; I left that.

## fx-thumbs: the 800 lines AU17 did not read
**Clean (Measured, `xref.js`, `range.js`).** Every table was cross-checked against the live registry and files:
- all **77 OVERRIDES keys** are real effect types, none duplicated; the 206 types all resolve a subject, build their preview scene without throwing, and no override writes a parameter key the effect does not have (0 unknown keys);
- the **138 parameters the overrides change** are all inside the registry's own min and max, and every segment value is a real option (0 out of range, 0 bad options, 0 non-numbers);
- `PHOTO_OF` (no effect named in two photo lists, none that is not an effect), `SUBJECT_OF` (none that is not an effect), `FILTER_SUBJECT` (56 entries for the 56 library filters: none missing, none extra), every category has art and a form, and all **18 photographs the tables name exist** and are in the preload set.
- `layerStep` (the tail AU17 skipped), `windowFor`, `sceneRev`, `remember`/`touch`, `paint`, `pump`, `generateFilter`: Read; no defect found beyond the two below.

**Measured, a limit and not a defect: the layer-preview cache is a fixed 10 MB whatever the screen** (`lcache.js`). One 10-frame strip is 0.7 MB at DPR 1 to 2 and **1.6 MB at DPR 3** (the tile is 228 x 174). Sixteen tiles on a layer: DPR 1 holds all 16 (9.6 MB, a second mount queues nothing); **DPR 3 holds 6 to 9, and mounting the same 16 again regenerates 7 of them** (105 ms here, more on a phone). Scaling the cap with the tile area (10 MB x (scale / 2)^2, so 22.5 MB at DPR 3) would stop it; it is a memory decision on a phone, so I left it for you.

**Read, not measured, small:**
- `pump()` calls `remember(key, entry)` even when the entry is provisional and was NOT cached (a photograph still decoding while a layer tile falls back to the sample). The tile is counted in `layerBytes` with nothing to evict, so the count drifts up by one sample frame (147 KB) per such tile; it takes about 70 of them to cost a real eviction, and it resets on `remountLive`. Not reachable in practice.
- A photograph whose first fetch fails (offline before `fx-art/` was cached) stays a broken `Image` for the session and its tiles are re-rendered, never cached, on every mount. Documented in the file as the offline fallback.

## Not covered
Preset import and export; the shipped `FM.EFFECT_PRESETS` list against the registry's ranges; the Filters tab save and rename (`filters.js`); the effect-stack presets' Hold menu on a real touch device (I read the 550 ms timer and the swallowed tap; finger repros are NOT RUN here); the tag UI with hundreds of tags.

## Files
`js/inspector.js` (v 411), `styles.css` (755), `index.html`, `tests/tests.js` (three `AU20` tests), this report, `audit-fx-3-scripts/`.
