# #1084 half a — the Add menu grows out of where you tapped (branch `hunt/1084a-grow`, on v17.57)

**Nothing here was run.** A release ship was running on the laptop, so this was built code-only: no browser, no server,
no python, no suite, no prove.sh / mutate.sh / fp.js. The only checks made were `node --check` on every changed JS file
(all silent), git, grep and reading. Every test below is UNRUN; every expected base failure is reasoned, not observed.

## His words and the decision

- 6 Oct (REQUESTS.md #1084, verbatim there): "wherever you touched from it basically expands out from where you touched …
  It will like pulse out from like a circle outwards but like in a nice looking way and it'll be fairly quick" … "just have
  a toggle switch to change the two modes in the settings".
- 7 Oct, his pick: "i want the circle one for when a project is empty, and i want b for when u are pressing the add layer".
  Option a at 260 ms (shown 260 and 340, did not object). Logger: "The new mode is ON by default."
- 16 Oct audit: half a = the circle from the tap over 260 ms, the Settings toggle, the old slide-up kept exactly; its
  hand-over is to #964's one press (Aurora + the bottom-middle outline, settled in v17.57). Half b waits on his OK.

So: on a phone, on an EMPTY project (the big area, its big +, Enter on it), the menu grows as a clip-path circle from the
tap. The add row on a project WITH layers is clause 3 = option b, not built, so it keeps today's slide-up.

## What changed, file by file

| file | change |
|---|---|
| `js/mobile.js` | New block before `openAdd`: `growOn()` (phone width, no reduced motion, setting not off), `growAdd(origin)`, `shrinkAdd()`, `endGrow()`. `openAdd(opts)` takes `{ grow, origin }`: when the one door asks and the menu is not already up, `.add-grow` goes on BEFORE `.open` (so no style pass sees `.open` alone and starts the swing), then a WAAPI `clip-path` circle 0 → past the far corner (+40 px over the top for the glass shadow) at the tap, 260 ms, the prototype's `cubic-bezier(.3,.55,.3,1)`; the sheet's children fade in from 30%; two rings (`.add-grow-ring`, a fixed sibling over the sheet's box, same left/top as the sheet) scale with the circle in the rim lights' colours and are removed on a timer. `closeAdd(fromY)`: a grown menu closes as the circle back to the tap point (80% of the time, from whatever radius it had reached, `cubic-bezier(.5,0,.85,.35)`, contents gone by 40%), held at rest, then moved off-screen BEFORE the clip is dropped (no flash frame). A swipe (`fromY > 0`) or motion now off → `endGrow()` then the old path, untouched. A reopen while a circle is still closing tidies it first. |
| `js/timeline.js` | `growOrigin(e, ctl)`: the click's point; for a key, or a scripted click with no point, the big `+`'s centre. `openFromArea(origin)` passes `{ grow: true, origin }` to `openAdd`. When the menu came up grown, the rim lap (`menuRim`) is skipped — the circle's lit edge is the light — and the area's outline still hands over with its #981 160 ms fade. With the setting off the branch is `else if (!menuRim(sheet)) return;` = exactly the old line. Both callers (the area's click, the empty row's click/Enter) pass the origin. |
| `js/settings.js` | `DEFAULTS.addMenuGrow = true`; added to load()'s boolean whitelist (the #688 lesson); a phone-only switch row "Add menu grows from your tap" / "Off: it slides up from the bottom, as before." right after Show touches. |
| `styles.css` | `#add-sheet.open.add-grow { animation: none; transition: none; }` (only that opening), `.add-grow-ring` styles, and a reduced-motion lock hiding the ring. No existing rule touched. |
| `index.html` | busters only (below). |
| `tests/tests.js` | seven new `1084` tests at the end; four existing #981 tests wrapped to run with the setting OFF (see below). |

### Busters (from v17.57)

| file | was | now |
|---|---|---|
| styles.css | 773 | 774 |
| js/settings.js | 54 | 55 |
| js/timeline.js | 265 | 266 |
| js/mobile.js | 50 | 51 |

## Tests (all `{ item: '1084' }`, appended before the final `})();`)

Shared helpers: `grow1084(on, fn)` (sets the setting, restores the value AND the stored `fm.settings` blob),
`clipAnim1084` (finds the animation by its clip-path keyframes, not by a name), `circle1084` (parses the computed
clip-path), `readerControl1084` (the CONTROL: reads a known `circle(7px at 11px 13px)` on a known box back, and finds none
where there is none). Phone tests run in `onEmptyArea964` / `onEmpty981`, which narrow the frame, so both passes mean it.

| test | proves | expected failure on v17.57 |
|---|---|---|
| 1084 a | setting on: a tap at (28%, 66%) of the area grows a circle from that point (±2 px, the plan's), 260 ms ±1, radius 0 → between at 130 ms → past the far corner; no other motion on the sheet; contents fully in by the end; no clip left; the sheet sits where it rests | "the add menu opened with no clip-path circle growing on it — it still swings up from the bottom (queue 1084 clause 2 …)" |
| 1084 b | the Settings switch at phone width turns it off; the same tap then opens EXACTLY as v17.57: classes `is-arriving open`, `fm-hinge-up` 0.36s `cubic-bezier(0.18, 0.85, 0.28, 1.02)`, no transition under it, the rim lights, no clip, no ring. CONTROL: back on, the same tap grows | "Settings has no ‘Add menu grows from your tap’ switch at a phone width — no way back to the old slide-up (queue 1084 clause 5 …)" |
| 1084 c | reduced motion (matchMedia stub, descriptor restored): no circle, no ring, classes as today; a CSS reduced-motion rule hides `.add-grow-ring` | its CONTROL: "with motion allowed and the setting on, the tap grew no circle — so its absence under less motion would prove nothing" |
| 1084 d | hand-over: the press's outline lap exists (CONTROL); after the click no `.add-sheet-rim`; the lap's fade ends ≤ 160 ms and before the circle's 260; the lead ring's centre and radius match the clip circle at 60/130/200 ms and it is visible at 60; Aurora still runs; Enter with the menu up grows nothing; close runs the circle from ≥ the far corner back to 0 at the tap, no longer than it grew; afterwards nothing is left (ring, rim, animations, fades, clip, classes, inline styles, the outline, the sheet on screen) | "the menu opened from the empty area with no circle for the press to hand over to (queue 1084 clause 4)" |
| 1084 e | default ON for a phone that never chose (and with no storage at all); off saves and survives `FM.settings.init()`; on survives; a non-boolean is ignored; the switch is in the phone's Settings reading the saved value and NOT in PC's (CONTROL: the lookup finds Show touches) | "a phone that never chose has the Add menu animation setting undefined — it must start ON …" (after its CONTROL, a systemFonts round trip, passes) |
| 1084 f | a swipe close of a grown menu (`FM._addSheetClose(120)`, the #773 seam) runs no circle, holds the sheet at `translateY(120px)`, starts no swing, leaves no ring/class; the next tap grows again from its own point | "the empty-area tap opened the add menu with no circle — nothing grew, so there is no grown menu to swipe away (queue 1084)" |
| 1084 g | REAL FINGER (`tap974`, `needsTouch924()` first, so NOT RUN HERE in Linux's shared page and run by the finger pass): the circle's first keyframe, read by a MutationObserver the moment `.open` lands, is radius 0 within 3 px of the finger | "a real tap on the empty project opened the add menu with no circle growing from the finger (its first clip is ‘none’) — queue 1084 clause 2" |

`TODO(first run): measure` marks the ring-vs-circle 2 px (1084 d) and the finger's 3 px (1084 g). The other numbers are the
plan's (±2 px origin) or exact (260 ms).

### Existing tests changed (expected to read DEAD in prove — they pass on both sides, by design)

The default is now the circle, so the four #981 tests about the OLD opening's rim lights run inside `grow1084(false, …)`:
- `981 the glowing lines run round the add menu's own edges as it opens, …`
- `981 asked for less motion: the empty area still opens the add menu at once, with no lights round it`
- `981 review: with less motion the add menu arrives on its plain 220 ms slide, …` (its CSS stub cannot reach the JS
  reduced-motion check, so with the setting on it would have measured a grown menu under a forced slide)
- `981 review: Enter on the empty add row while the add menu is already open does not run the lights round it again …`

The other #981 / #974 empty-area tests (the real tap, the real double-tap, tap-then-back-arrow) are left as they are and now
run the grown menu by default. Reasoned to still pass: the menu still gets `.open` in the click's task; the guard is
max(300, 260) = 300 ms; the circle is centred under the finger so a double-tap's second tap lands on the sheet; the sheet's
glass stays see-through; the shrink removes `.open` and `body.add-open` at once.

## Deliberately left alone

- The OLD path: no existing CSS rule or JS line of the slide-up/swing changed. The branches only run when `addSheet._grow`,
  `.add-grow` or `opts.grow` with the setting on say so.
- The slim add row (project with layers) — clause 3, option b, waits on his OK of D4b and its speed.
- PC/desktop: no add sheet there; `growOn()` uses the same `(max-width: 700px)` test as `FM.mobile.isPhone`.
- `FM.mobile = {...}` (line written by the Simple release v17.39) — not touched; `openAdd`/`closeAdd` were already exported.
- `menuRim`, `fxLap`, `guardArrival`, the Aurora press, the #964 outline — unchanged.

## Locks

- **Simple lock (`tools/_fu_gate.py`)**: NOT run (python is off-limits during the ship). Checked by hand: no added or
  removed line in a shared file matches any HOOK (grep -P with the gate's patterns: none), no Simple-owned file touched,
  every modified line was last written by a non-Simple commit (git blame: 3e2caee0 v15.21, 913186b6 v17.13, 06a81ba5 v17.57,
  6da7c14d v12.86, 7e104fa3 v16.87 — none touch Simple files, none say queue 980, none add hook lines), and no insertion sits
  between two Simple lines. Simple's add flow does not call `openAdd` (no match in js/simple*.js). Expected: NOT-TRIGGERED.
  Run `python3 tools/_fu_gate.py why` on the landing tree to confirm.
- **Collab schema**: untouched. `C.schemaFingerprint` hashes layer/project fixtures, fx registries, the op grammar and the
  derived view — FM.settings is not in it, and nothing here is saved in a project. No bump.

## Browser checks still owed (none were done)

1. 380 and 320 phone, real touch (his iPhone if possible): empty project, tap top-left / middle / bottom-right of the area,
   the big +, and the keyboard (Enter on the focused row) — the circle from the right point, quick, no flash at the end
   (the shadow and backdrop blur should appear with no pop when the clip drops).
2. **iOS Safari**: WAAPI `clipPath` keyframes with `circle()` — believed supported (Safari 13.1+), not seen. If it is not,
   the menu would appear un-animated; worth one look before shipping.
3. Close: Done/grab, tap-away, after adding a layer (the circle runs back to where he tapped), a swipe down (slides as #773).
4. Reduced motion on (OS setting): no circle, no ring, today's slide.
5. Light and dark Home looks (the ring colours are fixed rgba; the sheet is glass in both).
6. The switch in Settings at 380: on by default, flips, survives a relaunch; absent at a PC width.
7. Collab: as a Viewer the empty-area tap opens nothing (openAdd refuses before any grow).
8. Then the suite at 1280 and 380, prove.sh (seven CAUGHT expected, four DEAD), the finger pass for 1084 g, and the FU gate.

## The #545 picture to take

Frames of the growth mid-flight at 380, through the app (FM.renderScene probe or screenshots with the animation seeked):
t = 0, 60, 130, 200, 260 ms for a tap at the top-left, the middle and the bottom-right of the empty area, beside the
prototype's stills (`design/1084-add-anim` branch: `tools/design/1084-add-anim/stills/a-circle-reveal_open_060.png`,
`_open_120.png`, `_open_340.png`) and the 260 ms GIF. Plus the close at 40/120/200 ms.

## Unsure / for him

- **Ring colours**: the prototype's rings were teal (the accent); these use the rim lights' palette (white core, #96e8ff
  glow, a lavender trailing ring) so the "glowing lines" he asked to keep become the circle's edge. A taste call — show both
  in the #545 picture.
- **No rim lap on a grown menu**: the old lights (a lap round the menu's rectangle) do not run when it grows — the circle's
  lit edge replaces them, as in the prototype he picked. The alternative (the lap runs round the edges after the circle
  lands) is easy to add if he misses it.
- **Reduced motion**: the plan said "a plain fade" for both modes; the brief said "appears as it does today". Built as
  today (the plain slide).
- **Keyboard origin**: the big +'s centre. A scripted `click()` with no point uses it too.
- **Switch wording**: "Add menu grows from your tap" / "Off: it slides up from the bottom, as before." Phone-only row.
- The close is the circle back to the ORIGINAL tap point even after a layer was added (the empty area has gone by then) —
  the plan's "back to the point". Fine by the plan; worth a look on the phone.
