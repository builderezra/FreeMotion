# #1084 prototypes: the Add menu growing out of where you tapped

Standalone plain HTML, CSS and JS. **Nothing from the app is loaded or changed.** Each page is a fake phone editor in a box that is exactly **380 x 760**, drawn with the app's own colours (panel `#161c28`, panel-2 `#1e2533`, accent `#29d9bb`, the 88%-tint glass sheet with 16 px top corners, the dashed teal Add row), so a screen recording of that box looks like the phone layout. Open the files straight from disk, no server needed.

| file | what it shows |
|---|---|
| `a-circle-reveal.html` | **(a)** the menu blooms from a circle at the exact tap point, with a bright leading ring and a fainter trailing one. Speed select: **260 ms** or **340 ms**. |
| `b-row-expands.html` | **(b), REDRAWN (D4b)**: mid-edit: the "Tap to add a layer" row IS the growing shape (an opaque panel whose top and bottom edges move outward from the row's own rectangle, the dashed border riding the edge); the menu fades in once over the last 40%; close is the same animations played backwards. Speed select: **300 ms** or **380 ms**. |
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

## GIFs for a phone (D5)

`gifs/` holds the same three prototypes as short looping GIFs, each the **380 x 760 phone box only**, with the project "with layers" and the tap on the Add row, so all three start from the same screen:

| file | what | size |
|---|---|---|
| `gifs/a-circle-reveal-260ms.gif` | (a) circle reveal, 260 ms | 0.66 MB |
| `gifs/a-circle-reveal-340ms.gif` | (a) circle reveal, 340 ms (the page's default) | 0.89 MB |
| `gifs/b-row-expands.gif` | (b) the Add row expands into the menu (340 ms) | 0.67 MB |
| `gifs/c-slide-up-today.gif` | (c) what the app does today (360 ms hinge up, 220 ms slide down) | 0.69 MB |
| `gifs/side-by-side.gif` | (a) 340 ms, (b) and (c) next to each other, in step, 1172 x 794 | 2.48 MB |

**Real speed, measured, not eyeballed.** Each frame is the prototype paused with `__proto.seek(ms)` at exact 30 ms steps (not a screen recording, so no dropped frames and no cursor), and each frame is shown for 30 ms. One loop is **2.32 s**: 90 ms closed, the open (0 to 420 ms), 600 ms held open, the close (0 to 330 ms), a 420 ms rest closed, then 400 ms extra on the last frame so the loop does not strobe. The GIF writer merges identical neighbouring frames and adds their delays (the hold is one frame of about 720 ms); I checked each file's frame delays sum to 2320 ms. All five are under 4 MB.
**What they cannot show:** 30 ms is the sampling step, so a 260 ms animation is 8 or 9 frames; a real phone draws 60 or 120 per second, so the real thing is smoother than any of these. Palette is 256 colours with dithering, so the dark gradients have faint banding that the page does not. The app's own extras are still not in these (see "What these do NOT show").
`gifs/how/record-frames.py` is the script that makes the frames (it needs the scratch helper `d4shot.py`; the GIFs were assembled from its PNGs with Pillow).


## D4b: (b) redrawn after Ezra's "the preview u sent is buggy" (he picked a for the empty project and b mid-edit)

**What was wrong in the first b, measured frame by frame in its GIF, and what the redraw does about each:**
| bug | cause I found | fix in `b-row-expands.html` |
|---|---|---|
| (1) the menu flickered: half-visible at 240 ms, gone at 270 to 300, snapping in at 330; the close did the same | the first b ran several overlapping animations (`fill: both`, a separate "skin", the contents' own opacity) and I had recorded it by seeking all of them; the contents also faded on a different curve going out and coming back | **one** set of animations, and **close = the same animation objects played backwards** (`reverse()`), so the curve is identical both ways and nothing is ever toggled; the contents fade in **once**, over the last 40%, and so fade out **first** on close |
| (2) the timeline smeared and ghosted during the stretch (the Title clip doubled at about 180 ms) | the sheet had `backdrop-filter: blur(14px)` and an 88% translucent fill **while moving**, so a blurred, see-through panel slid over live content | **no blur and no translucency while it moves**: the panel is an opaque colour (`#0c1c25`), the dim behind is a plain `rgba(2,6,10,.55)` scrim. (The app's real sheet is glass at rest; if that look is wanted once settled, crossfade to it after the stretch, not during.) |
| (3) the row faded out by about 150 ms, so nothing linked it to the menu | the row was a separate thing that disappeared while a different thing appeared | **the row itself is the growing shape**: the panel starts exactly on the row's rectangle, in the row's own colour (computed from the row's tint over the timeline), and its top and bottom edges move outward (`clip-path: inset(rowTop 10px rowBottom 10px) to inset(0)`), with the row's dashed teal border and glow riding the moving edge (an element animated through the same numbers, handing over to the panel's hairline); the row's own plus and words live inside the growing panel and fade over the first 35% |
| (4) contents opacity | see (1) | see (1) |
| (5) recording merged frames | PIL merges identical neighbouring frames | **ffmpeg**, no merging: every GIF frame is 30 ms (57 frames at 300 ms, 63 at 380 ms, checked: all delays 30), plus 60 fps video and 4x slow motion |

**Files (`gifs/b-redrawn/`)**: `b-row-expands-300ms.gif` (0.64 MB) and `-380ms.gif` (0.84 MB), every frame 30 ms; `-60fps.mp4` and `.webm` at 300 and 380 ms (103 and 113 frames at 60 fps); `-slow4x.mp4` at 300 and 380 ms (sampled every 1/240 s and played at 60 fps, so it is true 4x slow motion, 411 and 449 frames). The superseded first b GIF and the side-by-side that contained it are in `gifs/superseded/`; the a and c GIFs are unchanged (a needs no rework).

**How the frames were made, and one trap worth knowing:** the page has `__proto.frame('open'|'close', ms)`, a pure function of time. A first recording looked like the old bug (menu missing until the very end, the panel see-through) and it was **not** the animation: a headless screenshot taken right after a seek showed the previous frame's compositor-thread opacity. So `frame()` now builds the animations, pauses them at the asked time, copies their computed values to inline styles and cancels them, and the recorder accepts a frame only when two screenshots in a row are byte-identical.

**Checked frame by frame** (contact sheets of every 30 ms frame of the open and of the close at 300 ms, looked at by me): the panel grows monotonically from the row, the dashed edge rides it, the timeline behind is dimmed and then covered, never doubled; the menu fades in from about 180 ms and is complete at the end; the close is the exact reverse (contents out first, then the panel shrinks back onto the row, the row's words return, the row is the same colour as the real one, so the hand-over at the end does not show). Numerically, on the 60 fps frames the menu-region brightness never moves more than **2.0 of 35 levels between two consecutive frames** (the old b jumped by whole menu-fades); it is not strictly monotone because the panel colour is also fading. The real-time path (`open`, `close`, a double close, reduced motion) was driven in a browser and ends hidden with the contents restored.
**Not done:** not shown on a phone, and the 30 ms GIF is a sampling of a 60/120 Hz animation, so the real thing is smoother than the GIF. The finger dot is not in these recordings.
