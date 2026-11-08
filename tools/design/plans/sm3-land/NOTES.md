# Simple Phase 3 · landing on v17.51 (hunt/sm3-land) — first Chrome run, 16 Oct

Tree = v17.51 (d5c423cc) + the chain v50-tree..hunt/sm3-review 145f0425 (Look, Captions, Effect segments, the switch morph, the
#1171 guard, the picture-sheet tooling, tray effects, Clips › Extras, the review's fixes), applied with `git apply -3`. Two
conflicts: index.html (buster numbers only — the chain's were all above v17.51's, taken) and tests.js (both sides appended
before the final `})();` — both kept, v17.51's first). 3108 tests (v17.51: 3065).

## First run (slices.sh, 1280 and 380 at height 900): 'simple' 207/216 both widths (3 NOT RUN), SU1, 'S9 option E', '2A row 16',
'980 cog' all green. Six reds, five of them the tests:

| # | Test | Cause | Change |
|---|---|---|---|
| R1 | P2.2 review · the playhead line once Clips adds the first clips | Clips opens a short list now (Add clips · Extras) | taps the list's Add clips (as Extras already did for “After a card”) |
| R2 | P2.2 review · the time readout after Clips adds clips | same | same |
| R3 | P3 Look leaves Full’s own panel alone | at 380 Full's title reads Layer (app.js:1180 writes it for a selected layer); the test wanted Inspector | accepts Full's own Inspector or Layer — the Look panel's title is what it refuses |
| R4 | P3 Tray effects · a preset tile lands as ONE Shake | the fixture put Q and O both inside clip A: two pictures within one still, so §3.1 (i) made A the BACKGROUND and O a main clip (measured) | Q straddles the A/C cut (2.6–3.4) |
| R5 | P3 Extras · a saved lower third | after Move earlier the 3 s bar ran past the next clip's end, so it read LONG (no host) and the words fell back to their own start rule (Z), and Delete of Z took them | the bar is 2 s, as the test means a bar that rides its clip — see R8 |
| R6 | P3 Extras at 1280×800 · Extras in the left band | **REAL — a layout fault, and his pick.** Simple's PC band is 240 px tall at 1280×800 (the preview takes the top 560); the panel area is 96 px and the Add menu gets 78: Done in the tray row is not pressable, the Promo tile lies outside the band | OPEN — options for his sheet: (a) as built (scrolls in 96 px), (b) the band grows while Extras is open (the preview shrinks), (c) Extras opens as a sheet on PC too, like the phone |

All five re-ran green at 1280 and 380 (06:27).

## Findings still open (with the review's #3–#6)
- **R6** above — needs his pick before Simple Phase 3 ships.
- **R8 (classifier, spine.js 6c):** a moves-together member follows its anchor's HOST; when the anchor itself is LONG (it runs past the
  next clip's end: no host, “long things stay”), the members fall back to their own start rule. So a lower third whose bar runs
  long can be split by a Delete: the bar is kept and trimmed, the words go with the clip they start on. A fix: a member of a long
  anchor is long too (stays, cut through the delete map with it). Not changed blind.
