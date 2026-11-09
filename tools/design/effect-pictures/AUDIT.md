# FreeMotion effect tiles: truth audit

All 60 tiles compared with the real renderer (truth.html, 1080 project), defaults first, then other settings where a default did not settle it.

**Result: 13 keep, 47 redraw.**

| | Count |
|---|---|
| Grade: true | 27 |
| Grade: exaggerated | 18 |
| Grade: misleading | 15 |
| Childish subject | 37 (5 kept: Time Echo, Tilt Shift, Halftone, Twirl, Mirror Tile) |

Why so many redraws when he said most are good: 27 tiles are honest about the effect, but 21 of those 27 are redrawn or kept only inside the childish allowance. His second note (less childish) is what moves the number, more than the truth problems do.

## Kept (13)

Bolts, Luma Key, Tilt Shift, Time Echo, Halftone, Twirl, Kaleidoscope, Swing, Ring Array, Mirror Tile, Spherize, Word Highlight, Dissolve.

Small fixes worth making on kept tiles, none needing a redraw:
- **Word Highlight:** drop the dimming of unsaid words and the stray shrinking pill near t=2.7. The real effect does neither.
- **Ring Array:** drop the inner yellow ring. One effect on one petal makes one ring.
- **Kaleidoscope:** a thin white seam shows around t=0.9 and t=4.5.
- **Bolts:** most frames between strikes are nearly empty, so it reads dark at 80 px. The real effect holds 3 bolts on screen by default.

## All 60

| Tile | Section | Grade | Childish | Action | What the effect really does | Why |
|---|---|---|---|---|---|---|
| tealorange | Colouring | exaggerated | no | **redraw** | Pushes shadows to teal and warm tones to orange; a modest change on a real photo even at Amount 1. | Grey to vivid sunset with a rim light on the jacket is far more than the grade does. |
| vignette | Colouring | exaggerated | yes | **redraw** | Darkens the frame edges gently; a tight black circle needs Amount 1 and Size 0. | Tile lives at the maximum and adds a blue ring the effect never makes. Sunflower is in the centred-prop cluster. |
| duotone | Colouring | misleading | yes | **redraw** | Maps a photo's darks to one colour and lights to another; static unless keyframed. | Named by him. A recoloured cartoon skater with swapped palettes, not a tone map. |
| lightleak | Colouring | exaggerated | yes | **redraw** | A soft orange wash from a corner that drifts. | The hard diagonal beam and rainbow band do not exist in the effect. |
| huecycle | Colouring | true | no | **redraw** | Rotates every hue in the frame round the wheel, background included. | Honest, but centred prop on dark with halo, and he asked for his photos on colour effects. |
| invert | Colouring | true | yes | **redraw** | Flips every colour to its opposite. | Panda. |
| chromakey | Keying | true | yes | **redraw** | Removes a chosen colour so the layer below shows. | Honest, but a smiling cartoon man. |
| wipe | Keying | true | no | **redraw** | A straight edge reveals the layer below, with optional softness and border. | Honest, but one of the synthwave scenes. |
| radialwipe | Keying | true | yes | **redraw** | A clock sweep reveals the layer below; Border draws the hand line for real. | Cartoon sun and moon with sparkle stars. |
| blinds | Keying | misleading | yes | **redraw** | Punches flat see-through strips in the layer; over nothing they read as black lines. | Named by him. Shaded 3D slats do not exist in the effect. See upgrade 1. |
| lumakey | Keying | true | no | keep | Removes pixels by brightness or darkness; Removes: Bright takes the sky out first. | Accurate, and not childish. |
| zoomblur | Blur | exaggerated | yes | **redraw** | Radial blur toward a centre; strong and good on a real photo. | Adds white headlight glare the blur cannot create. Cartoon car when his real cars look better. |
| motionblur | Blur | exaggerated | yes | **redraw** | Fixed smear along an angle, capped at 60 px (about 5.5% of a 1080 frame). | By eye the tile smears two to three times the cap. Cartoon racer. See upgrade 5. |
| lensblur | Blur | misleading | no | **redraw** | Defocus capped at 30 px radius; on dusk and city, Radius 30 with Bloom 300 showed no separate discs. | By eye the tile's bokeh discs are about 15% of the frame; the real limit is about 5.5% and they barely appear. See upgrade 4. |
| tiltshift | Blur | true | yes | keep | Keeps a band sharp, blurs either side, with optional colour Pop. | Childish allowance: the miniature town is the effect's own idea. |
| spinblur | Blur | true | yes | **redraw** | Rotational blur round a centre. | Prize wheel. |
| censor | Blur | true | yes | **redraw** | Pixelates, blurs or bars a box, keyframed to follow. | Honest, but a cartoon avatar; his plate is the real use. |
| vhstape | Stylize | misleading | no | **redraw** | Colour bleed, line wobble and a tracking band; subtle at default. | PLAY and SP timecode are burned in, and the effect prints neither. Synthwave scene. |
| glitch | Stylize | true | yes | **redraw** | Tears the picture into shifted bands with RGB split. | Honest, but a neon cat logo. |
| crt | Stylize | misleading | yes | **redraw** | Scanlines, shadow mask and curvature over the picture. | No wooden TV, test card, or power-on line exists. See upgrade 9. |
| filmgrain | Stylize | misleading | no | **redraw** | Adds grain only. | Scratches, dust and flicker belong to the separate Film Damage effect. |
| pixelsort | Stylize | exaggerated | no | **redraw** | Sorts runs of pixels; barely visible at default, blocky vertical streaks at high Density and Length. | Clean liquid columns from a perfect sun flatter it. Synthwave scene. |
| oilpaint | Stylize | misleading | yes | **redraw** | A static smoothing filter, radius 8 at most, gently painterly. | No brush, no stroke-by-stroke build, no thick plasticine. See upgrade 7. |
| sketch | Drawing / Edge | exaggerated | yes | **redraw** | Thin grey outlines on near-white. | Heavy black lines, roof hatching and a pencil prop oversell it. Child's house and sun. |
| halftone | Drawing / Edge | true | yes | keep | Rebuilds the picture in dots: Mono, Colour dots or CMYK. | Childish allowance: matches Print: Colour dots, and reads at 80 px. |
| electricedges | Drawing / Edge | exaggerated | yes | **redraw** | Glowing moving edge lines over a dimmed picture. | Jagged arcs leaving the outline are not made. Robot. |
| crosshatch | Drawing / Edge | true | yes | **redraw** | Crossed pen strokes, denser where darker, over the picture or on paper. | Honest, but a clip-art apple, and the allowance is used. |
| stroke | Drawing / Edge | true | yes | **redraw** | An outline round the layer's alpha shape; needs a cut-out, and two rings need two Strokes. | Frog sticker. |
| shockwave | Warping | exaggerated | no | **redraw** | One ring that refracts the picture, with a rim and chroma. | Central flash and corner sparks are extra. Neon grid cluster. |
| twirl | Warping | true | yes | keep | Spirals the picture round a centre. | Childish allowance: the clearest demonstration in the set. |
| ripple | Warping | exaggerated | yes | **redraw** | Concentric waves bend the whole frame strongly, many rings at once. | Draws white rings the effect does not, and bends far less than it does. Koi. |
| kaleidoscope | Warping | true | no | keep | Mirrors one wedge round a centre; Phase and Flow turn it. | Accurate. |
| fisheye | Warping | exaggerated | yes | **redraw** | Barrel distortion of the full rectangle. | Gold peephole and round crop are not produced. Cartoon street and taxi. |
| lensmag | Warping | exaggerated | yes | **redraw** | A plain lens with thin rim and soft shadow, magnifying what is under it. | Gold frame and handle are not produced. Treasure map. |
| shake | Shakes / Movement | true | yes | **redraw** | Jolts the whole layer with twist, zoom and optional smear. | Glossy alarm clock, centred-prop cluster. |
| swing | Shakes / Movement | true | no | keep | Rocks the layer from a pivot like a pendulum. | Accurate, adult subject. |
| spin | Shakes / Movement | exaggerated | yes | **redraw** | Rotates the layer rigidly at a constant speed, no blur. | Wind-up, blur and slowdown are not in the effect. Pinwheel. |
| pulse | Shakes / Movement | true | yes | **redraw** | Scales the layer in and out; Wave: Heartbeat is a real option. | Honest, but a glossy heart sticker. |
| orbit | Shakes / Movement | misleading | yes | **redraw** | Carries one layer round a circle without turning it. | Three moons passing behind a planet needs layers and depth order Orbit does not do. Cartoon planet. |
| timeecho | Repetition | true | yes | keep | Fading copies trail a moving layer. | Childish allowance: a plain, correct demonstration. |
| gridrepeat | Repetition | true | yes | **redraw** | Repeats the layer in a grid. | Cartoon cat. |
| radialrepeat | Repetition | exaggerated | no | keep | Repeats the layer in a ring of wedges. | Inner ring needs a second layer, which he would not notice; remove it anyway. |
| mirrortile | Repetition | true | yes | keep | Tiles the frame with alternating mirrored copies. | Childish allowance: shows the mirroring exactly. |
| scatterarray | Repetition | true | yes | **redraw** | Scatters varied copies round the layer. | Second donut; the allowance goes to Halftone's. |
| bolts | Generative | true | no | keep | Draws forking bolts that re-strike. | Accurate, if anything undersold. |
| particles | Generative | exaggerated | yes | **redraw** | Emits small dots from a point; sparse at default, a thin fountain at maximum rate. | Dense fine sparks and a white-hot core only near maximum. Toy firework cone. |
| weather | Generative | misleading | yes | **redraw** | Falling flakes or streaks over the picture. | Snow piling on a roof and washing off cannot happen. Cartoon cabin. |
| starfield | Generative | misleading | yes | **redraw** | Square star dots; Fly-through moves them outward. | Hyperspace lines are impossible, as rendered at Fly-through 3 and 5. Cartoon spaceship. See upgrade 3. |
| lensflare | Generative | exaggerated | no | **redraw** | Star, halo, streak and soft round ghosts. | Coloured hexagon ghosts do not exist; real ghosts are pale circles. See upgrade 8. |
| audiospectrum | Generative | true | no | **redraw** | Bars, line or a circle of bars driven by the soundtrack. | Honest (Style: Circle), but the centred-prop halo recipe. |
| cube | 3D | misleading | yes | **redraw** | Wraps the same layer on every face. | Six different faces cannot happen. See upgrade 11. |
| pagecurl | 3D | true | yes | **redraw** | Peels a corner, showing mirror, colour or nothing on the back. | Picture-book art: balloon, sailboat, moon. |
| sphere3d | 3D | true | no | keep | Wraps the layer on a sphere that can spin. | Accurate; the glow around it is backdrop. |
| fliplayer | 3D | misleading | no | **redraw** | Turns the layer over; back is Mirror, Solid colour or Transparent. | A patterned card back on a different design cannot appear. See upgrade 10. |
| counter | Text | misleading | no | **redraw** | Plain numerals count up in the layer's font. | Reels, cylinders and a gold frame do not exist. See upgrade 6. |
| textrandomizer | Text | exaggerated | no | **redraw** | Letters scramble and settle on one line. | Neon glow and extra columns of letters are added. Neon cluster. |
| wordhighlight | Text | exaggerated | no | keep | Colours, boxes, underlines or scales each word in turn. | Box Behind is real and dark text on yellow works; the dimming is a small fix. |
| dissolve | Opacity / Visibility | true | no | keep | Holes eat the layer; From the left with Burn edge gives this exactly. | Accurate. |
| flicker | Opacity / Visibility | misleading | no | **redraw** | Flickers the whole layer's opacity. | One letter or tube at a time, with the border staying lit, cannot happen. Neon cluster. |
| dispersion | Opacity / Visibility | misleading | no | **redraw** | Perforates the whole frame at once with speckled holes, even at Softness 0.05. | No clean front and no dust plume leaving a solid half. See upgrade 2. |

## Proposed effect upgrades (for the builder, nothing built here)

| # | Effect | What to change | Where in js/compositor.js | Size |
|---|---|---|---|---|
| 1 | Venetian Blinds | Add a Look option (Holes, Solid slats). Solid paints each closed strip in a Slat colour with a shading gradient across it, so opening reads as slats tilting, and a picture really shows between them. Default stays Holes, so no saved project moves. The kernel only writes alpha today and skips pixels with alpha 0, so Solid needs an RGB write. | Row 27659; `PIXEL_FX.blinds` 27671 | M |
| 2 | Dispersion | Add a Sweep (Off, From left, right, top, bottom) that biases the noise threshold by position, so a real front crosses the layer and leaves it solid on one side. Off stays as it is now. | Row 2403; kernel 8546 | M |
| 3 | Starfield | Add Streak to Fly-through: draw each star as a radial line whose length grows with speed. Gives real hyperspace. | Row 824; `starfieldMoving` 7810 | S |
| 4 | Lens Blur | Raise the Radius cap from 30 px to about 120 and confirm Bloom produces visible discs on a night photo. Watch the cost on a phone. | Row 630; kernel near 10155 | S |
| 5 | Directional Blur | Raise the Distance cap from 60 px to about 400; a real speed smear needs it. | Row 954; kernel 20666 | S |
| 6 | Number Roll | Add Style: Plain, Rolling digits, where each digit slides vertically like an odometer. Text effects currently only change the string, so this needs a per-digit clip path. | Row 1457; `TEXT_FX.counter` 3742 | L |
| 7 | Oil Paint | Raise Radius above 8 and add a directional brush mode following image gradients, for visible strokes. | Row 25284; `PIXEL_FX.oilpaint` 25513 | M |
| 8 | Lens Flare | Add Ghost shape (Circle, Hexagon) and a Ghost colour strength. | Row 1298; ghost table 11721 | S |
| 9 | CRT | Add a Power 0 to 1 control that collapses the picture to a line then a dot, so a TV switch-on can be keyframed. | Row 514; kernel 9912 | S |
| 10 | Card Flip | Add Back: Another layer or image, so a flip can reveal something different. | Row 1722; kernel 20385 | M |
| 11 | Cube | Allow a different layer or image per face. Lowest priority. | Row 1700; kernel 20275 | L |

## How this was checked

Every tile against the real render at three moments. For capability, about 140 extra real renders at other settings, including Blinds, Pixel Sort, Oil Paint, CRT, VHS, Halftone modes, Live Wire, Crosshatch, Lens Blur Bloom, Directional Blur limits, Particles, Starfield Fly-through, Flare ghosts, Audio styles, Flip backs and Dispersion. Not tested: Dispersion on a true cut-out layer (it was run over photographs and on a blank layer), and Word Highlight's Spoken timing.
