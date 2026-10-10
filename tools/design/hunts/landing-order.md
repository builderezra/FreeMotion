# Landing order, INT2 update (23 branches, branch `hunt/audit-integrated-3`)

Against `origin/main` 1fa76385 (**still v17.34**: since INT1, main absorbed nothing in `js/` or `styles.css`; the integration did not need rebasing). **Measured** = run here (headless Chromium, Linux, 1280 and 380), **Read** = read the code.

## What changed since INT1
Four branches joined the 19 below: **`hunt/audit-unread-1` (AU23)**, **`hunt/audit-spine` (AU22)**, **`hunt/fuzz-seeds` (FZ1, FZ2)** and **`hunt/new-effects-1` (E1, E2)**. Rebuilt with `audit-integrated-3-scripts/integrate3.sh`; no source conflict, only `index.html` and `tests/tests.js` need merging, as before.

## Where the four new branches go (insert into the order below)
| branch | goes | why | touches |
|---|---|---|---|
| `hunt/audit-spine` (AU22) | after #7 `audit-filmstrip`, before #8 | tiny, two files, no stored data | `spine.js` +30/-6, `app.js` +1 (one `FM.spine.onSplit` call) |
| `hunt/audit-unread-1` (AU23) | after #8 `audit-collab-media`, with the other collab fix (#13) kept after it | one file, UI only | `collab-ui.js` +11/-5 |
| `hunt/fuzz-seeds` (FZ1/FZ2) | right after #13 `audit-collab` | host fix in `collab-host.js` (`refreshDup`), same area as AU5; the guest model in the fuzz test needs AU5 | `collab-host.js` +47/-1 |
| `hunt/new-effects-1` (E1/E2) | **last of all, after #19 `audit-storage`**, as the INT1 note said | adds effects (+300 lines `compositor.js`), moves `SCHEMA_REV` 8 to 9 and the pin, re-tunes Soften Skin | `compositor.js`, `fx-registry.js`, `collab-core.js` |

## Measured on the integration (every new test alone, both widths)
- **62 test titles** (the 41 from INT1, AU22 x3, AU23 x3, FZ1 x3 plus its battery, E1 and E2, and the three existing tests E1/FZ1 edited: `745`, `913.8`, `921 S1 convergence fuzz`). **All green at 1280 and at 380 except `AU7-1f`**, the real-finger test, which is NOT RUN HERE (needs a real touch device). Raw lines: `audit-integrated-3-scripts/results_*.txt`. (Titles with a backtick or a curly quote do not survive the name-per-line runner, so `AU10-1`, `AU23-1/2/3`, `AU8-1`, `AU9-1` and `PF2` were re-run by short prefix: all green, `results_short_*.txt`.)
- **Neighbours, identical to main:** `921 S1` 24/24, `registry` 5/5 (E1 adds one), `AU` 49/50 with the same NOT RUN, `effects:` 137/138 (Favourites browser, red on main too), `thumb` 9/11 (`658`, `690`, red on main too).
- **One schema pin, valid:** `921 S1 the schema fingerprint gate` is green with `SCHEMA_REV 9`, `SCHEMA_FP 5698315735221935`. E1's pin already holds on the merged tree, so there is nothing to re-pin after landing the others (Measured). If **ChatGPT's B6 (`3728d6f5`)** lands first it also adds an effect with the id `oilpaint`; **the id collides with E1's Oil Paint** (Read), so whichever lands second renames or drops its own, and the pin moves once more.
- Fuzz: seeds 1 to 150 of `921 S1 convergence fuzz` all pass on this branch's `collab-host.js` (Measured at 1280, FZ2).

## `?v=` numbers for landing all together (distinct, each above main, Measured)
`app.js` 470, `collab-core` 24, `collab-host` 6, `collab-media` 6, `collab-session` 13, `collab-ui` 19, `compositor` 213, `exporter` 127, `fx-presets` 13, `fx-registry` 25.32, `history` 38, `inspector` 411, `mobile` 47, `scene` 120, `spine` 3, `storage` 60, `timeline` 262, `styles.css` 755. Landing one branch at a time, each needs its own +1 from live; `tools/ship.sh` refuses a changed file whose number did not move.

## Not covered
`AU7-1f` (real finger), AAC-encoder tests, the phone itself. B1 and ChatGPT's chain were not merged into this set (same as INT1).

---

# Landing order for the integrated audit, perf and alias branches (INT1)

Against `origin/main` 1fa76385 (v17.34). **Measured** = I ran it here (headless Chromium on Linux, 1280 and 380), **Read** = read the code, **Guess** = not checked.

The integration is branch `hunt/audit-integrated-2` (19 branches merged in the order below, rebuilt with `tools/design/hunts/audit-integrated-2-scripts/integrate2.sh`; nothing else on main moved except `index.html`'s label and test-runner files, so the v17.33 integration of P26 still holds, now with the 12 later branches added).

## What the integration shows (Measured)
- **No source conflict at all** between the 19 branches. Only two files conflict, as before: `index.html` (busters, resolved by taking the higher number) and `tests/tests.js` (every branch appends at the same spot; `merge_tests2.py` appends each branch's own new tests in order and the file parses). Every `js/*.js` parses (`node --check`).
- **The 41 new tests** (one per title in `results/names_int_*.txt`, each run alone): **40 green and 1 NOT RUN HERE at both 1280 and 380** (`AU7-1f`, the real-finger test, which needs a real touch device: it has to run on the laptop's finger pass). On main's own source **36 are red** (35 truly, plus that NOT RUN one) and **5 are green by design** (`AU4-3`, `AU5-1` and `AU6-3` are fuzz or arithmetic guards, `AU17-2` and `AU21` guard something main already does).
- **Neighbours at 1280 and 380, identical to main:** `921 S1` 24/24, `registry` 4/4, `effects:` 137/138 (the Favourites browser, red on main too), `thumb` 9/11 (`658` and `690 … thumbnails`, red on main too), `filter` 86/88 (2 not run here), the `AU` tests 43/44 with the same one NOT RUN.

## The ?v= numbers after merging (fix the collisions against v17.34, Measured, `results/int2_busters.txt`)
| file | main | final | note |
|---|---|---|---|
| `app.js` | 469 | 470 | branches took 469 (no bump); one more than main |
| `scene.js` | 119 | 120 | same |
| `collab-media.js` | 5 | 6 | |
| `collab-session.js` | 12 | 13 | |
| `compositor.js` | 212 | 213 | **E1 (`hunt/new-effects-1`) also takes 213**; whichever lands second moves to 214 |
| `exporter.js` | 126 | 127 | ChatGPT's #1013 chain also takes 127 |
| `fx-presets.js` | 12 | 13 | |
| `fx-registry.js` | 25.31 | 25.32 | **E1 also takes 25.32** |
| `history.js` | 37 | 38 | B1 also takes 38 |
| `inspector.js` | 410 | 411 | |
| `mobile.js` | 46 | 47 | |
| `storage.js` | 59 | 60 | B1 also takes 60 |
| `timeline.js` | 261 | 262 | |
| `styles.css` | 754 | 755 | |
Branches landing one at a time each need their own +1 from live; the table is for landing them together. `tools/ship.sh` refuses a changed file whose number did not move.

## Order: smallest risk first, storage last
Rule used: fewer lines and a narrower surface first; a change that reads or writes a saved project last; `storage.js` last of all. The `?v=` bump and a POLISH-LOG line go with each.

### 1. `hunt/audit-compositor` (AU12): one comment-free arithmetic fix in a kernel
- Changes: compositor.js +3/-1.
- Tests (1): `AU12-1 Tilt-Shift blurs a half-scale preview as much as the export, no`

### 2. `hunt/audit-fx-3` (AU20): Presets card UI (tag filter, rename, long names)
- Changes: inspector.js +8/-0, styles.css +1/-1.
- Tests (3): `AU20 clearing the last tag while its chip is the filter does not leave`; `AU20 renaming a layer preset keeps the Update button of layers that we`; `AU20 a long unbroken preset name wraps inside its row instead of runni`

### 3. `hunt/audit-fx-2` (AU17): the 121st saved preset is refused instead of deleting the oldest
- Changes: fx-presets.js +9/-1.
- Tests (2): `AU17-1 saving a 121st effect preset is refused with a message, it does`; `AU17-2 every effect type and parameter key a v17.32 project can hold s`

### 4. `hunt/audit-app-1` (AU9): setTime / scrubTime playhead clamp (6 lines)
- Changes: app.js +6/-0.
- Tests (1): `AU9-1 setTime and scrubTime ignore a time that is not a number instead`

### 5. `hunt/audit-app-3` (AU11): arrow nudge in a turned or scaled group (13 lines)
- Changes: app.js +13/-0.
- Tests (1): `AU11-1 an arrow key nudges a layer on the SCREEN, also for a member of`

### 6. `hunt/audit-app-2` (AU10): Align on a grouped or turned layer (33 lines)
- Changes: app.js +33/-0.
- Tests (1): `AU10-1 Align puts a layer\`

### 7. `hunt/audit-filmstrip` (AU19): timeline strip shows the other clip after Undo of a replaced video
- Changes: timeline.js +8/-2.
- Tests (1): `AU19-1 after Undo or Redo of a replaced video the timeline bar shows t`

### 8. `hunt/audit-collab-media` (AU21): a guest dropping mid-upload finishes on return (additive, one file)
- Changes: collab-media.js +23/-0.
- Tests (3): `AU21 a guest that drops mid-upload and comes back finishes its clip on`; `AU21 a member who leaves does not leave send loops running behind it`; `AU21 files that end exactly on a chunk, a part and the send window arr`

### 9. `hunt/audit-scene` (AU4): undo and redo with the editor open (history.js)
- Changes: app.js +4/-0, history.js +6/-1.
- Tests (3): `AU4-1 undo right after Add text / Add captions (the editor still open)`; `AU4-2 Add group while the text editor is open is ONE undo step, not tw`; `AU4-3 a random sequence of real commands: every undo and every redo la`

### 10. `hunt/audit-timeline` (AU1): a reversed clip's head trim (scene, timeline, app)
- Changes: app.js +1/-4, scene.js +15/-0, timeline.js +3/-4.
- Tests (2): `AU1-1 dragging the LEFT grip of a REVERSED clip keeps its effect clock`; `AU1-2 growing the HEAD of a REVERSED clip with a speed ramp never reac`

### 11. `hunt/audit-inspector` (AU2): slider number entry, Paste look, multi-select Align
- Changes: inspector.js +23/-12.
- Tests (4): `AU2-1 typing the number an effect slider is already showing leaves it `; `AU2-2 Paste look → Effects fits a copied filter to the layer it lands `; `AU2-3 the multi-select Align buttons (Start together, Chain, End toget`; `AU2-4 the multi-select Align buttons move a selected GROUP together wi`

### 12. `hunt/audit-exporter` (AU6): a failed export releases its encoder and frame
- Changes: exporter.js +16/-7.
- Tests (3): `AU6-1 an MP4 export that fails part-way (a layer that will not draw, a`; `AU6-2 a soundtrack encode that throws part-way closes its audio encode`; `AU6-3 the pure export arithmetic: the mix limiter equals a plain refer`

### 13. `hunt/audit-collab` (AU5): a guest with a stale base resends a deleted layer (collab-session.js)
- Changes: collab-session.js +27/-1.
- Tests (2): `AU5-1 lost edits, stale overwrites and duplicate layers: an owner and `; `AU5-2 a guest that reloads with a base persisted BEFORE a layer arrive`

### 14. `hunt/audit-mobile` (AU7): phone sheet drag and press handlers; needs the real-finger pass on the laptop
- Changes: mobile.js +15/-3.
- Tests (1): `AU7-1f a REAL finger: a quick drag that rests before the lift does not`

### 15. `hunt/perf-glow` (PF2): stacked glows as single-stage draws (+151 lines in compositor.js; picture-identical within jitter)
- Changes: compositor.js +151/-0.
- Tests (1): `PF2 a stack of Glows never puts more than one drop-shadow in a filter `

### 16. `hunt/perf-freeze` (PF1): card thumbnail rendered at card size, not project size (storage.js)
- Changes: storage.js +10/-4.
- Tests (1): `PF1 importing a project with a heavy effect stack draws its card at th`

### 17. `hunt/param-aliases` (PL1): renamed effects and params keep opening (registry, presets, sanitiser in storage.js)
- Changes: fx-presets.js +2/-0, fx-registry.js +51/-0, storage.js +3/-0.
- Tests (4): `AU17-2 every effect type and parameter key a v17.32 project can hold s`; `PL1 the guard demands an alias for a rename and accepts one that exist`; `PL1 a saved effect whose parameter or type was renamed keeps its value`; `PL1 an effect preset saved under the old names still loads under the n`

### 18. `hunt/audit-home` (AU8): project names cut to 200 characters on rename and duplicate (storage.js)
- Changes: storage.js +6/-1.
- Tests (1): `AU8-1 a project name is cut to 200 characters when it is given (Rename`

### 19. `hunt/audit-storage` (AU3): saving and opening: damaged or odd projects (storage.js) LAST
- Changes: storage.js +19/-5.
- Tests (6): `AU3-1 a stored project whose layers list holds a null (an undefined en`; `AU3-1b importing a project file whose layers list holds a null imports`; `AU3-2 the boot sweep keeps the media a damaged project document still `; `AU3-2b deleting a project keeps a clip that a damaged sibling document`; `AU3-3 a stored project (and an imported file) whose layer lacks a tran`; `AU3-4 deleting a stored media record whose transaction aborts at commi`

## Things that are not branches but change the order
- **E1's schema fingerprint.** E1 raises `SCHEMA_REV` to 9 and re-pins `SCHEMA_FP`; param-aliases (PL1) does not touch the fingerprint (Measured: `921 S1` green on the integration). Land E1 after, then re-pin once.
- **ChatGPT's chain and B1** (P27, #1069) also touch `storage.js`, `app.js` and `exporter.js`. They apply to main cleanly and B1 applies on the chain (P27). Textually they do not collide with these 19 (Guess: only `index.html` busters; I did not merge them with this set).
- **Unproven in this container:** `AU7-1f` (real finger), anything that needs an AAC encoder (AU6's export tests run, but the sound-loss ones are NOT RUN HERE), and the phone itself.
