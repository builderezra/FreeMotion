# #1068 B5 remnant: Radial Shadow Quality/Opacity and Long Shadow reach/edges

Branch `hunt/1068-b5`, based on `ssh/hunt/948-review` (d61c591e). It has two commits, one per pile commit.

**Nothing was run.** A release ship was running on the laptop, so this is code only. `node --check` passed on
js/compositor.js, js/collab-core.js and tests/tests.js. Nothing else ran: no browser, no suite, no prove, no mutate, no fp.js.

## Where the pile commits were

Both are in this repo's object store (`git log --all`): `0876018f` "Expose Radial Shadow quality and opacity" and
`7a2ef677` "Polish long shadow reach and angled edges". Neither is an ancestor of 948-review. Both were ported by hand. The
compositor line numbers had moved a long way, and the land list's fixes change the code anyway. Left out: ChatGPT's
`outside/` reports and its index.html `?v=` numbers. Its tests were rewritten to the repo's conventions rather than pasted.

## 1. Radial Shadow Quality and Opacity (0876018f) → commit a39bfd4c

- **New controls:** Quality (`samples`, 4–32 taps, default 10) and Opacity (`opacity`, 0–100 %, default **78**).
- **Byte-identical, as the land list requires.** Its line: "Set the Opacity default to today's 78%, so a new shadow does not
  get darker unseen". The pile's own default was 100.
  - Each default is exactly the old welded-in value, so a new shadow and a saved one (no keys) draw byte for byte as before.
  - No `legacy:` was needed, because the default is the old look.
  - The render-time fill (`fxFillValue`, which reads `fparam(p, 'opacity', 78`) gives an absent key 10 and 78.
- **The one judgement call: Opacity is read as a share of 256, clamped at 255.** That puts 78 % exactly on the old cap of
  200 (78 × 2.55 = 198.9 → 199, one level lighter than today), and 100 % is still fully opaque.
  - The other options were a fractional default (78.43 on a step-1 slider) or a special case for absent keys. Both are worse.
- **Kernel:**
  - `rsTaps` comes from Quality: clamped 4–32, and NaN falls back to 10.
  - Opacity 0 returns before any work.
  - The #692 skip box does not depend on the number of taps: F runs between 1/(1 + rsK) and 1 whatever the count.

## 2. Long Shadow reach and smooth edges (7a2ef677) → commit 508a9d98

- **Reach:** Length max 80 → 400, and the kernel clamp too. A saved Length can't exceed 80: the import sanitiser clamps
  numbers to the old max.
- **Edges (new, `edges`, Hard / Smooth, `def: 1`, `legacy: 0`). This deviates from the pile on purpose.**
  - The pile replaced the angled march outright, which changed every saved non-45° shadow. The rule for this landing was
    "old projects must render byte-identical, use `legacy:`", so the old march stays as **Hard**.
  - Every saved shadow (no key) stays on Hard.
  - A new shadow gets **Smooth**: the pile's ray model, with the fixes below.
  - At 45° (the diagonal walk), at right angles and on the diagonals, the two are the same picture.
- **The land list's required fixes, each tested:**
  - **The crossed pixel only.** A ray marks a hit only on the one pixel its centre crosses (`floor(pos + 0.5)`, the same
    rounding as the march), never "either neighbour". The neighbour test painted the lit-side halo.
  - **The slope snaps within 1e-9** (to 0 or ±1). Unsnapped, cos 90° = 6e-17 painted a stray band.
  - **Lit-side and cardinal-parity tests:** see below.
- **One more fix the land list did not name: strictly earlier.**
  - A pixel takes shadow only from what its rays crossed on EARLIER lines. Each step paints first and then updates the
    rays, which is the march's k = 1..Length.
  - The pile did it the other way round, so a ray grazing the layer on the same line painted the lit face at up to half
    strength, even with the crossed-pixel fix.
- **Cost:** Smooth is linear in the frame: about (minor + throw + 5) × 2 + minor operations per major step, and one
  Int32Array per call. The old march was frame × Length.

### Known limits (say them with the picture)

- **Shallow angles.** Even with both fixes, the ray model's ±0.5 px feather leaves a faint trace on the ONE line of pixels
  beside a lit face that runs along the throw's major axis.
  - Its worst case is 255 × (0.5 − |slope|): about 19 at 23° and 67°, about 83 at 10°, and about 105 at 5°.
  - It is 0 from about 26.6° off an axis onward, and exactly 0 at right angles.
  - The lit-face test checks the 23°/67° family (LIT1068 = 24). If the picture shows the line at shallow angles, the cure is
    more rays per pixel (2× halves it) or an exact face clip. It is a follow-up, not done here.
- **Hard + a long Length is slow.** The march is O(frame × Length): about 5× today's worst case at 400, and only for someone
  who picks Hard.
  - A safe speed-up exists and is not done: restrict k to the layer's alpha box along the major axis. It is byte-identical,
    because Q leaves the frame monotonically in both axes, so the skipped k can never hit.
- Edges does nothing at 45°, at right angles or on the diagonals. The row still shows there.

## Collab schema

- `C.SCHEMA_REV` 14 → **15**, with a REV note naming both effects' new keys.
- **`C.SCHEMA_FP` is NOT re-measured.** The marker `/* FP TO PIN (1068 B5) */` sits above it. Until it is pinned,
  `921 S1 the schema fingerprint gate` will be red.
- Pin it with fp.js on this tree, or from that test's printout.
- If another unshipped branch also claims rev 15, whichever lands second takes 16 and re-measures.

## Busters

`js/compositor.js?v=220 → 221` and `js/collab-core.js?v=34 → 35`, once for the batch. fx-registry, inspector and styles are
untouched: the rows come from the catalog.

## Tests (all `{ item: '1068' }`, appended to tests/tests.js; the shared helpers are `b5*`, `TOL1068`, `TOL1068A`, `LIT1068`)

| Title | Fails on the base at |
|---|---|
| `1068 B5 Radial Shadow has a Quality and an Opacity, a new one is the shadow it always was, and a saved one is untouched` | "Radial Shadow has no Quality control …" |
| `1068 B5 Long Shadow reaches 400 px, and a saved hard shadow is the old march byte for byte` | "Long Shadow Length still stops at 80 px …" |
| `1068 B5 Long Shadow smooth edges - a new slanted shadow is feathered, its lit faces stay clear, and at right angles and diagonals it is the hard march exactly` | "Long Shadow has no Edges control …" |

- **Every test has controls:** the fixture casts, the caster renders crisp, an 80 px shadow falls short where 150 reaches,
  and Hard has no part-dark pixel.
- **Exact checks run on the kernel,** against the OLD kernel and the OLD march written out in the test (`b5OldMarch`). The
  parity check uses a coloured shadow, so a stray write at alpha 0 still shows.
- **Pixel checks go through `FM.renderScene`** on a white ground, with these tolerances:
  - `TOL1068 = 0`
  - `TOL1068A = 2`
  - `LIT1068 = 24`
  - All three are marked `TODO(first run): measure`.

**Mutations to run** (each with `--only` on the test named):

- `rsCap=Math.min(255,Math.round(Math.max(0,Math.min(100,rsOp))*2.56))` → `…*2.55))`. Expected: the Radial Shadow test, at
  "a saved Radial Shadow (no Quality, no Opacity) no longer draws as the old kernel did" (cap 199, not 200).
- `fparam(p, 'opacity', 78, t)` → `fparam(p, 'opacity', 100, t)`. Expected: "a saved Radial Shadow … no longer draws as the
  old kernel did".
- `if(Math.abs(lsSlope)<1e-9)lsSlope=0; else ` → `` (drop the zero snap). Expected: the smooth-edges test, at
  "at 90 degrees a Smooth Long Shadow is not the hard march" (or at 180).
  - With the crossed-pixel fix, an unsnapped slope only blends a ray 1e-15 away. It writes the colour at alpha 0 where the
    march writes nothing, on the rows where the float drift crosses a pixel boundary (x 50, rows 59-71 of the fixture).
  - So this one depends on float spacing. If it SURVIVES, the snap is belt-and-braces for this kernel rather than dead
    code, and the test comment should say so.
- `var lsA0=lsStep-lsLast[lsIdx]<=lsLen?1:0` with the update loop moved before the paint loop (the pile's order). Expected:
  "the line beside the lit top face … is N dark". Easier as a by-hand revert than a mutate.sh string.
- `{ key: 'edges', label: 'Edges', def: 1, legacy: 0,` → `{ key: 'edges', label: 'Edges', def: 1,`. Expected: "Edges is
  made at 1 with legacy undefined".

## #545: the picture owed before this ships (LAND-LIST: "Send a before/after sheet")

Render through the app, at shipped size and at 2×:

- **Radial Shadow:** Opacity 78 next to 100, and Quality 10 next to 32.
- **Long Shadow:** Hard next to Smooth at 23° and at a shallow angle (5–10°, the known-limit line), plus a 300 px reach.

## Not checked here

The other seven B5 commits (`1db725a6 0df427eb 061581f0 a0732c3d b2ce43ae b986fcc4 cfa3859e`) were not re-audited. The
brief said only these two never landed.
