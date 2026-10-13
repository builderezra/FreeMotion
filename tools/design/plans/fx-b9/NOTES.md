# #482 / #966 polish batch 9 — working notes (branch hunt/fx-b9)

Backlog: `tools/design/plans/2026-09-29-idle-backlog/backlog.md`, "### Batch 9 — Sound-effect library" and "### 0.3 Build rules".
Base: 6f1d90b1 (fx-all, SCHEMA_FP 4775724801447341). Nothing pushed from here; the PM reviews and pushes.

## State (13 Oct, second agent)

| Item | State | Commit |
|---|---|---|
| 9.1 Search + category chips | NOT BUILT — new UI, drawn and shown to him first (#545) | — |
| 9.2 Options drawer per row (fixes C11's drawer half) | NOT BUILT — new UI, drawn first | — |
| 9.3 Nature beds at usable lengths | built (first agent) | 1c389cdf |
| 9.4 Rain with drops | built (first agent) | 4a587538 |
| 9.5 Lo-Fi wow / flutter / hiss / crackle | **not started** — design below | — |
| 9.6 Flanger manual / ±feedback / stereo | **not started** — design below | — |
| 9.7 Bit Crush tone | **not started** — design below | — |
| 9.8 Reverb damping | **not started** — design below | — |
| batch review | not started | — |

**Stopped for a ship** (13 Oct, `.ship-in-progress` = `pid=1141237 phase=prove`): the research below is done, no code
written for 9.5–9.8 yet, and no node run made by this agent (the before-baseline run was refused by the ship check).

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
Next on resume: `bg.sh base2.sh HEAD base-before.txt`, then build 9.5 → 9.8 in order, one commit each.

## Questions for Ezra (by ear) — to fill in as items land

- Bit Crush "Sample-rate crush" (backlog 9.7 `rate`) needs an AudioWorklet; audio-fx.js promises "no worklet". Allow
  one (it runs offline too, so export can still match), or leave the slider out?
