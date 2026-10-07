# H17 / #1097: real-finger tests on Linux

Base: `origin/release/v17.24` ca8eb537 (where `tests/_platform.py` lives; main b46b47d3 has no such file). Container: Chromium 141 headless, software GL.
Patch: `tools/design/hunts/1097-linux-touch.patch` (3 files, +74/-5; applies to ca8eb537; **not applied anywhere**).

## Answer
**Lead 2 works: give each finger test a page of its own.** Measured: **84 of 88 pass at 1280 and 84 of 88 at 380**; the other 4 are one
group that fails identically under every lead (below). Lead 1 cannot work. Lead 3 passes the same 84, but it is the wrong thing to pass with.

## The mechanism, re-measured (Measured, `h17/e1.py`, `e2.py`)
Media state `hover / pointer / any-pointer / maxTouchPoints`, same page, in order:
| step | state |
|---|---|
| launch with the `--blink-settings` flags | hover / fine / fine / 0 |
| `setTouchEmulationEnabled(true, 5)` | none / coarse / coarse / 5 (the phone's state) |
| `setTouchEmulationEnabled(false)` | **none / none / none / 0** (no mouse) |
| + `Emulation.setEmulatedMedia` hover/any-hover/pointer/any-pointer | unchanged |
| + `setDeviceMetricsOverride` desktop, `clearDeviceMetricsOverride`, `setEmitTouchEventsForMouse` on and off | unchanged |
| + iframe navigation, + `location.reload()` | unchanged |
| a NEW tab in the same browser, before or after the wipe | hover / fine / fine (the loss is per page) |
Closing the wiped tab leaves the other tab untouched. The wipe happens even with no ON before it.

## Lead 1 (emulation ON for the test, re-apply media after): DOES NOT WORK
`setEmulatedMedia` ignores hover and pointer here (row 4 above), so nothing restores the mouse. Also the finger test itself passes
(14/14 in the slice below), so the harm is only what follows, next section.

## Lead 2 (a page per finger test): WORKS
Mode `FM_TOUCH_MODE=lead2` in the patch, and `tests/_touch_pass.py`, which reads the NOT RUN list of a full pass and runs each finger test in
a fresh browser (4 to 30 s each, about 14 minutes for all 88). In lead2 mode the driver sends real emulation (phone media state, as on
the Mac), drops the "no mouse" refusal, and **refuses a second finger test on the same page** (NOT RUN, with the reason) so a wiped page
cannot give a wrong verdict. Default behaviour with no env var is unchanged (checked: slice 54-56 default gives the same NOT RUN as before).
- 1280: 83 pass of 88 on the first sweep, 84 after rerunning alone (see Spin).
- 380: 84 of 88 on the sweep.
- Reds, both widths: 4 tests, all item 690 "keyframe diamond hold" (listed below).
- One more red on the first 1280 sweep, `690 a Spin added at the start of its clip is not told it changes nothing`: **passes alone** (12 s), so it was
  load, I ran 380 beside 1280 in parallel. (It is the effect "changes nothing" check, the same family as the `queue 477` red in H13.)

### The 4 reds (identical at 1280 and 380, identical under lead 2 and lead 3, so not a lead problem)
`a trembling hold on a keyframe diamond`, `the Position keyframe diamond is one diamond`, `an easing picked on the first keyframe diamond`,
`a colour keyframe is live while Colouring is open`. All fail their CONTROL: a still 0.65 s hold on a diamond "did not open its menu".
Measured with a scratch event log (not in the patch): the easing menu **does** open at the pointerup (`js/timeline.js:5590`), then is hidden
**at +7 ms** by `FM.contextMenu.hide` from the menu's `focusout` handler (`js/contextmenu.js:86-89`, stack line 88), right after a compat
`mousedown/mouseup/click` lands on the diamond (@916 mousedown, HIDE@917) following the `touchend`. So Chrome here turns a 650 ms emulated hold into a
tap-style compat mouse sequence, and the mousedown moves focus off the menu. Whether the Mac does the same and the guard (`insidePointerUntil`) saves it
there, or Chrome never sends compat mouse events after a long press on a real phone, I **cannot tell from here** (Guess: a harness difference, since the
suite is green on the Mac). One person with a Mac can settle it by running these 4 with the same log; do not call it an app bug on this evidence.

## What follows a finger test in the SAME page (Measured; the PM asked for this)
Slice of tests 54 to 300 of the slice-4 order (247 tests, both finger and mouse tests), one page, lead 2 with the mouse gate off, against the
H13 baseline for the same tests (same container, same MP4 scratch patch):
- 177 non-finger tests compared; **1 differs**: `927 PC - a real mouse on the Notes corner: resize cursor ...` FAILS ("the edges beside the corner
  do not show the edge resize cursors (auto / auto)"). Run alone with no finger test it passes (1/1). That is the lost mouse showing, in exactly the
  kind of test the driver's mouse gate exists to protect. The other 176 mouse tests are not hover-gated and passed regardless.
- So sharing a page is NOT safe, and the number is small only because few tests read hover/pointer. Lead 2's one-page-per-finger-test removes it.
- A 14-test slice (54 to 67) with lead 1 and with lead 2 passed 14/14 each, which shows how little that slice says about the mouse.
- Note: the first attempt at this slice hung for 40 minutes. Cause: the three real-MP4-export tests, which hang this container. The H13 scratch
  patch (those 3 tests set to NOT RUN) was missing in this worktree; with it, three chunks of the slice finished in minutes. Disclosed: this scratch
  patch is in none of the deliverables.

## Lead 3 (touch without emulation, plus an in-page shim): same 84 pass, but do not use it
- Passes the same 84 at both widths and the same 4 reds.
- **A JS shim cannot give the phone's state to CSS** (Measured, `h17/css.html`): a box with `@media (pointer: coarse){width:44px}` `@media (hover: none){height:48px}`:
  mouse 20x20; lead 3 with `maxTouchPoints`, `ontouchstart` and `matchMedia` all overridden: JS says coarse, **box stays 20x20**; real emulation: **44x48**.
  styles.css has such blocks (the PM's own list in `_platform.py` says the same), so lead 3 runs a finger against the mouse layout.
- The uncomfortable part: lead 3 and lead 2 give the **same verdicts on all 88 today**. So none of these 88 tests would catch a phone-only CSS
  regression that lead 3 hides, or I could not find one. That is a statement about the tests, and it is why the PM's reason for refusing lead 3
  holds only on principle. Lead 2 costs nothing extra, so there is no reason to take the weaker option.

## What the patch changes
- `tests/_platform.py`: `TOUCH_MODE` from `FM_TOUCH_MODE` (Linux only); `REAL_TOUCH_VIA_EMULATION` true for lead1/lead2.
- `tests/_cdp.py`: lead3 sends touch without emulation; lead1 re-applies media; lead1/lead2 skip the "no mouse" gate; lead2 refuses a 2nd finger test per page.
  (Lead 1 and 3 are experiment modes; delete them if lead 2 is adopted.)
- `tests/_touch_pass.py`: the per-test runner. Proven on 2 tests (pass); the full 88 were run with my equivalent script, not with this file.

## What I did not do
- **No mutation proof** that these 84 are discriminating. Each asserts a trusted `pointerType: touch` down on the right element (the harness checks it), but I did
  not break the app and watch them go red.
- **Not wired into ship.sh.** A full pass still reports the 88 NOT RUN and, per the PM's rule, a NOT RUN refuses a Mac ship only on the Mac. Using this on
  Linux means running `_touch_pass.py` after the full pass and counting its result. That wiring is the laptop's call.
- No Mac run, so "same as the Mac" is the intent of lead 2 (real emulation) and not a measurement.

Scripts and raw results: scratchpad `h17/` (not committed): `runtouch.py`, `slice.py`, `res_l2_*.json`, `res_l3_*.json`, `e1.py`, `e2.py`, `css.html`.
