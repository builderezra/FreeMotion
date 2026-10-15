# #966 B35 — Ambience pack (hunt/pile-ambience), ported from ChatGPT's pile

Backlog §B B35 ("Ambience pack: ocean, crickets, birds, room tone", SFX, M), LAND-LIST §B7 (sound packs, T04). Built on the §B
chain tip `85b71929` (hunt/fxnew-drums: the packs, Explosion & Thunder, Drums). **Built, not picked** — his #545 rule: he
hears them on the listen sheet before anything ships. **Nothing was run**: the API builder was live (no node, no python, no
browser, not even `node --check`). The proof is written and owed: `scratchpad/agents/pile-ambience/prove.sh`.

## Where it came from — and the pile commit to DROP when this lands

ChatGPT's pile commit **`05116900` "Add synthesized ambience sound pack"** (on `eda6773b`, reviewed pile `refs/pile/codex-690-reviewed`).
It was read hunk by hunk and ported **by hand**; none of its `?v=` numbers were copied (it had sfx 21 → 22). **Drop `05116900`
when this lands** — everything worth keeping from it is here. Its report (`outside/chatgpt/fixes/690-ambience-pack.md`) is not
carried.

## Which sounds already existed

None of the four. Searched `js/sfx.js` on `85b71929` for rain / wind / ocean / wave / bird / crowd / room / cricket / hum /
water / fire: the nearest are **Wind, Rain and Fire crackle** (Nature, queue 290; 2.4–2.6 s with fades at both ends) and
**Thunder** (Nature, #966 B23). They are short sounds with tails; these four are long, level beds. REQUESTS.md and POLISH-LOG.md
on `ssh/main` mention none of ocean / crickets / room tone / ambience.

Related, not on this chain: **batch 9 (`hunt/fx-b9`, #482 9.3)** gives Wind, Rain, Fire and Vinyl *beds* (2.5–60 s, faded or
loop-ready, its own `loopFold`). Same idea, different sounds — see the merge notes.

## What was taken from the pile

The four sounds, their ids (`amb-ocean`, `amb-crickets`, `amb-birds`, `amb-room`), names (Ocean surf, Crickets at night,
Morning birds, Room tone), the Ambience category, the 8 s length, the levels (0.42 / 0.35 / 0.4 / 0.25 — a bed sits under
speech and music), and the shape of each recipe: a brown-noise roar and pink-noise foam for the sea; faint low air and
~4 kHz sine chirps; faint mid air and rising sine sweeps for birds; band-limited pink noise and a faint hum for the room.

## What was fixed or changed

| | The pile (`05116900`) | Here |
|---|---|---|
| Seeding | `noiseBuffer` (seeded by length and colour only); no Variation | `packNoise` through `noiseSeed` (C11), `packRnd` / `packJitter` by id and Variation — same choices, same samples; the ▶ is the clip (C10) |
| Options | none | Length 4–60 s in whole seconds (8 by default), Faded / loop-ready, Variation 1–8; Room tone also Hum on / off |
| Looping | **none**: one 8 s take, faded in and out (sea 0.7 s in / 1.6 s out; others 0.25–0.3 s). No click at the edges, but laid end to end every join **dips to silence** (the sea for ~2 s) | The row is still faded (0.3 s edges, the 0.05 s tail every sound has). **Loop-ready**: rendered 0.5 s past its end, the overrun folded over its start (equal power) and cut to exactly its length — the last sample runs on into the first, so a tiled or looped clip has no join. Events keep out of the fold and end before the end; the sea's swell comes round (a whole number of waves) |
| Ocean | two hand-placed swells; foam ~15 dB under the roar | a whole number of seeded waves (one every ~4 s), sizes 0.75–1; the foam louder and lagging the roar ~0.35 s so the break is heard |
| Crickets | 28 single 85–120 ms tones at a fixed pattern | real chirps: three 14 ms pulses of a ~4.4 kHz tone, ~2.4 a second ± 5 %; a second, fainter cricket further off (4.95 kHz, four pulses, ~1.8 a second) |
| Birds | 13 hand-placed sweeps of one shape | three singers picked by the seed from five calls (tweet ×2–4, chip ×1–3, wheet ×1–2, whistle, trill), each its own pitch (±4 st) and distance, one call at a time |
| Room tone | 60 Hz hum at 0.008 (~10 % of the room's power) | **50 Hz** (Perth's mains — LAND-LIST's optional fix) at 0.005 (~4 %, reasoned); "no hum" on asking |
| Test | renders each, "8 s, not silent, not too loud" | six tests of what makes each sound itself (below) |

**Shared path — two guarded lines.** `renderBuffer`: the render's tail is `def.dur + (def.loop ? AMB_FOLD : 0.05)` and it folds
only when `def.loop`; `variant()`: carries `loop` only when the cleaned options ask for it. Every other sound renders exactly as
before (the same expressions when `def.loop` is unset) — prove.sh stage 4b hashes every older row and a few variants on both
trees to show it. A placeholder **Ambience icon** for `FM.sfx.catIcon` (a low sun over two lines of waves; the real one is #545's).
Busters: **sfx 24** (this tree had 23). No registry param, so `C.SCHEMA_FP` cannot move.

## The tests — and why each fails on 85b71929

All six are titled `966 B35 …`, `{ item: '966' }`, appended after `// ── end 966 B22 ──`. Each fails on `85b71929` on its
first line — `packSfx966` (the catalogue test) or `needSfx966` — with *"The Ambience pack (#966 B35) is not in the sound-effect
library: there is no Ocean surf (amb-ocean), Crickets at night (amb-crickets), Morning birds (amb-birds), Room tone (amb-room)"*
(or the one sound a test is about), never a TypeError. The statistics, and why each was chosen:

- **Ambience** — the packs' checks on all four rows, 8 s and faded, a bed's level, Length (16 s through `variantSfx966`),
  Faded / loop-ready, Room tone's hum option, a loop-ready variant's name, the icon.
- **Loop-ready** — exactly its length (no tail); its level after the fold; seeded; **no click**: the step from the last sample
  to the first under 1.25× the largest step within 1000 samples either side (with the fold the seam *is* one of the render's
  own steps; a bed started cold jumps by about its whole swing); **no dip**: the level across the seam (medians of 5 ms frames,
  so a chirp does not count) 0.45–2.2× the level 0.2–0.45 s in (a faded edge reads ~0.1). Each bed, Variation 3 and 5 s too.
- **Ocean — slow swells**: the swing of the quarter-second RMS (90th over 10th percentile > 2×, reasoned ~4×) and how often it
  rises past its middle (1–3 times in 8 s, 3–6 in 16 s): an envelope with a period of seconds, not a steady hiss and not a
  flutter. And the break: the RMS frequency at the loudest moment over 1.5× the lull's (reasoned ~4×, the foam).
- **Crickets — chirps at a regular rate in a high band**: onsets (20 ms quiet before each, so a chirp's pulses are one) at
  1.6–3.5 a second with a spread under 0.12 of the mean gap; zero crossings inside a pulse put the tone at 3–6.5 kHz; short
  (over half the loudest 2–25 % of the time); about twice the chirps in a bed twice as long.
- **Birds — short tonal sweeps**: notes (10 ms frames over 0.2 of the loudest) none over 0.45 s; tonal (normalised
  autocorrelation ≥ 0.75 — a sine reads ~1, noise far less); 1.2–7 kHz; most sweep ≥ 12 % frame to frame.
- **Room tone — steady broadband, no events**: quarter-second RMS within 1.3×, no 50 ms over 1.6× the median, ≥ 8 % of the
  energy both under 250 Hz and over 1.5 kHz; the hum by lock-in: 50 Hz over 4× "no hum" and 3× 60 Hz, yet under 0.5 of the RMS.

Every bound is reasoned from the recipe and written beside it in tests.js — none measured. If a bound is wrong it will say what
it measured; widen it from the measurement, not by guess.

## Questions for Ezra (on the listen sheet: `render-probe.js`, next browser slot)

1. **Keep, change or veto** each of the four (one word each is enough).
2. **The row: faded or loop-ready?** Recommended: **faded** (like every other sound, and a clip dropped alone starts and stops
   cleanly); loop-ready when asked, for laying end to end or looping.
3. **Room tone's hum: on by default?** The pile had it on. Recommended: **on** — it is what makes it read as a room rather than
   hiss — with "no hum" one tap away. Off is fine if he uses it to cover dialogue edits.
4. **More choices?** ("as much choice as possible", #966): rough / calm surf, a chorus of crickets, a busier dawn chorus. Each
   is a small option on the same recipe.

## Merge notes

- **Batch 9 (`hunt/fx-b9`)** rewrites `renderBuffer(def, opts)` for Nature beds, with its own `loopFold`, `LOOP_XFADE` (0.5),
  `BED_EDGE` (0.3) and `PREVIEW_MAX` (8). This branch's names are kept distinct on purpose (`ambFold`, `AMB_FOLD`, `AMB_EDGE`)
  so a textual merge can never declare a `const` twice — that would be a SyntaxError taking out all of sfx.js. When both have
  landed: keep the `def.loop` tail and fold in b9's renderBuffer (its no-options path), and fold `ambFold` into b9's `loopFold`
  (the same arithmetic). If b9's `PREVIEW_MAX` caps every buffer over 8 s, the Ambience test's 16 s variant check
  (`variantSfx966` → `previewGapSfx966`) must compare only what the ▶ plays.
- On this chain the ▶ of a 60 s bed plays 60 s (no cap before b9); tapping the row stops it (C12).
- **Everyday Foley (B36)** is a separate later port; it appends its own block after `// ── end 966 B35 ──`. Rebuild tests.js by
  blocks, never union-merge.
- **Landing**: bump sfx's `?v=` once from live's value (main has 20 today), not this chain's 24. Log one REQUESTS.md entry per
  batch (LAND-LIST §2) and retag these tests with it; the twins (B22 / B23) carry `{ item: '966' }` the same way.
- Simple mode Phase 2: `FM.sfx.open()` shows these rows in Simple too (LAND-LIST §B7).
- Collab: no schema bump — a sound effect is not a registry param.
