# #966 idle work — the next batch: Bokeh Lights (§B10), ASCII Art and a Music cues sound pack (hunt/966-new, 17 Oct)

His standing instruction (#966, 26 Sep, restated 28 Sep): *"you can add new effects. You can add new filters. You can add new sound
effects … more choices always better … this is the complex version we want as much choice as possible"*.

Built in a worktree (`~/fm-helper-wt/966-new`, branch `hunt/966-new`, on `ssh/main` = v17.59 `b2db4f65`) **while the v17.60 release
ship was running, so NOTHING WAS RUN except `node --check`** on every changed js file and `tests/tests.js` (all parse; no CR bytes;
`git diff --check` clean). No node script, no browser, no suite, no prove, no fp.js. Every expected number in the tests is reasoned
from the code it names; every bound a first run must set is marked `TODO(measure after v17.60)`. His #545 rule stands: these are
**built, not picked** — the sheet below goes to him before anything ships.

## 1. The twin check (done before any code)

Searched, for every candidate's type id, name and synonyms: `js/compositor.js` (`EFFECTS` and every `*_ROWS` push), `js/fx-registry.js`
(CATEGORY_OF, SEARCH_ALIASES), `js/filters.js`, `js/sfx.js` (every pack), `js/audio-fx.js`, REQUESTS.md and POLISH-LOG.md, the ChatGPT
pile's `LAND-LIST.md` and `INVENTORY.md`, and — the coordinator's addition — the commit messages of every unmerged `hunt/*`, `helper/*`
(local and `ssh/`) and `codex/*` branch (last 30 each, not on `ssh/main`).

| Candidate | Verdict | Where |
|---|---|---|
| B4 Meme & cartoon sounds | EXISTS | sfx.js Cartoon: Boing, Bonk, Slide whistle up/down, Sad trombone, Air horn, Wobble (v17.49; hunt/fxnew-sfx `42f7c936`) |
| B5 Beeps | EXISTS | sfx.js Interface: Censor bleep, Countdown, Message ping, Heart monitor (`7ce52565`) |
| **B10 Bokeh Lights** | **MISSING** | no `bokeh` type in js/ (the word is only Lens Blur's Anamorphic note); none in any branch log, the pile INVENTORY or LAND-LIST. REQUESTS #911: "Bokeh / Sparkle" was one of four offered on 22 Sep and he picked Snow & Rain — "not requests, not logged as work"; Echo, offered beside it, was built later under #966 (Time Echo), so this is the same standing #966 work, not something he turned down |
| B12 Transitions & glitch sounds | EXISTS | sfx.js Texture: Record scratch, Tape stop, Radio tuning, Digital glitch (`14c86531`) |
| B13 8-bit game sounds | EXISTS | sfx.js Game: Coin, Jump, Power-up, Laser, Game over, Extra life (`e318ef80`) |
| B21 Filter layer | EXISTS (branch) | hunt/pile-filterlayer `5de7473c` — built, waits on his icon pick (pile T01). Skipped as told |
| B50 Channel Mixer | PILE TWIN | pile T02 `6d538904`; LAND-LIST §3 Q5 recommends skipping it (Channel Remap exists); "channel mixer" is already a B&W Mixer search word. Not rebuilt |
| B52 Log to Normal | PILE TWIN | pile T02 `8259b767` V-Log, `a7eb2e87` S-Log3, `1d9895b7` Apple Log, `fd8ffcbb` Canon Log 3 — waits on his camera question (LAND-LIST Q5). Not rebuilt |
| B8 eight filter looks | EXISTS (7 of 8) | filters.js (v17.49): CCTV replaced on purpose (measured 2.3 from Old Film) |
| B55 Corner Pin, B56 LUT | HELD | "already asked" (REQUESTS.md:5405, a name or none); both L |
| B1–B3, B6, B7, B9, B11, B14–B20, B22–B49, B51, B53, B54 | EXISTS | shipped v17.47–v17.51 — confirmed by type id / sound id on v17.59 (Voice, Colour Flash, Time Echo, Star Shine, Film Damage, Word Highlight, Music Visualiser, Soften Skin, Shape Wipe, Trance Gate, Datamosh Bloom, Colour Wheels, Tone Curve, HSL Mixer, Drums, Explosion/Thunder, Reduce Noise, Auto-duck, Clarity & Dehaze, Venetian Blinds … Auto Grade, Deflicker, Spill Suppressor) |

So **§B has exactly one MISSING item, B10**. Everything else is built, on a branch, a pile twin or held on his answer. The batch is
therefore B10 plus two NEW candidates (beyond §B), each twin-checked the same way:

| New candidate | Verdict | Where looked |
|---|---|---|
| **ASCII Art** (Stylize) | **MISSING** | no `ascii` effect in js/ (only "non-ASCII" in collab and zip code); REQUESTS/POLISH-LOG: only the non-ASCII file-name bug (#1044); pile: only ChatGPT's font "ASCII proof" commits (`3991897b`, `854191bf`) — fonts, not an effect; no branch |
| **Music cues** (6 sounds) | **MISSING** | sfx.js has no fanfare / ta-da / harp / gong / drone / sting / stinger; the nearest, kept as they are: Sparkle (Texture: random high pings), Success (Interface: a three-note chime), Drumroll's `suspense` / `tension` tags (a drum roll); no branch or pile twin |

Colour tools were considered and left: §B's two (B50, B52) are pile twins and the LUT is held, and a new grade (e.g. Selective
Colour) is invisible at its defaults, which the `482: every effect does something visible at its own defaults` sweep refuses.
New filter LOOKS were left too: they need the queue 675 distance measured in Chrome, which could not run here.

## 2. What was built, and why these

A generator, a look and a sound pack — the mix he notices most in his short edits: dreamy lights over a shot, a trendy text look,
and the reveal / joke / scare / flashback stings. All three are additive: new type ids and new sound ids only; no existing kernel,
recipe, default, filter recipe or sound was edited, so saved projects render byte-identical.

### Bokeh Lights — `bokeh`, Generative (`proc`), batch 63, a CANVAS_FX (CFX_NO_BBOX)

Soft discs of out-of-focus light drifting over the frame and wrapping round it; the bigger (nearer) ones drift faster.

| Key | Label | Range | Default |
|---|---|---|---|
| count | Lights | 1–300 | 40 (a fractional value fades the last light in) |
| sizemin / sizemax | Smallest / Largest | 2–400 px (`unit: 'px'`), across | 24 / 80 (either way round) |
| soft | Softness | 0–100 % | 60 |
| shape | Shape | Circle / Hexagon / Heart | Circle |
| drift | Drift speed | 0–400 px/s | 20 |
| angle | Drift direction | −180..180 ° (live above Drift speed 0) | −90 (floats up) |
| twinkle | Twinkle | 0–100 % | 30 |
| speed | Twinkle speed | 0.1–10 Hz (live above Twinkle 0) | 1 |
| opacity | Opacity | 0–100 % | 70 (each light 60–100 % of it) |
| colormode | Colours | Two colours / Rainbow | Two colours |
| blend | Blend | Screen / Add / Normal | Screen |
| place | Draw | Over / Behind / Instead of the layer | Over |
| seed | Seed | 0–99 | 0 |
| color / color2 | Light colour / Second colour (Two colours only) | | #ffd27a gold / #ff8fb1 rose |

Stateless (hash of light index and Seed; position = start + ∫ Drift speed along Drift direction — FM.integrateProp, both parts of
the velocity when the direction is keyed; twinkle = ∫ Twinkle speed); project px × the plate scale through `__fmOX/__fmOY`;
fills only (Softness = up to 8 nested copies of the shape, Add sums their shares, Screen / Normal stack them). Seam
`FM._bokehLights(params, t, t0, PW, PH)`. Tile override (sizes 8–26, 26 lights, drift 12) and an inspector "changes nothing" reason.

### ASCII Art — `asciiart`, Stylize, batch 64 (newest: leads the NEW row), a PIXEL_FX taking `ps` itself

Each Character size × ⅓-taller cell becomes ONE character picked by the cell's brightness, drawn from our own 5 × 7 bitmaps (no font,
so every device draws the same character).

| Key | Label | Range | Default |
|---|---|---|---|
| cell | Character size | 4–48 px (`unit: 'px'`) | 12 |
| charset | Characters | Classic / Blocks / Binary | Classic |
| rate | Digit changes | 0–30 /s (Binary only) | 0 |
| contrast | Contrast | 0–200 % | 100 |
| invert | Invert | Off / On | Off |
| colormode | Colour | From the picture / One colour | From the picture |
| bgmode | Background | Solid colour / The picture, dimmed / Clear | Solid colour |
| dim | Picture brightness | 0–100 % (The picture, dimmed only) | 25 |
| mix | Mix | 0–100 % | 100 (0 = the layer byte for byte) |
| color / color2 | Text colour (One colour) / Background colour (Solid) | | #3cff6e / #000000 |

Classic ramp (space . : - + = % * # @) is sorted AT LOAD by how many dots each glyph inks (0, 1, 2, 3, 9, 10, 15, 17, 18, 21 of 35),
so it cannot be out of order. Blocks: an ordered dither at 0/¼/½/¾/all of the cell. Binary: 0s and 1s, brightness by the cell, each
cell re-rolling its digit Digit changes times a second on its own beat (∫ over project time; a hash, never Math.random). Grid from
the plate's corner (Mosaic's rule); not in CROP_FX, not on adjustment layers. Per-cell scratch pooled between frames (zeroed and
fully rewritten each frame). Seam `FM._asciiRamp()`. Tile override (cell 8) and an inspector reason (Mix 0).

### Music cues — six sounds in a new `Music cues` category (js/sfx.js, after Foley)

| id | Name | Default length | Choices | What it is |
|---|---|---|---|---|
| cue-tada | Ta-da | 1.7 s | Pitch, Variation, Length (0.2 + 1.5 × L) | G4 brass pickup, then C major (C4 E4 G4 C5) held, cymbal splash, timpani |
| cue-dramatic | Dun dun duuun | 2.6 s | Pitch, Variation, Length (0.9 + 1.7 × L) | two minor stabs on D (0, 0.42 s), a third on C♯ at 0.84 s held with an 8 Hz tremble, timpani on each |
| cue-harp | Dream harp | 2.2 s | Pitch, Variation, Length (0.7 + 1.5 × L), Direction up / down | C major pentatonic glissando C4 → C6, 11 plucks 65 ms apart |
| cue-suspense | Suspense sting | 2.4 s | Pitch, Variation, Length (× 2.4) | E4 F4 B♭4 string cluster, sforzando to a shiver, E2 boom, thin E6 shriek |
| cue-gong | Gong | 4.2 s | Pitch, Variation, Length (0.2 + 4 × L) | nine inharmonic partials over G2, low ones beating, high ones blooming |
| cue-drone | Tension drone | 6 s | Length 2–30 s, Pitch, Variation | A1 + its twin (slow beat), E2, B♭2 through a breathing lowpass, quiet air |

Levels 0.85 / 1 / 0.8 / 0.9 / 0.95 / 0.8. Seeded like every pack (packNoise / packJitter / packRnd; Variation 1 is the recipe as
written); every cue ends on a 0.25 s fade; raw sums kept under ~1.2 (the ▶'s headroom, queue 566). Placeholder category icon (two
beamed notes) for `FM.sfx.catIcon`. No registry param, so the collab schema cannot move for these.

## 3. Busters (from v17.59's numbers)

`js/compositor.js` 222 → **223**, `js/fx-registry.js` 26.36 → **27** (an integer step, so an integer-reading check sees the bump too —
the `8fe0cd61` lesson), `js/fx-thumbs.js` 59 → **60**, `js/inspector.js` 425 → **426**, `js/collab-core.js` 35 → **36**,
`js/sfx.js` 22 → **23**. v17.60 (shipping now) touches none of these; at landing re-bump over whatever actually shipped.

## 4. Collab schema

`C.SCHEMA_REV` 15 → **16** with a REV note in `js/collab-core.js`. `C.SCHEMA_FP` is **left at rev 15's number** under a
`/* FP TO PIN (966 new) */` marker — no number invented. Re-measure with fp.js on this tree at rev 16 and pin it; until then
`921 S1 the schema fingerprint gate` is red on this branch.

## 5. Tests — 24, one block appended before the final `})();` (`// ── 966 new (hunt/966-new) ──` … `// ── end 966 new ──`)

All `{ item: '966' }`, titles with ‘ ’ only. Each fails on v17.59 on its FIRST line by naming what is missing (`_bkNeed` /
`_asNeed`: "no registry entry for bokeh — Bokeh Lights (#966 B10) is not built", "… asciiart — ASCII Art (#966) is not built";
`packSfx966` / `folNeedSfx966`: "The Music cues pack (#966) is not in the sound-effect library: there is no Ta-da (cue-tada), …"),
never a TypeError.

- **966 B10** (9): catalogue (category, routing, search words, the 16 rows' labels / ranges / units / defaults / gates / choices,
  px keys, shape yes / adjustment no, sanitiser keeps a fresh one, NEW row, first frame > 3000 px changed, bare = new; CONTROL Opacity
  0 leaves the layer); where the lights are (count, sizes either way round, middles lit to their strength, clear away from every
  light, fractional Lights, Seed; CONTROL another Seed moves them); drift (plain exact, the size factor, a keyed hold integrated, a
  keyed direction turned — ∫(cos, sin) = (200/π, 200/π)·k — keyed flat = plain); shape and softness (circle / hexagon cos 30° /
  heart's notch and point; Softness 0 crisp, Softness 100 with Add fading); twinkle (0 still, 100 = the seam's strength at every
  moment, speed 2 at t = speed 1 at 2t, keyed flat; CONTROL it really twinkles); colours / blend / draw (two-colour mix, Rainbow,
  Normal / Screen / Add over red, Behind, Instead, Opacity 50); stateless (kernel and compositor; CONTROL 1.6 vs 1.7 s); the 0.5 / 0.28
  plates (bound `B10_PLATE_TOL = 5`, TODO, with two controls); every slider moves the picture (canvas sweep).
- **966 ASCII Art** (6): catalogue (as above, plus "takes `ps` itself", not PIXEL_ADJ; CONTROL Mix 0); the grid (period 12 × 16 and
  not 10, 84 px per @, the gap, the @'s top row 001111110000); the ramp (ten greys ink 0,4,8,12,36,40,60,68,72,84; Contrast 0 all 40;
  Invert reversed; Blocks 0,0,48,48,96,96,144,144,192,192; the ramp seam); colours (picture / one colour / dimmed / clear / Mix 50,
  transparent cells draw nothing); Binary (76 or 40 px a cell, both appear, colour × brightness, Digit changes 0 still / 4 flips
  ~half in ¼ s, stateless); the reduced plate (6 × 8 cells at ps 0.5, 21 px per @, a bare instance scales its default; CONTROL ps 1).
- **966 Music cues** (8): the pack (packSfx966 on all six, packOptionsFor exactly, eight variants with stated lengths and levels,
  Variation 3 same twice / 4 another take, the icon); Ta-da (two onsets, G4 pickup, C major with no E♭, +5 st); Dun dun duuun (onsets
  before 0.9 s at 0 / 0.42 / 0.84, D then C♯, held, quiet between); Dream harp (first note C4 / C6 / C5 at +12, brighter going up and
  darker coming down, rings on); Suspense sting (hits hard, the E4–F4–B♭4 cluster, the boom dies); Gong (rings and fades, the bloom,
  98 Hz / 196 at +12); Tension drone (12 s is 12 s, steady, dark, on A1, +12); on the sheet (heading, six rows in order, ≥ 32 px).
- **966 new adds and moves nothing** (1): the new types are the last two after Auto Grade (v17.59's newest, where it was); the six
  cues follow Ka-ching (v17.59's last sound) in a category of their own after Foley.

**Nothing existing changed — which tests hold it:** no existing kernel, recipe or default was edited, so the `482 … byte for byte as
on v17.xx` goldens, the 56-filter pins (`482 polish 1 …`, `482 5.3 …`), 709 / 562 / 986 C10 (every older sound) and the E1
first-205 check all run unchanged; the new test above pins the order.

**Shared tests edited** (newest-first lists, the stack50 / stack51 form): E1's `LATER` (+ `bokeh`, `asciiart` at the end), 745's
`NEWEST_FIRST` and 913.8's `NEWER` (`asciiart`, `bokeh` at the front; 913.8 now thirty-three newer than Snow & Rain — its "twelve
newest, Snow & Rain out" branch). All three still pass on v17.59's js (each list is filtered by what the registry has); the old
lists would fail on this js (the row now leads with asciiart). **Lens Magnifier and Radio Waves roll off the NEW row** (twelve newer
each now): their catalogue tests already take the `_rolledOffWhy966` branch; Auto Grade's (no roll-off branch) sits third, behind
only the two newer — it passes.

**Sweeps read against the new code (not run):** 482 visible (ASCII Art changes nearly every pixel at defaults); the inert sweep
(cell, contrast, dim with Background dimmed, rate with Binary from t 0.23, mix — each moves the picture); queue 264 (no single extreme
erases the fixture: Clear keeps the characters, Instead keeps the lights, Opacity 0 keeps the layer — no ALLOWED entry needed); 784
(bare = defaults, both kernels fall back to the registry's defaults); 913.5 (Bokeh through the plate origin like Radio Waves; ASCII
on the comp-sized plate from its corner, as Mosaic); 709 / 562 / 986 C10 / sfx-warm (seeded, under the ▶'s headroom, the ▶ is the
clip, six in the category).

## 6. The #545 sheet — what to render and play for him (next browser slot)

Through `FM.renderScene` (the render-probe pattern: `tools/design/plans/pile-laser/NOTES.md` §"The sheet"), each tile a 1080 × 1920
project at the phone's plate (380 px wide, ps ≈ 0.28) **and** at the PC's (1280 wide), band by band (tall sheets split, the
phonepages rule):
- **Bokeh Lights** — `bokeh-looks.jpg`: defaults (recommended) over a dark frame, over his clouds photo and over a title; **City
  night** (Lights 80, 10–40 px, Softness 80, Drift 8, colours #fff2d0 / #ffb347); **Hearts** (Heart, Lights 25, 40–90 px, #ff6fa8 /
  #ff3355, Twinkle 60); the shape row (Circle / Hexagon / Heart at Softness 0 and 60); Rainbow; Behind and Instead of a title.
  `bokeh-motion.jpg`: five moments 0.5 s apart at the defaults, Drift 120 at 0°, and Twinkle 100.
- **ASCII Art** — `ascii-looks.jpg`: defaults (Classic, the picture's colours on black, 12 px — recommended) over a photo and over
  a title; **Matrix** (Binary, One colour #3cff6e, Digit changes 6, 10 px); **Blocks** (16 px, Background The picture, dimmed 30 %);
  Invert on a white background (One colour #111111, Background #ffffff); 6 px and 24 px. Plus the browser tile at its shipped size.
- **Music cues** — a listen list (WAVs from `FM.sfx.renderBuffer` + `encodeWav`): each of the six at its defaults; Ta-da Length 2;
  Dun dun duuun +5 st; Dream harp Down; Gong 0.5x length; Tension drone 12 s; Suspense sting Variation 2.

Questions for him (one picture or one listen each; "do recommended" covers them all):
1. Bokeh's defaults — 40 lights, 24–80 px, gold and rose, floating up, Twinkle 30 % (recommended), or a row from the sheet?
2. Bokeh's Heart and Hexagon — keep both shapes?
3. ASCII Art's default colour — the picture's own colours (recommended) or the green-on-black terminal look?
4. The category name "Music cues" (recommended) — or "Stingers", "Music hits"?
5. "Dun dun duuun" as a name — keep, or "Dramatic reveal"?
6. Keep, change or veto each of the six sounds (one word each).

## 7. Unsure / risks

- **Nothing ran.** If a test is red on its first run, read its numbers before touching the code — every tolerance is reasoned, and
  `B10_PLATE_TOL = 5`, the Softness 100 middle (±8), the Suspense hit (2×), the drone's steadiness (2.5×) are first guesses.
- The onset tests (Ta-da, Dun dun duuun) depend on onsetsSfx966's 20 ms quiet rule; Dun dun duuun reads onsets before 0.9 s only,
  because the held stab's tremble can dip and rise again after that.
- `921 S1 the schema fingerprint gate` is red until `C.SCHEMA_FP` is pinned at rev 16.
- Bokeh's worst case is 300 lights × 8 soft steps = 2400 small fills a frame — fine on a PC, unmeasured on his phone; the default
  (40 lights, Softness 60) is ~300.
- ASCII Art's pooled scratch is ~80 bytes a cell: ~0.9 MB at the default 12 px on a 1080 × 1920 plate, ~8 MB at 4 px — kept, never
  shrunk (the #1095 pool audit's question applies if it shows up).
- The heart is a 48-point polygon (a light 400 px across shows faint facets).
- The sounds are synthesised blind: the recipes are reasoned, not heard (#545 — the listen list above).

## 8. Merge notes

- `js/compositor.js`: the two blocks sit after Auto Grade's seam, just before `FM._FX_TABLES` — Bokeh pushed first, ASCII Art LAST
  (it leads 913.8's "newest registered effect"); CATEGORY_OF batches 63 and 64 must stay in that order. A later branch built on
  v17.59 also numbers its batch 63: renumber in landing order, and only the last line says "The newest".
- `js/fx-registry.js`: CATEGORY_OF and SEARCH_ALIASES — appends after `autograde`; Auto Grade's line lost "The newest …".
- `js/fx-thumbs.js` OVERRIDES and `js/inspector.js` NOOP_WHY: appends.
- `js/sfx.js`: one block after the Foley `SFX.push(…)`, one icon line after `Foley:`.
- `tests/tests.js`: three list edits (E1 / 745 / 913.8) + one appended block — rebuild by blocks, never union-merge.
- `index.html`: the six busters above; re-bump over what shipped.
