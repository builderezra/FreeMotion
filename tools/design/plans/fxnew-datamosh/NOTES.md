# #966 backlog §B17 — Datamosh Bloom on `hunt/fxnew-datamosh` (15 Oct)

Built on `fb24f68b` (the §B chain tip, hunt/fxnew-drums). Spec: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B17 ("amount,
hold 'Freeze reference', block 4–64 px, decay 'Heal', chroma; push the previous output with Motion Blur (Footage)'s `_mfField`;
history-dependent, label it like Temporal Denoise").
**Nothing was run** — no node, no browser, not even `node --check` — because the API builder was live. The proof is written and
waiting: `prove.sh` in the helper's scratchpad (below). His rule (#545) is that he picks the look before anything ships; the build did
not wait, so every choice on the sheet is already an option on the effect. His pick sets defaults; nothing gets rebuilt.

## Why this and not a duplicate (checked first)
- **The Datamosh FILTER** (queue 690, `js/filters.js`, id `datamosh`, in the Filters tab) is a still look: Compression Crunch's blocks
  plus Glitch's slices on each frame on its own. Nothing moves with the footage and a frame never depends on the one before.
- **Pixel Sort** calls itself "the datamosh look" in a comment; it re-orders pixels within one frame. **Motion Blur (Footage)** smears
  along the motion; **Time Echo** shows the layer's past; **Frame Stutter** holds frames. None keeps the old picture and drags it.
- `ssh/main` REQUESTS.md / POLISH-LOG.md: "datamosh" finds only the filter (queue 690, v17.44's pinned pictures); "mosh", "bloom",
  "smear" find glows and the motion blurs. The registry has no temporal mosh. So B17 was built.

## The name — a question for him (Q1)
**Datamosh Bloom**, type **`moshbloom`** (recommended). "Bloom" is what datamoshers call exactly this (the old picture blooming
along the new motion). The type is deliberately NOT `datamosh`: `FX_FEATURED` and the effects browser hide an effect whose type is a
filter's id (the clash guard in fx-registry), so `datamosh` would have vanished from the NEW row. In search, "datamosh" finds this
effect in the Effects browser and the filter in the Filters tab — two different tabs, two different names.
Alternatives if he wants them further apart: **Mosh Smear**, **Pixel Bloom** (closer to the glows — 954's proposed renames include
Highlight / Shadow / Dreamy Bloom), or keep this and rename the filter **Datamosh Look**. "Datamosh" is a generic word used by many
apps and tutorials; I could not search for trademarks here (no web), so treat that as unchecked rather than cleared.

## What was built

| Where | What |
|---|---|
| `js/compositor.js` (`DMB_ROWS`, `CANVAS_FX.moshbloom` and its helpers, just before `FM._FX_TABLES`, after Clarity) | type `moshbloom`, **Datamosh Bloom**, Stylize; routed by POSTFX, in **CFX_NO_BBOX** (it must see every frame, an empty one too); `FM._moshBloomPush` seam |
| `js/fx-registry.js` | CATEGORY_OF **batch 48** (`moshbloom: 'stylize'`, last, so it leads the NEW row; clarity's comment no longer claims it), search words |
| `js/fx-thumbs.js` | OVERRIDES `moshbloom` (after `temporaldenoise`): the same inner Orbit as the temporal tiles, Amount 1, Heal 0, Block 24, so the strip reads as moshed; **GHOST_GATED** gains it |
| `js/fx-browser.js` | **MOTION_FX** gains it: on a layer that cannot move the tile says why it does nothing |
| `js/export-resume.js` | **TEMPORAL_FX** gains it, with its own pre-roll (below) |
| `index.html` | busters: compositor 224 → **225**, fx-registry 28.36 → **28.37**, fx-thumbs 59 → **60**, fx-browser 98 → **99**, export-resume 7 → **8** |
| `tests/tests.js` | thirteen `966 B17 …` tests; the shared lists (below) |

### Controls (defaults in bold)
- **Amount** 0–1 (**0.7**, the backlog's) — how much of the mosh shows over the clip. 0 = the clip, byte for byte. It only mixes what
  is shown: the history never depends on it, so a keyframed Amount reveals a bloom that has been building all along.
- **Start at** 0–120 s (**0**), key `hold` — seconds into this clip where the picture stops refreshing. Put it on the cut.
  ⚠️ **Why a time and not the backlog's keyframable "Freeze reference" switch**: in this app a toggle or an options row is never
  keyframable (`keyframable: false` in fx-registry's paramsOf), so "keyframe it to start the bloom" cannot be built as a switch. A 0/1
  slider could be keyframed, but keyframes interpolate, so it would sit half-on between two keys — a trap. Start at is one slider he
  sets once (scrub to the cut, read the clip time, type it), no keyframes, and before it the effect is invisible. What it cannot do is
  start a second bloom later in the same clip (Q2).
- **Block size** 4–64 project px (**16**) — the squares the picture is dragged in. The kernel takes `ps`, so the phone's 0.28 plate
  lays a 0.28× grid: the export's, shrunk.
- **Heal** 0–1 (**0.1**), key `decay` — how fast the smear clears back to the clip: 0 never; 1 halves the difference every 30th of a
  second. Time based, so 24, 30 and 60 fps exports heal alike.
- **Colour bleed** 0–1 (**0.5**), key `chroma` — the colour heals at Heal × (1 − Colour bleed) while the brightness heals at Heal, so
  old colours linger over new shapes. Greys out (and says why) while Heal is 0, where it does nothing.

### How it works
- **Before Start at**: the clip, byte for byte; only the last frame is remembered.
- **From Start at**: what it shows is what it showed last frame, PUSHED along the movement between the clip's last frame and this one —
  `_mfField`, Motion Blur (Footage)'s block-matched field (160 wide whatever the plate) — one whole integer vector per Block size
  square, read bilinearly between the field's blocks at the square's middle, so neighbouring squares slide by different amounts (the
  macroblock look); edges repeat. At a cut the two shots share no movement, so the old shot is held whole, and from then on the new
  shot's movement drags it. Then Heal pulls it toward the clip (brightness and alpha at Heal, colour at Heal × (1 − Colour bleed), in
  premultiplied colour so a transparent edge heals without a dark fringe), and Amount mixes it over the clip.
- **The mosh is kept in 256ths of a level** (a Uint16Array), not bytes: in bytes a slow Heal stalls — at 0.1 a frame moves a pixel 5 %
  of the way, which rounds to nothing within 10 levels, leaving a ghost of the old shot for ever. A channel within one level of the
  clip is put on it, so Heal always finishes.

### History, scrub and export — what a scrub shows (Temporal Denoise's rules, in the same `_mfRec` store)
- One record per **layer AND plate size** (the key carries both — better than the model, whose key is the layer alone): the phone's
  preview plate and a full-size render never share, or thrash, one history. The store holds 13 at most (LRU, shared with the other
  temporal effects); each record is the clip's last frame (a canvas) and the mosh (W × H × 4 × 2 bytes). The exporter's
  `FM.resetMotionFlowCache()` clears them all before every export.
- **Export / in-order playback**: built frame by frame; the same frames in give the same bytes out.
- **The first frame it sees, a jump BACK, a jump forward of more than 0.35 s, or a new plate size** shows the CLIP, and the bloom grows
  again from that frame — exactly as if the clip had started there (a test pins this).
- **A forward scrub of up to 0.35 s** keeps moshing, with the movement between the two frames it landed on — so a scrub's picture is
  not the export's.
- **Before Start at nothing is remembered but the last frame**, so playing from ANY point before Start at shows what exports (apart
  from the phone's own frame steps). Playing from after Start at starts the bloom where playback started.
- **The same instant drawn again** (a paused repaint, a Luma Matte's second render of its source) shows the stored mosh re-mixed at
  the current Amount; it neither advances nor resets the history. So a Heal / Block / Colour change while paused shows from the next
  frame on, and an edit to the layer while paused shows the old mosh until the playhead moves — both as Temporal Denoise.
- **Ghost renders** (onion skin, the "changes nothing" probe, under `FM._mfGhost`) pass the picture through untouched.
- **A resumed export** (`js/export-resume.js`) pre-rolls back to Start at (the earliest, if keyframed) — with Heal 0 nothing fades —
  or only as far as Heal still remembers: log(0.02) / log(1 − Heal/2) 30ths of a second (the slowest Heal, if keyframed), whichever is
  nearer; never under the 25 every temporal effect gets; nothing extra when the seam is before Start at.
- **Labelling**: the description ends "It builds frame by frame, so play from before Start at to see what exports; after a jump the
  clean clip shows and the smear grows again", and Start at's note says to put it on the cut.

### On a still clip
Nothing moves, so nothing is pushed: Heal then pulls toward the same picture and the layer shows unchanged. It does not do that
silently: the effects browser badges the tile on a layer that cannot move — "Nothing moves inside this layer, so there is nothing to
drag the picture along and it shows unchanged. It reads the picture frame to frame: put it on video, or on a layer that moves."
(fx-browser MOTION_FX, the same `cannotMove` test as Motion Blur (Footage)). It works on video, on a shape or text that moves, and on
a GROUP (the flattened group picture — two clips in a group, Datamosh on the group, Start at on the cut, is the across-two-clips use).
Not on an adjustment layer (a canvas effect; ADJ_OK is grading only) — Q3.

## The tests (each fails on fb24f68b on its first line: "no registry entry for moshbloom (Datamosh Bloom) — the effect is not built")
The kernel is driven in order, a frame at a time, on a layer id of the test's own, exactly as the dispatcher calls it. **The old
shot** is a code picture — red = x, blue = y, green chosen so the brightness is 128 everywhere (±0.3): flat to the motion search, and
any moved pixel's colour says where it came from. **The new shot** is a grey bar (164) sliding right 6 px a frame over grey (128): low
enough contrast that the search's off-frame penalty (40 a pixel) never beats a real match. Cut at frame 3 (0.1 s), Start at on it.
1. **catalogue** — Stylize (CONTROL: Pixel Sort is), POSTFX, canvas only, CFX_NO_BBOX, the eight search words, label, the description
   says "frame by frame", the five rows (ranges, units, defaults, labels, keyframable), Colour bleed gated by Heal, px keys = [block],
   offered on video/shape/text/group and not adjustment; the Datamosh FILTER is still there under its own name and this type is no
   filter id; the sanitiser keeps a fresh one whole; bare = new frame for frame across a run; leads the NEW row; through FM.renderScene
   a card that jumps 140 px is moshed ≥ 3000 px five frames on (CONTROL: Amount 0 = no effect within 2 levels).
2. **first frame / Amount 0 / before Start at** — the first frame is the clip; Amount 0 and Start at 5 s are the clip byte for byte
   over the whole cut run (CONTROL: at defaults the last frame is ≥ 2000 px off the clip).
3. **the drag** (Heal 0, Amount 1) — the cut frame is the old shot exactly; rows 104–152: ≥ 1500 moved pixels, ≥ 95 % from their left on
   their own row, some ≥ 12 px, none implausibly far; rows < 64 and ≥ 192 untouched (0 px); CONTROLS: Amount 0 = the new shot, Amount 0.5
   = halfway within a level.
4. **Heal** — cut to a still flat shot: Heal 1 is not the clip on the cut, IS the clip byte for byte 12 frames on; Heal 0 = the old shot
   byte for byte for 20 frames; Heal 0.1 nearer every frame and still > 5 levels off after 20.
5. **Block size** — the dragged region meets the rest only on the grid: 12 px lines at 12, 20 px at 20, and 12 px lines for Block 24 on a
   half-size plate (the export's grid shrunk); `FM._moshBloomPush` with a field of the test's own moves every 8 px square whole
   (CONTROL: the 12 and 20 px runs have edges off each other's grid).
6. **Colour bleed** — red → blue at Heal 0.5, four frames on: bleed 0.9 still red (R − B ≥ 60), bleed 0 blue (R − B ≤ 0), brightness
   within 2; at Heal 0 bleed changes nothing.
7. **determinism and no sharing** — the same run twice, after `FM.resetMotionFlowCache`, and through FM.renderScene twice: identical;
   two layers, and one layer on a 256 and a 128 plate, interleaved frame by frame = each alone (CONTROL: each alone is moshed).
8. **the scrub rule** — back to frame 5 = the clip; frame 6 then = a fresh start at 5 and ≠ the in-order frame 6; +0.4 s = the clip;
   +0.3 s keeps moshing; the same instant again = the same bytes, Amount 0 there = the clip, Amount 1 again = the mosh, and the next
   frame = a twin that had no repaints; a ghost render passes through and leaves the history alone.
9. **keyframed Amount** — at frames 6, 10, 14 a keyframed Amount (0 → 1) draws exactly that Amount plain (CONTROL: clip at the first key,
   moshed at the last).
10. **plates** — the jumping card played in order through FM.renderScene: the 0.5 and 0.28 plates within **`B17_PLATE_TOL` = 5, a GUESS
    marked TODO(first run)** of the export shrunk by area; CONTROLS (the clip; a run healing at 0.5) must exceed 1.5 × the bound;
    prove.sh 3b forces the bound to −1 to print the numbers.
11. **every slider moves the picture** — Amount, Start at, Block, Heal, Colour bleed each move the last frame ≥ 20 px (the canvas twin
    of the inert sweep, which walks only PIXEL_FX).
12. **resumed export** — in TEMPORAL_FX; pre-roll 121 / 31 / 31 / 77 / 25 / 25 frames for (Heal 0, seam 4 s), (Start 3), (Start 1 on a clip
    from 2 s), (Heal 0.1), (Heal 1), (seam before Start); > 0 without fps.
13. **dead-here** (Chrome only — it drives the effects browser) — on a still photo the badge names "move"; animated → quiet; a video →
    quiet. In node it fails on the tip with "cannot be observed (FM._fxDeadHereWhy …)"; prove.sh expects exactly that.

## Shared tests touched (the merge notes)
- **E1's `LATER`**: `'moshbloom'` appended. **745's `NEWEST_FIRST`** and **913.8's `NEWER`**: `'moshbloom'` at the FRONT (913.8:
  seventeen newer than Snow & Rain). B27 (blinds), B28 (radiowaves), B29 (lensmag) and B30 (circarray) did the same from the same base —
  merge by hand: every id goes in, the newest batch first.
- ⚠️ **MERGE POINT: CATEGORY_OF "batch 48"** — B27–B30 also wrote batch 48 from fb24f68b. Renumber in merge order (48, 49, 50…); the
  line written last leads the NEW row, and only that line should say "The newest". The compositor blocks push onto `FM.EFFECTS` in file
  order and 913.8 wants the LAST pushed to lead, so the block order must match CATEGORY_OF's.
- **queue 264 `ALLOWED`**: nothing added. The sweep renders single frames at t 0.5 on one layer, and a first frame is always the clip
  (every later variant is "the same instant again" with nothing stored, so the clip again) — no extreme can erase the layer there. In
  real use Amount 1 + Heal 0 on a cut to a transparent picture CAN leave the old picture where the clip is empty, which is the effect.
- **Which sweeps see it** (Temporal Denoise's precedent — none needed a special case for it either): inert and '482: every effect does
  something visible' walk PIXEL_FX only (test 11 is the canvas twin). 784, zero-means-zero, the sanitiser sweep, 793 and queue 264 walk
  every effect with single frames on fresh layers, where a history effect shows the clip: 784 (bare = defaults, both the clip), zero (0
  and the default both the clip, and the dial never moves a single frame, so nothing is called swallowed), 793 (registry defaults =
  kernel fallbacks, every key read through `fparam`). '691b no canvas effect has a pixel-sized setting' slices the CANVAS_FX literal; this
  kernel is assigned outside it like Time Echo's, and takes `ps` anyway. '794' lists four ghost-gated effects by name and needs nothing.
- **Busters**: compositor 225, fx-registry 28.37, fx-thumbs 60, fx-browser 99, export-resume 8 — the §B siblings bump the same from the
  same numbers, so the merge takes one number above all of them. **C.SCHEMA_FP left alone** (the new params move it; prove.sh prints it).
- Insertion points: compositor after Clarity's kernel, before `FM._FX_TABLES`; fx-registry CATEGORY_OF and SEARCH_ALIASES after clarity;
  fx-thumbs OVERRIDES after `temporaldenoise` (not after `weather`, where B30 went — no overlap) and the GHOST_GATED line; fx-browser
  MOTION_FX; export-resume TEMPORAL_FX and a branch after Time Warp Scan's; tests after "end 966 B22". Keep every block.

## The sheet: `render-probe.js` for the next browser slot
How to run it is in its header (tools/serve.sh + `tools/design/plans/fxnew-looks/recv.py` + tools/shot.py). It POSTs each page as a JPEG
to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'` (`?fmrecv=` works too), a fresh Image per row.
**Frames are rendered IN ORDER**: each row is one layer (its own id, so its own history) rendered at every frame from 0 to the last
shown, a 30th of a second apart, and keeps the frames it shows; the clip is made by repainting the layer's own media canvas before each
render — the dog photo drifting, then at frame 6 (0.2 s, Start at) the car photo panning left 14 px a frame and zooming slowly. A
1080 × 1920 project, each tile that frame shrunk (the plate scale the phone uses), so Block size shows at its real share.

| Page | What it shows (each row: before the cut, +2, +6, +12, +24 frames) |
|---|---|
| `moshbloom-big.jpg` | the defaults big at the phone preview's own scale: the clip at +12, then +2 (**recommended**), +12, +24 |
| `moshbloom-amount.jpg` | the clip (Amount 0), 0.4, **0.7**, 1 |
| `moshbloom-block.jpg` | Block 8, **16**, 32, 64 |
| `moshbloom-heal.jpg` | Heal 0 (never clears), 0.05, **0.1**, 0.3 |
| `moshbloom-colour.jpg` | Colour bleed 0, **0.5**, 1 at Heal 0.2 — and Start at half a second after the cut |

The summary it returns includes the defaults' mean level distance from the clip at +2 / +6 / +12 / +24 (a check that the sheet does not
show an effect that did nothing).

## Questions for Ezra
1. **Name**: "Datamosh Bloom" (recommended) — or Mosh Smear / Pixel Bloom — and should the Datamosh FILTER become "Datamosh Look" so the
   pair reads clearly?
2. **Start at** a time in the clip (built) rather than a keyframable switch (not possible for a switch in this app) — fine? And does he
   want a second bloom later in the same clip (a "Refresh at" / restart), or is one per clip enough?
3. **Two clips cut on the timeline**: the effect is per layer, so today the cut has to be inside one clip, or both clips go in a group
   with Datamosh on the group. Does he want it on an **adjustment layer** over the cut instead (the way most editors do it)? That needs
   the adjustment path to run a canvas effect with history — a bigger build.
4. **Defaults**: Amount 0.7 (the backlog's — the clip shows through) or 1 (pure mosh)? Heal 0.1 (clears in about two seconds)? Block 16?
5. Wanted later? A **push boost** (drag further than the footage moves), **mosh only what moves** (a threshold), or a **direction** lock.

## What prove.sh checks (`…/scratchpad/agents/fxnew-datamosh/prove.sh` → `prove-result.txt`)
1. It will not start (and stops between stages) inside a ship, a lock run or a live API builder without a helper slot (gapcheck.sh).
2. `node --check` on the five changed js, tests.js parses, the probe parses as an async body; no CRLF, `git diff --check`, no mode
   change, every buster raised.
3. The thirteen new tests through `rund.js` (fx-c's runc.js + js/export-resume.js): each FAILS on fb24f68b's js naming the missing effect
   (not a TypeError); on this branch twelve PASS and the Chrome-only dead-here test fails for its own stated reason; then the plate
   test with the bound forced to −1, for the numbers.
4. Temporal Denoise, Motion Blur (Footage), Frame Stutter and Time Warp Scan's tests, the resume pre-roll, 794 / 906 / 907, the Datamosh
   filter's pinned pictures (482 polish 1, 5.3, 6.0), 482 11., the sweeps (784, queue 264, visible, inert, px settings, 691b, zero,
   sanitise, 793), the search tests (#484), the shared NEW-row tests and Clarity's batch on both trees — the same verdicts; looks' B2 /
   B15 through runb.js; then the ORIGINAL E1 and 745 on this js — they fail (why edited).
5. The schema fingerprint of both trees; `treecheck.py fb24f68b HEAD` and `drops.py fb24f68b HEAD`.

## Not done here, and what I am unsure of
- **Never run, never seen.** The look is unverified until the sheet is rendered; the tests are written against my reading of
  `_mfField` (the bar fixture's tracking, the cut frame finding no movement). If a test's own CONTROL fails, suspect the fixture first.
- `B17_PLATE_TOL` has to be set from the first run's numbers (prove.sh 3b prints them). Test 1's "Amount 0 = no effect within 2 levels"
  assumes the canvas-effect path rounds a moving card's soft edge at most once more.
- Chrome at 900 and 380 is owed: `?only=966%20B17` (the dead-here test only runs there), and 913.8 / 745 / 747 / 784 / queue 264 / 794.
- SCHEMA_FP still has to be pinned (with the other §B branches, in the gap).
- Unmeasured on his phone: each moshed frame reads the plate back twice and writes it once, plus a JS pass over every pixel — at the
  0.28 preview plate about 160k pixels; at a 1080 × 1920 export about 2M (expect tens of ms a frame there).
- **`_mfField` breaks ties toward the first shift it tries (the most up-and-left).** Where a picture gives the search nothing to tell
  vertical shifts apart (a flat-coloured shape with straight sides moving sideways), it reports a diagonal vector, and the mosh then
  drags the old picture diagonally there. Real footage has texture and rarely ties; the tests' bar is shaded top to bottom for exactly
  this reason. Preferring the zero-nearest shift on a tie would fix it, but `_mfField` is Motion Blur (Footage)'s too, so that is a
  separate change (it would move the footage blur's pictures).
- Two Datamosh Blooms on one layer share one record (as two Temporal Denoises do): the second shows the first's mosh. Harmless, but
  not two independent blooms.
- Like Temporal Denoise: an effect ABOVE it on the same layer that re-renders the layer at other moments (Time Echo's echoes, a Trail
  with a time offset) makes each of those renders a jump, so the bloom keeps restarting. Below them (Datamosh Bloom last in the list)
  it is fine. Not handled; worth a line in the panel if he hits it.
