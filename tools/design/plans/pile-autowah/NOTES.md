# #966 B48 — Auto-Wah, ported from the ChatGPT pile (cf34fcb2), hunt/pile-autowah

Built on hunt/fxnew-drums **85b71929**. Refers to #545: he hears it before anything ships.

**⚠️ NOTHING HERE HAS BEEN RUN.** Written on 15 Oct while the API builder was live: no node, no python, no browser, not even
`node --check`. Every number below is from the maths (the Web Audio spec's band-pass, a 12 Hz Butterworth), not a
measurement. The proof script is written and waiting: `scratchpad/agents/pile-autowah/prove.sh` (node harness, quiet slot
only), then the `966 B48` tests in Chrome at 900 and 380.

## What it is

An audio effect in **Character, right after Vibrato**: `autowah`, label **Auto-Wah**. A band-pass whose centre moves by itself.

| Control | Range | Default | Kind |
|---|---|---|---|
| Motion | LFO / Envelope | LFO | two buttons (CHOICE, stored 0 / 1), a rebuild, not keyframable |
| Base | 200 … 4000 Hz, step 1 | 500 | keyframable |
| Range | 100 … 5000 Hz, step 1 | 2500 | keyframable |
| Resonance | 0.5 … 15, step 0.1 | 5 | keyframable (the band's Q) |
| Rate | 0.1 … 8 Hz, step 0.01 | 2 | keyframable (LFO only) |
| Sensitivity | 0.25 … 10, step 0.05 | 4 | keyframable (Envelope only) |
| Output, Mix | −24 … +12 dB, 0 … 1 | 0, 1 | the shared wrapper (`mixOutput`, #482 8.1) |

- **LFO**: the centre sweeps from Base up to Base + Range and back, Rate times a second, starting at Base when the scene is at 0.
- **Envelope**: the centre opens with the sound's level: Base + Range × min(1, Sensitivity × level), level = the mean of |x|.
  At the default 4, a sound whose mean level is 0.25 (a loud mix) opens it all the way; a quiet voice opens it part way.
- Description (on the def as `desc`, like the Graphic EQ's): *"A filter that sweeps up and down by itself, or opens as the
  sound gets louder: the guitar wah, on anything."*
- Search words: the pile's five (wah, guitar, sweep, envelope follower, filter sweep) plus wah wah, auto wah, funk, envelope
  filter. Checked against queue 986 C13's stray rule: on, no, the and low do not list it.
- Tile icon: none of its own — it falls back to the Character category's glyph. A glyph is a picture, so it is his pick (#545).

## What was ported, and what changed

From cf34fcb2 (`js/audio-fx.js` +55, a one-line `index.html` buster, one test with `item: 'TBD'`, a build report):

**Taken as they were:** the type, label and category; the six controls with the pile's ranges, steps and defaults; the graph's
shape — a band-pass whose frequency is Base plus (an LFO or a follower) × Range; the follower as rectify → 12 Hz Butterworth
low-pass → × Sensitivity → clamp 0…1; the pile's five search tags.

**Changed:**
1. **THE FIX (LAND-LIST: "the Auto-Wah options").** The pile declared Motion as
   `Object.assign(P('mode', …), { options: ['LFO', 'Envelope'] })` — bare strings. This tree draws an audio choice with
   `inspector.js fxSegment`, which reads each option as `[value, label]`: the buttons said **"F"** and **"n"**, a tap stored
   **'L'** or **'E'**, `valueAt`'s nearest-option snap compared numbers with letters (NaN, so it always answered 'L'), and the
   load sanitiser turned a saved 'E' back into LFO. Now `CHOICE('mode', 'Motion', [[0, 'LFO'], [1, 'Envelope']], 0,
   { rebuild: true })`. The pile's `afxChoice` drop-down (eda6773b) was NOT taken — cf34fcb2 does not use it, and this tree
   already draws audio choices as buttons.
2. **Mix and Output from the shared wrapper**, not the pile's own `MIX(1)` + `wetDry` (pre-8.1). Same sound at Mix 1; Output is
   new; Mix 0 is the clip sample for sample.
3. **A rebuild, one path per mode.** The pile built both paths every time and switched them with a bypass pair. Now Envelope
   builds no LFO and LFO builds no follower (CPU), and switching Motion rebuilds the preview, which a choice should.
4. **The sweep's shape: `hann` (½ − ½·cos), not `win` (sin πp).** Both go Base → Base + Range → Base once a cycle; `win` turns
   with a sharp corner at the bottom (the band bounces off Base), `hann` is smooth at both ends. A new LFO_WAVE entry;
   nothing else uses it.
5. **A keyframed Rate is integrated.** Inside a render the LFO buffer's place already is the integral of its playbackRate, so
   the sweep never jumps at a key. But where a render STARTS, `arm()` put every LFO at rate(now) × now — so an export of a
   later range, or the preview after a seek, started the sweep somewhere a render from 0 never is (the comment there called
   it "the price of a keyframed rate"). The Auto-Wah's LFO declares `cycOf`, and `arm()` starts it at
   `FM.integrateProp(rate, 0, now)` — the visual generators' queue-913 rule. A plain Rate keeps rate × time. No other LFO
   declares `cycOf`, so no other effect changes (prove.sh stage 7 renders them all on both trees to show it).
6. **Stereo detection rectifies first, then down-mixes** (`(|L| + |R|) / 2`), instead of the pile's down-mix then rectify
   (`|L + R| / 2`), so a wide or out-of-phase stereo sound cannot cancel itself out of the follower. Same on mono.
7. **A real test suite** in place of the pile's one `item: 'TBD'` test (its idea — Envelope follows the level, LFO does not —
   lives on in the Envelope test).

Not taken: `outside/chatgpt/fixes/690-auto-wah.md` (the pile's build report), its `?v=` number, its test.

## The choices, and why

- **Linear in Hz, as the pile had it.** Base + Range × swing. A pedal's sweep is closer to even in pitch (octaves); with a
  linear 500 → 3000 Hz sweep the band moves fast through the low part and lingers up top. A one-line change if he prefers it
  (question 2).
- **The follower has one speed.** A 12 Hz Butterworth on |x| rises and falls 90 % of the way in about 30 ms. Separate Attack
  and Release need a nonlinear follower, which native nodes cannot make, and a worklet would not be the same code in the
  export. A "Response" slider (the smoothing frequency, keyframable — it is an AudioParam) is possible (question 3).
- **Resonance narrows the band; it does not lift it.** The spec's band-pass keeps its peak at the clip's level at any Q, so
  more Resonance makes the peak stand further out (the octave either side: −5.1 / −17.6 / −27.1 dB at Q 1 / 5 / 15) and makes
  the whole sound quieter. Output is there for that (question 4).
- **No latency.** Biquads and un-oversampled shapers answer on the same sample; the Mix's dry copy needs no `dryLag`.
- **Preview = export, nothing kept between renders.** Native nodes, set through the same AudioParams by `applyAt` and
  `schedule`. The follower starts closed at the start of every render (an export that begins in a loud passage opens in
  ~30 ms, the preview the same).

## Tests (`tests/tests.js`, `966 B48 …`, appended before the final `})();`)

Each starts with `need966b48()`, so on 85b71929 every one fails on its first line with *"there is no Auto-Wah:
FM.audioFxRegistry has no autowah (#966 B48 is not built)"* — never a TypeError. The helpers are top-level `function` /
`const` declarations whose names end in `966b48`, so the node harness can lift them (prove.sh makes `hw.js` from `hv.js` with
that one rule widened).

**The statistic for "where the band is"** (tests 2–4): the **log-frequency centroid** of a Hann-windowed 1024-sample spectrum
(41 probes, 1/6 octave apart, 125 Hz – 12.7 kHz). A band-pass's response depends only on f/f0 − f0/f, symmetric about f0 on a
log axis, so on white noise the log centroid lands on f0. A linear centroid or the zero-crossing rate is dragged far up by the
6 dB/octave skirt (a Q-5 band at 500 Hz would read ~750 Hz and ~1.2 kHz).

1. **The effect, and the fix** — Character after Vibrato; Motion read exactly as fxSegment reads it: buttons "LFO" / "Envelope",
   taps store the numbers 0 / 1. CONTROL: the pile's bare strings through the same reader read "F" / "n" and store 'L' / 'E'.
   Ranges, defaults, keyframable, Motion the only rebuild (signature), Output and Mix, one-line description, search words and
   strays, the sanitiser (Envelope kept, Base 9000 → 4000, keyed Rate clamped to 8, junk → default, stray key gone, a saved 'E'
   → 0).
2. **The sweep** — LFO on noise: the centre's lowest 5 % in 400–700 Hz and highest 5 % in 2.4–3.7 kHz (a seventh of each cycle
   is within 5 % of an end); the periodogram peak of log2(centre) within 0.12 Hz of Rate, at Rate 3 and 1.5 (two rates, so a
   sweep that ignored Rate fails).
3. **A keyed Rate is integrated** — Rate keyed 0.2 → 0.6 Hz over 4 s; an export from 3 s and a preview built at 3 s must put the
   band where the export from 0 has it (median within 0.08 octave, 90 % within 0.2; same noise samples). CONTROL: a plain Rate
   started at 3 s (= rate × time) reads > 0.7 octave away (~1.7 by the maths).
4. **The follower** — a loud burst (±0.54) on a quiet floor (±0.018): in the burst the centre is 500 + 2500 × 0.27 × S within
   0.3 octave (1175 / 1850 / 3000 Hz at Sensitivity 1 / 2 / 4), under 700 Hz before and after, rising with S; at S 4 it is half
   way open within 0.1 s and half way closed within 0.15 s.
5. **Mix 0 is the clip** — sample for sample (b3SameAsToday: noise, sweep, clicks, stereo, export and preview), in LFO, in
   Envelope, and Mix keyed 0 → 0 under a fast sharp sweep. CONTROL: Mix 1 is not.
6. **Preview = export** — LFO and Envelope with Output −3 and Mix 0.8, noise and a sweep, stereo: within 1e-6 (should be 0).
   CONTROL: the export moves the clip by > 0.01.
7. **Resonance sharpens the peak** — the sweep held still (Rate 0.1, Range 100) at Base 1 kHz: the 1 kHz tone within 0.3 dB of
   its level, the octave tones within 0.5 dB of the spec's prewarped band-pass at Q 1 / 5 / 15, and the peak stands further out
   as Q rises. Also proves Base puts the band where it says.
8. **On screen (browser only)** — Motion is two `.fx-seg-btn` buttons reading LFO and Envelope that fit at 390 and 1280 px, LFO
   lit; a tap on Envelope stores the number 1 and moves the signature; the five sliders, Output and Mix each have a keyframe
   diamond. In the node harness it can only fail on the missing DOM; it proves something in Chrome.

The existing `482 8.1` walk now also checks this one's Output and Mix.

## Questions for Ezra (by ear)

1. **Does it sound like a wah** on a guitar, a voice and a drum loop? Are the defaults right (500 Hz → 3 kHz, Resonance 5, 2 Hz,
   Sensitivity 4)?
2. **Even in Hz or even in pitch?** Today (as the pile had it) the sweep is even in Hz, so it races through the lows and hangs at
   the top. An even-in-pitch sweep is what a pedal does. Options drawn and heard first.
3. **Envelope speed** — one speed (~30 ms each way). Does it want a Response slider (faster / slower follow)?
4. **Resonance and loudness** — more Resonance is quieter (the band narrows; the peak does not rise). Should Resonance also lift
   the peak, so it gets more vocal rather than thinner?
5. **More**: a Shape for the LFO (Sine / Triangle / Square / Saw, like Tremolo's), presets (Funk guitar, Slow sweep, Talk-box)?
6. **A tile icon of its own** — drawn options per #545 if he wants one.

## Merge notes

- Changes: `js/audio-fx.js` (the two follower curves and its speed after `BITE`; `hann` in LFO_WAVE; `cycOf` on the LFO record
  and in `arm()`; the def after Vibrato; its tags), `index.html` (`audio-fx.js?v=20` → **21**), `tests/tests.js` (appended),
  this folder. Nothing else — no inspector, browser or live-preview change.
- **Busters**: sibling branches built from the same base (Graphic EQ, …) bump `audio-fx.js` to 21 too; at land time take the
  base's line and renumber above the highest (the index.html conflict rule).
- **Collab fingerprint**: six new registry params move it. `C.SCHEMA_FP` is left alone on purpose (pinned once at the top of
  the chain); `921 S1 the schema fingerprint gate` goes red on this branch alone until then. prove.sh prints the number.
- **The pile: drop cf34fcb2 when T06 lands** (`tools/design/chatgpt-tasks/pile/INVENTORY.md` T06), or there will be a second
  `autowah` def with the bare-string Motion row. Its afxChoice drop-down (eda6773b) is superseded by this tree's buttons.
- **`arm()`'s `cycOf` is general.** Tremolo, Vibrato, Chorus, Flanger, Phaser and Auto-Pan still start a keyframed Rate at
  rate × time. Giving them `cycOf` fixes the same start-phase fault, but changes how an old project with a keyed Rate plays
  from a later start — out of scope here (old effects must render byte for byte the same); a follow-up.
