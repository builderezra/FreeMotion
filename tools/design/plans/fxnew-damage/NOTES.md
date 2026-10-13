# #966 B7 Film Damage and B16 Trance Gate / Stutter — `hunt/fxnew-damage`

Branch `hunt/fxnew-damage` (helper clone, local, NOT pushed), on `8004fa16` (hunt/fx-land-on-fb2: every #966 / #482 polish batch,
batches 7 / 8's audio params, E1's six new effects). Backlog: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B7, §B16.

**NOTHING HERE HAS RUN.** The API builder was shipping, so this branch ran no node, no browser, not even `node --check`.
Every threshold in the tests is reasoned from the maths it names. The proof is written and waiting:
`scratchpad/agents/fxnew-damage/prove.sh` (below), and the sheet probe `render-probe.js` beside this file.

#545 applies to both: he picks the look and the sound on the sheet before either ships. The code does not wait for that.

## What was built

### B7 Film Damage (`filmdamage`, Stylize, a PIXEL_FX kernel) — commit 1

One effect, with a section for each kind of projector wear. Each section has its own amount:

| control | key | range (start) | what it does |
|---|---|---|---|
| Scratches | `scratches` | 0–1 (0.2) | Up to six scratch tracks. A scratch runs down the frame (some stop part way), lasts 14–54 film frames, drifts and jitters a little, and is wavy. |
| Dust | `dust` | 0–1 (0.3) | Up to 30 specks a film frame. Mostly small, now and then a clump. |
| Hairs | `hair` | 0–1 (0.1) | Up to 3 thin curling hairs a frame. |
| Dirt | `speck` | Dark / Light / **Both** | Dark is dirt on the print, Light is dirt on the negative. Applies to all three marks. |
| Flicker | `flicker` | 0–1 (0.2) | The lamp. One brightness multiply per film frame (±32 % noise and an 8 % sway at 1). |
| Gate weave | `weave` | 0–10 **px** (1.5) | The frame wanders in the gate: sideways, and up and down at 0.45 of that. Sub-pixel. The edge pixel repeats, so no gap opens. |
| Burns | `burn` | 0–1 (0) | A warm bloom from one edge, whiter at its core. A new edge every 40 film frames. It swells and dies within that time, and never goes fully away. |
| Splice jumps | `splice` | 0–1 (0) | Up to a quarter of the film frames slip 8–35 % of their height. They show the black frame line between two frames and pop 1.25× brighter. A golden-ratio walk spaces them evenly. |
| Colour fade | `fade` | 0–1 (0) | The dyes fade toward **Fades to**. |
| Fades to | `fadeto` | **Pink** / Sepia / Grey | Pink is the magenta cast of faded colour film. Sepia is warm brown. Grey drains the colour and lifts the blacks. |
| Projector speed | `rate` | 6–30 fps (18) | How often the wear changes. Keyframable, and integrated when keyed. |
| Pattern | `seed` | 0–999 (0) | Gives another set of wear. |

- **Every section at 0** returns before it touches a byte. That means Gate weave 0 as well; the default weave is 1.5.
- **Stateless.** Every mark is a hash of (film frame, Pattern, index). It never uses `Math.random` and never reads the frame before. The lesson is #986 C31's.
- **Clip clock.** The film frame counts on `FM.fxLocalTime`, as E1's Colour Cycle does, so moving a clip carries its damage with it. A keyed Projector speed counts with `FM.integrateCount` (batch 2's F1).
- **Sizes follow the frame.** They do not follow the plate. A mark is sized against the frame's short side (in "pixels of a 1080 frame") and placed in fractions of the frame. Below one plate pixel a mark keeps its ink:
  - scratches by exact box coverage;
  - specks by a splat shared over four pixels;
  - hairs by an ink factor.
  So the 0.28 phone preview is the export shrunk. Gate weave is the one project-pixel control, and the kernel takes `ps` itself.
- Full plate (it is not in CROP_FX). It is a new type, so no saved project, filter or look changes.
- Registry: CATEGORY_OF batch 42, so it leads the NEW row. Search finds it by: old film, vintage, scratches, dust, projector, film burn, retro, aged, damaged, super 8, silent film.
- Busters: compositor 219 → **220**, fx-registry 27.32 → **27.33**.

### B16 Trance Gate / Stutter (`trancegate`, Dynamics, audio) — commit 2

| control | key | range (start) | |
|---|---|---|---|
| Pattern | `pattern` | Eighths / 16ths / Offbeat / **Trance** / Dotted / Long / Triplets / Half-time / Random | Each is a bar of 16 steps. Random is eight seeded bars, the same every time. Rebuilds. |
| Step rate | `rate` | 0.5–16 Hz (8) | Steps a second. Keyframable. Greyed while Tempo is on. |
| Tempo / Note | `bpm` / `note` | 8.7's sync. Note starts at **1/16** | 120 BPM at 1/16 is 8 steps a second. |
| Depth | `depth` | 0–1 (1) | How far it closes. 0 is the clip untouched. |
| Attack / Release | `attack` / `release` | 0.5–50 ms (2) / 0.5–100 ms (10) | Round every opening and closing (raised cosine). Rebuild. |
| Stutter | `stutter` | **Off** / ×2 / ×4 / ×8 | The first slice of every bar's last beat, replayed. Rebuilds. |
| Output, Mix | | 8.1's wrapper | Added automatically. |

The patterns (x open, - shut, one bar):

| pattern | steps |
|---|---|
| Eighths | `x-x-x-x-x-x-x-x-` |
| 16ths | `x-` per 32nd |
| Offbeat | `--xx--xx--xx--xx` |
| Trance | `xx-xx-x-xx-xx-x-` |
| Dotted | `x--x--x-x--x--x-` |
| Long | `xxx-xxx-xxx-xxx-` |
| Triplets | half of each triplet 8th |
| Half-time | `xx--xx--xx--xx--` |

How it is built:
- **Nodes only.** The file's header forbids a worklet or a ScriptProcessor.
- **The gate** is one cycle of the pattern, drawn into a buffer with its edges already rounded. It is looped on the existing LFO machinery: `shop.lfo` gains a `buffer` option. So step 1 lands on the song's beat in the export and in the preview. Gain = (1 − Depth) + Depth × gate.
- **The stutter** is a DelayNode whose time is a staircase on the same clock. A 2.5 ms dip sits under each jump.
- **`TEMPO()`** gains a Note default. Every other effect keeps 1/4.
- **Rebuilds:**
  - Pattern, Attack, Release and Stutter rebuild the live chain, because they redraw the buffers.
  - Step rate, Tempo and Note rebuild only when they cross an octave of speed. Within an octave the drawn rounding plays at most twice or half as long. The export always draws it for its own speed.
- Search finds it by: stutter, chop, chopper, gate, rhythm, beat, trance, pump, sidechain, on off.
- Buster: audio-fx 18 → **19**.
- **No icon of its own.** It falls back to the Dynamics glyph (Gain's), because a new icon is drawn and picked first (#545).

## What the sheet shows (render-probe.js, for the next browser slot)

Run it with `scratchpad/recvshot.sh fxnew-damage …/render-probe.js <out> fxnd`. The full line is in the probe's header.

**Film Damage** on his `fx-art/clouds.jpg`. Each row is six film frames: `fd-NN-<row>.jpg` strips, plus `fd-sheet-1.jpg` and `fd-sheet-2.jpg`. The rows are:
- the photo;
- the defaults;
- each part alone: Scratches, Dust, Hairs, Dirt Dark, Dirt Light, Flicker;
- Gate weave, as a 2× crop with a fixed red guide line;
- Burns and Splice jumps;
- Colour fade Pink, Sepia and Grey;
- five starting points: **Light wear, Worn print, Silent era (Grey, 16 fps), Home movie (Sepia, burns), Trashed reel**.

**Trance Gate** as WAVs, at 120 BPM with Note 1/16:
- all nine patterns on a held C minor pad (made in the probe) and on `tests/_fixtures/vad/music-only.wav`;
- Trance soft (12 / 40 ms), hard (0.5 / 0.5 ms) and Depth 0.5 on the pad;
- Stutter ×2, ×4 and ×8 alone, and Trance with Stutter ×4, on the music.

The music's own tempo is unknown, so the pad is the fair listen. Levels are not normalised.

## Questions for Ezra

1. **Film Damage's look**: are the defaults right, or is it too clean or too dirty? Which of the five combinations should ship as starting points? If any, they could go in the Presets list (`FM.EFFECT_PRESETS`) once he picks.
2. **Fades to**: are Pink, Sepia and Grey the right three, and is "Pink" the right word for the magenta cast? Is Dirt starting at **Both** right?
3. **Old Film and Super 8 filters**: should they swap their scanlines for Film Damage? That changes two library filters, so it is his pick, and it moves queue 675's distances.
4. **The name "Trance Gate"**: it is the studio term, and not a product name as far as I know. Or does he want something plainer, like "Beat Chop"?
5. **Trance Gate's sound**: is Trance the right starting pattern, and are Attack 2 ms and Release 10 ms right? These are to judge on the WAVs.
6. **Stutter**: only the last beat of every bar is built. Does he want:
   - every beat, every 2 bars, or the start of the bar? (buildable the same way);
   - a stutter of the **next** slice, a reversed stutter, or a random one? These need a worklet or a look-ahead buffer, which this file does not allow today;
   - Stutter as **its own tile** too (a Trance Gate at Depth 0, Stutter ×4)?
7. **Icon**: Trance Gate shows the Gain glyph. Should options be drawn (square pulses)?

## What prove.sh checks (scratchpad/agents/fxnew-damage/prove.sh — WRITTEN, NOT RUN)

It refuses to start while `/home/ezra/FreeMotion/.ship-in-progress` exists, and checks again between stages. Results go to `prove-result.txt` beside it.

1. `node --check` on every changed js and on tests.js. The probe is parsed as shot.py's async body.
2. The seven `966 B7` tests, through `fx-c/runc.js` (soft canvas), on 8004fa16's js and on the tip's. 7/7 must FAIL on the base, each saying there is no Film Damage. 7/7 must PASS on the tip.
3. The four `966 B16` tests, through `fxnew-voice/hv.js` (wa.js renders), on both trees. 4/4 must FAIL on the base (no Trance Gate) and 4/4 PASS on the tip.
4. `fx-all2/fp.js subset`:
   - the fx-land control must give 1856346714373782, match true;
   - the base must match;
   - the tip must NOT match. That is expected: print it, it is the number to pin.
5. The neighbours on both trees, which must give the same verdicts:
   - video: Film Grain, Old Film, VHS, Flicker, the queue 264 sweep, 784, E1, 745, 913.8, every-effect-visible, no-slider-inert, the #691 px test, 986 C5, #484, featured-row. 913.8 alone may differ: it now wants Film Damage first.
   - audio: `482 7.2 Tremolo` and `482 8.`, covering `shop.lfo`'s buffer and TEMPO's Note default.
6. `treecheck.py 8004fa16 HEAD`, `drops.py`, and no CRLF.

Still owed after it: Chrome at 1280 and 380 (`?only=966%20B7`, `?only=966%20B16`), the three changed tests, the queue 264 sweep, the 921 / 482 3.6 / simple P1 fingerprint tests once re-pinned, the two panels by eye at ~380 px (the 9-button Pattern row must wrap and fit), and the sheet.

## Merge notes

- **Three existing tests changed**, because Film Damage is now the newest effect and the NEW row is newest-first:
  - `E1 the six new effects are in the registry…`: the six may be followed by a later batch (a `LATER` list).
  - `913.8 Snow & Rain…`: the row leads with `filmdamage`, and weather is within the first eight.
  - `745: the featured carousel…`: `pixelsort` has left the row.
  
  Other §B branches change the same three in the same way. Merge by hand: the newest effect leads, and every branch's ids go in E1's `LATER`.
- **CATEGORY_OF**: `filmdamage` is batch 42, the last line before `filter`. If another §B branch adds a batch, the later one leads, and 913.8 / 745 follow whichever is last.
- **The collab fingerprint moves.** Two new effects mean new registry params, both visual and audio. `C.SCHEMA_FP` was **left alone on purpose**, so `921 S1 the schema fingerprint gate`, `482 3.6 Collab…` and `simple P1 · the collab fingerprint…` are red until it is re-pinned. Re-pin once, after everything else that adds an effect lands. SCHEMA_REV likewise.
- **Busters** (all above 8004fa16's): compositor 220, fx-registry 27.33, audio-fx 19. Re-check them against whatever ships first.
- **No queue 264 ALLOWED entries.** No Film Damage extreme erases the layer: weave repeats edges, a splice wraps, burns and flicker only scale or brighten, and a fade lifts.
- **`shop.lfo` `buffer` and `TEMPO(…, noteDef)`** are additive. Every existing caller is unchanged (`noteDef` undefined → 1/4; no `buffer` → the named wave).

## Names (#954, #484)

"Film Damage" and "Trance Gate" are in neither Alight Motion list (`tools/design/954-effect-names.md`). Both are generic craft names, which #954's answer keeps. The control names are plain words. No product names are used, in the labels or in the search tags.
