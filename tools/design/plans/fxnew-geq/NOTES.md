# #966 B34 — Graphic EQ (10-band), hunt/fxnew-geq

Built on hunt/fxnew-drums **fb24f68b**. Refers to #545: he hears the presets before anything ships.

**⚠️ NOTHING HERE HAS BEEN RUN.** Written on 14 Oct while the API builder was live: no node, no python, no browser, not even
`node --check`. Every number below is from the maths (the Web Audio spec's peaking biquad), not a measurement. The proof
script is written and waiting: `scratchpad/agents/fxnew-geq/prove.sh` (node harness, quiet slot only), then the `966 B34`
tests in Chrome at 900 and 380, then the listen sheet (`render-probe.js` here).

## What it is

An audio effect in **EQ / Filter, right after the 3-Band EQ**: `graphiceq`, label **Graphic EQ**.

- Ten sliders, one an octave: **31, 62, 125, 250, 500 Hz, 1, 2, 4, 8, 16 kHz** (keys `hz31` … `hz16k`). Exact octaves from
  1 kHz, so the bottom two are really 31.25 and 62.5 Hz.
- Each **−12 … +12 dB**, steps of 0.5, **0** by default, **keyframable**. None is a rebuild, so dragging never restarts the
  preview's sound.
- Then **Output** (−24 … +12 dB) and **Mix** (0 … 1), from the shared wrapper (`mixOutput`, #482 8.1) like every effect.
- Description (on the def as `desc`): *"Ten sliders an octave apart, from the deep bass at 31 Hz to the air at 16 kHz: push
  up or pull down the part you want."* Nothing on screen shows an audio effect's description yet (the visual browser has
  `DESCRIPTIONS`, the audio tiles show only the label) — it is data for when one does.
- Search words: graphic eq, graphic equaliser, graphic equalizer, equaliser, equalizer, eq, 10 band, ten band, bass,
  bass boost, treble, tone. Checked against queue 986 C13's stray rule: `on`, `no`, `the` and `low` do not list it.
- Name: "Graphic EQ" is a generic craft name. Not in either Alight Motion list in `tools/design/954-effect-names.md` (that
  record covers the visual effects; no audio name clashes), and not one of ours.
- Tile icon: none of its own — it falls back to the EQ category's glyph (the Band-Pass bump), as the Trance Gate does for
  Dynamics. A glyph is a picture, so it is his pick (#545), not drawn here.

## The choices, and why

**All ten are bells (peaking), the two ends too.** A low shelf at 31 Hz would lift everything under it — sub-20 Hz rumble
and DC offset that nobody hears and that eats headroom. A high shelf at 16 kHz only reaches half its gain at 16 kHz (a
shelf's corner is its half-way point), so "+12 at 16 kHz" would read +6 there. Shelves at the ends are a one-line change if
he hears the ends as too narrow.

**Q 1.** In series the bands' dB add, so the Q decides how two neighbours raised together meet between their centres:

| Q | one band +12: its neighbour's centre | two neighbours +12: on a centre / half way | all ten +12 |
|---|---|---|---|
| **1 (built)** | +3.97 dB | 15.97 / 15.51 — **a 0.46 dB dip** | ≈ +22.6 dB, ripple ≈ 0.5 dB |
| √2 (the one-octave textbook Q) | +2.52 dB | 14.52 / 12.00 — a 2.5 dB dip | ≈ +18.4 dB, ripple ≈ 3.5 dB |

Q 1 makes a curve drawn across the sliders come out as a curve rather than a row of bumps. The price is reach: each band
spills a third of its gain onto its neighbours' centres, and boosts add up (all ten at +12 is about +22 dB — Output is
there for that). Two neighbours meet flat at about Q 0.9; 1 is the round number a hair on the narrow side.

**A band at exactly 0 is switched out, not trusted.** A 0 dB bell is the identity on paper, but Chromium's biquad
(`biquad.cc`, read, not measured) works each sample out in double as b0·x + b1·x1 + b2·x2 − a1·y1 − a2·y2 and keeps a float;
the products cancel only to the last bit of the double, so where the input is 0 just after sound a band can put out a
1e-17 crumb instead of 0 and carry it on. A new effect at its defaults must be exactly the clip (backlog §0.3), so each band
sits in the file's **bypass pair** (`bypassPair` + `pairTargets`), wired in by anything but exactly 0. Flat is therefore the
clip sample for sample, export and preview; a slider moved off 0 fades its band in over 20 ms; a keyframe ramps it over
its 33 ms step. At ±0.5 dB a bell is so close to the clip that the fade is inaudible.

**No latency.** A biquad answers on the same sample, so Mix's dry copy needs no delay (`dryLag`). (The brief mentioned
`OVERSAMPLE_FRAMES` / `dryLine`; neither exists at fb24f68b, and nothing here is oversampled.)

**Live = offline.** The preview builds through the same `FM.buildAudioFxChain`; nothing in `audio-fx-live.js` changed. A
band is a `custom` setter (the gain and its pair together), driven by `applyAt` live and `schedule` in the export.

## Presets (dB, 31 Hz first)

All ten bands in every one; Mix and Output in none (8.2: a preset must not jump the level; Mix stays out as on the 3-Band
EQ). "Plays" is what the ten Q-1 bells add up to at that centre — the bands overlap, so neighbours add.

| Preset | 31 | 62 | 125 | 250 | 500 | 1k | 2k | 4k | 8k | 16k | what it plays (by the maths) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Flat | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | the clip itself |
| Bass boost | 2 | 5 | 4 | 1.5 | 0 | 0 | 0 | 0 | 0 | 0 | 62 Hz ≈ +7.0 |
| Treble boost | 0 | 0 | 0 | 0 | 0 | 0 | 1.5 | 3 | 5 | 4 | 8 kHz ≈ +6.4 |
| Vocal presence | −8 | −5 | −2 | −1.5 | 0 | 1 | 3 | 4 | 2 | 0 | 4 kHz ≈ 10 dB over 125 Hz |
| Loudness smile | 4 | 5 | 3 | 0 | −2 | −2 | 0 | 2 | 4 | 4 | 62 Hz 9.5 and 8 kHz 7.3 over 1 kHz |
| Telephone-ish | −12 | −12 | −10 | −4 | 2 | 5 | 4 | −6 | −12 | −12 | 1 kHz 25 over 62 Hz, 21 over 8 kHz |
| Podcast | −12 | −6 | 1 | 1 | −2 | 0 | 1 | 3 | 2 | 1 | 31 Hz ≈ −13.8, 4 kHz ≈ +3.8 |
| Bass cut | −12 | −10 | −6 | −2 | 0 | 0 | 0 | 0 | 0 | 0 | 62 Hz ≈ −16.0 |

As with every audio preset, there are no chips on screen yet (8.2: the row of preset buttons is drawn and picked first,
#545); these are the data `FM.audioFxPresets.apply` will write.

## Tests (`tests/tests.js`, `966 B34 …`, appended before the final `})();`)

Each starts by asking the registry for `graphiceq`, so on fb24f68b every one fails on its first line with
*"there is no Graphic EQ: FM.audioFxRegistry has no graphiceq (#966 B34 is not built)"* — never a TypeError.

1. **The effect** — EQ / Filter, right after the 3-Band EQ; the ten keys, labels, ranges, steps, defaults, keyframable, no
   rebuild; Output and Mix; a one-line description; the search words by the C13 rule (and the four strays not); a new one
   all 0 / Output 0 / Mix 1; moving or keying a band leaves the preview's signature alone; the load sanitiser keeps a saved
   one's ten (30 → 12, keyframes kept and clamped, junk → 0, a stray key dropped).
2. **Flat is the clip** — every band 0, and a band keyed 0 → 0, is the clip sample for sample on noise, a sweep and clicks,
   stereo, export and preview (`b3SameAsToday`). CONTROL: 31 Hz at +0.5 dB is not.
3. **The bands** — each band alone at +12, on a ruler of twelve tones (the centres, 100 Hz, 706.25 Hz; all whole cycles in
   7680 samples, read with `b7Amp` from 0.3 s): every tone within 0.15 dB of what the spec's Q-1 bell gives (so +12.00 on
   its own centre, +3.97 an octave away); +12 at 1 kHz lifts 1 kHz by 12 and 100 Hz by 0.16; each band lifts its own tone
   ≥ 6 dB more than any other and each tone is lifted most by its own band; a cut mirrors a boost; 500 Hz + 1 kHz at +12
   dip ≤ 1 dB half way (0.46 by the maths). CONTROL: flat reads 0.00 on every tone.
4. **The presets** — the eight names in order, each the ten numbers above, each value one the slider can hold; applied over
   a keyed band, Output −3 and Mix 0.7 it writes the ten in one call and leaves Output and Mix; each plays what its bells
   add up to (±0.2 dB) and the by-name checks in the table's last column.
5. **Keyframes** — 1 kHz keyed 0 → 12 over 2 s lifts a 1 kHz tone 3 / 6 / 9 / 11.7 dB at 0.5 / 1 / 1.5 / 1.95 s (export),
   the first 25 ms within 0.3 dB of the clip; a preview built at 1 s plays +6. CONTROL: static +6 reads 6.00.
6. **Live = export** — a smile with a 2 kHz cut, Output −3, Mix 0.8, on noise and a sweep, stereo: the two paths within
   1e-6 (they should be identical). CONTROL: the export moves the clip by more than 0.01.
7. **On screen (browser only)** — the open Graphic EQ's twelve rows fit the panel at 390 and 1280 px, read 0.0dB / 1.00,
   each with a keyframe diamond. In the node harness it can only fail on the missing DOM; it proves something in Chrome.

The existing `482 8.1` test walks every effect, so it now also checks this one's Output and Mix.

## Questions for Ezra (by ear, on the listen sheet)

1. **The presets** — do the eight sound like their names on a voice and on music? Any to cut, rename or add? (Telephone-ish
   is deliberately not called Telephone: the Telephone effect is the real phone line.)
2. **Levels** — Bass boost and the smile come out louder (no preset touches Output). Is that fine, or should a lifting
   preset also lower Output so it compares at the same loudness? (That would break 8.2's "Output is never in one", so it is
   his call.)
3. **The width (Q 1)** — when he drags one slider, does it move too much of the sound around it? Narrower bands (Q √2) touch
   less but leave bumps between sliders.
4. **The ends** — do 31 Hz and 16 kHz feel like they do enough? Shelves there are a small change (see above for why bells).
5. **A tile icon of its own** — drawn options per #545 if he wants one; today it borrows the EQ category's.

## Merge notes

- Changes: `js/audio-fx.js` (the band table, the def after `eq3`, its tags, its presets), `index.html` (`audio-fx.js?v=20` →
  **21**), `tests/tests.js` (appended), this folder. Nothing else — no inspector, browser or live-preview change.
- **Busters**: sibling branches built from the same base bump `audio-fx.js` to 21 too; at land time take the base's line and
  renumber above the highest (the index.html conflict rule).
- **Collab fingerprint**: ten new registry params move it. `C.SCHEMA_FP` is left alone on purpose (pinned once at the top of
  the chain); the tests that pin it go red on this branch alone until then. prove.sh prints the number.
- **The ChatGPT pile (`tools/design/chatgpt-tasks/pile/INVENTORY.md` T06, commit `eda6773b`) has its own Graphic EQ**
  (`graphicEq`, pre-8.1: its own Output, presets as an offset choice, shelves at the ends, Q √2, not exact at flat). This one
  supersedes it — drop that commit when T06 lands, or there will be two Graphic EQs under different ids.
