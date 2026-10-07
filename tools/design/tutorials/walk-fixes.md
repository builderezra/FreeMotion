# T8: walk findings applied to the tutorials

Branch `tutorials-drafts`. Source of every change: my T6 (`walk-01-10.md`) and T7 (`walk-11-20.md`) walks on `tutorials-walk`. Only the 13 steps below were reworded. Each was then **re-walked in the real app at 380 px (main v17.25), doing exactly what the new text says**, with one screenshot per changed step in `walk-fixes-shots/`. Same limits as T6/T7: real touch for taps, drags and holds; the mouse wheel stood in for a swipe on a scrolling panel (native touch scrolling does not move anything in this headless browser); the phone's colour picker cannot be driven here, so the hex box beside it was typed into.

## Changed steps

| tutorial / step | what changed | re-walk result | shot |
|---|---|---|---|
| 02 step 6 | Added "first slide the timeline until the end you want is on screen". | After a split at 2.03 s the right piece's end handle was at the screen edge; with the timeline slid it could be held (0.7 s) and dragged: piece length 3.97 s to 3.67 s. | `02-step6` |
| 03 step 6 | Says Light Glow opens and the Drop Shadow row closes. | Both effects added, Drop Shadow open; tapping Light Glow opened it and closed Drop Shadow. | `03-step6` |
| 03 step 7 | Says swipe the panel up to reach Threshold softness. | It sits below the fold at first; after one scroll it is visible and typing 60 in its number set it to 60. | `03-step7`, `03-step7-typed` |
| 03 step 8 | Says keep scrolling to Glow past the edges. | Needs a further scroll; tapping **On** turned it on (`outside` 0 to 1). | `03-step8`, `03-step8-on` |
| 03 step 9 | Says tap the Drop Shadow row to open it, scroll to the bottom. | Row opened, Light Glow closed; the Shadow colour is at the bottom. Typed a light hex in the box beside it (the phone picker was not driven). | `03-step9`, `03-step9-colour` |
| 06 step 4 | "a sound-wave bar" became "an orange bar with the song's name". | The song arrives as an orange bar named after the file, selected, only its row shown. | `06-step4` |
| 06 step 8 | Added that the timeline keeps gliding, so swipe in small steps and check the counter. | Three 130 px swipes overshot to 8 s (the song's end); a swipe back landed on 6.03 s, then tapping the song and the right-hand button cut it to 6.03 s. | `06-step8` |
| 08 steps 7, 8 | Added "scroll the panel down". | Both tick boxes are below the fold; after scrolling, ticking each set `frameBlend` and `reversed`. | `08-step7`, `08-step8` |
| 13 step 5 | The eraser does not remove a whole stroke. New text: it rubs out only what your finger passes over. | Two strokes drawn; a short drag across the middle of one made it two pieces (strokes 2 to 4); a drag across both cut them again. | `13-step5` |
| 17 step 7 | Added the confirmation box. | Stop sharing on the card opens a box with Cancel and **Stop sharing**; confirming gave the toast "Sharing stopped". | `17-step7-confirm-box`, `17-step7-after` |
| 18 step 1 | Says the Templates tab is empty on a fresh install, so do step 5 first. | A fresh profile shows "No templates yet. Tap + to save a project as one, or use a project's ⋯ menu." | `18-step1` |

## Marked, not changed

Each of these now carries `<!-- not walked: why -->` on its line:
- **01 steps 11 and 12, 09 step 9** (MP4 export): the tab froze in this container (no H.264 encoder). Not known whether a phone does.
- **17 steps 5 and 6**: need a second device on a real network.
- **Every "On a computer:" paragraph (20 files)**: the walks were the 380 px phone layout only.

## Honest caveats
- 03 step 9 still says "your phone's own colour picker opens". I could not open it here, so that sentence is untested; only the hex box was.
- 06 step 4 says the song appears "below the add row". With a layer selected the add row is hidden, so this was only checked as "orange bar, named, selected".
