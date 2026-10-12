# fx-all — landing notes

Branch `fx-all` (pushed as `hunt/fx-polish-all`): #482 polish batches 7, 8, 10, 11, 12, 13, 14 and 15 of his #966 list,
merged onto `hunt/e1-land` fc8866f1. The tree's label is still v17.37 (main is v17.39), so it ships as v17.4x.
It closes none of his numbered items outright: every line below refers to #482 / #966.

Every default draws and plays exactly what fc8866f1 does — each batch pinned its effects against fc8866f1 (byte for
byte, call for call, or sample for sample) before changing anything. 121 new tests, none dropped.

## What the branch contains

**Batch 7 — sound (#966 batch 7, 7.1–7.8).** Audio controls can now be a choice (buttons), an on/off (tick box), a
"rebuild" control, or carry a `legacy` value that a project saved before the control opens at — the sanitiser fills it,
the kernel reads it, the panel shows it, and the collab fingerprint hashes it. Compressor Auto makeup (On = today) and
Limiter Clip at ceiling; Shape (Sine / Triangle / Square / Saw up / Saw down / Random) on Tremolo, Auto-Pan, Vibrato,
Chorus, Flanger and Phaser, plus Tremolo Stereo phase; Distortion Type (Soft / Hard clip / Tube / Fuzz / Wavefold /
Rectify), Tone, Auto level (fixes C19: it no longer gets louder as Drive goes up) and Output; Telephone Style (Phone /
Radio / Megaphone / Walkie-talkie / Old radio — one tap writes four values in one undo step), Low cut, High cut, Grit,
Noise; Slope 12–48 dB/oct on Low-Pass, High-Pass, Band-Pass and Notch; Phaser Stages, Centre, Mix, Stereo phase; Ring
Mod Shape, Sweep rate, Sweep depth; Chorus Voices 1–6, Spread, Feedback. 20 tests.

**Batch 8 — sound (#966 batch 8, 8.1–8.8 and a review).** Mix and Output on every audio effect (not Gain / Boost; no
Mix on Vocal Remove; the Limiter's Mix holds its dry copy back by its look-ahead so a blend does not comb). Audio
presets as data — Reverb, Echo, Compressor, 3-Band EQ, Distortion, Pitch Shift — applied in one undo step, plus a
"Save as my preset" store; the chips and the Save button are NOT built (draw first, #545). Ping-Pong Right-side timing,
Tone, Width; Stereo Width Keep bass centred and Auto trim; Vocal Remove Keep bass below, Keep highs and Mode (Remove
vocals / Centre only); Auto-Pan Centre and Realism; Tempo sync (BPM + Note, with a "= 250 ms" readout) on Echo,
Ping-Pong, Tremolo and Auto-Pan; Pitch Shift Grain. Review: Tempo and Keep bass centred say Off at 0 and never rest
between 1 and 39 (`offUntil`); the Limiter's Output can only turn it down (capped at 0 dB). 15 tests.

**Batch 10 — warps (10.1–10.7 and a review).** Every warp gets Edges (Stretch / Transparent / Wrap / Mirror) and Smooth
sampling, on the CPU and the GPU (C26); Wave, Ripple and Curl get Wave speed, Ripple and Curl Falloff and Radius (C30);
Kaleidoscope Source zoom, Source X / Y, Flow, Mirror wedges, Segments to 32; Turbulent Displace Flow X / Y and Stretch;
Displacement Map Vertical amount, three more channels, Map blur, Map fit; Mirror Reflection angle and Repeat folds;
Hexagon Tiles Grout, Grout colour, Edge shade. Review: the Kaleidoscope GPU parity test leaves out exact ties (measured:
the kernel and the shader agree; float32 trig lands either side of a whole pixel). 10 tests, 3 of them GPU (browser only).

**Batch 11 — generators (11.1–11.7 and two reviews).** Particles: Emit from Point / Line / Box / Circle / Whole frame,
All at once, Pattern, Drag, Turbulence, Size / Colour / Lifetime variation, Behind layer. Snow & Rain: Confetti,
Embers, Dust / Ash, Petals, Bubbles, Pattern, Sway. Starfield: Fly-through with Focus X / Y, Drift X / Y, Glint,
Pattern. Clouds: Boil, Octaves, Contrast, Vertical drift. Voronoi: Pattern, Fill (Seed colour / Cell average / Random
colour / Original), Wall colour, Randomness. Lightning: Strike (Down the layer / Point to point) with From and To, Glow,
Core colour, Segments, Draw on (fixes C34; an empty layer no longer throws). Roughen Edges: Boil, Pattern, Complexity,
Erode. Reviews: Cell average and Erode reuse their plate-sized scratch (they allocated 4–8 MB a frame at 1080×1920); an
unset Lightning Core row shows the core the kernel draws (80 % to white), not the bolt colour. 16 tests.

**Batch 12 — keying, wipes, text, edges (12.1–12.7, a follow-up and a review).** Chroma Key Pro Clip black / Clip
white, Shrink / grow, Despill from, View On grey; Luma Key Removes Similar / Dissimilar with Tolerance; Wipe and Radial
Wipe Fit to Frame / Layer and Invert, Radial Direction and Blades (C36); Text — Type-On Caret blink and "Caret when
idle: Show / Hide", Scramble Resolves order, Timecode HH:MM:SS:FF / Frames / MM:SS and Decimals; Border Frame Style
(Solid / Dashed / Dotted), Dash length, Gap, Draw on, Smooth corners; Find Edges Line width, Light / Dark colours,
Colour edges; Emboss Height. Review: a blinking caret no longer moves centred or right-aligned text half a glyph each
beat. 15 tests.

**Batch 13 — Stylize (13.1–13.7).** Halftone Print (Mono / Colour dots / CMYK), Ink, Paper, Smooth dots, Sample, Mix
(C32); CRT Tube curvature, Mask type (Stripes / Slot / Dots), Bloom, Flicker; VHS Tape Snow, Colour fade, Vertical
hold; Scanlines Softness, Direction, Line colour; Pixel Sort Sort by, Pattern, Re-roll, two diagonal Directions; Dither
Method (Ordered / Floyd–Steinberg / Atkinson / Blue noise), Ink and Paper in Mono; HSL Bands Ignore greys below,
Lightness from / to, Show selection. 14 tests.

**Batch 14 — blurs, fills, repetition, 3D (14.1–14.7).** Tilt Shift Sharp band, Shape (Linear / Radial) with Focus X,
Smoothness, Miniature pop (C45); Lens Blur Rotation, Bloom threshold, Anamorphic; Directional Blur Smear (Both / Behind
/ Ahead), Frame edges (Fade / Repeat) (half of C25); Backfill Style (Blurred copy / Mirrored edges / Solid colour),
Colour, Saturation, Vignette; Trail Copy size, Copy turn, In front / Behind, Time offset; Tile Grid Scroll across /
down and Gap (CPU and GPU); Scatter Array Drift and Spin; Perspective, Offset X / Y and Auto-spin X / Y / Z on all
fifteen 3D solids; Card Flip Flip angle, Perspective, Back (Mirror / Solid colour / Transparent) with Back colour (C29).
16 tests.

**Batch 15 — grading (15.1–15.7).** The Filter gains Tonal range (All / Shadows / Midtones / Highlights), Range width
and Protect skin; five finish sliders (Warmth, Fade, Grain, Vignette, Sharpen), and a filter saved as a preset now keeps
its Strength and finish; Over-drive (Strength past 100 %). The Filters tab's "On my clip" ENGINE (the tile is his clip
with the filter on, at the playhead) — no visible switch yet, off by default (draw first). Levels holds all four
channel sets at once (Channel only picks which set the panel shows; a saved one-channel Levels opens on its channel with
the same picture). Match Grade Measure (Every frame / Hold at time), Hold at, Smoothing, Protect skin. Gaussian Blur
Repeat edges, Direction, Mix, Blend (Screen = the Orton glow) — off its defaults it runs in stack order, not first.
15 tests.

**How it was put together.** Each batch was built in its own worktree and merged here one at a time; tests/tests.js
was rebuilt by blocks every time (never union-merged). The two real conflicts were resolved keeping both: batches 10 and
14 had both made the clip's clock the 9th prep argument (one list now serves Wave speed, Kaleidoscope / Turbulent Flow
and Tile Grid Scroll), and the warp sampler honours Tile Grid's Gap on both of its paths and in the shader. Busters:
compositor 218, fx-registry 27.32, inspector 415, gl-warp 6, audio-fx 18, audio-fx-live 15, storage 62, filters 20,
fx-thumbs 55, exporter 127, app 474, collab-core 28 (the last commit). In node on the merged tree every batch's own
runner gives its own branch's verdicts (10: 7 / 7 + 3 GPU; 11: 16 / 16; 12: 15 / 15; 13: 14 / 14; 14: 16 / 16; 15: 15 / 15).

## The collab schema — SCHEMA_REV 10, SCHEMA_FP 4775724801447341 (this commit)

The batches' new effect and audio params (and `legacy` in the audio tuple, 7.1) move the fingerprint, so `921 S1 the
schema fingerprint gate` was red on this tree by design. Measured in node by loading the app's own js into a vm (the
real collab-core, storage sanitiser, registries, bridge and session; only app.js's `autoFitDuration` and timeline.js's
`inheritLoopModes` lifted out of their files as text). Controls first, all exact:

| tree | pinned | node |
|---|---|---|
| main v17.39 (56c7545a) and v17.33 (29a5faff) | 8673617696742561 | 8673617696742561 |
| hunt/fix-land-b3 (f3116e64) | 1932349802248846 | 1932349802248846 |
| E1's own tree (db43a633, where 5698315735221935 was measured) | 5698315735221935 | 5698315735221935 |
| hunt/e1-land fc8866f1 | 5698315735221935 | 4766772843632923 — already stale (land-b3's Unsharp Protect colour, #1116's Soften Skin defaults); its own note said "RE-PIN ON THE LANDING TREE" |
| hunt/land-b3 45a97e1f | 8673617696742561 | 7030805312103207 — stale, which is what fix-land-b3 re-pins |
| fx-all at REV 10 | — | **4775724801447341** |

After the edit, the suite's own bodies of `921 S1 the schema fingerprint gate`, `482 3.6 Collab - the sync schema
fingerprint sees the audio effects controls` and `simple P1 · the collab fingerprint carries the sm rules`, lifted
verbatim from tests/tests.js and run in that vm, all PASS here; on HEAD before the edit the gate FAILS ("set SCHEMA_FP to
6389466701002607 (it is 5698315735221935)"); on main all three pass. No other test pins the number or the revision
(482 3.6 asks only `SCHEMA_REV >= 5`), so no test was changed.

⚠️ **hunt/fix-land-b3 also claims SCHEMA_REV 9** (8 → 9 for Unsharp Mask's Protect colour, 1932349802248846) on a tree
that has neither E1 nor these batches. Whichever of fix-land-b3 and fx-all lands SECOND must re-measure SCHEMA_FP on the
combined tree (and keep SCHEMA_REV above anything already shipped) — neither number is right for both.

## DROPS TEST

`python3 drops.py fc8866f1 HEAD` → `fc8866f1 -> HEAD: 0 dropped`. **none.**

## Browser checks still owed

Nothing on this branch has been run in a browser since the merges. Owed, beyond the usual two suite passes and prove:

1. **The schema gate itself**: `?only=921 S1 the schema fingerprint gate` (node says green; the browser is what counts).
2. **GPU parity**: batch 10's three — `482 10.1 Every warp - the GPU draws the same Edges and Smooth sampling…`,
   `482 10.2 Wave, Ripple and Curl - the GPU draws…`, `482 10.3 Kaleidoscope - the GPU draws…` (10.3 went red once in a
   browser and was fixed for exact ties, never re-run) — and batch 14's Tile Grid Gap / Scroll on the GPU,
   `482 14.5 Tile Grid - Gap leaves an empty band… and the shader agrees` (the `fmGap` flag through batch 10's sampler).
3. **Batches 7 and 8, all 35 tests** (`?only=482%207.` 20, `?only=482%208` 15): audio renders and the audio panels at
   390 and 1280 px. Only 8.2's registry half ran, in node against a mock.
4. **Inspector rows, by eye at ~380 px and on a PC**: `offUntil` (Tempo / Keep bass centred read Off at 0, a drag skips
   1–39); the Lightning Core swatch with Core unset (the near-white core, not the bolt colour); Levels' channel rows (only
   the chosen set's five rows show); the "does nothing here" pill (Grain / Vignette / Sharpen on an adjustment layer's
   Filter); the blur-order note (Gaussian Blur off its defaults says it follows stack order; the "always first" tag
   drops); "On my clip" (engine only — the tile is the clip when `FM.filtersOnClip` is on; no switch is drawn). Also seen
   only in node: Hexagon's Grout colour row greying at Grout 0, Vocal Remove's greying, Telephone Style's five buttons
   fitting, Tempo's readout line.
5. **Match Grade Hold at time on a real video and a real export** (15.6: run only against a stand-in frame cache).
6. **Backfill's pictures** (14.4: Solid colour, Mirrored edges, Saturation, Vignette go through renderScene and were
   never run).

## Questions for Ezra

- **Audio presets (8.2)**: the chips at the top of an open effect and the "Save as my preset" button need drawing first
  (#545). The preset values are reasoned, not yet heard.
- **Filters tab "On my clip" (15.4)**: how the switch looks, where it sits on the tab, and whether a portrait clip's
  tile stays square or takes the clip's shape.
- **Poster Print (13.1)**: switch its recipe to Halftone's Colour dots?
- **Find Edges (12.6)**: the colour rows are called Light colour / Dark colour (not "Line / background") because the
  Lines switch flips which one is the line — all right?
- **Telephone (7.4)**: the Walkie-talkie squelch (a level gate) is not built — wanted?
- **Trail Time offset (14.5)**: on a video every copy shows the current frame (a past video frame needs a frame cache)
  — worth building?

## Suggested POLISH-LOG line

- v17.4x — #482 (partial; refers to #482 / #966) — eight more polish batches of his #966 list (“this is the complex version we want as much choice as possible”), landed as one. **Sound** (batches 7 and 8): Mix and Output on every audio effect; Shape (Triangle, Square, Saw, Random) on Tremolo, Auto-Pan, Vibrato, Chorus, Flanger and Phaser; Tempo sync (BPM and a note length) on Echo, Ping-Pong, Tremolo and Auto-Pan; Distortion Type (Hard clip, Tube, Fuzz, Wavefold, Rectify), Tone and Auto level (it no longer gets louder as Drive goes up — C19); Telephone Style (Phone, Radio, Megaphone, Walkie-talkie, Old radio); Slope on Low-Pass, High-Pass, Band-Pass and Notch; Phaser Stages and Centre; Ring Mod sweep; Chorus Voices, Spread and Feedback; Ping-Pong Right-side timing, Tone and Width; Stereo Width Keep bass centred and Auto trim; Vocal Remove Keep highs and Centre only; Auto-Pan Realism; Pitch Shift Grain; Compressor Auto makeup; Limiter Clip at ceiling (presets for six effects are in; their buttons wait on a drawing). **Warps** (10): Edges and Smooth sampling on every warp, on the CPU and the GPU; Wave speed; Ripple and Curl Falloff and Radius; Kaleidoscope Flow and Source; Turbulent Flow; Displacement Map channels and Map blur; Mirror angle; Hexagon Grout. **Generators** (11): Particles from a line, box, circle or the whole frame; Snow & Rain Confetti, Embers, Dust, Petals and Bubbles; Starfield Fly-through; Clouds Boil; Voronoi fills; Lightning Point to point; Roughen Edges Boil and Erode. **Keying, wipes and text** (12): Chroma Key Pro matte tools; Luma Key Similar; Wipe Fit to Layer and Invert; Radial Wipe both ways and Blades; a blinking Type-On caret; Scramble orders; Timecode HH:MM:SS:FF; Border Frame dashes, dots and Draw on; Find Edges line width and colours; Emboss Height. **Stylize** (13): Halftone colour dots and CMYK; CRT curvature and Bloom; VHS Snow; Scanlines direction and colour; Pixel Sort by hue and on the diagonals; Dither Floyd–Steinberg and Atkinson; HSL Bands lightness range. **Blurs, fills and 3D** (14): Tilt Shift Sharp band and Radial; Lens Blur Anamorphic; Directional Blur Behind / Ahead; Backfill Mirrored edges and Solid colour; Trail Copy size and Time offset; Tile Grid Scroll and Gap; Scatter Drift and Spin; Perspective and Auto-spin on all fifteen 3D solids; Card Flip angle and Back. **Grading** (15): the Filter's Tonal range, Protect skin, Warmth / Fade / Grain / Vignette / Sharpen and Over-drive; Levels holds Red, Green, Blue and the master at once; Match Grade Hold at time and Smoothing; Gaussian Blur Direction, Repeat edges and the Orton blend. Every default draws and plays today's picture and sound (each batch pinned against the tree before it), old projects open unchanged, 121 new tests and none dropped. Reviewed by measurement, fixed with catching tests: a blinking caret moved centred text, an unset Lightning Core showed the wrong colour, Cell average and Erode took 4–8 MB a frame, Tempo now says Off instead of resting at 1–39 BPM, and the Limiter's Output can only turn it down. Collab SCHEMA_REV 10 (your phone and computer both need this version before you next share live). Built in eight worktrees and merged by hand where they met.
