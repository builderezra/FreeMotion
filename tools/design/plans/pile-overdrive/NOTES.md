# Overdrive keeps its whites white — LAND-LIST §3 Q9 (hunt/pile-overdrive)

Branch `hunt/pile-overdrive`, built on `hunt/v50-tree` 4af4e420 (v17.50). Ported BY HAND from the ChatGPT pile's
**`b5ed0efb` "Protect Overdrive highlights from sharpening colour fringes" — DROP it from the pile** (its parent `ca35afb3`,
Unsharp Mask's Protect colour, already landed in v17.44 as c77528ee, with `def: 0, legacy: 0` as the land list asked).

Question 9 on the land list: *"Overdrive filter's sun turns lavender. Fix it so it stays white? Recommended: yes (before/after
picture first)."* Decided yes by the PM under #1117 (*"you just decide whats best for the chatgpt"*). **Nothing visual ships
until he has seen the sheet below.**

**NOTHING HERE HAS BEEN RUN** (a release ship held the machine). No node, no browser, not even `node --check`. The numbers below
are arithmetic; the tests' bounds marked *measured-later* are for the landing to read and tighten.

## The cause

Overdrive's passes run in this order, whatever its rows say:

1. brightness 0.92, contrast 1.26, saturate 1.2: the CSS colour pass, always first (`effectFilter`, at the base of `drawLayer`);
2. Vignette 0.35 / size 38: always the innermost pixel pass (`postFxOrder`, #986 C8);
3. **Unsharp Mask, Amount 1.8, Radius 2, one channel at a time:** `out = v + 1.8 × (v − blur)` for R, G and B separately;
4. Light Glow (white, a screen toward 255), then the flash (a plain darken).

A low sun sits in a **yellow glare**. The glare's red and green clip with the sun under the contrast, its blue does not:
(255, 255, 170) → brightness (234.6, 234.6, 156.4) → contrast (255, 255, 163.9) → saturate (255, 255, 147). So beside the glare,
the sun's red and green blurs equal the sun's own and only its **blue** blur is lower: the sharpen pushes blue up and nothing else.
**R = G < B: lavender.**

* **Pure white (255, 255, 255) that reaches the sharpen at 255 cannot move.** Every channel's push is ≥ 0 and clamps at 255. On a
  clipped sun in the middle of the frame nothing happens.
* **The same white once the vignette has dimmed it** (Overdrive's vignette always runs first): at 86% it is (219, 219, 219) beside
  a glare of (219, 219, 126). Take a rim pixel with a quarter of its 5 × 5 window in the glare: red and green get 0, blue gets
  1.8 × 0.25 × 93 = +42 → **(219, 219, 255)**.
* **A near-white sun that never clipped**, (232, 232, 232): the colour pass gives 236 (232 × 0.92 = 213.4; (213.4 − 127.5) × 1.26 +
  127.5 = 235.8). Red and green get 1.8 × 0.25 × (236 − 255) = −9 and blue 1.8 × 0.25 × 89 = +40 → **(227, 227, 255)**, CSS's own
  "lavender" (230, 230, 250) almost to the level.
* Light Glow lifts both about halfway to white, (237, 237, 255) and (243, 243, 255), and the flash dims them by up to 30%. It is
  still plainly lavender.

That is the 912 audit's measurement in other clothes. It saw (255, 253, 255) → (206, 204, 255) when the sharpen ran after highlight
recovery, which dims the sun the way the vignette does here.

⚠️ **On `sunpath.jpg` itself my arithmetic expects the lavender to be FAINT.** On a photo or video, Overdrive's vignette is fitted to
the clip's own frame, not the project's. The sun sits at about (0.5, 0.22), roughly 0.40 of the half-diagonal, just past where the
vignette starts (0.38). That dims it about 1%, so blue can climb about 2 levels. The audit's *"the existing Overdrive filter already
shows a lavender sun on that photo"* is therefore not reproduced by this arithmetic at the photo's own framing. Something I have
not modelled could account for it:

* a JPEG core that does not clip;
* a crop;
* a render path from before #482 6.1.

The sheet's `numbers.sun` will say how much sunpath really shows. The `overdrive-fixture` page shows the mechanism at full
strength either way.

## The fix

One line in `js/filters.js`: Overdrive's Unsharp Mask gets **`coloursafe: 100`** (the Protect colour control). At 100 every
channel takes the same push, the brightness (Rec.601 luma) one, `1.8 × (0.299 dR + 0.587 dG + 0.114 dB)`. That is exactly what
the pile's `b5ed0efb` did. Its `?v=` was not copied: this tree's `filters.js?v=21` → **22**.

* A neutral pixel stays exactly neutral, whatever is next to it. The two rims above become **(224, 224, 224)** and
  **(233, 233, 233)**, as bright as before.
* Every pixel keeps its luma sharpening unchanged: the old per-channel result and the new one have the same luma, by construction
  (the weights sum to 1). The exception is where a channel clipped at 0 or 255. **What goes is the colour part of the sharpen**: the
  coloured fringe at a colour edge.

## What moves

**Only NEW Overdrive filters.** A filter copies its children when it is applied (`FM.filters.makeInstance`), and a saved Overdrive's
Unsharp Mask carries Protect colour 0. It was built that way since v17.44, or it reads the absent key as `legacy: 0` from before.
**So old projects look exactly as they did. The lavender stays in them until Overdrive is applied again, or he turns Protect
colour up on that filter's Unsharp Mask row.** The brief expected old projects to change. They cannot through the recipe. Doing
it would take a load-time migration of saved Overdrive instances, keyed on `fid === 'overdrive'`. That changes how a project
normalises, so it needs a collab SCHEMA_REV bump. I did not do it. It is the PM's call (see "Unsure").

Inside a new Overdrive, by arithmetic on the values that reach the sharpen:

| where | old | new |
|---|---|---|
| flat areas of any colour, any brightness | – | **byte-identical** (blur = pixel, nothing to push) |
| an edge between two greys | – | **byte-identical** (all three channels' pushes were already equal) |
| a white sun dimmed by the vignette, rim | (219, 219, 255) | (224, 224, 224) |
| a near-white sun, rim | (227, 227, 255) | (233, 233, 233) |
| a sun reaching the sharpen at 255 | (255, 255, 255) | (255, 255, 255) |
| mid-grey 128 (→ 115) beside red (200, 40, 40 → 228, 5, 5), grey 1 px from the edge | (34, 195, 195) cyan | (147, 147, 147), same luma |
| …the grey 2 px from the edge | (75, 155, 155) | (131, 131, 131) |
| …the red 1 px / 2 px from the edge | (255, 0, 0) / (255, 0, 0) | (197, 0, 0) / (212, 0, 0): the old overshoot had clipped |
| a red's bright rim against its own shadow (228, 5, 5 beside 114, 2, 2) | (255, 7, 7) | (254, 31, 31): a little less saturated |

So colour edges lose their coloured halos and keep their bite. The rim of a strongly saturated colour comes out up to ~25–60 levels
different in its other channels. That is 1–2 px at the export, about 1 px on a phone's plate. Mid-tones away from an edge do not
move at all. Before Light Glow and the flash, which apply equally to old and new.

## Pinned pictures this moves — RE-PINS for the landing

Overdrive's entry in the four `HEAD_FILTERS` tables moves on purpose. The 482 texture has colour edges everywhere: R ramps
across, G ramps down, B is a sawtooth. Nothing else in those tables moves, and `prove.sh` stage 5 checks that in node. The POLISH-LOG
line needs:

```
RE-PINS: "482 polish 1 every new control is in the catalogue at a default that draws the old look - the 56 library filters and the seven effects render byte for byte as on v17.14", "482 5.3 Teal & Orange, 5.4 Tint and 5.5 Duotone - every new control is in the catalogue at a default that draws the old look, and the 56 library filters, saved and new grades and the adjustment-layer Tint and Duotone render byte for byte as on v17.20", "482 6.0 Vignette and the three Glows - every new control is in the catalogue at a default that draws the old look, and the 56 library filters and saved and new vignettes and glows render byte for byte as on v17.21", "482 6.0 Lens Flare, Linear and Spin Streaks and Glow Scan - every new control is in the catalogue at a default that draws the old look, and the 56 library filters and saved and new flares, streaks and scans render byte for byte as on v17.21" because Overdrive's sharpen now protects colour (LAND-LIST Q9: its white sun no longer turns lavender), so its picture on the 482 texture moves on purpose
```

Then run `tools/record-baselines.sh --candidate` after the release's last edit (CLAUDE.md, the `--candidate` paragraph). The Mac's
literals (`overdrive: '6cf2492b/56809eb8'` ×3 and `'6cf2492b/56809eb8/f9ab38af'` in the 6.0 Vignette table) are re-pinned by
hand on a Mac ship. Other tests were checked and need nothing:

* the H&S `FLT` table does not include Overdrive;
* `986 C24` lists eight filters without it;
* the `b11`/`b12`/`b13Recipes` "a library filter carries every new key at its default" checks never look at `unsharpmask`;
* `690 Unsharp Mask Protect colour is off by default…` checks a FRESH Unsharp Mask (still 0), not the recipe.

## Tests (appended before the final `})();` of tests/tests.js, titled `690 Q9 …`, `{ item: '690' }`)

`690` is the pile's own request for this work (#690 clause 3, "polish existing effects/filters"). It matches the landed sibling
`690 Unsharp Mask Protect colour …`. `Q9` is the land-list question. `?only=690%20Q9` runs the three. Every render is t = 0.7, with
the old and new recipe at the same moment, so the flash is the same. The fixture is a 240 × 180 photo: a yellow glare (255, 255,
170), a pure-white sun at (40, 40) in the vignette's band (86%), and a near-white (232) sun at the centre, each 11 px across.
"Lavender" = B − max(R, G), the worst over a box round each sun. White and grey score 0. The glare and any blend of sun and glare
score below 0, and a push that is the same on every channel cannot change that sign.

1. **`690 Q9 Overdrive keeps a white sun and a near-white sun white beside a yellow glare …`**
   * CONTROL 1: the OLD sharpen alone leaves a disc arriving at 255 at exactly 255, the arithmetic above.
   * CONTROL 2: the old recipe (Protect colour 0) turns both suns lavender, worst ≥ 5. By arithmetic it is ~18 and ~12 after the
     glow, less the flash.
   * Then the library's Overdrive: worst ≤ 2. The middle and a rim pixel are R = G = B (±2), and the rim is no dimmer than the old
     one (luma ≥ old − 2).
   * **Fails on the base** at "Overdrive turns the pure-white sun (dimmed by the vignette) lavender: … (Protect colour 0, not 100)".
2. **`690 Q9 Overdrive keeps its look away from white …`** uses six flat swatches: grey | red | skin over green | blue | sky.
   * Inside each swatch, 15 px in, past the sharpen's 2 and the glow's 12, old and new are within 1 level.
   * CONTROL: the old grey rim beside the red is cyan (G − R and B − R ≥ 40; arithmetic 161 × the flash).
   * The new rim is grey (±2) at the same luma (±3). The frame's mean |Δ luma| is ≤ 2 (*measured-later*).
   * **Fails on the base** at "Overdrive still paints a coloured fringe on the grey beside the red". Same mechanism as the sun: a
     neutral pixel beside a colour.
3. **`690 Q9 Overdrive's suns stay white on the phone's half plate as on the export …`** renders the sun fixture at 120 wide
   (plate 0.5).
   * CONTROL: the old recipe is lavender there too (≥ 4).
   * The new recipe is ≤ 2 at 120 and at 240. Each sun's middle on the half plate is white and within 8 levels of the export's
     2 × 2 average (*measured-later*).
   * **Fails on the base** at "on the phone's half plate Overdrive turns the pure-white sun lavender".

The brief asked for "each channel within a bound of 255". Through Overdrive a white sun is legitimately dimmed by its own vignette
and flash. Both are neutral. So "white" is tested as **R = G = B and no dimmer than before** instead.

The pile's own test was dropped. It called the kernel on a synthetic red/grey edge, never a sun, and its first assertion was
`coloursafe === 100`, which only restates the recipe.

## The before / after sheet (#545: he sees it before it ships)

`tools/design/plans/pile-overdrive/render-probe.js`, for `tools/shot.py --js-file` in a browser slot, served from THIS branch. It
refuses on a tree whose Overdrive is not at Protect colour 100. Pages are POSTed to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`,
with a FRESH Image per render. BEFORE is today's recipe (also what a saved Overdrive keeps) and AFTER is this branch's, side by
side:

* `overdrive-sun.jpg` uses `sunpath.jpg`. It shows the whole frame, the sun close up in export pixels, and the same patch on a phone
  preview plate 380 wide.
* `overdrive-fixture.jpg` is the tests' own picture: a white sun the vignette dims and a near-white one, in a yellow glare. It shows
  the whole picture and each sun close up, so the mechanism shows even if sunpath's sun is too central to show much (above).
* `overdrive-car.jpg` uses the car the Overdrive tile previews on. It shows the whole frame and its middle at 3× in export pixels:
  the "everything else" check, where the colour-edge fringes are the only change.

The summary returns the lavender numbers for before and after: the worst B − max(R, G) round the sun, and the pixels over 8. There
is one set for sunpath at the export and on the phone, and one for each fixture sun. ★ RECOMMENDED: AFTER.

## Proof script (written, not run)

`…/scratchpad/agents/pile-overdrive/prove.sh` writes its output to `prove-result.txt`. It keeps the bwmix model's `busy()` gate,
with base 4af4e420. Stages:

1. syntax, CRLF, modes, `\uXXXX`, buster;
2. the three new tests on the base js must FAIL on the behaviour, not a CONTROL or setup line;
3. they must PASS on the tip;
4. the filter / Unsharp Mask neighbours give the same verdicts on both trees;
5. `filterdiff.js` renders every library filter on the 482 texture, base vs tip, and want exactly `overdrive` moved; the four
   pinned tests' overdrive fragments are printed;
6. the collab fingerprint must be unchanged (no new control);
7. treecheck / drops.

## Unsure

* **Whether sunpath itself shows it.** By the arithmetic its sun is almost undimmed (see "The cause"). If the sheet's
  `numbers.sun.before.worst` comes back ≤ 2, the audit's lavender came from somewhere this note does not model. The fix still
  holds for every dimmed or unclipped white; the fixture page and the tests prove that. Read the photo's numbers before writing
  "the sun on sunpath" in the POLISH-LOG line.
* **Old projects.** Recipe-only: saved Overdrives keep the lavender. If the PM wants them fixed too, that is a load migration on
  `fid === 'overdrive'` plus a SCHEMA_REV bump. It is not done here.
* **The look at colour edges** changes more than "nothing else", by the table above. A narrower fix that protects only near-neutral
  pixels would keep saturated rims exactly. It needs a NEW Unsharp Mask control, a schema rev bump and a new slider row at 380 px.
  Worth it only if the car page shows the edge change matters to him.
* All numbers are arithmetic in sRGB, assuming Chrome applies `ctx.filter`'s brightness / contrast / saturate in sRGB with a clamp
  after each function, as the soft canvas does. The neutrality claims do not depend on that. The control thresholds (≥ 5, ≥ 4) do,
  a little.
* **Cold Steel** has the same per-channel sharpen (Amount 1.1), after a blue colour balance, so its whites are blue on purpose. It
  is not touched.
