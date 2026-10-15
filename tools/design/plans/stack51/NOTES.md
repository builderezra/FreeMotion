# hunt/stack51 — nine pile ports stacked on the v17.50 tree, for ONE prove pass

Built by hand on 15 Oct 2026 while a release ship was running in ~/FreeMotion, so **nothing was run**: no node, no python,
no browser, not even `node --check`. Only git, grep, sed and awk, in the helper clone (worktree `~/fm-helper-wt/stack51`).
Every claim below is from reading and from git.

Base: `hunt/v50-tree` = 4af4e420 (the v17.50 tree exactly as it is shipping: v17.49 + the 20-branch stack50 + its first-run
fixes; SCHEMA_REV 12; busters already +1 over v17.49). Every branch is built on hunt/fxnew-drums 85b71929 and went in as
`git diff 85b71929 <tip>` minus `index.html`, one commit each, by the stack50 method (tools/design/plans/stack50/NOTES.md on
hunt/stack50). Each branch's `tools/design/plans/pile-<name>/NOTES.md` is kept (none of the nine had other plan files).

## What is in it, in merge order

| # | Commit | Branch range | What |
|---|---|---|---|
| 1 | ecfdb5ff | 85b71929..6f13f89c | #966 B42 Noise Gate (`noisegate`, Dynamics, after the Limiter); mixOutput's dryLag takes (ctx, inst) |
| 2 | dcb77633 | 85b71929..2c7c795d | #966 B43 Loudness Match (`loudnessmatch`, after Gain); the exporter awaits the measurement; the inspector's 'measured' line |
| 3 | f306f54d | 85b71929..6eeff0e1 | #966 B44 Hum Remover (`humremove`, EQ, after the Notch filter) |
| 4 | 46bb317c | 85b71929..0db74769 | #966 B45 De-esser (`deesser`, right after the Compressor) |
| 5 | a6d6b7b6 | 85b71929..8b2a6c27 | #966 B46 Channel Utility (`channelutility`, Space, right after Stereo Width) |
| 6 | d81153a9 | 85b71929..4c66c88a | #966 B47 Stereoizer (`stereoizer`, after the Channel Utility) |
| 7 | 9699d9d8 | 85b71929..bf466dd1 | #966 B24 Reduce Noise (new js/noise-reduction.js; audio-tools.js karaoke twins skip `twinKind 'denoise'`; the Volume card) |
| 8 | 000be345 | 85b71929..2de09f57 | #966 B51 Auto Grade (`autograde`, Colouring, a PIXEL_FX kernel with a smoothing history) — **batch 62** |
| 9 | 199f275a | 85b71929..2dbe5aa9 | #966 B25 Auto-duck (new js/auto-duck.js; the Volume card beside Reduce Noise) |
| 10 | 23db3c47 | — | busters, once, and the two new script tags |
| 11 | (this file) | — | notes |

Each commit's body lists its own conflicts. Orders now: Dynamics = gain, loudnessmatch, compressor, deesser, limiter, noisegate,
tremolo (… trancegate); Space = reverb, delay, pingpong, width, channelutility, stereoizer, pan, autopan; EQ = bassTreble, eq3,
graphiceq, the filters (… notch), humremove, telephone. TAGS follow the same order.

## How each went in

- Every js file except compositor.js: `git apply -3`; conflicts resolved by hand (below), then the sorted +/- lines of the stack's
  change compared with the branch's own diff (`verify.sh`): identical every time except the deliberate edits named below.
- js/compositor.js (Auto Grade only): HEAD's file + the branch's FX_TABLES block (255 lines, a pure insertion) directly before
  `  FM._FX_TABLES = `; its other hunks by context or by hand (below). Never resolved from markers.
- tests/tests.js: by blocks, never a union merge. Each branch's appended block (its last hunk) whole before the final `})();`
  (0 wanted lines missing, each time); Auto Grade's KNOWN_NOOP and inert-sweep hunks by context; its id added to E1 `LATER`
  (end), 745 `NEWEST_FIRST` and 913.8 `NEWER` (front) by sed, and their comments rewritten by hand in the same commit.

## Every conflict and its resolution

| Where | Branches | Resolution |
|---|---|---|
| audio-fx.js mixOutput, the dryLag line | noisegate vs v17.50 | v17.50 added `dryLagWhile` (the audio-reds hunt) right under the line the Noise Gate rewrites. Kept the branch's `const lagS = d.dryLag ? d.dryLag(ctx, inst) : 0; if (lagS > 0) …` (with its comment) in place of the old call, then v17.50's dryLagWhile block unchanged |
| every caller of dryLag | — | checked: mixOutput is the only caller; the defs declaring it are the Limiter (`lookaheadSecs(ctx)`, ignores inst, always > 0: byte-identical behaviour) and the Noise Gate (`ngLagSecs(ctx, inst)`, 0 when Lookahead is Off: no lag node). Graphic EQ and Auto-Wah (v17.50) declare none — their comments say so; no other def in the nine declares one |
| audio-fx.js d.build wrapper / the chain builder | loudness | clean: `d.build = function (ctx, inst, layer)` and `def.build(ctx, inst, layer)` — the builder is the only call site of def.build in js/ |
| audio-fx.js DEFS after Stereo Width | chanutil, stereoizer | git factored the two defs' shared lines (`    ],`, the build's first four lines, `        } });`, `    },`, `  }, {`) out of the conflict, so "ours then theirs" would have glued them into one def. Rebuilt by blocks: the Channel Utility's def whole, then the Stereoizer's whole. Order width, channelutility, stereoizer, pan (both NOTES) |
| audio-fx.js TAGS after width: | chanutil, stereoizer | both, ours first, each with its `// #966 B4x` line |
| inspector.js volumePanel, after Remove vocals | reducenoise, autoduck | git factored the shared closing `    }` of `if (NR) {` / `if (AD) {` out of the conflict ("ours then theirs" would have nested Auto-duck inside Reduce Noise's `if`). By hand: each block with its own `    }` |
| inspector.js tools.append | reducenoise, autoduck | `tools.append(wavBtn, karBtn, ...nrParts, ...adParts, afxBtn, arBtn);` as both NOTES ask. Both tests find their button by its text |
| styles.css after .vol-tool-btn.on | reducenoise, autoduck | both, ours first: .vol-noise*, then .vol-duck* |
| compositor.js drawPixelEffect's `, fx` line | autograde | ALREADY in v17.50 via Deflicker (byte-identical; both are 5a5c0391's one line) — not added twice; its comment gains one line naming Auto Grade |
| compositor.js FM.resetMotionFlowCache | autograde vs deflicker | `… delete _mflow[k]; dfReset(); agReset(); };`, both comment lines above it |
| compositor.js applyPixelFx | autograde | its PIXEL_FX line now passes fx as the 10th argument (by context). No double-up with Deflicker: applyPixelFx runs only an adjustment layer's PIXEL_ADJ effects (`ppfx`), and DF_ROWS is not in PIXEL_ADJ (nor ADJ_OK), so Deflicker never takes that path; on a clip every kernel gets fx once, from drawPixelEffect. Only deflicker and autograde read the 10th argument |
| compositor.js FM.adjNeedsFrame | autograde | by context, after Clarity's branch |
| compositor.js before FM._FX_TABLES | autograde | its block after Spill Suppressor's: AG_ROWS is pushed LAST and leads 913.8; the block's own "CATEGORY_OF batch 48" comment → 62 |
| fx-registry.js CATEGORY_OF | autograde | v17.50's last batch was **61** (Spill Suppressor). Auto Grade is **batch 62** and says "The newest, so it leads the NEW row"; Spill Suppressor's line loses those words; `filter: 'stylize'` stays last |
| fx-registry.js ADJ_OK / SEARCH_ALIASES | autograde | unions, autograde last (after spillsuppressor) |
| inspector.js NOOP_WHY | autograde | union, autograde after spillsuppressor |
| export-resume.js TEMPORAL_FX | autograde | union `[…, 'timewarp', 'moshbloom', 'deflicker', 'autograde']`, all three comments |
| export-resume.js prerollFrames | autograde | git factored the shared `        }` out: Datamosh Bloom's block, Deflicker's block + its own `        }`, Auto Grade's block |
| fx-thumbs.js OVERRIDES (end, after radialshadow) | autograde | clean |
| tests.js KNOWN_NOOP / the inert sweep | autograde | by context (Deflicker's ACROSS_FRAMES is a different line) |
| index.html | all nine | none taken; one bump + both tags in 23db3c47 |

Everything else applied clean: loudness's exporter.js / inspector.js, hum, deesser, chanutil, reducenoise's audio-tools.js /
inspector.js / styles.css, autoduck's auto-duck.js.

## The shared-helper dedupe

`NG_ABS` (Noise Gate), `DE_ABS` (De-esser) and Auto-Wah's `WAH_RECTIFY` are the same 2049-point |x| curve; `NG_UNIT` and Auto-Wah's
`WAH_CLAMP` the same "held to 0…1" curve. **Kept Auto-Wah's** (already shipping in v17.50, defined near the top of audio-fx.js,
so in scope everywhere). Removed `NG_ABS`, `NG_UNIT` and `DE_ABS`; renamed their uses: Noise Gate `s.shaper(WAH_RECTIFY)` x3 and
`s.shaper(WAH_CLAMP)` x2, De-esser `s.shaper(WAH_RECTIFY)` x3. A one-line comment stands where each removed const was, and the
comment over WAH_RECTIFY / WAH_CLAMP names all three users. No test names any of them. Not folded: the louder-of-two-channels
detector (splitter, three |x|, x0.5) is still written out in both the Noise Gate and the De-esser — a follow-up, not a merge fix.

## The shared lists, final

- **E1 `LATER`**: stack50's twenty-four + **autograde** (the newest last). BETWEEN unchanged.
- **745 `NEWEST_FIRST`** and **913.8 `NEWER`**: **autograde** at the front, then stack50's lists unchanged. 913.8: thirty-one
  newer than Snow & Rain — its "twelve newest, Snow & Rain out" branch.
- **The NEW row, by reading**: autograde, spillsuppressor, titlewarp, laserbeam, deflicker, fractalnoise, gradientwipe, splittone,
  moshbloom, circlearray, lensmag, radiowaves. **Venetian Blinds rolls off** (it now has exactly twelve newer), so B27's NEW-row
  check takes its `_rolledOffWhy966` branch — v17.50's roll-off-aware tests read the registry, so nothing else changed.
- **KNOWN_NOOP** ('no Colouring effect is a silent no-op', the first of the two): + autograde. The inert sweep skips Auto Grade's
  Smoothing only.

## Busters (23db3c47)

+1 over the v50-tree values, once: styles.css 768 → **769**, compositor 217 → **218**, fx-registry 26.33 → **26.34**, fx-thumbs 57 →
**58**, inspector 423 → **424**, audio-fx 21 → **22**, export-resume 8 → **9**, exporter 129 → **130**, audio-tools 8 → **9**. New tags
right after audio-tools.js, in merge order, each line verbatim from its branch: `js/noise-reduction.js?v=1`, `js/auto-duck.js?v=1`.
collab-core.js untouched. ⚠️ If v17.50 ships with different values than the v50-tree has, re-bump +1 over what actually shipped.
⚠️ **Bisect**: the two new files are loaded only from 23db3c47 on, so the B24 / B25 tests can only be judged from there.

## Static self-check (no programs; git / grep / awk only)

- Conflict markers in every changed js file, tests.js, styles.css and index.html: **0**. `git diff --check hunt/v50-tree HEAD`:
  **clean**. CR bytes: **0** in every changed file and in every commit message. No mode changes.
- `\uXXXX` escapes per file: HEAD = v50 + the branches' own net change in every file (compositor 22, inspector 16, fx-registry 7,
  exporter 2, tests.js 72; none in the rest): none turned into characters.
- Rough balance (stack50's awk stripper), whole file, v50 vs HEAD: **identical in every file** — 0/0/0 for audio-fx, auto-duck,
  export-resume, exporter, fx-registry, fx-thumbs, inspector; compositor (−)1 [−]2 on both; audio-tools 1/1/1 on both; tests.js
  {−}12 (−)183 [−]2 on both (the stripper's noise). noise-reduction.js reads 1/1/1, but it is byte-identical to the branch's file.
- Whole-stack multiset, per file (the nine branches' own +/- lines vs v50..HEAD): audio-tools, exporter, fx-thumbs, styles.css,
  auto-duck.js, noise-reduction.js identical; the rest differ by exactly the edits named above (the helper dedupe, the dryLag
  line, the tools.append line, the batch / union / list lines and their comments).
- Each branch's titles appear exactly as often as on its branch: **B42 8, B43 10, B44 8, B45 9, B46 10, B47 9, B24 12, B51 13,
  B25 10**; every other '966 Bnn' count unchanged from v50. Tests: v50 2976 → HEAD **3065** (+89 = the nine blocks).
- No top-level name defined twice in any changed file (tests.js 1497 names, compositor 648, audio-fx 174, inspector 236, …). No
  `FM.x =` seam assigned twice that v50 did not already have (inspector's `FM._tickQuantum`, twice on v50 too). The only
  "duplicate" test title is a grep artefact on v50 too ('974 the clapper\'s …', two different titles).
- None of this is a parse.

## What is owed (in order)

1. **Parse first**: `node --check` js/{audio-fx,audio-tools,auto-duck,noise-reduction,compositor,export-resume,exporter,
   fx-registry,fx-thumbs,inspector}.js and the tests.js parse check — especially over the hand-built regions: mixOutput, the
   Channel Utility / Stereoizer defs, the volumePanel blocks, prerollFrames, the WAH_* renames.
2. **The collab fingerprint**: `C.SCHEMA_FP` / `SCHEMA_REV` in js/collab-core.js are v17.50's (REV 12). Six new audio types and
   Auto Grade move it: re-measure with fp.js on this tree, pin it, **SCHEMA_REV → 13**. Until then '921 S1 the schema
   fingerprint gate' is red.
3. **The one prove pass, at 1280 and at 380** — the first Chrome run of every new test: '966 B42 / B43 / B44 / B45 / B46 / B47 /
   B24 / B51 / B25', each branch's TODO bounds, and the neighbours: '482 8.1' (walks every audio effect: six more get Output /
   Mix from mixOutput), every Limiter test (the dryLag line changed shape beside dryLagWhile), '966 B48' Auto-Wah (WAH_RECTIFY /
   WAH_CLAMP now shared), '966 B34' Graphic EQ, the audio search tests ('gate' finds both Trance Gate and the Noise Gate — the
   branch was written knowing Trance Gate), the exporter / export tests (Loudness Match is awaited before a clip's chain is
   built), the Remove vocals tests (karaoke twins skip `'denoise'`), E1, 745, 913.8 (and 913.5), 784, 793, 794, zero-means-zero,
   the sanitiser sweep, the inert sweep (now on THREE frames — subject, hues, haze — where the B51 branch reasoned against two),
   'no Colouring effect is a silent no-op', the 482 visible sweeps, 'export resume: the join warms up', every '966 B53' Deflicker
   test (shared dispatcher, reset and TEMPORAL_FX), and the 18 NEW-row tests (B27 Venetian Blinds now on its roll-off branch).
4. **Tolerances still guesses**: `B51_PLATE_TOL = 3`, `B51_STAT_TOL = 1` (`TODO(first run)`; prove.sh 3b prints them). The audio
   branches' bounds are all reasoned, not measured (each NOTES says which is softest — e.g. Reduce Noise's partial-opening cost):
   if one misses, measure and set it from the measurement, writing both numbers in.
5. **The browser checks each NOTES lists**: the Volume card at 380 with BOTH new boxes (Reduce noise and Auto-duck — neither was
   ever seen at 380, and now they sit together), the Noise Gate / De-esser / Channel Utility / Stereoizer panels at 380,
   Auto Grade's tile and `?only=966%20B51` at 900 and 380.
6. **Read, not run**: Auto Grade's aliases ('colour correction', 'auto grade', …) beside Split Toning's ('grade', 'colour grade')
   — any search-order test for either is a first-run check.
7. **His listen / look sheets (#545)**: every sound and the Auto Grade look wait on his ear and eye.
8. **At landing**: re-bump the busters over what v17.50 actually shipped; POLISH-LOG / version label / REQUESTS stamp as ship.sh
   asks; and **drop the pile commits these ports supersede**: noisegate `c63db8ef`, loudness `288c20fc`, hum `2e1e8ed1`, deesser
   `081ee145`, chanutil `e74415e2`, stereoizer `01297a19` (and its '690 Stereoizer' test / report), reducenoise `d59b8cfd`,
   autograde `5a5c0391` (its dispatcher line is already in via Deflicker), autoduck `3b65fae1`.
