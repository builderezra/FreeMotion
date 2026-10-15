# #966 B42 — Noise Gate, ported from the ChatGPT pile (c63db8ef), hunt/pile-noisegate

Built on hunt/fxnew-drums **85b71929**. Refers to #545: he hears it before anything ships.

**⚠️ NOTHING HERE HAS BEEN RUN.** Written on 15 Oct while a release ship was running: no node, no python, no browser, not
even `node --check`. The numbers below come from the formulas and from a per-sample model of both graphs written in awk
(`scratchpad/agents/pile-noisegate/model.awk` — the spec's biquad formulas in double, the loops as ring buffers; a model, not
the app). The proof script is written and waiting: `scratchpad/agents/pile-noisegate/prove.sh` (node harness, quiet slot only),
then the `966 B42` tests in Chrome at 900 and 380.

## What it is

An audio effect in **Dynamics, right after the Limiter**: `noisegate`, label **Noise Gate**. It mutes what is under Threshold
(room noise, hiss, breaths between words) down to Floor, and lets what is over it through untouched.

| Control | Range | Default | Kind |
|---|---|---|---|
| Threshold | −60 … 0 dB, step 0.5 | −40 | keyframable |
| Floor | 0 … 100 %, step 1 | 0 | keyframable (how far it shuts: 0 = silence, 20 = −14 dB) |
| Hold | 0 … 0.5 s, step 0.01 | 0.05 | keyframable — **new**, not in the pile |
| Release | 0.02 … 1 s, step 0.01 | 0.15 | keyframable — after Hold, 60 dB down over this long, evenly in dB |
| Lookahead | Off / 2 / 5 / 10 / 20 ms | 5 ms | five buttons (CHOICE, stored 0 / 2 / 5 / 10 / 20), a rebuild |
| Hysteresis | 0 … 12 dB, step 0.5 | 6 | keyframable — opens at Threshold, shuts only this far under it |
| Output, Mix | −24 … +12 dB, 0 … 1 | 0, 1 | the shared wrapper (`mixOutput`, #482 8.1) |

- Description (`desc`): *"Mutes the room between words and sounds, and lets each one finish before it closes."*
- Search words: noise gate, gate, room noise, background noise, hiss, silence, breaths, expander (the pile's five plus three).
  Checked against queue 986 C13's stray rule: on, the, low and round do not list it.
- Tile icon: none of its own — the Dynamics glyph. A glyph is a picture, so it is his pick (#545).

## The cause of "Noise Gate cuts off word endings" — and the fix

**The cause, plainly.** The pile's gain was `max(fast, slow)` of the gate's open / shut state (0 or 1), where fast is a 200 Hz
low-pass and slow a low-pass at 1 / (2π × Release). (Not one-pole, as the brief read it: both are 2nd-order Butterworth biquads.)
**A low-pass of the state fills exactly as slowly as it empties.** So when the gate shut, what Release "held up" was whatever the
slow path had filled to while the gate was open — a step response, 1 − e^(−a)(cos a + sin a) with a = time open / (√2 × Release).
At the default 0.15 s:

| the gate had been open | slow path when it shuts | the drop, within ~3 ms of shutting |
|---|---|---|
| 50 ms | 0.047 | −26.5 dB |
| 100 ms | 0.16 | −15.9 dB |
| 200 ms | 0.46 | −6.8 dB |
| 300 ms | 0.72 | −2.8 dB |
| 500 ms or more | ≈ 1 | none — the only case that got the fade Release promises |

The fast path falls to 0 in about 3 ms, so the gain steps down to that number at once, mid-tail, and then hangs there: the slow
path has to empty from wherever it is, at the same slow rate.

**On a word** (model of the pile's whole graph: a 1 kHz tone at −26 dBFS, then a tail falling 0.24 dB a millisecond through the
−40 dB threshold): the pile shut when the tail was at −41.3 dBFS, 64 ms into it (it read the plain mean of |x|, 3.9 dB under a
tone's peak, and shut 6 dB under that). Three milliseconds later the tail was **3.7 dB down after a 200 ms word, 8.7 dB after a
100 ms one and 13.3 dB after a 50 ms one**, and it stayed 3 to 13 dB down — half open to the room — reaching −20 dB only 231,
331 and 381 ms after shutting. In the brief's terms: on the 200 ms word the pile turned the last 68 ms of the audible tail (from
−41.5 down to −58 dBFS) down by 3.6–3.8 dB at once, a sudden drop where the word should fade; after a 50 ms sound (a short
"s") the same stretch lost 10 to 13 dB, 13 of them within 3 ms. That step is the "cut off" ending — and the half-open hang after it is room noise left in between words.

**The fix: Release acts on the GAIN, from full, whatever came before.** The gate remembers *when* it was last open, and the gain
is a function of the time since: full for Hold, then 60 dB down over Release, evenly in dB. The model, same words, defaults: it
shuts when the tail is at −45.3 dBFS, holds full for Hold (50 ms, plus 2.7 ms — below), is −19.5 dB 100 ms after shutting and
−39.5 dB at 150 ms, and is shut by 205 ms. The tail is kept whole down to −57.9 dBFS (133 ms into it, 18 dB under the
threshold), the same after a 200, 100 or 50 ms word.

**How, with nodes only** (the file's rule: no worklet, no ScriptProcessor, so the export can share it):
- **A clock** — seconds since the build, from 4 s: an AudioParam ramp on the gain of a looping buffer of ones (an engine without
  ConstantSourceNode still has these).
- **The last time open** = state × clock + (1 − state) × itself one loop ago. A GainNode whose gain the state drives is the
  multiply; a loop holds a value because a DelayNode in a cycle hands back what it was given a render quantum earlier (queue 986
  C16 measured τ + 128 frames in Chrome; τ is 0 here, so 128).
- **z = (clock − last − Hold) / Release** through three curves: held to −1 … 1 and moved to −1 … 0 (so a render's empty start
  reads as "shut long ago"), a 256-sample box average, then the gain (full to z = 0, −60 z dB to z = 1, then 0).
- **The box is there because of the loop.** Each of a quantum's 128 samples keeps its own memory, so "time since it shut" climbs
  in steps of 128 frames — 1.07 dB steps every 2.7 ms on the fade at Release 0.15. A 256-sample average (a ConvolverNode with
  normalize off) turns that staircase back into a straight line whether the engine's loop is 128 or 256 frames (both divide it);
  it adds 2.7 ms to Hold. Release and Hold stay plain AudioParams (keyframable), and the timing does not depend on the loop's
  length at all: the model's hold moves 1.3 ms between a 128- and a 256-frame loop.
- **Opening** is a separate fast path: the state through a 400 Hz Butterworth (full within ~1.3 ms), added to the release path
  and held to 0…1. Both are 1 while it is open, so an open gate is exactly × 1, and the opening path's own overshoot and
  undershoot are clipped away.

**Kept from the pile:** the Schmitt trigger (open at Threshold, shut Hysteresis under it — the pile's feedback through a delay and
a step curve, and its 0.5 × (1 − 10^(−H/20)) is right); the five controls' keys, ranges, steps and defaults (Lookahead's values
as buttons); the Floor mix (Floor + (1 − Floor) × gain); the 120 Hz detector; the Lookahead delay on the sound; the five tags.

**Also changed:**
1. **The level** is the louder of |left| and |right| (½(a + b + |a − b|)), a mono clip up-mixed first, × π/2 so a steady tone
   reads its peak: Threshold −40 opens on a tone peaking over −40 dBFS. The pile down-mixed before rectifying, so an
   out-of-phase pair cancelled out of the detector and a sound on one side read 6 dB low.
2. **Lookahead is five buttons** (Off, 2, 5, 10, 20 ms; stored as those numbers; CHOICE, this tree's helper — not the pile's
   `afxChoice` drop-down, which c63db8ef never used). The delay is part of the graph, so it is a rebuild: as a slider every step
   of a drag would rebuild the live chain. A stored value between buttons plays as the nearest (7 → 5 ms).
3. **Mix waits for the gate.** This tree's 8.1 wrapper would have given the pile's def a Mix whose untouched copy arrived 5 ms
   early — a comb, notches every 200 Hz. `mixOutput`'s `dryLag` now takes the instance (`dryLag(ctx, inst)`) and adds no delay
   when it is 0; the Noise Gate's is its Lookahead in whole frames, the same number its own delay uses. The Limiter's graph is
   unchanged (its dryLag ignores the second argument and is never 0) — prove.sh stage 6 renders it at Mix 0.5 on both trees.
4. **Hold** is new (0–0.5 s, 50 ms): a gate's usual third time, and what bridges the gap between a word and its last
   consonant. Question 3.
5. **The loops' delay is 0, not 128 / rate** — Chrome adds the quantum anyway (C16), so the pile's loop was 256 frames; 0 gives
   128 in Chrome and a clamped 128 in a spec engine, exact either way (128 / 48000 is not a whole float32 number of frames).
6. A real test suite in place of the pile's one `item: 'TBD'` test (its idea — quiet shut, loud open — lives on in test 2).

Not taken: `outside/chatgpt/fixes/690-noise-gate.md` (the pile's build report), its `?v=` (23), its test, its `hint` (this
tree's panel no longer draws hints; the text is the `desc` now), its GATE_STEP / WAH_RECTIFY / WAH_ENVELOPE_LIMIT names (the
last two come from its Auto-Wah commit; here they are NG_STEP / NG_ABS / NG_UNIT).

## Latency and the picture

The gated sound is **Lookahead late — 5 ms by default, 20 at most, none at Off** — in the preview and the export alike, and so
is the Mix's untouched copy. **Nothing in the app shifts an effect's latency back** (searched: exporter.js, audio-fx-live.js and
audio-play.js have no effect-latency compensation; app.js's latency code is the element's output latency, a different thing);
the Compressor and the Limiter are already 6 ms late the same way. 5–20 ms of late sound is far under what anyone notices
against the picture (late sound starts to show at around a tenth of a second). Off is there for anyone who would rather lose
the first millisecond or two of a word than move it.

**Preview = export:** one graph of native nodes, driven through the same AudioParams by `applyAt` (preview) and `schedule`
(export). **Nothing is kept between renders:** the clock and the memory start from nothing, shut, in every build (a render
that begins mid-word opens within ~2 ms, under the Lookahead). Test 7 checks both, to 1e-6.

## Tests (`tests/tests.js`, `966 B42 …`, appended before the final `})();`)

Each starts with `need966b42()`, so on 85b71929 every one fails on its first line with *"there is no Noise Gate:
FM.audioFxRegistry has no noisegate (#966 B42 is not built)"* — never a TypeError. Helpers are top-level `function` / `const`
whose names end in `966b42` (prove.sh widens the harness's lifting rule to them).

**The statistic for "the gain"** (tests 3, 4, 5): a 1 kHz tone (48 samples a cycle at 48 kHz) through the gate, the output's
power over each 1 ms window against the input's power over the window a Lookahead earlier. Each window is a whole cycle, so the
ratio is the gain the gate applied there whatever the phase — a gain envelope read from the sound, with no access to the graph.

1. **The effect** — Dynamics after the Limiter; the eight keys in order; each slider's range, step, default, keyframable, no
   rebuild; Lookahead read exactly as fxSegment reads it (buttons Off|2 ms|5 ms|10 ms|20 ms, taps store the numbers 0/2/5/10/20,
   not keyframable, a rebuild); Output, Mix; one-line description; dryLag 240 / 960 / 0 frames at 5 / 20 / Off, a stored 7 →
   240; the search words and strays; the signature moves only for Lookahead; the sanitiser (−80 → −60, Floor and a stored 7
   kept, a keyed Release clamped to 0.02 and 1, junk → default, a stray key gone).
2. **Shut to the Floor, open at unity** — a −50 dBFS tone under −40: silent at Floor 0 (under −100 dB; the gain is exactly 0),
   −13.98 and −6.02 dB at Floor 20 and 50 (±0.1); a −20 dBFS tone at 0 dB (±0.1) and the input exactly 240 samples late
   (within 1e-4). CONTROL: one sample off that shift is over 1e-3 away.
3. **A word keeps its ending (THE FIX)** — the word above, 200 ms and 100 ms: KEPT, every window within 0.5 dB of full from
   50 ms before the word ends to 35 ms after the tail crosses the close level (model: first −0.5 dB at 49 ms); HOLD, first 3 dB
   down 45–75 ms after that crossing (model 55, 54 with a 256-frame loop); RELEASE, the windows from −6 to −40 dB (≥ 60) on a
   straight line of −0.40 dB/ms ±0.06; SHUT, under −50 dB from Hold + Release + 10 ms on. The pile's release, put back into
   this graph (prove.sh stage 4), fails KEPT by about 3.3 dB (200 ms) and 7 dB (100 ms), HOLD by 40 ms and RELEASE outright.
4. **Hysteresis stops it fluttering** — a tone at −40 ± 3 dB twice a second: Hysteresis 6 → 0 flips, never under −0.5 dB.
   CONTROL: Hysteresis 0 → ≥ 6 flips (model 8).
5. **Lookahead opens it before a word starts** — a −12 dBFS burst starting on its peak: at 5 and 20 ms its first sample comes
   out at its own size (±0.3 %), the first ms within 0.05 dB, the sample before it silent; at Off the first sample is under 1 %
   (model: 0) and the first ms more than 3 dB down (model −12.8).
6. **Mix waits for the gate** — open on noise: Mix 0.5 = Mix 1 (within 1e-5, should be exact), Mix 0 = the clip 240 samples late
   (3e-5, the delay line's float32 time); Lookahead Off + Mix 0 = the clip sample for sample (b3SameAsToday, stereo, export and
   preview). CONTROL: half an untouched copy not held back is over 0.1 away (a comb).
7. **Preview = export, nothing kept** — every control moved, a word and gated noise, stereo: within 1e-6, and a second export
   equals the first. CONTROL: the export moves the clip by over 0.01.
8. **On screen (browser only)** — Lookahead is five `.fx-seg-btn` buttons that fit at 390 and 1280 px, 5 ms lit; a tap on 20 ms
   stores 20 and moves the signature; the six sliders, Output and Mix each have a keyframe diamond. In node it can only fail on
   the missing DOM; it proves something in Chrome.

The existing `482 8.1` walk now also checks this one's Output and Mix.

## Questions for Ezra (by ear, on his own recordings)

1. **Does it clean up a voice without chopping it?** Defaults: −40 dB, Hold 50 ms, Release 150 ms, Hysteresis 6 dB, 5 ms.
2. **Floor in % or in dB?** The pile's % (20 % = −14 dB) is kept. Gates usually say "Range" in dB (−80 … 0); a one-line change.
3. **Hold** is new (not in the backlog's five). Keep it?
4. **Lookahead as five buttons** rather than the pile's 0–20 ms slider (a slider would rebuild the sound on every step of a drag).
5. **Attack** is fixed (~1.3 ms to open). Would a slower, softer opening (an Attack control) be wanted, e.g. for music?
6. **"Listen"** to hear only what is being removed (like a De-esser's)? Not built.
7. **Where it sits**: after the Limiter (the pile put it after the Compressor). His call.
8. **A tile icon** of its own — drawn options per #545 if he wants one.

## Merge notes

- Changes: `js/audio-fx.js` (the NG_ curves, ngOver / ngHyst / ngLagSecs / ngGain just above the Dynamics section; the def
  after the Limiter; `mixOutput`'s dryLag — `d.dryLag(ctx, inst)`, no lag node at 0; the TAGS line), `index.html`
  (`audio-fx.js?v=20` → **21**), `tests/tests.js` (appended), this folder. Nothing else — no inspector, browser or live-preview
  change (Lookahead's buttons are the existing fxSegment, its `note` the existing row note).
- **Busters**: sibling branches built from the same base (Auto-Wah, Graphic EQ, …) bump `audio-fx.js` to 21 too; at land time
  take the base's line and renumber above the highest (the index.html conflict rule).
- **NG_ABS and NG_UNIT are the Auto-Wah port's WAH_RECTIFY and WAH_CLAMP** (the same curves, 2049 points). When both land, keep
  one name for each.
- **mixOutput**: if another branch also touches the `dryLag` line, keep `(ctx, inst)` and the `> 0` test — the Limiter is
  byte-identical either way.
- **Collab fingerprint**: eight new registry params move it. `C.SCHEMA_FP` is left alone on purpose (pinned once at the top of
  the chain); `921 S1 the schema fingerprint gate` goes red on this branch alone until then. prove.sh prints the number.
- **The pile: drop c63db8ef when T06 lands** (`tools/design/chatgpt-tasks/pile/INVENTORY.md` T06), or there will be a second
  `noisegate` def with the release that cuts word endings. It takes nothing from eda6773b (afxChoice) or cf34fcb2 here.
