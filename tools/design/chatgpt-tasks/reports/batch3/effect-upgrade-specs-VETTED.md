# Six effect upgrades: vetted

Vets `effect-upgrade-specs.md` (ChatGPT, snapshot `28104a3e`, v17.21). I checked it against the **current tree** on 1 Oct. That tree is v17.22, uncommitted batch 6 (glow, shadow, vignette, flares), and none of the six kernels differ from the snapshot. Batch 6 has only moved them down the file. Every line number below is in today's `js/compositor.js` unless another file is named.
Cross-checked against `../effects-pack-VETTED.md` §C and the #966 backlog (`tools/design/plans/2026-09-29-idle-backlog/backlog.md`: §0.3 rules, 10.7, C33).

**How the claims were checked:**
- Everything here comes from reading the code.
- I reproduced the arithmetic for the Posterize, Dots and Grid points with `osascript -l JavaScript`.
- I took no browser renders. Each upgrade still needs a before/after picture before it ships (see the end).

## Verdict in one table

| # | Upgrade | ChatGPT's spec | Main fix |
|---|---|---|---|
| 1 | Pixelate: Keep outline | Right idea. The citations hold. Two things are missing. | It needs a colour un-premultiply, or the edges go faint. On an adjustment layer the control does nothing (and Aspect and Edges already do nothing there). |
| 2 | Mosaic: Tile bevel | **Default light angle is wrong.** Its 45° lights the top-RIGHT in the house convention. "Depth %" is undefined. | Use `light` "Light from" at 135 (top-left), plus a separate strength control. Bevel is a % of the tile. |
| 3 | Dots: offset rows and ovals | **The ovals clip.** An oval dot at the default size is cut flat by its cell above 156%. | Stretch the cell with the dot (house `aspect`, as Pixelate and Mosaic do). Use house key `stagger`. |
| 4 | Grid: bold lines | **Inert at the default.** "Every 4" at 100% weight does nothing, so moving the interval changes nothing. | `major` 0 = Off by default; `majorweight` 2× and only live when it is on. Bold lines must stay visible on a reduced preview. |
| 5 | Contour Lines: bold lines | **Inert at the default** (same as Grid). **Its 400% max is a performance trap**: brute-force dilation at radius 23 is about 2,200 tests per pixel. | Same keys as Grid. Separable dilation. Cap the weight at 4×. |
| 6 | Posterize: band offset | The idea and the range are sound. **The fast-path gate is not mentioned.** **Luma only + offset turns shadow noise into saturated speckles.** | Add `off===0` to the fast-path gate. Range ±45%. Add the luma-mode lift rule. |

**The "byte-identical at defaults" argument holds for all six, but only if each new branch is gated off at its default.**
- I checked every identity numerically. `x+0`, `x*1`, `x/1` and `Math.round(x*1)` are exact.
- Even so, the house pattern (Emboss `def135`, Long Shadow 45, Posterize's own fast path) is to run the **literal old loop** at the default rather than rely on the identity. Every spec below says so.
- Two of ChatGPT's six had a second defect at the default: Grid and Contour Lines shipped a control that is on but invisible.

**Keys.** None of ChatGPT's keys clash with existing keys on these effects (`outline`, `bevel`, `lightAngle`, `rowOffset`, `oval`, `majorEvery`, `majorWeight`, `offset`). But four of them invent names where the catalogue already has one:
- `stagger` "Row offset" (Tile Grid, 728);
- `aspect` (6 effects);
- `light` "Light from" (16 3D shapes);
- `offset` "Band offset" (Contour Strips, 905).

The table below uses the house keys. This also matches effects-pack-VETTED §C, except where noted.

---

## 1. Pixelate: Keep outline

**Today:**
- Catalogue 101–105 has `size`, `aspect` and `smooth`.
- `drawPixelate` (15009) downscales the plate with smoothing, then upscales it. The size ≤ 1 path returns early at 15037.
- Canvas averages premultiplied colour, so an edge block comes out as the interior colour at **partial alpha**. That is the stepped, half-transparent rim the control is meant to remove.

**Control:**

| Key | Label | Range | Default | Notes |
|---|---|---|---|---|
| `outline` | Keep outline | 0–100 % | 0 | Fine as ChatGPT named it. effects-pack-VETTED used `keepalpha`; either works. Neither clashes, and nothing reads `params.outline` generically (the only `'outline'` in the app is the Stroke tile id, inspector.js:6521). |

**Fix: what "keep the outline" has to do.** ChatGPT says to keep the original alpha. Done naively with `destination-in` against `_pxA`, that gives alpha = block α × original α. An edge block at 40% then makes a 40%-faint rim, which is the opposite of clean. Instead:
1. After the downscale, `getImageData` the **small** canvas (sw × sh, which is cheap).
2. Set α = 255 wherever α > 0. getImageData has already un-premultiplied the colour.
3. `putImageData` it back, upscale as usual, then `destination-in` with `_pxA`.
4. Between 0 and 100%, lerp the two results in premultiplied space: draw both onto a scratch canvas with `lighter` at weights (1−k) and k.
5. Edge case: a block whose average α rounds to 0 has no colour to give. Those pixels stay transparent, which is correct.

**Fix: reach.** The control only shows on a layer that has an alpha edge: text, shapes, stickers and cutouts. **On an opaque full-frame clip it changes nothing.** Say so in the row's `note`, and build the before/after picture on text, not footage.

**Fix: adjustment layers.**
- Pixelate is **not** in `PIXEL_ADJ` (17782), despite what effects-pack-VETTED says. It reaches an adjustment layer through `ADJ_OK` (fx-registry.js:173) and its own `pixFx` branch (18140–18157).
- That branch reads **only `size`**. So on an adjustment layer, `aspect` and `smooth` already do nothing today, and `outline` would be a third dead control.
- No per-control "not on adjustment layers" flag exists (`liveWhen`, `liveAbove` and `overriddenBy` all key off another parameter). The cheapest honest answer is a `note`.
- **Side finding (not in ChatGPT's report, not logged anywhere I could find):** Block aspect and Edges are dead on adjustment layers. They are worth making work there; `pixelateOnFrameGrid`, 17906, would need an aspect. That is a separate item.

**Byte-identical:** holds if the whole new path is gated by `outline > 0`. It must run after the existing upscale and must not reorder the existing `imageSmoothingEnabled` sets. Cost at the default is zero.

## 2. Mosaic: Tile bevel

**Today:**
- Catalogue 376–381 has `size`, `aspect`, `gap` and `sample`.
- The kernel (6683) **declares `ps`**, so `pxToPlate` skips it (3931 `fn.length >= 6`). Any new px-sized key would have to be scaled by `ps` inside the kernel. Declaring `unit:'px'` alone would silently give a different picture in the preview and in the export (#691).
- The tile interior after the gap inset is `[moX0,moXe) × [moY0,moYe)` (6698).

**Controls (corrected):**

| Key | Label | Range | Default | Notes |
|---|---|---|---|---|
| `bevel` | Tile bevel | 0–50 % | 0 | Rim width as a % of the tile's shorter side; 50 = a full pyramid. A % follows Block size and needs no `ps`. ChatGPT's "% depth" did not say what the % is of. effects-pack-VETTED's px version would need hand-scaling. |
| `relief` | Bevel strength | 0–100 % | 50 | `overriddenBy:'bevel', liveAbove:0`. ChatGPT folded width and strength into one slider. |
| `light` | Light from | 0–360 ° | **135** | `overriddenBy:'bevel', liveAbove:0`. |

**About the light angle:**
- The house convention is 0 = right, 90 = top. Smooth Bevel's "Light from" (877) and the 3D shapes' `light` (11974–11982) use it, and Emboss's 135 also lights top-left (6257–6266).
- **ChatGPT's 45° default lights the top-RIGHT**, which contradicts its own description ("light rim on the top/left").
- effects-pack-VETTED's 225 (Bump Map's default) lights the bottom-left. 135 is the default that matches the description.
- Key `light` rather than `angle`, so `angle` stays free for a future tile rotation. The label matches the 16 shapes.

**How to build it:**
- Gate it with `if (bevel > 0)` as a **separate** pass after the existing fill. The fill loop stays as it is.
- For each pixel with α > 0 inside the tile:
  - Take the edge distances `dl, dr, dt, db` and their minimum `m`.
  - If m < bw, take the outward normal of the nearest edge (sum the normals on a tie, so the corners mitre).
  - s = relief × 0.6 × dot(n, L) × (1 − m/bw), where L = (cos θ, −sin θ) for θ = `light` is the unit vector toward the light in screen coordinates (y runs down). At 135, L = (−0.71, −0.71), so the left and top rims light and the right and bottom darken.
  - Lighten (c + (255−c)s) or darken (c(1+s)).
- bw = max(1, round(bevel/100 × min(tileW, tileH))).
- Share this helper with backlog 10.7, Hexagon Tiles "Edge shade", as effects-pack-VETTED says.

**Byte-identical:** holds. At 0 the new pass never runs.

**Side finding (pre-existing, affects how the picture looks):** the Average mode sums **straight** RGB over every pixel, transparent ones included (6692: `moSr+=moS[moI]` with no alpha weight). getImageData returns transparent pixels as 0,0,0, so a tile half over a white cutout comes out as **mid-grey at 50% alpha**: a dark fringe Pixelate does not have. Fixing it (an alpha-weighted mean) changes default output on cutout edges only. No filter recipe uses Mosaic, so queue 675 is unaffected. It still needs its own before/after and his OK. Do not fold it into this item silently.

## 3. Dots: offset rows and ovals

**Today:**
- Catalogue 388–393 has `size` (Spacing, px), `radius` (0.05–0.7 of the cell), `opacity` and `softness`.
- The kernel (6763) declares `ps`.
- Each pixel tests **only its own cell's** centre (6777). So a dot with a radius above half a cell is already cut square today, at radius > 0.5.

**Fix: ChatGPT's `oval` clips.** Its version stretches only the dot's vertical radius. At the default radius 0.32, ry passes half a cell once oval > 156% (0.5/0.32, reproduced). From there to 400% the dots are sliced flat at the cell boundary and read as bars, not ovals. **Stretch the cell height and the dot together** instead: row pitch = size × aspect and ry = rx × aspect. That is exactly what `aspect` already means on Pixelate ("Block aspect") and Mosaic ("Block height"). The gaps scale with it and nothing clips.

**Controls (corrected):**

| Key | Label | Range | Default | Notes |
|---|---|---|---|---|
| `stagger` | Row offset | 0–1 | 0 | The house key and label (Tile Grid, 728). 0.5 = classic half-drop. 1 looks like 0, so animating 0 → 1 slides the rows in a seamless loop. Odd rows shift by stagger × spacing; row parity = floor(y / rowPitch) & 1. |
| `aspect` | Dot height | 25–400 % | 100 | Stretches the cell and dot together (above). Softness feathers along the scaled distance √(dx² + (dy/aspect)²). |

Both are unitless, so the kernel's own `ps` handling is untouched.

**Byte-identical:** the identities are exact (`x−0`, `y/1`). Even so, gate it with `if (stagger===0 && aspect===100)` and run the literal old loop, as the kernel already does for `dt_rP===0.32` (6777).

## 4. Grid: bold lines

**Today:**
- Catalogue 369–374.
- The kernel (6662) takes 5 named arguments and reads `ps` from `arguments[5]`, so `pxToPlate` scales `size`.
- Default line width = max(1, round(32 × 0.06)) = **2 px** (6667).
- Lines occupy the first `grLW` px of each cell, so they are not centred.

**Fix: inert default.** ChatGPT has interval 4 and weight 100% on by default. With the weight at 1× nothing changes, so **the "Major line interval" slider moves and nothing happens**. That is the dead-control pattern its own `dead-effect-controls.md` hunts for. The picture is still byte-identical, but the control lies.

**Controls (corrected, as in effects-pack-VETTED):**

| Key | Label | Range | Default | Notes |
|---|---|---|---|---|
| `major` | Bold line every | 0–16 | 0 = Off | Counted from the plate origin. Uses the rotated u/v when Angle ≠ 0. |
| `majorweight` | Bold line weight | 1–5 × | 2 | `overriddenBy:'major', liveAbove:0`. |

**Build notes:**
- mLW = clamp(**max(grLW + 1, round(grLWraw × w))**, ≤ grSize − 1).
  - The `+1` floor matters. On the phone's 0.28 preview, spacing 32 becomes 9 plate px. The unrounded line is 9 × 0.06 = 0.54, so grLW = 1. Doubled it is 1.08, which also rounds to 1. **Without the floor the bold lines vanish on his phone while the export shows them** (2 px against 4 px).
  - The ≤ grSize − 1 cap stops a 50% line at 2× filling the whole cell.
- Grow the major line around the thin line's centre: test `((u + pad) mod (size·N)) < mLW` with pad = floor((mLW − grLW)/2).
- effects-pack-VETTED says to ship this with C33 (Grid is aliased; backlog 12.5). Note that **C33's anti-aliasing changes the default picture**. So it cannot share this item's "byte-identical" claim, and it needs its own before/after. Either ship them separately, or label the release honestly.

**Byte-identical:** holds when gated on `major > 0`.

## 5. Contour Lines: bold lines

**Today:**
- Catalogue 559–564.
- The kernel (7203) takes 5 arguments, so `thickness` (unit px) arrives already scaled by `ps`.
- Thickness T is a **brute-force square dilation** of radius T − 1 over the hit mask (7232–7239), at up to 121 tests per pixel at T = 6.

**Fix: inert default** (same as Grid). **And a performance trap.** ChatGPT's max is 400% × T = 6, which gives a dilation radius of 23. That is 47² ≈ 2,200 tests per off-line pixel, about 4.6 G per 1080p frame, i.e. seconds per frame.

**Controls (corrected; the same keys as Grid, so one test helper covers both):**

| Key | Label | Range | Default | Notes |
|---|---|---|---|---|
| `major` | Bold line every | 0–12 | 0 = Off | effects-pack-VETTED called it `accent`. I chose `major` to match Grid; the label is the same either way. |
| `majorweight` | Bold line weight | 1–4 × | 2 | `overriddenBy:'major', liveAbove:0`. |

**Build notes:**
- Mark a hit as major when the band jump it sits on crosses a level k with k % N === 0, i.e. any k in (min(bc,bn), max(bc,bn)]. A steep edge can cross several levels in one pixel.
- Dilate the major mask **separably**: a row max, then a column max. That is exact for a square, and costs 2r per pixel.
- Major thickness = max(T + 1, round(Tscaled × w)), the same phone-visibility floor as Grid. Then OR the major mask into `clHit`.
- Keep the queue 474 bound: loop over W·H, not the shared buffer.

**Byte-identical:** holds when gated on `major > 0`. The old `clTh>1` branch is untouched.

## 6. Posterize: band offset

**Today:**
- Catalogue 106–111.
- `posterizePixels` (14817) is shared by the per-layer path (14542) and adjustment layers (17885).
- The fast path at 14822 is gated on `mix===1 && ch===0 && gm===1`.
- **Three shipped filters use Posterize** (filters.js:153, 157, 456), so a default that moved anything would fire queue 675.

**Fix: the gate.** ChatGPT says offset 0 "must not perturb that loop", but never says the gate has to change. Unless `&& off===0` is added at 14822, a non-zero offset with the other three at their defaults takes the fast path and **is ignored**: the commonest case would be dead.

**Control (corrected):**

| Key | Label | Range | Default | Notes |
|---|---|---|---|---|
| `offset` | Band offset | **−45 to 45 %** of one band step | 0 | The key and label are the house's (Contour Strips, 905). But note its unit there is a fraction of the **whole** tonal range, and here it is a fraction of **one band**. The "%" read-out keeps that honest. |

**Why ±45 and not ±50:**
- +50% and −50% put the thresholds in the same places, so the end stops are redundant.
- `Math.round` rounds .5 up, so at exactly +50% every pixel sitting on a level jumps up one, and **pure black lifts to the first grey**. At −50% pure white does not drop.
- ±45 keeps both ends pinned and loses nothing.

Index = clamp(round(v/step + off), 0, q−1) in RGB mode. In the gamma path, use `round(x·(q−1) + off)`.

**Fix: Luma only + offset.** That mode scales RGB by s = Lq/l (14838). With an offset, a near-black pixel can get a huge s. Reproduced at q 5, offset +0.5: shadow noise (2,3,9) becomes **(38,56,169)**, a saturated blue (s = 18.8). At offset 0 and gamma 1, s never passes **2.04** (an exhaustive sweep, q 2–16). So:
- in Luma mode with `off !== 0`, cap the multiplier at 2;
- add the remaining lift to all three channels equally: n = c·min(s,2) + max(0, Lq − 2l);
- the luma still lands exactly on Lq.

Gate this on `off !== 0` so saved Gamma ≠ 1 projects stay byte-identical.

**Byte-identical:** holds with the gate change. `v/step + 0` is exact. No recipe sets `offset`, and filters.makeInstance fills `def: 0`.

---

## Release checklist for whoever builds these

- **Every new key goes in the catalogue entry, or the sanitiser drops it** (the whitelist-drift lesson). Add `liveAbove` gates as listed.
- **Collab:** `SCHEMA_REV` is 7 in the tree (collab-core.js:44). New keys change `SCHEMA_FP` (243), so bump the rev and re-pin, as batches 2–6 did.
- **Tests:** follow the batch pattern ("every default byte-identical", pinned against the previous release's render):
  - all six at default, saved (key absent) and new (key = `def`);
  - the 3 Posterize filters plus the queue 675 distance test;
  - preview = export for each control at ps 0.28 and 1. **Grid and Contour bold lines must be visible at 0.28.**
  - Each fails on HEAD (rule 18 / prove.sh).
- **Pictures for him before shipping (#545):**
  - Pixelate: on **text or a cutout** (it does nothing on footage).
  - Mosaic: at 0 / 20 / 50 % bevel, light 135.
  - Dots: stagger 0.5 and aspect 200%.
  - Grid and Contour Lines: bold every 4.
  - Posterize: Luma only at −30 / 0 / +30 % on dark footage, which is where the speckle fix shows.
  - Phone size, through the app.
- **Out of scope, worth logging separately:**
  1. Pixelate's Aspect and Edges are dead on adjustment layers (18140–18157).
  2. Mosaic's Average darkens cutout edges (6692).
  3. C33's anti-aliasing is not byte-identical, so it is its own item.
