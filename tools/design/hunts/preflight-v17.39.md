# PRE3b: cloud pre-flight of wip/v17.39-tree 44ba5f10 (Simple 2.2; 2407 tests)

**Verdict: one red that is this tree's own (`simple P2.2 · tray B …`, red alone and paired at both widths, absent on main), one the builder already explained (`keyboard can edit numeric Volume…`, the pre-v17.37 base), nothing else new.** Reference: main d55cabc8 (v17.37). Driver, slices, watchdog and triage exactly as in `preflight-v17.38.md` sections 7 and 9 (the tree's own `tests/_cdp.py`; "paired" = `after=<the test two before>&upto=<the red>` so the predecessor really runs).

## 1. Static check

0 script tags dropped against main, `js/spine-edit.js` and `js/simple-tools.js` added, 0 `?v=` lower than main's, no conflict markers; every `js/*.js` passes `node --check`.

## 2. Counts
- **1280: 2409 ran, 53 red, 96 NOT RUN HERE.  380: 2409 ran, 52 red, 95 NOT RUN HERE.** (2407 tests plus 2 driver-hang entries.) The two export tests `690 swiping the share sheet away after Save…` and `690 an export holds the screen awake…` hang the driver (no H.264) and are counted red-by-hang.
- 1280 and 380 differ only by `482 6.7 Glow Scan …` (red at 1280 only here; it is red on main alone too, so environment).

## 3. The reds that are not "red on main alone too" (6 of 51 names)

| red | alone 1280 / 380 | paired 1280 / 380 | main alone | verdict |
|---|---|---|---|---|
| **`simple P2.2 · tray B at 1280×800, 1280×720 and 960×700 every tool is on show…`** | **RED / RED** | **RED / RED** | test not on main | **this tree's own red** |
| `keyboard can edit numeric Volume and Position values…` (#1016) | ok / ok | ok / ok | ok / ok | red only in the full pass: the old-base leak (`FM._mtMode`, fixed in v17.37; this tree is pre-v17.37), as you said |
| `home push: the press answers the tap…` | ok / ok | **RED / RED** with its predecessor in front | ok / ok | predecessor-dependent; same on main v17.36 (bisected there); not new |
| `playhead: a rebuild during the return-to-home pop…` | ok / ok | ok / ok | ok / ok | full-pass-only; same on main v17.36 (bisected there to the home-push predecessor) |
| `921 S3 Stop sharing revokes the code…` | ok / ok | ok / ok | ok / ok | full-pass-only; same on main v17.36 (bisected there) |
| `981 review: with less motion the add menu arrives on its plain 220 ms slide…` | ok / ok | ok / ok | ok / ok | full-pass-only; not shown on main's own full pass |

### The one real red, in full
`simple P2.2 · tray B …` first message, alone, at 1280 and 380: `960×700: [5,4] duplicateClip lies outside the band (240–301 in 0–300) · delete lies outside the band (240–301 in 0–300) · the tray scrolls sideways (301 px in 299)`. At 960×700 the tray is 2 px wider than its band (301 in 299): the last two tools sit 1 px past the band edge and the tray scrolls sideways. 1280×800 and 1280×720 pass. **I cannot say whether it is the tree or my fonts:** the container has no SF Pro, and the fallback is narrower in some strings and wider in others (the suite's own font probe prints 446.45 against 450.9 here), so a 1-2 px overflow at one size is the kind of thing a font difference makes. It does reproduce on every run and the test is this tree's, so treat it as real until the laptop's own pass says it is green.

The other 45 reds are red on main alone too (no H.264/H.265, no real camera, a 4× CPU throttle the driver cannot give, Presets tests with no layer, clapper animation tests, Glow Scan, Motion Blur and Echo picture checks), the same list as in the v17.38 report section 9.

Not measured here: every NOT RUN HERE test (real finger, AAC, H.264), export correctness, the 2 hangs.

DONE: PRE3b preflight-v17.39 — 44ba5f10 at 1280 and 380: 53/52 red, 1 own (simple P2.2 · tray B at 960×700, 2 px overflow; may be fonts), 1 old-base (#1016), the rest same as v17.38/main.


## PRE-NEXT (cloud, 11 Oct, the new cloud helper): wip/v17.39-tree 726bb6d (2.2 with BX3)

**Status: code review DONE, browser reproduction and full passes RUNNING. Read this before shipping v17.39.**

**Static check (726bb6d vs main a77db17): clean.** 0 script tags dropped, js/simple-tools.js added and tagged, 0 `?v=` lower than main's, no unchanged buster on a changed file, every js/*.js, tests.js and sw.js passes `node --check`, no conflict markers.

**Code review (read-only; one reviewer, findings traced): 1 HIGH, 1 MEDIUM, 4 LOW.** The HIGH is a Full-unchanged breach (Ezra's hard rule): leaving Simple never redraws Full's inspector. The MEDIUM is the same stale-tray class BX1d fixed on the 2.4 tree (hunt/bx1d 5f10fdb adds `l.type` and more to the tray signature at simple-tools.js:485); **that fix is NOT in 2.2** (2.2's signature at simple-tools.js:389 lacks it). Both are being reproduced in a real browser now; if they reproduce, a red-first-proven fix lands on branch `hunt/v17.39-fixes` and a section below says so.

The full review follows verbatim.

# Review: v17.39 (Simple mode step 2.2), TREE 726bb6d against a77db17

**Verdict: do not ship as is.** One hunk visibly changes the Full editor: after any switch from Simple to Full, Full's inspector is never redrawn. There is also one Medium tray-staleness bug and four Low defects. No other Full leak was found.

Read only: no tests or browser were run. Every finding below was traced through the real call path in TREE. Line numbers are TREE line numbers.

| Severity | file:line | Defect | Scenario | Smallest fix |
|---|---|---|---|---|
| **HIGH (Full changes)** | js/inspector.js:7107-7116, js/mobile.js:60 (the switch path is js/editor-mode.js:125-149; nothing on it calls `FM.inspector.refresh`) | In Simple, the inspector band now holds `.sm-band-hint` with an empty title, and the phone sheet is held shut. A switch back to Full never redraws either one. `apply()` runs only `syncSelectionChrome`, `timeline.rebuild()` (whose Full path has no inspector refresh) and the listeners, and the only listener simple-tools adds is `home()`. The sheet is re-derived only inside `inspector.refresh` (mobile.js:188). On project open, `refreshAll` refreshes the inspector **before** `rebuild → syncProject → apply` (app.js:942/949), so it is stale there too. | (a) PC, Simple, nothing selected. The band reads "Tap a clip to see its tools" and the title is blank. Use the cog to switch to Full: Full's band keeps that hint with no "Add" title and no Add menu, until some later selection change. (b) Select a block, then tap **Open in Full** (tray, simple-tools.js:227, or a refusal line's button). Full opens with the block selected, but the PC band says "Its tools are below · More opens the rest". On a phone, `m-editing` is set but the sheet stays closed. (c) Open a Full-home project from Home while the last project was in Simple: same as (a). The suite misses this because its CONTROL test (tests.js:123056) calls `selectLayer` after `apply('full')`, which refreshes the inspector. | simple-tools.js:93: make the listener `m => { if (m !== 'simple') home(); if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh(); }`. It is registered at the first Simple sync, which runs inside the first `apply('simple')` before `listeners.forEach`, so it covers every switch in both directions. That also fixes Full→Simple, where Full's panel or open sheet stays up in Simple. |
| MEDIUM | js/simple-tools.js:380 and :389 (fill at :196-236) | `sync()` reads `FM.simpleTimeline.read()`, which is the model from the **previous** rebuild. The sig has nothing that changes when that model lacks the selected layer. A layer created and selected in the same refresh is filled before the rebuild: `FM.refreshAll` is mobile's wrapper, which runs `syncSelectionChrome → sync` before `origRefresh` (mobile.js:342). `R.units[id]` is undefined, so `k = ''` and the layer gets the **overlay** tray. The rebuild's own `sync()` then computes an identical sig and returns, so the wrong tray stays. | (a) Any width: tap **Text**. The new text's tray is Into row · Crop · Forward · Back · Stay put · More · Delete, not Edit words · Stay put · More · Delete. On PC that is 7 tools, so it goes to two rows. It stays that way while typing and after, until the selection changes. (b) Phone: Sound › Sound effects (or Record voice). `addMediaLayer`'s local `refreshAll` refreshes the inspector, and its `syncSheet` runs `sync()` before `rebuild`, so the sound gets the overlay tray. Pressing the offered **Into row** passes `planIntoRow` (spine-edit.js:1237-1238: type 'video', no `audioOnly`, no `sm.snd`). That ripples the clips by the sound's length and flags it main, but `classify` rejects it as `mainNoPicture` (spine.js:281). Result: a black gap of that length in the clip row, said as "Put in the clip row". | Add the selected unit's kind to the sig at :389, e.g. `one && R.units[one] ? R.units[one].kind + '/' + (R.units[one].host \|\| '') : '-'`, so the rebuild's fresh model re-fills. Optional hardening: `if (u.kind === 'audio') return refusePlan('cannotMain');` in `planIntoRow`. |
| LOW | js/spine-edit.js:1100 and :1240 | The `insertFade` numbers are `R.main` indices `{a: j, b: j+1}`, but `R.main` includes card (slot) entries. The words say "Clips a and b", and clips are numbered without slots (simple-timeline a11y, `planReorder` newIndex). | A title card starts at 0 and clip A at 2, so `R.main = [slot, A, B]`, and B crossfades with A. Clips › "After A" gives j=2, refused as "Clips 2 and 3 fade into each other". They are clips 1 and 2. | Count clips: `const num = k => R.main.slice(0, k + 1).filter(e => !e.slot).length;` then `{ a: num(j - 1), b: num(j) }` at both sites. |
| LOW | js/spine-edit.js:1073-1074 | Append moves the tail with `addMove(plan, id, sum)`, where sum = Σlen, instead of landing it on the new clips' end as `addRecs` writes it (`((T+a)+b)…`). `planInsert` does this right (computes `newEnd` sequentially, then `tailMove`). With sum = 0 (a sounds-only pick through + or Clips), the tail is still put in `touched` and makes the plan `arranges`. | (a) The clips end at T = 2 with an end card exactly at 2. Append a 2.7 s and a 0.1 s video: the last clip ends at 4.8, but the card starts at 2 + 2.8 = 4.800000000000001. At frame 144 (t = 4.8 at 30 fps) nothing draws, which is the one-frame black the file's own §3.1 / finding-16 comments guard against. (b) A project with an end card and a friend who can edit: picking an mp3 with + is refused as 'live' (or 'locked' if the card is locked), while Sound › Music adds it. | `let newEnd = T; clips.forEach(c => { newEnd += c.len; }); if (clips.length) tailMove(plan, R, newEnd, map);` and gate `plan.arranges` on `clips.length > 0`. |
| LOW | js/spine-edit.js:1120 (Append's :1082 reads the same value) | Picked sounds are placed at `FM.time` after `addRecs(clips)` has moved it: `addMediaLayer` sets `FM.time = start` for every clip (app.js:3112). | Playhead at 3 s. Clips › After Clip 2 (cut at 5 s), pick a.mp4 (4 s), b.mp4 (2 s) and song.mp3. The song starts at 9 s, the start of b.mp4. That is neither the playhead nor the cut. | Read `const t0 = FM.time` before the first `addRecs` in the pre step and use it for the sounds. |
| LOW | js/spine-edit.js:1420-1427, with :1058/:1095/:1369/:1395 | Records read by `readPicked` (a `createObjectURL` plus a `<video>`/`<img>`, media.js:127) are never released when the add does not happen. The causes: any refusal (riders, live gate, locked, newer, viewer), a full runner queue ('wait'), and `planAddOverlay` dropping `picked.sounds` without a word. Only the project-changed path calls `FM.letGoMedia`. | With a spanning caption track ('riders'), each press of + and pick of a 300 MB video loads it, refuses, and keeps the blob URL alive for the rest of the session. | In `afterRead`: `const ok = await run(picked); if (!ok) [...picked.clips, ...picked.sounds].forEach(c => FM.letGoMedia(c.rec));`. Release ignored sounds in `planAddOverlay`. |

## Areas checked with no defect

- **Full leak, hunk by hunk.**
  - **app.js:** `syncSelectionChrome` calls `sync()` only when `simple`. The `addMediaLayer` `{noSave}` flag is passed only by spine-edit, and every Full caller passes no opts or `{at, pick}`. The deselect KEEP list adds `#sm-bar, .sm-menu`, which are never visible or present outside Simple.
  - **inspector.js, mobile.js:** `bandIdle` and `sheetHeld` test `isSimple()` first, and `unlatch` is called only from Simple's More.
  - **editor-mode.js:** `busyReason`'s `reading` and `queue` are non-zero only from Simple commands, since `history.undo/redo` queue only while `S.running`. Alt+←/→ is gated on `mode === 'simple'` and is reached only when not in a text field.
  - **collab-core.js:** comments only, and `SCHEMA_REV` was already 8.
  - **styles.css:** every new selector hangs on a Simple-only id or class, or on `body.ed-simple`. None of the 14 new class names occurs in BASE.
  - **index.html:** the new DOM sits inside `#sm-timeline` (`display: none` in Full), and every changed file has its `?v=` bumped.
  - The only Full-visible change is the HIGH row above.
- **Listeners:** `mount()` runs once (guarded by `bar`), and so does `wireSay` (`_wired`). Menu keydown/keyup listeners die with the menu. The ⋯ capture, wheel, resize and documentElement-style observers all return early outside Simple. Nothing doubles on re-entry or on PC↔phone moves (`place`/`home` move one node).
- **Undo grouping:** every new command is one `S.edit` step (stay-many is one plan). Tray Delete on a non-main item is Full's `deleteLayer`, which is one commit. Text is one step, then typing, as in Full. Refusals and `restorePreEdit` behave as before.
- **Empty project, one clip, deleted selection:**
  - Empty project: the quiet line `summary(0, 0)`, `insertIndexAt` returns 0 on an empty row, `clampToTrack` without clips, Close all gaps says noGaps, `overrun` is empty, and the band is drawn only if `trackEnd > 0`.
  - One clip: Move earlier/later are disabled, and Lift of a lone clip sends the tail to `c.start`.
  - Deleted selection: `panelFor` and `lengthFor` reset on any selection change, and `trayFor` returns [] for a missing layer.
- **Reorder geometry:** `planReorder` was traced for earlier, later, a last clip moving, and a gap before the moved clip. Positions, the landed seams and the tail are correct.
- **Phone at 380 px:**
  - Tray tools are ≥ 54 × 52, with More and 🗑 pinned in one sticky end. Project tools are about 95 × 56. The Length row is about 300 px and its input is 72 × 44 at 16 px (no iOS zoom).
  - Menu rows are 44 px and clamped inside 8 px margins. The black band is ≥ 44 px wide.
  - Line buttons keep 56 px clear of 🗑, and the new rule (1,1,0) correctly overrides 2.1's.
  - The project tools row carries the safe-area padding.
- **PC two-row grid:** for 6 to 9 tools, `grid-column-start: -3` puts More and 🗑 in the last two cells of row 2. `sm-two` drops only when no line is showing.
- **Other checks:**
  - The double-click guard: the `fills` counter and the per-seam key.
  - `rows()`/`fitRows`: no observer loop.
  - Focus restore after a refill.
  - The `drain` re-arm: the poll ends when history unmutes, and the runner's `finally` drains.

