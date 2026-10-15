# #966 B46 — Channel Utility, ported from the ChatGPT pile (e74415e2), hunt/pile-chanutil

Built on hunt/fxnew-drums **85b71929**. Refers to #545: he hears it before anything ships.

**⚠️ NOTHING HERE HAS BEEN RUN.** Written on 15 Oct while a release ship was running: no node, no python, no browser, not
even `node --check`. Every number below is worked from the graph (copies, signs and gains of 0 / ½ / 1, which are exact in
IEEE floats), not measured. The proof script is written and waiting: `scratchpad/agents/pile-chanutil/prove.sh` (node
harness, quiet slot only), then the `966 B46` tests in Chrome at 900 and 380.

## Twin check (what already existed)

- **Stereo Width** (`width`) at Width 0 already plays Mono: its mid is (L + R) / 2 on both. Nothing else here existed.
- **Pan** (`pan`) is a StereoPannerNode. On a stereo clip that is a *pan*, not a *balance*: at +1 it folds the left INTO the
  right (right = R + L), where a balance drops the left. So Balance here is not a twin of Pan.
- Swap, Left → both, Right → both and polarity invert existed nowhere (audio-fx.js, inspector.js, REQUESTS.md, POLISH-LOG.md).
  So the effect is ported whole, and Mono is kept in it (one place for "where each side plays"), on Width 0's own law.

## What it is

An audio effect in **Space / Stereo, right after Stereo Width** (where the pile put it): `channelutility`, label **Channel
Utility**. It decides which side of the clip plays on which speaker.

| Control | Range | Default | Kind |
|---|---|---|---|
| Channels | Stereo · Mono · Left → both · Right → both · Swap | Stereo | CHOICE (five buttons, the visual effects' segmented control); not keyframable, not a rebuild |
| Invert left | Off / On | Off | TOGGLE (tick box); not keyframable, not a rebuild |
| Invert right | Off / On | Off | TOGGLE (tick box); not keyframable, not a rebuild |
| Balance | −1 … 1, step 0.01 | 0 | keyframable slider |
| Output | −24 … +12 dB | 0 | the shared wrapper (`mixOutput`) |
| Mix | 0 … 1 | 1 | the shared wrapper (`mixOutput`) |

- Description (`desc`): *"Mono, one side on both speakers, or left and right swapped; flips a side recorded backwards, and
  sets the balance."*
- Notes under rows: Channels (*"Mono plays the two sides at half each, so a clip with sound on one side only gets quieter: use
  Left → both or Right → both for that."*), Invert right (one note for both ticks: what a flip is for), Balance (*"…neither is
  ever turned up."*).
- Search words: mono, swap, swap channels, swap left and right, left channel, right channel, phase, phase invert, polarity, flip
  polarity, invert, balance (plus its label and id). Checked against queue 986 C13's rule: the, low, on, round and ten do not
  list it (no tag word starts with them — "one side" was left out for that reason).
- Tile icon: none of its own — the Space glyph. A glyph is a picture, so it is his pick (#545).

## How it works

In order: **Invert** turns a side OF THE CLIP over (× −1) → **Channels** sends the two sides to the speakers → **Balance**
turns the far speaker down → the wrapper's Output and Mix. The input is up-mixed to two channels first, the speakers way, so a
mono clip arrives as L = R = M (the splitter is discrete: without that a mono clip reaches it as [M, 0], one side silent).

`out = [a·L' + b·R', c·L' + d·R'] × [balance left, balance right]`, L' = ±L, R' = ±R, and `CU_ROUTES` holds [a, b, c, d]:

| Channels | left speaker | right speaker |
|---|---|---|
| Stereo | L | R — the clip sample for sample (x·1 + y·0 = x) |
| Mono | (L + R) / 2 | (L + R) / 2 |
| Left → both | L | L |
| Right → both | R | R |
| Swap | R | L |

Balance: left speaker × (b > 0 ? 1 − b : 1), right × (b < 0 ? 1 + b : 1). Nothing is late, nothing keeps state: the preview is
the export, and the wrapper's Mix cannot comb. Channels and the Invert ticks set gains (`cuFade`: the first set steps, a live
change fades over 20 ms like a bypass pair — `pairTargets`' rule for any number of gains); Balance rides two gains through
`multi` at every scheduled step.

## The choices the brief asked about, and why

1. **Mono = (L + R) / 2 — the honest one.** It is never louder than the louder side (cannot clip what the clip did not), and a
   mono clip — or any clip whose sides match — keeps its level exactly; it is also exactly Stereo Width at 0, so the app has
   one Mono, not two. Its cost: a clip with sound on ONE side only comes out 6 dB down. That case has its own exact tool, Left
   → both / Right → both, and Channels' note says so. L + R would double a mono clip (+6 dB, straight into clipping); (L + R) / √2
   is right for neither case. Kept from the pile.
2. **A mono SOURCE (one channel)**: up-mixed to L = R = M before the splitter (kept from the pile), so all five options play M on
   both speakers — no silent side, no doubling. Invert left on a mono clip gives [−M, M].
3. **Balance, not a pan law.** In the middle both sides play as they are (the default is the clip sample for sample); moving it
   turns only the far side down, in a straight line to silence at ±1 (−6 dB halfway). The near side is never turned up, so the
   middle cannot dip and nothing can clip. Kept from the pile. (A pan law of (1 ∓ b) / 2 would play the middle 6 dB down.)
4. **Invert is applied to the SOURCE side, before Channels** — changed (below).
5. **channelCount / channelInterpretation**: explicit 2, speakers, on the effect's input (as Stereo Width does). Kept.

## What was wrong in the pile (e74415e2), and what changed

The pile's own report says the OfflineAudioContext regression and listening were never run. Its one test read the LAST sample
of a constant (DC) fixture within 0.01, which cannot see a sign error on a side that is not played, a ramp, or a mono clip.

1. **Invert turned the SPEAKER side over, after the routing** (`m[0] * left, m[1] * left` with `left = ±1 × balance`). The
   control exists for a side recorded backwards (a mic wired the wrong way round), and that must be put right BEFORE the sides
   are summed. The pile's Mono + Invert left played −(L + R) / 2 left and +(L + R) / 2 right: the cancelling stayed, and the two
   speakers then cancel each other on a phone's single speaker. Swap + Invert left played [−R, L], turning over the side the
   tick does not name. → Now the clip's side, before Channels: Mono + Invert left = (R − L) / 2 on both; Swap + Invert left =
   [R, −L]. prove.sh 4a puts the pile's order back.
2. **A keyed Balance that held still began its move at the start of the hold.** The pile's setters returned early when a value
   equalled the last one (`if (v !== balance)`), so the export scheduled nothing through a hold, and the first ramp after it ran
   from the gain's 0 s event to the first sample of the move: keys 0 @ 0 s, 0 @ 0.5 s, 1 @ 0.6 s slid the left down from 0 s (to
   about 0.84 at 0.25 s). → Balance is now `multi` on its own two gains, scheduled at every step. prove.sh 4b puts it back.
3. **Every non-ramp set was a `setTargetAtTime(…, 0.005)`**, the export's first set included, and a keyed ramp then followed a
   setTarget event (the spec's least-defined ordering). → Channels and the Invert ticks use `cuFade` (the tree's bypass-pair
   rule: the first set steps, a live change fades 20 ms, a held value is left alone); Balance uses `multi` like every keyframable
   control. Not separately provable — it is the tree's convention, and test 9 (preview = export) covers its result.
4. **Drop-downs** (the pile's `options` on `P()`, drawn by eda6773b's `afxChoice`). → Channels is this tree's `CHOICE` (five
   buttons) and the Invert pair are `TOGGLE`s. Nothing from eda6773b is taken.
5. **No Output / Mix** (the pile's tree had no wrapper). → `mixOutput` adds both, as on every effect; no `dryLag` (nothing late).

**Kept from the pile:** the five options and their labels, the key names (`mode`, `invertL`, `invertR`, `balance`), the Mono law,
the balance law, the speakers up-mix, the place after Stereo Width, Balance's range and step, and its tags (extended).

## The tests (`966 B46 …`, appended to tests/tests.js; helpers end in `966b46`)

Each fails on 85b71929 on its first line, naming the missing effect (*"there is no Channel Utility: FM.audioFxRegistry has no
channelutility (#966 B46 is not built)"*), never a TypeError. Fixture: left 440 Hz at 0.5, right 660 Hz at 0.3. Rendered through
`FM.buildAudioFxChain` on a two-channel OfflineAudioContext (export = `schedule`, preview = `applyAt`); === against
`Math.fround` of the input wherever the maths is exact, 1e-7 for Mono's one rounded sum.

1. **The effect** — category, place after Stereo Width, keys, Channels a five-option CHOICE, Invert ticks TOGGLEs, Balance, Output,
   Mix, no dryLag, one-line desc, search words (and the C13 non-matches), a new one's values, no control moves the preview
   signature, the load sanitiser (Channels 9 → 4, Invert 5 → 1, a word → Off, a keyed Balance clamped to ±1, a keyed Channels →
   Stereo, a stray key dropped).
2. **Routing** — Stereo, Swap, Left → both, Right → both ===, Mono = (L + R) / 2 within 1e-7, export and preview; Mono equals
   Stereo Width at 0.
3. **Mono's law** — a left-only clip: Mono = 0.5·L on both (===), Left → both = L on both (===); a matched clip: Mono = the clip
   (===); Mono never peaks above the louder side. (prove.sh 4c: L + R fails it.)
4. **Invert** — Stereo ± each side, Swap + Invert left = [R, −L], Right → both + Invert left = [R, R], Left → both + Invert
   right = [L, L] (===), Mono + Invert left = (R − L) / 2 (1e-7), export and preview. (prove.sh 4a: the pile's order fails it.)
5. **Balance** — 0 = the clip, −1 = [L, 0], +1 = [0, R], ±0.5 = the far side halved, the near side untouched (===), export and
   preview. (prove.sh 4d: a dipping pan law fails it.)
6. **A keyed Balance that holds** — through the hold the clip (===), after the move [0, R] (===). (prove.sh 4b: the pile's
   setter fails it.)
7. **A mono clip (one channel)** — all five options = M on both speakers (===), Invert left = [−M, M], export and preview;
   controls: a plain gain plays [M, M], a discrete up-mix leaves the right silent. (prove.sh 4e: 'discrete' fails it.)
8. **Mix** — with Swap, Invert left and Balance 0.5 moved: Mix 0 = the clip (===), Mix 0.5 = halfway (1e-6), export and preview.
9. **Preview = export** — two settings with every control moved, within 1e-6; a second export = the first.
10. **Panel** (Chrome only, 390 and 1280 px) — Channels is five buttons in order with Stereo lit, the Invert ticks are tick
    boxes, Balance / Output / Mix are sliders with diamonds, all inside the panel; a tap on Swap stores 4, a tap on Invert left
    stores 1, and neither moves the preview signature.

## Questions for Ezra (#545 — he hears it first)

1. **Mono at half of each side** ((L + R) / 2, as Stereo Width at 0). A one-sided clip gets 6 dB quieter in Mono, and the note
   points to Left → both / Right → both. **Recommended: keep.**
2. **Balance in a straight line** (−6 dB on the far side halfway) or a curve (−3 dB halfway, smoother to the ear)? The middle and
   the ends are the same either way. **Recommended: keep the straight line**; change it only if halfway sounds too lopsided.
3. **A "this clip is mono" line in the panel**, like Stereo Width's (`AFX_MONO_HINT` in inspector.js): *"This clip's audio is
   mono — both sides are the same sound, so Channels changes nothing; Invert and Balance still work."* Not built: it touches
   inspector.js and its buster. **Recommended: yes**, as a follow-up.
4. **Labels**: "Left → both" / "Right → both" (the pile's) — or "Left only" / "Right only"? **Recommended: keep** (they say
   where the sound goes; "only" could read as muting).
5. **Where it sits** (after Stereo Width) and **a tile icon** of its own — drawn options per #545 if he wants one.

## Merge notes

- Changes: `js/audio-fx.js` (the CHANNEL UTILITY block — `CU_ROUTES`, `cuBalL`, `cuBalR`, `cuSign`, `cuFade` — right after
  `pairTargets`; the def after Stereo Width; the TAGS line after `width:`), `index.html` (`audio-fx.js?v=20` → **21**),
  `tests/tests.js` (appended after `// ── end 966 B22 ──`), this folder. Nothing else: no inspector, browser or live-preview change
  (the choice and the ticks are the existing segmented control and tick box), and **`mixOutput` is untouched** (no dryLag).
- **Busters**: the other T06 port branches built from the same base (Hum Remover, De-esser, Noise Gate, Loudness Match,
  Auto-Wah, Graphic EQ) bump `audio-fx.js` to 21 too; at land time take the base's line and renumber above the highest (the
  index.html conflict rule).
- **Names shared with siblings**: none. `CU_*` / `cu*` are new, and no sibling branch defines a `…Fade` helper (`cuFade` is
  `pairTargets`' rule for N gains — if a sibling later needs the same, make it one helper). The helper block sits after
  `pairTargets` (~line 470), where no sibling has a hunk; the De-esser's block is after `put` (~496), the Hum Remover's ~696.
- **Space order**: reverb, delay, pingpong, width, **channelutility**, pan, autopan. The Stereoizer (B47, not yet ported) will
  most likely also go after Stereo Width: adjacent insertions, keep both, and re-pin the catalogue test's "right after Stereo
  Width" if the Stereoizer lands between. TAGS: inserted after `width:` — the same adjacency.
- **Collab fingerprint**: a new type with six params moves it. `C.SCHEMA_FP` is left alone on purpose (pinned once at the top of
  the chain); `921 S1 the schema fingerprint gate` goes red on this branch alone until then. prove.sh prints the number.
- **The pile: drop e74415e2 when T06 lands** (`tools/design/chatgpt-tasks/pile/INVENTORY.md` T06), or there will be a second
  `channelutility` def — the one that turns the speaker side over. It takes nothing from eda6773b (afxChoice).
