# #966 backlog §B — B8, B2, B15 on `hunt/fxnew-looks` (13 Oct)

Built on `8004fa16` (hunt/fx-land-on-fb2). Spec: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B2, §B8, §B15 and §0.3.
**Nothing was run** — no node, no browser, no tests — because the API builder was shipping. The proof is written and waiting:
`prove.sh` in the helper's scratchpad (below). His rule (#545) is that he picks the look before anything ships; the build did not
wait, so every choice he is shown is already an option on the effect or a look in the library. His pick sets defaults or deletes
four looks; nothing gets rebuilt.

## What was built

| Item | Where | What |
|---|---|---|
| **B8** twelve filter looks | `js/filters.js` (end of FILTERS), photos in `js/fx-thumbs.js` FILTER_SUBJECT | Handheld, X-Ray, Pencil, Stained Glass, Watercolour, **Etching** (Stylised) · Autumn, Green Code, Sky Grad (Cinematic) · Solarised (Black / White) · LED Wall (Light / Glow) · Darkroom (Tuff, carries flashdark). Recipes are new-prep's (`tools/design/plans/new-effects/filter-candidates.js`), unchanged. |
| **B2** Colour Flash | `js/compositor.js` (B966_ROWS + `PIXEL_FX.colorflash`), `js/fx-registry.js`, `js/fx-thumbs.js` | type `colorflash`, Opacity / Visibility, beside Flash (darken). Only RGB moves, so the layer never disappears. |
| **B15** Shape Wipe | the same three files (`PIXEL_FX.shapewipe`) | type `shapewipe`, Keying, beside Wipe and Radial Wipe. It follows their rules. |

Both effects are **batch 42**: appended after E1's six, so the first 211 effects keep their places. kitchen921 relies on that.
They lead the New row, which is the newest-first rule (913.8 learned that a new effect must get its own batch). Busters:
`compositor.js 220`, `fx-registry.js 28`, `filters.js 21`, `fx-thumbs.js 56`. fx-registry was `27.32`, and the helper's
`treecheck.py` reads only the integer part, so 27.33 would have read as not bumped. 28 is above both readings.

### B2 Colour Flash: controls (defaults in bold, his pick may change them)
- **Mode** — **Pulse** / Single / Random.
  - **Pulse**: flashes at Rate on the clip's own clock (FM.fxLocalTime, like Flash (darken)'s rhythms), so the first flash lands when the clip starts.
  - **Single**: Progress 0..1 is the position inside one flash. 0 and 1 leave the picture untouched, so keyframing 0 → 1 across a cut gives the dip to white.
  - **Random**: one flash per beat, at a hashed place inside the beat. The gaps are uneven; Pattern re-rolls them.
- **Rate** 0.5–30 Hz (**2**).
  - A keyframed Rate is integrated from the clip's start (queue 913 / land-b3 F1), so easing it down never runs the flashes backwards.
  - It is held at half the project's fps (Flash (darken)'s lesson).
- **Flash length** 1–99 % of each beat (**25**). **Offset** 0–1 beat (**0**). **Pattern** 0–99 (Random only).
- **Curve** Sharp / Smooth / **Decay**. **Strength** 0–1 (**0.8**). **Blend** **Normal** / Add / Screen / Multiply. **Flash colour** (**white**).
- Each control is greyed out where it does nothing (overriddenBy / liveWhen).

### B15 Shape Wipe: controls
- **Progress** (**0.5**, notch 0.005 like the wipes) is how much is **revealed**: 0 shows nothing, 1 shows everything, exactly.
  - The brief said "0 = untouched". Wipe's own tests (#904, #690, #482 12.3) define 0 as nothing, and Shape Wipe follows them, as the brief asked.
- **Shape** **Circle** / Ellipse / Rectangle / Diamond / Star / Heart.
  - Ellipse and Rectangle take the frame's own proportions (the classic frame-shaped iris that reaches all four sides at once).
  - The other four are drawn true.
- **Centre X / Y**, **Rotation**, **Stretch** 25–400 %.
- **Edge softness** 0–200 px. It is in project px, so the phone's 0.28 preview feathers exactly like the export.
- **Fit to** Frame / Layer. **Invert** keeps exactly what the wipe hides and turns Progress round.
- Signed-distance shapes (Quilez's, plus a folded five-point star), so the feather is a true pixel width.
- Kept out of CROP_FX.

## CCTV's replacement
In Chrome on 13 Oct, #675's measure put **CCTV 2.3 from Old Film**, a near-duplicate. The node model had placed it 14.8 from
Fog: Chrome read CCTV's mean as 97 where the model said 115, and nothing in the prep explains why. The other eleven matched the
node model to within 2.3.

**Etching**, the reserve, replaced it. It measured furthest from everything in node: 17.4 from Platinum, 18.1 from X-Ray.
Underwater was 10.9 from Old Film, the very neighbour CCTV collapsed onto, and Synthwave was 12.5 and carries Scanlines like CCTV.
Etching is built only from ingredients whose node readings Chrome confirmed on the other eleven.

**Etching has never been rendered in Chrome.** The probe below gives its first reading, and '966 B8 … queue 675's measure' holds it
to > 10.

## Low Key's tile moved (bush → cat)
Autumn's whole idea is foliage turning gold, and `bush` is the only fx-art photo with foliage. Low Key had bush in Cinematic, and
test 778 forbids a photo twice in a section. So Low Key moved to `cat`, the warm subject on dark soil its own note asks for. The
probe draws Low Key on bush and on cat side by side for him.

## Existing tests adjusted, and why
- The library pins taken before the twelve leave them out (`b966PreB8`): 482 polish 1, 5.2 (Green Code carries Highlights & Shadows), 5.3–5.5, 6.0 ×2, and 6.3's all-filters hash. A pin of "the library" means the library it was captured on.
- **E1** now asserts that its six *follow the first 205*. They are no longer the last six.
- **745** keeps compoundblur and matchgrade. pixelsort and lumamatte leave the twelve by the newest-first rule.
- **913.8** asserts that Snow & Rain sits behind only newer effects, and that the newest registered effect leads.
- **queue 264 sweep** ALLOWED gets two entries:
  - `shapewipe:progress=min`, the twin of `wipe:progress=min`.
  - `shapewipe:invert=max`: at the default 0.5, the opened circle (275 of 551 px) already holds that fixture's whole layer (270 px). This is fixture geometry, and the comment says so.
- On 8004fa16 all of these keep the verdict they had. The repo's prove.sh will list them as changed tests that catch nothing, because they are adjustments, not proofs. The eight new tests are the proofs.
- The collab **SCHEMA_FP moves** with the two new registries' params. It is **left alone**, as asked, and computed in the gap. prove.sh prints the new number.

## The sheet: `render-probe.js` (+ `recv.py`) for the next browser slot
How to run it is in its header. It POSTs each page as a JPEG to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`
(`?fmrecv=` works too). No page is more than ~1.8× as tall as it is wide.

| Page | What it shows |
|---|---|
| `b15-shapes-hard.jpg` / `b15-shapes-soft.jpg` | The six shapes at Progress 0.5, clouds opening onto the city shot (9:16), hard and with 40 px softness. **Circle is marked recommended.** |
| `b15-variants.jpg` | Progress 0.1 → 0.9, then Invert, Diamond at 45°, Star at 36°, Heart stretched 150 %, and an off-centre circle. |
| `b2-flash.jpg` | Ten variants, each as 12 frames over one second on the dusk photo: default (recommended), Sharp / Smooth / Decay at 50 %, Random, Single dip to white, Add gold, Screen sky, Multiply red, dip to black. |
| `b8-looks-p1..p3.jpg` | Each look big on its photo, beside "as shot" and the three existing filters nearest on #675 (re-taken in Chrome), with that measure printed. |
| `b8-lowkey-subject.jpg` | The Low Key question. |
| `fxnew-probe.json` | The Chrome #675 table for all twelve, including Etching's first reading. |

## Questions for Ezra
1. **Which eight looks?**
   - Recommended, from the 13 Oct sheet: Handheld, X-Ray, Pencil, Autumn, Stained Glass, LED Wall, Darkroom, plus Watercolour in CCTV's place.
   - Etching is new to the sheet. The four he does not pick are deleted before the release ships.
   - This is still beside #912's ten, which are unpicked on `fm912-filters`.
2. **Low Key's tile on cat** (Autumn takes bush). Keep it, or pick another photo?
3. **Colour Flash defaults**: Pulse 2 Hz, 25 %, Decay, 0.8, white — or another row from the strip?
4. **Shape Wipe**:
   - Should the default shape be Circle?
   - Should Ellipse and Rectangle follow the frame's shape (as built), or be fixed shapes?
5. **Names**:
   - "Handheld" (the backlog's Game Boy is Nintendo's).
   - "Solarised" sits one letter from the Solarize effect.
   - "Etching" is built on Halftone Lines, whose #954 rename is "Engraving".
   - Colour Cycle's search words still include "colour flash". Should that alias come off now that a real Colour Flash exists?
6. **Colour Flash on an adjustment layer**, i.e. flash the whole frame on a cut. It is not offered yet:
   - The adjustment path (`applyPixelFx`) does not hand the kernel the layer, so Pulse would run on the comp clock.
   - It needs that passed through, plus ADJ_OK / PIXEL_ADJ.
7. Colour Flash is a pure point op, so it could join CROP_FX for speed. Admission is by `tests/_692crop.html`, which needs a browser, so it is not in yet.

## What prove.sh checks (`…/scratchpad/agents/fxnew-looks/prove.sh` → `prove-result.txt`)
1. It refuses while `/home/ezra/FreeMotion/.ship-in-progress` exists.
2. `node --check` on the four changed js files, tests.js parsing, and the probe parsing as an async function body.
3. The eight new tests (fx-c's soft-canvas harness, via `runb.js`): each must FAIL on 8004fa16's js by name, not as a TypeError, and PASS here.
   - B8's first test loads fx-art photos, which node cannot decode. Its static half (sections, recipes unclamped, CSS first, subjects) runs first, and a "no photo" failure after it is reported as browser-only.
4. The existing filter, wipe, featured, pin and sweep tests on both trees (8004fa16 with its own tests.js; this tree with its own): every verdict must match.
5. The schema FP: the fx-land control first (expect 1856346714373782, match true), then the base, then this tree (expect a mismatch).
6. `treecheck.py 8004fa16 HEAD` and `drops.py 8004fa16 HEAD`.

## Not done here
- The four unpicked looks still have to be deleted once he picks.
- SCHEMA_FP still has to be pinned.
- The sheet still has to be rendered in a browser slot.
- The browser-only half of the B8 test (each look moves its photo) still has to be seen green in Chrome.
