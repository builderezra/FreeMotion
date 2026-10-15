# hunt/stack50 — ten §B branches stacked on prep49, for ONE prove pass

Built by hand on 15 Oct 2026 while a release ship was running in ~/FreeMotion, so **nothing was run**: no node, no python,
no browser, not even `node --check`. Only git, grep, sed and awk. Every claim below is from reading and from git.

Base: `prep49` = fe85c783 (the v17.49 PREP: v17.48 + the first §B batch from fxnew-all + Clarity + Boom + #775's menu walk).
The plan (the PM's): no per-branch proofs; one stacked prove at 1280 and 380; bisect only if red. Each commit below is
consistent on its own (its lists name only what is in by then), so a bisect works commit by commit.

## What is in it, in merge order

| # | Commit | Branch range | What | Batch |
|---|---|---|---|---|
| 1 | 9ac00565 | 787491d6..85b71929 | #966 B22 Drums pack + the Ba-dum-tss cymbal fix (js/sfx.js) | (sound) |
| 2 | 40cf363a | fb24f68b..44209cb2 | #966 B33 Black & White Mixer (`bwmixer`), + paramsOf copies a segment's `sets` | 48 |
| 3 | e5736b95 | fb24f68b..d6d36d96 | #966 B34 Graphic EQ (`graphiceq`, js/audio-fx.js) | (audio) |
| 4 | 3953155b | fb24f68b..ff1be42c | #966 B31 Cartoon (`cartoon`) | 49 |
| 5 | c684e44e | fb24f68b..c2c95c83 | #966 B27 Venetian Blinds (`blinds`) | 50 |
| 6 | 8c3dde98 | fb24f68b..e72e16f9 | #966 B28 Radio Waves (`radiowaves`) | 51 |
| 7 | 23ac488a | fb24f68b..60f7237b | #966 B29 Lens Magnifier (`lensmag`) | 52 |
| 8 | bb3323d4 | fb24f68b..158a4ab0 | #966 B30 Circle Array (`circlearray`) | 53 |
| 9 | 38311db1 | fb24f68b..637ddff8 | #966 B17 Datamosh Bloom (`moshbloom`) | 54 |
| 10 | 6644274b | 85b71929..fd6a421f | #966 B49 Split Toning (`splittone`) | 55 |
| 11 | 970e226e | — | the shared newest-first lists' comments rewritten once (ids were added per commit) | |
| 12 | cd085dd4 | — | busters, once | |
| 13 | (this file) | | | |

The drums range holds only the five B22 commits (d2f9bcab, bb4ce4c3, 175e4318, fb24f68b, 85b71929); Boom (B23) is below
787491d6 and was already in prep49, so nothing re-adds it. Every branch's `tools/design/plans/fxnew-<name>/` (NOTES.md,
render-probe.js — his option / listen sheets) is kept.

## How each branch went in

- `git diff A B` minus `index.html`, applied with `git apply -3`.
- **js/compositor.js** — never resolved from conflict markers: git factors the shared closing lines (`  };`, the blank line)
  out of two adjacent blocks, so "ours then theirs" would have dropped a line from one of them. Instead: HEAD's file, and the
  branch's whole block (its one hunk, a pure insertion) put directly before `  FM._FX_TABLES = `. After each, the sorted
  +/- lines of the stack's change were compared with the branch's own diff: identical every time.
- **tests/tests.js** — by blocks, never a union merge: each branch's appended block (its last hunk, ending at the final
  `})();`) put in whole before the final `})();`; queue 264 `ALLOWED` additions put in before that object's `};`; the new id
  added to E1 `LATER` (end), 745 `NEWEST_FIRST` and 913.8 `NEWER` (front) by sed. Any other kind of hunk would have refused:
  there were none. Every added line of each block and ALLOWED hunk was checked present in the commit (0 missing, each time).
- Every other js file: `git apply -3`; the small adjacency conflicts kept both sides (ours first) and were checked against
  the branch's own +/- lines — the only differences are the deliberate batch-line edits below.

## Every conflict and its resolution

| Where | Branches | Resolution |
|---|---|---|
| compositor.js, before `FM._FX_TABLES` | cartoon, blinds, radiowaves, lensmag, circarray, moshbloom (two conflict hunks), splittone | blocks in merge order, as above; FM.EFFECTS push order = bwmixer, cartoon, blinds, radiowaves, lensmag, circlearray, moshbloom, splittone (the last pushed leads 913.8) |
| fx-registry.js CATEGORY_OF "batch 48" | all eight visual effects | renumbered 48–55 in merge order (table above); only batch 55 (Split Toning) says "The newest, so it leads the NEW row"; `filter: 'stylize'` stays last |
| fx-registry.js SEARCH_ALIASES | all eight | all kept, merge order |
| fx-registry.js ADJ_OK | bwmix, splittone | both (`bwmixer: 1`, then splittone's comment + `splittone: 1`) |
| fx-registry.js paramsOf | bwmix (`sets` on a segment row), splittone (color2Gate `deadAt`) | different lines, 3-way merged clean; both present (checked) |
| inspector.js NOOP_WHY | bwmix, radiowaves, lensmag, circarray, splittone | union, merge order |
| fx-thumbs.js OVERRIDES after `weather` | radiowaves, lensmag, circarray | all three, merge order |
| fx-thumbs.js PHOTO_OF clouds / dog, OVERRIDES after `temporaldenoise`, GHOST_GATED | bwmix, cartoon, splittone, moshbloom | clean |
| fx-browser.js MOTION_FX, export-resume.js TEMPORAL_FX | moshbloom | clean (only branch touching them) |
| sfx.js (drums) / audio-fx.js (geq) | drums, geq | clean onto prep49's newer files (beds, squelch, damped reverb) |
| tests.js queue 264 ALLOWED | bwmix, blinds | both (`bwmixer:reds=min`, `bwmixer:yellows=min`, then `blinds:progress=min`, each with its comment) |
| tests.js E1 LATER / 745 NEWEST_FIRST / 913.8 NEWER | all eight visual | one id per commit, then 970e226e rewrote the comments once (see below) |
| index.html busters | all ten | none taken; one bump in cd085dd4 |

No other list was touched by any branch: the inert sweep (prep49's three frames — subject, hues, haze — kept as they are; no
branch edited it), 482 KNOWN_THIN, E1 BETWEEN, 794's ghost-gated names. No duplicate top-level names: every
`const` / `let` / `function` the stack added at the top level of tests.js and the js files was counted across its whole file
(78 in tests.js, 50 in compositor.js, …): none defined twice. No `FM.x =` seam is assigned twice. Each branch's 966 titles
appear exactly as often as on its own branch (B22 3, B33 7, B34 7, B31 7, B27 3, B28 9, B29 4, B30 9, B17 13, B49 6).

## The shared lists, final

- **E1 `LATER`**: timeecho, starglow, colorwheels, tonecurve, hslmixer, colorflash, shapewipe, filmdamage, audiospectrum,
  clarity, **bwmixer, cartoon, blinds, radiowaves, lensmag, circlearray, moshbloom, splittone**.
- **745 `NEWEST_FIRST`** and **913.8 `NEWER`**: **splittone, moshbloom, circlearray, lensmag, radiowaves, blinds, cartoon,
  bwmixer**, then prep49's lists unchanged (clarity, audiospectrum, …). = CATEGORY_OF read backwards.
- **913.8 recount**: twenty-four newer than Snow & Rain (prep49's sixteen + eight) — its "twelve newest, Snow & Rain out" branch.
- ⚠️ **The NEW row is now exactly full**: splittone, moshbloom, circlearray, lensmag, radiowaves, blinds, cartoon, bwmixer,
  clarity, audiospectrum, filmdamage, shapewipe. '966 B15' (Shape Wipe, 12th) and '966 B7' (Film Damage, 11th) fail when
  their effect is not in the row at all (`swAt < 0`, `fdAt < 0`). Read, not run: they hold here, but ONE more visual effect
  landing before v17.49 turns B15 red. Not changed — what B15 should own then is a judgement for whoever lands the next one.

## Busters (cd085dd4)

prep49 → stack: compositor 216 → 217, fx-registry 26.32 → 26.33, fx-thumbs 56 → 57, inspector 422 → 423, fx-browser 98 → 99,
audio-fx 20 → 21, export-resume 7 → 8, sfx 21 → 22. styles.css untouched. ⚠️ **At landing re-bump every one +1 over
v17.49's ACTUAL values** — v17.49 is shipping from another tree and may bump the same files.

## Static self-check (no programs; git / grep / awk only)

- Conflict markers (`<<<<<<<`, `=======` at line start, `>>>>>>>`, `|||||||`) in compositor, fx-registry, fx-thumbs, inspector,
  sfx, audio-fx, fx-browser, export-resume, tests.js, index.html: **0** in every file.
- `git diff --check prep49 HEAD`: **clean**. CR bytes: **0** in every changed file and in every commit message. No mode changes.
- Rough balance (an awk pass that strips block comments, strings and line comments, then counts `{}` `()` `[]`), whole file,
  prep49 vs HEAD: **identical in every file** — net 0/0/0 for fx-registry, fx-thumbs, inspector, sfx, audio-fx, fx-browser,
  export-resume; compositor (−)1 [−]2 on both; tests.js {−}12 (−)183 [−]2 on both (the stripper's own noise from regex and
  template literals, the same on both trees, so the stack adds no imbalance). On the added lines alone a few ±1/±2 show where a
  block-comment continuation line sits outside its opener in the diff stream (fx-registry's color2Gate comment, fx-thumbs'
  `'hslmixer'],` line edited on both sides); the whole-file numbers are the ones that count.
- None of this is a parse. The first program to run on this tree should be `node --check` on the eight js files and the
  tests.js parse check.

## What is owed (in order)

1. **Parse first**: `node --check` js/{compositor,fx-registry,fx-thumbs,inspector,sfx,audio-fx,fx-browser,export-resume}.js,
   the tests.js parse check, and each render-probe.js as an async body.
2. **The collab fingerprint**: `C.SCHEMA_FP` / `SCHEMA_REV` in js/collab-core.js are left at prep49's values. The eight new
   effects' params and Graphic EQ's ten bands move it — re-measure with fp.js on this tree and pin it, or the tests that pin it
   are red.
3. **The one prove pass, at 1280 and at 380**, with each branch's named neighbours: '966 B22/B33/B34/B31/B27/B28/B29/B30/B17/B49',
   E1, 745, 913.8 (and 913.5), 747, 784, 793, '(queue 264)', 'inert', '482 8.1' (walks every audio effect, so it now checks
   Graphic EQ's Output / Mix), '482 9.3' (every sound with no options renders as today — six more drum sounds), the 482 visible
   sweeps, '692:', zero-means-zero, the sanitiser sweep, '691b', '794', '#484:', '733:', the featured-carousel gate, and the
   older §B tests that ask "behind only effects registered after it" ('966 B26 / B7 / B2 / B15').
   - The inert sweep now has a THIRD (hazy) frame; the branches reasoned their sliders against two frames (subject, hues). Read,
     not run: nothing in them depends on the haze frame, but bwmixer / cartoon / blinds / lensmag / splittone are swept on it.
4. **The plate tolerances, still guesses marked `TODO(first run)`**: `B31_PLATE_TOL = 2`, `B27_PLATE_TOL = 5`,
   `B28_PLATE_TOL = 5`, `B29_SAMPLE_TOL = 1`, `B29_PLATE_TOL = 4`, `B30_PLATE_TOL = 5`, `B17_PLATE_TOL = 5`. Set each from the
   numbers its test prints (prove.sh stage 3b forces them to −1), above the largest measured difference and well under the
   controls, and write both numbers beside it.
5. **The browser checks each branch's NOTES lists**: the Chrome slices `?only=966%20B<n>` at 900 and 380; bwmix's panel at
   380 (ten rows, seven filter buttons wrapping to two lines); splittone's panel at 380 (seven rows, both colour rows greying at
   Amount 0); radiowaves' Draw segment (four long labels wrap on a phone); geq's twelve rows at 390 and 1280; moshbloom's
   `FM._fxDeadHereWhy` check, which only means something in Chrome.
6. **His sheets** (#545): every branch's render-probe.js / listen sheet is unrun; every look and sound waits on his pick.
7. **At landing**: re-bump the busters over v17.49's real values; POLISH-LOG / version label / REQUESTS stamp as ship.sh asks;
   and drop the pile's superseded commits named in the branch NOTES (geq: T06 `eda6773b`; radiowaves: `410a34d1`,
   `1b80bf41`, `8516f675`).
