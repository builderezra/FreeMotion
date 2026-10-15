# #966 B40 Title Warp — ported from ChatGPT's pile (hunt/pile-titlewarp)

Backlog: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B40 — *"Title Warp (Arc / Arch / Bulge / Flag / Wave / Fish /
Rise / Inflate / Squeeze / Twist); needs `bb` in the warp driver"*, Distort, M. LAND-LIST B6 lists the pile commit `01d2f034` with
no written fix. Built on `hunt/fxnew-drums` 85b71929 (the effects landing + every §B branch so far).

**When this lands, DROP the pile commit `01d2f034`** — everything in it that is kept is here, by hand; its `?v=` numbers
(compositor 223, fx-registry 25.43) count along ChatGPT's private history and must never be copied.

Nothing was run (the API builder was live): no node, no browser, not even `node --check`. The proof is written:
`scratchpad/agents/pile-titlewarp/prove.sh` (results to `prove-result.txt` beside it).

## Is it already in the app?

No. REQUESTS.md / POLISH-LOG.md have no "title warp", "warp text" or "text warp". What exists is **Text Curve** (`textcurve`,
a text effect, and the Curve slider on a text layer): it lays the LINE of text along an arc, letter by letter, each glyph turned
to follow it. Title Warp is a different thing — it bends the rendered layer's pixels inside the layer's box (word-art shapes), so
it also bends letters themselves, and works on shapes and pictures. The two can be used together.

## What was ported (taken from 01d2f034, applied by hand)

- One Warping effect `titlewarp`: Shape (ten options), Bend −100..100 % (default 35, Arc), Wave phase −360..360 °.
- The idea that matters: the warp lives in the layer's OWN visible box — `alphaBBoxExact` on the plate `drawWarpEffect` has just
  drawn (what is on the layer after its other effects), read once and reused by the CPU loop.
- The kernels for Arc, Arch, Flag, Wave, Fish, Rise, Inflate and Squeeze, formula for formula.
- Any layer, not text-only (the pile's choice, kept: a shape or a picture with transparency bends the same way, and the name
  says what it is for). Filed in Warping beside Wave, like the pile.

## What was fixed or changed, and why

1. **The box rides as prep's TENTH argument.** The pile passed it as the ninth. In this tree the ninth is the clip's own clock
   `tl` (#482 polish 10.2), so the pile's kernel read a NUMBER as its box on every frame after 0 s (`b.x` undefined → NaN → the
   sampler reads pixel (0, 0) everywhere: the title vanishes the moment the playhead leaves 0). `drawWarpEffect` now hands
   `wbb` to `prep` and `glslPrep` for any kernel with `needsBounds`, guarded for a plate that cannot be read, and such a kernel
   never joins a GPU run (it has no `.glsl` anyway; a future shader would need the box as uniforms).
2. **Twist is a twirl round the box's centre inside the circle through its corners** (half a turn at the centre at Bend 100,
   none at the circle; every ring only turns). The pile turned each ROW about the centre by `Bend x 1.2 rad x height`, with no
   limit outside the box. Along any circle that turn runs faster than the circle once `|dx| > hh / (1.2 x Bend)`, so on a wide
   title the ends folded back over themselves: the same letters drawn two or three times, far apart (worked through by hand for the
   test fixture: a pixel 70 px right of centre shows at three places, ~150 px apart at Bend 100 and ~90 px at Bend 35). The
   test keeps the pile's Twist as the control that the fold measure sees it.
   An earlier draft of this port twirled inside the box's own ELLIPSE (rotating in the box's 0..1 coordinates); that squashes the
   middle letters 4:1 on a 4:1 title when they turn, so it is round now.
3. **Bulge swells the middle COLUMNS** (the middle of the word taller — the word-art bulge). The pile's Bulge widened the middle
   ROWS, which along the Bend slider was the mirror image of its own Squeeze (Bulge at −35 ≈ Squeeze at +35).
4. **Wave speed (new row)**: degrees per second on the clip's own clock (`wSpeedDeg`, the rule Wave, Ripple and Curl follow since
   #482 polish 10.2 — *the waves only moved if Phase was keyframed by hand*), so a flag waves on its own; a keyframed speed
   integrates. Wave phase and Wave speed grey out (`overriddenBy: 'style', liveWhen: [3, 4]`) on the eight shapes they do not
   move — a dead control is a defect here.
5. **Edges and Smooth sampling rows declared on the row**, at the old sampler (Stretch, Off) like every warp — the row is pushed
   at the end of compositor.js, after the loop that adds those rows to the warps above, and '482 10.1 Every warp' requires both
   rows at those defaults.
6. Bend, Shape and Wave phase are clamped by value; a non-number (a bad keyframe) reads as its default.

Kept as the pile wrote them, though they are taste calls (see the questions): Flag's amplitude (0.1 + 0.25 u — the pole end
waves a little too), Fish (the middle row 1 + 0.65 x Bend as wide, the centre column 1 − 0.25 x Bend as tall), Inflate (radial,
the corners held), Arc's lift (Bend x half the box's height at the centre).

## How it follows this tree's warp conventions

- Inverse map (output → the plate point it shows), through the driver's own sampler: Edges and Smooth sampling are the driver's.
- No crop margin needed: warps draw on the whole plate (nestedPlate), so content bent out of the box lands anywhere in the frame;
  only the frame edge cuts it, as for every warp. A zoomed preview slice also gets the whole comp plate, so the box is the whole
  layer there too (913.5 should hold — left to the Chrome run, see below).
- Plate scaling: the box is measured in plate px and every amount is a share of it, so there is NO px row and nothing for
  `pxToPlate` to scale; the 0.28 phone plate draws the export shrunk (plate test, bound TODO from the first run).
- Keyframable rows (`fparam` at time t), stateless, nothing random; Bend 0 returns every point exactly.
- Not on adjustment layers (not in PIXEL_ADJ) — a box needs a layer's own pixels.

## Registration (merge points)

- CATEGORY_OF **batch 48** after Clarity (`titlewarp: 'distort'`), so it leads the NEW row. **Known merge point:** Lens Magnifier
  (hunt/fxnew-lensmag) also says batch 48, as do B27 / B28 — whoever lands second renumbers and re-orders the shared lists.
- FM.EFFECTS push at the end of compositor.js (after Clarity's block), so `FM.fxRegistry.all()` ends with it.
- Search words: title warp, warp text, text warp, warp title, warped text, word art, wordart, and each shape WITH "text" (wavy
  text, flag text, …) so a bare "wave" or "bulge" still finds Wave and Pinch / Bulge. Not "curved text" / "arc text": that is
  Text Curve.
- Browser tile on the text subject ('Abc'), not a photo (fx-thumbs SUBJECT_OF).
- The inspector's "changes nothing" reason (Bend 0, or a frame-filling flat colour).
- Busters: compositor 224 → 225, fx-registry 28.36 → 28.37, fx-thumbs 59 → 60, inspector 422 → 423.
- Shared tests: E1's LATER (appended), 745's NEWEST_FIRST and 913.8's NEWER (at the front), exactly as Clarity was.
- **C.SCHEMA_REV / SCHEMA_FP left alone**, as Clarity did: the new params move the fingerprint; the landing re-measures
  ('921 S1 the schema fingerprint gate'); prove.sh stage 6 prints both trees' numbers.
- queue 264 needs no ALLOWED entry (no single extreme erases the layer: Bend ±100 at every shape keeps it; the most it shrinks is
  the middle to a fifth, Bulge / Inflate at −100). The does-something-visible sweep walks warp kernels with no box (the
  whole plate) — Arc 35 moves ~11 px mean there. The inert sweep only walks PIXEL_FX, so it never sees a warp; the catalogue test
  checks by hand that Bend moves all ten and Wave phase / speed move exactly Flag and Wave.

## The tests (7, appended before the final `})();`, all '966 B40 …', item 966)

Each starts with `_b40Need()`, which throws *"no registry entry for titlewarp — the effect is not built"* on 85b71929 — so every
one fails there by naming the missing effect, never with a TypeError.

1. **Catalogue**: Warping beside Wave (CONTROL: Wave is in Warping), offered on text / shape / picture, POSTFX, `needsBounds`,
   no second kernel, description, search words, the six rows / labels / ranges / options / defaults, Wave phase and speed live
   only on Flag and Wave (and on the other eight they change not one byte), no px row, a bare instance = its defaults, the
   defaults plainly move the title, appended after Clarity and leading the NEW row behind only newer effects.
2. **Bend 0 = the layer byte for byte**: all ten shapes x Smooth off / on with a Wave phase and speed, on a plate with every kind
   of alpha; the kernel returns every point exactly, box or none; through FM.renderScene a pixel-aligned title over another layer
   draws exactly as with no effect (CONTROL: Bend 35 differs by 200+ bytes).
3. **Each shape maps as its formula says**: the test writes the ten formulas out again (`_b40Spec`), predicts every output
   pixel of a 161 x 41 box at Bend 50 under nearest sampling, and compares with what the kernel + the driver's sampler drew (≤ 6
   pixels of float rounding). CONTROLS: each formula moves 300+ pixels; no two shapes draw the same title. Then the headlines,
   measured: Arc's top centre up 10 px (Bend 50 x half of 40), the ends still; Arch higher than Arc toward the ends; Bulge's
   centre column 1.4 x as tall, its ends as they were; Flag and Wave's top edge on their sines at four columns; Fish 1.325 x as
   wide and 0.875 x as tall in the middle; Rise ±7 at the ends; Inflate's middle row and column grown as solved from the formula;
   Squeeze's middle row 1 / 1.4 as wide and its top row unchanged; Inflate and Twist hold the corners.
4. **Twist does not fold**: an address-per-pixel fixture shows no title pixel drawn in two places more than 5 px apart, nothing
   outside the circle through the corners, the area within 8 %, at Bend 35 / 100 / −100, Smooth off and on. CONTROL: the
   pile's Twist (kept in the test as `_b40PileTwist`) draws the same pixel 20+ px apart at Bend 100.
5. **THE bb FIX**: a spy on the very prep the driver calls sees the clip clock as the ninth argument (a clip starting at 0.5 s,
   drawn at 1.25 s → 0.75) and the title's box as the tenth (120,108 80x24 at 1:1; 60,54 40x12 on a half plate); the same title
   in a 320 x 240 frame and in a 120 x 80 one draws the same window (Arc, Flag, Twist, ≤ 8 bytes of float rounding); Arc 60 lifts
   the top centre 6.9 px (60 % of half the 24-px height). CONTROL: the same warp placed on the frame (no box, what every other
   warp does) lifts it ~71 px.
6. **Plates, stateless, keyframes, clock**: on the 0.5 and 0.28 plates an Arc-100 and a Flag-60 title are the export box-averaged
   down within `B40_PLATE_TOL` (**TODO: a guess of 3 levels — prove.sh 3b forces it to −1 to print the numbers; set it from the
   Chrome run's**), CONTROL: the box read in project px on the plate (the plausible plate bug) is ≥ 1.5 x the bound off; the same
   instant draws the same frame after another time; keyed Bend and Wave phase = those values plain at three times (CONTROL: 0.3 s
   and 1.7 s differ); Wave speed 90 °/s half a second into a clip that sits at 2 s on the timeline = Wave phase 45 (CONTROL: read
   on the project clock it would be 180°, and that differs).
7. **The browser tile bends a word**: previewScene puts it on a text layer and the tile differs from the word without it. On a
   canvas that draws no text (node's soft canvas) it reports NOT RUN (`fmNotRun`) instead of failing the effect for it.

The pile's own test (item TBD: the box handed over, ten shapes that move and differ, zero Bend) is folded into 1, 2, 3 and 5; its
box check passed the box as the ninth argument and is replaced by test 5's.

## The sheet (render-probe.js, next browser slot)

Three phone-sized pages through FM.renderScene, a bold gold "SUMMER SALE" on navy: all ten shapes at the defaults; Bend along Arc
/ Flag / Twist, five shapes at 70 %, and a flag waving with Wave speed at five moments; Smooth sampling Off against On, big, on Arc
and Twist. POSTed to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`.

## Questions for Ezra

1. **Smooth sampling on by default for Title Warp?** Every warp starts Off (the old sampler, so saved projects never move), and
   '482 10.1 Every warp' requires it. On a bent title Off leaves 1-px stair-steps along the curves; On blends them (sheet page 3).
   A new type has no saved projects, so On would cost one exemption in that test. Recommended: On.
2. **Bulge and Twist were changed from the pile** (vertical swell; a round twirl that cannot fold). Fine as drawn on the sheet?
3. **Typewriter and other reveal animations**: the box is what is VISIBLE on the frame, so while a title types itself on, the
   arc re-fits each new letter (the bend "swims" as the box grows). The alternative is the layer's full laid-out box (stable,
   but text-specific and blind to other effects). Recommended: keep the visible box (works on any layer); ask if it bothers him.
4. **A rotated title bends along the screen's axes, not its own** (the box is the screen-aligned box of what is drawn). Fine for
   now?
5. Defaults: Arc at Bend 35 — enough to see in the tile, not wild. Different pick from the sheet?

## Unsure / not done

- Nothing was run. The formula test's tolerance (≤ 6 differing pixels) and the bb window's (≤ 8 bytes) assume the kernel and the
  test's spec round the same way almost everywhere; if the first run shows more, that is float rounding at exact-integer
  boundaries, not a wrong formula — the headline checks say which.
- The tile test is NOT RUN in node (no text in the soft canvas); the Chrome run decides it.
- 913.5 (zoomed slices draw every effect as the whole frame) was reasoned, not run: a zoomed slice gets the whole comp plate
  (nestedPlate), so the box is the whole layer. Run `?only=913.5` in the next Chrome slot.
- CPU only: no `.glsl` twin (a full-frame CPU loop per frame, like the other kernels without one). A shader needs the box as four
  uniforms; worth doing if it shows in the "Editing lags" measurements.
