# #1084 prototypes: the Add menu growing out of where you tapped

Standalone plain HTML, CSS and JS. **Nothing from the app is loaded or changed.** Each page is a fake phone editor in a box that is exactly **380 x 760**, drawn with the app's own colours (panel `#161c28`, panel-2 `#1e2533`, accent `#29d9bb`, the 88%-tint glass sheet with 16 px top corners, the dashed teal Add row), so a screen recording of that box looks like the phone layout. Open the files straight from disk, no server needed.

| file | what it shows |
|---|---|
| `a-circle-reveal.html` | **(a)** the menu blooms from a circle at the exact tap point, with a bright leading ring and a fainter trailing one. Speed select: **260 ms** or **340 ms**. |
| `b-row-expands.html` | **(b)** mid-edit: the "Tap to add a layer" row stretches up and down until it is the menu; its words fade out, the menu's contents fade in over the last 40%. |
| `c-slide-up.html` | **(c)** what the app does today, for comparison (see below). |
| `compare.html` | all three side by side in one page; one button taps all three at the same spot. |

## How to record it

Under each phone is a small panel (outside the 380 box, so a crop of the phone is clean):
- **Tap top-left / centre / bottom-right** make a tap with a visible finger dot. **Auto loop** open, hold, close, next spot, forever.
- **Project: empty / with layers** switches the timeline between the big "Tap here to start creating" area and the three-layer timeline with the Add row. (a) and (c) work in both. (b) needs layers, so it switches by itself.
- **Slow-mo x4** for the slow clip. **Reduced motion** shows the fallback without touching the OS setting. **Dim behind** is a design choice: the app does not dim today, so it is off for (c) and on for (a) and (b); tick it on (c) to compare like with like.
- You can also tap anywhere yourself. Close with Done, the dimmed area, Esc, or the Close button.
- URL options for a ready-made state: `?state=empty|layers`, `&dur=260|340`, `&slow=1`, `&rm=1`.

## What each one does, exactly

| | open | close |
|---|---|---|
| **(a)** | `clip-path: circle(0 at tap)` to a circle that just covers the farthest corner, 260 or 340 ms, ease-out `cubic-bezier(.3,.55,.3,1)`. Contents fade in from 30%. Two rings ride the edge. | the same circle back to the same point, at 80% of the time, ease-in. Contents are gone by 40%. |
| **(b)** | `clip-path: inset(...)` from the Add row's exact box (rounded 10 px, tinted like the row) to the full sheet (16 px top corners). Row skin fades out over the first 40%, contents fade in from 60%. | the same inset back onto the row's box; the row skin fades back in for the last 40%. |
| **(c)** | `fm-hinge-up`: 360 ms, `cubic-bezier(.18,.85,.28,1.02)`, `perspective(1400px) translateY(100%) rotateX(-58deg)` to flat, opacity in by 55%. | the plain 0.22 s `ease` slide down. |
| **reduced motion** | (a) and (b): a plain 160 ms fade. (c): the plain 0.22 s slide, as the app does. | a 120 ms fade ((c): the slide). |

(c) copies the values from `styles.css:9954-9959` (the hinge) and `:4807` (the base `transform .22s ease` slide) and `:4810` (the open state), and its reduced-motion fallback from `:9976`. I did not run the real app to compare them side by side.

**The arriving sheet takes no taps.** While any sheet is arriving its contents ignore touches and the dimmed area ignores taps, as the app's `.is-arriving` guard does (`styles.css:8876`). I tested that an early tap does nothing and a tap after arrival closes.

## How I checked these (Verified)

Headless Chromium at 380 wide, frames paused at 0, 60, 120, 200 and 340 ms (a hook, `__proto.seek(ms)`, pauses every running animation at a given time), and the close at 40, 120 and 200 ms. The stills I looked at are in `stills/`. No script errors on any page in any mode, including reduced motion and slow-mo.

## What these do NOT show (so nobody is surprised)

- **The app's own extras are not in here:** the white lights that run round the sheet's rim as it opens (`js/timeline.js:3296-3380`, "the lights go round it", #981), the Add-row press pulse (`@keyframes tl-addpulse`, `styles.css:9848`) and the empty-start orb. Clause 4 of his request is exactly about how those hand over to a new reveal. The prototypes only show the reveal. In (a) the two rings play the part of the rim lights; whether the real lights should become the leading edge is the open design question.
- **No Settings toggle.** The toggle that switches back to the old slide-up belongs to the app (`js/settings.js`), not a prototype.
- **No real touch.** The demo finger is a dot; the real tap point comes from the click event.
- **Timing is by eye in a desktop browser.** A 260 ms circle that looks fine here has not been felt on a phone.

## My pick, as a recommendation only (he decides)

- **(a) at 260 ms** for the empty project: he said "fairly quick". 340 ms reads smoother but the bloom is mostly over by 150 ms either way, because the circle covers a phone-sized sheet fast.
- **(b)** at 340 ms: it travels farther in both directions and the contents need the extra time to fade in.
