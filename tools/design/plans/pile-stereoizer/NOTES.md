# #966 B47 — Stereoizer, ported from the ChatGPT pile (01297a19), hunt/pile-stereoizer

Built on hunt/fxnew-drums **85b71929**. Refers to #545: he hears it before anything ships.

**⚠️ NOTHING HERE HAS BEEN RUN.** Written on 15 Oct while a release ship was running: no node, no python, no browser, not
even `node --check`. Every number below is worked from the graph and the filter formulas, not measured. The proof script is
written and waiting: `scratchpad/agents/pile-stereoizer/prove.sh` (node harness, quiet slot only), then the `966 B47` tests in
Chrome at 900 and 380.

## Twin check (what already existed)

- **REQUESTS.md / POLISH-LOG.md** (ssh/main): no stereoizer, pseudo-stereo or "make mono wide" request or release. The hits for
  "widen" / "pseudo" are all UI (a head widened, pseudo-elements). The item is the idle backlog's
  `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1260` — *"B47 | Stereoizer (amount, delay, mono-safe, low cut) | Audio | S"*.
- **Stereo Width** (`width`) is NOT this. It is left = M + w·S, right = M − w·S: it multiplies the difference the clip ALREADY
  has between its sides (S = (L − R) / 2). A mono clip has S = 0, so Width cannot touch it — the panel already says so
  (inspector.js `AFX_MONO_HINT.width`: *"This clip's audio is mono — there's no stereo image to widen, so this effect does
  nothing"*), and test 2 below shows it: Width at 2 plays a mono clip with left === right on every sample. The Stereoizer MAKES a
  side out of the middle, so it works on a mono clip, and on a stereo clip it ADDS to the side instead of scaling it.
- **Chorus Spread** (#482 7.8) places detuned, wobbling voices left and right — it changes the pitch, so it is a chorus, not a
  widener. Nothing else in audio-fx.js makes width from mono (no Haas, no decorrelation).
- So the effect is ported whole.

## What it is

An audio effect in **Space / Stereo, right after Stereo Width** (the pile's place): `stereoizer`, label **Stereoizer**.

| Control | Range | Default | Kind |
|---|---|---|---|
| Amount | 0 … 1, step 0.01 | 0.5 | keyframable slider |
| Delay | 1 … 30 ms, step 0.5 | 12 ms | keyframable slider |
| Mono-safe | Off / On | **On** | TOGGLE (tick box); not keyframable, not a rebuild (a bypass pair fades it) |
| Low cut | 20 … 1000 Hz, step 10 | 150 Hz | keyframable slider |
| Output | −24 … +12 dB | 0 | the shared wrapper (`mixOutput`) |
| Mix | 0 … 1 | 1 | the shared wrapper (`mixOutput`); no `dryLag` |

- Description (`desc`): *"Makes a mono or narrow sound wide. The bass stays in the middle, and on one speaker it sounds just as
  it did."*
- Mono-safe's note: *"On: on a phone's one speaker, or anything else that plays in mono, it sounds exactly as it did. Off: the
  right side's highs come a moment late instead — it can sound wider in headphones, but on one speaker some notes go hollow."*
- Search words: mono to stereo, make stereo, fake stereo, pseudo stereo, stereo widener, widen, wider, wide, width, spread, haas
  (plus its label and id). Checked against queue 986 C13's rule: the, low, on, round and ten do not list it ("low cut" was left
  out of the tags for that reason).
- Key names are the pile's (`amount`, `delay`, `monoSafe`, `lowcut`), so nothing it wrote needs translating.
- Tile icon: none of its own — the Space glyph. A glyph is a picture, so it is his pick (#545).

## How it works

    left  = L + g          g = Amount / 2 × (the middle M = (L + R) / 2, above Low cut, late by Delay)
    right = R − g          (Mono-safe On, the default)

- **Wide.** Each side is the clip plus or minus a late copy of itself (two complementary combs), so the two differ. On noise,
  Amount 1 makes the sides correlate (1 − ¼) / (1 + ¼) = **0.6** (the clip: 1), Amount 0.5 makes it 0.88; the new side sits 6 dB
  (12 dB) under the middle.
- **Mono-safe.** The sum does not move: (left + right) / 2 = (L + R) / 2, to one float rounding a side (≤ 6e-8). A phone's one
  speaker or a mono Bluetooth speaker plays the clip exactly as it was, at every Amount, Delay and Low cut, keyed or not.
- **Centred.** g goes in with opposite signs, so left and right are equally loud: the sound gets wider without leaning (a Haas
  delay leans it towards the early side).
- **Bass stays in the middle.** Low cut is two Butterworth highpasses in a row (24 dB an octave — the same filter as Stereo
  Width's Keep bass centred): 60 Hz under the default 150 Hz keeps 1/40 of the width (side 38 dB under the middle).
- **A stereo clip keeps its width and gets more.** Its own side passes through untouched and g is laid on top: S' = S + g, where
  g is exactly what its middle alone would get.
- **Exact where it must be.** At Amount 0, g is × 0 and x + 0 = x: the clip comes out sample for sample, mono or stereo. Nothing
  on the clip's own path is late, so Mix cannot comb and needs no `dryLag`. No node sums more than two inputs, so the preview is
  the export (Chrome adds three or more inputs in a different order per render — measured 15 Oct, the 966 B1 Voice test).
- **Mono-safe Off (the pile's Haas way, kept as a choice):** left = L, right = R + Amount × (late − now)(R above Low cut) — the
  right side's highs slide towards a copy late by Delay. It can sound wider in headphones, but the sum is no longer the clip: on
  one speaker it combs (Amount 1, Delay 10 ms: a 1950 Hz tone comes out **13.3 dB down** — worked below), and the sound leans left.
- The switch is a bypass pair over the two widenings (`pairTargets`): the first set steps, a live change fades over 20 ms, and
  nothing rebuilds.

## What was wrong in the pile (01297a19), and what changed

Its own report says the OfflineAudioContext regression and any listening were never run. Its one test measured the fold-down
error as a MEAN over a 900 Hz tone and the side as one RMS; it never looked at the Haas mode, the low cut, a stereo clip, Amount 0
or preview against export.

**First, what was right:** the pile's default ("Safe") was already mono-safe in structure — it built left = M + (S + g) and
right = M − (S + g), so (left + right) / 2 = M. It did NOT ship a naive one-sided Haas as its default. The faults are these:

1. **A drop-down.** Mono-safe was `options: [[0, 'Haas'], [1, 'Safe']]` on a `P()` slider — eda6773b's `afxChoice` drop-down.
   → This tree's `TOGGLE` (a tick box), labelled **Mono-safe**, On by default. Nothing from eda6773b is taken.
2. **Amount 0 was not the clip for a stereo clip.** The pile rebuilt the clip out of its own middle and side (M + S, M − S), and
   (L + R) / 2 + (L − R) / 2 can land a float step off L — the very fault the note above `msWidth` in audio-fx.js describes. →
   left = L + g, right = R − g: the clip's own samples go straight through and only g is added, so Amount 0 is x + 0 = x, ===.
   prove.sh 4b puts the pile's wiring back.
3. **One highpass (12 dB an octave).** 60 Hz under its 150 Hz cut kept 1/6 of the width (side only 22 dB under the middle), so the
   bass was still spread. → Two in a row, Stereo Width's Keep bass centred filter: 1/40 (38 dB under). prove.sh 4c puts one back.
4. **Three inputs summed into one node** (the Haas right: the clip's right, −HP(R) and the late HP(R) all into one merger input).
   Chrome adds three or more in a different order per render, so the preview and the export could differ in the last bits. →
   Every node sums at most two (the Haas part is (late − now) summed first, then added to R in its own node).
5. **The low cut's filters were built at 150 Hz whatever the saved value** (only the first scheduled set put them right). → Built
   at the saved value, like Amount and Delay. (Not separately provable — the first set lands at time 0 either way.)
6. **The Amount slider was labelled "Width"**, the same word as Stereo Width's own slider, beside it in the same list. →
   **Amount** (the backlog's word). "Side low cut" → **Low cut**, "Fold-down safe" → **Mono-safe** (the backlog's words).
7. **No Output / Mix** (the pile's tree had no wrapper) → `mixOutput` adds both; no `dryLag` (nothing is late on the clip's path).

**Kept from the pile:** the law of both modes (g = Amount / 2 × the late, high-passed middle; Haas = Amount × (late − now) of the
right's highs), the ranges and defaults of all four controls, the key names, the speakers up-mix, the place after Stereo Width,
and its search words (extended).

## The tests (`966 B47 …`, appended to tests/tests.js; helpers end in `966b47`)

Each fails on 85b71929 on its first line, naming the missing effect (*"there is no Stereoizer: FM.audioFxRegistry has no
stereoizer (#966 B47 is not built)"*), never a TypeError. Rendered through `FM.buildAudioFxChain` on a two-channel
OfflineAudioContext with `afx482c` (export = `schedule`, preview = `applyAt`). Each statistic, and why:

1. **The effect** — category, after Stereo Width and before Pan (only the Channel Utility may sit between), keys, the three sliders,
   Mono-safe a TOGGLE (not options) with a note, Output, Mix, no dryLag, one-line desc, search words and the C13 non-matches, a new
   one's values, no control moves the preview signature, the load sanitiser.
2. **A mono clip comes out wide** — on white noise, the CORRELATION of left and right (1 for any mono output; it is the textbook
   measure of width), worked as (1 − k²c) / (1 + k²c): 0.603 at Amount 1, 0.883 at 0.5 (bounds 0.55–0.65, 0.85–0.92; the estimate
   is good to 0.003 over 43200 samples); the side's LEVEL re the middle (−6.06 / −12.08 dB ± 1); the left re the right within
   0.5 dB (it must not lean). CONTROL and the twin: Stereo Width at 2 plays the same clip with left === right, correlation 1.
3. **Mono-safe** — the largest |(left + right) / 2 − clip| on every sample, ≤ 1e-6 (one rounding a side is ≤ 6e-8), at Amount
   0.25 / 0.5 / 1 × Delay 1 / 12 / 30 ms, Low cut 20 and 1000, everything keyed, export and preview, and a stereo clip; a CONTROL
   in every render that the side is over 0.01 RMS (it did widen). CONTROL — the comb it rules out: Mono-safe Off (the pile's Haas)
   on a 1950 Hz tone at Delay 10 ms, read by exact-bin DFT, must be ≥ 10 dB down. Worked: the sum is x (1 + ½ a (e^−jωD − 1) H); at
   ωD = 39π that is 1 − H at Amount 1; the two highpasses' phase at 1950 Hz (prewarped Ω = 13.07, 0.108 rad each) leaves
   |1 − H| = 2 sin(0.108) = 0.216 = **−13.3 dB** (the deepest notch nearby is about −33 dB). Mono-safe On reads the same tone
   within 0.05 dB. (prove.sh 4a: g on the left only — a naive one-sided widening — fails it.)
4. **Low cut** — side re middle of a tone, by exact-bin DFT: 20 log10(½ |H|), |H| = Ω⁴ / (1 + Ω⁴). 60 Hz under 150: −38.1 dB (want
   ≤ −30; one highpass −22.1); 100 Hz under 400: −54.2 (want ≤ −40, a level difference of 0.17 dB at most — no ear places it
   off-centre; one highpass −30.1); 2 kHz above 400: −6.04 (want −6 ± 1: widened in full); the Haas mode's 100 Hz under 400 ≤ −40.
   CONTROL: under a 20 Hz cut the 100 Hz tone reads about −6 (over −8). (prove.sh 4c: one highpass fails it.)
5. **Amount 0 is the clip** — === on every sample, mono and stereo clip, Mono-safe On and Off, Delay 25 / Low cut 500 moved, export
   and preview, and a keyed Amount held at 0. CONTROL: Amount 1 moves the clip > 0.01. (prove.sh 4b: the pile's M ± (S + g) fails
   it on the stereo clip.)
6. **A stereo clip keeps its width and gets more** — by LINEARITY: the side out minus the clip's own side equals, within 1e-6 on
   every sample, the side the clip's middle makes when played alone as a mono clip (the middle reaching the filters is the same
   float both ways), and the middle comes out as (L + R) / 2 within 1e-6. CONTROLS: the clip has a side (> 0.2), and the middle
   makes a real one (> 0.02 RMS; worked 0.10).
7. **Mix / latency** — Mix 0 === the clip, Mix 0.5 within 1e-6 of halfway, and on one speaker Mix 0.5 is the clip within 1e-6 (a
   wet copy late by one sample would comb right there); no dryLag. CONTROL: Mix 1 moves the clip > 0.05.
8. **Preview = export** — two settings with every control moved (one with Mono-safe Off), within 1e-6; a second export = the first.
   (No node sums three inputs, so they should be identical.)
9. **Panel** (Chrome only, 390 and 1280 px) — Mono-safe is a tick box, ticked on a new one; Amount, Delay, Low cut, Output and Mix
   are sliders with diamonds, all inside the panel; a tap on Mono-safe stores 0 and does not move the preview signature.

## Questions for Ezra (#545 — he hears it first)

1. **Keep the Haas way (Mono-safe Off) at all?** It is the pile's, and it can sound wider in headphones — but on one speaker it
   goes hollow and the sound leans left. **Recommended: keep it, Off only on purpose** (On by default, and the note says what Off
   costs; "as much choice as possible", #966). Dropping it would remove one tick box and seven nodes.
2. **How wide is "all the way"?** Amount 1 puts the new side 6 dB under the middle (correlation 0.6 on noise) — the pile's law. Going
   to 0 dB would make it fully wide but each speaker alone would comb deeply. **Recommended: keep, hear it first.**
3. **It can make a loud clip louder.** left = x + g can peak 1.5× a full-scale mono clip at Amount 1 (Stereo Width has the same, and
   an Auto trim tick box for it). Output is there to turn it down. **Recommended: an "Auto trim" tick box like Stereo Width's
   (−1 dB at Amount 1 for noise) only if he hears clipping**; not built.
4. **Notes on sliders do not show.** inspector.js's audio bridge passes `note` for tick boxes and buttons only, not for sliders —
   so a Low cut note ("below this the sound stays in the middle") would be dropped. None was added. (The Channel Utility branch's
   Balance note has the same problem.) **Recommended: a one-line inspector change as a follow-up**, so slider notes show.
5. **A "this clip is mono" line?** Not needed here — this is the effect that is FOR mono clips. But Stereo Width's mono hint could
   point to it: *"…so this effect does nothing — try the Stereoizer."* **Recommended: yes**, a one-line follow-up in inspector.js.
6. **Where it sits** (after Stereo Width) and **a tile icon** of its own — drawn options per #545 if he wants one.

## Merge notes

- Changes: `js/audio-fx.js` (the `stereoizer` def with its STEREOIZER comment, right after Stereo Width's def; the TAGS line after
  `width:`), `index.html` (`audio-fx.js?v=20` → **21**), `tests/tests.js` (appended after `// ── end 966 B22 ──`), this folder.
  Nothing else: no inspector, browser or live-preview change (the tick box is the existing one), **`mixOutput` is untouched** (no
  dryLag), and no shared helper is added or changed (it uses `pairTargets`, `multi`, `BUTTERWORTH_DB`, `staticOf`, `initNum`).
- **The Channel Utility branch (hunt/pile-chanutil, #966 B46) also inserts right after Stereo Width**, in the def list AND in TAGS:
  adjacent insertions, a textual conflict at both places. Keep both, in the pile's order: **width, channelutility, stereoizer,
  pan** (and the same in TAGS). This branch's catalogue test already allows the Channel Utility between Stereo Width and the
  Stereoizer; the Channel Utility's own test wants it right after Stereo Width, which that order keeps.
- **Busters**: the other T06 port branches from the same base (Channel Utility, Hum Remover, De-esser, Noise Gate, Loudness Match,
  Auto-Wah, Graphic EQ) bump `audio-fx.js` to 21 too; at land time take the base's line and renumber above the highest (the
  index.html conflict rule).
- **Names shared with siblings**: none — the def's locals are inside its `build`, and the test helpers all end in `966b47`.
- **The Noise Gate branch changes `mixOutput`** (dryLag(ctx, inst)); this branch does not touch it, so no conflict there, and the
  Stereoizer declares no dryLag either way.
- **Collab fingerprint**: a new type with six params moves it. `C.SCHEMA_FP` is left alone on purpose (pinned once at the top of the
  chain); `921 S1 the schema fingerprint gate` goes red on this branch alone until then. prove.sh prints the number.
- **The pile: DROP 01297a19 when T06 lands** (`tools/design/chatgpt-tasks/pile/INVENTORY.md` T06), or there will be a second
  `stereoizer` def — the one with the drop-down, the single highpass and the three-input sum — plus its `outside/chatgpt/fixes/
  690-stereoizer.md` report and an `{ item: 'TBD' }` test titled '690 Stereoizer …'.
