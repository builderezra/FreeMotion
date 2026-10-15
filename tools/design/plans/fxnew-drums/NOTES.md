# #966 B22 — Drum hits (branch `hunt/fxnew-drums`)

Backlog §B B22 in `tools/design/plans/2026-09-29-idle-backlog/backlog.md`: "Drum hits (new 'Drums' category). SFX, M. Kick,
snare, clap, hi-hat, rimshot 'ba-dum-tss' and drumroll, with the recipes from the audio inventory." Built on `787491d6`
(hunt/fxnew-boom: the effects landing, fxnew-sfx's four packs and Explosion / Thunder), following
`tools/design/plans/fxnew-sfx/NOTES.md` and `tools/design/plans/fxnew-boom/NOTES.md`.

**Status: built, not picked, NOT RUN.** His #545 rule: he hears new sounds and picks before anything ships. Written while the
API builder was in its lock run / ship, so nothing ran — no node, no browser, not even `node --check`. Every recipe level and
test bound is reasoned, not measured. The first run is `prove.sh` (agent scratchpad, `agents/fxnew-drums/prove.sh`), then the
three tests in Chrome, then the listen sheet.

**Not built before this:** `REQUESTS.md` and `POLISH-LOG.md` on main have no drum, snare, hi-hat, rimshot or ba-dum entry, and
`js/sfx.js` at 787491d6 had no drum kit. Its nearest sounds: **Thud** (a sine 190 → 55 Hz, no click: the closest thing to a
kick), **Punch** (a thump plus a noise slap), **Heartbeat** (two low thumps), **Ticking build** (high-passed noise ticks) and
**Reverse swell** (id `reverse-cymbal`, a high-passed noise swell). None is a kit drum; the sheet plays them beside the new ones.

**"The audio inventory" has no drum recipes in the repo.** The backlog says it was built from four read-only inventories
"merged and de-duplicated" (its line 5); only the merged backlog was kept, and B22's line is all that survives. The only drum
recipes anywhere are the ChatGPT pile's `b72dfd54` (T04, "Add synthesized Drums sounds", not landed; LAND-LIST B7 says to
strengthen its tests and "consider a snare plus cymbal Ba-dum-tss" — its sting was two kicks and a hat). So these are the
classic analogue drum-machine recipes, written for this file; b72dfd54's numbers were a cross-check (its kick 150 → 47 Hz, its
hat above 6.8 kHz), not a source.

## How it sits in `js/sfx.js`

One block of its own, `DRUMS (B22)`, after Explosion & Thunder and before the category icons, plus one entry in
`SFX_CAT_ICON` (Drums). Six rows made with `packSound`, so `FM.sfx.variant`, `packOptionsFor`, the seeded streams and
`packNoise` (noiseSeed, #986 C11) work as for the packs; no `Math.random`; the ▶ plays the very buffer Add makes (#986 C10).
Nothing in the shared path or the pack machinery changed. New in the block: `CH_DECAY` (0.5–2×, step 0.05), `drumFilter`
(caps a filter at 0.45 × the rate — queue 709 renders at 22.05 kHz too), `drumKick`, `drumSnare`, `drumMetal` (the hat's and
the cymbal's noise and six detuned squares above a high-pass). Buster: `js/sfx.js?v=22` → `23`. No registry params, so
`C.SCHEMA_FP` cannot move.

## The six sounds

| Row (id) | Recipe | Options | Level |
|---|---|---|---|
| Kick (`kick`) 0.6 s | sine 150 → 50 Hz in 70 ms, settling to 43 Hz, gone by 0.55 s; a 6 ms click (noise above 2.5 kHz) | Pitch, **Decay** 0.5–2× (the length goes with it), Variation | 1 |
| Snare (`snare`) 0.4 s | the shell: sines at 185 / 330 Hz starting a quarter higher, gone by 0.14 s; the wires: noise 1.6–7.5 kHz, gone by 0.36 s | **Tone** dark (0.9–4.2 kHz, more shell) / normal / bright (2.6–11 kHz, less shell), Pitch, Decay, Variation | 0.9 |
| Clap (`clap`) 0.4 s | noise above 450 Hz, band-passed at 1.15 kHz: three bursts ~11 ms apart, each gone before the next, then a fourth with a 0.36 s room | Pitch, Decay (the room), Variation | 0.85 |
| Hi-hat (`hi-hat`) 0.16 s | noise and six squares (205–800 Hz, a little out of tune) above 7 kHz; closed falls to a third in 20 ms, gone by 0.16 s | **closed / open** (open: to 60 % at 80 ms, rings to 0.7 s, 0.75 s long), Pitch, Variation | 0.6 |
| Ba-dum-tss (`rimshot`) 1.9 s | ba: a snare (0.8, wires 0.2 s) at 0 · dum: a low tom (sine 125 → 98 Hz) with the kick at 0.16 s · tss: the cymbal (metal above 5.2 kHz) at 0.55 s, a burst to 20 % in 60 ms then a ring to 1.25 s | Pitch, Decay (the ring; 3.2 s at 2×), Variation (the timing ±8–10 %, every noise) | 0.9 |
| Drumroll (`drumroll`) 3.6 s | snare strokes every 55 ms ±8 % (seeded), each up in 2 ms and down to 4 % by the next, the left hand 12 % lighter, building 60 % → full; then the crash: kick + cymbal (to 40 % at 80 ms, rings to 1.5 s) | **Length** 0.5–6 s (2), **crash** on / off (on), Pitch, Variation (other hands, the rate ±12 %) | 0.9 |

Variant names (the clip's file name on Add): `Kick (2x decay)`, `Snare (bright)`, `Snare (dark, 1.5x decay)`,
`Hi-hat (open)`, `Ba-dum-tss (2x decay)`, `Drumroll (no crash)`, `Drumroll (4 s)`, `Drumroll (4 s, no crash)`.

Search words (`tags`): every row has drum / drums. Kick — kick, kick drum, bass drum, beat, thump, percussion. Snare — snare,
snare drum, hit, beat, backbeat, crack. Clap — clap, hand clap, handclap, claps, clapping. Hi-hat — hi-hat, hihat, hi hat, hat,
cymbal, tss, tick. Ba-dum-tss — rimshot, ba dum tss, ba-dum-tss, badum tss, ba dum, joke, punchline, comedy, sting, cymbal.
Drumroll — drumroll, drum roll, roll, snare roll, suspense, reveal, announcement, tension, cymbal, crash.

Names checked against `tools/design/954-effect-names.md`: none of the six is in it (its nearest is our own "Number Roll").
No trademarked names: no drum machine is named anywhere, not even as a search word ("808" left out on purpose).

Icon: a placeholder for `FM.sfx.catIcon('Drums')` — a drum (an ellipse on a shell) with two sticks resting on the head, in the
audio browser's 24 × 24 stroked style. Shown nowhere yet; the real one is a #545 design item (options at 24 px, he picks).

## The tests (`tests/tests.js`, appended before the final `})();`)

Three, `'966 B22 Drum hits …'`, `'966 B22 Ba-dum-tss …'`, `'966 B22 Drumroll …'` (`?only=966%20B22`), plus `hitsSfx966`
(onsets on a 1 ms grid against the loudest 1 ms of their own window) and `lastSfx966` (the last sample past 0.01), named so
fxnew-sfx's `hs.js` lifts them. **Each fails on 787491d6 on its first check**: packSfx966 throws "The Drums pack (#966 B22) is
not in the sound-effect library: there is no Kick (kick), Snare (snare), Clap (clap), Hi-hat (hi-hat)" / "… no Ba-dum-tss
(rimshot)" / "… no Drumroll (drumroll)" — not a TypeError.

All six get packSfx966 (category, name, words, stated length sample for sample, peak 0.89 × level, audible past a third, the
same twice within 1e-5, Variation 2 another take, no options = the row, the ▶ is the clip, options offered). Then, with the
reasoned numbers (each message prints the measured ones):
- **Drum hits** — the options each offers; RMS frequency (brightSfx966) Kick under 0.25 of the Snare (reasoned 260 Hz vs
  5.3 kHz), Hi-hat over 1.5× the Snare (~13 kHz), Clap over 2× the Kick and under 0.6 of the Hi-hat (~3.5 kHz); the Clap three
  or more bursts in 60 ms (reasoned 4); Hi-hat (open) 0.75 s through variantSfx966, audible over 3× longer than closed (0.33 vs
  0.07 s); bright Snare over 1.3× dark (8.1 vs 2.8 kHz); Kick (2x decay) 1.2 s, audible over 1.6× longer (0.55 vs 0.27 s); icon.
- **Ba-dum-tss** — onsetsSfx966 at 0.25 finds exactly three, at 0 / 0.16 / 0.55 s ± 20 ms; the tss's first 0.12 s over 1.5×
  as bright as the ba's and the dum's (reasoned ~11 kHz vs ~3 kHz and ~200 Hz), the dum under the ba; Decay 2 is 3.2 s and its
  RMS at 1.3–1.6 s over 3× Decay 1's (reasoned 12×).
- **Drumroll** — Length (s, 2) and crash (on) offered, the row 3.6 s; `Drumroll (no crash)` 2.12 s through variantSfx966; a
  2 s roll (no crash) is 24–50 strokes by hitsSfx966 at 0.2 / 8 ms quiet (reasoned 36), gaps within 30 % of their mean and none
  twice it; it builds (last 0.5 s over 1.2× the first, reasoned 1.5); a 4 s roll 4.12 s (5.6 with the crash), 1.7–2.3× the
  strokes, the last after 3.7 s; the row's 2.05–2.6 s over 1.4× as bright as its roll (~11.5 vs ~6 kHz) and still ringing at
  2.4–3.0 s (RMS over 1e-3, reasoned ~6e-3).

The older tests that iterate every sound now see 59: 709 (each twice at 22.05 kHz — every filter here is capped at 0.45 of the
rate), 562 (raw peak under ~1.52: the loudest recipe here is reasoned ~1.35, the snare's shell and wires landing together),
986 C10, sfx-warm (Drums has six rows; ids unique).

**Unsure until run:** the brightness readings of band-limited noise (they lean on the 12 dB/octave skirts — the Drumroll's
crash-vs-roll ratio is the tightest, reasoned 2.0 against 1.4); hitsSfx966 on the clap at 1 ms (the bursts are 11 ms apart);
the square waves differ between Chrome (band-limited) and node's wa.js (naive), which moves the hat's and cymbal's readings a
little in node, not their order; the closed hat's "audible past a third" (reasoned 0.07 s against 0.053).

## prove.sh (agent scratchpad: `agents/fxnew-drums/prove.sh`)

Written, not run. Refuses to start (exit 7) and stops between stages while a ship, a lock run (`full-unchanged`) or a live
API-builder pid is present. Node at nice 19 only; python only for the two tree checks.
1. `node --check js/sfx.js`, tests.js parses, the probe parses as an async body, no CRLF, `git diff --check`, no mode change.
2. The three `966 B22` tests on 787491d6's js through `agents/fxnew-sfx/hs.js` — all FAIL naming the missing sounds (53 sounds).
3. The same on this branch — all PASS (59 sounds).
4. `966 B4` / `B5` / `B12` / `B13` / `B23`, 709, 562, the `sfx` and sfx-warm tests, 986 C10 / C11 / C12 on both trees — the
   same verdicts; the packs, B23, 709, C10 and C11 must PASS on the tip.
5. `fx-all2/fp.js` on both trees — the same `fp`.
6. `treecheck.py 787491d6 HEAD`, `drops.py 787491d6 HEAD`. Results in `agents/fxnew-drums/prove-result.txt`.

Still owed after that: the three tests in Chrome at 900 and 380 (`?only=966%20B22`), and the listen sheet.

## The listen sheet

`render-probe.js` (this folder; an async body for `tools/shot.py --js-file`, `window.__recv` = the receiver's port, a number)
renders 27 takes as Add makes them and POSTs `NN-<name>.wav` and `listen.json`: Kick (row, Decay 2× / 0.5×, −5 st,
Variation 3) · Snare (row, dark, bright, Decay 1.6×, Variation 2) · Clap (row, Decay 2×, Variation 2) · Hi-hat (closed, open,
+3 st, Variation 4) · Ba-dum-tss (row, Variation 2, Decay 2×, −3 st) · Drumroll (row, no crash, 1 s, 4 s, 6 s, Variation 2) ·
beside them Thud, Heartbeat, Punch, Ticking build, Reverse swell, Impact.

## Questions for him (#545 — his picks, by ear)

1. **Keep all six, and their names?** Especially **"Ba-dum-tss" or "Rimshot"** for the sting (id `rimshot` either way;
   "rimshot" is a search word), and **"Drumroll" or "Drum roll"**.
2. **Kick beside Thud** — is a second low thump worth a row, or should Thud move into Drums as the "Deep kick"?
3. **The drumroll's row: with the crash or without?** It ends on a crash today ("Drumroll (no crash)" is the option). And its
   speed: 18 strokes a second — or a buzzier, denser roll?
4. **The hi-hat: closed as the row and open as an option**, or two rows ("Hi-hat", "Open hi-hat") the way the slide whistle is
   two rows?
5. **Loudness by ear:** Kick 1, Snare / Ba-dum-tss / Drumroll 0.9, Clap 0.85, Hi-hat 0.6.
6. **Decay on the Kick, Snare, Clap and Ba-dum-tss; Tone only on the Snare** — enough, or a Tone on the Kick (punchy / deep)?
7. **The Drums icon** (a drum and two sticks) — a placeholder until 9.1's chips are drawn.

## Merge notes

- **js/sfx.js:** one new block between Explosion / Thunder's closing `);` and the icons' comment, plus two lines in
  `SFX_CAT_ICON` (a comment and `Drums:` after `Game:`). A sibling §B sound branch appending a block in the same place, or an
  icon after `Game:`, conflicts only by adjacency: keep both whole.
- **index.html:** `js/sfx.js?v=23` (fx-b9 20, fxnew-sfx 21, fxnew-boom 22). Take a number above every one near a phone.
- **tests/tests.js:** appended at the end, from `/* ═══ #966 B22` to `// ── end 966 B22 ──`; rebuild by block, never a union merge.
- **Beside batch 9 (hunt/fx-b9):** its `PREVIEW_MAX` (8 s) never cuts these — the longest is a 6 s Drumroll with its crash,
  7.6 s. Its "every sound renders as today with no options" control sees six more sounds.
- **Collab:** no registry params, so `C.SCHEMA_FP` is untouched.
