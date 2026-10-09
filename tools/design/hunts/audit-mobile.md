# AU7: audit of js/mobile.js on main v17.31 (456 lines, the phone sheets)

Against `origin/main` 7125ecff. Branch `hunt/audit-mobile`. **Measured** = I ran it here (headless Chromium at 1280 and 380), **Read** = I read the code, **Guess** = I did not check.

## What this container cannot run (said first)

**A real finger.** The driver has no touch emulation on Linux (`__fmDriverCaps.touchEmulation` is false, and the runner refuses a touch batch it cannot emulate), so **no repro here was run with a real finger**. Each one is therefore written in two halves:

- `AU7-n touch` and `AU7-n mouse` drive the SAME handler (`makeSwipeDown`) with pointer events sent from script, once as a touch-type pointer and once as a mouse. **These run here and are what "red on main" below means.** A scripted touch-type event is not a finger: it skips the browser's own scroll takeover, its `pointercancel`, and the coalescing and timing of real touch moves.
- `AU7-1f` is the real-finger version through the driver's trusted touch (`realInput924`). **It reports NOT RUN HERE in this container** (measured: "NOT RUN HERE 1" in the summary at both widths) and will run on the laptop's finger pass. It is the only one that proves the claim on a phone.

So everything below says what the handler does with those events (**Measured**) and separately how likely a real thumb is to produce them (**Guess**).

## Fixed: red on main at 1280 and 380 (touch-type and mouse), green with the fix

| # | Where | What happens | Repro test | Fix |
|---|---|---|---|---|
| AU7-1 | `makeSwipeDown.settle` (`mobile.js`), the inspector sheet and the Add sheet | **A drag that stops before the lift can still count as a flick and close the sheet.** The close rule is "past a third of the height, OR a fast flick (`vy > 0.5`)". `vy` is only ever updated by a pointer MOVE, so a quick drag followed by a rest and a lift kept the speed of its last move. Measured: a 48 px drag (12 percent of the sheet), 8 ms between its last two moves, 600 ms resting, then the lift: the sheet closed ("the speed of the last move, 4 px/ms, was read as a flick"). The same distance dragged slowly stays open, and a genuine flick (lifted straight after the last move) still closes it; both are controls in the test. | `AU7-1 touch`, `AU7-1 mouse`, `AU7-1f` (finger, NOT RUN HERE) | the speed counts only if the lift comes within 80 ms of the last move (`e.timeStamp - lastT > 80` zeroes it) |
| AU7-2 | `makeSwipeDown.onDown` | **A press that never gets its lift freezes every later swipe for the life of the page.** `if (active) return` is the guard against a second finger, and `settle()` ignores any pointer that is not the one that started the gesture, so if a press ends without a `pointerup` or `pointercancel` reaching the page, `active` stays true and every later swipe on that sheet is ignored: the sheet then closes only from its button. Measured: after a press that was never lifted, a clean swipe past a third did NOT close the sheet. | `AU7-2 touch`, `AU7-2 mouse` (controls: an ordinary swipe closes; a second finger put down moments after the first is still ignored) | an unclaimed press more than 2 s old that is still `active` is dropped when a different pointer goes down (a claimed drag is never taken over) |

**How likely a real thumb is to cause these (Guess, said plainly).** AU7-1: a finger resting on a screen still produces small moves, whose own speed is low, so the stale speed is most likely with a mouse or a pen on a narrow window, and only occasionally with a thumb. AU7-2 needs the OS to take a touch without telling the page (a system gesture, a call): the spec says that gives a `pointercancel`, so it is a hardening against browsers that do not, which I cannot show on a phone from here. The 80 ms and 2 s are my numbers, easy to retune. Both fixes are small and neither changes a swipe that already worked; if you would rather not carry two guesses, AU7-1 is the one with the clearer logic and AU7-2 the more speculative.

Mutations: **not run for AU7** (the mutation tool's output was not available for this branch in the time left; the red-on-main runs above are the proof I have). Busters bumped: `mobile.js?v=47`.

`audit-mobile-scripts/`: `au7-tests.js` (append before `async function run()`; `?only=AU7`), `au7-fixes.patch`.

## Measured and fine (no change)

At 380 with the real app: selecting a layer opens the sheet; the grab button closes it; selecting the SAME layer again leaves it closed (by design: `userClosed` latches per selection); selecting another opens it; deselecting closes it; undo keeps it; a multi-selection opens the multi sheet; adding a layer while it was closed opens it.

## Read, not run (no claim stronger than that)

- The Add sheet is built with `makeSwipeDown(addSheet, addGrab, closeAdd, null)`: with no scroll element, `atTop()` is always true, so a press anywhere in the sheet's body can arm the dismiss, including inside a list that is scrolled down. With the default empty project nothing inside the sheet scrolls (measured: no scroller taller than its box at any tab), so I could not show it; with many media items the Media tab might. On a real finger the browser's own scroll would normally take the gesture away first (`pointercancel`, which snaps back), so the visible effect would be a small flicker, not a wrong close. **Guess**, worth a finger look on the laptop with a long Media tab.
- `closeAdd` is also passed as `onAfterAdd` / `onClose` to the Add menu and is called with whatever those pass; `+fromY || 0` turns anything that is not a number into 0, so it is safe, only odd.

## What I read, and how closely

Line by line: the whole file (456 lines): `syncSheet`, `makeSwipeDown`, `dockSheet`, the top-bar handlers, `openAdd`, `closeAdd`, the resize handlers. **Not read:** the CSS that the sheet classes drive (`styles.css`), and the code in `timeline.js` that stamps `FM._sheetSuppressFor`.
