# hunt/stack50 — twenty branches stacked on prep49, for ONE prove pass

Part 1 (below, first): ten §B branches. **Part 2 (at the end): ten pile ports** — gradientwipe, fractalnoise, odometer,
deflicker, laser, titlewarp, spill, ambience, foley, autowah — on top of part 1's tip bb3aaece, the same method.

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
| 13 | 1ecf507a | — | this file | |
| 14 | bca8d770 | — | a comment inside Blinds' compositor block said "batch 48"; now 50 (comment only) | |

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
   `1b80bf41`, `8516f675`). Part 2 adds to this list — see "Part 2: the pile commits to DROP" below.

---

# Part 2 — the ten pile ports (15 Oct 2026, the same day, a ship still running in ~/FreeMotion)

Again **nothing was run**: no node, no python, no browser, not even `node --check`. Only git, grep, sed, awk and reading. Every
branch is built on hunt/fxnew-drums 85b71929 and went in as `git diff 85b71929 <tip>` minus `index.html`, in this order, one
commit each on top of part 1's tip bb3aaece.

## What is in it, in merge order

| # | Commit | Branch range | What | Batch |
|---|---|---|---|---|
| 15 | d0b05701 | 85b71929..0cdeab08 | #966 B39 Gradient Wipe (`gradientwipe`, Keying) | 56 |
| 16 | f57b9739 | 85b71929..4c176645 | #966 B38 Fractal Noise (`fractalnoise`, a pixel kernel) | 57 |
| 17 | 118b5243 | 85b71929..a2c6a017 | #966 B41 Odometer Roll (`odometer`) — TEXT-ONLY: no batch, E1 BETWEEN only | — |
| 18 | ca3775d5 | 85b71929..b8bc0eb8 | #966 B53 Deflicker (`deflicker`, Blur, PIXEL_FX with history) | 58 |
| 19 | a630b5b1 | 85b71929..d9aebca0 | #966 B37 Laser Beam (`laserbeam`); 'energy beam' / 'laser beam' moved off Lightning | 59 |
| 20 | 1046daf5 | 85b71929..4f1defa2 | #966 B40 Title Warp (`titlewarp`) + the warp driver's box (prep's 10th argument) | 60 |
| 21 | 3b6d2889 | 85b71929..d41d042e | #966 B54 Spill Suppressor (`spillsuppressor`, a Keying point op) | 61 |
| 22 | f70a437f | 85b71929..57785853 | #966 B35 Ambience pack (js/sfx.js) + previewGapSfx966 reads what the ▶ plays | (sound) |
| 23 | 7479a5a3 | 85b71929..6561010f | #966 B36 Everyday Foley pack (js/sfx.js) | (sound) |
| 24 | e9f45071 | 85b71929..378640bf | #966 B48 Auto-Wah (`autowah`, js/audio-fx.js) | (audio) |
| 25 | 50d9dc89 | — | the shared newest-first lists' comments rewritten once more | |
| 26 | 425fa911 | — | NEW-row membership tests allow older effects to roll off (18 tests) | |
| 27 | c9362651 | — | two block comments named "batch 48" (Gradient Wipe's → 56, Deflicker's push line → 58); comment only | |
| 28 | (this file) | — | part 2 notes | |

No buster commit in part 2 — see "Busters" below. Every branch's `tools/design/plans/pile-<name>/` (NOTES.md, render-probe.js)
is kept.

## How each went in (as part 1, plus two by-block rebuilds)

- js/compositor.js: HEAD's file + the branch's FX_TABLES block whole before `  FM._FX_TABLES = `; the branch's OTHER hunks
  (gradientwipe's route line, deflicker's dispatcher line and `dfReset()`, titlewarp's three warp-driver hunks, odometer's four)
  applied by context with `git apply` on top. Sorted +/- lines equal to the branch's own diff, every time.
- tests/tests.js: by blocks (the appended block before the final `})();`; gradientwipe's ALLOWED lines before that object's
  `};`; the branch's own small hunks — odometer's E1 BETWEEN, deflicker's 482 KNOWN_THIN and inert-sweep ACROSS_FRAMES —
  applied by context); the ids added to LATER / NEWEST_FIRST / NEWER per commit; 0 wanted lines missing each time.
- js/sfx.js for foley: rebuilt by blocks (HEAD's file + Foley's block after Ambience's + its icon line after Ambience's),
  because `git apply -3` interleaved the two packs into three conflict regions.
- Every other js file: `git apply -3`, small adjacency conflicts kept both sides (ours first) — or resolved by hand where git
  had factored a shared closing line out of the conflict (see the table) — then checked against the branch's own +/- lines:
  the only differences are the deliberate batch-line and union edits below.

## Every conflict and its resolution

| Where | Branches | Resolution |
|---|---|---|
| compositor.js, before `FM._FX_TABLES` | all six visual ones | blocks in merge order; FM.EFFECTS push order now … ST, GW, FN, DF, LB, TW, SS (spillsuppressor last, leading 913.8) |
| compositor.js drawWarpEffect | titlewarp | its 3 hunks applied clean: the driver was 85b71929's verbatim (no stack commit touched it), no stack branch adds a WARP_FX kernel, and Lens Magnifier is `PIXEL_FX.lensmag` (never reaches the driver or prep's box); every existing `prep` takes ≤ 9 params |
| fx-registry.js CATEGORY_OF "batch 48" | six visual | renumbered 56–61 in merge order; only batch 61 (Spill Suppressor) says "The newest, so it leads the NEW row"; `odometer: 'text'` sits after `wordhighlight` (no batch); `filter: 'stylize'` stays last |
| fx-registry.js SEARCH_ALIASES | six visual + odometer | all kept, merge order; laser's move of 'energy beam' / 'laser beam' off Lightning (→ `['bolt']`) merged clean, no test pins Lightning's tags |
| fx-registry.js ADJ_OK after `clarity: 1` | spill | union: bwmixer, splittone, spillsuppressor |
| fx-registry.js TEXT_ONLY | odometer | clean |
| inspector.js NOOP_WHY | laser, titlewarp, spill | union after splittone's, merge order |
| fx-thumbs.js OVERRIDES after shapewipe's kf01 | gradientwipe | blinds' line, then gradientwipe's |
| fx-thumbs.js OVERRIDES after temporaldenoise | deflicker | git factored the shared `    },` out: moshbloom's function + its own `    },` + deflicker's function |
| fx-thumbs.js OVERRIDES after weather | laser | radiowaves, lensmag, circlearray, then laserbeam |
| fx-thumbs.js GHOST_GATED | deflicker | union `{ …, moshbloom: 1, deflicker: 1 }`, both comments |
| fx-thumbs.js SUBJECT_OF / PHOTO_OF | titlewarp ('text'), spill ('keyshot'), fractalnoise, odometer | clean |
| export-resume.js TEMPORAL_FX | deflicker | union `[…, 'timewarp', 'moshbloom', 'deflicker']`, both comments |
| export-resume.js prerollFrames | deflicker | git factored the shared `        }` out: Datamosh Bloom's block + its own `        }` + Deflicker's block |
| fx-browser.js | deflicker | STEADY_FX + its check + one `deadShortLabel` line: clean (deflicker adds no MOTION_FX entry; moshbloom's stays the only one) |
| sfx.js renderBuffer | ambience | prep49 already has batch 9's beds (`renderBuffer(def, opts)`, bedOpts/renderBed, loopFold, LOOP_XFADE, BED_EDGE, PREVIEW_MAX): the stack's function with its bed path first, then ambience's two guarded lines in the no-options path (`def.loop ? AMB_FOLD : 0.05`, `def.loop ? ambFold(…) : buf`). Only an Ambience variant has `def.loop`; Ambience defs have no `bed`. `ambFold`/`AMB_*` kept beside b9's `loopFold`/`LOOP_XFADE`/`BED_EDGE` (same arithmetic; folding them is a follow-up) |
| sfx.js after the Drums block + SFX_CAT_ICON | ambience, foley | by blocks, Ambience first (block and icon line), then Foley; category order … Game, Drums, Ambience, Foley |
| audio-fx.js | autowah | clean (6 hunks), after Vibrato in 'char'; Graphic EQ is in 'eq' |
| tests.js queue 264 ALLOWED | gradientwipe | after blinds': `gradientwipe:progress=min`, `invert=max`, `channel=max` with its comment |
| tests.js previewGapSfx966 (shared, from 85b71929) | ambience (and foley's 'Tick-tock (8 s)') | **a test change**: prep49's ▶ plays only the first PREVIEW_MAX (8) s of a longer buffer, and B35's Length-16 checks are the first to measure one that long, so by reading they were red on every bed. The helper now compares the first PREVIEW_MAX s when the clip is longer — for every sound up to 8 s (all earlier callers) the check is what it was. The ambience NOTES named exactly this |
| index.html busters | all ten | none taken |

No duplicate top-level names (counted per file: tests.js 1401, compositor 634, sfx 108, audio-fx 129, …: none twice; the
B39 helpers `_b39Shrink` / `_b39Mad` duplicate blinds' `_b27*` under their own names; foley's `folNeedSfx966` is its own copy
of `needSfx966`). No `FM.x =` seam assigned twice that prep49 did not already have (inspector's `FM._tickQuantum`, twice on
prep49 too). No duplicate test titles.

## The shared lists, final

- **E1 `LATER`**: part 1's eighteen + **gradientwipe, fractalnoise, deflicker, laserbeam, titlewarp, spillsuppressor**.
- **E1 `BETWEEN`**: `['wordhighlight', 'odometer']` (odometer's own hunk; it is pushed right after Word Highlight, so the first
  205 stay the first 205).
- **745 `NEWEST_FIRST`** and **913.8 `NEWER`**: **spillsuppressor, titlewarp, laserbeam, deflicker, fractalnoise, gradientwipe**,
  then part 1's lists unchanged (splittone, moshbloom, …). = CATEGORY_OF (batches 48–61) read backwards = FM.EFFECTS' push order
  read backwards.
- **913.8 recount**: thirty newer than Snow & Rain (part 1's twenty-four + six) — its "twelve newest, Snow & Rain out" branch.
- **The NEW row, by reading**: spillsuppressor, titlewarp, laserbeam, deflicker, fractalnoise, gradientwipe, splittone,
  moshbloom, circlearray, lensmag, radiowaves, blinds. Off it now: cartoon, bwmixer, clarity, audiospectrum, filmdamage,
  shapewipe (and colorflash, which part 1 had already pushed to 13th).

## The NEW-row test change (425fa911)

Every §B catalogue test asked "it leads the NEW row behind only effects registered after it" and counted `at < 0` as a fault,
which is wrong as soon as twelve newer effects fill the row. **B2 (Colour Flash) was already red by reading on part 1's stack**
(13th; part 1 named only B15 / B7); with part 2, B15, B7, B26, B33 and B31 join it. Fixed the way 913.8 does it for Snow &
Rain: `_newerThan966(id)` = every effect registered after `id` that the row could show (FX_FEATURED's own skips: hidden, text-
or media-only, a filter's id), newest first. Fewer than twelve → the test's own check, its line kept verbatim inside the new
`if`. Twelve or more → `_rolledOffWhy966`: `id` NOT in the row, and the row's first twelve = the twelve newest of them, in
order. Applied to all 18 catalogue tests that make the claim (B2, B15, B7, B26, B33, B31 — off today — and B27, B28, B29, B30,
B17, B49, B39, B38, B53, B37, B40, B54 — in, checked exactly as before). No title changed (B7's still says "newest in the NEW
row"); no other assertion touched; 745 / 913.8 / 747 untouched.

## Busters

Part 2 changed only js/compositor, fx-registry, fx-thumbs, inspector, sfx, audio-fx, fx-browser and export-resume — all eight
already +1 over prep49 from part 1's cd085dd4 (217, 26.33, 57, 423, 22, 21, 99, 8). No other js, no styles.css, no text-renderer
file (odometer is all in compositor.js) — so **no buster commit was needed**. ⚠️ Still: **re-bump all of them +1 over v17.49's
ACTUAL values at landing.**

## Static self-check (part 2; git / grep / awk only)

- Conflict markers in the ten files: **0**. `git diff --check prep49 HEAD`: **clean**. CR bytes: **0** in every changed file and
  in every commit message. No mode changes. `\uXXXX` escapes per file = part 1's + the branches' (none turned into characters).
- Rough balance, whole file, prep49 vs HEAD: **identical in every file** (compositor (−)1 [−]2 on both; tests.js {−}12 (−)183
  [−]2 on both — the stripper's noise; the rest 0/0/0).
- Each branch's 966 titles appear exactly as often as on its own branch: **B39 4, B38 7, B41 7, B53 10, B37 8, B40 7, B54 7, B35
  6, B36 8, B48 8**; part 1's counts unchanged (B22 3, B33 7, B34 7, B31 7, B27 3, B28 9, B29 4, B30 9, B17 13, B49 6; and
  B2 3, B15 3, B7 7, B26 7). Tests: prep49 2836 → part 1 2904 → HEAD 2976 (+72 = the ten blocks).
- None of this is a parse.

## Part 2: the pile commits to DROP at landing (each superseded by a port above)

gradientwipe `3e591a41` · fractalnoise `fcda7fd2` · odometer `93dceac1` · deflicker `0cdc6732` + `5a5c0391`'s dispatcher line ·
laser `44b15c57` + `8efc6234` · titlewarp `01d2f034` · spill `36039096` (do not apply it on top — its row placement renumbers
every effect after it) · ambience `05116900` · foley `ae637420` · autowah `cf34fcb2` (and its afxChoice drop-down `eda6773b`).
Plus part 1's twins: `d7dc22d3`, `410a34d1` + `1b80bf41` + `8516f675` (radiowaves), `21dcd7ee`, `84370498`, `b15ff479`,
`3728d6f5` (Oil Paint, dropped per #1130), `eda6773b` (T06), T02's bwmixer / claritydehaze, T04's Drums / Explosion.

## What is owed after part 2 (adds to the list above)

1. **Parse first**, as above, now also over part 2's edits (the two NEW-row helpers, previewGapSfx966, the hand-resolved
   export-resume / fx-thumbs / sfx regions) and each pile render-probe.js.
2. **SCHEMA_FP / SCHEMA_REV** still prep49's: the six new visual effects' params and Auto-Wah's move it too (sounds do not).
3. **The prove pass** additionally names '966 B39/B38/B41/B53/B37/B40/B54/B35/B36/B48', the 18 NEW-row tests, E1 (BETWEEN),
   745, 913.8, '(queue 264)', '482' KNOWN_THIN and the visible sweeps, the inert sweep (ACROSS_FRAMES), 794, 'export resume:
   the join warms up', 913.5 with `ZOOM=1` (gradientwipe, fractalnoise, deflicker say they need it), the warp tests (titlewarp
   never joins a GPU run), '482 8.1' (now Auto-Wah too), '482 9.3' and the 9.3 bed tests (renderBuffer's no-options path changed
   for loop-ready variants only), and every caller of previewGapSfx966 (B22, B23, B35, B36).
4. **Tolerances still `TODO(first run)`** (8): `B37_PLATE_TOL = 5`, `B38_PLATE_TOL = 8`, `B39_PLATE_TOL = 5`, `B40_PLATE_TOL = 3`,
   `B41_PLATE_TOL = 4`, `B41_BOX_TOL = 16`, `B53_PLATE_TOL = 4`, `B53_FADE_TOL = 15`.
5. **Each branch's own "Unsure / not done" section** (pile-<name>/NOTES.md) and its browser checks at 380; his sheets / listen
   sheets (#545) are all unrun.
6. **Read, not proven**: the previewGapSfx966 change (a test change, flagged), and that the 12 still-in-row catalogue tests stay
   on their old branch (each has fewer than twelve newer effects — Venetian Blinds has exactly eleven).
