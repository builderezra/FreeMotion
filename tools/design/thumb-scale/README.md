# D6: project-card thumbnail, the old way against rendering at card size (#545 pictures)

Pictures and numbers only: **no app code was changed**, nothing here ships. Base `origin/main` (v17.24 app code). Measured by me in my container (headless Chromium 1194, software GL, so a GPU phone or Mac will differ; the ratio is the point, the milliseconds are a floor for a phone).

## The finding being pictured
`makeThumb` (`js/storage.js:2133-2160`) renders the whole project at its full size and only then halves it down to the 360 px card picture; `makeLayerThumb` (`:2210-2229`) does the same for templates and elements. It runs on every import and, through `touchCurrent`, about every 12 s of editing. **Old** = `makeThumb` exactly as it is. **New** = the same scene rendered straight into a ~360 px canvas (`renderScene` already scales by `canvas.width / P.width`, `js/compositor.js:18745-18748`), no halving loop.

## What the card shows
The Home project card draws the stored picture in `.hm-thumb`, **86 x 86 CSS px, `object-fit: cover`** (`styles.css:5305-5306`). On a 3x phone that is 258 x 258 device pixels, cropped from the 360-px picture. `card-size-3x.png` is exactly that: old on the left, new on the right, for each of the four projects, both passed through JPEG q0.8 like the stored picture. `sbs_*.png` are the whole 360-px pictures side by side (left old, right new).

## The four projects (all built in the page by the app's own functions)
| project | how it was made | card picture |
|---|---|---|
| big photo | a 4000x3000 image drawn by script (gradients, 4000 soft discs, 7-px stripes, small white text), added as a photo layer, so the project takes the photo's shape | 360x270 |
| video frame | a 1280x720 webm (VP8, recorded from an animated canvas; this container has no H.264) added as a video layer, drawn at 0.1 s | 360x203 |
| small text | a text layer, 26 px, four short lines, on a 1080x1920 project | 203x360 |
| 10 glows | one 500 px rounded square with 10 Glow effects, 1080x1920 | 203x360 |

## Timing per render (whole function including the pixel read-back; two runs each, ms)
| project | old | new | faster | pixel difference old vs new (mean / max of 255) |
|---|---|---|---|---|
| big photo | 250, 347 | 18, 6 | 14x | 1.96 / 55 |
| video frame | 51, 57 | 2, 3 | 17x | 1.44 / 93 |
| small text | 75, 103 | 5, 3 | 15x | 0.47 / 139 |
| **10 glows** | **11 883, 11 626** | **142, 139** | **82x** | **3.21 / 75** |

## Reading the pictures (what I see, not a verdict)
- **Photo, video frame, small text:** look the same at the card's size. The max differences are a few edge pixels (glyph edges: halving filter against direct sampling); the means are under 2 of 255.
- **10 glows: not the same picture.** The halo is **wider and softer** in the new one (the left halo hugs the square, the right one spreads), because a glow's radius follows the render scale and so is not the same halo at a quarter size. At 86 px it is a small change; it is the one case where "the card looks the same" is false, and it is the case that costs 12 s today.
- The photo is synthetic and the video clip is 0.1 s of a MediaRecorder file. A real 12 MP phone photo and a real H.264 frame were not tried.
- **Per-render time is a floor for a phone** (a fast desktop-class machine, software GL); the 10-glow case is 12 s here and the old way would block the editor that long every 12 s of editing.

## Rule 16 / #545
This is the "show him before and after" for the **glow** case: it is the only visible change, and it is what to decide: accept the wider halo on the card, or keep the old picture for projects whose old render is slow. Nothing else needs his eyes.

`scripts/measure.py` is the page script and driver that made the numbers and PNGs (it needs the scratch helper `cdp_eval.py`).
