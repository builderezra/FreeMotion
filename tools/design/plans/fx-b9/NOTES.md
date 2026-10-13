# #482 / #966 polish batch 9 — working notes (branch hunt/fx-b9)

Backlog: `tools/design/plans/2026-09-29-idle-backlog/backlog.md`, "### Batch 9 — Sound-effect library" and "### 0.3 Build rules".
Base: 6f1d90b1 (fx-all, SCHEMA_FP 4775724801447341). Nothing pushed from here; the PM reviews and pushes.

## State (13 Oct, third agent — CODE ONLY, NOTHING RUN)

| Item | State | Commit |
|---|---|---|
| 9.1 Search + category chips | NOT BUILT — new UI, drawn and shown to him first (#545) | — |
| 9.2 Options drawer per row (fixes C11's drawer half) | NOT BUILT — new UI, drawn first | — |
| 9.3 Nature beds at usable lengths | built (first agent) | 1c389cdf |
| 9.4 Rain with drops | built (first agent) | 4a587538 |
| 9.5 Lo-Fi wow / flutter / hiss / crackle | **built, not run** | 528057bd |
| 9.6 Flanger manual / ±feedback / stereo | **built, not run** | 8b95d3fb |
| 9.7 Bit Crush tone (no `rate`: needs a worklet — Ezra) | **built, not run** | 06484b78 |
| 9.8 Reverb damping | **built, not run** | 646676b2 |
| proof | **prove.sh written, NOT run** (scratchpad `agents/fx-b9/prove.sh`) | — |
| batch review | not started | — |

**9.5–9.8 were written with no node, no python and no browser** (13 Oct: the API builder was shipping back to back and
extra CPU could turn its 2-hour ship red). Every threshold in the four tests is reasoned from the maths it names; none has
been rendered. Before this lands: `bash bg.sh prove.sh` in the scratchpad (it refuses while a ship runs), read
`prove-result.txt`, and fix what it finds. Buster: audio-fx.js ?v=19 (4a587538 had 18). SCHEMA_FP MOVES and is left alone
(pinned at integration — prove.sh stage 7 prints the new number).

## What was built (9.5–9.8, all in js/audio-fx.js; one commit and one '482 9.N …' test each)

- **9.5 Lo-Fi** — `wow`, `flutter`, `hiss`, `crackle` (0–1, def 0, keyframable). Wow / Flutter: a short delay each
  (2.5 ms ± 2.5 ms × Wow at 0.5 Hz; 0.25 ms ± 0.25 ms × Flutter at 8 Hz), swung by a scene-pinned sine (`s.lfo`), each in
  its own bypass pair, ahead of the band. Hiss: `pinkBuffer` (4 s, Kellet's filter run twice round so the loop has no
  seam, RMS 0.25) through a 2 kHz Butterworth highpass, gain hiss × 0.2. Crackle: `crackleBuffer` (3 s, ~12 ticks a second,
  0.2–1.5 ms decaying noise bursts, level 0.08 + 0.92·u⁴, written modulo the length, peak 1), gain crackle × 0.3. Both ride
  a new `shop.bed` (armed like Telephone's `s.noise`) into the wet sum after the crush. Constants: LOFI_WOW / LOFI_FLUTTER
  / LOFI_HISS / LOFI_CRACKLE, PINK_RMS, CRACKLE_PER_SEC.
  Test: red on 6f1d90b1 / 4a587538 at line 1 ("the Lo-Fi has no Wow (its params are amount, output, mix)").
- **9.6 Flanger** — `manual` 0.5–10 ms def 4 (keyframable), Feedback −0.9…+0.9, `stereo` 0–180° (rebuild, not
  keyframable). LFO → amp (Depth × 3 ms) → span (Manual / 4) → every tap's delayTime (resting at Manual / 1000). Stereo > 0:
  a lane per channel (the Phaser's). Stereo 0 keeps Rate on the LFO's own param (`params.rate`), as today.
  Test: red at line 1 ("the Flanger has no Manual (its params are rate, depth, feedback, shape, output, mix)").
- **9.7 Bit Crush** — `tone` 1000–20000 Hz def 20000 (keyframable): a Butterworth lowpass on the crushed sound in a bypass
  pair; the static shaper and the keyframed bank now feed `wetSum` first. Output is 8.1's (not added again).
  Test: red at line 1 ("the Bit Crush has no Tone (its params are bits, output, mix)").
- **9.8 Reverb** — `damping` 0–1 def 0 (NOT keyframable). `impulse(ctx, size, decay, damping)` → `dampIR` (one-pole,
  fc(x) = 600^(d·x) · (4·sr)^(1−d·x)); the cache key gains `|damping` only above 0; the animated-room bank's rooms use the
  same damping; a `damping` setter swaps the room (no rebuild, so the signature does not move). Auto-Pan's Realism room
  passes none (= 0). The five Reverb presets name `damping` too (8.2's rule: a preset names every control that shapes the
  character). Test: red at line 1 ("the Reverb has no Damping (its params are size, decay, predelay, highcut, lowcut,
  width, output, mix)").

Every new default is today's sound sample for sample: pairs x·1 + y·0, zero gains x + 0, Manual 4 = 0.004 and a gain of
exactly 1, Tone 20000 a pair off, Damping 0 the very IR and cache key. Each test carries a CONTROL that a saved effect is
a hand-built copy of today's graph (b3SameAsToday — the Flanger's to 1e-6, sixteen taps summed in the engine's own
order), Mix 0 = the clip's very samples where the effect has a Mix, preview = export, and a keyframed render where the
control is keyframable. Lists the new keys reach, all read and registry-driven: storage.js sanitizeAudioFx,
collab-core.js schemaFingerprint, audio-fx-live.js signature (via rebuildKey), inspector.js afxParam / the audio rows.

## For the integration (things noticed, not changed)

- **'482 3.3 and 3.4 Echo and Reverb panels …' is already stale on fx-all**: it demands the open Reverb's slider labels be
  exactly Size, Decay, Pre-delay, Tone, Low cut, Width, Mix — but 8.1 added Output (and 8.7 Tempo / Note on the Echo), so
  it cannot pass in Chrome on 6f1d90b1 either; 9.8 adds a Damping row to that list. Its WANT lists need updating at
  integration (a UI test: the node harness cannot run it, so prove.sh cannot see it).
- SCHEMA_FP moves (new params on four effects, and the Flanger's Feedback min). prove.sh stage 7 prints the number.
- Lo-Fi now has LFOs and beds, so it lists `lfos` (arm starts them on scene time) — a Lo-Fi chain costs two delays, two
  sine sources, two looping beds and one more biquad, built always (the bypass-pair rule), silent at the defaults.

## What prove.sh checks (scratchpad agents/fx-b9/prove.sh → prove-result.txt; raw outputs in prove/)

Trees: OLD 6f1d90b1, PRE 4a587538, NEW = the worktree's HEAD commit (archived). Harness: aud-red's h.js + wa.js. Checks
`/home/ezra/FreeMotion/.ship-in-progress` before every stage and stops (exit 99) if a ship runs.
1. parse — tests/tests.js parses (vm.Script); `node --check` every js changed since 6f1d90b1.
2. red — the four new tests FAIL on OLD's and PRE's app code with "has no …" (not a TypeError), from NEW's tests file.
3. green — the four PASS on NEW (full messages kept if not).
4. base — base2.sh's list ('482 3.' '482 7.' '482 8' '482 9.3' '482 9.4', 986 C11/C15–C18, 709, the sound-effect and
   keyframed-effect tests): the same verdict per title on PRE (its tests) and NEW (its tests).
5. legacy — legacy.js renders saved Lo-Fi / Flanger / Bit Crush / Reverb (still and animated) / Auto-Pan Realism /
   Telephone, raw and sanitised, export and preview, and the FNV hashes must be identical on PRE and NEW.
6. sweep — fx-b8's mock.js: 0 fails and 0 over-max on PRE and NEW.
7. fp — fp.js CONTROL on ~/fm-helper-wt/fx-all (4775724801447341, match true), PRE (unchanged), NEW (moved — printed).
8. tree — treecheck.py 6f1d90b1 HEAD (busters, script tags, tests parse) and drops.py (0 dropped).

## What is ALREADY DONE elsewhere (checked against ssh/main and this tree)

- **C16 (9.6's fix half)**: fixed in queue 986, v17.16 (REQUESTS.md on ssh/main line ~34755, "16. [x] ✅ v17.16 — C16").
  The Flanger's loop is unrolled into FLANGE_TAPS swept delays (audio-fx.js, the Flanger's comment block); test
  '986 C16 …' is in this tree and passes in node. The backlog's restructure and its "sweep now reaches below 2.7 ms"
  risk are therefore done — nothing to flag in POLISH-LOG from this batch. The backlog's 9.6 test ("highest first notch
  ≥ 400 Hz") already passes on 6f1d90b1, so it cannot be a red-first test; 9.6's tests target the new controls instead.
- **C18 (9.7's 65536-point curve half)**: fixed in queue 986, v17.16 (crushCurve: 2^bits × 8 + 1 points above 10 bits).
  Test '986 C18 …' in this tree.
- **9.7's `output` (−12…+6 dB)**: already exists — #482 8.1 gave every effect Output (−24…+12 dB, def 0, keyframable)
  through mixOutput, Bit Crush included. Not added again (a second `output` key would collide). Wider range than the
  backlog asked; left as 8.1 made it.
- **9.7's `rate` (sample-rate crush)**: needs an AudioWorklet, which audio-fx.js's header forbids — a policy question for
  Ezra (below). Not built.
- None of 9.5–9.8's new keys exist on ssh/main (v17.40) or here.

## Lists a new audio PARAM touches (checked)

All registry-driven, so a param added to `DEFS` reaches them with no edit:
- storage.js `sanitizeAudioFx` — iterates `paramsOf(type)`: clamps, keyframes for keyframable ones, fills a missing key
  with `legacy ?? def`.
- collab-core.js `schemaFingerprint` — hashes `[key, min, max, def, keyframable, legacy]` per audio param, so every new
  param (and the Flanger's Feedback min moving to −0.9) moves SCHEMA_FP: re-pin at the end (fp.js).
- audio-fx-live.js `signature` — reads `audioFxRegistry.rebuildKey` (params flagged `rebuild`).
- inspector.js `afxParam` / the audio rows — read the registry; a `rebuild` slider already asks reconcileAudio on each
  value (line ~2651), as the Phaser's Stereo phase does.
- audio-fx-browser.js — per type only (no new type in 9.5–9.8).
- Only file to change: js/audio-fx.js (buster 18 → 19), tests/tests.js, then collab-core.js's SCHEMA_FP (buster 28 → 29).

## Design (to build)

All in js/audio-fx.js. Every default must be today's sound sample for sample (audio has no `legacy` unless declared;
the sanitiser fills `def`).

**9.5 Lo-Fi** — keys `wow`, `flutter`, `hiss`, `crackle`, each 0–1 def 0, keyframable.
- Wow: a twin delay line in a bypass pair BEFORE the band filters: delay 2.5 ms + 2.5 ms × wow × sine LFO 0.5 Hz
  (s.lfo, scene-pinned). Flutter: a second pair after it, 0.25 ms + 0.25 ms × flutter × sine 8 Hz. Two pairs, not one,
  so each key flips its own pair (pairTargets) — one pair driven by two keys would fight.
- Hiss: a seeded PINK noise loop (Kellet filter run twice round the white noise so the loop is circular — no seam),
  4 s, through a 2 kHz Butterworth highpass, gain hiss × HISS level, into the wet path after the shaper (not crushed).
- Crackle: a seeded 3 s sparse-impulse loop (short decaying noise ticks, most small, a few loud, written modulo the
  length so it loops), gain crackle × level, into the same place.
- Both loops are armed like s.noise (lfos list, hz = 1/duration), so scene-pinned: preview = export = any export start.
- Defaults: pairs off (x·1 + y·0), noise gains 0 (x + 0) — exact.
- Test '482 9.5 …': crackle 1 on silence is not silent (backlog; red on 6f1d90b1: key ignored), hiss 1 on silence has
  its energy above 2 kHz, wow / flutter swing a 1 kHz sine's zero-crossing period, seeded, preview = export, saved =
  new, and a hand-built copy of today's Lo-Fi graph = the default (b3SameAsToday).

**9.6 Flanger** — `manual` 0.5–10 ms def 4 (keyframable), Feedback −0.9…+0.9 (def 0.5), `stereo` "Stereo phase"
0–180° def 0 (rebuild, not keyframable — the Phaser's).
- Manual = every tap's delayTime (v / 1000, so 4 → 0.004 exactly as today). The swing scales with it: LFO → amp
  (Depth × 3 ms) → span gain (Manual / 4, exactly 1 at 4) → delayTime, so Depth sweeps ±75 % of Manual (today's 1–7 ms
  around 4) and never goes below 0.
- Negative Feedback: the taps already carry fb^k (powOf), so a negative fb alternates the echoes' signs; initNum's
  clamp moves to −0.9.
- Stereo phase > 0: a lane per channel like the Phaser's (up-mix, splitter, two swept 16-tap chains, the right LFO
  started stereo/360 round), merger → wet. 0 builds today's single chain in today's connection order.
- Test '482 9.6 …': Manual 1 / 10 put the first echo at 1 / 10 ms (depth 0, fb 0; red: today 4 ms); Feedback −0.5
  gives echo 2 at −0.5; Stereo phase 180 makes a mono clip's sides differ, 0 keeps them equal; saved = new; preview =
  export; registry facts. CONTROL: the C16 echo spacing still holds.

**9.7 Bit Crush** — `tone` 1000–20000 Hz def 20000, keyframable: a Butterworth lowpass after the crush (static shaper
and the keyframed bank both feed a wetSum first), in a bypass pair (on below 20000), like the Distortion's Tone.
- Test '482 9.7 …': Tone 2000 takes the steps' fizz off (energy above 4 kHz ≥ 20 dB down on a crushed sine), Tone
  20000 = saved = today, keyframed, preview = export. CONTROL: 14 vs 16 bits still differ (C18).

**9.8 Reverb damping** — `damping` 0–1 def 0, NOT keyframable (static, the backlog's word). impulse(ctx, size, decay,
damping): at damping > 0 a time-varying one-pole lowpass is run over each channel of the IR as it is made, its corner
sliding (log) from far above Nyquist at the start towards 600 Hz × … at the end (fc(x) = 600^(d·x) · (4·sr)^(1−d·x));
damping 0 makes the very IR it always did and keeps the old cache key. The key gains '|damping' when > 0; the
animated-room bank's rooms are made with the same damping; the live setter swaps the convolver buffer on change, as
Size and Decay do. Auto-Pan's Realism room (also impulse()) passes nothing = 0.
- Test '482 9.8 …': a click through Reverb (mix 1): the last 20 % of the tail is ≥ 12 dB darker (> 5 kHz vs < 1 kHz) at
  damping 1 than 0 (the backlog's test; red: key ignored), saved = new, keyframed Size room damped too, preview =
  export.

## Harness (scratchpad, this session)

`…/scratchpad/agents/fx-b9/`: h9.js + wa.js (the first agent's node runner — app scripts in a vm, a sample-accurate
OfflineAudioContext; no DynamicsCompressor, no graph cycles), r2.sh (OLD = 6f1d90b1 / HEAD = 4a587538 / NEW = worktree,
ship check first), base2.sh (every existing audio test this harness can run + fx-b8's mock sweep, into one file),
bg.sh (detached launch, ship check first), pin.sh + psfx.js (the 30 sound effects' FNV pins, old vs new).
~~Next on resume: `bg.sh base2.sh HEAD base-before.txt`, then build 9.5 → 9.8 in order, one commit each.~~ Built (third
agent); the before/after baseline is now prove.sh's stage 4 (base2.sh's list, on aud-red's faithful harness). Next:
`bash bg.sh prove.sh` once nothing ships, then the batch review.

Third agent's additions there: prove.sh, legacy.js (prove stage 5), c.sh (commit with CRLF / mode checks and NO node),
d.sh / d2.sh (diff looks), n.sh (bash -n). msg95–msg98.txt are the four commit messages.

## Questions for Ezra (by ear) — to fill in as items land

- Bit Crush "Sample-rate crush" (backlog 9.7 `rate`) needs an AudioWorklet; audio-fx.js promises "no worklet". Allow
  one (it runs offline too, so export can still match), or leave the slider out?
- Lo-Fi levels, all reasoned not heard: Hiss 1 ≈ −31 dBFS of hiss above 2 kHz; Crackle 1's loudest tick ≈ −10 dBFS,
  about 12 ticks a second; Wow 1 drifts the pitch ±0.79 % at 0.5 Hz, Flutter 1 shivers it ±1.26 % at 8 Hz (the backlog's
  numbers). Too much, too little?
- Lo-Fi Wow / Flutter with Mix below 1: the wobbling copy is 2.5 ms behind the steady dry copy, so the blend combs like a
  chorus. Keep that (it is what a parallel tape wobble does), or hold the dry copy back by the same 2.5 ms?
- Flanger: is 0.5–10 ms the right Manual range, and does negative Feedback sound like a different, useful flange?
- Reverb Damping's curve: at 1 the tail ends at 600 Hz (the last 20 % about 14 dB darker on top); at 0.5 it only ends at
  ~10.7 kHz (about 1 dB) — the middle of the slider is gentle. Fine, or should it bite sooner?
- Reverb presets' Damping (Small room 0.4, Bathroom 0, Hall 0.3, Cathedral 0.5, Plate 0).
