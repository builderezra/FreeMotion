# #966 backlog §B27 — Venetian Blinds on `hunt/fxnew-blinds` (15 Oct)

Built on `fb24f68b` (the §B chain tip, hunt/fxnew-drums), which holds B15 Shape Wipe — this effect's closest sibling, and the
model for every convention below. Spec: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B27 ("progress, count 2–60 (10),
angle, softness, stagger, fit").
**Nothing was run** — no node, no browser, not even `node --check` — because the API builder was live. The proof is written and
waiting: `prove.sh` in the helper's scratchpad (below). His rule (#545) is that he picks the look before anything ships; the build
did not wait, so every choice on the sheet is already an option on the effect. His pick sets defaults; nothing gets rebuilt.

## What was built

| Where | What |
|---|---|
| `js/compositor.js` (`VB_ROWS`, `PIXEL_FX.blinds`, just before `FM._FX_TABLES`) | type `blinds`, **Venetian Blinds**, Keying, beside Wipe, Radial Wipe and Shape Wipe |
| `js/fx-registry.js` | CATEGORY_OF **batch 48** (`blinds: 'matte'`, last, so it leads the NEW row; clarity's comment no longer claims it), search words |
| `js/fx-thumbs.js` | `blinds: kf01('progress')` — the tile sweeps Progress, like the wipes |
| `index.html` | busters: compositor 224 → **225**, fx-registry 28.36 → **28.37**, fx-thumbs 59 → **60** |
| `tests/tests.js` | three `966 B27 …` tests; the shared lists (below) |

### Controls (defaults in bold)
- **Progress** 0–1 (**0.5**, the wipes' 0.005 notch) is how much is **revealed**: 0 shows nothing and 1 everything, exactly (the
  wipes' early returns). It is a value, not a speed — keyframe it to run the transition; nothing is integrated.
- **Slats** 2–60 (**10**), cut across the box's depth along the Angle (Wipe's `|w cos| + |h sin|`), so 10 is ten bands at any Angle.
- **Angle** 0–360° (**90**) is the way the slats open, as Wipe's Angle is the way its edge travels: **90 level slats opening top to
  bottom (the window blind)**, 0 upright left to right, 270 bottom to top, 45 / 135 diagonals.
- **Opens from** **Side** / Middle — each slat wipes from its leading side (the classic transition), or opens from its own middle
  out to both sides (a blind turning on its rod). Not in the backlog line; added because it is a different look for one row.
- **Stagger** 0–100 % (**0**): 0 every slat together; above 0 one after another in the way of travel; 100 % strictly in turn.
  Slat k of n runs over a window `w = 1 − s(1 − 1/n)` of Progress starting `k(1 − w)/(n − 1)` in — so 0 and 1 stay exact.
- **Edge softness** 0–200 px (**0**), project px (`unit: 'px'`; pxToPlate scales it, so the kernel declares five arguments on
  purpose). As Wipe's, the feather travels from wholly outside at a slat's 0 to wholly past at its 1. Wider than a slat, the
  blinds fade through their slats instead of wiping (on the sheet).
- **Fit to** **Frame** / Layer (alphaBox12, as the wipes). **Invert** **Off** / On keeps exactly what the blinds hide and turns
  Progress round — the way out of a shot.
- Pure: no state, no Math.random, the clock only through keyframes. Only alpha changes; a transparent pixel is never touched.
  **Not in CROP_FX** (the slats are cut from the plate, like Shape Wipe's).

Search words: venetian, venetian blinds, blinds, blind, slats, stripes wipe, blinds wipe, blinds transition, transition, reveal.
Not "stripes" alone (the Stripes generator's word). Name: "Venetian Blinds" is the craft name (After Effects has one); it is in
neither Alight Motion list `tools/design/954-effect-names.md` was built from, so nothing there to avoid.

## The tests (each fails on fb24f68b on its first line, naming the effect)
1. **`966 B27 Venetian Blinds is in the registry …`** — Keying (CONTROL: Shape Wipe is), routed, not in CROP_FX, label,
   description, search words, the eight controls in order with options / ranges / units / defaults, the 0.005 notch, Edge softness
   the only px control (40 → 11.2 on the 0.28 plate, Slats untouched), a bare one = its defaults, after Shape Wipe and Clarity &
   Dehaze, the head of the New row behind only newer effects, a tile that sweeps Progress and opens.
2. **`966 B27 Venetian Blinds — Progress 0 shows nothing …`** — the ends over 144 combinations; half at 0.5 in exactly Slats bands
   (bands counted down / across 600-px strips at 2, 7, 10, 33, 60 slats, level and upright); Angle 90 level / 0 upright / 270 the
   mirror of 90 / 45 neither; Stagger 50 % slat by slat from the top, 100 % five open and five shut, from the bottom at 270
   (CONTROL: 0 every slat alike); softness feathers and keeps the half (CONTROL: the hard cut has no partial pixel); Invert exact,
   hard and soft; Middle shows rows 3–6 of a slat where Side shows 0–3; Fit to Layer cuts a corner title into its own four
   slats; steady opening. Every hard edge in its fixtures falls between pixel centres, so the counts are exact.
3. **`966 B27 Venetian Blinds through the real compositor …`** — the 0.5 and 0.28 plates = the export box-averaged down, within
   **`B27_PLATE_TOL` = 5, a guess marked TODO(first run)**; the measured numbers lead the failure message (prove.sh 3b forces the
   bound to −1 to print them); CONTROL: the feather left at plate px. Then stateless, and a keyframed Progress = that value plain.

## Shared tests touched (the merge notes)
- **E1's `LATER`**: `'blinds'` appended. **745's `NEWEST_FIRST`** and **913.8's `NEWER`**: `'blinds'` at the FRONT (913.8:
  seventeen newer than Snow & Rain). Other §B agents built from the same base add their ids the same way — merge by hand: every
  id goes in, the newest batch first, and the CATEGORY_OF lines in batch order (the one written last leads the NEW row, and only
  that line should say "The newest").
- **queue 264 `ALLOWED`**: `'blinds:progress=min'` only (wipe:progress=min's twin). Unlike Shape Wipe, Invert at the default 0.5
  keeps the other half of every slat on that fixture, so `invert=max` is NOT listed; the comment says why each other extreme keeps
  part of the layer (Stagger 100 % the top five slats, Slats 2 rows 480–720, Angle 0 upright slats, softness 200 a quarter to three
  quarters shown).
- The inert sweep ('effects: no effect slider is completely inert'), read, not run: on its 96 × 72 frames at the defaults, Progress,
  Slats (2 → 56 changes the bands), Angle (0 → 335°), Stagger (moves each slat's share at 0.5) and Edge softness (0 → 34 px is a hard
  cut turned to a feather) all move pixels. 784 (bare = defaults) holds by the kernel's fallbacks being the registry's; 793 reads
  the defs (no `fparam(` literal to disagree); zero-jump: Progress 0 and Angle 0 each draw differently from their defaults.
- Busters: compositor 225, fx-registry 28.37, fx-thumbs 60 — every other §B branch from fb24f68b bumps the same three from the same
  numbers, so the merge takes one number above all of them. **C.SCHEMA_FP left alone** (the new params move it; prove.sh prints the
  number).

## The sheet: `render-probe.js` for the next browser slot
How to run it is in its header (tools/serve.sh + `tools/design/plans/fxnew-looks/recv.py` + tools/shot.py). It POSTs each page as a
JPEG to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'` (`?fmrecv=` works too), a fresh Image per tile. Clouds over city,
9:16, as Shape Wipe's sheet. Every page is under 2× as tall as wide.

| Page | What it shows |
|---|---|
| `blinds-big.jpg` | three big tiles half open: the default (**recommended**), Opens from Middle, Stagger 50 % |
| `blinds-count.jpg` | strips over Progress 0.1 → 0.9: Slats 4, 6, **10**, 16, 30 |
| `blinds-angle.jpg` | strips: Angle **90**, 0, 270, 45, 135 |
| `blinds-stagger.jpg` | strips: Stagger **0**, 25, 50, 100 %; Middle; Middle + Stagger 50 % |
| `blinds-soft.jpg` | strips: Edge softness **0**, 10, 30, 80 px; Invert; Fit to Layer on a card 60 % of the frame |

## Questions for Ezra
1. **Default look**: 10 level slats opening top to bottom, together, hard edge — or another row from the strips (more slats,
   Stagger 25–50 %, a soft edge)?
2. **Angle 90 as the default** (level slats, like a window blind) — Wipe's default is 0 (left to right). Keep 90?
3. **Opens from Middle** — keep it as a second choice, or drop it (the backlog did not ask for it)?
4. **Stagger order**: the slats open in the way of travel (top first at 90). Is a reverse / from-the-middle order wanted too?

## What prove.sh checks (`…/scratchpad/agents/fxnew-blinds/prove.sh` → `prove-result.txt`)
1. It will not start (and stops between stages) inside a ship, a lock run or a live API builder without a helper slot (gapcheck.sh).
2. `node --check` on the three changed js, tests.js parses, the probe parses as an async body; no CRLF, `git diff --check`, no mode change.
3. The three new tests (runb.js — fx-c's harness plus the FM.scene shim Shape Wipe's tests needed): each FAILS on fb24f68b's js
   naming the missing effect (not a TypeError) and PASSES here; then the plate test with the bound forced to −1, for the numbers.
4. Wipe / Radial Wipe / Shape Wipe / queue 264 / 784 / inert / visible / the shared NEW-row tests and the other §B row checks on
   both trees with this tests.js — the same verdicts; then the ORIGINAL E1, 745 and queue 264 on this js — they fail (why edited).
5. The schema fingerprint of both trees; `treecheck.py fb24f68b HEAD` and `drops.py fb24f68b HEAD`.

## Not done here
- `B27_PLATE_TOL` has to be set from the first run's numbers (prove.sh 3b prints them).
- The sheet has to be rendered in a browser slot, and his pick applied as defaults.
- SCHEMA_FP still has to be pinned (with the other §B branches, in the gap).
