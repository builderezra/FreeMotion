# #966 B1 — the Voice category (refers to #545)

Branch `hunt/fxnew-voice`, on `8004fa16` (hunt/fx-land-on-fb2). Built 13 Oct in a worktree where **nothing was run** — no
node, no browser, not even `node --check` — because the API builder was shipping. The proof is a script for later
(below). Everything visible is a placeholder drawn before Ezra has seen it (#545): his pick is a deletion or a tweak,
not a rebuild.

## What was built

- **A Voice category** in the audio effects browser (`FM.AFX_CATEGORIES` gains `voice`, last; `AUDIO_CAT_ICON.voice` is a
  placeholder speech bubble with a wave, in the category set's hand). It holds no effect of its own: a voice is a named
  STACK of the existing audio effects, so the load sanitiser's whitelist, the collab schema fingerprint and the live
  signature never see one (`audioFxRegistry.all()` is unchanged; `C.SCHEMA_FP` left alone — it should not move, prove.sh
  checks).
- **16 voices as data** — one table in `js/audio-fx.js` (`VOICES`), the stacks drawn for him in
  `tools/design/plans/new-effects/voices.js` on `hunt/new-prep`, each with search words.
- **A tile adds its stack** (`FM.audioFxBrowser.addVoice` → `FM.audioVoices.addTo`): after what the clip already has, as
  ordinary effects (one row each, every control his), the first one open, in **ONE** `history.commit` — one Undo takes
  the whole voice off. Refused whole (nothing added, no step, a toast that says why) if it would take the clip past the
  16 effects the load sanitiser keeps, or on a layer with no sound.
- **Search** finds voices by name, by the category's name ("voice" lists them all) and by their words, with the same
  matcher as the effects (queue 986 C13's rule), in their own row above the effects.
- **Save this stack as a voice**: a button at the top of the Voice list opens a name field IN the sheet (a card would be a
  tap outside the sheet, which closes it on a phone). It keeps the clip's effects that are ON, in order, plain values only
  (a keyframed control is a move, not a setting — "Save as my preset"'s rule), in localStorage (`fm.afx.uservoices`)
  beside the saved audio presets, every read re-checked. His voices list first, under "Your voices"; their ✕ deletes on
  the SECOND tap (no Undo brings a saved voice back).
- Busters: `audio-fx.js` 18 → 19, `audio-fx-browser.js` 14 → 15, `styles.css` 762 → 763.

## The 16 voices

| # | Voice | Stack (every other control at its default) | |
|---|---|---|---|
| 1 | Chipmunk | Pitch +7 · 3-Band EQ High +3 | |
| 2 | Helium | Pitch +12 | |
| 3 | Deep | Pitch −5 · Bass & Treble Bass +4 | |
| 4 | Monster | Pitch −10 · Distortion 20, Tube, Auto level · Reverb Mix 0.3 | |
| 5 | Robot | Ring Mod 60 Hz Square, Mix 0.6 · Flanger 0.05 Hz, depth 0.15, feedback 0.7, Mix 0.5 | |
| 6 | Alien | Pitch +4 · Ring Mod 400 Hz, Mix 0.35 · Phaser 0.8 Hz, 0.7, 0.6, Mix 0.5 | |
| 7 | Megaphone | Telephone: Megaphone style (500–2800 Hz, Grit 70) | |
| 8 | Walkie-talkie | Telephone: Walkie-talkie style (400–2600 Hz, Grit 55, Noise 0.1) | no squelch (a gate, not a Telephone control) |
| 9 | Radio | Band-Pass 1800 Hz Q 0.7 · Distortion 15, Tube, Auto level · Telephone Radio style, Noise 0.3 | the hiss is Telephone's Noise |
| 10 | Underwater | Low-Pass 450 Hz Q 2 at 24 dB · Vibrato 1.2 Hz 0.2 · Reverb size 0.7, Mix 0.4 | |
| 11 | Cave | Reverb size 0.9, 5 s, Mix 0.35 · Echo 0.25 s, feedback 0.3, Mix 0.3 | |
| 12 | Stadium | Reverb size 1, 3.5 s, Mix 0.45 · Echo 0.12 s, feedback 0.15, Mix 0.25 | |
| 13 | Old record | Lo-Fi 0.7 · Low-Pass 4500 Hz at 24 dB · Vibrato 0.55 Hz 0.25 | **no crackle**: that is batch 9.5, not in this tree |
| 14 | Phone call | Telephone: Phone style (its defaults) | extra |
| 15 | Ghost | High-Pass 300 Hz · Pitch −2 · Chorus 0.3 Hz, 0.7, 4 voices, Mix 0.5 · Reverb size 1, 6.5 s, pre-delay 60 ms, Mix 0.55 | extra |
| 16 | Choir | Chorus 0.6 Hz, 0.6, 6 voices, Spread 1, Mix 0.6 · Reverb size 0.75, 2.8 s, Mix 0.3 | extra |

Names against #954 (no Alight Motion name, no clash): none of the 16 is in `tools/design/954-effect-names.md`'s lists.
In-app overlaps, on purpose: Chipmunk / Helium / Deep / Monster are also Pitch Shift's preset names; Phone / Radio /
Megaphone / Walkie-talkie are also Telephone's Style buttons (question 2).

## What the sheet must show him

1. **The 16 sounds** — the WAVs rendered from `voices.js` in Chrome (`run-probes.sh voices` on hunt/new-prep). The stacks
   here are exactly those, so what he hears is what the tile adds.
2. **The Voice banner and its icon** among the five category banners, at phone width and on PC (placeholder: speech
   bubble + wave, green tint).
3. **The Voice list**: the Save button on top, the 16 tiles (green tint + the glyph of the voice's first effect), and with
   one saved voice: "Your voices" above "Voices", the ✕ on his tile, the armed ✕ ("Tap ✕ to delete").
4. **The Save row**: name field + Save + Cancel.
5. **Search** for "robot": a "Voices" row (Robot) above an "Effects" row (Ring Mod).
6. **After a tap**: the audio effects card with the voice's effects, the first one open.

## Questions for him

1. Which voices stay? (All 16 are built; cut any — the three extras are Phone call, Ghost, Choir.) Any that sound wrong?
2. Names that are also Pitch Shift presets (Chipmunk, Helium, Deep, Monster) and Telephone styles (Phone, Radio,
   Megaphone, Walkie-talkie): keep both (built), or rename the presets/styles?
3. Where the Voice category sits: last (built) or first?
4. The category icon — the placeholder, or options drawn for him (#545)?
5. The tile picture: green tint + its first effect's glyph (built), or a drawing per voice?
6. A second voice tapped on the same clip: added on top (built), or replaces the first voice?
7. After a tap: the first effect opens (built, like a single effect), or all stay closed so he sees the whole stack?
8. Voices in Recents / Faves (★)? Not built.
9. Save this stack as a voice: only at the top of the Voice list (built), or also on the audio effects card?
10. Deleting his voice: two taps on the ✕ (built), or press-and-hold like Your filters?
11. Old record without crackle: ship now (built), or wait for batch 9.5 and add the crackle?

## What prove.sh checks (scratchpad `agents/fxnew-voice/prove.sh`, written, not run)

It refuses to start while `/home/ezra/FreeMotion/.ship-in-progress` exists and stops between stages if one appears.
1. `node --check` on every js the branch changed.
2. The six `966 B1` tests, with HEAD's tests file, on 8004fa16's source (all must FAIL, each saying "FM.audioVoices is
   missing") and on HEAD's (tests 1–5 must PASS; 6, the phone sheet, is browser-only and can only fail in node on the
   missing DOM). Harness: `agents/fxnew-voice/hv.js` = `agents/aud-red/h.js` + `js/history.js` + `js/audio-fx-browser.js`
   + a no-op `FM.refreshAll` (history.js's undo calls it unguarded; app.js is not loaded) + lifting the `…966b1` helpers.
3. Queue 585 (every audio category has its own icon, both ways) passes on both trees.
4. The collab schema fingerprint (`agents/fx-all2/fp.js … subset`): control on `~/fm-helper-wt/fx-land` first (want
   1856346714373782, match true), then both trees — all must match.
5. `treecheck.py 8004fa16 HEAD` (busters bumped, none backwards) and `drops.py` (no test title dropped).
6. The existing `482 3.` / `482 7.` / `482 8.` tests on both trees with `aud-red/h.js` — the verdicts must be the same
   (long; `SKIP482=1` skips it).
Results: `agents/fxnew-voice/prove-result.txt`. The phone test then needs one Chrome slice at 380:
`?only=966%20B1`.

## Unsure, said

- Nothing ran. Every expectation above is reasoned from the code it names.
- Test 5 compares bits (hash) between a voice and its hand-built twin, export and preview, and after the sanitiser. Both
  build the same values through the same chain, so they should be identical; if Chrome's render is ever not
  deterministic for one of these graphs, that test says which voice.
- Test 3 relies on the Flanger at Mix 0 being exactly its dry sound (wetDry: dry 1 − 0, wet 0 — float-exact).
- In node the reverb is a direct convolver whose cost is its input's non-zero samples × the room's length, so test 5's
  Ghost (a dense input into a 6.5 s room) is the slow one there — expect tens of seconds; in Chrome it is nothing.
- When batch 9 (Lo-Fi 9.5's crackle) lands, Old record gains a member: change `VOICES` in js/audio-fx.js and
  `VOICES966b1` in tests/tests.js in the same commit.
- Merging: index.html busters (take the base's, re-bump above it), tests.js (appended at the end — rebuild by blocks),
  styles.css (new block after `.afxb-banner[data-cat="char"]`).
